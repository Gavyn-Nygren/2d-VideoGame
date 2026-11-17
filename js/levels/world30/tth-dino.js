/* Pip & Bo - Level 30-1 The Time Thief: era 'dino' (Dinosaur Asteroid, 66 million years ago). */
'use strict';

/* ===== 30-1 era 1: Dinosaur Asteroid (TTH_PHASES.dino) — Gavyn's pick =====
   "He's stealing a T. rex egg. Run from the fire and meteors while one carries the egg and the other clears the path."
   A side-scrolling run to the right through a fern jungle that turns into a swamp and then a volcano's slope, with the
   asteroid growing in the sky all era long. The Thief has the egg on his claw; a meteor startles him and he drops it
   ("YIKES! My egg!"); Pip and Bo carry it home to the mother T. rex's nest at the far end. About 2:15 for the computer
   pair, 2-3 minutes for a good pair of people.
   - The ground is a height map (one height every 4 px, from 20-1's Slope Climb), not the engine grid: gentle slopes,
     64 px ledges, pits. The era runs its own collision (tthDinoBody). Pip and Bo pass through each other here.
   - THE EGG decides the jobs: whoever holds it is the CARRIER, the other one is the CLEARER. It is held over the head.
     It changes hands by a TOSS (the carrier's action, when the partner is within 240 px sideways and 175 px up or
     down, and the carrier looks at them; it always lands in the partner's hands), and it is tossed to the other one
     at each of the 2 checkpoint flags ("Swap jobs!"), so both players do both jobs. The room's `first` says who
     catches it at the start. A loose egg (after a bonk) rolls back a little, wobbles and glows; whoever walks into
     it picks it up. It never breaks, never rolls into a pit, and hops ahead by itself if the fire reaches it.
   - CARRIER: slower (150 px/s; free: 220) and small hops only (40 px; free: 109 px). Action = toss. Hold DOWN to
     duck and hug the egg (planted) when the Thief dives. Can NOT smash, pull or pass a ledge / pit with the egg.
   - CLEARER: runs ahead with a bone club. The action does what is right here (the word on the touch button follows:
     smash / shoo / pull / whack): TAP it next to a boulder (4 hits), a fallen log (3), a meteor rock (2) or a napping
     baby Triceratops (1: "Shoo!", it trots off after the herd); HOLD it at the glowing post of a vine bridge to pull
     the bridge tight while the carrier walks across (once somebody has crossed, the bridge ties itself for good);
     TAP it near the Thief's claw when he dives to whack it away.
   - THINGS IN THE WAY (in course order; "the gate" is the first one both have not passed yet):
       boulder (68 x 132)   nobody passes: the clearer smashes it
       log (84 x 52), napping dino (88 x 54), meteor rock (60 x 50)   a free jump clears them, an egg hop doesn't:
                            smash / shoo them (or toss the egg over and jump after it)
       ledge (64 px up)     too high with the egg: the clearer jumps up, the carrier tosses the egg up and jumps after
       pit (112 px wide: tar, lava on the volcano)   a free jump clears it (take off at the edge), an egg hop doesn't:
                            the clearer jumps, the egg is tossed across. A fall is "Splat!" / "Hot foot!" and a pop
                            back to the rim you came from (the egg stays in your hands)
       vine bridge (232 px pit)   nobody jumps it and no toss reaches across: the clearer holds the post.
                            Let go too early and it creaks for about 0.9 s ("Hold on!") before it drops the walker.
     So an idle partner stalls everything: the carrier can't open anything, the clearer can't carry, flags and the
     nest need both players there. The era can never be cleared by one player.
   - THE THIEF hovers at the top right in his machine all era, taunts (true facts among them) and does one trick at a
     time, every 6.4 / 5.4 / 4.8 s in stretch 1 / 2 / 3 (TTHDINO_STRETCHES[k].pattern, cycled):
       M  a meteor at one player (they take turns), aimed where that player is heading: a glowing ring on the ground
          for 1.15 s (the meteor is seen falling for the last 0.5 s), then BOOM: anyone in the ring gets "Bonk!"
       R  (from stretch 2) a meteor into the path ahead that stays as a smoking rock to smash
       S  (stretch 3) a shower: 3 rings in a row over the pair, landing one by one from the left (1.35 / 1.6 / 1.85 s)
       T  he DIVES for the egg: 1.3 s of aim (1.8 s the first time) right over the carrier with a red dashed line and
          a ring on the egg, then 0.55 s of dive. The carrier ducks (hold down) and he misses, or the clearer whacks
          the claw (within 130 px of it, any time from 0.4 s into the aim on) and he spins off dizzy for 2.8 s.
          Otherwise "Yoink!": the egg is knocked out of the carrier's hands (he never gets away with it).
     A bonk from a meteor or the claw makes the carrier drop the egg. Never a ring over someone who holds a vine post
     or walks on a bridge, never a dive next to a pit, on a bridge or near the nest; nothing new starts in a calm
     moment (card, flag celebration, nobody playing: tthCalm), and what was on its way is called off.
   - THE FIRE WALL (the pacer) creeps in from the left at 64 / 76 / 88 px/s, speeds up to stay 380 px behind the
     slower player (or the loose egg), and never comes closer than 210 px to the gate, the next flag or the nest, so
     waiting at a boulder is always safe. A touch is "Hot foot!": a pop forward onto cool ground, and the fire falls
     back 150 px. It falls back 240 px at each flag (the breather). A glow at the left edge shows it is near.
   - "Wait for Bo!": nobody gets more than 470 px ahead of the partner (the leash only stops the one walking away,
     never in mid-air over a pit, and never the one who walks back to a dropped egg).
   - THE END: the last ledge leads to the nest. The carrier steps up to the nest while the partner is up there too
     (within 240 px): the egg hops into the nest, the Thief grabs for it ("NO! That egg is MINE!"), the mother T. rex
     (big, friendly to Pip and Bo) ROARS him away, tthPhaseDone ("EEK! OK, OK! Keep your egg!"), she nuzzles the nest,
     and the asteroid's flash lights the horizon as the portal takes everyone away.
   - GOLD HELP (always announced with tthHelp): 3 hot feet in a stretch slow the fire (x 0.6); 3 egg-dropping bonks
     in a stretch make the Thief sleepy (rings 1.6 s, aim 1.8 s, tricks 1.4 x rarer); 2 falls into the same pit put a
     gold stepping stone in it that you just walk across / tie the vine bridge (after two pits needed that, the next
     ones help after 1 fall); 20 s without progress puts a gold hint over whoever's turn it is and a gold arrow at
     the thing to do (the news line only the first time per thing).
   - HINTS name each player's own keys (tthKey; on touch "the smash button"): what the gate needs from whom, "Grab the
     egg!", the dive, the first meteors. In 1-player mode the computer's player gets no key hints.
   - HUD: "Stretch n/3" in the time pill, 3 pips on the era strip, and a track along the bottom (fire, both players,
     the egg, the 2 flags, the nest). Boulders, logs and rocks show their hits left as pips in the clearer's colour.
   Controls: left / right walk, jump (W / up arrow / touch up / A) jumps, down ducks (carrier), the action as above.
   Nothing needs two directions at once or more than 4 presses a second (hits count at most 7 a second).
   Stats (st.stats.dino): stretchT [s per stretch], smashed, shoos, bridges, tosses, drops, whacks, ducks, snatched,
   meteors, rocks, hot, pits. Every top-level name starts with tthDino / TTHDINO (Sfx.extra.tthDino*). All state
   lives in st.ph (fresh every phase start); the course is compiled again at every start. Brain:
   js/cpu/levels/world30/tth-dino.js. Tests: tools/w30/dino-keys.js (real keyboard, controller, touch),
   tools/w30/dino-solo.js (scripted people with the computer), tools/w30/dino-dbg.js (trick and bump tracer),
   tools/w30/dino-play.js (play.js with a richer --trace), tools/w30/dino-perf.js (draw time per frame). */
const TTHDINO = {
  cell: 4, stepUp: 7, snap: 9, x0: -900, y0: 432,
  carryV: 150, hopV: 400,             // with the egg: walking speed (free: 220) and jump speed (a 40 px hop; free: 109 px)
  maxSep: 470,                        // "Wait for Bo!": nobody gets further ahead of the partner than this
  toss: { range: 240, up: 175, t0: 0.34, perPx: 1 / 900, lock: 0.5, arc: 54 },
  egg: { r: 14, g: 1700, dropVx: 150, dropVy: 330, fric: 300, pick: 0.35 },
  hit: { reach: 42, cd: 0.14 },
  boulder: { w: 68, h: 132, hits: 4 }, log: { w: 84, h: 52, hits: 3 }, nap: { w: 88, h: 54, hits: 1 }, rock: { w: 60, h: 50, hits: 2 },
  ledge: 64, gap: 112, vine: 232, pit: 84, postX: 64, postR: 48, pullUp: 5, pullDown: 3, creak: 0.6, stoneGap: 18,
  fire: { v: [64, 76, 88], gap: 380, catch: 2.5, cap: 210, back: 150, pop: 170, slowK: 0.6, start: -430 },
  met: { r: 46, warn: 1.15, sleepyWarn: 1.6, fall: 0.5, showerWarn: 1.35, showerGap: 0.25 },
  dive: { aim: 1.3, sleepyAim: 1.8, down: 0.55, pre: 0.4, reach: 130, dizzy: 2.8, rise: 1.0, s: 0.72 },
  goldHot: 3, goldBonks: 3, goldPit: 2, stuckT: 20,
  nestL: 82, nestR: 40, nestNear: 240, nestDrop: 0.45, roarAt: 1.2, doneAt: 2.7,
};
// The hand-made course. Tokens: 'f N' flat N px; 'u N R' a slope rising R px over N px (R < 0: down);
// 'B' a boulder (tall: nobody passes; 4 smashes); 'L' a fallen log (low: only the egg can't pass; 3 smashes);
// 'Z' a napping baby dino (low; 1 shoo); 'E [H]' a ledge H px up (64: too high with the egg); 'g [N]' a pit N px
// wide (112: a free jump clears it, an egg hop doesn't); 'V [N]' a wide pit with a vine bridge (232: nobody jumps it);
// 'F' the stretch's checkpoint flag; 'N' the nest (the end).
// every: s between the Thief's tricks; pattern (cycled): M a meteor at a player, R a meteor that leaves a rock in the
// path ahead, S a shower (3 meteors in a row), T the Thief dives for the egg; first: s before the first trick.
const TTHDINO_STRETCHES = [
  { name: 'Fern Jungle', every: 6.4, first: 6, pattern: 'MTMMT',
    course: 'f 460|B|f 400|L|f 360|u 240 24|Z|f 380|E|f 320|B|f 300|u 260 -40|f 200|L|f 340|B|f 280|E|f 300|u 280 -50|Z|f 320|F|f 220' },
  { name: 'Rumbling Swamp', every: 5.4, first: 4, pattern: 'MRTMRMT',
    course: 'f 300|g|f 340|B|f 300|V|f 360|L|f 280|E|f 280|g|f 320|u 280 -60|B|f 300|V|f 340|Z|f 300|B|f 280|F|f 220' },
  { name: 'Volcano Slope', every: 4.8, first: 4, pattern: 'STRMTS',
    course: 'f 260|u 240 30|B|f 280|g|f 280|E|f 240|L|f 280|V|f 300|B|f 240|u 260 -40|g|f 260|E|f 240|V|f 300|B|f 320|E|f 200|N|f 620' },
];
const TTHDINO_TAUNTS = ['That space rock is 10 km wide. Tick, tock!', 'It will land near Mexico. Not MY problem!', 'T. rex means "tyrant lizard king". I want one!', 'Run, run! Ha ha ha!', 'Nice egg. Shame if someone... borrowed it!'];
const tthDinoCx = p => p.x + p.w / 2;
const tthDinoFeet = p => p.y + p.h;
const tthDinoHolder = ph => (ph.egg.state === 'held' ? ph.egg.by : -1);
const tthDinoSolo = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const tthDinoBlocker = o => o.kind === 'boulder' || o.kind === 'log' || o.kind === 'nap' || o.kind === 'rock';
const tthDinoPit = o => o.kind === 'gap' || o.kind === 'vine';

/* ---------- the course: tokens -> heights (one per 4 px), obstacles, flags, the nest ---------- */
function tthDinoCompile() {
  const K = TTHDINO, h = [], obs = [], flags = [], spans = [];
  let x = K.x0, y = K.y0, nest = null;
  const push = (len, fn) => { const n = Math.max(1, Math.round(len / K.cell)); for (let i = 0; i < n; i++) h.push(fn(i, n)); x += n * K.cell; };
  const flat = len => push(len, () => y);
  const slope = (len, rise) => { const y0 = y; push(len, (i, n) => { const u = (i + 0.5) / n; return y0 - rise * (u * u * (3 - 2 * u)); }); y = y0 - rise; };
  const add = o => obs.push(Object.assign({ hits: 0, need: 1, gone: false, cleared: false, gold: false, falls: 0, shake: 0, t: 0 }, o));
  flat(-K.x0);   // the lead-in behind the start, where the fire begins
  TTHDINO_STRETCHES.forEach((S, k) => {
    const x0 = x;
    for (const tk of S.course.split('|')) {
      const [c, a, b] = tk.trim().split(/\s+/), n1 = +a, n2 = +b;
      if (c === 'f') flat(n1);
      else if (c === 'u') slope(n1, n2);
      else if (c === 'B' || c === 'L' || c === 'Z') {
        const kind = c === 'B' ? 'boulder' : c === 'L' ? 'log' : 'nap', D = K[kind];
        add({ kind, k, x0: x, x1: x + D.w, base: y, top: y - D.h, need: D.hits });
        flat(D.w);
      } else if (c === 'E') { const up = n1 || K.ledge; add({ kind: 'ledge', k, x0: x, x1: x, base: y, top: y - up }); y -= up; }
      else if (c === 'g' || c === 'V') {
        const w = n1 || (c === 'g' ? K.gap : K.vine);
        add({ kind: c === 'g' ? 'gap' : 'vine', k, x0: x, x1: x + w, base: y, top: y, pull: 0, taut: false, tied: false, held: false, stone: false, creak: false });
        push(w, () => y + K.pit);
      } else if (c === 'F') flags.push({ k, x: x + 30, y, got: false, t: 0 });
      else if (c === 'N') nest = { x: x + 40, y, t: 0 };
    }
    spans.push({ x0, x1: x });
  });
  const h0 = h.slice();
  const c = { X0: K.x0, h, h0, obs, flags, nest, spans, xMax: x };
  for (const o of obs) if (tthDinoBlocker(o)) tthDinoCells(c, o.x0, o.x1, o.top);   // blockers are raised ground
  return c;
}
const tthDinoCellOf = (c, x) => clamp(Math.floor((x - c.X0) / TTHDINO.cell), 0, c.h.length - 1);
const tthDinoCellX = (c, i) => c.X0 + i * TTHDINO.cell;
// set the live ground over [x0, x1) to y (null: back to the bare ground)
function tthDinoCells(c, x0, x1, y) { for (let i = tthDinoCellOf(c, x0 + 0.01), i1 = tthDinoCellOf(c, x1 - 0.01); i <= i1; i++) c.h[i] = y == null ? c.h0[i] : y; }
const tthDinoG = (ph, x) => ph.c.h[tthDinoCellOf(ph.c, x)];        // the live ground (with boulders, bridges...)
const tthDinoG0 = (ph, x) => ph.c.h0[tthDinoCellOf(ph.c, x)];      // the bare ground (pits are low)
// the highest ground (smallest y) under [x, x + w]
function tthDinoSup(ph, x, w) {
  const c = ph.c, c0 = tthDinoCellOf(c, x + 0.01), c1 = tthDinoCellOf(c, x + w - 0.01), h = c.h;
  let m = Infinity;
  for (let i = c0; i <= c1; i++) if (h[i] < m) m = h[i];
  return m;
}
// the pit (gap or vine) whose hole is under x, or null
function tthDinoPitAt(ph, x, pad = 0) { for (const g of ph.pits) if (x > g.x0 - pad && x < g.x1 + pad) return g; return null; }
// a body (centre x, feet y) is past obstacle o
const tthDinoPast = (o, x, feet) => (o.kind === 'ledge' ? x > o.x0 + 4 && feet <= o.top + 6 : x > o.x1 + 8);
// the first thing in p's way (not smashed, not passed by p), or null
function tthDinoNextFor(ph, p) {
  const x = tthDinoCx(p), f = tthDinoFeet(p);
  for (const o of ph.c.obs) if (!o.gone && !tthDinoPast(o, x, f)) return o;
  return null;
}

