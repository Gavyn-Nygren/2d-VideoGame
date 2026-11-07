/* Pip & Bo - Level 20-1 Volcano Dragon (team boss, World 20 Dragon Peak): the core. */
'use strict';

/* ===== 20-1 Volcano Dragon (mode 'dragon', team boss) =====================================================
   Cinder, a chubby, goofy red-orange dragon (stubby wings, big eyes, a curly tail, smoke-puff hiccups), is grumpy and
   won't let anyone up Dragon Peak. Climb it (climb), dunk him in his lava hot tub (levers), ring his gong (golf), then
   he cheers up and challenges you to a race down the other side (surf). At the end he hugs and waves, the volcano puffs
   friendly fireworks and he is their friend. Family-friendly: nobody is ever hurt, Cinder neither (lava is his hot
   tub). Fire breath and lava are soft fails only: a "Toasty!" / "Hot foot!" bonk (counted, a short pop-back).

   FILES. This file is the CORE: MODES.dragon, the VD_PHASES registry (with a working stub per phase), Cinder's drawing
   and poses, the SHIELD and FIRE-BREATH helpers, bonks, badges and swaps, news / hint / speech bubbles, per-role act
   labels, gold help, the idle wait, phase changes, the HUD, the ending, stats and the test hook. Each phase lives in
   its own file and REPLACES its stub by assigning VD_PHASES.<phase> = { ... }:
     js/levels/world20/vd-climb.js  vd-levers.js  vd-golf.js  vd-surf.js            (loaded after this file)
     js/cpu/levels/world20/volcano-dragon.js (core brain, VD_BRAINS, stub brains)   then vd-climb.js ... vd-surf.js
   If a phase file is missing or throws before its assignment, the stub keeps the level playable (and the core brain
   plays the stub with its stub brain). Every top-level name starts with vd / VD; every Sfx.extra sound with 'vd'.

   =================================================== PHASE CONTRACT ===================================================
   ROOMS. LEVELS has one level 'Volcano Dragon' (world 19, code 20-1, kind 'team', mode 'dragon', ownHUD, noFalls,
   roomWord 'Phase') with 4 rooms, in order: phase 'climb', 'levers', 'golf', 'surf'. EVERY room is ownStep: true, so
   the phase moves the players itself every live tick (vdPlatform(st, dt) does the usual grid platforming for you).
   Each phase file supplies its own room fields at load time, so nobody edits level-list.js:
       vdRoom('climb', { map: [...18 rows of 32...], tip: '...', act: {...}, legend: {...}, myField: ... });
   vdRoom(phase, fields) Object.assign()s fields into that room of the def (returns the room). Room fields the core
   reads: title, phase, tip, act ({ label, labels: [pip, bo] }), legend (setLegend object), map, theme, look (a world
   index whose colours to use; theme adds to them), first (who takes job A first, 0 Pip / 1 Bo; phases may ignore it).
   Map chars: parseLevel takes 1 2 a b c E k F * G T H J R L M O Q U V @ and w s X ^ = o u # before you see the grid;
   the core reads 'Z' (Cinder's feet; it becomes '.'). Pick other characters for your own markers and turn them into
   '.' in L.grid in setup. Do not use 'T'/'H'/'@' expecting the World 3 golf engine (see GOLF below).

   STATE. Every hook gets st = G.mst (fresh on loadLevel, so R restarts the whole level from phase 1).
     st.ph        a fresh {} for your phase's own state (reset at every phase start)
     st.phase     'climb' | 'levers' | 'golf' | 'surf'        st.phaseNo  0..3        st.phT  s since the phase began
     st.cinder    Cinder (see CINDER below), placed on the room's 'Z' if there is one
     st.cam       { x, y }: your camera (world = screen + cam). The core shifts players and new particles into world
                  coords for the whole tick and back after it (like 19-1 / 19-3), so inside every hook that runs in the
                  tick (setup excepted: positions there are screen = world with cam 0), p.x / p.y are WORLD coords;
                  between ticks (draw hooks, name tags, bubbles) p.x / p.y are on SCREEN. Set st.cam in step.
     st.shield    [pip, bo]: { on, k (raise 0..1), hitT }        st.fires  live fire-breath attacks
     st.idle      true while no person has pressed anything for VD.idleAfter (10) s (the computer doesn't count)
     st.cut       a cutscene ({ kind: 'leave' | 'end' }) or null     st.celebT  s of calm after a big moment
     st.stats     { bonks: [pip, bo], kinds: { fire, lava, rock, ... }, blocks, help: [texts], phaseT: [s per phase],
                    climb: {}, levers: {}, golf: {}, surf: {} }: write your results into st.stats.<phase> (vdStats(st))
     st.safe[id]  s left before p can be bonked again          st.warn[id]  s left of a red "!" over that player
   HOOKS of VD_PHASES.<phase> (only setup is required; all get st first):
     setup(st, L)      the phase starts (room start, restart, test jump). Read your map / room fields (L.def), build
                       st.ph, place Cinder (st.cinder.x / y / s / face / pose / air / lava / gy), set st.cam.
     step(st, dt)      every live tick: not while the room card holds (G.introT > VD.introHold), not in a cutscene.
                       Move the players here (vdPlatform(st, dt) or your own physics), run your attacks, call
                       vdPhaseDone(st) when the phase is won. Players are in world coords (see st.cam).
     wait(st, dt)      instead of step while the room card holds (default: coast).
     coast(st, dt)     move players with no input during cards and the between-phase cutscene (default: vdCoast(dt),
                       grid physics). A scrolling or split-screen phase whose players don't stand on the grid must
                       give its own (or keep them still).
     drawBack(st)      behind Cinder        draw(st)  in front of Cinder, behind the players    (world coords: the
     drawTop(st)       over the players      core has done ctx.translate(-cam.x, -cam.y); vdScreen(st, fn) draws in
                                              screen coords inside them)
     hud(st)           screen coords, after the core HUD (strip, time pill, news), before the head bubbles.
     hudText(st)       -> a short text for the top-right time pill (e.g. 'Dunks 1/3').
     progress(st)      -> { n, of } for the pips under your segment of the phase strip (checkpoints, dunks, holes).
     labels(st)        -> [pip word, bo word]: the action button word per player (lowercase, 6 letters or fewer).
     legend(st)        -> a setLegend object when the keys change with the job (read when the labels change).
     roles(st)         -> [pip badge, bo badge] ('Shield!', 'Climb!') or null: shown over heads at the phase start
                       and on vdSwap(st).
     busy(st, p)       -> true while p is mid-teamwork (on a ladder, pulling...): shared attacks never target/bonk p.
     headLift(st, p)   -> px your drawing adds over p's head (badges and hints sit above it).
     onBonk(st, p, kind)  onKill(st, p)  onRespawn(st, p)     (kill = the engine's spikes / falling off the grid)
     bubblePos(st, p)  -> { x, y } (screen) where to put the computer's speech bubble when you draw p elsewhere;
     bubbleHidden      true if your players are hidden (p.alive false) but bubbles should still show.
     stat(st)          -> one results tile { label, value } or null      statLine(st) -> a short results text or ''
                       (they run at the end: read st.stats.<phase>, not st.ph. Only golf gives a tile, only surf a line.)
   The core's own hooks never need calling from a phase: it ticks Cinder, shields, fires, bubbles and the idle wait.

   HELPERS (call them inside the tick unless noted):
     Phase flow  vdPhaseDone(st, { say, stay })  the phase is won: Cinder says `say`, flies off (unless stay) and the
                 next room starts after VD.leaveT s; in the last room it plays vdEnding(st) then levelClear().
                 vdCalm(st) -> true in a calm moment (card, cutscene, celebration, idle): start no attacks then.
                 vdCelebrate(st, s) s of calm (no attacks; fires go out).   vdCancelAttacks(st)
     Talk        vdSay(st, text, life)   Cinder's speech bubble (beside his head; at st.cinder.sayAt {x,y} (screen)
                 when he is hidden, e.g. split screen).        vdNews(st, text, gold, life)  the news line (top)
                 vdHint(st, id, text, { life, gold, cpu })  a bubble over player id. In 1-player mode a hint for the
                 computer's player shows o.cpu instead (or nothing) - never tell the person to press keys for it.
                 vdKey(id, 'act'|'jump'|'down'|'up'|'left'|'right'|'move')  that player's own key / button / touch
                 name for hint texts (keyboard, controller or touch).       vdPop(st, x, y, text, col, size)  a pop word
                 vdWarn(st, id, s)   a red "!" over player id for s seconds.
     Jobs        vdSwap(st)  "Swap jobs!" + the badges again + the new act words (your roles()/labels() decide them)
                 vdShowBadges(st, s)   vdActLabels(st) (refresh the act words now; the core also does it every tick)
     Gold help   vdHelp(st, text, { id, hint, life })  gold news + chime, kept in st.stats.help (always announce help;
                 never hide it). o.id + o.hint also puts a gold hint over that player.
     Bonks       vdBonk(st, p, { kind: 'fire'|'lava'|'rock'|'blob'|..., word, fromX, to: {x, y}, safe })
                 a soft fail: "Toasty!" (fire), "Hot foot!" (lava), "Bonk!" (else). Without `to` a knock-back away
                 from fromX; with `to` (feet spot, world coords) a pop-back to that safe spot. Counted in
                 st.stats.bonks; never while p is busy, already safe (VD.bonk.safe s) or in a cutscene. -> true if it hit.
     Players     vdPlatform(st, dt)  grid platforming for both players (like the framework: control with the shield
                 caps, partners solid, riding on heads, postStep with spikes). vdControl(st, p, dt): one player's input
                 + jump physics only (for your own collision); the shielder walks at VD.shield.walkK and only hops.
                 vdCoast(dt)  players stand and land with no input (grid).   vdGroundY(x, y)  grid floor under (x, y).
                 vdScreen(st, fn)  run a drawing fn in screen coords inside a world-coords draw hook.
                 vdHumanIds() -> the ids people play (both when the computer plays both, for bot tests).
     SHIELD      vdShield(st, id, on)  raise / lower id's shield (set it every tick from your job logic, e.g. the
                 shielder holding the action). vdShieldUp(st, id) -> raised (a short raise time first).
                 vdShieldBox(st, id) -> { cx, y, x0, x1, rx, ry } the dome over that head (world coords), or null.
                 vdUnderShield(st, q) -> the id whose raised shield covers player q (own or partner's), or -1.
                 vdCovered(st, x, y) -> id of a raised shield over the point (x, y) (it is below the dome), or -1.
                 vdShieldHit(st, x, y, r) -> id of a raised shield whose dome touches the circle, or -1 (rocks, blobs).
                 vdShieldBlock(st, id, x, y)  clang + sparks + st.stats.blocks++ (call it when your thing hits a shield).
                 The core draws raised shields over their players (drawTop). Small hops only: VD.shield.hopV.
     FIRE BREATH vdFire(st, { x, w, gy, h, inhale, breathe, from, target, word, keepFace, onHit }) -> the fire or null
                 Cinder inhales (pose overlay 'inhale', a glowing target zone [x - w/2, x + w/2] on the ground at gy,
                 red "!" over the target) for `inhale` s, then breathes a flame stream from his mouth (or from(st)
                 -> {x, y}) onto the zone for `breathe` s. Anyone in the zone box (gy - h .. gy + 8) who is not under a
                 raised shield is bonked ("Toasty!", or onHit(st, p, f)). Shields in the zone clang and glow. Refused
                 (null) in a calm moment or when target is busy. gy defaults to the grid floor under x; in a scrolling
                 phase pass gy (world). f.phase 'inhale' | 'breathe' | 'out'; vdFireOut(st, f) ends one early.
                 vdFireZone(f) -> { x0, x1, y0, y1 }. Brains read st.fires to dodge or get under a shield.
     CINDER      st.cinder = { x, y (his feet, world), s (scale, 1 = about 5.5 tiles tall), face (1 looks right),
                 pose, mood ('grumpy' | 'happy' | 'smug' | 'surprised'), air (flying: legs dangle, wings flap),
                 act (an overlay pose the core sets while breathing fire: 'inhale' | 'breathe'), gy (ground y for his
                 shadow; null = under his feet), lava (a lava surface y: he is drawn only above it, with ripples - his
                 hot tub), look ({x, y} to look at), hidden, alpha, sayAt, hitT }.
                 Poses: 'idle' 'fly' 'inhale' 'breathe' 'perch' 'crouch' (about to hop) 'hop' 'splash' (dunked,
                 sputtering) 'tub' (relaxing in lava) 'spit' (puff in the tub) 'dizzy' 'cheer' 'surf' (on a slab)
                 'hug' 'wave'. vdDrawCinder(c) draws any cinder-like object anywhere (the surf phase draws its own).
                 vdCinderPts(c) -> { mouth, nose, head {x, y, r}, belly {x, y, r}, top, feet, body {x0, x1, y0, y1} }.
                 vdReact(st, mood, line, s)  a mood for s seconds (+ an optional line). vdHiccup(st) a smoke-puff hiccup.
                 He is never hurt: dunks make him splash and sputter, the gong makes him dizzy.
     Drawing kit vdDrawBackdrop(t, { x, y })  the volcanic sunset sky with a distant smoking volcano (screen coords).
                 vdDrawLava(x0, x1, y, t, opts)  a strip of friendly bubbling cartoon lava (world coords).
                 vdDrawRockSlab(x, y, s, t)  a cooled lava-rock slab (surf).  vdIcon(phase, x, y, r)  the strip icons.
     Random      vdRand() (gameplay randomness; tests seed it with MODES.dragon.test.seed(n)). No Math.random in
                 anything a preview draws.
     GOLF        Do not set G.golf: main.step() would hand the whole tick to golfStep and skip MODES.dragon. Run your
                 own ball (GOLF constants, golfSolid, golfCollide(b) work on the grid; golfCollide reads
                 G.golf.bumps / G.golf.ball only when it hits an 'X' bumper), and draw rings with drawRing(rg).
   STATS.  The results card shows Time + Record (framework), then the core's Bonks tile [pip, bo], golf's stat() tile,
   the core's Trophy tile, and one line: the phases' statLine()s (surf: 'Surf champ: Pip') + the trophy + a happy end.
   Trophy by time and bonks: VD.medal (tune with bots).

   BRAINS (js/cpu/levels/world20/): the core brain is cpuBrain('dragon'); it dispatches every step to
   VD_BRAINS[st.phase] = { reset(bst, p, info), think(bst, p, o, dt, info, S) -> { left, right, jump, down, up, act,
   keep } }. bst is that computer player's fresh brain state per room; S = G.mst; info is cpu-core's info plus
   info.vs (vdVersusSkill(p): 0.35 / 0.7 / 1 from the saved Opponent setting, for surf: cpuSkill() is always 1 in a
   team level) and info.away (the person pressed nothing for VD.idleAfter s). The core brain returns {} during cards,
   cutscenes and while the person is away (unless your output has keep: true: work that doesn't clear anything).
   A stub phase is always played by its stub brain, a phase with no brain by a follow-the-partner fallback.
   Rules for team phases: full skill, take whichever job the person leaves, wait for a slow person, never clear alone,
   short cpuSay bubbles only in 1-player mode (helpers in the core brain file: vdBrainSay, vdBrainSeek, vdBrainFire).

   TEST HOOK. window.__pipbo.MODES.dragon.test: jump(k, { seed, intro }) starts the level at phase k (0-3) with the
   room card skipped (intro: true keeps it); st(), ph(), phase(), calm(), pts(), done(), ending(), bonk(id, o),
   fire(o), shield(id, on), seed(n), index(), stub(phase) (is it still the stub?). In Playwright:
       await page.evaluate(() => { const P = window.__pipbo; P.G.manual = true; P.MODES.dragon.test.jump(2); });
       then write P.G.players[i].input (and pendingJump / pendingAct for fresh presses) and call P.step(P.DT), or
       leave G.manual false and press real keys (page.keyboard.down('KeyD')).
     node tools/cpu-test.js 20-1 --who=pair   (the computer plays both; the level must clear)
   ====================================================================================================================== */

