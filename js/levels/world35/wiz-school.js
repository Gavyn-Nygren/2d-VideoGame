/* Pip & Bo - Level 35-1 Moonwick Academy (World 35 Wizard Academy, one long team level): the core. */
'use strict';

/* ===== 35-1 Moonwick Academy (mode 'wizschool', team) ===================================================
   Gavyn's idea (Nov 2026): "one long level of learning to become a wizard". Pip and Bo arrive at MOONWICK ACADEMY, a
   crooked old wizard school on a floating island, as first-years, take ten classes (one spell each), sit the final
   exam (a spell goes wrong and wakes the Blot, a huge ink monster) and graduate with a friendly duel for Top of the
   Class. ONE level, 12 rooms ("classes"), each about 2 minutes for a good pair (the exam and the duel about 3): the
   core keeps a CHECKPOINT at the start of every class (in the browser too) and every class keeps mid-class safe spots.
   Built like 30-1 The Time Thief (read its header): the same phase contract, renamed tth -> wiz.
   Everything is original (Gavyn's hard rule): no names, creatures, spell words, houses, sports or looks from any
   existing wizard story. Spells have plain names (Zoom, Lift, Brew, Glow...).
   Thrills are welcome (not a game for toddlers: the cellars are dark, the Blot is creepy), but nobody is ever hurt:
   every fail is a soft fail, a counted "Oops!" (a fizzle) with a short pop-back.

   HEADMISTRESS THIMBLEWICK (st.hm) plays the part the Time Thief plays in 30-1: a tiny, very old wizard who never leaves
   her floating patchwork armchair, with a hat taller than she is and a teacup that refills itself. She flies ahead,
   talks in a speech bubble, announces each class, jokes when you fail and hands out the stars. Kind but dry.
   Pip and Bo wear first-year robes (Pip's trimmed orange, Bo's blue), floppy pointed hats and carry stubby wands. Every
   class won adds a star in that class's spell colour to both hats (wizDrawOutfit draws them all level long).

   CLASSES, in order (phase key: title, spell, scrolls):
     broom       Broom Flying                Zoom (sky blue)             right
     lift        Levitation                  Lift (violet)               up
     cauldron    Runaway Cauldron            Brew (green)                right, downhill
     glow        Light Spell                 Glow (yellow)               right, dark
     morph       Shape Shifting              Morph (pink)                right
     size        Shrink and Grow             Shrink / Grow (teal)        right
     frostflame  Frost and Flame             Frost / Flame (ice, orange) right
     shield      Shield Charm                Shield (gold)               right
     portal      Portal Class                Door (indigo)               up
     beast       Beast Taming                Tame (cloud grey)           right
     exam        Final Exam: The Big Mistake all of them (the Blot)      right, then an arena
     duel        Graduation Duel             versus, best of 3           a fixed arena

   FILES. This file is the CORE: the world and level entries, MODES.wizschool, the WIZ_PHASES registry (with a working
   stub per class), Thimblewick's drawing and poses, the spell kit (colours, icons, rings, sounds), the hats, soft fails,
   badges and job swaps, news / hint / speech bubbles, per-role act labels, gold help, the idle wait, class changes (the
   school-bell cutscene), checkpoints, the HUD, the ending, stats and the test hook. Each class lives in its own file and
   REPLACES its stub by assigning WIZ_PHASES.<phase> = { ... }:
     js/levels/world35/wiz-broom.js  wiz-lift.js  wiz-cauldron.js  wiz-glow.js  wiz-morph.js  wiz-size.js
                       wiz-frostflame.js  wiz-shield.js  wiz-portal.js  wiz-beast.js  wiz-exam.js  wiz-duel.js
     js/cpu/levels/world35/wiz-school.js (core brain, WIZ_BRAINS, stub brains)   then one brain file per class
   If a class file is missing or throws before its assignment, the stub keeps the level playable. Every top-level name
   starts with wiz / WIZ (a class file uses wiz<Class> / WIZ<CLASS>, e.g. wizBroom* / WIZBROOM*); every Sfx.extra
   sound with 'wiz'.

   =================================================== PHASE CONTRACT ===================================================
   As in 30-1 (time-thief.js), with these names: wizRoom(phase, fields), st.ph, st.phase, st.phaseNo (0..11), st.phT,
   st.cls (WIZ_CLASSES[st.phase]: { title, spell, spellName, col, where }), st.hm (Thimblewick), st.cam, st.stars (12
   booleans: the 10 spells, the exam seal, the duel trophy), st.idle, st.cut, st.celebT, st.stats ({ oops: [pip, bo],
   team, kinds, help, phaseT, <phase>: {} }), st.safe, st.warn.
   HOOKS of WIZ_PHASES.<phase>: setup step wait coast drawBack draw drawTop hide hud hudText progress labels legend roles
   busy present headLift onBonk onKill onRespawn bubblePos stat statLine, and one more:
     plan(st)          -> [pip, bo]: per player { x, y (world coords, optional), hold: 'act'|'up'|..., tap, why }: what
                       that player should be doing right now. The hint bubbles, the HUD and the brain all read it, so
                       the computer partner and the prompts never disagree (Moonwick rule 5).
   ROOM FIELDS as in 30-1 (title, phase, tip, act, legend, map, theme, look, first).

   HELPERS (inside the tick unless noted) — the 30-1 ones renamed, plus:
     Phase flow  wizPhaseDone(st, { say, got })  the class is won: the spell's star flies from Thimblewick's wand to
                 both hats and its strip slot ("Spell learned: Zoom!"), the school bell rings, the corridor doors close,
                 the next class starts after WIZ.leaveT s. got (default true) false skips the star.
     Talk        wizSay(st, text, life)  her bubble.  wizNews  wizHint  wizKey  wizPop  wizWarn  (as in 30-1)
     Jobs        wizSwap(st)  wizShowBadges(st, s)  wizActLabels(st)
     Soft fails  wizOops(st, p, o) = wizBonk with "Oops!" (a fizzle sound): o as tthBonk's ({ kind, word, fromX, to,
                 safe, still, at }).   wizTeamOops(st, o) a team soft fail (= tthBump).
     Gold help   wizHelp(st, text, o)  gold news + chime.   wizMiss(st, part) -> the Oops count of that part of the
                 section so far (+1); wizGoldOnce(st, key, text, o) -> true the first time (gives the help). The rule:
                 after WIZ.goldAfter (3) Oops inside one part of a section, an announced gold helper.
     Flags       wizDrawFlag(x, groundY, lit, col)  a mid-class safe-spot banner (world coords).
     Players     wizPlatform  wizControl  wizCoast  wizGroundY  wizScreen  wizHumanIds  wizUp (as in 30-1)
                 wizDrawHero(id, x, y, o)  Pip or Bo WITH robe, hat and wand (o.noHat, o.noRobe, o.wand: false).
                 wizDrawOutfit(id, x, y, w, h, o)  just the robe, hat and wand over a body drawn elsewhere.
     Spell kit   WIZ_SPELLS[key] = { name, col, dark, glow }   wizSpellRing(x, y, r, key, t, a)  a spell-coloured
                 ring of sparks.   wizSparks(x, y, key, n)  a puff of sparks.   wizWandTip(p) -> { x, y } (screen when
                 between ticks, world inside).   wizDrawStar(x, y, r, col, o)   wizDrawSpellIcon(key, x, y, r)
                 wizCastSound(key)  the spell's chime (the same in the class and in the exam).
     Random      wizRand() (all gameplay randomness; tests seed it). No Math.random in gameplay.
   STATS. Results card: Time, Record (framework), Oops; then "Spells learned 10/10", the duel line and the closing
   line. Medal (MODES.wizschool.medals from WIZ.medal, js/medals.js) by play time (G.time; it stops while she waits
   for an away person) and Oops.
   CHECKPOINTS as in 30-1 (store key 'wiz:cp'; World 30's 'tth:cp' is never touched).
   TEST HOOK. window.__pipbo.MODES.wizschool.test: jump(k, { seed, intro }), st(), ph(), phase(), calm(), done(o),
   ending(), bonk(id, o), seed(n), index(), stub(phase), cp(on), cpGet(), cpClear().
     node tools/w35/play.js <phase|all> [--who=pair|noisy|idle|kid] [--seeds=1,2,3] [--max=600] [--trace=5]
     node tools/w35/shot.js <phase> <seconds> out.png [--who=pair|idle] [--phone] [--solo=0|1]
     node tools/w35/stuck.js <phase|all> [--human=lag,eager,slow]
     node tools/cpu-test.js 35-1 --who=pair   (the computer plays both; the whole level must clear)
   ====================================================================================================================== */

const WIZ = {
  introHold: 0.6,              // phase.step waits while G.introT is above this (the room card)
  idleAfter: 12,               // s with no input from any person: Thimblewick sips her tea (no hazards, the clock stops)
  celebT: 1.6, leaveT: 4.6,    // calm after a big moment; the school-bell cutscene between classes
  badgeT: 5, swapT: 2.2, hintLife: 3, newsLife: 3.2, sayLife: 2.6, arriveT: 1.1,
  bonk: { vx: 230, vy: 300, stun: 0.7, slide: 0.3, safe: 1.4, popV: 320 },
  goldAfter: 3,                // Oops inside one part of a section before its gold helper
  // the trophy: play time (s, idle waits not counted) and Oops (players' and the team's; duel hits are no Oops).
  // Tuned from bot runs (see GAME_NOTES): Gold about 1.25x the computer pair's time, Silver about 1.9x.
  medal: { gold: { t: 1400, oops: 20 }, silver: { t: 2100, oops: 60 } },   // (computer pair about 1120 s, 0 Oops; noisy pair 1400-1560 s, about 14)
  hm: { s: 0.9 },
  endT: 9.2,                   // the ending, then levelClear()
  endGround: 456,
  cpKey: 'wiz:cp', cpV: 1,     // the checkpoint's store key and its version (another version is dropped)
  cpEvery: 2,                  // s of play between two saves of the clock and the Oops into the checkpoint
  cpNoteLife: 6,               // s of play the "Checkpoint: Class N" line stays after a resume
  askOverMs: 700,              // "Start over from Class 1" asks first; a second press sooner than this is a double tap
};
const WIZ_ORDER = ['broom', 'lift', 'cauldron', 'glow', 'morph', 'size', 'frostflame', 'shield', 'portal', 'beast', 'exam', 'duel'];
// the spells: one colour, icon and chime each, the same in the class, on the hats, on the strip and in the exam
const WIZ_SPELLS = {
  zoom:   { name: 'Zoom',   col: '#7fd0ff', dark: '#2f86c0', glow: 'rgba(127,208,255,0.45)' },
  lift:   { name: 'Lift',   col: '#b58cff', dark: '#6b45c2', glow: 'rgba(181,140,255,0.45)' },
  brew:   { name: 'Brew',   col: '#7ee07a', dark: '#2f9a3c', glow: 'rgba(126,224,122,0.45)' },
  glow:   { name: 'Glow',   col: '#ffe066', dark: '#c79a12', glow: 'rgba(255,224,102,0.5)' },
  morph:  { name: 'Morph',  col: '#ff8fd0', dark: '#c2408c', glow: 'rgba(255,143,208,0.45)' },
  size:   { name: 'Shrink and Grow', col: '#4fd1c5', dark: '#1e8a80', glow: 'rgba(79,209,197,0.45)' },
  frost:  { name: 'Frost',  col: '#e6f6ff', dark: '#8fc2e0', glow: 'rgba(200,236,255,0.5)' },
  flame:  { name: 'Flame',  col: '#ff9a3c', dark: '#c2501e', glow: 'rgba(255,154,60,0.5)' },
  shield: { name: 'Shield', col: '#ffc93c', dark: '#b8860b', glow: 'rgba(255,201,60,0.45)' },
  door:   { name: 'Door',   col: '#6f6cff', dark: '#3a36b8', glow: 'rgba(111,108,255,0.45)' },
  tame:   { name: 'Tame',   col: '#c8ccd8', dark: '#7a8094', glow: 'rgba(200,204,216,0.45)' },
};
const WIZ_CLASSES = {
  broom:      { title: 'Broom Flying',     spell: 'zoom',   where: 'The Lawns' },
  lift:       { title: 'Levitation',       spell: 'lift',   where: 'The Library Tower' },
  cauldron:   { title: 'Runaway Cauldron', spell: 'brew',   where: 'The Potion Cellars' },
  glow:       { title: 'Light Spell',      spell: 'glow',   where: 'The Midnight Cellars' },
  morph:      { title: 'Shape Shifting',   spell: 'morph',  where: 'The Obstacle Garden' },
  size:       { title: 'Shrink and Grow',  spell: 'size',   where: 'The Great Storeroom' },
  frostflame: { title: 'Frost and Flame',  spell: 'frostflame', where: 'The Moat and the Greenhouse' },
  shield:     { title: 'Shield Charm',     spell: 'shield', where: 'The Practice Range' },
  portal:     { title: 'Portal Class',     spell: 'door',   where: 'The Clock Tower' },
  beast:      { title: 'Beast Taming',     spell: 'tame',   where: 'The Cloud Paddock' },
  exam:       { title: 'The Big Mistake',  spell: null,     where: 'Final Exam' },
  duel:       { title: 'Graduation Duel',  spell: null,     where: 'Graduation' },
};
for (const k of WIZ_ORDER) {
  const c = WIZ_CLASSES[k], s = c.spell === 'frostflame' ? null : WIZ_SPELLS[c.spell];
  c.spellName = c.spell === 'frostflame' ? 'Frost and Flame' : s ? s.name : '';
  c.col = c.spell === 'frostflame' ? WIZ_SPELLS.flame.col : s ? s.col : k === 'exam' ? '#d9485a' : '#ffd23f';
}
const WIZ_STARN = WIZ_ORDER.length;   // strip slots: 10 spell stars, the exam seal, the duel trophy
const WIZ_PHASES = {};
const WIZ_NONE = { setup() {} };
const wizRand = () => MODES.wizschool.rand();
const wizPh = st => (st && WIZ_PHASES[st.phase]) || WIZ_NONE;
function wizCall(ph, name, ...args) { const f = ph && ph[name]; return typeof f === 'function' ? f.apply(ph, args) : undefined; }
const wizBusy = (st, p) => !!wizCall(wizPh(st), 'busy', st, p);
const wizCalm = st => G.mode !== 'play' || G.introT > 0 || !!st.cut || st.celebT > 0 || !!st.idle;
// the bigger HUD text (news, hints, bubbles, the strip): on phones too (a landscape phone, 844x390, is about 0.67)
const wizBig = () => hudBig() || (typeof stageScale === 'number' && stageScale < 0.75);
const wizFont = px => '700 ' + px + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
const wizLilita = px => '400 ' + px + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
const wizStats = st => st.stats[st.phase] || (st.stats[st.phase] = {});
function wizSeeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const wizLevelIndex = () => LEVELS.findIndex(l => l.mode === 'wizschool');
// how many spell stars the hats carry now
const wizHatStars = st => (st && st.stars ? st.stars.slice(0, 10).filter(Boolean).length : 0);

/* --- World 35 and its one level (added from here, like Worlds 24-32, so it never conflicts with other worlds) --- */
// World index 34: it loads after World 34 (Viking Voyage). Dusk purple sky, a big pale moon, old stone and candlelight.
WORLDS[34] = { name: 'Wizard Academy', blurb: 'One long school day at Moonwick Academy: learn ten spells, then prove it!',
  theme: { skyTop: '#2a1f5c', skyBot: '#8a5aa8', hillFar: '#4a3a7e', hillNear: '#3a2d66', sun: 'rgba(250, 244, 220, 0.98)', sunGlow: 'rgba(220, 200, 255, 0.35)',
    stone: '#6a6488', stoneLight: '#8e88b0', stoneEdge: '#3e3858', grass: '#5fae6a', grassDark: '#3f7f4a', plank: '#9a6a3e', plankDark: '#62401f', rope: '#e8d8b0', ropeDark: '#9a8458' } };
