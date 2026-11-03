/* Pip & Bo - Computer partner: 1-player mode settings, the brain registry, and the per-tick loop that turns a brain's
   wishes into the same input a person would make (p.input, p.pendingJump, p.pendingAct). */
'use strict';

/* ---------- how it fits together ----------
   G.cpuOn = [pip, bo]: true where the computer plays that character. 1-player mode sets one of them; bot tests can set
   both (two computers playing together or against each other).
   Every physics step (step() in main.js) calls cpuTick(dt) first. For each computer player it asks the level's brain what
   to press and applies it exactly like pollInput does for a person, so every level reads the computer's presses the same
   way it reads a person's.

   A brain is registered with cpuBrain(key, { reset, think }):
     key       the level's def.mode ('koth', 'pizza'...), or for the older levels without a mode: 'level:<name>' for each
               World 1 level, 'build' (2-1, 2-2), 'pong' (2-3), 'crown' (2-4), 'golf' (World 3).
     reset(st, p, info)            optional: a level loaded or a new room started (st is a fresh {} for this player)
     bubblePos(p)                  optional: { x, y } of the top centre of where the level draws this player, for levels
                                   that draw players somewhere other than p.x / p.y (cars, a floe...)
     noIdleStop                    optional: true to keep playing when the person has pressed nothing for CPU.idleStop s
     think(st, p, o, dt, info)     every step while a level is playing (also during intro cards, countdowns and banners,
                                   when presses are ignored anyway). Returns { left, right, jump, down, up, act }.
                                   jump / act may be true (held), false, or 'tap' (a fresh press: pressed this step if it
                                   was up last step, otherwise let go, so asking for 'tap' every step presses every
                                   other step).
     p is the computer's player, o the partner (or opponent). info is described at cpuInfo below.
   A level with no brain uses the 'follow' brain (stay near the partner). A brain that throws is logged once and the
   computer stands still for that step. */
const CPU = {
  brains: {},
  st: [{}, {}],        // each computer player's brain state (fresh on every level load and room)
  last: [{}, {}],      // what each computer player pressed last step
  idle: [0, 0],        // seconds since each person last pressed anything
  bubbles: [null, null], // speech bubbles: { text, t, max }
  errs: new Set(),
  skillOf: [null, null], // bot tests: a skill name per player instead of the setting
  filter: null,          // bot tests: (p, out, dt) -> out, to make a computer player clumsy or slow on purpose
  idleStop: 30,          // 1-player mode: after this many seconds with the person pressing nothing, the computer waits too
  // the 1-player settings, saved in the browser
  cfg: { players: 2, human: 0, skill: 'normal' },
};
const CPU_SKILL = { easy: 0.35, normal: 0.7, hard: 1 };
const CPU_SKILL_NAMES = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
const cpuSkill = id => CPU_SKILL[(id != null && CPU.skillOf[id]) || CPU.cfg.skill] || 0.7;
const cpuOn = id => !!(G.cpuOn && G.cpuOn[id]);
const cpuSolo = () => !!(G.cpuOn && (G.cpuOn[0] !== G.cpuOn[1]));
// the person in 1-player mode (null with two people or two computers)
const cpuHuman = () => (cpuSolo() ? (G.cpuOn[0] ? 1 : 0) : null);

function cpuBrain(key, brain) { CPU.brains[key] = brain; }
function cpuBrainKey(def) {
  if (!def) return 'follow';
  if (def.mode) return def.mode;
  if (def.golf) return 'golf';
  if (def.build) return 'build';
  if (def.pong) return 'pong';
  if (def.kind === 'versus') return 'crown';
  return 'level:' + def.name;
}
const cpuBrainFor = def => CPU.brains[cpuBrainKey(def)] || CPU.brains.follow;

/* info passed to every brain:
     L, def      G.level and its def (a room's own def in levels with rooms)
     mst         G.mst, the level mode's state
     room        G.room (0-based)
     skill       0.35 easy, 0.7 normal, 1 hard. Team brains should help well at every skill (skill can set how quick
                 they react); versus brains should be beatable on easy and a real fight on hard.
     partnerCpu  true when the partner is also the computer (bot tests). Use it only to break ties ("who goes first")
                 the same way every time, so two computers never wait for each other forever.
     partnerIdle seconds since the partner (a person) pressed anything; 0 when the partner is the computer
     frozen      true during a match's intro, countdown and round-end banner (presses are ignored)
     intro       true while the level or room intro card shows
     time        G.time */
