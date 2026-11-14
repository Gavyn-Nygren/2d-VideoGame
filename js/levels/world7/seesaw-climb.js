/* Pip & Bo - Level 7-2 Seesaw Climb (team). */
'use strict';

/* ===== 7-2 Seesaw Climb (mode 'seesaw', World 7 Castle Quest, team) =====
   One player sits on the low end of a seesaw, the other jumps on the high end: BOING, the sitter flies up.
   Map markers (parsed by seesawInitFloor and turned into '.' or '#' in G.level.grid; the level def is never changed):
     S seesaw pivot (the beam spans 5 cells centred on it and rests on the row below)
     n lift slab at its top stop (a run of cells = its width)   m the same lift's bottom stop (solid floor, same columns)
     Y lever (touch it)   B bell (touch it in flight)   $ gem   D drawbridge cell   Z wall step (slides out when all bells ring)
   Room key seesaw: { saws: { 'c,r': { tilt: -1|1, kick: vx, goal: feetY, top: feetY, aim: perchIndex } }, levers: { 'c,r': 'lift c,r' | 'bridge' },
     perches: [[c0, c1, r, magnetPx?]], cps: [[c0, c1, r, pipCol, boCol]], pumpHint, spring, bellNoteY, hmax, indoor, deco: { windows, banners, torches, gate, rose, far, moat, flags } }
   A saw's goal is the feet height its flights should reach; top is the feet height of the floor's best jump-off ledge (hints). */
