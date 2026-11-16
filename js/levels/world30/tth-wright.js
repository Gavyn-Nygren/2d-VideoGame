/* Pip & Bo - Level 30-1 The Time Thief: era 'wright' (The First Flight, 1903). */
'use strict';

/* ===== 30-1 era 7: The First Flight, 1903 (TTH_PHASES.wright) — Gavyn's pick =====
   "Wright brothers' first flight, 1903 (scrolling): keep the wobbly first plane in the air. One holds the wings
   level, the other pedals the engine." Kitty Hawk, North Carolina, 17 December 1903: the Time Thief has stolen the
   Flyer's spare propeller. Pip and Bo both ride the Flyer (the era draws them itself: hide() is true) a few metres
   over the dunes, scrolling right. This era is about BALANCE and POWER (the Leonardo era before it is about rhythm
   and gaps). Like the real day there are FOUR FLIGHTS, each longer and windier, and the two take turns like Orville
   and Wilbur did: the jobs swap after every flight (room field `first` is the first balancer).

   THE TWO JOBS
   - WINGS (the balancer, action word "bell"): the Flyer is wobbly. Gusts and its own wobble tip it (the whole plane
     tilts, and the Wings gauge shows it). Hold LEFT / RIGHT to lean and bring it level: lean toward the HIGH side.
     Tilted wings lose lift (the plane sinks) and speed. Past the red mark for TTHWRIGHT.tilt.overT s the low wing
     dips into the sand: "Scrape!" (a team bump) and the wind blows the Flyer back to the last flag.
     The action rings the bicycle bell: a flock of seagulls 100-430 px ahead scatters ("Shoo!"). The bell then rests.
   - ENGINE (the engineer, action word "pedal"): tap the action in a steady beat to pedal the engine (the brothers
     were bicycle makers, and bicycle chains drove the propellers). A ring shrinks onto the crank after every tap:
     tap again when it is home (0.4-1.05 s after the last tap; about 1.5 taps a second). Every tap inside the first
     0.28 s is too fast: the engine coughs, and three of those in a row flood it for 1.2 s ("Flooded!"). Engine power
     runs down by itself: under 60 % the plane slows and sinks, and a weak engine (under eng.soft) sets it down softly
     on the sand, where it waits ("Engine out!", no bump) until it is pedalled up again.
     UP climbs and DOWN dives (up is the jump button: tthUp). Climbing heats the engine: at 100 % it steams for
     2.6 s ("Too hot!"), cannot climb and sinks a little. So fly just high enough.
   - Both: hold RIGHT together to run the Flyer down the wooden launch rail (it only speeds up while BOTH hold).

   WHAT COMES AT THEM (everything is telegraphed at least 0.9 s)
   - Gusts (from flight 1): the Thief turns his jet on the Flyer. A big arrow shows which wing end will be pushed
     down (0.95 s), then it blows for 1.35 s. "Double gusts" (from flight 3) blow one way, then the other.
   - Tall dunes (from flight 2): climb over them. Flying into a dune (or being pushed onto the sand faster than
     eng.hard px/s) is a "Bump!" and a bounce; a plain dive onto flat sand only skims it (a little bounce, slower).
   - Seagulls (from flight 2): the Thief scares up a flock, a "!" sign shows where 0.9 s before it flies in. High
     flocks fill the upper air (dive under), low flocks skim the dunes (climb over), or the balancer rings the bell.
     A hit is a "Squawk!": the plane dips and slows; the gulls just scatter.
   - Sandbags (from flight 3): he dangles one for 0.7 s, then drops it on a little parachute, aimed at the height
     the Flyer has right then: climb or dive out of its way. A hit is a "Bonk!" that tips the plane hard.
   - Downdrafts (from flight 3): he jets down from above (arrows over the plane): climb against it.
   - Up high (above the cruise height) the air is rougher: more wobble. Down low the sand is close.
   - A photographer waits on the dunes in every flight (John T. Daniels took the famous photo of flight 1): passing
     him with level wings is a "Snap! Perfect photo!" (a bonus, counted in the stats).

   THE FOUR FLIGHTS (TTHWRIGHT.flights). Each starts on the launch rail; the flight is measured in metres (the real
   distances of that day: 37, 53, 61 and 260 m; the screen metres are stretched to fit the flight's length).
     1  37 m, about 12 s: gentle gusts, the photographer.          2  53 m, about 20 s: + tall dunes and seagulls.
     3  61 m, about 29 s: + sandbags, double gusts, downdrafts.    4  260 m, about 40 s, faster: everything, then THE
     CATCH: the Thief's jet runs out of puff and he hangs low over the dunes. Fly right under his claw with level
     wings: a ring around the propeller fills (TTHWRIGHT.catch.fill s in all, it drains slowly when they drift off),
     then the engineer's next action press grabs it ("Got it!"). The Flyer lands, he sulks, tthPhaseDone.
   Flags stand every 6-7 s of flying: a wing scrape blows the plane back to the last one (a few seconds lost, never
   the flight). After each landing: "Swap jobs!" and a breather on the rail.

   NEVER ALONE. Take-off needs both holding right. With no pedalling the plane sets down and stays. With nobody at
   the wings the tilt runs away (after tilt.lazyT s without a lean the wobble grows quickly), so the plane scrapes
   before it reaches the next flag. The catch needs level wings, the right height and the grab. While nobody plays
   (st.idle) nothing is started and the wings level themselves.

   GOLD HELP (announced with tthHelp, kept for the rest of the era):
   - 2 wing scrapes since the last flag (or 3 in the whole era): "steadier wings" (gentler gusts and wobble, a
     longer red-zone time); 4 (or 5 in the era): more.
   - 2 sand bumps / engine-outs in a flight (or 3 in the era), or 2 floodings: "gold pedals" (power lasts longer,
     too-fast taps are just ignored, climbing is 30 % faster and heats less).
   - 2 seagull / sandbag hits in a flight (or 3 in the era): gold arrows show the safe way past, the hit zones shrink
     and the bell reaches further.
   - TTHWRIGHT.catch.goldT s into the catch: the Thief holds still and the grab zone grows.
   Fairness: 1.6 s of grace after every pop-back and take-off (no gusts, no hits); bumps have the core's safe time;
   after a pop-back the hazards behind the flag come again in the same places.

   Stats (st.stats.wright): flights, flightT [s], photos, scrapes, sand, gulls, bags, shooed, pumps, bestBeat.
   Every top-level name starts with tthWright / TTHWRIGHT (Sfx.extra.tthWright*). State lives in st.ph. */
const TTHWRIGHT = {
  px: 300,                      // the Flyer's place on screen (x of its middle)
  ground: 456, ceil: 172, cruise: 300, belly: 36,   // flat sand y; the highest and the usual height; middle to skids
  // m: the real distance; v: px/s at full power; secs: the flight's length at full speed; wob: wobble; gk: gust push
  // (tilt per s); gapB / gapE: s between gusts / between the engineer's hazards; patB: t gust, w double gust;
  // patE: D tall dune, h high gulls, l low gulls, b sandbag, d downdraft; flags: checkpoint flags; photo: where (0-1)
  flights: [
    { m: 37,  v: 190, secs: 11.5, wob: 0.55, gk: 0.6,  gapB: 3.2, patB: 't',    gapE: 0,   patE: '',           flags: 1, photo: 0.84 },
    { m: 53,  v: 205, secs: 20,   wob: 0.8,  gk: 0.68, gapB: 3.8, patB: 't',    gapE: 4.4, patE: 'DhDh',       flags: 2, photo: 0.62 },
    { m: 61,  v: 220, secs: 29,   wob: 1,    gk: 0.76, gapB: 3.4, patB: 'ttwt', gapE: 3.7, patE: 'bDldhDb',    flags: 4, photo: 0.52 },
    { m: 260, v: 250, secs: 40,   wob: 1.1,  gk: 0.82, gapB: 3.1, patB: 'twtt', gapE: 3.3, patE: 'hDblDdhbDl', flags: 6, photo: 0.4 },
  ],
  rail: { len: 360, acc: 105, drag: 190, h: 7, vMax: 300 },      // the launch rail: px, px/s2 while BOTH hold right, px/s2 otherwise
  climbT: 1.25, hopT: 0.8, landD: 300, restT: 1.5, swapT: 0.7, graceT: 1.6, slowT: 1.5, slipT: 0.5, backT: 1, grabT: 0.8, wonT: 1,
  seat: { bal: -40, eng: 46, y: 18, s: 1.15 },
  // tilt runs -1..1 (+ = the front end down). ctl: the balancer's lean per s; drift: how fast a tilt grows by itself;
  // noise: the wobble; lazyT / lazyK: after lazyT s without a lean the tilt runs away at lazyK per s (never eased by
  // gold help: this is what stops a flight with nobody at the wings); warn / over: the yellow and the red mark;
  // overT / gustK / driftK: per gold-help level (0, 1, 2); sink / drag: what a tilt past sinkFrom costs; level: "level"
  tilt: { ctl: 0.95, drift: 0.45, noise: 0.17, highK: 0.45, lazyT: 3, lazyK: 0.9, warn: 0.6, over: 0.82, overT: [0.85, 1.1, 1.4],
    gustK: [1, 0.7, 0.5], driftK: [1, 0.6, 0.35], sink: 110, sinkFrom: 0.35, drag: 0.3, rad: 0.42, level: 0.3 },
  gust: { tel: 0.95, dur: 1.35, tel2: 0.6, dur2: 0.95, down: 78 },
  // the engine: power 0..1 runs down by `decay` per s; a tap on the beat adds `pump`, off the beat `weak`; a tap
  // inside `early` s coughs; good0..good1: the beat window (s after the last tap); under flyMin the plane slows and
  // sinks (fade px/s), under `dead` it sets down. climb / dive px/s; sink: the heavy Flyer's own slow sink (px/s);
  // hard: a touch-down faster than this (px/s) is a counted "Bump!", slower just skims the sand
  eng: { decay: 0.3, pump: 0.3, weak: 0.18, early: 0.28, good0: 0.4, good1: 1.05, flyMin: 0.6, dead: 0.3, cough: 0.06, floodN: 3, floodT: 1.2,
    climb: 85, dive: 105, acc: 320, fade: 95, sink: 12, goldDecay: 0.55, hard: 115, skim: 70, soft: 0.56 },
  heat: { up: 0.3, cool: 0.14, down: 0.3, hotT: 2.6, after: 0.45, sink: 40, goldK: 0.65 },
  hit: { bounce: 150, dip: 130, bagTilt: 0.5 },
  bell: { r0: 100, r1: 430, cool: 3, miss: 2 },
  // seagulls: a high flock fills y hi0..hi1 (dive under it), a low flock the loH px over the sand (climb over it)
  gulls: { v: 40, w: 150, hi0: 120, hi1: 306, loGap: 14, loH: 135, warn: 0.9, slack: 8 },
  bag: { hang: 0.7, vy0: 30, vy1: 150 },
  // the catch: he hangs at px + dx, his machine's bottom at y0 +- amp; the Flyer belongs dy under it (+- win), level
  catch: { dx: 59, dy: 104, y0: 258, amp: 22, w: 0.8, win: 26, fill: 2.2, drain: 0.2, goldT: 14, goldWin: 40, goldLevel: 0.45, gustT: 3.4, gustK: 0.7 },
  // gold help: wing / wing2 scrapes since the last flag (or wingAll / wingAll2 in the whole era); sand bumps and
  // engine-outs in a flight (or sandAll in the era); floodings; gull / bag hits in a flight (or hitsAll in the era)
  gold: { wing: 2, wing2: 4, wingAll: 3, wingAll2: 5, sand: 2, sandAll: 3, flood: 2, hits: 2, hitsAll: 3, climbK: 1.3 },
};
const TTHWRIGHT_C = { skyTop: '#62b2e8', skyLow: '#d8eef4', sea: '#4c9cc6', seaLt: '#9fd6ea', far: '#efe3bd', mid: '#ecd7a0', sand: '#f4e1a4', sandLow: '#d9bb74', sandInk: '#9a7a3a',
  grass: '#7c9a52', grassDk: '#4f6e3a', wood: '#b9824a', woodDk: '#7a4f27', cloth: '#fbf3dc', clothDk: '#d9caa2', iron: '#4a4f5c', prop: '#c98a4a',
  gull: '#ffffff', gullWing: '#c9d3dc', beak: '#ff9a3c', bag: '#c9a26b', bagDk: '#93703f', chute: '#ff6b5a', gust: '#ff8a3d' };
const TTHWRIGHT_NEWS = [
  '17 December 1903, Kitty Hawk. Hold right together to launch the Flyer!',
  'Flight 2: tall dunes and seagulls! The engine climbs and dives.',
  'Flight 3: windier! Watch out for his sandbags.',
  'Last flight: chase the Thief and grab the propeller back!',
];
const TTHWRIGHT_FACTS = [
  'Flight 1: 37 m in 12 seconds. Shorter than a jumbo jet\'s wing span!',
  'Flight 2: 53 m! Orville and Wilbur Wright took turns, just like you.',
  'Flight 3: 61 m! The brothers were bicycle makers.',
];
const TTHWRIGHT_TAUNTS = ['Bicycle makers can\'t fly!', 'Twelve seconds? My jet does that in a blink!', 'Wobble, wobble! Ha ha!', 'You call THAT an aeroplane?', 'Mind the sand! Hee hee!'];

