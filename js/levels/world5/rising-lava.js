/* Pip & Bo - Level 5-4 Rising Lava (team). */
'use strict';

/* ===== MODES.lava — 5-4 Rising Lava (World 5 "Road Trip", teamwork) =====
   Climb four tall volcano towers while the lava rises. Each tower is one tall map (def.climb, 32 wide, rows top first)
   and the camera scrolls up with the pair. Every button builds steps in your PARTNER's colour (orange blocks hold only
   Pip, blue blocks only Bo), so you leapfrog up: I press, you climb. The lava is fast: it never lags more than about
   half a screen below the lower player (catch-up), and an edge marker shows how far below the screen it is.
   Touching the lava: a short "Hot toes!" beat, then BOTH go back to the last team checkpoint (a ledge both have stood
   on; the tower's start until then), everything above it resets (latch buttons, steps, ice pops, the hatch) and the
   lava sinks below the checkpoint and waits. Each ouch also makes the lava a little slower for that tower, and two
   ouches close together give a breather. Holding a hold plate keeps you safe from the lava (it sinks to holdShield under you). No hopping back once the lava has reached the checkpoint. Standing where your own
   step should pop in? The rest pops in, and after a moment the step lifts you up onto it ("boing") or, with no room
   above, a hint + arrow say "scoot over". No standing on heads (def.passPartners).
   Climb map chars (this mode parses them itself; the level def is in rising-lava-map.js):
     # rock, = plank (one-way), . air, 1 2 the starts;
     a-n = Pip's buttons, each builds the BLUE group of the same capital letter (A-N, steps for Bo);
     o-z = Bo's buttons, each builds the ORANGE group of its capital (O-Z, steps for Pip);
     room.holds lists the buttons that are hold plates (steps only while the owner stands there);
     < > = Pip's / Bo's star buttons, @ = hatch block (opens when both stand on their stars), $ = the door (2 wide,
     its bottom row), + = ice pop (freezes the lava), { } = a pad that is always there in Pip's / Bo's colour,
     ( ) = a team checkpoint: Pip's and Bo's spots (standing anywhere on that row counts).
   Coordinates: during the mode's step the players and particles are in climb coordinates (y grows down the whole
   tower) and G.level.grid is the tall grid; outside it p.y is on screen (p.y - camY) and G.level.grid is an empty
   18-row grid, so the engine draws the players, name tags and bubbles in the right place (the 17-3 pattern).
   Every global here is prefixed (LAVA, LAVA_BTN, lavaKey, Sfx.extra.lava*); all state lives in G.mst. */
