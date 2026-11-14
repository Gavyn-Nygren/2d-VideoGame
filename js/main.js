/* Pip & Bo - Main game loop: game state, loading levels, the per-tick update, finishing levels, the frame loop,
   screen sizing and startup. */
'use strict';

const G = {
  mode: 'title', levelIndex: 0, level: null, players: [makePlayer(0), makePlayer(1)],
  time: 0, falls: 0, doorHold: 0, doorIn: [false, false], clearT: 0, introT: 0,
  crown: null, vs: null, results: [], particles: [], shake: 0, clock: 0, taut: false, spawnPts: [],
  mst: {}, lmode: null, match: null, // level mode state (G.mst), the level's MODES entry, best-of-N match state
  cpuOn: [false, false], // where the computer plays that character (1-player mode, js/cpu/cpu-core.js)
};
function parseLevel(def) {
  const grid = def.map.map(r => r.split(''));
  const L = { def, grid, spawns: [], plates: [], door: null, key: null, flags: [], crownSpawn: null, goal: null, sw: {},
    pads: [], spinners: [], portals: [], rings: [] };
  L.blockCol = grid.map(r => r.map(() => null));
  for (const [ch, cfg] of Object.entries(def.switches || {})) L.sw[ch] = { plate: cfg.plate, type: cfg.type, on: false, anim: 0, tiles: [] };
  for (let y = 0; y < ROWS; y++) {
    if (!grid[y] || grid[y].length !== COLS) console.warn('Level "' + def.name + '" row ' + y + ' is not ' + COLS + ' wide');
    for (let x = 0; x < COLS; x++) {
      const ch = grid[y][x];
      if (ch === '1' || ch === '2') { L.spawns[ch === '1' ? 0 : 1] = { x: x * T + (T - PW) / 2, y: (y + 1) * T - PH }; grid[y][x] = '.'; }
      else if (ch === 'a' || ch === 'b' || ch === 'c') { L.plates.push({ x, y, letter: ch, down: false }); grid[y][x] = '.'; }
      else if (ch === 'E') { L.door = { x: x * T, y: (y - 1) * T, w: 2 * T, h: 2 * T }; grid[y][x] = '.'; }
      else if (ch === 'k') { L.key = { x: x * T + T / 2, y: y * T + T / 2, got: false }; grid[y][x] = '.'; }
      else if (ch === 'F') { L.flags.push({ x: x * T, y: y * T, on: false }); grid[y][x] = '.'; }
      else if (ch === '*') { L.crownSpawn = { x: (x + 1) * T, y: y * T + T / 2 }; grid[y][x] = '.'; }
      else if (ch === 'G') { L.goal = { x: x * T, y: y * T }; grid[y][x] = '.'; }
      else if (ch === 'T') { L.tee = { x: x * T + T / 2, y: (y + 1) * T - GOLF.r }; grid[y][x] = '.'; }
      else if (ch === 'H') { L.cup = { tx: x, ty: y, x0: x * T, y0: y * T, x: x * T + T / 2 }; grid[y][x] = '.'; }
      else if (ch === 'J' || ch === 'R' || ch === 'L') { L.pads.push({ tx: x, ty: y, dir: ch === 'R' ? 1 : ch === 'L' ? -1 : 0, t: 0 }); grid[y][x] = '.'; }
      else if (ch === 'M') {
        const wm = Object.assign({ arms: 4, len: 66, speed: 1.4 }, def.windmill || {});
        L.spinners.push({ x: x * T + T / 2, y: y * T + T / 2, a: 0.4, arms: wm.arms, len: wm.len, hw: 5, w: wm.speed * (L.spinners.length % 2 ? -1 : 1), t: 0 });
        grid[y][x] = '.';
      }
      else if ('OQUV'.includes(ch)) { L.portals.push({ x: x * T + T / 2, y: y * T + T / 2, ch, pair: { O: 'Q', Q: 'O', U: 'V', V: 'U' }[ch], t: 0 }); grid[y][x] = '.'; }
      else if (ch === '@') { L.rings.push({ x: x * T + T / 2, y: y * T + T / 2, used: false, t: 0 }); grid[y][x] = '.'; }
      else if (L.sw[ch]) L.sw[ch].tiles.push({ x, y });
    }
  }
  // golf holes have no player starts: both stand by the tee
  if (L.tee && !L.spawns.length) L.spawns = [0, 1].map(k => ({ x: L.tee.x - 40 + k * 30, y: L.tee.y + GOLF.r - PH }));
  return L;
}

