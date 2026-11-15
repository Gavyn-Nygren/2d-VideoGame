/* Pip & Bo - Level 40-1 The Iron Colossus (World 40 Colossus March, the boss of worlds 31-40): the core. */
'use strict';

/* ===== 40-1 The Iron Colossus (mode 'colossus', team) =================================================================
   Gavyn picked this boss on 2026-11-14 ("a hyper stylized kind of hand drawn look ... very high quality and multiple
   rounds of redrawing"). A mountain on the edge of Pyramid Sands stands up: the IRON COLOSSUS, a walking iron giant
   with a boiler belly, a chimney crown, one lantern eye and a wind-up key in its back, marching in a straight line toward
   Sunny Meadow. Pip and Bo chase its feet, ride its heel chain, climb its swinging leg, trick its fists into breaking
   its own chest locks, go inside and pull out its three power cores, and get out while it comes undone. Its pilot is
   TICK, a wind-up tin toy no taller than Pip's foot, who shouts through a brass megaphone from Part 3 on and ends as a
   friend (he rides on a hero's head in Part 7 and referees the Thumb War). The whole world is drawn in the sketch kit
   (sketch-kit.js: ink and watercolour on paper); its header and GAME_NOTES "World 40" are the art rules.
   Built like 30-1 and 35-1: ONE level, 8 rooms ("parts"), a CHECKPOINT at the start of every part (in the browser too),
   safe spots inside each part. Nobody is ever hurt: every fail is a soft, counted "Clang!" and a pop-back.

   PARTS, in order (phase key: title, paper, scroll):
     chase   Under the Feet     sand   right (the feet land ahead and behind; the heel chain)
     leg     The Swinging Leg   sand   up (the leg tilts in every swing; Tumbleweed Gulch below)
     fists   The Fists          dusk   a wide arena (the lantern eye, three chest locks; Superhero City)
     boiler  The Boiler         dark   right (valves and steam jets; core 1, the ember)
     heart   The Gear Heart     dark   up (a signal booth and moving platforms; core 2, the gear heart)
     brain   The Lantern Head   dark   a round room (earthing rods and lightning; core 3, the bulb; Tick's chair)
     fall    Coming Apart       dawn   right and down (the eraser edge; Sunny Meadow)
     thumbs  Thumb War          dawn   versus, best of 3 (the two giant hands; Tick referees)

   FILES. This file is the CORE: the level entry (IRON_DEF; world.js adds World 40), MODES.colossus, the IRON_PHASES
   registry (a working stub per part), Tick (state, poses, drawing), the shared two-hero moves (Boost, Hand up), soft
   fails (Clangs), gold help, rivets, sound words and impact frames, news / hint / megaphone bubbles, per-role act labels,
   the idle wait (the giant winds down), part changes (a page turn), checkpoints, the drawn HUD, the ending, stats and
   the test hook. The drawing kit is sketch-kit.js (SKETCH); the Colossus's drawings iron-art*.js; each part lives in
   iron-<part>.js and REPLACES its stub: IRON_PHASES.<part> = { ... }. Brains: js/cpu/levels/world40/. Every top-level
   name starts with iron / IRON (a part file uses iron<Part> / IRON<PART>); every Sfx.extra sound with 'iron'.

   =================================================== PHASE CONTRACT ===================================================
   State: st.ph (the part's own state, fresh each part), st.phase, st.phaseNo (0..7), st.phT, st.part (IRON_PARTS
   entry), st.tick (Tick), st.cam { x, y } (world -> screen: screen = world - cam), st.cores (0..3), st.rivets (got
   per part), st.idle, st.cut, st.celebT, st.stats ({ clangs: [pip, bo], team, kinds, help, phaseT, <phase>: {} }),
   st.safe, st.warn, st.words (sound words), st.impact.
   The tick runs in WORLD coords (players are shifted by the camera and back); draw hooks draw in world coords too.
   HOOKS of IRON_PHASES.<phase> (all optional but setup / step):
     setup(st, L)        the part starts (or restarts): build st.ph, place the players, set st.cam.
     step(st, dt)        one tick of play (world coords).   wait(st, dt) / coast(st, dt) while a card is up.
     plan(st) -> [pip, bo]  what each player should be doing now: { x, y, hold, tap, why, say }. The hint bubbles,
                         the HUD and the brain all read it, so the computer and the prompts never disagree.
     drawBack(st)        the backdrop and the world (world coords; ironScreen(st, fn) draws in screen coords).
     draw(st)            things in front of the world and behind the heroes.
     drawHero(st, p) -> true   the part drew this hero itself (riding, squashed...).   heroO(st, p) -> SKETCH.hero o.
     drawTop(st)         in front of the heroes (world coords).   hud(st) extra HUD (screen coords).
     labels(st) roles(st) legend(st) hudText(st) progress(st) present(st, p) busy(st, p) headLift(st, p)
     onClang(st, p, kind) onRespawn(st, p) stat(st) statLine(st) music(st) -> { song, amb }  paper (the HUD's paper kind)
     leave(st)           the part is over (free its sheets: SKETCH.forget).
   ROOM FIELDS (ironRoom(phase, fields) fills them in): tip, act { label, labels }, legend, first (who takes the first
   job), outfit.

   HELPERS (inside the tick unless noted)
     Flow        ironPhaseDone(st, { say, core })  the part is won (core: true pulls the next power core: its socket
                 fills). The page turns and the next part starts after IRON.leaveT s; the last part plays the ending.
     Talk        ironSay(st, text, life)  Tick through the megaphone (parts 3+) or a caption (parts 1-2: o.caption).
                 ironNews(st, text, gold)  ironHint(st, id, text, o)  ironWarn(st, id, s)  ironPop(st, x, y, text)
     Words       ironWord(st, text, x, y, size, o)  a hand-lettered sound word on the page (world coords; o.grow, o.life,
                 o.rot, o.col, o.fill, o.screen).   ironImpact(st, word)  one white-on-black impact frame (at most one a
                 second, none under reduced motion).
     Jobs        ironSwap(st)  ironShowBadges(st, s)  ironActLabels(st)
     Clangs      ironClang(st, p, o) a soft fail: "Clang!", counted, pop-back to o.to { x, y } (feet) or a knock.
                 o: { kind, word, to, still, flat (squashed like paper first), safe }.   ironTeamClang(st, o).
     Gold help   ironMiss(st, part) -> the Clangs in that stretch so far (+1).  ironGoldOnce(st, key, text, o).
     Bodies      ironBody(p, dt, solids, o)  a hero on a list of rects ({ x0, y0, x1, y1, one, dx, dy, off, slope }).
                 Partners: o.partner true makes each hero's head a one-way step; a hero who crouches (▼) is a BOOST step
                 (a jump off their head goes half as high again).   ironHandUp(st, dt, solids)  the HAND UP (World 1's
                 hand-up grown up): a hero at a ledge holding the action hauls up a partner just below.
                 ironCoast(st, dt, solids)  ironInWorld(st, fn)  ironScreen(st, fn)  ironHumanIds()  ironUp(p)
     Rivets      ironRivetsSetup(st, list) (list of [x, y]); ironRivetsStep(st); ironRivetsDraw(st) (world coords).
     Tick        st.tick = { x, y, s, face, pose, mood, hidden, ride (a hero id: on that hero's head) }.
                 Poses: idle shout stamp point sulk gasp wave ride referee sit run hang cheer. ironTickDraw(g, x, y, o).
     Random      ironRand() (all gameplay randomness; tests seed it). No Math.random in gameplay.
   STATS. Results card: Time, Record (framework), Clangs [Pip, Bo]; then "Gold rivets: N of 60. Thumb champ: ..." and the
   story line. Medal (js/medals.js): play time without idle waits and without Part 8, and team Clangs.
   CHECKPOINTS (store key 'iron:cp'; World 30's 'tth:cp' and World 35's 'wiz:cp' are never touched).
   TEST HOOK. window.__pipbo.MODES.colossus.test: jump(k, { seed, intro }), st(), ph(), phase(), calm(), done(o),
   ending(), clang(id, o), seed(n), index(), stub(phase), cp(on), cpGet(), cpClear().
     node tools/w40/play.js <part|all> [--who=pair|noisy|idle|kid] [--seeds=1,2,3]
     node tools/w40/stuck.js <part|all>    node tools/w40/perf.js    node tools/w40/artsheet.js
   ====================================================================================================================== */

const IRON = {
  introHold: 0.6,              // a part's step waits while G.introT is above this (the part card)
  idleAfter: 10,               // s with no input from any person: the giant's key slows and stops
  celebT: 1.6, leaveT: 4.4,    // calm after a big moment; the page turn between parts
  badgeT: 5, swapT: 2.2, hintLife: 3, newsLife: 3.2, sayLife: 2.8, arriveT: 1.0,
  clang: { vx: 230, vy: 300, stun: 0.6, slide: 0.3, safe: 1.5, popV: 300, flatT: 0.45 },
  goldAfter: 3,                // Clangs inside one stretch of a part before its gold helper
  boost: 1.5,                  // a jump off a crouching partner's head: this times as high
  handUp: { reach: 46, below: 170, t: 0.42 },
  // the medal: play time (s; idle waits and Part 8 not counted) and team Clangs. Set from bot runs (see GAME_NOTES).
  medal: { gold: { t: 1080, clangs: 15 }, silver: { t: 1680, clangs: 45 } },
  endT: 8.6,
  cpKey: 'iron:cp', cpV: 1, cpEvery: 2, cpNoteLife: 6, askOverMs: 700,
  impactGap: 1.0,
};
const IRON_ORDER = ['chase', 'leg', 'fists', 'boiler', 'heart', 'brain', 'fall', 'thumbs'];
// per part: title, paper (the page it is drawn on), the card's tip, Tick's line, rivets, the outfit
const IRON_PARTS = {
  chase:  { title: 'Under the Feet',    paper: 'sand', rivets: 10, outfit: 'ironchase', caption: true,
    tip: 'Run after a giant. Its feet land ahead of you and behind you. Then grab the chain on its heel!',
    line: 'It is walking toward Sunny Meadow. Catch it!' },
  leg:    { title: 'The Swinging Leg',  paper: 'sand', rivets: 10, outfit: 'ironrig', caption: true,
    tip: 'Climb a leg that keeps walking. Run the ramps while it swings, be on a ledge when it stomps.',
    line: 'Climb while it swings. Hold tight when it stomps.' },
  fists:  { title: 'The Fists',         paper: 'dusk', rivets: 8, outfit: 'ironrig',
    tip: 'It has noticed you. One gets seen on a lock, one pulls the pin. Make it punch itself!',
    line: 'WHO IS ON MY ARM? GET OFF MY ARM!' },
  boiler: { title: 'The Boiler',        paper: 'dark', rivets: 8, outfit: 'ironcrew', core: true,
    tip: 'One holds a valve to shut the steam, the other dashes through. Watch the pressure dial!',
    line: 'NOT THE BOILER. I JUST CLEANED THE BOILER.' },
  heart:  { title: 'The Gear Heart',    paper: 'dark', rivets: 8, outfit: 'ironcrew', core: true,
    tip: 'One works the signal lever, the other rides the platforms. The heart ticks once a second.',
    line: 'THAT IS MY HEART YOU ARE STANDING IN!' },
  brain:  { title: 'The Lantern Head',  paper: 'dark', rivets: 6, outfit: 'ironcrew', core: true,
    tip: 'Hold an earthing rod to switch off the lightning near it, while your partner dashes to the next.',
    line: 'Fine. Come up here and say that to my face. ...Further down. Down here.' },
  fall:   { title: 'Coming Apart',      paper: 'dawn', rivets: 10, outfit: 'ironcrew',
    tip: 'Get out while the drawing is rubbed out behind you. Faint lines will not hold you for long!',
    line: 'It is all coming apart! ...Could one of you carry me?' },
  thumbs: { title: 'Thumb War',         paper: 'dawn', rivets: 0, outfit: 'ironcrew', versus: true,
    tip: 'Two giant thumbs, one each. Slam, tuck and juke: pin your partner for a count of three!',
    line: 'Two good hands left. It would be a shame to waste them.' },
};
const IRON_RIVETS = IRON_ORDER.reduce((n, k) => n + IRON_PARTS[k].rivets, 0);   // 60
const IRON_PHASES = {};
const IRON_NONE = { setup() {} };
const ironRand = () => MODES.colossus.rand();
const ironPh = st => (st && IRON_PHASES[st.phase]) || IRON_NONE;
function ironCall(ph, name, ...args) { const f = ph && ph[name]; return typeof f === 'function' ? f.apply(ph, args) : undefined; }
const ironBusy = (st, p) => !!ironCall(ironPh(st), 'busy', st, p);
const ironCalm = st => G.mode !== 'play' || G.introT > 0 || !!st.cut || st.celebT > 0 || !!st.idle;
const ironBig = () => (typeof hudBig === 'function' && hudBig()) || (typeof stageScale === 'number' && stageScale < 0.75);
const ironFont = px => '700 ' + px + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
const ironStats = st => st.stats[st.phase] || (st.stats[st.phase] = {});
function ironSeeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ironLevelIndex = () => LEVELS.findIndex(l => l.mode === 'colossus');
const ironPaper = st => (st && (ironCall(ironPh(st), 'paperNow', st) || (st.part && st.part.paper))) || 'sand';
const ironDark = st => ironPaper(st) === 'dark';

