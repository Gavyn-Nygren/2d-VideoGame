/* Pip & Bo - Level 30-1 The Time Thief: era 'finale' (The End of Time). */
'use strict';

/* ===== 30-1 era 9: The End of Time (TTH_PHASES.finale) — Gavyn's plan: "a swirling clock world. One holds back the
   clock hands while the other climbs the gears to his machine", then smash the machine together and everything flies
   home. The big showdown, on foot.
   THE PLACE. A brass clockwork tower in a swirling violet clock-sky, climbed UP (the camera scrolls up after the lower
   player). The tower is one screen wide (x 150-810) and has 5 decks 380 px apart: the start deck, ledges 1-3 and the
   top deck (ledge 4) where the Thief's time machine sits. Behind it all hangs a giant clock with ONE huge hand.
   The era runs its own collision (tthFinBody): every platform is a one-way top (jump up through it, land on it), the
   decks are solid slabs with one HATCH (a one-way trapdoor) and a lift shaft. Pip and Bo pass through each other (no
   stacking, so nobody can be boosted past a gear). Nobody can fall below the deck they started the climb from.
   THE TWO JOBS (they swap at every ledge, so each player does both twice; room field `first` is the first HOLDER):
   - HOLDER ("brake"): stands at the brake lever of the deck (in the holder's colour) and HOLDS the action. While the
     brake is held the huge hand stops and every gear slows to a ridable speed (green lamps). A GRIP meter over the
     lever drains while holding (TTHFIN.grip.hold s from full) and refills while resting (grip.rest s), so holding is
     a decision, not a button to tape down: when it runs out the lever SLIPS and can only be grabbed again after the
     button was let go and the grip is back over grip.regrab. Feet on the deck, within lever.reach px of the lever.
   - CLIMBER ("press"): climbs the clockwork to the hatch of the next deck and presses the action at the button up
     there (in the climber's colour). That stops the clock and lowers the LIFT for the holder (it shuttles until both
     are up). Both on the new deck = the ledge is reached: a checkpoint, a breather, "Swap jobs!".
   THE CLOCKWORK (one new thing per ledge; TTHFIN_SECS):
     shelves      plain brass shelves.
     gears        a turning cog with little hanging platforms (pegs) on its rim: riding one carries you round and UP.
                  Unbraked they whirl (red lamp, streaks): a fast peg is not solid ("Too fast!") and a rider on a gear
                  that speeds up is shaken off after about half a second. EVERY climb has a gear that no jump can
                  skip, so the climber always needs the holder.
     pendulum     (ledge 1) a swinging bob platform to time.       piston  (ledge 2) a sliding block to ride.
     teeth        (ledge 3) escapement teeth that click in and out in turn (they blink 0.6 s before they fold).
     two gears    (ledge 4) with a resting shelf between them: the holder must rest the grip in the middle.
   THE HUGE HAND. It sweeps once round the giant clock (hand.sweep s per ledge, unbraked). When it reaches 12 the
   Thief's machine REWINDS time: whoever is up in the clockwork is whisked back along their own path to the deck
   ("Rewind!", soft; counted as a bump only the first time at each ledge) and the hand starts again. The last part of
   the sweep is red, ticks faster and puts a "!" over the climber. A climber who stands on the next deck is safe (the
   hand waits). A pie gauge in the left margin shows the same sweep for small screens.
   THE THIEF hovers in his machine in the right margin and (from ledge 2) throws TICK-TOCK BUBBLES: a ring marks the
   spot (where that player stood) for the whole flight (bub.fly s, never under 0.6 s); who is still inside when it
   lands is frozen for bub.freeze s ("Tick-tock!", a counted soft fail). A frozen holder lets go of the lever. Ledge 2
   aims at the climber only; ledges 3-4 at both in turn. Step out of the ring or jump over it.
   THE TOP: SMASH IT TOGETHER (no jobs: both "smash"). The machine docks on a pedestal between two RAMS. Each player
   stands at a plunger (left or right) and, when the lamps turn green ("NOW!"), presses the action: that side's ram
   shoots out and waits smash.window s for the other one. Both rams together = a HIT (bolts and clocks fly); a lone
   ram is dodged ("Together!", not a bump). 3 hits. Between hits the Thief plays his last tricks while the rams
   re-arm (smash.charge s): bubbles at the plungers (hit 1), cogs that roll across the deck to jump (telegraphed
   cog.warn s at the edge; hit 2), both (hit 3). A cog hit is a counted "Bonk!".
   THE PAY-OFF (about 10 s, players keep control): the machine bursts, the Thief plops out dizzy (on foot), all 8
   stolen things whirl out and fly, one by one, into 8 little portals named after their eras ("The T. rex egg is home,
   66 million years ago!"; things in st.loot get a gold tick, the rest fly home too). Then he takes out his pocket
   watch: tthPhaseDone(st, { got: false, say: 'One last portal... race you home!' }) and the core runs the portal
   cutscene into the race.
   GOLD HELP (announced with tthHelp, per ledge): 2 rewinds: the hand slows (x hand.goldK); 4: the hand is stuck for
   this climb. 3 shake-offs: gold grip (the brake holds about twice as long). 3 bubble freezes: sleepy bubbles. 26 s
   with no new height: the clockwork (pendulum, piston, teeth) slows down, then naps, with a gold hint for whoever's
   turn it is. At the top: 3 lone rams widen the window (0.9 s, then 1.5 s); 3 trick hits make the tricks sleepy.
   FAIRNESS. Everything is telegraphed at least 0.6 s. No hazard starts in a calm moment (tthCalm: cards, cutscenes,
   celebrations, nobody playing) and the hand stops then. Bubbles are never aimed at someone on the lift, being
   rewound or already safe on the next deck. Nothing can be cleared alone: gears need the brake, the lift needs the
   button, a hit needs both rams. Randomness only through tthRand().
   HISTORY (news line at ledges 1-3): the first clocks had only an hour hand; tick-tock is the escapement's teeth;
   the first pendulum clock was built in 1656.
   Stats (st.stats.finale): ledges, ledgeT, rewinds, flings, frozen, hits, misses. Every top-level name starts with
   tthFin / TTHFIN (Sfx.extra.tthFin*). All state lives in st.ph (fresh every phase start). */