const VD = {
  introHold: 0.6,              // phase.step waits while G.introT is above this (the room card)
  idleAfter: 10,               // s with no input from any person: Cinder waits (no attacks)
  celebT: 1.6, leaveT: 2.8,    // calm after a big moment; the between-phase cutscene
  badgeT: 5, swapT: 2.2, hintLife: 3, newsLife: 3.2, sayLife: 2.4,
  bonk: { vx: 230, vy: 300, stun: 0.7, slide: 0.3, safe: 1.4, popV: 320 },
  shield: { raiseT: 0.14, walkK: 0.55, hopV: 400, rx: 44, ry: 20, lift: 14 },   // the dome: rx wide each side, lift px over the head
  fire: { inhale: 1.0, breathe: 1.0, w: 120, h: 150 },
  medal: { gold: { t: 510, bonks: 6 }, silver: { t: 780, bonks: 16 } },          // s and bonks (placeholders: tune with bots)
  cinder: { s: 0.9 },
  endT: 7.4,                   // the ending, then levelClear()
  endGround: 456,
};
const VD_ORDER = ['climb', 'levers', 'golf', 'surf'];
const VD_TITLES = { climb: 'Slope Climb', levers: 'Hopping Pillars', golf: 'Gong Golf', surf: 'Lava Surf Race' };
const VD_PHASES = {};
const VD_NONE = { setup() {} };
const vdRand = () => MODES.dragon.rand();
const vdPh = st => (st && VD_PHASES[st.phase]) || VD_NONE;
function vdCall(ph, name, ...args) { const f = ph && ph[name]; return typeof f === 'function' ? f.apply(ph, args) : undefined; }
const vdBusy = (st, p) => !!vdCall(vdPh(st), 'busy', st, p);
const vdCalm = st => G.mode !== 'play' || G.introT > 0 || !!st.cut || st.celebT > 0 || !!st.idle;
const vdFont = px => '700 ' + px + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
const vdLilita = px => '400 ' + px + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
const vdStats = st => st.stats[st.phase] || (st.stats[st.phase] = {});
function vdSeeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const vdLevelIndex = () => LEVELS.findIndex(l => l.mode === 'dragon');

// Phase files call this at load time to fill in their own room: Object.assign(room, fields). Returns the room.
function vdRoom(phase, fields) {
  const def = LEVELS[vdLevelIndex()];
  const room = def && def.rooms && def.rooms.find(r => r.phase === phase);
  if (!room) { console.warn('Volcano Dragon: no room with phase ' + phase); return null; }
  return Object.assign(room, fields || {});
}

