/* Pip & Bo - Level 30-1 The Time Thief: era 'henge' (Building Stonehenge, 2500 BC). */
'use strict';

/* ===== 30-1 era 2: Building Stonehenge, 2500 BC (TTH_PHASES.henge) — Gavyn's pick =====
   "He's taking the last giant stone. One pushes it on logs, the other moves the logs to the front."
   The Time Thief dragged the last great sarsen stone away from the half-built circle: 25 tons, far too heavy for his
   claw to lift. Pip and Bo roll it home on log rollers across Salisbury Plain: about 3.7 screens to the right, a
   gentle side-scroll that follows the stone, in 3 LEGS with a rest post between them where the jobs swap.

   THE STONE AND ITS LOGS (the heart of the puzzle).
   - The stone (192 px long) lies on 4 log rollers. Like real rollers, a log under the stone moves at HALF the stone's
     speed, so the logs slowly travel to the back and roll out behind it.
   - The stone only rolls while a log lies under its FRONT HALF. When that log is nearly spent a red "!" blinks at the
     nose (the telegraph); with no log there the nose drops: "Thud!" (it never tips over and never hurts; it waits).
   - If the stone is stuck with every log trapped under its back half, the rearmost one squeezes out by itself after
     0.7 s, so there is always a log to fetch.
   JOBS (strict, so one player alone can never move the stone; they swap at each rest post; room field 'first' says
   who pushes first: Bo, in this era).
   - The PUSHER leans on the stone: hold toward it at its back end (hold right). 41 px/s on the flat, 32 uphill.
     The pusher's action button is "shoo" (sheep, the Thief's claw). The pusher can't carry logs.
   - The ROLLER fetches logs: the action GRABS a log lying free on the ground (within 40 px), then hop up on the stone
     (it is 72 px tall: a normal full jump), run along its top and press the action again on its front third or on the
     ground in front: the log DROPS just ahead of the nose (it always snaps to the best spot, 12 px ahead of the stone
     or 40 px past a log already lying there; a dashed ring shows the spot). A dropped log can't be grabbed again for
     1.2 s (no double-press accidents). The roller's pushing does nothing.
     Each log dropped in front buys about 200 px of rolling, so a leg needs 5-7 trips.
   - Both: the action also SHOOS a sheep (within 64 px) and WHACKS the Thief's claw (within 74 px). Players pass
     through each other; the stone is solid (walk on top of it, ride it).
   - FRESH LOGS: at each rest post and when the log road is finished the rotation is topped up to 4 logs again
     ("Fresh logs!"), whatever the mud, the stream or the Thief did to it.
   HILLS.
   - UPHILL (legs 1 and 3): if the pusher lets go for more than 0.35 s the stone rolls BACK (slowly at first), down
     to the last chock (wooden wedges that flip up behind the stone every 150-170 px, and every rest post): a
     counted team bump "Rolled back!" once it has lost 50 px. So the pusher holds while the roller hurries.
   - DOWNHILL (leg 3): pushed over the crest, the stone RUNS AWAY (18 px/s2 up to 130 px/s). The pusher hops over
     it and brakes from the FRONT: hold toward the stone there (hold left) and it eases down at 52 px/s. A stone
     that stops on the downhill only starts again when the pusher eases it from the front (or shoves it from behind),
     so it never rolls anywhere by itself. A runaway that outruns its logs faster than 80 px/s: "Runaway! Thud!"
     (team bump), it stops there.
   THINGS ON THE WAY.
   - MUD (legs 2 and 3): a bubbling puddle swallows the first log that rolls or drops onto it ("Glub!"; after that
     it is plugged). A pile of spare logs stands just past it: the roller grabs one there (never more than 4 logs
     in play, 5 with gold help).
   - SHEEP (legs 2 and 3) wander in from the right (3 s on screen before they stand still) and graze on the track:
     the stone stops in front of them ("Baa!"). Shoo them with the action. A runaway stone makes them hop off.
   - THE STREAM (leg 2): the stone stops at the bank until 3 logs are laid in the water as a log road (drop a
     carried log near the stream: it goes into the next free place; the pile beside it gives one extra log at a
     time for this). Players can wade.
   THE THIEF (jet machine, on screen all era; his claw is empty: here the stolen thing is the giant stone itself).
   - Opening gag: he tugs at the stone ("25 tons?!").
   - CLAW PINCH (leg 1 once, on the hill; leg 3 once): he swoops over a log lying free behind the stone (1.0 s aiming
     with a red ring on the log and "!" over both players), then lowers the claw (0.75 s). Save the log by grabbing
     it first (roller) or whack the claw (either player). If he gets it: "Yoink!" (team bump); he dangles it low
     behind the stone for 6.5 s: whack the claw (stand under it, action) and he drops it; otherwise he drops it
     himself ("Butterfingers!"), so a log is never lost for good.
   - LASSO (leg 2 once, leg 3 once, on flat ground): he swings a lasso for 1.4 s ("Lasso time!", "!" over both),
     ropes the stone and tows it BACKWARD. Both players haul against him: hold AWAY from him (right) on the ground
     near the stone (the pusher pushes, anyone in front grabs the rope tail). Both hauling fills the tug bar in
     about 2.4 s: SNAP, he tumbles away. One hauling: the stone creeps back; nobody: it is towed at 34 px/s. Towed
     170 px, or 10 s without winning: the rope slips off ("Towed back!", team bump).
   - He never starts anything during cards, celebrations or while nobody plays (tthCalm), and the stone never rolls
     back then.
   THE WINNING BEAT. At the circle the stone tips into its hole by itself (THUNK, it stands upright). Then the lintel
   must go on top: a gold rope ring hangs at each side; each player stands at one (within 60 px) and HOLDS the
   action. The lintel rises only while BOTH hold (5.4 s; it sinks slowly otherwise, but never below the last third:
   props click in). CLONK: the trilithon is complete, the Thief tugs at it in vain and tthPhaseDone() runs.
   GOLD HELP (always announced with tthHelp; it stays for the rest of the era):
   - A MISS at the logs is: the pushed stone stood waiting 3 s for a log (a short "Thud!" is the normal rhythm and
     does not count; neither does the wait for the mud's spare). 2 misses: a gold 5th log joins the rotation.
     4 misses: GOLD ROLLERS: logs under the stone travel at 3/4 of its speed (not 1/2), so each log carries it
     twice as far (about 400 px) and the roller needs half the trips. All logs turn gold.
   - 2 roll-backs on the same hill: gold chocks, the stone can't roll back any more (every hill).
   - 2 runaway thuds: a gold brake (the runaway is slower than the skid speed).
   - 2 yoinks: his claw is slower (1.5 x the telegraph).   - A lost lasso: his next rope is frayed (snaps in 1.3 s).
   - 13 s without the stone moving forward (9 s at the ropes), then every 9 s: gold hints over whoever must act,
     and a gold arrow at the thing to do.
   FAIRNESS. Every hazard is telegraphed 0.6 s or more; nobody is ever hit (all soft fails are team bumps: Rolled
   back, Runaway, Yoink, Towed back); a fail costs a few seconds (a roll back to the chock), never the era.
   CONTROLS. Left / right walk (and push, brake, haul), up jumps, the action grabs / drops / shoos / whacks / pulls.
   Nothing needs two directions at once or fast tapping. Hints name each player's own keys (tthKey).
   Stats (st.stats.henge): legT[], thuds, waited (s the pushed stone stood without a log), rollbacks, skids, yoinks,
   whacks, shoos, lasso [won, lost], carried [pip, bo], done. Every top-level name starts with tthHenge / TTHHENGE
   (Sfx.extra.tthHenge*). State lives in st.ph.
   TUNING (tools/w30/play.js henge): a computer pair takes 2:05-2:15 with no gold help (legs about 26 / 45 / 46 s
   and 9 s for the lintel), a clumsy partner 2:30-3:20, a young kid 3:00-4:10; an idle partner never ends it.
   Tests: tools/w30/henge-keys.js (real keyboard, controller, touch, 1-player), henge-dbg.js (trace), henge-perf.js. */
const TTHHENGE = {
  gy: 440, groundAt: 424,            // the ground line at the start (world y); where the stone's ground sits on screen
  stepUp: 13, snap: 9,
  start: 380,                        // the stone's centre x at the start
  hills: [[760, 1160, 72], [2630, 3090, 90], [3200, 3640, -88]],   // x0, x1, rise in px (negative: downhill)
  chocks: [790, 960, 2660, 2810, 2960],                             // stone-centre x of the wedges on the hills
  posts: [1330, 2470], endX: 3930,                                   // stone-centre x where legs 1, 2 and 3 end
  mud: [{ x: 1560, pile: 1750 }, { x: 3735, pile: 3880 }],
  brook: { x0: 2230, slotW: 30, depth: 12, pile: 2016 },
  signX: 3196,
  stone: { hw: 96, h: 54, lift: 18, pushV: 41, upV: 32, easeV: 52, runPush: 60, acc: 240, stop: 340, brakeA: 170,
    backA: 55, backV: 85, grace: 0.35, runA: 18, runV: 130, goldRunV: 76, skidV: 80, coast: 70, slope: 0.05, backBump: 50 },
  log: { r: 9, n: 4, gold: 5, reach: 40, lock: 1.2, roll: 0.5, goldRoll: 0.75, gap: 40, ahead: 12, far: 220, lo: 4, hi: 16, topDrop: 56, freeT: 0.7 },
  sheep: { v: 80, flee: 330, reach: 64, gap: 24 },
  thief: { s: 0.62, homeX: 800, homeY: 226, aimT: 1.0, reachT: 0.75, lowY: 49, holdY: 98, holdT: 6.5, whackX: 74, whackY: 135 },
  lasso: { windT: 1.4, win: 3.7, goldWin: 2.0, m0: 0.35, tow0: 34, tow1: 8, towMax: 170, towT: 10, reach: 360 },
  fin: { tipT: 1.3, liftT: 5.4, sink: 0.1, ringR: 60, upH: 150, linW: 224, linH: 38, gapX: 150 },
  waitMiss: 3, goldWaits: 2, goldRolls: 4, goldBacks: 2, goldSkids: 2, goldYoinks: 2, stuckT: 13, stuckRopeT: 9,
};
// what happens where (stone-centre x): the Thief's mischief and the sheep
const TTHHENGE_SCRIPT = [
  { at: 880, kind: 'pinch' },
  { at: 1660, kind: 'sheep', to: [1970] },
  { at: 1830, kind: 'lasso' },
  { at: 2060, kind: 'sheep', to: [2398] },
  { at: 2720, kind: 'pinch' },
  { at: 2840, kind: 'sheep', to: [3128, 3166] },
  { at: 3790, kind: 'lasso' },
];
const TTHHENGE_FACTS = ['True: each great stone weighs 25 tons, like 4 elephants!', 'True: these stones travelled 25 km without any wheels!'];
const TTHHENGEC = { stone: '#9aa3ab', stoneLt: '#c3cad0', stoneDk: '#727d87', lichen: '#b9cc6a', wood: '#c98a4a', woodLt: '#e9bd7c', woodDk: '#8a5a2a', grass: '#7cc260', grassLt: '#a2da7c', grassDk: '#58a548',
  earth: '#b08a58', chalk: '#f1ead2', water: '#5fb8e8', waterLt: '#bfe6fa', mud: '#7a5a3a', mudLt: '#96724a', rope: '#e8d29a', ropeDk: '#8a7a4a' };

/* ---------- small helpers ---------- */
const tthHengeCx = p => p.x + p.w / 2;
const tthHengeFeet = p => p.y + p.h;
const tthHengeSm = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const tthHengeShake = s => { if (!reduceMotion) G.shake = Math.max(G.shake, s); };
// the land: flat plain with three smooth hills (world y of the ground line at x)
function tthHengeBase(x) { let y = TTHHENGE.gy; for (const h of TTHHENGE.hills) { if (x <= h[0]) break; y -= h[2] * tthHengeSm((x - h[0]) / (h[1] - h[0])); } return y; }
// the slope under x: + is uphill to the right
const tthHengeSlope = x => (tthHengeBase(x - 30) - tthHengeBase(x + 30)) / 60;
const tthHengeHill = x => TTHHENGE.hills.findIndex(h => x > h[0] - 40 && x < h[1] + 40);
// the ground a player walks on: the stream dips where no log lies in it yet
function tthHengeG(ph, x) {
  const y = tthHengeBase(x), B = ph.brook;
  if (x <= B.x0 || x >= B.x1) return y;
  if (B.slots[clamp(Math.floor((x - B.x0) / B.slotW), 0, 2)]) return y;
  return y + B.depth * Math.min(1, (x - B.x0) / 12, (B.x1 - x) / 12);
}
const tthHengeTop = x => tthHengeBase(x) - TTHHENGE.stone.lift - TTHHENGE.stone.h;   // the top of the lying stone
function tthHengeSurf(ph, x) { const S = ph.stone; return !S.up && x > S.x - S.hw && x < S.x + S.hw ? tthHengeTop(x) : tthHengeG(ph, x); }
const tthHengeSup = (ph, x, w) => Math.min(tthHengeSurf(ph, x + 0.5), tthHengeSurf(ph, x + w / 2), tthHengeSurf(ph, x + w - 0.5));
const tthHengeAtRear = (ph, p) => { const d = ph.stone.x - ph.stone.hw - (p.x + p.w); return p.grounded && !ph.P[p.id].on && d > -8 && d < 5; };
const tthHengeAtFront = (ph, p) => { const d = p.x - (ph.stone.x + ph.stone.hw); return p.grounded && !ph.P[p.id].on && d > -8 && d < 5; };
const tthHengeUnder = (ph, l) => l.s === 'ground' && Math.abs(l.x - ph.stone.x) <= ph.stone.hw + 2;
const tthHengeFree = (ph, l) => l.s === 'ground' && !tthHengeUnder(ph, l);
const tthHengeLive = ph => { let n = 0; for (const l of ph.logs) if (l.s !== 'sunk') n++; return n; };
// how fast a log under the stone travels, as a part of the stone's speed (real rollers: half; gold rollers: 3/4)
const tthHengeRollF = ph => (ph.gold.roll ? TTHHENGE.log.goldRoll : TTHHENGE.log.roll);
const tthHengeGoldLog = (ph, l) => l.gold || ph.gold.roll;
const tthHengeMaxLogs = ph => (ph.gold.log ? TTHHENGE.log.gold : TTHHENGE.log.n);
function tthHengeNewLog(x, o) { return Object.assign({ x, y: 0, s: 'ground', rot: 0, lock: 0, gold: false, t: 0, vy: 0, u: false, pop: 0, age: 0 }, o || {}); }
// the log (or laid stream log) under the stone's front half that lets it roll, or null
function tthHengeFront(ph) {
  const S = ph.stone, L = TTHHENGE.log, lo = S.x + L.lo, hi = S.x + S.hw + L.hi, B = ph.brook;
  let best = null;
  for (const l of ph.logs) if (l.s === 'ground' && l.x >= lo && l.x <= hi && (!best || l.x > best.x)) best = l;
  if (best) return best;
  for (let i = 2; i >= 0; i--) if (B.slots[i] && B.at[i].x >= lo && B.at[i].x <= hi) return B.at[i];
  return null;
}
// where a dropped log lands: just ahead of the nose, or 40 px past a log already lying there
function tthHengeSpot(ph) {
  const S = ph.stone, L = TTHHENGE.log;
  let x = S.x + S.hw + L.ahead;
  for (let n = 0; n < 6; n++) {
    let hit = null;
    for (const l of ph.logs) if (l.s === 'ground' && Math.abs(l.x - x) < L.gap - 0.01 && (!hit || l.x > hit.x)) hit = l;
    if (!hit) break;
    x = hit.x + L.gap;
  }
  return x;
}
// hints over a player, each at most once every `again` s (each player's own keys)
function tthHengeTip(st, id, key, text, again = 6, o = {}) {
  const T0 = st.ph.tipT[id];
  if (T0[key] != null && st.phT - T0[key] < again) return false;
  T0[key] = st.phT;
  tthHint(st, id, text, { life: o.life || 3, gold: !!o.gold, cpu: o.cpu });
  st.ph.hintKey[id] = key;
  return true;
}
function tthHengeDone(st, id, keys) { if (st.hints[id] && keys.includes(st.ph.hintKey[id])) st.hints[id] = null; }
const tthHengeK = (id, what) => tthKey(id, what);

