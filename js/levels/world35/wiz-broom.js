/* Pip & Bo - Level 35-1 Moonwick Academy: class 1 'broom' (Broom Flying, spell Zoom). */
'use strict';

/* ===== 35-1 class 1: Broom Flying (WIZ_PHASES.broom) ==========================================================
   Both ride one long, wobbly school broom over the academy grounds, scrolling right. The gentlest class: it teaches
   that two jobs make one machine. The class draws Pip and Bo itself (hide() is true): they sit on the broom.

   THE TWO JOBS (room field `first` is the first STEERER; they swap at the two landing platforms)
   - STEERER (front, action word "swat"): hold UP (the jump button, wizUp) to climb, DOWN to dive, nothing held levels
     out. The broom has a little lag and bobs. The action swats with the hat: it knocks away one weather vane or one
     flapping laundry sheet within WIZBROOM.swat.r px ahead (then rests WIZBROOM.swat.rest s).
   - KICKER (back, action word "kick"): each press is one kick that pushes the broom forward and keeps it lively for
     0.9 s. A steady 2 kicks a second flies best. Mashing (WIZBROOM.hotN kicks inside 1 s) makes the bristles smoke:
     "Bristles hot!", no kicks for 1.2 s. With no kicks the broom slows, droops and sets down softly on the grass, a
     roof or the moat; a kick lifts it off again.

   THE COURSE: hand-made, no randomness, three stretches of about 35-40 s, each with its own ground:
     1 The Lawns      hedges to climb over, washing lines to dive under, lantern rings
     2 The Rooftops   chimneys puffing smoke on a rhythm, weather vanes that spin up and lunge ("!" first), a laundry
                      sheet, two bell towers to thread
     3 The Moat Edge  wind gusts with visible streaks, the waterfall pouring off the island's edge to skim under, old
                      bridge pillars
   Rings of floating lanterns mark the way: flying through one gives a speed puff, and every ring passed is the safe
   spot (a mid-class checkpoint about every 5 s). Jobs swap at the two landing platforms between stretches (the broom
   lands by itself, they hop off and trade places, then the new kicker's first kick takes off).

   FAILS. Hitting anything is a "Bonk!": a counted Oops (team), the broom spins once and reappears at the last lantern
   ring (at a height that clears what comes next), with WIZBROOM.graceT s of grace. GOLD HELP after WIZ.goldAfter Oops in one stretch: a gold bristle, the
   broom auto-levels gently toward the next ring for 20 s when the steerer holds nothing (announced, never hidden).
   And nobody stays stuck on one thing: WIZBROOM.towAfter bonks from the same lantern ring and Thimblewick tows the
   broom on to the next ring (a gold tow, announced).

   NEVER ALONE. No kicks means no flight; no steering flies level into the first hedge.
   Stats (st.stats.broom): rings, puffs, swats, hot.   Names: wizBroom* / WIZBROOM* (Sfx.extra.wizBroom*). */
const WIZBROOM = {
  sx: 300,                          // the broom's place on screen (x of its middle)
  grounds: [470, 410, 480],         // each stretch's ground (lawn, roof ridge, moat water)
  padTop: 400, padW: 520,           // the landing platforms
  len: 6800, gap: 800, start: 500,  // a stretch's length, the platform stretch after it, where stretch 1 starts
  ceil: 84,
  box: { x0: -58, x1: 48, top: 46, bot: 8 },   // the broom and riders' hit box around (x, y) (y is the stick)
  kick: { dv: 55, live: 0.9, vMax: 265, dragLive: 0.55, dragDead: 120, droop: 70, lift: 130 },
  hotN: 5, hotT: 1.2,
  steer: { up: -155, down: 175, k: 5, droopV: 95, bob: 3 },
  swat: { r: 130, rest: 0.5 },
  ring: { r: 48, puff: 45 },
  graceT: 1.5, spinT: 0.9, goldT: 20,
  towAfter: 4, towPast: 150,        // bonks from one lantern ring before the gold tow (to the next ring; towPast px when there is none)
  smoke: { period: 2.8, on: 1.0, warn: 0.8, h: 110 },
  vane: { near: 430, warn: 1.0, lunge: 1.4, rest: 1.6, r: 66 },
  gust: { acc: 430 },
};
// the course: [kind, offset into the stretch, ...params]
//   ring y | hedge w h | line w bottom | chimney w h phase | vane | sheet y | tower w gapY gapH | gust w dir | fall w bottom
const WIZBROOM_COURSE = [
  [['ring', 300, 330], ['hedge', 700, 60, 90], ['ring', 1000, 300], ['line', 1400, 180, 250], ['hedge', 1800, 60, 120], ['ring', 2100, 290],
    ['line', 2500, 200, 240], ['hedge', 2850, 80, 140], ['ring', 3150, 300], ['hedge', 3500, 60, 100], ['line', 3820, 180, 262], ['ring', 4150, 330],
    ['hedge', 4550, 70, 130], ['line', 4900, 200, 250], ['ring', 5250, 340], ['hedge', 5650, 60, 130], ['hedge', 5950, 60, 95], ['ring', 6300, 310]],
  [['ring', 300, 250], ['chimney', 700, 44, 80, 0], ['ring', 1050, 210], ['vane', 1400], ['chimney', 1800, 44, 100, 1.2], ['tower', 2200, 90, 180, 135],
    ['ring', 2600, 240], ['vane', 3000], ['chimney', 3350, 44, 70, 0.6], ['chimney', 3650, 44, 110, 2.0], ['ring', 4000, 200], ['tower', 4400, 90, 150, 130],
    ['vane', 4800], ['ring', 5200, 250], ['chimney', 5550, 44, 90, 1.5], ['sheet', 5900, 260], ['ring', 6300, 240]],
  [['ring', 300, 300], ['gust', 600, 320, -1], ['hedge', 1050, 70, 120], ['ring', 1350, 320], ['gust', 1650, 320, 1], ['fall', 2050, 140, 330],
    ['ring', 2400, 410], ['hedge', 2750, 70, 150], ['gust', 3100, 320, -1], ['fall', 3500, 140, 340], ['ring', 3850, 410], ['gust', 4150, 300, 1],
    ['hedge', 4500, 70, 110], ['ring', 4850, 370], ['fall', 5200, 140, 350], ['gust', 5500, 320, -1], ['ring', 5850, 300], ['hedge', 6200, 70, 140]],
];
const WIZBROOM_NEWS = ['The Lawns: climb over hedges, dive under the washing!', 'The Rooftops: mind the chimney smoke and the weather vanes!', 'The Moat Edge: wind gusts and the waterfall!'];
const WIZBROOM_C = { stick: '#a8743e', stickDk: '#6e4622', straw: '#e8c25a', strawDk: '#b8902a', hedge: '#3f8a4a', hedgeDk: '#2a5e33', roof: '#5a4a7a', roofDk: '#3e3258',
  brick: '#9a5a4a', brickDk: '#6a3a30', smoke: 'rgba(200,196,214,0.85)', water: '#3a5a9a', waterLt: '#7aa0d8', lantern: '#ffcf6a', vane: '#c9a24a', sheet: '#f4efe4' };