/* --- talk, news, hints, badges, gold help --- */
function vdSay(st, text, life = VD.sayLife) { st.say = { text, t: 0, life }; Sfx.play('vdTalk'); }
function vdNews(st, text, gold = false, life = VD.newsLife) { st.news = { text, gold, t: 0, life }; }
function vdHelp(st, text, o = {}) {
  vdNews(st, text, true, o.life || 4); Sfx.play('vdGold'); st.stats.help.push(text);
  if (o.id != null && o.hint) vdHint(st, o.id, o.hint, { gold: true, life: o.life || 4 });
}
// a bubble over player id; in 1-player mode the computer's own bubble shows o.cpu (or nothing)
function vdHint(st, id, text, o = {}) {
  if (typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id)) text = o.cpu || null;
  if (text) st.hints[id] = { text, t: 0, life: o.life || VD.hintLife, gold: !!o.gold };
}
function vdPop(st, x, y, text, col = C.paper, size = 22) { st.pops.push({ x, y, text, col, size, t: 0 }); }
function vdWarn(st, id, s = 0.8) { st.warn[id] = Math.max(st.warn[id], s); }
function vdShowBadges(st, t = VD.badgeT) { st.badgeT = t; }
function vdSwap(st) { st.swapT = VD.swapT; st.badgeT = VD.badgeT; Sfx.play('vdSwap'); vdActLabels(st); }
function vdCelebrate(st, s = VD.celebT) { st.celebT = Math.max(st.celebT, s); vdCancelAttacks(st); }
// the ids people play (both, when the computer plays both: bot tests)
function vdHumanIds() {
  const ids = [0, 1].filter(k => !(typeof cpuOn === 'function' && cpuOn(k)));
  return ids.length ? ids : [0, 1];
}
// each player's own keys, for hint texts (keyboard, controller or touch)
function vdDev(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
function vdKey(id, what) {
  const d = vdDev(id), solo = typeof cpuSolo === 'function' && cpuSolo(), pip = solo || id === 0;
  const kb = { act: pip ? 'F' : '/', jump: pip ? 'W' : '↑', up: pip ? 'W' : '↑', down: pip ? 'S' : '↓', left: pip ? 'A' : '←', right: pip ? 'D' : '→', move: pip ? 'A D' : '← →' };
  if (d === 'pad') return { act: glyph('act'), jump: glyph('a'), up: 'stick up', down: 'stick down', left: 'stick ◀', right: 'stick ▶', move: 'the stick' }[what] || '';
  if (d === 'touch') return { act: 'the round button', jump: '▲', up: '▲', down: '▼', left: '◀', right: '▶', move: '◀ ▶' }[what] || '';
  return kb[what] || '';
}

/* --- Cinder --- */
function vdNewCinder() {
  return { x: 700, y: 300, s: VD.cinder.s, face: -1, pose: 'idle', mood: 'grumpy', moodT: 0, t: 0, act: null, actT: 0,
    air: false, gy: null, lava: null, look: null, hidden: false, alpha: 1, hitT: 0, blink: 0, blinkT: 2.4, hic: 0, hicT: 6, sayAt: null };
}
const vdPoseOf = c => c.act || c.pose;
const vdAir = c => !!c.air || c.pose === 'fly' || c.pose === 'hop';
// pose geometry: body lift o (units, + is down), lean ang, squash sx / sy, legs, wing flap (rad, + up), arms, eyes, mouth
function vdCinderGeo(c) {
  const p = vdPoseOf(c), t = c.t, air = vdAir(c);
  const g = { o: Math.sin(t * 2.2) * 1.5, ang: 0, sx: 1, sy: 1, legs: air ? 'dangle' : 'stand', flap: air ? 0.15 + Math.sin(t * 12) * 0.65 : 0.05 + Math.sin(t * 2) * 0.06,
    arms: 'rest', eyes: 'open', mouth: c.mood === 'happy' ? 'smile' : c.mood === 'surprised' ? 'o' : 'frown', cheek: 0, belly: 1 };
  if (air) g.o = -6 + Math.sin(t * 3.4) * 5;
  const k = clamp(c.actT / 0.5, 0, 1);
  switch (p) {
    case 'inhale': g.ang = -0.1 * k; g.cheek = k; g.belly = 1 + 0.06 * k; g.mouth = 'o'; g.flap = air ? g.flap : 0.4; g.arms = 'out'; break;
    case 'breathe': g.ang = 0.14; g.mouth = 'wide'; g.flap = air ? g.flap : -0.1; break;
    case 'spit': g.cheek = Math.sin(clamp(c.actT / 0.4, 0, 1) * Math.PI); g.mouth = 'o'; break;
    case 'perch': g.o = 6 + Math.sin(t * 2) * 1; g.legs = 'fold'; g.flap = -0.15; break;
    case 'crouch': g.sy = 0.84; g.sx = 1.1; g.o = 4; g.legs = 'fold'; g.flap = 0.7 + Math.sin(t * 20) * 0.2; g.arms = 'out'; break;
    case 'hop': g.sy = 1.08; g.sx = 0.95; g.legs = 'tuck'; g.flap = 0.2 + Math.sin(t * 15) * 0.7; g.arms = 'up'; break;
    case 'splash': g.ang = Math.sin(t * 22) * 0.07; g.arms = 'flail'; g.eyes = 'squeeze'; g.mouth = 'blub'; g.flap = 0.6 + Math.sin(t * 25) * 0.4; break;
    case 'tub': g.arms = 'rim'; g.eyes = c.mood === 'grumpy' ? 'open' : 'content'; g.mouth = c.mood === 'grumpy' ? 'frown' : 'smile'; g.flap = -0.2; break;
    case 'dizzy': g.ang = Math.sin(t * 3) * 0.1; g.eyes = 'swirl'; g.mouth = 'wobble'; g.arms = 'out'; break;
    case 'cheer': g.o = -Math.abs(Math.sin(t * 6)) * 14; g.arms = 'up'; g.eyes = 'happy'; g.mouth = 'open'; g.flap = 0.3 + Math.sin(t * 10) * 0.5; break;
    case 'surf': g.ang = 0.14 + Math.sin(t * 4) * 0.03; g.arms = 'out'; g.mouth = 'open'; g.eyes = 'open'; g.flap = 0.5 + Math.sin(t * 9) * 0.3; break;
    case 'hug': g.arms = 'hug'; g.eyes = 'happy'; g.mouth = 'open'; g.flap = 0.25 + Math.sin(t * 6) * 0.15; break;
    case 'wave': g.arms = 'wave'; g.mouth = 'open'; g.eyes = c.mood === 'happy' ? 'happy' : 'open'; break;
  }
  if (c.blink > 0 && g.eyes === 'open') g.eyes = 'shut';
  if (c.hitT > 0) { g.ang += Math.sin(c.hitT * 26) * 0.06 * Math.min(1, c.hitT / 0.4); }
  return g;
}
// a local point (his own units, x toward his face) to world coords, with the same lean and squash as the drawing
function vdCinderP(c, g, lx, ly) {
  const PIV = -40;                       // he leans about a point 40 units over his feet
  let x = lx * g.sx, y = ly * g.sy;      // squash about the feet
  const ca = Math.cos(g.ang), sa = Math.sin(g.ang), dy = y - PIV;
  const rx = x * ca - dy * sa, ry = x * sa + dy * ca + PIV;
  return { x: c.x + rx * c.s * c.face, y: c.y + (ry + g.o) * c.s };
}
// where his parts are (world coords): phases use these for hits, flames and props
function vdCinderPts(c) {
  const g = vdCinderGeo(c), P = (x, y) => vdCinderP(c, g, x, y), s = c.s;
  const head = P(26, -124), belly = P(14, -56);
  head.r = 42 * s; belly.r = 40 * s;
  return { mouth: P(84, -100), nose: P(78, -114), head, belly, top: P(20, -172), feet: P(0, 0),
    body: { x0: c.x - 60 * s, x1: c.x + 60 * s, y0: c.y + (g.o - 168) * s, y1: c.y + g.o * s } };
}
function vdCinderTick(st, dt) {
  const c = st.cinder;
  c.t += dt; c.actT += dt;
  if (c.hitT > 0) c.hitT = Math.max(0, c.hitT - dt);
  if (c.moodT > 0) { c.moodT -= dt; if (c.moodT <= 0) c.mood = c.baseMood || 'grumpy'; }
  c.blinkT -= dt; if (c.blink > 0) c.blink -= dt;
  if (c.blinkT <= 0) { c.blink = 0.14; c.blinkT = 2 + vdRand() * 3; }
  if (c.hic > 0) c.hic = Math.max(0, c.hic - dt * 2.5);
  // smoke-puff hiccups now and then while he is calm and grumpy-ish (never mid fire)
  if (!c.hidden && !c.act && !st.fires.length && (c.hicT -= dt) <= 0) { c.hicT = 7 + vdRand() * 6; if (!st.cut) vdHiccup(st); }
}
function vdHiccup(st) {
  const c = st.cinder, n = vdCinderPts(c).nose;
  c.hic = 1; st.stats.hics++;
  for (let k = 0; k < 3; k++) st.smoke.push({ x: n.x + c.face * k * 4, y: n.y - k * 3, vx: c.face * (20 + k * 12), vy: -40 - k * 15, r: 6 + k * 3, t: 0, life: 1.2 + k * 0.2 });
  vdPop(st, n.x + c.face * 26, n.y - 22, 'hic!', '#fff1cf', 15);
  Sfx.play('vdHic');
}
// a mood for s seconds (and a line)
function vdReact(st, mood, line, s = 2.2) {
  const c = st.cinder;
  c.mood = mood; c.moodT = s; c.hitT = 0.6;
  if (line) vdSay(st, line, Math.max(1.6, s));
}

/* --- players --- */
// A soft fail: "Toasty!" / "Hot foot!" / "Bonk!" (counted), a knock-back or a pop-back to o.to. Never hurts.
function vdBonk(st, p, o = {}) {
  if (!p || !p.alive || st.safe[p.id] > 0 || st.cut || vdBusy(st, p)) return false;
  const B = VD.bonk, kind = o.kind || 'fire';
  const word = o.word || (kind === 'lava' ? 'Hot foot!' : kind === 'fire' ? 'Toasty!' : 'Bonk!');
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  if (o.to) {
    puff(cx, cy, 8, 'rgba(90,80,90,0.85)');
    p.x = o.to.x - p.w / 2; p.y = o.to.y - p.h;
    p.vx = 0; p.vy = -B.popV; p.grounded = false; p.jumping = false; p.offT = 0.05; p.carryVx = 0;
    p.stun = Math.max(p.stun, B.stun * 0.7); p.knockT = 0; p.sx = 0.7; p.sy = 1.3;
  } else {
    const fx = o.fromX != null ? o.fromX : cx - p.face;
    knock(p, (cx >= fx ? 1 : -1) * B.vx, -B.vy, B.stun, B.slide);
  }
  st.safe[p.id] = o.safe != null ? o.safe : B.safe;
  st.stats.bonks[p.id]++; st.stats.kinds[kind] = (st.stats.kinds[kind] || 0) + 1;
  if (kind === 'fire' || kind === 'lava') st.hot[p.id] = 1.1;
  vdPop(st, p.x + p.w / 2, p.y - 14, word, kind === 'lava' ? '#ffd27a' : '#ffffff', 22);
  Sfx.play(kind === 'lava' || kind === 'fire' ? 'vdToasty' : 'vdBonk', p.id); rumble(p.id, 0.6, 0.4, 160);
  burst(p.x + p.w / 2, p.y + p.h / 2, kind === 'fire' || kind === 'lava' ? '#ffb347' : '#ffffff', 8);
  vdCall(vdPh(st), 'onBonk', st, p, kind);
  return true;
}
// one player's input and jump physics (the shielder walks slower and only hops)
function vdControl(st, p, dt) {
  if (!vdShieldUp(st, p.id)) { control(p, dt); return; }
  const run = PHYS.maxRun, jv = PHYS.jumpV;
  PHYS.maxRun = run * VD.shield.walkK; PHYS.jumpV = VD.shield.hopV;
  try { control(p, dt); } finally { PHYS.maxRun = run; PHYS.jumpV = jv; }
}
// grid platforming for both players, as the framework does it (partners are solid, riders are carried)
function vdPlatform(st, dt) {
  const ps = G.players;
  for (const p of ps) vdControl(st, p, dt);
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
function vdCoast(dt) {
  for (const p of G.players) {
    p.pendingJump = false; p.pendingAct = false;
    const real = p.input;
    p.input = NO_INPUT;
    try { control(p, dt); if (p.alive) { moveX(p, p.vx * dt); moveY(p, p.vy * dt); postStep(p); } } finally { p.input = real; }
  }
}
function vdGroundY(x, y) {
  const tx = clamp(Math.floor(x / T), 0, COLS - 1), [a, b] = G.players;
  for (let ty = Math.max(0, Math.floor(y / T)); ty < ROWS; ty++) {
    const ch = tile(tx, ty);
    if (ch === '=' || solidFor(ch, a) || solidFor(ch, b)) return ty * T;
  }
  return H;
}
// the tick runs in world coords: players (and particles made meanwhile) shift by the camera and back
function vdInWorld(st, fn) {
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
function vdScreen(st, fn) { ctx.save(); ctx.translate(st.cam.x, st.cam.y); try { fn(); } finally { ctx.restore(); } }

/* --- the shield (held over the head; it covers whoever stands under it) --- */
function vdShield(st, id, on) { const s = st.shield[id]; if (s) s.on = !!on; }
function vdShieldUp(st, id) { const s = st && st.shield && st.shield[id], p = G.players[id]; return !!(s && s.k >= 0.6 && p && p.alive); }
function vdShieldBox(st, id) {
  if (!vdShieldUp(st, id)) return null;
  const p = G.players[id], K = VD.shield, cx = p.x + p.w / 2, y = p.y - K.lift;
  return { cx, y, x0: cx - K.rx, x1: cx + K.rx, rx: K.rx, ry: K.ry };
}
// whose raised shield covers player q (their own, or the partner's when q stands under it), or -1
function vdUnderShield(st, q) {
  if (!q || !q.alive) return -1;
  const qc = q.x + q.w / 2;
  for (const id of [q.id, 1 - q.id]) {
    const b = vdShieldBox(st, id);
    if (b && qc > b.x0 + 2 && qc < b.x1 - 2 && q.y + q.h * 0.4 > b.y) return id;
  }
  return -1;
}
// a raised shield between (x, y) and the sky
function vdCovered(st, x, y) {
  for (const id of [0, 1]) { const b = vdShieldBox(st, id); if (b && x > b.x0 && x < b.x1 && y > b.y - 4) return id; }
  return -1;
}
// a raised shield's dome touching the circle (x, y, r)
function vdShieldHit(st, x, y, r = 0) {
  for (const id of [0, 1]) {
    const b = vdShieldBox(st, id);
    if (!b) continue;
    const dx = (x - b.cx) / (b.rx + r), dy = (y - b.y) / (b.ry + r);
    if (dx * dx + dy * dy <= 1 && y <= b.y + b.ry * 0.6 + r) return id;
  }
  return -1;
}
function vdShieldBlock(st, id, x, y) {
  const s = st.shield[id];
  if (s) s.hitT = 0.35;
  st.stats.blocks++;
  burst(x, y, C.gold, 6); burst(x, y, '#ffffff', 4);
  if ((st.clangCD || 0) <= 0) { Sfx.play('vdClang', id); st.clangCD = 0.12; }
  rumble(id, 0.2, 0.3, 60);
}
function vdShieldTick(st, dt) {
  st.clangCD = Math.max(0, (st.clangCD || 0) - dt);
  for (const s of st.shield) {
    s.k = approach(s.k, s.on ? 1 : 0, dt / VD.shield.raiseT);
    if (s.hitT > 0) s.hitT = Math.max(0, s.hitT - dt);
  }
}

/* --- fire breath: a telegraphed flame onto a glowing zone --- */
function vdFire(st, o = {}) {
  const c = st.cinder;
  if (vdCalm(st)) return null;
  if (o.target != null) { const tp = G.players[o.target]; if (!tp || !tp.alive || vdBusy(st, tp)) return null; }
  const K = VD.fire, w = o.w || K.w, x = o.x != null ? o.x : c.x, gy = o.gy != null ? o.gy : vdGroundY(x, Math.max(0, c.y));
  const f = { x0: x - w / 2, x1: x + w / 2, cx: x, gy, h: o.h || K.h, phase: 'inhale', t: 0, inhale: o.inhale || K.inhale, breathe: o.breathe || K.breathe,
    from: o.from || null, target: o.target, word: o.word || 'Toasty!', onHit: o.onHit || null, keepFace: !!o.keepFace, hits: 0 };
  st.fires.push(f);
  if (!f.keepFace && Math.abs(x - c.x) > 4) c.face = x > c.x ? 1 : -1;
  c.act = 'inhale'; c.actT = 0;
  if (o.target != null) vdWarn(st, o.target, f.inhale);
  for (const p of G.players) if (p.alive && rectHit(p, f.x0, gy - f.h, w, f.h + 8)) vdWarn(st, p.id, f.inhale);
  st.stats.fires++;
  Sfx.play('vdInhale');
  return f;
}
const vdFireZone = f => ({ x0: f.x0, x1: f.x1, y0: f.gy - f.h, y1: f.gy + 8 });
function vdFireMouth(st, f) { return f.from ? f.from(st) : vdCinderPts(st.cinder).mouth; }
function vdFireOut(st, f) { if (f.phase !== 'out') { f.phase = 'out'; f.t = 0; } }
function vdFireTick(st, dt) {
  const c = st.cinder;
  for (const f of st.fires) {
    f.t += dt;
    if (f.phase === 'inhale' && f.t >= f.inhale) { f.phase = 'breathe'; f.t = 0; c.act = 'breathe'; c.actT = 0; Sfx.play('vdWhoosh'); }
    else if (f.phase === 'breathe') {
      if (f.t >= f.breathe) { vdFireOut(st, f); continue; }
      const z = vdFireZone(f);
      for (const id of [0, 1]) { const b = vdShieldBox(st, id); if (b && b.x1 > z.x0 && b.x0 < z.x1 && (G.tickN % 10) === 0) vdShieldBlock(st, id, clamp(f.cx, b.x0, b.x1), b.y - b.ry * 0.6); }
      for (const p of G.players) {
        if (!p.alive || !rectHit(p, z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0) || vdUnderShield(st, p) >= 0) continue;
        if (f.onHit ? f.onHit(st, p, f) : vdBonk(st, p, { kind: 'fire', word: f.word, fromX: f.cx })) f.hits++;
      }
    }
  }
  if (st.fires.some(f => f.phase === 'out' && f.t > 0.25)) st.fires = st.fires.filter(f => !(f.phase === 'out' && f.t > 0.25));
  if (!st.fires.some(f => f.phase !== 'out') && (c.act === 'inhale' || c.act === 'breathe')) c.act = null;
}
// calm: fires go out, warnings stop
function vdCancelAttacks(st) {
  for (const f of st.fires) vdFireOut(st, f);
  if (st.cinder && (st.cinder.act === 'inhale' || st.cinder.act === 'breathe')) st.cinder.act = null;
  st.warn = [0, 0];
}

/* --- the idle wait: no person pressed anything for VD.idleAfter s --- */
function vdIdleTick(st, dt) {
  const any = vdHumanIds().some(k => { const i = G.players[k].input; return i.left || i.right || i.jump || i.down || i.up || i.act; });
  if (any) {
    if (st.idle) { st.idle = false; vdSay(st, 'Oh! You came back!', 1.6); }
    st.idleT = 0; return;
  }
  st.idleT += dt;
  if (!st.idle && st.idleT >= VD.idleAfter && !st.cut && G.introT <= 0) { st.idle = true; st.idleSayT = 0; vdCancelAttacks(st); }
  if (st.idle && (st.idleSayT -= dt) <= 0) { st.idleSayT = 7; vdSay(st, (st.idleN++) % 2 ? 'Hellooo? *hic*' : 'Hey! Are you still there?', 2.6); }
}

/* --- per-role action words on the touch buttons, the top-bar legend and the cards --- */
let vdLabelEls = null;
function vdActLabels(st) {
  const def = G.level && G.level.def;
  if (!def || !def.act) return;
  let want = vdCall(vdPh(st), 'labels', st);
  if (!want) want = def.act.labels || [def.act.label, def.act.label];
  const key = want[0] + '|' + want[1];
  if (st.labKey === key) return;
  st.labKey = key;
  def.act = Object.assign({}, def.act, { labels: [want[0], want[1]] });   // (a copy: the room's own def stays as written)
  try {
    const lg = vdCall(vdPh(st), 'legend', st);
    if (lg && G.mode === 'play') setLegend(lg);
    if (!vdLabelEls || !vdLabelEls.every(o => document.contains(o.el))) vdLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('.kb-only') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : -1;
      return { el, id };
    });
    for (const o of vdLabelEls) {
      const w = o.id < 0 ? (want[0] === want[1] ? want[0] : want[0] + '/' + want[1]) : want[o.id];
      if (o.el.textContent !== w) o.el.textContent = w;
    }
    if (typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* no page (tests): the cards still read def.act */ }
}

/* --- the mode: phases, cutscenes, the ending --- */
function vdInit(st) {
  st.stats = { bonks: [0, 0], kinds: {}, blocks: 0, fires: 0, hics: 0, help: [], phaseT: [], climb: {}, levers: {}, golf: {}, surf: {} };
  st.idleN = 0; st.ended = false;
}
function vdStartPhase(st, L) {
  const def = L.def;
  st.phase = def.phase; st.phaseNo = def.roomIndex || 0; st.ph = {}; st.phT = 0; st.cam = { x: 0, y: 0 };
  st.cut = null; st.celebT = 0; st.fires = []; st.smoke = []; st.say = null; st.news = null; st.hints = [null, null]; st.pops = [];
  st.badgeT = 0; st.badgeArm = true; st.swapT = 0; st.safe = [0, 0]; st.warn = [0, 0]; st.hot = [0, 0]; st.idleT = 0; st.idle = false; st.labKey = '';
  st.shield = [0, 1].map(() => ({ on: false, k: 0, hitT: 0 }));
  st.cinder = vdNewCinder();
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    if (L.grid[ty][tx] === 'Z') { st.cinder.x = tx * T + T / 2; st.cinder.y = (ty + 1) * T; L.grid[ty][tx] = '.'; }
  }
  if (typeof def.look === 'number') applyTheme(def.look, def.theme);
  if (G.mode === 'play') setLegend(def.legend || LEVELS[G.levelIndex].legend || null);
  if (!VD_PHASES[def.phase]) console.warn('Volcano Dragon: no VD_PHASES.' + def.phase);
  vdCall(vdPh(st), 'setup', st, L);
  vdActLabels(st);
}
function vdCoastPhase(st, dt) { const ph = vdPh(st); if (ph.coast) vdCall(ph, 'coast', st, dt); else vdCoast(dt); }
function vdTick(st, dt) {
  const ph = vdPh(st);
  if (G.introT <= 0) st.phT += dt;
  vdIdleTick(st, dt);
  if (st.celebT > 0) st.celebT = Math.max(0, st.celebT - dt);
  if (st.say && (st.say.t += dt) >= st.say.life) st.say = null;
  if (st.news && (st.news.t += dt) >= st.news.life) st.news = null;
  for (let k = 0; k < 2; k++) {
    const h = st.hints[k];
    if (h && (h.t += dt) >= h.life) st.hints[k] = null;
    st.safe[k] = Math.max(0, st.safe[k] - dt); st.warn[k] = Math.max(0, st.warn[k] - dt); st.hot[k] = Math.max(0, st.hot[k] - dt);
  }
  for (const q of st.pops) q.t += dt;
  if (st.pops.length && st.pops[0].t > 1.1) st.pops = st.pops.filter(q => q.t <= 1.1);
  for (const m of st.smoke) { m.t += dt; m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= 1 - dt; m.r += dt * 10; }
  if (st.smoke.length && st.smoke.some(m => m.t >= m.life)) st.smoke = st.smoke.filter(m => m.t < m.life);
  if (st.swapT > 0) st.swapT = Math.max(0, st.swapT - dt);
  if (st.badgeT > 0 && G.introT <= 0) st.badgeT = Math.max(0, st.badgeT - dt);
  vdCinderTick(st, dt);
  vdShieldTick(st, dt);
  vdFireTick(st, dt);
  if (vdCalm(st) && st.fires.some(f => f.phase !== 'out')) vdCancelAttacks(st);
  if (st.cut) { vdCutStep(st, dt); if (G.mst === st && st.cut && st.cut.kind === 'leave') vdCoastPhase(st, dt); return; }
  if (G.introT > VD.introHold) {
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
    if (ph.wait) vdCall(ph, 'wait', st, dt); else vdCoastPhase(st, dt);
    vdActLabels(st);
    return;
  }
  if (st.badgeArm) { st.badgeArm = false; st.badgeT = VD.badgeT; }
  vdCall(ph, 'step', st, dt);
  vdActLabels(st);
}
function vdStep(st, dt) {
  if (!st.cinder) return;
  if (st.cut && st.cut.kind === 'end') { vdEndStep(st, dt); return; }
  vdInWorld(st, () => vdTick(st, dt));
}
// The phase is won. o.say: Cinder's line; o.stay: he stays put instead of flying off. Next room after VD.leaveT s
// (the last room plays the ending). False if a cutscene is already running.
function vdPhaseDone(st, o = {}) {
  if (st.cut) return false;
  st.stats.phaseT[st.phaseNo] = Math.round(st.phT * 10) / 10;
  vdCancelAttacks(st);
  for (const s of st.shield) s.on = false;
  const def = G.level.def;
  if (def.roomIndex >= def.roomCount - 1) return vdEnding(st, o);
  st.cut = { kind: 'leave', t: 0, said: false, say: o.say || 'Hmph! Fine... but you won\'t get past the next bit!', stay: !!o.stay };
  Sfx.play('vdPhase');
  return true;
}
function vdCutStep(st, dt) {
  const c = st.cut, b = st.cinder;
  if (c.kind !== 'leave') return;
  if (st.celebT > 0 && !c.go) return;
  if (!c.go) { c.go = true; c.x0 = b.x; c.y0 = b.y; }
  c.t += dt;
  if (!c.said) { c.said = true; vdSay(st, c.say, 2.4); }
  if (!c.stay && c.t > 1.2) {
    if (!b.air) { b.air = true; b.pose = 'fly'; b.act = null; Sfx.play('vdFlap'); }
    const k = c.t - 1.2;
    b.y = c.y0 - k * k * 220 - k * 60; b.x = c.x0 + k * k * 150 * (b.face || 1);
  }
  if (c.t >= VD.leaveT) nextRoom();
}
// The ending (after the race): Cinder cheers, "Friends?", hugs, waves, the volcano puffs friendly fireworks, then
// levelClear(). The core owns the screen: the phase's hooks stop, the camera goes home, both players stand by him.
function vdEnding(st, o = {}) {
  if (st.cut && st.cut.kind === 'end') return false;
  st.cut = { kind: 'end', t: 0, step: 0, fw: [], fwT: 0, line: o.say || null };
  st.cam = { x: 0, y: 0 }; st.fires = []; st.smoke = []; st.pops = []; st.hints = [null, null]; st.news = null; st.badgeT = 0; st.swapT = 0; st.warn = [0, 0];
  const c = st.cinder, gy = VD.endGround;
  Object.assign(c, { x: W / 2, y: gy, s: 1.05, face: 1, pose: 'cheer', mood: 'happy', baseMood: 'happy', moodT: 0, air: false, act: null, gy: null, lava: null, hidden: false, alpha: 1, sayAt: null });
  G.players.forEach((p, k) => Object.assign(p, { alive: true, respawnT: 0, x: W / 2 + (k ? 150 : -150) - p.w / 2, y: gy - p.h, vx: 0, vy: 0, stun: 0, knockT: 0, grounded: true, face: k ? -1 : 1, sx: 1, sy: 1 }));
  Sfx.play('vdPhase');
  return true;
}
function vdEndStep(st, dt) {
  const c = st.cut, b = st.cinder, gy = VD.endGround;
  c.t += dt;
  vdCinderTick(st, dt);
  if (st.say && (st.say.t += dt) >= st.say.life) st.say = null;
  for (let k = 0; k < 2; k++) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  for (const q of st.pops) q.t += dt;
  // players: no input, a happy hop now and then, on the ending's flat ground
  for (const p of G.players) {
    p.pendingJump = false; p.pendingAct = false;
    p.vy += PHYS.g * dt; p.y += p.vy * dt;
    if (p.y + p.h >= gy) { if (!p.grounded && p.vy > 200) { p.sx = 1.2; p.sy = 0.8; } p.y = gy - p.h; p.vy = 0; p.grounded = true; }
    const want = W / 2 + (p.id ? 100 : -100) - p.w / 2;
    if (c.t > 1.6 && Math.abs(p.x - want) > 2) { p.x += Math.sign(want - p.x) * Math.min(Math.abs(want - p.x), 140 * dt); }
    p.face = b.x > p.x + p.w / 2 ? 1 : -1;
  }
  const hop = (s = 0.6) => { for (const p of G.players) if (p.grounded) { p.vy = -PHYS.jumpV * s; p.grounded = false; p.sx = 0.8; p.sy = 1.25; } };
  const at = (n, time) => c.step === n && c.t >= time && ++c.step;
  if (at(0, 0)) { vdSay(st, c.line || 'Woohoo! That was the BEST race ever!', 2.2); hop(0.5); }
  if (at(1, 1.8)) { b.pose = 'hug'; vdSay(st, 'Sorry I was so grumpy... Friends?', 2.4); }
  if (at(2, 3.2)) {
    st.hints[0] = { text: 'Friends!', t: 0, life: 2.2, gold: true }; st.hints[1] = { text: 'Best friends!', t: 0, life: 2.2, gold: true };
    hop(0.7); Sfx.play('vdHug'); for (let n = 0; n < 6; n++) st.pops.push({ x: b.x + (n - 2.5) * 30, y: b.y - 170, text: '♥', col: '#ff8fa3', size: 26, t: -n * 0.08 });
  }
  if (at(3, 4.6)) { b.pose = 'wave'; vdSay(st, 'Come back and play anytime!', 2.6); hop(0.55); Sfx.play('vdCheer'); }
  // friendly fireworks puffing out of the volcano
  if (c.t > 2.6 && (c.fwT -= dt) <= 0) {
    c.fwT = 0.32 + vdRand() * 0.3;
    c.fw.push({ x: W / 2 + (vdRand() - 0.5) * 60, y: 200, vx: (vdRand() - 0.5) * 220, vy: -330 - vdRand() * 120, t: 0, fuse: 0.55 + vdRand() * 0.3, col: ['#ff8fc7', '#ffd23f', '#7fd6ff', '#9fe07f', '#ffffff', '#ffb347'][Math.floor(vdRand() * 6)], boom: false });
    Sfx.play('vdPop');
  }
  for (const f of c.fw) {
    f.t += dt;
    if (!f.boom) { f.vy += 260 * dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.t >= f.fuse) { f.boom = true; f.bt = 0; } }
    else f.bt += dt;
  }
  if (c.fw.length > 3) c.fw = c.fw.filter(f => !f.boom || f.bt < 1.3);
  if ((G.tickN % 9) === 0 && c.t > 3.2) confetti(80 + vdRand() * (W - 160), 40 + vdRand() * 60);
  if (at(4, VD.endT)) { st.ended = true; levelClear(); }
}

