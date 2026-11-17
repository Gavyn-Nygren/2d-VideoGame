/* Pip & Bo - Level 7-3 Laser Vault (team). */
'use strict';

/* ===== 7-3 Laser Vault (mode 'laser', team, World 7 Castle Quest) =====
   One player (the lookout) sits in the lit window and steers a lantern spot; hidden laser beams glow only in its light.
   The other (the runner) walks, jumps and ducks past them to the treasure. Roles swap every room; room 4 ends with an
   alarm escape. Stars per room from the zaps. Names: LASER*, laser*, Sfx.extra.laser*; hooks MODES.laser.test / .debug. */
const LASER = {
  // the lookout's lantern spot
  spotR: 72, spotSpeed: 340, spotAcc: 2800, spotFric: 3600,
  afterglow: 1.0,          // s a beam keeps glowing after the light leaves it
  ghostA: 0.3,             // alpha of a known (zapped) beam in the dark
  // beams
  beamHalf: 2,             // half thickness of the zap line (px)
  insetX: 3, insetY: 2,    // runner hitbox inset against beams (forgiving)
  onGrace: 0.2,            // s a beam that just switched on cannot zap yet (it flickers)
  warnPre: 0.45,           // s before a blinker wakes: its sleeping line flickers
  bankWarn: 1.5,           // s before a flipped wall comes back: it ticks and flickers
  // runner
  duckH: 14, duckMul: 0.45,
  zapHold: 0.6, zapGone: 0.3,
  // act
  flipReach: 0.8,          // x spot radius: a fuse box this close to the spot centre gets flipped
  pingLife: 1.3, pingCool: 0.3, shoutLife: 1.3, shoutCool: 0.8, callLife: 1.8,
  // help
  brightAt: 5, brightMul: 1.35, dustAt: 9, wallNear: 60, autoCall: 4, lookNudge: 7, runNudge: 10, nudgeRepeat: 8,
  // flow
  introHold: 0.6, winHold: 2.4, hintTime: 9,
  phoneBeam: 1.5,          // beam line width factor when hudBig() (phones)
  phoneText: 1.5,          // bubble / HUD text factor when hudBig()
  star3: 1, star2: 4,      // stars per room: <= star3 zaps = 3, <= star2 zaps = 2, more = 1 (kind to young runners)
  rugReach: 16,            // px: a rug lights when the runner's centre is this close to its tile (a run-up for a jump counts)
  spotFree: 24,            // px the light must move from its start before it can find secret coins (none pop by themselves)
  aheadX: 200, aheadY: 160, // a light on the runner, or up to this far ahead of them, is helping: no "move the light!" nudge
                            //   (it may be parked on the spinner or the next beam for timing), unless they are stuck at a wall
  lockChip: 0.6,           // s a player stays locked (holding something from the card) before "Let go of the buttons!" shows
  vault: { x0: 30, x1: 930, y0: 120, y1: 450 },
  lampY: 112,
};
const LASER_BANKCOL = { A: '#43e8a0', B: '#b58cff', C: '#4fd6ff' };
const LASER_SHAPE = { A: 'circle', B: 'triangle', C: 'square' };
const LASER_PRIZE = { gem: '#7fe0ff', emerald: '#5ff0a0', amethyst: '#c79bff' };

const laserKeyOf = (c, r) => c + ',' + r;
const laserZ = () => hudBig() ? LASER.phoneText : 1;
// each player's last-used device ('pad' | 'touch' | 'kb'), so with one pad and one keyboard each hint shows its own keys
// (Pads.kind is global and follows whoever pressed last). Kept across rooms and levels; null = not seen yet.
const LASER_DEV = [null, null];
function laserPadState(id) { try { const pd = padFor(padSlots(), id); return pd ? Pads.prev[pd.ix] || null : null; } catch (e) { return null; } }
function laserSeeDevices() {
  try {
    for (const id of [0, 1]) {
      const ps = laserPadState(id), ts = touchState[id];
      if (ps && ps.active) LASER_DEV[id] = 'pad';
      else if (ts && Object.keys(ts).some(k => ts[k])) LASER_DEV[id] = 'touch';
      else if (Object.keys(BIND[id]).some(k => BIND[id][k].some(c => keys.has(c)))) LASER_DEV[id] = 'kb';
    }
  } catch (e) { /* the hints fall back to the global device */ }
}
function laserDev(id) {
  const d = LASER_DEV[id];
  if (d === 'pad' && padFor(padSlots(), id)) return 'pad';
  if (d === 'touch' && document.documentElement.classList.contains('has-touch')) return 'touch';
  if (d === 'kb') return 'kb';
  const touch = document.documentElement.classList.contains('has-touch') && Pads.kind === 'touch';
  return Pads.kind === 'pad' && padFor(padSlots(), id) ? 'pad' : touch ? 'touch' : 'kb';
}
// hint text with the player's real keys (like golfKeys); the runner's act is a shout, the lookout's a flip
function laserKeys(id, role) {
  const dev = laserDev(id), pad = dev === 'pad', touch = dev === 'touch';
  if (role === 'look') return pad ? 'stick moves the light  ' + glyph('a') + ' flip'   // (lead review) A flips on a pad
    : touch ? '◀ ▶ ▲ ▼ move the light  round button: flip'
    : id === 0 ? 'W A S D move the light  F flip' : 'arrow keys move the light  / flip';
  return pad ? 'stick move  ' + glyph('a') + ' jump  down: duck  ' + glyph('act') + ' shout' : touch ? '◀ ▶ move  ▲ jump  ▼ duck  round: shout'
    : id === 0 ? 'A D move  W jump  S duck  F shout' : '← → move  ↑ jump  ↓ duck  / shout';
}
// (lead review) on a controller, A / B (jump) flip for the lookout, and only the stick moves the light up.
// Per player: the jump came from this lookout's own pad (its A / B is down), whatever the global Pads.kind says (it flips
// to 'kb' while the other player types); W / ▲ from the keyboard or touch still moves the light up.
function laserOnPad(id) {
  try { if (!padFor(padSlots(), id)) return false; const ps = laserPadState(id); return ps ? !!ps.jump : Pads.kind === 'pad'; }
  catch (e) { return false; }
}
// the top-bar legend shows each player's keys for their role in this room (the framework adds "F <act label>" after it)
const LASER_LEGEND = {
  run: ['<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump <kbd>S</kbd> duck', '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump <kbd>↓</kbd> duck'],
  look: ['<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move the light', '<kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> move the light'],
};
function laserLegend(st) {
  try {
    const lg = Object.assign({}, LEVELS[G.levelIndex].legend || {});
    for (const id of [0, 1]) lg[id === 0 ? 'pip' : 'bo'] = LASER_LEGEND[id === st.runner ? 'run' : 'look'][id];
    setLegend(lg);
  } catch (e) { /* the level's own legend stays */ }
}
// the touch buttons and the top-bar legend name each player's act: the runner shouts, the lookout flips
// (the framework has one act.label per level; see the report's framework note). Only touches the DOM when a label differs.
let laserLabelEls = null;
function laserActLabels(st) {
  try {
    if (!laserLabelEls) laserLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of laserLabelEls) {
      const want = o.id < 0 ? 'shout/flip' : o.id === st.runner ? 'shout' : 'flip';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}

/* ---------- parsing: beams, coins, rugs, treasure, exit and fuse boxes come from the map ---------- */
function laserParse(st, L) {
  const g = L.grid, cfg = L.def;
  st.beams = []; st.coins = []; st.rugs = []; st.exits = []; st.gem = null; st.boxes = [];
  const used = new Set();
  const add = b => { Object.assign(b, { glow: 0, known: false, onAge: 9, on: false, armed: true, bt: 0, soon: false, lit: false }); st.beams.push(b); return b; };
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = g[r][c], id = laserKeyOf(c, r);
    if ((ch === '_' || ch === '-') && !used.has(id)) {
      let c1 = c; while (c1 + 1 < COLS && g[r][c1 + 1] === ch) c1++;
      for (let k = c; k <= c1; k++) used.add(laserKeyOf(k, r));
      const y = r * T + (ch === '_' ? 23 : 10);
      add({ id, kind: 'h', x0: c * T, y0: y, x1: (c1 + 1) * T, y1: y, low: ch === '_' });
    } else if (ch === '|' && !used.has(id)) {
      let r1 = r; while (r1 + 1 < ROWS && g[r1 + 1][c] === '|') r1++;
      for (let k = r; k <= r1; k++) used.add(laserKeyOf(c, k));
      const x = c * T + 15;
      add({ id, kind: 'v', x0: x, y0: r * T, x1: x, y1: (r1 + 1) * T });
    } else if (ch === '$' || ch === '%') st.coins.push({ x: c * T + 15, y: r * T + 15, got: false, t: 0, secret: ch === '%', found: ch === '$' });
    else if (ch === 'K') st.rugs.push({ c, r, x: c * T + (T - PW) / 2, y: (r + 1) * T - PH, on: false, t: 0 });
    else if (ch === 'g') st.gem = { x: c * T + 15, y: r * T + 10, c, r, got: false };
    else if (ch === 'x') st.exits.push({ c, r, x: c * T, y: r * T });
    else if (ch === 'f') st.boxes.push({ c, r, x: c * T + 15, y: r * T + 15, bank: null, call: 0, pop: 0 });
  }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if ('_-|$%Kgxf'.includes(g[r][c])) g[r][c] = '.';
  // per-beam config from the room def
  const byId = {}; for (const b of st.beams) byId[b.id] = b;
  for (const [id, bl] of Object.entries(cfg.blink || {})) { const b = byId[id]; if (b) { b.blink = bl.slice(); b.bt = bl[2] || 0; } else console.warn('laser: no beam at ' + id); }
  for (const id of cfg.known || []) { if (byId[id]) byId[id].known = true; else console.warn('laser: no known beam ' + id); }
  for (const id of (cfg.alarm && cfg.alarm.beams) || []) { if (byId[id]) byId[id].alarm = true; else console.warn('laser: no alarm beam ' + id); }
  st.banks = {};
  for (const bk of cfg.banks || []) {
    const box = st.boxes.find(b => b.c === bk.box[0] && b.r === bk.box[1]);
    if (!box) console.warn('laser: no box for bank ' + bk.id); else box.bank = bk.id;
    st.banks[bk.id] = { id: bk.id, off: bk.off, offT: 0, col: LASER_BANKCOL[bk.id], shape: LASER_SHAPE[bk.id], box: box || null, told: false };
    for (const id of bk.beams) { if (byId[id]) byId[id].bank = bk.id; else console.warn('laser: bank beam missing ' + id); }
  }
  for (const mv of cfg.movers || []) add({ id: mv.id || ('m' + st.beams.length), kind: 'h', x0: mv.c0 * T, x1: (mv.c1 + 1) * T, y0: mv.y0, y1: mv.y0, mover: mv });
  for (const sp of cfg.spinners || []) for (let a = 0; a < (sp.arms || 1); a++) add({ id: (sp.id || 'spin') + a, kind: 'd', x0: sp.x, y0: sp.y, x1: sp.x, y1: sp.y, spin: sp, arm: a });
}