function cpuInfo(p) {
  const o = G.players[1 - p.id];
  return {
    L: G.level, def: G.level.def, mst: G.mst, room: G.room || 0, skill: cpuSkill(p.id),
    partnerCpu: cpuOn(o.id), partnerIdle: cpuOn(o.id) ? 0 : CPU.idle[o.id],
    frozen: matchFrozen(), intro: G.introT > 0, time: G.time,
  };
}

// a level was loaded (or restarted): fresh brain state for both players
function cpuReset() {
  CPU.st = [{}, {}]; CPU.last = [{}, {}]; CPU.bubbles = [null, null]; CPU.idle = [0, 0];
  cpuResetBrains();
}
// a new room started: fresh brain state, bubbles kept
function cpuRoom() { CPU.st = [{}, {}]; cpuResetBrains(); }
function cpuResetBrains() {
  if (!G.level) return;
  for (const p of G.players) {
    if (!cpuOn(p.id)) continue;
    const b = cpuBrainFor(G.level.def);
    if (b && b.reset) cpuCall(b, 'reset', [CPU.st[p.id], p, cpuInfo(p)]);
  }
}
function cpuCall(b, name, args) {
  try { return b[name].apply(b, args); } catch (e) {
    const key = cpuBrainKey(G.level && G.level.def) + '.' + name;
    if (!CPU.errs.has(key)) { CPU.errs.add(key); console.error('cpu brain ' + key + '() threw (the computer stands still):', e); }
    return null;
  }
}

// once per physics step, before anything moves
function cpuTick(dt) {
  if (!G.level || !G.cpuOn) return;
  // how long each person has gone without pressing anything
  for (const p of G.players) {
    if (cpuOn(p.id)) { CPU.idle[p.id] = 0; continue; }
    const i = p.input;
    CPU.idle[p.id] = i.left || i.right || i.jump || i.down || i.up || i.act ? 0 : CPU.idle[p.id] + dt;
  }
  for (const b of CPU.bubbles) if (b) b.t -= dt;
  if (G.mode !== 'play') return;
  for (const p of G.players) {
    if (!cpuOn(p.id)) continue;
    const brain = cpuBrainFor(G.level.def), o = G.players[1 - p.id];
    let out = (brain && cpuCall(brain, 'think', [CPU.st[p.id], p, o, dt, cpuInfo(p)])) || {};
    // the person walked away: the computer waits too (a level can opt out with brain.noIdleStop)
    if (!cpuOn(o.id) && CPU.idle[o.id] > CPU.idleStop && !(brain && brain.noIdleStop)) out = {};
    if (CPU.filter) out = CPU.filter(p, out, dt) || out;
    cpuApply(p, out);
  }
}
// the same rules pollInput uses for a person's keys
function cpuApply(p, out) {
  const last = CPU.last[p.id];
  const want = k => (out[k] === 'tap' ? !last[k] : !!out[k]);
  const j = want('jump'), a = want('act');
  p.input.left = !!out.left && !out.right; p.input.right = !!out.right && !out.left;
  p.input.down = !!out.down; p.input.up = !!out.up;
  if (j && !p.prevJump && G.mode === 'play') p.pendingJump = true;
  p.prevJump = j; p.input.jump = j;
  if (a && !p.prevAct && G.mode === 'play' && G.level && G.level.def.act) { p.pendingAct = true; p.actAge = 0; }
  p.prevAct = a; p.input.act = a;
  CPU.last[p.id] = { left: p.input.left, right: p.input.right, jump: j, down: p.input.down, up: p.input.up, act: a };
}