/* ---------- level flow ---------- */
// a level made of rooms plays them one after another; each room can change the rules (the cord)
function roomDef(def, k) {
  if (!def.rooms) return def;
  return Object.assign({}, def, def.rooms[k], { roomIndex: k, roomCount: def.rooms.length });
}
// opts.rematch: a best-of-N rematch skips the level intro card and goes straight to "Round 1"
// opts.ready: the level waits on its ready card until every person has readied up (startLevel, js/controls.js)
function loadLevel(i, mode = 'play', opts = {}) {
  G.levelIndex = i;
  G.room = 0;
  G.level = parseLevel(roomDef(LEVELS[i], 0));
  const L = G.level;
  applyTheme(LEVELS[i].world, L.def.theme);
  G.held = null; G.stretch = 0; G.climbHold = 0;
  G.time = 0; G.falls = 0; G.doorHold = 0; G.doorIn = [false, false]; G.clearT = 0;
  G.introT = mode === 'play' ? 2.6 : 0; G.introQuick = false; G.particles = []; G.taut = false; G.shake = 0;
  G.ropeLen = L.def.tether || 0; G.climbing = false;
  G.spawnPts = L.spawns.map(s => ({ ...s }));
  G.players.forEach((p, k) => {
    Object.assign(p, makePlayer(k), { x: L.spawns[k].x, y: L.spawns[k].y });
    p.prevJump = true;
  });
  G.crown = null; G.vs = null; G.build = null; G.activeSet = null; G.golf = null; G.pong = null;
  G.mst = {}; G.match = null; G.matchHudBox = null; G.lmode = L.def.mode ? MODES[L.def.mode] || null : null;
  if (L.def.mode && !G.lmode) console.warn('Level "' + L.def.name + '": no MODES.' + L.def.mode);
  if (L.def.pong) setupPong();
  document.documentElement.classList.toggle('lr-off', !!(L.def.pong && mode === 'play')); // ◀ ▶ do nothing in Pong
  if (L.def.golf) {
    G.golf = { hole: 0, golfer: 0, ball: 1, strokes: [0, 0], pars: L.def.rooms.map(h => h.par), bumps: {} };
    setupGolfHole(0);
    if (mode === 'play') G.introT = 3.6;
  }
  if (L.def.build) {
    G.build = { round: 0, rounds: L.def.build.rounds || 2, builder: 0, climber: 1, times: [null, null], squashes: [0, 0], pops: [0, 0], t: 0, piece: null, next: null, bag: [], phase: 'play', swapT: 0, spawnWait: 0, placed: 0, das: { dir: 0, t: 0, r: 0 } };
    setupBuildRound();
  }
  if (L.def.kind === 'versus' && !L.def.mode) { // Crown Keep
    G.crown = { x: L.crownSpawn.x, y: L.crownSpawn.y, holder: null, invuln: 0 };
    G.vs = { time: L.def.timeLimit, score: [0, 0], target: L.def.target, lastTick: Math.ceil(L.def.timeLimit) };
  }
  if (L.def.match) {
    if (opts.rematch && mode === 'play') G.introT = 0;
    G.match = newMatch(L.def.match);
  }
  G.mode = mode;
  setActUI(!!(L.def.act && mode === 'play'));
  setLegend(mode === 'play' ? LEVELS[i].legend : null);
  if (G.match) G.match.phase = G.introT > 0 ? 'intro' : 'ready'; // what round 1 starts with (setup may read it)
  hook('setup', G.mst, L);
  if (G.match) startMatchRound(true);
  cpuReset();
  if (mode === 'play') { if (opts.ready) showReadyCard(); else hideOverlay(); }
}

