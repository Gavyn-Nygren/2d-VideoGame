/* Pip & Bo - Level 30-1 The Time Thief: era 'troy' (The Fall of Troy, 1200 BC). */
'use strict';

/* ===== 30-1 era 3: The Fall of Troy (TTH_PHASES.troy) — Gavyn's pick =====
   "Roll the giant wooden horse through the gates with both of you hiding inside, steering and peeking out."
   A sneaky game of red light / green light at dusk (a prank, no fighting): Pip and Bo sit INSIDE the wooden horse
   (drawn as a cutaway, so hide(st) is true and this file draws them) and roll it to the right: across the plain,
   through the Great Gate, along the streets, up onto the city square. The camera scrolls after the horse.
   The stolen thing is the horse itself: the Thief wants the WHOLE horse, so he carries nothing (st.thief.item stays
   null) and the era is won when the horse stands in the square with every guard's lantern on it: far too watched
   to steal.

   THE TWO JOBS (they swap at the end of stretch 1 and 2, tthSwap; room field `first` rolls first):
   - The ROLLER works the wheels in the belly: hold RIGHT to roll (up to 135 px/s), hold DOWN to tiptoe (62 px/s:
     quiet over loose planks and slow enough for the narrow gates), hold LEFT or the action ("brake") to brake. The
     horse is heavy: letting go only coasts (about 200 px from full speed), so braking early matters. It never rolls
     backwards by itself except down a ramp.
   - The LOOKOUT stands in the neck: hold the action ("peek"; up works too) to open the hatch and PEEK.
   - THE TWIST: from inside you cannot see out. With the hatch shut the screen goes dark (a plank curtain) and the
     guards, their lantern beams, the patrol and the signs are hidden. Peeking lights up the scene for BOTH players;
     after the hatch shuts the picture fades in about 1.7 s. And the wheels only turn while there is light (light
     above 0.25: "Too dark to roll!"), so the roller can never clear anything without the lookout, and the lookout
     can never move the horse.
   - RED LIGHT: a guard's lantern beam sweeps the ground. If the horse MOVES (faster than 12 px/s) while a beam is
     on it for 0.14 s: "Hey! That horse moved!". If a beam is on the horse's head while the hatch is OPEN for
     0.3 s: "Hey! Who is peeking?". So the lookout peeks between sweeps and ducks when a beam nears the head; the
     roller rolls in the gaps and is standing still when a beam arrives.
     In the dark there is one cue left: gold light leaks through the planks exactly where a beam is on the horse
     (and "FREEZE!" shows under it), so nobody has to open the hatch into a beam blind.
   - CAUGHT is a soft fail (a counted bump for the player whose job it was): every lantern swings to the horse, a
     guard trots up, wheels it back 130 px (never past the last safe spot), shrugs "Just a horse..." and leaves;
     about 4 s in all. The guards then rest a full nap, so there is always a gap to go on.

   THE COURSE (TTHTROY_STRETCHES; each stretch adds something new, with a safe breather and a job swap between):
     1 The Plain        one slow guard on a watchtower, a hill (ramp up, ramp down), the wall guard, then the Great
                        Gate (a narrow gate: tiptoe through).
     2 The Streets      the Thief's first claw grab, two guards whose beams overlap with different rhythms, a loose
                        plank (noise), a patrol that walks up and knocks on the horse, a guard the Thief wakes with a
                        bell.
     3 To the Square    a fast guard with a loose plank in his beam, a second patrol, two overlapping guards, a
                        narrow alley arch, the bell again, the Thief's stronger claw, the ramp up to the square, one
                        last guard, then park on the gold star.
   HAZARDS and their telegraphs:
   - Guards (TTHTROY.spot): each has a strip of ground (zone) and a rhythm: nap (rest s), raise the lantern with a
     "?" (0.8 s, the telegraph), sweep the beam once across the zone (v px/s), nap again. mode 'r' always sweeps from
     the right (the head is hit first), 'l' from the left (the tail first), 'pp' back and forth. A guard only starts
     his rhythm when the horse comes near (the same first sweep for every pair) and stops when it has passed.
   - Loose planks: rolling the front wheel over one faster than 82 px/s goes "CLONK!": the nearest guard looks over
     ("?" for 0.8 s, then his beam runs to the horse and stays 1.6 s). Stand still with the hatch shut and nothing
     happens; it is no bump. Tiptoeing over it is silent ("Shh...").
   - Narrow gates (the Great Gate, the alley arch): while the nose passes through (120 px) the horse must be slower
     than 82 px/s, or "Scrape!" (a team bump): it bounces back out and the noise makes a guard look.
   - Ramps: uphill the wheels barely beat the slope, so the roller must keep rolling and the lookout must keep the
     light on; stopping, tiptoeing or losing the light on the slope rolls the horse back down to the foot ("Rolling
     back!", not a bump). Braking holds the horse on a slope.
   - The patrol: a guard with a hand lantern walks up from the right (footsteps; "tap tap" shows in the dark), stops
     at the nose, knocks twice ("Knock! Knock!"), says "Nice horse..." and walks on past. His lantern counts as a
     beam from about 130 px in front of him: freeze, hatch shut, for about 5 s.
   - The Thief's claw (twice): "That horse is MINE!" and the claw rope comes down for 1.3 s, then it hooks the ring
     on the horse's neck and he drags the horse backwards (at most 170 px). The roller holds RIGHT to pull against
     him; the lookout holds the action to unhook the claw (1.5 s, the second time 2.2 s). The ring only fills while
     the roller is pulling, and drains when either lets go, so it takes both at once. The guards look away meanwhile.
   - The Thief's bell (twice): he flies to a bell, "Wakey wakey, guards!" (1.2 s), then rings it: the sleeping guard
     there wakes up and joins in.
   GOLD HELP (announced with tthHelp, never hidden):
   - 2 catches by the same guard: "a sleepy guard" (naps 1.6x longer); 4: "extra sleepy" (2.4x, slower beam).
   - 2 catches by a patrol: the next patrol hurries past.       - 2 scrapes at a gate: a wider gate (up to 125 px/s).
   - 2 roll-backs on a ramp: a gentler ramp (it can be climbed from a standstill).
   - 14 s of tugging at the claw: a rusty claw (comes off twice as fast and never drains).
   - 22 s without any progress: gold hints over both heads say whose turn it is.
   FAIRNESS: every beam is telegraphed 0.8 s and moves at most 210 px/s (braking from full speed takes 0.5 s); the
   red "!" (tthWarn) shows over the roller when a beam will reach the moving horse within 0.7 s and over the lookout
   when one will reach the head within 0.6 s with the hatch open. Nothing can catch the horse during cards,
   cutscenes, the swap breather, the claw, a catch, or for 1.1 s after any of them; guards rest and the clock stops
   while nobody plays (tthCalm). Ramps, gates, claws and the stretch ends lie outside every beam.
   The Thief (on screen all era, hovering top right): taunts, tips off the patrol, rings bells, hooks the horse.
   History (news line and taunts): the story of the wooden horse comes from ancient Greek poems, about 3,200 years
   ago; nobody knows if it really happened.
   Stats (st.stats.troy): stretchT [s], caught, moved, seen, scrapes, clonks, quiet (silent planks), rollbacks,
   unhooks, peeks. Every top-level name starts with tthTroy / TTHTROY (Sfx.extra.tthTroy*). State: st.ph. */