/* ---------- the dunes: a height map made of slow waves, flat stretches (rails, landings) and tall dunes ---------- */
// 0 on a flat stretch, 1 in the open dunes (260 px of blend on both sides)
function tthWrightOpen(ph, x) {
  let k = 1;
  for (const f of ph.flats) {
    if (x <= f.x0 - 260 || x >= f.x1 + 260) continue;
    const d = x < f.x0 ? (f.x0 - x) / 260 : x > f.x1 ? (x - f.x1) / 260 : 0;
    k = Math.min(k, d * d * (3 - 2 * d));
  }
  return k;
}
function tthWrightGround(ph, x) {
  let y = TTHWRIGHT.ground - (14 * Math.sin(x * 0.0031) + 9 * Math.sin(x * 0.0083 + 1.3) + 10) * tthWrightOpen(ph, x);
  for (const d of ph.dunes) { const u = (x - d.x) / d.w; if (u > -1 && u < 1) { const c = Math.cos(u * Math.PI / 2); y -= d.h * c * c; } }
  return y;
}
// the sand under the Flyer (the highest of three spots under its skids)
const tthWrightUnder = (ph, x) => Math.min(tthWrightGround(ph, x - 20), tthWrightGround(ph, x + 40), tthWrightGround(ph, x + 95));
// a height that clears everything in the next 520 px (for pop-backs and hops off the sand)
function tthWrightSafeY(ph, x) {
  let g = TTHWRIGHT.ground;
  for (let k = 0; k <= 520; k += 40) g = Math.min(g, tthWrightGround(ph, x + k));
  return Math.max(TTHWRIGHT.ceil + 10, Math.min(TTHWRIGHT.cruise, g - TTHWRIGHT.belly - 58));
}
const tthWrightTip = (st, key, id, text, o, again = 4) => {
  const h = st.ph.tips;
  if (h[key] != null && st.ph.t - h[key] < again) return false;
  h[key] = st.ph.t; tthHint(st, id, text, o); return true;
};
// a point of the Flyer (local x forward, y down) in world coords
function tthWrightAt(ph, lx, ly) {
  const a = ph.tilt * TTHWRIGHT.tilt.rad, ca = Math.cos(a), sa = Math.sin(a);
  return { x: ph.x + lx * ca - ly * sa, y: ph.y + lx * sa + ly * ca };
}
// where a player sits (local): the balancer in the hip cradle, the engineer on the saddle by the crank
function tthWrightSeat(ph, id) {
  const S = TTHWRIGHT.seat, bal = id === ph.bal;
  let x = bal ? S.bal : S.eng, y = S.y;
  if (ph.swap > 0) {   // hopping over from the other seat
    const u = 1 - ph.swap / TTHWRIGHT.swapT, e = u * u * (3 - 2 * u), from = bal ? S.eng : S.bal;
    x = from + (x - from) * e; y -= Math.sin(u * Math.PI) * (bal ? 16 : 7);
  }
  if (bal) x += ph.lean * 7; else y -= ph.kick * 3;
  if (id === ph.jumper) y -= ph.jumpY;
  if (ph.cheer > 0) y -= Math.abs(Math.sin(ph.t * 9 + id * 1.4)) * 9;
  return { x, y };
}
// keep p.x / p.y on the two riders (world coords in the tick; screen coords from setup)
function tthWrightSeats(st, screen) {
  const ph = st.ph, ox = screen ? st.cam.x : 0;
  for (const p of G.players) {
    const s = tthWrightSeat(ph, p.id), w = tthWrightAt(ph, s.x, s.y);
    p.x = w.x - p.w / 2 - ox; p.y = w.y - p.h;
    p.vx = 0; p.vy = 0; p.grounded = true; p.face = 1; p.alive = true; p.stun = 0; p.knockT = 0;
  }
}

/* ---------- a flight: its flags, photographer, gusts and hazards (built when the Flyer is up) ---------- */
function tthWrightBuild(st) {
  const ph = st.ph, K = TTHWRIGHT, F = K.flights[ph.flight], x0 = ph.x, L = Math.round(F.v * F.secs), last = ph.flight === K.flights.length - 1;
  ph.x0 = x0; ph.L = L; ph.d = 0; ph.goalX = x0 + L; ph.flightT = 0;
  ph.flags = [];
  for (let i = 1; i <= F.flags; i++) ph.flags.push({ x: x0 + L * i / (F.flags + 1), m: Math.round(F.m * i / (F.flags + 1)), got: false, t: 0 });
  ph.cp = { x: x0, i: -1 }; ph.cpMiss = 0; ph.miss.sand = 0; ph.miss.hits = 0;
  ph.photo = { x: x0 + L * F.photo, done: false, said: false, flash: 0, ok: false };
  const ev = [];
  // the balancer's track: gusts
  let d = 420 + tthRand() * 60, i = 0;
  while (d < L - 330) {
    const c = F.patB[i++ % F.patB.length], px = x0 + d;
    if (!(px > ph.photo.x - F.v * 2.5 && px < ph.photo.x + 100)) ev.push({ d, kind: c === 'w' ? 'two' : 'tip', dir: tthRand() < 0.5 ? -1 : 1, done: false });
    d += F.v * F.gapB * (0.88 + tthRand() * 0.24) * (c === 'w' ? 1.3 : 1);
  }
  // the engineer's track: dunes (terrain), gulls, sandbags, downdrafts. Each reaches the Flyer about 700 px after d.
  ph.dunes = ph.dunes.filter(q => q.x > x0 - 1600);
  if (F.patE) {
    d = 500 + tthRand() * 80; i = 0;
    while (d < L - 900) {
      const c = F.patE[i++ % F.patE.length];
      if (c === 'D' && d > L - 1180) { /* too close to the landing strip: no dune */ }
      else if (c === 'D') { ph.dunes.push({ x: x0 + d + 760, h: 92 + tthRand() * 22, w: 215 + tthRand() * 30, teach: !ph.taught.dune }); ph.taught.dune = true; }
      else ev.push({ d, kind: c === 'h' ? 'hi' : c === 'l' ? 'lo' : c === 'b' ? 'bag' : 'down', done: false });
      d += F.v * F.gapE * (0.9 + tthRand() * 0.2);
    }
  }
  ev.sort((a, b) => a.d - b.d);
  ph.events = ev; ph.obs = []; ph.gust = null;
  // the landing strip after the goal, with the next launch rail on it (the last flight ends over flat sand)
  ph.flats = ph.flats.filter(f => f.x1 > x0 - 1600);
  ph.flats.push({ x0: ph.goalX - 140, x1: last ? ph.goalX + 1e7 : ph.goalX + K.landD + K.rail.len + 220 });
  if (!last) { ph.crowd = { x: ph.goalX + K.landD + 96, t: 0 }; ph.rails.push({ x0: ph.goalX + K.landD - 70, x1: ph.goalX + K.landD + K.rail.len + 50 }); if (ph.rails.length > 2) ph.rails.shift(); }
}
// back to the last flag: the hazards after it come again
function tthWrightRewind(st) {
  const ph = st.ph, cd = ph.cp.x - ph.x0;
  for (const e of ph.events) if (e.d >= cd - 5) e.done = false;
  ph.obs = ph.obs.filter(o => o.kind === 'bag' && o.state === 'down');
  ph.gust = null; ph.bagT = 0;
  if (ph.photo && !ph.photo.done) ph.photo.said = false;
}

/* ---------- gold help ---------- */
function tthWrightGoldWing(st) {
  const ph = st.ph, K = TTHWRIGHT.gold;
  if ((ph.cpMiss >= K.wing2 || ph.miss.wing >= K.wingAll2) && ph.gold.wing < 2) { ph.gold.wing = 2; tthHelp(st, 'Gold help: extra steady wings! The gusts are much gentler now.'); }
  else if ((ph.cpMiss >= K.wing || ph.miss.wing >= K.wingAll) && ph.gold.wing < 1) { ph.gold.wing = 1; tthHelp(st, 'Gold help: steadier wings! Gentler gusts, and more time in the red.'); }
}
function tthWrightGoldEng(st) {
  const ph = st.ph, K = TTHWRIGHT.gold;
  if (ph.gold.eng || (ph.miss.sand < K.sand && ph.miss.sandAll < K.sandAll && ph.miss.flood < K.flood)) return;
  ph.gold.eng = 1; tthHelp(st, 'Gold help: gold pedals! More power, and the Flyer climbs faster.');
}
function tthWrightGoldDodge(st) {
  const ph = st.ph;
  if (ph.gold.dodge || (ph.miss.hits < TTHWRIGHT.gold.hits && ph.miss.hitsAll < TTHWRIGHT.gold.hitsAll)) return;
  ph.gold.dodge = 1; tthHelp(st, 'Gold help: gold arrows show the safe way past gulls and sandbags.');
}

/* ---------- the engine: pedal taps, power ---------- */
function tthWrightPump(st) {
  const ph = st.ph, K = TTHWRIGHT.eng, since = ph.since, s = tthStats(st), e = tthWrightAt(ph, 0, -10);
  if (since < K.early && ph.gold.eng) return;   // gold pedals: a too-fast tap is just ignored
  ph.since = 0;
  if (ph.cough > 0) { puff(e.x, e.y, 3, 'rgba(60,56,70,0.8)'); Sfx.play('tthWrightCough'); return; }   // flooded: wait
  if (since < K.early) {
    ph.early++; ph.spin = Math.max(0, ph.spin - K.cough); ph.beat = 0;
    puff(e.x, e.y, 4, 'rgba(60,56,70,0.8)'); Sfx.play('tthWrightCough');
    if (ph.early >= K.floodN) {
      ph.early = 0; ph.cough = K.floodT; ph.miss.flood++;
      tthPop(st, e.x, e.y - 50, 'Flooded!', '#ffffff', 20);
      tthHint(st, ph.eng, 'Too fast! Slow, steady taps', { cpu: 'Oops, too fast!' });
      tthWrightGoldEng(st);
    }
    return;
  }
  ph.early = 0;
  const good = since >= K.good0 && since <= K.good1;
  ph.spin = Math.min(1, ph.spin + (good ? K.pump : K.weak));
  ph.beat = good ? ph.beat + 1 : 0;
  s.pumps++; if (ph.beat > s.bestBeat) s.bestBeat = ph.beat;
  ph.kick = 1; ph.crankTo += Math.PI;
  Sfx.play('tthWrightChug', good ? 0 : 1);
}
// one tick of the engine: the tap ring, the engineer's presses, power running down. -> true when the press is the grab
function tthWrightEngine(st, dt, decayK) {
  const ph = st.ph, K = TTHWRIGHT.eng, eng = G.players[ph.eng], was = ph.since;
  ph.since += dt;
  if (ph.cough > 0) ph.cough -= dt;
  if (ph.since > 1) ph.early = 0;
  if (was < K.good0 && ph.since >= K.good0) Sfx.play('tthWrightTick');   // the ring is home: tap now
  let grab = false;
  if (eng.pendingAct) {
    eng.pendingAct = false;
    if (ph.catch && ph.catch.fill >= 1 && ph.mode === 'fly') grab = true; else tthWrightPump(st);
  }
  if (ph.free > 0) ph.free -= dt;
  else ph.spin = Math.max(0, ph.spin - K.decay * decayK * (ph.gold.eng ? K.goldDecay : 1) * dt);
  return grab;
}
// the balancer's bicycle bell: seagulls close ahead scatter
function tthWrightBell(st) {
  const ph = st.ph, K = TTHWRIGHT.bell, bal = G.players[ph.bal];
  if (!bal.pendingAct) return;
  bal.pendingAct = false;
  if (ph.bell > 0) return;
  const r1 = K.r1 * (ph.gold.dodge ? 1.3 : 1);
  let n = 0;
  if (ph.mode === 'fly') for (const o of ph.obs) if (o.kind === 'gulls' && !o.scat && o.warn <= 0 && o.x - ph.x >= K.r0 && o.x - ph.x <= r1) { tthWrightScatter(st, o, 'Shoo!'); n++; }
  ph.bell = n ? K.cool : K.miss; ph.bellMax = ph.bell; ph.ring = 0.6;
  Sfx.play('tthWrightBell');
  if (n) tthStats(st).shooed += n;
}
function tthWrightScatter(st, o, word) {
  o.scat = true; o.scatT = 0;
  if (word) tthPop(st, o.x, (o.y0 + o.y1) / 2 - 30, word, '#ffffff', 20);
  Sfx.play('tthWrightSquawk');
  for (let k = 0; k < 6; k++) puff(o.x + (Math.random() - 0.5) * o.w, o.y0 + Math.random() * (o.y1 - o.y0), 1, 'rgba(255,255,255,0.9)');
}

