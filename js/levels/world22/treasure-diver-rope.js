/* Pip & Bo - Level 22-2 Treasure Diver Rope (team, World 22 Coral Deep). */
'use strict';

/* ===== 22-2 Treasure Diver Rope (mode 'diverope', World 22 "Coral Deep", team) =====
   A little boat bobs on a sunny sea. One player stays in the boat, the other dives in an old-timey brass helmet on the
   end of an air hose (the rope). Seen from the side; the camera scrolls DOWN as the diver sinks and back up as they are
   reeled in. The mode owns the tick, the camera, the whole picture and the HUD (def.ownStep + def.ownHUD + def.noFalls);
   the engine grid is empty apart from the two spawns.
   Two jobs, and they swap every dive (room def `diver`: who dives this time; the other one runs the boat):
   THE DIVER wears heavy brass boots, so they sink and can't swim up on their own. ◀ ▶ swim sideways (also along rock
   ledges and the sand), ▲ (W / ↑, controller A, touch ▲) is a little kick up (to hop over a rock; not while carrying the
   chest), ▼ sinks faster. Gems, starfish and pearls are picked up just by touching them (into the net bag). The action
   (grab) hooks the treasure chest onto the hose. Holding ▼ while the hose is tight is a tug ("More rope!"); holding ▲
   for half a second while it's tight is a tug the other way ("Reel me up!").
   THE BOAT PARTNER works the winch and the air pump. ▼ (S / ↓, stick down, touch ▼) lets rope out: the hose is as long
   as the winch has let out, and that is as far as the diver can go from the boat (it only pays out while the diver
   pulls on it, DROPE.slack px of slack at most). ▲ (W / ↑, controller A, touch ▲) reels in and pulls the diver up. The
   action (pump) pumps air down the hose: every press adds air (a full stroke every DROPE.strokeT s; quicker presses add
   a bit less each, so a rhythm and a mash both work). Hands on the winch can't pump at the same time, so the boat
   partner juggles: let out rope, pump, reel. The boat drifts along by itself to stay above the diver.
   AIR: the air meter (bottom middle) goes down all the time the diver is under water, faster the deeper they are, and
   fills up again by itself right by the boat. Under DROPE.low the meter goes red and the winch reels twice as fast
   ("Air low! Reel up fast!"). Running out of air never hurts: "Blub! Back to the boat": the diver floats up in a big
   bubble (through anything), keeps the bag but lets go of the chest (it sinks back down where it was), and gets fresh
   air in the boat. It costs a little time and counts against the medal.
   TREASURE only counts once it's back in the boat: when the boat partner reels the diver all the way up, the bag goes
   into the boat ("+3 treasure!"). A dive ends when the chest is hauled into the boat; then they swap jobs.
   SO NOBODY CAN DO IT ALONE: without the boat partner the hose never gets longer than a few px (the chest is far
   below), and nobody else can hook the chest or carry it; without the diver nothing is ever grabbed.
   Things down there:
     rock ledges, cliffs  solid rock (coral on top): the diver lands on top, walks, swims round. Reeling under a ledge
                          snags ("Snag! Swim out from under the rock") until the diver swims to the open water.
     sleepy eels          peek out of holes in the rock. They doze ("z z z"), wake (eyes open, "!" for 0.8 s), then
                          stretch out across the water for a moment and go back in. Touching a stretched-out eel is a
                          soft "Eek!": both get a fright, the diver is nudged away and drops one thing from the bag
                          (it sinks to the rock or sand below, to pick up again).
     jellyfish            drift side to side: a touch is a "Boing!" bounce, nothing lost.
   Gold help (always announced in the gold message line, and only while both players are pressing things):
     an eel that startles the diver DROPE.goldEel times falls fast asleep for good (a gold nightcap);
     a jellyfish that bounces the diver DROPE.goldJelly times turns gold and lets you through;
     DROPE.goldBlub blubs in one dive give a gold air hose (air lasts twice as long that dive), and so does the air
       running low DROPE.goldLow times in one dive before the chest is hooked (a boat partner who reels but never pumps);
       if it still runs low DROPE.goldLow more times (or blubs once more), a gold pump keeps the air full that dive;
     the boat partner pressing things but not giving the rope (or reeling) the dive needs for DROPE.winchT s: a gold
       winch that lets out and reels in by itself when the diver needs it, that dive;
     no progress toward the chest (or the boat) for DROPE.stuckT s: a gold current that carries the diver the right way;
     DROPE.finderT s into a dive without the chest: gold sparkles show where it is (a pointer, not counted as help).
   4 dives (roomWord 'Dive'), each deeper: Sandy Shelf, Kelp Drop, Coral Cliffs, Deep Trench. Pip dives 1 and 3.
   Room def: { title, diver: 0|1, look: 'shelf'|'kelp'|'coral'|'trench', floor (px depth of the sand), boatX, tip, act,
     course: [items] }. Items (x 0..960 across, y = px of depth below the surface, down):
     ['rock', x0, y0, x1, y1]       a block of rock
     ['ledge', y, x0, x1]           a rock shelf (top at y, DROPE.ledgeT thick)
     ['eel', x, y, dir, reach]      an eel hole in the rock at (x, y) that stretches dir (1 right, -1 left) reach px
     ['jelly', x, y, a, per]        a jellyfish drifting a px side to side every per s
     ['gems', x, y, n, dx, dy]      n gems from (x, y), each dx, dy further on
     ['star', x, y] / ['pearl', x, y]   a starfish / a pearl (put them on a rock top or the sand: y = that top)
     ['chest', x, y]                the dive's treasure chest (its bottom at y)
     ['kelp', x, y, h] / ['coral', x, y, kind]   decoration
     ['sign', x, y, text]           a floating sign ({D} = the diver's name, {B} = the boat partner's)
   The plan's winch advice waits for an awake eel or a jellyfish in the way, and stops letting out rope to pump when the
   air is under half (only while someone pumps: after 2.5 s without a stroke the dive goes on).
   MODES.diverope.plan (st.plan, made once a step) is the one place that works out what's needed: the prompts, the job
   panels, the gold help and the computer brain all read it.
   Medal (MODES.diverope.medals, js/medals.js): Gold at <= 4:00 with <= 5 bumps and blubs, 70% of the treasure and <= 1
   gold help; Silver at <= 5:30 with <= 14 bumps and blubs; else Bronze.
   Every global is prefixed diverope / DROPE (and Sfx.extra.diverope*); all state lives in G.mst. Rules never use
   Math.random (only the looks do: bubbles, sparkles). */
const DROPE = {
  // the diver: a box hw each side of x, ht tall above the feet (y)
  hw: 13, ht: 46, swimA: 560, swimV: 125, drag: 2.6, sinkA: 320, sinkV: 92, sinkFast: 135, chestSink: 130,
  kickV: 165, kickCd: 0.6, tugT: 0.5,
  // the rope and winch (px, px/s)
  Lmin: 46, outV: 170, inV: 125, turbo: 2.2, slack: 70, anchorDX: 30, anchorY: -8,
  // air (fraction of the meter per s)
  drain0: 0.012, drainK: 0.075, drainD: 2000, stroke: 0.07, strokeT: 0.42, refill: 0.45, low: 0.3, nearY: 110,
  // the boat, the bubble ride, bumps
  boatV: 85, boatX0: 60, boatX1: 880, bubbleV: 250, inv: 1.4, eelPush: 190, jellyPush: 190, ledgeT: 44,
  camTop: -150, camLead: 230, look: 460, m: 20,
  // gold help
  goldEel: 2, goldJelly: 2, goldBlub: 2, goldLow: 3, winchT: 14, stuckT: 24, finderT: 35, activeT: 4,
  winT: 3.2, finT: 4.4,
};
const diveropeLerp = (a, b, u) => a + (b - a) * u;
const diveropeSmooth = u => u * u * (3 - 2 * u);
const diveropeMeters = px => Math.max(0, Math.round(px / DROPE.m));
const DIVEROPE_GEMS = ['#ff5fa2', '#5fd0ff', '#8fe36b', '#c08bff', '#ffd34a'];

/* ---------- the course: items -> rocks, eels, jellies, treasure ---------- */
function diveropeCompile(def) {
  const D = DROPE, di = def.diver || 0;
  const name = s => String(s).replace(/\{D\}/g, NAMES[di]).replace(/\{B\}/g, NAMES[1 - di]);
  const floor = def.floor || 800;
  const c = { floor, look: def.look || 'shelf', rocks: [], eels: [], jellies: [], items: [], chest: null, kelp: [], corals: [], signs: [] };
  // the sand (wide, so the diver never walks off it)
  c.rocks.push({ x0: -200, x1: W + 200, y0: floor, y1: floor + 600, kind: 'sand' });
  for (const it of def.course || []) {
    const k = it[0];
    if (k === 'rock') c.rocks.push({ x0: it[1], y0: it[2], x1: it[3], y1: it[4], kind: 'rock', seed: c.rocks.length * 7 + 3 });
    else if (k === 'ledge') c.rocks.push({ x0: it[2], x1: it[3], y0: it[1], y1: it[1] + D.ledgeT, kind: 'ledge', seed: c.rocks.length * 7 + 3 });
    else if (k === 'eel') {
      const [, x, y, dir, reach] = it;
      c.eels.push({ x, y, dir: dir || 1, reach: reach || 120, ph: (c.eels.length * 2.3 + 0.7) % 5.4, sleep: 2.6 + (c.eels.length % 3) * 0.35,
        bumps: 0, gold: false, fright: 0, ext: 0, said: false, col: c.eels.length % 2 });
    } else if (k === 'jelly') {
      const [, x, y, a, per] = it;
      c.jellies.push({ x0: x, y0: y, a: a || 60, per: per || 7, ph: c.jellies.length * 1.9, bumps: 0, gold: false, x, y, last: -9, squish: 0 });
    } else if (k === 'gems') {
      const [, x, y, n, dx, dy] = it;
      for (let i = 0; i < (n || 1); i++) c.items.push({ kind: 'gem', x: x + i * (dx || 0), y: y + i * (dy || 0), col: DIVEROPE_GEMS[c.items.length % 5], state: 'free', vy: 0, t: 0 });
    } else if (k === 'star') c.items.push({ kind: 'star', x: it[1], y: it[2] - 9, state: 'free', vy: 0, t: 0, col: '#ff9a4a' });
    else if (k === 'pearl') c.items.push({ kind: 'pearl', x: it[1], y: it[2] - 12, state: 'free', vy: 0, t: 0, col: '#fff6fb' });
    else if (k === 'chest') c.chest = { x: it[1], y: it[2], x0: it[1], y0: it[2], state: 'rest', vy: 0, open: 0 };
    else if (k === 'kelp') c.kelp.push({ x: it[1], y: it[2], h: it[3] || 120, ph: (it[1] * 0.013) % 6.28 });
    else if (k === 'coral') c.corals.push({ x: it[1], y: it[2], kind: it[3] || 0 });
    else if (k === 'sign') c.signs.push({ x: it[1], y: it[2], text: name(it[3]) });
  }
  if (!c.chest) c.chest = { x: 480, y: floor, x0: 480, y0: floor, state: 'rest', vy: 0, open: 0 };
  c.Lmax = floor + 260;
  return c;
}

// each player's own keys, for prompts and the HUD (a player with a controller is shown its buttons)
function diveropeKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'up') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'down') return pad || touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'left') return pad || touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'right') return pad || touch ? '▶' : id === 0 ? 'D' : '→';
  if (what === 'lr') return pad || touch ? '◀ ▶' : id === 0 ? 'A D' : '← →';
  if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
  return '';
}
// 1-player mode: the computer's own job gets no key hints or prompts (it knows its job)
const diveropeQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