/* --- the level entry (World 40 and its one level are added by world.js) --- */
const IRON_EMPTY_MAP = [...Array(18).fill('.'.repeat(32))].map((r, i) => (i === 15 ? '..1.2' + '.'.repeat(27) : r));
const IRON_DEF = { name: 'The Iron Colossus', world: 39, kind: 'team', mode: 'colossus', ownHUD: true, ownPills: true, noFalls: true, roomWord: 'Part',
  tip: 'Chase it, climb it, trick it, then pull out its three cores. You will need each other the whole way.',
  act: { label: 'action' },
  legend: { pip: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump <kbd>S</kbd> crouch (a step for your partner)',
    bo: '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump <kbd>↓</kbd> crouch (a step for your partner)' },
  howTo: ['Crouch to be a step. Jump off your partner\'s head to go higher.', 'At a ledge, hold the action to pull your partner up.',
    'When its shadow grows, get out from under it.', 'The game saves at the start of every part.'],
  map: IRON_EMPTY_MAP,
  rooms: IRON_ORDER.map((phase, k) => ({ phase, title: IRON_PARTS[phase].title, ownStep: true, first: k % 2, outfit: IRON_PARTS[phase].outfit,
    act: { label: 'action' }, map: IRON_EMPTY_MAP, tip: IRON_PARTS[phase].tip })),
};
// part files call this at load time to fill in their own room: Object.assign(room, fields). Returns the room.
function ironRoom(phase, fields) {
  const room = IRON_DEF.rooms.find(r => r.phase === phase);
  if (!room) { console.warn('The Iron Colossus: no room with phase ' + phase); return null; }
  return Object.assign(room, fields || {});
}

/* --- talk, news, hints, words --- */
// Tick through his megaphone (from Part 3), or a hand-lettered caption (Parts 1 and 2)
function ironSay(st, text, life = IRON.sayLife, o = {}) {
  const cap = o.caption != null ? o.caption : !!st.part.caption;
  st.say = { text, t: 0, life, caption: cap };
  if (!cap) { Sfx.play('ironMegaphone'); if (st.tick && !st.tick.hidden && st.tick.pose !== 'ride') st.tick.shoutT = Math.min(1.4, life); }
}
function ironNews(st, text, gold = false, life = IRON.newsLife) { st.news = { text, gold, t: 0, life }; }
function ironHint(st, id, text, o = {}) {
  if (typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id)) text = o.cpu || null;
  if (text) st.hints[id] = { text, t: 0, life: o.life || IRON.hintLife, gold: !!o.gold };
}
function ironPop(st, x, y, text, o = {}) { st.words.push({ text, x, y, size: o.size || 18, t: 0, life: o.life || 1.1, rot: o.rot || -0.06, rise: 30, col: o.col, fill: o.fill, grow: 0 }); }
// a hand-lettered sound word on the page: THOOM, KLANG, SKREEE... (world coords unless o.screen)
function ironWord(st, text, x, y, size, o = {}) {
  const w = { text, x, y, size, t: 0, life: o.life || 0.9, rot: o.rot != null ? o.rot : (ironRand() - 0.5) * 0.24, rise: o.rise || 0, col: o.col,
    fill: o.fill === undefined ? SKETCH.PAL.core : o.fill, grow: o.grow == null ? 0.35 : o.grow, screen: !!o.screen, key: o.key };
  if (o.key) st.words = st.words.filter(q => q.key !== o.key);
  st.words.push(w);
  return w;
}
// one white-on-black impact frame for the biggest hits (at most one a second; none under reduced motion)
function ironImpact(st, word) {
  if (reduceMotion || G.time - (st.impactAt == null ? -9 : st.impactAt) < IRON.impactGap) return;
  st.impactAt = G.time; st.impact = { t: 0, word: word || '' };
}
function ironWarn(st, id, s = 0.8) { st.warn[id] = Math.max(st.warn[id], s); }
function ironShowBadges(st, t = IRON.badgeT) { st.badgeT = t; }
function ironSwap(st) { st.swapT = IRON.swapT; st.badgeT = IRON.badgeT; Sfx.play('ironSwapJobs'); ironActLabels(st); }
function ironCelebrate(st, s = IRON.celebT) { st.celebT = Math.max(st.celebT, s); }
function ironMiss(st, part) { st.miss[part] = (st.miss[part] || 0) + 1; return st.miss[part]; }
const ironMissN = (st, part) => st.miss[part] || 0;
function ironGoldOnce(st, key, text, o = {}) {
  if (st.goldGot[key]) return false;
  st.goldGot[key] = true; ironHelp(st, text, o); return true;
}
const ironHasGold = (st, key) => !!st.goldGot[key];
function ironHelp(st, text, o = {}) {
  ironNews(st, text, true, o.life || 4); Sfx.play('ironGoldHelp'); st.stats.help.push(text);
  if (o.id != null && o.hint) ironHint(st, o.id, o.hint, { gold: true, life: o.life || 4 });
}
function ironHumanIds() {
  const ids = [0, 1].filter(k => !(typeof cpuOn === 'function' && cpuOn(k)));
  return ids.length ? ids : [0, 1];
}
function ironDev(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
function ironKey(id, what) {
  const d = ironDev(id), solo = typeof cpuSolo === 'function' && cpuSolo(), pip = solo || id === 0;
  const kb = { act: pip ? 'F' : '/', jump: pip ? 'W' : '↑', up: pip ? 'W' : '↑', down: pip ? 'S' : '↓', left: pip ? 'A' : '←', right: pip ? 'D' : '→', move: pip ? 'A D' : '← →' };
  if (d === 'pad') return { act: glyph('act'), jump: glyph('a'), up: 'up', down: 'down', left: '◀', right: '▶', move: '◀ ▶' }[what] || '';
  if (d === 'touch') return { act: 'the round button', jump: '▲', up: '▲', down: '▼', left: '◀', right: '▶', move: '◀ ▶' }[what] || '';
  return kb[what] || '';
}

/* --- soft fails: the Clang --- */
function ironClang(st, p, o = {}) {
  if (!p || st.safe[p.id] > 0 || st.cut || ironBusy(st, p)) return false;
  if (!o.still && !p.alive) return false;
  const B = IRON.clang, kind = o.kind || 'clang', word = o.word || 'CLANG!';
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  ironWord(st, word, o.at ? o.at.x : cx, o.at ? o.at.y : p.y - 16, 20, { life: 1.1, rise: 26, grow: 0.25, fill: '#f6ecd4' });
  st.stars.push({ x: cx, y: cy, t: 0 });
  if (o.still) { /* the part moves its own riders */ }
  else if (o.to) {
    // squashed flat like paper for a moment, then popped back to a safe spot
    if (o.flat !== false) st.flat[p.id] = { t: 0, x: cx, y: p.y + p.h, to: o.to };
    p.x = o.to.x - p.w / 2; p.y = o.to.y - p.h;
    p.vx = 0; p.vy = -B.popV; p.grounded = false; p.jumping = false; p.offT = 0.05; p.carryVx = 0;
    p.stun = Math.max(p.stun, B.stun * 0.7); p.knockT = 0; p.sx = 0.7; p.sy = 1.3;
  } else {
    const fx = o.fromX != null ? o.fromX : cx - p.face;
    knock(p, (cx >= fx ? 1 : -1) * B.vx, -B.vy, B.stun, B.slide);
  }
  st.safe[p.id] = o.safe != null ? o.safe : B.safe;
  st.stats.clangs[p.id]++; st.stats.kinds[kind] = (st.stats.kinds[kind] || 0) + 1;
  st.cpT = 0;
  Sfx.play('ironClang', p.id); rumble(p.id, 0.6, 0.4, 160);
  ironCall(ironPh(st), 'onClang', st, p, kind);
  return true;
}
function ironTeamClang(st, o = {}) {
  if (st.cut || st.teamSafe > 0) return false;
  st.teamSafe = o.safe != null ? o.safe : IRON.clang.safe;
  const kind = o.kind || 'clang';
  st.stats.team++; st.stats.kinds[kind] = (st.stats.kinds[kind] || 0) + 1;
  st.cpT = 0;
  const x = o.x != null ? o.x : st.cam.x + W / 2, y = o.y != null ? o.y : st.cam.y + 200;
  ironWord(st, o.word || 'CLANG!', x, y, 24, { life: 1.2, rise: 20, fill: '#f6ecd4' });
  Sfx.play('ironClang', 0); rumble(0, 0.6, 0.4, 160); rumble(1, 0.6, 0.4, 160);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.18);
  return true;
}
const ironClangN = st => st.stats.clangs[0] + st.stats.clangs[1] + st.stats.team;