/* ---------- moving on the height map (from 20-1's Slope Climb) ---------- */
function tthDinoMoveX(ph, p, dx) {
  if (!dx) return;
  const K = TTHDINO, c = ph.c, feet = p.y + p.h, h = c.h;
  let nx = p.x + dx;
  if (dx > 0) {
    const c0 = tthDinoCellOf(c, p.x + p.w - 0.01), c1 = tthDinoCellOf(c, nx + p.w - 0.01);
    for (let i = c0 + 1; i <= c1; i++) if (h[i] < feet - K.stepUp) { nx = tthDinoCellX(c, i) - p.w; p.vx = Math.min(0, p.vx); break; }
  } else {
    const c0 = tthDinoCellOf(c, p.x + 0.01), c1 = tthDinoCellOf(c, nx + 0.01);
    for (let i = c0 - 1; i >= c1; i--) if (h[i] < feet - K.stepUp) { nx = tthDinoCellX(c, i + 1); p.vx = Math.max(0, p.vx); break; }
  }
  const lo = c.X0 + 8, hi = c.xMax - p.w - 8;
  if (nx < lo) { nx = lo; p.vx = Math.max(0, p.vx); }
  if (nx > hi) { nx = hi; p.vx = Math.min(0, p.vx); }
  p.x = nx;
  const sup = tthDinoSup(ph, p.x, p.w);
  if (sup < feet && feet - sup <= K.stepUp + 0.01) p.y = sup - p.h;   // walk up a slope
}
function tthDinoMoveY(ph, p, dt) {
  const K = TTHDINO, sup = tthDinoSup(ph, p.x, p.w), feet = p.y + p.h, was = p.grounded;
  if (p.vy >= 0 && (feet + p.vy * dt >= sup - 0.01 || (was && sup - feet <= K.snap))) {
    p.y = sup - p.h; p.vy = 0; p.grounded = true;
  } else { p.y += p.vy * dt; p.grounded = false; }
  p.tileGround = p.grounded; p.onPartner = false; p.onOneWay = false;
  if (p.grounded && !was && p.lastVy > 260) { p.sx = 1.25; p.sy = 0.78; puff(p.x + p.w / 2, p.y + p.h, 5, 'rgba(255,255,255,0.75)'); Sfx.play('land'); }
  p.lastVy = p.grounded ? 0 : p.vy;
}
// one player's movement this tick (still: no input, for cards and cutscenes)
function tthDinoBody(st, p, dt, still) {
  const ph = st.ph, P = ph.P[p.id], K = TTHDINO, hold = tthDinoHolder(ph) === p.id, real = p.input;
  if (still || P.duck || P.post) { p.input = NO_INPUT; p.pendingJump = false; }   // planted: ducking, or pulling the vine
  try { tthControl(st, p, dt); } finally { p.input = real; }
  if (hold) { p.vx = clamp(p.vx, -K.carryV, K.carryV); if (p.vy < -K.hopV) p.vy = -K.hopV; }   // heavy egg: slower, small hops
  tthDinoMoveX(ph, p, p.vx * dt);
  tthDinoMoveY(ph, p, dt);
  if (P.duck) { p.sx = 1.24; p.sy = 0.68; }
  // pits: a fall is a pop back to the rim it came from
  const cx = tthDinoCx(p), g = tthDinoPitAt(ph, cx);
  if (g && tthDinoFeet(p) > g.base + 34) tthDinoFell(st, p, g);
  else if (p.grounded && !tthDinoPitAt(ph, cx, 6)) { P.safeX = cx; P.safeY = tthDinoFeet(p); }
  if (P.onVine && (cx < P.onVine.x0 || cx > P.onVine.x1 + 30 || !P.onVine.taut)) P.onVine = null;   // (the tie check needs x1 + 6)
  if (g && g.kind === 'vine' && g.taut && p.grounded) P.onVine = g;
}
function tthDinoFell(st, p, g) {
  const ph = st.ph, P = ph.P[p.id], left = P.safeX <= (g.x0 + g.x1) / 2;
  const tx = left ? Math.min(P.safeX, g.x0 - 30) : Math.max(P.safeX, g.x1 + 30);
  const to = { x: tx, y: tthDinoSup(ph, tx - p.w / 2, p.w) };
  if (!tthBonk(st, p, { kind: 'pit', word: g.k === 2 ? 'Hot foot!' : 'Splat!', to, safe: 1 })) {
    p.x = to.x - p.w / 2; p.y = to.y - p.h - 2; p.vx = 0; p.vy = -220; p.grounded = false;   // (still safe from another bump: just hop out)
    return;
  }
  Sfx.play(g.k === 2 ? 'tthDinoSizzle' : 'splash');
  g.falls++; tthStats(st).pits = (tthStats(st).pits || 0) + 1;
  // gold help after 2 falls into the same pit (after the first fall once two pits have needed help)
  if (g.falls >= (ph.pitHelp >= 2 ? 1 : TTHDINO.goldPit) && !g.stone && !g.tied) {
    ph.pitHelp++;
    if (g.kind === 'gap') {   // a wide stepping stone: the holes left are narrower than a foot, so just walk across
      g.stone = true;
      tthDinoCells(ph.c, g.x0 + TTHDINO.stoneGap, g.x1 - TTHDINO.stoneGap, g.base);
      tthHelp(st, 'Gold help: a stepping stone! Just walk across.');
    } else { g.tied = true; tthHelp(st, 'Gold help: the vine bridge ties itself!'); }
  } else if (g.kind === 'gap') tthDinoTip(st, p.id, 'pit', tthDinoHolder(ph) === p.id ? 'Too far with the egg! Toss it across: ' + tthDinoAct(p.id) : 'Jump late, at the very edge: ' + tthKey(p.id, 'jump'), 5);
  else tthDinoTip(st, p.id, 'pit', 'Wait until the vine bridge is pulled tight!', 5);
}
function tthDinoStill(st, dt) {
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; st.ph.P[p.id].duck = false; st.ph.P[p.id].post = null; tthDinoBody(st, p, dt, true); }
}

/* ---------- the camera and the leash ---------- */
function tthDinoCam(st, snap, dt = DT) {
  const ps = G.players, ph = st.ph, xs = ps.map(tthDinoCx), fs = ps.map(tthDinoFeet);
  const lo = Math.min(xs[0], xs[1]), hi = Math.max(xs[0], xs[1]), top = Math.min(ps[0].y, ps[1].y), bot = Math.max(fs[0], fs[1]);
  let tx = (lo + hi) / 2 + 110 - W / 2, ty = (fs[0] + fs[1]) / 2 - TTHDINO.y0;
  if (ph.end) tx += 90;   // the nest scene: room for the mother
  tx = Math.min(tx, lo - 90); tx = Math.max(tx, hi + 90 - W);
  tx = clamp(tx, ph.c.X0, ph.c.xMax - W);
  ty = Math.min(ty, top - 190); ty = Math.max(ty, bot + 60 - H);
  const c = st.cam;
  if (snap) { c.x = tx; c.y = ty; return; }
  c.x += (tx - c.x) * Math.min(1, dt * 3.5); c.y += (ty - c.y) * Math.min(1, dt * 2.2);
  c.x = Math.min(c.x, lo - 40); c.x = Math.max(c.x, hi + 40 - W);   // both always on screen
  c.y = Math.min(c.y, top - 120); c.y = Math.max(c.y, bot + 30 - H);
}
function tthDinoLeash(st, xb) {
  const ps = G.players, ph = st.ph;
  if (Math.abs(tthDinoCx(ps[0]) - tthDinoCx(ps[1])) <= TTHDINO.maxSep) return;
  for (const p of ps) {
    const o = ps[1 - p.id];
    if (Math.abs(p.x - o.x) <= Math.abs(xb[p.id] - o.x)) continue;   // only the one walking away
    if (!p.grounded && tthDinoPitAt(ph, tthDinoCx(p), 16)) continue;        // (never stop a jump over a pit in mid-air)
    const e = ph.egg;                                                       // (nor the one who goes back for the dropped egg)
    if (e.state === 'loose' && Math.abs(e.x - tthDinoCx(p)) < Math.abs(e.x - xb[p.id] - p.w / 2)) continue;
    p.x = xb[p.id]; p.vx = 0;
    const P = ph.P[p.id];
    if (P.waitCD <= 0) {
      P.waitCD = 3.2;
      tthPop(st, tthDinoCx(p), p.y - 30, 'Wait for ' + NAMES[o.id] + '!', PCOL[o.id], 17);
      if (typeof cpuSay === 'function' && cpuOn(o.id)) cpuSay(o, 'Wait for me!');
    }
  }
}

/* ---------- hints (each player's own keys) ---------- */
function tthDinoTip(st, id, key, text, again = 6, o = {}) {
  const T0 = st.ph.tipT[id];
  if (T0[key] != null && st.phT - T0[key] < again) return;
  T0[key] = st.phT;
  tthHint(st, id, text, { life: o.life || 2.8, gold: !!o.gold, cpu: o.cpu });
  st.ph.hintKey[id] = key;
}
// that player did it: take down a hint about it that is still showing
function tthDinoDone(st, id, keys) { if (st.hints[id] && keys.includes(st.ph.hintKey[id])) st.hints[id] = null; }
// the action button's name in a hint (on touch: "the toss button", the word that is on the round button right now)
function tthDinoAct(id, word) {
  if (tthDev(id) !== 'touch') return tthKey(id, 'act');
  return 'the ' + (word || tthDinoWord(G.mst, id)) + ' button';
}
// the word on each player's action button: toss with the egg; without it, what the button would do right here
function tthDinoWord(st, id) {
  const ph = st.ph, e = ph.egg;
  if (e.state === 'held' ? e.by === id : (e.state === 'fly' || e.state === 'fall' || e.state === 'thief') && e.by === id) return 'toss';
  return (ph.P && ph.P[id].word) || 'smash';
}

/* ---------- the egg: held over a head, tossed, or loose on the ground (it never breaks) ---------- */
function tthDinoEgg(st, dt) {
  const ph = st.ph, e = ph.egg, K = TTHDINO.egg, ps = G.players, r = K.r;
  e.t += dt;
  if (e.state === 'held') { const p = ps[e.by]; e.x = tthDinoCx(p); e.y = p.y - (ph.P[p.id].duck ? 1 : 15); e.rot = 0; return; }
  if (e.state === 'fly' || e.state === 'fall') {
    const p = ps[e.by], u = Math.min(1, e.t / e.dur), tx = tthDinoCx(p), ty = p.y - 15;
    e.x = e.x0 + (tx - e.x0) * u; e.y = e.y0 + (ty - e.y0) * u - e.arc * Math.sin(Math.PI * u); e.rot += dt * 10;
    if (u >= 1) tthDinoCatch(st, p, e.state === 'fall' ? 'first' : 'toss');
    return;
  }
  if (e.state === 'nest') {   // a gentle lob from the carrier's hands into the nest
    const E = ph.end, n = ph.c.nest, u = Math.min(1, e.t / TTHDINO.nestDrop), k = u * u * (3 - 2 * u);
    e.x = E.x0 + (n.x - E.x0) * k; e.y = E.y0 + (n.y - 30 - E.y0) * k - 46 * Math.sin(Math.PI * u); e.rot = (1 - u) * -1.2;
    if (u >= 1 && !E.landed) { E.landed = true; Sfx.play('tthDinoCatch', 1); puff(n.x, n.y - 16, 6, 'rgba(255,243,196,0.9)'); }
    return;
  }
  if (e.state !== 'loose') return;
  const dir = Math.sign(e.vx);
  e.vy = Math.min(e.vy + K.g * dt, 900);
  let nx = e.x + e.vx * dt;
  if (dir) {   // it stays on its own level: it bounces off walls and never rolls off a ledge or into a pit
    const here = tthDinoG(ph, e.x), next = tthDinoG(ph, nx + dir * r);
    if (next - here > 30 || (here - next > 7 && e.y + r > next + 2) || nx < ph.c.X0 + 40 || nx > ph.c.xMax - 40) { e.vx = -e.vx * 0.45; nx = e.x; }
  }
  e.x = nx; e.y += e.vy * dt; e.rot += e.vx * dt / r;
  const pit = tthDinoPitAt(ph, e.x);
  if (pit && e.y > pit.base + 30) { e.x = pit.x0 - 34; e.y = pit.base - 50; e.vx = -30; e.vy = -160; Sfx.play('tthDinoBoing'); }   // (a bridge went slack under it)
  const gy = tthDinoG(ph, e.x);
  if (e.y + r >= gy) {
    e.y = gy - r;
    if (e.vy > 150) { e.vy = -e.vy * 0.38; Sfx.play('tthDinoBoing'); } else e.vy = 0;
    e.vx = approach(e.vx, 0, K.fric * dt);
    if (Math.abs(e.vx) < 3) e.rest += dt;
  }
  if (e.t < K.pick) return;
  // whoever walks into it picks it up (the nearer one first)
  const order = Math.abs(tthDinoCx(ps[0]) - e.x) <= Math.abs(tthDinoCx(ps[1]) - e.x) ? [0, 1] : [1, 0];
  for (const k of order) {
    const p = ps[k];
    if (p.stun <= 0 && Math.abs(tthDinoCx(p) - e.x) < 24 && Math.abs(tthDinoFeet(p) - (e.y + r)) < 46) { tthDinoCatch(st, p, 'pick'); break; }
  }
}
function tthDinoCatch(st, p, how) {
  const ph = st.ph, e = ph.egg, P = ph.P[p.id], S = tthStats(st);
  e.state = 'held'; e.by = p.id; e.rot = 0; e.t = 0; e.x = tthDinoCx(p); e.y = p.y - 15;
  P.lock = TTHDINO.toss.lock; P.swing = 0; ph.progT = Math.min(ph.progT, TTHDINO.stuckT - 6);
  p.sx = 1.18; p.sy = 0.84;
  Sfx.play('tthDinoCatch', p.id);
  if (how === 'pick') tthPop(st, e.x, p.y - 44, 'Got it!', PCOL[p.id], 17);
  if (how === 'toss') S.tosses = (S.tosses || 0) + 1;
  for (const k of [0, 1]) tthDinoDone(st, k, ['grab', 'toss', 'high', 'far', 'face', 'gold']);
  // the first time each player holds it: what the button does now
  if (how !== 'first') tthDinoTip(st, p.id, 'carry', 'You carry the egg now! Toss it back: ' + tthDinoAct(p.id, 'toss'), 9999, { life: 3.2 });
}
function tthDinoDrop(st, p) {
  const ph = st.ph, e = ph.egg, K = TTHDINO.egg, S = tthStats(st);
  if (tthDinoHolder(ph) !== p.id) return false;
  e.state = 'loose'; e.t = 0; e.rest = 0; e.x = tthDinoCx(p); e.y = p.y - 15;
  e.vx = -K.dropVx * (0.8 + 0.4 * tthRand()); e.vy = -K.dropVy;
  S.drops = (S.drops || 0) + 1;
  Sfx.play('tthDinoDrop');
  return true;
}
function tthDinoThrow(st, from, to) {
  const e = st.ph.egg, K = TTHDINO.toss;
  const d = Math.hypot(tthDinoCx(to) - e.x, to.y - 15 - e.y);
  e.state = 'fly'; e.by = to.id; e.t = 0; e.x0 = e.x; e.y0 = e.y; e.dur = K.t0 + d * K.perPx; e.arc = K.arc + d * 0.16;
  st.ph.P[from.id].swing = 0.2;
  Sfx.play('tthDinoToss', from.id);
}
// the carrier's action: toss the egg to the partner (close enough, and the way the carrier looks)
function tthDinoToss(st, p, o) {
  const ph = st.ph, P = ph.P[p.id], K = TTHDINO.toss;
  if (P.lock > 0 || ph.end) return;
  const dx = tthDinoCx(o) - tthDinoCx(p), dy = tthDinoFeet(o) - tthDinoFeet(p);
  if (Math.abs(dx) > K.range || Math.abs(dy) > K.up) { tthDinoTip(st, p.id, 'far', 'Too far to toss! Get closer to ' + NAMES[o.id] + '.', 4); return; }
  if (Math.abs(dx) > 34 && Math.sign(dx) !== p.face) { tthDinoTip(st, p.id, 'face', 'Look at ' + NAMES[o.id] + ' to toss the egg!', 4); return; }
  if (o.stun > 0) return;
  tthDinoThrow(st, p, o);
}