/* ---------- small helpers for brains ---------- */
const cpuCx = p => p.x + p.w / 2;
const cpuCy = p => p.y + p.h / 2;
const cpuFeet = p => p.y + p.h;
// steer left/right toward x (centre of the player), within `dead` px
function cpuSteer(out, p, x, dead = 4) {
  const d = x - cpuCx(p);
  out.left = d < -dead; out.right = d > dead;
  return Math.abs(d) <= dead;
}
// like cpuSteer, but for a platformer player: it lets go (or pushes back) early enough not to overshoot x, using the
// game's acceleration (on the ground or in the air), so it can stop on a button or land on a partner's head
function cpuSeek(out, p, x, dead = 3) {
  const d = x - cpuCx(p), v = p.vx, acc = p.grounded ? PHYS.fricG : PHYS.accA;
  out.left = out.right = false;
  if (Math.abs(d) <= dead) {
    if (Math.abs(v) > 40) { out.left = v > 0; out.right = v < 0; }
    return Math.abs(v) <= 40;
  }
  const toward = Math.sign(d);
  if (Math.sign(v) === toward && (v * v) / (2 * acc) >= Math.abs(d) - dead * 0.5) { out.left = v > 0; out.right = v < 0; }
  else { out.left = toward < 0; out.right = toward > 0; }
  return false;
}
// a short speech bubble over the computer player ("Your turn!", "Hop on!"); the same text again only refreshes it
function cpuSay(p, text, secs = 1.8) {
  if (!cpuOn(p.id) || !cpuSolo()) return;
  const b = CPU.bubbles[p.id];
  if (b && b.text === text && b.t > 0) { b.t = Math.max(b.t, secs * 0.5); return; }
  CPU.bubbles[p.id] = { text: String(text), t: secs, max: secs };
}
// a value as the computer saw it `delay` seconds ago (human-like reaction time). key names the value in st.
function cpuLag(st, key, value, delay) {
  const q = st['_lag_' + key] || (st['_lag_' + key] = []);
  q.push([G.time, value]);
  while (q.length > 1 && q[1][0] <= G.time - delay) q.shift();
  return q[0][1];
}
// a timer in st that counts up while cond is true and resets to 0 otherwise; returns the seconds
function cpuFor(st, key, cond, dt) { st['_for_' + key] = cond ? (st['_for_' + key] || 0) + dt : 0; return st['_for_' + key]; }
// true roughly `perSec` times per second (random), for wobble and mistakes
const cpuChance = (perSec, dt) => Math.random() < perSec * dt;

/* ---------- the default brain: stay near the partner ---------- */
cpuBrain('follow', {
  think(st, p, o, dt, info) {
    const out = {};
    if (!o.alive || !p.alive) return out;
    const dx = cpuCx(o) - cpuCx(p);
    if (Math.abs(dx) > 50) {
      if (typeof cpuNav === 'function') return cpuNav(st, p, cpuCx(o) - Math.sign(dx) * 30, cpuFeet(o), {}) || out;
      cpuSteer(out, p, cpuCx(o) - Math.sign(dx) * 30, 6);
    }
    return out;
  },
});

