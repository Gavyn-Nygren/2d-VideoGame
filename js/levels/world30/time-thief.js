/* Pip & Bo - Level 30-1 The Time Thief (team boss, World 30 Time Chase): the core. */
'use strict';

/* ===== 30-1 The Time Thief (mode 'timethief', team boss) ===================================================
   Gavyn's own boss idea (Nov 2026): a time-travel chase. The Time Thief (a lanky rascal in a long coat covered in
   little clocks, riding a brass jet-powered time machine) hops through history stealing one famous thing from each
   moment. Pip and Bo chase him through a time portal at the end of every era, win each thing back, catch him at the
   End of Time and smash his machine together (everything flies home), then race each other home through one last
   portal. ONE level, 10 rooms ("eras"), each about 2-3 minutes for a good pair (Gavyn's rule), so the whole level is
   about 25-30 minutes: the core keeps a CHECKPOINT at the start of every era (in the browser too).
   Thrills are welcome (Gavyn: this is not a game for toddlers), but nobody is ever hurt: every fail is a soft fail,
   a counted "Bump!" with a short pop-back. The Thief is a rascal, not a monster; at the end he says sorry.

   ERAS, in order (phase key: title, when, the thing he steals there):
     dino      Dinosaur Asteroid, 66 million years ago    the T. rex egg           (scrolling)
     henge     Building Stonehenge, 2500 BC               the last great stone
     troy      The Fall of Troy, 1200 BC                  the wooden horse         (scrolling)
     olympics  The First Olympics, 776 BC                 the champion's wreath    (scrolling)
     vikings   Viking Voyage, 1000 AD                     the Vikings' sunstone    (scrolling)
     davinci   Leonardo's Flying Machine, 1490s           Leonardo's plans         (scrolling)
     wright    The First Flight, 1903                     the Flyer's propeller    (scrolling)
     moon      Moon Landing, 1969                         the Moon flag            (scrolling down)
     finale    The End of Time                            (smash the time machine; everything flies home)
     race      Portal Race Home                           (versus inside the boss level; laps in different eras)

   FILES. This file is the CORE: the world and level entries, MODES.timethief, the TTH_PHASES registry (with a working
   stub per phase), the Thief's drawing and poses, time portals, the stolen things (loot), soft fails, badges and job
   swaps, news / hint / speech bubbles, per-role act labels, gold help, the idle wait, phase changes (the portal
   cutscene), checkpoints, the HUD, the ending, stats and the test hook. Each era lives in its own file and REPLACES
   its stub by assigning TTH_PHASES.<phase> = { ... }:
     js/levels/world30/tth-dino.js  tth-henge.js  tth-troy.js  tth-olympics.js  tth-vikings.js  tth-davinci.js
                       tth-wright.js  tth-moon.js  tth-finale.js  tth-race.js           (loaded after this file)
     js/cpu/levels/world30/time-thief.js (core brain, TTH_BRAINS, stub brains)   then tth-dino.js ... tth-race.js
   If an era file is missing or throws before its assignment, the stub keeps the level playable (and the core brain
   plays the stub with its stub brain). Every top-level name starts with tth / TTH (an era file uses tth<Era> /
   TTH<ERA>, e.g. tthDino* / TTHDINO*); every Sfx.extra sound with 'tth'. (Not 'tt': 28-2 Tomb Torch owns that.)

   =================================================== PHASE CONTRACT ===================================================
   ROOMS. LEVELS has one level 'The Time Thief' (world 29, code 30-1, kind 'team', mode 'timethief', ownHUD, noFalls,
   roomWord 'Era') with 10 rooms in TTH_ORDER. EVERY room is ownStep: true, so the phase moves the players itself every
   live tick (tthPlatform(st, dt) does the usual grid platforming for you). Each era file supplies its own room fields
   at load time, so nobody edits this file:
       tthRoom('dino', { tip: '...', act: {...}, legend: {...}, map: [...18 rows of 32...], myField: ... });
   tthRoom(phase, fields) Object.assign()s fields into that room of the def (returns the room). Room fields the core
   reads: title, phase, tip (about 100 characters: the intro and pause cards show it), act ({ label, labels: [pip, bo]
   }: every room keeps an act, the touch pads always show the round button), legend (a setLegend object), map, theme
   (extra colours for C), look (a world index whose colours to use first), first (who takes job A first, 0 Pip / 1 Bo:
   it alternates by era; swap jobs about halfway through your era so both players do both jobs).
   The default map is empty air with the two spawns on a floor two tiles thick at the bottom (TTH_FLOOR_MAP); an era
   that draws its own world can use TTH_EMPTY_MAP (spawns only, no tiles) and paint everything in drawBack.
   Map chars: parseLevel takes 1 2 a b c E k F * G T H J R L M O Q U V @ and w s X ^ = o u # before you see the grid.
   Pick other characters for your own markers and turn them into '.' in L.grid in setup.

   STATE. Every hook gets st = G.mst (fresh on loadLevel).
     st.ph        a fresh {} for your phase's own state (reset at every phase start)
     st.phase     the phase key        st.phaseNo  0..9        st.phT  s since the phase began (not during the card)
     st.era       TTH_ERAS[st.phase]: { title, when, loot, lootName, col }
     st.thief     the Time Thief (see THIEF below)
     st.cam       { x, y }: your camera (world = screen + cam). The core shifts players and new particles into world
                  coords for the whole tick and back after it (like 20-1), so inside every hook that runs in the tick
                  (setup excepted: positions there are screen = world with cam 0), p.x / p.y are WORLD coords; between
                  ticks (draw hooks, name tags, bubbles) p.x / p.y are on SCREEN. Set st.cam in step.
     st.loot      [8 booleans]: the things won back so far (the core sets yours in tthPhaseDone)
     st.idle      true while no person has pressed anything for TTH.idleAfter (15) s (the computer doesn't count; a
                  person your present() hook vouches for does): the Thief waits, the level clock (G.time) stops, and
                  you must start no hazards (tthCalm(st))
     st.cut       a cutscene ({ kind: 'leave' | 'end' }) or null     st.celebT  s of calm after a big moment
     st.stats     { bumps: [pip, bo], team, kinds: {}, help: [texts], phaseT: [s per phase], <phase>: {} }: write your
                  results into st.stats.<phase> (tthStats(st)); it must stay plain JSON (it is saved in checkpoints)
     st.safe[id]  s left before p can be bumped again          st.warn[id]  s left of a red "!" over that player
   HOOKS of TTH_PHASES.<phase> (only setup is required; all get st first):
     setup(st, L)      the phase starts (room start, restart, checkpoint, test jump). Read your room fields (L.def),
                       build st.ph, place the Thief (st.thief.x / y / s / face / pose / jet / item), set st.cam.
     step(st, dt)      every live tick: not while the room card holds (G.introT > TTH.introHold), not in a cutscene.
                       Move the players here (tthPlatform(st, dt) or your own physics), run your hazards, call
                       tthPhaseDone(st, {...}) when the era is won. Players are in world coords (see st.cam).
     wait(st, dt)      instead of step while the room card holds (default: coast).
     coast(st, dt)     move things with no input during cards and the portal cutscene (default: tthCoast(dt), grid
                       physics). A scrolling or vehicle phase whose players don't stand on the grid must give its own
                       (keep the vehicle gliding gently, or hold everything still).
     drawBack(st)      behind the Thief     draw(st)  in front of the Thief, behind the players   (world coords: the
     drawTop(st)       over the players     core has done ctx.translate(-cam.x, -cam.y); tthScreen(st, fn) draws in
                                             screen coords inside them). Paint your era's whole backdrop in drawBack.
     hide(st)          -> true (or [pip, bo]) when you draw Pip and Bo yourself (tthDrawHero) in a vehicle or a split
                       screen: the engine then skips its own drawing of them. Keep p.x / p.y on the spot where you
                       draw each one anyway (name tags, hints, badges and the computer's bubbles sit over p).
     hud(st)           screen coords, after the core HUD (strip, time pill, news), before the head bubbles.
     hudText(st)       -> a short text for the top-right time pill (e.g. 'Logs 3/8').
     progress(st)      -> { n, of } for the pips under your slot of the era strip (checkpoints, laps, stones).
     labels(st)        -> [pip word, bo word]: the action button word per player (lowercase, 6 letters or fewer).
     legend(st)        -> a setLegend object when the keys change with the job (read when the labels change).
     roles(st)         -> [pip badge, bo badge] ('Carry!', 'Clear!') or null: shown over heads at the phase start and
                       on tthSwap(st).
     busy(st, p)       -> true while p is mid-teamwork (carried, on a ladder...): tthBonk never hits p then.
     present(st, p)    -> true while p is doing its job right without pressing anything (a lookout who stays up the
                       mast): it counts like a key press for the idle wait, so the Thief never "waits" for a person
                       who is playing. Give it when your era has a job that can go more than a few seconds with no key.
     headLift(st, p)   -> px your drawing adds over p's head (badges and hints sit above it).
     onBonk(st, p, kind)  onKill(st, p)  onRespawn(st, p)     (kill = the engine's spikes / falling off the grid)
     bubblePos(st, p)  -> { x, y } (screen) where to put the computer's speech bubble when you draw p elsewhere.
     stat(st)          -> one results fact { label, value } or null      statLine(st) -> a short results text or ''
                       (they run at the very end: read st.stats.<phase>, not st.ph. Keep them rare: 10 eras share one
                       results line. The race gives 'Race champ: Bo (2-1)'.)
   The core's own work never needs calling from a phase: it ticks the Thief, bubbles, the idle wait and the cutscenes.

   HELPERS (call them inside the tick unless noted):
     Phase flow  tthPhaseDone(st, { say, got, portal: { x, y } })  the era is won. got (default true in the 8 history
                 eras): the stolen thing is won back ("Saved: the T. rex egg!", it flies to the strip). The Thief says
                 `say`, a time portal opens (at portal, world coords; default: beside him) and he jets into it, the
                 screen warps and the next room starts after TTH.leaveT s. In the last room it plays the ending, then
                 levelClear(). Returns false if a cutscene is already running.
                 tthCalm(st) -> true in a calm moment (card, cutscene, celebration, idle): start no hazards then.
                 tthCelebrate(st, s) s of calm.
     Talk        tthSay(st, text, life)   the Thief's speech bubble (beside his head; at st.thief.sayAt {x, y} (screen)
                 when he is hidden).            tthNews(st, text, gold, life)  the news line (top centre)
                 tthHint(st, id, text, { life, gold, cpu })  a bubble over player id. In 1-player mode a hint for the
                 computer's player shows o.cpu instead (or nothing): never tell the person to press keys for it.
                 tthKey(id, 'act'|'jump'|'down'|'up'|'left'|'right'|'move')  that player's own key / button / touch
                 name for hint texts (keyboard, controller or touch).   tthPop(st, x, y, text, col, size)  a pop word
                 (world coords).   tthWarn(st, id, s)   a red "!" over player id for s seconds.
     Jobs        tthSwap(st)  "Swap jobs!" + the badges again + the new act words (your roles()/labels() decide them)
                 tthShowBadges(st, s)   tthActLabels(st) (refresh the act words now; the core also does it every tick)
     Gold help   tthHelp(st, text, { id, hint, life })  gold news + chime, kept in st.stats.help. Catch-up help is gold
                 and announced, never hidden: give it when a pair keeps failing the same spot (2-3 misses).
     Soft fails  tthBonk(st, p, { kind, word, fromX, to: { x, y }, safe, still, at: { x, y } })   p bumped: "Bump!" (or
                 word). Without `to` a knock-back away from fromX; with `to` (feet spot, world coords) a pop-back to
                 that safe spot; `still: true` only counts it and pops the word (at `at`, default over p): for riders
                 of a vehicle you move yourself. Counted in st.stats.bumps[p.id]; never while p is busy, already safe
                 (TTH.bonk.safe s) or in a cutscene. -> true if it hit.
                 tthBump(st, { word, x, y, kind, safe })  a TEAM soft fail (the shared vehicle crashed, the stone
                 rolled back): counted once in st.stats.team; you do the consequence. -> true if it counted.
     Players     tthPlatform(st, dt)  grid platforming for both players (like the framework: partners solid, riding on
                 heads, postStep with spikes). tthControl(st, p, dt): one player's input + jump physics only (for your
                 own collision). tthCoast(dt)  players stand and land with no input (grid). tthGroundY(x, y)  the grid
                 floor under (x, y). tthScreen(st, fn)  run a drawing fn in screen coords inside a world-coords hook.
                 tthHumanIds() -> the ids people play (both when the computer plays both, for bot tests).
                 tthDrawHero(id, x, y, { face, sx, sy, rot, s, alpha, stun, blink, vy })  draw Pip (0) or Bo (1) with
                 feet centre at (x, y), in the current transform: for vehicles, split screens and cutscenes.
                 INPUT: read p.input.left / right / down / jump / act (held) and p.pendingJump / p.pendingAct (a fresh
                 press: clear it when you use it). Never read the keyboard. "Up" is the jump button: W / ↑ / ▲ only set
                 input.jump; only a controller's stick-up sets input.up (its A button sets jump). So use tthUp(p)
                 (jump or up) as the one "up" wish, and never give "up" and "jump" two different jobs.
     THIEF       st.thief = { x, y (his feet on foot; the bottom centre of his machine when jet), s (scale: 1 = about
                 4 tiles tall on foot), face (1 looks right), pose, mood ('smug' | 'happy' | 'shocked' | 'sad'), jet
                 (true: he sits in his jet time machine, hovering, flame at the back), item (a loot kind hanging from
                 the machine's claw, or in his hand on foot; null for none), claw (0..1: how far the claw reaches
                 down), hidden, alpha, look ({x, y} to look at), sayAt, hitT, flame (0..1.5 jet power, 1 normal) }.
                 Poses: 'idle' 'laugh' 'shock' 'grab' 'point' 'run' 'sorry' 'wave' 'cheer' 'dizzy' 'sulk' 'hang'
                 (dangling from something by one hand). tthDrawThief(c) draws any thief-like object anywhere.
                 tthThiefPts(c) -> { head {x, y, r}, mouth {x, y}, top, feet {x, y}, claw {x, y} (where the item
                 hangs), body {x0, x1, y0, y1} } (world coords).
                 tthReact(st, mood, line, s)  a mood for s seconds (+ an optional line).
                 He is never hurt: bumps make him dizzy, losing a thing makes him sulk, then he jets off.
     Drawing kit tthDrawPortal(x, y, r, t, { open (0..1), col })  a swirling time portal with a clock rim.
                 tthDrawLoot(kind, x, y, s, t)  a stolen thing (centre x, y; s = 1 is about 36 px): 'egg' 'stone'
                 'horse' 'wreath' 'sunstone' 'plans' 'prop' 'flag'.   tthIcon(phase, x, y, r)  the strip icons.
                 tthSky(top, bottom, y0, y1)  a vertical gradient over the whole screen width (screen coords).
                 tthStars(t, n, alpha, seed)  twinkling stars (screen coords).   tthClockFace(x, y, r, t, o)
                 tthFont(px) / tthLilita(px) the two fonts.   tthBig() -> true on phones (use bigger HUD text: your
                 own HUD texts must be readable at 844x390, about 1.4x).
     Random      tthRand() (all gameplay randomness; tests seed it). No Math.random in gameplay.
   STATS.  The results card shows 4 tiles: Time + Record (framework), then the core's Bumps and Treasures; and 2 lines:
   the phases' statLine()s and stat()s as text, then the closing line. MEDAL goals (MODES.timethief.medals, built from
   TTH.medal, tuned with bots; js/medals.js shows them): play time (G.time, which stops while the Thief waits for an
   away person) and bumps (tthBumps).
   CHECKPOINTS (core only). The core saves { v, era, time, stats, loot } in the browser (store key 'tth:cp') for every
   era after the first: as soon as the era before it is won (tthPhaseDone, so quitting during the portal cutscene
   keeps the win) and again when it starts. Loading the level (R, "Restart this era" on the pause card, picking the
   level again, another day) starts at that era with the stats as they were at its start, and tells the pair so (a
   gold "Checkpoint" line on the room card and for 6 s of play). The CLOCK and the BUMPS are never rolled back: every
   TTH.cpEvery s of play (and on the pause card) the core adds live: { time, bumps, team } to the checkpoint, and a
   restart goes on from those, so the Time, the Record and the medal count everything that was played (restarting an
   era is no way to a better medal). The pause card has "Start over from Era 1" (two presses: it asks first);
   clearing the level forgets the checkpoint. A reload during the ending replays the race (its checkpoint stays until
   levelClear()). A stored value that is not a well-formed checkpoint of this version (TTH.cpV: raise it when the
   saved shape changes, e.g. when an era's stat() needs new fields in st.stats.<phase>) is dropped: Era 1.
   Bot tests (G.manual) never save or load one unless they ask (MODES.timethief.test.cp).

   BRAINS (js/cpu/levels/world30/): the core brain is cpuBrain('timethief'); it dispatches every step to
   TTH_BRAINS[st.phase] = { reset(bst, p, info), think(bst, p, o, dt, info, S) -> { left, right, jump, down, up, act,
   keep }, back(bst, p, info, S) }. See the core brain file's header.

   TEST HOOK. window.__pipbo.MODES.timethief.test: jump(k, { seed, intro }) starts the level at era k (0-9) with the
   room card skipped (intro: true keeps it); st(), ph(), phase(), calm(), done(o), ending(), bonk(id, o), seed(n),
   index(), stub(phase), cp(on), cpGet(), cpClear(). In Playwright:
       await page.evaluate(() => { const P = window.__pipbo; P.G.manual = true; P.MODES.timethief.test.jump(2); });
       then write P.G.players[i].input (and pendingJump / pendingAct for fresh presses) and call P.step(P.DT).
     node tools/w30/play.js <phase|all> [--who=pair|noisy|idle|kid] [--seeds=1,2,3] [--max=600] [--trace=5]
     node tools/w30/shot.js <phase> <seconds> out.png [--who=pair|idle] [--phone] [--solo=0|1]
     node tools/cpu-test.js 30-1 --who=pair   (the computer plays both; the whole level must clear)
   ====================================================================================================================== */