const WIZ_EMPTY_MAP = [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)];
const WIZ_FLOOR_MAP = [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '#'.repeat(32), '#'.repeat(32)];
LEVELS.push(
  // ----- BEGIN 35-1 Moonwick Academy (mode 'wizschool', js/levels/world35/wiz-school.js + wiz-<class>.js) -----
  { name: 'Moonwick Academy', world: 34, kind: 'team', mode: 'wizschool', ownHUD: true, noFalls: true, roomWord: 'Class',
    tip: 'One long school day: ten classes, ten spells, then the final exam. Every class has two jobs!',
    act: { label: 'cast' },
    map: WIZ_FLOOR_MAP,
    rooms: WIZ_ORDER.map((phase, k) => ({ phase, title: WIZ_CLASSES[phase].title, ownStep: true, first: k % 2, act: { label: 'cast' }, map: WIZ_FLOOR_MAP,
      tip: phase === 'duel' ? 'The graduation duel: best of three!' : 'Walk to the classroom door together!' })),
  },
  // ----- END 35-1 Moonwick Academy -----
);

// Class files call this at load time to fill in their own room: Object.assign(room, fields). Returns the room.
function wizRoom(phase, fields) {
  const def = LEVELS[wizLevelIndex()];
  const room = def && def.rooms && def.rooms.find(r => r.phase === phase);
  if (!room) { console.warn('Moonwick Academy: no room with phase ' + phase); return null; }
  return Object.assign(room, fields || {});
}

/* --- talk, news, hints, badges, gold help --- */
function wizSay(st, text, life = WIZ.sayLife) { st.say = { text, t: 0, life }; Sfx.play('wizTalk'); }
function wizNews(st, text, gold = false, life = WIZ.newsLife) { st.news = { text, gold, t: 0, life }; }
// an Oops for one player (the fizzle): as wizBonk, with "Oops!" (o: a word or the wizBonk options)
const wizOops = (st, p, o = {}) => wizBonk(st, p, typeof o === 'string' ? { word: o } : o);
// the Oops count in one part of the section so far, +1 (call it when the Oops happens): the gold-help rule reads it
function wizMiss(st, part) { st.miss[part] = (st.miss[part] || 0) + 1; return st.miss[part]; }
const wizMissN = (st, part) => st.miss[part] || 0;
// the section's gold helper, announced once (-> true the first time). Kept in st.goldGot[key] for the class.
function wizGoldOnce(st, key, text, o = {}) {
  if (st.goldGot[key]) return false;
  st.goldGot[key] = true; wizHelp(st, text, o); return true;
}
const wizHasGold = (st, key) => !!st.goldGot[key];
function wizHelp(st, text, o = {}) {
  wizNews(st, text, true, o.life || 4); Sfx.play('wizGold'); st.stats.help.push(text);
  if (o.id != null && o.hint) wizHint(st, o.id, o.hint, { gold: true, life: o.life || 4 });
}
// a bubble over player id; in 1-player mode the computer's own bubble shows o.cpu (or nothing)
function wizHint(st, id, text, o = {}) {
  if (typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id)) text = o.cpu || null;
  if (text) st.hints[id] = { text, t: 0, life: o.life || WIZ.hintLife, gold: !!o.gold };
}
function wizPop(st, x, y, text, col = C.paper, size = 22) { st.pops.push({ x, y, text, col, size, t: 0 }); }
function wizWarn(st, id, s = 0.8) { st.warn[id] = Math.max(st.warn[id], s); }
function wizShowBadges(st, t = WIZ.badgeT) { st.badgeT = t; }
function wizSwap(st) { st.swapT = WIZ.swapT; st.badgeT = WIZ.badgeT; Sfx.play('wizSwap'); wizActLabels(st); }
function wizCelebrate(st, s = WIZ.celebT) { st.celebT = Math.max(st.celebT, s); }
// the ids people play (both, when the computer plays both: bot tests)
function wizHumanIds() {
  const ids = [0, 1].filter(k => !(typeof cpuOn === 'function' && cpuOn(k)));
  return ids.length ? ids : [0, 1];
}
// each player's own keys, for hint texts (keyboard, controller or touch)
function wizDev(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
function wizKey(id, what) {
  const d = wizDev(id), solo = typeof cpuSolo === 'function' && cpuSolo(), pip = solo || id === 0;
  const kb = { act: pip ? 'F' : '/', jump: pip ? 'W' : '↑', up: pip ? 'W' : '↑', down: pip ? 'S' : '↓', left: pip ? 'A' : '←', right: pip ? 'D' : '→', move: pip ? 'A D' : '← →' };
  if (d === 'pad') return { act: glyph('act'), jump: glyph('a'), up: 'stick up', down: 'stick down', left: 'stick ◀', right: 'stick ▶', move: 'the stick' }[what] || '';
  if (d === 'touch') return { act: 'the round button', jump: '▲', up: '▲', down: '▼', left: '◀', right: '▶', move: '◀ ▶' }[what] || '';
  return kb[what] || '';
}

/* --- Thimblewick: state --- */
// x, y: the bottom centre of her armchair (it floats: nothing under it); s: scale (1 = the chair about 3 tiles tall);
// face 1 looks right; pose: 'idle' 'talk' 'point' 'sip' 'cheer' 'shock' 'laugh' 'wave' 'cast' 'doze' 'wobble'
// (inside the Blot); mood: 'calm' 'happy' 'shocked' 'cross'; hidden, alpha, sayAt { x, y } (screen) when hidden.
function wizNewHm() {
  return { x: 760, y: 220, s: WIZ.hm.s, face: -1, pose: 'idle', mood: 'calm', baseMood: 'calm', moodT: 0, t: 0, hidden: false, alpha: 1,
    look: null, sayAt: null, hitT: 0, blink: 0, blinkT: 2.2, bob: 1, tilt: 0 };
}
function wizHmTick(st, dt) {
  const c = st.hm;
  c.t += dt;
  if (c.hitT > 0) c.hitT = Math.max(0, c.hitT - dt);
  if (c.moodT > 0 && (c.moodT -= dt) <= 0) c.mood = c.baseMood || 'calm';
  c.blink -= dt; c.blinkT -= dt;
  if (c.blinkT <= 0) { c.blink = 0.14; c.blinkT = 2 + ((c.t * 7.3) % 2.6); }
}
function wizReact(st, mood, line, s = 2.2) {
  const c = st.hm;
  c.mood = mood; c.moodT = s;
  if (line) wizSay(st, line, Math.max(1.6, s));
}

/* --- players --- */
// A soft fail for one player: "Oops!" (counted), a knock-back, a pop-back to o.to, or (still) just the count.
function wizBonk(st, p, o = {}) {
  if (!p || st.safe[p.id] > 0 || st.cut || wizBusy(st, p)) return false;
  if (!o.still && !p.alive) return false;
  const B = WIZ.bonk, kind = o.kind || 'oops', word = o.word || 'Oops!';
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  if (o.still) { /* the phase moves its own riders */ }
  else if (o.to) {
    puff(cx, cy, 8, 'rgba(120,110,150,0.85)');
    p.x = o.to.x - p.w / 2; p.y = o.to.y - p.h;
    p.vx = 0; p.vy = -B.popV; p.grounded = false; p.jumping = false; p.offT = 0.05; p.carryVx = 0;
    p.stun = Math.max(p.stun, B.stun * 0.7); p.knockT = 0; p.sx = 0.7; p.sy = 1.3;
  } else {
    const fx = o.fromX != null ? o.fromX : cx - p.face;
    knock(p, (cx >= fx ? 1 : -1) * B.vx, -B.vy, B.stun, B.slide);
  }
  st.safe[p.id] = o.safe != null ? o.safe : B.safe;
  st.stats.oops[p.id]++; st.stats.kinds[kind] = (st.stats.kinds[kind] || 0) + 1;
  st.cpT = 0;   // (an Oops goes into the checkpoint at once: no restart takes it back)
  const ax = o.at ? o.at.x : p.x + p.w / 2, ay = o.at ? o.at.y : p.y - 14;
  wizPop(st, ax, ay, word, '#ffffff', 22);
  Sfx.play('wizBonk', p.id); rumble(p.id, 0.6, 0.4, 160);
  burst(ax, ay + 20, '#ffffff', 8);
  wizCall(wizPh(st), 'onBonk', st, p, kind);
  return true;
}
// A soft fail for the team (the shared vehicle crashed...): counted once; the phase does the consequence.
function wizTeamOops(st, o = {}) {
  if (st.cut || st.teamSafe > 0) return false;
  st.teamSafe = o.safe != null ? o.safe : WIZ.bonk.safe;
  const kind = o.kind || 'oops';
  st.stats.team++; st.stats.kinds[kind] = (st.stats.kinds[kind] || 0) + 1;
  st.cpT = 0;
  const x = o.x != null ? o.x : st.cam.x + W / 2, y = o.y != null ? o.y : st.cam.y + 200;
  wizPop(st, x, y, o.word || 'Oops!', '#ffffff', 24);
  Sfx.play('wizBonk', 0); rumble(0, 0.6, 0.4, 160); rumble(1, 0.6, 0.4, 160);
  burst(x, y + 10, '#ffffff', 8);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.18);
  return true;
}
const wizControl = (st, p, dt) => control(p, dt);
// the "up" wish: W / ↑ / ▲ / A (jump) or a controller's stick-up
const wizUp = p => !!(p.input.jump || p.input.up);
// grid platforming for both players, as the framework does it (partners are solid, riders are carried)
function wizPlatform(st, dt) {
  const ps = G.players;
  for (const p of ps) control(p, dt);
  separate();
  for (const p of ps) if (p.alive) { const pr = probe(p); p.tileGround = pr.tile; p.onPartner = pr.partner; }
  let rider = null, carrier = null;
  if (ps[0].alive && ps[1].alive) {
    if (ps[0].onPartner && !ps[0].tileGround) { rider = ps[0]; carrier = ps[1]; }
    else if (ps[1].onPartner && !ps[1].tileGround) { rider = ps[1]; carrier = ps[0]; }
  }
  if (rider) {
    const dxc = moveX(carrier, carrier.vx * dt);
    if (dxc) moveX(rider, dxc, true);
    let own = rider.vx * dt;
    if (dxc && Math.sign(own) === Math.sign(dxc)) own = Math.sign(own) * Math.min(Math.abs(own), Math.max(0, PHYS.maxRun * dt - Math.abs(dxc)));
    moveX(rider, own);
    const onHead = Math.abs(rider.y + rider.h - carrier.y) < 0.01;
    if (!rider.jumping && rider.offT <= 0 && (rider.vy >= carrier.vy - 1 || onHead)) {
      moveY(carrier, carrier.vy * dt, true);
      const wantY = carrier.y - rider.h, ry0 = rider.y;
      moveY(rider, wantY - rider.y, true);
      if (Math.abs(rider.y - wantY) > 0.01) {
        if (wantY < ry0) { carrier.y = rider.y + rider.h; carrier.vy = Math.max(0, carrier.vy); carrier.jumping = false; rider.vy = carrier.vy; }
      } else rider.vy = carrier.vy;
    } else { moveY(rider, rider.vy * dt); moveY(carrier, carrier.vy * dt); }
  } else {
    moveX(ps[0], ps[0].vx * dt); moveX(ps[1], ps[1].vx * dt);
    const [up, lo] = ps[1].y < ps[0].y ? [ps[1], ps[0]] : [ps[0], ps[1]];
    moveY(up, up.vy * dt); moveY(lo, lo.vy * dt);
  }
  for (const p of ps) postStep(p);
}
// A body on a list of rectangles (world coords) instead of the tile grid, for the scrolling classes:
//   solids: [{ x0, y0, x1, y1, one (a one-way top: jump up through it, ▼ drops through), dx, dy (how far it moved
//   this tick: riders go with it), off (ignored) }]. o.still: no input (cards); o.ctl(p): runs instead of control().
// Moves p (world coords), sets p.grounded / p.onOneWay / p.ground (the rect under its feet or null). Partners do not
// collide with each other (each class decides if one rides the other). Returns p.ground.
function wizBody(p, dt, solids, o = {}) {
  if (!p.alive) return null;
  const real = p.input;
  if (o.still) { p.input = NO_INPUT; p.pendingJump = false; }
  try { if (o.ctl) o.ctl(p, dt); else control(p, dt); } finally { p.input = real; }
  const was = p.grounded, g0 = p.ground;
  // ride whatever we stand on
  // (a mover's rect can carry src: the live mover, so the ride uses this tick's motion, not last tick's)
  if (was && g0 && !g0.off) { const m = g0.src || g0; p.x += m.dx || 0; p.y += m.dy || 0; }
  // x
  p.x += p.vx * dt;
  for (const r of solids) {
    if (r.one || r.off || p.y + p.h <= r.y0 + 4 || p.y >= r.y1 - 0.5) continue;   // feet just under a top: the y pass steps up
    if (p.x + p.w > r.x0 && p.x < r.x1) {
      if (p.x + p.w / 2 < (r.x0 + r.x1) / 2) { p.x = r.x0 - p.w; p.vx = Math.min(0, p.vx); } else { p.x = r.x1; p.vx = Math.max(0, p.vx); }
    }
  }
  // y
  const feet0 = p.y + p.h, top0 = p.y;
  p.y += p.vy * dt;
  let ground = null;
  for (const r of solids) {
    if (r.off || p.x + p.w <= r.x0 + 0.5 || p.x >= r.x1 - 0.5) continue;
    if (p.vy >= 0 && p.y + p.h >= r.y0 && feet0 <= r.y0 + 2 + Math.max(0, r.dy || 0) && !(r.one && p.dropT > 0)) { p.y = r.y0 - p.h; p.vy = 0; ground = r; }
    else if (!r.one && p.vy < 0 && p.y < r.y1 && top0 >= r.y1 - 2) { p.y = r.y1; p.vy = 0; p.jumping = false; }
    else if (!r.one && p.y + p.h > r.y0 + 0.5 && p.y < r.y1 - 0.5 && p.x + p.w > r.x0 + 0.5 && p.x < r.x1 - 0.5) {   // inside (a mover pushed in): out the short way
      const up = p.y + p.h - r.y0, dn = r.y1 - p.y;
      if (up < dn) { p.y = r.y0 - p.h; p.vy = Math.min(0, p.vy); ground = r; } else { p.y = r.y1; p.vy = Math.max(0, p.vy); }
    }
  }
  // still standing (snap down onto a ground that sank a little)
  if (!ground && was && p.vy >= 0) for (const r of solids) if (!r.off && p.x + p.w > r.x0 + 0.5 && p.x < r.x1 - 0.5 && Math.abs(p.y + p.h - r.y0) < 3) { p.y = r.y0 - p.h; ground = r; p.vy = 0; break; }
  p.ground = ground; p.grounded = !!ground; p.tileGround = !!ground; p.onPartner = false; p.onOneWay = !!(ground && ground.one);
  if (p.grounded && !was && p.lastVy > 260) { p.sx = 1.25; p.sy = 0.78; puff(p.x + p.w / 2, p.y + p.h, 5, 'rgba(255,255,255,0.75)'); Sfx.play('land'); }
  p.lastVy = p.grounded ? 0 : p.vy;
  return ground;
}
// players stand and land with no input (cards, cutscenes)
function wizCoast(dt) {
  for (const p of G.players) {
    p.pendingJump = false; p.pendingAct = false;
    const real = p.input;
    p.input = NO_INPUT;
    try { control(p, dt); if (p.alive) { moveX(p, p.vx * dt); moveY(p, p.vy * dt); postStep(p); } } finally { p.input = real; }
  }
}
function wizGroundY(x, y) {
  const tx = clamp(Math.floor(x / T), 0, COLS - 1), [a, b] = G.players;
  for (let ty = Math.max(0, Math.floor(y / T)); ty < ROWS; ty++) {
    const ch = tile(tx, ty);
    if (ch === '=' || solidFor(ch, a) || solidFor(ch, b)) return ty * T;
  }
  return H;
}
// the tick runs in world coords: players (and particles made meanwhile) shift by the camera and back
function wizInWorld(st, fn) {
  const ps = G.players, c0 = st.cam;
  for (const p of ps) { p.x += c0.x; p.y += c0.y; }
  const n0 = G.particles.length;
  try { fn(); } finally {
    const c = st.cam;   // (fn may move the camera, or start a new phase)
    for (const p of ps) { p.x -= c.x; p.y -= c.y; }
    if (c.x || c.y) for (let i = n0; i < G.particles.length; i++) { G.particles[i].x -= c.x; G.particles[i].y -= c.y; }
  }
}
// draw in screen coords from inside a world-coords draw hook
function wizScreen(st, fn) { ctx.save(); ctx.translate(st.cam.x, st.cam.y); try { fn(); } finally { ctx.restore(); } }
// Pip (0) or Bo (1) with feet centre at (x, y) in the current transform (vehicles, split screens, cutscenes)
function wizDrawHero(id, x, y, o = {}) {
  const p = G.players[id], s = o.s || 1;
  const q = { id, w: p.w, h: p.h, x: -p.w / 2, y: -p.h, sx: o.sx || 1, sy: o.sy || 1, face: o.face || 1, vy: o.vy || 0, stun: o.stun ? 1 : 0,
    blink: o.blink != null ? (o.blink ? 1 : 0) : p.blink, stompSafe: 0, alive: true };
  ctx.save(); ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  if (s !== 1) ctx.scale(s, s);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  drawPlayer(q);
  if (!o.plain) wizDrawOutfit(id, 0, 0, p.w, p.h, { face: o.face || 1, sx: o.sx, sy: o.sy, noHat: o.noHat, noRobe: o.noRobe, wand: o.wand, tassel: wizChampOf(G.mst) === id });
  ctx.restore();
}