/* ---------- the Thief's mischief: gusts, seagulls, sandbags ---------- */
function tthWrightGustStart(st, e) {
  const ph = st.ph, K = TTHWRIGHT, F = K.flights[ph.flight], two = e.kind === 'two', down = e.kind === 'down';
  ph.gust = { kind: e.kind, dir: e.dir || 1, tel: K.gust.tel, t: 0, dur: two ? K.gust.dur2 : K.gust.dur, k: down ? K.gust.down : F.gk, second: false };
  Sfx.play('tthWrightWarn');
  if (down) {
    tthWrightTip(st, 'down', ph.eng, 'Downdraft! Climb: ' + tthKey(ph.eng, 'up'), { cpu: 'Climbing!' }, 9);
    if (!ph.said.down) { ph.said.down = true; tthSay(st, 'Down you go!', 1.8); }
  } else {
    const n = ++ph.told[ph.bal].gusts;
    if (n <= 2 || ph.gold.wing) tthWrightTip(st, 'gust', ph.bal, 'Gust! Lean: ' + tthKey(ph.bal, e.dir > 0 ? 'left' : 'right'), { cpu: 'Leaning in!' }, 3);
    if (!ph.catch && (++ph.gustN) % 3 === 1) tthSay(st, TTHWRIGHT_TAUNTS[(ph.tauntN++) % TTHWRIGHT_TAUNTS.length], 2.2);
  }
}
// -> how hard the gust blows right now (0-1; 0 while it is only announced)
function tthWrightGustTick(st, dt) {
  const ph = st.ph, g = ph.gust, K = TTHWRIGHT.gust;
  if (!g) return 0;
  if (g.tel > 0) {
    g.tel -= dt;
    if (g.tel <= 0) { Sfx.play('tthWrightGust'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.1); }
    return 0;
  }
  g.t += dt;
  if (g.t >= g.dur) {
    if (g.kind === 'two' && !g.second) { g.second = true; g.dir = -g.dir; g.tel = K.tel2; g.t = 0; Sfx.play('tthWrightWarn'); }
    else ph.gust = null;
    return 0;
  }
  return Math.min(1, g.t / 0.2, (g.dur - g.t) / 0.2);
}
function tthWrightFlock(st, hi) {
  const ph = st.ph, K = TTHWRIGHT, GK = K.gulls, F = K.flights[ph.flight], key = hi ? 'hi' : 'lo';
  const o = { kind: 'gulls', hi, x: ph.x + (W - K.px) + GK.w / 2 + GK.warn * (F.v + GK.v) + 10, w: GK.w, y0: GK.hi0, y1: GK.hi1, warn: GK.warn, t: 0, scat: false, scatT: 0, gone: false,
    teach: !ph.taught[key], birds: [] };
  if (!hi) { o.y1 = tthWrightGround(ph, o.x) - GK.loGap; o.y0 = o.y1 - GK.loH; }
  for (let k = 0; k < 7; k++) o.birds.push({ dx: (k / 6 - 0.5) * (GK.w - 30) + (tthRand() - 0.5) * 16, dy: ((k * 3) % 7) / 6, f: tthRand() * 6 });
  ph.taught[key] = true;
  ph.obs.push(o);
  Sfx.play('tthWrightSquawk'); ph.laughT = 1.2;
  if (!ph.said.gulls) { ph.said.gulls = true; tthSay(st, 'Shoo, birdies! Get them!', 2); }
  const tb = ph.told[ph.bal], te = ph.told[ph.eng];
  if (tb.bell < 2) { tb.bell++; tthWrightTip(st, 'bell', ph.bal, 'Seagulls! Ring the bell: ' + tthKey(ph.bal, 'act'), { cpu: 'Bell ready!' }, 3); }
  if (te.gull < 2) { te.gull++; tthWrightTip(st, 'duck', ph.eng, hi ? 'Dive under them: ' + tthKey(ph.eng, 'down') : 'Climb over them: ' + tthKey(ph.eng, 'up'), { cpu: hi ? 'Diving under!' : 'Climbing over!' }, 3); }
}
function tthWrightBagHang(st) {
  const ph = st.ph, K = TTHWRIGHT;
  ph.obs.push({ kind: 'bag', state: 'hang', hang: K.bag.hang, x: 0, y: 0, vx: 0, vy: 0, t: 0, gone: false });
  ph.bagT = K.bag.hang + 0.5;
  Sfx.play('tthWrightWarn');
  if (!ph.said.bag) { ph.said.bag = true; tthSay(st, 'Sandbags away!', 1.8); }
  const te = ph.told[ph.eng];
  if (te.bag < 2) { te.bag++; tthWrightTip(st, 'bag', ph.eng, 'Sandbag! Climb or dive out of its way', { cpu: 'Dodging the sandbag!' }, 3); }
}
function tthWrightEvents(st) {
  const ph = st.ph;
  for (const e of ph.events) {
    if (ph.d < e.d) break;
    if (e.done) continue;
    if (e.kind === 'tip' || e.kind === 'two' || e.kind === 'down') { if (ph.gust || ph.grace > 0) continue; e.done = true; tthWrightGustStart(st, e); }
    else if (e.kind === 'bag') { if (ph.grace > 0 || ph.bagT > 0) continue; e.done = true; tthWrightBagHang(st); }
    else { e.done = true; tthWrightFlock(st, e.kind === 'hi'); }
  }
}
// seagulls fly, sandbags fall; a hit only while the Flyer is flying and not in its grace time
function tthWrightObs(st, dt) {
  const ph = st.ph, K = TTHWRIGHT, GK = K.gulls, c = st.thief, s = tthStats(st);
  const live = ph.mode === 'fly' && ph.grace <= 0 && !tthCalm(st), slack = GK.slack + (ph.gold.dodge ? 14 : 0);
  let gone = false;
  for (const o of ph.obs) {
    o.t += dt;
    if (o.kind === 'gulls') {
      o.x -= GK.v * dt;
      if (o.warn > 0) o.warn -= dt;
      if (!o.hi && !o.scat) { o.y1 = tthWrightGround(ph, o.x) - GK.loGap; o.y0 = o.y1 - GK.loH; }
      if (o.scat) { o.scatT += dt; if (o.scatT > 1.5) o.gone = true; }
      else if (live && o.x - o.w / 2 < ph.x + 100 && o.x + o.w / 2 > ph.x - 95 && ph.y + 30 > o.y0 + slack && ph.y - 30 < o.y1 - slack) {
        tthWrightScatter(st, o, '');
        if (tthBump(st, { word: 'Squawk!', kind: 'gull', x: ph.x + 60, y: ph.y - 50 })) {
          ph.vy = K.hit.dip * (o.hi ? 1 : -0.6); ph.slow = 1; ph.spin = Math.max(0, ph.spin - 0.1); s.gulls++; ph.miss.hits++; ph.miss.hitsAll++;
          if (!reduceMotion) G.shake = Math.max(G.shake, 0.2);
          tthWrightGoldDodge(st);
        }
      }
      if (o.x + o.w < st.cam.x - 60) o.gone = true;
    } else if (o.kind === 'bag') {
      if (o.state === 'hang') {
        o.x = c.x - 34; o.y = c.y + 6;
        if ((o.hang -= dt) <= 0) {   // let go: aimed at the height the Flyer has right now
          const tA = Math.max(0.4, (o.x - (ph.x + 70)) / Math.max(120, ph.v));
          o.state = 'fall'; o.vy = clamp((ph.y - 4 - o.y) / tA, K.bag.vy0, K.bag.vy1); o.ty = o.y + o.vy * tA;
          Sfx.play('tthWrightDrop');
        }
      } else if (o.state === 'fall') {
        o.y += o.vy * dt;
        const gy = tthWrightGround(ph, o.x);
        if (o.y >= gy - 12) { o.y = gy - 12; o.state = 'down'; puff(o.x, gy, 5, 'rgba(244,225,164,0.9)'); }
        else if (live && Math.abs(o.x - ph.x - 4) < 100 && o.y + 12 > ph.y - 34 + slack - 8 && o.y - 12 < ph.y + 32 - slack + 8) {
          o.state = 'hit'; o.vx = -70; o.vy = -230;
          if (tthBump(st, { word: 'Bonk!', kind: 'bag', x: o.x, y: o.y - 34 })) {
            ph.tilt = clamp(ph.tilt + (o.x >= ph.x ? 1 : -1) * K.hit.bagTilt, -1, 1); ph.slow = Math.max(ph.slow, 0.6); s.bags++; ph.miss.hits++; ph.miss.hitsAll++;
            if (!reduceMotion) G.shake = Math.max(G.shake, 0.22);
            tthWrightGoldDodge(st);
          }
        }
      } else if (o.state === 'hit') { o.x += o.vx * dt; o.y += o.vy * dt; o.vy += 900 * dt; if (o.y > H + 40) o.gone = true; }
      if (o.x < st.cam.x - 80) o.gone = true;
    }
    if (o.gone) gone = true;
  }
  if (gone) ph.obs = ph.obs.filter(o => !o.gone);
}
// where he hovers, where he looks, what his jet does
function tthWrightThief(st, dt) {
  const ph = st.ph, c = st.thief, K = TTHWRIGHT, T = ph.th, g = ph.gust;
  let tx = 806, ty = 212 + Math.sin(ph.t * 1.3) * 9, face = -1, pose = 'idle', flame = 1, claw = 0.35, rate = 3;
  if (ph.got) { tx = 800; ty = 216; pose = c.moodT > 0 ? 'shock' : 'sulk'; flame = 0.7; rate = 1.8; }
  else if (ph.catch) {
    const CK = K.catch;
    if (ph.mode !== 'grab') T.cy = CK.y0 + Math.sin(ph.catch.t * CK.w) * CK.amp * (ph.gold.catch ? 0.15 : 1);
    tx = K.px + CK.dx; ty = T.cy; claw = 1; rate = 2.4; pose = 'dizzy'; flame = 0.25 + (Math.sin(ph.t * 23) > 0.3 ? 0.5 : 0);
  } else if (g) {
    if (g.kind === 'down') { ty = 192; pose = 'point'; flame = g.tel > 0 ? 1.2 : 1.6; }
    else { face = 1; tx = 800; pose = g.tel > 0 ? 'point' : 'laugh'; flame = g.tel > 0 ? 1.2 : 1.6; }
  } else if (ph.bagT > 0) pose = 'point';
  else if (ph.mode === 'back' || ph.mode === 'slip' || ph.laughT > 0) pose = 'laugh';
  if (ph.bagT > 0) ph.bagT -= dt;
  if (ph.laughT > 0) ph.laughT -= dt;
  T.x += (tx - T.x) * Math.min(1, rate * dt); T.y += (ty - T.y) * Math.min(1, rate * dt);
  c.x = st.cam.x + T.x; c.y = T.y; c.face = face; c.pose = pose; c.flame = flame; c.jet = true; c.hidden = false;
  c.claw += (claw - c.claw) * Math.min(1, 3 * dt);
}

/* ---------- setup ---------- */
function tthWrightSetup(st, L) {
  const ph = st.ph, K = TTHWRIGHT, c = st.thief, first = L.def.first ? 1 : 0;
  Object.assign(ph, {
    t: 0, mode: 'rail', modeT: 0, flight: 0, bal: first, eng: 1 - first,
    x: K.px, y: K.ground - K.belly - K.rail.h, v: 0, vy: 0, tilt: 0, lean: 0, railX: K.px, y0: 0, x1: 0, v0: 0, backY: 0, landX0: 0, gyPrev: K.ground, touched: false,
    spin: 0.2, since: 9, early: 0, cough: 0, beat: 0, kick: 0, crank: 0, crankTo: 0, free: 0, heat: 0, hot: 0, propA: 0, steamT: 0, dustT: 0,
    bell: 0, bellMax: 1, ring: 0,
    grace: 0, slow: 0, down: false, overT: 0, lazy: 0, slipDir: 1, warnT: 0,
    swap: 0, jumper: -1, jumpY: 0, cheer: 0,
    flats: [{ x0: -4000, x1: K.px + K.rail.len + 220 }], rails: [{ x0: K.px - 70, x1: K.px + K.rail.len + 50 }], dunes: [], flags: [], events: [], obs: [],
    gust: null, photo: null, crowd: null,
    x0: K.px, L: 1, d: 0, goalX: 1e9, flightT: 0, cp: { x: K.px, i: -1 }, cpMiss: 0,
    miss: { sand: 0, hits: 0, flood: 0, wing: 0, sandAll: 0, hitsAll: 0 }, gold: { wing: 0, eng: 0, dodge: 0, catch: 0 },
    taught: {}, told: [0, 1].map(() => ({ gusts: 0, bell: 0, gull: 0, bag: 0, pedal: 0, wings: 0, heat: 0 })), tips: {}, said: {}, gustN: 0, tauntN: 0, laughT: 0, bagT: 0,
    catch: null, got: false, held: false, th: { x: 806, y: 212, cy: K.catch.y0 },
    wobA: tthRand() * 6.28, wobB: tthRand() * 6.28, wobC: tthRand() * 6.28,
  });
  Object.assign(tthStats(st), { flights: 0, flightT: [], photos: 0, scrapes: 0, sand: 0, outs: 0, gulls: 0, bags: 0, shooed: 0, pumps: 0, bestBeat: 0, catchT: 0 });
  Object.assign(c, { x: ph.th.x, y: ph.th.y, s: 0.72, face: -1, pose: 'idle', jet: true, item: st.era.loot, claw: 0.35, flame: 1 });
  st.cam = { x: 0, y: 0 };
  tthWrightSeats(st, true);
}
const tthWrightMode = (ph, mode) => { ph.mode = mode; ph.modeT = 0; };
const tthWrightSand = (x, y, n) => puff(x, y, n, 'rgba(236,215,160,0.95)');
// how many metres of this flight are flown
function tthWrightMetres(ph) { const F = TTHWRIGHT.flights[ph.flight]; return Math.floor(F.m * clamp(ph.d / ph.L, 0, 1)); }

/* ---------- the launch rail: it only speeds up while BOTH hold right ---------- */
function tthWrightRail(st, dt) {
  const ph = st.ph, K = TTHWRIGHT, R = K.rail, ps = G.players;
  for (const p of ps) p.pendingAct = false;
  if (!ph.said.start) { ph.said.start = true; tthNews(st, TTHWRIGHT_NEWS[0], false, 5); tthSay(st, 'Your propeller is MINE!', 2.4); }
  const ready = ph.swap <= 0 && !tthCalm(st), both = ready && ps[0].input.right && ps[1].input.right;
  if (both) { if (ph.v <= 0) Sfx.play('tthWrightRoll'); ph.v = Math.min(R.vMax, ph.v + R.acc * dt); }
  else ph.v = Math.max(0, ph.v - R.drag * dt);
  ph.x += ph.v * dt;
  ph.y = K.ground - K.belly - R.h + (ph.v > 20 ? Math.sin(ph.t * 46) * 0.7 : 0);
  ph.tilt = approach(ph.tilt, 0, 2 * dt);
  ph.spin = approach(ph.spin, both ? 0.9 : 0.25, 0.7 * dt);
  ph.since = 9;
  if (ready && !both && ph.modeT > 0.7) for (const p of ps) if (!p.input.right) tthWrightTip(st, 'rail' + p.id, p.id, 'Hold ' + tthKey(p.id, 'right') + ' together to take off!', { cpu: 'Ready for take-off!' }, 4.5);
  if (ph.v > 30 && (ph.dustT -= dt) <= 0) { ph.dustT = 0.07; tthWrightSand(ph.x - 70, K.ground - 4, 1); }
  if (ph.x >= ph.railX + R.len) {
    tthWrightMode(ph, 'climb'); ph.y0 = ph.y; ph.spin = Math.max(ph.spin, 0.9); ph.free = 2.3; ph.since = 0.2;
    Sfx.play('tthWrightLift'); tthPop(st, ph.x + 20, ph.y - 70, ph.flight ? 'Up we go!' : 'Lift-off!', '#ffffff', 24);
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.12);
    if (ph.flight > 0) tthNews(st, TTHWRIGHT_NEWS[ph.flight], false, 4.2);
    const e = ph.told[ph.eng], b = ph.told[ph.bal];
    if (e.pedal++ < 2) tthHint(st, ph.eng, 'Pedal on the beat: tap ' + tthKey(ph.eng, 'act'), { cpu: 'Pedalling!', life: 3.6 });
    if (b.wings++ < 2) tthHint(st, ph.bal, 'Keep the wings level: ' + tthKey(ph.bal, 'move'), { cpu: 'I hold the wings!', life: 3.6 });
  }
}
function tthWrightClimb(st, dt) {
  const ph = st.ph, K = TTHWRIGHT, F = K.flights[ph.flight], u = Math.min(1, ph.modeT / K.climbT), e = u * u * (3 - 2 * u);
  tthWrightEngine(st, dt, 0); G.players[ph.bal].pendingAct = false;
  ph.v = approach(ph.v, F.v, 220 * dt); ph.x += ph.v * dt;
  ph.y = ph.y0 + (K.cruise - ph.y0) * e; ph.tilt = approach(ph.tilt, 0, dt);
  if (u < 1) return;
  tthWrightBuild(st);
  tthWrightMode(ph, 'fly'); ph.grace = K.graceT; ph.vy = 0; ph.lazy = 0; ph.overT = 0; ph.down = false; ph.slow = 0; ph.gyPrev = K.ground;
}

