/* Pip & Bo - Level 8-3 Slot Machine Run (team). */
'use strict';

/* ===== Slot Machine Run (mode 'slots', World 8 "Lucky Casino", team) =====
   One player (the STOPPER) walks the button deck under the reels and stops them; the other (the RUNNER) hops
   across on the pictures that land on the payline. Roles swap every room. Map markers (replaced by '.'):
     Z  reel window cell (a 3 x 6 block = one reel, numbered left to right)   $  ticket (pretend prize ticket)
     j  jackpot lever, on the goal block's first column (its x is the goal face)   S  jackpot spring spot (deck floor)
     C  runner checkpoint (standing on this ledge moves the runner's respawn here)
   Room def: { title, tip, stopper: 0|1, slots: { speed, holdT, reels: [{ strip, need, dir, speed }] } } */
const SLOTS = {
  cellH: 60, trayY: 390, deckFloor: 510,
  grace: 0.1,          // a press counts the symbol whose centre is within -0.4..+0.6 cells of the payline centre (late-friendly)
  settleT: 0.15,       // stop clunk
  spinUp: 0.25,        // a re-spun reel ramps to full speed
  badRespin: 1.5,      // a sour stop spins again by itself
  leaveGrace: 0.4,     // a held reel the runner was over keeps at least this much hold after they leave
  cherryV: 980, mantle: 30, bellPay: 3, savePay: 3, ticketPay: 2, jackPay: 10, jackPayLast: 20,
  slow1: 2, slow1x: 0.6, slow2: 4, slow2x: 0.45, magnetAt: 6,   // misses in a row on one reel -> lucky slow / glow / magnet
  plopT: 0.7, introHold: 0.6, hintT: 7, idleStop: 4, idleRun: 4, shoutCD: 0.8,
  springApex: 50, springVx: 210, zonePad: 15, springSlack: 1.5,
  catchGrace: 20,     // a good stop a moment too late still catches a falling runner (centre over the reel) whose feet are up to this far below the picture's top
  firstHint: 1.5,     // a stopper's first room: the ▼ 'stand here' nudge shows after this wait (later: idleStop)
  jackLock0: 0.35, jackLockDt: 0.14, jackShow: 1.75,   // jackpot: reels lock gold from 0.35 s, 0.14 s apart, then the fanfare; the door waits until jackShow (+ its own 0.35 s)
};
const SLOTS_SYM = {
  B: { name: 'bar', top: 30 }, '7': { name: 'seven', top: 0 }, b: { name: 'bell', top: 30, bell: true },
  C: { name: 'cherry', top: 34, bounce: true }, L: { name: 'lemon', top: null }, G: { name: 'gold', top: 0 },
};
const slotsSym = (r, k) => r.strip[((k % r.n) + r.n) % r.n];
const slotsGoodCh = (r, ch) => ch === 'G' || (r.need ? r.need.includes(ch) : ch !== 'L');
function slotsPlat(r) {
  if (r.state !== 'stop' && r.state !== 'settle') return null;
  const ch = slotsSym(r, r.target);
  if (!slotsGoodCh(r, ch)) return null;
  return { top: r.yp + SLOTS_SYM[ch].top, bounce: !!SLOTS_SYM[ch].bounce, ch };
}
function slotsRoom(st, L) {
  const def = L.def, cfg = def.slots || {}, grid = L.grid, R = MODES.slots.rand;
  st.stopper = def.stopper; st.runner = 1 - def.stopper;
  st.reels = []; st.tickets = []; st.lever = null; st.spring = null; st.cps = [];
  const seen = {};
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = grid[r][c];
    if (ch === 'Z' && !seen[r * COLS + c]) {
      for (let y = r; y < r + 6; y++) for (let x = c; x < c + 3; x++) seen[y * COLS + x] = true;
      st.reels.push({ c0: c, r0: r });
    } else if (ch === '$') st.tickets.push({ x: c * T + 15, y: r * T + 15, got: false, ph: R() * 6 });
    else if (ch === 'j') st.lever = { x: c * T, y: r * T, pulled: false, t: 0 };
    else if (ch === 'S') st.spring = { x: c * T, y: SLOTS.deckFloor, w: T, on: false, t: 0, boing: 0 };
    else if (ch === 'C') st.cps.push({ x0: c * T - 15, x1: c * T + 45, y: (r + 1) * T, sx: c * T + (T - PW) / 2 });
  }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if ('Z$jSC'.includes(grid[r][c])) grid[r][c] = '.';
  st.reels.sort((a, b) => a.c0 - b.c0);
  st.reels.forEach((rl, i) => {
    const rc = (cfg.reels || [])[i] || {};
    const strip = (rc.strip || 'B7BbLB').split('');
    Object.assign(rl, {
      i, x0: rl.c0 * T, x1: (rl.c0 + 3) * T, wy: rl.r0 * T, yp: (rl.r0 + 2) * T, strip, n: strip.length,
      need: rc.need || null, dir: rc.dir || 1, speed: rc.speed || cfg.speed || 1.4, holdT: cfg.holdT == null ? null : cfg.holdT,
      pos: Math.floor(R() * strip.length) + R(), state: 'spin', ramp: 1, from: 0, target: 0, t: 0,
      holdLeft: 0, badT: 0, missRun: 0, slow: 1, glow: false, magnet: false, bellPaid: false,
      flash: 0, holdFlash: 0, jackAt: 0, wasGood: false, beamT: 0,
    });
  });
  st.goalTop = L.door ? L.door.y + L.door.h : 300;
  st.phase = 'play'; st.jackT = 0; st.roomT = 0; st.waitT = 0; st.runIdle = 0;
  st.pl = [0, 1].map(k => { const p = G.players[k]; return { prevFeet: p.y + p.h, on: null, fly: false, shoutT: 0, cool: 0 }; });
  st.pops = []; st.bubbles = []; st.saveWatch = null;
  st.chute = { x: G.spawnPts[st.runner].x + PW / 2, y: G.spawnPts[st.runner].y + PH, t: 0 };
  if (st.spring) {
    const H = SLOTS.deckFloor - st.goalTop + SLOTS.springApex;
    st.spring.v = Math.sqrt(2 * PHYS.g * H) * 1.03;   // discrete integration loses ~3 %
  }
  st.goalX = st.lever ? st.lever.x : W;                 // the goal block's face
}
function slotsPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || C.gold, size: size || 18, t: 0 }); }
function slotsBubble(st, p, s, dur) {
  st.bubbles = st.bubbles.filter(b => b.id !== p.id);
  st.bubbles.push({ id: p.id, s, t: dur || 1.3 });
}
function slotsZone(st, p) {
  if (!p.alive || p.y < SLOTS.trayY) return -1;
  const cx = p.x + p.w / 2;
  for (const r of st.reels) if (cx >= r.x0 - SLOTS.zonePad && cx < r.x1 + SLOTS.zonePad) return r.i;
  return -1;
}
// the runner is standing on this reel or in the air right above it
function slotsOver(st, r) {
  const p = G.players[st.runner];
  if (!p.alive) return false;
  const cx = p.x + p.w / 2;
  return cx >= r.x0 - 6 && cx <= r.x1 + 6 && p.y + p.h <= r.yp + 37;
}
function slotsRespin(r) { r.state = 'spin'; r.ramp = 0; r.pos = r.target; r.wasGood = false; Sfx.play('slotsRespin'); }
function slotsStop(st, r, by) {
  let k = Math.round(r.pos - SLOTS.grace * r.dir);
  if (r.missRun >= SLOTS.magnetAt && !slotsGoodCh(r, slotsSym(r, k)))   // the magnet: the nearest good picture (the one just passed first)
    for (let d = 1, done = false; d <= r.n >> 1 && !done; d++) for (const j of [k - r.dir * d, k + r.dir * d]) if (slotsGoodCh(r, slotsSym(r, j))) { k = j; done = true; break; }
  r.state = 'settle'; r.from = r.pos; r.target = k; r.t = 0;
  const ch = slotsSym(r, k), good = slotsGoodCh(r, ch), S = st.stats;
  Sfx.play('slotsStop');
  rumble(by, 0.15, 0.3, 60);
  const cx = (r.x0 + r.x1) / 2;
  if (good) {
    S.stops[by]++;
    if (r.missRun === 0) S.perfect[by]++;
    r.missRun = 0; r.slow = 1; r.glow = false; r.magnet = false; r.wasGood = true;
    r.holdLeft = r.holdT == null ? Infinity : r.holdT; r.flash = 0.4;
    Sfx.play(ch === 'b' ? 'slotsBell' : 'slotsGood');
    if (ch === 'b' && !r.bellPaid) { r.bellPaid = true; slotsPay(st, SLOTS.bellPay, cx, r.yp + 30); slotsPop(st, cx, r.yp - 8, '+' + SLOTS.bellPay + ' tickets!', C.gold, 16); }
    // a mid-air save: the runner is in the air (jumping or falling) and lands on this reel next
    const p = G.players[st.runner];
    if (p.alive && !p.grounded) {
      const top = r.yp + SLOTS_SYM[ch].top, feet = p.y + p.h;
      // a stop a moment too late (the feet just sank past the picture's top) still catches them: the reel settles up under them
      const pcx = p.x + p.w / 2;
      if (p.vy > 0 && feet > top + 2 && feet <= top + SLOTS.catchGrace && pcx >= r.x0 && pcx <= r.x1) {
        moveY(p, top - p.h - p.y, true);
        if (Math.abs(p.y + p.h - top) < 0.5) { st.pl[p.id].prevFeet = top; st.stats.late++; }
      }
      st.saveWatch = { r, t: 0.8, by };
    }
  } else {
    r.missRun++; r.badT = SLOTS.badRespin;
    Sfx.play('slotsSour');
    slotsPop(st, cx, r.yp - 8, ch === 'L' ? 'Sour!' : 'Need ' + (r.need === 'C' ? 'a cherry' : 'a 7') + '!', '#ffe36b', 15);
    if (r.missRun >= SLOTS.slow2) { r.slow = SLOTS.slow2x; r.glow = true; } else if (r.missRun >= SLOTS.slow1) r.slow = SLOTS.slow1x;
    if (r.missRun === SLOTS.slow1) slotsPop(st, cx, r.wy - (r.need ? 46 : 14), 'Lucky slow-mo!', C.gold, 16);   // (over the need tag)
    if (r.missRun >= SLOTS.magnetAt) r.magnet = true;
  }
}
function slotsPay(st, n, x, y) {
  st.tickets_ += n; st.stats.tickets += n;
  for (let i = 0; i < Math.min(8, n * 2); i++) G.particles.push({ x, y, vx: (MODES.slots.rand() - 0.5) * 160, vy: -120 - MODES.slots.rand() * 160, life: 0.8, max: 0.8, col: i % 2 ? '#ff8fc7' : C.gold, size: 4, grav: 600, kind: 'conf', rot: 0, vr: 8 });
  Sfx.play('slotsTicket');
}
// "Stand under a reel!" with an arrow to the reel the runner waits for (else the nearest one), and its spotlight blinks
function slotsWhere(st, s) {
  const cx = s.x + s.w / 2;
  let near = st.waitT > 0.3 ? slotsAhead(st) : null;
  if (!near) for (const r of st.reels) if (!near || Math.abs((r.x0 + r.x1) / 2 - cx) < Math.abs((near.x0 + near.x1) / 2 - cx)) near = r;
  if (!near) return;
  slotsBubble(st, s, (near.x0 + near.x1) / 2 < cx ? '◀ Stand under a reel!' : 'Stand under a reel! ▶');
  near.beamT = 1.3;
}
function slotsPress(st, s) {
  if (G.introT > SLOTS.introHold || st.phase !== 'play') return;
  const z = slotsZone(st, s);
  if (z < 0) { slotsWhere(st, s); return; }
  const r = st.reels[z];
  if (r.state === 'spin') slotsStop(st, r, s.id);   // (the ▼ nudge stays until the reel really is a platform)
  else if (r.state === 'stop') {
    if (slotsGoodCh(r, slotsSym(r, r.target))) {
      if (r.holdT != null) { r.holdLeft = r.holdT; r.holdFlash = 0.35; st.stats.holds[s.id]++; Sfx.play('slotsHold'); slotsPop(st, (r.x0 + r.x1) / 2, r.wy - (r.need ? 46 : 14), 'Hold!', C.gold, 15); }
      else { r.holdFlash = 0.2; Sfx.play('slotsHold'); }
    } else slotsRespin(r);
  }
}
// mode-owned one-way platforms (stopped reels): land from above, never block from below or the sides
function slotsResolve(st) {
  for (const p of G.players) {
    const P = st.pl[p.id];
    P.boing = null;
    // after the jackpot the reels are only a show: nobody can stand on them (a runner who walks back off the
    // goal ledge is gulped and comes back on the ledge, never stuck on a reel below it)
    if (!p.alive || st.phase !== 'play') { P.on = null; continue; }
    const feet = p.y + p.h;
    let best = null, bestTop = Infinity;
    if (p.vy >= -1) for (const r of st.reels) {
      const pl = slotsPlat(r);
      if (!pl || !(p.x + 4 < r.x1 && p.x + p.w - 4 > r.x0)) continue;
      const sticky = P.on === r;
      if (P.prevFeet > pl.top + (sticky ? 6 : 2)) continue;
      if (feet < pl.top - (sticky ? 7 : 0.5)) continue;
      if (pl.top < bestTop) { bestTop = pl.top; best = { r, pl }; }
    }
    if (!best) { P.on = null; continue; }
    moveY(p, bestTop - p.h - p.y, true);
    if (Math.abs(p.y + p.h - bestTop) > 1) { P.on = null; continue; }
    const landed = P.on !== best.r;
    if (best.pl.bounce) {
      p.vy = -SLOTS.cherryV; p.grounded = false; p.jumping = false; p.coyote = 0; p.jumpBuf = 0; p.sx = 0.75; p.sy = 1.3;
      P.on = null; P.cherryT = 1.5; P.boing = best.r; st.stats.boings[p.id]++;
      Sfx.play('slotsBoing', p.id); puff(p.x + p.w / 2, bestTop, 6, 'rgba(255,90,110,0.85)'); rumble(p.id, 0, 0.35, 70);
      continue;
    }
    p.vy = 0; p.grounded = true; p.tileGround = true; p.onOneWay = false; p.onPartner = false; p.jumping = false; p.coyote = PHYS.coyote;
    P.on = best.r;
    if (landed && P.prevVy > 260) { p.sx = 1.25; p.sy = 0.78; puff(p.x + p.w / 2, bestTop, 5, 'rgba(255,255,255,0.75)'); Sfx.play('land'); }
  }
}
function slotsPlop(st, p) {
  G.falls++; st.stats.gulps++;
  p.alive = false; p.respawnT = SLOTS.plopT; p.pendingJump = false;
  const x = p.x + p.w / 2;
  for (let i = 0; i < 10; i++) G.particles.push({ x, y: SLOTS.trayY, vx: (MODES.slots.rand() - 0.5) * 200, vy: -100 - MODES.slots.rand() * 200, life: 0.6, max: 0.6, col: i % 3 ? C.gold : PCOL[p.id], size: 4, grav: 700, kind: 'dot' });
  Sfx.play('slotsGulp', p.id); rumble(p.id, 0.35, 0.3, 120);
  slotsPop(st, x, SLOTS.trayY - 20, 'Gulp!', '#fff', 18);
  // the machine waits for you: every good stopped reel gets a full hold again
  for (const r of st.reels) if (r.state === 'stop' && r.holdT != null && slotsPlat(r)) r.holdLeft = Math.max(r.holdLeft, r.holdT);
}
function slotsJackpot(st) {
  st.phase = 'jackpot'; st.jackT = 0;
  const last = G.level.def.roomIndex === G.level.def.roomCount - 1;
  st.stats.jackpots++;
  if (!st.stats.fast || st.roomT < st.stats.fast.t) st.stats.fast = { t: st.roomT, title: G.level.def.title || '' };   // (room start to jackpot, like a stopwatch)
  slotsPay(st, last ? SLOTS.jackPayLast : SLOTS.jackPay, st.lever.x + 15, st.lever.y);
  st.reels.forEach((r, i) => { r.jackAt = SLOTS.jackLock0 + i * SLOTS.jackLockDt; r.state = 'spin'; r.ramp = 1; r.speed = Math.max(r.speed, 6); r.slow = 1; });
  st.lever.pulled = true; st.lever.t = 0;
  Sfx.play('slotsLever');
  G.spawnPts[st.runner] = { x: st.lever.x + (T - PW) / 2, y: st.goalTop - PH };
  rumble(0, 0.4, 0.7, 300); rumble(1, 0.4, 0.7, 300);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.12);
}
function slotsJackStep(st, dt) {
  st.jackT += dt;
  for (const r of st.reels) {
    if (r.state === 'spin' && st.jackT >= r.jackAt) {
      r.strip = r.strip.slice(); const k = Math.round(r.pos); r.strip[((k % r.n) + r.n) % r.n] = 'G';
      r.state = 'settle'; r.from = r.pos; r.target = k; r.t = 0; r.flash = 0.5; Sfx.play('slotsStop');
    }
  }
  if (!st.jackSaid && st.jackT >= SLOTS.jackLock0 + st.reels.length * SLOTS.jackLockDt + 0.05) {
    st.jackSaid = true; Sfx.play('slotsJackpot');
    for (let k = 0; k < 40; k++) confetti(W / 2, 120);
  }
  if (st.spring && !st.spring.on && st.jackT >= 0.4) { st.spring.on = true; st.spring.t = 0; Sfx.play('slotsSpringUp'); }
}
function slotsSpringStep(st, dt) {
  const s = st.spring;
  if (!s) return;
  s.t += dt; s.boing = Math.max(0, s.boing - dt);
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!p.alive) continue;
    const hx = s.x + (s.w - p.w) / 2;   // the hole's column in the panel above (one tile wide in the high rooms)
    if (s.on && p.grounded && p.y + p.h >= SLOTS.deckFloor - 1 && p.x + p.w > s.x + 4 && p.x < s.x + s.w - 4) {
      // the spring catches the rider into the hole's column first, so nobody bonks the panel's underside
      moveX(p, hx - p.x, true);
      p.vx = 0; p.carryVx = 0;
      p.vy = -s.v; p.grounded = false; p.jumping = false; p.coyote = 0; p.jumpBuf = 0; p.sx = 0.7; p.sy = 1.35;
      P.fly = true; s.boing = 0.3; st.stats.springs++;
      Sfx.play('slotsSpring', p.id); rumble(p.id, 0.4, 0.6, 140);
    }
    if (P.fly) {
      // until the feet are up past the panel, the rider stays in the hole's column (a held ◀ can't steer them into its edge)
      if (p.vy < 0 && p.y + p.h > SLOTS.trayY && Math.abs(p.x - hx) > SLOTS.springSlack) { moveX(p, clamp(p.x, hx - SLOTS.springSlack, hx + SLOTS.springSlack) - p.x, true); p.vx = 0; }
      if (p.grounded && p.vy >= 0) P.fly = false;   // passing up through a one-way lid can flag grounded for a tick
      else if (p.y + p.h < st.goalTop - 4 && !p.input.left && !p.input.right) {
        // carry the rider over the goal ledge toward the door (a stick or key takes over at once)
        const d = G.level.door, dc = d ? d.x + d.w / 2 - (p.x + p.w / 2) : 1;
        p.vx = p.carryVx = Math.abs(dc) > 6 ? Math.sign(dc) * SLOTS.springVx : 0;
      }
    }
  }
}
function slotsStepReels(st, dt) {
  for (const r of st.reels) {
    r.flash = Math.max(0, r.flash - dt); r.holdFlash = Math.max(0, r.holdFlash - dt); r.beamT = Math.max(0, r.beamT - dt);
    if (r.state === 'spin') {
      r.ramp = Math.min(1, r.ramp + dt / SLOTS.spinUp);
      r.pos += r.dir * r.speed * r.slow * r.ramp * dt;
      if (Math.abs(r.pos) > 1e4) r.pos = ((r.pos % r.n) + r.n) % r.n;
    } else if (r.state === 'settle') {
      r.t += dt;
      const u = Math.min(1, r.t / SLOTS.settleT), e = 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2);   // ease out, small overshoot
      r.pos = r.from + (r.target - r.from) * e;
      if (u >= 1) { r.pos = r.target; r.state = 'stop'; }
    }
    if (st.phase !== 'play' || r.state === 'spin') continue;
    const good = slotsGoodCh(r, slotsSym(r, r.target));
    if (!good) { r.badT -= dt; if (r.badT <= 0 && r.state === 'stop') slotsRespin(r); continue; }
    if (r.holdT == null) continue;
    if (slotsOver(st, r)) r.holdLeft = Math.max(r.holdLeft, SLOTS.leaveGrace);
    else r.holdLeft -= dt;
    if (r.holdLeft <= 0 && r.state === 'stop') slotsRespin(r);
  }
}
// the reel the runner has been waiting at long enough for the ▼ nudge (sooner in a stopper's first room)
function slotsWaitReel(st) {
  if (st.phase !== 'play') return null;
  const thr = st.stats.stops[st.stopper] === 0 ? SLOTS.firstHint : SLOTS.idleStop;
  return st.waitT > thr ? slotsAhead(st) : null;
}
// the first reel ahead of the runner (nudges)
function slotsAhead(st) {
  const p = G.players[st.runner], cx = p.x + p.w / 2;
  return st.reels.find(r => r.x0 > cx - 10) || null;
}
MODES.slots = {
  medals: { bronze: 'Make it through the machine', goals: [{ key: 'time', gold: 120, silver: 210 }, { key: 'gulps', gold: 0, silver: 3, word: 'gulp' }] },
  medalValues() { const s = G.mst.stats; return s ? { gulps: s.gulps } : {}; },
  rand: Math.random,
  setup(st, L) {
    st.stats = { stops: [0, 0], perfect: [0, 0], holds: [0, 0], boings: [0, 0], saves: 0, saveBy: [0, 0], late: 0, gulps: 0, tickets: 0, jackpots: 0, springs: 0, roomT: [], fast: null };
    st.tickets_ = 0;
    slotsRoom(st, L);
  },
  room(k, L) { const st = G.mst; st.stats.roomT.push(G.time); st.jackSaid = false; slotsRoom(st, L); },
  pre(dt) {
    const st = G.mst, s = G.players[st.stopper], rn = G.players[st.runner];
    // stopper: act, or jump while under a reel, presses that reel's STOP button
    let press = false;
    if (s.pendingAct) { s.pendingAct = false; press = true; }
    if (s.pendingJump && st.phase === 'play') {
      if (slotsZone(st, s) >= 0) { s.pendingJump = false; s.jumpBuf = 0; press = true; }
      else if (st.waitT > 1 && s.alive && G.introT <= SLOTS.introHold) slotsWhere(st, s);   // a kid who only knows "jump"
    }
    if (press) slotsPress(st, s);
    // runner: act = shout "STOP!" (a cue for the stopper)
    const P = st.pl[rn.id];
    P.cool = Math.max(0, P.cool - dt);
    if (rn.pendingAct) {
      rn.pendingAct = false;
      if (P.cool <= 0 && rn.alive) { P.cool = SLOTS.shoutCD; P.shoutT = 0.9; st.stats.shouts = (st.stats.shouts || 0) + 1; Sfx.play('slotsShout', rn.id); rumble(st.stopper, 0, 0.35, 80); }
    }
    for (const p of G.players) st.pl[p.id].prevVy = p.vy;
  },
  step(dt) {
    const st = G.mst, rn = G.players[st.runner];
    st.roomT += dt;
    slotsStepReels(st, dt);
    slotsResolve(st);
    // the save: the runner's next landing (or cherry bounce) after the stop is on that reel
    if (st.saveWatch) {
      const RP = st.pl[rn.id], w = st.saveWatch;
      w.t -= dt;
      if (RP.on === w.r || RP.boing === w.r) { st.stats.saves++; st.stats.saveBy[w.by]++; slotsPop(st, rn.x + rn.w / 2, rn.y - 30, 'SAVED! +' + SLOTS.savePay, C.gold, 20); slotsPay(st, SLOTS.savePay, rn.x + rn.w / 2, rn.y); Sfx.play('slotsSave'); st.saveWatch = null; }
      else if (w.t <= 0 || !rn.alive || rn.grounded || RP.boing) st.saveWatch = null;
    }
    // after a cherry bounce, a runner pressing into the goal block's face within 30 px of its top climbs up onto it
    const RP = st.pl[rn.id];
    RP.cherryT = rn.grounded ? 0 : Math.max(0, (RP.cherryT || 0) - dt);   // only the bounce's own flight counts
    if (rn.alive && !rn.grounded && RP.cherryT > 0 && rn.input.right && rn.x + rn.w >= st.goalX - 0.5 && rn.x + rn.w <= st.goalX + 2
      && rn.y + rn.h > st.goalTop && rn.y + rn.h - st.goalTop <= SLOTS.mantle && mantleSide(rn, 1, SLOTS.mantle)) { RP.cherryT = 0; st.stats.mantles = (st.stats.mantles || 0) + 1; }
    // falls into the coin tray: the machine gulps the runner and spits them out of the coin return
    if (rn.alive && rn.y + rn.h >= SLOTS.trayY - 1) slotsPlop(st, rn);
    // the two never meet before the jackpot: a runner who drops onto the stopper's head (a jump up a shaft) is gulped too
    else if (st.phase === 'play' && rn.alive && rn.onPartner && !rn.tileGround) slotsPlop(st, rn);
    // tickets
    for (const tk of st.tickets) if (!tk.got && rn.alive && rectHit(rn, tk.x - 12, tk.y - 12, 24, 24)) { tk.got = true; slotsPay(st, SLOTS.ticketPay, tk.x, tk.y); }
    // checkpoints (ledges)
    if (rn.alive && rn.grounded) for (const cp of st.cps) {
      const cx = rn.x + rn.w / 2;
      if (Math.abs(rn.y + rn.h - cp.y) < 2 && cx >= cp.x0 && cx <= cp.x1 && G.spawnPts[rn.id].x !== cp.sx) {
        G.spawnPts[rn.id] = { x: cp.sx, y: cp.y - PH }; st.chute = { x: cp.sx + PW / 2, y: cp.y, t: 0 };
        slotsPop(st, cx, rn.y - 30, 'Checkpoint!', C.gold, 15); Sfx.play('slotsCheck', rn.id);
      }
    }
    // jackpot: the runner lands on the goal ledge (the lever stands on its near edge; landing anywhere on the ledge pulls it)
    if (st.phase === 'play' && st.lever && rn.alive && rn.grounded && Math.abs(rn.y + rn.h - st.goalTop) < 2 && rn.x + rn.w > st.goalX) slotsJackpot(st);
    if (st.phase === 'jackpot') {
      slotsJackStep(st, dt);
      if (st.jackT < SLOTS.jackShow) G.doorHold = 0;   // the show first: the door opens once the fanfare has played (runs before the core's door check)
    }
    if (st.lever) st.lever.t += dt;
    slotsSpringStep(st, dt);
    // nudges
    const ahead = slotsAhead(st), waiting = rn.alive && (rn.grounded || RP.cherryT > 0);   // (bouncing on a cherry is waiting too)
    if (st.phase === 'play' && ahead && waiting && !slotsPlat(ahead) && G.introT <= SLOTS.introHold) st.waitT += dt; else st.waitT = 0;
    if (st.phase === 'play' && ahead && rn.alive && rn.grounded && slotsPlat(ahead) && Math.abs(rn.vx) < 5) st.runIdle += dt; else st.runIdle = 0;
    st.pops.forEach(q => q.t += dt); st.pops = st.pops.filter(q => q.t < 1.0);
    st.bubbles.forEach(b => b.t -= dt); st.bubbles = st.bubbles.filter(b => b.t > 0);
    for (const p of G.players) { const P = st.pl[p.id]; P.prevFeet = p.y + p.h; P.shoutT = Math.max(0, P.shoutT - dt); }
  },
  onRespawn(p) {
    const st = G.mst, P = st.pl[p.id];
    P.on = null; P.prevFeet = p.y + p.h; P.fly = false;
    if (p.id === st.runner) { st.chute.t = 0.4; Sfx.play('slotsSpit', p.id); p.vy = -260; }
  },
  draw() { slotsDraw(G.mst); },
  drawTop() { slotsDrawTop(G.mst); },
  hud() {
    const st = G.mst, big = hudBig(), fs = big ? 20 : 14, h = big ? 40 : 28;
    const tm = fmtTime(G.time), tk = String(st.tickets_);
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, kw = ctx.measureText(tk).width, icon = fs * 1.3, gap = fs * 1.1;
    const w = tw + gap + icon + fs * 0.4 + kw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, C.paper, 'left', 'body');
    slotsTicketShape(x0 + 15 + tw + gap + icon / 2, cy, fs / 14);
    text(tk, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, C.gold, 'left', 'body');
  },
  stats() {
    const s = G.mst.stats;
    const out = [
      { label: 'Tickets', value: s.tickets },
      { label: 'First-try stops', values: s.perfect.slice() },
      { label: 'Mid-air saves', values: s.saveBy.slice() },   // (credited to the stopper who made the stop)
      { label: 'Cherry boings', values: s.boings.slice() },
    ];
    const f = s.fast, ft = f && f.title && f.title.length <= 13 ? 'Fastest room: ' + f.title + ' in ' + f.t.toFixed(1) + ' s' : null;
    out.push(s.gulps === 0 ? 'Not one gulp! Super teamwork!' : ft || 'Gulped by the machine: ' + s.gulps);
    return out;
  },
};
MODES.slots.test = { SLOTS, slotsPlat, slotsSym, slotsGoodCh, slotsZone, slotsOver, slotsPress, slotsStop, slotsWaitReel, slotsAhead };
/* ---------- drawing ---------- */
/* World 8 backdrop (graphics polish, Nov 2026): a twilight row of casino-town buildings with lit windows, neon trims
   and rooftop signs (stars and diamonds: no words), hazed toward the sky. A cached layer for paBehindTiles(). Coin Pusher
   uses it too. */