/* --- bodies: a hero on a list of rectangles (world coords) --- */
const ironUp = p => !!(p.input.jump || p.input.up);
// solids: [{ x0, y0, x1, y1, one (one-way top), dx, dy (moved this tick: riders go with it), off, src }].
// o.still: no input; o.ctl(p, dt) runs instead of control(); o.partner: heroes stand on each other's heads (Boost).
function ironBody(p, dt, solids, o = {}) {
  if (!p.alive) return null;
  const real = p.input;
  if (o.still) { p.input = NO_INPUT; p.pendingJump = false; }
  const was = p.grounded, g0 = p.ground;
  const boosting = was && g0 && g0.head && g0.crouch;
  const vy0 = p.vy;
  try { if (o.ctl) o.ctl(p, dt); else control(p, dt); } finally { p.input = real; }
  // a jump off a crouching partner's head (the Boost): half as high again
  if (boosting && p.vy < -100 && vy0 >= -1) { p.vy *= Math.sqrt(IRON.boost); p.boostT = 0.5; Sfx.play('ironBoost', p.id); }
  p.boostT = Math.max(0, (p.boostT || 0) - dt);
  if (was && g0 && !g0.off) { const m = g0.src || g0; p.x += m.dx || 0; p.y += m.dy || 0; }
  const xOld = p.x;
  p.x += p.vx * dt;
  for (const r of solids) {
    if (r.one || r.off || r.head || r.slope || p.y + p.h <= r.y0 + 4 || p.y >= r.y1 - 0.5) continue;
    if (p.x + p.w > r.x0 && p.x < r.x1) {
      if (p.x + p.w / 2 < (r.x0 + r.x1) / 2) { p.x = r.x0 - p.w; p.vx = Math.min(0, p.vx); } else { p.x = r.x1; p.vx = Math.max(0, p.vx); }
    }
  }
  const feet0 = p.y + p.h, top0 = p.y;
  p.y += p.vy * dt;
  let ground = null;
  const list = o.partner ? solids.concat(ironHeads(p)) : solids;
  for (const r of list) {
    if (r.off || p.x + p.w <= r.x0 + 0.5 || p.x >= r.x1 - 0.5) continue;
    if (r.slope) {
      // a one-way slope (a ramp, a tilted plate): its top is ya at x0 .. yb at x1, under the hero's middle
      const cx = clamp(p.x + p.w / 2, r.x0, r.x1), sy = r.ya + (r.yb - r.ya) * (cx - r.x0) / (r.x1 - r.x0);
      const tol = 3 + Math.abs(r.yb - r.ya) / (r.x1 - r.x0) * Math.abs(p.vx * dt) + Math.max(0, r.dy || 0) + (was && g0 === r ? 8 : 0);
      // r.catch: a ramp rising into the feet of someone still going up (jumping onto it toward its high end) catches them
      const sy0 = r.catch ? r.ya + (r.yb - r.ya) * (clamp(xOld + p.w / 2, r.x0, r.x1) - r.x0) / (r.x1 - r.x0) : 0;
      if ((p.vy >= 0 || r.catch && feet0 <= sy0 + 0.5) && p.y + p.h >= sy && feet0 <= sy + tol && !(p.dropT > 0)) { p.y = sy - p.h; p.vy = 0; ground = r; }
      continue;
    }
    if (p.vy >= 0 && p.y + p.h >= r.y0 && feet0 <= r.y0 + 2 + Math.max(0, r.dy || 0) && !(r.one && p.dropT > 0 && !r.head)) { p.y = r.y0 - p.h; p.vy = 0; ground = r; }
    else if (!r.one && !r.head && p.vy < 0 && p.y < r.y1 && top0 >= r.y1 - 2) { p.y = r.y1; p.vy = 0; p.jumping = false; }
    else if (!r.one && !r.head && p.y + p.h > r.y0 + 0.5 && p.y < r.y1 - 0.5 && p.x + p.w > r.x0 + 0.5 && p.x < r.x1 - 0.5) {
      const up = p.y + p.h - r.y0, dn = r.y1 - p.y;
      if (up < dn) { p.y = r.y0 - p.h; p.vy = Math.min(0, p.vy); ground = r; } else { p.y = r.y1; p.vy = Math.max(0, p.vy); }
    }
  }
  if (!ground && was && p.vy >= 0) for (const r of list) {
    if (r.off || p.x + p.w <= r.x0 + 0.5 || p.x >= r.x1 - 0.5 || (r.one || r.slope) && p.dropT > 0 && !r.head) continue;
    const ty = r.slope ? r.ya + (r.yb - r.ya) * (clamp(p.x + p.w / 2, r.x0, r.x1) - r.x0) / (r.x1 - r.x0) : r.y0;
    if (Math.abs(p.y + p.h - ty) < (r.slope ? 7 : 3)) { p.y = ty - p.h; ground = r; p.vy = 0; break; }
  }
  p.ground = ground; p.grounded = !!ground; p.tileGround = !!(ground && !ground.head); p.onPartner = !!(ground && ground.head); p.onOneWay = !!(ground && ground.one);
  if (p.grounded && !was && p.lastVy > 260) { p.sx = 1.25; p.sy = 0.78; Sfx.play('land'); }
  p.lastVy = p.grounded ? 0 : p.vy;
  // crouching: a step for the partner (drawn lower)
  p.crouch = !!(p.grounded && !p.onPartner && p.input.down && p.stun <= 0 && !ironHauled(p));
  return ground;
}
// the partner's head as a one-way step (a crouching partner is a Boost step)
function ironHeads(p) {
  const o = G.players[1 - p.id];
  if (!o || !o.alive || o.ground && o.ground.head) return [];
  const top = o.y + (o.crouch ? o.h * 0.3 : 0);
  return [{ x0: o.x + 2, x1: o.x + o.w - 2, y0: top, y1: top + 6, one: true, head: true, crouch: !!o.crouch, dx: o.vx * DT, dy: 0, src: { dx: o.lastDx || 0, dy: o.lastDy || 0 } }];
}
// call once a tick after both bodies moved: remembers how far each moved (riders on heads go with them)
function ironTrack(st) {
  for (const p of G.players) { const q = st.trk[p.id]; p.lastDx = q ? p.x - q.x : 0; p.lastDy = q ? p.y - q.y : 0; st.trk[p.id] = { x: p.x, y: p.y }; }
}
const ironHauled = p => !!(G.mst && G.mst.haul && G.mst.haul.who === p.id);
// THE HAND UP: a hero standing at a ledge edge holds the action while the partner is just below: they are hauled up.
// o.can(p, o) -> false stops it (a part's own action uses the button there). Returns true while a haul runs.
function ironHandUp(st, dt, o = {}) {
  const H = IRON.handUp;
  if (st.haul) {
    const h = st.haul, q = G.players[h.who], by = G.players[h.by];
    h.t += dt;
    const k = Math.min(1, h.t / H.t), e = k * k * (3 - 2 * k);
    q.x = h.x0 + (h.x1 - h.x0) * e; q.y = h.y0 + (h.y1 - h.y0) * e - Math.sin(k * Math.PI) * 18;
    q.vx = 0; q.vy = 0; q.grounded = false;
    by.vx = 0;
    if (k >= 1) { q.y = h.y1; q.grounded = true; q.ground = h.g; st.haul = null; Sfx.play('ironHandClasp'); ironPop(st, q.x + q.w / 2, q.y - 6, 'HUP!', { size: 14 }); }
    return true;
  }
  for (const p of G.players) {
    if (!p.alive || !p.grounded || p.onPartner || !p.input.act || !p.ground || p.ground.slope || !isFinite(p.ground.y0)) continue;
    if (o.can && !o.can(p)) continue;
    const q = G.players[1 - p.id], g = p.ground;
    if (!q.alive || q.ground === g) continue;
    const pc = p.x + p.w / 2, qc = q.x + q.w / 2;
    const E = o.edge || 40, edgeL = pc - g.x0 < E, edgeR = g.x1 - pc < E;
    if (!edgeL && !edgeR) continue;
    const side = edgeR && (!edgeL || qc > pc) ? 1 : -1;
    if (Math.abs(qc - pc) > H.reach + 20 || (qc - pc) * side < -6) continue;
    const below = q.y + q.h - g.y0;
    if (below < 12 || below > H.below) continue;
    if (q.y + q.h < g.y0) continue;
    // haul q up beside p, on p's ledge (on the inner side, so nobody is left hanging off the edge)
    const tx = clamp(pc - side * 24, g.x0 + 4, g.x1 - 4 - q.w) ;
    st.haul = { who: q.id, by: p.id, t: 0, x0: q.x, y0: q.y, x1: clamp(tx - q.w / 2, g.x0, g.x1 - q.w), y1: g.y0 - q.h, g };
    q.stun = 0; q.knockT = 0;
    Sfx.play('ironHandUp');
    st.stats.handUps = (st.stats.handUps || 0) + 1;
    return true;
  }
  return false;
}
// players stand and land with no input (cards, cutscenes); on solids if given
function ironCoast(st, dt, solids) {
  for (const p of G.players) {
    p.pendingJump = false; p.pendingAct = false;
    if (solids) { ironBody(p, dt, solids, { still: true }); continue; }
    const real = p.input;
    p.input = NO_INPUT;
    try { control(p, dt); if (p.alive) { moveX(p, p.vx * dt); moveY(p, p.vy * dt); postStep(p); } } finally { p.input = real; }
  }
}
// the tick runs in world coords: players shift by the camera and back
function ironInWorld(st, fn) {
  const ps = G.players, c0 = st.cam;
  for (const p of ps) { p.x += c0.x; p.y += c0.y; }
  try { fn(); } finally { const c = st.cam; for (const p of ps) { p.x -= c.x; p.y -= c.y; } }
}
function ironScreen(st, fn) { ctx.save(); ctx.translate(st.cam.x, st.cam.y); try { fn(); } finally { ctx.restore(); } }
const ironUnder = (x0, y0, x1, y1) => G.players.some(p => p.alive && p.x + p.w > x0 - 4 && p.x < x1 + 4 && p.y + p.h > y0 - 4 && p.y - 8 < y1 + 4);

/* --- gold rivets (60 over Parts 1-7): list of [x, y] world coords --- */
function ironRivetsSetup(st, list) {
  st.ph.rivets = list.map(([x, y], i) => ({ i, x, y, got: false, t: 0 }));
}
function ironRivetsStep(st, dt = DT) {
  const R = st.ph.rivets;
  if (!R) return;
  for (const r of R) {
    if (r.got) { r.t += dt; continue; }
    for (const p of G.players) {
      if (!p.alive) continue;
      if (Math.abs(p.x + p.w / 2 - r.x) < 18 && Math.abs(p.y + p.h / 2 - r.y) < 22) {
        r.got = true; r.t = 0; st.rivets[st.phaseNo] = (st.rivets[st.phaseNo] || 0) + 1;
        st.rivStreak = (st.rivStreakT > 0 ? st.rivStreak : 0) + 1; st.rivStreakT = 2;
        Sfx.play('ironRivetTing', Math.min(6, st.rivStreak)); ironPop(st, r.x, r.y - 10, '+1', { size: 13, fill: SKETCH.PAL.core });
        break;
      }
    }
  }
}
function ironRivetsDraw(st) {
  const R = st.ph.rivets;
  if (!R) return;
  const t = G.clock, dark = ironDark(st);
  for (const r of R) {
    if (r.got && r.t > 0.5) continue;
    const k = r.got ? r.t / 0.5 : 0, y = r.y - k * 30 + Math.sin(t * 3 + r.i) * 2;
    SKETCH.blit(ctx, ironRivetSheet(dark), r.x, y, { alpha: 1 - k, sx: 1 + k * 0.4, sy: 1 + k * 0.4 });
  }
}
function ironRivetSheet(dark) {
  const key = 'iron:rivet:' + (dark ? 'd' : 'l');
  if (!SKETCH.has(key)) SKETCH.sheet(key, 30, 30, d => {
    const P = SKETCH.PAL, c = 15;
    if (dark) d.wash(SKETCH.ell(c, c, 13, 13, 16), P.cream, { alpha: 0.35, off: 0, op: 'source-over', layer: 'base' });
    d.ellipse(c, c, 8, 7.4, { fill: P.core, w: 1.6, hatch: { a: 40, gap: 1.6, w: 0.45, tone: (x, y) => ((x - c) + (y - c)) / 9 + 0.2 } });
    d.ellipse(c, c, 3.4, 3.1, { w: 1, fill: P.coreHot });
    d.lift(SKETCH.ell(c - 3, c - 3, 2.4, 1.8, 8), 0.9);
    for (const a of [0.4, 2.1, 3.7, 5.2]) d.stroke([[c + Math.cos(a) * 10, c + Math.sin(a) * 10], [c + Math.cos(a) * 13, c + Math.sin(a) * 13]], { w: 0.9, sh: 0, col: dark ? '#f6ecd4' : SKETCH.INK, alpha: 0.7 });
  }, { ox: 15, oy: 15, seed: 61, paper: dark ? 'dark' : undefined });
  return key;
}

/* --- a safe-spot flag (world coords): an inked pennant on a pole --- */
function ironDrawFlag(x, gy, lit, o = {}) {
  const d = SKETCH.live(ctx, 5100 + Math.round(x), SKETCH.boil()), dark = !!o.dark, ink = dark ? SKETCH.CHALK : SKETCH.INK;
  d.stroke([[x, gy], [x + 0.6, gy - 30], [x, gy - 58]], { w: 2.2, col: ink, curve: true });
  const wv = Math.sin(G.clock * 5 + x) * 3;
  const fl = [[x, gy - 57], [x + 26, gy - 52 + wv * 0.4], [x + 30 + wv, gy - 47], [x + 24, gy - 43 + wv * 0.3], [x, gy - 40]];
  d.wash(fl, lit ? SKETCH.PAL.core : '#cfc2a2', { alpha: 0.9, off: 0, op: 'source-over' });
  d.outline(fl, { w: 1.4, col: ink, curve: true, c: [x + 12, gy - 48] });
  d.ellipse(x, gy - 59, 2.4, 2.4, { w: 1, col: ink });
}

