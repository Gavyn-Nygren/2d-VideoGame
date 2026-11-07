/* Pip & Bo - Level 18-1 Runaway Ship (team, World 18 Pirate Cove). */
'use strict';

/* ===== 18-1 Runaway Ship (mode 'runship', World 18 "Pirate Cove", team) =====
   Gavyn's pick: "The ship has broken loose. One player steers the wheel over waves and around rocks. The other runs
   around the deck patching leaks, cutting tangled ropes and trimming the sails for speed. You swap jobs after each
   stretch."
   Pip and Bo's little pirate ship slipped its mooring and sails out of the harbor; they sail it to Treasure Cove. Side
   view: the ship stays on screen and the sea scrolls by. The mode owns the tick, the picture and the HUD (def.ownStep +
   def.ownHUD); the engine grid is empty apart from the two spawns. Positions on the ship are in ship px (x 0 at the
   stern rail, the main deck at y 290, the waterline at y 330); positions on the sea are world px along the course.
   The HELM stands at the wheel on the quarterdeck. ▲ ▼ (W S / ↑ ↓, the stick or touch ▲ ▼) steer between three sea
   lanes (far, middle, near; the ship moves up the screen and gets a bit smaller in the far lane). Holding ◀ eases off
   (half speed: a rock bumped slowly makes no leak). The action rings the ship's bell: ring it as a big wave reaches the
   bow and the ship meets it bow-first ("Over the top!"). A missed wave is a "Whoa!": water sloshes in, coins on the
   deck wash away and a deckhand who isn't holding on (climbing, in the crow's nest, holding ▼, or busy at a job) goes
   "Splash!" overboard until Dot the dolphin tosses them back.
   The DECKHAND runs and jumps round the deck (the quarterdeck and the forecastle are a hop up) and climbs the rope
   ladder with ▲ (▼ climbs down, ◀ ▶ + jump hops off). The action (hold it) hammers a plank over a leak, pumps water out at
   the pump (each press), hauls the flapping rope at its cleat when the wind changes, and untangles the rigging up the
   ladder. Coins splash on deck when the ship sails through floating treasure; walk over them to grab them.
   Why both are needed: a reef in the ship's lane runs it aground ("Bump! Aground!") until the helm steers to another
   lane, so an idle helm never gets past the first reef. A seagull tangles the rigging every stretch and the sail drops:
   the ship drifts to a stop until the deckhand climbs up and untangles it, so an idle deckhand never finishes either.
   Fog hides the rocks except from the crow's nest, so in fog the deckhand is the lookout. Water from leaks slows the
   ship (never sinks it), and a flapping sail sails at half speed.
   Four stretches (room def helm: 0|1), the jobs swap at the buoy after each: Harbor Mouth, Reef Run, Stormy Patch (rain,
   big waves, a fog bank), Treasure Cove (fog, then both must hold the action at the anchor to drop it).
   Gold help (announced, only while both are playing): Gold rudder after 3 bonks in a stretch (quicker steering and a
   gold arrow at the safe lane), Gold bell after 2 missed waves (a wider bell window), Gold hammer after 10 s with the
   water past 70% (quicker patches, bigger pumps), Gold knife after 14 s tangled with the deckhand trying, Gold spyglass
   after 2 bonks in fog (the sea chart shows the hidden rocks in gold).
   Room def: { title, helm: 0|1, pal, cruise, tip, act, course: [tokens] }. Course tokens (X = world px along the course):
     fN       sail on N px                  r1 / r02   rocks in lanes (0 far, 1 middle, 2 near)
     R1 / R02 reefs (aground until steered away)        c1  floating treasure (4 coins splash on deck)
     q        a fog row: rocks in 1 or 2 random lanes, always one lane free
     V        a big wave (rolls in once it is in view)  L  a leak pops     N  the wind changes     T[:y]  a gull tangles the rigging
     F:N      a fog bank N px long          S:text  a sign ({H} {D} names, {Hud} {Hact} {Hleft} {Dup} {Dact} {Ddown} keys;
                                            'text||text' gives the words to use when that job is the computer's)
     B        the buoy at the end (swap)    E  Treasure Cove (drop the anchor)
   Every global is prefixed runship / RUNSHIP (and Sfx.extra.runship*); all state lives in G.mst. */
const RUNSHIP = {
  // the ship (ship px)
  sternX: 24, bowX: 536, qdX: 140, qdY: 250, fcX: 442, fcY: 258, deckY: 290, wl: 330, bowTip: 548,
  mastX: 300, ratX0: 266, ratX1: 334, nestY: 64, nestX0: 284, nestX1: 316, yardY: 96,
  wheelX: 76, helmX: 54, pumpX: 214, cleats: [164, 424], anchorX0: 466, anchorX1: 534, anchorX: 498,
  // where the ship sits on screen: the mast foot over (pivotX, the lane's waterline), a bit smaller further away
  pivotX: 352, laneY: [384, 424, 466], laneS: [0.9, 1, 1.1],
  // sailing
  acc: 70, dec: 120, stopDec: 55, easeK: 0.5, luffK: 0.55, steerT: 0.5, steerGold: 0.3, steerRep: 0.42,
  waterSlow: 25, waterK: 0.82, leakRate: 2.1, bonkWater: 4, bonkSlow: 0.35, slowBonk: 0.72, maxLeaks: 4,
  waveV: 150, waveWin: 0.42, waveWinGold: 0.85, waveLate: 0.28, waveLen: 1.7, waveWater: 10, waveSee: 720,
  // the deckhand (ship px, px/s)
  run: 205, accG: 2200, accA: 1300, fric: 2600, g: 2000, jumpV: 610, cut: 0.45, climb: 165, climbSide: 110,
  fixT: 0.9, fixGold: 0.45, pumpAmt: 4.2, pumpGold: 2, pumpCd: 0.14, untangleT: 1.0, knifeT: 0.3,
  hold: 0.45, splashT: 2.4, swapT: 2.5, anchorT: 1.3, partyT: 5.5, tryWin: 8, hintLife: 3,
  rudderHelp: 3, bellHelp: 2, hammerHelp: 10, knifeHelp: 14, glassHelp: 2, stuckHint: 7,
  leakSlots: [{ x: 110, y: 250 }, { x: 188, y: 290 }, { x: 252, y: 290 }, { x: 360, y: 290 }, { x: 398, y: 290 }, { x: 470, y: 258 }],
};
const RUNSHIP_PAL = {
  harbor: { skyTop: '#55c3ef', skyBot: '#fff2cf', sea: '#2fb8c9', seaFar: '#7fdbe0', seaDeep: '#1f8fb0', foam: '#ffffff', isle: '#5fc48a', isleDark: '#3f9a6a', sand: '#f2d68c', cloud: 'rgba(255,255,255,0.9)', sun: true },
  reef: { skyTop: '#4fc0f0', skyBot: '#e9fbff', sea: '#27c2c4', seaFar: '#8ae8dc', seaDeep: '#1a99b0', foam: '#ffffff', isle: '#6fd08a', isleDark: '#47a86a', sand: '#f6dc96', cloud: 'rgba(255,255,255,0.92)', sun: true },
  storm: { skyTop: '#7a8fb0', skyBot: '#c9d6e6', sea: '#3d8fa6', seaFar: '#88b6c4', seaDeep: '#2a6c86', foam: '#eef8ff', isle: '#5c9a80', isleDark: '#41775f', sand: '#d9c48e', cloud: 'rgba(236,242,250,0.95)', sun: false, rain: true },
  cove: { skyTop: '#62b9f2', skyBot: '#ffe2b8', sea: '#2cbcc8', seaFar: '#8ee4dc', seaDeep: '#1e95b2', foam: '#ffffff', isle: '#62c47e', isleDark: '#3f9a5e', sand: '#f7d98e', cloud: 'rgba(255,250,240,0.92)', sun: true },
};
const runshipLerp = (a, b, u) => a + (b - a) * u;
const runshipSmooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
// 1-player mode: the computer's own job gets no key hints or prompts (it knows its job)
const runshipQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const runshipBoth = st => G.time - st.inT[0] < RUNSHIP.tryWin && G.time - st.inT[1] < RUNSHIP.tryWin;

/* ---------- the course: tokens -> things on the sea and things that happen on board ---------- */
function runshipCompile(def) {
  const c = { items: [], events: [], fogs: [], coins: 0, end: null };
  let x = 0;
  for (const tk of def.course || []) {
    const t = String(tk);
    if (/^f\d+$/.test(t)) x += +t.slice(1);
    else if (/^r[0-2]+$/.test(t)) for (const ch of t.slice(1)) c.items.push({ k: 'rock', X: x, lane: +ch, n: c.items.length });
    else if (/^R[0-2]+$/.test(t)) for (const ch of t.slice(1)) c.items.push({ k: 'reef', X: x, lane: +ch, n: c.items.length });
    else if (/^c[0-2]$/.test(t)) { c.items.push({ k: 'gold', X: x, lane: +t[1], n: c.items.length }); c.coins += 4; }
    else if (t === 'q') {
      // fog rocks are placed at random every time, so nobody can learn them by heart
      const free = Math.floor(Math.random() * 3), others = [0, 1, 2].filter(l => l !== free);
      const n = Math.random() < 0.55 ? 2 : 1;
      if (n === 1) others.splice(Math.floor(Math.random() * 2), 1);
      for (const l of others) c.items.push({ k: 'rock', X: x, lane: l, n: c.items.length, fogRow: true });
    }
    else if (t === 'V') c.items.push({ k: 'wave', X: x, lane: -1, n: c.items.length, moving: false, crossT: null, rang: null });
    else if (t === 'L') c.events.push({ k: 'leak', X: x });
    else if (t === 'N') c.events.push({ k: 'wind', X: x });
    else if (t[0] === 'T' && (t.length === 1 || t[1] === ':')) c.events.push({ k: 'tangle', X: x, y: +(t.split(':')[1] || 0) || 180 });
    else if (t.startsWith('F:')) c.fogs.push({ X0: x, X1: x + (+t.slice(2) || 1200) });
    else if (t.startsWith('S:')) c.events.push({ k: 'sign', X: x, text: t.slice(2) });
    else if (t === 'B') { c.end = { k: 'buoy', X: x }; x += 600; }
    else if (t === 'E') { c.end = { k: 'cove', X: x }; x += 900; }
  }
  for (const it of c.items) it.fog = c.fogs.some(f => it.X >= f.X0 && it.X <= f.X1);
  c.items.sort((a, b) => a.X - b.X);
  c.events.sort((a, b) => a.X - b.X);
  c.len = x;
  return c;
}

/* ---------- where things are on screen ---------- */
// the ship's own place on screen: its lane (moving between lanes), bob, waves and bonks
function runshipXf(st) {
  const P = RUNSHIP, sh = st.ship, lf = clamp(sh.laneF, 0, 2), i = Math.min(1, Math.floor(lf)), u = lf - i;
  const y = runshipLerp(P.laneY[i], P.laneY[i + 1], u), s = runshipLerp(P.laneS[i], P.laneS[i + 1], u);
  return { x: P.pivotX, y: y + sh.heave + Math.sin(sh.bob * 1.6) * 2.2, s, r: sh.rot + Math.sin(sh.bob * 1.1) * 0.012 };
}
// a ship point (lx, ly) on screen
function runshipToScreen(st, lx, ly, xf) {
  xf = xf || runshipXf(st);
  const dx = (lx - RUNSHIP.mastX) * xf.s, dy = (ly - RUNSHIP.wl) * xf.s, c = Math.cos(xf.r), s = Math.sin(xf.r);
  return { x: xf.x + dx * c - dy * s, y: xf.y + dx * s + dy * c };
}
// lane at a continuous lane value (0..2): its waterline y and scale
function runshipLaneAt(lf) {
  const P = RUNSHIP, i = Math.min(1, Math.floor(clamp(lf, 0, 2))), u = clamp(lf, 0, 2) - i;
  return { y: runshipLerp(P.laneY[i], P.laneY[i + 1], u), s: runshipLerp(P.laneS[i], P.laneS[i + 1], u) };
}
// screen x of world X in lane lf (things in a lane meet the ship's bow when X = ship.d)
function runshipSX(st, X, lf) {
  const s = runshipLaneAt(lf).s;
  return RUNSHIP.pivotX + (RUNSHIP.bowTip - RUNSHIP.mastX + (X - st.ship.d)) * s;
}
const runshipLaneOf = sh => Math.round(clamp(sh.laneF, 0, 2));
const runshipInLane = (sh, lane) => Math.abs(sh.laneF - lane) < 0.6;
const runshipInFog = (st, X) => st.c.fogs.some(f => X >= f.X0 && X <= f.X1);
// can the crew see this thing? (fog hides it unless someone is in the crow's nest; gold spyglass shows it on the chart)
const runshipLookout = st => st.body[st.deck] && st.body[st.deck].mode === 'nest' && st.state === 'sail';
const runshipSeen = (st, it) => !it.fog || runshipLookout(st);