MODES.dragon = {
  rand: Math.random,   // gameplay randomness (vdRand); tests may swap in a seeded one (MODES.dragon.test.seed)
  setup(st, L) { vdInit(st); vdStartPhase(st, L); },
  room(k, L) { vdStartPhase(G.mst, L); },
  step(dt) { vdStep(G.mst, dt); },
  onKill(p) { const st = G.mst; if (st.cinder && !(st.cut && st.cut.kind === 'end')) vdCall(vdPh(st), 'onKill', st, p); },
  onRespawn(p) { const st = G.mst; if (st.cinder && !(st.cut && st.cut.kind === 'end')) vdCall(vdPh(st), 'onRespawn', st, p); },
  draw() { const st = G.mst; if (st.cinder) vdDraw(st); },
  drawTop() { const st = G.mst; if (st.cinder) vdDrawTop(st); },
  hud() { const st = G.mst; if (st.cinder) vdHud(st); },
  stats() { return vdStatsOut(G.mst); },
};

function vdStatsOut(st) {
  const s = st.stats, bonks = s.bonks[0] + s.bonks[1], t = G.time, M = VD.medal;
  const medal = t <= M.gold.t && bonks <= M.gold.bonks ? 'Gold' : t <= M.silver.t && bonks <= M.silver.bonks ? 'Silver' : 'Bronze';
  const out = [{ label: 'Bonks', values: [s.bonks[0], s.bonks[1]] }];
  const lines = [];
  for (const ph of VD_ORDER) {
    const P = VD_PHASES[ph];
    if (!P) continue;
    const tile = vdCall(P, 'stat', st), line = vdCall(P, 'statLine', st);
    if (tile) out.push(tile);
    if (line) lines.push(line);
  }
  out.push({ label: 'Trophy', value: medal });
  out.push(lines.map(l => l + '. ').join('') + medal + ' trophy! ' + (bonks === 0 ? 'Not one bonk! ' : bonks <= 3 ? 'Hardly toasty at all! ' : '') + 'Cinder is your friend now!');
  return out;
}

/* --- drawing: Cinder --- */
const VDC = { body: '#f2662f', bodyDk: '#b8401c', bodyLt: '#ff9257', belly: '#ffd9a0', bellyDk: '#e8ac68', wing: '#ffa040', wingDk: '#cc5a20',
  horn: '#fff1cf', ink: '#3a1a1a', slab: '#3b3540', slabLt: '#57505e', glow: '#ffb347', lava: '#ff7a1f', lavaLt: '#ffc04d', lavaDk: '#d8461a' };