/* --- Tick: state --- */
function ironNewTick() {
  return { x: 760, y: 220, s: 1, face: -1, pose: 'idle', mood: 'cross', t: 0, hidden: true, alpha: 1, shoutT: 0, blink: 0, blinkT: 2, ride: -1, key: 0 };
}
function ironTickStep(st, dt) {
  const c = st.tick;
  c.t += dt; c.key += dt * (st.idle ? 0.2 : 3);
  if (c.shoutT > 0) c.shoutT = Math.max(0, c.shoutT - dt);
  c.blink -= dt; c.blinkT -= dt;
  if (c.blinkT <= 0) { c.blink = 0.13; c.blinkT = 1.8 + ((c.t * 7.3) % 2.4); }
  if (c.ride >= 0) {
    const p = G.players[c.ride];
    c.x = p.x + p.w / 2; c.y = p.y - (c.ride === 0 ? 6 : 2); c.face = p.face || 1; c.pose = 'ride';
  }
}

/* --- the idle wait: no person pressed anything for IRON.idleAfter s: the giant winds down --- */
function ironIdleTick(st, dt) {
  const ph = ironPh(st);
  const any = ironHumanIds().some(k => { const i = G.players[k].input; return i.left || i.right || i.jump || i.down || i.up || i.act || !!ironCall(ph, 'present', st, G.players[k]); });
  if (any) {
    if (st.idle) { st.idle = false; Sfx.play('ironKeyWind'); ironNews(st, 'The Colossus winds back up!'); }
    st.idleT = 0; return;
  }
  st.idleT += dt;
  if (!st.idle && st.idleT >= IRON.idleAfter && !st.cut && G.introT <= 0) { st.idle = true; Sfx.play('ironKeyUnwind'); }
}

/* --- per-role action words on the touch buttons, the top-bar legend and the cards --- */
let ironLabelEls = null;
function ironActLabels(st) {
  const def = G.level && G.level.def;
  if (!def || !def.act) return;
  let want = ironCall(ironPh(st), 'labels', st);
  if (!want) want = def.act.labels || [def.act.label, def.act.label];
  const key = want[0] + '|' + want[1];
  if (st.labKey === key) return;
  st.labKey = key;
  def.act = Object.assign({}, def.act, { labels: [want[0], want[1]] });
  try {
    const lg = ironCall(ironPh(st), 'legend', st);
    if (lg && G.mode === 'play') setLegend(lg);
    if (!ironLabelEls || !ironLabelEls.every(o => document.contains(o.el))) ironLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : -1;
      return { el, id };
    });
    for (const o of ironLabelEls) {
      const w = o.id < 0 ? (want[0] === want[1] ? want[0] : want[0] + '/' + want[1]) : want[o.id];
      if (o.el.textContent !== w) o.el.textContent = w;
    }
    if (typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* no page (tests) */ }
}

/* --- checkpoints: the start of every part after the first, kept in the browser --- */
const ironCpOn = () => !!MODES.colossus.cpOn || (!G.manual && G.mode === 'play');
const ironPlain = o => !!o && typeof o === 'object' && !Array.isArray(o);
const ironNum0 = n => typeof n === 'number' && isFinite(n) && n >= 0;
function ironCpOk(cp) {
  if (!ironPlain(cp) || cp.v !== IRON.cpV || !Number.isInteger(cp.era) || cp.era < 1 || cp.era >= IRON_ORDER.length) return false;
  if (!ironNum0(cp.time) || cp.time > 1e6 || !Array.isArray(cp.rivets) || cp.rivets.length !== IRON_ORDER.length || !cp.rivets.every(ironNum0)) return false;
  if (!Number.isInteger(cp.cores) || cp.cores < 0 || cp.cores > 3) return false;
  const s = cp.stats;
  if (!ironPlain(s) || !Array.isArray(s.clangs) || s.clangs.length !== 2 || !s.clangs.every(ironNum0) || !ironNum0(s.team)) return false;
  if (!ironPlain(s.kinds) || !Array.isArray(s.help) || !Array.isArray(s.phaseT) || (s.idleT !== undefined && !ironNum0(s.idleT))) return false;
  return IRON_ORDER.every(k => s[k] === undefined || ironPlain(s[k]));
}
function ironCpGet() {
  const cp = store.get(IRON.cpKey);
  if (ironCpOk(cp)) return cp;
  if (cp != null) ironCpClear();
  return null;
}
function ironCpWrite(st, era, time) {
  st.cp = null;
  if (!ironCpOn() || era < 1 || era >= IRON_ORDER.length) return;
  let stats; try { stats = JSON.parse(JSON.stringify(st.stats)); } catch (e) { return; }
  st.cp = { v: IRON.cpV, era, time: Math.round(Math.max(0, time) * 10) / 10, stats, rivets: st.rivets.slice(), cores: st.cores, vsTime: st.vsTime || 0 };
  st.cpT = IRON.cpEvery;
  store.set(IRON.cpKey, st.cp);
}
function ironCpSave(st) { ironCpWrite(st, st.phaseNo, G.time); }
function ironCpLive(st) {
  if (!st.cp || st.cp.era !== st.phaseNo || st.cut) return;
  st.cp.live = { time: Math.round(Math.max(0, G.time) * 10) / 10, clangs: st.stats.clangs.slice(), team: st.stats.team };
  st.cpT = IRON.cpEvery;
  store.set(IRON.cpKey, st.cp);
}
function ironCpClear() { store.set(IRON.cpKey, null); if (G.mst) G.mst.cp = null; }

/* --- the mode: parts, the page turn, the ending --- */
function ironInit(st) {
  st.stats = { clangs: [0, 0], team: 0, kinds: {}, help: [], phaseT: [], idleT: 0 };
  for (const k of IRON_ORDER) st.stats[k] = {};
  st.rivets = IRON_ORDER.map(() => 0); st.cores = 0; st.vsTime = 0;
  st.ended = false; st.resumed = 0; st.cp = null; st.cpT = 0; st.cpNote = null; st.askOver = 0;
}
function ironStartPhase(st, L) {
  const def = L.def;
  const prev = IRON_PHASES[st.phase];
  if (prev && st.phase !== def.phase) ironCall(prev, 'leave', st);
  st.phase = def.phase; st.phaseNo = def.roomIndex || 0; st.part = IRON_PARTS[st.phase] || IRON_PARTS.chase;
  st.ph = {}; st.phT = 0; st.cam = { x: 0, y: 0 }; st.miss = {}; st.goldGot = {}; st.trk = [null, null]; st.haul = null;
  st.cut = null; st.celebT = 0; st.say = null; st.news = null; st.hints = [null, null]; st.words = []; st.stars = []; st.flat = [null, null];
  st.badgeT = 0; st.badgeArm = true; st.swapT = 0; st.safe = [0, 0]; st.teamSafe = 0; st.warn = [0, 0]; st.idleT = 0; st.idle = false; st.labKey = '';
  st.impact = null; st.impactAt = -9; st.rivStreak = 0; st.rivStreakT = 0; st.lineSaid = false;
  st.arriveT = st.phaseNo > 0 ? IRON.arriveT : 0;
  st.tick = ironNewTick();
  st.rivets[st.phaseNo] = 0;   // (a restarted part collects its rivets again)
  if (!st.stats[st.phase]) st.stats[st.phase] = {};
  setOutfit(st.part.outfit);
  if (G.mode === 'play') setLegend(def.legend || IRON_DEF.legend);
  if (!IRON_PHASES[def.phase]) console.warn('The Iron Colossus: no IRON_PHASES.' + def.phase);
  ironCpSave(st);
  for (const p of G.players) { p.crouch = false; p.ground = null; p.boostT = 0; }
  ironCall(ironPh(st), 'setup', st, L);
  ironActLabels(st);
  st.cpNote = null;
  if (st.resumed === 1) { st.resumed = 2; st.cpNote = { text: 'Checkpoint: Part ' + (st.phaseNo + 1) + '. Pause to start over from Part 1.', t: 0, life: IRON.cpNoteLife }; }
}
function ironCoastPhase(st, dt) { const ph = ironPh(st); if (ph.coast) ironCall(ph, 'coast', st, dt); else ironCoast(st, dt, st.ph.solids); }
function ironTick(st, dt) {
  const ph = ironPh(st);
  if (G.introT <= 0) st.phT += dt;
  ironIdleTick(st, dt);
  if (st.celebT > 0) st.celebT = Math.max(0, st.celebT - dt);
  if (st.arriveT > 0) st.arriveT = Math.max(0, st.arriveT - dt);
  if (st.say && (st.say.t += dt) >= st.say.life) st.say = null;
  if (st.news && (st.news.t += dt) >= st.news.life) st.news = null;
  if (st.cpNote && G.introT <= 0 && !st.cut && (st.cpNote.t += dt) >= st.cpNote.life) st.cpNote = null;
  for (let k = 0; k < 2; k++) {
    const h = st.hints[k];
    if (h && (h.t += dt) >= h.life) st.hints[k] = null;
    st.safe[k] = Math.max(0, st.safe[k] - dt); st.warn[k] = Math.max(0, st.warn[k] - dt);
    const f = st.flat[k]; if (f && (f.t += dt) > IRON.clang.flatT) st.flat[k] = null;
  }
  st.teamSafe = Math.max(0, st.teamSafe - dt);
  st.rivStreakT = Math.max(0, st.rivStreakT - dt);
  for (const q of st.words) q.t += dt;
  if (st.words.length && st.words.some(q => q.t > q.life)) st.words = st.words.filter(q => q.t <= q.life);
  for (const q of st.stars) q.t += dt;
  if (st.stars.length && st.stars[0].t > 0.6) st.stars = st.stars.filter(q => q.t <= 0.6);
  if (st.impact && (st.impact.t += dt) > 0.09) st.impact = null;
  if (st.swapT > 0) st.swapT = Math.max(0, st.swapT - dt);
  if (st.badgeT > 0 && G.introT <= 0) st.badgeT = Math.max(0, st.badgeT - dt);
  ironTickStep(st, dt);
  if (st.cut) { ironCutStep(st, dt); if (G.mst === st && st.cut && st.cut.kind === 'leave') ironCoastPhase(st, dt); return; }
  if (G.introT > IRON.introHold) {
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
    if (ph.wait) ironCall(ph, 'wait', st, dt); else ironCoastPhase(st, dt);
    ironActLabels(st);
    return;
  }
  if (st.badgeArm) { st.badgeArm = false; st.badgeT = IRON.badgeT; }
  if (!st.lineSaid && G.introT <= 0) { st.lineSaid = true; ironSay(st, st.part.line, 3.6); }
  ironCall(ph, 'step', st, dt);
  ironTrack(st);
  ironActLabels(st);
}
function ironStep(st, dt) {
  if (!st.tick) return;
  SKETCH.t = G.clock;
  if (st.cut && st.cut.kind === 'end') { ironEndStep(st, dt); return; }
  ironInWorld(st, () => ironTick(st, dt));
}
// The part is won. o.say: a line; o.core: a power core comes out (its socket fills).
function ironPhaseDone(st, o = {}) {
  if (st.cut) return false;
  st.stats.phaseT[st.phaseNo] = Math.round(st.phT * 10) / 10;
  if (o.core) { st.cores = Math.min(3, st.cores + 1); ironNews(st, 'Power core ' + st.cores + ' of 3 out!', true, 3.4); Sfx.play('ironPartClear'); }
  const def = G.level.def;
  if (def.roomIndex >= def.roomCount - 1) return ironEnding(st, o);
  ironCpWrite(st, st.phaseNo + 1, G.time + IRON.leaveT);
  st.cut = { kind: 'leave', t: 0, said: false, say: o.say || null };
  if (!o.core) Sfx.play('ironPartClear');
  return true;
}
function ironCutStep(st, dt) {
  const c = st.cut;
  if (c.kind !== 'leave') return;
  c.t += dt;
  if (!c.said) { c.said = true; if (c.say) ironSay(st, c.say, 2.4); }
  if (c.t > 1.8 && !c.flap) { c.flap = true; Sfx.play('ironPaperFlap'); }
  if (c.t >= IRON.leaveT) nextRoom();
}
// The ending (after the Thumb War): the winner's hand lifts both heroes and Tick up over Sunny Meadow at sunrise.
// The thumbs part draws it (IRON_END.draw) when it is loaded; the core keeps the clock and the lines.
const IRON_END = { draw: null };
function ironEnding(st, o = {}) {
  if (st.cut && st.cut.kind === 'end') return false;
  st.cut = { kind: 'end', t: 0, step: 0, line: o.say || null, flecks: [] };
  st.cam = { x: 0, y: 0 }; st.hints = [null, null]; st.news = null; st.badgeT = 0; st.swapT = 0; st.warn = [0, 0];
  Sfx.play('ironCrowning');
  return true;
}
function ironEndStep(st, dt) {
  const c = st.cut;
  c.t += dt;
  ironTickStep(st, dt);
  if (st.say && (st.say.t += dt) >= st.say.life) st.say = null;
  for (const q of st.words) q.t += dt;
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; p.vx = 0; p.vy = 0; }
  const at = (n, time) => c.step === n && c.t >= time && ++c.step;
  if (at(0, 0.3)) ironSay(st, c.line || 'Well. That is the last of my giant.', 2.6, { caption: false });
  if (at(1, 3.0)) ironSay(st, 'Smaller steps from now on. Promise.', 2.6, { caption: false });
  if (at(2, 5.6)) { Sfx.play('ironKeyWind'); }
  if (c.t > 2.2 && (G.tickN % 5) === 0) c.flecks.push({ x: 60 + ironRand() * (W - 120), y: -10, vx: (ironRand() - 0.5) * 40, vy: 60 + ironRand() * 60, r: ironRand() * 6, col: ironRand() < 0.5 ? (ironRand() < 0.5 ? PCOL[0] : PCOL[1]) : SKETCH.PAL.core, t: 0 });
  for (const f of c.flecks) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += dt * 3; }
  if (c.flecks.length > 80) c.flecks = c.flecks.filter(f => f.y < H + 20);
  if (at(3, IRON.endT)) { st.ended = true; ironCpClear(); levelClear(); }
}

