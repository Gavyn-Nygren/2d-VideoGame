/* Pip & Bo - Level 30-1 The Time Thief: era 'finale' (The End of Time). */
'use strict';

/* ===== 30-1 era 9: The End of Time (TTH_PHASES.finale) — Gavyn's plan: "a swirling clock world. One holds back the
   clock hands while the other climbs the gears to his machine", then smash the machine together and everything flies
   home. The big showdown, on foot. About 2 minutes for a good pair (the computer pair: about 2:00).
   THE PLACE. A brass clockwork tower in a swirling violet clock-sky, climbed UP (the camera scrolls up after the lower
   player). The tower is one screen wide (x 150-810) and has 7 decks 380 px apart: the start deck, ledges 1-5 and the
   top deck (ledge 6 = deck TTHFIN_N) where the Thief's time machine sits. Behind it hangs a giant clock with ONE hand.
   The era runs its own collision (tthFinBody): every platform is a one-way top (jump up through it, land on it), the
   decks are solid slabs with one HATCH (a one-way trapdoor) and a lift shaft. Pip and Bo pass through each other (no
   stacking, so nobody can be boosted past a gear). Nobody can fall below the deck they started the climb from.
   THE TWO JOBS (they swap at every ledge, so each player does both three times; room field `first` = first HOLDER):
   - HOLDER ("brake"): stands at the brake lever of the deck (in the holder's colour) and HOLDS the action. While the
     brake is held the huge hand stops, every gear slows to a ridable speed (green lamps) and the folding teeth lock
     OUT. A GRIP meter over the lever drains while holding (TTHFIN.grip.hold s from full) and refills while resting
     (grip.rest s), so holding is a decision, not a button to tape down: when it runs out the lever SLIPS and can only
     be grabbed again after the button was let go and the grip is back over grip.regrab. Feet on the deck, within
     lever.reach px of the lever.
   - CLIMBER ("press"): climbs the clockwork to the hatch of the next deck and presses the action at the button up
     there (in the climber's colour). That stops the clock and lowers the LIFT for the holder (it shuttles until both
     are up). Both on the new deck = the ledge is reached: a checkpoint, a breather, "Swap jobs!".
   THE CLOCKWORK. Every climb has the same bones (TTHFIN_SECS): a STEP (the new thing of that climb), gear A, the SAFE
   SHELF (a checkpoint), gear B, the hatch.
     gears        a turning cog with little hanging platforms (pegs) on its rim: riding one carries you round and UP.
                  Unbraked they whirl (red lamp, streaks): a fast peg is not solid ("Too fast!") and a rider on a gear
                  that speeds up is shaken off after about half a second ("Whoa!"). No jump can skip a gear, so the
                  climber always needs the holder.
     the step     climb 1 a plain shelf; 2 a pendulum bob to time; 3 two escapement teeth that click in and out in turn
                  (they blink 0.6 s before they fold; the brake locks them out, and they blink TTHFIN_TOOTH.lock s
                  before folding again when it lets go); 4 a sliding piston; 5 a faster pendulum; 6 teeth again.
     safe shelf   once the climber has stood on it, a rewind or a fall only goes back to it: a climber who drops to
                  the deck after it is whisked back up ("Back to the safe shelf!", rewind.catchT s after landing).
   THE HUGE HAND. It sweeps once round the giant clock (hand.sweep s per climb, unbraked). When it reaches 12 the
   Thief's machine REWINDS time: whoever is up in the clockwork is whisked back along their own path ("Rewind!", soft;
   counted as a bump only the first time at each spot) and the hand starts again. The last part of the sweep is red,
   ticks faster and puts a "!" over the climber. A climber on the safe shelf or the next deck is safe. A pie gauge in
   the left margin shows the same sweep for small screens.
   THE HAND FIGHTS BACK (climbs 5 and 6, tthFinKicks). While the brake is held the hand winds up and KICKS the lever:
   the lever shakes and flashes red, a red ring closes on it, the meter says "let go!" (kick.warn s, 0.9). Whoever
   still holds the brake at that moment is kicked off: the grip is gone ("Kicked!", a counted soft fail) and the gears
   run away. Let go before the kick, grab again after it ("Dodged!"): the clockwork holds still from the warning until
   kick.grace s after a dodged kick, so letting go early costs nothing. The next kick comes after S.kick.every s of
   braking. The hand also sweeps faster on these two climbs.
   THE THIEF hovers in his machine in the right margin and (from climb 2) throws TICK-TOCK BUBBLES: a ring marks the
   spot (where that player stood) for the whole flight (bub.fly s, never under 0.6 s); who is still inside when it
   lands is frozen for bub.freeze s ("Tick-tock!", a counted soft fail). A frozen holder lets go of the lever. Climb 2
   aims at the climber only; later climbs at both in turn. Step out of the ring or jump over it.
   THE TOP: SMASH IT TOGETHER (no jobs: both "smash"). The machine docks on a pedestal between two RAMS. Each player
   stands at a plunger (left or right) and, when the lamps turn green ("NOW!"), presses the action: that side's ram
   shoots out and waits smash.window s for the other one. Both rams together = a HIT; a lone ram is dodged
   ("Together!", not a bump). 4 hits. EVERY HIT shakes two of the 8 stolen things out of the machine: they hover over
   it and fly, one after the other, into little portals named after their eras ("The T. rex egg is home, 66 million
   years ago!"; things in st.loot get a gold tick, the rest a green one). Between hits the Thief plays his last tricks
   while the rams re-arm (smash.charge s): bubbles at the plungers (before hit 1), cogs that roll across the deck to
   jump (telegraphed cog.warn s at the edge; before hit 2), both (hits 3 and 4). A cog hit is a counted "Bonk!".
   THE PAY-OFF (about 5 s, players keep control): hit 4 bursts the machine, the Thief plops out dizzy (on foot), the
   last two things fly home, all 8 portals flare ("Everything is home. History is safe!"). Then he takes out his
   pocket watch: tthPhaseDone(st, { got: false, say: 'One last portal... race you home!' }) and the core runs the
   portal cutscene into the race.
   GOLD HELP (announced with tthHelp, per climb): 2 rewinds: the hand slows (x hand.goldK); 4: the hand is stuck.
   3 shake-offs, or gold.slowT s on one climb: gold grip (the brake holds twice as long and the gears speed up
   slowly). gold.slowT2 s on one climb: sleepy gears (one pull of the brake keeps them slow for seconds) and a stuck
   hand. 3 bubble freezes: sleepy bubbles. 3 kicks: the hand is too tired to kick. 26 s with no new height: the
   clockwork (pendulum, piston, teeth) slows down, then naps, with a gold hint for whoever's turn it is. Two drops
   through a folding tooth: a hint for the holder that the brake locks the teeth. At the top: 3 lone rams widen the
   window (0.9 s, then 1.5 s); 3 trick hits make the tricks sleepy. (Time only counts while somebody plays.)
   FAIRNESS. Everything is telegraphed at least 0.6 s. No hazard starts in a calm moment (tthCalm: cards, cutscenes,
   celebrations, nobody playing) and the hand stops then. Bubbles are never aimed at someone on the lift, being
   rewound or already safe on the next deck. Nothing can be cleared alone: gears need the brake, the lift needs the
   button, a hit needs both rams. Randomness only through tthRand().
   HISTORY (news line on climbs 1-3): the first clocks had only an hour hand; the first pendulum clock was built in
   1656; tick-tock is the escapement's teeth. (And every thing that flies home says where and when it belongs.)
   Stats (st.stats.finale): ledges, ledgeT, rewinds, flings, frozen, slips, kicks, catches, hits, misses, home,
   smashT. Every top-level name starts with tthFin / TTHFIN (Sfx.extra.tthFin*). All state lives in st.ph (fresh
   every phase start). Tests: tools/w30/finale-keys.js (real keys / controller / touch / 1-player), finale-dbg.js
   (traces, a clumsy kid), finale-perf.js (draw time). */
const TTHFIN = {
  x0: 150, x1: 810, gap: 380, deckH: 14, foot: 508, topFoot: 470,
  liftW: 84, liftX: [154, 722],                       // the lift columns: left (x 154-238) and right (x 722-806)
  lever: { reach: 42 },
  grip: { hold: 7, rest: 5, regrab: 0.4, goldK: 0.5 },
  gear: { fast: 3.3, slow: 0.7, ride: 1.7, upT: 1.4, downT: 0.35, goldUp: 2.6, sleepyUp: 12 },
  hand: { sweep: [22, 20, 19, 18, 15, 13], startK: 0.02, warnK: 0.78, goldK: 1.6 },
  kick: { warn: 0.9, grace: 0.45 },                   // the hand fights back (climbs 5-6): the lever kicks after warn s

  lift: { down: 240, up: 140, board: 0.25, again: 0.6 },
  bub: { fly: 1.5, goldFly: 2.2, rx: 30, ry: 40, freeze: 1.0, first: 4.2 },
  rewind: { t: 0.95, safe: 1.6, every: 0.08, catchT: 0.3 },
  button: { reach: 24 },
  smash: { hits: 4, window: 0.55, gold: [0.9, 1.5], charge: 3.8, dock: 2.2, cool: 0.9, hitT: 3.2, reach: 28, plX: [300, 660], every: [3.0, 3.2, 2.6, 2.3] },
  cog: { r: 15, v: 265, warn: 0.9 },
  gold: { rewinds: 2, rewinds2: 4, flings: 3, frozen: 3, kicks: 3, slowT: 24, slowT2: 40, stuckT: 26, miss: 3, miss2: 6, tricks: 3 },
  home: { go: [0.7, 1.85], fly: 0.65, after: 2.0 },    // two stolen things fly home per hit: when each leaves (s after the hit)
};
// The six climbs. Every climb has the same bones: a STEP (the new thing of the ledge), gear A, the safe shelf R (a
// checkpoint), gear B, the hatch. They are written in "u" (px from the wall opposite the lift: the tower is mirrored
// when the lift is on the left) and h (px above the lower deck); tthFinSec turns u into x at load time.
// lift: 0 left / 1 right column; every / pattern: tick-tock bubbles (C at the climber, H at the holder);
// kick: { first, every }: the lever kicks after that many seconds of braking (climbs 5-6).
// els, in route order: shelf (rest: the safe shelf), pend (pivot u / ph), piston (u0 <-> u1), tooth (set 0 / 1), gear.
const TTHFIN_GA = { id: 'gA', kind: 'gear', u: 180, h: 174, r: 62, n: 5, pw: 54 }, TTHFIN_GB = { id: 'gB', kind: 'gear', u: 448, h: 264, r: 60, n: 5, pw: 54 };
const TTHFIN_R = { id: 'R', kind: 'shelf', rest: true, u: 268, h: 230, w: 70 };
function tthFinSec(S) {
  const right = S.lift === 1, X = u => (right ? 160 + u : 800 - u), L = (u, w) => (right ? 160 + u : 800 - u - w);
  const out = Object.assign({}, S, { lever: X(505), button: X(215), back: X(150), hatch: right ? [X(398), X(498)] : [X(498), X(398)] });
  out.els = S.els.map(E => {
    const e = Object.assign({}, E);
    if (E.kind === 'gear') { e.x = X(E.u); e.dir = right ? 1 : -1; }      // (the pegs rise on the side the climber comes from)
    else if (E.kind === 'pend') e.px = X(E.u);
    else if (E.kind === 'piston') { e.x0 = right ? L(E.u0, E.w) : L(E.u1, E.w); e.x1 = right ? L(E.u1, E.w) : L(E.u0, E.w); }
    else e.x = L(E.u, E.w);
    return e;
  });
  return out;
}
const TTHFIN_SECS = [
  { name: 'First Gears', lift: 0, every: 0, pattern: '', fact: 'Did you know? The first clocks had only ONE hand: the hour hand.',
    els: [{ id: 's1', kind: 'shelf', u: 15, h: 80, w: 85 }, TTHFIN_GA, TTHFIN_R, TTHFIN_GB] },
  { name: 'Pendulum Hop', lift: 1, every: 7, pattern: 'C', fact: 'Did you know? The first pendulum clock was built in 1656.',
    els: [{ id: 'p1', kind: 'pend', u: 78, ph: 222, len: 142, amp: 0.42, per: 3.2, w: 60 }, TTHFIN_GA, TTHFIN_R, TTHFIN_GB] },
  { name: 'Tick-Tock Teeth', lift: 0, every: 5.6, pattern: 'CH', fact: 'Did you know? A clock says tick-tock because its escapement teeth click.',
    els: [{ id: 't1', kind: 'tooth', u: 12, h: 68, w: 60, set: 0 }, { id: 't2', kind: 'tooth', u: 84, h: 98, w: 60, set: 1 }, TTHFIN_GA, TTHFIN_R, TTHFIN_GB] },
  { name: 'Piston Pass', lift: 1, every: 4.8, pattern: 'CHC', fact: '',
    els: [{ id: 'z1', kind: 'piston', u0: 10, u1: 96, h: 88, w: 64, v: 90, dwell: 0.9 }, Object.assign({}, TTHFIN_GA, { n: 4 }), TTHFIN_R, Object.assign({}, TTHFIN_GB, { n: 4 })] },
  { name: 'The Hand Fights Back', lift: 0, every: 5.4, pattern: 'CH', kick: { first: 1.2, every: 2.4 }, fact: '',
    els: [{ id: 'p2', kind: 'pend', u: 78, ph: 222, len: 142, amp: 0.5, per: 2.8, w: 60 }, Object.assign({}, TTHFIN_GA, { n: 4 }), TTHFIN_R, Object.assign({}, TTHFIN_GB, { n: 4 })] },
  { name: 'The Last Climb', lift: 1, every: 4.6, pattern: 'CHC', kick: { first: 1.0, every: 2.0 }, fact: '',
    els: [{ id: 't3', kind: 'tooth', u: 12, h: 68, w: 60, set: 0 }, { id: 't4', kind: 'tooth', u: 84, h: 98, w: 60, set: 1 }, Object.assign({}, TTHFIN_GA, { n: 4 }), TTHFIN_R, Object.assign({}, TTHFIN_GB, { n: 4 })] },
].map(tthFinSec);
const TTHFIN_N = TTHFIN_SECS.length;                   // climbs (= ledges); the top deck is deck TTHFIN_N
const TTHFIN_TOOTH = { per: 3, on: 0.6, warn: 0.2, lock: 0.7 };   // a tooth is in for on * per s, and blinks for warn * per s before it folds
const TTHFIN_HOME = [   // the pay-off: one line and one portal name per stolen thing, in TTH_LOOT order
  ['The T. rex egg is home, 66 million years ago!', 'Dinosaurs'], ['The great stone is home, at Stonehenge, 2500 BC!', 'Stonehenge'],
  ['The wooden horse is home, in Troy, 1200 BC!', 'Troy'], ['The wreath is home, at the first Olympics, 776 BC!', 'Olympia'],
  ['The sunstone is home, with the Vikings, 1000 AD!', 'Vikings'], ['Leonardo\'s plans are home, in the 1490s!', 'Leonardo'],
  ['The propeller is home, on the Wright Flyer, 1903!', 'The Flyer'], ['The flag is home, on the Moon, 1969!', 'The Moon'],
];
const TTHFIN_TAUNTS = ['Welcome to the End of Time! Tick, tock!', 'Hmph! One ledge is nothing!', 'Stop climbing my clock!', 'My machine is nearly wound up!', 'Now my clock FIGHTS BACK!', 'Kick them off, clock! Kick!'];
const TTHFIN_OUCH = ['Hey! Careful with that!', 'Stop! It\'s an antique!', 'Not my lovely things!', 'Noooo! My machine!'];
const tthFinLY = i => -i * TTHFIN.gap;                 // the floor of deck i (world y; up is negative)
const tthFinSolo = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const tthFinCx = p => p.x + p.w / 2;
const tthFinFeet = p => p.y + p.h;