const TTHFIN = {
  x0: 150, x1: 810, gap: 380, deckH: 14, foot: 508, topFoot: 470,
  liftW: 84, liftX: [154, 722],                       // the lift columns: left (x 154-238) and right (x 722-806)
  lever: { reach: 36 },
  grip: { hold: 6, rest: 5, regrab: 0.4, goldK: 0.5 },
  gear: { fast: 3.3, slow: 0.85, ride: 1.7, upT: 1.4, downT: 0.35 },
  hand: { sweep: [18, 17, 16, 16], startK: 0.02, warnK: 0.78, goldK: 1.6 },
  lift: { down: 330, up: 180, board: 0.25, again: 0.6 },
  bub: { fly: 1.5, goldFly: 2.2, rx: 30, ry: 40, freeze: 1.0, first: 4.2 },
  rewind: { t: 0.95, safe: 1.6, every: 0.08 },
  button: { reach: 24 },
  smash: { hits: 3, window: 0.55, gold: [0.9, 1.5], charge: 2.5, dock: 2.2, cool: 0.9, hitT: 1.5, reach: 28, plX: [300, 660], every: [3.0, 3.2, 2.6] },
  cog: { r: 15, v: 265, warn: 0.9 },
  gold: { rewinds: 2, rewinds2: 4, flings: 3, frozen: 3, stuckT: 26, miss: 3, miss2: 6, tricks: 3 },
  fin: { whirl: 2.6, each: 0.72, fly: 0.65, after: 1.7 },
};
// The four climbs. lift: 0 left / 1 right column; lever: x on the lower deck; button: x on the upper deck; hatch: the
// trapdoor in the upper deck; back: where a rewind puts the climber; every / pattern: bubbles (C climber, H holder).
// els (in route order; h = px above the lower deck): shelf, pend (pivot px / ph), piston, tooth (set 0 / 1), gear.
const TTHFIN_SECS = [
  { name: 'First Gear', lift: 0, lever: 330, button: 540, hatch: [300, 400], back: 590, every: 0, pattern: '', fact: 'Did you know? The first clocks had only ONE hand: the hour hand.',
    els: [{ id: 's1', kind: 'shelf', x: 630, h: 85, w: 90 },
      { id: 'p1', kind: 'pend', px: 515, ph: 345, len: 205, amp: 0.4, per: 3.2, w: 72 },
      { id: 'g1', kind: 'gear', x: 350, h: 225, r: 80, n: 4, dir: -1, pw: 60 }] },
  { name: 'Piston Alley', lift: 1, lever: 630, button: 420, hatch: [555, 655], back: 320, every: 7, pattern: 'C', fact: 'Did you know? A clock says tick-tock because its escapement teeth click.',
    els: [{ id: 's1', kind: 'shelf', x: 175, h: 85, w: 85 },
      { id: 'z1', kind: 'piston', x0: 280, x1: 440, h: 150, w: 72, v: 115, dwell: 0.8 },
      { id: 'g1', kind: 'gear', x: 605, h: 228, r: 78, n: 4, dir: 1, pw: 60 }] },
  { name: 'Tick-Tock Teeth', lift: 0, lever: 330, button: 540, hatch: [300, 400], back: 640, every: 5.6, pattern: 'CH', fact: 'Did you know? The first pendulum clock was built in 1656.',
    els: [{ id: 's1', kind: 'shelf', x: 715, h: 85, w: 90 },
      { id: 't1', kind: 'tooth', x: 630, h: 135, w: 64, set: 0 },
      { id: 't2', kind: 'tooth', x: 535, h: 165, w: 64, set: 1 },
      { id: 't3', kind: 'tooth', x: 440, h: 190, w: 64, set: 0 },
      { id: 'g1', kind: 'gear', x: 350, h: 228, r: 78, n: 4, dir: -1, pw: 60 }] },
  { name: 'Double Gears', lift: 1, lever: 630, button: 395, hatch: [580, 680], back: 320, every: 4.8, pattern: 'CHC', fact: '',
    els: [{ id: 's1', kind: 'shelf', x: 170, h: 80, w: 85 },
      { id: 'gA', kind: 'gear', x: 345, h: 170, r: 62, n: 4, dir: 1, pw: 54 },
      { id: 's2', kind: 'shelf', x: 440, h: 226, w: 66 },
      { id: 'gB', kind: 'gear', x: 630, h: 262, r: 60, n: 4, dir: 1, pw: 54 }] },
];
const TTHFIN_TOOTH = { per: 3, on: 0.6, warn: 0.2 };   // a tooth is in for on * per s, and blinks for warn * per s before it folds
const TTHFIN_HOME = [   // the pay-off: one line and one portal name per stolen thing, in TTH_LOOT order
  ['The T. rex egg is home, 66 million years ago!', 'Dinosaurs'], ['The great stone is home, at Stonehenge, 2500 BC!', 'Stonehenge'],
  ['The wooden horse is home, in Troy, 1200 BC!', 'Troy'], ['The wreath is home, at the first Olympics, 776 BC!', 'Olympia'],
  ['The sunstone is home, with the Vikings, 1000 AD!', 'Vikings'], ['Leonardo\'s plans are home, in the 1490s!', 'Leonardo'],
  ['The propeller is home, on the Wright Flyer, 1903!', 'The Flyer'], ['The flag is home, on the Moon, 1969!', 'The Moon'],
];
const TTHFIN_TAUNTS = ['Welcome to the End of Time! Tick, tock!', 'Hmph! One ledge is nothing!', 'Stop climbing my clock!', 'My machine is nearly wound up!'];
const TTHFIN_OUCH = ['Hey! Careful with that!', 'Stop! It\'s an antique!', 'Noooo! My machine!'];
const tthFinLY = i => -i * TTHFIN.gap;                 // the floor of deck i (world y; up is negative)
const tthFinSolo = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const tthFinCx = p => p.x + p.w / 2;
const tthFinFeet = p => p.y + p.h;

/* ---------- building the tower: decks, lifts, the clockwork of each climb ---------- */
function tthFinBuild() {
  const K = TTHFIN, decks = [], plats = [], els = [], secs = [];
  for (let i = 0; i <= 4; i++) {
    const S = i > 0 ? TTHFIN_SECS[i - 1] : null, col = S ? K.liftX[S.lift] : null;   // the deck's own lift column (the lift from below)
    const d = { i, y: tthFinLY(i), x0: K.x0, x1: K.x1, hatch: S ? S.hatch : null, col: S ? [col, col + K.liftW] : null };
    if (S) { if (S.lift === 0) d.x0 = col + K.liftW; else d.x1 = col; }
    d.plat = { kind: 'deck', deck: d, x: d.x0, y: d.y, w: d.x1 - d.x0, dx: 0, dy: 0, solid: true, sec: i };
    decks.push(d);
  }
  TTHFIN_SECS.forEach((S, k) => {
    const y0 = tthFinLY(k), col = K.liftX[S.lift];
    const sec = { k, S, els: [], gears: [], lever: { x: S.lever, y: y0 }, button: { x: S.button, y: tthFinLY(k + 1), down: false, t: 0 }, back: S.back, base: decks[k], upper: decks[k + 1] };
    Object.assign(sec, { rewinds: 0, flings: 0, frozen: 0, best: 0, stuckT: 0, stuckN: 0 });
    sec.lift = { kind: 'lift', sec: k, x: col, w: K.liftW, y: tthFinLY(k + 1), yTop: tthFinLY(k + 1), yBot: y0, dx: 0, dy: 0, solid: true, state: 'top', t: 0 };
    plats.push(sec.lift);
    for (const E of S.els) {
      const el = Object.assign({ sec: k, y: y0 - (E.h || 0) }, E);
      if (E.kind === 'pend') { el.py = y0 - E.ph; el.ph0 = k * 1.7; }
      if (E.kind === 'gear') { el.a = k * 0.9; el.w = K.gear.fast; el.pegs = []; sec.gears.push(el); }
      if (E.kind === 'gear') for (let n = 0; n < E.n; n++) { const q = { kind: 'peg', el, n, sec: k, x: 0, y: 0, w: E.pw, dx: 0, dy: 0, solid: false }; el.pegs.push(q); plats.push(q); }
      else { el.plat = { kind: E.kind, el, sec: k, x: E.x != null ? E.x : 0, y: el.y, w: E.w, dx: 0, dy: 0, solid: true }; plats.push(el.plat); }
      sec.els.push(el); els.push(el);
    }
    secs.push(sec);
  });
  for (const d of decks) plats.push(d.plat);   // (after the lifts: a lift wins a tie with the deck it is flush with)
  return { decks, plats, els, secs };
}
// where a pendulum bob, a piston or a tooth is at clockwork time tm (out: { x, y, solid, warn }); pure, so the
// computer can look ahead the way a person watches the swing
function tthFinElAt(el, tm, out) {
  out.y = el.y; out.solid = true; out.warn = false;
  if (el.kind === 'pend') {
    const th = el.amp * Math.sin(tm / el.per * Math.PI * 2 + el.ph0);
    out.x = el.px + Math.sin(th) * el.len - el.w / 2; out.y = el.py + Math.cos(th) * el.len; out.th = th;
  } else if (el.kind === 'piston') {
    const tr = (el.x1 - el.x0) / el.v, cyc = 2 * (tr + el.dwell), u = ((tm % cyc) + cyc) % cyc;
    out.x = u < el.dwell ? el.x0 : u < el.dwell + tr ? el.x0 + (u - el.dwell) * el.v : u < 2 * el.dwell + tr ? el.x1 : el.x1 - (u - 2 * el.dwell - tr) * el.v;
  } else if (el.kind === 'tooth') {
    const Z = TTHFIN_TOOTH, f = (((tm / Z.per + el.set * 0.5) % 1) + 1) % 1;
    out.x = el.x; out.solid = f < Z.on; out.warn = f >= Z.on - Z.warn && f < Z.on; out.f = f;
  } else out.x = el.x;
  return out;
}
// where peg n of a gear is when the gear's angle is a
function tthFinPegAt(el, n, a, out) {
  const ang = a + n * Math.PI * 2 / el.n;
  out.x = el.x + Math.cos(ang) * el.r - el.pw / 2; out.y = el.y + Math.sin(ang) * el.r; out.ang = ang;
  return out;
}
const TTHFIN_TMP = { x: 0, y: 0, solid: true, warn: false };
// one tick of the clockwork: everything moves, and remembers how far (dx, dy) for whoever rides it
function tthFinMech(st, dt) {
  const ph = st.ph, K = TTHFIN, o = TTHFIN_TMP;
  ph.tm += dt * ph.mechK;
  const braking = ph.braking && ph.stage === 'climb';
  for (const el of ph.c.els) {
    if (el.kind === 'gear') {
      const G0 = K.gear, want = el.sec < ph.k || ph.stage === 'fin' ? G0.slow * 0.5 : braking && el.sec === ph.k ? G0.slow : ph.stage === 'top' ? G0.slow : G0.fast;
      const rate = (G0.fast - G0.slow) / (want > el.w ? G0.upT : G0.downT);
      el.w = approach(el.w, want, rate * dt);
      el.a += el.w * el.dir * dt;
      const ok = el.w <= G0.ride && el.sec === ph.k;
      for (const q of el.pegs) { tthFinPegAt(el, q.n, el.a, o); q.dx = o.x - q.x; q.dy = o.y - q.y; q.x = o.x; q.y = o.y; q.solid = ok; }
    } else if (el.kind !== 'shelf') {
      const q = el.plat; tthFinElAt(el, ph.tm, o);
      q.dx = o.x - q.x; q.dy = o.y - q.y; q.x = o.x; q.y = o.y;
      if (el.kind === 'tooth') { if (q.solid !== o.solid && el.sec === ph.k && ph.stage === 'climb') Sfx.play('tthFinClick'); q.solid = o.solid; el.warn = o.warn; el.f = o.f; }
      if (el.kind === 'pend') el.th = o.th;
    }
  }
  for (const s of ph.c.secs) {
    const L = s.lift, y0 = L.y;
    if (L.state === 'down') { L.y = Math.min(L.yBot, L.y + K.lift.down * dt); if (L.y >= L.yBot) { L.state = 'wait'; L.t = 0; Sfx.play('tthFinClunk'); } }
    else if (L.state === 'up') { L.y = Math.max(L.yTop, L.y - K.lift.up * dt); if (L.y <= L.yTop) { L.state = 'top'; L.t = 0; Sfx.play('tthFinClunk'); } }
    L.dy = L.y - y0;
  }
}