/* ---------- Pip and Bo: walking on the land and on the stone ---------- */
function tthHengeBody(st, p, dt) {
  const ph = st.ph, K = TTHHENGE, P = ph.P[p.id], S = ph.stone;
  tthControl(st, p, dt);
  if (P.hold) p.vx = 0;                                   // hauling on a rope: feet planted
  let feet = p.y + p.h;
  let nx = clamp(p.x + p.vx * dt, Math.max(ph.x0, st.cam.x) + 14, Math.min(ph.x1, st.cam.x + W) - 14 - p.w);
  if (nx !== p.x) {
    if (tthHengeSup(ph, nx, p.w) < feet - K.stepUp) {     // a wall: an end of the stone
      if (nx > p.x && p.x + p.w <= S.x - S.hw + 3) nx = S.x - S.hw - p.w;
      else if (nx < p.x && p.x >= S.x + S.hw - 3) nx = S.x + S.hw;
      else nx = p.x;
      p.vx = 0;
    }
    p.x = nx;
  }
  let sup = tthHengeSup(ph, p.x, p.w);
  if (feet - sup > K.stepUp + 2 && !S.up && p.x + p.w > S.x - S.hw && p.x < S.x + S.hw) {   // caught inside the stone: out at the nearer end
    p.x = p.x + p.w / 2 < S.x ? S.x - S.hw - p.w : S.x + S.hw;
    sup = tthHengeSup(ph, p.x, p.w);
  }
  const was = p.grounded;
  if (feet > sup) { p.y = sup - p.h; feet = sup; }       // the ground rose under the feet (a slope)
  if (p.vy >= 0 && (feet + p.vy * dt >= sup - 0.01 || (was && sup - feet <= K.snap))) { p.y = sup - p.h; p.vy = 0; p.grounded = true; }
  else { p.y += p.vy * dt; p.grounded = false; }
  p.tileGround = p.grounded; p.onPartner = false; p.onOneWay = false;
  if (p.grounded && !was && p.lastVy > 260) { p.sx = 1.25; p.sy = 0.78; puff(p.x + p.w / 2, p.y + p.h, 5, 'rgba(255,255,255,0.75)'); Sfx.play('land'); }
  p.lastVy = p.grounded ? 0 : p.vy;
  const cx = p.x + p.w / 2;
  P.on = p.grounded && !S.up && cx > S.x - S.hw - 9 && cx < S.x + S.hw + 9 && Math.abs(p.y + p.h - tthHengeTop(cx)) < 9;
  P.wet = p.grounded && tthHengeG(ph, cx) > tthHengeBase(cx) + 4;
  if (P.wet && Math.abs(p.vx) > 60 && (G.tickN + p.id * 7) % 14 === 0) { puff(cx, p.y + p.h - 6, 2, 'rgba(191,230,250,0.9)'); if ((G.tickN + p.id * 7) % 42 === 0) Sfx.play('tthHengeSplash'); }
}
function tthHengeStill(st, dt) {
  for (const p of G.players) {
    p.pendingJump = false; p.pendingAct = false;
    const real = p.input; p.input = NO_INPUT;
    try { tthHengeBody(st, p, dt); } finally { p.input = real; }
  }
}
// the stone moved dx: riders ride along, anyone in its way is pushed along
function tthHengeShove(st, dx) {
  const ph = st.ph, S = ph.stone;
  for (const p of G.players) {
    if (ph.P[p.id].on) { p.x += dx; continue; }
    if (p.x + p.w > S.x - S.hw && p.x < S.x + S.hw && p.y + p.h > tthHengeTop(p.x + p.w / 2) + TTHHENGE.stepUp) p.x = p.x + p.w / 2 < S.x ? S.x - S.hw - p.w : S.x + S.hw;
  }
}
// who is hauling on a rope right now (the lasso tug, the lintel ropes): they stand planted
function tthHengeHolds(st) {
  const ph = st.ph, S = ph.stone, tow = !!(ph.lasso && ph.lasso.on), fin = ph.fin.stage === 2, ps = G.players;
  for (const p of ps) {
    const P = ph.P[p.id], cx = tthHengeCx(p), ok = p.grounded && p.stun <= 0 && !P.on;
    P.haul = tow && ok && p.input.right && Math.abs(cx - S.x) < TTHHENGE.lasso.reach;
    P.rope = -1;
    if (fin && ok && p.input.act) for (let i = 0; i < 2; i++) if (Math.abs(cx - ph.rings[i].x) < TTHHENGE.fin.ringR) P.rope = i;
    P.hold = (P.haul && cx > S.x + S.hw) || P.rope >= 0;
  }
  if (fin && ph.P[0].rope >= 0 && ph.P[0].rope === ph.P[1].rope) {   // one rope each: the later one lets go
    const late = ph.P[0].ropeT <= ph.P[1].ropeT ? 0 : 1;
    ph.P[late].rope = -1; ph.P[late].hold = false;
    tthHengeTip(st, late, 'oneEach', 'One rope each! Take the other gold ring.', 5, { cpu: null });
  }
  for (const p of ps) { const P = ph.P[p.id]; P.ropeT = P.rope >= 0 ? P.ropeT + DT : 0; }
}

/* ---------- the action button: shoo, whack, grab, drop ---------- */
function tthHengeShoo(st, p) {
  const ph = st.ph, cx = tthHengeCx(p);
  let n = 0;
  for (const s of ph.sheep) if (s.s !== 'flee' && Math.abs(s.x - cx) < TTHHENGE.sheep.reach && Math.abs(tthHengeG(ph, s.x) - tthHengeFeet(p)) < 90) { s.s = 'flee'; s.t = 0; s.face = 1; n++; }
  if (!n) return false;
  tthStats(st).shoos += n;
  tthPop(st, cx, p.y - 20, 'Shoo!', PCOL[p.id], 20); Sfx.play('tthHengeBaa'); p.sx = 1.25; p.sy = 0.8;
  tthHengeDone(st, 0, ['sheep']); tthHengeDone(st, 1, ['sheep']);
  return true;
}
function tthHengeWhack(st, p) {
  const ph = st.ph, th = ph.th, c = st.thief, K = TTHHENGE.thief;
  if (!(th.mode === 'hold' || (th.mode === 'pinch' && (th.sub === 'reach' || th.sub === 'aim')))) return false;
  const q = tthThiefPts(c).claw, dx = q.x - tthHengeCx(p), dy = tthHengeFeet(p) - q.y;
  if (Math.abs(dx) > K.whackX || dy < -14 || dy > K.whackY) return false;
  tthStats(st).whacks++;
  tthPop(st, q.x, q.y - 16, 'Whack!', PCOL[p.id], 22); Sfx.play('tthHengeWhack'); burst(q.x, q.y, '#ffe9a8', 10); tthHengeShake(0.12);
  p.sx = 0.8; p.sy = 1.25; c.hitT = 0.5;
  if (th.mode === 'hold' && th.log) { tthHengeLetFall(st, th.log, q.x, q.y); tthReact(st, 'shocked', 'Hey! That was MY log!', 1.8); }
  else tthReact(st, 'shocked', 'Hey! Hands off my claw!', 1.8);
  th.log = null; th.mode = 'dizzy'; th.sub = ''; th.t = 0;
  tthHengeDone(st, 0, ['claw']); tthHengeDone(st, 1, ['claw']);
  return true;
}
// a log falls from the claw (or from gold help) to the ground at x
function tthHengeLetFall(st, l, x, y) {
  const ph = st.ph, S = ph.stone;
  x = clamp(x, st.cam.x + 70, st.cam.x + W - 70);
  if (Math.abs(x - S.x) < S.hw + 14) x = S.x - S.hw - 26;
  l.s = 'fall'; l.x = x; l.y = y; l.vy = -120; l.u = false;
}
// fresh logs at a checkpoint (a rest post, the finished log road): the rotation is 4 again, whatever the mud, the
// stream or butterfingers did to it
function tthHengeTopUp(st) {
  const ph = st.ph, S = ph.stone;
  let k = 0;
  for (let n = tthHengeMaxLogs(ph) - tthHengeLive(ph); n > 0; n--, k++) { const l = tthHengeNewLog(0); ph.logs.push(l); tthHengeLetFall(st, l, S.x - S.hw - 46 - k * 34, tthHengeTop(S.x) - 110 - k * 36); }
  if (k) tthPop(st, S.x - S.hw - 60, tthHengeTop(S.x) - 54, 'Fresh logs!', '#ffffff', 18);
}
function tthHengeGrab(st, p) {
  const ph = st.ph, P = ph.P[p.id], L = TTHHENGE.log, cx = tthHengeCx(p), feet = tthHengeFeet(p);
  let best = null;
  for (const l of ph.logs) if (tthHengeFree(ph, l) && l.lock <= 0 && Math.abs(l.x - cx) < L.reach && Math.abs(tthHengeG(ph, l.x) - feet) < 34 && (!best || Math.abs(l.x - cx) < Math.abs(best.x - cx))) best = l;
  if (!best) {
    // a pile of spare logs: one more for the rotation (after the mud ate one) or for the stream
    const pile = ph.piles.find(q => Math.abs(q.x - cx) < 46 && Math.abs(tthHengeBase(q.x) - feet) < 34);
    if (pile) {
      const room = tthHengeLive(ph) < tthHengeMaxLogs(ph) + (pile.bridge && !ph.brook.done ? 1 : 0);
      if (!room) { tthHengeTip(st, p.id, 'enough', 'Enough logs! Use the ones that roll out behind the stone.', 5, { cpu: null }); Sfx.play('tthHengeNope'); return; }
      best = tthHengeNewLog(pile.x); ph.logs.push(best); pile.took++;
    }
  }
  if (!best) {
    if (P.on) tthHengeTip(st, p.id, 'down', 'Hop down! The logs lie on the ground behind the stone.', 6, { cpu: null });
    Sfx.play('tthHengeNope');
    return;
  }
  best.s = 'carry'; best.by = p.id; best.u = false; P.log = best; P.carryT = 0;
  if (ph.th.log === best && ph.th.mode === 'pinch') tthPop(st, cx, p.y - 34, 'Saved it!', C.gold, 18);
  Sfx.play('tthHengeGrab', p.id); p.sx = 1.2; p.sy = 0.82;
  tthHengeDone(st, p.id, ['grab', 'log', 'spare', 'popped', 'start', 'job']);
}
function tthHengeDrop(st, p) {
  const ph = st.ph, P = ph.P[p.id], S = ph.stone, L = TTHHENGE.log, B = ph.brook, cx = tthHengeCx(p), l = P.log, front = S.x + S.hw;
  const land = x => { l.s = 'fall'; l.x = x; l.y = p.y - 12; l.vy = -80; l.lock = L.lock; l.by = -1; P.log = null; tthStats(st).carried[p.id]++; Sfx.play('tthHengeDrop', p.id); tthHengeDone(st, p.id, ['carry', 'front', 'bridge', 'gold']); };
  // into the stream: the next free place of the log road
  const onFront = P.on && cx > front - L.topDrop, inFront = !P.on && cx > front - 8 && cx < front + L.far;
  if (!B.done && ((cx > B.x0 - 44 && cx < B.x1 + 44) || ((onFront || inFront) && tthHengeSpot(ph) > B.x0 - 14))) {
    const i = B.slots.indexOf(false);
    B.slots[i] = true; B.n++; B.dropT[i] = 0;
    ph.logs.splice(ph.logs.indexOf(l), 1); P.log = null; tthStats(st).carried[p.id]++;
    Sfx.play('tthHengeSplash'); puff(B.at[i].x, tthHengeBase(B.at[i].x) + 4, 8, 'rgba(191,230,250,0.95)');
    tthPop(st, B.at[i].x, tthHengeBase(B.x0) - 46, B.n + ' / 3', '#ffffff', 20);
    if (B.n >= 3) { B.done = true; tthHengeTopUp(st); tthNews(st, 'The log road is ready. Roll the stone across!', false, 3); Sfx.play('tthDing'); tthHengeDone(st, 0, ['stream', 'bridge', 'bank']); tthHengeDone(st, 1, ['stream', 'bridge', 'bank']); }
    return;
  }
  if (onFront || inFront) { land(tthHengeSpot(ph)); return; }
  tthHengeTip(st, p.id, 'front', cx > front ? 'Too far! Drop it close to the front of the stone.' : 'Carry it over the stone and drop it in FRONT!', 4, { cpu: null });
  Sfx.play('tthHengeNope');
}
function tthHengeAct(st, p) {
  const ph = st.ph, P = ph.P[p.id];
  p.pendingAct = false;
  if (p.stun > 0 || ph.fin.stage > 0) return;
  if (tthHengeShoo(st, p) || tthHengeWhack(st, p)) return;
  if (p.id === ph.pusher) {
    const cx = tthHengeCx(p);
    if (ph.logs.some(l => tthHengeFree(ph, l) && Math.abs(l.x - cx) < TTHHENGE.log.reach + 10)) tthHengeTip(st, p.id, 'notMine', 'Logs are ' + NAMES[1 - p.id] + '\'s job this time. You push!', 6, { cpu: null });
    return;
  }
  if (P.log) tthHengeDrop(st, p); else tthHengeGrab(st, p);
}

