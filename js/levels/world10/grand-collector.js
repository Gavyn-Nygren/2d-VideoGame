/* Pip & Bo - Level 10-1 The Grand Collector (team boss, World 10 Grand Finale). */
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
     roles(st)         -> [pip badge, bo badge] ('Load!', 'Fire!') or null: shown over heads when the phase starts and
                       on gcSwap(st).
     busy(st, p)       -> true while p is mid-teamwork (at the cannon, on a valve...): shared attacks never target or bonk p.
     headLift(st, p)   -> px of things the phase draws over p's head, so badges and hints sit above them.
     onBonk(st, p)  onKill(st, p)  onRespawn(st, p)
     stat(st)          -> one results tile { label, value } or null.  statLine(st) -> a short results line or ''.
                       (These run at the end: read st.stats.<phase>, not st.ph, which then holds the last phase.)
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
  medal: { gold: { t: 270, bonks: 4 }, silver: { t: 420, bonks: 12 } },              // s and bonks (tune once every phase is in)
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
function gcHint(st, id, text, life = GC.hintLife, gold = false) { st.hints[id] = { text, t: 0, life, gold }; }
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
// flies home, confetti, then levelClear(). About 5 s after the last piece lands.
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
  if (at(0, 0)) { b.pose = 'nap'; b.mood = 'sleepy'; }
  if (at(1, 0.9)) { b.pose = 'sit'; b.mood = 'happy'; gcSay(st, 'I just wanted someone to play with...', 2.2); Sfx.play('gcWake'); }
  if (at(2, 2.2)) {
    gcHint(st, 0, 'You can play with us!', 2); gcHint(st, 1, 'Yes, play with us!', 2);
    for (const p of G.players) if (p.alive && p.grounded) jump(p, PHYS.jumpV * 0.7);
  }
  if (at(3, 3.1)) {
    b.pose = 'wave'; gcSay(st, 'Really? Yay! Thank you!', 2); st.home = { t: 0 };
    Sfx.play('gcHome'); rumble(0, 0.3, 0.5, 200); rumble(1, 0.3, 0.5, 200);
  }
  if (st.home) {
    st.home.t += dt;
    if ((G.tickN % 6) === 0) confetti(120 + gcRand() * (W - 240), 60 + gcRand() * 80);
  }
  if (at(4, 5.0)) levelClear();
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
// the hint text for how to aim on this player's device (seated roles that aim with ▲▼ and set power with ◀▶)
function gcAimKeys(id) {
  const touch = document.documentElement.classList.contains('has-touch') && Pads.kind === 'touch';
  const pad = Pads.kind === 'pad' && padFor(padSlots(), id);
  return pad ? 'stick ▲▼ aim, ◀▶ power, ' + glyph('a') + ' fire' : touch ? '▲▼ aim, ◀▶ power, round button fires'
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
  out.push(medal + ' trophy! ' + (bonks === 0 ? 'Not one bonk. ' : bonks <= 4 ? 'Hardly a bonk. ' : '') + 'The Grand Collector wants a rematch!');
  if (lines.length) out.push(lines.join(' · '));
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
  if (st.say && !b.hidden) {
    const P = gcBossPts(b), fs = Math.round(16 * z), a = clamp(Math.min(st.say.t / 0.12, (st.say.life - st.say.t) / 0.25), 0, 1);
    ctx.font = '400 ' + fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const tw = ctx.measureText(st.say.text).width + 26 * z, th = fs + 16 * z, B = gcStripBox();
    // beside his head on the side he faces (the other side if that is off the screen)
    let side = b.face, gap = P.head.r + 18 * z;
    if ((side < 0 && P.head.x - gap - tw < 6) || (side > 0 && P.head.x + gap + tw > W - 6)) side = -side;
    const bx = clamp(P.head.x + side * (gap + tw / 2), tw / 2 + 6, W - tw / 2 - 6);
    const by = clamp(P.head.y - P.head.r * 0.55, B.y0 + B.h + th / 2 + 10, H - th / 2 - 10);
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

/* --- drawing: the HUD --- */
// the pieces strip, top centre: "The Grand Collector" and 9 slots
function gcStripBox() {
  const big = hudBig(), sw = big ? 34 : 26, gap = big ? 5 : 4, w = 9 * sw + 8 * gap + 24, h = big ? 64 : 50;
  return { x0: W / 2 - w / 2, y0: 6, w, h, sw, gap, big, labY: 6 + (big ? 13 : 11), slotY: 6 + (big ? 26 : 21) };
}
function gcSlotPos(i) { const B = gcStripBox(); return { x: B.x0 + 12 + i * (B.sw + B.gap) + B.sw / 2, y: B.slotY + B.sw / 2, r: B.sw / 2 }; }
function gcDrawStrip(st) {
  const B = gcStripBox();
  ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(B.x0, B.y0, B.w, B.h, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(224,171,69,0.7)'; ctx.lineWidth = 2; rr(B.x0, B.y0, B.w, B.h, 14); ctx.stroke();
  text('The Grand Collector', W / 2, B.labY, B.big ? 14 : 11, C.gold, 'center', 'body');
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
}
// what draws over and under each player's head: role badges, then hint bubbles; under the feet when the top is taken
function gcDrawHeads(st, rightBox, newsBox) {
  if (G.introT > 0) return;
  const big = hudBig(), B = gcStripBox();
  const clearTop = (x0, x1) => {
    let y = 4;
    if (x0 < 290) y = 80;                                                     // the level and room pills
    if (x1 > B.x0 - 4 && x0 < B.x0 + B.w + 4) y = Math.max(y, B.y0 + B.h + 6); // the pieces strip
    if (newsBox && x1 > newsBox[0] - 4 && x0 < newsBox[1] + 4) y = Math.max(y, newsBox[2] + 6);
    if (rightBox && x1 > rightBox[0] - 4) y = Math.max(y, rightBox[1] + 6);
    return y;
  };
  const placed = [];
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
    const fs = big ? 17 : 12, bh = fs + (big ? 10 : 8), a = clamp(st.badgeT / 0.4, 0, 1);
    ctx.font = gcFont(fs);
    const bw = ctx.measureText(word).width + 16, bx = clamp(k.px, bw / 2 + 4, W - bw / 2 - 4), y0 = place(bx - bw / 2, bw, bh, k).y;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = PCOL[k.p.id]; rr(bx - bw / 2, y0, bw, bh, bh / 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    text(word, bx, y0 + bh / 2 + 0.5, fs, '#ffffff', 'center', 'body');
    ctx.restore();
  }
  for (const k of heads) {
    const h = st.hints[k.p.id];
    if (!h) continue;
    const a = clamp(Math.min(h.t, h.life - h.t) / 0.2, 0, 1), fs = big ? 19 : 12;
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
  // news (gold for help), under the strip
  let newsBox = null;
  const n = st.news;
  if (n && G.introT <= 0) {
    const nfs = big ? 19 : 14, nh = big ? 36 : 28, y = B.y0 + B.h + 6;
    ctx.font = gcFont(nfs);
    const w = Math.min(ctx.measureText(n.text).width + 34, W - 40), x = W / 2;
    newsBox = [x - w / 2, x + w / 2, y + nh];
    ctx.save(); ctx.globalAlpha = clamp(Math.min(n.t / 0.15, (n.life - n.t) / 0.3), 0, 1);
    ctx.fillStyle = 'rgba(28,26,54,0.85)'; rr(x - w / 2, y, w, nh, nh / 2); ctx.fill();
    if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x - w / 2, y, w, nh, nh / 2); ctx.stroke(); }
    text(n.text, x, y + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
    ctx.restore();
  }
  gcCall(ph, 'hud', st);
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

/* --- a simple phase, used as the placeholder for phases not built yet --- */
// Both players stand on their own star ('y' Pip, 'z' Bo in the map) and press the action at the same moment: that
// wins the room's next piece. A junk toss now and then goes at whoever is off their star.
// o: { pose, lift (px he hovers over his feet), junk (kind), say (his first line), ending (true: the last phase) }
const gcOnStar = (ph, p) => { const s = ph.stars && ph.stars[p.id]; return !!s && p.alive && p.grounded && Math.abs(p.x + p.w / 2 - s.x) < 20 && Math.abs(p.y + p.h - s.y) < 4; };
function gcPlaceholderPhase(o) {
  return {
    setup(st, L) {
      const ph = st.ph;
      ph.stars = [null, null]; ph.n = 0; ph.press = [-9, -9]; ph.t = 0; ph.tossT = 5; ph.pieces = (L.def.pieces || []).slice(); ph.over = false;
      for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
        const ch = L.grid[ty][tx];
        if (ch === 'y' || ch === 'z') { ph.stars[ch === 'y' ? 0 : 1] = { x: tx * T + T / 2, y: (ty + 1) * T }; L.grid[ty][tx] = '.'; }
      }
      const b = st.boss;
      b.pose = o.pose || 'stand';
      if (o.lift) { b.gy = b.y; b.y -= o.lift; }
      ph.said = false;
    },
    step(st, dt) {
      const ph = st.ph;
      ph.t += dt;
      if (!ph.said) { ph.said = true; if (o.say) gcSay(st, o.say); }
      if (ph.over) return;
      for (const p of G.players) {
        if (!p.pendingAct) continue;
        p.pendingAct = false;
        if (gcOnStar(ph, p)) { ph.press[p.id] = ph.t; Sfx.play('press'); } else gcHint(st, p.id, 'Stand on your star!', 1.5);
      }
      const both = G.players.every(p => gcOnStar(ph, p)), fresh = ph.press.every(t => ph.t - t < 0.6);
      if (both && fresh && st.celebT <= 0) {
        ph.press = [-9, -9];
        gcWinPiece(st, ph.pieces[ph.n++]);
        if (ph.n >= ph.pieces.length) {
          ph.over = true;
          if (o.ending) { st.boss.pose = 'nap'; gcSay(st, 'Bzzzt... nap time.', 2); gcEnding(st); } else gcPhaseDone(st);
        } else if (o.ending && ph.n === ph.pieces.length - 1) { st.boss.pose = 'sit'; st.boss.y = st.boss.gy != null ? st.boss.gy : st.boss.y; st.boss.gy = null; }
      } else for (const p of G.players) {
        const q = G.players[1 - p.id];
        if (ph.t - ph.press[p.id] > 0.3 && ph.t - ph.press[p.id] < 0.35 && ph.t - ph.press[q.id] > 0.6) gcHint(st, q.id, 'Press together!', 1.5);
      }
      if ((ph.tossT -= dt) <= 0) {
        ph.tossT = 7;
        const off = G.players.filter(p => p.alive && !gcOnStar(ph, p));
        if (off.length) gcToss(st, off[(gcRand() * off.length) | 0].id, { kind: o.junk || 'boot' });
      }
    },
    draw(st) {
      const ph = st.ph;
      for (let k = 0; k < 2; k++) {
        const s = ph.stars[k];
        if (!s) continue;
        const on = gcOnStar(ph, G.players[k]), glow = 0.5 + 0.5 * Math.sin(G.clock * 4 + k);
        ctx.fillStyle = on ? PCOL[k] : `rgba(255,255,255,${0.25 + 0.2 * glow})`; ctx.beginPath(); ctx.ellipse(s.x, s.y - 2, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
        gcStar(s.x, s.y - 18 - glow * 4, 11, PCOL[k]);
      }
    },
    labels: () => ['push', 'push'],
    roles: () => ['Your star!', 'Your star!'],
    busy: (st, p) => gcOnStar(st.ph, p),
  };
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
  hintT: 6, loaderHint: 8, fireHint: 10, carryLift: 18,
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
// each castle start and swap: a player's keys must all be let go once before they count
function gc1Input(ph, p) {
  const i = p.input, any = i.left || i.right || i.jump || i.down || i.up || i.act;
  if (ph.lock[p.id]) { if (!any) ph.lock[p.id] = false; p.pendingJump = false; p.pendingAct = false; return NO_INPUT; }
  return i;
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
  const ph = st.ph, cn = ph.cn, gn = G.players[ph.gunner], inp = gc1Input(ph, gn);
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
  const real = ld.input, inp = gc1Input(ph, ld);
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
  if (inp === NO_INPUT) ld.pendingAct = false;
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
  for (const b of ph.balls) b.dead = true;
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
      gcSay(st, 'Mine! All mine!', 2);
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
  roles(st) { const ph = st.ph; const r = []; r[ph.gunner] = 'Fire!'; r[ph.loader] = 'Load!'; return r; },
  busy(st, p) { const ph = st.ph; return p.id === ph.gunner || rectHit(p, ph.hop.x, ph.hop.y, ph.hop.w, ph.hop.h); },
  headLift(st, p) { const ph = st.ph; return p.id === ph.loader ? (ph.carry.powder && ph.carry.ball ? 44 : ph.carry.powder || ph.carry.ball ? 24 : 0) : 0; },
  hudText(st) { return 'Shots ' + st.ph.shots; },
  stat(st) { const s = st.stats.cannons; return s ? { label: 'Cannon shots', values: [s.fired[0], s.fired[1]] } : null; },
  statLine(st) { const s = st.stats.cannons; return s ? 'Castle blocks popped: ' + s.pops + (s.yoinks ? ' · Yoinks: ' + s.yoinks : '') : ''; },
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
// PLACEHOLDER: the phase 2 builder replaces everything between this line and END GC PHASE 2 with the real phase
// (Jackpot Reels, Lucky Casino look). It wins pieces 8 then 3 (the room def's pieces) and ends with gcPhaseDone(st).
GC_PHASES.reels = gcPlaceholderPhase({ pose: 'hover', lift: 120, junk: 'dice', say: 'Ha! You can’t reach me up here!' });
/* ===== END GC PHASE 2 ===== */

/* ===== GC PHASE 3: LAVA ===== */
// PLACEHOLDER: the phase 3 builder replaces everything between this line and END GC PHASE 3 with the real phase
// (Hot Floor Climb, Great Escapes look). It wins pieces 5 then 9 and ends with gcPhaseDone(st).
GC_PHASES.lava = gcPlaceholderPhase({ pose: 'sit', junk: 'pan', say: 'It’s getting toasty in here!' });
/* ===== END GC PHASE 3 ===== */

/* ===== GC PHASE 4: FINALE ===== */
// PLACEHOLDER: the phase 4 builder replaces everything between this line and END GC PHASE 4 with the real phase
// (Grand Finale: set and spike, then pull the plug). It wins pieces 4, 6, then 1, and ends the level with gcEnding(st).
GC_PHASES.finale = gcPlaceholderPhase({ pose: 'hover', lift: 90, junk: 'sock', say: 'You’ll never get the last ones!', ending: true });
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
  onStar: id => gcOnStar(G.mst.ph, G.players[id]),
};
