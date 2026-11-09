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
   who pushes first).
   - The PUSHER leans on the stone: hold toward it at its back end (hold right). 46 px/s on the flat, 36 uphill.
     The pusher's action button is "shoo" (sheep, the Thief's claw). The pusher can't carry logs.
   - The ROLLER fetches logs: the action GRABS a log lying free on the ground (within 40 px), then hop up on the stone
     (it is 72 px tall: a normal full jump), run along its top and press the action again on its front third or on the
     ground in front: the log DROPS just ahead of the nose (it always snaps to the best spot, 12 px ahead of the stone
     or 40 px past a log already lying there). The roller's pushing does nothing.
     Each log dropped in front buys about 200 px of rolling, so a leg needs 5-7 trips.
   - Both: the action also SHOOS a sheep (within 64 px) and WHACKS the Thief's claw (within 74 px). Players pass
     through each other; the stone is solid (walk on top of it, ride it).
   HILLS.
   - UPHILL (legs 1 and 3): if the pusher lets go for more than 0.35 s the stone rolls BACK (slowly at first), down
     to the last chock (wooden wedges that flip up behind the stone every 150-170 px, and every rest post): a
     counted team bump "Rolled back!" once it has lost 50 px. So the pusher holds while the roller hurries.
   - DOWNHILL (leg 3): pushed over the crest, the stone RUNS AWAY (22 px/s² up to 130 px/s). The pusher hops over
     it and brakes from the FRONT: hold toward the stone there (hold left) and it eases down at 56 px/s. A stone
     that stops on the downhill only starts again when the pusher eases it from the front (or shoves it from behind),
     so it never rolls anywhere by itself. A runaway that outruns its logs faster than 80 px/s: "Runaway! Thud!"
     (team bump), it stops there.
   THINGS ON THE WAY.
   - MUD (legs 2 and 3): a bubbling puddle swallows the first log that rolls or drops onto it ("Glub!"; after that
     it is plugged). A pile of spare logs stands just past it: the roller grabs one there (never more than 4 logs
     in play, 5 with gold help).
   - SHEEP (legs 2 and 3) wander in from the right (3 s on screen before they stand still) and graze on the track:
     the stone stops in front of them ("Baa!"). Shoo them with the action. A runaway stone makes them hop off.
   - THE STREAM (leg 2): the stone stops at the bank until 3 logs from the pile beside it are laid in the water as
     a log road (drop a carried log near the stream: it goes into the next free place). Players can wade.
   THE THIEF (jet machine, on screen all era; his claw is empty: here the stolen thing is the giant stone itself).
   - Opening gag: he tugs at the stone ("25 tons?!").
   - CLAW PINCH (leg 1 once, leg 3 once): he swoops over a log lying free behind the stone (1.0 s aiming with a red
     ring on the log and "!" over both players), then lowers the claw (0.75 s). Save the log by grabbing it first
     (roller) or whack the claw (either player). If he gets it: "Yoink!" (team bump); he dangles it low behind the
     stone for 6.5 s: whack the claw (stand under it, action) and he drops it; otherwise he drops it himself
     ("Butterfingers!"), so a log is never lost for good.
   - LASSO (leg 2 once, leg 3 once, on flat ground): he swings a lasso for 1.4 s ("Lasso time!", "!" over both),
     ropes the stone and tows it BACKWARD. Both players haul against him: hold AWAY from him (right) on the ground
     near the stone (the pusher pushes, anyone in front grabs the rope tail). Both hauling fills the tug bar in
     about 2.4 s: SNAP, he tumbles away. One hauling: the stone creeps back; nobody: it is towed at 34 px/s. Towed
     170 px, or 10 s without winning: the rope slips off ("Towed back!", team bump).
   - He never starts anything during cards, celebrations or while nobody plays (tthCalm), and the stone never rolls
     back then.
   THE WINNING BEAT. At the circle the stone tips into its hole by itself (THUNK, it stands upright). Then the lintel
   must go on top: a gold rope ring hangs at each side; each player stands at one and HOLDS the action. The lintel
   rises only while BOTH hold (about 4.6 s; it sinks slowly otherwise, but never below the last third: props click
   in). CLONK: the trilithon is complete, the Thief tugs at it in vain and tthPhaseDone() runs.
   GOLD HELP (always announced with tthHelp):
   - 3 thuds in one leg: a gold 5th log joins the rotation.
   - 3 roll-backs on the same hill: gold chocks, the stone can't roll back on that hill any more.
   - 2 runaway thuds: a gold brake (the runaway is slower than the skid speed).
   - 2 yoinks: his claw is slower (1.5 x the telegraph).   - A lost lasso: his next rope is frayed (snaps in 1.3 s).
   - 16 s without the stone moving forward (12 s at the ropes): gold hints over whoever must act, and a gold arrow.
   FAIRNESS. Every hazard is telegraphed 0.6 s or more; nobody is ever hit (all soft fails are team bumps: Rolled
   back, Runaway, Yoink, Towed back); a fail costs a few seconds (a roll back to the chock), never the era.
   CONTROLS. Left / right walk (and push, brake, haul), up jumps, the action grabs / drops / shoos / whacks / pulls.
   Nothing needs two directions at once or fast tapping. Hints name each player's own keys (tthKey).
   Stats (st.stats.henge): legT[], thuds, rollbacks, skids, yoinks, whacks, shoos, lasso [won, lost], carried [pip,
   bo]. Every top-level name starts with tthHenge / TTHHENGE (Sfx.extra.tthHenge*). State lives in st.ph. */
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
  stone: { hw: 96, h: 54, lift: 18, pushV: 46, upV: 36, easeV: 56, runPush: 60, acc: 240, stop: 340, brakeA: 170,
    backA: 55, backV: 85, grace: 0.35, runA: 22, runV: 130, goldRunV: 76, skidV: 80, coast: 70, slope: 0.05, backBump: 50 },
  log: { r: 9, n: 4, gold: 5, reach: 40, lock: 0.5, gap: 40, ahead: 12, far: 220, lo: 4, hi: 16, topDrop: 56, freeT: 0.7 },
  sheep: { v: 80, flee: 330, reach: 64, gap: 24 },
  thief: { s: 0.62, homeX: 800, homeY: 226, aimT: 1.0, reachT: 0.75, lowY: 49, holdY: 98, holdT: 6.5, whackX: 74, whackY: 135 },
  lasso: { windT: 1.4, win: 3.7, goldWin: 2.0, m0: 0.35, tow0: 34, tow1: 8, towMax: 170, towT: 10, reach: 360 },
  fin: { tipT: 1.3, liftT: 4.6, sink: 0.1, ringR: 46, upH: 150, linW: 224, linH: 38, gapX: 150 },
  goldThuds: 3, goldBacks: 3, goldSkids: 2, goldYoinks: 2, stuckT: 16, stuckRopeT: 12,
};
// what happens where (stone-centre x): the Thief's mischief and the sheep
const TTHHENGE_SCRIPT = [
  { at: 560, kind: 'pinch' },
  { at: 1660, kind: 'sheep', to: [1970] },
  { at: 1830, kind: 'lasso' },
  { at: 2060, kind: 'sheep', to: [2398] },
  { at: 2720, kind: 'pinch' },
  { at: 2840, kind: 'sheep', to: [3128, 3166] },
  { at: 3790, kind: 'lasso' },
];
const TTHHENGE_FACTS = ['True: each great stone weighs about 25 tons, as much as 4 elephants!', 'True: the stones came about 25 km with no wheels. Nobody knows exactly how!'];
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
    if (B.n >= 3) { B.done = true; tthNews(st, 'The log road is ready. Roll the stone across!', false, 3); Sfx.play('tthDing'); tthHengeDone(st, 0, ['stream', 'bridge', 'bank']); tthHengeDone(st, 1, ['stream', 'bridge', 'bank']); }
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
    if ((Z.heaveT -= dt) <= 0) { Z.heaveT = 0.55; tthPop(st, S.x + S.hw + 40, tthHengeTop(S.x) - 30, 'Heave!', C.gold, 20); Sfx.play('tthHengeHeave'); tthHengeShake(0.08); for (const p of G.players) rumble(p.id, 0.3, 0.3, 120); }
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
  S.left = sup ? (sup.x - S.x - TTHHENGE.log.lo) * (sup.s === 'bridge' ? 1 : 2) : 0;
  S.block = S.x >= lim.x - 0.01 ? lim.why : !sup ? 'log' : '';
  let tv = 0, acc = K.stop;
  if (tow) { tv = tthHengeTug(st, dt); acc = 150; S.run = false; if (!ph.lasso) tv = 0; }
  else if (down) {
    const g = ph.gold.brake;
    if (brake) { tv = K.easeV; acc = S.v > tv ? K.brakeA : K.acc * 0.4; S.run = false; }
    else if (push) { tv = K.runPush; acc = K.acc; S.run = true; }
    else if (S.run && S.v > 3) { tv = g ? K.goldRunV : K.runV; acc = g ? K.runA * 0.5 : K.runA; }
    else S.run = false;
  } else if (up) {
    S.run = false;
    if (push) { tv = K.upV; acc = K.acc; }
    else if (S.pushT > K.grace && ph.gold.chock !== S.hill && !tthCalm(st)) { tv = -K.backV; acc = K.backA; }
  } else if (push) { tv = K.pushV; acc = K.acc; S.run = false; }
  else if (S.run) { acc = K.coast; if (S.v < 2) S.run = false; }
  // forward needs a log under the front half and a clear way
  if ((tv > 0 || S.v > 0) && S.block && !tow) {
    if (S.block === 'log' && S.v > 6) {
      s.thuds++; ph.miss.thud++;
      Sfx.play('tthHengeThud'); tthHengeShake(S.v > K.skidV ? 0.3 : 0.14); puff(S.x + S.hw - 8, tthHengeBase(S.x + S.hw), 8, 'rgba(240,234,210,0.9)');
      if (S.v > K.skidV) {
        s.skids++; ph.miss.skid++;
        tthBump(st, { word: 'Runaway! Thud!', x: S.x + 40, y: tthHengeTop(S.x) - 30, kind: 'skid' });
        if (ph.miss.skid >= TTHHENGE.goldSkids && !ph.gold.brake) { ph.gold.brake = true; tthHelp(st, 'Gold help: a gold brake! The stone rolls slower downhill now.'); }
      } else tthPop(st, S.x + S.hw - 10, tthHengeTop(S.x) - 26, 'Thud!', '#ffffff', 22);
      if (ph.miss.thud >= TTHHENGE.goldThuds && !ph.gold.log) {
        ph.gold.log = true; tthHelp(st, 'Gold help: a gold log joins in. Now 5 logs keep the stone rolling!');
        const gl = tthHengeNewLog(0, { gold: true }); ph.logs.push(gl); tthHengeLetFall(st, gl, S.x - S.hw - 50, tthHengeTop(S.x) - 120);
      }
    }
    if (S.block === 'sheep' && S.v > 6 && lim.sheep) {
      if (S.v > 70) { lim.sheep.s = 'flee'; lim.sheep.t = 0; lim.sheep.face = 1; Sfx.play('tthHengeBaa'); tthPop(st, lim.sheep.x, tthHengeBase(lim.sheep.x) - 50, 'Baa!!', '#ffffff', 20); }
      else { tthPop(st, lim.sheep.x, tthHengeBase(lim.sheep.x) - 50, 'Baa!', '#ffffff', 20); Sfx.play('tthHengeBaa'); }
    }
    if (S.v > 0) S.v = 0;
    tv = Math.min(tv, 0); S.run = false;
  }
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
    const r = TTHHENGE.log.r;
    for (const l of ph.logs) {
      if (l.s !== 'ground') continue;
      if (l.u) { l.x += dx / 2; l.rot += dx / 2 / r; }
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
        if (ph.miss.back[h] >= TTHHENGE.goldBacks && ph.gold.chock !== h) { ph.gold.chock = h; tthHelp(st, 'Gold help: gold chocks! The stone can\'t roll back on this hill.'); }
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
  ph.leg++; ph.backStop = S.x; S.v = 0; S.run = false; ph.miss.thud = 0; ph.progT = 0;
  for (const p of ps) { const P = ph.P[p.id]; if (P.log) { tthHengeLetFall(st, P.log, tthHengeCx(p), p.y - 12); P.log.by = -1; P.log = null; } }
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
        m.fed = true; m.t = 0; l.s = 'sunk'; l.x = m.x; l.t = 0; l.u = false;
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
      tx = ph.XH + 75 + Math.sin(th.t * 0.9) * 150; ty = tthHengeBase(ph.XH) - 300 + Math.sin(c.t * 1.3) * 8; face = tx > c.x ? 1 : -1; pose = ph.fin.lift > 0.66 ? 'shock' : 'idle';
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
      if ((F.heaveT -= dt) <= 0) { F.heaveT = 0.6; Sfx.play('tthHengeHeave'); tthPop(st, ph.XH + 75, gy - 30 - F.lift * 150, 'Heave!', C.gold, 20); tthHengeShake(0.06); for (const p of G.players) rumble(p.id, 0.3, 0.3, 120); }
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
      grade: 0, hill: -1, sup: null, left: 0, block: '', rumT: 0, freeT: 0 };
    ph.backStop = K.start; ph.lim = { x: 0, why: '', sheep: null };
    ph.logs = [100, 46, -8, -62].map(o => tthHengeNewLog(K.start + o, { u: true }));
    ph.P = [0, 1].map(() => ({ log: null, on: false, wet: false, haul: false, rope: -1, ropeT: 0, hold: false, carryT: 0, pushT: 0, frontT: 0, lazyT: 0 }));
    ph.brook = { x0: B.x0, x1: B.x0 + B.slotW * 3, slotW: B.slotW, depth: B.depth, pile: B.pile, slots: [false, false, false], dropT: [9, 9, 9], n: 0, done: false, hint: false,
      at: [0, 1, 2].map(i => ({ x: B.x0 + (i + 0.5) * B.slotW, s: 'bridge' })) };
    ph.mud = K.mud.map(m => ({ x: m.x, fed: false, t: 0, hint: false }));
    ph.piles = K.mud.map(m => ({ x: m.pile, bridge: false, took: 0 })).concat([{ x: B.pile, bridge: true, took: 0 }]);
    ph.chocks = K.chocks.map(x => ({ x, up: false, t: 9 }));
    ph.rings = [{ x: ph.XH - 84 }, { x: ph.XH + K.fin.gapX + 84 }];
    ph.sheep = []; ph.sheepN = 0; ph.script = TTHHENGE_SCRIPT.map(e => Object.assign({}, e, { done: false }));
    ph.th = { mode: 'intro', sub: '', t: 0, log: null, sayT: 6, sayN: 0 };
    ph.lasso = null; ph.fin = { stage: 0, t: 0, lift: 0, notch: 0, both: false, heaveT: 0, said: false, out: false };
    ph.tipT = [{}, {}]; ph.hintKey = ['', ''];
    ph.gold = { log: false, chock: -2, brake: false, claw: false, rope: false };
    ph.miss = { thud: 0, back: {}, skid: 0, yoink: 0 };
    ph.progT = 0; ph.arrow = null; ph.stuckSaid = false; ph.pops = 0; ph.popN = 0; ph.carryN = 0; ph.needT = 0; ph.upHint = -2; ph.crestHint = false;
    ph.mudSaid = false; ph.sheepSaid = false; ph.pinchSaid = false;
    Object.assign(tthStats(st), { legT: [], thuds: 0, rollbacks: 0, skids: 0, yoinks: 0, whacks: 0, shoos: 0, lasso: [0, 0], carried: [0, 0], done: false });
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
  legend() { return { pip: '<kbd>A</kbd><kbd>D</kbd> move · push <kbd>W</kbd> jump', bo: '<kbd>←</kbd><kbd>→</kbd> move · push <kbd>↑</kbd> jump' }; },
  hudText(st) { const ph = st.ph; return ph.fin.stage > 0 ? 'Lintel ' + Math.round(ph.fin.lift * 100) + '%' : 'Leg ' + (ph.leg + 1) + '/3'; },
  progress(st) { return { n: st.ph.leg + (st.ph.fin.stage === 3 ? 1 : 0), of: 4 }; },
  headLift(st, p) { return st.ph.P[p.id].log ? 22 : 0; },
  drawBack(st) { tthHengeDrawBack(st); },
  draw(st) { tthHengeDraw(st); },
  drawTop(st) { tthHengeDrawTop(st); },
  hud(st) { tthHengeHud(st); },
};