MODES.colossus = {
  rand: Math.random,
  cpOn: false,
  medals: { bronze: 'Stop the Colossus', goals: [
    { key: 'time', gold: IRON.medal.gold.t, silver: IRON.medal.silver.t },
    { key: 'clangs', gold: IRON.medal.gold.clangs, silver: IRON.medal.silver.clangs, word: 'Clang', text: n => n + ' or fewer Clangs', gap: (v, n) => Math.max(1, Math.ceil(v - n)) + ' fewer Clangs' },
  ] },
  // play time without idle waits and without Part 8 (G.time stops during it), and team Clangs
  medalValues() { const st = G.mst; return st && st.stats ? { time: Math.max(0, G.time), clangs: ironClangN(st) } : {}; },
  music() { const st = G.mst; if (!st || !st.tick) return null; const m = ironCall(ironPh(st), 'music', st); return m || null; },
  setup(st, L) {
    ironInit(st);
    const cp = ironCpOn() ? ironCpGet() : null;
    if (!cp) { ironStartPhase(st, L); return; }
    Object.assign(st.stats, cp.stats);
    for (let k = 0; k < st.rivets.length; k++) st.rivets[k] = cp.rivets[k] || 0;
    st.cores = cp.cores; st.vsTime = cp.vsTime || 0;
    st.resumed = 1;
    G.time = cp.time;
    const lv = ironPlain(cp.live) ? cp.live : {};
    if (ironNum0(lv.time)) G.time = Math.max(G.time, lv.time);
    if (Array.isArray(lv.clangs)) for (let k = 0; k < 2; k++) if (ironNum0(lv.clangs[k])) st.stats.clangs[k] = Math.max(st.stats.clangs[k], lv.clangs[k]);
    if (ironNum0(lv.team)) st.stats.team = Math.max(st.stats.team, lv.team);
    G.room = cp.era - 1;
    nextRoom();
  },
  room(k, L) { ironStartPhase(G.mst, L); },
  step(dt) {
    const st = G.mst;
    ironStep(st, dt);
    // the clock stops while the giant winds down for an away person, and in the Thumb War (not part of the medal)
    if (st.tick && !st.cut && G.mode === 'play') {
      if (st.idle) { G.time = Math.max(0, G.time - dt); st.stats.idleT += dt; }
      else if (st.part && st.part.versus) { G.time = Math.max(0, G.time - dt); st.vsTime += dt; }
    }
    st.askOver = 0;
    if (st.cp && (st.cpT -= dt) <= 0) ironCpLive(st);
  },
  onKill(p) { const st = G.mst; if (st.tick && !(st.cut && st.cut.kind === 'end')) ironCall(ironPh(st), 'onKill', st, p); },
  onRespawn(p) { const st = G.mst; if (st.tick && !(st.cut && st.cut.kind === 'end')) ironCall(ironPh(st), 'onRespawn', st, p); },
  draw() { const st = G.mst; if (st.tick) ironDraw(st); },
  drawTop() { const st = G.mst; if (st.tick) ironDrawTop(st); },
  hud() { const st = G.mst; if (st.tick) ironHud(st); },
  stats() { return ironStatsOut(G.mst); },
  pauseExtra() {
    const st = G.mst;
    if (!st || !st.tick || !(st.phaseNo > 0)) return null;
    ironCpLive(st);
    return { replay: 'Restart this part', more: [{ label: st.askOver ? 'Really start over? Press again' : 'Start over from Part 1', arg: 'startover' }] };
  },
  pauseAct(arg) {
    if (arg !== 'startover') return;
    const st = G.mst, now = Date.now();
    if (!st.askOver) { st.askOver = now; if (typeof showPauseCard === 'function') showPauseCard(); return; }
    if (now - st.askOver < IRON.askOverMs) return;
    ironCpClear(); loadLevel(G.levelIndex);
  },
};

// The results card: Time and Record (framework), Clangs, then the rivets, the Thumb War and the story line.
function ironStatsOut(st) {
  const n = ironClangN(st), got = st.rivets.reduce((a, b) => a + b, 0);
  const out = [{ label: 'Clangs', values: [st.stats.clangs[0], st.stats.clangs[1]] }];
  const bits = ['Gold rivets: ' + got + ' of ' + IRON_RIVETS];
  for (const ph of IRON_ORDER.slice().reverse()) {
    const P = IRON_PHASES[ph];
    if (!P) continue;
    const tile = ironCall(P, 'stat', st), line = ironCall(P, 'statLine', st);
    if (tile && tile.label) bits.push(tile.label + ': ' + (tile.values ? tile.values.join(' - ') : tile.value));
    if (line) bits.push(line);
  }
  out.push(bits.map(l => l + '.').join(' '));
  out.push((n === 0 ? 'Not one Clang! ' : '') + 'The Colossus stopped one step from home. Tick is taking smaller steps now.');
  return out;
}

/* --- drawing: the page --- */
function ironHideMask(st) {
  if (st.cut && st.cut.kind === 'end') return [true, true];
  const h = ironCall(ironPh(st), 'hide', st);
  if (h === false) return [false, false];
  return [true, true];   // (this world draws its heroes itself, in the sketch style)
}
function ironUnhide(st) { if (st.hid) { for (const p of G.players) if (st.hid[p.id]) p.alive = true; st.hid = null; } }
/* The view: a part may tilt the whole page about a screen point (the Swinging Leg): view(st) -> { cx, cy, a } (a in
   radians, clockwise). drawSky(st) draws under it, unturned, in screen coords. Everything else is drawn turned. */
const ironView = st => { const v = st && st.tick && !(st.cut && st.cut.kind === 'end') ? ironCall(ironPh(st), 'view', st) : null; return v && v.a ? v : null; };
function ironViewApply(st) { const v = ironView(st); if (v) { ctx.translate(v.cx, v.cy); ctx.rotate(v.a); ctx.translate(-v.cx, -v.cy); } }
// a screen point (as the part sees it, unturned) -> where it shows on the turned page
function ironViewPt(st, x, y) {
  const v = ironView(st);
  if (!v) return { x, y };
  const c = Math.cos(v.a), s = Math.sin(v.a), dx = x - v.cx, dy = y - v.cy;
  return { x: v.cx + dx * c - dy * s, y: v.cy + dx * s + dy * c };
}
// runs fn with the heroes moved (screen coords) to where they show on the turned page (for bubbles, hints, the "!")
function ironAtView(st, fn) {
  if (!ironView(st)) return fn();
  const ps = G.players, keep = ps.map(p => [p.x, p.y]);
  for (const p of ps) { const q = ironViewPt(st, p.x + p.w / 2, p.y + p.h / 2); p.x = q.x - p.w / 2; p.y = q.y - p.h / 2; }
  try { return fn(); } finally { ps.forEach((p, i) => { p.x = keep[i][0]; p.y = keep[i][1]; }); }
}
function ironDraw(st) {
  const ph = ironPh(st);
  ironUnhide(st);
  SKETCH.t = G.clock;
  if (st.cut && st.cut.kind === 'end') { ironDrawEnd(st); ironHideAll(st); return; }
  ironCall(ph, 'drawSky', st);
  ctx.save(); ironViewApply(st); ctx.translate(-st.cam.x, -st.cam.y);
  ironCall(ph, 'drawBack', st);
  ironCall(ph, 'draw', st);
  ironRivetsDraw(st);
  ctx.restore();
  // the heroes, in the style (screen coords: between ticks the players are in screen coords)
  ctx.save(); ironViewApply(st);
  ironDrawHeroes(st);
  ctx.restore();
  ironHideAll(st);
}
function ironHideAll(st) {
  const m = ironHideMask(st);
  if (m[0] || m[1]) { st.hid = [false, false]; for (const p of G.players) if (m[p.id] && p.alive) { st.hid[p.id] = true; p.alive = false; } }
}
function ironDrawHeroes(st) {
  const ph = ironPh(st), dark = ironDark(st);
  for (const p of G.players) {
    if (!p.alive) continue;
    const f = st.flat[p.id];
    if (f) {
      // squashed flat like paper where it happened, peeling up (world coords -> screen)
      const k = f.t / IRON.clang.flatT;
      ctx.save(); ctx.globalAlpha = 1 - k * 0.6;
      SKETCH.hero(ctx, p, { x: f.x - st.cam.x, y: f.y - st.cam.y, sx: 1.7 - k * 0.4, sy: 0.22 + k * 0.2, dark, noShadow: true, mood: 'dizzy' });
      ctx.restore();
      if (k < 0.5) continue;
    }
    if (ironCall(ph, 'drawHero', st, p)) continue;
    const o = Object.assign({ dark }, ironCall(ph, 'heroO', st, p) || {});
    if (p.crouch && o.sy == null) { o.sy = p.sy * 0.72; o.sx = p.sx * 1.12; }
    if (st.safe[p.id] > 0 && ((G.clock * 10) | 0) % 2 && !st.flat[p.id]) o.alpha = 0.55;
    if (o.alpha != null) { ctx.save(); ctx.globalAlpha *= o.alpha; SKETCH.hero(ctx, p, o); ctx.restore(); }
    else SKETCH.hero(ctx, p, o);
    // Tick riding on this hero's head
    if (st.tick.ride === p.id && !st.tick.hidden) ironTickDraw(ctx, p.x + p.w / 2, p.y - (p.id === 0 ? 4 : 1) + (1 - (o.sy || p.sy)) * p.h, { pose: 'ride', face: p.face || 1, s: 0.9, dark, t: st.tick.t, key: st.tick.key, shout: st.tick.shoutT > 0 });
  }
}
function ironDrawTop(st) {
  const ph = ironPh(st), end = st.cut && st.cut.kind === 'end';
  ironUnhide(st);
  ctx.save(); ironViewApply(st); ctx.translate(-st.cam.x, -st.cam.y);
  if (!end) ironCall(ph, 'drawTop', st);
  // stars of a Clang
  const d = SKETCH.live(ctx, 515, SKETCH.boil()), dark = ironDark(st), ink = dark ? SKETCH.CHALK : SKETCH.INK;
  for (const q of st.stars) {
    const k = q.t / 0.6;
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3, r0 = 8 + k * 16, r1 = r0 + 8 * (1 - k); d.stroke([[q.x + Math.cos(a) * r0, q.y + Math.sin(a) * r0], [q.x + Math.cos(a) * r1, q.y + Math.sin(a) * r1]], { w: 2 * (1 - k) + 0.4, col: ink, sh: 0 }); }
  }
  // sound words (world coords)
  for (const q of st.words) if (!q.screen) ironDrawWord(q, dark);
  ctx.restore();
  for (const q of st.words) if (q.screen) ironDrawWord(q, dark);
  // the page's soft edge (darker toward the corners): the frame every part sits in
  if (!end) SKETCH.edge(ctx, ironPaper(st));
  // the "!" warnings over heads
  ironAtView(st, () => { for (const p of G.players) {
    if (!p.alive || end || !(st.warn[p.id] > 0)) continue;
    const bob = Math.abs(Math.sin(G.clock * 12)) * 5;
    SKETCH.live(ctx, 77 + p.id, SKETCH.boil()).word('!', p.x + p.w / 2, p.y - 30 - bob - ironHeadLift(st, p), 24, { align: 'center', col: dark ? SKETCH.CHALK : SKETCH.INK, fill: SKETCH.PAL.core, w: 3 });
  } });
  // the impact frame: one frame of white on black (after everything in the level, before the HUD)
  if (st.impact && !reduceMotion) {
    ctx.save(); ctx.fillStyle = '#17110c'; ctx.globalAlpha = 0.92; ctx.fillRect(0, 0, W, H); ctx.restore();
    const ld = SKETCH.live(ctx, 99, 0);
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, r0 = 70 + (i % 3) * 30; ld.stroke([[W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0], [W / 2 + Math.cos(a) * 520, H / 2 + Math.sin(a) * 520]], { w: 5 + (i % 4) * 3, col: '#f6ecd4', p: [0.2, 1, 0.1], sh: 0 }); }
    if (st.impact.word) ld.word(st.impact.word, W / 2, H / 2 + 22, 64, { align: 'center', col: '#17110c', fill: '#f6ecd4', w: 6, rot: -0.06 });
  }
}
function ironDrawWord(q, dark) {
  const k = q.t / q.life, s = 1 + q.grow * Math.min(1, q.t / 0.25), a = Math.min(1, (q.life - q.t) / 0.25);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  const d = SKETCH.live(ctx, 300 + q.text.length * 7, SKETCH.boil());
  d.word(q.text, q.x, q.y - k * q.rise, q.size * s, { align: 'center', rot: q.rot, col: q.col || (dark ? SKETCH.CHALK : SKETCH.INK), fill: q.fill, w: Math.max(1.8, q.size * s * 0.11) });
  ctx.restore();
}
const ironHeadLift = (st, p) => (st.cut && st.cut.kind === 'end' ? 0 : ironCall(ironPh(st), 'headLift', st, p) || (st.tick.ride === p.id ? 16 : 0));

