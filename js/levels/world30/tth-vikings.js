/* Pip & Bo - Level 30-1 The Time Thief: era 'vikings' (Viking Voyage, 1000 AD). */
'use strict';

/* ===== 30-1 era 5: Viking Voyage, 1000 AD (TTH_PHASES.vikings) — Gavyn's pick =====
   "Vikings reach North America, year 1000 (scrolling): row a longship through stormy waves. One rows to the beat,
   the other bails water and watches for icebergs."
   Leif Erikson's longship rows west through a storm to find Vinland. The Time Thief stole the SUNSTONE, the crystal
   the sagas say found the sun through cloud, so thick FOG lies on the sea: icebergs only show up close... unless the
   lookout is up the mast. The ship stays at the left of the screen and the sea scrolls (the camera never moves:
   st.cam stays 0, 0). The sea has 3 LANES (far, middle, near). Pip and Bo ride the ship: the era draws them itself
   (hide() is true) and keeps p.x / p.y on them for hints and bubbles.

   THE TWO JOBS (room field `first` rows first; jobs swap at the two marker buoys, so both do both)
     ROWER    sits at the oars. A drum beats (a drum sound, the drum on deck, and the beat track at the bottom left:
              notes slide into the ring). Press the ACTION on the beat: "Perfect!" (within 0.085 s) or "Good!" (0.19 s)
              is a strong stroke; off the beat is a weak splash that also uses up that beat, and a second press on the
              same beat does nothing, so mashing crawls. Good strokes in a row build a small combo bonus.
              UP / DOWN steer one lane up or down (0.3 s; hold to keep going). The ship stops by itself without
              strokes, so an idle rower stalls everything.
     LOOKOUT  runs the deck with LEFT / RIGHT. The ACTION at the bucket (near the bow) bails one scoop (hold it to
              keep scooping). UP at the mast climbs it, DOWN slides down; up there the fog thins far ahead and
              everything that comes into view stays SPOTTED for both players. Nobody bails from up the mast: it is a
              juggle. Watching from up there needs no key, so it counts as playing (present(): the Thief does not
              "wait" for a lookout on the mast, for up to 45 s without a key and never on a swamped ship). The ship's raven caws (and flaps) whenever something unseen is close in the fog.
   WATER    the hull fills by itself (waves slosh in), faster under the Thief's rain cloud and after a splash or a
            crash. Above 30% the ship gets slower; at 100% it is "Swamped!" (a team bump) and will not move until the
            lookout has bailed it down to 55%. So an idle lookout stalls everything too: nobody clears this alone.

   THREE STRETCHES (the beat gets faster: 0.80, 0.72, 0.66 s) + THE GRAB
     1 Storm Swell     learn the beat and the bucket. The Thief tips RAIN CLOUDS over the ship (it flies in for 1 s,
                       then rains 4.6 s) and makes JET WAVES: he dips to the ship's lane, a "!" blinks there for
                       1.15 s, then a wave rolls down that lane (about 1.5 s more). Steer out of the lane or it is a
                       "Splash!" (team bump: lots of water, the ship slows).
     buoy: a gust fills the sail and carries the ship for 2.6 s while the jobs swap ("Swap jobs!").
     2 Iceberg Field   packs of iceberg rows in the fog (every row leaves one lane free, rows are 450+ px apart so a
                       lane change always fits). From the deck the fog shows 240 px ahead of the bow (about 1 s);
                       from the mast top 900 px. Hitting one is a "Crunch!": the berg crumbles, the ship bounces back
                       a little and takes on water. Rain clouds now and then.
     buoy: swap again.
     3 Serpent Strait  a friendly sea serpent lies across the lanes: each of its loops has a tall HOOP in one lane
                       (thread it: "Threaded!") and coils in the other two ("Boing!", the coil ducks, the ship bounces
                       back). The open lane moves one lane at a time. A jet wave between its passes, rain clouds.
     THE GRAB          the Thief hovers over the near lane and dangles the sunstone just out of reach while his jet
                       stirs up BIG WAVES (they roll in from the right every 6 s or so, seen from far off). The rower
                       keeps the beat so the ship climbs the wave (too slow: it breaks over the bow, no lift). On the
                       crest the lookout, at the MAST TOP, presses the action: "Yoink!". A swipe that misses makes the
                       Thief pull the stone up for that wave ("Nope!"), so wait for the top. 3 grabs win the sunstone:
                       the fog lifts, the sun comes out, land ahead: Vinland. Then tthPhaseDone.
   SOFT FAILS only (team bumps, tthBump): Splash! (jet wave), Crunch! (iceberg), Boing! (serpent coil), Swamped!.
   Each costs a few seconds (a bounce back, water to bail); nothing is ever lost and nobody is hurt. The serpent is a
   friend: it giggles and says sorry.
   GOLD HELP (announced with tthHelp, kept for the rest of the era):
     Golden drum    a rower whose last 8 strokes had 6 weak ones: the Good window grows to 0.3 s; again: any stroke
                    counts (still one per beat). Per player.
     Gold lantern   3 crashes (icebergs or coils) in one stretch: the deck sees 380 px into the fog.
     Gold bucket    swamped twice: every scoop bails double.
     Golden wave    2 big waves missed: the waves roll slower, lift a slow ship too, the Thief stops pulling away
                    and the hull stops filling (no more bailing: the lookout can stay up the mast).
   FAIRNESS: every hazard is telegraphed 0.7 s or more (the fog reveal at the speed cap; about 1 s at rowing speed
   and a lane change takes 0.3 s), usually much longer (the raven,
   the Thief's "!" for jet waves, the cloud flying in, big waves seen from the right edge). No hazard starts in a calm
   moment (tthCalm: cards, cutscenes, celebrations, the idle wait); while the Thief waits for an away person the ship
   drifts to a stop and the hull does not fill. Jet waves never start with a row or loop close ahead.
   CONTROLS: the rower needs the action (one press per beat, about 1.4 a second) and up / down; the lookout needs
   left / right, up / down and the action (3 scoops a second at most; holding works). "Up" is tthUp(p) (jump or stick
   up). Hints name each player's own keys (tthKey); in 1-player mode the computer's hints say what it does.
   HISTORY (news line and taunts): Leif Erikson's crew reached North America (Vinland) around the year 1000, about
   500 years before Columbus; longships had both oars and a sail; Vikings told tales of a giant sea serpent and took
   ravens to sea to help find land.
   TUNING (bots, tools/w30/play.js vikings): a computer pair takes about 2:10 (stretches about 29 / 35 / 44 s, the
   grab 20 s), a clumsy partner 2:25-2:50, a young kid 2:30-4:15; an idle player stalls it for good. Other tools:
   tools/w30/vikings-input.js (real keyboard / controller / touch), vikings-trace.js (a timeline), vikings-perf.js
   (draw time: the era's drawing is about 4.5 ms a frame in headless software canvas, like the other eras).
   Stats (st.stats.vikings): strokes, perfect, good, weak, scoops, spotted, threads, crashes, splashes, swamps, grabs,
   waves, legs [s per stretch]. Every top-level name starts with tthVik / TTHVIK (Sfx.extra.tthVik*); all state is in
   st.ph (fresh every phase start); gameplay randomness only through tthRand(). */
const TTHVIK = {
  // the ship. Local coords: origin at the stern on the waterline, x toward the bow, y up is negative.
  sternX: 180, len: 250, benchX: 62, mastX: 132, bucketX: 198, deckY: -22, mastH: 108, deckX0: 30, deckX1: 224,
  walkV: 175, climbV: 150, slideV: 290, mastGrab: 26, hitBack: 26, hitFront: 6,
  laneY: [335, 400, 465], laneT: 0.3, laneRepeat: 0.5,
  // rowing: the beat per stretch (the last one is the grab), timing windows (s), stroke power
  beat: [0.8, 0.72, 0.66, 0.66], perfect: 0.085, good: [0.19, 0.3, 9], imp: 150, drag: 0.9, vMax: 340,
  pow: { perfect: 1, good: 0.74, weak: 0.14, mash: 0.04 }, comboK: 0.015, comboMax: 8, strokeT: 0.42,
  goldLog: 8, goldBad: 6,
  // water in the hull (0..1)
  seep: [0.045, 0.034, 0.036, 0.018], rainFill: 0.075, scoop: 0.075, scoopCd: 0.34, scoopHold: 0.42, bucketR: 30,
  slowFrom: 0.3, slowK: 0.55, afloat: 0.55,
  // fog: how far past the bow the deck sees, the mast top sees, and the raven hears
  near: 240, nearGold: 380, far: 900, cawAhead: 980,
  // the course (px of sea): stretch 1, then generated packs of iceberg rows and serpent passes
  len1: 6200, lead: 820, tail: 620, rowGap: [450, 490], packGap: [900, 1000], packs2: [2, 3, 4, 4], packs3: [3, 4, 4, 3],
  bergW: [62, 82], gateW: 46, jetGap: 550,
  swapT: 2.6, gustV: 165, seatT: 0.7, watchMax: 45,
  // the Thief's mischief per stretch: R rain cloud, J jet wave
  ev: [{ first: 5, every: 6.4, pat: 'RJRJJ' }, { first: 9, every: 14, pat: 'R' }, { first: 8, every: 12, pat: 'R' }],
  rain: { in: 1.0, on: 4.6, out: 0.8 },
  jet: { aim: 1.15, blast: 0.45, v: 330, h: 44, hw: 74, water: 0.22, slow: 0.35, clear: 620, clear3: 1150 },
  crash: { back: -140, water: 0.1 },
  thief: { x: 836, y: 236, s: 0.7 },
  // the grab
  fin: { intro: 2.6, thiefY: 222, s: 0.62, waveH: 80, ramp: 190, plat: 130, v: 250, goldV: 175, from: W + 330, gap: 0.7, need: 0.45, breakH: 26,
    reach: 30, tease: 1.4, grabs: 3, water: 0.04, breakWater: 0.16, wonT: 2.8 },
  goldCrash: 3, goldSwamp: 2, goldWave: 2,
};
const TTHVIK_TAUNTS = ['Lost in the fog? Hee hee!', 'Leif who? Finders keepers!', 'Row, row, row! You\'ll never catch me!', 'Splish, splash! Ha!'];
// the rower's two steering keys as one readable bit of a sentence: 'W / S', '▲ / ▼', 'stick up / down'
function tthVikUD(id, sep = ' / ') {
  const up = tthKey(id, 'up'), dn = tthKey(id, 'down');
  return up + sep + (up.startsWith('stick ') && dn.startsWith('stick ') ? dn.slice(6) : dn);
}
const tthVikSolo = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const tthVikLaneY = f => TTHVIK.laneY[0] + (TTHVIK.laneY[2] - TTHVIK.laneY[0]) * f / 2;
const tthVikBow = () => TTHVIK.sternX + TTHVIK.len;
const tthVikEase = k => k * k * (3 - 2 * k);
// the speed a steady rower holds in stretch k (px/s), for "too slow" tests
const tthVikCruise = k => TTHVIK.imp * 0.85 / (TTHVIK.drag * TTHVIK.beat[k]);
// the screen x of a thing at course position x (the bow is at tthVikBow())
const tthVikSx = (ph, x) => tthVikBow() + x - ph.dist;

/* ---------- the course: iceberg rows (stretch 2), serpent loops (stretch 3) ---------- */
function tthVikCourse() {
  const K = TTHVIK, R = tthRand, haz = [], rnd = (a, b) => a + R() * (b - a), pick = n => Math.min(n - 1, Math.floor(R() * n));
  const marks = [K.len1], heads = [];
  let x = K.len1 + K.lead, f = 1, last = x;
  const step = () => { const prev = f, opts = [f - 1, f + 1].filter(l => l >= 0 && l <= 2); f = opts[pick(opts.length)]; return prev; };
  K.packs2.forEach((rows, pi) => {
    for (let r = 0; r < rows; r++) {
      const prev = step(), both = pi === 0 || R() < 0.65;
      for (let l = 0; l < 3; l++) {
        if (l === f || !(both || l === prev)) continue;
        haz.push({ kind: 'berg', x: x + rnd(-12, 12), lane: l, w: rnd(K.bergW[0], K.bergW[1]), hh: rnd(50, 76), seed: pick(997), k: 1, seen: false, done: false, broken: false });
      }
      last = x; x += rnd(K.rowGap[0], K.rowGap[1]);
    }
    x = last + rnd(K.packGap[0], K.packGap[1]);
  });
  marks.push(last + K.tail);
  x = marks[1] + K.lead;
  K.packs3.forEach((gates, pi) => {
    heads.push({ x: x - 150, t: 0, said: false });
    for (let g = 0; g < gates; g++) {
      step();
      haz.push({ kind: 'gate', x, lane: f, w: K.gateW, k: 2, seen: false, done: false, broken: false, thread: false, wig: 0, seed: pick(997) });
      last = x; x += rnd(K.rowGap[0], K.rowGap[1]);
    }
    // open water after a pass, long enough for one jet wave to come and go before the next hoop (K.jetGap)
    const jet = pi < K.packs3.length - 1;
    if (jet) haz.push({ kind: 'jetmark', x: last + 150, lane: 0, w: 1, k: 2, seen: true, done: false });
    x = last + rnd(K.packGap[0], K.packGap[1]) + (jet ? K.jetGap : 0);
  });
  marks.push(last + K.tail);
  haz.sort((a, b) => a.x - b.x);
  return { haz, marks, heads };
}