const TTHTROY = {
  ground: 452, hs: 0.92, startX: 250, camLead: 370, perchY: 218,
  vmax: 135, acc: 115, brake: 280, fric: 42, creep: 62, creepDec: 170, still: 12, grav: 560, vDown: 172,
  glowHold: 0.45, glowFade: 1.3, rollLight: 0.25,
  body: [-104, 114], head: [50, 118], wheel: 74,       // the horse's ends, its head and its wheels from its centre (px)
  movedGrace: 0.14, seenGrace: 0.3, wake: 520,
  spot: { w: 104, tele: 0.8, lookV: 430, lookT: 1.6 },
  caught: { freeze: 0.7, push: 1.2, back: 130, done: 2.5, grace: 1.1 },
  slow: 82, slowGold: 125, gateLen: 120, gateBounce: 46,
  patrol: { v: 100, reach: 130, knock: 1.1, spawn: 650 },
  claw: { tele: 1.3, pull: 70, slack: 170, drain: 0.5, goldT: 14 },
  bellTele: 1.2, park: [-50, 70], swapT: 2.6,
  goldMiss: 2, goldMiss2: 4, restK: [1, 1.6, 2.4], stuckT: 22,
};
// The course. All x are px from the stretch's start; len is the stretch's length (the last one ends on the gold star).
// guards: z [from, to] the strip the beam sweeps, v px/s, rest s between sweeps, first s before the first sweep,
// mode 'r' | 'l' | 'pp', perch 'tower' | 'wall' | 'roof', asleep (until the Thief's bell).  ramps: [x, length, rise].
const TTHTROY_STRETCHES = [
  { name: 'The Plain', len: 2330,
    guards: [{ z: [480, 900], v: 150, rest: 3.8, first: 1.4, mode: 'r', perch: 'tower' },
      { z: [1700, 1960], at: 1780, v: 170, rest: 3.2, first: 1.2, mode: 'pp', perch: 'wall' }],
    ramps: [[1060, 200, 44], [1330, 190, -44]], hides: [1000], gates: [2240] },
  { name: 'The Streets', len: 2240,
    claws: [{ x: 170, hold: 1.5 }],
    guards: [{ z: [520, 900], v: 175, rest: 3.2, first: 1.2, mode: 'pp' },
      { z: [800, 1180], v: 150, rest: 2.8, first: 2.6, mode: 'l' },
      { z: [1700, 2060], v: 190, rest: 2.5, first: 1.6, mode: 'pp', asleep: true }],
    bumps: [1040], hides: [1345], patrols: [1360], bells: [{ x: 1500, at: 1930, g: 2 }] },
  { name: 'To the Square', len: 2880,
    guards: [{ z: [260, 640], v: 210, rest: 2.4, first: 1.0, mode: 'pp' },
      { z: [960, 1320], v: 190, rest: 2.7, first: 1.2, mode: 'r' },
      { z: [1200, 1560], v: 165, rest: 3.0, first: 2.6, mode: 'l' },
      { z: [2400, 2700], v: 200, rest: 2.6, first: 1.4, mode: 'pp', asleep: true }],
    bumps: [470], patrols: [790], hides: [770, 1700], gates: [1810], bells: [{ x: 1850, at: 2640, g: 3 }],
    claws: [{ x: 1900, hold: 2.2, strong: true }], ramps: [[1990, 200, 46]] },
];
const TTHTROY_LINES = ['I\'m taking the WHOLE horse!', 'Nobody knows if this horse was real...', '...so nobody will miss it! Ha!', 'Tick, tock, slowpokes!',
  'A horse on wheels? MINE!', 'Shhh! Hee hee hee.'];
const TTHTROY_FACTS = ['The story of the wooden horse comes from Greek poems about 3,200 years old.', 'Nobody knows if the wooden horse really happened. What a prank, though!'];
const tthTroySolo = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

/* ---------- the course: stretches -> guards, ramps, planks, gates, patrols, claws, bells, safe spots ---------- */
function tthTroyCompile() {
  const K = TTHTROY, c = { guards: [], ramps: [], bumps: [], gates: [], patrols: [], claws: [], bells: [], hides: [], ends: [], starts: [] };
  let x0 = 0;
  TTHTROY_STRETCHES.forEach((S, k) => {
    c.starts.push(x0);
    const g0 = c.guards.length;
    for (const g of S.guards || []) {
      c.guards.push(Object.assign({ w: K.spot.w, tele: K.spot.tele, mode: 'pp', first: 1.2, perch: 'roof', asleep: false }, g, {
        i: c.guards.length, k, z0: x0 + g.z[0], z1: x0 + g.z[1], x: x0 + (g.at != null ? g.at : (g.z[0] + g.z[1]) / 2), py: K.perchY,
        state: g.asleep ? 'asleep' : 'idle', t: 0, sx: x0 + g.z[1], dir: -1, face: -1, on: 0, up: 0, miss: 0, gold: 0, n: 0, lp: '', sv: 0 }));
    }
    for (const r of S.ramps || []) c.ramps.push({ x0: x0 + r[0], len: r[1], rise: r[2], miss: 0, gold: false, rb: false });
    for (const b of S.bumps || []) c.bumps.push({ x: x0 + b, hit: 0, t: 9 });
    for (const g of S.gates || []) c.gates.push({ x: x0 + g, k, t: 0, miss: 0, gold: false, alley: k > 0 });
    for (const p of S.patrols || []) c.patrols.push({ x: x0 + p, done: false });
    for (const q of S.claws || []) c.claws.push({ x: x0 + q.x, hold: q.hold, strong: !!q.strong, done: false });
    for (const b of S.bells || []) c.bells.push({ x: x0 + b.x, at: x0 + b.at, g: c.guards[g0 + b.g], done: false, swing: 0 });
    for (const hd of S.hides || []) c.hides.push({ x: x0 + hd, got: false, end: false });
    x0 += S.len;
    c.ends.push(x0);
    if (k < TTHTROY_STRETCHES.length - 1) c.hides.push({ x: x0, got: false, end: true });
  });
  c.hides.sort((a, b) => a.x - b.x);
  c.goal = x0; c.gateX = c.gates[0].x; c.xMax = x0 + 640;
  // the square's own guards: they only join in at the very end (every lantern on the horse)
  for (const dx of [-250, 210, 400]) c.guards.push({ i: c.guards.length, k: 2, deco: true, x: x0 + dx, py: K.perchY, z0: x0, z1: x0, w: K.spot.w, state: 'deco', perch: 'col', t: 0, sx: x0 + dx, dir: -1, face: dx > 0 ? -1 : 1, on: 0, up: 0, miss: 0, gold: 0, sv: 0 });
  return c;
}
// the road's height under x (ramps are smooth)
function tthTroyGy(ph, x) {
  let y = TTHTROY.ground;
  for (const r of ph.c.ramps) {
    if (x <= r.x0) continue;
    const u = Math.min(1, (x - r.x0) / r.len);
    y -= r.rise * (u * u * (3 - 2 * u));
  }
  return y;
}
// a point of the horse (its own units: x toward the nose, y up is negative, origin on the road under its middle)
function tthTroyPt(h, lx, ly) {
  const s = TTHTROY.hs, c = Math.cos(h.tilt), n = Math.sin(h.tilt);
  return { x: h.x + (lx * c - ly * n) * s, y: h.y + (lx * n + ly * c) * s };
}
function tthTroyTerrain(ph) {
  const h = ph.h, wb = TTHTROY.wheel, yF = tthTroyGy(ph, h.x + wb), yB = tthTroyGy(ph, h.x - wb);
  h.y = (yF + yB) / 2; h.tilt = Math.atan2(yF - yB, 2 * wb);
}
// where each player sits (horse units): the roller at the crank in the belly, the lookout on the ladder in the neck
function tthTroySeat(ph, id) {
  const roll = { x: -16 - 26 * ph.lean, y: -100 }, look = { x: 80, y: -198 - 42 * ph.peek };
  const mine = id === ph.roller ? roll : look;
  if (ph.seatU >= 1) return mine;
  const from = id === ph.roller ? look : roll, u = ph.seatU, e = u * u * (3 - 2 * u);
  return { x: from.x + (mine.x - from.x) * e, y: from.y + (mine.y - from.y) * e - Math.sin(u * Math.PI) * 22 };
}
// keep p.x / p.y on the heroes (hints, badges, name tags and the computer's bubbles sit over p)
function tthTroySeats(st) {
  const ph = st.ph;
  for (const p of G.players) {
    const s = tthTroySeat(ph, p.id), w = tthTroyPt(ph.h, s.x, s.y);
    p.x = w.x - p.w / 2; p.y = w.y - p.h; p.vx = 0; p.vy = 0; p.grounded = true; p.alive = true; p.stun = 0; p.sx = 1; p.sy = 1;
    p.face = p.id === ph.roller ? (ph.lean > 0.5 ? -1 : 1) : 1;
  }
}
const tthTroyEvent = ph => !!(ph.caught || ph.swap || ph.done || ph.claw);
// seconds until a spot (moving at s.v) reaches the strip [a0, a1] of a horse moving at hv (0 = on it, Infinity = never)
function tthTroyEta(s, a0, a1, hv) {
  if (s.x1 > a0 && s.x0 < a1) return 0;
  if (s.x0 >= a1) { const cl = hv - s.v; return cl > 1 ? (s.x0 - a1) / cl : Infinity; }
  const cl = s.v - hv; return cl > 1 ? (a0 - s.x1) / cl : Infinity;
}