// a room starts (setup for room 1, the room hook for the others): every per-room field is reset here
function laserRoom(st, L, k) {
  laserParse(st, L);
  st.k = k;
  st.runner = L.def.runner; st.look = 1 - st.runner;
  const r = G.players[st.runner], lk = G.players[st.look];
  st.seat = { x: lk.x, y: lk.y };
  st.lamp = { x: lk.x + PW / 2, y: LASER.lampY };
  st.check = { x: r.x, y: r.y };
  st.spot = { x: r.x + r.w / 2 + 40, y: r.y, vx: 0, vy: 0, idle: 0 };
  st.spot0 = { x: st.spot.x, y: st.spot.y }; st.spotFree = false;   // secrets need the light to have moved first
  st.lockT = [0, 0];
  st.ducked = false; st.zap = null; st.phase = 'play'; st.winT = 0; st.t = 0; st.stars = 3;
  st.lock = [true, true]; st.ping = null; st.pingCool = 0; st.shout = null; st.shoutCool = 0;
  st.roomZaps = 0; st.bright = false; st.dust = false; st.pops = []; st.alarmT = 0; st.flash = 0;
  st.hint = LASER.hintTime; st.escHint = 0; st.runIdle = 0; st.spinT = 0; st.moveT = 0;
  st.roomCoins = 0; st.wallT = 0; st.idleZaps = 0; st.nudgeT = 0; st.nudges = st.nudges || 0;
  st.stats.roomZaps[k] = 0; st.stats.roomTime[k] = 0;
  if (G.mode === 'play') laserLegend(st);
}