function vdDrawCinder(c) {
  if (!c || c.hidden) return;
  const g = vdCinderGeo(c), s = c.s, f = c.face || 1, t = c.t, pose = vdPoseOf(c), air = vdAir(c);
  ctx.save();
  if (c.alpha < 1) ctx.globalAlpha = Math.max(0, c.alpha);
  // shadow (not in the lava)
  if (c.lava == null) {
    const gy = c.gy != null ? c.gy : c.y, hgt = Math.max(0, gy - c.y), k = clamp(1 - hgt / 360, 0.3, 1);
    ctx.fillStyle = `rgba(30,12,20,${0.25 * k})`; ctx.beginPath(); ctx.ellipse(c.x, gy, 62 * s * k, 9 * s * k, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.save(); ctx.beginPath(); ctx.rect(c.x - 400 * s, c.y - 600 * s - 1000, 800 * s, c.lava - (c.y - 600 * s - 1000)); ctx.clip();
  }
  ctx.save();
  ctx.translate(c.x, c.y); ctx.scale(s * f, s); ctx.translate(0, g.o);
  ctx.translate(0, -40); ctx.rotate(g.ang); ctx.translate(0, 40); ctx.scale(g.sx, g.sy);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = VDC.ink;
  if (pose === 'surf') vdDrawRockSlab(0, 4, 1, t, true);
  // tail (behind): a curl with a little spade tip
  ctx.save(); ctx.translate(-40, -34); ctx.rotate(Math.sin(t * 2.1) * 0.12 + (pose === 'cheer' || pose === 'surf' ? -0.3 : 0));
  const tail = () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-38, 26, -58, -2); ctx.quadraticCurveTo(-70, -26, -50, -32); ctx.quadraticCurveTo(-34, -34, -38, -18); };
  ctx.lineWidth = 15; ctx.strokeStyle = VDC.ink; tail(); ctx.stroke();
  ctx.lineWidth = 10; ctx.strokeStyle = VDC.bodyDk; tail(); ctx.stroke();
  ctx.fillStyle = VDC.horn; ctx.strokeStyle = VDC.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-38, -18); ctx.lineTo(-30, -6); ctx.lineTo(-44, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  // the far wing and the far leg and arm
  vdDrawWing(-6, -100, g.flap * 0.9 + 0.12, VDC.wingDk, 0.9);
  vdDrawLeg(g, -24, VDC.bodyDk, true);
  vdDrawArm(g, -1, t, c);
  // body
  ctx.fillStyle = VDC.body; ctx.strokeStyle = VDC.ink; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(0, -58, 52 * g.belly, 52, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.ellipse(-18, -82, 18, 12, -0.5, 0, Math.PI * 2); ctx.fill();
  // back spikes
  ctx.fillStyle = VDC.horn; ctx.lineWidth = 2;
  for (const [x, y, a] of [[-38, -92, -2.3], [-50, -70, -2.7], [-53, -46, -3.05]]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(0, 11); ctx.lineTo(6, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  // belly with stripes
  ctx.fillStyle = VDC.belly; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(16, -54, 32 * g.belly, 37, 0.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = VDC.bellyDk; ctx.lineWidth = 2.5;
  for (const y of [-74, -56, -38]) { ctx.beginPath(); ctx.moveTo(-6, y); ctx.quadraticCurveTo(16, y + 6, 40, y - 1); ctx.stroke(); }
  ctx.strokeStyle = VDC.ink;
  // near leg and wing
  vdDrawLeg(g, 22, VDC.body, false);
  vdDrawWing(-14, -96, g.flap, VDC.wing, 1);
  // raised arms go behind the head (the hands show above it)
  const armUp = g.arms === 'up' || g.arms === 'wave' || g.arms === 'flail';
  if (armUp) vdDrawArm(g, 1, t, c);
  // head
  ctx.fillStyle = VDC.body; ctx.lineWidth = 4;
  circle(26, -124, 42); ctx.fill(); ctx.stroke();
  if (g.cheek > 0) { ctx.fillStyle = VDC.body; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(46, -106, 16 + 10 * g.cheek, 14 + 8 * g.cheek, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  // horns
  ctx.fillStyle = VDC.horn; ctx.lineWidth = 2.5;
  for (const [x, y, a] of [[6, -158, -0.5], [32, -164, -0.15]]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-7, 4); ctx.quadraticCurveTo(-6, -14, 2, -20); ctx.quadraticCurveTo(4, -8, 8, 4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  // snout and nostrils
  ctx.fillStyle = VDC.bodyLt; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(60, -106, 27, 19, -0.05, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = VDC.ink;
  for (const [x, y] of [[70, -116], [80, -113]]) { ctx.beginPath(); ctx.ellipse(x, y, 2.6, 3.6, 0.3, 0, Math.PI * 2); ctx.fill(); }
  if (c.hic > 0) { ctx.fillStyle = `rgba(80,70,80,${0.6 * c.hic})`; circle(88, -120, 6 + (1 - c.hic) * 8); ctx.fill(); }
  // blush
  ctx.fillStyle = 'rgba(255,120,140,0.45)'; ctx.beginPath(); ctx.ellipse(36, -102, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  // eyes
  vdDrawEyes(c, g);
  // brows
  ctx.strokeStyle = VDC.ink; ctx.lineWidth = 4;
  const brow = c.mood === 'grumpy' && g.eyes === 'open' ? [[4, -156, 22, -148], [32, -152, 54, -158]]
    : c.mood === 'surprised' ? [[4, -160, 22, -164], [32, -166, 54, -164]] : [[4, -154, 22, -158], [32, -160, 54, -158]];
  if (g.eyes !== 'swirl') for (const [x0, y0, x1, y1] of brow) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
  // mouth
  vdDrawMouth(g, t);
  // near arm (over the belly)
  if (!armUp) vdDrawArm(g, 1, t, c);
  ctx.restore();
  if (c.lava != null) {
    ctx.restore();
    // ripples where he sits in his hot tub
    const r = 70 * s;
    ctx.strokeStyle = 'rgba(255,230,150,0.8)'; ctx.lineWidth = 3;
    for (let k = 0; k < 2; k++) { const u = (t * 0.7 + k * 0.5) % 1; ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.ellipse(c.x, c.lava + 2, r * (0.7 + u * 0.6), 7 * s * (0.7 + u * 0.6), 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (pose === 'splash') for (let k = 0; k < 6; k++) {
      const a = t * 3 + k, u = (t * 1.6 + k / 6) % 1;
      ctx.fillStyle = k % 2 ? VDC.lavaLt : VDC.lava;
      circle(c.x + Math.cos(a * 2.3) * (40 + u * 50) * s, c.lava - Math.sin(u * Math.PI) * 70 * s, (7 - u * 4) * s); ctx.fill();
    }
  }
  // over him: dizzy stars
  if (pose === 'dizzy') {
    const P = vdCinderPts(c);
    for (let k = 0; k < 4; k++) { const a = t * 4 + k * Math.PI / 2; vdStar(P.head.x + Math.cos(a) * 60 * s, P.head.y - 58 * s + Math.sin(a) * 12 * s, 8 * s, C.gold); }
  }
  ctx.restore();
}
function vdDrawWing(x, y, flap, col, k) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-flap); ctx.scale(k, k);
  ctx.fillStyle = col; ctx.strokeStyle = VDC.ink; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-14, -42, -50, -40);
  ctx.quadraticCurveTo(-40, -26, -48, -12);
  ctx.quadraticCurveTo(-32, -18, -30, -2);
  ctx.quadraticCurveTo(-16, -10, -8, 6);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-4, -2); ctx.quadraticCurveTo(-18, -30, -48, -38); ctx.stroke();
  ctx.restore();
}
function vdDrawLeg(g, x, col, far) {
  ctx.fillStyle = col; ctx.strokeStyle = VDC.ink; ctx.lineWidth = 3;
  let y = -10, rx = 17, ry = 14, a = 0;
  if (g.legs === 'dangle') { y = -2; ry = 16; a = 0.25; }
  else if (g.legs === 'fold') { y = -8; rx = 22; ry = 11; }
  else if (g.legs === 'tuck') { y = -24; ry = 12; a = -0.3; }
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (!far) { ctx.fillStyle = VDC.horn; ctx.lineWidth = 1.5; for (let k = 0; k < 3; k++) { circle(x + 6 + k * 6, y + ry - 3, 2.6); ctx.fill(); ctx.stroke(); } }
}
// a little arm from the shoulder to the hand (side -1 the far arm, 1 the near arm)
function vdDrawArm(g, side, t, c) {
  const sh = side > 0 ? [30, -78] : [-6, -82];
  let h;
  switch (g.arms) {
    case 'up': h = side > 0 ? [66, -170] : [-26, -158]; break;
    case 'out': h = side > 0 ? [66, -72] : [-46, -80]; break;
    case 'hug': h = side > 0 ? [80, -70 + Math.sin(t * 5) * 3] : [70, -78 + Math.sin(t * 5) * 3]; break;
    case 'wave': h = side > 0 ? [76 + Math.sin(t * 9) * 12, -168] : [-16, -50]; break;
    case 'flail': h = side > 0 ? [64 + Math.sin(t * 18) * 10, -166] : [-30 + Math.sin(t * 16) * 8, -156]; break;
    case 'rim': h = side > 0 ? [84, -66] : [-68, -66]; break;
    default: h = side > 0 ? [44, -54] : [-16, -50];
  }
  ctx.strokeStyle = VDC.ink; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(h[0], h[1]); ctx.stroke();
  ctx.strokeStyle = side > 0 ? VDC.body : VDC.bodyDk; ctx.lineWidth = 8.5; ctx.stroke();
  ctx.fillStyle = side > 0 ? VDC.body : VDC.bodyDk; ctx.strokeStyle = VDC.ink; ctx.lineWidth = 2.5; circle(h[0], h[1], 7.5); ctx.fill(); ctx.stroke();
}
function vdDrawEyes(c, g) {
  const lk = c.look ? clamp((c.look.x - c.x) * (c.face || 1) / 200, -1, 1) : 0.5, lky = c.look ? clamp((c.look.y - (c.y - 120 * c.s)) / 200, -1, 1) : 0.2;
  for (const [ex, ey, er] of [[16, -134, 12.5], [42, -137, 14]]) {
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = VDC.ink; ctx.lineWidth = 2.5;
    if (g.eyes === 'shut' || g.eyes === 'content') { ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(ex, ey - 2, er * 0.65, 0.25, Math.PI - 0.25); ctx.stroke(); continue; }
    if (g.eyes === 'happy') { ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(ex, ey + 4, er * 0.6, Math.PI + 0.3, -0.3); ctx.stroke(); continue; }
    if (g.eyes === 'squeeze') { ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(ex - 8, ey - 6); ctx.lineTo(ex + 6, ey); ctx.lineTo(ex - 8, ey + 6); ctx.stroke(); continue; }
    circle(ex, ey, er); ctx.fill(); ctx.stroke();
    if (g.eyes === 'swirl') { ctx.lineWidth = 2; ctx.beginPath(); for (let a = 0; a < 10; a += 0.4) ctx.lineTo(ex + Math.cos(a + c.t * 6) * a * 1.0, ey + Math.sin(a + c.t * 6) * a * 1.0); ctx.stroke(); continue; }
    const px = ex + lk * er * 0.4, py = ey + lky * er * 0.35;
    ctx.fillStyle = VDC.ink; circle(px, py, er * 0.5); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(px - er * 0.18, py - er * 0.2, er * 0.17); ctx.fill();
  }
}
function vdDrawMouth(g, t) {
  ctx.strokeStyle = VDC.ink; ctx.lineWidth = 3;
  switch (g.mouth) {
    case 'smile': ctx.beginPath(); ctx.moveTo(44, -98); ctx.quadraticCurveTo(62, -86, 82, -98); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(52, -95); ctx.lineTo(56, -88); ctx.lineTo(60, -94); ctx.closePath(); ctx.fill(); break;
    case 'open': ctx.fillStyle = '#5a1a20'; ctx.beginPath(); ctx.moveTo(44, -99); ctx.quadraticCurveTo(64, -76, 84, -99); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff8fa3'; ctx.beginPath(); ctx.ellipse(64, -88, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); break;
    case 'o': ctx.fillStyle = '#5a1a20'; circle(80, -100, 6); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,180,70,0.85)'; circle(80, -100, 3.2); ctx.fill(); break;
    case 'wide': ctx.fillStyle = '#5a1a20'; ctx.beginPath(); ctx.ellipse(78, -98, 12, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.ellipse(80, -98, 7, 7, 0, 0, Math.PI * 2); ctx.fill(); break;
    case 'blub': ctx.beginPath(); for (let k = 0; k <= 6; k++) ctx.lineTo(48 + k * 5.5, -96 + Math.sin(t * 20 + k) * 3); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; circle(90, -104 - ((t * 40) % 20), 4); ctx.stroke(); break;
    case 'wobble': ctx.beginPath(); for (let k = 0; k <= 6; k++) ctx.lineTo(48 + k * 5.5, -96 + (k % 2 ? 3 : -2)); ctx.stroke(); break;
    default: ctx.beginPath(); ctx.moveTo(46, -92); ctx.quadraticCurveTo(62, -102, 80, -94); ctx.stroke();   // frown
  }
}
function vdStar(x, y, r, col) {
  ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
}
// a cooled lava-rock slab, centred on x with its top at y (units scaled by s); glowing cracks
function vdDrawRockSlab(x, y, s, t, local) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = VDC.slab; ctx.strokeStyle = local ? VDC.ink : C.ink; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-72, 0); ctx.quadraticCurveTo(-82, 8, -66, 16); ctx.lineTo(62, 16); ctx.quadraticCurveTo(86, 10, 76, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = VDC.slabLt; ctx.fillRect(-60, 1, 120, 3);
  ctx.strokeStyle = `rgba(255,${150 + Math.round(Math.sin(t * 5) * 40)},60,0.9)`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-40, 6); ctx.lineTo(-28, 12); ctx.lineTo(-14, 8); ctx.moveTo(18, 5); ctx.lineTo(30, 11); ctx.lineTo(44, 7); ctx.stroke();
  ctx.restore();
}
// friendly cartoon lava from x0 to x1 with its surface at y (world coords); opts.depth (default down to the screen
// bottom in world terms: 400 px)
function vdDrawLava(x0, x1, y, t, o = {}) {
  const d = o.depth || 400;
  const g = ctx.createLinearGradient(0, y, 0, y + Math.min(d, 160));
  g.addColorStop(0, VDC.lavaLt); g.addColorStop(0.35, VDC.lava); g.addColorStop(1, VDC.lavaDk);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x0, y + d);
  for (let x = x0; x <= x1 + 12; x += 12) ctx.lineTo(Math.min(x, x1), y + Math.sin(x * 0.05 + t * 2.4) * 3 + Math.sin(x * 0.13 - t * 1.7) * 1.5);
  ctx.lineTo(x1, y + d); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,170,0.85)'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let x = x0; x <= x1 + 12; x += 12) ctx.lineTo(Math.min(x, x1), y + Math.sin(x * 0.05 + t * 2.4) * 3 + Math.sin(x * 0.13 - t * 1.7) * 1.5);
  ctx.stroke();
  // bubbles (a pure function of x and t)
  for (let x = Math.ceil(x0 / 70) * 70; x < x1; x += 70) {
    const u = ((t * 0.6 + hash(x, 7) % 100 / 100) % 1), bx = x + (hash(x, 3) % 30);
    if (u > 0.75) continue;
    ctx.fillStyle = 'rgba(255,225,140,0.85)'; circle(bx, y + 14 - u * 12, 3 + u * 5); ctx.fill();
  }
}
// the volcanic sunset backdrop: sky, a distant smoking volcano (screen coords). o.x / o.y move the volcano.
function vdDrawBackdrop(t, o = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#4a1f45'); g.addColorStop(0.55, '#c8504a'); g.addColorStop(1, '#ffa255');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,214,150,0.9)'; circle(150, 120, 40); ctx.fill();
  ctx.fillStyle = 'rgba(255,170,110,0.3)'; circle(150, 120, 62); ctx.fill();
  const vx = o.x != null ? o.x : 640, vy = o.y != null ? o.y : 230;
  ctx.fillStyle = '#5e2a33';
  ctx.beginPath(); ctx.moveTo(vx - 420, H); ctx.lineTo(vx - 60, vy); ctx.lineTo(vx + 60, vy); ctx.lineTo(vx + 420, H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,140,60,0.55)'; ctx.beginPath(); ctx.ellipse(vx, vy, 60, 9, 0, 0, Math.PI * 2); ctx.fill();
  for (let k = 0; k < 4; k++) {
    const u = (t * 0.12 + k / 4) % 1;
    ctx.fillStyle = `rgba(110,90,110,${0.45 * (1 - u)})`; circle(vx + Math.sin(u * 5 + k) * 30 + u * 60, vy - 20 - u * 160, 20 + u * 40); ctx.fill();
  }
  ctx.fillStyle = '#3a1d2a';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 420 + Math.sin(x * 0.009 + 2) * 24 + Math.sin(x * 0.023) * 8);
  ctx.lineTo(W, H); ctx.fill();
}

/* --- drawing: shields, fire --- */
function vdDrawShields(st) {
  for (const p of G.players) {
    const sh = st.shield[p.id];
    if (!p.alive || !sh || sh.k <= 0.02) continue;
    const K = VD.shield, k = sh.k, cx = p.x + p.w / 2, y = p.y + 6 - (K.lift + 6) * k, rx = K.rx * (0.5 + 0.5 * k), ry = K.ry * (0.6 + 0.4 * k);
    ctx.save();
    // the handle down to the hands
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + p.face * 2, p.y + 12); ctx.stroke();
    if (sh.hitT > 0) { ctx.fillStyle = `rgba(255,220,120,${sh.hitT * 1.6})`; ctx.beginPath(); ctx.ellipse(cx, y, rx + 10, ry + 8, 0, Math.PI, 0); ctx.fill(); }
    ctx.fillStyle = '#7d8aa8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(cx, y, rx, ry, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(cx - rx * 0.35, y - ry * 0.5, rx * 0.28, ry * 0.25, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PCOL[p.id]; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - rx, y); ctx.lineTo(cx + rx, y); ctx.stroke();
    ctx.fillStyle = C.gold; circle(cx, y - ry * 0.55, 3.5); ctx.fill();
    ctx.restore();
  }
}
// the target zones (on the ground, under the players)
function vdDrawFireZones(st) {
  for (const f of st.fires) {
    if (f.phase === 'out') continue;
    const k = f.phase === 'inhale' ? clamp(f.t / f.inhale, 0, 1) : 1, w = f.x1 - f.x0, pulse = 0.6 + 0.4 * Math.sin(G.clock * 14);
    ctx.fillStyle = `rgba(255,120,40,${0.18 + 0.3 * k})`; ctx.beginPath(); ctx.ellipse(f.cx, f.gy, w / 2, 9 + 4 * k, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,70,50,${pulse})`; ctx.lineWidth = 3; ctx.setLineDash([7, 5]);
    ctx.beginPath(); ctx.ellipse(f.cx, f.gy, w / 2, 9 + 4 * k, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    if (f.phase === 'inhale') {   // heat shimmer rising from the spot
      ctx.strokeStyle = `rgba(255,200,120,${0.5 * k})`; ctx.lineWidth = 2;
      for (let n = 0; n < 4; n++) { const x = f.x0 + w * (n + 0.5) / 4, u = (G.clock * 1.5 + n * 0.3) % 1; ctx.beginPath(); ctx.moveTo(x, f.gy - u * 50); ctx.quadraticCurveTo(x + 6, f.gy - u * 50 - 10, x, f.gy - u * 50 - 20); ctx.stroke(); }
    }
  }
}
function vdDrawFlames(st) {
  for (const f of st.fires) {
    const M = vdFireMouth(st, f);
    if (f.phase === 'inhale') {   // sparks sucked into his mouth
      const k = clamp(f.t / f.inhale, 0, 1);
      ctx.fillStyle = 'rgba(255,230,150,0.9)';
      for (let n = 0; n < 6; n++) { const u = (G.clock * 2 + n / 6) % 1, a = n * 1.1; circle(M.x + Math.cos(a) * 60 * (1 - u), M.y + Math.sin(a) * 40 * (1 - u), 2 + k * 2); ctx.fill(); }
      ctx.fillStyle = `rgba(255,180,70,${0.3 + 0.5 * k})`; circle(M.x, M.y, 6 + 8 * k); ctx.fill();
      continue;
    }
    const a = f.phase === 'out' ? clamp(1 - f.t / 0.25, 0, 1) : clamp(f.t / 0.08, 0, 1);
    if (a <= 0) continue;
    ctx.save(); ctx.globalAlpha = a;
    const tx = f.cx, ty = f.gy - 18, w = (f.x1 - f.x0) / 2;
    const layers = [['rgba(230,60,30,0.85)', 1], ['rgba(255,150,50,0.9)', 0.68], ['rgba(255,236,140,0.95)', 0.36]];
    for (const [col, k] of layers) {
      const fl = Math.sin(G.clock * 30 + k * 7) * 6;
      ctx.fillStyle = col; ctx.beginPath();
      ctx.moveTo(M.x, M.y - 5 * k);
      ctx.quadraticCurveTo((M.x + tx) / 2 + fl, (M.y + ty) / 2 - 20 * k, tx - w * k, ty);
      ctx.lineTo(tx + w * k, ty);
      ctx.quadraticCurveTo((M.x + tx) / 2 - fl, (M.y + ty) / 2 + 20 * k, M.x, M.y + 5 * k);
      ctx.closePath(); ctx.fill();
    }
    // the flame carpet over the zone, splashing off any raised shield
    for (let x = f.x0 + 8; x < f.x1; x += 14) {
      const cov = vdShieldBoxScreen(st, x);
      const base = cov ? cov.y - cov.ry * 0.4 : f.gy, hgt = (cov ? 18 : 30) + Math.sin(G.clock * 25 + x) * 10;
      ctx.fillStyle = 'rgba(255,120,40,0.9)'; ctx.beginPath(); ctx.moveTo(x - 9, base); ctx.quadraticCurveTo(x, base - hgt * 1.3, x + 9, base); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,230,140,0.95)'; ctx.beginPath(); ctx.moveTo(x - 4, base); ctx.quadraticCurveTo(x, base - hgt * 0.7, x + 4, base); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}
// (drawing runs between ticks: players are on screen, the fire is in world coords)
function vdShieldBoxScreen(st, wx) {
  for (const id of [0, 1]) {
    if (!vdShieldUp(st, id)) continue;
    const p = G.players[id], K = VD.shield, cx = p.x + p.w / 2 + st.cam.x, y = p.y - K.lift + st.cam.y;
    if (wx > cx - K.rx && wx < cx + K.rx) return { cx, y, ry: K.ry };
  }
  return null;
}

/* --- drawing: the layers --- */
function vdDraw(st) {
  const ph = vdPh(st);
  if (st.cut && st.cut.kind === 'end') { vdDrawEndScene(st); return; }
  ctx.save(); ctx.translate(-st.cam.x, -st.cam.y);
  vdCall(ph, 'drawBack', st);
  vdDrawCinder(st.cinder);
  vdCall(ph, 'draw', st);
  vdDrawFireZones(st);
  ctx.restore();
}
function vdDrawTop(st) {
  const ph = vdPh(st), big = hudBig(), z = big ? 1.4 : 1, end = st.cut && st.cut.kind === 'end';
  ctx.save(); ctx.translate(-st.cam.x, -st.cam.y);
  if (!end) vdCall(ph, 'drawTop', st);
  vdDrawFlames(st);
  // smoke puffs (hiccups)
  for (const m of st.smoke) { ctx.fillStyle = `rgba(90,80,95,${0.55 * (1 - m.t / m.life)})`; circle(m.x, m.y, m.r); ctx.fill(); }
  // pop words
  for (const q of st.pops) {
    if (q.t < 0) continue;
    const k = q.t / 1.1, s2 = 0.7 + 0.5 * Math.min(1, q.t / 0.12);
    ctx.save(); ctx.globalAlpha = clamp((1.1 - q.t) / 0.4, 0, 1);
    bigText(q.text, clamp(q.x, st.cam.x + 60, st.cam.x + W - 60), q.y - k * 30, q.size * z, q.col, s2);
    ctx.restore();
  }
  ctx.restore();
  // screen coords: shields over their players, hot feet, the "!" warnings
  vdDrawShields(st);
  for (const p of G.players) {
    if (!p.alive) continue;
    if (st.hot[p.id] > 0) {
      const a = clamp(st.hot[p.id] / 0.5, 0, 1);
      ctx.fillStyle = `rgba(255,150,60,${0.8 * a})`;
      for (let n = 0; n < 3; n++) { const x = p.x + 4 + n * 7, h = 6 + Math.sin(G.clock * 30 + n * 2) * 3; ctx.beginPath(); ctx.moveTo(x - 3, p.y + p.h); ctx.quadraticCurveTo(x, p.y + p.h - h * 2, x + 3, p.y + p.h); ctx.fill(); }
      ctx.fillStyle = `rgba(100,90,100,${0.5 * a})`; circle(p.x + p.w / 2 + Math.sin(G.clock * 3) * 4, p.y - 6 - (1 - a) * 16, 5 + (1 - a) * 6); ctx.fill();
    }
    if (st.warn[p.id] > 0) { const bob = Math.abs(Math.sin(G.clock * 12)) * 5; bigText('!', p.x + p.w / 2, p.y - 24 - bob - vdHeadLift(st, p) - (vdShieldUp(st, p.id) ? 30 : 0), 30 * z, '#ff5f6d', 1); }
  }
  // his speech bubble
  const sb = vdSayBox(st);
  if (sb) {
    const { fs, tw, th, side, bx, by, mx, my } = sb, a = clamp(Math.min(st.say.t / 0.12, (st.say.life - st.say.t) / 0.25), 0, 1);
    ctx.font = vdLilita(fs);
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
const vdHeadLift = (st, p) => (st.cut && st.cut.kind === 'end' ? 0 : vdCall(vdPh(st), 'headLift', st, p) || 0);
// his speech bubble: beside his head (screen coords), under the strip and the news line. Null when he says nothing.
function vdSayBox(st) {
  const c = st.cinder;
  if (!st.say || ((c.hidden || c.alpha <= 0) && !c.sayAt)) return null;
  const z = hudBig() ? 1.4 : 1, fs = Math.round(16 * z);
  let hx, hy, hr, mx, my;
  if (c.sayAt) { hx = c.sayAt.x; hy = c.sayAt.y; hr = c.sayAt.r || 30; mx = hx; my = hy; }
  else { const P = vdCinderPts(c); hx = P.head.x - st.cam.x; hy = P.head.y - st.cam.y; hr = P.head.r; mx = P.mouth.x - st.cam.x; my = P.mouth.y - st.cam.y; }
  ctx.font = vdLilita(fs);
  const tw = ctx.measureText(st.say.text).width + 26 * z, th = fs + 16 * z, B = vdStripBox();
  let side = c.face || 1;
  const gap = hr + 18 * z;
  if ((side < 0 && hx - gap - tw < 6) || (side > 0 && hx + gap + tw > W - 6)) side = -side;
  const bx = clamp(hx + side * (gap + tw / 2), tw / 2 + 6, W - tw / 2 - 6);
  let by = clamp(hy - hr * 0.6, B.y0 + B.h + th / 2 + 10, H - th / 2 - 10);
  const nb = vdNewsBox(st);
  if (nb && bx + tw / 2 > nb.x0 - 4 && bx - tw / 2 < nb.x1 + 4 && by - th / 2 < nb.y1 + 6) by = Math.min(H - th / 2 - 10, nb.y1 + th / 2 + 8);
  return { fs, tw, th, side, bx, by, mx: clamp(mx, 4, W - 4), my: clamp(my, by - th, by + th * 1.5) };
}
function vdNewsBox(st) {
  const n = st.news;
  if (!n || G.introT > 0) return null;
  const big = hudBig(), B = vdStripBox(), fs = big ? 19 : 14, h = big ? 36 : 28, y = B.y0 + B.h + 6;
  ctx.font = vdFont(fs);
  const w = Math.min(ctx.measureText(n.text).width + 34, W - 40);
  return { x0: W / 2 - w / 2, x1: W / 2 + w / 2, y0: y, y1: y + h, fs, h };
}
const vdUnder = (x0, y0, x1, y1) => G.players.some(p => p.alive && p.x + p.w > x0 - 4 && p.x < x1 + 4 && p.y + p.h > y0 - 4 && p.y - 8 < y1 + 4);

/* --- drawing: the ending scene (the core owns the screen) --- */
function vdDrawEndScene(st) {
  const c = st.cut, t = G.clock, gy = VD.endGround;
  vdDrawBackdrop(t, { x: W / 2, y: 200 });
  for (const f of c.fw) {
    if (!f.boom) { ctx.fillStyle = '#fff1cf'; circle(f.x, f.y, 3.5); ctx.fill(); ctx.fillStyle = 'rgba(255,200,120,0.5)'; circle(f.x - f.vx * 0.03, f.y - f.vy * 0.03, 2.5); ctx.fill(); continue; }
    const u = f.bt / 1.3, r = 18 + u * 60;
    ctx.globalAlpha = clamp(1 - u, 0, 1);
    for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; ctx.fillStyle = k % 2 ? f.col : '#ffffff'; circle(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r + u * u * 30, 4 - u * 2); ctx.fill(); }
    ctx.fillStyle = f.col; circle(f.x, f.y, 10 * (1 - u)); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // the ground at the foot of the volcano: dark basalt with a glowing seam and a few flowers
  ctx.fillStyle = '#2f2833'; ctx.fillRect(0, gy, W, H - gy);
  ctx.fillStyle = '#ff8a3d'; ctx.fillRect(0, gy, W, 5);
  ctx.fillStyle = '#c4501f'; ctx.fillRect(0, gy + 5, W, 3);
  for (let k = 0; k < 9; k++) { const x = 60 + k * 107; ctx.fillStyle = ['#ff8fc7', '#ffd23f', '#7fd6ff'][k % 3]; circle(x, gy - 4, 4); ctx.fill(); ctx.fillStyle = '#7fd36b'; ctx.fillRect(x - 1, gy - 2, 2, 4); }
  vdDrawCinder(st.cinder);
}

/* --- drawing: the HUD --- */
// the phase strip, top centre: "Dragon Peak" and 4 phase slots (done ones ticked, the current one lit, with pips)
function vdStripBox() {
  const big = hudBig(), sw = big ? 40 : 30, gap = big ? 8 : 6, w = 4 * sw + 3 * gap + 28, h = big ? 70 : 56;
  return { x0: W / 2 - w / 2, y0: 6, w, h, sw, gap, big, labY: 6 + (big ? 13 : 11), slotY: 6 + (big ? 24 : 20) };
}
function vdSlotPos(i) { const B = vdStripBox(); return { x: B.x0 + 14 + i * (B.sw + B.gap) + B.sw / 2, y: B.slotY + B.sw / 2, r: B.sw / 2 }; }
function vdIcon(phase, x, y, r) {
  ctx.save(); ctx.translate(x, y); ctx.scale(r / 10, r / 10); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4;
  switch (phase) {
    case 'climb':   // the volcano with a flag on top
      ctx.fillStyle = '#6b4a5a'; ctx.beginPath(); ctx.moveTo(-10, 8); ctx.lineTo(-3, -5); ctx.lineTo(3, -5); ctx.lineTo(10, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.moveTo(-3, -5); ctx.lineTo(3, -5); ctx.lineTo(1, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(1, -5); ctx.lineTo(1, -11); ctx.stroke(); ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(1, -11); ctx.lineTo(7, -9); ctx.lineTo(1, -7); ctx.fill(); break;
    case 'levers':  // a pillar in lava and a lever
      ctx.fillStyle = '#ff7a1f'; ctx.fillRect(-10, 4, 20, 5);
      ctx.fillStyle = '#7a6f80'; ctx.fillRect(-4, -6, 8, 11); ctx.strokeRect(-4, -6, 8, 11);
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(7, 4); ctx.lineTo(9, -6); ctx.stroke(); ctx.fillStyle = '#ff5f6d'; circle(9, -7, 2); ctx.fill(); break;
    case 'golf':    // the gong
      ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, 9); ctx.lineTo(-9, -8); ctx.lineTo(9, -8); ctx.lineTo(9, 9); ctx.stroke();
      ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; circle(0, 0, 6); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff1a8'; circle(-2, -2, 2); ctx.fill(); break;
    case 'surf':    // a wave of lava and a slab
      ctx.fillStyle = '#ff7a1f'; ctx.beginPath(); ctx.moveTo(-10, 8); ctx.quadraticCurveTo(-6, -4, 2, -2); ctx.quadraticCurveTo(-2, 2, 4, 4); ctx.lineTo(10, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4d4453'; ctx.save(); ctx.rotate(-0.3); ctx.fillRect(-6, -5, 12, 3); ctx.restore(); break;
  }
  ctx.restore();
}
function vdDrawStrip(st) {
  const B = vdStripBox(), cur = st.phaseNo, end = st.cut && st.cut.kind === 'end';
  ctx.save(); if (vdUnder(B.x0, B.y0, B.x0 + B.w, B.y0 + B.h)) ctx.globalAlpha = 0.45;
  ctx.fillStyle = 'rgba(40,18,32,0.84)'; rr(B.x0, B.y0, B.w, B.h, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(255,138,61,0.75)'; ctx.lineWidth = 2; rr(B.x0, B.y0, B.w, B.h, 14); ctx.stroke();
  text('Dragon Peak', W / 2, B.labY, B.big ? 16 : 11, '#ffb36b', 'center', 'body');
  const prog = end ? null : vdCall(vdPh(st), 'progress', st);
  for (let i = 0; i < 4; i++) {
    const sp = vdSlotPos(i), x = sp.x - B.sw / 2, y = sp.y - B.sw / 2, done = end || i < cur, now = !end && i === cur;
    ctx.fillStyle = now ? 'rgba(255,170,90,0.28)' : done ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)'; rr(x, y, B.sw, B.sw, 8); ctx.fill();
    if (now) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x, y, B.sw, B.sw, 8); ctx.stroke(); }
    ctx.save(); if (!done && !now) ctx.globalAlpha *= 0.35;
    vdIcon(VD_ORDER[i], sp.x, sp.y - (now && prog ? 2 : 0), B.sw * 0.36);
    ctx.restore();
    if (done) { ctx.strokeStyle = '#9fe07f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + B.sw - 12, y + 7); ctx.lineTo(x + B.sw - 8, y + 11); ctx.lineTo(x + B.sw - 2, y + 2); ctx.stroke(); }
    if (now && prog && prog.of > 0) {
      const n = Math.min(prog.of, 8), r = B.big ? 2.6 : 2, gap = r * 2.8, x0 = sp.x - (n - 1) * gap / 2, py = y + B.sw - r - 1;
      for (let k = 0; k < n; k++) { ctx.fillStyle = k < prog.n ? C.gold : 'rgba(255,255,255,0.3)'; circle(x0 + k * gap, py, r); ctx.fill(); }
    }
  }
  ctx.restore();
}
// what draws over (or under) each player's head: role badges, then hint bubbles (from 10-1)
function vdDrawHeads(st, rightBox, newsBox) {
  if (G.introT > 0) return;
  const big = hudBig(), B = vdStripBox();
  const clearTop = (x0, x1) => {
    let y = 4;
    if (x0 < 290) y = 80;
    if (x1 > B.x0 - 4 && x0 < B.x0 + B.w + 4) y = Math.max(y, B.y0 + B.h + 6);
    if (newsBox && x1 > newsBox.x0 - 4 && x0 < newsBox.x1 + 4) y = Math.max(y, newsBox.y1 + 6);
    if (rightBox && x1 > rightBox[0] - 4) y = Math.max(y, rightBox[1] + 6);
    return y;
  };
  const placed = [], sb = vdSayBox(st);
  if (sb) placed.push([sb.bx - sb.tw / 2, sb.by - sb.th / 2, sb.tw, sb.th]);
  if (st.swapT > 0) { const fs = big ? 46 : 36; ctx.font = vdLilita(fs); const w = ctx.measureText('Swap jobs!').width * 1.1; placed.push([W / 2 - w / 2, 150 - fs * 0.65, w, fs * 1.3]); }
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
  const heads = G.players.filter(p => p.alive).map(p => ({ p, px: p.x + p.w / 2, top: p.y - 8 - vdHeadLift(st, p) - (vdShieldUp(st, p.id) ? VD.shield.lift + VD.shield.ry : 0), below: p.y + p.h + 10 }));
  const roles = st.badgeT > 0 && !st.cut ? vdCall(vdPh(st), 'roles', st) : null;
  if (roles) for (const k of heads) {
    const word = roles[k.p.id];
    if (!word) continue;
    const fs = big ? 20 : 12, bh = fs + (big ? 10 : 8), a = clamp(st.badgeT / 0.4, 0, 1);
    ctx.font = vdFont(fs);
    const bw = ctx.measureText(word).width + 16, bx = clamp(k.px, bw / 2 + 4, W - bw / 2 - 4), was = [k.top, k.below];
    const pl = place(bx - bw / 2, bw, bh, k), y0 = pl.y;
    if (pl.under && st.hints[k.p.id]) { placed.pop(); [k.top, k.below] = was; continue; }
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = PCOL[k.p.id]; rr(bx - bw / 2, y0, bw, bh, bh / 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    text(word, bx, y0 + bh / 2 + 0.5, fs, '#ffffff', 'center', 'body');
    ctx.restore();
  }
  for (const k of heads) {
    const h = st.hints[k.p.id];
    if (!h) continue;
    const a = clamp(Math.min(h.t, h.life - h.t) / 0.2, 0, 1), fs = big ? 23 : 12;
    ctx.font = vdFont(fs);
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
function vdHud(st) {
  const ph = vdPh(st), big = hudBig(), end = st.cut && st.cut.kind === 'end';
  vdDrawStrip(st);
  const fs = big ? 20 : 14, h = big ? 40 : 28, extra = end ? '' : vdCall(ph, 'hudText', st);
  const s = fmtTime(G.time) + (extra ? '   ' + extra : '');
  ctx.font = vdFont(fs);
  const rw = ctx.measureText(s).width + 28, rx = pill(W - 14, 12, rw, h, 'right');
  text(s, W - 28, 12 + h / 2 + 0.5, fs, C.paper, 'right', 'body');
  const rightBox = [rx, 12 + h];
  const n = st.news, newsBox = vdNewsBox(st);
  if (newsBox) {
    const { x0, x1, y0, h: nh, fs: nfs } = newsBox, w = x1 - x0;
    ctx.save(); ctx.globalAlpha = clamp(Math.min(n.t / 0.15, (n.life - n.t) / 0.3), 0, 1) * (vdUnder(x0, y0, x1, newsBox.y1) ? 0.35 : 1);
    ctx.fillStyle = 'rgba(40,18,32,0.86)'; rr(x0, y0, w, nh, nh / 2); ctx.fill();
    if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x0, y0, w, nh, nh / 2); ctx.stroke(); }
    text(n.text, W / 2, y0 + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
    ctx.restore();
  }
  if (!end) vdCall(ph, 'hud', st);
  // a player up under the level / room pills or the time pill: draw them again, a little see-through, on top
  for (const p of G.players) {
    if (!p.alive || p.y - 8 > 80) continue;
    if (p.x < 294 || p.x + p.w > rightBox[0] - 4 && p.y - 8 < rightBox[1] + 4) { ctx.save(); ctx.globalAlpha = 0.75; drawPlayer(p); ctx.restore(); }
  }
  vdDrawHeads(st, rightBox, newsBox);
  if (st.swapT > 0 && G.introT <= 0) {
    const k = 1 - st.swapT / VD.swapT, a = clamp(st.swapT / 0.4, 0, 1);
    ctx.save(); ctx.globalAlpha = a; bigText('Swap jobs!', W / 2, 150, big ? 46 : 36, C.gold, 0.8 + 0.25 * Math.min(1, k * 6)); ctx.restore();
  }
  if (st.idle && !st.cut) { ctx.save(); ctx.globalAlpha = 0.85; bigText('Cinder is waiting...', W / 2, H - 40, big ? 26 : 18, '#ffd27a', 1); ctx.restore(); }
}

/* --- sounds --- */
Sfx.extra.vdTalk = function () { for (let k = 0; k < 3; k++) this.tone(200 + Math.random() * 160, 0.06, 'sawtooth', 0.018, null, k * 0.07); };
Sfx.extra.vdGold = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.vdSwap = function () { [523, 784, 659, 988].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.045, null, i * 0.07)); };
Sfx.extra.vdBonk = function (p) { this.tone(420 * p, 0.06, 'square', 0.05, 220 * p); this.tone(1400, 0.1, 'triangle', 0.03, 1800, 0.05); };
Sfx.extra.vdToasty = function (p) { this.tone(700 * p, 0.12, 'sawtooth', 0.03, 300 * p); this.tone(1200, 0.18, 'triangle', 0.03, 1600, 0.06); };
Sfx.extra.vdClang = function (p) { this.tone(1300 * p, 0.12, 'square', 0.03, 1100 * p); this.tone(2100, 0.16, 'triangle', 0.025, 1900, 0.01); };
Sfx.extra.vdInhale = function () { this.tone(180, 0.8, 'sawtooth', 0.016, 520); };
Sfx.extra.vdWhoosh = function () { this.tone(320, 0.7, 'sawtooth', 0.03, 110); this.tone(90, 0.6, 'triangle', 0.04, 60, 0.05); };
Sfx.extra.vdHic = function () { this.tone(620, 0.05, 'square', 0.03, 900); this.tone(140, 0.12, 'triangle', 0.03, 90, 0.04); };
Sfx.extra.vdFlap = function () { for (let k = 0; k < 4; k++) this.tone(150, 0.07, 'triangle', 0.04, 90, k * 0.13); };
Sfx.extra.vdPhase = function () { [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, null, i * 0.09)); };
Sfx.extra.vdHug = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'sine', 0.05, null, i * 0.1)); };
Sfx.extra.vdCheer = function () { [659, 784, 988, 1319, 1568].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.05, null, i * 0.08)); };
Sfx.extra.vdPop = function () { this.tone(200 + Math.random() * 200, 0.18, 'sine', 0.035, 900); };
Sfx.extra.vdSplash = function () { this.tone(260, 0.4, 'sawtooth', 0.03, 80); this.tone(900, 0.2, 'sine', 0.03, 300, 0.05); };
Sfx.extra.vdGong = function () { this.tone(196, 1.4, 'sine', 0.08, 180); this.tone(392, 1.1, 'triangle', 0.035, 380, 0.01); this.tone(587, 0.8, 'sine', 0.02, 560, 0.02); };
Sfx.extra.vdDing = function () { this.tone(1046, 0.08, 'square', 0.04); this.tone(1568, 0.18, 'triangle', 0.05, null, 0.06); };

/* ===== STUB PHASES =====
   Tiny, trivially winnable stand-ins so the level runs end to end before (or without) the real phase files. Each needs
   both players (an idle partner never clears). The real files replace them: VD_PHASES.<phase> = { ... }. */
const VD_STUBS = {};
// climb: walk right together to the flag; Cinder flies overhead and breathes fire now and then (the shielder holds the
// action to raise the shield over both of you)
VD_STUBS.climb = {
  stub: true,
  setup(st, L) {
    const c = st.cinder, ph = st.ph;
    ph.sh = L.def.first || 0; ph.goal = 27 * T; ph.inT = 0; ph.fireT = 3.5;
    Object.assign(c, { x: 560, y: 190, s: 0.75, air: true, pose: 'fly', gy: 450, face: -1 });
  },
  step(st, dt) {
    const ph = st.ph, c = st.cinder, ps = G.players;
    vdShield(st, ph.sh, ps[ph.sh].input.act);
    vdPlatform(st, dt);
    const fx = Math.max(ps[0].x, ps[1].x) + 11;
    c.x += (clamp(fx + 60, 200, 860) - c.x) * Math.min(1, dt * 0.8); c.y = 190 + Math.sin(st.phT * 1.3) * 18;
    if (!vdCalm(st) && !st.fires.length && (ph.fireT -= dt) <= 0) {
      ph.fireT = 4.5;
      const lead = ps[0].x > ps[1].x ? 0 : 1;
      vdFire(st, { x: ps[lead].x + 11, target: lead, gy: vdGroundY(ps[lead].x + 11, ps[lead].y + 10) });
    }
    const inGoal = ps.every(p => p.alive && p.x + p.w / 2 > ph.goal);
    ph.inT = inGoal ? ph.inT + dt : 0;
    if (ph.inT > 0.5) vdPhaseDone(st, { say: 'Hmph! You climbed my mountain...' });
  },
  draw(st) {
    const x = st.ph.goal, y = vdGroundY(x + 20, 300);
    ctx.fillStyle = 'rgba(255,197,61,0.18)'; ctx.fillRect(x, y - 90, W - x, 90);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 20, y); ctx.lineTo(x + 20, y - 60); ctx.stroke();
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(x + 20, y - 60); ctx.lineTo(x + 44, y - 52); ctx.lineTo(x + 20, y - 44); ctx.fill();
  },
  labels(st) { const s = st.ph.sh; return s === 0 ? ['shield', 'ladder'] : ['ladder', 'shield']; },
  roles(st) { const s = st.ph.sh; return s === 0 ? ['Shield!', 'Climb!'] : ['Climb!', 'Shield!']; },
  hudText: () => 'Stub',
  progress(st) { return { n: G.players.filter(p => p.x + p.w / 2 > st.ph.goal).length, of: 2 }; },
};
// levers: Cinder perches on his pillar; both hold the action together for 1 s to dunk him once
VD_STUBS.levers = {
  stub: true,
  setup(st) { const c = st.cinder; Object.assign(c, { pose: 'perch', s: 0.8, face: -1 }); st.ph.hold = 0; st.ph.dunkT = 0; st.ph.y0 = c.y; },
  step(st, dt) {
    const ph = st.ph, c = st.cinder;
    vdPlatform(st, dt);
    if (ph.dunkT > 0) {
      ph.dunkT += dt; c.pose = 'splash'; c.lava = ph.y0 + 60; c.y = ph.y0 + 110;
      if (ph.dunkT > 1.6) { c.lava = null; c.y = ph.y0; c.pose = 'perch'; vdPhaseDone(st, { say: 'Blub! My hot tub! Okay, okay...' }); }
      return;
    }
    const both = G.players.every(p => p.alive && p.input.act);
    ph.hold = both ? ph.hold + dt : 0;
    if (ph.hold >= 1) { ph.dunkT = 0.001; vdStats(st).dunks = 1; Sfx.play('vdSplash'); vdCelebrate(st, 1.2); }
  },
  drawBack(st) {
    const x = st.cinder.x, y0 = st.ph.y0, gy = vdGroundY(x, y0 + 4);
    ctx.fillStyle = '#4d4453'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(x - 34, y0, 68, gy - y0); ctx.strokeRect(x - 34, y0, 68, gy - y0);
    vdDrawLava(x - 120, x + 120, gy - 10, G.clock, { depth: 12 });
  },
  roles: () => ['Pull!', 'Pull!'],
  labels: () => ['pull', 'pull'],
  hudText: st => 'Dunks ' + (st.ph.dunkT > 0 ? 1 : 0) + '/1',
  progress: st => ({ n: st.ph.dunkT > 0 ? 1 : 0, of: 1 }),
};
// golf: both walk to the gong; then the action rings it ("BONNNG!")
VD_STUBS.golf = {
  stub: true,
  setup(st) { const c = st.cinder; Object.assign(c, { pose: 'tub', mood: 'grumpy', s: 0.8, face: -1 }); c.lava = c.y - 30; st.ph.gx = 29 * T; st.ph.rang = 0; },
  step(st, dt) {
    const ph = st.ph, c = st.cinder;
    vdPlatform(st, dt);
    if (ph.rang > 0) { ph.rang += dt; c.pose = 'dizzy'; if (ph.rang > 1.4) vdPhaseDone(st, { say: 'Ooh... my ears are ringing...' }); return; }
    const near = p => p.alive && Math.abs(p.x + p.w / 2 - ph.gx) < 90;
    if (G.players.every(near) && G.players.some(p => p.pendingAct)) {
      ph.rang = 0.001; Sfx.play('vdGong'); vdPop(st, ph.gx, 300, 'BONNNG!', C.gold, 34); vdCelebrate(st, 1);
      Object.assign(vdStats(st), { strokes: [1, 1], pars: [3, 3] });
    }
    for (const p of G.players) p.pendingAct = false;
  },
  drawBack(st) { const c = st.cinder; vdDrawLava(c.x - 90, c.x + 90, c.lava, G.clock, { depth: 30 }); },
  draw(st) {
    const x = st.ph.gx, y = vdGroundY(x, 300), sw = st.ph.rang > 0 ? Math.sin(st.ph.rang * 30) * 4 : 0;
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - 40, y); ctx.lineTo(x - 40, y - 110); ctx.lineTo(x + 40, y - 110); ctx.lineTo(x + 40, y); ctx.stroke();
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; circle(x + sw, y - 66, 30); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff1a8'; circle(x - 8 + sw, y - 74, 8); ctx.fill();
  },
  roles: () => ['Ring it!', 'Ring it!'],
  stat(st) { const g = st.stats.golf; return g && g.strokes ? { label: 'Golf strokes', value: (g.strokes[0] + g.strokes[1]) + ' (par ' + (g.pars[0] + g.pars[1]) + ')' } : null; },
  progress: st => ({ n: st.ph.rang > 0 ? 1 : 0, of: 1 }),
};
// surf: one race to the right edge; first one there is the Surf champ (the race waits while nobody plays)
VD_STUBS.surf = {
  stub: true,
  setup(st) { const c = st.cinder; Object.assign(c, { pose: 'surf', mood: 'happy', baseMood: 'happy', s: 0.7, face: 1, x: 120, y: 330, air: true, gy: 450 }); st.ph.fin = 29 * T; st.ph.won = -1; st.ph.t = 0; },
  step(st, dt) {
    const ph = st.ph, c = st.cinder;
    if (st.idle) { vdCoast(dt); return; }
    vdPlatform(st, dt);
    c.x = Math.min(ph.fin, c.x + 60 * dt);
    if (ph.won < 0) {
      const done = G.players.filter(p => p.alive && p.x + p.w / 2 >= ph.fin);
      if (done.length) {
        ph.won = done.length === 2 ? (done[0].x >= done[1].x ? done[0].id : done[1].id) : done[0].id;
        const s = vdStats(st); s.wins = [ph.won === 0 ? 1 : 0, ph.won === 1 ? 1 : 0]; s.champ = ph.won;
        vdNews(st, NAMES[ph.won] + ' wins the race!', false, 2.5); vdCelebrate(st, 1.2); Sfx.play('vdCheer');
      }
    } else if ((ph.t += dt) > 1.4) vdPhaseDone(st, { say: NAMES[ph.won] + ' is the Surf champ! Woohoo!' });
  },
  draw(st) { const x = st.ph.fin, y = vdGroundY(x, 300); for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#ffffff' : C.ink; ctx.fillRect(x - 4, y - 90 + k * 15, 8, 15); } },
  roles: () => ['Race!', 'Race!'],
  statLine(st) { const s = st.stats.surf; return s && s.champ != null && s.champ >= 0 ? 'Surf champ: ' + NAMES[s.champ] : ''; },
};
Object.assign(VD_PHASES, VD_STUBS);

/* ===== VD TEST HOOK (bots: window.__pipbo.MODES.dragon.test) ===== */
MODES.dragon.test = {
  VD, VD_PHASES, VD_STUBS,
  index: vdLevelIndex,
  seed(n) { MODES.dragon.rand = n == null ? Math.random : vdSeeded(n); },
  // start the level at phase k (0-3) with fresh state; o: { seed, intro (true keeps the room card up) }. Returns G.mst.
  jump(k = 0, o = {}) {
    const i = vdLevelIndex();
    if (o.seed != null) this.seed(o.seed);
    loadLevel(i);
    if (k > 0) { G.room = k - 1; nextRoom(); }
    if (!o.intro) G.introT = 0;
    return G.mst;
  },
  stub: ph => !!(VD_PHASES[ph] && VD_PHASES[ph].stub),
  st: () => G.mst, ph: () => G.mst.ph, phase: () => G.mst.phase, calm: () => vdCalm(G.mst), pts: () => vdCinderPts(G.mst.cinder),
  done: o => vdPhaseDone(G.mst, o), ending: () => vdEnding(G.mst),
  bonk: (id, o) => vdBonk(G.mst, G.players[id], o), fire: o => vdFire(G.mst, o), shield: (id, on) => vdShield(G.mst, id, on),
};