/* ---------- setup ---------- */
function tthTroySetup(st, L) {
  const K = TTHTROY, ph = st.ph;
  Object.assign(ph, {
    c: tthTroyCompile(), t: 0, t0: 0, k: 0, roller: L.def.first ? 1 : 0,
    h: { x: K.startX, v: 0, y: K.ground, tilt: 0, rot: 0 },
    peek: 0, light: 1, glowT: 3, force: 0, lean: 0, seatU: 1,
    spots: [], lit: false, lit0: 0, lit1: 0, frz: 0, movedT: 0, seenT: 0, grace: 2, hush: 0, wasCalm: true,
    caught: null, pusher: null, patrol: null, claw: null, bell: null, swap: null, done: null, kick: null, parkT: 0,
    cpX: K.startX, cpN: 0, patMiss: 0, fw0: K.startX + K.wheel,
    bestX: K.startX, stuckT: 0, stuckN: 0, hintT: 0.8, darkTry: 0, tauntT: 5, tauntN: 0, laughT: 0, dustT: 0, creakT: 0, stepT: 0,
    rolled: false, peeked: false,
  });
  tthTroyTerrain(ph);
  st.cam.x = 0; st.cam.y = 0;
  tthTroySeats(st);
  Object.assign(st.thief, { x: 776, y: 264, s: 0.8, face: -1, pose: 'laugh', jet: true, item: null, claw: 0.15 });
  Object.assign(tthStats(st), { stretchT: [], caught: 0, moved: 0, seen: 0, scrapes: 0, clonks: 0, quiet: 0, rollbacks: 0, unhooks: 0, peeks: 0, patrols: 0 });
  tthNews(st, 'Sneak the wooden horse into Troy! Freeze when a lantern beam touches it.', false, 6);
}

/* ---------- the hatch and the light ---------- */
function tthTroyHatch(st, dt, want) {
  const ph = st.ph, K = TTHTROY, was = ph.peek > 0.5;
  ph.peek = approach(ph.peek, want ? 1 : 0, dt / 0.12);
  const open = ph.peek > 0.5;
  if (open !== was) { Sfx.play(open ? 'tthTroyPeek' : 'tthTroyShut'); if (open) { tthStats(st).peeks++; ph.peeked = true; } }
  if (ph.force > 0) ph.force -= dt;
  if (open || ph.force > 0) { ph.light = approach(ph.light, 1, dt / 0.14); ph.glowT = K.glowHold; }
  else if (ph.glowT > 0) ph.glowT -= dt;
  else ph.light = approach(ph.light, 0, dt / K.glowFade);
}

/* ---------- the wheels ---------- */
function tthTroyDrive(st, dt, w) {
  const ph = st.ph, K = TTHTROY, h = ph.h, lit = ph.light >= K.rollLight;
  const ramp = ph.c.ramps.find(r => h.x > r.x0 - 90 && h.x < r.x0 + r.len + 90) || null;
  const ag = K.grav * Math.sin(h.tilt) * (ramp && ramp.gold ? 0.5 : 1);   // the slope's pull along the road (uphill: negative)
  let v = h.v;
  if (ph.kick != null) {   // bounced back out of a gate
    const d = ph.kick - h.x, s = 420 * dt;
    if (Math.abs(d) <= s) { h.x = ph.kick; ph.kick = null; } else h.x += Math.sign(d) * s;
    h.rot += Math.sign(d) * s / (20 * K.hs); h.v = 0; ph.fw0 = h.x + K.wheel;
    return;
  }
  if (ph.claw && ph.claw.st === 'tug') {
    // the Thief drags the horse backwards (at most the slack); rolling against him holds it and wins a little back
    const cl = ph.claw, lim = cl.x0 - K.claw.slack;
    cl.pulling = w.roll && lit && !w.brake;
    if (cl.pulling) v = approach(v, h.x < cl.x0 - 2 ? (cl.strong ? 16 : 28) : 0, 220 * dt);
    else v = approach(v, h.x > lim ? -(w.brake ? 24 : K.claw.pull) : 0, 150 * dt);
    if (h.x <= lim && v < 0) v = 0;
    if (w.roll && !lit) ph.darkTry = 0.3;
  } else if (tthTroyEvent(ph)) v = approach(v, 0, K.brake * 1.6 * dt);
  else if (w.brake) v = approach(v, 0, K.brake * dt);
  else if (w.roll && lit) v += (K.acc + ag) * dt;
  else if (w.creep && lit) v = v > K.creep ? Math.max(K.creep, v - K.creepDec * dt) : Math.min(K.creep, v + (K.acc + Math.min(0, ag)) * dt);
  else {
    if ((w.roll || w.creep) && !lit) ph.darkTry = 0.3;
    v += ag * dt; v = approach(v, 0, K.fric * dt);
  }
  const top = ag > 8 ? K.vDown : K.vmax;
  if (v > top) v = Math.max(top, v - 220 * dt);
  v = Math.max(v, -150);
  h.x += v * dt; h.rot += v * dt / (20 * K.hs);
  if (h.x < K.startX - 60) { h.x = K.startX - 60; v = Math.max(0, v); }
  const wall = ph.c.goal + K.park[1];
  if (h.x > wall) { h.x = wall; if (v > 60) { Sfx.play('tthTroyKnock'); tthPop(st, h.x + K.body[1], h.y - 120, 'Whoa!', '#ffffff', 16); } v = 0; }
  h.v = v;
  if (Math.abs(v) > 20) ph.rolled = true;
}
// stopping, tiptoeing or losing the light on a ramp: the horse rolls back down ("Rolling back!", not a bump)
function tthTroyRamps(st) {
  const ph = st.ph, h = ph.h, K = TTHTROY;
  for (const r of ph.c.ramps) {
    if (r.rise <= 0) continue;
    const on = h.x > r.x0 - 60 && h.x < r.x0 + r.len + 60;
    if (on && h.v < -24 && !r.rb && !tthTroyEvent(ph)) {
      r.rb = true; r.miss++; tthStats(st).rollbacks++;
      tthPop(st, h.x, h.y - 270, 'Rolling back!', '#ffffff', 20); Sfx.play('tthTroyNope');
      const rl = ph.roller, lk = 1 - rl;
      tthHint(st, rl, 'Hold ' + tthKey(rl, 'right') + ' all the way up!', { cpu: 'I\'ll roll all the way up!' });
      tthHint(st, lk, 'Keep peeking up the ramp!', { cpu: 'I\'ll keep the light on!' });
      if (r.miss === K.goldMiss) { r.gold = true; tthHelp(st, 'Gold help: a gentler ramp! Roll on up.'); }
    } else if (r.rb && h.v > 40) r.rb = false;
  }
}