/* ---------- flying ---------- */
function tthWrightFly(st, dt) {
  const ph = st.ph, K = TTHWRIGHT, F = K.flights[ph.flight], TK = K.tilt, EK = K.eng, HK = K.heat, s = tthStats(st);
  const bal = G.players[ph.bal], eng = G.players[ph.eng], calm = tthCalm(st), gw = ph.gold.wing;
  if (!st.idle) ph.flightT += dt;
  if (ph.grace > 0) ph.grace -= dt;
  if (ph.slow > 0) ph.slow -= dt / K.slowT;
  if (!calm && !ph.catch && !ph.down) tthWrightEvents(st);
  const gk = tthWrightGustTick(st, dt), g = ph.gust;
  const grab = tthWrightEngine(st, dt, 1);
  tthWrightBell(st);
  if (grab) { tthWrightGrabStart(st); return; }
  // the engineer: climb and dive, heat
  const up = tthUp(eng), dn = eng.input.down && !up;
  const pw = clamp((ph.spin - EK.dead) / (EK.flyMin - EK.dead), 0, 1);
  if (ph.hot > 0) { if ((ph.hot -= dt) <= 0) ph.heat = HK.after; else if ((ph.steamT -= dt) <= 0) { ph.steamT = 0.08; const e = tthWrightAt(ph, 2, -8); puff(e.x, e.y, 1, 'rgba(255,255,255,0.9)'); } }
  else if (up && !ph.down) {
    ph.heat += HK.up * (ph.gold.eng ? HK.goldK : 1) * dt;
    if (ph.heat >= 1) {
      ph.heat = 1; ph.hot = HK.hotT; Sfx.play('tthWrightHot');
      const e = tthWrightAt(ph, 2, -30); tthPop(st, e.x, e.y - 30, 'Too hot!', '#ffb199', 22);
      tthHint(st, ph.eng, 'Engine too hot! Ease off the climbing', { cpu: 'Phew, too hot!' });
    } else if (ph.heat > 0.72 && ph.told[ph.eng].heat < 2 && tthWrightTip(st, 'heat', ph.eng, 'Climbing heats the engine: let go to cool it', { cpu: 'Getting warm...' }, 9)) ph.told[ph.eng].heat++;
  } else ph.heat = Math.max(0, ph.heat - (dn ? HK.down : HK.cool) * dt);
  let want = EK.sink;
  if (up && ph.hot <= 0 && pw > 0.5) want = -EK.climb * (ph.gold.eng ? K.gold.climbK : 1); else if (dn) want = EK.dive;
  want += EK.fade * (1 - pw);
  if (ph.hot > 0) want += HK.sink;
  const over = Math.max(0, (Math.abs(ph.tilt) - TK.sinkFrom) / (1 - TK.sinkFrom));
  want += TK.sink * over;
  if (g && g.kind === 'down') want += g.k * gk;
  if (!ph.down) {
    ph.vy = approach(ph.vy, want, EK.acc * dt);
    ph.y += ph.vy * dt;
    if (ph.y < K.ceil) { ph.y = K.ceil; ph.vy = Math.max(0, ph.vy); }
    ph.v = approach(ph.v, F.v * (0.5 + 0.5 * pw) * (1 - TK.drag * over) * (1 - 0.4 * clamp(ph.slow, 0, 1)), 260 * dt);
  }
  ph.x += ph.v * dt; ph.d = ph.x - ph.x0;
  // the sand: a soft set-down with a dead engine, a skim, or a counted bump
  const gy = tthWrightUnder(ph, ph.x) - K.belly, dgy = (gy - ph.gyPrev) / dt;
  ph.gyPrev = gy;
  if (ph.down) {
    ph.y = gy; ph.vy = 0; ph.v = approach(ph.v, 0, 420 * dt); ph.overT = 0;
    if (ph.v > 20 && (ph.dustT -= dt) <= 0) { ph.dustT = 0.06; tthWrightSand(ph.x - 60, gy + K.belly, 1); }
    if (ph.spin >= EK.flyMin && !calm) {   // pedalled up again: a hop off the sand
      tthWrightMode(ph, 'hop'); ph.y0 = ph.y; ph.backY = tthWrightSafeY(ph, ph.x); ph.free = 1; Sfx.play('tthWrightLift');
    } else if (!calm) tthWrightTip(st, 'out', ph.eng, 'Engine out! Tap ' + tthKey(ph.eng, 'act') + ' on the beat', { cpu: 'Pedalling us up!' }, 4);
  } else if (ph.y >= gy) {
    const hard = ph.vy - dgy;
    ph.y = gy;
    if (ph.spin < EK.soft) {   // a weak engine sets the Flyer down softly: no bump, it waits to be pedalled up
      ph.down = true; ph.vy = 0; ph.gust = null; s.outs++; ph.miss.sand++; ph.miss.sandAll++;
      tthPop(st, ph.x + 20, ph.y - 60, 'Engine out!', '#ffffff', 22); Sfx.play('tthWrightLand'); tthWrightSand(ph.x + 30, gy + K.belly, 6);
      tthWrightGoldEng(st);
    } else if (hard > EK.hard && ph.grace <= 0 && !calm) {
      ph.vy = -K.hit.bounce; ph.slow = 1; tthWrightSand(ph.x + 40, gy + K.belly, 8); Sfx.play('tthWrightThud');
      if (tthBump(st, { word: 'Bump!', kind: 'sand', x: ph.x + 40, y: ph.y - 50 })) {
        s.sand++; ph.miss.sand++; ph.miss.sandAll++; if (!reduceMotion) G.shake = Math.max(G.shake, 0.22);
        tthWrightTip(st, 'sand', ph.eng, 'Too low! Climb: ' + tthKey(ph.eng, 'up'), { cpu: 'Oops, too low!' }, 5);
        tthWrightGoldEng(st);
      }
    } else { ph.vy = -EK.skim; ph.slow = Math.max(ph.slow, 0.5); tthWrightSand(ph.x + 40, gy + K.belly, 3); }
  }
  if (ph.spin < EK.flyMin && !ph.down && ph.cough <= 0 && !calm && ph.free <= 0) tthWrightTip(st, 'weak', ph.eng, 'More power! Tap ' + tthKey(ph.eng, 'act') + ' on the beat', { cpu: 'Pedalling harder!' }, 5);
  // the balancer: lean against the tilt
  const lr = (bal.input.right ? 1 : 0) - (bal.input.left ? 1 : 0);
  if (lr) ph.lazy = 0; else ph.lazy += dt;
  if (st.idle || ph.down) ph.tilt = approach(ph.tilt, 0, 1.2 * dt);
  else {
    let dv = lr * TK.ctl;
    if (ph.grace <= 0 && !calm) {
      const wob = F.wob * TK.driftK[gw] * (ph.catch ? 0.6 : 1) * (1 + TK.highK * clamp((K.cruise - ph.y) / (K.cruise - K.ceil), 0, 1));
      dv += TK.drift * wob * ph.tilt + TK.noise * wob * (Math.sin(ph.t * 1.7 + ph.wobA) + Math.sin(ph.t * 3.1 + ph.wobB) + 0.6 * Math.sin(ph.t * 0.63 + ph.wobC));
      if (g && g.kind !== 'down') dv += g.dir * g.k * TK.gustK[gw] * gk;
      if (ph.lazy > TK.lazyT) dv += (ph.tilt >= 0 ? 1 : -1) * TK.lazyK;
    }
    ph.tilt = clamp(ph.tilt + dv * dt, -1, 1);
  }
  const at = Math.abs(ph.tilt);
  if (at > TK.warn && !ph.down && !calm) {
    tthWarn(st, ph.bal, 0.25);
    if ((ph.warnT -= dt) <= 0) { ph.warnT = 0.32; Sfx.play('tthWrightCreak'); }
    tthWrightTip(st, 'lean', ph.bal, 'Level it! Lean: ' + tthKey(ph.bal, ph.tilt > 0 ? 'left' : 'right'), { cpu: 'Whoa, levelling!' }, 3.5);
  }
  if (at > TK.over && ph.grace <= 0 && !calm && !ph.down) {
    if ((ph.overT += dt) >= TK.overT[gw]) { tthWrightSlipStart(st); return; }
  } else ph.overT = Math.max(0, ph.overT - 2 * dt);
  // flags, the photographer, the goal
  for (let i = 0; i < ph.flags.length; i++) {
    const f = ph.flags[i];
    if (f.got || ph.x < f.x) continue;
    f.got = true; f.t = ph.t; ph.cp = { x: f.x, i }; ph.cpMiss = 0;
    tthPop(st, f.x, tthWrightGround(ph, f.x) - 96, f.m + ' m!', C.gold, 20); Sfx.play('tthWrightFlag');
  }
  const P = ph.photo;
  if (P && !P.done) {
    if (!P.said && P.x - ph.x < F.v * 2.4) { P.said = true; tthNews(st, 'A photographer! Fly past him with level wings!', false, 2.6); }
    if (ph.x >= P.x - 30) {
      P.done = true; P.flash = 0.5; P.ok = at <= TK.level && !ph.down; Sfx.play('tthWrightSnap');
      if (P.ok) { s.photos++; tthPop(st, ph.x + 30, ph.y - 84, 'Snap! Perfect photo!', C.gold, 24); Sfx.play('tthDing'); }
      else tthPop(st, ph.x + 30, ph.y - 84, 'Snap! A wobbly photo...', '#ffffff', 20);
    }
  }
  if (ph.catch) tthWrightCatch(st, dt);
  else if (ph.x >= ph.goalX) {
    s.flights = Math.max(s.flights, ph.flight + (ph.flight < K.flights.length - 1 ? 1 : 0)); s.flightT[ph.flight] = Math.round(ph.flightT * 10) / 10;
    ph.gust = null;
    for (const o of ph.obs) if (o.kind === 'gulls' && !o.scat) tthWrightScatter(st, o, '');
    if (ph.flight < K.flights.length - 1) { tthWrightMode(ph, 'land'); ph.landX0 = ph.x; ph.v0 = Math.max(120, ph.v); ph.y0 = ph.y; ph.touched = ph.down; ph.down = false; Sfx.play('tthWrightFlag'); }
    else {
      ph.catch = { t: 0, fill: 0, gustT: K.catch.gustT, inY: false, inTilt: false, near: false }; ph.grace = 1.2;
      tthSay(st, 'Uh-oh... my jet is out of puff!', 2.6);
      tthNews(st, 'His jet is out of puff! Fly right under him and keep the wings level!', false, 5);
      Sfx.play('tthWrightSputter');
    }
  }
}
function tthWrightHop(st, dt) {
  const ph = st.ph, K = TTHWRIGHT, F = K.flights[ph.flight], u = Math.min(1, ph.modeT / K.hopT), e = u * u * (3 - 2 * u);
  tthWrightEngine(st, dt, 0.5); G.players[ph.bal].pendingAct = false;
  ph.v = approach(ph.v, F.v, 240 * dt); ph.x += ph.v * dt; ph.d = ph.x - ph.x0;
  ph.y = ph.y0 + (ph.backY - ph.y0) * e; ph.tilt = approach(ph.tilt, 0, dt);
  if (u >= 1) { tthWrightMode(ph, 'fly'); ph.down = false; ph.grace = K.graceT; ph.vy = 0; ph.gyPrev = K.ground; }
}
// the low wing dips into the sand: "Scrape!", then the wind blows the Flyer back to the last flag
function tthWrightSlipStart(st) {
  const ph = st.ph;
  tthWrightMode(ph, 'slip'); ph.slipDir = ph.tilt >= 0 ? 1 : -1; ph.y0 = ph.y; ph.overT = 0; ph.gust = null;
  Sfx.play('tthWrightSlip');
}
function tthWrightSlip(st, dt) {
  const ph = st.ph, K = TTHWRIGHT, u = Math.min(1, ph.modeT / K.slipT), s = tthStats(st);
  tthWrightEngine(st, dt, 0); G.players[ph.bal].pendingAct = false;
  const tipX = ph.x + ph.slipDir * 96, gy = tthWrightGround(ph, tipX) - 58;
  ph.v = approach(ph.v, 70, 320 * dt); ph.x += ph.v * dt;
  ph.y = ph.y0 + (Math.max(ph.y0, gy) - ph.y0) * u * u; ph.tilt = approach(ph.tilt, ph.slipDir, 2 * dt);
  if (u < 1) return;
  const tip = tthWrightAt(ph, ph.slipDir > 0 ? 90 : -100, 24);
  if (tthBump(st, { word: 'Scrape!', kind: 'scrape', x: tip.x, y: tip.y - 70 })) s.scrapes++; else tthPop(st, tip.x, tip.y - 70, 'Scrape!', '#ffffff', 24);
  ph.cpMiss++; ph.miss.wing++; tthWrightSand(tip.x, tip.y, 12); Sfx.play('tthWrightScrape');
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.3);
  tthWrightGoldWing(st);
  tthWrightMode(ph, 'back'); ph.x1 = ph.x; ph.y0 = ph.y; ph.backY = tthWrightSafeY(ph, ph.cp.x); ph.laughT = 1.3;
  tthWrightRewind(st);
  tthHint(st, ph.bal, 'Lean toward the HIGH end: ' + tthKey(ph.bal, 'move'), { cpu: 'Sorry! I\'ll hold it steadier.' });
}
function tthWrightBack(st, dt) {
  const ph = st.ph, K = TTHWRIGHT, F = K.flights[ph.flight], u = Math.min(1, ph.modeT / K.backT), e = u * u * (3 - 2 * u);
  tthWrightEngine(st, dt, 0); G.players[ph.bal].pendingAct = false;
  ph.x = ph.x1 + (ph.cp.x - ph.x1) * e; ph.y = ph.y0 + (ph.backY - ph.y0) * e; ph.tilt = approach(ph.tilt, 0, 2.6 * dt);
  ph.d = ph.x - ph.x0;
  if (u < 1) return;
  tthWrightMode(ph, 'fly'); ph.grace = K.graceT; ph.v = F.v * 0.7; ph.vy = 0; ph.spin = Math.max(ph.spin, 0.85); ph.free = 1.4; ph.since = Math.min(ph.since, 0.3);
  ph.heat = Math.min(ph.heat, 0.5); ph.hot = 0; ph.overT = 0; ph.slow = 0; ph.down = false; ph.gyPrev = K.ground;
}
// after the goal: down onto the flat sand and a slide to a stop
function tthWrightLand(st, dt) {
  const ph = st.ph, K = TTHWRIGHT, stopX = ph.landX0 + K.landD, u = clamp((ph.x - ph.landX0) / K.landD, 0, 1), gy = K.ground - K.belly;
  for (const p of G.players) p.pendingAct = false;
  ph.v = Math.max(28, ph.v0 * Math.sqrt(1 - u)); ph.x = Math.min(stopX, ph.x + ph.v * dt);
  const k = Math.min(1, u / 0.6), e = k * k * (3 - 2 * k);
  ph.y = ph.y0 + (gy - ph.y0) * e;
  ph.tilt = approach(ph.tilt, 0, 1.6 * dt); ph.spin = approach(ph.spin, 0.2, 0.5 * dt); ph.heat = Math.max(0, ph.heat - 0.3 * dt); ph.hot = 0;
  if (k >= 1) {
    if (!ph.touched) { ph.touched = true; Sfx.play('tthWrightLand'); tthWrightSand(ph.x + 30, K.ground, 8); if (!reduceMotion) G.shake = Math.max(G.shake, 0.1); }
    if ((ph.dustT -= dt) <= 0) { ph.dustT = 0.06; tthWrightSand(ph.x - 50, K.ground - 2, 1); }
  }
  if (ph.x < stopX) return;
  ph.v = 0;
  if (ph.got) { tthWrightMode(ph, 'won'); return; }
  const s = tthStats(st), F = K.flights[ph.flight];
  tthWrightMode(ph, 'rest'); ph.cheer = 1.4; if (ph.crowd) ph.crowd.t = 2.4;
  tthNews(st, TTHWRIGHT_FACTS[ph.flight] || ('Flight ' + (ph.flight + 1) + ': ' + F.m + ' m!'), false, 4.4);
  tthPop(st, ph.x, ph.y - 80, F.m + ' m in ' + (s.flightT[ph.flight] || 0).toFixed(1) + ' s!', C.gold, 24);
  Sfx.play('tthCheer');
}
// a breather, then the two swap seats (like Orville and Wilbur, who took turns) and the next rail run
function tthWrightRest(st, dt) {
  const ph = st.ph, K = TTHWRIGHT;
  for (const p of G.players) p.pendingAct = false;
  ph.spin = approach(ph.spin, 0.2, 0.5 * dt);
  if (ph.modeT < K.restT) return;
  const b = ph.bal; ph.bal = ph.eng; ph.eng = b; ph.swap = K.swapT;
  tthSwap(st);
  ph.flight++; ph.railX = ph.x; ph.v = 0; ph.vy = 0; ph.tilt = 0; ph.heat = 0; ph.hot = 0; ph.slow = 0; ph.gust = null; ph.obs = []; ph.events = []; ph.flags = []; ph.photo = null;
  ph.goalX = 1e9; ph.d = 0; ph.cp = { x: ph.x, i: -1 }; ph.cpMiss = 0; ph.tips = {}; ph.since = 9; ph.early = 0; ph.cough = 0; ph.bell = 0;
  tthWrightMode(ph, 'rail');
}