/* ---------- the stone ---------- */
// how far the stone may roll right now, and what stops it there
function tthHengeLimit(ph) {
  const S = ph.stone, K = TTHHENGE, B = ph.brook, lim = ph.lim;
  lim.x = ph.leg < 2 ? K.posts[ph.leg] : K.endX; lim.why = ph.leg < 2 ? 'post' : 'hole';
  if (!B.done && S.x < B.x0) { const x = B.x0 - S.hw - 8; if (x < lim.x) { lim.x = x; lim.why = 'stream'; } }
  for (const s of ph.sheep) if (s.s !== 'flee' && s.x > S.x) { const x = s.x - K.sheep.gap - S.hw; if (x < lim.x) { lim.x = x; lim.why = 'sheep'; lim.sheep = s; } }
  return lim;
}
// the lasso tug of war: -> the stone's speed
function tthHengeTug(st, dt) {
  const ph = st.ph, Z = ph.lasso, K = TTHHENGE.lasso, S = ph.stone, n = (ph.P[0].haul ? 1 : 0) + (ph.P[1].haul ? 1 : 0);
  Z.t += dt; Z.n = n;
  if (n === 2) {
    Z.m += dt / (ph.gold.rope ? K.goldWin : K.win);
    if ((Z.heaveT -= dt) <= 0) { Z.heaveT = 0.55; Sfx.play('tthHengeHeave'); tthHengeShake(0.08); for (const p of G.players) rumble(p.id, 0.3, 0.3, 120); }
  } else Z.m = Math.max(0, Z.m - dt * (n ? 0.04 : 0.12));
  if (Z.m >= 1) { tthHengeLassoEnd(st, true); return 0; }
  if (Z.x0 - S.x >= K.towMax || Z.t >= K.towT) { tthHengeLassoEnd(st, false); return 0; }
  return n === 2 ? 0 : n === 1 ? -K.tow1 : -K.tow0;
}
function tthHengeLassoEnd(st, won) {
  const ph = st.ph, S = ph.stone, th = ph.th, s = tthStats(st), c = st.thief;
  ph.lasso = null; th.mode = 'lasso'; th.sub = won ? 'snap' : 'slip'; th.t = 0;
  for (const k of [0, 1]) tthHengeDone(st, k, ['lasso', 'haul']);
  if (won) {
    s.lasso[0]++;
    tthPop(st, S.x - S.hw - 60, tthHengeTop(S.x) - 40, 'SNAP!', C.gold, 30); Sfx.play('tthHengeSnap'); tthHengeShake(0.3);
    burst(S.x - S.hw - 40, tthHengeTop(S.x) - 10, TTHHENGEC.rope, 14); for (let k = 0; k < 10; k++) confetti(S.x - 60 + k * 14, tthHengeTop(S.x) - 20);
    for (const p of G.players) rumble(p.id, 0.7, 0.5, 220);
    tthReact(st, 'shocked', 'Whoa-oa-oa! My rope!', 2); c.hitT = 0.6; tthCelebrate(st, 1.1);
  } else {
    s.lasso[1]++;
    tthBump(st, { word: 'Towed back!', x: S.x, y: tthHengeTop(S.x) - 30, kind: 'tow' });
    tthReact(st, 'happy', 'Ha! Slippery, isn\'t it?', 2);
    if (!ph.gold.rope) { ph.gold.rope = true; tthHelp(st, 'Gold help: his next rope is frayed. It will snap sooner!'); }
  }
}
function tthHengeStone(st, dt) {
  const ph = st.ph, S = ph.stone, K = TTHHENGE.stone, ps = G.players, pu = ps[ph.pusher], s = tthStats(st);
  if (S.up || ph.fin.stage > 0) { S.v = 0; S.push = S.brake = false; return; }
  const slope = tthHengeSlope(S.x), up = slope > K.slope, down = slope < -K.slope;
  S.grade = up ? 1 : down ? -1 : 0; S.hill = tthHengeHill(S.x);
  const push = pu.input.right && pu.stun <= 0 && tthHengeAtRear(ph, pu), brake = pu.input.left && pu.stun <= 0 && tthHengeAtFront(ph, pu);
  S.push = push; S.brake = brake;
  S.pushT = push || brake ? 0 : S.pushT + dt;
  const lim = tthHengeLimit(ph), sup = tthHengeFront(ph), tow = !!(ph.lasso && ph.lasso.on);
  S.sup = sup;
  S.left = sup ? (sup.x - S.x - TTHHENGE.log.lo) / (sup.s === 'bridge' ? 1 : 1 - tthHengeRollF(ph)) : 0;
  S.block = S.x >= lim.x - 0.01 ? lim.why : !sup ? 'log' : '';
  let tv = 0, acc = K.stop;
  if (tow) { tv = tthHengeTug(st, dt); acc = 150; S.run = false; if (!ph.lasso) tv = 0; }
  else if (down) {
    const g = ph.gold.brake;
    if (brake) { tv = K.easeV; acc = S.v > tv ? K.brakeA : K.acc * 0.4; S.run = false; }
    else {
      if (push) S.run = true;                 // shoved over the edge: nobody can hold it back from behind
      else if (S.v <= 3) S.run = false;       // stopped (a thud, a sheep): it waits to be eased or shoved again
      if (S.run) { tv = g ? K.goldRunV : K.runV; acc = g ? K.runA * 0.5 : K.runA; }
    }
  } else if (up) {
    S.run = false;
    if (push) { tv = K.upV; acc = K.acc; }
    else if (S.pushT > K.grace && !ph.gold.chock && !tthCalm(st)) { tv = -K.backV; acc = K.backA; }
  } else if (push) { tv = K.pushV; acc = K.acc; S.run = false; }
  else if (S.run) { acc = K.coast; if (S.v < 2) S.run = false; }
  // forward needs a log under the front half and a clear way
  if ((tv > 0 || S.v > 0) && S.block && !tow) {
    if (S.block === 'log' && S.v > 6) {
      s.thuds++;
      Sfx.play('tthHengeThud'); tthHengeShake(S.v > K.skidV ? 0.3 : 0.14); puff(S.x + S.hw - 8, tthHengeBase(S.x + S.hw), 8, 'rgba(240,234,210,0.9)');
      if (S.v > K.skidV) {
        s.skids++; ph.miss.skid++;
        tthBump(st, { word: 'Runaway! Thud!', x: S.x + 40, y: tthHengeTop(S.x) - 30, kind: 'skid' });
        if (ph.miss.skid >= TTHHENGE.goldSkids && !ph.gold.brake) { ph.gold.brake = true; tthHelp(st, 'Gold help: a gold brake! Slower downhill now.'); }
      } else tthPop(st, S.x + S.hw - 10, tthHengeTop(S.x) - 26, 'Thud!', '#ffffff', 22);
    }
    if (S.block === 'sheep' && S.v > 6 && lim.sheep) {
      if (S.v > 70) { lim.sheep.s = 'flee'; lim.sheep.t = 0; lim.sheep.face = 1; Sfx.play('tthHengeBaa'); tthPop(st, lim.sheep.x, tthHengeBase(lim.sheep.x) - 50, 'Baa!!', '#ffffff', 20); }
      else { tthPop(st, lim.sheep.x, tthHengeBase(lim.sheep.x) - 50, 'Baa!', '#ffffff', 20); Sfx.play('tthHengeBaa'); }
    }
    if (S.v > 0) S.v = 0;
    tv = Math.min(tv, 0); S.run = false;
  }
  // a MISS at the logs: the pushed stone stands waiting for a log for 3 s (not while the mud's spare is fetched)
  if (S.block === 'log' && (push || brake) && !tow && !tthCalm(st)) {
    if (S.waitT <= 0) S.waitFree = st.phT - ph.glubT < 3;
    S.waitT += dt; ph.waited += dt; s.waited = Math.round(ph.waited);
    if (S.waitT >= TTHHENGE.waitMiss && !S.waitHit && !S.waitFree) {
      S.waitHit = true; ph.miss.wait++;
      if (ph.miss.wait >= TTHHENGE.goldWaits && !ph.gold.log) {
        ph.gold.log = true; tthHelp(st, 'Gold help: a gold log joins in. Now you have 5!');
        const gl = tthHengeNewLog(0, { gold: true }); ph.logs.push(gl); tthHengeLetFall(st, gl, S.x - S.hw - 50, tthHengeTop(S.x) - 120);
      } else if (ph.miss.wait >= TTHHENGE.goldRolls && !ph.gold.roll) {
        ph.gold.roll = true; tthHelp(st, 'Gold help: gold rollers! Each log rolls twice as far.');
        for (const l of ph.logs) if (l.s === 'ground') burst(l.x, tthHengeG(ph, l.x) - TTHHENGE.log.r, C.gold, 5);
      }
    }
  } else if (S.block !== 'log') { S.waitT = 0; S.waitHit = false; }
  S.v = approach(S.v, tv, acc * dt);
  S.dip = approach(S.dip, sup ? 0 : 1, dt * 6);
  let dx = S.v * dt;
  if (dx > 0 && S.x + dx > lim.x) dx = Math.max(0, lim.x - S.x);
  if (dx < 0 && S.x + dx <= ph.backStop) {
    dx = Math.min(0, ph.backStop - S.x);
    if (S.v < -20) { Sfx.play('tthHengeChock'); tthHengeShake(0.14); puff(S.x - S.hw, tthHengeBase(S.x - S.hw), 6, 'rgba(240,234,210,0.9)'); }
    S.v = 0;
  }
  if (dx) {
    S.x += dx;
    const r = TTHHENGE.log.r, f = tthHengeRollF(ph);
    for (const l of ph.logs) {
      if (l.s !== 'ground') continue;
      if (l.u) { l.x += dx * f; l.rot += dx * f / r; }
      const u = Math.abs(l.x - S.x) <= S.hw + 2;
      if (l.u && !u) {                                       // it rolled out from under the stone
        l.pop = 0.35; l.age = 0; Sfx.play('tthHengePop');
        if (l.x < S.x) { puff(l.x, tthHengeBase(l.x) - 4, 3, 'rgba(240,234,210,0.9)'); ph.pops++; }
      }
      l.u = u;
    }
    tthHengeShove(st, dx);
    if (dx > 0) {
      S.backD = 0; S.backBumped = false;
      if (S.x > S.best) { S.best = S.x; ph.progT = 0; }
      if ((S.rumT -= dx) <= 0) { S.rumT = 22; Sfx.play('tthHengeRoll'); if (S.v > 90) tthHengeShake(0.05); }
    } else if (!tow) {
      S.backD -= dx;
      if ((S.rumT += dx) <= 0) { S.rumT = 16; Sfx.play('tthHengeCreak'); }
      if (S.backD >= K.backBump && !S.backBumped) {
        S.backBumped = true; s.rollbacks++;
        const h = S.hill; ph.miss.back[h] = (ph.miss.back[h] || 0) + 1;
        tthBump(st, { word: 'Rolled back!', x: S.x, y: tthHengeTop(S.x) - 30, kind: 'rollback' });
        if (ph.miss.back[h] >= TTHHENGE.goldBacks && !ph.gold.chock) { ph.gold.chock = true; tthHelp(st, 'Gold help: gold chocks! The stone can\'t roll back.'); }
      }
    }
  }
  // chocks flip up behind the stone as it passes
  for (const c of ph.chocks) if (!c.up && S.x >= c.x + 6) { c.up = true; c.t = 0; ph.backStop = Math.max(ph.backStop, c.x); Sfx.play('tthHengeChock'); tthPop(st, c.x - S.hw - 10, tthHengeBase(c.x - S.hw) - 30, 'Chock!', '#ffffff', 15); }
  // every log trapped under the back half and none anywhere else: the rearmost one squeezes out
  if (!sup && !tow && !ph.logs.some(l => l.s === 'carry' || l.s === 'fall' || l.s === 'claw' || tthHengeFree(ph, l))) {
    if ((S.freeT += dt) > TTHHENGE.log.freeT) {
      let rear = null;
      for (const l of ph.logs) if (l.s === 'ground' && (!rear || l.x < rear.x)) rear = l;
      if (rear) { rear.x = S.x - S.hw - 16; rear.u = false; rear.pop = 0.35; rear.age = 0; ph.pops++; Sfx.play('tthHengePop'); puff(rear.x, tthHengeBase(rear.x) - 4, 4, 'rgba(240,234,210,0.9)'); }
      S.freeT = 0;
    }
  } else S.freeT = 0;
  // the end of a leg
  if (!tow && S.x >= lim.x - 0.01) { if (lim.why === 'post') tthHengeRest(st); else if (lim.why === 'hole') tthHengeTipIn(st); }
}
// a rest post: checkpoint, a breather, jobs swap
function tthHengeRest(st) {
  const ph = st.ph, S = ph.stone, s = tthStats(st), ps = G.players;
  s.legT.push(Math.round((st.phT - ph.legT0) * 10) / 10); ph.legT0 = st.phT;
  ph.leg++; ph.backStop = S.x; S.v = 0; S.run = false; ph.progT = 0;
  for (const p of ps) { const P = ph.P[p.id]; if (P.log) { tthHengeLetFall(st, P.log, tthHengeCx(p), p.y - 12); P.log.by = -1; P.log = null; } }
  tthHengeTopUp(st);
  ph.pusher = 1 - ph.pusher;
  tthCelebrate(st, 1.8); tthSwap(st); Sfx.play('tthHengeFlag');
  const px = S.x + S.hw + 14;
  for (let k = 0; k < 14; k++) confetti(px - 40 + k * 6, tthHengeBase(px) - 90);
  tthNews(st, TTHHENGE_FACTS[ph.leg - 1], false, 6);
  ph.jobT = 1.6; ph.tipT = [{}, {}];
  tthReact(st, 'shocked', ph.leg === 1 ? 'Up the hill already?! Mud and sheep next!' : 'Bah! The big hill will stop you!', 2.4);
}
function tthHengeJobHints(st) {
  const ph = st.ph, pu = ph.pusher, ro = 1 - pu;
  tthHengeTip(st, pu, 'job', 'Your job: PUSH! Hold ' + tthHengeK(pu, 'right') + ' against the back of the stone.', 0, { life: 4.5, cpu: 'I push the stone!' });
  tthHengeTip(st, ro, 'job', 'Your job: LOGS! ' + tthHengeK(ro, 'act') + ' grabs the log that rolls out the back.', 0, { life: 4.5, cpu: 'I fetch the logs!' });
}

/* ---------- logs, mud, sheep ---------- */
function tthHengeLogs(st, dt) {
  const ph = st.ph, r = TTHHENGE.log.r, S = ph.stone;
  for (const l of ph.logs) {
    if (l.lock > 0) l.lock -= dt;
    if (l.pop > 0) l.pop -= dt;
    l.age += dt;
    if (l.s === 'fall') {
      l.vy += 1900 * dt; l.y += l.vy * dt; l.rot += dt * 6;
      const g = tthHengeG(ph, l.x) - r;
      if (l.y >= g) { l.s = 'ground'; l.y = g; l.age = 0; l.u = Math.abs(l.x - S.x) <= S.hw + 2; puff(l.x, g + r, 4, 'rgba(240,234,210,0.9)'); Sfx.play('tthHengeLand'); }
    } else if (l.s === 'ground') {
      if (l.x < st.cam.x + 36) l.x = st.cam.x + 36;       // never left behind off the screen
      for (const m of ph.mud) if (!m.fed && Math.abs(l.x - m.x) < 20) {
        m.fed = true; m.t = 0; ph.glubT = st.phT; l.s = 'sunk'; l.x = m.x; l.t = 0; l.u = false;
        Sfx.play('tthHengeGlub'); tthPop(st, m.x, tthHengeBase(m.x) - 40, 'Glub!', '#e9c9a0', 24); burst(m.x, tthHengeBase(m.x), TTHHENGEC.mudLt, 8);
        const ro = 1 - ph.pusher;
        tthHengeTip(st, ro, 'spare', 'The mud ate a log! Grab a spare from the pile: ' + tthHengeK(ro, 'act'), 0, { life: 4.5, cpu: 'I\'ll get a spare log!' });
        if (!ph.mudSaid) { ph.mudSaid = true; tthReact(st, 'happy', 'Glub glub! Bye bye, log!', 2); }
      }
    } else if (l.s === 'sunk') l.t += dt;
  }
  for (const m of ph.mud) m.t += dt;
}
function tthHengeSheep(st, dt) {
  const ph = st.ph, K = TTHHENGE.sheep, S = ph.stone;
  let gone = false;
  for (const s of ph.sheep) {
    s.t += dt;
    if (s.s === 'walk') {
      s.x -= K.v * dt;
      if (s.x <= s.to || s.x - (S.x + S.hw) < 34) { s.s = 'graze'; s.t = 0; }
    } else if (s.s === 'flee') {
      s.x += K.flee * dt;
      if ((G.tickN % 10) === 0) puff(s.x - 14, tthHengeBase(s.x), 1, 'rgba(240,234,210,0.8)');
      if (s.x > st.cam.x + W + 90) gone = true, s.gone = true;
    } else if (s.t > 2.5 && (s.baaT -= dt) <= 0) { s.baaT = 4 + tthRand() * 3; if (S.block === 'sheep') { Sfx.play('tthHengeBaa'); tthPop(st, s.x, tthHengeBase(s.x) - 50, 'Baa!', '#ffffff', 16); } }
  }
  if (gone) ph.sheep = ph.sheep.filter(s => !s.gone);
}
function tthHengeScript(st) {
  const ph = st.ph, S = ph.stone, th = ph.th;
  if (tthCalm(st) || ph.fin.stage > 0) return;
  for (const e of ph.script) {
    if (e.done || S.x < e.at) continue;
    if (e.kind === 'sheep') {
      e.done = true;
      e.to.forEach((to, k) => ph.sheep.push({ x: st.cam.x + W + 50 + k * 46, to: Math.max(to, S.x + S.hw + 170 + k * 38), s: 'walk', t: 0, face: -1, baaT: 1, gone: false, k: ph.sheepN++ }));
      Sfx.play('tthHengeBaa');
      if (!ph.sheepSaid) { ph.sheepSaid = true; tthSay(st, 'Look! Sheep on the track! Baa-ha-ha!', 2.4); }
      continue;
    }
    if (th.mode !== 'hover' || ph.lasso) break;
    if (e.kind === 'pinch') { e.done = true; th.mode = 'pinch'; th.sub = 'seek'; th.t = 0; th.log = null; }
    else if (e.kind === 'lasso' && S.grade === 0 && S.x - ph.backStop > 30) {
      e.done = true; th.mode = 'lasso'; th.sub = 'wind'; th.t = 0;
      ph.lasso = { on: false, m: TTHHENGE.lasso.m0, t: 0, x0: S.x, n: 0, fly: 0, heaveT: 0 };
      tthSay(st, 'Lasso time! Yee-haw!', 2.2); Sfx.play('tthHengeWhirl');
      for (const k of [0, 1]) { tthWarn(st, k, TTHHENGE.lasso.windT); tthHengeTip(st, k, 'lasso', 'Lasso! Hold ' + tthHengeK(k, 'right') + ' to haul away from him!', 0, { life: 4, cpu: 'Haul with me!' }); }
    }
    break;
  }
}

/* ---------- the Time Thief ---------- */
function tthHengePinchPick(ph) {
  const S = ph.stone;
  let best = null;
  for (const l of ph.logs) if (tthHengeFree(ph, l) && l.x < S.x - S.hw && l.age > 0.3 && (!best || l.x > best.x)) best = l;
  return best;
}
function tthHengeThief(st, dt) {
  const ph = st.ph, c = st.thief, th = ph.th, S = ph.stone, K = TTHHENGE.thief, cam = st.cam;
  th.t += dt;
  const gyS = tthHengeBase(S.x), go = (mode, sub) => { th.mode = mode; th.sub = sub || ''; th.t = 0; };
  let tx = cam.x + K.homeX, ty = cam.y + K.homeY + Math.sin(c.t * 1.1) * 8, k = 2.4, claw = 0.25, pose = 'idle', face = -1, flame = 1;
  switch (th.mode) {
    case 'intro':   // the opening gag: he tugs at the stone with his claw: far too heavy
      tx = S.x + 30; ty = gyS - 112 - Math.abs(Math.sin(th.t * 9)) * 5; claw = 1; pose = 'grab'; flame = 1.5; k = 7;
      if (th.t > 1.7) { go('hover'); tthReact(st, 'shocked', '25 tons?! My claw can\'t lift that!', 2.4); }
      break;
    case 'hover':
      if (st.celebT > 0) pose = 'sulk';
      else if (th.t % 14 > 12.6) pose = 'laugh';
      if (th.t > 9 && (th.sayT -= dt) <= 0 && !tthCalm(st) && !st.say) {
        th.sayT = 16 + tthRand() * 8;
        tthSay(st, ['No wheels in 2500 BC! Too bad!', 'Push harder! Hee hee!', 'That stone is as heavy as 4 elephants!', 'It\'s 25 km to the circle. Give up?'][th.sayN++ % 4], 2.4);
      }
      break;
    case 'pinch': {
      const slow = ph.gold.claw ? 1.5 : 1;
      if (th.sub === 'seek') {      // he waits for a log to lie free behind the stone
        pose = 'point';
        const pick = st.idle ? null : tthHengePinchPick(ph);
        if (pick) {
          th.log = pick; go('pinch', 'aim'); Sfx.play('tthHengeSwoop');
          if (!ph.pinchSaid) { ph.pinchSaid = true; tthSay(st, 'Ooh, a log! Yoink time!', 2); } else tthSay(st, 'I\'ll take THAT one!', 1.8);
          for (const id of [0, 1]) {
            tthWarn(st, id, (K.aimT + K.reachT) * slow);
            const mine = id !== ph.pusher;
            tthHengeTip(st, id, 'claw', mine ? 'He wants that log! Grab it or whack his claw: ' + tthHengeK(id, 'act') : 'He wants a log! Whack his claw: ' + tthHengeK(id, 'act'), 0, { life: 3.4, cpu: mine ? 'My log!' : 'Shoo, claw!' });
          }
        } else if (th.t > 7) go('hover');
        break;
      }
      const L = th.log;
      if (!L || !tthHengeFree(ph, L)) {   // the roller got there first (or it rolled back under the stone)
        th.log = null; go('miss'); tthReact(st, 'shocked', 'Hey! Where did it go?', 1.6); Sfx.play('tthHengeNope');
        break;
      }
      const gl = tthHengeG(ph, L.x), hi = gl - 150, lo = gl - K.lowY;
      face = L.x < S.x ? 1 : -1; tx = L.x - 10 * face; pose = 'grab'; k = 5;
      if (th.sub === 'aim') { ty = hi; claw = 0.6; if (th.t > K.aimT * slow) go('pinch', 'reach'); }
      else {
        ty = hi + (lo - hi) * tthHengeSm(th.t / (K.reachT * slow)); claw = 1; k = 12;
        if (th.t >= K.reachT * slow) {
          L.s = 'claw'; L.u = false; go('hold'); th.log = L;
          tthStats(st).yoinks++; ph.miss.yoink++;
          tthBump(st, { word: 'Yoink!', x: L.x, y: gl - 70, kind: 'yoink' }); Sfx.play('tthHengeYoink');
          tthReact(st, 'happy', 'Yoink! Finders keepers!', 2);
          if (ph.miss.yoink >= TTHHENGE.goldYoinks && !ph.gold.claw) { ph.gold.claw = true; tthHelp(st, 'Gold help: his claw is slower now. Whack it in time!'); }
          for (const id of [0, 1]) tthHengeTip(st, id, 'claw', 'He has a log! Get under him and whack: ' + tthHengeK(id, 'act'), 0, { life: 4, cpu: 'Give it back!' });
        }
      }
      break; }
    case 'hold': {   // he dangles the log low behind the stone: whack the claw, or he fumbles it by himself
      tx = clamp(S.x - S.hw - 130 + Math.sin(th.t * 1.2) * 50, cam.x + 90, cam.x + W - 90); ty = tthHengeBase(tx) - K.holdY + Math.sin(c.t * 2) * 5;
      claw = 0.6; pose = th.t < 1.4 ? 'laugh' : 'idle'; face = 1; k = 3;
      if (th.t > K.holdT || !th.log) {
        if (th.log) { const q = tthThiefPts(c).claw; tthHengeLetFall(st, th.log, q.x, q.y); tthReact(st, 'shocked', 'Oops! Butterfingers!', 1.8); }
        th.log = null; go('miss');
      }
      break; }
    case 'dizzy': pose = 'dizzy'; ty -= 16; if (th.t > 1.6) go('hover'); break;
    case 'miss': pose = 'shock'; if (th.t > 1.1) go('hover'); break;
    case 'lasso': {
      const Z = ph.lasso, bx = Math.max(S.x - 350, cam.x + 66);
      if (th.sub === 'wind') { tx = bx; ty = gyS - 176; pose = 'wave'; face = 1; k = 3.6; if (th.t > TTHHENGE.lasso.windT) { go('lasso', 'throw'); Sfx.play('tthHengeSwoop'); } }
      else if (th.sub === 'throw') {
        tx = bx; ty = gyS - 176; pose = 'point'; face = 1;
        if (Z) Z.fly = Math.min(1, th.t / 0.35);
        if (th.t >= 0.35 && Z) { Z.on = true; Z.x0 = S.x; Z.t = 0; go('lasso', 'tow'); Sfx.play('tthHengeTaut'); tthHengeShake(0.2); }
      } else if (th.sub === 'tow') { tx = bx - 8 + Math.sin(th.t * 22) * 4; ty = gyS - 150 + Math.sin(th.t * 9) * 3; face = -1; flame = 1.6; pose = 'grab'; k = 6; }
      else if (th.sub === 'snap') {   // the rope snapped: he shoots off backward, spinning, then drifts home
        pose = 'dizzy'; face = -1; flame = 0.4;
        if (th.t < 0.9) { tx = cam.x - 30; ty = gyS - 300; k = 3; } else k = 1.6;
        if (th.t > 2.2) go('hover');
      } else { pose = 'laugh'; face = 1; tx = bx; ty = gyS - 190; if (th.t > 1.5) go('hover'); }
      break; }
    case 'taunt':   // the lintel is going up: he watches from above, getting nervous
      tx = ph.XH + 75 + Math.sin(th.t * 0.9) * 150; ty = tthHengeBase(ph.XH) - 236 + Math.sin(c.t * 1.3) * 8; face = tx > c.x ? 1 : -1; pose = ph.fin.lift > 0.66 ? 'shock' : 'idle';
      break;
    case 'strain':  // he grabs the finished trilithon and pulls: far too heavy
      tx = ph.XH + 85; ty = tthHengeBase(ph.XH) - TTHHENGE.fin.upH - TTHHENGE.fin.linH - 40 - Math.abs(Math.sin(th.t * 10)) * 5; claw = 1; pose = 'grab'; flame = 1.6; k = 7; face = -1;
      break;
  }
  if (st.cut) return;
  c.x += (tx - c.x) * Math.min(1, dt * k); c.y += (ty - c.y) * Math.min(1, dt * k);
  c.pose = pose; c.face = face; c.flame = flame; c.claw = approach(c.claw, claw, dt * 3);
  c.look = { x: S.x, y: gyS - 60 };
}