/* ---------- the guards and their beams ---------- */
function tthTroyGuards(st, dt, calm) {
  const ph = st.ph, K = TTHTROY, h = ph.h, spots = ph.spots;
  spots.length = 0;
  const hush = calm || ph.hush > 0 || tthTroyEvent(ph);
  for (const g of ph.c.guards) {
    if (g.deco && g.state !== 'cheer') continue;
    const rk = K.restK[g.gold], near = h.x + K.body[1] > g.z0 - K.wake && h.x + K.body[0] < g.z1 + g.w / 2 + 30;
    let beam = false, live = false;
    switch (g.state) {
      case 'idle': if (near && !hush) { g.state = 'rest'; g.t = g.first; } break;
      case 'rest':
        if (!near) { g.state = 'idle'; break; }
        if (hush) { g.t = Math.max(g.t, 0.9); break; }
        if ((g.t -= dt) <= 0) {
          g.state = 'tele'; g.t = g.tele;
          g.dir = g.mode === 'r' ? -1 : g.mode === 'l' ? 1 : (g.n % 2 ? 1 : -1);
          g.sx = g.dir > 0 ? g.z0 : g.z1; g.face = g.sx >= g.x ? 1 : -1;
          Sfx.play('tthTroyHm');
        }
        break;
      case 'tele':
        if (hush) { g.state = 'rest'; g.t = g.rest * rk; break; }
        if ((g.t -= dt) <= 0) { g.state = 'sweep'; Sfx.play('tthTroySweep'); }
        break;
      case 'sweep':
        if (hush) { g.state = 'rest'; g.t = g.rest * rk; break; }
        g.sv = g.dir * g.v * (g.gold > 1 ? 0.8 : 1); g.sx += g.sv * dt; beam = live = true;
        if (g.dir > 0 ? g.sx >= g.z1 : g.sx <= g.z0) { g.state = 'rest'; g.t = g.rest * rk; g.n++; }
        break;
      case 'look':   // a noise: "?" (the telegraph), then the beam runs to the horse and stays on it a while
        if (hush) { g.state = 'rest'; g.t = g.rest * rk; break; }
        if (g.lp === 'tele') { if ((g.t -= dt) <= 0) { g.lp = 'go'; Sfx.play('tthTroySweep'); } }
        else if (g.lp === 'go') {
          const d = h.x - g.sx; beam = live = true;
          if (Math.abs(d) <= K.spot.lookV * dt) { g.sx = h.x; g.sv = 0; g.lp = 'hold'; g.t = K.spot.lookT; }
          else { g.sv = Math.sign(d) * K.spot.lookV; g.sx += g.sv * dt; }
        } else { beam = live = true; g.sv = 0; if ((g.t -= dt) <= 0) { g.state = 'rest'; g.t = g.rest * rk; } }
        break;
      case 'alert': case 'cheer':   // every lantern on the horse (a catch, the happy end): these catch nothing
        g.sx += (h.x + (g.off || 0) - g.sx) * Math.min(1, dt * 7); g.sv = 0; beam = true;
        break;
    }
    if (beam) g.face = g.sx >= g.x ? 1 : -1;
    g.on = approach(g.on, beam ? 1 : 0, dt / 0.14);
    g.up = approach(g.up, beam || g.state === 'tele' || g.state === 'look' ? 1 : 0, dt / 0.22);
    if (beam) spots.push({ x0: g.sx - g.w / 2, x1: g.sx + g.w / 2, v: g.sv, g, live, pat: false });
  }
}
// a noise (a loose plank, a scrape): the nearest guard looks over
function tthTroyNoise(st) {
  const ph = st.ph, h = ph.h;
  let best = null;
  for (const g of ph.c.guards) {
    if (g.deco || g.state === 'asleep' || g.state === 'alert' || Math.abs(g.x - h.x) > 640) continue;
    if (!best || Math.abs(g.x - h.x) < Math.abs(best.x - h.x)) best = g;
  }
  if (!best) return false;
  if (best.state !== 'look') { if (best.on < 0.5) best.sx = best.x + Math.sign(h.x - best.x) * 30; best.state = 'look'; best.lp = 'tele'; best.t = TTHTROY.spot.tele; }
  tthPop(st, best.x, best.py - 78, 'What was that?', '#ffe28a', 16); Sfx.play('tthTroyHm');
  return true;
}
// the patrol: walks up from the right, knocks on the horse, walks on past. His hand lantern counts as a beam.
function tthTroyPatrol(st, dt, calm) {
  const ph = st.ph, K = TTHTROY, P = K.patrol, h = ph.h, pt = ph.patrol;
  if (!pt) return;
  const fast = ph.patMiss >= K.goldMiss, v = P.v * (fast ? 1.5 : 1);
  pt.t += dt;
  if (calm && pt.state !== 'gone') { pt.walk = false; return; }   // (nobody plays, or a celebration: he waits, lantern down)
  pt.walk = true;
  if (pt.state === 'walk') {
    pt.x -= v * dt;
    if (pt.x <= h.x + K.body[1] + 34) { pt.state = 'knock'; pt.k = 0; pt.n = 0; }
  } else if (pt.state === 'knock') {
    pt.walk = false; pt.k += dt;
    const kt = P.knock * (fast ? 0.5 : 1);
    if (pt.n < 2 && pt.k > kt * (0.2 + 0.4 * pt.n)) { pt.n++; Sfx.play('tthTroyKnock'); tthPop(st, h.x + K.body[1] + 4, h.y - 150 - pt.n * 18, 'Knock!', '#ffe28a', 18); }
    if (pt.k >= kt) { pt.state = 'pass'; tthPop(st, pt.x, h.y - 96, 'Nice horse...', '#ffffff', 16); }
  } else if (pt.state === 'pass') {
    pt.x -= v * dt;
    if (pt.x + 12 < h.x + K.body[0] - 6) { pt.state = 'gone'; tthStats(st).patrols++; }
  } else {
    pt.x -= v * 1.25 * dt;
    if (pt.x < st.cam.x - 60) { ph.patrol = null; return; }
  }
  if (pt.walk && (ph.stepT -= dt) <= 0) { ph.stepT = 0.34; Sfx.play('tthTroyStep'); }
  if (pt.state !== 'gone') ph.spots.push({ x0: pt.x - P.reach, x1: pt.x + 12, v: pt.state === 'knock' ? 0 : -v, g: null, live: true, pat: true });
}
// the guard who wheels the horse back after a catch walks off again
function tthTroyPusher(st, dt) {
  const ph = st.ph, pu = ph.pusher;
  if (!pu || pu.state !== 'leave') return;
  pu.x += pu.dir * 135 * dt; pu.walk = true; pu.face = pu.dir; pu.push = false;
  if (pu.x > st.cam.x + W + 60 || pu.x < st.cam.x - 60) ph.pusher = null;
}