const wizBroomBase = k => WIZBROOM.start + k * (WIZBROOM.len + WIZBROOM.gap);
const wizBroomPadX = k => (k === 0 ? 260 : wizBroomBase(k - 1) + WIZBROOM.len + WIZBROOM.gap / 2);   // the middle of platform k
function wizBroomGround(ph, x) {
  for (let k = 0; k <= 3; k++) { const px = wizBroomPadX(k); if (Math.abs(x - px) < WIZBROOM.padW / 2) return WIZBROOM.padTop; }
  for (let k = 2; k >= 0; k--) if (x >= wizBroomBase(k) - WIZBROOM.gap / 2) return WIZBROOM.grounds[k];
  return WIZBROOM.grounds[0];
}
const wizBroomStretchAt = x => (x >= wizBroomBase(2) - 200 ? 2 : x >= wizBroomBase(1) - 200 ? 1 : 0);

function wizBroomSetup(st, L) {
  const ph = st.ph, def = L.def;
  ph.steer = def.first || 0; ph.kick = 1 - ph.steer;
  ph.items = [];
  WIZBROOM_COURSE.forEach((list, k) => {
    const g = WIZBROOM.grounds[k], b = wizBroomBase(k);
    for (const it of list) {
      const [kind, off] = it, o = { kind, x: b + off, stretch: k, g };
      if (kind === 'ring') o.y = it[2];
      else if (kind === 'hedge') { o.w = it[2]; o.h = it[3]; }
      else if (kind === 'line') { o.w = it[2]; o.bot = it[3]; }
      else if (kind === 'chimney') { o.w = it[2]; o.h = it[3]; o.ph = it[4]; }
      else if (kind === 'vane') { o.y = g - 92; o.t = 0; o.state = 'rest'; }
      else if (kind === 'sheet') { o.y0 = it[2]; o.y = it[2]; }
      else if (kind === 'tower') { o.w = it[2]; o.gy = it[3]; o.gh = it[4]; }
      else if (kind === 'gust') { o.w = it[2]; o.dir = it[3]; }
      else if (kind === 'fall') { o.w = it[2]; o.bot = it[3]; }
      ph.items.push(o);
    }
  });
  ph.x = wizBroomPadX(0); ph.y = WIZBROOM.padTop - 10; ph.v = 0; ph.vy = 0; ph.live = 0; ph.grounded = true;
  ph.stretch = 0; ph.mode = 'wait';   // wait (on a platform, for the first kick) | fly | land | swap | done
  ph.kicks = []; ph.hot = 0; ph.sinceKick = 9; ph.swatT = 0; ph.swing = 0; ph.spin = 0; ph.grace = 0; ph.kickAnim = 0;
  ph.safe = { x: ph.x, y: 300 }; ph.lastRing = null; ph.gold = 0; ph.modeT = 0; ph.swapK = 0; ph.bonkRing = null; ph.bonkN = 0; ph.tow = 0; ph.hitX = 0;
  ph.t = 0;
  const s = wizStats(st); Object.assign(s, { rings: s.rings || 0, puffs: s.puffs || 0, swats: s.swats || 0, hot: s.hot || 0 });
  st.cam = { x: ph.x - WIZBROOM.sx, y: 0 };
  Object.assign(st.hm, { x: ph.x + 460, y: 170, s: 0.85, face: -1, pose: 'talk' });
  wizSay(st, 'Broom Flying! Front steers, back kicks. Off you go!', 3);
  wizNews(st, WIZBROOM_NEWS[0]);
  wizBroomSeat(st);
}
// the riders sit on the broom: front (steerer) and back (kicker); keep p.x / p.y there for tags, hints and bubbles
function wizBroomSeat(st) {
  const ph = st.ph;
  for (const p of G.players) {
    const sx = p.id === ph.steer ? 24 : -26, sy = 0;
    p.x = ph.x + sx - p.w / 2; p.y = ph.y - 2 + sy - p.h; p.vx = 0; p.vy = 0; p.grounded = true; p.alive = true; p.face = 1;
  }
}
// what is in the broom's way (for the plan, the hints and the brain): the next few things ahead
function wizBroomAhead(ph, from, to) { return ph.items.filter(o => o.x + (o.w || 0) / 2 > ph.x + from && o.x - (o.w || 0) / 2 < ph.x + to && !o.gone); }
// the y to aim for right now (what a sensible steerer would do), and whether to swat
function wizBroomTarget(ph) {
  const K = WIZBROOM, B = K.box, g = wizBroomGround(ph, ph.x + 200);
  let y = 300, lo = K.ceil + B.top, hi = g - 40;
  const next = ph.items.find(o => o.kind === 'ring' && o.x > ph.x + 10);
  if (next && next.x - ph.x < 900) y = next.y;
  let swat = false;
  // nearest first: each thing ahead narrows the band of safe heights, until one would leave no band at all (that one
  // waits until the nearer ones are passed)
  const ahead = wizBroomAhead(ph, -70, 400).sort((a, b) => (a.x - (a.w || 0) / 2) - (b.x - (b.w || 0) / 2));
  for (const o of ahead) {
    let l = lo, h = hi;
    switch (o.kind) {
      case 'hedge': h = Math.min(h, o.g - o.h - B.bot - 18); break;
      case 'line': case 'fall': l = Math.max(l, o.bot + B.top + 18); break;
      case 'tower': { const m = o.gy + B.top + (o.gh - B.top - B.bot) / 2; l = Math.max(l, m - 10); h = Math.min(h, m + 10); break; }
      case 'chimney': h = Math.min(h, o.g - o.h - K.smoke.h - B.bot - 16); break;
      case 'vane': if (o.gone) break; if (o.x - ph.x < K.swat.r + 30 && o.x - ph.x > 20) swat = true; else if (o.x - ph.x < 300) h = Math.min(h, o.y - K.vane.r - B.bot - 10); break;
      case 'sheet': if (o.gone) break; if (o.x - ph.x < K.swat.r + 20 && o.x - ph.x > 10) swat = true; break;
    }
    if (l > h) break;
    lo = l; hi = h;
  }
  y = clamp(y, lo, hi);
  return { y: clamp(y, K.ceil + B.top, g - 30), swat };
}
function wizBroomPlan(st) {
  const ph = st.ph, out = [null, null];
  const t = wizBroomTarget(ph);
  const dy = ph.y - t.y;
  out[ph.steer] = { y: t.y, hold: ph.mode !== 'fly' ? null : dy > 14 ? 'up' : dy < -14 ? 'down' : null, tap: t.swat && ph.swatT <= 0 ? 'act' : null, why: t.swat ? 'swat' : dy > 14 ? 'climb' : dy < -14 ? 'dive' : 'level' };
  out[ph.kick] = { tap: ph.hot > 0 ? null : 'act', every: 0.5, why: ph.mode === 'wait' ? 'take off' : ph.hot > 0 ? 'cool' : 'kick' };
  return out;
}
function wizBroomKick(st, p) {
  const ph = st.ph, K = WIZBROOM.kick;
  if (ph.hot > 0) { wizPop(st, ph.x - 60, ph.y - 50, 'Hot!', '#ff9a3c', 16); return; }
  const now = ph.t;
  ph.kicks.push(now); ph.kicks = ph.kicks.filter(k => now - k < 1);
  if (ph.kicks.length >= WIZBROOM.hotN) {
    ph.hot = WIZBROOM.hotT; ph.kicks = []; wizStats(st).hot++;
    wizPop(st, ph.x - 70, ph.y - 40, 'Bristles hot!', '#ff9a3c', 20); Sfx.play('wizBroomHot');
    wizHint(st, p.id, 'Too fast! A steady beat: ' + wizKey(p.id, 'act'), { cpu: 'Oops, too fast!' });
    return;
  }
  ph.v = Math.min(K.vMax, ph.v + K.dv); ph.live = K.live; ph.sinceKick = 0; ph.kickAnim = 0.25;
  if (ph.grounded) { ph.grounded = false; ph.vy = -K.lift; }
  Sfx.play('wizBroomKick', p.id);
}
function wizBroomBonk(st, word) {
  const ph = st.ph;
  if (ph.grace > 0 || ph.spin > 0) return;
  if (!wizTeamOops(st, { word: word || 'Bonk!', x: ph.x, y: ph.y - 40, kind: 'broom' })) return;
  ph.spin = WIZBROOM.spinT; Sfx.play('wizBroomBonk');
  // the same spot again and again (counted per lantern ring): after WIZBROOM.towAfter bonks from one ring, a gold tow
  ph.hitX = ph.x;
  if (ph.bonkRing === ph.safe.x) ph.bonkN++; else { ph.bonkRing = ph.safe.x; ph.bonkN = 1; }
  const n = wizMiss(st, 's' + ph.stretch);
  wizReact(st, 'calm', ['Mind the scenery, dears.', 'That hedge was there first.', 'Brooms bend. Hedges don\'t.'][n % 3], 2);
  if (n >= WIZ.goldAfter && wizGoldOnce(st, 'bristle' + ph.stretch, 'Gold bristle! The broom levels out toward the rings by itself for 20 s.')) ph.gold = WIZBROOM.goldT;
  if (n >= WIZ.goldAfter * 2 && wizGoldOnce(st, 'slim' + ph.stretch, 'Golden broom! It squeezes past things more easily for the rest of this stretch.')) { ph.slim = ph.stretch + 1; ph.gold = WIZBROOM.goldT; }
  else if (n > WIZ.goldAfter * 2 && n % 3 === 0) ph.gold = WIZBROOM.goldT;   // (the bristle again, announced the first time)
}
function wizBroomStep(st, dt) {
  const ph = st.ph, K = WIZBROOM, ps = G.players, steer = ps[ph.steer], kick = ps[ph.kick];
  ph.t += dt; ph.modeT += dt;
  for (const p of ps) { p.vx = 0; p.vy = 0; }
  if (st.idle) { wizBroomCoast(st, dt); return; }
  ph.hot = Math.max(0, ph.hot - dt); ph.swatT = Math.max(0, ph.swatT - dt); ph.grace = Math.max(0, ph.grace - dt); ph.gold = Math.max(0, ph.gold - dt);
  ph.sinceKick += dt; ph.kickAnim = Math.max(0, ph.kickAnim - dt); ph.swing = Math.max(0, ph.swing - dt);
  // presses
  const kickP = kick.pendingAct; kick.pendingAct = false; kick.pendingJump = false;
  const swatP = steer.pendingAct; steer.pendingAct = false; steer.pendingJump = false;
  if (ph.mode === 'swap') {
    if (ph.modeT >= 0.9) {
      ph.mode = 'wait'; ph.modeT = 0;
      wizNews(st, WIZBROOM_NEWS[ph.stretch]);
      wizHint(st, ph.kick, 'Kick to take off! ' + wizKey(ph.kick, 'act'), { cpu: 'Hold on, here we go!' });
    }
    wizBroomSeat(st); wizBroomCam(st, dt); return;
  }
  if (ph.spin > 0) {
    ph.spin -= dt;
    if (ph.spin <= 0) {
      ph.x = ph.safe.x; ph.y = ph.safe.y; ph.v = 150; ph.vy = 0; ph.live = 0.6; ph.grace = K.graceT; ph.grounded = false;
      // back at a height that clears what comes next (a ring can hang low before a tall hedge: no bonk straight away again)
      ph.y = wizBroomTarget(ph).y;
      // stuck on one thing: Thimblewick tows the broom past it (announced gold help, as often as it is needed)
      if (ph.bonkN >= K.towAfter) { const nr = ph.items.find(o => o.kind === 'ring' && o.x > ph.hitX); ph.tow = nr ? nr.x + 10 : ph.hitX + K.towPast; ph.bonkN = 0; wizHelp(st, 'A gold tow! Thimblewick pulls the broom on to the next lanterns.'); }
      for (const o of ph.items) if (o.kind === 'vane' && o.x > ph.x) { o.state = o.state === 'gone' ? 'gone' : 'rest'; o.t = 0; }
    }
    wizBroomSeat(st); wizBroomCam(st, dt); return;
  }
  if (kickP && (ph.mode === 'fly' || ph.mode === 'wait')) {
    if (ph.mode === 'wait') { ph.mode = 'fly'; ph.modeT = 0; Sfx.play('wizSpell_zoom'); if (ph.stretch === 0 && ph.t < 4) wizSay(st, 'Zoom! That\'s the spell. Well, the idea.', 2.4); }
    wizBroomKick(st, kick);
  }
  if (swatP && ph.swatT <= 0 && ph.mode === 'fly') {
    ph.swatT = K.swat.rest; ph.swing = 0.3; Sfx.play('wizBroomSwat');
    for (const o of ph.items) {
      if ((o.kind !== 'vane' && o.kind !== 'sheet') || o.gone) continue;
      const dx = o.x - ph.x;
      if (dx > -20 && dx < K.swat.r + 30 && Math.abs((o.y || 0) - (ph.y - 20)) < 140) { o.gone = true; o.goneT = 0; wizStats(st).swats++; wizPop(st, o.x, o.y - 20, 'Swat!', '#ffffff', 20); Sfx.play('wizBroomBonk'); break; }
    }
  }
  if (ph.mode === 'wait') { ph.y = wizBroomGround(ph, ph.x) - 10; wizBroomSeat(st); wizBroomCam(st, dt); return; }
  // landing at a platform: the broom glides in by itself
  const nextPad = wizBroomPadX(ph.stretch + 1);
  if (ph.mode === 'fly' && ph.x > nextPad - 360) { ph.mode = 'land'; ph.modeT = 0; }
  if (ph.mode === 'land') {
    const ty = K.padTop - 10, k = clamp((nextPad - ph.x) / 360, 0, 1);
    ph.v = Math.max(40, Math.min(ph.v, 60 + 200 * k)); ph.y += (ty - ph.y) * Math.min(1, dt * 3);
    ph.x = Math.min(nextPad, ph.x + ph.v * dt);
    if (ph.x >= nextPad - 1) {
      ph.y = ty; ph.v = 0; ph.grounded = true; Sfx.play('wizBroomLand');
      if (ph.stretch >= 2) { ph.mode = 'done'; wizStats(st).flown = true; wizPhaseDone(st, { say: 'Lovely landing. Zoom is yours!' }); }
      else {
        ph.stretch++; ph.mode = 'swap'; ph.modeT = 0;
        [ph.steer, ph.kick] = [ph.kick, ph.steer];
        wizSwap(st); ph.safe = { x: ph.x, y: 300 }; ph.hot = 0; ph.kicks = [];
      }
    }
    wizBroomSeat(st); wizBroomCam(st, dt); return;
  }
  // a gold tow: nothing can bonk the broom until the next lantern ring (the next safe spot)
  if (ph.tow) { if (ph.x < ph.tow) ph.grace = Math.max(ph.grace, 0.3); else ph.tow = 0; }
  // flying: speed from kicks
  const KK = K.kick;
  if (ph.live > 0) { ph.live -= dt; ph.v -= ph.v * KK.dragLive * dt; } else ph.v = Math.max(0, ph.v - KK.dragDead * dt);
  // steering: up climbs, down dives, nothing levels out (or, with the gold bristle, eases toward the next ring)
  const up = wizUp(steer), down = !!steer.input.down && !up;
  let want = up ? K.steer.up : down ? K.steer.down : 0;
  if (!up && !down && ph.gold > 0) { const t = wizBroomTarget(ph); want = clamp((t.y - ph.y) * 1.6, -110, 110); }
  const drooping = ph.live <= 0 && ph.v < KK.droop;
  if (drooping) want = Math.max(want, K.steer.droopV);
  ph.vy += (want - ph.vy) * Math.min(1, K.steer.k * dt);
  // wind gusts
  for (const o of ph.items) if (o.kind === 'gust' && Math.abs(o.x - ph.x) < o.w / 2) ph.vy += o.dir * K.gust.acc * dt;
  ph.x += ph.v * dt;
  ph.y += ph.vy * dt;
  const g = wizBroomGround(ph, ph.x);
  if (ph.y < K.ceil + K.box.top) { ph.y = K.ceil + K.box.top; ph.vy = Math.max(0, ph.vy); }
  if (ph.y > g - 10) {
    ph.y = g - 10; ph.vy = 0;
    if (!ph.grounded) { ph.grounded = true; Sfx.play('wizBroomLand'); if (g === K.grounds[2]) wizPop(st, ph.x, g - 20, 'Splosh!', '#bfe0ff', 16); }
    ph.v = Math.max(0, ph.v - 260 * dt);
    if (ph.v < 20 && ph.sinceKick > 1.2) wizHint(st, ph.kick, 'Kick to fly again! ' + wizKey(ph.kick, 'act'), { cpu: 'Up we go!', life: 1.5 });
  } else if (ph.grounded && ph.vy < 0) ph.grounded = false;
  // hazards, rings, the safe spot
  wizBroomHazards(st, dt);
  wizBroomSeat(st);
  wizBroomCam(st, dt);
  wizBroomHints(st);
}
function wizBroomHazards(st, dt) {
  const ph = st.ph, K = WIZBROOM, B = K.box, sl = ph.slim === ph.stretch + 1 ? 14 : 0;
  const bx0 = ph.x + B.x0 + sl, bx1 = ph.x + B.x1 - sl, by0 = ph.y - B.top + sl, by1 = ph.y + B.bot - sl * 0.4;
  const hitR = (x0, y0, x1, y1) => bx1 > x0 && bx0 < x1 && by1 > y0 && by0 < y1;
  for (const o of ph.items) {
    if (Math.abs(o.x - ph.x) > 900) continue;
    switch (o.kind) {
      case 'ring': {
        if (!o.passed && ph.x >= o.x) {
          o.passed = true; ph.safe = { x: o.x, y: o.y }; ph.lastRing = o; wizStats(st).rings++;
          if (Math.abs(ph.y - 18 - o.y) < K.ring.r) { ph.v = Math.min(K.kick.vMax, ph.v + K.ring.puff); wizStats(st).puffs++; Sfx.play('wizBroomRing'); wizSparks(o.x, o.y, 'zoom', 10); }
          else Sfx.play('wizTick');
        }
        break;
      }
      case 'hedge': if (hitR(o.x - o.w / 2, o.g - o.h, o.x + o.w / 2, o.g + 40)) wizBroomBonk(st, o.stretch === 2 ? 'Bonk!' : 'Prickly!'); break;
      case 'line': if (hitR(o.x - o.w / 2, 0, o.x + o.w / 2, o.bot)) wizBroomBonk(st, 'Tangled!'); break;
      case 'fall': if (hitR(o.x - o.w / 2, 0, o.x + o.w / 2, o.bot)) wizBroomBonk(st, 'Splash!'); break;
      case 'tower': if (hitR(o.x - o.w / 2, 0, o.x + o.w / 2, o.gy) || hitR(o.x - o.w / 2, o.gy + o.gh, o.x + o.w / 2, H)) wizBroomBonk(st, 'Dong!'); break;
      case 'chimney': {
        if (hitR(o.x - o.w / 2, o.g - o.h, o.x + o.w / 2, o.g + 40)) { wizBroomBonk(st, 'Bonk!'); break; }
        const c = ((ph.t + o.ph) % K.smoke.period);
        o.puff = c < K.smoke.on ? 1 : 0; o.warnK = c > K.smoke.period - K.smoke.warn ? 1 : 0;
        if (o.puff && hitR(o.x - o.w / 2 - 6, o.g - o.h - K.smoke.h, o.x + o.w / 2 + 6, o.g - o.h)) wizBroomBonk(st, 'Cough!');
        break;
      }
      case 'vane': {
        if (o.gone) break;
        const dx = o.x - ph.x;
        o.t += dt;
        if (o.state === 'rest' && dx < K.vane.near && dx > -60) { o.state = 'warn'; o.t = 0; wizWarn(st, st.ph.steer, K.vane.warn); Sfx.play('wizBroomWarn'); }
        else if (o.state === 'warn' && o.t >= K.vane.warn) { o.state = 'lunge'; o.t = 0; }
        else if (o.state === 'lunge' && o.t >= K.vane.lunge) { o.state = 'back'; o.t = 0; }
        else if (o.state === 'back' && o.t >= K.vane.rest) { o.state = dx > -60 ? 'warn' : 'rest'; o.t = 0; }
        if (o.state === 'lunge') { const lx = o.x - 40, ly = o.y; if (Math.hypot(clamp(lx, bx0, bx1) - lx, clamp(ly, by0, by1) - ly) < K.vane.r * 0.7) wizBroomBonk(st, 'Clang!'); }
        break;
      }
      case 'sheet': {
        if (o.gone) { o.goneT += dt; o.y -= 120 * dt; break; }
        o.y = o.y0 + Math.sin(ph.t * 2.4) * 34;
        if (hitR(o.x - 28, o.y - 22, o.x + 28, o.y + 26)) wizBroomBonk(st, 'Flap!');
        break;
      }
    }
  }
}
function wizBroomHints(st) {
  const ph = st.ph, K = WIZBROOM;
  if (ph.mode !== 'fly' || ph.grace > 0) return;
  const P = wizBroomPlan(st), s = P[ph.steer];
  if (!st.hints[ph.steer]) {
    for (const o of wizBroomAhead(ph, 120, 330)) {
      if (o.kind === 'hedge' && ph.y + K.box.bot > o.g - o.h - 10) { wizHint(st, ph.steer, 'Climb! ' + wizKey(ph.steer, 'up'), { cpu: 'Up and over!' }); break; }
      if ((o.kind === 'line' || o.kind === 'fall') && ph.y - K.box.top < o.bot + 10) { wizHint(st, ph.steer, 'Dive! ' + wizKey(ph.steer, 'down'), { cpu: 'Ducking under!' }); break; }
      if ((o.kind === 'vane' || o.kind === 'sheet') && s.tap) { wizHint(st, ph.steer, 'Swat it! ' + wizKey(ph.steer, 'act'), { cpu: 'Swat!' }); break; }
    }
  }
  if (!st.hints[ph.kick] && ph.live <= 0 && ph.v < K.kick.droop + 40 && !ph.grounded) wizHint(st, ph.kick, 'Kick! ' + wizKey(ph.kick, 'act'), { cpu: 'Kicking!', life: 1.6 });
}
function wizBroomCam(st, dt) {
  const ph = st.ph;
  st.cam.x = ph.x - WIZBROOM.sx; st.cam.y = 0;
  const c = st.hm;
  c.x += (ph.x + 470 - c.x) * Math.min(1, dt * 2); c.y = 160 + Math.sin(ph.t * 0.9) * 16;
  c.face = -1;
  if (ph.mode === 'fly' && c.pose === 'talk' && !st.say) c.pose = 'idle';
}
function wizBroomCoast(st, dt) {
  const ph = st.ph;
  if (!ph.items) return;
  ph.y += Math.sin((ph.t || 0) * 2) * 6 * dt;
  wizBroomSeat(st); wizBroomCam(st, dt || 0);
}