function step(dt) {
  const L = G.level, ps = G.players;
  G.time += dt; G.tickN = (G.tickN || 0) + 1; tapClock++;
  cpuTick(dt); // the computer player's presses for this step (1-player mode)
  if (G.introT > 0) G.introT -= dt;
  if (G.build) { buildStep(dt); if (G.mode !== 'play') return; }
  if (G.golf) { golfStep(dt); return; }
  if (G.pong) { pongStep(dt); return; }
  // level modes and best-of-N matches (nothing here runs for the older levels)
  const LM = G.lmode, live = G.match ? matchTick(dt) : true;
  if (G.mode !== 'play') return;
  if (!live) {
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; p.jumpBuf = 0; }
    hook('idle', dt);
    // frozen: during the round-end banner the world still moves (nobody can steer), so players land instead of hanging in the air
    if (G.match.phase !== 'end' || G.match.freezeOnEnd || L.def.ownStep) return;
  } else if (LM) {
    hook('pre', dt);
    if (G.mode !== 'play') return;
    if (L.def.ownStep) { if (isLive()) hook('step', dt); if (L.def.act) ageActs(dt); return; }
  }

  // buttons and the gates/bridges they drive
  for (const pl of L.plates) {
    const was = pl.down;
    pl.down = ps.some(p => p.alive && rectHit(p, pl.x * T + 3, pl.y * T + 18, T - 6, 12));
    if (pl.down && !was) Sfx.play('press');
  }
  for (const s of Object.values(L.sw)) {
    const want = L.plates.some(pl => pl.letter === s.plate && pl.down);
    if (want !== s.on) {
      const blocked = s.tiles.some(t => ps.some(p => p.alive && rectHit(p, t.x * T, t.y * T, T, T)));
      if (!blocked) { s.on = want; Sfx.play(want ? 'open' : 'close'); }
    }
    s.anim = approach(s.anim, s.on ? 1 : 0, dt * 7);
  }

  for (const p of ps) control(p, dt);
  separate();
  for (const p of ps) if (p.alive) { const pr = probe(p); p.tileGround = pr.tile; p.onPartner = pr.partner; }

  let rider = null, carrier = null;
  if (ps[0].alive && ps[1].alive) {
    if (ps[0].onPartner && !ps[0].tileGround) { rider = ps[0]; carrier = ps[1]; }
    else if (ps[1].onPartner && !ps[1].tileGround) { rider = ps[1]; carrier = ps[0]; }
  }
  if (rider) {
    const vsMode = isVersus();
    // In team levels the rider is carried sideways. In versus the player underneath can walk out.
    const dxc = moveX(carrier, carrier.vx * dt);
    if (dxc && !vsMode) moveX(rider, dxc, true);
    // The rider's own steps add to the ride, but never past normal running speed over the ground,
    // so both holding the same direction doesn't fling the rider off the front.
    let own = rider.vx * dt;
    if (!vsMode && dxc && Math.sign(own) === Math.sign(dxc)) {
      own = Math.sign(own) * Math.min(Math.abs(own), Math.max(0, PHYS.maxRun * dt - Math.abs(dxc)));
    }
    moveX(rider, own);
    const onHead = Math.abs(rider.y + rider.h - carrier.y) < 0.01;
    if (!rider.jumping && rider.offT <= 0 && (rider.vy >= carrier.vy - 1 || onHead)) {
      // A resting rider stays glued to the carrier's head, up and down.
      moveY(carrier, carrier.vy * dt, true);
      const wantY = carrier.y - rider.h, ry0 = rider.y;
      moveY(rider, wantY - rider.y, true);
      if (Math.abs(rider.y - wantY) > 0.01) {
        if (wantY < ry0) { // rider's head hit the ceiling, so the carrier stops rising too
          carrier.y = rider.y + rider.h; carrier.vy = Math.max(0, carrier.vy); carrier.jumping = false;
          rider.vy = carrier.vy;
        } // otherwise the rider landed on something the carrier passes through, and they part
      } else rider.vy = carrier.vy;
    } else {
      moveY(rider, rider.vy * dt);
      moveY(carrier, carrier.vy * dt);
    }
  } else {
    // in versus, who moves first alternates every tick so neither player wins every shove
    const [fx, sx] = isVersus() && (G.tickN & 1) ? [ps[1], ps[0]] : [ps[0], ps[1]];
    moveX(fx, fx.vx * dt); moveX(sx, sx.vx * dt);
    // the higher player moves first, so a player pushed up from below isn't moved twice
    const [up, lo] = ps[1].y < ps[0].y ? [ps[1], ps[0]] : [ps[0], ps[1]];
    moveY(up, up.vy * dt); moveY(lo, lo.vy * dt);
  }
  if (L.def.tether) tether(dt);
  for (const p of ps) postStep(p);
  if (G.mode !== 'play') return;
  if (LM && isLive()) { hook('step', dt); if (G.mode !== 'play') return; }
  if (L.def.act) ageActs(dt);

  // checkpoint flags
  for (const f of L.flags) {
    if (f.on) continue;
    const near = p => p.alive && rectHit(p, f.x - 30, f.y - 60, 90, 90);
    if (L.def.flagNeedsBoth ? ps.every(near) : ps.some(near)) {
      f.on = true;
      const y = f.y + T - PH;
      G.spawnPts = [{ x: clearSpot(f.x - 26, y, -1), y }, { x: clearSpot(f.x + 34, y, 1), y }];
      Sfx.play('flag');
      burst(f.x + 15, f.y - 10, C.grass, 12);
    }
  }
  // key
  if (L.key && !L.key.got) {
    const k = L.key;
    if (ps.some(p => p.alive && rectHit(p, k.x - 11, k.y - 11, 22, 22))) {
      k.got = true; Sfx.play('key'); burst(k.x, k.y, C.gold, 20); rumble(0, 0, 0.4, 90); rumble(1, 0, 0.4, 90);
    }
  }
  // door
  if (L.door) {
    const d = L.door;
    G.doorIn = ps.map(p => {
      if (!p.alive) return false;
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      return cx > d.x + 2 && cx < d.x + d.w - 2 && cy > d.y && cy < d.y + d.h;
    });
    const locked = L.key && !L.key.got;
    if (!locked && G.doorIn[0] && G.doorIn[1]) {
      G.doorHold += dt;
      if (G.doorHold >= 0.35) {
        if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return; }
        levelClear();
      }
    }
    else G.doorHold = 0;
  }
  // crown
  if (G.crown) {
    const c = G.crown, vs = G.vs;
    c.invuln -= dt;
    if (c.holder === null) {
      const touching = ps.filter(p => p.alive && p.stun <= 0 && rectHit(p, c.x - 13, c.y - 10, 26, 20));
      let taker = touching[0] || null;
      if (touching.length === 2) {
        const dist = p => Math.hypot(p.x + p.w / 2 - c.x, p.y + p.h / 2 - c.y);
        const d0 = dist(touching[0]), d1 = dist(touching[1]);
        taker = d0 === d1 ? touching[G.tickN & 1] : (d0 < d1 ? touching[0] : touching[1]);
      }
      if (taker) { c.holder = taker.id; c.invuln = 0.6; Sfx.play('crown'); burst(c.x, c.y, C.gold, 14); }
    } else {
      vs.score[c.holder] += dt;
      if (vs.score[c.holder] >= vs.target) { vs.score[c.holder] = vs.target; versusEnd(c.holder); return; }
    }
    vs.time -= dt;
    const sec = Math.ceil(vs.time);
    if (sec !== vs.lastTick) { vs.lastTick = sec; if (sec <= 10 && sec > 0) Sfx.play('tick'); }
    if (vs.time <= 0) {
      vs.time = 0;
      const s0 = Math.round(vs.score[0] * 10), s1 = Math.round(vs.score[1] * 10);
      versusEnd(s0 === s1 ? -1 : (s0 > s1 ? 0 : 1));
    }
  }
}