/* ---------- the catch (flight 4): right under his claw, wings level, then the engineer grabs ---------- */
function tthWrightCatch(st, dt) {
  const ph = st.ph, K = TTHWRIGHT, CK = K.catch, c = ph.catch, T = ph.th;
  c.t += dt;
  if (!ph.gold.catch && c.t > CK.goldT) { ph.gold.catch = 1; tthHelp(st, 'Gold help: the Thief holds still, and the catch ring is bigger.'); }
  const win = ph.gold.catch ? CK.goldWin : CK.win, lvl = ph.gold.catch ? CK.goldLevel : K.tilt.level, dy = ph.y - (T.cy + CK.dy);
  c.near = Math.abs(T.x - (K.px + CK.dx)) < 14;
  c.inY = Math.abs(dy) <= win; c.inTilt = Math.abs(ph.tilt) <= lvl;
  const ok = c.near && c.inY && c.inTilt && !ph.down, was = c.fill;
  c.fill = clamp(c.fill + (ok ? dt / CK.fill : -CK.drain * dt), 0, 1.3);
  if (ok && Math.floor(c.fill * 5) > Math.floor(was * 5) && c.fill < 1) Sfx.play('tthTick');
  if (was < 1 && c.fill >= 1) { Sfx.play('tthDing'); tthHint(st, ph.eng, 'Grab it! ' + tthKey(ph.eng, 'act'), { cpu: 'Grabbing it!', gold: true, life: 2.4 }); }
  if (!c.near || ph.down) return;
  if (c.fill >= 1) tthWrightTip(st, 'grab', ph.eng, 'Grab it! ' + tthKey(ph.eng, 'act'), { cpu: 'Grabbing it!', gold: true }, 2.6);
  else {
    if (!c.inY) tthWrightTip(st, 'under', ph.eng, dy > 0 ? 'Climb up under him: ' + tthKey(ph.eng, 'up') : 'Dive down under him: ' + tthKey(ph.eng, 'down'), { cpu: 'Getting under him!' }, 4);
    if (!c.inTilt && Math.abs(ph.tilt) <= K.tilt.warn) tthWrightTip(st, 'lvl', ph.bal, 'Hold the wings level!', { cpu: 'Holding it level!' }, 4);
    // his sputtering jet still puffs at the wings now and then (always announced)
    if ((c.gustT -= dt) <= 0 && !ph.gust && ph.grace <= 0 && !tthCalm(st)) {
      c.gustT = CK.gustT * (0.85 + tthRand() * 0.3);
      tthWrightGustStart(st, { kind: 'tip', dir: tthRand() < 0.5 ? -1 : 1 }); ph.gust.k *= CK.gustK;
    }
  }
}
function tthWrightGrabStart(st) {
  const ph = st.ph;
  tthWrightMode(ph, 'grab'); ph.jumper = ph.eng; ph.gust = null; ph.vy = 0;
  if (st.hints) st.hints[ph.eng] = null;   // (the "Grab it!" bubble has done its job)
  Sfx.play('jump', ph.eng);
}
function tthWrightGrab(st, dt) {
  const ph = st.ph, K = TTHWRIGHT, u = Math.min(1, ph.modeT / K.grabT), s = tthStats(st);
  for (const p of G.players) p.pendingAct = false;
  ph.jumpY = Math.sin(u * Math.PI) * 42;
  ph.x += ph.v * dt; ph.tilt = approach(ph.tilt, 0, 1.5 * dt);
  if (u >= 0.5 && !ph.got) {
    ph.got = true; ph.held = true; st.thief.item = null; s.flights = K.flights.length; s.catchT = Math.round(ph.catch.t * 10) / 10;
    const e = tthWrightAt(ph, K.seat.eng, -40);
    tthPop(st, e.x, e.y - 40, 'Got it!', C.gold, 30); burst(e.x, e.y, C.gold, 14); for (let k = 0; k < 16; k++) confetti(e.x + (Math.random() - 0.5) * 120, e.y - 20);
    Sfx.play('tthWrightGrab'); rumble(0, 0.7, 0.5, 220); rumble(1, 0.7, 0.5, 220);
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.3);
    tthReact(st, 'shocked', 'My propeller!', 1.5);
  }
  if (u < 1) return;
  ph.jumper = -1; ph.jumpY = 0; ph.cheer = 6;
  tthWrightMode(ph, 'land'); ph.landX0 = ph.x; ph.v0 = Math.max(120, ph.v); ph.y0 = ph.y; ph.touched = false;
}

/* ---------- one tick ---------- */
function tthWrightAnim(st, dt) {
  const ph = st.ph, bal = G.players[ph.bal], fly = ph.mode === 'fly' && !st.cut;
  if (ph.kick > 0) ph.kick = Math.max(0, ph.kick - dt * 5);
  ph.crank += (ph.crankTo - ph.crank) * Math.min(1, 14 * dt);
  ph.propA += (3 + 32 * ph.spin) * dt;
  const lr = fly ? (bal.input.right ? 1 : 0) - (bal.input.left ? 1 : 0) : 0;
  ph.lean += (lr - ph.lean) * Math.min(1, 10 * dt);
  if (ph.swap > 0) ph.swap = Math.max(0, ph.swap - dt);
  if (ph.cheer > 0) ph.cheer -= dt;
  if (ph.ring > 0) ph.ring -= dt;
  if (ph.bell > 0) ph.bell -= dt;
  if (ph.photo && ph.photo.flash > 0) ph.photo.flash -= dt;
  if (ph.crowd && ph.crowd.t > 0) ph.crowd.t -= dt;
}
function tthWrightStep(st, dt) {
  const ph = st.ph, K = TTHWRIGHT;
  ph.t += dt; ph.modeT += dt;
  switch (ph.mode) {
    case 'rail': tthWrightRail(st, dt); break;
    case 'climb': tthWrightClimb(st, dt); break;
    case 'fly': tthWrightFly(st, dt); break;
    case 'hop': tthWrightHop(st, dt); break;
    case 'slip': tthWrightSlip(st, dt); break;
    case 'back': tthWrightBack(st, dt); break;
    case 'land': tthWrightLand(st, dt); break;
    case 'rest': tthWrightRest(st, dt); break;
    case 'grab': tthWrightGrab(st, dt); break;
    case 'won':
      for (const p of G.players) p.pendingAct = false;
      if (ph.modeT >= K.wonT) tthPhaseDone(st, { say: 'Bah! Who needs a propeller? I have a JET!', portal: { x: st.cam.x + 664, y: 196 } });
      break;
  }
  if (st.ph !== ph) return;
  tthWrightObs(st, dt);
  tthWrightThief(st, dt);
  tthWrightAnim(st, dt);
  st.cam.x = ph.x - K.px; st.cam.y = 0;
  tthWrightSeats(st, false);
}
// cards and the portal cutscene: the Flyer holds still (it is on the rail, or landed), the riders stay on it
function tthWrightCoast(st, dt) {
  const ph = st.ph;
  ph.t += dt;
  for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
  if (!st.cut) tthWrightThief(st, dt);
  tthWrightAnim(st, dt);
  st.cam.x = ph.x - TTHWRIGHT.px; st.cam.y = 0;
  tthWrightSeats(st, false);
}