/* --- the idle wait: no person pressed anything for WIZ.idleAfter s --- */
function wizIdleTick(st, dt) {
  // (a person doing a job that needs no key right now, e.g. the lookout up the mast, is not away: the phase's present())
  const ph = wizPh(st);
  const any = wizHumanIds().some(k => { const i = G.players[k].input; return i.left || i.right || i.jump || i.down || i.up || i.act || !!wizCall(ph, 'present', st, G.players[k]); });
  if (any) {
    if (st.idle) { st.idle = false; if (st.hm.pose === 'sip' && st.idlePose) st.hm.pose = st.idlePose; st.idlePose = null; wizSay(st, 'Ah, there you are. Carry on!', 1.6); }
    st.idleT = 0; return;
  }
  st.idleT += dt;
  if (!st.idle && st.idleT >= WIZ.idleAfter && !st.cut && G.introT <= 0) { st.idle = true; st.idleSayT = 0; }
  if (st.idle) { const c = st.hm; if (c.pose === 'idle' || c.pose === 'talk') { st.idlePose = c.pose; c.pose = 'sip'; } }
  if (st.idle && (st.idleSayT -= dt) <= 0) { st.idleSayT = 7; wizSay(st, (st.idleN++) % 2 ? 'I\'ll just have another cup, then.' : 'Take your time, dears. Tea never runs out here.', 2.8); }
}

/* --- per-role action words on the touch buttons, the top-bar legend and the cards --- */
let wizLabelEls = null;
function wizActLabels(st) {
  const def = G.level && G.level.def;
  if (!def || !def.act) return;
  let want = wizCall(wizPh(st), 'labels', st);
  if (!want) want = def.act.labels || [def.act.label, def.act.label];
  const key = want[0] + '|' + want[1];
  if (st.labKey === key) return;
  st.labKey = key;
  def.act = Object.assign({}, def.act, { labels: [want[0], want[1]] });   // (a copy: the room's own def stays as written)
  try {
    const lg = wizCall(wizPh(st), 'legend', st);
    if (lg && G.mode === 'play') setLegend(lg);
    if (!wizLabelEls || !wizLabelEls.every(o => document.contains(o.el))) wizLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : -1;
      return { el, id };
    });
    for (const o of wizLabelEls) {
      const w = o.id < 0 ? (want[0] === want[1] ? want[0] : want[0] + '/' + want[1]) : want[o.id];
      if (o.el.textContent !== w) o.el.textContent = w;
    }
    if (typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* no page (tests): the cards still read def.act */ }
}

/* --- checkpoints: the start of every class after the first, kept in the browser --- */
const wizCpOn = () => !!MODES.wizschool.cpOn || (!G.manual && G.mode === 'play');
const wizPlain = o => !!o && typeof o === 'object' && !Array.isArray(o);
const wizNum0 = n => typeof n === 'number' && isFinite(n) && n >= 0;
// a well-formed checkpoint of this version? (anything else in the store is dropped: the level starts at Class 1)
function wizCpOk(cp) {
  if (!wizPlain(cp) || cp.v !== WIZ.cpV || !Number.isInteger(cp.era) || cp.era < 1 || cp.era >= WIZ_ORDER.length) return false;
  if (!wizNum0(cp.time) || cp.time > 1e6 || !Array.isArray(cp.loot) || cp.loot.length !== WIZ_STARN || !cp.loot.every(x => typeof x === 'boolean')) return false;
  const s = cp.stats;
  if (!wizPlain(s) || !Array.isArray(s.oops) || s.oops.length !== 2 || !s.oops.every(wizNum0) || !wizNum0(s.team)) return false;
  if (!wizPlain(s.kinds) || !Array.isArray(s.help) || !Array.isArray(s.phaseT) || (s.idleT !== undefined && !wizNum0(s.idleT))) return false;
  return WIZ_ORDER.every(k => s[k] === undefined || wizPlain(s[k]));
}
function wizCpGet() {
  const cp = store.get(WIZ.cpKey);
  if (wizCpOk(cp)) return cp;
  if (cp != null) wizCpClear();
  return null;
}
// the checkpoint for class `era` (1-11) with the clock at `time`: the stats and the stars as they are now
function wizCpWrite(st, era, time) {
  st.cp = null;
  if (!wizCpOn() || era < 1 || era >= WIZ_ORDER.length) return;
  let stats; try { stats = JSON.parse(JSON.stringify(st.stats)); } catch (e) { return; }
  st.cp = { v: WIZ.cpV, era, time: Math.round(Math.max(0, time) * 10) / 10, stats, loot: st.stars.slice() };
  st.cpT = WIZ.cpEvery;
  store.set(WIZ.cpKey, st.cp);
}
function wizCpSave(st) { wizCpWrite(st, st.phaseNo, G.time); }
// the clock and the Oops so far go into this class's checkpoint, so a restart never rolls them back
function wizCpLive(st) {
  if (!st.cp || st.cp.era !== st.phaseNo || st.cut) return;   // (st.cp is only ever set while checkpoints are on)
  st.cp.live = { time: Math.round(Math.max(0, G.time) * 10) / 10, oops: st.stats.oops.slice(), team: st.stats.team };
  st.cpT = WIZ.cpEvery;
  store.set(WIZ.cpKey, st.cp);
}
function wizCpClear() { store.set(WIZ.cpKey, null); if (G.mst) G.mst.cp = null; }

/* --- the mode: classes, the school-bell cutscene, the ending --- */
function wizInit(st) {
  st.stats = { oops: [0, 0], team: 0, kinds: {}, help: [], phaseT: [], idleT: 0 };
  for (const k of WIZ_ORDER) st.stats[k] = {};
  st.stars = WIZ_ORDER.map(() => false);
  st.idleN = 0; st.ended = false; st.resumed = 0; st.cp = null; st.cpT = 0; st.cpNote = null; st.askOver = 0;
}
function wizStartPhase(st, L) {
  const def = L.def;
  st.phase = def.phase; st.phaseNo = def.roomIndex || 0; st.cls = WIZ_CLASSES[st.phase] || WIZ_CLASSES.broom;
  st.ph = {}; st.phT = 0; st.cam = { x: 0, y: 0 }; st.miss = {}; st.goldGot = {};
  st.cut = null; st.celebT = 0; st.say = null; st.news = null; st.hints = [null, null]; st.pops = []; st.fly = null;
  st.badgeT = 0; st.badgeArm = true; st.swapT = 0; st.safe = [0, 0]; st.teamSafe = 0; st.warn = [0, 0]; st.idleT = 0; st.idle = false; st.labKey = '';
  st.arriveT = st.phaseNo > 0 ? WIZ.arriveT : 0;
  st.hm = wizNewHm();
  if (!st.stats[st.phase]) st.stats[st.phase] = {};
  if (typeof def.look === 'number') applyTheme(def.look, def.theme);
  if (G.mode === 'play') setLegend(def.legend || LEVELS[G.levelIndex].legend || null);
  if (!WIZ_PHASES[def.phase]) console.warn('Moonwick Academy: no WIZ_PHASES.' + def.phase);
  wizCpSave(st);
  wizCall(wizPh(st), 'setup', st, L);
  wizActLabels(st);
  st.cpNote = null;
  if (st.resumed === 1) { st.resumed = 2; st.cpNote = { text: 'Checkpoint: Class ' + (st.phaseNo + 1) + '. Pause to start over from Class 1.', t: 0, life: WIZ.cpNoteLife }; }
}
function wizCoastPhase(st, dt) { const ph = wizPh(st); if (ph.coast) wizCall(ph, 'coast', st, dt); else wizCoast(dt); }
function wizTick(st, dt) {
  const ph = wizPh(st);
  if (G.introT <= 0) st.phT += dt;
  wizIdleTick(st, dt);
  if (st.celebT > 0) st.celebT = Math.max(0, st.celebT - dt);
  if (st.arriveT > 0) st.arriveT = Math.max(0, st.arriveT - dt);
  if (st.say && (st.say.t += dt) >= st.say.life) st.say = null;
  if (st.news && (st.news.t += dt) >= st.news.life) st.news = null;
  if (st.cpNote && G.introT <= 0 && !st.cut && (st.cpNote.t += dt) >= st.cpNote.life) st.cpNote = null;
  for (let k = 0; k < 2; k++) {
    const h = st.hints[k];
    if (h && (h.t += dt) >= h.life) st.hints[k] = null;
    st.safe[k] = Math.max(0, st.safe[k] - dt); st.warn[k] = Math.max(0, st.warn[k] - dt);
  }
  st.teamSafe = Math.max(0, st.teamSafe - dt);
  for (const q of st.pops) q.t += dt;
  if (st.pops.length && st.pops[0].t > 1.1) st.pops = st.pops.filter(q => q.t <= 1.1);
  if (st.fly && (st.fly.t += dt) >= st.fly.life) st.fly = null;
  if (st.swapT > 0) st.swapT = Math.max(0, st.swapT - dt);
  if (st.badgeT > 0 && G.introT <= 0) st.badgeT = Math.max(0, st.badgeT - dt);
  wizHmTick(st, dt);
  if (st.cut) { wizCutStep(st, dt); if (G.mst === st && st.cut && st.cut.kind === 'leave') wizCoastPhase(st, dt); return; }
  if (G.introT > WIZ.introHold) {
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
    if (ph.wait) wizCall(ph, 'wait', st, dt); else wizCoastPhase(st, dt);
    wizActLabels(st);
    return;
  }
  if (st.badgeArm) { st.badgeArm = false; st.badgeT = WIZ.badgeT; }
  wizCall(ph, 'step', st, dt);
  wizActLabels(st);
}
function wizStep(st, dt) {
  if (!st.hm) return;
  if (st.cut && st.cut.kind === 'end') { wizEndStep(st, dt); return; }
  wizInWorld(st, () => wizTick(st, dt));
}
// The class is won. o.say: her line; o.got (default true in the 10 spell classes): the spell's star flies from her wand
// to both hats and its strip slot. The next room starts after WIZ.leaveT s (the last room plays the ending). False if
// a cutscene is already running.
function wizPhaseDone(st, o = {}) {
  if (st.cut) return false;
  st.stats.phaseT[st.phaseNo] = Math.round(st.phT * 10) / 10;
  const def = G.level.def, cls = st.cls, i = st.phaseNo;
  const got = o.got !== false && i < WIZ_STARN;
  if (got) {
    st.stars[i] = true;
    const P = wizHmPts(st.hm);
    st.fly = { i, t: 0, life: 2.2, x0: P.wand.x - st.cam.x, y0: P.wand.y - st.cam.y };
    wizNews(st, i < 10 ? 'Spell learned: ' + cls.spellName + '!' : i === 10 ? 'Exam passed!' : 'Graduated!', true, 3.4);
    Sfx.play('wizGot');
  }
  if (def.roomIndex >= def.roomCount - 1) return wizEnding(st, o);
  // the next class's checkpoint at once (not only when it starts): quitting during the cutscene keeps this win
  wizCpWrite(st, st.phaseNo + 1, G.time + WIZ.leaveT);
  const lines = ['Well done, dears. Off to the next class!', 'Splendid. Mostly. Next class!', 'A star each! Don\'t let it go to your heads.'];
  st.cut = { kind: 'leave', t: 0, said: false, say: o.say || lines[st.phaseNo % lines.length] };
  return true;
}
function wizCutStep(st, dt) {
  const c = st.cut, b = st.hm;
  if (c.kind !== 'leave') return;
  c.t += dt;
  if (!c.said) { c.said = true; b.pose = 'cast'; b.mood = 'happy'; wizSay(st, c.say, 2.4); }
  if (c.t > 1.2 && !c.bell) { c.bell = true; Sfx.play('wizBell'); b.pose = 'sip'; }
  if (c.t > 2.6 && !c.shut) { c.shut = true; Sfx.play('wizDoor'); for (const p of G.players) rumble(p.id, 0.25, 0.4, 250); }
  if (c.t >= WIZ.leaveT) nextRoom();
}
// The ending (after the duel): the core owns the screen. The moonlit courtyard: hats in the air, the school cheers (and
// the Blot waves from its jar), the winner wears a gold tassel; then levelClear().
function wizEnding(st, o = {}) {
  if (st.cut && st.cut.kind === 'end') return false;
  st.cut = { kind: 'end', t: 0, step: 0, fw: [], fwT: 0, line: o.say || null, hats: null };
  st.cam = { x: 0, y: 0 }; st.pops = []; st.hints = [null, null]; st.news = null; st.badgeT = 0; st.swapT = 0; st.warn = [0, 0]; st.fly = null;
  const c = st.hm, gy = WIZ.endGround;
  Object.assign(c, { x: W / 2, y: gy - 150, s: 1, face: 1, pose: 'cheer', mood: 'happy', baseMood: 'happy', moodT: 0, hidden: false, alpha: 1, sayAt: null, look: null });
  G.players.forEach((p, k) => Object.assign(p, { alive: true, respawnT: 0, x: W / 2 + (k ? 170 : -170) - p.w / 2, y: gy - p.h, vx: 0, vy: 0, stun: 0, knockT: 0, grounded: true, face: k ? -1 : 1, sx: 1, sy: 1 }));
  Sfx.play('wizPhase');
  return true;
}
function wizEndStep(st, dt) {
  const c = st.cut, b = st.hm, gy = WIZ.endGround;
  c.t += dt;
  wizHmTick(st, dt);
  if (st.say && (st.say.t += dt) >= st.say.life) st.say = null;
  for (let k = 0; k < 2; k++) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  for (const q of st.pops) q.t += dt;
  for (const p of G.players) {
    p.pendingJump = false; p.pendingAct = false;
    p.vy += PHYS.g * dt; p.y += p.vy * dt;
    if (p.y + p.h >= gy) { if (!p.grounded && p.vy > 200) { p.sx = 1.2; p.sy = 0.8; } p.y = gy - p.h; p.vy = 0; p.grounded = true; }
    const want = W / 2 + (p.id ? 120 : -120) - p.w / 2;
    if (c.t > 1.6 && Math.abs(p.x - want) > 2) p.x += Math.sign(want - p.x) * Math.min(Math.abs(want - p.x), 140 * dt);
    p.face = b.x > p.x + p.w / 2 ? 1 : -1;
  }
  b.y = gy - 150 + Math.sin(c.t * 1.6) * 6;
  const hop = (s = 0.6) => { for (const p of G.players) if (p.grounded) { p.vy = -PHYS.jumpV * s; p.grounded = false; p.sx = 0.8; p.sy = 1.25; } };
  const at = (n, time) => c.step === n && c.t >= time && ++c.step;
  if (at(0, 0)) { wizSay(st, c.line || 'Moonwick graduates, every one of you!', 2.4); hop(0.5); }
  if (at(1, 2.2)) { b.pose = 'sip'; wizSay(st, 'Ten spells, one exam, one rather large ink spill.', 2.4); }
  // hats in the air!
  if (at(2, 4.2)) {
    c.hats = G.players.map(p => ({ x: p.x + p.w / 2, y: p.y - 4, vx: (p.id ? 40 : -40), vy: -520, rot: 0 }));
    st.hints[0] = { text: 'Hats off!', t: 0, life: 2.4, gold: true }; st.hints[1] = { text: 'Hooray!', t: 0, life: 2.4, gold: true };
    hop(0.75); Sfx.play('wizCheer');
  }
  if (at(3, 6)) { b.pose = 'wave'; wizSay(st, 'Now off you pop. Class starts again on Monday!', 2.8); hop(0.55); Sfx.play('wizGot'); }
  if (c.hats) for (const h of c.hats) { h.vy += 700 * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += dt * 6 * Math.sign(h.vx); if (h.y > gy - 40 && h.vy > 0) { h.y = gy - 40; h.vy = 0; h.vx = 0; h.rot = 0; } }
  // spell-coloured sparks pop over the courtyard
  if (c.t > 3.6 && (c.fwT -= dt) <= 0) {
    c.fwT = 0.34 + wizRand() * 0.3;
    const ks = Object.keys(WIZ_SPELLS);
    c.fw.push({ x: 90 + wizRand() * (W - 180), y: 70 + wizRand() * 150, t: 0, col: WIZ_SPELLS[ks[Math.floor(wizRand() * ks.length)]].col });
    Sfx.play('wizPop');
  }
  for (const f of c.fw) f.t += dt;
  if (c.fw.length > 4) c.fw = c.fw.filter(f => f.t < 1.3);
  if ((G.tickN % 9) === 0 && c.t > 4.2) confetti(80 + wizRand() * (W - 160), 40 + wizRand() * 60);
  if (at(4, WIZ.endT)) { st.ended = true; wizCpClear(); levelClear(); }
}