/* ---------- the clearer's action: whack the claw, smash, shoo; held at a vine post: pull the bridge tight ---------- */
// the boulder, log, napping dino or meteor rock within reach of p, or null
function tthDinoTarget(ph, p, reach) {
  const feet = tthDinoFeet(p);
  let best = null, bd = reach;
  for (const o of ph.c.obs) {
    if (o.gone || !tthDinoBlocker(o)) continue;
    const d = Math.max(o.x0 - (p.x + p.w), p.x - o.x1, 0);
    if (d <= bd && feet >= o.top - 12 && feet <= o.base + 40) { best = o; bd = d; }
  }
  return best;
}
function tthDinoHit(st, p) {
  const ph = st.ph, P = ph.P[p.id], o = tthDinoTarget(ph, p, TTHDINO.hit.reach), S = tthStats(st);
  if (!o) return false;
  if (P.hitCD > 0) return true;
  P.hitCD = TTHDINO.hit.cd; o.hits++; o.shake = 0.22; ph.progT = 0;
  const mid = (o.x0 + o.x1) / 2, hx = clamp(tthDinoCx(p), o.x0, o.x1), hy = Math.max(o.top + 14, p.y);
  p.face = mid >= tthDinoCx(p) ? 1 : -1;
  rumble(p.id, 0.4, 0.2, 80);
  tthDinoDone(st, p.id, ['smash', 'gold', 'clear']);
  if (o.kind === 'nap') {   // the baby dino wakes up and trots off after the herd
    o.gone = true; o.cleared = true; o.runT = 0; tthDinoCells(ph.c, o.x0, o.x1, null);
    tthPop(st, mid, o.top - 26, 'Shoo!', C.gold, 22); Sfx.play('tthDinoSqueak');
    S.shoos = (S.shoos || 0) + 1;
  } else if (o.hits >= o.need) {
    o.gone = true; o.cleared = true; tthDinoCells(ph.c, o.x0, o.x1, null);
    const col = o.kind === 'log' ? '#a8703c' : o.kind === 'rock' ? '#5a4650' : '#9aa0a8';
    for (let n = 0; n < 3; n++) burst(mid + (n - 1) * 18, (o.top + o.base) / 2, n === 1 ? '#ffffff' : col, 8);
    tthPop(st, mid, o.top - 22, 'Smash!', C.gold, 24); Sfx.play('tthDinoSmash');
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.16);
    S.smashed = (S.smashed || 0) + 1;
  } else {
    burst(hx, hy, o.kind === 'log' ? '#c98b5a' : '#c9ced6', 5); Sfx.play('tthDinoCrack', p.id);
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.06);
  }
  return true;
}
function tthDinoWhack(st, p) {
  const ph = st.ph, th = ph.th, K = TTHDINO.dive, c = st.thief;
  if (!(th.mode === 'dive' || (th.mode === 'aim' && th.t >= K.pre))) return false;   // (once the claw is down over the egg)
  const cl = tthThiefPts(c).claw;
  if (Math.abs(tthDinoCx(p) - cl.x) > K.reach || Math.abs(p.y + p.h / 2 - cl.y) > K.reach + 70) return false;
  th.mode = 'dizzy'; th.t = 0; c.hitT = 0.6; c.pose = 'dizzy';
  p.face = cl.x >= tthDinoCx(p) ? 1 : -1;
  if (p.grounded) { p.vy = -260; p.grounded = false; }   // a little leap at the claw
  tthPop(st, cl.x, cl.y - 20, 'Whack!', C.gold, 26); burst(cl.x, cl.y, '#fff3c4', 12); Sfx.play('tthDinoWhack');
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.14);
  rumble(p.id, 0.6, 0.3, 120);
  tthReact(st, 'shocked', ['Ow! My claw!', 'Hey! Hands off!', 'Yowch! Rude!'][ph.diveN % 3], 2);
  const S = tthStats(st); S.whacks = (S.whacks || 0) + 1;
  for (const k of [0, 1]) tthDinoDone(st, k, ['dive']);
  st.warn[0] = st.warn[1] = 0;
  ph.atkT = Math.max(ph.atkT, 2.5);
  return true;
}
function tthDinoActs(st, dt) {
  const ph = st.ph, ps = G.players, e = ph.egg, K = TTHDINO, th = ph.th;
  for (const p of ps) {
    const P = ph.P[p.id], o = ps[1 - p.id], press = p.pendingAct, hold = tthDinoHolder(ph) === p.id;
    p.pendingAct = false;
    P.lock = Math.max(0, P.lock - dt); P.hitCD = Math.max(0, P.hitCD - dt); P.swing = Math.max(0, P.swing - dt); P.waitCD -= dt;
    P.post = null;
    P.duck = hold && p.input.down && p.grounded && p.stun <= 0 && !ph.end;   // the carrier ducks and hugs the egg
    if (P.duck) tthDinoDone(st, p.id, ['dive']);
    if (p.stun > 0 || ph.end) continue;
    if (hold) { if (press) tthDinoToss(st, p, o); continue; }
    // the clearer: what the button does right here (also the word on the touch button)
    const cx = tthDinoCx(p), feet = tthDinoFeet(p), tg = tthDinoTarget(ph, p, 70);
    let vine = null;
    for (const v of ph.pits) if (v.kind === 'vine' && !v.tied && Math.abs(cx - (v.x0 - K.postX)) <= K.postR && Math.abs(feet - v.base) < 14) vine = v;
    const diving = (th.mode === 'aim' || th.mode === 'dive') && Math.abs(cx - st.thief.x) < 330;
    P.word = diving ? 'whack' : vine ? 'pull' : tg && tg.kind === 'nap' ? 'shoo' : 'smash';
    if (vine && p.input.act && p.grounded) { P.post = vine; p.face = 1; tthDinoDone(st, p.id, ['vine', 'gold']); }
    if (press) {
      P.swing = 0.24;
      if (!tthDinoWhack(st, p) && !tthDinoHit(st, p) && !vine) Sfx.play('whoosh', p.id);
    }
  }
  // vine bridges: tight while someone pulls at the post; tied for good once somebody has crossed
  for (const v of ph.pits) {
    if (v.kind !== 'vine') continue;
    const held = !v.tied && ps.some(p => ph.P[p.id].post === v);
    if (held && !v.held) Sfx.play('tthDinoVine');
    v.held = held;
    const want = v.tied || held ? 1 : 0;
    const on = v.taut && ps.some(p => ph.P[p.id].onVine === v);   // let go too early: it creaks for a moment before it drops
    if (on && !want && !v.creak) { v.creak = true; Sfx.play('tthDinoCreak'); tthPop(st, (v.x0 + v.x1) / 2, v.base - 60, 'Hold on!', '#ffffff', 20); }
    if (want || !v.taut) v.creak = false;
    v.pull = approach(v.pull, want, dt * (want ? K.pullUp : on ? K.creak : K.pullDown));
    if (!v.taut && v.pull >= 0.9) { v.taut = true; tthDinoCells(ph.c, v.x0, v.x1, v.base); }
    else if (v.taut && v.pull < 0.45) { v.taut = false; tthDinoCells(ph.c, v.x0, v.x1, null); }
    if (v.taut && !v.tied && ps.some(p => ph.P[p.id].onVine === v && tthDinoCx(p) > v.x1 + 6)) {
      v.tied = true; ph.progT = 0;
      tthPop(st, v.x1 + 20, v.base - 70, 'Tied!', C.gold, 22); Sfx.play('tthDing');
      const S = tthStats(st); S.bridges = (S.bridges || 0) + 1;
    }
  }
}

/* ---------- what is in the way: gates (for the fire and the gold arrow), flags, the nest ---------- */
function tthDinoGates(st) {
  const ph = st.ph, ps = G.players, held = ph.egg.state === 'held';
  ph.gate = null;
  for (const o of ph.c.obs) {
    if (o.cleared) continue;
    if (o.gone) { o.cleared = true; continue; }
    if (held && ps.every(p => p.grounded && tthDinoPast(o, tthDinoCx(p), tthDinoFeet(p)))) {
      o.cleared = true; o.gold = false; ph.progT = 0;
      if (!tthDinoBlocker(o)) { tthPop(st, o.x1 + 30, o.top - 70, o.kind === 'ledge' ? 'Up!' : 'Across!', '#9fe07f', 20); Sfx.play('tthDing'); }
      continue;
    }
    ph.gate = o; break;   // (they are in course order: only the first one counts)
  }
}
function tthDinoFlags(st) {
  const ph = st.ph, f = ph.c.flags[ph.k], ps = G.players, e = ph.egg, S = tthStats(st);
  if (!f || f.got || e.state !== 'held') return;
  const at = ps.map(p => tthDinoCx(p) > f.x - 24 && p.grounded);
  if (!at[0] || !at[1]) { for (const k of [0, 1]) if (at[k] && tthDinoCx(ps[1 - k]) < f.x - 200) tthDinoTip(st, k, 'flagwait', 'Wait for ' + NAMES[1 - k] + ' at the flag!', 8, { cpu: null }); return; }
  f.got = true; f.t = 0;
  S.stretchT.push(Math.round((st.phT - ph.kT0) * 10) / 10);
  Sfx.play('tthDinoFlag');
  for (let n = 0; n < 16; n++) confetti(f.x + (tthRand() - 0.5) * 80, f.y - 100);
  tthPop(st, f.x, f.y - 130, 'Flag ' + (ph.k + 1) + '!', C.gold, 28);
  ph.mets = []; if (ph.th.mode === 'aim' || ph.th.mode === 'dive') { ph.th.mode = 'rise'; ph.th.t = 0; }
  ph.k++; ph.kT0 = st.phT;
  ph.hot = 0; ph.bonks = 0; ph.fireSlow = false; ph.sleepy = false; ph.atkN = 0; ph.progT = 0; ph.factT = 7;
  ph.atkT = TTHDINO_STRETCHES[ph.k].first + 1.8;
  ph.fire.x -= 240;
  // the jobs swap: the egg flies over to the other one
  const from = ps[e.by], to = ps[1 - e.by];
  tthDinoThrow(st, from, to);
  tthSwap(st); tthCelebrate(st, 1.8);
  tthNews(st, 'Stretch ' + (ph.k + 1) + ' of 3: ' + TTHDINO_STRETCHES[ph.k].name, false, 3);
  ph.later = { t: TTH.swapT + 0.2, text: ph.k === 1 ? 'Still here? Mind the tar pits! Hee hee!' : 'The volcano is waking up! Give up!' };   // (after "Swap jobs!")
}
// the end: the carrier steps up to the nest while the partner is up there too; the mother roars the Thief away
function tthDinoNest(st, dt) {
  const ph = st.ph, n = ph.c.nest, e = ph.egg, ps = G.players, c = st.thief, th = ph.th;
  if (ph.end) {
    const E = ph.end;
    E.t += dt; n.t += dt;
    if (E.step === 0) {
      E.step = 1; th.mode = 'end'; c.pose = 'grab'; c.claw = 1;
      tthSay(st, 'NO! That egg is MINE!', 1.3);
      for (const p of ps) if (p.grounded) { p.vy = -PHYS.jumpV * 0.55; p.grounded = false; }
    }
    if (E.step === 1 && E.t >= TTHDINO.roarAt) {
      E.step = 2; E.roarT = 0;
      Sfx.play('tthDinoRoar'); rumble(0, 1, 0.8, 500); rumble(1, 1, 0.8, 500);
      if (!reduceMotion) G.shake = Math.max(G.shake, 0.5);
      tthPop(st, n.x + 96, n.y - 250, 'ROOOAR!', '#ffffff', 40);
      c.pose = 'shock'; c.mood = 'shocked'; c.moodT = 3; c.hitT = 0.8; st.say = null;
      for (let k = 0; k < 14; k++) G.particles.push({ x: n.x + 60, y: n.y - 190 + (tthRand() - 0.5) * 50, vx: -260 - tthRand() * 260, vy: (tthRand() - 0.5) * 160, life: 0.6, max: 0.6, col: '#ffffff', size: 3 + tthRand() * 3, grav: 0, kind: 'dot' });
    }
    if (E.step === 2) E.roarT += dt;
    if (E.step === 2 && E.t >= TTHDINO.doneAt) {
      E.step = 3;
      for (const p of ps) if (p.grounded) { p.vy = -PHYS.jumpV * 0.6; p.grounded = false; }
      tthPhaseDone(st, { say: 'EEK! OK, OK! Keep your egg!', portal: { x: st.cam.x + 250, y: st.cam.y + 215 } });
    }
    return;
  }
  if (e.state !== 'held') return;
  const p = ps[e.by], o = ps[1 - e.by];
  if (tthDinoCx(p) < n.x - TTHDINO.nestL || tthDinoCx(p) > n.x + TTHDINO.nestR || Math.abs(tthDinoFeet(p) - n.y) > 24) return;
  if (!(Math.abs(tthDinoCx(o) - n.x) < TTHDINO.nestNear && tthDinoFeet(o) <= n.y + 12)) { tthDinoTip(st, p.id, 'nestwait', 'Wait for ' + NAMES[o.id] + ': put it in the nest together!', 6, { cpu: null }); return; }
  ph.end = { t: 0, step: 0, roarT: 0, x0: e.x, y0: e.y };
  e.state = 'nest'; e.rot = 0; e.t = 0; n.t = 0; p.face = 1; o.face = 1; p.vx = 0;
  const S = tthStats(st);
  S.stretchT.push(Math.round((st.phT - ph.kT0) * 10) / 10);
  ph.mets = []; ph.k = 3; st.hints = [null, null]; st.warn = [0, 0];
  tthCelebrate(st, 6);
  tthPop(st, n.x, n.y - 90, 'Home safe!', C.gold, 28); Sfx.play('tthDinoFlag');
  for (let k = 0; k < 20; k++) confetti(n.x + (tthRand() - 0.5) * 120, n.y - 80);
}

/* ---------- the Time Thief: hovers at the top right, taunts, and dives for the egg ---------- */
function tthDinoThief(st, dt) {
  const ph = st.ph, c = st.thief, th = ph.th, K = TTHDINO.dive, cam = st.cam, e = ph.egg, ps = G.players;
  const hx = cam.x + 806 + Math.sin(st.phT * 0.7) * 22, hy = cam.y + 238 + Math.sin(st.phT * 1.3) * 8;
  const glide = (x, y, k) => { c.x += (x - c.x) * Math.min(1, dt * k); c.y += (y - c.y) * Math.min(1, dt * k); };
  const hid = tthDinoHolder(ph), hp = hid >= 0 ? ps[hid] : null;
  c.face = -1; c.jet = true;
  c.look = e.state === 'thief' || e.state === 'nest' ? null : { x: e.x, y: e.y };
  switch (th.mode) {
    case 'intro': case 'hover':
      glide(hx, hy, 2.4); c.claw = approach(c.claw, th.mode === 'intro' ? 0.5 : 0.25, dt * 2);
      if (th.mode === 'hover' && c.pose !== 'idle' && c.moodT <= 0 && !st.say) c.pose = 'idle';
      break;
    case 'aim':
      th.t += dt; c.pose = 'grab'; c.claw = approach(c.claw, 1, dt * 1.6);
      if (!hp) { if ((th.lostT += dt) > 0.7) { th.mode = 'rise'; th.t = 0; tthSay(st, 'Hey! Hold still!', 1.4); } }
      else { th.lostT = 0; glide(tthDinoCx(hp) + 78, e.y - 172 + Math.sin(st.phT * 9) * 3, 4); }
      if (th.mode === 'aim' && th.t >= th.aim) { th.mode = 'dive'; th.t = 0; th.x0 = c.x; th.y0 = c.y; Sfx.play('tthDinoSwoop'); }
      break;
    case 'dive': {
      th.t += dt; c.pose = 'grab'; c.claw = 1;
      const u = Math.min(1, th.t / K.down), k = u * u, tx = e.x + 16 * c.s, ty = e.y - 52 * c.s - 8;
      c.x = th.x0 + (tx - th.x0) * k; c.y = th.y0 + (ty - th.y0) * k;
      if (u >= 1) tthDinoGrab(st);
      break;
    }
    case 'rise':
      th.t += dt; glide(hx, hy, 3); c.claw = approach(c.claw, 0.25, dt * 2);
      if (th.t >= K.rise) { th.mode = 'hover'; if (c.pose === 'grab') c.pose = 'idle'; }
      break;
    case 'dizzy':
      th.t += dt; c.pose = 'dizzy'; glide(hx - 30 + Math.sin(th.t * 7) * 40, hy - 36 + Math.cos(th.t * 5) * 16, 2.2); c.claw = approach(c.claw, 0.25, dt * 2);
      if (th.t >= K.dizzy) { th.mode = 'hover'; c.pose = 'idle'; }
      break;
    case 'end': {
      const n = ph.c.nest, E = ph.end;
      if (E && E.step >= 2) glide(Math.max(n.x - 380, cam.x + 150), n.y - 170 + Math.sin(st.phT * 14) * 4, 3.2);   // blown back by the roar
      else glide(n.x - 40, n.y - 150, 3);
      c.claw = approach(c.claw, E && E.step >= 2 ? 0.25 : 1, dt * 3);
      break;
    }
  }
  // a taunt now and then (true facts among them)
  if (th.mode === 'hover' && !tthCalm(st) && !st.say && (ph.tauntT -= dt) <= 0) {
    ph.tauntT = 15 + tthRand() * 5;
    tthSay(st, TTHDINO_TAUNTS[ph.tauntN++ % TTHDINO_TAUNTS.length], 2.8); c.pose = 'laugh'; c.moodT = Math.max(c.moodT, 1.6);
  }
}
// a dive may start: somebody carries the egg on open ground (never by a pit, on a bridge, or at the nest)
function tthDinoDive(st) {
  const ph = st.ph, th = ph.th, hid = tthDinoHolder(ph), K = TTHDINO.dive, ps = G.players;
  if (hid < 0 || th.mode !== 'hover') return false;
  const p = ps[hid], o = ps[1 - hid], cx = tthDinoCx(p), n = ph.c.nest;
  if (tthDinoPitAt(ph, cx, 80) || cx > n.x - 320 || ph.P[o.id].post || ph.P[o.id].onVine) return false;
  th.mode = 'aim'; th.t = 0; th.lostT = 0; th.aim = ph.sleepy ? K.sleepyAim : ph.diveN === 0 ? K.aim + 0.5 : K.aim;
  ph.diveN++;
  tthSay(st, ['MINE! Give it back!', 'Here I come! Yoink!', 'My egg! MY egg!'][ph.diveN % 3], 1.6);
  Sfx.play('tthDinoAlarm');
  tthWarn(st, hid, th.aim + K.down);
  const first = ph.diveN <= 3, life = th.aim + K.down + 0.2;
  tthDinoTip(st, hid, 'dive', first ? 'He wants the egg! Duck: hold ' + tthKey(hid, 'down') : 'Duck! Hold ' + tthKey(hid, 'down'), 0, { life });
  if (Math.abs(tthDinoCx(o) - cx) < 400) tthDinoTip(st, o.id, 'dive', (first ? 'Whack his claw: ' : 'Whack! ') + tthDinoAct(o.id, 'whack'), 0, { life });
  return true;
}
// the claw is down: he misses a ducking carrier (or a tossed egg), otherwise the egg is knocked out of their hands
function tthDinoGrab(st) {
  const ph = st.ph, th = ph.th, hid = tthDinoHolder(ph), c = st.thief, S = tthStats(st);
  th.mode = 'rise'; th.t = 0;
  for (const k of [0, 1]) tthDinoDone(st, k, ['dive']);
  const miss = line => { tthPop(st, c.x, c.y + 30, 'Missed!', '#9fe07f', 22); Sfx.play('tthDinoMiss'); tthReact(st, 'sad', line, 1.8); S.ducks = (S.ducks || 0) + 1; ph.atkT = Math.max(ph.atkT, 1.5); };
  if (hid < 0) { miss('Hey! No fair!'); return; }
  const p = G.players[hid];
  if (ph.P[hid].duck) { miss(['Grr! Missed!', 'Drat! Too low!', 'Stop ducking!'][ph.diveN % 3]); return; }
  if (!tthBonk(st, p, { kind: 'snatch', word: 'Yoink!', to: { x: tthDinoCx(p), y: tthDinoFeet(p) } })) { miss('Bah! Slippery!'); return; }
  c.pose = 'laugh'; tthReact(st, 'happy', 'Ha ha! Butterfingers!', 1.8);
  S.snatched = (S.snatched || 0) + 1;
}