/* ---------- caught: "Hey! That horse moved!" ---------- */
// which part of the horse is in a beam right now (the gold light through the planks, "FREEZE!")
function tthTroyLit(ph, dt) {
  const K = TTHTROY, h = ph.h, b0 = h.x + K.body[0], b1 = h.x + K.body[1];
  let x0 = Infinity, x1 = -Infinity;
  for (const s of ph.spots) if (s.x1 > b0 && s.x0 < b1) { x0 = Math.min(x0, s.x0); x1 = Math.max(x1, s.x1); }
  ph.lit = x1 > x0; ph.lit0 = x0 - h.x; ph.lit1 = x1 - h.x;
  ph.frz = approach(ph.frz, ph.lit && !ph.done ? 1 : 0, dt / 0.12);
}
function tthTroyWatch(st, dt, calm) {
  const ph = st.ph, K = TTHTROY, h = ph.h;
  if (calm || ph.grace > 0 || ph.kick != null || tthTroyEvent(ph)) { ph.movedT = ph.seenT = 0; return; }
  const b0 = h.x + K.body[0], b1 = h.x + K.body[1], e0 = h.x + K.head[0], e1 = h.x + K.head[1];
  const moving = Math.abs(h.v) > K.still, open = ph.peek > 0.5, seeing = ph.light > 0.3;
  let onBody = null, onHead = null, soonBody = false, soonHead = false;
  for (const s of ph.spots) {
    if (!s.live) continue;
    if (s.x1 > b0 && s.x0 < b1) { onBody = onBody || s; if (s.x1 > e0 && s.x0 < e1) onHead = onHead || s; }
    if (seeing && moving && tthTroyEta(s, b0, b1, h.v) < 0.7) soonBody = true;
    if (seeing && open && tthTroyEta(s, e0, e1, h.v) < 0.6) soonHead = true;
  }
  if (soonBody) tthWarn(st, ph.roller, 0.25);
  if (soonHead) tthWarn(st, 1 - ph.roller, 0.25);
  if (onBody && moving) { if ((ph.movedT += dt) > K.movedGrace) { tthTroyCaught(st, 'moved', onBody); return; } } else ph.movedT = Math.max(0, ph.movedT - dt * 2);
  if (onHead && open) { if ((ph.seenT += dt) > K.seenGrace) tthTroyCaught(st, 'seen', onHead); } else ph.seenT = Math.max(0, ph.seenT - dt * 2);
}
function tthTroyCaught(st, kind, s) {
  const ph = st.ph, K = TTHTROY, h = ph.h, S = tthStats(st), rl = ph.roller, lk = 1 - rl;
  const p = G.players[kind === 'moved' ? rl : lk];
  st.safe[p.id] = 0;
  tthBonk(st, p, { still: true, kind: 'troy-' + kind, word: kind === 'moved' ? 'It moved!' : 'Spotted!', at: tthTroyPt(h, kind === 'seen' ? 84 : -10, kind === 'seen' ? -306 : -218), safe: 0.5 });
  S.caught++; S[kind]++;
  tthNews(st, kind === 'moved' ? '"Hey! That horse moved!"' : '"Hey! Who is peeking up there?"', false, 2.6);
  Sfx.play('tthTroyHey');
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.3);
  h.v = 0; ph.movedT = ph.seenT = 0;
  ph.caught = { t: 0, kind, from: h.x, to: Math.max(Math.min(h.x, ph.cpX), h.x - K.caught.back), said: false, shrug: false };
  // every lantern nearby swings to the horse
  for (const g of ph.c.guards) {
    if (g.deco || g.state === 'asleep' || Math.abs(g.x - h.x) > 700) continue;
    if (g.on < 0.5) g.sx = g.x;
    g.state = 'alert'; g.off = (g.i % 3 - 1) * 46;
  }
  // the guard who comes over: the patrol if it was him, else one trots in from the right
  const pt = ph.patrol && ph.patrol.state !== 'gone' ? ph.patrol : null, px = pt ? pt.x : st.cam.x + W + 40;
  ph.pusher = { x: px, x0: px, state: 'come', dir: pt ? -1 : 1, walk: true, face: -1, push: false };
  if (pt) ph.patrol = null;
  // gold help: the same guard (or the patrol) caught the horse again
  if (s.pat) { if (++ph.patMiss === K.goldMiss) tthHelp(st, 'Gold help: the next patrol hurries past!'); }
  else if (s.g) {
    const g = s.g; g.miss++;
    if (g.miss === K.goldMiss || g.miss === K.goldMiss2) { g.gold++; tthHelp(st, g.gold > 1 ? 'Gold help: an extra sleepy guard! Even longer naps.' : 'Gold help: a sleepy guard! He naps longer between sweeps.'); }
  }
  if (kind === 'moved') tthHint(st, rl, 'Brake before the beam: ' + tthKey(rl, 'left') + '!', { life: 3.4, cpu: 'Oops! I\'ll brake sooner.' });
  else tthHint(st, lk, 'Let go of ' + tthKey(lk, 'act') + ' when a beam nears the head!', { life: 3.4, cpu: 'Oops! I\'ll duck sooner.' });
  if (S.caught % 3 === 1) { tthReact(st, 'happy', 'Ha ha! Busted!', 1.8); ph.laughT = 1.6; }
}
function tthTroyCaughtStep(st, dt) {
  const ph = st.ph, K = TTHTROY, Q = K.caught, cg = ph.caught, h = ph.h, pu = ph.pusher;
  cg.t += dt; ph.force = 0.3; h.v = 0;
  const nose = h.x + K.body[1] + 30;
  if (cg.t < Q.freeze) {
    const u = cg.t / Q.freeze, e = u * u * (3 - 2 * u);
    pu.x = pu.x0 + (nose - pu.x0) * e; pu.walk = true; pu.face = pu.x0 > nose ? -1 : 1;
  } else if (cg.t < Q.freeze + Q.push) {
    const u = (cg.t - Q.freeze) / Q.push, e = u * u * (3 - 2 * u), x = cg.from + (cg.to - cg.from) * e;
    h.rot += (x - h.x) / (20 * K.hs); h.x = x; ph.fw0 = h.x + K.wheel;
    pu.x = h.x + K.body[1] + 30; pu.walk = cg.to < cg.from - 4; pu.face = -1; pu.push = true;
    if (!cg.said && pu.walk) { cg.said = true; tthPop(st, pu.x, h.y - 104, 'Back you go!', '#ffffff', 16); Sfx.play('tthTroyRoll'); }
  } else {
    pu.walk = false; pu.push = false;
    if (!cg.shrug) { cg.shrug = true; tthPop(st, pu.x, h.y - 104, 'Just a horse...', '#ffffff', 18); Sfx.play('tthTroyHm'); }
    if (cg.t >= Q.done) {
      ph.caught = null; ph.grace = Q.grace; ph.stuckT = 0;
      for (const g of ph.c.guards) if (g.state === 'alert') { g.state = 'rest'; g.t = g.rest * K.restK[g.gold]; }
      pu.state = 'leave';
    }
  }
}

