/* Pip & Bo - Level 35-1 Moonwick Academy: class 3 'cauldron' (Runaway Cauldron, spell Brew). */
'use strict';

/* ===== 35-1 class 3: Runaway Cauldron (WIZ_PHASES.cauldron) ======================================================
   Potions class. The big iron cauldron on its wheeled stand breaks loose and rolls away down the sloping cellar
   corridors, scrolling right and downhill. It must not boil over, and the recipe still has to be finished on the way.

   THE TWO JOBS (room field `first` is the first STIRRER; they swap at the two flat landings)
   - STIRRER (sits on the rim with a big ladle, action word "stir"): a bubble ring swells on a steady beat; pressing
     the action while it crosses the gold mark is a good stir ("Smooth!") and lowers the foam. A beat with no good
     stir raises the foam meter; at full the cauldron boils over ("FOOMP!"): a green geyser stops it dead, an Oops
     for the team, and it rolls back to the last flag. LEFT / RIGHT lean the cauldron to pick a rail at a fork (a sign
     shows the clean rail: the other runs under a dripping pipe of hiccup syrup) and DOWN pulls the brake chain: the
     cauldron rolls at half speed for WIZCAUL.brake.t s, then the brake glows hot and rests.
   - RUNNER (on foot ahead of the cauldron, action word "toss"): runs and jumps along the floor, low shelves, crates
     and high shelves, picks an ingredient up by touching it (one at a time, carried over the head) and tosses it with
     the action within WIZCAUL.toss px of the cauldron: the toss always lands in. Only the NEXT ingredient on the card
     (or a look-alike of it) can be picked up; the later ones sit dimmed and wait their turn. The recipe card (top left) shows the
     next three wanted ingredients. A wrong one is a "Blorp!": the potion turns a silly colour, the foam jumps a quarter
     and the ingredient hops back to its shelf. The cauldron speeds up slowly by itself; every right ingredient calms
     it, so a runner who does nothing lets it run away, and a stirrer who does nothing lets it boil.
     A wanted ingredient the cauldron rolls past hops on ahead by itself ("Wait for me!"), so nothing is ever lost.
     If the cauldron catches the runner it scoops them up onto the rim for 2 s (no Oops; whatever they carried hops
     home) and drops them off in front again.

   THE COURSE: three slopes of about 40 s with 9 ingredients each, a flat landing after each (the cauldron parks on a
   buffer; the jobs swap; the last landing is the end), a fork on every slope:
     1 The Pantry        pickups on the floor and low shelves
     2 The Wine Cellar   barrels to hop, ingredients on high shelves reached from crates, look-alikes next to them
     3 The Boiler Deep   steam vents on a rhythm ("!" and a hiss first: a blast knocks the runner back, no Oops), a gap
                         to jump that the cauldron crosses on a rail bridge, faster bubbles, look-alikes
   A slope ends when the cauldron reaches its buffer AND the recipe is done (the runner can finish it on the landing).
   Flags every WIZCAUL.flagEvery px are the mid-class safe spots.

   FAILS. Boil-over only (a team Oops). GOLD HELP after WIZ.goldAfter boil-overs on one slope: a gold ladle, the gold
   mark is twice as wide for 20 s (announced).
   NEVER ALONE. No stirring boils it over before the next flag, every time; no runner, no recipe, no way off a slope.
   Stats (st.stats.cauldron): stirs (good), blorps, scoops, brakes, foomps.   Names: wizCaul* / WIZCAUL*. */
const WIZCAUL = {
  y0: 420,                     // the floor at the top
  start: 640,                  // the first slope starts here (the start landing is before it)
  len: 4200, land: 560,        // a slope's length; a landing's length
  drop: 300,                   // how far a slope drops
  base: [100, 110, 120],       // the cauldron's speed per slope (px/s), plus its runaway extra:
  runUp: 2.0, runMax: 80, calm: 22,
  acc: 140,
  brake: { t: 3, cool: 4, k: 0.45 },
  beat: [1.25, 1.15, 0.95],    // the bubble beat (s) per slope
  mark: 0.75, win: 0.12,       // the gold mark (fraction of a beat) and its half-width (gold ladle: twice)
  late: 0.15, goldLate: 0.35,   // a stir may also come this much (of a beat) after the window: late is still fine
  good: 0.11, miss: 0.11, splash: 0.05, blorp: 0.25, syrup: 0.3,
  geyser: 1.8, foamBack: 0.2,
  toss: 260,
  scoop: { t: 2, cool: 1.2 },
  rim: 92,                     // the rim over the rail
  hiRail: 90,                  // the fork's upper rail over the floor
  flagEvery: 1050,
  lowShelf: 70, highShelf: 150, crate: 50,
  gap: { at: 1760, w: 110, depth: 70 },
  vent: { period: 3.2, warn: 0.9, on: 1.0, h: 170 },
  goldT: 20,
  // per slope: where each of the 9 ingredients sits: f floor, l low shelf, h high shelf (a crate beside it)
  layout: [['f', 'f', 'l', 'f', 'l', 'f', 'l', 'f', 'l'], ['l', 'h', 'f', 'h', 'l', 'h', 'f', 'h', 'l'], ['l', 'f', 'h', 'l', 'f', 'h', 'l', 'h', 'f']],
  first: 360, every: 410,
  forks: [{ at: 1600, good: 'hi' }, { at: 2300, good: 'lo' }, { at: 900, good: 'hi' }], forkLen: 800,
  vents: [0, 2, 5, 7],         // slope 3: a vent after these ingredients
};
const WIZCAUL_TYPES = ['mush', 'pepper', 'root', 'fog', 'shell', 'petal'];
const WIZCAUL_NAMES = { mush: 'glow mushroom', pepper: 'moon pepper', root: 'snoring root', fog: 'jar of fog', shell: 'humming shell', petal: 'sneezing petal' };
const WIZCAUL_NEWS = ['Slope 1: The Pantry. Grab the ingredients on the card!', 'Slope 2: The Wine Cellar. Hop the barrels, climb the crates, mind the look-alikes!', 'Slope 3: The Boiler Deep. Steam vents and a gap!'];
const WIZCAUL_C = { stone: '#3a3150', stoneLt: '#4e4468', stoneDk: '#241d36', floor: '#5a4e6e', floorLt: '#786a90', wood: '#8a5a32', woodDk: '#5a3a1e', iron: '#2c2a36', ironLt: '#4a4858',
  brass: '#d9a441', potion: '#5fd068', potionDk: '#2f9a3c', foam: '#c8ffc0', syrup: '#ff7ad0', steam: 'rgba(235,240,255,0.75)', silly: ['#ff7ad0', '#7ab8ff', '#ffb347'] };
const wizCaulA = k => WIZCAUL.start + k * (WIZCAUL.len + WIZCAUL.land);   // where slope k starts
const wizCaulEnd = () => wizCaulA(2) + WIZCAUL.len + WIZCAUL.land;          // the end of the last landing
function wizCaulFloor(x) {
  const K = WIZCAUL;
  if (x < K.start) return K.y0;
  for (let k = 0; k < 3; k++) {
    const a = wizCaulA(k), top = K.y0 + k * K.drop;
    if (x < a + K.len) return top + (x - a) * K.drop / K.len;
    if (x < a + K.len + K.land || k === 2) return top + K.drop;
  }
  return K.y0 + 3 * K.drop;
}
const wizCaulSlopeAt = x => (x >= wizCaulA(2) - WIZCAUL.land / 2 ? 2 : x >= wizCaulA(1) - WIZCAUL.land / 2 ? 1 : 0);
const wizCaulInGap = x => { const g = wizCaulA(2) + WIZCAUL.gap.at; return x > g - 30 && x < g + WIZCAUL.gap.w + 30; };
// the fork: how far up the upper rail is at x (0..1), for a fork object
function wizCaulHiK(f, x) {
  if (!f) return 0;
  const r = 150, d = x - f.x;
  if (d < 0 || d > f.len) return 0;
  return Math.min(1, d / r, (f.len - d) / r);
}