/* ---------- the sea: swell, jet waves, big waves ---------- */
// how high hump h lifts the water at screen x
function tthVikHumpAt(h, sx) {
  const d = Math.abs(sx - h.sx) - h.plat / 2;
  if (d <= 0) return h.h;
  if (d >= h.ramp) return 0;
  const c = Math.cos(d / h.ramp * Math.PI / 2);
  return h.h * c * c;
}
// the water surface (screen y) of lane laneF (0..2, may be a fraction while the ship changes lanes) at screen x
function tthVikSurf(ph, laneF, sx) {
  const wx = sx + ph.dist, t = ph.t;
  let y = tthVikLaneY(laneF) + ph.swell * (Math.sin(wx * 0.011 + t * 1.3 + laneF * 1.9) * 7 + Math.sin(wx * 0.027 - t * 2.1 + laneF * 0.7) * 3);
  for (const h of ph.humps) {
    if (h.kind === 'big') y -= tthVikHumpAt(h, sx - (2 - laneF) * 34);
    else if (Math.abs(h.lane - laneF) < 0.5) y -= tthVikHumpAt(h, sx);
  }
  return y;
}
// the ship rides the water under it: its height and pitch follow the surface (smoothed)
function tthVikPose(ph, dt) {
  const K = TTHVIK, cx = K.sternX + K.len / 2;
  const yS = tthVikSurf(ph, ph.lanePos, cx - 80), yB = tthVikSurf(ph, ph.lanePos, cx + 80), yC = tthVikSurf(ph, ph.lanePos, cx);
  const ty = (yS + yB + 2 * yC) / 4, tr = clamp(Math.atan2(yB - yS, 160) * 0.85, -0.3, 0.3), k = Math.min(1, dt * 14);
  ph.sy += (ty - ph.sy) * k; ph.rot += (tr - ph.rot) * k;
  ph.kick = Math.max(0, ph.kick - dt * 3);
}
// a point of the ship (local coords) on screen
function tthVikPt(ph, lx, ly) {
  const K = TTHVIK, c = Math.cos(ph.rot), s = Math.sin(ph.rot), dx = lx - K.len / 2;
  return { x: K.sternX + K.len / 2 + dx * c - ly * s, y: ph.sy + dx * s + ly * c };
}
// where each player is drawn (ship-local feet spot): the rower on the bench, the lookout on deck or up the mast,
// and the hop to the bench while the jobs swap
function tthVikSpot(ph, id) {
  const K = TTHVIK, L = ph.L;
  if (ph.seat && ph.seat.id === id) {
    const k = tthVikEase(clamp(ph.seat.t, 0, 1));
    return { x: ph.seat.x0 + (K.benchX - ph.seat.x0) * k, y: ph.seat.y0 + (K.deckY - ph.seat.y0) * k - Math.sin(k * Math.PI) * 34, air: true };
  }
  if (id === ph.rower) return { x: K.benchX, y: K.deckY, air: false };
  return { x: L.onMast ? K.mastX + 7 : L.x, y: K.deckY - (L.onMast ? L.h : 0), air: false };
}
// keep the engine's players on the spots where the era draws them (hints, badges and bubbles sit over p)
function tthVikPlace(st) {
  const ph = st.ph;
  for (const p of G.players) {
    const sp = tthVikSpot(ph, p.id), q = tthVikPt(ph, sp.x, sp.y);
    p.x = q.x - p.w / 2; p.y = q.y - p.h; p.vx = 0; p.vy = 0; p.grounded = true; p.alive = true; p.stun = 0;
    p.face = p.id === ph.rower ? 1 : ph.L.face;
  }
}
const tthVikMastTop = () => TTHVIK.mastH - 4;
// 0..1: how much of the far view the lookout's height gives
function tthVikMastK(ph) { const L = ph.L; return L.onMast ? clamp((L.h / tthVikMastTop() - 0.3) / 0.6, 0, 1) : 0; }
// the lookout watches from up the mast with no key held: that IS the job, so the Thief must not take a person there
// for away (the phase's present()). Not for ever (K.watchMax s), and not once the ship is swamped: bailing comes first.
const tthVikWatching = ph => tthVikMastK(ph) > 0 && !ph.swamped && ph.L.stillT < TTHVIK.watchMax && (ph.state === 'sail' || ph.state === 'finale');
const tthVikAtTop = ph => ph.L.onMast && ph.L.h >= tthVikMastTop() - 8;

/* ---------- hints (each at most once every `again` s) ---------- */
function tthVikTip(st, id, key, text, cpuText, again = 9, o = {}) {
  const ph = st.ph, k = key + id;
  if (ph.tips[k] != null && ph.t - ph.tips[k] < again) return false;
  if (st.hints[id] && !o.force && st.hints[id].t < 1.2) return false;
  ph.tips[k] = ph.t;
  tthHint(st, id, text, { cpu: cpuText, life: o.life || 3, gold: !!o.gold });
  return true;
}
function tthVikFb(ph, text, col) { ph.fb = { text, col, t: 0 }; }
function tthVikSpray(x, y, n, col = 'rgba(235,250,255,0.9)', up = 260) {
  for (let i = 0; i < n; i++) G.particles.push({ x: x + (Math.random() - 0.5) * 30, y, vx: (Math.random() - 0.5) * 220, vy: -up * (0.4 + Math.random() * 0.6), life: 0.4, max: 0.4, col, size: 3 + Math.random() * 3, grav: 900, kind: 'dot' });
}

/* ---------- the drum beat and the rower ---------- */
function tthVikBeat(st, dt) {
  const ph = st.ph;
  const n0 = Math.floor(ph.beatT / ph.P + 1e-6);
  ph.beatT += dt;
  if (Math.floor(ph.beatT / ph.P + 1e-6) > n0) { ph.drumT = 0.2; Sfx.play('tthVikDrum'); }
  ph.drumT = Math.max(0, ph.drumT - dt);
  if (ph.fb && (ph.fb.t += dt) > 0.7) ph.fb = null;
}
function tthVikStroke(st, p) {
  const ph = st.ph, K = TTHVIK, id = p.id, S = tthStats(st);
  if (ph.seat && ph.seat.id === id) return;
  const n = Math.round(ph.beatT / ph.P), off = ph.beatT - n * ph.P, a = Math.abs(off), lvl = ph.gold.drum[id];
  let q;
  if (n <= ph.claim) q = 'mash';
  else { ph.claim = n; q = a <= K.perfect ? 'perfect' : a <= K.good[lvl] ? 'good' : 'weak'; }
  ph.lastOff = off; ph.lastQ = q; ph.strokeN++;
  ph.strokeA = 0.001; ph.strokeQ = q;
  S.strokes++;
  if (q === 'perfect' || q === 'good') {
    S[q]++; ph.combo++;
    if (!ph.swamped) {
      const wet = 1 - K.slowK * tthVikEase(clamp((ph.water - K.slowFrom) / (1 - K.slowFrom), 0, 1));
      ph.v = Math.min(K.vMax, Math.max(ph.v, 0) + K.imp * K.pow[q] * (1 + Math.min(ph.combo, K.comboMax) * K.comboK) * wet);
    }
    tthVikFb(ph, q === 'perfect' ? 'Perfect!' : 'Good!', q === 'perfect' ? C.gold : '#ffffff');
    Sfx.play('tthVikStroke', id); if (q === 'perfect') rumble(id, 0.2, 0.3, 60);
    const b = tthVikPt(ph, 40, 16); tthVikSpray(b.x, b.y, q === 'perfect' ? 7 : 4, 'rgba(235,250,255,0.9)', 200);
  } else {
    S.weak++; ph.combo = 0;
    if (!ph.swamped) ph.v = Math.min(K.vMax, Math.max(ph.v, 0) + K.imp * K.pow[q]);
    tthVikFb(ph, q === 'mash' ? 'One per beat!' : off < 0 ? 'Early!' : 'Late!', '#9fd6ee');
    Sfx.play('tthVikWeak', id);
  }
  if (ph.swamped) { tthVikFb(ph, 'Too heavy!', '#9fd6ee'); tthVikTip(st, id, 'heavy', 'Too heavy! The water must go first', 'Too heavy to row!', 6); }
  // the golden drum: a rower who keeps missing the beat gets an easier one (announced)
  const log = ph.rowLog[id];
  log.push(q === 'perfect' || q === 'good' ? 1 : 0);
  if (log.length > K.goldLog) log.shift();
  if (log.length >= K.goldLog && log.filter(v => !v).length >= K.goldBad && lvl < 2) {
    ph.gold.drum[id] = lvl + 1; log.length = 0;
    tthHelp(st, lvl ? 'Golden drum: every stroke counts now, one for each beat!' : 'Golden drum: the beat is easier to hit!', { id, hint: 'One press for each drum beat: ' + tthKey(id, 'act') });
    S.gold.push('drum');
  } else if (q === 'weak' && log.slice(-3).every(v => !v) && log.length >= 3) {
    tthVikTip(st, id, 'beat', 'Press ' + tthKey(id, 'act') + ' when the note hits the ring', 'I row on the beat!', 7);
  }
}
function tthVikRower(st, p, dt) {
  const ph = st.ph, K = TTHVIK, seated = !(ph.seat && ph.seat.id === p.id);
  const up = tthUp(p), dn = !!p.input.down, dir = up && !dn ? -1 : dn && !up ? 1 : 0;
  if (ph.steerLock) { if (!dir) ph.steerLock = false; }
  else if (seated) {
    let go = 0;
    if (dir) { if (dir !== ph.steerDir) { go = dir; ph.steerT = K.laneRepeat; } else if ((ph.steerT -= dt) <= 0) { go = dir; ph.steerT = K.laneRepeat; } }
    if (go && ph.state === 'finale') tthVikTip(st, p.id, 'norow', 'No steering now: row up the big waves!', 'I row up the waves!', 8);
    else if (go) {
      const to = clamp(ph.lane + go, 0, 2);
      if (to !== ph.lane) { ph.laneFrom = ph.lanePos; ph.lane = to; ph.laneK = 0; Sfx.play('tthVikSteer', p.id); }
    }
  }
  ph.steerDir = dir;
  if (p.pendingAct && seated && ph.state !== 'won') tthVikStroke(st, p);
  p.pendingAct = false;
}

/* ---------- the lookout: the deck, the bucket, the mast, the grab ---------- */
function tthVikScoop(st, p, fresh) {
  const ph = st.ph, K = TTHVIK, L = ph.L, S = tthStats(st);
  L.cd = fresh ? K.scoopCd : K.scoopHold; L.scoopT = 0.3;
  if (ph.water <= 0.015) { tthVikTip(st, p.id, 'dry', 'Dry! Nothing to bail', 'All dry!', 10); return; }
  ph.water = Math.max(0, ph.water - K.scoop * (ph.gold.bucket ? 2 : 1));
  S.scoops++;
  Sfx.play('tthVikScoop', p.id);
  const q = tthVikPt(ph, K.bucketX + 26, -30);
  for (let i = 0; i < 5; i++) G.particles.push({ x: q.x, y: q.y, vx: 60 + Math.random() * 90, vy: -150 - Math.random() * 90, life: 0.6, max: 0.6, col: 'rgba(120,205,245,0.95)', size: 3 + Math.random() * 3, grav: 900, kind: 'dot' });
}
function tthVikLookout(st, p, dt) {
  const ph = st.ph, K = TTHVIK, L = ph.L, top = tthVikMastTop();
  L.cd = Math.max(0, L.cd - dt); L.scoopT = Math.max(0, L.scoopT - dt); L.grabT = Math.max(0, L.grabT - dt);
  const mv = (p.input.right ? 1 : 0) - (p.input.left ? 1 : 0), up = tthUp(p), dn = !!p.input.down;
  L.stillT = mv || up || dn || p.input.act || p.pendingAct ? 0 : L.stillT + dt;   // (for tthVikWatching)
  if (L.onMast) {
    if (up && !dn) { if (L.h < top) { L.h = Math.min(top, L.h + K.climbV * dt); if ((L.gripT -= dt) <= 0) { L.gripT = 0.16; Sfx.play('tthVikGrip', p.id); } } }
    else if (dn && !up) L.h -= K.slideV * dt;
    if (L.h <= 0) { L.h = 0; L.onMast = false; }
    else if (mv && !up && L.h < 16) { L.h = 0; L.onMast = false; }
    else if (mv && !up) tthVikTip(st, p.id, 'slide', 'Slide down first: ' + tthKey(p.id, 'down'), null, 5);
  }
  if (!L.onMast) {
    L.vx = approach(L.vx, mv * K.walkV, 1900 * dt);
    L.x = clamp(L.x + L.vx * dt, K.deckX0, K.deckX1);
    if (mv) L.face = mv;
    if (up && !dn) {
      if (Math.abs(L.x - K.mastX) < K.mastGrab) { L.onMast = true; L.x = K.mastX; L.vx = 0; L.h = 1; L.face = 1; L.gripT = 0; }
      else if (!mv) tthVikTip(st, p.id, 'where', 'The mast is in the middle of the ship', null, 6);
    }
  }
  const fresh = p.pendingAct; p.pendingAct = false;
  if (ph.state === 'won') return;
  if (L.onMast) { if (fresh) tthVikGrab(st, p); }
  else if ((fresh || p.input.act) && L.cd <= 0) {
    if (Math.abs(L.x - K.bucketX) <= K.bucketR) tthVikScoop(st, p, fresh);
    else if (fresh) tthVikTip(st, p.id, 'bucket', 'Bail at the bucket, near the bow', null, 5);
  }
}
// where the sunstone hangs (screen), and the lookout's reaching hand
function tthVikStone(st) { const P = tthThiefPts(st.thief); return { x: P.claw.x, y: P.claw.y + 8 * st.thief.s }; }
function tthVikHand(ph) { return tthVikPt(ph, TTHVIK.mastX + 7, TTHVIK.deckY - ph.L.h - 16); }
function tthVikInReach(st) {
  const ph = st.ph, F = ph.fin;
  if (!F || F.tease > 0 || !tthVikAtTop(ph) || (F.wave && F.wave.got)) return false;
  const a = tthVikHand(ph), b = tthVikStone(st);
  return Math.hypot(a.x - b.x, a.y - b.y) < TTHVIK.fin.reach;
}
function tthVikGrab(st, p) {
  const ph = st.ph, K = TTHVIK, KF = K.fin, F = ph.fin, L = ph.L, S = tthStats(st);
  if (L.grabT > 0.15) return;
  L.grabT = 0.4; Sfx.play('tthVikSwipe', p.id);
  if (ph.state !== 'finale' || !F) return;
  const w = F.wave, c = st.thief;
  if (tthVikInReach(st)) {
    F.grabs++; S.grabs++; if (w) w.got = true;
    F.tease = 1.0; F.tug = 0.5;
    const s = tthVikStone(st);
    burst(s.x, s.y, '#bfeaff', 12); Sfx.play('tthVikYoink', p.id); rumble(p.id, 0.5, 0.5, 140);
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.16);
    if (F.grabs >= KF.grabs) { tthVikWon(st, p); return; }
    tthPop(st, s.x, s.y - 26, 'Yoink! ' + F.grabs + '/' + KF.grabs, C.gold, 24);
    tthReact(st, 'shocked', F.grabs === 1 ? 'Hey! Hands off!' : 'Let go! It\'s MINE!', 1.6);
    tthNews(st, F.grabs === 1 ? 'It wobbles! Two more grabs!' : 'Nearly loose! One more grab!', false, 2.6);
  } else if (w && !w.got && Math.abs(w.sx - (K.sternX + K.len / 2)) < 560) {
    w.swiped = true;
    if (!F.gold) { if (F.tease <= 0) { c.pose = 'laugh'; tthSay(st, 'Nope! Too soon!', 1.3); } F.tease = KF.tease; }
    tthVikTip(st, p.id, 'soon', 'Wait for the top of the wave!', 'Too soon!', 4, { force: true });
  }
}