/* ---------- drawing: Kitty Hawk ---------- */
const TTHWRIGHT_GY = new Float32Array(66);   // (scratch: this frame's sand line, every 16 px)
const tthWrightWrap = (v, m) => ((v % m) + m) % m;
function tthWrightDrawBack(st) {
  const ph = st.ph, K = TTHWRIGHT, CC = TTHWRIGHT_C, cx = st.cam.x, t = ph.t;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  tthScreen(st, () => {
    tthSky(CC.skyTop, CC.skyLow, 0, 336);
    // a pale December sun and streaky clouds
    ctx.fillStyle = 'rgba(255,248,220,0.45)'; circle(590, 150, 46); ctx.fill();
    ctx.fillStyle = '#fff8dc'; circle(590, 150, 29); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let k = 0; k < 6; k++) {
      const x = tthWrightWrap(k * 233 + 60 - cx * 0.05 - t * 3, 1400) - 200, y = 96 + (k * 67) % 150, s = 0.8 + (k % 3) * 0.3;
      ctx.beginPath(); ctx.ellipse(x, y, 62 * s, 9 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 30 * s, y - 7 * s, 36 * s, 8 * s, 0, 0, Math.PI * 2); ctx.fill();
    }
    // the Atlantic
    ctx.fillStyle = CC.sea; ctx.fillRect(0, 326, W, 44);
    ctx.fillStyle = CC.seaLt;
    for (let k = 0; k < 12; k++) { const x = tthWrightWrap(k * 131 - cx * 0.08, W + 80) - 40; ctx.fillRect(x, 332 + (k % 4) * 8, 24 + (k % 3) * 12, 2.5); }
    // far dunes with the lifesaving station's lookout
    const fx = cx * 0.14;
    ctx.fillStyle = CC.far; ctx.beginPath(); ctx.moveTo(0, 430);
    for (let sx = 0; sx <= W; sx += 24) ctx.lineTo(sx, 358 - 11 * Math.sin((sx + fx) * 0.006) - 6 * Math.sin((sx + fx) * 0.017 + 1));
    ctx.lineTo(W, 430); ctx.closePath(); ctx.fill();
    const lx = tthWrightWrap(700 - fx, 1900) - 200;
    ctx.fillStyle = '#e9e2cf'; ctx.strokeStyle = 'rgba(28,26,54,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(lx - 7, 352); ctx.lineTo(lx - 4, 312); ctx.lineTo(lx + 4, 312); ctx.lineTo(lx + 7, 352); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c0504a'; ctx.fillRect(lx - 5, 324, 10, 6); ctx.beginPath(); ctx.moveTo(lx - 7, 312); ctx.lineTo(lx, 303); ctx.lineTo(lx + 7, 312); ctx.closePath(); ctx.fill(); ctx.stroke();
    // nearer dunes with beach grass
    const mx = cx * 0.4;
    ctx.fillStyle = CC.mid; ctx.beginPath(); ctx.moveTo(0, H);
    for (let sx = 0; sx <= W; sx += 24) ctx.lineTo(sx, 398 - 15 * Math.sin((sx + mx) * 0.004 + 2) - 7 * Math.sin((sx + mx) * 0.011));
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = CC.grass; ctx.lineWidth = 2;
    for (let k = Math.floor(mx / 110); k * 110 < mx + W + 110; k++) {
      const h = hash(k, 5); if (h % 3 === 0) continue;
      const wx = k * 110 + h % 70, sx = wx - mx, y = 400 - 15 * Math.sin(wx * 0.004 + 2) - 7 * Math.sin(wx * 0.011);
      ctx.beginPath(); for (let q = -2; q <= 2; q++) { ctx.moveTo(sx + q * 2, y + 2); ctx.lineTo(sx + q * 5, y - 9 - (q === 0 ? 4 : 0)); } ctx.stroke();
    }
  });
  // the sand under the Flyer (world coords): this frame's line, a darker layer, grass and shells
  const x0 = Math.floor(cx / 16) * 16, gyA = TTHWRIGHT_GY, n = gyA.length;
  for (let i = 0; i < n; i++) gyA[i] = tthWrightGround(ph, x0 + i * 16);
  ctx.fillStyle = CC.sand; ctx.beginPath(); ctx.moveTo(x0, H + 4);
  for (let i = 0; i < n; i++) ctx.lineTo(x0 + i * 16, gyA[i]);
  ctx.lineTo(x0 + (n - 1) * 16, H + 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = CC.sandLow; ctx.beginPath(); ctx.moveTo(x0, H + 4);
  for (let i = 0; i < n; i++) ctx.lineTo(x0 + i * 16, gyA[i] + 30 + (gyA[i] < 420 ? (420 - gyA[i]) * 0.35 : 0));
  ctx.lineTo(x0 + (n - 1) * 16, H + 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath();
  for (let i = 0; i < n; i++) { if (i) ctx.lineTo(x0 + i * 16, gyA[i]); else ctx.moveTo(x0, gyA[0]); }
  ctx.stroke();
  for (let k = Math.floor(cx / 84); k * 84 < cx + W + 84; k++) {
    const h = hash(k, 11), wx = k * 84 + h % 60, i = clamp(Math.round((wx - x0) / 16), 0, n - 1), y = gyA[i];
    if (h % 4 === 0) { ctx.strokeStyle = CC.grassDk; ctx.lineWidth = 2.4; ctx.beginPath(); for (let q = -2; q <= 2; q++) { ctx.moveTo(wx + q * 2.5, y + 1); ctx.quadraticCurveTo(wx + q * 5, y - 10, wx + q * 8 + Math.sin(t * 2 + k) * 2, y - 15 - (q === 0 ? 5 : 0)); } ctx.stroke(); }
    else if (h % 4 === 1) { ctx.strokeStyle = CC.sandInk; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(wx - 12, y + 12); ctx.quadraticCurveTo(wx, y + 8, wx + 12, y + 12); ctx.stroke(); }
    else if (h % 4 === 2) { ctx.fillStyle = '#fff4e0'; ctx.strokeStyle = CC.sandInk; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(wx, y + 14, 4, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  // the camp shed at the first rail
  if (cx < 300) {
    const gy = K.ground;
    ctx.fillStyle = CC.wood; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(40, gy - 74, 130, 74); ctx.strokeRect(40, gy - 74, 130, 74);
    ctx.fillStyle = CC.woodDk; ctx.beginPath(); ctx.moveTo(30, gy - 74); ctx.lineTo(105, gy - 104); ctx.lineTo(180, gy - 74); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = CC.woodDk; ctx.lineWidth = 1.6; ctx.beginPath(); for (let q = 1; q < 6; q++) { ctx.moveTo(40 + q * 21.6, gy - 72); ctx.lineTo(40 + q * 21.6, gy - 2); } ctx.stroke();
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(84, gy - 46, 42, 46);
  }
  // launch rails
  for (const r of ph.rails) {
    if (r.x1 < cx - 20 || r.x0 > cx + W + 20) continue;
    const y = K.ground - K.rail.h;
    ctx.fillStyle = CC.woodDk; for (let x = r.x0 + 10; x < r.x1; x += 44) ctx.fillRect(x - 5, y + 3, 10, K.rail.h - 2);
    ctx.fillStyle = CC.wood; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.fillRect(r.x0, y - 2, r.x1 - r.x0, 6); ctx.strokeRect(r.x0, y - 2, r.x1 - r.x0, 6);
  }
  // checkpoint flags (the metres flown so far)
  for (const f of ph.flags) {
    if (f.x < cx - 40 || f.x > cx + W + 40) continue;
    const gy = tthWrightGround(ph, f.x), wv = Math.sin(t * 6 + f.x) * 3, pop = f.got ? Math.max(0, 1 - (ph.t - f.t) * 3) : 0;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(f.x, gy + 2); ctx.lineTo(f.x, gy - 74 - pop * 8); ctx.stroke();
    ctx.fillStyle = f.got ? C.gold : '#ffffff'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(f.x, gy - 74 - pop * 8); ctx.quadraticCurveTo(f.x + 16, gy - 70 + wv, f.x + 34, gy - 62 + wv); ctx.quadraticCurveTo(f.x + 16, gy - 56 + wv * 0.4, f.x, gy - 50 - pop * 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    text(f.m + ' m', f.x + 4, gy - 88 - pop * 8, 13, f.got ? C.gold : '#ffffff', 'center');
  }
  // the goal post: a tall pole with a windsock and the flight's distance
  if (ph.goalX < 1e8 && ph.goalX > cx - 60 && ph.goalX < cx + W + 60) {
    const gx = ph.goalX, gy = tthWrightGround(ph, gx), F = K.flights[ph.flight], wv = Math.sin(t * 7) * 4;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(gx, gy + 2); ctx.lineTo(gx, gy - 150); ctx.stroke();
    ctx.lineWidth = 2.4;
    for (let q = 0; q < 4; q++) { ctx.fillStyle = q % 2 ? '#ffffff' : '#ff6b5a'; ctx.beginPath(); ctx.moveTo(gx + q * 13, gy - 150 + q * 2 + wv * q * 0.25); ctx.lineTo(gx + (q + 1) * 13, gy - 148 + q * 2 + wv * (q + 1) * 0.25); ctx.lineTo(gx + (q + 1) * 13, gy - 132 - q + wv * (q + 1) * 0.25); ctx.lineTo(gx + q * 13, gy - 126 - q * 2 + wv * q * 0.25); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#fff4d6'; ctx.strokeStyle = C.ink; rr(gx - 34, gy - 112, 68, 28, 6); ctx.fill(); ctx.stroke();
    text(F.m + ' m', gx, gy - 97, 17, C.ink, 'center');
  }
  // the photographer on the dunes (John T. Daniels took the famous photo of the first flight)
  const P = ph.photo;
  if (P && P.x > cx - 80 && P.x < cx + W + 80) {
    const px = P.x, gy = tthWrightGround(ph, px);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - 13, gy + 2); ctx.lineTo(px, gy - 34); ctx.lineTo(px + 13, gy + 2); ctx.moveTo(px, gy - 34); ctx.lineTo(px + 2, gy + 2); ctx.stroke();
    ctx.fillStyle = CC.wood; ctx.lineWidth = 2.4; rr(px - 13, gy - 54, 26, 20, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a3340'; ctx.beginPath(); ctx.moveTo(px - 13, gy - 50); ctx.lineTo(px - 24, gy - 54); ctx.lineTo(px - 24, gy - 36); ctx.lineTo(px - 13, gy - 38); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8fe3e0'; circle(px - 25, gy - 45, 4.5); ctx.fill(); ctx.stroke();
    // the man behind it, in a flat cap
    ctx.fillStyle = '#5a6b8c'; rr(px + 16, gy - 40, 20, 40, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f3d9b8'; circle(px + 25, gy - 50, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6b4a2a'; ctx.beginPath(); ctx.moveTo(px + 13, gy - 53); ctx.quadraticCurveTo(px + 24, gy - 66, px + 36, gy - 54); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (P.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + clamp(P.flash * 2, 0, 1) + ')'; circle(px - 25, gy - 45, 16 + (0.5 - P.flash) * 60); ctx.fill(); }
    else if (!P.done) text('Smile!', px + 4, gy - 76 + Math.sin(t * 5) * 2, 14, '#ffffff', 'center');
    else if (P.ok) text('Perfect!', px + 4, gy - 76, 14, C.gold, 'center');
  }
  // the helpers from the lifesaving station, cheering where the Flyer lands
  const cr = ph.crowd;
  if (cr && cr.x > cx - 80 && cr.x < cx + W + 80) {
    for (let q = 0; q < 3; q++) {
      const x = cr.x + q * 30, hop = cr.t > 0 ? Math.abs(Math.sin(t * 9 + q * 1.3)) * 9 : 0, y = K.ground - hop;
      ctx.fillStyle = ['#7a5a3a', '#4f6e8c', '#8c4f4f'][q]; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2; rr(x - 8, y - 30, 16, 30, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f3d9b8'; circle(x, y - 37, 7.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a3340'; ctx.beginPath(); ctx.moveTo(x - 9, y - 40); ctx.quadraticCurveTo(x, y - 51, x + 9, y - 40); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (cr.t > 0) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 7, y - 24); ctx.lineTo(x - 13, y - 42); ctx.moveTo(x + 7, y - 24); ctx.lineTo(x + 13, y - 42); ctx.stroke(); }
    }
  }
}
function tthWrightDrawGull(x, y, f, s, a) {
  const CC = TTHWRIGHT_C, w = Math.sin(f) * 7 * s;
  ctx.globalAlpha = a;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8;
  ctx.fillStyle = CC.gullWing; ctx.beginPath(); ctx.moveTo(x - 3 * s, y - 2 * s); ctx.quadraticCurveTo(x + 3 * s, y - 13 * s - w, x + 15 * s, y - 7 * s - w * 1.4); ctx.quadraticCurveTo(x + 6 * s, y - 4 * s - w * 0.4, x + 4 * s, y + s); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = CC.gull; ctx.beginPath(); ctx.ellipse(x, y, 10 * s, 5.5 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  circle(x - 9 * s, y - 4 * s, 4.6 * s); ctx.fill(); ctx.stroke();
  ctx.fillStyle = CC.beak; ctx.beginPath(); ctx.moveTo(x - 13 * s, y - 5 * s); ctx.lineTo(x - 20 * s, y - 3 * s); ctx.lineTo(x - 13 * s, y - 2 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; circle(x - 10 * s, y - 5 * s, 1.2 * s); ctx.fill();
  ctx.globalAlpha = 1;
}
// a gold arrow (gold help, and the first time each thing comes): dir -1 up, 1 down
function tthWrightArrow(x, y, dir, s, col) {
  ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x, y + dir * 16 * s); ctx.lineTo(x - 14 * s, y); ctx.lineTo(x - 6 * s, y); ctx.lineTo(x - 6 * s, y - dir * 14 * s); ctx.lineTo(x + 6 * s, y - dir * 14 * s); ctx.lineTo(x + 6 * s, y); ctx.lineTo(x + 14 * s, y); ctx.closePath(); ctx.fill(); ctx.stroke();
}
function tthWrightDrawObs(st) {
  const ph = st.ph, CC = TTHWRIGHT_C, t = ph.t, cx = st.cam.x, c = st.thief;
  for (const o of ph.obs) {
    if (o.kind === 'gulls') {
      const hgt = o.y1 - o.y0, a = o.scat ? clamp(1 - o.scatT / 1.2, 0, 1) : 1;
      if (o.warn > 0) {   // not on screen yet: a "!" where the flock will fly in
        const sy = (o.y0 + o.y1) / 2, sx = cx + W - 40, k = 1 + Math.sin(t * 16) * 0.12;
        ctx.fillStyle = '#ff5f6d'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; circle(sx, sy, 22 * k); ctx.fill(); ctx.stroke();
        bigText('!', sx, sy + 1, 30, '#ffffff', k);
        tthWrightDrawGull(sx - 6, sy - 38, t * 14, 1, 1);
        continue;
      }
      if (!o.scat) { ctx.fillStyle = 'rgba(255,255,255,0.16)'; rr(o.x - o.w / 2 - 8, o.y0, o.w + 16, hgt, 28); ctx.fill(); }
      for (const b of o.birds) {
        const away = o.scat ? o.scatT * (140 + b.dy * 120) * (b.dy < 0.5 ? -1 : 1) : 0;
        tthWrightDrawGull(o.x + b.dx - (o.scat ? o.scatT * 60 * (b.dx < 0 ? 1 : -0.4) : 0), o.y0 + 16 + b.dy * (hgt - 32) + Math.sin(t * 3 + b.f) * 5 + away, t * (o.scat ? 26 : 13) + b.f, 1.1, a);
      }
      if (!o.scat && (o.teach || ph.gold.dodge)) tthWrightArrow(o.x - o.w / 2 - 34, o.hi ? o.y1 + 26 : o.y0 - 26, o.hi ? 1 : -1, 1 + Math.sin(t * 8) * 0.08, C.gold);
    } else if (o.kind === 'bag') {
      if (o.state === 'hang') { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c.x - 34 * c.s, c.y - 10); ctx.lineTo(o.x, o.y); ctx.stroke(); }
      if (o.state === 'fall') {
        // where it will be when the Flyer gets there, and its little parachute
        const k = 1 + Math.sin(t * 12) * 0.1;
        ctx.strokeStyle = '#ff5f6d'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]); circle(o.x, o.ty, 20 * k); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255,95,109,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.x, o.y + 12); ctx.lineTo(o.x, o.ty - 20); ctx.stroke();
        if (ph.gold.dodge) tthWrightArrow(o.x - 70, o.ty - 46, -1, 1, C.gold);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(o.x - 15, o.y - 30); ctx.lineTo(o.x, o.y - 8); ctx.lineTo(o.x + 15, o.y - 30); ctx.stroke();
        ctx.fillStyle = CC.chute; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(o.x, o.y - 30, 17, Math.PI, 0); ctx.quadraticCurveTo(o.x, o.y - 36, o.x - 17, o.y - 30); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.save(); ctx.translate(o.x, o.y); if (o.state === 'hit') ctx.rotate(o.t * 9); if (o.state === 'down') ctx.scale(1.15, 0.8);
      ctx.fillStyle = CC.bag; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-5, -11); ctx.quadraticCurveTo(-16, -2, -12, 10); ctx.quadraticCurveTo(0, 15, 12, 10); ctx.quadraticCurveTo(16, -2, 5, -11); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = CC.bagDk; ctx.fillRect(-6, -14, 12, 5); ctx.strokeRect(-6, -14, 12, 5);
      ctx.restore();
    }
  }
}

/* ---------- drawing: the Flyer, with Pip and Bo on the lower wing ---------- */
function tthWrightWood(x0, y0, x1, y1, w) {
  ctx.strokeStyle = C.ink; ctx.lineWidth = w + 2.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = TTHWRIGHT_C.wood; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}
function tthWrightWing(x, y, w) {
  const CC = TTHWRIGHT_C;
  ctx.fillStyle = CC.cloth; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.6; rr(x, y, w, 10, 5); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = CC.clothDk; ctx.lineWidth = 1.4; ctx.beginPath(); for (let q = x + 14; q < x + w - 6; q += 16) { ctx.moveTo(q, y + 2.5); ctx.lineTo(q, y + 7.5); } ctx.stroke();
}
function tthWrightDrawFlyer(st) {
  const ph = st.ph, K = TTHWRIGHT, CC = TTHWRIGHT_C, S = K.seat, t = ph.t, hurt = ph.mode === 'slip' || (ph.mode === 'back' && ph.modeT < 0.5);
  // its shadow on the sand
  const gy = tthWrightGround(ph, ph.x), hk = clamp(1 - (gy - K.belly - ph.y) / 260, 0.35, 1);
  ctx.fillStyle = 'rgba(28,26,54,' + (0.2 * hk) + ')'; ctx.beginPath(); ctx.ellipse(ph.x, gy + 5, 104 * hk, 6 * hk, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(ph.x, ph.y); ctx.rotate(ph.tilt * K.tilt.rad); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // the two rudders at the back, the front elevator and their booms
  tthWrightWood(-96, 22, -142, 8, 2.4); tthWrightWood(-100, -30, -142, -26, 2.4);
  ctx.fillStyle = CC.cloth; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4; rr(-152, -32, 11, 44, 4); ctx.fill(); ctx.stroke(); rr(-141, -30, 9, 40, 4); ctx.fill(); ctx.stroke();
  tthWrightWood(84, 24, 128, 4, 2.4); tthWrightWood(88, -30, 128, -10, 2.4);
  // the skids
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6.4; ctx.beginPath(); ctx.moveTo(-80, K.belly - 2); ctx.lineTo(92, K.belly - 2); ctx.quadraticCurveTo(118, K.belly - 4, 128, 4); ctx.stroke();
  ctx.strokeStyle = CC.wood; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-80, K.belly - 2); ctx.lineTo(92, K.belly - 2); ctx.quadraticCurveTo(118, K.belly - 4, 128, 4); ctx.stroke();
  for (const x of [-62, 0, 62]) tthWrightWood(x, 26, x, K.belly - 3, 2.4);
  // the pusher propeller behind the wings (a blur when it spins) and its bicycle chain
  const pa = Math.abs(Math.cos(ph.propA));
  if (ph.spin > 0.35) { ctx.fillStyle = 'rgba(201,138,74,0.25)'; ctx.beginPath(); ctx.ellipse(-84, -5, 7, 33, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = CC.prop; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-84, -5, 4.5, 4 + 29 * pa, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(28,26,54,0.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-84, -8); ctx.lineTo(-6, 6); ctx.moveTo(-84, -2); ctx.lineTo(-6, 14); ctx.stroke();
  ctx.fillStyle = TTHC.brass; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(-84, -5, 4); ctx.fill(); ctx.stroke();
  tthWrightWing(-100, 18, 188);
  // the engine: a block with two pumping pistons, a flywheel, steam when it is too hot
  const kick = ph.kick, hot = ph.hot > 0 ? 0.55 + 0.3 * Math.sin(t * 16) : Math.max(0, ph.heat - 0.5) * 0.9;
  ctx.fillStyle = CC.iron; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4;
  rr(-4, -6 - kick * 5, 8, 12, 2.5); ctx.fill(); ctx.stroke(); rr(8, -6 - (1 - kick) * 5, 8, 12, 2.5); ctx.fill(); ctx.stroke();
  rr(-10, 1, 32, 17, 4); ctx.fill(); ctx.stroke();
  if (hot > 0) { ctx.fillStyle = 'rgba(255,80,60,' + clamp(hot, 0, 0.85) + ')'; rr(-10, 1, 32, 17, 4); ctx.fill(); }
  ctx.fillStyle = '#7d8494'; circle(-6, 10, 6.5); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, 10); ctx.lineTo(-6 + Math.cos(ph.propA) * 6, 10 + Math.sin(ph.propA) * 6); ctx.stroke();
  // the engineer's bicycle crank and chain, the saddle, the balancer's hip cradle and the bell
  ctx.strokeStyle = 'rgba(28,26,54,0.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(S.eng + 21, 4); ctx.lineTo(20, 5); ctx.moveTo(S.eng + 21, 18); ctx.lineTo(20, 15); ctx.stroke();
  ctx.fillStyle = TTHC.brass; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2; circle(S.eng + 21, 11, 7.5); ctx.fill(); ctx.stroke();
  { const ax = S.eng + 21 + Math.cos(ph.crank) * 10, ay = 11 + Math.sin(ph.crank) * 10; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(S.eng + 21, 11); ctx.lineTo(ax, ay); ctx.stroke(); ctx.fillStyle = C.ink; ctx.fillRect(ax - 5, ay - 2, 10, 4); }
  ctx.fillStyle = '#5a3a22'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(S.eng - 11, S.y - 3, 22, 6, 3); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = CC.woodDk; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(S.bal - 15, S.y - 9); ctx.lineTo(S.bal - 15, S.y); ctx.lineTo(S.bal + 15, S.y); ctx.lineTo(S.bal + 15, S.y - 9); ctx.stroke();
  // Pip and Bo
  for (const p of G.players) {
    if (p.id === ph.jumper) continue;
    const s = tthWrightSeat(ph, p.id), bal = p.id === ph.bal;
    tthDrawHero(p.id, s.x, s.y, { s: S.s, rot: bal ? ph.lean * 0.2 : 0, face: 1, stun: hurt, sy: bal ? 1 : 1 - ph.kick * 0.08 });
  }
  // struts and wires, then the upper wing and the front elevator
  ctx.strokeStyle = 'rgba(28,26,54,0.3)'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (const [a, b] of [[-92, -64], [54, 80]]) { ctx.moveTo(a, -26); ctx.lineTo(b, 18); ctx.moveTo(b, -26); ctx.lineTo(a, 18); }
  ctx.stroke();
  for (const x of [-92, -64, -14, 22, 80]) tthWrightWood(x, -26, x, 18, 2.4);
  { const br = ph.ring > 0 ? Math.sin(ph.ring * 50) * 0.5 : 0;   // the bicycle bell on a strut
    ctx.save(); ctx.translate(-64, -6); ctx.rotate(br); ctx.fillStyle = ph.bell > 0 ? '#b9b3a0' : C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 7, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.ink; circle(0, 1.5, 2); ctx.fill(); ctx.restore(); }
  tthWrightWing(-104, -36, 196);
  ctx.fillStyle = CC.cloth; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4; rr(108, -15, 40, 7, 3.5); ctx.fill(); ctx.stroke(); rr(108, 1, 40, 7, 3.5); ctx.fill(); ctx.stroke();
  tthWrightWood(128, -9, 128, 1, 2);
  // standing up for the grab, and the propeller once it is won back
  if (ph.jumper >= 0) { const s = tthWrightSeat(ph, ph.jumper); tthDrawHero(ph.jumper, s.x, s.y, { s: S.s, face: 1, sy: 1.12, sx: 0.92 }); }
  if (ph.held) { const s = tthWrightSeat(ph, ph.eng); tthDrawLoot('prop', s.x, s.y - 46 - (ph.mode === 'grab' ? 0 : 12), 1.05, t * 3); }
  ctx.restore();
  // the bell's ring
  if (ph.ring > 0) {
    const b = tthWrightAt(ph, -64, -8), u = 1 - ph.ring / 0.6;
    ctx.strokeStyle = 'rgba(255,197,61,' + (1 - u) + ')'; ctx.lineWidth = 3;
    for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.arc(b.x, b.y, 14 + u * 70 + q * 16, -0.6, 0.6); ctx.stroke(); }
  }
}
// gusts: a big arrow over the wing end that will be pushed down (blinking while it is only announced), wind streaks
function tthWrightDrawGust(st) {
  const ph = st.ph, g = ph.gust, CC = TTHWRIGHT_C, t = ph.t;
  if (!g) return;
  const tel = g.tel > 0, blink = tel ? 0.55 + 0.45 * Math.sin(t * 22) : 1, s = 1.5 + (tel ? 0 : Math.sin(t * 18) * 0.12);
  ctx.save(); ctx.lineCap = 'round';
  if (g.kind === 'down') {
    ctx.globalAlpha = blink;
    for (const dx of [-70, 0, 70]) tthWrightArrow(ph.x + dx, ph.y - 96 + (tel ? 0 : (t * 60 + dx) % 14), 1, dx ? 1.1 : 1.4, '#7fd6ff');
    if (!tel) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); for (let q = 0; q < 7; q++) { const x = ph.x - 120 + q * 40, y = ph.y - 150 + ((t * 260 + q * 37) % 90); ctx.moveTo(x, y); ctx.lineTo(x, y + 26); } ctx.stroke(); }
  } else {
    const ex = ph.x + g.dir * 108, ey = ph.y - 78;
    ctx.globalAlpha = blink; tthWrightArrow(ex, ey + (tel ? 0 : (t * 70) % 12), 1, s, CC.gust);
    ctx.globalAlpha = blink * 0.9; tthWrightArrow(ph.x - g.dir * 108, ph.y + 70, -1, 0.9, 'rgba(255,255,255,0.8)');
    if (!tel) {   // his jet's wind, from the right
      ctx.globalAlpha = 0.75; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath();
      for (let q = 0; q < 6; q++) { const u = ((t * 1.9 + q / 6) % 1), x = ex + 300 * (1 - u), y = ey - 44 + q * 9 + u * u * 40; ctx.moveTo(x, y); ctx.lineTo(x + 34, y - 5); }
      ctx.stroke();
    }
  }
  ctx.restore();
}
// the catch: a ring around the propeller in his claw fills while the Flyer is right under it with level wings
function tthWrightDrawCatch(st) {
  const ph = st.ph, K = TTHWRIGHT, CK = K.catch, c = ph.catch, t = ph.t;
  if (!c || ph.got || !c.near) return;
  const P = tthThiefPts(st.thief).claw, px = P.x, py = P.y + 16 * st.thief.s, full = c.fill >= 1, ok = c.inY && c.inTilt;
  const win = ph.gold.catch ? CK.goldWin : CK.win, ty = ph.th.cy + CK.dy - 38;   // where the top wing belongs
  ctx.save(); ctx.lineCap = 'round';
  // a beam down to the height the top wing must hold
  ctx.fillStyle = ok ? 'rgba(255,197,61,0.28)' : 'rgba(255,255,255,0.16)';
  ctx.beginPath(); ctx.moveTo(px - 10, py + 14); ctx.lineTo(px + 10, py + 14); ctx.lineTo(px + 46, ty + win); ctx.lineTo(px - 46, ty + win); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = ok ? C.gold : 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.setLineDash([8, 7]);
  ctx.beginPath(); ctx.moveTo(px - 52, ty - win); ctx.lineTo(px + 52, ty - win); ctx.moveTo(px - 52, ty + win); ctx.lineTo(px + 52, ty + win); ctx.stroke(); ctx.setLineDash([]);
  const r = 26 + (full ? Math.sin(t * 14) * 3 : 0);
  ctx.strokeStyle = 'rgba(28,26,54,0.55)'; ctx.lineWidth = 8; circle(px, py, r); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 5; circle(px, py, r); ctx.stroke();
  ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(px, py, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(c.fill, 0, 1)); ctx.stroke();
  if (full) bigText('GRAB!', px, py - 46, tthBig() ? 30 : 22, C.gold, 1 + Math.sin(t * 14) * 0.06);
  ctx.restore();
}
function tthWrightDraw(st) {
  tthWrightDrawObs(st);
  tthWrightDrawFlyer(st);
  tthWrightDrawGust(st);
  tthWrightDrawCatch(st);
}
// over everything: the pedal ring at the crank (tap when it is home and green), the rewind wind
function tthWrightDrawTop(st) {
  const ph = st.ph, K = TTHWRIGHT, EK = K.eng, t = ph.t;
  if (ph.mode === 'back') {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath();
    for (let q = 0; q < 9; q++) { const y = 150 + q * 34, x = st.cam.x + ((q * 173 + t * 1500) % (W + 200)) - 100; ctx.moveTo(x, y); ctx.lineTo(x - 90, y); }
    ctx.stroke(); ctx.restore();
  }
  if (st.cut || ph.got || ph.mode === 'rail' || ph.mode === 'land' || ph.mode === 'rest' || ph.mode === 'won') return;
  const w = tthWrightAt(ph, K.seat.eng + 21, 11), big = tthBig(), z = big ? 1.3 : 1, s = ph.since;
  const home = s >= EK.good0 && s <= EK.good1, flood = ph.cough > 0, r = (11 + 22 * Math.max(0, 1 - s / EK.good0)) * z;
  ctx.save();
  ctx.lineWidth = 5 * z; ctx.strokeStyle = 'rgba(28,26,54,0.6)'; circle(w.x, w.y, r); ctx.stroke();
  ctx.lineWidth = 3 * z; ctx.strokeStyle = flood ? '#9aa0ad' : home ? '#7dff9a' : s < EK.early ? '#ff5f6d' : s > EK.good1 ? '#ffb347' : '#ffffff'; circle(w.x, w.y, r); ctx.stroke();
  if (home && !flood) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 20); ctx.fillStyle = '#7dff9a'; circle(w.x, w.y, r); ctx.fill(); }
  if (flood) { ctx.globalAlpha = 1; text('Flooded...', w.x, w.y - 30 * z, 13 * z, '#ffffff', 'center'); }
  ctx.restore();
}