/* ---------- a dive (one room) ---------- */
function diveropeRoom(st, L, k) {
  const def = L.def, D = DROPE;
  st.k = k; st.diver = def.diver || 0; st.boater = 1 - st.diver; st.title = def.title || '';
  st.c = diveropeCompile(def);
  st.stats.roomT[k] = null;
  const bx = def.boatX || 480;
  st.boat = { x: bx, vx: 0, bob: 0 };
  const ax = bx + D.anchorDX;
  st.d = { x: ax, y: D.Lmin + D.ht + D.anchorY, vx: 0, vy: 0, ground: false, kickCd: 0, inv: 0, wob: 0, face: 1, chest: false,
    bag: [], downT: 0, upT: 0, tug: 0, tugUp: 0, lastProgress: 0, spin: 0 };
  st.rope = { L: D.Lmin, mode: 'idle', strain: 0, snag: false, nodes: null, turn: 0 };
  st.air = 1; st.lastStroke = -9; st.airHold = null; st.pumpAnim = 0; st.pumps = 0; st.lowSaid = false; st.alarmT = 0;
  st.state = 'ride'; st.bubble = null; st.win = null;
  st.goldAir = false; st.goldPump = false; st.goldWinch = false; st.current = false; st.finder = false;
  st.blubs = 0; st.lows = 0; st.winchNeedT = 0; st.stuckT = 0; st.bestDist = 1e9; st.diveT = 0; st.planX = st.d.x;
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null;
  st.cam = D.camTop; st.t = 0; st.segStart = G.time; st.inT = [-99, -99];
  st.bankFx = null;
  diveropeRopeInit(st);
  st.plan = diveropePlan(st);
  diveropeMirror(st);
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function diveropeStep(st, dt) {
  if (!st.c) return;
  const ps = G.players;
  for (const k of [0, 1]) {
    const i = ps[k].input;
    if (i.left || i.right || i.jump || i.down || i.up || i.act) st.inT[k] = G.time;
  }
  diveropeActLabels(st);
  if (G.introT > 0) {
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
    diveropeLooks(st, dt); diveropeCam(st, dt); diveropeMirror(st); return;
  }
  st.t += dt; st.diveT += dt;
  diveropeCritters(st, dt);
  if (st.state === 'ride') diveropeRide(st, dt);
  else if (st.state === 'blub') diveropeBlubStep(st, dt);
  else if (st.state === 'win') { if (diveropeWinStep(st, dt)) return; }
  for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
  st.plan = diveropePlan(st);
  if (st.state === 'ride') st.planX = st.plan.tx;
  diveropeLooks(st, dt);
  diveropeCam(st, dt);
  diveropeMirror(st);
}
// both players have pressed something lately (gold help only comes while both are playing)
const diveropeBothActive = st => G.time - st.inT[0] < DROPE.activeT && G.time - st.inT[1] < DROPE.activeT;
const diveropeAnchor = st => ({ x: st.boat.x + DROPE.anchorDX, y: DROPE.anchorY + Math.sin(st.boat.bob) * 2 });
const diveropeAttach = d => ({ x: d.x, y: d.y - DROPE.ht + 2 });
function diveropeDist(st) { const a = diveropeAnchor(st), b = diveropeAttach(st.d); return Math.hypot(b.x - a.x, b.y - a.y); }

function diveropeRide(st, dt) {
  const D = DROPE, d = st.d, c = st.c, ps = G.players, dv = ps[st.diver], bt = ps[st.boater], id = dv.input, ib = bt.input;
  const pl = st.plan || diveropePlan(st);
  const dist0 = diveropeDist(st);
  // --- the boat partner: the winch (▲ reel in, ▼ let out) and the pump (the action)
  let up = !!(ib.jump || ib.up), down = !!ib.down;
  let mode = up && !down ? 'in' : down && !up ? 'out' : 'idle';
  // the gold winch does what the dive needs when the boat partner doesn't
  if (st.goldWinch && mode === 'idle' && (pl.rope === 'in' || pl.rope === 'out')) mode = pl.rope;
  const r = st.rope;
  if (mode !== r.mode && mode !== 'idle') Sfx.play(mode === 'in' ? 'diveropeReel' : 'diveropeOut');
  r.mode = mode;
  const turbo = st.air < D.low;
  if (mode === 'in') {
    r.L = Math.max(D.Lmin, Math.max(r.L - D.inV * (turbo ? D.turbo : 1) * dt, dist0 - 8));
    r.turn -= dt * (turbo ? 16 : 8);
    st.stats.reel[st.boater] += dt;
  } else if (mode === 'out') {
    r.L = Math.min(c.Lmax, r.L + D.outV * dt, Math.max(r.L, dist0 + D.slack));
    r.turn += dt * 8;
    st.stats.out[st.boater] += dt;
  }
  if (mode !== 'idle' && (r.sndT = (r.sndT || 0) - dt) <= 0) { r.sndT = turbo && mode === 'in' ? 0.09 : 0.16; Sfx.play('diveropeClick'); }
  // the pump: a fresh press pumps, unless the hands are on the winch
  if (bt.pendingAct) {
    if (mode !== 'idle') diveropeHintOnce(st, 'busy', st.boater, 'Let go of the winch to pump!');
    else {
      const gap = G.time - st.lastStroke, add = D.stroke * clamp(gap / D.strokeT, 0.25, 1);
      st.air = Math.min(1, st.air + add); st.lastStroke = G.time; st.pumpAnim = 1; st.pumps++; st.stats.pumps[st.boater]++;
      Sfx.play('diveropePump');
      const a = diveropeAttach(d);
      for (let i = 0; i < 3; i++) diveropePart(st, a.x + (Math.random() - 0.5) * 14, a.y - 4, (Math.random() - 0.5) * 30, -40 - Math.random() * 40, 1.2, 'rgba(255,255,255,0.8)', 2 + Math.random() * 2.5, -30, 'bub');
    }
  }
  // --- air
  const near = d.y < D.nearY;
  if (near) st.air = Math.min(1, st.air + D.refill * dt);
  else if (st.goldPump) st.air = Math.min(1, st.air + 0.08 * dt);
  else st.air -= (D.drain0 + D.drainK * clamp(d.y / D.drainD, 0, 1)) * (st.goldAir ? 0.5 : 1) * dt;
  if (st.air < D.low && !near) {
    if (!st.lowSaid) {
      st.lowSaid = true; diveropeMsg(st, 'Air low! ' + NAMES[st.boater] + ': reel up fast!', '#ff9a8a', 3); diveropeHint(st, st.boater, 'Air low! Hold ' + diveropeKey(st.boater, 'up') + ': the winch is extra fast now', 3.4);
      // (the air keeps running low before the chest is reached: the same gold air hose as for blubs)
      if (!d.chest && ++st.lows >= DROPE.goldLow && !st.goldAir && diveropeBothActive(st)) {
        st.goldAir = true; st.stats.helps++; st.lows = 0;
        diveropeMsg(st, 'Gold air hose! The air lasts twice as long this dive', C.gold, 4.4); Sfx.play('diveropeHelp');
      } else if (!d.chest && st.goldAir && st.lows >= DROPE.goldLow) diveropeGoldPump(st);
    }
    if ((st.alarmT -= dt) <= 0) { st.alarmT = 1.2; Sfx.play('diveropeAlarm'); }
  } else if (st.air > D.low + 0.15) st.lowSaid = false;
  if (st.air <= 0) { st.air = 0; diveropeStartBlub(st); return; }
  // --- the diver: swim, kick, sink, tug, grab
  const dir = (id.right ? 1 : 0) - (id.left ? 1 : 0);
  if (dir) d.face = dir;
  d.vx += dir * D.swimA * dt;
  d.vx *= Math.max(0, 1 - (dir ? D.drag * 0.4 : D.drag) * dt);
  if (st.current) d.vx += clamp((pl.tx - d.x) * 3 - d.vx, -260, 260) * dt;
  d.vx = clamp(d.vx, -D.swimV, D.swimV);
  if (dir) st.swimT = G.time;
  if (d.ground) d.groundT = G.time;
  // (a kick only works off a rock or the sand: heavy boots)
  const kickNow = (dv.pendingJump || (id.up && !d.prevUp)) && G.time - (d.groundT || -9) < 0.3;
  d.prevUp = !!id.up;
  if (d.kickCd > 0) d.kickCd -= dt;
  if (kickNow && d.kickCd <= 0 && !d.chest) {
    d.vy = -D.kickV; d.kickCd = D.kickCd; Sfx.play('diveropeKick');
    for (let i = 0; i < 4; i++) diveropePart(st, d.x + (Math.random() - 0.5) * 20, d.y, (Math.random() - 0.5) * 40, 20 + Math.random() * 30, 0.8, 'rgba(255,255,255,0.75)', 2 + Math.random() * 2, -40, 'bub');
  }
  const sinkT = d.chest ? D.chestSink : id.down ? D.sinkFast : D.sinkV;
  d.vy = approach(d.vy, sinkT, D.sinkA * dt);
  // tugs on the hose (held ▼ or ▲ while it's tight)
  const taut = dist0 > st.rope.L - 10;
  d.downT = id.down && taut && !d.ground ? d.downT + dt : 0;
  d.upT = (id.jump || id.up) && taut && !d.chest ? d.upT + dt : 0;
  if (d.downT > D.tugT && G.time - d.tug > 4) { d.tug = G.time; diveropePop(st, d.x, d.y - 70, 'Tug tug! More rope!', '#ffe7a8', 18); Sfx.play('diveropeTug'); }
  if (d.upT > D.tugT && G.time - d.tugUp > 2.5) { d.tugUp = G.time; diveropePop(st, d.x, d.y - 70, 'Tug tug! Reel me up!', '#ffe7a8', 18); Sfx.play('diveropeTug'); }
  // move: x then y, each pushed out of the rock
  d.x += d.vx * dt; diveropeCollide(st, 'x');
  d.y += d.vy * dt; d.ground = false; diveropeCollide(st, 'y');
  // the hose: no farther from the boat than the rope let out
  diveropeRopeHold(st, mode, turbo);
  // (y first here: a reel pulls the helmet up into a ledge's underside, and the x pass used to answer that by throwing
  // the diver sideways to the far edge of the whole rock, over 100 px)
  diveropeCollide(st, 'y'); diveropeCollide(st, 'x');
  if (d.y < 30) { d.y = 30; if (d.vy < 0) d.vy = 0; }
  d.x = clamp(d.x, 18, W - 18);
  // snag: reeling, but the diver can't come up (rock above)
  const dist1 = diveropeDist(st);
  if (mode === 'in' && r.L > D.Lmin + 1 && dist1 > r.L + 2) r.strain += dt; else r.strain = Math.max(0, r.strain - dt * 2);
  // (a winch that keeps pulling against the rock slips a little, so the diver can swim out)
  if (r.strain > 0.6) { r.L = Math.min(c.Lmax, dist1 + 26); r.strain = 0.36; }
  if (r.strain > 0.35 && !r.snag) { r.snag = true; diveropePop(st, d.x, d.y - 70, 'Snag!', '#ffd0a0', 22); Sfx.play('diveropeSnag'); diveropeHint(st, st.diver, 'Snag! Swim out from under the rock ' + (pl.tx < d.x ? '◀' : '▶'), 3); }
  if (r.strain <= 0.05) r.snag = false;
  if (d.inv > 0) d.inv -= dt;
  if (d.wob > 0) d.wob -= dt;
  // grab the chest (the action)
  const ch = c.chest;
  if (dv.pendingAct) {
    if (!d.chest && ch.state !== 'boat' && diveropeNearChest(st)) {
      d.chest = true; ch.state = 'hooked'; Sfx.play('diveropeHook');
      diveropePop(st, ch.x, ch.y - 60, 'Chest hooked!', C.gold, 26);
      diveropeHint(st, st.boater, 'Chest hooked! Hold ' + diveropeKey(st.boater, 'up') + ' to reel in', 3.6);
      rumble(st.diver, 0.3, 0.4, 160);
    } else if (!d.chest) { Sfx.play('diveropeGrabMiss'); }
  }
  if (d.chest) {
    ch.x = d.x + d.face * 10; ch.y = d.y + 38;
    // (standing on rock or sand: it sits on top, not half buried)
    for (const r of c.rocks) if (ch.x > r.x0 - 10 && ch.x < r.x1 + 10 && ch.y > r.y0 && d.y <= r.y0 + 2) ch.y = Math.min(ch.y, r.y0);
  }
  diveropeHazards(st);
  diveropePickups(st);
  // the boat drifts along above the diver
  const b = st.boat, bt2 = clamp(d.x - D.anchorDX, D.boatX0, D.boatX1);
  b.vx = clamp((bt2 - b.x) * 1.4, -D.boatV, D.boatV); b.x += b.vx * dt;
  // back at the boat: the bag goes in (and the chest ends the dive)
  if (r.L <= D.Lmin + 6 && d.y < D.nearY) diveropeBank(st);
  if (st.state !== 'ride') return;
  if (st.gemFor) st.gemT = (st.gemT || 0) + dt;
  diveropeHelp(st, dt);
  diveropeNudges(st);
}
function diveropeNearChest(st) {
  const d = st.d, ch = st.c.chest;
  return Math.abs(ch.x - d.x) < 46 && ch.y > d.y - 60 && ch.y < d.y + 56;
}
// keep the diver within the rope (a circle round the winch); a shortening rope pulls them in
function diveropeRopeHold(st, mode, turbo) {
  const D = DROPE, d = st.d, a = diveropeAnchor(st), t = diveropeAttach(d);
  const dx = t.x - a.x, dy = t.y - a.y, dist = Math.hypot(dx, dy), L = st.rope.L;
  if (dist <= L || dist < 1) return;
  const ux = dx / dist, uy = dy / dist;
  d.x -= ux * (dist - L); d.y -= uy * (dist - L);
  const vr = d.vx * ux + d.vy * uy;
  if (vr > 0) { d.vx -= ux * vr; d.vy -= uy * vr; }
  if (mode === 'in') { const want = -D.inV * (turbo ? D.turbo : 1) * 0.9; const v2 = d.vx * ux + d.vy * uy; if (v2 > want) { d.vx += ux * (want - v2); d.vy += uy * (want - v2); } }
}
// push the diver's box out of every rock, along one axis
function diveropeCollide(st, axis) {
  const D = DROPE, d = st.d;
  for (const r of st.c.rocks) {
    const x0 = d.x - D.hw, x1 = d.x + D.hw, y0 = d.y - D.ht, y1 = d.y;
    if (x1 <= r.x0 || x0 >= r.x1 || y1 <= r.y0 || y0 >= r.y1) continue;
    if (axis === 'x') {
      // (a low step is stepped onto instead of bumped)
      if (y1 - r.y0 < 8 && d.vy >= 0) { d.y = r.y0; d.ground = true; continue; }
      if (d.x < (r.x0 + r.x1) / 2) d.x = r.x0 - D.hw; else d.x = r.x1 + D.hw;
      d.vx = 0; d.blockT = G.time;
    } else if (d.vy >= 0 && y1 - r.y0 <= Math.max(14, d.vy * DT * 3 + 4)) { d.y = r.y0; d.vy = 0; d.ground = true; }
    else if (d.vy < 0 && r.y1 - y0 <= Math.max(14, -d.vy * DT * 3 + 4)) { d.y = r.y1 + D.ht; d.vy = 0; }
    else {
      // (deep inside after a pull: out the nearest side)
      const o = [[x1 - r.x0, -1, 0], [r.x1 - x0, 1, 0], [y1 - r.y0, 0, -1], [r.y1 - y0, 0, 1]].sort((a, b) => a[0] - b[0])[0];
      d.x += o[1] * o[0]; d.y += o[2] * o[0];
      if (o[2] < 0) { d.ground = true; d.vy = Math.min(0, d.vy); }
    }
  }
}

/* ---------- eels, jellyfish (they move even while the diver floats up in a bubble) ---------- */
const DIVEROPE_EEL = { wake: 0.8, grow: 0.35, hold: 1.1, back: 0.35 };
// the eel's cycle at time t: 'sleep' | 'wake' | 'out' and how far out it is (0..1)
function diveropeEelAt(e, t) {
  const E = DIVEROPE_EEL, cyc = e.sleep + E.wake + E.grow + E.hold + E.back;
  if (e.gold) return { s: 'sleep', ext: 0, u: 0 };
  let u = ((t + e.ph) % cyc + cyc) % cyc;
  if (u < e.sleep) return { s: 'sleep', ext: 0, u: u / e.sleep };
  u -= e.sleep;
  if (u < E.wake) return { s: 'wake', ext: 0, u: u / E.wake };
  u -= E.wake;
  if (u < E.grow) return { s: 'out', ext: diveropeSmooth(u / E.grow), u };
  u -= E.grow;
  if (u < E.hold) return { s: 'out', ext: 1, u };
  u -= E.hold;
  return { s: 'out', ext: 1 - diveropeSmooth(u / E.back), u };
}
// will the eel be stretched out at any time from t0 to t1 s from now?
function diveropeEelOutWithin(st, e, t0, t1) {
  if (e.gold) return false;
  for (let tt = t0; tt <= t1; tt += 0.1) if (diveropeEelAt(e, st.t + tt).ext > 0.1) return true;
  return false;
}
// the strip of water an eel reaches into (x0..x1 at y ± 16)
const diveropeEelStrip = e => (e.dir > 0 ? { x0: e.x, x1: e.x + e.reach } : { x0: e.x - e.reach, x1: e.x });
function diveropeCritters(st, dt) {
  const c = st.c;
  for (const e of c.eels) {
    const q = diveropeEelAt(e, st.t);
    if (e.fright > 0) { e.fright -= dt; e.ext = Math.max(0, e.ext - dt * 5); }
    else e.ext = q.ext;
    e.s = e.fright > 0 ? 'fright' : q.s; e.u = q.u;
  }
  for (const j of c.jellies) {
    j.x = j.x0 + j.a * Math.sin(st.t * Math.PI * 2 / j.per + j.ph);
    j.y = j.y0 + 14 * Math.sin(st.t * 1.3 + j.ph);
    if (j.squish > 0) j.squish -= dt;
  }
  for (const q of c.items) {
    if (q.state === 'loose') {
      q.vy = approach(q.vy, 60, 140 * dt); q.y += q.vy * dt; q.x += (q.vx || 0) * dt; q.vx = (q.vx || 0) * (1 - dt * 2);
      for (const r of c.rocks) if (q.x > r.x0 && q.x < r.x1 && q.y + 9 > r.y0 && q.y < r.y1) { q.y = r.y0 - 9; q.vy = 0; q.state = 'free'; }
    }
    if (q.state === 'got') q.t += dt;
  }
  const ch = c.chest;
  if (ch.state === 'drop') {
    // (swept: it lands on the first rock top it passes, and never sinks through the sand)
    const py = ch.y;
    ch.vy = approach(ch.vy, 120, 200 * dt); ch.y += ch.vy * dt;
    let land = null;
    for (const r of c.rocks) if (ch.x > r.x0 - 10 && ch.x < r.x1 + 10 && py <= r.y0 + 0.5 && ch.y >= r.y0 && (land === null || r.y0 < land)) land = r.y0;
    if (land === null && ch.y >= c.floor) land = c.floor;
    if (land !== null) { ch.y = land; ch.vy = 0; ch.state = 'rest'; }
  }
}
function diveropeHazards(st) {
  const D = DROPE, d = st.d, c = st.c, cx = d.x, cy = d.y - D.ht / 2;
  if (d.inv > 0) return;
  for (const e of c.eels) {
    if (e.gold || e.ext < 0.3) continue;
    const reachX = e.x + e.dir * e.reach * e.ext;
    const xa = Math.min(e.x, reachX), xb = Math.max(e.x, reachX);
    if (d.x + D.hw < xa || d.x - D.hw > xb || d.y < e.y - 14 || d.y - D.ht > e.y + 14) continue;
    // a soft fright: both jump, the diver drifts away and drops one thing
    const away = d.y - D.ht / 2 < e.y ? -1 : 1;
    d.vx = e.dir * D.eelPush * 0.7; d.vy = away * D.eelPush * 0.6; d.inv = D.inv; d.wob = 1.0; d.spin = 1;
    e.fright = 2.2; e.bumps++; st.stats.eels++;
    diveropePop(st, d.x, d.y - 80, 'Eek! An eel!', '#ffffff', 26); Sfx.play('diveropeEek');
    rumble(st.diver, 0.4, 0.3, 160);
    diveropeDrop(st);
    if (e.bumps >= D.goldEel && !e.gold && diveropeBothActive(st)) {
      e.gold = true; st.stats.helps++;
      diveropeMsg(st, 'Gold nightcap! That eel is fast asleep now', C.gold, 4); Sfx.play('diveropeHelp');
    } else diveropeHint(st, st.diver, 'Pass while it snoozes: z z z', 2.8);
    return;
  }
  for (const j of c.jellies) {
    if (j.gold) continue;
    const dx = cx - j.x, dy = cy - (j.y + 6), dd = Math.hypot(dx, dy);
    if (dd > 22 + 18) continue;
    const ux = dd > 0.1 ? dx / dd : 1, uy = dd > 0.1 ? dy / dd : 0;
    d.vx = ux * D.jellyPush; d.vy = uy * D.jellyPush * 0.8; d.inv = 1.0; d.wob = 0.6;
    j.squish = 0.5; j.bumps++; st.stats.jellies++;
    diveropePop(st, j.x, j.y - 40, 'Boing!', '#ffd0f0', 24); Sfx.play('diveropeBoing');
    if (j.bumps >= D.goldJelly && diveropeBothActive(st)) {
      j.gold = true; st.stats.helps++;
      diveropeMsg(st, 'Gold jellyfish! It lets you float right through', C.gold, 4); Sfx.play('diveropeHelp');
    }
    return;
  }
}
// an eel fright drops the last thing in the bag: it sinks to the rock or sand below
function diveropeDrop(st) {
  const d = st.d, q = d.bag.pop();
  if (!q) return;
  q.state = 'loose'; q.x = d.x; q.y = d.y - 34; q.vy = -50; q.vx = -d.vx * 0.4;
  diveropePop(st, d.x, d.y - 52, 'Oops! Dropped one', '#ffe7a8', 16);
}
function diveropePickups(st) {
  const d = st.d, cy = d.y - 24;
  for (const q of st.c.items) {
    if (q.state !== 'free' && q.state !== 'loose') continue;
    if (Math.abs(q.x - d.x) > 26 || Math.abs(q.y - cy) > 34) continue;
    q.state = 'bag'; d.bag.push(q); st.gemT = 0; st.stuckT = 0;
    Sfx.play('diveropeGem');
    const word = { gem: 'Gem!', star: 'Starfish!', pearl: 'Pearl!' }[q.kind];
    diveropePop(st, q.x, q.y - 26, word, q.kind === 'gem' ? q.col : '#fff2c0', 18);
    for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2; diveropePart(st, q.x, q.y, Math.cos(a) * 80, Math.sin(a) * 80, 0.5, q.col, 3, 0, 'spark'); }
  }
}
// at the boat: whatever is in the bag counts now
function diveropeBank(st) {
  const d = st.d, n = d.bag.length;
  if (n) {
    for (const q of d.bag) { q.state = 'got'; q.t = 0; }
    d.bag = []; st.stats.banked += n;
    st.bankFx = { t: 0, n };
    diveropePop(st, st.boat.x, -60, '+' + n + ' treasure!', C.gold, 26); Sfx.play('diveropeBank');
  }
  if (d.chest) diveropeStartWin(st);
}