/* ---------- 1-player settings ---------- */
function cpuApplyCfg() {
  const c = CPU.cfg, was = G.cpuOn ? G.cpuOn.slice() : [false, false];
  G.cpuOn = c.players === 1 ? [c.human === 1, c.human === 0] : [false, false];
  // a character the computer stops playing lets go of everything it held
  G.players.forEach((p, k) => {
    if (was[k] !== G.cpuOn[k]) { for (const key in p.input) p.input[key] = false; p.pendingJump = false; p.pendingAct = false; p.prevJump = true; p.prevAct = true; }
  });
  if (G.cpuOn.some(Boolean) && G.level) { CPU.st = [{}, {}]; CPU.last = [{}, {}]; cpuResetBrains(); }
  const root = document.documentElement;
  root.classList.toggle('solo', cpuSolo());
  root.classList.toggle('cpu-pip', !!G.cpuOn[0]); root.classList.toggle('cpu-bo', !!G.cpuOn[1]);
  if (typeof refreshGlyphs === 'function') refreshGlyphs();
}
function cpuLoadCfg() {
  const s = store.get('cpu');
  if (s && typeof s === 'object') {
    if (s.players === 1 || s.players === 2) CPU.cfg.players = s.players;
    if (s.human === 0 || s.human === 1) CPU.cfg.human = s.human;
    if (CPU_SKILL[s.skill]) CPU.cfg.skill = s.skill;
  }
  cpuApplyCfg();
}
function cpuSetCfg(k, v) {
  CPU.cfg[k] = v;
  store.set('cpu', CPU.cfg);
  cpuApplyCfg();
  cpuSyncCfgUI();
}
// the "Players" chooser on the title and pause cards
function cpuCfgHTML() {
  const c = CPU.cfg, on = (k, v) => (c[k] === v ? ' aria-pressed="true"' : ' aria-pressed="false"');
  const seg = (k, v, label) => `<button type="button" class="seg" data-act="cpucfg" data-k="${k}" data-v="${v}"${on(k, v)}>${label}</button>`;
  return `<div class="cpu-cfg">
      <div class="seg-row" role="group" aria-label="Players"><span class="seg-k">Players</span>${seg('players', 2, '2 players')}${seg('players', 1, '1 player + computer')}</div>
      <div class="seg-row cpu-more" role="group" aria-label="1-player options"${c.players === 1 ? '' : ' hidden'}>
        <span class="seg-k">You play</span>${seg('human', 0, '<span class="nm-pip">Pip</span>')}${seg('human', 1, '<span class="nm-bo">Bo</span>')}
        <span class="seg-k">Computer</span>${seg('skill', 'easy', 'Easy')}${seg('skill', 'normal', 'Normal')}${seg('skill', 'hard', 'Hard')}
      </div>
      <p class="hint cpu-more"${c.players === 1 ? '' : ' hidden'}>${cpuSoloLine()}</p>
    </div>`;
}
function cpuSoloLine() {
  const h = CPU.cfg.human, cpuName = NAMES[1 - h];
  return `The computer plays ${cpuName}: it helps in team levels and plays against you in versus levels. ` +
    `Use ${h === 0 ? 'W A S D or the arrow keys' : 'the arrow keys or W A S D'}, any controller, or the ${h === 0 ? 'left' : 'right'} touch buttons.`;
}
function cpuSyncCfgUI() {
  const c = CPU.cfg;
  overlay.querySelectorAll('[data-act="cpucfg"]').forEach(b => {
    const v = b.dataset.v, val = /^\d+$/.test(v) ? +v : v;
    b.setAttribute('aria-pressed', String(c[b.dataset.k] === val));
  });
  overlay.querySelectorAll('.cpu-more').forEach(el => { el.hidden = c.players !== 1; });
  overlay.querySelectorAll('.cpu-cfg .hint').forEach(el => { el.textContent = cpuSoloLine(); });
  overlay.querySelectorAll('[data-cpu-eyebrow]').forEach(el => { el.textContent = c.players === 1 ? '1 player + computer' : '2 players'; });
}

/* ---------- drawing: "CPU" on the name tag and speech bubbles ---------- */
function cpuDraw() {
  if (!cpuSolo() || G.mode === 'title') return;
  for (const p of G.players) {
    const b = CPU.bubbles[p.id];
    if (!b || b.t <= 0 || !p.alive) continue;
    const a = clamp(Math.min(b.t / 0.3, (b.max - b.t) / 0.15, 1), 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = '700 13px "Atkinson Hyperlegible", sans-serif';
    const tw = ctx.measureText(b.text).width, w = tw + 16, h = 22;
    const br = cpuBrainFor(G.level.def), at = (br && br.bubblePos && cpuCall(br, 'bubblePos', [p])) || { x: cpuCx(p), y: p.y };
    const px = at.x, x = clamp(px - w / 2, 4, W - w - 4), y = clamp(at.y - 44, 4, H - h - 4);
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = PDARK[p.id]; ctx.lineWidth = 2;
    rr(x, y, w, h, 10); ctx.fill(); ctx.stroke();
    const tx = clamp(px, x + 10, x + w - 10);
    ctx.beginPath(); ctx.moveTo(tx - 5, y + h - 1); ctx.lineTo(tx + 5, y + h - 1); ctx.lineTo(tx, y + h + 6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(tx - 5, y + h); ctx.lineTo(tx, y + h + 6); ctx.lineTo(tx + 5, y + h); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.text, x + w / 2, y + h / 2 + 0.5);
    ctx.restore();
  }
}