// each player's own keys, for prompts and the HUD (a player with a controller is shown its buttons)
function runshipKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
  if (what === 'up') return pad ? 'stick ▲' : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'down') return pad ? 'stick ▼' : touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'left') return pad || touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'right') return pad || touch ? '▶' : id === 0 ? 'D' : '→';
  if (what === 'jump') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'ud') return pad ? 'stick ▲ ▼' : touch ? '▲ ▼' : id === 0 ? 'W S' : '↑ ↓';
  return pad ? 'stick' : touch ? '◀ ▶' : id === 0 ? 'A D' : '← →';
}
function runshipSignText(st, s) {
  const HM = st.helm, DH = st.deck, two = s.split('||');
  if (two.length > 1) s = (/\{H/.test(two[0]) && runshipQuiet(HM)) || (/\{D/.test(two[0]) && runshipQuiet(DH)) ? two[1] : two[0];
  return s.replace(/\{H\}/g, NAMES[HM]).replace(/\{D\}/g, NAMES[DH]).replace(/\{Hud\}/g, runshipKey(HM, 'ud')).replace(/\{Hact\}/g, runshipKey(HM, 'act'))
    .replace(/\{Hleft\}/g, runshipKey(HM, 'left')).replace(/\{Dup\}/g, runshipKey(DH, 'up')).replace(/\{Ddown\}/g, runshipKey(DH, 'down')).replace(/\{Dact\}/g, runshipKey(DH, 'act'));
}

/* ---------- a stretch ---------- */
function runshipBody(id, x, y, mode) {
  return { id, x, y, vx: 0, vy: 0, mode, face: 1, ground: true, coyote: 0, jumpBuf: 0, jumping: false, workT: -9, work: null, fixK: 0,
    splash: null, hop: null, sq: 0, hammer: 0, holdT: -9 };
}
function runshipRoom(st, L, k) {
  const P = RUNSHIP, def = L.def;
  st.k = k; st.helm = def.helm || 0; st.deck = 1 - st.helm; st.title = def.title || '';
  st.palKey = RUNSHIP_PAL[def.pal] ? def.pal : 'harbor'; st.pal = RUNSHIP_PAL[st.palKey];
  st.c = runshipCompile(def);
  st.cruise = def.cruise || 165;
  st.stats.roomT[k] = null; st.stats.roomTitles[k] = st.title;
  st.ship = { d: -40, v: 0, laneF: 1, lane: 1, steerDir: 0, steerT: 0, sail: 'full', wind: 1, trim: 1, water: 0, aground: null, heave: 0, rot: 0,
    waveRun: null, bonkT: 0, ease: false, bob: 0, wheelA: 0, bellT: 0, stopT: 0, luffT: 0 };
  st.body = [];
  st.body[st.helm] = runshipBody(st.helm, P.helmX, P.qdY, 'helm');
  st.body[st.deck] = runshipBody(st.deck, 360, P.deckY, 'walk');
  st.body[st.deck].face = 1; st.body[st.helm].face = 1;
  st.leaks = []; st.coins = []; st.tangle = null; st.gull = null; st.dolphin = null;
  st.state = 'sail'; st.stateT = 0; st.anchorK = 0; st.party = null;
  st.roomBonks = 0; st.roomWhoa = 0; st.fogBonks = 0; st.highWater = 0;
  st.rudderGold = false; st.bellGold = false; st.hammerGold = false; st.knifeGold = false; st.glassGold = false;
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null; st.sign = null; st.polly = { t: 9, say: null };
  st.roomT = 0; st.segStart = G.time; st.inT = [G.time, G.time]; st.prevIn = [{}, {}];
  st.need = null; st.needT = -1; st.evI = 0;
  runshipActLabels(st);
  runshipMirror(st);
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function runshipStep(st, dt) {
  if (!st.ship) return;
  const ps = G.players;
  for (const k of [0, 1]) {
    const i = ps[k].input;
    if (i.left || i.right || i.jump || i.down || i.up || i.act || ps[k].pendingJump || ps[k].pendingAct) st.inT[k] = G.time;
  }
  st.roomT += dt; st.stateT += dt;
  const sh = st.ship;
  sh.bob += dt;
  if (G.introT > 0) {
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
    for (const k of [0, 1]) st.prevIn[k] = Object.assign({}, ps[k].input);
  } else if (st.state === 'swap') { if (runshipSwapStep(st, dt)) return; }
  else if (st.state === 'anchor' || st.state === 'party') { if (runshipAnchorStep(st, dt)) return; }
  else runshipPlay(st, dt);
  runshipFx(st, dt);
  runshipMirror(st);
}

function runshipPlay(st, dt) {
  const P = RUNSHIP, sh = st.ship, ps = G.players, hp = ps[st.helm], hi = hp.input, hPrev = st.prevIn[st.helm];
  /* the helm: ▲ ▼ steer a lane at a time (a hold repeats), ◀ eases off, the action rings the bell */
  const up = hi.jump || hi.up, down = hi.down && !up;
  const dir = up ? -1 : down ? 1 : 0;
  const fresh = (up && !(hPrev.jump || hPrev.up)) || (down && !hPrev.down) || hp.pendingJump;
  if (dir && (fresh || (dir === sh.steerDir && sh.steerT >= P.steerRep))) { runshipSteer(st, dir); sh.steerT = 0; }
  if (dir) sh.steerT += dt; else sh.steerT = 0;
  sh.steerDir = dir;
  sh.ease = hi.left && !hi.right;
  if (hp.pendingAct) runshipBell(st);
  hp.pendingJump = false; hp.pendingAct = false;
  st.prevIn[st.helm] = Object.assign({}, hi);
  /* the deckhand */
  runshipDeckhand(st, st.body[st.deck], ps[st.deck], dt, true);
  /* the ship: lanes, speed, things on the sea */
  const want = sh.lane, sp = 1 / (st.rudderGold ? P.steerGold : P.steerT);
  sh.laneF = approach(sh.laneF, want, sp * dt);
  sh.wheelA += (want - sh.laneF) * dt * 9;
  const sailK = sh.sail === 'full' ? 1 : sh.sail === 'luff' ? P.luffK : 0;
  const waterK = 1 - P.waterK * clamp((sh.water - P.waterSlow) / (100 - P.waterSlow), 0, 1);
  let tgt = st.cruise * sailK * waterK * (sh.ease ? P.easeK : 1);
  if (sh.aground) tgt = 0;
  sh.v = approach(sh.v, tgt, (sh.v < tgt ? P.acc : sh.sail === 'down' ? P.stopDec : P.dec) * dt);
  if (sh.aground) sh.v = 0;
  if (sh.bonkT > 0) sh.bonkT -= dt;
  if (sh.bellT > 0) sh.bellT -= dt;
  if (sh.sail === 'luff') sh.luffT += dt;
  sh.stopT = sh.v < 8 ? sh.stopT + dt : 0;
  runshipMove(st, dt);
  runshipWaves(st, dt);
  runshipEvents(st);
  /* water: open leaks let water in */
  const before = sh.water;
  sh.water = clamp(sh.water + st.leaks.length * P.leakRate * dt, 0, 100);
  if (sh.water > 70 && runshipBoth(st)) { st.highWater += dt; if (st.highWater > P.hammerHelp && !st.hammerGold) runshipGold(st, 'hammer'); }
  if (before < 100 && sh.water >= 100) { runshipPop(st, 'Glug! So much water!', '#bfefff', 300, 380); Sfx.play('runshipGlug'); }
  // tangled too long with the deckhand trying: gold knife
  if (st.tangle) {
    st.tangle.t += dt;
    if (G.time - st.inT[st.deck] < 3) st.tangle.tryT += dt;
    if (st.tangle.tryT > P.knifeHelp && !st.knifeGold) runshipGold(st, 'knife');
  }
  // Polly helps out when the ship has been stopped a while
  if (sh.stopT > P.stuckHint && st.polly.t > 6) {
    st.polly.t = 0;
    if (sh.aground) runshipPolly(st, runshipQuiet(st.helm) ? 'Squawk! Steer away from the reef!' : 'Squawk! ' + NAMES[st.helm] + ', steer ' + runshipKey(st.helm, 'ud') + '!');
    else if (sh.sail === 'down') runshipPolly(st, runshipQuiet(st.deck) ? 'Squawk! Untangle the ropes!' : 'Squawk! ' + NAMES[st.deck] + ', climb up and untangle!');
  }
  // the end of the stretch
  const end = st.c.end;
  if (end && sh.d >= end.X) { if (end.k === 'buoy') runshipStartSwap(st); else runshipStartAnchor(st); }
  runshipNudges(st);
}
function runshipSteer(st, dir) {
  const sh = st.ship, to = clamp(sh.lane + dir, 0, 2);
  if (to === sh.lane) { Sfx.play('runshipCreak', st.helm); return; }
  sh.lane = to;
  Sfx.play('runshipWheel', st.helm);
}
// the bell: rung in time for a wave, the ship meets it bow-first
function runshipBell(st) {
  const P = RUNSHIP, sh = st.ship;
  sh.bellT = 0.6;
  Sfx.play('runshipBell', st.helm);
  const win = st.bellGold ? P.waveWinGold : P.waveWin;
  let early = false;
  for (const w of st.c.items) {
    if (w.k !== 'wave' || w.done) continue;
    const tt = w.crossT != null ? -(G.time - w.crossT) : (w.X - sh.d) / (sh.v + P.waveV);
    if (tt <= win && tt >= -P.waveLate) { w.rang = G.time; runshipPop(st, 'Ding! Hold on!', C.gold, 120, 230); return; }
    if (tt > win && tt < 3) early = true;
  }
  if (early) runshipPop(st, 'Too early!', '#ffe7a8', 120, 230);
}
// the ship sails on; things it meets at the bow
function runshipMove(st, dt) {
  const sh = st.ship;
  let nd = sh.d + sh.v * dt;
  // aground: free once steered to another lane
  if (sh.aground && !runshipInLane(sh, sh.aground.lane)) { sh.aground.passed = true; sh.aground = null; Sfx.play('runshipFree'); runshipPop(st, 'Free!', '#c8ffd0', 250, 300); }
  // a reef in the ship's lane stops it right there (and nothing at that spot in other lanes counts yet)
  let block = null;
  for (const it of st.c.items) {
    if (it.passed || it.k === 'wave') continue;
    if (it.X > nd) break;
    if (it.k === 'reef' && runshipInLane(sh, it.lane)) { block = it; nd = Math.max(sh.d, it.X); break; }
  }
  for (const it of st.c.items) {
    if (it.passed || it.k === 'wave' || it === block) continue;
    if (it.X > nd || (block && it.X >= block.X - 0.01)) break;
    it.passed = true;
    if (!runshipInLane(sh, it.lane)) continue;
    if (it.k === 'gold') { it.got = true; runshipTreasure(st, it); }
    else if (it.k === 'rock') { it.hit = true; runshipBonk(st, it, false); }
  }
  if (block && sh.aground !== block) { sh.aground = block; block.hit = true; runshipBonk(st, block, true); }
  sh.d = Math.max(sh.d, nd);
}
function runshipBonk(st, it, reef) {
  const P = RUNSHIP, sh = st.ship, slow = sh.v < st.cruise * P.slowBonk && !reef;
  st.stats.bonks++; st.roomBonks++;
  if (it.fog) st.fogBonks++;
  sh.bonkT = 0.6;
  if (!reduceMotion) G.shake = Math.max(G.shake, slow ? 0.12 : 0.28);
  rumble(0, 0.4, 0.5, 160); rumble(1, 0.4, 0.5, 160);
  const xf = runshipXf(st), bow = runshipToScreen(st, P.bowTip, P.wl - 10, xf);
  for (let i = 0; i < 14; i++) runshipPart(st, bow.x + 6, bow.y, 60 + Math.random() * 160, -120 - Math.random() * 200, 0.7, i % 2 ? '#ffffff' : '#c9f2ff', 3 + Math.random() * 3, 600);
  if (slow) { runshipPop(st, 'Bump! (slow, no leak)', '#ffffff', bow.x - 30, bow.y - 70); sh.v *= 0.6; Sfx.play('runshipBump'); }
  else {
    runshipPop(st, reef ? 'Bump! Aground!' : 'Bonk!', '#ffffff', bow.x - 30, bow.y - 70);
    sh.v *= P.bonkSlow; sh.water = Math.min(100, sh.water + P.bonkWater);
    runshipLeak(st, true);
    Sfx.play('runshipBonk');
  }
  if (st.roomBonks >= P.rudderHelp && !st.rudderGold && runshipBoth(st)) runshipGold(st, 'rudder');
  if (st.fogBonks >= P.glassHelp && !st.glassGold && runshipBoth(st)) runshipGold(st, 'glass');
  if (!reef && !runshipQuiet(st.helm)) runshipHintOnce(st, 'bonk', st.helm, 'Steer round the rocks! ' + runshipKey(st.helm, 'ud'));
}
function runshipLeak(st, fromBonk) {
  const P = RUNSHIP, free = P.leakSlots.map((s, i) => i).filter(i => !st.leaks.some(l => l.slot === i));
  if (!free.length || st.leaks.length >= P.maxLeaks) { st.ship.water = Math.min(100, st.ship.water + 5); return; }
  // (not right under the deckhand's feet: a new leak somewhere to run to)
  const db = st.body[st.deck], far = free.filter(i => Math.abs(P.leakSlots[i].x - db.x) > 40);
  const pick = (far.length ? far : free)[Math.floor(Math.random() * (far.length ? far.length : free.length))];
  st.leaks.push({ slot: pick, t: 0, fix: 0 });
  const s = P.leakSlots[pick], sc = runshipToScreen(st, s.x, s.y - 30);
  runshipPop(st, fromBonk ? 'A leak!' : 'Creak! A leak!', '#bfefff', sc.x, sc.y - 20);
  Sfx.play('runshipCreak');
  if (!runshipQuiet(st.deck)) runshipHintOnce(st, 'leak', st.deck, 'A leak! Stand on it and hold ' + runshipKey(st.deck, 'act'));
}
function runshipTreasure(st, it) {
  const P = RUNSHIP, sh = st.ship;
  Sfx.play('runshipTreasure');
  const xf = runshipXf(st), bow = runshipToScreen(st, P.bowTip, P.wl - 20, xf);
  runshipPop(st, 'Treasure!', C.gold, bow.x - 10, bow.y - 80);
  for (let i = 0; i < 4; i++) {
    const tx = 170 + Math.random() * 350, surf = tx > P.fcX ? P.fcY : P.deckY;
    st.coins.push({ x: P.bowX - 10, y: P.wl - 30, vx: (tx - (P.bowX - 10)) / 0.9, vy: -560 - Math.random() * 120, tx, surf, landed: false, t: 0, spin: Math.random() * 6 });
  }
  if (!runshipQuiet(st.deck)) runshipHintOnce(st, 'coin', st.deck, 'Coins! Run over them to grab them');
}
// big waves roll in once they are in sight; the bell (in time) meets them bow-first
function runshipWaves(st, dt) {
  const P = RUNSHIP, sh = st.ship;
  for (const w of st.c.items) {
    if (w.k !== 'wave' || w.done) continue;
    if (!w.moving && w.X - sh.d < P.waveSee) { w.moving = true; Sfx.play('runshipRumble'); if (!runshipQuiet(st.helm)) runshipHintOnce(st, 'wave' + st.k, st.helm, 'Big wave! Ring the bell ' + runshipKey(st.helm, 'act') + ' as it hits the front'); }
    if (w.moving && w.crossT == null) { w.X -= P.waveV * dt; if (w.X <= sh.d) { w.crossT = G.time; w.X = sh.d; } }
    if (w.crossT != null) {
      w.X = sh.d - (G.time - w.crossT) * (sh.v + P.waveV);
      if (G.time - w.crossT >= P.waveLate && !w.done) {
        w.done = true;
        const met = w.rang != null && G.time - w.rang < 3;
        runshipWaveHit(st, met);
      }
    }
  }
  // the ship riding over a wave: bow up, then stern up
  if (sh.waveRun) {
    const wr = sh.waveRun;
    wr.t += dt;
    const u = wr.t / P.waveLen, A = wr.big ? 0.15 : 0.05;
    sh.rot = u < 1 ? -A * Math.sin(u * Math.PI * 2) * (1 - u * 0.4) : 0;
    sh.heave = u < 1 ? -Math.sin(u * Math.PI) * (wr.big ? 22 : 14) : 0;
    if (u >= 1) { sh.waveRun = null; sh.rot = 0; sh.heave = 0; }
  }
}
function runshipWaveHit(st, met) {
  const P = RUNSHIP, sh = st.ship;
  sh.waveRun = { t: P.waveLate, big: !met };
  const xf = runshipXf(st), bow = runshipToScreen(st, P.bowTip - 20, P.qdY - 40, xf);
  if (met) {
    st.stats.wavesMet++;
    runshipPop(st, 'Over the top!', C.gold, bow.x - 40, bow.y - 50);
    Sfx.play('runshipOver');
    return;
  }
  st.stats.whoas++; st.roomWhoa++;
  runshipPop(st, 'Whoa! Big wave!', '#ffffff', bow.x - 60, bow.y - 50);
  Sfx.play('runshipWhoosh');
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.35);
  rumble(0, 0.5, 0.6, 300); rumble(1, 0.5, 0.6, 300);
  sh.water = Math.min(100, sh.water + P.waveWater);
  for (let i = 0; i < 26; i++) runshipPart(st, bow.x - Math.random() * 120, bow.y + 30, -120 - Math.random() * 260, -80 - Math.random() * 260, 0.9, i % 2 ? '#ffffff' : '#bfefff', 3 + Math.random() * 4, 700);
  // coins on deck wash away
  for (const cn of st.coins) if (!cn.gone) { cn.wash = true; }
  // a deckhand who isn't holding on goes overboard
  const db = st.body[st.deck];
  if (db.mode !== 'splash') {
    if (runshipHolding(st, db)) { const sc = runshipToScreen(st, db.x, db.y - 40, xf); runshipPop(st, 'Held on!', '#c8ffd0', sc.x, sc.y - 20); }
    else runshipOverboard(st, db);
  }
  if (st.roomWhoa >= P.bellHelp && !st.bellGold && runshipBoth(st)) runshipGold(st, 'bell');
  if (!runshipQuiet(st.helm)) runshipHint(st, st.helm, 'Ring the bell ' + runshipKey(st.helm, 'act') + ' just as the wave hits!');
}
// holding on: climbing, in the crow's nest, holding ▼ on deck, or busy at a job
function runshipHolding(st, b) {
  const p = G.players[b.id];
  return b.mode === 'climb' || b.mode === 'nest' || (b.ground && p.input.down) || G.time - b.workT < RUNSHIP.hold || b.mode === 'helm';
}
function runshipOverboard(st, b) {
  const P = RUNSHIP;
  st.stats.splashes[b.id]++;
  const from = runshipToScreen(st, b.x, b.y);
  b.mode = 'splash'; b.splash = { t: 0, sx: from.x, sy: from.y, lx: b.x }; b.vx = 0; b.vy = 0;
  Sfx.play('runshipSplash');
  runshipPop(st, 'Splash!', '#ffffff', from.x, from.y - 40);
}
// things that happen on board when the bow passes their spot
function runshipEvents(st) {
  const sh = st.ship, ev = st.c.events;
  while (st.evI < ev.length && ev[st.evI].X <= sh.d) {
    const e = ev[st.evI++];
    if (e.k === 'leak') runshipLeak(st, false);
    else if (e.k === 'wind') {
      sh.wind = -sh.wind; sh.sail = sh.sail === 'down' ? 'down' : 'luff'; sh.luffT = 0;
      Sfx.play('runshipWind');
      const sc = runshipToScreen(st, RUNSHIP.mastX, 40);
      runshipPop(st, 'The wind changed!', '#e8fbff', sc.x + 60, sc.y);
    } else if (e.k === 'tangle') {
      st.gull = { t: 0, y: e.y };
      Sfx.play('runshipSquawk');
    } else if (e.k === 'sign') st.sign = { text: e.text, t: 0, life: 6 };
  }
}

/* ---------- the deckhand (and, at the anchor, both): run, jump, climb, jobs ---------- */
function runshipGroundAt(x, hw) {
  const P = RUNSHIP;
  // the highest deck under the body (a box hw px each side of x)
  let y = P.deckY;
  if (x - hw < P.qdX) y = Math.min(y, P.qdY);
  if (x + hw > P.fcX) y = Math.min(y, P.fcY);
  return y;
}
function runshipDeckhand(st, b, p, dt, jobs) {
  const P = RUNSHIP, inp = p.input, prev = st.prevIn[b.id] || {};
  const hw = PW / 2 - 1;
  const jumpPress = p.pendingJump; p.pendingJump = false;
  const actPress = p.pendingAct; p.pendingAct = false;
  const upHeld = inp.jump || inp.up, downHeld = inp.down;
  const mv = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  st.prevIn[b.id] = Object.assign({}, inp);
  if (b.hop) { runshipHopStep(st, b, dt); return; }
  if (b.mode === 'splash') { runshipSplashStep(st, b, dt); return; }
  if (b.sq) b.sq = approach(b.sq, 0, dt * 3);
  if (b.hammer > 0) b.hammer = Math.max(0, b.hammer - dt);
  const onRat = Math.abs(b.x - P.mastX) < (P.ratX1 - P.ratX0) / 2 && b.y > P.nestY + 2 && b.y <= P.deckY + 1;
  /* climbing the rope ladder */
  if (b.mode === 'climb') {
    let cy = 0;
    if (upHeld) cy = -1; else if (downHeld) cy = 1;
    if (jumpPress && mv) { b.mode = 'air'; b.vx = mv * 170; b.vy = -380; b.jumping = true; b.face = mv; Sfx.play('jump', b.id); return; }
    b.x += mv * P.climbSide * dt;
    if (mv) b.face = mv;
    b.y += cy * P.climb * dt;
    if (b.x < P.ratX0 || b.x > P.ratX1) { b.mode = 'air'; b.vx = mv * 120; b.vy = 0; }
    if (b.y <= P.nestY + 0.5) { b.y = P.nestY; b.mode = 'nest'; b.x = clamp(b.x, P.nestX0, P.nestX1); Sfx.play('runshipStep'); }
    if (b.y >= P.deckY) { b.y = P.deckY; b.mode = 'walk'; b.ground = true; }
    b.climbA = (b.climbA || 0) + Math.abs(cy) * dt * 9;
    if (jobs) runshipJobs(st, b, p, dt, actPress);
    return;
  }
  /* standing in the crow's nest */
  if (b.mode === 'nest') {
    b.x = clamp(b.x + mv * 70 * dt, P.nestX0, P.nestX1);
    if (mv) b.face = mv;
    if (downHeld) { b.mode = 'climb'; b.y = P.nestY + 3; }
    if (jumpPress) b.nestHop = 0.25;
    if (b.nestHop > 0) b.nestHop -= dt;
    if (jobs) runshipJobs(st, b, p, dt, actPress);
    return;
  }
  /* walking and jumping on deck */
  if (onRat && b.mode !== 'helm' && (jumpPress || inp.up || (b.mode === 'air' && upHeld))) {
    // grab the rope ladder: a press of ▲ there, or ▲ held while jumping into it
    b.mode = 'climb'; b.vx = 0; b.vy = 0; b.jumping = false; b.jumpBuf = 0; b.y = Math.min(b.y, P.deckY - 1); return;
  }
  const wasGround = b.ground;
  if (mv) { b.vx = approach(b.vx, mv * P.run, (b.ground ? P.accG : P.accA) * dt); b.face = mv; }
  else b.vx = approach(b.vx, 0, (b.ground ? P.fric : P.accA * 0.4) * dt);
  b.coyote = b.ground ? 0.08 : b.coyote - dt;
  if (jumpPress) b.jumpBuf = 0.12; else b.jumpBuf -= dt;
  if (b.jumpBuf > 0 && b.coyote > 0 && !(onRat && upHeld)) { b.vy = -P.jumpV; b.jumping = true; b.ground = false; b.coyote = 0; b.jumpBuf = 0; b.mode = 'air'; Sfx.play('jump', b.id); }
  if (b.jumping && !inp.jump && !inp.up && b.vy < 0) { b.vy *= P.cut; b.jumping = false; }
  if (b.vy >= 0) b.jumping = false;
  b.vy = Math.min(b.vy + P.g * dt, 900);
  // sideways, with the raised decks as walls
  let nx = b.x + b.vx * dt;
  nx = clamp(nx, P.sternX + hw, P.bowX - hw);
  const feet = b.y;
  if (nx - hw < P.qdX && b.x - hw >= P.qdX - 0.01 && feet > P.qdY + 0.5) { nx = P.qdX + hw; b.vx = 0; }
  if (nx + hw > P.fcX && b.x + hw <= P.fcX + 0.01 && feet > P.fcY + 0.5) { nx = P.fcX - hw; b.vx = 0; }
  b.x = nx;
  // up and down
  const gy = runshipGroundAt(b.x, hw);
  b.y += b.vy * dt;
  if (b.y >= gy && b.vy >= 0) {
    if (!wasGround && b.vy > 300) { b.sq = 0.5; Sfx.play('land'); }
    b.y = gy; b.vy = 0; b.ground = true; if (b.mode === 'air') b.mode = 'walk';
  } else b.ground = b.y >= gy - 0.5;
  if (!b.ground && b.mode === 'walk') b.mode = 'air';
  if (jobs) runshipJobs(st, b, p, dt, actPress);
  // coins: walk over them
  for (const cn of st.coins) {
    if (!cn.landed || cn.gone) continue;
    if (Math.abs(cn.x - b.x) < 18 && Math.abs(cn.y - 6 - (b.y - 13)) < 22) runshipGrab(st, cn, b.id);
  }
}
function runshipGrab(st, cn, id) {
  cn.gone = true; st.stats.coins++; st.stats.coinsBy[id]++;
  Sfx.play('runshipCoin', id);
  const sc = runshipToScreen(st, cn.x, cn.y - 20);
  runshipPop(st, '+1', C.gold, sc.x, sc.y - 10, 15);
}
// the deckhand's jobs: patch, pump, haul, untangle (the action)
function runshipJobs(st, b, p, dt, actPress) {
  const P = RUNSHIP, sh = st.ship, held = p.input.act;
  b.work = null;
  if (b.mode === 'climb') {
    const tg = st.tangle;
    if (tg && Math.abs(b.y - 13 - tg.y) < 30 && held) {
      b.work = 'untangle'; b.workT = G.time;
      tg.fix += dt / (st.knifeGold ? P.knifeT : P.untangleT);
      if (Math.random() < dt * 8) Sfx.play('runshipTug', b.id);
      if (tg.fix >= 1) runshipUntangle(st, b.id);
    }
    return;
  }
  if (b.mode === 'nest' || !b.ground) return;
  // a leak under your feet: hold to hammer a plank over it
  const lk = st.leaks.find(l => Math.abs(P.leakSlots[l.slot].x - b.x) < 20 && Math.abs(P.leakSlots[l.slot].y - b.y) < 2);
  if (lk && held) {
    b.work = 'fix'; b.workT = G.time;
    lk.fix += dt / (st.hammerGold ? P.fixGold : P.fixT);
    b.hammer = Math.max(b.hammer, 0.01);
    lk.tap = (lk.tap || 0) + dt;
    if (lk.tap > 0.16) { lk.tap = 0; Sfx.play('runshipTap', b.id); b.hammer = 0.16; }
    if (lk.fix >= 1) {
      st.leaks.splice(st.leaks.indexOf(lk), 1);
      st.stats.fixed[b.id]++;
      const sc = runshipToScreen(st, P.leakSlots[lk.slot].x, P.leakSlots[lk.slot].y - 30);
      runshipPop(st, 'Patched!', '#c8ffd0', sc.x, sc.y - 16); Sfx.play('runshipFixed', b.id);
    }
    return;
  }
  if (lk) lk.fix = Math.max(0, lk.fix - dt * 0.2);
  // the pump: each press pumps a splash of water over the side
  if (Math.abs(b.x - P.pumpX) < 22 && b.y === P.deckY) {
    if (held) b.workT = G.time;
    b.work = held ? 'pump' : null;
    if (actPress && G.time - (st.pumpAt || -9) > P.pumpCd) {
      st.pumpAt = G.time; st.pumpA = 1;
      const amt = P.pumpAmt * (st.hammerGold ? P.pumpGold : 1);
      if (sh.water > 0) { sh.water = Math.max(0, sh.water - amt); st.stats.pumps[b.id]++; }
      Sfx.play('runshipPump', b.id);
      const sc = runshipToScreen(st, P.pumpX - 6, P.wl - 4);
      if (sh.water > 0 || amt) for (let i = 0; i < 4; i++) runshipPart(st, sc.x, sc.y, -40 - Math.random() * 60, -60 - Math.random() * 80, 0.6, '#9fe3ff', 3, 500);
    }
    return;
  }
  // a cleat: haul the flapping rope when the wind changed
  for (let side = 0; side < 2; side++) {
    if (Math.abs(b.x - P.cleats[side]) >= 24 || b.y !== P.deckY) continue;
    const need = runshipCleatWanted(st);
    if (actPress) {
      if (need === side) runshipTrim(st, b.id);
      else {
        const sc = runshipToScreen(st, P.cleats[side], P.deckY - 40);
        runshipPop(st, sh.sail === 'luff' ? 'Other rope!' : 'Sail is fine!', '#ffe7a8', sc.x, sc.y - 10, 14);
        Sfx.play('runshipCreak');
      }
    }
    if (held) b.workT = G.time;
    return;
  }
}
// which cleat (0 stern side, 1 bow side) has the flapping rope, or -1
function runshipCleatWanted(st) {
  const sh = st.ship;
  if (sh.sail !== 'luff') return -1;
  return sh.wind > 0 ? 1 : 0;
}
function runshipTrim(st, id) {
  const sh = st.ship;
  sh.trim = sh.wind; sh.sail = 'full'; st.stats.trims[id]++;
  Sfx.play('runshipHaul', id);
  const sc = runshipToScreen(st, RUNSHIP.mastX, 150);
  runshipPop(st, 'Whoosh! Full sail!', '#ffffff', sc.x, sc.y);
}
function runshipUntangle(st, id) {
  const sh = st.ship, tg = st.tangle;
  st.tangle = null; st.stats.untangles[id]++;
  sh.sail = sh.trim === sh.wind ? 'full' : 'luff';
  if (st.gull) st.gull.free = 0;
  Sfx.play('runshipFixed', id); Sfx.play('runshipSquawk');
  const sc = runshipToScreen(st, RUNSHIP.mastX, tg.y);
  runshipPop(st, 'Untangled! Sail up!', '#c8ffd0', sc.x + 40, sc.y - 10);
}
// overboard: down into the sea, then Dot the dolphin flips you back onto the deck
function runshipSplashStep(st, b, dt) {
  const P = RUNSHIP, sp = b.splash;
  sp.t += dt;
  if (sp.t > 0.55 && !sp.plop) { sp.plop = true; const xf = runshipXf(st); for (let i = 0; i < 16; i++) runshipPart(st, sp.sx + 20, xf.y + 70, (Math.random() - 0.5) * 240, -120 - Math.random() * 220, 0.8, i % 2 ? '#ffffff' : '#bfefff', 3 + Math.random() * 3, 600); Sfx.play('runshipPlop'); }
  if (sp.t > 1.0 && !st.dolphin) { st.dolphin = { t: 0, x: sp.sx + 40 }; Sfx.play('runshipDolphin'); }
  if (sp.t >= P.splashT) {
    b.mode = 'air'; b.x = 360; b.y = P.deckY - 120; b.vx = 0; b.vy = 100; b.splash = null; b.ground = false;
    runshipPop(st, 'Thanks, Dot!', '#bfefff', runshipToScreen(st, 360, 160).x, runshipToScreen(st, 360, 160).y);
  }
}
// a hop to a new spot on the ship (the swap)
function runshipHopStep(st, b, dt) {
  const h = b.hop;
  h.t += dt;
  const u = runshipSmooth(h.t / h.d);
  b.x = runshipLerp(h.x0, h.x1, u); b.y = runshipLerp(h.y0, h.y1, u) - Math.sin(Math.PI * clamp(h.t / h.d, 0, 1)) * 70;
  if (h.t >= h.d) { b.x = h.x1; b.y = h.y1; b.hop = null; b.mode = h.mode; b.ground = true; b.sq = 0.4; }
}

/* ---------- the buoy (swap jobs), the anchor and the party ---------- */
function runshipStartSwap(st) {
  const P = RUNSHIP;
  st.state = 'swap'; st.stateT = 0;
  st.stats.roomT[st.k] = G.time - st.segStart;
  const hb = st.body[st.helm], db = st.body[st.deck];
  db.mode = db.mode === 'splash' ? 'walk' : db.mode; db.splash = null;
  hb.hop = { t: -0.6, d: 0.9, x0: hb.x, y0: hb.y, x1: 360, y1: P.deckY, mode: 'walk' };
  db.hop = { t: -0.9, d: 1.0, x0: db.x, y0: db.y, x1: P.helmX, y1: P.qdY, mode: 'helm' };
  st.leaks = []; st.tangle = null;
  const sc = runshipToScreen(st, P.mastX, 120);
  runshipPop(st, 'Buoy! Swap jobs!', C.gold, sc.x + 120, sc.y, 26);
  Sfx.play('runshipSwap'); rumble(0, 0.1, 0.4, 120); rumble(1, 0.1, 0.4, 120);
}
function runshipSwapStep(st, dt) {
  const P = RUNSHIP, sh = st.ship;
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
  sh.v = approach(sh.v, st.cruise * 0.6, 60 * dt); sh.d += sh.v * dt;
  sh.water = Math.max(0, sh.water - dt * 40);
  sh.laneF = approach(sh.laneF, 1, dt); sh.lane = 1;
  for (const b of st.body) if (b.hop && b.hop.t < 0) b.hop.t += dt; else if (b.hop) runshipHopStep(st, b, dt);
  runshipWaves(st, dt);
  if (st.stateT >= P.swapT) {
    const L = G.level;
    if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return true; }
    runshipClear(st); return true;
  }
  return false;
}
function runshipStartAnchor(st) {
  const P = RUNSHIP;
  st.state = 'anchor'; st.stateT = 0; st.anchorK = 0;
  st.stats.roomT[st.k] = G.time - st.segStart;
  st.leaks = []; st.tangle = null;
  const hb = st.body[st.helm]; hb.mode = 'walk';
  st.sign = { text: 'Treasure Cove! Both: run to the anchor and hold {A}!', t: 0, life: 60, anchor: true };
  Sfx.play('runshipLand');
  runshipActLabels(st);
}
function runshipAnchorStep(st, dt) {
  const P = RUNSHIP, sh = st.ship;
  sh.v = approach(sh.v, 0, 60 * dt); sh.d += sh.v * dt;
  sh.water = Math.max(0, sh.water - dt * 20);
  sh.laneF = approach(sh.laneF, 1, dt * 0.8); sh.lane = 1;
  if (st.state === 'party') {
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    const pt = st.party; pt.t += dt;
    for (const b of st.body) { b.y = runshipGroundAt(b.x, 10) - Math.abs(Math.sin(pt.t * 7 + b.id * 1.3)) * 16; b.mode = 'walk'; b.ground = true; }
    if (pt.t > 0.8 && !pt.conf) { pt.conf = true; for (let i = 0; i < 70; i++) { const sc = runshipToScreen(st, P.anchorX, 120); confetti(sc.x, sc.y); } Sfx.play('runshipParty'); }
    if (pt.t >= P.partyT && !pt.cleared) { pt.cleared = true; runshipClear(st); return true; }
    return false;
  }
  for (const id of [0, 1]) runshipDeckhand(st, st.body[id], G.players[id], dt, false);
  // both at the anchor holding the action
  const at = id => { const b = st.body[id]; return b.ground && b.x > P.anchorX0 && b.x < P.anchorX1 && b.mode === 'walk' && G.players[id].input.act; };
  const both = at(0) && at(1);
  st.anchorAt = [at(0), at(1)];
  if (both) st.anchorK = Math.min(1, st.anchorK + dt / P.anchorT); else st.anchorK = Math.max(0, st.anchorK - dt * 0.5);
  if (both && Math.random() < dt * 10) Sfx.play('runshipChain');
  if (st.anchorK >= 1) {
    st.state = 'party'; st.party = { t: 0 }; st.sign = null;
    Sfx.play('runshipAnchor');
    const sc = runshipToScreen(st, P.bowTip, P.wl);
    for (let i = 0; i < 24; i++) runshipPart(st, sc.x, sc.y + 10, (Math.random() - 0.5) * 300, -150 - Math.random() * 250, 0.9, i % 2 ? '#ffffff' : '#bfefff', 3 + Math.random() * 4, 600);
    runshipPop(st, 'SPLOOSH! Anchor down!', C.gold, sc.x - 60, sc.y - 150, 26);
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.25);
  }
  return false;
}
function runshipClear(st) {
  const sc = runshipToScreen(st, RUNSHIP.mastX, 120);
  G.level.goal = { x: sc.x, y: sc.y };
  levelClear();
}