const TTH = {
  introHold: 0.6,              // phase.step waits while G.introT is above this (the room card)
  idleAfter: 15,               // s with no input from any person: the Thief waits (no hazards). (Not 10: jobs done
                               // right go 9-11 s without a key: the Olympics grabber, the race, the Viking lookout.)
  celebT: 1.6, leaveT: 4.4,    // calm after a big moment; the portal cutscene between eras
  badgeT: 5, swapT: 2.2, hintLife: 3, newsLife: 3.2, sayLife: 2.6, arriveT: 1.1,
  bonk: { vx: 230, vy: 300, stun: 0.7, slide: 0.3, safe: 1.4, popV: 320 },
  // the medal goals (MODES.timethief.medals): play time (s, idle waits not counted) and bumps (players' and the team's; race hits are no bumps).
  // PLACEHOLDER until the whole level is tuned with bots.
  medal: { gold: { t: 1800, bumps: 30 }, silver: { t: 2700, bumps: 80 } },
  thief: { s: 0.9 },
  endT: 8.6,                   // the ending, then levelClear()
  endGround: 456,
  cpKey: 'tth:cp', cpV: 1,     // the checkpoint's store key and its version (another version is dropped)
  cpEvery: 2,                  // s of play between two saves of the clock and the bumps into the checkpoint
  cpNoteLife: 6,               // s of play the "Checkpoint: Era N" line stays after a resume
  askOverMs: 700,              // "Start over from Era 1" asks first; a second press sooner than this is a double tap
};
const TTH_ORDER = ['dino', 'henge', 'troy', 'olympics', 'vikings', 'davinci', 'wright', 'moon', 'finale', 'race'];
const TTH_ERAS = {
  dino:     { title: 'Dinosaur Asteroid', when: '66 million years ago', loot: 'egg', lootName: 'the T. rex egg', col: '#ff8a3d' },
  henge:    { title: 'Building Stonehenge', when: '2500 BC', loot: 'stone', lootName: 'the last great stone', col: '#9fb0b8' },
  troy:     { title: 'The Fall of Troy', when: '1200 BC', loot: 'horse', lootName: 'the wooden horse', col: '#c98a4a' },
  olympics: { title: 'The First Olympics', when: '776 BC', loot: 'wreath', lootName: 'the champion\'s wreath', col: '#ffd23f' },
  vikings:  { title: 'Viking Voyage', when: '1000 AD', loot: 'sunstone', lootName: 'the Vikings\' sunstone', col: '#7fd6ff' },
  davinci:  { title: 'Leonardo\'s Wings', when: 'The 1490s', loot: 'plans', lootName: 'Leonardo\'s plans', col: '#e8cf9a' },
  wright:   { title: 'The First Flight', when: '1903', loot: 'prop', lootName: 'the Flyer\'s propeller', col: '#d9a066' },
  moon:     { title: 'Moon Landing', when: '1969', loot: 'flag', lootName: 'the Moon flag', col: '#d9dbe8' },
  finale:   { title: 'The End of Time', when: 'The End of Time', loot: null, lootName: '', col: '#b28dff' },
  race:     { title: 'Portal Race Home', when: 'All of time', loot: null, lootName: '', col: '#9fe07f' },
};
const TTH_LOOT = TTH_ORDER.map(k => TTH_ERAS[k].loot).filter(Boolean);   // the 8 things, in era order
const TTH_PHASES = {};
const TTH_NONE = { setup() {} };
const tthRand = () => MODES.timethief.rand();
const tthPh = st => (st && TTH_PHASES[st.phase]) || TTH_NONE;
function tthCall(ph, name, ...args) { const f = ph && ph[name]; return typeof f === 'function' ? f.apply(ph, args) : undefined; }
const tthBusy = (st, p) => !!tthCall(tthPh(st), 'busy', st, p);
const tthCalm = st => G.mode !== 'play' || G.introT > 0 || !!st.cut || st.celebT > 0 || !!st.idle;
// the bigger HUD text (news, hints, bubbles, the strip): on phones too (a landscape phone, 844x390, is about 0.67)
const tthBig = () => hudBig() || (typeof stageScale === 'number' && stageScale < 0.75);
const tthFont = px => '700 ' + px + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
const tthLilita = px => '400 ' + px + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
const tthStats = st => st.stats[st.phase] || (st.stats[st.phase] = {});
function tthSeeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const tthLevelIndex = () => LEVELS.findIndex(l => l.mode === 'timethief');

/* --- World 30 and its one level (added from here, like Worlds 24-28, so it never conflicts with other worlds) --- */
// the time tunnel: deep violet to warm purple, brass and gold
WORLDS[29] = { name: 'Time Chase', blurb: 'Chase the Time Thief through history, from the dinosaurs to the Moon, and win back everything he stole!',
  theme: { skyTop: '#1c1446', skyBot: '#6b4fb8', hillFar: '#3a2f7a', hillNear: '#2c2360', sun: 'rgba(255, 236, 170, 0.95)', sunGlow: 'rgba(255, 210, 120, 0.35)',
    stone: '#5b5f8a', stoneLight: '#7d82b3', stoneEdge: '#34365c', grass: '#f2c14e', grassDark: '#c8922c', plank: '#b0844a', plankDark: '#73522a', rope: '#e8dcb0', ropeDark: '#8a7a4a' } };
const TTH_EMPTY_MAP = [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)];
const TTH_FLOOR_MAP = [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '#'.repeat(32), '#'.repeat(32)];
LEVELS.push(
  // ----- BEGIN 30-1 The Time Thief (mode 'timethief', js/levels/world30/time-thief.js + tth-<era>.js) -----
  { name: 'The Time Thief', world: 29, kind: 'team', mode: 'timethief', ownHUD: true, noFalls: true, roomWord: 'Era',
    tip: 'Chase the Time Thief through history! Every era has two jobs, so work together.',
    act: { label: 'go' },
    map: TTH_FLOOR_MAP,
    rooms: TTH_ORDER.map((phase, k) => ({ phase, title: TTH_ERAS[phase].title, ownStep: true, first: k % 2, act: { label: 'go' }, map: TTH_FLOOR_MAP,
      tip: phase === 'race' ? 'Race to the portal on the right! First one there wins.' : 'Walk to the portal together to chase the Time Thief!' })),
  },
  // ----- END 30-1 The Time Thief -----
);

// Era files call this at load time to fill in their own room: Object.assign(room, fields). Returns the room.
function tthRoom(phase, fields) {
  const def = LEVELS[tthLevelIndex()];
  const room = def && def.rooms && def.rooms.find(r => r.phase === phase);
  if (!room) { console.warn('The Time Thief: no room with phase ' + phase); return null; }
  return Object.assign(room, fields || {});
}