/* ---------- the road: narrow gates and loose planks ---------- */
function tthTroyRoad(st, dt) {
  const ph = st.ph, K = TTHTROY, h = ph.h, c = ph.c, S = tthStats(st), nose = h.x + K.body[1], fw = h.x + K.wheel, rl = ph.roller;
  if (!tthTroyEvent(ph) && ph.kick == null) for (const g of c.gates) {
    if (!(nose > g.x && nose < g.x + K.gateLen && h.v > (g.gold ? K.slowGold : K.slow))) { g.t = 0; continue; }
    if ((g.t += dt) <= 0.1) continue;
    g.t = 0; g.miss++; S.scrapes++;
    tthBump(st, { word: 'Scrape!', kind: 'troy-scrape', x: g.x + 20, y: h.y - 200, safe: 0.8 });
    ph.kick = g.x - K.body[1] - K.gateBounce; h.v = 0;
    Sfx.play('tthTroyScrape'); burst(g.x + 6, h.y - 170, '#ffe28a', 10);
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.3);
    tthTroyNoise(st);
    tthHint(st, rl, 'Too fast! Hold ' + tthKey(rl, 'down') + ' to tiptoe', { life: 3.4, cpu: 'Too fast! I\'ll tiptoe.' });
    if (g.miss === K.goldMiss) { g.gold = true; tthHelp(st, 'Gold help: a wider gate! A bit faster is fine now.'); }
  }
  for (const b of c.bumps) {
    b.t += dt;
    if (!(ph.fw0 < b.x && fw >= b.x)) continue;
    b.t = 0;
    if (h.v > K.slow) {
      b.hit++; S.clonks++;
      tthPop(st, b.x, h.y - 60, 'CLONK!', '#ffe28a', 24); Sfx.play('tthTroyClonk');
      if (!reduceMotion) G.shake = Math.max(G.shake, 0.22);
      puff(b.x, h.y, 8, 'rgba(230,200,150,0.8)');
      if (tthTroyNoise(st)) tthNews(st, 'A guard heard that! Freeze, hatch shut!', false, 2.6);
    } else { S.quiet++; tthPop(st, b.x, h.y - 50, 'Shh...', '#ffffff', 15); }
  }
  ph.fw0 = fw;
}

/* ---------- the Thief's tricks: the claw and the bell ---------- */
function tthTroyClawStep(st, dt, w) {
  const ph = st.ph, K = TTHTROY, Q = K.claw, cl = ph.claw, h = ph.h, rl = ph.roller, lk = 1 - rl;
  cl.t += dt;
  if (cl.st === 'tele') {
    cl.rope = Math.min(1, cl.t / Q.tele);
    if (cl.t >= Q.tele) {
      cl.st = 'tug'; cl.t = 0; cl.x0 = h.x; cl.hintT = 0;
      Sfx.play('tthTroyHook'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.3);
      tthSay(st, 'Heave! Heave! It\'s MINE!', 2);
    }
    return;
  }
  if (cl.st === 'tug') {
    cl.T += dt;
    const hold = cl.hold * (cl.gold ? 0.5 : 1), unhook = ph.peek > 0.8 && w.peek;
    if (unhook && cl.pulling && h.v > -14) cl.u += dt / hold;
    else if (!cl.gold) cl.u = Math.max(0, cl.u - dt * Q.drain);
    if (!cl.gold && cl.T > Q.goldT) { cl.gold = true; tthHelp(st, 'Gold help: a rusty claw! It comes off faster.'); }
    if ((cl.hintT -= dt) <= 0) {
      cl.hintT = 2.4;
      if (!cl.pulling) tthHint(st, rl, 'Hold ' + tthKey(rl, 'right') + ': pull against him!', { life: 2.2, cpu: ph.light < K.rollLight ? 'Too dark to pull! Peek!' : 'I\'m pulling!' });
      if (!unhook) tthHint(st, lk, 'Hold ' + tthKey(lk, 'act') + ': unhook the claw!', { life: 2.2, cpu: 'I\'ll unhook it!' });
      else if (!cl.pulling) tthHint(st, lk, 'It\'s stuck until the roller pulls!', { life: 2.2, cpu: 'Pull, and I\'ll unhook!' });
    }
    if ((G.tickN % 30) === 0) Sfx.play('tthTroyCreak');
    if (cl.u >= 1) {
      cl.st = 'off'; cl.t = 0; tthStats(st).unhooks++;
      const r = tthTroyPt(h, 44, -226);
      tthPop(st, r.x, r.y - 30, 'Unhooked!', C.gold, 26); Sfx.play('tthTroyUnhook'); burst(r.x, r.y, '#ffe28a', 14);
      for (let k = 0; k < 10; k++) confetti(r.x - 40 + tthRand() * 80, r.y);
      st.thief.hitT = 1.2; tthReact(st, 'shocked', 'Whoa-oa-oa!', 1.6);
      tthCelebrate(st, 1.2);
      if (!reduceMotion) G.shake = Math.max(G.shake, 0.25);
    }
    return;
  }
  cl.rope = Math.max(0, 1 - cl.t / 0.3);
  if (cl.t >= 1.3) { ph.claw = null; ph.hush = 1.2; ph.grace = 1.1; ph.stuckT = 0; }
}
function tthTroyBellStep(st, dt) {
  const ph = st.ph, K = TTHTROY, bl = ph.bell, b = bl.b;
  bl.t += dt;
  if (!bl.rung && bl.t >= K.bellTele) {
    bl.rung = true; b.swing = 1; Sfx.play('tthTroyBell');
    tthPop(st, b.at, 150, 'DING!', '#ffe28a', 24);
    st.pops.push({ x: b.at + 30, y: 172, text: 'DONG!', col: '#ffe28a', size: 24, t: -0.3 });
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.2);
    const g = b.g;
    if (g && g.state === 'asleep') { g.state = 'rest'; g.t = 1.6; g.asleep = false; st.pops.push({ x: g.x, y: g.py - 78, text: 'Huh?!', col: '#ffffff', size: 18, t: -0.5 }); }
    tthNews(st, 'The Thief woke a guard with the bell!', false, 2.8);
    ph.laughT = 1.4;
  }
  if (bl.t >= K.bellTele + 1.2) ph.bell = null;
}

