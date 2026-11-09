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
              juggle. The ship's raven caws (and flaps) whenever something unseen is close in the fog.
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
                       lane change always fits). From the deck the fog shows 200 px ahead of the bow (about 0.9 s);
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
     Gold lantern   3 crashes (icebergs or coils) in one stretch: the deck sees 340 px into the fog.
     Gold bucket    swamped twice: every scoop bails double.
     Golden wave    2 big waves missed: the waves roll slower, lift a slow ship too and the Thief stops pulling away.
   FAIRNESS: every hazard is telegraphed 0.85 s or more (fog reveal at top speed), usually much longer (the raven,
   the Thief's "!" for jet waves, the cloud flying in, big waves seen from the right edge). No hazard starts in a calm
   moment (tthCalm: cards, cutscenes, celebrations, the idle wait); while the Thief waits for an away person the ship
   drifts to a stop and the hull does not fill. Jet waves never start with a row or loop close ahead.
   CONTROLS: the rower needs the action (one press per beat, about 1.4 a second) and up / down; the lookout needs
   left / right, up / down and the action (3 scoops a second at most; holding works). "Up" is tthUp(p) (jump or stick
   up). Hints name each player's own keys (tthKey); in 1-player mode the computer's hints say what it does.
   HISTORY (news line and taunts): Leif Erikson's crew reached North America (Vinland) around the year 1000, about
   500 years before Columbus; longships had both oars and a sail; Vikings told tales of a giant sea serpent and took
   ravens to sea to help find land.
   TUNING (bots, tools/w30/play.js vikings): a computer pair takes about 2:10-2:30; see GAME_NOTES.
   Stats (st.stats.vikings): strokes, perfect, good, weak, scoops, spotted, threads, crashes, splashes, swamps, grabs,
   waves, legs [s per stretch]. Every top-level name starts with tthVik / TTHVIK (Sfx.extra.tthVik*); all state is in
   st.ph (fresh every phase start); gameplay randomness only through tthRand(). */
const TTHVIK = {
  // the ship. Local coords: origin at the stern on the waterline, x toward the bow, y up is negative.
  sternX: 180, len: 250, benchX: 62, mastX: 132, bucketX: 198, deckY: -22, mastH: 108, deckX0: 30, deckX1: 224,
  walkV: 175, climbV: 150, slideV: 290, mastGrab: 15, hitBack: 26, hitFront: 6,
  laneY: [335, 400, 465], laneT: 0.3, laneRepeat: 0.5,
  // rowing: the beat per stretch (the last one is the grab), timing windows (s), stroke power
  beat: [0.8, 0.72, 0.66, 0.66], perfect: 0.085, good: [0.19, 0.3, 9], imp: 150, drag: 0.9, vMax: 340,
  pow: { perfect: 1, good: 0.74, weak: 0.14, mash: 0.04 }, comboK: 0.015, comboMax: 8, strokeT: 0.42,
  goldLog: 8, goldBad: 6,
  // water in the hull (0..1)
  seep: [0.045, 0.034, 0.036, 0.03], rainFill: 0.075, scoop: 0.075, scoopCd: 0.34, scoopHold: 0.42, bucketR: 30,
  slowFrom: 0.3, slowK: 0.55, afloat: 0.55,
  // fog: how far past the bow the deck sees, the mast top sees, and the raven hears
  near: 200, nearGold: 340, far: 900, cawAhead: 980,
  // the course (px of sea): stretch 1, then generated packs of iceberg rows and serpent passes
  len1: 5600, lead: 820, tail: 620, rowGap: [450, 490], packGap: [900, 1000], packs2: [2, 3, 3, 4], packs3: [3, 4, 4],
  bergW: [62, 82], gateW: 46,
  swapT: 2.6, gustV: 165, seatT: 0.7,
  // the Thief's mischief per stretch: R rain cloud, J jet wave
  ev: [{ first: 5, every: 6.4, pat: 'RJRJJ' }, { first: 9, every: 14, pat: 'R' }, { first: 8, every: 12, pat: 'R' }],
  rain: { in: 1.0, on: 4.6, out: 0.8 },
  jet: { aim: 1.15, blast: 0.45, v: 330, h: 44, hw: 74, water: 0.22, slow: 0.35, clear: 620 },
  crash: { back: -140, water: 0.1 },
  thief: { x: 836, y: 236, s: 0.7 },
  // the grab
  fin: { intro: 2.6, thiefY: 222, s: 0.62, waveH: 80, ramp: 190, plat: 130, v: 250, goldV: 175, from: W + 330, gap: 0.7, need: 0.45, breakH: 26,
    reach: 27, tease: 1.4, grabs: 3, water: 0.06, breakWater: 0.16, wonT: 1.9 },
  goldCrash: 3, goldSwamp: 2, goldWave: 2,
};
const TTHVIK_TAUNTS = ['Lost in the fog? Hee hee!', 'Leif who? Finders keepers!', 'Row, row, row! You\'ll never catch me!', 'Splish, splash! Ha!'];
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
    if (pi < K.packs3.length - 1) haz.push({ kind: 'jetmark', x: last + 300, lane: 0, w: 1, k: 2, seen: true, done: false });
    x = last + rnd(K.packGap[0], K.packGap[1]);
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
  for (let i = 0; i < n; i++) G.particles.push({ x: x + (Math.random() - 0.5) * 30, y, vx: (Math.random() - 0.5) * 220, vy: -up * (0.4 + Math.random() * 0.6), life: 0.55, max: 0.55, col, size: 3 + Math.random() * 3, grav: 900, kind: 'dot' });
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
  if (L.onMast) {
    if (up && !dn) { if (L.h < top) { L.h = Math.min(top, L.h + K.climbV * dt); if ((L.gripT -= dt) <= 0) { L.gripT = 0.16; Sfx.play('tthVikGrip', p.id); } } }
    else if (dn && !up) L.h -= K.slideV * dt;
    if (L.h <= 0) { L.h = 0; L.onMast = false; }
    else if (mv && L.h < 16) { L.h = 0; L.onMast = false; }
    else if (mv) tthVikTip(st, p.id, 'slide', 'Slide down first: ' + tthKey(p.id, 'down'), null, 5);
  }
  if (!L.onMast) {
    L.vx = approach(L.vx, mv * K.walkV, 1900 * dt);
    L.x = clamp(L.x + L.vx * dt, K.deckX0, K.deckX1);
    if (mv) L.face = mv;
    if (up && !dn) {
      if (Math.abs(L.x - K.mastX) < K.mastGrab) { L.onMast = true; L.x = K.mastX; L.vx = 0; L.h = 1; L.face = 1; L.gripT = 0; }
      else tthVikTip(st, p.id, 'where', 'The mast is in the middle of the ship', null, 6);
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
    if (!F.gold) { F.tease = KF.tease; c.pose = 'laugh'; tthSay(st, 'Nope! Too soon!', 1.3); }
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
    ph.water += (K.seep[ph.k] + (ph.rain && ph.rain.state === 'on' ? K.rainFill : 0)) * dt;
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
  tthVikTip(st, ph.rower, 'steer', 'Steer out of his lane: ' + tthKey(ph.rower, 'up') + ' or ' + tthKey(ph.rower, 'down'), 'I steer away!', 14, { force: true });
}
// true when no row or loop is close ahead (a jet wave would be unfair there)
function tthVikOpenSea(ph) {
  for (let i = ph.hi; i < ph.haz.length; i++) {
    const h = ph.haz[i];
    if (h.x - ph.dist > TTHVIK.jet.clear) break;
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
    const over = tthVikPt(ph, K.mastX, K.deckY - K.mastH - 46), ty = clamp(over.y, 118, 250), k = Math.min(1, dt * (r.state === 'in' ? 4 : 8));
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
    tx = K.sternX + K.mastX + 7 + 14 + 16 * K.fin.s; ty = K.fin.thiefY + Math.sin(t * 1.7) * 2; s = K.fin.s; claw = 0.6; k = 3;
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
    tthHelp(st, 'Gold lantern: the deck sees farther into the fog!', { id: ph.rower, hint: 'Gold lantern! Steer early: ' + tthKey(ph.rower, 'up') + ' ' + tthKey(ph.rower, 'down') });
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
    if (!h.seen) {
      if (sx <= ph.vis) { h.seen = true; if (mk > 0.2 && sx > near + 40) { h.spot = 1; spot++; } }
      else if (sx < bow + K.cawAhead) caw = true;
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
    if (!ph.cawNews) { ph.cawNews = true; tthNews(st, 'The raven caws: something is in the fog! Lookout, up the mast!', false, 4.5); }
  }
}

/* ---------- the buoys (jobs swap), the grab, the win ---------- */
const tthVikNewLookout = x => ({ x, vx: 0, h: 0, onMast: false, face: 1, cd: 0, scoopT: 0, grabT: 0, gripT: 0 });
function tthVikLeg(st) { const ph = st.ph; tthStats(st).legs.push(Math.round((st.phT - ph.legT0) * 10) / 10); ph.legT0 = st.phT; }
function tthVikJobTips(st) {
  const ph = st.ph, row = ph.rower, look = 1 - row;
  tthVikTip(st, row, 'job', 'Row: press ' + tthKey(row, 'act') + ' on the drum beat. Steer: ' + tthKey(row, 'up') + ' ' + tthKey(row, 'down'), 'I row on the beat and steer!', 2, { force: true, life: 4.5 });
  tthVikTip(st, look, 'job', ph.k === 0 ? 'Bail at the bucket: ' + tthKey(look, 'act') : 'Bail: ' + tthKey(look, 'act') + ' at the bucket. Climb the mast: ' + tthKey(look, 'up'), ph.k === 0 ? 'I bail the water out!' : 'I bail and watch from the mast!', 2, { force: true, life: 4.5 });
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
  tthNews(st, ph.k === 1 ? 'A gust fills the sail! Longships had both oars AND a sail.' : 'Vikings told tales of a giant sea serpent...', false, 4.4);
}
function tthVikSwapDone(st) {
  const ph = st.ph;
  ph.state = 'sail'; ph.stT = 0; ph.sailTo = 0;
  tthSay(st, ph.k === 1 ? 'Icebergs ahead! Mind the bumps!' : 'Meet my wiggly friend! Hee hee!', 2.4);
  tthVikJobTips(st);
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
  tthVikTip(st, row, 'fin', 'Keep the beat: row up the big waves!', 'I row us up the waves!', 2, { force: true, life: 4.5 });
  tthVikTip(st, look, 'fin', 'Climb to the mast top. On the wave top grab: ' + tthKey(look, 'act'), 'I grab it from the mast top!', 2, { force: true, life: 4.5 });
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
    ph.water = Math.min(0.97, ph.water + KF.water);
    if (!w.got) {
      F.fails++;
      if (F.fails >= K.goldWave && !F.gold) {
        F.gold = true; S.gold.push('wave');
        tthHelp(st, 'Golden waves: they roll slower, and he can\'t pull the stone away!', { id: look, hint: 'On the wave top, grab: ' + tthKey(look, 'act') });
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
  tthNews(st, 'The sunstone! The fog lifts... Land ho! Vinland!', true, 3.4);
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
    if (ph.stT >= K.fin.wonT) tthPhaseDone(st, { say: 'Bah! Keep it! Columbus is 500 years late anyway!', portal: { x: 742, y: 214 } });
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
  tthVikThief(st, dt); tthVikAmbient(st, dt); tthVikPose(ph, dt); tthVikPlace(st);
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
}

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
      tips: {}, coachT: 1.5, hello: false, legT0: 0, tauntT: 16, tauntN: 0,
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
  labels(st) { const ph = st.ph, a = 'row', b = ph.fin ? 'grab' : 'bail'; return ph.rower === 0 ? [a, b] : [b, a]; },
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