function nextRoom() {
  G.room++;
  G.level = parseLevel(roomDef(LEVELS[G.levelIndex], G.room));
  const L = G.level;
  G.doorHold = 0; G.doorIn = [false, false]; G.taut = false; G.held = null; G.stretch = 0;
  G.climbing = false; G.climbHold = 0; G.ropeLen = L.def.tether || 0; G.particles = [];
  G.spawnPts = L.spawns.map(s => ({ ...s }));
  G.players.forEach((p, k) => {
    const input = p.input;
    Object.assign(p, makePlayer(k), { x: L.spawns[k].x, y: L.spawns[k].y, input, prevJump: true });
  });
  G.introT = 3.4; G.introQuick = false;
  applyTheme(LEVELS[G.levelIndex].world, L.def.theme); // a room can have its own def.theme
  Sfx.play('room'); rumble(0, 0.2, 0.4, 120); rumble(1, 0.2, 0.4, 120);
  hook('room', G.room, L);
  cpuRoom();
}

// Nudge a checkpoint spawn sideways so nobody respawns standing on a button.
function clearSpot(x, y, dir) {
  const L = G.level;
  const onPlate = x => L.plates.some(pl => x < pl.x * T + T - 3 + 4 && x + PW > pl.x * T + 3 - 4);
  const ok = x => {
    const c1 = Math.floor(x / T), c2 = Math.floor((x + PW - 0.01) / T), row = Math.floor((y + PH + 1) / T);
    for (let c = c1; c <= c2; c++) if (tile(c, Math.floor(y / T)) === '#' || !'#=P'.includes(tile(c, row))) return false;
    return true;
  };
  for (let k = 0; k <= 60; k++) for (const d of [dir, -dir]) {
    const nx = x + d * k;
    if (ok(nx) && !onPlate(nx)) return nx;
  }
  return x;
}