/* ---------- the winning beat: the stone tips into its hole, then the lintel goes up ---------- */
function tthHengeTipIn(st) {
  const ph = st.ph, F = ph.fin, S = ph.stone, s = tthStats(st);
  if (F.stage) return;
  F.stage = 1; F.t = 0; S.v = 0; S.run = false;
  s.legT.push(Math.round((st.phT - ph.legT0) * 10) / 10); ph.leg = 3; ph.progT = 0;
  for (const p of G.players) { const P = ph.P[p.id]; if (P.log) { tthHengeLetFall(st, P.log, tthHengeCx(p), p.y - 12); P.log.by = -1; P.log = null; } }
  for (const sh of ph.sheep) if (sh.s !== 'flee') { sh.s = 'flee'; sh.t = 0; sh.face = 1; }
  tthNews(st, 'The stone is home! In it goes...', false, 2.4); Sfx.play('tthHengeCreak');
  ph.th.mode = 'taunt'; ph.th.t = 0;
  tthSay(st, 'No no no! Not in the hole!', 2);
}
function tthHengeFinale(st, dt) {
  const ph = st.ph, F = ph.fin, K = TTHHENGE.fin, S = ph.stone;
  if (!F.stage) return;
  F.t += dt;
  const gy = tthHengeBase(ph.XH);
  if (F.stage === 1) {
    S.tip = tthHengeSm(F.t / K.tipT);
    if (!S.up && F.t >= K.tipT) {
      S.up = true; S.tip = 1;
      Sfx.play('tthHengeThunk'); tthHengeShake(0.4); for (const p of G.players) rumble(p.id, 0.8, 0.6, 260);
      burst(ph.XH, gy, TTHHENGEC.chalk, 16); puff(ph.XH - 30, gy, 8, 'rgba(240,234,210,0.9)'); puff(ph.XH + 30, gy, 8, 'rgba(240,234,210,0.9)');
      tthPop(st, ph.XH, gy - 190, 'THUNK!', '#ffffff', 30);
    }
    if (F.t >= K.tipT + 0.7) {
      F.stage = 2; F.t = 0; ph.progT = 0;
      tthNews(st, 'Now the lintel goes on top. Both pull a rope!', false, 4); tthShowBadges(st, 4);
      for (const id of [0, 1]) tthHengeTip(st, id, 'rope', 'Stand at a gold ring and hold ' + tthHengeK(id, 'act') + ' to pull!', 0, { life: 4.5, cpu: 'I pull this rope!' });
    }
    return;
  }
  if (F.stage === 2) {
    const a = ph.P[0].rope, b = ph.P[1].rope, both = a >= 0 && b >= 0 && a !== b;
    F.both = both;
    for (const p of G.players) { const P = ph.P[p.id]; if (P.rope >= 0) { const d = ph.rings[P.rope].x - tthHengeCx(p); p.x += d * Math.min(1, dt * 8); p.face = P.rope ? -1 : 1; tthHengeDone(st, p.id, ['rope', 'gold']); } }
    if (both) {
      F.lift = Math.min(1, F.lift + dt / K.liftT); ph.progT = 0;
      if ((F.heaveT -= dt) <= 0) { F.heaveT = 0.6; Sfx.play('tthHengeHeave'); tthHengeShake(0.06); for (const p of G.players) rumble(p.id, 0.3, 0.3, 120); }
      const n = Math.floor(F.lift * 3 + 0.0001) / 3;
      if (n > F.notch && n < 1) { F.notch = n; Sfx.play('tthHengeChock'); tthPop(st, ph.XH + 75, gy - 60 - F.lift * 150, 'Click! Propped.', '#ffffff', 16); }
    } else {
      F.lift = Math.max(F.notch, F.lift - dt * K.sink);
      if (a >= 0 || b >= 0) { const id = a >= 0 ? 1 : 0; if (F.t > 2) tthHengeTip(st, id, 'rope', 'Take the other gold ring: hold ' + tthHengeK(id, 'act') + '!', 5, { cpu: 'Coming to my rope!' }); }
    }
    if (F.lift >= 1) {
      F.stage = 3; F.t = 0; F.lift = 1;
      const ly = gy - K.upH;
      Sfx.play('tthHengeThunk'); Sfx.play('tthCheer'); tthHengeShake(0.45); for (const p of G.players) rumble(p.id, 0.9, 0.7, 300);
      tthPop(st, ph.XH + 75, ly - 70, 'CLONK!', C.gold, 32);
      burst(ph.XH, ly, TTHHENGEC.chalk, 12); burst(ph.XH + K.gapX, ly, TTHHENGEC.chalk, 12);
      for (let k = 0; k < 26; k++) confetti(ph.XH - 40 + k * 9, ly - 30);
      tthStats(st).done = true;
      ph.th.mode = 'strain'; ph.th.t = 0;
      st.hints = [null, null];
    }
    return;
  }
  // stage 3: he tugs at the finished trilithon: too heavy even for him
  if (F.t > 0.5 && !F.said) { F.said = true; tthSay(st, 'MINE! Hnnngh... hnnnngh!', 1.4); Sfx.play('tthHengeCreak'); }
  if ((G.tickN % 16) === 0 && F.t < 1.9) confetti(ph.XH - 60 + tthRand() * 270, gy - 230);
  if (F.t > 1.9 && !F.out) {
    F.out = true;
    st.thief.claw = 0.2; st.thief.pose = 'shock'; st.thief.y -= 26;
    tthPhaseDone(st, { say: 'Three stones?! WAY too heavy! Bah!', portal: { x: st.cam.x + 190, y: st.cam.y + 210 } });
  }
}

/* ---------- hints (each player's own keys) and the stuck help ---------- */
function tthHengeHints(st, dt) {
  const ph = st.ph, S = ph.stone, ps = G.players, pu = ph.pusher, ro = 1 - pu, Pu = ps[pu], Ro = ps[ro], PR = ph.P[ro], PP = ph.P[pu], B = ph.brook;
  if (ph.jobT > 0 && (ph.jobT -= dt) <= 0) tthHengeJobHints(st);
  if (tthCalm(st) || ph.fin.stage > 0) return;
  const front = S.x + S.hw, act = id => tthHengeK(id, 'act'), nearBrook = !B.done && front > B.x0 - 330;
  // the roller
  if (PR.log) {
    PR.carryT += dt;
    if (ph.carryN < 3 ? PR.carryT > 0.2 : PR.carryT > 4.5) {
      const txt = nearBrook ? 'Drop it in the stream: ' + act(ro) : 'Jump on the stone (' + tthHengeK(ro, 'jump') + '), run to its front, drop the log: ' + act(ro);
      if (tthHengeTip(st, ro, 'carry', txt, 7, { life: 3.6, cpu: null })) ph.carryN++;
    }
  } else {
    if (ph.popN < 3 && ph.logs.some(l => tthHengeFree(ph, l) && l.x < S.x && l.age > 0.25 && l.lock <= 0) && tthHengeTip(st, ro, 'popped', 'A log rolled out the back! Grab it: ' + act(ro), 5, { cpu: null })) ph.popN++;
    ph.needT = S.block === 'log' && S.pushT < 1 ? ph.needT + dt : 0;
    if (ph.needT > 0.8) tthHengeTip(st, ro, 'need', 'Thud! The stone needs a log in FRONT.', 7, { cpu: 'It needs a log in front!' });
  }
  PR.pushT = (tthHengeAtRear(ph, Ro) && Ro.input.right && !S.push) ? PR.pushT + dt : 0;
  if (PR.pushT > 1.2) tthHengeTip(st, ro, 'noPush', 'Only ' + NAMES[pu] + ' can push this time. You bring the logs!', 7, { cpu: null });
  // the pusher: hills
  const down = TTHHENGE.hills[2];
  if (S.grade === 1 && ph.upHint !== S.hill) { ph.upHint = S.hill; tthHengeTip(st, pu, 'uphill', 'Uphill! Keep holding ' + tthHengeK(pu, 'right') + ' or the stone rolls back!', 0, { life: 4, cpu: 'I hold it! Hurry with the logs!' }); }
  if (S.v < -12 && !(ph.lasso && ph.lasso.on)) tthHengeTip(st, pu, 'back', 'It rolls back! Hold ' + tthHengeK(pu, 'right') + ' at its back end!', 5, { cpu: null });
  if (!ph.crestHint && S.x > down[0] - 150 && S.grade !== -1 && S.x < down[0] + 40) { ph.crestHint = true; tthHengeTip(st, pu, 'crest', 'Downhill next! Push it over, then hop over and brake from the FRONT.', 0, { life: 5, cpu: 'I\'ll brake it from the front!' }); tthSay(st, 'Downhill! Bye bye, stone! Wheee!', 2.2); }
  if (S.grade === -1 && !S.brake) {
    if (S.run && S.v > 62) tthHengeTip(st, pu, 'brake', 'Runaway! Hop over the stone and hold ' + tthHengeK(pu, 'left') + ' at its front!', 4, { cpu: 'Braking!' });
    else if (S.v < 3 && S.pushT > 1.5) tthHengeTip(st, pu, 'ease', 'Ease it down from the FRONT: hold ' + tthHengeK(pu, 'left') + ' against the stone.', 6, { cpu: null });
  }
  PP.frontT = (S.grade !== -1 && tthHengeCx(Pu) > front && !S.block && !(ph.lasso && ph.lasso.on)) ? PP.frontT + dt : 0;
  if (PP.frontT > 2.5) tthHengeTip(st, pu, 'behind', 'Go back behind the stone and push: hold ' + tthHengeK(pu, 'right') + '.', 8, { cpu: null });
  // sheep on the track
  for (const s of ph.sheep) {
    if (s.s !== 'graze' || s.x - front > 230) continue;
    const id = Math.abs(tthHengeCx(Ro) - s.x) <= Math.abs(tthHengeCx(Pu) - s.x) + 120 ? ro : pu;
    tthHengeTip(st, id, 'sheep', 'Baa! Shoo the sheep off the track: ' + act(id), 6, { cpu: 'Shoo, sheep!' });
    break;
  }
  // mud and the stream
  for (const m of ph.mud) if (!m.fed && !m.hint && front > m.x - 280) { m.hint = true; tthHengeTip(st, ro, 'mud', 'Mud ahead! It swallows a log. Spare logs wait on the pile.', 0, { life: 4.5, cpu: null }); }
  if (!B.done && !B.hint && front > B.x0 - 420) {
    B.hint = true; tthNews(st, 'A stream! Lay 3 logs in the water as a log road.', false, 4.5);
    tthHengeTip(st, ro, 'stream', 'A stream! Carry 3 logs from the pile into the water.', 0, { life: 5, cpu: 'I\'ll build a log road!' });
  }
  if (S.block === 'stream' && S.push) tthHengeTip(st, pu, 'bank', 'Wait at the bank until 3 logs lie in the stream.', 9, { cpu: null });
  // the lasso: whoever is not hauling
  if (ph.lasso && ph.lasso.on) for (const p of ps) {
    const P = ph.P[p.id];
    P.lazyT = P.haul ? 0 : P.lazyT + dt;
    if (P.lazyT > 1) tthHengeTip(st, p.id, 'haul', P.on ? 'Hop down and hold ' + tthHengeK(p.id, 'right') + ' to haul!' : 'Hold ' + tthHengeK(p.id, 'right') + ' to haul! Both together!', 3, { life: 2.4, cpu: null });
  }
}
function tthHengeStuck(st, dt) {
  const ph = st.ph, S = ph.stone, F = ph.fin, pu = ph.pusher, ro = 1 - pu, PR = ph.P[ro], B = ph.brook;
  if (ph.arrow && (ph.arrow.t -= dt) <= 0) ph.arrow = null;
  if (tthCalm(st) || ph.lasso || F.stage === 1 || F.stage === 3) return;
  ph.progT += dt;
  const lim = F.stage === 2 ? TTHHENGE.stuckRopeT : TTHHENGE.stuckT;
  if (ph.progT < lim) return;
  ph.progT = lim - 9;                    // again every 9 s
  if (!ph.stuckSaid) { ph.stuckSaid = true; tthHelp(st, 'Gold help: follow the gold hints and the gold arrow!'); } else Sfx.play('tthGold');
  const gold = (id, text, cpu) => { tthHint(st, id, text, { gold: true, life: 5.5, cpu }); ph.hintKey[id] = 'gold'; }, act = id => tthHengeK(id, 'act');
  const arrow = (x, y) => { ph.arrow = { x, y, t: 7 }; };
  if (F.stage === 2) {
    for (const id of [0, 1]) if (ph.P[id].rope < 0) gold(id, 'Stand at a gold ring and HOLD ' + act(id) + '!', 'I hold my rope!');
    const free = ph.rings.find((r, i) => ph.P[0].rope !== i && ph.P[1].rope !== i);
    if (free) arrow(free.x, tthHengeBase(free.x) - 84);
  } else if (S.block === 'sheep') {
    gold(ro, 'Walk to the sheep and shoo it: ' + act(ro), 'Shoo the sheep!'); gold(pu, 'Shoo the sheep: ' + act(pu), 'Shoo the sheep!');
    if (ph.lim.sheep) arrow(ph.lim.sheep.x, tthHengeBase(ph.lim.sheep.x) - 62);
  } else if (S.block === 'stream') {
    if (PR.log) { gold(ro, 'Walk to the stream and drop the log: ' + act(ro), 'Logs in the stream!'); arrow(B.x0 + 45, tthHengeBase(B.x0) - 40); }
    else { gold(ro, 'Grab a log from the pile (' + act(ro) + '), drop it in the stream!', 'Logs in the stream!'); arrow(B.pile, tthHengeBase(B.pile) - 70); }
  } else if (S.block === 'log') {
    if (PR.log) { gold(ro, 'Jump on the stone, run to its front, drop the log: ' + act(ro), 'A log to the front!'); arrow(tthHengeSpot(ph), tthHengeBase(S.x + S.hw) - 40); }
    else {
      let l = null;
      for (const q of ph.logs) if (tthHengeFree(ph, q) && (!l || q.x > l.x)) l = q;
      gold(ro, 'Grab a log lying on the ground: ' + act(ro), 'A log to the front!');
      if (l) arrow(l.x, tthHengeBase(l.x) - 44);
    }
  } else if (S.grade === -1) { gold(pu, 'Stand in FRONT of the stone and hold ' + tthHengeK(pu, 'left') + ': ease it down!', 'Ease it down!'); arrow(S.x + S.hw + 16, tthHengeBase(S.x + S.hw) - 60); }
  else { gold(pu, 'Stand BEHIND the stone and hold ' + tthHengeK(pu, 'right') + ': push!', 'Push the stone!'); arrow(S.x - S.hw - 14, tthHengeBase(S.x - S.hw) - 60); }
}

/* ---------- the camera: it follows the stone (the trilithon at the end) ---------- */
function tthHengeCam(st, snap, dt = DT) {
  const ph = st.ph, S = ph.stone, c = st.cam, K = TTHHENGE, ps = G.players;
  const fin = ph.fin.stage > 0;
  const tx = clamp(fin ? ph.XH + 75 - W / 2 : S.x - 400, ph.x0, ph.x1 - W);
  let ty = tthHengeBase(fin ? ph.XH : S.x) - K.groundAt;
  ty = Math.max(ty, Math.max(tthHengeFeet(ps[0]), tthHengeFeet(ps[1])) + 18 - H);
  if (snap) { c.x = tx; c.y = ty; return; }
  c.x += (tx - c.x) * Math.min(1, dt * (fin ? 1.6 : 3.2)); c.y += (ty - c.y) * Math.min(1, dt * 3);
}

