/* Pip & Bo - Level 10-1 The Grand Collector (team boss, World 10 Collector's Vault). */
'use strict';

/* ===== The Grand Collector (10-1, mode 'collector', team) =====
   A big, goofy robot took a piece of every world and keeps them in his glass belly-jar. The level is one boss fight in
   four phases (one room each). Each phase borrows an earlier world's look and tricks, and every hit wins a piece back.
   He is never hurt: hits make him wobble and pop his monocle. At the end he naps, wakes up friendly, waves, and every
   piece flies home.

   The file has five marked sections. GC CORE owns MODES.collector and everything shared (the boss drawing and poses,
   speech bubbles, the 9-piece HUD strip, piece-fly, junk tosses, the grabby claw, bonks, role badges, per-role act
   labels, news and hint bubbles, gold help, the idle wait, phase changes, the ending, stats). Each GC PHASE section
   registers GC_PHASES.<phase> (the room def's `phase`) and uses the core's helpers. Every name starts with gc / GC.

   PHASE CONTRACT. Every hook gets st = G.mst. Only setup is required.
     setup(st, L)      the phase starts (room start, restart, test jump). st.ph is a fresh {} for the phase's own state.
                       Read your map chars from L.def.map and turn them into '.' in L.grid. Place the boss
                       (st.boss.x / y / s / face / pose; the core already put his feet on the room's 'Z').
     step(st, dt)      every live tick: not while the room card holds (G.introT > GC.introHold), not in a cutscene.
                       In an ownStep room the phase moves the players itself; otherwise the framework already did.
     pre(st, dt)       non-ownStep rooms: every live tick before the players move.
     wait(st, dt)      instead of step while the room card holds.
     drawBack(st)      behind the boss.   draw(st)  in front of the boss, behind the players.   drawTop(st)  over them.
     hud(st)           extra HUD.   hudText(st) -> a short text for the top-right pill (e.g. 'Shots 4').
     labels(st)        -> [pip word, bo word]: the action button's word per player (lowercase, 6 letters or fewer).
     legend(st)        -> a setLegend object for the top bar when the keys change with the job (read with labels).
     roles(st)         -> [pip badge, bo badge] ('Load!', 'Fire!') or null: shown over heads when the phase starts and
                       on gcSwap(st).
     busy(st, p)       -> true while p is mid-teamwork (at the cannon, on a valve...): shared attacks never target or bonk p.
     headLift(st, p)   -> px of things the phase draws over p's head, so badges and hints sit above them.
     onBonk(st, p)  onKill(st, p)  onRespawn(st, p)
     stat(st)          -> one results tile { label, value } or null.  statLine(st) -> a short results line or ''.
                       (These run at the end: read st.stats.<phase>, not st.ph, which then holds the last phase.
                       The card keeps to 4 tiles and 1 line: only cannons gives a tile, only finale a line.)
   A phase calls gcWinPiece(st, worldNo) for each hit and gcPhaseDone(st) when it is over. In the last room
   gcPhaseDone plays the ending (gcEnding) and then levelClear().
   The core reads one map char: 'Z' (the boss's feet). Test hook: MODES.collector.test. */

/* ===== GC CORE ===== */
const GC = {
  introHold: 0.6,            // phase.step waits while G.introT is above this (the room card)
  idleAfter: 10,             // s with no input from anyone: he waits and taps his foot (no attacks)
  celebT: 1.8,               // s of calm after a won piece (no attacks)
  flyT: 1.05,                // s a won piece takes to fly to its slot
  leaveT: 2.6,               // the between-phase cutscene (after the last piece lands)
  badgeT: 5, swapT: 2.2, hintLife: 3, newsLife: 3.2, sayLife: 2.2,
  bonk: { vx: 230, vy: 300, stun: 0.75, slide: 0.3, safe: 1.4 },     // knock() speeds, dizzy time, no second bonk for safe s
  toss: { flight: 1.15, min: 0.9, g: 900, hitW: 22, hitH: 36, lead: 0.2, warn: 0.6 }, // junk: flight s (shadow shows all of it)
  claw: { warn: 0.85, reach: 0.32, grab: 0.28, back: 0.55, w: 26, h: 40 },           // warn = the telegraph before it zips out
  medal: { gold: { t: 330, bonks: 5 }, silver: { t: 540, bonks: 14 } },              // s and bonks (bots: perfect 3:00, good 4:05-4:40)
  boss: { s: 0.9 },          // default scale: about 7 tiles wide with his arms, 9 tiles to the top of his hat
};
// the nine stolen pieces, one per world (index = world number - 1)
const GC_PIECES = [
  { name: 'Sunny Meadow', icon: 'sunflower', col: '#ffd23f' },
  { name: 'Block Party', icon: 'block', col: '#ff8f5a' },
  { name: 'Fairway Fun', icon: 'golf flag', col: '#7fd36b' },
  { name: 'Rumble Park', icon: 'boxing glove', col: '#ff5f6d' },
  { name: 'Road Trip', icon: 'car', col: '#4fc3d9' },
  { name: 'Backyard Bash', icon: 'cupcake', col: '#ff8fc7' },
  { name: 'Castle Quest', icon: 'crown', col: '#ffc53d' },
  { name: 'Lucky Casino', icon: 'cherry', col: '#e8475f' },
  { name: 'Great Escapes', icon: 'volcano', col: '#ff9a3d' },
];
const GC_OUCH = ['Ow, my hat!', 'Hey, give that back!', 'My lovely collection!', 'Not my shiny things!'];
const GC_PHASES = {};
const GC_NONE = { setup() {} };
const gcRand = () => MODES.collector.rand();
const gcPh = st => (st && GC_PHASES[st.phase]) || GC_NONE;
function gcCall(ph, name, ...args) { const f = ph && ph[name]; return typeof f === 'function' ? f.apply(ph, args) : undefined; }
const gcBusy = (st, p) => !!gcCall(gcPh(st), 'busy', st, p);
// a calm moment: he waits (no attacks) during the room card, a cutscene, a won-piece celebration, or when nobody plays
const gcCalm = st => G.mode !== 'play' || G.introT > 0 || !!st.cut || st.celebT > 0 || !!st.idle;
const gcPiecesWon = st => st.won.filter(Boolean).length;
const gcFont = px => '700 ' + px + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
function gcSeeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* --- talk, news, hints, badges --- */
function gcSay(st, text, life = GC.sayLife) { st.say = { text, t: 0, life }; Sfx.play('gcTalk'); }
function gcNews(st, text, gold = false, life = GC.newsLife) { st.news = { text, gold, t: 0, life }; }
// gold catch-up help: always announced (gold banner and sound) and listed in st.stats.help
function gcHelp(st, text, life = 4) { gcNews(st, text, true, life); Sfx.play('gcGold'); st.stats.help.push(text); }
function gcHint(st, id, text, life = GC.hintLife, gold = false) { text = gcCpuHint(id, text); if (text) st.hints[id] = { text, t: 0, life, gold }; }
// 1-player mode: no key tips or nudges over the computer's head (it says its own lines); its job line says it is the
// computer and what it does instead of which keys to press
function gcCpuHint(id, text) {
  if (!(typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id))) return text;
  if (/^(Hot foot|Whoops|You can play|Yes, play)/.test(text)) return text;
  if (!text.startsWith(NAMES[id] + ':')) return null;
  const job = /aim/.test(text) ? 'aims and fires' : /powder/.test(text) ? 'brings powder and balls' : /stop/.test(text) ? 'stops the reels'
    : /hop up/.test(text) ? 'hops up to his hat' : /spike|gold/.test(text) ? 'spikes gold balls' : /set|bump/.test(text) ? 'sets the ball' : '';
  return job ? NAMES[id] + ' (computer) ' + job : null;
}
function gcPop(st, x, y, text, col = C.paper, size = 22) { st.pops.push({ x, y, text, col, size, t: 0 }); }
function gcShowBadges(st, t = GC.badgeT) { st.badgeT = t; }
// the roles swap: a big "Swap jobs!", the badges again, the new action words
function gcSwap(st) { st.swapT = GC.swapT; st.badgeT = GC.badgeT; Sfx.play('gcSwap'); gcActLabels(st); }

/* --- the boss --- */
function gcNewBoss() {
  return { x: 795, y: 450, s: GC.boss.s, face: -1, pose: 'stand', t: 0, hitT: 0, throwT: 0, mood: 'smug', moodT: 0,
    mono: null, look: null, gy: null, hidden: false, alpha: 1, armHidden: false, blink: 0, blinkT: 2.5 };
}
// how far (in his own units, before scale) the body sits lower than standing: sitting, hovering, stomping
function gcBossOff(b) {
  switch (b.pose) {
    case 'sit': case 'nap': return 40;
    case 'hover': return Math.sin(b.t * 3.2) * 6;
    case 'stomp': case 'walk': return -Math.abs(Math.sin(b.t * 7)) * 6;
    default: return Math.sin(b.t * 2.2) * 1.5;
  }
}
// Where his parts are on screen this tick (phases use these for hits and for placing props):
// jar {x, y, r} (the glass belly), head {x, y, r}, hat, mouth, shoulder (the grabby arm's root), hand (its resting
// hand), top (over the hat), body {x0, x1, y0, y1} (the torso box), band {y0, y1} (the belly's height on the torso).
function gcBossPts(b) {
  const s = b.s, f = b.face, o = gcBossOff(b);
  const P = (lx, ly) => ({ x: b.x + lx * s * f, y: b.y + (ly + o) * s });
  const jar = P(0, -112), head = P(0, -228);
  jar.r = 54 * s; head.r = 58 * s;
  return { jar, head, hat: P(-6, -290), mouth: P(10, -207), shoulder: P(76, -160), hand: P(104, -84), top: P(0, -320),
    eye: P(26, -234), body: { x0: b.x - 82 * s, x1: b.x + 82 * s, y0: b.y + (o - 190) * s, y1: b.y + (o - 40) * s },
    band: { y0: jar.y - jar.r, y1: jar.y + jar.r } };
}
// a hit: he wobbles, his monocle pops off, he grumbles (a phase can pass its own line)
function gcBossHit(st, line) {
  const b = st.boss;
  b.hitT = 0.9; b.mood = 'grumpy'; b.moodT = 2.4;
  if (!b.mono) { const e = gcBossPts(b).eye; b.mono = { x: e.x, y: e.y, vx: -b.face * 90 + (gcRand() - 0.5) * 60, vy: -300, rot: 0, t: 0 }; }
  gcSay(st, line || GC_OUCH[(st.ouchN++) % GC_OUCH.length], 1.8);
  Sfx.play('gcBoing');
}
function gcBossTick(st, dt) {
  const b = st.boss;
  b.t += dt;
  if (b.hitT > 0) b.hitT = Math.max(0, b.hitT - dt);
  if (b.throwT > 0) b.throwT = Math.max(0, b.throwT - dt);
  if (b.moodT > 0) { b.moodT -= dt; if (b.moodT <= 0 && b.mood === 'grumpy') b.mood = 'smug'; }
  b.blinkT -= dt; if (b.blink > 0) b.blink -= dt;
  if (b.blinkT <= 0) { b.blink = 0.14; b.blinkT = 2 + gcRand() * 3; }
  if (b.mono) {
    const m = b.mono;
    m.t += dt; m.vy += 900 * dt; m.x += m.vx * dt; m.y += m.vy * dt; m.rot += dt * 9;
    if (m.t > 1.1) { b.mono = null; const e = gcBossPts(b).eye; burst(e.x, e.y, C.gold, 6); }   // and it pops back on
  }
}

/* --- the nine pieces: winning one, the fly to the HUD, the ending's fly home --- */
// Win back world worldNo's piece (1-9): it pops out of his belly and flies to its slot, he wobbles, and a short calm
// follows. opts.say: his line instead of an "Ow!"; opts.quiet: no wobble or line. False if that piece was already won.
function gcWinPiece(st, worldNo, opts = {}) {
  const i = worldNo - 1;
  if (!(i >= 0 && i < 9) || st.won[i]) return false;
  st.won[i] = true; st.stats.pieceAt[worldNo] = Math.round(G.time * 10) / 10;
  const jar = gcBossPts(st.boss).jar;
  st.fly.push({ n: worldNo, t: 0, x0: jar.x, y0: jar.y });
  st.celebT = Math.max(st.celebT, GC.celebT);
  gcCancelAttacks(st);
  if (!opts.quiet) gcBossHit(st, opts.say);
  Sfx.play('gcPiece');
  rumble(0, 0.4, 0.6, 200); rumble(1, 0.4, 0.6, 200);
  burst(jar.x, jar.y, C.gold, 18); burst(jar.x, jar.y, GC_PIECES[i].col, 10);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.18);
  return true;
}
function gcFlyTick(st, dt) {
  for (const f of st.fly) {
    f.t += dt;
    if (f.t >= GC.flyT && !f.done) {
      f.done = true; const i = f.n - 1, sp = gcSlotPos(i);
      st.slotIn[i] = true; st.slotPop[i] = 1;
      Sfx.play('gcSlot'); burst(sp.x, sp.y, GC_PIECES[i].col, 12);
    } else if (!f.done && (G.tickN % 4) === 0) {
      const q = gcFlyPos(st, f);
      G.particles.push({ x: q.x, y: q.y, vx: (gcRand() - 0.5) * 40, vy: (gcRand() - 0.5) * 40, life: 0.4, max: 0.4, col: gcRand() < 0.5 ? C.gold : '#ffffff', size: 3, grav: 0, kind: 'dot' });
    }
  }
  if (st.fly.length && st.fly.every(f => f.done)) st.fly = [];
  for (let i = 0; i < 9; i++) if (st.slotPop[i] > 0) st.slotPop[i] = Math.max(0, st.slotPop[i] - dt * 2.5);
}
function gcFlyPos(st, f) {
  const k = clamp(f.t / GC.flyT, 0, 1), e = k * k * (3 - 2 * k), sp = gcSlotPos(f.n - 1);
  const cx = (f.x0 + sp.x) / 2, cy = Math.min(f.y0, sp.y) - 140, u = 1 - e;
  return { x: u * u * f.x0 + 2 * u * e * cx + e * e * sp.x, y: u * u * f.y0 + 2 * u * e * cy + e * e * sp.y, k };
}

/* --- phase changes and the ending --- */
// The phase is over: once the last piece has landed he says "Follow me!", flies off, and the next room starts
// (its room card shows the next phase's title and tip). In the last room this is gcEnding(st). Players can't be
// hurt meanwhile. False if a cutscene is already running.
function gcPhaseDone(st) {
  if (st.cut) return false;
  const def = G.level.def;
  if (def.roomIndex >= def.roomCount - 1) return gcEnding(st);
  st.cut = { kind: 'leave', t: 0, wait: true, said: false };
  gcCancelAttacks(st); st.stats.phaseT[st.phaseNo] = Math.round(st.phT * 10) / 10;
  return true;
}
// The ending (call it after the last piece): a nap, a friendly wake-up, "You can play with us!", a wave, every piece
// flies home, confetti, then levelClear(). About 6.5 s after the last piece lands.
function gcEnding(st) {
  if (st.cut && st.cut.kind === 'end') return false;
  st.cut = { kind: 'end', t: 0, wait: true, step: 0 };
  gcCancelAttacks(st); st.stats.phaseT[st.phaseNo] = Math.round(st.phT * 10) / 10;
  return true;
}
function gcCutStep(st, dt) {
  const c = st.cut, b = st.boss;
  if (c.wait) { if (st.fly.length || st.celebT > 0) return; c.wait = false; c.x0 = b.x; c.y0 = b.y; }
  c.t += dt;
  if (c.kind === 'leave') {
    if (!c.said) { c.said = true; gcSay(st, 'You want more? Follow me!', 2.4); b.mood = 'smug'; b.pose = 'wave'; }
    if (c.t > 0.9) {
      if (b.pose !== 'hover') { b.pose = 'hover'; b.gy = c.y0; Sfx.play('gcFly'); }
      const k = c.t - 0.9;
      b.y = c.y0 - k * k * 200 - k * 40; b.x = c.x0 + k * k * 110;
    }
    if (c.t >= GC.leaveT) nextRoom();
    return;
  }
  // the ending
  const at = (n, time) => c.step === n && c.t >= time && ++c.step;
  // a happy hop toward him (jumping = false: nobody holds jump in a cutscene, so the short-hop cut must not apply)
  const hop = () => { for (const p of G.players) if (p.alive && p.grounded) { p.face = b.x > p.x ? 1 : -1; jump(p, PHYS.jumpV * 0.7); p.jumping = false; } };
  if (at(0, 0)) { b.pose = 'nap'; b.mood = 'sleepy'; }
  if (at(1, 0.9)) { b.pose = 'sit'; b.mood = 'happy'; gcSay(st, 'I just wanted someone to play with...', 2.2); Sfx.play('gcWake'); }
  if (at(2, 2.2)) {
    gcHint(st, 0, 'You can play with us!', 2); gcHint(st, 1, 'Yes, play with us!', 2);
    hop();
  }
  if (at(3, 3.1)) {
    b.pose = 'wave'; gcSay(st, 'Really? Yay! Thank you!', 2.4); st.home = { t: 0 };
    hop(); const jar = gcBossPts(b).jar; for (let n = 0; n < 24; n++) confetti(jar.x + (gcRand() - 0.5) * 60, jar.y - 20);   // a burst from his opened jar
    Sfx.play('gcHome'); rumble(0, 0.3, 0.5, 200); rumble(1, 0.3, 0.5, 200);
  }
  if (st.home) {
    st.home.t += dt;
    if ((G.tickN % 6) === 0) confetti(120 + gcRand() * (W - 240), 60 + gcRand() * 80);
  }
  if (at(4, 6.5)) levelClear();
}
// where piece n (0-8) flies to when it goes home: off the top of the screen, spread out
function gcHomePos(st, i) {
  const sp = gcSlotPos(i), k = clamp((st.home.t - i * 0.06) / 1.4, 0, 1), e = k * k;
  const tx = 60 + i * 105, ty = -60;
  return { x: sp.x + (tx - sp.x) * e + Math.sin(k * 6 + i) * 20 * (1 - k), y: sp.y + 50 * Math.sin(k * Math.PI) + (ty - sp.y) * e, k };
}

/* --- players: bonks, freezing, coasting, seated roles --- */
// A soft knock-back and dizzy stars (never while busy, never twice within GC.bonk.safe s). Counted in st.stats.bonks.
function gcBonk(st, p, fromX, word = 'Bonk!') {
  if (!p || !p.alive || st.safe[p.id] > 0 || gcBusy(st, p)) return false;
  const dir = p.x + p.w / 2 >= fromX ? 1 : -1, B = GC.bonk;
  knock(p, dir * B.vx, -B.vy, B.stun, B.slide);
  st.safe[p.id] = B.safe; st.stats.bonks[p.id]++;
  gcPop(st, p.x + p.w / 2, p.y - 14, word, '#ffffff', 22);
  Sfx.play('gcBonk', p.id); rumble(p.id, 0.6, 0.4, 160);
  puff(p.x + p.w / 2, p.y + 4, 6, 'rgba(255,255,255,0.9)');
  gcCall(gcPh(st), 'onBonk', st, p);
  return true;
}
// the floor under (x, y): the top of the first solid tile or plank at or below y (H if there is none)
function gcGroundY(x, y) {
  const tx = clamp(Math.floor(x / T), 0, COLS - 1), [a, b] = G.players;
  for (let ty = Math.max(0, Math.floor(y / T)); ty < ROWS; ty++) {
    const ch = tile(tx, ty);
    if (ch === '=' || solidFor(ch, a) || solidFor(ch, b)) return ty * T;
  }
  return H;
}
// ownStep rooms, while the phase is not running (room card, cutscenes): players stand and land, no input
function gcCoast(dt) {
  for (const p of G.players) {
    p.pendingJump = false; p.pendingAct = false;
    const real = p.input;
    p.input = NO_INPUT;
    try {
      control(p, dt);
      if (p.alive) { moveX(p, p.vx * dt); moveY(p, p.vy * dt); postStep(p); }
    } finally { p.input = real; }
  }
}
// cutscenes in normal rooms: nobody steers (the framework still moves everyone)
function gcFreeze() {
  for (const p of G.players) { for (const k in p.input) p.input[k] = false; p.pendingJump = false; p.pendingAct = false; p.jumpBuf = 0; }
}
// a key that is down now, or was just tapped (the framework's tap window)
function gcKeyHeld(c) {
  if (keys.has(c)) return true;
  try { return tapLive(keysTapped, c); } catch (e) { return false; }
}
// Seated roles (a gunner): is this player's jump coming from a controller? Then A / B also do the action, and only the
// stick or d-pad aims up. (Pads.kind turns 'kb' on any key, so the player's own jump keys are checked too.)
function gcPadJump(id) {
  try {
    const touchJump = (touchState[id] && touchState[id].jump) || tapLive(touchTapped[id], 'jump');
    return !!padFor(padSlots(), id) && !BIND[id].jump.some(gcKeyHeld) && !touchJump;
  } catch (e) { return false; }
}
// the hint text for how to aim on this player's own device (seated roles that aim with ▲▼ and set power with ◀▶)
function gcAimKeys(id) {
  const k = actKey(id);
  return k === 'pad' ? 'stick ▲▼ aim, ◀▶ power, ' + glyph('a') + ' fire' : k === 'touch' ? '▲▼ aim, ◀▶ power, round button fires'
    : id === 0 ? 'W S aim, A D power, F fires' : '↑ ↓ aim, ← → power, / fires';
}

/* --- shared attacks: junk tosses (with a landing shadow) and the grabby claw --- */
// Toss soft junk at player id: it lands where they are now (plus a little lead) after opts.flight s (at least
// GC.toss.min; its shadow shows the spot the whole time and a "!" flashes over them). Landing on someone = a bonk.
// opts: kind ('boot', 'teapot', 'dice', 'duck', 'pan', 'pot', 'sock', 'can'), flight, x / y (landing spot),
// minX / maxX (keep the spot in a zone), from {x, y} (default: his hand). Returns the junk, or null when it's a calm
// moment or the player is busy.
function gcToss(st, id, opts = {}) {
  const p = G.players[id];
  if (!p || !p.alive || gcCalm(st) || gcBusy(st, p)) return null;
  const K = GC.toss, from = opts.from || gcBossPts(st.boss).hand, tt = Math.max(K.min, opts.flight || K.flight);
  let tx = opts.x != null ? opts.x : p.x + p.w / 2 + p.vx * K.lead;
  if (opts.minX != null) tx = Math.max(opts.minX, tx);
  if (opts.maxX != null) tx = Math.min(opts.maxX, tx);
  const ty = opts.y != null ? opts.y : gcGroundY(tx, p.y + p.h - 2);
  const vx = (tx - from.x) / tt, vy = (ty - 12 - from.y - 0.5 * K.g * tt * tt) / tt;
  const j = { kind: opts.kind || 'boot', id, x: from.x, y: from.y, vx, vy, tx, ty, t: 0, tt, rot: 0, vr: (gcRand() - 0.5) * 12 };
  st.junk.push(j); st.boss.throwT = 0.45; st.warn[id] = K.warn; st.stats.tosses++;
  Sfx.play('gcToss');
  return j;
}
function gcJunkTick(st, dt) {
  const K = GC.toss;
  for (const j of st.junk) {
    j.t += dt; j.vy += K.g * dt; j.x += j.vx * dt; j.y += j.vy * dt; j.rot += j.vr * dt;
    if (j.t < j.tt) continue;
    j.dead = true;
    puff(j.tx, j.ty - 8, 8, 'rgba(255,255,255,0.85)'); Sfx.play('gcLand');
    if (gcCalm(st)) continue;
    for (const p of G.players) if (p.alive && rectHit(p, j.tx - K.hitW, j.ty - K.hitH, 2 * K.hitW, K.hitH)) gcBonk(st, p, j.tx);
  }
  if (st.junk.some(j => j.dead)) st.junk = st.junk.filter(j => !j.dead);
}
// The grabby claw reaches for player id: first a telegraph (his hand rises and opens, a ring marks the spot, "!" over
// them) for GC.claw.warn s, then it zips to that spot and snaps shut. Jumping over it or stepping away dodges it.
// opts.onGrab(st, p) runs when it catches p and returns what the claw carries home (or null); without onGrab a catch
// is a bonk. opts: x / y (the spot), onGrab. Returns the claw, or null (calm moment, busy player, a claw already out).
function gcClaw(st, id, opts = {}) {
  const p = G.players[id];
  if (!p || !p.alive || gcCalm(st) || gcBusy(st, p) || st.claw) return null;
  const tx = opts.x != null ? opts.x : p.x + p.w / 2, ty = opts.y != null ? opts.y : gcGroundY(tx, p.y + p.h - 2);
  const h = gcBossPts(st.boss).hand;
  st.claw = { id, phase: 'warn', t: 0, tx, ty, hx: h.x, hy: h.y, open: 0, onGrab: opts.onGrab || null, got: null, done: false };
  st.warn[id] = GC.claw.warn; st.stats.claws++;
  Sfx.play('gcWhirr');
  return st.claw;
}
function gcClawTick(st, dt) {
  const c = st.claw;
  if (!c) return;
  const P = gcBossPts(st.boss), K = GC.claw, sh = P.shoulder, rest = P.hand;
  c.t += dt;
  if (c.phase === 'warn') {          // the hand rises over his shoulder and opens, wiggling
    const k = Math.min(1, c.t / K.warn), e = k * (2 - k);
    c.hx = rest.x + (sh.x - rest.x) * e + Math.sin(c.t * 18) * 3; c.hy = rest.y + (sh.y - 70 * st.boss.s - rest.y) * e; c.open = e;
    if (c.t >= K.warn) { c.phase = 'reach'; c.t = 0; c.fx = c.hx; c.fy = c.hy; Sfx.play('gcZip'); }
  } else if (c.phase === 'reach') {
    const k = Math.min(1, c.t / K.reach), e = 1 - (1 - k) * (1 - k);
    c.hx = c.fx + (c.tx - c.fx) * e; c.hy = c.fy + (c.ty - 20 - c.fy) * e;
    if (c.t >= K.reach) { c.phase = 'grab'; c.t = 0; }
  } else if (c.phase === 'grab') {
    c.open = Math.max(0, 1 - c.t / K.grab);
    if (!c.done && c.t >= K.grab * 0.5) {
      c.done = true;
      const p = gcCalm(st) ? null : G.players.find(q => q.alive && !gcBusy(st, q) && rectHit(q, c.tx - K.w, c.ty - K.h, 2 * K.w, K.h));
      if (p) { if (c.onGrab) c.got = c.onGrab(st, p) || null; else gcBonk(st, p, c.tx); }
      Sfx.play(c.got ? 'gcYoink' : 'gcSnap');
    }
    if (c.t >= K.grab) { c.phase = 'back'; c.t = 0; c.bx = c.hx; c.by = c.hy; }
  } else {
    const k = Math.min(1, c.t / K.back), e = k * k;
    c.hx = c.bx + (rest.x - c.bx) * e; c.hy = c.by + (rest.y - c.by) * e;
    if (c.t >= K.back) st.claw = null;
  }
}
// calm: junk in the air goes poof, the claw goes home
function gcCancelAttacks(st) {
  for (const j of st.junk) puff(j.x, j.y, 6, 'rgba(255,255,255,0.85)');
  st.junk = [];
  const c = st.claw;
  if (c && c.phase !== 'back') { c.phase = 'back'; c.t = 0; c.bx = c.hx; c.by = c.hy; c.done = true; }
  st.warn = [0, 0];
}

/* --- the idle wait: nobody pressed anything for GC.idleAfter s --- */
function gcIdleTick(st, dt) {
  const any = G.players.some(p => { const i = p.input; return i.left || i.right || i.jump || i.down || i.up || i.act; });
  if (any) {
    if (st.idle) { st.idle = false; gcSay(st, 'Oh! There you are!', 1.6); }
    st.idleT = 0; return;
  }
  st.idleT += dt;
  if (!st.idle && st.idleT >= GC.idleAfter && !st.cut && G.introT <= 0) { st.idle = true; st.idleSayT = 0; gcCancelAttacks(st); }
  if (st.idle && (st.idleSayT -= dt) <= 0) { st.idleSayT = 7; gcSay(st, (st.idleN++) % 2 ? 'Helloooo?' : 'Hello? Anyone there?', 2.6); }
}

/* --- per-role action words on the touch buttons, the top-bar legend and the cards --- */
let gcLabelEls = null;
function gcActLabels(st) {
  const def = G.level && G.level.def;
  if (!def || !def.act) return;
  let want = gcCall(gcPh(st), 'labels', st);
  if (!want) want = def.act.labels || [def.act.label, def.act.label];
  const key = want[0] + '|' + want[1];
  if (st.labKey === key) return;
  st.labKey = key;
  def.act = Object.assign({}, def.act, { labels: [want[0], want[1]] }); // (a copy: the room's own def stays as written)
  try {
    const lg = gcCall(gcPh(st), 'legend', st);   // a phase whose keys change with the job sets its legend here
    if (lg && G.mode === 'play') setLegend(lg);
    if (!gcLabelEls || !gcLabelEls.every(o => document.contains(o.el))) gcLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('.kb-only') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    for (const o of gcLabelEls) {
      const w = o.id < 0 ? (want[0] === want[1] ? want[0] : want[0] + '/' + want[1]) : want[o.id];
      if (o.el.textContent !== w) o.el.textContent = w;
    }
    if (typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* no page (tests): the cards still read def.act */ }
}

/* --- the mode --- */
function gcInit(st) {
  st.won = Array(9).fill(false); st.slotIn = Array(9).fill(false); st.slotPop = Array(9).fill(0);
  st.fly = []; st.home = null; st.ouchN = 0; st.idleN = 0;
  st.stats = { bonks: [0, 0], oops: [0, 0], tosses: 0, claws: 0, help: [], phaseT: [], pieceAt: {} };
}
function gcStartPhase(st, L) {
  const def = L.def;
  st.phase = def.phase; st.phaseNo = def.roomIndex || 0; st.ph = {}; st.phT = 0;
  st.cut = null; st.celebT = 0; st.junk = []; st.claw = null; st.say = null; st.news = null; st.hints = [null, null]; st.pops = [];
  st.badgeT = 0; st.badgeArm = true; st.swapT = 0; st.safe = [0, 0]; st.warn = [0, 0]; st.idleT = 0; st.idle = false; st.labKey = '';
  st.boss = gcNewBoss();
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    if (L.grid[ty][tx] === 'Z') { st.boss.x = tx * T + T / 2; st.boss.y = (ty + 1) * T; L.grid[ty][tx] = '.'; }
  }
  if (typeof def.look === 'number') applyTheme(def.look, def.theme);
  if (G.mode === 'play') setLegend(def.legend || null);   // (a room without one gets the default legend back)
  if (!GC_PHASES[def.phase]) console.warn('The Grand Collector: no GC_PHASES.' + def.phase);
  gcCall(gcPh(st), 'setup', st, L);
  gcActLabels(st);
}
function gcStep(st, dt) {
  if (!st.boss) return;
  const ph = gcPh(st), own = !!G.level.def.ownStep;
  if (G.introT <= 0) st.phT += dt;
  gcIdleTick(st, dt);
  // timers
  if (st.celebT > 0) st.celebT = Math.max(0, st.celebT - dt);
  if (st.say && (st.say.t += dt) >= st.say.life) st.say = null;
  if (st.news && (st.news.t += dt) >= st.news.life) st.news = null;
  for (let k = 0; k < 2; k++) {
    const h = st.hints[k];
    if (h && (h.t += dt) >= h.life) st.hints[k] = null;
    st.safe[k] = Math.max(0, st.safe[k] - dt); st.warn[k] = Math.max(0, st.warn[k] - dt);
  }
  for (const q of st.pops) q.t += dt;
  if (st.pops.length && st.pops[0].t > 1.1) st.pops = st.pops.filter(q => q.t <= 1.1);
  if (st.swapT > 0) st.swapT = Math.max(0, st.swapT - dt);
  if (st.badgeT > 0 && G.introT <= 0) st.badgeT = Math.max(0, st.badgeT - dt);
  gcBossTick(st, dt);
  gcFlyTick(st, dt);
  gcJunkTick(st, dt);
  gcClawTick(st, dt);
  if (st.cut) { gcCutStep(st, dt); if (own && G.mst === st && st.cut) gcCoast(dt); return; } // (nextRoom may start a new phase)
  if (G.introT > GC.introHold) {
    for (const p of G.players) { p.pendingAct = false; if (own) p.pendingJump = false; }
    if (ph.wait) gcCall(ph, 'wait', st, dt); else if (own) gcCoast(dt);
    gcActLabels(st);
    return;
  }
  if (st.badgeArm) { st.badgeArm = false; st.badgeT = GC.badgeT; }
  gcCall(ph, 'step', st, dt);
  gcActLabels(st);
}

MODES.collector = {
  rand: Math.random,   // gameplay randomness (gcRand); tests may swap in a seeded one (MODES.collector.test.seed)
  setup(st, L) { gcInit(st); gcStartPhase(st, L); },
  room(k, L) { gcStartPhase(G.mst, L); },
  pre(dt) {
    const st = G.mst;
    if (!st.boss) return;
    if (st.cut) { gcFreeze(); return; }
    if (G.introT <= GC.introHold) gcCall(gcPh(st), 'pre', st, dt);
  },
  step(dt) { gcStep(G.mst, dt); },
  onKill(p) { const st = G.mst; if (!st.boss) return; st.stats.oops[p.id]++; gcCall(gcPh(st), 'onKill', st, p); },
  onRespawn(p) { const st = G.mst; if (st.boss) gcCall(gcPh(st), 'onRespawn', st, p); },
  draw() { const st = G.mst; if (st.boss) gcDraw(st); },
  drawTop() { const st = G.mst; if (st.boss) gcDrawTop(st); },
  hud() { const st = G.mst; if (st.boss) gcHud(st); },
  stats() { return gcStats(G.mst); },
};

function gcStats(st) {
  const s = st.stats, bonks = s.bonks[0] + s.bonks[1], t = G.time, M = GC.medal;
  const medal = t <= M.gold.t && bonks <= M.gold.bonks ? 'Gold' : t <= M.silver.t && bonks <= M.silver.bonks ? 'Silver' : 'Bronze';
  const out = [
    { label: 'Pieces won back', value: gcPiecesWon(st) + ' / 9' },
    { label: 'Bonks', values: [s.bonks[0], s.bonks[1]] },
    { label: 'Trophy', value: medal },
  ];
  const lines = [], seen = new Set();
  for (const r of LEVELS[G.levelIndex].rooms || []) {
    const ph = GC_PHASES[r.phase];
    if (!ph || seen.has(ph)) continue;
    seen.add(ph);
    const tile = gcCall(ph, 'stat', st), line = gcCall(ph, 'statLine', st);
    if (tile) out.push(tile);
    if (line) lines.push(line);
  }
  // one short line (a phone shows it without scrolling): the trophy, the phases' fun fact, his rematch wish
  out.push(medal + ' trophy! ' + (bonks === 0 ? 'Not one bonk. ' : bonks <= 4 ? 'Hardly a bonk. ' : '') + lines.map(l => l + '. ').join('') + 'He wants a rematch!');
  return out;
}