MODES.wizschool = {
  rand: Math.random,   // gameplay randomness (wizRand); tests may swap in a seeded one (MODES.wizschool.test.seed)
  cpOn: false,         // tests: true makes checkpoints work under G.manual too
  medals: { bronze: 'Graduate from Moonwick Academy', goals: [
    { key: 'time', gold: WIZ.medal.gold.t, silver: WIZ.medal.silver.t },
    { key: 'oops', gold: WIZ.medal.gold.oops, silver: WIZ.medal.silver.oops, word: 'Oops', text: n => n + ' or fewer Oops', gap: (v, n) => Math.max(1, Math.ceil(v - n)) + ' fewer Oops' },
  ] },
  medalValues() { return G.mst && G.mst.stats ? { oops: wizOopsN(G.mst) } : {}; },
  setup(st, L) {
    wizInit(st);
    const cp = wizCpOn() ? wizCpGet() : null;
    if (!cp) { wizStartPhase(st, L); return; }
    // back at the checkpoint: the class, the clock, the stats and the stars so far
    // (the clock and the Oops go on from the last play, cp.live: restarting a class never takes them back)
    Object.assign(st.stats, cp.stats);
    for (let k = 0; k < st.stars.length; k++) st.stars[k] = !!cp.loot[k];
    st.resumed = 1;
    G.time = cp.time;
    const lv = wizPlain(cp.live) ? cp.live : {};
    if (wizNum0(lv.time)) G.time = Math.max(G.time, lv.time);
    if (Array.isArray(lv.oops)) for (let k = 0; k < 2; k++) if (wizNum0(lv.oops[k])) st.stats.oops[k] = Math.max(st.stats.oops[k], lv.oops[k]);
    if (wizNum0(lv.team)) st.stats.team = Math.max(st.stats.team, lv.team);
    G.room = cp.era - 1;
    nextRoom();   // (it calls room() below, which starts the phase)
  },
  room(k, L) { wizStartPhase(G.mst, L); },
  step(dt) {
    const st = G.mst;
    wizStep(st, dt);
    // the clock stops while Thimblewick waits for an away person: the trophy and the record count play time only
    if (st.hm && st.idle && !st.cut && G.mode === 'play') { G.time = Math.max(0, G.time - dt); st.stats.idleT += dt; }
    st.askOver = 0;   // (playing again: "Start over from Class 1" asks anew)
    if (st.cp && (st.cpT -= dt) <= 0) wizCpLive(st);
  },
  onKill(p) { const st = G.mst; if (st.hm && !(st.cut && st.cut.kind === 'end')) wizCall(wizPh(st), 'onKill', st, p); },
  onRespawn(p) { const st = G.mst; if (st.hm && !(st.cut && st.cut.kind === 'end')) wizCall(wizPh(st), 'onRespawn', st, p); },
  draw() { const st = G.mst; if (st.hm) wizDraw(st); },
  drawTop() { const st = G.mst; if (st.hm) wizDrawTop(st); },
  hud() { const st = G.mst; if (st.hm) wizHud(st); },
  stats() { return wizStatsOut(G.mst); },
  // the pause card (js/ui.js): "Restart this class" and "Start over from Class 1" while a later class is being played.
  // Starting over throws away up to 25 minutes, so it takes two presses: the first one only asks.
  pauseExtra() {
    const st = G.mst;
    if (!st || !st.hm || !(st.phaseNo > 0)) return null;
    wizCpLive(st);   // ("Restart this class" goes on from this clock)
    return { replay: 'Restart this class', more: [{ label: st.askOver ? 'Really start over? Press again' : 'Start over from Class 1', arg: 'startover' }] };
  },
  pauseAct(arg) {
    if (arg !== 'startover') return;
    const st = G.mst, now = Date.now();
    if (!st.askOver) { st.askOver = now; if (typeof showPauseCard === 'function') showPauseCard(); return; }
    if (now - st.askOver < WIZ.askOverMs) return;   // (a double tap is not a yes)
    wizCpClear(); loadLevel(G.levelIndex);
  },
};

// The results card: the framework's Time and Record tiles, then Oops (the medal is js/medals.js's), and two lines.
const wizOopsN = st => st.stats.oops[0] + st.stats.oops[1] + st.stats.team;
function wizStatsOut(st) {
  const n = wizOopsN(st), learned = wizHatStars(st);
  const out = [{ label: 'Oops', value: n }];
  const bits = ['Spells learned ' + learned + '/10'];
  for (const ph of WIZ_ORDER.slice().reverse()) {   // (the duel first: it is the last thing they did)
    const P = WIZ_PHASES[ph];
    if (!P) continue;
    const tile = wizCall(P, 'stat', st), line = wizCall(P, 'statLine', st);
    if (tile && tile.label) bits.push(tile.label + ': ' + (tile.values ? tile.values.join(' - ') : tile.value));
    if (line) bits.push(line);
  }
  out.push(bits.map(l => l + '.').join(' '));
  out.push((n === 0 ? 'Not one Oops! ' : '') + 'Pip and Bo are wizards of Moonwick Academy!');
  return out;
}

/* --- drawing: Headmistress Thimblewick in her floating patchwork armchair --- */
const WIZC = { chair: '#8a4a6a', chairDk: '#5e2e48', patch: ['#c96a5a', '#6a8ac9', '#d9b45a', '#6aa86a', '#a86ac9'], leg: '#5a3a22', skin: '#f6dcc4', skinDk: '#e0b89a',
  hair: '#f4f1ea', robe: '#3e7a6a', robeDk: '#285446', hat: '#4a3a8a', hatDk: '#2e2460', band: '#e0a43c', cup: '#ffffff', tea: '#a8643a', wand: '#7a5230',
  stone: '#5a5478', stoneDk: '#3a3552', stoneLt: '#7e78a0', wood: '#8a5a32', woodDk: '#5a3a1e', candle: '#ffd77a', ink: '#120e1f', inkLt: '#2c2444' };