/* ---------- the phase ---------- */
TTH_PHASES.henge = {
  setup(st, L) {
    const ph = st.ph, K = TTHHENGE, B = K.brook;
    ph.t = 0; ph.started = false; ph.leg = 0; ph.legT0 = 0; ph.jobT = 0;
    ph.pusher = L.def.first === 1 ? 1 : 0;
    ph.XH = K.endX + K.stone.hw + 34;                    // the hole (and the new upright) at the circle
    ph.x0 = 0; ph.x1 = ph.XH + 560;
    ph.stone = { x: K.start, hw: K.stone.hw, v: 0, run: false, push: false, brake: false, pushT: 9, dip: 0, backD: 0, backBumped: false, best: K.start, up: false, tip: 0,
      grade: 0, hill: -1, sup: null, left: 0, block: '', rumT: 0, freeT: 0, waitT: 0, waitHit: false, waitFree: false };
    ph.backStop = K.start; ph.lim = { x: 0, why: '', sheep: null };
    ph.logs = [100, 46, -8, -62].map(o => tthHengeNewLog(K.start + o, { u: true }));
    ph.P = [0, 1].map(() => ({ log: null, on: false, wet: false, haul: false, rope: -1, ropeT: 0, hold: false, carryT: 0, pushT: 0, frontT: 0, lazyT: 0 }));
    ph.brook = { x0: B.x0, x1: B.x0 + B.slotW * 3, slotW: B.slotW, depth: B.depth, pile: B.pile, slots: [false, false, false], dropT: [9, 9, 9], n: 0, done: false, hint: false,
      at: [0, 1, 2].map(i => ({ x: B.x0 + (i + 0.5) * B.slotW, s: 'bridge' })) };
    ph.mud = K.mud.map(m => ({ x: m.x, fed: false, t: 0, hint: false }));
    ph.piles = K.mud.map(m => ({ x: m.pile, bridge: false, took: 0 })).concat([{ x: B.pile, bridge: true, took: 0 }]);
    ph.chocks = K.chocks.map(x => ({ x, up: false, t: 9 }));
    ph.rings = [{ x: ph.XH - 84 }, { x: ph.XH + K.fin.gapX + 84 }];
    ph.sheep = []; ph.sheepN = 0;
    ph.script = TTHHENGE_SCRIPT.map(e => Object.assign({}, e, { done: false, at: e.at + Math.round((tthRand() - 0.5) * (e.kind === 'lasso' ? 50 : 90)), to: e.to && e.to.map(x => x + Math.round((tthRand() - 0.5) * 50)) }));
    ph.th = { mode: 'intro', sub: '', t: 0, log: null, sayT: 6, sayN: 0 };
    ph.lasso = null; ph.fin = { stage: 0, t: 0, lift: 0, notch: 0, both: false, heaveT: 0, said: false, out: false };
    ph.tipT = [{}, {}]; ph.hintKey = ['', ''];
    ph.gold = { log: false, roll: false, chock: false, brake: false, claw: false, rope: false };
    ph.miss = { wait: 0, back: {}, skid: 0, yoink: 0 }; ph.waited = 0;
    ph.progT = 0; ph.arrow = null; ph.stuckSaid = false; ph.pops = 0; ph.popN = 0; ph.carryN = 0; ph.needT = 0; ph.upHint = -2; ph.crestHint = false;
    ph.glubT = -9; ph.mudSaid = false; ph.sheepSaid = false; ph.pinchSaid = false;
    Object.assign(tthStats(st), { legT: [], thuds: 0, waited: 0, rollbacks: 0, skids: 0, yoinks: 0, whacks: 0, shoos: 0, lasso: [0, 0], carried: [0, 0], done: false });
    // Pip and Bo behind the stone (world coords; the screen is world - cam)
    G.players.forEach((p, k) => { const x = 150 + k * 62; p.x = x - p.w / 2; p.y = tthHengeBase(x) - p.h; p.vx = 0; p.vy = 0; p.grounded = true; p.face = 1; p.alive = true; });
    st.cam = { x: 0, y: 0 };
    tthHengeCam(st, true);
    for (const p of G.players) { p.x -= st.cam.x; p.y -= st.cam.y; }
    Object.assign(st.thief, { x: K.start + 30, y: tthHengeBase(K.start) - 112, s: K.thief.s, jet: true, face: -1, pose: 'grab', item: null, claw: 1, hidden: false, alpha: 1, flame: 1.4 });
  },
  wait(st, dt) { tthHengeStill(st, dt); tthHengeCam(st, false, dt); },
  coast(st, dt) {
    const ph = st.ph, S = ph.stone;
    S.v = approach(S.v, 0, 300 * dt); S.push = S.brake = false;
    for (const P of ph.P) { P.hold = false; P.haul = false; P.rope = -1; }
    tthHengeStill(st, dt); tthHengeLogs(st, dt); tthHengeSheep(st, dt); tthHengeCam(st, false, dt);
  },
  step(st, dt) {
    const ph = st.ph, ps = G.players;
    if (!ph.started) {
      ph.started = true; ph.jobT = 2.2;
      tthNews(st, 'Roll the last great stone back to the stone circle!', false, 4.5);
    }
    ph.t += dt;
    tthHengeHolds(st);
    for (const p of ps) tthHengeBody(st, p, dt);
    for (const p of ps) if (p.pendingAct) tthHengeAct(st, p);
    tthHengeStone(st, dt);
    tthHengeLogs(st, dt);
    tthHengeSheep(st, dt);
    tthHengeScript(st);
    tthHengeThief(st, dt);
    tthHengeFinale(st, dt);
    tthHengeHints(st, dt);
    tthHengeStuck(st, dt);
    for (const c of ph.chocks) c.t += dt;
    for (let i = 0; i < 3; i++) ph.brook.dropT[i] += dt;
    tthHengeCam(st, false, dt);
  },
  labels(st) {
    const ph = st.ph;
    if (ph.fin.stage > 0) return ['pull', 'pull'];
    const w = id => (id === ph.pusher ? 'shoo' : ph.P[id].log ? 'drop' : 'grab');
    return [w(0), w(1)];
  },
  roles(st) { const ph = st.ph; return ph.fin.stage > 0 ? ['Pull!', 'Pull!'] : ph.pusher === 0 ? ['Push!', 'Logs!'] : ['Logs!', 'Push!']; },
  jobKeys(st) { return st.ph.pusher === 1 ? ['logs', 'pusher'] : ['pusher', 'logs']; },
  legend() { return { pip: '<kbd>A</kbd><kbd>D</kbd> move · push <kbd>W</kbd> jump', bo: '<kbd>←</kbd><kbd>→</kbd> move · push <kbd>↑</kbd> jump', padJump: 'jump', padDown: 'left / right: walk, push, haul' }; },
  hudText(st) { const ph = st.ph; return ph.fin.stage > 0 ? 'Lintel ' + Math.round(ph.fin.lift * 100) + '%' : 'Leg ' + (ph.leg + 1) + '/3'; },
  progress(st) { return { n: st.ph.leg + (st.ph.fin.stage === 3 ? 1 : 0), of: 4 }; },
  headLift(st, p) { return st.ph.P[p.id].log ? 22 : 0; },
  drawBack(st) { tthHengeDrawBack(st); },
  draw(st) { tthHengeDraw(st); },
  drawTop(st) { tthHengeDrawTop(st); },
  hud(st) { tthHengeHud(st); },
};