function wizCaulSetup(st, L) {
  const ph = st.ph, K = WIZCAUL;
  ph.stir = L.def.first || 0; ph.run = 1 - ph.stir;
  ph.slope = 0; ph.got = 0; ph.t = 0; ph.mode = 'ready'; ph.modeT = 0;
  ph.cx = 300; ph.v = 0; ph.extra = 0; ph.bt = 0; ph.next = 0; ph.lastGood = -1; ph.foam = 0.1;
  ph.brakeT = 0; ph.brakeCool = 0; ph.gold = 0; ph.silly = 0; ph.sillyC = 0; ph.carry = null; ph.scoop = 0; ph.scoopCool = 0;
  ph.lean = null; ph.rail = 'lo'; ph.fork = null; ph.tossFx = []; ph.stirAnim = 0; ph.geyser = 0; ph.drip = 0; ph.camY = 0;
  // the course: ingredients, shelves, crates, barrels, vents, forks, flags
  ph.items = []; ph.solids = []; ph.vents = []; ph.forks = []; ph.flags = []; ph.recipes = [];
  const S = ph.solids;
  S.push({ x0: -40, y0: -4000, x1: 0, y1: 4000, kind: 'wall' });
  S.push({ x0: 0, y0: K.y0, x1: K.start, y1: K.y0 + 400, kind: 'floor' });
  const gx = wizCaulA(2) + K.gap.at;
  for (let k = 0; k < 3; k++) {
    const a = wizCaulA(k);
    // the slope: thin steps (under 4 px each, so walking up and down needs no jump)
    for (let x = a; x < a + K.len; x += 40) {
      if (k === 2 && x + 40 > gx && x < gx + K.gap.w) continue;
      S.push({ x0: x, y0: wizCaulFloor(x + 20) - 1.4, x1: x + 40, y1: wizCaulFloor(x + 20) + 400, kind: 'floor' });
    }
    S.push({ x0: a + K.len, y0: K.y0 + (k + 1) * K.drop, x1: a + K.len + K.land + (k === 2 ? 600 : 0), y1: K.y0 + (k + 1) * K.drop + 400, kind: 'floor' });
    // the recipe: 9 ingredients, never the same twice in a row
    const rec = [];
    for (let i = 0; i < 9; i++) rec.push(WIZCAUL_TYPES[(i * 2 + k + (i >> 1)) % 6]);
    ph.recipes.push(rec);
    K.layout[k].forEach((lv, i) => {
      const x = a + K.first + i * K.every, f = wizCaulFloor(x);
      const it = { slope: k, idx: i, type: rec[i], good: true, lv, hx: x, hy: f, x, y: f, used: false, hop: 0 };
      if (lv === 'l') { it.hy = f - K.lowShelf; S.push({ x0: x - 34, y0: f - K.lowShelf, x1: x + 34, y1: f - K.lowShelf + 10, one: true, kind: 'shelf' }); }
      if (lv === 'h') {
        it.hy = f - K.highShelf; it.crate = x - 70;
        S.push({ x0: x - 40, y0: f - K.highShelf, x1: x + 40, y1: f - K.highShelf + 10, one: true, kind: 'shelf' });
        S.push({ x0: x - 95, y0: wizCaulFloor(x - 70) - K.crate, x1: x - 45, y1: wizCaulFloor(x - 70) + 2, kind: 'crate' });
      }
      it.x = it.hx; it.y = it.hy;
      ph.items.push(it);
      // look-alikes (slopes 2 and 3) on a low shelf of their own
      const fake = k === 1 && lv === 'h' ? 120 : k === 2 && lv === 'l' ? -130 : k === 2 && lv === 'h' ? 120 : 0;
      if (fake) {
        const dx = x + fake, fy = wizCaulFloor(dx);
        S.push({ x0: dx - 30, y0: fy - K.lowShelf, x1: dx + 30, y1: fy - K.lowShelf + 10, one: true, kind: 'shelf' });
        ph.items.push({ slope: k, idx: -1, type: rec[i], good: false, lv: 'l', hx: dx, hy: fy - K.lowShelf, x: dx, y: fy - K.lowShelf, used: false, hop: 0 });
      }
      // barrels on slope 2, vents on slope 3
      if (k === 1 && i < 8) { const bx = x + 230, by = wizCaulFloor(bx); S.push({ x0: bx - 22, y0: by - 42, x1: bx + 22, y1: by + 2, kind: 'barrel' }); }
      if (k === 2 && K.vents.includes(i)) ph.vents.push({ x: x + 220, ph: i * 0.7, state: 'off' });
    });
    const fk = K.forks[k];
    ph.forks.push({ slope: k, x: a + fk.at, len: K.forkLen, good: fk.good, sign: a + fk.at - 350, drip: a + fk.at + K.forkLen / 2, rail: null });
    for (let fx = a; fx < a + K.len - 300; fx += K.flagEvery) ph.flags.push({ x: fx, lit: false });
  }
  // the gap's pit floor (a hop back out)
  S.push({ x0: gx, y0: wizCaulFloor(gx) + K.gap.depth, x1: gx + K.gap.w, y1: wizCaulFloor(gx) + 400, kind: 'pit' });
  S.push({ x0: wizCaulEnd() + 600, y0: -4000, x1: wizCaulEnd() + 640, y1: 4000, kind: 'wall' });
  S.sort((a, b) => a.x0 - b.x0);
  ph.flag = { x: 300 };
  const ps = G.players, rn = ps[ph.run];
  Object.assign(rn, { x: 470 - rn.w / 2, y: K.y0 - rn.h, vx: 0, vy: 0, grounded: true, face: 1, alive: true });
  wizCaulSeat(st);
  st.cam = { x: ph.cx - 300, y: wizCaulFloor(ph.cx + 200) - 430 }; ph.camY = st.cam.y;
  const s = wizStats(st); Object.assign(s, { stirs: s.stirs || 0, blorps: s.blorps || 0, scoops: s.scoops || 0, brakes: s.brakes || 0, foomps: s.foomps || 0 });
  Object.assign(st.hm, { x: ph.cx + 460, y: st.cam.y + 160, s: 0.8, face: -1, pose: 'talk' });
  wizSay(st, 'Potions! Oh dear. The cauldron\'s loose. Stir it and fill it!', 3);
  wizNews(st, WIZCAUL_NEWS[0]);
}
const wizCaulY = ph => wizCaulFloor(ph.cx) - (ph.fork && ph.fork.rail === 'hi' ? wizCaulHiK(ph.fork, ph.cx) * WIZCAUL.hiRail : 0);   // the wheels
const wizCaulRim = ph => wizCaulY(ph) - WIZCAUL.rim;
const wizCaulWant = ph => ph.items.find(it => it.slope === ph.slope && it.good && it.idx === ph.got && !it.used) || null;
// the stirrer sits on the rim (and a scooped runner on the other side): keep p.x / p.y there for tags and bubbles
function wizCaulSeat(st) {
  const ph = st.ph, ps = G.players, r = wizCaulRim(ph);
  const s = ps[ph.stir];
  Object.assign(s, { x: ph.cx - 30 - s.w / 2, y: r - s.h + 4, vx: 0, vy: 0, grounded: true, alive: true, face: 1 });
  if (ph.scoop > 0) { const q = ps[ph.run]; Object.assign(q, { x: ph.cx + 26 - q.w / 2, y: r - q.h + 4, vx: 0, vy: 0, grounded: true, face: 1 }); }
}
const wizCaulWin = ph => WIZCAUL.win * (ph.gold > 0 ? 2 : 1);
const wizCaulBeat = ph => WIZCAUL.beat[ph.slope];
const wizCaulU = ph => (ph.bt % wizCaulBeat(ph)) / wizCaulBeat(ph);
// beats: beat k's gold mark comes at (k + mark) * beat s of rolling. A stir is good from win before it to win + late
// after it (a stir a little late still counts; the gold ladle is far more forgiving of late stirs)
const wizCaulMarkT = (ph, k) => (k + WIZCAUL.mark) * wizCaulBeat(ph);
const wizCaulEarly = ph => wizCaulWin(ph) * wizCaulBeat(ph);
const wizCaulLateT = ph => (wizCaulWin(ph) + (ph.gold > 0 ? WIZCAUL.goldLate : WIZCAUL.late)) * wizCaulBeat(ph);
const wizCaulNearK = ph => Math.max(0, Math.round(ph.bt / wizCaulBeat(ph) - WIZCAUL.mark));
const wizCaulStirred = ph => ph.lastGood >= wizCaulNearK(ph);
// the beat a stir now would count for (or -1)
function wizCaulStirK(ph) {
  const k = wizCaulNearK(ph);
  for (const j of [k, k - 1]) { if (j < ph.next || j <= ph.lastGood) continue; const d = ph.bt - wizCaulMarkT(ph, j); if (d >= -wizCaulEarly(ph) && d <= wizCaulLateT(ph)) return j; }
  return -1;
}
const wizCaulRolling = ph => ph.mode === 'roll';