/* --- talk, news, hints, badges, gold help --- */
function tthSay(st, text, life = TTH.sayLife) { st.say = { text, t: 0, life }; Sfx.play('tthTalk'); }
function tthNews(st, text, gold = false, life = TTH.newsLife) { st.news = { text, gold, t: 0, life }; }
function tthHelp(st, text, o = {}) {
  tthNews(st, text, true, o.life || 4); Sfx.play('tthGold'); st.stats.help.push(text);
  if (o.id != null && o.hint) tthHint(st, o.id, o.hint, { gold: true, life: o.life || 4 });
}
// a bubble over player id; in 1-player mode the computer's own bubble shows o.cpu (or nothing)
function tthHint(st, id, text, o = {}) {
  if (typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id)) text = o.cpu || null;
  if (text) st.hints[id] = { text, t: 0, life: o.life || TTH.hintLife, gold: !!o.gold };
}
function tthPop(st, x, y, text, col = C.paper, size = 22) { st.pops.push({ x, y, text, col, size, t: 0 }); }
function tthWarn(st, id, s = 0.8) { st.warn[id] = Math.max(st.warn[id], s); }
function tthShowBadges(st, t = TTH.badgeT) { st.badgeT = t; }
function tthSwap(st) { st.swapT = TTH.swapT; st.badgeT = TTH.badgeT; Sfx.play('tthSwap'); tthActLabels(st); }
function tthCelebrate(st, s = TTH.celebT) { st.celebT = Math.max(st.celebT, s); }
// the ids people play (both, when the computer plays both: bot tests)
function tthHumanIds() {
  const ids = [0, 1].filter(k => !(typeof cpuOn === 'function' && cpuOn(k)));
  return ids.length ? ids : [0, 1];
}
// each player's own keys, for hint texts (keyboard, controller or touch)
function tthDev(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
function tthKey(id, what) {
  const d = tthDev(id), solo = typeof cpuSolo === 'function' && cpuSolo(), pip = solo || id === 0;
  const kb = { act: pip ? 'F' : '/', jump: pip ? 'W' : '↑', up: pip ? 'W' : '↑', down: pip ? 'S' : '↓', left: pip ? 'A' : '←', right: pip ? 'D' : '→', move: pip ? 'A D' : '← →' };
  if (d === 'pad') return { act: glyph('act'), jump: glyph('a'), up: 'stick up', down: 'stick down', left: 'stick ◀', right: 'stick ▶', move: 'the stick' }[what] || '';
  if (d === 'touch') return { act: 'the round button', jump: '▲', up: '▲', down: '▼', left: '◀', right: '▶', move: '◀ ▶' }[what] || '';
  return kb[what] || '';
}

/* --- the Thief: state --- */
function tthNewThief() {
  return { x: 760, y: 300, s: TTH.thief.s, face: -1, pose: 'idle', mood: 'smug', baseMood: 'smug', moodT: 0, t: 0, jet: true, item: null, claw: 0.3,
    hidden: false, alpha: 1, look: null, sayAt: null, hitT: 0, blink: 0, blinkT: 2.2, flame: 1 };
}
function tthThiefTick(st, dt) {
  const c = st.thief;
  c.t += dt;
  if (c.hitT > 0) c.hitT = Math.max(0, c.hitT - dt);
  if (c.moodT > 0 && (c.moodT -= dt) <= 0) c.mood = c.baseMood || 'smug';
  c.blink -= dt; c.blinkT -= dt;
  if (c.blinkT <= 0) { c.blink = 0.12; c.blinkT = 1.8 + ((c.t * 7.3) % 2.4); }
}
function tthReact(st, mood, line, s = 2.2) {
  const c = st.thief;
  c.mood = mood; c.moodT = s;
  if (line) tthSay(st, line, Math.max(1.6, s));
}

/* --- players --- */
// A soft fail for one player: "Bump!" (counted), a knock-back, a pop-back to o.to, or (still) just the count.
function tthBonk(st, p, o = {}) {
  if (!p || st.safe[p.id] > 0 || st.cut || tthBusy(st, p)) return false;
  if (!o.still && !p.alive) return false;
  const B = TTH.bonk, kind = o.kind || 'bump', word = o.word || 'Bump!';
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
  st.stats.bumps[p.id]++; st.stats.kinds[kind] = (st.stats.kinds[kind] || 0) + 1;
  st.cpT = 0;   // (a bump goes into the checkpoint at once: no restart takes it back)
  const ax = o.at ? o.at.x : p.x + p.w / 2, ay = o.at ? o.at.y : p.y - 14;
  tthPop(st, ax, ay, word, '#ffffff', 22);
  Sfx.play('tthBonk', p.id); rumble(p.id, 0.6, 0.4, 160);
  burst(ax, ay + 20, '#ffffff', 8);
  tthCall(tthPh(st), 'onBonk', st, p, kind);
  return true;
}
// A soft fail for the team (the shared vehicle crashed...): counted once; the phase does the consequence.
function tthBump(st, o = {}) {
  if (st.cut || st.teamSafe > 0) return false;
  st.teamSafe = o.safe != null ? o.safe : TTH.bonk.safe;
  const kind = o.kind || 'bump';
  st.stats.team++; st.stats.kinds[kind] = (st.stats.kinds[kind] || 0) + 1;
  st.cpT = 0;
  const x = o.x != null ? o.x : st.cam.x + W / 2, y = o.y != null ? o.y : st.cam.y + 200;
  tthPop(st, x, y, o.word || 'Bump!', '#ffffff', 24);
  Sfx.play('tthBonk', 0); rumble(0, 0.6, 0.4, 160); rumble(1, 0.6, 0.4, 160);
  burst(x, y + 10, '#ffffff', 8);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.18);
  return true;
}
const tthControl = (st, p, dt) => control(p, dt);
// the "up" wish: W / ↑ / ▲ / A (jump) or a controller's stick-up
const tthUp = p => !!(p.input.jump || p.input.up);
// grid platforming for both players, as the framework does it (partners are solid, riders are carried)
function tthPlatform(st, dt) {
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
// players stand and land with no input (cards, cutscenes)
function tthCoast(dt) {
  for (const p of G.players) {
    p.pendingJump = false; p.pendingAct = false;
    const real = p.input;
    p.input = NO_INPUT;
    try { control(p, dt); if (p.alive) { moveX(p, p.vx * dt); moveY(p, p.vy * dt); postStep(p); } } finally { p.input = real; }
  }
}
function tthGroundY(x, y) {
  const tx = clamp(Math.floor(x / T), 0, COLS - 1), [a, b] = G.players;
  for (let ty = Math.max(0, Math.floor(y / T)); ty < ROWS; ty++) {
    const ch = tile(tx, ty);
    if (ch === '=' || solidFor(ch, a) || solidFor(ch, b)) return ty * T;
  }
  return H;
}
// the tick runs in world coords: players (and particles made meanwhile) shift by the camera and back
function tthInWorld(st, fn) {
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
function tthScreen(st, fn) { ctx.save(); ctx.translate(st.cam.x, st.cam.y); try { fn(); } finally { ctx.restore(); } }
// Pip (0) or Bo (1) with feet centre at (x, y) in the current transform (vehicles, split screens, cutscenes)
function tthDrawHero(id, x, y, o = {}) {
  const p = G.players[id], s = o.s || 1;
  const q = { id, w: p.w, h: p.h, x: -p.w / 2, y: -p.h, sx: o.sx || 1, sy: o.sy || 1, face: o.face || 1, vy: o.vy || 0, stun: o.stun ? 1 : 0,
    blink: o.blink != null ? (o.blink ? 1 : 0) : p.blink, stompSafe: 0, alive: true };
  ctx.save(); ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  if (s !== 1) ctx.scale(s, s);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  drawPlayer(q);
  ctx.restore();
}

/* --- the idle wait: no person pressed anything for TTH.idleAfter s --- */
function tthIdleTick(st, dt) {
  // (a person doing a job that needs no key right now, e.g. the lookout up the mast, is not away: the phase's present())
  const ph = tthPh(st);
  const any = tthHumanIds().some(k => { const i = G.players[k].input; return i.left || i.right || i.jump || i.down || i.up || i.act || !!tthCall(ph, 'present', st, G.players[k]); });
  if (any) {
    if (st.idle) { st.idle = false; tthSay(st, 'Aha! You\'re back!', 1.6); }
    st.idleT = 0; return;
  }
  st.idleT += dt;
  if (!st.idle && st.idleT >= TTH.idleAfter && !st.cut && G.introT <= 0) { st.idle = true; st.idleSayT = 0; }
  if (st.idle && (st.idleSayT -= dt) <= 0) { st.idleSayT = 7; tthSay(st, (st.idleN++) % 2 ? 'Tick, tock... anyone there?' : 'Hello? I can wait. I have all the time in the world!', 2.8); }
}

/* --- per-role action words on the touch buttons, the top-bar legend and the cards --- */
let tthLabelEls = null;
function tthActLabels(st) {
  const def = G.level && G.level.def;
  if (!def || !def.act) return;
  let want = tthCall(tthPh(st), 'labels', st);
  if (!want) want = def.act.labels || [def.act.label, def.act.label];
  const key = want[0] + '|' + want[1];
  if (st.labKey === key) return;
  st.labKey = key;
  def.act = Object.assign({}, def.act, { labels: [want[0], want[1]] });   // (a copy: the room's own def stays as written)
  try {
    const lg = tthCall(tthPh(st), 'legend', st);
    if (lg && G.mode === 'play') setLegend(lg);
    if (!tthLabelEls || !tthLabelEls.every(o => document.contains(o.el))) tthLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : -1;
      return { el, id };
    });
    for (const o of tthLabelEls) {
      const w = o.id < 0 ? (want[0] === want[1] ? want[0] : want[0] + '/' + want[1]) : want[o.id];
      if (o.el.textContent !== w) o.el.textContent = w;
    }
    if (typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* no page (tests): the cards still read def.act */ }
}

/* --- checkpoints: the start of every era after the first, kept in the browser --- */
const tthCpOn = () => !!MODES.timethief.cpOn || (!G.manual && G.mode === 'play');
const tthPlain = o => !!o && typeof o === 'object' && !Array.isArray(o);
const tthNum0 = n => typeof n === 'number' && isFinite(n) && n >= 0;
// a well-formed checkpoint of this version? (anything else in the store is dropped: the level starts at Era 1)
function tthCpOk(cp) {
  if (!tthPlain(cp) || cp.v !== TTH.cpV || !Number.isInteger(cp.era) || cp.era < 1 || cp.era >= TTH_ORDER.length) return false;
  if (!tthNum0(cp.time) || cp.time > 1e6 || !Array.isArray(cp.loot) || cp.loot.length !== TTH_LOOT.length || !cp.loot.every(x => typeof x === 'boolean')) return false;
  const s = cp.stats;
  if (!tthPlain(s) || !Array.isArray(s.bumps) || s.bumps.length !== 2 || !s.bumps.every(tthNum0) || !tthNum0(s.team)) return false;
  if (!tthPlain(s.kinds) || !Array.isArray(s.help) || !Array.isArray(s.phaseT) || (s.idleT !== undefined && !tthNum0(s.idleT))) return false;
  return TTH_ORDER.every(k => s[k] === undefined || tthPlain(s[k]));
}
function tthCpGet() {
  const cp = store.get(TTH.cpKey);
  if (tthCpOk(cp)) return cp;
  if (cp != null) tthCpClear();
  return null;
}
// the checkpoint for era `era` (1-9) with the clock at `time`: the stats and the things won back as they are now
function tthCpWrite(st, era, time) {
  st.cp = null;
  if (!tthCpOn() || era < 1 || era >= TTH_ORDER.length) return;
  let stats; try { stats = JSON.parse(JSON.stringify(st.stats)); } catch (e) { return; }
  st.cp = { v: TTH.cpV, era, time: Math.round(Math.max(0, time) * 10) / 10, stats, loot: st.loot.slice() };
  st.cpT = TTH.cpEvery;
  store.set(TTH.cpKey, st.cp);
}
function tthCpSave(st) { tthCpWrite(st, st.phaseNo, G.time); }
// the clock and the bumps so far go into this era's checkpoint, so a restart never rolls them back
function tthCpLive(st) {
  if (!st.cp || st.cp.era !== st.phaseNo || st.cut) return;   // (st.cp is only ever set while checkpoints are on)
  st.cp.live = { time: Math.round(Math.max(0, G.time) * 10) / 10, bumps: st.stats.bumps.slice(), team: st.stats.team };
  st.cpT = TTH.cpEvery;
  store.set(TTH.cpKey, st.cp);
}
function tthCpClear() { store.set(TTH.cpKey, null); if (G.mst) G.mst.cp = null; }

/* --- the mode: phases, the portal cutscene, the ending --- */
function tthInit(st) {
  st.stats = { bumps: [0, 0], team: 0, kinds: {}, help: [], phaseT: [], idleT: 0 };
  for (const k of TTH_ORDER) st.stats[k] = {};
  st.loot = TTH_LOOT.map(() => false);
  st.idleN = 0; st.ended = false; st.resumed = 0; st.cp = null; st.cpT = 0; st.cpNote = null; st.askOver = 0;
}
function tthStartPhase(st, L) {
  const def = L.def;
  st.phase = def.phase; st.phaseNo = def.roomIndex || 0; st.era = TTH_ERAS[st.phase] || TTH_ERAS.dino;
  setOutfit(TTH_OUTFITS[st.phase] || null); // Pip and Bo dress for the era (js/outfits-worlds.js)
  st.ph = {}; st.phT = 0; st.cam = { x: 0, y: 0 };
  st.cut = null; st.celebT = 0; st.say = null; st.news = null; st.hints = [null, null]; st.pops = []; st.fly = null;
  st.badgeT = 0; st.badgeArm = true; st.swapT = 0; st.safe = [0, 0]; st.teamSafe = 0; st.warn = [0, 0]; st.idleT = 0; st.idle = false; st.labKey = '';
  st.arriveT = st.phaseNo > 0 ? TTH.arriveT : 0;
  st.thief = tthNewThief();
  if (!st.stats[st.phase]) st.stats[st.phase] = {};
  if (typeof def.look === 'number') applyTheme(def.look, def.theme);
  if (G.mode === 'play') setLegend(def.legend || LEVELS[G.levelIndex].legend || null);
  if (!TTH_PHASES[def.phase]) console.warn('The Time Thief: no TTH_PHASES.' + def.phase);
  tthCpSave(st);
  tthCall(tthPh(st), 'setup', st, L);
  tthActLabels(st);
  // back at a checkpoint: say so in a line of its own (not the news slot: the eras' opening lines would replace it)
  st.cpNote = null;
  if (st.resumed === 1) { st.resumed = 2; st.cpNote = { text: 'Checkpoint: Era ' + (st.phaseNo + 1) + '. Pause to start over from Era 1.', t: 0, life: TTH.cpNoteLife }; }
}
function tthCoastPhase(st, dt) { const ph = tthPh(st); if (ph.coast) tthCall(ph, 'coast', st, dt); else tthCoast(dt); }
function tthTick(st, dt) {
  const ph = tthPh(st);
  if (G.introT <= 0) st.phT += dt;
  tthIdleTick(st, dt);
  if (st.celebT > 0) st.celebT = Math.max(0, st.celebT - dt);
  if (st.arriveT > 0) st.arriveT = Math.max(0, st.arriveT - dt);
  if (st.say && (st.say.t += dt) >= st.say.life) st.say = null;
  if (st.news && (st.news.t += dt) >= st.news.life) st.news = null;
  if (st.cpNote && G.introT <= 0 && !st.cut && (st.cpNote.t += dt) >= st.cpNote.life) st.cpNote = null;   // (s on screen)
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
  tthThiefTick(st, dt);
  if (st.cut) { tthCutStep(st, dt); if (G.mst === st && st.cut && st.cut.kind === 'leave') tthCoastPhase(st, dt); return; }
  if (G.introT > TTH.introHold) {
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
    if (ph.wait) tthCall(ph, 'wait', st, dt); else tthCoastPhase(st, dt);
    tthActLabels(st);
    return;
  }
  if (st.badgeArm) { st.badgeArm = false; st.badgeT = TTH.badgeT; }
  tthCall(ph, 'step', st, dt);
  tthActLabels(st);
}
function tthStep(st, dt) {
  if (!st.thief) return;
  if (st.cut && st.cut.kind === 'end') { tthEndStep(st, dt); return; }
  tthInWorld(st, () => tthTick(st, dt));
}
// The era is won. o.say: the Thief's line; o.got (default: true in the 8 history eras): the stolen thing is won back;
// o.portal { x, y } (world): where the portal opens (default: beside the Thief, on screen). The next room starts after
// TTH.leaveT s (the last room plays the ending). False if a cutscene is already running.
function tthPhaseDone(st, o = {}) {
  if (st.cut) return false;
  st.stats.phaseT[st.phaseNo] = Math.round(st.phT * 10) / 10;
  const def = G.level.def, era = st.era, li = TTH_LOOT.indexOf(era.loot);
  const got = li >= 0 && o.got !== false;
  if (got) {
    st.loot[li] = true;
    const c = st.thief;
    if (c.item === era.loot) c.item = null;
    st.fly = { kind: era.loot, i: li, t: 0, life: 1.7 };
    tthNews(st, 'Saved: ' + era.lootName + '!', true, 3.4);
    Sfx.play('tthGot');
  }
  if (def.roomIndex >= def.roomCount - 1) return tthEnding(st, o);
  // the next era's checkpoint at once (not only when it starts): quitting during the portal cutscene keeps this win
  tthCpWrite(st, st.phaseNo + 1, G.time + TTH.leaveT);
  const c = st.thief;
  let px, py;
  if (o.portal) { px = o.portal.x; py = o.portal.y; }
  else { px = clamp(c.x + (c.face || 1) * 130, st.cam.x + 110, st.cam.x + W - 110); py = clamp(c.y - 70, st.cam.y + 130, st.cam.y + H - 150); }
  st.cut = { kind: 'leave', t: 0, said: false, say: o.say || (got ? 'Bah! Keep it! I\'ll steal something even BETTER!' : 'You\'ll never catch me! Ha ha!'), px, py, open: 0, wx: px - st.cam.x, wy: py - st.cam.y };
  Sfx.play('tthPhase');
  return true;
}
function tthCutStep(st, dt) {
  const c = st.cut, b = st.thief;
  if (c.kind !== 'leave') return;
  c.t += dt;
  if (!c.said) { c.said = true; b.pose = b.pose === 'dizzy' ? 'dizzy' : 'sulk'; tthSay(st, c.say, 2.2); }
  // the portal opens, he dives in, the screen warps after him
  if (c.t > 1.5) {
    if (!c.go) { c.go = true; c.x0 = b.x; c.y0 = b.y; c.s0 = b.s; b.pose = b.jet ? 'point' : 'run'; b.face = c.px >= b.x ? 1 : -1; b.flame = 1.5; Sfx.play('tthPortal'); }
    c.open = Math.min(1, c.open + dt * 2.2);
    const k = clamp((c.t - 1.8) / 0.9, 0, 1), e = k * k * (3 - 2 * k);
    if (!b.hidden) {
      const ty = c.py + (b.jet ? 30 : 50) * (1 - e);
      b.x = c.x0 + (c.px - c.x0) * e; b.y = c.y0 + (ty - c.y0) * e; b.s = c.s0 * (1 - 0.8 * e); b.alpha = 1 - clamp((k - 0.75) / 0.25, 0, 1);
      if (k >= 1) { b.hidden = true; b.sayAt = null; st.say = null; Sfx.play('tthZoom'); }
    }
  }
  if (c.t > 2.9 && !c.warp) { c.warp = true; Sfx.play('tthWarp'); for (const p of G.players) rumble(p.id, 0.3, 0.5, 400); }
  c.wx = c.px - st.cam.x; c.wy = c.py - st.cam.y;
  if (c.t >= TTH.leaveT) nextRoom();
}
// The ending (after the race home): the core owns the screen. Home in the present: the Thief says sorry, promises to
// guard time instead, waves; clock confetti; then levelClear().
function tthEnding(st, o = {}) {
  if (st.cut && st.cut.kind === 'end') return false;
  st.cut = { kind: 'end', t: 0, step: 0, fw: [], fwT: 0, line: o.say || null };
  st.cam = { x: 0, y: 0 }; st.pops = []; st.hints = [null, null]; st.news = null; st.badgeT = 0; st.swapT = 0; st.warn = [0, 0]; st.fly = null;
  const c = st.thief, gy = TTH.endGround;
  Object.assign(c, { x: W / 2, y: gy, s: 1.05, face: 1, pose: 'cheer', mood: 'happy', baseMood: 'happy', moodT: 0, jet: false, item: null, hidden: false, alpha: 1, sayAt: null, look: null });
  G.players.forEach((p, k) => Object.assign(p, { alive: true, respawnT: 0, x: W / 2 + (k ? 170 : -170) - p.w / 2, y: gy - p.h, vx: 0, vy: 0, stun: 0, knockT: 0, grounded: true, face: k ? -1 : 1, sx: 1, sy: 1 }));
  Sfx.play('tthPhase');
  return true;
}
function tthEndStep(st, dt) {
  const c = st.cut, b = st.thief, gy = TTH.endGround;
  c.t += dt;
  tthThiefTick(st, dt);
  if (st.say && (st.say.t += dt) >= st.say.life) st.say = null;
  for (let k = 0; k < 2; k++) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  for (const q of st.pops) q.t += dt;
  // players: no input, a happy hop now and then, on the ending's flat ground
  for (const p of G.players) {
    p.pendingJump = false; p.pendingAct = false;
    p.vy += PHYS.g * dt; p.y += p.vy * dt;
    if (p.y + p.h >= gy) { if (!p.grounded && p.vy > 200) { p.sx = 1.2; p.sy = 0.8; } p.y = gy - p.h; p.vy = 0; p.grounded = true; }
    const want = W / 2 + (p.id ? 120 : -120) - p.w / 2;
    if (c.t > 1.6 && Math.abs(p.x - want) > 2) { p.x += Math.sign(want - p.x) * Math.min(Math.abs(want - p.x), 140 * dt); }
    p.face = b.x > p.x + p.w / 2 ? 1 : -1;
  }
  const hop = (s = 0.6) => { for (const p of G.players) if (p.grounded) { p.vy = -PHYS.jumpV * s; p.grounded = false; p.sx = 0.8; p.sy = 1.25; } };
  const at = (n, time) => c.step === n && c.t >= time && ++c.step;
  if (at(0, 0)) { tthSay(st, c.line || 'Home again! What a race!', 2.2); hop(0.5); }
  if (at(1, 2.0)) { b.pose = 'sorry'; b.mood = 'sad'; tthSay(st, 'I\'m sorry I stole history...', 2.2); }
  if (at(2, 3.8)) {
    st.hints[0] = { text: 'History is safe!', t: 0, life: 2.4, gold: true }; st.hints[1] = { text: 'Every bit of it!', t: 0, life: 2.4, gold: true };
    hop(0.7); Sfx.play('tthCheer');
  }
  if (at(3, 5.4)) { b.pose = 'wave'; b.mood = 'happy'; tthSay(st, 'From now on I\'ll GUARD time. Friends?', 2.8); hop(0.55); Sfx.play('tthGot'); }
  // little clocks pop like fireworks over the town
  if (c.t > 3.6 && (c.fwT -= dt) <= 0) {
    c.fwT = 0.34 + tthRand() * 0.3;
    c.fw.push({ x: 90 + tthRand() * (W - 180), y: 70 + tthRand() * 150, t: 0, col: ['#ff8fc7', '#ffd23f', '#7fd6ff', '#9fe07f', '#ffffff', '#b28dff'][Math.floor(tthRand() * 6)] });
    Sfx.play('tthPop');
  }
  for (const f of c.fw) f.t += dt;
  if (c.fw.length > 4) c.fw = c.fw.filter(f => f.t < 1.3);
  if ((G.tickN % 9) === 0 && c.t > 3.8) confetti(80 + tthRand() * (W - 160), 40 + tthRand() * 60);
  if (at(4, TTH.endT)) { st.ended = true; tthCpClear(); levelClear(); }
}

// each era plays the song of the world it visits (js/music-tracks.js); the End of Time and the race home play the boss song
const TTH_MUSIC = { dino: 'dino', henge: 'wizard', troy: 'escapes', olympics: 'summer', vikings: 'viking', davinci: 'castle', wright: 'sky', moon: 'space' };
MODES.timethief = {
  medals: { bronze: 'Catch the Time Thief and save history', goals: [
    { key: 'time', gold: TTH.medal.gold.t, silver: TTH.medal.silver.t },
    { key: 'bumps', gold: TTH.medal.gold.bumps, silver: TTH.medal.silver.bumps, word: 'bump' },
  ] },
  medalValues() { const st = G.mst; return st && st.stats ? { bumps: tthBumps(st) } : {}; },
  music() { const st = G.mst, k = st && st.phase; return k && TTH_MUSIC[k] ? { song: TTH_MUSIC[k] } : null; },
  rand: Math.random,   // gameplay randomness (tthRand); tests may swap in a seeded one (MODES.timethief.test.seed)
  cpOn: false,         // tests: true makes checkpoints work under G.manual too
  setup(st, L) {
    tthInit(st);
    const cp = tthCpOn() ? tthCpGet() : null;
    if (!cp) { tthStartPhase(st, L); return; }
    // back at the checkpoint: the era, the clock, the stats and the things won back so far
    // (the clock and the bumps go on from the last play, cp.live: restarting an era never takes them back)
    Object.assign(st.stats, cp.stats);
    for (let k = 0; k < st.loot.length; k++) st.loot[k] = !!cp.loot[k];
    st.resumed = 1;
    G.time = cp.time;
    const lv = tthPlain(cp.live) ? cp.live : {};
    if (tthNum0(lv.time)) G.time = Math.max(G.time, lv.time);
    if (Array.isArray(lv.bumps)) for (let k = 0; k < 2; k++) if (tthNum0(lv.bumps[k])) st.stats.bumps[k] = Math.max(st.stats.bumps[k], lv.bumps[k]);
    if (tthNum0(lv.team)) st.stats.team = Math.max(st.stats.team, lv.team);
    G.room = cp.era - 1;
    nextRoom();   // (it calls room() below, which starts the phase)
  },
  room(k, L) { tthStartPhase(G.mst, L); },
  step(dt) {
    const st = G.mst;
    tthStep(st, dt);
    // the clock stops while the Thief waits for an away person: the medal and the record count play time only
    if (st.thief && st.idle && !st.cut && G.mode === 'play') { G.time = Math.max(0, G.time - dt); st.stats.idleT += dt; }
    st.askOver = 0;   // (playing again: "Start over from Era 1" asks anew)
    if (st.cp && (st.cpT -= dt) <= 0) tthCpLive(st);
  },
  onKill(p) { const st = G.mst; if (st.thief && !(st.cut && st.cut.kind === 'end')) tthCall(tthPh(st), 'onKill', st, p); },
  onRespawn(p) { const st = G.mst; if (st.thief && !(st.cut && st.cut.kind === 'end')) tthCall(tthPh(st), 'onRespawn', st, p); },
  draw() { const st = G.mst; if (st.thief) tthDraw(st); },
  drawTop() { const st = G.mst; if (st.thief) tthDrawTop(st); },
  hud() { const st = G.mst; if (st.thief) tthHud(st); },
  stats() { return tthStatsOut(G.mst); },
  // the pause card (js/ui.js): "Restart this era" and "Start over from Era 1" while a later era is being played.
  // Starting over throws away up to 25 minutes, so it takes two presses: the first one only asks.
  pauseExtra() {
    const st = G.mst;
    if (!st || !st.thief || !(st.phaseNo > 0)) return null;
    tthCpLive(st);   // ("Restart this era" goes on from this clock)
    return { replay: 'Restart this era', more: [{ label: st.askOver ? 'Really start over? Press again' : 'Start over from Era 1', arg: 'startover' }] };
  },
  pauseAct(arg) {
    if (arg !== 'startover') return;
    const st = G.mst, now = Date.now();
    if (!st.askOver) { st.askOver = now; if (typeof showPauseCard === 'function') showPauseCard(); return; }
    if (now - st.askOver < TTH.askOverMs) return;   // (a double tap is not a yes)
    tthCpClear(); loadLevel(G.levelIndex);
  },
};

// The results card: the framework's Time and Record tiles, then Bumps and Treasures (4 tiles), and two lines.
const tthBumps = st => st.stats.bumps[0] + st.stats.bumps[1] + st.stats.team;
function tthStatsOut(st) {
  const bumps = tthBumps(st), saved = st.loot.filter(Boolean).length;
  const out = [{ label: 'Bumps', value: bumps }, { label: 'Treasures', value: saved + ' of ' + st.loot.length }];
  const bits = [];
  for (const ph of TTH_ORDER.slice().reverse()) {   // (the race first: it is the last thing they did)
    const P = TTH_PHASES[ph];
    if (!P) continue;
    const tile = tthCall(P, 'stat', st), line = tthCall(P, 'statLine', st);
    if (tile && tile.label) bits.push(tile.label + ': ' + (tile.values ? tile.values.join(' - ') : tile.value));
    if (line) bits.push(line);
  }
  if (bits.length) out.push(bits.map(l => l + '.').join(' '));
  out.push((bumps === 0 ? 'Not one bump! ' : '') + 'History is safe, and the Time Thief guards it now!');
  return out;
}

/* --- drawing: the Thief --- */
const TTHC = { coat: '#5b3a9e', coatDk: '#3d2573', coatLt: '#7b56c4', skin: '#f3d9b8', skinDk: '#d9b48c', hat: '#3d2573', brass: '#d9a441', brassDk: '#9a6f22', brassLt: '#f6d37a',
  glass: '#8fe3e0', cream: '#fff4d6', flame: '#7fe9ff', flameIn: '#ffffff', boot: '#2a2140' };
const TTH_JET_LIFT = 24;   // how far up his body sits when he rides the machine (local units)
// pose geometry: bob (units, + is down), lean (rad), arms (0 = hanging down, PI/2 = forward, PI = up), mouth, legs
function tthThiefGeo(c) {
  const t = c.t, p = c.pose;
  const g = { bob: Math.sin(t * 2.4) * 1.5, lean: 0, armF: 0.35 + Math.sin(t * 1.7) * 0.06, armB: -0.25, mouth: 'grin', legs: 'stand', hat: 0, watch: true, tails: Math.sin(t * 2.1) * 0.06 };
  switch (p) {
    case 'laugh': g.bob = Math.abs(Math.sin(t * 11)) * -3; g.lean = -0.12; g.mouth = 'laugh'; g.armF = 0.9; g.armB = -0.9; break;
    case 'shock': g.lean = -0.16; g.mouth = 'o'; g.armF = 2.6; g.armB = -2.6; g.hat = 7 + Math.sin(t * 20) * 1.5; g.watch = false; break;
    case 'grab': g.lean = 0.3; g.armF = 1.75; g.armB = 1.3; g.mouth = 'grin'; g.watch = false; break;
    case 'point': g.lean = 0.12; g.armF = 1.6; g.armB = -0.5; g.watch = false; break;
    case 'run': g.lean = 0.22; g.legs = 'run'; g.armF = 1.1 + Math.sin(t * 14) * 0.7; g.armB = -0.2 - Math.sin(t * 14) * 0.7; g.tails = 0.35 + Math.sin(t * 9) * 0.12; g.bob = Math.abs(Math.sin(t * 14)) * -3; g.watch = false; break;
    case 'sorry': g.lean = 0.2; g.bob = 3; g.mouth = 'frown'; g.armF = 0.12; g.armB = -0.08; g.hat = -1; g.watch = false; break;
    case 'wave': g.armF = 2.7 + Math.sin(t * 9) * 0.35; g.armB = -0.3; g.mouth = 'smile'; g.watch = false; break;
    case 'cheer': g.bob = Math.abs(Math.sin(t * 7)) * -7; g.armF = 2.8; g.armB = -2.8; g.mouth = 'smile'; g.hat = 3; g.watch = false; break;
    case 'dizzy': g.lean = Math.sin(t * 5) * 0.18; g.mouth = 'wobble'; g.armF = 0.6; g.armB = -0.6; g.hat = 2 + Math.sin(t * 7) * 2; g.watch = false; break;
    case 'sulk': g.lean = 0.08; g.mouth = 'frown'; g.armF = 0.9; g.armB = 0.6; g.watch = false; break;   // arms crossed-ish
    case 'hang': g.armF = 3.05; g.armB = -0.4 + Math.sin(t * 6) * 0.3; g.mouth = 'o'; g.legs = 'dangle'; g.lean = Math.sin(t * 3) * 0.1; g.watch = false; break;
  }
  if (c.mood === 'shocked' && g.mouth === 'grin') g.mouth = 'o';
  if (c.mood === 'sad' && g.mouth === 'grin') g.mouth = 'frown';
  if (c.mood === 'happy' && g.mouth === 'grin') g.mouth = 'smile';
  if (c.jet) { g.legs = 'none'; g.bob = Math.sin(t * 3) * 4; g.tails = 0.3 + Math.sin(t * 8) * 0.1; }
  if (c.hitT > 0) g.lean += Math.sin(c.hitT * 40) * 0.12;
  return g;
}
// a local point (units; x toward where he looks, y up is negative) -> world
function tthThiefP(c, lx, ly) { return { x: c.x + lx * c.s * (c.face || 1), y: c.y + ly * c.s }; }
function tthThiefPts(c) {
  const g = tthThiefGeo(c), up = c.jet ? -TTH_JET_LIFT - 34 + g.bob : g.bob, bx = c.jet ? -8 : 0;
  const head = tthThiefP(c, bx + 2, -98 + up), mouth = tthThiefP(c, bx + 9, -91 + up), top = tthThiefP(c, bx + 1, -134 + up);
  const clawLen = 12 + clamp(c.claw || 0, 0, 1) * 46;
  const claw = c.jet ? tthThiefP(c, 16, -6 + g.bob + clawLen) : tthThiefP(c, 20, -58 + g.bob);
  const w = (c.jet ? 70 : 26) * c.s, y0 = top.y, y1 = c.jet ? c.y + (g.bob - 6) * c.s : c.y;
  return { head: { x: head.x, y: head.y, r: 15 * c.s }, mouth, top, feet: { x: c.x, y: c.y }, claw, body: { x0: c.x - w, x1: c.x + w, y0, y1 } };
}
function tthClockFace(x, y, r, t, o = {}) {
  ctx.fillStyle = o.fill || TTHC.cream; ctx.strokeStyle = o.rim || C.ink; ctx.lineWidth = o.lw || Math.max(1, r * 0.16);
  circle(x, y, r); ctx.fill(); ctx.stroke();
  if (o.ticks) { ctx.lineWidth = Math.max(0.8, r * 0.07); for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78); ctx.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92); ctx.stroke(); } }
  ctx.strokeStyle = o.hands || C.ink; ctx.lineCap = 'round';
  const a1 = t * (o.speed || 1.6) - Math.PI / 2, a2 = t * (o.speed || 1.6) / 12 + 1;
  ctx.lineWidth = Math.max(1, r * 0.14); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a1) * r * 0.7, y + Math.sin(a1) * r * 0.7); ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.18); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a2) * r * 0.45, y + Math.sin(a2) * r * 0.45); ctx.stroke();
}
function tthDrawThief(c) {
  if (!c || c.hidden || c.alpha <= 0) return;
  const g = tthThiefGeo(c), t = c.t;
  ctx.save();
  ctx.globalAlpha *= clamp(c.alpha, 0, 1);
  ctx.translate(c.x, c.y); ctx.scale(c.s * (c.face || 1), c.s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (c.jet) {
    ctx.translate(0, g.bob);
    // the jet flame and nozzle (at the back)
    const fl = clamp(c.flame == null ? 1 : c.flame, 0, 1.6), len = (26 + Math.sin(t * 40) * 6 + Math.sin(t * 23) * 4) * fl;
    if (fl > 0.05) {
      ctx.fillStyle = TTHC.flame; ctx.beginPath(); ctx.moveTo(-78, -46); ctx.quadraticCurveTo(-84 - len * 0.6, -36 - Math.sin(t * 30) * 3, -80 - len, -34); ctx.quadraticCurveTo(-84 - len * 0.6, -32, -78, -24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = TTHC.flameIn; ctx.beginPath(); ctx.moveTo(-78, -41); ctx.quadraticCurveTo(-80 - len * 0.4, -35, -79 - len * 0.55, -34.5); ctx.quadraticCurveTo(-80 - len * 0.4, -33, -78, -29); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#4a4466'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-58, -48); ctx.lineTo(-80, -50); ctx.lineTo(-80, -20); ctx.lineTo(-58, -22); ctx.closePath(); ctx.fill(); ctx.stroke();
    // a tail fin and the antenna
    ctx.fillStyle = TTHC.coatLt; ctx.beginPath(); ctx.moveTo(-50, -58); ctx.lineTo(-70, -80); ctx.lineTo(-34, -60); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-28, -60); ctx.lineTo(-34, -86); ctx.stroke();
    ctx.fillStyle = Math.sin(t * 9) > 0 ? '#ff5f6d' : '#ffd23f'; circle(-34, -88, 3.5); ctx.fill(); ctx.stroke();
    // the claw arm under the machine, and what it holds
    const cl = 12 + clamp(c.claw || 0, 0, 1) * 46;
    ctx.strokeStyle = '#4a4466'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(16, -12); ctx.lineTo(16, -12 + cl - 8); ctx.stroke();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    const cy = -12 + cl - 8, op = c.item ? 0.5 : 0.25 + Math.sin(t * 5) * 0.12;
    ctx.beginPath(); ctx.moveTo(16, cy); ctx.quadraticCurveTo(16 - 12 * (0.6 + op), cy + 6, 16 - 7 * (0.4 + op), cy + 15); ctx.moveTo(16, cy); ctx.quadraticCurveTo(16 + 12 * (0.6 + op), cy + 6, 16 + 7 * (0.4 + op), cy + 15); ctx.stroke();
    if (c.item) { ctx.save(); ctx.scale(c.face || 1, 1); tthDrawLoot(c.item, 16 * (c.face || 1), cy + 22, 0.9, t); ctx.restore(); }
    ctx.save(); ctx.translate(-8, -TTH_JET_LIFT - 34);
  } else {
    ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(0, 0, 26, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(0, g.bob);
  }
  // --- his body (legs, coat, arms, head, hat), origin at his feet ---
  ctx.rotate(g.lean);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  if (g.legs !== 'none') {
    const sw = g.legs === 'run' ? Math.sin(t * 14) * 12 : g.legs === 'dangle' ? Math.sin(t * 6) * 4 : 0;
    for (const [lx, d] of [[-7, -1], [7, 1]]) {
      const fx = lx + sw * d, fy = g.legs === 'run' ? -Math.max(0, Math.sin(t * 14) * d) * 6 : 0;
      ctx.strokeStyle = TTHC.boot; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(lx, -34); ctx.lineTo(fx, -4 + fy); ctx.stroke();
      ctx.fillStyle = TTHC.boot; ctx.beginPath(); ctx.moveTo(fx - 5, fy); ctx.lineTo(fx - 5, -7 + fy); ctx.lineTo(fx + 4, -7 + fy); ctx.quadraticCurveTo(fx + 15, -6 + fy, fx + 16, -1 + fy); ctx.lineTo(fx + 16, fy); ctx.closePath(); ctx.fill();
    }
  }
  // back arm
  const arm = (sx, a, front) => {
    const hx = sx + Math.sin(a) * 27, hy = -80 - Math.cos(a) * -27;
    ctx.strokeStyle = front ? TTHC.coatLt : TTHC.coatDk; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(sx, -80); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = TTHC.skin; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(hx, hy, 5); ctx.fill(); ctx.stroke();
    return { x: hx, y: hy };
  };
  arm(-10, g.armB, false);
  // the long coat with fluttering tails, and its little clocks
  const tl = g.tails * 40;
  ctx.fillStyle = TTHC.coat; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-14, -86); ctx.lineTo(14, -86); ctx.lineTo(23 - tl * 0.2, -28); ctx.lineTo(14 - tl * 0.5, -22); ctx.lineTo(7 - tl * 0.4, -29); ctx.lineTo(-1 - tl * 0.7, -20);
  ctx.lineTo(-9 - tl * 0.6, -28); ctx.lineTo(-16 - tl, -20); ctx.lineTo(-24 - tl * 0.8, -27); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = TTHC.coatLt; ctx.beginPath(); ctx.moveTo(3, -86); ctx.lineTo(13, -86); ctx.lineTo(9, -62); ctx.closePath(); ctx.fill();
  ctx.fillStyle = TTHC.brass; for (const by of [-74, -62, -50]) { circle(3, by, 1.8); ctx.fill(); }
  const CL = [[-7, -70, 5, 2.2], [10, -52, 4.2, -3.1], [-4, -52, 5.5, 1.4], [11, -38, 4, 4.3], [-13, -38, 4.4, -2.2]];
  for (const [kx, ky, kr, sp] of CL) tthClockFace(kx - tl * (ky > -45 ? 0.3 : 0), ky, kr, t + kx, { speed: sp, lw: 1.3 });
  // head
  ctx.fillStyle = TTHC.skin; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; circle(2, -98, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = TTHC.skinDk; ctx.beginPath(); ctx.moveTo(13, -99); ctx.lineTo(21, -95); ctx.lineTo(13, -93); ctx.closePath(); ctx.fill(); ctx.stroke();   // a pointy nose
  // brass goggles
  for (const ex of [-3, 8]) {
    ctx.fillStyle = TTHC.glass; ctx.strokeStyle = TTHC.brassDk; ctx.lineWidth = 2.6; circle(ex, -101, 5.6); ctx.fill(); ctx.stroke();
    if (c.pose === 'dizzy') { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.beginPath(); for (let a = 0; a < 9; a += 0.5) { const r = a * 0.5; ctx.lineTo(ex + Math.cos(a + t * 6) * r, -101 + Math.sin(a + t * 6) * r); } ctx.stroke(); }
    else if (c.blink > 0) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex - 3, -101); ctx.lineTo(ex + 3, -101); ctx.stroke(); }
    else { ctx.fillStyle = C.ink; circle(ex + 1.4, -101 + (g.mouth === 'frown' ? 1.5 : 0), 2.3); ctx.fill(); }
  }
  ctx.strokeStyle = TTHC.brassDk; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8.5, -101); ctx.lineTo(-12, -100); ctx.stroke();
  // moustache and mouth
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(9, -93); ctx.quadraticCurveTo(3, -89, -3, -93); ctx.quadraticCurveTo(-6, -95, -5, -97); ctx.moveTo(9, -93); ctx.quadraticCurveTo(13, -89, 17, -92); ctx.stroke();
  ctx.lineWidth = 2;
  if (g.mouth === 'laugh' || g.mouth === 'o') { ctx.fillStyle = '#7a2a3a'; ctx.beginPath(); ctx.ellipse(8, -87, g.mouth === 'o' ? 3 : 5, g.mouth === 'o' ? 3.6 : 3 + Math.abs(Math.sin(t * 11)) * 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  else { ctx.beginPath(); if (g.mouth === 'frown') { ctx.moveTo(3, -86); ctx.quadraticCurveTo(8, -89, 12, -86); } else if (g.mouth === 'wobble') { ctx.moveTo(2, -87); ctx.quadraticCurveTo(5, -90, 8, -87); ctx.quadraticCurveTo(10, -85, 13, -88); } else { ctx.moveTo(2, -89); ctx.quadraticCurveTo(8, g.mouth === 'smile' ? -83 : -85, 13, -89); } ctx.stroke(); }
  // top hat with a clock on the band
  ctx.save(); ctx.translate(1, -110 - g.hat); ctx.rotate(-0.1);
  ctx.fillStyle = TTHC.hat; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 19, 4.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-11, -1); ctx.lineTo(-12, -23); ctx.lineTo(12, -23); ctx.lineTo(11, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = TTHC.brass; ctx.fillRect(-11, -8, 22, 5);
  tthClockFace(0, -11, 5.5, t, { speed: 5, lw: 1.3 });
  ctx.restore();
  // front arm, and his pocket watch on a chain
  const hand = arm(11, g.armF, true);
  if (g.watch) {
    const sw = Math.sin(t * 2.6) * 5;
    ctx.strokeStyle = TTHC.brassDk; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.quadraticCurveTo(hand.x + sw * 0.5, hand.y + 9, hand.x + sw, hand.y + 16); ctx.stroke();
    tthClockFace(hand.x + sw, hand.y + 21, 5.5, t, { speed: 3, fill: TTHC.brassLt, lw: 1.4 });
  } else if (!c.jet && c.item) { ctx.save(); ctx.translate(hand.x + 6, hand.y - 2); ctx.scale(c.face || 1, 1); tthDrawLoot(c.item, 0, 0, 0.8, t); ctx.restore(); }
  ctx.restore();
  if (c.jet) {
    // the brass pod (over his legs), its windshield and the big clock dial
    ctx.fillStyle = TTHC.brass; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; rr(-60, -60, 122, 50, 22); ctx.fill(); ctx.stroke();
    ctx.fillStyle = TTHC.brassDk; ctx.beginPath(); ctx.moveTo(-52, -22); ctx.quadraticCurveTo(0, -4, 54, -22); ctx.quadraticCurveTo(52, -11, 40, -10); ctx.lineTo(-38, -10); ctx.quadraticCurveTo(-50, -11, -52, -22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = TTHC.brassLt; rr(-50, -55, 60, 6, 3); ctx.fill();
    ctx.fillStyle = 'rgba(143,227,224,0.55)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(26, -60); ctx.quadraticCurveTo(40, -86, 58, -62); ctx.lineTo(56, -56); ctx.closePath(); ctx.fill(); ctx.stroke();
    tthClockFace(-6, -35, 16, t, { speed: 9, ticks: true, lw: 2.5 });
    ctx.fillStyle = TTHC.brassDk; for (const rx of [-48, -30, 18, 36, 52]) { circle(rx, -17 - Math.abs(rx) * 0.06, 1.8); ctx.fill(); }
    ctx.fillStyle = '#ff5f6d'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; circle(34, -34, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#9fe07f'; circle(46, -38, 3); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

/* --- drawing: portals, loot, icons, skies --- */
function tthDrawPortal(x, y, r, t, o = {}) {
  const k = o.open != null ? clamp(o.open, 0, 1) : 1;
  if (k <= 0) return;
  const e = 1 - (1 - k) * (1 - k), col = o.col || '#b28dff';
  ctx.save(); ctx.translate(x, y); ctx.scale(0.74 * e, e);
  const gl = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.5);
  gl.addColorStop(0, 'rgba(255,255,255,0.0)'); gl.addColorStop(0.6, 'rgba(178,141,255,0.28)'); gl.addColorStop(1, 'rgba(178,141,255,0)');
  ctx.fillStyle = gl; circle(0, 0, r * 1.5); ctx.fill();
  const g2 = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
  g2.addColorStop(0, '#fff7d6'); g2.addColorStop(0.25, '#7fe9ff'); g2.addColorStop(0.6, col); g2.addColorStop(1, '#2a1a5e');
  ctx.fillStyle = g2; circle(0, 0, r); ctx.fill();
  ctx.lineCap = 'round';
  for (let a = 0; a < 3; a++) {   // the swirl
    ctx.strokeStyle = a === 1 ? 'rgba(255,255,255,0.75)' : 'rgba(42,26,94,0.55)'; ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    for (let q = 0; q <= 26; q++) { const u = q / 26, ang = t * 3 + a * 2.094 + u * 4.4, rad = r * (0.08 + 0.86 * u); const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad; if (q) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.stroke();
  }
  // the brass clock rim
  ctx.strokeStyle = TTHC.brassDk; ctx.lineWidth = r * 0.13; circle(0, 0, r); ctx.stroke();
  ctx.strokeStyle = TTHC.brassLt; ctx.lineWidth = r * 0.05; circle(0, 0, r * 1.02); ctx.stroke();
  ctx.strokeStyle = TTHC.cream; ctx.lineWidth = Math.max(1.5, r * 0.045);
  for (let n = 0; n < 12; n++) { const a = n * Math.PI / 6 - t * 0.5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95); ctx.lineTo(Math.cos(a) * r * 1.07, Math.sin(a) * r * 1.07); ctx.stroke(); }
  ctx.restore();
}
// a stolen thing, centre (x, y); s = 1 is about 36 px
function tthDrawLoot(kind, x, y, s = 1, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  switch (kind) {
    case 'egg':
      ctx.rotate(Math.sin(t * 3) * 0.08);
      ctx.fillStyle = '#f6efd8'; ctx.beginPath(); ctx.moveTo(0, -17); ctx.bezierCurveTo(11, -17, 14, 2, 13, 6); ctx.bezierCurveTo(12, 17, -12, 17, -13, 6); ctx.bezierCurveTo(-14, 2, -11, -17, 0, -17); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8fbf6a'; for (const [ex, ey, er] of [[-5, -4, 3], [5, 3, 3.5], [-3, 9, 2.5], [3, -9, 2]]) { circle(ex, ey, er); ctx.fill(); }
      break;
    case 'stone':
      ctx.fillStyle = '#9aa3ab'; ctx.beginPath(); ctx.moveTo(-9, 17); ctx.lineTo(-11, -12); ctx.quadraticCurveTo(-9, -18, -2, -17); ctx.lineTo(7, -16); ctx.quadraticCurveTo(12, -14, 11, -6); ctx.lineTo(10, 17); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c3cad0'; ctx.fillRect(-7, -12, 4, 20);
      ctx.fillStyle = '#7fae6a'; circle(5, 6, 2.6); ctx.fill(); circle(2, -7, 1.8); ctx.fill();
      break;
    case 'horse':
      ctx.fillStyle = '#b9793c';
      ctx.beginPath(); ctx.moveTo(-14, 6); ctx.lineTo(-14, -4); ctx.quadraticCurveTo(-13, -8, -8, -8); ctx.lineTo(3, -8); ctx.lineTo(6, -18); ctx.lineTo(15, -15); ctx.lineTo(15, -9); ctx.lineTo(10, -9); ctx.lineTo(10, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#7a4a1e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(-9, 6); ctx.moveTo(-3, -8); ctx.lineTo(-3, 6); ctx.moveTo(4, -8); ctx.lineTo(4, 6); ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.fillStyle = '#e8c27a'; ctx.beginPath(); ctx.moveTo(-16, -2); ctx.quadraticCurveTo(-21, 2, -18, 8); ctx.stroke();
      ctx.fillRect(-16, 6, 30, 4); ctx.strokeRect(-16, 6, 30, 4);
      ctx.fillStyle = '#6e4824'; for (const wx of [-10, 8]) { circle(wx, 13, 4.5); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = C.ink; circle(12, -14, 1.2); ctx.fill();
      break;
    case 'wreath':
      ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 1, 12, -Math.PI * 0.35, Math.PI * 1.35); ctx.stroke();
      for (let n = 0; n < 11; n++) {
        const a = -Math.PI * 0.35 + n * (Math.PI * 1.7 / 10), lx = Math.cos(a) * 12, ly = 1 + Math.sin(a) * 12;
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(a + (n % 2 ? 0.9 : -0.9) + Math.PI / 2);
        ctx.fillStyle = n % 2 ? '#ffd23f' : '#f2b01e'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, -5, 2.8, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      break;
    case 'sunstone':
      ctx.fillStyle = '#7fd6ff'; ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(11, -6); ctx.lineTo(8, 12); ctx.lineTo(-2, 17); ctx.lineTo(-11, 8); ctx.lineTo(-9, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d6f4ff'; ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(-9, -8); ctx.lineTo(-1, -2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(28,26,54,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-1, -2); ctx.lineTo(11, -6); ctx.moveTo(-1, -2); ctx.lineTo(-2, 17); ctx.moveTo(-1, -2); ctx.lineTo(-11, 8); ctx.stroke();
      ctx.fillStyle = '#ffffff'; { const k = 0.6 + 0.4 * Math.sin(t * 5); ctx.save(); ctx.translate(7, -12); ctx.scale(k, k); ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(1.6, -1.6); ctx.lineTo(6, 0); ctx.lineTo(1.6, 1.6); ctx.lineTo(0, 6); ctx.lineTo(-1.6, 1.6); ctx.lineTo(-6, 0); ctx.lineTo(-1.6, -1.6); ctx.closePath(); ctx.fill(); ctx.restore(); }
      break;
    case 'plans':
      ctx.rotate(-0.12);
      ctx.fillStyle = '#f0deb0'; ctx.fillRect(-14, -11, 28, 22); ctx.strokeRect(-14, -11, 28, 22);
      ctx.fillStyle = '#d9c08a'; ctx.beginPath(); ctx.ellipse(-14, 0, 3, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(14, 0, 3, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(-6, -9, -10, -3); ctx.moveTo(0, -2); ctx.quadraticCurveTo(6, -9, 10, -3); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.moveTo(-7, 7); ctx.lineTo(7, 7); ctx.stroke();
      break;
    case 'prop':
      ctx.rotate(t * 2.2);
      ctx.fillStyle = '#c98a4a';
      for (const d of [1, -1]) { ctx.beginPath(); ctx.moveTo(0, -3 * d); ctx.bezierCurveTo(8 * d, -8 * d, 16 * d, -6 * d, 18 * d, 0); ctx.bezierCurveTo(14 * d, 4 * d, 6 * d, 3 * d, 0, 3 * d); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = TTHC.brass; circle(0, 0, 4); ctx.fill(); ctx.stroke();
      break;
    case 'flag':
      ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, 17); ctx.lineTo(-10, -17); ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6;
      { const wv = Math.sin(t * 4) * 1.5; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-10, -16); ctx.quadraticCurveTo(0, -18 + wv, 14, -15); ctx.lineTo(14, 0); ctx.quadraticCurveTo(0, -2 + wv, -10, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ff5f6d'; for (const sy of [-12, -6]) ctx.fillRect(-1, sy + wv * 0.3, 14, 2.6);
        ctx.fillStyle = '#4a6fd6'; ctx.fillRect(-9, -15, 9, 8); }
      break;
    default: ctx.fillStyle = C.gold; circle(0, 0, 10); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
// the era strip's icons: the stolen thing of each history era, a cracked clock (finale), a chequered flag (race)
function tthIcon(phase, x, y, r) {
  const era = TTH_ERAS[phase];
  if (era && era.loot) { tthDrawLoot(era.loot, x, y, r / 18, 0); return; }
  ctx.save(); ctx.translate(x, y); ctx.scale(r / 10, r / 10); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4;
  if (phase === 'finale') {
    ctx.fillStyle = TTHC.cream; circle(0, 0, 9); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -6); ctx.moveTo(0, 0); ctx.lineTo(4, 2); ctx.stroke();
    ctx.strokeStyle = '#ff5f6d'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-3, -1); ctx.lineTo(-5, 3); ctx.lineTo(0, 5); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-7, 9); ctx.lineTo(-7, -9); ctx.stroke();
    for (let r2 = 0; r2 < 3; r2++) for (let c2 = 0; c2 < 4; c2++) { ctx.fillStyle = (r2 + c2) % 2 ? '#ffffff' : C.ink; ctx.fillRect(-6 + c2 * 4, -9 + r2 * 4, 4, 4); }
    ctx.strokeRect(-6, -9, 16, 12);
  }
  ctx.restore();
}
// a vertical gradient over the whole screen width (screen coords)
function tthSky(top, bottom, y0 = 0, y1 = H) {
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
}
function tthStars(t, n = 40, alpha = 1, seed = 7) {
  for (let k = 0; k < n; k++) {
    const h = hash(k, seed), x = h % W, y = (h >>> 10) % 300, tw = 0.5 + 0.5 * Math.sin(t * (1 + (h % 7) * 0.3) + k);
    ctx.fillStyle = `rgba(255,255,255,${(0.35 + 0.6 * tw) * alpha})`; circle(x, y, 0.8 + (h % 3) * 0.5); ctx.fill();
  }
}

/* --- drawing: the layers --- */
function tthHideMask(st) { const h = tthCall(tthPh(st), 'hide', st); return Array.isArray(h) ? [!!h[0], !!h[1]] : [!!h, !!h]; }
function tthUnhide(st) { if (st.hid) { for (const p of G.players) if (st.hid[p.id]) p.alive = true; st.hid = null; } }
function tthDraw(st) {
  const ph = tthPh(st);
  tthUnhide(st);
  if (st.cut && st.cut.kind === 'end') { tthDrawEndScene(st); return; }
  ctx.save(); ctx.translate(-st.cam.x, -st.cam.y);
  tthCall(ph, 'drawBack', st);
  tthDrawThief(st.thief);
  tthCall(ph, 'draw', st);
  if (st.cut && st.cut.kind === 'leave' && st.cut.open > 0) tthDrawPortal(st.cut.px, st.cut.py, 74, G.clock, { open: st.cut.open });
  ctx.restore();
  // a phase that draws Pip and Bo itself: the engine skips them (it draws the players right after this hook)
  const m = tthHideMask(st);
  if (m[0] || m[1]) { st.hid = [false, false]; for (const p of G.players) if (m[p.id] && p.alive) { st.hid[p.id] = true; p.alive = false; } }
}
function tthDrawTop(st) {
  const ph = tthPh(st), big = tthBig(), z = big ? 1.4 : 1, end = st.cut && st.cut.kind === 'end';
  tthUnhide(st);
  ctx.save(); ctx.translate(-st.cam.x, -st.cam.y);
  if (!end) tthCall(ph, 'drawTop', st);
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
    if (st.warn[p.id] > 0) { const bob = Math.abs(Math.sin(G.clock * 12)) * 5; bigText('!', p.x + p.w / 2, p.y - 24 - bob - tthHeadLift(st, p), 30 * z, '#ff5f6d', 1); }
  }
  // his speech bubble
  const sb = tthSayBox(st);
  if (sb) {
    const { fs, tw, th, side, bx, by, mx, my } = sb, a = clamp(Math.min(st.say.t / 0.12, (st.say.life - st.say.t) / 0.25), 0, 1);
    ctx.font = tthLilita(fs);
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
const tthHeadLift = (st, p) => (st.cut && st.cut.kind === 'end' ? 0 : tthCall(tthPh(st), 'headLift', st, p) || 0);
// his speech bubble: beside his head (screen coords), under the strip and the news line. Null when he says nothing.
function tthSayBox(st) {
  const c = st.thief;
  if (!st.say || ((c.hidden || c.alpha <= 0) && !c.sayAt)) return null;
  const z = tthBig() ? 1.4 : 1;
  let fs = Math.round(16 * z);
  let hx, hy, hr, mx, my;
  if (c.sayAt) { hx = c.sayAt.x; hy = c.sayAt.y; hr = c.sayAt.r || 30; mx = hx; my = hy; }
  else { const P = tthThiefPts(c); hx = P.head.x - st.cam.x; hy = P.head.y - st.cam.y; hr = P.head.r; mx = P.mouth.x - st.cam.x; my = P.mouth.y - st.cam.y; }
  ctx.font = tthLilita(fs);
  while (fs > 11 && ctx.measureText(st.say.text).width + 26 * z > W - 24) ctx.font = tthLilita(--fs);
  const tw = ctx.measureText(st.say.text).width + 26 * z, th = fs + 16 * z, B = tthStripBox();
  let side = c.face || 1;
  const gap = hr + 18 * z;
  if ((side < 0 && hx - gap - tw < 6) || (side > 0 && hx + gap + tw > W - 6)) side = -side;
  const bx = clamp(hx + side * (gap + tw / 2), tw / 2 + 6, W - tw / 2 - 6);
  let by = clamp(hy - hr * 0.6, B.y0 + B.h + th / 2 + 10, H - th / 2 - 10);
  const nb = tthTopBox(st);
  if (nb && bx + tw / 2 > nb.x0 - 4 && bx - tw / 2 < nb.x1 + 4 && by - th / 2 < nb.y1 + 6) by = Math.min(H - th / 2 - 10, nb.y1 + th / 2 + 8);
  return { fs, tw, th, side, bx, by, mx: clamp(mx, 4, W - 4), my: clamp(my, by - th, by + th * 1.5) };
}
function tthNewsBox(st) {
  const n = st.news;
  if (!n || G.introT > 0) return null;
  const big = tthBig(), B = tthStripBox(), h = big ? 36 : 28;
  let y = B.y0 + B.h + 6;
  let fs = big ? 19 : 14;
  ctx.font = tthFont(fs);
  while (fs > 11 && ctx.measureText(n.text).width + 34 > W - 40) ctx.font = tthFont(--fs);
  const w = Math.min(ctx.measureText(n.text).width + 34, W - 40);
  // a long line would run under the engine's era pill (top left, y 46-72): drop it below that pill
  const d = G.level && G.level.def;
  if (d && d.rooms) {
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    const pr = 14 + ctx.measureText(`${d.roomWord || 'Room'} ${d.roomIndex + 1} of ${d.roomCount}: ${d.title}`).width + 44;
    if (W / 2 - w / 2 < pr + 6 && y < 78) y = 78;
  }
  return { x0: W / 2 - w / 2, x1: W / 2 + w / 2, y0: y, y1: y + h, fs, h };
}
// the "Checkpoint: Era N" line after a resume: a gold pill of its own, under the room card while that is up, then under
// the news line (or in its place) for TTH.cpNoteLife s of play. Null when there is none.
function tthCpNoteBox(st) {
  const n = st.cpNote;
  if (!n || (st.cut && st.cut.kind === 'end')) return null;
  const big = tthBig(), B = tthStripBox(), h = big ? 36 : 28, d = G.level && G.level.def, card = G.introT > 0;
  if (card && G.mode !== 'play') return null;
  let fs = big ? 19 : 14;
  ctx.font = tthFont(fs);
  while (fs > 11 && ctx.measureText(n.text).width + 34 > W - 40) ctx.font = tthFont(--fs);
  const w = Math.min(ctx.measureText(n.text).width + 34, W - 40), nb = card ? null : tthNewsBox(st);
  // (the room card, render.js drawIntro: from y 168, 120 tall with the action line, 22 more with the 1-player note)
  let y = card ? 168 + (d && d.act ? 120 : 92) + (d && typeof cpuTipNote === 'function' && cpuTipNote(d.tip) ? 22 : 0) + 8 : nb ? nb.y1 + 4 : B.y0 + B.h + 6;
  if (!card && !nb && d && d.rooms && y < 78) {   // (like the news line: never under the engine's era pill, top left)
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    if (W / 2 - w / 2 < 14 + ctx.measureText(`${d.roomWord || 'Room'} ${d.roomIndex + 1} of ${d.roomCount}: ${d.title}`).width + 44 + 6) y = 78;
  }
  return { x0: W / 2 - w / 2, x1: W / 2 + w / 2, y0: y, y1: y + h, fs, h, a: card ? clamp(G.introT / 0.5, 0, 1) : clamp(Math.min(1, (n.life - n.t) / 0.3), 0, 1) };
}
// what the top-centre lines cover during play (the news line and the checkpoint line): bubbles keep clear of it
function tthTopBox(st) {
  const nb = tthNewsBox(st), cb = G.introT > 0 ? null : tthCpNoteBox(st);
  return nb && cb ? { x0: Math.min(nb.x0, cb.x0), x1: Math.max(nb.x1, cb.x1), y0: nb.y0, y1: cb.y1 } : nb || cb;
}
// 1-player: where cpu-core's cpuDraw() will put the computer's own speech bubble over p (it draws after this HUD and
// knows nothing of the badges and hints here, so they make room for it): [x, y, w, h] or null. Same sums as cpuDraw.
function tthCpuSayBox(p) {
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
const tthUnder = (x0, y0, x1, y1) => G.players.some(p => p.alive && p.x + p.w > x0 - 4 && p.x < x1 + 4 && p.y + p.h > y0 - 4 && p.y - 8 < y1 + 4);

/* --- drawing: the ending scene (the core owns the screen): home, today, at the town clock --- */
function tthDrawEndScene(st) {
  const c = st.cut, t = G.clock, gy = TTH.endGround, TX = W / 2 - 150;
  tthSky('#6fc3ff', '#ffe6b0');
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; for (const [cx, cy, s] of [[150, 110, 1], [470, 70, 0.8], [800, 130, 1.1]]) { circle(cx + Math.sin(t * 0.2 + cx) * 12, cy, 22 * s); ctx.fill(); circle(cx + 26 * s + Math.sin(t * 0.2 + cx) * 12, cy + 6, 17 * s); ctx.fill(); circle(cx - 24 * s + Math.sin(t * 0.2 + cx) * 12, cy + 7, 15 * s); ctx.fill(); }
  // far hills and little houses
  ctx.fillStyle = '#9bd47a'; ctx.beginPath(); ctx.moveTo(0, gy); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, gy - 70 - Math.sin(x * 0.011) * 28 - Math.sin(x * 0.027) * 10); ctx.lineTo(W, gy); ctx.closePath(); ctx.fill();
  for (const [hx, hw, hh, col] of [[60, 70, 54, '#ffd9a0'], [170, 58, 44, '#ffb3b3'], [690, 64, 50, '#bfe3ff'], [820, 76, 58, '#ffe08a']]) {
    ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.fillRect(hx, gy - hh, hw, hh); ctx.strokeRect(hx, gy - hh, hw, hh);
    ctx.fillStyle = '#c0504a'; ctx.beginPath(); ctx.moveTo(hx - 8, gy - hh); ctx.lineTo(hx + hw / 2, gy - hh - 30); ctx.lineTo(hx + hw + 8, gy - hh); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6b4a2a'; ctx.fillRect(hx + hw / 2 - 8, gy - 26, 16, 26);
  }
  // the town clock tower (it tells the right time again)
  ctx.fillStyle = '#d9c7a8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(TX - 46, gy - 250, 92, 250); ctx.strokeRect(TX - 46, gy - 250, 92, 250);
  ctx.fillStyle = '#7a5aa8'; ctx.beginPath(); ctx.moveTo(TX - 58, gy - 250); ctx.lineTo(TX, gy - 320); ctx.lineTo(TX + 58, gy - 250); ctx.closePath(); ctx.fill(); ctx.stroke();
  tthClockFace(TX, gy - 200, 32, t, { speed: 0.6, ticks: true, lw: 3 });
  // clock pops in the sky
  for (const f of c.fw) {
    const u = f.t / 1.3, r = 10 + u * 46;
    ctx.globalAlpha = clamp(1 - u, 0, 1);
    for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 + f.x; ctx.fillStyle = k % 2 ? f.col : '#ffffff'; circle(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r + u * u * 26, 4 - u * 2); ctx.fill(); }
    tthClockFace(f.x, f.y, 9 * (1 - u * 0.5), t * 4 + f.x, { speed: 6, lw: 1.5 });
    ctx.globalAlpha = 1;
  }
  // the ground: grass, a path, flowers
  ctx.fillStyle = '#6fbf5a'; ctx.fillRect(0, gy, W, H - gy);
  ctx.fillStyle = '#58a548'; ctx.fillRect(0, gy, W, 6);
  ctx.fillStyle = '#e8d2a0'; ctx.beginPath(); ctx.moveTo(W / 2 - 60, gy + 6); ctx.lineTo(W / 2 + 60, gy + 6); ctx.lineTo(W / 2 + 130, H); ctx.lineTo(W / 2 - 130, H); ctx.closePath(); ctx.fill();
  for (let k = 0; k < 9; k++) { const x = 50 + k * 110; if (Math.abs(x - W / 2) < 90) continue; ctx.fillStyle = ['#ff8fc7', '#ffd23f', '#ffffff'][k % 3]; circle(x, gy - 4, 4); ctx.fill(); ctx.fillStyle = '#3f8f5c'; ctx.fillRect(x - 1, gy - 2, 2, 5); }
  tthDrawThief(st.thief);
}

/* --- drawing: the HUD --- */
// the era strip, top centre: the era's year and 10 slots (done ones ticked, the current one lit, with pips)
function tthStripBox() {
  const big = tthBig(), n = TTH_ORDER.length, sw = big ? 36 : 28, gap = big ? 5 : 4, w = n * sw + (n - 1) * gap + 24, h = big ? 66 : 54;
  return { x0: W / 2 - w / 2, y0: 6, w, h, sw, gap, big, labY: 6 + (big ? 13 : 11), slotY: 6 + (big ? 24 : 20) };
}
function tthSlotPos(i) { const B = tthStripBox(); return { x: B.x0 + 12 + i * (B.sw + B.gap) + B.sw / 2, y: B.slotY + B.sw / 2, r: B.sw / 2 }; }
function tthDrawStrip(st) {
  const B = tthStripBox(), cur = st.phaseNo, end = st.cut && st.cut.kind === 'end';
  ctx.save(); if (tthUnder(B.x0, B.y0, B.x0 + B.w, B.y0 + B.h)) ctx.globalAlpha = 0.45;
  ctx.fillStyle = 'rgba(30,20,66,0.86)'; rr(B.x0, B.y0, B.w, B.h, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(217,164,65,0.8)'; ctx.lineWidth = 2; rr(B.x0, B.y0, B.w, B.h, 14); ctx.stroke();
  text(end ? 'Home, today' : st.era.when, W / 2, B.labY, B.big ? 15 : 11, '#f6d37a', 'center', 'body');
  const prog = end ? null : tthCall(tthPh(st), 'progress', st);
  for (let i = 0; i < TTH_ORDER.length; i++) {
    const sp = tthSlotPos(i), x = sp.x - B.sw / 2, y = sp.y - B.sw / 2, done = end || i < cur, now = !end && i === cur;
    const saved = i < st.loot.length ? st.loot[i] : done, flying = st.fly && st.fly.i === i;
    ctx.fillStyle = now ? 'rgba(246,211,122,0.26)' : done ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)'; rr(x, y, B.sw, B.sw, 7); ctx.fill();
    if (now) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x, y, B.sw, B.sw, 7); ctx.stroke(); }
    ctx.save(); if (!(done && saved) && !now) ctx.globalAlpha *= 0.3; if (flying) ctx.globalAlpha *= 0.25;
    tthIcon(TTH_ORDER[i], sp.x, sp.y - (now && prog ? 2 : 0), B.sw * 0.34);
    ctx.restore();
    if (done && saved && !flying) { ctx.strokeStyle = '#9fe07f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + B.sw - 12, y + 7); ctx.lineTo(x + B.sw - 8, y + 11); ctx.lineTo(x + B.sw - 2, y + 2); ctx.stroke(); }
    if (now && prog && prog.of > 0) {
      const n = Math.min(prog.of, 8), r = B.big ? 2.4 : 1.8, gap = r * 2.7, x0 = sp.x - (n - 1) * gap / 2, py = y + B.sw - r - 1;
      const filled = prog.of > 8 ? Math.round(prog.n / prog.of * 8) : prog.n;
      for (let k = 0; k < n; k++) { ctx.fillStyle = k < filled ? C.gold : 'rgba(255,255,255,0.3)'; circle(x0 + k * gap, py, r); ctx.fill(); }
    }
  }
  ctx.restore();
  // a thing just won back flies up to its slot
  if (st.fly) {
    const f = st.fly, sp = tthSlotPos(f.i), k = clamp((f.t - 0.7) / 0.8, 0, 1), e = k * k * (3 - 2 * k), pop = Math.min(1, f.t / 0.25);
    const x = W / 2 + (sp.x - W / 2) * e, y = 260 + (sp.y - 260) * e - Math.sin(k * Math.PI) * 30, s = (2.4 - 1.8 * e) * (0.4 + 0.6 * pop) * (B.sw / 28);
    ctx.save(); ctx.globalAlpha = 0.35 * (1 - e); ctx.fillStyle = '#fff3c4'; circle(x, y, 34 * s * 0.5 + Math.sin(G.clock * 9) * 3); ctx.fill(); ctx.restore();
    tthDrawLoot(f.kind, x, y, s, G.clock);
  }
}
// what draws over (or under) each player's head: role badges, then hint bubbles (from 20-1)
function tthDrawHeads(st, rightBox, newsBox) {
  if (G.introT > 0) return;
  const big = tthBig(), B = tthStripBox();
  const clearTop = (x0, x1) => {
    let y = 4;
    if (x0 < 290) y = 80;
    if (x1 > B.x0 - 4 && x0 < B.x0 + B.w + 4) y = Math.max(y, B.y0 + B.h + 6);
    if (newsBox && x1 > newsBox.x0 - 4 && x0 < newsBox.x1 + 4) y = Math.max(y, newsBox.y1 + 6);
    if (rightBox && x1 > rightBox[0] - 4) y = Math.max(y, rightBox[1] + 6);
    return y;
  };
  const placed = [], sb = tthSayBox(st);
  if (sb) placed.push([sb.bx - sb.tw / 2, sb.by - sb.th / 2, sb.tw, sb.th]);
  if (st.swapT > 0) { const fs = big ? 46 : 36; ctx.font = tthLilita(fs); const w = ctx.measureText('Swap jobs!').width * 1.1; placed.push([W / 2 - w / 2, 150 - fs * 0.65, w, fs * 1.3]); }
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
  const cpuBox = G.players.map(p => tthCpuSayBox(p));
  for (const r of cpuBox) if (r) placed.push(r);
  const heads = G.players.filter(p => p.alive).map(p => ({ p, px: p.x + p.w / 2, top: p.y - 8 - tthHeadLift(st, p), below: p.y + p.h + 10 }));
  const roles = st.badgeT > 0 && !st.cut ? tthCall(tthPh(st), 'roles', st) : null;
  if (roles) for (const k of heads) {
    const word = roles[k.p.id];
    if (!word) continue;
    const fs = big ? 20 : 12, bh = fs + (big ? 10 : 8), a = clamp(st.badgeT / 0.4, 0, 1);
    ctx.font = tthFont(fs);
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
    ctx.font = tthFont(fs);
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
// the time warp: everything outside a shrinking (or growing) ring goes deep violet, with spinning streaks
function tthDrawWarp(x, y, R, t) {
  ctx.save();
  ctx.fillStyle = '#1a0f3d'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(x, y, Math.max(0, R), 0, Math.PI * 2, true); ctx.fill('evenodd');
  ctx.lineCap = 'round';
  for (let k = 0; k < 14; k++) {
    const a = k * 0.449 + t * 5, r0 = Math.max(0, R) + 6 + (k % 4) * 26, len = 0.5 + (k % 3) * 0.2;
    ctx.strokeStyle = ['rgba(178,141,255,0.7)', 'rgba(127,233,255,0.7)', 'rgba(246,211,122,0.7)'][k % 3]; ctx.lineWidth = 3 + (k % 3);
    ctx.beginPath(); ctx.arc(x, y, r0, a, a + len); ctx.stroke();
  }
  ctx.restore();
}
function tthHud(st) {
  const ph = tthPh(st), big = tthBig(), end = st.cut && st.cut.kind === 'end', cut = st.cut && st.cut.kind === 'leave' ? st.cut : null;
  // the portal warp at the end of an era, and the arrival in the next one (under the HUD)
  if (cut && cut.warp) { const k = clamp((cut.t - 2.9) / (TTH.leaveT - 2.9 - 0.15), 0, 1); tthDrawWarp(cut.wx, cut.wy, 760 * (1 - k) * (1 - k), G.clock); }
  else if (st.arriveT > 0) { const k = 1 - st.arriveT / TTH.arriveT; tthDrawWarp(W / 2, H / 2, 760 * k * k, G.clock); }
  if (cut && cut.warp && cut.t < TTH.leaveT - 0.5) bigText('After him!', W / 2, 150, big ? 44 : 34, C.gold, 1);
  if (G.introT > 0.3 && G.mode === 'play' && !end) { ctx.save(); ctx.globalAlpha = clamp((G.introT - 0.3) / 0.4, 0, 1); bigText(st.era.when, W / 2, 128, big ? 44 : 38, '#f6d37a', 1); ctx.restore(); }
  tthDrawStrip(st);
  const h = big ? 40 : 28, extra = end ? '' : tthCall(ph, 'hudText', st);
  const s = fmtTime(G.time) + (extra ? '   ' + extra : ''), SB = tthStripBox();
  let fs = big ? 20 : 14;
  ctx.font = tthFont(fs);
  while (fs > 11 && W - 14 - (ctx.measureText(s).width + 28) < SB.x0 + SB.w + 8) ctx.font = tthFont(--fs);
  const rw = ctx.measureText(s).width + 28, rx = pill(W - 14, 12, rw, h, 'right');
  text(s, W - 28, 12 + h / 2 + 0.5, fs, C.paper, 'right', 'body');
  const rightBox = [rx, 12 + h];
  const n = st.news, newsBox = tthNewsBox(st);
  if (newsBox) {
    const { x0, x1, y0, h: nh, fs: nfs } = newsBox, w = x1 - x0;
    ctx.save(); ctx.globalAlpha = clamp(Math.min(n.t / 0.15, (n.life - n.t) / 0.3), 0, 1) * (tthUnder(x0, y0, x1, newsBox.y1) ? 0.35 : 1);
    ctx.fillStyle = 'rgba(30,20,66,0.88)'; rr(x0, y0, w, nh, nh / 2); ctx.fill();
    if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x0, y0, w, nh, nh / 2); ctx.stroke(); }
    text(n.text, W / 2, y0 + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
    ctx.restore();
  }
  // back at a checkpoint: the gold "Checkpoint: Era N" line (its own pill: the eras' news lines never replace it)
  const noteBox = tthCpNoteBox(st);
  if (noteBox) {
    const { x0, x1, y0, h: nh, fs: nfs } = noteBox, w = x1 - x0;
    ctx.save(); ctx.globalAlpha = noteBox.a * (G.introT <= 0 && tthUnder(x0, y0, x1, noteBox.y1) ? 0.35 : 1);
    ctx.fillStyle = 'rgba(30,20,66,0.88)'; rr(x0, y0, w, nh, nh / 2); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x0, y0, w, nh, nh / 2); ctx.stroke();
    text(st.cpNote.text, W / 2, y0 + nh / 2 + 0.5, nfs, C.gold, 'center', 'body');
    ctx.restore();
  }
  if (!end) tthCall(ph, 'hud', st);
  // a player up under the level / room pills or the time pill: draw them again, a little see-through, on top
  for (const p of G.players) {
    if (!p.alive || p.y - 8 > 80 || (st.hid && st.hid[p.id])) continue;
    if (p.x < 294 || p.x + p.w > rightBox[0] - 4 && p.y - 8 < rightBox[1] + 4) { ctx.save(); ctx.globalAlpha = 0.75; drawPlayer(p); ctx.restore(); }
  }
  tthDrawHeads(st, rightBox, tthTopBox(st));
  if (st.swapT > 0 && G.introT <= 0) {
    const k = 1 - st.swapT / TTH.swapT, a = clamp(st.swapT / 0.4, 0, 1);
    ctx.save(); ctx.globalAlpha = a; bigText('Swap jobs!', W / 2, 150, big ? 46 : 36, C.gold, 0.8 + 0.25 * Math.min(1, k * 6)); ctx.restore();
  }
  if (st.idle && !st.cut) { ctx.save(); ctx.globalAlpha = 0.85; bigText('The Time Thief is waiting...', W / 2, H - 40, big ? 26 : 18, '#f6d37a', 1); ctx.restore(); }
}

/* --- sounds --- */
Sfx.extra.tthTalk = function () { for (let k = 0; k < 3; k++) this.tone(330 + Math.random() * 220, 0.05, 'square', 0.014, null, k * 0.06); };
Sfx.extra.tthGold = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.tthSwap = function () { [523, 784, 659, 988].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.045, null, i * 0.07)); };
Sfx.extra.tthBonk = function (p) { this.tone(420 * p, 0.06, 'square', 0.05, 220 * p); this.tone(1400, 0.1, 'triangle', 0.03, 1800, 0.05); };
Sfx.extra.tthPhase = function () { [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, null, i * 0.09)); };
Sfx.extra.tthGot = function () { [659, 784, 988, 1319, 1568].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.05, null, i * 0.08)); };
Sfx.extra.tthCheer = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'sine', 0.05, null, i * 0.1)); };
Sfx.extra.tthPop = function () { this.tone(300 + Math.random() * 300, 0.16, 'sine', 0.03, 1000); };
Sfx.extra.tthPortal = function () { this.tone(140, 0.9, 'sine', 0.05, 620); this.tone(280, 0.9, 'triangle', 0.025, 1240, 0.05); };
Sfx.extra.tthZoom = function () { this.tone(900, 0.35, 'sawtooth', 0.03, 180); this.tone(1800, 0.25, 'sine', 0.03, 400, 0.05); };
Sfx.extra.tthWarp = function () { for (let k = 0; k < 6; k++) this.tone(220 * Math.pow(1.26, k), 0.22, 'triangle', 0.035, 440 * Math.pow(1.26, k), k * 0.2); };
Sfx.extra.tthTick = function () { this.tone(1200, 0.03, 'square', 0.03); };
Sfx.extra.tthDing = function () { this.tone(1046, 0.08, 'square', 0.04); this.tone(1568, 0.18, 'triangle', 0.05, null, 0.06); };