/* ---------- meteors: a glowing ring on the ground first, then BOOM ---------- */
// x is open ground: no pit, obstacle, flag or nest within pad
function tthDinoOpen(ph, x, pad) {
  for (const o of ph.c.obs) if (!o.gone && x > o.x0 - pad && x < o.x1 + pad) return false;
  for (const f of ph.c.flags) if (Math.abs(f.x - x) < pad) return false;
  return x < ph.c.nest.x - 150 - pad && x > ph.fire.x + 80;
}
function tthDinoMeteorAt(st, x, o = {}) {
  const ph = st.ph, K = TTHDINO.met;
  let ok = false;
  const stuck = G.players.filter(p => ph.P[p.id].post || ph.P[p.id].onVine).map(tthDinoCx);   // (they can't step away)
  for (const d of [0, 50, -50, 100, -100]) if (tthDinoOpen(ph, x + d, o.rock ? 120 : 26) && !stuck.some(sx => Math.abs(sx - (x + d)) < K.r + 40)) { x += d; ok = true; break; }
  if (!ok) return null;
  if (o.rock && Math.abs(tthDinoG0(ph, x - 34) - tthDinoG0(ph, x + 34)) > 8) return null;
  const warn = (o.warn || K.warn) + (ph.sleepy ? K.sleepyWarn - K.warn : 0);
  const m = { x, gy: tthDinoG0(ph, x), t: 0, warn, r: K.r, rock: !!o.rock, state: 'warn', bt: 0 };
  ph.mets.push(m); ph.metN++;
  return m;
}
function tthDinoMeteorTips(st, m) {
  const first = st.ph.metN <= 3;
  for (const p of G.players) {
    if (Math.abs(tthDinoCx(p) - m.x) > m.r + 110) continue;
    tthWarn(st, p.id, m.warn);
    tthDinoTip(st, p.id, 'meteor', first ? 'Meteor! Run out of the glowing ring!' : 'Out of the ring!', first ? 0 : 9, { life: m.warn + 0.3 });
  }
}
// a meteor at one of the players (they take turns), where that player is heading
function tthDinoMeteor(st) {
  const ph = st.ph, ps = G.players;
  ph.metWho = 1 - ph.metWho;
  for (const id of [ph.metWho, 1 - ph.metWho]) {
    const p = ps[id], P = ph.P[id], cx = tthDinoCx(p);
    if (P.post || P.onVine || tthDinoPitAt(ph, cx, 30)) continue;   // never at someone who can't step away
    const m = tthDinoMeteorAt(st, cx + clamp(p.vx, -150, 220) * 0.5 + (tthRand() - 0.4) * 50);
    if (!m) continue;
    ph.metWho = id; Sfx.play('tthDinoWhistle'); tthDinoMeteorTips(st, m);
    if (ph.metN === 1) tthSay(st, 'Look out below! Hee hee!', 1.8);
    return true;
  }
  return false;
}
// a meteor that lands in the path ahead and leaves a smoking rock to smash
function tthDinoRock(st) {
  const ph = st.ph, ps = G.players, lead = Math.max(tthDinoCx(ps[0]), tthDinoCx(ps[1]));
  const m = tthDinoMeteorAt(st, lead + 190 + tthRand() * 70, { rock: true });
  if (!m) return false;
  Sfx.play('tthDinoWhistle'); tthDinoMeteorTips(st, m);
  return true;
}
// three in a row over the pair: run out of the whole row
function tthDinoShower(st) {
  const ph = st.ph, ps = G.players, K = TTHDINO.met, hid = tthDinoHolder(ph);
  if (ps.some(p => ph.P[p.id].post || ph.P[p.id].onVine)) return false;
  const a = tthDinoCx(ps[0]), b = tthDinoCx(ps[1]), mid = Math.abs(a - b) > 260 && hid >= 0 ? tthDinoCx(ps[hid]) : (a + b) / 2;
  let n = 0, last = null;
  [-72, 30, 132].forEach((d, i) => { const m = tthDinoMeteorAt(st, mid + d + (tthRand() - 0.5) * 16, { warn: K.showerWarn + i * K.showerGap }); if (m) { n++; last = m; tthDinoMeteorTips(st, m); } });
  if (!n) return false;
  Sfx.play('tthDinoWhistle');
  if (!ph.showerN++) tthNews(st, 'Meteor shower! Run out of the whole row of rings!', false, 3);
  return true;
}
function tthDinoBoom(st, m) {
  const ph = st.ph, ps = G.players, e = ph.egg, S = tthStats(st);
  m.state = 'boom'; m.bt = 0;
  Sfx.play('tthDinoBoom'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.26);
  burst(m.x, m.gy - 8, '#ffb347', 14); burst(m.x, m.gy - 8, '#5a4650', 8);
  S.meteors = (S.meteors || 0) + 1;
  for (const p of ps) {
    const cx = tthDinoCx(p), f = tthDinoFeet(p);
    if (Math.abs(cx - m.x) > m.r + 4 || f < m.gy - 64 || f > m.gy + 50) continue;
    tthBonk(st, p, { kind: 'meteor', word: 'Bonk!', to: { x: cx, y: f } });
  }
  if (e.state === 'loose' && Math.abs(e.x - m.x) < m.r) { e.vy = -380; e.vx = (e.x >= m.x ? 1 : -1) * 90; e.rest = 0; }
  if (ph.scorch.length >= 10) ph.scorch.shift();
  ph.scorch.push({ x: m.x, y: m.gy });
  if (!m.rock || !tthDinoOpen(ph, m.x, 100)) return;
  // it stays as a smoking rock in the path (in course order, so the gates still work)
  const D = TTHDINO.rock, x0 = tthDinoCellX(ph.c, tthDinoCellOf(ph.c, m.x - D.w / 2));
  const o = { kind: 'rock', k: ph.k, x0, x1: x0 + D.w, base: m.gy, top: m.gy - D.h, hits: 0, need: D.hits, gone: false, cleared: false, gold: false, falls: 0, shake: 0.3, t: 0 };
  const obs = ph.c.obs; let i = 0;
  while (i < obs.length && obs[i].x0 < o.x0) i++;
  obs.splice(i, 0, o);
  tthDinoCells(ph.c, o.x0, o.x1, o.top);
  S.rocks = (S.rocks || 0) + 1;
  if (!ph.rockN++) tthNews(st, 'A meteor rock blocks the path! Smash it!', false, 3);
}
function tthDinoMeteors(st, dt) {
  const ph = st.ph;
  for (const m of ph.mets) {
    m.t += dt;
    if (m.state === 'warn' && m.t >= m.warn) tthDinoBoom(st, m);
    else if (m.state === 'boom') m.bt += dt;
  }
  if (ph.mets.length && ph.mets.some(m => m.state === 'boom' && m.bt > 0.5)) ph.mets = ph.mets.filter(m => !(m.state === 'boom' && m.bt > 0.5));
}

/* ---------- the fire wall: the pacer behind ---------- */
function tthDinoFire(st, dt) {
  const ph = st.ph, F = ph.fire, K = TTHDINO.fire, ps = G.players, e = ph.egg, S = tthStats(st);
  // it never passes 150 px before the first thing both have not got past, so waiting at a boulder is always safe
  const f = ph.c.flags[ph.k], gx = Math.min(ph.gate ? ph.gate.x0 : Infinity, f && !f.got ? f.x - 30 : Infinity, ph.c.nest.x - 60);
  const cap = gx - K.cap;
  if (!tthCalm(st) && ph.started) {
    let trail = Math.min(tthDinoCx(ps[0]), tthDinoCx(ps[1]));
    if (e.state === 'loose') trail = Math.min(trail, e.x);
    let v = K.v[Math.min(ph.k, 2)] * (ph.fireSlow ? K.slowK : 1);
    const gap = trail - F.x;
    if (gap > K.gap) v += (gap - K.gap) * K.catch;
    F.x = Math.min(F.x + v * dt, Math.max(F.x, cap));
  }
  const spot = () => {   // dry ground ahead of the flames
    let sx = Math.min(F.x + K.pop, gx - 40);
    const g = tthDinoPitAt(ph, sx, 26);
    if (g) sx = g.x0 - 30 > F.x + 50 ? g.x0 - 30 : g.x1 + 30;
    return sx;
  };
  const gold = () => { if (++ph.hot >= TTHDINO.goldHot && !ph.fireSlow) { ph.fireSlow = true; tthHelp(st, 'Gold help: the fire slows down!'); return true; } return false; };
  for (const p of ps) {
    if (tthDinoCx(p) > F.x + 16 || st.safe[p.id] > 0 || ph.end) continue;
    const sx = spot();
    if (tthBonk(st, p, { kind: 'fire', word: 'Hot foot!', to: { x: sx, y: tthDinoSup(ph, sx - p.w / 2, p.w) }, safe: 1.6 })) {
      S.hot = (S.hot || 0) + 1; F.x -= K.back; Sfx.play('tthDinoSizzle');
      if (!gold()) tthDinoTip(st, p.id, 'hot', 'Hot foot! Run from the fire!', 6);
    }
  }
  if (e.state === 'loose' && e.x < F.x + 34) {   // a hot egg hops ahead by itself
    e.x = F.x + 40; e.vx = 300; e.vy = -430; e.rest = 0; F.x -= K.back; Sfx.play('tthDinoSizzle');
    if (tthBump(st, { word: 'Hot egg!', x: e.x, y: e.y - 30, kind: 'fire' })) { S.hot = (S.hot || 0) + 1; gold(); }
  }
}

/* ---------- hints for whoever's turn it is, and gold help after a long time with no progress ---------- */
function tthDinoHints(st) {
  const ph = st.ph, ps = G.players, e = ph.egg, hid = tthDinoHolder(ph), o = ph.gate;
  if (tthCalm(st) || ph.end) return;
  if (e.state === 'loose' && e.rest > 0.5) {
    const k = Math.abs(tthDinoCx(ps[0]) - e.x) <= Math.abs(tthDinoCx(ps[1]) - e.x) ? 0 : 1;
    tthDinoTip(st, k, 'grab', 'Grab the egg! Walk into it.', 5);
    return;
  }
  if (hid < 0 || !o) return;
  const H = ps[hid], F = ps[1 - hid], hx = tthDinoCx(H), fx = tthDinoCx(F), fid = F.id;
  const hPast = tthDinoPast(o, hx, tthDinoFeet(H)), fPast = tthDinoPast(o, fx, tthDinoFeet(F));
  if (tthDinoBlocker(o)) {
    const nap = o.kind === 'nap';
    if (!fPast && fx > o.x0 - 80) tthDinoTip(st, fid, 'smash', nap ? 'Shoo it away! Tap ' + tthDinoAct(fid, 'shoo') : 'Smash it! Tap ' + tthDinoAct(fid, 'smash'), 8);
    else if (fPast && !hPast && hx > o.x0 - 60 && fx > o.x1 + 60) tthDinoTip(st, fid, 'back', 'Come back! ' + NAMES[hid] + ' can\'t get over it with the egg.', 9, { cpu: null });
    else if (!hPast && hx > o.x0 - 60) tthDinoTip(st, hid, 'hands', 'Hands full! ' + NAMES[fid] + (nap ? ' shoos it away.' : ' smashes it.'), 10, { cpu: null });
  } else if (o.kind === 'ledge' || o.kind === 'gap') {
    const up = o.kind === 'ledge';
    if (!hPast && hx > o.x0 - 60) {
      if (fPast && Math.abs(fx - hx) > TTHDINO.toss.range) tthDinoTip(st, fid, 'near', 'Too far for a toss! Go back to the edge.', 7, { cpu: null });
      else if (fPast) tthDinoTip(st, hid, 'toss', (up ? 'Toss the egg up: ' : 'Toss the egg across: ') + tthDinoAct(hid, 'toss'), 6);
      else tthDinoTip(st, hid, 'high', (up ? 'Too high with the egg! ' : 'Too wide with the egg! ') + NAMES[fid] + ' jumps first.', 10, { cpu: null });
    }
    if (!fPast && fx > o.x0 - 90) tthDinoTip(st, fid, 'jump', (up ? 'Jump up: ' : 'Jump across: ') + tthKey(fid, 'jump'), 8);
  } else if (o.kind === 'vine' && !o.tied) {
    if (!fPast && fx > o.x0 - 150 && !o.held) tthDinoTip(st, fid, 'vine', 'Hold ' + tthDinoAct(fid, 'pull') + ' at the post: pull the bridge tight!', 7);
    if (!hPast && hx > o.x0 - 70 && hx < o.x0 + 10) tthDinoTip(st, hid, 'cross', o.taut ? 'Go! Cross the bridge!' : 'Wait for the vine bridge...', 6, { cpu: null });
  }
}
function tthDinoStuck(st, dt) {
  const ph = st.ph, ps = G.players, e = ph.egg;
  if (tthCalm(st) || ph.end || !ph.started) return;
  const trail = Math.min(tthDinoCx(ps[0]), tthDinoCx(ps[1]));
  if (trail > ph.progBest + 40) { ph.progBest = trail; ph.progT = 0; return; }
  if ((ph.progT += dt) < TTHDINO.stuckT) return;
  ph.progT = 0; ph.progBest = trail;
  const hid = tthDinoHolder(ph), o = ph.gate;
  let id, text;
  if (hid < 0) { id = Math.abs(tthDinoCx(ps[0]) - e.x) <= Math.abs(tthDinoCx(ps[1]) - e.x) ? 0 : 1; text = 'Pick up the egg: walk into it!'; }
  else {
    const H = ps[hid], F = ps[1 - hid], fid = F.id;
    const hPast = o && tthDinoPast(o, tthDinoCx(H), tthDinoFeet(H)), fPast = o && tthDinoPast(o, tthDinoCx(F), tthDinoFeet(F));
    if (!o) { id = tthDinoCx(H) < tthDinoCx(F) ? hid : fid; text = ph.k >= 2 ? 'Run right to the nest! ▶' : 'Run right to the flag! ▶'; }
    else if (tthDinoBlocker(o)) { id = fid; text = 'Stand next to it and tap ' + tthDinoAct(fid, o.kind === 'nap' ? 'shoo' : 'smash') + '!'; }
    else if (o.kind === 'vine' && !o.tied) {
      if (o.taut && !hPast) { id = hid; text = 'Walk across the bridge now! ▶'; }
      else { id = fid; text = 'Stand at the post and HOLD ' + tthDinoAct(fid, 'pull') + '!'; }
    } else if (o.kind === 'vine') { id = hPast ? fid : hid; text = 'Walk across the bridge! ▶'; }
    else if (!fPast) { id = fid; text = (o.kind === 'ledge' ? 'Jump up the ledge: ' : 'Run and jump across: ') + tthKey(fid, 'jump'); }
    else if (!hPast) { id = hid; text = 'Look at ' + NAMES[fid] + ' and toss the egg: ' + tthDinoAct(hid, 'toss'); }
    else { id = hid; text = 'Carry the egg on! ▶'; }
  }
  // 1-player: the computer never holds things up this long; the person gets the hint instead
  if (tthDinoSolo(id)) { id = 1 - id; const ar = tthDinoCx(ps[1 - id]) >= tthDinoCx(ps[id]) ? ' ▶' : ' ◀'; text = hid === id ? 'Carry the egg to ' + NAMES[1 - id] + '!' + ar : hid < 0 ? 'Pick up the egg: walk into it!' : 'Run to ' + NAMES[1 - id] + ' and help!' + ar; }
  const first = o ? !o.gold : !ph.goldOpen;
  if (o) o.gold = true; else ph.goldOpen = true;
  if (first) tthHelp(st, 'Gold help: follow the gold arrow!', { id, hint: text, life: 5 });
  else tthDinoTip(st, id, 'gold', text, 0, { gold: true, life: 5 });
}

/* ---------- the start: a meteor whizzes past the Thief and he drops the egg ---------- */
function tthDinoIntro(st, dt) {
  const ph = st.ph, c = st.thief, e = ph.egg, I = ph.intro;
  I.t += dt;
  const at = (n, t) => I.step === n && I.t >= t && ++I.step;
  if (at(0, 0)) { tthSay(st, 'A T. rex egg! All MINE! Ha ha!', 1.6); c.pose = 'laugh'; }
  if (at(1, 0.8)) { I.streak = 0; Sfx.play('tthDinoWhistle'); }
  if (I.streak >= 0) I.streak += dt;
  if (at(2, 1.5)) {
    Sfx.play('tthDinoBoom'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.3);
    c.pose = 'shock'; c.hitT = 0.5; tthReact(st, 'shocked', 'YIKES! My egg!', 1.8); c.item = null;
    const cl = tthThiefPts(c).claw;
    burst(cl.x + 20, cl.y, '#ffb347', 14);
    e.state = 'fall'; e.by = ph.first; e.x = e.x0 = cl.x; e.y = e.y0 = cl.y + 16; e.t = 0; e.dur = 0.95; e.arc = 46;
    tthNews(st, 'An asteroid is coming! Carry the egg to its mother. Run from the fire!', false, 4.6);
  }
  if (I.step >= 3 && e.state === 'held') {
    ph.started = true; ph.th.mode = 'hover'; c.pose = 'idle'; ph.kT0 = st.phT;
    const h = e.by, f = 1 - h;
    tthPop(st, e.x, e.y - 30, 'Got it!', PCOL[h], 20);
    tthDinoTip(st, h, 'start', 'You carry the egg! It is heavy: run right ' + tthKey(h, 'right'), 0, { life: 4 });
    tthDinoTip(st, f, 'clear', 'You clear the way! Run ahead and smash: ' + tthDinoAct(f, 'smash'), 0, { life: 4 });
  }
}