/* ---------- out of air: the big bubble ---------- */
function diveropeStartBlub(st) {
  const d = st.d, ch = st.c.chest;
  st.state = 'blub'; st.bubble = { t: 0, x0: d.x, y0: d.y };
  st.blubs++; st.stats.blubs++;
  if (d.chest) {
    // (it hangs below the boots: start it at the boots, lifted out of any rock, so it sinks to the top it was over)
    d.chest = false; ch.state = 'drop'; ch.vy = 0; ch.y = Math.min(ch.y, d.y);
    for (const r of st.c.rocks) if (ch.x > r.x0 - 10 && ch.x < r.x1 + 10 && ch.y > r.y0 && ch.y < r.y1) ch.y = r.y0;
  }
  st.rope.mode = 'idle';
  diveropeMsg(st, 'Blub! Out of air: back to the boat in a bubble', '#bfeaff', 3.2);
  Sfx.play('diveropeBlub');
  if (st.goldAir && st.blubs >= DROPE.goldBlub + 1) diveropeGoldPump(st);
  if (st.blubs >= DROPE.goldBlub && !st.goldAir) {
    st.goldAir = true; st.stats.helps++;
    diveropeMsg(st, 'Gold air hose! The air lasts twice as long this dive', C.gold, 4.4); Sfx.play('diveropeHelp');
  }
}
function diveropeBlubStep(st, dt) {
  const D = DROPE, d = st.d, bb = st.bubble, b = st.boat;
  bb.t += dt;
  if (bb.t < 0.6) { d.wob = 0.3; return; }
  const ax = b.x + D.anchorDX;
  d.x += clamp(ax - d.x, -120 * dt, 120 * dt);
  d.y = Math.max(D.Lmin + D.ht + D.anchorY, d.y - D.bubbleV * dt);
  st.rope.L = Math.max(D.Lmin, diveropeDist(st));
  if (Math.random() < dt * 14) diveropePart(st, d.x + (Math.random() - 0.5) * 50, d.y - 20, (Math.random() - 0.5) * 30, -60, 0.8, 'rgba(255,255,255,0.8)', 2 + Math.random() * 3, -40, 'bub');
  if (d.y <= D.Lmin + D.ht + D.anchorY + 0.5 && Math.abs(ax - d.x) < 4) {
    st.state = 'ride'; st.bubble = null; st.air = 1; st.rope.L = D.Lmin; d.vx = 0; d.vy = 0; d.inv = 1;
    diveropePop(st, d.x, d.y - 80, 'Pop! Phew, fresh air!', '#ffffff', 22); Sfx.play('diveropePop');
    diveropeBank(st);
    st.stuckT = 0; st.bestDist = 1e9;
  }
}

// still running out with the gold air hose: a gold pump that keeps the air full by itself, this dive
function diveropeGoldPump(st) {
  if (st.goldPump || !diveropeBothActive(st)) return;
  st.goldPump = true; st.stats.helps++;
  diveropeMsg(st, 'Gold pump! It pumps air down the hose by itself this dive', C.gold, 4.6); Sfx.play('diveropeHelp');
}

/* ---------- the chest is in the boat: next dive, or the end ---------- */
function diveropeStartWin(st) {
  const d = st.d, ch = st.c.chest;
  st.state = 'win'; st.win = { t: 0, last: G.level.def.roomIndex >= G.level.def.roomCount - 1, x0: d.x, y0: d.y };
  d.chest = false; ch.state = 'boat';
  st.stats.chests++; st.stats.roomT[st.k] = G.time - st.segStart;
  st.rope.mode = 'idle';
  diveropePop(st, st.boat.x, -110, st.win.last ? 'The biggest treasure of all!' : 'Treasure chest!', C.gold, 30);
  Sfx.play(st.win.last ? 'diveropeFanfare' : 'diveropeChest');
  rumble(0, 0.2, 0.5, 200); rumble(1, 0.2, 0.5, 200);
}
function diveropeWinStep(st, dt) {
  const D = DROPE, w = st.win, d = st.d, b = st.boat;
  w.t += dt;
  const u = diveropeSmooth(clamp(w.t / 0.9, 0, 1));
  d.x = diveropeLerp(w.x0, b.x - 22, u); d.y = diveropeLerp(w.y0, -14, u) - Math.sin(u * Math.PI) * 30;
  st.rope.L = Math.max(10, diveropeDist(st));
  const ch = st.c.chest;
  ch.x = b.x + 30; ch.y = -14; ch.open = clamp((w.t - 0.9) / 0.5, 0, 1);
  if (w.t > 1.0 && !w.conf) {
    w.conf = true;
    for (let i = 0; i < (w.last ? 70 : 34); i++) { const a = -Math.PI * (0.1 + 0.8 * Math.random()); diveropePart(st, ch.x, ch.y - 20, Math.cos(a) * 260, Math.sin(a) * 260, 1.4, ['#ffd34a', '#ff5fa2', '#5fd0ff', '#8fe36b', '#ffffff'][i % 5], 4, 300, 'conf'); }
    if (w.last) Sfx.play('diveropeCheer');
  }
  if (w.t >= (w.last ? D.finT : D.winT)) {
    const L = G.level;
    if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return true; }
    if (!w.cleared) {
      w.cleared = true; st.stats.finishT = G.time;
      L.goal = { x: b.x, y: -60 - st.cam };
      levelClear();
      return true;
    }
  }
  return false;
}

