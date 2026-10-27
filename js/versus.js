/* Pip & Bo - Level modes and versus matches: the hook framework every World 4-7 level plugs into, plus best-of-N rounds,
   scores and knockbacks. The game has no enemies; its one computer opponent (Robo) is in js/levels/robo-pong.js. */
'use strict';

/* ---------- level modes (MODES) and best-of-N matches ----------
   A level def with mode: 'xyz' is run by MODES.xyz (full guide: API.md). All hooks are optional except setup:
     setup(st, L)          once per loadLevel (also on restart and rematch); st is G.mst (a fresh {}), L is G.level
     resetRound(n, info)   def.match levels: before every round's countdown, round 1 included (right after setup).
                           The framework has already put both players back on their spawns (see matchResetPlayers).
                           info = { first, replay, suddenDeath, wins: [pip, bo] }
     go(n)                 the moment round n goes live ("GO!"), before that tick's pre/step
     pre(dt)               every live tick, before the players move
     step(dt)              every live tick, after the players move (or the whole tick, when def.ownStep is true)
     idle(dt)              every frozen tick instead (level intro, round banner, 3-2-1, round-end banner)
     draw()                after the tiles, before the players          drawTop()  after the players, before particles
     hud()                 with the HUD (after the framework's pills)     stats()    lines for the results card
     timeUp()              def.match.roundTime ran out: return 0 / 1 / -1 or { winner, reason } (default: a tie)
     tiebreak()            a second tied round in a row: return 0 / 1 (or { winner, reason }) to award it, -1 to replay
     onKill(p) onRespawn(p) onStomp(p, o)   platformer events (only fire during live play)
     room(k, L)            a level with rooms moved on to room k
   Game state for a mode lives in G.mst (fresh every loadLevel, kept across rounds). */
const MODES = {};
const NO_INPUT = Object.freeze({ left: false, right: false, jump: false, down: false, up: false, act: false });
const KNOCK_FRICTION = 0.25; // ground/air friction is this much weaker while a knock() slide lasts
// match timing (seconds): "Round N" banner, each 3-2-1 beat, "GO!" flash, round-end banner, final banner,
// tick sounds in the last `warn` seconds of a timed round, tied rounds in a row before the match is called
const MATCH = { ready: 0.9, beat: 0.65, go: 0.7, end: 2.1, endFinal: 2.6, warn: 5, maxTies: 4 };
const matchFrozen = () => !!(G.match && G.match.phase !== 'live');
const isLive = () => !G.match || G.match.phase === 'live';
// Runs the level mode's hook `name` (if it has one) and returns its result. A hook that throws is logged once
// (per mode and hook) and skipped, so one bug in a level can't stop the game loop.
const hookErrs = new Set();
function hook(name, ...args) {
  const LM = G.lmode, f = LM && LM[name];
  if (typeof f !== 'function') return undefined;
  try { return f.apply(LM, args); } catch (e) {
    const key = (G.level && G.level.def.mode) + '.' + name;
    if (!hookErrs.has(key)) { hookErrs.add(key); console.error('MODES.' + key + '() threw (the game goes on):', e); }
    return undefined;
  }
}
// drawing hooks get their own canvas state, so a hook that throws (or forgets a restore) can't spoil the rest of the frame
function drawHook(name) { if (!G.lmode || !G.lmode[name]) return; ctx.save(); hook(name); ctx.restore(); }
// A fresh act press (p.pendingAct) the mode doesn't use expires after ACT_BUFFER seconds of live play, like a
// buffered jump, so a press made when it meant nothing can't fire seconds later.
const ACT_BUFFER = 0.12;
function ageActs(dt) {
  for (const p of G.players) {
    if (!p.pendingAct) { p.actAge = 0; continue; }
    p.actAge += dt;
    if (p.actAge > ACT_BUFFER) { p.pendingAct = false; p.actAge = 0; }
  }
}
// Knock a player back (a punch, a snowball...): set their speed, stun them briefly, and weaken friction for `slide`
// seconds so the hit really sends them sliding. vy < 0 lifts them off the ground.
function knock(p, vx, vy = 0, stun = 0.3, slide = 0.35) {
  if (!p.alive) return;
  p.vx = vx; p.carryVx = 0;
  if (vy) { p.vy = vy; p.grounded = false; p.jumping = false; p.offT = 0.05; }
  p.stun = Math.max(p.stun, stun); p.knockT = slide;
}