const SEESAW = {
  half: 75, rise: 24, pivotH: 24,     // beam: 150 px, ends +-24 px around the pivot (low end on the pit floor)
  zone: 10,                           // |x - pivot| < zone = middle (no effect)
  hTip: 30, hTipHop: 12, hMin: 50,    // a walk-off must drop 30 px to flip it (walking in from the pit lip is ~20 px), any hop (>= 12 px) flips it; launches under 50 px fizzle
  dropBase: 30, dropGain: 1.0,        // drop from solid footing: H = 30 + h
  bounceGain: 0.75, bounceMin: 120,   // landing from a seesaw flight: H = 0.75 h; bounces under 120 px fizzle (a chain settles after ~3 bounces)
  pump: 75, pumpEarly: 0.2, pumpLate: 0.2,
  hmax: 420, catchBelow: 120, catchT: 0.7,
  flipT: 0.1, tipT: 0.35, homeT: 1.5,
  liftDown: 200, liftUp: 160, liftRide: 0.4, liftReturn: 1.0,
  magnetX: 48, magnetV: 110, funnelDamp: 3000,
  dropMagX: 72, dropMagV: 150, dropMagH: 130,   // (review) the drop funnel's pull reaches 72 px past its band (from the up side or beyond the tip only),
                                      //   and only for a real drop (from 130+ px above the beam: not a hop off the pit lip)
  spring: 30, springMax: 150, springNear: 160, springX: 80, // bell rooms: each near miss (head 0-160 px under an unrung bell, within 80 px sideways) adds 30 px to footing drops, up to 150
  springLate: 50, springLateMax: 200, springLateX: 120, // once the bells came down: any flight topping out under an unrung bell (within 120 px sideways) adds 50, up to 200
  springOver: 30,                     // springs never lift a launch more than 30 px past what rings the lowest unrung bell (the gem stays a super)
  aid: 35, aidMax: 105, aidOver: 30, aidKickOver: 12, aidSlack: 15, // every other seesaw with a goal: a footing launch topping out > 15 px short of it adds 35 px (up to 105), never past goal + 30 (the kick seesaw: kickMin + 12)
  kickMin: 200,                       // a kick seesaw throws only launches with H >= 200 (weaker ones go straight up)
  bellW: 56, bellH: 30, promptT: 0.35,
  bellLowerT: 25, bellLower: 30,      // a bell still unrung after 25 s in the room slides 30 px lower (once)
  leverW: 30, leverH: 40,
  sparkT: 0.5, bridgeT: 0.4, stepT: 0.25, stepGap: 0.1, // lever spark to the lift / bridge, bridge swing, wall steps sliding out (staggered)
  hopT: 1.0, idleT: 20, idleAgain: 10, idlePartner: 5, nudgeShow: 2.6, hintGap: 8,
  wallRows: 5, wallSlide: 170,        // (review) the raised drawbridge is a solid wall 5 tiles tall until it comes down; its top is no ledge (you slide off onto the tower)
  aimV: 165, aimAcc: 900,             // (review) a saw with 'aim': a flight that will top out above that perch drifts toward it while rising (no ◀ ▶ held)
  headHopV: 545, headHintGap: 6,      // (review) a jump off a partner's head is a 77 px hop (lower than a jump from the floor below), and none while
                                      //   the partner is in the air (no boosts); a blocked press gets a 'Use the seesaw!' float at most every 6 s
};
const SEESAW_GREEN = '#5fd36a', SEESAW_BRONZE = '#b98a2a', SEESAW_GEM = '#7ff0ff', SEESAW_IRON = '#46425a';
let seesawFloorN = 0, seesawBg = null, seesawBellK = 1;   // floor counter (backdrop cache key), the backdrop cache, the bell pitch for the next ring
function seesawSurf(s, x, tilt) {          // beam surface y at x (tilt: +1 = right end down)
  const t = tilt === undefined ? s.tilt : tilt, dx = clamp(x - s.cx, -SEESAW.half, SEESAW.half);
  return s.py + t * SEESAW.rise * dx / SEESAW.half;
}
function seesawHmax() { return (G.level.def.seesaw && G.level.def.seesaw.hmax) || SEESAW.hmax; }
// the bottom of the first tile above (x, y) that something can hang from (stone, brick or a plank)
function seesawCeil(st, x, y) {
  const c = clamp(Math.floor(x / T), 0, COLS - 1);
  for (let r = Math.floor(y / T) - 1; r >= 0; r--) { const ch = st.grid0[r][c]; if (ch === '#' || ch === 'P') return (r + 1) * T; if (ch === '=') return r * T + 11; }
  return 0;
}
function seesawInitFloor(st, L) {
  const def = L.def, cfg = def.seesaw || {}, grid = L.grid;
  st.floorN = ++seesawFloorN; st.cfg = cfg; st.indoor = !!cfg.indoor; st.deco = cfg.deco || {};
  st.saws = []; st.lifts = []; st.levers = []; st.bells = []; st.gems = []; st.steps = [];
  st.bridge = { cells: [], state: 'none', t: 0, hx: 0, hy: 0, len: 0 };
  st.fx = []; st.pops = []; st.rings = []; st.stars = []; st.sparks = []; st.lockPops = []; st.splash = [];
  st.spring = 0; st.bellT = 0; st.bellsLow = false; st.stepsOut = false; st.stepsT = 0; st.floorStart = G.time;
  st.missRun = 0; st.hintAt = -99; st.trail = [0, 0]; st.cpSeen = [false, false];
  const runs = ch => { const out = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] === ch && !(c > 0 && grid[r][c - 1] === ch)) { let e = c; while (e + 1 < COLS && grid[r][e + 1] === ch) e++; out.push({ r, c0: c, c1: e }); } return out; };
  const ns = runs('n');
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = grid[r][c];
    if (ch === 'S') {
      const sc = (cfg.saws || {})[c + ',' + r] || {}, tilt = sc.tilt || -1, py = (r + 1) * T - SEESAW.pivotH;
      const goalH = sc.kick ? SEESAW.kickMin : sc.goal != null ? py - SEESAW.rise - sc.goal : 0;
      st.saws.push({ c, r, cx: c * T + T / 2, py, tilt, target: tilt, home: tilt, prev: tilt, speed: 1 / SEESAW.flipT, kick: sc.kick || 0, flash: 0, launches: 0,
        idleT: 0, thrown: 0, goal: sc.goal, goalH, top: sc.top, aim: sc.aim, aid: 0, aidShow: 0, wob: 0, wobT: 9, seat: 0 });
    }
    else if (ch === 'Y') st.levers.push({ c, r, x: c * T + T / 2, y: (r + 1) * T, pulled: false, link: (cfg.levers || {})[c + ',' + r] || 'bridge', t: 0, pullT: 9, near: 0 });
    else if (ch === 'B') st.bells.push({ x: c * T + T / 2, y: r * T + T / 2, y0: r * T + T / 2, rung: false, swing: 0, lowT: null, ringT: 9 });
    else if (ch === '$') st.gems.push({ x: c * T + T / 2, y: r * T + T / 2, got: false, ph: (c * 7 + r * 3) % 6 });
    else if (ch === 'D') st.bridge.cells.push({ c, r });
    else if (ch === 'Z') st.steps.push({ c, r, delay: 0, out: false });
    if ('SYB$DZn'.includes(ch)) grid[r][c] = '.';
    else if (ch === 'm') grid[r][c] = '#';     // a lift's bottom stop is solid floor: the slab lies flush on it (no hole when the lift is up)
  }
  st.grid0 = grid.map(row => row.slice());
  // lifts: each run of 'n' is a slab at its top stop; the 'm' run in the same columns is its bottom stop
  const ms = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (def.map[r][c] === 'm') ms.push({ c, r });
  for (const n of ns) {
    const bot = ms.filter(m => m.c >= n.c0 && m.c <= n.c1).reduce((a, m) => Math.max(a, m.r), n.r);
    const x0 = n.c0 * T, x1 = (n.c1 + 1) * T, yTop = n.r * T;
    st.lifts.push({ key: n.c0 + ',' + n.r, x0, x1, yTop, yBot: bot * T, y: yTop, prev: yTop, state: 'locked', rideT: 0, emptyT: 0, unlockT: 0,
      pulleyX: (x0 + x1) / 2, pulleyY: yTop - 18, ceil: seesawCeil(st, (x0 + x1) / 2, yTop - 18) });
  }
  for (const b of st.bells) b.ceil = seesawCeil(st, b.x, b.y);
  const bc = st.bridge.cells;
  if (bc.length) {
    const c0 = Math.min(...bc.map(b => b.c)), c1 = Math.max(...bc.map(b => b.c));
    Object.assign(st.bridge, { state: 'up', hx: (c1 + 1) * T, hy: bc[0].r * T, len: (c1 - c0 + 1) * T, upLen: SEESAW.wallRows * T, wall: [], ax: (c1 + 1) * T + 8, ay: bc[0].r * T - 2 * T - 8 });
    // (review) while it is up, the raised deck is a solid wall at the hinge column, 5 tiles tall (drawn that tall too): no running jump
    // from the pillar, and no rider carried by a jumping partner, gets over the moat without a catapult throw
    for (let r = bc[0].r - SEESAW.wallRows; r < bc[0].r; r++) if (grid[r][c1] === '.') { grid[r][c1] = 'P'; L.blockCol[r][c1] = C.plank; st.bridge.wall.push({ r, c: c1 }); }
  }
  // wire ends for each lever: the lift's pulley, or the raised bridge's top
  for (const lv of st.levers) {
    if (lv.link.startsWith('lift ')) { const l = st.lifts.find(x => x.key === lv.link.slice(5)); lv.to = l ? { x: l.pulleyX, y: l.pulleyY } : null; lv.lift = l || null; }
    else lv.to = bc.length ? { x: st.bridge.hx - 6, y: st.bridge.hy - st.bridge.upLen + 6 } : null;
  }
  // wall steps slide out from the bottom row up
  const rows = [...new Set(st.steps.map(z => z.r))].sort((a, b) => b - a);
  for (const z of st.steps) z.delay = rows.indexOf(z.r) * SEESAW.stepGap;
  st.saws.forEach(s => { s.prev = s.tilt; });
  st.pl = [0, 1].map(k => { const p = G.players[k], f = p.y + p.h; return { prevFeet: f, prevX: p.x, apex: f, prevVy: 0, rose: false,
    fromFlight: false, on: null, lastSaw: null, lastSawT: -9, lastJump: -9, pump: null, flying: false, flyTop: 0, flight: null,
    lastIn: G.time, nudgeAt: 0, nudgeUntil: 0, hopT: 0, groundFeet: f }; });
}
function seesawFloat(st, x, y, text, col, size) { st.fx.push({ x, y, text, col, t: 0, size: size || 14 }); }
function seesawPop(st, x, y, text, col, size) { st.pops.push({ x, y, text, col, t: 0, size }); }
// the spring help a footing launch from this saw gets (floor 3 bell springs + the per-saw kid aid)
function seesawAided(st, s, H) {
  if (st.spring > 0) {
    const un = st.bells.filter(b => !b.rung), low = un.length ? Math.max(...un.map(b => b.y)) : 0;
    const ring = s.py - SEESAW.rise - (low + SEESAW.bellH / 2 + PH);   // the H whose flight just touches that bell's box with the head
    H = un.length ? Math.max(H, Math.min(H + st.spring, ring + SEESAW.springOver)) : H + st.spring;
  }
  if (s.aid > 0 && s.goalH > 0) H = Math.max(H, Math.min(H + s.aid, s.goalH + (s.kick ? SEESAW.aidKickOver : SEESAW.aidOver)));
  return H;
}
function seesawLaunch(st, q, s, endTop, H, pumped, side, dropper, from) {
  const P = st.pl[q.id], feet = q.y + q.h, apexY = endTop - H;
  q.vy = -Math.sqrt(2 * PHYS.g * Math.max(12, feet - apexY));
  q.jumping = false; q.grounded = false; q.coyote = 0; q.jumpBuf = 0; q.pendingJump = false; q.offT = 0.1;
  let thrown = false;
  if (s.kick && side === Math.sign(s.kick)) {
    if (H >= SEESAW.kickMin) { q.vx = s.kick; q.carryVx = s.kick; s.thrown = 0.6; thrown = true; Sfx.play('seesawThrow'); }
    else seesawFloat(st, q.x + q.w / 2, endTop - 46, 'Higher!', PCOL[q.id], 16);
  }
  const D = dropper ? st.pl[dropper.id] : null;
  P.fromFlight = true; P.on = null; P.flying = true; P.flyTop = feet;
  P.flight = { s, foot: !from, H, pumped, kickSide: !!s.kick && side === Math.sign(s.kick), thrown, dropper: dropper ? dropper.id : -1,
    takeoff: D ? D.groundFeet : 0, rose: D ? D.rose : false };
  P.pump = pumped ? null : { until: G.time + SEESAW.pumpLate, endTop, H, s, side };
  st.stats.launches[q.id]++;
  if (pumped) st.stats.supers[q.id]++;
  st.lastLaunch = { id: q.id, H, pumped, t: G.time, apexY };
  s.launches++;
  // juice: stretch the flyer, squash the dropper, wobble the beam, a BOING pop, dust, a shock ring, rumble
  const x = q.x + q.w / 2;
  q.sx = 0.6; q.sy = 1.5;
  if (dropper) { dropper.sx = 1.5; dropper.sy = 0.6; rumble(dropper.id, 0.5, 0.2, 90); st.rings.push({ x: dropper.x + dropper.w / 2, y: dropper.y + dropper.h, t: 0, col: '#ffffff' }); }
  rumble(q.id, pumped ? 0.5 : 0.2, pumped ? 0.8 : 0.6, pumped ? 180 : 140);
  puff(x, feet, 8, 'rgba(255,255,255,0.9)');
  s.wob = Math.min(1, 0.45 + H / 600); s.wobT = 0;
  seesawPop(st, x, feet - 40, pumped ? 'SUPER!' : 'BOING!', pumped ? C.gold : PCOL[q.id], pumped ? 30 : H > 300 ? 27 : 22);
  if (pumped) seesawSuperFx(st, q);
  Sfx.play('seesawBoing', q.id); Sfx.play('seesawWhump'); if (pumped) Sfx.play('seesawSuper', q.id);
}
function seesawSuperFx(st, q) { burst(q.x + q.w / 2, q.y + q.h, C.gold, 14); st.trail[q.id] = 0.4; }
// a player lands on a seesaw beam: launch, tip or nothing
function seesawLand(st, p, s, h) {
  const P = st.pl[p.id], dx = p.x + p.w / 2 - s.cx, side = Math.abs(dx) < SEESAW.zone ? 0 : Math.sign(dx);
  const upSide = -s.target;
  if (!side || side !== upSide) { P.fromFlight = false; return; }
  if (h < (P.rose ? SEESAW.hTipHop : SEESAW.hTip)) { P.fromFlight = false; return; } // stepping on gently does nothing
  s.target = side; s.speed = 1 / SEESAW.flipT; s.flash = 0.25;
  const q = other(p), Q = st.pl[q.id];
  const qdx = q.x + q.w / 2 - s.cx, downTop = s.py + SEESAW.rise; // the end that was down (q's end) is at its low position now
  let sitter = false;
  if (q.alive && Math.sign(qdx) === -side && Math.abs(qdx) >= SEESAW.zone && Math.abs(qdx) <= SEESAW.half + 6) {
    const qf = q.y + q.h;
    if (Q.on === s) sitter = true;
    else if (!q.grounded && q.vy > -700 && qf >= downTop - SEESAW.catchBelow && qf <= downTop + 2 && Q.lastSaw === s && G.time - Q.lastSawT <= SEESAW.catchT) sitter = true;   // a sitter who jumped off this end a moment ago (pump) still counts
  }
  const from = P.fromFlight;
  P.fromFlight = false;
  if (!sitter) { Sfx.play('seesawClunk'); return; }
  let H = from ? SEESAW.bounceGain * h : SEESAW.dropBase + SEESAW.dropGain * h;
  if (H < (from ? SEESAW.bounceMin : SEESAW.hMin) && !(G.time - Q.lastJump <= SEESAW.pumpEarly && H >= SEESAW.hMin)) { Sfx.play('seesawClunk'); puff(q.x + q.w / 2, q.y + q.h, 3, 'rgba(255,255,255,0.7)'); return; }   // a tired little bounce: the beam flips, nobody flies
  if (!from) H = seesawAided(st, s, H);   // springs help drops from solid footing, never bounces (a bounce chain must settle)
  const pumped = G.time - Q.lastJump <= SEESAW.pumpEarly;
  if (pumped) H += SEESAW.pump;
  H = Math.min(H, seesawHmax());
  st.stats.drops[p.id]++;
  seesawLaunch(st, q, s, s.py - SEESAW.rise, H, pumped, -side, p, from);
}
// a flight topped out: springs for next time, and a hint after two short ones in a row
function seesawApex(st, p, P) {
  const f = P.flight, cfg = st.cfg, feet = p.y + p.h, s = f && f.s;
  if (!f || !f.foot || !s) return;
  let short = false;
  if (cfg.spring && st.bells.length) {
    // bell rooms: a flight that tops out under an unrung bell tightens the springs
    const late = st.bellsLow, dx = late ? SEESAW.springLateX : SEESAW.springX;
    const near = st.bells.find(b => !b.rung && Math.abs(p.x + p.w / 2 - b.x) < dx && p.y > b.y + SEESAW.bellH / 2 && (late || p.y - (b.y + SEESAW.bellH / 2) <= SEESAW.springNear));
    const sMax = late ? SEESAW.springLateMax : SEESAW.springMax, sStep = late ? SEESAW.springLate : SEESAW.spring;
    if (near && st.spring < sMax) { st.spring = Math.min(sMax, st.spring + sStep); s.aidShow = 1; seesawFloat(st, near.x, near.y + 34, 'Springs tighter!', C.gold); Sfx.play('seesawCreak'); }
    short = st.bells.some(b => !b.rung) && st.bells.every(b => b.rung || p.y - (b.y + SEESAW.bellH / 2) > 120 || Math.abs(p.x + p.w / 2 - b.x) > 120);
  } else if (s.goalH > 0 && (s.kick ? f.kickSide && !f.thrown : feet > s.goal + SEESAW.aidSlack)) {
    short = true;
    if (s.aid < SEESAW.aidMax) { s.aid = Math.min(SEESAW.aidMax, s.aid + SEESAW.aid); s.aidShow = 1; seesawFloat(st, s.cx, s.py - 44, 'Springs tighter!', C.gold); Sfx.play('seesawCreak'); }
  }
  st.missRun = short ? st.missRun + 1 : 0;
  if (st.missRun >= 2 && G.time - st.hintAt > SEESAW.hintGap && f.dropper >= 0 && s.top) {
    const d = G.players[f.dropper], msg = f.takeoff > s.top + 6 ? 'Jump from the top step!' : !f.rose ? 'Jump off, don’t walk off!' : null;
    if (msg && d.alive) { seesawFloat(st, d.x + d.w / 2, d.y - 34, msg, C.gold, 16); st.hintAt = G.time; st.missRun = 0; Sfx.play('seesawHint'); }
  }
}
// mode-owned platforms (seesaw beams, lift slabs): land from above, ride along, never block from below/sides
function seesawPlatforms(st) {
  const list = [];
  st.saws.forEach(s => list.push({ obj: s, x0: s.cx - SEESAW.half, x1: s.cx + SEESAW.half, now: x => seesawSurf(s, x), was: x => seesawSurf(s, x, s.prev), saw: s }));
  st.lifts.forEach(l => list.push({ obj: l, x0: l.x0, x1: l.x1, now: () => l.y, was: () => l.prev, lift: l }));
  return list;
}
function seesawResolve(st) {
  const plats = seesawPlatforms(st);
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!p.alive) { P.on = null; continue; }
    const feet = p.y + p.h, cx = p.x + p.w / 2, pcx = P.prevX + p.w / 2;
    let best = null, bestY = Infinity;
    for (const pl of plats) {
      if (!(p.x + 4 < pl.x1 && p.x + p.w - 4 > pl.x0)) continue;
      const sNow = pl.now(cx), sWas = pl.was(pcx), sticky = P.on === pl.obj;
      const tol = sticky ? 6 : 2;
      if (p.vy < -1) continue;                         // jumping up through it
      if (P.prevFeet > sWas + tol) continue;          // was below it
      if (feet < sNow - (sticky ? 7 : 0.5)) continue; // still above it (not landed yet)
      if (sNow < bestY) { bestY = sNow; best = pl; }
    }
    if (!best) { P.on = null; continue; }
    const y0 = p.y, landed = P.on !== best.obj;
    moveY(p, bestY - p.h - p.y, true);
    const dy = p.y - y0;
    if (Math.abs(p.y + p.h - bestY) > 1) { P.on = null; continue; } // blocked by a ceiling
    p.vy = 0; p.grounded = true; p.tileGround = true; p.onOneWay = false; p.onPartner = false; p.jumping = false;
    p.coyote = PHYS.coyote;
    // a partner standing on this player's head rides along
    const o = other(p);
    if (o.alive && dy !== 0 && Math.abs(o.y + o.h - y0) < 2 && o.x < p.x + p.w && o.x + o.w > p.x) moveY(o, dy, true);
    const h = bestY - P.apex;
    P.on = best.obj;
    if (best.saw) { P.lastSaw = best.saw; P.lastSawT = G.time; }
    if (landed) {
      P.flying = false;
      if (best.saw) seesawLand(st, p, best.saw, h);
      else P.fromFlight = false;
      if (h > 60) { puff(cx, bestY, 5, 'rgba(255,255,255,0.75)'); Sfx.play('seesawThud', p.id); p.sx = 1.25; p.sy = 0.78; }
    }
  }
}
function seesawSawStep(st, dt) {
  for (const s of st.saws) {
    s.prev = s.tilt;
    // nobody on it and nobody flying: it creaks back to its resting side
    const busy = G.players.some(p => p.alive && (st.pl[p.id].on === s || st.pl[p.id].flying));
    if (busy || s.target === s.home) s.idleT = 0;
    else if ((s.idleT = (s.idleT || 0) + dt) >= SEESAW.homeT) { s.target = s.home; s.speed = 1 / SEESAW.tipT; s.idleT = 0; Sfx.play('seesawCreak'); }
    s.tilt = approach(s.tilt, s.target, 2 * s.speed * dt);
    s.flash = Math.max(0, s.flash - dt);
    s.wobT += dt; s.aidShow = Math.max(0, s.aidShow - dt);
    s.thrown = Math.max(0, s.thrown - dt);
    // the seat ring shows on an empty low end while somebody is near
    const sitter = G.players.some(p => st.pl[p.id].on === s && Math.sign(p.x + p.w / 2 - s.cx) === s.target);
    const near = G.players.some(p => p.alive && Math.abs(p.x + p.w / 2 - s.cx) < 200 && Math.abs(p.y + p.h - s.py) < 200);
    s.seat = approach(s.seat, !sitter && near && Math.abs(s.tilt - s.target) < 0.01 ? 1 : 0, dt * 4);
  }
}
function seesawLiftStep(st, dt) {
  for (const l of st.lifts) {
    l.prev = l.y;
    if (l.state === 'locked') continue;
    if (l.state === 'unlock') {   // the lever's spark is on its way to the pulley
      if ((l.unlockT -= dt) <= 0) { l.state = 'down'; st.lockPops.push({ x: (l.x0 + l.x1) / 2, y: l.y + 5, t: 0 }); Sfx.play('seesawUnlock'); Sfx.play('seesawChain'); }
      continue;
    }
    const riders = G.players.filter(p => p.alive && st.pl[p.id].on === l);
    if (l.state === 'bottom') { if (riders.length) { l.rideT += dt; if (l.rideT >= SEESAW.liftRide) { l.state = 'up'; Sfx.play('seesawChain'); } } else l.rideT = 0; }
    else if (l.state === 'top') {
      const needed = G.players.some(p => p.alive && p.y + p.h > l.yTop + 45);
      if (!riders.length && needed) { l.emptyT += dt; if (l.emptyT >= SEESAW.liftReturn) { l.state = 'down'; Sfx.play('seesawChain'); } } else l.emptyT = 0;
    } else if (l.state === 'down') { l.y = Math.min(l.yBot, l.y + SEESAW.liftDown * dt); if (l.y >= l.yBot) { l.state = 'bottom'; l.rideT = 0; Sfx.play('seesawClunk'); } }
    else if (l.state === 'up') { l.y = Math.max(l.yTop, l.y - SEESAW.liftUp * dt); if (l.y <= l.yTop) { l.state = 'top'; l.emptyT = 0; Sfx.play('seesawClunk'); } }
  }
}
function seesawTouch(p, x, y, rw, rh) { return p.alive && rectHit(p, x - rw / 2, y - rh / 2, rw, rh); }
function seesawWallClear(B) { const L = G.level; for (const w of B.wall || []) { L.grid[w.r][w.c] = '.'; L.blockCol[w.r][w.c] = null; } }   // (review) the raised deck's wall
function seesawBridgeDown(st) {
  const L = G.level, B = st.bridge;
  B.state = 'down'; B.t = 0;
  seesawWallClear(B);
  for (const b of B.cells) {
    L.grid[b.r][b.c] = 'P'; L.blockCol[b.r][b.c] = C.plank;
    for (const p of G.players) if (p.alive && rectHit(p, b.c * T, b.r * T, T, T)) { p.y = b.r * T - p.h; p.vy = Math.min(p.vy, 0); }   // never shut a player inside the bridge
  }
  for (let k = 0; k < 12; k++) puff(B.hx - B.len + (k + 0.5) * B.len / 12, B.hy, 2, 'rgba(214,196,170,0.85)');
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.1);
  rumble(0, 0.4, 0.4, 200); rumble(1, 0.4, 0.4, 200);
  Sfx.play('seesawBridgeThud');
}
function seesawThings(st, dt) {
  const L = G.level;
  for (const lv of st.levers) {
    lv.t += dt; lv.pullT += dt;
    lv.near = approach(lv.near, !lv.pulled && G.players.some(p => p.alive && Math.hypot(p.x + p.w / 2 - lv.x, p.y + p.h / 2 - lv.y) < 160) ? 1 : 0, dt * 5);
    if (lv.pulled) continue;
    // (review) a lever needs a seesaw flyer, or a player standing at its height: a partner-stack poking up through a plank only wiggles it
    const touch = p => seesawTouch(p, lv.x, lv.y - SEESAW.leverH / 2 + 2, SEESAW.leverW, SEESAW.leverH);
    const who = G.players.find(p => touch(p) && (st.pl[p.id].flying || p.y + p.h <= lv.y + 4));
    lv.pokeT = Math.max(0, (lv.pokeT || 0) - dt);
    if (!who) { const pk = G.players.find(touch); if (pk && !lv.pokeT) { lv.pokeT = 1.5; Sfx.play('seesawClunk'); seesawFloat(st, lv.x + (lv.x < W / 2 ? 95 : -95), lv.y + 10, 'Fly up from the seesaw!', C.gold); } continue; }
    lv.pulled = true; lv.pullT = 0; st.stats.levers[who.id]++;
    Sfx.play('seesawLever', who.id); rumble(who.id, 0, 0.3, 50); puff(lv.x, lv.y - 14, 5, 'rgba(255,255,255,0.8)');
    if (lv.to) st.sparks.push({ lv, t: 0 });
    if (lv.lift) { if (lv.lift.state === 'locked') { lv.lift.state = 'unlock'; lv.lift.unlockT = SEESAW.sparkT; } }
    else if (lv.link === 'bridge' && st.bridge.state === 'up') { st.bridge.state = 'spark'; st.bridge.t = 0; }
  }
  const B = st.bridge;
  if (B.state === 'spark' && (B.t += dt) >= SEESAW.sparkT) { B.state = 'swing'; B.t = 0; Sfx.play('seesawBridge'); seesawWallClear(B); }   // the wall goes as the deck swings away
  else if (B.state === 'swing' && (B.t += dt) >= SEESAW.bridgeT) seesawBridgeDown(st);
  else if (B.state === 'down') B.t += dt;
  for (const sp of st.sparks) sp.t += dt;
  st.sparks = st.sparks.filter(sp => sp.t < SEESAW.sparkT + 0.3);
  if (st.bells.some(b => !b.rung) && (st.bellT += dt) >= SEESAW.bellLowerT && !st.bellsLow) {
    st.bellsLow = true; for (const b of st.bells) if (!b.rung) { b.y0 = b.y; b.lowT = 0; }
    seesawFloat(st, (st.bells[0].x + st.bells[st.bells.length - 1].x) / 2, st.cfg.bellNoteY || st.bells[0].y + 64, 'The bells came down a bit!', C.gold, 16); Sfx.play('seesawChain'); Sfx.play('seesawCreak');   // (review) the float sits below the sign
  }
  st.bells.forEach((b, i) => {
    if (b.lowT != null && b.lowT < 1) { b.lowT = Math.min(1, b.lowT + dt); b.y = b.y0 + SEESAW.bellLower * b.lowT; }
    b.swing *= Math.pow(0.2, dt); b.ringT += dt;
    // (build) the first ring needs a seesaw flyer, so a stacked jump can't reach the lowered bells; re-rings are any touch
    const who = G.players.find(p => (b.rung || st.pl[p.id].flying) && seesawTouch(p, b.x, b.y, SEESAW.bellW, SEESAW.bellH));
    b.pokeT = Math.max(0, (b.pokeT || 0) - dt);
    const poke = !who && !b.rung && G.players.find(p => seesawTouch(p, b.x, b.y, SEESAW.bellW, SEESAW.bellH));
    if (poke && !b.pokeT) { b.pokeT = 1.5; b.swing = 0.3; Sfx.play('seesawClunk'); seesawFloat(st, b.x, b.y + 34, 'Fly up from the seesaw!', C.gold); }
    if (who && (!b.rung || Math.abs(b.swing) < 0.2)) {
      const first = !b.rung;
      if (first) { b.rung = true; st.stats.bells[who.id]++; burst(b.x, b.y, C.gold, 16); rumble(0, 0, 0.3, 80); rumble(1, 0, 0.3, 80); seesawPop(st, b.x, b.y + 34, 'DING!', C.gold, 24); }
      b.swing = 1; b.ringT = 0; seesawBellK = i ? 1.26 : 1; Sfx.play('seesawBell');
      for (let k = 0; k < (first ? 3 : 1); k++) st.stars.push({ x: b.x + (k - 1) * 12, y: b.y + 6, vx: (k - 1) * 30 + (i ? 20 : -20), vy: -60 - k * 15, t: 0, life: 1.2, note: true });
    }
  });
  if (st.bells.length && st.bells.every(b => b.rung) && !st.stepsOut) { st.stepsOut = true; st.stepsT = 0; st.spring = 0; Sfx.play('seesawSteps'); }   // (build) springs end with the bells, so the gem stays super-only
  if (st.stepsOut) {
    st.stepsT += dt;
    for (const z of st.steps) {
      if (z.out || st.stepsT < z.delay + SEESAW.stepT) { if (!z.puffed && st.stepsT >= z.delay) { z.puffed = true; puff(z.c * T + T / 2, z.r * T + 6, 3, 'rgba(200,192,214,0.9)'); } continue; }
      z.out = true; L.grid[z.r][z.c] = '=';
    }
  }
  for (const gm of st.gems) {
    if (gm.got) continue;
    const who = G.players.find(p => seesawTouch(p, gm.x, gm.y, 22, 22));
    if (who) { gm.got = true; st.stats.gems[who.id]++; st.gemTotal++; Sfx.play('seesawGem', who.id); burst(gm.x, gm.y, SEESAW_GEM, 16); rumble(who.id, 0, 0.4, 60); seesawPop(st, gm.x, gm.y - 18, 'Gem!', SEESAW_GEM, 20); }
  }
}
// kid assists: a dropper falling near an up end drifts onto it; a flyer near a perch edge drifts onto it (only with no ◀ ▶ held)
function seesawMagnet(st, dt) {
  for (const p of G.players) {
    if (!p.alive || p.grounded) continue;
    const cx = p.x + p.w / 2, feet = p.y + p.h, P = st.pl[p.id], held = p.input.left || p.input.right;
    if (p.vy > 0 && !P.flying) {
      // drop funnel: falling over (or just beside) a seesaw's up end, you slow down sideways and drift onto it
      for (const s of st.saws) {
        // (review) at the tip the band is inset by half a body + 3 px, so a dropper damped at its edge never overlaps the pit lip
        const up = -s.target, ins = p.w / 2 + 3, z0 = s.cx + up * (SEESAW.zone + 6), z1 = s.cx + up * (SEESAW.half - ins), lo = Math.min(z0, z1), hi = Math.max(z0, z1);
        const top = seesawSurf(s, (lo + hi) / 2);
        if (feet >= top || feet < top - 260) continue;
        if (cx >= lo && cx <= hi) p.vx = approach(p.vx, 0, SEESAW.funnelDamp * dt);
        else if (!held && top - P.apex > SEESAW.dropMagH && (cx - s.cx) * up > SEESAW.zone && Math.min(Math.abs(cx - lo), Math.abs(cx - hi)) < SEESAW.dropMagX) p.vx = approach(p.vx, (cx < lo ? 1 : -1) * SEESAW.dropMagV, 1200 * dt);   // never pulls from the low side (a hopping sitter stays put)
      }
    }
    const zones = st.cfg.perches || [];
    if (P.flying && !held) zones.forEach((z, zi) => {
      // (review) a perch may widen its magnet for flights from the saw aimed at it
      const top = z[2] * T, x0 = z[0] * T, x1 = (z[1] + 1) * T, mx = z[3] && P.flight && P.flight.s.aim === zi ? z[3] : SEESAW.magnetX;
      if (feet < top - 4 && feet > top - 200 && cx > x0 - mx && cx < x1 + mx && (cx < x0 + 12 || cx > x1 - 12)) {
        const tx = cx < x0 + 12 ? x0 + 24 : x1 - 24, want = Math.sign(tx - cx) * SEESAW.magnetV * 1.5;
        if (Math.sign(p.vx) !== Math.sign(want) || Math.abs(p.vx) < Math.abs(want)) p.vx = approach(p.vx, want, 1600 * dt);   // never slows a flyer already heading in
      }
    });
    // (review) an aimed saw: a rising flight that will top out above its perch drifts toward the perch's near edge (kids who don't steer)
    const f = P.flight, az = f && f.s.aim != null && zones[f.s.aim];
    if (az && P.flying && !held && !f.thrown && p.vy < 0 && feet - p.vy * p.vy / (2 * PHYS.g) < az[2] * T - 4) {
      const ax0 = az[0] * T, ax1 = (az[1] + 1) * T, tx = Math.abs(cx - ax0) < Math.abs(cx - ax1) ? ax0 + 26 : ax1 - 26;
      p.vx = approach(p.vx, clamp((tx - cx) / Math.max(0.12, -p.vy / PHYS.g), -SEESAW.aimV, SEESAW.aimV), SEESAW.aimAcc * dt);
    }
  }
}
// short-lived effects: floats, pops, shock rings, star and note particles, the super star trail
function seesawFxStep(st, dt) {
  for (const f of st.fx) f.t += dt;
  st.fx = st.fx.filter(f => f.t < 1.2);
  for (const f of st.pops) f.t += dt;
  st.pops = st.pops.filter(f => f.t < 0.75);
  for (const r of st.rings) r.t += dt;
  st.rings = st.rings.filter(r => r.t < 0.35);
  for (const l of st.lockPops) l.t += dt;
  st.lockPops = st.lockPops.filter(l => l.t < 0.7);
  for (const s of st.splash) s.t += dt;
  st.splash = st.splash.filter(s => s.t < 0.6);
  for (const p of G.players) {
    if (st.trail[p.id] <= 0) continue;
    st.trail[p.id] -= dt;
    if (!p.alive) { st.trail[p.id] = 0; continue; }
    st.trailAcc = (st.trailAcc || 0) + dt;
    while (st.trailAcc >= 1 / 60) { st.trailAcc -= 1 / 60; for (let k = 0; k < 2; k++) st.stars.push({ x: p.x + 4 + MODES.seesaw.rand() * (p.w - 8), y: p.y + p.h - MODES.seesaw.rand() * 8, vx: (MODES.seesaw.rand() - 0.5) * 40, vy: 30 + MODES.seesaw.rand() * 40, t: 0, life: 0.5 }); }
  }
  for (const s of st.stars) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.note) s.vy += 20 * dt; }
  st.stars = st.stars.filter(s => s.t < s.life);
  if (st.stars.length > 160) st.stars.splice(0, st.stars.length - 160);
}
// door-ledge rails: a grounded player can't walk off the end of a door ledge (a jump or ▼ through the plank still leaves it)
// rail = [x, feetY, dir, liftKey, whenLiftTop]: blocks moving past x in direction dir; a lift rail only counts while its lift is (or is not) at the top
function seesawRailOn(st, rl) {
  if (!rl[3]) return true;
  if (rl[3] === 'steps') return st.stepsOut && st.steps.every(z => z.out);
  const l = st.lifts.find(x => x.key === rl[3]);
  return !!l && (l.state === 'top' && Math.abs(l.y - l.yTop) < 0.5) === !!rl[4];
}
function seesawRails(st) {
  const rails = st.cfg.rails || [];
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!p.alive || !P.wasGround || p.vy < 0 || p.dropT > 0) continue;
    for (const rl of rails) {
      if (Math.abs(P.prevFeet - rl[1]) > 1 || !seesawRailOn(st, rl)) continue;
      const [x, fy, dir] = rl;
      if (dir > 0 ? (P.prevX + p.w > x + 0.5 || p.x + p.w <= x) : (P.prevX < x - 0.5 || p.x >= x)) continue;
      p.x = dir > 0 ? x - p.w : x; p.vx = dir > 0 ? Math.min(p.vx, 0) : Math.max(p.vx, 0);
      if (p.y + p.h > fy) { p.y = fy - p.h; p.vy = 0; }
      p.grounded = true; p.tileGround = true; p.coyote = PHYS.coyote;
    }
  }
}
// the "Your turn!" nudge and the "hop!" bubble (just timers; drawn in drawTop)
function seesawPrompts(st, dt) {
  for (const p of G.players) {
    const P = st.pl[p.id], q = other(p), Q = st.pl[q.id], i = p.input;
    if (i.left || i.right || i.jump || i.down || i.up) P.lastIn = G.time;
    if (G.time - P.lastIn >= SEESAW.idleT && G.time - Q.lastIn < SEESAW.idlePartner && G.time >= P.nudgeAt && p.alive && !seesawCpu(p.id)) {
      P.nudgeUntil = G.time + SEESAW.nudgeShow; P.nudgeAt = G.time + SEESAW.idleAgain; Sfx.play('seesawNudge', p.id);
    }
    if (G.time - P.lastIn < 0.05) P.nudgeUntil = 0;
    // standing on a raised end of a beam at rest: hop to tip it down (and, with the partner on the low end, launch them;
    // (review) that is also where a dropper who stepped on gently from the pit lip ends up)
    const s = P.on;
    let alone = false;
    if (s && s.cx !== undefined && p.grounded) {
      const d = p.x + p.w / 2 - s.cx;
      alone = Math.abs(d) >= 20 && Math.sign(d) === -s.target && Math.abs(s.tilt - s.target) < 0.01;
    }
    P.hopT = alone ? P.hopT + dt : 0;
  }
}
// a fall into the floor-4 moat makes a splash on the way down
function seesawMoat(st) {
  if (!st.deco.moat || !st.bridge.cells.length) return;
  const B = st.bridge, x0 = B.hx - B.len, x1 = B.hx, wy = H - 22;
  for (const p of G.players) {
    const P = st.pl[p.id], cx = p.x + p.w / 2, feet = p.y + p.h;
    if (p.alive && cx > x0 && cx < x1 && P.prevFeet < wy && feet >= wy) {
      st.splash.push({ x: cx, t: 0 });
      for (let k = 0; k < 14; k++) G.particles.push({ x: cx + (MODES.seesaw.rand() - 0.5) * 20, y: wy, vx: (MODES.seesaw.rand() - 0.5) * 220, vy: -150 - MODES.seesaw.rand() * 260, life: 0.6, max: 0.6, col: k % 3 ? '#8fd3ff' : '#ffffff', size: 3 + MODES.seesaw.rand() * 3, grav: 900, kind: 'dot' });
      Sfx.play('seesawSplash');
    }
  }
}
// (review) the top of the raised drawbridge is no perch: whoever lands there (a low catapult throw) slides off onto the tower,
// and can't jump from it (so it is no step up to the gem)
function seesawWallTop(st, dt) {
  const B = st.bridge;
  if (!B.wall || !B.wall.length || B.state === 'down') return;
  const x0 = B.wall[0].c * T, top = Math.min(...B.wall.map(w => w.r)) * T;
  for (const p of G.players) {
    if (!p.alive || !p.grounded || Math.abs(p.y + p.h - top) > 1.5 || p.x >= x0 + T || p.x + p.w <= x0) continue;
    st.pl[p.id].wallT = G.time;
    moveX(p, SEESAW.wallSlide * dt);   // toward the tower (the hinge side)
    if (p.vx < 0) p.vx = 0;
  }
}
MODES.seesaw = {
  rand: Math.random,
  setup(st, L) {
    st.stats = { launches: [0, 0], supers: [0, 0], drops: [0, 0], levers: [0, 0], bells: [0, 0], gems: [0, 0], best: 0, bestWho: 0, floorT: [] };
    st.gemTotal = 0;
    st.gemCount = (L.def.rooms || [L.def]).reduce((n, r) => n + r.map.join('').split('$').length - 1, 0);   // 4
    seesawInitFloor(st, L);
  },
  room(k, L) { const st = G.mst; st.stats.floorT.push(G.time - st.floorStart); seesawInitFloor(st, L); },
  pre(dt) {
    const st = G.mst;
    for (const p of G.players) {
      const P = st.pl[p.id];
      // (review) only a seesaw sends anyone up: a jump off a partner's head (or in the coyote moment after stepping off one) is a
      // low hop, never higher than a jump from the floor the partner stands on, and there is none while the partner is in the air
      // (so no carrier-jumps-then-rider-jumps boost). A blocked press gets a hint now and then.
      if (p.alive && p.onPartner && !p.tileGround) { const o = other(p); P.headT = G.time; P.headAir = !(o.grounded && o.tileGround && o.vy >= 0); }
      if ((p.pendingJump || p.jumpBuf > 0) && G.time - (P.wallT ?? -9) <= PHYS.coyote + 0.02) { p.pendingJump = false; p.jumpBuf = 0; }   // no jump off the raised bridge's top
      if ((p.pendingJump || p.jumpBuf > 0) && !p.tileGround && G.time - (P.headT ?? -9) <= PHYS.coyote + 0.02) {
        if (!P.headAir) P.hopCap = G.time;   // the jump fires in control(); step() caps it to a hop this same tick
        else {
          if (p.pendingJump && G.time - (P.headHint ?? -99) >= SEESAW.headHintGap) { P.headHint = G.time; seesawFloat(st, p.x + p.w / 2, p.y - 30, 'Use the seesaw!', C.gold, 15); Sfx.play('seesawClunk'); }
          p.pendingJump = false; p.jumpBuf = 0;
        }
      }
      if (p.pendingJump) {
        P.lastJump = G.time;
        if (P.pump && G.time <= P.pump.until && p.vy < 0) {   // late super: still rising, re-aim higher
          const H = Math.min(P.pump.H + SEESAW.pump, seesawHmax());
          p.vy = -Math.sqrt(2 * PHYS.g * Math.max(12, p.y + p.h - (P.pump.endTop - H)));
          const ps = P.pump.s;
          if (ps.kick && P.pump.side === Math.sign(ps.kick) && H >= SEESAW.kickMin && P.pump.H < SEESAW.kickMin) { p.vx = ps.kick; p.carryVx = ps.kick; ps.thrown = 0.6; if (P.flight) P.flight.thrown = true; Sfx.play('seesawThrow'); }
          st.stats.supers[p.id]++; st.lastLaunch.pumped = true; st.lastLaunch.H = H; if (P.flight) { P.flight.pumped = true; P.flight.H = H; }
          P.pump = null; p.pendingJump = false; Sfx.play('seesawSuper', p.id);
          rumble(p.id, 0.5, 0.8, 180); seesawSuperFx(st, p); seesawPop(st, p.x + p.w / 2, p.y - 20, 'SUPER!', C.gold, 30);
        }
      }
      if (P.pump && G.time > P.pump.until) P.pump = null;
      // (build) a thrown flyer keeps the kick speed while rising, so a bump on the pit wall can't stall the throw; ◀ still brakes
      const f = P.flight;
      if (f && f.thrown && P.flying && p.vy < 0 && !p.input.left && p.vx * Math.sign(f.s.kick) < Math.abs(f.s.kick)) { p.vx = f.s.kick; p.carryVx = f.s.kick; }
    }
    seesawMagnet(st, dt);
  },
  step(dt) {
    const st = G.mst, cfg = st.cfg;
    seesawSawStep(st, dt);
    seesawLiftStep(st, dt);
    seesawResolve(st);
    seesawRails(st);
    seesawWallTop(st, dt);
    seesawMoat(st);
    for (const p of G.players) {
      const P = st.pl[p.id], feet = p.y + p.h;
      if (!p.alive) continue;
      if (P.hopCap === G.time && p.vy < -SEESAW.headHopV) p.vy = -SEESAW.headHopV;   // (review) a jump off a standing partner's head is a hop
      if (p.grounded) { if (!P.on) { P.fromFlight = false; P.flying = false; } P.apex = feet; P.rose = false; P.groundFeet = feet; if (!P.flying) P.flight = null; }
      else { P.apex = Math.min(P.apex, feet); if (p.vy < -50) P.rose = true; }
      if (P.flying && (P.flyTop - feet) / T > st.stats.best) { st.stats.best = (P.flyTop - feet) / T; st.stats.bestWho = p.id; }   // highest boing, in tiles
      if (P.flying && P.prevVy < 0 && p.vy >= 0) seesawApex(st, p, P);
      P.prevVy = p.vy;
      // checkpoints: standing anywhere on a checkpoint area (its top row r, or down in a pit up to 2 rows deep) moves your respawn there
      if (p.grounded) for (const z of cfg.cps || []) {
        const cx = p.x + p.w / 2;
        if (feet <= (z[2] + 2) * T + 1 && cx >= z[0] * T && cx < (z[1] + 1) * T) {
          G.spawnPts[p.id] = { x: z[3 + p.id] * T + (T - p.w) / 2, y: z[2] * T - p.h };
          if (!st.cpSeen[p.id]) { st.cpSeen[p.id] = true; seesawFloat(st, cx, p.y - 30, 'Checkpoint!', C.gold, 15); Sfx.play('seesawCheck', p.id); }
        }
      }
      P.prevFeet = p.y + p.h; P.prevX = p.x; P.wasGround = p.grounded;
    }
    seesawThings(st, dt);
    seesawPrompts(st, dt);
    seesawFxStep(st, dt);
  },
  onRespawn(p) { const P = G.mst.pl[p.id]; P.prevVy = 0; P.pump = null; P.prevFeet = p.y + p.h; P.prevX = p.x; P.apex = p.y + p.h; P.on = null; P.flying = false; P.fromFlight = false; P.flight = null; G.mst.trail[p.id] = 0; },
  draw() { seesawDraw(G.mst); },
  drawTop() { seesawDrawTop(G.mst); },
  hud() {
    const st = G.mst, big = hudBig(), fs = big ? 20 : 14, h = big ? 40 : 28;
    const tm = fmtTime(G.time), gm = st.gemTotal + '/' + st.gemCount;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, gw = ctx.measureText(gm).width, icon = fs * 0.9, gap = fs * 1.1;
    const w = tw + gap + icon + fs * 0.35 + gw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, C.paper, 'left', 'body');
    seesawGemShape(x0 + 15 + tw + gap + icon / 2, cy, icon / 20, st.gemTotal ? 1 : 0.45);
    text(gm, x0 + 15 + tw + gap + icon + fs * 0.35, cy, fs, st.gemTotal ? SEESAW_GEM : C.paper, 'left', 'body');
  },
  stats() {
    const s = G.mst.stats;
    return [
      { label: 'Launches', values: s.launches.slice() },
      ...(s.supers[0] + s.supers[1] > 0 ? [{ label: 'Super launches', values: s.supers.slice() }] : []),   // (review, C6) no all-zero tile
      { label: 'Levers & bells', values: [s.levers[0] + s.bells[0], s.levers[1] + s.bells[1]] },
      { label: 'Gems', value: G.mst.gemTotal + ' of ' + G.mst.gemCount },
      s.best > 0 ? 'Highest boing: ' + NAMES[s.bestWho] + ', ' + Math.round(s.best) + ' tiles!' : 'No boings yet? Try again together!',
    ];
  },
};