/* ---------- gold help and the hints ---------- */
function diveropeHelp(st, dt) {
  const D = DROPE, d = st.d, pl = st.plan, both = diveropeBothActive(st);
  // the gold winch: the boat partner presses things but doesn't give the rope the dive needs
  const bt = G.players[st.boater].input;
  // (it measures the rope: a stretch of D.winchT s that needed rope out (or in) without the rope getting 120 px longer
  // (or shorter), while the boat partner is pressing things and the diver is playing too)
  if (bt.jump || bt.up || bt.down || bt.act) st.winchTryT = G.time;
  const need = pl.rope === 'out' ? 1 : pl.rope === 'in' ? -1 : 0, L = st.rope.L;
  if (!need || st.winchDir !== need || (need > 0 ? L > st.winchL0 + 120 : L < st.winchL0 - 120) || L <= D.Lmin + 2 && need < 0) { st.winchDir = need; st.winchL0 = L; st.winchNeedT = 0; }
  const diverHere = G.time - st.inT[st.diver] < 20 || (d.chest && G.time - st.inT[st.diver] < 60), boaterHere = G.time - st.inT[st.boater] < 20;
  if (!st.goldWinch && need && diverHere && G.time - (st.winchTryT || -9) < D.activeT) {
    st.winchNeedT += dt;
    if (st.winchNeedT > D.winchT) {
      st.goldWinch = true; st.stats.helps++;
      diveropeMsg(st, 'Gold winch! It gives ' + NAMES[st.diver] + ' rope and reels in by itself this dive', C.gold, 4.6); Sfx.play('diveropeHelp');
    } else if (st.winchNeedT > D.winchT * 0.5) diveropeHintOnce(st, 'winch' + Math.floor(st.diveT / 20), st.boater, pl.rope === 'out' ? 'Hold ' + diveropeKey(st.boater, 'down') + ' to let out rope!' : 'Hold ' + diveropeKey(st.boater, 'up') + ' to reel in!');
  }
  // the gold current: no progress toward where the diver needs to go
  const goal = pl.up ? { x: st.boat.x + D.anchorDX, y: 60 } : st.c.chest;
  const dist = Math.hypot(goal.x - d.x, (goal.y - d.y) * 1.5);
  if (dist < st.bestDist - 40) { st.bestDist = dist; st.stuckT = 0; }
  else if (boaterHere && G.time - (st.swimT || -9) < D.activeT) st.stuckT += dt;
  if (!st.current && st.stuckT > D.stuckT) {
    st.current = true; st.stats.helps++;
    diveropeMsg(st, 'Gold current! It carries ' + NAMES[st.diver] + ' the right way', C.gold, 4.2); Sfx.play('diveropeHelp');
  }
  if (!st.finder && st.diveT > D.finderT && !d.chest) { st.finder = true; diveropeMsg(st, 'Gold sparkles show where the chest is!', C.gold, 3.6); }
}
// gentle lessons, once each dive, when they first matter
function diveropeNudges(st) {
  const d = st.d, pl = st.plan, c = st.c;
  if (st.diveT > 1.5 && pl.rope === 'out') diveropeHintOnce(st, 'out', st.boater, 'Hold ' + diveropeKey(st.boater, 'down') + ' to let out rope for ' + NAMES[st.diver]);
  if (st.air < 0.62 && d.y > 200) diveropeHintOnce(st, 'pump', st.boater, 'Tap ' + diveropeKey(st.boater, 'act') + ' to pump air down the hose!');
  if (c.eels.some(e => !e.gold && Math.abs(e.y - d.y) < 200)) diveropeHintOnce(st, 'eel', st.diver, 'Sleepy eel! Swim past while it snoozes');
  if (diveropeNearChest(st) && !d.chest) diveropeHintOnce(st, 'grab', st.diver, 'Press ' + diveropeKey(st.diver, 'act') + ' to hook the chest!');
  if (d.bag.length && !d.chest && st.k === 0 && d.y > 300) diveropeHintOnce(st, 'bag', st.diver, 'Treasure only counts back in the boat!');
}
function diveropeHintOnce(st, key, id, text) {
  if (st.hinted[key]) return;
  st.hinted[key] = true;
  diveropeHint(st, id, text, 3.4);
}

/* ---------- what the team needs to do right now (the prompts, the panels and the computer read this) ----------
   up: the diver is heading up (chest hooked, air low, or asked to be reeled up); tx: where the diver should swim;
   rope: 'out' | 'in' | 'hold' | 'none' (what the winch should do); pump: the air wants pumping; grab: the chest is in
   reach; why: 'chest' | 'air' | 'bank' | 'eel' | 'jelly' | 'gem' | 'snag' | null; eel / jelly: the one to wait for */
function diveropePlan(st) {
  const D = DROPE, d = st.d, c = st.c, ch = c.chest;
  const out = { tx: d.x, up: false, rope: 'none', pump: false, grab: false, why: null, eel: null, taut: false, turbo: st.air < D.low };
  if (!d || st.state !== 'ride') return out;
  const dist = diveropeDist(st), taut = dist > st.rope.L - 10;
  out.taut = taut;
  const askUp = G.time - d.tugUp < 3 && d.bag.length > 0;
  out.up = d.chest || (st.air < D.low + 0.04 && d.y > D.nearY) || askUp;
  out.why = d.chest ? 'chest' : out.up && askUp && st.air >= D.low + 0.04 ? 'bank' : out.up ? 'air' : 'chest';
  const top = d.y - D.ht, fall = k => 1 + Math.max(0, k) / 150;
  // --- where to swim: the cheapest x across the water
  const costAt = x => {
    let cost = Math.abs(x - d.x) * 0.22 + Math.abs(x - st.planX) * 0.1;
    for (const r of c.rocks) {
      const ov = x + D.hw + 10 > r.x0 && x - D.hw - 10 < r.x1;
      if (!ov) continue;
      if (r.y0 < d.y - 2 && r.y1 > top + 2) { cost += 6000; continue; }  // rock right here, at the diver's own depth
      if (!out.up) { const k = r.y0 - d.y; if (k >= -2 && k < D.look && r.kind !== 'sand') cost += 2000 / fall(k); }
      else { const k = top - r.y1; if (k >= -2 && k < D.look) cost += 2000 / fall(k); }
    }
    for (const e of c.eels) {
      if (e.gold) continue;
      const s = diveropeEelStrip(e), k = out.up ? top - e.y : e.y - d.y;
      if (k < -50 || k > 300) continue;
      if (x + D.hw + 18 > s.x0 && x - D.hw - 18 < s.x1) cost += 900 / fall(k);
    }
    for (const j of c.jellies) {
      if (j.gold) continue;
      const k = out.up ? top - j.y : j.y - d.y;
      if (k < -50 || k > 300) continue;
      if (Math.abs(x - j.x0) < 22 + j.a + D.hw + 16) cost += 600 / fall(k);
      // (and where it is right now, when it's close: swim round it)
      if (k > -60 && k < 170 && Math.abs(x - j.x) < 40 + D.hw + 24) cost += 1500 / fall(k);
    }
    if (!out.up || out.why !== 'air') for (const q of c.items) {
      if (q.state !== 'free' && q.state !== 'loose') continue;
      const k = out.up ? top - q.y : q.y - d.y;
      if (k < -40 || k > 340) continue;
      if (Math.abs(x - q.x) < 22) cost -= 240 / fall(k);
    }
    if (!out.up && ch.y - d.y < 320) cost += Math.abs(x - ch.x) * 3;
    return cost;
  };
  const scan = pull => {
    let bb = null;
    for (let x = 24; x <= W - 24; x += 10) { const cost = costAt(x) + (pull ? Math.abs(x - pull.x) * 0.5 : 0); if (!bb || cost < bb.cost) bb = { x, cost }; }
    return bb;
  };
  let best = scan(null);
  // the next treasure to fetch on the way down: the nearest by a rough swim (sideways is cheap, going back up is
  // dear), not behind rock at the diver's depth. One the diver can't reach in a few seconds is left for later.
  out.gem = null; out.next = null;
  if (out.why !== 'air' && best && !(out.up && st.air < 0.5)) {
    let pick = null, ps = 1e9;
    for (const q of c.items) {
      if ((q.state !== 'free' && q.state !== 'loose') || (q.skip || 0) > st.t) continue;
      const above = (d.y - 24) - q.y, below = -above;
      if (out.up ? (above < -50 || above > 300) : (above > 70 || q.y > ch.y + 10)) continue;
      const near = Math.abs(above) < 55;
      if (out.up && (!near || above > 10)) continue;
      const extra = costAt(clamp(q.x, 24, W - 24)) - best.cost;
      if (near && extra > 450) continue;
      const sc = Math.abs(q.x - d.x) + Math.max(0, above) * 3 + Math.max(0, below) * 0.5 + Math.max(0, extra) * 0.12;
      if (sc < ps) { ps = sc; pick = q; }
    }
    if (pick) {
      out.next = pick;
      if (Math.abs((d.y - 24) - pick.y) < 55) {
        st.gemFor = pick;
        if (st.gemT > 5) { pick.skip = st.t + 25; st.gemFor = null; st.gemT = 0; }
        else { out.gem = pick; out.tx = clamp(pick.x, 24, W - 24); }
      } else { st.gemFor = null; st.gemT = 0; if (!out.up) best = scan(pick); }
    } else { st.gemFor = null; st.gemT = 0; }
  }
  if (!out.gem) out.tx = best ? best.x : d.x;
  if (!out.up && !out.gem && ch.y - d.y < 60 && Math.abs(ch.x - d.x) < 140) out.tx = ch.x;
  // --- the winch
  if (out.up) {
    out.rope = 'in';
    // (rock right over the diver's head: wait while they swim out to open water)
    for (const r of c.rocks) {
      if (r.kind === 'sand' || r.y1 > top + 4 || top - r.y1 > 60) continue;
      if (d.x + D.hw + 4 > r.x0 && d.x - D.hw - 4 < r.x1) { out.rope = 'hold'; out.why = 'snag'; out.snagRock = r; break; }
    }
    // (a gem right beside the way up: wait a moment while the diver grabs it, if there's air to spare)
    if (out.gem && !out.turbo && st.air > 0.5 && out.rope === 'in') { out.rope = 'hold'; out.why = 'gem'; }
    // (wait under a stretched-out eel right above the way up, unless the air is low)
    if (!out.turbo) for (const e of c.eels) {
      if (e.gold) continue;
      const s = diveropeEelStrip(e), k = top - (e.y + 16);
      if (k > -10 && k < 70 && d.x + D.hw + 8 > s.x0 && d.x - D.hw - 8 < s.x1 && diveropeEelOutWithin(st, e, 0, 1.0)) { out.rope = 'hold'; out.eel = e; out.why = 'eel'; }
    }
    // (and under a jellyfish right above: wait while it drifts aside)
    if (!out.turbo && out.rope === 'in') { const j = diveropeJellyNear(st, -1); if (j) { out.rope = 'hold'; out.jelly = j; out.why = 'jelly'; } }
  } else {
    const onFloor = ch.y - d.y < 30 && d.ground;
    if (onFloor || (Math.abs(ch.x - d.x) < 60 && ch.y - d.y < 40)) out.rope = 'hold';
    else if (taut) out.rope = 'out';
    else out.rope = 'hold';
    // (wait above an eel that will be stretched out when the diver sinks past it)
    if (out.rope === 'out') for (const e of c.eels) {
      if (e.gold) continue;
      const s = diveropeEelStrip(e), k = (e.y - 16) - d.y;
      if (k > -10 && k < 110 && d.x + D.hw + 8 > s.x0 && d.x - D.hw - 8 < s.x1 && diveropeEelOutWithin(st, e, 0, 1.7)) { out.rope = 'hold'; out.eel = e; out.why = 'eel'; }
    }
    // (and above a jellyfish right below: wait while it drifts aside)
    if (out.rope === 'out') { const j = diveropeJellyNear(st, 1); if (j) { out.rope = 'hold'; out.jelly = j; out.why = 'jelly'; } }
    // (wait while the diver swims over to treasure at about this depth)
    if (out.gem) { out.rope = taut ? 'out' : 'hold'; out.why = 'gem'; }
    // (the air first: pump before letting out more)
    // (but not for ever: after 2.5 s with no pumping the dive goes on, so a boat partner who never pumps can't stall it)
    if (st.air >= 0.5) st.airHold = null;
    if (st.air < 0.5 && out.rope === 'out') {
      if (st.airHold == null) st.airHold = G.time;
      if (G.time - st.airHold < 2.5 || G.time - st.lastStroke < 2.5) { out.rope = 'hold'; out.why = 'air'; }
    }
  }
  out.pump = out.rope === 'hold' ? st.air < 0.97 : st.air < 0.35 && !out.up;
  out.grab = !d.chest && ch.state !== 'boat' && diveropeNearChest(st);
  out.snag = st.rope.snag || out.why === 'snag';
  return out;
}

// a jellyfish in the way just below (dir 1) or just above (dir -1) the diver, now or in a moment (for the plan)
function diveropeJellyNear(st, dir) {
  const D = DROPE, d = st.d;
  for (const j of st.c.jellies) {
    if (j.gold) continue;
    const k = dir > 0 ? (j.y + 6) - (d.y - D.ht / 2) : (d.y - D.ht / 2) - (j.y + 6);
    if (k < -20 || k > 120 + (dir > 0 ? Math.max(0, st.rope.L - diveropeDist(st)) : 0)) continue;
    const jx = t => j.x0 + j.a * Math.sin((st.t + t) * Math.PI * 2 / j.per + j.ph);
    if (Math.abs(jx(0) - d.x) < 62 || Math.abs(jx(0.7) - d.x) < 62) return j;
  }
  return null;
}