/* --- drawing: Tick, the pilot (a wind-up tin toy no taller than Pip's foot) ---
   ironTickDraw(g, x, y, o): (x, y) the middle of his feet. o: { pose, face, s (1 = 22 px tall), dark, t, key (the key's
   turn), shout (mouth open), blink, mood, mega (megaphone up) }. Drawn live (small), always in the sketch style:
   a tin body painted verdigris with a riveted belt, a round head with two button eyes and a bristly moustache, a little
   peaked cap, a brass key in his back, extension blocks on his feet. */
function ironTickDraw(g, x, y, o = {}) {
  const P = SKETCH.PAL, v = SKETCH.boil(), d = SKETCH.live(g, 6100 + v * 5, v), pose = o.pose || 'idle', f = o.face || 1, s = (o.s || 1) * 1.05;
  const t = o.t || 0, ink = SKETCH.INK, dark = !!o.dark;
  const bounce = pose === 'stamp' ? Math.abs(Math.sin(t * 14)) * 2.5 : pose === 'run' ? Math.abs(Math.sin(t * 16)) * 2 : pose === 'cheer' ? Math.abs(Math.sin(t * 9)) * 3 : 0;
  g.save(); g.translate(x, y - bounce); g.scale(s * f, s);
  const fill = (pts, col, a = 1) => { g.fillStyle = col; g.globalAlpha = a; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); g.globalAlpha = 1; };
  if (dark) { fill(SKETCH.ell(0, -11, 11, 13, 14), P.cream, 0.8); }
  // legs (with extension blocks when he sits in the chair: pose 'sit')
  const lk = pose === 'run' ? Math.sin(t * 16) * 3 : pose === 'stamp' ? Math.sin(t * 14) * 2.5 : 0;
  for (const sd of [-1, 1]) {
    const lx = sd * 2.6, ft = pose === 'sit' ? [lx + 3, -2] : [lx + sd * lk * 0.5, 0];
    d.stroke([[lx, -7], [ft[0], ft[1] - 1]], { w: 1.6, col: ink, sh: 0 });
    fill([[ft[0] - 2.4, ft[1] - 1.8], [ft[0] + 3, ft[1] - 1.8], [ft[0] + 3.2, ft[1] + 0.4], [ft[0] - 2.6, ft[1] + 0.4]], '#5a4a3e');
  }
  // the key in his back (it turns)
  const ka = (o.key || 0) % (Math.PI * 2), kx = -7.5, ky = -11;
  d.stroke([[kx + 2, ky], [kx - 2, ky]], { w: 1.4, col: ink, sh: 0 });
  const kw = Math.abs(Math.cos(ka)) * 3.4 + 0.8;
  for (const sd of [-1, 1]) fill(SKETCH.ell(kx - 3.4, ky + sd * 2.8, kw, 2.4, 10), P.core);
  for (const sd of [-1, 1]) d.stroke(SKETCH.ell(kx - 3.4, ky + sd * 2.8, kw, 2.4, 10), { w: 0.8, col: ink, curve: true, sh: 0 });
  // body: a tin can with a belt
  const body = [[-5.5, -16], [5.5, -16], [6.2, -11], [5.6, -6.5], [-5.6, -6.5], [-6.2, -11]];
  fill(body, P.verd); fill([[1, -16], [5.5, -16], [6.2, -11], [5.6, -6.5], [1.5, -6.5]], P.verdDark, 0.45);
  fill([[-5.8, -10.2], [6, -10.2], [6, -8.6], [-5.8, -8.6]], P.ochreDeep);
  d.outline(body, { w: 1.2, col: ink, corner: 40, c: [0, -11] });
  for (const rx of [-3.6, 0, 3.6]) fill(SKETCH.ell(rx, -9.4, 0.6, 0.6, 6), P.coreHot);
  // arms by pose
  const arm = (sd, ex, ey) => { d.stroke([[sd * 5.4, -14], [ex, ey]], { w: 1.5, col: ink, curve: false, sh: 0 }); fill(SKETCH.ell(ex, ey, 1.4, 1.4, 8), '#e9e0cc'); };
  const wv = Math.sin(t * 12) * 2.5;
  const mega = o.mega != null ? o.mega : (pose === 'shout' || (o.shout && pose !== 'ride' && pose !== 'hang'));
  if (pose === 'point') { arm(1, 13, -17); arm(-1, -8, -9); }
  else if (pose === 'wave') { arm(1, 10, -24 + wv); arm(-1, -8, -9); }
  else if (pose === 'cheer') { arm(1, 8, -25 + wv); arm(-1, -8, -25 - wv); }
  else if (pose === 'gasp') { arm(1, 6, -21); arm(-1, -6, -21); }
  else if (pose === 'sulk') { arm(1, 3, -10); arm(-1, -3, -10); }
  else if (pose === 'hang') { arm(1, 4, -27); arm(-1, -4, -27); }
  else if (pose === 'referee') { arm(1, 10, -22 + wv * 0.4); arm(-1, -8, -11); d.stroke([[10, -22 + wv * 0.4], [10.5, -31]], { w: 1, col: ink, sh: 0 }); fill([[10.5, -31], [17, -29.5 + wv * 0.3], [10.5, -27]], P.core); }
  else if (pose === 'stamp') { arm(1, 9, -12 + wv * 0.5); arm(-1, -9, -12 - wv * 0.5); }
  else if (pose === 'run') { arm(1, 7, -12 + lk); arm(-1, -7, -12 - lk); }
  else { arm(1, 6.5, -9); arm(-1, -6.5, -9); }
  // head
  const hy = pose === 'sulk' ? -19 : -21;
  fill(SKETCH.ell(0, hy, 6, 5.6, 14), '#e9e0cc'); fill(SKETCH.ell(2, hy + 1.5, 4, 3.6, 12), '#c9bca4', 0.55);
  d.stroke(SKETCH.ell(0, hy, 6, 5.6, 14, 0, -0.2, 6.1), { w: 1.2, col: ink, curve: true, c: [0, hy] });
  // eyes (buttons), brows by mood
  const shut = (o.blink || 0) > 0;
  for (const ex of [-0.6, 3]) {
    if (shut || pose === 'sulk') d.stroke([[ex - 1.2, hy - 0.6], [ex + 1.2, hy - 0.6]], { w: 0.9, col: ink, sh: 0 });
    else { fill(SKETCH.ell(ex, hy - 0.8, 1.2, 1.4, 8), ink); fill(SKETCH.ell(ex - 0.3, hy - 1.2, 0.4, 0.4, 5), '#fff'); }
  }
  const cross = pose !== 'cheer' && pose !== 'wave' && o.mood !== 'happy';
  if (cross) { d.stroke([[-2, hy - 3.6], [0.4, hy - 2.6]], { w: 0.9, col: ink, sh: 0 }); d.stroke([[2, hy - 2.6], [4.4, hy - 3.6]], { w: 0.9, col: ink, sh: 0 }); }
  // a bristly moustache and a mouth
  d.stroke([[-0.4, hy + 2.2], [1.4, hy + 1.6], [3.4, hy + 2.4]], { w: 1.3, col: ink, curve: true, sh: 0 });
  if (o.shout || pose === 'shout' || pose === 'gasp') fill(SKETCH.ell(1.6, hy + 3.8, 1.3, pose === 'gasp' ? 1.6 : 1.1, 8), ink);
  else if (pose === 'cheer' || pose === 'wave' || o.mood === 'happy') d.stroke([[0.2, hy + 3.4], [1.6, hy + 4.2], [3, hy + 3.4]], { w: 0.8, col: ink, curve: true, sh: 0 });
  // the cap
  const cap = [[-5.5, hy - 3.4], [-4.6, hy - 7.2], [3.6, hy - 7.4], [5.2, hy - 3.6]];
  fill(cap, P.rust); fill([[-1, hy - 3.6], [9, hy - 3.2], [8.6, hy - 2.2], [-1, hy - 2.6]], '#5a3a2a');
  d.outline(cap, { w: 1, col: ink, corner: 40 });
  fill(SKETCH.ell(-0.4, hy - 7.4, 1.2, 0.9, 6), P.core);
  // the brass megaphone
  if (mega) {
    const mx = 7, my = hy + 2, ang = pose === 'point' ? -0.2 : -0.05;
    g.save(); g.translate(mx, my); g.rotate(ang);
    const cone = [[0, -1.6], [11, -5], [11.8, 0], [11, 5], [0, 1.6]];
    fill(cone, P.core); fill([[3, 0.4], [11, 2], [11, 5], [0, 1.6]], P.ochreDeep, 0.6);
    d.outline(cone, { w: 1, col: ink, corner: 30 });
    d.stroke(SKETCH.ell(11.4, 0, 1.4, 5, 10), { w: 0.9, col: ink, curve: true, sh: 0 });
    g.restore();
  }
  g.restore();
}
// Tick where he stands in the world (st.tick), world coords
function ironTickDrawAt(st) {
  const c = st.tick;
  if (c.hidden || c.ride >= 0) return;
  ironTickDraw(ctx, c.x, c.y, { pose: c.pose, face: c.face, s: c.s, dark: ironDark(st), t: c.t, key: c.key, shout: c.shoutT > 0, blink: c.blink, mood: c.mood });
}