const LAVA = {
  // rules, per tower (a room's def.lava overrides any of them)
  startGap: 150, delay: 6, speed: 10, catchGap: 230, catchMul: 3, catchMax: 330, capGap: 50,
  sinkGap: 120, pauseAfterOuch: 2.0, assistStep: 0.85, assistMin: 0.5, killDepth: 4, hotBeat: 0.8,
  breatherN: 2, breatherWindow: 20, breatherWait: 4, breatherGap: 250, freeze: 5, holdGrace: 0.5, twinHold: 0.25,
  returnHold: 1.0, returnShow: 0.15, afkPause: 10, waitStill: 3, waitBack: 30, autoReturn: 8, autoRows: 3, buildStep: 0.06, strandT: 3, holdShield: 90, shieldMin: 30, shieldSink: 60,
  surge: null, surgeStart: 10, surgeAfterOuch: 2, holds: '',
  maxSep: 13, waitCD: 3.5, camEase: 4.5, camFast: 14, camTop: 110, camBot: 70,
  // feedback only (s / px)
  heatGap: 45, hintLife: 2.5, lowHint: 3, strandHint: 1, nopeHint: 0.4, startMsg: 1.5, breatherMsg: 3, blockHint: 0.6,
};
// button char -> [owner, block group]; Pip's buttons (a-n) build blue (Bo's) groups A-N, Bo's (o-z) build orange (Pip's) O-Z
const LAVA_BTN = {};
for (const ch of 'abcdefghijklmn') LAVA_BTN[ch] = [0, ch.toUpperCase()];
for (const ch of 'opqrstuvwxyz') LAVA_BTN[ch] = [1, ch.toUpperCase()];
const LAVA_BLUE = 'ABCDEFGHIJKLMN', LAVA_ORANGE = 'OPQRSTUVWXYZ';
// an empty 18-row engine map (the tall tower lives in G.mst.tall); the engine only needs the two starts
const LAVA_DUMMY = [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)];
// the player's own "down" key for hint bubbles: "S" / "↓" (keyboard), "stick ↓" (controller), "▼" (touch); same test as golfKeys
function lavaKey(id) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad'; // (each player's own device: js/controls.js)
  return pad ? 'stick ↓' : touch ? '▼' : id === 0 ? 'S' : '↓';
}
MODES.lava = {
  // medal (js/medals.js): one ouch = one team trip back to the checkpoint (see GAME_NOTES for the bot times)
  medals: { bronze: 'Climb out of the lava', goals: [{ key: 'time', gold: 250, silver: 390 }, { key: 'ouches', gold: 2, silver: 8, text: n => n === 1 ? 'At most 1 lava ouch' : `${n} or fewer lava ouches`, gap: (v, n) => `${v - n} fewer ouch${v - n === 1 ? '' : 'es'}` }] },
  medalValues() { const st = G.mst; return st && st.ouch ? { ouches: st.ouches } : {}; },
  rand: Math.random,   // cosmetic randomness only (bubbles, embers, smoke); tests swap in a seeded one
  setup(st, L) {       // match-long stats, then tower 1
    st.ouch = [0, 0]; st.ouches = 0; st.presses = [0, 0]; st.ices = 0; st.closest = [999, 999]; st.near = [999, 999]; st.floorT = []; st.floorStart = 0; st.returns = [0, 0];
    st.breathers = 0; st.cpHits = 0; st.strands = 0; st.popN = 0; st.lifts = 0; st.leashes = 0; st.climbed = 0; st.resets = 0;
    MODES.lava.initFloor(st, L);
  },
  room(k, L) {
    const st = G.mst, M = MODES.lava;
    M.nearDone(st, 0); M.nearDone(st, 1); st.floorT.push(G.time - st.floorStart); st.floorStart = G.time; st.climbed += st.towerRows || 0;
    M.initFloor(st, L);
  },

  /* ---------- building a tower from def.climb ---------- */
  initFloor(st, L) {
    const def = L.def, cfg = st.cfg = Object.assign({}, LAVA, def.lava || {});
    if (def.holds) cfg.holds = def.holds;
    const rows = def.climb || LAVA_DUMMY, N = rows.length;
    st.N = N; st.WH = N * T; st.blank = L.grid; st.inClimb = false;
    st.tall = rows.map(r => r.padEnd(COLS, '.').slice(0, COLS).split(''));
    st.blockCol = st.tall.map(r => r.map(() => null));
    st.buttons = []; st.groups = {}; st.icePops = []; st.hatch = []; st.twins = []; st.hatchOpen = false; st.twinT = 0;
    st.cps = []; st.spawn = [null, null]; st.door = null;
    const g = st.tall, cpRows = {};
    const onPlank = (c, r) => !!(g[r + 1] && g[r + 1][c] === '=');
    for (let r = 0; r < N; r++) for (let c = 0; c < COLS; c++) {
      const ch = g[r][c];
      if (LAVA_BTN[ch]) {
        const [owner, gch] = LAVA_BTN[ch];
        st.buttons.push({ c, r, ch, owner, group: gch, hold: cfg.holds.includes(ch), down: false, latched: false, odown: false, wig: 0, plank: onPlank(c, r) });
        g[r][c] = '.';
      } else if (ch === '<' || ch === '>') {
        st.twins.push({ c, r, owner: ch === '<' ? 0 : 1, down: false, odown: false, wig: 0, plank: onPlank(c, r) });
        g[r][c] = '.';
      } else if (LAVA_BLUE.includes(ch) || LAVA_ORANGE.includes(ch)) {
        const blue = LAVA_BLUE.includes(ch);
        (st.groups[ch] = st.groups[ch] || { g: ch, cells: [], state: 'hidden', fadeT: 0, buildT: 0, tile: blue ? 'u' : 'o', holder: blue ? 1 : 0,
          popN: 0, fresh: 0, waitK: -1, blockT: 0, blkDir: 0, btn: null, invite: false }).cells.push({ c, r, on: false, flash: 0 });
        g[r][c] = '.';
      } else if (ch === '@') { st.hatch.push({ c, r }); g[r][c] = 'P'; st.blockCol[r][c] = '#8a6a5a'; }
      else if (ch === '{' || ch === '}') g[r][c] = ch === '{' ? 'o' : 'u';   // a pad in a player's colour that is always there
      else if (ch === '+') { st.icePops.push({ x: c * T + T / 2, y: r * T + T / 2, got: false, ph: ((c * 7 + r * 3) % 10) / 10 }); g[r][c] = '.'; }
      else if (ch === '1' || ch === '2') { st.spawn[ch === '1' ? 0 : 1] = { x: c * T + (T - PW) / 2, y: (r + 1) * T - PH }; g[r][c] = '.'; }
      else if (ch === '$') { if (!st.door) st.door = { x: c * T, y: (r - 1) * T, w: 2 * T, h: 2 * T }; g[r][c] = '.'; }
      else if (ch === '(' || ch === ')') {
        const cp = cpRows[r] = cpRows[r] || { r, at: [null, null], seen: [false, false], lit: false };
        cp.at[ch === '(' ? 0 : 1] = [c, r];
        g[r][c] = '.';
      }
    }
    if (!st.spawn[0]) st.spawn = L.spawns.map(s => ({ x: s.x, y: s.y + (N - ROWS) * T }));
    // team checkpoints, bottom first; index 0 is the start
    const start = { r: Math.round((st.spawn[0].y + PH) / T) - 1, at: st.spawn.map(s => [Math.floor((s.x + PW / 2) / T), Math.round((s.y + PH) / T) - 1]), seen: [true, true], lit: true, start: true };
    st.cps = [start].concat(Object.values(cpRows).filter(cp => cp.at[0] && cp.at[1]).sort((a, b) => b.r - a.r));
    st.cpIdx = 0;
    st.cp = start.at.map(([c, r]) => ({ c, r }));
    G.spawnPts = st.spawn.map(s => ({ x: s.x, y: s.y }));
    L.crack = null; L.door = null;   // (the mode draws and checks its own door)
    // build order: nearest to its button first (ties keep map order)
    for (const b of st.buttons) {
      const gr = st.groups[b.group];
      if (gr) { gr.btn = b; gr.cells.sort((p, q) => Math.hypot(p.c - b.c, p.r - b.r) - Math.hypot(q.c - b.c, q.r - b.r)); }
    }
    // the lava: from just below the start ledge up to just below the top walkway (it never reaches the door)
    const spawnFeet = st.spawn[0].y + PH, topFeet = st.door ? st.door.y + st.door.h : 4 * T;
    st.spawnFeet = spawnFeet; st.topFeet = topFeet; st.towerRows = Math.round((spawnFeet - topFeet) / T);
    st.startY = spawnFeet + cfg.startGap; st.capY = topFeet + cfg.capGap;
    st.lavaY = st.startY; st.wait = cfg.delay; st.freezeT = 0; st.assist = 1; st.surgeT = cfg.surge ? Math.max(cfg.surge.every, cfg.surgeStart) : 0; st.surging = 0;
    st.warned = false; st.started = false; st.towerT = 0; st.beatT = 0; st.flashT = 0; st.exit = false; st.doorHold = 0;
    st.strand = def.strand || [[], []]; st.strandT = [0, 0];
    st.afk = [0, 0]; st.downT = [0, 0]; st.lowT = [0, 0]; st.paused = false; st.waitingFor = -1; st.ouchTimes = [];
    st.best = st.spawn.map(sp => sp.y + PH); st.sinceUp = [0, 0];   // highest feet so far this tower; time since it rose
    st.prevDown = [true, true]; st.downOk = [false, false];   // a ▼ held into a new tower must be let go and pressed again
    st.waitT = [0, 0]; st.resetN = st.resetN || 0;
    // feedback state
    st.bubbles = []; st.embers = []; st.bubT = 0; st.embT = 0; st.bubSnd = 0; st.zips = [];
    st.hints = [null, null]; st.hinted = {}; st.nopeT = [0, 0]; st.heat = [false, false]; st.hotCD = [0, 0];
    st.startT = 0; st.breatherT = 0; st.ouchHint = [false, false]; st.camFastT = 0;
    // players at the bottom of the tower, camera on them, then back to screen coordinates
    G.players.forEach((p, k) => { const s = st.spawn[k]; Object.assign(p, { x: s.x, y: s.y, vx: 0, vy: 0, grounded: true, alive: true, downLatch: true }); });
    st.camY = 0;
    MODES.lava.camera(st, 0, true);
    for (const p of G.players) p.y -= st.camY;
    L.grid = st.blank;
  },
  // into climb coordinates (the tall grid, players and particles down the whole tower) and back out
  enter(st) { if (st.inClimb) return; st.inClimb = true; G.level.grid = st.tall; for (const p of G.players) p.y += st.camY; for (const q of G.particles) q.y += st.camY; },
  leave(st) { if (!st.inClimb) return; st.inClimb = false; G.level.grid = st.blank; for (const p of G.players) p.y -= st.camY; for (const q of G.particles) q.y -= st.camY; },

  /* ---------- rules ---------- */
  // a button needs weight: its owner standing on the floor of the button's cell (not jumping through it).
  // vy >= 0: the engine counts a player as grounded for a tick while their feet pass UP through a plank line
  standingOn(p, c, r) {
    return p.alive && p.grounded && p.tileGround && p.vy >= 0 && Math.abs(p.y + p.h - (r + 1) * T) < 1.5 && p.x < c * T + T - 4 && p.x + p.w > c * T + 4;
  },
  // standing on any button, hold plate or star (anyone's): the ▼-hold hop-back is off there
  onAnyButton(p) {
    const st = G.mst, M = MODES.lava;
    return st.buttons.some(b => M.standingOn(p, b.c, b.r)) || st.twins.some(tw => M.standingOn(p, tw.c, tw.r));
  },
  // the holder of a hold plate is safe: the lava stays below them
  shielded(p) { return G.mst.buttons.some(b => b.hold && b.down && b.owner === p.id); },
  // q stands on one of the group's built cells
  onGroup(q, gr) {
    return q.alive && q.grounded && gr.cells.some(cl => cl.on && Math.abs(q.y + q.h - cl.r * T) < 1.5 && q.x < cl.c * T + T && q.x + q.w > cl.c * T);
  },
  cellBlockedFor(cell, tileCh) {
    return G.players.some(p => p.alive && solidFor(tileCh, p) && rectHit(p, cell.c * T, cell.r * T, T, T));
  },
  // the holder stands where one of their steps should pop in: which way to scoot (nearest spot left or right that
  // overlaps none of the group's missing cells and that they can walk to; 0 = none within 4 cells)
  blockDir(gr, p) {
    const miss = gr.cells.filter(cl => !cl.on);
    const inMiss = x => miss.some(cl => x < cl.c * T + T && x + p.w > cl.c * T && p.y < cl.r * T + T && p.y + p.h > cl.r * T);
    const solidAt = x => {
      const c1 = Math.floor(x / T), c2 = Math.floor((x + p.w - 0.01) / T), r1 = Math.floor(p.y / T), r2 = Math.floor((p.y + p.h - 0.01) / T);
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (solidFor(tile(c, r), p)) return true;
      return false;
    };
    const open = { '-1': true, '1': true };
    for (let d = 2; d <= 4 * T; d += 2) for (const s of [-1, 1]) {
      if (!open[s]) continue;
      const x = p.x + s * d;
      if (solidAt(x)) { open[s] = false; continue; }
      if (!inMiss(x)) return s;
    }
    return 0;
  },
  buildCell(gr, cl) {
    const st = G.mst;
    cl.on = true; st.tall[cl.r][cl.c] = gr.tile; cl.flash = 0.15; gr.popN++; gr.fresh++;
    st.popN = gr.popN; Sfx.play('lavaBlock');
    puff(cl.c * T + T / 2, cl.r * T + T / 2, 6, PCOL[gr.holder]);
  },
  hideGroup(gr) {
    const st = G.mst;
    gr.state = 'hidden'; gr.popN = 0; gr.fresh = 0; gr.waitK = -1; gr.blockT = 0; gr.fadeT = 0;
    for (const cl of gr.cells) { cl.on = false; cl.flash = 0; st.tall[cl.r][cl.c] = '.'; }
  },
  // the holder has stood in their own missing step(s) for blockHint s: lift them on top of that step (or of the
  // pillar it is the foot of, at most 3 cells), if there is room above (no solid tile, no other missing cell of the
  // group, not the partner). Returns true if lifted.
  liftHolder(gr, p) {
    if (!p.alive || !p.grounded) return false;
    const mine = gr.cells.filter(cl => !cl.on && rectHit(p, cl.c * T, cl.r * T, T, T));
    if (!mine.length) return false;
    const inGroup = (c, r) => gr.cells.some(cl => cl.c === c && cl.r === r);
    let top = 1e9;
    for (const cl of mine) { let r = cl.r; while (r > cl.r - 2 && inGroup(cl.c, r - 1)) r--; top = Math.min(top, r); }
    const y = top * T - p.h, x = p.x;
    if (y < 0) return false;
    const c1 = Math.floor(x / T), c2 = Math.floor((x + p.w - 0.01) / T), r1 = Math.floor(y / T), r2 = Math.floor((y + p.h - 0.01) / T);
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (solidFor(tile(c, r), p)) return false;
    const hit = (ax, ay, aw, ah) => x < ax + aw && x + p.w > ax && y < ay + ah && y + p.h > ay;
    if (gr.cells.some(cl => !cl.on && !mine.includes(cl) && hit(cl.c * T, cl.r * T, T, T))) return false;
    p.y = y; p.vy = 0; p.grounded = false;
    puff(x + p.w / 2, y + p.h, 8, PCOL[p.id]);
    return true;
  },
  // standing on one of your own buttons, plates or stars (doing your job, even when standing still)
  onOwnButton(p) {
    const st = G.mst, M = MODES.lava;
    return st.buttons.some(b => b.owner === p.id && M.standingOn(p, b.c, b.r)) || st.twins.some(tw => tw.owner === p.id && M.standingOn(p, tw.c, tw.r));
  },
  setGroup(gr, on) {
    if (on) {
      if (gr.state === 'hidden' || gr.state === 'fading') { if (gr.state === 'hidden') { gr.buildT = 0; gr.popN = 0; } gr.fresh = 0; gr.state = 'building'; }
    } else if (gr.state === 'building' || gr.state === 'on') {
      gr.state = 'fading'; gr.fadeT = G.mst.cfg.holdGrace;
      if (gr.cells.some(cl => cl.on)) { Sfx.play('lavaBlink'); rumble(gr.holder, 0.2, 0.4, 150); }
    }
  },
  hint(k, text, opt = {}) {
    if (cpuSolo() && cpuOn(k) && !opt.always) return; // (1-player mode: no how-to hints over the computer's head)
    G.mst.hints[k] = { text, t: 0, life: opt.life || G.mst.cfg.hintLife, group: opt.group || null };
  },
  hintOnce(key, k, text) { const st = G.mst; if (st.hinted[key]) return; st.hinted[key] = true; MODES.lava.hint(k, text); },
  // pop back to the team checkpoint (▼ hold, stranded, far below): no ouch, nothing resets
  hopBack(p) {
    const st = G.mst, k = p.id;
    st.returns[k]++; st.downT[k] = 0; st.lowT[k] = 0; st.strandT[k] = 0;
    respawn(p);
    Sfx.play('lavaPopBack', k); rumble(k, 0, 0.3, 80);
  },
  openHatch() {
    const st = G.mst;
    st.hatchOpen = true; G.level.crack = null;
    for (const h of st.hatch) { st.tall[h.r][h.c] = '.'; burst(h.c * T + T / 2, h.r * T + T / 2, '#8a6a5a', 10); }
    const h0 = st.hatch[0];
    for (let i = 0; i < 36; i++) confetti(W / 2, h0 ? h0.r * T : 75);
    Sfx.play('lavaHatch'); rumble(0, 0.6, 0.6, 300); rumble(1, 0.6, 0.6, 300);
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.15);
  },
  // the feet height of a checkpoint (climb px)
  cpFeet(cp) { return (cp.r + 1) * T; },
  // the lava has reached the team checkpoint (or is about to): hopping back there would be a burn
  cpHot(st) { return st.lavaY < MODES.lava.cpFeet(st.cps[st.cpIdx]) + st.cfg.heatGap; },
  // a player stands on a lava spot or not: both go back to the last team checkpoint, the tower above it resets
  touch(p) {
    const st = G.mst, cfg = st.cfg, k = p.id, R = MODES.lava.rand;
    if (st.beatT > 0 || !p.alive) return;
    st.near[0] = 999; st.near[1] = 999;
    st.ouch[k]++; st.ouches++; G.falls++;
    const x = p.x + p.w / 2, ly = st.lavaY;
    Sfx.play('die'); Sfx.play('lavaSizzle');
    rumble(0, 0.6, 0.5, 220); rumble(1, 0.6, 0.5, 220);
    burst(x, ly, '#ff8a3d', 14); burst(x, p.y + p.h / 2, PCOL[k], 14);
    for (let i = 0; i < 6; i++) G.particles.push({ x: x + (R() - 0.5) * 16, y: ly, vx: (R() * 2 - 1) * 20, vy: -40 - R() * 30, life: 0.9, max: 0.9, col: 'rgba(90,80,90,0.6)', size: 5 + R() * 3, grav: -30, kind: 'dot' });
    p.alive = false; p.respawnT = 99;
    st.beatT = cfg.hotBeat; st.flashT = 0.35; st.beatWho = k;
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.2);
    // two ouches close together: the volcano takes a breather; every ouch makes this tower's lava a bit slower
    const ts = st.ouchTimes; ts.push(G.time); while (ts.length && G.time - ts[0] > cfg.breatherWindow) ts.shift();
    st.breatherNow = ts.length >= cfg.breatherN; if (st.breatherNow) ts.length = 0;
    st.assist = Math.max(cfg.assistMin, st.assist * cfg.assistStep);
  },
  // after the "Hot toes!" beat: both to the checkpoint, the tower above it as new, the lava below it, waiting
  resetTo(st) {
    const cfg = st.cfg, cp = st.cps[st.cpIdx], feet = MODES.lava.cpFeet(cp), M = MODES.lava;
    st.resets++; st.resetN++;
    for (const b of st.buttons) {
      const gr = st.groups[b.group];
      b.down = false; b.odown = false;
      if (b.hold) { if (gr) M.hideGroup(gr); continue; }
      if (b.r < cp.r) { b.latched = false; if (gr) M.hideGroup(gr); }
    }
    for (const ic of st.icePops) if (ic.y < feet) ic.got = false;
    if (st.hatchOpen && st.hatch.some(h => h.r < cp.r)) { st.hatchOpen = false; for (const h of st.hatch) st.tall[h.r][h.c] = 'P'; }
    for (const tw of st.twins) { tw.down = false; tw.odown = false; }
    st.twinT = 0; G.level.crack = null;
    for (const cpx of st.cps) if (!cpx.lit) cpx.seen = [false, false];
    st.zips = []; st.freezeT = 0;
    for (const p of G.players) {
      respawn(p);
      p.downLatch = true; st.best[p.id] = p.y + p.h; st.sinceUp[p.id] = 0; st.downT[p.id] = 0; st.downOk[p.id] = false; st.lowT[p.id] = 0; st.strandT[p.id] = 0; st.afk[p.id] = Math.min(st.afk[p.id], 1);
    }
    M.hint(st.beatWho, 'Ouch! Hot toes!', { life: 1.6, always: true });
    st.lavaY = Math.max(feet + (st.breatherNow ? cfg.breatherGap : cfg.sinkGap), Math.min(st.lavaY, st.startY));
    st.lavaY = Math.min(st.lavaY, st.startY);
    st.wait = Math.max(st.wait, st.breatherNow ? cfg.breatherWait : cfg.pauseAfterOuch);
    if (st.breatherNow) { st.breathers++; st.breatherT = cfg.breatherMsg; Sfx.play('lavaBreather'); }
    st.breatherNow = false;
    if (cfg.surge) { st.surgeT = Math.max(st.surgeT, cfg.surgeAfterOuch + cfg.surge.warn); st.warned = false; st.surging = 0; }
    st.camFastT = 0.8;
  },
  // the camera: the pair in view, the lower player always on screen; eases (fast just after a trip back)
  camera(st, dt, snap) {
    const cfg = st.cfg, ps = G.players;
    const feet = ps.map(p => (p.alive ? p.y + p.h : MODES.lava.cpFeet({ r: st.cp[p.id].r }))), tops = ps.map((p, k) => feet[k] - PH);
    const lowFeet = Math.max(feet[0], feet[1]), highTop = Math.min(tops[0], tops[1]);
    let ty = (lowFeet + highTop) / 2 - H * 0.5 - 20;
    ty = Math.min(ty, highTop - cfg.camTop);
    ty = Math.max(ty, lowFeet + cfg.camBot - H);
    ty = clamp(ty, 0, st.WH - H);
    if (snap) { st.camY = ty; return; }
    const rate = st.camFastT > 0 ? cfg.camFast : cfg.camEase;
    st.camY += (ty - st.camY) * Math.min(1, dt * rate);
  },
  // "Wait for me!": nobody climbs more than maxSep tiles above the partner (yb: the players' y before they moved)
  leash(st, yb) {
    const [a, b] = G.players;
    if (!a.alive || !b.alive) return;
    const up = a.y + a.h < b.y + b.h ? a : b, lo = up === a ? b : a;
    if ((lo.y + lo.h) - (up.y + up.h) <= st.cfg.maxSep * T || up.y >= yb[up.id]) return;
    up.y = yb[up.id]; if (up.vy < 0) up.vy = 0; up.jumping = false;
    st.leashes++;
    if (st.waitT[up.id] <= 0) {
      st.waitT[up.id] = st.cfg.waitCD;
      MODES.lava.hint(up.id, 'Wait for ' + NAMES[lo.id] + '!', { always: true, life: 1.6 });
      if (cpuOn(lo.id) && typeof cpuSay === 'function') cpuSay(lo, 'Wait for me!');
    }
  },
  // the engine's movement (control, moveX, moveY, landing), for climb coordinates (no falling off the screen)
  move(dt) {
    const ps = G.players;
    for (const p of ps) control(p, dt);
    for (const p of ps) if (p.alive) { const pr = probe(p); p.tileGround = pr.tile; p.onPartner = pr.partner; }
    moveX(ps[0], ps[0].vx * dt); moveX(ps[1], ps[1].vx * dt);
    const [up, lo] = ps[1].y < ps[0].y ? [ps[1], ps[0]] : [ps[0], ps[1]];
    moveY(up, up.vy * dt); moveY(lo, lo.vy * dt);
    for (const p of ps) {
      if (!p.alive) continue;
      const was = p.grounded, pr = probe(p);
      p.tileGround = pr.tile; p.onPartner = pr.partner; p.onOneWay = pr.oneway;
      p.grounded = pr.tile || pr.partner;
      if (p.grounded && !was && p.lastVy > 260) {
        p.sx = 1.25; p.sy = 0.78;
        puff(p.x + p.w / 2, p.y + p.h, 5, 'rgba(255,255,255,0.75)');
        Sfx.play('land');
      }
      p.lastVy = p.grounded ? 0 : p.vy;
    }
  },
  step(dt) {
    const st = G.mst, M = MODES.lava;
    if (!st.tall) return;
    M.enter(st);
    try { M.tick(st, dt); } finally { M.leave(st); }
    if (st.exit && G.mode === 'play') {
      st.exit = false;
      const L = G.level;
      if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) nextRoom(); else levelClear();
    }
  },
  tick(st, dt) {
    const cfg = st.cfg, ps = G.players, M = MODES.lava;
    if (st.flashT > 0) st.flashT -= dt;
    if (st.camFastT > 0) st.camFastT -= dt;
    for (const k of [0, 1]) if (st.waitT[k] > 0) st.waitT[k] -= dt;
    // the "Hot toes!" beat: everything holds still, then both go back to the checkpoint
    if (st.beatT > 0) {
      for (const p of ps) { p.pendingJump = false; p.jumpBuf = 0; }
      st.beatT -= dt;
      if (st.beatT <= 0) { st.beatT = 0; M.resetTo(st); }
      M.camera(st, dt);
      M.fx(dt);
      return;
    }
    // kids hold ▼ to "press harder", so ▼ never drops you through a plank while you stand on a button or star
    for (const p of ps) {
      if (!p.alive || !p.grounded || !p.onOneWay) continue;
      if (st.buttons.some(b => b.plank && M.standingOn(p, b.c, b.r)) || st.twins.some(tw => tw.plank && M.standingOn(p, tw.c, tw.r))) p.downLatch = true;
    }
    const yb = ps.map(p => p.y);
    M.move(dt);
    M.leash(st, yb);
    if (G.introT <= 0) st.towerT += dt;
    // --- buttons (owner only) ---
    for (const b of st.buttons) {
      const p = ps[b.owner], q = ps[1 - b.owner], gr = st.groups[b.group];
      const on = M.standingOn(p, b.c, b.r);
      if (on && !b.down) {
        puff(b.c * T + T / 2, b.r * T + 22, 5, PCOL[b.owner]);
        if (b.hold || !b.latched) {   // a press that does something (a latch's first, every hold-plate press) counts and chimes
          st.presses[b.owner]++; Sfx.play('lavaPress', b.owner); rumble(b.owner, 0.1, 0.35, 80);
          if (gr && gr.state === 'hidden') {
            const c0 = gr.cells[0];
            st.zips.push({ x0: b.c * T + T / 2, y0: b.r * T + 20, x1: c0.c * T + T / 2, y1: c0.r * T + T / 2, t: 0, col: PCOL[gr.holder] });
          }
        }
      }
      // stepping off a hold plate while the partner stands on its blocks
      if (b.hold && b.down && !on && gr && M.onGroup(q, gr)) M.hintOnce('stay' + b.ch, b.owner, 'Stay on it!');
      b.down = on;
      // the partner on your button: nothing happens (a wiggle and a "nope")
      const qOn = M.standingOn(q, b.c, b.r);
      if (qOn && !b.odown) { b.wig = 0.3; Sfx.play('lavaNope', q.id); }
      b.odown = qOn;
      if (!gr) continue;
      if (b.hold) M.setGroup(gr, on);
      else if (on && !b.latched) { b.latched = true; M.setGroup(gr, true); }
    }
    // standing on the partner's button for a moment: tell them whose it is (once per tower)
    for (const q of ps) {
      const theirs = st.buttons.some(b => b.owner !== q.id && M.standingOn(q, b.c, b.r)) || st.twins.some(tw => tw.owner !== q.id && M.standingOn(q, tw.c, tw.r));
      st.nopeT[q.id] = theirs ? st.nopeT[q.id] + dt : 0;
      if (st.nopeT[q.id] >= cfg.nopeHint) M.hintOnce('nope' + q.id, q.id, 'That’s ' + NAMES[1 - q.id] + '’s button!');
    }
    // --- groups: build one cell per buildStep, in order; a cell the player it holds is standing in is skipped and pops in
    //     as soon as they move (after blockHint s: a "scoot over" hint, an arrow and a soft bloop); fade ---
    for (const gr of Object.values(st.groups)) {
      for (const cl of gr.cells) if (cl.flash > 0) cl.flash -= dt;
      if (gr.state === 'building') {
        gr.buildT += dt;
        const want = Math.min(gr.cells.length, 1 + Math.floor(gr.buildT / cfg.buildStep));
        gr.waitK = -1;
        for (let k = 0; k < Math.min(want, gr.cells.length); k++) {
          const cl = gr.cells[k];
          if (cl.on) continue;
          if (M.cellBlockedFor(cl, gr.tile)) { if (gr.waitK < 0) gr.waitK = k; continue; }
          M.buildCell(gr, cl);
        }
        if (gr.waitK >= 0) {
          const was = gr.blockT;
          gr.blockT += dt;
          if (gr.blockT >= cfg.blockHint && M.liftHolder(gr, ps[gr.holder])) {
            // standing in it for a moment: the step pops in under your feet and lifts you up ("boing")
            for (let k = gr.waitK; k < Math.min(want, gr.cells.length); k++) { const cl = gr.cells[k]; if (!cl.on && !M.cellBlockedFor(cl, gr.tile)) M.buildCell(gr, cl); }
            gr.waitK = gr.cells.findIndex((cl, k) => k < want && !cl.on);
            st.lifts++; Sfx.play('lavaBoing', gr.holder); rumble(gr.holder, 0.15, 0.3, 90);
            if (gr.waitK < 0) gr.blockT = 0;
          } else {
            if (was < cfg.blockHint && gr.blockT >= cfg.blockHint) {   // nowhere to be lifted to: say "scoot over" (+ an arrow)
              M.hintOnce('blk' + gr.g, gr.holder, 'Scoot over! Your step pops in here');
              Sfx.play('lavaBloop', gr.holder); rumble(gr.holder, 0, 0.2, 60);
            }
            if (gr.blockT >= cfg.blockHint) gr.blkDir = M.blockDir(gr, ps[gr.holder]);
          }
        } else gr.blockT = 0;
        if (gr.cells.every(cl => cl.on)) {
          gr.state = 'on';
          if (gr.fresh > 0) { Sfx.play('lavaReady', gr.holder); rumble(gr.holder, 0, 0.3, 90); M.hint(gr.holder, 'Your steps!', { group: gr }); }
        }
      } else if (gr.state === 'fading') {
        gr.fadeT -= dt; gr.waitK = -1; gr.blockT = 0;
        if (gr.fadeT <= 0) { M.hideGroup(gr); Sfx.play('lavaFade'); }
      }
    }
    // --- star buttons -> hatch (both owners on their own star together for twinHold) ---
    if (st.twins.length) {
      for (const tw of st.twins) {
        const p = ps[tw.owner], q = ps[1 - tw.owner];
        const on = M.standingOn(p, tw.c, tw.r);
        if (on && !tw.down && !st.hatchOpen) {
          st.presses[tw.owner]++; Sfx.play('lavaStar', tw.owner); rumble(tw.owner, 0.1, 0.35, 80);
          puff(tw.c * T + T / 2, tw.r * T + 18, 6, C.gold);
        }
        tw.down = on;
        const qOn = M.standingOn(q, tw.c, tw.r);
        if (qOn && !tw.odown) { tw.wig = 0.3; Sfx.play('lavaNope', q.id); }
        tw.odown = qOn;
      }
      if (!st.hatchOpen) {
        if (st.twins.every(tw => tw.down)) {
          st.twinT += dt;
          if (!G.level.crack) { G.level.crack = {}; for (const h of st.hatch) G.level.crack[h.r * COLS + h.c] = 1; Sfx.play('crack'); }
          if (st.twinT >= cfg.twinHold) M.openHatch();
        } else { st.twinT = 0; G.level.crack = null; }
      }
    }
    // --- ice pops: freeze the lava (resets to `freeze` s, doesn't stack) ---
    for (const ic of st.icePops) {
      if (ic.got || !ps.some(p => p.alive && rectHit(p, ic.x - 12, ic.y - 12, 24, 24))) continue;
      ic.got = true; st.ices++; st.freezeT = cfg.freeze;
      Sfx.play('lavaFreeze'); rumble(0, 0.1, 0.25, 120); rumble(1, 0.1, 0.25, 120); burst(ic.x, ic.y, '#bff0ff', 14);
    }
    // --- team checkpoints (forward only, lit once both have stood on it); wrong-side strand boxes ---
    for (const p of ps) {
      if (!p.alive || !p.grounded || !p.tileGround) continue;
      const fr = Math.round((p.y + p.h) / T);
      if (Math.abs(p.y + p.h - fr * T) > 1.5) continue;
      const c = Math.floor((p.x + p.w / 2) / T), r = fr - 1, k = p.id;
      for (let z = st.cpIdx + 1; z < st.cps.length; z++) {
        const cp = st.cps[z];
        if (r !== cp.r || cp.seen[k]) continue;
        cp.seen[k] = true;
        puff(p.x + p.w / 2, p.y + p.h, 4, C.gold);
        if (cp.seen[0] && cp.seen[1]) {
          cp.lit = true; st.cpIdx = z; st.cpHits++;
          st.cp = cp.at.map(([cc, rr0]) => ({ c: cc, r: rr0 }));
          G.spawnPts = cp.at.map(([cc, rr0]) => ({ x: cc * T + (T - PW) / 2, y: (rr0 + 1) * T - PH }));
          Sfx.play('lavaCheck', 1); rumble(0, 0, 0.3, 90); rumble(1, 0, 0.3, 90);
          for (const [cc, rr0] of cp.at) burst(cc * T + T / 2, rr0 * T + 4, C.gold, 10);
        } else Sfx.play('lavaCheck', 0.75);
        break;
      }
      const inStrand = (st.strand[k] || []).some(bx => c >= bx[0] && c <= bx[2] && r >= bx[1] && r <= bx[3]);
      if (inStrand) {
        st.strandT[k] += dt;
        if (st.strandT[k] >= cfg.strandHint) M.hintOnce('low' + k, k, 'Hold ' + lavaKey(k) + ' to hop back up');
        if (st.strandT[k] >= cfg.strandT) { st.strands++; M.hopBack(p); }
      } else st.strandT[k] = 0;
    }
    // --- AFK, hold ▼ to hop back (a press that started where it may count; never on a button/plate/star), auto-return ---
    for (const p of ps) {
      const i = p.input, k = p.id;
      st.afk[k] = (i.left || i.right || i.jump || i.down || i.up) ? 0 : st.afk[k] + dt;
      // (no hopping back into the lava: once it has reached the checkpoint the only way is up)
      const still = p.alive && p.grounded && !i.left && !i.right && !p.onOneWay && !M.onAnyButton(p), canHold = still && !M.cpHot(st);
      if (i.down && !st.prevDown[k]) { st.downOk[k] = canHold; if (still && !canHold) { M.hint(k, 'Too hot down there! Climb!', { life: 1.6 }); Sfx.play('lavaNope', k); } }
      if (!i.down || !canHold) st.downOk[k] = false;
      st.prevDown[k] = i.down;
      if (st.downOk[k]) {
        st.downT[k] += dt;
        if (st.downT[k] >= cfg.returnHold) { st.downOk[k] = false; M.hopBack(p); }
      } else st.downT[k] = 0;
      if (p.alive && Math.floor((p.y + p.h - 1) / T) > st.cp[k].r + cfg.autoRows) {
        st.lowT[k] += dt;
        if (st.lowT[k] >= cfg.lowHint) M.hintOnce('low' + k, k, 'Hold ' + lavaKey(k) + ' to hop back up');
        if (st.lowT[k] >= cfg.autoReturn) M.hopBack(p);
      } else st.lowT[k] = 0;
    }
    st.paused = Math.min(st.afk[0], st.afk[1]) > cfg.afkPause;
    // one player gone for a while (no input for afkPause s, and not standing on their own button/plate/star) while the other
    // one stands where they got to (their highest point) and has not climbed for waitStill s: the lava waits (and backs off
    // to a fair gap), so the partner waiting for them isn't burned for it
    for (const p of ps) {
      const feet = p.y + p.h;
      if (p.alive && p.grounded && feet < st.best[p.id] - T / 2) { st.best[p.id] = feet; st.sinceUp[p.id] = 0; }
      else st.sinceUp[p.id] += dt;
    }
    st.waitingFor = -1;
    if (!st.paused) for (const p of ps) {
      const o = ps[1 - p.id], atBest = o.alive && o.y + o.h <= st.best[o.id] + T;   // the other one is up where they got to, not fumbling below it
      if (st.afk[p.id] > cfg.afkPause && !(p.alive && M.onOwnButton(p)) && atBest && st.sinceUp[o.id] >= cfg.waitStill) st.waitingFor = p.id;
    }
    // --- the lava: waits for the card and its delay, then freeze / AFK pause / surges / assist / catch-up, capped ---
    const feet = ps.map(p => (p.alive ? p.y + p.h : (st.cp[p.id].r + 1) * T)), lowFeet = Math.max(...feet);
    if (G.introT <= 0) {
      if (st.wait > 0) st.wait -= dt;
      else if (st.freezeT > 0) { st.freezeT -= dt; if (st.freezeT <= 0) { st.freezeT = 0; Sfx.play('lavaThaw'); } }
      else if (!st.paused) {
        if (!st.started) { st.started = true; st.startT = cfg.startMsg; Sfx.play('lavaStart'); }
        let v = cfg.speed;
        // (surge.from / surge.to: only while the lower player's feet are that many rows up the tower)
        const lowH = st.N - lowFeet / T, band = !cfg.surge || ((cfg.surge.from == null || lowH >= cfg.surge.from) && (cfg.surge.to == null || lowH <= cfg.surge.to));
        if (!band && st.surging <= 0) st.warned = false;
        if (cfg.surge && band && st.waitingFor < 0 && st.towerT >= cfg.surgeStart) {
          st.surgeT -= dt;
          if (st.surgeT <= cfg.surge.warn && !st.warned) { st.warned = true; Sfx.play('lavaRumble'); rumble(0, 0.15, 0.45, 400); rumble(1, 0.15, 0.45, 400); }
          if (st.surgeT <= 0) {
            st.surging = cfg.surge.time; st.surgeT = cfg.surge.every; st.warned = false;
            Sfx.play('lavaSurge'); rumble(0, 0.5, 0.6, 400); rumble(1, 0.5, 0.6, 400);
            if (!reduceMotion) G.shake = Math.max(G.shake, 0.12);
          }
          if (st.surging > 0) { st.surging -= dt; v = cfg.surge.speed; }
        } else if (cfg.surge && st.surging > 0) { st.surging -= dt; v = cfg.surge.speed; }
        v *= st.assist;
        // catch-up: never more than about half a screen below the lower player
        if (st.lavaY - lowFeet > cfg.catchGap) v *= cfg.catchMul;
        if (st.waitingFor >= 0) {   // waiting for the gone player: hold still and ease back to a fair gap below the lowest player
          v = 0; st.surging = 0; const back = Math.min(st.startY, lowFeet + cfg.sinkGap);
          if (st.lavaY < back) st.lavaY = Math.min(back, st.lavaY + cfg.waitBack * dt);
        } else st.lavaY = Math.min(st.lavaY, lowFeet + cfg.catchMax);
        st.lavaY = Math.max(st.capY, st.lavaY - v * dt);
      }
      // plate shield: whoever holds a hold plate is never punished for it
      // (and the lava sinks to holdShield under them, so stepping off the plate later leaves time to get away)
      for (const b of st.buttons) if (b.hold && b.down) {
        const q = ps[b.owner], f = q.y + q.h;
        if (st.lavaY < f + cfg.holdShield) st.lavaY = Math.min(f + cfg.holdShield, Math.max(st.lavaY + cfg.shieldSink * dt, f + cfg.shieldMin));
      }
    }
    // --- ouch + closest call ---
    for (const p of ps) {
      if (!p.alive) continue;
      const gap = st.lavaY - (p.y + p.h);
      // a close call only counts once it is over and the player got away (an ouch is not a close call)
      if (gap > -cfg.killDepth && st.started && !M.shielded(p)) st.near[p.id] = Math.min(st.near[p.id], Math.max(0, gap));
      if (gap >= cfg.heatGap) M.nearDone(st, p.id);
      if (gap <= -cfg.killDepth && !M.shielded(p)) { M.touch(p); break; }
    }
    // --- the door: both inside it for a moment ---
    const d = st.door;
    if (d && st.beatT <= 0) {
      G.doorIn = ps.map(p => {
        if (!p.alive) return false;
        const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
        return cx > d.x + 2 && cx < d.x + d.w - 2 && cy > d.y && cy < d.y + d.h;
      });
      const open = !st.hatch.length || st.hatchOpen;
      if (open && G.doorIn[0] && G.doorIn[1]) { st.doorHold += dt; if (st.doorHold >= 0.35) st.exit = true; } else st.doorHold = 0;
    }
    M.camera(st, dt);
    M.fx(dt);
  },
  // feedback that moves with the game clock: timers, heat warnings, bubbles, embers (cosmetic; MODES.lava.rand)
  fx(dt) {
    const st = G.mst, cfg = st.cfg, R = MODES.lava.rand, frozen = st.freezeT > 0, onScreen = st.lavaY < st.camY + H + 10;
    if (st.startT > 0) st.startT -= dt;
    if (st.breatherT > 0) st.breatherT -= dt;
    for (const b of st.buttons) if (b.wig > 0) b.wig -= dt;
    for (const tw of st.twins) if (tw.wig > 0) tw.wig -= dt;
    for (let i = st.zips.length - 1; i >= 0; i--) if ((st.zips[i].t += dt) >= 0.2) st.zips.splice(i, 1);
    for (const p of G.players) {
      const k = p.id, h = st.hints[k];
      if (h && (h.t += dt) >= h.life) st.hints[k] = null;
      if (st.hotCD[k] > 0) st.hotCD[k] -= dt;
      const hot = p.alive && !frozen && G.introT <= 0 && st.lavaY - (p.y + p.h) < cfg.heatGap && !MODES.lava.shielded(p);
      if (hot && !st.heat[k] && st.hotCD[k] <= 0) { Sfx.play('lavaHot', k); rumble(k, 0, 0.25, 80); st.hotCD[k] = 1.2; }
      st.heat[k] = hot;
    }
    if (st.bubSnd > 0) st.bubSnd -= dt;
    if (frozen || !onScreen) { st.bubbles.length = 0; }
    else {
      st.bubT -= dt;
      const every = st.warned ? 0.06 : 0.18;
      while (st.bubT <= 0) { st.bubT += every; if (st.bubbles.length < 60) st.bubbles.push({ x: 8 + R() * (W - 16), d: 6 + R() * 24, r: 2.5 + R() * 2.5 }); }
    }
    for (let i = st.bubbles.length - 1; i >= 0; i--) {
      const b = st.bubbles[i];
      b.d -= 30 * dt;
      if (b.d > 0) continue;
      st.bubbles.splice(i, 1);
      for (const s of [-1, 1]) st.embers.push({ x: b.x + s * 2, y: st.lavaY - 2, vx: s * (20 + R() * 25), vy: -50 - R() * 40, life: 0.35, max: 0.35, size: 1.8, col: '#ffcf6b', grav: 320 });
      if (st.bubSnd <= 0) { Sfx.play('lavaBubble'); st.bubSnd = 0.5; }
    }
    if (onScreen && !frozen && !reduceMotion) {
      st.embT -= dt;
      while (st.embT <= 0) {
        st.embT += 0.35;
        const life = 1.2 + R() * 0.8;
        st.embers.push({ x: R() * W, y: st.lavaY - 2, vx: (R() * 2 - 1) * 15, vy: -40 - R() * 50, life, max: life, size: 2, col: '#ffb04a', grav: 0 });
      }
    }
    for (let i = st.embers.length - 1; i >= 0; i--) {
      const e = st.embers[i];
      if ((e.life -= dt) <= 0) { st.embers.splice(i, 1); continue; }
      e.vy += e.grav * dt; e.x += e.vx * dt; e.y += e.vy * dt;
    }
    if (st.embers.length > 120) st.embers.splice(0, st.embers.length - 120);
  },
  nearDone(st, k) { st.closest[k] = Math.min(st.closest[k], st.near[k]); st.near[k] = 999; },
  onRespawn(p) {
    const st = G.mst;
    if (st.inClimb) MODES.lava.fixSpawn(p);
    if (st.ouchHint[p.id]) { st.ouchHint[p.id] = false; MODES.lava.hint(p.id, 'Ouch! Hot toes!', { life: 1.6, always: true }); }
  },
  // a block may have appeared on the checkpoint: slide to the nearest free spot on that row (right first), then rows above
  fixSpawn(p) {
    const free = (x, y) => {
      const c1 = Math.floor(x / T), c2 = Math.floor((x + PW - 0.01) / T), r1 = Math.floor(y / T), r2 = Math.floor((y + PH - 0.01) / T);
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (solidFor(tile(c, r), p)) return false;
      return true;
    };
    if (free(p.x, p.y)) return;
    for (let dr = 0; dr <= 3; dr++) for (let k = 1; k <= 8; k++) for (const s of [1, -1]) {
      const x = p.x + s * k * T, y = p.y - dr * T;
      if (free(x, y)) { p.x = x; p.y = y; return; }
    }
  },

  /* ---------- drawing ---------- */
  star(x, y, ro, ri) {   // a 5-point star path
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
  },
  // where things sit above a head: the go-back ring, then the heat "!", then a hint bubble
  // (on phones, hudBig(), the ring is 1.6x bigger so it reads on a small screen)
  headStack(p) {
    const st = G.mst, heat = st.heat[p.id], rs = hudBig() ? 1.6 : 1;
    const ring = st.downT[p.id] >= st.cfg.returnShow || (!st.hatchOpen && st.twins.some(tw => tw.down && tw.owner === p.id));
    const ringR = 9 * rs, ringY = p.y - 7 - ringR, heatY = ring ? ringY - ringR - 15 : p.y - 18;
    const top = Math.min(ring ? ringY - ringR - 2 : p.y - 6, heat ? heatY - 11 : 1e9);
    return { ring, heat, ringR, rs, ringY, heatY, bubbleBottom: top - 4 };
  },
  // the rows of the tower on screen (and one more each side)
  rowsOnScreen(st, pad = 1) { return [Math.max(0, Math.floor(st.camY / T) - pad), Math.min(st.N - 1, Math.floor((st.camY + H) / T) + pad)]; },
  // with the players in climb coordinates and the canvas moved up the tower, draw f
  inClimb(st, f) {
    const was = st.inClimb;
    MODES.lava.enter(st);
    ctx.save(); ctx.translate(0, -st.camY);
    try { f(); } finally { ctx.restore(); if (!was) MODES.lava.leave(st); }
  },
  // the sky behind the tower: the horizon drops away as you climb (parallax), clouds (tower 3), the crater glow (tower 4)
  drawBack(st) {
    const t = G.clock, k = st.WH > H ? st.camY / (st.WH - H) : 1, up = 1 - k, idx = G.level.def.roomIndex || 0;   // up: 0 at the bottom, 1 at the top
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.skyTop); g.addColorStop(1, C.skyBot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.sun; circle(810, 105 + up * 40, 44); ctx.fill();
    ctx.fillStyle = C.sunGlow; circle(810, 105 + up * 40, 64); ctx.fill();
    const nCl = idx === 2 ? 9 : 5;
    for (let i = 0; i < nCl; i++) {
      const speed = 6 + (i % 3) * 4, x = ((i * 233 + t * speed) % (W + 220)) - 110;
      const y = ((50 + ((i * 71) % 130) + (idx === 2 ? i * 40 : 0) + st.camY * 0.25) % (H + 200)) - 60;
      drawCloud(x, y, 0.7 + (i % 2) * 0.4);
    }
    const drop = up * 300;
    ctx.fillStyle = C.hillFar;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 330 + drop + Math.sin(x * 0.007 + 1.3) * 34 + Math.sin(x * 0.019) * 12);
    ctx.lineTo(W, H); ctx.fill();
    // (third polish pass) the far land has little smoking cones, the near land a lit rim, rock spires and burnt trees
    if (330 + drop < H + 60) {
      const fy = x => 330 + drop + Math.sin(x * 0.007 + 1.3) * 34 + Math.sin(x * 0.019) * 12, far = mixCol(C.hillFar, C.skyBot, 0.25);
      for (let i = 0; i < 4; i++) {
        const hh = hash(i, 541 + idx), x = 90 + i * 250 + (hh % 90), y = fy(x) + 6, w = 46 + (hh >>> 6) % 30, ht = 30 + (hh >>> 11) % 22;
        ctx.fillStyle = far; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - 7, y - ht); ctx.lineTo(x + 7, y - ht); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(60,30,50,0.08)'; ctx.beginPath(); ctx.moveTo(x + 1, y - ht); ctx.lineTo(x + 7, y - ht); ctx.lineTo(x + w, y); ctx.lineTo(x + w * 0.25, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,150,70,' + (0.55 + 0.2 * Math.sin(t * 2 + i * 1.7)) + ')'; ctx.beginPath(); ctx.ellipse(x, y - ht, 7, 2, 0, 0, Math.PI * 2); ctx.fill();
        for (let j = 0; j < 3; j++) { const u = ((t * 0.12 + j / 3 + i * 0.37) % 1); ctx.fillStyle = 'rgba(120,90,110,' + (0.2 * (1 - u)) + ')'; circle(x + 4 + u * 16 + Math.sin(u * 5 + i) * 3, y - ht - 6 - u * 36, 4 + u * 9); ctx.fill(); }
      }
      ctx.fillStyle = C.hillFar; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, fy(x) + 5);
      ctx.lineTo(W, H); ctx.fill();
      ctx.strokeStyle = tint(C.hillFar, 0.25); ctx.lineWidth = 2.5; ctx.beginPath();
      for (let x = 0; x <= W; x += 16) x ? ctx.lineTo(x, fy(x) + 6) : ctx.moveTo(x, fy(x) + 6);
      ctx.stroke();
    }
    ctx.fillStyle = C.hillNear;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 400 + drop * 1.4 + Math.sin(x * 0.011 + 4) * 26 + Math.sin(x * 0.027 + 1) * 8);
    ctx.lineTo(W, H); ctx.fill();
    if (400 + drop * 1.4 < H + 60) {
      const ny = x => 400 + drop * 1.4 + Math.sin(x * 0.011 + 4) * 26 + Math.sin(x * 0.027 + 1) * 8, dk = shade(C.hillNear, 0.22);
      ctx.strokeStyle = tint(C.hillNear, 0.28); ctx.lineWidth = 3; ctx.beginPath();
      for (let x = 0; x <= W; x += 16) x ? ctx.lineTo(x, ny(x) + 1.5) : ctx.moveTo(x, ny(x) + 1.5);
      ctx.stroke();
      for (let i = 0; i < 9; i++) {
        const hh = hash(i, 613 + idx), x = 30 + i * 108 + (hh % 60), y = ny(x) + 3;
        if (hh & 1) {   // a rock spire
          const w = 7 + (hh >>> 4) % 6, ht = 16 + (hh >>> 8) % 16;
          ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w * 0.3, y - ht * 0.7); ctx.lineTo(x + 1, y - ht); ctx.lineTo(x + w * 0.6, y - ht * 0.5); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w * 0.3, y - ht * 0.7); ctx.lineTo(x + 1, y - ht); ctx.lineTo(x - 1, y); ctx.closePath(); ctx.fill();
        } else {        // a burnt tree
          const ht = 20 + (hh >>> 8) % 12;
          ctx.strokeStyle = dk; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath();
          ctx.moveTo(x, y); ctx.lineTo(x + 1, y - ht); ctx.moveTo(x + 0.5, y - ht * 0.5); ctx.lineTo(x - 7, y - ht * 0.85); ctx.moveTo(x + 0.7, y - ht * 0.68); ctx.lineTo(x + 7, y - ht * 1.02); ctx.moveTo(x - 4, y - ht * 0.7); ctx.lineTo(x - 5, y - ht * 1.05);
          ctx.stroke();
        }
      }
      const ng = ctx.createLinearGradient(0, 400 + drop * 1.4, 0, H + 40);
      ng.addColorStop(0, 'rgba(60,30,50,0)'); ng.addColorStop(1, 'rgba(60,30,50,0.22)');
      ctx.fillStyle = ng; ctx.fillRect(0, Math.min(H, 380 + drop * 1.4), W, H);
    }
    // the volcano's own dark walls rising beside the climb (a slow parallax band at each side)
    ctx.fillStyle = 'rgba(60,40,55,0.22)';
    for (const s of [0, 1]) {
      ctx.beginPath(); ctx.moveTo(s ? W : 0, 0);
      for (let y = 0; y <= H; y += 20) { const yy = y + st.camY * 0.5, w = 60 + Math.sin(yy * 0.013 + s * 2) * 18 + Math.sin(yy * 0.041) * 8; ctx.lineTo(s ? W - w : w, y); }
      ctx.lineTo(s ? W : 0, H); ctx.closePath(); ctx.fill();
      // (third polish pass) a nearer, darker lip of rock inside each wall with a few ledges
      ctx.beginPath(); ctx.moveTo(s ? W : 0, 0);
      for (let y = 0; y <= H; y += 20) { const yy = y + st.camY * 0.7, w = 26 + Math.sin(yy * 0.021 + s * 3) * 10 + Math.sin(yy * 0.067 + s) * 5; ctx.lineTo(s ? W - w : w, y); }
      ctx.lineTo(s ? W : 0, H); ctx.closePath(); ctx.fill();
    }
    if (idx === 3) {   // the crater's glow over the top of the last tower
      const a = 0.15 + 0.4 * up * up;
      const cg = ctx.createLinearGradient(0, 0, 0, 220);
      cg.addColorStop(0, 'rgba(255,90,40,' + a + ')'); cg.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, 220);
    }
  },
  draw() {
    const st = G.mst, M = MODES.lava;
    if (!st.tall) return;
    M.drawBack(st);
    M.inClimb(st, () => M.drawWorld(st));
  },
  // the tower's tiles (only the rows on screen), signs, checkpoints, the door, then buttons, steps and ice pops
  drawWorld(st) {
    const M = MODES.lava, t = G.clock, ps = G.players, L = G.level, [r0, r1] = M.rowsOnScreen(st);
    const vis = r => r >= r0 && r <= r1;
    for (let ty = r0; ty <= r1; ty++) for (let tx = 0; tx < COLS; tx++) {
      const ch = st.tall[ty][tx], x = tx * T, y = ty * T;
      if (ch === '#') {
        drawStone(tx, ty);
        if (ty + 1 < st.N && ty + 1 >= ROWS && !'#s'.includes(st.tall[ty + 1][tx])) { ctx.fillStyle = C.stoneEdge; ctx.fillRect(x, y + T - 3, T, 3); }
      } else if (ch === '=') drawPlank(x, y, tx, ty);
      else if (ch === 'o') drawColorBlock(x, y, 0, tx, ty);
      else if (ch === 'u') drawColorBlock(x, y, 1, tx, ty);
      else if (ch === 'P') { drawBrick(x, y, st.blockCol[ty][tx]); if (L.crack && L.crack[ty * COLS + tx]) drawCrack(x, y); }
    }
    for (const sg of L.def.signs || []) {
      if (!vis(Math.floor(sg.y / T))) continue;
      ctx.font = '17px "Lilita One", "Arial Rounded MT Bold", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(28,26,54,0.55)'; ctx.fillText(sg.text, sg.x, sg.y);
    }
    // team checkpoints: a lantern at each player's spot, lit gold once both have stood on the ledge
    for (let z = 1; z < st.cps.length; z++) {
      const cp = st.cps[z];
      if (!vis(cp.r)) continue;
      cp.at.forEach(([c, r], k) => {
        const x = c * T + T / 2 + (k ? 10 : -10), y = (r + 1) * T, lit = cp.lit, mine = cp.seen[k];
        ctx.fillStyle = '#5b4a40'; ctx.fillRect(x - 1.5, y - 30, 3, 30);
        ctx.fillStyle = '#5b4a40'; ctx.fillRect(x - 6, y - 31, 12, 3);
        if (lit && !reduceMotion) { ctx.fillStyle = 'rgba(255,210,110,0.35)'; circle(x, y - 38, 13 + Math.sin(t * 4 + k) * 1.5); ctx.fill(); }
        ctx.fillStyle = lit ? C.gold : mine ? PCOL[k] : 'rgba(255,255,255,0.55)';
        rr(x - 5, y - 44, 10, 12, 3); ctx.fill();
        ctx.strokeStyle = lit ? C.goldDark : PDARK[k]; ctx.lineWidth = 1.5; rr(x - 5, y - 44, 10, 12, 3); ctx.stroke();
      });
    }
    if (st.door && vis(Math.floor(st.door.y / T))) drawDoor(st.door);
    // ghosts: the steps a button will build, dashed in the colour of the player they will hold
    ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    for (const gr of Object.values(st.groups)) {
      const b = gr.btn, o = b && ps[b.owner];
      gr.invite = gr.state === 'hidden' && !!o && o.alive && Math.abs(o.x + o.w / 2 - (b.c * T + T / 2)) <= 4 * T && Math.abs(o.y + o.h - (b.r + 1) * T) <= 4 * T;
      const base = gr.invite && !reduceMotion ? 0.575 + 0.225 * Math.sin(t * Math.PI * 4) : 0.5;
      const blk = gr.state === 'building' && gr.waitK >= 0;
      for (let k = 0; k < gr.cells.length; k++) {
        const cl = gr.cells[k];
        if (cl.on || !vis(cl.r)) continue;
        const a = blk && k >= gr.waitK && M.cellBlockedFor(cl, gr.tile) ? (Math.floor(t * 12) % 2 ? 0.9 : 0.3) : base;
        ctx.globalAlpha = a * 0.16; ctx.fillStyle = PCOL[gr.holder]; ctx.fillRect(cl.c * T + 2, cl.r * T + 2, T - 4, T - 4);
        ctx.globalAlpha = a; ctx.strokeStyle = PCOL[gr.holder]; ctx.strokeRect(cl.c * T + 2, cl.r * T + 2, T - 4, T - 4);
      }
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    // pop-in flashes and the blink of a hold group that is about to vanish
    const blinkOn = Math.floor(t * 16) % 2 === 0;
    for (const gr of Object.values(st.groups)) for (const cl of gr.cells) {
      if (!cl.on || !vis(cl.r)) continue;
      let a = cl.flash > 0 ? 0.7 * cl.flash / 0.15 : 0;
      if (gr.state === 'fading' && blinkOn) a = Math.max(a, 0.5);
      if (a > 0) { ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.fillRect(cl.c * T, cl.r * T, T, T); }
    }
    ctx.globalAlpha = 1;
    // the colour rule, drawn: while a button's owner is near it and its steps are still ghosts, a dotted line in the
    // partner's colour flows from the button to the first step it will build
    for (const gr of Object.values(st.groups)) {
      const b = gr.btn, o = b && ps[b.owner];
      if (!b || gr.state !== 'hidden' || !o.alive || Math.abs(o.y + o.h - (b.r + 1) * T) > 1.5 * T || Math.abs(o.x + o.w / 2 - (b.c * T + T / 2)) > 6 * T) continue;
      const c0 = gr.cells[0], x0 = b.c * T + T / 2, y0 = b.r * T + 16, x1 = c0.c * T + T / 2, y1 = c0.r * T + T / 2;
      const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 30 - Math.abs(x1 - x0) * 0.08;
      ctx.lineCap = 'round'; ctx.setLineDash([2, 7]); ctx.lineDashOffset = reduceMotion ? 0 : -t * 22;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1);
      ctx.globalAlpha = 0.55; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.stroke();
      ctx.globalAlpha = 0.85; ctx.strokeStyle = PCOL[gr.holder]; ctx.lineWidth = 3; ctx.stroke();
      ctx.setLineDash([]); ctx.lineCap = 'butt'; ctx.globalAlpha = 1;
    }
    // buttons: cap in the owner's colour, a chip (and later a lamp) in the colour of the partner it builds for
    for (const b of st.buttons) {
      if (!vis(b.r)) continue;
      const x = b.c * T, y = b.r * T, own = PCOL[b.owner], par = PCOL[1 - b.owner], gr = st.groups[b.group];
      const wig = b.wig > 0 ? Math.sin(b.wig * 60) * 1.5 : 0;
      if (b.hold) {
        const fading = gr && gr.state === 'fading', py = y + 24 + (b.down ? 2 : 0);
        ctx.fillStyle = C.stoneEdge; rr(x + 1, y + 27, T - 2, 3, 1.5); ctx.fill();
        if (b.down) { ctx.shadowColor = own; ctx.shadowBlur = 8; }
        ctx.fillStyle = fading && blinkOn ? '#ffffff' : own; rr(x + 2 + wig, py, 26, 4, 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; rr(x + 2 + wig, py, 26, 4, 2); ctx.stroke();
        ctx.fillStyle = par; ctx.fillRect(x + 13 + wig, py + 1, 4, 2);
        if (!b.down) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 11 + wig, y + 15, 2, 6); ctx.fillRect(x + 17 + wig, y + 15, 2, 6); }
        continue;
      }
      ctx.fillStyle = C.stoneEdge; rr(x + 2, y + 25, 26, 5, 2); ctx.fill();
      if (b.latched) {
        ctx.fillStyle = own; rr(x + 4 + wig, y + 23, 22, 3, 2); ctx.fill();
        const building = gr && gr.state === 'building';
        ctx.globalAlpha = building ? 0.8 + 0.2 * Math.sin(t * Math.PI * 4) : 1;
        ctx.fillStyle = par; circle(x + 15, y + 13, 3.5); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = PDARK[1 - b.owner]; ctx.fillRect(x + 14, y + 17, 2, 6);
        ctx.globalAlpha = 1;
      } else {
        const bob = gr && gr.invite && !reduceMotion ? (Math.sin(t * Math.PI * 8) > 0 ? -1 : 0) : 0;
        const cy = y + 15 + bob;
        ctx.fillStyle = PDARK[b.owner]; rr(x + 4 + wig, cy + 2, 22, 9, 4); ctx.fill();
        ctx.fillStyle = own; rr(x + 4 + wig, cy, 22, 9, 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x + 7 + wig, cy + 1, 16, 2);
        ctx.fillStyle = par; rr(x + 9.5 + wig, cy + 2, 11, 6, 1.5); ctx.fill();   // a little block in the partner's colour
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
      }
    }
    // star buttons and the hatch they open
    for (const tw of st.twins) {
      const cx = tw.c * T + 15 + (tw.wig > 0 ? Math.sin(tw.wig * 60) * 1.5 : 0), cy = tw.r * T + 21;
      ctx.fillStyle = C.stoneEdge; rr(tw.c * T + 4, tw.r * T + 27, 22, 3, 1.5); ctx.fill();
      ctx.fillStyle = PCOL[tw.owner]; circle(cx, cy, 9); ctx.fill();
      ctx.strokeStyle = PDARK[tw.owner]; ctx.lineWidth = 1.5; ctx.stroke();
      const lit = tw.down || st.hatchOpen, s = tw.down && !reduceMotion ? 1 + 0.15 * Math.sin(t * 10) : 1;
      ctx.fillStyle = lit ? C.gold : '#ffffff'; M.star(cx, cy, 6 * s, 2.6 * s); ctx.fill();
    }
    if (st.hatch.length && !st.hatchOpen) {
      const held = st.twins.filter(tw => tw.down);
      if (held.length === 1) {
        const tw = held[0], sx = tw.c * T + 15, sy = tw.r * T + 21;
        let best = null, bd = 1e9;
        for (const h of st.hatch) { const d = Math.hypot(h.c * T + 15 - sx, h.r * T + 15 - sy); if (d < bd) { bd = d; best = h; } }
        ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; ctx.setLineDash([4, 6]); ctx.lineDashOffset = -t * 30;
        ctx.beginPath(); ctx.moveTo(sx, sy - 10); ctx.lineTo(best.c * T + 15, best.r * T + 15); ctx.stroke();
        ctx.setLineDash([]);
      }
      const sh = st.twinT > 0 && !reduceMotion ? 2 : 0;
      ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
      for (const h of st.hatch) { M.star(h.c * T + 15 + (sh ? (M.rand() - 0.5) * 2 * sh : 0), h.r * T + 15, 6, 2.6); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    // ice pops
    for (const ic of st.icePops) {
      if (ic.got || !vis(Math.floor(ic.y / T))) continue;
      const bob = reduceMotion ? 0 : Math.sin((t * 1.5 + ic.ph) * Math.PI * 2) * 2, x = ic.x, y = ic.y + bob;
      ctx.fillStyle = 'rgba(200,240,255,0.35)'; circle(x, y - 2, 14); ctx.fill();
      ctx.fillStyle = '#c98b5a'; ctx.fillRect(x - 1.5, y + 6, 3, 7);
      ctx.fillStyle = '#9fe8ff'; rr(x - 6, y - 10, 12, 16, 5); ctx.fill();
      ctx.strokeStyle = '#4fa9cf'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(x - 3.5, y - 7, 2, 10);
      const sp = ((t + ic.ph) % 0.8) / 0.8;
      if (sp < 0.35) {
        const s = 6 * Math.sin(sp / 0.35 * Math.PI), sx = x + 7, sy = y - 10;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(sx - s, sy); ctx.lineTo(sx + s, sy); ctx.moveTo(sx, sy - s); ctx.lineTo(sx, sy + s); ctx.stroke();
      }
    }
    // a bright dot zips from a pressed button to the first step it builds
    for (const z of st.zips) {
      const f = z.t / 0.2, x = z.x0 + (z.x1 - z.x0) * f, y = z.y0 + (z.y1 - z.y0) * f;
      ctx.fillStyle = z.col; circle(x, y, 4); ctx.fill();
      ctx.fillStyle = '#ffffff'; circle(x, y, 2); ctx.fill();
    }
  },
  drawTop() {
    const st = G.mst, M = MODES.lava;
    if (!st.tall) return;
    M.inClimb(st, () => M.drawTopWorld(st));
  },
  drawTopWorld(st) {
    const M = MODES.lava, t = G.clock;
    M.drawLava();
    // a player hides the plate or star under their feet: show that it is held
    for (const b of st.buttons) {
      if (!b.hold || !b.down) continue;
      const x = b.c * T, y = b.r * T + 26;
      ctx.shadowColor = PCOL[b.owner]; ctx.shadowBlur = 10;
      ctx.fillStyle = PCOL[b.owner]; rr(x, y, T, 4, 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; rr(x, y, T, 4, 2); ctx.stroke();
    }
    for (const tw of st.twins) {
      if (!tw.down || st.hatchOpen) continue;
      const p = G.players[tw.owner], s = reduceMotion ? 1 : 1 + 0.12 * Math.sin(t * 10);
      ctx.shadowColor = C.gold; ctx.shadowBlur = 8;
      ctx.fillStyle = C.gold; M.star(p.x + p.w / 2, p.y - 14, 8 * s, 3.4 * s); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // standing where your own step should pop in: a bouncing arrow beside you shows which way to scoot
    for (const gr of Object.values(st.groups)) {
      if (gr.state !== 'building' || gr.waitK < 0 || gr.blockT < st.cfg.blockHint || !gr.blkDir) continue;
      const p = G.players[gr.holder];
      if (!p.alive) continue;
      const s = hudBig() ? 1.4 : 1, bob = reduceMotion ? 0 : Math.abs(Math.sin(t * 7)) * 5;
      ctx.save(); ctx.translate(p.x + p.w / 2 + gr.blkDir * (p.w / 2 + 4 + bob), p.y + p.h / 2); ctx.scale(gr.blkDir * s, s);
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(9, -4); ctx.lineTo(9, -9); ctx.lineTo(19, 0); ctx.lineTo(9, 9); ctx.lineTo(9, 4); ctx.lineTo(0, 4); ctx.closePath();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.fillStyle = PCOL[gr.holder]; ctx.fill();
      ctx.restore();
    }
    for (const p of G.players) {
      if (!p.alive) continue;
      const hs = M.headStack(p), cx = p.x + p.w / 2;
      if (st.downT[p.id] >= st.cfg.returnShow) {   // the shared World 5 "go back" ring (same as Ice Slide's)
        const f = clamp(st.downT[p.id] / st.cfg.returnHold, 0, 1);
        ctx.lineWidth = 3 * hs.rs; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; circle(cx, hs.ringY, hs.ringR); ctx.stroke();
        ctx.lineWidth = 3.5 * hs.rs; ctx.lineCap = 'round'; ctx.strokeStyle = PCOL[p.id];
        ctx.beginPath(); ctx.arc(cx, hs.ringY, hs.ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke(); ctx.lineCap = 'butt';
        text('↓', cx, hs.ringY + 0.5, 10 * hs.rs, C.ink, 'center', 'body');
      }
      if (hs.heat) {   // too close to the lava
        ctx.fillStyle = '#ffffff'; rr(cx - 9, hs.heatY - 9, 18, 18, 6); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx - 3, hs.heatY + 8); ctx.lineTo(cx + 3, hs.heatY + 8); ctx.lineTo(cx, hs.heatY + 12); ctx.fill();
        text('!', cx, hs.heatY + 1, 15, '#e5322d', 'center', 'display');
      }
    }
  },
  // the lava, in climb coordinates (the canvas is already moved up the tower)
  drawLava() {
    const st = G.mst, y0 = st.lavaY, bot = st.camY + H;
    if (y0 >= bot) return;
    const t = G.clock, frozen = st.freezeT > 0, warn = st.warned && !frozen;
    const amp = frozen ? 0.25 : reduceMotion ? 0.33 : warn ? 2.5 : 1;
    const wave = x => y0 + amp * (3 * Math.sin(2 * Math.PI * (x / 60 + 0.7 * t)) + 1.5 * Math.sin(2 * Math.PI * (x / 23 - 1.3 * t)))
      + (warn && !reduceMotion ? 2 * Math.sin(x * 0.9 + t * 53) : 0);
    // heat glow above the surface
    const gl = ctx.createLinearGradient(0, y0 - 60, 0, y0);
    gl.addColorStop(0, frozen ? 'rgba(170,225,255,0)' : 'rgba(255,140,60,0)'); gl.addColorStop(1, frozen ? 'rgba(170,225,255,0.22)' : 'rgba(255,140,60,0.28)');
    ctx.fillStyle = gl; ctx.fillRect(0, y0 - 60, W, 60);
    // body
    const span = Math.max(1, bot - y0 + 8), sp = v => clamp(v / span, 0, 1);
    const g = ctx.createLinearGradient(0, y0 - 8, 0, bot);
    if (frozen) { g.addColorStop(0, '#8fb6c9'); g.addColorStop(sp(20), '#6d8fa6'); g.addColorStop(1, '#4b6478'); }
    else { g.addColorStop(0, '#ffb347'); g.addColorStop(sp(32), '#ff6a2a'); g.addColorStop(sp(88), '#d8431f'); g.addColorStop(1, '#a8301c'); }
    ctx.beginPath(); ctx.moveTo(0, bot + 2);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, wave(x));
    ctx.lineTo(W, bot + 2); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    // slow glowing blobs inside the lava
    if (!frozen && bot - y0 > 24) {
      ctx.fillStyle = 'rgba(255,214,120,0.18)';
      for (let i = 0; i < 7; i++) {
        const bx = ((i * 157 + t * (12 + i * 3)) % (W + 80)) - 40, by = y0 + 16 + ((i * 37) % 40) + Math.sin(t * 0.8 + i) * 4;
        if (by < bot) { ctx.beginPath(); ctx.ellipse(bx, by, 26 + (i % 3) * 8, 5, 0, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    // crest
    let crest = frozen ? '#c8f1ff' : '#ffe28a';
    if (frozen && st.freezeT < 1 && Math.floor(t * 8) % 2 === 0) crest = '#ffb347';   // thaw warning
    ctx.strokeStyle = crest; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) { const y = wave(x) + 1.5; if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    if (frozen) {   // cracks in the crust
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
      for (const cx of [120, 350, 610, 840]) {
        const y = wave(cx) + 3;
        ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + 6, y + 10); ctx.lineTo(cx - 3, y + 20); ctx.lineTo(cx + 5, y + 32); ctx.lineTo(cx - 1, y + 42); ctx.stroke();
      }
    }
    // bubbles and embers
    for (const b of st.bubbles) {
      const by = y0 + b.d;
      if (by > bot + 6) continue;
      ctx.fillStyle = '#ffcf6b'; circle(b.x, by, b.r); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; circle(b.x - b.r * 0.35, by - b.r * 0.35, b.r * 0.35); ctx.fill();
    }
    for (const e of st.embers) {
      ctx.globalAlpha = clamp(e.life / e.max, 0, 1); ctx.fillStyle = e.col;
      ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
    }
    ctx.globalAlpha = 1;
  },
  hud() {
    const st = G.mst, M = MODES.lava, big = hudBig();
    if (!st.tall) return;
    // the lava below the screen: a glow along the bottom edge that brightens as it nears, and how far ("Lava 3 m")
    const below = st.lavaY - (st.camY + H);
    if (below > 0 && G.mode === 'play') {
      const near = clamp(1 - below / 300, 0, 1), frozen = st.freezeT > 0;
      const gh = 18 + 26 * near, g = ctx.createLinearGradient(0, H - gh, 0, H);
      g.addColorStop(0, frozen ? 'rgba(170,225,255,0)' : 'rgba(255,120,40,0)');
      g.addColorStop(1, frozen ? 'rgba(170,225,255,' + (0.3 + 0.4 * near) + ')' : 'rgba(255,110,40,' + (0.35 + 0.5 * near) + ')');
      ctx.fillStyle = g; ctx.fillRect(0, H - gh, W, gh);
      const m = Math.max(1, Math.round(below / T)), s = 'Lava ' + m + ' m below', fs = big ? 18 : 13, ph = big ? 28 : 22;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const pw = ctx.measureText(s).width + (big ? 40 : 32), px = pill(W / 2, H - ph - 6, pw, ph, 'center');
      ctx.fillStyle = frozen ? '#c8f1ff' : '#ff8a3d';
      const ax = px + (big ? 15 : 12), ay = H - 6 - ph / 2;
      ctx.beginPath(); ctx.moveTo(ax - 5, ay - 3); ctx.lineTo(ax + 5, ay - 3); ctx.lineTo(ax, ay + 5); ctx.closePath(); ctx.fill();
      text(s, px + pw / 2 + 6, ay + 0.5, fs, frozen ? '#c8f1ff' : '#ffcf6b', 'center', 'body');
    }
    // one status pill, top centre: the most important lava news
    let msg = null, icon = null, shake = 0;
    if (G.mode === 'play' && G.introT <= 0) {
      if (st.beatT > 0) msg = 'Hot toes! Back to the checkpoint';
      else if (st.paused) msg = 'Lava paused — move to go!';
      else if (st.breatherT > 0) msg = 'Phew! The lava takes a breather';
      else if (st.freezeT > 0) { msg = 'Frozen ' + Math.ceil(st.freezeT); icon = 'snow'; }
      else if (st.warned) { msg = 'Rumble!'; shake = reduceMotion ? 0 : 1; }
      else if (st.waitingFor >= 0 && !(cpuSolo() && cpuOn(st.waitingFor))) msg = NAMES[st.waitingFor] + ', still there? The lava waits for you'; // (1-player: the computer standing still is waiting for you, not gone)
      else if (st.startT > 0) msg = 'Here comes the lava!';
    }
    if (msg) {
      const fs = big ? 20 : 14, h = big ? 32 : 24, y = big ? 8 : 14;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const tw = ctx.measureText(msg).width, iw = icon ? fs + 6 : 0, w = tw + iw + 30;
      const px = pill(W / 2, y, w, h, 'center');
      const dx = shake ? Math.round(Math.sin(G.clock * 60)) : 0, dy = shake ? Math.round(Math.cos(G.clock * 47)) : 0;
      if (icon) {   // a little snowflake
        const sx = px + 15 + fs / 2, sy = y + h / 2, s = fs * 0.45;
        ctx.strokeStyle = '#c8f1ff'; ctx.lineWidth = big ? 2.4 : 1.6; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.moveTo(sx - Math.cos(a) * s, sy - Math.sin(a) * s); ctx.lineTo(sx + Math.cos(a) * s, sy + Math.sin(a) * s); }
        ctx.stroke(); ctx.lineCap = 'butt';
      }
      text(msg, px + 15 + iw + tw / 2 + dx, y + h / 2 + 0.5 + dy, fs, st.beatT > 0 ? '#ffb38a' : st.warned && !icon ? '#ffcf6b' : icon ? '#c8f1ff' : C.paper, 'center', 'body');
    }
    // the climb strip on the right edge: checkpoints, the lava, how high Pip and Bo are
    const sx = W - (big ? 16 : 12), sy0 = big ? 92 : 56, sy1 = H - (big ? 56 : 44), span = st.spawnFeet - st.topFeet;
    const at = feet => sy1 - (sy1 - sy0) * clamp((st.spawnFeet - feet) / span, 0, 1);
    ctx.fillStyle = 'rgba(23,25,29,0.55)'; rr(sx - 4, sy0 - 4, 8, sy1 - sy0 + 8, 4); ctx.fill();
    const ly = at(st.lavaY);
    ctx.fillStyle = st.freezeT > 0 ? '#9fe8ff' : '#ff7a35'; rr(sx - 3, ly, 6, Math.max(0, sy1 + 3 - ly), 3); ctx.fill();
    for (let z = 1; z < st.cps.length; z++) { const y = at(M.cpFeet(st.cps[z])); ctx.fillStyle = st.cps[z].lit ? C.gold : 'rgba(255,255,255,0.6)'; ctx.fillRect(sx - 6, y - 1, 12, 2); }
    ctx.fillStyle = C.gold; M.star(sx, sy0 - 10, 5, 2.2); ctx.fill();
    for (const p of G.players) { const y = at(p.alive ? p.y + st.camY + p.h : M.cpFeet({ r: st.cp[p.id].r })); ctx.fillStyle = PCOL[p.id]; circle(sx + (p.id ? 3 : -3), y, big ? 5 : 4); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke(); }
    // hint bubbles above the players
    for (const p of G.players) {
      const h = st.hints[p.id];
      if (!h || !p.alive || G.mode !== 'play') continue;
      const a = clamp(Math.min(h.t, h.life - h.t) / 0.2, 0, 1);
      const fs = big ? 20 : 12;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const tw = ctx.measureText(h.text).width + (big ? 22 : 16), th = fs + (big ? 14 : 10);
      const hs = M.headStack(p), px = p.x + p.w / 2, cx = clamp(px, tw / 2 + 4, W - tw / 2 - 4);
      const by = Math.max(th + 6, hs.bubbleBottom);
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[p.id]; ctx.lineWidth = 2;
      rr(cx - tw / 2, by - th, tw, th, th / 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px - 5, by - 1); ctx.lineTo(px + 5, by - 1); ctx.lineTo(px, by + 5); ctx.closePath(); ctx.fill();
      text(h.text, cx, by - th / 2 + 0.5, fs, C.ink, 'center', 'body');
      if (h.group) {   // and a bouncing arrow over the first step
        const gr = h.group;
        let tc = gr.cells[0];
        for (const cl of gr.cells) if (cl.r > tc.r || (cl.r === tc.r && Math.abs(cl.c * T + 15 - px) < Math.abs(tc.c * T + 15 - px))) tc = cl;
        const ax = tc.c * T + T / 2, ay = tc.r * T - st.camY - 6 - (reduceMotion ? 0 : Math.abs(Math.sin(G.clock * 7)) * 6), s = big ? 1.4 : 1;
        ctx.fillStyle = PCOL[gr.holder]; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ax - 4 * s, ay - 14 * s); ctx.lineTo(ax + 4 * s, ay - 14 * s); ctx.lineTo(ax + 4 * s, ay - 7 * s); ctx.lineTo(ax + 9 * s, ay - 7 * s);
        ctx.lineTo(ax, ay); ctx.lineTo(ax - 9 * s, ay - 7 * s); ctx.lineTo(ax - 4 * s, ay - 7 * s); ctx.closePath(); ctx.stroke(); ctx.fill();
      }
      ctx.restore();
    }
    // the hot-toes flash
    if (st.flashT > 0 && !reduceMotion) { ctx.fillStyle = 'rgba(255,120,50,' + (0.35 * st.flashT / 0.35) + ')'; ctx.fillRect(0, 0, W, H); }
  },
  stats() {
    const st = G.mst, tot = st.ouches, time = G.time;
    const mmss = s => { const r = Math.round(s); return Math.floor(r / 60) + ':' + String(r % 60).padStart(2, '0'); };
    const floors = st.floorT.concat([time - st.floorStart]);
    MODES.lava.nearDone(st, 0); MODES.lava.nearDone(st, 1);
    const who = st.closest[0] <= st.closest[1] ? 0 : 1, cl = st.closest[who];
    const closest = cl >= 999 ? 'The lava never even got close. Cool!' : cl < 0.5 ? 'Closest call: ' + NAMES[who] + '’s toes touched the lava!'
      : cl < 40 ? 'Closest call: ' + NAMES[who] + ', ' + Math.round(cl) + ' px from the lava!'
      : 'Never closer than ' + Math.round(cl) + ' px to the lava. Cool!';
    const words = tot === 0 ? 'Not one toe toasted!' : tot <= 3 ? 'Warm toes, cool heads!' : 'Hot stuff, and you made it together!';
    const height = st.climbed + (G.mode === 'play' ? 0 : st.towerRows || 0);
    return [
      { label: 'Lava ouches', values: st.ouch.slice() },
      { label: 'Buttons pressed', values: st.presses.slice() },
      { label: 'Ice pops', value: st.ices },
      closest,
      'Towers: ' + floors.map(mmss).join(' · ') + ' · Height climbed: ' + height + ' m',
      words,
    ];
  },
};
Sfx.extra.lavaPress = function (pitch) { this.tone(520 * pitch, 0.05, 'square', 0.04); this.tone(780 * pitch, 0.09, 'triangle', 0.04, null, 0.04); };
Sfx.extra.lavaBlock = function () { const n = Math.min(12, (G.mst && G.mst.popN) || 0); this.tone(392 * Math.pow(2, n / 12), 0.07, 'triangle', 0.045); };
Sfx.extra.lavaReady = function (pitch) { [784, 988, 1175].forEach((f, i) => this.tone(f * pitch, 0.09, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.lavaBlink = function () { this.tone(700, 0.03, 'square', 0.02); this.tone(700, 0.03, 'square', 0.02, null, 0.12); };
Sfx.extra.lavaFade = function () { this.tone(520, 0.12, 'triangle', 0.035, 260); };
Sfx.extra.lavaSizzle = function () { this.tone(1400, 0.3, 'sawtooth', 0.018, 300); this.tone(90, 0.35, 'square', 0.03, 50, 0.03); };
Sfx.extra.lavaHot = function () { this.tone(990, 0.04, 'square', 0.02); this.tone(990, 0.04, 'square', 0.02, null, 0.09); };
Sfx.extra.lavaStart = function () { this.tone(110, 0.45, 'sawtooth', 0.035, 165); this.tone(70, 0.5, 'triangle', 0.06, 55, 0.05); };
Sfx.extra.lavaRumble = function () { [0, 0.07, 0.14, 0.21, 0.28].forEach((d, i) => this.tone(75 - i * 5, 0.09, 'square', 0.04, 50, d)); };
Sfx.extra.lavaSurge = function () { this.tone(120, 0.6, 'sawtooth', 0.04, 260); this.tone(60, 0.6, 'triangle', 0.07, 90); };
Sfx.extra.lavaFreeze = function () { [1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.05)); this.tone(2637, 0.35, 'sine', 0.02, 1319, 0.15); };
Sfx.extra.lavaThaw = function () { this.tone(330, 0.3, 'sine', 0.04, 660); };
Sfx.extra.lavaStar = function (pitch) { this.tone(880 * pitch, 0.08, 'triangle', 0.05); this.tone(1320 * pitch, 0.1, 'triangle', 0.04, null, 0.06); };
Sfx.extra.lavaHatch = function () { this.play('crumble'); [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, null, 0.15 + i * 0.07)); };
Sfx.extra.lavaCheck = function (pitch) { this.tone(660 * pitch, 0.07, 'triangle', 0.045); this.tone(990 * pitch, 0.1, 'triangle', 0.045, null, 0.06); };
Sfx.extra.lavaPopBack = function (pitch) { this.tone(500 * pitch, 0.14, 'sine', 0.05, 1100 * pitch); };
Sfx.extra.lavaBreather = function () { [784, 659, 523, 392].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.045, null, i * 0.11)); };
Sfx.extra.lavaBubble = function () { this.tone(170 + MODES.lava.rand() * 90, 0.05, 'sine', 0.012, 330); };
Sfx.extra.lavaNope = function (pitch) { this.tone(240 * pitch, 0.07, 'square', 0.03, 180 * pitch); };
Sfx.extra.lavaBoing = function (pitch) { this.tone(260 * pitch, 0.16, 'triangle', 0.05, 780 * pitch); this.tone(520 * pitch, 0.08, 'sine', 0.03, 1040 * pitch, 0.1); };
Sfx.extra.lavaBloop = function (pitch) { this.tone(330 * pitch, 0.12, 'sine', 0.045, 520 * pitch); this.tone(390 * pitch, 0.1, 'sine', 0.03, 620 * pitch, 0.13); };
/* ===== end of MODES.lava ===== */