/* ---------- small helpers ---------- */
function diveropeHint(st, id, text, life) { if (diveropeQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || 2.8 }; }
function diveropeMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function diveropePop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 10) st.pops.shift(); }
function diveropePart(st, x, y, vx, vy, life, col, size, lift, kind) {
  if (st.parts.length > 260) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, lift: lift || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
// the touch buttons and the top-bar legend name each player's own action this dive: grab or pump
let diveropeLabelEls = null;
function diveropeActLabels(st) {
  try {
    if (!diveropeLabelEls || !diveropeLabelEls.every(o => document.contains(o.el))) diveropeLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const ds = box && (box.dataset.p !== undefined ? box.dataset.p : box.dataset.legp);
      const id = ds !== undefined && ds !== null ? +ds : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of diveropeLabelEls) {
      const want = o.id < 0 ? 'grab/pump' : o.id === st.diver ? 'grab' : 'pump';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}
function diveropeCam(st, dt) {
  const D = DROPE, d = st.d;
  let want = st.state === 'win' ? D.camTop : d.y - D.camLead;
  want = clamp(want, D.camTop, st.c.floor + 90 - H);
  st.cam += (want - st.cam) * Math.min(1, dt * (st.state === 'blub' ? 5 : 3.5));
}
// the rope as a wobbly hose (looks only): a chain of points that hangs, drifts and bends round rock
function diveropeRopeInit(st) {
  const a = diveropeAnchor(st), b = diveropeAttach(st.d), n = 22;
  st.rope.nodes = Array.from({ length: n }, (_, i) => { const u = i / (n - 1), x = diveropeLerp(a.x, b.x, u), y = diveropeLerp(a.y, b.y, u); return { x, y, px: x, py: y }; });
}
function diveropeRopeSim(st, dt) {
  const ns = st.rope.nodes, n = ns.length, a = diveropeAnchor(st), b = diveropeAttach(st.d);
  const seg = Math.max(diveropeDist(st), st.rope.L) / (n - 1);
  for (let i = 1; i < n - 1; i++) {
    const q = ns[i], vx = (q.x - q.px) * 0.96, vy = (q.y - q.py) * 0.96;
    q.px = q.x; q.py = q.y;
    q.x += vx + Math.sin(st.t * 1.4 + i * 0.7) * 0.05; q.y += vy + 18 * dt * dt * 60;
  }
  for (let it = 0; it < 3; it++) {
    ns[0].x = a.x; ns[0].y = a.y; ns[n - 1].x = b.x; ns[n - 1].y = b.y;
    for (let i = 0; i < n - 1; i++) {
      const p = ns[i], q = ns[i + 1], dx = q.x - p.x, dy = q.y - p.y, dd = Math.hypot(dx, dy) || 0.001;
      if (dd <= seg) continue;
      const k = (dd - seg) / dd / 2;
      if (i > 0) { p.x += dx * k; p.y += dy * k; }
      if (i + 1 < n - 1) { q.x -= dx * k; q.y -= dy * k; }
    }
    for (let i = 1; i < n - 1; i++) {
      const q = ns[i];
      if (q.y < 4) q.y = 4;
      for (const r of st.c.rocks) {
        if (q.x <= r.x0 || q.x >= r.x1 || q.y <= r.y0 || q.y >= r.y1) continue;
        const o = [[q.x - r.x0, -1, 0], [r.x1 - q.x, 1, 0], [q.y - r.y0, 0, -1], [r.y1 - q.y, 0, 1]].sort((u, v) => u[0] - v[0])[0];
        q.x += o[1] * (o[0] + 1); q.y += o[2] * (o[0] + 1);
      }
    }
  }
  ns[0].x = a.x; ns[0].y = a.y; ns[n - 1].x = b.x; ns[n - 1].y = b.y;
}
function diveropeLooks(st, dt) {
  const b = st.boat;
  b.bob += dt * 2.2;
  diveropeRopeSim(st, dt);
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vy += q.lift * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 5;
    if (q.kind === 'bub') { q.vx *= 1 - dt * 1.5; q.x += Math.sin(q.r * 2) * 0.3; }
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.4);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  if (st.pumpAnim > 0) st.pumpAnim = Math.max(0, st.pumpAnim - dt * 3.2);
  if (st.bankFx && (st.bankFx.t += dt) > 1.6) st.bankFx = null;
  if (st.d.spin > 0) st.d.spin = Math.max(0, st.d.spin - dt * 1.6);
  // the diver's helmet breathes out little bubbles
  if (st.state !== 'win' && Math.random() < dt * (st.state === 'blub' ? 0 : 2.2)) {
    const a = diveropeAttach(st.d);
    diveropePart(st, a.x + st.d.face * 10, a.y + 8, (Math.random() - 0.5) * 10, -50, 2.4, 'rgba(255,255,255,0.75)', 1.8 + Math.random() * 2, -20, 'bub');
  }
}
// where a player is drawn (world px: feet)
function diveropeSpot(st, id) {
  const b = st.boat;
  if (id === st.diver) return { x: st.d.x, y: st.d.y };
  return { x: b.x - 26, y: -14 + Math.sin(b.bob) * 2 };
}
// copy the spots into the engine players (screen px): name tags and bubbles read p.x / p.y
function diveropeMirror(st) {
  for (const p of G.players) {
    const s = diveropeSpot(st, p.id);
    p.x = s.x - PW / 2; p.y = s.y - st.cam - PH * 1.25 - (p.id === st.diver ? 20 : 0);
    p.alive = true; p.grounded = true; p.stompSafe = 0; p.vy = 0; p.vx = 0; p.stun = 0;
    p.face = p.id === st.diver ? st.d.face : 1;
  }
}

MODES.diverope = {
  DROPE,
  medals: { bronze: 'Bring all four chests up', goals: [{ key: 'time', gold: 240, silver: 330 }, { key: 'bumps', gold: 5, silver: 14, text: n => n + ' or fewer bumps and blubs' }, { key: 'treasure', gold: 0.7, more: true, pct: true, word: 'the treasure' }, { key: 'helps', gold: 1, word: 'gold help', text: n => 'At most ' + n + ' gold help' + (n === 1 ? '' : 's') }] },
  medalValues() { const st = G.mst, s = st.stats; return s ? { time: s.finishT || G.time, bumps: s.eels + s.jellies + s.blubs, treasure: s.banked / (st.allTreasure || 1), helps: s.helps } : {}; },
  plan: diveropePlan, key: diveropeKey, dist: diveropeDist, eelAt: diveropeEelAt, eelStrip: diveropeEelStrip,
  // where the computer's speech bubble goes: over the diver, or over the boat (or over its job panel when the boat is
  // off screen)
  bubblePos(p) {
    const st = G.mst;
    if (!st || !st.d) return null;
    if (p.id === st.diver && st.state !== 'win') return { x: clamp(st.d.x, 70, W - 70), y: st.d.y - st.cam - 64 };
    const by = -40 - st.cam;
    if (by > 70) return { x: clamp(st.boat.x - 26, 70, W - 70), y: by };
    const z = hudBig() ? 1.3 : 1;
    return { x: p.id === 0 ? 12 + 103 * z : W - 12 - 103 * z, y: H - 70 * z - 40 };
  },
  setup(st, L) {
    st.stats = { banked: 0, chests: 0, eels: 0, jellies: 0, blubs: 0, helps: 0, pumps: [0, 0], reel: [0, 0], out: [0, 0], roomT: [], finishT: 0 };
    // count every dive's treasure up front (the HUD shows "x of all")
    const def = LEVELS[G.levelIndex];
    const rooms = def.rooms || [def];
    st.allTreasure = rooms.reduce((n, r) => n + (r.course || []).reduce((m, it) => m + (it[0] === 'gems' ? (it[3] || 1) : it[0] === 'star' || it[0] === 'pearl' ? 1 : 0), 0), 0);
    diveropeRoom(st, L, 0);
  },
  room(k, L) { diveropeRoom(G.mst, L, k); },
  step(dt) { diveropeStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then, and drawn by the mode instead
  draw() {
    const st = G.mst;
    if (!st.c) return;
    diveropeDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.c) return;
    diveropeDrawFront(st);
  },
  hud() { const st = G.mst; if (st.c) diveropeHud(st); },
  stats() {
    const st = G.mst, s = st.stats;
    if (!s) return [];
    const all = st.allTreasure || 1, frac = s.banked / all, bumps = s.eels + s.jellies + s.blubs;
    const out = [
      { label: 'Treasure', value: s.banked + ' of ' + st.allTreasure },
      { label: 'Chests', value: s.chests + ' of 4' },
      { label: 'Bumps & blubs', value: String(bumps) },
    ];
    const words = frac >= 0.9 ? 'Every gem in the sea! What a dive team!' : frac >= 0.6 ? 'A boat full of treasure. Splendid diving!' : 'Four chests up from the deep together!';
    out.push(words + ' Eel frights: ' + s.eels + ', jelly boings: ' + s.jellies + ', blubs: ' + s.blubs + '.');
    out.push('Air pumps: ' + NAMES[0] + ' ' + s.pumps[0] + ', ' + NAMES[1] + ' ' + s.pumps[1] + '.' +
      (s.helps ? ' Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!' : ''));
    return out;
  },
};

/* ---------- drawing (world px: x across, y = depth; drawn after translate(0, -cam)) ---------- */
// the sea gets a deeper blue the deeper you go (still bright and friendly)
const DIVEROPE_WATER = [[0, [104, 226, 236]], [400, [52, 182, 216]], [900, [32, 136, 198]], [1400, [28, 100, 172]], [2100, [30, 66, 138]]];
function diveropeWaterRGB(y) {
  const S = DIVEROPE_WATER;
  if (y <= S[0][0]) return S[0][1];
  for (let i = 1; i < S.length; i++) if (y <= S[i][0]) { const u = (y - S[i - 1][0]) / (S[i][0] - S[i - 1][0]); return S[i - 1][1].map((v, k) => Math.round(diveropeLerp(v, S[i][1][k], u))); }
  return S[S.length - 1][1];
}
const diveropeRGB = (c, a = 1) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
const DIVEROPE_LOOK = {
  shelf: { rock: '#e2b07c', rockD: '#b98454', rockL: '#f6d3a4', coral: ['#ff7aa8', '#ffb36b', '#c38bff'] },
  kelp: { rock: '#8fae96', rockD: '#62826c', rockL: '#b8d6bc', coral: ['#ff8fb8', '#ffd36b', '#7fe0c0'] },
  coral: { rock: '#e88fa2', rockD: '#b8607a', rockL: '#ffc2cf', coral: ['#ffdf6b', '#7fd8ff', '#ffffff', '#ff7a5a'] },
  trench: { rock: '#6e74b8', rockD: '#4b5090', rockL: '#9aa0e0', coral: ['#7ff0ff', '#ff9ad8', '#c4ff7a'] },
};
function diveropeDrawWorld(st) {
  const cam = st.cam, sy = -cam;
  // the sky above the surface
  if (sy > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, sy);
    g.addColorStop(0, '#7fd3ff'); g.addColorStop(1, '#dff7ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, sy + 1);
    ctx.fillStyle = 'rgba(255,248,205,0.95)'; circle(W - 120, sy - 92, 22); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,170,0.35)'; circle(W - 120, sy - 92, 36); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const x = ((i * 340 + G.clock * 8) % 1200) - 120, y = sy - 110 + i * 22;
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; circle(x, y, 13); ctx.fill(); circle(x + 15, y - 6, 16); ctx.fill(); circle(x + 32, y, 12); ctx.fill();
    }
  }
  // the water
  const y0 = Math.max(0, sy), g = ctx.createLinearGradient(0, y0, 0, H);
  g.addColorStop(0, diveropeRGB(diveropeWaterRGB(cam + y0))); g.addColorStop(1, diveropeRGB(diveropeWaterRGB(cam + H)));
  ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0);
  // far rocks and fish (slower: they're far away)
  const far = diveropeWaterRGB(cam + 300).map(v => v * 0.72);
  ctx.fillStyle = diveropeRGB(far, 0.45);
  for (let i = -1; i < 9; i++) {
    const wy = i * 260, yy = wy - cam * 0.45 + 200, h = hash(i + 40, 3);
    if (yy < y0 - 160 || yy > H + 160) continue;
    const left = i % 2 === 0, x = left ? -40 + (h % 60) : W + 40 - (h % 60);
    ctx.beginPath(); ctx.ellipse(x, yy, 120 + (h % 50), 90, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 6; i++) {
    const dir = i % 2 ? 1 : -1, wy = 120 + i * 320, yy = wy - cam * 0.6;
    if (yy < y0 - 20 || yy > H + 20) continue;
    const x0 = (((G.clock * 34 * dir + i * 310) % 1300) + 1300) % 1300 - 170;
    ctx.fillStyle = diveropeRGB(diveropeWaterRGB(cam + yy).map(v => Math.min(255, v + 50)), 0.5);
    for (let k = 0; k < 5; k++) diveropeFish(x0 + (k % 3) * 22 * -dir, yy + k * 9 - 18 + Math.sin(G.clock * 2 + k) * 3, dir, 0.7);
  }
  // sun rays near the top
  if (cam < 700) {
    ctx.save(); ctx.globalAlpha = clamp((700 - cam) / 700, 0, 1) * 0.14; ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      const x = 80 + i * 170 + Math.sin(G.clock * 0.5 + i) * 30;
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + 50, y0); ctx.lineTo(x + 190, y0 + 620); ctx.lineTo(x + 70, y0 + 620); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  ctx.save(); ctx.translate(0, -cam);
  const c = st.c, top = cam - 40, bot = cam + H + 40;
  for (const k of c.kelp) if (k.y > top && k.y - k.h < bot) diveropeDrawKelp(st, k);
  for (const r of c.rocks) if (r.y1 > top && r.y0 < bot) { if (r.kind === 'sand') diveropeDrawSand(st, r); else diveropeDrawRock(st, r); }
  for (const e of c.eels) if (e.y > top && e.y < bot) diveropeDrawHole(st, e);
  for (const k of c.corals) if (k.y > top && k.y - 60 < bot) diveropeDrawCoral(k.x, k.y, k.kind, st.c.look, 1);
  for (const s of c.signs) if (s.y > top && s.y < bot) diveropeDrawSign(st, s);
  for (const q of c.items) if ((q.state === 'free' || q.state === 'loose') && q.y > top && q.y < bot) diveropeDrawItem(q, G.clock);
  const ch = c.chest;
  if (ch.state === 'rest' || ch.state === 'drop') diveropeDrawChest(ch.x, ch.y, c.look === 'trench', 0, st.finder);
  for (const e of c.eels) if (e.y > top && e.y < bot) diveropeDrawEel(st, e);
  for (const j of c.jellies) if (j.y > top && j.y < bot) diveropeDrawJelly(st, j);
  ctx.restore();
}
function diveropeDrawFront(st) {
  const D = DROPE, cam = st.cam;
  ctx.save(); ctx.translate(0, -cam);
  diveropeDrawRope(st);
  diveropeDrawBoat(st);
  diveropeDrawDiver(st);
  for (const q of st.parts) {
    const a = clamp(q.life / q.max, 0, 1);
    if (q.y < cam - 30 || q.y > cam + H + 30) continue;
    ctx.globalAlpha = a; ctx.fillStyle = q.col;
    if (q.kind === 'bub') { ctx.strokeStyle = q.col; ctx.lineWidth = 1.2; circle(q.x, q.y, q.size); ctx.stroke(); ctx.globalAlpha = a * 0.25; ctx.fill(); }
    else if (q.kind === 'spark') { diveropeStarPath(q.x, q.y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
    else if (q.kind === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // the surface waves in front of the boat's hull
  if (cam < 40) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.moveTo(0, 2);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 2 + Math.sin(G.clock * 2.4 + x * 0.03) * 3);
    ctx.lineTo(W, 7); ctx.lineTo(0, 7); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // the gold sparkles point the way to the chest when it's off screen
  const ch = st.c.chest;
  if (st.finder && st.state === 'ride' && !st.d.chest && (ch.state === 'rest' || ch.state === 'drop')) {
    const sy = ch.y - cam;
    if (sy > H - 90) {
      const x = clamp(ch.x, 40, W - 60), y = H - 104 - Math.abs(Math.sin(G.clock * 4)) * 8;
      ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y + 18); ctx.lineTo(x - 13, y); ctx.lineTo(x - 5, y); ctx.lineTo(x - 5, y - 14); ctx.lineTo(x + 5, y - 14); ctx.lineTo(x + 5, y); ctx.lineTo(x + 13, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  const big = hudBig();
  for (const q of st.pops) {
    const x = clamp(q.x, 130, W - 130), y = clamp(q.y - cam - q.t * 30, 96, H - 120);
    ctx.globalAlpha = clamp((1.4 - q.t) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.25 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
    ctx.globalAlpha = 1;
  }
}
function diveropeStarPath(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
function diveropeFish(x, y, dir, s) {
  ctx.beginPath(); ctx.ellipse(x, y, 9 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - dir * 7 * s, y); ctx.lineTo(x - dir * 14 * s, y - 5 * s); ctx.lineTo(x - dir * 14 * s, y + 5 * s); ctx.closePath(); ctx.fill();
}
function diveropeDrawKelp(st, k) {
  const n = Math.max(3, Math.round(k.h / 22)), t = G.clock;
  ctx.strokeStyle = '#3f9a5a'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(k.x, k.y);
  const pts = [];
  for (let i = 1; i <= n; i++) { const u = i / n, x = k.x + Math.sin(t * 1.3 + k.ph + u * 3) * 12 * u, y = k.y - k.h * u; pts.push([x, y]); ctx.lineTo(x, y); }
  ctx.stroke();
  ctx.fillStyle = '#5cc27a';
  pts.forEach(([x, y], i) => { if (i % 2) return; const s = i % 4 ? 1 : -1; ctx.beginPath(); ctx.ellipse(x + s * 8, y + 4, 9, 4, s * 0.6, 0, Math.PI * 2); ctx.fill(); });
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(200,255,200,0.4)'; ctx.beginPath(); ctx.moveTo(k.x - 1, k.y); pts.forEach(([x, y]) => ctx.lineTo(x - 1, y)); ctx.stroke();
}
function diveropeDrawRock(st, r) {
  const lk = DIVEROPE_LOOK[st.c.look] || DIVEROPE_LOOK.shelf, x0 = r.x0, w = r.x1 - r.x0, h = r.y1 - r.y0;
  ctx.fillStyle = lk.rock; rr(x0, r.y0, w, h, 16); ctx.fill();
  // a darker underside and lumpy bits
  const g = ctx.createLinearGradient(0, r.y0, 0, r.y1);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,20,60,0.28)');
  ctx.fillStyle = g; rr(x0, r.y0, w, h, 16); ctx.fill();
  ctx.fillStyle = lk.rockD;
  for (let k = 0; k < Math.floor(w / 46); k++) { const hh = hash(r.seed, k); circle(x0 + 22 + k * 46 + (hh % 14), r.y1 - 2, 9 + (hh % 7)); ctx.fill(); }
  for (let k = 0; k < Math.floor(w * h / 9000); k++) { const hh = hash(r.seed + 5, k); ctx.fillStyle = 'rgba(255,255,255,0.12)'; circle(x0 + 14 + (hh % Math.max(1, w - 28)), r.y0 + 16 + ((hh >> 8) % Math.max(1, h - 30)), 4 + (hh % 5)); ctx.fill(); }
  ctx.fillStyle = lk.rockL; rr(x0 + 2, r.y0, w - 4, 8, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(28,26,54,0.35)'; ctx.lineWidth = 2; rr(x0, r.y0, w, h, 16); ctx.stroke();
  // coral and anemones along the top
  for (let k = 0; k < Math.floor(w / 70); k++) {
    const hh = hash(r.seed, k + 30), x = x0 + 20 + k * 70 + (hh % 30);
    if (x < -20 || x > W + 20) continue;
    diveropeDrawCoral(x, r.y0 + 2, hh % 3, st.c.look, 0.7 + (hh % 4) * 0.1);
  }
}
// a little coral: 0 branchy, 1 a round brain coral, 2 an anemone that waves
function diveropeDrawCoral(x, y, kind, look, s) {
  const lk = DIVEROPE_LOOK[look] || DIVEROPE_LOOK.shelf, col = lk.coral[(Math.abs(Math.round(x)) >> 3) % lk.coral.length], t = G.clock;
  if (kind === 0) {
    ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = 5 * s;
    const br = (bx, by, a, len, n) => { const ex = bx + Math.sin(a) * len, ey = by - Math.cos(a) * len; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke(); if (n > 0) { br(ex, ey, a - 0.5, len * 0.7, n - 1); br(ex, ey, a + 0.5, len * 0.7, n - 1); } };
    br(x, y, 0, 14 * s, 2);
  } else if (kind === 1) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y - 6 * s, 13 * s, 9 * s, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(28,26,54,0.25)'; ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x + i * 5 * s, y - 2 * s, 5 * s, Math.PI, 0); ctx.stroke(); }
  } else {
    ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = 3 * s;
    for (let i = -2; i <= 2; i++) { const a = i * 0.32 + Math.sin(t * 2 + x * 0.05 + i) * 0.18; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.sin(a) * 8 * s, y - 9 * s, x + Math.sin(a) * 13 * s, y - 16 * s); ctx.stroke(); }
    ctx.fillStyle = col; circle(x, y - 2, 4 * s); ctx.fill();
  }
}
function diveropeDrawSand(st, r) {
  const y = r.y0, t0 = Math.max(st.cam, y), h = Math.min(st.cam + H + 10, r.y1) - t0;
  ctx.fillStyle = st.c.look === 'trench' ? '#b6b2d8' : '#f2dca0'; ctx.fillRect(-10, t0, W + 20, h);
  ctx.fillStyle = st.c.look === 'trench' ? '#d6d2f0' : '#fff0c4'; ctx.fillRect(-10, y, W + 20, 6);
  ctx.strokeStyle = st.c.look === 'trench' ? 'rgba(80,70,140,0.25)' : 'rgba(170,130,70,0.3)'; ctx.lineWidth = 2;
  for (let k = 0; k < 12; k++) { const x = k * 84 + (hash(k, 9) % 40); ctx.beginPath(); ctx.moveTo(x, y + 18 + (k % 3) * 9); ctx.quadraticCurveTo(x + 16, y + 12 + (k % 3) * 9, x + 32, y + 18 + (k % 3) * 9); ctx.stroke(); }
  // shells
  for (let k = 0; k < 7; k++) {
    const hh = hash(k + 3, st.k + 2), x = 40 + k * 140 + (hh % 60);
    ctx.fillStyle = ['#ffd0dc', '#fff4e0', '#ffc89a'][k % 3]; ctx.beginPath(); ctx.arc(x, y + 4, 7, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(160,100,80,0.5)'; ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + i * 5, y - 2); ctx.stroke(); }
  }
}
function diveropeDrawSign(st, s) {
  ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(s.text).width + 26, x = clamp(s.x, w / 2 + 10, W - w / 2 - 40);
  ctx.fillStyle = 'rgba(255,250,236,0.92)'; rr(x - w / 2, s.y - 14, w, 28, 12); ctx.fill();
  ctx.strokeStyle = '#7a5232'; ctx.lineWidth = 2; rr(x - w / 2, s.y - 14, w, 28, 12); ctx.stroke();
  text(s.text, x, s.y + 0.5, 15, '#4a2f14', 'center', 'body');
}
function diveropeDrawItem(q, t) {
  const bob = q.state === 'free' && q.kind === 'gem' ? Math.sin(t * 2.5 + q.x * 0.05) * 3 : 0, x = q.x, y = q.y + bob;
  if (q.kind === 'gem') {
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; circle(x, y, 14); ctx.fill();
    ctx.fillStyle = q.col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - 11); ctx.lineTo(x + 9, y - 3); ctx.lineTo(x, y + 11); ctx.lineTo(x - 9, y - 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(x - 4, y - 5); ctx.lineTo(x, y - 9); ctx.lineTo(x + 2, y - 4); ctx.closePath(); ctx.fill();
    if (Math.sin(t * 3 + x) > 0.85) { ctx.fillStyle = '#ffffff'; diveropeStarPath(x + 7, y - 9, 4, 1.5, 0); ctx.fill(); }
  } else if (q.kind === 'star') {
    ctx.fillStyle = q.col; ctx.strokeStyle = '#a8501f'; ctx.lineWidth = 2;
    diveropeStarPath(x, y, 11, 5, -Math.PI / 2 + Math.sin(t * 1.5 + x) * 0.15); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink; circle(x - 2.5, y - 1, 1.3); ctx.fill(); circle(x + 2.5, y - 1, 1.3); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y + 1, 2.2, 0.2, Math.PI - 0.2); ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(255,220,240,0.35)'; circle(x, y, 13 + Math.sin(t * 3 + x) * 2); ctx.fill();
    ctx.fillStyle = '#c38bff'; ctx.beginPath(); ctx.ellipse(x, y + 8, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 8);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#f2d6ec');
    ctx.fillStyle = g; circle(x, y, 7.5); ctx.fill(); ctx.strokeStyle = 'rgba(28,26,54,0.4)'; ctx.lineWidth = 1.2; circle(x, y, 7.5); ctx.stroke();
  }
}
function diveropeDrawChest(x, y, goldy, open, finder) {
  const t = G.clock;
  if (finder) {
    ctx.fillStyle = 'rgba(255,211,74,' + (0.25 + 0.15 * Math.sin(t * 5)) + ')'; circle(x, y - 16, 40); ctx.fill();
    for (let i = 0; i < 4; i++) { const a = t * 2 + i * 1.57; ctx.fillStyle = C.gold; diveropeStarPath(x + Math.cos(a) * 34, y - 18 + Math.sin(a) * 22, 5, 2, a); ctx.fill(); }
  }
  ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(x, y, 28, 5, 0, 0, Math.PI * 2); ctx.fill();
  const body = goldy ? '#e0a53a' : '#a0643a', dark = goldy ? '#9a6a18' : '#5e3a20', band = goldy ? '#fff0a0' : '#ffd34a';
  ctx.fillStyle = body; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  rr(x - 24, y - 24, 48, 24, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = dark; ctx.fillRect(x - 22, y - 14, 44, 3);
  // the lid opens up (and treasure glows inside)
  ctx.save(); ctx.translate(x - 24, y - 24); ctx.rotate(-open * 1.9);
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(48, 0); ctx.quadraticCurveTo(48, -16, 24, -16); ctx.quadraticCurveTo(0, -16, 0, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = band; ctx.fillRect(8, -14, 5, 14); ctx.fillRect(35, -14, 5, 14);
  ctx.restore();
  if (open > 0) {
    ctx.fillStyle = 'rgba(255,230,120,' + open * 0.8 + ')'; circle(x, y - 28, 22 * open); ctx.fill();
    for (let i = 0; i < 5; i++) { ctx.fillStyle = DIVEROPE_GEMS[i]; circle(x - 14 + i * 7, y - 25 - (i % 2) * 3, 4); ctx.fill(); }
  }
  ctx.fillStyle = band; ctx.fillRect(x - 16, y - 24, 5, 24); ctx.fillRect(x + 11, y - 24, 5, 24);
  ctx.fillStyle = band; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; rr(x - 5, y - 27, 10, 10, 2); ctx.fill(); ctx.stroke();
  if (Math.sin(t * 2.6 + x) > 0.7) { ctx.fillStyle = '#ffffff'; diveropeStarPath(x + 18, y - 30, 5, 2, 0.3); ctx.fill(); }
}
function diveropeDrawHole(st, e) {
  ctx.fillStyle = 'rgba(20,18,48,0.75)'; ctx.beginPath(); ctx.ellipse(e.x, e.y, 13, 17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, e.y, 13, 17, 0, 0, Math.PI * 2); ctx.stroke();
}
function diveropeDrawEel(st, e) {
  const t = G.clock, peek = e.s === 'sleep' || e.s === 'wake' ? 0.13 + (e.s === 'wake' ? 0.06 * Math.sin(t * 20) : 0) : 0.1;
  const ext = Math.max(e.ext, peek), len = e.reach * ext, hx = e.x + e.dir * len, hy = e.y;
  const body = e.gold ? '#ffd34a' : e.col ? '#9b7bff' : '#5cc77a', belly = e.gold ? '#fff2b0' : e.col ? '#e2d4ff' : '#f2f29a', dark = e.gold ? '#a07418' : e.col ? '#5a3fae' : '#2f7f4a';
  // the body, a wavy line from the hole to the head
  const n = Math.max(2, Math.ceil(len / 10));
  const pt = i => { const u = i / n; return [e.x + e.dir * len * u, hy + Math.sin(u * 7 - t * 9) * 5 * u * (e.s === 'out' ? 1 : 0.3)]; };
  for (const [col, lw] of [[dark, 17], [body, 13]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= n; i++) { const [x, y] = pt(i); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
  }
  ctx.strokeStyle = belly; ctx.lineWidth = 4; ctx.beginPath();
  for (let i = 0; i <= n; i++) { const [x, y] = pt(i); if (i) ctx.lineTo(x, y + 3); else ctx.moveTo(x, y + 3); }
  ctx.stroke();
  // the head
  const [ex, ey] = pt(n), f = e.dir;
  ctx.fillStyle = body; ctx.strokeStyle = dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(ex + f * 6, ey, 15, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const eyeX = ex + f * 9;
  if (e.s === 'sleep' || e.gold) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(eyeX - 3, ey - 3, 3, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.beginPath(); ctx.arc(eyeX + 5, ey - 3, 3, 0.2, Math.PI - 0.2); ctx.stroke();
    const zt = (t * 0.7 + e.ph) % 1;
    ctx.globalAlpha = 1 - zt; text('z', ex + f * 4 + zt * 14 * f, ey - 18 - zt * 22, 14 + zt * 6, '#ffffff', 'center'); ctx.globalAlpha = 1;
    if (e.gold) { ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ex - 6, ey - 8); ctx.lineTo(ex + 14, ey - 9); ctx.lineTo(ex + f * 24, ey - 22); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffffff'; circle(ex + f * 24, ey - 22, 3.5); ctx.fill(); }
  } else {
    const big = e.s === 'fright' ? 4.5 : 3.6;
    for (const ox of [-3, 5]) { ctx.fillStyle = '#ffffff'; circle(eyeX + ox, ey - 3, big); ctx.fill(); ctx.fillStyle = C.ink; circle(eyeX + ox + f * 1, ey - 3, 1.8); ctx.fill(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6;
    if (e.s === 'fright') { ctx.beginPath(); ctx.ellipse(ex + f * 14, ey + 5, 3, 3.5, 0, 0, Math.PI * 2); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(ex + f * 12, ey + 3, 3.5, 0.2, Math.PI - 0.2); ctx.stroke(); }
    if (e.s === 'wake') text('!', ex + f * 4, ey - 24 - Math.abs(Math.sin(t * 10)) * 4, 22, '#ffe36b', 'center');
  }
}
function diveropeDrawJelly(st, j) {
  const t = G.clock, sq = j.squish > 0 ? Math.sin(j.squish * 18) * 0.15 : 0, x = j.x, y = j.y, pulse = Math.sin(t * 3 + j.ph) * 0.06;
  const col = j.gold ? 'rgba(255,211,74,0.85)' : 'rgba(255,150,210,0.8)', rim = j.gold ? '#a07418' : '#c0508e';
  ctx.strokeStyle = j.gold ? 'rgba(255,230,140,0.8)' : 'rgba(255,190,230,0.75)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(x + i * 6, y + 6);
    for (let k = 1; k <= 4; k++) ctx.lineTo(x + i * 6 + Math.sin(t * 4 + k + i) * 3, y + 6 + k * 7);
    ctx.stroke();
  }
  ctx.save(); ctx.translate(x, y); ctx.scale(1 + sq + pulse, 1 - sq - pulse);
  ctx.fillStyle = col; ctx.strokeStyle = rim; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 6, 21, Math.PI, 0); ctx.quadraticCurveTo(10, 11, 0, 8); ctx.quadraticCurveTo(-10, 11, -21, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-8, -6, 6, 3.5, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.ink; circle(-6, -1, 2); ctx.fill(); circle(6, -1, 2); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 1, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,140,0.5)'; circle(-11, 2, 2.5); ctx.fill(); circle(11, 2, 2.5); ctx.fill();
  ctx.restore();
  if (j.gold && Math.sin(t * 5 + j.ph) > 0.5) { ctx.fillStyle = '#ffffff'; diveropeStarPath(x + 16, y - 14, 5, 2, 0); ctx.fill(); }
}
function diveropeDrawRope(st) {
  const ns = st.rope.nodes;
  if (!ns) return;
  const path = () => {
    ctx.beginPath(); ctx.moveTo(ns[0].x, ns[0].y);
    for (let i = 1; i < ns.length - 1; i++) { const mx = (ns[i].x + ns[i + 1].x) / 2, my = (ns[i].y + ns[i + 1].y) / 2; ctx.quadraticCurveTo(ns[i].x, ns[i].y, mx, my); }
    ctx.lineTo(ns[ns.length - 1].x, ns[ns.length - 1].y);
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#6b4a22'; ctx.lineWidth = 6.5; path(); ctx.stroke();
  ctx.strokeStyle = st.air < DROPE.low && st.state === 'ride' ? (Math.sin(G.clock * 10) > 0 ? '#ff9a8a' : '#efe0b0') : '#efe0b0'; ctx.lineWidth = 4; path(); ctx.stroke();
  ctx.setLineDash([3, 9]); ctx.strokeStyle = 'rgba(160,110,50,0.8)'; ctx.lineWidth = 2; path(); ctx.stroke(); ctx.setLineDash([]);
  // air puffs travel down the hose after each pump
  if (st.pumpAnim > 0) {
    const u = 1 - st.pumpAnim, i = Math.min(ns.length - 1, Math.floor(u * (ns.length - 1)));
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; circle(ns[i].x, ns[i].y, 4); ctx.fill();
  }
}
function diveropeDrawBoat(st) {
  const D = DROPE, b = st.boat, x = b.x, y = Math.sin(b.bob) * 2, tilt = Math.sin(b.bob * 0.7) * 0.03;
  if (y - st.cam > H + 60 || y - st.cam < -80) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  // the mast and flag (the boat partner's colour)
  ctx.strokeStyle = '#5e3c1e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-70, -16); ctx.lineTo(-70, -78); ctx.stroke();
  ctx.fillStyle = PCOL[st.boater]; ctx.beginPath(); ctx.moveTo(-70, -78); ctx.lineTo(-44, -70 + Math.sin(G.clock * 5) * 2); ctx.lineTo(-70, -62); ctx.closePath(); ctx.fill();
  // the pump: a box with a handle that goes down on each stroke
  const pd = st.pumpAnim > 0 ? Math.sin(st.pumpAnim * Math.PI) * 10 : 0;
  ctx.fillStyle = '#c9955a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(-58, -40, 22, 26, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d8dce8'; ctx.fillRect(-49, -52 + pd, 4, 14);
  ctx.fillStyle = '#5e3c1e'; rr(-60, -56 + pd, 26, 6, 3); ctx.fill();
  // the boat partner (drawn by the engine's player drawing, in the boat)
  diveropeDrawSitter(st, G.players[st.boater], -26, -14);
  // the winch drum and crank at the anchor
  const wx = D.anchorDX, wy = D.anchorY - 14;
  ctx.fillStyle = '#7a5232'; ctx.fillRect(wx - 3, wy, 6, 18);
  ctx.fillStyle = '#efe0b0'; ctx.strokeStyle = '#6b4a22'; ctx.lineWidth = 2; circle(wx, wy, 10); ctx.fill(); ctx.stroke();
  const ca = st.rope.turn;
  ctx.strokeStyle = '#5e3c1e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(ca) * 13, wy + Math.sin(ca) * 13); ctx.stroke();
  ctx.fillStyle = '#ff6b4a'; circle(wx + Math.cos(ca) * 13, wy + Math.sin(ca) * 13, 3.5); ctx.fill();
  // the treasure pile (grows as treasure comes up) and the chests already won
  const n = Math.min(14, st.stats.banked);
  for (let i = 0; i < n; i++) { ctx.fillStyle = DIVEROPE_GEMS[i % 5]; circle(56 + (i % 5) * 6 - 12, -18 - Math.floor(i / 5) * 5, 3.5); ctx.fill(); }
  // the hull
  ctx.fillStyle = '#b5743e'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-90, -18); ctx.lineTo(90, -18); ctx.quadraticCurveTo(84, 12, 56, 14); ctx.lineTo(-56, 14); ctx.quadraticCurveTo(-84, 12, -90, -18); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-86, -12, 172, 5);
  ctx.fillStyle = '#8a5530'; for (let i = -2; i <= 2; i++) ctx.fillRect(i * 32 - 1, -4, 2, 14);
  text('PIP & BO', 0, 4, 11, '#ffe7a8', 'center', 'body');
  ctx.restore();
  const ch = st.c.chest;
  if (ch.state === 'boat') diveropeDrawChest(ch.x, ch.y, st.c.look === 'trench', ch.open, false);
  if (st.bankFx) { ctx.globalAlpha = clamp(1.6 - st.bankFx.t, 0, 1); ctx.fillStyle = 'rgba(255,230,120,0.5)'; circle(x + 50, -30, 20 + st.bankFx.t * 30); ctx.fill(); ctx.globalAlpha = 1; }
}
// the boat partner at the pump or the winch (in boat px)
function diveropeDrawSitter(st, p, sx, sy) {
  const save = { x: p.x, y: p.y, face: p.face, sx: p.sx, sy: p.sy, vy: p.vy, stun: p.stun, alive: p.alive };
  const win = st.state === 'win', winching = st.rope.mode !== 'idle' && st.state === 'ride';
  const pd = st.pumpAnim > 0 ? Math.sin(st.pumpAnim * Math.PI) : 0;
  ctx.save(); ctx.translate(sx, sy - pd * 3 + (win ? -Math.abs(Math.sin(G.clock * 8)) * 6 : 0));
  p.x = -PW / 2; p.y = -PH; p.alive = true; p.vy = 0; p.face = winching ? 1 : -1; p.sx = 1 + pd * 0.08; p.sy = 1 - pd * 0.08; p.stun = 0;
  drawPlayer(p);
  ctx.restore();
  Object.assign(p, save);
  // arms: on the pump handle, or on the winch crank
  const shY = sy - PH * 0.45, D = DROPE;
  const arm = (hx, hy, shX) => {
    for (const [col, lw] of [[PDARK[p.id], 5.5], [PCOL[p.id], 3.2]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(shX, shY); ctx.lineTo(hx, hy); ctx.stroke(); }
    ctx.fillStyle = PCOL[p.id]; circle(hx, hy, 3.2); ctx.fill();
  };
  if (win) { arm(sx - 14, shY - 18, sx - 8); arm(sx + 14, shY - 18, sx + 8); return; }
  if (winching) { const ca = st.rope.turn, wx = D.anchorDX + Math.cos(ca) * 13, wy = D.anchorY - 14 + Math.sin(ca) * 13; arm(wx, wy, sx + 8); arm(wx - 2, wy + 1, sx + 4); }
  else { const hy = -53 + pd * 10; arm(-50, hy, sx - 8); arm(-42, hy, sx - 4); }
}
function diveropeDrawDiver(st) {
  const D = DROPE, d = st.d, p = G.players[st.diver], t = G.clock;
  const save = { x: p.x, y: p.y, face: p.face, sx: p.sx, sy: p.sy, vy: p.vy, stun: p.stun, alive: p.alive };
  const sc = 1.4, rot = (d.wob > 0 ? Math.sin(d.wob * 22) * 0.2 : 0) + d.spin * Math.PI * 2 + (st.state === 'ride' && !d.ground ? clamp(d.vx / 600, -0.18, 0.18) : 0);
  const ch = st.c.chest;
  // the chest hangs from the diver's hands
  if (d.chest && st.state === 'ride') {
    ctx.strokeStyle = '#6b4a22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d.x + d.face * 10, d.y - 18); ctx.lineTo(ch.x, ch.y - 30); ctx.stroke();
    diveropeDrawChest(ch.x, ch.y, st.c.look === 'trench', 0, false);
  }
  ctx.save(); ctx.translate(d.x, d.y - D.ht / 2); ctx.rotate(rot); ctx.translate(0, D.ht / 2);
  // the brass helmet's back (the body is drawn on it)
  ctx.fillStyle = '#d99a3a'; ctx.strokeStyle = '#7a4e14'; ctx.lineWidth = 2.5;
  circle(0, -24, 19); ctx.fill(); ctx.stroke();
  // the net bag at the hip, with what's in it
  const nb = d.bag.length;
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.strokeStyle = '#efe0b0'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(-d.face * 15, -8, 7 + Math.min(4, nb), 8 + Math.min(4, nb), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  for (let i = 0; i < Math.min(6, nb); i++) { ctx.fillStyle = d.bag[i].col; circle(-d.face * 15 + (i % 3 - 1) * 4, -6 - Math.floor(i / 3) * 5, 2.6); ctx.fill(); }
  ctx.scale(sc, sc);
  p.x = -PW / 2; p.y = -PH; p.alive = true; p.vy = d.vy * 0.4; p.face = d.face; p.sx = 1; p.sy = 1; p.stun = d.wob > 0.5 ? 0.5 : 0;
  drawPlayer(p);
  ctx.scale(1 / sc, 1 / sc);
  Object.assign(p, save);
  // the helmet's front: a round brass window round the face, a collar, bolts, the hose nozzle, heavy boots
  const fy = -PH * 0.6 * sc;
  const fx = d.face * 3;
  ctx.strokeStyle = '#e8b04a'; ctx.lineWidth = 5.5; circle(fx, fy, 14); ctx.stroke();
  ctx.strokeStyle = '#7a4e14'; ctx.lineWidth = 1.5; circle(fx, fy, 16.8); ctx.stroke(); circle(fx, fy, 11.2); ctx.stroke();
  ctx.fillStyle = 'rgba(200,240,255,0.22)'; circle(fx, fy, 11.2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(fx, fy, 8, -2.6, -1.6); ctx.stroke();
  ctx.fillStyle = '#7a4e14'; for (const a of [0.6, 2.5, 3.8, 5.6]) { circle(fx + Math.cos(a) * 14, fy + Math.sin(a) * 14, 1.7); ctx.fill(); }
  ctx.fillStyle = '#e8b04a'; ctx.strokeStyle = '#7a4e14'; ctx.lineWidth = 1.5; rr(-17, -13, 34, 7, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c8862a'; rr(-4, -48, 8, 6, 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5a5f78'; rr(-13, -5, 11, 7, 2); ctx.fill(); rr(2, -5, 11, 7, 2); ctx.fill();
  ctx.restore();
  // out of air: a big bubble carries the diver up
  if (st.state === 'blub' && st.bubble) {
    const r = 40 + Math.sin(t * 6) * 2;
    ctx.fillStyle = 'rgba(210,245,255,0.25)'; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
    circle(d.x, d.y - 22, r); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(d.x, d.y - 22, r - 8, -2.5, -1.7); ctx.stroke();
  }
}

/* ---------- the HUD: clock and treasure, the depth gauge, the air meter, the job panels, prompts ---------- */
function diveropeHud(st) {
  const D = DROPE, big = hudBig(), z = big ? 1.3 : 1, ps = G.players, play = G.mode === 'play' || G.mode === 'paused', t = G.clock, d = st.d;
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(st.stats.finishT || G.time), n = st.stats.banked + ' / ' + st.allTreasure;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.2, gap = fs;
    const w = tw + gap + icon + fs * 0.4 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, C.paper, 'left', 'body');
    const gx = x0 + 15 + tw + gap + icon / 2, s = fs * 0.55;
    ctx.fillStyle = '#5fd0ff'; ctx.beginPath(); ctx.moveTo(gx, cy - s); ctx.lineTo(gx + s * 0.8, cy - s * 0.25); ctx.lineTo(gx, cy + s); ctx.lineTo(gx - s * 0.8, cy - s * 0.25); ctx.closePath(); ctx.fill();
    text(n, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, '#ffe7a8', 'left', 'body');
    timeX0 = x0;
  }
  if (!play) return;
  const pl = st.plan || diveropePlan(st);
  // the depth gauge (right edge): the boat at the top, the chest's depth, the diver, the end of the rope
  {
    const x = W - 22, y0 = (big ? 70 : 56) + 18, y1 = H - (big ? 70 : 56) * z - 40, fl = st.c.floor;
    ctx.fillStyle = 'rgba(28,26,54,0.6)'; rr(x - 9, y0 - 16, 18, y1 - y0 + 30, 9); ctx.fill();
    const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#7fe6f0'); g.addColorStop(1, '#2a5aa8');
    ctx.fillStyle = g; rr(x - 3, y0, 6, y1 - y0, 3); ctx.fill();
    const yy = v => y0 + (y1 - y0) * clamp(v / fl, 0, 1);
    ctx.fillStyle = '#b5743e'; rr(x - 10, y0 - 9, 20, 7, 3); ctx.fill();
    ctx.fillStyle = 'rgba(239,224,176,0.9)'; ctx.fillRect(x - 6, yy(st.rope.L + 40) - 1, 12, 2.5);
    const ch = st.c.chest;
    if (ch.state !== 'boat') { ctx.fillStyle = C.gold; rr(x - 7, yy(ch.y) - 6, 14, 9, 2); ctx.fill(); }
    const dy = yy(d.y);
    ctx.fillStyle = PCOL[st.diver]; circle(x, dy - 4, 6.5); ctx.fill();
    ctx.fillStyle = '#e8b04a'; circle(x, dy - 4, 3.2); ctx.fill();
  }
  // the air meter, bottom centre: the main thing to watch
  const zone = { x0: 0, x1: W };
  {
    const pw = Math.round(236 * z), ph = Math.round(62 * z), px = W / 2 - pw / 2, py = H - ph - 10, low = st.air < D.low && st.state === 'ride';
    zone.x0 = px; zone.x1 = px + pw;
    ctx.fillStyle = 'rgba(28,26,54,0.84)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = low ? (Math.sin(t * 10) > 0 ? '#ff6b4a' : '#ffd0a0') : st.goldAir || st.goldPump ? C.gold : '#9fe6ff'; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const gx = px + 14 * z, gw = pw - 28 * z, gy = py + 24 * z, gh = 15 * z;
    text(low ? 'AIR LOW! REEL UP!' : st.state === 'blub' ? 'BLUB! BACK TO THE BOAT' : 'AIR', gx, py + 12 * z, 11 * z, low ? '#ff9a8a' : '#bfeaff', 'left', 'body');
    const lab = 'Depth ' + diveropeMeters(d.y) + ' m', lab2 = '◆ bag ' + d.bag.length;
    text(lab, gx + gw, py + 12 * z, 11 * z, '#d9d3ef', 'right', 'body');
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(gx, gy, gw, gh, gh / 2); ctx.fill();
    const a = clamp(st.air, 0, 1), col = a < D.low ? '#ff6b4a' : a < 0.55 ? '#ffd34a' : '#6fe3a0';
    ctx.save(); rr(gx, gy, gw, gh, gh / 2); ctx.clip();
    ctx.fillStyle = col; ctx.fillRect(gx, gy, gw * a, gh);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 6; i++) { const bx = gx + ((i * 47 + t * 30) % Math.max(1, gw * a)); circle(bx, gy + gh / 2 + Math.sin(t * 3 + i) * 2, 2.2 * z); ctx.fill(); }
    ctx.fillStyle = 'rgba(232,58,42,0.3)'; ctx.fillRect(gx, gy, gw * D.low, gh);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; rr(gx, gy, gw, gh, gh / 2); ctx.stroke();
    const note = st.state === 'win' ? 'Treasure!' : st.state === 'blub' ? 'Floating up...' : st.goldPump ? 'Gold pump!' : st.goldAir ? 'Gold air hose!' : d.y < D.nearY ? 'Fresh air by the boat' : st.pumpAnim > 0.5 ? 'Pumping! Whoosh!' : st.rope.mode === 'in' ? (pl.turbo ? 'Fast reel!' : 'Reeling in') : st.rope.mode === 'out' ? 'Letting out rope' : 'Air going down';
    text(note, gx, py + ph - 10 * z, 10.5 * z, st.goldAir || st.goldPump ? C.gold : '#d9d3ef', 'left', 'body');
    text(lab2 + (d.chest ? ' + chest' : ''), gx + gw, py + ph - 10 * z, 10.5 * z, d.bag.length || d.chest ? '#ffe7a8' : '#d9d3ef', 'right', 'body');
  }
  // the job panels: Pip's bottom left, Bo's bottom right
  const ride = st.state === 'ride' && G.introT <= 0;
  const panels = [];
  for (const id of [0, 1]) {
    const pw = Math.round(206 * z), ph = Math.round(56 * z), py = H - ph - 10, px = id === 0 ? 12 : W - 12 - pw;
    panels[id] = { px, py, pw, ph };
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const quiet = diveropeQuiet(id), diver = id === st.diver;
    text(NAMES[id] + (diver ? ' · diver' : ' · boat') + (quiet ? ' (computer)' : ''), px + 12 * z, py + 15 * z, 14 * z, PCOL[id], 'left');
    const rm = st.rope.mode;
    const steer = ride && Math.abs(pl.tx - d.x) > 30 ? (pl.tx > d.x ? 'right' : 'left') : 'lr';
    const chips = diver
      ? [[steer, 'SWIM', ride && steer !== 'lr', Math.abs(d.vx) > 40], ['act', 'GRAB', ride && pl.grab, d.chest]]
      : [['down', 'ROPE', ride && pl.rope === 'out', rm === 'out'], ['up', 'REEL', ride && pl.rope === 'in', rm === 'in'], ['act', 'PUMP', ride && pl.pump && rm === 'idle' && st.air < 0.8, st.pumpAnim > 0.4]];
    const n = chips.length, cw = (pw - 24 * z - (n - 1) * 6 * z) / n;
    chips.forEach(([k, lab, lit, held], i) => {
      const cx = px + 12 * z + i * (cw + 6 * z), cy = py + 26 * z, chh = 24 * z;
      ctx.fillStyle = lit && !quiet ? (Math.sin(t * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : held ? 'rgba(255,138,61,0.85)' : 'rgba(255,255,255,0.12)';
      rr(cx, cy, cw, chh, chh / 2); ctx.fill();
      const kk = quiet ? '' : diveropeKey(id, k);
      let fs = 12 * z;
      const str = (kk ? kk + ' ' : '') + lab;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      while (fs > 8 && ctx.measureText(str).width > cw - 8) { fs -= 0.5; ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; }
      text(str, cx + cw / 2, cy + chh / 2 + 0.5, fs, lit && !quiet ? C.ink : '#ffffff', 'center', 'body');
    });
  }
  // the message line (gold help): between the level pill and the clock when it fits, else under the dive pill
  if (st.msg) {
    let fs = big ? 20 : 14;
    const h = big ? 32 : 26, font = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.font = font(14);
    const left = 14 + ctx.measureText(levelCode(G.levelIndex) + ' · ' + G.level.def.name).width + 28 + 10, right = timeX0 - 10;
    ctx.font = font(fs);
    let w = ctx.measureText(st.msg.text).width + 30, cx = W / 2 + 40, y = 12;
    if (w <= right - left) cx = clamp(cx, left + w / 2, right - w / 2);
    else {
      cx = W / 2; y = big ? 96 : 80;
      while (w > W - 60 && fs > 11) { fs--; ctx.font = font(fs); w = ctx.measureText(st.msg.text).width + 30; }
    }
    ctx.globalAlpha = clamp((st.msg.life - st.msg.t) / 0.3, 0, 1);
    pill(cx, y, w, h, 'center'); text(st.msg.text, cx, y + h / 2 + 0.5, fs, st.msg.col, 'center', 'body'); ctx.globalAlpha = 1;
  }
  if (G.introT > 0 || st.state !== 'ride') return;
  // prompts: the diver's beside the diver, the boat partner's over their job panel. A hint bubble replaces a prompt.
  const fs = 14 * z, yMin = big ? 100 : 84, yMax = H - Math.round(62 * z) - 20 - (fs + 12 * z);
  const spot = (id, w, h) => {
    if (id === st.diver) {
      const sx = d.x, sy = d.y - st.cam;
      let x = sx < W / 2 ? sx + 44 : sx - 44 - w, y = clamp(sy - 40 - h, yMin, yMax);
      x = clamp(x, 6, W - w - 40);
      return { x, y };
    }
    const P = panels[id];
    return { x: clamp(id === 0 ? P.px : P.px + P.pw - w, 6, W - w - 6), y: P.py - h - 8 };
  };
  const say = (id, str, col, pulse) => {
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, o = spot(id, w, h);
    const s = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(o.x + w / 2, o.y + h / 2); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, col, 'center', 'body');
    ctx.restore();
  };
  const bubble = (id, str) => {
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 22 * z, h = fs + 14 * z, o = spot(id, w, h);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5;
    rr(o.x, o.y, w, h, h / 2); ctx.fill(); ctx.stroke();
    text(str, o.x + w / 2, o.y + h / 2 + 0.5, fs, C.ink, 'center', 'body');
  };
  for (const p of ps) {
    const id = p.id;
    if (diveropeQuiet(id)) continue;
    if (st.hints[id]) { bubble(id, st.hints[id].text); continue; }
    const rm = st.rope.mode;
    if (id === st.boater) {
      if (pl.rope === 'in' && rm !== 'in') say(id, pl.turbo ? 'Air low! Reel in fast: hold ' + diveropeKey(id, 'up') : pl.why === 'chest' ? 'Chest! Reel in: hold ' + diveropeKey(id, 'up') : 'Reel in: hold ' + diveropeKey(id, 'up'), pl.turbo ? '#ff9a8a' : C.gold, true);
      else if (pl.rope === 'out' && rm !== 'out' && (st.air >= 0.5)) say(id, 'Let out rope: hold ' + diveropeKey(id, 'down'), C.gold, true);
      else if (pl.why === 'eel' && rm !== 'idle') say(id, 'Wait! An eel is awake', '#ffe7a8', false);
      else if (pl.why === 'jelly' && rm !== 'idle') say(id, 'Wait! A jellyfish is in the way', '#ffe7a8', false);
      else if (rm === 'idle' && pl.pump && st.air < 0.75) say(id, 'Pump air: tap ' + diveropeKey(id, 'act'), st.air < 0.5 ? C.gold : '#bfeaff', st.air < 0.5);
      else if (rm === 'out' && pl.rope === 'hold' && d.ground) say(id, NAMES[st.diver] + ' is on the rock: pump!', '#bfeaff', false);
    } else {
      if (pl.grab) say(id, 'Grab the chest! Press ' + diveropeKey(id, 'act'), C.gold, true);
      else if (pl.snag) say(id, (pl.tx < d.x ? '◀ ' : '') + 'Swim out from under the rock' + (pl.tx >= d.x ? ' ▶' : ''), '#ffd0a0', true);
      else if (Math.abs(pl.tx - d.x) > 50 && Math.abs(d.vx) < 60) {
        const right = pl.tx > d.x, word = pl.up ? 'Swim to open water' : pl.eel ? 'Swim round the eel' : pl.jelly ? 'Swim round the jellyfish' : Math.abs(st.c.chest.x - pl.tx) < 30 && st.c.chest.y - d.y < 320 ? 'Swim to the chest' : 'Swim this way';
        const k = diveropeKey(id, right ? 'right' : 'left'), kk = k === '◀' || k === '▶' ? '' : ' (' + k + ')';
        say(id, right ? word + ' ▶' + kk : '◀ ' + word + kk, '#ffe7a8', false);
      } else if (pl.rope === 'out' && pl.taut && st.rope.mode === 'idle' && d.downT === 0 && G.time - d.tug > 4) say(id, 'Hold ' + diveropeKey(id, 'down') + ' to tug for more rope', '#bfeaff', false);
    }
  }
}

/* ---------- sounds ---------- */
Sfx.extra.diveropePump = function () { this.tone(200, 0.12, 'sine', 0.05, 420); this.tone(900, 0.08, 'triangle', 0.015, 1400, 0.04); };
Sfx.extra.diveropeClick = function () { this.tone(1200, 0.025, 'square', 0.018, 900); };
Sfx.extra.diveropeReel = function () { this.tone(300, 0.1, 'triangle', 0.03, 520); };
Sfx.extra.diveropeOut = function () { this.tone(420, 0.1, 'triangle', 0.03, 260); };
Sfx.extra.diveropeKick = function () { this.tone(260, 0.12, 'sine', 0.04, 380); };
Sfx.extra.diveropeTug = function () { this.tone(330, 0.07, 'triangle', 0.04, 300); this.tone(330, 0.07, 'triangle', 0.04, 300, 0.12); };
Sfx.extra.diveropeGem = function () { [1319, 1760, 2093].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.035, null, i * 0.045)); };
Sfx.extra.diveropeHook = function () { this.tone(500, 0.08, 'square', 0.03, 700); [659, 880, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, 0.08 + i * 0.06)); };
Sfx.extra.diveropeGrabMiss = function () { this.tone(240, 0.06, 'triangle', 0.025, 200); };
Sfx.extra.diveropeBank = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, i * 0.07)); this.tone(2600, 0.05, 'sine', 0.02, null, 0.3); };
Sfx.extra.diveropeEek = function () { this.tone(900, 0.12, 'sine', 0.05, 1500); this.tone(500, 0.18, 'triangle', 0.04, 260, 0.1); };
Sfx.extra.diveropeBoing = function () { this.tone(180, 0.3, 'sine', 0.07, 560); this.tone(380, 0.16, 'sine', 0.03, 760, 0.06); };
Sfx.extra.diveropeSnag = function () { this.tone(150, 0.14, 'sawtooth', 0.025, 110); };
Sfx.extra.diveropeAlarm = function () { this.tone(880, 0.09, 'triangle', 0.035); this.tone(660, 0.09, 'triangle', 0.035, null, 0.13); };
Sfx.extra.diveropeBlub = function () { [520, 400, 640, 300, 720].forEach((f, i) => this.tone(f, 0.08, 'sine', 0.05, f * 1.5, i * 0.08)); };
Sfx.extra.diveropePop = function () { this.tone(700, 0.06, 'sine', 0.06, 1400); this.tone(1200, 0.06, 'triangle', 0.03, null, 0.07); };
Sfx.extra.diveropeChest = function () { this.tone(120, 0.12, 'triangle', 0.06, 80); [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.13, 'triangle', 0.05, null, 0.12 + i * 0.08)); };
Sfx.extra.diveropeFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'square', 0.035, null, i * 0.11)); };
Sfx.extra.diveropeCheer = function () { [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.04, null, i * 0.06)); };
Sfx.extra.diveropeHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