/* ---------- moving Pip and Bo: one-way platforms, deck slabs with a hatch and a lift shaft ---------- */
const tthFinBusy = (st, p) => !!(st.ph && st.ph.rw && st.ph.rw.who[p.id]);
function tthFinBody(st, p, dt) {
  const ph = st.ph, P = ph.P[p.id], K = TTHFIN;
  if (tthFinBusy(st, p)) return;                       // being rewound: the rewind moves them
  const f00 = p.y + p.h, was = p.grounded;
  // carried by what they stand on (a gear that got too fast shakes its rider off; a tooth that folds drops them)
  let on = P.on;
  if (on && !on.solid) {
    if (on.kind === 'peg') tthFinFling(st, p, 'Whoa!');
    on = P.on = null; p.grounded = false;
  }
  if (on) { p.x += on.dx; p.y = on.y - p.h; }
  tthControl(st, p, dt);
  p.x = clamp(p.x + p.vx * dt, K.x0, K.x1 - p.w);
  if (p.x <= K.x0 && p.vx < 0 || p.x >= K.x1 - p.w && p.vx > 0) p.vx = 0;
  const lo = ph.c.decks[Math.max(0, ph.k - 1)].y + 60;   // (only the decks around the climb matter)
  if (p.vy < 0) {
    let ny = p.y + p.vy * dt;
    for (const d of ph.c.decks) {
      const bot = d.y + K.deckH;
      if (d.y > lo || p.y < bot - 0.5 || ny >= bot || p.x + p.w <= d.x0 || p.x >= d.x1) continue;
      const cx = p.x + p.w / 2, h = d.hatch;
      if (h && cx > h[0] + 4 && cx < h[1] - 4) { p.x = clamp(p.x, h[0], h[1] - p.w); continue; }   // up through the hatch
      ny = bot; p.vy = 0; p.jumping = false;             // a bonk on the underside
    }
    p.y = ny; P.on = null; p.grounded = false;
  } else {
    const f0 = p.y + p.h, f1 = f0 + p.vy * dt;
    let best = null;
    for (const q of ph.c.plats) {
      if (q.y > lo || p.x + p.w - 3 <= q.x || p.x + 3 >= q.x + q.w) continue;
      if (q.y - q.dy < f00 - 1.5 || q.y > f1 + 0.5) continue;
      if (!q.solid) { if (q.kind === 'peg' && q.el.sec === ph.k && ph.stage === 'climb' && p.vy > 90) tthFinFling(st, p, 'Too fast!'); continue; }
      if (!best || q.y < best.y) best = q;
    }
    if (best) { p.y = best.y - p.h; p.vy = 0; p.grounded = true; P.on = best; }
    else { p.y += p.vy * dt; p.grounded = false; P.on = null; }
  }
  // inside a deck slab (riding the lift up its shaft, hopping up the hatch): stay in the opening
  for (const d of ph.c.decks) {
    if (d.y > lo || p.y >= d.y + K.deckH || p.y + p.h <= d.y + 0.01) continue;
    const cx = p.x + p.w / 2, h = d.hatch, c = d.col;
    if (c && cx > c[0] - 12 && cx < c[1] + 12) p.x = clamp(p.x, c[0], c[1] - p.w);
    else if (h && p.x + p.w > d.x0 && p.x < d.x1) p.x = clamp(p.x, h[0], h[1] - p.w);
  }
  p.tileGround = p.grounded; p.onPartner = false; p.onOneWay = false;
  if (p.grounded && !was && p.lastVy > 260) { p.sx = 1.25; p.sy = 0.78; puff(p.x + p.w / 2, p.y + p.h, 5, 'rgba(255,255,255,0.75)'); Sfx.play('land'); }
  p.lastVy = p.grounded ? 0 : p.vy;
}
// with no input (cards, the portal cutscene)
function tthFinStill(st, dt) {
  for (const p of G.players) {
    p.pendingJump = false; p.pendingAct = false;
    const real = p.input; p.input = NO_INPUT;
    try { tthFinBody(st, p, dt); } finally { p.input = real; }
  }
}
// a gear too fast to ride: the word, sparks, and the count that leads to gold grip (not a bump)
function tthFinFling(st, p, word) {
  const ph = st.ph, P = ph.P[p.id];
  if (P.flingCD > 0) return;
  P.flingCD = 1.1; ph.sec.flings++; tthStats(st).flings = (tthStats(st).flings || 0) + 1;
  tthPop(st, tthFinCx(p), p.y - 16, word, '#ffd23f', 20); Sfx.play('tthFinWhirr');
  for (let n = 0; n < 6; n++) G.particles.push({ x: tthFinCx(p), y: tthFinFeet(p), vx: (tthRand() - 0.5) * 260, vy: -80 - tthRand() * 120, life: 0.4, max: 0.4, col: n % 2 ? '#ffd23f' : '#ffffff', size: 3, grav: 500, kind: 'dot' });
  const hd = ph.holder;
  if (p.id !== hd && !ph.braking) tthFinTip(st, hd, 'brake', 'Hold ' + tthFinAct(hd) + ' at the lever: slow the gears!', 5, { cpu: null });
  if (ph.sec.flings >= TTHFIN.gold.flings && !ph.gold.grip) { ph.gold.grip = true; tthHelp(st, 'Gold help: gold grip! The brake holds much longer.'); }
}
// the camera follows the lower player up the tower; the base deck of the climb sits near the bottom of the screen
function tthFinCam(st, snap, dt = DT) {
  const ph = st.ph, ps = G.players, K = TTHFIN;
  let ty;
  if (ph.stage === 'top' || ph.stage === 'fin') ty = tthFinLY(4) - K.topFoot;
  else ty = Math.min(tthFinLY(ph.k), Math.max(tthFinFeet(ps[0]), tthFinFeet(ps[1]))) - K.foot;
  st.cam.x = 0;
  st.cam.y = snap ? ty : st.cam.y + (ty - st.cam.y) * Math.min(1, dt * 4);
}

/* ---------- hints (each player's own keys) ---------- */
function tthFinTip(st, id, key, text, again = 6, o = {}) {
  const T0 = st.ph.tipT[id];
  if (T0[key] != null && st.phT - T0[key] < again) return false;
  T0[key] = st.phT;
  tthHint(st, id, text, { life: o.life || 3, gold: !!o.gold, cpu: o.cpu });
  st.ph.hintKey[id] = key;
  return true;
}
function tthFinDone(st, id, keys) { if (st.hints[id] && keys.includes(st.ph.hintKey[id])) st.hints[id] = null; }
// (on touch: the round button is named by the word on it, "the brake button")
function tthFinAct(id) {
  const st = G.mst, w = st && st.ph && st.ph.stage ? tthFinLabels(st)[id] : '';
  return w && tthDev(id) === 'touch' ? 'the ' + w + ' button' : tthKey(id, 'act');
}
const tthFinLabels = st => (st.ph.stage === 'top' || st.ph.stage === 'fin' ? ['smash', 'smash'] : st.ph.holder === 0 ? ['brake', 'press'] : ['press', 'brake']);