/* ===== STUB PHASES =====
   Tiny, trivially winnable stand-ins so the level runs end to end before (or without) the real era files. Each needs
   both players (an idle partner never clears). The real files replace them: TTH_PHASES.<phase> = { ... }. */
const TTH_STUBS = {};
// every era's stub: walk right together to the portal the Thief hovers by; the race stub: first one there wins
function tthMakeStub(phase) {
  const race = phase === 'race';
  return {
    stub: true,
    setup(st) {
      const c = st.thief, ph = st.ph;
      ph.goal = 26 * T; ph.inT = 0; ph.won = -1; ph.t = 0;
      Object.assign(c, { x: 700, y: 240, s: 0.8, jet: phase !== 'race' && phase !== 'finale' ? true : phase === 'finale', face: -1, pose: 'laugh', item: st.era.loot, claw: 0.5 });
      if (race) Object.assign(c, { jet: false, x: 120, y: 480, pose: 'cheer', mood: 'happy', baseMood: 'happy', item: null });
    },
    step(st, dt) {
      const ph = st.ph, c = st.thief, ps = G.players;
      if (st.idle) { tthCoast(dt); return; }
      tthPlatform(st, dt);
      if (!race) c.y = 240 + Math.sin(st.phT * 1.3) * 14;
      if (race) {
        if (ph.won < 0) {
          const done = ps.filter(p => p.alive && p.x + p.w / 2 >= ph.goal + 60);
          if (done.length) {
            ph.won = done.length === 2 ? (done[0].x >= done[1].x ? done[0].id : done[1].id) : done[0].id;
            const s = tthStats(st); s.wins = [ph.won === 0 ? 1 : 0, ph.won === 1 ? 1 : 0]; s.champ = ph.won;
            tthNews(st, NAMES[ph.won] + ' wins the race!', false, 2.5); tthCelebrate(st, 1.2); Sfx.play('tthCheer');
          }
        } else if ((ph.t += dt) > 1.4) tthPhaseDone(st, { say: NAMES[ph.won] + ' wins the race home!' });
        return;
      }
      const inGoal = ps.every(p => p.alive && p.x + p.w / 2 > ph.goal);
      ph.inT = inGoal ? ph.inT + dt : 0;
      if (ph.inT > 0.5) tthPhaseDone(st, phase === 'finale' ? { say: 'My machine! Fine... race you home!' } : {});
    },
    drawBack(st) {
      tthScreen(st, () => { tthSky('#241a5c', st.era.col); tthStars(G.clock, 30, 0.7); });
      const x = st.ph.goal + 60, y = tthGroundY(x, 300) - 70;
      tthDrawPortal(x, y, 60, G.clock, {});
      tthScreen(st, () => text(st.era.title + ' (coming soon)', W / 2, 110, 20, 'rgba(255,255,255,0.7)', 'center'));
    },
    roles: () => (race ? ['Race!', 'Race!'] : ['Go!', 'Go!']),
    labels: () => ['go', 'go'],
    hudText: () => 'Stub',
    progress(st) { return race ? null : { n: G.players.filter(p => p.x + p.w / 2 > st.ph.goal).length, of: 2 }; },
    statLine(st) { if (!race) return ''; const s = st.stats.race; return s && s.champ != null && s.champ >= 0 ? 'Race champ: ' + NAMES[s.champ] : ''; },
  };
}
for (const k of TTH_ORDER) TTH_STUBS[k] = tthMakeStub(k);
Object.assign(TTH_PHASES, TTH_STUBS);

