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
     1 The Plain        one slow guard on a watchtower, a hill (ramp up, ramp down: "Wheee!"), a second watchtower
                        whose beam goes back and forth, a safe spot, the wall guard, then the Great Gate (a narrow
                        gate: tiptoe through).
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
   LENGTH (tools/w30/play.js): a computer pair takes about 2:10 (stretches about 33 / 37 / 57 s), a clumsy partner
   2:25 to 3:05, a young kid 2:50 to 4:25; with one player idle nothing moves (the era starts lit for a first look at
   the plain, and the computer roller waits for the lookout's first peek).
   DRAWING: about 3.5 ms a frame (tools/w30/troy-perf.js); the dusk sky is a cached 1 px strip (tthTroySky).
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
  slow: 82, slowGold: 125, gateLen: 120, gateBounce: 46, gateV: 420, rollBackV: 250, steep: 0.16, stallV: 22, stallT: 0.3,
  patrol: { v: 100, reach: 130, knock: 1.1, spawn: 650 },
  claw: { tele: 1.3, pull: 70, slack: 170, drain: 0.5, goldT: 14 },
  bellTele: 1.2, park: [-50, 70], swapT: 2.6,
  goldMiss: 2, goldMiss2: 4, restK: [1, 1.6, 2.4], stuckT: 22,
};
// The course. All x are px from the stretch's start; len is the stretch's length (the last one ends on the gold star).
// guards: z [from, to] the strip the beam sweeps, v px/s, rest s between sweeps, first s before the first sweep,
// mode 'r' | 'l' | 'pp', perch 'tower' | 'wall' | 'roof', asleep (until the Thief's bell).  ramps: [x, length, rise].
const TTHTROY_STRETCHES = [
  { name: 'The Plain', len: 2890,
    guards: [{ z: [480, 900], v: 150, rest: 3.8, first: 2.6, mode: 'r', perch: 'tower' },
      { z: [1700, 2060], v: 160, rest: 3.4, first: 3.2, mode: 'pp', perch: 'tower' },
      { z: [2260, 2520], at: 2340, v: 170, rest: 3.2, first: 1.2, mode: 'pp', perch: 'wall' }],
    ramps: [[1060, 200, 44], [1330, 190, -44]], hides: [1000, 2130], gates: [2800] },
  { name: 'The Streets', len: 2240,
    claws: [{ x: 300, hold: 1.5 }],
    guards: [{ z: [520, 900], v: 175, rest: 3.2, first: 1.2, mode: 'pp' },
      { z: [800, 1180], v: 150, rest: 2.8, first: 2.6, mode: 'l' },
      { z: [1700, 2060], v: 190, rest: 2.5, first: 1.6, mode: 'pp', asleep: true }],
    bumps: [1040], hides: [1345], patrols: [1360], bells: [{ x: 1620, at: 2000, g: 2 }] },
  { name: 'To the Square', len: 2880,
    guards: [{ z: [260, 640], v: 210, rest: 2.4, first: 1.0, mode: 'pp' },
      { z: [960, 1320], v: 190, rest: 2.7, first: 1.2, mode: 'r' },
      { z: [1200, 1560], v: 165, rest: 3.0, first: 2.6, mode: 'l' },
      { z: [2400, 2700], v: 200, rest: 2.6, first: 1.4, mode: 'pp', asleep: true }],
    bumps: [470], patrols: [790], hides: [770, 1700], gates: [1810], bells: [{ x: 1850, at: 2672, g: 3 }],
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
    for (const r of S.ramps || []) c.ramps.push({ x0: x0 + r[0], len: r[1], rise: r[2], miss: 0, gold: false, stallT: 0 });
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
  tthTroyScenery(c);
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
    spots: [], lit: false, lit0: 0, lit1: 0, leak0: 0, leak1: 0, frz: 0, movedT: 0, seenT: 0, grace: 2, hush: 0, wasCalm: true,
    caught: null, pusher: null, patrol: null, claw: null, bell: null, swap: null, done: null, kick: null, kickV: 0, parkT: 0,
    cpX: K.startX, cpN: 0, patMiss: 0, fw0: K.startX + K.wheel,
    bestX: K.startX, stuckT: 0, stuckN: 0, hintT: 0.8, darkTry: 0, tauntT: 5, tauntN: 0, laughT: 0, dustT: 0, creakT: 0, stepT: 0,
    rolled: false, peeked: false, taught: 0, whee: false,
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
  if (ph.kick != null) {   // bounced back out of a gate, or rolling back down a ramp
    const d = ph.kick - h.x, s = (ph.kickV || K.gateV) * dt;
    if (Math.abs(d) <= s) { h.x = ph.kick; ph.kick = null; ph.kickV = 0; ph.grace = Math.max(ph.grace, 0.6); } else h.x += Math.sign(d) * s;
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
  // downhill: "Wheee!"
  if (v > K.vmax + 22 && !ph.whee) { ph.whee = true; tthPop(st, h.x, h.y - 300, 'Wheee!', '#ffffff', 24); Sfx.play('tthTroyWhee'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.15); }
  else if (v < K.vmax - 10) ph.whee = false;
}
// stalling on a ramp (stopping, tiptoeing or losing the light on the steep part): the heavy horse rolls back down to
// the foot ("Rolling back!", not a bump) for another run-up. Not even the brake holds it there (on a gold ramp it does).
function tthTroyRamps(st, dt) {
  const ph = st.ph, h = ph.h, K = TTHTROY;
  if (ph.kick != null || tthTroyEvent(ph)) return;
  for (const r of ph.c.ramps) {
    if (r.rise <= 0 || !(h.x > r.x0 - 60 && h.x < r.x0 + r.len + 60)) { r.stallT = 0; continue; }
    const steep = !r.gold && Math.sin(h.tilt) < -K.steep;
    r.stallT = steep && h.v < K.stallV ? r.stallT + dt : 0;
    if (h.v >= -24 && r.stallT < K.stallT) continue;
    r.miss++; r.stallT = 0; tthStats(st).rollbacks++;
    ph.kick = Math.min(h.x, r.x0 - K.wheel - 24); ph.kickV = K.rollBackV; h.v = 0;
    tthPop(st, h.x, h.y - 290, 'Rolling back!', '#ffffff', 20); Sfx.play('tthTroyNope');
    const rl = ph.roller, lk = 1 - rl;
    tthHint(st, rl, 'Take a run-up: hold ' + tthKey(rl, 'right') + ' all the way!', { life: 3.2, cpu: 'A run-up, all the way up!' });
    tthHint(st, lk, 'Keep peeking up the ramp!', { life: 3.2, cpu: 'I\'ll keep the light on!' });
    ph.hintT = 3.2;
    if (r.miss === K.goldMiss) { r.gold = true; tthHelp(st, 'Gold help: a gentler ramp! No run-up needed.'); }
    return;
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
  // the first two lanterns: what to do about a beam
  if (ph.taught < 2) {
    const g = c.guards.find(q => q.state === 'tele' && !q.told && q.z1 + q.w / 2 > h.x + K.body[0] && q.z0 - 560 < h.x);
    if (g) {
      g.told = true; ph.taught++;
      tthHint(st, rl, 'A lantern! Brake before the beam: ' + tthKey(rl, 'left'), { life: 3.4, cpu: 'A lantern! I\'ll brake in time.' });
      tthHint(st, lk, 'Let go when the beam is at the head!', { life: 3.4, cpu: 'I\'ll duck when the beam is close.' });
      ph.hintT = 3.4; return;
    }
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
  tthTroyRamps(st, dt);
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

/* ---------- drawing: the scenery (houses, the city wall, towers), built once per start ---------- */
const TTHTROYC = { wood: '#c98a4a', woodDk: '#9a6230', woodLt: '#e6b577', inside: '#3a2515', insideLt: '#5b3c22', bronze: '#d9a441', bronzeDk: '#9a6f22',
  tunic: '#3f8f8a', tunicDk: '#2a6663', crest: '#d9483b', skin: '#f0c9a0', beam: '255,232,140', stone: '#b9ab94', stoneDk: '#8f826e', stoneLt: '#d6c9b0',
  roof: '#c96f4a', roofDk: '#a4532f', walls: ['#ead4aa', '#dcc08e', '#e8c9a2', '#d6b88a', '#f0ddb8'] };
function tthTroyScenery(c) {
  const K = TTHTROY, hs = [], x0 = c.gateX + 150, x1 = c.goal - 250;
  const fixed = c.guards.filter(g => !g.deco && g.perch === 'roof').map(g => ({ x0: g.x - 78, w: 156, top: g.py })).sort((a, b) => a.x0 - b.x0);
  fixed.push({ x0: x1, w: 0, top: 0, end: true });
  let cur = x0, n = 0;
  const add = (hx, w, top) => { const q = hash(n++, 31); hs.push({ x0: hx, w, top, col: TTHTROYC.walls[q % 5], door: 0.2 + ((q >>> 3) % 5) * 0.14, lit: (q >>> 6) % 3 === 0, awn: (q >>> 8) % 4 === 0, win: 1 + ((q >>> 10) % 2), pot: (q >>> 12) % 3 === 0 }); };
  for (const f of fixed) {
    while (f.x0 - cur > 60) {
      const q = hash(n, 77), w = Math.min(f.x0 - cur, 116 + (q % 5) * 16);
      add(cur, f.x0 - cur - w < 60 ? f.x0 - cur : w, [244, 268, 292, 232][(q >>> 4) % 4]);
      cur = hs[hs.length - 1].x0 + hs[hs.length - 1].w;
    }
    if (f.end) break;
    add(f.x0, f.w, f.top); cur = f.x0 + f.w;
  }
  c.houses = hs;
  // olive trees and bushes on the plain (not under the watchtower, not on the wall)
  c.trees = [];
  for (let x = 70; x < c.gateX - 720; x += 150 + (hash(x, 5) % 120)) if (!c.guards.some(g => g.perch === 'tower' && Math.abs(g.x - x) < 90)) c.trees.push({ x, s: 0.8 + (hash(x, 9) % 5) * 0.1, bush: hash(x, 3) % 3 === 0 });
  c.wallX0 = c.gateX - 700;
  // signs: before every uphill ramp, narrow gate and loose plank
  c.signs = [];
  for (const r of c.ramps) if (r.rise > 0) c.signs.push({ x: r.x0 - 150, kind: 'ramp' });
  for (const g of c.gates) c.signs.push({ x: g.x - 250, kind: 'slow' });
  for (const b of c.bumps) c.signs.push({ x: b.x - 150, kind: 'plank' });
}
function tthTroySign(ph, s) {
  const y = tthTroyGy(ph, s.x);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.fillStyle = TTHTROYC.woodDk; ctx.fillRect(s.x - 3, y - 64, 6, 64); ctx.fillStyle = 'rgba(255,230,190,0.3)'; ctx.fillRect(s.x - 3, y - 64, 2, 64); ctx.strokeRect(s.x - 3, y - 64, 6, 64);
  ctx.fillStyle = s.kind === 'ramp' ? '#9fe07f' : '#ffd23f'; rr(s.x - 24, y - 104, 48, 44, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.lineWidth = 3;
  if (s.kind === 'ramp') { ctx.beginPath(); ctx.moveTo(s.x - 14, y - 70); ctx.lineTo(s.x + 14, y - 86); ctx.lineTo(s.x + 14, y - 70); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(s.x - 6, y - 90); ctx.lineTo(s.x + 6, y - 97); ctx.moveTo(s.x + 1, y - 98); ctx.lineTo(s.x + 6, y - 97); ctx.lineTo(s.x + 3, y - 92); ctx.stroke(); }
  else if (s.kind === 'slow') {   // a tiptoeing foot between two walls
    ctx.fillRect(s.x - 18, y - 98, 5, 32); ctx.fillRect(s.x + 13, y - 98, 5, 32);
    ctx.beginPath(); ctx.moveTo(s.x - 8, y - 82); ctx.lineTo(s.x + 6, y - 82); ctx.moveTo(s.x + 1, y - 88); ctx.lineTo(s.x + 7, y - 82); ctx.lineTo(s.x + 1, y - 76); ctx.stroke();
  } else { text('!', s.x, y - 81, 30, C.ink, 'center'); }
}
// a Trojan guard, feet centre at (x, y): o { face, up (0..1 lantern raised), sleep, walk, push, lamp (false: no lantern), mark ('?' | '!' | 'z') }
function tthTroyDrawGuard(x, y, o) {
  const t = G.clock, f = o.face || 1, K = TTHTROYC, walk = o.walk ? Math.sin(t * 11) : 0, bob = o.walk ? Math.abs(walk) * -2 : o.sleep ? Math.sin(t * 1.6) * 1 : 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(f, 1); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  // legs
  ctx.strokeStyle = K.skin; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-4, -14); ctx.lineTo(-4 + walk * 6, -1); ctx.moveTo(4, -14); ctx.lineTo(4 - walk * 6, -1); ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.translate(0, bob);
  if (o.push) ctx.rotate(0.22);
  // tunic and bronze belt
  ctx.fillStyle = K.tunic; rr(-10, -34, 20, 22, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = K.bronze; ctx.fillRect(-10, -22, 20, 4);
  // the back arm
  ctx.strokeStyle = K.tunicDk; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-7, -30); ctx.lineTo(o.push ? 8 : -11, o.push ? -30 : -18); ctx.stroke();
  // head, helmet, crest
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.fillStyle = K.skin; circle(0, -43, 9.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = K.bronze; ctx.beginPath(); ctx.arc(0, -44, 10.5, Math.PI * 1.02, Math.PI * 1.98); ctx.lineTo(10.5, -43); ctx.lineTo(-10.5, -43); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = K.crest; ctx.beginPath(); ctx.moveTo(-9, -53); ctx.quadraticCurveTo(0, -66, 10, -55); ctx.quadraticCurveTo(0, -58, -9, -53); ctx.closePath(); ctx.fill(); ctx.stroke();
  // face
  ctx.fillStyle = C.ink;
  if (o.sleep) { ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(1, -41); ctx.lineTo(5, -41); ctx.moveTo(-5, -41); ctx.lineTo(-2, -41); ctx.stroke(); }
  else { circle(4, -42, 1.7); ctx.fill(); circle(-2, -42, 1.5); ctx.fill(); }
  ctx.lineWidth = 1.6; ctx.beginPath();
  if (o.mark === '!') { ctx.ellipse(2, -36.5, 2.2, 2.6, 0, 0, Math.PI * 2); ctx.fill(); } else { ctx.moveTo(-1, -37); ctx.quadraticCurveTo(2, o.sleep ? -37 : -35.5, 5, -37); ctx.stroke(); }
  // the front arm and the lantern on its pole
  const up = o.up || 0, hx = o.push ? 13 : 10 + up * 5, hy = o.push ? -27 : -18 - up * 12;
  ctx.strokeStyle = K.tunic; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(6, -30); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.fillStyle = K.skin; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8; circle(hx, hy, 3.4); ctx.fill(); ctx.stroke();
  if (o.lamp !== false && !o.push) {
    const lx = hx + 8, ly = hy - 2 - up * 4;
    ctx.strokeStyle = TTHTROYC.woodDk; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(hx - 2, hy + 3); ctx.lineTo(lx, ly - 6); ctx.stroke();
    const on = o.on == null ? up : o.on;
    if (on > 0.02) { ctx.fillStyle = `rgba(${K.beam},${0.3 * on})`; circle(lx, ly + 4, 13 + Math.sin(t * 9) * 1.2); ctx.fill(); }
    ctx.fillStyle = on > 0.3 ? '#fff3b0' : '#a8905a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(lx - 5, ly - 3, 10, 13, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = K.bronzeDk; ctx.fillRect(lx - 6, ly - 5, 12, 3); ctx.fillRect(lx - 6, ly + 9, 12, 3);
  }
  ctx.restore();
  if (o.mark && o.mark !== 'z') bigText(o.mark, x + f * 2, y - 82 - Math.abs(Math.sin(t * 8)) * 4, 26, o.mark === '?' ? '#ffe28a' : '#ff5f6d', 1);
  else if (o.mark === 'z') { for (let k = 0; k < 3; k++) { const u = (t * 0.5 + k / 3) % 1; ctx.globalAlpha *= 1 - u; text('z', x + 10 + u * 16 + k * 2, y - 58 - u * 26, 11 + u * 8, '#ffffff', 'center'); ctx.globalAlpha /= 1 - u; } }
}
// the road from xa to xb (world): a filled strip that follows the ramps
function tthTroyDrawRoad(ph, xa, xb, top, body, edge, lo, hi) {
  const cam = G.mst.cam, a = Math.max(xa, lo != null ? lo : cam.x - 30), b = Math.min(xb, hi != null ? hi : cam.x + W + 30);
  if (b <= a) return;
  const a24 = Math.ceil(a / 24) * 24;   // (sampled on a fixed 24 px grid, so the line doesn't shimmer as the camera moves)
  ctx.beginPath(); ctx.moveTo(a, H + 12); ctx.lineTo(a, tthTroyGy(ph, a));
  for (let x = a24; x < b; x += 24) ctx.lineTo(x, tthTroyGy(ph, x));
  ctx.lineTo(b, tthTroyGy(ph, b)); ctx.lineTo(b, H + 12); ctx.closePath();
  ctx.fillStyle = body; ctx.fill();
  ctx.beginPath(); ctx.moveTo(a, tthTroyGy(ph, a) + 6);
  for (let x = a24; x < b; x += 24) ctx.lineTo(x, tthTroyGy(ph, x) + 6);
  ctx.lineTo(b, tthTroyGy(ph, b) + 6);
  ctx.strokeStyle = top; ctx.lineWidth = 12; ctx.lineCap = 'butt'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(a, tthTroyGy(ph, a));
  for (let x = a24; x < b; x += 24) ctx.lineTo(x, tthTroyGy(ph, x));
  ctx.lineTo(b, tthTroyGy(ph, b));
  ctx.strokeStyle = edge || C.ink; ctx.lineWidth = 3; ctx.stroke();
}
// the dusk sky: painted once into a 1 px wide strip and stretched (a full-screen gradient every frame is slow). Pixels only, no game state.
let tthTroySkyCv = null;
function tthTroySky() {
  if (tthTroySkyCv) return tthTroySkyCv;
  const cv = document.createElement('canvas'); cv.width = 1; cv.height = H;
  const x = cv.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 440);
  g.addColorStop(0, '#1d1b52'); g.addColorStop(0.45, '#5a3a86'); g.addColorStop(0.78, '#d9705a'); g.addColorStop(1, '#ffc27a');
  x.fillStyle = g; x.fillRect(0, 0, 1, H);
  return (tthTroySkyCv = cv);
}
function tthTroyDrawBack(st) {
  const ph = st.ph, K = TTHTROY, Q = TTHTROYC, c = ph.c, cam = st.cam, t = G.clock, h = ph.h, L = cam.x - 40, R = cam.x + W + 40, light = ph.light;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  tthScreen(st, () => {
    // dusk: indigo above, a band of orange at the horizon, a low sun over the sea, early stars
    ctx.drawImage(tthTroySky(), 0, 0, 1, H, 0, 0, W, H);
    tthStars(t, 34, 0.75, 13);
    const sx = 230 - cam.x * 0.03;
    if (sx > -90) { ctx.fillStyle = 'rgba(255,214,140,0.25)'; circle(sx, 396, 78); ctx.fill(); ctx.fillStyle = '#ffe2a0'; circle(sx, 396, 44); ctx.fill(); }
    // the sea, and the Greek ships sailing away (they only pretend to leave)
    const seaX = -cam.x * 0.06;
    ctx.fillStyle = '#4a4f9a'; ctx.fillRect(0, 392, W, 60);
    ctx.fillStyle = 'rgba(255,200,140,0.35)'; for (let k = 0; k < 7; k++) ctx.fillRect(((k * 173 + seaX * 0.6) % (W + 80) + W + 80) % (W + 80) - 40, 400 + (k % 3) * 9, 46, 2.5);
    for (let k = 0; k < 3; k++) {
      const bx = 120 + k * 150 + seaX + Math.sin(t * 0.4 + k) * 4, by = 404 + k * 5;
      if (bx < -40) continue;
      ctx.fillStyle = '#2a2550'; ctx.beginPath(); ctx.moveTo(bx - 20, by); ctx.quadraticCurveTo(bx, by + 9, bx + 22, by - 2); ctx.lineTo(bx + 24, by - 9); ctx.lineTo(bx + 16, by); ctx.closePath(); ctx.fill();
      ctx.fillRect(bx - 1, by - 22, 2, 22); ctx.fillStyle = '#e8d2b0'; ctx.fillRect(bx - 11, by - 21, 22, 13);
    }
    // far hills, then the roofs and towers of Troy
    ctx.fillStyle = '#4b3a7c'; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 32) { const wx = x + cam.x * 0.14; ctx.lineTo(x, 372 - Math.sin(wx * 0.006) * 34 - Math.sin(wx * 0.017 + 2) * 14); }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a2f66';
    const off = cam.x * 0.36, k0 = Math.floor(off / 58);
    for (let k = k0 - 1; k < k0 + 19; k++) {
      const q = hash(k, 21), bx = k * 58 - off, bh = 34 + (q % 6) * 13, bw = 46 + ((q >>> 4) % 3) * 12;
      ctx.fillRect(bx, 420 - bh, bw, bh + 40);
      if ((q >>> 7) % 4 === 0) { for (let m = 0; m < 3; m++) ctx.fillRect(bx + m * (bw / 3) + 2, 420 - bh - 8, bw / 3 - 6, 9); }
      else if ((q >>> 7) % 4 === 1) { ctx.beginPath(); ctx.moveTo(bx - 4, 420 - bh); ctx.lineTo(bx + bw / 2, 420 - bh - 16); ctx.lineTo(bx + bw + 4, 420 - bh); ctx.closePath(); ctx.fill(); }
      if ((q >>> 10) % 3 === 0) { ctx.fillStyle = 'rgba(255,214,140,0.55)'; ctx.fillRect(bx + 10, 420 - bh + 12, 7, 9); ctx.fillStyle = '#3a2f66'; }
    }
  });
  if (light < 0.02) return;   // (pitch dark behind the planks: nothing more to paint)
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  // --- the plain: olive trees, the watchtower ---
  for (const tr of c.trees) {
    if (tr.x < L - 60 || tr.x > R + 60) continue;
    const gy = tthTroyGy(ph, tr.x), s = tr.s;
    if (tr.bush) { ctx.fillStyle = '#5f7a3a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(tr.x - 14 * s, gy - 8, 14 * s, Math.PI, 0); ctx.arc(tr.x + 6 * s, gy - 12, 18 * s, Math.PI, 0); ctx.arc(tr.x + 26 * s, gy - 6, 12 * s, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); continue; }
    ctx.lineWidth = 3; ctx.fillStyle = '#7a5636'; ctx.beginPath(); ctx.moveTo(tr.x - 7 * s, gy + 4); ctx.quadraticCurveTo(tr.x - 2 * s, gy - 30 * s, tr.x - 10 * s, gy - 58 * s); ctx.lineTo(tr.x + 6 * s, gy - 58 * s); ctx.quadraticCurveTo(tr.x + 4 * s, gy - 30 * s, tr.x + 9 * s, gy + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    // (art pass) a twisted olive trunk: bark furrows, a lit side, a knot hole
    ctx.strokeStyle = 'rgba(60,36,20,0.55)'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (const dx of [-3, 1, 4]) { ctx.moveTo(tr.x + dx * s, gy - 2); ctx.quadraticCurveTo(tr.x + (dx + 3) * s, gy - 30 * s, tr.x + (dx - 4) * s, gy - 56 * s); }
    ctx.stroke(); ctx.strokeStyle = 'rgba(255,230,190,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tr.x - 5 * s, gy - 2); ctx.quadraticCurveTo(tr.x - 1 * s, gy - 30 * s, tr.x - 8 * s, gy - 56 * s); ctx.stroke();
    ctx.fillStyle = '#3e2a1a'; ctx.beginPath(); ctx.ellipse(tr.x + 1 * s, gy - 28 * s, 2.2 * s, 3.4 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    ctx.fillStyle = '#6f8a48'; ctx.beginPath(); ctx.ellipse(tr.x - 2 * s, gy - 78 * s, 40 * s, 28 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // (art pass) the crown in clumps of silvery olive leaves: a shaded underside, lit clumps on top, little leaves and olives
    ctx.save(); ctx.beginPath(); ctx.ellipse(tr.x - 2 * s, gy - 78 * s, 38.5 * s, 26.5 * s, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(40,60,30,0.3)'; ctx.beginPath(); ctx.ellipse(tr.x + 4 * s, gy - 62 * s, 40 * s, 16 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7f9a55'; ctx.beginPath();
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + tr.x, rx = tr.x - 2 * s + Math.cos(a) * 22 * s, ry = gy - 82 * s + Math.sin(a) * 12 * s; ctx.moveTo(rx + 11 * s, ry); ctx.ellipse(rx, ry, 11 * s, 7 * s, 0, 0, Math.PI * 2); }
    ctx.fill();
    ctx.strokeStyle = 'rgba(214,226,180,0.75)'; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let k = 0; k < 16; k++) { const h2 = hash(tr.x + k, 61), lx = tr.x - 2 * s + ((h2 % 70) - 35) * s, ly = gy - 78 * s + (((h2 >>> 7) % 44) - 22) * s, a = ((h2 >>> 13) % 7) / 7 * Math.PI; ctx.moveTo(lx, ly); ctx.lineTo(lx + Math.cos(a) * 4 * s, ly + Math.sin(a) * 2 * s); }
    ctx.stroke();
    ctx.fillStyle = '#3b3550'; for (let k = 0; k < 5; k++) { const h2 = hash(tr.x + k, 67); circle(tr.x - 2 * s + ((h2 % 56) - 28) * s, gy - 70 * s + ((h2 >>> 6) % 16) * s, 1.8 * s); ctx.fill(); }
    ctx.restore();
  }
  // --- the square: a temple front, steps, the wall the horse stops at ---
  if (c.goal + 700 > L && c.goal - 260 < R) {
    const gx = c.goal, gy = tthTroyGy(ph, gx), bx = gx + 196;
    ctx.lineWidth = 3; ctx.strokeStyle = C.ink;
    ctx.fillStyle = '#e4d8bf'; ctx.fillRect(bx + 60, 250, 330, gy - 250); ctx.strokeRect(bx + 60, 250, 330, gy - 250);
    TTA.stones(bx + 61.5, 251.5, 327, gy - 253, 9, '#e4d8bf', { bw: 48, bh: 20, lit: 0.22, dk: 0.16 });
    ctx.fillStyle = 'rgba(40,30,50,0.25)'; ctx.fillRect(bx + 61.5, 251.5, 327, 14);
    ctx.fillStyle = '#f2e9d6'; for (let k = 0; k < 5; k++) { const cx2 = bx + 82 + k * 70; ctx.fillRect(cx2, 262, 22, gy - 262); ctx.fillStyle = 'rgba(120,100,80,0.2)'; ctx.fillRect(cx2 + 14, 262, 8, gy - 262); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(cx2 + 2, 262, 2.5, gy - 262); ctx.strokeStyle = 'rgba(120,100,80,0.4)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (const fx of [7, 11, 15]) { ctx.moveTo(cx2 + fx, 266); ctx.lineTo(cx2 + fx, gy - 4); } ctx.stroke(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.strokeRect(cx2, 262, 22, gy - 262); ctx.fillStyle = '#f2e9d6'; }
    ctx.fillStyle = Q.roof; ctx.beginPath(); ctx.moveTo(bx + 40, 252); ctx.lineTo(bx + 225, 186); ctx.lineTo(bx + 410, 252); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; circle(bx + 225, 228, 11); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d6c9b0'; for (let k = 0; k < 3; k++) { ctx.fillRect(bx + k * 16, gy - 14 - k * 14, 460, 15 + k * 14); TTA.stones(bx + k * 16 + 1.5, gy - 14 - k * 14 + 1.5, 457, 12, 20 + k, '#d6c9b0', { bw: 58, bh: 14, wx: bx + k * 30, wy: gy - 14 - k * 14 }); ctx.strokeRect(bx + k * 16, gy - 14 - k * 14, 460, 15 + k * 14); }
  }
  for (const g of c.guards) {
    if (g.x < L - 90 || g.x > R + 90) continue;
    const gy = tthTroyGy(ph, g.x);
    if (g.perch === 'tower') {
      ctx.lineWidth = 3; ctx.fillStyle = Q.woodDk;
      for (const dx of [-30, 24]) { ctx.fillRect(g.x + dx, g.py, 7, gy - g.py + 6); TTA.wood(g.x + dx, g.py, 7, gy - g.py + 6, g.x + dx, Q.woodDk, { knots: false }); ctx.strokeRect(g.x + dx, g.py, 7, gy - g.py + 6); }
      ctx.lineWidth = 5; ctx.strokeStyle = Q.woodDk; ctx.beginPath(); ctx.moveTo(g.x - 26, gy - 20); ctx.lineTo(g.x + 27, g.py + 60); ctx.moveTo(g.x + 27, gy - 20); ctx.lineTo(g.x - 26, g.py + 60); ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillStyle = Q.wood; rr(g.x - 44, g.py, 88, 11, 4); ctx.fill(); TTA.wood(g.x - 43, g.py + 1, 86, 9, g.x, Q.wood, { nails: true }); rr(g.x - 44, g.py, 88, 11, 4); ctx.stroke();
      ctx.fillStyle = Q.woodDk; for (const dx of [-38, 33]) { ctx.fillRect(g.x + dx, g.py - 100, 5, 100); ctx.fillStyle = 'rgba(255,230,190,0.3)'; ctx.fillRect(g.x + dx, g.py - 100, 1.5, 100); ctx.fillStyle = Q.woodDk; }
      ctx.fillStyle = '#d9b86a'; ctx.beginPath(); ctx.moveTo(g.x - 54, g.py - 98); ctx.lineTo(g.x, g.py - 126); ctx.lineTo(g.x + 54, g.py - 98); ctx.closePath(); ctx.fill();
      // (art pass) reed thatch: bundles fanning from the peak, a shaded eave, a tied ridge
      ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(140,100,40,0.6)'; ctx.lineWidth = 1.3; ctx.beginPath();
      for (let k = -10; k <= 10; k++) { ctx.moveTo(g.x + k * 0.6, g.py - 124); ctx.lineTo(g.x + k * 5.4, g.py - 98); }
      ctx.stroke(); ctx.fillStyle = 'rgba(90,60,20,0.3)'; ctx.fillRect(g.x - 56, g.py - 104, 112, 8);
      ctx.strokeStyle = 'rgba(255,245,200,0.5)'; ctx.beginPath(); for (let k = -9; k <= 9; k += 3) { ctx.moveTo(g.x + k * 0.6 - 1, g.py - 122); ctx.lineTo(g.x + k * 5.4 - 2, g.py - 100); } ctx.stroke();
      ctx.restore(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.x - 54, g.py - 98); ctx.lineTo(g.x, g.py - 126); ctx.lineTo(g.x + 54, g.py - 98); ctx.closePath(); ctx.stroke();
      ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x - 7, g.py - 120); ctx.lineTo(g.x + 7, g.py - 120); ctx.stroke(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    } else if (g.perch === 'col') {
      ctx.lineWidth = 3; ctx.fillStyle = '#efe6d2'; ctx.fillRect(g.x - 13, g.py + 10, 26, gy - g.py);
      ctx.fillStyle = 'rgba(120,100,80,0.18)'; ctx.fillRect(g.x + 4, g.py + 10, 9, gy - g.py); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(g.x - 11, g.py + 10, 3, gy - g.py);
      ctx.strokeStyle = 'rgba(150,130,110,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); for (let y2 = g.py + 26; y2 < gy - 6; y2 += 34) { ctx.moveTo(g.x - 13, y2); ctx.lineTo(g.x + 13, y2); } ctx.moveTo(g.x - 9, g.py + 40); ctx.lineTo(g.x - 4, g.py + 52); ctx.lineTo(g.x - 6, g.py + 62); ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.strokeRect(g.x - 13, g.py + 10, 26, gy - g.py);
      ctx.strokeStyle = 'rgba(28,26,54,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); for (const dx of [-5, 3]) { ctx.moveTo(g.x + dx, g.py + 16); ctx.lineTo(g.x + dx, gy - 6); } ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillStyle = '#f6efdf'; rr(g.x - 22, g.py, 44, 12, 4); ctx.fill(); ctx.stroke(); rr(g.x - 19, gy - 10, 38, 12, 3); ctx.fill(); ctx.stroke();
    }
  }
  // --- the city wall of Troy, up to the Great Gate ---
  if (c.gateX + 150 > L && c.wallX0 < R) {
    const wa = Math.max(c.wallX0, L), wb = Math.min(c.gateX + 130, R), top = K.perchY;
    ctx.fillStyle = Q.stone; ctx.lineWidth = 3; ctx.fillRect(wa, top, wb - wa, 260);
    // (art pass) dressed blocks of the wall: each its own tone, lit tops, chipped corners, speckle, moss along the foot
    TTA.stones(wa, top + 9, wb - wa, 251, 3, Q.stone, { bw: 66, bh: 36, wx: 0, wy: top + 30, moss: false, mortar: 'rgba(28,26,54,0.3)' });
    ctx.fillStyle = Q.stoneLt; ctx.fillRect(wa, top, wb - wa, 9);
    ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.fillRect(wa, top + 9, wb - wa, 4);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillStyle = Q.stone;
    for (let x = Math.floor(wa / 46) * 46; x < Math.min(wb, c.gateX - 20); x += 46) if (x >= c.wallX0) { ctx.fillRect(x + 4, top - 20, 24, 20); TTA.bevel(x + 4, top - 20, 24, 20, { lit: 0.35, dk: 0.14 }); ctx.strokeRect(x + 4, top - 20, 24, 20); }
    ctx.beginPath(); ctx.moveTo(wa, top); ctx.lineTo(wb, top); ctx.stroke();
    if (c.wallX0 > L) { ctx.fillStyle = Q.stoneDk; ctx.fillRect(c.wallX0 - 16, top - 30, 34, 300); ctx.strokeRect(c.wallX0 - 16, top - 30, 34, 300); }
  }
  // --- the streets: houses with flat roofs ---
  for (let hi = 0; hi < c.houses.length; hi++) {
    const hs = c.houses[hi];
    if (hs.x0 + hs.w < L || hs.x0 > R) continue;
    const gy = tthTroyGy(ph, hs.x0 + hs.w / 2) + 30;
    // (art pass) each house is still, so it is painted once into a picture (TTA.pic) and copied each frame
    TTA.pic('troyhouse|' + hi + '|' + hs.x0 + '|' + hs.top + '|' + hs.w + '|' + gy, hs.w + 80, gy - hs.top + 34, 40, 22, () => {
    ctx.translate(-hs.x0, -hs.top); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = 3; ctx.strokeStyle = C.ink; ctx.fillStyle = hs.col; ctx.fillRect(hs.x0, hs.top, hs.w, gy - hs.top); ctx.strokeRect(hs.x0, hs.top, hs.w, gy - hs.top);
    ctx.fillStyle = 'rgba(90,50,110,0.14)'; ctx.fillRect(hs.x0 + hs.w * 0.62, hs.top, hs.w * 0.38, gy - hs.top);
    // (art pass) limewashed mud brick: mottling, a chipped patch, cracks, corner stones, a stone plinth, grime at the foot
    const hseed = hs.x0 | 0, base0 = tthTroyGy(ph, hs.x0 + hs.w / 2);
    TTA.plaster(hs.x0 + 1.5, hs.top + 1.5, hs.w - 3, base0 - hs.top - 1.5, hseed, hs.col, { brick: '#b07a52' });
    TTA.stones(hs.x0 + 1.5, base0 - 16, hs.w - 3, gy - base0 + 14, hseed, Q.stone, { bw: 30, bh: 12, wx: hs.x0, wy: base0 - 16, lit: 0.3 });
    ctx.fillStyle = 'rgba(28,26,54,0.22)'; ctx.fillRect(hs.x0 + 1.5, hs.top + 1.5, hs.w - 3, 6);
    ctx.lineWidth = 3; ctx.strokeStyle = C.ink;
    ctx.fillStyle = Q.roof; rr(hs.x0 - 7, hs.top - 9, hs.w + 14, 13, 4); ctx.fill(); TTA.tiles(hs.x0 - 5.5, hs.top - 7.5, hs.w + 11, 10, Q.roof, { seed: hseed, step: 10 }); rr(hs.x0 - 7, hs.top - 9, hs.w + 14, 13, 4); ctx.stroke();
    // roof beam ends poking out under the eave
    ctx.fillStyle = Q.woodDk; ctx.lineWidth = 1.5; for (let bx = hs.x0 + 10; bx < hs.x0 + hs.w - 8; bx += 22) { ctx.fillRect(bx, hs.top + 4, 6, 6); ctx.strokeRect(bx, hs.top + 4, 6, 6); }
    ctx.lineWidth = 3;
    const dx = hs.x0 + hs.w * hs.door, base = tthTroyGy(ph, hs.x0 + hs.w / 2);
    // a stone door frame, then the plank door: boards, iron studs, a ring pull, a lit step
    ctx.fillStyle = Q.stoneLt; ctx.beginPath(); ctx.moveTo(dx - 18, base + 4); ctx.lineTo(dx - 18, base - 42); ctx.quadraticCurveTo(dx, base - 63, dx + 18, base - 42); ctx.lineTo(dx + 18, base + 4); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 3;
    ctx.fillStyle = '#5a3b22'; ctx.beginPath(); ctx.moveTo(dx - 13, base + 4); ctx.lineTo(dx - 13, base - 40); ctx.quadraticCurveTo(dx, base - 56, dx + 13, base - 40); ctx.lineTo(dx + 13, base + 4); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(20,10,5,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (const ox of [-6.5, 0, 6.5]) { ctx.moveTo(dx + ox, base - 56); ctx.lineTo(dx + ox, base + 4); } ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,170,0.18)'; ctx.beginPath(); for (const ox of [-10, -3.5, 3, 9.5]) { ctx.moveTo(dx + ox, base - 50); ctx.lineTo(dx + ox, base); } ctx.stroke();
    ctx.fillStyle = 'rgba(30,18,10,0.45)'; ctx.fillRect(dx - 13, base - 30, 26, 4); ctx.fillRect(dx - 13, base - 10, 26, 4);
    ctx.fillStyle = '#d9a441'; for (const ox of [-9, 0, 9]) for (const oy of [-28, -8]) { circle(dx + ox, base + oy, 1.3); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(dx - 13, base + 4); ctx.lineTo(dx - 13, base - 40); ctx.quadraticCurveTo(dx, base - 56, dx + 13, base - 40); ctx.lineTo(dx + 13, base + 4); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = Q.bronzeDk; ctx.lineWidth = 1.8; circle(dx + 7, base - 18, 3); ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = C.ink;
    for (let k = 0; k < hs.win; k++) {
      const wx = hs.x0 + hs.w * (hs.door < 0.5 ? 0.62 + k * 0.2 : 0.14 + k * 0.2), wy = Math.max(hs.top + 22, base - 120);
      // a deep window: the stone lintel and sill, the opening, a lattice (or the lamplight), shutters
      ctx.fillStyle = Q.stoneLt; ctx.lineWidth = 2; ctx.fillRect(wx - 3, wy - 4, 24, 4); ctx.strokeRect(wx - 3, wy - 4, 24, 4); ctx.fillRect(wx - 4, wy + 24, 26, 4); ctx.strokeRect(wx - 4, wy + 24, 26, 4);
      ctx.fillStyle = hs.lit && k === 0 ? '#ffd98a' : '#5b4a78'; rr(wx, wy, 18, 24, 5); ctx.fill();
      ctx.fillStyle = hs.lit && k === 0 ? 'rgba(200,110,40,0.4)' : 'rgba(20,14,40,0.35)'; ctx.fillRect(wx + 1, wy + 1, 17, 6);
      ctx.strokeStyle = hs.lit && k === 0 ? 'rgba(120,70,30,0.7)' : 'rgba(30,20,50,0.6)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(wx + 9, wy + 2); ctx.lineTo(wx + 9, wy + 23); ctx.moveTo(wx + 1, wy + 12); ctx.lineTo(wx + 17, wy + 12); ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(wx, wy, 18, 24, 5); ctx.stroke();
      if ((hseed + k) % 2) { ctx.fillStyle = '#4f7a6a'; ctx.lineWidth = 1.5; for (const sx of [wx - 8, wx + 19]) { ctx.fillRect(sx, wy, 7, 24); ctx.strokeRect(sx, wy, 7, 24); } ctx.strokeStyle = 'rgba(20,40,30,0.5)'; ctx.beginPath(); for (const sx of [wx - 8, wx + 19]) for (let yy = wy + 5; yy < wy + 23; yy += 4) { ctx.moveTo(sx + 1, yy); ctx.lineTo(sx + 6, yy); } ctx.stroke(); ctx.strokeStyle = C.ink; }
    }
    ctx.lineWidth = 3;
    if (hs.awn) { ctx.lineWidth = 2.5; ctx.fillStyle = '#d9483b'; ctx.beginPath(); ctx.moveTo(dx - 22, base - 62); ctx.lineTo(dx + 22, base - 62); ctx.lineTo(dx + 28, base - 46); ctx.lineTo(dx - 28, base - 46); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f6efdf'; ctx.fillRect(dx - 9, base - 61, 6, 14); ctx.fillRect(dx + 5, base - 61, 6, 14); }
    if (hs.pot) { const px = hs.x0 + hs.w - 18; ctx.lineWidth = 2.5; ctx.fillStyle = '#c9783f'; ctx.beginPath(); ctx.moveTo(px - 5, base - 26); ctx.quadraticCurveTo(px - 13, base - 12, px - 6, base + 2); ctx.lineTo(px + 6, base + 2); ctx.quadraticCurveTo(px + 13, base - 12, px + 5, base - 26); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }, hs.x0, hs.top);
  }
  // --- the back of the narrow gates: a dark passage (their stone tops are drawn over the horse, in drawTop) ---
  for (const g of c.gates) {
    if (g.x + 190 < L || g.x - 60 > R) continue;
    const gy = tthTroyGy(ph, g.x + 60);
    ctx.fillStyle = g.alley ? '#6a5878' : '#57496e'; ctx.fillRect(g.x - 14, 150, K.gateLen + 28, gy - 150 + 4);
    ctx.fillStyle = g.alley ? Q.walls[1] : Q.stoneDk; ctx.lineWidth = 3; ctx.strokeStyle = C.ink;
    for (const px of [g.x - 34, g.x + K.gateLen + 14]) { ctx.fillRect(px, 150, 20, gy - 150 + 6); ctx.strokeRect(px, 150, 20, gy - 150 + 6); }
  }
  // a dusk tint over the scenery, so the lanterns, the road and the horse stand out
  tthScreen(st, () => { ctx.fillStyle = 'rgba(52,30,92,0.18)'; ctx.fillRect(0, 0, W, H); });
  // --- the road: the plain, the paved streets, the square ---
  const sq = c.goal - 330;
  // (art pass) the road and the ground under it are still, so they are painted in 256 px chunks into pictures (TTA.pic)
  // and copied each frame: the dusty track with stones and roots on the plain, worn paving slabs in town
  const roadPaint = (L, R) => {
    tthTroyDrawRoad(ph, -200, c.gateX - 30, '#8fa050', '#a57c4c', null, L, R);
    tthTroyDrawRoad(ph, c.gateX - 30, sq, '#e0cca2', '#b59a72', null, L, R);
    tthTroyDrawRoad(ph, sq, c.xMax + 200, '#f2e8d2', '#cdbb9a', null, L, R);
  // (art pass) the road's own ground: a dusty track with stones and roots on the plain, worn paving in town
  {
    const gyF = x => tthTroyGy(ph, x), ga = Math.max(L, -200), gb = Math.min(R, c.gateX - 30);
    if (gb > ga) TTA.soil(gyF, ga, gb, { deep: 130, grass: '#6f8a3a', grassLt: '#b5c76a', stones: ['#c9b08a', '#9a8a72', '#e0caa0'] });
    const pa = Math.max(L, c.gateX - 30), pb = Math.min(R, c.xMax + 200);
    if (pb > pa) {
      TTA.soil(gyF, pa, pb, { deep: 120, roots: false, stones: ['#cdbb9a', '#a8957a', '#e8dcc0'], bands: [[30, 10, 'rgba(255,240,210,0.12)'], [70, 16, 'rgba(60,40,20,0.10)'], [118, 30, 'rgba(40,24,14,0.12)']] });
      // a kerb of dressed paving slabs along the top of the road, each with a lit edge and a worn dip
      const sl = new Path2D(), lt = new Path2D(), dk = new Path2D();
      for (let x = Math.floor(pa / 34) * 34; x < pb; x += 34) {
        const y0 = gyF(x), y1 = gyF(x + 34), q = hash(x, 91);
        sl.moveTo(x + 1, y0 + 2); sl.lineTo(x + 33, y1 + 2); sl.lineTo(x + 33, y1 + 15); sl.lineTo(x + 1, y0 + 15); sl.closePath();
        lt.moveTo(x + 2, y0 + 3); lt.lineTo(x + 32, y1 + 3); lt.lineTo(x + 32, y1 + 5); lt.lineTo(x + 2, y0 + 5); lt.closePath();
        dk.moveTo(x + 2, y0 + 12); dk.lineTo(x + 32, y1 + 12); dk.lineTo(x + 32, y1 + 15); dk.lineTo(x + 2, y0 + 15); dk.closePath();
        if (q % 4 === 0) { dk.moveTo(x + 10, y0 + 7); dk.lineTo(x + 16, y0 + 9); dk.lineTo(x + 21, y0 + 7.5); dk.lineTo(x + 16, y0 + 10); dk.closePath(); }
      }
      ctx.fillStyle = 'rgba(255,248,230,0.25)'; ctx.fill(sl); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill(lt); ctx.fillStyle = 'rgba(60,40,30,0.22)'; ctx.fill(dk);
      ctx.strokeStyle = 'rgba(60,40,30,0.4)'; ctx.lineWidth = 1.2; ctx.stroke(sl);
      // weeds in the cracks
      ctx.strokeStyle = '#7f9a4a'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = Math.floor(pa / 34) * 34; x < pb; x += 34) { if (hash(x, 93) % 3) continue; const y = gyF(x); for (const d of [-3, 0, 3]) { ctx.moveTo(x + 1, y + 1); ctx.lineTo(x + 1 + d, y - 4 - Math.abs(d)); } }
      ctx.stroke();
    }
  }
  };
  if (!c.roadSig) c.roadSig = c.ramps.map(r => r.x0 + ':' + r.rise + ':' + r.len).join(',') + '|' + c.gateX + '|' + c.goal + '|' + c.xMax;
  for (let i = Math.floor(L / 256); i * 256 < R; i++) {
    const x0c = i * 256; let top = 1e9; for (let x = x0c - 24; x <= x0c + 280; x += 8) top = Math.min(top, tthTroyGy(ph, x)); top = Math.floor(top) - 14;
    // (each chunk paints past its own picture edges, so it has no soft edge, neighbours overlap and no seam shows)
    TTA.pic('troyroad|' + c.roadSig + '|' + i + '|' + top, 260, H + 14 - top, 2, 0, () => {
      ctx.translate(-x0c, -top); ctx.beginPath(); ctx.rect(x0c - 4, top, 264, H + 14 - top); ctx.clip(); ctx.lineJoin = 'round';
      roadPaint(x0c - 40, x0c + 296);
    }, x0c, top);
  }
  // paving joints, grass tufts
  ctx.strokeStyle = 'rgba(28,26,54,0.2)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = Math.floor(L / 52) * 52; x < R; x += 52) {
    const gy = tthTroyGy(ph, x);
    if (x > c.gateX - 30) { ctx.moveTo(x, gy + 2); ctx.lineTo(x - 5, gy + 12); ctx.moveTo(x + 22, gy + 30); ctx.lineTo(x + 48, gy + 30); ctx.moveTo(x - 8, gy + 54); ctx.lineTo(x + 14, gy + 54); }
    else { ctx.moveTo(x, gy + 26); ctx.lineTo(x + 20, gy + 26); ctx.moveTo(x + 30, gy + 50); ctx.lineTo(x + 42, gy + 50); }
  }
  ctx.stroke();
  // the gold star in the square
  if (c.goal + 200 > L && c.goal - 200 < R) {
    const gx = c.goal + (K.park[0] + K.park[1]) / 2, gy = tthTroyGy(ph, gx) + 22, pulse = ph.done ? 1 : 0.75 + 0.25 * Math.sin(t * 4);
    ctx.save(); ctx.translate(gx, gy); ctx.scale(1, 0.32);
    ctx.fillStyle = `rgba(255,197,61,${0.35 * pulse})`; circle(0, 0, 92); ctx.fill();
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 30 : 70; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  // --- what only shows in the light: each guard's strip of ground, the signs, loose planks, the safe spots, the guards ---
  ctx.save(); ctx.globalAlpha = light;
  for (const g of c.guards) {
    if (g.deco || g.z1 + g.w / 2 < L || g.z0 - g.w / 2 > R) continue;
    const act = g.state !== 'idle' && g.state !== 'asleep';
    ctx.fillStyle = act ? `rgba(${Q.beam},0.8)` : 'rgba(255,255,255,0.3)';
    for (let x = Math.max(g.z0 - g.w / 2, Math.floor(L / 18) * 18); x < Math.min(g.z1 + g.w / 2, R); x += 18) ctx.fillRect(x, tthTroyGy(ph, x) + 4, 9, 3.5);
  }
  for (const s of c.signs) if (s.x > L - 30 && s.x < R + 30) tthTroySign(ph, s);
  for (const b of c.bumps) {
    if (b.x < L - 40 || b.x > R + 40) continue;
    const gy = tthTroyGy(ph, b.x), wob = b.t < 0.5 ? Math.sin(b.t * 40) * (0.5 - b.t) * 0.5 : 0;
    ctx.save(); ctx.translate(b.x, gy); ctx.rotate(-0.1 + wob);
    ctx.fillStyle = Q.woodLt; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(-26, -6, 52, 9, 2); ctx.fill(); TTA.wood(-25, -5, 50, 7, b.x | 0, Q.woodLt); rr(-26, -6, 52, 9, 2); ctx.stroke();
    ctx.fillStyle = C.ink; circle(-19, -1.5, 1.6); ctx.fill(); circle(19, -1.5, 1.6); ctx.fill();
    ctx.restore();
  }
  for (const hd of c.hides) {
    if (hd.x < L - 40 || hd.x > R + 40) continue;
    const px = hd.x - 150, gy = tthTroyGy(ph, px), wave = Math.sin(t * 5 + hd.x) * 3;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.fillStyle = Q.woodDk; ctx.fillRect(px - 2.5, gy - 150, 5, 150); ctx.strokeRect(px - 2.5, gy - 150, 5, 150);
    ctx.fillStyle = hd.got ? C.gold : '#cfd3e6'; ctx.beginPath(); ctx.moveTo(px + 3, gy - 148); ctx.quadraticCurveTo(px + 22, gy - 150 + wave, px + 42, gy - 134); ctx.quadraticCurveTo(px + 22, gy - 126 + wave, px + 3, gy - 120); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (hd.got) { ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px + 11, gy - 135); ctx.lineTo(px + 17, gy - 129); ctx.lineTo(px + 27, gy - 141); ctx.stroke(); }
  }
  // the bells the Thief rings
  for (const b of c.bells) {
    if (b.at < L - 60 || b.at > R + 60) continue;
    const gy = tthTroyGy(ph, b.at), sw = Math.sin(t * 13) * b.swing * 0.5;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillStyle = Q.woodDk;
    for (const dx of [-30, 24]) { ctx.fillRect(b.at + dx, 150, 7, gy - 150 + 4); TTA.wood(b.at + dx, 150, 7, gy - 150 + 4, b.at + dx, Q.woodDk, { knots: false }); ctx.strokeRect(b.at + dx, 150, 7, gy - 150 + 4); }
    ctx.fillStyle = Q.woodDk; rr(b.at - 40, 142, 80, 11, 4); ctx.fill(); TTA.wood(b.at - 39, 143, 78, 9, b.at | 0, Q.woodDk, { nails: true }); rr(b.at - 40, 142, 80, 11, 4); ctx.stroke();
    ctx.save(); ctx.translate(b.at, 153); ctx.rotate(sw);
    ctx.fillStyle = Q.bronze; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-8, 22, -19, 32); ctx.lineTo(19, 32); ctx.quadraticCurveTo(8, 22, 6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = Q.bronzeDk; circle(-sw * 20, 35, 4.5); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // the guards on their perches
  for (const g of c.guards) {
    if (g.x < L - 40 || g.x > R + 40) continue;
    const asleep = g.state === 'asleep', nap = g.state === 'rest' || g.state === 'idle' || g.state === 'deco';
    tthTroyDrawGuard(g.x, g.py, { face: g.face, up: g.up, on: Math.max(g.on, g.up * 0.6), sleep: asleep || nap,
      mark: g.state === 'tele' || (g.state === 'look' && g.lp === 'tele') ? '?' : g.state === 'alert' ? '!' : asleep ? 'z' : null });
  }
  ctx.restore();
}

/* ---------- drawing: the horse (a cutaway: Pip and Bo are inside) ---------- */
// horse units: x toward the nose, y up is negative, the origin on the road under its middle (see tthTroyPt)
function tthTroyDrawHorse(st) {
  const ph = st.ph, K = TTHTROY, Q = TTHTROYC, h = ph.h, t = G.clock, rl = ph.roller, lk = 1 - rl;
  const shake = ph.claw && ph.claw.st === 'tug' ? Math.sin(t * 34) * 1.2 : ph.caught && ph.caught.t < 0.5 ? Math.sin(t * 50) * 2 * (0.5 - ph.caught.t) : 0;
  ctx.save(); ctx.translate(h.x + shake, h.y); ctx.rotate(h.tilt); ctx.scale(K.hs, K.hs);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  ctx.fillStyle = 'rgba(28,26,54,0.25)'; ctx.beginPath(); ctx.ellipse(0, 2, 128, 8, 0, 0, Math.PI * 2); ctx.fill();
  // the rope tail
  const sw = Math.sin(t * 2.2) * 5 - clamp(h.v * 0.12, -14, 14);
  ctx.strokeStyle = '#e8d2a0'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-110, -160); ctx.quadraticCurveTo(-134, -150, -130 + sw, -108); ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-126 + sw, -112); ctx.lineTo(-136 + sw, -100); ctx.moveTo(-130 + sw, -108); ctx.lineTo(-130 + sw, -96); ctx.moveTo(-133 + sw, -110); ctx.lineTo(-124 + sw, -98); ctx.stroke();
  // legs (the far pair darker), the cart and its wheels
  ctx.lineWidth = 3;
  for (const [lx, col] of [[-78, Q.woodDk], [62, Q.woodDk], [-98, Q.wood], [40, Q.wood]]) { ctx.fillStyle = col; rr(lx, -100, 22, 70, 6); ctx.fill(); TTA.wood(lx + 1.5, -98, 19, 66, lx + 300, col, { vert: true }); rr(lx, -100, 22, 70, 6); ctx.stroke(); ctx.fillStyle = Q.woodDk; ctx.fillRect(lx + 1.5, -46, 19, 7); ctx.fillStyle = Q.bronze; circle(lx + 5, -42.5, 1.6); ctx.fill(); circle(lx + 17, -42.5, 1.6); ctx.fill(); }
  ctx.fillStyle = Q.woodDk; rr(-122, -38, 248, 15, 6); ctx.fill(); TTA.wood(-120, -36.5, 244, 12, 777, Q.woodDk, { nails: true }); rr(-122, -38, 248, 15, 6); ctx.stroke();
  ctx.strokeStyle = Q.woodLt; ctx.lineWidth = 2.5; ctx.beginPath(); for (let x = -108; x < 116; x += 20) { ctx.moveTo(x, -27); ctx.lineTo(x + 7, -34); ctx.lineTo(x + 14, -27); } ctx.stroke();
  for (const wx of [-80, 80]) {
    ctx.save(); ctx.translate(wx, -20); ctx.rotate(h.rot);
    ctx.fillStyle = '#7a4a22'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; circle(0, 0, 20); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = Q.woodLt; ctx.lineWidth = 4; ctx.beginPath(); for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; ctx.moveTo(Math.cos(a) * 15, Math.sin(a) * 15); ctx.lineTo(-Math.cos(a) * 15, -Math.sin(a) * 15); } ctx.stroke();
    ctx.fillStyle = Q.bronze; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(0, 0, 5); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // the neck and the head (the hull), then the belly
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.fillStyle = Q.wood;
  ctx.beginPath(); ctx.moveTo(22, -176); ctx.lineTo(48, -252); ctx.quadraticCurveTo(50, -258, 58, -258); ctx.lineTo(104, -258); ctx.quadraticCurveTo(124, -252, 131, -232); ctx.lineTo(132, -214);
  ctx.quadraticCurveTo(128, -204, 112, -204); ctx.lineTo(102, -206); ctx.lineTo(92, -160); ctx.lineTo(40, -140); ctx.closePath(); ctx.fill(); ctx.stroke();
  rr(-113, -186, 180, 94, 28); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(122,74,34,0.55)'; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(106, -256); ctx.lineTo(106, -206); ctx.moveTo(118, -248); ctx.lineTo(118, -206); ctx.moveTo(33, -186); ctx.lineTo(44, -150); ctx.moveTo(98, -190); ctx.lineTo(60, -150);
  for (const lx of [-98, -78, 40, 62]) { ctx.moveTo(lx + 11, -92); ctx.lineTo(lx + 11, -48); }
  ctx.stroke();
  ctx.strokeStyle = C.ink;
  // the mane and an ear
  ctx.fillStyle = Q.woodDk; ctx.lineWidth = 2.5;
  for (let k = 0; k < 5; k++) { const u = k / 5, mx = 24 + u * 24, my = -182 - u * 66; ctx.beginPath(); ctx.moveTo(mx + 2, my + 4); ctx.lineTo(mx - 13, my - 6); ctx.lineTo(mx + 7, my - 12); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = Q.wood; ctx.beginPath(); ctx.moveTo(52, -256); ctx.lineTo(50, -282); ctx.lineTo(66, -258); ctx.closePath(); ctx.fill(); ctx.stroke();
  // the cutaway: the room in the belly and the shaft up the neck
  ctx.fillStyle = Q.inside; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(46, -172); ctx.lineTo(62, -246); ctx.lineTo(100, -246); ctx.lineTo(100, -216); ctx.lineTo(90, -172); ctx.closePath(); ctx.fill(); ctx.stroke();
  rr(-103, -176, 160, 76, 20); ctx.fill(); ctx.stroke();
  ctx.fillRect(48, -180, 40, 12);
  ctx.fillStyle = Q.insideLt; ctx.fillRect(-98, -106, 150, 6);
  // the inside lantern and its glow
  ctx.fillStyle = 'rgba(255,214,140,0.16)'; circle(-72, -150, 34 + Math.sin(t * 7) * 1.5); ctx.fill(); circle(74, -214, 24); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-72, -176); ctx.lineTo(-72, -160); ctx.stroke();
  ctx.fillStyle = '#ffe9a8'; ctx.lineWidth = 2; rr(-77, -160, 10, 13, 3); ctx.fill(); ctx.stroke();
  // the ladder up the neck
  ctx.strokeStyle = Q.woodLt; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(66, -104); ctx.lineTo(66, -240); ctx.moveTo(94, -104); ctx.lineTo(94, -214); ctx.stroke();
  ctx.lineWidth = 2.5; ctx.beginPath(); for (let y = -116; y > -240; y -= 16) { ctx.moveTo(66, y); ctx.lineTo(y < -214 ? 80 : 94, y); } ctx.stroke();
  // the crank wheel (it turns with the wheels), its chain down to the axle, the brake lever
  ctx.strokeStyle = '#2a2140'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(14, -128); ctx.lineTo(8, -100); ctx.moveTo(26, -128); ctx.lineTo(32, -100); ctx.stroke(); ctx.setLineDash([]);
  ctx.save(); ctx.translate(20, -130); ctx.rotate(h.rot * 0.7);
  ctx.fillStyle = Q.bronzeDk; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; circle(0, 0, 15); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = Q.bronze; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.moveTo(0, -11); ctx.lineTo(0, 11); ctx.stroke();
  ctx.fillStyle = Q.woodLt; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(-11, 0, 4); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#8a8fa8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-74, -102); ctx.lineTo(-70 - ph.lean * 16, -138); ctx.stroke();
  ctx.fillStyle = '#ff5f6d'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(-70 - ph.lean * 16, -140, 5); ctx.fill(); ctx.stroke();
  // Pip and Bo: the roller at the crank, the lookout on the ladder
  for (const id of [rl, lk]) {
    const s = tthTroySeat(ph, id), roll = id === rl;
    const bob = roll && Math.abs(h.v) > 12 && ph.seatU >= 1 ? Math.abs(Math.sin(h.rot * 1.4)) * -2.5 : 0;
    ctx.save(); ctx.translate(s.x, s.y + bob); ctx.scale(1 / K.hs, 1 / K.hs);
    tthDrawHero(id, 0, 0, { face: roll ? (ph.lean > 0.5 ? -1 : 1) : 1, sx: roll && ph.lean > 0.5 ? 1.08 : 1, sy: roll && ph.lean > 0.5 ? 0.93 : 1, stun: !!ph.caught && ph.caught.t < 1.2 && ((ph.caught.kind === 'moved') === roll) });
    ctx.restore();
  }
  // the rim of the neck in front of the lookout's feet, the hatch lid on its hinge
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.fillStyle = Q.woodLt;
  ctx.save(); ctx.translate(64, -258); ctx.rotate(-ph.peek * 1.75); rr(-2, -6, 38, 7, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = Q.bronze; circle(30, -2.5, 2.2); ctx.fill(); ctx.restore();
  // its painted face: an eye, a nostril, a smile; bronze studs along the belly
  ctx.fillStyle = '#ffffff'; ctx.lineWidth = 2.5; circle(113, -236, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; circle(115 + clamp(h.v * 0.01, -1, 1.4), -235, 3.2); ctx.fill(); circle(126, -220, 1.8); ctx.fill();
  ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(110, -211); ctx.quadraticCurveTo(120, -208, 128, -213); ctx.stroke();
  ctx.fillStyle = Q.bronze; ctx.lineWidth = 1.5; for (let x = -100; x <= 52; x += 19) { circle(x, -181, 2.6); ctx.fill(); ctx.stroke(); circle(x, -96.5, 2.6); ctx.fill(); ctx.stroke(); }
  // the iron ring on the neck (the Thief's claw hooks it)
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6; circle(34, -226, 8); ctx.stroke(); ctx.strokeStyle = '#b9bdd0'; ctx.lineWidth = 3; circle(34, -226, 8); ctx.stroke();
  // lantern light leaking through the planks where a beam is on the horse
  if (ph.frz > 0.02) {
    const a0 = clamp(ph.lit0 / K.hs, -113, 132), a1 = clamp(ph.lit1 / K.hs, -113, 132);
    if (a1 > a0 || ph.lit) {
      if (a1 > a0) { ph.leak0 = a0; ph.leak1 = a1; }
      ctx.fillStyle = `rgba(${Q.beam},${ph.frz * (0.3 + Math.sin(t * 16) * 0.06)})`;
      for (let x = Math.ceil(ph.leak0 / 12) * 12; x < ph.leak1; x += 12) { const head = x > 50; ctx.fillRect(x - 2.5, head ? -256 : -184, 5, head ? (x > 98 ? 50 : 162) : 92); }
    }
  }
  ctx.restore();
}
// a guard's lantern beam: from the lantern down to its strip of ground
function tthTroyDrawBeam(ph, lx, ly, x0, x1, a) {
  if (a <= 0.01) return;
  const y0 = tthTroyGy(ph, x0) + 8, y1 = tthTroyGy(ph, x1) + 8, B = TTHTROYC.beam;
  const g = ctx.createLinearGradient(0, ly, 0, Math.max(y0, y1));
  g.addColorStop(0, `rgba(${B},${0.55 * a})`); g.addColorStop(1, `rgba(${B},${0.2 * a})`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx - 4, ly); ctx.lineTo(lx + 4, ly); ctx.lineTo(x1, y1); ctx.lineTo(x0, y0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(${B},${0.5 * a})`; ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, 9, 0, 0, Math.PI * 2); ctx.fill();
}
function tthTroyDraw(st) {
  const ph = st.ph, K = TTHTROY, Q = TTHTROYC, c = ph.c, cam = st.cam, t = G.clock, h = ph.h, dark = 1 - ph.light;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // the patrol and the guard who wheels the horse back walk on the road (behind the plank curtain)
  ctx.save(); ctx.globalAlpha = ph.light;
  const pt = ph.patrol, pu = ph.pusher;
  if (pt) tthTroyDrawGuard(pt.x, tthTroyGy(ph, pt.x), { face: -1, up: pt.state === 'gone' ? 0.1 : 0.8, on: pt.state === 'gone' ? 0 : 1, walk: pt.walk, mark: null });
  if (pu) tthTroyDrawGuard(pu.x, tthTroyGy(ph, pu.x), { face: pu.face, walk: pu.walk, push: pu.push, lamp: false, mark: ph.caught && ph.caught.t < 1 ? '!' : null });
  ctx.restore();
  // hatch shut: the plank curtain. From inside the horse you cannot see out.
  if (dark > 0.01) tthScreen(st, () => {
    ctx.fillStyle = `rgba(24,15,9,${0.9 * dark})`; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(74,46,24,${0.9 * dark})`; ctx.lineWidth = 4; ctx.beginPath();
    for (let x = 30; x < W; x += 75) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    ctx.stroke();
    ctx.fillStyle = `rgba(255,176,96,${0.16 * dark})`;
    for (let x = 30; x < W; x += 150) ctx.fillRect(x + 2, 0, 1.5, H);
    ctx.fillStyle = `rgba(120,80,44,${dark})`;
    for (let x = 30; x < W; x += 75) for (const y of [70, 280, 480]) { circle(x - 10, y + (x % 50), 2.5); ctx.fill(); }
  });
  // the Thief again over the curtain: his machine glows in the dark
  if (dark > 0.05 && !st.thief.hidden) {
    const c2 = st.thief;
    ctx.save(); ctx.globalAlpha = dark * 0.3; ctx.fillStyle = '#b28dff'; circle(c2.x - 6, c2.y - 60 * c2.s, 74 * c2.s); ctx.fill();
    ctx.globalAlpha = dark * 0.85; tthDrawThief(c2); ctx.restore();
  }
  tthTroyDrawHorse(st);
  // lantern beams (they light the horse too)
  if (ph.light > 0.02) {
    ctx.save(); ctx.globalAlpha = ph.light;
    for (const g of c.guards) {
      if (g.on <= 0.01 || g.x < cam.x - 500 || g.x > cam.x + W + 500) continue;
      tthTroyDrawBeam(ph, g.x + g.face * (18 + g.up * 5), g.py - 30 - g.up * 16, g.sx - g.w / 2, g.sx + g.w / 2, g.on * (g.state === 'cheer' ? 0.7 : 1));
    }
    if (pt && pt.state !== 'gone') tthTroyDrawBeam(ph, pt.x - 22, tthTroyGy(ph, pt.x) - 30, pt.x - K.patrol.reach, pt.x + 12, 0.85);
    ctx.restore();
  }
  // the Thief's claw rope to the ring on the neck, and the unhook ring
  const cl = ph.claw;
  if (cl) {
    const P = tthThiefPts(st.thief).claw, Rg = tthTroyPt(h, 34, -226), k = cl.st === 'tug' ? 1 : clamp(cl.rope, 0, 1);
    const ex = P.x + (Rg.x - P.x) * k, ey = P.y + (Rg.y - P.y) * k, sag = cl.st === 'tug' ? (cl.pulling ? 2 : 10) + Math.sin(t * 30) * 2 : 26 * (1 - k) + 8;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.quadraticCurveTo((P.x + ex) / 2, (P.y + ey) / 2 + sag, ex, ey); ctx.stroke();
    ctx.strokeStyle = '#d9c7a0'; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(ex + 5, ey + 2, 8, Math.PI * 0.3, Math.PI * 1.5); ctx.stroke();
    ctx.strokeStyle = '#b9bdd0'; ctx.lineWidth = 3; ctx.stroke();
    if (cl.st === 'tug') {
      const r = 21;
      ctx.strokeStyle = 'rgba(28,26,54,0.75)'; ctx.lineWidth = 9; circle(Rg.x, Rg.y, r); ctx.stroke();
      ctx.strokeStyle = cl.gold ? C.gold : '#9fe07f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(Rg.x, Rg.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(cl.u, 0, 1)); ctx.stroke();
    }
  }
}
function tthTroyDrawTop(st) {
  const ph = st.ph, K = TTHTROY, Q = TTHTROYC, c = ph.c, cam = st.cam, t = G.clock, h = ph.h, big = tthBig(), z = big ? 1.35 : 1;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // the stone tops of the narrow gates pass over the horse
  for (const g of c.gates) {
    if (g.x + 220 < cam.x || g.x - 80 > cam.x + W) continue;
    const x0 = g.x - 40, w = K.gateLen + 80;
    ctx.save(); ctx.globalAlpha = ph.light;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5;
    if (g.alley) {
      ctx.fillStyle = Q.walls[3]; ctx.beginPath(); ctx.moveTo(x0, 112); ctx.lineTo(x0 + w, 112); ctx.lineTo(x0 + w, 186); ctx.lineTo(x0 + w - 26, 186); ctx.quadraticCurveTo(x0 + w / 2, 152, x0 + 26, 186); ctx.lineTo(x0, 186); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = Q.roof; rr(x0 - 6, 102, w + 12, 13, 4); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = Q.stone; ctx.fillRect(x0, 84, w, 100); ctx.strokeRect(x0, 84, w, 100);
      ctx.fillStyle = Q.stone; for (let x = x0 + 4; x < x0 + w - 20; x += 46) { ctx.fillRect(x, 64, 26, 20); ctx.strokeRect(x, 64, 26, 20); }
      ctx.fillStyle = Q.stoneLt; ctx.fillRect(x0 + 2, 86, w - 4, 8);
      ctx.fillStyle = Q.stoneDk; ctx.beginPath(); ctx.moveTo(x0 + 22, 184); ctx.quadraticCurveTo(x0 + w / 2, 150, x0 + w - 22, 184); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = Q.bronze; rr(x0 + w / 2 - 62, 104, 124, 34, 8); ctx.fill(); ctx.stroke();
      text('TROY', x0 + w / 2, 122, 22, C.ink, 'center');
    }
    ctx.restore();
  }
  // "FREEZE!": a beam is on the horse (the one cue that also shows in the dark)
  if (ph.frz > 0.05 && !ph.done && !ph.caught) {
    ctx.save(); ctx.globalAlpha = ph.frz;
    bigText('FREEZE!', h.x, h.y + 44, 26 * z, '#ffe28a', 1 + Math.sin(t * 14) * 0.04);
    ctx.restore();
  }
  // in the dark the patrol's footsteps can still be heard
  const pt = ph.patrol;
  if (pt && pt.walk && ph.light < 0.6) {
    const px = clamp(pt.x, cam.x + 60, cam.x + W - 60), u = (t * 1.5) % 1;
    ctx.save(); ctx.globalAlpha = (1 - ph.light) * (1 - u);
    bigText(Math.floor(t * 1.5) % 2 ? 'tap' : 'TAP', px + (Math.floor(t * 1.5) % 2 ? 14 : -14), tthTroyGy(ph, px) - 16 - u * 14, 17 * z, '#ffffff', 1);
    ctx.restore();
  }
  // park on the gold star
  if (ph.k === 2 && !ph.done && ph.light > 0.3) {
    const gx = c.goal + (K.park[0] + K.park[1]) / 2;
    if (gx - h.x < 620 && Math.abs(h.x - gx) > 40) {
      const y = tthTroyGy(ph, gx) - 120 - Math.abs(Math.sin(t * 5)) * 10;
      ctx.save(); ctx.globalAlpha = ph.light;
      bigText('PARK HERE', gx, y - 26 * z, 20 * z, C.gold, 1);
      ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx - 13, y); ctx.lineTo(gx + 13, y); ctx.lineTo(gx, y + 18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
}
// screen coords: the tiptoe gauge near a narrow gate or a loose plank, "too dark" over the roller
function tthTroyHud(st) {
  const ph = st.ph, K = TTHTROY, c = ph.c, h = ph.h, big = tthBig(), z = big ? 1.35 : 1;
  if (st.cut || G.introT > 0) return;
  const nose = h.x + K.body[1], fw = h.x + K.wheel;
  const gate = c.gates.find(g => nose > g.x - 320 && nose < g.x + K.gateLen), plank = c.bumps.find(b => fw > b.x - 240 && fw < b.x + 6);
  if ((gate || plank) && ph.light > 0.3 && !tthTroyEvent(ph)) {
    const lim = gate && gate.gold ? K.slowGold : K.slow, ok = h.v <= lim, w = 150 * z, x0 = h.x - st.cam.x - w / 2, y = H - 26 * z, bh = 14 * z;
    ctx.save(); ctx.globalAlpha = ph.light;
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(x0 - 6, y - 5, w + 12, bh + 10, (bh + 10) / 2); ctx.fill();
    ctx.fillStyle = 'rgba(159,224,127,0.35)'; rr(x0, y, w * lim / K.vmax, bh, bh / 2); ctx.fill();
    ctx.fillStyle = ok ? '#9fe07f' : '#ff5f6d'; rr(x0, y, Math.max(bh, w * clamp(h.v / K.vmax, 0, 1)), bh, bh / 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x0 + w * lim / K.vmax - 1.5, y - 3, 3, bh + 6);
    text(ok ? 'tiptoe: good!' : 'too fast: tiptoe!', x0 + w / 2, y - 16 * z, 13 * z, ok ? '#c8f2b0' : '#ffb0b6', 'center', 'body');
    ctx.restore();
  }
}

/* ---------- the phase ---------- */
TTH_PHASES.troy = {
  setup(st, L) { tthTroySetup(st, L); },
  step(st, dt) { tthTroyStep(st, dt); },
  coast(st, dt) { tthTroyCoast(st, dt); },
  hide: () => true,
  bubbleHidden: true,   // (this file draws Pip and Bo inside the horse: the computer's bubbles still show over its player)
  labels(st) { return st.ph.roller === 0 ? ['brake', 'peek'] : ['peek', 'brake']; },
  jobKeys(st) { return st.ph.roller === 1 ? ['lookout', 'roller'] : ['roller', 'lookout']; },
  legend(st) {
    const r = st.ph.roller;
    const roll = k => (k ? '<kbd>→</kbd> roll <kbd>↓</kbd> tiptoe <kbd>←</kbd> brake' : '<kbd>D</kbd> roll <kbd>S</kbd> tiptoe <kbd>A</kbd> brake');
    const look = k => (k ? 'the hatch: hold <kbd>↑</kbd> or' : 'the hatch: hold <kbd>W</kbd> or');
    return { pip: r === 0 ? roll(0) : look(0), bo: r === 1 ? roll(1) : look(1), padJump: 'peek (lookout)', padDown: 'right rolls, down tiptoes, left brakes (roller)' };
  },
  roles(st) { return st.ph.roller === 0 ? ['Roll!', 'Peek!'] : ['Peek!', 'Roll!']; },
  hudText(st) { const ph = st.ph; return TTHTROY_STRETCHES[Math.min(2, ph.k)].name; },
  progress(st) { return { n: st.ph.cpN, of: st.ph.c.hides.length + 1 }; },
  headLift: () => 6,
  drawBack(st) { tthTroyDrawBack(st); },
  draw(st) { tthTroyDraw(st); },
  drawTop(st) { tthTroyDrawTop(st); },
  hud(st) { tthTroyHud(st); },
};

/* ---------- sounds ---------- */
Sfx.extra.tthTroyPeek = function () { this.tone(420, 0.07, 'triangle', 0.04, 760); };
Sfx.extra.tthTroyShut = function () { this.tone(300, 0.05, 'square', 0.03, 160); };
Sfx.extra.tthTroyNope = function () { this.tone(170, 0.09, 'square', 0.03, 130); this.tone(140, 0.12, 'square', 0.03, 100, 0.1); };
Sfx.extra.tthTroyHm = function () { this.tone(330, 0.1, 'triangle', 0.04, 420); this.tone(420, 0.14, 'triangle', 0.04, 560, 0.11); };
Sfx.extra.tthTroySweep = function () { this.tone(520, 0.4, 'sine', 0.025, 260); };
Sfx.extra.tthTroyKnock = function () { this.tone(190, 0.05, 'square', 0.06, 120); this.tone(150, 0.08, 'triangle', 0.05, 90, 0.02); };
Sfx.extra.tthTroyStep = function () { this.tone(110, 0.04, 'triangle', 0.035, 80); };
Sfx.extra.tthTroyHey = function () { [660, 880, 660, 990].forEach((f, i) => this.tone(f, 0.09, 'square', 0.04, null, i * 0.08)); };
Sfx.extra.tthTroyRoll = function () { this.tone(95 + (G.tickN * 7 % 31), 0.07, 'sawtooth', 0.016, 70); };
Sfx.extra.tthTroyScrape = function () { this.tone(900, 0.3, 'sawtooth', 0.035, 300); this.tone(140, 0.2, 'triangle', 0.06, 70, 0.02); };
Sfx.extra.tthTroyClonk = function () { this.tone(240, 0.08, 'square', 0.06, 120); this.tone(120, 0.2, 'triangle', 0.07, 60, 0.04); };
Sfx.extra.tthTroyHook = function () { this.tone(1300, 0.06, 'square', 0.04, 700); this.tone(200, 0.25, 'sawtooth', 0.04, 90, 0.05); };
Sfx.extra.tthTroyCreak = function () { this.tone(260 + (G.tickN * 13 % 81), 0.16, 'sawtooth', 0.016, 180); };
Sfx.extra.tthTroyUnhook = function () { [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.05, null, i * 0.05)); this.tone(300, 0.3, 'sine', 0.04, 900, 0.1); };
Sfx.extra.tthTroyBell = function () { [0, 0.34].forEach(d => { this.tone(880, 0.5, 'triangle', 0.06, 860, d); this.tone(1760, 0.3, 'sine', 0.025, null, d); }); };
Sfx.extra.tthTroyWhee = function () { this.tone(380, 0.5, 'sine', 0.04, 900); };
Sfx.extra.tthTroySafe = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };

/* ---------- the room (this file fills in its own room of the level def) ---------- */
tthRoom('troy', {
  jobs: {
    roller: { title: 'Roller', act: 'brake', legend: '<kbd>D</kbd> roll <kbd>S</kbd> tiptoe <kbd>A</kbd> brake',
      howTo: ['Roll between the lantern sweeps. Stand still when a beam is on the horse.'] },
    lookout: { title: 'Lookout', act: 'peek', legend: '<kbd>W</kbd> peek',
      howTo: ['Hold peek to open the hatch and light the way. Shut it before a beam reaches your head.'] },
  },
  act: { label: 'peek', labels: ['brake', 'peek'] },
  tip: 'One rolls the horse, one peeks from the hatch to light the way. Freeze when a lantern beam is on the horse!',
  legend: { pip: '<kbd>D</kbd> roll <kbd>S</kbd> tiptoe <kbd>A</kbd> brake', bo: 'the hatch: hold <kbd>↑</kbd> or', padJump: 'peek (lookout)', padDown: 'right rolls, down tiptoes, left brakes (roller)' },
  map: TTH_EMPTY_MAP,
});