/* --- drawing: the HUD (drawn in the style; readable first) --- */
// a paper pill with the game's font (longer lines: news, hints, the megaphone), cached by its size
function ironPillBg(g, x, y, w, h, o = {}) {
  const bw = Math.ceil(w / 8) * 8, bh = Math.ceil(h / 2) * 2;
  const key = 'iron:pill:' + bw + 'x' + bh + ':' + (o.gold ? 'g' : o.col || 'p') + ':' + (o.ring || '');
  if (!SKETCH.has(key)) SKETCH.sheet(key, bw + 10, bh + 10, d => {
    const W2 = bw, H2 = bh, r = Math.min(H2 / 2, 18);
    const box = [];
    for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 - i / 6 * Math.PI; box.push([5 + r + Math.cos(a) * r, 5 + H2 / 2 + Math.sin(a) * (H2 / 2)]); }
    box.push([5 + W2 * 0.5, 5 + H2 + 0.6]);
    for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 - i / 6 * Math.PI; box.push([5 + W2 - r + Math.cos(a) * r, 5 + H2 / 2 + Math.sin(a) * (H2 / 2)]); }
    box.push([5 + W2 * 0.5, 4.4]);
    const gg = d.ctx('wash'); gg.fillStyle = o.gold ? '#fff1bf' : o.col || '#f6ecd4'; gg.globalAlpha = 0.95;
    gg.beginPath(); box.forEach((p, i) => (i ? gg.lineTo(p[0], p[1]) : gg.moveTo(p[0], p[1]))); gg.closePath(); gg.fill(); gg.globalAlpha = 1;
    d.outline(box, { curve: true, w: o.gold ? 2.2 : 1.7, c: [5 + W2 / 2, 5 + H2 / 2], col: o.ring || (o.gold ? '#a77812' : SKETCH.INK), corner: 70 });
  }, { versions: 3, seed: 1200 + bw + bh });
  SKETCH.blit(g, key, x - 5, y - 5, { alpha: o.alpha });
}
function ironTextPill(g, cx, y, text, fs, o = {}) {
  g.font = ironFont(fs);
  const w = Math.min(g.measureText(text).width + 30, W - 24), h = fs + 14, x = clamp(cx - w / 2, 8, W - 8 - w);
  ironPillBg(g, x, y, w, h, o);
  g.save(); if (o.alpha != null) g.globalAlpha *= o.alpha;
  text_(g, text, x + w / 2, y + h / 2 + 1, fs, o.ink || (o.gold ? '#7a520a' : SKETCH.INK));
  g.restore();
  return { x0: x, x1: x + w, y0: y, y1: y + h };
}
function text_(g, s, x, y, fs, col) { g.font = ironFont(fs); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(s, x, y); }
function ironHud(st) {
  const ph = ironPh(st), big = ironBig(), z = big ? 1.35 : 1, end = st.cut && st.cut.kind === 'end', cut = st.cut && st.cut.kind === 'leave' ? st.cut : null;
  // the page turn between parts (under the HUD)
  if (cut) ironDrawPageTurn(st, cut);
  else if (st.arriveT > 0) ironDrawArrive(st);
  if (end) { ironEndHud(st); return; }
  // the strip and the pills (they fade while a hero is under them)
  const fadeL = ironUnder(0, 0, 250 * z, 70 * z) ? 0.35 : 1, fadeR = ironUnder(W - 230 * z, 0, W, 76 * z) ? 0.35 : 1;
  ctx.save();
  if (z !== 1) { ctx.translate(0, 0); ctx.scale(z, z); }
  IRON_HUD.draw(ctx, { part: st.phaseNo, cores: st.cores, time: G.time, clangs: ironClangN(st), rivets: st.rivets.reduce((a, b) => a + b, 0), rivetsMax: IRON_RIVETS, dark: ironDark(st), fade: [fadeL, fadeR], z, versus: st.part.versus });
  ctx.restore();
  let y = 8;
  const extra = ironCall(ph, 'hudText', st);
  if (extra) { const r = ironTextPill(ctx, W / 2, y, extra, Math.round(13 * z), { alpha: ironUnder(W / 2 - 120, 0, W / 2 + 120, 40 * z) ? 0.4 : 1 }); y = r.y1 + 4; }
  // the news line
  const n = st.news;
  let newsBox = null;
  if (n && G.introT <= 0) {
    const a = clamp(Math.min(n.t / 0.15, (n.life - n.t) / 0.3), 0, 1);
    newsBox = ironTextPill(ctx, W / 2, y, n.text, Math.round(14 * z), { gold: n.gold, alpha: a });
    y = newsBox.y1 + 4;
  }
  // the checkpoint line
  if (st.cpNote && (G.introT <= 0 || G.mode === 'play')) {
    const c = st.cpNote, a = G.introT > 0 ? clamp(G.introT / 0.5, 0, 1) : clamp((c.life - c.t) / 0.3, 0, 1);
    const yy = G.introT > 0 ? 168 + 128 : y;
    const r = ironTextPill(ctx, W / 2, yy, c.text, Math.round(13 * z), { gold: true, alpha: a });
    if (G.introT <= 0) y = r.y1 + 4;
  }
  // Tick's megaphone line (or the caption)
  if (st.say && G.introT <= 0) ironDrawSay(st, y, z);
  if (!end) ironCall(ph, 'hud', st);
  ironAtView(st, () => ironDrawHeads(st, z));
  if (st.swapT > 0 && G.introT <= 0) {
    const k = 1 - st.swapT / IRON.swapT, a = clamp(st.swapT / 0.4, 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    SKETCH.live(ctx, 333, SKETCH.boil()).word('SWAP JOBS!', W / 2, 160, (30 + Math.min(1, k * 6) * 6) * z, { align: 'center', fill: SKETCH.PAL.core, col: ironDark(st) ? SKETCH.CHALK : SKETCH.INK, w: 3.4, rot: -0.04 });
    ctx.restore();
  }
  if (st.idle && !st.cut) ironTextPill(ctx, W / 2, H - 52 * z, 'The Colossus is winding down... press anything to wind it up', Math.round(13 * z), { alpha: 0.95 });
}
// Tick's line: a brass megaphone bubble by Tick (or top centre), jagged letters; a caption pill in Parts 1-2
function ironDrawSay(st, y, z) {
  const s = st.say, a = clamp(Math.min(s.t / 0.12, (s.life - s.t) / 0.25), 0, 1);
  if (s.caption) { ironTextPill(ctx, W / 2, y + 2, s.text, Math.round(15 * z), { alpha: a, col: '#f4ead2' }); return; }
  const fs = Math.round(15 * z);
  ctx.font = ironFont(fs);
  const tw = Math.min(ctx.measureText(s.text).width + 34, W - 120), th = fs + 16;
  const x = clamp(W / 2 - tw / 2 + 24, 64, W - tw - 10), yy = y + 4;
  ctx.save(); ctx.globalAlpha *= a;
  // the megaphone cone pointing at the bubble
  const d = SKETCH.live(ctx, 4100, SKETCH.boil());
  const mx = x - 46, my = yy + th / 2;
  const cone = [[mx, my - 4], [mx + 34, my - 15], [mx + 36, my], [mx + 34, my + 15], [mx, my + 4]];
  ctx.fillStyle = SKETCH.PAL.core; ctx.beginPath(); cone.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
  d.outline(cone, { w: 1.6, col: SKETCH.INK, corner: 30 });
  for (let i = 0; i < 3; i++) d.stroke([[mx + 40 + i * 2, my - 10 + i * 10], [mx + 44 + i * 2, my - 12 + i * 12]], { w: 1.2, col: SKETCH.INK, sh: 0 });
  ironPillBg(ctx, x, yy, tw, th, { col: '#fbf1d6', ring: '#7a520a' });
  // jagged letters: each word a hair up or down
  ctx.font = ironFont(fs); ctx.textBaseline = 'middle'; ctx.fillStyle = '#3a2416'; ctx.textAlign = 'left';
  let cx0 = x + 17;
  const words = s.text.split(' ');
  const total = words.reduce((w, q) => w + ctx.measureText(q + ' ').width, 0), sc = Math.min(1, (tw - 34) / total);
  ctx.save(); ctx.translate(cx0, yy + th / 2 + 1); ctx.scale(sc, 1);
  let wx = 0;
  words.forEach((q, i) => { ctx.save(); ctx.translate(wx, ((i * 37) % 5 - 2) * 0.6); ctx.rotate(((i * 13) % 5 - 2) * 0.012); ctx.fillText(q, 0, 0); ctx.restore(); wx += ctx.measureText(q + ' ').width; });
  ctx.restore();
  ctx.restore();
}
// hints and job badges over the heroes' heads
function ironDrawHeads(st, z) {
  if (G.introT > 0) return;
  const roles = st.badgeT > 0 && !st.cut ? ironCall(ironPh(st), 'roles', st) : null, placed = [];
  for (const p of G.players) {
    if (!p.alive) continue;
    let top = p.y - 10 - ironHeadLift(st, p);
    const cpuBubble = typeof cpuSolo === 'function' && cpuSolo() && cpuOn(p.id) && CPU.bubbles && CPU.bubbles[p.id] && CPU.bubbles[p.id].t > 0;
    if (roles && roles[p.id]) {
      const fs = Math.round(12 * z), a = clamp(st.badgeT / 0.4, 0, 1);
      ctx.font = ironFont(fs);
      const bw = ctx.measureText(roles[p.id]).width + 18, bh = fs + 10;
      const bx = clamp(p.x + p.w / 2 - bw / 2, 4, W - bw - 4), by = Math.max(4, top - bh - (cpuBubble ? 28 * z : 0));
      ironPillBg(ctx, bx, by, bw, bh, { col: PCOL[p.id], ring: '#2a1c14', alpha: a });
      ctx.save(); ctx.globalAlpha *= a; text_(ctx, roles[p.id], bx + bw / 2, by + bh / 2 + 1, fs, '#ffffff'); ctx.restore();
      top = by - 4;
    }
    const h = st.hints[p.id];
    if (!h || cpuBubble) continue;
    const a = clamp(Math.min(h.t, h.life - h.t) / 0.2, 0, 1), fs = Math.round(12 * z);
    ctx.font = ironFont(fs);
    const tw = ctx.measureText(h.text).width + 22, th = fs + 12;
    let x = clamp(p.x + p.w / 2 - tw / 2, 4, W - tw - 4), yy = top - th - 6;
    if (yy < 74 * z) yy = p.y + p.h + 10;
    // the two heroes close together: stack the second hint above the first rather than over it
    for (const b of placed) if (x < b.x + b.w + 4 && b.x < x + tw + 4 && yy < b.y + b.h + 4 && b.y < yy + th + 4) yy = b.y - th - 6;
    placed.push({ x, y: yy, w: tw, h: th });
    ironPillBg(ctx, x, yy, tw, th, { gold: h.gold, ring: h.gold ? '#a77812' : PCOL[p.id], alpha: a });
    ctx.save(); ctx.globalAlpha *= a; text_(ctx, h.text, x + tw / 2, yy + th / 2 + 1, fs, h.gold ? '#7a520a' : SKETCH.INK); ctx.restore();
  }
}
// the page turn: a fresh sheet of paper slides in from the right with a curled edge, lettered "PART N", then the next
// part's page slides away to the left (ironDrawArrive)
function ironDrawPageTurn(st, c) {
  const k = clamp((c.t - 1.6) / 1.2, 0, 1), e = k * k * (3 - 2 * k);
  if (e <= 0) return;
  const x = W * (1 - e);
  ironDrawPage(st, x, Math.min(1, e * 1.4), IRON_ORDER[Math.min(IRON_ORDER.length - 1, st.phaseNo + 1)], c.t > 2.6 ? clamp((c.t - 2.6) / 0.4, 0, 1) : 0);
}
function ironDrawArrive(st) {
  const k = 1 - st.arriveT / IRON.arriveT, e = k * k;
  ironDrawPage(st, -W * e, 1, st.phase, 1 - k);
}
function ironDrawPage(st, x, curl, phase, la) {
  const pk = IRON_PARTS[phase] && IRON_PARTS[phase].paper === 'dark' ? 'dark' : 'sand';
  ctx.save(); ctx.beginPath(); ctx.rect(x, 0, W + 40, H); ctx.clip();
  ctx.translate(x, 0); SKETCH.paper(ctx, pk); ctx.restore();
  const d = SKETCH.live(ctx, 2200, SKETCH.boil()), ink = pk === 'dark' ? SKETCH.CHALK : SKETCH.INK;
  // the curled edge: a shaded curve down the left side of the sheet
  const cw = 26 * curl;
  ctx.save(); ctx.fillStyle = 'rgba(40,28,18,0.22)'; ctx.fillRect(x - 10, 0, 10, H); ctx.restore();
  d.stroke([[x, -4], [x - cw * 0.3, H * 0.4], [x - cw, H + 4]], { w: 2.4, col: ink, curve: true });
  d.hatch([[x, 0], [x + 14, 0], [x + 14 - cw * 0.4, H], [x - cw, H]], { a: 80, gap: 2.4, w: 0.6, alpha: 0.5, force: true, col: ink });
  if (la > 0 && IRON_PARTS[phase]) {
    ctx.save(); ctx.globalAlpha = la;
    const n = IRON_ORDER.indexOf(phase) + 1;
    d.word('PART ' + n, x + W / 2, H / 2 - 30, 30, { align: 'center', col: ink, w: 3 });
    d.word(IRON_PARTS[phase].title.toUpperCase(), x + W / 2, H / 2 + 22, 40, { align: 'center', col: ink, fill: SKETCH.PAL.core, w: 4, rot: -0.03 });
    ctx.restore();
  }
}

/* --- the ending (the core owns the screen; the thumbs part draws the scene when it is loaded) --- */
function ironDrawEnd(st) {
  if (typeof IRON_END.draw === 'function') { IRON_END.draw(st); return; }
  SKETCH.paper(ctx, 'dawn');
  const d = SKETCH.live(ctx, 9, SKETCH.boil());
  d.word('THE END', W / 2, H / 2, 48, { align: 'center', fill: SKETCH.PAL.core, w: 4 });
  G.players.forEach((p, k) => SKETCH.hero(ctx, p, { force: true, x: W / 2 + (k ? 60 : -60), y: 420, mood: 'joy' }));
}
function ironEndHud(st) {
  if (st.say) ironDrawSay(st, 14, ironBig() ? 1.35 : 1);
  const d = SKETCH.live(ctx, 13, SKETCH.boil());
  for (const f of st.cut.flecks) { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.r); d.stroke([[-3, 0], [0, -1], [3, 0.5]], { w: 2.4, col: f.col, sh: 0 }); ctx.restore(); }
}