/* ---------- the two jobs: the brake lever and its grip; the button and the lift ---------- */
function tthFinAtLever(st, p) {
  const ph = st.ph, lv = ph.sec.lever;
  return p.grounded && ph.P[p.id].on === ph.sec.base.plat && Math.abs(tthFinCx(p) - lv.x) <= TTHFIN.lever.reach;
}
function tthFinJobs(st, dt) {
  const ph = st.ph, ps = G.players, K = TTHFIN, sec = ph.sec;
  if (ph.stage !== 'climb' && ph.stage !== 'lift') { ph.braking = false; return; }
  const H = ps[ph.holder], Cl = ps[1 - ph.holder], Gp = K.grip, gk = ph.gold.grip ? Gp.goldK : 1;
  // the brake: hold the action at the lever (feet on the deck); it slips when the grip runs out
  const at = tthFinAtLever(st, H), want = ph.stage === 'climb' && at && H.input.act && H.stun <= 0 && !tthFinBusy(st, H);
  if (ph.slip && !H.input.act && ph.grip >= Gp.regrab) { ph.slip = false; if (at) tthFinTip(st, H.id, 'regrab', 'Rested! Grab the brake again.', 4, { cpu: null }); }
  const was = ph.braking;
  ph.braking = want && !ph.slip && ph.grip > 0;
  if (ph.braking) {
    ph.grip = Math.max(0, ph.grip - dt / Gp.hold * gk);
    if (!was) { Sfx.play('tthFinBrake'); tthFinDone(st, H.id, ['job', 'brake', 'regrab', 'lever', 'near12', 'gold']); if (!ph.brakedOnce) { ph.brakedOnce = true; tthPop(st, sec.lever.x, sec.lever.y - 96, 'Braked!', '#7fe9ff', 22); } }
    if (ph.grip <= 0) {
      ph.slip = true; ph.braking = false; tthStats(st).slips = (tthStats(st).slips || 0) + 1;
      tthPop(st, sec.lever.x, sec.lever.y - 70, 'Slipped!', '#ff8f7a', 22); Sfx.play('tthFinSlip'); rumble(H.id, 0.4, 0.3, 140);
      tthFinTip(st, H.id, 'slip', 'Grip is gone! Let go of ' + tthFinAct(H.id) + ' and rest.', 3, { life: 3.4, cpu: null });
    } else if ((G.tickN % 5) === 0) G.particles.push({ x: sec.lever.x + (tthRand() - 0.5) * 16, y: sec.lever.y - 8, vx: (tthRand() - 0.5) * 140, vy: -60 - tthRand() * 90, life: 0.3, max: 0.3, col: '#7fe9ff', size: 2.5, grav: 300, kind: 'dot' });
  } else ph.grip = Math.min(1, ph.grip + dt / Gp.rest * (ph.gold.grip ? 1.5 : 1));
  ph.leverK = approach(ph.leverK, ph.braking ? 1 : 0, dt * 9);
  // fresh presses: the climber's button; a press in the wrong place gets a hint
  for (const p of ps) {
    if (!p.pendingAct) continue;
    p.pendingAct = false;
    if (p.stun > 0 || tthFinBusy(st, p)) continue;
    const up = ph.P[p.id].on === sec.upper.plat, bt = sec.button;
    if (p === Cl) {
      if (ph.stage === 'climb' && up && !bt.down && Math.abs(tthFinCx(p) - bt.x) <= K.button.reach) tthFinPress(st, p);
      else if (ph.stage === 'climb' && up && !bt.down) tthFinTip(st, p.id, 'btn', 'Go to the button, then press ' + tthFinAct(p.id) + '!', 4, { cpu: null });
      else if (ph.stage === 'climb' && Math.abs(tthFinCx(p) - sec.lever.x) < 60 && ph.P[p.id].on === sec.base.plat) tthFinTip(st, p.id, 'notmine', 'That is ' + NAMES[H.id] + '\'s lever. You climb!', 6, { cpu: null });
    } else if (ph.stage === 'climb' && !at && !ph.slip) {
      tthFinTip(st, p.id, 'lever', 'Stand at the lever, then hold ' + tthFinAct(p.id) + '!', 5, { cpu: null });
    }
  }
  if (sec.button.down) sec.button.t += dt;
  // the lift shuttles until both are up
  const L = sec.lift;
  if (ph.stage === 'lift') {
    const aboard = ps.filter(p => ph.P[p.id].on === L), below = ps.filter(p => tthFinFeet(p) > L.yTop + 40 && ph.P[p.id].on !== L);
    if (L.state === 'wait') {
      L.t = aboard.length ? L.t + dt : 0;
      if (L.t >= K.lift.board) { L.state = 'up'; Sfx.play('tthFinLift'); for (const p of aboard) tthFinDone(st, p.id, ['lift', 'gold']); }
      else if (!aboard.length) for (const p of below) if (p.grounded && Math.abs(tthFinCx(p) - (L.x + L.w / 2)) > 30) tthFinTip(st, p.id, 'lift', 'Hop on the lift! ' + (L.x < 400 ? '◀' : '▶'), 7, { cpu: null });
    } else if (L.state === 'top') {
      L.t += dt;
      if (below.length && !aboard.length && L.t >= K.lift.again) { L.state = 'down'; Sfx.play('tthFinLift'); }
    }
  }
}
function tthFinPress(st, p) {
  const ph = st.ph, sec = ph.sec, bt = sec.button;
  bt.down = true; bt.t = 0; ph.stage = 'lift'; ph.braking = false;
  sec.lift.state = 'down'; sec.lift.t = 0;
  Sfx.play('tthFinBtn'); Sfx.play('tthFinLift'); rumble(p.id, 0.5, 0.3, 120);
  tthPop(st, bt.x, bt.y - 60, 'Click!', C.gold, 22);
  burst(bt.x, bt.y - 14, C.gold, 10);
  tthNews(st, 'The clock stops! The lift is coming down.', false, 2.6);
  tthFinDone(st, p.id, ['btn', 'gobtn', 'gold']);
  for (const b of ph.bubs) b.dud = true;
  const hd = ph.holder;
  st.hints[hd] = null;
  tthFinTip(st, hd, 'lift', 'Hop on the lift! ' + (sec.lift.x < 400 ? '◀' : '▶'), 0, { life: 3.5, cpu: null });
  if (typeof cpuSay === 'function' && cpuOn(p.id)) cpuSay(p, 'Lift coming down!');
}