/* ---------- drawing ---------- */
function wizBroomDrawBack(st) {
  const ph = st.ph, cx = st.cam.x, t = G.clock, K = WIZBROOM, C2 = WIZBROOM_C;
  const k = wizBroomStretchAt(ph.x);
  wizScreen(st, () => wizDusk(t, cx, 0, { skyY: WIZBROOM.grounds[k] + 4 }));
  // the ground of each stretch, the platforms
  const x0 = cx - 40, x1 = cx + W + 40;
  for (let xx = Math.floor(x0 / 40) * 40; xx < x1; xx += 40) {
    const g = wizBroomGround(ph, xx + 20), s = wizBroomStretchAt(xx + 20), pad = g === K.padTop;
    if (pad) continue;
    if (s === 0) { ctx.fillStyle = '#4f9a58'; ctx.fillRect(xx, g, 41, H - g); ctx.fillStyle = '#5fb068'; ctx.fillRect(xx, g, 41, 8); }
    else if (s === 1) {
      ctx.fillStyle = C2.roof; ctx.fillRect(xx, g, 41, H - g);
      ctx.fillStyle = C2.roofDk; for (let ry = g + 14; ry < H; ry += 18) ctx.fillRect(xx, ry, 41, 3);
      ctx.fillStyle = '#ffd77a'; if ((xx / 40) % 5 === 2) rr(xx + 10, g + 50, 16, 20, 6), ctx.fill();
    } else {
      ctx.fillStyle = C2.water; ctx.fillRect(xx, g, 41, H - g);
      ctx.fillStyle = C2.waterLt; ctx.fillRect(xx, g + 4 + Math.sin(t * 2 + xx * 0.05) * 2, 41, 3);
    }
  }
  for (let n = 0; n <= 3; n++) {
    const px = wizBroomPadX(n);
    if (Math.abs(px - (cx + W / 2)) > W) continue;
    const g0 = WIZBROOM.grounds[Math.min(2, Math.max(0, n === 0 ? 0 : n - 1))];
    ctx.fillStyle = WIZC.woodDk; for (const dx of [-K.padW / 2 + 30, 0, K.padW / 2 - 30]) ctx.fillRect(px + dx - 6, K.padTop, 12, Math.max(g0, 480) - K.padTop + 80);
    ctx.fillStyle = WIZC.wood; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; rr(px - K.padW / 2, K.padTop, K.padW, 16, 4); ctx.fill(); ctx.stroke();
    if (n > 0) { ctx.fillStyle = '#ffd23f'; text(n < 3 ? 'Swap!' : 'Finish', px, K.padTop + 40, 16, '#ffe9a8', 'center'); }
  }
}
function wizBroomDraw(st) {
  const ph = st.ph, K = WIZBROOM, C2 = WIZBROOM_C, t = G.clock, cx = st.cam.x;
  for (const o of ph.items) {
    if (o.x < cx - 260 || o.x > cx + W + 260) continue;
    ctx.lineJoin = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    switch (o.kind) {
      case 'ring': {
        const lit = o.passed;
        for (let n = 0; n < 8; n++) {
          const a = n * Math.PI / 4 + t * 0.6, lx = o.x + Math.cos(a) * K.ring.r, ly = o.y + Math.sin(a) * K.ring.r;
          ctx.fillStyle = lit ? '#fff3c4' : C2.lantern; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; rr(lx - 5, ly - 7, 10, 14, 4); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(255,207,106,0.25)'; circle(lx, ly, 10); ctx.fill();
        }
        break;
      }
      case 'hedge': {
        if (o.stretch === 2) {   // an old bridge pillar standing in the moat
          ctx.fillStyle = WIZC.stone; rr(o.x - o.w / 2, o.g - o.h, o.w, o.h + 40, 6); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = WIZC.stoneDk; ctx.lineWidth = 2; for (let y = o.g - o.h + 22; y < o.g; y += 22) { ctx.beginPath(); ctx.moveTo(o.x - o.w / 2, y); ctx.lineTo(o.x + o.w / 2, y); ctx.stroke(); }
          ctx.fillStyle = '#3f6a5a'; ctx.beginPath(); ctx.ellipse(o.x, o.g - o.h, o.w / 2 + 4, 6, 0, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = C2.hedge; ctx.beginPath(); ctx.moveTo(o.x - o.w / 2, o.g + 4);
          for (let k = 0; k <= 4; k++) { const hx = o.x - o.w / 2 + k * o.w / 4; ctx.lineTo(hx, o.g - o.h + 8 + (k % 2) * 6); }
          ctx.lineTo(o.x + o.w / 2, o.g + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
          for (let k = 0; k < 4; k++) { ctx.fillStyle = C2.hedge; circle(o.x - o.w / 2 + 8 + k * (o.w - 16) / 3, o.g - o.h + 10, 10); ctx.fill(); }
          ctx.fillStyle = C2.hedgeDk; for (let k = 0; k < 6; k++) { circle(o.x - o.w / 2 + 10 + (k % 3) * (o.w - 20) / 2, o.g - o.h + 16 + Math.floor(k / 3) * 30, 6); ctx.fill(); }
        }
        break;
      }
      case 'line': case 'fall': {
        if (o.kind === 'line') {
          ctx.strokeStyle = WIZC.woodDk; ctx.lineWidth = 6; for (const dx of [-o.w / 2, o.w / 2]) { ctx.beginPath(); ctx.moveTo(o.x + dx, 0); ctx.lineTo(o.x + dx, o.bot - 30); ctx.stroke(); }
          ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.x - o.w / 2, o.bot - 64); ctx.quadraticCurveTo(o.x, o.bot - 50, o.x + o.w / 2, o.bot - 64); ctx.stroke();
          ctx.fillStyle = 'rgba(40,30,70,0.5)'; ctx.fillRect(o.x - o.w / 2, 0, o.w, o.bot - 64);   // (the line's tall frame: no way over)
          const cols = ['#f4efe4', '#ff9a8a', '#8ac9ff', '#ffe08a', '#b6f0a0'];
          for (let k = 0; k < 4; k++) { const sx = o.x - o.w / 2 + 14 + k * (o.w - 28) / 3, sw = Math.sin(t * 3 + k) * 3; ctx.fillStyle = cols[k % 5]; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(sx - 16, o.bot - 60); ctx.lineTo(sx + 16, o.bot - 60); ctx.lineTo(sx + 14 + sw, o.bot); ctx.lineTo(sx - 14 + sw, o.bot - 4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        } else {   // the waterfall: the island's lip overhead, water pouring off it
          ctx.fillStyle = WIZC.stoneDk; ctx.fillRect(o.x - o.w / 2 - 30, 0, o.w + 60, o.bot - 70);
          const g = ctx.createLinearGradient(0, o.bot - 80, 0, o.bot); g.addColorStop(0, '#7aa0d8'); g.addColorStop(1, 'rgba(200,225,255,0.9)');
          ctx.fillStyle = g; ctx.fillRect(o.x - o.w / 2, o.bot - 80, o.w, 80);
          ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; for (let k = 0; k < 6; k++) { const lx = o.x - o.w / 2 + 12 + k * (o.w - 24) / 5, off = (t * 160 + k * 37) % 70; ctx.beginPath(); ctx.moveTo(lx, o.bot - 80 + off); ctx.lineTo(lx, o.bot - 64 + off); ctx.stroke(); }
          ctx.fillStyle = 'rgba(255,255,255,0.6)'; for (let k = 0; k < 5; k++) { circle(o.x - o.w / 2 + k * o.w / 4, o.bot + Math.sin(t * 5 + k) * 3, 7); ctx.fill(); }
        }
        break;
      }
      case 'tower': {
        ctx.fillStyle = WIZC.stone; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
        ctx.fillRect(o.x - o.w / 2, -20, o.w, o.gy + 20); ctx.strokeRect(o.x - o.w / 2, -20, o.w, o.gy + 20);
        ctx.fillRect(o.x - o.w / 2, o.gy + o.gh, o.w, H); ctx.strokeRect(o.x - o.w / 2, o.gy + o.gh, o.w, H);
        // the bell hanging in the gap's roof
        ctx.fillStyle = '#d9a441'; ctx.beginPath(); ctx.moveTo(o.x - 16, o.gy + 30); ctx.quadraticCurveTo(o.x - 14, o.gy + 4, o.x, o.gy + 2); ctx.quadraticCurveTo(o.x + 14, o.gy + 4, o.x + 16, o.gy + 30); ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case 'chimney': {
        ctx.fillStyle = C2.brick; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.fillRect(o.x - o.w / 2, o.g - o.h, o.w, o.h + 4); ctx.strokeRect(o.x - o.w / 2, o.g - o.h, o.w, o.h + 4);
        ctx.fillStyle = C2.brickDk; ctx.fillRect(o.x - o.w / 2 - 4, o.g - o.h - 8, o.w + 8, 10); ctx.strokeRect(o.x - o.w / 2 - 4, o.g - o.h - 8, o.w + 8, 10);
        if (o.warnK && !o.puff) { ctx.fillStyle = 'rgba(255,160,80,0.6)'; circle(o.x, o.g - o.h - 8, 8 + Math.sin(t * 20) * 2); ctx.fill(); }
        if (o.puff) for (let k = 0; k < 6; k++) { const yy = o.g - o.h - 18 - k * 24, r = 16 + k * 3 + Math.sin(t * 6 + k) * 3; ctx.fillStyle = C2.smoke; circle(o.x + Math.sin(t * 3 + k) * 6, yy, r); ctx.fill(); }
        break;
      }
      case 'vane': {
        if (o.gone) break;
        ctx.strokeStyle = WIZC.woodDk; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(o.x, o.g); ctx.lineTo(o.x, o.y); ctx.stroke();
        const spin = o.state === 'warn' ? t * 20 : o.state === 'lunge' ? 0 : Math.sin(t) * 0.3;
        const reach = o.state === 'lunge' ? Math.min(1, o.t / 0.2) * 40 : 0;
        ctx.save(); ctx.translate(o.x - reach, o.y); ctx.scale(Math.cos(spin), 1);
        ctx.fillStyle = C2.vane; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(-24, -10); ctx.lineTo(-24, -4); ctx.lineTo(30, -4); ctx.lineTo(40, -16); ctx.lineTo(40, 14); ctx.lineTo(30, 4); ctx.lineTo(-24, 4); ctx.lineTo(-24, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        if (o.state === 'lunge') { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(o.x + 10, o.y - 10 + k * 10); ctx.lineTo(o.x + 40, o.y - 10 + k * 10); ctx.stroke(); } }
        if (o.state === 'warn') bigText('!', o.x, o.y - 40, 26, '#ff5f6d', 1);
        break;
      }
      case 'sheet': {
        ctx.save(); ctx.translate(o.x, o.y); if (o.gone) { ctx.rotate(o.goneT * 3); ctx.globalAlpha = clamp(1 - o.goneT, 0, 1); }
        const fl = Math.sin(t * 9) * 6;
        ctx.fillStyle = C2.sheet; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-28, -22); ctx.quadraticCurveTo(0, -22 + fl, 28, -22); ctx.lineTo(30 + fl, 24); ctx.quadraticCurveTo(0, 26 - fl, -26, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.ink; circle(-8, -4, 2.4); ctx.fill(); circle(8, -4, 2.4); ctx.fill(); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(8, 8); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'gust': {
        ctx.save(); ctx.strokeStyle = 'rgba(230,240,255,0.55)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        for (let k = 0; k < 12; k++) {
          const lx = o.x - o.w / 2 + 14 + ((k * 53) % (o.w - 28)), span = 380, yy = (((k * 97 + t * 260 * -o.dir) % span) + span) % span + 80;
          ctx.beginPath(); ctx.moveTo(lx, yy); ctx.lineTo(lx + 6, yy + o.dir * 34); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(lx + 6, yy + o.dir * 34); ctx.lineTo(lx, yy + o.dir * 26); ctx.lineTo(lx + 12, yy + o.dir * 26); ctx.stroke();
        }
        ctx.restore();
        break;
      }
    }
  }
}
// the broom and its two riders
function wizBroomDrawRide(st) {
  const ph = st.ph, t = G.clock, C2 = WIZBROOM_C;
  const spin = ph.spin > 0 ? (1 - ph.spin / WIZBROOM.spinT) * Math.PI * 2 : 0, blink = ph.grace > 0 && Math.sin(t * 30) > 0;
  const bob = ph.grounded ? 0 : Math.sin(t * 5) * WIZBROOM.steer.bob, tilt = clamp(ph.vy / 600, -0.25, 0.25);
  ctx.save(); ctx.translate(ph.x, ph.y + bob); ctx.rotate(tilt + spin);
  if (blink) ctx.globalAlpha = 0.55;
  // the bristles (smoking when hot) and the stick
  const kick = ph.kickAnim > 0 ? Math.sin(ph.kickAnim / 0.25 * Math.PI) * 5 : 0;
  ctx.fillStyle = C2.straw; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-58, -4); ctx.lineTo(-96 - kick, -16); ctx.lineTo(-100 - kick, 0); ctx.lineTo(-96 - kick, 14); ctx.lineTo(-58, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = C2.strawDk; ctx.lineWidth = 1; for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(-60, k * 1.2); ctx.lineTo(-96 - kick, k * 4); ctx.stroke(); }
  ctx.fillStyle = '#c0504a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.fillRect(-62, -6, 7, 12); ctx.strokeRect(-62, -6, 7, 12);
  ctx.strokeStyle = C2.stickDk; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-58, 0); ctx.quadraticCurveTo(0, 3, 62, -4); ctx.stroke();
  ctx.strokeStyle = C2.stick; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-58, 0); ctx.quadraticCurveTo(0, 3, 62, -4); ctx.stroke();
  // the riders: front (steerer) and back (kicker), facing right; during the swap they hop over each other
  for (const p of G.players) {
    const front = p.id === ph.steer;
    let sx = front ? 24 : -26, sy = 0;
    if (ph.mode === 'swap') { const k = clamp(ph.modeT / 0.9, 0, 1), from = front ? -26 : 24; sx = from + (sx - from) * k; sy = -Math.sin(k * Math.PI) * (front ? 48 : 30); }
    const kickLeg = !front && ph.kickAnim > 0;
    wizDrawHero(p.id, sx, sy - 2, { face: 1, sx: kickLeg ? 1.08 : 1, sy: kickLeg ? 0.92 : 1 });
    if (front && ph.swing > 0) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx + 20, sy - 30, 34, -1.2, -1.2 + (1 - ph.swing / 0.3) * 2.2); ctx.stroke(); }
  }
  ctx.restore();
  if (ph.hot > 0) for (let k = 0; k < 4; k++) { ctx.fillStyle = 'rgba(160,160,170,' + (0.5 - k * 0.1) + ')'; circle(ph.x - 100 - k * 14 - (t * 40) % 14, ph.y - 6 - k * 8 + Math.sin(t * 8 + k) * 3, 7 + k * 2); ctx.fill(); }
}
function wizBroomDrawTop(st) {
  wizBroomDrawRide(st);
}
function wizBroomHud(st) {
  const ph = st.ph, big = wizBig(), z = big ? 1.4 : 1;
  // the kicker's rhythm gauge: kicks in the last second (2 good, 4 too many) and the bristle heat
  const kp = G.players[ph.kick], x = kp.x + kp.w / 2, y = kp.y + kp.h + 16;
  const n = ph.kicks.filter(k => ph.t - k < 1).length, w = 46 * z, h = 8 * z;
  ctx.save(); ctx.globalAlpha = ph.mode === 'fly' ? 0.95 : 0.4;
  ctx.fillStyle = 'rgba(30,20,66,0.8)'; rr(x - w / 2 - 3, y - 3, w + 6, h + 6, 5); ctx.fill();
  const hot = ph.hot > 0;
  for (let k = 0; k < WIZBROOM.hotN - 1; k++) { ctx.fillStyle = hot ? '#ff9a3c' : k < n ? (k < 2 ? '#9fe07f' : '#ffd23f') : 'rgba(255,255,255,0.25)'; rr(x - w / 2 + k * w / 4 + 1, y, w / 4 - 2, h, 2); ctx.fill(); }
  ctx.restore();
  if (ph.gold > 0) { ctx.save(); ctx.globalAlpha = 0.9; text('Gold bristle ' + Math.ceil(ph.gold) + 's', W / 2, H - 22, 14 * z, C.gold, 'center', 'body'); ctx.restore(); }
}