/* --- sounds (the shared kit sounds; parts add their own) --- */
// a Clang: a comic gong, soft
Sfx.extra.ironClang = function (p) { this.tone(392 * p, 0.5, 'triangle', 0.05, 380 * p); this.tone(588 * p, 0.35, 'sine', 0.025, 560 * p, 0.01); this.noise(0.12, { f: 2400, q: 2, vol: 0.02 }); };
Sfx.extra.ironPopBack = function () { this.tone(300, 0.12, 'sine', 0.04, 700); };
Sfx.extra.ironRivetTing = function (p, n) { const f = 1320 * Math.pow(1.06, (n || 1) - 1); this.tone(f, 0.08, 'triangle', 0.045); this.tone(f * 1.5, 0.14, 'sine', 0.025, null, 0.05); };
Sfx.extra.ironGoldHelp = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.ironSwapJobs = function () { [523, 784, 659, 988].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.045, null, i * 0.07)); this.noise(0.12, { f: 3000, q: 1, vol: 0.012, delay: 0.1 }); };
// Tick's tune on bells (a part cleared)
Sfx.extra.ironPartClear = function () { [659, 784, 880, 784, 1047].forEach((f, i) => { this.tone(f, 0.22, 'sine', 0.045, null, i * 0.11); this.tone(f * 2, 0.12, 'triangle', 0.015, null, i * 0.11); }); };
// the megaphone: a brassy squawk and a gabble
Sfx.extra.ironMegaphone = function () { this.tone(520, 0.08, 'sawtooth', 0.02, 760); for (let k = 0; k < 4; k++) this.tone(620 + Math.random() * 300, 0.05, 'square', 0.012, null, 0.1 + k * 0.06); };
// paper: a scratch of pencil, a rub of eraser, a page flap
Sfx.extra.ironPencilScratch = function () { this.noise(0.18, { type: 'highpass', f: 3800, vol: 0.02, a: 0.03 }); this.noise(0.1, { type: 'highpass', f: 5200, vol: 0.015, delay: 0.12 }); };
Sfx.extra.ironEraserRub = function () { for (let k = 0; k < 3; k++) this.noise(0.12, { f: 900, q: 0.6, vol: 0.025, delay: k * 0.1 }); };
Sfx.extra.ironPaperFlap = function () { this.noise(0.25, { f: 1400, to: 500, q: 0.7, vol: 0.035, a: 0.02 }); this.tone(140, 0.12, 'sine', 0.03, 90, 0.18); };
Sfx.extra.ironKeyWind = function () { for (let k = 0; k < 5; k++) this.tone(1500 + k * 60, 0.03, 'square', 0.02, null, k * 0.07); };
Sfx.extra.ironKeyUnwind = function () { for (let k = 0; k < 6; k++) this.tone(1700 - k * 110, 0.035, 'square', 0.018, null, k * 0.1 + k * k * 0.01); };
Sfx.extra.ironStompTell = function () { this.tone(60, 1.1, 'sawtooth', 0.025, 110); this.noise(1.0, { type: 'lowpass', f: 300, to: 700, vol: 0.03, a: 0.6 }); };
Sfx.extra.ironStomp = function () { this.tone(70, 0.5, 'sine', 0.12, 32); this.noise(0.5, { type: 'lowpass', f: 400, to: 90, vol: 0.09, a: 0.004 }); for (let k = 0; k < 4; k++) this.tone(900 + k * 230, 0.05, 'square', 0.012, null, 0.06 + k * 0.05); };
Sfx.extra.ironBoost = function (p) { this.tone(260 * p, 0.14, 'triangle', 0.04, 700 * p); };
Sfx.extra.ironHandUp = function () { this.tone(330, 0.12, 'triangle', 0.035, 520); };
Sfx.extra.ironHandClasp = function () { this.tone(220, 0.05, 'square', 0.03); this.noise(0.05, { f: 2000, vol: 0.02 }); };
Sfx.extra.ironCrowning = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.05, null, i * 0.09)); };

/* ===== STUB PHASES (a part with no file yet: walk right together to the flag) ===== */
const IRON_STUBS = {};
function ironMakeStub(phase) {
  const vs = IRON_PARTS[phase].versus;
  return {
    stub: true,
    setup(st) {
      const ph = st.ph; ph.goal = 800; ph.inT = 0; ph.won = -1; ph.t = 0;
      ph.solids = [{ x0: -40, y0: 440, x1: 1000, y1: 520 }, { x0: -40, y0: -400, x1: 0, y1: 520 }, { x0: 960, y0: -400, x1: 1000, y1: 520 }];
      G.players.forEach((p, k) => Object.assign(p, { x: 100 + k * 50, y: 440 - p.h, vx: 0, vy: 0, face: 1 }));
    },
    step(st, dt) {
      const ph = st.ph, ps = G.players;
      if (st.idle) { ironCoast(st, dt, ph.solids); return; }
      for (const p of ps) ironBody(p, dt, ph.solids, { partner: true });
      if (vs) {
        if (ph.won < 0) {
          const done = ps.filter(p => p.alive && p.x + p.w / 2 >= ph.goal);
          if (done.length) { ph.won = done[0].id; const s = ironStats(st); s.wins = [ph.won === 0 ? 2 : 0, ph.won === 1 ? 2 : 0]; s.champ = ph.won; }
        } else if ((ph.t += dt) > 1.2) ironPhaseDone(st, {});
        return;
      }
      ph.inT = ps.every(p => p.alive && p.x + p.w / 2 > ph.goal) ? ph.inT + dt : 0;
      if (ph.inT > 0.5) ironPhaseDone(st, { core: !!IRON_PARTS[phase].core });
    },
    drawBack(st) {
      ironScreen(st, () => SKETCH.paper(ctx, st.part.paper));
      ironDrawFlag(st.ph.goal + 30, 440, true, { dark: ironDark(st) });
      const d = SKETCH.live(ctx, 3, 0);
      d.stroke([[0, 440], [960, 442]], { w: 3, col: ironDark(st) ? SKETCH.CHALK : SKETCH.INK });
      d.word(st.part.title.toUpperCase() + ' (COMING SOON)', 480, 200, 22, { align: 'center', col: ironDark(st) ? SKETCH.CHALK : SKETCH.INK });
    },
    roles: () => (vs ? ['Race!', 'Race!'] : ['Go!', 'Go!']),
    statLine(st) { if (!vs) return ''; const s = st.stats.thumbs; return s && s.champ != null && s.champ >= 0 ? 'Thumb champ: ' + NAMES[s.champ] : ''; },
  };
}
for (const k of IRON_ORDER) IRON_STUBS[k] = ironMakeStub(k);
Object.assign(IRON_PHASES, IRON_STUBS);

/* ===== TEST HOOK (bots: window.__pipbo.MODES.colossus.test) ===== */
MODES.colossus.test = {
  IRON, IRON_PHASES, IRON_STUBS, IRON_ORDER, IRON_PARTS,
  index: ironLevelIndex,
  seed(n) { MODES.colossus.rand = n == null ? Math.random : ironSeeded(n); },
  jump(k = 0, o = {}) {
    const i = ironLevelIndex();
    if (typeof k === 'string') k = Math.max(0, IRON_ORDER.indexOf(k));
    if (o.seed != null) this.seed(o.seed);
    const was = MODES.colossus.cpOn, man = G.manual;
    MODES.colossus.cpOn = false; G.manual = true;
    try { loadLevel(i); if (k > 0) { G.room = k - 1; nextRoom(); } } finally { MODES.colossus.cpOn = was; G.manual = man; }
    if (!o.intro) { G.introT = 0; G.mst.arriveT = 0; }
    return G.mst;
  },
  stub: ph => !!(IRON_PHASES[ph] && IRON_PHASES[ph].stub),
  st: () => G.mst, ph: () => G.mst.ph, phase: () => G.mst.phase, calm: () => ironCalm(G.mst),
  done: o => ironPhaseDone(G.mst, o), ending: () => ironEnding(G.mst),
  clang: (id, o) => ironClang(G.mst, G.players[id], o), bump: o => ironTeamClang(G.mst, o),
  cp(on) { MODES.colossus.cpOn = !!on; }, cpGet: ironCpGet, cpClear: ironCpClear,
};