function wizCaulPlan(st) {
  const ph = st.ph, out = [null, null], K = WIZCAUL;
  // the stirrer: stir on the mark; lean before a fork; brake if the runner is about to be left behind
  const k = wizCaulNearK(ph), stirNow = ph.mode === 'roll' && !wizCaulStirred(ph) && Math.abs(ph.bt - wizCaulMarkT(ph, k)) < wizCaulEarly(ph) * 0.6;
  let hold = null, why = 'stir';
  const f = ph.forks[ph.slope];
  if (ph.mode === 'roll' && f && ph.cx > f.x - 450 && ph.cx < f.x - 10) { hold = f.good === 'hi' ? 'left' : 'right'; why = 'lean'; }
  const w = wizCaulWant(ph), rn = G.players[ph.run];
  if (!hold && ph.mode === 'roll' && w && !ph.carry && ph.brakeT <= 0 && ph.brakeCool <= 0 && w.x < ph.cx + 260 && Math.abs(w.x - (rn.x + rn.w / 2)) > 140) { hold = 'down'; why = 'brake'; }
  out[ph.stir] = { tap: stirNow ? 'act' : null, hold, why, x: ph.cx, y: wizCaulRim(ph) };
  // the runner: fetch the wanted ingredient, then toss it in
  if (ph.scoop > 0 || ph.mode === 'swap') out[ph.run] = { why: 'wait' };
  else if (ph.carry) {
    const d = Math.hypot(rn.x + rn.w / 2 - ph.cx, rn.y + rn.h / 2 - (wizCaulRim(ph) - 10));
    out[ph.run] = { why: 'toss', x: ph.cx + 170, y: wizCaulFloor(ph.cx + 170), tap: d < K.toss - 30 ? 'act' : null, near: d < K.toss };
  } else if (w) out[ph.run] = { why: 'fetch', x: w.x, y: w.y, item: w, crate: w.lv === 'h' && !w.hop ? w.crate : null };
  else out[ph.run] = { why: 'wait', x: ph.cx + 200 };
  return out;
}
function wizCaulGood(st) {
  const ph = st.ph;
  ph.foam = Math.max(0, ph.foam - WIZCAUL.good); ph.stirAnim = 0.35; wizStats(st).stirs++;
  wizPop(st, ph.cx, wizCaulRim(ph) - 40, 'Smooth!', WIZ_SPELLS.brew.col, 16); Sfx.play('wizCaulStir');
}
function wizCaulFoomp(st) {
  const ph = st.ph;
  if (!wizTeamOops(st, { word: 'FOOMP!', x: ph.cx, y: wizCaulRim(ph) - 60, kind: 'boil' })) { ph.foam = 0.9; return; }
  wizStats(st).foomps++;
  ph.mode = 'boil'; ph.modeT = 0; ph.geyser = WIZCAUL.geyser; ph.v = 0; Sfx.play('wizCaulFoomp');
  const n = wizMiss(st, 's' + ph.slope);
  wizReact(st, 'calm', ['Well. That was a potion. Not the right one.', 'Stir on the gold mark, dears.', 'Foam is not a flavour.'][n % 3], 2.4);
  if (n >= WIZ.goldAfter && wizGoldOnce(st, 'ladle' + ph.slope, 'Gold ladle! The gold mark is twice as wide for 20 s.')) ph.gold = WIZCAUL.goldT;
  else if (n > WIZ.goldAfter) { ph.gold = WIZCAUL.goldT; wizNews(st, 'Gold ladle again: the wide mark for 20 s.', true); }
}
function wizCaulDropCarry(st) {
  const ph = st.ph, it = ph.carry;
  if (!it) return;
  ph.carry = null; it.carried = false; it.x = it.hx; it.y = it.hy; it.hop = 0.5;
}
function wizCaulToss(st, p) {
  const ph = st.ph, it = ph.carry;
  ph.carry = null; it.carried = false; it.used = true;
  const tip = { x: p.x + p.w / 2, y: p.y - 16 };
  ph.tossFx.push({ it, x0: tip.x, y0: tip.y, t: 0, life: 0.45 });
  Sfx.play('wizCaulToss');
}
// an ingredient lands in the pot
function wizCaulLand(st, it) {
  const ph = st.ph, K = WIZCAUL, r = wizCaulRim(ph);
  const want = ph.recipes[ph.slope][ph.got];
  if (it.good && it.slope === ph.slope && it.idx === ph.got && it.type === want) {
    ph.got++; ph.extra = Math.max(0, ph.extra - K.calm);
    wizSparks(ph.cx, r - 10, 'brew', 10); Sfx.play('wizCaulGood');
    wizPop(st, ph.cx, r - 34, ph.got >= 9 ? 'Recipe done!' : 'Plop! ' + ph.got + '/9', WIZ_SPELLS.brew.col, 18);
    if (ph.got >= 9) wizSay(st, ph.mode === 'park' ? 'Perfect. Smells like Tuesday.' : 'The recipe\'s done! Keep stirring to the bottom!', 2.4);
  } else {
    it.used = false; it.x = it.hx; it.y = it.hy; it.hop = 0.6;
    ph.foam = Math.min(1, ph.foam + K.blorp); ph.silly = 2.5; ph.sillyC = (ph.sillyC + 1) % 3; wizStats(st).blorps++;
    wizPop(st, ph.cx, r - 34, 'Blorp!', K === WIZCAUL ? WIZCAUL_C.silly[ph.sillyC] : '#fff', 20); Sfx.play('wizCaulBlorp');
    wizHint(st, ph.run, 'Wrong one! Check the card: a ' + WIZCAUL_NAMES[want] + '.', { cpu: 'Oops, wrong jar!' });
  }
}
function wizCaulStep(st, dt) {
  const ph = st.ph, K = WIZCAUL, ps = G.players, sp = ps[ph.stir], rn = ps[ph.run];
  ph.t += dt; ph.modeT += dt;
  if (st.idle) { wizCaulCoast(st, dt); return; }
  ph.gold = Math.max(0, ph.gold - dt); ph.silly = Math.max(0, ph.silly - dt); ph.stirAnim = Math.max(0, ph.stirAnim - dt);
  ph.scoopCool = Math.max(0, ph.scoopCool - dt); ph.drip = Math.max(0, ph.drip - dt);
  for (const it of ph.items) if (it.hop > 0) it.hop = Math.max(0, it.hop - dt);
  // --- the stirrer's presses ---
  const stirP = sp.pendingAct; sp.pendingAct = false; sp.pendingJump = false;
  const brakeP = !!sp.input.down;
  if (ph.mode === 'ready') {
    if (ph.modeT > 1.6) { ph.mode = 'roll'; ph.modeT = 0; Sfx.play('wizCaulCreak'); wizNews(st, ph.slope ? WIZCAUL_NEWS[ph.slope] : 'It\'s off! Stir on the gold mark, fetch what the card says!'); }
  }
  if (ph.mode === 'roll') {
    ph.bt += dt;
    // a beat whose window closed with no good stir raises the foam
    while (ph.bt > wizCaulMarkT(ph, ph.next) + wizCaulLateT(ph)) {
      if (ph.lastGood < ph.next) { ph.foam = Math.min(1, ph.foam + K.miss); Sfx.play('wizCaulBloop'); if (ph.foam > 0.6) wizWarn(st, ph.stir, 0.6); }
      ph.next++;
    }
    if (stirP) {
      const k = wizCaulStirK(ph);
      if (k >= 0) { ph.lastGood = k; wizCaulGood(st); }
      else { ph.foam = Math.min(1, ph.foam + K.splash); ph.stirAnim = 0.25; wizPop(st, ph.cx, wizCaulRim(ph) - 36, 'Splish!', '#bfe0ff', 14); Sfx.play('wizCaulSplish'); }
    }
    if (brakeP && ph.brakeT <= 0 && ph.brakeCool <= 0) { ph.brakeT = K.brake.t; wizStats(st).brakes++; Sfx.play('wizCaulBrake'); }
    // leaning before a fork
    const f = ph.forks[ph.slope];
    if (f && ph.cx < f.x && ph.cx > f.x - 600) {
      if (sp.input.left) ph.lean = 'hi'; else if (sp.input.right) ph.lean = 'lo';
    }
    if (f && !f.rail && ph.cx >= f.x) { f.rail = ph.lean || 'lo'; ph.fork = f; Sfx.play(f.rail === f.good ? 'wizTick' : 'wizCaulCreak'); }
    if (f && f.rail && !f.dripped && ph.cx >= f.drip) {
      f.dripped = true;
      if (f.rail !== f.good) { ph.foam = Math.min(1, ph.foam + K.syrup); ph.silly = 2.5; ph.drip = 1.2; wizPop(st, ph.cx, wizCaulRim(ph) - 40, 'Hiccup syrup! Blorp!', WIZCAUL_C.syrup, 18); Sfx.play('wizCaulBlorp'); wizStats(st).syrup = (wizStats(st).syrup || 0) + 1; }
      else wizPop(st, ph.cx, wizCaulRim(ph) - 40, 'Clean rail!', '#ffffff', 14);
    }
    if (ph.foam >= 1) wizCaulFoomp(st);
  }
  ph.brakeT = Math.max(0, ph.brakeT - dt);
  if (ph.brakeT <= 0 && ph.brakeCool <= 0 && ph.braking) ph.brakeCool = K.brake.cool;
  ph.braking = ph.brakeT > 0;
  if (!ph.braking) ph.brakeCool = Math.max(0, ph.brakeCool - dt);
  // --- the cauldron rolls ---
  const endX = wizCaulA(ph.slope) + K.len + 260;
  if (ph.mode === 'roll') {
    ph.extra = Math.min(K.runMax, ph.extra + K.runUp * dt);
    let want = (K.base[ph.slope] + ph.extra) * (ph.braking ? K.brake.k : 1);
    if (ph.cx > endX - 220) want = Math.min(want, 40 + (endX - ph.cx) * 0.6);
    ph.v += clamp(want - ph.v, -K.acc * 2 * dt, K.acc * dt);
    ph.cx = Math.min(endX, ph.cx + ph.v * dt);
    if (ph.cx >= endX - 0.5) { ph.mode = 'park'; ph.modeT = 0; ph.v = 0; Sfx.play('wizCaulClunk'); if (ph.got < 9) wizSay(st, 'Parked! Now finish the recipe, dears.', 2.4); }
    // flags
    for (const fl of ph.flags) if (!fl.lit && ph.cx >= fl.x) { fl.lit = true; ph.flag = fl; Sfx.play('wizTick'); }
  } else if (ph.mode === 'boil') {
    ph.geyser = Math.max(0, ph.geyser - dt);
    if (ph.modeT >= K.geyser) {
      // roll back to the last flag, the foam settled
      ph.cx = ph.flag.x + 1; ph.v = 0; ph.foam = K.foamBack; ph.extra = 0; ph.mode = 'ready'; ph.modeT = 0.6; ph.brakeT = 0; ph.brakeCool = 0;
      const f = ph.forks[ph.slope]; if (f && ph.cx < f.x) { f.rail = null; f.dripped = false; ph.fork = null; ph.lean = null; }
      wizCaulDropCarry(st); ph.scoop = 0;
      const rx = ph.cx + 200;
      Object.assign(rn, { x: rx - rn.w / 2, y: wizCaulFloor(rx) - rn.h - 2, vx: 0, vy: -200, grounded: false, alive: true });
      st.cam.x = ph.cx - 300;
    }
  } else if (ph.mode === 'park') {
    if (ph.got >= 9 && ph.modeT > 0.6 && ph.scoop <= 0) {
      if (ph.slope >= 2) { ph.mode = 'done'; wizStats(st).brewed = true; wizPhaseDone(st, { say: 'A perfect potion. Brew is yours!' }); }
      else { ph.mode = 'swap'; ph.modeT = 0; }
    }
  } else if (ph.mode === 'swap') {
    if (ph.modeT >= 0.8 && !ph.swapped) {
      ph.swapped = true; [ph.stir, ph.run] = [ph.run, ph.stir];
      ph.slope++; ph.got = 0; ph.foam = 0.1; ph.extra = 0; ph.bt = 0; ph.next = 0; ph.lastGood = -1; ph.lean = null; ph.fork = null;
      ph.flag = { x: ph.cx };
      const q = ps[ph.run], rx = ph.cx + 170;
      Object.assign(q, { x: rx - q.w / 2, y: wizCaulFloor(rx) - q.h - 30, vx: 0, vy: -250, grounded: false, alive: true, face: 1 });
      wizSwap(st); puff(ph.cx, wizCaulRim(ph), 10, 'rgba(255,255,255,0.8)');
      wizSay(st, ['Swap! Stirrer down, runner up.', 'Swap again! Last slope, the Boiler Deep.'][ph.slope - 1], 2.4);
    }
    if (ph.modeT >= 1.6) { ph.mode = 'ready'; ph.modeT = 0.4; ph.swapped = false; }
  }
  // --- the runner ---
  if (ph.scoop > 0) {
    ph.scoop -= dt;
    if (ph.scoop <= 0) {
      const rx = ph.cx + 150;
      Object.assign(rn, { x: rx - rn.w / 2, y: wizCaulFloor(rx) - rn.h - 40, vx: 120, vy: -300, grounded: false });
      ph.scoopCool = K.scoop.cool; Sfx.play('wizCaulHop');
    }
    rn.pendingAct = false; rn.pendingJump = false;
  } else if (ph.mode !== 'swap') {
    const sol = wizCaulSolids(st, rn);
    wizBody(rn, dt, sol);
    if (rn.y > wizCaulFloor(rn.x + rn.w / 2) + 300) { const rx = ph.cx + 160; Object.assign(rn, { x: rx - rn.w / 2, y: wizCaulFloor(rx) - rn.h - 2, vx: 0, vy: 0 }); }   // (never: a safety net)
    // pick up by touching
    if (!ph.carry) {
      for (const it of ph.items) {
        // (only the next ingredient on the card, or a look-alike of it, jumps into your hands: later ones wait their turn)
        if (it.used || it.carried || it.hop > 0 || it.slope !== ph.slope || (it.good && it.idx !== ph.got)) continue;
        if (rn.x + rn.w > it.x - 12 && rn.x < it.x + 12 && rn.y + rn.h > it.y - 24 && rn.y < it.y) {
          ph.carry = it; it.carried = true; Sfx.play('wizCaulPick');
          if (!it.good) wizHint(st, ph.run, 'Hmm, that one looks a bit off...', { cpu: 'Hm, wrong one?' });
          break;
        }
      }
    }
    const tossP = rn.pendingAct; rn.pendingAct = false;
    if (tossP && ph.carry) {
      const d = Math.hypot(rn.x + rn.w / 2 - ph.cx, rn.y + rn.h / 2 - (wizCaulRim(ph) - 10));
      if (d < K.toss && ph.mode !== 'boil') wizCaulToss(st, rn);
      else wizPop(st, rn.x + rn.w / 2, rn.y - 30, d < K.toss ? 'Wait!' : 'Too far!', '#ffffff', 14);
    }
    // the steam vents (slope 3): a blast knocks the runner back
    for (const v of ph.vents) {
      const c = (ph.t + v.ph) % K.vent.period, was = v.state;
      v.state = c < K.vent.on ? 'on' : c > K.vent.period - K.vent.warn ? 'warn' : 'off';
      if (Math.abs(v.x - ph.cx) > 1200) continue;
      if (v.state === 'warn' && was === 'off' && Math.abs(v.x - rn.x) < 500) Sfx.play('wizCaulHiss');
      if (v.state === 'on' && rn.alive && Math.abs(rn.x + rn.w / 2 - v.x) < 22 + rn.w / 2 && rn.y + rn.h > wizCaulFloor(v.x) - K.vent.h && st.safe[rn.id] <= 0) {
        knock(rn, -240, -330, 0.5, 0.3); st.safe[rn.id] = 0.8; wizPop(st, v.x, rn.y - 20, 'Pfffsh!', '#ffffff', 16); Sfx.play('wizCaulHiss');
      }
    }
    // caught by the cauldron: scooped onto the rim
    const hiK = ph.fork && ph.fork.rail === 'hi' ? wizCaulHiK(ph.fork, ph.cx) : 0;
    if (ph.mode === 'roll' && ph.scoopCool <= 0 && hiK < 0.5 && rn.x + rn.w > ph.cx - 44 && rn.x < ph.cx + 52 && rn.y + rn.h > wizCaulRim(ph) + 30 && rn.y + rn.h < wizCaulY(ph) + 40) {
      ph.scoop = K.scoop.t; wizStats(st).scoops++; wizCaulDropCarry(st);
      wizPop(st, ph.cx, wizCaulRim(ph) - 40, 'Scooped!', '#ffffff', 18); Sfx.play('wizCaulScoop');
      wizHint(st, ph.run, 'Stay ahead of the cauldron!', { cpu: 'Whoa! Running ahead!' });
    }
  }
  // --- ingredients: the wanted one never gets left behind ---
  const w = wizCaulWant(ph);
  if (w && !w.carried && !w.hop && (ph.mode === 'roll' || ph.mode === 'park') && w.x < ph.cx + (ph.mode === 'park' ? 60 : 70)) {
    let nx = Math.min(ph.cx + (ph.mode === 'park' ? 240 : 520), wizCaulA(ph.slope) + K.len + K.land - 60);
    for (let n = 0; n < 6 && (wizCaulInGap(nx) || wizCaulBlocked(ph, nx)); n++) nx += 70;
    w.x = nx; w.y = wizCaulFloor(nx); w.hop = 0.6; w.lv = 'f';
    wizPop(st, nx, w.y - 40, 'Wait for me!', '#ffffff', 14); Sfx.play('wizCaulHop');
  }
  for (const fx of ph.tossFx) { fx.t += dt; if (fx.t >= fx.life && !fx.done) { fx.done = true; wizCaulLand(st, fx.it); } }
  ph.tossFx = ph.tossFx.filter(fx => !fx.done);
  if (ph.carry) { ph.carry.x = rn.x + rn.w / 2; ph.carry.y = rn.y - 4; }
  wizCaulSeat(st);
  wizCaulCam(st, dt);
  wizCaulHints(st);
}
// a barrel or a crate where an ingredient would land
function wizCaulBlocked(ph, x) { return ph.solids.some(r => (r.kind === 'barrel' || r.kind === 'crate') && x > r.x0 - 16 && x < r.x1 + 16); }
// the solids near a body (and the camera's edges: the runner stays on screen)
function wizCaulSolids(st, p) {
  const ph = st.ph, out = [], x = p.x;
  for (const r of ph.solids) { if (r.x0 > x + 160) break; if (r.x1 > x - 160) out.push(r); }
  out.push({ x0: st.cam.x - 40, y0: -5000, x1: st.cam.x + 2, y1: 5000, kind: 'edge' }, { x0: st.cam.x + W - 24, y0: -5000, x1: st.cam.x + W + 40, y1: 5000, kind: 'edge' });
  return out;
}
function wizCaulHints(st) {
  const ph = st.ph, K = WIZCAUL;
  if (ph.mode !== 'roll') return;
  if (!st.hints[ph.stir]) {
    const f = ph.forks[ph.slope];
    if (f && ph.cx > f.x - 450 && ph.cx < f.x - 100 && !ph.lean) wizHint(st, ph.stir, 'Fork ahead! ' + (f.good === 'hi' ? wizKey(ph.stir, 'left') + ' top rail' : wizKey(ph.stir, 'right') + ' bottom rail'), { cpu: 'Leaning ' + (f.good === 'hi' ? 'up' : 'down') + '!' });
    else if (ph.foam > 0.55) wizHint(st, ph.stir, 'Stir on the gold mark! ' + wizKey(ph.stir, 'act'), { cpu: 'Stirring!', life: 1.6 });
  }
  if (!st.hints[ph.run] && !ph.carry && ph.got === 0 && ph.t < 8) wizHint(st, ph.run, 'Touch the ' + WIZCAUL_NAMES[ph.recipes[ph.slope][0]] + ' to pick it up!', { cpu: 'Fetching!' });
  else if (!st.hints[ph.run] && ph.carry) {
    const rn = G.players[ph.run], d = Math.hypot(rn.x + rn.w / 2 - ph.cx, rn.y + rn.h / 2 - wizCaulRim(ph));
    if (d < K.toss - 20) wizHint(st, ph.run, 'Toss it in! ' + wizKey(ph.run, 'act'), { cpu: 'Tossing!', life: 1.4 });
  }
}
function wizCaulCam(st, dt) {
  const ph = st.ph;
  st.cam.x = Math.max(0, ph.cx - 300);
  const want = wizCaulFloor(ph.cx + 220) - 430;
  ph.camY += (want - ph.camY) * Math.min(1, (dt || 0) * 3);
  st.cam.y = Math.round(ph.camY);
  const c = st.hm;
  c.x += (ph.cx + 470 - c.x) * Math.min(1, (dt || 0) * 2); c.y = st.cam.y + 150 + Math.sin(ph.t * 0.9) * 12; c.face = -1;
  if (c.pose === 'talk' && !st.say) c.pose = 'idle';
}
function wizCaulCoast(st, dt) {
  const ph = st.ph;
  if (!ph.items) return;
  for (const p of G.players) { p.vx = 0; p.vy = 0; p.pendingJump = false; p.pendingAct = false; }
  wizCaulSeat(st); wizCaulCam(st, dt || 0);
}