/* ---------- the huge hand and the rewind ---------- */
function tthFinHand(st, dt) {
  const ph = st.ph, K = TTHFIN, ps = G.players, hd = ph.hand, sec = ph.sec;
  if (hd.spin > 0) { hd.spin = Math.max(0, hd.spin - dt); hd.k = K.hand.startK + (hd.from - K.hand.startK) * (hd.spin / K.rewind.t); return; }
  if (ph.stage !== 'climb' || tthCalm(st) || ph.rw) return;
  const Cl = ps[1 - ph.holder], safe = ph.P[Cl.id].on === sec.upper.plat;
  if (ph.braking || safe || ph.gold.hand >= 2) return;
  const was = hd.k;
  hd.k += dt / (K.hand.sweep[ph.k] * (ph.gold.hand ? K.hand.goldK : 1));
  // the last stretch: faster ticks, a "!" over the climber, a nudge for the holder
  if (hd.k >= K.hand.warnK) {
    const left = (1 - hd.k) / (1 - K.hand.warnK);
    if ((hd.tick -= dt) <= 0) { hd.tick = 0.16 + left * 0.34; Sfx.play('tthTick'); }
    if (tthFinFeet(Cl) < sec.base.y - 8) tthWarn(st, Cl.id, 0.3);
    if (was < K.hand.warnK && tthFinFeet(Cl) < sec.base.y - 8) {
      if (!ph.slip) tthFinTip(st, ph.holder, 'near12', 'Nearly 12! Hold ' + tthFinAct(ph.holder) + ': stop the hand!', 8, { cpu: null });
      if (ph.sec.rewinds === 0 && ph.k === 0) tthSay(st, 'Tick, tock... nearly 12!', 1.8);
    }
  }
  if (hd.k >= 1) tthFinRewind(st);
}
function tthFinRewind(st) {
  const ph = st.ph, K = TTHFIN, ps = G.players, sec = ph.sec, hd = ph.hand;
  hd.from = 1; hd.spin = K.rewind.t; hd.k = 1; hd.tick = 0;
  Sfx.play('tthFinDong');
  for (const b of ph.bubs) b.dud = true;
  const who = [false, false];
  let any = false;
  for (const p of ps) {
    if (tthFinFeet(p) > sec.base.y - 8 || ph.P[p.id].on === sec.upper.plat || ph.P[p.id].on === sec.lift) continue;
    who[p.id] = true; any = true;
  }
  if (!any) { tthPop(st, W / 2, st.cam.y + 150, 'Dong!', '#f6d37a', 24); return; }
  ph.rw = { t: 0, who, from: ps.map(p => ({ x: p.x, y: p.y })), trail: ph.trail.map(t => t.slice()) };
  sec.rewinds++; tthStats(st).rewinds = (tthStats(st).rewinds || 0) + 1;
  const first = sec.rewinds === 1;
  for (const p of ps) {
    if (!who[p.id]) continue;
    ph.P[p.id].on = null; p.vx = 0; p.vy = 0; p.grounded = false; p.stun = 0; ph.P[p.id].frozenT = 0;
    if (first) tthBonk(st, p, { still: true, kind: 'rewind', word: 'Rewind!', safe: K.rewind.t + K.rewind.safe });
    else { tthPop(st, tthFinCx(p), p.y - 14, 'Rewind!', '#ffffff', 22); st.safe[p.id] = Math.max(st.safe[p.id], K.rewind.t + K.rewind.safe); }
  }
  Sfx.play('tthFinRewind');
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.22);
  tthReact(st, 'happy', sec.rewinds % 2 ? 'Rewind! Back you go!' : 'Ha ha! Time is on MY side!', 2);
  st.thief.pose = 'laugh'; ph.thiefPoseT = 1.6;
  const G0 = K.gold;
  if (sec.rewinds === G0.rewinds && ph.gold.hand < 1) { ph.gold.hand = 1; tthHelp(st, 'Gold help: the huge hand slows down!'); }
  else if (sec.rewinds === G0.rewinds2 && ph.gold.hand < 2) { ph.gold.hand = 2; tthHelp(st, 'Gold help: the huge hand is stuck! No more rewinds on this climb.'); }
  else if (first) tthFinTip(st, ph.holder, 'near12', 'Hold ' + tthFinAct(ph.holder) + ' at the lever: it stops the hand!', 0, { life: 4, cpu: null });
}
// whisked back along their own path, then set down on the deck
function tthFinRewinding(st, dt) {
  const ph = st.ph, rw = ph.rw, K = TTHFIN, ps = G.players, sec = ph.sec;
  // the climber's trail (for the next rewind): a point every rewind.every s while up in the clockwork
  if (!rw) {
    const Cl = ps[1 - ph.holder];
    if (ph.stage === 'climb' && tthFinFeet(Cl) < sec.base.y - 8 && (ph.trailT -= dt) <= 0) { ph.trailT = K.rewind.every; ph.trail.push([Cl.x, Cl.y]); if (ph.trail.length > 140) ph.trail.splice(0, 2); }
    else if (tthFinFeet(Cl) >= sec.base.y - 8 && ph.trail.length) ph.trail.length = 0;
    return;
  }
  rw.t += dt;
  const u = clamp(rw.t / K.rewind.t, 0, 1), e = u * u * (3 - 2 * u), Cl = 1 - ph.holder;
  for (const p of ps) {
    if (!rw.who[p.id]) continue;
    const bx = sec.back + (p.id === Cl ? 0 : 40) - p.w / 2, by = sec.base.y - p.h, tr = p.id === Cl ? rw.trail : [];
    // back along the trail (newest first), ending on the deck
    const n = tr.length, f = e * (n + 1), i = Math.floor(f), fr = f - i;
    const pt = j => (j <= 0 ? [rw.from[p.id].x, rw.from[p.id].y] : j > n ? [bx, by] : tr[n - j]);
    const a = pt(i), b = pt(i + 1);
    p.x = a[0] + (b[0] - a[0]) * fr; p.y = a[1] + (b[1] - a[1]) * fr; p.vx = 0; p.vy = 0; p.face = bx > p.x ? 1 : -1;
    if ((G.tickN % 4) === 0) G.particles.push({ x: tthFinCx(p), y: p.y + p.h / 2, vx: 0, vy: 0, life: 0.35, max: 0.35, col: p.id ? 'rgba(91,149,255,0.7)' : 'rgba(255,107,74,0.7)', size: 9, grav: 0, kind: 'dot' });
    if (u >= 1) { p.x = bx; p.y = by; p.grounded = true; ph.P[p.id].on = sec.base.plat; p.sx = 1.2; p.sy = 0.8; puff(tthFinCx(p), by + p.h, 6, 'rgba(178,141,255,0.85)'); }
  }
  if (u >= 1) { ph.rw = null; ph.trail.length = 0; ph.sec.best = 0; ph.sec.stuckT = 0; }
}

/* ---------- tick-tock bubbles ---------- */
function tthFinThrow(st, p) {
  const ph = st.ph, K = TTHFIN.bub, c = st.thief, P = tthThiefPts(c);
  const fly = ph.gold.bub ? K.goldFly : K.fly;
  ph.bubs.push({ sx: P.claw.x, sy: P.claw.y, x: P.claw.x, y: P.claw.y, tx: tthFinCx(p), ty: p.y + p.h / 2, t: 0, fly, id: p.id, dud: false, seed: Math.floor(tthRand() * 100) });
  ph.bubN++; c.pose = 'point'; ph.thiefPoseT = 0.7; c.face = tthFinCx(p) < c.x ? -1 : 1;
  Sfx.play('tthFinBub');
  if (ph.bubN === 1) tthSay(st, 'Tick-tock bubble! Catch!', 2);
  else if (ph.bubN % 5 === 0) tthSay(st, ['Freeze!', 'Tick-tock! Hee hee!', 'Hold still!'][(ph.bubN / 5) % 3 | 0], 1.6);
  tthFinTip(st, p.id, 'bub', ph.bubN <= 4 ? 'Bubble! Get out of the ring!' : 'Bubble!', ph.bubN <= 4 ? 0 : 6, { life: fly + 0.3, cpu: null });
}
function tthFinBubbles(st, dt) {
  const ph = st.ph, K = TTHFIN.bub, ps = G.players, sec = ph.sec;
  // the Thief's throws while they climb (the top deck has its own tricks)
  if (ph.stage === 'climb' && sec.S.every > 0 && !tthCalm(st) && !ph.rw && (ph.bubT -= dt) <= 0) {
    const S = sec.S, ch = S.pattern[ph.bubI % S.pattern.length];
    const H = ps[ph.holder], Cl = ps[1 - ph.holder];
    let t = ch === 'H' ? H : Cl;
    const ok = p => (p === H ? Math.abs(tthFinCx(p) - sec.lever.x) < 90 : ph.P[p.id].on !== sec.upper.plat) && st.safe[p.id] <= 0;
    if (!ok(t)) t = ok(ps[1 - t.id]) ? ps[1 - t.id] : null;
    if (t) { tthFinThrow(st, t); ph.bubI++; ph.bubT = S.every * (0.85 + 0.3 * tthRand()) * (ph.gold.bub ? 1.5 : 1); } else ph.bubT = 0.8;
  }
  for (const b of ph.bubs) {
    b.t += dt;
    const u = clamp(b.t / b.fly, 0, 1), e = u * u * (3 - 2 * u);
    b.x = b.sx + (b.tx - b.sx) * e; b.y = b.sy + (b.ty - b.sy) * e - Math.sin(u * Math.PI) * 46 + Math.sin(b.t * 7 + b.seed) * 3;
    if (u < 1) continue;
    b.gone = true;
    Sfx.play('tthFinPop');
    for (let n = 0; n < 8; n++) { const a = n / 8 * Math.PI * 2; G.particles.push({ x: b.tx + Math.cos(a) * 14, y: b.ty + Math.sin(a) * 14, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.35, max: 0.35, col: 'rgba(160,240,255,0.9)', size: 3, grav: 0, kind: 'dot' }); }
    if (b.dud || tthCalm(st)) continue;
    for (const p of ps) {
      if (tthFinBusy(st, p) || Math.abs(tthFinCx(p) - b.tx) >= K.rx || Math.abs(p.y + p.h / 2 - b.ty) >= K.ry) continue;
      if (!tthBonk(st, p, { still: true, kind: 'bubble', word: 'Tick-tock!', safe: K.freeze + 1.4 })) continue;
      p.stun = Math.max(p.stun, K.freeze); p.vx = 0; ph.P[p.id].frozenT = K.freeze;
      tthStats(st).frozen = (tthStats(st).frozen || 0) + 1;
      if (ph.stage === 'climb') {
        sec.frozen++;
        if (sec.frozen >= TTHFIN.gold.frozen && !ph.gold.bub) { ph.gold.bub = true; tthHelp(st, 'Gold help: sleepy bubbles! They float slower now.'); }
      } else if (ph.top) tthFinTrickHit(st);
    }
  }
  if (ph.bubs.some(b => b.gone)) ph.bubs = ph.bubs.filter(b => !b.gone);
  for (const P of ph.P) { if (P.frozenT > 0) P.frozenT = Math.max(0, P.frozenT - dt); if (P.flingCD > 0) P.flingCD -= dt; }
}