/* ---------- safe spots, the Thief's cues, the stretch ends, parking on the star ---------- */
function tthTroyTriggers(st, dt, calm) {
  const ph = st.ph, K = TTHTROY, c = ph.c, h = ph.h;
  for (const b of c.bells) if (b.swing > 0) b.swing = Math.max(0, b.swing - dt / 1.6);
  if (calm || ph.kick != null || tthTroyEvent(ph)) return;
  for (const hd of c.hides) if (!hd.got && !hd.end && h.x >= hd.x) {
    hd.got = true; ph.cpX = hd.x; ph.cpN++;
    tthPop(st, hd.x, h.y - 280, 'Safe spot!', C.gold, 18); Sfx.play('tthDing');
  }
  const busyPat = ph.patrol && ph.patrol.state !== 'gone';
  if (!busyPat && !ph.bell) for (const pt of c.patrols) if (!pt.done && h.x >= pt.x) {
    pt.done = true;
    ph.patrol = { x: Math.max(h.x + K.patrol.spawn, st.cam.x + W + 30), state: 'walk', t: 0, k: 0, n: 0, walk: true };
    tthSay(st, 'Oh, guaaard! Come and look!', 2.2); ph.laughT = 1.2;
    break;
  }
  if (!ph.bell) for (const bl of c.bells) if (!bl.done && h.x >= bl.x) {
    bl.done = true; ph.bell = { t: 0, b: bl, rung: false };
    tthSay(st, 'Wakey wakey, guards!', 2);
    break;
  }
  if (!busyPat && !ph.bell) for (const cl of c.claws) if (!cl.done && h.x >= cl.x) {
    cl.done = true;
    ph.claw = { st: 'tele', t: 0, T: 0, u: 0, x0: h.x, hold: cl.hold, strong: cl.strong, rope: 0, pulling: false, gold: false, hintT: 0 };
    tthSay(st, 'That horse is MINE!', 2); Sfx.play('tthTroyHm');
    for (const id of [0, 1]) tthWarn(st, id, K.claw.tele);
    return;
  }
  if (ph.k < 2 && h.x >= c.ends[ph.k]) {
    // a safe breather: the jobs swap
    const hd = c.hides.find(q => q.end && !q.got);
    if (hd) hd.got = true;
    ph.cpX = c.ends[ph.k]; ph.cpN++;
    tthStats(st).stretchT[ph.k] = Math.round((st.phT - ph.t0) * 10) / 10; ph.t0 = st.phT;
    ph.swap = { t: 0, did: false };
    tthCelebrate(st, K.swapT);
    tthPop(st, h.x, h.y - 290, 'Safe!', C.gold, 28); Sfx.play('tthTroySafe');
    for (let k = 0; k < 12; k++) confetti(h.x - 80 + tthRand() * 160, h.y - 200);
    return;
  }
  if (ph.k === 2) {
    const d = h.x - c.goal;
    if (d >= K.park[0] && d <= K.park[1] && Math.abs(h.v) < 6) {
      if ((ph.parkT += dt) > 0.35) {
        tthStats(st).stretchT[2] = Math.round((st.phT - ph.t0) * 10) / 10;
        ph.done = { t: 0, step: 0 }; ph.cpN++;
        tthPop(st, h.x, h.y - 290, 'Parked!', C.gold, 28); Sfx.play('tthTroySafe');
        tthSay(st, 'Now it\'s MINE! All mine!', 1.4);
      }
    } else ph.parkT = 0;
  }
}
function tthTroySwapStep(st, dt) {
  const ph = st.ph, K = TTHTROY, sw = ph.swap;
  sw.t += dt; ph.force = 0.3;
  if (!sw.did && sw.t >= 0.6 && Math.abs(ph.h.v) < 2) {
    sw.did = true; ph.roller = 1 - ph.roller; ph.k++; ph.seatU = 0; ph.lean = 0;
    tthSwap(st);
    tthNews(st, TTHTROY_FACTS[ph.k - 1] || '', false, 6);
  }
  if (sw.did) ph.seatU = Math.min(1, ph.seatU + dt / 0.9);
  if (sw.did && sw.t >= K.swapT) {
    ph.swap = null; ph.grace = 1.2; ph.hush = 0.5; ph.stuckT = 0; ph.hintT = 0;
    const rl = ph.roller, lk = 1 - rl;
    tthHint(st, rl, 'Your turn to roll: hold ' + tthKey(rl, 'right'), { life: 3.2, cpu: 'My turn to roll!' });
    tthHint(st, lk, 'Your turn to peek: hold ' + tthKey(lk, 'act'), { life: 3.2, cpu: 'My turn to peek!' });
    ph.hintT = 3.2;
  }
}
// the happy end: the horse stands on the star, every lantern swings onto it, far too watched to steal
function tthTroyDoneStep(st, dt) {
  const ph = st.ph, d = ph.done, h = ph.h;
  d.t += dt; ph.force = 0.3;
  if (d.step === 0 && d.t > 1.0) {
    d.step = 1;
    let n = 0;
    for (const g of ph.c.guards) if (g.state !== 'asleep' && Math.abs(g.x - h.x) < 720) { if (g.on < 0.5) g.sx = g.x; g.state = 'cheer'; g.off = (n++ % 4 - 1.5) * 44; }
    Sfx.play('tthCheer'); Sfx.play('tthTroySweep');
    tthPop(st, h.x, h.y - 300, 'What a fine horse!', '#ffe28a', 24);
    st.pops.push({ x: h.x + 60, y: h.y - 262, text: 'A gift for Troy!', col: '#ffffff', size: 20, t: -0.6 });
    tthReact(st, 'shocked', 'Eek! Too many eyes!', 1.8);
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.3);
    for (const id of [0, 1]) tthHint(st, id, id === ph.roller ? 'Shh... we did it!' : 'Hee hee! Shh!', { life: 2.6, gold: true, cpu: 'Shh... we did it!' });
  }
  if (d.step >= 1 && (G.tickN % 8) === 0) confetti(h.x - 240 + tthRand() * 480, h.y - 330);
  if (d.step === 1 && d.t > 2.7) { d.step = 2; tthPhaseDone(st, { say: 'Bah! It\'s FAR too watched to steal!', portal: { x: st.cam.x + 822, y: 214 } }); }
}

/* ---------- the Thief: hovers top right, taunts, flies to his tricks ---------- */
function tthTroyThief(st, dt, calm) {
  const ph = st.ph, c = st.thief, h = ph.h, cam = st.cam, t = G.clock;
  if (st.cut) return;
  let tx = cam.x + 778 + Math.sin(t * 0.6) * 30, ty = 264 + Math.sin(t * 1.3) * 9, k = 3, pose = 'idle', face = -1, flame = 1;
  if (ph.laughT > 0) { ph.laughT -= dt; pose = 'laugh'; }
  const ring = tthTroyPt(h, 44, -226);
  if (ph.claw) {
    const cl = ph.claw;
    if (cl.st === 'off') { pose = 'dizzy'; tx = ring.x - 210 - cl.t * 60; ty = ring.y - 20 - cl.t * 40; k = 4; }
    else { pose = 'grab'; tx = ring.x - 178 + (cl.st === 'tug' ? Math.sin(t * 31) * 3 : 0); ty = ring.y + 24; k = cl.st === 'tug' ? 12 : 4; flame = cl.st === 'tug' ? 1.5 : 1.1; }
  } else if (ph.bell) { pose = ph.bell.rung ? 'laugh' : 'point'; tx = ph.bell.b.at + 84; ty = 250; k = 5; }
  else if (ph.done) {
    if (ph.done.step === 0) { pose = 'grab'; tx = ring.x - 150; ty = ring.y + 4; k = 3.5; flame = 1.3; }
    else { pose = 'shock'; tx = cam.x + 800; ty = 250; k = 2.4; }
  }
  tx = clamp(tx, cam.x + 74, cam.x + W - 74);
  c.x += (tx - c.x) * Math.min(1, dt * k); c.y += (ty - c.y) * Math.min(1, dt * k);
  c.face = face; c.flame = flame; c.claw = 0.15; c.item = null;
  if (c.moodT <= 0 || pose !== 'idle') c.pose = pose;
  c.look = { x: h.x, y: h.y - 150 };
  if (!calm && !tthTroyEvent(ph) && !ph.bell && !st.say && (ph.tauntT -= dt) <= 0) {
    ph.tauntT = 15 + tthRand() * 6;
    tthSay(st, TTHTROY_LINES[ph.tauntN++ % TTHTROY_LINES.length], 2.6); ph.laughT = 1.5;
  }
}