/* ---------- drawing ---------- */
function wizCaulDrawItem(type, good, x, y, s = 1, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8;
  if (good) { ctx.save(); ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 5 + x); ctx.fillStyle = WIZ_SPELLS.brew.glow; circle(0, -12, 17); ctx.fill(); ctx.restore(); }
  switch (type) {
    case 'mush':
      ctx.fillStyle = '#f2e6d0'; ctx.fillRect(-3, -12, 6, 12); ctx.strokeRect(-3, -12, 6, 12);
      ctx.fillStyle = good ? '#7ff0c0' : '#e0443a'; ctx.beginPath(); ctx.arc(0, -12, 11, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = good ? '#e8fff4' : '#ffffff'; circle(-4, -16, 2); ctx.fill(); circle(4, -15, 1.6); ctx.fill(); break;
    case 'pepper':
      ctx.fillStyle = good ? '#f4f0ff' : '#ff7a2a'; ctx.beginPath(); ctx.moveTo(-8, -18); ctx.quadraticCurveTo(10, -18, 6, -2); ctx.quadraticCurveTo(2, -10, -8, -12); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#3f8a4a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-8, -15); ctx.lineTo(-12, -20); ctx.stroke(); break;
    case 'root':
      ctx.fillStyle = good ? '#a8784a' : '#ff9a3c'; ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(8, -20); ctx.lineTo(1, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#3f8a4a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-3, -20); ctx.lineTo(-6, -27); ctx.moveTo(3, -20); ctx.lineTo(5, -27); ctx.stroke();
      if (good) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-4, -13); ctx.lineTo(-1, -13); ctx.moveTo(1, -13); ctx.lineTo(4, -13); ctx.stroke(); text('z', 10, -26 - (t * 8 % 6), 10, '#ffffff', 'center', 'body'); } break;
    case 'fog':
      ctx.fillStyle = good ? 'rgba(230,236,255,0.9)' : '#7a5a3a'; rr(-8, -20, 16, 20, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9a46a'; ctx.fillRect(-6, -24, 12, 5); ctx.strokeRect(-6, -24, 12, 5);
      if (good) { ctx.strokeStyle = '#9aa0c0'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(-1, -10, 4, t * 3, t * 3 + 4); ctx.stroke(); } break;
    case 'shell':
      ctx.fillStyle = good ? '#c48cff' : '#8a8a90'; circle(0, -10, 10); ctx.fill(); ctx.stroke();
      if (good) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -10, 5, 0, 5); ctx.stroke(); text('♪', 12, -22 - Math.sin(t * 4) * 2, 11, '#ffffff', 'center', 'body'); } break;
    case 'petal':
      ctx.fillStyle = good ? '#ffb0d8' : '#6ab04a'; ctx.beginPath(); ctx.ellipse(0, -10, 7, 11, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (good) { ctx.fillStyle = '#ffffff'; circle(9, -18, 1.6); ctx.fill(); circle(12, -14, 1.2); ctx.fill(); } break;
  }
  ctx.restore();
}
function wizCaulDrawBack(st) {
  const ph = st.ph, cx = st.cam.x, cy = st.cam.y, C2 = WIZCAUL_C, t = G.clock, k = wizCaulSlopeAt(cx + 300);
  wizScreen(st, () => {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, k === 2 ? '#2a1a2a' : '#1e1830'); g.addColorStop(1, k === 2 ? '#4a2a2a' : '#3a3150'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // a far row of small arches, dim
    const off2 = cx * 0.25, sp2 = 150;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let x = -((off2 % sp2) + sp2) % sp2 - sp2; x < W + sp2; x += sp2) { ctx.beginPath(); ctx.moveTo(x + 20, H); ctx.lineTo(x + 20, 300); ctx.arc(x + sp2 / 2, 300, sp2 / 2 - 20, Math.PI, 0); ctx.lineTo(x + sp2 - 20, H); ctx.fill(); }
    // stone arches going by (parallax)
    const off = cx * 0.5, span = 300;
    for (let x = -((off % span) + span) % span - span; x < W + span; x += span) {
      ctx.fillStyle = C2.stoneDk; ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x, 200); ctx.arc(x + span / 2, 200, span / 2, Math.PI, 0); ctx.lineTo(x + span, H); ctx.closePath(); ctx.fill();
      // the arch's voussoirs, and a shadow inside the curve
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + span / 2, 200, span / 2 - 16, Math.PI, 0); ctx.stroke();
      for (let a = 0; a <= 8; a++) { const ang = Math.PI + a * Math.PI / 8; ctx.beginPath(); ctx.moveTo(x + span / 2 + Math.cos(ang) * (span / 2 - 16), 200 + Math.sin(ang) * (span / 2 - 16)); ctx.lineTo(x + span / 2 + Math.cos(ang) * span / 2, 200 + Math.sin(ang) * span / 2); ctx.stroke(); }
      // the pillar: blocks, a lit edge and a shaded edge
      ctx.fillStyle = C2.stone; ctx.fillRect(x - 18, 0, 36, H);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x - 18, 0, 5, H);
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x + 12, 0, 6, H);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let y = 30; y < H; y += 34) { ctx.moveTo(x - 18, y); ctx.lineTo(x + 18, y); const jx = x + (((y / 34) | 0) % 2 ? -4 : 6); ctx.moveTo(jx, y); ctx.lineTo(jx, y + 34); }
      ctx.stroke();
      // a candle sconce with a drip of wax and a warm glow on the stone
      const fl = reduceMotion ? 0 : Math.sin(t * 9 + x);
      const gl = ctx.createRadialGradient(x, 134, 2, x, 134, 60); gl.addColorStop(0, 'rgba(255,207,106,' + (0.32 + 0.05 * fl) + ')'); gl.addColorStop(1, 'rgba(255,207,106,0)');
      ctx.fillStyle = gl; circle(x, 134, 60); ctx.fill();
      ctx.fillStyle = C2.brass; ctx.beginPath(); ctx.moveTo(x - 10, 150); ctx.lineTo(x + 10, 150); ctx.lineTo(x + 4, 160); ctx.lineTo(x - 4, 160); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 4, 157, 8, 3);
      ctx.fillStyle = '#fff4d6'; ctx.fillRect(x - 3, 138, 6, 12); ctx.fillStyle = '#e8dcbc'; ctx.fillRect(x + 1, 138, 2, 12); ctx.fillRect(x - 3, 140, 2, 5);
      ctx.fillStyle = '#ffcf6a'; ctx.beginPath(); ctx.ellipse(x, 133, 3, 5 + fl, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff6d8'; circle(x, 134, 1.5); ctx.fill();
    }
    // racks of jars far back on slope 2, pipes on slope 3
    if (k === 1) for (let x = -((cx * 0.7) % 120 + 120) % 120; x < W; x += 120) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x + 2, 238, 98, 5); ctx.fillStyle = 'rgba(90,58,30,0.75)'; ctx.fillRect(x, 230, 100, 8); ctx.fillStyle = 'rgba(255,220,160,0.18)'; ctx.fillRect(x, 230, 100, 2);
      for (let j = 0; j < 4; j++) { const jx = x + 8 + j * 22, jh = 16 + (hash(j, 4) % 3) * 3; ctx.fillStyle = ['#5a8a6a', '#8a5a7a', '#5a6a9a', '#9a8a4a'][j]; rr(jx, 230 - jh, 14, jh, 3); ctx.fill(); ctx.fillRect(jx + 4, 226 - jh, 6, 5);
        ctx.fillStyle = '#8a6a48'; ctx.fillRect(jx + 3, 223 - jh, 8, 4); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(jx + 2, 232 - jh, 2, jh - 6); ctx.fillStyle = 'rgba(240,230,200,0.5)'; ctx.fillRect(jx + 3, 238 - jh - 2 + jh / 3, 8, 5); } }
    if (k === 2) { ctx.strokeStyle = 'rgba(160,110,80,0.55)'; ctx.lineWidth = 10; for (let x = -((cx * 0.7) % 260 + 260) % 260; x < W; x += 260) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 120); ctx.lineTo(x + 140, 120); ctx.lineTo(x + 140, 260); ctx.stroke(); } }
  });
  // the floor: one slope line
  const x0 = cx - 40, x1 = cx + W + 40;
  ctx.fillStyle = C2.floor; ctx.beginPath(); ctx.moveTo(x0, cy + H + 20);
  for (let x = x0; x <= x1; x += 20) ctx.lineTo(x, wizCaulFloor(x));
  ctx.lineTo(x1, cy + H + 20); ctx.closePath(); ctx.fill();
  // flagstones under the slope: two courses that follow it, with staggered joints and a darker depth
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2;
  for (const [d, sp, sh] of [[26, 70, 0], [62, 90, 35]]) {
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 20) { if (x === x0) ctx.moveTo(x, wizCaulFloor(x) + d); else ctx.lineTo(x, wizCaulFloor(x) + d); }
    for (let x = Math.floor((x0 - sh) / sp) * sp + sh; x <= x1; x += sp) { const y = wizCaulFloor(x); ctx.moveTo(x, y + d - (d === 26 ? 24 : 34)); ctx.lineTo(x, y + d); }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.moveTo(x0, cy + H + 20);
  for (let x = x0; x <= x1; x += 20) ctx.lineTo(x, wizCaulFloor(x) + 62);
  ctx.lineTo(x1, cy + H + 20); ctx.closePath(); ctx.fill();
  for (let x = Math.floor(x0 / 37) * 37; x <= x1; x += 37) { const h = hash(x, 9); if (h % 3) continue; ctx.fillStyle = 'rgba(255,255,255,0.08)'; circle(x + (h % 20), wizCaulFloor(x) + 10 + ((h >> 4) % 12), 2 + (h >> 8) % 2); ctx.fill(); }
  ctx.strokeStyle = C2.floorLt; ctx.lineWidth = 4; ctx.beginPath();
  for (let x = x0; x <= x1; x += 20) { if (x === x0) ctx.moveTo(x, wizCaulFloor(x)); else ctx.lineTo(x, wizCaulFloor(x)); }
  ctx.stroke();
  // the gap with its rail bridge
  const gx = wizCaulA(2) + WIZCAUL.gap.at;
  if (gx + 200 > cx && gx - 200 < cx + W) {
    const gy = wizCaulFloor(gx);
    ctx.fillStyle = '#120c1a'; ctx.fillRect(gx, gy - 2, WIZCAUL.gap.w, WIZCAUL.gap.depth + 2);
    ctx.fillStyle = 'rgba(255,120,60,' + (0.25 + 0.1 * Math.sin(t * 3)) + ')'; ctx.fillRect(gx, gy + WIZCAUL.gap.depth - 14, WIZCAUL.gap.w, 14);
    // (the cauldron's rail bridge: a thin brass rail on trestles, nothing to stand on)
    ctx.strokeStyle = C2.woodDk; ctx.lineWidth = 3; for (const dx of [20, 55, 90]) { ctx.beginPath(); ctx.moveTo(gx + dx, gy); ctx.lineTo(gx + dx - 12, gy + WIZCAUL.gap.depth); ctx.moveTo(gx + dx, gy); ctx.lineTo(gx + dx + 12, gy + WIZCAUL.gap.depth); ctx.stroke(); }
    ctx.strokeStyle = C2.brass; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(gx - 10, gy - 1); ctx.lineTo(gx + WIZCAUL.gap.w + 10, gy - 1); ctx.stroke();
  }
  // fork rails, signs and the syrup pipe
  for (const f of ph.forks) {
    if (f.x + f.len < cx - 100 || f.sign > cx + W + 100) continue;
    ctx.strokeStyle = C2.brass; ctx.lineWidth = 4; ctx.beginPath();
    for (let x = f.x; x <= f.x + f.len; x += 10) { const y = wizCaulFloor(x) - wizCaulHiK(f, x) * WIZCAUL.hiRail - 2; if (x === f.x) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.strokeStyle = C2.woodDk; ctx.lineWidth = 4;
    for (let x = f.x + 160; x < f.x + f.len - 150; x += 70) { ctx.beginPath(); ctx.moveTo(x, wizCaulFloor(x) - WIZCAUL.hiRail); ctx.lineTo(x, wizCaulFloor(x)); ctx.stroke(); }
    // the sign: the clean rail
    const sy = wizCaulFloor(f.sign);
    ctx.fillStyle = C2.woodDk; ctx.fillRect(f.sign - 3, sy - 110, 6, 110);
    ctx.fillStyle = '#f2e6d0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(f.sign - 34, sy - 150, 68, 46, 6); ctx.fill(); ctx.stroke();
    bigText(f.good === 'hi' ? '↑' : '↓', f.sign - 12, sy - 126, 26, '#2f9a3c', 1);
    text(f.good === 'hi' ? 'TOP' : 'LOW', f.sign + 14, sy - 120, 12, C.ink, 'center', 'body');
    // the hiccup-syrup pipe over the wrong rail
    const bad = f.good === 'hi' ? 'lo' : 'hi', dy = wizCaulFloor(f.drip) - (bad === 'hi' ? WIZCAUL.hiRail : 0);
    ctx.fillStyle = '#7a6a8a'; ctx.fillRect(f.drip - 8, dy - 260, 16, 120); ctx.strokeRect(f.drip - 8, dy - 260, 16, 120);
    ctx.fillStyle = C2.syrup; for (let n = 0; n < 3; n++) { const yy = dy - 140 + ((t * 120 + n * 40) % 120); circle(f.drip, yy, 4); ctx.fill(); }
  }
}
function wizCaulDraw(st) {
  const ph = st.ph, K = WIZCAUL, C2 = WIZCAUL_C, t = G.clock, cx = st.cam.x;
  ctx.lineJoin = 'round';
  for (const fl of ph.flags) if (fl.x > cx - 60 && fl.x < cx + W + 60) wizDrawFlag(fl.x + 30, wizCaulFloor(fl.x + 30), fl.lit, WIZ_SPELLS.brew.col);
  // shelves, crates, barrels
  for (const r of ph.solids) {
    if (r.x1 < cx - 40 || r.x0 > cx + W + 40) continue;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2;
    if (r.kind === 'shelf') { ctx.fillStyle = C2.wood; rr(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = C2.woodDk; ctx.fillRect(r.x0 + 6, r.y1, 5, 14); ctx.fillRect(r.x1 - 11, r.y1, 5, 14); }
    else if (r.kind === 'crate') { ctx.fillStyle = '#b07a42'; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.beginPath(); ctx.moveTo(r.x0, r.y0); ctx.lineTo(r.x1, r.y1); ctx.moveTo(r.x1, r.y0); ctx.lineTo(r.x0, r.y1); ctx.stroke(); }
    else if (r.kind === 'barrel') { ctx.fillStyle = '#7a4a2a'; rr(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, 10); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#2c2a36'; ctx.lineWidth = 3; for (const yy of [r.y0 + 9, r.y1 - 11]) { ctx.beginPath(); ctx.moveTo(r.x0 + 2, yy); ctx.lineTo(r.x1 - 2, yy); ctx.stroke(); } }
  }
  // vents
  for (const v of ph.vents) {
    if (v.x < cx - 60 || v.x > cx + W + 60) continue;
    const gy = wizCaulFloor(v.x);
    ctx.fillStyle = '#2c2a36'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(v.x - 22, gy - 6, 44, 8, 2); ctx.fill(); ctx.stroke();
    if (v.state === 'warn') { bigText('!', v.x, gy - 40, 26, '#ff5f6d', 1); ctx.fillStyle = 'rgba(235,240,255,0.35)'; for (let n = 0; n < 3; n++) { circle(v.x + Math.sin(t * 9 + n) * 6, gy - 12 - n * 8, 5); ctx.fill(); } }
    if (v.state === 'on') { ctx.fillStyle = C2.steam; for (let n = 0; n < 9; n++) { const yy = gy - 10 - n * (K.vent.h / 9), r = 12 + n * 1.6 + Math.sin(t * 14 + n) * 3; circle(v.x + Math.sin(t * 10 + n * 1.3) * 5, yy, r); ctx.fill(); } }
  }
  // ingredients (not carried)
  for (const it of ph.items) {
    if (it.used || it.carried || it.slope !== ph.slope && it.slope !== ph.slope + 1) continue;
    if (it.x < cx - 40 || it.x > cx + W + 40) continue;
    const hop = it.hop > 0 ? Math.sin((it.hop / 0.6) * Math.PI) * 30 : 0;
    const later = it.good && it.slope === ph.slope && it.idx !== ph.got;
    if (later) ctx.globalAlpha = 0.7;
    wizCaulDrawItem(it.type, it.good && !later, it.x, it.y - hop, later ? 0.85 : 1, t);
    ctx.globalAlpha = 1;
  }
  wizCaulDrawPot(st);
  // tosses in flight
  for (const fx of ph.tossFx) {
    const u = fx.t / fx.life, tx = ph.cx, ty = wizCaulRim(ph) - 6;
    wizCaulDrawItem(fx.it.type, fx.it.good, fx.x0 + (tx - fx.x0) * u, fx.y0 + (ty - fx.y0) * u - Math.sin(u * Math.PI) * 70, 0.9, t);
  }
}
function wizCaulDrawPot(st) {
  const ph = st.ph, K = WIZCAUL, C2 = WIZCAUL_C, t = G.clock, x = ph.cx, y = wizCaulY(ph), r = wizCaulRim(ph);
  ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = C.ink;
  // the stand and wheels
  ctx.lineWidth = 2.5; ctx.fillStyle = C2.ironLt;
  for (const dx of [-30, 30]) { ctx.save(); ctx.translate(x + dx, y - 11); ctx.rotate(ph.cx / 11); circle(0, 0, 11); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.moveTo(0, -11); ctx.lineTo(0, 11); ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = C2.iron; ctx.fillRect(x - 40, y - 28, 80, 7); ctx.strokeRect(x - 40, y - 28, 80, 7);
  // the brake chain (glows while braking or hot)
  ctx.strokeStyle = ph.braking ? '#ff9a3c' : ph.brakeCool > 0 ? '#ff5f3c' : '#9a9aa8'; ctx.lineWidth = 3; ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(x - 46, r + 10); ctx.lineTo(x - 48, y - 22); ctx.stroke(); ctx.setLineDash([]);
  if (ph.braking) for (let n = 0; n < 3; n++) burst(x - 34 + n * 30, y - 2, '#ffcf6a', 1);
  // the pot
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillStyle = C2.iron;
  ctx.beginPath(); ctx.moveTo(x - 50, r); ctx.quadraticCurveTo(x - 56, y - 20, x, y - 24); ctx.quadraticCurveTo(x + 56, y - 20, x + 50, r); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C2.ironLt; ctx.fillRect(x - 40, r + 14, 12, 26);
  // the potion and the foam
  const col = ph.silly > 0 || ph.drip > 0 ? C2.silly[ph.sillyC] : C2.potion;
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, r, 50, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const fh = ph.foam * 26;
  if (fh > 2) { ctx.fillStyle = C2.foam; for (let n = -3; n <= 3; n++) { circle(x + n * 13, r - 2 - fh * (0.6 + 0.4 * Math.sin(t * 6 + n)), 8 + fh * 0.25); ctx.fill(); } }
  // rim
  ctx.fillStyle = C2.ironLt; rr(x - 54, r - 4, 108, 8, 4); ctx.fill(); ctx.stroke();
  // the geyser
  if (ph.mode === 'boil') {
    const h = Math.min(1, ph.modeT * 4) * (1 - Math.max(0, ph.modeT - 1.2) / 0.6) * 220;
    ctx.fillStyle = C2.foam; for (let n = 0; n < 12; n++) { circle(x + Math.sin(t * 13 + n) * 14, r - n * h / 12, 16 + Math.sin(n + t * 8) * 4); ctx.fill(); }
  }
  ctx.restore();
  // the stirrer on the rim with the big ladle; a scooped runner on the other side
  const sp = G.players[ph.stir], u = ph.stirAnim > 0 ? Math.sin((ph.stirAnim / 0.35) * Math.PI) : 0;
  ctx.save(); ctx.strokeStyle = '#6e4622'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 20, r - 30); ctx.lineTo(x + 6 + u * 16, r + 6); ctx.stroke(); ctx.fillStyle = '#9a9aa8'; circle(x + 8 + u * 16, r + 6, 6); ctx.fill(); ctx.restore();
  wizDrawHero(ph.stir, x - 30, r + 4, { face: 1, sx: 1, sy: 1 });
  if (ph.scoop > 0) wizDrawHero(ph.run, x + 26, r + 4 - Math.abs(Math.sin(t * 10)) * 6, { face: 1, stun: true });
  // the carried ingredient over the runner's head
  if (ph.carry && ph.scoop <= 0) { const rn = G.players[ph.run]; wizCaulDrawItem(ph.carry.type, ph.carry.good, rn.x + rn.w / 2, rn.y - 2, 0.9, t); }
  void sp;
}
function wizCaulHud(st) {
  const ph = st.ph, K = WIZCAUL, big = wizBig(), z = big ? 1.35 : 1, t = G.clock;
  // the bubble ring and the gold mark, beside the pot (screen coords)
  const px = ph.cx - st.cam.x + 82 * z, py = wizCaulRim(ph) - st.cam.y - 40 * z, R = 22 * z;
  ctx.save();
  ctx.fillStyle = 'rgba(30,20,66,0.8)'; circle(px, py, R + 8 * z); ctx.fill();
  // (the gold band: early edge to late edge; past the outer edge the late part runs on into the next beat's start)
  const r0 = R * (K.mark - wizCaulWin(ph)), r1 = R * Math.min(1, K.mark + wizCaulWin(ph) + (ph.gold > 0 ? K.goldLate : K.late));
  ctx.strokeStyle = ph.gold > 0 ? C.gold : '#ffd23f'; ctx.lineWidth = Math.max(3, r1 - r0); ctx.globalAlpha = 0.55; circle(px, py, (r0 + r1) / 2); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 1.5; circle(px, py, R * K.mark); ctx.stroke();
  if (ph.mode === 'roll') { const u = wizCaulU(ph); ctx.strokeStyle = wizCaulStirred(ph) ? '#9fe07f' : '#ffffff'; ctx.lineWidth = 3; circle(px, py, Math.max(1, R * u)); ctx.stroke(); }
  // the foam meter under it
  const fw = 52 * z, fh = 8 * z, fx = px - fw / 2, fy = py + R + 12 * z;
  ctx.fillStyle = 'rgba(30,20,66,0.85)'; rr(fx - 3, fy - 3, fw + 6, fh + 6, 5); ctx.fill();
  ctx.fillStyle = ph.foam > 0.75 ? (Math.sin(t * 14) > 0 ? '#ff5f6d' : '#ffd23f') : WIZ_SPELLS.brew.col; rr(fx, fy, fw * ph.foam, fh, 3); ctx.fill();
  text('foam', fx + fw / 2, fy + fh + 12 * z, 11 * z, 'rgba(255,255,255,0.75)', 'center', 'body');
  if (ph.braking || ph.brakeCool > 0) text(ph.braking ? 'brake!' : 'brake hot', px, py - R - 14 * z, 12 * z, ph.braking ? '#ffcf6a' : '#ff7a5a', 'center', 'body');
  ctx.restore();
  // the recipe card (top left): the next three wanted ingredients
  const cw = 156 * z, ch = 64 * z, x0 = 12, y0 = (big ? 128 : 100);
  ctx.save(); ctx.fillStyle = 'rgba(242,230,208,0.93)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(x0, y0, cw, ch, 8); ctx.fill(); ctx.stroke();
  text('Recipe ' + Math.min(9, ph.got) + '/9', x0 + 8, y0 + 14 * z, 12 * z, C.ink, 'left', 'body');
  const rec = ph.recipes[ph.slope];
  for (let n = 0; n < 3; n++) {
    const i = ph.got + n; if (i >= 9) break;
    const ix = x0 + 26 * z + n * 46 * z, iy = y0 + ch - 10 * z;
    if (n === 0) { ctx.fillStyle = 'rgba(126,224,122,0.45)'; circle(ix, iy - 12 * z, 18 * z); ctx.fill(); }
    wizCaulDrawItem(rec[i], true, ix, iy, z * (n === 0 ? 1.1 : 0.85), t);
  }
  ctx.restore();
  if (ph.gold > 0) { ctx.save(); ctx.globalAlpha = 0.9; text('Gold ladle ' + Math.ceil(ph.gold) + 's', W / 2, H - 22, 14 * z, C.gold, 'center', 'body'); ctx.restore(); }
}

WIZ_PHASES.cauldron = {
  setup(st, L) { wizCaulSetup(st, L); },
  step(st, dt) { wizCaulStep(st, dt); },
  coast(st, dt) { wizCaulCoast(st, dt); },
  plan(st) { return wizCaulPlan(st); },
  hide(st) { const ph = st.ph; if (!ph.items) return false; return [0, 1].map(id => id === ph.stir || (id === ph.run && ph.scoop > 0)); },
  busy(st, p) { return p.id === st.ph.stir; },
  headLift: () => 8,
  labels(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.stir ? 'stir' : 'toss')); },
  roles(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.stir ? 'Stir!' : 'Fetch!')); },
  legend(st) {
    const ph = st.ph, s = k => (k ? '<kbd>/</kbd> stir, <kbd>←</kbd><kbd>→</kbd> rail, <kbd>↓</kbd> brake' : '<kbd>F</kbd> stir, <kbd>A</kbd><kbd>D</kbd> rail, <kbd>S</kbd> brake');
    return { pip: ph.stir === 0 ? s(0) : 'touch, then <kbd>F</kbd> toss', bo: ph.stir === 1 ? s(1) : 'touch, then <kbd>/</kbd> toss', pad: 'stirrer: stick picks the rail, down brakes,' };
  },
  hudText(st) { const ph = st.ph; return 'Recipe ' + Math.min(9, ph.got) + '/9   Slope ' + (ph.slope + 1) + ' of 3'; },
  progress(st) { const ph = st.ph; return { n: ph.slope + (ph.mode === 'done' ? 1 : 0), of: 3 }; },
  drawBack(st) { wizCaulDrawBack(st); },
  draw(st) { wizCaulDraw(st); },
  hud(st) { wizCaulHud(st); },
  statLine(st) { const s = st.stats.cauldron; return s && s.stirs >= 60 ? s.stirs + ' smooth stirs' : ''; },
};