/* ---------- a ledge is reached: checkpoint, swap, the next climb (or the top) ---------- */
function tthFinLedge(st) {
  const ph = st.ph, ps = G.players, K = TTHFIN, L = ph.sec.lift;
  if (ph.stage !== 'lift' || L.state !== 'top' || !ps.every(p => p.grounded && Math.abs(tthFinFeet(p) - L.yTop) < 1)) return;
  const S = tthStats(st);
  S.ledges = ph.k + 1; S.ledgeT.push(Math.round((st.phT - ph.kT0) * 10) / 10); ph.kT0 = st.phT;
  Sfx.play('tthFinLedge');
  for (let n = 0; n < 18; n++) confetti(K.x0 + 60 + tthRand() * (K.x1 - K.x0 - 120), L.yTop - 120);
  ph.k++;
  ph.bubs = []; ph.trail.length = 0; ph.gold = { hand: 0, grip: false, bub: false, mech: 0 }; ph.mechK = 1;
  ph.grip = 1; ph.slip = false; ph.braking = false; ph.waitT = 0; ph.goldAt = null;
  ph.hand.from = ph.hand.k; ph.hand.spin = K.rewind.t;
  st.hints = [null, null];
  if (ph.k >= 4) { tthFinTopStart(st); return; }
  ph.sec = ph.c.secs[ph.k]; ph.holder = 1 - ph.holder; ph.stage = 'climb';
  ph.bubT = K.bub.first; ph.bubI = 0; ph.factT = 5;
  tthPop(st, W / 2, L.yTop - 150, 'Ledge ' + ph.k + '!', C.gold, 30);
  tthSwap(st); tthCelebrate(st, 1.8);
  tthNews(st, 'Ledge ' + ph.k + ' of 4! Next climb: ' + ph.sec.S.name + '.', false, 3.2);
  tthSay(st, TTHFIN_TAUNTS[ph.k], 2.2);
  ph.jobTipT = 2;
}
function tthFinJobTips(st) {
  const ph = st.ph, hd = ph.holder, cl = 1 - hd, first = ph.k === 0;
  tthFinTip(st, hd, 'job', (first ? 'Your job: hold ' : 'Your turn: hold ') + tthFinAct(hd) + ' at the lever to brake!', 0, { life: 4.5, cpu: 'I brake the clock!' });
  tthFinTip(st, cl, 'job', first ? 'Your job: climb to the button up there!' : 'Your turn: climb to the button!', 0, { life: 4.5, cpu: 'I climb!' });
}

/* ---------- the top deck: smash the machine together ---------- */
function tthFinTopStart(st) {
  const ph = st.ph, K = TTHFIN;
  ph.stage = 'top';
  ph.top = { state: 'dock', t: 0, hits: 0, charge: 0, rams: [0, 1].map(() => ({ k: 0, live: 0, cool: 0, by: -1, down: 0 })), miss: 0, window: K.smash.window,
    trickT: 1, trickN: 0, cogN: 0, cogs: [], rise: 0, tricksHit: 0, sleepy: false, flash: 0, push: 0, standT: [0, 0] };
  tthPop(st, W / 2, tthFinLY(4) - 190, 'The top!', C.gold, 32);
  tthCelebrate(st, 1.6); tthShowBadges(st); tthActLabels(st); Sfx.play('tthSwap');
  tthNews(st, 'The top! Smash the Time Machine TOGETHER!', true, 4);
  tthSay(st, 'You can\'t smash MY time machine!', 2.4);
}
// which plunger p stands at (0 left, 1 right), or -1
function tthFinPlunger(st, p) {
  const ph = st.ph, K = TTHFIN.smash;
  if (!p.grounded || Math.abs(tthFinFeet(p) - tthFinLY(4)) > 1) return -1;
  for (let s = 0; s < 2; s++) if (Math.abs(tthFinCx(p) - K.plX[s]) <= K.reach) return s;
  return -1;
}
function tthFinTrickHit(st) {
  const tp = st.ph.top;
  if (!tp) return;
  tp.tricksHit++;
  if (tp.tricksHit >= TTHFIN.gold.tricks && !tp.sleepy) { tp.sleepy = true; st.ph.gold.bub = true; tthHelp(st, 'Gold help: sleepy tricks! Slower cogs and bubbles.'); }
}
function tthFinDebris(st, x, y, n) {
  const ph = st.ph;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * (0.1 + 0.8 * tthRand()), v = 180 + tthRand() * 340;
    ph.debris.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, rot: tthRand() * 6, vr: (tthRand() - 0.5) * 16, kind: i % 3, t: 0, life: 1.3 + tthRand() * 0.6 });
  }
  if (ph.debris.length > 90) ph.debris.splice(0, ph.debris.length - 90);
}
function tthFinTop(st, dt) {
  const ph = st.ph, tp = ph.top, K = TTHFIN.smash, ps = G.players, deckY = tthFinLY(4), calm = tthCalm(st);
  for (const d of ph.debris) { d.t += dt; d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt; }
  if (ph.debris.length && ph.debris[0].t > ph.debris[0].life) ph.debris = ph.debris.filter(d => d.t <= d.life);
  if (!tp) return;
  tp.t += dt; tp.rise = Math.min(1, tp.rise + dt / 0.8); tp.flash = Math.max(0, tp.flash - dt * 2.5);
  if (ph.stage !== 'top') { for (const r of tp.rams) { r.k = approach(r.k, 0, dt * 3); r.down = approach(r.down, 0, dt * 6); } tp.push = approach(tp.push, 0, dt * 4); return; }
  if (tp.state === 'dock') { if (tp.t >= K.dock && !calm) { tp.state = 'charge'; tp.charge = 0; tp.trickT = 0.9; } }
  else if (tp.state === 'charge') {
    if (!calm) tp.charge += dt;
    if (tp.charge >= K.charge) {
      tp.state = 'armed'; Sfx.play('tthFinArm');
      tthPop(st, 480, deckY - 215, 'NOW!', '#9fe07f', 30);
      for (const p of ps) if (tthFinPlunger(st, p) >= 0) tthFinTip(st, p.id, 'armed', 'Green lamps! Press ' + tthFinAct(p.id) + ' TOGETHER!', 7, { life: 3.2, cpu: null });
    }
  } else if (tp.state === 'hit' && tp.t >= K.hitT) { tp.state = 'charge'; tp.charge = 0; tp.trickT = 0.7; tp.trickN = 0; }
  // the rams: out while live; a lone ram gives up after the window
  for (let s = 0; s < 2; s++) {
    const r = tp.rams[s];
    if (r.live > 0 && (r.live -= dt) <= 0 && tp.state === 'armed') tthFinMiss(st, s);
    r.cool = Math.max(0, r.cool - dt);
    const out = r.live > 0 || (tp.state === 'hit' && tp.t < 0.4);
    r.k = approach(r.k, out ? 1 : 0, dt * (out ? 14 : 3.5)); r.down = approach(r.down, out ? 1 : 0, dt * (out ? 14 : 5));
  }
  tp.push = approach(tp.push, tp.state === 'armed' ? (tp.rams[0].live > 0 ? 1 : 0) - (tp.rams[1].live > 0 ? 1 : 0) : 0, dt * 8);
  // the plungers
  for (const p of ps) {
    const s = tthFinPlunger(st, p);
    tp.standT[p.id] = s >= 0 ? tp.standT[p.id] + dt : 0;
    if (s >= 0) tthFinDone(st, p.id, ['plunger']);
    if (!p.pendingAct) continue;
    p.pendingAct = false;
    if (p.stun > 0 || tp.state === 'dock') continue;
    if (s < 0) { tthFinTip(st, p.id, 'plunger', 'Stand at a plunger first!', 4, { cpu: null }); continue; }
    if (tp.state !== 'armed') { if (tp.state === 'charge') { tthPop(st, K.plX[s], deckY - 64, 'Not yet!', '#ff8f7a', 18); tthFinTip(st, p.id, 'notyet', 'Wait for the green lamps!', 5, { cpu: null }); } continue; }
    const r = tp.rams[s], o = tp.rams[1 - s];
    if (r.live > 0 || r.cool > 0) continue;
    r.live = tp.window; r.by = p.id; Sfx.play('tthFinRam', p.id); rumble(p.id, 0.4, 0.3, 90);
    tthFinDone(st, p.id, ['armed', 'together', 'gold']);
    if (o.live > 0 && o.by !== p.id) tthFinHit(st);
  }
  // his last tricks while the rams wind up and while they wait
  if ((tp.state === 'charge' || tp.state === 'armed') && !calm && (tp.trickT -= dt) <= 0) {
    const kind = tp.hits === 0 ? 'bub' : tp.hits === 1 ? 'cog' : tp.trickN % 2 ? 'bub' : 'cog';
    if (kind === 'bub') {
      let t = ps[(tp.trickN + tp.hits) % 2];
      if (st.safe[t.id] > 0) t = ps[1 - t.id];
      if (st.safe[t.id] <= 0) tthFinThrow(st, t);
    } else {
      const dir = tp.cogN++ % 2 ? -1 : 1;
      tp.cogs.push({ x: dir > 0 ? TTHFIN.x0 - 10 : TTHFIN.x1 + 10, dir, warn: TTHFIN.cog.warn, rot: 0, gone: false });
      Sfx.play('tthFinRumble');
      if (!reduceMotion) G.shake = Math.max(G.shake, 0.1);
      for (const p of ps) tthFinTip(st, p.id, 'cog', tp.cogN <= 2 ? 'A cog! Jump it: ' + tthKey(p.id, 'jump') + '!' : 'Cog! Jump!', tp.cogN <= 2 ? 0 : 7, { life: 2.2, cpu: null });
      if (tp.cogN === 1) tthSay(st, 'Mind my loose cogs! Hee hee!', 2);
    }
    tp.trickN++;
    tp.trickT = K.every[Math.min(2, tp.hits)] * (0.9 + 0.2 * tthRand()) * (tp.sleepy ? 1.6 : 1);
  }
  const C0 = TTHFIN.cog;
  for (const g of tp.cogs) {
    if (g.warn > 0) { g.warn -= dt; continue; }
    const v = C0.v * (tp.sleepy ? 0.72 : 1) * g.dir;
    g.x += v * dt; g.rot += v * dt / C0.r;
    if ((G.tickN % 8) === 0) G.particles.push({ x: g.x - g.dir * 10, y: deckY - 2, vx: -g.dir * 40, vy: -40 - tthRand() * 50, life: 0.3, max: 0.3, col: '#f6d37a', size: 2.5, grav: 300, kind: 'dot' });
    for (const p of ps) {
      const nx = clamp(g.x, p.x, p.x + p.w), ny = clamp(deckY - C0.r, p.y, p.y + p.h);
      if ((nx - g.x) ** 2 + (ny - (deckY - C0.r)) ** 2 > (C0.r - 3) ** 2) continue;
      if (tthBonk(st, p, { kind: 'cog', word: 'Bonk!', fromX: g.x })) { ph.P[p.id].on = null; tthFinTrickHit(st); }
    }
    if (g.x < TTHFIN.x0 - 40 || g.x > TTHFIN.x1 + 40) g.gone = true;
  }
  if (tp.cogs.some(g => g.gone)) tp.cogs = tp.cogs.filter(g => !g.gone);
  if (calm && st.idle && tp.cogs.length) tp.cogs = [];
  // who still has to find a plunger
  if (!calm && tp.state !== 'dock' && tp.state !== 'hit') {
    const at = ps.map(p => tthFinPlunger(st, p));
    for (const p of ps) {
      if (at[p.id] >= 0 && at[1 - p.id] === at[p.id] && p.id === 1) { tthFinTip(st, p.id, 'plunger', 'One plunger each! Take the other one ' + (at[p.id] ? '◀' : '▶'), 6, { cpu: null }); continue; }
      if (at[p.id] >= 0 || p.stun > 0 || st.safe[p.id] > 0) continue;
      const free = at[1 - p.id] === 0 ? 1 : at[1 - p.id] === 1 ? 0 : (tthFinCx(p) < 480 ? 0 : 1);
      if (Math.abs(tthFinCx(p) - K.plX[free]) > 60) tthFinTip(st, p.id, 'plunger', 'Stand at the plunger! ' + (K.plX[free] < tthFinCx(p) ? '◀' : '▶'), 7, { cpu: null });
    }
  }
}
function tthFinMiss(st, s) {
  const ph = st.ph, tp = ph.top, K = TTHFIN.smash, G0 = TTHFIN.gold, r = tp.rams[s], deckY = tthFinLY(4);
  r.cool = K.cool; tp.miss++; tthStats(st).misses = (tthStats(st).misses || 0) + 1;
  Sfx.play('tthFinMiss');
  tthPop(st, 480, deckY - 205, 'Together!', '#ffd23f', 24);
  if (tp.miss % 3 === 1) tthReact(st, 'happy', tp.miss === 1 ? 'Ha! One ram just tickles!' : 'Missed me!', 1.6);
  for (const p of G.players) tthFinTip(st, p.id, 'together', 'Press ' + tthFinAct(p.id) + ' at the same time: 3, 2, 1, go!', 6, { life: 3.4, cpu: null });
  if (tp.miss === G0.miss) { tp.window = K.gold[0]; tthHelp(st, 'Gold help: the rams wait longer for each other!'); }
  else if (tp.miss === G0.miss2) { tp.window = K.gold[1]; tthHelp(st, 'Gold help: the rams wait much longer now!'); }
}
function tthFinHit(st) {
  const ph = st.ph, tp = ph.top, K = TTHFIN.smash, deckY = tthFinLY(4), c = st.thief;
  tp.hits++; tp.state = 'hit'; tp.t = 0; tp.flash = 1;
  for (const r of tp.rams) { r.live = 0; r.cool = K.hitT; r.k = 1; }
  tthStats(st).hits = tp.hits;
  Sfx.play('tthFinBoom'); for (const p of G.players) rumble(p.id, 0.9, 0.7, 260);
  if (!reduceMotion) G.shake = Math.max(G.shake, tp.hits >= K.hits ? 0.6 : 0.42);
  tthFinDebris(st, 480, deckY - 100, 16 + tp.hits * 6);
  burst(480, deckY - 100, '#f6d37a', 14); burst(480, deckY - 100, '#ffffff', 8);
  tthPop(st, 480, deckY - 215, ['CRUNCH!', 'SMASH!', 'KA-BOOM!'][Math.min(2, tp.hits - 1)], C.gold, 36);
  for (const g of tp.cogs) if (g.warn <= 0) burst(g.x, deckY - 14, '#f6d37a', 8);
  tp.cogs = []; for (const b of ph.bubs) b.dud = true;
  st.hints = [null, null];
  if (tp.hits >= K.hits) { tthFinStartFin(st); return; }
  c.hitT = 0.7; c.pose = 'shock'; ph.thiefPoseT = 1.3;
  tthReact(st, 'shocked', TTHFIN_OUCH[tp.hits - 1], 2);
  tthCelebrate(st, 1.1);
  tthNews(st, 'Hit ' + tp.hits + ' of ' + K.hits + '! The rams wind up again...', false, 2.6);
}