// pose geometry: bob (+ is down), arm angles (0 = down, PI/2 = forward, PI = up), mouth, hat wobble, eyes
function wizHmGeo(c) {
  const t = c.t, p = c.pose;
  const g = { bob: Math.sin(t * 1.8) * 4 * (c.bob == null ? 1 : c.bob), lean: (c.tilt || 0) + Math.sin(t * 1.1) * 0.03, armW: 0.9 + Math.sin(t * 1.4) * 0.08, armC: 0.6, cupUp: 0,
    mouth: 'smile', hat: Math.sin(t * 1.3) * 0.06, eyes: 'open' };
  switch (p) {
    case 'talk': g.mouth = Math.sin(t * 14) > 0 ? 'o' : 'smile'; g.armW = 1.2 + Math.sin(t * 5) * 0.2; break;
    case 'point': g.armW = 1.65; g.mouth = 'flat'; break;
    case 'sip': g.armC = 1.9; g.cupUp = 1; g.eyes = 'shut'; g.mouth = 'none'; break;
    case 'doze': g.armC = 0.5; g.eyes = 'shut'; g.mouth = 'o'; g.hat = 0.25 + Math.sin(t * 0.8) * 0.05; g.bob *= 0.5; break;
    case 'cheer': g.armW = 2.7 + Math.sin(t * 8) * 0.2; g.armC = 2.4; g.mouth = 'open'; g.bob = Math.abs(Math.sin(t * 6)) * -6; break;
    case 'shock': g.armW = 2.5; g.armC = 2.2; g.mouth = 'o'; g.eyes = 'wide'; g.hat = Math.sin(t * 22) * 0.12; break;
    case 'laugh': g.mouth = 'open'; g.eyes = 'shut'; g.bob = Math.abs(Math.sin(t * 10)) * -3; g.armC = 0.9; break;
    case 'wave': g.armW = 2.6 + Math.sin(t * 9) * 0.35; break;
    case 'cast': g.armW = 2.1 + Math.sin(t * 7) * 0.15; g.mouth = 'o'; break;
    case 'wobble': g.lean = Math.sin(t * 3) * 0.25; g.mouth = 'o'; g.eyes = 'wide'; g.armW = 1.8 + Math.sin(t * 4) * 0.5; g.armC = 1.4; break;
  }
  if (c.mood === 'shocked' && g.mouth === 'smile') g.mouth = 'o';
  if (c.mood === 'cross' && g.mouth === 'smile') g.mouth = 'flat';
  if (c.mood === 'happy' && g.mouth === 'smile') g.mouth = 'open';
  if (c.blink > 0 && g.eyes === 'open') g.eyes = 'shut';
  if (c.hitT > 0) g.lean += Math.sin(c.hitT * 40) * 0.12;
  return g;
}
// a local point (units; x toward where she looks, y up is negative, origin under the chair) -> world
function wizHmP(c, lx, ly) { return { x: c.x + lx * c.s * (c.face || 1), y: c.y + ly * c.s }; }
function wizHmPts(c) {
  const g = wizHmGeo(c), hy = -78 + g.bob;
  const head = wizHmP(c, 4, hy), mouth = wizHmP(c, 10, hy + 6), top = wizHmP(c, 0, hy - 74);
  const wa = g.armW, wand = wizHmP(c, 14 + Math.sin(wa) * 30, hy + 26 - Math.cos(wa) * -30 - 6);
  return { head: { x: head.x, y: head.y, r: 13 * c.s }, mouth, top, wand, body: { x0: c.x - 46 * c.s, x1: c.x + 46 * c.s, y0: top.y, y1: c.y } };
}
function wizDrawHm(c) {
  if (!c || c.hidden || c.alpha <= 0) return;
  const g = wizHmGeo(c), t = c.t;
  ctx.save();
  ctx.globalAlpha *= clamp(c.alpha, 0, 1);
  // a soft glow and sparkles under the floating chair (in world space: she floats, nothing holds her up)
  ctx.fillStyle = 'rgba(255,240,200,0.16)'; ctx.beginPath(); ctx.ellipse(c.x, c.y + 10 * c.s, 40 * c.s, 8 * c.s, 0, 0, Math.PI * 2); ctx.fill();
  for (let k = 0; k < 3; k++) { const a = t * 2 + k * 2.1; ctx.fillStyle = 'rgba(255,236,170,' + (0.5 + 0.4 * Math.sin(a * 2)) + ')'; circle(c.x + Math.cos(a) * 28 * c.s, c.y + 8 * c.s + Math.sin(a) * 4, 1.8); ctx.fill(); }
  ctx.translate(c.x, c.y + g.bob * c.s); ctx.scale(c.s * (c.face || 1), c.s); ctx.rotate(g.lean);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  // the chair: stubby legs, a seat cushion, a tall rounded back and two fat arms, all in patches
  ctx.fillStyle = WIZC.leg; for (const lx of [-30, 26]) { rr(lx, -10, 7, 12, 3); ctx.fill(); ctx.stroke(); }
  const P = WIZC.patch;
  // the tall wing-back, patched, with a sagging top
  ctx.fillStyle = WIZC.chair; ctx.beginPath(); ctx.moveTo(-34, -30); ctx.lineTo(-38, -100); ctx.quadraticCurveTo(-36, -118, -14, -114); ctx.quadraticCurveTo(-4, -110, 6, -114); ctx.quadraticCurveTo(28, -118, 30, -100); ctx.lineTo(28, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.clip(); for (const [px, py, pw, ph2, k] of [[-36, -112, 22, 20, 0], [8, -108, 20, 18, 3], [-20, -84, 18, 16, 2], [10, -70, 18, 22, 1], [-36, -64, 16, 20, 4]]) { ctx.fillStyle = P[k]; ctx.fillRect(px, py, pw, ph2); } ctx.restore();
  ctx.strokeStyle = 'rgba(28,26,54,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(-14, -112); ctx.lineTo(-14, -34); ctx.moveTo(8, -112); ctx.lineTo(8, -34); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.fillStyle = WIZC.chair; rr(-36, -40, 72, 32, 10); ctx.fill(); ctx.stroke();
  // the fat rolled arms
  for (const ax of [-44, 26]) { ctx.fillStyle = WIZC.chairDk; rr(ax, -58, 18, 44, 9); ctx.fill(); ctx.stroke(); ctx.fillStyle = P[ax < 0 ? 1 : 2]; circle(ax + 9, -50, 5); ctx.fill(); }
  ctx.fillStyle = P[2]; rr(-22, -36, 16, 12, 3); ctx.fill(); ctx.fillStyle = P[1]; rr(8, -30, 18, 14, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(28,26,54,0.45)'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); rr(-22, -36, 16, 12, 3); ctx.stroke(); rr(8, -30, 18, 14, 3); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  // tassels along the bottom
  ctx.fillStyle = WIZC.band; for (let k = 0; k < 5; k++) { const tx = -30 + k * 15, sw = Math.sin(t * 3 + k) * 2; ctx.beginPath(); ctx.moveTo(tx, -9); ctx.lineTo(tx + sw - 2, -2); ctx.lineTo(tx + sw + 2, -2); ctx.closePath(); ctx.fill(); }
  // her: a tiny robed body on the cushion, little feet dangling
  ctx.fillStyle = WIZC.robeDk; for (const fx of [-4, 8]) { ctx.beginPath(); ctx.ellipse(fx + 14, -36 + Math.sin(t * 2 + fx) * 1.5, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = WIZC.robe; ctx.beginPath(); ctx.moveTo(-14, -40); ctx.quadraticCurveTo(-16, -66, 2, -70); ctx.quadraticCurveTo(20, -66, 22, -40); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = WIZC.band; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -68); ctx.lineTo(4, -42); ctx.stroke(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  const hy = -78;
  const arm = (sx, a) => { const hx = sx + Math.sin(a) * 18, hyy = -60 + Math.cos(a) * 18; ctx.strokeStyle = WIZC.robe; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx, -62); ctx.lineTo(hx, hyy); ctx.stroke(); ctx.fillStyle = WIZC.skin; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8; circle(hx, hyy, 3.6); ctx.fill(); ctx.stroke(); return { x: hx, y: hyy }; };
  // the cup hand (back): a teacup that refills itself (a wisp of steam)
  const ch = arm(-6, g.armC);
  ctx.save(); ctx.translate(ch.x + 2, ch.y - 3);
  ctx.fillStyle = WIZC.cup; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(6, -4); ctx.quadraticCurveTo(6, 4, 0, 5); ctx.quadraticCurveTo(-6, 4, -6, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(7, 0, 2.6, -1.2, 1.2); ctx.stroke(); ctx.fillStyle = WIZC.tea; ctx.fillRect(-5, -4, 10, 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let q = 0; q < 8; q++) ctx.lineTo(Math.sin(t * 4 + q) * 2, -6 - q * 2.2); ctx.stroke();
  ctx.restore();
  // head: a round face, a big round nose, white hair puffs and rosy cheeks
  ctx.save(); ctx.translate(4, hy);
  ctx.fillStyle = WIZC.hair; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; for (const [hx, hy2, hr] of [[-12, 2, 6], [-11, -6, 5.5], [12, 3, 5], [10, -5, 5]]) { circle(hx, hy2, hr); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = WIZC.skin; circle(0, 0, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(240,120,130,0.45)'; circle(-6, 4, 2.6); ctx.fill(); circle(9, 4, 2.6); ctx.fill();
  if (g.eyes === 'shut') { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8; for (const ex of [-3, 6]) { ctx.beginPath(); ctx.arc(ex, -2, 2.4, 0.2, Math.PI - 0.2); ctx.stroke(); } }
  else { const r = g.eyes === 'wide' ? 2.6 : 1.8; ctx.fillStyle = C.ink; for (const ex of [-3, 6]) { circle(ex + 0.6, -2, r); ctx.fill(); } }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-6, -6.5); ctx.lineTo(-1, -5.5); ctx.moveTo(4, -5.5); ctx.lineTo(9, -6.5); ctx.stroke();
  ctx.fillStyle = WIZC.skinDk; ctx.lineWidth = 1.8; circle(3.5, 2, 3.6); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1.8;
  if (g.mouth === 'o') { ctx.fillStyle = '#7a2a3a'; circle(3, 8, 2.2); ctx.fill(); ctx.stroke(); }
  else if (g.mouth === 'open') { ctx.fillStyle = '#7a2a3a'; ctx.beginPath(); ctx.arc(3, 7, 3.6, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if (g.mouth === 'flat') { ctx.beginPath(); ctx.moveTo(-1, 8); ctx.lineTo(7, 8); ctx.stroke(); }
  else if (g.mouth === 'smile') { ctx.beginPath(); ctx.arc(3, 6, 3.4, 0.3, Math.PI - 0.3); ctx.stroke(); }
  // her hat: much taller than she is, bent at the tip, a band with a moth-eaten patch
  ctx.save(); ctx.translate(0, -9); ctx.rotate(g.hat);
  ctx.fillStyle = WIZC.hat; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.ellipse(0, 0, 21, 4.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const bend = Math.sin(t * 1.2) * 4;
  ctx.beginPath(); ctx.moveTo(-12, -1); ctx.quadraticCurveTo(-8, -40, -2 + bend * 0.3, -58); ctx.quadraticCurveTo(6 + bend, -70, 18 + bend, -64); ctx.quadraticCurveTo(6, -54, 3, -40); ctx.quadraticCurveTo(10, -18, 12, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = WIZC.band; ctx.beginPath(); ctx.moveTo(-11, -4); ctx.lineTo(11, -4); ctx.lineTo(11, -10); ctx.lineTo(-10.5, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#8a7ac9'; rr(-4, -32, 8, 7, 1.5); ctx.fill(); ctx.lineWidth = 1; ctx.setLineDash([1.5, 1.5]); rr(-4, -32, 8, 7, 1.5); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore(); ctx.restore();
  // the wand hand (front): a twisty wand with a soft star at the tip
  const wh = arm(14, g.armW);
  const wx = wh.x + Math.sin(g.armW) * 12, wy = wh.y + Math.cos(g.armW) * 12;
  ctx.strokeStyle = WIZC.wand; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(wh.x, wh.y); ctx.quadraticCurveTo((wh.x + wx) / 2 + 2, (wh.y + wy) / 2 - 2, wx, wy); ctx.stroke();
  ctx.fillStyle = 'rgba(255,240,180,' + (0.55 + 0.35 * Math.sin(t * 6)) + ')'; circle(wx, wy, 3.6); ctx.fill();
  ctx.restore();
}

/* --- the spell kit: stars, spell icons, rings, sparks --- */
function wizDrawStar(x, y, r, col, o = {}) {
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
  ctx.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rad = k % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  if (o.col2) { ctx.save(); ctx.clip(); ctx.fillStyle = o.col2; ctx.fillRect(0, -r, r, r * 2); ctx.restore(); }
  if (o.line !== false) { ctx.strokeStyle = o.ink || C.ink; ctx.lineWidth = o.lw || Math.max(1, r * 0.16); ctx.stroke(); }
  ctx.restore();
}
// the strip and hat icon of a class's spell: a star in its colour (Frost and Flame: half ice, half orange); the exam's
// is a red wax seal, the duel's a little trophy
function wizDrawSpellIcon(phase, x, y, r) {
  const cls = WIZ_CLASSES[phase];
  if (cls && cls.spell === 'frostflame') { wizDrawStar(x, y, r, WIZ_SPELLS.frost.col, { col2: WIZ_SPELLS.flame.col }); return; }
  if (cls && cls.spell) { wizDrawStar(x, y, r, WIZ_SPELLS[cls.spell].col); return; }
  ctx.save(); ctx.translate(x, y); ctx.scale(r / 10, r / 10); ctx.lineJoin = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4;
  if (phase === 'exam') {
    ctx.fillStyle = '#d9485a'; ctx.beginPath(); for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6, rad = k % 2 ? 8 : 9.5; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ffd0d6'; ctx.lineWidth = 1.2; circle(0, 0, 5); ctx.stroke(); wizDrawStar(0, 0, 3, '#ffd0d6', { line: false });
  } else {
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(-7, -8); ctx.lineTo(7, -8); ctx.quadraticCurveTo(7, 3, 0, 4); ctx.quadraticCurveTo(-7, 3, -7, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-7, -4, 3, Math.PI * 0.5, Math.PI * 1.5); ctx.moveTo(7, -7); ctx.arc(7, -4, 3, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    ctx.fillRect(-1.5, 4, 3, 3); ctx.fillRect(-5, 7, 10, 2.5); ctx.strokeRect(-5, 7, 10, 2.5);
  }
  ctx.restore();
}
// a ring of spell-coloured sparks (centre x, y; a: alpha) — the same look in the class and in the exam
function wizSpellRing(x, y, r, key, t, a = 1) {
  const s = WIZ_SPELLS[key] || WIZ_SPELLS.zoom;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.strokeStyle = s.glow; ctx.lineWidth = 6; circle(x, y, r); ctx.stroke();
  ctx.strokeStyle = s.col; ctx.lineWidth = 2; circle(x, y, r); ctx.stroke();
  for (let k = 0; k < 8; k++) { const ang = t * 2.4 + k * Math.PI / 4; wizDrawStar(x + Math.cos(ang) * r, y + Math.sin(ang) * r, 3.4, s.col, { line: false }); }
  ctx.restore();
}
function wizSparks(x, y, key, n = 8) { const s = WIZ_SPELLS[key] || WIZ_SPELLS.zoom; burst(x, y, s.col, n); }
function wizCastSound(key) { Sfx.play('wizSpell_' + key); }
// a mid-class safe spot: a little banner on a post (lit: reached); world coords, feet at groundY
function wizDrawFlag(x, gy, lit, col = '#ffd23f') {
  ctx.save(); ctx.lineJoin = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.fillStyle = '#6b4a2a'; ctx.fillRect(x - 2, gy - 56, 4, 56); ctx.strokeRect(x - 2, gy - 56, 4, 56);
  const wv = Math.sin(G.clock * 4 + x) * 2;
  ctx.fillStyle = lit ? col : '#6a6488'; ctx.beginPath(); ctx.moveTo(x + 2, gy - 54); ctx.quadraticCurveTo(x + 14, gy - 54 + wv, x + 26, gy - 50); ctx.lineTo(x + 2, gy - 36); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (lit) wizDrawStar(x + 11, gy - 47, 4, '#ffffff', { line: false });
  ctx.restore();
}
// a vertical gradient over the whole screen width (screen coords)
function wizSky(top, bottom, y0 = 0, y1 = H) {
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
}
function wizStars(t, n = 40, alpha = 1, seed = 7) {
  for (let k = 0; k < n; k++) {
    const h = hash(k, seed), x = h % W, y = (h >>> 10) % 300, tw = 0.5 + 0.5 * Math.sin(t * (1 + (h % 7) * 0.3) + k);
    ctx.fillStyle = `rgba(255,255,255,${(0.35 + 0.6 * tw) * alpha})`; circle(x, y, 0.8 + (h % 3) * 0.5); ctx.fill();
  }
}
// the Moonwick dusk (screen coords): purple sky, the big pale moon, drifting island rocks; scroll moves the far layers
function wizDusk(t, scrollX = 0, scrollY = 0, o = {}) {
  wizSky(o.top || '#241a52', o.bot || '#9a62a8');
  wizStars(t, 46, 0.8, 35);
  // a few brighter twinkling stars with little crosses
  for (let k = 0; k < 6; k++) {
    const h = hash(k, 91), x = h % W, y = 20 + (h >>> 9) % 200, a = 0.5 + 0.5 * Math.sin(t * 1.7 + k * 2.1);
    ctx.fillStyle = `rgba(255,250,230,${0.55 * a})`; ctx.fillRect(x - 5, y - 0.6, 10, 1.2); ctx.fillRect(x - 0.6, y - 5, 1.2, 10); circle(x, y, 1.6); ctx.fill();
  }
  const mx = (o.moonX != null ? o.moonX : 760) - scrollX * 0.02, my = (o.moonY != null ? o.moonY : 96) - scrollY * 0.02;
  ctx.fillStyle = 'rgba(255,248,220,0.07)'; circle(mx, my, 110); ctx.fill(); circle(mx, my, 80); ctx.fill(); circle(mx, my, 62); ctx.fill();
  ctx.fillStyle = '#fbf3dc'; circle(mx, my, 46); ctx.fill();
  // the moon's shaded limb, craters with lit rims
  ctx.fillStyle = 'rgba(180,160,190,0.22)'; ctx.beginPath(); ctx.arc(mx, my, 46, -0.9, 2.2); ctx.arc(mx - 8, my - 4, 42, 2.2, -0.9, true); ctx.fill();
  for (const [cx, cy, r] of [[-14, -8, 9], [12, 14, 6], [16, -16, 4], [-6, 20, 4.5]]) { ctx.fillStyle = 'rgba(200,190,170,0.5)'; circle(mx + cx, my + cy, r); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,245,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(mx + cx, my + cy, r, 0.2, 1.9); ctx.stroke(); }
  // thin clouds drifting across the lower sky
  for (let k = 0; k < 4; k++) {
    const span = W + 400, cx = ((k * 330 + t * (4 + k) - scrollX * 0.04) % span + span) % span - 200, cy = 200 + (k % 2) * 46 - scrollY * 0.03;
    ctx.fillStyle = 'rgba(210,170,220,0.16)'; ctx.beginPath(); ctx.ellipse(cx, cy, 120, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx + 50, cy - 6, 70, 7, 0, 0, Math.PI * 2); ctx.fill();
  }
  // floating rocks with little trees: a lit top, a shaded underside, a lantern glow on some
  for (let k = 0; k < 5; k++) {
    const span = W + 300, rx = ((k * 260 + 120 - scrollX * (0.08 + k * 0.02)) % span + span) % span - 150, ry = 150 + (k % 3) * 60 + Math.sin(t * 0.5 + k) * 6 - scrollY * 0.05;
    const s = 0.6 + (k % 3) * 0.25;
    ctx.fillStyle = '#4a3e72'; ctx.beginPath(); ctx.moveTo(rx - 30 * s, ry); ctx.lineTo(rx + 30 * s, ry); ctx.lineTo(rx + 8 * s, ry + 26 * s); ctx.lineTo(rx - 4 * s, ry + 34 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a305e'; ctx.beginPath(); ctx.moveTo(rx + 2 * s, ry); ctx.lineTo(rx + 30 * s, ry); ctx.lineTo(rx + 8 * s, ry + 26 * s); ctx.lineTo(rx - 4 * s, ry + 34 * s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(40,30,70,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(rx - 14 * s, ry + 8 * s); ctx.lineTo(rx - 4 * s, ry + 18 * s); ctx.moveTo(rx + 10 * s, ry + 6 * s); ctx.lineTo(rx + 4 * s, ry + 16 * s); ctx.stroke();
    ctx.fillStyle = '#3f6a5a'; ctx.beginPath(); ctx.ellipse(rx, ry - 2, 30 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(160,230,190,0.35)'; ctx.beginPath(); ctx.ellipse(rx - 6 * s, ry - 4 * s, 18 * s, 2 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3a2a'; ctx.fillRect(rx - 9 * s, ry - 6 * s, 2 * s, 6 * s);
    ctx.fillStyle = '#2f5546'; circle(rx - 8 * s, ry - 10 * s, 7 * s); ctx.fill(); ctx.fillStyle = '#3f7a62'; circle(rx - 10 * s, ry - 12 * s, 3.5 * s); ctx.fill();
    if (k % 2 === 0) { ctx.fillStyle = 'rgba(255,214,120,0.2)'; circle(rx + 12 * s, ry - 6 * s, 12 * s); ctx.fill(); ctx.fillStyle = '#ffe08a'; ctx.fillRect(rx + 11 * s, ry - 8 * s, 2.5 * s, 3.5 * s); }
  }
  if (o.skyline !== false) wizSkyline(scrollX * 0.2, (o.skyY != null ? o.skyY : 380) - scrollY * 0.1);
}
// the school's leaning towers, far away (screen coords; the line where they stand is y)
// a lawn strip in world space: a darker soil-shadowed body, a lit top edge, grass tufts and the odd flower
// (placement from hash, so it never flickers; only the visible part is drawn by the callers)
function wizLawn(x0, y0, x1, y1, o = {}) {
  const top = o.top || '#5fb068', body = o.body || '#4f9a58', w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = body; ctx.fillRect(x0, y0, w, h);
  if (h > 60) { ctx.fillStyle = shade(body, 0.2); ctx.fillRect(x0, y0 + 60, w, h - 60); }
  ctx.fillStyle = top; ctx.fillRect(x0, y0, w, 8);
  ctx.fillStyle = tint(top, 0.3); ctx.fillRect(x0, y0, w, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x0, y0 + 8, w, 4);
  for (let x = Math.ceil(x0 / 14) * 14; x < x1 - 4; x += 14) {
    const hh = hash(x, 77);
    if (hh % 3 === 0) { ctx.fillStyle = top; ctx.beginPath(); ctx.moveTo(x - 3, y0 + 1); ctx.lineTo(x, y0 - 4 - (hh >> 3) % 4); ctx.lineTo(x + 3, y0 + 1); ctx.fill(); }
    if (h > 30 && hh % 7 === 2) { ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(x + (hh >> 5) % 10, y0 + 18 + (hh >> 9) % Math.max(1, Math.min(60, h - 24)), 6, 2); }
    if (!o.noFlowers && hh % 23 === 5) { ctx.fillStyle = ['#ffe9a8', '#ffb3d9', '#bfe3ff'][(hh >> 4) % 3]; circle(x, y0 - 2, 2.2); ctx.fill(); }
  }
}
function wizSkyline(sx, y) {
  const span = 1400;
  // a hazy far range of hills and smaller towers behind (paler, slower)
  ctx.fillStyle = '#5a3f80';
  ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, y - 40 - Math.sin((x + sx * 0.5) / 90) * 14 - Math.sin((x + sx * 0.5) / 37) * 5); ctx.lineTo(W + 20, y); ctx.closePath(); ctx.fill();
  for (let k = 0; k < 6; k++) {
    const x = ((k * 240 + 150 - sx * 0.5) % span + span) % span - 120, w = 22 + (k % 2) * 10, h = 70 + ((k * 53) % 50);
    ctx.fillRect(x, y - h, w, h); ctx.beginPath(); ctx.moveTo(x - 4, y - h); ctx.lineTo(x + w / 2, y - h - 30); ctx.lineTo(x + w + 4, y - h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,215,120,0.45)'; ctx.fillRect(x + w / 2 - 2, y - h + 14, 4, 6); ctx.fillStyle = '#5a3f80';
  }
  for (let k = 0; k < 7; k++) {
    const x = ((k * 200 + 40 - sx) % span + span) % span - 120, w = 46 + (k % 3) * 18, h = 120 + ((k * 37) % 90), lean = ((k % 3) - 1) * 0.06;
    ctx.save(); ctx.translate(x + w / 2, y); ctx.rotate(lean);
    // the stone tower: base colour, a moonlit left edge, a shaded right side, stone courses
    ctx.fillStyle = '#3a2d66'; ctx.fillRect(-w / 2, -h, w, h);
    ctx.fillStyle = '#31265a'; ctx.fillRect(w * 0.18, -h, w * 0.32, h);
    ctx.fillStyle = 'rgba(220,200,255,0.18)'; ctx.fillRect(-w / 2, -h, 2.5, h);
    ctx.fillStyle = 'rgba(20,10,50,0.25)'; for (let sy = -h + 14; sy < 0; sy += 14) ctx.fillRect(-w / 2, sy, w, 1);
    // a ring of battlements under the roof
    ctx.fillStyle = '#433474'; ctx.fillRect(-w / 2 - 4, -h - 2, w + 8, 7);
    // the cone roof: dark slate with a lit left slope and a gold finial and pennant
    const rh = 50 + (k % 2) * 20;
    ctx.fillStyle = '#2a2050'; ctx.beginPath(); ctx.moveTo(-w / 2 - 6, -h); ctx.lineTo(0, -h - rh); ctx.lineTo(w / 2 + 6, -h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(200,180,255,0.18)'; ctx.beginPath(); ctx.moveTo(-w / 2 - 6, -h); ctx.lineTo(0, -h - rh); ctx.lineTo(-w / 6, -h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(20,10,50,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); for (let q = 1; q < 4; q++) { const qy = -h - rh + rh * q / 4, hw = (w / 2 + 6) * q / 4; ctx.moveTo(-hw, qy); ctx.lineTo(hw, qy); } ctx.stroke();
    ctx.fillStyle = '#ffd25a'; circle(0, -h - rh - 2, 2.5); ctx.fill();
    ctx.fillStyle = k % 2 ? '#c85a6a' : '#5ab0c8'; ctx.beginPath(); ctx.moveTo(0, -h - rh - 2); ctx.lineTo(14 + Math.sin(G.clock * 3 + k) * 2, -h - rh + 2); ctx.lineTo(0, -h - rh + 6); ctx.closePath(); ctx.fill();
    // arched windows with a warm glow
    for (let wy = -h + 20; wy < -20; wy += 34) {
      ctx.fillStyle = 'rgba(255,215,120,0.14)'; circle(0, wy + 7, 11); ctx.fill();
      ctx.fillStyle = 'rgba(255,215,120,0.8)'; ctx.beginPath(); ctx.moveTo(-5, wy + 13); ctx.lineTo(-5, wy + 4); ctx.arc(0, wy + 4, 5, Math.PI, 0); ctx.lineTo(5, wy + 13); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a2050'; ctx.fillRect(-0.6, wy, 1.2, 13); ctx.fillRect(-5, wy + 7, 10, 1.2);
    }
    ctx.restore();
  }
  // the grounds in front of the towers: a gradient lawn with a lit crest and dark hedges
  const gg = ctx.createLinearGradient(0, y, 0, H); gg.addColorStop(0, '#3a2d66'); gg.addColorStop(1, '#2a2050');
  ctx.fillStyle = gg; ctx.fillRect(0, y, W, H - y);
  ctx.fillStyle = 'rgba(200,170,255,0.2)'; ctx.fillRect(0, y, W, 2);
  ctx.fillStyle = '#30255a'; for (let k = 0; k < 10; k++) { const hx = ((k * 150 + 60 - sx) % span + span) % span - 80; ctx.beginPath(); ctx.ellipse(hx, y + 2, 26, 10, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(hx + 22, y + 2, 16, 7, 0, Math.PI, Math.PI * 2); ctx.fill(); }
}
/* --- drawing: the layers --- */
function wizHideMask(st) { const h = wizCall(wizPh(st), 'hide', st); return Array.isArray(h) ? [!!h[0], !!h[1]] : [!!h, !!h]; }
function wizUnhide(st) { if (st.hid) { for (const p of G.players) if (st.hid[p.id]) p.alive = true; st.hid = null; } }
function wizDraw(st) {
  const ph = wizPh(st);
  wizUnhide(st);
  if (st.cut && st.cut.kind === 'end') { wizDrawEndScene(st); return; }
  ctx.save(); ctx.translate(-st.cam.x, -st.cam.y);
  wizCall(ph, 'drawBack', st);
  wizDrawHm(st.hm);
  wizCall(ph, 'draw', st);
  ctx.restore();
  // a phase that draws Pip and Bo itself: the engine skips them (it draws the players right after this hook)
  const m = wizHideMask(st);
  if (m[0] || m[1]) { st.hid = [false, false]; for (const p of G.players) if (m[p.id] && p.alive) { st.hid[p.id] = true; p.alive = false; } }
}
function wizDrawTop(st) {
  const ph = wizPh(st), big = wizBig(), z = big ? 1.4 : 1, end = st.cut && st.cut.kind === 'end';
  // robes, hats and wands over the players the engine just drew (screen coords; a hidden player is drawn by its class)
  const champ = wizChampOf(st), noHat = end && st.cut.hats;
  for (const p of G.players) if (p.alive && !wizCall(ph, 'plainHero', st, p)) wizDrawOutfit(p.id, p.x + p.w / 2, p.y + p.h, p.w, p.h, { face: p.face, sx: p.sx, sy: p.sy, tassel: champ === p.id, noHat });
  wizUnhide(st);
  ctx.save(); ctx.translate(-st.cam.x, -st.cam.y);
  if (!end) wizCall(ph, 'drawTop', st);
  // pop words
  for (const q of st.pops) {
    if (q.t < 0) continue;
    const k = q.t / 1.1, s2 = 0.7 + 0.5 * Math.min(1, q.t / 0.12);
    ctx.save(); ctx.globalAlpha = clamp((1.1 - q.t) / 0.4, 0, 1);
    bigText(q.text, clamp(q.x, st.cam.x + 60, st.cam.x + W - 60), q.y - k * 30, q.size * z, q.col, s2);
    ctx.restore();
  }
  ctx.restore();
  // screen coords: the "!" warnings
  for (const p of G.players) {
    if (!p.alive || end) continue;
    if (st.warn[p.id] > 0) { const bob = Math.abs(Math.sin(G.clock * 12)) * 5; bigText('!', p.x + p.w / 2, p.y - 24 - bob - wizHeadLift(st, p), 30 * z, '#ff5f6d', 1); }
  }
  // his speech bubble
  const sb = wizSayBox(st);
  if (sb) {
    const { fs, tw, th, side, bx, by, mx, my } = sb, a = clamp(Math.min(st.say.t / 0.12, (st.say.life - st.say.t) / 0.25), 0, 1);
    ctx.font = wizLilita(fs);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    rr(bx - tw / 2, by - th / 2, tw, th, th / 2); ctx.fill(); ctx.stroke();
    const ex = bx - side * (tw / 2 - 2);
    ctx.beginPath(); ctx.moveTo(ex, by - 7); ctx.lineTo(mx, my); ctx.lineTo(ex, by + 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillRect(ex - side * 4 - 2, by - 6, 4, 12);
    text(st.say.text, bx, by + 1, fs, C.ink, 'center');
    ctx.restore();
  }
}
const wizHeadLift = (st, p) => (st.cut && st.cut.kind === 'end' ? 0 : wizCall(wizPh(st), 'headLift', st, p) || 0);
// his speech bubble: beside his head (screen coords), under the strip and the news line. Null when he says nothing.
function wizSayBox(st) {
  const c = st.hm;
  if (!st.say || ((c.hidden || c.alpha <= 0) && !c.sayAt)) return null;
  const z = wizBig() ? 1.4 : 1;
  let fs = Math.round(16 * z);
  let hx, hy, hr, mx, my;
  if (c.sayAt) { hx = c.sayAt.x; hy = c.sayAt.y; hr = c.sayAt.r || 30; mx = hx; my = hy; }
  else { const P = wizHmPts(c); hx = P.head.x - st.cam.x; hy = P.head.y - st.cam.y; hr = P.head.r; mx = P.mouth.x - st.cam.x; my = P.mouth.y - st.cam.y; }
  ctx.font = wizLilita(fs);
  while (fs > 11 && ctx.measureText(st.say.text).width + 26 * z > W - 24) ctx.font = wizLilita(--fs);
  const tw = ctx.measureText(st.say.text).width + 26 * z, th = fs + 16 * z, B = wizStripBox();
  let side = c.face || 1;
  const gap = hr + 18 * z;
  if ((side < 0 && hx - gap - tw < 6) || (side > 0 && hx + gap + tw > W - 6)) side = -side;
  const bx = clamp(hx + side * (gap + tw / 2), tw / 2 + 6, W - tw / 2 - 6);
  let by = clamp(hy - hr * 0.6, B.y0 + B.h + th / 2 + 10, H - th / 2 - 10);
  const nb = wizTopBox(st);
  if (nb && bx + tw / 2 > nb.x0 - 4 && bx - tw / 2 < nb.x1 + 4 && by - th / 2 < nb.y1 + 6) by = Math.min(H - th / 2 - 10, nb.y1 + th / 2 + 8);
  return { fs, tw, th, side, bx, by, mx: clamp(mx, 4, W - 4), my: clamp(my, by - th, by + th * 1.5) };
}
function wizNewsBox(st) {
  const n = st.news;
  if (!n || G.introT > 0) return null;
  const big = wizBig(), B = wizStripBox(), h = big ? 36 : 28;
  let y = B.y0 + B.h + 6;
  let fs = big ? 19 : 14;
  ctx.font = wizFont(fs);
  while (fs > 11 && ctx.measureText(n.text).width + 34 > W - 40) ctx.font = wizFont(--fs);
  const w = Math.min(ctx.measureText(n.text).width + 34, W - 40);
  // a long line would run under the engine's class pill (top left, y 46-72): drop it below that pill
  const d = G.level && G.level.def;
  if (d && d.rooms) {
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    const pr = 14 + ctx.measureText(`${d.roomWord || 'Room'} ${d.roomIndex + 1} of ${d.roomCount}: ${d.title}`).width + 44;
    if (W / 2 - w / 2 < pr + 6 && y < 78) y = 78;
  }
  return { x0: W / 2 - w / 2, x1: W / 2 + w / 2, y0: y, y1: y + h, fs, h };
}
// the "Checkpoint: Class N" line after a resume: a gold pill of its own, under the room card while that is up, then under
// the news line (or in its place) for WIZ.cpNoteLife s of play. Null when there is none.
function wizCpNoteBox(st) {
  const n = st.cpNote;
  if (!n || (st.cut && st.cut.kind === 'end')) return null;
  const big = wizBig(), B = wizStripBox(), h = big ? 36 : 28, d = G.level && G.level.def, card = G.introT > 0;
  if (card && G.mode !== 'play') return null;
  let fs = big ? 19 : 14;
  ctx.font = wizFont(fs);
  while (fs > 11 && ctx.measureText(n.text).width + 34 > W - 40) ctx.font = wizFont(--fs);
  const w = Math.min(ctx.measureText(n.text).width + 34, W - 40), nb = card ? null : wizNewsBox(st);
  // (the room card, render.js drawIntro: from y 168, 120 tall with the action line, 22 more with the 1-player note)
  let y = card ? 168 + (d && d.act ? 120 : 92) + (d && typeof cpuTipNote === 'function' && cpuTipNote(d.tip) ? 22 : 0) + 8 : nb ? nb.y1 + 4 : B.y0 + B.h + 6;
  if (!card && !nb && d && d.rooms && y < 78) {   // (like the news line: never under the engine's class pill, top left)
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    if (W / 2 - w / 2 < 14 + ctx.measureText(`${d.roomWord || 'Room'} ${d.roomIndex + 1} of ${d.roomCount}: ${d.title}`).width + 44 + 6) y = 78;
  }
  return { x0: W / 2 - w / 2, x1: W / 2 + w / 2, y0: y, y1: y + h, fs, h, a: card ? clamp(G.introT / 0.5, 0, 1) : clamp(Math.min(1, (n.life - n.t) / 0.3), 0, 1) };
}
// what the top-centre lines cover during play (the news line and the checkpoint line): bubbles keep clear of it
function wizTopBox(st) {
  const nb = wizNewsBox(st), cb = G.introT > 0 ? null : wizCpNoteBox(st);
  return nb && cb ? { x0: Math.min(nb.x0, cb.x0), x1: Math.max(nb.x1, cb.x1), y0: nb.y0, y1: cb.y1 } : nb || cb;
}
// 1-player: where cpu-core's cpuDraw() will put the computer's own speech bubble over p (it draws after this HUD and
// knows nothing of the badges and hints here, so they make room for it): [x, y, w, h] or null. Same sums as cpuDraw.
function wizCpuSayBox(p) {
  try {
    if (typeof cpuSolo !== 'function' || !cpuSolo() || G.mode === 'title') return null;
    const b = CPU.bubbles[p.id];
    if (!b || b.t <= 0) return null;
    const br = cpuBrainFor(G.level.def);
    if (!p.alive && !(br && br.bubbleHidden)) return null;
    const at = br && br.bubblePos ? br.bubblePos(p) : { x: p.x + p.w / 2, y: p.y };
    if (!at) return null;
    const big = hudBig();
    ctx.font = `700 ${big ? 19 : 13}px "Atkinson Hyperlegible", sans-serif`;
    const w = ctx.measureText(b.text).width + (big ? 22 : 16), h = big ? 30 : 22;
    return [clamp(at.x - w / 2, 4, W - w - 4), clamp(at.y - 22 - h, 4, H - h - 4), w, h + 6];
  } catch (e) { return null; }
}
const wizUnder = (x0, y0, x1, y1) => G.players.some(p => p.alive && p.x + p.w > x0 - 4 && p.x < x1 + 4 && p.y + p.h > y0 - 4 && p.y - 8 < y1 + 4);

/* --- drawing: the ending scene (the core owns the screen): graduation night in the moonlit courtyard --- */
function wizDrawEndScene(st) {
  const c = st.cut, t = G.clock, gy = WIZ.endGround;
  wizDusk(t, 0, 0, { skyline: false, moonX: 480, moonY: 110 });
  // the school front: towers, lit windows, the great door
  ctx.fillStyle = WIZC.stoneDk; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  for (const [x, w, h, lean] of [[40, 120, 240, -0.03], [190, 90, 170, 0], [680, 90, 180, 0.02], [800, 130, 260, 0.04]]) {
    ctx.save(); ctx.translate(x + w / 2, gy); ctx.rotate(lean);
    ctx.fillStyle = WIZC.stone; ctx.fillRect(-w / 2, -h, w, h); ctx.strokeRect(-w / 2, -h, w, h);
    ctx.fillStyle = '#4a3a8a'; ctx.beginPath(); ctx.moveTo(-w / 2 - 8, -h); ctx.lineTo(0, -h - 70); ctx.lineTo(w / 2 + 8, -h); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = WIZC.candle; for (let wy = -h + 26; wy < -30; wy += 44) { rr(-8, wy, 16, 20, 7); ctx.fill(); }
    ctx.restore();
  }
  // the cheering school: a row of little hats behind the wall
  for (let k = 0; k < 16; k++) {
    const x = 60 + k * 56, hop = Math.max(0, Math.sin(t * 6 + k * 1.7)) * 8 * (c.t > 4 ? 1 : 0.3);
    ctx.fillStyle = ['#ff8a5c', '#5b95ff', '#9fe07f', '#ffd23f', '#b58cff'][k % 5]; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    rr(x - 9, gy - 72 - hop, 18, 20, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2b2f5e'; ctx.beginPath(); ctx.moveTo(x - 11, gy - 70 - hop); ctx.lineTo(x + 2, gy - 96 - hop); ctx.lineTo(x + 11, gy - 70 - hop); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = WIZC.stoneLt; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.fillRect(0, gy - 54, W, 18); ctx.strokeRect(-4, gy - 54, W + 8, 18);
  // the Blot, small and sorry, waving from its jar on the wall
  const jx = 600, jy = gy - 54;
  ctx.fillStyle = 'rgba(200,230,255,0.45)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(jx - 18, jy - 40, 36, 40, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#9a6a3e'; ctx.fillRect(jx - 20, jy - 46, 40, 8); ctx.strokeRect(jx - 20, jy - 46, 40, 8);
  ctx.fillStyle = WIZC.ink; ctx.beginPath(); ctx.ellipse(jx, jy - 10, 13, 9 + Math.sin(t * 3) * 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = WIZC.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(jx + 8, jy - 14); ctx.lineTo(jx + 14, jy - 24 + Math.sin(t * 9) * 4); ctx.stroke();
  ctx.fillStyle = '#ffffff'; circle(jx - 4, jy - 13, 3); ctx.fill(); circle(jx + 4, jy - 13, 3); ctx.fill();
  // spell sparks in the sky
  for (const f of c.fw) {
    const u = f.t / 1.3, r = 10 + u * 46;
    ctx.globalAlpha = clamp(1 - u, 0, 1);
    for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 + f.x; wizDrawStar(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r + u * u * 26, 4 - u * 2, k % 2 ? f.col : '#ffffff', { line: false }); }
    ctx.globalAlpha = 1;
  }
  // the courtyard flagstones
  ctx.fillStyle = '#5e587a'; ctx.fillRect(0, gy, W, H - gy);
  ctx.strokeStyle = 'rgba(28,26,54,0.35)'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x - 30, H); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(0, gy + 40); ctx.lineTo(W, gy + 40); ctx.stroke();
  wizDrawHm(st.hm);
  // the hats in the air (drawn without their owners); the winner's has the gold tassel
  if (c.hats) for (const h of c.hats) { ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot); wizDrawHat(c.hats.indexOf(h), 0, 0, 1.2, wizHatStars(st), wizChampOf(st) === c.hats.indexOf(h)); ctx.restore(); }
}

/* --- drawing: robes, hats and wands --- */
const wizChampOf = st => { const s = st && st.stats && st.stats.duel; return s && s.champ != null ? s.champ : -1; };
// the stars on a hat, in class order, each in its spell's colour (k: 0..n-1)
const WIZ_HAT_SPOTS = [[-5, -6], [4, -8], [-1, -14], [6, -16], [-4, -21], [3, -25], [-2, -31], [5, -34], [0, -39], [3, -45]];
// a floppy first-year hat, brim centre at (x, y), s = 1 for a player; n stars; tassel: the duel winner's gold tassel
function wizDrawHat(id, x, y, s, n, tassel) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round';
  const t = G.clock, flop = Math.sin(t * 2.2 + id) * 2;
  ctx.fillStyle = '#2b2f5e'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, 15, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, -1); ctx.quadraticCurveTo(-6, -30, 2, -44); ctx.quadraticCurveTo(10 + flop, -52, 16 + flop * 2, -44); ctx.quadraticCurveTo(8, -40, 5, -28); ctx.quadraticCurveTo(8, -12, 10, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PCOL[id]; ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(10, -2); ctx.lineTo(9.4, -6); ctx.lineTo(-9.4, -6); ctx.closePath(); ctx.fill();
  for (let k = 0; k < Math.min(n, 10); k++) {
    const [sx, sy] = WIZ_HAT_SPOTS[k], ph = WIZ_ORDER[k], sp = WIZ_CLASSES[ph].spell;
    const col = sp === 'frostflame' ? WIZ_SPELLS.frost.col : WIZ_SPELLS[sp].col;
    wizDrawStar(sx * (1 - (-sy) / 120) + (sy < -30 ? flop * 0.4 : 0), sy * 0.95, 2.6, col, { lw: 0.6, col2: sp === 'frostflame' ? WIZ_SPELLS.flame.col : null });
  }
  if (tassel) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(16 + flop * 2, -44); ctx.quadraticCurveTo(22 + flop, -38, 20, -28); ctx.stroke(); ctx.fillStyle = '#ffd23f'; ctx.fillRect(18, -30, 4, 7); }
  ctx.restore();
}
// the robe, hat and wand over a body drawn elsewhere: feet centre (x, y), body w x h, o: face, stars, tassel, noHat,
// noRobe, wand (false hides it), sx, sy
function wizDrawOutfit(id, x, y, w, h, o = {}) {
  const sx = o.sx || 1, sy = o.sy || 1, bw = w * sx, bh = h * sy, face = o.face || 1;
  ctx.save(); ctx.lineJoin = 'round';
  if (!o.noRobe) {
    // the robe: the lower part of the body, deep navy with a trim in the player's own colour, a collar clasp
    ctx.fillStyle = '#2b2f5e'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8;
    const top = y - bh * 0.3;
    ctx.beginPath(); ctx.moveTo(x - bw / 2 + 1, top); ctx.lineTo(x + bw / 2 - 1, top); ctx.lineTo(x + bw / 2 + 2, y - 1); ctx.lineTo(x - bw / 2 - 2, y - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PCOL[id]; ctx.fillRect(x - bw / 2 - 1, y - 4, bw + 2, 3);
    ctx.fillStyle = '#ffd23f'; circle(x, top + 2, 2); ctx.fill();
  }
  if (o.wand !== false) {
    // the stubby wand, sparking in the player's colour
    const hx = x + face * (bw / 2 + 1), hy = y - bh * 0.35, tx = hx + face * 9, ty = hy - 6;
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
    const tw = 0.5 + 0.5 * Math.sin(G.clock * 7 + id * 2);
    ctx.fillStyle = PCOL[id]; ctx.globalAlpha *= 0.6 + 0.4 * tw; circle(tx, ty, 2.2); ctx.fill();
  }
  ctx.restore();
  if (!o.noHat) wizDrawHat(id, x - face * 1, y - bh + 3, 0.5, o.stars != null ? o.stars : wizHatStars(G.mst), !!o.tassel);
}
// the player's wand tip (where spells come out): p's own coords (screen between ticks, world inside the tick)
const wizWandTip = p => ({ x: p.x + p.w / 2 + (p.face || 1) * (p.w / 2 + 10), y: p.y + p.h * 0.65 - 6 });

/* --- drawing: the HUD --- */
// the class strip, top centre: the class's place name and 12 slots (stars, the seal, the trophy; the current one lit)
function wizStripBox() {
  const big = wizBig(), n = WIZ_ORDER.length, sw = big ? 32 : 26, gap = big ? 4 : 3, w = n * sw + (n - 1) * gap + 24, h = big ? 62 : 52;
  return { x0: W / 2 - w / 2, y0: 6, w, h, sw, gap, big, labY: 6 + (big ? 13 : 11), slotY: 6 + (big ? 24 : 20) };
}
function wizSlotPos(i) { const B = wizStripBox(); return { x: B.x0 + 12 + i * (B.sw + B.gap) + B.sw / 2, y: B.slotY + B.sw / 2, r: B.sw / 2 }; }
function wizDrawStrip(st) {
  const B = wizStripBox(), cur = st.phaseNo, end = st.cut && st.cut.kind === 'end';
  ctx.save(); if (wizUnder(B.x0, B.y0, B.x0 + B.w, B.y0 + B.h)) ctx.globalAlpha = 0.45;
  ctx.fillStyle = 'rgba(30,20,66,0.86)'; rr(B.x0, B.y0, B.w, B.h, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(224,164,60,0.8)'; ctx.lineWidth = 2; rr(B.x0, B.y0, B.w, B.h, 14); ctx.stroke();
  text(end ? 'Graduation night' : st.cls.where + (st.cls.spellName ? ' · ' + st.cls.spellName : ''), W / 2, B.labY, B.big ? 15 : 11, '#f6d37a', 'center', 'body');
  const prog = end ? null : wizCall(wizPh(st), 'progress', st);
  for (let i = 0; i < WIZ_ORDER.length; i++) {
    const sp = wizSlotPos(i), x = sp.x - B.sw / 2, y = sp.y - B.sw / 2, done = end || i < cur, now = !end && i === cur;
    const won = st.stars[i] || (end && i === WIZ_STARN - 1), flying = st.fly && st.fly.i === i && st.fly.t < 1.9;
    ctx.fillStyle = now ? 'rgba(246,211,122,0.26)' : done ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)'; rr(x, y, B.sw, B.sw, 7); ctx.fill();
    if (now) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x, y, B.sw, B.sw, 7); ctx.stroke(); }
    ctx.save(); if (!won && !now) ctx.globalAlpha *= 0.28; if (flying) ctx.globalAlpha *= 0.25;
    wizDrawSpellIcon(WIZ_ORDER[i], sp.x, sp.y - (now && prog ? 2 : 0), B.sw * 0.36);
    ctx.restore();
    if (now && prog && prog.of > 0) {
      const n = Math.min(prog.of, 8), r = B.big ? 2.4 : 1.8, gap = r * 2.7, x0 = sp.x - (n - 1) * gap / 2, py = y + B.sw - r - 1;
      const filled = prog.of > 8 ? Math.round(prog.n / prog.of * 8) : prog.n;
      for (let k = 0; k < n; k++) { ctx.fillStyle = k < filled ? C.gold : 'rgba(255,255,255,0.3)'; circle(x0 + k * gap, py, r); ctx.fill(); }
    }
  }
  ctx.restore();
  // a spell just learned: the star leaps from her wand, splits to both hats, and one flies up to its slot
  if (st.fly) {
    const f = st.fly, sp = wizSlotPos(f.i), ph = WIZ_ORDER[f.i];
    const k1 = clamp(f.t / 0.9, 0, 1), e1 = k1 * k1 * (3 - 2 * k1);
    if (f.t < 1.0 && f.i < 10) for (const p of G.players) {
      if (!p.alive) continue;
      const tx = p.x + p.w / 2, ty = p.y - 14, x = f.x0 + (tx - f.x0) * e1, y = f.y0 + (ty - f.y0) * e1 - Math.sin(k1 * Math.PI) * 60;
      wizDrawSpellIcon(ph, x, y, 9 + 4 * Math.sin(k1 * Math.PI));
      if (f.t > 0.85 && !f.sparked) { f.sparked = true; for (const q of G.players) if (q.alive) burst(q.x + q.w / 2, q.y - 10, WIZ_CLASSES[ph].col, 10); }
    }
    const k = clamp((f.t - 0.8) / 0.9, 0, 1), e = k * k * (3 - 2 * k), pop = Math.min(1, f.t / 0.25);
    const x = f.x0 + (sp.x - f.x0) * e, y = f.y0 + (sp.y - f.y0) * e - Math.sin(k * Math.PI) * 30, s = (26 - 12 * e) * (0.4 + 0.6 * pop) * (B.sw / 26);
    if (k < 1) { ctx.save(); ctx.globalAlpha = 0.35 * (1 - e); ctx.fillStyle = '#fff3c4'; circle(x, y, s * 1.4 + Math.sin(G.clock * 9) * 3); ctx.fill(); ctx.restore(); wizDrawSpellIcon(ph, x, y, s * 0.6); }
  }
}
// what draws over (or under) each player's head: role badges, then hint bubbles (from 20-1)
function wizDrawHeads(st, rightBox, newsBox) {
  if (G.introT > 0) return;
  const big = wizBig(), B = wizStripBox();
  const clearTop = (x0, x1) => {
    let y = 4;
    if (x0 < 290) y = 80;
    if (x1 > B.x0 - 4 && x0 < B.x0 + B.w + 4) y = Math.max(y, B.y0 + B.h + 6);
    if (newsBox && x1 > newsBox.x0 - 4 && x0 < newsBox.x1 + 4) y = Math.max(y, newsBox.y1 + 6);
    if (rightBox && x1 > rightBox[0] - 4) y = Math.max(y, rightBox[1] + 6);
    return y;
  };
  const placed = [], sb = wizSayBox(st);
  if (sb) placed.push([sb.bx - sb.tw / 2, sb.by - sb.th / 2, sb.tw, sb.th]);
  if (st.swapT > 0) { const fs = big ? 46 : 36; ctx.font = wizLilita(fs); const w = ctx.measureText('Swap jobs!').width * 1.1; placed.push([W / 2 - w / 2, 150 - fs * 0.65, w, fs * 1.3]); }
  const hit = (x0, y0, w, h) => placed.find(r => x0 < r[0] + r[2] + 3 && x0 + w > r[0] - 3 && y0 < r[1] + r[3] + 3 && y0 + h > r[1] - 3);
  const place = (x0, w, h, k) => {
    let y = k.top - h, under = false;
    for (let n = 0; n < 4; n++) { const r = hit(x0, y, w, h); if (!r) break; y = r[1] - h - 4; }
    if (y < clearTop(x0, x0 + w)) {
      under = true; y = Math.min(k.below, H - h - 4);
      for (let n = 0; n < 4; n++) { const r = hit(x0, y, w, h); if (!r) break; y = r[1] + r[3] + 4; }
      k.below = y + h + 4;
    } else k.top = y - 4;
    placed.push([x0, y, w, h]);
    return { y, under };
  };
  // the computer's own bubble (1-player) takes its place first: badges go above it, and its head shows no core hint
  // meanwhile (the bubble is the computer talking; the hint would say the same thing twice)
  const cpuBox = G.players.map(p => wizCpuSayBox(p));
  for (const r of cpuBox) if (r) placed.push(r);
  const heads = G.players.filter(p => p.alive).map(p => ({ p, px: p.x + p.w / 2, top: p.y - 8 - wizHeadLift(st, p), below: p.y + p.h + 10 }));
  const roles = st.badgeT > 0 && !st.cut ? wizCall(wizPh(st), 'roles', st) : null;
  if (roles) for (const k of heads) {
    const word = roles[k.p.id];
    if (!word) continue;
    const fs = big ? 20 : 12, bh = fs + (big ? 10 : 8), a = clamp(st.badgeT / 0.4, 0, 1);
    ctx.font = wizFont(fs);
    const bw = ctx.measureText(word).width + 16, bx = clamp(k.px, bw / 2 + 4, W - bw / 2 - 4), was = [k.top, k.below];
    const pl = place(bx - bw / 2, bw, bh, k), y0 = pl.y;
    if (pl.under && st.hints[k.p.id] && !cpuBox[k.p.id]) { placed.pop(); [k.top, k.below] = was; continue; }
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = PCOL[k.p.id]; rr(bx - bw / 2, y0, bw, bh, bh / 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    text(word, bx, y0 + bh / 2 + 0.5, fs, '#ffffff', 'center', 'body');
    ctx.restore();
  }
  for (const k of heads) {
    const h = st.hints[k.p.id];
    if (!h || cpuBox[k.p.id]) continue;
    const a = clamp(Math.min(h.t, h.life - h.t) / 0.2, 0, 1), fs = big ? 23 : 12;
    ctx.font = wizFont(fs);
    const tw = ctx.measureText(h.text).width + (big ? 22 : 16), th = fs + (big ? 14 : 10), cx = clamp(k.px, tw / 2 + 4, W - tw / 2 - 4);
    const pl = place(cx - tw / 2, tw, th + 6, k), top = pl.under ? pl.y + 6 : pl.y;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = h.gold ? '#fff3c4' : '#ffffff'; ctx.strokeStyle = h.gold ? C.gold : PCOL[k.p.id]; ctx.lineWidth = 2;
    rr(cx - tw / 2, top, tw, th, th / 2); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    if (pl.under) { ctx.moveTo(k.px - 5, top + 1); ctx.lineTo(k.px + 5, top + 1); ctx.lineTo(k.px, top - 5); }
    else { ctx.moveTo(k.px - 5, top + th - 1); ctx.lineTo(k.px + 5, top + th - 1); ctx.lineTo(k.px, top + th + 5); }
    ctx.closePath(); ctx.fill();
    text(h.text, cx, top + th / 2 + 0.5, fs, C.ink, 'center', 'body');
    ctx.restore();
  }
}
// the class change: two tall classroom doors swing shut over the screen (k = 0 open .. 1 shut), with a brass ring each
function wizDrawWipe(k) {
  if (k <= 0) return;
  const e = k * k * (3 - 2 * k), half = W / 2 * e;
  ctx.save(); ctx.lineJoin = 'round';
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? 0 : W - half, x1 = side < 0 ? half : W;
    ctx.fillStyle = WIZC.wood; ctx.fillRect(x0, 0, x1 - x0, H);
    ctx.strokeStyle = WIZC.woodDk; ctx.lineWidth = 3;
    for (let x = side < 0 ? x1 - 60 : x0 + 60; side < 0 ? x > x0 : x < x1; x += side < 0 ? -60 : 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(side < 0 ? x1 : x0, 0); ctx.lineTo(side < 0 ? x1 : x0, H); ctx.stroke();
    ctx.fillStyle = '#3a3552'; for (const by of [90, H - 120]) ctx.fillRect(x0, by, x1 - x0, 14);
    const rx = side < 0 ? x1 - 34 : x0 + 34;
    ctx.strokeStyle = WIZC.band; ctx.lineWidth = 5; circle(rx, H / 2 + 20, 14); ctx.stroke();
  }
  ctx.restore();
}
function wizHud(st) {
  const ph = wizPh(st), big = wizBig(), end = st.cut && st.cut.kind === 'end', cut = st.cut && st.cut.kind === 'leave' ? st.cut : null;
  // the classroom doors swing shut at the end of a class, and open on the next one (under the HUD)
  if (cut && cut.shut) wizDrawWipe(clamp((cut.t - 2.6) / 1.1, 0, 1));
  else if (st.arriveT > 0) wizDrawWipe(st.arriveT / WIZ.arriveT);
  if (cut && cut.bell && !cut.shut) { ctx.save(); ctx.globalAlpha = clamp((cut.t - 1.2) / 0.3, 0, 1); bigText('Ding-dong! Class over!', W / 2, 150, big ? 40 : 30, C.gold, 1); ctx.restore(); }
  if (cut && cut.shut && cut.t > 3.6) { const nx = WIZ_CLASSES[WIZ_ORDER[Math.min(WIZ_ORDER.length - 1, st.phaseNo + 1)]]; bigText('Next: ' + nx.title, W / 2, H / 2 - 30, big ? 44 : 36, '#fff3c4', 1); }
  if (G.introT > 0.3 && G.mode === 'play' && !end) { ctx.save(); ctx.globalAlpha = clamp((G.introT - 0.3) / 0.4, 0, 1); bigText(st.cls.spellName ? 'Spell: ' + st.cls.spellName : st.cls.where, W / 2, 128, big ? 44 : 38, '#f6d37a', 1); ctx.restore(); }
  wizDrawStrip(st);
  const h = big ? 40 : 28, extra = end ? '' : wizCall(ph, 'hudText', st);
  const s = fmtTime(G.time) + (extra ? '   ' + extra : ''), SB = wizStripBox();
  let fs = big ? 20 : 14;
  ctx.font = wizFont(fs);
  while (fs > 11 && W - 14 - (ctx.measureText(s).width + 28) < SB.x0 + SB.w + 8) ctx.font = wizFont(--fs);
  const rw = ctx.measureText(s).width + 28, rx = pill(W - 14, 12, rw, h, 'right');
  text(s, W - 28, 12 + h / 2 + 0.5, fs, C.paper, 'right', 'body');
  const rightBox = [rx, 12 + h];
  const n = st.news, newsBox = wizNewsBox(st);
  if (newsBox) {
    const { x0, x1, y0, h: nh, fs: nfs } = newsBox, w = x1 - x0;
    ctx.save(); ctx.globalAlpha = clamp(Math.min(n.t / 0.15, (n.life - n.t) / 0.3), 0, 1) * (wizUnder(x0, y0, x1, newsBox.y1) ? 0.35 : 1);
    ctx.fillStyle = 'rgba(30,20,66,0.88)'; rr(x0, y0, w, nh, nh / 2); ctx.fill();
    if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x0, y0, w, nh, nh / 2); ctx.stroke(); }
    text(n.text, W / 2, y0 + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
    ctx.restore();
  }
  // back at a checkpoint: the gold "Checkpoint: Class N" line (its own pill: the classes' news lines never replace it)
  const noteBox = wizCpNoteBox(st);
  if (noteBox) {
    const { x0, x1, y0, h: nh, fs: nfs } = noteBox, w = x1 - x0;
    ctx.save(); ctx.globalAlpha = noteBox.a * (G.introT <= 0 && wizUnder(x0, y0, x1, noteBox.y1) ? 0.35 : 1);
    ctx.fillStyle = 'rgba(30,20,66,0.88)'; rr(x0, y0, w, nh, nh / 2); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x0, y0, w, nh, nh / 2); ctx.stroke();
    text(st.cpNote.text, W / 2, y0 + nh / 2 + 0.5, nfs, C.gold, 'center', 'body');
    ctx.restore();
  }
  if (!end) wizCall(ph, 'hud', st);
  // a player up under the level / room pills or the time pill: draw them again, a little see-through, on top
  for (const p of G.players) {
    if (!p.alive || p.y - 8 > 80 || (st.hid && st.hid[p.id])) continue;
    if (p.x < 294 || p.x + p.w > rightBox[0] - 4 && p.y - 8 < rightBox[1] + 4) { ctx.save(); ctx.globalAlpha = 0.75; drawPlayer(p); ctx.restore(); }
  }
  wizDrawHeads(st, rightBox, wizTopBox(st));
  if (st.swapT > 0 && G.introT <= 0) {
    const k = 1 - st.swapT / WIZ.swapT, a = clamp(st.swapT / 0.4, 0, 1);
    ctx.save(); ctx.globalAlpha = a; bigText('Swap jobs!', W / 2, 150, big ? 46 : 36, C.gold, 0.8 + 0.25 * Math.min(1, k * 6)); ctx.restore();
  }
  if (st.idle && !st.cut) { ctx.save(); ctx.globalAlpha = 0.85; bigText('Thimblewick sips her tea...', W / 2, H - 40, big ? 26 : 18, '#f6d37a', 1); ctx.restore(); }
}

/* --- sounds --- */
Sfx.extra.wizTalk = function () { for (let k = 0; k < 3; k++) this.tone(520 + Math.random() * 260, 0.05, 'triangle', 0.014, null, k * 0.07); };
Sfx.extra.wizGold = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.wizSwap = function () { [523, 784, 659, 988].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.045, null, i * 0.07)); };
// an Oops: a sad little fizzle (a wand spluttering)
Sfx.extra.wizBonk = function (p) { this.tone(700 * p, 0.18, 'sawtooth', 0.025, 160 * p); this.tone(220, 0.12, 'square', 0.02, 110, 0.12); };
Sfx.extra.wizPhase = function () { [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, null, i * 0.09)); };
Sfx.extra.wizGot = function () { [659, 784, 988, 1319, 1568].forEach((f, i) => this.tone(f, 0.15, 'sine', 0.05, null, i * 0.08)); };
Sfx.extra.wizCheer = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'sine', 0.05, null, i * 0.1)); };
Sfx.extra.wizPop = function () { this.tone(300 + Math.random() * 300, 0.16, 'sine', 0.03, 1000); };
// the school bell: two big bronze clangs
Sfx.extra.wizBell = function () { for (let k = 0; k < 2; k++) { this.tone(660, 0.6, 'sine', 0.05, 640, k * 0.42); this.tone(1320, 0.4, 'triangle', 0.02, 1300, k * 0.42); this.tone(990, 0.5, 'sine', 0.02, null, k * 0.42 + 0.02); } };
Sfx.extra.wizDoor = function () { this.tone(110, 0.3, 'square', 0.04, 70); this.tone(80, 0.25, 'triangle', 0.05, 50, 0.12); };
Sfx.extra.wizWhoosh = function () { this.tone(900, 0.3, 'sawtooth', 0.02, 200); };
Sfx.extra.wizTick = function () { this.tone(1200, 0.03, 'square', 0.03); };
Sfx.extra.wizDing = function () { this.tone(1046, 0.08, 'square', 0.04); this.tone(1568, 0.18, 'triangle', 0.05, null, 0.06); };
// one chime per spell (the same in its class and in the exam)
for (const [k, f] of [['zoom', 880], ['lift', 660], ['brew', 392], ['glow', 1047], ['morph', 740], ['size', 523], ['frost', 1175], ['flame', 330], ['shield', 587], ['door', 494], ['tame', 440]]) {
  Sfx.extra['wizSpell_' + k] = function () { this.tone(f, 0.12, 'triangle', 0.045, f * 1.5); this.tone(f * 2, 0.16, 'sine', 0.025, f * 2.5, 0.06); };
}

/* ===== STUB PHASES =====
   Tiny, trivially winnable stand-ins so the level runs end to end before (or without) the real class files. Each needs
   both players (an idle partner never clears). The real files replace them: WIZ_PHASES.<phase> = { ... }. */
const WIZ_STUBS = {};
// every class's stub: walk right together to the classroom door she floats by; the duel stub: first one there wins
function wizMakeStub(phase) {
  const duel = phase === 'duel';
  return {
    stub: true,
    setup(st) {
      const c = st.hm, ph = st.ph;
      ph.goal = 26 * T; ph.inT = 0; ph.won = -1; ph.t = 0;
      Object.assign(c, { x: 700, y: 260, s: 0.8, face: -1, pose: 'talk' });
    },
    step(st, dt) {
      const ph = st.ph, c = st.hm, ps = G.players;
      if (st.idle) { wizCoast(dt); return; }
      wizPlatform(st, dt);
      c.y = 260 + Math.sin(st.phT * 1.3) * 10;
      if (duel) {
        if (ph.won < 0) {
          const done = ps.filter(p => p.alive && p.x + p.w / 2 >= ph.goal + 60);
          if (done.length) {
            ph.won = done.length === 2 ? (done[0].x >= done[1].x ? done[0].id : done[1].id) : done[0].id;
            const s = wizStats(st); s.wins = [ph.won === 0 ? 1 : 0, ph.won === 1 ? 1 : 0]; s.champ = ph.won;
            wizNews(st, NAMES[ph.won] + ' is Top of the Class!', false, 2.5); wizCelebrate(st, 1.2); Sfx.play('wizCheer');
          }
        } else if ((ph.t += dt) > 1.4) wizPhaseDone(st, { say: NAMES[ph.won] + ' is Top of the Class!' });
        return;
      }
      const inGoal = ps.every(p => p.alive && p.x + p.w / 2 > ph.goal);
      ph.inT = inGoal ? ph.inT + dt : 0;
      if (ph.inT > 0.5) wizPhaseDone(st, {});
    },
    drawBack(st) {
      wizScreen(st, () => wizDusk(G.clock, 0, 0));
      const x = st.ph.goal + 60, y = wizGroundY(x, 300);
      ctx.fillStyle = WIZC.wood; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; rr(x - 30, y - 90, 60, 90, 26); ctx.fill(); ctx.stroke();
      wizScreen(st, () => text(st.cls.title + ' (coming soon)', W / 2, 110, 20, 'rgba(255,255,255,0.7)', 'center'));
    },
    roles: () => (duel ? ['Race!', 'Race!'] : ['Go!', 'Go!']),
    labels: () => ['cast', 'cast'],
    hudText: () => 'Stub',
    progress(st) { return duel ? null : { n: G.players.filter(p => p.x + p.w / 2 > st.ph.goal).length, of: 2 }; },
    statLine(st) { if (!duel) return ''; const s = st.stats.duel; return s && s.champ != null && s.champ >= 0 ? 'Top of the Class: ' + NAMES[s.champ] : ''; },
  };
}
for (const k of WIZ_ORDER) WIZ_STUBS[k] = wizMakeStub(k);
Object.assign(WIZ_PHASES, WIZ_STUBS);

/* ===== WIZ TEST HOOK (bots: window.__pipbo.MODES.wizschool.test) ===== */
MODES.wizschool.test = {
  WIZ, WIZ_PHASES, WIZ_STUBS, WIZ_ORDER, WIZ_CLASSES,
  index: wizLevelIndex,
  seed(n) { MODES.wizschool.rand = n == null ? Math.random : wizSeeded(n); },
  // start the level at class k (0-11, or a phase key) with fresh state; o: { seed, intro (true keeps the room card up) }.
  // Returns G.mst. (No checkpoint is read here: the level loads at class 1 and skips ahead.)
  jump(k = 0, o = {}) {
    const i = wizLevelIndex();
    if (typeof k === 'string') k = Math.max(0, WIZ_ORDER.indexOf(k));
    if (o.seed != null) this.seed(o.seed);
    const was = MODES.wizschool.cpOn, man = G.manual;
    MODES.wizschool.cpOn = false; G.manual = true;
    try { loadLevel(i); if (k > 0) { G.room = k - 1; nextRoom(); } } finally { MODES.wizschool.cpOn = was; G.manual = man; }
    if (!o.intro) { G.introT = 0; G.mst.arriveT = 0; }
    return G.mst;
  },
  stub: ph => !!(WIZ_PHASES[ph] && WIZ_PHASES[ph].stub),
  st: () => G.mst, ph: () => G.mst.ph, phase: () => G.mst.phase, calm: () => wizCalm(G.mst), pts: () => wizHmPts(G.mst.hm),
  done: o => wizPhaseDone(G.mst, o), ending: () => wizEnding(G.mst),
  bonk: (id, o) => wizBonk(G.mst, G.players[id], o), bump: o => wizTeamOops(G.mst, o),
  cp(on) { MODES.wizschool.cpOn = !!on; }, cpGet: wizCpGet, cpClear: wizCpClear,
};