/* --- drawing: the boss --- */
const GCB = { brass: '#e0ab45', brassDk: '#8f6421', brassLt: '#f7d77e', purple: '#7a55c0', purpleDk: '#46307e', purpleLt: '#a487e6', hat: '#2c2050', glass: 'rgba(205,236,255,0.42)' };
// the grabby arm (an accordion tube) from (x0, y0) to its claw at (x1, y1); s = scale, open 0..1, item = what it holds
function gcDrawArm(x0, y0, x1, y1, s, open, item) {
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, n = Math.max(2, Math.round(d / (15 * s)));
  ctx.lineCap = 'round';
  ctx.strokeStyle = GCB.brassDk; ctx.lineWidth = 15 * s; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = GCB.brass; ctx.lineWidth = 10 * s; ctx.stroke();
  ctx.strokeStyle = GCB.brassDk; ctx.lineWidth = 2.2 * s; ctx.beginPath();
  for (let k = 1; k < n; k++) { const px = x0 + dx * k / n, py = y0 + dy * k / n; ctx.moveTo(px - nx * 6 * s, py - ny * 6 * s); ctx.lineTo(px + nx * 6 * s, py + ny * 6 * s); }
  ctx.stroke();
  gcDrawClaw(x1, y1, Math.atan2(dy, dx), open, s, item);
}
function gcDrawClaw(x, y, ang, open, s, item) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  if (item) { ctx.save(); ctx.rotate(-ang); gcDrawItem(item, Math.cos(ang) * 18, Math.sin(ang) * 18, 1); ctx.restore(); }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const k of [-1, 0, 1]) {
    const a = k * (0.18 + 0.6 * open);
    const tipx = Math.cos(a) * 26, tipy = Math.sin(a) * 26, hook = k === 0 ? 0 : -k * (0.9 - 0.5 * open);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 7.5; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(tipx, tipy); ctx.lineTo(tipx + Math.cos(a + hook * 1.4) * 8, tipy + Math.sin(a + hook * 1.4) * 8); ctx.stroke();
    ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 4; ctx.stroke();
  }
  ctx.fillStyle = GCB.purple; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; circle(0, 0, 11); ctx.fill(); ctx.stroke();
  ctx.fillStyle = GCB.brassLt; circle(-2, -3, 3.5); ctx.fill();
  ctx.restore();
}
// The Grand Collector: st.boss = { x, y (his feet), s (scale), face (-1 looks left, 1 right), pose, mood, gy (ground
// for his shadow when he hovers), alpha, hidden, armHidden }. Poses: 'stand', 'stomp' / 'walk', 'hover', 'sit', 'dizzy',
// 'nap', 'wave'. A hit wobble (hitT), a toss (throwT) and the idle foot tap (st.idle) play over any pose.
// Moods: 'smug', 'grumpy', 'happy', 'sleepy'. The grabby arm is drawn on top (gcDrawTop) while the claw is out.
function gcDrawBoss(st) {
  const b = st.boss;
  if (b.hidden) return;
  const s = b.s, f = b.face, t = b.t, pose = b.pose, o = gcBossOff(b);
  const sit = pose === 'sit' || pose === 'nap', hover = pose === 'hover', walk = pose === 'stomp' || pose === 'walk';
  const gy = b.gy != null ? b.gy : b.y, hgt = Math.max(0, gy - b.y), shK = clamp(1 - hgt / 320, 0.3, 1);
  ctx.save();
  if (b.alpha < 1) ctx.globalAlpha = Math.max(0, b.alpha);
  ctx.fillStyle = `rgba(28,26,54,${0.24 * shK})`; ctx.beginPath(); ctx.ellipse(b.x, gy, 96 * s * shK, 11 * s * shK, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(b.x, b.y); ctx.scale(s * f, s);
  const wob = b.hitT > 0 ? Math.sin(b.hitT * 26) * 0.08 * Math.min(1, b.hitT / 0.4) : 0;
  ctx.rotate(wob + (pose === 'dizzy' ? Math.sin(t * 3) * 0.07 : 0));
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = C.ink;
  // legs and feet
  const step = walk ? Math.sin(t * 7) : 0, tap = st.idle && !sit && !hover ? (Math.sin(t * 9) > 0.2 ? 1 : 0) : 0;
  const legs = () => { for (const [lx, side] of [[-30, -1], [30, 1]]) {
    ctx.fillStyle = GCB.brassDk; ctx.lineWidth = 3;
    if (sit) {
      rr(lx, -26, 74 - side * 6, 22, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = GCB.purpleDk; ctx.beginPath(); ctx.ellipse(lx + 78 - side * 6, -22, 11, 19, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (hover) {
      const dl = o + 6 + Math.sin(t * 4 + lx) * 3;
      rr(lx - 12, -58 + dl, 24, 44, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = GCB.purpleDk; ctx.beginPath(); ctx.ellipse(lx + 4, -12 + dl, 20, 9, 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // little rocket flames
      const fl = 14 + Math.sin(t * 40 + lx) * 5;
      ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(lx - 8, -4 + dl); ctx.lineTo(lx + 4, -4 + dl + fl); ctx.lineTo(lx + 14, -4 + dl); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff1a8'; ctx.beginPath(); ctx.moveTo(lx - 3, -4 + dl); ctx.lineTo(lx + 4, -4 + dl + fl * 0.55); ctx.lineTo(lx + 9, -4 + dl); ctx.closePath(); ctx.fill();
    } else {
      const lift = Math.max(0, step * side) * 16, tp = side > 0 ? tap : 0;
      rr(lx - 13, -56 - lift, 26, 46, 10); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.translate(lx - 10, -4 - lift); ctx.rotate(-tp * 0.35);
      ctx.fillStyle = GCB.purpleDk; ctx.beginPath(); ctx.ellipse(16, -4, 25, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  } };
  if (!sit) legs();
  ctx.translate(0, o);
  // the short back arm
  ctx.strokeStyle = GCB.brassDk; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(-70, -150);
  const bh = pose === 'wave' ? [-96, -190] : pose === 'dizzy' ? [-104, -80] : [-100, -104 + Math.sin(t * 2.2) * 2];
  ctx.quadraticCurveTo(-100, -150, bh[0], bh[1]); ctx.stroke();
  ctx.strokeStyle = GCB.brass; ctx.lineWidth = 10; ctx.stroke();
  ctx.fillStyle = GCB.purple; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; circle(bh[0], bh[1], 12); ctx.fill(); ctx.stroke();
  // the propeller on his back (spins while he flies)
  const spin = hover ? Math.abs(Math.cos(t * 30)) : 0.25;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-46, -200); ctx.lineTo(-58, -322); ctx.stroke();
  ctx.fillStyle = '#d9dbe8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-58, -324, 6 + 34 * spin, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff5f6d'; circle(-58, -324, 5); ctx.fill(); ctx.stroke();
  // torso
  ctx.fillStyle = GCB.brass; ctx.lineWidth = 4; rr(-82, -190, 164, 150, 44); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(-70, -182, 46, 70, 20); ctx.fill();
  ctx.fillStyle = GCB.purple; ctx.lineWidth = 2.5; rr(-82, -64, 164, 20, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = GCB.brassDk; for (let k = -2; k <= 2; k++) { circle(k * 30, -176, 3); ctx.fill(); }
  // chest lights
  const lit = b.mood === 'sleepy' ? 0.25 : 1;
  for (const [lx, c] of [[-64, '#7fd36b'], [64, '#ff5f6d']]) { ctx.fillStyle = c; ctx.globalAlpha = (b.alpha < 1 ? b.alpha : 1) * lit * (0.6 + 0.4 * Math.sin(t * 5 + lx)); circle(lx, -88, 6); ctx.fill(); }
  ctx.globalAlpha = b.alpha < 1 ? Math.max(0, b.alpha) : 1;
  if (sit) { ctx.save(); ctx.translate(0, -o); legs(); ctx.restore(); }
  // the glass belly-jar with the pieces he still has, bobbing inside
  ctx.fillStyle = GCB.glass; ctx.strokeStyle = GCB.brassLt; ctx.lineWidth = 7; circle(0, -112, 54); ctx.fill();
  let n = 0;
  const flying = new Set(st.fly.map(q => q.n - 1));
  for (let i = 0; i < 9; i++) {
    if (st.won[i] || flying.has(i)) continue;
    const a = i * 2.39 + t * 0.5, rad = 12 + (i % 3) * 11;
    ctx.save(); ctx.scale(f, 1); gcIcon(i + 1, f * Math.cos(a) * rad, -112 + Math.sin(a) * rad * 0.8 + Math.sin(t * 2 + i) * 3, 9); ctx.restore();
    n++;
  }
  circle(0, -112, 54); ctx.stroke();
  ctx.strokeStyle = GCB.brassDk; ctx.lineWidth = 2; circle(0, -112, 57.5); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -112, 42, -2.6, -1.9); ctx.stroke();
  // neck and head (a purple dome with a brass band)
  ctx.strokeStyle = C.ink; ctx.fillStyle = GCB.brassDk; ctx.lineWidth = 2.5; rr(-22, -204, 44, 18, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = GCB.purple; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, -230, 62, 48, 0, Math.PI, 0); ctx.lineTo(62, -200); ctx.lineTo(-62, -200); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(-26, -256, 18, 10, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = GCB.brass; ctx.lineWidth = 2.5; rr(-64, -206, 128, 14, 7); ctx.fill(); ctx.stroke();
  // ear bolts
  ctx.fillStyle = GCB.brassLt; for (const ex of [-64, 64]) { circle(ex, -226, 8); ctx.fill(); ctx.stroke(); }
  // googly eyes (the front one wears the monocle)
  const mood = b.mood, shut = pose === 'nap' || b.blink > 0;
  const jig = Math.sin(t * 9) * 1.4, lookX = 3, lookY = pose === 'dizzy' ? 0 : 2;
  for (const [ex, er] of [[-14, 14], [26, 16]]) {
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; circle(ex, -234, er); ctx.fill(); ctx.stroke();
    if (shut) { ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ex, -236, er * 0.6, 0.3, Math.PI - 0.3); ctx.stroke(); }
    else if (pose === 'dizzy') { ctx.lineWidth = 2.2; ctx.beginPath(); for (let a = 0; a < 9; a += 0.4) ctx.lineTo(ex + Math.cos(a + t * 6) * a * 0.9, -234 + Math.sin(a + t * 6) * a * 0.9); ctx.stroke(); }
    else if (mood === 'happy') { ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(ex, -230, er * 0.55, Math.PI + 0.3, -0.3); ctx.stroke(); }
    else { ctx.fillStyle = C.ink; circle(ex + lookX + jig * 0.6, -233 + lookY + jig * 0.4, er * 0.42); ctx.fill(); ctx.fillStyle = '#ffffff'; circle(ex + lookX + jig * 0.6 - 2, -235 + lookY, 1.8); ctx.fill(); }
  }
  // eyebrows by mood
  ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
  const brow = mood === 'grumpy' ? [[-26, -256, -4, -250], [14, -252, 38, -258]] : mood === 'happy' || mood === 'sleepy' ? [[-24, -254, -4, -256], [14, -258, 38, -256]] : [[-26, -252, -4, -254], [14, -262, 38, -258]];
  for (const [x0, y0, x1, y1] of brow) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
  if (!b.mono) {
    ctx.strokeStyle = C.gold; ctx.lineWidth = 4; circle(26, -234, 20); ctx.stroke();
    ctx.strokeStyle = GCB.brassDk; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(40, -220); ctx.quadraticCurveTo(52, -206, 44, -194); ctx.stroke();
  }
  // mouth: a grille; a smile when happy, an "O" when hit, a little line asleep
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  if (b.hitT > 0.3) { ctx.fillStyle = '#2a1f45'; ctx.beginPath(); ctx.ellipse(10, -207, 8, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  else if (mood === 'happy' || pose === 'wave') { ctx.fillStyle = '#2a1f45'; ctx.beginPath(); ctx.arc(8, -214, 14, 0.15, Math.PI - 0.15); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff8fa3'; circle(8, -204, 4); ctx.fill(); }
  else if (pose === 'nap') { ctx.beginPath(); ctx.moveTo(2, -208); ctx.lineTo(16, -208); ctx.stroke(); }
  else {
    ctx.fillStyle = '#d9dbe8'; rr(-8, -213, 36, 11, 4); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.beginPath(); for (let k = 1; k < 4; k++) { ctx.moveTo(-8 + k * 9, -213); ctx.lineTo(-8 + k * 9, -202); } ctx.stroke();
    if (mood === 'smug') { ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(28, -210); ctx.lineTo(34, -216); ctx.stroke(); }
  }
  ctx.fillStyle = 'rgba(255,120,140,0.4)'; circle(46, -212, 6); ctx.fill(); circle(-32, -212, 5); ctx.fill();
  // the tiny top hat (it hops when he is hit)
  const hop = b.hitT > 0 ? Math.sin((0.9 - b.hitT) / 0.9 * Math.PI) * 22 : 0;
  ctx.save(); ctx.translate(-6, -276 - hop); ctx.rotate(-0.12 + (b.hitT > 0 ? Math.sin(b.hitT * 20) * 0.2 : 0));
  ctx.fillStyle = GCB.hat; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, 4, 40, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  rr(-24, -32, 48, 36, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.gold; ctx.fillRect(-24, -8, 48, 7);
  ctx.restore();
  // the grabby arm at rest (or throwing, waving, drooping)
  if (!st.claw && !b.armHidden) {
    let hx = 104, hy = -84 + Math.sin(t * 2.2) * 2, open = 0.15;
    if (b.throwT > 0) { const k = b.throwT / 0.45; hx = 60 + (1 - k) * 70; hy = -300 + (1 - k) * 120; open = 1 - k; }
    else if (pose === 'wave') { hx = 108; hy = -300 + Math.sin(t * 9) * 16; open = 1; }
    else if (pose === 'dizzy' || pose === 'nap') { hx = 112; hy = sit ? -70 : -40; open = 0.6; }
    else if (st.idle) { hx = 96; hy = -150; open = 0; }
    gcDrawArm(76, -160, hx, hy, 1, open, null);
  }
  ctx.restore();
  // over him: dizzy stars, sleepy z's, the flying monocle
  const P = gcBossPts(b);
  if (pose === 'dizzy') for (let k = 0; k < 4; k++) { const a = t * 4 + k * Math.PI / 2; gcStar(P.head.x + Math.cos(a) * 70 * s, P.head.y - 70 * s + Math.sin(a) * 14 * s, 9 * s, C.gold); }
  if (pose === 'nap') for (let k = 0; k < 3; k++) { const u = (t * 0.5 + k / 3) % 1; ctx.globalAlpha = 1 - u; text('z', P.head.x - f * (40 + u * 40) * s, P.head.y - (60 + u * 70) * s, (16 + u * 14) * s + 6, '#ffffff', 'center'); ctx.globalAlpha = 1; }
  if (b.mono) { const m = b.mono; ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.rot); ctx.strokeStyle = C.gold; ctx.lineWidth = 4 * s; circle(0, 0, 18 * s); ctx.stroke(); ctx.restore(); }
}
function gcStar(x, y, r, col) {
  ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
}
// the nine piece icons (n = world 1-9), drawn in a circle of radius r around (x, y)
function gcIcon(n, x, y, r) {
  ctx.save(); ctx.translate(x, y); ctx.scale(r / 10, r / 10);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 1.5; ctx.strokeStyle = C.ink;
  switch (n) {
    case 1:   // sunflower
      ctx.fillStyle = '#ffd23f';
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 6, Math.sin(a) * 6, 4.2, 2.4, a, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#8a5a2b'; circle(0, 0, 4.4); ctx.fill(); ctx.stroke(); break;
    case 2:   // a T block
      ctx.fillStyle = '#ff8f5a';
      for (const [cx, cy] of [[-6.6, -3.3], [0, -3.3], [6.6, -3.3], [0, 3.3]]) { ctx.fillRect(cx - 3.3, cy - 3.3, 6.6, 6.6); ctx.strokeRect(cx - 3.3, cy - 3.3, 6.6, 6.6); }
      break;
    case 3:   // golf flag on a green
      ctx.fillStyle = '#7fd36b'; ctx.beginPath(); ctx.ellipse(0, 7, 9.5, 3.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-2, 7); ctx.lineTo(-2, -9); ctx.stroke();
      ctx.fillStyle = '#ff5f6d'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-1, -9.5); ctx.lineTo(8.5, -5.5); ctx.lineTo(-1, -1.5); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 4:   // boxing glove
      ctx.fillStyle = '#ff5f6d'; rr(-7, -9, 15, 14, 6); ctx.fill(); ctx.stroke(); circle(-7, -1, 3.8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; rr(-5.5, 4, 11, 5.5, 2); ctx.fill(); ctx.stroke(); break;
    case 5:   // little car
      ctx.fillStyle = '#4fc3d9'; rr(-5, -8, 10, 7, 3); ctx.fill(); ctx.stroke(); rr(-9.5, -3, 19, 7.5, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.ink; circle(-5, 5, 2.8); ctx.fill(); circle(5, 5, 2.8); ctx.fill(); break;
    case 6:   // the monster's cupcake
      ctx.fillStyle = '#d9a066'; ctx.beginPath(); ctx.moveTo(-6.5, 0); ctx.lineTo(6.5, 0); ctx.lineTo(4.5, 9); ctx.lineTo(-4.5, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff8fc7'; ctx.beginPath(); ctx.ellipse(0, -1.5, 8.5, 5.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8475f'; circle(0, -7.5, 2.6); ctx.fill(); ctx.stroke(); break;
    case 7:   // crown
      ctx.fillStyle = '#ffc53d'; ctx.beginPath(); ctx.moveTo(-9, 6); ctx.lineTo(-9.5, -6); ctx.lineTo(-4.5, -1); ctx.lineTo(0, -8); ctx.lineTo(4.5, -1); ctx.lineTo(9.5, -6); ctx.lineTo(9, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff5f7e'; circle(0, 2, 2); ctx.fill(); break;
    case 8:   // cherries
      ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-4, 2); ctx.quadraticCurveTo(-2, -6, 3, -9); ctx.moveTo(5, 3); ctx.quadraticCurveTo(4, -4, 3, -9); ctx.stroke();
      ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(6, -8, 3.5, 1.8, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8475f'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3; circle(-4.5, 4, 4.6); ctx.fill(); ctx.stroke(); circle(5, 5, 4.6); ctx.fill(); ctx.stroke(); break;
    case 9:   // volcano
      ctx.fillStyle = '#9a6a4a'; ctx.beginPath(); ctx.moveTo(-10, 8); ctx.lineTo(-3, -5); ctx.lineTo(3, -5); ctx.lineTo(10, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff9a3d'; ctx.beginPath(); ctx.moveTo(-3, -5); ctx.lineTo(3, -5); ctx.lineTo(1.5, 1); ctx.lineTo(-1, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; circle(1, -9, 2.6); ctx.fill(); circle(4, -11, 2); ctx.fill(); break;
  }
  ctx.restore();
}
// soft junk he throws (s = scale, rot = spin)
function gcDrawJunk(kind, x, y, s = 1, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  switch (kind) {
    case 'teapot':
      ctx.fillStyle = '#7ec8ff'; ctx.beginPath(); ctx.ellipse(0, 2, 12, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(19, -6); ctx.stroke(); ctx.beginPath(); ctx.arc(-13, 2, 5, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
      ctx.fillStyle = '#ffffff'; rr(-5, -10, 10, 4, 2); ctx.fill(); ctx.stroke(); break;
    case 'dice':
      ctx.fillStyle = '#ffffff'; rr(-11, -11, 22, 22, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8475f'; for (const [px, py] of [[-5, -5], [0, 0], [5, 5]]) { circle(px, py, 2.4); ctx.fill(); } break;
    case 'duck':
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(0, 3, 12, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); circle(6, -6, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff9a3d'; ctx.beginPath(); ctx.moveTo(11, -7); ctx.lineTo(17, -5); ctx.lineTo(11, -3); ctx.closePath(); ctx.fill(); ctx.fillStyle = C.ink; circle(7, -8, 1.4); ctx.fill(); break;
    case 'pan':
      ctx.fillStyle = '#4a4f6e'; circle(-3, 0, 10); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#8a5833'; rr(6, -2.5, 15, 5, 2); ctx.fill(); ctx.stroke(); break;
    case 'pot':
      ctx.fillStyle = '#a3a9c2'; rr(-11, -7, 22, 16, 4); ctx.fill(); ctx.stroke(); ctx.fillRect(-14, -5, 4, 3); ctx.fillRect(10, -5, 4, 3); ctx.fillStyle = '#6d7290'; rr(-12, -10, 24, 4, 2); ctx.fill(); ctx.stroke(); break;
    case 'sock':
      ctx.fillStyle = '#ff8fc7'; ctx.beginPath(); ctx.moveTo(-5, -12); ctx.lineTo(4, -12); ctx.lineTo(4, 3); ctx.lineTo(10, 6); ctx.lineTo(8, 11); ctx.lineTo(-5, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-5, -7, 9, 3); break;
    case 'can':
      ctx.fillStyle = '#d9dbe8'; rr(-8, -11, 16, 22, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff5f6d'; ctx.fillRect(-8, -4, 16, 8); break;
    default:  // boot
      ctx.fillStyle = '#9a6232'; ctx.beginPath(); ctx.moveTo(-9, -12); ctx.lineTo(3, -12); ctx.lineTo(3, 0); ctx.lineTo(13, 3); ctx.lineTo(13, 9); ctx.lineTo(-9, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5a3a20'; ctx.fillRect(-9, 6, 22, 3); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-7, -10, 3, 12);
  }
  ctx.restore();
}
// things a phase may carry or show: a powder keg ('powder') or a cannonball ('ball'); anything else is a junk kind
function gcDrawItem(kind, x, y, s = 1) {
  if (kind !== 'powder' && kind !== 'ball') { gcDrawJunk(kind, x, y, s * 0.8, 0); return; }
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
  if (kind === 'powder') {
    ctx.fillStyle = '#9a6232'; rr(-8, -9, 16, 18, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-5, -7, 3, 14);
    ctx.fillStyle = '#2a2f4f'; ctx.fillRect(-8, -5, 16, 3); ctx.fillRect(-8, 2, 16, 3);
    ctx.fillStyle = C.gold; circle(0, -10, 2.4); ctx.fill();
  } else {
    ctx.fillStyle = '#3c4260'; circle(0, 0, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.32)'; circle(-3, -3, 2.8); ctx.fill();
  }
  ctx.restore();
}

/* --- drawing: the layers --- */
function gcDraw(st) {
  const ph = gcPh(st);
  gcCall(ph, 'drawBack', st);
  gcDrawBoss(st);
  gcCall(ph, 'draw', st);
  // landing shadows and the claw's target ring (on the ground, under the players)
  for (const j of st.junk) {
    const k = clamp(j.t / j.tt, 0, 1);
    ctx.fillStyle = `rgba(28,26,54,${0.18 + 0.3 * k})`; ctx.beginPath(); ctx.ellipse(j.tx, j.ty - 1, 8 + 16 * k, 3 + 3 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  const c = st.claw;
  if (c && (c.phase === 'warn' || c.phase === 'reach')) {
    const pulse = 0.6 + 0.4 * Math.sin(G.clock * 16);
    ctx.strokeStyle = `rgba(255,95,109,${pulse})`; ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.ellipse(c.tx, c.ty - 2, GC.claw.w, 7, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
}
function gcDrawTop(st) {
  const ph = gcPh(st), b = st.boss, big = hudBig(), z = big ? 1.4 : 1;
  gcCall(ph, 'drawTop', st);
  for (const j of st.junk) gcDrawJunk(j.kind, j.x, j.y, 1, j.rot);
  const c = st.claw;
  if (c && !b.hidden) { const P = gcBossPts(b); gcDrawArm(P.shoulder.x, P.shoulder.y, c.hx, c.hy, b.s, c.open, c.got); }
  // "!" over a player something is coming for
  for (let k = 0; k < 2; k++) {
    const p = G.players[k];
    if (st.warn[k] <= 0 || !p.alive) continue;
    const bob = Math.abs(Math.sin(G.clock * 12)) * 5;
    bigText('!', p.x + p.w / 2, p.y - 24 - bob - gcHeadLift(st, p), 30 * z, '#ff5f6d', 1);
  }
  // his speech bubble
  const sb = gcSayBox(st);
  if (sb) {
    const { P, fs, tw, th, side, bx, by } = sb, a = clamp(Math.min(st.say.t / 0.12, (st.say.life - st.say.t) / 0.25), 0, 1);
    ctx.font = '400 ' + fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    rr(bx - tw / 2, by - th / 2, tw, th, th / 2); ctx.fill(); ctx.stroke();
    // the tail points at his mouth from the bubble's near end
    const ex = bx - side * (tw / 2 - 2), mx = clamp(P.head.x + side * P.head.r * 0.95, 4, W - 4), my = clamp(P.mouth.y, by - th, by + th * 1.5);
    ctx.beginPath(); ctx.moveTo(ex, by - 7); ctx.lineTo(mx, my); ctx.lineTo(ex, by + 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillRect(ex - side * 4 - 2, by - 6, 4, 12);
    text(st.say.text, bx, by + 1, fs, C.ink, 'center');
    ctx.restore();
  }
  // pop words ("Bonk!", "CLANG!")
  for (const q of st.pops) {
    const k = q.t / 1.1, s2 = 0.7 + 0.5 * Math.min(1, q.t / 0.12);
    ctx.save(); ctx.globalAlpha = clamp((1.1 - q.t) / 0.4, 0, 1);
    bigText(q.text, clamp(q.x, 60, W - 60), q.y - k * 30, q.size * z, q.col, s2);
    ctx.restore();
  }
}
const gcHeadLift = (st, p) => gcCall(gcPh(st), 'headLift', st, p) || 0;
// where his speech bubble goes: beside his head on the side he faces (the other side if that is off the screen),
// under the pieces strip, and under the news banner when they would overlap. Null when he says nothing.
function gcSayBox(st) {
  const b = st.boss;
  if (!st.say || b.hidden) return null;
  const z = hudBig() ? 1.4 : 1, P = gcBossPts(b), fs = Math.round(16 * z);
  ctx.font = '400 ' + fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
  const tw = ctx.measureText(st.say.text).width + 26 * z, th = fs + 16 * z, B = gcStripBox();
  let side = b.face;
  const gap = P.head.r + 18 * z;
  if ((side < 0 && P.head.x - gap - tw < 6) || (side > 0 && P.head.x + gap + tw > W - 6)) side = -side;
  const bx = clamp(P.head.x + side * (gap + tw / 2), tw / 2 + 6, W - tw / 2 - 6);
  let by = clamp(P.head.y - P.head.r * 0.55, B.y0 + B.h + th / 2 + 10, H - th / 2 - 10);
  const nb = gcNewsBox(st);
  if (nb && bx + tw / 2 > nb.x0 - 4 && bx - tw / 2 < nb.x1 + 4 && by - th / 2 < nb.y1 + 6) by = Math.min(H - th / 2 - 10, nb.y1 + th / 2 + 8);
  return { P, fs, tw, th, side, bx, by };
}
// the news banner's box (under the strip), or null
function gcNewsBox(st) {
  const n = st.news;
  if (!n || G.introT > 0) return null;
  const big = hudBig(), B = gcStripBox(), fs = big ? 19 : 14, h = big ? 36 : 28, y = B.y0 + B.h + 6;
  ctx.font = gcFont(fs);
  const w = Math.min(ctx.measureText(n.text).width + 34, W - 40);
  return { x0: W / 2 - w / 2, x1: W / 2 + w / 2, y0: y, y1: y + h, fs, h };
}
// a live player inside (or touching) this box: HUD bits there fade so you can still see yourself
const gcUnder = (x0, y0, x1, y1) => G.players.some(p => p.alive && p.x + p.w > x0 - 4 && p.x < x1 + 4 && p.y + p.h > y0 - 4 && p.y - 8 < y1 + 4);

/* --- drawing: the HUD --- */
// the pieces strip, top centre: "The Grand Collector" and 9 slots
function gcStripBox() {
  const big = hudBig(), sw = big ? 34 : 26, gap = big ? 5 : 4, w = 9 * sw + 8 * gap + 24, h = big ? 64 : 50;
  return { x0: W / 2 - w / 2, y0: 6, w, h, sw, gap, big, labY: 6 + (big ? 13 : 11), slotY: 6 + (big ? 26 : 21) };
}
function gcSlotPos(i) { const B = gcStripBox(); return { x: B.x0 + 12 + i * (B.sw + B.gap) + B.sw / 2, y: B.slotY + B.sw / 2, r: B.sw / 2 }; }
function gcDrawStrip(st) {
  const B = gcStripBox();
  ctx.save(); if (gcUnder(B.x0, B.y0, B.x0 + B.w, B.y0 + B.h)) ctx.globalAlpha = 0.45;
  ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(B.x0, B.y0, B.w, B.h, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(224,171,69,0.7)'; ctx.lineWidth = 2; rr(B.x0, B.y0, B.w, B.h, 14); ctx.stroke();
  text('The Grand Collector', W / 2, B.labY, B.big ? 16 : 11, C.gold, 'center', 'body');
  for (let i = 0; i < 9; i++) {
    const sp = gcSlotPos(i), x = sp.x - B.sw / 2, y = sp.y - B.sw / 2, home = st.home && gcHomePos(st, i).k > 0;
    const got = st.slotIn[i] && !home, pop = st.slotPop[i];
    ctx.fillStyle = got ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)'; rr(x, y, B.sw, B.sw, 7); ctx.fill();
    if (got) { ctx.strokeStyle = GC_PIECES[i].col; ctx.lineWidth = 2; rr(x, y, B.sw, B.sw, 7); ctx.stroke(); }
    if (home) { gcStar(sp.x, sp.y, B.sw * 0.28, C.gold); continue; }
    ctx.save(); if (!got) ctx.globalAlpha = 0.25;
    gcIcon(i + 1, sp.x, sp.y, B.sw * 0.36 * (1 + 0.5 * Math.sin(pop * Math.PI)));
    ctx.restore();
  }
  ctx.restore();
}
// what draws over and under each player's head: role badges, then hint bubbles; under the feet when the top is taken
function gcDrawHeads(st, rightBox, newsBox) {
  if (G.introT > 0) return;
  const big = hudBig(), B = gcStripBox();
  const clearTop = (x0, x1) => {
    let y = 4;
    if (x0 < 290) y = 80;                                                     // the level and room pills
    if (x1 > B.x0 - 4 && x0 < B.x0 + B.w + 4) y = Math.max(y, B.y0 + B.h + 6); // the pieces strip
    if (newsBox && x1 > newsBox.x0 - 4 && x0 < newsBox.x1 + 4) y = Math.max(y, newsBox.y1 + 6);
    if (rightBox && x1 > rightBox[0] - 4) y = Math.max(y, rightBox[1] + 6);
    return y;
  };
  // his speech bubble and the big "Swap jobs!" are taken too
  const placed = [], sb = gcSayBox(st);
  if (sb) placed.push([sb.bx - sb.tw / 2, sb.by - sb.th / 2, sb.tw, sb.th]);
  if (st.swapT > 0) { const fs = big ? 46 : 36; ctx.font = '400 ' + fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif'; const w = ctx.measureText('Swap jobs!').width * 1.1; placed.push([W / 2 - w / 2, 150 - fs * 0.65, w, fs * 1.3]); }
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
  const heads = G.players.filter(p => p.alive).map(p => ({ p, px: p.x + p.w / 2, top: p.y - 8 - gcHeadLift(st, p), below: p.y + p.h + 10 }));
  const roles = st.badgeT > 0 ? gcCall(gcPh(st), 'roles', st) : null;
  if (roles) for (const k of heads) {
    const word = roles[k.p.id];
    if (!word) continue;
    const fs = big ? 20 : 12, bh = fs + (big ? 10 : 8), a = clamp(st.badgeT / 0.4, 0, 1);
    ctx.font = gcFont(fs);
    const bw = ctx.measureText(word).width + 16, bx = clamp(k.px, bw / 2 + 4, W - bw / 2 - 4), was = [k.top, k.below];
    const pl = place(bx - bw / 2, bw, bh, k), y0 = pl.y;
    // no room over the head and a hint wants it too: the hint says more, so the badge sits this one out
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
    ctx.font = gcFont(fs);
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
function gcHud(st) {
  const ph = gcPh(st), big = hudBig(), B = gcStripBox();
  gcDrawStrip(st);
  // top right: time (and the phase's own short text)
  const fs = big ? 20 : 14, h = big ? 40 : 28, extra = gcCall(ph, 'hudText', st);
  const s = fmtTime(G.time) + (extra ? '   ' + extra : '');
  ctx.font = gcFont(fs);
  const rw = ctx.measureText(s).width + 28, rx = pill(W - 14, 12, rw, h, 'right');
  text(s, W - 28, 12 + h / 2 + 0.5, fs, C.paper, 'right', 'body');
  const rightBox = [rx, 12 + h];
  // news (gold for help), under the strip; see-through while a player is under it
  const n = st.news, newsBox = gcNewsBox(st);
  if (newsBox) {
    const { x0, x1, y0, h: nh, fs: nfs } = newsBox, w = x1 - x0;
    ctx.save(); ctx.globalAlpha = clamp(Math.min(n.t / 0.15, (n.life - n.t) / 0.3), 0, 1) * (gcUnder(x0, y0, x1, newsBox.y1) ? 0.35 : 1);
    ctx.fillStyle = 'rgba(28,26,54,0.85)'; rr(x0, y0, w, nh, nh / 2); ctx.fill();
    if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x0, y0, w, nh, nh / 2); ctx.stroke(); }
    text(n.text, W / 2, y0 + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
    ctx.restore();
  }
  gcCall(ph, 'hud', st);
  // a player up under the level / room pills or the time pill: draw them again, a little see-through, on top
  for (const p of G.players) {
    if (!p.alive || p.y - 8 > 80) continue;
    if (p.x < 294 || p.x + p.w > rightBox[0] - 4 && p.y - 8 < rightBox[1] + 4) { ctx.save(); ctx.globalAlpha = 0.75; drawPlayer(p); ctx.restore(); }
  }
  gcDrawHeads(st, rightBox, newsBox);
  if (st.swapT > 0 && G.introT <= 0) {
    const k = 1 - st.swapT / GC.swapT, a = clamp(st.swapT / 0.4, 0, 1);
    ctx.save(); ctx.globalAlpha = a; bigText('Swap jobs!', W / 2, 150, big ? 46 : 36, C.gold, 0.8 + 0.25 * Math.min(1, k * 6)); ctx.restore();
  }
  // pieces on their way to the strip, and home at the end
  for (const f of st.fly) {
    if (f.done) continue;
    const q = gcFlyPos(st, f), r = (big ? 13 : 10) * (1 + 0.8 * Math.sin(q.k * Math.PI));
    ctx.fillStyle = 'rgba(255,240,180,0.45)'; circle(q.x, q.y, r * 1.6); ctx.fill();
    gcIcon(f.n, q.x, q.y, r);
  }
  if (st.home) for (let i = 0; i < 9; i++) {
    const q = gcHomePos(st, i);
    if (q.k <= 0 || q.k >= 1) continue;
    ctx.fillStyle = 'rgba(255,240,180,0.4)'; circle(q.x, q.y, 18); ctx.fill();
    gcIcon(i + 1, q.x, q.y, 12);
  }
}

/* --- sounds --- */
Sfx.extra.gcTalk = function () { for (let k = 0; k < 3; k++) this.tone(260 + Math.random() * 200, 0.05, 'square', 0.022, null, k * 0.06); };
Sfx.extra.gcGold = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.gcSwap = function () { [523, 784, 659, 988].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.045, null, i * 0.07)); };
Sfx.extra.gcBoing = function () { this.tone(180, 0.3, 'sine', 0.08, 520); this.tone(900, 0.05, 'square', 0.025, 600, 0.05); };
Sfx.extra.gcPiece = function () { [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.055, null, i * 0.05)); this.tone(1320, 0.3, 'sine', 0.03, 2000, 0.12); };
Sfx.extra.gcSlot = function () { this.tone(1046, 0.06, 'square', 0.04); this.tone(1568, 0.14, 'triangle', 0.05, null, 0.05); };
Sfx.extra.gcBonk = function (p) { this.tone(420 * p, 0.06, 'square', 0.05, 220 * p); this.tone(1400, 0.1, 'triangle', 0.03, 1800, 0.05); };
Sfx.extra.gcToss = function () { this.tone(300, 0.14, 'sawtooth', 0.02, 600); };
Sfx.extra.gcLand = function () { this.tone(160, 0.08, 'triangle', 0.06, 90); };
Sfx.extra.gcWhirr = function () { this.tone(220, 0.5, 'sawtooth', 0.018, 440); };
Sfx.extra.gcZip = function () { this.tone(500, 0.16, 'sawtooth', 0.025, 1400); };
Sfx.extra.gcSnap = function () { this.tone(1200, 0.04, 'square', 0.04, 700); this.tone(300, 0.06, 'triangle', 0.04, null, 0.03); };
Sfx.extra.gcYoink = function () { this.tone(700, 0.08, 'square', 0.04, 1100); this.tone(1100, 0.12, 'triangle', 0.04, 1500, 0.08); };
Sfx.extra.gcFly = function () { this.tone(200, 0.8, 'sawtooth', 0.02, 700); this.tone(400, 0.6, 'triangle', 0.02, 900, 0.2); };
Sfx.extra.gcWake = function () { [392, 523, 659].forEach((f, i) => this.tone(f, 0.16, 'sine', 0.05, null, i * 0.12)); };
Sfx.extra.gcHome = function () { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.05, null, i * 0.09)); };
Sfx.extra.gcClang = function () { this.tone(1500, 0.3, 'square', 0.04, 1300); this.tone(2200, 0.4, 'triangle', 0.04, 2000, 0.02); this.tone(120, 0.2, 'sine', 0.06, 80); };
Sfx.extra.gcThud = function () { this.tone(110, 0.08, 'triangle', 0.06, 70); };

/* ===== END GC CORE ===== */

/* ===== GC PHASE 1: CANNONS ===== */
/* Castle Cannons (Castle Quest look, borrows 7-1 Cannon Crew). He stands behind a wall of stolen castle blocks.
   Loader: the action at a pile picks up a keg or a ball (one of each at a time), the action at the cannon loads them.
   Gunner: sits at the cannon; ▲▼ aim, ◀▶ power, the action fires (on a controller A fires too: a seated role).
   Blocks pop when a ball hits them (stone takes two hits), and the blocks above drop down. A ball that reaches his
   glass belly = CLANG and a piece (7, then 2). After the first hit he stacks a bigger wall and the jobs swap.
   He yoinks what the loader carries with his claw and tosses boots and teapots at the loader (never the gunner).
   Gold help: Lucky aim (a longer aim line) after a few misses in a row.
   Map chars: Y the cannon, p powder kegs, i cannonballs (on the room def: fence = the tile column the loader can't
   pass, gunner = who sits first, wall1 / wall2 = the walls). Stats in st.stats.cannons. */
const GC1 = {
  angMin: 5, angMax: 80, angStart: 28, powStart: 0.62,
  angRate: 30, angRateMax: 70, powRate: 0.28, powRateMax: 0.6, rampT: 0.5,  // deg/s and power/s, faster after rampT s held
  vMin: 250, vMax: 900, barrel: 34, g: 1000, ballR: 9,
  bellyTop: 0.45, steep: 1.2, // the belly: the glass below jar.y - jar.r * bellyTop; see gc1Hit
  dmgV: 140,                 // a ball slower than this only bumps a block
  pierceV: 470, pierceK: 0.62, // a ball this fast keeps going after popping a block (once), at pierceK of its speed
  fireCool: 0.6, shoutCool: 0.8, pileGrow: 6,
  peek: 0.32, peekLucky: 0.8, luckyAfter: 3,   // s of flight the aim dots show; Lucky aim after luckyAfter misses in a row
  attackFirst: 6, attackGap: [6, 8.5],          // s before his first attack, then between attacks
  blockG: 1800, rebuildT: 2.6, swapAt: 1.3,     // the bigger wall drops in over rebuildT s; jobs swap at swapAt
  hintT: 6, loaderHint: 8, fireHint: 10, carryLift: 18, lockT: 0.4,
};
function gc1Wall(spec, floor, drop) {
  const rows = spec.rows, cols = [];
  for (let c = 0; c < rows[0].length; c++) {
    const col = { x: (spec.x + c) * T, blocks: [] };
    for (let r = rows.length - 1; r >= 0; r--) {
      const ch = rows[r][c];
      if (ch !== 'n' && ch !== 'B') continue;
      const k = col.blocks.length, hp = ch === 'B' ? 2 : 1;
      col.blocks.push({ mat: ch === 'B' ? 'stone' : 'wood', hp, maxHp: hp, y: floor - (k + 1) * T - (drop ? 260 + k * 70 + c * 40 : 0), vy: 0, hitT: 0 });
    }
    cols.push(col);
  }
  return { cols, floor };
}
const gc1Live = ph => ph.stage === 'wall1' || ph.stage === 'wall2';
const gc1Tallest = ph => Math.max(0, ...ph.wall.cols.map(c => c.blocks.length));
// what a ball of radius r at (x, y) moving (vx, vy) touches first: a wall block, the lower glass of his belly ('jar'),
// the rest of him ('boss'), the ground or the moat, or nothing (off screen = 'off'). A ball dropping in steeper than
// GC1.steep (vy / vx) bounces off his round tummy, so a high lob can't skip the wall.
function gc1Hit(st, x, y, r, vx = 1, vy = 0) {
  const ph = st.ph;
  for (const col of ph.wall.cols) {
    if (x + r <= col.x || x - r >= col.x + T) continue;
    for (const b of col.blocks) if (y + r > b.y && y - r < b.y + T) return { kind: 'block', col, b };
  }
  const P = gcBossPts(st.boss);
  if (x + r > P.body.x0 && x - r < P.body.x1) {
    const top = Math.max(P.band.y0, P.jar.y - P.jar.r * GC1.bellyTop);
    if (y >= top - r * 0.3 && y <= P.band.y1 + r * 0.3) return { kind: vy > GC1.steep * Math.abs(vx) ? 'boss' : 'jar' };
    if (y + r > P.body.y0 && y - r < st.boss.y) return { kind: 'boss' };
  }
  if (Math.hypot(x - P.head.x, y - P.head.y) < P.head.r + r || Math.abs(x - P.hat.x) < 30 * st.boss.s + r && Math.abs(y - P.hat.y) < 22 * st.boss.s + r) return { kind: 'boss' };
  if (x > W + 40 || x < -40 || y > H + 40) return { kind: 'off' };
  const ch = tile(Math.floor(x / T), Math.floor((y + r) / T));
  if (ch === 'w' && y + r > Math.floor((y + r) / T) * T + 6) return { kind: 'water' };
  if (y > 0 && (ch === '#' || tile(Math.floor((x + r) / T), Math.floor(y / T)) === '#' || tile(Math.floor((x - r) / T), Math.floor(y / T)) === '#')) return { kind: 'ground' };
  return null;
}
// where a shot at (ang, pow) goes first (for the aim dots and for bots): { kind, x, y, t, col?, b? }
function gc1Trace(st, ang, pow, maxT = 4) {
  const cn = st.ph.cn, a = ang * Math.PI / 180, v = GC1.vMin + (GC1.vMax - GC1.vMin) * pow;
  let x = cn.x + Math.cos(a) * GC1.barrel, y = cn.y - Math.sin(a) * GC1.barrel, vx = Math.cos(a) * v, vy = -Math.sin(a) * v;
  const dt = 1 / 240;
  for (let t = 0; t < maxT; t += dt) {
    vy += GC1.g * dt; x += vx * dt; y += vy * dt;
    const h = gc1Hit(st, x, y, GC1.ballR, vx, vy);
    if (h) return Object.assign(h, { x, y, t, vx, vy });
  }
  return { kind: 'off', x, y, t: maxT };
}
// each castle start and swap: a key already held then waits until it is let go, or GC1.lockT s (so a key held for
// the old job doesn't carry over); every other key works at once
function gc1Input(ph, p, dt) {
  const i = p.input;
  if (!ph.lock[p.id]) return i;
  if (ph.lock[p.id] === true) { const keys = {}; for (const k of ['left', 'right', 'jump', 'down', 'up', 'act']) if (i[k]) keys[k] = true; ph.lock[p.id] = { keys, t: GC1.lockT }; }
  const lk = ph.lock[p.id], keys = lk.keys;
  for (const k in keys) if (!i[k]) delete keys[k];
  if (!Object.keys(keys).length || (lk.t -= dt) <= 0) { ph.lock[p.id] = false; return i; }
  if (keys.jump) p.pendingJump = false;
  if (keys.act) p.pendingAct = false;
  const out = Object.assign({}, i);
  for (const k in keys) out[k] = false;
  return out;
}
function gc1Fire(st) {
  const ph = st.ph, cn = ph.cn, gn = G.players[ph.gunner], a = cn.ang * Math.PI / 180, v = GC1.vMin + (GC1.vMax - GC1.vMin) * cn.pow;
  const mx = cn.x + Math.cos(a) * GC1.barrel, my = cn.y - Math.sin(a) * GC1.barrel;
  ph.balls.push({ x: mx, y: my, vx: Math.cos(a) * v, vy: -Math.sin(a) * v, t: 0, pierced: false, touched: false, spent: 0, trail: [[mx, my]] });
  cn.powder = false; cn.ball = false; cn.cool = GC1.fireCool; cn.kick = 1; cn.idleT = 0;
  ph.shots++; st.stats.cannons.shots++; st.stats.cannons.fired[ph.gunner]++;
  for (let n = 0; n < 12; n++) G.particles.push({ x: mx, y: my, vx: Math.cos(a) * (80 + gcRand() * 160) + (gcRand() - 0.5) * 60, vy: -Math.sin(a) * (80 + gcRand() * 160) + (gcRand() - 0.5) * 60, life: 0.6, max: 0.6, col: 'rgba(240,236,228,0.9)', size: 5 + gcRand() * 5, grav: -40, kind: 'dot' });
  Sfx.play('gc1Boom', ph.gunner); rumble(ph.gunner, 0.7, 0.5, 160); rumble(ph.loader, 0.2, 0.3, 90);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.1);
  gn.sx = 1.15; gn.sy = 0.86;
}
function gc1Gunner(st, dt) {
  const ph = st.ph, cn = ph.cn, gn = G.players[ph.gunner], inp = gc1Input(ph, gn, dt);
  Object.assign(gn, { x: ph.seat.x, y: ph.seat.y, vx: 0, vy: 0, grounded: true, face: 1, jumping: false, alive: true });
  const onPad = gcPadJump(gn.id), spaceFire = !onPad && gn.id === 0 && gcKeyHeld('Space') && !gcKeyHeld('KeyW');
  const padFire = (onPad || spaceFire) && gn.pendingJump;
  gn.pendingJump = false; gn.jumpBuf = 0;
  cn.cool = Math.max(0, cn.cool - dt); cn.kick = Math.max(0, cn.kick - dt * 3); cn.clickT = Math.max(0, cn.clickT - dt); cn.readyT = Math.max(0, cn.readyT - dt);
  const up = inp.up || (inp.jump && !onPad && !spaceFire), da = (up ? 1 : 0) - (inp.down ? 1 : 0), dp = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  if (da) { cn.holdA += dt; const r = GC1.angRate + (GC1.angRateMax - GC1.angRate) * clamp((cn.holdA - GC1.rampT) / 0.5, 0, 1); cn.ang = clamp(cn.ang + da * r * dt, GC1.angMin, GC1.angMax); } else cn.holdA = 0;
  if (dp) { cn.holdP += dt; const r = GC1.powRate + (GC1.powRateMax - GC1.powRate) * clamp((cn.holdP - GC1.rampT) / 0.5, 0, 1); cn.pow = clamp(cn.pow + dp * r * dt, 0, 1); } else cn.holdP = 0;
  if (da || dp || !(cn.powder && cn.ball)) cn.idleT = 0; else cn.idleT += dt;
  if (cn.idleT > GC1.fireHint && gc1Live(ph) && !st.hints[gn.id]) gcHint(st, gn.id, 'Loaded! Fire!', 2.5);
  if (!(gn.pendingAct || padFire)) return;
  gn.pendingAct = false;
  if (!gc1Live(ph) || cn.cool > 0) return;
  if (cn.powder && cn.ball) { gc1Fire(st); return; }
  // not loaded: a dry click, and a call to the loader
  cn.clickT = 1.2; cn.kick = 0.25;
  Sfx.play('gc1Click', gn.id);
  const need = !cn.powder && !cn.ball ? 'powder and a ball' : !cn.powder ? 'powder' : 'a ball';
  gcHint(st, ph.loader, 'Hurry! Bring ' + need + '!', 2);
}
function gc1Loader(st, dt) {
  const ph = st.ph, ld = G.players[ph.loader], gn = G.players[ph.gunner];
  const real = ld.input, inp = gc1Input(ph, ld, dt);
  ld.input = inp; gn.alive = false;   // the gunner sits in the seat: the loader passes by
  try {
    control(ld, dt);
    if (ld.alive) {
      moveX(ld, ld.vx * dt, true);
      if (ld.x + ld.w > ph.fence) { ld.x = ph.fence - ld.w; ld.vx = Math.min(0, ld.vx); }
      moveY(ld, ld.vy * dt, true);
      postStep(ld);
    }
  } finally { gn.alive = true; ld.input = real; }
  if (ld.pendingAct && ld.alive) { ld.pendingAct = false; gc1LoaderAct(st, ld); }
  ph.shoutT = Math.max(0, ph.shoutT - dt); ph.shout = Math.max(0, ph.shout - dt);
  const cn = ph.cn, carrying = ph.carry.powder || ph.carry.ball;
  ph.ldIdle = gc1Live(ph) && !(cn.powder && cn.ball) && !carrying ? ph.ldIdle + dt : 0;
  if (ph.ldIdle > GC1.loaderHint && !st.hints[ld.id]) { ph.ldIdle = 0; gcHint(st, ld.id, 'Get powder and a ball!', 3); ph.arrowT = 3; }
}
function gc1LoaderAct(st, ld) {
  const ph = st.ph, cn = ph.cn, S = st.stats.cannons;
  for (const pile of ph.piles) {
    if (!rectHit(ld, pile.x, pile.y, pile.w, pile.h)) continue;
    const isKeg = pile.kind === 'powder';
    if (isKeg ? ph.carry.powder : ph.carry.ball) { gcHint(st, ld.id, isKeg ? 'One keg at a time!' : 'One ball at a time!', 1.6); return; }
    if (isKeg) ph.carry.powder = true; else ph.carry.ball = true;
    pile.pop = 1; S.fetched[ld.id]++; Sfx.play('gc1Grab', ld.id); ph.ldIdle = 0;
    return;
  }
  if (rectHit(ld, ph.hop.x, ph.hop.y, ph.hop.w, ph.hop.h)) {
    if (!ph.carry.powder && !ph.carry.ball) { gcHint(st, ld.id, 'Get powder and a ball!', 2); ph.arrowT = 2; return; }
    let put = 0;
    if (ph.carry.powder && !cn.powder) { cn.powder = true; ph.carry.powder = false; put++; ph.flash.push({ kind: 'powder', t: 0, x: ld.x + ld.w / 2, y: ld.y - GC1.carryLift }); }
    if (ph.carry.ball && !cn.ball) { cn.ball = true; ph.carry.ball = false; put++; ph.flash.push({ kind: 'ball', t: -0.08, x: ld.x + ld.w / 2, y: ld.y - GC1.carryLift - 20 }); }
    if (!put) { gcHint(st, ld.id, 'It’s loaded already!', 1.6); return; }
    S.loads[ld.id]++; Sfx.play('gc1Plonk', ld.id); rumble(ld.id, 0.1, 0.3, 60);
    if (cn.powder && cn.ball) { cn.readyT = 1.2; Sfx.play('gc1Ready'); }
    else gcHint(st, ld.id, cn.powder ? 'Now a ball!' : 'Now powder!', 1.8);
    return;
  }
  if (ph.shoutT <= 0) { ph.shoutT = GC1.shoutCool; ph.shout = 0.9; Sfx.play('gc1Shout', ld.id); rumble(ph.gunner, 0, 0.35, 80); }
}
// the claw catches the loader: whatever they carry is his now
function gc1Yoink(st, p) {
  const ph = st.ph;
  if (p.id !== ph.loader || !(ph.carry.powder || ph.carry.ball)) return null;
  const got = ph.carry.ball ? 'ball' : 'powder';
  ph.carry.powder = false; ph.carry.ball = false;
  st.stats.cannons.yoinks++;
  gcSay(st, gcRand() < 0.5 ? 'Ooh, shiny! Mine!' : 'Mine! All mine!', 1.8);
  gcHint(st, p.id, 'Hey! Get another one!', 2);
  return got;
}
function gc1Attacks(st, dt) {
  const ph = st.ph;
  if (!gc1Live(ph) || gcCalm(st) || st.claw || st.junk.length) return;
  if ((ph.attackT -= dt) > 0) return;
  const carrying = ph.carry.powder || ph.carry.ball, claw = ph.next === 'claw' && carrying;
  const ok = claw ? gcClaw(st, ph.loader, { onGrab: gc1Yoink })
    : gcToss(st, ph.loader, { kind: gcRand() < 0.5 ? 'boot' : 'teapot', minX: 24, maxX: ph.fence - 14 });
  if (ok) { ph.next = claw ? 'toss' : 'claw'; ph.attackT = GC1.attackGap[0] + gcRand() * (GC1.attackGap[1] - GC1.attackGap[0]); }
  else ph.attackT = 0.5;
}
function gc1PopBlock(st, col, b) {
  const ph = st.ph, i = col.blocks.indexOf(b);
  if (i < 0) return;
  col.blocks.splice(i, 1);
  st.stats.cannons.pops++;
  const x = col.x + T / 2, y = b.y + T / 2, colr = b.mat === 'stone' ? '#a3a9c2' : '#d9a066';
  for (let n = 0; n < 7; n++) G.particles.push({ x: col.x + gcRand() * T, y: b.y + gcRand() * T, vx: (gcRand() - 0.5) * 260, vy: -100 - gcRand() * 200, life: 0.9, max: 0.9, col: colr, size: 6 + gcRand() * 5, grav: 1200, kind: 'conf', rot: gcRand() * 6, vr: (gcRand() - 0.5) * 10 });
  puff(x, y, 5, 'rgba(255,255,255,0.7)');
  Sfx.play(b.mat === 'stone' ? 'gc1CrackStone' : 'gc1CrackWood');
  if (!ph.lowNews && gc1Tallest(ph) <= 3) { ph.lowNews = true; gcNews(st, 'The wall is low! Aim for his glass belly!'); }
  else if (gcRand() < 0.2 && !st.say) gcSay(st, gcRand() < 0.5 ? 'My lovely blocks!' : 'Hey! I stacked those!', 1.6);
}
function gc1Balls(st, dt) {
  const ph = st.ph;
  for (const ball of ph.balls) {
    ball.t += dt; ball.vy += GC1.g * dt;
    if (ball.spent > 0) {   // a ball that bounced off something just falls and fades
      ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.spent -= dt;
      if (ball.spent <= 0) { ball.dead = true; puff(ball.x, ball.y, 4, 'rgba(255,255,255,0.8)'); }
      continue;
    }
    const sp = Math.hypot(ball.vx, ball.vy), n = Math.max(1, Math.ceil(sp * dt / 4));
    for (let k = 0; k < n && !ball.dead && !(ball.spent > 0); k++) {
      ball.x += ball.vx * dt / n; ball.y += ball.vy * dt / n;
      const h = gc1Hit(st, ball.x, ball.y, GC1.ballR, ball.vx, ball.vy);
      if (h) gc1Contact(st, ball, h);
    }
    if ((G.tickN % 3) === 0) ball.trail.push([ball.x, ball.y]);
    if (!ball.dead && ball.t > 6) ball.dead = true;
  }
  for (const ball of ph.balls) if (ball.dead && !ball.ended) {
    ball.ended = true; ph.ghost = ball.trail;
    if (ball.touched) ph.missRow = 0;
    else {
      ph.missRow++; st.stats.cannons.misses++;
      if (ph.missRow >= GC1.luckyAfter && !ph.lucky && gc1Live(ph)) { ph.lucky = true; gcHelp(st, 'Lucky aim! The aim dots go further now.'); }
    }
  }
  if (ph.balls.some(b => b.dead)) ph.balls = ph.balls.filter(b => !b.dead);
}
function gc1Spend(ball) { ball.spent = 0.5; ball.vx = -Math.sign(ball.vx || 1) * 70; ball.vy = Math.min(ball.vy, -90); }
function gc1Contact(st, ball, h) {
  const ph = st.ph;
  if (h.kind === 'block') {
    const sp = Math.hypot(ball.vx, ball.vy);
    ball.touched = true;
    if (sp >= GC1.dmgV) { h.b.hp--; h.b.hitT = 0.25; }
    if (h.b.hp <= 0) {
      gc1PopBlock(st, h.col, h.b);
      if (!ball.pierced && sp >= GC1.pierceV) { ball.pierced = true; ball.vx *= GC1.pierceK; ball.vy *= GC1.pierceK; return; }
    } else Sfx.play('gc1Clonk');
    gc1Spend(ball);
  } else if (h.kind === 'jar') {
    ball.touched = true; ball.dead = true;
    if (gc1Live(ph)) gc1Belly(st, ball);
  } else if (h.kind === 'boss') {
    gc1Spend(ball);   // a bonk on his hat or tummy still counts as a miss
    st.boss.hitT = Math.max(st.boss.hitT, 0.35); Sfx.play('gcBoing');
    if (!st.say) gcSay(st, gcRand() < 0.5 ? 'Hey! Not the hat!' : 'Ha! You missed my belly!', 1.6);
  } else {
    ball.dead = true;
    if (h.kind === 'water') { Sfx.play('gc1Plop'); for (let n = 0; n < 8; n++) G.particles.push({ x: ball.x, y: ball.y, vx: (gcRand() - 0.5) * 160, vy: -120 - gcRand() * 200, life: 0.6, max: 0.6, col: 'rgba(170,220,255,0.95)', size: 3 + gcRand() * 3, grav: 900, kind: 'dot' }); }
    else if (h.kind === 'ground') { Sfx.play('gcThud'); puff(ball.x, ball.y, 6, 'rgba(255,255,255,0.8)'); }
  }
}
// CLANG: a ball reached his glass belly
function gc1Belly(st, ball) {
  const ph = st.ph, pieces = G.level.def.pieces;
  ph.hits++;
  Sfx.play('gcClang'); gcPop(st, ball.x + 20, ball.y - 30, 'CLANG!', C.gold, 34);
  rumble(0, 0.7, 0.7, 300); rumble(1, 0.7, 0.7, 300);
  gcWinPiece(st, pieces[ph.hits - 1], { say: ph.hits === 1 ? 'Ow, my hat! My crown!' : 'Not my blocks! Hmph!' });
  for (const b of ph.balls) { b.dead = true; if (b !== ball) b.ended = true; }   // (other balls still flying are not misses)
  ph.stage = ph.hits === 1 ? 'hit1' : 'done'; ph.stageT = 0;
  if (ph.hits >= 2) gcPhaseDone(st);
}
function gc1Swap(st) {
  const ph = st.ph;
  [ph.gunner, ph.loader] = [ph.loader, ph.gunner];
  const gn = G.players[ph.gunner], ld = G.players[ph.loader];
  for (const p of [gn, ld]) burst(p.x + p.w / 2, p.y + p.h / 2, 'rgba(255,255,255,0.9)', 10);
  Object.assign(gn, { x: ph.seat.x, y: ph.seat.y, vx: 0, vy: 0, face: 1, stun: 0, alive: true, sx: 0.6, sy: 1.4 });
  Object.assign(ld, { x: ph.ldSpawn.x, y: ph.ldSpawn.y, vx: 0, vy: 0, face: 1, stun: 0, alive: true, sx: 0.6, sy: 1.4, knockT: 0 });
  G.spawnPts[ph.gunner] = { ...ph.seat }; G.spawnPts[ph.loader] = { ...ph.ldSpawn };
  ph.carry = { powder: false, ball: false };
  Object.assign(ph.cn, { powder: false, ball: false, ang: GC1.angStart, pow: GC1.powStart, idleT: 0 });
  ph.missRow = 0; ph.lock = [true, true]; ph.lowNews = false; ph.ldIdle = 0;
  gcSwap(st);
  gcHint(st, ph.gunner, NAMES[ph.gunner] + ': ' + gcAimKeys(ph.gunner), GC1.hintT);
  gcHint(st, ph.loader, NAMES[ph.loader] + ': bring powder and a ball', GC1.hintT);
}
function gc1Walls(st, dt) {
  const ph = st.ph;
  for (const col of ph.wall.cols) col.blocks.forEach((b, k) => {
    if (b.hitT > 0) b.hitT -= dt;
    const want = ph.wall.floor - (k + 1) * T;
    if (b.y < want) { b.vy = Math.min(b.vy + GC1.blockG * dt, 1100); b.y = Math.min(want, b.y + b.vy * dt); if (b.y >= want) { if (b.vy > 300) Sfx.play('gcThud'); b.vy = 0; } }
    else { b.y = want; b.vy = 0; }
  });
}

GC_PHASES.cannons = {
  setup(st, L) {
    const ph = st.ph, def = L.def;
    if (!st.stats.cannons) st.stats.cannons = { shots: 0, fired: [0, 0], fetched: [0, 0], loads: [0, 0], pops: 0, misses: 0, yoinks: 0 };
    ph.gunner = def.gunner == null ? 1 : def.gunner; ph.loader = 1 - ph.gunner;
    ph.piles = []; ph.cn = null;
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      const ch = def.map[ty][tx];
      if (ch === 'Y') ph.cn = { tx, ty, x: tx * T + 30, y: (ty + 1) * T - 22, floor: (ty + 1) * T };
      else if (ch === 'p' || ch === 'i') {
        const kind = ch === 'p' ? 'powder' : 'ball', last = ph.piles.find(p => p.kind === kind && p.ty === ty && p.tx1 === tx - 1);
        if (last) last.tx1 = tx; else ph.piles.push({ kind, tx0: tx, tx1: tx, ty, pop: 0 });
      }
      if ('Ypi'.includes(ch)) L.grid[ty][tx] = '.';
    }
    if (!ph.cn) throw new Error('Castle Cannons: no cannon (Y) in the map');
    for (const p of ph.piles) { const g = GC1.pileGrow; Object.assign(p, { x: p.tx0 * T - g, y: p.ty * T - g, w: (p.tx1 - p.tx0 + 1) * T + 2 * g, h: T + 2 * g }); }
    Object.assign(ph.cn, { ang: GC1.angStart, pow: GC1.powStart, powder: false, ball: false, cool: 0, kick: 0, holdA: 0, holdP: 0, readyT: 0, clickT: 0, idleT: 0 });
    ph.hop = { x: ph.cn.x - 32, y: ph.cn.floor - 3 * T, w: 70, h: 3 * T };
    ph.fence = (def.fence || 13) * T;
    ph.seat = { ...G.spawnPts[ph.gunner] }; ph.ldSpawn = { ...G.spawnPts[ph.loader] };
    ph.carry = { powder: false, ball: false }; ph.balls = []; ph.ghost = null; ph.flash = [];
    ph.shots = 0; ph.missRow = 0; ph.lucky = false; ph.hits = 0; ph.stage = 'wall1'; ph.stageT = 0;
    ph.attackT = GC1.attackFirst; ph.next = 'toss'; ph.lock = [true, true]; ph.shoutT = 0; ph.shout = 0; ph.ldIdle = 0; ph.arrowT = 0;
    ph.lowNews = false; ph.started = false;
    ph.wall = gc1Wall(def.wall1, ph.cn.floor, false);
    const b = st.boss; b.pose = 'stand'; b.face = -1;
    Object.assign(G.players[ph.gunner], { x: ph.seat.x, y: ph.seat.y, face: 1 });
  },
  step(st, dt) {
    const ph = st.ph;
    if (!ph.started) {
      ph.started = true;
      gcSay(st, 'I took a piece of every world! Mine!', 2.5);
      gcHint(st, ph.gunner, NAMES[ph.gunner] + ': ' + gcAimKeys(ph.gunner), GC1.hintT);
      gcHint(st, ph.loader, NAMES[ph.loader] + ': bring powder and a ball', GC1.hintT);
    }
    for (const pile of ph.piles) pile.pop = Math.max(0, pile.pop - dt * 4);
    for (const f of ph.flash) f.t += dt;
    if (ph.flash.length && ph.flash.every(f => f.t >= 0.3)) ph.flash = [];
    if (ph.arrowT > 0) ph.arrowT -= dt;
    gc1Gunner(st, dt);
    gc1Loader(st, dt);
    gc1Balls(st, dt);
    gc1Walls(st, dt);
    gc1Attacks(st, dt);
    ph.stageT += dt;
    if (ph.stage === 'hit1' && st.celebT <= 0 && !st.fly.length) {
      // he stacks a bigger wall (the old blocks go poof, new ones drop in), and the jobs swap
      ph.stage = 'rebuild'; ph.stageT = 0;
      for (const col of ph.wall.cols) for (const bl of col.blocks) puff(col.x + T / 2, bl.y + T / 2, 5, 'rgba(255,255,255,0.85)');
      ph.wall = gc1Wall(G.level.def.wall2, ph.cn.floor, true);
      gcSay(st, 'Hmph! A bigger wall!', 2.2); st.boss.mood = 'grumpy'; st.boss.moodT = 2.5;
    } else if (ph.stage === 'rebuild') {
      if (!ph.swapped && ph.stageT >= GC1.swapAt) { ph.swapped = true; gc1Swap(st); }
      if (ph.stageT >= GC1.rebuildT) { ph.stage = 'wall2'; ph.stageT = 0; ph.attackT = GC1.attackFirst; }
    }
  },
  labels(st) { const ph = st.ph; return ph.gunner === 0 ? ['fire', 'load'] : ['load', 'fire']; },
  // the top-bar keys for each player's job now (the action key and word follow it)
  legend(st) {
    const L = G.level.def.legend || {}, g = st.ph.gunner;
    return Object.assign({}, L, {
      pip: g === 0 ? '<kbd>W</kbd><kbd>S</kbd> aim <kbd>A</kbd><kbd>D</kbd> power <kbd>Space</kbd> or' : '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump',
      bo: g === 1 ? '<kbd>↑</kbd><kbd>↓</kbd> aim <kbd>←</kbd><kbd>→</kbd> power' : '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump',
    });
  },
  roles(st) { const ph = st.ph; const r = []; r[ph.gunner] = 'Fire!'; r[ph.loader] = 'Load!'; return r; },
  busy(st, p) { const ph = st.ph; return p.id === ph.gunner || rectHit(p, ph.hop.x, ph.hop.y, ph.hop.w, ph.hop.h); },
  headLift(st, p) { const ph = st.ph; return p.id === ph.loader ? (ph.carry.powder && ph.carry.ball ? 44 : ph.carry.powder || ph.carry.ball ? 24 : 0) : 0; },
  hudText(st) { return 'Shots ' + st.ph.shots; },
  stat(st) { const s = st.stats.cannons; return s ? { label: 'Cannon shots', values: [s.fired[0], s.fired[1]] } : null; },
  drawBack(st) { gc1DrawBack(st); },
  draw(st) { gc1Draw(st); },
  drawTop(st) { gc1DrawTop(st); },
};
GC_PHASES.cannons.test = { GC1, trace: (ang, pow) => gc1Trace(G.mst, ang, pow), hit: (x, y, r, vx, vy) => gc1Hit(G.mst, x, y, r, vx, vy), tallest: () => gc1Tallest(G.mst.ph) };

// phase 1 sounds
Sfx.extra.gc1Boom = function () { this.tone(140, 0.32, 'sawtooth', 0.07, 50); this.tone(900, 0.06, 'square', 0.03, 300); };
Sfx.extra.gc1Click = function (p) { this.tone(1400 * p, 0.03, 'square', 0.03); this.tone(700 * p, 0.05, 'triangle', 0.03, null, 0.04); };
Sfx.extra.gc1Grab = function (p) { this.tone(500 * p, 0.06, 'triangle', 0.05, 760 * p); };
Sfx.extra.gc1Plonk = function () { this.tone(240, 0.08, 'triangle', 0.07, 130); };
Sfx.extra.gc1Ready = function () { [784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.gc1Shout = function (p) { this.tone(620 * p, 0.09, 'square', 0.04, 880 * p); this.tone(880 * p, 0.12, 'square', 0.035, 700 * p, 0.08); };
Sfx.extra.gc1CrackWood = function () { this.tone(320, 0.08, 'sawtooth', 0.05, 120); this.tone(180, 0.1, 'triangle', 0.04, 90, 0.03); };
Sfx.extra.gc1CrackStone = function () { this.tone(200, 0.12, 'square', 0.04, 70); this.tone(1100, 0.05, 'triangle', 0.03, 600, 0.02); };
Sfx.extra.gc1Clonk = function () { this.tone(520, 0.06, 'square', 0.04, 300); };
Sfx.extra.gc1Plop = function () { this.tone(600, 0.1, 'sine', 0.05, 200); };

/* --- phase 1 drawing --- */
function gc1DrawBack(st) {
  // a castle behind him: two towers with flags, in the room's stone colours
  const x0 = 640, base = st.ph.wall.floor, wall = '#8f88a8';
  ctx.fillStyle = wall;
  ctx.fillRect(x0, base - 250, 300, 250);
  for (const tx of [x0 - 10, x0 + 250]) {
    ctx.fillRect(tx, base - 330, 60, 330);
    for (let k = 0; k < 3; k++) ctx.fillRect(tx + k * 22, base - 346, 14, 16);
    ctx.fillStyle = '#e9e4f5'; ctx.fillRect(tx + 28, base - 380, 3, 34);
    ctx.fillStyle = (tx < x0 ? C.pip : C.bo); ctx.beginPath(); ctx.moveTo(tx + 31, base - 380); ctx.lineTo(tx + 54, base - 372 + Math.sin(G.clock * 5 + tx) * 2); ctx.lineTo(tx + 31, base - 364); ctx.closePath(); ctx.fill();
    ctx.fillStyle = wall;
  }
  for (let k = 0; k < 7; k++) ctx.fillRect(x0 + 10 + k * 42, base - 266, 22, 16);
  ctx.fillStyle = 'rgba(28,26,54,0.35)'; for (const wx of [x0 + 20, x0 + 270]) { rr(wx, base - 300, 16, 30, 8); ctx.fill(); }
}
function gc1DrawBlock(col, b) {
  const sh = b.hitT > 0 ? Math.sin(b.hitT * 80) * 2 : 0, x = col.x + sh, y = b.y;
  ctx.fillStyle = b.mat === 'stone' ? '#a3a9c2' : '#d9a066'; ctx.fillRect(x, y, T, T);
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x, y, T, 3);
  ctx.fillStyle = 'rgba(28,26,54,0.22)'; ctx.fillRect(x, y + T - 3, T, 3);
  ctx.strokeStyle = 'rgba(28,26,54,0.25)'; ctx.lineWidth = 1; ctx.beginPath();
  if (b.mat === 'stone') { ctx.moveTo(x, y + 15); ctx.lineTo(x + T, y + 15); ctx.moveTo(x + 10, y); ctx.lineTo(x + 10, y + 15); ctx.moveTo(x + 21, y + 15); ctx.lineTo(x + 21, y + T); }
  else for (let k = 1; k < 3; k++) { ctx.moveTo(x + 4, y + T * k / 3); ctx.lineTo(x + T - 4, y + T * k / 3 + 1); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(28,26,54,0.6)'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.75, y + 0.75, T - 1.5, T - 1.5);
  if (b.hp < b.maxHp) { ctx.strokeStyle = 'rgba(28,26,54,0.75)'; ctx.beginPath(); ctx.moveTo(x + 9, y); ctx.lineTo(x + 14, y + 12); ctx.lineTo(x + 9, y + 21); ctx.moveTo(x + 14, y + 12); ctx.lineTo(x + 23, y + 16); ctx.stroke(); }
}
function gc1Draw(st) {
  const ph = st.ph, cn = ph.cn, big = hudBig();
  // the piles and their names
  for (const p of ph.piles) {
    const x = p.tx0 * T, w = (p.tx1 - p.tx0 + 1) * T, y = (p.ty + 1) * T, s = 1 + p.pop * 0.15;
    const spots = p.kind === 'powder' ? [[12, -9], [w - 12, -9], [w / 2, -27]] : [[10, -9], [w / 2, -9], [w - 10, -9], [w / 2 - 10, -24], [w / 2 + 10, -24], [w / 2, -39]];
    for (const [dx, dy] of spots) gcDrawItem(p.kind, x + dx, y + dy, (p.kind === 'powder' ? 1.05 : 1) * s);
    text(p.kind === 'powder' ? 'Powder' : 'Balls', x + w / 2, y - (p.kind === 'powder' ? 46 : 58), big ? 16 : 11, 'rgba(28,26,54,0.7)', 'center', 'body');
  }
  // the fence post at the end of the yard
  ctx.fillStyle = '#8a5833'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; rr(ph.fence - 6, cn.floor - 26, 5, 26, 2); ctx.fill(); ctx.stroke();
  // the cannon
  const x = cn.x, y = cn.y, a = cn.ang * Math.PI / 180, kick = cn.kick * 6;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-a); ctx.translate(-kick, 0);
  ctx.fillStyle = '#3c4260'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  rr(-16, -9, GC1.barrel + 16, 18, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2a2f4f'; rr(GC1.barrel - 6, -11, 9, 22, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; rr(-12, -7, GC1.barrel + 6, 4, 2); ctx.fill();
  ctx.fillStyle = C.gold; ctx.fillRect(4, -9, 3, 18);
  ctx.restore();
  ctx.fillStyle = '#8a5833'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 22, cn.floor - 6); ctx.lineTo(x - 6, y - 6); ctx.lineTo(x + 8, y - 2); ctx.lineTo(x + 18, cn.floor - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (const wx of [x - 12, x + 10]) { ctx.fillStyle = '#c98b5a'; circle(wx, cn.floor - 9, 9); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.ink; circle(wx, cn.floor - 9, 2.5); ctx.fill(); }
  // the hopper funnel, and two lights: powder in, ball in
  const hx = x + 2, hy = y - 16;
  ctx.fillStyle = cn.readyT > 0 ? C.gold : '#c98b5a';
  ctx.beginPath(); ctx.moveTo(hx - 14, hy - 14); ctx.lineTo(hx + 14, hy - 14); ctx.lineTo(hx + 5, hy); ctx.lineTo(hx - 5, hy); ctx.closePath(); ctx.fill(); ctx.stroke();
  [cn.powder, cn.ball].forEach((lit, k) => { ctx.fillStyle = lit ? C.gold : 'rgba(28,26,54,0.3)'; circle(hx - 7 + k * 14, hy - 23, 4.5); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.stroke(); });
  // the wall (in front of him)
  for (const col of ph.wall.cols) for (const b of col.blocks) gc1DrawBlock(col, b);
}
function gc1DrawTop(st) {
  const ph = st.ph, cn = ph.cn, ld = G.players[ph.loader], gn = G.players[ph.gunner], big = hudBig(), z = big ? 1.5 : 1, zt = big ? 1.25 : 1;
  const live = gc1Live(ph) && G.introT <= GC.introHold + 0.4;
  if (ph.ghost && live) { ctx.fillStyle = PCOL[ph.gunner]; ctx.globalAlpha = 0.28; for (let i = 0; i < ph.ghost.length; i += 2) { circle(ph.ghost[i][0], ph.ghost[i][1], 2.2 * z); ctx.fill(); } ctx.globalAlpha = 1; }
  if (live) {
    // aim dots: the first part of the flight (more of it with Lucky aim), and an x where it would hit
    const a = cn.ang * Math.PI / 180, v = GC1.vMin + (GC1.vMax - GC1.vMin) * cn.pow;
    const x0 = cn.x + Math.cos(a) * GC1.barrel, y0 = cn.y - Math.sin(a) * GC1.barrel, vx = Math.cos(a) * v, vy0 = -Math.sin(a) * v;
    const peek = ph.lucky ? GC1.peekLucky : GC1.peek, dtd = 0.03, n = Math.round(peek / dtd), loaded = cn.powder && cn.ball;
    const end = gc1Trace(st, cn.ang, cn.pow, peek + 0.01);
    ctx.fillStyle = ph.lucky ? C.gold : '#ffffff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
    for (let i = 1; i <= n; i++) {
      const t = i * dtd;
      if (t >= end.t) break;
      ctx.globalAlpha = (loaded ? 0.95 : 0.5) * (1 - i / (n + 3));
      circle(x0 + vx * t, y0 + vy0 * t + 0.5 * GC1.g * t * t, 3 * z); ctx.fill(); ctx.stroke();
    }
    if (end.t <= peek && end.kind !== 'off') {
      ctx.globalAlpha = 0.9; ctx.lineCap = 'round'; const k = 6 * z, px = end.x, py = end.y;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 5 * z; ctx.beginPath(); ctx.moveTo(px - k, py - k); ctx.lineTo(px + k, py + k); ctx.moveTo(px + k, py - k); ctx.lineTo(px - k, py + k); ctx.stroke();
      ctx.strokeStyle = end.kind === 'jar' ? C.gold : '#ffffff'; ctx.lineWidth = 2.5 * z; ctx.stroke(); ctx.lineCap = 'butt';
    }
    ctx.globalAlpha = 1;
    // power meter beside the gunner
    const mw = 8 * z, mh = 38 * z, mx = gn.x - 8 - mw, my = gn.y + gn.h - 4 - mh;
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(mx - 3, my - 3, mw + 6, mh + 6, 5); ctx.fill();
    const f = cn.pow;
    ctx.fillStyle = f < 0.5 ? C.grass : f < 0.85 ? C.gold : '#ff6b6b'; rr(mx, my + mh * (1 - f), mw, Math.max(3, mh * f), 3); ctx.fill();
  }
  // balls in flight (an arrow at the top while one is above the screen)
  for (const ball of ph.balls) {
    if (ball.y < -GC1.ballR) { ctx.fillStyle = C.paper; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ball.x, 4); ctx.lineTo(ball.x - 7, 16); ctx.lineTo(ball.x + 7, 16); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { ctx.globalAlpha = ball.spent > 0 ? clamp(ball.spent / 0.5, 0, 1) : 1; gcDrawItem('ball', ball.x, ball.y); ctx.globalAlpha = 1; }
  }
  // what the loader carries, and things dropping into the funnel
  if (ld.alive && (ph.carry.powder || ph.carry.ball)) {
    const bob = Math.abs(ld.vx) > 20 && ld.grounded ? Math.sin(G.clock * 14) * 1.5 : 0, hx = ld.x + ld.w / 2, hy = ld.y - GC1.carryLift + bob;
    if (ph.carry.powder) gcDrawItem('powder', hx, hy);
    if (ph.carry.ball) gcDrawItem('ball', hx, ph.carry.powder ? hy - 19 : hy);
  }
  for (const fl of ph.flash) { if (fl.t < 0) continue; const k = Math.min(1, fl.t / 0.3); gcDrawItem(fl.kind, fl.x + (cn.x - fl.x) * k, fl.y + (cn.y - 30 - fl.y) * k, 1 - 0.4 * k); }
  // a bouncing arrow at the pile the loader needs (after a nudge)
  if (ph.arrowT > 0 && live) {
    const need = !cn.powder && !ph.carry.powder ? 'powder' : 'ball', pile = ph.piles.find(p => p.kind === need) || ph.piles[0];
    if (pile) {
      const ax = (pile.tx0 + pile.tx1 + 1) * T / 2, ay = pile.ty * T - (pile.kind === 'powder' ? 36 : 50) - (big ? 18 : 10) - (1 + Math.sin(G.clock * 7)) * 3;
      ctx.fillStyle = PCOL[ph.loader]; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax - 10 * z, ay - 13 * z); ctx.lineTo(ax + 10 * z, ay - 13 * z); ctx.lineTo(ax, ay); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  if (ph.shout > 0 && ld.alive) bigText('FIRE!', ld.x + ld.w / 2, ld.y - 42 - gcHeadLift(st, ld), 22 * zt, PCOL[ph.loader], 1 + 0.2 * Math.sin(ph.shout * 12));
  if (cn.readyT > 0) bigText('READY!', cn.x, cn.y - 62, 20 * zt, C.gold, 1);
  else if (cn.clickT > 0) bigText('Click!', cn.x + 14, cn.y - 56, 16 * zt, C.paper, 1);
}
/* ===== END GC PHASE 1 ===== */

/* ===== GC PHASE 2: REELS ===== */
/* Jackpot Reels (Lucky Casino look, borrows 8-3 Slot Machine Run). He hovers over the far ledge with a big red button
   on his top hat, and four giant slot reels stand like stairs up to him.
   Stopper: walks the button deck under the reels; the action (or jump) under a reel stops it. The picture on the
   payline is the step: BAR a step, 7 a tall step, cherry a trampoline, lemon nothing. Some reels need one picture.
   Runner: hops up the stopped reels. The top reel's cherry springs them in an arc onto his hat. The button there
   sits under a glass dome: the first bop pops the dome and the jobs swap (the lower stopped reels stay, so the new
   runner's climb needs only the top cherry), the second bop presses the button = a piece (8, then 3). Then he flies
   to the other side, the reels slide into stairs the other way, and it all happens
   again (no swap at the fly-over, so each player stops twice, runs twice and wins one piece).
   The runner's action shouts "STOP!" (a cue). A drop into the tray is a "Gulp!": back to the start ledge.
   Only the runner can bop, and only the stopper's presses stop reels (stopped reels spin again if the stopper leaves
   the deck), so nobody wins it alone. He tosses foam dice and rubber ducks at the runner (shadows first, softer
   bonks that keep you on your reel, never mid-launch). Gold help: Lucky slow-mo after 3 sour stops in a row, Lucky
   magnet after 6, Lucky hold after 2 gulps (when the reels have a hold timer).
   Map chars: r = a reel's first column, on the panel row (it turns back into '#'). The spawn above the panel is the
   runner's start, the one below it the stopper's (side 2 mirrors both). Room def: stopper (who stops first),
   reels { speed: [hit 1, hit 2], holdT: [hit 1, hit 2] (s a stop lasts; null = no timer), stairs: [{ row (window
   top tile row), strip, need, speedK, dir: [hit 1, hit 2] (-1 spins up) }] in climbing order }. Stats in st.stats.reels. */
const GC2 = {
  s: 0.75, lift: 4, edgeIn: 25,     // his size here, how far he hovers over his ledge, and how far in from the edge
  cellH: 60, panelY: 390,           // a picture's height; the top of the button panel (a runner who drops to it is gulped)
  grace: 0.1, settleT: 0.15, spinUp: 0.25, sourT: 1.4, leaveGrace: 0.5, catchGrace: 20, zonePad: 15,
  syms: { B: { top: 30 }, '7': { top: 0 }, C: { top: 34, bounce: true }, L: { top: null } },
  keepLow: 3,                       // after a dome pop the lowest good stops stay (only the top cherry spins again)
  launchApex: 40, bopW: 34, bopVy: 480, gulpT: 0.7, shoutCD: 0.8, whirr: 3.5, dome: 14, popT: 1.1,   // dome: px it adds on top
  slowAfter: 3, slowX: 0.6, magnetAfter: 6, holdAfter: 2,       // gold help: sour stops in a row / gulps in one hit
  attackFirst: 6, attackGap: [8, 11], tossIdle: 5, // s; no tosses at a runner who stood still tossIdle s
  softKnock: 0.2,                   // a bonk's sideways push is cut to this much (you stay on your reel)
  waitArrow: [1.2, 2.5], waitHint: 4.5, hopHint: 4, farHint: 1.5, hintT: 6,
  crossT: 2, slideAt: 0.35, slideT: 1.2,                         // the fly to the other side; the reels slide meanwhile
};
const gc2Sym = (r, k) => r.strip[((k % r.n) + r.n) % r.n];
const gc2Good = (r, ch) => (r.need ? ch === r.need : ch !== 'L');
const gc2Live = ph => ph.stage === 'live';
// a stopped reel's step: { top, bounce, ch }, or null (spinning, or a picture it can't use)
function gc2Plat(r) {
  if (!r || (r.state !== 'stop' && r.state !== 'settle')) return null;
  const ch = gc2Sym(r, r.target);
  if (!gc2Good(r, ch)) return null;
  const S = GC2.syms[ch];
  return { top: r.wy + GC2.cellH + S.top, bounce: !!S.bounce, ch };
}
// the top centre of his hat (the red button sits on it), with his hover bob and the hop a hit gives the hat
function gc2Hat(b) {
  const o = gcBossOff(b), hop = b.hitT > 0 ? Math.sin((0.9 - b.hitT) / 0.9 * Math.PI) * 22 : 0;
  return { x: b.x - 9.8 * b.s * b.face, y: b.y + (o - 308 - hop) * b.s };
}
// the reel the stopper stands under (-1 if none)
function gc2Zone(st, p) {
  if (!p.alive || p.y < GC2.panelY) return -1;
  const cx = p.x + p.w / 2;
  for (const r of st.ph.reels) if (cx >= r.x0 - GC2.zonePad && cx < r.x1 + GC2.zonePad) return r.i;
  return -1;
}
// the runner stands on this reel or is in the air just over it
function gc2Over(st, r) {
  const p = G.players[st.ph.runner];
  if (!p.alive) return false;
  const cx = p.x + p.w / 2;
  return cx >= r.x0 - 6 && cx <= r.x1 + 6 && p.y + p.h <= r.wy + GC2.cellH + 40;
}
// side 0: stairs climb left to right up to him on the right; side 1: the other way. slide: the reels move there.
function gc2Side(st, side, slide) {
  const ph = st.ph, cfg = ph.cfg, n = ph.reels.length;
  ph.side = side; ph.order = ph.reels.map((r, k) => (side ? n - 1 - k : k));
  ph.holdT = cfg.holdT[ph.hit] == null ? null : cfg.holdT[ph.hit];
  ph.order.forEach((ri, k) => {
    const r = ph.reels[ri], s = cfg.stairs[k] || {};
    r.stair = k; r.need = s.need || null; r.strip = (s.strip || 'B7BL').split(''); r.n = r.strip.length;
    r.speed = (cfg.speed[ph.hit] || 1.4) * (s.speedK || 1); r.dir = (s.dir && s.dir[ph.hit]) || 1;
    r.wyFrom = r.wy == null ? (s.row || 6) * T : r.wy; r.wyTo = (s.row || 6) * T;
    if (!slide || r.wy == null) r.wy = r.wyTo;
    r.state = 'spin'; r.ramp = 1; r.pos = gcRand() * r.n; r.holdLeft = 0; r.badT = 0;
  });
}
function gc2Respin(r) { r.state = 'spin'; r.ramp = 0; r.pos = r.target; Sfx.play('gc2Respin'); }
function gc2Stop(st, r, by) {
  const ph = st.ph, S = st.stats.reels, cx = (r.x0 + r.x1) / 2;
  let k = Math.round(r.pos - GC2.grace * r.dir);
  if (ph.magnet && !gc2Good(r, gc2Sym(r, k)))      // Lucky magnet: the nearest good picture (the one just passed first)
    for (let d = 1, done = false; d <= r.n >> 1 && !done; d++) for (const j of [k - r.dir * d, k + r.dir * d]) if (gc2Good(r, gc2Sym(r, j))) { k = j; done = true; break; }
  r.state = 'settle'; r.from = r.pos; r.target = k; r.t = 0;
  const ch = gc2Sym(r, k);
  Sfx.play('gc2Stop'); rumble(by, 0.15, 0.3, 60);
  if (gc2Good(r, ch)) {
    S.stops[by]++; ph.missRow = 0; r.flash = 0.4;
    r.holdLeft = ph.holdT == null ? Infinity : ph.holdT;
    Sfx.play('gc2Ding');
    // a stop a moment too late still catches a runner falling past this reel's picture
    const p = G.players[ph.runner], top = r.wy + GC2.cellH + GC2.syms[ch].top, pcx = p.x + p.w / 2, feet = p.y + p.h;
    if (p.alive && !p.grounded && p.vy > 0 && pcx >= r.x0 && pcx <= r.x1 && feet > top + 2 && feet <= top + GC2.catchGrace) {
      moveY(p, top - p.h - p.y, true);
      if (Math.abs(p.y + p.h - top) < 0.5) ph.P[p.id].prevFeet = top;
    }
  } else {
    S.sour[by]++; ph.missRow++; r.badT = GC2.sourT;
    Sfx.play('gc2Sour');
    gcPop(st, cx, r.wy - 6, ch === 'L' ? 'Sour!' : r.need === 'C' ? 'Need a cherry!' : 'Need a 7!', '#ffe36b', 18);
    if (ph.missRow >= GC2.slowAfter && ph.slow === 1) { ph.slow = GC2.slowX; gcHelp(st, 'Lucky slow-mo! The reels spin slower now.'); }
    if (ph.missRow >= GC2.magnetAfter && !ph.magnet) { ph.magnet = true; gcHelp(st, 'Lucky magnet! Your stops snap to a good picture.'); }
  }
}
// the stopper pressed: stop the reel overhead (a sour one spins again at once; a good one gets its hold back)
function gc2Press(st, s) {
  const ph = st.ph;
  if (!gc2Live(ph)) return;
  const z = gc2Zone(st, s);
  if (z < 0) { gc2Where(st, s); return; }
  const r = ph.reels[z];
  if (r.state === 'spin') gc2Stop(st, r, s.id);
  else if (r.state === 'stop') {
    if (gc2Plat(r)) { r.holdLeft = ph.holdT == null ? Infinity : ph.holdT; r.holdFlash = 0.3; Sfx.play('gc2Hold'); }
    else gc2Respin(r);
  }
}
// "Stand under a reel!" with an arrow to the reel the runner waits for (else the nearest), and its light blinks
function gc2Where(st, s) {
  const ph = st.ph, cx = s.x + s.w / 2;
  let near = ph.arrowR;
  if (!near) for (const r of ph.reels) if (!near || Math.abs((r.x0 + r.x1) / 2 - cx) < Math.abs((near.x0 + near.x1) / 2 - cx)) near = r;
  if (!near) return;
  gcHint(st, s.id, (near.x0 + near.x1) / 2 < cx ? '◀ Stand under a reel!' : 'Stand under a reel! ▶', 1.6);
  near.beamT = 1.3;
}
// where the runner stands: a reel's stair number, -1 on the start ledge, 9 on his ledge, null in the air
function gc2At(st, p) {
  const ph = st.ph, P = ph.P[p.id];
  if (!p.alive || !p.grounded) return null;
  if (P.on) return P.on.stair;
  const feet = p.y + p.h, near = (lg) => Math.abs(feet - lg.y) < 2 && p.x + p.w >= lg.x0 && p.x <= lg.x1;   // (any part of you: the very lip counts)
  if (near(ph.ledges[ph.side])) return -1;
  if (near(ph.ledges[1 - ph.side])) return 9;
  return null;
}
// a surface the runner stands on, for a toss: { x0, x1, y } (null in the air or mid-launch)
function gc2Spot(st, p) {
  const ph = st.ph, P = ph.P[p.id], at = gc2At(st, p);
  if (at == null || P.launch) return null;
  if (P.on) { const pl = gc2Plat(P.on); return pl ? { x0: P.on.x0 + 14, x1: P.on.x1 - 14, y: pl.top } : null; }
  const lg = ph.ledges[at === -1 ? ph.side : 1 - ph.side];
  return { x0: lg.x0 + 14, x1: lg.x1 - 14, y: lg.y };
}
function gc2Reels(st, dt, live) {
  const ph = st.ph, fast = ph.stage !== 'live' ? GC2.whirr : 1;
  for (const r of ph.reels) {
    r.flash = Math.max(0, r.flash - dt); r.holdFlash = Math.max(0, r.holdFlash - dt); r.beamT = Math.max(0, r.beamT - dt);
    if (r.state === 'spin') {
      r.ramp = Math.min(1, r.ramp + dt / GC2.spinUp);
      r.pos += r.dir * r.speed * ph.slow * fast * r.ramp * dt;
      if (Math.abs(r.pos) > 1e4) r.pos = ((r.pos % r.n) + r.n) % r.n;
    } else if (r.state === 'settle') {
      r.t += dt;
      const u = Math.min(1, r.t / GC2.settleT), e = 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2);   // ease out, a small overshoot
      r.pos = r.from + (r.target - r.from) * e;
      if (u >= 1) { r.pos = r.target; r.state = 'stop'; }
    }
    if (!live || r.state === 'spin') continue;
    if (!gc2Plat(r)) { r.badT -= dt; if (r.badT <= 0 && r.state === 'stop') gc2Respin(r); continue; }
    if (ph.holdT == null || ph.luckyHold || st.idle) continue;
    if (gc2Over(st, r)) r.holdLeft = Math.max(r.holdLeft, GC2.leaveGrace); else r.holdLeft -= dt;
    if (r.holdLeft <= 0 && r.state === 'stop') gc2Respin(r);
  }
}
// stopped reels are one-way steps the mode owns: land on them from above, never bump them from below or the side
function gc2Resolve(st) {
  const ph = st.ph;
  for (const p of G.players) {
    const P = ph.P[p.id];
    if (!p.alive) { P.on = null; continue; }
    const feet = p.y + p.h;
    let best = null;
    if (p.vy >= -1) for (const r of ph.reels) {
      const pl = gc2Plat(r);
      if (!pl || !(p.x + 4 < r.x1 && p.x + p.w - 4 > r.x0)) continue;
      const sticky = P.on === r;
      if (P.prevFeet > pl.top + (sticky ? 6 : 2)) continue;
      if (feet < pl.top - (sticky ? 7 : 0.5)) continue;
      if (!best || pl.top < best.pl.top) best = { r, pl };
    }
    if (!best) { P.on = null; continue; }
    moveY(p, best.pl.top - p.h - p.y, true);
    if (Math.abs(p.y + p.h - best.pl.top) > 1) { P.on = null; continue; }
    if (best.pl.bounce) { P.on = null; gc2Boing(st, p, best.r, best.pl.top); continue; }
    const landed = P.on !== best.r;
    p.vy = 0; p.grounded = true; p.tileGround = true; p.onOneWay = false; p.onPartner = false; p.jumping = false; p.coyote = PHYS.coyote;
    P.on = best.r;
    if (landed) {
      P.launch = null;
      if (P.prevVy > 260) { p.sx = 1.25; p.sy = 0.78; puff(p.x + p.w / 2, best.pl.top, 5, 'rgba(255,255,255,0.75)'); Sfx.play('land'); }
    }
  }
}
// a cherry: on the top reel it springs the runner in an arc onto his hat; anywhere else it is a plain bounce
function gc2Boing(st, p, r, top) {
  const ph = st.ph, P = ph.P[p.id];
  p.grounded = false; p.jumping = false; p.coyote = 0; p.jumpBuf = 0; p.sx = 0.75; p.sy = 1.3;
  Sfx.play('gc2Boing', p.id); puff(p.x + p.w / 2, top, 6, 'rgba(255,90,110,0.85)'); rumble(p.id, 0, 0.35, 70);
  if (!(gc2Live(ph) && p.id === ph.runner && r.stair === ph.reels.length - 1)) { p.vy = -900; return; }
  const H = gc2Hat(st.boss), g = PHYS.g, yt = gc2BopY(st), ya = yt - GC2.launchApex;
  const vy = Math.sqrt(2 * g * Math.max(40, top - ya)), tt = vy / g + Math.sqrt(2 * (yt - ya) / g);
  const vx = (H.x - (p.x + p.w / 2)) / tt;
  p.vy = -vy; p.vx = vx; p.carryVx = vx;
  P.launch = { vx, t: 0 };
  st.stats.reels.launches++;
  if (!st.say || st.say.t > 0.8) gcSay(st, gcRand() < 0.5 ? 'Eek! Not my hat!' : 'Hey! Get down!', 1.4);
}
// where a bop lands: the top of the dome while it is on, else the top of the button
const gc2BopY = st => gc2Hat(st.boss).y - 8 - (st.ph.dome ? GC2.dome : 0);
// BOP: the runner came down on his hat. With the dome on it pops (and the jobs swap); without, it is a piece.
function gc2Bop(st, p, top) {
  const ph = st.ph, pieces = G.level.def.pieces || [8, 3], H = gc2Hat(st.boss), dome = ph.dome;
  Object.assign(p, { y: top - p.h, vy: -GC2.bopVy, vx: 0, carryVx: 0, jumping: false, grounded: false, sx: 1.3, sy: 0.75 });
  ph.P[p.id].launch = null; ph.bopT = 0.5; ph.bops++;
  // the reels whirr off again; after a dome pop the lower good steps stay, so the swapped climb needs one new stop
  for (const r of ph.reels) if (r.state !== 'spin' && !(dome && r.stair < GC2.keepLow && gc2Plat(r))) gc2Respin(r);
  rumble(0, 0.6, 0.6, 260); rumble(1, 0.6, 0.6, 260);
  ph.stageT = 0;
  if (dome) {
    ph.dome = false; ph.stage = 'pop'; st.stats.reels.pops[p.id]++;
    gcPop(st, H.x, top - 34, 'POP!', '#bfe9ff', 36);
    for (let n = 0; n < 14; n++) G.particles.push({ x: H.x + (gcRand() - 0.5) * 24, y: H.y - 12, vx: (gcRand() - 0.5) * 320, vy: -120 - gcRand() * 240, life: 0.8, max: 0.8, col: n % 2 ? 'rgba(205,236,255,0.95)' : '#ffffff', size: 4 + gcRand() * 3, grav: 900, kind: 'conf', rot: gcRand() * 6, vr: (gcRand() - 0.5) * 12 });
    Sfx.play('gc2Pop');
    gcCancelAttacks(st);
    gcBossHit(st, ph.hit === 0 ? 'Hey! My shiny dome!' : 'Not my dome again!');
    gcNews(st, 'The dome is off! Now bop the button!');
    return;
  }
  st.stats.reels.bops[p.id]++;
  gcPop(st, H.x, top - 34, 'BOP!', C.gold, 36);
  Sfx.play('gc2Bop');
  gcWinPiece(st, pieces[ph.hit], { say: ph.hit === 0 ? 'Ow, my hat! My cherry!' : 'Not my golf flag! Hmph!' });
  ph.stage = ph.hit === 0 ? 'bop' : 'done';
  if (ph.stage === 'done') gcPhaseDone(st);
}
function gc2Gulp(st, p) {
  const ph = st.ph, x = p.x + p.w / 2;
  p.alive = false; p.respawnT = GC2.gulpT; p.pendingJump = false;
  G.spawnPts[p.id] = { ...ph.start[ph.side] };
  ph.P[p.id].launch = null; ph.gulpsHit++;
  st.stats.reels.gulps[p.id]++;
  for (let n = 0; n < 10; n++) G.particles.push({ x, y: GC2.panelY, vx: (gcRand() - 0.5) * 200, vy: -100 - gcRand() * 200, life: 0.6, max: 0.6, col: n % 3 ? C.gold : PCOL[p.id], size: 4, grav: 700, kind: 'dot' });
  Sfx.play('gc2Gulp', p.id); rumble(p.id, 0.35, 0.3, 120);
  gcPop(st, x, GC2.panelY - 20, 'Gulp!', '#ffffff', 22);
  // the machine waits for you: every good stopped reel gets a full hold again
  for (const r of ph.reels) if (r.state === 'stop' && gc2Plat(r) && ph.holdT != null) r.holdLeft = Math.max(r.holdLeft, ph.holdT);
  if (ph.gulpsHit >= GC2.holdAfter && ph.holdT != null && !ph.luckyHold && gc2Live(ph)) { ph.luckyHold = true; gcHelp(st, 'Lucky hold! Stopped reels wait for you now.'); }
}
// the jobs swap (after a dome pop): poof, the new runner on the start ledge, the new stopper on the deck
function gc2Swap(st) {
  const ph = st.ph;
  [ph.stopper, ph.runner] = [ph.runner, ph.stopper];
  const s = G.players[ph.stopper], rn = G.players[ph.runner];
  for (const [p, spot] of [[s, ph.deck[ph.side]], [rn, ph.start[ph.side]]]) {
    if (p.alive) burst(p.x + p.w / 2, p.y + p.h / 2, 'rgba(255,255,255,0.9)', 10);
    Object.assign(p, { x: spot.x, y: spot.y, vx: 0, vy: 0, carryVx: 0, stun: 0, knockT: 0, alive: true, respawnT: 0, grounded: false, jumping: false, jumpBuf: 0, sx: 0.6, sy: 1.4 });
    p.pendingJump = false; p.pendingAct = false; p.face = ph.side ? -1 : 1;
    G.spawnPts[p.id] = { ...spot };
    Object.assign(ph.P[p.id], { prevFeet: p.y + p.h, on: null, launch: null });
    burst(p.x + p.w / 2, p.y + p.h / 2, 'rgba(255,255,255,0.9)', 10);
  }
  ph.missRow = 0; ph.slow = 1; ph.magnet = false; ph.gulpsHit = 0; ph.luckyHold = false; ph.waitT = 0; ph.hopT = 0; ph.farT = 0;
  for (const r of ph.reels) if (r.state !== 'spin') r.holdLeft = ph.holdT == null ? Infinity : ph.holdT;   // the steps that stayed wait for the new runner
  gcSwap(st);
  gcHint(st, ph.stopper, NAMES[ph.stopper] + ': ' + gc2StopKeys(ph.stopper), GC2.hintT);
  gcHint(st, ph.runner, NAMES[ph.runner] + ': hop up to his hat!', GC2.hintT);
}
function gc2StopKeys(id) {
  const k = actKey(id);
  return k === 'pad' ? 'under a reel, ' + glyph('a') + ' or ' + glyph('act') + ' stops it' : k === 'touch' ? 'under a reel, tap stop' : 'under a reel, ' + (id === 0 ? 'F' : '/') + ' stops it';
}
// tosses go only at a runner on a reel who is playing (the start ledge is a safe spot, and so is standing still a while)
function gc2Attacks(st, dt) {
  const ph = st.ph, ri = G.players[ph.runner].input;
  ph.rnIdle = ri.left || ri.right || ri.jump || ri.down || ri.up || ri.act ? 0 : ph.rnIdle + dt;
  if (!gc2Live(ph) || gcCalm(st) || st.junk.length) return;
  if ((ph.attackT -= dt) > 0) return;
  const rn = G.players[ph.runner], spot = ph.P[rn.id].on && ph.rnIdle < GC2.tossIdle ? gc2Spot(st, rn) : null;
  const j = spot && gcToss(st, rn.id, { kind: ph.next, x: clamp(rn.x + rn.w / 2 + rn.vx * GC.toss.lead, spot.x0, spot.x1), y: spot.y });
  if (!j) { ph.attackT = 0.5; return; }
  ph.next = ph.next === 'dice' ? 'duck' : 'dice';
  ph.attackT = GC2.attackGap[0] + gcRand() * (GC2.attackGap[1] - GC2.attackGap[0]);
  if (!st.say && gcRand() < 0.5) gcSay(st, j.kind === 'duck' ? 'Quack! Catch!' : 'Catch!', 1.4);
}
// nudges: the stopper's arrow and hint when the runner waits for the next reel, "Hop up!", and the way back
function gc2Nudges(st, dt) {
  const ph = st.ph, rn = G.players[ph.runner], at = gc2At(st, rn), n = ph.reels.length;
  const next = at != null && at < n - 1 ? ph.reels[ph.order[at + 1]] : null;
  const live = gc2Live(ph) && rn.alive && !st.idle;
  if (live && next && !gc2Plat(next)) ph.waitT += dt; else ph.waitT = 0;
  ph.arrowR = ph.waitT > GC2.waitArrow[st.stats.reels.stops[ph.stopper] === 0 ? 0 : 1] ? next : null;
  if (ph.arrowR && ph.waitT > GC2.waitHint && !ph.waitSaid) {
    ph.waitSaid = true;
    const s = G.players[ph.stopper], dx = (next.x0 + next.x1) / 2 - (s.x + s.w / 2);
    gcHint(st, ph.stopper, Math.abs(dx) < 50 ? 'Stop this reel!' : dx < 0 ? '◀ Stop the next reel!' : 'Stop the next reel! ▶', 2.5);
  }
  if (!ph.waitT) ph.waitSaid = false;
  if (live && next && gc2Plat(next) && rn.grounded && Math.abs(rn.vx) < 5) ph.hopT += dt; else ph.hopT = 0;
  if (ph.hopT > GC2.hopHint) { ph.hopT = 0; gcHint(st, rn.id, ph.side ? '◀ Hop up!' : 'Hop up! ▶', 2); }
  if (live && at === 9) ph.farT += dt; else ph.farT = 0;
  if (ph.farT > GC2.farHint) { ph.farT = -4; gcHint(st, rn.id, 'Jump down to go back!', 2.5); }
}

GC_PHASES.reels = {
  setup(st, L) {
    const ph = st.ph, def = L.def, cfg = def.reels || {};
    if (!st.stats.reels) st.stats.reels = { stops: [0, 0], sour: [0, 0], pops: [0, 0], bops: [0, 0], gulps: [0, 0], launches: 0, shouts: 0 };
    ph.cfg = { speed: cfg.speed || [1.3, 1.6], holdT: cfg.holdT || [null, 8], stairs: cfg.stairs || [] };
    ph.reels = [];
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      if (def.map[ty][tx] !== 'r') continue;
      ph.reels.push({ x0: tx * T, x1: (tx + 3) * T, wy: null, dir: 1, pos: 0, state: 'spin', ramp: 1, from: 0, target: 0, t: 0, flash: 0, holdFlash: 0, beamT: 0 });
      L.grid[ty][tx] = '#';
    }
    if (!ph.reels.length) throw new Error('Jackpot Reels: no reels (r) in the map');
    ph.reels.sort((a, b) => a.x0 - b.x0).forEach((r, i) => { r.i = i; });
    // the runner's start (the spawn above the panel) and the stopper's (below it), and both mirrored for side 1
    const up = L.spawns.find(s => s.y < GC2.panelY) || L.spawns[0], dn = L.spawns.find(s => s.y > GC2.panelY) || L.spawns[1];
    ph.start = [{ x: up.x, y: up.y }, { x: W - up.x - PW, y: up.y }];
    ph.deck = [{ x: dn.x, y: dn.y }, { x: W - dn.x - PW, y: dn.y }];
    // the ledges (the start one on each side): the solid run of tiles under the start spot
    const fy = Math.round((up.y + PH) / T), tx0 = Math.floor((up.x + PW / 2) / T);
    let a = tx0, z = tx0;
    while (a > 0 && tile(a - 1, fy) === '#') a--;
    while (z < COLS - 1 && tile(z + 1, fy) === '#' && tile(z + 1, fy - 1) !== '#') z++;
    ph.ledges = [{ x0: a * T, x1: (z + 1) * T, y: fy * T }, { x0: W - (z + 1) * T, x1: W - a * T, y: fy * T }];
    ph.stopper = def.stopper == null ? 0 : def.stopper; ph.runner = 1 - ph.stopper;
    ph.P = [0, 1].map(k => ({ prevFeet: G.players[k].y + G.players[k].h, prevVy: 0, on: null, launch: null, shoutT: 0, cool: 0 }));
    ph.stage = 'live'; ph.stageT = 0; ph.hit = 0; ph.bops = 0; ph.dome = true; ph.started = false;
    ph.attackT = GC2.attackFirst; ph.next = 'dice'; ph.missRow = 0; ph.slow = 1; ph.magnet = false; ph.gulpsHit = 0; ph.luckyHold = false;
    ph.waitT = 0; ph.waitSaid = false; ph.hopT = 0; ph.farT = 0; ph.arrowR = null; ph.bopT = 0; ph.rnIdle = 0;
    gc2Side(st, 0, false);
    const b = st.boss;
    b.s = GC2.s; b.pose = 'hover'; b.face = -1; b.gy = b.y; b.y -= GC2.lift; b.x -= GC2.edgeIn;
    ph.home = [{ x: b.x, y: b.y }, { x: W - b.x, y: b.y }];
    for (const [id, spot] of [[ph.stopper, ph.deck[0]], [ph.runner, ph.start[0]]]) {
      Object.assign(G.players[id], { x: spot.x, y: spot.y, face: 1 });
      G.spawnPts[id] = { ...spot };
      ph.P[id].prevFeet = spot.y + PH;
    }
  },
  wait(st, dt) {
    gc2Reels(st, dt, false);
    // the room card: the runner can walk about the start ledge but not off it (the tray would gulp them at once)
    const ph = st.ph, rn = G.players[ph.runner], lg = ph.ledges[ph.side];
    if (rn.alive) { const x = clamp(rn.x, lg.x0, lg.x1 - rn.w); if (x !== rn.x) { rn.x = x; rn.vx = 0; } }
    for (const p of G.players) ph.P[p.id].prevFeet = p.y + p.h;
  },
  pre(st, dt) {
    const ph = st.ph, s = G.players[ph.stopper], rn = G.players[ph.runner], P = ph.P[rn.id];
    // the stopper: the action, or a jump while under a reel, presses that reel's STOP button
    let press = false;
    if (s.pendingAct) { s.pendingAct = false; press = true; }
    if (s.pendingJump && gc2Live(ph) && gc2Zone(st, s) >= 0) { s.pendingJump = false; s.jumpBuf = 0; press = true; }
    if (press) gc2Press(st, s);
    // the runner: the action shouts "STOP!" (a cue for the stopper)
    P.cool = Math.max(0, P.cool - dt);
    if (rn.pendingAct) {
      rn.pendingAct = false;
      if (P.cool <= 0 && rn.alive) { P.cool = GC2.shoutCD; P.shoutT = 0.9; st.stats.reels.shouts++; Sfx.play('gc2Shout', rn.id); rumble(ph.stopper, 0, 0.35, 80); }
    }
    for (const p of G.players) ph.P[p.id].prevVy = p.vy;
  },
  step(st, dt) {
    const ph = st.ph, b = st.boss, rn = G.players[ph.runner], s = G.players[ph.stopper], P = ph.P[rn.id];
    if (!ph.started) {
      ph.started = true;
      gcSay(st, 'Ha! You can’t reach me up here!', 2.2);
      gcHint(st, ph.stopper, NAMES[ph.stopper] + ': ' + gc2StopKeys(ph.stopper), GC2.hintT);
      gcHint(st, ph.runner, NAMES[ph.runner] + ': hop up to his hat!', GC2.hintT);
    }
    ph.stageT += dt; ph.bopT = Math.max(0, ph.bopT - dt);
    for (const q of ph.P) q.shoutT = Math.max(0, q.shoutT - dt);
    gc2Reels(st, dt, gc2Live(ph));
    gc2Resolve(st);
    // the launch arc: the cherry's push carries the runner to his hat (a held direction can't steer them off it)
    if (P.launch) {
      P.launch.t += dt;
      if (!rn.alive || rn.grounded || P.launch.t > 1.6) P.launch = null;
      else {
        rn.vx = P.launch.vx; rn.carryVx = P.launch.vx;
        if ((G.tickN % 3) === 0) G.particles.push({ x: rn.x + rn.w / 2, y: rn.y + rn.h, vx: 0, vy: 0, life: 0.35, max: 0.35, col: C.gold, size: 3, grav: 0, kind: 'dot' });
      }
    }
    // BOP: the runner comes down on his hat button
    const H = gc2Hat(b), top = gc2BopY(st);
    if (gc2Live(ph) && rn.alive && rn.vy > 0 && P.prevFeet <= top + 3 && rn.y + rn.h >= top && Math.abs(rn.x + rn.w / 2 - H.x) <= GC2.bopW) gc2Bop(st, rn, top);
    // the tray: a runner who drops to the panel is gulped and comes back on the start ledge
    if (rn.alive && rn.y + rn.h >= GC2.panelY - 1) gc2Gulp(st, rn);
    // stopped reels spin again when the stopper leaves the deck
    if (gc2Live(ph) && !(s.alive && s.y + s.h > GC2.panelY + 2)) for (const r of ph.reels) if (r.state !== 'spin') gc2Respin(r);
    gc2Attacks(st, dt);
    gc2Nudges(st, dt);
    // a dome pop: the runner bounces off, then the jobs swap and the climb starts again
    if (ph.stage === 'pop' && ph.stageT >= GC2.popT) {
      gc2Swap(st);
      ph.stage = 'live'; ph.stageT = 0; ph.attackT = GC2.attackFirst;
    }
    // after the first piece: he flies to the other side, and the reels slide into stairs the other way. The runner
    // is already on the new start ledge (his old one), so the jobs stay as they are and the dome is back on.
    if (ph.stage === 'bop' && st.celebT <= 0 && !st.fly.length) {
      ph.stage = 'cross'; ph.stageT = 0; ph.hit = 1; ph.dome = true;
      ph.cross = { x0: b.x, y0: b.y, x1: ph.home[1].x, y1: ph.home[1].y };
      gcSay(st, 'Hmph! Try THIS side!', 2.2); b.mood = 'grumpy'; b.moodT = 2;
      Sfx.play('gcFly');
      gc2Side(st, 1, true);
      G.spawnPts[ph.runner] = { ...ph.start[1] }; G.spawnPts[ph.stopper] = { ...ph.deck[1] };
      ph.missRow = 0; ph.slow = 1; ph.magnet = false; ph.gulpsHit = 0; ph.luckyHold = false;
    } else if (ph.stage === 'cross') {
      const c = ph.cross, k = clamp(ph.stageT / GC2.crossT, 0, 1), e = k * k * (3 - 2 * k);
      b.x = c.x0 + (c.x1 - c.x0) * e; b.y = c.y0 + (c.y1 - c.y0) * e - Math.sin(k * Math.PI) * 150;
      if (k > 0.5) b.face = 1;
      const u = clamp((ph.stageT - GC2.slideAt) / GC2.slideT, 0, 1), eu = u * u * (3 - 2 * u);
      for (const r of ph.reels) r.wy = r.wyFrom + (r.wyTo - r.wyFrom) * eu;
      if (u > 0 && !ph.slid) { ph.slid = true; Sfx.play('gc2Slide'); }
      if (k >= 1) {
        ph.stage = 'live'; ph.stageT = 0; ph.attackT = GC2.attackFirst; b.x = c.x1; b.y = c.y1; b.face = 1;
        gcShowBadges(st);
        gcHint(st, ph.runner, NAMES[ph.runner] + ': now hop up this way! ◀', GC2.hintT);
        gcHint(st, ph.stopper, NAMES[ph.stopper] + ': ' + gc2StopKeys(ph.stopper), GC2.hintT);
      }
    }
    for (const p of G.players) ph.P[p.id].prevFeet = p.y + p.h;
  },
  labels(st) { return st.ph.stopper === 0 ? ['stop', 'shout'] : ['shout', 'stop']; },
  roles(st) { const ph = st.ph, r = []; r[ph.stopper] = 'Stop!'; r[ph.runner] = 'Hop up!'; return r; },
  busy(st, p) { const ph = st.ph; return p.id === ph.stopper || !!(ph.P && ph.P[p.id].launch); },
  onBonk(st, p) { p.vx *= GC2.softKnock; },    // a soft bonk: you wobble, but stay on your reel
  onRespawn(st, p) {
    const ph = st.ph, P = ph.P[p.id];
    Object.assign(P, { on: null, launch: null, prevFeet: p.y + p.h });
    if (p.id === ph.runner) { p.vy = -260; Sfx.play('gc2Spit', p.id); }
  },
  hudText(st) { return 'Bops ' + st.ph.bops + '/4'; },
  drawBack(st) { gc2DrawBack(st); },
  draw(st) { gc2Draw(st); },
  drawTop(st) { gc2DrawTop(st); },
};
GC_PHASES.reels.test = { GC2, sym: gc2Sym, good: gc2Good, plat: gc2Plat, hat: () => gc2Hat(G.mst.boss), zone: id => gc2Zone(G.mst, G.players[id]), at: id => gc2At(G.mst, G.players[id]) };

// phase 2 sounds
Sfx.extra.gc2Stop = function () { this.tone(180, 0.07, 'square', 0.06, 90); this.tone(900, 0.03, 'square', 0.03, null, 0.02); };
Sfx.extra.gc2Ding = function () { this.tone(988, 0.08, 'triangle', 0.05); this.tone(1319, 0.1, 'triangle', 0.045, null, 0.06); };
Sfx.extra.gc2Sour = function () { this.tone(300, 0.18, 'sawtooth', 0.035, 190); };
Sfx.extra.gc2Respin = function () { this.tone(260, 0.12, 'triangle', 0.03, 520); };
Sfx.extra.gc2Hold = function () { this.tone(660, 0.06, 'square', 0.035); this.tone(660, 0.06, 'square', 0.035, null, 0.08); };
Sfx.extra.gc2Boing = function (p) { this.tone(200 * p, 0.3, 'sine', 0.08, 820 * p); };
Sfx.extra.gc2Pop = function () { this.tone(1800, 0.05, 'square', 0.035, 900); [2093, 2637, 3136].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.03, null, 0.03 + i * 0.04)); };
Sfx.extra.gc2Bop = function () { this.tone(520, 0.08, 'square', 0.05, 260); this.tone(1046, 0.12, 'triangle', 0.05, 1568, 0.06); this.tone(160, 0.2, 'sine', 0.07, 90); };
Sfx.extra.gc2Gulp = function (p) { this.tone(420 * p, 0.12, 'sine', 0.07, 140 * p); this.tone(1200, 0.2, 'triangle', 0.02, 600, 0.08); };
Sfx.extra.gc2Spit = function (p) { this.tone(300 * p, 0.1, 'triangle', 0.05, 700 * p); };
Sfx.extra.gc2Shout = function (p) { this.tone(740 * p, 0.09, 'square', 0.05); this.tone(988 * p, 0.12, 'square', 0.045, null, 0.08); };
Sfx.extra.gc2Slide = function () { this.tone(120, 0.6, 'sawtooth', 0.025, 260); this.tone(240, 0.5, 'triangle', 0.02, 180, 0.3); };

/* --- phase 2 drawing --- */
function gc2DrawSym(ch, x, y, a) {   // one 90 x 60 picture with its top-left at (x, y)
  ctx.save(); ctx.globalAlpha *= a == null ? 1 : a;
  const cx = x + 45;
  if (ch === 'B') {
    ctx.fillStyle = '#b9850f'; rr(cx - 36, y + 30, 72, 24, 5); ctx.fill();
    ctx.fillStyle = C.gold; rr(cx - 36, y + 30, 72, 20, 5); ctx.fill();
    text('BAR', cx, y + 41, 15, '#7a4a10', 'center');
  } else if (ch === '7') {
    ctx.fillStyle = '#e8344e'; ctx.strokeStyle = '#9c1730'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 24, y + 2); ctx.lineTo(cx + 24, y + 2); ctx.lineTo(cx + 24, y + 13); ctx.lineTo(cx + 2, y + 56); ctx.lineTo(cx - 12, y + 56); ctx.lineTo(cx + 8, y + 14); ctx.lineTo(cx - 24, y + 14); ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else if (ch === 'C') {
    ctx.strokeStyle = '#3f8f3c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 12, y + 40); ctx.quadraticCurveTo(cx - 4, y + 14, cx + 6, y + 8); ctx.moveTo(cx + 13, y + 42); ctx.quadraticCurveTo(cx + 10, y + 18, cx + 6, y + 8); ctx.stroke();
    ctx.fillStyle = '#e8344e'; circle(cx - 13, y + 45, 11); ctx.fill(); circle(cx + 14, y + 46, 11); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(cx - 17, y + 41, 3); ctx.fill(); circle(cx + 10, y + 42, 3); ctx.fill();
  } else if (ch === 'L') {
    ctx.fillStyle = '#ffe36b'; ctx.strokeStyle = '#c9a62a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(cx, y + 34, 26, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a4a10'; circle(cx - 8, y + 31, 2.5); ctx.fill(); circle(cx + 8, y + 31, 2.5); ctx.fill();
    ctx.strokeStyle = '#5a4a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 7, y + 42); ctx.quadraticCurveTo(cx, y + 37, cx + 7, y + 42); ctx.stroke();
  }
  ctx.restore();
}
function gc2DrawBack(st) {
  const ph = st.ph, t = G.clock, rs = ph.reels;
  if (!rs) return;
  // the big machine behind the reels, with marquee bulbs along its top
  const x0 = rs[0].x0 - 24, x1 = rs[rs.length - 1].x1 + 24, y0 = Math.max(84, Math.min(...rs.map(r => r.wy)) - 36);
  ctx.fillStyle = 'rgba(120,20,60,0.5)'; rr(x0, y0, x1 - x0, GC2.panelY - y0, 18); ctx.fill();
  for (let x = x0 + 14, k = 0; x < x1 - 8; x += 24, k++) {
    const on = ((k + Math.floor(t * 6)) % 3) === 0;
    ctx.fillStyle = on ? '#fff6c2' : 'rgba(255,197,61,0.55)'; circle(x, y0 + 10, on ? 4.5 : 3.5); ctx.fill();
  }
  // the button deck under the panel: a dim room with a dotted carpet
  const d0 = ph.ledges[0].x1, d1 = ph.ledges[1].x0, dy = GC2.panelY + T;
  ctx.fillStyle = 'rgba(40,14,52,0.6)'; ctx.fillRect(d0, dy, d1 - d0, 3 * T);
  ctx.fillStyle = 'rgba(255,143,199,0.18)';
  for (let x = d0 + 15, k = 0; x < d1; x += 30, k++) for (let y = dy + 18 + (k % 2) * 15; y < dy + 3 * T - 6; y += 30) { circle(x, y, 3); ctx.fill(); }
}
function gc2Draw(st) {
  const ph = st.ph, t = G.clock, big = hudBig(), live = gc2Live(ph);
  if (!ph.reels) return;
  for (const r of ph.reels) {
    const cx = (r.x0 + r.x1) / 2, wb = r.wy + 180;
    // the stand under the window, down to the panel
    if (wb < GC2.panelY) { ctx.fillStyle = '#7a1838'; rr(cx - 30, wb - 6, 60, GC2.panelY - wb + 6, 6); ctx.fill(); ctx.fillStyle = 'rgba(255,215,94,0.35)'; ctx.fillRect(cx - 30, wb + 4, 60, 3); }
    // the window and its strip
    ctx.fillStyle = r.stair === ph.reels.length - 1 ? '#ff8fa3' : '#ffd75e'; rr(r.x0 - 6, r.wy - 6, 102, 192, 10); ctx.fill();
    ctx.fillStyle = '#fffaf0'; rr(r.x0, r.wy, 90, 180, 6); ctx.fill();
    ctx.save(); rr(r.x0, r.wy, 90, 180, 6); ctx.clip();
    const base = Math.floor(r.pos);
    for (let k = base - 2; k <= base + 3; k++) {
      const y = r.wy + GC2.cellH + (r.pos - k) * GC2.cellH;
      if (y < r.wy - 60 || y > r.wy + 180) continue;
      const ch = gc2Sym(r, k), stopped = r.state !== 'spin' && k === r.target;
      gc2DrawSym(ch, r.x0, y, r.state === 'spin' ? 0.85 : stopped ? 1 : 0.4);
      if (ph.slow < 1 && r.state === 'spin' && gc2Good(r, ch)) { ctx.strokeStyle = C.gold; ctx.lineWidth = 3; rr(r.x0 + 6, y + 4, 78, 52, 8); ctx.stroke(); }
      if (stopped && !gc2Good(r, ch)) { ctx.strokeStyle = 'rgba(200,40,60,0.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r.x0 + 25, y + 15); ctx.lineTo(r.x0 + 65, y + 50); ctx.moveTo(r.x0 + 65, y + 15); ctx.lineTo(r.x0 + 25, y + 50); ctx.stroke(); }
    }
    if (r.state === 'spin') { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(r.x0, r.wy, 90, 180); }
    const g = ctx.createLinearGradient(0, r.wy, 0, r.wy + 180);
    g.addColorStop(0, 'rgba(60,20,60,0.35)'); g.addColorStop(0.3, 'rgba(60,20,60,0)'); g.addColorStop(0.7, 'rgba(60,20,60,0)'); g.addColorStop(1, 'rgba(60,20,60,0.35)');
    ctx.fillStyle = g; ctx.fillRect(r.x0, r.wy, 90, 180);
    ctx.restore();
    // the payline (gold while it is a step) and its arrows
    const pl = gc2Plat(r), yp = r.wy + GC2.cellH;
    ctx.strokeStyle = pl ? C.gold : 'rgba(232,52,78,0.75)'; ctx.lineWidth = r.flash > 0 ? 4 : 2.5;
    rr(r.x0 + 1, yp, 88, 60, 4); ctx.stroke();
    ctx.fillStyle = C.gold;
    for (const sx of [r.x0 - 6, r.x1 + 6]) { const d = sx < r.x0 ? 1 : -1; ctx.beginPath(); ctx.moveTo(sx, yp + 22); ctx.lineTo(sx + 7 * d, yp + 30); ctx.lineTo(sx, yp + 38); ctx.fill(); }
    // the need tag, on the stand under the window (over the window if there is no room)
    if (r.need) {
      const nw = big ? 80 : 64, nh = big ? 30 : 24, ny = wb + 8 + nh <= GC2.panelY - 2 ? wb + 8 : r.wy - 12 - nh;
      ctx.fillStyle = 'rgba(28,26,54,0.85)'; rr(cx - nw / 2, ny, nw, nh, 10); ctx.fill();
      text('need', cx - nw / 2 + (big ? 23 : 19), ny + nh / 2, big ? 16 : 12, C.paper, 'center', 'body');
      ctx.save(); ctx.translate(cx + nw / 2 - 16, ny + nh / 2); ctx.scale(0.3, 0.3); gc2DrawSym(r.need, -45, -32); ctx.restore();
    }
    // an upward reel: a gold ▲ badge on both top corners of its frame
    if (r.dir < 0) for (const ux of [r.x0 - 2, r.x1 + 2]) {
      const ur = big ? 12 : 9;
      ctx.fillStyle = C.gold; circle(ux, r.wy - 2, ur); ctx.fill(); ctx.strokeStyle = '#7a1838'; ctx.lineWidth = 2; ctx.stroke();
      text('▲', ux, r.wy - 1.5, big ? 15 : 11, '#7a1838', 'center');
    }
    // hold bulbs (time left before it spins again)
    if (ph.holdT != null && !ph.luckyHold && r.state === 'stop' && live && pl) {
      const f = clamp(r.holdLeft / ph.holdT, 0, 1), warn = f < 0.3, blink = warn && Math.floor(t * 8) % 2;
      ctx.fillStyle = warn ? 'rgba(122,20,40,0.88)' : 'rgba(28,26,54,0.8)'; rr(r.x0 + 7, r.wy + 160, 76, 16, 8); ctx.fill();
      for (let k = 0; k < 6; k++) { const on = k < Math.ceil(f * 6); ctx.fillStyle = on ? (blink ? '#fff' : C.gold) : 'rgba(255,255,255,0.22)'; circle(r.x0 + 15 + k * 12, r.wy + 168, on ? 4.2 : 3.2); ctx.fill(); }
    }
  }
  // the top reel's cherry: dots show the boing arc to his hat
  const top = ph.reels[ph.order[ph.reels.length - 1]], tp = gc2Plat(top), rnP = ph.P[ph.runner];
  if (live && tp && tp.bounce && !rnP.launch) {
    const H = gc2Hat(st.boss), x0 = (top.x0 + top.x1) / 2, y0 = tp.top, yt = gc2BopY(st), ya = yt - GC2.launchApex, g = PHYS.g;
    const vy = Math.sqrt(2 * g * Math.max(40, y0 - ya)), tt = vy / g + Math.sqrt(2 * (yt - ya) / g), vx = (H.x - x0) / tt;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
    for (let i = 1; i < 12; i++) {
      const tm = tt * i / 12, lit = (t * 1.6 + 1 - i / 12) % 1 < 0.14;   // a sparkle runs along the dots toward his hat
      ctx.globalAlpha = lit ? 0.95 : 0.55; ctx.fillStyle = lit ? C.gold : '#fff6c2';
      circle(x0 + vx * tm, y0 - vy * tm + 0.5 * g * tm * tm, (big ? 5.5 : 4) * (lit ? 1.3 : 1)); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // the STOP buttons on the panel, and a light from each down to the deck (bright under the stopper)
  const sz = gc2Zone(st, G.players[ph.stopper]);
  for (const r of ph.reels) {
    const bx = (r.x0 + r.x1) / 2, here = sz === r.i && live, blink = r.beamT > 0 || ph.arrowR === r;
    if (live) {
      ctx.globalAlpha = here ? 0.38 : blink ? 0.16 + 0.16 * Math.abs(Math.sin(t * 7)) : 0.1;
      ctx.fillStyle = '#ffec96'; ctx.beginPath();
      ctx.moveTo(bx - 22, GC2.panelY + T); ctx.lineTo(bx + 22, GC2.panelY + T); ctx.lineTo(r.x1 + 8, GC2.panelY + 4 * T); ctx.lineTo(r.x0 - 8, GC2.panelY + 4 * T); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = here ? 'rgba(255,215,94,0.95)' : 'rgba(255,215,94,' + (blink ? 0.75 : 0.5) + ')';
      ctx.beginPath(); ctx.ellipse(bx, GC2.panelY + 4 * T - 1, 50, here ? 6 : 4.5, 0, 0, Math.PI * 2); ctx.fill();
    }
    const by = GC2.panelY + 16, pulse = here ? 1 + 0.08 * Math.sin(t * 9) : 1;
    ctx.fillStyle = here ? '#ff6b7c' : '#d83a50'; ctx.strokeStyle = here ? '#fff3c4' : '#7a1428'; ctx.lineWidth = here ? 2.5 : 2;
    ctx.beginPath(); ctx.ellipse(bx, by, (big ? 34 : 26) * pulse, (big ? 12 : 10) * pulse, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    text('STOP', bx, by + 0.5, big ? 16 : 12, '#fff', 'center', 'body');
  }
  // the big red button on his hat
  const b = st.boss;
  if (!b.hidden) {
    const H = gc2Hat(b), sq = ph.bopT > 0 ? Math.sin(ph.bopT / 0.5 * Math.PI) * 0.5 : 0, glow = live ? 0.5 + 0.5 * Math.sin(t * 5) : 0;
    if (glow) { ctx.fillStyle = `rgba(255,236,150,${0.25 * glow})`; circle(H.x, H.y - 6, 22); ctx.fill(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.fillStyle = '#d9dbe8'; rr(H.x - 15, H.y - 4, 30, 6, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff4d5e'; ctx.beginPath(); ctx.ellipse(H.x, H.y - 4, 13, 10 * (1 - sq), 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(H.x - 4, H.y - 9 + sq * 5, 4, 2.5 * (1 - sq * 0.6), -0.3, 0, Math.PI * 2); ctx.fill();
    // the glass dome over it (the first bop pops it)
    if (ph.dome) {
      const dh = 8 + GC2.dome;
      ctx.fillStyle = 'rgba(205,236,255,0.38)'; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(H.x, H.y - 2, 18, dh, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(H.x - 1, H.y - 2, 13, -2.7, -2.0); ctx.stroke();
    }
  }
}
function gc2DrawTop(st) {
  const ph = st.ph, big = hudBig();
  if (!ph.reels) return;
  // the reel the runner waits for: a ▼ over its STOP button, in the stopper's colour
  if (ph.arrowR) {
    const r = ph.arrowR, bx = (r.x0 + r.x1) / 2, y = GC2.panelY + 46 + Math.abs(Math.sin(G.clock * 5)) * 6;
    bigText('▼', bx, y, big ? 28 : 22, PCOL[ph.stopper]);
  }
  for (const p of G.players) {
    const P = ph.P[p.id];
    if (P.shoutT > 0 && p.alive) bigText('STOP!', p.x + p.w / 2, p.y - 34 - gcHeadLift(st, p), big ? 26 : 20, PCOL[p.id], 1 + 0.15 * Math.sin(P.shoutT * 20));
  }
}
/* ===== END GC PHASE 2 ===== */

/* ===== GC PHASE 3: LAVA ===== */
/* Hot Floor Climb (Great Escapes look, borrows 5-4 Rising Lava and 9-1 Pompeii Escape). He stomps, the floor cracks,
   and cartoon lava rises while he sits on a big steam boiler at the top right. Climb the tower's four floors.
   Every button builds steps in the PARTNER's colour (orange 'o' holds only Pip, blue 'u' only Bo), so you leapfrog:
   I press, you climb, then you press for me. Floors 2 and 4 have a wide gap over the lava that the partner bridges
   (in your colour), and a valve pair: both hold the action on your own valve together for GC3.turnT s -> steam,
   "Cool down!", a piece (5, then 9). The first gives the lava a breather, the second ends the phase.
   The phase runs in legs (GC3_LEGS): climb, bridge, valves, climb (hold plates: the steps stay while you stand on it),
   climb, bridge, valves. A button only works from its leg on. Who presses first changes each climb ("Swap jobs!").
   Kid-friendly lava: waits for the card and his stomp, never rises past GC3.gap px under the lower checkpoint floor
   (nobody standing on their floor is ever caught), backs off and slows after a "Hot foot!" (a hop, then back to your
   floor), pauses when nobody plays. Now and then he drops a soft pot or pan (shadow first), never at anyone on a
   button, plate or valve, up on the steps, or near a gap.
   Gold help: Cool breeze (the 2nd hot foot: slower lava), Super steps (stuck at your steps a while: an extra step).
   Map chars (this phase parses them): d h e m f g j l buttons (GC3_BTN), 0 3-9 their cells, q Pip's valve, r Bo's
   valve (one pair per valve floor). Room def: floors = the tile rows of the four floor tops, bottom first. 'Z' = his
   seat on the boiler; he starts on the ground under it. Stats in st.stats.lava. */
const GC3 = {
  bossS: 0.62,
  gap: 40, speed: 9, catchGap: 200, catchMul: 2.4, startY: H + 24, sinkV: 150, delay: 1.2,  // lava (px, px/s, s)
  hotDepth: 6, hotHop: 470, hotT: 0.55, backOff: 90, backWait: 2.2, assistStep: 0.85, assistMin: 0.55,
  breezeAt: 2, breezeMul: 0.65, breatherT: 5,
  turnT: 2, drain: 0.6, valveR: 22,                   // s both must hold, meter drain /s when not both, reach px
  buildStep: 0.07, holdGrace: 0.5, superAfter: 12,    // s per cell, s a hold group stays after you step off
  tossFirst: 12, tossGap: [9, 13], gapSafe: 70, nudgeT: 7, soloT: 1, notYetT: 0.6, introT: 2.9,
};
const GC3_LEGS = ['climb', 'bridge', 'valve', 'climb', 'climb', 'bridge', 'valve'];
// button char -> [owner, cells, leg, hold]: Pip's buttons build blue (Bo's) cells, Bo's build orange (Pip's)
const GC3_BTN = { d: [0, '3', 0, false], h: [1, '4', 0, false], e: [1, '9', 1, false], m: [1, '5', 3, true], f: [0, '6', 3, true],
  g: [0, '7', 4, false], j: [1, '8', 4, false], l: [0, '0', 5, false] };
// which floor (index into ph.floors) p stands on, or -1 (in the air, on steps, on a head)
function gc3FloorOf(ph, p) {
  if (!p.alive || !p.grounded || !p.tileGround) return -1;
  const feet = p.y + p.h;
  return ph.floors.findIndex(f => Math.abs(feet - f) < 1.5);
}
const gc3Cx = p => p.x + p.w / 2;
// standing on a button: on the floor of the button's cell (vy >= 0: not passing up through a plank)
function gc3StandOn(p, c, r) {
  return p.alive && p.grounded && p.tileGround && p.vy >= 0 && Math.abs(p.y + p.h - (r + 1) * T) < 1.5 && p.x < c * T + T - 4 && p.x + p.w > c * T + 4;
}
const gc3Leg = ph => GC3_LEGS[ph.leg];
const gc3BtnOn = (ph, b) => b.leg <= ph.leg && ph.stage !== 'done';
const gc3AtValve = (p, v) => p.alive && p.grounded && Math.abs(gc3Cx(p) - v.x) <= GC3.valveR && Math.abs(p.y + p.h - v.feet) < 1.5;
const gc3Pair = ph => (ph.stage === 'leg' && gc3Leg(ph) === 'valve' ? ph.valves[ph.vi] : null);
function gc3ActKey(id) {
  try {
    const k = actKey(id);
    return k === 'pad' ? glyph('act') : k === 'touch' ? 'the round button' : id === 0 ? 'F' : '/';
  } catch (e) { return id === 0 ? 'F' : '/'; }
}
const gc3Arrow = (ph, id, x, y, life = 3) => { if (!(typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id))) ph.arrow[id] = { x, y, t: 0, life }; };   // (none for the computer in 1-player mode)
function gc3SetGroup(gr, on) {
  if (on) { if (gr.state === 'hidden' || gr.state === 'fading') { if (gr.state === 'hidden') gr.buildT = 0; gr.state = 'building'; } }
  else if (gr.state === 'building' || gr.state === 'on') {
    gr.state = 'fading'; gr.fadeT = GC3.holdGrace;
    if (gr.cells.some(cl => cl.on)) Sfx.play('gc3Blink');
  }
}
const gc3CellBlocked = (gr, cl) => G.players.some(p => p.alive && solidFor(gr.tile, p) && rectHit(p, cl.c * T, cl.r * T, T, T));
// someone the steps hold stands right under them: Super steps' low cells on each side would box them in, so they wait
function gc3Pocket(gr) {
  const main = gr.cells.filter(cl => !cl.extra), r = main[0].r, x0 = Math.min(...main.map(cl => cl.c)) * T, x1 = (Math.max(...main.map(cl => cl.c)) + 1) * T;
  return G.players.some(p => p.alive && solidFor(gr.tile, p) && rectHit(p, x0, (r + 1) * T, x1 - x0, T));
}
const gc3OnGroup = (q, gr) => q.alive && q.grounded && gr.cells.some(cl => cl.on && Math.abs(q.y + q.h - cl.r * T) < 1.5 && q.x < cl.c * T + T && q.x + q.w > cl.c * T);
// standing on a floor with an unbuilt gap between you and x
const gc3Across = (ph, p, x) => { const f = gc3FloorOf(ph, p), cx = gc3Cx(p);
  return f >= 0 && ph.groups.some(gr => gr.bridge && gr.floor === f && gr.state !== 'on' && (cx < gr.x0) !== (x < gr.x0)); };
// a bridge's far side for the crosser: the side of the gap its button is on
function gc3FarSide(gr) {
  const cs = gr.cells.map(cl => cl.c), x0 = Math.min(...cs) * T, x1 = (Math.max(...cs) + 1) * T, bx = gr.btn.c * T + T / 2;
  return bx < x0 ? { dir: -1, edge: x0, x: x0 - 45 } : { dir: 1, edge: x1, x: x1 + 45 };
}
// what each player should be doing now: [{ what, target }] (press, hold, wait, climb, steps (wait for them), cross,
// bridge (wait for it), turn) or null between legs
function gc3Jobs(st) {
  const ph = st.ph;
  if (ph.stage !== 'leg') return null;
  const leg = gc3Leg(ph), bs = ph.legBtns[ph.leg], out = [];
  const presser = b => ({ what: b.hold ? 'hold' : b.latched ? 'wait' : 'press', target: b });
  if (leg === 'valve') return ph.valves[ph.vi].map(v => ({ what: 'turn', target: v }));
  if (leg === 'bridge') {
    const b = bs[0], gr = b.gr;
    out[b.owner] = presser(b); out[1 - b.owner] = { what: gr.state === 'on' ? 'cross' : 'bridge', target: gr };
    return out;
  }
  // a climb: low = on floor k (A presses for B), high = on floor k + 1 (B presses for A)
  const [low, high] = bs, A = low.owner, B = 1 - A, up = high.floor;
  const climber = gr => ({ what: gr.state === 'on' ? 'climb' : 'steps', target: gr });
  if (ph.ckpt[B] < up) { out[A] = presser(low); out[B] = climber(low.gr); }
  else { out[B] = presser(high); out[A] = ph.ckpt[A] < up ? climber(high.gr) : { what: 'wait' }; }
  return out;
}
const GC3_BADGE = { press: 'Press!', hold: 'Stay on!', climb: 'Climb!', steps: 'Climb!', cross: 'Cross!', bridge: 'Cross!', turn: 'Turn!' };
function gc3Target(job) {
  const o = job.target;
  if (!o) return null;
  if (o.cells) { const cs = o.cells.filter(cl => !cl.extra), cl = cs[(cs.length / 2) | 0]; return { x: cl.c * T + T / 2, y: cl.r * T - 4 }; }
  if (o.feet != null) return { x: o.x, y: o.feet - 58 };
  return { x: o.c * T + T / 2, y: o.r * T + 8 };
}
// a hint (and, when asked, a bouncing arrow) for what this player should do
function gc3Nudge(st, id, job, arrow) {
  const ph = st.ph, p = G.players[id];
  if (!job || !p.alive || ph.hot[id]) return;
  const msg = {
    press: 'Step on your button!', hold: 'Stand on your button and stay!', steps: 'Wait for your steps!', bridge: 'Wait for your bridge!',
    climb: arrow ? 'Jump onto your steps!' : 'Your steps! Climb up!', cross: 'Your bridge! Walk across!',
    turn: 'Hold ' + gc3ActKey(id) + ' on your valve!',
  }[job.what];
  if (!msg || (arrow && (job.what === 'steps' || job.what === 'bridge'))) return;
  gcHint(st, id, msg, 3);
  const tg = gc3Target(job);
  if (arrow && tg) gc3Arrow(ph, id, tg.x, tg.y);
}

/* --- phase 3 steps --- */
function gc3Intro(st, dt) {
  const ph = st.ph, b = st.boss, I = ph.intro;
  I.t += dt;
  if (!I.said) { I.said = true; b.pose = 'stomp'; gcSay(st, 'Hot floor! Stomp, stomp!', 1.8); }
  if (I.n < 3 && I.t >= 0.35 + I.n * 0.6) {
    I.n++; ph.cracks = I.n;
    Sfx.play('gc3Stomp'); rumble(0, 0.5, 0.4, 160); rumble(1, 0.5, 0.4, 160);
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.16);
    puff(b.x - 30, b.y - 2, 5, 'rgba(255,255,255,0.8)'); puff(b.x + 30, b.y - 2, 5, 'rgba(255,255,255,0.8)');
    for (const cx of ph.crackX.slice(0, I.n + 1)) burst(cx, ph.floors[0] + 4, '#ff9a3d', 5);
  }
  if (I.t >= 1.9 && !I.fly) { I.fly = true; b.pose = 'hover'; b.gy = ph.floors[0]; I.x0 = b.x; I.y0 = b.y; Sfx.play('gcFly'); gcSay(st, 'Hmph! Try THIS!', 1.6); }
  if (I.fly) {
    const k = clamp((I.t - 1.9) / (GC3.introT - 1.9), 0, 1), e = k * k * (3 - 2 * k);
    b.x = I.x0 + (ph.seat.x - I.x0) * e; b.y = I.y0 + (ph.seat.y - I.y0) * e - Math.sin(k * Math.PI) * 50;
  }
  if (I.t >= GC3.introT) {
    Object.assign(b, { x: ph.seat.x, y: ph.seat.y, gy: null, pose: 'sit' });
    puff(b.x, b.y, 8, 'rgba(255,255,255,0.85)'); Sfx.play('gcThud');
    gcSay(st, 'Ha! Come up and get me!', 2.2);
    ph.stage = 'leg'; ph.lavaWait = GC3.delay;
  }
}
function gc3Lava(st, dt) {
  const ph = st.ph;
  if (ph.coolT > 0) ph.coolT = Math.max(0, ph.coolT - dt);
  if (ph.sink) { ph.lavaY = Math.min(GC3.startY, ph.lavaY + GC3.sinkV * dt); if (ph.lavaY >= GC3.startY) ph.sink = false; }
  if (ph.stage === 'intro' || ph.stage === 'done' || st.idle) return;
  if (ph.lavaWait > 0) { ph.lavaWait -= dt; return; }
  if (!ph.lavaOn) { ph.lavaOn = true; gcNews(st, 'Here comes the lava! Climb up!'); Sfx.play('gc3Rumble'); }
  // never past the lower checkpoint floor, and never over floor 3 (on the top floor he and his boiler stay in view)
  const cap = Math.max(ph.floors[Math.min(ph.ckpt[0], ph.ckpt[1])], ph.floors[ph.floors.length - 2]) + GC3.gap;
  let v = GC3.speed * ph.assist * ph.breeze;
  if (ph.lavaY - cap > GC3.catchGap) v *= GC3.catchMul;
  if (ph.lavaY > cap) ph.lavaY = Math.max(cap, ph.lavaY - v * dt);
}
// "Hot foot!": feet in the lava. A hop with smoke, then back to your floor. The lava backs off and slows a little.
function gc3Hot(st, p) {
  const ph = st.ph, S = st.stats.lava;
  ph.hot[p.id] = { t: 0 }; ph.hotN++; S.hot[p.id]++;
  p.vy = -GC3.hotHop; p.vx = 0; p.jumping = false; p.grounded = false;
  gcPop(st, gc3Cx(p), p.y - 18, 'Hot foot!', '#ffcf6b', 24);
  Sfx.play('gc3Hot', p.id); rumble(p.id, 0.5, 0.3, 180);
  for (let k = 0; k < 3; k++) puff(gc3Cx(p), p.y + p.h, 5, 'rgba(120,110,115,0.8)');
  ph.lavaY = Math.min(GC3.startY, ph.lavaY + GC3.backOff);
  ph.lavaWait = Math.max(ph.lavaWait, GC3.backWait);
  ph.assist = Math.max(GC3.assistMin, ph.assist * GC3.assistStep);
  if (ph.hotN === GC3.breezeAt) { ph.breeze = GC3.breezeMul; gcHelp(st, 'Cool breeze! The lava slows down.'); }
  else gcNews(st, 'Phew! The lava backs off a bit.', false, 2.4);
}
// the floor a player's job is on (a button, a plate or a valve to stand at), or null (climbing, crossing, waiting)
function gc3JobFloor(ph, job) {
  if (!job || !job.target) return null;
  if (job.what === 'press' || job.what === 'hold') return job.target.floor;
  if (job.what === 'turn') { const f = ph.floors.indexOf(job.target.feet); return f >= 0 ? f : null; }
  return null;
}
function gc3Players(st, dt) {
  const ph = st.ph, jobs = gc3Jobs(st);
  for (const p of G.players) {
    const k = p.id, h = ph.hot[k];
    if (h) {
      if ((h.t += dt) >= GC3.hotT) { ph.hot[k] = null; respawn(p); gcHint(st, k, 'Hot foot! Back up you go.', 2); }
      continue;
    }
    if (p.alive && p.y + p.h > ph.lavaY + GC3.hotDepth) { gc3Hot(st, p); continue; }
    const f = gc3FloorOf(ph, p), job = jobs && jobs[k], cap = gc3JobFloor(ph, job);
    // up past your job's floor (a head boost can do that): your checkpoint comes back down to it, so you can go back
    if (cap != null && ph.ckpt[k] > cap) {
      ph.ckpt[k] = cap;
      const jx = job.what === 'turn' ? job.target.x : job.target.c * T + T / 2;
      G.spawnPts[k] = cap === 0 ? { ...ph.spawn0[k] } : { x: clamp(jx - PW / 2, 34, 24 * T + T - 4 - PW), y: ph.floors[cap] - PH };
    }
    // fell down a gap (or dropped, or hops about) below your checkpoint: a puff and back up, so nobody climbs it twice
    const below = p.alive && (f >= 0 ? f < ph.ckpt[k] : p.y + p.h > ph.floors[ph.ckpt[k]] + 8);
    ph.fallT[k] = below ? ph.fallT[k] + dt : 0;
    if (ph.fallT[k] >= 0.4) { ph.fallT[k] = 0; respawn(p); Sfx.play('gc3Floor', k); gcHint(st, k, 'Whoops! Back up you go.', 2); continue; }
    // a new, higher floor is your checkpoint (you come back here after a hot foot), up to your job's floor
    const up = cap != null ? Math.min(f, cap) : f;
    if (up > ph.ckpt[k]) {
      const hx = ph.home[up][k];
      ph.ckpt[k] = up; G.spawnPts[k] = { x: hx != null ? hx : clamp(p.x, 34, 24 * T + T - 4 - p.w), y: ph.floors[up] - PH };
      Sfx.play('gc3Floor', k); puff(gc3Cx(p), p.y + p.h, 6, C.gold);
      if (!st.say && gcRand() < 0.6) gcSay(st, ['Hey! Get down from there!', 'Ooh, you are good at climbing!', 'It’s getting toasty in here!'][(ph.lines++) % 3], 1.8);
    }
  }
}
function gc3Buttons(st, dt) {
  const ph = st.ph, S = st.stats.lava;
  for (const b of ph.btns) {
    const p = G.players[b.owner], q = G.players[1 - b.owner], gr = b.gr, active = gc3BtnOn(ph, b);
    if (b.wig > 0) b.wig -= dt;
    const on = gc3StandOn(p, b.c, b.r);
    if (on && !b.live && active && (b.hold || !b.latched)) {
      S.presses[b.owner]++; Sfx.play('gc3Press', b.owner); rumble(b.owner, 0.1, 0.35, 80);
      if (gr.state === 'hidden') { const c0 = gr.cells[0]; ph.zips.push({ x0: b.c * T + T / 2, y0: b.r * T + 20, x1: c0.c * T + T / 2, y1: c0.r * T + T / 2, t: 0, col: PCOL[gr.holder] }); }
    }
    // a button that works later: standing on it a moment says so (once)
    b.idleOn = on && !active ? b.idleOn + dt : 0;
    if (b.idleOn >= GC3.notYetT && !ph.hinted['ny' + b.ch]) {
      ph.hinted['ny' + b.ch] = true; b.wig = 0.3; Sfx.play('gc3Nope', p.id);
      gcHint(st, p.id, GC3_LEGS.slice(ph.leg, b.leg).includes('valve') ? 'Not yet! Turn the valves first.' : 'Not yet!', 2.2);
    }
    // a hold plate let go while the partner is up on its steps
    if (active && b.hold && b.down && !on && gc3OnGroup(q, gr)) gcHint(st, b.owner, 'Stay on it!', 2);
    b.down = on; b.live = on && active;
    // the partner on it: nothing happens (a wiggle, and once a "whose is it")
    const qOn = gc3StandOn(q, b.c, b.r);
    b.qOn = qOn ? b.qOn + dt : 0;
    if (b.qOn >= GC3.notYetT && !ph.hinted['nope' + q.id]) {
      ph.hinted['nope' + q.id] = true; b.wig = 0.3; Sfx.play('gc3Nope', q.id);
      gcHint(st, q.id, 'That’s ' + NAMES[b.owner] + '’s button!', 2.2);
    }
    if (!active) continue;
    if (b.hold) gc3SetGroup(gr, on);
    else if (on && !b.latched) { b.latched = true; gc3SetGroup(gr, true); }
  }
  // cells: one per buildStep, in order (a cell the holder is inside waits until they move); fading
  for (const gr of ph.groups) {
    for (const cl of gr.cells) if (cl.flash > 0) cl.flash -= dt;
    if (gr.state === 'building') {
      gr.buildT += dt;
      const want = Math.min(gr.cells.length, 1 + Math.floor(gr.buildT / GC3.buildStep));
      for (let i = 0; i < want; i++) {
        const cl = gr.cells[i];
        if (cl.on || gc3CellBlocked(gr, cl) || (cl.extra && gc3Pocket(gr))) continue;
        cl.on = true; cl.flash = 0.15; G.level.grid[cl.r][cl.c] = gr.tile; S.steps++;
        Sfx.play('gc3Step'); puff(cl.c * T + T / 2, cl.r * T + T / 2, 5, PCOL[gr.holder]);
      }
      if (gr.cells.every(cl => cl.on)) { gr.state = 'on'; Sfx.play('gc3Ready', gr.holder); rumble(gr.holder, 0, 0.3, 90); }
    } else if (gr.state === 'fading') {
      gr.fadeT -= dt;
      if (gr.fadeT <= 0) { gr.state = 'hidden'; for (const cl of gr.cells) { cl.on = false; G.level.grid[cl.r][cl.c] = '.'; } Sfx.play('gc3Fade'); }
    }
  }
  for (const z of ph.zips) z.t += dt;
  if (ph.zips.length && ph.zips[0].t > 0.25) ph.zips = ph.zips.filter(z => z.t <= 0.25);
}
// Super steps (gold help): an extra low step on each side, so the first hop is only one tile
function gc3Super(st, gr) {
  const g = G.level.grid, r = gr.cells[0].r + 1, cs = gr.cells.map(cl => cl.c);
  gr.super = true; st.stats.lava.supers++;
  // (never on the holder's own respawn spot: they would come back inside it, boxed in under the steps)
  const ph = st.ph, k = gr.holder, spots = [];
  if (ph && ph.home) ph.home.forEach((h, i) => { if (h && h[k] != null) spots.push({ x: h[k], y: ph.floors[i] - PH }); });
  if (G.spawnPts && G.spawnPts[k]) spots.push({ x: G.spawnPts[k].x, y: G.spawnPts[k].y });
  if (ph && ph.spawn0 && ph.spawn0[k]) spots.push({ x: ph.spawn0[k].x, y: ph.spawn0[k].y });
  const onSpot = c => spots.some(s => rectHit({ x: s.x, y: s.y, w: PW, h: PH }, c * T, r * T, T, T));
  for (const c of [Math.min(...cs) - 1, Math.max(...cs) + 1]) if (c > 0 && c < 25 && g[r] && g[r][c] === '.' && !onSpot(c)) gr.cells.push({ c, r, on: false, flash: 0, extra: true });
  if (gr.state === 'on') gr.state = 'building';
  gcHelp(st, 'Super steps! An extra step for ' + NAMES[gr.holder] + '.');
}
function gc3Valves(st, dt) {
  const ph = st.ph, pair = gc3Pair(ph);
  for (const pr of ph.valves) for (const v of pr) { v.turn = false; if (v.wig > 0) v.wig -= dt; }
  if (!pair) return;
  for (const v of pair) {
    const p = G.players[v.owner], q = G.players[1 - v.owner];
    v.turn = gc3AtValve(p, v) && p.input.act && p.stun <= 0 && !ph.hot[p.id];
    if (v.turn) { v.ang += dt * 7; if ((v.sq -= dt) <= 0) { v.sq = 0.28; Sfx.play('gc3Turn', p.id); } }
    // the partner tries this one
    const qTry = gc3AtValve(q, v) && q.input.act;
    if (qTry && !v.qTry) { v.wig = 0.3; Sfx.play('gc3Nope', q.id); gcHint(st, q.id, 'That’s ' + NAMES[v.owner] + '’s valve!', 2); }
    v.qTry = qTry;
  }
  const both = pair.every(v => v.turn), one = pair.find(v => v.turn);
  if (both) ph.vMeter = Math.min(1, ph.vMeter + dt / GC3.turnT);
  else ph.vMeter = Math.max(0, ph.vMeter - GC3.drain * dt);
  // only one turning: call the other one over
  ph.soloT = !both && one ? ph.soloT + dt : Math.min(0, ph.soloT + dt);
  if (ph.soloT >= GC3.soloT) {
    ph.soloT = -2;
    const v = pair.find(w => !w.turn), id = v.owner;
    gcHint(st, id, 'Turn your valve too!', 2.5); gc3Arrow(ph, id, v.x, v.feet - 58, 2.5);
    gcHint(st, one.owner, 'Keep holding! Wait for ' + NAMES[id] + '.', 2.5);
  }
  if (ph.vMeter >= 1) gc3ValveWin(st);
}
function gc3ValveWin(st) {
  const ph = st.ph, pieces = G.level.def.pieces, first = ph.vi === 0, pair = ph.valves[ph.vi];
  ph.vMeter = 0;
  Sfx.play('gc3Steam'); rumble(0, 0.6, 0.6, 300); rumble(1, 0.6, 0.6, 300);
  // steam out of the boiler's whistle and the two valves
  const puffAt = (x, y, n, vy) => { for (let i = 0; i < n; i++) G.particles.push({ x: x + (gcRand() - 0.5) * 16, y, vx: (gcRand() - 0.5) * 120, vy: vy - gcRand() * 120, life: 1, max: 1, col: 'rgba(255,255,255,0.85)', size: 8 + gcRand() * 8, grav: -60, kind: 'dot' }); };
  puffAt(ph.boiler.x1 - 17, ph.boiler.top - 18, 14, -160);
  for (const v of pair) puffAt(v.x, v.feet - 58, 8, -90);
  gcPop(st, 380, clamp(ph.lavaY - 30, 150, 400), 'Cool down!', '#c8f1ff', 34);
  gcWinPiece(st, pieces[ph.vi], { say: first ? 'Whoa! Too much steam!' : 'My volcano! Hmph!' });
  ph.coolT = first ? GC3.breatherT + 2 : 99; ph.sink = true;
  if (first) { ph.stage = 'cool'; ph.stageT = 0; ph.lavaWait = GC3.breatherT; ph.lavaOn = false; gcNews(st, 'Cool down! The lava takes a breather.', false, 3); }
  else { ph.stage = 'done'; ph.sinkT0 = G.time; ph.sinkY0 = ph.lavaY; gcPhaseDone(st); }
}
// the next leg (after a climb leg that changes who presses first: "Swap jobs!")
function gc3NextLeg(st) {
  const ph = st.ph;
  ph.leg++; ph.stage = 'leg'; ph.stageT = 0;
  const leg = gc3Leg(ph), bs = ph.legBtns[ph.leg];
  if (leg === 'climb') {
    if (ph.lastA != null && bs[0].owner !== ph.lastA) gcSwap(st);
    ph.lastA = bs[0].owner;
  } else if (leg === 'bridge') gcNews(st, cpuSolo() && cpuOn(bs[0].owner) ? 'A gap! ' + NAMES[bs[0].owner] + ' is building you a bridge!' : 'A gap! ' + NAMES[bs[0].owner] + ', build a bridge for ' + NAMES[1 - bs[0].owner] + '!', false, 3);
  else if (leg === 'valve') { ph.vi = ph.leg === GC3_LEGS.indexOf('valve') ? 0 : 1; ph.vMeter = 0; ph.soloT = 0; gcNews(st, 'Turn your steam valves together!', false, 3); }
}
function gc3Flow(st, dt) {
  const ph = st.ph;
  ph.stageT += dt;
  if (ph.stage === 'cool') { if (st.celebT <= 0 && !st.fly.length && ph.stageT > 1) gc3NextLeg(st); return; }
  if (ph.stage !== 'leg') return;
  const leg = gc3Leg(ph), bs = ph.legBtns[ph.leg];
  if (ph.lastA == null && leg === 'climb') ph.lastA = bs[0].owner;
  if (leg === 'climb' && ph.ckpt[0] >= bs[1].floor && ph.ckpt[1] >= bs[1].floor) gc3NextLeg(st);
  else if (leg === 'bridge') {
    const b = bs[0], q = G.players[1 - b.owner], far = gc3FarSide(b.gr);
    if (gc3FloorOf(ph, q) === b.floor && (gc3Cx(q) - far.edge) * far.dir > 0) gc3NextLeg(st);
  }
}
// badges and hints follow the jobs; a second nudge (with an arrow) after GC3.nudgeT s; Super steps when stuck
function gc3Guide(st, dt) {
  const ph = st.ph, jobs = gc3Jobs(st);
  const key = jobs ? jobs.map(j => j.what + ':' + (j.target ? (j.target.ch || j.target.g || j.target.x) : '')).join('|') : '';
  if (key !== ph.jobKey) {
    ph.jobKey = key; ph.jobT = [0, 0]; ph.nudged = [false, false];
    if (jobs) { gcShowBadges(st); for (const k of [0, 1]) gc3Nudge(st, k, jobs[k], false); }
  }
  if (!jobs) return;
  for (const k of [0, 1]) {
    const j = jobs[k], p = G.players[k];
    ph.jobT[k] += dt;
    if (!ph.nudged[k] && ph.jobT[k] >= GC3.nudgeT && j && ['press', 'hold', 'climb', 'cross', 'turn'].includes(j.what)) {
      const doing = (j.what === 'hold' && j.target.down) || (j.what === 'turn' && j.target.turn);
      if (!doing) { ph.nudged[k] = true; gc3Nudge(st, k, j, true); }
    }
    // up on the wrong side of a gap (a head boost can do that): drop down and you pop up on your side
    const tx = j && (j.what === 'press' || j.what === 'hold') ? j.target.c * T + T / 2 : j && j.what === 'turn' ? j.target.x : null;
    if (tx != null && gc3Across(ph, p, tx)) {
      if ((ph.wrongT[k] += dt) >= 1.5 && !ph.hinted['wrong' + k]) { ph.hinted['wrong' + k] = true; gcHint(st, k, 'Wrong side! Drop down to go back.', 3); }
    } else ph.wrongT[k] = 0;
    // up above your job's floor (a head boost again): go back down to it
    const jf = gc3JobFloor(ph, j), high = jf != null && gc3FloorOf(ph, p) > jf;
    ph.highT[k] = high ? ph.highT[k] + dt : Math.min(0, ph.highT[k] + dt);   // (negative: a wait after the hint)
    if (ph.highT[k] >= 1.5) { ph.highT[k] = -4; gcHint(st, k, j.what === 'turn' ? 'Drop down to your valve! Press ▼' : 'Drop down to your button! Press ▼', 3); }
    // stuck at your steps for a while (and still trying): Super steps
    if (j && j.what === 'climb' && !j.target.super && p.alive) {
      const i = p.input;
      if (i.left || i.right || i.jump) ph.climbT[k] += dt;
      if (ph.climbT[k] >= GC3.superAfter) { ph.climbT[k] = 0; gc3Super(st, j.target); }
    } else ph.climbT[k] = 0;
  }
}
function gc3Attacks(st, dt) {
  const ph = st.ph;
  if (ph.stage !== 'leg' || gcCalm(st) || st.junk.length) return;
  if ((ph.tossT -= dt) > 0) return;
  // only at someone standing on a floor, doing nothing special, and not near a gap (a bonk there could tip them in)
  const nearGap = p => ph.groups.some(gr => gr.bridge && gr.floor === gc3FloorOf(ph, p) && gc3Cx(p) > gr.x0 - GC3.gapSafe && gc3Cx(p) < gr.x1 + GC3.gapSafe);
  const ok = G.players.filter(p => p.alive && !ph.hot[p.id] && gc3FloorOf(ph, p) >= 0 && !gcBusy(st, p) && !nearGap(p));
  const p = ok.length ? ok[(gcRand() * ok.length) | 0] : null;
  const j = p && gcToss(st, p.id, { kind: gcRand() < 0.5 ? 'pan' : 'pot', flight: 1.3, minX: 45, maxX: 24 * T + 15 });
  ph.tossT = j ? GC3.tossGap[0] + gcRand() * (GC3.tossGap[1] - GC3.tossGap[0]) : 1;
  if (j && !st.say && gcRand() < 0.5) gcSay(st, gcRand() < 0.5 ? 'Oops! My pots!' : 'Catch! Ha ha!', 1.6);
}

GC_PHASES.lava = {
  setup(st, L) {
    const ph = st.ph, def = L.def;
    if (!st.stats.lava) st.stats.lava = { hot: [0, 0], presses: [0, 0], steps: 0, supers: 0 };
    ph.floors = (def.floors || [16, 12, 8, 4]).map(r => r * T);
    ph.btns = []; ph.groups = [];
    const groups = {}, valves = {}, holderOf = ch => { const v = Object.values(GC3_BTN).find(x => x[1] === ch); return v ? 1 - v[0] : 0; };
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = def.map[r][c];
      if (GC3_BTN[ch]) {
        const [owner, g, leg, hold] = GC3_BTN[ch];
        ph.btns.push({ ch, c, r, owner, g, leg, hold, floor: ph.floors.indexOf((r + 1) * T), down: false, latched: false, wig: 0, idleOn: 0, qOn: 0, plank: def.map[r + 1] && def.map[r + 1][c] === '=' });
      } else if ('03456789'.includes(ch)) {
        (groups[ch] = groups[ch] || { g: ch, cells: [], state: 'hidden', buildT: 0, fadeT: 0, holder: holderOf(ch), super: false }).cells.push({ c, r, on: false, flash: 0 });
      } else if (ch === 'q' || ch === 'r') {
        (valves[r] = valves[r] || []).push({ owner: ch === 'q' ? 0 : 1, c, r, x: c * T + T / 2, feet: (r + 1) * T, turn: false, ang: c, sq: 0, wig: 0, qTry: false });
      } else continue;
      L.grid[r][c] = '.';
    }
    for (const b of ph.btns) {
      const gr = groups[b.g];
      Object.assign(gr, { btn: b, tile: gr.holder === 0 ? 'o' : 'u', leg: b.leg, bridge: GC3_LEGS[b.leg] === 'bridge' });
      b.gr = gr;
      if (gr.bridge) { const cs = gr.cells.map(cl => cl.c); Object.assign(gr, { floor: b.floor, x0: Math.min(...cs) * T, x1: (Math.max(...cs) + 1) * T }); }
      gr.cells.sort((p, q) => Math.abs(p.c - b.c) - Math.abs(q.c - b.c));   // build from the button's side
      ph.groups.push(gr);
    }
    ph.valves = Object.keys(valves).map(Number).sort((a, b) => b - a).map(r => valves[r].sort((a, b) => a.owner - b.owner));
    // each leg's buttons (a climb: [low, high])
    ph.legBtns = GC3_LEGS.map((_, i) => ph.btns.filter(b => b.leg === i).sort((a, b) => b.r - a.r));
    // your spot on each floor: where your own steps up to it arrive (so a head boost up the wrong side, then a drop,
    // puts you on your side). Steps sit 2 rows under the floor they lead up to.
    ph.home = ph.floors.map(fy => [0, 1].map(k => {
      const gr = ph.groups.find(g => !g.bridge && g.holder === k && (g.cells[0].r - 2) * T === fy);
      return gr ? gr.cells.reduce((s, cl) => s + cl.c, 0) / gr.cells.length * T + T / 2 - PW / 2 : null;
    }));
    // he starts on the ground under his seat, stomps, then flies up to the boiler
    ph.spawn0 = G.spawnPts.map(sp => ({ ...sp }));
    const b = st.boss;
    ph.seat = { x: b.x, y: b.y };
    Object.assign(b, { s: GC3.bossS, face: -1, pose: 'stand', y: ph.floors[0] });
    ph.boiler = { x0: ph.seat.x - 62, x1: ph.seat.x + 68, top: ph.seat.y + 4, bot: ph.floors[0] - 4 };
    ph.crackX = [140, 300, 470, 640];
    Object.assign(ph, { stage: 'intro', stageT: 0, intro: { t: 0, n: 0, said: false, fly: false }, cracks: 0, leg: 0, vi: 0, vMeter: 0, soloT: 0, lastA: null,
      ckpt: [0, 0], hot: [null, null], hotN: 0, lavaY: GC3.startY, lavaWait: 0, lavaOn: false, assist: 1, breeze: 1, coolT: 0, sink: false,
      tossT: GC3.tossFirst, zips: [], arrow: [null, null], hinted: {}, jobKey: '', jobT: [0, 0], nudged: [false, false], climbT: [0, 0], fallT: [0, 0], wrongT: [0, 0], highT: [0, 0], lines: 0 });
  },
  pre(st) {
    const ph = st.ph;
    for (const p of G.players) {
      // a hot foot hop: no steering
      if (ph.hot[p.id]) { for (const k in p.input) p.input[k] = false; p.pendingJump = false; p.pendingAct = false; p.jumpBuf = 0; continue; }
      // kids hold ▼ to "press harder": it never drops you through the plank on a button or at a valve
      if (p.alive && p.grounded && p.onOneWay && (ph.btns.some(b => b.plank && gc3StandOn(p, b.c, b.r)) || ph.valves.some(pr => pr.some(v => gc3AtValve(p, v))))) p.downLatch = true;
    }
  },
  step(st, dt) {
    const ph = st.ph;
    for (const k of [0, 1]) { const a = ph.arrow[k]; if (a && (a.t += dt) >= a.life) ph.arrow[k] = null; }
    if (ph.stage === 'intro') gc3Intro(st, dt);
    gc3Players(st, dt);
    gc3Buttons(st, dt);
    gc3Valves(st, dt);
    gc3Lava(st, dt);
    if (ph.stage === 'done') return;
    gc3Flow(st, dt);
    gc3Guide(st, dt);
    gc3Attacks(st, dt);
  },
  labels: () => ['turn', 'turn'],
  roles(st) { const jobs = gc3Jobs(st); return jobs ? jobs.map(j => GC3_BADGE[j.what] || '') : null; },
  busy(st, p) {
    const ph = st.ph, pair = gc3Pair(ph);
    return !!ph.hot[p.id] || ph.btns.some(b => b.owner === p.id && gc3BtnOn(ph, b) && gc3StandOn(p, b.c, b.r)) || !!(pair && gc3AtValve(p, pair[p.id]));
  },
  headLift(st, p) { const ph = st.ph; return ph.valves.some(pr => pr.some(v => gc3AtValve(p, v))) ? 34 : 0; },
  hudText(st) { const ph = st.ph; return 'Floor ' + (Math.min(ph.ckpt[0], ph.ckpt[1]) + 1) + ' / ' + ph.floors.length; },
  drawBack(st) { gc3DrawBack(st); },
  draw(st) { gc3Draw(st); },
  drawTop(st) { gc3DrawTop(st); },
};
GC_PHASES.lava.test = { GC3, GC3_BTN, GC3_LEGS, floorOf: id => gc3FloorOf(G.mst.ph, G.players[id]), jobs: () => gc3Jobs(G.mst), farSide: gc3FarSide, across: (id, x) => gc3Across(G.mst.ph, G.players[id], x) };

// phase 3 sounds
Sfx.extra.gc3Stomp = function () { this.tone(90, 0.18, 'square', 0.07, 50); this.tone(160, 0.08, 'triangle', 0.05, 80, 0.02); };
Sfx.extra.gc3Rumble = function () { this.tone(110, 0.45, 'sawtooth', 0.035, 165); this.tone(70, 0.5, 'triangle', 0.06, 55, 0.05); };
Sfx.extra.gc3Press = function (p) { this.tone(520 * p, 0.05, 'square', 0.04); this.tone(780 * p, 0.09, 'triangle', 0.04, null, 0.04); };
Sfx.extra.gc3Step = function () { this.tone(560, 0.06, 'triangle', 0.04, 640); };
Sfx.extra.gc3Ready = function (p) { [784, 988, 1175].forEach((f, i) => this.tone(f * p, 0.09, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.gc3Blink = function () { this.tone(700, 0.03, 'square', 0.02); this.tone(700, 0.03, 'square', 0.02, null, 0.12); };
Sfx.extra.gc3Fade = function () { this.tone(520, 0.12, 'triangle', 0.035, 260); };
Sfx.extra.gc3Nope = function (p) { this.tone(240 * p, 0.07, 'square', 0.03, 180 * p); };
Sfx.extra.gc3Floor = function (p) { this.tone(660 * p, 0.07, 'triangle', 0.045); this.tone(990 * p, 0.1, 'triangle', 0.045, null, 0.06); };
Sfx.extra.gc3Hot = function () { this.tone(1400, 0.3, 'sawtooth', 0.018, 300); this.tone(500, 0.12, 'square', 0.03, 900, 0.05); };
Sfx.extra.gc3Turn = function (p) { this.tone(300 * p, 0.06, 'square', 0.018, 360 * p); };
Sfx.extra.gc3Steam = function () { this.tone(2400, 0.7, 'sawtooth', 0.012, 1800); this.tone(1200, 0.5, 'triangle', 0.03, 2400, 0.05); this.tone(140, 0.4, 'sine', 0.05, 90); };

/* --- phase 3 drawing --- */
// behind him: the tower's back wall (then its tiles again, on top of it), the pipes and the boiler
function gc3DrawBack(st) {
  const ph = st.ph, t = G.clock, x1 = 25 * T, bot = ph.floors[0];
  ctx.fillStyle = 'rgba(62,44,66,0.5)'; ctx.fillRect(T, 0, x1 - T, bot);
  ctx.strokeStyle = 'rgba(255,220,190,0.07)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let y = 15, n = 0; y < bot; y += 15, n++) {
    ctx.moveTo(T, y); ctx.lineTo(x1, y);
    for (let x = T + (n % 2 ? 15 : 0); x < x1; x += 30) { ctx.moveTo(x, y); ctx.lineTo(x, y + 15); }
  }
  ctx.stroke();
  // round windows with the volcano's glow
  for (const [wx, wy] of [[150, 190], [600, 190], [375, 430]]) {
    ctx.fillStyle = 'rgba(255,170,100,0.35)'; circle(wx, wy, 22); ctx.fill();
    ctx.strokeStyle = 'rgba(28,26,54,0.45)'; ctx.lineWidth = 4; circle(wx, wy, 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx - 22, wy); ctx.lineTo(wx + 22, wy); ctx.moveTo(wx, wy - 22); ctx.lineTo(wx, wy + 22); ctx.lineWidth = 3; ctx.stroke();
  }
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx <= 25; tx++) {
    const ch = G.level.grid[ty][tx], x = tx * T, y = ty * T;
    if (ch === '#') drawStone(tx, ty);
    else if (ch === '=') drawPlank(x, y, tx, ty);
    else if (ch === 'o' || ch === 'u') drawColorBlock(x, y, ch === 'o' ? 0 : 1, tx, ty);
  }
  // pipes from each valve pair to the boiler (along the tower's top, through its wall)
  const B = ph.boiler;
  ph.valves.forEach((pr, i) => {
    const py = pr[0].feet - 75, xs = Math.min(...pr.map(v => v.x)) - 8, wx = 25 * T + 12 - i * 6, yin = i === 0 ? Math.max(py, B.top + 40) : B.top + 18;
    const path = () => { ctx.beginPath(); ctx.moveTo(xs, py); ctx.lineTo(wx, py); ctx.lineTo(wx, yin); ctx.lineTo(B.x0 + 4, yin); };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    path(); ctx.strokeStyle = GCB.brassDk; ctx.lineWidth = 11; ctx.stroke();
    path(); ctx.strokeStyle = GCB.brass; ctx.lineWidth = 6; ctx.stroke();
    for (const v of pr) { ctx.strokeStyle = GCB.brassDk; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(v.x, py); ctx.lineTo(v.x, v.feet - 42); ctx.stroke(); }
    ctx.lineCap = 'butt';
  });
  // the boiler: a big brass tank with purple bands, a steam gauge and a glowing firebox
  const w = B.x1 - B.x0, cx = (B.x0 + B.x1) / 2;
  ctx.fillStyle = GCB.brassDk; rr(B.x0 + 14, B.bot - 8, 22, 12, 4); ctx.fill(); rr(B.x1 - 36, B.bot - 8, 22, 12, 4); ctx.fill();
  const g = ctx.createLinearGradient(B.x0, 0, B.x1, 0);
  g.addColorStop(0, GCB.brassDk); g.addColorStop(0.35, GCB.brassLt); g.addColorStop(1, GCB.brass);
  ctx.fillStyle = g; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; rr(B.x0, B.top, w, B.bot - B.top - 4, 34); ctx.fill(); ctx.stroke();
  for (const by of [B.top + 52, B.bot - 70]) {
    ctx.fillStyle = GCB.purple; ctx.fillRect(B.x0 + 1.5, by, w - 3, 14);
    ctx.fillStyle = GCB.brassLt; for (let x = B.x0 + 12; x < B.x1 - 6; x += 18) { circle(x, by + 7, 2.2); ctx.fill(); }
  }
  // the gauge: its needle climbs while you turn the valves
  const gy = B.top + 112, val = gc3Pair(ph) ? 0.12 + 0.82 * ph.vMeter : 0.15 + 0.05 * Math.sin(t * 3);
  ctx.fillStyle = '#fff7e6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; circle(cx, gy, 26); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#ff5f6d'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, gy, 19, -0.5, 0.75); ctx.stroke();
  const a = Math.PI * 0.75 + val * Math.PI * 1.5;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, gy); ctx.lineTo(cx + Math.cos(a) * 20, gy + Math.sin(a) * 20); ctx.stroke();
  ctx.fillStyle = C.ink; circle(cx, gy, 4); ctx.fill();
  const fy = B.bot - 46, fl = 0.55 + 0.25 * Math.sin(t * 9) + 0.1 * Math.sin(t * 23);
  ctx.fillStyle = '#4a2f3a'; rr(cx - 28, fy - 16, 56, 34, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = `rgba(255,150,60,${fl})`; rr(cx - 20, fy - 9, 40, 20, 8); ctx.fill();
  // the whistle on top, puffing a little
  ctx.fillStyle = GCB.brass; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(B.x1 - 24, B.top - 16, 14, 20, 4); ctx.fill(); ctx.stroke();
  for (let k = 0; k < 3; k++) {
    const u = (t * 0.6 + k / 3) % 1;
    ctx.fillStyle = `rgba(255,255,255,${0.45 * (1 - u)})`; circle(B.x1 - 17 + u * 14, B.top - 22 - u * 40, 5 + u * 9); ctx.fill();
  }
}
function gc3DrawWheel(v, glow, z) {
  const x = v.x + (v.wig > 0 ? Math.sin(v.wig * 60) * 1.5 : 0), y = v.feet - 42, r = 12;
  if (glow) { ctx.fillStyle = `rgba(255,214,90,${0.25 + 0.15 * Math.sin(G.clock * 6)})`; circle(x, y, r + 8 * z); ctx.fill(); }
  ctx.save(); ctx.translate(x, y); ctx.rotate(v.ang);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 7; circle(0, 0, r); ctx.stroke();
  ctx.strokeStyle = PCOL[v.owner]; ctx.lineWidth = 4.5; circle(0, 0, r); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke();
  ctx.fillStyle = PDARK[v.owner]; circle(0, 0, 4); ctx.fill();
  ctx.restore();
}
function gc3DrawButton(ph, b) {
  const x = b.c * T, y = b.r * T, own = PCOL[b.owner], par = PCOL[1 - b.owner], t = G.clock, wig = b.wig > 0 ? Math.sin(b.wig * 60) * 1.5 : 0;
  const active = gc3BtnOn(ph, b);
  ctx.save(); if (!active) ctx.globalAlpha = 0.4;
  if (b.hold) {   // a hold plate: flat, with two little feet marks
    const py = y + 24 + (b.down ? 2 : 0);
    ctx.fillStyle = C.stoneEdge; rr(x + 1, y + 27, T - 2, 3, 1.5); ctx.fill();
    if (b.down) { ctx.shadowColor = own; ctx.shadowBlur = 8; }
    ctx.fillStyle = b.gr.state === 'fading' && Math.floor(t * 16) % 2 ? '#ffffff' : own; rr(x + 2 + wig, py, 26, 4, 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; rr(x + 2 + wig, py, 26, 4, 2); ctx.stroke();
    ctx.fillStyle = par; ctx.fillRect(x + 13 + wig, py + 1, 4, 2);
    if (!b.down) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 10 + wig, y + 14, 3, 7); ctx.fillRect(x + 17 + wig, y + 14, 3, 7); }
  } else {
    ctx.fillStyle = C.stoneEdge; rr(x + 2, y + 25, 26, 5, 2); ctx.fill();
    if (b.latched) {
      ctx.fillStyle = own; rr(x + 4 + wig, y + 23, 22, 3, 2); ctx.fill();
      ctx.fillStyle = par; circle(x + 15, y + 13, 3.5); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
    } else {
      const bob = active && !reduceMotion ? (Math.sin(t * Math.PI * 4) > 0 ? -1 : 0) : 0, cy = y + 15 + bob;
      ctx.fillStyle = PDARK[b.owner]; rr(x + 4 + wig, cy + 2, 22, 9, 4); ctx.fill();
      ctx.fillStyle = own; rr(x + 4 + wig, cy, 22, 9, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x + 7 + wig, cy + 1, 16, 2);
      ctx.fillStyle = par; rr(x + 9.5 + wig, cy + 2, 11, 6, 1.5); ctx.fill();   // a little block in the partner's colour
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
    }
  }
  ctx.restore();
}
// in front of him, behind the players: cracks, the cells to come, buttons, valves
function gc3Draw(st) {
  const ph = st.ph, t = G.clock, z = hudBig() ? 1.3 : 1;
  // the stomp cracks in the ground floor, glowing
  if (ph.cracks > 0) for (const cx of ph.crackX.slice(0, ph.cracks + 1)) {
    const y = ph.floors[0];
    ctx.strokeStyle = 'rgba(255,140,60,0.6)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx - 26, y + 2); ctx.lineTo(cx - 10, y + 12); ctx.lineTo(cx + 4, y + 4); ctx.lineTo(cx + 22, y + 16); ctx.stroke();
    ctx.strokeStyle = '#3a2430'; ctx.lineWidth = 2.5; ctx.stroke();
  }
  // cells an active button will build: dashed, in the colour of the player they hold
  ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
  for (const gr of ph.groups) {
    if (!gc3BtnOn(ph, gr.btn)) continue;
    for (const cl of gr.cells) {
      if (cl.on) continue;
      ctx.globalAlpha = 0.09; ctx.fillStyle = PCOL[gr.holder]; ctx.fillRect(cl.c * T + 2, cl.r * T + 2, T - 4, T - 4);
      ctx.globalAlpha = 0.55; ctx.strokeStyle = PCOL[gr.holder]; ctx.strokeRect(cl.c * T + 2, cl.r * T + 2, T - 4, T - 4);
    }
  }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  // pop-in flashes, and the blink of a hold group about to vanish
  const blink = Math.floor(t * 16) % 2 === 0;
  for (const gr of ph.groups) for (const cl of gr.cells) {
    if (!cl.on) continue;
    let a = cl.flash > 0 ? 0.7 * cl.flash / 0.15 : 0;
    if (gr.state === 'fading' && blink) a = Math.max(a, 0.5);
    if (a > 0) { ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.fillRect(cl.c * T, cl.r * T, T, T); ctx.globalAlpha = 1; }
  }
  for (const b of ph.btns) gc3DrawButton(ph, b);
  const pair = gc3Pair(ph);
  for (const pr of ph.valves) for (const v of pr) gc3DrawWheel(v, pr === pair && !v.turn, z);
  for (const zp of ph.zips) {
    const f = Math.min(1, zp.t / 0.25), x = zp.x0 + (zp.x1 - zp.x0) * f, y = zp.y0 + (zp.y1 - zp.y0) * f - Math.sin(f * Math.PI) * 30;
    ctx.fillStyle = zp.col; circle(x, y, 5); ctx.fill(); ctx.fillStyle = '#ffffff'; circle(x, y, 2.4); ctx.fill();
  }
}
// where the lava's top is drawn (after the last valve it sinks away while the phase steps have stopped)
const gc3LavaShown = ph => (ph.stage === 'done' && ph.sinkT0 != null ? Math.min(GC3.startY + 40, ph.sinkY0 + (G.time - ph.sinkT0) * GC3.sinkV) : ph.lavaY);
function gc3DrawLava(st) {
  const ph = st.ph, y0 = gc3LavaShown(ph);
  if (y0 >= H + 4) return;
  const t = G.clock, cool = ph.coolT > 0, amp = cool ? 0.3 : reduceMotion ? 0.4 : 1;
  const wave = x => y0 + amp * (3 * Math.sin(2 * Math.PI * (x / 60 + 0.7 * t)) + 1.5 * Math.sin(2 * Math.PI * (x / 23 - 1.3 * t)));
  const gl = ctx.createLinearGradient(0, y0 - 60, 0, y0);
  gl.addColorStop(0, cool ? 'rgba(170,225,255,0)' : 'rgba(255,140,60,0)'); gl.addColorStop(1, cool ? 'rgba(170,225,255,0.22)' : 'rgba(255,140,60,0.3)');
  ctx.fillStyle = gl; ctx.fillRect(0, y0 - 60, W, 60);
  const span = Math.max(1, H - y0 + 8), sp = v => clamp(v / span, 0, 1), g = ctx.createLinearGradient(0, y0 - 8, 0, H);
  if (cool) { g.addColorStop(0, '#9a7088'); g.addColorStop(sp(20), '#7a5068'); g.addColorStop(1, '#4b3550'); }
  else { g.addColorStop(0, '#ffb347'); g.addColorStop(sp(32), '#ff6a2a'); g.addColorStop(sp(88), '#d8431f'); g.addColorStop(1, '#a8301c'); }
  ctx.beginPath(); ctx.moveTo(0, H + 2);
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, wave(x));
  ctx.lineTo(W, H + 2); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  if (!cool && H - y0 > 24) {   // slow glowing blobs
    ctx.fillStyle = 'rgba(255,214,120,0.18)';
    for (let i = 0; i < 7; i++) {
      const bx = ((i * 157 + t * (12 + i * 3)) % (W + 80)) - 40, by = y0 + 16 + ((i * 37) % 40) + Math.sin(t * 0.8 + i) * 4;
      if (by < H) { ctx.beginPath(); ctx.ellipse(bx, by, 26 + (i % 3) * 8, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  ctx.strokeStyle = cool ? '#c8f1ff' : '#ffe28a'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.beginPath();
  for (let x = 0; x <= W; x += 8) { const y = wave(x) + 1.5; if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.stroke();
  if (cool) {   // cracks in the cooled crust
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
    for (const cx of [120, 350, 610, 840]) { const y = wave(cx) + 3; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + 6, y + 10); ctx.lineTo(cx - 3, y + 20); ctx.lineTo(cx + 5, y + 32); ctx.stroke(); }
  } else if (!reduceMotion) {   // bubbles that rise and pop (from the clock: no random)
    for (let i = 0; i < 9; i++) {
      const u = (t * 0.5 + i * 0.237) % 1, bx = (i * 113 + 40) % W, by = y0 + 4 + (1 - u) * 20;
      if (by > H) continue;
      ctx.fillStyle = '#ffcf6b'; circle(bx, by, 2.5 + (i % 3)); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(bx - 1, by - 1, 1); ctx.fill();
    }
  }
}
function gc3DrawTop(st) {
  const ph = st.ph, t = G.clock, z = hudBig() ? 1.4 : 1;
  gc3DrawLava(st);
  // a held plate under your feet: a glow that shows it is held
  for (const b of ph.btns) {
    if (!b.hold || !b.down || !gc3BtnOn(ph, b)) continue;
    const x = b.c * T, y = b.r * T + 26;
    ctx.shadowColor = PCOL[b.owner]; ctx.shadowBlur = 10; ctx.fillStyle = PCOL[b.owner]; rr(x, y, T, 4, 2); ctx.fill(); ctx.shadowBlur = 0;
  }
  // the valve meter: a gold ring round both wheels of the pair being turned
  const pair = gc3Pair(ph);
  if (pair && ph.vMeter > 0) for (const v of pair) {
    const y = v.feet - 42;
    ctx.strokeStyle = 'rgba(28,26,54,0.5)'; ctx.lineWidth = 6 * z; circle(v.x, y, 18 * z); ctx.stroke();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 4 * z; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(v.x, y, 18 * z, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ph.vMeter); ctx.stroke(); ctx.lineCap = 'butt';
  }
  for (const pr of ph.valves) for (const v of pr) if (v.turn && (G.tickN % 10) < 5) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(v.x + 16, v.feet - 52 - (G.tickN % 10), 4); ctx.fill();
  }
  // bouncing arrows at what a player should go to
  for (const k of [0, 1]) {
    const a = ph.arrow[k];
    if (!a) continue;
    const bob = reduceMotion ? 0 : Math.abs(Math.sin(t * 7)) * 6, s = z, ay = a.y - bob;
    ctx.save(); ctx.globalAlpha = clamp((a.life - a.t) / 0.3, 0, 1);
    ctx.fillStyle = PCOL[k]; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(a.x - 5 * s, ay - 18 * s); ctx.lineTo(a.x + 5 * s, ay - 18 * s); ctx.lineTo(a.x + 5 * s, ay - 9 * s); ctx.lineTo(a.x + 11 * s, ay - 9 * s);
    ctx.lineTo(a.x, ay); ctx.lineTo(a.x - 11 * s, ay - 9 * s); ctx.lineTo(a.x - 5 * s, ay - 9 * s); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.restore();
  }
}
/* ===== END GC PHASE 3 ===== */

/* ===== GC PHASE 4: FINALE ===== */
/* Grand Finale (a bright mix of Sunny Meadow, Rumble Park and Backyard Bash; borrows 4-3 Hot Potato Volleyball and
   6-2 Tug of War). Part A, set and spike: he hovers over the net and serves big bouncy balls. The setter bumps a ball
   up (action): "Set!", it glows gold and floats to the partner. The spiker hits a gold ball (action; jump + action is
   a SPIKE) and it flies into his belly: BOING, a hit ("bonk" only ever means a player got hit). Three hits knock a
   piece out (4, then 6). Whoever spiked last sets next, so the jobs swap after every hit. A ball the spiker touches
   first, or one the setter touches twice, just plinks ("Pass it!"); after three bounces it rolls away and he serves
   again. Misses in a row (mashing) make the next swing wait a moment. He tosses soft socks at whoever is waiting.
   Part B, pull the plug: dizzy, he lands and sits; his power cord runs from his side to the wall. Both grab a knot on
   the cord (action) and pull (hold or mash the action, or hold ◀). He tugs back now and then (a telegraphed yank). Only both
   pulling together moves the plug; when it pops out he naps and piece 1 flies home, then the ending.
   Help (gold): Big mitts (a bigger reach) after 3 rallies with no bonk, Floaty balls after 6, Magnet balls (they
   drift to whoever is next) after 9; Super grip when the pull takes long. Map chars: K the wall socket, N the net (room def: setter = who sets first).
   Stats in st.stats.finale. */
const GC4 = {
  floor: 450, ballR: 17, g: 620, gSlow: 470, floorE: 0.62, wallE: 0.8, netE: 0.5, maxBounce: 3, rollT: 0.6,
  netH: 92, netHalf: 4,
  serveGap: 1.4, swapGap: 2.0, firstServe: 1.2, serveDev: 70,           // s between balls (after a swap: time to read the badges)
  setApex: 185, setMaxVx: 250, plinkVy: 300, headVy: 330,                 // a set rises this high and drifts to the spiker
  swingT: 0.28, touchCD: 0.25, reachX: 22, reachUp: 40, mittsPx: 14,      // a press swings for swingT s
  whiffLock: 0.45, whiffGap: 1.2,       // misses in a row (each within whiffGap s): the next swing waits whiffLock s per extra miss, up to 3 (mashing loses)
  spikeT: 0.4, bumpT: 0.8, bonksPer: 3,                                   // shot flight time; bonks per piece
  mittsAfter: 3, slowAfter: 6, magnetAfter: 9, magnet: 3,                  // rallies in a row with no bonk before help
  hoverX: 790, hoverY: 360, swapAfter: 0.8, landT: 1.6, plugT: 0.7, swoop: [22, 60],   // px he drifts (second piece: wider)
  tossFirst: 7, tossGap: [8, 11],
  // the pull: knots on the cord, rate per s while both pull, plus per press (presses closer than pressGap add nothing)
  knots: [470, 400], knotShift: 64, grabR: 34, pullHold: 0.4, rate: 0.035, perPress: 0.008, pressGap: 0.12,
  yankGap: [3.2, 4.2], yankWarn: 0.7, yankBoth: 0.025, yankOne: 0.06, gripAfter: 22, gripRate: 1.5, gripYank: 0.4,
  hintGap: 3.5,
};
// his serves, in turn: T = s in the air; aim = px past the setter toward the net (a bouncer lands short and bounces on)
const GC4_SERVES = [{ T: 1.45, aim: 0 }, { T: 1.95, aim: 0, say: 'A big high one!' }, { T: 1.45, aim: 0 }, { T: 0.95, aim: 110, say: 'A bouncy one!' }];
const gc4Next = ph => (!ph.ball || ph.ball.state === 'shot' ? -1 : ph.ball.state === 'set' ? 1 - ph.setter : ph.setter);
const gc4Live = ph => ph.stage === 'rally';
const gc4G = ph => (ph.mitts >= 2 ? GC4.gSlow : GC4.g);
// short how-to words for each device: 'press F', 'press X', or 'tap set' (the touch button shows its own word)
function gc4Do(id) {
  const k = actKey(id);
  return k === 'touch' ? 'tap ' + actLabel(id) : 'press ' + (k === 'pad' ? glyph('act') : id === 0 ? 'F' : '/');
}
function gc4Spike(id) {
  const k = actKey(id);
  return k === 'touch' ? 'jump, then tap ' + actLabel(id) : (k === 'pad' ? glyph('a') + ' + ' + glyph('act') : id === 0 ? 'W + F' : '↑ + /');
}
// the plug in his side (it slides out as they pull)
function gc4PlugPos(st) {
  const ph = st.ph, P = gcBossPts(st.boss), out = ph.stage === 'pull' ? ph.u * 34 : 0;
  return { x: P.body.x0 - 8 - out, y: Math.min(P.band.y1 + 4, GC4.floor - 22) };
}
// the knots on the cord (they slide left as the plug comes out)
const gc4KnotX = (ph, i) => GC4.knots[i] - ph.u * GC4.knotShift;
// a player's swing reaches this box (bigger with Big mitts)
function gc4Reach(ph, p) {
  const m = Math.min(ph.mitts, 1) * GC4.mittsPx;
  return { x0: p.x - GC4.reachX - m, x1: p.x + p.w + GC4.reachX + m, y0: p.y - GC4.reachUp - m, y1: p.y + p.h + 6 };
}
function gc4InReach(ph, p, b) {
  const hb = gc4Reach(ph, p), hx = clamp(b.x, hb.x0, hb.x1), hy = clamp(b.y, hb.y0, hb.y1);
  return (b.x - hx) ** 2 + (b.y - hy) ** 2 <= b.r * b.r;
}
// where a free ball first comes down through height y (walls and floor bounces included, the net left out): { x, t }
function gc4Predict(ph, b, y, maxT = 4) {
  if (!b || b.state === 'shot') return null;
  const g = gc4G(ph), r = b.r, F = GC4.floor;
  let x = b.x, yy = b.y, vx = b.vx, vy = b.vy, bounces = b.bounces;
  const dt = 1 / 120;
  for (let t = 0; t < maxT; t += dt) {
    vy += g * dt; x += vx * dt; yy += vy * dt;
    if (x - r < 0) { x = r; vx = Math.abs(vx) * GC4.wallE; }
    if (vy > 0 && yy >= y) return { x, t };
    if (yy + r >= F) { yy = F - r; vy = -vy * GC4.floorE; vx *= 0.85; if (++bounces >= GC4.maxBounce) return { x, t, dead: true }; }
  }
  return null;
}
function gc4Ball(x, y, vx, vy) {
  return { x, y, vx, vy, r: GC4.ballR, state: 'free', bounces: 0, t: 0, cd: [0, 0], spin: 0, roll: 0, setT: 0, shot: null, trail: [] };
}
// he serves a ball at the setter (over the net, landing near them)
function gc4Serve(st) {
  const ph = st.ph, s = G.players[ph.setter], hand = gcBossPts(st.boss).hand, g = gc4G(ph);
  const kind = GC4_SERVES[ph.serves % GC4_SERVES.length], dir = s.x + s.w / 2 < ph.netX - 140 ? 1 : -1;
  const tx = clamp(s.x + s.w / 2 + dir * kind.aim + (gcRand() * 2 - 1) * GC4.serveDev, 70, ph.netX - 70), ty = GC4.floor - GC4.ballR, T0 = kind.T;
  ph.ball = gc4Ball(hand.x, hand.y, (tx - hand.x) / T0, (ty - hand.y - 0.5 * g * T0 * T0) / T0);
  st.boss.throwT = 0.45; ph.serves++; st.stats.finale.serves++;
  Sfx.play('gc4Serve');
  if (ph.serves === 1) gcSay(st, 'Catch! If you can!', 1.6);
  else if (kind.say && !st.say) gcSay(st, kind.say, 1.5);
}
// a swing that missed (or only plinked): a few in a row and the next swing waits a little
function gc4Whiff(ph, k) {
  ph.whiffN[k] = ph.t - ph.whiffT[k] < GC4.whiffGap ? ph.whiffN[k] + 1 : 1; ph.whiffT[k] = ph.t;
  ph.lock[k] = GC4.whiffLock * Math.min(3, ph.whiffN[k] - 1);
}
// a player's swing meets the ball: true for a good touch (a set or a shot), false for a plink
function gc4Touch(st, p, b) {
  const ph = st.ph, S = st.stats.finale, k = p.id, sp = 1 - ph.setter, cx = p.x + p.w / 2;
  b.cd[k] = GC4.touchCD;
  if (b.state === 'free') {
    if (k === ph.setter) {   // a set: up it goes, gold, drifting toward the spiker
      const q = G.players[sp], g = gc4G(ph), v = Math.sqrt(2 * g * GC4.setApex), ft = 2 * v / g;
      const tx = clamp(q.x + q.w / 2, 60, ph.netX - 60);
      b.vy = -v; b.vx = clamp((tx - b.x) / ft, -GC4.setMaxVx, GC4.setMaxVx); b.state = 'set'; b.setT = 0; b.bounces = 0;
      S.sets[k]++;
      gcPop(st, b.x, b.y - 30, 'Set!', C.gold, 24);
      Sfx.play('gc4Set', k); rumble(k, 0.15, 0.35, 60); burst(b.x, b.y, C.gold, 8);
      if (ph.setHints < 2) { ph.setHints++; gcHint(st, sp, 'Hit it! Jump for a SPIKE!', 2.2); }
      return true;
    } else {                 // the spiker touched it first: a little plink
      b.vy = -GC4.plinkVy; b.vx = clamp((G.players[ph.setter].x - b.x) * 0.6, -120, 120);
      gcPop(st, b.x, b.y - 26, 'Plink!', '#ffffff', 18); Sfx.play('gc4Plink', k);
      if (ph.plinkHintT <= 0) { ph.plinkHintT = GC4.hintGap; gcHint(st, k, NAMES[ph.setter] + ' sets it first!', 2); }
    }
    return false;
  }
  if (b.state !== 'set') return false;
  if (k === ph.setter) {     // hit twice by the same player: it plinks off (still gold)
    b.vy = -GC4.plinkVy; b.vx = clamp((G.players[sp].x - b.x) * 0.6, -140, 140);
    gcPop(st, b.x, b.y - 26, 'Pass it!', C.gold, 20); Sfx.play('gc4Plink', k);
    if (ph.plinkHintT <= 0) { ph.plinkHintT = GC4.hintGap; gcHint(st, k, 'Pass it! ' + NAMES[sp] + ' hits it!', 2); }
    return false;
  }
  // the spiker hits a gold ball: it flies into his belly
  const spike = !p.grounded && b.y < p.y + p.h * 0.5;
  b.state = 'shot'; b.shot = { t: 0, d: spike ? GC4.spikeT : GC4.bumpT, x0: b.x, y0: b.y, spike, by: k };
  b.trail = [];
  if (spike) { S.spikes[k]++; gcPop(st, cx, p.y - 30, 'SPIKE!', PCOL[k], 30); Sfx.play('gc4Spike', k); rumble(k, 0.5, 0.6, 140); burst(b.x, b.y, PCOL[k], 12); }
  else { S.bumps[k]++; gcPop(st, cx, p.y - 30, 'Nice hit!', PCOL[k], 24); Sfx.play('gc4Bump', k); rumble(k, 0.25, 0.4, 90); puff(b.x, b.y, 6, 'rgba(255,255,255,0.9)'); }
  if (!reduceMotion && spike) G.shake = Math.max(G.shake, 0.08);
  return true;
}
// a ball that leaves play without a bonk: a miss (help after a few in a row)
function gc4BallGone(st, why) {
  const ph = st.ph, b = ph.ball, S = st.stats.finale;
  ph.ball = null; ph.serveT = GC4.serveGap;
  if (!b || st.idle || !gc4Live(ph)) return;
  ph.missRow++; S.misses++;
  if (why === 'his') gcSay(st, gcRand() < 0.5 ? 'Mine! Ha!' : 'Ooh, a ball for me!', 1.5);
  if (b.state === 'set') gcHint(st, 1 - ph.setter, 'So close! Get under the gold ball.', 2.4);
  else gcHint(st, ph.setter, 'Bump it up before it rolls away!', 2.6);
  if (ph.missRow >= GC4.mittsAfter && ph.mitts < 1) { ph.mitts = 1; gcHelp(st, 'Big mitts! You can reach the ball from further away.'); }
  else if (ph.missRow >= GC4.slowAfter && ph.mitts < 2) { ph.mitts = 2; gcHelp(st, 'Floaty balls! They fall slower now.'); }
  else if (ph.missRow >= GC4.magnetAfter && ph.mitts < 3) { ph.mitts = 3; gcHelp(st, 'Magnet balls! They float right to you.'); }
}
// BONK: a shot reached his belly
function gc4Bonk(st) {
  const ph = st.ph, b = ph.ball, S = st.stats.finale, pieces = G.level.def.pieces || [4, 6, 1];
  const jar = gcBossPts(st.boss).jar;
  ph.ball = null; ph.bonks++; ph.missRow = 0; S.hits[b.shot.by]++;
  gcPop(st, jar.x - 20, jar.y - jar.r - 16, 'BOING!', C.gold, 36);
  Sfx.play('gc4Boink'); rumble(0, 0.5, 0.6, 220); rumble(1, 0.5, 0.6, 220);
  burst(jar.x, jar.y, '#ffffff', 10);
  const n = Math.floor((ph.bonks - 1) / GC4.bonksPer), piece = pieces[n];
  const left = GC4.bonksPer - ph.bonks % GC4.bonksPer;
  if (left < GC4.bonksPer) {   // the piece wiggles loose: more bonks to knock it out
    gcBossHit(st, gcRand() < 0.5 ? 'Ow! My tummy!' : 'Hey! Watch the jar!');
    ph.wiggle = piece; gcNews(st, left === 1 ? 'One more hit knocks it out!' : 'It wiggles! ' + left + ' more hits!');
  } else {
    ph.wiggle = 0;
    gcWinPiece(st, piece, { say: n === 0 ? 'Ow! My boxing glove!' : 'Not my cupcake! Whoa...' });
  }
  ph.stage = ph.bonks >= GC4.bonksPer * 2 ? 'land' : 'swap'; ph.stageT = 0; ph.serveT = GC4.serveGap;
}
function gc4SwapRoles(st) {
  const ph = st.ph;
  ph.setter = 1 - ph.setter; ph.setHints = 0; ph.serveT = GC4.swapGap;
  gcSwap(st);
  gcHint(st, ph.setter, NAMES[ph.setter] + ': now you set! ' + gc4Do(ph.setter), 3.5);
  gcHint(st, 1 - ph.setter, NAMES[1 - ph.setter] + ': now you spike! ' + gc4Spike(1 - ph.setter), 3.5);
}
function gc4BallStep(st, dt) {
  const ph = st.ph, b = ph.ball;
  if (!b) return;
  b.t += dt; b.spin += b.vx * dt * 0.03;
  for (let k = 0; k < 2; k++) b.cd[k] = Math.max(0, b.cd[k] - dt);
  if (b.state === 'shot') {   // flying into his belly (a curve that follows him)
    const s = b.shot, jar = gcBossPts(st.boss).jar;
    s.t += dt;
    const k = Math.min(1, s.t / s.d), e = s.spike ? k : k * (2 - k) * 0.5 + k * 0.5, u = 1 - e;
    const cx = (s.x0 + jar.x) / 2, cy = Math.min(s.y0, jar.y) - (s.spike ? 30 : 150);
    b.x = u * u * s.x0 + 2 * u * e * cx + e * e * jar.x; b.y = u * u * s.y0 + 2 * u * e * cy + e * e * jar.y;
    b.spin += dt * 14;
    if ((G.tickN % 2) === 0) { b.trail.push([b.x, b.y]); if (b.trail.length > 8) b.trail.shift(); }
    if (k >= 1) gc4Bonk(st);
    return;
  }
  if (b.roll > 0) {            // three bounces: it rolls away and poofs
    b.roll -= dt; b.x += b.vx * dt; b.vx *= 0.99;
    if (b.roll <= 0) { puff(b.x, b.y, 8, 'rgba(255,255,255,0.85)'); gc4BallGone(st, 'roll'); }
    return;
  }
  if (b.state === 'set') b.setT += dt;
  // swings and heads
  for (const p of G.players) {
    if (!p.alive || b.cd[p.id] > 0) continue;
    if (ph.sw[p.id] > 0 && p.stun <= 0 && gc4InReach(ph, p, b)) { ph.sw[p.id] = 0; if (gc4Touch(st, p, b)) ph.whiffN[p.id] = 0; else gc4Whiff(ph, p.id); continue; }
    // a ball dropping on a head bounces up again (a free second chance, no set)
    if (b.vy > 0 && b.x > p.x - 6 && b.x < p.x + p.w + 6 && b.y + b.r > p.y && b.y < p.y + 4) {
      b.y = p.y - b.r; b.vy = -GC4.headVy; b.vx = b.vx * 0.5 + p.vx * 0.3; b.cd[p.id] = 0.12;
      Sfx.play('gc4Bounce'); puff(b.x, b.y + b.r, 3, 'rgba(255,255,255,0.8)');
    }
  }
  // Magnet balls: a falling ball drifts toward whoever should touch it next
  const nx = gc4Next(ph);
  if (ph.mitts >= 3 && nx >= 0 && b.vy > 0 && b.x < ph.netX) { const q = G.players[nx]; b.vx = clamp(b.vx + clamp((q.x + q.w / 2 - b.x) * GC4.magnet, -500, 500) * dt, -260, 260); }
  const g = gc4G(ph), r = b.r, n = 2, sdt = dt / n, nx0 = ph.netX - GC4.netHalf, nx1 = ph.netX + GC4.netHalf, nt = GC4.floor - GC4.netH;
  for (let i = 0; i < n; i++) {
    b.vy += g * sdt; b.x += b.vx * sdt; b.y += b.vy * sdt;
    if (b.x - r < 0) { b.x = r; b.vx = Math.abs(b.vx) * GC4.wallE; Sfx.play('gc4Bounce'); }
    if (b.y + r >= GC4.floor && b.vy > 0) {
      b.y = GC4.floor - r; b.vy = -b.vy * GC4.floorE; b.vx *= 0.85; b.bounces++;
      Sfx.play('gc4Bounce'); puff(b.x, GC4.floor - 2, 4, 'rgba(255,255,255,0.8)');
      if (b.state === 'set') { b.state = 'free'; gcPop(st, b.x, b.y - 30, 'Oops!', '#ffffff', 18); }
      if (b.bounces >= GC4.maxBounce || Math.abs(b.vy) < 120) { b.roll = GC4.rollT; b.vy = 0; b.vx = (b.vx >= 0 ? 1 : -1) * Math.max(90, Math.abs(b.vx)); return; }
    }
    // the net pole and tape: it bounces back to your side
    const cx = clamp(b.x, nx0, nx1), cy = clamp(b.y, nt, GC4.floor), dx = b.x - cx, dy = b.y - cy;
    if (dx * dx + dy * dy < r * r && b.x < ph.netX + r) {
      if (b.y >= nt) { b.x = nx0 - r; b.vx = -Math.max(60, Math.abs(b.vx) * GC4.netE); }
      else { b.vy = -Math.abs(b.vy) * GC4.netE - 120; b.vx = -Math.max(60, Math.abs(b.vx) * GC4.netE); }
      Sfx.play('gc4Net');
    }
  }
  // over the net to his side, or lost: he keeps it
  if (b.x - r > ph.netX + 4 && b.t > 0.4 && b.vx >= 0) { burst(b.x, b.y, '#ffffff', 6); gc4BallGone(st, 'his'); return; }
  if (b.t > 14) gc4BallGone(st, 'roll');
}
// soft socks at whoever is waiting (never at the next player to touch the ball)
function gc4Attacks(st, dt) {
  const ph = st.ph;
  if (!gc4Live(ph) || !ph.ball || gcCalm(st) || st.junk.length) return;
  if ((ph.tossT -= dt) > 0) return;
  const next = gc4Next(ph), who = G.players.filter(p => p.alive && p.id !== next && !gcBusy(st, p));
  const j = who.length ? gcToss(st, who[0].id, { kind: gcRand() < 0.6 ? 'sock' : 'duck', maxX: ph.netX - 20, minX: 20 }) : null;
  ph.tossT = j ? GC4.tossGap[0] + gcRand() * (GC4.tossGap[1] - GC4.tossGap[0]) : 0.6;
}
// his hover over the net (part A), the dizzy landing, sitting for the pull
function gc4BossStep(st, dt) {
  const ph = st.ph, b = st.boss;
  if (ph.stage === 'land' && st.celebT <= 0 && !st.fly.length) {
    if (!ph.landing) { ph.landing = { t: 0, x0: b.x, y0: b.y }; b.pose = 'dizzy'; gcSay(st, 'Whoa... so dizzy...', 2); Sfx.play('gc4Dizzy'); }
    const L = ph.landing;
    L.t += dt;
    const k = Math.min(1, L.t / GC4.landT), e = k * k;
    b.x = L.x0 + (GC4.hoverX + 10 - L.x0) * k + Math.sin(L.t * 7) * 16 * (1 - k); b.y = L.y0 + (GC4.floor - L.y0) * e;
    if (k >= 1 && !L.down) {
      L.down = true; b.pose = 'sit'; b.gy = null; b.y = GC4.floor;
      Sfx.play('gcThud'); puff(b.x, GC4.floor - 4, 14, 'rgba(255,255,255,0.85)');
      if (!reduceMotion) G.shake = Math.max(G.shake, 0.2);
      rumble(0, 0.4, 0.4, 160); rumble(1, 0.4, 0.4, 160);
    }
    if (L.down && L.t >= GC4.landT + GC4.plugT) gc4StartPull(st);
    return;
  }
  if (ph.stage === 'pull' || ph.stage === 'done' || ph.landing) return;
  b.pose = 'hover'; b.gy = GC4.floor;
  const sw = GC4.swoop[ph.bonks >= GC4.bonksPer ? 1 : 0];
  b.x = GC4.hoverX + Math.sin(ph.t * 0.7) * sw; b.y = GC4.hoverY + Math.sin(ph.t * 1.1) * 12;
  b.face = -1;
}

/* --- part B: pull the plug --- */
function gc4StartPull(st) {
  const ph = st.ph;
  ph.stage = 'pull'; ph.stageT = 0; ph.u = 0; ph.hold = [-1, -1]; ph.lastPress = [-9, -9]; ph.pull = [false, false];
  ph.yank = null; ph.yankT = GC4.yankGap[0] + 1; ph.pullT = 0; ph.grip = false; ph.loneT = 0; ph.jolt = [0, 0]; ph.arrowT = 4; ph.nudgeT = 0;
  st.boss.armHidden = true; st.boss.mood = 'grumpy'; st.boss.moodT = 3;
  gcNews(st, 'He’s plugged in! Grab the cord and pull together!', false, 4);
  gcSay(st, 'Hey! That’s my power cord!', 2.2);
  gcActLabels(st); gcShowBadges(st);
  for (const p of G.players) gcHint(st, p.id, 'Stand on a knot, ' + gc4Do(p.id), 3.5);
}
// presses and grabs (before the players move). Holders keep their input (so the idle wait sees them pull); step pins
// them to their knot. Holding the action, a fresh press, or holding ◀ (away from him) all count as pulling.
function gc4PullPre(st, dt) {
  const ph = st.ph;
  for (const p of G.players) {
    const k = p.id, inp = p.input;
    if (ph.hold[k] >= 0) {
      if (p.pendingJump || !p.alive) { ph.hold[k] = -1; ph.pull[k] = false; continue; }   // jump lets go (and jumps)
      if (p.pendingAct) { p.pendingAct = false; gc4Press(st, p); }
      ph.pull[k] = inp.act || inp.left || ph.t - ph.lastPress[k] < GC4.pullHold;
      p.jumpBuf = 0;
      continue;
    }
    ph.pull[k] = false;
    if (!p.pendingAct) continue;
    p.pendingAct = false;
    if (!p.alive || p.stun > 0) continue;
    // grab the nearest free knot in reach
    let best = -1, bd = GC4.grabR;
    for (let i = 0; i < 2; i++) {
      if (ph.hold[1 - k] === i) continue;
      const d = Math.abs(p.x + p.w / 2 - gc4KnotX(ph, i));
      if (d < bd && p.grounded) { bd = d; best = i; }
    }
    if (best < 0) { gcHint(st, k, 'Walk to a knot on the cord!', 1.8); ph.arrowT = 2.5; continue; }
    ph.hold[k] = best; ph.lastPress[k] = ph.t; st.stats.finale.grabs[k]++; st.hints[k] = null;
    Sfx.play('gc4Grab', k); rumble(k, 0.1, 0.3, 60);
    if (ph.hold[1 - k] < 0) gcHint(st, 1 - k, NAMES[1 - k] + ', grab the cord too!', 2.5);
  }
}
function gc4Press(st, p) {
  const ph = st.ph, k = p.id;
  // a press adds a tug while the partner pulls too; presses closer than pressGap add pro rata (a turbo gains nothing)
  const share = Math.min(1, (ph.t - ph.lastPress[k]) / GC4.pressGap), partner = ph.pull[1 - k] || ph.t - ph.lastPress[1 - k] < GC4.pullHold;
  ph.lastPress[k] = ph.t; st.stats.finale.pulls[k]++;
  if (ph.hold[0] >= 0 && ph.hold[1] >= 0 && partner) ph.u = Math.min(1, ph.u + GC4.perPress * share * (ph.grip ? GC4.gripRate : 1));
  Sfx.play('gc4Pull', k);
}
function gc4PullStep(st, dt) {
  const ph = st.ph, S = st.stats.finale, both = ph.hold[0] >= 0 && ph.hold[1] >= 0, together = both && ph.pull[0] && ph.pull[1];
  ph.stageT += dt;
  if (ph.arrowT > 0) ph.arrowT -= dt;
  for (let k = 0; k < 2; k++) ph.jolt[k] = Math.max(0, ph.jolt[k] - dt * 4);
  // holders stand at their knot, facing him and leaning back
  for (const p of G.players) {
    const i = ph.hold[p.id];
    if (i < 0 || !p.alive) continue;
    const lean = ph.pull[p.id] ? 3 + Math.sin(ph.t * 14 + p.id) * 1.5 : 0;
    p.x = gc4KnotX(ph, i) - p.w / 2 - lean + ph.jolt[p.id] * 8; p.vx = 0; p.face = 1;
  }
  if (both) { ph.pullT += dt; S.pullT += dt; }
  if (together) ph.u = Math.min(1, ph.u + GC4.rate * (ph.grip ? GC4.gripRate : 1) * dt);
  // one pulling alone: a hint, never progress
  const lone = G.players.find(p => ph.hold[p.id] >= 0 && ph.pull[p.id] && !(ph.hold[1 - p.id] >= 0 && ph.pull[1 - p.id]));
  ph.loneT = lone && !gcCalm(st) ? ph.loneT + dt : 0;
  if (ph.loneT > 1.2) {
    ph.loneT = -GC4.hintGap;
    const q = G.players[1 - lone.id];
    gcHint(st, lone.id, 'Pull together!', 2);
    gcHint(st, q.id, ph.hold[q.id] >= 0 ? 'Pull! ' + gc4Do(q.id) : NAMES[q.id] + ', grab the cord!', 2.4);
    if (ph.hold[q.id] < 0) ph.arrowT = 2.5;
  }
  // someone not on the cord yet: a nudge now and then, with arrows at the free knots
  ph.nudgeT = both || gcCalm(st) ? 0 : ph.nudgeT + dt;
  if (ph.nudgeT > 6) { ph.nudgeT = 0; ph.arrowT = 2.5; for (const p of G.players) if (ph.hold[p.id] < 0) gcHint(st, p.id, 'Grab a knot on the cord!', 2.4); }
  if (!ph.grip && ph.pullT >= GC4.gripAfter) { ph.grip = true; S.grip = true; gcHelp(st, 'Super grip! Every pull counts more now.'); }
  // he tugs back now and then: his hand grabs the cord ("!"), then a yank
  if (ph.yank) {
    const y = ph.yank;
    y.t += dt;
    if (gcCalm(st) && !y.done) ph.yank = null;
    else if (!y.done && y.t >= GC4.yankWarn) {
      y.done = true;
      const loss = (together ? GC4.yankBoth : GC4.yankOne) * (ph.grip ? GC4.gripYank : 1);
      ph.u = Math.max(0, ph.u - loss); S.yanks++;
      for (const p of G.players) if (ph.hold[p.id] >= 0) { ph.jolt[p.id] = 1; rumble(p.id, 0.3, 0.3, 120); }
      Sfx.play('gc4Yank');
      gcPop(st, (gc4KnotX(ph, 0) + gc4PlugPos(st).x) / 2, GC4.floor - 70, together ? 'Hold tight!' : 'Whoa!', together ? C.gold : '#ffffff', 22);
    }
    if (y.t >= GC4.yankWarn + 0.45) ph.yank = null;
  } else if (both && !gcCalm(st) && ph.u < 0.92 && (ph.yankT -= dt) <= 0) {
    ph.yank = { t: 0, done: false };
    ph.yankT = GC4.yankGap[0] + gcRand() * (GC4.yankGap[1] - GC4.yankGap[0]);
    if (!st.say) gcSay(st, gcRand() < 0.5 ? 'Hmph! Mine!' : 'Give it back!', 1.2);
    Sfx.play('gcWhirr');
  }
  if (ph.u >= 1) gc4Unplug(st);
}
// the plug pops out: he powers down, his jar opens, the last piece flies home
function gc4Unplug(st) {
  const ph = st.ph, b = st.boss, pl = gc4PlugPos(st);
  ph.stage = 'done'; ph.yank = null; ph.popped = { t0: st.phT, x0: pl.x, y0: pl.y, x: pl.x, y: pl.y, vx: -260, vy: -320 };
  for (const p of G.players) if (ph.hold[p.id] >= 0) { ph.hold[p.id] = -1; p.vx = -200; p.vy = -260; p.grounded = false; }
  ph.pull = [false, false];
  st.stats.finale.unplugT = Math.round(ph.stageT * 10) / 10;
  gcPop(st, pl.x, pl.y - 40, 'POP!', C.gold, 38);
  Sfx.play('gc4Pop'); Sfx.play('gc4Bzzt');
  for (let n = 0; n < 16; n++) G.particles.push({ x: pl.x, y: pl.y, vx: (gcRand() - 0.5) * 300, vy: -60 - gcRand() * 240, life: 0.6, max: 0.6, col: gcRand() < 0.5 ? '#fff1a8' : '#7ec8ff', size: 2 + gcRand() * 2, grav: 600, kind: 'dot' });
  rumble(0, 0.7, 0.7, 260); rumble(1, 0.7, 0.7, 260);
  b.armHidden = false; b.pose = 'nap'; b.mood = 'sleepy';
  gcWinPiece(st, (G.level.def.pieces || [4, 6, 1])[2], { quiet: true });
  gcSay(st, 'Bzzzt... nap time...', 2.6);
  gcPhaseDone(st);
}

GC_PHASES.finale = {
  setup(st, L) {
    const ph = st.ph, def = L.def;
    if (!st.stats.finale) st.stats.finale = { sets: [0, 0], spikes: [0, 0], bumps: [0, 0], hits: [0, 0], serves: 0, misses: 0, grabs: [0, 0], pulls: [0, 0], yanks: 0, pullT: 0, unplugT: 0, grip: false };
    ph.netX = 600; ph.socket = { x: 0, y: GC4.floor - 30 };
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      const ch = def.map[ty][tx];
      if (ch === 'N') { ph.netX = tx * T + T / 2; L.grid[ty][tx] = '.'; }
      else if (ch === 'K') { ph.socket = { x: tx * T, y: (ty + 1) * T - 18 }; L.grid[ty][tx] = '.'; }
    }
    ph.setter = def.setter == null ? 0 : def.setter;
    ph.stage = 'rally'; ph.stageT = 0; ph.t = 0; ph.started = false;
    ph.ball = null; ph.serveT = GC4.firstServe; ph.serves = 0; ph.bonks = 0; ph.missRow = 0; ph.mitts = 0; ph.wiggle = 0;
    ph.sw = [0, 0]; ph.swA = [0, 0]; ph.lock = [0, 0]; ph.whiffT = [-9, -9]; ph.whiffN = [0, 0]; ph.setHints = 0; ph.plinkHintT = 0; ph.tossT = GC4.tossFirst;
    ph.u = 0; ph.hold = [-1, -1]; ph.pull = [false, false]; ph.lastPress = [-9, -9]; ph.jolt = [0, 0]; ph.yank = null; ph.arrowT = 0;
    ph.landing = null; ph.popped = null;
    const b = st.boss;
    b.pose = 'hover'; b.face = -1; b.x = GC4.hoverX; b.y = GC4.hoverY; b.gy = GC4.floor; b.armHidden = false;
  },
  pre(st, dt) {
    const ph = st.ph;
    if (ph.stage === 'pull') { gc4PullPre(st, dt); return; }
    for (const p of G.players) {
      if (!p.pendingAct) continue;
      p.pendingAct = false;
      // a swing (a press mid-swing doesn't stretch it, and none during a whiff lock)
      if (gc4Live(ph) && p.alive && p.stun <= 0 && ph.lock[p.id] <= 0 && ph.sw[p.id] <= 0) { ph.sw[p.id] = GC4.swingT; ph.swA[p.id] = 0.22; Sfx.play('gc4Swing', p.id); }
    }
  },
  step(st, dt) {
    const ph = st.ph;
    ph.t += dt;
    if (!ph.started) {
      ph.started = true;
      gcSay(st, 'You’ll never get the last ones!', 2.2);
      gcHint(st, ph.setter, NAMES[ph.setter] + ': ' + gc4Do(ph.setter) + ' to bump it up!', 4.5);
      const sp = 1 - ph.setter;
      gcHint(st, sp, NAMES[sp] + ': ' + gc4Spike(sp) + (actKey(sp) === 'touch' ? ' on gold balls!' : ' spikes gold balls!'), 4.5);
    }
    // nobody crosses the net
    for (const p of G.players) { const edge = ph.netX - GC4.netHalf - p.w; if (p.x > edge) { p.x = edge; p.vx = Math.min(0, p.vx); } }
    for (let k = 0; k < 2; k++) {
      ph.swA[k] = Math.max(0, ph.swA[k] - dt); ph.lock[k] = Math.max(0, ph.lock[k] - dt);
      // a swing that ran out without touching the ball is a miss; two close together and the next swing waits a bit
      if (ph.sw[k] > 0 && (ph.sw[k] -= dt) <= 0) { ph.sw[k] = 0; gc4Whiff(ph, k); }
    }
    if (ph.plinkHintT > 0) ph.plinkHintT -= dt;
    gc4BossStep(st, dt);
    if (ph.stage === 'pull') { gc4PullStep(st, dt); return; }
    if (ph.stage === 'done' || ph.stage === 'land') return;
    ph.stageT += dt;
    if (ph.stage === 'swap' && ph.stageT >= GC4.swapAfter && st.celebT <= 0) { ph.stage = 'rally'; ph.stageT = 0; gc4SwapRoles(st); }
    if (gc4Live(ph) && !ph.ball && !gcCalm(st) && (ph.serveT -= dt) <= 0) gc4Serve(st);
    gc4BallStep(st, dt);
    gc4Attacks(st, dt);
  },
  labels(st) {
    const ph = st.ph;
    if (ph.stage === 'pull' || ph.stage === 'land' || ph.stage === 'done') return ['pull', 'pull'];
    return ph.setter === 0 ? ['set', 'spike'] : ['spike', 'set'];
  },
  roles(st) {
    const ph = st.ph;
    if (ph.stage === 'pull' || ph.stage === 'land' || ph.stage === 'done') return ['Pull!', 'Pull!'];
    const r = []; r[ph.setter] = 'Set!'; r[1 - ph.setter] = 'Spike!'; return r;
  },
  busy(st, p) { const ph = st.ph; return ph.stage === 'pull' ? ph.hold[p.id] >= 0 : gc4Next(ph) === p.id; },
  hudText(st) {
    const ph = st.ph;
    const n = GC4.bonksPer * 2;
    return ph.stage === 'pull' || ph.stage === 'done' ? '' : 'Hits ' + Math.min(ph.bonks, n) + ' / ' + n;
  },
  hud(st) { gc4Hud(st); },
  statLine(st) { const s = st.stats.finale; return s && s.unplugT ? 'Plug pulled in ' + s.unplugT.toFixed(1) + ' s' : ''; },
  drawBack(st) { gc4DrawBack(st); },
  draw(st) { gc4Draw(st); },
  drawTop(st) { gc4DrawTop(st); },
};
GC_PHASES.finale.test = { GC4, predict: y => gc4Predict(G.mst.ph, G.mst.ph.ball, y), knotX: i => gc4KnotX(G.mst.ph, i), reach: (id, b) => gc4InReach(G.mst.ph, G.players[id], b || G.mst.ph.ball) };

// phase 4 sounds
Sfx.extra.gc4Serve = function () { this.tone(260, 0.12, 'triangle', 0.05, 520); this.tone(700, 0.06, 'square', 0.02, null, 0.06); };
Sfx.extra.gc4Swing = function (p) { this.tone(900 * p, 0.05, 'sine', 0.018, 1300 * p); };
Sfx.extra.gc4Set = function (p) { this.tone(520 * p, 0.08, 'triangle', 0.06, 880 * p); this.tone(1320, 0.12, 'sine', 0.03, 1760, 0.06); };
Sfx.extra.gc4Spike = function (p) { this.tone(240 * p, 0.12, 'sawtooth', 0.05, 90); this.tone(1400, 0.08, 'triangle', 0.04, 600, 0.02); };
Sfx.extra.gc4Bump = function (p) { this.tone(300 * p, 0.1, 'triangle', 0.06, 500 * p); };
Sfx.extra.gc4Plink = function (p) { this.tone(1500 * p, 0.05, 'square', 0.03, 1100 * p); };
Sfx.extra.gc4Bounce = function () { this.tone(180, 0.09, 'sine', 0.05, 320); };
Sfx.extra.gc4Net = function () { this.tone(420, 0.08, 'triangle', 0.04, 260); };
Sfx.extra.gc4Boink = function () { this.tone(160, 0.25, 'sine', 0.08, 420); this.tone(620, 0.12, 'square', 0.03, 900, 0.04); };
Sfx.extra.gc4Dizzy = function () { [660, 560, 470, 400].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.04, f * 0.9, i * 0.12)); };
Sfx.extra.gc4Grab = function (p) { this.tone(400 * p, 0.06, 'triangle', 0.05, 600 * p); };
Sfx.extra.gc4Pull = function (p) { this.tone(200 * p, 0.05, 'triangle', 0.035, 150 * p); };
Sfx.extra.gc4Yank = function () { this.tone(300, 0.16, 'sawtooth', 0.04, 140); };
Sfx.extra.gc4Pop = function () { this.tone(900, 0.06, 'square', 0.06, 300); this.tone(140, 0.2, 'sine', 0.07, 70, 0.03); };
Sfx.extra.gc4Bzzt = function () { this.tone(110, 0.5, 'sawtooth', 0.04, 60, 0.05); this.tone(220, 0.3, 'square', 0.015, 90, 0.1); };

/* --- phase 4 drawing --- */
function gc4DrawBack(st) {
  const F = GC4.floor, t = G.clock;
  // a backyard fence (Backyard Bash) with party bunting
  ctx.fillStyle = '#e8c896'; ctx.fillRect(0, F - 118, W, 118);
  ctx.fillStyle = 'rgba(138,88,51,0.28)';
  for (let x = 0; x < W; x += 36) ctx.fillRect(x, F - 118, 3, 118);
  ctx.fillStyle = '#d9b37a'; ctx.fillRect(0, F - 96, W, 8); ctx.fillRect(0, F - 40, W, 8);
  ctx.fillStyle = '#f0d7aa';
  for (let x = 0; x < W; x += 36) { ctx.beginPath(); ctx.moveTo(x + 2, F - 118); ctx.lineTo(x + 19, F - 132); ctx.lineTo(x + 35, F - 118); ctx.closePath(); ctx.fill(); }
  const cols = [C.pip, C.gold, C.bo, '#7fd36b', '#ff8fc7'];
  for (const [x0, x1, y0] of [[0, 330, 96], [630, 960, 96]]) {
    ctx.strokeStyle = 'rgba(28,26,54,0.45)'; ctx.lineWidth = 1.5; ctx.beginPath();
    const sag = k => y0 + Math.sin(k * Math.PI) * 26;
    for (let k = 0; k <= 1.001; k += 0.05) ctx.lineTo(x0 + (x1 - x0) * k, sag(k));
    ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const k = (i + 0.5) / 9, x = x0 + (x1 - x0) * k, y = sag(k), sw = Math.sin(t * 2 + i) * 2;
      ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); ctx.lineTo(x + sw, y + 20); ctx.closePath(); ctx.fill();
    }
  }
  // sunflowers in front of the fence (Sunny Meadow)
  for (const fx of [120, 260, 470, 880]) {
    const h = 70 + (fx % 3) * 12, sw = Math.sin(t * 1.5 + fx) * 3;
    ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(fx, F); ctx.quadraticCurveTo(fx + sw, F - h / 2, fx + sw, F - h); ctx.stroke();
    ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(fx + 8, F - h * 0.45, 10, 4, -0.5, 0, Math.PI * 2); ctx.fill();
    gcIcon(1, fx + sw, F - h, 15);
  }
  // the wall socket his cord is plugged into: a brass plate with a bolt in each corner and the cord's plug in it
  const s = st.ph.socket;
  ctx.fillStyle = GCB.brass; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(s.x - 8, s.y - 30, 30, 50, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = GCB.brassDk; for (const [bx, by] of [[s.x - 2, s.y - 24], [s.x + 16, s.y - 24], [s.x - 2, s.y + 14], [s.x + 16, s.y + 14]]) { circle(bx, by, 2.2); ctx.fill(); }
  ctx.fillStyle = '#ff9a3d'; rr(s.x + 4, s.y - 9, 18, 18, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.gold; circle(s.x + 7, s.y - 22, 3.5); ctx.fill();   // a little "on" light
}
// his power cord: from the wall socket along the floor to the plug in his side
function gc4CordPts(st) {
  const ph = st.ph, pl = gc4PlugPos(st);
  return { sx: ph.socket.x + 14, sy: ph.socket.y + 2, px: pl.x, py: pl.y };
}
// the popped plug's flight (from the time it popped): it lands on the floor and stays there
function gc4PoppedPos(st, q) {
  const t = Math.max(0, st.phT - q.t0), F = GC4.floor - 12, a = 900;
  const tl = (-q.vy + Math.sqrt(q.vy * q.vy + 2 * a * (F - q.y0))) / a, u = Math.min(t, tl);
  q.x = q.x0 + q.vx * u; q.y = Math.min(F, q.y0 + q.vy * u + 0.5 * a * u * u);
  return q;
}
function gc4DrawCord(st) {
  const ph = st.ph, F = GC4.floor, c = gc4CordPts(st);
  const line = (pts, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); };
  let pts;
  if (ph.stage === 'pull') {
    const k0 = gc4KnotX(ph, 0), k1 = gc4KnotX(ph, 1), hy = F - 13;
    pts = [[c.sx, c.sy], [c.sx + 16, F - 4]];
    for (let x = c.sx + 40; x < k1 - 40; x += 30) pts.push([x, F - 4 + Math.sin(x * 0.07) * 1.5]);
    pts.push([k1 - 20, F - 6], [k1, hy], [k0, hy], [c.px, c.py]);
  } else if (ph.popped) {
    const q = gc4PoppedPos(st, ph.popped);
    pts = [[c.sx, c.sy], [c.sx + 16, F - 4], [q.x - 60, F - 4], [q.x, q.y]];
  } else {
    // hanging from him (hovering or sitting) down to the floor, then along it to the wall
    const fx = Math.min(c.px - 30, ph.netX + 30);
    pts = [[c.sx, c.sy], [c.sx + 16, F - 4], [fx - 60, F - 4]];
    for (let k = 0; k <= 1.001; k += 0.1) { const u = 1 - k; pts.push([u * u * (fx - 60) + 2 * u * k * (fx + 30) + k * k * c.px, u * u * (F - 4) + 2 * u * k * (F - 4) + k * k * c.py]); }
  }
  line(pts, 9, '#4a2a5e'); line(pts, 5.5, '#ff9a3d');
  if (ph.stage === 'pull') {
    // the knots to grab, with a soft glow when free
    for (let i = 0; i < 2; i++) {
      const x = gc4KnotX(ph, i), y = F - 13, held = ph.hold.indexOf(i);
      if (held < 0) { ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.25 * Math.sin(G.clock * 5 + i)})`; circle(x, y, 16); ctx.fill(); }
      ctx.fillStyle = held < 0 ? '#ffb347' : PCOL[held]; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(x, y, 9); ctx.fill(); ctx.stroke();
    }
  }
  // the plug (in his side, sliding out, or flying off)
  const q = ph.popped && gc4PoppedPos(st, ph.popped), x = q ? q.x : c.px, y = q ? q.y : c.py;
  ctx.save(); ctx.translate(x, y); if (q) ctx.rotate(Math.min(st.phT - q.t0, 0.7) * 9);
  ctx.fillStyle = '#d9dbe8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
  const prong = q ? 14 : 8 + (ph.stage === 'pull' ? ph.u * 34 : 0);
  ctx.fillRect(10, -7, prong, 4); ctx.strokeRect(10, -7, prong, 4); ctx.fillRect(10, 3, prong, 4); ctx.strokeRect(10, 3, prong, 4);
  ctx.fillStyle = '#ff9a3d'; ctx.lineWidth = 2; rr(-12, -12, 24, 24, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(-9, -9, 8, 18, 3); ctx.fill();
  ctx.restore();
  if (!q && ph.stage === 'pull' && G.tickN % 10 === 0 && ph.u > 0.4) G.particles.push({ x: c.px + 16, y: c.py, vx: (gcRand() - 0.2) * 90, vy: -40 - gcRand() * 80, life: 0.35, max: 0.35, col: '#fff1a8', size: 2, grav: 300, kind: 'dot' });
}
function gc4DrawNet(st) {
  const ph = st.ph, F = GC4.floor, nx = ph.netX, top = F - GC4.netH;
  ctx.fillStyle = '#8a5833'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(nx - GC4.netHalf, top - 4, GC4.netHalf * 2, GC4.netH + 4, 3); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = top + 8; y <= top + 44; y += 9) { ctx.moveTo(nx - 28, y); ctx.lineTo(nx + 28, y); }
  for (let x = nx - 28; x <= nx + 28; x += 8) { ctx.moveTo(x, top + 4); ctx.lineTo(x, top + 44); }
  ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; rr(nx - 30, top, 60, 6, 3); ctx.fill(); ctx.stroke();
}
// the bouncy ball: white with coloured stripes; gold glow when set
function gc4DrawBall(st, b) {
  const set = b.state === 'set' || (b.state === 'shot');
  if (b.state === 'shot') for (let i = 0; i < b.trail.length; i++) { ctx.globalAlpha = (i + 1) / b.trail.length * 0.4; ctx.fillStyle = C.gold; circle(b.trail[i][0], b.trail[i][1], b.r * (0.5 + i / b.trail.length * 0.5)); ctx.fill(); }
  ctx.globalAlpha = b.roll > 0 ? clamp(b.roll / GC4.rollT, 0, 1) : 1;
  if (set) { ctx.fillStyle = `rgba(255,214,90,${0.35 + 0.2 * Math.sin(G.clock * 12)})`; circle(b.x, b.y, b.r + 9); ctx.fill(); }
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.spin);
  ctx.fillStyle = '#ffffff'; circle(0, 0, b.r); ctx.fill();
  const stripes = set ? [C.gold, '#ffe58a', C.gold] : ['#ff5f6d', '#5b95ff', '#ffd23f'];
  for (let i = 0; i < 3; i++) { ctx.fillStyle = stripes[i]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, b.r, i * 2.094, i * 2.094 + 0.9); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(0, 0, b.r); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(-5, -6, 4); ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}
function gc4Draw(st) {
  const ph = st.ph, F = GC4.floor, b = ph.ball;
  gc4DrawNet(st);
  gc4DrawCord(st);
  // the piece that wiggles loose in the jar's neck after a first bonk
  if (ph.wiggle && !st.won[ph.wiggle - 1]) { const P = gcBossPts(st.boss); gcIcon(ph.wiggle, P.jar.x + Math.sin(G.clock * 20) * 3, P.jar.y - P.jar.r + 4, 11); }
  // where a free ball comes down: a ring in the colour of whoever touches it next
  if (b && b.state !== 'shot' && b.roll <= 0) {
    const pr = gc4Predict(ph, b, F - b.r - 1), nx = gc4Next(ph);
    const sx = b.x, k = clamp(1 - (F - b.y) / 300, 0.2, 1);
    ctx.fillStyle = `rgba(28,26,54,${0.12 + 0.18 * k})`; ctx.beginPath(); ctx.ellipse(sx, F - 1, 10 + 12 * k, 3 + 2 * k, 0, 0, Math.PI * 2); ctx.fill();
    if (pr && nx >= 0) {
      ctx.strokeStyle = PCOL[nx]; ctx.globalAlpha = 0.55 + 0.35 * Math.sin(G.clock * 10); ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.ellipse(pr.x, F - 2, 24, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
  }
  // his grabby arm holds the cord while he sits (it tugs back)
  if (ph.stage === 'pull') {
    const P = gcBossPts(st.boss), y = ph.yank, gx = gc4PlugPos(st).x - 40, gy = F - 16;
    let hx = gx, hy = gy, open = 0.1;
    if (y) {
      const k = Math.min(1, y.t / GC4.yankWarn);
      if (!y.done) { hx = gx + Math.sin(y.t * 30) * 2; hy = gy - 28 * k; open = k; }
      else { const j = Math.min(1, (y.t - GC4.yankWarn) / 0.2); hx = gx + 26 * Math.sin(j * Math.PI); hy = gy; open = 0; }
    }
    gcDrawArm(P.shoulder.x, P.shoulder.y, hx, hy, st.boss.s, open, null);
  }
}
function gc4DrawTop(st) {
  const ph = st.ph, big = hudBig(), z = big ? 1.4 : 1, b = ph.ball;
  if (b) gc4DrawBall(st, b);
  // swing swooshes over the hitter's head
  for (const p of G.players) {
    const a = ph.swA[p.id];
    if (a <= 0 || !p.alive) continue;
    ctx.strokeStyle = `rgba(255,255,255,${a / 0.22})`; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + 6, 24 + (0.22 - a) * 40, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  }
  if (ph.stage === 'pull') {
    // the yank warning over the cord, and an arrow at a free knot after a nudge
    if (ph.yank && !ph.yank.done) bigText('!', gc4PlugPos(st).x - 40, GC4.floor - 66 - Math.abs(Math.sin(G.clock * 12)) * 5, 30 * z, '#ff5f6d', 1);
    if (ph.arrowT > 0) for (let i = 0; i < 2; i++) {
      if (ph.hold.includes(i)) continue;
      const ax = gc4KnotX(ph, i), ay = GC4.floor - 40 - (1 + Math.sin(G.clock * 7)) * 4;
      ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax - 10 * z, ay - 13 * z); ctx.lineTo(ax + 10 * z, ay - 13 * z); ctx.lineTo(ax, ay); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
}
// the plug meter (part B), over the players' side
function gc4Hud(st) {
  const ph = st.ph;
  if ((ph.stage !== 'pull' && ph.stage !== 'done') || G.introT > 0 || (st.cut && !st.cut.wait)) return;
  const big = hudBig(), w = big ? 300 : 240, h = big ? 22 : 16, x = 300 - w / 2, y = big ? 168 : 150, u = ph.stage === 'done' ? 1 : ph.u;
  text('Pull the plug!', 300, y - (big ? 18 : 14), big ? 22 : 17, C.ink, 'center');
  ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(x - 4, y - 4, w + 8, h + 8, (h + 8) / 2); ctx.fill();
  ctx.fillStyle = ph.grip ? C.gold : '#ff9a3d'; rr(x, y, Math.max(h, w * u), h, h / 2); ctx.fill();
  for (let k = 0; k < 2; k++) {   // a light per puller: lit while pulling
    const on = ph.hold[k] >= 0 && ph.pull[k], cx = x + (k === 0 ? -20 : w + 20);
    ctx.fillStyle = on ? PCOL[k] : 'rgba(28,26,54,0.35)'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; circle(cx, y + h / 2, big ? 11 : 8); ctx.fill(); ctx.stroke();
  }
}
/* ===== END GC PHASE 4 ===== */

/* ===== GC TEST HOOK (bots: window.__pipbo.MODES.collector.test) ===== */
MODES.collector.test = {
  GC, GC_PIECES, GC_PHASES,
  index: () => LEVELS.findIndex(l => l.mode === 'collector'),
  // swap in a seeded random for everything the mode rolls (gcRand)
  seed(n) { MODES.collector.rand = n == null ? Math.random : gcSeeded(n); },
  // start the level at phase k (0-3) with fresh state; the pieces of the earlier phases count as won.
  // o: { seed, intro (true keeps the room card up) }. Returns G.mst.
  jump(k = 0, o = {}) {
    const i = this.index();
    if (o.seed != null) this.seed(o.seed);
    loadLevel(i);
    const st = G.mst, rooms = LEVELS[i].rooms;
    for (let r = 0; r < k && r < rooms.length; r++) for (const n of rooms[r].pieces || []) { st.won[n - 1] = true; st.slotIn[n - 1] = true; }
    if (k > 0) { G.room = k - 1; nextRoom(); }
    if (!o.intro) G.introT = 0;
    return G.mst;
  },
  st: () => G.mst, ph: () => G.mst.ph, phase: () => G.mst.phase, calm: () => gcCalm(G.mst), pts: () => gcBossPts(G.mst.boss),
  won: () => G.mst.won.map((w, i) => (w ? i + 1 : 0)).filter(Boolean),
  win: n => gcWinPiece(G.mst, n), done: () => gcPhaseDone(G.mst), ending: () => gcEnding(G.mst),
  toss: (id, o) => gcToss(G.mst, id, o), claw: (id, o) => gcClaw(G.mst, id, o), bonk: (id, x) => gcBonk(G.mst, G.players[id], x),
};