/* ---------- the ship: speed, lanes, water ---------- */
function tthVikSwamp(st) {
  const ph = st.ph, K = TTHVIK, S = tthStats(st), look = 1 - ph.rower;
  ph.swamped = true; ph.water = 1; ph.swampN++; S.swamps++; ph.combo = 0;
  tthBump(st, { word: 'Swamped!', kind: 'swamp', x: K.sternX + K.len / 2, y: ph.sy - 90 });
  Sfx.play('tthVikSplash');
  tthNews(st, 'Swamped! The ship won\'t move until the water is bailed out.', false, 4);
  tthVikTip(st, look, 'swamp', 'Bail! ' + tthKey(look, 'act') + ' at the bucket', 'I bail us out!', 3, { force: true, life: 4 });
  if (ph.swampN >= K.goldSwamp && !ph.gold.bucket) {
    ph.gold.bucket = true; S.gold.push('bucket');
    tthHelp(st, 'Gold bucket: every scoop bails double!', { id: look, hint: 'Gold bucket! Bail: ' + tthKey(look, 'act') });
  }
}
function tthVikSail(st, dt) {
  const ph = st.ph, K = TTHVIK;
  if (ph.laneK < 1) { ph.laneK = Math.min(1, ph.laneK + dt / K.laneT); ph.lanePos = ph.laneFrom + (ph.lane - ph.laneFrom) * tthVikEase(ph.laneK); }
  if (ph.strokeA > 0 && (ph.strokeA += dt / K.strokeT) >= 1) ph.strokeA = 0;
  if (ph.state === 'swap' || ph.state === 'won') ph.v = approach(ph.v, Math.max(ph.v, K.gustV), 260 * dt);
  ph.v -= ph.v * (ph.v < 0 ? 3 : K.drag) * dt;
  if (ph.swamped) ph.v = approach(ph.v, 0, 500 * dt);
  ph.dist = Math.max(ph.floor, ph.dist + ph.v * dt);
  // the hull fills (never in a calm moment), is swamped at 100%, and floats again once bailed down
  if (ph.state !== 'swap' && ph.state !== 'won' && !ph.swamped && !tthCalm(st)) {
    ph.water += ((ph.fin && ph.fin.gold ? 0 : K.seep[ph.k]) + (ph.rain && ph.rain.state === 'on' ? K.rainFill : 0)) * dt;   // (golden waves: the hull stays dry)
    if (ph.water >= 1) tthVikSwamp(st);
  }
  if (ph.swamped && ph.water <= K.afloat) {
    ph.swamped = false; tthNews(st, 'Afloat again! Row!', false, 2.2); Sfx.play('tthDing');
  }
  ph.water = clamp(ph.water, 0, 1);
  ph.slosh += dt * (2 + Math.abs(ph.v) * 0.01);
}

/* ---------- the Thief's mischief: rain clouds and jet waves ---------- */
function tthVikStartRain(st) {
  const ph = st.ph, c = st.thief, look = 1 - ph.rower;
  ph.rain = { state: 'in', t: 0, x: c.x - 30, y: 150 };
  c.pose = 'point'; tthSay(st, ph.rainN++ % 2 ? 'More rain! Glug, glug!' : 'Rain cloud! Fill their boat!', 1.8);
  Sfx.play('tthVikThunder');
  tthVikTip(st, look, 'rain', 'Rain! Bail at the bucket: ' + tthKey(look, 'act'), 'Rain! I bail!', 12);
}
function tthVikStartJet(st) {
  const ph = st.ph, c = st.thief;
  ph.jet = { state: 'aim', t: 0, lane: ph.lane };
  c.pose = 'point'; tthSay(st, ph.jetN++ % 2 ? 'Surf\'s up! Ha ha!' : 'Jet wave! Wheee!', 1.6);
  Sfx.play('tthVikRev');
  tthWarn(st, ph.rower, 1.1);
  tthVikTip(st, ph.rower, 'steer', 'Steer out of his lane: ' + tthVikUD(ph.rower, ' or '), 'I steer away!', 14, { force: true });
}
// true when no row or loop is close ahead (a jet wave would be unfair there)
function tthVikOpenSea(ph) {
  for (let i = ph.hi; i < ph.haz.length; i++) {
    const h = ph.haz[i];
    if (h.x - ph.dist > (ph.k === 2 ? TTHVIK.jet.clear3 : TTHVIK.jet.clear)) break;
    if (!h.done && h.kind !== 'jetmark') return false;
  }
  return true;
}
function tthVikEvents(st, dt) {
  const ph = st.ph, K = TTHVIK, c = st.thief;
  // the schedule (stretches only; nothing starts in a calm moment, while swamped, or while another trick runs)
  if (ph.state === 'sail' && !tthCalm(st) && !ph.swamped && !ph.rain && !ph.jet && (ph.evT -= dt) <= 0) {
    const E = K.ev[ph.k], kind = E.pat[ph.evI % E.pat.length];
    if (kind === 'J' && !tthVikOpenSea(ph)) ph.evT = 0.5;
    else { ph.evI++; ph.evT = E.every; if (kind === 'J') tthVikStartJet(st); else tthVikStartRain(st); }
  }
  if (ph.jetDue && ph.state === 'sail' && !tthCalm(st) && !ph.jet && !ph.swamped && tthVikOpenSea(ph)) { ph.jetDue = false; tthVikStartJet(st); }
  // the rain cloud: flies over the ship, rains, drifts off
  const r = ph.rain;
  if (r) {
    r.t += dt;
    const over = tthVikPt(ph, K.mastX - 26, K.deckY - K.mastH - 78), ty = clamp(over.y, 122, 250), k = Math.min(1, dt * (r.state === 'in' ? 4 : 8));
    if (r.state === 'out') { r.x += 260 * dt; r.y -= 60 * dt; if (r.t >= K.rain.out) ph.rain = null; }
    else { r.x += (over.x - r.x) * k; r.y += (ty - r.y) * k; }
    if (r.state === 'in' && r.t >= K.rain.in) { r.state = 'on'; r.t = 0; c.pose = 'idle'; Sfx.play('tthVikRain'); }
    else if (r.state === 'on' && (r.t >= K.rain.on || ph.state !== 'sail')) { r.state = 'out'; r.t = 0; }
    else if (r.state === 'on' && (r.sfx = (r.sfx || 0) - dt) <= 0) { r.sfx = 0.9; Sfx.play('tthVikRain'); }
  }
  // the jet wave: he dips to the lane (a "!" blinks there), blasts, flies back up
  const j = ph.jet;
  if (j) {
    j.t += dt;
    if (j.state === 'aim' && j.t >= K.jet.aim) {
      j.state = 'blast'; j.t = 0;
      ph.humps.push({ kind: 'jet', lane: j.lane, sx: W + 70, h: K.jet.h, plat: 0, ramp: K.jet.hw, vx: K.jet.v, hit: false });
      Sfx.play('tthVikJet'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.1);
    } else if (j.state === 'blast' && j.t >= K.jet.blast) { j.state = 'back'; j.t = 0; c.pose = 'laugh'; }
    else if (j.state === 'back' && j.t >= 0.9) { ph.jet = null; c.pose = 'idle'; }
  }
  // jet waves roll down their lane
  for (const h of ph.humps) {
    if (h.kind !== 'jet') continue;
    h.sx -= h.vx * dt;
    if (!h.hit && h.sx < tthVikBow() - 20 && h.sx > K.sternX + 30 && Math.abs(ph.lanePos - h.lane) < 0.5) {
      h.hit = true; h.h *= 0.5;
      tthBump(st, { word: 'Splash!', kind: 'wave', x: h.sx, y: ph.sy - 70 });
      ph.water = Math.min(0.97, ph.water + K.jet.water); ph.v *= K.jet.slow; ph.combo = 0; ph.kick = 1;
      tthStats(st).splashes++;
      tthVikSpray(h.sx, ph.sy - 20, 22, 'rgba(200,240,255,0.95)', 420); Sfx.play('tthVikSplash');
      tthReact(st, 'happy', 'Splash! Ha ha!', 1.4);
    } else if (!h.hit && !h.past && h.sx < K.sternX) { h.past = true; if (Math.abs(ph.lanePos - h.lane) >= 0.5) tthPop(st, K.sternX + 40, ph.sy - 80, 'Dodged!', '#bfeaff', 18); }
  }
  if (ph.humps.length && ph.humps[0].kind === 'jet' && ph.humps[0].sx < -120) ph.humps.shift();
}
// where the Thief hovers (the core moves him during cutscenes)
function tthVikThief(st, dt) {
  const ph = st.ph, K = TTHVIK, c = st.thief, t = ph.t, j = ph.jet, F = ph.fin;
  if (st.cut) return;
  let tx = K.thief.x, ty = K.thief.y + Math.sin(t * 1.3) * 9, s = K.thief.s, face = -1, claw = 0.3, flame = 1, k = 4;
  if (j && j.state !== 'back') { tx = W - 62; ty = tthVikLaneY(j.lane) - 14; face = 1; claw = 0.05; flame = j.state === 'blast' ? 1.5 : 0.5; k = 6; }
  else if (F) {
    // (he keeps the stone right over the mast top, also while the ship pitches on a wave: only the height is missing)
    tx = tthVikHand(ph).x + 8 + 16 * K.fin.s; ty = K.fin.thiefY + Math.sin(t * 1.7) * 2; s = K.fin.s; claw = 0.6; k = 3;
    c.x += (tx - c.x) * Math.min(1, dt * 12);
    if (ph.state === 'won') { ty -= 20; claw = 0.2; }
    else if (F.tease > 0) { ty -= 36; claw = 0.05; k = 9; }
    if (F.wave && !F.wave.broke && F.wave.sx > 700) flame = 1.4;
  }
  const u = Math.min(1, dt * k);
  c.x += (tx - c.x) * u; c.y += (ty - c.y) * u; c.s += (s - c.s) * u; c.claw += (claw - c.claw) * Math.min(1, dt * 8);
  c.face = face; c.flame = flame; c.jet = true;
}

/* ---------- icebergs and serpent loops: the fog, spotting, crashes ---------- */
function tthVikCrash(st, h) {
  const ph = st.ph, K = TTHVIK, S = tthStats(st), bow = tthVikBow(), gate = h.kind === 'gate';
  h.broken = true; h.done = true; h.breakT = 0;
  ph.v = K.crash.back; ph.combo = 0; ph.kick = 1;
  ph.water = Math.min(0.97, ph.water + K.crash.water);
  tthBump(st, { word: gate ? 'Boing!' : 'Crunch!', kind: gate ? 'serpent' : 'berg', x: bow - 10, y: ph.sy - 76 });
  S.crashes++; ph.crashN++;
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.3);
  if (gate) {
    Sfx.play('boing'); tthVikSpray(bow, ph.sy - 10, 12);
    tthPop(st, clamp(bow + 60, 80, W - 80), ph.sy - 120, 'Oopsss! Sorry!', '#9ff0b4', 18);
  } else {
    Sfx.play('tthVikCrunch');
    for (let i = 0; i < 12; i++) G.particles.push({ x: bow + Math.random() * 40, y: ph.sy - 10 - Math.random() * 50, vx: (Math.random() - 0.2) * 260, vy: -120 - Math.random() * 240, life: 0.8, max: 0.8, col: i % 3 ? '#eaf7ff' : '#bcdff2', size: 5 + Math.random() * 5, grav: 900, kind: 'dot' });
    if (S.crashes % 2 === 1) tthReact(st, 'happy', 'Crunch! Ha ha!', 1.3);
  }
  if (ph.crashN >= K.goldCrash && !ph.gold.lantern) {
    ph.gold.lantern = true; S.gold.push('lantern');
    tthHelp(st, 'Gold lantern: the deck sees farther into the fog!', { id: ph.rower, hint: 'Gold lantern! Steer early: ' + tthVikUD(ph.rower) });
  }
}
function tthVikHazards(st, dt) {
  const ph = st.ph, K = TTHVIK, bow = tthVikBow(), S = tthStats(st), look = 1 - ph.rower;
  // how far the fog lets them see: the deck's view, or the mast's
  const near = bow + (ph.gold.lantern ? K.nearGold : K.near), mk = tthVikMastK(ph), want = near + (bow + K.far - near) * tthVikEase(mk);
  ph.vis = approach(ph.vis, want, (want > ph.vis ? 1700 : 600) * dt);
  let caw = false, spot = 0, warn = false;
  while (ph.hi < ph.haz.length && ph.haz[ph.hi].done && tthVikSx(ph, ph.haz[ph.hi].x) < -220) ph.hi++;
  for (let i = ph.hi; i < ph.haz.length; i++) {
    const h = ph.haz[i], sx = tthVikSx(ph, h.x);
    if (sx > bow + K.cawAhead + 200) break;
    if (h.kind === 'jetmark') { if (!h.done && sx <= bow) { h.done = true; ph.jetDue = true; } continue; }
    if (h.broken) h.breakT += dt;
    if (h.wig > 0) h.wig = Math.max(0, h.wig - dt * 1.6);
    if (h.spot > 0) h.spot = Math.max(0, h.spot - dt * 1.1);
    if (!h.seen) {
      if (sx <= ph.vis) {
        h.seen = true;
        if (mk > 0.2 && sx > near + 40) { h.spot = 1; spot++; }
        if (!ph.met[h.kind]) {   // the first one of its kind: tell the rower what to do
          ph.met[h.kind] = true;
          const row = ph.rower, keys = tthVikUD(row);
          if (h.kind === 'gate') tthVikTip(st, row, 'gate', 'Steer through the tall hoop: ' + keys, 'Through the tall hoop!', 99, { force: true, life: 4 });
          else tthVikTip(st, row, 'berg', 'Iceberg! Steer around it: ' + keys, 'I steer around the ice!', 99, { force: true, life: 4 });
        }
      } else if (sx < bow + K.cawAhead && h.k === ph.k) caw = true;
    }
    if (h.done) continue;
    const gate = h.kind === 'gate', mine = gate ? Math.abs(ph.lanePos - h.lane) >= 0.5 : Math.abs(ph.lanePos - h.lane) < 0.5;
    if (h.seen && mine && sx > bow - 10 && sx < bow + 400) warn = true;
    if (sx < bow - K.hitFront && sx + h.w > K.sternX + (gate ? K.hitBack : 90)) {
      if (mine) tthVikCrash(st, h);
      else if (gate && sx + h.w < bow - 36) {
        h.thread = true; h.done = true; h.wig = 1; S.threads++;
        tthPop(st, bow - 30, ph.sy - 150, 'Threaded!', C.gold, 20); Sfx.play('tthVikThread');
      }
    } else if (sx + h.w <= K.sternX + 90) h.done = true;
  }
  // the serpent says hello
  for (const hd of ph.heads) {
    const sx = tthVikSx(ph, hd.x);
    if (!hd.said && ph.k === 2 && sx < Math.min(ph.vis + 40, W - 70)) { hd.said = true; tthPop(st, sx + 24, 214, 'Hisss-hello!', '#9ff0b4', 18); Sfx.play('tthVikHiss'); }
  }
  if (spot) {
    S.spotted += spot; ph.spotT = 0.6;
    const q = tthVikPt(ph, K.mastX, K.deckY - K.mastH - 30);
    tthPop(st, q.x + 40, q.y, 'Spotted!', '#ffe27a', 18); Sfx.play('tthVikSpot', look);
  }
  ph.spotT = Math.max(0, ph.spotT - dt);
  if (warn) tthWarn(st, ph.rower, 0.25);
  // the raven caws while something unseen is close in the fog
  if (caw && !ph.caw) ph.cawSfx = 0;
  ph.caw = caw;
  if (caw && (ph.cawSfx -= dt) <= 0) {
    ph.cawSfx = 2.4; Sfx.play('tthVikCaw');
    const q = tthVikPt(ph, K.mastX - 50, K.deckY - K.mastH - 16);
    tthPop(st, q.x - 10, q.y, 'Kraa!', '#ffffff', 16);
    // (once; not over a news line that has only just come up, e.g. the gust at the buoy: a later caw says it)
    if (!ph.cawNews && !(st.news && st.news.t < 3.2)) { ph.cawNews = true; tthNews(st, 'The raven caws: something is in the fog! Lookout, up the mast!', false, 4.5); }
  }
}