/* ---------- hints: each player's own keys (in 1-player mode the computer's bubble says what it is doing) ---------- */
function tthTroyHints(st, dt, calm) {
  const ph = st.ph, K = TTHTROY, h = ph.h, c = ph.c, rl = ph.roller, lk = 1 - rl;
  ph.hintT -= dt;
  if (calm || ph.kick != null || tthTroyEvent(ph)) return;
  // 22 s without progress: gold hints say whose turn it is
  if (h.x > ph.bestX + 30) { ph.bestX = h.x; ph.stuckT = 0; }
  else if ((ph.stuckT += dt) > K.stuckT) {
    ph.stuckT = 0;
    if (!ph.stuckN++) tthHelp(st, 'Gold help: the lookout peeks, then the roller rolls in the gaps!');
    if (ph.light < K.rollLight) tthHint(st, lk, 'Hold ' + tthKey(lk, 'act') + ' to peek!', { gold: true, life: 4, cpu: 'I\'ll peek out!' });
    else tthHint(st, rl, ph.lit ? 'Wait for the beam to pass...' : 'Hold ' + tthKey(rl, 'right') + ' to roll!', { gold: true, life: 4, cpu: 'I\'ll roll in the gaps!' });
    ph.hintT = 4; return;
  }
  if (ph.hintT > 0) return;
  // the start: what each job does
  if (ph.t < 12 && (!ph.peeked || !ph.rolled)) {
    if (!ph.peeked) tthHint(st, lk, 'Hold ' + tthKey(lk, 'act') + ' to peek!', { life: 2.6, cpu: 'I\'ll peek out!' });
    if (!ph.rolled) tthHint(st, rl, 'Hold ' + tthKey(rl, 'right') + ' to roll', { life: 2.6, cpu: 'I roll when it\'s light!' });
    ph.hintT = 2.4; return;
  }
  // rolling in the dark: the wheels won't turn
  if (ph.darkTry > 0) {
    tthHint(st, rl, 'Too dark to roll!', { cpu: 'Too dark! Peek, please!' });
    tthHint(st, lk, 'Hold ' + tthKey(lk, 'act') + ' to peek!', { cpu: 'I\'ll peek out!' });
    ph.hintT = 2.6; Sfx.play('tthTroyNope'); return;
  }
  if (ph.light < 0.3) return;
  // signs ahead (seen in the light)
  const nose = h.x + K.body[1], fw = h.x + K.wheel;
  if (h.v > K.creep + 8 && c.gates.some(g => nose > g.x - 230 && nose < g.x + K.gateLen)) {
    tthHint(st, rl, 'Narrow gate! Hold ' + tthKey(rl, 'down') + ' to tiptoe', { cpu: 'Tiptoe through the gate...' }); ph.hintT = 2.6; return;
  }
  if (h.v > K.creep + 8 && c.bumps.some(b => fw > b.x - 200 && fw < b.x)) {
    tthHint(st, rl, 'Loose plank! Hold ' + tthKey(rl, 'down') + ' to tiptoe', { cpu: 'Tiptoe over the plank...' }); ph.hintT = 2.6; return;
  }
  const ramp = c.ramps.find(q => q.rise > 0 && !q.told && fw > q.x0 - 150 && fw < q.x0 + 40);
  if (ramp) {
    ramp.told = true;
    tthHint(st, rl, 'A ramp! Keep rolling: hold ' + tthKey(rl, 'right'), { cpu: 'A ramp! Here we go!' });
    tthHint(st, lk, 'Keep peeking up the ramp!', { cpu: 'I\'ll keep the light on!' });
    ph.hintT = 2.6;
  }
}
function tthTroyCam(st, dt) {
  const ph = st.ph, want = clamp(ph.h.x - TTHTROY.camLead, 0, ph.c.xMax - W);
  st.cam.x += (want - st.cam.x) * Math.min(1, dt * 5); st.cam.y = 0;
}

/* ---------- the tick ---------- */
function tthTroyStep(st, dt) {
  const ph = st.ph, K = TTHTROY, h = ph.h, ps = G.players, R = ps[ph.roller], L = ps[1 - ph.roller], calm = tthCalm(st);
  ph.t += dt;
  for (const p of ps) { p.pendingAct = false; p.pendingJump = false; }
  if (ph.grace > 0) ph.grace -= dt;
  if (ph.hush > 0) ph.hush -= dt;
  if (ph.darkTry > 0) ph.darkTry -= dt;
  if (!calm && ph.wasCalm) ph.grace = Math.max(ph.grace, 1.1);   // back from a card, a breather or an away person
  ph.wasCalm = calm;
  const w = { roll: R.input.right && !R.input.left, creep: !!R.input.down, brake: !!(R.input.left || R.input.act), peek: !!(L.input.act || tthUp(L)) };
  tthTroyHatch(st, dt, w.peek && !ph.caught && !ph.swap && !ph.done);
  ph.lean = approach(ph.lean, w.brake && ph.seatU >= 1 ? 1 : 0, dt / 0.12);
  if (ph.caught) tthTroyCaughtStep(st, dt);
  else {
    if (ph.swap) tthTroySwapStep(st, dt);
    if (ph.done) tthTroyDoneStep(st, dt);
    if (st.cut) { tthTroySeats(st); return; }
    if (ph.claw) tthTroyClawStep(st, dt, w);
    tthTroyDrive(st, dt, w);
  }
  if (ph.bell) tthTroyBellStep(st, dt);
  tthTroyTerrain(ph);
  tthTroyRamps(st);
  tthTroyGuards(st, dt, calm);
  tthTroyPatrol(st, dt, calm);
  tthTroyPusher(st, dt);
  tthTroyLit(ph, dt);
  tthTroyWatch(st, dt, calm);
  tthTroyRoad(st, dt);
  tthTroyTriggers(st, dt, calm);
  tthTroyThief(st, dt, calm);
  tthTroyHints(st, dt, calm);
  // wheel dust and creaks
  if (Math.abs(h.v) > 30) {
    if ((ph.dustT -= dt) <= 0) { ph.dustT = 0.2; puff(h.x - K.wheel * Math.sign(h.v), h.y - 2, 2, 'rgba(214,190,150,0.7)'); }
    if ((ph.creakT -= dt) <= 0) { ph.creakT = 62 / Math.max(40, Math.abs(h.v)) * 0.5; Sfx.play('tthTroyRoll'); }
  }
  tthTroySeats(st);
  tthTroyCam(st, dt);
}
// cards and the portal cutscene: the horse glides to a stop, the hatch shuts, the guards rest (or go on cheering)
function tthTroyCoast(st, dt) {
  const ph = st.ph, K = TTHTROY, h = ph.h;
  for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
  ph.force = 0.3;
  tthTroyHatch(st, dt, false);
  ph.lean = approach(ph.lean, 0, dt / 0.12);
  if (ph.seatU < 1) ph.seatU = Math.min(1, ph.seatU + dt / 0.9);
  h.v = approach(h.v, 0, K.brake * dt); h.x += h.v * dt; h.rot += h.v * dt / (20 * K.hs);
  tthTroyTerrain(ph);
  tthTroyGuards(st, dt, true);
  tthTroyPatrol(st, dt, true);
  tthTroyPusher(st, dt);
  tthTroyLit(ph, dt);
  if (ph.done && (G.tickN % 8) === 0) confetti(h.x - 240 + tthRand() * 480, h.y - 330);
  tthTroyThief(st, dt, true);
  tthTroySeats(st);
  tthTroyCam(st, dt);
}