/* ---------- building the tower: decks, lifts, the clockwork of each climb ---------- */
function tthFinBuild() {
  const K = TTHFIN, decks = [], plats = [], els = [], secs = [];
  for (let i = 0; i <= TTHFIN_N; i++) {
    const S = i > 0 ? TTHFIN_SECS[i - 1] : null, col = S ? K.liftX[S.lift] : null;   // the deck's own lift column (the lift from below)
    const d = { i, y: tthFinLY(i), x0: K.x0, x1: K.x1, hatch: S ? S.hatch : null, col: S ? [col, col + K.liftW] : null };
    if (S) { if (S.lift === 0) d.x0 = col + K.liftW; else d.x1 = col; }
    d.plat = { kind: 'deck', deck: d, x: d.x0, y: d.y, w: d.x1 - d.x0, dx: 0, dy: 0, solid: true, sec: i };
    decks.push(d);
  }
  TTHFIN_SECS.forEach((S, k) => {
    const y0 = tthFinLY(k), col = K.liftX[S.lift];
    const sec = { k, S, els: [], gears: [], lever: { x: S.lever, y: y0 }, button: { x: S.button, y: tthFinLY(k + 1), down: false, t: 0 }, back: S.back, base: decks[k], upper: decks[k + 1] };
    Object.assign(sec, { rewinds: 0, rwN: [0, 0], cp: null, flings: 0, frozen: 0, kicks: 0, drops: 0, T: 0, best: 0, stuckT: 0, stuckN: 0 });
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
  const braking = (ph.braking || ph.kick || ph.kickGrace > 0) && ph.stage === 'climb';   // (the clock holds its breath around a kick)
  ph.tm += dt * ph.mechK;
  if (!braking) ph.tt += dt * ph.mechK;                 // the escapement only ticks while the clock runs
  for (const el of ph.c.els) {
    if (el.kind === 'gear') {
      const G0 = K.gear, want = el.sec < ph.k || ph.stage === 'fin' ? G0.slow * 0.5 : braking && el.sec === ph.k ? G0.slow : ph.stage === 'top' ? G0.slow : G0.fast;
      const rate = (G0.fast - G0.slow) / (want > el.w ? G0.upT * (el.sec !== ph.k ? 1 : ph.gold.sleepy ? G0.sleepyUp : ph.gold.grip ? G0.goldUp : 1) : G0.downT);
      el.w = approach(el.w, want, rate * dt);
      el.a += el.w * el.dir * dt;
      const ok = el.w <= G0.ride && el.sec === ph.k;
      for (const q of el.pegs) { tthFinPegAt(el, q.n, el.a, o); q.dx = o.x - q.x; q.dy = o.y - q.y; q.x = o.x; q.y = o.y; q.solid = ok; }
    } else if (el.kind !== 'shelf') {
      const q = el.plat; tthFinElAt(el, el.kind === 'tooth' ? ph.tt : ph.tm, o);
      q.dx = o.x - q.x; q.dy = o.y - q.y; q.x = o.x; q.y = o.y;
      if (el.kind === 'tooth') {
        // the brake locks every tooth OUT; let go and a tooth that should be folded blinks TTHFIN_TOOTH.lock s first
        el.lock = braking && el.sec === ph.k ? TTHFIN_TOOTH.lock : Math.max(0, (el.lock || 0) - dt);
        const solid = o.solid || el.lock > 0;
        if (q.solid !== solid && el.sec === ph.k && ph.stage === 'climb') Sfx.play('tthFinClick');
        q.solid = solid; el.warn = o.warn || (!o.solid && el.lock > 0 && !braking); el.f = o.f;
      }
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
    else if (on.kind === 'tooth' && ph.stage === 'climb' && ++ph.sec.drops >= 2) tthFinTip(st, ph.holder, 'teeth', 'Hold ' + tthFinAct(ph.holder) + ': the brake locks the teeth out!', 9, { life: 4, cpu: null });
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
  if (ph.sec.flings >= TTHFIN.gold.flings && !ph.gold.grip) { ph.gold.grip = true; tthHelp(st, 'Gold help: gold grip! The brake holds longer and the gears speed up slowly.'); }
}
// the camera follows the lower player up the tower; the base deck of the climb sits near the bottom of the screen
function tthFinCam(st, snap, dt = DT) {
  const ph = st.ph, ps = G.players, K = TTHFIN;
  let ty;
  if (ph.stage === 'top' || ph.stage === 'fin') ty = tthFinLY(TTHFIN_N) - K.topFoot;
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
// (on touch: "the round button", the one name every era uses; the word on it changes with the job)
function tthFinAct(id) { return tthKey(id, 'act'); }
// the climber's line at the button up there (on touch there are two buttons: "the button" and "your round button")
function tthFinBtnTip(id, near) {
  const touch = tthDev(id) === 'touch';
  if (near) return touch ? 'You are there! Tap your round button!' : 'Press ' + tthFinAct(id) + ' at the button!';
  return 'Go to the button, then ' + (touch ? 'tap your round button!' : 'press ' + tthFinAct(id) + '!');
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
  tthFinKicks(st, dt, H);
  // fresh presses: the climber's button; a press in the wrong place gets a hint
  for (const p of ps) {
    if (!p.pendingAct) continue;
    p.pendingAct = false;
    if (p.stun > 0 || tthFinBusy(st, p)) continue;
    const up = ph.P[p.id].on === sec.upper.plat, bt = sec.button;
    if (p === Cl) {
      if (ph.stage === 'climb' && up && !bt.down && Math.abs(tthFinCx(p) - bt.x) <= K.button.reach) tthFinPress(st, p);
      else if (ph.stage === 'climb' && up && !bt.down) tthFinTip(st, p.id, 'btn', tthFinBtnTip(p.id, false), 4, { cpu: null });
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
// Climbs 5-6: the huge hand FIGHTS BACK. While the brake is held it winds up (the lever shakes and flashes red, a ring
// closes on it for kick.warn s) and then KICKS the lever. Whoever still holds it at that moment is kicked off: the
// grip is gone ("Kicked!", a counted soft fail) and the gears run away. Let go before the kick, grab again after it:
// the clockwork holds still from the warning until kick.grace s after a dodged kick, so letting go early costs nothing.
function tthFinKicks(st, dt, H) {
  const ph = st.ph, sec = ph.sec, KK = sec.S.kick, K = TTHFIN.kick, lv = sec.lever;
  if (ph.kickGrace > 0) ph.kickGrace -= dt;
  ph.kickFx = Math.max(0, ph.kickFx - dt * 3);
  if (!KK || ph.stage !== 'climb' || ph.gold.kick) { ph.kick = null; return; }
  if (!ph.kick) {
    if (!ph.braking || tthCalm(st) || ph.rw || (ph.kickT -= dt) > 0) return;
    ph.kick = { t: K.warn }; ph.kickN++;
    Sfx.play('tthFinKickWarn'); tthWarn(st, H.id, K.warn);
    tthFinTip(st, H.id, 'kick', ph.kickN <= 3 ? 'It kicks! Let go of ' + tthFinAct(H.id) + ' for a moment!' : 'Kick! Let go!', 0, { life: K.warn + 0.5, cpu: null });
    if (ph.kickN === 1) tthSay(st, 'My clock kicks back! Hee hee!', 2);
    return;
  }
  if ((ph.kick.t -= dt) > 0) return;
  ph.kick = null; ph.kickT = KK.every * (0.9 + 0.2 * tthRand()); ph.kickFx = 1;
  Sfx.play('tthFinKick');
  for (let n = 0; n < 8; n++) G.particles.push({ x: lv.x, y: lv.y - 50, vx: (tthRand() - 0.5) * 320, vy: -60 - tthRand() * 200, life: 0.4, max: 0.4, col: n % 2 ? '#ff5f6d' : '#ffd23f', size: 3, grav: 500, kind: 'dot' });
  if (!ph.braking) {   // dodged
    ph.kickGrace = K.grace;
    tthPop(st, lv.x, lv.y - 96, 'Dodged!', TTHFINC.green, 22); Sfx.play('tthDing');
    if (ph.slip) return;
    tthFinTip(st, H.id, 'regrab', 'Now grab the brake again!', 0, { life: 2, cpu: null });
    return;
  }
  ph.grip = 0; ph.slip = true; ph.braking = false; sec.kicks++; tthStats(st).kicks = (tthStats(st).kicks || 0) + 1;
  if (!tthBonk(st, H, { still: true, kind: 'kick', word: 'Kicked!', at: { x: lv.x, y: lv.y - 80 } })) tthPop(st, lv.x, lv.y - 80, 'Kicked!', '#ff8f7a', 22);
  rumble(H.id, 0.7, 0.5, 200);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.25);
  tthReact(st, 'happy', sec.kicks % 2 ? 'Kicked! Ha ha!' : 'My clock kicks hard!', 1.8);
  st.thief.pose = 'laugh'; ph.thiefPoseT = 1.4;
  if (sec.kicks >= TTHFIN.gold.kicks) { ph.gold.kick = true; tthHelp(st, 'Gold help: the huge hand is too tired to kick!'); }
  else tthFinTip(st, H.id, 'kick', 'Next time: let go of ' + tthFinAct(H.id) + ' when the lever flashes red!', 0, { life: 4, cpu: null });
}
function tthFinPress(st, p) {
  const ph = st.ph, sec = ph.sec, bt = sec.button;
  bt.down = true; bt.t = 0; ph.stage = 'lift'; ph.braking = false; ph.kick = null; ph.kickGrace = 0;
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
  if (ph.braking || safe || ph.gold.hand >= 2 || ph.kick || ph.kickGrace > 0) return;
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
    const on = ph.P[p.id].on;
    if (tthFinFeet(p) > sec.base.y - 8 || on === sec.upper.plat || on === sec.lift || (on && on.el && on.el.rest)) continue;   // (the safe shelf is safe)
    who[p.id] = true; any = true;
  }
  if (!any) { tthPop(st, W / 2, st.cam.y + 150, 'Dong!', '#f6d37a', 24); return; }
  ph.rw = { t: 0, who, from: ps.map(p => ({ x: p.x, y: p.y })), trail: ph.trail.map(t => t.slice()) };
  sec.rewinds++; tthStats(st).rewinds = (tthStats(st).rewinds || 0) + 1;
  const first = ++sec.rwN[sec.cp ? 1 : 0] === 1;         // a bump only the first time at each spot (the deck, the safe shelf)
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
    const on = ph.P[Cl.id].on;
    if (ph.stage === 'climb' && on && on.el && on.el.rest) {   // the safe shelf: from now on a rewind only goes back to here
      ph.trail.length = 0;
      if (sec.cp !== on.el) { sec.cp = on.el; tthPop(st, on.x + on.w / 2, on.y - 46, 'Safe shelf!', TTHFINC.green, 20); Sfx.play('tthDing'); tthStats(st).shelves = (tthStats(st).shelves || 0) + 1; }
    } else if (ph.stage === 'climb' && tthFinFeet(Cl) < sec.base.y - 8 && (ph.trailT -= dt) <= 0) { ph.trailT = K.rewind.every; ph.trail.push([Cl.x, Cl.y]); if (ph.trail.length > 140) ph.trail.splice(0, 2); }
    else if (tthFinFeet(Cl) >= sec.base.y - 8 && ph.trail.length) ph.trail.length = 0;
    // fell off after the safe shelf: whisked back up to it (a checkpoint: a fall costs a moment, not the whole climb)
    if (ph.stage === 'climb' && sec.cp && on === sec.base.plat && Cl.grounded && Cl.stun <= 0) {
      if ((ph.catchT += dt) >= K.rewind.catchT) {
        ph.catchT = 0;
        const who = [false, false]; who[Cl.id] = true;
        ph.rw = { t: 0, who, from: ps.map(p => ({ x: p.x, y: p.y })), trail: [], soft: true };
        ph.P[Cl.id].on = null; Cl.vx = 0; Cl.vy = 0; Cl.grounded = false;
        st.safe[Cl.id] = Math.max(st.safe[Cl.id], K.rewind.t + 0.8);
        for (const b of ph.bubs) if (b.id === Cl.id) b.dud = true;
        tthPop(st, tthFinCx(Cl), Cl.y - 14, 'Back to the safe shelf!', TTHFINC.green, 20); Sfx.play('tthFinWhoosh');
        tthStats(st).catches = (tthStats(st).catches || 0) + 1;
      }
    } else ph.catchT = 0;
    return;
  }
  rw.t += dt;
  const u = clamp(rw.t / K.rewind.t, 0, 1), e = u * u * (3 - 2 * u), Cl = 1 - ph.holder;
  for (const p of ps) {
    if (!rw.who[p.id]) continue;
    const cp = p.id === Cl && sec.cp ? sec.cp.plat : null;
    const bx = (cp ? cp.x + cp.w / 2 : sec.back + (p.id === Cl ? 0 : 40)) - p.w / 2, by = (cp ? cp.y : sec.base.y) - p.h, tr = p.id === Cl ? rw.trail : [];
    // back along the trail (newest first), ending on the deck
    const n = tr.length, f = e * (n + 1), i = Math.floor(f), fr = f - i;
    const pt = j => (j <= 0 ? [rw.from[p.id].x, rw.from[p.id].y] : j > n ? [bx, by] : tr[n - j]);
    const a = pt(i), b = pt(i + 1);
    p.x = a[0] + (b[0] - a[0]) * fr; p.y = a[1] + (b[1] - a[1]) * fr; p.vx = 0; p.vy = 0; p.face = bx > p.x ? 1 : -1;
    if ((G.tickN % 4) === 0) G.particles.push({ x: tthFinCx(p), y: p.y + p.h / 2, vx: 0, vy: 0, life: 0.35, max: 0.35, col: p.id ? 'rgba(91,149,255,0.7)' : 'rgba(255,107,74,0.7)', size: 9, grav: 0, kind: 'dot' });
    if (u >= 1) { p.x = bx; p.y = by; p.grounded = true; ph.P[p.id].on = cp || sec.base.plat; p.sx = 1.2; p.sy = 0.8; puff(tthFinCx(p), by + p.h, 6, 'rgba(178,141,255,0.85)'); }
  }
  if (u >= 1) { ph.rw = null; ph.trail.length = 0; sec.best = sec.cp ? sec.base.y - sec.cp.plat.y : 0; sec.stuckT = 0; }
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
  ph.bubs = []; ph.trail.length = 0; ph.gold = { hand: 0, grip: false, bub: false, mech: 0, kick: false, sleepy: false }; ph.mechK = 1;
  ph.kick = null; ph.kickGrace = 0;
  ph.grip = 1; ph.slip = false; ph.braking = false; ph.waitT = 0; ph.goldAt = null;
  ph.hand.from = ph.hand.k; ph.hand.spin = K.rewind.t;
  st.hints = [null, null];
  if (ph.k >= TTHFIN_N) { tthFinTopStart(st); return; }
  ph.sec = ph.c.secs[ph.k]; ph.holder = 1 - ph.holder; ph.stage = 'climb';
  ph.bubT = K.bub.first; ph.bubI = 0; ph.factT = 5; ph.kickT = ph.sec.S.kick ? ph.sec.S.kick.first : 0;
  tthPop(st, W / 2, L.yTop - 150, 'Ledge ' + ph.k + '!', C.gold, 30);
  tthSwap(st); tthCelebrate(st, 1.8);
  tthNews(st, 'Ledge ' + ph.k + ' of ' + TTHFIN_N + '! Next climb: ' + ph.sec.S.name + '.', false, 3.2);
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
  ph.home = { items: TTH_LOOT.map((kind, i) => ({ kind, i, s: 0, t: 0, go: 0, ft: 0, x: 480, y: 0, fx: 0, fy: 0 })), open: TTH_LOOT.map(() => 0), lit: TTH_LOOT.map(() => 0), flare: 0 };
  tthPop(st, W / 2, tthFinLY(TTHFIN_N) - 190, 'The top!', C.gold, 32);
  tthCelebrate(st, 1.6); tthShowBadges(st); tthActLabels(st); Sfx.play('tthSwap');
  tthNews(st, 'The top! Smash the Time Machine TOGETHER!', true, 4);
  tthSay(st, 'You can\'t smash MY time machine!', 2.4);
}
// which plunger p stands at (0 left, 1 right), or -1
function tthFinPlunger(st, p) {
  const ph = st.ph, K = TTHFIN.smash;
  if (!p.grounded || Math.abs(tthFinFeet(p) - tthFinLY(TTHFIN_N)) > 1) return -1;
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
  const ph = st.ph, tp = ph.top, K = TTHFIN.smash, ps = G.players, deckY = tthFinLY(TTHFIN_N), calm = tthCalm(st);
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
    tp.trickT = K.every[Math.min(K.every.length - 1, tp.hits)] * (0.9 + 0.2 * tthRand()) * (tp.sleepy ? 1.6 : 1);
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
  const ph = st.ph, tp = ph.top, K = TTHFIN.smash, G0 = TTHFIN.gold, r = tp.rams[s], deckY = tthFinLY(TTHFIN_N);
  r.cool = K.cool; tp.miss++; tthStats(st).misses = (tthStats(st).misses || 0) + 1;
  Sfx.play('tthFinMiss');
  tthPop(st, 480, deckY - 205, 'Together!', '#ffd23f', 24);
  if (tp.miss % 3 === 1) tthReact(st, 'happy', tp.miss === 1 ? 'Ha! One ram just tickles!' : 'Missed me!', 1.6);
  for (const p of G.players) tthFinTip(st, p.id, 'together', 'Press ' + tthFinAct(p.id) + ' at the same time: 3, 2, 1, go!', 6, { life: 3.4, cpu: null });
  if (tp.miss === G0.miss) { tp.window = K.gold[0]; tthHelp(st, 'Gold help: the rams wait longer for each other!'); }
  else if (tp.miss === G0.miss2) { tp.window = K.gold[1]; tthHelp(st, 'Gold help: the rams wait much longer now!'); }
}
function tthFinHit(st) {
  const ph = st.ph, tp = ph.top, K = TTHFIN.smash, deckY = tthFinLY(TTHFIN_N), c = st.thief;
  tp.hits++; tp.state = 'hit'; tp.t = 0; tp.flash = 1;
  for (const r of tp.rams) { r.live = 0; r.cool = K.hitT; r.k = 1; }
  tthStats(st).hits = tp.hits;
  Sfx.play('tthFinBoom'); for (const p of G.players) rumble(p.id, 0.9, 0.7, 260);
  if (!reduceMotion) G.shake = Math.max(G.shake, tp.hits >= K.hits ? 0.6 : 0.42);
  tthFinDebris(st, 480, deckY - 100, 16 + tp.hits * 6);
  burst(480, deckY - 100, '#f6d37a', 14); burst(480, deckY - 100, '#ffffff', 8);
  tthPop(st, 480, deckY - 215, ['CRUNCH!', 'CRACK!', 'SMASH!', 'KA-BOOM!'][Math.min(3, tp.hits - 1)], C.gold, 36);
  tthFinRelease(st, tp.hits);
  for (const g of tp.cogs) if (g.warn <= 0) burst(g.x, deckY - 14, '#f6d37a', 8);
  tp.cogs = []; for (const b of ph.bubs) b.dud = true;
  st.hints = [null, null];
  if (tp.hits >= K.hits) { tthFinStartFin(st); return; }
  c.hitT = 0.7; c.pose = 'shock'; ph.thiefPoseT = 1.3;
  tthReact(st, 'shocked', TTHFIN_OUCH[tp.hits - 1], 2);
  tthCelebrate(st, K.hitT - 0.2);
  tthNews(st, tp.hits === 1 ? 'Hit 1 of ' + K.hits + '! Look: the stolen things fly home!' : 'Hit ' + tp.hits + ' of ' + K.hits + '!', true, 1.3);
}

/* ---------- the stolen things fly home (two per hit), and the pay-off after the last hit ---------- */
function tthFinPortalAt(st, i) { return { x: 96 + i * 109.7, y: tthFinLY(TTHFIN_N) - TTHFIN.topFoot + 208 - 56 * Math.sin(Math.PI * i / 7) }; }
// hit n (1..4) shakes two stolen things out of the machine: they hover over it, then fly off one after the other
function tthFinRelease(st, n) {
  const hm = st.ph.home, K = TTHFIN.home;
  if (!hm) return;
  const per = hm.items.length / TTHFIN.smash.hits;
  hm.items.forEach(it => { const j = it.i - (n - 1) * per; if (j >= 0 && j < per && it.s === 0) { it.s = 1; it.t = 0; it.go = K.go[Math.min(K.go.length - 1, j)] + (j >= K.go.length ? (j - K.go.length + 1) * 1.1 : 0); it.j = j; } });
  Sfx.play('tthPop');
}
function tthFinHome(st, dt) {
  const ph = st.ph, hm = ph.home, K = TTHFIN.home, deckY = tthFinLY(TTHFIN_N);
  if (!hm) return;
  hm.flare = Math.max(0, hm.flare - dt);
  for (const it of hm.items) {
    const i = it.i;
    if (it.s === 1) {
      it.t += dt;
      const g = clamp(it.t / 0.45, 0, 1), e = 1 - (1 - g) * (1 - g), side = it.j % 2 ? 1 : -1;
      it.x = 480 + side * 62 * e; it.y = deckY - 100 - 172 * e + Math.sin(it.t * 6 + i) * 5;
      if (it.t >= it.go) { it.s = 2; it.ft = 0; it.fx = it.x; it.fy = it.y; Sfx.play('tthFinWhoosh'); }
    } else if (it.s === 2) {
      it.ft += dt;
      const u = clamp(it.ft / K.fly, 0, 1), e = u * u * (3 - 2 * u), P = tthFinPortalAt(st, i);
      it.x = it.fx + (P.x - it.fx) * e; it.y = it.fy + (P.y - it.fy) * e - Math.sin(u * Math.PI) * 30;
      if ((G.tickN % 3) === 0) G.particles.push({ x: it.x, y: it.y, vx: 0, vy: 20, life: 0.35, max: 0.35, col: '#fff3c4', size: 3, grav: 0, kind: 'dot' });
      if (u >= 1) {
        it.s = 3; it.t = 0; hm.lit[i] = 0.001; tthStats(st).home = (tthStats(st).home || 0) + 1;
        Sfx.play('tthFinHome', i);
        tthNews(st, TTHFIN_HOME[i][0], true, 2.6);
        for (let n = 0; n < 8; n++) { const a = n / 8 * Math.PI * 2; G.particles.push({ x: P.x, y: P.y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, life: 0.5, max: 0.5, col: n % 2 ? '#fff3c4' : TTH_ERAS[TTH_ORDER[i]].col, size: 3.5, grav: 0, kind: 'dot' }); }
      }
    } else if (it.s === 3) it.t += dt;
    // its portal opens just before it leaves, stays as a small lit door once the thing is home, and flares at the end
    const want = hm.flare > 0 ? 1 : it.s === 2 || (it.s === 1 && it.t >= it.go - 0.5) || (it.s === 3 && it.t < 0.8) ? 1 : it.s === 3 ? 0.62 : 0;
    hm.open[i] = approach(hm.open[i], want, dt * 2.6);
    if (hm.lit[i] > 0) hm.lit[i] = Math.min(1, hm.lit[i] + dt * 3);
  }
}
// after the last hit: the machine bursts, the Thief plops out dizzy, the last two things fly home, the big cheer
function tthFinStartFin(st) {
  const ph = st.ph, c = st.thief, deckY = tthFinLY(TTHFIN_N);
  ph.stage = 'fin';
  ph.fin = { t: 0, landed: false, all: false, allT: 0, done: false };
  Object.assign(c, { jet: false, pose: 'shock', mood: 'shocked', baseMood: 'sad', moodT: 1.2, item: null, hitT: 0.9, face: 1 });
  ph.thiefPoseT = 0;
  tthFinDebris(st, 480, deckY - 100, 44);
  for (let n = 0; n < 30; n++) confetti(480 + (tthRand() - 0.5) * 160, deckY - 120);
  burst(480, deckY - 100, '#ff9a3c', 20); burst(480, deckY - 100, '#7fe9ff', 14);
  tthNews(st, 'The Time Machine is SMASHED!', true, 1.3);
  tthSay(st, TTHFIN_OUCH[3], 1.4);
  tthStats(st).smashT = Math.round(st.phT * 10) / 10;
}
function tthFinFinale(st, dt) {
  const ph = st.ph, f = ph.fin, K = TTHFIN.home, c = st.thief, deckY = tthFinLY(TTHFIN_N), ps = G.players, hm = ph.home;
  if (!f || f.done) return;
  f.t += dt;
  // the Thief tumbles out of the wreck and lands on the deck, dizzy
  if (f.t < 1) { const u = f.t; c.x = 480 + 280 * u; c.y = deckY - 56 * (1 - u) - Math.sin(u * Math.PI) * 150; c.s += (0.9 - c.s) * Math.min(1, dt * 4); }
  else if (!f.landed) {
    f.landed = true; c.x = 760; c.y = deckY; c.face = -1; c.pose = 'dizzy'; c.mood = 'sad';
    puff(c.x, deckY, 10, 'rgba(255,255,255,0.8)'); Sfx.play('tthFinClunk');
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.15);
    tthSay(st, 'Ooooh... everything is spinning...', 2);
  }
  if (!f.all && hm.items.every(it => it.s === 3) && hm.items[hm.items.length - 1].t >= 0.9) {
    f.all = true; f.allT = f.t; hm.flare = K.after + 0.4; Sfx.play('tthCheer'); Sfx.play('tthGot');
    tthNews(st, 'Everything is home. History is safe!', true, 4);
    for (let n = 0; n < 40; n++) confetti(120 + tthRand() * (W - 240), st.cam.y + 150 + tthRand() * 60);
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.2);
    ps.forEach((p, k) => { st.hints[k] = { text: k ? 'Hooray!' : 'We did it!', t: 0, life: 2.2, gold: true }; if (p.grounded && !p.input.left && !p.input.right) p.pendingJump = true; });
    c.pose = 'sulk'; tthSay(st, 'All my lovely things... gone home.', 1.7);
  }
  if (f.all && f.t >= f.allT + K.after) {
    f.done = true; c.pose = 'idle'; c.mood = 'smug'; c.baseMood = 'smug'; c.face = 1;
    tthPhaseDone(st, { got: false, say: 'One last portal... race you home!', portal: { x: 872, y: deckY - 84 } });
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
    else tthFinTip(st, cl, 'btn', tthFinBtnTip(cl, true), 4, { cpu: null });
  }
  // a climb that takes very long (time only counts while they play): gold grip, then sleepy gears and a stuck hand
  sec.T += dt;
  if (sec.T >= K.gold.slowT && !ph.gold.grip) { ph.gold.grip = true; tthHelp(st, 'Gold help: gold grip! The brake holds longer and the gears speed up slowly.'); }
  if (sec.T >= K.gold.slowT2 && !ph.gold.sleepy) { ph.gold.sleepy = true; ph.gold.hand = 2; tthHelp(st, 'Gold help: sleepy gears! One pull of the brake keeps them slow for a long time.'); }
  // no new height for a long while: the clockwork slows down, and a gold hint for whoever's turn it is
  const h = sec.base.y - tthFinFeet(Cl);
  if (h > sec.best + 12) { sec.best = h; sec.stuckT = 0; ph.goldAt = null; return; }
  if ((sec.stuckT += dt) < K.gold.stuckT) return;
  sec.stuckT = 0; sec.stuckN++;
  let id, text;
  if (ph.P[cl].on === sec.upper.plat) { id = cl; text = tthFinBtnTip(cl, Math.abs(sec.button.x - tthFinCx(Cl)) <= K.button.reach); ph.goldAt = { x: sec.button.x, y: sec.button.y - 70 }; }
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
  if (ph.stage === 'top') { const tp = ph.top; tx = 480 - tp.push * 12; ty = tthFinLY(TTHFIN_N) - 58; ts = 0.85; c.face = tp.push > 0.1 ? 1 : tp.push < -0.1 ? -1 : c.face; }
  else { const Cl = ps[1 - ph.holder]; c.look = { x: tthFinCx(Cl), y: Cl.y }; if (ph.thiefPoseT <= 0) c.face = -1; }
  const k = Math.min(1, dt * (ph.stage === 'top' ? 2.4 : 5));
  c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.s += (ts - c.s) * Math.min(1, dt * 2);
  c.jet = true; c.flame = ph.stage === 'top' && Math.abs(c.x - tx) < 6 ? 0.35 : 1;
}

/* ---------- the phase: setup, the tick, coasting ---------- */
function tthFinSetup(st, Lv) {
  const ph = st.ph, c = st.thief, K = TTHFIN, ps = G.players;
  ph.c = tthFinBuild();
  ph.P = [0, 1].map(() => ({ on: null, flingCD: 0, frozenT: 0 }));
  ph.k = 0; ph.sec = ph.c.secs[0]; ph.stage = 'climb';
  ph.holder = Lv && Lv.def && Lv.def.first === 1 ? 1 : 0;
  ph.t = 0; ph.tm = 0; ph.tt = 0; ph.mechK = 1; ph.hello = false;
  ph.grip = 1; ph.slip = false; ph.braking = false; ph.leverK = 0; ph.brakedOnce = false;
  ph.hand = { k: K.hand.startK, spin: 0, from: 0, tick: 0 };
  ph.rw = null; ph.trail = []; ph.trailT = 0; ph.catchT = 0;
  ph.bubs = []; ph.bubN = 0; ph.bubT = K.bub.first; ph.bubI = 0;
  ph.gold = { hand: 0, grip: false, bub: false, mech: 0, kick: false, sleepy: false };
  ph.kick = null; ph.kickT = 0; ph.kickGrace = 0; ph.kickFx = 0; ph.kickN = 0; ph.home = null;
  ph.tipT = [{}, {}]; ph.hintKey = [null, null]; ph.jobTipT = 1.0; ph.factT = 7; ph.waitT = 0; ph.goldAt = null;
  ph.thiefPoseT = 0; ph.top = null; ph.fin = null; ph.debris = []; ph.kT0 = 0;
  Object.assign(tthStats(st), { ledges: 0, ledgeT: [], rewinds: 0, flings: 0, frozen: 0, slips: 0, kicks: 0, hits: 0, misses: 0, home: 0 });
  tthFinMech(st, 0);                                   // every platform takes its place
  st.cam = { x: 0, y: tthFinLY(0) - K.foot };
  // on the start deck: the holder near the lever, the climber by the first shelf (screen coords here: world - cam)
  const lv = ph.sec.lever.x, at = [0, 0];
  at[ph.holder] = lv + 70; at[1 - ph.holder] = lv + 190;
  for (const p of ps) {
    Object.assign(p, { alive: true, respawnT: 0, x: at[p.id] - p.w / 2, y: tthFinLY(0) - p.h - st.cam.y, vx: 0, vy: 0, stun: 0, knockT: 0, grounded: true, face: p.id === ph.holder ? -1 : 1, sx: 1, sy: 1, carryVx: 0, lastVy: 0 });
    ph.P[p.id].on = ph.c.decks[0].plat;
  }
  Object.assign(c, { x: 886, y: st.cam.y + 318, s: 0.62, face: -1, pose: 'idle', mood: 'smug', baseMood: 'smug', jet: true, item: null, claw: 0.25, hidden: false, alpha: 1, flame: 1 });
}
function tthFinStep(st, dt) {
  const ph = st.ph, ps = G.players;
  ph.t += dt;
  if (!ph.hello && ph.t > 0.4) { ph.hello = true; tthSay(st, TTHFIN_TAUNTS[0], 2.6); }
  tthFinMech(st, dt);
  tthFinRewinding(st, dt);
  for (const p of ps) tthFinBody(st, p, dt);
  tthFinJobs(st, dt);
  tthFinHand(st, dt);
  tthFinBubbles(st, dt);
  tthFinTop(st, dt);
  tthFinHome(st, dt);
  if (ph.stage === 'fin') { for (const p of ps) p.pendingAct = false; tthFinFinale(st, dt); }
  tthFinLedge(st);
  if (G.mst !== st) return;
  tthFinHints(st, dt);
  tthFinThief(st, dt);
  tthFinCam(st, false, dt);
}
// cards and the portal cutscene: the clockwork turns, nobody is steered
function tthFinCoast(st, dt) {
  const ph = st.ph;
  if (!ph.c) return;
  ph.t += dt;
  tthFinMech(st, dt);
  tthFinStill(st, dt);
  for (const d of ph.debris) { d.t += dt; d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt; }
  if (ph.debris.length && ph.debris[0].t > ph.debris[0].life) ph.debris = ph.debris.filter(d => d.t <= d.life);
  if (ph.top) { const tp = ph.top; tp.rise = Math.min(1, tp.rise + dt / 0.8); tp.flash = Math.max(0, tp.flash - dt * 2.5); for (const r of tp.rams) { r.k = approach(r.k, 0, dt * 3); r.down = approach(r.down, 0, dt * 6); } }
  if (ph.home) for (let i = 0; i < ph.home.open.length; i++) ph.home.open[i] = approach(ph.home.open[i], 0, dt * 2.2);
  if (!st.cut) tthFinThief(st, dt);
  tthFinCam(st, false, dt);
}

/* ---------- drawing: the sky, the giant clock, the tower ---------- */
const TTHFINC = { brass: '#d9a441', brassDk: '#9a6f22', brassLt: '#f6d37a', iron: '#4a4466', ironDk: '#2e2a4a', ironLt: '#7d78a6', cream: '#fff4d6', red: '#ff5f6d', green: '#9fe07f',
  ice: '#7fe9ff', lift: '#63d2c0', liftDk: '#2f8f84', wall: 'rgba(20,10,52,0.5)', violet: '#5b3a9e' };
const TTHFIN_CLOCK = { x: 480, y: 306, r: 172 };       // the giant clock (screen coords)
function tthFinCog(x, y, r, a, n, fill, stroke, lw) {
  const r0 = r * 0.82, st = Math.PI * 2 / n;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a0 = a + i * st;
    ctx.lineTo(x + Math.cos(a0) * r0, y + Math.sin(a0) * r0);
    ctx.lineTo(x + Math.cos(a0 + st * 0.16) * r, y + Math.sin(a0 + st * 0.16) * r);
    ctx.lineTo(x + Math.cos(a0 + st * 0.5) * r, y + Math.sin(a0 + st * 0.5) * r);
    ctx.lineTo(x + Math.cos(a0 + st * 0.66) * r0, y + Math.sin(a0 + st * 0.66) * r0);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2.5; ctx.stroke(); }
}
function tthFinLine(x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
// a brass plank with an ink outline (the top is the standing line)
function tthFinPlank(x, y, w, h, fill, lite) {
  ctx.fillStyle = fill; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(x, y, w, h, Math.min(5, h / 2)); ctx.fill(); ctx.stroke();
  if (lite) { ctx.fillStyle = lite; ctx.fillRect(x + 4, y + 2, w - 8, 2.5); }
}
function tthFinDrawSky(st) {
  const ph = st.ph, t = G.clock * (reduceMotion ? 0.25 : 1), cy = st.cam.y;
  tthSky('#160b38', '#6d2f9e');
  // the swirl of the End of Time
  ctx.save(); ctx.translate(480, 300); ctx.lineCap = 'round';
  for (let a = 0; a < 3; a++) {   // (few, short arms: wide see-through strokes are the dearest thing in this scene)
    ctx.strokeStyle = a % 2 ? 'rgba(255,160,225,0.11)' : 'rgba(140,120,255,0.16)'; ctx.lineWidth = 28 - a * 4;
    ctx.beginPath();
    for (let q = 0; q <= 12; q++) { const u = q / 12, ang = t * 0.22 + a * 2.094 + u * 4.2, rad = 40 + 560 * u; ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad * 0.6); }
    ctx.stroke();
  }
  ctx.restore();
  tthStars(G.clock, 30, 0.7, 11);
  // lost clocks drifting by (they slide as the tower is climbed)
  ctx.save(); ctx.globalAlpha = 0.5;
  for (let k = 0; k < 7; k++) {
    const h = hash(k, 31), x = (h % 960 + t * (4 + k % 3 * 3)) % 1000 - 20, y0 = (h >>> 9) % 660, y = ((y0 - cy * 0.28) % 660 + 660) % 660 - 60, r = 8 + (h >>> 4) % 9;
    tthClockFace(x, y + Math.sin(t * 0.7 + k) * 6, r, t + k * 3, { speed: (k % 2 ? -1 : 1) * (2 + k % 4), lw: 1.6, fill: k % 3 ? TTHFINC.cream : '#e6d4ff' });
  }
  ctx.restore();
}
// the giant clock behind the tower, with its ONE huge hand (screen coords)
function tthFinDrawClock(st) {
  const ph = st.ph, Q = TTHFIN_CLOCK, K = TTHFIN.hand, hd = ph.hand, R = Q.r, climb = ph.stage === 'climb' || ph.stage === 'lift';
  const kick = climb && ph.kick, warn = climb && hd.spin <= 0 && hd.k >= K.warnK && ph.stage === 'climb';
  const k = climb ? hd.k + (kick && !reduceMotion ? Math.sin(G.clock * 60) * 0.006 : 0) + (ph.kickFx || 0) * 0.03 : (G.clock * 0.05) % 1;
  ctx.save(); ctx.translate(Q.x, Q.y); ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(255,244,214,0.09)'; circle(0, 0, R); ctx.fill();
  ctx.strokeStyle = 'rgba(246,211,122,0.6)'; ctx.lineWidth = 7; circle(0, 0, R); ctx.stroke();
  ctx.strokeStyle = 'rgba(246,211,122,0.3)'; ctx.lineWidth = 2; circle(0, 0, R - 13); ctx.stroke();
  if (climb) {   // the red stretch before 12
    ctx.strokeStyle = warn && Math.sin(G.clock * 14) > 0 ? 'rgba(255,95,109,0.8)' : 'rgba(255,95,109,0.42)'; ctx.lineWidth = 11;
    ctx.beginPath(); ctx.arc(0, 0, R - 24, -Math.PI / 2 + K.warnK * Math.PI * 2, Math.PI * 1.5 - 0.08); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,244,214,0.55)';
  for (let n = 0; n < 12; n++) { const a = n * Math.PI / 6, big = n % 3 === 0; ctx.lineWidth = big ? 6 : 3.5; ctx.beginPath(); ctx.moveTo(Math.sin(a) * (R - (big ? 40 : 34)), -Math.cos(a) * (R - (big ? 40 : 34))); ctx.lineTo(Math.sin(a) * (R - 18), -Math.cos(a) * (R - 18)); if (n) ctx.stroke(); }
  ctx.globalAlpha = 0.9; bigText('12', 0, -R + 32, 26, warn ? TTHFINC.red : TTHFINC.brassLt, 1); ctx.globalAlpha = 1;
  // the hand: gold while it sweeps, icy blue while the brake holds it, red on the last stretch
  const col = !climb ? 'rgba(246,211,122,0.5)' : hd.spin > 0 ? '#e6d4ff' : kick ? (Math.sin(G.clock * 26) > 0 ? TTHFINC.red : '#ffd23f') : ph.braking ? TTHFINC.ice : warn ? TTHFINC.red : TTHFINC.brassLt;
  const hand = (kk, alpha) => {
    ctx.save(); ctx.rotate(kk * Math.PI * 2); ctx.globalAlpha = alpha;
    ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-10, 20); ctx.lineTo(-6, -R * 0.72); ctx.lineTo(-13, -R * 0.72); ctx.lineTo(0, -R * 0.92); ctx.lineTo(13, -R * 0.72); ctx.lineTo(6, -R * 0.72); ctx.lineTo(10, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  };
  if (hd.spin > 0 && climb && !reduceMotion) { hand(k + 0.05, 0.22); hand(k + 0.1, 0.12); }
  hand(k, climb ? 0.95 : 0.5);
  ctx.fillStyle = TTHFINC.brass; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; circle(0, 0, 13); ctx.fill(); ctx.stroke();
  if (ph.braking && climb) {   // brake shoes on the hub
    ctx.strokeStyle = TTHFINC.ice; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 21, 0.5, 2.6); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 21, 3.64, 5.74); ctx.stroke();
  }
  ctx.restore();
}
function tthFinDrawDeck(st, d) {
  const ph = st.ph, K = TTHFIN, w = d.x1 - d.x0;
  ctx.fillStyle = TTHFINC.brass; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(d.x0, d.y, w, K.deckH, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = TTHFINC.brassLt; ctx.fillRect(d.x0 + 4, d.y + 2, w - 8, 3);
  ctx.fillStyle = TTHFINC.brassDk; for (let x = d.x0 + 16; x < d.x1 - 8; x += 46) { circle(x, d.y + 9.5, 1.8); ctx.fill(); }
  if (!d.hatch) return;
  // the hatch: a striped trapdoor (jump up through it, stand on it)
  const h0 = d.hatch[0], h1 = d.hatch[1], now = ph.stage === 'climb' && ph.sec.upper === d;
  ctx.fillStyle = TTHFINC.violet; ctx.fillRect(h0, d.y + 1.5, h1 - h0, K.deckH - 3);
  ctx.fillStyle = '#ffd23f';
  for (let x = h0 + 5; x < h1 - 14; x += 18) { ctx.beginPath(); ctx.moveTo(x, d.y + K.deckH - 2.5); ctx.lineTo(x + 6, d.y + 2.5); ctx.lineTo(x + 13, d.y + 2.5); ctx.lineTo(x + 7, d.y + K.deckH - 2.5); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(h0, d.y + 1, h1 - h0, K.deckH - 2);
  if (now) {   // "up through here"
    const cx = (h0 + h1) / 2, bob = Math.sin(G.clock * 5) * 3;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [col, lw] of [[C.ink, 8], ['#ffd23f', 4]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      for (const dy of [30, 44]) { ctx.beginPath(); ctx.moveTo(cx - 11, d.y + dy + 9 + bob); ctx.lineTo(cx, d.y + dy + bob); ctx.lineTo(cx + 11, d.y + dy + 9 + bob); ctx.stroke(); }
    }
  }
}
function tthFinDrawLift(st, sec) {
  const L = sec.lift, cx = L.x + L.w / 2, wait = L.state === 'wait' && sec === st.ph.sec;
  ctx.strokeStyle = 'rgba(125,120,166,0.5)'; ctx.lineWidth = 3;
  tthFinLine(L.x + 3, L.yTop, L.x + 3, L.yBot); tthFinLine(L.x + L.w - 3, L.yTop, L.x + L.w - 3, L.yBot);
  // the telescope pole under it
  if (L.yBot - L.y > 14) { ctx.fillStyle = TTHFINC.iron; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.fillRect(cx - 6, L.y + 10, 12, L.yBot - L.y - 10); ctx.strokeRect(cx - 6, L.y + 10, 12, L.yBot - L.y - 10); }
  tthFinPlank(L.x, L.y, L.w, 13, wait && Math.sin(G.clock * 9) > 0 ? '#b7f5e8' : TTHFINC.lift, 'rgba(255,255,255,0.6)');
  ctx.strokeStyle = TTHFINC.liftDk; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const dx of [-22, 0, 22]) { ctx.beginPath(); ctx.moveTo(cx + dx - 5, L.y + 10); ctx.lineTo(cx + dx, L.y + 5.5); ctx.lineTo(cx + dx + 5, L.y + 10); ctx.stroke(); }
}
// one piece of clockwork
function tthFinDrawEl(st, el) {
  const ph = st.ph, K = TTHFIN, F = TTHFINC, cur = el.sec === ph.k && (ph.stage === 'climb' || ph.stage === 'lift');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (el.kind === 'shelf') {
    const q = el.plat;
    ctx.fillStyle = F.brassDk; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    for (const bx of [q.x + 12, q.x + q.w - 12]) { ctx.beginPath(); ctx.moveTo(bx - 7, q.y + 10); ctx.lineTo(bx + 7, q.y + 10); ctx.lineTo(bx, q.y + 24); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    tthFinPlank(q.x, q.y, q.w, 12, F.brass, F.brassLt);
  } else if (el.kind === 'pend') {
    const q = el.plat, bx = q.x + q.w / 2;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 7; tthFinLine(el.px, el.py, bx, q.y + 4);
    ctx.strokeStyle = F.ironLt; ctx.lineWidth = 3.5; tthFinLine(el.px, el.py, bx, q.y + 4);
    ctx.fillStyle = F.iron; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; circle(el.px, el.py, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = F.brass; circle(bx, q.y + 26, 17); ctx.fill(); ctx.stroke();
    tthClockFace(bx, q.y + 26, 10, ph.tm, { speed: 2.5, lw: 1.8 });
    tthFinPlank(q.x, q.y, q.w, 12, F.brassLt, '#fffbe6');
  } else if (el.kind === 'piston') {
    const q = el.plat;
    ctx.strokeStyle = 'rgba(125,120,166,0.7)'; ctx.lineWidth = 3; tthFinLine(el.x0, q.y + 20, el.x1 + el.w, q.y + 20);
    ctx.fillStyle = F.iron; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    for (const sx of [el.x0 - 4, el.x1 + el.w - 4]) { ctx.fillRect(sx, q.y + 14, 8, 12); ctx.strokeRect(sx, q.y + 14, 8, 12); }
    // the piston rod from the wall
    ctx.strokeStyle = C.ink; ctx.lineWidth = 8; tthFinLine(K.x0 + 4, q.y + 9, q.x, q.y + 9);
    ctx.strokeStyle = F.ironLt; ctx.lineWidth = 4; tthFinLine(K.x0 + 4, q.y + 9, q.x, q.y + 9);
    tthFinPlank(q.x, q.y, q.w, 18, '#8fb4ff', '#e3edff');
    ctx.fillStyle = C.ink; for (const wx of [q.x + 14, q.x + q.w - 14]) { circle(wx, q.y + 20, 5); ctx.fill(); }
  } else if (el.kind === 'tooth') {
    // a hinged tooth: out (stand on it), blinking (about to fold), folded (a faint flap)
    const q = el.plat, Z = TTHFIN_TOOTH, f = el.f || 0, fold = q.solid ? 0 : Math.min(1, Math.max(0.2, Math.min(f - Z.on, 1 - f) / 0.05)), hx = q.x + q.w - 6, hy = q.y + 6;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-fold * 1.35);
    if (!q.solid) ctx.globalAlpha = 0.4;
    ctx.fillStyle = el.warn && Math.sin(G.clock * 22) > 0 ? '#ffffff' : F.brassLt; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(6, -6); ctx.lineTo(-q.w + 6, -6); ctx.lineTo(-q.w + 16, 6); ctx.lineTo(6, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = F.iron; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(hx, hy, 6); ctx.fill(); ctx.stroke();
    if (el.warn && cur) { ctx.fillStyle = F.red; circle(hx, hy, 3); ctx.fill(); }
  } else if (el.kind === 'gear') {
    const ok = el.w <= K.gear.ride, fast = el.w > K.gear.ride + 0.4;
    tthFinCog(el.x, el.y, el.r - 8, el.a, 12, cur ? F.brass : '#a5884f', C.ink, 3);
    ctx.fillStyle = 'rgba(46,42,74,0.55)';
    for (let n = 0; n < 4; n++) { const a = el.a + n * Math.PI / 2 + Math.PI / 4; circle(el.x + Math.cos(a) * el.r * 0.42, el.y + Math.sin(a) * el.r * 0.42, el.r * 0.15); ctx.fill(); }
    if (fast && cur && !reduceMotion) {   // whirling
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3;
      for (let n = 0; n < 3; n++) { const a = el.a * 1.7 + n * 2.1; ctx.beginPath(); ctx.arc(el.x, el.y, el.r + 6 + n * 5, a, a + 0.9); ctx.stroke(); }
    }
    for (const q of el.pegs) {
      const cx = q.x + q.w / 2;
      ctx.save(); if (!q.solid && cur) ctx.globalAlpha = 0.45;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.fillStyle = F.iron; circle(cx, q.y + 7, 5); ctx.fill(); ctx.stroke();
      tthFinPlank(q.x, q.y, q.w, 11, cur && q.solid ? '#c8f59f' : F.brassLt, 'rgba(255,255,255,0.7)');
      ctx.restore();
    }
    // the hub lamp: red = too fast, green = ride it
    ctx.fillStyle = F.iron; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; circle(el.x, el.y, 15); ctx.fill(); ctx.stroke();
    if (cur) {
      ctx.fillStyle = ok ? 'rgba(159,224,127,0.35)' : 'rgba(255,95,109,0.3)'; circle(el.x, el.y, 22 + Math.sin(G.clock * 8) * 2); ctx.fill();
      ctx.fillStyle = ok ? F.green : F.red; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(el.x, el.y, 9); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(el.x - 3, el.y - 3, 2.6); ctx.fill();
    } else { ctx.fillStyle = F.brassDk; circle(el.x, el.y, 7); ctx.fill(); }
  }
}
// the brake lever (in the holder's colour) with its grip meter, and the button (in the climber's colour)
function tthFinDrawJobs(st, sec) {
  const ph = st.ph, F = TTHFINC, cur = sec === ph.sec && (ph.stage === 'climb' || ph.stage === 'lift'), lv = sec.lever, bt = sec.button, big = tthBig();
  const hc = cur ? PCOL[ph.holder] : '#8a84a8', cc = cur ? PCOL[1 - ph.holder] : '#8a84a8', k = cur ? ph.leverK : 0;
  ctx.lineCap = 'round';
  // lever
  ctx.fillStyle = F.iron; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(lv.x - 20, lv.y - 14, 40, 14, 4); ctx.fill(); ctx.stroke();
  const kick = cur && ph.kick ? ph.kick : null, kfx = cur ? ph.kickFx : 0;
  const a = 0.55 - k * 1.1 + (kick && !reduceMotion ? Math.sin(G.clock * 55) * 0.09 : 0) + kfx * 0.7, tx = lv.x + Math.sin(a) * 46, ty = lv.y - 12 - Math.cos(a) * 46;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 9; tthFinLine(lv.x, lv.y - 10, tx, ty);
  ctx.strokeStyle = F.ironLt; ctx.lineWidth = 4.5; tthFinLine(lv.x, lv.y - 10, tx, ty);
  ctx.fillStyle = kick && Math.sin(G.clock * 26) > 0 ? F.red : hc; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; circle(tx, ty, 9); ctx.fill(); ctx.stroke();
  if (kick) {   // the hand winds up a kick: a red ring closes on the lever, a boot-shaped spark when it lands
    const u = clamp(kick.t / TTHFIN.kick.warn, 0, 1);
    ctx.strokeStyle = F.red; ctx.lineWidth = 4; circle(tx, ty, 13 + u * 36); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,95,109,0.35)'; ctx.lineWidth = 9; circle(tx, ty, 13 + u * 36); ctx.stroke();
  }
  if (kfx > 0) { ctx.save(); ctx.globalAlpha = kfx; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; for (let n = 0; n < 6; n++) { const q = n * 1.047 + 0.3, r0 = 16 + (1 - kfx) * 14; tthFinLine(tx + Math.cos(q) * r0, ty + Math.sin(q) * r0, tx + Math.cos(q) * (r0 + 12), ty + Math.sin(q) * (r0 + 12)); } ctx.restore(); }
  if (cur && ph.stage === 'climb') {
    // the grip meter
    const w = big ? 86 : 66, h = big ? 15 : 11, x = lv.x - w / 2, y = lv.y - (big ? 100 : 92), low = ph.grip < 0.3, blink = Math.sin(G.clock * 14) > 0;
    ctx.fillStyle = 'rgba(28,26,54,0.85)'; rr(x - 3, y - 3, w + 6, h + 6, (h + 6) / 2); ctx.fill();
    ctx.fillStyle = ph.slip ? (blink ? F.red : '#8a3a4a') : low ? '#ffb347' : F.ice;
    if (ph.grip > 0.02) { rr(x, y, Math.max(h, w * ph.grip), h, h / 2); ctx.fill(); }
    ctx.strokeStyle = ph.slip ? F.red : hc; ctx.lineWidth = 2; rr(x - 3, y - 3, w + 6, h + 6, (h + 6) / 2); ctx.stroke();
    text(kick ? 'let go!' : ph.slip ? 'rest!' : 'grip', lv.x, y - (big ? 13 : 10), big ? 15 : 11, kick || ph.slip ? '#ffb3ba' : '#ffffff', 'center', 'body');
    if (ph.gold.grip) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x - 6, y - 6, w + 12, h + 12, (h + 12) / 2); ctx.stroke(); }
  }
  // button
  ctx.fillStyle = F.iron; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(bt.x - 19, bt.y - 9, 38, 9, 3); ctx.fill(); ctx.stroke();
  const dn = bt.down ? 4 : 13;
  ctx.fillStyle = bt.down ? F.green : cc; ctx.beginPath(); ctx.moveTo(bt.x - 14, bt.y - 9); ctx.quadraticCurveTo(bt.x - 14, bt.y - 9 - dn * 1.5, bt.x, bt.y - 9 - dn); ctx.quadraticCurveTo(bt.x + 14, bt.y - 9 - dn * 1.5, bt.x + 14, bt.y - 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (cur && !bt.down) { const g = 0.5 + 0.5 * Math.sin(G.clock * 6); ctx.strokeStyle = `rgba(255,255,255,${0.25 + 0.4 * g})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(bt.x, bt.y - 14, 22 + g * 5, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }
}
// the top deck: the pedestal the machine docks on (behind the Thief)
function tthFinDrawPedestal(st) {
  const ph = st.ph, tp = ph.top, F = TTHFINC, y = tthFinLY(TTHFIN_N), rise = tp ? tp.rise : 0;
  if (rise <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(TTHFIN.x0, y - 300, TTHFIN.x1 - TTHFIN.x0, 300); ctx.clip(); ctx.translate(0, (1 - rise) * 70);
  ctx.fillStyle = F.iron; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(436, y); ctx.lineTo(448, y - 54); ctx.lineTo(512, y - 54); ctx.lineTo(524, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  tthFinPlank(434, y - 64, 92, 12, F.brass, F.brassLt);
  ctx.fillStyle = F.ironLt; for (const by of [y - 40, y - 22]) { circle(462, by, 2.5); ctx.fill(); circle(498, by, 2.5); ctx.fill(); }
  ctx.restore();
}
function tthFinDrawBack(st) {
  const ph = st.ph, K = TTHFIN, F = TTHFINC;
  if (!ph.c) return;
  const y0 = st.cam.y, y1 = y0 + H;
  tthScreen(st, () => tthFinDrawSky(st));
  // the tower: a dark back wall between two brass rails, with shadowy cogs turning in it
  ctx.fillStyle = F.wall; ctx.fillRect(K.x0, y0, K.x1 - K.x0, H);
  for (const s of ph.c.secs) {
    const by = s.base.y;
    if (by < y0 - 40 || by - K.gap > y1 + 40) continue;
    const sgn = s.k % 2 ? -1 : 1;
    tthFinCog(480 + sgn * 205, by - 318, 46, ph.t * 0.5 * sgn, 10, 'rgba(120,90,200,0.22)');
    tthFinCog(480 + sgn * 135, by - 292, 24, -ph.t * 0.96 * sgn + 0.3, 8, 'rgba(120,90,200,0.22)');
    tthFinCog(480 - sgn * 250, by - 60, 34, -ph.t * 0.6 * sgn, 9, 'rgba(120,90,200,0.2)');
  }
  tthScreen(st, () => tthFinDrawClock(st));
  for (const rx of [K.x0 - 12, K.x1]) {
    ctx.fillStyle = F.brassDk; ctx.fillRect(rx, y0, 12, H);
    ctx.fillStyle = F.brass; ctx.fillRect(rx + 2, y0, 5, H);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; tthFinLine(rx, y0, rx, y1); tthFinLine(rx + 12, y0, rx + 12, y1);
    ctx.fillStyle = C.ink; for (let y = Math.floor(y0 / 76) * 76; y < y1; y += 76) { circle(rx + 6, y + 20, 2.2); ctx.fill(); }
  }
  // lifts, decks, clockwork (only what is on screen)
  for (const s of ph.c.secs) if (s.lift.yTop < y1 + 20 && s.lift.yBot > y0 - 20) tthFinDrawLift(st, s);
  for (const d of ph.c.decks) if (d.y > y0 - 30 && d.y < y1 + 10) tthFinDrawDeck(st, d);
  for (const el of ph.c.els) { const ey = el.kind === 'pend' ? el.py + 100 : el.y; if (ey > y0 - 240 && ey < y1 + 140) tthFinDrawEl(st, el); }
  for (const s of ph.c.secs) if (s.lever.y > y0 - 20 && s.button.y < y1 + 30) tthFinDrawJobs(st, s);
  tthFinDrawPedestal(st);
}

/* ---------- drawing: in front of the Thief (rams, tricks, bubbles, the pay-off) ---------- */
// the two rams with their lamps, and the two plungers
function tthFinDrawRams(st) {
  const ph = st.ph, tp = ph.top, F = TTHFINC, K = TTHFIN.smash, y = tthFinLY(TTHFIN_N);
  if (!tp || tp.rise <= 0) return;
  const armed = tp.state === 'armed' && ph.stage === 'top', ch = tp.state === 'charge' ? clamp(tp.charge / K.charge, 0, 1) : armed ? 1 : 0, blink = Math.sin(G.clock * 16) > 0;
  ctx.save(); ctx.beginPath(); ctx.rect(TTHFIN.x0, y - 300, TTHFIN.x1 - TTHFIN.x0, 300); ctx.clip(); ctx.translate(0, (1 - tp.rise) * 130);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let s = 0; s < 2; s++) {
    const r = tp.rams[s], d = s ? -1 : 1, hx = s ? 584 : 376, px = K.plX[s];   // the housing's centre; d points at the machine
    // the pipe from the plunger to the ram
    ctx.strokeStyle = C.ink; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(px + d * 16, y - 8); ctx.lineTo(hx - d * 6, y - 8); ctx.lineTo(hx - d * 6, y - 66); ctx.stroke();
    ctx.strokeStyle = F.brass; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(px + d * 16, y - 8); ctx.lineTo(hx - d * 6, y - 8); ctx.lineTo(hx - d * 6, y - 66); ctx.stroke();
    // the ram: rod and head shoot toward the machine
    const out = r.k * 30, tip = hx + d * (26 + out);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 12; tthFinLine(hx, y - 88, tip - d * 10, y - 88);
    ctx.strokeStyle = F.ironLt; ctx.lineWidth = 7; tthFinLine(hx, y - 88, tip - d * 10, y - 88);
    ctx.fillStyle = r.live > 0 ? '#ffffff' : F.red; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(Math.min(tip, tip - d * 16), y - 106, 16, 36, 5); ctx.fill(); ctx.stroke();
    // the housing and its lamp
    ctx.fillStyle = F.iron; rr(hx - 22, y - 112, 44, 48, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = F.brass; ctx.fillRect(hx - 22, y - 76, 44, 5);
    ctx.fillStyle = F.ironDk; ctx.fillRect(hx - 14, y - 64, 8, 64 - 14); ctx.fillRect(hx + 6, y - 64, 8, 64 - 14);
    const lampOn = armed ? (r.cool > 0 ? false : true) : false;
    if (lampOn) { ctx.fillStyle = 'rgba(159,224,127,0.4)'; circle(hx, y - 124, 17 + (blink ? 3 : 0)); ctx.fill(); }
    ctx.fillStyle = lampOn ? F.green : tp.state === 'hit' ? '#ffffff' : '#8a3a4a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; circle(hx, y - 124, 10); ctx.fill(); ctx.stroke();
    if (ch > 0 && !armed) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(hx, y - 124, 15, -Math.PI / 2, -Math.PI / 2 + ch * Math.PI * 2); ctx.stroke(); }
    // the plunger: a box and a T handle (it dips when pressed)
    const hy = y - 50 + r.down * 14;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 8; tthFinLine(px, hy, px, y - 20);
    ctx.strokeStyle = F.ironLt; ctx.lineWidth = 4; tthFinLine(px, hy, px, y - 20);
    ctx.fillStyle = armed && !r.live && blink ? '#ffffff' : F.red; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(px - 20, hy - 6, 40, 11, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = F.iron; rr(px - 22, y - 22, 44, 22, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; for (let n = 0; n < 3; n++) { ctx.beginPath(); ctx.moveTo(px - 16 + n * 12, y - 4); ctx.lineTo(px - 10 + n * 12, y - 18); ctx.lineTo(px - 4 + n * 12, y - 18); ctx.lineTo(px - 10 + n * 12, y - 4); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
}
// dents and plasters on the machine after each hit; the wreck after the last one
function tthFinDrawDamage(st) {
  const ph = st.ph, tp = ph.top, c = st.thief, F = TTHFINC, y = tthFinLY(TTHFIN_N);
  if (!tp) return;
  if (ph.stage === 'top' && tp.hits > 0 && c.jet && !c.hidden) {
    const s = c.s, bx = c.x, by = c.y + Math.sin(c.t * 3) * 4 * s;
    ctx.save(); ctx.translate(bx, by); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-44, -56); ctx.lineTo(-38, -44); ctx.lineTo(-46, -38); ctx.lineTo(-36, -26); ctx.stroke();
    ctx.fillStyle = '#fff4d6'; ctx.save(); ctx.translate(34, -46); ctx.rotate(0.5); ctx.fillRect(-9, -3, 18, 6); ctx.strokeRect(-9, -3, 18, 6); ctx.rotate(-1); ctx.fillRect(-9, -3, 18, 6); ctx.strokeRect(-9, -3, 18, 6); ctx.restore();
    if (tp.hits > 1) { ctx.beginPath(); ctx.moveTo(48, -54); ctx.lineTo(40, -42); ctx.lineTo(50, -34); ctx.lineTo(42, -22); ctx.moveTo(-10, -60); ctx.lineTo(-4, -52); ctx.lineTo(-14, -48); ctx.stroke(); }
    ctx.restore();
  }
  if (tp.flash > 0) { ctx.save(); ctx.globalAlpha = tp.flash * 0.8; ctx.fillStyle = '#ffffff'; circle(480, y - 100, 40 + (1 - tp.flash) * 130); ctx.fill(); ctx.restore(); }
  if (ph.stage !== 'fin' && !(st.cut && ph.fin)) return;
  // the wreck on the pedestal: two half shells, a sprung dial, the fallen jet
  const t = ph.fin ? ph.fin.t : 9, wob = Math.sin(t * 9) * 0.5 * Math.exp(-t * 0.45);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.save(); ctx.translate(452, y - 66); ctx.rotate(-0.42); ctx.fillStyle = F.brass; ctx.beginPath(); ctx.moveTo(-34, 0); ctx.quadraticCurveTo(-36, -40, 0, -42); ctx.lineTo(8, -28); ctx.lineTo(0, -18); ctx.lineTo(10, -6); ctx.lineTo(4, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = F.brassLt; ctx.fillRect(-26, -34, 18, 4); ctx.restore();
  ctx.save(); ctx.translate(510, y - 66); ctx.rotate(0.5); ctx.fillStyle = F.brass; ctx.beginPath(); ctx.moveTo(34, 0); ctx.quadraticCurveTo(36, -40, 0, -42); ctx.lineTo(-8, -28); ctx.lineTo(0, -18); ctx.lineTo(-10, -6); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(480, y - 66); ctx.rotate(wob);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); for (let n = 0; n <= 8; n++) ctx.lineTo((n % 2 ? 7 : -7) * (n > 0 && n < 8 ? 1 : 0), -n * 6); ctx.stroke();
  ctx.strokeStyle = F.ironLt; ctx.lineWidth = 2.5; ctx.beginPath(); for (let n = 0; n <= 8; n++) ctx.lineTo((n % 2 ? 7 : -7) * (n > 0 && n < 8 ? 1 : 0), -n * 6); ctx.stroke();
  tthClockFace(0, -62, 15, G.clock, { speed: 14, ticks: true, lw: 2.5 });
  ctx.restore();
  ctx.fillStyle = '#4a4466'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.save(); ctx.translate(404, y - 9); ctx.rotate(-0.2); rr(-16, -9, 32, 18, 4); ctx.fill(); ctx.stroke(); ctx.restore();
}
function tthFinDrawBubbles(st) {
  const ph = st.ph, K = TTHFIN.bub, F = TTHFINC;
  for (const b of ph.bubs) {
    const u = clamp(b.t / b.fly, 0, 1), pc = PCOL[b.id];
    // the ring where it will land: it tightens as the bubble comes
    ctx.save(); ctx.translate(b.tx, b.ty);
    ctx.fillStyle = `rgba(127,233,255,${0.08 + 0.16 * u})`; ctx.beginPath(); ctx.ellipse(0, 0, K.rx, K.ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.setLineDash([9, 7]); ctx.lineDashOffset = -G.clock * 30; ctx.strokeStyle = b.dud ? 'rgba(255,255,255,0.35)' : F.ice; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, K.rx, K.ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    if (!b.dud) { const g = 1 + (1 - u) * 0.9; ctx.strokeStyle = pc; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.4 + 0.5 * u; ctx.beginPath(); ctx.ellipse(0, 0, K.rx * g, K.ry * g, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    // the bubble: a wobbly soap bubble with a little clock inside
    const wob = 1 + Math.sin(b.t * 11 + b.seed) * 0.07;
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(wob, 2 - wob);
    ctx.fillStyle = 'rgba(160,240,255,0.42)'; ctx.strokeStyle = '#eaffff'; ctx.lineWidth = 2.5; circle(0, 0, 16); ctx.fill(); ctx.stroke();
    tthClockFace(0, 1, 8, b.t * 3 + b.seed, { speed: 6, lw: 1.6 });
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(-7, -8, 4.5, 2.5, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
function tthFinDrawTricks(st) {
  const ph = st.ph, tp = ph.top, F = TTHFINC, y = tthFinLY(TTHFIN_N), C0 = TTHFIN.cog;
  for (const d of ph.debris) {
    const a = clamp((d.life - d.t) / 0.3, 0, 1);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(d.x, d.y); ctx.rotate(d.rot);
    if (d.kind === 0) { ctx.fillStyle = F.ironLt; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8; ctx.beginPath(); for (let n = 0; n < 6; n++) ctx.lineTo(Math.cos(n * 1.047) * 6, Math.sin(n * 1.047) * 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.ink; circle(0, 0, 2); ctx.fill(); }
    else if (d.kind === 1) tthClockFace(0, 0, 7, d.t * 5, { speed: 8, lw: 1.6 });
    else tthFinCog(0, 0, 8, 0, 7, F.brass, C.ink, 1.8);
    ctx.restore();
  }
  if (!tp) return;
  for (const g of tp.cogs) {
    if (g.warn > 0) {   // it peeks in at the edge with a "!" before it rolls
      const ex = g.dir > 0 ? TTHFIN.x0 + 22 : TTHFIN.x1 - 22, bob = Math.abs(Math.sin(G.clock * 12)) * 5;
      tthFinCog(ex - g.dir * (16 + g.warn * 12), y - C0.r, C0.r, G.clock * 9 * g.dir, 8, F.brass, C.ink, 2.5);
      bigText('!', ex + g.dir * 8, y - 52 - bob, tthBig() ? 38 : 30, F.red, 1);
      ctx.strokeStyle = F.red; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const k of [0, 1, 2]) { const ax = ex + g.dir * (30 + k * 16 + (G.clock * 40) % 16); ctx.globalAlpha = 0.8 - k * 0.2; ctx.beginPath(); ctx.moveTo(ax - g.dir * 6, y - 22); ctx.lineTo(ax, y - 15); ctx.lineTo(ax - g.dir * 6, y - 8); ctx.stroke(); }
      ctx.globalAlpha = 1;
      continue;
    }
    tthFinCog(g.x, y - C0.r, C0.r + 2, g.rot, 8, F.brass, C.ink, 2.5);
    ctx.fillStyle = F.brassDk; circle(g.x, y - C0.r, 5); ctx.fill(); ctx.stroke();
  }
}
// the pay-off: 8 little portals named after their eras, and the 8 things flying home
function tthFinDrawHome(st) {
  const ph = st.ph, f = ph.home, big = tthBig();
  if (!f) return;
  for (let i = 0; i < f.open.length; i++) {
    if (f.open[i] <= 0.01) continue;
    const P = tthFinPortalAt(st, i), era = TTH_ERAS[TTH_ORDER[i]], fs = big ? 15 : 12;
    tthDrawPortal(P.x, P.y, 26 + f.lit[i] * 3 * Math.sin(G.clock * 6), G.clock + i * 0.7, { open: f.open[i], col: era.col });
    ctx.save(); ctx.globalAlpha = Math.min(1, f.open[i] * 1.6);
    ctx.font = tthFont(fs); const tw = ctx.measureText(TTHFIN_HOME[i][1]).width + 14;
    ctx.fillStyle = f.lit[i] > 0 ? 'rgba(255,243,196,0.95)' : 'rgba(30,20,66,0.85)'; rr(P.x - tw / 2, P.y + 34, tw, fs + 8, (fs + 8) / 2); ctx.fill();
    text(TTHFIN_HOME[i][1], P.x, P.y + 34 + (fs + 8) / 2 + 0.5, fs, f.lit[i] > 0 ? C.ink : '#ffffff', 'center', 'body');
    if (f.lit[i] > 0) {   // home! (a gold tick for the things Pip and Bo won back themselves)
      const k = f.lit[i], s = 0.6 + 0.4 * Math.min(1, k * 1.6);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 7 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(P.x - 10 * s, P.y); ctx.lineTo(P.x - 3 * s, P.y + 8 * s); ctx.lineTo(P.x + 11 * s, P.y - 9 * s); ctx.stroke();
      ctx.strokeStyle = st.loot[i] ? C.gold : '#9fe07f'; ctx.lineWidth = 4 * s; ctx.stroke();
    }
    ctx.restore();
  }
  for (const it of f.items) {
    if (it.s !== 1 && it.s !== 2) continue;
    const u = it.s === 2 ? clamp(it.ft / TTHFIN.home.fly, 0, 1) : 0, sc = (it.s === 1 ? 0.95 : 0.95 - 0.5 * u) * (big ? 1.15 : 1);
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff3c4'; circle(it.x, it.y, 22 * sc + Math.sin(G.clock * 9 + it.i) * 2); ctx.fill(); ctx.restore();
    tthDrawLoot(it.kind, it.x, it.y, sc, G.clock + it.i);
  }
}
function tthFinDraw(st) {
  const ph = st.ph;
  if (!ph.c) return;
  tthFinDrawRams(st);
  tthFinDrawDamage(st);
  tthFinDrawTricks(st);
  tthFinDrawBubbles(st);
  tthFinDrawHome(st);
}
// over the players: who is frozen in a bubble, the rewind flash, the gold arrow
function tthFinDrawTop(st) {
  const ph = st.ph, F = TTHFINC;
  if (!ph.c) return;
  for (const p of G.players) {
    const fz = ph.P[p.id].frozenT;
    if (fz <= 0 || !p.alive) continue;
    const x = p.x + st.cam.x + p.w / 2, y = p.y + st.cam.y + p.h / 2, r = 24 + Math.sin(G.clock * 18) * (fz < 0.3 ? 2.5 : 0.8);
    ctx.fillStyle = 'rgba(160,240,255,0.4)'; ctx.strokeStyle = '#eaffff'; ctx.lineWidth = 2.5; circle(x, y, r); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(x - 10, y - 12, 6, 3.2, -0.6, 0, Math.PI * 2); ctx.fill();
    tthClockFace(x + 15, y - 17, 7, G.clock * 4, { speed: 6, lw: 1.5 });
  }
  if (ph.rw && !ph.rw.soft) {
    const u = clamp(ph.rw.t / TTHFIN.rewind.t, 0, 1);
    tthScreen(st, () => {
      ctx.save(); ctx.globalAlpha = 0.2 * (1 - u); ctx.fillStyle = '#b28dff'; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = clamp(1.4 - u * 1.4, 0, 1); bigText('◀◀', W / 2, 230, tthBig() ? 64 : 52, '#e6d4ff', 1 + 0.1 * Math.sin(G.clock * 20));
      ctx.restore();
    });
  }
  const ga = ph.goldAt;
  if (ga && ph.stage === 'climb') {
    const x = ga.el ? ga.el.plat.x + ga.el.plat.w / 2 : ga.x, y = (ga.el ? ga.el.plat.y - 50 : ga.y) + Math.sin(G.clock * 6) * 6;
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - 9, y - 22); ctx.lineTo(x + 9, y - 22); ctx.lineTo(x + 9, y - 6); ctx.lineTo(x + 18, y - 6); ctx.lineTo(x, y + 14); ctx.lineTo(x - 18, y - 6); ctx.lineTo(x - 9, y - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}
// the HUD: the rewind clock in the left margin (the same sweep as the huge hand); at the top: the hits
function tthFinHud(st) {
  const ph = st.ph, F = TTHFINC, big = tthBig(), K = TTHFIN;
  if (!ph.c || G.introT > 0.3 || st.cut) return;
  const x = big ? 76 : 74, y = big ? 196 : 176, r = big ? 40 : 30;
  if (ph.stage === 'climb' || ph.stage === 'lift') {
    const hd = ph.hand, k = clamp(hd.k, 0, 1), warn = ph.stage === 'climb' && hd.spin <= 0 && k >= K.hand.warnK, stuck = ph.gold.hand >= 2, stop = ph.braking || ph.stage === 'lift' || stuck;
    const col = hd.spin > 0 ? '#e6d4ff' : stop ? F.ice : warn ? F.red : F.brassLt;
    ctx.fillStyle = 'rgba(28,26,54,0.82)'; circle(x, y, r + 6); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = warn && Math.sin(G.clock * 14) > 0 ? F.red : 'rgba(255,244,214,0.9)'; ctx.lineWidth = 3; circle(x, y, r); ctx.stroke();
    ctx.strokeStyle = F.red; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r + 3, -Math.PI / 2 + K.hand.warnK * Math.PI * 2, Math.PI * 1.5); ctx.stroke();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.lineCap = 'round'; tthFinLine(x, y, x + Math.sin(k * Math.PI * 2) * r * 0.82, y - Math.cos(k * Math.PI * 2) * r * 0.82);
    ctx.fillStyle = C.ink; circle(x, y, 4); ctx.fill();
    const word = hd.spin > 0 ? 'Rewind!' : ph.kick ? 'It kicks!' : stuck ? 'Stuck!' : ph.stage === 'lift' ? 'Stopped' : ph.braking ? 'Braked!' : warn ? 'Nearly 12!' : 'Rewind at 12';
    const fs = big ? 17 : 12; ctx.font = tthFont(fs); const tw = ctx.measureText(word).width + 16;
    pill(x, y + r + 12, tw, fs + 10, 'center'); text(word, x, y + r + 12 + (fs + 10) / 2 + 0.5, fs, stuck ? C.gold : col, 'center', 'body');
  } else if (ph.stage === 'top' && ph.top) {
    const tp = ph.top, n = K.smash.hits, fs = big ? 18 : 13, gap = big ? 27 : 22, y = big ? 400 : 392;   // (below the little portals)
    pill(x, y - (big ? 34 : 28), big ? 112 : 88, big ? 96 : 76, 'center');
    text('Smash it!', x, y - (big ? 16 : 14), fs, '#ffffff', 'center', 'body');
    for (let i = 0; i < n; i++) {
      const bx = x + (i - (n - 1) / 2) * gap, by = y + (big ? 26 : 18), on = i < tp.hits;
      tthFinCog(bx, by, big ? 14 : 11, on ? 0.3 : G.clock * 2, 7, on ? C.gold : 'rgba(255,255,255,0.22)', on ? C.ink : null, 2);
      if (on) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx - 5, by); ctx.lineTo(bx - 1, by + 4); ctx.lineTo(bx + 6, by - 5); ctx.stroke(); }
    }
  }
}

/* ---------- the phase and its room ---------- */
TTH_PHASES.finale = {
  setup(st, Lv) { tthFinSetup(st, Lv); },
  step(st, dt) { tthFinStep(st, dt); },
  coast(st, dt) { tthFinCoast(st, dt); },
  busy(st, p) { return tthFinBusy(st, p); },
  labels(st) { return st.ph.stage ? tthFinLabels(st) : ['brake', 'press']; },
  jobKeys(st) { const ph = st.ph; return ph.stage === 'top' || ph.stage === 'fin' ? ['smash', 'smash'] : ph.holder === 1 ? ['climber', 'holder'] : ['holder', 'climber']; },
  roles(st) { const ph = st.ph; return ph.stage === 'top' ? ['Smash!', 'Smash!'] : ph.stage === 'fin' ? null : ph.holder === 0 ? ['Brake!', 'Climb!'] : ['Climb!', 'Brake!']; },
  legend(st) {
    const ph = st.ph, top = ph.stage === 'top' || ph.stage === 'fin';
    const job = id => (top ? 'at a plunger, with your friend:' : id === ph.holder ? 'at the lever, hold:' : 'climb! At the button:');
    return { pip: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump, ' + job(0), bo: '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump, ' + job(1),
      pad: 'stick or d-pad move, <span data-glyph="a"></span> jump; ' + (top ? 'at a plunger, together:' : 'hold at the lever, or press at the button:') };
  },
  hudText(st) { const ph = st.ph; return ph.stage === 'fin' ? 'Smashed!' : ph.stage === 'top' ? 'Hits ' + (ph.top ? ph.top.hits : 0) + '/' + TTHFIN.smash.hits : 'Ledge ' + ph.k + '/' + TTHFIN_N; },
  progress(st) { const ph = st.ph; return { n: (ph.k || 0) + (ph.top ? ph.top.hits : 0), of: TTHFIN_N + TTHFIN.smash.hits }; },
  drawBack(st) { tthFinDrawBack(st); },
  draw(st) { tthFinDraw(st); },
  drawTop(st) { tthFinDrawTop(st); },
  hud(st) { tthFinHud(st); },
};

/* ---------- sounds ---------- */
Sfx.extra.tthFinClick = function () { this.tone(1500, 0.03, 'square', 0.022); this.tone(900, 0.04, 'square', 0.02, null, 0.04); };
Sfx.extra.tthFinClunk = function () { this.tone(140, 0.08, 'square', 0.04, 90); this.tone(70, 0.14, 'triangle', 0.05, 50, 0.02); };
Sfx.extra.tthFinWhirr = function () { this.tone(300, 0.3, 'sawtooth', 0.03, 1200); this.tone(900, 0.12, 'square', 0.02, 500, 0.05); };
Sfx.extra.tthFinBrake = function () { this.tone(1400, 0.28, 'sawtooth', 0.022, 300); this.tone(220, 0.12, 'triangle', 0.04, 140, 0.05); };
Sfx.extra.tthFinSlip = function () { this.tone(700, 0.22, 'sawtooth', 0.03, 180); this.tone(200, 0.1, 'square', 0.03, 120, 0.1); };
Sfx.extra.tthFinBtn = function () { this.tone(520, 0.06, 'square', 0.04); this.tone(1046, 0.16, 'triangle', 0.05, null, 0.06); };
Sfx.extra.tthFinLift = function () { this.tone(110, 0.7, 'sawtooth', 0.018, 220); this.tone(330, 0.5, 'sine', 0.02, 660, 0.05); };
Sfx.extra.tthFinDong = function () { this.tone(196, 0.9, 'sine', 0.07, 190); this.tone(392, 0.7, 'triangle', 0.035, 380, 0.01); this.tone(588, 0.5, 'sine', 0.02, null, 0.02); };
Sfx.extra.tthFinRewind = function () { for (let k = 0; k < 7; k++) this.tone(1500 * Math.pow(0.84, k), 0.09, 'triangle', 0.035, 1800 * Math.pow(0.84, k), k * 0.08); };
Sfx.extra.tthFinKickWarn = function () { for (let k = 0; k < 5; k++) this.tone(300 + k * 90, 0.07, 'square', 0.03, null, k * 0.16); };
Sfx.extra.tthFinKick = function () { this.tone(160, 0.16, 'sawtooth', 0.06, 60); this.tone(900, 0.06, 'square', 0.03, 400, 0.01); };
Sfx.extra.tthFinBub = function () { this.tone(500, 0.2, 'sine', 0.035, 1100); this.tone(900, 0.12, 'sine', 0.02, 1500, 0.08); };
Sfx.extra.tthFinPop = function () { this.tone(1300, 0.05, 'sine', 0.04, 500); this.tone(700, 0.08, 'triangle', 0.025, 300, 0.03); };
Sfx.extra.tthFinLedge = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.13, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.tthFinArm = function () { [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'square', 0.035, null, i * 0.07)); };
Sfx.extra.tthFinRam = function (p) { this.tone(180 * p, 0.12, 'sawtooth', 0.05, 90 * p); this.tone(1200, 0.05, 'square', 0.025, 600, 0.02); };
Sfx.extra.tthFinRumble = function () { for (let k = 0; k < 5; k++) this.tone(70 + Math.random() * 30, 0.14, 'sawtooth', 0.028, 50, k * 0.16); };
Sfx.extra.tthFinMiss = function () { this.tone(330, 0.14, 'square', 0.035, 220); this.tone(220, 0.2, 'square', 0.035, 150, 0.12); };
Sfx.extra.tthFinBoom = function () { this.tone(110, 0.5, 'sawtooth', 0.08, 35); this.tone(60, 0.6, 'triangle', 0.09, 30, 0.02); for (let k = 0; k < 5; k++) this.tone(900 + Math.random() * 1400, 0.07, 'square', 0.025, 300, 0.05 + k * 0.05); };
Sfx.extra.tthFinWhoosh = function () { this.tone(400, 0.4, 'sine', 0.03, 1400); };
Sfx.extra.tthFinHome = function (p, i) { const f = [523, 587, 659, 784, 880, 988, 1175, 1319][i | 0] || 784; this.tone(f, 0.12, 'triangle', 0.05); this.tone(f * 1.5, 0.22, 'sine', 0.04, null, 0.07); };

/* ---------- the room (this file fills in its own room of the level def) ---------- */
tthRoom('finale', {
  jobs: {
    holder: { title: 'Brake holder', act: 'brake', legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump',
      howTo: ['Hold brake at the lever to slow the gears. Let go when it says let go.'] },
    climber: { title: 'Climber', act: 'press', legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump, climb',
      howTo: ['Climb the gears and press the button at the hatch.'] },
    smash: { title: 'Smash it', act: 'smash', legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump',
      howTo: ['Both press smash at a plunger together.'] },
  },
  act: { label: 'brake', labels: ['brake', 'press'] },
  tip: 'One holds the brake lever to slow the gears. The other climbs up to the button. Then smash it together!',
  legend: { pip: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump, at the lever, hold:', bo: '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump, climb! At the button:',
    pad: 'stick or d-pad move, <span data-glyph="a"></span> jump; hold at the lever, or press at the button:' },
  map: TTH_EMPTY_MAP,
});