/* ---------- the buoys (jobs swap), the grab, the win ---------- */
const tthVikNewLookout = x => ({ x, vx: 0, h: 0, onMast: false, face: 1, cd: 0, scoopT: 0, grabT: 0, gripT: 0, stillT: 0 });
function tthVikLeg(st) { const ph = st.ph; tthStats(st).legs.push(Math.round((st.phT - ph.legT0) * 10) / 10); ph.legT0 = st.phT; }
function tthVikJobTips(st) {
  const ph = st.ph, row = ph.rower, look = 1 - row;
  tthVikTip(st, row, 'job', 'Row: press ' + tthKey(row, 'act') + ' on the drum beat. Steer: ' + tthVikUD(row), 'I row on the beat and steer!', 2, { force: true, life: 5 });
  tthVikTip(st, look, 'job', ph.k === 0 ? 'Bail at the bucket: ' + tthKey(look, 'act') : 'Bail: ' + tthKey(look, 'act') + ' at the bucket. Climb the mast: ' + tthKey(look, 'up'), ph.k === 0 ? 'I bail the water out!' : 'I bail and watch from the mast!', 2, { force: true, life: 5 });
}
function tthVikSwap(st) {
  const ph = st.ph, K = TTHVIK, now = 1 - ph.rower, sp = tthVikSpot(ph, now);
  tthVikLeg(st);
  ph.seat = { id: now, t: 0, x0: sp.x, y0: sp.y };      // the lookout hops to the bench...
  ph.rower = now; ph.L = tthVikNewLookout(K.benchX + 24);   // ...and the rower stands up
  ph.state = 'swap'; ph.stT = 0; ph.k++; ph.P = K.beat[ph.k]; ph.beatT = 0; ph.claim = 0; ph.combo = 0; ph.steerLock = true; ph.steerDir = 0;
  ph.evT = K.ev[ph.k].first; ph.evI = 0; ph.crashN = 0; ph.floor = ph.dist; ph.sailTo = 1; ph.swellTo = 1 + ph.k * 0.15;
  if (ph.rain && ph.rain.state !== 'out') { ph.rain.state = 'out'; ph.rain.t = 0; }
  tthSwap(st); Sfx.play('tthVikHorn');
  tthVikJobTips(st);
  tthNews(st, ph.k === 1 ? 'A gust fills the sail! Longships had both oars AND a sail.' : 'Vikings told tales of a giant sea serpent...', false, 4.4);
}
function tthVikSwapDone(st) {
  const ph = st.ph;
  ph.state = 'sail'; ph.stT = 0; ph.sailTo = 0;
  tthSay(st, ph.k === 1 ? 'Icebergs ahead! Mind the bumps!' : 'Meet my wiggly friend! Hee hee!', 2.4);
}
function tthVikFinale(st) {
  const ph = st.ph, K = TTHVIK, row = ph.rower, look = 1 - row;
  tthVikLeg(st);
  ph.state = 'finale'; ph.stT = 0; ph.k = 3; ph.P = K.beat[3]; ph.floor = ph.dist; ph.swellTo = 0.9;
  ph.fin = { t: 0, wave: null, next: K.fin.intro, grabs: 0, fails: 0, tease: 0, tug: 0, gold: false, n: 0, reach: false };
  if (ph.lane !== 2) { ph.laneFrom = ph.lanePos; ph.lane = 2; ph.laneK = 0; }
  if (ph.rain && ph.rain.state !== 'out') { ph.rain.state = 'out'; ph.rain.t = 0; }
  ph.jetDue = false;
  tthCelebrate(st, 1.2); tthShowBadges(st, 4);
  tthNews(st, 'Big waves! Ride one up to the sunstone and grab it!', false, 4.5);
  tthSay(st, 'Up here! You can\'t reach it!', 2.4);
  tthVikTip(st, row, 'fin', 'Keep the beat with ' + tthKey(row, 'act') + ': row up the big waves!', 'I row us up the waves!', 2, { force: true, life: 5 });
  tthVikTip(st, look, 'fin', 'Climb the mast: ' + tthKey(look, 'up') + '. On the wave top grab: ' + tthKey(look, 'act'), 'I grab it from the mast top!', 2, { force: true, life: 5 });
}
function tthVikFin(st, dt) {
  const ph = st.ph, K = TTHVIK, KF = K.fin, F = ph.fin, S = tthStats(st), row = ph.rower, look = 1 - row, bow = tthVikBow();
  F.t += dt; F.tease = Math.max(0, F.tease - dt); F.tug = Math.max(0, F.tug - dt);
  const w = F.wave;
  if (!w) {
    F.reach = false;
    if (!tthCalm(st) && !ph.swamped && (F.next -= dt) <= 0) {
      F.wave = { kind: 'big', sx: KF.from, h: KF.waveH, plat: KF.plat, ramp: KF.ramp, vx: F.gold ? KF.goldV : KF.v, met: false, broke: false, got: false, swiped: false };
      ph.humps.push(F.wave); F.n++; S.waves++;
      Sfx.play('tthVikRumble'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.12);
      if (F.n % 2 === 1) tthSay(st, F.n === 1 ? 'Wave time! Hold on tight!' : 'Another one! Wheee!', 1.6);
      if (!tthVikAtTop(ph)) tthVikTip(st, look, 'up', 'Big wave! Up to the mast top: ' + tthKey(look, 'up'), 'Up the mast!', 3, { force: true });
    }
    return;
  }
  w.sx -= w.vx * dt;
  const front = w.sx - KF.plat / 2 - KF.ramp;
  if (!w.met && front <= bow) {
    w.met = true;
    if (ph.v < tthVikCruise(3) * (F.gold ? 0.2 : KF.need)) {
      w.broke = true; ph.kick = 1;
      ph.water = Math.min(0.97, ph.water + KF.breakWater);
      tthPop(st, bow, ph.sy - 80, 'Splash! Too slow!', '#bfeaff', 20); tthVikSpray(bow, ph.sy - 20, 20, 'rgba(200,240,255,0.95)', 400); Sfx.play('tthVikSplash');
      tthVikTip(st, row, 'slow', 'Row on the beat to climb the wave: ' + tthKey(row, 'act'), 'I must row harder!', 3, { force: true });
    } else { Sfx.play('tthVikWhoosh'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.14); }
  }
  if (w.broke) w.h = approach(w.h, KF.breakH, 240 * dt);
  const was = F.reach;
  F.reach = tthVikInReach(st);
  if (F.reach && !was) { Sfx.play('tthDing'); tthVikTip(st, look, 'now', 'Now! Grab: ' + tthKey(look, 'act'), 'Now! Grab!', 1.5, { force: true, gold: true, life: 1.4 }); }
  if (!w.got && !w.met && !tthVikAtTop(ph) && front < bow + 420) tthVikTip(st, look, 'up', 'Up to the mast top: ' + tthKey(look, 'up'), 'Up the mast!', 3, { force: true });
  if (w.sx + KF.plat / 2 + KF.ramp < K.sternX - 30) {
    // the wave has passed
    ph.humps.splice(ph.humps.indexOf(w), 1); F.wave = null; F.next = KF.gap; F.reach = false;
    if (!F.gold) ph.water = Math.min(0.97, ph.water + KF.water);
    if (!w.got) {
      F.fails++;
      if (F.fails >= K.goldWave && !F.gold) {
        F.gold = true; S.gold.push('wave');
        tthHelp(st, 'Golden waves: slower, no more water comes in, and he can\'t pull the stone away!', { id: look, hint: 'On the wave top, grab: ' + tthKey(look, 'act') });
      } else if (w.broke) tthNews(st, 'The wave broke over the bow: row on the beat to climb the next one!', false, 3.2);
      else if (!w.swiped) tthNews(st, 'Lookout: be on the mast top and grab on top of the wave!', false, 3.2);
    }
  }
}
function tthVikWon(st, p) {
  const ph = st.ph, K = TTHVIK, c = st.thief;
  tthVikLeg(st);
  ph.state = 'won'; ph.stT = 0; ph.winner = p.id; ph.fogTo = 0; ph.clearTo = 1; ph.sailTo = 1; ph.swellTo = 0.5; ph.shore = ph.dist + 1500; ph.caw = false;
  ph.rain = null; ph.jet = null;
  c.item = null; c.pose = 'shock'; c.mood = 'shocked'; c.moodT = 3;
  tthSay(st, 'NO! My sparkly sunstone!', 1.8);
  tthCelebrate(st, K.fin.wonT + 0.4);
  const s = tthVikStone(st);
  tthPop(st, s.x, s.y - 30, 'Got it!', C.gold, 30);
  for (let i = 0; i < 26; i++) confetti(s.x + (Math.random() - 0.5) * 80, s.y);
  Sfx.play('tthVikHorn'); Sfx.play('tthCheer');
  tthNews(st, 'Land ho! Vinland! Vikings reached North America 500 years before Columbus.', true, 4);
  st.hints = [null, null];
}
function tthVikFlow(st, dt) {
  const ph = st.ph, K = TTHVIK;
  ph.stT += dt;
  if (ph.state === 'sail') {
    if (ph.k < 2 && ph.dist >= ph.marks[ph.k]) tthVikSwap(st);
    else if (ph.k === 2 && ph.dist >= ph.marks[2]) tthVikFinale(st);
  } else if (ph.state === 'swap') { if (ph.stT >= K.swapT) tthVikSwapDone(st); }
  else if (ph.state === 'finale') tthVikFin(st, dt);
  else if (ph.state === 'won') {
    tthVikRoll(ph, dt);
    if (ph.stT >= K.fin.wonT) tthPhaseDone(st, { say: 'Bah! Keep your sparkly rock! I\'ll steal something BIGGER!', portal: { x: 742, y: 214 } });
  }
}
// big waves keep rolling when nobody plays them (the win, cards, the idle wait)
function tthVikRoll(ph, dt) {
  for (let i = ph.humps.length - 1; i >= 0; i--) { const h = ph.humps[i]; h.sx -= h.vx * dt; if (h.sx + h.plat / 2 + h.ramp < -40) { ph.humps.splice(i, 1); if (ph.fin && ph.fin.wave === h) { ph.fin.wave = null; ph.fin.next = TTHVIK.fin.gap; } } }
}
// tips for a pair that seems stuck (twice a second)
function tthVikCoach(st, dt) {
  const ph = st.ph, K = TTHVIK, row = ph.rower, look = 1 - row, L = ph.L;
  if ((ph.coachT -= dt) > 0 || tthCalm(st) || (ph.state !== 'sail' && ph.state !== 'finale')) return;
  ph.coachT = 0.4;
  if (ph.water > 0.6) {
    if (L.onMast && !(ph.fin && ph.fin.wave && !ph.swamped)) tthVikTip(st, look, 'down', 'Lots of water! Slide down: ' + tthKey(look, 'down') + ', then bail', 'I slide down to bail!', 7);
    else if (!L.onMast && Math.abs(L.x - K.bucketX) > K.bucketR) tthVikTip(st, look, 'tobucket', 'Lots of water! Bail at the bucket, near the bow', 'To the bucket!', 7);
    else if (!L.onMast) tthVikTip(st, look, 'bail', 'Bail: ' + tthKey(look, 'act'), 'I bail!', 7);
  } else if (ph.state === 'sail' && ph.caw && ph.cawT > 0.7 && !L.onMast) {
    tthVikTip(st, look, 'mast', Math.abs(L.x - K.mastX) < K.mastGrab ? 'Climb the mast: ' + tthKey(look, 'up') : 'The raven caws! Go to the mast and climb: ' + tthKey(look, 'up'), 'Up the mast I go!', 7);
  }
  if (ph.v < 40 && !ph.swamped && ph.stT > 2.5 && ph.t - ph.lastStrokeT > 2.5) tthVikTip(st, row, 'row', 'Row! Press ' + tthKey(row, 'act') + ' on the drum beat', 'I row on the beat!', 8);
}
// things that just move with time (also during cards and cutscenes)
function tthVikAmbient(st, dt) {
  const ph = st.ph;
  ph.fog = approach(ph.fog, ph.fogTo, dt / 1.6); ph.clear = approach(ph.clear, ph.clearTo, dt / 2.4);
  ph.sail = approach(ph.sail, ph.sailTo, dt * 2.5); ph.swell = approach(ph.swell, ph.swellTo, dt * 0.4);
  ph.flash = Math.max(0, ph.flash - dt * 2.6);
  ph.cawT = ph.caw ? ph.cawT + dt : 0;
  if (ph.clearTo < 1 && !st.idle && !st.cut && G.introT <= 0 && (ph.boltT -= dt) <= 0) {
    ph.boltN++; ph.boltT = 5.5 + ((ph.boltN * 37) % 45) / 10; ph.boltX = 140 + (ph.boltN * 263) % 560;
    if (!reduceMotion) ph.flash = 1;
    Sfx.play('tthVikThunder');
  }
}
function tthVikCoast(st, dt) {
  const ph = st.ph, K = TTHVIK, go = !!st.cut || ph.state === 'won';
  ph.t += dt;
  if (go) ph.v = approach(ph.v, 130, 220 * dt); else ph.v -= ph.v * 1.4 * dt;
  ph.dist = Math.max(ph.floor, ph.dist + ph.v * dt);
  if (ph.laneK < 1) { ph.laneK = Math.min(1, ph.laneK + dt / K.laneT); ph.lanePos = ph.laneFrom + (ph.lane - ph.laneFrom) * tthVikEase(ph.laneK); }
  if (ph.strokeA > 0 && (ph.strokeA += dt / K.strokeT) >= 1) ph.strokeA = 0;
  if (ph.seat && (ph.seat.t += dt / K.seatT) >= 1) ph.seat = null;
  ph.drumT = Math.max(0, ph.drumT - dt); ph.slosh += dt * 2;
  tthVikRoll(ph, dt);
  if (go) { ph.rain = null; ph.jet = null; }
  else if (st.idle) {
    const r = ph.rain;
    if (r && r.state !== 'out') { r.state = 'out'; r.t = 0; }
    if (r && (r.t += dt) >= K.rain.out) ph.rain = null; else if (r) { r.x += 260 * dt; r.y -= 60 * dt; }
    if (ph.jet && ph.jet.state === 'aim') ph.jet = null;
    ph.caw = false;
  }
  tthVikThief(st, dt); tthVikAmbient(st, dt); tthVikPose(ph, dt); tthVikPlace(st);
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
}