WIZ_PHASES.broom = {
  bubbleHidden: true,
  setup(st, L) { wizBroomSetup(st, L); },
  step(st, dt) { wizBroomStep(st, dt); },
  coast(st, dt) { wizBroomCoast(st, dt); },
  hide: () => true,
  busy: () => true,
  headLift: () => 22,
  plan(st) { return wizBroomPlan(st); },
  labels(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.steer ? 'swat' : 'kick')); },
  roles(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.steer ? 'Steer!' : 'Kick!')); },
  jobKeys(st) { return st.ph.steer === 1 ? ['kicker', 'steerer'] : ['steerer', 'kicker']; },
  legend(st) {
    const ph = st.ph;
    const steer = k => (k ? '<kbd>↑</kbd> climb <kbd>↓</kbd> dive' : '<kbd>W</kbd> climb <kbd>S</kbd> dive');
    return { pip: ph.steer === 0 ? steer(0) : 'kick on a steady beat', bo: ph.steer === 1 ? steer(1) : 'kick on a steady beat', pad: 'steerer: stick up climbs, down dives,' };
  },
  hudText(st) { const ph = st.ph; return 'Stretch ' + (ph.stretch + 1) + ' of 3'; },
  progress(st) { const ph = st.ph; return { n: ph.stretch + (ph.mode === 'done' ? 1 : 0), of: 3 }; },
  drawBack(st) { wizBroomDrawBack(st); },
  draw(st) { wizBroomDraw(st); },
  drawTop(st) { wizBroomDrawTop(st); },
  hud(st) { wizBroomHud(st); },
  statLine(st) { const s = st.stats.broom; return s && s.puffs >= 30 ? 'Through ' + s.puffs + ' lantern rings' : ''; },
};