/* ---------- gold help, hints and messages ---------- */
const RUNSHIP_GOLD = {
  rudder: ['rudderGold', 'Gold rudder! Quicker steering, and a gold arrow shows the safe lane'],
  bell: ['bellGold', 'Gold bell! Ring it any time near the wave'],
  hammer: ['hammerGold', 'Gold hammer! Quicker patches and bigger pumps'],
  knife: ['knifeGold', 'Gold knife! One quick tug untangles the ropes'],
  glass: ['glassGold', 'Gold spyglass! The sea chart shows the rocks in the fog'],
};
function runshipGold(st, k) {
  const g = RUNSHIP_GOLD[k];
  if (!g || st[g[0]]) return;
  st[g[0]] = true; st.stats.helps++;
  runshipMsg(st, g[1], C.gold, 4.2);
  runshipPolly(st, 'Squawk! ' + g[1].split('!')[0] + '!');
  Sfx.play('runshipHelp');
}
function runshipPolly(st, text) { st.polly.say = { text, t: 0 }; st.polly.t = 0; Sfx.play('runshipSquawk'); }
function runshipHint(st, id, text, life) { if (runshipQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || RUNSHIP.hintLife }; }
function runshipHintOnce(st, key, id, text) { if (st.hinted[key]) return; st.hinted[key] = true; runshipHint(st, id, text); }
function runshipMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function runshipPop(st, s, col, x, y, size) {
  for (let k = 0; k < 4; k++) { const o = st.pops.find(q => q.t < 0.7 && Math.abs(q.x - x) < 120 && Math.abs(q.y - y) < 24); if (!o) break; y = o.y - 26; }
  st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 12) st.pops.shift();
}
function runshipPart(st, x, y, vx, vy, life, col, size, grav) {
  if (st.parts.length > 300) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0 });
}
// gentle lessons when they first matter (once each stretch)
function runshipNudges(st) {
  const sh = st.ship, D = st.deck;
  if (sh.water > 40) runshipHintOnce(st, 'water' + st.k, D, 'Water! Pump at the pump ' + runshipKey(D, 'act'));
  if (sh.sail === 'luff' && sh.luffT > 1) runshipHintOnce(st, 'luff' + st.k, D, 'Flapping sail! Pull the glowing rope ' + runshipKey(D, 'act'));
  if (sh.sail === 'down' && st.tangle && st.tangle.t > 1) runshipHintOnce(st, 'tangle' + st.k, D, 'Tangled! Climb ' + runshipKey(D, 'up') + ', hold ' + runshipKey(D, 'act'));
}