// the results-card lines a mode reports: strings, { label, value } or { label, values: [pip, bo] }
// (cleaned up: a missing value shows as '–', numbers become text lines, null and other junk entries are dropped)
const statVal = v => (typeof v === 'string' ? v : typeof v === 'number' && isFinite(v) ? String(v) : '–');
function modeStats() {
  const s = hook('stats') || [];
  return (Array.isArray(s) ? s : []).map(x => {
    if (typeof x === 'string') return x;
    if (typeof x === 'number') return isFinite(x) ? String(x) : null;
    if (!x || typeof x !== 'object') return null;
    const label = x.label == null ? '' : String(x.label);
    if (Array.isArray(x.values)) return { label, values: [statVal(x.values[0]), statVal(x.values[1])] };
    return { label, value: statVal(x.value) };
  }).filter(x => x !== null);
}
const parseWinner = r => (r === 0 || r === 1 ? { winner: r } : r && typeof r === 'object' && (r.winner === 0 || r.winner === 1) ? { winner: r.winner, reason: r.reason } : { winner: -1, reason: r && r.reason });

function newMatch(cfg) {
  const bestOf = Math.max(1, (cfg.bestOf | 0) || 3);
  return {
    bestOf, need: Math.ceil(bestOf / 2), wins: [0, 0], round: 1, phase: 'ready', t: 0, roundT: 0,
    history: [], ties: 0, suddenDeath: false, replay: false, lastBeat: 0, goT: 0,
    roundTime: cfg.roundTime || 0, timeLeft: cfg.roundTime || 0, lastSec: 0,
    freezeOnEnd: !!cfg.freezeOnEnd, maxTies: cfg.maxTies || MATCH.maxTies, end: null,
  };
}

// between rounds: both players back on their spawns, standing still, no stun, no buffered presses
function matchResetPlayers() {
  const L = G.level;
  G.spawnPts = L.spawns.map(s => ({ ...s }));
  G.players.forEach((p, k) => {
    const input = p.input;
    for (const key in input) input[key] = false;
    Object.assign(p, makePlayer(k), { x: L.spawns[k].x, y: L.spawns[k].y, input, prevJump: true, prevAct: true, sx: 0.6, sy: 1.4 });
    burst(p.x + p.w / 2, p.y + p.h / 2, 'rgba(255,255,255,0.9)', 10);
  });
  G.shake = 0;
}

function startMatchRound(first) {
  const m = G.match, replay = !first && !!m.end && m.end.winner < 0;
  if (!first && !replay) m.round++;
  m.replay = replay;
  if (!first) matchResetPlayers();
  m.phase = first && G.introT > 0 ? 'intro' : 'ready';
  m.t = 0; m.roundT = 0; m.lastBeat = 0; m.goT = 0; m.end = null;
  m.timeLeft = m.roundTime; m.lastSec = Math.ceil(m.roundTime);
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; p.jumpBuf = 0; p.kickQueued = false; }
  hook('resetRound', m.round, { first: !!first, replay, suddenDeath: m.suddenDeath, wins: m.wins.slice() });
  if (m.phase === 'ready') Sfx.play('roundStart');
}