/* ---------- the pay-off: the machine bursts and everything he stole flies home ---------- */
function tthFinPortalAt(st, i) { return { x: 96 + i * 109.7, y: tthFinLY(4) - TTHFIN.topFoot + 208 - 56 * Math.sin(Math.PI * i / 7) }; }
function tthFinStartFin(st) {
  const ph = st.ph, c = st.thief, deckY = tthFinLY(4);
  ph.stage = 'fin';
  ph.fin = { t: 0, landed: false, all: false, done: false, said: 0, items: TTH_LOOT.map((kind, i) => ({ kind, i, s: 0, ft: 0, x: 480, y: deckY - 100, fx: 0, fy: 0 })), open: TTH_LOOT.map(() => 0), lit: TTH_LOOT.map(() => 0) };
  Object.assign(c, { jet: false, pose: 'shock', mood: 'shocked', baseMood: 'sad', moodT: 1.2, item: null, hitT: 0.9, face: 1 });
  ph.thiefPoseT = 0;
  tthFinDebris(st, 480, deckY - 100, 44);
  for (let n = 0; n < 30; n++) confetti(480 + (tthRand() - 0.5) * 160, deckY - 120);
  burst(480, deckY - 100, '#ff9a3c', 20); burst(480, deckY - 100, '#7fe9ff', 14);
  tthNews(st, 'The Time Machine is SMASHED!', true, 2.4);
  tthSay(st, TTHFIN_OUCH[2], 1.4);
  tthStats(st).smashT = Math.round(st.phT * 10) / 10;
}
function tthFinFinale(st, dt) {
  const ph = st.ph, f = ph.fin, K = TTHFIN.fin, c = st.thief, deckY = tthFinLY(4), ps = G.players;
  if (!f || f.done) return;
  f.t += dt;
  const cx = 480, cy = deckY - 212;
  // the Thief tumbles out of the wreck and lands on the deck, dizzy
  if (f.t < 1) { const u = f.t; c.x = 480 + 114 * u; c.y = deckY - 56 * (1 - u) - Math.sin(u * Math.PI) * 120; c.s += (0.9 - c.s) * Math.min(1, dt * 4); }
  else if (!f.landed) {
    f.landed = true; c.x = 594; c.y = deckY; c.pose = 'dizzy'; c.mood = 'sad';
    puff(c.x, deckY, 10, 'rgba(255,255,255,0.8)'); Sfx.play('tthFinClunk');
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.15);
    tthSay(st, 'Ooooh... everything is spinning...', 2.4);
  }
  // the 8 things whirl up out of the wreck, then fly home one by one, each into its own little portal
  const tAll = K.whirl + (f.items.length - 1) * K.each + K.fly;
  for (const it of f.items) {
    const t0 = 0.45 + it.i * 0.09, ti = K.whirl + it.i * K.each;
    if (it.s === 0 && f.t >= t0) { it.s = 1; Sfx.play('tthPop'); }
    if (it.s === 1) {
      const g = clamp((f.t - t0) / 1.3, 0, 1), e = g * g * (3 - 2 * g), a = f.t * 2.7 + it.i * Math.PI / 4;
      it.x = cx + Math.cos(a) * 84 * e; it.y = deckY - 100 + (cy - (deckY - 100)) * e + Math.sin(a) * 34 * e;
      if (f.t >= ti) { it.s = 2; it.ft = 0; it.fx = it.x; it.fy = it.y; Sfx.play('tthFinWhoosh'); }
    } else if (it.s === 2) {
      it.ft += dt;
      const u = clamp(it.ft / K.fly, 0, 1), e = u * u * (3 - 2 * u), P = tthFinPortalAt(st, it.i);
      it.x = it.fx + (P.x - it.fx) * e; it.y = it.fy + (P.y - it.fy) * e - Math.sin(u * Math.PI) * 30;
      if (u >= 1) {
        it.s = 3; f.lit[it.i] = 0.001;
        Sfx.play('tthFinHome', it.i);
        tthNews(st, TTHFIN_HOME[it.i][0], true, 2.4);
        for (let n = 0; n < 8; n++) { const a = n / 8 * Math.PI * 2; G.particles.push({ x: P.x, y: P.y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, life: 0.5, max: 0.5, col: n % 2 ? '#fff3c4' : TTH_ERAS[TTH_ORDER[it.i]].col, size: 3.5, grav: 0, kind: 'dot' }); }
      }
    }
    // its portal opens just before it leaves, and closes when everything is home
    const want = f.t >= tAll + 1.0 ? 0 : f.t >= ti - 0.5 ? 1 : 0;
    f.open[it.i] = approach(f.open[it.i], want, dt * (want ? 2.6 : 2.2));
    if (f.lit[it.i] > 0) f.lit[it.i] = Math.min(1, f.lit[it.i] + dt * 3);
  }
  if (f.said === 0 && f.t >= 1.3) { f.said = 1; tthNews(st, 'Look! Everything he stole is flying home!', true, 1.9); }
  if (!f.all && f.t >= tAll + 0.15) {
    f.all = true; Sfx.play('tthCheer'); Sfx.play('tthGot');
    tthNews(st, 'Everything is home. History is safe!', true, 4);
    for (let n = 0; n < 40; n++) confetti(120 + tthRand() * (W - 240), st.cam.y + 150 + tthRand() * 60);
    ps.forEach((p, k) => { st.hints[k] = { text: k ? 'Hooray!' : 'We did it!', t: 0, life: 2.2, gold: true }; if (p.grounded && !p.input.left && !p.input.right) p.pendingJump = true; });
    c.pose = 'sulk'; tthSay(st, 'All my lovely things... gone home.', 1.5);
  }
  if (f.t >= tAll + K.after) {
    f.done = true; c.pose = 'idle'; c.mood = 'smug'; c.baseMood = 'smug'; c.face = 1;
    tthPhaseDone(st, { got: false, say: 'One last portal... race you home!', portal: { x: 722, y: deckY - 84 } });
  }
}