/* ---------- what each job needs right now (the prompts, the panels and the computer read this) ---------- */
// The helm's best lane: the lane with the least trouble in sight ahead (what the screen and the sea chart show).
function runshipNeeds(st) {
  if (st.needT === G.tickN && st.need) return st.need;
  const P = RUNSHIP, sh = st.ship, out = { lane: sh.lane, ease: false, wave: null, fogBlind: false, threat: null, job: null };
  st.need = out; st.needT = G.tickN;
  if (st.state !== 'sail') return out;
  const look = 760, cost = [0, 0, 0], v = Math.max(sh.v, st.cruise * 0.6);
  let blind = false;
  for (const it of st.c.items) {
    if (it.passed || it.k === 'wave') continue;
    const dd = it.X - sh.d;
    if (dd > look) break;
    if (dd < -2) continue;
    if (!runshipSeen(st, it)) { blind = true; if (!st.glassGold) continue; }
    const w = 1 + (look - dd) / 200;
    if (it.k === 'rock') cost[it.lane] += 10 * w;
    else if (it.k === 'reef') cost[it.lane] += 14 * w;
    else if (it.k === 'gold' && dd > 60) cost[it.lane] -= 3;
  }
  // a lane change takes time: switching two lanes passes the middle one
  const mid = st.c.items.find(it => !it.passed && (it.k === 'rock' || it.k === 'reef') && it.lane === 1 && it.X - sh.d >= -2 && it.X - sh.d < v * 0.9 && (runshipSeen(st, it) || st.glassGold));
  let best = sh.lane, bc = 1e9;
  for (let l = 0; l < 3; l++) {
    let c = cost[l] + Math.abs(l - sh.lane) * 1.2 + Math.abs(l - sh.laneF) * 0.6;
    if (mid && Math.abs(l - Math.round(sh.laneF)) === 2) c += 12;
    if (c < bc - 0.01) { bc = c; best = l; }
  }
  out.lane = best;
  // fog ahead or around and nobody in the crow's nest: ease off and call the lookout
  const fogNear = st.c.fogs.find(f => sh.d < f.X1 && f.X0 - sh.d < 650);
  out.fog = fogNear || null;
  out.fogBlind = blind || (!!fogNear && !runshipLookout(st) && fogNear.X0 - sh.d < 300);
  out.ease = out.fogBlind && !st.glassGold;
  const thr = st.c.items.find(it => !it.passed && (it.k === 'rock' || it.k === 'reef') && it.X - sh.d >= -2 && it.X - sh.d < 340 && runshipInLane(sh, it.lane) && (runshipSeen(st, it) || st.glassGold));
  out.threat = thr || null;
  // the next wave: seconds until it hits the bow
  for (const w of st.c.items) {
    if (w.k !== 'wave' || w.done || !w.moving) continue;
    out.wave = { w, tt: w.crossT != null ? -(G.time - w.crossT) : (w.X - sh.d) / (sh.v + P.waveV), rang: w.rang != null };
    break;
  }
  out.job = runshipDeckJob(st);
  return out;
}
// the deckhand's most useful job right now: { k, x, y, surf } (y: a spot up the ladder, for the tangle)
function runshipDeckJob(st) {
  const P = RUNSHIP, sh = st.ship, b = st.body[st.deck];
  const nd = st.need || {};
  if (nd.wave && !nd.wave.rang && nd.wave.tt < 0.9 && nd.wave.tt > -0.2 && b.mode !== 'climb' && b.mode !== 'nest') return { k: 'hold' };
  if (st.tangle) return { k: 'tangle', x: P.mastX, y: st.tangle.y };
  if (st.gull && !st.gull.done) return { k: 'tangle', x: P.mastX, y: st.gull.y };
  const fog = st.c.fogs.find(f => sh.d < f.X1 - 40 && f.X0 - sh.d < 900);
  if (fog && sh.water < 80) return { k: 'nest', x: P.mastX, y: P.nestY };
  const cw = runshipCleatWanted(st);
  if (cw >= 0) return { k: 'trim', x: P.cleats[cw], y: P.deckY };
  if (st.leaks.length) {
    let bl = null, bd = 1e9;
    for (const l of st.leaks) { const s = P.leakSlots[l.slot], d = Math.abs(s.x - b.x) + (s.y !== P.deckY ? 40 : 0); if (d < bd) { bd = d; bl = l; } }
    const s = P.leakSlots[bl.slot];
    return { k: 'leak', x: s.x, y: s.y, leak: bl };
  }
  if (sh.water > 8) return { k: 'pump', x: P.pumpX, y: P.deckY };
  const cn = st.coins.filter(q => q.landed && !q.gone).sort((a, c) => Math.abs(a.x - b.x) - Math.abs(c.x - b.x))[0];
  if (cn) return { k: 'coin', x: cn.x, y: cn.y };
  return { k: 'idle', x: 330, y: P.deckY };
}