function levelClear() {
  G.mode = 'clear'; G.clearT = 1.0;
  const i = G.levelIndex;
  const rec = { kind: 'team', time: G.time, falls: G.falls };
  if (G.build) { rec.build = { times: G.build.times.slice(), squashes: G.build.squashes.slice(), pops: G.build.pops.slice(), tower: isTower(), climbs: G.build.rounds / 2 }; rec.time = (G.build.times[0] || 0) + (G.build.times[1] || 0); }
  if (G.pong) {
    const P = G.pong;
    rec.pong = { score: P.score.slice(), won: P.score[0] > P.score[1], hits: P.hits.slice(), longest: P.longest };
    const prev = G.results[i] && G.results[i].pong; // a rematch you lose doesn't undo beating Robo earlier
    if (!rec.pong.won && prev) rec.pong.beaten = prev.won ? prev.score : prev.beaten;
  } else if (G.golf) {
    rec.golf = { strokes: G.golf.strokes.slice(), pars: G.golf.pars.slice() };
    const total = rec.golf.strokes[0] + rec.golf.strokes[1], best = levelRecord('golf', i);
    rec.best = best; rec.newBest = best == null || total < best;
    if (rec.newBest) store.set('golf:' + LEVELS[i].name, total);
  } else if (!LEVELS[i].noTime) {
    const best = levelRecord('best', i);
    rec.best = best;
    rec.newBest = best == null || rec.time < best;
    if (rec.newBest) store.set('best:' + LEVELS[i].name, rec.time);
  }
  if (G.lmode) rec.stats = modeStats();
  if (G.lmode) { const t = hook('resultTitle'); if (t) rec.title = String(t); }
  G.results[i] = rec;
  if (G.lmode && hook('quietClear')) return; // the mode ended in a loss (e.g. an endless level): no party
  if (rec.pong && !rec.pong.won) { Sfx.play('pointRobo'); return; } // Robo won: no party this time
  Sfx.play('clear'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
  if (rec.pong) { for (let k = 0; k < 70; k++) confetti(W / 2, 140); return; }
  const Lv = G.level;
  const d = Lv.door || (Lv.goal ? { x: Lv.goal.x - 15, y: Lv.goal.y, w: 30 } : Lv.cup ? { x: Lv.cup.x0, y: Lv.cup.y0 - 20, w: T } : { x: W / 2, y: H / 2, w: 0 });
  for (let k = 0; k < 70; k++) confetti(d.x + d.w / 2, d.y + 10);
}

// The end of a versus level. Crown Keep calls it directly; a best-of-N match calls it after the final round's banner
// (which already played the fanfare), and its record also has the rounds: { rounds: [pip, bo], bestOf, history, stats }.
// A versus mode without def.match can call versusEnd(winner) itself.
function versusEnd(winner) {
  G.mode = 'clear'; G.clearT = 1.2;
  const m = G.match;
  if (m) {
    G.clearT = 0.5;
    G.results[G.levelIndex] = { kind: 'versus', winner, rounds: m.wins.slice(), bestOf: m.bestOf, history: m.history.map(h => ({ ...h })), stats: modeStats() };
    return;
  }
  const rec = G.vs ? { kind: 'versus', winner, score: G.vs.score.slice() } : { kind: 'versus', winner };
  if (G.lmode) rec.stats = modeStats();
  G.results[G.levelIndex] = rec;
  Sfx.play('win');
  const p = winner >= 0 ? G.players[winner] : null;
  for (let k = 0; k < 70; k++) confetti(p ? p.x + p.w / 2 : W / 2, p ? p.y : H / 2);
}

window.addEventListener('gamepadconnected', () => readPads());
window.addEventListener('gamepaddisconnected', () => readPads());

try { if (matchMedia('(pointer: coarse)').matches) enableTouch(); } catch (e) { /* ignore */ }
/* ---------- main loop ---------- */
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame); // first, so an exception later in this frame can't stop the game loop
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  G.clock += dt;
  if (!G.manual) pollInput(dt);
  if (G.mode === 'play' && !G.manual) {
    acc += dt;
    let n = 0;
    while (acc >= DT && n < 8) { step(DT); acc -= DT; n++; if (G.mode !== 'play') break; }
    if (G.mode !== 'play') acc = 0;
  } else acc = 0;
  if (G.mode !== 'paused') {
    updateParticles(dt);
    G.shake = Math.max(0, G.shake - dt);
    for (const p of G.players) {
      const k = Math.min(1, dt * 12);
      p.sx += (1 - p.sx) * k; p.sy += (1 - p.sy) * k;
      p.blinkT -= dt; p.blink -= dt;
      if (p.blinkT <= 0) { p.blink = 0.12; p.blinkT = 2 + Math.random() * 3; }
    }
  }
  if (G.mode === 'clear') { G.clearT -= dt; if (G.clearT <= 0) showResult(); }
  render(dt);
}