/* ---------- drawing ---------- */
// a rope with a little sag (ink under, rope colour on top)
function tthHengeRope(x0, y0, x1, y1, sag = 0, w = 3, col = TTHHENGEC.rope) {
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag, x1, y1);
  ctx.strokeStyle = C.ink; ctx.lineWidth = w + 2.5; ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
}
// a log roller seen end-on (the rollers lie across the track): (rich props pass 2) a ring of rough bark, a cut face
// with growth rings, checks, a pith and a knot, painted once into a picture that turns with the log (so it is seen
// to roll); the light on its rim and the outline are drawn over it, still, so the light stays put
function tthHengeDrawLog(x, y, rot, gold, r = TTHHENGE.log.r) {
  const Cc = TTHHENGEC, dk = gold ? C.goldDark : Cc.woodDk, ol = mixHex(gold ? '#a8761c' : Cc.woodDk, '#1c1a36', 0.45);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  TTA.pic('hgLog|' + (gold ? 1 : 0) + '|' + r, 2 * r + 8, 2 * r + 8, r + 4, r + 4, () => tthHengePaintLogEnd(r, gold), 0, 0);
  ctx.restore();
  ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,240,210,0.55)'; ctx.beginPath(); ctx.arc(x, y, r - 1.3, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
  ctx.strokeStyle = 'rgba(40,20,10,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r - 1.4, Math.PI * 0.05, Math.PI * 0.6); ctx.stroke();
  ctx.strokeStyle = ol; ctx.lineWidth = 2; circle(x, y, r); ctx.stroke();
  if (!gold) return;
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(x - r * 0.45, y - r * 0.45, 1.3); ctx.fill();
  ctx.strokeStyle = dk; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + r * 0.5, y - r - 3); ctx.lineTo(x + r * 0.5, y - r - 7); ctx.moveTo(x + r * 0.5 - 2, y - r - 5); ctx.lineTo(x + r * 0.5 + 2, y - r - 5); ctx.stroke();
}
function tthHengePaintLogEnd(r, gold) {
  const Cc = TTHHENGEC, bark = gold ? C.goldDark : Cc.woodDk, face = gold ? C.gold : Cc.wood, lt = gold ? '#fff3c4' : Cc.woodLt;
  // the bark: a dark ring with rough bumps round its edge
  ctx.fillStyle = bark; ctx.beginPath();
  for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2, rr2 = r * (0.97 + 0.05 * (k % 3 === 0 ? 1 : (k % 2 ? 0.4 : -0.2))); ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
  ctx.closePath(); ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r - 2);
  g.addColorStop(0, lt); g.addColorStop(0.55, face); g.addColorStop(1, mixHex(face, bark, 0.35));
  ctx.fillStyle = g; circle(0, 0, r - 2.4); ctx.fill();
  // growth rings, a little off centre
  ctx.strokeStyle = TTA.rgba(bark, 0.45); ctx.lineWidth = 0.9;
  for (const k of [0.3, 0.52, 0.72, 0.88]) { ctx.beginPath(); ctx.ellipse(0.8, 0.6, (r - 2.4) * k, (r - 2.4) * k * 0.94, 0.3, 0, Math.PI * 2); ctx.stroke(); }
  // checks (drying cracks) out from the heart, and the pith
  ctx.strokeStyle = TTA.rgba(bark, 0.85); ctx.lineWidth = 1.1; ctx.beginPath();
  ctx.moveTo(0.8, 0.6); ctx.lineTo(r * 0.55, -r * 0.45); ctx.moveTo(0.8, 0.6); ctx.lineTo(-r * 0.2, r * 0.7); ctx.stroke();
  ctx.fillStyle = bark; circle(0.8, 0.6, 1.4); ctx.fill();
  // a knot near the rim (the mark that shows it rolling)
  ctx.fillStyle = bark; ctx.beginPath(); ctx.ellipse(r * 0.62, 0, 2.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = TTA.rgba(bark, 0.5); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(r * 0.62, 0, 3.4, 2.6, 0, 0, Math.PI * 2); ctx.stroke();
  // saw marks across the face
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.6; ctx.beginPath();
  for (let k = -2; k <= 2; k++) { ctx.moveTo(-r * 0.6, k * r * 0.22 - 1); ctx.lineTo(r * 0.6, k * r * 0.22 + 1); }
  ctx.stroke();
}
// a log carried over the head (seen from the side): (rich props pass 2) round shading, bark ridges with a knot, a
// cut end with rings, painted once per colour and turned with the carrier
function tthHengeDrawCarry(x, y, gold, face, tilt) {
  ctx.save(); ctx.translate(x, y); ctx.scale(face, 1); ctx.rotate(tilt);
  TTA.pic('hgCarry|' + (gold ? 1 : 0), 52, 26, 26, 13, () => tthHengePaintCarry(gold), 0, 0);
  ctx.restore();
}
function tthHengePaintCarry(gold) {
  const Cc = TTHHENGEC, col = gold ? C.gold : Cc.wood, dk = gold ? C.goldDark : Cc.woodDk, lt = gold ? '#fff3c4' : Cc.woodLt, ol = mixHex(gold ? '#a8761c' : Cc.woodDk, '#1c1a36', 0.45);
  rr(-21, -8, 42, 16, 7); ctx.fillStyle = col; ctx.fill();
  ctx.save(); rr(-21, -8, 42, 16, 7); ctx.clip();
  const g = ctx.createLinearGradient(0, -8, 0, 8);
  g.addColorStop(0, 'rgba(255,240,210,0.4)'); g.addColorStop(0.35, 'rgba(255,240,210,0.04)'); g.addColorStop(1, 'rgba(50,25,10,0.38)');
  ctx.fillStyle = g; ctx.fillRect(-22, -8, 44, 16);
  ctx.strokeStyle = dk; ctx.lineWidth = 1.3; ctx.beginPath();
  for (const [y0, s0, s1] of [[-4.5, -17, -2], [-4.2, 3, 12], [-0.5, -12, 6], [3, -18, -6], [3.4, -2, 10], [5.8, -9, 4]]) { ctx.moveTo(s0, y0); ctx.quadraticCurveTo((s0 + s1) / 2, y0 + 0.8, s1, y0 + 0.2); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,210,0.35)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-15, -5.8); ctx.lineTo(-5, -6); ctx.moveTo(4, -5.6); ctx.lineTo(10, -5.8); ctx.stroke();
  ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(-6, 1.5, 2.6, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = TTA.rgba(dk, 0.5); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(-6, 1.5, 4.4, 2.8, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  rr(-21, -8, 42, 16, 7); ctx.strokeStyle = ol; ctx.lineWidth = 2.2; ctx.stroke();
  // the cut end: bark rim, rings, pith, a lit edge
  ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(16, 0, 5, 7.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = lt; ctx.beginPath(); ctx.ellipse(16, 0, 3.8, 6.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = TTA.rgba(dk, 0.55); ctx.lineWidth = 0.7;
  for (const k of [0.4, 0.75]) { ctx.beginPath(); ctx.ellipse(16.2, 0.3, 3.8 * k, 6.1 * k, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = dk; circle(16.2, 0.3, 0.8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(16, 0, 3.2, 5.4, 0, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
  ctx.strokeStyle = ol; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(16, 0, 5, 7.5, 0, 0, Math.PI * 2); ctx.stroke();
}
function tthHengeStonePath(hw, hh) {
  ctx.beginPath();
  ctx.moveTo(-hw + 9, hh); ctx.lineTo(-hw, hh - 12); ctx.lineTo(-hw + 3, -hh + 13); ctx.quadraticCurveTo(-hw + 5, -hh, -hw + 20, -hh);
  ctx.lineTo(hw - 36, -hh + 1); ctx.quadraticCurveTo(hw - 6, -hh + 2, hw - 2, -hh + 17); ctx.lineTo(hw, hh - 10); ctx.quadraticCurveTo(hw - 1, hh, hw - 11, hh);
  ctx.closePath();
}
// a great sarsen stone, centre (cx, cy), half-length hw, half-thickness hh; ang 0 lies flat, PI/2 stands up.
// far: a paler stone of the circle in the background. (rich props pass 2) Painted once per size and pose into a
// picture on the old outline: light from the upper left whichever way it lies, the long shallow grooves the
// builders' hammerstones left, pits and grit, two cracks with a lit lip, lichen in three colours (grey-green, white
// crust, orange spots) and an outline in the stone's own dark shade; a far stone gets a softer version
function tthHengeDrawStone(cx, cy, ang, hw, hh, far) {
  const stand = Math.abs(Math.sin(ang)) > 0.7 ? 1 : 0;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
  TTA.pic('hgStone|' + hw + '|' + hh + '|' + (far ? 1 : 0) + '|' + stand, 2 * hw + 10, 2 * hh + 10, hw + 5, hh + 5, () => tthHengePaintStone(hw, hh, far, stand), 0, 0);
  ctx.restore();
}
function tthHengePaintStone(hw, hh, far, stand) {
  const Cc = TTHHENGEC, base = far ? '#b4c0c4' : Cc.stone, sd = (hw * 31 + hh * 7 + (far ? 5 : 0)) | 0;
  // the light's direction in the stone's own frame: lying, the top is -y and the left -x; standing (turned a
  // quarter), the top is -x and the left +y
  const lx = stand ? -1 : -0.55, ly = stand ? 0.55 : -1;
  ctx.lineJoin = 'round';
  tthHengeStonePath(hw, hh); ctx.fillStyle = base; ctx.fill();
  ctx.save(); tthHengeStonePath(hw, hh); ctx.clip();
  const g = ctx.createLinearGradient(lx * hw * 0.8, ly * hh * (stand ? 1 : 1.2), -lx * hw * 0.8, -ly * hh * (stand ? 1 : 1.2));
  g.addColorStop(0, far ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.3)'); g.addColorStop(0.45, 'rgba(255,255,255,0.02)'); g.addColorStop(1, far ? 'rgba(60,70,90,0.18)' : 'rgba(40,46,70,0.32)');
  ctx.fillStyle = g; ctx.fillRect(-hw - 2, -hh - 2, 2 * hw + 4, 2 * hh + 4);
  // a lit band along the edge that faces up and a shaded band along the one that faces down (as before)
  const lit = far ? '#cdd6d8' : Cc.stoneLt, dkc = far ? '#9eabb0' : Cc.stoneDk;
  ctx.globalAlpha = 0.85;
  if (stand) { ctx.fillStyle = lit; ctx.fillRect(-hw, hh - (far ? 5 : 7), 2 * hw, 8); ctx.fillStyle = dkc; ctx.fillRect(-hw, -hh - 1, 2 * hw, far ? 6 : 8); ctx.fillStyle = lit; ctx.fillRect(-hw - 1, -hh, far ? 5 : 7, 2 * hh); }
  else { ctx.fillStyle = lit; ctx.fillRect(-hw, -hh, hw * 2, far ? 6 : 9); ctx.fillStyle = dkc; ctx.fillRect(-hw, hh - (far ? 6 : 8), hw * 2, 9); }
  ctx.globalAlpha = 1;
  // the hammerstone dressing: long shallow grooves along the stone, each a dark line under a lit one
  const ng = Math.max(2, Math.round(hh * 2 / 9));
  for (let k = 0; k < ng; k++) {
    const gy = -hh + (k + 0.7) * (2 * hh) / (ng + 0.4), x0 = -hw + 8 + TTA.u(sd, k) * hw * 0.5, x1 = hw - 8 - TTA.u(sd, k + 9) * hw * 0.5;
    ctx.strokeStyle = far ? 'rgba(60,70,90,0.1)' : 'rgba(40,46,70,0.16)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, gy + 1); ctx.quadraticCurveTo((x0 + x1) / 2, gy + 2.2, x1, gy + 1.2); ctx.stroke();
    ctx.strokeStyle = far ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, gy - 0.5); ctx.quadraticCurveTo((x0 + x1) / 2, gy + 0.7, x1, gy - 0.3); ctx.stroke();
  }
  if (!far) TTA.craters(-hw, -hh, 2 * hw, 2 * hh, sd, { n: Math.max(4, Math.round(hw * hh / 260)), r: 1.4, rr: 3, dk: 'rgba(50,56,80,0.28)', grit: 120 });
  else { ctx.fillStyle = 'rgba(60,70,90,0.16)'; ctx.beginPath(); for (let k = 0; k < Math.round(hw * hh / 40); k++) ctx.rect(-hw + TTA.u(sd, 200 + k) * 2 * hw, -hh + TTA.u(sd, 300 + k) * 2 * hh, 1.6, 1.6); ctx.fill(); }
  // lichen: grey-green patches (the old spots), white crust and a few orange spots
  const blob = (bx, by, r, col) => { ctx.fillStyle = col; ctx.beginPath(); for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2, q = r * (0.7 + 0.45 * TTA.u(sd + (bx | 0), a)); ctx.lineTo(bx + Math.cos(an) * q, by + Math.sin(an) * q * 0.8); } ctx.closePath(); ctx.fill(); };
  if (!far) {
    for (const [bx, by, r] of [[-hw * 0.56, -hh * 0.2, 5.5], [-hw * 0.56 + 8, -hh * 0.05, 3.2], [hw * 0.42, hh * 0.3, 4.2], [hw * 0.74, -hh * 0.35, 2.6]]) { blob(bx, by, r + 1.2, 'rgba(120,140,60,0.35)'); blob(bx, by, r, Cc.lichen); ctx.fillStyle = 'rgba(255,255,200,0.4)'; circle(bx - r * 0.3, by - r * 0.3, r * 0.35); ctx.fill(); }
    for (let k = 0; k < 4; k++) blob(-hw * 0.7 + TTA.u(sd, 40 + k) * hw * 1.4, -hh * 0.6 + TTA.u(sd, 50 + k) * hh * 1.2, 2 + TTA.u(sd, 60 + k) * 2.5, 'rgba(240,242,232,0.7)');
    ctx.fillStyle = '#e8a03a'; for (let k = 0; k < 5; k++) { circle(-hw * 0.8 + TTA.u(sd, 70 + k) * hw * 1.6, -hh * 0.7 + TTA.u(sd, 80 + k) * hh * 1.4, 1 + TTA.u(sd, 90 + k) * 0.9); ctx.fill(); }
    ctx.fillStyle = Cc.stoneDk; circle(-hw * 0.2, hh * 0.25, 2.2); ctx.fill(); circle(hw * 0.12, -hh * 0.4, 1.8); ctx.fill(); circle(-hw * 0.8, hh * 0.35, 1.8); ctx.fill();
  } else {
    for (let k = 0; k < 3; k++) blob(-hw * 0.6 + TTA.u(sd, 40 + k) * hw * 1.2, -hh * 0.5 + TTA.u(sd, 50 + k) * hh, 2.5 + TTA.u(sd, 60 + k) * 2.5, 'rgba(170,190,110,0.45)');
  }
  ctx.restore();
  if (!far) {   // the two cracks, each with a lit lower lip
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(hw * 0.2 + 1, -hh + 4); ctx.lineTo(hw * 0.26 + 1, -hh * 0.3 + 1); ctx.lineTo(hw * 0.18 + 1, hh * 0.1 + 1); ctx.moveTo(-hw * 0.35 + 1, hh - 2); ctx.lineTo(-hw * 0.3 + 1, hh * 0.35 + 1); ctx.stroke();
    ctx.strokeStyle = Cc.stoneDk; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(hw * 0.2, -hh + 3); ctx.lineTo(hw * 0.26, -hh * 0.3); ctx.lineTo(hw * 0.18, hh * 0.1); ctx.moveTo(-hw * 0.35, hh - 3); ctx.lineTo(-hw * 0.3, hh * 0.35); ctx.stroke();
  }
  ctx.strokeStyle = far ? '#6f7f88' : mixHex(Cc.stoneDk, '#1c1a36', 0.5); ctx.lineWidth = far ? 2 : 3; tthHengeStonePath(hw, hh); ctx.stroke();
}
function tthHengeDrawSheep(s, gy) {
  const t = s.t + s.k * 1.7, flee = s.s === 'flee', graze = s.s === 'graze';
  const hop = flee ? Math.abs(Math.sin(t * 15)) * 10 : s.s === 'walk' ? Math.abs(Math.sin(t * 9)) * 2.5 : 0;
  const sw = graze ? 0 : Math.sin(t * (flee ? 30 : 13)) * (flee ? 6 : 3.5);
  ctx.save(); ctx.translate(s.x, gy - hop); ctx.scale(s.face, 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(28,26,54,0.16)'; ctx.beginPath(); ctx.ellipse(0, hop, 17, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2b2740'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-10, -9); ctx.lineTo(-10 - sw, -1); ctx.moveTo(-3, -9); ctx.lineTo(-3 + sw, -1); ctx.moveTo(6, -9); ctx.lineTo(6 - sw, -1); ctx.moveTo(12, -9); ctx.lineTo(12 + sw, -1); ctx.stroke();
  // the wool: ink blobs first, then the white ones a little smaller, so only the outline shows
  const blobs = TTHHENGE_WOOL;
  ctx.fillStyle = C.ink; for (let i = 0; i < blobs.length; i += 3) { circle(blobs[i], blobs[i + 1], blobs[i + 2] + 2.4); ctx.fill(); }
  ctx.fillStyle = '#fdfaf0'; for (let i = 0; i < blobs.length; i += 3) { circle(blobs[i], blobs[i + 1], blobs[i + 2]); ctx.fill(); }
  ctx.fillStyle = '#e6dfcf'; circle(-6, -12, 4); ctx.fill(); circle(6, -11, 3.4); ctx.fill();
  // the head: down in the grass while it grazes
  const nod = graze ? Math.sin(t * 6) * 1.5 : 0, hx = graze ? 21 : 19, hy = graze ? -9 + nod : -22;
  ctx.fillStyle = '#2b2740';
  ctx.beginPath(); ctx.ellipse(hx - 6, hy - 6, 5, 2.6, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx, hy, 7, 8.5, graze ? 0.9 : 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fdfaf0'; circle(hx - 4, hy - 8, 4.2); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(hx + 2, hy - 2, 2.6); ctx.fill();
  ctx.fillStyle = '#1c1a36'; circle(hx + (flee ? 2 : 2.8), hy - 2, flee ? 1 : 1.3); ctx.fill();
  ctx.restore();
}
const TTHHENGE_WOOL = [-13, -17, 8, -5, -23, 9, 6, -22, 9, 14, -16, 7.5, 5, -12, 8.5, -7, -12, 8.5];
// the land between x0 and x1: green turf over white chalk (Salisbury Plain is chalk downland)
function tthHengeGround(st, x0, x1, patch) {
  const ph = st.ph, Cc = TTHHENGEC, bot = st.cam.y + H + 14, step = 12;
  x0 = Math.floor(x0 / step) * step; x1 = Math.ceil(x1 / step) * step;
  // (a patch over something already painted: each band only as deep as itself, so its ends leave no seam)
  const band = (dy, col, dy1) => {
    ctx.beginPath(); ctx.moveTo(x0, patch && dy1 ? tthHengeG(ph, x0) + dy1 : bot);
    for (let x = x0; x <= x1; x += step) ctx.lineTo(x, tthHengeG(ph, x) + dy);
    if (patch && dy1) for (let x = x1; x >= x0; x -= step) ctx.lineTo(x, tthHengeG(ph, x) + dy1); else ctx.lineTo(x1, bot);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  };
  band(0, Cc.grass, 20); band(20, Cc.grassDk, 30); band(30, '#efe6c8', 96); band(96, '#e3d7b2', 0);
  if (!patch) {
    band(30, 'rgba(120,100,60,0.12)', 38);
    for (let x = x0; x <= x1; x += 48) { const h = hash(x, 41), gy = tthHengeG(ph, x); ctx.fillStyle = h % 2 ? 'rgba(160,140,100,0.35)' : 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(x + (h % 30), gy + 44 + (h >>> 6) % 44, 3 + h % 4, 2, 0, 0, Math.PI * 2); ctx.fill(); }
    // (art pass) flint nodules in the chalk (dark, with a white rind and a glint), roots under the turf, a seam of chalk
    for (let x = x0; x <= x1; x += 72) {
      const h = hash(x, 43), gy = tthHengeG(ph, x), fx = x + h % 40, fy = gy + 56 + (h >>> 5) % 40, r = 4 + h % 4;
      ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.ellipse(fx, fy, r * 1.5 + 1.5, r + 1.5, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a4a58'; ctx.beginPath(); ctx.ellipse(fx, fy, r * 1.5, r, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a7a8a'; ctx.beginPath(); ctx.ellipse(fx - r * 0.4, fy - r * 0.3, r * 0.6, r * 0.3, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(70,50,30,0.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 20, gy + 18); ctx.quadraticCurveTo(x + 24, gy + 26, x + 18, gy + 34); ctx.moveTo(x + 22, gy + 24); ctx.lineTo(x + 28, gy + 30); ctx.stroke();
    }
  }
  // blades of grass along the top
  ctx.strokeStyle = Cc.grassDk; ctx.lineWidth = 1.6; ctx.beginPath();
  for (let x = x0; x < x1; x += 8) { const y = tthHengeG(ph, x); ctx.moveTo(x, y - 1); ctx.lineTo(x + 1.5 - hash(x, 47) % 3, y - 4 - hash(x, 48) % 5); }
  ctx.stroke();
  ctx.beginPath();
  for (let x = x0; x <= x1; x += step) { const y = tthHengeG(ph, x) + 3; if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.strokeStyle = Cc.grassLt; ctx.lineWidth = 4; ctx.stroke();
  ctx.beginPath();
  for (let x = x0; x <= x1; x += step) { const y = tthHengeG(ph, x); if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.stroke();
}
function tthHengeDrawSky(st) {
  const cam = st.cam, t = G.clock;
  tthSky('#6fc3ee', '#fff0c4');
  // the rising sun over the plain, where the circle stands
  const sx = 780 - cam.x * 0.02, sy = 168 - cam.y * 0.06;
  ctx.fillStyle = 'rgba(255,246,200,0.28)'; circle(sx, sy, 92 + Math.sin(t * 1.3) * 4); ctx.fill();
  ctx.fillStyle = 'rgba(255,246,200,0.4)'; circle(sx, sy, 68); ctx.fill();
  ctx.fillStyle = '#fff6c2'; circle(sx, sy, 48); ctx.fill();
  for (let k = 0; k < 5; k++) {
    const x = (((k * 263 + 90 - cam.x * 0.07 - t * 5) % (W + 320)) + W + 320) % (W + 320) - 160, y = 96 + (k * 57) % 100 - cam.y * 0.06, s = 0.8 + (k % 3) * 0.25;
    // a soft blue-grey belly under each cloud, then the puffs and a bright top
    ctx.fillStyle = 'rgba(170,196,222,0.45)'; circle(x + 2, y + 6, 20 * s); ctx.fill(); circle(x + 26 * s, y + 11 * s, 16 * s); ctx.fill(); circle(x - 22 * s, y + 12 * s, 14 * s); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.86)';
    circle(x, y, 20 * s); ctx.fill(); circle(x + 24 * s, y + 5 * s, 16 * s); ctx.fill(); circle(x - 24 * s, y + 6 * s, 14 * s); ctx.fill(); ctx.fillRect(x - 30 * s, y + 4 * s, 62 * s, 14 * s);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(x - 6 * s, y - 9 * s, 9 * s); ctx.fill();
  }
  // the far downs, then the near downs with a burial mound and far-away sheep
  const hills = (f, y0, a, col) => {
    const ox = cam.x * f, oy = y0 - cam.y * f;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 24) ctx.lineTo(x, oy + Math.sin((x + ox) * 0.0052) * a + Math.sin((x + ox) * 0.0131 + 1.3) * a * 0.45);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    // a sunlit rim along the crest, and round bushes sitting on it
    ctx.beginPath();
    for (let x = 0; x <= W; x += 24) { const y = oy + Math.sin((x + ox) * 0.0052) * a + Math.sin((x + ox) * 0.0131 + 1.3) * a * 0.45 + 1.5; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.strokeStyle = tint(col, 0.3); ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = shade(col, 0.1);
    for (let i = Math.floor(ox / 140); i <= Math.floor((ox + W) / 140) + 1; i++) {
      const h = hash(i, 91 + a), x = i * 140 + (h % 100) - ox, y = oy + Math.sin((x + ox) * 0.0052) * a + Math.sin((x + ox) * 0.0131 + 1.3) * a * 0.45, r = 6 + (h % 6);
      if (h % 3) continue;
      circle(x, y + r * 0.5, r); ctx.fill(); circle(x + r, y + r * 0.8, r * 0.7); ctx.fill();
    }
  };
  hills(0.12, 330, 26, '#a9dcc0');
  // a soft haze between the far and near downs
  { const hy = 330 - cam.y * 0.2; ctx.fillStyle = 'rgba(255,240,200,0.08)'; ctx.fillRect(0, hy + 12, W, 108); ctx.fillRect(0, hy + 36, W, 84); ctx.fillRect(0, hy + 58, W, 62); } // (solid steps: a gradient fill is slow on a phone)
  hills(0.3, 372, 20, '#93d28c');
  const ox = cam.x * 0.3, oy = 372 - cam.y * 0.3;
  for (let i = Math.floor(ox / 170); i <= Math.floor((ox + W) / 170) + 1; i++) {
    const h = hash(i, 53), x = i * 170 + (h % 120) - ox, y = oy + Math.sin((x + ox) * 0.0052) * 20 + Math.sin((x + ox) * 0.0131 + 1.3) * 9;
    if (h % 3 === 0) { ctx.fillStyle = '#86c880'; ctx.beginPath(); ctx.ellipse(x, y + 4, 34, 13, 0, Math.PI, 0); ctx.fill(); }
    else if (h % 3 === 1) { ctx.fillStyle = '#fdfaf0'; ctx.beginPath(); ctx.ellipse(x, y + 12, 5, 3.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 16, y + 17, 4.4, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2b2740'; circle(x + 5, y + 11, 1.8); ctx.fill(); circle(x + 20.5, y + 16, 1.6); ctx.fill(); }
  }
}
// two timber poles tied at the top (the builders' shear legs); the lintel ropes run over them
// the builders' A-frame: (rich props pass 2) two tapering timber legs with bark ridges, knots and a lit edge, lashed
// with turns of rope where they cross, the cross rope, and a little heap of chalk at each foot; painted once into a
// picture per height (its outline is the old one: two 11 px strokes)
function tthHengePole(x, gy, top) {
  const hgt = Math.round(gy - top);
  TTA.pic('hgPole|' + hgt, 96, hgt + 40, 48, hgt + 22, () => tthHengePaintPole(hgt), x, gy);
}
function tthHengePaintPole(hgt) {
  const Cc = TTHHENGEC, ol = mixHex(Cc.woodDk, '#1c1a36', 0.5), top = -hgt;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const dx of [-30, 30]) {
    const x0 = dx, y0 = 2, x1 = -dx * 0.12, y1 = top - 14, L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
    ctx.save(); ctx.translate(x0, y0); ctx.rotate(a);
    // (local frame: the leg runs along +x from its foot, 11 px thick at the foot and 9 at the top)
    const leg = () => { ctx.beginPath(); ctx.moveTo(0, -5.5); ctx.lineTo(L, -4.5); ctx.arc(L, 0, 4.5, -Math.PI / 2, Math.PI / 2); ctx.lineTo(0, 5.5); ctx.arc(0, 0, 5.5, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); };
    leg(); ctx.fillStyle = ol; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(L, -3.2); ctx.lineTo(L, 3.2); ctx.lineTo(0, 4); ctx.closePath(); ctx.clip();
    const lit = dx < 0 ? 1 : -1;
    ctx.fillStyle = dx < 0 ? Cc.woodDk : Cc.wood; ctx.fillRect(-2, -5, L + 4, 10);
    ctx.fillStyle = 'rgba(255,236,200,0.35)'; ctx.fillRect(-2, lit > 0 ? 1.6 : -4.2, L + 4, 2.4);
    ctx.fillStyle = 'rgba(40,20,10,0.25)'; ctx.fillRect(-2, lit > 0 ? -4.2 : 1.8, L + 4, 2.4);
    ctx.strokeStyle = TTA.rgba(Cc.woodDk, 0.9); ctx.lineWidth = 0.9; ctx.beginPath();
    for (let k = 0; k < Math.floor(L / 16); k++) { const sx = 6 + k * 16 + (hash(k, dx + 40) % 7), yy = ((hash(dx + 40, k) % 5) - 2) * 0.9; ctx.moveTo(sx, yy); ctx.lineTo(sx + 9 + hash(k, 3) % 6, yy + 0.4); }
    ctx.stroke();
    for (const kx of [L * 0.32, L * 0.7]) { ctx.fillStyle = Cc.woodDk; ctx.beginPath(); ctx.ellipse(kx, 0, 2.6, 1.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,236,200,0.4)'; ctx.beginPath(); ctx.ellipse(kx - 0.8, -0.8, 1.2, 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    // the cut top: end grain
    ctx.fillStyle = Cc.woodLt; ctx.beginPath(); ctx.ellipse(L + 0.5, 0, 2.2, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = TTA.rgba(Cc.woodDk, 0.6); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(L + 0.5, 0, 1.2, 2, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // a heap of chalk round its foot
    ctx.fillStyle = Cc.chalk; ctx.strokeStyle = mixHex(Cc.chalk, '#6a5a40', 0.5); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(dx - 13, 3); ctx.quadraticCurveTo(dx - 6, -6, dx, -5); ctx.quadraticCurveTo(dx + 7, -6, dx + 13, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(dx - 4, -3.2, 4, 1.2, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9a9a92'; circle(dx + 6, -1, 1.4); ctx.fill();
  }
  // the lashing where the legs cross: turns of rope, each with an outline and a lit twist
  const cy = 2 + (top - 16) * (30 / 33.6);
  for (let k = -2; k <= 2; k++) {
    const yy = cy + k * 3.2;
    ctx.strokeStyle = TTA.rgba(Cc.ropeDk, 1); ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-7, yy - 2); ctx.lineTo(7, yy + 2); ctx.stroke();
    ctx.strokeStyle = Cc.rope; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-4, yy - 1.6); ctx.lineTo(-1, yy - 0.7); ctx.stroke();
  }
  // the cross rope between the legs (as before: ink under rope colour)
  ctx.strokeStyle = ol; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-6, top + 2); ctx.lineTo(6, top + 2); ctx.stroke();
  ctx.strokeStyle = Cc.rope; ctx.lineWidth = 5; ctx.stroke();
  ctx.strokeStyle = TTA.rgba(Cc.ropeDk, 0.8); ctx.lineWidth = 0.8; ctx.beginPath();
  for (let k = -5; k <= 5; k += 2.5) { ctx.moveTo(k - 1, top - 0.4); ctx.lineTo(k + 1, top + 4.4); }
  ctx.stroke();
}
// one timber of the crib that props the lintel (rich props pass 2): grain, a knot, end grain and an outline in the
// wood's dark shade, painted once per tone into a picture (the same 40 x 12 box as before)
function tthHengeCribBeam(x, y, n) {
  TTA.pic('hgCrib|' + (n % 4), 46, 18, 3, 3, () => {
    const Cc = TTHHENGEC, col = n % 2 ? Cc.wood : Cc.woodLt;
    rr(0, 0, 40, 12, 4); ctx.fillStyle = col; ctx.fill();
    ctx.save(); rr(0, 0, 40, 12, 4); ctx.clip(); TTA.wood(0, 0, 40, 12, 31 + n % 4, col, { nails: true }); ctx.restore();
    ctx.strokeStyle = TTA.rgba(Cc.woodDk, 0.6); ctx.lineWidth = 0.7;
    for (const ex of [3, 37]) { ctx.beginPath(); ctx.ellipse(ex, 6, 1.6, 3.6, 0, 0, Math.PI * 2); ctx.stroke(); }
    rr(0, 0, 40, 12, 4); ctx.strokeStyle = mixHex(Cc.woodDk, '#1c1a36', 0.45); ctx.lineWidth = 2; ctx.stroke();
  }, x, y);
}
function tthHengeDrawBack(st) {
  const ph = st.ph, K = TTHHENGE, Cc = TTHHENGEC, cam = st.cam, S = ph.stone, t = G.clock, B = ph.brook, F = ph.fin;
  const vx0 = cam.x - 30, vx1 = cam.x + W + 30, see = (x, m = 80) => x > vx0 - m && x < vx1 + m;
  tthScreen(st, () => tthHengeDrawSky(st));
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const XH = ph.XH, gyH = tthHengeBase(XH);
  // the half-built circle: finished trilithons and lone uprights standing further back
  if (see(XH, 900)) {
    const far = (x, lint) => { tthHengeDrawStone(x, gyH - 68, Math.PI / 2, 62, 20, true); if (lint) { tthHengeDrawStone(x + lint, gyH - 68, Math.PI / 2, 62, 20, true); tthHengeDrawStone(x + lint / 2, gyH - 142, 0, lint / 2 + 26, 14, true); } };
    far(XH - 330, 96); far(XH - 150, 0); far(XH + 330, 100); far(XH + 510, 0);
  }
  // a way sign at the start
  if (see(250)) {
    const gy = tthHengeBase(250);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(250, gy); ctx.lineTo(250, gy - 96); ctx.stroke(); ctx.strokeStyle = Cc.woodDk; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = Cc.woodLt; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(214, gy - 124); ctx.lineTo(280, gy - 124); ctx.lineTo(298, gy - 106); ctx.lineTo(280, gy - 88); ctx.lineTo(214, gy - 88); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.clip(); TTA.wood(214, gy - 124, 84, 36, 251, Cc.woodLt, { nails: true }); ctx.restore();
    ctx.fillStyle = Cc.stoneDk; ctx.fillRect(228, gy - 114, 7, 19); ctx.fillRect(246, gy - 114, 7, 19); ctx.fillRect(224, gy - 119, 33, 7);
    ctx.strokeStyle = Cc.woodDk; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(264, gy - 106); ctx.lineTo(284, gy - 106); ctx.moveTo(277, gy - 113); ctx.lineTo(284, gy - 106); ctx.lineTo(277, gy - 99); ctx.stroke();
  }
  // the downhill sign on the crest
  if (see(K.signX)) {
    const x = K.signX, gy = tthHengeBase(x);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy - 118); ctx.stroke(); ctx.strokeStyle = Cc.woodDk; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = '#ffe9a8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(x - 30, gy - 150, 60, 44, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = Cc.grassDk; ctx.beginPath(); ctx.moveTo(x - 22, gy - 138); ctx.lineTo(x + 22, gy - 114); ctx.lineTo(x - 22, gy - 114); ctx.closePath(); ctx.fill();
    ctx.fillStyle = Cc.stoneDk; ctx.save(); ctx.translate(x - 2, gy - 132); ctx.rotate(0.5); rr(-9, -5, 18, 9, 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#ff5f6d'; ctx.fillRect(x + 12, gy - 144, 5, 13); circle(x + 14.5, gy - 126, 2.8); ctx.fill();
  }
  // the builders' poles at the circle
  if (see(XH + 75, 400)) { tthHengePole(XH - 52, gyH, gyH - 256); tthHengePole(XH + K.fin.gapX + 52, gyH, gyH - 256); }
  tthHengeGround(st, vx0, vx1);
  // grass tufts, flowers and chalk pebbles
  for (let i = Math.floor(vx0 / 36); i <= Math.floor(vx1 / 36); i++) {
    const h = hash(i, 77), x = i * 36 + ((h >>> 8) % 28), kind = h % 6;
    if (kind > 3 || (x > B.x0 - 20 && x < B.x1 + 20)) continue;
    const gy = tthHengeBase(x);
    if (kind < 2) {
      ctx.strokeStyle = kind ? Cc.grassLt : Cc.grassDk; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - 4, gy + 6); ctx.lineTo(x - 6, gy - 5); ctx.moveTo(x, gy + 6); ctx.lineTo(x, gy - 8); ctx.moveTo(x + 4, gy + 6); ctx.lineTo(x + 7, gy - 4); ctx.stroke();
    } else if (kind === 2) {
      ctx.strokeStyle = Cc.grassDk; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, gy + 4); ctx.lineTo(x, gy - 8); ctx.stroke();
      ctx.fillStyle = (h >>> 5) % 3 === 0 ? '#ff7a8a' : (h >>> 5) % 3 === 1 ? '#ffffff' : '#ffd23f'; circle(x, gy - 10, 3.6); ctx.fill();
      ctx.fillStyle = '#ffb400'; circle(x, gy - 10, 1.4); ctx.fill();
    } else { ctx.fillStyle = '#d2c59c'; ctx.beginPath(); ctx.ellipse(x, gy + 52 + ((h >>> 12) % 50), 5 + (h >>> 4) % 5, 3.5, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  // the stream: water running toward us, the 3 places of the log road
  if (see(B.x0 + 45, 140)) {
    const by = tthHengeBase(B.x0), bot = cam.y + H + 14;
    ctx.fillStyle = Cc.water; ctx.beginPath(); ctx.moveTo(B.x0 - 3, by + 4); ctx.lineTo(B.x1 + 3, by + 4); ctx.lineTo(B.x1 + 30, bot); ctx.lineTo(B.x0 - 30, bot); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = Cc.waterLt; ctx.lineWidth = 3;
    for (let k = 0; k < 7; k++) { const u = ((t * 0.35 + k / 7) % 1), y = by + 8 + u * (bot - by - 8), x = B.x0 + 12 + ((k * 37) % 66) + (u - 0.5) * ((k % 3) - 1) * 30; ctx.globalAlpha = 0.9 - u * 0.5; ctx.beginPath(); ctx.moveTo(x - 9 - u * 6, y); ctx.lineTo(x + 9 + u * 6, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(B.x0 - 3, by + 4); ctx.lineTo(B.x0 - 30, bot); ctx.moveTo(B.x1 + 3, by + 4); ctx.lineTo(B.x1 + 30, bot); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const x = B.at[i].x;
      if (B.slots[i]) { const d = Math.min(1, B.dropT[i] / 0.3); tthHengeDrawLog(x, by - 6 - (1 - d) * 18 + Math.sin(d * Math.PI) * 3, i * 1.3, false, 13); }
      else { ctx.save(); ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 14; ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2.5; circle(x, by - 2, 12); ctx.stroke(); ctx.restore(); }
    }
  }
  // mud puddles
  for (const m of ph.mud) {
    if (!see(m.x)) continue;
    const gy = tthHengeBase(m.x);
    ctx.fillStyle = Cc.mud; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(m.x, gy + 3, 30, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = Cc.mudLt; ctx.beginPath(); ctx.ellipse(m.x - 9, gy + 1.5, 11, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    if (m.fed) {
      const k = Math.min(1, m.t / 0.6);
      tthHengeDrawLog(m.x, gy - 9 + k * 9, 0.6, false);
      ctx.fillStyle = Cc.mud; ctx.beginPath(); ctx.ellipse(m.x, gy + 5, 29, 6, 0, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(m.x, gy + 3, 30, 8, 0, 0, Math.PI); ctx.stroke();
    } else {
      for (let k = 0; k < 3; k++) { const u = (t * 0.7 + k * 0.37) % 1, bx = m.x - 16 + k * 15; ctx.strokeStyle = Cc.mudLt; ctx.lineWidth = 2; circle(bx, gy + 1 - u * 5, 1.5 + u * 3.5); ctx.globalAlpha = 1 - u; ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
  }
  // piles of spare logs
  for (const q of ph.piles) {
    if (!see(q.x)) continue;
    const gy = tthHengeBase(q.x), r = 9;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(q.x - 31, gy + 2); ctx.lineTo(q.x - 27, gy - 26); ctx.moveTo(q.x + 31, gy + 2); ctx.lineTo(q.x + 27, gy - 26); ctx.stroke();
    ctx.strokeStyle = Cc.woodDk; ctx.lineWidth = 3.5; ctx.stroke();
    for (let row = 0; row < 3; row++) for (let k = 0; k < 3 - row; k++) tthHengeDrawLog(q.x - (2 - row) * r + k * r * 2, gy - r - row * 15.5, row * 2 + k * 1.1, false);
  }
  // rest posts with their flags
  for (let i = 0; i < 2; i++) {
    const x = K.posts[i] + S.hw + 16;
    if (!see(x)) continue;
    const gy = tthHengeBase(x), up = ph.leg > i;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x, gy + 2); ctx.lineTo(x, gy - 112); ctx.stroke(); ctx.strokeStyle = Cc.wood; ctx.lineWidth = 6; ctx.stroke();
    // (rich props pass 2) a lit side, a shaded side and bark ridges on the post
    ctx.fillStyle = 'rgba(255,240,210,0.4)'; ctx.fillRect(x - 3, gy - 112, 1.4, 113);
    ctx.fillStyle = 'rgba(40,20,10,0.28)'; ctx.fillRect(x + 1.4, gy - 112, 1.6, 113);
    ctx.strokeStyle = TTA.rgba(Cc.woodDk, 0.8); ctx.lineWidth = 0.9; ctx.beginPath();
    for (let k = 0; k < 7; k++) { const yy = gy - 104 + k * 15 + (hash(k, i + 3) % 6); ctx.moveTo(x - 1 + (k % 2), yy); ctx.lineTo(x - 0.5 + (k % 2), yy + 7); }
    ctx.stroke();
    ctx.strokeStyle = Cc.rope; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 4, gy - 30); ctx.lineTo(x + 4, gy - 26); ctx.moveTo(x - 4, gy - 22); ctx.lineTo(x + 4, gy - 18); ctx.stroke();
    const fy = up ? gy - 110 : gy - 70, wv = Math.sin(t * 5 + i) * 4;
    ctx.fillStyle = up ? C.gold : '#ffffff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x + 3, fy); ctx.quadraticCurveTo(x + 22, fy + 2 + wv, x + 42, fy + 13); ctx.quadraticCurveTo(x + 22, fy + 18 - wv, x + 3, fy + 26); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink; circle(x + 13, fy + 13, 2.6); ctx.fill(); if (i) { circle(x + 21, fy + 13, 2.6); ctx.fill(); }
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; circle(x, gy - 116, 6); ctx.fill(); ctx.stroke();
  }
  // chocks: wooden wedges that flip up behind the stone on the hills
  for (const c of ph.chocks) {
    const x = c.x - S.hw - 3;
    if (!see(x)) continue;
    const gy = tthHengeBase(x), gold = ph.gold.chock, k = c.up ? Math.min(1, c.t / 0.14) : 0;
    ctx.save(); ctx.translate(x, gy + 1);
    if (!c.up) ctx.globalAlpha = 0.45; else ctx.scale(1, 0.4 + 0.6 * k + Math.sin(k * Math.PI) * 0.3);
    ctx.fillStyle = gold ? C.gold : Cc.woodLt; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-26, 0); ctx.lineTo(0, c.up ? -19 : -7); ctx.closePath(); ctx.fill();
    // (rich props pass 2) grain along the wedge, a lit slope, a shaded back and end grain
    ctx.save(); ctx.clip();
    ctx.strokeStyle = TTA.rgba(gold ? C.goldDark : Cc.woodDk, 0.55); ctx.lineWidth = 1; ctx.beginPath();
    for (const f of [0.25, 0.5, 0.75]) { const hy = (c.up ? -19 : -7) * f; ctx.moveTo(-24 * (1 - f) - 1, hy + 0.5); ctx.quadraticCurveTo(-12 * (1 - f), hy - 0.6, -1, hy + 0.3); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(40,20,10,0.22)'; ctx.fillRect(-4, -20, 4, 21);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-22, -1.6); ctx.lineTo(-2, c.up ? -17 : -6); ctx.stroke();
    ctx.strokeStyle = mixHex(gold ? '#a8761c' : Cc.woodDk, '#1c1a36', 0.45); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-26, 0); ctx.lineTo(0, c.up ? -19 : -7); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }
  // the hole for the last stone, with its heap of dug-out chalk
  if (see(XH, 200)) {
    ctx.fillStyle = Cc.chalk; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(XH + 32, gyH + 1); ctx.quadraticCurveTo(XH + 52, gyH - 24, XH + 74, gyH + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (S.tip < 1) { ctx.fillStyle = '#4a3f38'; ctx.beginPath(); ctx.ellipse(XH, gyH + 4, 36, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    // the upright that already stands (its partner)
    tthHengeDrawStone(XH + K.fin.gapX, gyH - K.fin.upH / 2, Math.PI / 2, K.fin.upH / 2, 27, false);
    // the timber crib that props the lintel on its way up
    if (F.notch > 0) {
      const top = gyH - F.notch * (K.fin.upH - 4);
      for (let y = gyH - 9, n = 0; y > top; y -= 13, n++) tthHengeCribBeam(XH + 75 - 22 + (n % 2) * 4, y - 6, n);
    }
  }
}
function tthHengeDraw(st) {
  const ph = st.ph, K = TTHHENGE, Cc = TTHHENGEC, S = ph.stone, F = ph.fin, c = st.thief, t = G.clock, cam = st.cam, r = K.log.r;
  const XH = ph.XH, gyH = tthHengeBase(XH), gyS = tthHengeBase(S.x), ps = G.players;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // the logs: on the ground (under the stone too), falling, in his claw
  for (const l of ph.logs) {
    if (l.s === 'ground') {
      if (l.x < cam.x - 30 || l.x > cam.x + W + 30) continue;
      const hop = l.pop > 0 ? Math.sin((1 - l.pop / 0.35) * Math.PI) * 9 : 0;
      tthHengeDrawLog(l.x, tthHengeG(ph, l.x) - r - hop, l.rot, tthHengeGoldLog(ph, l));
    } else if (l.s === 'fall') tthHengeDrawLog(l.x, l.y, l.rot, tthHengeGoldLog(ph, l));
    else if (l.s === 'claw') { const q = tthThiefPts(c).claw; tthHengeDrawLog(q.x, q.y + 8, Math.sin(t * 3) * 0.5, tthHengeGoldLog(ph, l)); }
  }
  // the great stone: lying on its rollers (it follows the hill, its nose dips with no log in front), then tipping in
  const a0 = -Math.atan((tthHengeBase(S.x - 70) - tthHengeBase(S.x + 70)) / 140) + S.dip * 0.085, cy0 = gyS - K.stone.lift - K.stone.h / 2 + S.dip * 3;
  if (S.tip <= 0) tthHengeDrawStone(S.x, cy0, a0, S.hw, K.stone.h / 2, false);
  else {
    const u = S.tip;
    tthHengeDrawStone(S.x + (XH - S.x) * u, cy0 + (gyH - 54 - cy0) * u - Math.sin(u * Math.PI) * 26, a0 + (Math.PI / 2 - a0) * u, S.hw, K.stone.h / 2, false);
    tthHengeGround(st, XH - 60, XH + 60, true);    // its foot is down in the hole
    if (u >= 1) { ctx.fillStyle = '#4a3f38'; ctx.beginPath(); ctx.ellipse(XH, gyH + 2.5, 33, 3.5, 0, 0, Math.PI); ctx.fill(); }
  }
  // the lasso
  const Z = ph.lasso;
  if (Z) {
    const P = tthThiefPts(c), top = tthHengeTop(S.x), bx = S.x - S.hw + 40;
    if (!Z.on) {   // the loop spins over his head, then flies to the stone
      const u = Z.fly, hx = P.head.x + c.face * 16, hy = P.head.y - 30, lx = hx + (bx - hx) * u, ly = hy - 16 + (top - 2 - (hy - 16)) * u - Math.sin(u * Math.PI) * 44, a = t * 13;
      tthHengeRope(hx, hy + 12, lx, ly, 6, 3);
      ctx.beginPath(); ctx.ellipse(lx, ly, 30 + Math.sin(a) * 7, 9 + Math.cos(a) * 3, Math.sin(a * 0.5) * 0.25, 0, Math.PI * 2);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 5.5; ctx.stroke(); ctx.strokeStyle = Cc.rope; ctx.lineWidth = 3; ctx.stroke();
    } else {
      const fx = S.x + S.hw, jig = Math.sin(t * 40) * (Z.n ? 1.5 : 0.5);
      tthHengeRope(P.claw.x, P.claw.y, bx, top + 3 + jig, Z.n === 2 ? -3 : 4, 3.5);
      tthHengeRope(bx, top - 1, bx - 4, gyS - K.stone.lift + 1, 0, 4);
      tthHengeRope(bx, top + 2, fx - 10, top + 4, 2, 3.5);
      let held = false;
      for (const p of ps) {   // (draw hooks: p.x / p.y are screen coords)
        if (!ph.P[p.id].haul || p.x + cam.x + p.w / 2 <= fx) continue;
        held = true; tthHengeRope(fx - 10, top + 4, p.x + cam.x + p.w / 2 - 6, p.y + cam.y + p.h * 0.55, 3 + jig, 3.5);
      }
      if (!held) { const ex = fx + 74; tthHengeRope(fx - 10, top + 4, ex, tthHengeG(ph, ex) - 4, 30, 3.5); ctx.fillStyle = Cc.rope; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(ex, tthHengeG(ph, ex) - 5, 4.5); ctx.fill(); ctx.stroke(); }
    }
  }
  // sheep
  for (const s of ph.sheep) if (s.x > cam.x - 60 && s.x < cam.x + W + 60) tthHengeDrawSheep(s, tthHengeG(ph, s.x));
  // the lintel on its timber crib, the ropes over the poles and the two gold rings
  if (XH - 300 < cam.x + W && XH + 500 > cam.x) {
    const lb = gyH - 40 - F.lift * (K.fin.upH - 40), lt = lb - K.fin.linH, live = F.stage === 2;
    if (F.notch <= 0) for (let y = gyH - 9, n = 0; y > gyH - 40; y -= 13, n++) tthHengeCribBeam(XH + 75 - 22 + (n % 2) * 4, y - 6, n);
    tthHengeDrawStone(XH + 75, lb - K.fin.linH / 2, F.stage === 3 ? Math.sin(Math.min(1, F.t / 0.3) * Math.PI) * 0.012 : 0, K.fin.linW / 2, K.fin.linH / 2, false);
    for (let i = 0; i < 2; i++) {
      const ax = i ? XH + K.fin.gapX + 52 : XH - 52, ay = gyH - 254, rx = ph.rings[i].x, held = ph.P[0].rope === i || ph.P[1].rope === i;
      if (F.stage < 3) tthHengeRope(ax, ay, i ? XH + 175 : XH - 25, lt + 3, 0, 3);
      const ry = held ? gyH - 34 + Math.sin(t * 9 + i) * 2.5 : gyH - 64 + Math.sin(t * 2 + i * 2) * 3;
      tthHengeRope(ax, ay, rx, ry - 9, held ? 0 : (i ? -8 : 8), 3);
      if (live && !held) { ctx.fillStyle = 'rgba(255,197,61,' + (0.25 + 0.2 * Math.sin(t * 6)) + ')'; circle(rx, ry, 17); ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.ellipse(rx, gyH + 5, 22, 5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 7.5; circle(rx, ry, 9); ctx.stroke(); ctx.strokeStyle = live || F.stage === 3 ? C.gold : Cc.ropeDk; ctx.lineWidth = 4; ctx.stroke();
    }
  }
}
function tthHengeChevron(x, y, col, s = 1) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - 7 * s, y - 6 * s); ctx.lineTo(x, y); ctx.lineTo(x + 7 * s, y - 6 * s);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 7 * s; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 3.5 * s; ctx.stroke();
}
function tthHengeGhost(x, y, col, t) {
  ctx.save(); ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 16;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 5; circle(x, y, 11); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.restore();
  tthHengeChevron(x, y - 17 - Math.abs(Math.sin(t * 5)) * 6, col);
}
function tthHengeDrawTop(st) {
  const ph = st.ph, K = TTHHENGE, Cc = TTHHENGEC, S = ph.stone, F = ph.fin, th = ph.th, t = G.clock, cam = st.cam, ps = G.players, B = ph.brook;
  const big = tthBig(), z = big ? 1.35 : 1, ro = 1 - ph.pusher, PR = ph.P[ro], r = K.log.r;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // carried logs (over the head)
  for (const p of ps) {
    const l = ph.P[p.id].log;
    if (l && p.alive) tthHengeDrawCarry(p.x + cam.x + p.w / 2, p.y + cam.y - 12 - (p.sy - 1) * 12, tthHengeGoldLog(ph, l), p.face || 1, Math.sin(t * 9) * (Math.abs(p.vx) > 30 ? 0.07 : 0.02) - 0.06);
  }
  // wading in the stream: the water in front of the feet
  if (!B.done && (ph.P[0].wet || ph.P[1].wet)) { const by = tthHengeBase(B.x0); ctx.fillStyle = 'rgba(95,184,232,0.62)'; ctx.fillRect(B.x0 - 2, by + 5, B.x1 - B.x0 + 4, B.depth - 3); }
  if (F.stage === 0 && G.introT <= 0 && !st.cut) {
    const top = tthHengeTop(S.x), nose = S.x + S.hw, col = PCOL[ro], calmNow = st.celebT > 0;
    if (PR.log) {
      // where the carried log will land: a place in the stream, or just ahead of the nose
      const spot = tthHengeSpot(ph), i = B.slots.indexOf(false);
      if (!B.done && i >= 0 && (spot > B.x0 - 14 || Math.abs(ps[ro].x + cam.x - B.x0) < 260)) tthHengeGhost(B.at[i].x, tthHengeBase(B.x0) - 2, col, t);
      else tthHengeGhost(spot, tthHengeG(ph, spot) - r, col, t);
    } else if (!calmNow) {
      // free logs the roller can grab
      for (const l of ph.logs) if (tthHengeFree(ph, l) && l.lock <= 0 && l.x > cam.x && l.x < cam.x + W && (l.x < S.x || S.block === 'log')) tthHengeChevron(l.x, tthHengeG(ph, l.x) - r * 2 - 8 - Math.abs(Math.sin(t * 5 + l.x)) * 6, col);
      for (const q of ph.piles) if (q.x > cam.x && q.x < cam.x + W && (q.bridge ? !B.done : tthHengeLive(ph) < tthHengeMaxLogs(ph))) tthHengeChevron(q.x, tthHengeBase(q.x) - 58 - Math.abs(Math.sin(t * 5)) * 6, col, 1.2);
      if (S.block === 'log') { const spot = tthHengeSpot(ph); tthHengeGhost(spot, tthHengeG(ph, spot) - r, '#ffffff', t); }
    }
    // the nose: no log in front (or the last one nearly spent)
    let ahead = false;
    for (const l of ph.logs) if (l.s === 'ground' && l.x > S.x + S.hw + K.log.hi && l.x < S.x + S.hw + K.log.hi + 70) ahead = true;
    const spent = S.block === 'log' || (S.sup && S.sup.s !== 'bridge' && S.left < 56 && !ahead && S.block === '');
    if (spent && (S.block === 'log' || Math.sin(t * 16) > -0.3)) bigText('!', nose + 4, top - 18 - Math.abs(Math.sin(t * 10)) * 5, 30 * z, S.block === 'log' ? '#ff5f6d' : C.gold, 1);
    // the runaway
    if (S.run && S.grade === -1 && S.v > 60) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; for (let k = 0; k < 3; k++) { const y = top + 12 + k * 18, x = S.x - S.hw - 10 - ((t * 240 + k * 23) % 40); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 26, y + 3); ctx.stroke(); } }
  }
  // the claw's target, and the log it dangles
  if (th.mode === 'pinch' && th.log && (th.sub === 'aim' || th.sub === 'reach')) {
    const L = th.log, y = tthHengeG(ph, L.x) - r, q = tthThiefPts(st.thief).claw, k = 1 + Math.sin(t * 14) * 0.12;
    ctx.save(); ctx.strokeStyle = '#ff5f6d'; ctx.lineWidth = 3; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(q.x, q.y + 6); ctx.lineTo(L.x, y - 12); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 7; circle(L.x, y, 19 * k); ctx.stroke(); ctx.strokeStyle = '#ff5f6d'; ctx.lineWidth = 4; ctx.stroke();
  } else if (th.mode === 'hold' && th.log) {
    const q = tthThiefPts(st.thief).claw;
    ctx.save(); ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 18; ctx.strokeStyle = C.gold; ctx.lineWidth = 3.5; circle(q.x, q.y + 8, 22 + Math.sin(t * 8) * 2); ctx.stroke(); ctx.restore();
  }
  // the tug of war
  const Z = ph.lasso;
  if (Z && Z.on) {
    const w = 160 * z, h = 14 * z, x = clamp(S.x, cam.x + w / 2 + 40, cam.x + W - w / 2 - 40), y = tthHengeTop(S.x) - 46 - h;
    ctx.fillStyle = 'rgba(30,20,66,0.88)'; rr(x - w / 2 - 5, y - 5, w + 10, h + 10, (h + 10) / 2); ctx.fill();
    ctx.fillStyle = Z.n === 2 ? C.gold : '#ff9a5a'; rr(x - w / 2, y, Math.max(h, w * clamp(Z.m, 0, 1)), h, h / 2); ctx.fill();
    for (const p of ps) { ctx.globalAlpha = ph.P[p.id].haul ? 1 : 0.35; ctx.fillStyle = PCOL[p.id]; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; circle(x + (p.id ? 1 : -1) * (w / 2 + 18 * z), y + h / 2, 8 * z); ctx.fill(); ctx.stroke(); }
    ctx.globalAlpha = 1;
    bigText(Z.n === 2 ? 'HEAVE!' : 'Both haul!', x, y - 17 * z, 19 * z, Z.n === 2 ? C.gold : '#ffffff', Z.n === 2 ? 1 + Math.sin(t * 14) * 0.05 : 1);
  }
  // the lintel meter (down in the chalk, under the trilithon)
  if (F.stage === 2) {
    const gy = tthHengeBase(ph.XH), w = 230 * z, h = 15 * z, x = ph.XH + 75, y = gy + 44;
    ctx.fillStyle = 'rgba(30,20,66,0.88)'; rr(x - w / 2 - 5, y - 5, w + 10, h + 10, (h + 10) / 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; for (let k = 1; k < 3; k++) ctx.fillRect(x - w / 2 + w * k / 3 - 1, y, 2, h);
    ctx.fillStyle = F.both ? C.gold : '#ff9a5a'; rr(x - w / 2, y, Math.max(h, w * F.lift), h, h / 2); ctx.fill();
    for (const p of ps) { ctx.globalAlpha = ph.P[p.id].rope >= 0 ? 1 : 0.35; ctx.fillStyle = PCOL[p.id]; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; circle(x + (p.id ? 1 : -1) * (w / 2 + 18 * z), y + h / 2, 8 * z); ctx.fill(); ctx.stroke(); }
    ctx.globalAlpha = 1;
    bigText(F.both ? 'Heave! ' + Math.round(F.lift * 100) + '%' : 'Both hold a gold ring!', x, y - 17 * z, 18 * z, F.both ? C.gold : '#ffffff', 1);   // above the meter: the route bar of the HUD sits just under it
  }
  // the gold arrow of the stuck help
  if (ph.arrow) {
    const a = ph.arrow, y = a.y - Math.abs(Math.sin(t * 5)) * 10, s = z;
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(a.x, y); ctx.lineTo(a.x - 15 * s, y - 17 * s); ctx.lineTo(a.x - 6 * s, y - 17 * s); ctx.lineTo(a.x - 6 * s, y - 36 * s); ctx.lineTo(a.x + 6 * s, y - 36 * s); ctx.lineTo(a.x + 6 * s, y - 17 * s); ctx.lineTo(a.x + 15 * s, y - 17 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}
// the way so far: a little track at the bottom (start, the 2 rest posts, the circle)
function tthHengeHud(st) {
  const ph = st.ph, K = TTHHENGE, S = ph.stone, big = tthBig(), z = big ? 1.3 : 1;
  if (G.introT > 0) return;
  const w = 280 * z, x0 = W / 2 - w / 2 - 8, h = 9 * z, y = H - 15 * z, u = x => clamp((x - K.start) / (K.endX - K.start), 0, 1);
  ctx.save(); if (tthUnder(x0 - 22, y - 22 * z, x0 + w + 40, y + 12 * z)) ctx.globalAlpha = 0.4;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(30,20,66,0.82)'; rr(x0 - 16, y - h / 2 - 6, w + 52 * z, h + 12, (h + 12) / 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; rr(x0, y - h / 2, w, h, h / 2); ctx.fill();
  ctx.fillStyle = C.gold; rr(x0, y - h / 2, Math.max(h, w * u(S.x)), h, h / 2); ctx.fill();
  for (let i = 0; i < 2; i++) {
    const px = x0 + w * u(K.posts[i]), up = ph.leg > i;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, y + h / 2); ctx.lineTo(px, y - 15 * z); ctx.stroke();
    ctx.fillStyle = up ? C.gold : '#ffffff'; ctx.beginPath(); ctx.moveTo(px + 1, y - 15 * z); ctx.lineTo(px + 10 * z, y - 11 * z); ctx.lineTo(px + 1, y - 7 * z); ctx.closePath(); ctx.fill();
  }
  // the circle at the end: a tiny trilithon
  const tx = x0 + w + 12 * z, col = st.ph.fin.stage === 3 ? C.gold : '#c3cad0';
  ctx.fillStyle = col; ctx.fillRect(tx, y - 7 * z, 5 * z, 13 * z); ctx.fillRect(tx + 11 * z, y - 7 * z, 5 * z, 13 * z); ctx.fillRect(tx - 2 * z, y - 11 * z, 20 * z, 5 * z);
  // the stone
  const sx = x0 + w * u(S.x);
  ctx.fillStyle = TTHHENGEC.stoneLt; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(sx - 10 * z, y - 6 * z, 20 * z, 12 * z, 3.5 * z); ctx.fill(); ctx.stroke();
  ctx.restore();
}

/* ---------- sounds ---------- */
Sfx.extra.tthHengeRoll = function () { this.tone(74, 0.1, 'triangle', 0.04, 52); };
Sfx.extra.tthHengeCreak = function () { this.tone(210, 0.16, 'sawtooth', 0.016, 130); };
Sfx.extra.tthHengeThud = function () { this.tone(96, 0.22, 'triangle', 0.08, 42); this.tone(58, 0.3, 'sine', 0.06, 34, 0.02); };
Sfx.extra.tthHengeThunk = function () { this.tone(72, 0.45, 'triangle', 0.09, 30); this.tone(150, 0.18, 'square', 0.03, 52); this.tone(46, 0.5, 'sine', 0.07, 28, 0.05); };
Sfx.extra.tthHengeChock = function () { this.tone(430, 0.05, 'square', 0.03, 300); this.tone(250, 0.07, 'triangle', 0.045, null, 0.04); };
Sfx.extra.tthHengePop = function () { this.tone(360, 0.07, 'triangle', 0.04, 640); };
Sfx.extra.tthHengeGrab = function (p) { this.tone(420 * p, 0.06, 'triangle', 0.05, 640 * p); };
Sfx.extra.tthHengeDrop = function (p) { this.tone(520 * p, 0.07, 'triangle', 0.05, 300 * p); };
Sfx.extra.tthHengeLand = function () { this.tone(190, 0.07, 'triangle', 0.05, 110); this.tone(300, 0.04, 'square', 0.02, null, 0.03); };
Sfx.extra.tthHengeNope = function () { this.tone(200, 0.07, 'square', 0.025, 160); this.tone(160, 0.09, 'square', 0.025, 130, 0.08); };
Sfx.extra.tthHengeGlub = function () { [240, 180, 130].forEach((f, i) => this.tone(f, 0.14, 'sine', 0.06, f * 0.6, i * 0.12)); };
Sfx.extra.tthHengeSplash = function () { this.tone(900, 0.1, 'triangle', 0.025, 400); this.tone(1400, 0.08, 'sine', 0.02, 700, 0.04); };
Sfx.extra.tthHengeBaa = function () { for (let k = 0; k < 4; k++) this.tone(520 - k * 14 + (k % 2) * 36, 0.09, 'sawtooth', 0.022, 470, k * 0.08); };
Sfx.extra.tthHengeWhack = function () { this.tone(820, 0.05, 'square', 0.05, 260); this.tone(180, 0.12, 'triangle', 0.06, 80, 0.02); };
Sfx.extra.tthHengeSwoop = function () { this.tone(980, 0.3, 'sine', 0.035, 300); };
Sfx.extra.tthHengeYoink = function () { this.tone(300, 0.14, 'square', 0.035, 900); this.tone(900, 0.1, 'triangle', 0.035, 1300, 0.12); };
Sfx.extra.tthHengeWhirl = function () { for (let k = 0; k < 6; k++) this.tone(500 + (k % 2) * 180, 0.12, 'sine', 0.028, 700 - (k % 2) * 180, k * 0.2); };
Sfx.extra.tthHengeTaut = function () { this.tone(150, 0.2, 'sawtooth', 0.04, 420); this.tone(90, 0.25, 'triangle', 0.06, 60, 0.05); };
Sfx.extra.tthHengeHeave = function () { this.tone(170, 0.16, 'sawtooth', 0.03, 250); this.tone(250, 0.12, 'triangle', 0.035, 190, 0.1); };
Sfx.extra.tthHengeSnap = function () { this.tone(1500, 0.07, 'square', 0.05, 240); this.tone(240, 0.3, 'sawtooth', 0.035, 900, 0.05); [659, 880, 1175].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.045, null, 0.2 + i * 0.07)); };
Sfx.extra.tthHengeFlag = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };

/* ---------- the room ---------- */
tthRoom('henge', {
  jobs: {
    pusher: { title: 'Stone pusher', act: ['shoo', 'pull'], legend: '<kbd>A</kbd><kbd>D</kbd> move, push <kbd>W</kbd> jump',
      howTo: ['Push the stone while a log is under its front. Shoo sheep and the claw.'] },
    logs: { title: 'Log mover', act: ['grab', 'drop', 'pull'], legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump',
      howTo: ['Grab a log behind the stone, hop over it and drop the log in front.'] },
  },
  act: { label: 'grab', labels: ['grab', 'shoo'] },
  tip: 'One pushes the giant stone. The other carries each log from the back to the front. Swap at every post!',
  legend: { pip: '<kbd>A</kbd><kbd>D</kbd> move · push <kbd>W</kbd> jump', bo: '<kbd>←</kbd><kbd>→</kbd> move · push <kbd>↑</kbd> jump', padJump: 'jump', padDown: 'left / right: walk, push, haul' },
  map: TTH_EMPTY_MAP,
});