// the touch buttons and the top-bar legend name each player's own action this stretch: bell or fix (anchor at the end)
let runshipLabelEls = null;
function runshipActLabels(st) {
  try {
    if (!runshipLabelEls || !runshipLabelEls.every(o => document.contains(o.el))) runshipLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const ds = box && (box.dataset.p !== undefined ? box.dataset.p : box.dataset.legp);
      const id = ds !== undefined && ds !== null ? +ds : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    const fin = st.state === 'anchor' || st.state === 'party';
    let changed = false;
    for (const o of runshipLabelEls) {
      const want = fin ? 'anchor' : o.id < 0 ? 'bell/fix' : o.id === st.helm ? 'bell' : 'fix';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}
function runshipFx(st, dt) {
  const P = RUNSHIP, sh = st.ship;
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt;
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.3);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  if (st.sign && (st.sign.t += dt) >= st.sign.life) st.sign = null;
  st.polly.t += dt;
  if (st.polly.say && (st.polly.say.t += dt) > 3.2) st.polly.say = null;
  if (st.pumpA > 0) st.pumpA = Math.max(0, st.pumpA - dt * 5);
  for (const l of st.leaks) l.t += dt;
  // coins fly onto the deck, sit a while, then roll away
  for (const cn of st.coins) {
    cn.t += dt; cn.spin += dt * 8;
    if (cn.wash) { cn.x -= 260 * dt; cn.y += (cn.vy = (cn.vy || 0) + 900 * dt) * dt * 0.2; if (cn.x < 0) cn.gone = true; continue; }
    if (!cn.landed) {
      cn.vy += 1400 * dt; cn.x += cn.vx * dt; cn.y += cn.vy * dt;
      if (cn.vy > 0 && cn.y >= cn.surf - 7) { cn.x = clamp(cn.x, RUNSHIP.qdX + 12, RUNSHIP.bowX - 12); cn.surf = runshipGroundAt(cn.x, 0); cn.y = cn.surf - 7; cn.landed = true; cn.t = 0; Sfx.play('runshipClink'); }
    } else if (cn.t > 9) cn.gone = true;
  }
  st.coins = st.coins.filter(cn => !cn.gone);
  // the seagull: swoops in, tangles the ropes (the sail drops), then flies off once untangled
  if (st.gull) {
    const g = st.gull;
    g.t += dt;
    if (!g.done && g.t > 1.1 && !st.tangle && g.free == null) {
      g.done = true; st.tangle = { y: g.y, t: 0, tryT: 0, fix: 0 }; sh.sail = 'down';
      Sfx.play('runshipTangle');
      const sc = runshipToScreen(st, P.mastX, g.y);
      runshipPop(st, 'Squawk! Tangled!', '#ffffff', sc.x + 70, sc.y - 10);
    }
    if (g.free != null) { g.free += dt; if (g.free > 2.5) st.gull = null; }
  }
  if (st.dolphin) { st.dolphin.t += dt; if (st.dolphin.t > 2.2) st.dolphin = null; }
  runshipActLabels(st);
}
// copy where each player is drawn into the engine players (screen px): name tags and bubbles read p.x / p.y
function runshipMirror(st) {
  const xf = runshipXf(st);
  for (const p of G.players) {
    const b = st.body[p.id];
    if (!b) continue;
    let sc;
    if (b.splash) sc = runshipSplashPos(st, b, xf);
    else sc = runshipToScreen(st, b.x, b.y - PH / 2, xf);
    p.x = sc.x - PW / 2; p.y = sc.y - PH / 2;
    p.alive = true; p.grounded = true; p.stompSafe = 0; p.vy = 0; p.vx = 0; p.stun = 0; p.face = b.face;
  }
}
function runshipSplashPos(st, b, xf) {
  const sp = b.splash, u = clamp(sp.t / 0.55, 0, 1), base = (xf || runshipXf(st)).y + 70;
  if (sp.t < 0.55) return { x: sp.sx + u * 30, y: runshipLerp(sp.sy - PH / 2, base, u * u) - Math.sin(u * Math.PI) * 50 };
  if (sp.t < 1.2) return { x: sp.sx + 30, y: base + 6 + Math.sin(sp.t * 8) * 3 };
  const k = clamp((sp.t - 1.2) / (RUNSHIP.splashT - 1.2), 0, 1), to = runshipToScreen(st, 360, RUNSHIP.deckY - 120, xf);
  return { x: runshipLerp(sp.sx + 30, to.x, k), y: runshipLerp(base, to.y, k) - Math.sin(k * Math.PI) * 120 };
}

MODES.runship = {
  RUNSHIP,
  needs: runshipNeeds, xf: runshipXf, toScreen: runshipToScreen, groundAt: runshipGroundAt, cleatWanted: runshipCleatWanted,
  setup(st, L) {
    let coinsAll = 0;
    const rooms = (LEVELS[G.levelIndex] && LEVELS[G.levelIndex].rooms) || [L.def];
    for (const r of rooms) for (const tk of r.course || []) if (/^c[0-2]$/.test(String(tk))) coinsAll += 4;
    st.stats = { bonks: 0, whoas: 0, wavesMet: 0, wavesAll: 0, coins: 0, coinsAll, coinsBy: [0, 0], fixed: [0, 0], pumps: [0, 0], trims: [0, 0], untangles: [0, 0],
      splashes: [0, 0], helps: 0, roomT: [], roomTitles: [] };
    for (const r of rooms) for (const tk of r.course || []) if (tk === 'V') st.stats.wavesAll++;
    runshipRoom(st, L, 0);
  },
  room(k, L) { runshipRoom(G.mst, L, k); },
  step(dt) { runshipStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then and drawn on the ship instead
  draw() {
    const st = G.mst;
    if (!st.ship) return;
    runshipDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
  },
  hud() { const st = G.mst; if (st.ship) runshipHud(st); },
  stats() {
    const s = G.mst.stats;
    if (!s) return [];
    const out = [
      { label: 'Bonks', value: s.bonks },
      { label: 'Leaks patched', values: s.fixed.slice() },
      { label: 'Coins', value: s.coins + ' of ' + s.coinsAll },
      { label: 'Medal', value: runshipMedal(G.time, s) },
    ];
    let best = -1;
    s.roomT.forEach((t, k) => { if (t == null) return; if (best < 0 || t < s.roomT[best]) best = k; });
    const words = s.bonks === 0 ? 'Not a single bonk: smooth sailing!' : s.bonks <= 4 ? 'Only a few bonks on the way!' : 'A bumpy trip, but you made it!';
    const spl = s.splashes[0] + s.splashes[1];
    out.push(words + ' Waves met bow-first: ' + s.wavesMet + ' of ' + s.wavesAll + '.' + (spl ? ' Dot the dolphin saved ' + (s.splashes[0] ? 'Pip ' + s.splashes[0] + (s.splashes[1] ? ', ' : '') : '') + (s.splashes[1] ? 'Bo ' + s.splashes[1] : '') + '.' : '') + (best >= 0 ? ' Quickest stretch: ' + s.roomTitles[best] + '.' : ''));
    if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
    return out;
  },
};
// the medal: Gold by 3:40 with at most 4 bonks, Silver by 5:30 with at most 12
const RUNSHIP_MEDAL = { gold: 240, silver: 330, goldBonks: 4, silverBonks: 12 };
function runshipMedal(t, s) {
  const M = RUNSHIP_MEDAL;
  return t <= M.gold && s.bonks <= M.goldBonks ? 'Gold' : t <= M.silver && s.bonks <= M.silverBonks ? 'Silver' : 'Bronze';
}

/* ---------- drawing ---------- */
function runshipDrawWorld(st) {
  const xf = runshipXf(st), lf = st.ship.laneF;
  runshipDrawSky(st);
  runshipDrawSea(st);
  runshipDrawCove(st);
  // things on the sea further away than the ship, then the ship, then nearer things
  runshipDrawItems(st, l => l < lf - 0.05 || Math.abs(l - lf) <= 0.05);
  runshipDrawWaves(st, -0.3, Math.min(2.4, lf + 0.3));
  runshipDrawBuoy(st);
  runshipDrawShip(st, xf);
  runshipDrawShipWater(st, xf);
  runshipDrawItems(st, l => l > lf + 0.05);
  if (lf + 0.3 < 2.4) runshipDrawWaves(st, lf + 0.3, 2.4, true);
  runshipDrawFog(st);
  runshipDrawDolphin(st, xf);
  if (st.pal.rain) runshipDrawRain(st);
  // particles and pops
  for (const q of st.parts) { ctx.globalAlpha = clamp(q.life / q.max, 0, 1); ctx.fillStyle = q.col; circle(q.x, q.y, q.size); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const q of st.pops) {
    const a = clamp(1.3 - q.t, 0, 1), sc = 0.7 + 0.3 * Math.min(1, q.t / 0.15);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(q.x, q.y - q.t * 30); ctx.scale(sc, sc);
    ctx.font = q.size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = q.size * 0.22; ctx.strokeStyle = 'rgba(28,26,54,0.85)'; ctx.strokeText(q.s, 0, 0);
    ctx.fillStyle = q.col; ctx.fillText(q.s, 0, 0);
    ctx.restore();
  }
}
const RUNSHIP_HORIZON = 300;
function runshipDrawSky(st) {
  const pal = st.pal, d = st.ship.d, t = G.clock;
  const g = ctx.createLinearGradient(0, 0, 0, RUNSHIP_HORIZON);
  g.addColorStop(0, pal.skyTop); g.addColorStop(1, pal.skyBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, RUNSHIP_HORIZON + 2);
  if (pal.sun) {
    ctx.fillStyle = C.sunGlow; circle(780, 92, 64); ctx.fill();
    ctx.fillStyle = C.sun; circle(780, 92, 38); ctx.fill();
  }
  // clouds drift by (the far ones slower)
  for (let i = 0; i < 7; i++) {
    const span = W + 300, sp = 0.04 + (i % 3) * 0.03, x = ((i * 233 - d * sp - t * 6) % span + span) % span - 150, y = 40 + (i * 53) % 150;
    runshipCloud(x, y, 0.8 + (i % 3) * 0.35, pal.cloud);
  }
  if (pal.rain) { ctx.fillStyle = 'rgba(90,110,140,0.25)'; ctx.fillRect(0, 0, W, RUNSHIP_HORIZON); }
  // far islands with palm trees on the horizon (parallax)
  for (let i = 0; i < 6; i++) {
    const span = 1900, x = ((i * 347 + 120 - d * 0.06) % span + span) % span - 200, w = 90 + (hash(i, 7) % 120);
    runshipIsland(x, RUNSHIP_HORIZON + 2, w, 18 + (hash(i, 3) % 22), pal, 0.65, i);
  }
  // gulls
  ctx.strokeStyle = 'rgba(40,50,70,0.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const x = ((i * 310 + t * (22 + i * 6)) % (W + 120)) - 60, y = 110 + i * 34 + Math.sin(t * 1.3 + i) * 10, f = Math.sin(t * 6 + i * 2) * 4;
    ctx.beginPath(); ctx.moveTo(x - 9, y - f); ctx.quadraticCurveTo(x - 4, y - 5, x, y); ctx.quadraticCurveTo(x + 4, y - 5, x + 9, y - f); ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
function runshipCloud(x, y, s, col) {
  ctx.fillStyle = col;
  circle(x, y, 16 * s); ctx.fill(); circle(x + 20 * s, y - 9 * s, 21 * s); ctx.fill(); circle(x + 44 * s, y - 2 * s, 17 * s); ctx.fill();
  rr(x - 10 * s, y - 2 * s, 70 * s, 16 * s, 8 * s); ctx.fill();
}
function runshipIsland(x, y, w, h, pal, a, k) {
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = pal.sand; ctx.beginPath(); ctx.ellipse(x, y, w / 2 + 8, 7, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = pal.isle; ctx.beginPath(); ctx.ellipse(x, y - 2, w / 2, h, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = pal.isleDark; ctx.beginPath(); ctx.ellipse(x + w * 0.15, y - 2, w * 0.3, h * 0.7, 0, Math.PI, 0); ctx.fill();
  // a palm tree
  const px = x - w * 0.15, ph = h + 22;
  ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, y - h + 4); ctx.quadraticCurveTo(px + 6, y - ph + 10, px + 4, y - ph); ctx.stroke();
  ctx.fillStyle = pal.isleDark;
  for (let i = 0; i < 5; i++) { const a2 = -Math.PI / 2 + (i - 2) * 0.7; ctx.beginPath(); ctx.ellipse(px + 4 + Math.cos(a2) * 9, y - ph + Math.sin(a2) * 4 + 4, 11, 3.5, a2 + Math.PI / 2 * 0.2 + (i - 2) * 0.25, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function runshipDrawSea(st) {
  const pal = st.pal, d = st.ship.d, t = G.clock;
  const g = ctx.createLinearGradient(0, RUNSHIP_HORIZON, 0, H);
  g.addColorStop(0, pal.seaFar); g.addColorStop(0.35, pal.sea); g.addColorStop(1, pal.seaDeep);
  ctx.fillStyle = g; ctx.fillRect(0, RUNSHIP_HORIZON, W, H - RUNSHIP_HORIZON);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(0, RUNSHIP_HORIZON, W, 2);
  // wave rows: further up the screen they are smaller and slide by slower
  const storm = pal.rain ? 1.6 : 1;
  for (let r = 0; r < 12; r++) {
    const y = RUNSHIP_HORIZON + 8 + r * r * 1.75 + r * 6, s = 0.35 + r * 0.075, sp = 0.3 + r * 0.075;
    const step = 46 * s, off = ((d * sp + t * 10) % step + step) % step;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.18 + r * 0.025) + ')'; ctx.lineWidth = 1.2 + s * 1.4; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = -off; x < W + step; x += step) {
      const yy = y + Math.sin(x * 0.02 + r + t * 1.2) * 2 * s * storm;
      ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + step * 0.25, yy - 4 * s * storm, x + step * 0.5, yy);
    }
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // the three lanes: a faint lighter band along each lane's waterline
  for (let l = 0; l < 3; l++) {
    const y = RUNSHIP.laneY[l], s = RUNSHIP.laneS[l];
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(0, y - 4 * s, W, 8 * s);
  }
}
function runshipDrawItems(st, which) {
  const sh = st.ship, t = G.clock;
  for (const it of st.c.items) {
    if (it.k === 'wave' || !which(it.lane)) continue;
    if (it.got) continue;
    const dd = it.X - sh.d;
    if (dd < -700 || dd > 900) continue;
    const ln = runshipLaneAt(it.lane), x = runshipSX(st, it.X, it.lane), y = ln.y, s = ln.s;
    if (x < -120 || x > W + 120) continue;
    const hidden = it.fog && !runshipLookout(st) && dd > -40;
    ctx.save();
    if (hidden) ctx.globalAlpha = 0.08;
    if (it.k === 'rock') runshipRock(x, y, s, it.n, t, it.hit);
    else if (it.k === 'reef') runshipReef(x, y, s, it.n, t);
    else if (it.k === 'gold') runshipBarrel(x, y, s, t + it.n);
    ctx.restore();
    // a red "!" over trouble in the ship's own lane
    if (!hidden && !it.passed && (it.k === 'rock' || it.k === 'reef') && dd > 0 && dd < 520 && runshipInLane(sh, it.lane) && st.state === 'sail') {
      const a = 0.6 + 0.4 * Math.sin(t * 12);
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#ff5a5a'; circle(x, y - 66 * s, 11 * s); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = (16 * s) + 'px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x, y - 65 * s); ctx.restore();
    }
  }
}
function runshipRock(x, y, s, n, t, hit) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(0, 2, 40 + Math.sin(t * 3 + n) * 3, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7d7f8f'; ctx.beginPath(); ctx.moveTo(-30, 2); ctx.quadraticCurveTo(-34, -30, -10, -44); ctx.quadraticCurveTo(10, -54, 24, -34); ctx.quadraticCurveTo(36, -14, 30, 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#9a9cad'; ctx.beginPath(); ctx.moveTo(-20, -8); ctx.quadraticCurveTo(-22, -32, -6, -40); ctx.quadraticCurveTo(4, -42, 2, -26); ctx.quadraticCurveTo(0, -12, -20, -8); ctx.fill();
  ctx.strokeStyle = '#5a5c6c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-30, 2); ctx.quadraticCurveTo(-34, -30, -10, -44); ctx.quadraticCurveTo(10, -54, 24, -34); ctx.quadraticCurveTo(36, -14, 30, 2); ctx.stroke();
  // seaweed and a little crab on some rocks
  ctx.fillStyle = '#4fa86a'; ctx.beginPath(); ctx.ellipse(-22, -2, 6, 3, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(18, -4, 7, 3, 0.4, 0, Math.PI * 2); ctx.fill();
  if (n % 3 === 0) runshipCrab(6, -46, 0.55, t + n, hit);
  ctx.restore();
}
function runshipReef(x, y, s, n, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(10, 3, 92 + Math.sin(t * 2.4 + n) * 4, 9, 0, 0, Math.PI * 2); ctx.fill();
  // a sandbar with coral and rocks: wide, it blocks the whole lane
  ctx.fillStyle = '#f2d68c'; ctx.beginPath(); ctx.ellipse(10, 2, 80, 16, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#e0bd70'; ctx.beginPath(); ctx.ellipse(28, 2, 40, 8, 0, Math.PI, 0); ctx.fill();
  const corals = [[-46, '#ff7aa8'], [-14, '#ff9a5c'], [48, '#c58cff'], [70, '#ff7aa8']];
  for (const [cx, col] of corals) {
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, -6); ctx.lineTo(cx, -26); ctx.moveTo(cx, -16); ctx.lineTo(cx - 8, -26); ctx.moveTo(cx, -12); ctx.lineTo(cx + 9, -22); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  runshipRock(16, 0, 0.75, n + 1, t, false);
  ctx.restore();
}
function runshipBarrel(x, y, s, t) {
  const bob = Math.sin(t * 3) * 3;
  ctx.save(); ctx.translate(x, y + bob); ctx.scale(s, s); ctx.rotate(Math.sin(t * 2) * 0.12);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(0, 4 - bob, 26, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b77a3e'; rr(-16, -30, 32, 34, 9); ctx.fill();
  ctx.strokeStyle = '#7a4c22'; ctx.lineWidth = 2.5; rr(-16, -30, 32, 34, 9); ctx.stroke();
  ctx.fillStyle = '#8a8f9e'; ctx.fillRect(-16, -22, 32, 4); ctx.fillRect(-16, -6, 32, 4);
  // gold spilling out of the top
  for (const [cx, cy] of [[-7, -32], [3, -35], [10, -31], [-1, -29]]) { ctx.fillStyle = C.gold; circle(cx, cy, 5); ctx.fill(); ctx.strokeStyle = '#b9850f'; ctx.lineWidth = 1.2; circle(cx, cy, 5); ctx.stroke(); }
  ctx.fillStyle = '#fff'; circle(12 + Math.sin(t * 5) * 1, -40, 1.8 + Math.max(0, Math.sin(t * 4)) * 1.8); ctx.fill();
  ctx.restore();
}
function runshipCrab(x, y, s, t, scared) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const w = Math.sin(t * 5) * 0.3;
  ctx.fillStyle = '#ff6b4a';
  ctx.save(); ctx.rotate(-0.5 + w); ctx.beginPath(); ctx.ellipse(-16, -8, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.rotate(0.5 - w); ctx.beginPath(); ctx.ellipse(16, -8, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.ellipse(0, 0, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d24a2c'; ctx.lineWidth = 2; for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(k * 8, 6); ctx.lineTo(k * 14, 11); ctx.stroke(); }
  ctx.fillStyle = '#fff'; circle(-4, -10, 3); ctx.fill(); circle(4, -10, 3); ctx.fill();
  ctx.fillStyle = C.ink; circle(-4, -10, 1.5); ctx.fill(); circle(4, -10, 1.5); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); if (scared) ctx.arc(0, 3, 2.5, 0, Math.PI * 2); else ctx.arc(0, 1, 4, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
}
// big waves: a rolling swell that comes in from the right over every lane
function runshipDrawWaves(st, l0, l1, front) {
  const sh = st.ship, t = G.clock;
  for (const w of st.c.items) {
    if (w.k !== 'wave' || !w.moving) continue;
    const age = w.crossT != null ? G.time - w.crossT : -1;
    if (age > 1.8 || (front && age >= 0)) continue;
    const a = age < 0 ? 1 : clamp(1 - age / 1.8, 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    // the swell: a band from far to near, each depth at its own screen x
    ctx.fillStyle = 'rgba(30,150,190,0.55)';
    ctx.beginPath();
    for (let k = 0; k <= 10; k++) { const lf = runshipLerp(l0, l1, k / 10), ln = runshipLaneAt(lf), x = runshipSX(st, w.X, lf); ctx.lineTo(x - 70 * ln.s, ln.y + 6 * ln.s); }
    for (let k = 10; k >= 0; k--) { const lf = runshipLerp(l0, l1, k / 10), ln = runshipLaneAt(lf), x = runshipSX(st, w.X, lf); ctx.lineTo(x + 50 * ln.s, ln.y + 6 * ln.s); }
    ctx.fill();
    for (let k = 0; k <= 8; k++) {
      const lf = runshipLerp(l0, l1, k / 8), ln = runshipLaneAt(lf), x = runshipSX(st, w.X, lf), s = ln.s * 0.95;
      const yy = ln.y + 4 * s;
      // a curl of water with foam on top
      ctx.fillStyle = '#3fb4d6'; ctx.beginPath(); ctx.moveTo(x - 64 * s, yy); ctx.quadraticCurveTo(x - 30 * s, yy - 50 * s, x + 6 * s, yy - 52 * s); ctx.quadraticCurveTo(x + 30 * s, yy - 50 * s, x + 26 * s, yy - 30 * s); ctx.quadraticCurveTo(x + 14 * s, yy - 38 * s, x + 6 * s, yy - 30 * s); ctx.quadraticCurveTo(x + 20 * s, yy - 10 * s, x + 48 * s, yy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x + 4 * s, yy - 50 * s, 22 * s, 7 * s, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(x + 26 * s + Math.sin(t * 9 + k) * 2, yy - 40 * s, 4 * s); ctx.fill();
    }
    ctx.restore();
  }
}
function runshipDrawBuoy(st) {
  const e = st.c.end;
  if (!e || e.k !== 'buoy') return;
  const x = runshipSX(st, e.X + 60, 0.15), y = runshipLaneAt(0.15).y, t = G.clock, s = runshipLaneAt(0.15).s;
  if (x < -60 || x > W + 60) return;
  ctx.save(); ctx.translate(x, y + Math.sin(t * 2.5) * 3); ctx.scale(s, s); ctx.rotate(Math.sin(t * 1.7) * 0.08);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(0, 3, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff5a4a'; rr(-16, -26, 32, 28, 10); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-16, -16, 32, 8);
  ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, -78); ctx.stroke();
  ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(0, -78); ctx.lineTo(34 + Math.sin(t * 6) * 3, -70); ctx.lineTo(0, -60); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.ink; ctx.font = '13px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SWAP', 13, -69);
  ctx.restore();
}
// Treasure Cove: a beach island with palms, a chest and dancing crabs (the last stretch)
function runshipDrawCove(st) {
  const e = st.c.end;
  if (!e || e.k !== 'cove') return;
  const x = runshipSX(st, e.X + 420, 0), y = RUNSHIP.laneY[0] - 6, t = G.clock;
  if (x > W + 600) return;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#f7d98e'; ctx.beginPath(); ctx.ellipse(120, 4, 380, 46, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#62c47e'; ctx.beginPath(); ctx.ellipse(220, -30, 260, 110, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#3f9a5e'; ctx.beginPath(); ctx.ellipse(300, -30, 150, 80, 0, Math.PI, 0); ctx.fill();
  // palms
  for (const [px, ph] of [[-80, 120], [20, 150], [330, 190]]) {
    ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(px, -10); ctx.quadraticCurveTo(px + 16, -ph * 0.6, px + 8, -ph); ctx.stroke();
    ctx.fillStyle = '#3f9a5e';
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.62 + Math.sin(t * 1.5 + i) * 0.05; ctx.save(); ctx.translate(px + 8, -ph); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(26, 0, 30, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = '#7a5232'; circle(px + 4, -ph + 8, 5); ctx.fill(); circle(px + 13, -ph + 9, 5); ctx.fill();
  }
  // the treasure chest, open and shining
  ctx.save(); ctx.translate(140, -18);
  ctx.fillStyle = 'rgba(255,230,140,' + (0.35 + 0.15 * Math.sin(t * 4)) + ')'; circle(0, -14, 40); ctx.fill();
  ctx.fillStyle = '#8a4f22'; rr(-28, -22, 56, 30, 6); ctx.fill();
  ctx.fillStyle = C.gold; for (const [cx, cy] of [[-14, -24], [-2, -29], [10, -25], [18, -22], [4, -22]]) { circle(cx, cy, 6); ctx.fill(); }
  ctx.fillStyle = '#a3602c'; ctx.beginPath(); ctx.moveTo(-28, -22); ctx.lineTo(-30, -46); ctx.quadraticCurveTo(0, -60, 30, -46); ctx.lineTo(28, -22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.gold; ctx.fillRect(-28, -10, 56, 5); ctx.fillRect(-4, -18, 8, 12);
  ctx.restore();
  // crabs dancing on the beach
  for (let i = 0; i < 3; i++) runshipCrab(40 + i * 70, -4 + Math.abs(Math.sin(t * 5 + i)) * -6, 0.9, t + i, false);
  ctx.restore();
}
function runshipDrawFog(st) {
  const sh = st.ship, t = G.clock, look = runshipLookout(st);
  for (const f of st.c.fogs) {
    const x0 = runshipSX(st, f.X0, 1) - 60, x1 = runshipSX(st, f.X1, 1) + 60;
    if (x1 < -100 || x0 > W + 100) continue;
    const a = look ? 0.32 : 0.85;
    ctx.save();
    const g = ctx.createLinearGradient(Math.max(x0, -100), 0, Math.max(x0, -100) + 140, 0);
    g.addColorStop(0, 'rgba(236,242,248,0)'); g.addColorStop(1, 'rgba(236,242,248,' + a + ')');
    ctx.fillStyle = g;
    const xa = Math.max(-100, x0), xb = Math.min(W + 100, x1);
    ctx.fillRect(xa, RUNSHIP_HORIZON - 30, xb - xa, H - RUNSHIP_HORIZON + 30);
    // puffy fog clouds along the top and bottom edges
    ctx.fillStyle = 'rgba(244,248,252,' + (a * 0.9) + ')';
    for (let x = xa; x < xb; x += 60) { const k = Math.floor((x - x0) / 60); circle(x + 30, RUNSHIP_HORIZON - 26 + Math.sin(t + k) * 4, 34); ctx.fill(); }
    ctx.restore();
    // the spyglass view from the crow's nest
    if (look && sh.d > f.X0 - 900 && sh.d < f.X1) {
      const ns = runshipToScreen(st, RUNSHIP.mastX, RUNSHIP.nestY - 20);
      ctx.save(); ctx.globalAlpha = 0.18 + 0.05 * Math.sin(t * 3); ctx.fillStyle = '#fff6c8';
      ctx.beginPath(); ctx.moveTo(ns.x + 14, ns.y); ctx.lineTo(W, RUNSHIP.laneY[0] - 90); ctx.lineTo(W, H - 40); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
}
function runshipDrawRain(st) {
  const t = G.clock;
  ctx.save(); ctx.strokeStyle = 'rgba(220,235,255,0.55)'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 90; i++) {
    const x = (hash(i, 11) % (W + 200)) - ((t * 260 + i * 37) % (W + 200)) + 200, y = ((hash(i, 5) % H) + t * 700) % (H + 40) - 20;
    ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 18);
  }
  ctx.stroke(); ctx.restore();
}
// the water that hides the hull below the waterline, with foam at the bow
function runshipDrawShipWater(st, xf) {
  const sh = st.ship, t = G.clock, y = xf.y + 6 * xf.s;
  const a0 = runshipToScreen(st, 30, RUNSHIP.wl + 2, xf), a1 = runshipToScreen(st, RUNSHIP.bowTip - 8, RUNSHIP.wl + 2, xf);
  // a little shade under the hull, then a foam line along the waterline
  ctx.fillStyle = 'rgba(10,60,90,0.18)'; ctx.beginPath(); ctx.ellipse((a0.x + a1.x) / 2, (a0.y + a1.y) / 2 + 10 * xf.s, (a1.x - a0.x) / 2 + 20, 12 * xf.s, Math.atan2(a1.y - a0.y, a1.x - a0.x), 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3.5 * xf.s; ctx.lineCap = 'round'; ctx.beginPath();
  for (let k = 0; k <= 24; k++) { const u = k / 24, x = runshipLerp(a0.x, a1.x, u), yy = runshipLerp(a0.y, a1.y, u) + Math.sin(x * 0.05 + t * 3) * 2.2; if (!k) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
  ctx.stroke(); ctx.lineCap = 'butt';
  // bow wave and wake while moving
  const bow = runshipToScreen(st, RUNSHIP.bowTip, RUNSHIP.wl, xf), k = clamp(sh.v / 160, 0, 1.2);
  if (k > 0.05) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 5; i++) { const ph = (t * 3 + i * 0.2) % 1; circle(bow.x - 8 + ph * 26 * k, bow.y + 2 - Math.sin(ph * Math.PI) * 12 * k, (5 - ph * 3) * xf.s); ctx.fill(); }
    for (let i = 0; i < 6; i++) { const ph = (t * 1.2 + i / 6) % 1; ctx.globalAlpha = 1 - ph; circle(runshipToScreen(st, 30, RUNSHIP.wl, xf).x - ph * 200, y + 8 + Math.sin(i) * 3, 4 + ph * 4); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}

/* ---------- the ship ---------- */
function runshipDrawShip(st, xf) {
  const P = RUNSHIP, sh = st.ship, t = G.clock;
  ctx.save();
  ctx.translate(xf.x, xf.y); ctx.rotate(xf.r); ctx.scale(xf.s, xf.s); ctx.translate(-P.mastX, -P.wl);
  if (sh.bonkT > 0) ctx.translate(Math.sin(sh.bonkT * 60) * sh.bonkT * 5, 0);
  // (below the waterline the sea hides the hull)
  ctx.save(); ctx.beginPath(); ctx.rect(-300, -400, 1300, P.wl + 4 + 400); ctx.clip();
  runshipDrawHull(st, t);
  ctx.restore();
  runshipDrawRigging(st, t);
  runshipDrawSail(st, t);
  runshipDrawRopes(st, t);
  runshipDrawDeckThings(st, t);
  runshipDrawCrew(st, t);
  runshipDrawNestFront(st, t);
  ctx.restore();
}
function runshipHullPath() {
  const P = RUNSHIP;
  ctx.beginPath();
  ctx.moveTo(8, P.qdY);                          // the stern, top
  ctx.lineTo(P.qdX, P.qdY);
  ctx.lineTo(P.qdX, P.deckY);
  ctx.lineTo(P.fcX, P.deckY);
  ctx.lineTo(P.fcX, P.fcY);
  ctx.lineTo(540, P.fcY);
  ctx.quadraticCurveTo(566, P.fcY + 2, 574, P.fcY - 12);     // the bow, curving out
  ctx.quadraticCurveTo(566, 320, 498, 372);
  ctx.lineTo(70, 372);
  ctx.quadraticCurveTo(24, 340, 8, P.qdY);
  ctx.closePath();
}
function runshipDrawHull(st, t) {
  const P = RUNSHIP, sh = st.ship;
  // the hull
  const g = ctx.createLinearGradient(0, 250, 0, 372);
  g.addColorStop(0, '#b06a36'); g.addColorStop(1, '#6e3c1c');
  ctx.fillStyle = g; runshipHullPath(); ctx.fill();
  ctx.save(); runshipHullPath(); ctx.clip();
  // planks
  ctx.strokeStyle = 'rgba(70,34,12,0.35)'; ctx.lineWidth = 1.5;
  for (let y = 262; y < 372; y += 13) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(600, y + 4); ctx.stroke(); }
  for (let i = 0; i < 26; i++) { const x = 20 + i * 23 + (i % 2) * 11, y = 264 + (i % 8) * 13; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 12); ctx.stroke(); }
  // trim stripes
  ctx.fillStyle = '#ffc53d'; ctx.fillRect(0, 300, 600, 7);
  ctx.fillStyle = '#e8503c'; ctx.fillRect(0, 307, 600, 5);
  ctx.fillStyle = '#2f8f9a'; ctx.fillRect(0, 336, 600, 40);
  ctx.restore();
  ctx.strokeStyle = '#4a2610'; ctx.lineWidth = 3.5; runshipHullPath(); ctx.stroke();
  // portholes: the water in the hold shows in them
  const wf = clamp(sh.water / 100, 0, 1);
  for (const px of [196, 256, 356, 410]) {
    ctx.fillStyle = '#ffd36a'; circle(px, 322, 9.5); ctx.fill();
    ctx.fillStyle = '#2b3550'; circle(px, 322, 7); ctx.fill();
    if (wf > 0.02) {
      ctx.save(); circle(px, 322, 7); ctx.clip();
      ctx.fillStyle = wf > 0.7 ? '#7fd0ff' : '#4fb0e0'; ctx.fillRect(px - 8, 329 - 14 * wf + Math.sin(t * 4 + px) * 1.2, 16, 16); ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(px - 2.5, 319.5, 2); ctx.fill();
  }
  // the deck tops (a lighter plank edge)
  ctx.fillStyle = '#e3b27a';
  ctx.fillRect(10, P.qdY - 1, P.qdX - 10, 5); ctx.fillRect(P.qdX, P.deckY - 2, P.fcX - P.qdX, 5); ctx.fillRect(P.fcX, P.fcY - 1, 98, 5);
  // the step walls: a cabin door under the quarterdeck, a little hatch under the forecastle
  ctx.fillStyle = '#8f5428'; ctx.fillRect(P.qdX - 8, P.qdY + 4, 8, P.deckY - P.qdY - 6); ctx.fillRect(P.fcX, P.fcY + 4, 8, P.deckY - P.fcY - 6);
  ctx.fillStyle = '#6a3a18'; rr(P.qdX - 34, P.qdY + 10, 20, 30, 6); ctx.fill();
  ctx.fillStyle = C.gold; circle(P.qdX - 18, P.qdY + 26, 2); ctx.fill();
  // rails: posts and a top rail
  ctx.strokeStyle = '#7a4420'; ctx.lineWidth = 3;
  const rail = (x0, x1, y) => { ctx.beginPath(); ctx.moveTo(x0, y - 20); ctx.lineTo(x1, y - 20); ctx.stroke(); for (let x = x0; x <= x1; x += 18) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 20); ctx.stroke(); } };
  ctx.globalAlpha = 0.85;
  rail(14, 128, P.qdY); rail(P.fcX + 8, 534, P.fcY);
  ctx.globalAlpha = 1;
  // the figurehead: a smiling dolphin at the bow
  ctx.save(); ctx.translate(566, 262); ctx.rotate(-0.3);
  ctx.fillStyle = '#7fc8e8'; ctx.beginPath(); ctx.ellipse(8, 0, 16, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(20, -2); ctx.lineTo(32, 0); ctx.lineTo(20, 4); ctx.fill();
  ctx.fillStyle = C.ink; circle(14, -3, 1.8); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(16, 2, 4, 0.2, 1.6); ctx.stroke();
  ctx.restore();
  // the stern lantern and flag
  ctx.strokeStyle = '#5a3216'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(22, P.qdY); ctx.lineTo(22, 150); ctx.stroke();
  const fw = Math.sin(t * 5) * 4;
  ctx.fillStyle = '#7a4ad8'; ctx.beginPath(); ctx.moveTo(22, 152); ctx.quadraticCurveTo(-8, 158 + fw, -34, 156); ctx.lineTo(-30, 188 + fw * 0.5); ctx.quadraticCurveTo(-6, 186 - fw, 22, 184); ctx.closePath(); ctx.fill();
  runshipStar(-6, 170 + fw * 0.4, 9, 4, C.gold);
  ctx.fillStyle = '#ffdf6e'; rr(30, 214, 12, 16, 4); ctx.fill(); ctx.strokeStyle = '#5a3216'; ctx.lineWidth = 2; rr(30, 214, 12, 16, 4); ctx.stroke();
  // the anchor hanging at the bow (drops at the very end)
  const party = st.state === 'party' ? clamp(st.party.t / 0.6, 0, 1) : 0;
  const ay = 286 + party * 90 - (st.state === 'anchor' ? st.anchorK * 6 : 0);
  ctx.strokeStyle = '#5c6070'; ctx.lineWidth = 2.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(P.anchorX + 30, 254); ctx.lineTo(552, ay - 18); ctx.stroke(); ctx.setLineDash([]);
  runshipAnchorShape(552, ay, 1);
}
function runshipAnchorShape(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#4a5060'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 14); ctx.moveTo(-8, -10); ctx.lineTo(8, -10); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 4, 12, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.lineWidth = 3; circle(0, -22, 4); ctx.stroke();
  ctx.lineCap = 'butt'; ctx.restore();
}
function runshipStar(x, y, ro, ri, col) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath(); ctx.fill();
}
// the jib, the mast, the pennant and the yard
function runshipDrawRigging(st, t) {
  const P = RUNSHIP, sh = st.ship;
  // jib stay and jib (a small sail at the front)
  ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P.mastX, 24); ctx.lineTo(606, 224); ctx.stroke();
  ctx.lineWidth = 6; ctx.strokeStyle = '#7a4c26'; ctx.beginPath(); ctx.moveTo(520, 248); ctx.lineTo(610, 222); ctx.stroke();
  const flap = sh.sail === 'luff' ? Math.sin(t * 16) * 6 : sh.sail === 'down' ? 0 : 0;
  ctx.fillStyle = '#fff6e2'; ctx.beginPath(); ctx.moveTo(320, 40); ctx.quadraticCurveTo(470 + flap, 120 + (sh.sail === 'down' ? 40 : 0), 590, 228); ctx.lineTo(470, 238); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#d9c7a2'; ctx.lineWidth = 2; ctx.stroke();
  // the mast
  ctx.fillStyle = '#8a5428'; ctx.fillRect(P.mastX - 8, 14, 16, P.deckY - 14);
  ctx.fillStyle = '#a8693a'; ctx.fillRect(P.mastX - 8, 14, 5, P.deckY - 14);
  ctx.strokeStyle = '#5a3216'; ctx.lineWidth = 2; ctx.strokeRect(P.mastX - 8, 14, 16, P.deckY - 14);
  // the pennant at the top shows the wind
  const wd = sh.wind, wv = Math.sin(t * 9) * 3;
  ctx.fillStyle = '#e8503c'; ctx.beginPath(); ctx.moveTo(P.mastX, 8); ctx.quadraticCurveTo(P.mastX + wd * 24, 6 + wv, P.mastX + wd * 48, 12 + wv); ctx.lineTo(P.mastX, 20); ctx.closePath(); ctx.fill();
  // the yard (crossbeam)
  ctx.fillStyle = '#8a5428'; rr(196, P.yardY - 5, 208, 10, 5); ctx.fill(); ctx.strokeStyle = '#5a3216'; ctx.lineWidth = 2; rr(196, P.yardY - 5, 208, 10, 5); ctx.stroke();
}
// the rope ladder, the back of the crow's nest and the sheets down to the cleats (in front of the sail)
function runshipDrawRopes(st, t) {
  const P = RUNSHIP, sh = st.ship;
  // the rope ladder (shrouds and rungs)
  ctx.strokeStyle = '#d9b77a'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(P.ratX0 - 4, P.deckY - 2); ctx.lineTo(P.nestX0 - 2, P.nestY + 4); ctx.moveTo(P.ratX1 + 4, P.deckY - 2); ctx.lineTo(P.nestX1 + 2, P.nestY + 4); ctx.stroke();
  ctx.lineWidth = 1.8;
  for (let y = P.nestY + 16; y < P.deckY - 4; y += 17) {
    const u = (y - P.nestY) / (P.deckY - P.nestY), x0 = runshipLerp(P.nestX0 - 2, P.ratX0 - 4, u), x1 = runshipLerp(P.nestX1 + 2, P.ratX1 + 4, u);
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  }
  // the crow's nest (back half; the front is drawn over whoever stands in it)
  ctx.fillStyle = '#7a4420'; rr(P.nestX0 - 10, P.nestY - 22, P.nestX1 - P.nestX0 + 20, 26, 6); ctx.fill();
  // the sheets: ropes from the yard ends down to the cleats; the one to haul flaps and glows
  const want = runshipCleatWanted(st);
  for (let side = 0; side < 2; side++) {
    const cx = P.cleats[side], yx = side ? 398 : 202, glow = want === side;
    ctx.strokeStyle = glow ? C.gold : '#d9b77a'; ctx.lineWidth = glow ? 3.5 : 2;
    ctx.beginPath(); ctx.moveTo(yx, P.yardY + 4);
    if (glow) ctx.quadraticCurveTo((yx + cx) / 2 + Math.sin(t * 14) * 18, (P.yardY + P.deckY) / 2 + 20, cx, P.deckY - 10);
    else ctx.lineTo(cx, P.deckY - 10);
    ctx.stroke();
  }
}
// the big square sail: full, flapping (wind changed) or bunched up (tangled)
function runshipDrawSail(st, t) {
  const P = RUNSHIP, sh = st.ship;
  const y0 = P.yardY + 4, x0 = 208, x1 = 392;
  if (sh.sail === 'down') {
    // bunched up under the yard
    ctx.fillStyle = '#fff3d6';
    for (let i = 0; i < 6; i++) { circle(x0 + 16 + i * 31, y0 + 10 + (i % 2) * 4, 15); ctx.fill(); }
    ctx.strokeStyle = '#d9c7a2'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x0 + 16 + i * 31, y0 + 10 + (i % 2) * 4, 15, 0.2, Math.PI - 0.2); ctx.stroke(); }
    return;
  }
  const luff = sh.sail === 'luff', full = !luff;
  const bulge = full ? 26 * (sh.trim || 1) : 0, y1 = luff ? 230 : 222;
  const wob = k => (luff ? Math.sin(t * 15 + k * 2.1) * 9 : 0);
  ctx.fillStyle = '#fff6e2';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y0);
  ctx.quadraticCurveTo(x1 + bulge + wob(1), (y0 + y1) / 2, x1 - 6 + wob(2), y1);
  ctx.quadraticCurveTo((x0 + x1) / 2 + wob(3), y1 + (full ? 14 : 4) + wob(4), x0 + 6 + wob(5), y1);
  ctx.quadraticCurveTo(x0 + bulge * 0.4 + wob(6), (y0 + y1) / 2, x0, y0);
  ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip();
  // red stripes and a patch
  ctx.fillStyle = 'rgba(232,80,60,0.85)'; for (const sx of [x0 + 34, x0 + 106]) ctx.fillRect(sx + bulge * 0.2, y0, 26, y1 - y0 + 20);
  ctx.fillStyle = '#ffd98a'; rr(x1 - 54, y0 + 70, 22, 18, 3); ctx.fill();
  ctx.strokeStyle = '#c99a50'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2; rr(x1 - 54, y0 + 70, 22, 18, 3); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
  ctx.strokeStyle = '#d9c7a2'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x1, y0); ctx.quadraticCurveTo(x1 + bulge + wob(1), (y0 + y1) / 2, x1 - 6 + wob(2), y1); ctx.quadraticCurveTo((x0 + x1) / 2 + wob(3), y1 + (full ? 14 : 4) + wob(4), x0 + 6 + wob(5), y1); ctx.quadraticCurveTo(x0 + bulge * 0.4 + wob(6), (y0 + y1) / 2, x0, y0); ctx.stroke();
  // billow lines on a full sail
  if (full) { ctx.strokeStyle = 'rgba(200,180,140,0.6)'; ctx.lineWidth = 1.5; for (const k of [0.3, 0.6]) { ctx.beginPath(); ctx.moveTo(x0 + 20, y0 + (y1 - y0) * k); ctx.quadraticCurveTo((x0 + x1) / 2 + bulge * 0.6, y0 + (y1 - y0) * k + 12, x1 - 10, y0 + (y1 - y0) * k); ctx.stroke(); } }
}
function runshipDrawDeckThings(st, t) {
  const P = RUNSHIP, sh = st.ship;
  // the wheel (turns as the helm steers)
  ctx.fillStyle = '#6a3a18'; ctx.fillRect(P.wheelX - 4, 222, 8, P.qdY - 222);
  ctx.save(); ctx.translate(P.wheelX, 222); ctx.rotate(sh.wheelA);
  ctx.strokeStyle = '#8a5428'; ctx.lineWidth = 4; circle(0, 0, 17); ctx.stroke();
  ctx.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4); ctx.lineTo(Math.cos(a) * 23, Math.sin(a) * 23); ctx.stroke(); }
  ctx.fillStyle = C.gold; circle(0, 0, 4.5); ctx.fill();
  ctx.restore();
  // the bell (swings when rung)
  const bx = 112, swing = sh.bellT > 0 ? Math.sin(sh.bellT * 30) * sh.bellT * 0.9 : 0;
  ctx.strokeStyle = '#6a3a18'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx - 10, P.qdY); ctx.lineTo(bx - 10, 196); ctx.lineTo(bx + 8, 196); ctx.stroke();
  ctx.save(); ctx.translate(bx + 4, 197); ctx.rotate(swing);
  ctx.fillStyle = st.bellGold ? '#ffe27a' : '#f0b429'; ctx.beginPath(); ctx.moveTo(-8, 18); ctx.quadraticCurveTo(-8, 2, 0, 2); ctx.quadraticCurveTo(8, 2, 8, 18); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#a8740f'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#a8740f'; circle(0, 19, 2.5); ctx.fill();
  ctx.restore();
  // the pump (red, its handle bobs when pumped)
  const pa = st.pumpA || 0;
  ctx.fillStyle = '#d8453a'; rr(P.pumpX - 9, P.deckY - 30, 18, 30, 4); ctx.fill(); ctx.strokeStyle = '#8f2a22'; ctx.lineWidth = 2; rr(P.pumpX - 9, P.deckY - 30, 18, 30, 4); ctx.stroke();
  ctx.fillStyle = '#f2f2f2'; ctx.fillRect(P.pumpX - 9, P.deckY - 22, 18, 4);
  ctx.strokeStyle = '#5a3216'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(P.pumpX, P.deckY - 32); ctx.lineTo(P.pumpX + 18, P.deckY - 40 + pa * 12); ctx.stroke();
  ctx.fillStyle = '#5a3216'; ctx.fillRect(P.pumpX - 18, P.deckY - 20, 9, 5);
  // the cleats with coiled rope
  const want = runshipCleatWanted(st);
  for (let side = 0; side < 2; side++) {
    const cx = P.cleats[side], glow = want === side;
    ctx.fillStyle = '#c99a50'; ctx.beginPath(); ctx.ellipse(cx, P.deckY - 4, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a3216'; rr(cx - 10, P.deckY - 14, 20, 5, 2.5); ctx.fill(); ctx.fillRect(cx - 2, P.deckY - 12, 4, 10);
    if (glow) {
      const a = 0.5 + 0.5 * Math.sin(t * 10);
      ctx.fillStyle = 'rgba(255,197,61,' + (0.25 + a * 0.35) + ')'; circle(cx, P.deckY - 10, 20); ctx.fill();
      ctx.fillStyle = C.gold; circle(cx, P.deckY - 54, 10); ctx.fill();
      ctx.fillStyle = C.ink; ctx.font = '15px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', cx, P.deckY - 53);
    }
  }
  // the anchor capstan on the forecastle
  ctx.fillStyle = '#7a4420'; rr(P.anchorX - 12, P.fcY - 26, 24, 26, 5); ctx.fill();
  ctx.fillStyle = '#a8693a'; rr(P.anchorX - 12, P.fcY - 26, 24, 6, 3); ctx.fill();
  ctx.strokeStyle = '#5a3216'; ctx.lineWidth = 3; const ca = (st.anchorK || 0) * 6 + (st.state === 'party' ? st.party.t * 8 : 0);
  ctx.beginPath(); ctx.moveTo(P.anchorX - 22 * Math.cos(ca), P.fcY - 22); ctx.lineTo(P.anchorX + 22 * Math.cos(ca), P.fcY - 22); ctx.stroke();
  if (st.state === 'anchor') {
    const a = 0.5 + 0.5 * Math.sin(t * 8);
    ctx.fillStyle = 'rgba(255,197,61,' + (0.2 + a * 0.3) + ')'; rr(P.anchorX0, P.fcY - 36, P.anchorX1 - P.anchorX0, 36, 10); ctx.fill();
    // the meter: both holding fills it
    ctx.fillStyle = 'rgba(28,26,54,0.7)'; rr(P.anchorX - 30, P.fcY - 70, 60, 10, 5); ctx.fill();
    if (st.anchorK > 0.02) { ctx.fillStyle = C.gold; rr(P.anchorX - 30, P.fcY - 70, 60 * st.anchorK, 10, 5); ctx.fill(); }
  }
  // leaks: a hole spurting water (with a half-hammered plank while it's being fixed)
  for (const l of st.leaks) {
    const s = P.leakSlots[l.slot], h = 22 + Math.sin(t * 14 + l.slot) * 5;
    ctx.fillStyle = '#3a1e0c'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 1, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(120,205,250,0.9)';
    for (let i = 0; i < 5; i++) { const ph = (t * 2.2 + i / 5) % 1, side = i % 2 ? 1 : -1; circle(s.x + side * ph * 14, s.y - Math.sin(ph * Math.PI) * h, 3.2 - ph * 1.6); ctx.fill(); }
    ctx.fillStyle = 'rgba(200,240,255,0.9)'; ctx.fillRect(s.x - 1.5, s.y - h * 0.8, 3, h * 0.8);
    if (l.fix > 0.02) { ctx.fillStyle = '#d9a86a'; ctx.globalAlpha = 0.4 + l.fix * 0.6; rr(s.x - 13, s.y - 3, 26 * l.fix, 6, 2); ctx.fill(); ctx.globalAlpha = 1; }
  }
  // water sloshing on the main deck
  if (sh.water > 30) {
    const h = (sh.water - 30) / 70 * 13;
    ctx.fillStyle = 'rgba(100,190,235,0.6)';
    ctx.beginPath(); ctx.moveTo(P.qdX, P.deckY);
    for (let x = P.qdX; x <= P.fcX; x += 12) ctx.lineTo(x, P.deckY - h + Math.sin(x * 0.05 + t * 4) * Math.min(2.5, h * 0.3));
    ctx.lineTo(P.fcX, P.deckY); ctx.closePath(); ctx.fill();
  }
  // coins on deck
  for (const cn of st.coins) {
    const blink = cn.landed && cn.t > 7 && Math.sin(t * 18) > 0;
    if (blink) continue;
    const w = Math.abs(Math.cos(cn.spin)) * 6 + 1;
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.ellipse(cn.x, cn.y, w, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b9850f'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // the tangle up the ladder, with the cheeky seagull stuck in it
  if (st.tangle) {
    const tg = st.tangle, y = tg.y, sh2 = 1 - tg.fix * 0.5;
    ctx.save(); ctx.translate(P.mastX + 18, y);
    if (st.knifeGold) { ctx.fillStyle = 'rgba(255,197,61,0.35)'; circle(0, 0, 32); ctx.fill(); }
    ctx.strokeStyle = '#c9a463'; ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + t * 0.4; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 4, Math.sin(a) * 3, 18 * sh2, 9 * sh2, a, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    runshipGull(P.mastX + 22, y - 16, 1, t, true);
  }
  // the gull swooping in to tangle the ropes, or flying off afterwards
  if (st.gull && !st.tangle) {
    const g = st.gull;
    if (g.free != null) { const u = g.free / 2.5; runshipGull(P.mastX + 22 + u * 400, g.y - 16 - u * 220, 1, t, false); }
    else if (!g.done) { const u = clamp(g.t / 1.1, 0, 1); runshipGull(runshipLerp(760, P.mastX + 22, u), runshipLerp(-60, g.y - 16, u) - Math.sin(u * Math.PI) * 40, 1, t, false); }
  }
  // Captain Polly the parrot on the yard end
  runshipPolly2(st, 392, P.yardY - 8, t);
}
function runshipGull(x, y, s, t, stuck) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const f = stuck ? Math.sin(t * 20) * 0.6 : Math.sin(t * 9) * 0.5;
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#9aa4b8'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#e8ecf4';
  for (const k of [-1, 1]) { ctx.save(); ctx.rotate(k * (0.4 + f)); ctx.beginPath(); ctx.ellipse(k * 10, -8, 12, 4, k * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = '#ffffff'; circle(10, -6, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.moveTo(15, -6); ctx.lineTo(23, -4); ctx.lineTo(15, -3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.ink; circle(12, -8, 1.4); ctx.fill();
  if (stuck) { ctx.fillStyle = C.ink; ctx.font = '11px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?!', 2, -20); }
  ctx.restore();
}
function runshipPolly2(st, x, y, t) {
  const talk = st.polly.say;
  const hop = talk ? Math.abs(Math.sin(t * 9)) * 4 : 0, flap = talk ? Math.sin(t * 22) * 0.5 : 0;
  ctx.save(); ctx.translate(x, y - hop);
  ctx.fillStyle = '#2fae5a'; ctx.beginPath(); ctx.ellipse(0, -4, 8, 11, 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff5a4a'; circle(2, -16, 7); ctx.fill();
  ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.moveTo(8, -17); ctx.quadraticCurveTo(14, -15, 9, -10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; circle(4, -18, 2.6); ctx.fill(); ctx.fillStyle = C.ink; circle(4.6, -18, 1.3); ctx.fill();
  ctx.save(); ctx.rotate(-0.3 - flap); ctx.fillStyle = '#3b6fe0'; ctx.beginPath(); ctx.ellipse(-6, -4, 4, 9, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.moveTo(-2, 6); ctx.lineTo(-8, 16); ctx.lineTo(2, 7); ctx.closePath(); ctx.fill();
  ctx.restore();
}
// Pip and Bo, drawn with the engine's own hero look (plus a captain's hat for the helm and a bandana for the deckhand)
function runshipDrawCrew(st, t) {
  const P = RUNSHIP;
  for (const id of [st.deck, st.helm]) {
    const b = st.body[id], p = G.players[id];
    if (!b || b.splash) continue;
    let sx = 1, sy = 1;
    if (b.sq) { sx = 1 + b.sq * 0.4; sy = 1 - b.sq * 0.3; }
    const crouch = b.ground && p.input.down && b.mode === 'walk';
    if (crouch) { sx = 1.15; sy = 0.8; }
    if (b.work === 'fix') { sy = 0.85; sx = 1.08; }
    const climb = b.mode === 'climb';
    ctx.save(); ctx.translate(b.x, b.y);
    drawPlayer(Object.assign({}, p, { alive: true, x: -PW / 2, y: -PH, sx, sy, vy: climb ? 0 : b.vy * 0.5, face: climb ? 0 : b.face, stun: 0, w: PW, h: PH }));
    const helm = b.mode === 'helm';
    runshipHat(id, helm, PH * sy, t);
    // hands on the wheel, a hammer, the pump handle, the rope
    if (helm) { ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(6, -12); ctx.lineTo(P.wheelX - b.x - 8, 222 - P.qdY + 4); ctx.stroke(); ctx.lineCap = 'butt'; }
    if (b.work === 'fix' || b.hammer > 0) {
      const a = b.hammer > 0 ? -1.2 + (1 - b.hammer / 0.16) * 1.6 : -0.4;
      ctx.save(); ctx.translate(b.face * 8, -14); ctx.rotate(a * b.face);
      ctx.strokeStyle = '#7a4c26'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(b.face * 12, 8); ctx.stroke();
      ctx.fillStyle = '#8a8f9e'; rr(b.face * 12 - 4, 4, 8, 8, 2); ctx.fill();
      ctx.restore();
    }
    if (climb) { ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 3; ctx.lineCap = 'round'; const k = Math.sin(b.climbA || 0) * 4; ctx.beginPath(); ctx.moveTo(-9, -18); ctx.lineTo(-13, -30 + k); ctx.moveTo(9, -18); ctx.lineTo(13, -30 - k); ctx.stroke(); ctx.lineCap = 'butt'; }
    ctx.restore();
  }
}
function runshipHat(id, helm, h, t) {
  if (helm) {
    // a captain's hat (tricorn) with a gold star
    ctx.fillStyle = '#2b2846'; ctx.beginPath(); ctx.moveTo(-17, -h + 2); ctx.quadraticCurveTo(0, -h - 20, 17, -h + 2); ctx.quadraticCurveTo(0, -h - 4, -17, -h + 2); ctx.fill();
    ctx.fillStyle = '#2b2846'; ctx.beginPath(); ctx.ellipse(0, -h + 1, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, -h + 1, 18, 4, 0, Math.PI, 0); ctx.stroke();
    runshipStar(0, -h - 7, 4.5, 2, C.gold);
  } else {
    // a deckhand's bandana (red with white dots)
    ctx.fillStyle = '#e8503c'; ctx.beginPath(); ctx.moveTo(-11, -h + 8); ctx.quadraticCurveTo(0, -h - 6, 11, -h + 8); ctx.lineTo(11, -h + 11); ctx.lineTo(-11, -h + 11); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-11, -h + 9); ctx.lineTo(-19, -h + 6 + Math.sin(t * 8) * 2); ctx.lineTo(-17, -h + 13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; circle(-5, -h + 4, 1.4); ctx.fill(); circle(3, -h + 2, 1.4); ctx.fill(); circle(7, -h + 7, 1.2); ctx.fill();
  }
}
function runshipDrawNestFront(st, t) {
  const P = RUNSHIP;
  ctx.fillStyle = '#9a5a2e'; rr(P.nestX0 - 12, P.nestY - 12, P.nestX1 - P.nestX0 + 24, 22, 6); ctx.fill();
  ctx.strokeStyle = '#5a3216'; ctx.lineWidth = 2.5; rr(P.nestX0 - 12, P.nestY - 12, P.nestX1 - P.nestX0 + 24, 22, 6); ctx.stroke();
  ctx.strokeStyle = '#6a3a18'; ctx.lineWidth = 1.5; for (const y of [P.nestY - 5, P.nestY + 3]) { ctx.beginPath(); ctx.moveTo(P.nestX0 - 12, y); ctx.lineTo(P.nestX1 + 12, y); ctx.stroke(); }
  // a spyglass glint when someone looks out in fog
  if (runshipLookout(st) && st.c.fogs.some(f => st.ship.d < f.X1 && f.X0 - st.ship.d < 900)) {
    const b = st.body[st.deck];
    ctx.strokeStyle = '#8a8f9e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(b.x + 6, P.nestY - 18); ctx.lineTo(b.x + 22, P.nestY - 22); ctx.stroke();
    ctx.fillStyle = '#fff'; circle(b.x + 24, P.nestY - 22, 2 + Math.max(0, Math.sin(t * 6)) * 1.5); ctx.fill();
  }
}
// Dot the dolphin leaps and flips a splashed deckhand back aboard (drawn on screen, in front of the hull)
function runshipDrawDolphin(st, xf) {
  for (const b of st.body) {
    if (!b || !b.splash) continue;
    const p = G.players[b.id], at = runshipSplashPos(st, b, xf), sp = b.splash;
    ctx.save();
    if (sp.t > 0.55 && sp.t < 1.2) { ctx.beginPath(); ctx.rect(0, 0, W, xf.y + 72); ctx.clip(); }
    drawPlayer(Object.assign({}, p, { alive: true, x: at.x - PW / 2, y: at.y - PH / 2, sx: 1, sy: 1, vy: 0, face: 1, stun: sp.t < 1.2 ? 1 : 0, w: PW, h: PH }));
    ctx.restore();
    if (sp.t > 0.55 && sp.t < 1.2) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(at.x, xf.y + 72, 18 + Math.sin(sp.t * 10) * 3, 4, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  const d = st.dolphin;
  if (!d) return;
  const u = clamp(d.t / 1.4, 0, 1), x = d.x - 60 + u * 140, y = xf.y + 80 - Math.sin(u * Math.PI) * 110, a = -0.9 + u * 1.8;
  if (d.t > 1.6) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = '#6fa8d8'; ctx.beginPath(); ctx.ellipse(0, 0, 32, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d8ecff'; ctx.beginPath(); ctx.ellipse(4, 5, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6fa8d8'; ctx.beginPath(); ctx.moveTo(28, -2); ctx.lineTo(44, 1); ctx.lineTo(28, 5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-4, -12); ctx.lineTo(-12, -24); ctx.lineTo(4, -12); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-44, -10); ctx.lineTo(-40, 2); ctx.lineTo(-44, 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.ink; circle(18, -4, 2); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(22, 1, 5, 0.1, 1.4); ctx.stroke();
  ctx.restore();
}

/* ---------- HUD: the clock and coins, the sea chart, each job's card, prompts and hints ---------- */
function runshipHud(st) {
  const P = RUNSHIP, sh = st.ship, big = hudBig(), play = G.mode === 'play' || G.mode === 'paused', t = G.clock;
  const font = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = st.stats.coins + '/' + st.stats.coinsAll;
    ctx.font = font(fs);
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.1, gap = fs;
    const w = tw + gap + icon + fs * 0.4 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, C.paper, 'left', 'body');
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.ellipse(x0 + 15 + tw + gap + icon / 2, cy, icon * 0.42, icon * 0.48, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b9850f'; ctx.lineWidth = 1.5; ctx.stroke();
    text(n, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, '#ffe7a8', 'left', 'body');
    timeX0 = x0;
  }
  if (!play) return;
  const z = big ? 1.35 : 1;
  if (st.state === 'sail' || st.state === 'swap') runshipChart(st, z, big);
  // job cards, bottom corners: Pip's on the left, Bo's on the right
  for (const id of [0, 1]) {
    const helm = id === st.helm && st.state !== 'anchor' && st.state !== 'party', pw = Math.round(250 * z), ph = Math.round(48 * z), py = H - ph - 8;
    const px = id === 0 ? 10 : W - 10 - pw, cpuSeat = runshipQuiet(id);
    ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(px, py, pw, ph, 13 * z); ctx.fill();
    const gold = helm ? (st.rudderGold || st.bellGold || st.glassGold) : (st.hammerGold || st.knifeGold);
    ctx.strokeStyle = gold ? C.gold : PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 13 * z); ctx.stroke();
    const role = st.state === 'anchor' || st.state === 'party' ? ' · anchor' : helm ? ' · helm' : ' · deckhand';
    text(NAMES[id] + role + (cpuSeat ? ' (computer)' : ''), px + 12 * z, py + 13 * z, 14 * z, PCOL[id], 'left');
    if (!cpuSeat) {
      const keys = st.state === 'anchor' ? 'hold ' + runshipKey(id, 'act') + ' at the anchor' : helm ? runshipKey(id, 'ud') + ' steer · ' + runshipKey(id, 'left') + ' ease · ' + runshipKey(id, 'act') + ' bell'
        : runshipKey(id, 'up') + ' climb · ' + runshipKey(id, 'act') + ' fix';
      text(keys.replace(/stick /g, ''), px + pw - 10 * z, py + 13 * z, 11 * z, '#d9d3ef', 'right', 'body');
    }
    const bx = px + 12 * z, by = py + 27 * z, bw = pw - 24 * z, bh = 13 * z;
    if (st.state === 'anchor' || st.state === 'party') {
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(bx, by, bw, bh, bh / 2); ctx.fill();
      if (st.anchorK > 0.03) { ctx.fillStyle = C.gold; rr(bx, by, Math.max(bh, bw * st.anchorK), bh, bh / 2); ctx.fill(); }
      text(st.anchorAt && st.anchorAt[id] ? 'pulling!' : 'run to the anchor', bx + 8 * z, by + bh / 2 + 0.5, 10 * z, st.anchorK > 0.3 ? C.ink : '#ffffff', 'left', 'body');
    } else if (helm) {
      // speed, and what slows the ship
      const k = clamp(sh.v / (st.cruise * 1.0), 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(bx, by, bw * 0.55, bh, bh / 2); ctx.fill();
      if (bw * 0.55 * k > bh) { ctx.fillStyle = sh.aground ? '#ff9a9a' : '#7fe0a0'; rr(bx, by, bw * 0.55 * k, bh, bh / 2); ctx.fill(); }
      text('speed', bx + 8 * z, by + bh / 2 + 0.5, 10 * z, k > 0.4 ? C.ink : '#ffffff', 'left', 'body');
      const why = sh.aground ? 'Aground!' : sh.sail === 'down' ? 'Sail tangled' : sh.sail === 'luff' ? 'Sail flapping' : sh.water > 50 ? 'Heavy with water' : sh.ease ? 'Easing off' : 'Full sail';
      text(why, bx + bw, by + bh / 2 + 0.5, 11 * z, sh.aground || sh.sail === 'down' ? '#ff9a9a' : sh.sail === 'luff' || sh.water > 50 ? '#ffe7a8' : '#c8ffd0', 'right', 'body');
    } else {
      // the water in the hold
      const wf = clamp(sh.water / 100, 0, 1), ww = bw * 0.6;
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(bx, by, ww, bh, bh / 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,120,120,0.3)'; rr(bx + ww * 0.7, by, ww * 0.3, bh, bh / 2); ctx.fill();
      if (ww * wf >= bh) { ctx.fillStyle = wf > 0.7 ? (Math.sin(t * 12) > 0 ? '#ff8a8a' : '#5ab8e0') : '#5ab8e0'; rr(bx, by, ww * wf, bh, bh / 2); ctx.fill(); }
      text('water ' + Math.round(sh.water) + '%', bx + 8 * z, by + bh / 2 + 0.5, 10 * z, '#ffffff', 'left', 'body');
      const lk = st.leaks.length;
      text(lk ? lk + (lk === 1 ? ' leak' : ' leaks') : 'no leaks', bx + bw, by + bh / 2 + 0.5, 11 * z, lk ? '#bfefff' : '#c8ffd0', 'right', 'body');
    }
  }
  // the message line (gold help): between the level pill and the clock when it fits, else lower down
  if (st.msg) {
    let fs = big ? 19 : 14;
    const h = big ? 32 : 26;
    ctx.font = font(14);
    const left = 14 + ctx.measureText(levelCode(G.levelIndex) + ' · ' + G.level.def.name).width + 28 + 10, right = timeX0 - 10;
    ctx.font = font(fs);
    let w = ctx.measureText(st.msg.text).width + 30, cx = W / 2 + 30, y = 12;
    if (w <= right - left) cx = clamp(cx, left + w / 2, right - w / 2);
    else {
      cx = W / 2; y = big ? 150 : 124;
      while (w > W - 40 && fs > 11) { fs--; ctx.font = font(fs); w = ctx.measureText(st.msg.text).width + 30; }
    }
    ctx.globalAlpha = clamp((st.msg.life - st.msg.t) / 0.3, 0, 1);
    pill(cx, y, w, h, 'center'); text(st.msg.text, cx, y + h / 2 + 0.5, fs, st.msg.col, 'center', 'body'); ctx.globalAlpha = 1;
  }
  // the sign: a wooden board under the stretch pill
  if (st.sign && G.introT <= 0) {
    let s = st.sign.anchor ? (cpuSolo() ? 'Treasure Cove! Run to the anchor and hold ' + runshipKey(cpuHuman(), 'act') + ' together!' : 'Treasure Cove! Both run to the anchor and hold ' + runshipKey(0, 'act') + ' and ' + runshipKey(1, 'act') + '!') : runshipSignText(st, st.sign.text);
    let fs = big ? 18 : 14;
    ctx.font = font(fs);
    const maxW = big ? W - 30 : 590;
    let w = ctx.measureText(s).width + 30;
    while (w > maxW && fs > 10) { fs--; ctx.font = font(fs); w = ctx.measureText(s).width + 30; }
    const h = fs + 14, a = clamp(Math.min(st.sign.t / 0.25, (st.sign.life - st.sign.t) / 0.4), 0, 1);
    const x0 = big ? W / 2 - w / 2 : 14, y0 = big ? (st.state === 'sail' || st.state === 'swap' ? 156 : 100) : 80;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#c08a4e'; rr(x0, y0, w, h, 8); ctx.fill();
    ctx.strokeStyle = '#6a4626'; ctx.lineWidth = 2.5; rr(x0, y0, w, h, 8); ctx.stroke();
    text(s, x0 + w / 2, y0 + h / 2 + 0.5, fs, '#2e1c0c', 'center', 'body');
    ctx.globalAlpha = 1;
  }
  // Polly's words
  if (st.polly.say) {
    const sc = runshipToScreen(st, 392, P.yardY - 30), s = st.polly.say.text;
    ctx.font = font(13 * z);
    const w = ctx.measureText(s).width + 18, h = 24 * z, x = clamp(sc.x - 20, 6, W - w - 6), y = clamp(sc.y - h - 6, big ? 100 : 82, H);
    ctx.globalAlpha = clamp((3.2 - st.polly.say.t) / 0.3, 0, 1);
    ctx.fillStyle = '#fffaf0'; rr(x, y, w, h, 10); ctx.fill(); ctx.strokeStyle = '#2fae5a'; ctx.lineWidth = 2; rr(x, y, w, h, 10); ctx.stroke();
    text(s, x + w / 2, y + h / 2 + 0.5, 13 * z, C.ink, 'center', 'body');
    ctx.globalAlpha = 1;
  }
  if (G.introT > 0 || st.state === 'swap' || st.state === 'party') return;
  runshipPrompts(st, z, big);
}
// the sea chart: the next stretch of sea in three lanes (what the helm should steer round), fog shown as "?"
function runshipChart(st, z, big) {
  const P = RUNSHIP, sh = st.ship, t = G.clock;
  const w = big ? 300 : 330, h = Math.round(74 * z), x0 = W - 14 - w, y0 = big ? 62 : 50;
  const range = 1700, k = (w - 40) / range, rowH = (h - 12) / 3;
  ctx.fillStyle = '#f3e3bf'; rr(x0, y0, w, h, 10); ctx.fill();
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2.5; rr(x0, y0, w, h, 10); ctx.stroke();
  ctx.save(); rr(x0 + 2, y0 + 2, w - 4, h - 4, 8); ctx.clip();
  // lanes
  for (let l = 0; l < 3; l++) { ctx.fillStyle = l === sh.lane ? 'rgba(80,170,200,0.42)' : 'rgba(80,170,200,0.2)'; ctx.fillRect(x0 + 4, y0 + 6 + l * rowH, w - 8, rowH); }
  ctx.strokeStyle = 'rgba(60,110,140,0.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
  for (let l = 1; l < 3; l++) { ctx.beginPath(); ctx.moveTo(x0 + 4, y0 + 6 + l * rowH); ctx.lineTo(x0 + w - 4, y0 + 6 + l * rowH); ctx.stroke(); }
  ctx.setLineDash([]);
  const cx = X => x0 + 30 + (X - sh.d) * k, cy = l => y0 + 6 + (l + 0.5) * rowH;
  // fog banks (hidden unless someone is in the crow's nest)
  const look = runshipLookout(st);
  for (const f of st.c.fogs) {
    const a = Math.max(x0 + 28, cx(f.X0)), b = Math.min(x0 + w, cx(f.X1));
    if (b <= a) continue;
    ctx.fillStyle = look ? 'rgba(220,226,236,0.35)' : 'rgba(205,212,224,0.95)'; ctx.fillRect(a, y0 + 4, b - a, h - 8);
    if (!look) { ctx.fillStyle = '#7a8296'; ctx.font = (14 * z) + 'px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; for (let x = a + 20; x < b - 6; x += 46) ctx.fillText('?', x, y0 + h / 2); }
  }
  for (const it of st.c.items) {
    if (it.passed && it.k !== 'wave') continue;
    const dd = it.X - sh.d;
    if (dd > range) break;
    if (dd < -10 && it.k !== 'wave') continue;
    const x = cx(it.X);
    const seen = runshipSeen(st, it);
    if (!seen && !st.glassGold) continue;
    const gold = !seen && st.glassGold;
    if (it.k === 'wave') {
      if (it.done) continue;
      ctx.strokeStyle = '#2f8fc0'; ctx.lineWidth = 3; ctx.beginPath();
      for (let y = y0 + 6; y <= y0 + h - 6; y += 6) ctx.lineTo(x + Math.sin(y * 0.4 + t * 6) * 3, y);
      ctx.stroke();
      continue;
    }
    const y = cy(it.lane);
    if (it.k === 'rock') { ctx.fillStyle = gold ? C.gold : '#5d5f70'; ctx.beginPath(); ctx.moveTo(x - rowH * 0.45, y + rowH * 0.32); ctx.lineTo(x - rowH * 0.15, y - rowH * 0.38); ctx.lineTo(x + rowH * 0.2, y - rowH * 0.25); ctx.lineTo(x + rowH * 0.45, y + rowH * 0.32); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#2c2a40'; ctx.lineWidth = 1.5; ctx.stroke(); }
    else if (it.k === 'reef') { ctx.fillStyle = gold ? C.gold : '#d0603e'; rr(x - 8, y - rowH * 0.38, 22, rowH * 0.76, 4); ctx.fill(); ctx.strokeStyle = '#7a3020'; ctx.lineWidth = 1.5; ctx.stroke(); }
    else if (it.k === 'gold') { ctx.fillStyle = C.gold; circle(x, y, rowH * 0.28); ctx.fill(); ctx.strokeStyle = '#b9850f'; ctx.lineWidth = 1.2; ctx.stroke(); }
  }
  // the end: the buoy or the cove
  const e = st.c.end;
  if (e && e.X - sh.d < range) { const x = cx(e.X); ctx.fillStyle = e.k === 'buoy' ? '#ff5a4a' : '#62c47e'; ctx.fillRect(x, y0 + 4, 4, h - 8); ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(x + 4, y0 + 6); ctx.lineTo(x + 16, y0 + 11); ctx.lineTo(x + 4, y0 + 16); ctx.fill(); }
  // the gold rudder's safe-lane arrow
  if (st.rudderGold && st.state === 'sail') {
    const nd = runshipNeeds(st);
    ctx.fillStyle = C.gold; ctx.beginPath(); const yy = cy(nd.lane); ctx.moveTo(x0 + 40, yy - 5); ctx.lineTo(x0 + 52, yy); ctx.lineTo(x0 + 40, yy + 5); ctx.fill();
  }
  ctx.restore();
  // the ship on the chart
  const sy = y0 + 6 + (clamp(sh.laneF, 0, 2) + 0.5) * rowH;
  ctx.fillStyle = '#8a4f22'; ctx.beginPath(); ctx.moveTo(x0 + 10, sy - 3); ctx.lineTo(x0 + 30, sy - 3); ctx.lineTo(x0 + 25, sy + 4); ctx.lineTo(x0 + 13, sy + 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff6e2'; ctx.beginPath(); ctx.moveTo(x0 + 19, sy - 13); ctx.lineTo(x0 + 27, sy - 5); ctx.lineTo(x0 + 19, sy - 4); ctx.fill();
  // a label tab above the chart
  ctx.font = '700 ' + (11 * z) + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const lw = ctx.measureText('Sea chart').width + 16;
  ctx.fillStyle = '#8a6a3a'; rr(x0 + 12, y0 - 15 * z, lw, 16 * z, 5); ctx.fill();
  ctx.fillStyle = '#fff6e2'; ctx.fillText('Sea chart', x0 + 20, y0 - 7 * z);
}
// prompts over each person's head (the computer's job never gets one in 1-player mode)
function runshipPrompts(st, z, big) {
  const P = RUNSHIP, sh = st.ship, t = G.clock, nd = runshipNeeds(st), xf = runshipXf(st);
  const fs = 13.5 * z;
  const box = (id, str, col, pulse, bubble) => {
    if (runshipQuiet(id)) return;
    const b = st.body[id];
    if (!b || b.splash) return;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 22 * z, h = fs + 12 * z;
    const at = runshipToScreen(st, b.x, b.y - PH - 22, xf);
    let x = at.x - w / 2, y = at.y - h - 6;
    x = clamp(x, 4, W - w - 4); y = clamp(y, big ? 100 : 84, H - h - 70 * z);
    const s = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s);
    ctx.fillStyle = bubble ? '#ffffff' : 'rgba(28,26,54,0.88)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = bubble ? PCOL[id] : col; ctx.lineWidth = 2.5; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, bubble ? C.ink : col, 'center', 'body');
    ctx.restore();
  };
  if (st.state === 'anchor') {
    for (const id of [0, 1]) {
      const b = st.body[id], at = b.x > P.anchorX0 && b.x < P.anchorX1 && b.ground;
      box(id, at ? (G.players[id].input.act ? 'Pull! Keep holding!' : 'Hold ' + runshipKey(id, 'act') + '!') : 'To the anchor ' + (b.x < P.anchorX0 ? runshipKey(id, 'right') : runshipKey(id, 'left')), C.gold, at);
    }
    return;
  }
  const HM = st.helm, DH = st.deck;
  // the helm
  if (st.hints[HM]) box(HM, st.hints[HM].text, C.ink, false, true);
  else if (nd.wave && !nd.wave.rang && nd.wave.tt < 1.4 && nd.wave.tt > -0.3) {
    const win = st.bellGold ? P.waveWinGold : P.waveWin;
    box(HM, nd.wave.tt <= win ? 'Ring the bell NOW! ' + runshipKey(HM, 'act') : 'Wave! Get ready to ring ' + runshipKey(HM, 'act'), nd.wave.tt <= win ? C.gold : '#d8f0ff', nd.wave.tt <= win);
  } else if (sh.aground) box(HM, 'Aground! Steer away ' + runshipKey(HM, nd.lane < sh.lane ? 'up' : 'down'), '#ff9a9a', true);
  else if (nd.fogBlind && !runshipLookout(st)) box(HM, 'Fog! Ease off ' + runshipKey(HM, 'left') + ' until ' + NAMES[DH] + ' looks out', '#e8eef8', false);
  else if (nd.threat && nd.lane !== sh.lane) box(HM, (nd.lane < sh.lane ? 'Steer up ' + runshipKey(HM, 'up') : 'Steer down ' + runshipKey(HM, 'down')), '#ffe7a8', true);
  // the deckhand
  if (st.hints[DH]) { box(DH, st.hints[DH].text, C.ink, false, true); return; }
  const j = nd.job, b = st.body[DH];
  if (!j) return;
  const dir = j.x != null ? (j.x < b.x ? runshipKey(DH, 'left') : runshipKey(DH, 'right')) : '';
  const near = j.x != null && Math.abs(j.x - b.x) < 22;
  if (j.k === 'hold') box(DH, 'Big wave! Hold ' + runshipKey(DH, 'down') + '!', '#d8f0ff', true);
  else if (j.k === 'tangle') {
    if (b.mode === 'climb') box(DH, Math.abs(b.y - 13 - j.y) < 30 ? 'Hold ' + runshipKey(DH, 'act') + ' to untangle!' : (b.y - 13 > j.y ? 'Climb up ' + runshipKey(DH, 'up') : 'Climb down ' + runshipKey(DH, 'down')), C.gold, Math.abs(b.y - 13 - j.y) < 30);
    else if (b.mode === 'nest') box(DH, 'Climb down ' + runshipKey(DH, 'down') + ' to the knot', C.gold, false);
    else box(DH, near || Math.abs(b.x - P.mastX) < 30 ? 'Climb ' + runshipKey(DH, 'up') + '!' : 'Tangled ropes! ' + dir, C.gold, true);
  } else if (j.k === 'nest') {
    if (b.mode !== 'nest') box(DH, b.mode === 'climb' ? 'Up to the crow\'s nest ' + runshipKey(DH, 'up') : 'Fog! Climb to the crow\'s nest ' + (Math.abs(b.x - P.mastX) < 30 ? runshipKey(DH, 'up') : dir), '#e8eef8', true);
  } else if (b.mode === 'climb' || b.mode === 'nest') {
    if (j.k !== 'idle' && j.k !== 'coin') box(DH, 'Climb down ' + runshipKey(DH, 'down'), '#ffe7a8', false);
  } else if (j.k === 'trim') box(DH, near ? 'Pull the rope! ' + runshipKey(DH, 'act') : 'Flapping sail! To the glowing rope ' + dir, C.gold, near);
  else if (j.k === 'leak') box(DH, near && b.ground && Math.abs(b.y - j.y) < 2 ? 'Hold ' + runshipKey(DH, 'act') + ' to patch!' : 'A leak! ' + dir + (j.y < P.deckY && b.y >= P.deckY ? ' and hop up ' + runshipKey(DH, 'jump') : ''), '#bfefff', near);
  else if (j.k === 'pump' && sh.water > 30) box(DH, near ? 'Pump! ' + runshipKey(DH, 'act') + ' ' + runshipKey(DH, 'act') + ' ' + runshipKey(DH, 'act') : 'Water! To the pump ' + dir, '#bfefff', near);
}

/* ---------- sounds ---------- */
Sfx.extra.runshipWheel = function (p) { this.tone(420 * p, 0.06, 'triangle', 0.035, 300 * p); this.tone(300 * p, 0.05, 'triangle', 0.025, null, 0.05); };
Sfx.extra.runshipCreak = function () { this.tone(180, 0.18, 'sawtooth', 0.02, 120); };
Sfx.extra.runshipBell = function () { this.tone(1318, 0.6, 'sine', 0.06, 1300); this.tone(2637, 0.4, 'sine', 0.02, null, 0.01); this.tone(988, 0.5, 'triangle', 0.03, null, 0.02); };
Sfx.extra.runshipBonk = function () { this.tone(150, 0.2, 'triangle', 0.09, 70); this.tone(420, 0.08, 'square', 0.03, 200); };
Sfx.extra.runshipBump = function () { this.tone(220, 0.12, 'triangle', 0.06, 120); };
Sfx.extra.runshipFree = function () { [523, 659, 784].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.04, null, i * 0.05)); };
Sfx.extra.runshipTreasure = function () { [988, 1319, 1568, 1976].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.04, null, i * 0.05)); };
Sfx.extra.runshipCoin = function (p) { this.tone(1568 * p, 0.06, 'square', 0.03); this.tone(2093 * p, 0.1, 'square', 0.03, null, 0.05); };
Sfx.extra.runshipClink = function () { this.tone(2400, 0.04, 'triangle', 0.02); };
Sfx.extra.runshipRumble = function () { this.tone(110, 0.6, 'triangle', 0.05, 80); this.tone(600, 0.6, 'sawtooth', 0.01, 200); };
Sfx.extra.runshipOver = function () { this.tone(330, 0.3, 'sine', 0.06, 660); [784, 988].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.04, null, 0.2 + i * 0.07)); };
Sfx.extra.runshipWhoosh = function () { this.tone(900, 0.6, 'sawtooth', 0.02, 120); this.tone(200, 0.5, 'sine', 0.07, 70); };
Sfx.extra.runshipSplash = function () { this.tone(500, 0.3, 'sine', 0.06, 1200); };
Sfx.extra.runshipPlop = function () { this.tone(900, 0.3, 'sawtooth', 0.025, 140); this.tone(320, 0.3, 'sine', 0.07, 70); };
Sfx.extra.runshipDolphin = function () { [1760, 2093, 1760, 2349].forEach((f, i) => this.tone(f, 0.06, 'sine', 0.04, f * 1.1, i * 0.07)); };
Sfx.extra.runshipWind = function () { this.tone(400, 0.7, 'sawtooth', 0.012, 900); this.tone(700, 0.6, 'sine', 0.02, 300, 0.1); };
Sfx.extra.runshipSquawk = function () { this.tone(1400, 0.08, 'sawtooth', 0.03, 900); this.tone(1200, 0.1, 'sawtooth', 0.03, 700, 0.1); };
Sfx.extra.runshipTangle = function () { this.tone(300, 0.3, 'sawtooth', 0.02, 150); };
Sfx.extra.runshipTug = function (p) { this.tone(260 * p, 0.05, 'triangle', 0.03, 200 * p); };
Sfx.extra.runshipTap = function (p) { this.tone(900 * p, 0.03, 'square', 0.03); this.tone(200 * p, 0.05, 'triangle', 0.04, null, 0.01); };
Sfx.extra.runshipFixed = function (p) { [659, 784, 1047].forEach((f, i) => this.tone(f * p, 0.09, 'triangle', 0.045, null, i * 0.06)); };
Sfx.extra.runshipPump = function (p) { this.tone(240 * p, 0.1, 'triangle', 0.04, 520 * p); this.tone(1200, 0.08, 'sine', 0.012, 600, 0.05); };
Sfx.extra.runshipHaul = function (p) { this.tone(200 * p, 0.25, 'sawtooth', 0.02, 500 * p); [784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.04, null, 0.2 + i * 0.07)); };
Sfx.extra.runshipStep = function () { this.tone(500, 0.05, 'triangle', 0.03, 700); };
Sfx.extra.runshipGlug = function () { [400, 330, 260].forEach((f, i) => this.tone(f, 0.12, 'sine', 0.05, f * 0.7, i * 0.13)); };
Sfx.extra.runshipSwap = function () { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.runshipHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.runshipLand = function () { [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, null, i * 0.1)); };
Sfx.extra.runshipChain = function () { this.tone(1800 + Math.random() * 400, 0.03, 'square', 0.015); };
Sfx.extra.runshipAnchor = function () { this.tone(140, 0.5, 'triangle', 0.08, 60); this.tone(1200, 0.4, 'sawtooth', 0.02, 200, 0.05); };
Sfx.extra.runshipParty = function () { [392, 494, 587, 784, 988, 784, 988, 1175].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.055, null, i * 0.09)); this.tone(1568, 0.5, 'sine', 0.04, null, 0.75); };