const laserHit = p => ({ x: p.x + LASER.insetX, y: p.y + LASER.insetY, w: p.w - 2 * LASER.insetX, h: p.h - 2 * LASER.insetY });
function laserSegDist(px, py, b) {
  const dx = b.x1 - b.x0, dy = b.y1 - b.y0, l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - b.x0) * dx + (py - b.y0) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (b.x0 + t * dx), py - (b.y0 + t * dy));
}
// segment vs axis-aligned rect (the rect grown by the beam's half thickness), Liang-Barsky
function laserSegRect(b, r) {
  const h = LASER.beamHalf, x0 = r.x - h, y0 = r.y - h, x1 = r.x + r.w + h, y1 = r.y + r.h + h;
  let t0 = 0, t1 = 1; const dx = b.x1 - b.x0, dy = b.y1 - b.y0;
  const P = [-dx, dx, -dy, dy], Q = [b.x0 - x0, x1 - b.x0, b.y0 - y0, y1 - b.y0];
  for (let i = 0; i < 4; i++) {
    if (P[i] === 0) { if (Q[i] < 0) return false; continue; }
    const t = Q[i] / P[i];
    if (P[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}
const laserSpotR = st => LASER.spotR * (st.bright ? LASER.brightMul : 1);

// input lock per room: a player's input counts only after they let go of everything once (held through the card)
function laserInput(st, p, dt) {
  const i = p.input;
  if (st.lock[p.id]) {
    if (!i.left && !i.right && !i.jump && !i.down && !i.up && !i.act) { st.lock[p.id] = false; st.lockT[p.id] = 0; }
    else { p.pendingAct = false; p.pendingJump = false; st.lockT[p.id] += dt; return NO_INPUT; }
  }
  return i;
}
function laserPop(st, text, x, y, quiet) { st.pops.push({ text, x, y, t: 0 }); if (!quiet) Sfx.play('laserHelp'); }
function laserCall(st, bk, sound) {
  if (!bk || !bk.box) return;
  bk.box.call = LASER.callLife;
  if (sound) { Sfx.play('laserCall'); rumble(st.look, 0, 0.3, 80); }
}

/* ---------- beams: movers, spinners, blinkers, walls, the alarm; light and afterglow ---------- */
function laserBeams(st, dt) {
  const r = G.players[st.runner], hb = laserHit(r), R = laserSpotR(st), esc = st.phase === 'escape';
  const mul = esc ? ((G.level.def.alarm && G.level.def.alarm.blinkMul) || 1) : 1;
  st.spinT += dt * mul;
  for (const bk of Object.values(st.banks)) if (bk.offT > 0) {
    const was = bk.offT; bk.offT = Math.max(0, bk.offT - dt);
    if (bk.offT < LASER.bankWarn && bk.offT > 0 && Math.floor(was * 4) !== Math.floor(bk.offT * 4)) Sfx.play('laserTick');
    if (bk.offT === 0) Sfx.play('laserHum');
  }
  for (const b of st.beams) {
    if (b.mover) {
      const m = b.mover, ph = (st.spinT / m.period + (m.phase || 0)) % 1;
      b.y0 = b.y1 = m.y0 + (m.y1 - m.y0) * (0.5 - 0.5 * Math.cos(ph * Math.PI * 2));
    }
    if (b.spin) {
      const s = b.spin, a = (s.phase || 0) + st.spinT * s.speed + b.arm * Math.PI * 2 / (s.arms || 1);
      const ca = Math.cos(a), sa = Math.sin(a);
      b.x0 = s.x; b.y0 = s.y;
      // the arm stops at the first stone tile (3 px ray march), so it never pokes through the floor
      let l = s.len;
      for (let d = 3; d <= s.len; d += 3) if (tile(Math.floor((s.x + ca * d) / T), Math.floor((s.y + sa * d) / T)) === '#') { l = d - 3; break; }
      b.x1 = s.x + ca * l; b.y1 = s.y + sa * l;
    }
    let want = true;
    b.soon = false;
    if (b.alarm && !esc) want = false;
    if (b.blink) {
      const [on, off] = b.blink; b.bt = (b.bt + dt * mul) % (on + off);
      if (b.bt >= on) want = false;
      b.soon = b.bt >= on + off - LASER.warnPre;
    }
    if (b.bank && st.banks[b.bank].offT > 0) { want = false; b.armed = false; b.soon = st.banks[b.bank].offT < LASER.bankWarn; }
    // a flipped wall comes back on beam by beam, never on top of the runner
    if (b.bank && !b.armed && want) { if (r.alive && !st.zap && laserSegRect(b, hb)) want = false; else b.armed = true; }
    if (st.phase === 'won') want = false;
    if (want && !b.on) b.onAge = 0;
    b.on = want; b.onAge += dt;
    b.lit = laserSegDist(st.spot.x, st.spot.y, b) <= R;
    b.glow = b.lit ? 1 : Math.max(0, b.glow - dt / LASER.afterglow);
  }
  // the lantern also finds secret coins: once lit they stay visible (only after the light has moved: nothing pops at the start)
  if (!st.spotFree && Math.hypot(st.spot.x - st.spot0.x, st.spot.y - st.spot0.y) > LASER.spotFree) st.spotFree = true;
  if (st.spotFree) for (const c of st.coins) if (!c.found && Math.hypot(c.x - st.spot.x, c.y - st.spot.y) <= R) {
    c.found = true; c.t = 0; st.stats.found++; Sfx.play('laserFound'); burst(c.x, c.y, C.gold, 10); laserPop(st, 'Secret coin!', c.x, c.y - 18, true);
  }
  // at a laser wall: the first time it is seen there, and after 4 s of waiting, its fuse box calls for the light
  if (r.alive && !st.zap && st.phase !== 'won') {
    let near = null, nb = null;
    const dir = laserGoalDir(st, r), cx = r.x + r.w / 2;   // only a wall still ahead counts (not one just passed)
    for (const b of st.beams) if (b.bank && b.on && st.banks[b.bank].box && laserAhead(b, cx, dir) && laserSegDist(cx, r.y + r.h / 2, b) < LASER.wallNear) { near = st.banks[b.bank]; nb = b; }
    st.wallT = near ? st.wallT + dt : 0;
    if (near && !near.told && (nb.glow > 0.3 || nb.known || st.dust)) { near.told = true; if (near.box.call <= 0) laserCall(st, near, true); }
    if (near && st.wallT >= LASER.autoCall && near.box.call <= 0) { laserCall(st, near, true); st.wallT = 0; }
  }
}

/* ---------- zaps ---------- */
function laserZapCheck(st) {
  const r = G.players[st.runner];
  if (!r.alive || st.zap || (st.phase !== 'play' && st.phase !== 'escape')) return;
  const hb = laserHit(r);
  for (const b of st.beams) {
    if (!b.on || b.onAge < LASER.onGrace) continue;
    if (laserSegRect(b, hb)) { laserZap(st, r, b); return; }
  }
}
function laserZap(st, r, b) {
  st.zap = { t: 0, beam: b, x: r.x + r.w / 2, y: r.y + r.h / 2 };
  b.known = true;
  st.stats.zaps[r.id]++; st.roomZaps++; st.stats.roomZaps[st.k]++;
  if (st.spot.idle > 2) st.idleZaps++;
  r.vx = 0; r.vy = 0; r.stun = 1;
  st.alarmT = 1.0; st.flash = 0.25;
  Sfx.play('laserZap', r.id); Sfx.play('laserAlarm');
  rumble(r.id, 0.8, 0.5, 220); rumble(st.look, 0.25, 0.3, 120);
  if (!reduceMotion) G.shake = 0.15;
  burst(st.zap.x, st.zap.y, '#ff5a6a', 14);
  if (b.bank) laserCall(st, st.banks[b.bank], true);   // zapped by a laser wall: its fuse box calls for the light
  if (!st.bright && st.roomZaps >= LASER.brightAt) { st.bright = true; laserPop(st, 'Bright lamp!', st.lamp.x, st.lamp.y + 34); }
  if (!st.dust && st.roomZaps >= LASER.dustAt) { st.dust = true; for (const bb of st.beams) bb.known = true; laserPop(st, 'Magic dust!', st.zap.x, st.zap.y - 40); }
}
function laserZapStep(st, dt) {
  const z = st.zap, r = G.players[st.runner];
  z.t += dt;
  if (z.t >= LASER.zapHold && r.alive) { r.alive = false; puff(z.x, z.y, 10, 'rgba(255,255,255,0.85)'); }
  if (z.t >= LASER.zapHold + LASER.zapGone) {
    if (st.ducked) { r.h = PH; st.ducked = false; }
    G.spawnPts[r.id] = { x: st.check.x, y: st.check.y };
    respawn(r); r.stun = 0;
    r.face = st.phase === 'escape' && st.exits[0] ? (st.exits[0].x < r.x ? -1 : 1) : 1;   // facing the way to go
    st.zap = null;
    Sfx.play('laserPoof', r.id);
  }
}

/* ---------- the runner: sneak, duck, shout ---------- */
function laserHeadroom(p, need) {
  const y = p.y - need, c1 = Math.floor((p.x + 0.01) / T), c2 = Math.floor((p.x + p.w - 0.01) / T);
  const r1 = Math.floor(y / T), r2 = Math.floor((p.y - 0.01) / T);
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (solidFor(tile(c, r), p)) return false;
  return true;
}
// +1 / -1: the way to the goal (the treasure, or the exit in the escape); a wall is "ahead" if it is on that side
function laserGoalDir(st, r) {
  const g = st.phase === 'escape' ? (st.exits[0] ? { x: st.exits[0].x + T / 2 } : null) : st.gem;
  return g ? (g.x >= r.x + r.w / 2 ? 1 : -1) : 1;
}
const laserAhead = (b, cx, dir) => b.kind !== 'v' || (b.x0 - cx) * dir > -6;
function laserNearestBank(st, r) {
  let best = null, bd = 1e9; const cx = r.x + r.w / 2, cy = r.y + r.h / 2, dir = laserGoalDir(st, r);
  for (const b of st.beams) {
    if (!b.bank || !b.on || !laserAhead(b, cx, dir)) continue;
    const bk = st.banks[b.bank]; if (!bk.box) continue;
    const d = laserSegDist(cx, cy, b); if (d < bd) { bd = d; best = bk; }
  }
  return best;
}
function laserRunner(st, dt) {
  const r = G.players[st.runner], lk = G.players[st.look];
  if (st.zap) { laserZapStep(st, dt); return; }
  const inp = laserInput(st, r, dt);
  // (lead review) ▼ always ducks, on planks too, and never drops through a plank in this level
  const want = inp.down && r.grounded && st.phase !== 'won';
  const dh = PH - LASER.duckH;
  if (want && !st.ducked) { r.y += dh; r.h = LASER.duckH; st.ducked = true; r.sx = 1.2; r.sy = 0.8; Sfx.play('laserDuck', r.id); }
  else if (st.ducked && (!want || r.pendingJump)) {
    if (laserHeadroom(r, dh)) { r.y -= dh; r.h = PH; st.ducked = false; }
    else { r.pendingJump = false; r.jumpBuf = 0; }
  }
  const saved = r.input; r.input = inp.down ? Object.assign({}, inp, { down: false }) : inp; lk.alive = false;
  try {
    control(r, dt);
    if (st.ducked) r.vx = clamp(r.vx, -PHYS.maxRun * LASER.duckMul, PHYS.maxRun * LASER.duckMul);
    if (r.alive) { moveX(r, r.vx * dt, true); moveY(r, r.vy * dt, true); postStep(r); }
  } finally { lk.alive = true; r.input = saved; }
  if (st.ducked) { r.sx = approach(r.sx, 1.18, dt * 6); r.sy = approach(r.sy, 0.9, dt * 6); }
  else { r.sx = approach(r.sx, 1, dt * 6); r.sy = approach(r.sy, 1, dt * 6); }
  // act: shout ("Flip it!" calls the nearest wall's box, otherwise "Light!")
  if (r.pendingAct) {
    r.pendingAct = false;
    if (st.shoutCool <= 0 && (st.phase === 'play' || st.phase === 'escape')) {
      st.shoutCool = LASER.shoutCool;
      const bk = laserNearestBank(st, r);
      st.shout = { t: 0, text: bk ? 'Flip it!' : 'Light!' };
      if (bk) laserCall(st, bk, false);
      Sfx.play('laserShout', r.id); rumble(st.look, 0, 0.35, 80);
      st.stats.shouts[r.id]++;
    }
  }
  const moving = inp.left || inp.right || inp.jump || inp.down;
  st.runIdle = moving ? 0 : st.runIdle + dt;
}

/* ---------- the lookout: steer the light, flip fuse boxes, ping ---------- */
function laserLookout(st, dt) {
  const lk = G.players[st.look], s = st.spot;
  const onPad = laserOnPad(lk.id);
  let padFlip = onPad && lk.pendingJump;   // (lead review) read before the seat clears it
  Object.assign(lk, { x: st.seat.x, y: st.seat.y, vx: 0, vy: 0, grounded: true, jumpBuf: 0, pendingJump: false });
  const inp = laserInput(st, lk, dt);
  if (st.lock[lk.id]) padFlip = false;     // a press while still locked (something held through the card) does nothing
  const mx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), my = (inp.down ? 1 : 0) - (inp.up || (inp.jump && !onPad) ? 1 : 0);
  const n = Math.hypot(mx, my) || 1;
  s.vx = approach(s.vx, mx / n * LASER.spotSpeed, (mx ? LASER.spotAcc : LASER.spotFric) * dt);
  s.vy = approach(s.vy, my / n * LASER.spotSpeed, (my ? LASER.spotAcc : LASER.spotFric) * dt);
  s.x += s.vx * dt; s.y += s.vy * dt;
  const V = LASER.vault;
  if (s.x < V.x0) { s.x = V.x0; s.vx = 0; } if (s.x > V.x1) { s.x = V.x1; s.vx = 0; }
  if (s.y < V.y0) { s.y = V.y0; s.vy = 0; } if (s.y > V.y1) { s.y = V.y1; s.vy = 0; }
  if (mx || my) { s.idle = 0; st.idleZaps = 0; st.moveT += dt; } else s.idle += dt;
  lk.face = s.x >= lk.x + lk.w / 2 ? 1 : -1;
  if (lk.pendingAct || padFlip) {
    lk.pendingAct = false;
    if (st.phase === 'play' || st.phase === 'escape') {
      const reach = laserSpotR(st) * LASER.flipReach;
      let box = null, bd = 1e9;
      for (const b of st.boxes) { if (!b.bank) continue; const d = Math.hypot(b.x - s.x, b.y - s.y); if (d <= reach && d < bd) { bd = d; box = b; } }
      if (box) {
        const bk = st.banks[box.bank];
        bk.offT = bk.off; box.pop = 0.3; box.call = 0; bk.told = true;
        Sfx.play('laserFlip', lk.id); rumble(lk.id, 0.2, 0.4, 90);
        st.stats.flips[lk.id]++;
      } else if (st.pingCool <= 0) {
        st.ping = { x: s.x, y: s.y, t: 0 }; st.pingCool = LASER.pingCool;
        Sfx.play('laserPing', lk.id); st.stats.pings[lk.id]++;
      }
    }
  }
}

/* ---------- pickups, rugs, treasure, exit ---------- */
const laserStars = z => z <= LASER.star3 ? 3 : z <= LASER.star2 ? 2 : 1;
// the escape runs from the treasure to the exit: there a rug only takes the checkpoint if it is nearer the exit
function laserExitDist(st, x) { const e = st.exits[0]; return e ? Math.abs(x + PW / 2 - (e.x + T / 2)) : 0; }
function laserLightRug(st, rg, quiet) {
  for (const o of st.rugs) o.on = false;
  rg.on = true; rg.t = 0; st.check = { x: rg.x, y: rg.y };
  if (!quiet) Sfx.play('laserRug');
  burst(rg.c * T + 15, (rg.r + 1) * T - 4, '#7cf0b0', 8);
}
function laserPickups(st, dt) {
  const r = G.players[st.runner];
  for (const c of st.coins) c.t += dt;
  for (const rg of st.rugs) rg.t += dt;
  if (!r.alive || st.zap) return;
  for (const c of st.coins) if (!c.got && rectHit(r, c.x - 9, c.y - 9, 18, 18)) {
    c.got = true; c.found = true; st.stats.coins++; st.roomCoins++; Sfx.play('laserCoin'); burst(c.x, c.y, C.gold, 8);
  }
  if (r.grounded) for (const rg of st.rugs) {
    const cx = r.x + r.w / 2, m = LASER.rugReach;
    if (!rg.on && cx > rg.c * T - m && cx < rg.c * T + T + m && Math.abs(r.y + r.h - (rg.r + 1) * T) < 2
      && (st.phase !== 'escape' || laserExitDist(st, rg.x) < laserExitDist(st, st.check.x) - 1)) laserLightRug(st, rg);
  }
  const gm = st.gem;
  if (gm && !gm.got && st.phase === 'play' && rectHit(r, gm.x - 12, gm.y - 12, 24, 30)) {
    gm.got = true;
    st.stats.roomTime[st.k] = st.t;
    if (G.level.def.alarm) {
      st.phase = 'escape'; st.alarmT = 2; Sfx.play('laserGrab'); Sfx.play('laserAlarm');
      // the checkpoint moves to the rug nearest the treasure, whichever rugs were lit (or jumped over) on the way in,
      // so a zap on the way out never sends the runner ahead, next to the exit
      if (st.rugs.length) laserLightRug(st, st.rugs.reduce((a, b) => Math.abs(b.x - gm.x) < Math.abs(a.x - gm.x) ? b : a), true);
      for (const bk of Object.values(st.banks)) bk.told = false;   // on the way out, the wall's box calls again when it is first seen
      st.escHint = 4;
      laserPop(st, 'Get out!', gm.x - 40, gm.y - 40);
      rumble(0, 0.4, 0.6, 300); rumble(1, 0.4, 0.6, 300);
    } else laserWin(st, gm.x, gm.y);
  }
  if (st.phase === 'escape') for (const e of st.exits) if (rectHit(r, e.x, e.y - T, T, 2 * T)) { laserWin(st, e.x + 15, e.y); break; }
}
function laserWin(st, x, y) {
  st.phase = 'won'; st.winT = 0; st.winX = x; st.winY = y;
  st.stats.roomTime[st.k] = st.t;
  st.stars = laserStars(st.roomZaps); st.stats.stars[st.k] = st.stars;
  Sfx.play('laserGem'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
  for (let i = 0; i < 40; i++) confetti(x, y);
}

/* ---------- the tick (ownStep) ---------- */
function laserStep(st, dt) {
  if (G.introT > LASER.introHold) { for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; } return; }
  st.t += dt;
  st.pingCool -= dt; st.shoutCool -= dt; st.hint -= dt; st.escHint = Math.max(0, st.escHint - dt); st.alarmT = Math.max(0, st.alarmT - dt); st.flash = Math.max(0, st.flash - dt);
  if (st.ping) { st.ping.t += dt; if (st.ping.t > LASER.pingLife) st.ping = null; }
  if (st.shout) { st.shout.t += dt; if (st.shout.t > LASER.shoutLife) st.shout = null; }
  for (const b of st.boxes) { b.call = Math.max(0, b.call - dt); b.pop = Math.max(0, b.pop - dt); }
  st.pops = st.pops.filter(p => (p.t += dt) < 1.2);
  laserLookout(st, dt);
  laserBeams(st, dt);
  laserRunner(st, dt);
  laserPickups(st, dt);   // before the zap check: a treasure or coin touched together with a beam wins
  laserZapCheck(st);
  if (st.phase === 'escape') st.alarmT = Math.max(st.alarmT, 0.5);
  // nudge a lookout whose light sits still while the runner waits, keeps getting zapped, or is stuck at a wall.
  // A light parked on the runner or just ahead of them (on the spinner, on the next beam) is helping, so it is only nudged at a wall.
  const rr = G.players[st.runner], rdx = st.spot.x - (rr.x + rr.w / 2), rdy = st.spot.y - (rr.y + rr.h / 2), ahead = rdx * laserGoalDir(st, rr);
  const near = Math.hypot(rdx, rdy) < laserSpotR(st) * 1.3 || (ahead > -30 && ahead < LASER.aheadX && Math.abs(rdy) < LASER.aheadY);
  const needLook = st.phase !== 'won' && st.hint <= 0 && st.spot.idle > LASER.lookNudge && (st.wallT > 2 || (!near && (st.runIdle > 2 || st.idleZaps > 0)));
  if (needLook) {
    if (st.nudgeT <= 0) { Sfx.play('laserNudge', st.look); rumble(st.look, 0, 0.3, 90); st.nudges++; st.nudgeT = LASER.nudgeRepeat; }
    st.nudgeT -= dt;
  } else st.nudgeT = 0;
  st.lookNudgeOn = needLook;
  if (st.phase === 'won') {
    st.winT += dt;
    if (st.winT < 1.2 && (G.tickN % 12) === 0) confetti(st.winX, st.winY);
    if (st.winT >= LASER.winHold) {
      const L = G.level;
      st.stats.roomCoinsGot[st.k] = st.roomCoins; st.stats.roomCoinsMax[st.k] = st.coins.length;
      if (L.def.roomIndex < L.def.roomCount - 1) nextRoom(); else levelClear();
    }
  }
}

/* ---------- drawing ---------- */
// the brick wall behind the vault: drawn once per room (and canvas size) into an offscreen canvas, then blitted
let laserBack = null;
function laserPaintBricks(c, L) {
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const ch = L.grid[ty][tx];
    if (ch === '#' || ch === '=') continue;
    const x = tx * T, y = ty * T;
    c.fillStyle = (tx + ty) % 2 ? '#3a3360' : '#37305b'; c.fillRect(x, y, T, T);
    c.fillStyle = 'rgba(20,16,44,0.35)';
    c.fillRect(x, y + 14, T, 2); c.fillRect(x + ((ty % 2) ? 0 : 15), y, 2, 14); c.fillRect(x + ((ty % 2) ? 15 : 0), y + 16, 2, 14);
    // (polish) a few odd bricks, lit top edges, and the occasional crack
    const h = hash(tx * 3 + 1, ty * 5 + 2);
    if (h % 5 === 0) { c.fillStyle = h % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(10,8,30,0.14)'; c.fillRect(x + ((ty % 2) ? 17 : 2), y + (h % 3 ? 0 : 16), 13, 14); }
    c.fillStyle = 'rgba(255,255,255,0.045)'; c.fillRect(x, y + 16, T, 1); c.fillRect(x, y, T, 1);
    if (h % 17 === 0) { c.strokeStyle = 'rgba(10,8,30,0.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 6, y + 3); c.lineTo(x + 11, y + 10); c.lineTo(x + 8, y + 17); c.lineTo(x + 14, y + 25); c.stroke(); }
  }
  laserPaintVault(c, L);
}
// the vault's dressing, drawn into the same cached layer behind everything: stone pillars, arched alcoves with treasure,
// shields and hanging chains (dim in the dark, they light up under the lantern)
function laserPaintVault(c, L) {
  const V = LASER.vault, open = new Path2D();
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) { const ch = L.grid[ty][tx]; if (ch !== '#' && ch !== '=') open.rect(tx * T, ty * T, T, T); }
  c.save(); c.clip(open);
  const rnd = k => hash(k * 13 + (G.room || 0) * 101, 7);
  for (let i = 0, x = V.x0 + 90; x < V.x1 - 60; i++, x += 180) {
    // a pillar: stone drums with fluting, lit and shaded sides, a moulded capital and a stepped base with chips
    const px = x - 14, ph = V.y1 - V.y0;
    c.fillStyle = '#463e72'; c.fillRect(px, V.y0, 28, ph);
    c.fillStyle = '#524a82'; c.fillRect(px, V.y0, 8, ph);
    c.fillStyle = '#332c58'; c.fillRect(px + 20, V.y0, 8, ph);
    c.strokeStyle = 'rgba(20,16,44,0.4)'; c.lineWidth = 1; c.beginPath();
    for (const fx of [px + 7, px + 12, px + 17, px + 22]) { c.moveTo(fx, V.y0 + 14); c.lineTo(fx, V.y1 - 14); }
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.07)'; c.beginPath();
    for (const fx of [px + 5, px + 10, px + 15]) { c.moveTo(fx, V.y0 + 14); c.lineTo(fx, V.y1 - 14); }
    c.stroke();
    for (let y = V.y0 + 14 + 46 + (i % 2) * 14; y < V.y1 - 20; y += 52) {   // drum joints with a chip now and then
      c.fillStyle = 'rgba(20,16,44,0.45)'; c.fillRect(px, y, 28, 1.6); c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(px, y + 1.6, 28, 1);
      if (hash(i, y) % 3 === 0) { c.fillStyle = '#2a2448'; c.beginPath(); c.moveTo(px + 28, y - 3); c.lineTo(px + 24, y + 1); c.lineTo(px + 28, y + 4); c.closePath(); c.fill(); }
    }
    for (const [yy, hh2, ww] of [[V.y0 + 4, 9, 38], [V.y0 + 13, 4, 32], [V.y1 - 18, 4, 32], [V.y1 - 14, 10, 38]]) {
      const xx = px + 14 - ww / 2;
      c.fillStyle = '#5a528c'; c.fillRect(xx, yy, ww, hh2);
      c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(xx, yy, ww, 1.5);
      c.fillStyle = 'rgba(20,16,44,0.35)'; c.fillRect(xx, yy + hh2 - 1.5, ww, 1.5); c.fillRect(xx + ww - 4, yy, 4, hh2);
      c.strokeStyle = '#2a2448'; c.lineWidth = 1; c.strokeRect(xx + 0.5, yy + 0.5, ww - 1, hh2 - 1);
    }
    // the alcove to its right: dark arch with a ring of wedge stones and a keystone, a bevelled sill, treasure inside
    const ax = x + 46, aw = 70, ay = V.y0 + 70 + (rnd(i) % 3) * 16, ah = 76, kind = rnd(i + 9) % 4;
    if (ax + aw > V.x1 - 20) continue;
    c.fillStyle = '#251f43'; c.beginPath(); c.moveTo(ax, ay + ah); c.lineTo(ax, ay + aw / 2); c.arc(ax + aw / 2, ay + aw / 2, aw / 2, Math.PI, 0); c.lineTo(ax + aw, ay + ah); c.closePath(); c.fill();
    c.save(); c.clip(); const ig = c.createLinearGradient(0, ay, 0, ay + ah); ig.addColorStop(0, 'rgba(10,8,26,0.5)'); ig.addColorStop(1, 'rgba(10,8,26,0)'); c.fillStyle = ig; c.fillRect(ax, ay, aw, ah); c.restore();
    const acx = ax + aw / 2, acy = ay + aw / 2, ar = aw / 2 + 4;
    for (let k = 0; k < 9; k++) {   // voussoirs
      const a0 = Math.PI + k * Math.PI / 9 + 0.02, a1 = Math.PI + (k + 1) * Math.PI / 9 - 0.02, key = k === 4;
      c.fillStyle = key ? '#6a62a0' : k % 2 ? '#5a528c' : '#544c86';
      c.beginPath(); c.arc(acx, acy, ar + (key ? 9 : 6), a0, a1); c.arc(acx, acy, ar - 3, a1, a0, true); c.closePath(); c.fill();
      c.strokeStyle = '#2a2448'; c.lineWidth = 1; c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.09)'; c.beginPath(); c.arc(acx, acy, ar + 5, Math.PI * 1.05, Math.PI * 1.45); c.arc(acx, acy, ar + 3, Math.PI * 1.45, Math.PI * 1.05, true); c.closePath(); c.fill();
    for (const sx of [ax - 7, ax + aw]) { c.fillStyle = '#544c86'; c.fillRect(sx, ay + aw / 2, 7, ah - aw / 2); c.fillStyle = 'rgba(20,16,44,0.35)'; c.fillRect(sx + 5, ay + aw / 2, 2, ah - aw / 2); c.strokeStyle = '#2a2448'; c.strokeRect(sx + 0.5, ay + aw / 2, 6, ah - aw / 2); }
    c.fillStyle = '#5a528c'; c.fillRect(ax - 8, ay + ah, aw + 16, 7);
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(ax - 8, ay + ah, aw + 16, 1.5); c.fillStyle = 'rgba(20,16,44,0.4)'; c.fillRect(ax - 8, ay + ah + 5, aw + 16, 2);
    c.strokeStyle = '#2a2448'; c.lineWidth = 1; c.strokeRect(ax - 7.5, ay + ah + 0.5, aw + 15, 6);
    const bx = ax + aw / 2, by = ay + ah;
    c.fillStyle = 'rgba(8,6,20,0.35)'; c.beginPath(); c.ellipse(bx, by - 1, 20, 3, 0, 0, Math.PI * 2); c.fill();
    if (kind === 0) { // a painted vase: a lit side, a gold band with a zigzag, a rim and a foot
      const vase = () => { c.beginPath(); c.moveTo(bx - 6, by); c.quadraticCurveTo(bx - 16, by - 18, bx - 6, by - 28); c.lineTo(bx + 6, by - 28); c.quadraticCurveTo(bx + 16, by - 18, bx + 6, by); c.closePath(); };
      vase(); c.fillStyle = '#7a5aa8'; c.fill();
      c.save(); vase(); c.clip();
      c.fillStyle = 'rgba(20,10,40,0.35)'; c.fillRect(bx + 3, by - 30, 14, 32);
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(bx - 9, by - 24, 3, 18);
      c.fillStyle = 'rgba(255,215,90,0.55)'; c.fillRect(bx - 14, by - 18, 28, 4);
      c.strokeStyle = 'rgba(255,215,90,0.45)'; c.lineWidth = 1; c.beginPath(); for (let k = -12; k < 12; k += 4) { c.moveTo(bx + k, by - 9); c.lineTo(bx + k + 2, by - 12); c.lineTo(bx + k + 4, by - 9); } c.stroke();
      c.restore();
      vase(); c.strokeStyle = '#3e2a5e'; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#8d6dbb'; c.fillRect(bx - 8, by - 30, 16, 3); c.fillStyle = '#5e4488'; c.fillRect(bx - 7, by - 2, 14, 2);
    } else if (kind === 1) { // a chest: plank boards, iron bands with rivets, a gold lock plate
      c.fillStyle = '#6b4630'; c.fillRect(bx - 16, by - 18, 32, 18);
      c.strokeStyle = 'rgba(30,16,8,0.45)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(bx - 16, by - 12); c.lineTo(bx + 16, by - 12); c.moveTo(bx - 16, by - 6); c.lineTo(bx + 16, by - 6); c.stroke();
      c.fillStyle = '#8a5833'; c.beginPath(); c.moveTo(bx - 16, by - 18); c.quadraticCurveTo(bx, by - 30, bx + 16, by - 18); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.moveTo(bx - 14, by - 19); c.quadraticCurveTo(bx - 4, by - 26, bx + 4, by - 26); c.lineTo(bx + 2, by - 24); c.quadraticCurveTo(bx - 4, by - 24, bx - 12, by - 19); c.closePath(); c.fill();
      c.fillStyle = 'rgba(30,16,8,0.35)'; c.fillRect(bx + 8, by - 18, 8, 18);
      c.fillStyle = '#4a4466'; for (const sx of [bx - 12, bx + 9]) { c.fillRect(sx, by - 24 + (sx > bx ? 1 : 0), 3, 24); }
      c.fillStyle = 'rgba(200,190,230,0.5)'; for (const sx of [bx - 10.5, bx + 10.5]) for (const sy of [by - 15, by - 5]) { c.beginPath(); c.arc(sx, sy, 0.8, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = 'rgba(217,166,64,0.85)'; c.fillRect(bx - 3.5, by - 22, 7, 9); c.fillStyle = '#2a1a10'; c.fillRect(bx - 0.8, by - 19, 1.6, 3);
      c.strokeStyle = '#2a1a10'; c.lineWidth = 1.2; c.strokeRect(bx - 16, by - 18, 32, 18);
    } else if (kind === 2) { // a coin heap: a shaded mound of overlapping coins with rims and a few glints
      c.fillStyle = 'rgba(160,110,30,0.85)'; c.beginPath(); c.moveTo(bx - 22, by); c.quadraticCurveTo(bx, by - 26, bx + 22, by); c.closePath(); c.fill();
      for (let k = 0; k < 16; k++) {
        const hk = hash(i * 31 + k, 9), t = (hk % 100) / 100, cx = bx - 19 + t * 38, top = by - 13 * (1 - Math.pow(2 * t - 1, 2)) * 2 * 0.95, cy = top + 3 + (hk >>> 8) % Math.max(1, by - top - 4);
        c.fillStyle = (hk >>> 12) % 3 ? 'rgba(217,166,64,0.95)' : 'rgba(240,196,90,0.95)'; c.beginPath(); c.ellipse(cx, cy, 3.2, 2, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(120,80,20,0.8)'; c.lineWidth = 0.7; c.stroke();
      }
      c.fillStyle = 'rgba(255,240,170,0.7)'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(bx - 10 + k * 6, by - 7 - (k % 2) * 6, 1.1, 0, Math.PI * 2); c.fill(); }
    } else { // a knight's shield: a rim, a quartered field, a gold cross with rivets, a lit edge
      const sh = () => { c.beginPath(); c.moveTo(bx - 13, by - 40); c.lineTo(bx + 13, by - 40); c.lineTo(bx + 13, by - 24); c.quadraticCurveTo(bx + 12, by - 12, bx, by - 6); c.quadraticCurveTo(bx - 12, by - 12, bx - 13, by - 24); c.closePath(); };
      sh(); c.fillStyle = '#4f5b92'; c.fill();
      c.save(); sh(); c.clip(); c.fillStyle = '#7a3f5e'; c.fillRect(bx, by - 40, 14, 16); c.fillRect(bx - 14, by - 24, 14, 20); c.fillStyle = 'rgba(20,10,40,0.3)'; c.fillRect(bx + 6, by - 42, 10, 40); c.restore();
      c.fillStyle = 'rgba(217,166,64,0.8)'; c.fillRect(bx - 2, by - 38, 4, 28); c.fillRect(bx - 11, by - 30, 22, 4);
      sh(); c.strokeStyle = 'rgba(217,166,64,0.75)'; c.lineWidth = 2; c.stroke();
      c.fillStyle = 'rgba(255,240,180,0.7)'; for (const [rx2, ry2] of [[bx - 10, by - 37], [bx + 10, by - 37], [bx, by - 10]]) { c.beginPath(); c.arc(rx2, ry2, 1, 0, Math.PI * 2); c.fill(); }
    }
    // a chain hanging from the ceiling between them
    c.strokeStyle = 'rgba(160,150,200,0.28)'; c.lineWidth = 2;
    for (let y = V.y0, k = 0; y < V.y0 + 40 + (rnd(i + 3) % 40); y += 7, k++) { c.beginPath(); c.ellipse(x + 130, y, k % 2 ? 1.5 : 3, 3.5, 0, 0, Math.PI * 2); c.stroke(); }
  }
  c.restore();
}
function laserDrawBackdrop() {
  const L = G.level, cw = canvas.width, ch = canvas.height;
  try {
    if (!laserBack || laserBack.L !== L || laserBack.cv.width !== cw || laserBack.cv.height !== ch) {
      const cv = (laserBack && laserBack.cv) || document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      const c = cv.getContext('2d');
      c.setTransform(cw / W, 0, 0, ch / H, 0, 0); c.clearRect(0, 0, W, H);
      laserPaintBricks(c, L);
      laserBack = { cv, L };
    }
    // only the vault holds bricks (the ring around it is stone), so only that part is copied
    const V = LASER.vault, kx = cw / W, ky = ch / H;
    ctx.drawImage(laserBack.cv, V.x0 * kx, V.y0 * ky, (V.x1 - V.x0) * kx, (V.y1 - V.y0) * ky, V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0);
  } catch (e) { laserBack = null; laserPaintBricks(ctx, L); }
}
function laserDrawBeam(st, b) {
  const known = (b.known || st.dust) ? LASER.ghostA : 0, bw = hudBig() ? LASER.phoneBeam : 1;   // thicker lines on phones
  if (st.phase === 'won') return;
  const col = b.bank ? LASER_BANKCOL[b.bank] : '#ff4b5c';
  if (b.on) {
    const a = Math.max(b.glow, known, MODES.laser.debug ? 1 : 0);
    if (a <= 0.01) return;
    const fresh = b.onAge < LASER.onGrace;
    ctx.save(); ctx.globalAlpha = a * (fresh ? 0.5 + 0.5 * Math.sin(G.clock * 60) : 1);
    ctx.lineCap = 'round';
    ctx.strokeStyle = col; ctx.globalAlpha *= 0.35; ctx.lineWidth = 9 * bw; ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke();
    ctx.globalAlpha /= 0.35; ctx.lineWidth = 3 * bw;
    if (b.glow < 0.5 && known) ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = bw; ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke();
    laserDrawEmitters(b, col, a, bw);
    ctx.restore();
  } else if (b.glow > 0.01 || MODES.laser.debug) {
    // asleep (a blinker resting, a wall switched off, the alarm before the grab): a dotted line where it will be
    const g = Math.max(b.glow, MODES.laser.debug ? 0.8 : 0);
    const flick = b.soon ? (Math.sin(G.clock * 40) > 0 ? 0.7 : 0.25) : 0.3;
    ctx.save(); ctx.globalAlpha = g * flick; ctx.strokeStyle = col; ctx.lineWidth = 2 * bw; ctx.setLineDash([2, 6]);
    ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke(); ctx.setLineDash([]);
    laserDrawEmitters(b, col, g * 0.6, bw);
    ctx.restore();
  }
}
function laserDrawEmitters(b, col, a, bw) {
  const e = bw > 1 ? 1.25 : 1;
  ctx.globalAlpha = a;
  if (b.spin) { if (b.arm === 0) { ctx.fillStyle = '#2b2744'; circle(b.spin.x, b.spin.y, 9 * e); ctx.fill(); ctx.fillStyle = col; circle(b.spin.x, b.spin.y, 4 * e); ctx.fill(); } return; }
  ctx.fillStyle = '#2b2744';
  for (const [x, y] of [[b.x0, b.y0], [b.x1, b.y1]]) { rr(x - 5 * e, y - 5 * e, 10 * e, 10 * e, 3); ctx.fill(); }
  ctx.fillStyle = col; for (const [x, y] of [[b.x0, b.y0], [b.x1, b.y1]]) { circle(x, y, 2.5 * e); ctx.fill(); }
}
function laserDrawShape(shape, x, y, s) {
  ctx.beginPath();
  if (shape === 'circle') ctx.arc(x, y, s, 0, Math.PI * 2);
  else if (shape === 'triangle') { ctx.moveTo(x, y - s); ctx.lineTo(x + s, y + s * 0.8); ctx.lineTo(x - s, y + s * 0.8); ctx.closePath(); }
  else ctx.rect(x - s * 0.85, y - s * 0.85, s * 1.7, s * 1.7);
}
function laserDrawPrize(st, gm) {
  const base = (gm.r + 1) * T, x = gm.x;
  paShadow(x, base, 16, 3, 0.3);
  // a carved plinth: a stone column with a gold band, a moulded top and foot (cached)
  paStamp('laserplinth', x - 13, base - 17, 26, 17, 2, g => {
    paStone(g, 3, 3, 20, 12, '#5d5484', 5, { r: 2, lw: 1.2, noCrack: true });
    g.fillStyle = 'rgba(217,166,64,0.85)'; g.fillRect(3.5, 7.5, 19, 2); g.fillStyle = 'rgba(255,240,170,0.6)'; g.fillRect(3.5, 7.5, 19, 0.7);
    paStone(g, 0, 0, 26, 4, '#8a82b0', 7, { r: 1.5, lw: 1.1, noCrack: true, noChip: true });
    paStone(g, 1, 14, 24, 3, '#8a82b0', 9, { r: 1, lw: 1.1, noCrack: true, noChip: true });
  });
  if (gm.got) return;
  const bob = Math.sin(G.clock * 3) * 2, y = base - 31 + bob, kind = G.level.def.prize || 'gem';
  ctx.fillStyle = 'rgba(255,240,170,0.22)'; circle(x, y, 18 + Math.sin(G.clock * 5) * 2); ctx.fill();
  if (kind === 'crown') { drawCrownShape(x, y + 2, 1.0); if ((G.clock * 2) % 1 < 0.12) { ctx.fillStyle = '#fff'; circle(x + 7, y - 6, 2); ctx.fill(); } return; }
  const col = LASER_PRIZE[kind] || LASER_PRIZE.gem;
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - 11); ctx.lineTo(x + 10, y - 3); ctx.lineTo(x, y + 11); ctx.lineTo(x - 10, y - 3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(28,26,54,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.moveTo(x - 2, y - 8); ctx.lineTo(x - 7, y - 3); ctx.lineTo(x - 1, y - 3); ctx.closePath(); ctx.fill();
  if ((G.clock * 2) % 1 < 0.12) { ctx.fillStyle = '#fff'; circle(x + 5, y - 7, 2); ctx.fill(); }
}
// the window arch path (used for the light and the frame)
function laserArch(x0, y0, w, h) {
  ctx.beginPath(); ctx.moveTo(x0, y0 + h); ctx.lineTo(x0, y0 + 26); ctx.quadraticCurveTo(x0, y0, x0 + 26, y0);
  ctx.lineTo(x0 + w - 26, y0); ctx.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + 26); ctx.lineTo(x0 + w, y0 + h);
}
// the lookout's booth: a lit arched window in the ceiling stone (behind the lookout)
function laserDrawBoothBack(st) {
  const bx = st.seat.x + PW / 2, x0 = bx - 62, y0 = 8, w = 124, h = 84;
  // (a cached picture) a stone surround of wedge blocks, the warm lit room behind the glass with a panelled dado,
  // the vault map pinned on the wall (the lookout's job!) and a framed picture, the lookout's little bench
  paStamp('lvbooth', x0 - 10, y0 - 6, w + 20, h + 14, 2, g => {
    const ox = 10, oy = 6, arch = () => { g.beginPath(); g.moveTo(ox, oy + h); g.lineTo(ox, oy + 26); g.quadraticCurveTo(ox, oy, ox + 26, oy); g.lineTo(ox + w - 26, oy); g.quadraticCurveTo(ox + w, oy, ox + w, oy + 26); g.lineTo(ox + w, oy + h); g.closePath(); };
    // the surround
    g.fillStyle = '#2e2849'; paRR(g, 2, 2, w + 16, h + 10, 14); g.fill();
    g.strokeStyle = '#3d3660'; g.lineWidth = 1.4; g.beginPath();
    for (let k = 0; k <= 8; k++) { const a = Math.PI + k * Math.PI / 8, cx = ox + w / 2, cy = oy + 40; g.moveTo(cx + Math.cos(a) * (w / 2 - 2), cy + Math.sin(a) * 38); g.lineTo(cx + Math.cos(a) * (w / 2 + 8), cy + Math.sin(a) * 46); }
    for (const yy of [oy + 52, oy + 70]) { g.moveTo(3, yy); g.lineTo(ox, yy); g.moveTo(ox + w, yy); g.lineTo(ox + w + 7, yy); }
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.07)'; paRR(g, 2, 2, w + 16, 3, 2); g.fill();
    g.strokeStyle = '#1e1a34'; g.lineWidth = 1.5; paRR(g, 2, 2, w + 16, h + 10, 14); g.stroke();
    // the room inside
    g.save(); arch(); g.clip();
    const gr = g.createLinearGradient(0, oy, 0, oy + h); gr.addColorStop(0, '#fff1c9'); gr.addColorStop(1, '#f2b866');
    g.fillStyle = gr; g.fillRect(ox, oy, w, h);
    g.fillStyle = 'rgba(255,255,255,0.25)'; paCirc(g, ox + w * 0.35, oy + 20, 30); g.fill();
    // a wood dado along the bottom with panels
    g.fillStyle = '#c98b5a'; g.fillRect(ox, oy + h - 26, w, 26);
    g.fillStyle = '#e0a874'; g.fillRect(ox, oy + h - 26, w, 2.5);
    g.strokeStyle = 'rgba(107,70,48,0.45)'; g.lineWidth = 1;
    for (let px = ox + 6; px < ox + w - 10; px += 24) g.strokeRect(px, oy + h - 21, 18, 14);
    // the map: parchment with a torn edge, room squares, a red X, a pin
    g.save(); g.translate(ox + 23, oy + 32); g.rotate(-0.06);
    g.fillStyle = '#f6e3b4'; paRR(g, -14, -11, 28, 22, 2); g.fill();
    g.strokeStyle = 'rgba(107,70,48,0.6)'; g.lineWidth = 0.8; g.strokeRect(-10, -7, 9, 7); g.strokeRect(1, -7, 9, 14); g.strokeRect(-10, 1, 9, 6);
    g.strokeStyle = '#d23c50'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(3, -4); g.lineTo(8, 1); g.moveTo(3, 1); g.lineTo(8, -4); g.stroke();
    g.strokeStyle = 'rgba(107,70,48,0.7)'; g.lineWidth = 1; paRR(g, -14, -11, 28, 22, 2); g.stroke();
    g.fillStyle = '#d23c50'; paCirc(g, 0, -10, 1.8); g.fill();
    g.restore();
    // a framed picture (a crown) on the right
    const fx = ox + w - 34, fy = oy + 24;
    g.fillStyle = '#8a5833'; g.fillRect(fx - 2, fy - 2, 26, 30); g.fillStyle = '#fbe9c4'; g.fillRect(fx + 2, fy + 2, 18, 22);
    g.fillStyle = '#ffc53d'; g.beginPath(); g.moveTo(fx + 5, fy + 18); g.lineTo(fx + 5, fy + 9); g.lineTo(fx + 8, fy + 13); g.lineTo(fx + 11, fy + 7); g.lineTo(fx + 14, fy + 13); g.lineTo(fx + 17, fy + 9); g.lineTo(fx + 17, fy + 18); g.closePath(); g.fill();
    g.strokeStyle = '#6b4630'; g.lineWidth = 1; g.strokeRect(fx - 2, fy - 2, 26, 30);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(fx - 2, fy - 2, 26, 1.2);
    g.restore();
  });
  ctx.fillStyle = '#8a5833'; ctx.fillRect(bx - 12, y0 + h - 4, 24, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(bx - 12, y0 + h - 4, 24, 1);
}
function laserDrawBoothFront(st) {
  const bx = st.seat.x + PW / 2, x0 = bx - 62, y0 = 8, w = 124, h = 84;
  // (cached) the window frame: a moulded wooden arch with a lit inner bead, glass glare, the sill on two brackets
  paStamp('lvframe', x0 - 8, y0 - 4, w + 16, h + 22, 3, g => {
    const ox = 8, oy = 4, arch = () => { g.beginPath(); g.moveTo(ox, oy + h); g.lineTo(ox, oy + 26); g.quadraticCurveTo(ox, oy, ox + 26, oy); g.lineTo(ox + w - 26, oy); g.quadraticCurveTo(ox + w, oy, ox + w, oy + 26); g.lineTo(ox + w, oy + h); };
    g.strokeStyle = '#4e3222'; g.lineWidth = 7; arch(); g.stroke();
    g.strokeStyle = '#6b4630'; g.lineWidth = 5; arch(); g.stroke();
    g.strokeStyle = '#9a6a44'; g.lineWidth = 1.4; g.save(); g.translate(-1, -1); arch(); g.stroke(); g.restore();
    g.strokeStyle = 'rgba(255,240,200,0.5)'; g.lineWidth = 1; g.save(); g.translate(2.5, 2.5); g.scale((w - 5) / w, 1); arch(); g.restore(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(ox + 14, oy + h - 14); g.lineTo(ox + 30, oy + 16); g.moveTo(ox + 24, oy + h - 10); g.lineTo(ox + 38, oy + 22); g.stroke();
    // brackets under the sill, then the sill board with grain, nails and a lit nose
    for (const kx of [ox + 6, ox + w - 14]) { g.fillStyle = '#6b4630'; g.beginPath(); g.moveTo(kx, oy + h + 5); g.lineTo(kx + 8, oy + h + 5); g.quadraticCurveTo(kx + 8, oy + h + 13, kx + 4, oy + h + 15); g.quadraticCurveTo(kx + 1, oy + h + 11, kx, oy + h + 5); g.fill(); g.strokeStyle = '#3d281b'; g.lineWidth = 1; g.stroke(); }
    paPlank(g, ox - 6, oy + h - 2, w + 12, 9, '#8a5833', 51, { r: 3, lw: 1.4, nails: true });
    g.fillStyle = 'rgba(255,220,170,0.45)'; g.fillRect(ox - 5, oy + h - 1.5, w + 10, 1.5);
  });
  // the lantern on its arm, aimed at the spot: a grained post with an iron band, a brass housing with ribs and rivets,
  // a flared hood and a glowing lens
  const s = st.spot, lx = st.lamp.x, ly = st.lamp.y, a = Math.atan2(s.y - ly, s.x - lx);
  const py0 = y0 + h + 6;
  if (ly - py0 > 1) paStamp('lvpost|' + Math.round(ly - py0), lx - 2.5, py0, 5, ly - py0, 2, g => {
    paPlank(g, 0, 0, 5, ly - py0, '#6b4630', 13, { vert: true, r: 1, lw: 1 });
    paMetal(g, -0.5, (ly - py0) * 0.45, 6, 3, '#7c8099', { r: 0.6, lw: 0.8, rivets: false });
  });
  ctx.save(); ctx.translate(lx, ly); ctx.rotate(a);
  paStamp('lvlamp', -10, -13, 30, 26, 3, g => {
    const X = 10, Y = 13;
    // the body: a rounded brass can with ribs
    const gb = g.createLinearGradient(0, Y - 10, 0, Y + 10); gb.addColorStop(0, '#b07a48'); gb.addColorStop(0.35, '#d49a5c'); gb.addColorStop(1, '#6b4630');
    g.fillStyle = gb; paRR(g, X - 10, Y - 10, 18, 20, 5); g.fill();
    g.strokeStyle = 'rgba(70,40,20,0.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X - 4, Y - 10); g.lineTo(X - 4, Y + 10); g.moveTo(X + 2, Y - 10); g.lineTo(X + 2, Y + 10); g.stroke();
    g.strokeStyle = '#4e3222'; g.lineWidth = 1.4; paRR(g, X - 10, Y - 10, 18, 20, 5); g.stroke();
    for (const [nx, ny] of [[X - 7, Y - 7], [X - 7, Y + 7]]) paNail(g, nx, ny, '#d49a5c', 1);
    // the hood: a flared brass cone
    const gh = g.createLinearGradient(0, Y - 13, 0, Y + 13); gh.addColorStop(0, '#f2cf6a'); gh.addColorStop(0.4, '#d9a640'); gh.addColorStop(1, '#8a6420');
    g.fillStyle = gh; g.beginPath(); g.moveTo(X + 6, Y - 9); g.lineTo(X + 18, Y - 13); g.lineTo(X + 18, Y + 13); g.lineTo(X + 6, Y + 9); g.closePath(); g.fill();
    g.strokeStyle = '#7a5418'; g.lineWidth = 1.2; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X + 7, Y - 8); g.lineTo(X + 17, Y - 11.5); g.stroke();
    g.fillStyle = '#7a5418'; g.fillRect(X + 4.5, Y - 9.5, 3, 19);
  });
  ctx.fillStyle = st.bright ? '#fff7b0' : '#fff4d6'; ctx.fillRect(16, -11, 3, 22);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(16.5, -9, 1.2, 7);
  ctx.restore();
}
function laserDraw() {
  const st = G.mst; if (!st.beams) return;
  laserDrawBackdrop();
  const s = st.spot, R = laserSpotR(st), big = hudBig();
  // darkness with the lantern's hole: the gradient only in the square around the light, a flat fill elsewhere (same look,
  // much cheaper on big screens)
  const g = ctx.createRadialGradient(s.x, s.y, R * 0.55, s.x, s.y, R * 1.08), q = Math.ceil(R * 1.1);
  g.addColorStop(0, 'rgba(12,9,30,0)'); g.addColorStop(1, 'rgba(12,9,30,0.66)');
  let [qx0, qy0, qx1, qy1] = [s.x - q, s.y - q, s.x + q, s.y + q];
  try {   // snap the square to whole device pixels, so its edge leaves no faint seam
    const m = ctx.getTransform(), sx = v => (Math.round(m.a * v + m.e) - m.e) / m.a, sy = v => (Math.round(m.d * v + m.f) - m.f) / m.d;
    qx0 = sx(qx0); qx1 = sx(qx1); qy0 = sy(qy0); qy1 = sy(qy1);
  } catch (e) { /* unsnapped */ }
  ctx.fillStyle = 'rgba(12,9,30,0.66)';
  ctx.beginPath(); ctx.rect(-40, -40, W + 80, H + 80); ctx.rect(qx0, qy0, qx1 - qx0, qy1 - qy0); ctx.fill('evenodd');
  ctx.fillStyle = g; ctx.fillRect(qx0, qy0, qx1 - qx0, qy1 - qy0);
  // light cone from the lamp
  const lx = st.lamp.x, ly = st.lamp.y, d = Math.hypot(s.x - lx, s.y - ly);
  if (d > R) {
    const a = Math.atan2(s.y - ly, s.x - lx), off = Math.asin(R / d), tl = Math.sqrt(d * d - R * R);
    ctx.fillStyle = 'rgba(255,236,170,0.07)'; ctx.beginPath(); ctx.moveTo(lx, ly);
    ctx.lineTo(lx + Math.cos(a - off) * tl, ly + Math.sin(a - off) * tl); ctx.arc(s.x, s.y, R, a - off - Math.PI / 2, a + off + Math.PI / 2); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = st.bright ? 'rgba(255,214,90,0.12)' : 'rgba(255,240,190,0.08)'; circle(s.x, s.y, R); ctx.fill();
  ctx.strokeStyle = st.bright ? 'rgba(255,197,61,0.6)' : 'rgba(255,240,190,0.25)'; ctx.lineWidth = big ? 3 : 2; circle(s.x, s.y, R); ctx.stroke();
  // checkpoint rugs
  for (const rg of st.rugs) {
    const x = rg.c * T, y = (rg.r + 1) * T;
    ctx.fillStyle = rg.on ? '#3fbf7f' : '#5c4f86'; rr(x + 1, y - 5, T - 2, 5, 2); ctx.fill();
    ctx.fillStyle = rg.on ? 'rgba(124,240,176,0.9)' : 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 4, y - 4, T - 8, 1.5);
    // a woven border with a diamond pattern and a tassel fringe at each end
    ctx.fillStyle = rg.on ? 'rgba(20,90,50,0.6)' : 'rgba(30,24,60,0.6)'; ctx.fillRect(x + 2, y - 1.5, T - 4, 1.5);
    ctx.fillStyle = rg.on ? 'rgba(255,240,150,0.75)' : 'rgba(217,166,64,0.5)'; for (let k = 0; k < 4; k++) { const dx = x + 6 + k * 6; ctx.beginPath(); ctx.moveTo(dx, y - 4.2); ctx.lineTo(dx + 1.6, y - 2.6); ctx.lineTo(dx, y - 1); ctx.lineTo(dx - 1.6, y - 2.6); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = rg.on ? 'rgba(124,240,176,0.8)' : 'rgba(200,190,230,0.45)'; ctx.lineWidth = 0.8; ctx.beginPath();
    for (const ex of [x + 1, x + T - 1]) for (let k = 0; k < 3; k++) { const fy = y - 4 + k * 1.6; ctx.moveTo(ex, fy); ctx.lineTo(ex + (ex < x + 15 ? -2.5 : 2.5), fy + 0.6); }
    ctx.stroke();
    if (rg.on) { ctx.fillStyle = 'rgba(124,240,176,0.18)'; circle(x + 15, y - 6, 14); ctx.fill(); }
  }
  // fuse boxes
  for (const b of st.boxes) {
    const bk = b.bank && st.banks[b.bank], col = bk ? bk.col : '#888', off = !!(bk && bk.offT > 0);
    const sc = (1 + b.pop * 0.6) * (big ? 1.2 : 1);   // a bit bigger on phones
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(sc, sc);
    if (b.call > 0) { ctx.fillStyle = 'rgba(255,197,61,' + (0.18 + 0.12 * Math.sin(G.clock * 10)) + ')'; circle(0, 0, 22); ctx.fill(); }
    // a riveted iron cabinet: a lit top edge, a darker foot, hinges on the left, vents at the bottom, coloured trim
    paStamp('laserfuse', -11, -14, 22, 28, 2, g => {
      paMetal(g, 0, 0, 22, 28, '#2e2948', { r: 4, lw: 1.2, rivets: false });
      for (const [rx2, ry2] of [[3, 3], [19, 3], [3, 25], [19, 25]]) paNail(g, rx2, ry2, '#8a82b0', 0.9);
      g.fillStyle = '#4a4466'; g.fillRect(-1, 6, 2.5, 4); g.fillRect(-1, 18, 2.5, 4);
      g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 0.8; g.beginPath(); for (let k = 0; k < 3; k++) { g.moveTo(7, 22 + k * 1.6); g.lineTo(15, 22 + k * 1.6); } g.stroke();
    });
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-11, -14, 22, 28, 4); ctx.stroke();
    ctx.fillStyle = off ? 'rgba(255,255,255,0.25)' : col; laserDrawShape(bk ? bk.shape : 'circle', 0, -4, 5); ctx.fill();
    ctx.strokeStyle = '#d9d3ef'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(off ? -6 : 6, 3); ctx.stroke();
    if (off) { // countdown ring (ticks and flickers in the last 1.5 s)
      const warn = bk.offT < LASER.bankWarn && Math.sin(G.clock * 40) < 0;
      ctx.strokeStyle = warn ? '#fff' : col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * bk.offT / bk.off); ctx.stroke();
    }
    ctx.restore();
    if (b.call > 0) {   // the gold call arrow bouncing over the box
      const bob = Math.sin(G.clock * 10) * 4, e = big ? 1.4 : 1, y = b.y - 20 * e + bob;
      ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(b.x, y); ctx.lineTo(b.x - 8 * e, y - 11 * e); ctx.lineTo(b.x + 8 * e, y - 11 * e); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  // coins (secret ones only once the light found them)
  for (const c of st.coins) if (!c.got && (c.found || MODES.laser.debug)) {
    const w = Math.abs(Math.cos(c.t * 3)) * 6 + 1.5;
    ctx.fillStyle = 'rgba(255,215,90,0.18)'; circle(c.x, c.y, 11); ctx.fill();
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.ellipse(c.x, c.y, w, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.goldDark; ctx.lineWidth = 1.5; ctx.stroke();
  }
  if (st.gem) laserDrawPrize(st, st.gem);
  // exit hatch (Crown Room): a dark door that swings open on the alarm
  for (const e of st.exits) {
    const open = st.phase === 'escape' || st.phase === 'won', x = e.x, y = e.y - T;
    paStamp('laserhatch', x + 1, y + 2, T - 2, 2 * T - 2, 2, g => {
      paPlank(g, 0, 0, T - 2, 2 * T - 2, '#6b4630', 15, { vert: true, r: 8, lw: 1.6 });
      g.fillStyle = '#3c3655'; g.fillRect(0, 12, T - 2, 3); g.fillRect(0, 2 * T - 18, T - 2, 3);
      for (const ry2 of [13.5, 2 * T - 16.5]) for (const rx2 of [3, T - 5]) paNail(g, rx2, ry2, '#8a82b0', 0.9);
    });
    ctx.fillStyle = open ? '#ffe3a3' : '#2a2542'; rr(x + 5, y + 6, T - 10, 2 * T - 6, 6); ctx.fill();
    if (!open) { ctx.strokeStyle = 'rgba(120,80,40,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); for (const vx of [x + 11, x + 17]) { ctx.moveTo(vx, y + 9); ctx.lineTo(vx, y + 2 * T - 2); } ctx.stroke(); }
    if (open) {
      ctx.fillStyle = 'rgba(255,215,120,0.25)'; circle(x + 15, y + 30, 30 + Math.sin(G.clock * 6) * 3); ctx.fill();
      text('EXIT', x + 17, y - 9, big ? 17 : 13, C.gold, 'center');
    } else { ctx.fillStyle = '#d9a640'; circle(x + 21, y + 32, 2); ctx.fill(); }
  }
  for (const b of st.beams) laserDrawBeam(st, b);
  laserDrawBoothBack(st);
}
// a dark chip with a coloured title and an optional key line (role hints and nudges)
function laserBubble(t1, t2, x, y, col) {
  const z = laserZ(), f1 = Math.round(13 * z), f2 = Math.round(12 * z);
  ctx.font = '700 ' + f1 + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  let w = ctx.measureText(t1).width;
  if (t2) { ctx.font = '700 ' + f2 + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; w = Math.max(w, ctx.measureText(t2).width); }
  w += 22 * z; const h = (t2 ? 38 : 22) * z;
  const x0 = clamp(x - w / 2, 8, W - 8 - w), y0 = clamp(y - h, 8, H - 8 - h);
  ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(x0, y0, w, h, 9 * z); ctx.fill();
  text(t1, x0 + w / 2, y0 + 11 * z, f1, col, 'center', 'body');
  if (t2) text(t2, x0 + w / 2, y0 + 28 * z, f2, C.paper, 'center', 'body');
  return y0;
}
function laserDrawTop() {
  const st = G.mst; if (!st.beams) return;
  const lk = G.players[st.look], r = G.players[st.runner], z = laserZ();
  laserDrawBoothFront(st);
  // goggles on the lookout
  ctx.fillStyle = '#2b2744'; ctx.fillRect(lk.x + 2, lk.y + 6, lk.w - 4, 5);
  ctx.fillStyle = '#9ff0ff'; circle(lk.x + 7 + lk.face, lk.y + 9, 3.5); ctx.fill(); circle(lk.x + 15 + lk.face, lk.y + 9, 3.5); ctx.fill();
  // ping: "Look!"
  if (st.ping) {
    const p = st.ping, k = p.t / LASER.pingLife, bob = Math.abs(Math.sin(p.t * 9)) * 8;
    ctx.save(); ctx.globalAlpha = 1 - k * k;
    ctx.strokeStyle = PCOL[st.look]; ctx.lineWidth = 3; circle(p.x, p.y, 10 + k * 26); ctx.stroke();
    ctx.fillStyle = PCOL[st.look]; ctx.beginPath(); ctx.moveTo(p.x, p.y - 6 - bob); ctx.lineTo(p.x - 9, p.y - 20 - bob); ctx.lineTo(p.x + 9, p.y - 20 - bob); ctx.closePath(); ctx.fill();
    bigText('Look!', p.x, p.y - 31 - bob, Math.round(16 * z), PCOL[st.look]);
    ctx.restore();
  }
  // the crown rides on the runner's head on the way out
  if ((st.phase === 'escape' || (st.phase === 'won' && G.level.def.alarm)) && r.alive) drawCrownShape(r.x + r.w / 2, r.y - 12 + Math.sin(G.clock * 8) * 1.5, 0.75);
  // zap sparks
  if (st.zap && r.alive) {
    const rnd = MODES.laser.rand;
    ctx.strokeStyle = '#bff3ff'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const a2 = rnd() * Math.PI * 2, l = 10 + rnd() * 10; ctx.beginPath(); ctx.moveTo(r.x + r.w / 2, r.y + r.h / 2); ctx.lineTo(r.x + r.w / 2 + Math.cos(a2) * l, r.y + r.h / 2 + Math.sin(a2) * l); ctx.stroke(); }
  }
  // role hints (first seconds of a room), then nudges for a partner who stopped; a player still holding a button from the
  // card (input locked) is told to let go instead. runTop = the top of the chip over the runner (the shout goes above it)
  let runTop = null;
  if (st.phase !== 'won' && G.introT <= LASER.introHold) {
    const rx = r.x + r.w / 2, ry = r.y - 30 - (st.phase === 'escape' ? 14 : 0), bx2 = st.seat.x + PW / 2, hy = 168 + (z - 1) * 60;
    const goal = st.phase === 'escape' ? 'door' : (G.level.def.prize === 'crown' ? 'crown' : 'gem');
    const locked = id => st.lock[id] && st.lockT[id] > LASER.lockChip;
    const runChip = (t1, t2) => { if (r.alive && !st.zap) runTop = laserBubble(t1, t2, rx, ry, PCOL[st.runner]); };
    // (1-player mode: the computer's role is named, with no keys and no nudges)
    const cpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
    if (cpu(st.runner)) {
      if (st.hint > 0) runChip(NAMES[st.runner] + ' sneaks to the ' + goal + '!', 'the computer runs');
      else if (st.escHint > 0) runChip(NAMES[st.runner] + ' runs back to the door!', null);
    } else if (locked(st.runner)) runChip(NAMES[st.runner] + ': let go of the buttons!', 'then you can move');
    else if (st.hint > 0) runChip(NAMES[st.runner] + ': sneak to the ' + goal + '!', laserKeys(st.runner, 'run'));
    else if (st.escHint > 0) runChip(NAMES[st.runner] + ': run back to the door!', laserKeys(st.runner, 'run'));
    else if (st.runIdle > LASER.runNudge) runChip(NAMES[st.runner] + ': sneak on!', null);
    if (cpu(st.look)) { if (st.hint > 0) laserBubble(NAMES[st.look] + ' shines the light!', 'the computer looks out', bx2, hy, PCOL[st.look]); }
    else if (locked(st.look)) laserBubble(NAMES[st.look] + ': let go of the buttons!', 'then you can move the light', bx2, hy, PCOL[st.look]);
    else if (st.hint > 0) laserBubble(NAMES[st.look] + ': shine the light!', laserKeys(st.look, 'look'), bx2, hy, PCOL[st.look]);
    else if (st.escHint <= 0 && st.lookNudgeOn) {
      ctx.save(); ctx.globalAlpha = 0.75 + 0.25 * Math.sin(G.clock * 6);
      laserBubble(NAMES[st.look] + ': move the light!', laserKeys(st.look, 'look'), bx2, hy, PCOL[st.look]);
      ctx.restore();
    }
  }
  // the runner's shout: a cream speech bubble, drawn over the hints (above the runner's chip while one shows)
  if (st.shout && r.alive) {
    const k = st.shout.t / LASER.shoutLife;
    ctx.save(); ctx.globalAlpha = Math.min(1, (1 - k) * 3);
    const fs = Math.round(16 * z), bx3 = r.x + r.w / 2;
    const by3 = runTop !== null ? runTop - 2 - k * 8 + 7 : r.y - 16 - k * 8 - (st.phase === 'escape' ? 14 : 0);
    ctx.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const bw = ctx.measureText(st.shout.text).width + 18 * z, bh = 26 * z, x0 = clamp(bx3 - bw / 2, 6, W - 6 - bw);
    const y0 = Math.max(6, by3 - bh - 6);
    ctx.fillStyle = '#fff6e0'; ctx.strokeStyle = PDARK[st.runner]; ctx.lineWidth = 2.5;
    rr(x0, y0, bw, bh, 10); ctx.fill(); ctx.stroke();
    if (runTop === null) { ctx.beginPath(); ctx.moveTo(bx3 - 5, y0 + bh - 1); ctx.lineTo(bx3, y0 + bh + 6); ctx.lineTo(bx3 + 5, y0 + bh - 1); ctx.closePath(); ctx.fill(); }
    text(st.shout.text, x0 + bw / 2, y0 + bh / 2, fs, PDARK[st.runner], 'center');
    ctx.restore();
  }
  // pops ("Secret coin!", "Bright lamp!") on top of everything
  for (const p of st.pops) { ctx.save(); ctx.globalAlpha = 1 - p.t / 1.2; bigText(p.text, clamp(p.x, 70 * z, W - 70 * z), p.y - p.t * 25, Math.round(17 * z), C.gold); ctx.restore(); }
  // zap flash and the alarm vignette (no flash and no pulsing with reduced motion; nothing drawn once it has faded)
  if (st.flash > 0 && !reduceMotion) { ctx.fillStyle = `rgba(255,60,80,${0.5 * st.flash})`; ctx.fillRect(0, 0, W, H); }
  if (st.alarmT > 0 || st.phase === 'escape') {
    const k = Math.min(1, st.phase === 'escape' ? (reduceMotion ? 0.7 : 0.55 + 0.45 * Math.sin(G.clock * Math.PI * 4)) : st.alarmT);
    if (k > 0.03) {
      // a red glow around the screen edge: four gradient bands (corners overlap a little redder), no full-screen pass
      const a = 0.4 * k, e = 74, edge = `rgba(255,40,70,${a.toFixed(3)})`, clear = 'rgba(255,40,70,0)';
      const band = (x0, y0, x1, y1, x, y, w, h) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, edge); g.addColorStop(1, clear); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); };
      band(0, 0, 0, e, 0, 0, W, e); band(0, H, 0, H - e, 0, H - e, W, e);
      band(0, 0, e, 0, 0, 0, e, H); band(W, 0, W - e, 0, W - e, 0, e, H);
    }
  }
  if (st.phase === 'won') {
    const k = Math.min(1, st.winT / 0.3), last = G.level.def.roomIndex >= G.level.def.roomCount - 1;
    bigText(last ? 'Treasure saved!' : 'Got it!', W / 2, 200, 44, C.gold, 0.6 + 0.4 * k);
    bigText('★'.repeat(st.stars) + '☆'.repeat(3 - st.stars), W / 2, 252, 36, C.gold, k);
    const zl = st.roomZaps === 0 ? 'Sneaky! No zaps.' : st.roomZaps + ' zap' + (st.roomZaps === 1 ? '' : 's');
    ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = 'rgba(28,26,54,0.75)'; rr(W / 2 - 90, 272, 180, 26, 13); ctx.fill();
    text(zl, W / 2, 285, 16, C.paper, 'center', 'body'); ctx.restore();
  }
}
function laserHud() {
  const st = G.mst; if (!st.stats) return;
  laserSeeDevices(); laserActLabels(st);
  const stars = st.phase === 'won' ? st.stars : laserStars(st.roomZaps), z = laserZ(), fs = Math.round(14 * z), big = z > 1;
  // time · stars · zaps · coin icon + count (no "Coins" word; tighter gaps on phones), so the pill stays clear of the
  // lookout's window even at "12:34.3 ★☆☆ Zaps 23 ● 20"
  const parts = [[fmtTime(G.time), C.paper], ['★'.repeat(stars) + '☆'.repeat(3 - stars), C.gold], ['Zaps ' + st.roomZaps, C.paper], [String(st.stats.coins), C.paper]];
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const gap = (big ? 12 : 22) * z, coinR = 6 * z, ws = parts.map(q => ctx.measureText(q[0]).width);
  const inner = ws.reduce((a, b) => a + b, 0) + gap * 3 + coinR * 2 + 5 * z, sw = inner + 28, ph = Math.round(28 * (big ? 1.3 : 1));
  pill(W - 14, 12, sw, ph, 'right');
  let x = W - 14 - sw + 14; const cy = 12 + ph / 2 + 0.5;
  parts.forEach((q, i) => {
    if (i === 3) {   // a little gold coin in front of the count
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.ellipse(x + coinR, cy, coinR * 0.8, coinR, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.goldDark; ctx.lineWidth = 1.5; ctx.stroke(); x += coinR * 2 + 5 * z;
    }
    text(q[0], x, cy, fs, q[1], 'left', 'body'); x += ws[i] + gap;
  });
}

MODES.laser = {
  medals: { bronze: 'Get out of the vault', goals: [{ key: 'stars', gold: 11, silver: 8, more: true, text: n => `${n} of 12 stars or more`, gap: (v, n) => `${n - v} more star${n - v === 1 ? '' : 's'}` }, { key: 'time', gold: 120 }] },
  medalValues() { const s = G.mst.stats; return s ? { stars: s.stars.reduce((a, b) => a + (b || 0), 0) } : {}; },
  rand: Math.random,
  setup(st, L) {
    st.stats = { zaps: [0, 0], flips: [0, 0], pings: [0, 0], shouts: [0, 0], coins: 0, found: 0, stars: [], roomZaps: [], roomTime: [], roomCoinsGot: [], roomCoinsMax: [] };
    laserRoom(st, L, 0);
  },
  room(k, L) { laserRoom(G.mst, L, k); },
  step(dt) { laserStep(G.mst, dt); },
  draw() { laserDraw(); },
  drawTop() { laserDrawTop(); },
  hud() { laserHud(); },
  stats() {
    const s = G.mst.stats, stars = s.stars.reduce((a, b) => a + (b || 0), 0);
    return [
      { label: 'Stars', value: stars + ' / 12' },
      { label: 'Coins', value: s.coins + ' / 20' },
      { label: 'Zapped', values: s.zaps.slice() },
      { label: 'Boxes flipped', values: s.flips.slice() },
      s.zaps[0] + s.zaps[1] === 0 ? 'Sneaky as ghosts! Not a single zap.' : 'Secret coins found: ' + s.found + ' of 4',
    ];
  },
};
Sfx.extra.laserZap = function (p) { this.tone(1400 * p, 0.08, 'sawtooth', 0.05, 300 * p); this.tone(90, 0.25, 'square', 0.04, 60, 0.05); };
Sfx.extra.laserAlarm = function () { [0, 0.22].forEach(d => { this.tone(880, 0.11, 'square', 0.035, 660, d); this.tone(660, 0.11, 'square', 0.03, 880, d + 0.11); }); };
Sfx.extra.laserPoof = function (p) { this.tone(500 * p, 0.12, 'triangle', 0.05, 900 * p); };
Sfx.extra.laserDuck = function (p) { this.tone(260 * p, 0.06, 'triangle', 0.03, 180 * p); };
Sfx.extra.laserFlip = function () { this.tone(160, 0.06, 'square', 0.05); this.tone(700, 0.3, 'sawtooth', 0.03, 120, 0.04); };
Sfx.extra.laserHum = function () { this.tone(110, 0.25, 'sawtooth', 0.03, 220); };
Sfx.extra.laserTick = function () { this.tone(1200, 0.03, 'square', 0.025); };
Sfx.extra.laserPing = function (p) { this.tone(1320 * p, 0.09, 'triangle', 0.05); this.tone(1760 * p, 0.12, 'triangle', 0.04, null, 0.06); };
Sfx.extra.laserShout = function (p) { this.tone(520 * p, 0.08, 'square', 0.04, 780 * p); this.tone(780 * p, 0.1, 'square', 0.035, null, 0.08); };
Sfx.extra.laserCoin = function () { this.tone(988, 0.06, 'square', 0.04); this.tone(1319, 0.12, 'square', 0.04, null, 0.05); };
Sfx.extra.laserRug = function () { [523, 784].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.laserGem = function () { [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.06, null, i * 0.08)); };
Sfx.extra.laserGrab = function () { [784, 1175].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.06, null, i * 0.07)); };
Sfx.extra.laserFound = function () { [1175, 1568, 2093].forEach((f, i) => this.tone(f, 0.07, 'triangle', 0.04, null, i * 0.05)); };
Sfx.extra.laserHelp = function () { this.tone(1320, 0.1, 'triangle', 0.05); this.tone(1760, 0.12, 'triangle', 0.04, null, 0.05); };
Sfx.extra.laserCall = function () { this.tone(988, 0.07, 'triangle', 0.035); this.tone(1319, 0.09, 'triangle', 0.03, null, 0.08); };
Sfx.extra.laserNudge = function (p) { this.tone(660 * p, 0.08, 'triangle', 0.03); this.tone(880 * p, 0.1, 'triangle', 0.025, null, 0.1); };
MODES.laser.test = { LASER, laserSegRect, laserSegDist, laserHit, laserStars, laserKeys, laserDev, LASER_DEV };   // (lead review) bots use this, not a window global
MODES.laser.debug = false;   // (lead review) true draws every beam and coin (for screenshots)