/* ---------- the phase ---------- */
TTH_PHASES.dino = {
  setup(st, L) {
    const ph = st.ph, K = TTHDINO;
    ph.c = tthDinoCompile();
    ph.pits = ph.c.obs.filter(tthDinoPit);
    ph.first = L.def.first === 1 ? 1 : 0;
    ph.k = 0; ph.kT0 = 0; ph.started = false; ph.end = null; ph.gate = null;
    ph.P = [0, 1].map(() => ({ duck: false, post: null, onVine: null, lock: 0, hitCD: 0, swing: 0, waitCD: 0, safeX: 0, safeY: K.y0, word: 'smash' }));
    ph.tipT = [{}, {}]; ph.hintKey = ['', '']; ph.xb = [0, 0];
    ph.egg = { state: 'thief', by: ph.first, x: 0, y: 0, vx: 0, vy: 0, t: 0, rot: 0, rest: 0, x0: 0, y0: 0, dur: 1, arc: 0 };
    ph.th = { mode: 'intro', t: 0, aim: K.dive.aim, lostT: 0, x0: 0, y0: 0 };
    ph.intro = { t: 0, step: 0, streak: -1 };
    ph.mets = []; ph.metN = 0; ph.metWho = ph.first; ph.rockN = 0; ph.showerN = 0; ph.diveN = 0; ph.scorch = [];
    ph.atkT = TTHDINO_STRETCHES[0].first; ph.atkN = 0; ph.hot = 0; ph.bonks = 0; ph.fireSlow = false; ph.sleepy = false;
    ph.progT = 0; ph.progBest = -Infinity; ph.goldOpen = false; ph.pitHelp = 0; ph.tauntT = 12; ph.tauntN = 0; ph.factT = 0; ph.factN = 0;
    ph.fire = { x: K.fire.start }; ph.later = null;
    G.players.forEach((p, k) => {
      const x = 150 + k * 52;
      p.x = x - p.w / 2; p.y = tthDinoG(ph, x) - p.h; p.vx = 0; p.vy = 0; p.grounded = true; p.face = 1; ph.P[k].safeX = x;
    });
    st.cam = { x: 0, y: 0 };
    tthDinoCam(st, true);
    Object.assign(st.thief, { x: st.cam.x + 740, y: st.cam.y + 238, s: K.dive.s, jet: true, face: -1, pose: 'laugh', item: 'egg', claw: 0.5, hidden: false });
    for (const p of G.players) { p.x -= st.cam.x; p.y -= st.cam.y; }   // (setup runs in screen coords)
    tthStats(st).stretchT = [];
  },
  wait(st, dt) { tthDinoStill(st, dt); tthDinoCam(st, false, dt); tthDinoThief(st, dt); },
  // the era card of the NEXT era never shows this scene; this runs during the portal cutscene (the core moves the Thief)
  coast(st, dt) {
    const ph = st.ph;
    tthDinoStill(st, dt); tthDinoEgg(st, dt); tthDinoMeteors(st, dt); tthDinoCam(st, false, dt);
    if (ph.end) { ph.end.t += dt; ph.end.roarT += dt; ph.c.nest.t += dt; }
    for (const o of ph.c.obs) { if (o.shake > 0) o.shake -= dt; if (o.runT != null) o.runT += dt; }
  },
  step(st, dt) {
    const ph = st.ph, ps = G.players;
    if (!ph.started) tthDinoIntro(st, dt);
    tthDinoActs(st, dt);
    ph.xb[0] = ps[0].x; ph.xb[1] = ps[1].x;
    for (const p of ps) tthDinoBody(st, p, dt, !!ph.end);
    tthDinoLeash(st, ph.xb);
    tthDinoEgg(st, dt);
    tthDinoGates(st);
    // the Thief's tricks, one at a time
    const th = ph.th;
    if (!tthCalm(st) && ph.started && !ph.end) {
      ph.atkT -= dt;
      const busyNow = ph.mets.some(m => m.state === 'warn') || th.mode === 'aim' || th.mode === 'dive' || ph.egg.state === 'fly';
      if (ph.atkT <= 0 && !busyNow) {
        const S = TTHDINO_STRETCHES[ph.k], kind = S.pattern[ph.atkN % S.pattern.length];
        const ok = kind === 'T' ? tthDinoDive(st) || tthDinoMeteor(st) : kind === 'R' ? tthDinoRock(st) || tthDinoMeteor(st) : kind === 'S' ? tthDinoShower(st) || tthDinoMeteor(st) : tthDinoMeteor(st);
        if (ok) ph.atkN++;
        ph.atkT = ok ? S.every * (0.85 + 0.3 * tthRand()) * (ph.sleepy ? 1.4 : 1) : 0.7;
      }
      if (ph.factT > 0 && (ph.factT -= dt) <= 0 && !st.news) tthNews(st, ph.k === 1 ? 'True: the asteroid was about 10 km wide!' : 'True: it hit near today\'s Mexico, 66 million years ago.', false, 4);
    } else if (st.idle || st.celebT > 0) {   // a calm moment: nothing is on its way
      if (ph.mets.some(m => m.state === 'warn')) ph.mets = ph.mets.filter(m => m.state !== 'warn');
      if (th.mode === 'aim' || th.mode === 'dive') { th.mode = 'rise'; th.t = 0; st.warn[0] = st.warn[1] = 0; }
    }
    if (ph.later && (ph.later.t -= dt) <= 0) { if (!ph.end) tthSay(st, ph.later.text, 2.4); ph.later = null; }
    tthDinoMeteors(st, dt);
    tthDinoFire(st, dt);
    tthDinoHints(st);
    tthDinoStuck(st, dt);
    tthDinoFlags(st);
    tthDinoNest(st, dt);
    for (const f of ph.c.flags) if (f.got) f.t += dt;
    for (const o of ph.c.obs) { if (o.shake > 0) o.shake -= dt; if (o.runT != null) o.runT += dt; }
    tthDinoCam(st, false, dt);
    if (!st.cut) tthDinoThief(st, dt);
  },
  // a meteor or the claw knocks the egg out of the carrier's hands; 3 of those in a stretch make the Thief sleepy
  onBonk(st, p, kind) {
    const ph = st.ph;
    if (kind !== 'meteor' && kind !== 'snatch') return;
    tthDinoDrop(st, p);
    if (++ph.bonks >= TTHDINO.goldBonks && !ph.sleepy) { ph.sleepy = true; tthHelp(st, 'Gold help: sleepy Thief! Slower meteors, slower dives.'); }
  },
  labels(st) { return [tthDinoWord(st, 0), tthDinoWord(st, 1)]; },
  jobKeys(st) { const e = st.ph.egg; return !e || e.state === 'loose' || e.state === 'nest' ? null : e.by === 0 ? ['carrier', 'clearer'] : ['clearer', 'carrier']; },
  roles(st) { const e = st.ph.egg; return e.state === 'loose' || e.state === 'nest' ? null : e.by === 0 ? ['Carry!', 'Clear!'] : ['Clear!', 'Carry!']; },
  legend() {
    return { pip: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump <kbd>S</kbd> duck', bo: '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump <kbd>↓</kbd> duck', padDown: 'down ducks' };
  },
  hudText(st) { return 'Stretch ' + Math.min(3, st.ph.k + 1) + '/3'; },
  progress(st) { return { n: Math.min(3, st.ph.k), of: 3 }; },
  headLift(st, p) { const ph = st.ph; return tthDinoHolder(ph) === p.id ? (ph.P[p.id].duck ? 12 : 30) : 0; },
  drawBack(st) { tthDinoDrawBack(st); },
  draw(st) { tthDinoDrawMid(st); },
  drawTop(st) { tthDinoDrawTop(st); },
  hud(st) { tthDinoHud(st); },
};

/* ---------- drawing ---------- */
const TTHDINOC = { rex: '#6fae5a', rexDk: '#4d8746', rexLt: '#e9e2ac', tri: '#e0a25a', triDk: '#b97a3a', triLt: '#f6dfae', stone: '#9aa0a8', stoneLt: '#c3c8ce', stoneDk: '#6c727c',
  wood: '#a8703c', woodDk: '#7a4d28', woodLt: '#d9a066', vine: '#5a9a48', vineDk: '#3d7335', bone: '#f3ecd6', boneDk: '#cfc4a2', tar: '#241c2e', hot: '#5a4650' };
const tthDinoRgbs = {};
function tthDinoRgb(hex) { return tthDinoRgbs[hex] || (tthDinoRgbs[hex] = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]); }
function tthDinoMix(a, b, u) {
  const A = tthDinoRgb(a), B = tthDinoRgb(b);
  return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * u) + ',' + Math.round(A[1] + (B[1] - A[1]) * u) + ',' + Math.round(A[2] + (B[2] - A[2]) * u) + ')';
}
const tthDinoMix3 = (a, b, c, u) => (u < 0.5 ? tthDinoMix(a, b, u * 2) : tthDinoMix(b, c, u * 2 - 1));
// a little running dinosaur silhouette (the herds in the background), feet at (x, y), running right
function tthDinoRunner(x, y, s, t, long) {
  ctx.save(); ctx.translate(x, y - Math.abs(Math.sin(t * 9)) * 3 * s); ctx.scale(s, s);
  ctx.beginPath(); ctx.ellipse(0, -16, 15, 9, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-10, -20); ctx.quadraticCurveTo(-30, -24, -40, -14); ctx.quadraticCurveTo(-26, -15, -10, -11); ctx.fill();   // tail
  if (long) { ctx.beginPath(); ctx.moveTo(8, -22); ctx.quadraticCurveTo(20, -44, 28, -52); ctx.lineTo(38, -50); ctx.lineTo(36, -44); ctx.quadraticCurveTo(26, -40, 14, -12); ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(8, -22); ctx.lineTo(18, -34); ctx.lineTo(32, -33); ctx.lineTo(30, -26); ctx.lineTo(18, -24); ctx.lineTo(13, -12); ctx.fill(); }
  const sw = Math.sin(t * 18) * 7;
  ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-3, -10); ctx.lineTo(-3 + sw, 0); ctx.moveTo(5, -10); ctx.lineTo(5 - sw, 0); ctx.stroke();
  ctx.restore();
}
function tthDinoDrawAsteroid(st, d, t) {
  const ph = st.ph, cut = st.cut && ph.end ? st.cut.t : 0, fall = clamp((cut - 1.2) / 1.5, 0, 1);
  const x = 150 + 170 * d + (300 - 170 * d) * fall * fall, y = 118 + 44 * d + (280 - 44 * d) * fall * fall, r = (9 + 40 * d) * (1 - 0.5 * fall);
  const gl = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3.2);
  gl.addColorStop(0, 'rgba(255,220,140,0.75)'); gl.addColorStop(1, 'rgba(255,160,80,0)');
  ctx.fillStyle = gl; circle(x, y, r * 3.2); ctx.fill();
  // the fiery tail (it comes from the upper left)
  const fl = 1 + Math.sin(t * 13) * 0.08;
  ctx.fillStyle = 'rgba(255,170,70,0.75)'; ctx.beginPath(); ctx.moveTo(x - r * 6.2 * fl, y - r * 4.4 * fl); ctx.lineTo(x + r * 0.5, y - r * 0.95); ctx.lineTo(x - r * 0.95, y + r * 0.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,180,0.85)'; ctx.beginPath(); ctx.moveTo(x - r * 3.6 * fl, y - r * 2.6 * fl); ctx.lineTo(x + r * 0.2, y - r * 0.7); ctx.lineTo(x - r * 0.7, y + r * 0.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6a4a48'; ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(1.5, r * 0.09); circle(x, y, r); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#4f3436'; circle(x - r * 0.3, y - r * 0.2, r * 0.26); ctx.fill(); circle(x + r * 0.3, y + r * 0.34, r * 0.18); ctx.fill(); circle(x + r * 0.34, y - r * 0.4, r * 0.12); ctx.fill();
  ctx.strokeStyle = 'rgba(255,200,110,0.95)'; ctx.lineWidth = Math.max(2, r * 0.16); ctx.beginPath(); ctx.arc(x, y, r * 0.96, -0.3, Math.PI * 0.8); ctx.stroke();
  if (cut > 2.55) {   // far away, as they leave: the flash on the horizon
    const k = clamp((cut - 2.55) / 0.9, 0, 1), fg = ctx.createRadialGradient(450, 400, 10, 450, 400, 80 + 700 * k);
    fg.addColorStop(0, 'rgba(255,255,240,' + 0.95 * k + ')'); fg.addColorStop(0.5, 'rgba(255,230,160,' + 0.6 * k + ')'); fg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
  }
}
function tthDinoDrawBack(st) {
  const ph = st.ph, cam = st.cam, t = G.clock, c = ph.c;
  const d = clamp((cam.x + W / 2) / c.nest.x, 0, 1), burn = clamp((d - 0.3) / 0.5, 0, 1);
  tthScreen(st, () => {
    tthSky(tthDinoMix3('#63c3e6', '#e98f58', '#5c2238', d), tthDinoMix3('#fff0bd', '#ffd58a', '#ff7a3d', d));
    tthDinoDrawAsteroid(st, d, t);
    // the volcano far away, smoking more and more
    const vx = 770 - cam.x * 0.035, vy = 396 - cam.y * 0.06;
    for (let k = 0; k < 6; k++) {
      const u = (t * 0.07 + k / 6) % 1, sr = 16 + u * 40;
      ctx.fillStyle = tthDinoMix('#f2efe6', '#4a3a44', clamp(d * 1.2, 0, 1)); ctx.globalAlpha = 0.55 * (1 - u);
      circle(vx + Math.sin(k * 2.1 + u * 3) * 16 - u * 70, vy - 196 - u * 150, sr); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = tthDinoMix3('#8fb3c4', '#8a5a62', '#3c2430', d);
    ctx.beginPath(); ctx.moveTo(vx - 230, vy + 10); ctx.quadraticCurveTo(vx - 90, vy - 60, vx - 40, vy - 190); ctx.lineTo(vx + 40, vy - 190); ctx.quadraticCurveTo(vx + 90, vy - 60, vx + 240, vy + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,' + Math.round(150 + 50 * Math.sin(t * 3)) + ',70,' + (0.25 + 0.7 * d) + ')';
    ctx.beginPath(); ctx.ellipse(vx, vy - 190, 40, 7, 0, 0, Math.PI * 2); ctx.fill();
    if (d > 0.35) { ctx.strokeStyle = 'rgba(255,150,60,' + (d - 0.35) * 1.3 + ')'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(vx - 12, vy - 186); ctx.quadraticCurveTo(vx - 30, vy - 120, vx - 22, vy - 60); ctx.moveTo(vx + 16, vy - 186); ctx.quadraticCurveTo(vx + 44, vy - 130, vx + 60, vy - 80); ctx.stroke(); }
    // far hills
    for (const [par, base, amp, c0, c1] of [[0.1, 372, 30, '#9ed2ae', '#7a4048'], [0.2, 398, 22, '#7fc394', '#5a2c36']]) {
      ctx.fillStyle = tthDinoMix(c0, c1, d);
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 24) { const wx = x + cam.x * par; ctx.lineTo(x, base - cam.y * par * 0.6 + Math.sin(wx * 0.006 + par * 9) * amp + Math.sin(wx * 0.017) * amp * 0.4); }
      ctx.lineTo(W, H); ctx.fill();
    }
    // pterosaurs gliding the same way
    ctx.fillStyle = tthDinoMix('#4a5a78', '#2a1a2a', d);
    for (let k = 0; k < 3; k++) {
      const px = ((k * 371 + t * (46 + k * 13) - cam.x * 0.12) % (W + 200) + W + 200) % (W + 200) - 100, py = 128 + k * 34 + Math.sin(t * 1.3 + k * 2) * 10, fp = Math.sin(t * 5 + k * 1.7) * 9, s = 0.8 + k * 0.15;
      ctx.beginPath(); ctx.moveTo(px - 22 * s, py - fp * s); ctx.quadraticCurveTo(px - 8 * s, py - 3 * s, px, py + 2 * s); ctx.quadraticCurveTo(px + 8 * s, py - 3 * s, px + 22 * s, py - fp * s); ctx.quadraticCurveTo(px + 8 * s, py + 3 * s, px + 2 * s, py + 5 * s); ctx.lineTo(px - 2 * s, py + 5 * s); ctx.quadraticCurveTo(px - 8 * s, py + 3 * s, px - 22 * s, py - fp * s); ctx.fill();
      ctx.beginPath(); ctx.moveTo(px + 2 * s, py); ctx.lineTo(px + 15 * s, py + 2 * s); ctx.lineTo(px + 3 * s, py + 5 * s); ctx.lineTo(px - 9 * s, py - 4 * s); ctx.fill();
    }
    // the tree line (palms and monkey-puzzle trees), burning later on
    const tc = tthDinoMix3('#3f9a68', '#4a6a48', '#2a1a22', d), ty = 410 - cam.y * 0.3;
    for (let i = Math.floor((cam.x * 0.35 - 100) / 130); i * 130 < cam.x * 0.35 + W + 100; i++) {
      const hs = hash(i, 31), x = i * 130 + hs % 70 - cam.x * 0.35, hgt = 70 + (hs >> 4) % 60, palm = (hs >> 9) % 3 !== 0;
      ctx.strokeStyle = tc; ctx.fillStyle = tc; ctx.lineWidth = 6.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, ty + 10); ctx.quadraticCurveTo(x + 8, ty - hgt * 0.5, x + 3, ty - hgt);   // (trunk and fronds: one path, one stroke)
      if (palm) for (let q = 0; q < 6; q++) { const a = -Math.PI * 0.95 + q * Math.PI * 0.18 + Math.sin(t * 1.5 + i + q) * 0.04; ctx.moveTo(x + 3, ty - hgt); ctx.quadraticCurveTo(x + 3 + Math.cos(a) * 26, ty - hgt + Math.sin(a) * 26 - 8, x + 3 + Math.cos(a) * 44, ty - hgt + Math.sin(a) * 30 + 10); }
      ctx.stroke();
      if (!palm) for (let q = 0; q < 3; q++) { const yy = ty - hgt + q * hgt * 0.24, ww = 16 + q * 9; ctx.beginPath(); ctx.moveTo(x + 3 - ww, yy + 14); ctx.quadraticCurveTo(x + 3, yy - 16, x + 3 + ww, yy + 14); ctx.quadraticCurveTo(x + 3, yy + 4, x + 3 - ww, yy + 14); ctx.fill(); }
      if (d > 0.55 && hs % 3 === 0) { const fl = 6 + Math.sin(t * 9 + i) * 2; ctx.fillStyle = 'rgba(255,150,50,0.85)'; ctx.beginPath(); ctx.ellipse(x + 3, ty - hgt - 4, fl, fl * 1.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,230,120,0.9)'; ctx.beginPath(); ctx.ellipse(x + 3, ty - hgt, fl * 0.5, fl * 0.9, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    // the near meadow, with the herds running the same way
    const my = 418 - cam.y * 0.5;
    ctx.fillStyle = tthDinoMix3('#5fb06a', '#7a8a4e', '#3c262c', d);
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 24) ctx.lineTo(x, my + Math.sin((x + cam.x * 0.5) * 0.011) * 7);
    ctx.lineTo(W, H); ctx.fill();
    ctx.fillStyle = ctx.strokeStyle = tthDinoMix3('#2f7a52', '#3a4a38', '#1f141c', d);
    for (let k = 0; k < 7; k++) {
      const hx = ((k * 211 + t * (64 + (k % 3) * 16) - cam.x * 0.5) % (W + 260) + W + 260) % (W + 260) - 130;
      tthDinoRunner(hx, my + 10 + (k % 2) * 7, 0.62 + (k % 3) * 0.14, t + k * 0.37, k % 3 === 0);
    }
  });
  tthDinoDrawGround(st, burn, t);
  // scorch marks where meteors hit
  for (const s of ph.scorch) if (s.x > cam.x - 60 && s.x < cam.x + W + 60) { ctx.fillStyle = 'rgba(30,20,26,0.45)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 3, 40, 7, 0, 0, Math.PI * 2); ctx.fill(); }
  for (const o of c.obs) if (o.x1 > cam.x - 160 && o.x0 < cam.x + W + 160) tthDinoDrawObs(st, o, t);
  for (const f of c.flags) if (f.x > cam.x - 80 && f.x < cam.x + W + 80) tthDinoDrawFlag(f, t);
  if (c.nest.x < cam.x + W + 420) tthDinoDrawNest(st, t);
}
function tthDinoDrawGround(st, burn, t) {
  const ph = st.ph, cam = st.cam, K = TTHDINO, c = ph.c, h = c.h0;
  const c0 = tthDinoCellOf(c, cam.x - 40), c1 = tthDinoCellOf(c, cam.x + W + 40), bot = cam.y + H + 20;
  const pts = [];
  for (let i = c0; i <= c1; i++) {
    if (i > c0 && Math.abs(h[i] - h[i - 1]) > K.stepUp) { pts.push([tthDinoCellX(c, i), h[i - 1]]); pts.push([tthDinoCellX(c, i), h[i]]); }
    else if ((i - c0) % 3 === 0 || i === c1) pts.push([tthDinoCellX(c, i) + K.cell / 2, h[i]]);
  }
  const x0 = tthDinoCellX(c, c0), x1 = tthDinoCellX(c, c1 + 1);
  const path = () => { ctx.beginPath(); ctx.moveTo(x0, bot); ctx.lineTo(x0, pts[0][1]); for (const q of pts) ctx.lineTo(q[0], q[1]); ctx.lineTo(x1, pts[pts.length - 1][1]); ctx.lineTo(x1, bot); ctx.closePath(); };
  const g = ctx.createLinearGradient(0, cam.y + 300, 0, cam.y + H);
  g.addColorStop(0, tthDinoMix('#b9783f', '#54404a', burn)); g.addColorStop(1, tthDinoMix('#7a4a28', '#2a1f28', burn));
  ctx.fillStyle = g; path(); ctx.fill();
  ctx.save(); path(); ctx.clip();
  for (let x = Math.floor((cam.x - 40) / 52) * 52; x < cam.x + W + 40; x += 52) {   // stones and old bones in the earth
    const hs = hash(x, 13), gy = tthDinoG0(ph, x);
    ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.beginPath(); ctx.ellipse(x + hs % 22, gy + 30 + (hs >> 5) % 50, 8 + hs % 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(28,26,54,0.16)'; ctx.beginPath(); ctx.ellipse(x + 24 + (hs >> 3) % 16, gy + 66 + (hs >> 8) % 40, 10, 4.5, 0.3, 0, Math.PI * 2); ctx.fill();
    if (burn > 0.45 && hs % 3 === 0) {   // glowing cracks on the volcano's slope
      ctx.strokeStyle = 'rgba(255,140,50,' + (0.4 + 0.3 * Math.sin(t * 2 + x * 0.05)) * burn + ')'; ctx.lineWidth = 2.5; ctx.beginPath();
      let qx = x + 10, qy = gy + 8; ctx.moveTo(qx, qy);
      for (let n = 0; n < 4; n++) { qx += (hash(x, n) % 17) - 8; qy += 10 + hash(n, x) % 9; ctx.lineTo(qx, qy); }
      ctx.stroke();
    }
    // (art pass) a pebble with a lit top in the earth, hair roots under the turf, and now and then a fossil shell
    const px = x + 30 + (hs >> 11) % 14, py = gy + 20 + (hs >> 14) % 34, pr = 3 + (hs >> 17) % 4;
    ctx.fillStyle = tthDinoMix('#c89466', '#4a3a42', burn); ctx.beginPath(); ctx.ellipse(px, py, pr * 1.3, pr, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(40,26,40,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,210,0.45)'; ctx.beginPath(); ctx.ellipse(px - pr * 0.3, py - pr * 0.35, pr * 0.6, pr * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(70,40,20,0.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 8, gy + 6); ctx.quadraticCurveTo(x + 12, gy + 14, x + 6, gy + 22); ctx.moveTo(x + 10, gy + 12); ctx.lineTo(x + 16, gy + 18); ctx.stroke();
    if (hs % 5 === 1) {
      const fx = x + 14 + (hs >> 4) % 20, fy = gy + 50 + (hs >> 9) % 30;
      ctx.strokeStyle = 'rgba(255,236,200,0.4)'; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let a = 0; a < 12; a += 0.4) { const r = 1 + a * 0.75; const qx = fx + Math.cos(a) * r, qy = fy + Math.sin(a) * r * 0.8; if (a === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy); }
      ctx.stroke();
    }
  }
  // soft strata bands that follow the ground's line
  for (const [dy, th, col] of [[38, 9, 'rgba(255,220,170,0.10)'], [76, 14, 'rgba(60,30,20,0.13)'], [118, 8, 'rgba(255,220,170,0.08)']]) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1] + dy); for (const q of pts) ctx.lineTo(q[0], q[1] + dy);
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + dy + th); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // the grass (ash later) along the top, and the ink line
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = tthDinoMix('#63bf55', '#6b5a58', burn); ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1] + 4); for (const q of pts) ctx.lineTo(q[0], q[1] + 4); ctx.stroke();
  ctx.strokeStyle = 'rgba(30,70,30,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1] + 8); for (const q of pts) ctx.lineTo(q[0], q[1] + 8); ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts) ctx.lineTo(q[0], q[1]); ctx.stroke();
  // (art pass) blades of grass standing up along the top, lit at the tips
  if (burn < 0.75) {
    ctx.lineWidth = 1.8; ctx.strokeStyle = tthDinoMix('#4aa84a', '#6b5a58', burn); ctx.beginPath();
    for (let x = Math.floor((cam.x - 40) / 9) * 9; x < cam.x + W + 40; x += 9) { const gy = tthDinoG0(ph, x); if (Math.abs(gy - tthDinoG0(ph, x + 6)) > 2) continue; const hb = 4 + hash(x, 71) % 6; ctx.moveTo(x, gy - 1); ctx.lineTo(x + 1.5 - (hash(x, 72) % 3), gy - hb); }
    ctx.stroke();
    ctx.strokeStyle = tthDinoMix('#9ae07a', '#6b5a58', burn); ctx.lineWidth = 1.2; ctx.beginPath();
    for (let x = Math.floor((cam.x - 40) / 9) * 9 + 4; x < cam.x + W + 40; x += 18) { const gy = tthDinoG0(ph, x); if (Math.abs(gy - tthDinoG0(ph, x + 6)) > 2) continue; ctx.moveTo(x, gy - 2); ctx.lineTo(x + 1, gy - 6 - hash(x, 73) % 4); }
    ctx.stroke();
  }
  // plants and bones on the ground (a pure function of x), away from the things in the way
  for (let x = Math.floor((cam.x - 40) / 64) * 64; x < cam.x + W + 40; x += 64) {
    const hs = hash(x, 5), kind = hs % 8, dx = x + (hs >> 4) % 34;
    if (c.obs.some(o => !o.gone && dx > o.x0 - 34 && dx < o.x1 + 34) || Math.abs(tthDinoG0(ph, dx - 10) - tthDinoG0(ph, dx + 10)) > 6) continue;
    const gy = tthDinoG0(ph, dx), sw = Math.sin(t * 1.8 + x) * 2;
    if (kind <= 2) {   // a fern (a burnt stick later)
      if (burn > 0.75) { ctx.strokeStyle = '#2a1f28'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(dx, gy); ctx.lineTo(dx + 3, gy - 16); ctx.moveTo(dx + 2, gy - 9); ctx.lineTo(dx + 9, gy - 15); ctx.stroke(); continue; }
      ctx.strokeStyle = tthDinoMix('#2f8f4a', '#5a4a3a', burn); ctx.lineWidth = 3.5;
      ctx.beginPath();
      for (let q = -2; q <= 2; q++) { ctx.moveTo(dx, gy); ctx.quadraticCurveTo(dx + q * 6 + sw, gy - 16 - (kind * 4), dx + q * 11 + sw * 2, gy - 12 - kind * 3 + Math.abs(q) * 5); }
      ctx.stroke();
    } else if (kind === 3) {   // a bone
      ctx.strokeStyle = C.ink; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(dx - 9, gy - 4); ctx.lineTo(dx + 9, gy - 6); ctx.stroke();
      ctx.strokeStyle = TTHDINOC.bone; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(dx - 9, gy - 4); ctx.lineTo(dx + 9, gy - 6); ctx.stroke();
      ctx.fillStyle = TTHDINOC.bone; for (const [bx, by] of [[-10, -6], [-10, -2], [10, -8], [10, -4]]) { circle(dx + bx, gy + by, 3); ctx.fill(); }
    } else if (kind === 4) {   // pebbles
      ctx.fillStyle = tthDinoMix('#b8bcc4', '#5a4a52', burn); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(dx, gy - 3, 7, 5, 0, Math.PI, 0); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(dx + 11, gy - 2, 4, 3, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
    } else if (kind === 5 && burn < 0.6) {   // toadstools
      ctx.fillStyle = '#f6efd8'; ctx.fillRect(dx - 2, gy - 9, 4, 9); ctx.fillStyle = '#ff7a6a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(dx, gy - 9, 8, 6, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; circle(dx - 3, gy - 12, 1.4); ctx.fill(); circle(dx + 3, gy - 11, 1.2); ctx.fill();
    } else if (kind === 6 && burn > 0.5) {   // a steam vent
      ctx.fillStyle = '#2a1f28'; ctx.beginPath(); ctx.ellipse(dx, gy, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      for (let n = 0; n < 3; n++) { const u = (t * 0.8 + n / 3 + (hs % 10) / 10) % 1; ctx.fillStyle = 'rgba(230,220,235,' + 0.4 * (1 - u) + ')'; circle(dx + Math.sin(u * 6 + n) * 5, gy - 6 - u * 46, 4 + u * 7); ctx.fill(); }
    }
  }
}
// cracks on something being smashed: more with every hit
function tthDinoCracks(cx, cy, w, hgt, k) {
  if (k <= 0) return;
  ctx.strokeStyle = 'rgba(28,26,54,0.85)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const n = Math.ceil(k * 5);
  for (let q = 0; q < n; q++) {
    const a = q * 2.4 + 0.6, len = (0.25 + 0.2 * (q % 3)) * Math.min(w, hgt);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * len * 0.5 + 4, cy + Math.sin(a) * len * 0.5); ctx.lineTo(cx + Math.cos(a + 0.3) * len, cy + Math.sin(a + 0.3) * len); ctx.stroke();
  }
}
function tthDinoDrawObs(st, o, t) {
  const ph = st.ph, cl = 1 - Math.max(0, tthDinoHolder(ph)), w = o.x1 - o.x0, hgt = o.base - o.top, mid = (o.x0 + o.x1) / 2;
  const sh = o.shake > 0 ? Math.sin(o.shake * 70) * 4 * (o.shake / 0.22) : 0;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (o.kind === 'ledge') {   // a rock face with ferny grips (just for looks) and an arrow of pebbles
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(o.x0, o.top + 4, 7, hgt - 4);
    ctx.strokeStyle = 'rgba(28,26,54,0.4)'; ctx.lineWidth = 2;
    for (let y = o.top + 20, n = 0; y < o.base - 6; y += 20, n++) { ctx.beginPath(); ctx.moveTo(o.x0, y); ctx.lineTo(o.x0 + 30 + (n % 2) * 16, y + 2); ctx.stroke(); }
    return;
  }
  if (tthDinoPit(o)) { tthDinoDrawPit(st, o, t); return; }
  if (o.kind === 'nap') { tthDinoDrawNap(st, o, t); return; }
  if (o.gone) return;
  ctx.save(); ctx.translate(mid + sh, o.base);
  ctx.fillStyle = 'rgba(28,26,54,0.22)'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.6, 6, 0, 0, Math.PI * 2); ctx.fill();
  if (o.kind === 'boulder') {
    ctx.fillStyle = TTHDINOC.stone; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-w / 2 - 4, 0); ctx.quadraticCurveTo(-w / 2 - 12, -hgt * 0.5, -w / 2 + 6, -hgt * 0.84); ctx.quadraticCurveTo(-6, -hgt - 10, w / 2 - 8, -hgt * 0.88); ctx.quadraticCurveTo(w / 2 + 14, -hgt * 0.5, w / 2 + 5, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = TTHDINOC.stoneLt; ctx.beginPath(); ctx.ellipse(-w * 0.16, -hgt * 0.72, w * 0.22, hgt * 0.1, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TTHDINOC.stoneDk; ctx.beginPath(); ctx.ellipse(w * 0.14, -hgt * 0.2, w * 0.3, hgt * 0.07, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TTHDINOC.vine; ctx.beginPath(); ctx.ellipse(-w * 0.2, -hgt * 0.93, 13, 5, -0.3, 0, Math.PI * 2); ctx.fill();   // moss
    tthDinoCracks(0, -hgt * 0.5, w, hgt, o.hits / o.need);
  } else if (o.kind === 'log') {
    ctx.fillStyle = TTHDINOC.wood; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    rr(-w / 2 - 6, -hgt, w + 12, hgt, 22); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = TTHDINOC.woodDk; ctx.lineWidth = 2.5; for (const by of [-hgt * 0.72, -hgt * 0.45, -hgt * 0.2]) { ctx.beginPath(); ctx.moveTo(-w / 2 + 22, by); ctx.lineTo(w / 2 - 6, by + 2); ctx.stroke(); }
    ctx.fillStyle = TTHDINOC.woodLt; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(-w / 2 + 6, -hgt / 2, 13, hgt / 2 - 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = TTHDINOC.woodDk; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-w / 2 + 6, -hgt / 2, 7, hgt / 4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ff7a6a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(w * 0.22, -hgt - 3, 9, 6, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    tthDinoCracks(6, -hgt * 0.5, w, hgt * 1.6, o.hits / o.need);
  } else {   // a meteor rock: dark, with glowing cracks and smoke
    for (let n = 0; n < 3; n++) { const u = (t * 0.7 + n / 3) % 1; ctx.fillStyle = 'rgba(70,60,70,' + 0.5 * (1 - u) + ')'; circle(Math.sin(u * 5 + n) * 8, -hgt - 6 - u * 50, 6 + u * 9); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,140,50,0.3)'; ctx.beginPath(); ctx.ellipse(0, -hgt / 2, w * 0.66, hgt * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TTHDINOC.hot; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-w / 2 - 2, 0); ctx.lineTo(-w / 2 - 6, -hgt * 0.55); ctx.lineTo(-w * 0.22, -hgt - 3); ctx.lineTo(w * 0.24, -hgt + 1); ctx.lineTo(w / 2 + 6, -hgt * 0.5); ctx.lineTo(w / 2 + 2, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,' + (170 + Math.round(Math.sin(t * 8) * 40)) + ',70,0.95)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-w * 0.3, -hgt * 0.3); ctx.lineTo(-w * 0.08, -hgt * 0.5); ctx.lineTo(-w * 0.14, -hgt * 0.8); ctx.moveTo(w * 0.1, -hgt * 0.2); ctx.lineTo(w * 0.26, -hgt * 0.55); ctx.stroke();
    tthDinoCracks(0, -hgt * 0.45, w, hgt, o.hits / o.need);
  }
  ctx.restore();
  // hits left, as pips in the clearer's colour (so everybody sees whose job it is)
  if (o.hits > 0 || ph.gate === o) {
    const n = o.need, y = o.top - 16;
    for (let q = 0; q < n; q++) { ctx.fillStyle = q < n - o.hits ? PCOL[cl] : 'rgba(28,26,54,0.35)'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; circle(mid + (q - (n - 1) / 2) * 13, y, 4.5); ctx.fill(); ctx.stroke(); }
  }
}
// the napping baby Triceratops (it trots off after the herd once shooed)
function tthDinoDrawNap(st, o, t) {
  const cam = st.cam, w = o.x1 - o.x0, run = o.gone ? o.runT || 0 : -1;
  let x = (o.x0 + o.x1) / 2, y = o.base, hop = 0;
  if (run >= 0) { hop = run < 0.35 ? Math.sin(run / 0.35 * Math.PI) * 30 : Math.abs(Math.sin(run * 11)) * 5; x += Math.max(0, run - 0.3) * 250; if (x > cam.x + W + 120) return; y = tthDinoG0(st.ph, x); }
  ctx.save(); ctx.translate(x, y - hop);
  if (run >= 0.2) ctx.scale(-1, 1);   // it turns round and runs right
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(0, hop, w * 0.5, 5, 0, 0, Math.PI * 2); ctx.fill();
  const br = run < 0 ? Math.sin(t * 2) * 1.5 : 0, lg = run >= 0.3 ? Math.sin(run * 22) * 7 : 0;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.fillStyle = TTHDINOC.triDk;
  for (const [lx, d] of [[-8, 1], [24, -1]]) { rr(lx - 6 + lg * d, -14, 12, 14, 5); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = TTHDINOC.tri;
  ctx.beginPath(); ctx.moveTo(30, -22); ctx.quadraticCurveTo(50, -24, 56, -8); ctx.quadraticCurveTo(42, -10, 30, -8); ctx.closePath(); ctx.fill(); ctx.stroke();   // tail
  ctx.beginPath(); ctx.ellipse(8, -26 - br, 30, 21 + br, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = TTHDINOC.triLt; ctx.beginPath(); ctx.ellipse(8, -15, 20, 8, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = TTHDINOC.triDk; ctx.beginPath(); ctx.ellipse(-16, -40 - br, 15, 21, -0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();   // the frill
  ctx.fillStyle = TTHDINOC.triLt; for (const a of [-2.6, -2.0, -1.4, -0.8]) { circle(-16 + Math.cos(a) * 13, -40 - br + Math.sin(a) * 19, 2.6); ctx.fill(); }
  ctx.fillStyle = TTHDINOC.tri; ctx.beginPath(); ctx.ellipse(-28, -24 - br, 17, 14, 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();   // the head
  ctx.fillStyle = TTHDINOC.bone;
  ctx.beginPath(); ctx.moveTo(-27, -36 - br); ctx.lineTo(-33, -50 - br); ctx.lineTo(-20, -37 - br); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-43, -25 - br); ctx.lineTo(-50, -33 - br); ctx.lineTo(-40, -30 - br); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2;
  if (run < 0) { ctx.beginPath(); ctx.arc(-28, -26 - br, 4, 0.15, Math.PI - 0.15); ctx.stroke(); }
  else { ctx.fillStyle = '#ffffff'; circle(-29, -27, 4.6); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.ink; circle(-30.5, -27, 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,120,140,0.5)'; circle(-36, -19 - br, 3); ctx.fill();
  ctx.restore();
  if (run < 0) for (let n = 0; n < 3; n++) { const u = (t * 0.5 + n / 3) % 1; ctx.save(); ctx.globalAlpha = 1 - u; text('z', x - 34 - u * 16 + Math.sin(u * 6) * 4, y - 62 - u * 34, 13 + n * 4, '#ffffff', 'center'); ctx.restore(); }
  if (run < 0 && st.ph.gate === o) { const cl = 1 - Math.max(0, tthDinoHolder(st.ph)); ctx.fillStyle = PCOL[cl]; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; circle(x + 12, o.top - 12, 4.5); ctx.fill(); ctx.stroke(); }
}
// a pit of tar (lava on the volcano), its vine bridge and posts, the gold stepping stone
function tthDinoDrawPit(st, o, t) {
  const K = TTHDINO, w = o.x1 - o.x0, y = o.base, lava = o.k === 2, sy = y + 26;
  const g = ctx.createLinearGradient(0, sy, 0, y + K.pit);
  if (lava) { g.addColorStop(0, '#ffe08a'); g.addColorStop(0.3, '#ff8a3d'); g.addColorStop(1, '#c2402a'); } else { g.addColorStop(0, '#4a3a5a'); g.addColorStop(0.3, TTHDINOC.tar); g.addColorStop(1, '#15101c'); }
  if (lava) { const hg = ctx.createLinearGradient(0, sy - 50, 0, sy); hg.addColorStop(0, 'rgba(255,140,60,0)'); hg.addColorStop(1, 'rgba(255,140,60,0.35)'); ctx.fillStyle = hg; ctx.fillRect(o.x0, sy - 50, w, 50); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(o.x0, sy);
  for (let x = o.x0; x <= o.x1; x += 8) ctx.lineTo(x, sy + Math.sin(x * 0.07 + t * 2.2) * 2);
  ctx.lineTo(o.x1, y + K.pit + 2); ctx.lineTo(o.x0, y + K.pit + 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = lava ? 'rgba(255,245,190,0.9)' : 'rgba(150,130,170,0.8)'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let x = o.x0; x <= o.x1; x += 8) { const yy = sy + Math.sin(x * 0.07 + t * 2.2) * 2; if (x === o.x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
  ctx.stroke();
  for (let n = 0; n < Math.round(w / 50); n++) {   // bubbles
    const u = (t * 0.6 + hash(n, o.x0) % 100 / 100) % 1, bx = o.x0 + 20 + (hash(o.x0, n) % (w - 40));
    if (u < 0.8) { ctx.fillStyle = lava ? 'rgba(255,235,150,0.9)' : 'rgba(120,100,140,0.9)'; circle(bx, sy + 14 - u * 12, 2 + u * 5); ctx.fill(); }
  }
  if (o.stone) {   // gold help: a stepping stone
    const sx0 = o.x0 + K.stoneGap, sw = w - 2 * K.stoneGap;
    ctx.fillStyle = '#d9b860'; ctx.strokeStyle = C.gold; ctx.lineWidth = 3; rr(sx0, y, sw, K.pit + 6, 8); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(sx0, y); ctx.lineTo(sx0 + sw, y); ctx.stroke();
  }
  if (o.kind !== 'vine') return;
  // the vine bridge: planks hang slack in the pit until someone pulls at the post
  const px = o.x0 - K.postX, fx = o.x1 + 22, sag = o.taut ? (1 - o.pull) * 16 : (1 - o.pull) * 62, n = Math.round(w / 26), col = PCOL[1 - Math.max(0, tthDinoHolder(st.ph))];
  const at = u => [o.x0 - 4 + (w + 8) * u, y - 3 + Math.sin(u * Math.PI) * sag + (o.creak ? Math.sin(t * 38 + u * 11) * 2.5 : o.pull >= 0.9 ? Math.sin(t * 3 + u * 9) * 0.8 : Math.sin(t * 2 + u * 5) * 2 * (1 - o.pull))];
  ctx.strokeStyle = TTHDINOC.vineDk; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px, y - 34);
  ctx.lineTo(o.x0 - 4, y - 3); for (let q = 0; q <= 12; q++) { const [ax, ay] = at(q / 12); ctx.lineTo(ax, ay); } ctx.lineTo(fx, y - 30); ctx.stroke();
  for (let q = 0; q < n; q++) {
    const [ax, ay] = at((q + 0.5) / n), [bx, by] = at((q + 0.9) / n), a = Math.atan2(by - ay, bx - ax);
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(a); ctx.fillStyle = TTHDINOC.woodLt; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(-11, -2, 22, 8, 3); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  for (const [qx, near] of [[px, true], [fx, false]]) {   // the posts (the near one is the handle)
    if (near && !o.tied) { ctx.fillStyle = 'rgba(255,197,61,' + (0.3 + 0.22 * Math.sin(t * 5)) + ')'; circle(qx, y - 30, 24); ctx.fill(); }
    ctx.fillStyle = TTHDINOC.wood; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(qx - 6, y - 44, 12, 46, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = near && !o.tied ? col : o.tied ? C.gold : TTHDINOC.vine; circle(qx, y - 44, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = TTHDINOC.vine; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(qx, y - 30, 8, 0.4, Math.PI * 1.6); ctx.stroke();
  }
  if (o.tied) { ctx.save(); ctx.globalAlpha = 0.9; text('✓', fx, y - 62, 18, C.gold, 'center'); ctx.restore(); }
}
function tthDinoDrawFlag(f, t) {
  const x = f.x, y = f.y, ph = 104;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - ph); ctx.stroke();   // a bone pole
  ctx.strokeStyle = TTHDINOC.bone; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - ph); ctx.stroke();
  ctx.fillStyle = TTHDINOC.bone; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(x - 4, y - ph - 2, 5); ctx.fill(); ctx.stroke(); circle(x + 4, y - ph - 2, 5); ctx.fill(); ctx.stroke();
  const wav = Math.sin(t * 6) * 4, fy = y - ph + 10, fw = 50;
  ctx.fillStyle = f.got ? C.gold : '#5fbf5a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;   // a big leaf for a flag
  ctx.beginPath(); ctx.moveTo(x + 3, fy); ctx.quadraticCurveTo(x + fw / 2, fy - 12 + wav, x + fw, fy + 10); ctx.quadraticCurveTo(x + fw / 2, fy + 26 + wav, x + 3, fy + 24); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = f.got ? '#b9850f' : '#2f8f4a'; ctx.beginPath(); ctx.moveTo(x + 5, fy + 12); ctx.quadraticCurveTo(x + fw / 2, fy + 8 + wav, x + fw - 4, fy + 10); ctx.stroke();
  text(String(f.k + 1), x + fw * 0.42, fy + 12, 15, '#ffffff', 'center');
}
// the mother T. rex: big and friendly (to Pip and Bo). Feet at (x, y); she looks left, at the pair.
function tthDinoDrawRex(x, y, t, o) {
  const roar = o.roar || 0, nuz = o.nuzzle || 0, br = Math.sin(t * 1.6) * 2;
  ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(28,26,54,0.22)'; ctx.beginPath(); ctx.ellipse(-10, 0, 110, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5;
  const leg = (lx, col) => {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(lx, -70, 26, 42, 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx - 2, -40); ctx.lineTo(lx - 14, -4); ctx.lineTo(lx + 34, -4); ctx.quadraticCurveTo(lx + 40, -12, lx + 26, -14); ctx.lineTo(lx + 16, -38); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = TTHDINOC.bone; for (const cx of [lx + 14, lx + 24, lx + 34]) { ctx.beginPath(); ctx.moveTo(cx - 4, -4); ctx.lineTo(cx, 3); ctx.lineTo(cx + 4, -4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  };
  leg(-34, TTHDINOC.rexDk);
  const tw = Math.sin(t * 2.2) * 8 + roar * 14;   // the tail
  ctx.fillStyle = TTHDINOC.rex;
  ctx.beginPath(); ctx.moveTo(-30, -162 + br); ctx.quadraticCurveTo(-120, -150, -196, -96 - tw); ctx.quadraticCurveTo(-120, -92, -36, -84); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-4, -124 + br, 64, 52, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = TTHDINOC.rexLt; ctx.beginPath(); ctx.ellipse(18, -104 + br, 34, 30, -0.4, -0.3, Math.PI * 0.85); ctx.fill();
  ctx.fillStyle = TTHDINOC.rexDk; for (const [sx, sy] of [[-50, -162], [-26, -172], [0, -174], [-84, -146], [-118, -128]]) { ctx.beginPath(); ctx.moveTo(sx - 8, sy + br); ctx.lineTo(sx + 2, sy + 16 + br); ctx.lineTo(sx + 10, sy + 1 + br); ctx.closePath(); ctx.fill(); }
  leg(4, TTHDINOC.rex);
  // the tiny arm
  ctx.strokeStyle = C.ink; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(44, -124 + br); ctx.lineTo(60, -108 + br + roar * -8); ctx.lineTo(70, -112 + br + roar * -10); ctx.stroke();
  ctx.strokeStyle = TTHDINOC.rex; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(44, -124 + br); ctx.lineTo(60, -108 + br + roar * -8); ctx.lineTo(70, -112 + br + roar * -10); ctx.stroke();
  // neck and head (the head swings up to roar, down to nuzzle the nest)
  ctx.save(); ctx.translate(30, -150 + br); ctx.rotate(-0.22 * roar + 0.95 * nuz);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.fillStyle = TTHDINOC.rex;
  ctx.beginPath(); ctx.moveTo(-22, 10); ctx.quadraticCurveTo(0, -40, 26, -78); ctx.lineTo(62, -44); ctx.quadraticCurveTo(36, -10, 24, 24); ctx.closePath(); ctx.fill(); ctx.stroke();
  const jaw = 0.08 + roar * 0.62 + Math.max(0, Math.sin(t * 2.4)) * 0.03;
  ctx.save(); ctx.translate(40, -50); ctx.rotate(jaw);   // the lower jaw
  ctx.fillStyle = TTHDINOC.rexLt; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(92, -2); ctx.quadraticCurveTo(100, 12, 84, 18); ctx.lineTo(4, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (roar > 0.2) { ctx.fillStyle = '#ff8fa0'; ctx.beginPath(); ctx.ellipse(46, 4, 30, 6, 0, Math.PI, 0); ctx.fill(); }
  ctx.fillStyle = '#ffffff'; for (let q = 0; q < 5; q++) { ctx.beginPath(); ctx.moveTo(26 + q * 13, -3); ctx.lineTo(31 + q * 13, -12); ctx.lineTo(36 + q * 13, -3); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = TTHDINOC.rex;   // the skull
  ctx.beginPath(); ctx.moveTo(18, -52); ctx.quadraticCurveTo(14, -98, 60, -100); ctx.lineTo(120, -92); ctx.quadraticCurveTo(142, -84, 138, -62); ctx.lineTo(132, -52); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; for (let q = 0; q < 6; q++) { ctx.beginPath(); ctx.moveTo(56 + q * 13, -53); ctx.lineTo(61 + q * 13, -43); ctx.lineTo(66 + q * 13, -53); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = TTHDINOC.rexDk; circle(126, -80, 3); ctx.fill();
  const happy = o.happy;   // kind eyes with lashes: worried until the egg is home
  ctx.fillStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(62, -80, 10, roar > 0.5 ? 7 : 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; circle(65 + (nuz ? 2 : 0), -79 + nuz * 3, 4.6); ctx.fill(); ctx.fillStyle = '#ffffff'; circle(66.5, -81, 1.6); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2; for (const a of [-2.3, -1.9, -1.5]) { ctx.beginPath(); ctx.moveTo(62 + Math.cos(a) * 10, -80 + Math.sin(a) * 11); ctx.lineTo(62 + Math.cos(a) * 16, -80 + Math.sin(a) * 17); ctx.stroke(); }
  ctx.lineWidth = 3; ctx.beginPath(); if (roar > 0.5) { ctx.moveTo(48, -98); ctx.lineTo(74, -92); } else if (happy) { ctx.moveTo(50, -96); ctx.quadraticCurveTo(62, -100, 74, -96); } else { ctx.moveTo(50, -92); ctx.lineTo(74, -98); } ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(84, -66, 6); ctx.fill();
  ctx.restore();
  ctx.restore();
}
function tthDinoDrawNest(st, t) {
  const ph = st.ph, n = ph.c.nest, E = ph.end, e = ph.egg;
  const roar = E && E.step >= 2 ? clamp(Math.min(E.roarT / 0.12, (1.3 - E.roarT) / 0.3), 0, 1) : 0;
  const nuz = E && E.step >= 2 ? clamp((E.roarT - 1.5) / 0.6, 0, 1) * (0.85 + 0.15 * Math.sin(t * 3)) : 0;
  tthDinoDrawRex(n.x + 200, n.y, t, { roar, nuzzle: nuz, happy: !!E });
  // the nest: a bowl of twigs and ferns with two more eggs
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  tthDinoDrawLootAt(n.x - 20, n.y - 22, 0.8, -0.2, t); tthDinoDrawLootAt(n.x + 22, n.y - 20, 0.8, 0.25, t);
  if (e.state === 'nest') tthDinoDrawLootAt(e.x, e.y, 0.95, e.rot + (E && E.landed ? Math.sin(t * 5) * 0.06 : 0), t);
  ctx.fillStyle = '#8a5a30'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(n.x - 56, n.y - 20); ctx.quadraticCurveTo(n.x, n.y - 4, n.x + 56, n.y - 20); ctx.quadraticCurveTo(n.x + 52, n.y + 2, n.x + 36, n.y + 2); ctx.lineTo(n.x - 36, n.y + 2); ctx.quadraticCurveTo(n.x - 52, n.y + 2, n.x - 56, n.y - 20); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#c99a5a'; ctx.lineWidth = 2.5; for (let q = 0; q < 7; q++) { const qx = n.x - 44 + q * 14.5; ctx.beginPath(); ctx.moveTo(qx, n.y - 12 + (q % 2) * 3); ctx.lineTo(qx + 12, n.y - 3 - (q % 3) * 2); ctx.stroke(); }
  ctx.strokeStyle = '#2f8f4a'; ctx.lineWidth = 3; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(n.x + s * 50, n.y - 14); ctx.quadraticCurveTo(n.x + s * 66, n.y - 30, n.x + s * 76, n.y - 20); ctx.stroke(); }
  if (!E) { const bob = Math.sin(t * 5) * 4; ctx.save(); ctx.globalAlpha = 0.9; text('Nest', n.x, n.y - 70 + bob, 16, C.gold, 'center'); ctx.restore(); }
}
// an egg, rolled by rot (the core's own egg drawing, turned)
function tthDinoDrawLootAt(x, y, s, rot, t) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); tthDrawLoot('egg', 0, 0, s, 0); ctx.restore(); }
// the clearer's bone club (angle 0: straight up; it swings forward)
function tthDinoDrawClub(x, y, face, a) {
  ctx.save(); ctx.translate(x, y); ctx.scale(face, 1); ctx.rotate(a); ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -24); ctx.stroke();
  ctx.fillStyle = C.ink; circle(-4, -27, 6.5); ctx.fill(); circle(4, -27, 6.5); ctx.fill();
  ctx.strokeStyle = TTHDINOC.bone; ctx.lineWidth = 5.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -24); ctx.stroke();
  ctx.fillStyle = TTHDINOC.bone; circle(-4, -27, 4.6); ctx.fill(); circle(4, -27, 4.6); ctx.fill(); circle(0, 1, 3.4); ctx.fill();
  ctx.restore();
}
function tthDinoArrow(x, y) {
  ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - 10, y - 18); ctx.lineTo(x + 10, y - 18); ctx.lineTo(x + 10, y); ctx.lineTo(x + 18, y); ctx.lineTo(x, y + 18); ctx.lineTo(x - 18, y); ctx.lineTo(x - 10, y); ctx.closePath(); ctx.fill(); ctx.stroke();
}
// in front of the Thief, behind the players: the rings where meteors will land, the loose egg
function tthDinoDrawMid(st) {
  const ph = st.ph, t = G.clock, e = ph.egg;
  for (const m of ph.mets) {
    if (m.state !== 'warn') continue;
    const k = clamp(m.t / m.warn, 0, 1), pulse = 0.5 + 0.5 * Math.sin(t * (10 + k * 14));
    ctx.fillStyle = 'rgba(40,20,30,' + (0.18 + 0.3 * k) + ')'; ctx.beginPath(); ctx.ellipse(m.x, m.gy + 2, m.r * (0.4 + 0.6 * k), 9 * (0.4 + 0.6 * k), 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,' + Math.round(90 + 110 * pulse) + ',60,' + (0.65 + 0.35 * pulse) + ')'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(m.x, m.gy + 2, m.r, 11, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,150,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([7, 7]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.ellipse(m.x, m.gy + 2, m.r - 8, 7, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    if (m.rock) { ctx.save(); ctx.globalAlpha = 0.5 + 0.4 * pulse; text('rock!', m.x, m.gy - 20, 14, '#ffffff', 'center'); ctx.restore(); }
  }
  if (e.state === 'loose') {
    const wob = e.rest > 0 ? Math.sin(t * 9) * 0.16 * Math.max(0.3, 1 - e.rest * 0.4) : 0;
    ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(e.x, tthDinoG(ph, e.x), 13, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    if (e.rest > 0.3) { ctx.fillStyle = 'rgba(255,197,61,' + (0.3 + 0.2 * Math.sin(t * 6)) + ')'; circle(e.x, e.y, 24); ctx.fill(); }
    tthDinoDrawLootAt(e.x, e.y, 0.82, e.rot + wob, t);
  }
}
// over the players: the egg in their hands, the bone club, meteors, the claw's aim, the fire wall, gold arrows
function tthDinoDrawTop(st) {
  const ph = st.ph, t = G.clock, e = ph.egg, cam = st.cam, ps = G.players, K = TTHDINO, th = ph.th;
  const hid = tthDinoHolder(ph);
  // (players are on screen between ticks: world = screen + camera)
  for (const p of ps) {
    if (!p.alive) continue;
    const P = ph.P[p.id], px = p.x + p.w / 2 + cam.x, py = p.y + cam.y;
    if (p.id === hid) {   // little hands on the egg
      ctx.fillStyle = PCOL[p.id]; ctx.strokeStyle = PDARK[p.id]; ctx.lineWidth = 2;
      const hy = P.duck ? py + 6 : py - 7; circle(px - 12, hy, 4); ctx.fill(); ctx.stroke(); circle(px + 12, hy, 4); ctx.fill(); ctx.stroke();
    } else if (e.state !== 'thief' && !(e.by === p.id && (e.state === 'fly' || e.state === 'fall'))) {
      const sw = P.swing > 0 ? 1 - P.swing / 0.24 : -1, a = P.post ? 1.5 : sw >= 0 ? -0.9 + Math.sin(sw * Math.PI) * 2.5 : -0.5 + Math.sin(t * 3 + p.id) * 0.06;
      tthDinoDrawClub(px + p.face * 12, py + 15, p.face, a);
      if (P.post) { ctx.strokeStyle = TTHDINOC.vine; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px + 12, py + 12); ctx.lineTo(P.post.x0 - K.postX, P.post.base - 34); ctx.stroke(); }
    }
  }
  if (e.state === 'held' || e.state === 'fly' || e.state === 'fall') tthDinoDrawLootAt(e.x, e.y, 0.82, e.rot, t);
  // the claw's aim: a dashed line and a ring on the egg
  if ((th.mode === 'aim' || th.mode === 'dive') && hid >= 0) {
    const cl = tthThiefPts(st.thief).claw, k = th.mode === 'dive' ? 1 : clamp(th.t / th.aim, 0, 1), pulse = 0.5 + 0.5 * Math.sin(t * (9 + 12 * k));
    ctx.strokeStyle = 'rgba(255,95,109,' + (0.6 + 0.4 * pulse) + ')'; ctx.lineWidth = 3; ctx.setLineDash([8, 7]); ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.moveTo(cl.x, cl.y + 10); ctx.lineTo(e.x, e.y - 14); ctx.stroke(); ctx.setLineDash([]);
    ctx.lineWidth = 3.5; circle(e.x, e.y, 26 - 6 * k + pulse * 2); ctx.stroke();
    for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + t * 2; ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20); ctx.lineTo(e.x + Math.cos(a) * 32, e.y + Math.sin(a) * 32); ctx.stroke(); }
  }
  // meteors on their way down (from the asteroid's side of the sky), and where they hit
  for (const m of ph.mets) {
    if (m.state === 'warn') {
      const left = m.warn - m.t;
      if (left > K.met.fall) continue;
      const u = 1 - left / K.met.fall, x = m.x - 300 * (1 - u), y = m.gy - 620 * (1 - u);
      ctx.fillStyle = 'rgba(255,170,70,0.7)'; ctx.beginPath(); ctx.moveTo(x - 62, y - 128); ctx.lineTo(x + 12, y - 8); ctx.lineTo(x - 12, y + 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,235,160,0.9)'; ctx.beginPath(); ctx.moveTo(x - 34, y - 70); ctx.lineTo(x + 7, y - 5); ctx.lineTo(x - 7, y + 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = TTHDINOC.hot; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; circle(x, y, 14); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 12, -0.4, Math.PI * 0.8); ctx.stroke();
    } else {
      const k = clamp(m.bt / 0.5, 0, 1);
      ctx.save(); ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.ellipse(m.x, m.gy - 10, m.r * (0.5 + k), 44 * (0.5 + k * 0.8), 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 6 * (1 - k) + 1; ctx.beginPath(); ctx.ellipse(m.x, m.gy, m.r * (0.6 + k * 1.2), 14 * (0.6 + k), 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
  // the start: the meteor that whizzes past the Thief
  const I = ph.intro;
  if (I.streak >= 0 && I.streak < 1.1) {
    const u = I.streak / 0.7, c = st.thief, x = c.x - 60 - 420 * (1 - u), y = c.y - 40 - 400 * (1 - u);
    ctx.fillStyle = 'rgba(255,170,70,0.7)'; ctx.beginPath(); ctx.moveTo(x - 74, y - 140); ctx.lineTo(x + 14, y - 10); ctx.lineTo(x - 14, y + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = TTHDINOC.hot; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; circle(x, y, 17); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 15, -0.4, Math.PI * 0.8); ctx.stroke();
  }
  tthDinoDrawFire(st, t);
  // gold help: an arrow at what to do next
  const o = ph.gate;
  if (o && o.gold) tthDinoArrow(o.kind === 'vine' && !o.tied ? o.x0 - K.postX : o.kind === 'ledge' || tthDinoPit(o) ? o.x0 - 14 : (o.x0 + o.x1) / 2, o.top - 62 + Math.sin(t * 6) * 6);
  if (!o && ph.goldOpen && !ph.end) { const f = ph.c.flags[ph.k], gx = f ? f.x : ph.c.nest.x, gy = f ? f.y - 150 : ph.c.nest.y - 110; if (gx < cam.x + W + 40) tthDinoArrow(gx, gy + Math.sin(t * 6) * 6); }
  // hearts over the nest
  if (ph.end && ph.end.step >= 2 && ph.end.roarT > 1.5) {
    const n = ph.c.nest;
    for (let q = 0; q < 4; q++) { const u = (t * 0.6 + q / 4) % 1, hx = n.x + Math.sin(u * 5 + q * 2) * 26 + (q - 1.5) * 16, hy = n.y - 60 - u * 80; ctx.save(); ctx.globalAlpha = 1 - u; text('♥', hx, hy, 18 + q * 2, '#ff6b8a', 'center'); ctx.restore(); }
  }
}
// the wall of fire and smoke that creeps in from the left
function tthDinoDrawFire(st, t) {
  const F = st.ph.fire, cam = st.cam, x = F.x, top = cam.y, bot = cam.y + H;
  if (x < cam.x - 60) {   // off screen behind: a warm glow at the left edge, stronger the closer it is
    const a = clamp(1 - (cam.x - x) / 420, 0, 1) * (0.55 + 0.1 * Math.sin(t * 7));
    if (a > 0.02) { const g = ctx.createLinearGradient(cam.x, 0, cam.x + 130, 0); g.addColorStop(0, 'rgba(255,110,40,' + a + ')'); g.addColorStop(1, 'rgba(255,110,40,0)'); ctx.fillStyle = g; ctx.fillRect(cam.x, top, 130, H); }
    return;
  }
  const hg = ctx.createLinearGradient(x - 20, 0, x + 150, 0); hg.addColorStop(0, 'rgba(255,120,40,0.4)'); hg.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = hg; ctx.fillRect(x - 20, top, 170, H);
  // smoke above and behind
  for (let k = 0; k < 9; k++) {
    const u = (t * 0.22 + k / 9) % 1, sx = x - 30 - (k % 3) * 46 + Math.sin(k * 3 + u * 5) * 16 - u * 30, sy = bot - 170 - u * 420;
    ctx.fillStyle = 'rgba(60,46,58,' + 0.75 * (1 - u * 0.7) + ')'; circle(sx, sy, 44 + u * 40 + (k % 2) * 12); ctx.fill();
  }
  const body = ctx.createLinearGradient(0, bot - 330, 0, bot);
  body.addColorStop(0, 'rgba(90,40,50,0.92)'); body.addColorStop(0.35, '#d8432a'); body.addColorStop(0.75, '#ff7a2a'); body.addColorStop(1, '#ffb347');
  ctx.fillStyle = body; ctx.fillRect(cam.x - 30, top, Math.max(0, x - 40 - cam.x + 30), H);
  // three layers of flame tongues along the front
  for (const [off, col, amp, sp] of [[0, '#ff5a2a', 30, 6], [-24, '#ff9a3a', 22, 8], [-50, '#ffd86a', 15, 11]]) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + off - 200, bot + 10); ctx.lineTo(x + off + 6, bot + 10);
    let lx = x + off + 6, ly = bot + 10;
    for (let q = 0; q <= 16; q++) {   // a wavy front of round tongues that leans back toward the top
      const yy = bot - q * 26, lean = q * q * 0.55, tip = (q % 2 ? 1 : -0.45) * amp;
      const nx = x + off - lean + tip + Math.sin(t * sp + q * 1.7) * 9;
      ctx.quadraticCurveTo(lx, ly, (lx + nx) / 2, (ly + yy) / 2); lx = nx; ly = yy;
    }
    ctx.lineTo(x + off - 200, ly); ctx.closePath(); ctx.fill();
  }
  // flame tongues licking ahead along the ground
  for (let k = 0; k < 4; k++) {
    const u = (t * 1.3 + k * 0.27) % 1, fx = x + 4 + k * 13, fh = 26 + 30 * Math.sin(u * Math.PI), gy = tthDinoG(st.ph, fx + 8);
    ctx.fillStyle = k % 2 ? '#ff9a3a' : '#ff5a2a';
    ctx.beginPath(); ctx.moveTo(fx - 9, gy + 2); ctx.quadraticCurveTo(fx - 10, gy - fh * 0.5, fx + 6 + Math.sin(t * 9 + k) * 4, gy - fh); ctx.quadraticCurveTo(fx + 12, gy - fh * 0.4, fx + 11, gy + 2); ctx.closePath(); ctx.fill();
  }
  // sparks blown ahead
  for (let k = 0; k < 10; k++) {
    const u = (t * (0.5 + (k % 4) * 0.13) + k * 0.19) % 1;
    ctx.fillStyle = 'rgba(255,' + (190 + (k % 3) * 25) + ',90,' + (1 - u) + ')'; circle(x - 10 + u * (90 + (k % 3) * 50), bot - 60 - ((k * 53) % 300) - Math.sin(u * 3) * 30, 2 + (k % 3)); ctx.fill();
  }
}
// the track along the bottom: the fire, both players, the egg, the flags and the nest
function tthDinoHud(st) {
  const ph = st.ph, c = ph.c, big = tthBig(), t = G.clock;
  if (G.introT > 0 || st.idle || (st.cut && st.cut.kind !== 'leave')) return;
  const w = big ? 440 : 340, hgt = big ? 12 : 8, x0 = W / 2 - w / 2, y = H - (big ? 24 : 17), z = big ? 1.4 : 1;
  const X = x => x0 + clamp(x / c.nest.x, 0, 1) * w;
  ctx.save();
  if (G.players.some(p => p.alive && p.y + p.h > y - hgt - 14 && p.x + p.w > x0 - 20 && p.x < x0 + w + 30)) ctx.globalAlpha = 0.45;
  ctx.fillStyle = 'rgba(30,20,66,0.8)'; rr(x0 - 14 * z, y - hgt - 5 * z, w + 40 * z, hgt * 2 + 10 * z, hgt + 5 * z); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(x0, y - hgt / 2, w, hgt, hgt / 2); ctx.fill();
  const fx = X(ph.fire.x);
  if (fx > x0 + 1) { const g = ctx.createLinearGradient(x0, 0, fx, 0); g.addColorStop(0, '#c2402a'); g.addColorStop(1, '#ffb347'); ctx.fillStyle = g; rr(x0, y - hgt / 2, fx - x0, hgt, hgt / 2); ctx.fill(); }
  ctx.fillStyle = '#ffd86a'; ctx.beginPath(); ctx.moveTo(fx - 5 * z, y + hgt / 2); ctx.quadraticCurveTo(fx - 7 * z, y - 4 * z, fx, y - (11 + Math.sin(t * 9) * 2) * z); ctx.quadraticCurveTo(fx + 7 * z, y - 4 * z, fx + 5 * z, y + hgt / 2); ctx.closePath(); ctx.fill();
  for (const f of c.flags) { const qx = X(f.x); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(qx, y + hgt / 2); ctx.lineTo(qx, y - 11 * z); ctx.stroke(); ctx.fillStyle = f.got ? C.gold : '#5fbf5a'; ctx.beginPath(); ctx.moveTo(qx, y - 11 * z); ctx.lineTo(qx + 8 * z, y - 7.5 * z); ctx.lineTo(qx, y - 4 * z); ctx.closePath(); ctx.fill(); }
  tthDinoDrawLootAt(x0 + w + 13 * z, y - 1, 0.42 * z, 0, t);   // the nest at the end
  const e = ph.egg, cam = st.cam;
  for (const p of G.players) { ctx.fillStyle = PCOL[p.id]; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; circle(X(p.x + p.w / 2 + cam.x), y + (p.id ? 2 : -2) * z, 4.6 * z); ctx.fill(); ctx.stroke(); }
  if (e.state !== 'thief' && e.state !== 'nest') { ctx.fillStyle = '#f6efd8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(X(e.x), y - 8 * z, 3.4 * z, 4.4 * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}

/* ---------- sounds ---------- */
Sfx.extra.tthDinoCrack = function (p) { this.tone(700 * p, 0.05, 'square', 0.045, 300); this.tone(180, 0.09, 'triangle', 0.06, 90, 0.01); };
Sfx.extra.tthDinoSmash = function () { this.tone(900, 0.06, 'square', 0.04, 260); this.tone(150, 0.2, 'triangle', 0.08, 55, 0.02); this.tone(420, 0.12, 'sawtooth', 0.025, 120, 0.05); };
Sfx.extra.tthDinoSqueak = function () { this.tone(700, 0.08, 'square', 0.035, 1300); this.tone(1100, 0.1, 'square', 0.03, 1700, 0.1); };
Sfx.extra.tthDinoToss = function (p) { this.tone(360 * p, 0.16, 'sine', 0.05, 760 * p); };
Sfx.extra.tthDinoCatch = function (p) { this.tone(620 * p, 0.05, 'triangle', 0.05); this.tone(930 * p, 0.09, 'triangle', 0.05, null, 0.05); };
Sfx.extra.tthDinoDrop = function () { this.tone(520, 0.3, 'sine', 0.06, 160); };
Sfx.extra.tthDinoBoing = function () { this.tone(240, 0.12, 'sine', 0.045, 420); };
Sfx.extra.tthDinoWhistle = function () { this.tone(1700, 0.9, 'sine', 0.03, 420); };
Sfx.extra.tthDinoBoom = function () { for (let k = 0; k < 4; k++) this.tone(90 - k * 12, 0.22, 'sawtooth', 0.06, 36, k * 0.04); this.tone(300, 0.1, 'square', 0.035, 80); };
Sfx.extra.tthDinoAlarm = function () { [880, 660, 880, 660].forEach((f, i) => this.tone(f, 0.08, 'square', 0.03, null, i * 0.1)); };
Sfx.extra.tthDinoSwoop = function () { this.tone(900, 0.4, 'sawtooth', 0.03, 220); };
Sfx.extra.tthDinoWhack = function () { this.tone(1400, 0.05, 'square', 0.06, 500); this.tone(220, 0.16, 'triangle', 0.08, 90); };
Sfx.extra.tthDinoMiss = function () { this.tone(500, 0.14, 'sine', 0.04, 900); };
Sfx.extra.tthDinoSizzle = function () { this.tone(1800, 0.25, 'sawtooth', 0.012, 900); this.tone(240, 0.3, 'triangle', 0.03, 120, 0.02); };
Sfx.extra.tthDinoCreak = function () { for (let k = 0; k < 3; k++) this.tone(150 + k * 30, 0.1, 'sawtooth', 0.03, 110, k * 0.13); };
Sfx.extra.tthDinoVine = function () { this.tone(200, 0.18, 'sawtooth', 0.02, 420); };
Sfx.extra.tthDinoFlag = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.tthDinoRoar = function () { this.tone(140, 1.1, 'sawtooth', 0.09, 60); this.tone(210, 1.0, 'square', 0.04, 80, 0.03); for (let k = 0; k < 6; k++) this.tone(70 + Math.random() * 40, 0.2, 'sawtooth', 0.05, 40, k * 0.15); };

/* ---------- the room (this file fills in its own room of the level def) ---------- */
tthRoom('dino', {
  jobs: {
    carrier: { title: 'Egg carrier', act: ['toss', 'smash'], legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> small hop <kbd>S</kbd> duck, hug the egg',
      howTo: ['Toss the egg to your friend at ledges and pits.'] },
    clearer: { title: 'Path clearer', act: ['smash', 'shoo', 'pull', 'whack'], legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump',
      howTo: ['Tap to smash rocks and logs. Hold at a vine post to pull the bridge tight.'] },
  },
  act: { label: 'toss', labels: ['toss', 'smash'] },
  tip: 'One carries the egg (small hops only), one clears the way: smash, shoo, pull vines. Toss the egg at ledges!',
  legend: TTH_PHASES.dino.legend(),
  map: TTH_EMPTY_MAP,
});