/* ---------- hints and the stuck help while they climb ---------- */
// the gear the climber is waiting at (they stand on the thing just before it), or null
function tthFinWaitGear(st) {
  const ph = st.ph, sec = ph.sec, on = ph.P[1 - ph.holder].on;
  if (!on || on.kind === 'peg') return null;
  const i = on === sec.base.plat ? -1 : sec.els.indexOf(on.el);
  if (i < -1 || (i < 0 && on !== sec.base.plat)) return null;
  const nx = sec.els[i + 1];
  return nx && nx.kind === 'gear' ? nx : null;
}
function tthFinHints(st, dt) {
  const ph = st.ph, ps = G.players, K = TTHFIN, sec = ph.sec;
  if (ph.jobTipT > 0 && !tthCalm(st) && (ph.jobTipT -= dt) <= 0) tthFinJobTips(st);
  if (ph.stage !== 'climb' || tthCalm(st) || ph.rw) return;
  const hd = ph.holder, cl = 1 - hd, H = ps[hd], Cl = ps[cl], at = tthFinAtLever(st, H);
  if (ph.factT > 0 && (ph.factT -= dt) <= 0 && sec.S.fact && !st.news) tthNews(st, sec.S.fact, false, 5.5); else if (ph.factT <= 0 && ph.factT > -9) ph.factT = st.news ? 1.5 : -10;
  const g = tthFinWaitGear(st);
  if (g && g.w > K.gear.ride) {
    ph.waitT += dt;
    if (ph.waitT > 0.9) {
      tthFinTip(st, cl, 'gearwait', ph.slip ? 'Wait: ' + NAMES[hd] + ' rests the grip.' : 'Too fast to ride! Wait for the brake.', 8, { cpu: null });
      if (!ph.slip && !at) tthFinTip(st, hd, 'lever', 'Go to the lever! ' + (sec.lever.x < tthFinCx(H) ? '◀' : '▶'), 5, { cpu: null });
      else if (!ph.slip) tthFinTip(st, hd, 'brake', 'Hold ' + tthFinAct(hd) + ' now: slow the gears!', 5, { cpu: null });
    }
  } else { ph.waitT = 0; if (g && ph.braking) tthFinTip(st, cl, 'gogear', 'Green lamp! Hop on the gear!', 9, { life: 2.4, cpu: null }); }
  // up on the next deck: the button
  if (ph.P[cl].on === sec.upper.plat && !sec.button.down) {
    const d = sec.button.x - tthFinCx(Cl);
    if (Math.abs(d) > K.button.reach) tthFinTip(st, cl, 'gobtn', 'Go to the button! ' + (d < 0 ? '◀' : '▶'), 5, { cpu: null });
    else tthFinTip(st, cl, 'btn', 'Press ' + tthFinAct(cl) + ' at the button!', 4, { cpu: null });
  }
  // no new height for a long while: the clockwork slows down, and a gold hint for whoever's turn it is
  const h = sec.base.y - tthFinFeet(Cl);
  if (h > sec.best + 12) { sec.best = h; sec.stuckT = 0; ph.goldAt = null; return; }
  if ((sec.stuckT += dt) < K.gold.stuckT) return;
  sec.stuckT = 0; sec.stuckN++;
  let id, text;
  if (ph.P[cl].on === sec.upper.plat) { id = cl; text = 'Press ' + tthFinAct(cl) + ' at the button!'; ph.goldAt = { x: sec.button.x, y: sec.button.y - 70 }; }
  else if (g && !ph.braking) { id = hd; text = 'Hold ' + tthFinAct(hd) + ' at the lever when ' + NAMES[cl] + ' is at a gear!'; ph.goldAt = { x: sec.lever.x, y: sec.lever.y - 120 }; }
  else {
    id = cl; text = g ? 'Hop on the gear while the lamp is green!' : 'Jump up the clockwork: ' + tthKey(cl, 'jump') + '!';
    const on = ph.P[cl].on, i = on && on.el ? sec.els.indexOf(on.el) : -1, nx = sec.els[i + 1];
    ph.goldAt = nx ? (nx.kind === 'gear' ? { x: nx.x, y: nx.y - nx.r - 50 } : { x: nx.plat.x + nx.plat.w / 2, y: nx.plat.y - 50, el: nx }) : { x: (sec.S.hatch[0] + sec.S.hatch[1]) / 2, y: sec.upper.y + 60 };
  }
  if (tthFinSolo(id)) { id = 1 - id; text = id === hd ? 'Hold ' + tthFinAct(hd) + ' at the lever when ' + NAMES[cl] + ' waits at a gear!' : 'Climb on: jump ' + tthKey(cl, 'jump') + ' from shelf to shelf!'; }
  if (ph.gold.mech < 2) {
    ph.gold.mech++; ph.mechK = ph.gold.mech === 1 ? 0.55 : 0.3;
    tthHelp(st, ph.gold.mech === 1 ? 'Gold help: the clockwork slows down!' : 'Gold help: sleepy clockwork! Take your time.', { id, hint: text, life: 5 });
  } else tthFinTip(st, id, 'gold', text, 0, { gold: true, life: 5, cpu: null });
}
// the Thief: hovering in the right margin while they climb, docked on the pedestal at the top
function tthFinThief(st, dt) {
  const ph = st.ph, c = st.thief, ps = G.players;
  if (ph.thiefPoseT > 0 && (ph.thiefPoseT -= dt) <= 0) c.pose = 'idle';
  if (ph.stage === 'fin') return;
  let tx = 886, ty = st.cam.y + 318 + Math.sin(ph.t * 1.1) * 12, ts = 0.62;
  if (ph.stage === 'top') { const tp = ph.top; tx = 480 - tp.push * 12; ty = tthFinLY(4) - 58; ts = 0.85; c.face = tp.push > 0.1 ? 1 : tp.push < -0.1 ? -1 : c.face; }
  else { const Cl = ps[1 - ph.holder]; c.look = { x: tthFinCx(Cl), y: Cl.y }; if (ph.thiefPoseT <= 0) c.face = -1; }
  const k = Math.min(1, dt * (ph.stage === 'top' ? 2.4 : 5));
  c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.s += (ts - c.s) * Math.min(1, dt * 2);
  c.jet = true; c.flame = ph.stage === 'top' && Math.abs(c.x - tx) < 6 ? 0.35 : 1;
}