/* ---------- drawing: the sky, the sea, the fog (the camera never moves: screen = world) ---------- */
const TTHVIK_COL = { wood: '#b0703c', woodDk: '#7a4a26', woodLt: '#d39a5e', sailA: '#f3e6c4', sailB: '#d8483e', rope: '#e8dcb0',
  sea: ['#2a5673', '#2f6787', '#35799d'], far: '#234a64', fog: '206,219,230', ice: '#e9f7ff', iceDk: '#b3d9ee',
  serp: '#57c58d', serpDk: '#2f8f62', serpLt: '#d2f5b0', shields: ['#d8483e', '#f2c14e', '#4a8fd8', '#f3e6c4'] };
const TTHVIK_NX = 52, TTHVIK_DX = 20;   // the water lines: 52 points, 20 px apart, from x = -20
const tthVikBuf = [new Float32Array(TTHVIK_NX), new Float32Array(TTHVIK_NX), new Float32Array(TTHVIK_NX)];   // scratch (drawing only)
function tthVikDrawBack(st) {
  const ph = st.ph, t = ph.t, d = ph.dist, CO = TTHVIK_COL, cl = tthVikEase(clamp(ph.clear, 0, 1)), hz = 268;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // the sky: a storm, and once the sunstone is back a clear golden evening
  tthSky('#1c2742', '#516c88', 0, hz + 30);
  if (cl > 0) {
    ctx.save(); ctx.globalAlpha = cl;
    tthSky('#58b3f0', '#ffe3a6', 0, hz + 30);
    const sx = 690, sy = 156;
    ctx.fillStyle = 'rgba(255,244,180,0.3)';
    for (let k = 0; k < 9; k++) { const a = k * 0.698 + t * 0.15; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * 560, sy + Math.sin(a) * 560); ctx.lineTo(sx + Math.cos(a + 0.17) * 560, sy + Math.sin(a + 0.17) * 560); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#fff3b0'; circle(sx, sy, 42); ctx.fill(); ctx.strokeStyle = '#ffcf5a'; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
  }
  // lightning far off
  if (ph.flash > 0 && cl < 0.5) {
    ctx.fillStyle = 'rgba(235,240,255,' + (ph.flash * 0.3) + ')'; ctx.fillRect(0, 0, W, hz);
    ctx.strokeStyle = 'rgba(255,250,200,' + Math.min(1, ph.flash * 1.4) + ')'; ctx.lineWidth = 4;
    ctx.beginPath(); let bx = ph.boltX, by = 96; ctx.moveTo(bx, by);
    for (let k = 0; k < 5; k++) { bx += ((ph.boltN * 13 + k * 29) % 41) - 20; by += 30; ctx.lineTo(bx, by); }
    ctx.stroke();
  }
  // clouds: dark and heavy, then white and fluffy
  const dark = cl < 0.5, ca = dark ? 1 - cl * 2 : (cl * 2 - 1) * 0.85;
  ctx.fillStyle = dark ? 'rgba(40,50,78,' + ca * 0.92 + ')' : 'rgba(255,255,255,' + ca + ')';
  for (let k = 0; k < 7; k++) {
    const s = 1 + (k % 3) * 0.35, x = ((k * 173 - d * 0.04 - t * 9) % (W + 300) + W + 300) % (W + 300) - 150, y = 92 + (k * 37) % 70;
    ctx.beginPath(); ctx.arc(x, y, 22 * s, 0, 7); ctx.arc(x + 28 * s, y - 10 * s, 27 * s, 0, 7); ctx.arc(x + 60 * s, y - 2 * s, 22 * s, 0, 7); ctx.arc(x + 86 * s, y + 4 * s, 16 * s, 0, 7); ctx.rect(x, y + 2 * s, 86 * s, 18 * s); ctx.fill();
  }
  // storm rain in the wind
  if (cl < 0.9) {
    ctx.strokeStyle = 'rgba(190,215,240,' + (0.22 * (1 - cl)) + ')'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let k = 0; k < 34; k++) { const x = ((k * 137 - t * 260) % (W + 60) + W + 60) % (W + 60) - 30, y = (k * 71 + t * 620 * (0.8 + (k % 4) * 0.1)) % (hz + 40); ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 18); }
    ctx.stroke();
  }
  // Vinland: a green coast on the horizon (it slides into view when the fog lifts)
  if (cl > 0.02) {
    const x0 = W - 600 * cl - (d - (ph.shore || d) + 1500) * 0.05;
    ctx.save(); ctx.globalAlpha = Math.min(1, cl * 1.5);
    ctx.fillStyle = '#5f9d5a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x0 - 40, hz + 8);
    for (let x = 0; x <= 720; x += 40) ctx.lineTo(x0 + x, hz - 8 - Math.min(1, x / 160) * (44 + Math.sin(x * 0.013) * 20 + Math.sin(x * 0.041) * 8));
    ctx.lineTo(x0 + 720, hz + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8d9a0'; ctx.beginPath(); ctx.ellipse(x0 + 250, hz + 4, 260, 9, 0, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 8; k++) {   // pines
      const px = x0 + 130 + k * 66 + (k % 2) * 17, py = hz - 36 - Math.sin((px - x0) * 0.013) * 20;
      ctx.fillStyle = '#2f6b45'; ctx.beginPath(); ctx.moveTo(px, py - 34); ctx.lineTo(px + 13, py + 4); ctx.lineTo(px - 13, py + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  // the far sea
  ctx.fillStyle = CO.far; ctx.fillRect(0, hz, W, 92);   // (the lanes cover the rest)
  ctx.strokeStyle = 'rgba(190,225,240,0.28)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let k = 0; k < 9; k++) { const x = ((k * 211 - d * 0.3) % (W + 80) + W + 80) % (W + 80) - 40, y = hz + 12 + (k * 23) % 44; ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 13, y - 5, x + 26, y); }
  ctx.stroke();
  // the serpent says hello from the far water
  for (const hd of ph.heads) { const sx = tthVikSx(ph, hd.x); if (sx > -90 && sx < W + 90) tthVikDrawHead(sx, hz + 46, t + hd.x); }
  // far marker buoys
  for (let k = 0; k < 2; k++) { const sx = tthVikSx(ph, ph.marks[k]); if (sx > -60 && sx < W + 60) tthVikDrawBuoy(sx - 46, TTHVIK.laneY[0] - 34 + Math.sin(t * 2 + k) * 3, 0.7, t); }
  // the three lanes of the sea: far, middle, near
  for (let l = 0; l < 3; l++) {
    const b = tthVikBuf[l];
    for (let i = 0; i < TTHVIK_NX; i++) b[i] = tthVikSurf(ph, l, i * TTHVIK_DX - 20);
    ctx.beginPath(); ctx.moveTo(-20, H + 10);
    for (let i = 0; i < TTHVIK_NX; i++) ctx.lineTo(i * TTHVIK_DX - 20, b[i]);
    ctx.lineTo(W + 40, H + 10); ctx.closePath();
    ctx.fillStyle = CO.sea[l]; ctx.fill();
    ctx.beginPath(); for (let i = 0; i < TTHVIK_NX; i++) ctx.lineTo(i * TTHVIK_DX - 20, b[i]);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); for (let i = 0; i < TTHVIK_NX; i++) ctx.lineTo(i * TTHVIK_DX - 20, b[i] + 4);
    ctx.strokeStyle = 'rgba(225,245,255,0.5)'; ctx.lineWidth = 2.5; ctx.stroke();
    // foam flecks rush by with the ship's speed
    ctx.strokeStyle = 'rgba(230,248,255,0.45)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let k = 0; k < 7; k++) {
      const x = ((k * 151 + l * 67 - d) % (W + 80) + W + 80) % (W + 80) - 40, y = b[clamp(Math.round((x + 20) / TTHVIK_DX), 0, TTHVIK_NX - 1)] + 16 + (k % 3) * 11;
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 9, y - 5, x + 18, y);
    }
    ctx.stroke();
    // the crest of a jet wave or a big wave
    for (const h of ph.humps) {
      if (h.kind === 'jet' ? h.lane !== l : false) continue;
      const hx = h.kind === 'big' ? h.sx + (2 - l) * 34 : h.sx, y = tthVikSurf(ph, l, hx), w2 = h.plat / 2 + 26;
      if (hx < -80 || hx > W + 80) continue;
      ctx.fillStyle = 'rgba(240,252,255,0.92)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx - w2, y + 3);
      for (let q = 0; q <= 4; q++) { const fx = hx - w2 + q * w2 / 2; ctx.quadraticCurveTo(fx - w2 / 4, y - 15 - Math.sin(t * 9 + q) * 3, fx, y - 2); }
      ctx.lineTo(hx + w2, y + 5); ctx.quadraticCurveTo(hx, y + 12, hx - w2, y + 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  if (cl > 0) { ctx.fillStyle = 'rgba(110,215,245,' + cl * 0.3 + ')'; ctx.fillRect(0, hz, W, H - hz); }
  tthVikDrawFog(ph);
}
// the fog bank: everything past ph.vis (the lookout's view pushes it back)
function tthVikDrawFog(ph) {
  const f = ph.fog, x0 = ph.vis - 70, c = TTHVIK_COL.fog;
  if (f <= 0.01 || x0 > W) return;
  const g = ctx.createLinearGradient(x0, 0, x0 + 230, 0);
  g.addColorStop(0, 'rgba(' + c + ',0)'); g.addColorStop(0.45, 'rgba(' + c + ',' + 0.55 * f + ')'); g.addColorStop(1, 'rgba(' + c + ',' + 0.94 * f + ')');
  ctx.fillStyle = g; ctx.fillRect(x0, 262, W - x0 + 10, H - 262);
  ctx.save();
  for (let k = 0; k < 9; k++) { ctx.globalAlpha = (k + 1) / 10; ctx.fillRect(x0, 226 + k * 4, W - x0 + 10, 4); }
  ctx.restore();
}
// the friendly sea serpent's head, peeking from the far water
function tthVikDrawHead(x, y, t) {
  const CO = TTHVIK_COL, bob = Math.sin(t * 2.2) * 4, hx = x + 16, hy = y - 62 + bob;
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 23; ctx.beginPath(); ctx.moveTo(x - 8, y + 10); ctx.quadraticCurveTo(x - 16, y - 34, hx - 6, hy + 6); ctx.stroke();
  ctx.strokeStyle = CO.serp; ctx.lineWidth = 18; ctx.stroke();
  ctx.strokeStyle = CO.serpLt; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 2, y + 8); ctx.quadraticCurveTo(x - 9, y - 30, hx - 2, hy + 10); ctx.stroke();
  ctx.fillStyle = CO.serp; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(hx + 6, hy, 24, 16, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff8a5c'; ctx.beginPath(); ctx.moveTo(hx - 12, hy - 13); ctx.lineTo(hx - 6, hy - 26); ctx.lineTo(hx, hy - 15); ctx.lineTo(hx + 6, hy - 25); ctx.lineTo(hx + 10, hy - 14); ctx.closePath(); ctx.fill(); ctx.stroke();   // a little crest
  for (const ex of [hx + 4, hx + 18]) { ctx.fillStyle = '#ffffff'; circle(ex, hy - 5, 5.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.ink; circle(ex + 1.5, hy - 4, 2.4); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx + 4, hy + 6); ctx.quadraticCurveTo(hx + 16, hy + 12, hx + 27, hy + 3); ctx.stroke();
  ctx.fillStyle = 'rgba(235,250,255,0.8)'; ctx.beginPath(); ctx.ellipse(x - 6, y + 12, 26, 5, 0, 0, Math.PI * 2); ctx.fill();
}
// a marker buoy (the jobs swap there)
function tthVikDrawBuoy(x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(Math.sin(t * 2.3 + x) * 0.1);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  ctx.fillStyle = '#e8473f'; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-9, -44); ctx.lineTo(9, -44); ctx.lineTo(20, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-15, -20); ctx.lineTo(-11.5, -34); ctx.lineTo(11.5, -34); ctx.lineTo(15, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -44); ctx.lineTo(0, -74); ctx.stroke();
  ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(0, -74); ctx.lineTo(24, -66 + Math.sin(t * 6) * 2); ctx.lineTo(0, -58); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(235,250,255,0.85)'; ctx.beginPath(); ctx.ellipse(0, 1, 26, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/* ---------- drawing: icebergs, the serpent's loops ---------- */
function tthVikDrawBerg(ph, h, sx) {
  const CO = TTHVIK_COL, w = h.w, hh = h.hh, s = h.seed, base = tthVikSurf(ph, h.lane, sx + w / 2) + 4;
  let a = 1, dy = 0;
  if (h.broken) { const u = h.breakT / 0.55; if (u >= 1) return; a = 1 - u; dy = u * 34; }
  const p1 = 0.28 + (s % 7) * 0.03, p2 = 0.64 + (s % 5) * 0.03, k1 = 0.66 + (s % 3) * 0.1;
  ctx.save(); ctx.translate(sx, base + dy); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(190,230,245,0.35)'; ctx.beginPath(); ctx.ellipse(w / 2, 9, w * 0.62, 10, 0, 0, Math.PI * 2); ctx.fill();   // the part under water
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(w * 0.1, -hh * 0.45); ctx.lineTo(w * p1, -hh * k1); ctx.lineTo(w * 0.48, -hh); ctx.lineTo(w * p2, -hh * 0.64); ctx.lineTo(w * 0.87, -hh * 0.4); ctx.lineTo(w + 5, 0); ctx.closePath();
  ctx.fillStyle = CO.ice; ctx.fill();
  ctx.fillStyle = CO.iceDk; ctx.beginPath(); ctx.moveTo(w * 0.48, -hh); ctx.lineTo(w * p2, -hh * 0.64); ctx.lineTo(w * 0.87, -hh * 0.4); ctx.lineTo(w + 5, 0); ctx.lineTo(w * 0.56, 0); ctx.closePath(); ctx.fill();
  // (art pass) a faceted berg: lit and shadowed faces, blue fracture lines, old snow on the ledges, a turquoise waterline, bubbles and glints
  ctx.save(); ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(w * 0.1, -hh * 0.45); ctx.lineTo(w * p1, -hh * k1); ctx.lineTo(w * 0.48, -hh); ctx.lineTo(w * p2, -hh * 0.64); ctx.lineTo(w * 0.87, -hh * 0.4); ctx.lineTo(w + 5, 0); ctx.closePath(); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(w * 0.1, -hh * 0.45); ctx.lineTo(w * p1, -hh * k1); ctx.lineTo(w * 0.36, -hh * 0.3); ctx.lineTo(w * 0.14, -hh * 0.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(110,170,210,0.3)'; ctx.beginPath(); ctx.moveTo(w * p1, -hh * k1); ctx.lineTo(w * 0.48, -hh); ctx.lineTo(w * 0.46, -hh * 0.42); ctx.lineTo(w * 0.36, -hh * 0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(40,100,150,0.22)'; ctx.beginPath(); ctx.moveTo(w * p2, -hh * 0.64); ctx.lineTo(w * 0.87, -hh * 0.4); ctx.lineTo(w * 0.74, -hh * 0.18); ctx.lineTo(w * 0.6, -hh * 0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(40,150,170,0.3)'; ctx.fillRect(-6, -hh * 0.14, w + 12, hh * 0.14);
  ctx.fillStyle = 'rgba(200,250,255,0.45)'; ctx.fillRect(-6, -hh * 0.14, w + 12, 2);
  ctx.strokeStyle = 'rgba(60,120,170,0.6)'; ctx.lineWidth = 1.3; ctx.beginPath();
  ctx.moveTo(w * 0.36, -hh * 0.3); ctx.lineTo(w * 0.46, -hh * 0.42); ctx.lineTo(w * 0.48, -hh * 0.75);
  ctx.moveTo(w * 0.46, -hh * 0.42); ctx.lineTo(w * 0.6, -hh * 0.3); ctx.lineTo(w * 0.74, -hh * 0.18);
  ctx.moveTo(w * 0.22, -hh * 0.12); ctx.lineTo(w * 0.28, -hh * 0.26); ctx.lineTo(w * 0.25, -hh * 0.36);
  ctx.moveTo(w * 0.68, -hh * 0.5); ctx.lineTo(w * 0.72, -hh * 0.36);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath();
  ctx.moveTo(w * 0.1 - 1, -hh * 0.45); ctx.lineTo(w * p1, -hh * k1 - 1); ctx.lineTo(w * 0.48, -hh - 1); ctx.lineTo(w * p2, -hh * 0.64 - 1); ctx.lineTo(w * 0.87, -hh * 0.4 - 1);
  ctx.lineTo(w * 0.85, -hh * 0.34); ctx.lineTo(w * 0.78, -hh * 0.38); ctx.lineTo(w * p2, -hh * 0.56); ctx.lineTo(w * 0.55, -hh * 0.78); ctx.lineTo(w * 0.5, -hh * 0.86); ctx.lineTo(w * 0.47, -hh * 0.8);
  ctx.lineTo(w * 0.4, -hh * 0.86); ctx.lineTo(w * p1, -hh * k1 + 5); ctx.lineTo(w * 0.2, -hh * 0.5); ctx.lineTo(w * 0.12, -hh * 0.38); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; for (const [bx, by, br] of [[0.3, 0.22, 2], [0.55, 0.12, 1.6], [0.7, 0.28, 1.3], [0.42, 0.55, 1.4]]) { circle(w * bx, -hh * by, br); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = '#ffffff'; for (const [gx, gy2] of [[0.3, 0.6], [0.52, 0.9]]) { const x2 = w * gx, y2 = -hh * gy2, g = 2.5 + Math.sin(ph.t * 3 + s + gx * 9) * 1.2; ctx.beginPath(); ctx.moveTo(x2 - g, y2); ctx.lineTo(x2, y2 - 0.6); ctx.lineTo(x2 + g, y2); ctx.lineTo(x2, y2 + 0.6); ctx.closePath(); ctx.moveTo(x2, y2 - g); ctx.lineTo(x2 + 0.6, y2); ctx.lineTo(x2, y2 + g); ctx.lineTo(x2 - 0.6, y2); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(w * 0.1, -hh * 0.45); ctx.lineTo(w * p1, -hh * k1); ctx.lineTo(w * 0.48, -hh); ctx.lineTo(w * p2, -hh * 0.64); ctx.lineTo(w * 0.87, -hh * 0.4); ctx.lineTo(w + 5, 0); ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w * 0.2, -hh * 0.4); ctx.lineTo(w * 0.34, -hh * 0.62); ctx.stroke();
  ctx.fillStyle = 'rgba(240,252,255,0.9)'; ctx.beginPath(); ctx.ellipse(w / 2, 1, w * 0.6, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function tthVikSerpStroke(wd) {
  const CO = TTHVIK_COL;
  ctx.strokeStyle = C.ink; ctx.lineWidth = wd + 5; ctx.stroke();
  ctx.strokeStyle = CO.serp; ctx.lineWidth = wd; ctx.stroke();
}
// a low coil of the serpent in lane l ("Boing!")
function tthVikDrawCoil(ph, h, sx, l) {
  const CO = TTHVIK_COL, cx = sx + h.w / 2, base = tthVikSurf(ph, l, cx) + 5;
  const duck = h.broken ? Math.min(1, h.breakT * 3.2) : 0, hg = (58 + Math.sin(ph.t * 3 + h.seed + l) * 3) * (1 - duck), r = 27;
  if (hg > 5) {
    ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(cx - r, base); ctx.bezierCurveTo(cx - r, base - hg * 1.3, cx + r, base - hg * 1.3, cx + r, base);
    tthVikSerpStroke(17);
    ctx.strokeStyle = CO.serpLt; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - r + 5, base); ctx.bezierCurveTo(cx - r + 5, base - hg * 1.3 + 8, cx + r - 5, base - hg * 1.3 + 8, cx + r - 5, base); ctx.stroke();
    ctx.fillStyle = CO.serpDk; for (const q of [-0.6, 0, 0.6]) { circle(cx + q * r * 0.9, base - hg * (0.98 - Math.abs(q) * 0.35) - 1, 3); ctx.fill(); }
    ctx.lineCap = 'round';
  }
  ctx.fillStyle = 'rgba(235,250,255,0.85)'; ctx.beginPath(); ctx.ellipse(cx - r, base + 1, 13, 4, 0, 0, Math.PI * 2); ctx.ellipse(cx + r, base + 1, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
}
// the tall hoop in the open lane: half 0 is the far side (behind the ship), half 1 the near side (in front of it)
function tthVikDrawHoop(ph, h, sx, half) {
  const CO = TTHVIK_COL, cx = sx + h.w / 2, base = tthVikSurf(ph, h.lane, cx), wig = h.wig > 0 ? Math.sin(h.wig * 18) * 9 * h.wig : 0;
  const ay = base - 182 + wig, fx = cx - 20, fy = base - 12, nx = cx + 22, ny = base + 13;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  if (half === 0) { ctx.moveTo(fx, fy); ctx.bezierCurveTo(fx - 12, base - 120, cx - 26, ay, cx + 1, ay); }
  else { ctx.moveTo(cx, ay); ctx.bezierCurveTo(cx + 28, ay, nx + 12, base - 110, nx, ny); }
  tthVikSerpStroke(half ? 17 : 14);
  ctx.lineCap = 'round';
  ctx.fillStyle = CO.serpDk;
  if (half === 0) { for (const q of [0.3, 0.55, 0.8]) { circle(fx - 9 * Math.sin(q * 3) + (cx - fx) * q * q, fy + (ay - fy) * (1 - (1 - q) * (1 - q)), 2.6); ctx.fill(); } }
  else {
    for (const q of [0.25, 0.5, 0.75]) { circle(cx + (nx - cx) * (1 - (1 - q) * (1 - q)) + 6 * Math.sin(q * 3), ay + (ny - ay) * q * q, 3); ctx.fill(); }
    // a gold star marks the way through
    const sy = base - 96 + Math.sin(ph.t * 4 + h.seed) * 5, k = h.thread ? 1 + h.wig : 0.85 + 0.15 * Math.sin(ph.t * 6);
    if (!h.broken) { ctx.save(); ctx.translate(cx + 1, sy); ctx.scale(k, k); ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); for (let q = 0; q < 10; q++) { const a = q * Math.PI / 5 - Math.PI / 2, r = q % 2 ? 5 : 11; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  }
  ctx.fillStyle = 'rgba(235,250,255,0.85)'; ctx.beginPath();
  if (half === 0) ctx.ellipse(fx, fy + 2, 11, 3.5, 0, 0, Math.PI * 2); else ctx.ellipse(nx, ny + 1, 14, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
}
// everything of lane l that the fog has given up; pass 0 before the ship, pass 1 after it (the near half of a hoop)
function tthVikDrawHaz(ph, l, pass) {
  for (let i = ph.hi; i < ph.haz.length; i++) {
    const h = ph.haz[i], sx = tthVikSx(ph, h.x);
    if (sx > W + 60) break;
    if (!h.seen || h.kind === 'jetmark' || sx < -120) continue;
    const inFog = sx > ph.vis + 30 && ph.fog > 0.5;
    if (inFog) { ctx.save(); ctx.globalAlpha = 0.86; }
    if (h.kind === 'berg') { if (pass === 0 && h.lane === l) tthVikDrawBerg(ph, h, sx); }
    else if (h.lane === l) tthVikDrawHoop(ph, h, sx, pass);
    else if (pass === 0) tthVikDrawCoil(ph, h, sx, l);
    if (inFog) ctx.restore();
    // "spotted from the mast": a gold ring pops over it
    if (pass === 1 && h.spot > 0 && (h.kind === 'berg' ? h.lane === l : l === 1)) {
      const y = tthVikLaneY(h.kind === 'berg' ? h.lane : 1) - (h.kind === 'berg' ? h.hh + 22 : 120), a = clamp(h.spot, 0, 1);
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 3; circle(sx + h.w / 2, y, 10 + (1 - a) * 16); ctx.stroke(); ctx.restore();
    }
  }
}

/* ---------- drawing: the longship, Pip and Bo, the raven ---------- */
function tthVikDrawOar(px, py, u, near) {
  const CO = TTHVIK_COL;
  let bx = px - 4, by = py + 22;
  if (u > 0) { if (u < 0.6) { const q = u / 0.6; bx = px + 30 - 62 * q; by = py + 30 + Math.sin(q * Math.PI) * 5; } else { const q = (u - 0.6) / 0.4; bx = px - 32 + 28 * q; by = py + 30 - Math.sin(q * Math.PI) * 16 - 8 * q; } }
  const hx = px + (px - bx) * 0.42, hy = py + (py - by) * 0.42;
  ctx.strokeStyle = C.ink; ctx.lineWidth = near ? 6 : 5; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(bx, by); ctx.stroke();
  ctx.strokeStyle = near ? CO.woodLt : CO.woodDk; ctx.lineWidth = near ? 3 : 2.5; ctx.stroke();
  ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.atan2(by - hy, bx - hx));
  ctx.fillStyle = near ? CO.woodLt : CO.woodDk; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(6, 0, 11, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function tthVikDrawBucket(x, y, rot, full) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.arc(0, -13, 8, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = '#c98b5a'; ctx.beginPath(); ctx.moveTo(-9, -13); ctx.lineTo(9, -13); ctx.lineTo(7, 0); ctx.lineTo(-7, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#8a8f9c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8.4, -8); ctx.lineTo(8.4, -8); ctx.stroke();
  if (full) { ctx.fillStyle = '#7fd0f7'; ctx.beginPath(); ctx.ellipse(0, -13, 8, 2.6, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function tthVikDrawRaven(x, y, t, caw) {
  ctx.save(); ctx.translate(x, y);
  if (caw) ctx.translate(0, -6 - Math.abs(Math.sin(t * 9)) * 6);
  ctx.fillStyle = '#23233a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  if (caw) { const f = Math.sin(t * 18) * 0.7; for (const d of [-1, 1]) { ctx.save(); ctx.rotate(d * (0.5 + f)); ctx.beginPath(); ctx.ellipse(-9 * d, -6, 10, 4.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); } }
  ctx.beginPath(); ctx.ellipse(0, -7, 8, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-15, -1); ctx.lineTo(-6, -9); ctx.closePath(); ctx.fill();   // tail
  circle(5, -14, 5.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f2b01e'; ctx.beginPath();
  if (caw) { ctx.moveTo(9, -16); ctx.lineTo(18, -19); ctx.lineTo(10, -14); ctx.lineTo(17, -10); ctx.lineTo(9, -12); } else { ctx.moveTo(9, -16); ctx.lineTo(18, -13); ctx.lineTo(9, -11); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; circle(6.5, -15, 1.8); ctx.fill();
  ctx.restore();
}
function tthVikDrawShip(st) {
  const ph = st.ph, K = TTHVIK, CO = TTHVIK_COL, t = ph.t, L = ph.L, row = ph.rower, look = 1 - row;
  const mx = K.mastX, dy = K.deckY, top = dy - K.mastH, yard = top + 16, sw = 54, u = ph.strokeA;
  ctx.save();
  ctx.translate(K.sternX + K.len / 2, ph.sy + (reduceMotion ? 0 : ph.kick * Math.sin(t * 46) * 3)); ctx.rotate(ph.rot); ctx.translate(-K.len / 2, 0);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // the far oar, the rigging, the mast
  tthVikDrawOar(70, -9, u, false);
  ctx.strokeStyle = CO.rope; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(mx, top + 6); ctx.lineTo(250, -50); ctx.moveTo(mx, top + 6); ctx.lineTo(-10, -56); ctx.stroke();
  ctx.fillStyle = CO.woodDk; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(mx - 3.5, top - 4, 7, K.mastH + 14, 3); ctx.fill(); ctx.stroke();
  // the sail: rolled up on the yard, or full of wind (a gust carries the ship at the buoys)
  const sh = 9 + ph.sail * 66, belly = ph.sail * (11 + Math.sin(t * 5) * 2.5);
  ctx.beginPath(); ctx.moveTo(mx - sw, yard); ctx.lineTo(mx + sw, yard); ctx.quadraticCurveTo(mx + sw + belly, yard + sh / 2, mx + sw - 2, yard + sh);
  ctx.quadraticCurveTo(mx + belly, yard + sh + 5 * ph.sail, mx - sw + 2, yard + sh); ctx.quadraticCurveTo(mx - sw + belly, yard + sh / 2, mx - sw, yard); ctx.closePath();
  ctx.fillStyle = CO.sailA; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = CO.sailB; for (let k = 0; k < 4; k++) ctx.fillRect(mx - sw + 7 + k * 28 + belly * 0.5, yard, 14, sh + 8); ctx.restore();
  ctx.stroke();
  ctx.fillStyle = CO.wood; rr(mx - sw - 7, yard - 4, sw * 2 + 14, 7, 3); ctx.fill(); ctx.stroke();
  if (!L.onMast && Math.abs(L.x - mx) < K.mastGrab && ph.k > 0 && ph.state !== 'won' && ph.state !== 'swap' && !(tthVikSolo(look))) {
    const ay = dy - 46 - Math.abs(Math.sin(t * 6)) * 7;
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(mx, ay - 12); ctx.lineTo(mx + 10, ay); ctx.lineTo(mx + 4, ay); ctx.lineTo(mx + 4, ay + 9); ctx.lineTo(mx - 4, ay + 9); ctx.lineTo(mx - 4, ay); ctx.lineTo(mx - 10, ay); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // the pennant
  ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(mx, top - 4); ctx.lineTo(mx - 22, top - 10 + Math.sin(t * 7) * 2); ctx.lineTo(mx, top - 16); ctx.closePath(); ctx.fill(); ctx.stroke();
  tthVikDrawRaven(mx - sw - 2, yard - 4, t, ph.caw && ph.fog > 0.5);
  // the far rail and the walkway
  ctx.fillStyle = CO.woodDk; ctx.beginPath(); ctx.moveTo(20, -10); ctx.quadraticCurveTo(125, -5, 232, -10); ctx.lineTo(238, -30); ctx.quadraticCurveTo(125, -23, 14, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = CO.woodLt; rr(24, dy, 206, 4, 2); ctx.fill();
  ctx.fillStyle = CO.wood; rr(K.benchX - 14, dy - 5, 28, 6, 2); ctx.fill(); ctx.stroke();
  // the drum (it thumps on the beat)
  { const k = 1 + ph.drumT * 1.3, x = 98; ctx.save(); ctx.translate(x, dy); ctx.scale(k, k);
    ctx.fillStyle = '#c0413a'; ctx.beginPath(); ctx.moveTo(-9, -13); ctx.lineTo(9, -13); ctx.lineTo(8, 0); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f6e7c0'; ctx.beginPath(); ctx.ellipse(0, -13, 9, 3.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(-3, -3); ctx.lineTo(2, -9); ctx.lineTo(7, -3); ctx.stroke();
    ctx.restore(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; }
  // the bucket: on deck by the bow, or in the lookout's hands
  const bail = L.scoopT > 0 && !L.onMast, far = Math.abs(L.x - K.bucketX) > K.bucketR || L.onMast;
  if (!bail) {
    if (ph.water > 0.55 && far && ph.state !== 'swap' && ph.state !== 'won') { ctx.save(); ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 9); ctx.strokeStyle = C.gold; ctx.lineWidth = 3; circle(K.bucketX, dy - 8, 17); ctx.stroke(); ctx.restore(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; }
    tthVikDrawBucket(K.bucketX, dy, 0, false);
  }
  // Pip and Bo
  const rs = tthVikSpot(ph, row), ls = tthVikSpot(ph, look);
  tthDrawHero(row, rs.x, rs.y, rs.air ? { face: -1, sy: 1.1, sx: 0.92 } : { face: 1, sy: 0.92, sx: 1.05, rot: u > 0 ? -Math.sin(u * Math.PI) * 0.24 : 0 });
  if (L.onMast) {
    const moving = L.h > 2 && L.h < tthVikMastTop() - 1, gr = L.grabT > 0 ? Math.sin(Math.min(1, (0.4 - L.grabT) / 0.3) * Math.PI) : 0;
    tthDrawHero(look, ls.x + (moving ? Math.sin(L.h * 0.22) * 1.5 : 0), ls.y - gr * 7, { face: 1, sy: 1 + gr * 0.22, sx: 1 - gr * 0.1 });
    if (gr > 0) { ctx.strokeStyle = PDARK[look]; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ls.x + 6, ls.y - 18); ctx.lineTo(ls.x + 9 + gr * 9, ls.y - 26 - gr * 16); ctx.stroke(); ctx.fillStyle = PCOL[look]; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(ls.x + 9 + gr * 9, ls.y - 26 - gr * 16, 4.5); ctx.fill(); ctx.stroke(); ctx.lineWidth = 2.5; }
  } else {
    const step = Math.abs(L.vx) > 20 ? Math.abs(Math.sin(t * 16)) * 2.5 : 0;
    tthDrawHero(look, ls.x, ls.y - step - (ls.air ? 0 : bail ? Math.sin(L.scoopT / 0.3 * Math.PI) * 4 : 0), { face: bail ? 1 : L.face, sy: ls.air ? 1.1 : 1 });
    if (bail) tthVikDrawBucket(L.x + 15, dy - 20 - Math.sin(L.scoopT / 0.3 * Math.PI) * 10, 0.4 + (0.3 - L.scoopT) * 4, L.scoopT > 0.15);
  }
  if (ph.state === 'won' && !st.cut) {
    const k = Math.min(1, ph.stT / 0.25), wy = ls.y - 44 - Math.sin(t * 6) * 2;
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff6c0'; circle(ls.x, wy, 24 + Math.sin(t * 9) * 3); ctx.fill(); ctx.restore();
    tthDrawLoot('sunstone', ls.x, wy, 0.5 + 0.6 * k, t);
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  // the crow's nest (in front of whoever stands in it)
  ctx.fillStyle = CO.wood; rr(mx - 9, top + 1, 30, 9, 3); ctx.fill(); ctx.stroke();
  // the water in the hull
  if (ph.water > 0.02) {
    const wl = -10 - ph.water * 24, amp = 1.2 + ph.water * 2.6;
    ctx.fillStyle = ph.swamped ? 'rgba(86,170,240,0.9)' : 'rgba(100,198,248,0.82)'; ctx.beginPath(); ctx.moveTo(22, -8);
    for (let x = 22; x <= 230; x += 16) ctx.lineTo(x, wl + Math.sin(ph.slosh * 3 + x * 0.09) * amp);
    ctx.lineTo(230, -8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(240,252,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 22; x <= 230; x += 16) ctx.lineTo(x, wl + Math.sin(ph.slosh * 3 + x * 0.09) * amp);
    ctx.stroke(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  }
  // the hull: stern curl, rail, dragon prow, keel
  ctx.fillStyle = CO.wood; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-11, -82); ctx.quadraticCurveTo(-4, -38, 22, -11); ctx.quadraticCurveTo(125, -5, 230, -11); ctx.quadraticCurveTo(250, -34, 254, -72);
  ctx.lineTo(266, -72); ctx.quadraticCurveTo(268, -20, 238, 7); ctx.quadraticCurveTo(125, 17, 12, 7); ctx.quadraticCurveTo(-18, -30, -22, -82); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = CO.woodDk; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(4, -6); ctx.quadraticCurveTo(125, 4, 248, -8); ctx.moveTo(8, 1); ctx.quadraticCurveTo(125, 11, 242, 0); ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.fillStyle = CO.wood; circle(-16, -88, 9); ctx.fill(); ctx.stroke(); ctx.fillStyle = CO.woodDk; circle(-15, -88, 3.5); ctx.fill();   // the stern curl
  // the dragon head
  ctx.fillStyle = CO.wood; ctx.beginPath(); ctx.moveTo(252, -70); ctx.quadraticCurveTo(250, -96, 266, -98); ctx.lineTo(288, -92); ctx.quadraticCurveTo(294, -86, 286, -82); ctx.lineTo(272, -80); ctx.lineTo(268, -70); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; circle(269, -90, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.ink; circle(270, -90, 1.8); ctx.fill();
  ctx.fillStyle = CO.sailB; ctx.beginPath(); ctx.moveTo(284, -83); ctx.quadraticCurveTo(296, -80, 293, -74); ctx.quadraticCurveTo(289, -79, 280, -80); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = CO.woodDk; ctx.beginPath(); ctx.moveTo(256, -94); ctx.lineTo(250, -108); ctx.lineTo(263, -98); ctx.closePath(); ctx.fill(); ctx.stroke();
  // shields along the rail
  let n = 0;
  for (const x of [42, 100, 128, 156, 184, 212]) {
    const y = -1 - Math.sin((x - 16) / 218 * Math.PI) * 4.5 + 4;
    ctx.fillStyle = CO.shields[n++ % 4]; circle(x, y - 3, 9.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#8a8f9c'; circle(x, y - 3, 3); ctx.fill();
  }
  // the near oar
  tthVikDrawOar(70, -6, u, true);
  // the sea laps over the keel; the bow wave and the wake
  const v = clamp(ph.v / 260, 0, 1);
  ctx.fillStyle = TTHVIK_COL.sea[clamp(Math.round(ph.lanePos), 0, 2)]; ctx.beginPath(); ctx.moveTo(-34, 4);
  for (let x = -34; x <= 286; x += 20) ctx.lineTo(x, 4 + Math.sin(x * 0.07 + t * 6) * 1.6);
  ctx.lineTo(286, 20); ctx.lineTo(-34, 20); ctx.closePath(); ctx.fill();
  if (ph.clear > 0) { ctx.fillStyle = 'rgba(110,215,245,' + tthVikEase(clamp(ph.clear, 0, 1)) * 0.3 + ')'; ctx.fill(); }
  ctx.strokeStyle = 'rgba(240,252,255,0.9)'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let x = -34; x <= 286; x += 20) ctx.lineTo(x, 4 + Math.sin(x * 0.07 + t * 6) * 1.6);
  ctx.stroke();
  if (v > 0.1) {
    ctx.fillStyle = 'rgba(240,252,255,' + (0.5 + 0.4 * v) + ')';
    ctx.beginPath(); ctx.moveTo(240, 6); ctx.quadraticCurveTo(262, -8 - v * 14, 276 + v * 10, 2 - v * 6); ctx.quadraticCurveTo(268, 4, 262, 8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-22 - v * 14, 7, 18 + v * 16, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
// the Thief's rain cloud
function tthVikDrawRain(ph) {
  const r = ph.rain, t = ph.t;
  if (!r) return;
  const a = r.state === 'out' ? clamp(1 - r.t / TTHVIK.rain.out, 0, 1) : r.state === 'in' ? clamp(r.t / 0.3, 0, 1) : 1;
  ctx.save(); ctx.globalAlpha = a;
  if (r.state === 'on') {
    const y1 = ph.sy - 14;
    ctx.strokeStyle = 'rgba(150,215,255,0.9)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
    for (let k = 0; k < 14; k++) { const x = r.x - 62 + k * 9.5 + Math.sin(k * 7) * 4, u = (t * 2.6 + k * 0.37) % 1, y = r.y + 20 + u * (y1 - r.y - 20); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 15); }
    ctx.stroke();
  }
  ctx.translate(r.x, r.y + Math.sin(t * 5) * 2);
  ctx.fillStyle = '#4d5b7c'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(-44, 6, 20, 0, 7); ctx.arc(-18, -10, 26, 0, 7); ctx.arc(18, -12, 28, 0, 7); ctx.arc(46, 5, 21, 0, 7); ctx.rect(-44, 4, 90, 22); ctx.fill();
  ctx.beginPath(); ctx.arc(-44, 6, 20, Math.PI * 0.5, Math.PI * 1.35); ctx.arc(-18, -10, 26, Math.PI * 1.1, Math.PI * 1.72); ctx.arc(18, -12, 28, Math.PI * 1.32, Math.PI * 1.92); ctx.arc(46, 5, 21, Math.PI * 1.6, Math.PI * 0.5); ctx.closePath(); ctx.stroke();
  for (const ex of [-12, 12]) { ctx.fillStyle = '#ffffff'; circle(ex, 0, 6); ctx.fill(); ctx.fillStyle = C.ink; circle(ex, 2, 2.6); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-20, -9); ctx.lineTo(-6, -5); ctx.moveTo(20, -9); ctx.lineTo(6, -5); ctx.stroke();
  ctx.fillStyle = '#2a2f4f'; ctx.beginPath(); ctx.ellipse(0, 13, 5, r.state === 'on' ? 5 : 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function tthVikDraw(st) {
  const ph = st.ph, shipL = clamp(Math.round(ph.lanePos), 0, 2);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (let l = 0; l < 3; l++) {
    tthVikDrawHaz(ph, l, 0);
    if (l === shipL) tthVikDrawShip(st);
    tthVikDrawHaz(ph, l, 1);
  }
  // near marker buoys
  for (let k = 0; k < 2; k++) { const sx = tthVikSx(ph, ph.marks[k]); if (sx > -60 && sx < W + 60) tthVikDrawBuoy(sx + 30, H - 22 + Math.sin(ph.t * 2 + k + 2) * 3, 1.05, ph.t); }
  tthVikDrawRain(ph);
}
function tthVikDrawTop(st) {
  const ph = st.ph, K = TTHVIK, t = ph.t, j = ph.jet, F = ph.fin;
  // fog wisps drift over everything in the fog
  if (ph.fog > 0.05) {
    ctx.fillStyle = 'rgba(' + TTHVIK_COL.fog + ',' + 0.16 * ph.fog + ')';
    for (let k = 0; k < 5; k++) {
      const x = Math.max(ph.vis - 40, 0) + ((k * 197 + t * (14 + k * 3)) % 520), y = 300 + (k * 53) % 190;
      if (x < W + 100) { ctx.beginPath(); ctx.ellipse(x, y, 90 + (k % 3) * 30, 15 + (k % 2) * 6, 0, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // a jet wave is coming down this lane: "!" and arrows
  if (j && j.state === 'aim') {
    const y = tthVikLaneY(j.lane), on = Math.sin(t * 16) > -0.2, x1 = W - 150;
    ctx.save(); ctx.globalAlpha = on ? 0.95 : 0.45;
    ctx.fillStyle = 'rgba(255,95,109,0.2)'; rr(tthVikBow() + 16, y - 30, x1 - tthVikBow() - 20, 40, 16); ctx.fill();
    ctx.strokeStyle = '#ff5f6d'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let x = x1 - 40 - (t * 220) % 70; x > tthVikBow() + 40; x -= 70) { ctx.beginPath(); ctx.moveTo(x + 12, y - 22); ctx.lineTo(x, y - 10); ctx.lineTo(x + 12, y + 2); ctx.stroke(); }
    ctx.restore();
    bigText('!', x1, y - 16 - Math.abs(Math.sin(t * 12)) * 5, tthBig() ? 44 : 36, '#ff5f6d', 1);
  }
  // the sunstone: a ring shows when the lookout can reach it
  if (F && ph.state === 'finale') {
    const s = tthVikStone(st);
    if (F.reach) { ctx.strokeStyle = C.gold; ctx.lineWidth = 4; circle(s.x, s.y, 22 + Math.sin(t * 20) * 3); ctx.stroke(); }
    else if (F.wave && !F.wave.got && F.tease <= 0) { ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]); circle(s.x, s.y, K.fin.reach); ctx.stroke(); ctx.restore(); }
  }
}

/* ---------- the HUD: the beat track and the water gauge (bottom left, under the ship) ---------- */
function tthVikHud(st) {
  const ph = st.ph, K = TTHVIK, big = tthBig(), z = big ? 1.36 : 1, row = ph.rower, look = 1 - row;
  if (G.introT > 0 || ph.state === 'won' || st.cut || st.idle) return;
  // the beat: notes slide left into the ring; press on the ring
  const h = Math.round(42 * z), w = Math.round(236 * z), x0 = 12, y0 = H - 10 - h, cy = y0 + h / 2, ringX = x0 + h / 2 + 2, pps = 150 * z, r = 9 * z;
  ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(x0, y0, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = PCOL[row]; ctx.lineWidth = 2.5; rr(x0, y0, w, h, h / 2); ctx.stroke();
  ctx.save(); rr(x0 + 2, y0 + 2, w - 4, h - 4, h / 2 - 2); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ringX, cy); ctx.lineTo(x0 + w, cy); ctx.stroke();
  const n0 = Math.floor(ph.beatT / ph.P);
  for (let n = n0; n <= n0 + 4; n++) {
    const dtb = n * ph.P - ph.beatT, x = ringX + dtb * pps;
    if (dtb < -0.14 || n < 1) continue;
    if (x > x0 + w + r) break;
    const used = n <= ph.claim;
    ctx.fillStyle = used ? 'rgba(255,255,255,0.22)' : C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(x, cy, used ? r * 0.7 : r); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  const pulse = 1 + ph.drumT * 1.4;
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * z; circle(ringX, cy, (r + 4 * z) * pulse); ctx.stroke();
  ctx.strokeStyle = PCOL[row]; ctx.lineWidth = 1.5 * z; circle(ringX, cy, (r + 4 * z) * pulse + 3 * z); ctx.stroke();
  if (ph.fb) { const k = ph.fb.t; ctx.save(); ctx.globalAlpha = clamp((0.7 - k) / 0.25, 0, 1); bigText(ph.fb.text, x0 + 20 + tthVikTextHalf(ph.fb.text, 17 * z), y0 - 13 * z - k * 12, 17 * z, ph.fb.col, 0.8 + 0.3 * Math.min(1, k / 0.08)); ctx.restore(); }
  // the water in the hull
  const gh = Math.round(30 * z), gw = Math.round(176 * z), gx = x0 + w + 10, gy = H - 10 - gh, bx = gx + gh + 2, bw = gw - gh - 12, bh = gh - 14, wv = clamp(ph.water, 0, 1);
  const hot = ph.swamped || wv > 0.8, blink = hot && Math.sin(G.clock * 14) > 0;
  ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(gx, gy, gw, gh, gh / 2); ctx.fill();
  ctx.strokeStyle = blink ? '#ff5f6d' : PCOL[look]; ctx.lineWidth = 2.5; rr(gx, gy, gw, gh, gh / 2); ctx.stroke();
  ctx.save(); ctx.translate(gx + gh / 2 + 2, gy + gh - 7); ctx.scale(z * 0.8, z * 0.8); tthVikDrawBucket(0, 0, 0, wv > 0.3); ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; rr(bx, gy + 7, bw, bh, bh / 2); ctx.fill();
  if (wv > 0.02) { ctx.fillStyle = ph.swamped ? '#ff5f6d' : wv > 0.8 ? '#ff9a4a' : wv > K.slowFrom ? '#59b7ff' : '#7fe0ff'; rr(bx, gy + 7, Math.max(bh, bw * wv), bh, bh / 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(bx + bw * K.slowFrom - 1, gy + 5, 2, bh + 4);
  if (ph.swamped) text('Swamped! Bail!', bx + bw / 2, gy + gh / 2 + 0.5, 12 * z, '#ffffff', 'center', 'body');
  else if (wv > K.slowFrom + 0.04) text('Heavy: slow', bx + bw / 2, gy + gh / 2 + 0.5, 11 * z, 'rgba(255,255,255,0.92)', 'center', 'body');
}
function tthVikTextHalf(str, px) { ctx.font = tthLilita(px); return ctx.measureText(str).width / 2; }

/* ---------- sounds ---------- */
Sfx.extra.tthVikDrum = function () { this.tone(118, 0.16, 'sine', 0.11, 52); this.tone(240, 0.04, 'triangle', 0.035, 120); };
Sfx.extra.tthVikStroke = function (p) { this.tone(300 * p, 0.14, 'triangle', 0.045, 150 * p); this.tone(900, 0.1, 'sine', 0.014, 420, 0.03); };
Sfx.extra.tthVikWeak = function (p) { this.tone(190 * p, 0.07, 'square', 0.018, 150 * p); };
Sfx.extra.tthVikSteer = function (p) { this.tone(340 * p, 0.12, 'sine', 0.035, 520 * p); };
Sfx.extra.tthVikScoop = function (p) { this.tone(260 * p, 0.09, 'sine', 0.04, 560 * p); this.tone(700, 0.12, 'sine', 0.02, 300, 0.08); };
Sfx.extra.tthVikGrip = function (p) { this.tone(430 * p, 0.035, 'square', 0.014); };
Sfx.extra.tthVikSwipe = function (p) { this.tone(520 * p, 0.1, 'triangle', 0.03, 980 * p); };
Sfx.extra.tthVikYoink = function () { this.tone(520, 0.08, 'square', 0.045, 1040); [988, 1319, 1568].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, 0.07 + i * 0.06)); };
Sfx.extra.tthVikSplash = function () { this.tone(520, 0.3, 'sawtooth', 0.03, 90); this.tone(1200, 0.22, 'triangle', 0.025, 240, 0.02); };
Sfx.extra.tthVikThunder = function () { this.tone(74, 0.7, 'sawtooth', 0.022, 34); this.tone(52, 0.9, 'triangle', 0.03, 30, 0.12); };
Sfx.extra.tthVikRain = function () { for (let k = 0; k < 5; k++) this.tone(1500 + Math.random() * 1400, 0.04, 'triangle', 0.009, null, k * 0.16 + Math.random() * 0.05); };
Sfx.extra.tthVikRev = function () { this.tone(160, 0.9, 'sawtooth', 0.03, 620); };
Sfx.extra.tthVikJet = function () { this.tone(700, 0.5, 'sawtooth', 0.04, 110); this.tone(90, 0.5, 'triangle', 0.05, 50); };
Sfx.extra.tthVikCrunch = function () { this.tone(180, 0.2, 'sawtooth', 0.06, 60); for (let k = 0; k < 4; k++) this.tone(1600 + Math.random() * 1600, 0.06, 'triangle', 0.03, null, 0.03 + k * 0.045); };
Sfx.extra.tthVikThread = function () { [784, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, i * 0.05)); };
Sfx.extra.tthVikSpot = function (p) { this.tone(1175 * p, 0.07, 'triangle', 0.04); this.tone(1568 * p, 0.12, 'triangle', 0.04, null, 0.07); };
Sfx.extra.tthVikCaw = function () { this.tone(620, 0.16, 'sawtooth', 0.03, 430); this.tone(600, 0.18, 'sawtooth', 0.03, 400, 0.22); };
Sfx.extra.tthVikHorn = function () { this.tone(147, 0.9, 'sawtooth', 0.035, 150); this.tone(220, 0.9, 'triangle', 0.045, 222, 0.04); };
Sfx.extra.tthVikRumble = function () { this.tone(60, 1.2, 'triangle', 0.06, 110); this.tone(45, 1.2, 'sawtooth', 0.02, 80); };
Sfx.extra.tthVikWhoosh = function () { this.tone(220, 0.6, 'sine', 0.04, 660); };
Sfx.extra.tthVikHiss = function () { this.tone(2400, 0.3, 'triangle', 0.012, 1800); this.tone(520, 0.2, 'sine', 0.03, 780, 0.1); };

/* ---------- the room (this file fills in its own room of the level def) ---------- */
tthRoom('vikings', {
  jobs: {
    rower: { title: 'Rower', act: 'row', legend: '<kbd>W</kbd><kbd>S</kbd> steer the ship',
      howTo: ['Press row on the drum beat. Mashing only splashes.'] },
    lookout: { title: 'Lookout', act: ['bail', 'grab'], legend: '<kbd>A</kbd><kbd>D</kbd> walk <kbd>W</kbd><kbd>S</kbd> climb the mast',
      howTo: ['Hold bail at the bucket. Climb the mast to see through the fog.'] },
  },
  act: { label: 'row', labels: ['row', 'bail'] },
  tip: 'Rower: press on the drum beat and steer. Lookout: bail at the bucket and climb the mast to see through the fog.',
  legend: { pip: '<kbd>W</kbd><kbd>S</kbd> steer the ship', bo: '<kbd>←</kbd><kbd>→</kbd> walk <kbd>↑</kbd><kbd>↓</kbd> mast',
    pad: 'stick: steer the ship (rower), walk and climb the mast (lookout),' },
  map: TTH_EMPTY_MAP,
});

/* ---------- the phase ---------- */
TTH_PHASES.vikings = {
  setup(st, L) {
    const K = TTHVIK, ph = st.ph, c = st.thief, first = L.def.first ? 1 : 0, course = tthVikCourse();
    Object.assign(ph, {
      t: 0, state: 'sail', stT: 0, k: 0, rower: first, L: tthVikNewLookout(K.bucketX - 10), seat: null,
      dist: 0, floor: 0, v: 0, lane: 1, laneFrom: 1, lanePos: 1, laneK: 1, steerDir: 0, steerT: 0, steerLock: true,
      P: K.beat[0], beatT: 0, claim: 0, combo: 0, drumT: 0, strokeA: 0, strokeQ: '', strokeN: 0, lastOff: 0, lastQ: '', lastStrokeT: 0, fb: null, rowLog: [[], []],
      water: 0.12, swamped: false, swampN: 0, slosh: 0, crashN: 0,
      gold: { drum: [0, 0], lantern: false, bucket: false },
      haz: course.haz, marks: course.marks, heads: course.heads, hi: 0, humps: [], vis: tthVikBow() + K.near, caw: false, cawT: 0, cawSfx: 0, cawNews: false, spotT: 0,
      evT: K.ev[0].first, evI: 0, rain: null, rainN: 0, jet: null, jetN: 0, jetDue: false, fin: null, winner: -1, shore: null,
      sy: K.laneY[1], rot: 0, kick: 0, fog: 1, fogTo: 1, clear: 0, clearTo: 0, sail: 0, sailTo: 0, swell: 1, swellTo: 1, flash: 0, boltT: 3.5, boltN: 0, boltX: 300,
      tips: {}, met: {}, coachT: 1.5, hello: false, legT0: 0, tauntT: 16, tauntN: 0,
    });
    Object.assign(tthStats(st), { strokes: 0, perfect: 0, good: 0, weak: 0, scoops: 0, spotted: 0, threads: 0, crashes: 0, splashes: 0, swamps: 0, grabs: 0, waves: 0, legs: [], gold: [] });
    Object.assign(c, { x: K.thief.x, y: K.thief.y, s: K.thief.s, face: -1, pose: 'idle', jet: true, item: st.era.loot, claw: 0.3 });
    st.cam = { x: 0, y: 0 };
    tthVikPose(ph, 1); tthVikPlace(st);
  },
  step(st, dt) {
    const ph = st.ph, K = TTHVIK, ps = G.players;
    if (st.idle) { tthVikCoast(st, dt); return; }
    ph.t += dt;
    if (!ph.hello && ph.t > 0.3) {
      ph.hello = true;
      st.thief.pose = 'laugh'; tthSay(st, 'No sunstone, no sun! Enjoy the fog!', 2.6);
      tthNews(st, 'Year 1000: Leif Erikson\'s crew rows west to find a new land, Vinland!', false, 5);
      tthVikJobTips(st);
    }
    if (ph.hello && st.thief.pose === 'laugh' && !st.say) st.thief.pose = 'idle';
    tthVikBeat(st, dt);
    if (ph.seat && (ph.seat.t += dt / K.seatT) >= 1) ph.seat = null;
    const n0 = ph.strokeN;
    tthVikRower(st, ps[ph.rower], dt);
    if (ph.strokeN !== n0) ph.lastStrokeT = ph.t;
    if (ph.state === 'won') ps[1 - ph.rower].pendingAct = false; else tthVikLookout(st, ps[1 - ph.rower], dt);
    // (the computer rower has its own "the person is away" clock, cpu-core's CPU.idle: a watching lookout is not away)
    if (tthVikWatching(ph) && typeof CPU === 'object' && typeof cpuOn === 'function' && !cpuOn(1 - ph.rower)) CPU.idle[1 - ph.rower] = 0;
    tthVikSail(st, dt);
    tthVikEvents(st, dt);
    tthVikHazards(st, dt);
    tthVikFlow(st, dt);
    tthVikCoach(st, dt);
    // a taunt now and then
    if (ph.state === 'sail' && !st.say && !tthCalm(st) && !ph.rain && !ph.jet && (ph.tauntT -= dt) <= 0) { ph.tauntT = 15; tthSay(st, TTHVIK_TAUNTS[ph.tauntN++ % TTHVIK_TAUNTS.length], 2.2); }
    tthVikThief(st, dt); tthVikAmbient(st, dt);
    tthVikPose(ph, dt); tthVikPlace(st);
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
  },
  coast(st, dt) { tthVikCoast(st, dt); },
  hide: () => true,
  present(st, p) { const ph = st.ph; return p.id !== ph.rower && tthVikWatching(ph); },
  labels(st) { const ph = st.ph, a = 'row', b = ph.fin ? 'grab' : 'bail'; return ph.rower === 0 ? [a, b] : [b, a]; },
  jobKeys(st) { return st.ph.rower === 1 ? ['lookout', 'rower'] : ['rower', 'lookout']; },
  roles(st) { const ph = st.ph, a = 'Row!', b = ph.fin ? 'Grab it!' : ph.k === 0 ? 'Bail!' : 'Lookout!'; return ph.rower === 0 ? [a, b] : [b, a]; },
  legend(st) {
    const r = st.ph.rower;
    const row = (u, d) => `<kbd>${u}</kbd><kbd>${d}</kbd> steer the ship`, look = (l, r2, u, d) => `<kbd>${l}</kbd><kbd>${r2}</kbd> walk <kbd>${u}</kbd><kbd>${d}</kbd> mast`;
    return { pip: r === 0 ? row('W', 'S') : look('A', 'D', 'W', 'S'), bo: r === 1 ? row('↑', '↓') : look('←', '→', '↑', '↓'),
      pad: 'stick: steer the ship (rower), walk and climb the mast (lookout),' };
  },
  hudText(st) {
    const ph = st.ph;
    if (ph.fin) return 'Grab ' + ph.fin.grabs + '/' + TTHVIK.fin.grabs;
    return 'Vinland ' + Math.floor(clamp(ph.dist / ph.marks[2], 0, 1) * 100) + '%';
  },
  progress(st) { const ph = st.ph; return { n: Math.min(ph.k, 3) + (ph.fin ? ph.fin.grabs : 0), of: 6 }; },
  headLift(st, p) { const ph = st.ph; return ph.state === 'won' && p.id === ph.winner ? 40 : 0; },
  drawBack(st) { tthVikDrawBack(st); },
  draw(st) { tthVikDraw(st); },
  drawTop(st) { tthVikDrawTop(st); },
  hud(st) { tthVikHud(st); },
};
