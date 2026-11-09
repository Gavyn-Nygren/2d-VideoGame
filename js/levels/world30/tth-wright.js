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
     runs down by itself: under 60 % the plane slows and sinks, and with a dead engine it sets down on the sand and
     waits ("Engine out!") until it is pedalled up again.
     UP climbs and DOWN dives (up is the jump button: tthUp). Climbing heats the engine: at 100 % it steams for
     2.6 s ("Too hot!"), cannot climb and sinks a little. So fly just high enough.
   - Both: hold RIGHT together to run the Flyer down the wooden launch rail (it only speeds up while BOTH hold).

   WHAT COMES AT THEM (everything is telegraphed at least 0.9 s)
   - Gusts (from flight 1): the Thief turns his jet on the Flyer. A big arrow shows which wing end will be pushed
     down (0.95 s), then it blows for 1.35 s. "Double gusts" (from flight 3) blow one way, then the other.
   - Tall dunes (from flight 2): climb over them. Touching sand is a "Bump!" and a bounce (the plane slows).
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
   - 2 wing scrapes since the last flag: "steadier wings" (gentler gusts and wobble, a longer red-zone time); 4: more.
   - 3 sand bumps / engine-outs in a flight, or 2 floodings: "gold pedals" (power lasts longer, too-fast taps are
     just ignored, climbing heats less).
   - 3 seagull / sandbag hits in a flight: gold arrows show the safe way past and the hit zones shrink.
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
  rail: { len: 360, acc: 100, drag: 190, go: 0.9, backT: 0.9 },
  climbT: 1.25, hopT: 0.8, landD: 300, swapT: 0.7, graceT: 1.6, slowT: 1.5, backT: 1,
  seat: { bal: -40, eng: 46, y: 18 },
  tilt: { ctl: 0.95, drift: 0.45, noise: 0.17, highK: 0.45, lazyT: 3, lazyK: 0.9, warn: 0.6, over: 0.82, overT: [0.7, 1, 1.3],
    gustK: [1, 0.7, 0.5], driftK: [1, 0.6, 0.35], sink: 110, sinkFrom: 0.35, drag: 0.3, rad: 0.42, level: 0.3 },
  gust: { tel: 0.95, dur: 1.35, tel2: 0.6, dur2: 0.95, down: 78 },
  eng: { decay: 0.3, pump: 0.3, weak: 0.18, early: 0.28, good0: 0.4, good1: 1.05, flyMin: 0.6, dead: 0.3, cough: 0.06, floodN: 3, floodT: 1.2,
    climb: 85, dive: 105, acc: 320, fade: 95, goldDecay: 0.55, glide: 0.25 },
  heat: { up: 0.3, cool: 0.14, down: 0.3, hotT: 2.6, after: 0.45, sink: 40, goldK: 0.65 },
  hit: { bounce: 150, dip: 130, bagTilt: 0.5 },
  bell: { r0: 100, r1: 430, cool: 3, miss: 2 },
  gulls: { v: 40, w: 150, hi0: 126, hi1: 258, loGap: 22, loH: 98, warn: 0.9, slack: 8 },
  bag: { hang: 0.7, vy0: 30, vy1: 150 },
  catch: { dx: 59, dy: 116, y0: 238, amp: 28, w: 0.8, win: 28, fill: 2.2, drain: 0.2, goldT: 22, goldWin: 42, goldLevel: 0.45 },
  gold: { wing: 2, wing2: 4, sand: 3, flood: 2, hits: 3 },
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
    while (d < L - 520) {
      const c = F.patE[i++ % F.patE.length];
      if (c === 'D') { ph.dunes.push({ x: x0 + d + 760, h: 92 + tthRand() * 22, w: 215 + tthRand() * 30, teach: !ph.taught.dune }); ph.taught.dune = true; }
      else ev.push({ d, kind: c === 'h' ? 'hi' : c === 'l' ? 'lo' : c === 'b' ? 'bag' : 'down', done: false });
      d += F.v * F.gapE * (0.9 + tthRand() * 0.2);
    }
  }
  ev.sort((a, b) => a.d - b.d);
  ph.events = ev; ph.obs = []; ph.gust = null;
  // the landing strip after the goal, with the next launch rail on it (the last flight ends over flat sand)
  ph.flats = ph.flats.filter(f => f.x1 > x0 - 1600);
  ph.flats.push({ x0: ph.goalX - 140, x1: last ? ph.goalX + 1e7 : ph.goalX + K.landD + K.rail.len + 220 });
  if (!last) ph.crowd = { x: ph.goalX + K.landD + 96, t: 0 };
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
  if (ph.cpMiss >= K.wing2 && ph.gold.wing < 2) { ph.gold.wing = 2; tthHelp(st, 'Gold help: extra steady wings! The gusts are much gentler now.'); }
  else if (ph.cpMiss >= K.wing && ph.gold.wing < 1) { ph.gold.wing = 1; tthHelp(st, 'Gold help: steadier wings! Gentler gusts, and more time in the red.'); }
}
function tthWrightGoldEng(st) {
  const ph = st.ph, K = TTHWRIGHT.gold;
  if (ph.gold.eng || (ph.miss.sand < K.sand && ph.miss.flood < K.flood)) return;
  ph.gold.eng = 1; tthHelp(st, 'Gold help: gold pedals! The engine keeps its power longer.');
}
function tthWrightGoldDodge(st) {
  const ph = st.ph;
  if (ph.gold.dodge || ph.miss.hits < TTHWRIGHT.gold.hits) return;
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
    if ((++ph.gustN) % 3 === 1) tthSay(st, TTHWRIGHT_TAUNTS[(ph.tauntN++) % TTHWRIGHT_TAUNTS.length], 2.2);
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
          ph.vy = K.hit.dip * (o.hi ? 1 : -0.6); ph.slow = 1; ph.spin = Math.max(0, ph.spin - 0.1); s.gulls++; ph.miss.hits++;
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
          o.state = 'fall'; o.vy = clamp((ph.y - 4 - o.y) / tA, K.bag.vy0, K.bag.vy1); o.y0 = o.y; o.x0 = o.x;
          Sfx.play('tthWrightDrop');
        }
      } else if (o.state === 'fall') {
        o.y += o.vy * dt;
        const gy = tthWrightGround(ph, o.x);
        if (o.y >= gy - 12) { o.y = gy - 12; o.state = 'down'; puff(o.x, gy, 5, 'rgba(244,225,164,0.9)'); }
        else if (live && Math.abs(o.x - ph.x - 4) < 100 && o.y + 12 > ph.y - 34 + slack - 8 && o.y - 12 < ph.y + 32 - slack + 8) {
          o.state = 'hit'; o.vx = -70; o.vy = -230;
          if (tthBump(st, { word: 'Bonk!', kind: 'bag', x: o.x, y: o.y - 34 })) {
            ph.tilt = clamp(ph.tilt + (o.x >= ph.x ? 1 : -1) * K.hit.bagTilt, -1, 1); ph.slow = Math.max(ph.slow, 0.6); s.bags++; ph.miss.hits++;
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