// The level's code calls this when a round is decided: winner 0 = Pip, 1 = Bo, -1 = a tied round (replayed, not
// counted). reason is a short line for the banner and the results card ('Knocked off the hill!').
// It only counts during live play (returns false otherwise, e.g. a second call in the same round).
function matchRoundEnd(winner, reason = '') {
  const m = G.match;
  if (!m || m.phase !== 'live' || G.mode !== 'play') return false;
  winner = winner === 0 || winner === 1 ? winner : -1;
  reason = reason == null ? '' : String(reason);
  let tiebreak = false;
  if (winner < 0) {
    m.ties++;
    // tied twice in a row: the mode may break the tie (most hits, most paint...); otherwise it's replayed again
    if (m.ties >= 2 && G.lmode && G.lmode.tiebreak) {
      const r = parseWinner(hook('tiebreak'));
      if (r.winner >= 0) { winner = r.winner; reason = r.reason || 'Won the tiebreak!'; tiebreak = true; }
    }
  }
  m.history.push({ round: m.round, winner, reason, tiebreak, secs: Math.round(m.roundT * 10) / 10 });
  if (winner >= 0) { m.wins[winner]++; m.ties = 0; m.suddenDeath = false; }
  else m.suddenDeath = m.ties >= 2;
  // after maxTies tied rounds in a row the match is called: whoever has more rounds wins, or it's a draw
  const final = winner >= 0 ? m.wins[winner] >= m.need : m.ties >= m.maxTies;
  const matchWinner = !final ? null : winner >= 0 ? winner : m.wins[0] > m.wins[1] ? 0 : m.wins[1] > m.wins[0] ? 1 : -1;
  m.end = { winner, reason, tiebreak, final, matchWinner };
  m.phase = 'end'; m.t = 0; m.goT = 0;
  // nothing pressed before the end carries into the banner (a buffered jump would hop on landing)
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; p.jumpBuf = 0; p.kickQueued = false; }
  if (final) {
    Sfx.play(matchWinner >= 0 ? 'matchWin' : 'roundTie');
    const p = matchWinner >= 0 ? G.players[matchWinner] : null;
    for (let k = 0; k < 80; k++) confetti(p && p.alive ? p.x + p.w / 2 : W / 2, p && p.alive ? p.y : H / 2);
    rumble(0, 0.3, 0.6, 300); rumble(1, 0.3, 0.6, 300);
  } else if (winner >= 0) {
    Sfx.play('roundWin');
    const p = G.players[winner];
    if (p.alive) { burst(p.x + p.w / 2, p.y + p.h / 2, PCOL[winner], 16); for (let k = 0; k < 24; k++) confetti(p.x + p.w / 2, p.y); }
    rumble(winner, 0.2, 0.6, 200);
  } else Sfx.play('roundTie');
  return true;
}

function matchTimeUp() {
  const r = G.lmode && G.lmode.timeUp ? hook('timeUp') : -1;
  const w = parseWinner(r);
  matchRoundEnd(w.winner, w.reason || 'Time’s up!');
}

// advances the match one tick; true while the round is live (players can play), false while they're frozen
function matchTick(dt) {
  const m = G.match;
  m.t += dt;
  switch (m.phase) {
    case 'intro':
      if (G.introT <= 0) { m.phase = 'ready'; m.t = 0; Sfx.play('roundStart'); }
      return false;
    case 'ready':
      if (m.t >= MATCH.ready) { m.phase = 'count'; m.t = 0; m.lastBeat = 3; Sfx.play('beep'); }
      return false;
    case 'count': {
      const n = 3 - Math.floor(m.t / MATCH.beat);
      if (n <= 0) {
        m.phase = 'live'; m.t = 0; m.goT = MATCH.go; Sfx.play('go');
        rumble(0, 0.15, 0.35, 90); rumble(1, 0.15, 0.35, 90);
        hook('go', m.round);
        return m.phase === 'live'; // go() may already have ended the round
      }
      if (n !== m.lastBeat) { m.lastBeat = n; Sfx.play('beep'); }
      return false;
    }
    case 'live':
      m.roundT += dt;
      if (m.goT > 0) m.goT -= dt;
      if (m.roundTime > 0) {
        m.timeLeft = Math.max(0, m.timeLeft - dt);
        const sec = Math.ceil(m.timeLeft);
        if (sec !== m.lastSec) { m.lastSec = sec; if (sec > 0 && sec <= MATCH.warn) Sfx.play('tick'); }
        if (m.timeLeft <= 0) { matchTimeUp(); return false; }
      }
      return true;
    case 'end':
      if (m.t >= (m.end.final ? MATCH.endFinal : MATCH.end)) {
        if (m.end.final) { m.phase = 'over'; versusEnd(m.end.matchWinner); }
        else startMatchRound(false);
      }
      return false;
    default: return false; // 'over': the results card is on its way
  }
}

// the round-banner lines under "Round N"
function matchSubtitles() {
  const m = G.match, mp = [0, 1].filter(k => m.wins[k] === m.need - 1), out = [];
  if (m.need === 1) out.push(['Winner takes all!', C.gold]);
  else if (mp.length === 2) out.push(['Final round!', C.gold]);
  else if (mp.length === 1) out.push(['Match point, ' + NAMES[mp[0]] + '!', PCOL[mp[0]]]);
  else out.push(['Best of ' + m.bestOf + '  ·  first to ' + m.need + ' wins', '#d9d3ef']);
  if (m.replay) out.push([m.ties >= 2 ? 'Tied again! One more try' : 'Replay: that round was a tie', '#d9d3ef']);
  return out;
}