function paCasinoCity(groundY, seed, haze, tall) {
  haze = haze === undefined ? 0.5 : haze; tall = tall || 1;
  return paLayer('casino|' + groundY + '|' + seed + '|' + haze + '|' + tall + '|' + C.skyBot, W, H, g => {
    const hz = c => mixCol(c, C.skyBot, haze), neon = ['#ff5fa2', '#ffc53d', '#5bd3ff', '#7cf0b0'];
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0, x = -20 + pass * 50; x < W + 20; i++) {
        const h = hash(i * 7 + seed + pass * 50, 13 + pass), w = 60 + h % 50, ht = ((pass ? 70 : 120) + (h >> 6) % (pass ? 60 : 90)) * tall, y = groundY - ht;
        const body = pass ? hz('#5a3a7a') : mixCol(hz('#5a3a7a'), C.skyBot, 0.35);
        g.fillStyle = body; g.fillRect(x, y, w, ht + 40);
        g.fillStyle = 'rgba(20,10,40,0.18)'; g.fillRect(x + w - 10, y, 10, ht + 40);
        if (h % 3 === 0) { g.fillStyle = body; g.beginPath(); g.moveTo(x + 6, y); g.lineTo(x + w / 2, y - 26); g.lineTo(x + w - 6, y); g.closePath(); g.fill(); }
        // windows: a few lit warm, the rest dim
        for (let wy = y + 12; wy < groundY - 8; wy += 16) for (let wx = x + 8; wx < x + w - 14; wx += 13) {
          const q = hash(wx, wy + seed); g.fillStyle = q % 4 === 0 ? hz('#ffe9a8') : 'rgba(20,10,40,0.18)'; g.fillRect(wx, wy, 6, 8);
        }
        // a neon trim along the roof and, on some, a shape sign
        const nc = neon[(i + seed) % 4];
        g.fillStyle = mixCol(nc, C.skyBot, haze * 0.6); g.fillRect(x, y, w, 3);
        if (!pass && h % 2 === 0) {
          const sx = x + w / 2, sy = y - 20 - (h % 3 === 0 ? 26 : 0);
          g.strokeStyle = mixCol(nc, C.skyBot, haze * 0.5); g.lineWidth = 3; g.beginPath();
          if (h % 4 === 0) { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 6 : 14; g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } g.closePath(); }
          else { g.moveTo(sx, sy - 12); g.lineTo(sx + 10, sy); g.lineTo(sx, sy + 12); g.lineTo(sx - 10, sy); g.closePath(); }
          g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.stroke();
          g.fillStyle = hz('#3c2a58'); g.fillRect(sx - 1.5, sy + 12, 3, y - sy - 12);
        }
        x += w + 6 + (h >> 12) % 20;
      }
    }
  });
}
let slotsBeamG = null;          // cached canvas gradients (the canvas and its context never change)
const slotsShadeG = {};
function slotsTicketShape(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.15);
  ctx.fillStyle = '#ff8fc7'; rr(-9, -6, 18, 12, 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(-2, -5, 1.5, 10);
  ctx.fillStyle = C.gold; circle(4, 0, 2.5); ctx.fill();
  ctx.restore();
}
function slotsDrawSym(ch, x, y, w, h, a) {
  // x,y = cell top-left, 90 x 60
  ctx.save(); ctx.globalAlpha *= a == null ? 1 : a;
  const cx = x + w / 2;
  if (ch === 'B') {
    ctx.fillStyle = '#b9850f'; rr(cx - 36, y + 30, 72, 24, 5); ctx.fill();
    ctx.fillStyle = C.gold; rr(cx - 36, y + 30, 72, 20, 5); ctx.fill();
    text('BAR', cx, y + 41, 15, '#7a4a10', 'center');
  } else if (ch === '7' || ch === 'G') {
    ctx.fillStyle = ch === 'G' ? C.gold : '#e8344e'; ctx.strokeStyle = ch === 'G' ? '#b9850f' : '#9c1730'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 24, y + 2); ctx.lineTo(cx + 24, y + 2); ctx.lineTo(cx + 24, y + 13); ctx.lineTo(cx + 2, y + 56); ctx.lineTo(cx - 12, y + 56); ctx.lineTo(cx + 8, y + 14); ctx.lineTo(cx - 24, y + 14); ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else if (ch === 'b') {
    ctx.fillStyle = C.gold; ctx.strokeStyle = '#b9850f'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx - 26, y + 50); ctx.quadraticCurveTo(cx - 22, y + 30, cx - 15, y + 24); ctx.quadraticCurveTo(cx, y + 6, cx + 15, y + 24); ctx.quadraticCurveTo(cx + 22, y + 30, cx + 26, y + 50); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b9850f'; circle(cx, y + 53, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; rr(cx - 12, y + 28, 5, 14, 2); ctx.fill();
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
function slotsDraw(st) {
  const t = G.time, big = hudBig();   // (phones: the world's small labels get bigger too)
  // the city, the cabinet and the reels' gold frames never move in a room, so they are baked into one picture (bulbs and
  // reels are drawn live on top)
  let cab = null, top = SLOTS.trayY - 285, bot = SLOTS.trayY;
  if (st.reels.length) {
    const x0 = st.reels[0].x0 - 22, x1 = Math.min(st.reels[st.reels.length - 1].x1 + 22, st.goalX);   // (never over the goal block)
    const y0 = Math.max(76, Math.min(...st.reels.map(r => r.wy)) - 40);   // (under the room pill, y 46-72)
    cab = { x0, x1, y0 }; top = Math.min(top, y0 - 2); bot = Math.max(bot, ...st.reels.map(r => r.wy + 190));
  }
  paBehindTiles(paCasinoCity(SLOTS.trayY, (G.room || 0) + 1), undefined, top, bot, {
    key: cab ? [cab.x0, cab.x1, cab.y0, ...st.reels.map(r => r.x0 + ',' + r.wy)].join('|') : '',
    paint: g => {
      if (cab) {
        const { x0, x1, y0 } = cab;
        g.fillStyle = 'rgba(120,20,60,0.62)'; paRR(g, x0, y0, x1 - x0, SLOTS.trayY - y0, 18); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.1)'; paRR(g, x0 + 4, y0 + 3, x1 - x0 - 8, 5, 3); g.fill();
        g.strokeStyle = 'rgba(255,197,61,0.55)'; g.lineWidth = 2; paRR(g, x0, y0, x1 - x0, SLOTS.trayY - y0, 18); g.stroke();
      }
      for (const r of st.reels) {
        // a gold frame with depth: drop shadow, darker lower half, lit rim, rivets at the corners
        g.fillStyle = 'rgba(40,10,40,0.3)'; paRR(g, r.x0 - 3, r.wy - 2, 102, 192, 10); g.fill();
        g.fillStyle = '#ffd75e'; paRR(g, r.x0 - 6, r.wy - 6, 102, 192, 10); g.fill();
        g.fillStyle = '#e0ac2c'; paRR(g, r.x0 - 6, r.wy + 90, 102, 96, 10); g.fill();
        g.strokeStyle = '#a8740c'; g.lineWidth = 1.5; paRR(g, r.x0 - 6, r.wy - 6, 102, 192, 10); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(r.x0 + 2, r.wy - 4.5, 86, 1.5);
        g.fillStyle = '#fff3c4'; for (const [qx, qy] of [[r.x0 - 2, r.wy - 2], [r.x1 + 2, r.wy - 2], [r.x0 - 2, r.wy + 182], [r.x1 + 2, r.wy + 182]]) { paCirc(g, qx, qy, 1.6); g.fill(); }
        g.fillStyle = '#fffaf0'; paRR(g, r.x0, r.wy, 90, 180, 6); g.fill();
      }
    },
  });
  // marquee bulbs along the cabinet's top edge
  if (cab) for (let x = cab.x0 + 14, k = 0; x < cab.x1 - 8; x += 24, k++) {
    const on = ((k + Math.floor(t * 6)) % 3) === 0;
    ctx.fillStyle = on ? '#fff6c2' : 'rgba(255,197,61,0.55)'; circle(x, cab.y0 + 10, on ? 4.5 : 3.5); ctx.fill();
  }
  for (const r of st.reels) {
    // the strip
    ctx.save(); rr(r.x0, r.wy, 90, 180, 6); ctx.clip();
    const base = Math.floor(r.pos);
    for (let k = base - 2; k <= base + 3; k++) {
      const y = r.yp + (r.pos - k) * SLOTS.cellH;
      if (y < r.wy - 60 || y > r.wy + 180) continue;
      const ch = slotsSym(r, k);
      const stopped = r.state !== 'spin' && k === r.target;
      const dim = r.state === 'spin' ? 0.85 : stopped ? 1 : 0.4;
      slotsDrawSym(ch, r.x0, y, 90, 60, dim);
      if (r.glow && r.state === 'spin' && slotsGoodCh(r, ch)) { ctx.strokeStyle = C.gold; ctx.lineWidth = 3; rr(r.x0 + 6, y + 4, 78, 52, 8); ctx.stroke(); }
      if (stopped && !slotsGoodCh(r, ch)) { ctx.strokeStyle = 'rgba(200,40,60,0.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r.x0 + 25, y + 15); ctx.lineTo(r.x0 + 65, y + 50); ctx.moveTo(r.x0 + 65, y + 15); ctx.lineTo(r.x0 + 25, y + 50); ctx.stroke(); }
    }
    if (r.state === 'spin') { ctx.fillStyle = 'rgba(255,255,255,' + (0.12 + 0.1 * Math.min(1, r.speed * r.slow / 3)) + ')'; ctx.fillRect(r.x0, r.wy, 90, 180); }
    // shade top and bottom rows (behind glass); one gradient per window height, made once
    let g = slotsShadeG[r.wy];
    if (!g) {
      g = slotsShadeG[r.wy] = ctx.createLinearGradient(0, r.wy, 0, r.wy + 180);
      g.addColorStop(0, 'rgba(60,20,60,0.35)'); g.addColorStop(0.3, 'rgba(60,20,60,0)'); g.addColorStop(0.7, 'rgba(60,20,60,0)'); g.addColorStop(1, 'rgba(60,20,60,0.35)');
    }
    ctx.fillStyle = g; ctx.fillRect(r.x0, r.wy, 90, 180);
    ctx.restore();
    // payline
    const pl = slotsPlat(r);
    ctx.strokeStyle = pl ? C.gold : 'rgba(232,52,78,0.75)'; ctx.lineWidth = r.flash > 0 ? 4 : 2.5;
    rr(r.x0 + 1, r.yp, 88, 60, 4); ctx.stroke();
    ctx.fillStyle = C.gold;
    for (const sx of [r.x0 - 6, r.x1 + 6]) { ctx.beginPath(); const d = sx < r.x0 ? 1 : -1; ctx.moveTo(sx, r.yp + 22); ctx.lineTo(sx + 7 * d, r.yp + 30); ctx.lineTo(sx, r.yp + 38); ctx.fill(); }
    // need tag
    if (r.need) {
      const nw = big ? 74 : 60;
      ctx.fillStyle = 'rgba(28,26,54,0.78)'; rr(r.x0 + 45 - nw / 2, r.wy - 34, nw, 26, 10); ctx.fill();
      text('need', r.x0 + 45 - nw / 2 + (big ? 21 : 18), r.wy - 21, big ? 14 : 11, C.paper, 'center', 'body');
      ctx.save(); ctx.translate(r.x0 + 45 + nw / 2 - 17, r.wy - 21); ctx.scale(0.3, 0.3); slotsDrawSym(r.need, -45, -32, 90, 60); ctx.restore();
    }
    // upward reels: a gold badge with ▲ on both top corners of the frame
    if (r.dir < 0) for (const ux of [r.x0 - 2, r.x1 + 2]) {
      const ur = big ? 12 : 9;
      ctx.fillStyle = C.gold; circle(ux, r.wy - 2, ur); ctx.fill(); ctx.strokeStyle = '#7a1838'; ctx.lineWidth = 2; ctx.stroke();
      text('▲', ux, r.wy - 1.5, big ? 15 : 11, '#7a1838', 'center');
    }
    // hold bulbs (time left) on a dark strip inside the window's bottom row (clear of the tray's gold edge and lights)
    if (r.holdT != null && r.state === 'stop' && st.phase === 'play' && slotsPlat(r)) {
      const f = clamp(r.holdLeft / r.holdT, 0, 1), nb = 6, warn = f < 0.3, blink = warn && Math.floor(t * 8) % 2;
      ctx.fillStyle = warn ? 'rgba(122,20,40,0.88)' : 'rgba(28,26,54,0.8)'; rr(r.x0 + 7, r.wy + 160, 76, 16, 8); ctx.fill();
      for (let k = 0; k < nb; k++) {
        const on = k < Math.ceil(f * nb);
        ctx.fillStyle = on ? (blink ? '#fff' : C.gold) : 'rgba(255,255,255,0.22)'; circle(r.x0 + 15 + k * 12, r.wy + 168, on ? 4.2 : 3.2); ctx.fill();
      }
    }
  }
  // the button panel (row 13) with one STOP button under each reel, and a spotlight from it down to the deck:
  // the stopper stands in the light to press that button (it glows while they do)
  const sz = slotsZone(st, G.players[st.stopper]), waitR = slotsWaitReel(st);
  for (const r of st.reels) {
    if (st.phase !== 'play') break;
    const bx = (r.x0 + r.x1) / 2, here = sz === r.i, blink = r.beamT > 0 || waitR === r;
    const a = here ? 0.36 : blink ? 0.16 + 0.14 * Math.abs(Math.sin(t * 7)) : 0.12;
    if (!slotsBeamG) { slotsBeamG = ctx.createLinearGradient(0, 420, 0, SLOTS.deckFloor); slotsBeamG.addColorStop(0, 'rgba(255,236,150,0.6)'); slotsBeamG.addColorStop(1, 'rgba(255,236,150,1)'); }
    ctx.globalAlpha = a; ctx.fillStyle = slotsBeamG; ctx.beginPath();
    ctx.moveTo(bx - 22, 420); ctx.lineTo(bx + 22, 420); ctx.lineTo(r.x1 + 8, SLOTS.deckFloor); ctx.lineTo(r.x0 - 8, SLOTS.deckFloor); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = here ? 'rgba(255,215,94,0.95)' : 'rgba(255,215,94,' + (blink ? 0.75 : 0.55) + ')';
    ctx.beginPath(); ctx.ellipse(bx, SLOTS.deckFloor - 1, 50, here ? 6 : 4.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const r of st.reels) {
    const bx = (r.x0 + r.x1) / 2, by = SLOTS.trayY + 22;
    const here = sz === r.i && st.phase === 'play', pulse = here ? 1 + 0.08 * Math.sin(t * 9) : 1;
    // a domed arcade button: its dark skirt under it, then the cap with a glint
    ctx.fillStyle = '#7a1428'; ctx.beginPath(); ctx.ellipse(bx, by + 3, (big ? 28 : 22) * pulse, (big ? 10.5 : 9) * pulse, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = here ? '#ff6b7c' : '#d83a50'; ctx.strokeStyle = here ? '#fff3c4' : '#7a1428'; ctx.lineWidth = here ? 2.5 : 2;
    ctx.beginPath(); ctx.ellipse(bx, by, (big ? 28 : 22) * pulse, (big ? 10.5 : 9) * pulse, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(bx - 6, by - 4, 8, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    text('STOP', bx, by + 0.5, big ? 14 : 10, '#fff', 'center', 'body');
    if (r.need) { ctx.save(); ctx.translate(bx + (big ? 37 : 30), by); ctx.scale(0.22, 0.22); slotsDrawSym(r.need, -45, -30, 90, 60); ctx.restore(); }
  }
  // chase lights along the tray edge
  for (let x = st.reels.length ? st.reels[0].x0 - 14 : 0, k = 0; st.reels.length && x < Math.min(st.reels[st.reels.length - 1].x1 + 16, st.goalX); x += 15, k++) {
    if (tile(Math.floor(x / T), SLOTS.trayY / T) !== '#' || tile(Math.floor(x / T), SLOTS.trayY / T - 1) === '#') continue;   // only on the open panel top (not over the hole)
    const on = ((k + Math.floor(t * 5)) % 4) === 0;
    ctx.fillStyle = on ? '#fff6c2' : k % 2 ? 'rgba(255,143,199,0.85)' : 'rgba(255,197,61,0.85)'; circle(x, SLOTS.trayY + 4, on ? 3 : 2.4); ctx.fill();
  }
  // tickets
  for (const tk of st.tickets) if (!tk.got) slotsTicketShape(tk.x, tk.y + Math.sin(G.time * 3 + tk.ph) * 3, 1.3);
  // lever
  if (st.lever) {
    const L = st.lever, bx = L.x + 15, by = st.goalTop, a = L.pulled ? Math.min(1, L.t / 0.25) : 0;
    const d = G.level.door, lean = d && bx > d.x && bx < d.x + d.w ? -0.4 : 0;   // in front of the door (Grand Jackpot): lean out of its way
    ctx.fillStyle = '#b9850f'; rr(bx - 9, by - 18, 18, 18, 4); ctx.fill();
    ctx.save(); ctx.translate(bx, by - 12); ctx.rotate(lean + a * 1.6);
    ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -40); ctx.stroke();
    ctx.fillStyle = '#e8344e'; circle(0, -44, 9); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; circle(-3, -47, 3); ctx.fill();
    ctx.restore();
    // the label sits over the lever, or on a little sign on the goal block when "over" would touch the top-right HUD pill (y < 70)
    if (!L.pulled) {
      const lf = big ? 16 : 12;
      if (by - 66 >= 70) text('JACKPOT', bx, by - 66, lf, C.gold, 'center');
      else {
        const cx = (st.goalX + (COLS - 1) * T) / 2, lw = big ? 84 : 66;
        ctx.fillStyle = 'rgba(28,26,54,0.55)'; rr(cx - lw / 2, by + 7, lw, big ? 23 : 19, 7); ctx.fill();
        text('JACKPOT', cx, by + (big ? 19 : 17), lf, C.gold, 'center');
      }
    }
  }
  // spring
  if (st.spring && st.spring.on) {
    const s = st.spring, u = Math.min(1, s.t / 0.3), sq = s.boing > 0 ? 1 + 0.4 * Math.sin(s.boing / 0.3 * Math.PI) : 1;
    const hgt = 16 * u * sq, cx = s.x + s.w / 2;
    ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 3; ctx.beginPath();
    for (let k = 0; k <= 6; k++) { const y = SLOTS.deckFloor - k * hgt / 6; ctx.lineTo(cx + (k % 2 ? 14 : -14), y); } ctx.stroke();
    ctx.fillStyle = C.gold; rr(cx - 22, SLOTS.deckFloor - hgt - 6, 44, 7, 3); ctx.fill();
    if (st.phase === 'jackpot') text('▲', cx, SLOTS.deckFloor - hgt - 20 - Math.abs(Math.sin(G.time * 5)) * 6, 16, C.gold, 'center');
  }
  // coin return chute on the runner's checkpoint
  if (st.chute) { ctx.fillStyle = 'rgba(28,26,54,0.55)'; rr(st.chute.x - 16, st.chute.y - 6, 32, 6, 3); ctx.fill(); }
}
function slotsDrawTop(st) {
  const big = hudBig(), fs = big ? 19 : 13;
  // nudge: the reel the runner is waiting for (▼ over its spotlight); drawn first, so a bubble's words stay on top
  const wr = slotsWaitReel(st);
  if (wr) {
    const bx = (wr.x0 + wr.x1) / 2, y = SLOTS.trayY + 52 + Math.abs(Math.sin(G.time * 5)) * 6;
    bigText('▼', bx, y, big ? 28 : 22, PCOL[st.stopper]);
  }
  // role badges for the first seconds of a room
  if (st.roomT < SLOTS.hintT + 3.4 && G.introT <= 0 && st.phase === 'play') {
    const s = G.players[st.stopper], rn = G.players[st.runner];
    const a = clamp((SLOTS.hintT + 3.4 - st.roomT) / 0.6, 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    for (const [p, msg] of [[s, slotsKeys(s.id)], [rn, 'Hop across on the pictures!']]) {
      if (!p.alive) continue;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = ctx.measureText(msg).width + 20, x = clamp(p.x + p.w / 2, w / 2 + 4, W - w / 2 - 4), y = p.y - 34 - (big ? 6 : 0);
      // a bubble, a shout or a pop near the badge goes first (the badge steps aside for it)
      if (st.bubbles.some(b => b.id === p.id) || st.pl[p.id].shoutT > 0 || st.pops.some(q => Math.abs(q.x - x) < w / 2 + 50 && Math.abs(q.y - q.t * 30 - y) < 34)) continue;
      ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(x - w / 2, y - fs * 0.92, w, fs * 1.85, fs * 0.92); ctx.fill();
      text(msg, x, y + 0.5, fs, p.id === 0 ? '#ffb39f' : '#a9c6ff', 'center', 'body');
    }
    ctx.restore();
  }
  for (const b of st.bubbles) {
    const p = G.players[b.id]; if (!p.alive) continue;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(b.s).width + 18, x = clamp(p.x + p.w / 2, w / 2 + 4, W - w / 2 - 4), y = p.y - 30 - (big ? 6 : 0);
    ctx.fillStyle = 'rgba(255,255,255,0.94)'; rr(x - w / 2, y - fs * 0.85, w, fs * 1.7, fs * 0.85); ctx.fill();
    text(b.s, x, y + 0.5, fs, C.ink, 'center', 'body');
  }
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (P.shoutT > 0 && p.alive) bigText('STOP!', p.x + p.w / 2, p.y - 40, big ? 26 : 20, PCOL[p.id], 1 + 0.15 * Math.sin(P.shoutT * 20));
  }
  for (const q of st.pops) { ctx.globalAlpha = clamp(1 - q.t, 0, 1); bigText(q.s, q.x, q.y - q.t * 30, q.size * (big ? 1.3 : 1), q.col); ctx.globalAlpha = 1; }
  // nudge: the runner has a good reel ahead but stands still
  const rn = G.players[st.runner];
  if (st.phase === 'play' && st.runIdle > SLOTS.idleRun && rn.alive) bigText('▶', rn.x + rn.w + 13 + Math.abs(Math.sin(G.time * 5)) * 5, rn.y + 12, big ? 24 : 18, PCOL[st.runner]);
  if (st.phase === 'jackpot' && st.jackT > 0.25) bigText('JACKPOT!', W / 2, 150, big ? 52 : 44, C.gold, Math.min(1, (st.jackT - 0.25) / 0.15) * (1 + 0.06 * Math.sin(st.jackT * 12)));
}
function slotsKeys(id) {
  // 1 player + computer: the computer's badge says what it does instead of which key to press
  if (typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id)) return 'I stop the reels for you!';
  const k = actKey(id);
  return k === 'pad' ? 'Under a reel: ' + glyph('a') + ' or ' + glyph('act') + ' stops it' : k === 'touch' ? 'Under a reel: tap stop' : 'Under a reel: ' + (id === 0 ? 'F' : '/') + ' stops it';
}
Sfx.extra.slotsStop = function () { this.tone(180, 0.07, 'square', 0.06, 90); this.tone(900, 0.03, 'square', 0.03, null, 0.02); };
Sfx.extra.slotsGood = function () { this.tone(988, 0.08, 'triangle', 0.05); this.tone(1319, 0.1, 'triangle', 0.045, null, 0.06); };
Sfx.extra.slotsBell = function () { [1568, 2093, 1568].forEach((f, i) => this.tone(f, 0.14, 'sine', 0.05, null, i * 0.07)); };
Sfx.extra.slotsSour = function () { this.tone(300, 0.18, 'sawtooth', 0.035, 190); };
Sfx.extra.slotsRespin = function () { this.tone(260, 0.12, 'triangle', 0.03, 520); };
Sfx.extra.slotsHold = function () { this.tone(660, 0.06, 'square', 0.035); this.tone(660, 0.06, 'square', 0.035, null, 0.08); };
Sfx.extra.slotsBoing = function (p) { this.tone(200 * p, 0.26, 'sine', 0.08, 720 * p); };
Sfx.extra.slotsTicket = function () { this.tone(1760, 0.05, 'square', 0.025); this.tone(2349, 0.06, 'square', 0.022, null, 0.04); };
Sfx.extra.slotsGulp = function (p) { this.tone(420 * p, 0.12, 'sine', 0.07, 140 * p); this.tone(1200, 0.2, 'triangle', 0.02, 600, 0.08); };
Sfx.extra.slotsSpit = function (p) { this.tone(300 * p, 0.1, 'triangle', 0.05, 700 * p); };
Sfx.extra.slotsLever = function () { this.tone(140, 0.2, 'square', 0.05, 70); this.tone(500, 0.08, 'triangle', 0.04, null, 0.12); };
Sfx.extra.slotsJackpot = function () { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, 'square', 0.045, null, i * 0.09)); };
Sfx.extra.slotsSpringUp = function () { this.tone(400, 0.2, 'triangle', 0.04, 900); };
Sfx.extra.slotsSpring = function (p) { this.tone(150 * p, 0.35, 'sine', 0.09, 900 * p); };
Sfx.extra.slotsShout = function (p) { this.tone(740 * p, 0.09, 'square', 0.05); this.tone(988 * p, 0.12, 'square', 0.045, null, 0.08); };
Sfx.extra.slotsSave = function () { [784, 1047, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.06, null, i * 0.05)); };
Sfx.extra.slotsCheck = function (p) { this.tone(880 * p, 0.1, 'triangle', 0.05, 1320 * p); };