/* ---------- sounds ---------- */
Sfx.extra.wizCaulStir = function () { this.tone(520, 0.08, 'sine', 0.04, 780); this.tone(1040, 0.06, 'triangle', 0.02, null, 0.04); };
Sfx.extra.wizCaulSplish = function () { this.tone(900, 0.06, 'sawtooth', 0.012, 500); };
Sfx.extra.wizCaulBloop = function () { this.tone(160, 0.12, 'sine', 0.05, 260); };
Sfx.extra.wizCaulFoomp = function () { this.tone(90, 0.5, 'sawtooth', 0.05, 300); this.tone(400, 0.4, 'sine', 0.03, 1200, 0.1); };
Sfx.extra.wizCaulToss = function () { this.tone(700, 0.1, 'triangle', 0.025, 1100); };
Sfx.extra.wizCaulGood = function () { [523, 784].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.04, null, i * 0.06)); this.tone(200, 0.1, 'sine', 0.04, 120); };
Sfx.extra.wizCaulBlorp = function () { this.tone(300, 0.2, 'square', 0.03, 90); this.tone(1200, 0.08, 'sine', 0.02, 400, 0.1); };
Sfx.extra.wizCaulBrake = function () { this.tone(2200, 0.4, 'sawtooth', 0.012, 900); };
Sfx.extra.wizCaulScoop = function () { this.tone(300, 0.12, 'triangle', 0.04, 700); };
Sfx.extra.wizCaulHop = function () { this.tone(600, 0.07, 'square', 0.02, 900); };
Sfx.extra.wizCaulPick = function () { this.tone(880, 0.06, 'triangle', 0.03); };
Sfx.extra.wizCaulHiss = function () { this.tone(3000, 0.35, 'sawtooth', 0.008, 2400); };
Sfx.extra.wizCaulCreak = function () { this.tone(140, 0.3, 'sawtooth', 0.025, 90); };
Sfx.extra.wizCaulClunk = function () { this.tone(110, 0.15, 'square', 0.05, 70); };

/* ---------- the room ---------- */
wizRoom('cauldron', {
  act: { label: 'stir', labels: ['stir', 'toss'] },
  tip: 'One stirs on the gold mark (and picks the clean rail); one runs ahead and tosses in what the recipe card shows!',
  legend: { pip: '<kbd>F</kbd> stir, <kbd>A</kbd><kbd>D</kbd> rail, <kbd>S</kbd> brake', bo: 'touch, then <kbd>/</kbd> toss', pad: 'stirrer: stick picks the rail, down brakes,' },
  map: WIZ_EMPTY_MAP,
});