/* ---------- the HUD: one panel per player at the bottom (it shows that player's job right now) ---------- */
function tthWrightPanel(st, id, x0, y0, w, h) {
  const ph = st.ph, K = TTHWRIGHT, TK = K.tilt, EK = K.eng, t = ph.t, bal = id === ph.bal, col = PCOL[id], my = y0 + h / 2;
  ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(x0, y0, w, h, 14); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 3; rr(x0, y0, w, h, 14); ctx.stroke();
  ctx.fillStyle = col; rr(x0 + 5, y0 + 5, 70, h - 10, 10); ctx.fill();
  text(NAMES[id], x0 + 40, y0 + 18, 14, '#ffffff', 'center');
  text(bal ? 'WINGS' : 'ENGINE', x0 + 40, y0 + 36, 14, '#ffffff', 'center');
  if (bal) {
    // a level: the ball must stay in the green; the arrow shows where the next gust will push it
    const bx = x0 + 84, bw = w - 84 - 46, hw = bw / 2, cx = bx + hw, at = Math.abs(ph.tilt), flying = ph.mode === 'fly' || ph.mode === 'slip';
    ctx.fillStyle = '#ff5f6d'; rr(bx, my - 9, bw, 18, 9); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(cx - hw * TK.over, my - 9, bw * TK.over, 18);
    ctx.fillStyle = '#7dd66f'; ctx.fillRect(cx - hw * TK.level, my - 9, bw * TK.level, 18);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4; rr(bx, my - 9, bw, 18, 9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, my - 13); ctx.lineTo(cx, my + 13); ctx.stroke();
    const g = ph.gust;
    if (g && g.kind !== 'down' && flying) { const ax = cx + g.dir * (hw * 0.62), k = g.tel > 0 ? 0.5 + 0.5 * Math.sin(t * 22) : 1; ctx.globalAlpha = k; ctx.fillStyle = TTHWRIGHT_C.gust; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax + g.dir * 12, my - 20); ctx.lineTo(ax - g.dir * 4, my - 27); ctx.lineTo(ax - g.dir * 4, my - 13); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1; }
    const mxp = cx + clamp(ph.tilt, -1, 1) * (hw - 9), red = flying && at > TK.over && Math.sin(t * 24) > 0;
    ctx.fillStyle = red ? '#ff5f6d' : '#ffffff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.6; circle(mxp, my, 10); ctx.fill(); ctx.stroke();
    // the bell
    const ex = x0 + w - 24, ready = ph.bell <= 0;
    ctx.fillStyle = ready ? C.gold : '#6b6880'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(ex, my + 3, 11, Math.PI, 0); ctx.lineTo(ex + 14, my + 7); ctx.lineTo(ex - 14, my + 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink; circle(ex, my + 9, 2.6); ctx.fill();
    if (!ready) { ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ex, my + 1, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - ph.bell / ph.bellMax)); ctx.stroke(); }
  } else {
    // the pedal lamp (green: tap now), the power bar (keep it over the notch) and the heat bar
    const lx = x0 + 100, s = ph.since, home = s >= EK.good0 && s <= EK.good1, flood = ph.cough > 0, live = ph.mode !== 'rail' && ph.mode !== 'land' && ph.mode !== 'rest' && ph.mode !== 'won';
    ctx.fillStyle = !live ? '#4a4766' : flood ? '#9aa0ad' : home ? '#7dff9a' : s < EK.early ? '#ff5f6d' : '#4a4766'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4; circle(lx, my, 15); ctx.fill(); ctx.stroke();
    if (live && !flood && s < EK.good0) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; circle(lx, my, 5 + 10 * (1 - s / EK.good0)); ctx.stroke(); }
    ctx.fillStyle = home && live && !flood ? C.ink : '#ffffff'; ctx.beginPath(); ctx.ellipse(lx, my, 7, 3.2, ph.crank, 0, Math.PI * 2); ctx.fill();
    const bx = x0 + 124, bw = w - 124 - 56;
    const bar = (y, hh, v, colr, notch) => {
      ctx.fillStyle = '#2a2744'; rr(bx, y, bw, hh, hh / 2); ctx.fill();
      if (v > 0.02) { ctx.fillStyle = colr; rr(bx, y, Math.max(hh, bw * clamp(v, 0, 1)), hh, hh / 2); ctx.fill(); }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(bx, y, bw, hh, hh / 2); ctx.stroke();
      if (notch) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + bw * notch, y - 2); ctx.lineTo(bx + bw * notch, y + hh + 2); ctx.stroke(); }
    };
    const low = ph.spin < EK.flyMin;
    bar(y0 + 9, 14, ph.spin, low ? (Math.sin(t * 16) > 0 || !live ? '#ff8a3d' : '#ff5f6d') : '#7dd66f', EK.flyMin);
    const hot = ph.hot > 0;
    bar(y0 + 31, 12, hot ? 1 : ph.heat, hot ? (Math.sin(t * 18) > 0 ? '#ff5f6d' : '#ffb199') : ph.heat > 0.7 ? '#ff8a3d' : '#ffd23f', 0);
    text('power', bx + bw + 6, y0 + 16.5, 12, low && live ? '#ffb199' : '#ffffff', 'left', 'body');
    text(hot ? 'HOT!' : 'heat', bx + bw + 6, y0 + 37.5, 12, hot ? '#ff8f8f' : '#ffffff', 'left', 'body');
  }
}
function tthWrightHud(st) {
  if (G.introT > 0 || st.cut) return;
  const z = tthBig() ? 1.4 : 1, pw = 280, phh = 56, gap = 18;
  ctx.save(); ctx.translate(W / 2, H - 6); ctx.scale(z, z); ctx.lineJoin = 'round';
  tthWrightPanel(st, 0, -gap / 2 - pw, -phh, pw, phh);
  tthWrightPanel(st, 1, gap / 2, -phh, pw, phh);
  ctx.restore();
}