/* ---------- Seesaw Climb drawing ---------- */
function seesawGemShape(x, y, k, alpha) {
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.globalAlpha *= alpha == null ? 1 : alpha;
  ctx.fillStyle = '#1f7f9e'; ctx.beginPath(); ctx.moveTo(0, -11.5); ctx.lineTo(9.5, -2); ctx.lineTo(0, 11.5); ctx.lineTo(-9.5, -2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = SEESAW_GEM; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(8, -2); ctx.lineTo(0, 10); ctx.lineTo(-8, -2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c8fbff'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(8, -2); ctx.lineTo(0, -2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3fc6e0'; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(8, -2); ctx.lineTo(0, 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(-1, -8); ctx.lineTo(-5, -2); ctx.closePath(); ctx.fill();
  ctx.restore();
}
// the static backdrop of a floor (castle wall with window holes, banners, gate, torch brackets, block mortar, crenels,
// the far castle) is painted once into an offscreen canvas the size of the game canvas, then copied every frame
function seesawBackdrop(st) {
  const key = st.floorN + ':' + canvas.width + 'x' + canvas.height;
  if (!seesawBg || seesawBg.key !== key) {
    let cv = seesawBg && seesawBg.cv;
    if (!cv) cv = document.createElement('canvas');
    cv.width = canvas.width; cv.height = canvas.height;
    const g = cv.getContext('2d');
    g.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    g.clearRect(0, 0, W, H);
    seesawPaintBackdrop(g, st);
    seesawBg = { key, cv };
  }
  ctx.drawImage(seesawBg.cv, 0, 0, W, H);
}
function seesawArch(path, x, y, w, h) { const r = w / 2; path.moveTo(x, y + h); path.lineTo(x, y + r); path.arc(x + r, y + r, r, Math.PI, 0); path.lineTo(x + w, y + h); path.closePath(); }
function seesawPaintBackdrop(g, st) {
  const grid = st.grid0, deco = st.deco;
  const solid = (c, r) => r < 0 || r >= ROWS || c < 0 || c >= COLS || grid[r][c] === '#' || grid[r][c] === 'P';
  const air = new Path2D();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS;) {
    if (solid(c, r)) { c++; continue; }
    let e = c; while (e + 1 < COLS && !solid(e + 1, r)) e++;
    air.rect(c * T, r * T, (e - c + 1) * T, T); c = e + 1;
  }
  if (st.indoor) {
    // the hall's back wall, with the windows cut out (the sky shows through)
    const wall = new Path2D(air);
    for (const w of deco.windows || []) seesawArch(wall, w[0], w[1], w[2], w[3]);
    if (deco.rose) { wall.moveTo(deco.rose[0] + deco.rose[2], deco.rose[1]); wall.arc(deco.rose[0], deco.rose[1], deco.rose[2], 0, Math.PI * 2); }
    g.save(); g.clip(wall, 'evenodd');
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#8e88a5'); gr.addColorStop(0.55, '#a39db8'); gr.addColorStop(1, '#b3adc6');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let j = 0; j < H / 15; j++) for (let i = -1; i < W / 30 + 1; i++) {   // stone courses, 30 x 15
      const x = i * 30 + (j % 2) * 15, y = j * 15, hh = hash(i + 50, j + 50) % 7;
      if (hh === 0) { g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x + 1, y + 1, 28, 13); }
      else if (hh === 1) { g.fillStyle = 'rgba(40,30,70,0.06)'; g.fillRect(x + 1, y + 1, 28, 13); }
    }
    g.strokeStyle = 'rgba(52,44,82,0.2)'; g.lineWidth = 1.5; g.beginPath();
    for (let j = 0; j <= H / 15; j++) { g.moveTo(0, j * 15); g.lineTo(W, j * 15); for (let i = -1; i < W / 30 + 1; i++) { const x = i * 30 + (j % 2) * 15; g.moveTo(x, j * 15); g.lineTo(x, j * 15 + 15); } }
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1; g.beginPath();
    for (let j = 0; j <= H / 15; j++) { g.moveTo(0, j * 15 + 1.5); g.lineTo(W, j * 15 + 1.5); }
    g.stroke();
    // a soft shadow under the ceiling and along the floor
    const sh = g.createLinearGradient(0, 30, 0, 110); sh.addColorStop(0, 'rgba(30,24,58,0.28)'); sh.addColorStop(1, 'rgba(30,24,58,0)');
    g.fillStyle = sh; g.fillRect(0, 30, W, 80);
    g.restore();
    // window frames, sills and the light falling in
    for (const w of deco.windows || []) seesawPaintWindow(g, w[0], w[1], w[2], w[3]);
    if (deco.rose) seesawPaintRose(g, deco.rose[0], deco.rose[1], deco.rose[2]);
    if (deco.gate) seesawPaintGate(g, ...deco.gate);
    for (const b of deco.banners || []) seesawPaintBanner(g, b[0], b[1], b[2], b[3]);
    for (const t of deco.torches || []) seesawPaintTorch(g, t[0], t[1]);
  } else if (deco.far) {
    // outdoors: a far castle on the hills, behind everything solid
    g.save(); g.clip(air);
    seesawPaintFarCastle(g);
    g.restore();
  }
  // castle blocks: mortar courses on the stone tiles (below the cap of a top surface)
  g.save();
  g.strokeStyle = 'rgba(30,24,52,0.24)'; g.lineWidth = 1.5; g.beginPath();
  const hi = new Path2D();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (grid[r][c] !== '#') continue;
    const x = c * T, y = r * T, top = r > 0 && !solid(c, r - 1) ? 9 : 0, odd = r % 2;
    if (top < 15) { g.moveTo(x, y + 15); g.lineTo(x + T, y + 15); hi.rect(x, y + 16, T, 1); }
    const v0 = odd ? 0 : 15, v1 = odd ? 15 : 0;
    g.moveTo(x + v0, y + top); g.lineTo(x + v0, y + 15);
    g.moveTo(x + v1, y + 15); g.lineTo(x + v1, y + 30);
    if (top === 0 && r > 0 && grid[r - 1][c] === '#') { g.moveTo(x, y); g.lineTo(x + T, y); }
  }
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.06)'; g.fill(hi);
  g.restore();
  if (st.saws.length && !st.indoor) seesawPaintCrenels(g, st, solid);
  for (const f of deco.flags || []) seesawPaintFlagPole(g, f[0], f[1]);
}
function seesawPaintWindow(g, x, y, w, h) {
  const r = w / 2;
  // a stone surround
  g.save();
  g.strokeStyle = '#5e5878'; g.lineWidth = 7; g.beginPath(); g.moveTo(x - 1, y + h); g.lineTo(x - 1, y + r); g.arc(x + r, y + r, r + 1, Math.PI, 0); g.lineTo(x + w + 1, y + h); g.stroke();
  g.strokeStyle = '#c9c3da'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 4, y + h); g.lineTo(x - 4, y + r); g.arc(x + r, y + r, r + 4, Math.PI, 0); g.lineTo(x + w + 4, y + h); g.stroke();
  // lead bars
  g.strokeStyle = 'rgba(46,40,70,0.75)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + r, y + 2); g.lineTo(x + r, y + h); g.moveTo(x, y + h * 0.55); g.lineTo(x + w, y + h * 0.55); g.stroke();
  // sill
  g.fillStyle = '#5e5878'; g.fillRect(x - 8, y + h, w + 16, 6); g.fillStyle = '#c9c3da'; g.fillRect(x - 8, y + h, w + 16, 2);
  // light falling in
  const lg = g.createLinearGradient(0, y + h, 0, y + h + 150); lg.addColorStop(0, 'rgba(255,246,214,0.16)'); lg.addColorStop(1, 'rgba(255,246,214,0)');
  g.fillStyle = lg; g.beginPath(); g.moveTo(x, y + h + 6); g.lineTo(x + w, y + h + 6); g.lineTo(x + w + 60, y + h + 150); g.lineTo(x + 40, y + h + 150); g.closePath(); g.fill();
  g.restore();
}
function seesawPaintRose(g, x, y, r) {
  g.save();
  g.strokeStyle = '#5e5878'; g.lineWidth = 8; g.beginPath(); g.arc(x, y, r + 2, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#c9c3da'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r + 6, 0, Math.PI * 2); g.stroke();
  const cols = ['rgba(255,107,74,0.42)', 'rgba(91,149,255,0.42)', 'rgba(255,197,61,0.42)'];
  for (let k = 0; k < 8; k++) { const a0 = k * Math.PI / 4, a1 = a0 + Math.PI / 4; g.fillStyle = cols[k % 3]; g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, a0, a1); g.closePath(); g.fill(); }
  g.strokeStyle = 'rgba(46,40,70,0.8)'; g.lineWidth = 2.5; g.beginPath();
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  g.stroke(); g.beginPath(); g.arc(x, y, r * 0.42, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(255,230,150,0.75)'; g.beginPath(); g.arc(x, y, r * 0.2, 0, Math.PI * 2); g.fill();
  g.restore();
}
function seesawPaintGate(g, x, y, w, h) {
  const r = w / 2;
  g.save();
  // the arch, dark inside, with a raised portcullis showing its spikes
  g.fillStyle = '#3d3854'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + r); g.arc(x + r, y + r, r, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.fill();
  g.save(); g.clip();
  g.fillStyle = 'rgba(255,214,140,0.12)'; g.fillRect(x, y + h - 40, w, 40);
  g.strokeStyle = '#6a6488'; g.lineWidth = 4; g.beginPath();
  const bottom = y + h * 0.42;
  for (let k = 1; k < 6; k++) { const bx = x + k * w / 6; g.moveTo(bx, y); g.lineTo(bx, bottom); }
  for (let k = 0; k < 3; k++) { const by = y + 18 + k * 18; g.moveTo(x, by); g.lineTo(x + w, by); }
  g.stroke();
  g.fillStyle = '#6a6488';
  for (let k = 1; k < 6; k++) { const bx = x + k * w / 6; g.beginPath(); g.moveTo(bx - 4, bottom); g.lineTo(bx, bottom + 9); g.lineTo(bx + 4, bottom); g.fill(); }
  g.restore();
  // the stone arch around it
  g.strokeStyle = '#5e5878'; g.lineWidth = 9; g.beginPath(); g.moveTo(x - 3, y + h); g.lineTo(x - 3, y + r); g.arc(x + r, y + r, r + 3, Math.PI, 0); g.lineTo(x + w + 3, y + h); g.stroke();
  g.strokeStyle = '#c9c3da'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 8, y + h); g.lineTo(x - 8, y + r); g.arc(x + r, y + r, r + 8, Math.PI, 0); g.lineTo(x + w + 8, y + h); g.stroke();
  g.fillStyle = '#c9c3da'; g.beginPath(); g.moveTo(x + r - 7, y - 9); g.lineTo(x + r + 7, y - 9); g.lineTo(x + r + 4, y + 3); g.lineTo(x + r - 4, y + 3); g.closePath(); g.fill();
  g.restore();
}
function seesawPaintBanner(g, x, y, len, k) {
  const col = PCOL[k], dark = PDARK[k], w = 30;
  g.save();
  g.fillStyle = '#5a4630'; g.fillRect(x - w / 2 - 6, y + 4, w + 12, 4);
  g.fillStyle = C.rope; g.beginPath(); g.arc(x - w / 2 - 6, y + 6, 3, 0, Math.PI * 2); g.arc(x + w / 2 + 6, y + 6, 3, 0, Math.PI * 2); g.fill();
  g.fillStyle = dark; g.beginPath(); g.moveTo(x - w / 2, y + 8); g.lineTo(x + w / 2, y + 8); g.lineTo(x + w / 2, y + len); g.lineTo(x, y + len - 10); g.lineTo(x - w / 2, y + len); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.moveTo(x - w / 2 + 3, y + 8); g.lineTo(x + w / 2 - 3, y + 8); g.lineTo(x + w / 2 - 3, y + len - 5); g.lineTo(x, y + len - 14); g.lineTo(x - w / 2 + 3, y + len - 5); g.closePath(); g.fill();
  g.fillStyle = C.gold; g.fillRect(x - w / 2 + 3, y + 13, w - 6, 3);
  // the emblem: Pip's sprout or Bo's round ears
  const ey = y + 8 + (len - 14) * 0.48;
  g.fillStyle = 'rgba(255,255,255,0.9)';
  if (k === 0) { g.beginPath(); g.ellipse(x + 3, ey - 3, 6, 3, -0.5, 0, Math.PI * 2); g.fill(); g.fillRect(x - 1, ey - 2, 2, 9); }
  else { g.beginPath(); g.arc(x, ey + 2, 6, 0, Math.PI * 2); g.arc(x - 6, ey - 4, 3.2, 0, Math.PI * 2); g.arc(x + 6, ey - 4, 3.2, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
function seesawPaintTorch(g, x, y) {
  g.save();
  g.fillStyle = 'rgba(255,190,90,0.10)'; g.beginPath(); g.arc(x, y - 14, 34, 0, Math.PI * 2); g.fill();
  g.fillStyle = SEESAW_IRON; g.fillRect(x - 7, y + 4, 14, 4); g.fillRect(x - 2, y + 4, 4, 12);
  g.fillStyle = '#7a5230'; g.beginPath(); g.moveTo(x - 6, y - 4); g.lineTo(x + 6, y - 4); g.lineTo(x + 3, y + 6); g.lineTo(x - 3, y + 6); g.closePath(); g.fill();
  g.fillStyle = SEESAW_IRON; g.fillRect(x - 7, y - 6, 14, 3);
  g.restore();
}
function seesawPaintFarCastle(g) {
  g.save();
  g.fillStyle = 'rgba(126,141,178,0.55)';
  const tower = (x, base, w, h, roof) => {
    g.fillRect(x, base - h, w, h);
    for (let k = 0; k < w; k += 10) g.fillRect(x + k, base - h - 6, 6, 6);
    if (roof) { g.beginPath(); g.moveTo(x - 4, base - h); g.lineTo(x + w / 2, base - h - roof); g.lineTo(x + w + 4, base - h); g.closePath(); g.fill(); }
  };
  tower(600, 360, 160, 46, 0); tower(590, 360, 34, 96, 40); tower(736, 360, 34, 86, 34); tower(660, 360, 40, 120, 52);
  tower(60, 380, 120, 40, 0); tower(48, 380, 30, 80, 30); tower(158, 380, 30, 72, 28);
  g.strokeStyle = 'rgba(126,141,178,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(680, 188); g.lineTo(680, 170); g.stroke();
  g.fillStyle = 'rgba(255,107,74,0.55)'; g.beginPath(); g.moveTo(681, 170); g.lineTo(694, 175); g.lineTo(681, 180); g.closePath(); g.fill();
  g.restore();
}
function seesawPaintCrenels(g, st, solid) {
  const grid = st.grid0;
  const isLiftFloor = (c, r) => st.lifts.some(l => r * T === l.yBot && c * T >= l.x0 && c * T < l.x1);
  g.save();
  for (let r = 2; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) {
    if (grid[r][c] !== '#' || solid(c, r - 1) || isLiftFloor(c, r)) continue;
    // only tower tops (not pit floors): stone below for at least 3 rows
    if (!(solid(c, r + 1) && solid(c, r + 2))) continue;
    if (st.saws.some(s => Math.abs(c * T + T / 2 - s.cx) <= SEESAW.half + 2 && r * T >= s.py && r * T <= s.py + 2 * T)) continue;
    const x = c * T, y = r * T;
    g.fillStyle = C.stoneEdge; g.fillRect(x + 3, y - 15, 14, 15);
    g.fillStyle = C.stoneLight; g.fillRect(x + 4, y - 14, 12, 14);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 4, y - 14, 12, 3);
  }
  g.restore();
}
function seesawPaintFlagPole(g, x, base) {
  g.save(); g.fillStyle = '#4a3a2a'; g.fillRect(x - 1.5, base - 56, 3, 56); g.fillStyle = C.gold; g.beginPath(); g.arc(x, base - 57, 3, 0, Math.PI * 2); g.fill(); g.restore();
}
function seesawDrawFlag(x, base, k) {
  const wave = reduceMotion ? 0 : Math.sin(G.clock * 5 + x) * 3;
  ctx.fillStyle = PCOL[k]; ctx.beginPath(); ctx.moveTo(x + 1.5, base - 54); ctx.quadraticCurveTo(x + 14, base - 50 + wave, x + 26, base - 46 + wave); ctx.quadraticCurveTo(x + 14, base - 42 + wave, x + 1.5, base - 36); ctx.closePath(); ctx.fill();
}
function seesawDrawTorchFlame(x, y) {
  const f = reduceMotion ? 0 : Math.floor(G.clock * 7 + x) % 2;
  ctx.fillStyle = 'rgba(255,170,70,0.16)'; circle(x, y - 12, f ? 24 : 21); ctx.fill();
  ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.moveTo(x - 6, y - 5); ctx.quadraticCurveTo(x - 7, y - 16, x + (f ? 1 : -1), y - (f ? 25 : 23)); ctx.quadraticCurveTo(x + 7, y - 15, x + 6, y - 5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd25e'; ctx.beginPath(); ctx.moveTo(x - 3, y - 5); ctx.quadraticCurveTo(x - 3, y - 12, x + (f ? -1 : 1), y - 16); ctx.quadraticCurveTo(x + 4, y - 11, x + 3, y - 5); ctx.closePath(); ctx.fill();
}
// a lever's magic wire to what it opens (dotted, faint), and the spark running along it when pulled
function seesawWire(lv) {
  const x0 = lv.x, y0 = lv.y - 22, x1 = lv.to.x, y1 = lv.to.y, d = Math.hypot(x1 - x0, y1 - y0);
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: Math.min(y0, y1) - Math.min(70, d * 0.35) };
}
function seesawQuad(w, t) { const u = 1 - t; return [u * u * w.x0 + 2 * u * t * w.cx + t * t * w.x1, u * u * w.y0 + 2 * u * t * w.cy + t * t * w.y1]; }
function seesawDrawWires(st) {
  for (const lv of st.levers) {
    if (!lv.to) continue;
    const a = lv.pulled ? clamp(1 - (lv.pullT - SEESAW.sparkT) / 0.6, 0, 1) : 0.5;
    if (a <= 0) continue;
    const w = seesawWire(lv);
    ctx.save(); ctx.globalAlpha = a; ctx.setLineDash([3, 6]); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(40,32,70,0.35)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(w.x0, w.y0); ctx.quadraticCurveTo(w.cx, w.cy, w.x1, w.y1); ctx.stroke();
    ctx.strokeStyle = C.rope; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  for (const sp of st.sparks) {
    const w = seesawWire(sp.lv), t = clamp(sp.t / SEESAW.sparkT, 0, 1), fade = clamp(1 - (sp.t - SEESAW.sparkT) / 0.3, 0, 1);
    for (let k = 0; k < 5; k++) {
      const [x, y] = seesawQuad(w, clamp(t - k * 0.04, 0, 1));
      ctx.globalAlpha = fade * (1 - k / 5); ctx.fillStyle = k ? C.gold : '#fff'; circle(x, y, k ? 4 - k * 0.5 : 5); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
function seesawDrawLift(st, l) {
  const cx = l.pulleyX, py = l.pulleyY, locked = l.state === 'locked' || l.state === 'unlock';
  // rope up to where the pulley hangs, the wheel, two chains down to the slab
  ctx.strokeStyle = C.ropeDark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, l.ceil); ctx.lineTo(cx, py - 7); ctx.stroke();
  ctx.fillStyle = SEESAW_IRON; rr(cx - 5, l.ceil, 10, 4, 2); ctx.fill();
  ctx.lineCap = 'round';
  for (const ex of [l.x0 + 7, l.x1 - 7]) {
    const sx = cx + Math.sign(ex - cx) * 6;
    ctx.strokeStyle = '#34304a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(sx, py); ctx.lineTo(ex, l.y); ctx.stroke();
    ctx.strokeStyle = '#b8b5c9'; ctx.lineWidth = 1.6; ctx.setLineDash([3, 3]); ctx.lineDashOffset = -l.y * 0.5; ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
  }
  ctx.save(); ctx.translate(cx, py); ctx.rotate(l.y / 7);
  ctx.fillStyle = '#34304a'; circle(0, 0, 7.5); ctx.fill(); ctx.fillStyle = '#8f8ba6'; circle(0, 0, 5.5); ctx.fill();
  ctx.strokeStyle = '#34304a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
  ctx.restore();
  // the slab: a 10 px plank with iron ends
  const x = l.x0, y = l.y, w = l.x1 - l.x0;
  ctx.fillStyle = C.plankDark; rr(x - 1, y - 1, w + 2, 12, 3); ctx.fill();
  ctx.fillStyle = locked ? '#8d6b4c' : C.plank; ctx.fillRect(x + 1, y, w - 2, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x + 2, y + 1, w - 4, 2);
  ctx.fillStyle = 'rgba(90,50,20,0.3)'; for (let k = 30; k < w; k += 30) ctx.fillRect(x + k - 1, y, 2, 8);
  ctx.fillStyle = SEESAW_IRON; ctx.fillRect(x, y - 1, 5, 11); ctx.fillRect(x + w - 5, y - 1, 5, 11);
  if (locked) seesawPadlock(x + w / 2, y + 5, 1);
}
function seesawPadlock(x, y, a) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.strokeStyle = '#3a3650'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 6, 4.5, Math.PI, 0); ctx.stroke();
  ctx.strokeStyle = '#d9d5e6'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = '#3a3650'; rr(x - 7, y - 7, 14, 11, 2.5); ctx.fill();
  ctx.fillStyle = C.gold; rr(x - 6, y - 6, 12, 9, 2); ctx.fill();
  ctx.fillStyle = '#3a3650'; circle(x, y - 2.5, 1.6); ctx.fill(); ctx.fillRect(x - 0.7, y - 2, 1.4, 3);
  ctx.restore();
}
function seesawDrawBeam(st, s) {
  const xl = s.cx - SEESAW.half, xr = s.cx + SEESAW.half;
  const pitY = s.py + SEESAW.pivotH;
  // the pivot: an iron triangle on the pit floor
  ctx.fillStyle = '#34304a'; ctx.beginPath(); ctx.moveTo(s.cx - 16, pitY + 1); ctx.lineTo(s.cx, s.py - 2); ctx.lineTo(s.cx + 16, pitY + 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6e6a86'; ctx.beginPath(); ctx.moveTo(s.cx - 12, pitY); ctx.lineTo(s.cx, s.py + 3); ctx.lineTo(s.cx + 12, pitY); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.moveTo(s.cx - 12, pitY); ctx.lineTo(s.cx, s.py + 3); ctx.lineTo(s.cx - 3, pitY); ctx.closePath(); ctx.fill();
  // the spring gauge on the pivot
  const fill = st.cfg.spring ? st.spring / (st.bellsLow ? SEESAW.springLateMax : SEESAW.springMax) : s.aid / SEESAW.aidMax;
  if (fill > 0) {
    const gx = s.cx, gy = pitY - 6, pulse = s.aidShow > 0 ? 1 + 0.35 * Math.sin(s.aidShow * Math.PI) : 1;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(28,26,54,0.6)'; ctx.lineWidth = 4 * pulse; ctx.beginPath(); ctx.arc(gx, gy, 8, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 3 * pulse; ctx.beginPath(); ctx.arc(gx, gy, 8, Math.PI, Math.PI + Math.PI * clamp(fill, 0, 1)); ctx.stroke();
  }
  // the beam: a plank with iron caps, and a handle near each end; it wobbles a little after a launch
  const wob = s.wobT < 0.6 && !reduceMotion ? s.wob * Math.exp(-s.wobT * 7) * Math.sin(s.wobT * 38) * 0.07 : 0;
  const ang0 = Math.atan2(SEESAW.rise * s.tilt, SEESAW.half), ang = ang0 + wob, len = SEESAW.half / Math.cos(ang0);
  ctx.save(); ctx.translate(s.cx, s.py); ctx.rotate(ang);
  for (const e of [-1, 1]) {   // handles
    const hx = e * (len - 24);
    ctx.fillStyle = '#34304a'; ctx.fillRect(hx - 2, -13, 4, 13); ctx.fillRect(hx - 6, -15, 12, 4);
    ctx.fillStyle = '#8f8ba6'; ctx.fillRect(hx - 5, -14, 10, 2);
  }
  ctx.fillStyle = C.plankDark; rr(-len - 1, -1.5, 2 * len + 2, 11, 4); ctx.fill();
  ctx.fillStyle = C.plank; ctx.fillRect(-len + 1, 0, 2 * len - 2, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-len + 6, 0.5, 2 * len - 12, 2);
  ctx.fillStyle = 'rgba(110,60,25,0.35)'; for (const gx of [-len * 0.62, -len * 0.18, len * 0.3, len * 0.7]) ctx.fillRect(gx, 3.5, 14, 1.2);
  ctx.fillStyle = SEESAW_IRON; ctx.fillRect(-len - 1, -2, 7, 12); ctx.fillRect(len - 6, -2, 7, 12);
  ctx.fillStyle = '#8f8ba6'; ctx.fillRect(-len, -1, 5, 2); ctx.fillRect(len - 5, -1, 5, 2);
  ctx.fillStyle = '#34304a'; circle(0, 4, 3.2); ctx.fill(); ctx.fillStyle = '#b8b5c9'; circle(0, 4, 1.4); ctx.fill();
  if (s.kick) {   // the catapult: a painted arrow toward the throw, and a red pennant on the kick end
    const k = Math.sign(s.kick);
    ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.beginPath();
    ctx.moveTo(k * 18, 2.2); ctx.lineTo(k * 40, 2.2); ctx.lineTo(k * 40, 0.6); ctx.lineTo(k * 48, 3.6); ctx.lineTo(k * 40, 6.6); ctx.lineTo(k * 40, 5); ctx.lineTo(k * 18, 5); ctx.closePath(); ctx.fill();
    const px = k * (len - 3), wave = reduceMotion ? 0 : Math.sin(G.clock * 7) * 2.5;
    ctx.fillStyle = '#34304a'; ctx.fillRect(px - 1.5, -30, 3, 30);
    ctx.fillStyle = '#ff4f4f'; ctx.beginPath(); ctx.moveTo(px, -30); ctx.quadraticCurveTo(px + k * 10, -27 + wave, px + k * 20, -24 + wave); ctx.quadraticCurveTo(px + k * 10, -21 + wave, px, -18); ctx.closePath(); ctx.fill();
  }
  if (s.flash > 0) { ctx.globalAlpha = s.flash / 0.25; ctx.fillStyle = '#fff'; rr(-len - 1, -1.5, 2 * len + 2, 11, 4); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.restore();
  // the seat ring on an empty low end, and a "land here" chevron over the high end when someone sits
  const low = s.target, at = Math.abs(s.tilt - s.target) < 0.01;
  if (s.seat > 0.01) {
    const x = s.cx + low * 46, y = seesawSurf(s, x);
    ctx.save(); ctx.globalAlpha = s.seat * (0.55 + 0.25 * Math.sin(G.clock * 4));
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y - 1, 15, 4, Math.atan2(SEESAW.rise * s.tilt, SEESAW.half), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  if (at) {
    const sitter = G.players.find(p => p.alive && st.pl[p.id].on === s && p.grounded && Math.sign(p.x + p.w / 2 - s.cx) === low && Math.abs(p.x + p.w / 2 - s.cx) >= SEESAW.zone);
    const dropper = sitter && other(sitter);
    if (sitter && dropper.alive && st.pl[dropper.id].on !== s) {
      const x = s.cx - low * 46, y = seesawSurf(s, x) - 18 - Math.abs(Math.sin(G.clock * 4)) * 6;
      ctx.fillStyle = PDARK[dropper.id]; ctx.beginPath(); ctx.moveTo(x - 10, y - 9); ctx.lineTo(x + 10, y - 9); ctx.lineTo(x, y + 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = PCOL[dropper.id]; ctx.beginPath(); ctx.moveTo(x - 7.5, y - 7.5); ctx.lineTo(x + 7.5, y - 7.5); ctx.lineTo(x, y + 0.5); ctx.closePath(); ctx.fill();
    }
  }
}
function seesawDrawRail(x, fy, dir) {
  const px = x - dir * 4;
  ctx.fillStyle = C.plankDark; rr(px - 3, fy - 21, 6, 21, 2); ctx.fill();
  ctx.fillStyle = C.plank; rr(px - 2, fy - 20, 4, 19, 1.5); ctx.fill();
  ctx.fillStyle = C.gold; circle(px, fy - 21, 3.2); ctx.fill();
  ctx.fillStyle = C.plankDark; ctx.fillRect(dir > 0 ? px - 14 : px, fy - 16, 14, 3);
}
function seesawDrawLever(lv) {
  const f = lv.pulled ? clamp(lv.pullT / 0.2, 0, 1) : 0, ease = 1 - Math.pow(1 - f, 3);
  const a = -0.7 + 1.4 * ease + (lv.pulled && lv.pullT < 0.5 ? Math.sin(lv.pullT * 30) * 0.08 * (1 - lv.pullT / 0.5) : 0)
    + (!lv.pulled && lv.pokeT > 0.9 ? Math.sin(lv.pokeT * 40) * 0.25 * (lv.pokeT - 0.9) / 0.6 : 0);   // poked from below: a wiggle, no pull
  const bx = lv.x, by = lv.y;
  ctx.fillStyle = '#34304a'; rr(bx - 10, by - 7, 20, 7, 2); ctx.fill();
  ctx.fillStyle = '#6e6a86'; rr(bx - 8, by - 6, 16, 3, 1.5); ctx.fill();
  const kx = bx + Math.sin(a) * 20, ky = by - 6 - Math.cos(a) * 20;
  ctx.strokeStyle = '#34304a'; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, by - 6); ctx.lineTo(kx, ky); ctx.stroke();
  ctx.fillStyle = '#2a2640'; circle(kx, ky, 6.2); ctx.fill();
  ctx.fillStyle = lv.pulled ? SEESAW_GREEN : '#ff4f4f'; circle(kx, ky, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(kx - 1.6, ky - 1.6, 1.6); ctx.fill();
  if (lv.near > 0.01) {   // a bobbing "!" while somebody is near an unpulled lever
    const y = by - 52 - Math.abs(Math.sin(G.clock * 4)) * 5, s = hudBig() ? 1.4 : 1;
    ctx.save(); ctx.globalAlpha = lv.near; ctx.translate(bx, y); ctx.scale(s, s);
    ctx.fillStyle = '#2a2640'; circle(0, 0, 10.5); ctx.fill(); ctx.fillStyle = C.gold; circle(0, 0, 9); ctx.fill();
    text('!', 0, 0.5, 15, '#2a2640', 'center');
    ctx.restore();
  }
}
function seesawDrawBell(b, i) {
  const top = b.y - 12, ang = Math.sin(G.time * 12 + i) * 0.4 * b.swing;
  ctx.strokeStyle = C.ropeDark; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(b.x, b.ceil); ctx.lineTo(b.x, top); ctx.stroke();
  ctx.strokeStyle = C.rope; ctx.lineWidth = 1.6; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
  ctx.save(); ctx.translate(b.x, top); ctx.rotate(ang);
  if (b.rung) { const gl = 0.22 + 0.12 * Math.sin(G.clock * 3) + (b.ringT < 0.6 ? 0.3 * (1 - b.ringT / 0.6) : 0); ctx.fillStyle = `rgba(255,215,90,${gl})`; circle(0, 12, 24 + (b.ringT < 0.6 ? 10 * (1 - b.ringT / 0.6) : 0)); ctx.fill(); }
  const body = b.rung ? C.gold : SEESAW_BRONZE, dark = b.rung ? C.goldDark : '#6d4f18';
  ctx.fillStyle = dark; circle(0, 1, 3.6); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-6.5, 2); ctx.quadraticCurveTo(-11, 4, -11, 13); ctx.lineTo(-13.5, 21); ctx.quadraticCurveTo(0, 25.5, 13.5, 21); ctx.lineTo(11, 13); ctx.quadraticCurveTo(11, 4, 6.5, 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-5.5, 3.5); ctx.quadraticCurveTo(-9.5, 5, -9.5, 13); ctx.lineTo(-11.5, 20); ctx.quadraticCurveTo(0, 23.5, 11.5, 20); ctx.lineTo(9.5, 13); ctx.quadraticCurveTo(9.5, 5, 5.5, 3.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-6, 7, 2.5, 11);
  ctx.fillStyle = dark; ctx.fillRect(-10, 16, 20, 2);
  ctx.fillStyle = '#3a2c10'; circle(Math.sin(G.time * 12 + i + 0.8) * 2.5 * b.swing, 22.5, 3); ctx.fill();
  ctx.restore();
}
function seesawDrawStep(z, st) {
  const x = z.c * T, y = z.r * T;
  if (!st.stepsOut) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.strokeRect(x + 2, y + 1, T - 4, 9); ctx.restore();
    return;
  }
  if (z.out) return;   // the framework draws it as a plank now
  const f = clamp((st.stepsT - z.delay) / SEESAW.stepT, 0, 1);
  if (f <= 0) { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.strokeRect(x + 2, y + 1, T - 4, 9); ctx.restore(); return; }
  ctx.save(); ctx.globalAlpha = f; drawPlank(x - 30 * (1 - f), y, z.c, z.r); ctx.restore();
}
function seesawDrawBridge(st) {
  const B = st.bridge;
  if (B.state === 'none') return;
  let a = Math.PI / 2;   // 90 deg = raised against the tower wall, 0 = down across the gap
  if (B.state === 'swing') { const f = clamp(B.t / SEESAW.bridgeT, 0, 1); a = Math.PI / 2 * (1 - f * f); }
  else if (B.state === 'down') a = B.t < 0.25 && !reduceMotion ? -Math.sin(B.t / 0.25 * Math.PI) * 0.04 : 0;
  if (B.state !== 'down') {   // where it will land: a faint dashed outline
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.strokeRect(B.hx - B.len + 2, B.hy + 2, B.len - 4, T - 4); ctx.restore();
  }
  // (review) raised, the deck is as tall as its wall (upLen); it folds to the moat's width as it swings down
  const L = B.len + ((B.upLen || B.len) - B.len) * clamp(a / (Math.PI / 2), 0, 1), endX = B.hx + (-L + 4) * Math.cos(a), endY = B.hy + (-L + 4) * Math.sin(a);
  // chains from the deck's far end up to a ring on the tower
  ctx.lineCap = 'round';
  for (const off of [0, 3]) {
    ctx.strokeStyle = '#34304a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(endX + off, endY + off); ctx.lineTo(B.ax, B.ay); ctx.stroke();
    ctx.strokeStyle = '#b8b5c9'; ctx.lineWidth = 1.4; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.fillStyle = '#34304a'; circle(B.ax, B.ay, 4); ctx.fill(); ctx.fillStyle = '#8f8ba6'; circle(B.ax, B.ay, 2); ctx.fill();
  ctx.save(); ctx.translate(B.hx, B.hy); ctx.rotate(a);
  const rad = 3 + 10 * clamp(a / (Math.PI / 2), 0, 1);   // raised, its top end is rounded (no ledge to stand on: you slide off)
  ctx.fillStyle = C.plankDark; rr(-L, 0, L, T, rad); ctx.fill(); ctx.clip();
  ctx.fillStyle = C.plank; ctx.fillRect(-L + 2, 2, L - 4, T - 5);
  ctx.fillStyle = 'rgba(110,60,25,0.4)'; for (let k = 1; k < L / 15; k++) ctx.fillRect(-L + k * 15 - 1, 2, 2, T - 5);
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(-L + 2, 2, L - 4, 3);
  ctx.fillStyle = SEESAW_IRON; ctx.fillRect(-L + 6, 0, 7, T); ctx.fillRect(-13, 0, 7, T);
  ctx.fillStyle = '#b8b5c9'; for (const bx of [-L + 9.5, -9.5]) for (const by of [6, 15, 24]) { circle(bx, by, 1.4); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = '#34304a'; circle(B.hx, B.hy + 4, 5); ctx.fill(); ctx.fillStyle = '#8f8ba6'; circle(B.hx, B.hy + 4, 2.4); ctx.fill();
}
function seesawDrawGem(gm) {
  const bob = Math.sin(G.clock * 3 + gm.ph) * 2;
  ctx.fillStyle = 'rgba(127,240,255,0.22)'; circle(gm.x, gm.y + bob, 14 + Math.sin(G.clock * 5 + gm.ph) * 2); ctx.fill();
  seesawGemShape(gm.x, gm.y + bob, 1);
  const tw = (G.clock * 0.8 + gm.ph / 6) % 1;
  if (tw < 0.25) { const k = Math.sin(tw / 0.25 * Math.PI); seesawStar(gm.x + 7, gm.y + bob - 8, 5 * k, '#ffffff'); }
}
function seesawStar(x, y, r, col) {
  if (r <= 0) return;
  ctx.fillStyle = col; ctx.beginPath();
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr2 = k % 2 ? r * 0.35 : r; ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  ctx.closePath(); ctx.fill();
}
function seesawDraw(st) {
  if (!st.saws) return;
  const L = G.level, deco = st.deco;
  seesawBackdrop(st);
  seesawDrawWires(st);
  // the backdrop covers what the framework drew before it: signs, planks and the door go back on top
  if (st.indoor) for (const sg of L.def.signs || []) { ctx.font = '17px "Lilita One", "Arial Rounded MT Bold", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(28,26,54,0.55)'; ctx.fillText(sg.text, sg.x, sg.y); }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (L.grid[r][c] === '=') drawPlank(c * T, r * T, c, r);
  if (L.door && st.indoor) drawDoor(L.door);
  for (const t of deco.torches || []) seesawDrawTorchFlame(t[0], t[1] - 4);
  for (const f of deco.flags || []) seesawDrawFlag(f[0], f[1], f[2]);
  for (const l of st.lifts) seesawDrawLift(st, l);
  for (const rl of st.cfg.rails || []) if (seesawRailOn(st, rl)) seesawDrawRail(rl[0], rl[1], rl[2]);
  for (const s of st.saws) seesawDrawBeam(st, s);
  for (const lv of st.levers) seesawDrawLever(lv);
  st.bells.forEach((b, i) => seesawDrawBell(b, i));
  for (const gm of st.gems) if (!gm.got) seesawDrawGem(gm);
  for (const z of st.steps) seesawDrawStep(z, st);
  seesawDrawBridge(st);
  for (const lp of st.lockPops) { const f = lp.t / 0.7; ctx.save(); ctx.translate(lp.x + f * 18, lp.y - 40 * f + 50 * f * f); ctx.rotate(f * 2.4); seesawPadlock(0, 0, 1 - f); ctx.restore(); }
  // speed lines under a fast flyer
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!p.alive || !P.flying || p.vy > -380) continue;
    const a = clamp((-p.vy - 380) / 500, 0, 0.7), x = p.x + p.w / 2, y = p.y + p.h;
    ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
    for (const dx of [-8, 0, 8]) { const l = 16 + Math.abs(dx) * -0.8 + (-p.vy) / 40; ctx.moveTo(x + dx, y + 6 + Math.abs(dx) * 0.5); ctx.lineTo(x + dx, y + 6 + l); }
    ctx.stroke();
  }
}
function seesawBubble(x, y, str, col, scale) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = Math.max(36, ctx.measureText(str).width + 20);
  ctx.fillStyle = 'rgba(28,26,54,0.55)'; rr(-w / 2, -10, w, 22, 11); ctx.fill();
  ctx.fillStyle = col; rr(-w / 2, -12, w, 22, 11); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-5, 9); ctx.lineTo(5, 9); ctx.lineTo(0, 15); ctx.closePath(); ctx.fill();
  text(str, 0, -1, 13, '#fff', 'center', 'body');
  ctx.restore();
}
function seesawOutlined(str, x, y, size, col, font) {
  ctx.font = (font === 'display' ? '' : '700 ') + size + 'px ' + (font === 'display' ? '"Lilita One", "Arial Rounded MT Bold", sans-serif' : '"Atkinson Hyperlegible", system-ui, sans-serif');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.24); ctx.strokeStyle = 'rgba(28,26,54,0.85)'; ctx.strokeText(str, x, y);
  ctx.fillStyle = col; ctx.fillText(str, x, y);
}
function seesawDrawTop(st) {
  if (!st.saws) return;
  const big = hudBig(), k = big ? 1.4 : 1;
  // the moat's front water, so a fall disappears into it
  if (st.deco.moat && st.bridge.cells.length) {
    const B = st.bridge, x0 = B.hx - B.len, wy = H - 22;
    ctx.fillStyle = 'rgba(58,140,206,0.92)'; ctx.beginPath(); ctx.moveTo(x0, H);
    for (let x = 0; x <= B.len; x += 6) ctx.lineTo(x0 + x, wy + Math.sin(x * 0.12 + G.clock * 3) * 2.5);
    ctx.lineTo(x0 + B.len, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(200,236,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x <= B.len; x += 6) ctx[x ? 'lineTo' : 'moveTo'](x0 + x, wy + Math.sin(x * 0.12 + G.clock * 3) * 2.5);
    ctx.stroke();
    for (const s of st.splash) { const f = s.t / 0.6; ctx.strokeStyle = `rgba(255,255,255,${1 - f})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(s.x, wy, 8 + 30 * f, 3 + 6 * f, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  for (const r of st.rings) { const f = r.t / 0.35; ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - f)})`; ctx.lineWidth = 3 * (1 - f) + 1; ctx.beginPath(); ctx.ellipse(r.x, r.y, 10 + 34 * f, 3 + 8 * f, 0, 0, Math.PI * 2); ctx.stroke(); }
  for (const s of st.stars) {
    const a = clamp(1 - s.t / s.life, 0, 1);
    ctx.globalAlpha = a;
    if (s.note) seesawOutlined('♪', s.x, s.y, 18, C.gold, 'body'); else seesawStar(s.x, s.y, 4.5, C.gold);
  }
  ctx.globalAlpha = 1;
  // BOING! / SUPER! / DING! pops
  for (const f of st.pops) {
    const t = f.t, sc = t < 0.12 ? 0.4 + (t / 0.12) * 0.8 : t < 0.2 ? 1.2 - (t - 0.12) / 0.08 * 0.2 : 1, a = clamp((0.75 - t) / 0.3, 0, 1);
    ctx.save(); ctx.globalAlpha = a; bigText(f.text, f.x, f.y - t * 26, f.size * k, f.col, sc); ctx.restore();
  }
  // floats
  for (const f of st.fx) { ctx.save(); ctx.globalAlpha = clamp(1 - (f.t - 0.6) / 0.6, 0, 1); seesawOutlined(f.text, f.x, f.y - f.t * 30, f.size * k, f.col, 'body'); ctx.restore(); }
  // prompts over players: super "W!", "hop!", "Your turn!"
  const pump = st.cfg.pumpHint;
  for (const q of G.players) {
    if (!q.alive || seesawCpu(q.id)) continue;   // (1-player mode: no key prompts over the computer's head)
    const Q = st.pl[q.id], x = q.x + q.w / 2, bob = Math.abs(Math.sin(G.clock * 14)) * 4;
    let shown = false;
    if (pump) {
      const s = Q.on, p = other(q);
      if (s && s.cx !== undefined && p.alive && !p.grounded && p.vy > 0) {
        const qd = q.x + q.w / 2 - s.cx, pd = p.x + p.w / 2 - s.cx;
        if (Math.sign(qd) === s.target && Math.sign(pd) === -s.target && Math.abs(pd) <= SEESAW.half) {
          const gap = seesawSurf(s, p.x + p.w / 2) - (p.y + p.h), tHit = (-p.vy + Math.sqrt(p.vy * p.vy + 2 * PHYS.g * Math.max(0, gap))) / PHYS.g;
          if (tHit <= SEESAW.promptT) { seesawBubble(x, q.y - 22 * k - bob, seesawKeys(q.id) + '!', C.gold, k * 1.05); shown = true; }
        }
      }
    }
    if (!shown && Q.hopT >= SEESAW.hopT) { seesawBubble(x, q.y - 22 * k - Math.abs(Math.sin(G.clock * 5)) * 4, seesawKeys(q.id) + ' hop!', PCOL[q.id], k); shown = true; }
    if (!shown && G.time < Q.nudgeUntil) seesawBubble(x, q.y - 22 * k - Math.abs(Math.sin(G.clock * 5)) * 4, 'Your turn!', PCOL[q.id], k);
  }
}
Sfx.extra.seesawBoing = function (pitch) { this.tone(170 / pitch, 0.3, 'sine', 0.09, 620 / pitch); this.tone(340 / pitch, 0.16, 'triangle', 0.03, 900 / pitch, 0.02); };
Sfx.extra.seesawWhump = function () { this.tone(110, 0.12, 'triangle', 0.08, 55); };
Sfx.extra.seesawSuper = function (pitch) { [784, 988, 1319].forEach((f, i) => this.tone(f * pitch, 0.09, 'triangle', 0.05, null, i * 0.05)); };
Sfx.extra.seesawClunk = function () { this.tone(150, 0.08, 'square', 0.05, 90); };
Sfx.extra.seesawCreak = function () { this.tone(300, 0.15, 'sawtooth', 0.015, 240); };
Sfx.extra.seesawChain = function () { this.tone(900, 0.04, 'square', 0.02); this.tone(760, 0.04, 'square', 0.015, null, 0.07); };
Sfx.extra.seesawLever = function (pitch) { this.tone(400 * pitch, 0.06, 'square', 0.05, 200 * pitch); };
Sfx.extra.seesawUnlock = function () { this.tone(1400, 0.05, 'square', 0.03); this.tone(1900, 0.06, 'triangle', 0.03, null, 0.05); };
Sfx.extra.seesawBridge = function () { this.tone(200, 0.4, 'sawtooth', 0.03, 90); };
Sfx.extra.seesawBridgeThud = function () { this.tone(90, 0.2, 'triangle', 0.09, 45); this.tone(160, 0.08, 'square', 0.03, 80); };
Sfx.extra.seesawBell = function () { this.tone(1046 * seesawBellK, 0.6, 'sine', 0.07); this.tone(2093 * seesawBellK, 0.4, 'sine', 0.03); };
Sfx.extra.seesawSteps = function () { [0, 0.15, 0.3, 0.45].forEach(d => this.tone(140, 0.12, 'sawtooth', 0.03, 90, d)); };
Sfx.extra.seesawThud = function (pitch) { this.tone(120 * pitch, 0.07, 'triangle', 0.05, 70 * pitch); };
Sfx.extra.seesawThrow = function () { this.tone(300, 0.35, 'sawtooth', 0.025, 900); };
Sfx.extra.seesawGem = function (pitch) { [1319, 1760].forEach((f, i) => this.tone(f * pitch, 0.08, 'triangle', 0.05, null, i * 0.05)); };
Sfx.extra.seesawSplash = function () { this.tone(700, 0.25, 'sawtooth', 0.02, 140); this.tone(260, 0.25, 'sine', 0.06, 70); };
Sfx.extra.seesawCheck = function (pitch) { [660, 990].forEach((f, i) => this.tone(f * pitch, 0.1, 'triangle', 0.04, null, i * 0.07)); };
Sfx.extra.seesawHint = function () { this.tone(880, 0.07, 'triangle', 0.03); this.tone(1175, 0.09, 'triangle', 0.03, null, 0.08); };
Sfx.extra.seesawNudge = function (pitch) { this.tone(520 * pitch, 0.08, 'triangle', 0.03); this.tone(700 * pitch, 0.1, 'triangle', 0.03, null, 0.1); };
// 1-player mode: the computer plays this character (it gets no key prompts or "Your turn!" nudges)
const seesawCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
function seesawKeys(id) {   // the player's own jump key (like golfKeys)
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad'; // (each player's own device: js/controls.js)
  return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
}