/* ---------- sizing ---------- */
// the game fills the window. On a phone the see-through touch pads sit in the bottom corners and may cover up to this
// many pixels of the game's side edges (mostly the side walls), so the screen can use the full height.
const PAD_OVER = 40;
function fit() {
  const wrapW = stageWrap.clientWidth, wrapH = stageWrap.clientHeight;
  const touch = document.documentElement.classList.contains('has-touch') && Pads.kind === 'touch';
  const padPip = document.getElementById('padPip'), padBo = document.getElementById('padBo');
  const tb0 = clamp(Math.round(Math.min(wrapW, wrapH * 1.8) / 11), 44, 64), gap = 8;
  // levels with an action button get a round button (a bit bigger than the others) on each pad: on a third row above
  // jump/down ('rows', the pad stays two buttons wide), or in a third column ('cols') when that gives a bigger game screen
  const actOn = document.documentElement.classList.contains('act-on');
  const padSize = (b, shape) => !actOn ? [b * 2 + gap, b * 2 + gap]
    : shape === 'rows' ? [b * 2 + gap, b * 2 + 2 * gap + Math.round(b * 1.2)] : [b * 3 + 2 * gap + Math.round(b * 0.2), b * 2 + gap];
  // with touch, pads go in the side gutters when there's room, otherwise under the stage
  const fitIn = (aw, ah) => Math.max(0, Math.min(aw, ah * 16 / 9));
  let mode = 'none', availW = wrapW, availH = wrapH, tb = tb0, shape = 'rows', padW = 0, padH = 0, sideGap = 12, sideOut = 0;
  // 1-player mode: only the person's pad is shown, so only one side gutter is needed
  const one = cpuSolo(), humanLeft = cpuHuman() === 0;
  if (touch) {
    // pick whichever layout gives the bigger game screen (ties: pads beside it, then the act button on a third row)
    let best = null;
    for (const sh of actOn ? ['rows', 'cols'] : ['rows']) for (const md of ['side', 'below']) {
      let b = tb0, [pw, ph] = padSize(b, sh), sg = 12, so = md === 'side' ? PAD_OVER : 0;
      // short landscape phone, pads beside a game screen under half size (480px wide): the buttons shrink to the smallest
      // touch size, then the pads move closer to the screen and 8px into the side margins, so the screen gets the width
      const sideW = () => wrapW - (one ? 1 : 2) * (pw + sg - so), small = () => sideW() < Math.min(480, wrapH * 16 / 9);
      if (md === 'side') {
        // the buttons shrink a little (to 48px) while the pads would still squeeze a full-height screen
        while (b > 48 && sideW() < Math.min(wrapW, wrapH * 16 / 9)) { b--; [pw, ph] = padSize(b, sh); }
        while (b > 44 && small()) { b--; [pw, ph] = padSize(b, sh); }
        if (small()) sg = 6;
      }
      if (md === 'side' && actOn && ph > wrapH) continue;
      // two wide 3-column pads side by side under the screen: on a very narrow phone the buttons shrink a little to fit
      if (md === 'below' && sh === 'cols') while (b > 36 && 2 * pw + 12 > wrapW + 16) { b--; [pw, ph] = padSize(b, sh); }
      const aw = md === 'side' ? sideW() : wrapW, ah = md === 'side' ? wrapH : wrapH - ph - 10;
      const sw = fitIn(aw, ah);
      if (!best || sw > best.sw) best = { sw, md, sh, b, pw, ph, aw, ah, sg, so };
    }
    ({ md: mode, sh: shape, b: tb, pw: padW, ph: padH, aw: availW, ah: availH, sg: sideGap, so: sideOut } = best);
  }
  const ta = actOn ? Math.round(tb * 1.2) : 0;
  let w = fitIn(availW, availH), h = w * 9 / 16;
  w = Math.max(160, Math.floor(w)); h = Math.max(90, Math.floor(w * 9 / 16));
  stageScale = w / W;
  // (1-player side layout: centred when there's room, otherwise pushed over to make room for the one pad)
  const mid = Math.round((wrapW - w) / 2);
  const left = !(one && mode === 'side') ? mid : humanLeft ? Math.max(padW + sideGap - sideOut, mid) : Math.min(wrapW - padW - sideGap + sideOut - w, mid);
  const top = mode === 'below' ? Math.max(0, Math.round((availH - h) / 2)) : Math.max(0, Math.round((wrapH - h) / 2));
  Object.assign(stage.style, { width: w + 'px', height: h + 'px', left: left + 'px', top: top + 'px' });
  if (touch) {
    for (const pad of [padPip, padBo]) {
      pad.style.setProperty('--tb', tb + 'px'); pad.style.setProperty('--ta', (ta || tb) + 'px');
      pad.classList.toggle('arows', shape === 'rows'); pad.classList.toggle('acols', shape === 'cols');
    }
    if (mode === 'side') {
      const py = Math.max(0, top + h - padH);
      Object.assign(padPip.style, { left: Math.max(0, left - padW - sideGap) + 'px', top: py + 'px' });
      Object.assign(padBo.style, { left: Math.min(wrapW - padW, left + w + sideGap) + 'px', top: py + 'px' });
    } else {
      const py = top + h + 10;
      let px = left, bx = left + w - padW;
      if (actOn && bx - (px + padW) < 12) {
        // action pads wider than half the game screen: spread them toward the edges (up to 8px into the side margins)
        px = Math.max(0, Math.min(px, Math.round(wrapW / 2 - 6 - padW)));
        bx = Math.min(wrapW - padW, Math.max(bx, Math.round(wrapW / 2 + 6)));
      }
      Object.assign(padPip.style, { left: px + 'px', top: py + 'px' });
      Object.assign(padBo.style, { left: bx + 'px', top: py + 'px' });
    }
    if (actOn) fitActLabels();
  }
  // menus stay clear of the touch pads
  Object.assign(overlay.style, mode === 'side' ? { left: left + 'px', right: (wrapW - left - w) + 'px', bottom: '' }
    : mode === 'below' ? { left: '', right: '', bottom: (stageWrap.clientHeight - (top + h + 6)) + 'px' }
    : { left: '', right: '', bottom: '' });
  // the Menu button: in the spare space above or beside the game when there is some, otherwise a small icon on its corner
  const fab = document.getElementById('menuBtn'), fh = touch || document.documentElement.classList.contains('has-touch') ? 44 : 34;
  const sideRoom = wrapW - left - w, clear = top >= fh + 8 || sideRoom >= 104;
  fab.classList.toggle('tiny', !clear);
  fab.style.top = clamp(Math.round((top - fh) / 2), 4, 8) + 'px';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  fitMatchCard();
}
window.addEventListener('resize', fit);
try { new ResizeObserver(fit).observe(stageWrap); } catch (e) { /* older browsers use the resize event */ }

// testing hook: lets automated playtests read and drive the game.
// Set G.manual = true to stop the live loop from reading the keyboard and stepping, then call step(DT) yourself.
window.__pipbo = { PONG, G, LEVELS, loadLevel, nextRoom, BUNGEE, CHAIN, GOLF, step, parseLevel, PHYS, T, DT, showTitle, pause, resume,
  // versus framework
  MODES, WORLDS, MATCH, C, Sfx, matchRoundEnd, versusEnd, levelClear, showResult, knock, rumble, burst, puff, confetti, applyTheme,
  pollInput, readPad, fit, liveWorlds, worldLevels, levelCode, makePlayer, NO_INPUT, keys,
  // computer partner
  // controls
  Dev, Pads, playerDevice, btnLabel, btnHTML, drawBtn, controlsLine, startLevel, readyPress, Ready,
  CPU, cpuBrain, cpuBrainKey, cpuSeek, cpuApplyCfg, cpuSetCfg, cpuNav, cpuNavReach, cpuNavCell, NAV };

fit();
cpuLoadCfg();
showTitle();
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