/* ---------- sounds ---------- */
Sfx.extra.wizBroomKick = function (p) { this.tone(180 * p, 0.06, 'triangle', 0.04, 260 * p); this.tone(700, 0.08, 'sawtooth', 0.01, 1100, 0.02); };
Sfx.extra.wizBroomHot = function () { this.tone(1600, 0.5, 'sawtooth', 0.018, 600); this.tone(240, 0.25, 'square', 0.03, 140); };
Sfx.extra.wizBroomSwat = function () { this.tone(600, 0.12, 'sawtooth', 0.02, 1400); };
Sfx.extra.wizBroomBonk = function () { this.tone(220, 0.12, 'square', 0.05, 110); this.tone(900, 0.1, 'triangle', 0.03, 400, 0.04); };
Sfx.extra.wizBroomRing = function () { [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.035, null, i * 0.05)); };
Sfx.extra.wizBroomLand = function () { this.tone(140, 0.12, 'triangle', 0.05, 80); };
Sfx.extra.wizBroomWarn = function () { [700, 900].forEach((f, i) => this.tone(f, 0.08, 'square', 0.028, null, i * 0.12)); };

/* ---------- the room ---------- */
wizRoom('broom', {
  jobs: {
    steerer: { title: 'Steerer', act: 'swat', legend: '<kbd>W</kbd> climb <kbd>S</kbd> dive',
      howTo: ['Swat knocks away a weather vane or a flapping sheet.'] },
    kicker: { title: 'Kicker', act: 'kick', legend: '',
      howTo: ['Kick on a steady beat, about 2 a second. Mashing makes the bristles smoke.'] },
  },
  act: { label: 'kick', labels: ['swat', 'kick'] },
  tip: 'Front steers (up climbs, down dives), back kicks on a steady beat. Fly through the lantern rings!',
  legend: { pip: '<kbd>W</kbd> climb <kbd>S</kbd> dive', bo: 'kick on a steady beat', pad: 'steerer: stick up climbs, down dives,' },
  map: WIZ_EMPTY_MAP,
});