/* ---------- the phase ---------- */
TTH_PHASES.wright = {
  bubbleHidden: true,
  setup(st, L) { tthWrightSetup(st, L); },
  step(st, dt) { tthWrightStep(st, dt); },
  coast(st, dt) { tthWrightCoast(st, dt); },
  hide: () => true,
  busy: () => true,
  headLift: () => 30,
  labels(st) { const ph = st.ph, grab = ph.catch && ph.catch.fill >= 1 && !ph.got; return [0, 1].map(id => (id === ph.bal ? 'bell' : grab ? 'grab' : 'pedal')); },
  roles(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.bal ? 'Wings!' : 'Engine!')); },
  jobKeys(st) { return st.ph.bal === 1 ? ['engine', 'wings'] : ['wings', 'engine']; },
  legend(st) {
    const ph = st.ph;
    const wings = k => (k ? '<kbd>←</kbd><kbd>→</kbd> level the wings' : '<kbd>A</kbd><kbd>D</kbd> level the wings');
    const engine = k => (k ? '<kbd>↑</kbd> climb <kbd>↓</kbd> dive' : '<kbd>W</kbd> climb <kbd>S</kbd> dive');
    return { pip: ph.bal === 0 ? wings(0) : engine(0), bo: ph.bal === 1 ? wings(1) : engine(1), pad: 'wings: stick ◀ ▶ levels them; engine: stick up climbs, down dives,' };
  },
  hudText(st) {
    const ph = st.ph, n = ph.flight + 1;
    if (ph.got) return 'Got it!';
    if (ph.catch) return 'Catch him!';
    return ph.mode === 'rail' || ph.mode === 'climb' ? 'Flight ' + n + ' of 4' : 'Flight ' + n + ': ' + tthWrightMetres(ph) + ' m';
  },
  progress(st) { return { n: st.ph.got ? 4 : st.ph.flight + (st.ph.mode === 'rest' || (st.ph.mode === 'land' && !st.ph.got) ? 1 : 0), of: 4 }; },
  drawBack(st) { tthWrightDrawBack(st); },
  draw(st) { tthWrightDraw(st); },
  drawTop(st) { tthWrightDrawTop(st); },
  hud(st) { tthWrightHud(st); },
  statLine(st) { const s = st.stats.wright; return s && s.photos >= 4 ? 'Four perfect Flyer photos' : ''; },
};

/* ---------- sounds ---------- */
Sfx.extra.tthWrightChug = function (p) { this.tone(95 * p, 0.09, 'sawtooth', 0.04, 60 * p); this.tone(190 * p, 0.05, 'square', 0.02, 120 * p, 0.03); };
Sfx.extra.tthWrightTick = function () { this.tone(1500, 0.025, 'square', 0.018); };
Sfx.extra.tthWrightCough = function () { this.tone(140, 0.07, 'sawtooth', 0.04, 70); this.tone(90, 0.09, 'square', 0.03, 50, 0.08); };
Sfx.extra.tthWrightBell = function () { this.tone(1760, 0.3, 'triangle', 0.05); this.tone(2217, 0.25, 'sine', 0.035, null, 0.08); this.tone(1760, 0.3, 'triangle', 0.04, null, 0.16); };
Sfx.extra.tthWrightSquawk = function () { this.tone(900, 0.09, 'sawtooth', 0.025, 1300); this.tone(1100, 0.1, 'sawtooth', 0.02, 700, 0.1); };
Sfx.extra.tthWrightWarn = function () { [880, 660, 880].forEach((f, i) => this.tone(f, 0.07, 'square', 0.03, null, i * 0.1)); };
Sfx.extra.tthWrightGust = function () { this.tone(240, 0.9, 'sawtooth', 0.03, 90); this.tone(900, 0.7, 'sawtooth', 0.012, 300, 0.05); };
Sfx.extra.tthWrightDrop = function () { this.tone(700, 0.35, 'sine', 0.03, 260); };
Sfx.extra.tthWrightRoll = function () { for (let k = 0; k < 6; k++) this.tone(70 + k * 12, 0.14, 'sawtooth', 0.025, 55, k * 0.14); };
Sfx.extra.tthWrightLift = function () { this.tone(200, 0.5, 'sine', 0.05, 620); this.tone(400, 0.4, 'triangle', 0.025, 900, 0.06); };
Sfx.extra.tthWrightLand = function () { this.tone(110, 0.2, 'triangle', 0.06, 60); this.tone(400, 0.25, 'sawtooth', 0.015, 150, 0.04); };
Sfx.extra.tthWrightThud = function () { this.tone(130, 0.16, 'square', 0.05, 60); };
Sfx.extra.tthWrightHot = function () { this.tone(1800, 0.6, 'sawtooth', 0.02, 700); this.tone(300, 0.3, 'square', 0.03, 180); };
Sfx.extra.tthWrightCreak = function () { this.tone(520, 0.05, 'square', 0.022, 430); };
Sfx.extra.tthWrightSlip = function () { this.tone(700, 0.5, 'sawtooth', 0.03, 160); };
Sfx.extra.tthWrightScrape = function () { for (let k = 0; k < 5; k++) this.tone(260 - k * 30, 0.08, 'sawtooth', 0.04, 90, k * 0.05); };
Sfx.extra.tthWrightFlag = function () { [660, 990].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.08)); };
Sfx.extra.tthWrightSnap = function () { this.tone(2400, 0.03, 'square', 0.04); this.tone(1200, 0.05, 'square', 0.03, null, 0.05); };
Sfx.extra.tthWrightSputter = function () { for (let k = 0; k < 5; k++) this.tone(160 - k * 14, 0.09, 'sawtooth', 0.035, 70, k * 0.16); };
Sfx.extra.tthWrightGrab = function () { [659, 880, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.055, null, i * 0.06)); };

/* ---------- the room (this file fills in its own room of the level def) ---------- */
tthRoom('wright', {
  jobs: {
    wings: { title: 'Wings', act: 'bell', legend: '<kbd>A</kbd><kbd>D</kbd> level the wings',
      howTo: ['Lean toward the high wing. Ring the bell to scatter seagulls.', 'To take off, both hold right.'] },
    engine: { title: 'Engine', act: ['pedal', 'grab'], legend: '<kbd>W</kbd> climb <kbd>S</kbd> dive <kbd>D</kbd> take off (both hold)',
      howTo: ['Pedal on the beat, when the ring closes. Climbing heats the engine.'] },
  },
  act: { label: 'pedal', labels: ['bell', 'pedal'] },
  tip: 'One keeps the wobbly wings level, one pedals the engine on the beat. Hold right together to take off!',
  legend: { pip: '<kbd>A</kbd><kbd>D</kbd> level the wings', bo: '<kbd>↑</kbd> climb <kbd>↓</kbd> dive', pad: 'wings: stick ◀ ▶ levels them; engine: stick up climbs, down dives,' },
  map: TTH_EMPTY_MAP,
});