/* ===== TTH TEST HOOK (bots: window.__pipbo.MODES.timethief.test) ===== */
MODES.timethief.test = {
  TTH, TTH_PHASES, TTH_STUBS, TTH_ORDER, TTH_ERAS,
  index: tthLevelIndex,
  seed(n) { MODES.timethief.rand = n == null ? Math.random : tthSeeded(n); },
  // start the level at era k (0-9, or a phase key) with fresh state; o: { seed, intro (true keeps the room card up) }.
  // Returns G.mst. (No checkpoint is read here: the level loads at era 1 and skips ahead.)
  jump(k = 0, o = {}) {
    const i = tthLevelIndex();
    if (typeof k === 'string') k = Math.max(0, TTH_ORDER.indexOf(k));
    if (o.seed != null) this.seed(o.seed);
    const was = MODES.timethief.cpOn, man = G.manual;
    MODES.timethief.cpOn = false; G.manual = true;
    try { loadLevel(i); if (k > 0) { G.room = k - 1; nextRoom(); } } finally { MODES.timethief.cpOn = was; G.manual = man; }
    if (!o.intro) { G.introT = 0; G.mst.arriveT = 0; }
    return G.mst;
  },
  stub: ph => !!(TTH_PHASES[ph] && TTH_PHASES[ph].stub),
  st: () => G.mst, ph: () => G.mst.ph, phase: () => G.mst.phase, calm: () => tthCalm(G.mst), pts: () => tthThiefPts(G.mst.thief),
  done: o => tthPhaseDone(G.mst, o), ending: () => tthEnding(G.mst),
  bonk: (id, o) => tthBonk(G.mst, G.players[id], o), bump: o => tthBump(G.mst, o),
  cp(on) { MODES.timethief.cpOn = !!on; }, cpGet: tthCpGet, cpClear: tthCpClear,
};
