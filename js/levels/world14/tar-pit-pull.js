/* Pip & Bo - Level 14-3 Tar Pit Pull (team, World 14 Dino Valley). */
'use strict';

/* ===== 14-3 Tar Pit Pull (mode 'tarpit', team) — Gavyn's pick =====
   "Sticky tar slows you down and traps you. One player swings across on vines and pulls the other out, and you take
   turns as you cross the swamp." Side-view rooms across a sunny prehistoric swamp; everything is friendly and silly.
   - TAR (map 't', a pool of goo below the banks). Step in and you wade slowly and sink to the knees; after TAR.gooStuck s
     in the goo you are STUCK ("Stuck!", a silly face): no walking, no hopping, only wiggling (◀ ▶ in turn), which slows
     the sinking. Deep tar slowly swallows you: fully under is a "Bloop!" and you pop back on your last safe rock (counted,
     never a fail). Fresh in the goo you can make a weak sticky hop, each one stickier (no hopping across a pit, and too
     low to climb a bank). Shallow puddles (one tile deep) only hold you: hop or wiggle out, or be pulled.
   - VINES hang from the jungle canopy. Jump into a vine's leafy handle to grab it, ◀ ▶ pump the swing, jump (or the action)
     lets go and you fly. At rest a vine dangles high out of reach; it starts tied to a stake by the near bank (rooms 1, 3,
     4), or it has to be HOOKED: hold the action at a hook stump and the hook stick draws the vine to your edge for your
     PARTNER (you can't ride a vine you hooked yourself). Let go of a fully drawn vine and it swings across to the other
     bank: that's how a vine is thrown back. A vine won't let you swing ahead while your partner is still a bank behind.
   - PULL: a free player within reach of a partner in the tar presses the action: a vine lasso flies out ("Grab on!").
     Walk away from the goo (or keep holding the action; the stuck one can press toward you to help) and with a big
     "Shlorp!" they fly out and land on your side. Too far is "Too far!" (walk to the edge first).
   - So every crossing takes turns: one swings across on the vine, the other hops into the goo and gets pulled out, and
     at the next crossing the other one swings. Rooms: 1 Sticky Steps (two tied vines, a sticky puddle), 2 Vine Swing
     Gully (hook the vine and throw it back to each other; then a vine that needs a "Push!" from the partner), 3 Sinking
     Logs (a log sinks slowly under one of you and fast under two, so keep moving; one that goes "Glug!" drops you in the
     goo and bobs all the way back up before it holds anyone again, lifting out whoever is stuck above it; big tar
     bubbles pop stuck friends up and give them more time), 4 Gerty's Tail (a friendly brontosaurus makes a bridge only while somebody blows her leaf
     horn; the horns are far from her, so each of you calls for the other; then one last vine).
   - Gold help, always announced: Slow tar (2 bloops in a room), Long lasso (2 "Too far!"), Gold vines (they drop you
     on the far bank, after 2 falls off a vine), Patient Gerty (after 2 slides off her), all of it after a long time stuck.
     Petey the pterodactyl flies in with a hint after a while with no progress.
   - Medal by time and times stuck. Map chars (parsed here): t tar, z a bubble vent in the tar, h hook stump, n leaf horn,
     E the exit (the engine's door rect, taken over here). Room def: { title, tip, act, style, cross: [{ kind:
     'tied'|'push'|'pass'|'gerty', lead }], logs: [{ c, w }], deco: [...] }. The deep tar spans, split by logs, are the
     crossings in x order; the ground between them are the zones (banks and logs).
   Every top-level name starts with tar / TAR (Sfx.extra.tar* too); level state lives in G.mst. */
const TAR = {
  // tar
  surfOff: 4, wadeV: 58, wadeAcc: 520, wadeAir: 70, hopV: 250, gooStuck: 0.65, wadeDepth: 8, stuckDepth: 10, fullDepth: 28,
  sinkT: 7.5, sinkGold: 13, wiggleBack: 0.2, shallowWiggles: 5,
  // pulling
  reach: 225, reachGold: 300, reachDy: 170, pullAway: 34, pullHold: 0.42, pullWiggle: 0.3, pullSpeed: 105, shlorpT: 0.62,
  // vines
  vineG: 2000, rest: 100, anchorY: 40, grabPad: 10, pump: 1.5, capMul: 1.06, rideDamp: 0.03, hookT: 0.45, hookReach: 26,
  retie: 1.2, pushReach: 64, pushCD: 0.8, grabCD: 0.4, freeDamp: 1.6,
  // logs and bubbles
  logTop: 388, logSinkPx: 34, logOne: 0.045, logTwo: 0.2, logRise: 0.3, ventMin: 2.6, ventMax: 4.0, ventPop: 470,
  // Gerty
  gDown: 1.4, gUp: 1.7, gGrace: 0.5, gGraceGold: 1.2, gSolid: 0.85, hornReach: 26,
  // flow and help
  introHold: 0.4, exitHold: 0.35, winHold: 1.7, badgeT: 5.5, newsLife: 3.8, nudgeT: 2.2,
  goldBloops: 2, goldFar: 2, goldVine: 2, goldSlides: 2, goldStuck: 55, peteyAfter: 24,
};
const tarBig = () => (typeof hudBig === 'function' && hudBig());
const tarCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);   // 1-player mode: the computer's character
const tarCx = p => p.x + p.w / 2;
const tarEase = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/* ---------- each player's own keys (keyboard, controller or touch) for the hint chips ---------- */
function tarDev(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
function tarJumpKey(id) { const d = tarDev(id); return d === 'pad' ? glyph('a') : d === 'touch' ? '▲' : id === 0 ? 'W' : '↑'; }
function tarActKey(id) { const d = tarDev(id); return d === 'pad' ? glyph('act') : d === 'touch' ? 'the round button' : id === 0 ? 'F' : '/'; }
function tarMoveKeys(id) { const d = tarDev(id); return d === 'pad' ? 'stick ◀ ▶' : d === 'touch' ? '◀ ▶' : id === 0 ? 'A D' : '← →'; }
// the touch buttons and the legend show this room's action word (nextRoom doesn't redo the framework's labels)
function tarActLabels(word) {
  try {
    let changed = false;
    document.querySelectorAll('[data-actlabel]').forEach(el => { if (el.textContent !== word) { el.textContent = word; changed = true; } });
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}

/* ---------- the room: tar, zones, crossings, vines, stumps, horns, logs, Gerty ---------- */
function tarRoom(st, L) {
  const def = L.def, g = L.grid;
  st.k = def.roomIndex || 0;
  st.style = def.style || 'steps';
  st.stumps = []; st.horns = []; st.vents = []; st.deco = def.deco || [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = g[r][c];
    if (ch === 'z') { st.vents.push({ x: c * T + T / 2, t: 1 + (hash(c, r) % 100) / 40, grow: 0, ph: 0 }); g[r][c] = 't'; }
    else if (ch === 'h') { st.stumps.push({ x: c * T + T / 2, y: (r + 1) * T, cross: -1, side: 'N' }); g[r][c] = '.'; }
    else if (ch === 'n') { st.horns.push({ x: c * T + T / 2, y: (r + 1) * T, cross: -1, side: 'N', blow: 0, t: 0 }); g[r][c] = '.'; }
  }
  // the tar surface and bottom of every column
  st.surf = new Array(COLS).fill(null); st.bot = new Array(COLS).fill(null);
  for (let c = 0; c < COLS; c++) {
    let r0 = -1;
    for (let r = 0; r < ROWS; r++) if (g[r][c] === 't') { r0 = r; break; }
    if (r0 < 0) continue;
    let r1 = r0; while (r1 + 1 < ROWS && g[r1 + 1][c] === 't') r1++;
    st.surf[c] = r0 * T + TAR.surfOff; st.bot[c] = (r1 + 1) * T;
  }
  // tar regions (runs of columns with the same surface)
  st.regions = [];
  for (let c = 0; c < COLS; c++) {
    if (st.surf[c] == null) continue;
    let c1 = c; while (c1 + 1 < COLS && st.surf[c1 + 1] === st.surf[c]) c1++;
    st.regions.push({ x0: c * T, x1: (c1 + 1) * T, surf: st.surf[c], bot: st.bot[c], shallow: st.bot[c] - st.surf[c] < 30 });
    c = c1;
  }
  // logs float in the tar and split it
  st.logs = (def.logs || []).map((l, i) => ({ i, x0: l.c * T, x1: (l.c + l.w) * T, sink: 0, bob: (i * 1.7) % 6, load: 0, glug: 0, creak: 0, down: false }));
  const spans = [];
  for (const rg of st.regions) {
    if (rg.shallow) continue;
    let x = rg.x0;
    for (const lg of st.logs.filter(l => l.x0 >= rg.x0 && l.x1 <= rg.x1).sort((a, b) => a.x0 - b.x0)) { spans.push({ x0: x, x1: lg.x0, surf: rg.surf }); x = lg.x1; }
    spans.push({ x0: x, x1: rg.x1, surf: rg.surf });
  }
  spans.sort((a, b) => a.x0 - b.x0);
  // zones: the ground between the crossings (banks and logs)
  st.zones = [];
  let zx = 0;
  for (const sp of spans) { st.zones.push(tarMakeZone(st, zx, sp.x0)); zx = sp.x1; }
  st.zones.push(tarMakeZone(st, zx, W));
  st.cross = spans.map((sp, k) => {
    const cd = (def.cross && def.cross[k]) || {};
    return { k, kind: cd.kind || 'tied', lead: cd.lead != null ? cd.lead : k % 2, x0: sp.x0, x1: sp.x1, surf: sp.surf, vine: null, done: false, t: 0, cd };
  });
  for (const s of st.stumps) tarAssign(st, s);
  for (const h of st.horns) tarAssign(st, h);
  for (const cr of st.cross) if (cr.kind !== 'gerty') cr.vine = tarMakeVine(st, cr);
  st.vines = st.cross.map(cr => cr.vine).filter(Boolean);
  const gc = st.cross.find(cr => cr.kind === 'gerty');
  st.gerty = gc ? { cross: gc.k, x0: gc.x0 - 12, x1: gc.x1 + 12, yN: tarZoneTop(st, st.zones[gc.k], gc.x0 - 12), yF: tarZoneTop(st, st.zones[gc.k + 1], gc.x1 + 12), d: 0, calm: 9, called: false, blink: 0, say: '', sayT: 0, slides: 0, hum: 0, look: 0, bridges: 0 } : null;
  st.exit = L.door; L.door = null;
  // per-room state
  st.pl = G.players.map(p => ({
    inTar: false, stuck: false, depth: 0, goo: 0, sinkT: 0, gooey: false, visitStuck: false, wig: 0, wigDir: 0, wigShake: 0,
    ride: null, fly: null, onLog: -1, onG: false, drip: 0, grabCD: 0, safe: { x: p.x, y: p.y, log: -1 }, zone: tarZoneAt(st, tarCx(p)),
    helpCD: 0, shoutCD: 0, waitCD: 0, fallVine: 0, hooking: null, calling: false, tooFarCD: 0, bonkCD: 0,
  }));
  st.line = null; st.throwFx = []; st.pops = []; st.news = null;
  st.roomT = 0; st.exitT = 0; st.phase = 'play'; st.winT = 0; st.winTick = 0; st.doorIn = [false, false];
  st.roomBloops = 0; st.roomFar = 0; st.roomVineFalls = 0; st.noProg = 0;
  st.help = { slow: false, long: false, vine: false, wait: false };
  st.badge = { k: -1, t: 0 }; st.nudge = [{ key: '', t: 0 }, { key: '', t: 0 }];
  st.petey = { x: -60, y: 90, on: false, t: 0, say: '', tx: W / 2, ty: 120, flap: 0 };
  st.ripples = []; st.fxTick = 0;
  tarActLabels((def.act && def.act.label) || 'pull');
}
function tarMakeZone(st, x0, x1) {
  const lg = st.logs.find(l => l.x0 === x0 && l.x1 === x1);
  return { x0, x1, log: lg ? lg.i : -1 };
}
// the height of the ground at x (a bank's top, or a log's top)
function tarGroundAt(st, x) {
  for (const lg of st.logs) if (x >= lg.x0 && x <= lg.x1) return tarLogTop(lg);
  const c = clamp(Math.floor(x / T), 0, COLS - 1);
  for (let r = 0; r < ROWS; r++) if (G.level.grid[r][c] === '#') return r * T;
  return H;
}
function tarZoneTop(st, z, x) { return z.log >= 0 ? TAR.logTop : tarGroundAt(st, clamp(x, z.x0 + 1, z.x1 - 1)); }
function tarZoneAt(st, x) {
  for (let i = 0; i < st.zones.length; i++) { const z = st.zones[i]; if (x >= z.x0 - 12 && x <= z.x1 + 12) return i; }
  // in a crossing: the zone before it
  for (const cr of st.cross) if (x > cr.x0 && x < cr.x1) return cr.k;
  return 0;
}
function tarAssign(st, o) {
  let best = 1e9;
  for (const cr of st.cross) {
    if (Math.abs(o.x - cr.x0) < best) { best = Math.abs(o.x - cr.x0); o.cross = cr.k; o.side = 'N'; }
    if (Math.abs(o.x - cr.x1) < best) { best = Math.abs(o.x - cr.x1); o.cross = cr.k; o.side = 'F'; }
  }
}
function tarMakeVine(st, cr) {
  const zN = st.zones[cr.k], zF = st.zones[cr.k + 1];
  const topN = tarZoneTop(st, zN, cr.x0 - 10), topF = tarZoneTop(st, zF, cr.x1 + 10);
  const anyLog = zN.log >= 0 || zF.log >= 0;
  const tieY = Math.min(topN, topF) - (anyLog ? 52 : 44);   // (high enough that the swing clears the far bank's corner)
  const tieN = { x: cr.x0 - 8, y: tieY }, tieF = { x: cr.x1 + 8, y: tieY };
  const land = cr.x1 + 26;
  let ax = cr.kind === 'pass' ? (cr.x0 + cr.x1) / 2 : cr.kind === 'push' ? cr.x0 + (cr.x1 - cr.x0) * 0.3 : (tieN.x + land) / 2;
  if (cr.cd.ax != null) ax = cr.cd.ax;
  const v = { cross: cr.k, kind: cr.kind, ax, ay: TAR.anchorY, rest: TAR.rest, tieN, tieF, state: cr.kind === 'pass' ? 'rest' : 'tied',
    th: 0, om: 0, r: TAR.rest, rider: -1, lock: -1, hk: null, throwT: 0, restT: 0, retie: null, Acap: 0, pushA: 0, pushCD: 0, sway: (cr.k * 2.3) % 6, wave: 0 };
  const rt = Math.hypot(tieN.x - ax, tieN.y - v.ay);
  if (cr.kind === 'push') v.pushA = Math.asin(clamp((land - ax) / rt, 0.2, 0.95));
  if (v.state === 'tied') tarVineTo(v, tieN.x, tieN.y);
  return v;
}
// point a vine's tip at (x, y): its angle and length follow
function tarVineTo(v, x, y) { v.th = Math.atan2(x - v.ax, y - v.ay); v.r = Math.hypot(x - v.ax, y - v.ay); }
const tarTip = v => ({ x: v.ax + v.r * Math.sin(v.th), y: v.ay + v.r * Math.cos(v.th) });
const tarAmp = v => Math.acos(clamp(Math.cos(v.th) - v.r * v.om * v.om / (2 * TAR.vineG), -1, 1));

/* ---------- tar helpers ---------- */
function tarSurfAt(st, x) { const c = Math.floor(x / T); return c >= 0 && c < COLS ? st.surf[c] : null; }
function tarRegionAt(st, x) { for (const rg of st.regions) if (x >= rg.x0 && x < rg.x1) return rg; return null; }
const tarLogTop = lg => TAR.logTop + lg.sink * TAR.logSinkPx + (reduceMotion ? 0 : Math.sin(lg.bob) * 1.2 * (1 - lg.sink));
const tarLogSolid = lg => !lg.down && lg.sink < 0.72;   // (a log that went glug comes all the way back up before it holds anyone again)
const tarFree = ps => !ps.inTar && !ps.ride && !ps.fly;

/* ---------- moving the players (own step: partners pass through each other here) ---------- */
function tarStandOnLog(p, lg) {
  return p.x < lg.x1 - 0.5 && p.x + p.w > lg.x0 + 0.5;
}
function tarGround(p) { p.grounded = true; p.tileGround = true; p.onOneWay = false; p.onPartner = false; p.jumping = false; p.coyote = PHYS.coyote; }
function tarMoveNormal(st, p, ps, dt) {
  const o = other(p), oa = o.alive;
  o.alive = false;
  try {
    const prevBottom = p.y + p.h, wasLog = ps.onLog, wasG = ps.onG, lastVy = p.vy;
    control(p, dt);
    if (ps.gooey) p.vx = clamp(p.vx, -TAR.wadeAir, TAR.wadeAir);
    if (st.line && st.line.from === p.id) p.vx = clamp(p.vx, -TAR.pullSpeed, TAR.pullSpeed);
    moveX(p, p.vx * dt, true);
    moveY(p, p.vy * dt, true);
    postStep(p);
    // logs and Gerty are platforms the tile map doesn't know
    ps.onLog = -1; ps.onG = false;
    const feet = p.y + p.h;
    if (p.vy >= 0) for (const lg of st.logs) {
      if (!tarLogSolid(lg) || !tarStandOnLog(p, lg)) continue;
      const top = tarLogTop(lg);
      if ((wasLog === lg.i && Math.abs(feet - top) < 12) || (prevBottom <= top + 2 && feet >= top - 0.5)) {
        p.y = top - p.h; p.vy = 0; tarGround(p); ps.onLog = lg.i;
        if (wasLog !== lg.i && lastVy > 260) { p.sx = 1.25; p.sy = 0.78; Sfx.play('tarLog', p.id); puff(tarCx(p), top, 5, 'rgba(255,240,200,0.8)'); }
        break;
      }
    }
    const gt = st.gerty;
    if (gt && ps.onLog < 0 && p.vy >= 0) {
      const cx = tarCx(p), gy = tarGertyY(gt, cx);
      if (gy != null && gt.d >= tarGertySolidAt(st)) {
        if ((wasG && Math.abs(feet - gy) < 12) || (prevBottom <= gy + 3 && feet >= gy - 0.5)) {
          if (!p.grounded || gy < p.y + p.h) { p.y = gy - p.h; p.vy = 0; tarGround(p); ps.onG = true; }
        }
      }
      if (wasG && !ps.onG && !p.grounded && gt.d < tarGertySolidAt(st)) {
        gt.slides++; st.stats.slides++;
        tarPop(st, tarCx(p), p.y - 14, 'Wheee!', '#c8ffd8', 22); Sfx.play('tarWhee', p.id);
        p.vx = (cx < (gt.x0 + gt.x1) / 2 ? 1 : -1) * 60;
        if (!st.help.wait && gt.slides >= TAR.goldSlides) { st.help.wait = true; tarNews(st, 'Gold help: patient Gerty! She waits a little longer now', true); Sfx.play('tarGold'); }
      }
    }
    if (p.grounded) {
      ps.gooey = false;
      if (ps.goo > 0) ps.goo = 0;
      ps.visitStuck = false;
      // a safe spot: a bank or a dry log (not Gerty's back)
      const cx = tarCx(p), c = Math.floor(cx / T), r = Math.floor((p.y + p.h + 1) / T);
      const onBank = tile(c, r) === '#' && !ps.onG;
      const onLog = ps.onLog >= 0 && st.logs[ps.onLog].sink < 0.4;
      if (onBank || onLog) {
        const zi = tarZoneAt(st, cx), z = st.zones[zi];
        if (z && (!onLog || z.log === ps.onLog)) {
          const inset = z.log >= 0 ? 6 : 20;
          const sx = clamp(p.x, z.x0 + inset, Math.max(z.x0 + inset, z.x1 - inset - p.w));
          if (onBank && tile(Math.floor((sx + p.w / 2) / T), r) !== '#') { /* (a puddle there: keep the old spot) */ }
          else ps.safe = { x: sx, y: p.y, log: onLog ? ps.onLog : -1 };
          if (zi !== ps.zone) { ps.zone = zi; st.noProg = 0; }
        }
      }
    }
    // into the goo?
    if (!p.grounded) {
      const s = tarSurfAt(st, tarCx(p));
      if (s != null && p.y + p.h >= s + 0.5) tarEnter(st, p, ps, s, lastVy);
    }
  } finally { o.alive = oa; }
}
function tarEnter(st, p, ps, surf, vy) {
  ps.inTar = true; ps.stuck = false; ps.depth = clamp(p.y + p.h - surf, 0, TAR.wadeDepth); ps.sinkT = 0; ps.wig = 0;
  p.vx *= 0.25; p.vy = 0; p.jumping = false; p.grounded = false;
  p.sx = 1.32; p.sy = 0.7;
  const cx = tarCx(p);
  for (let i = 0; i < 8; i++) G.particles.push({ x: cx + (Math.random() - 0.5) * 16, y: surf, vx: (Math.random() - 0.5) * 140, vy: -60 - Math.random() * 130, life: 0.5, max: 0.5, col: i % 3 ? '#2a2038' : '#5d4a78', size: 3 + Math.random() * 3, grav: 600, kind: 'dot' });
  st.ripples.push({ x: cx, y: surf, t: 0, big: vy > 300 });
  Sfx.play(vy > 300 ? 'tarSplat' : 'tarSplut', p.id);
  if (!ps.gooey) tarPop(st, cx, p.y - 10, vy > 300 ? 'Splat!' : 'Sticky!', '#e8dcff', 18);
}
function tarWade(st, p, ps, dt) {
  const o = other(p), oa = o.alive;
  const cx = tarCx(p), surf = tarSurfAt(st, cx);
  if (surf == null) { ps.inTar = false; ps.stuck = false; return; }
  const rg = tarRegionAt(st, cx), shallow = !!(rg && rg.shallow), maxD = (st.bot[Math.floor(cx / T)] || surf + 40) - surf - 1;
  ps.goo += dt;
  // a log bobbing back up under you lifts you out
  for (const lg of st.logs) {
    if (!tarLogSolid(lg) || !tarStandOnLog(p, lg)) continue;
    const top = tarLogTop(lg);
    if (top <= p.y + p.h + 1) {
      ps.inTar = false; ps.stuck = false; ps.depth = 0; p.y = top - p.h; p.vy = 0; tarGround(p); ps.onLog = lg.i;
      tarPop(st, cx, p.y - 12, 'Bobbed up!', '#ffe3a8', 17); Sfx.play('tarPop', p.id);
      if (st.line && st.line.to === p.id) st.line = null;
      return;
    }
  }
  const inp = p.input;
  if (!ps.stuck) {
    const mv = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    p.vx = approach(p.vx, mv * TAR.wadeV, TAR.wadeAcc * dt);
    if (mv) p.face = mv;
    o.alive = false;
    try { moveX(p, p.vx * dt, true); } finally { o.alive = oa; }
    ps.depth = approach(ps.depth, TAR.wadeDepth, 30 * dt);
    if (Math.abs(p.vx) > 8 && (G.tickN % 18) === 0) st.ripples.push({ x: tarCx(p), y: surf, t: 0, big: false });
    if (p.pendingJump || p.jumpBuf > 0) {
      p.pendingJump = false; p.jumpBuf = 0;
      if (ps.goo < TAR.gooStuck) {
        // a weak, sticky hop (never high enough to climb out of a deep pit; each hop gets stickier, so no hopping across)
        ps.inTar = false; ps.gooey = true; ps.goo += 0.2;
        p.y = surf + ps.depth - p.h; p.vy = -(shallow ? 330 : TAR.hopV);   // (out of a puddle: high enough to land on the bank beside it)
        p.jumping = false; p.grounded = false; p.coyote = 0;
        p.sx = 0.85; p.sy = 1.18; Sfx.play('tarHop', p.id);
        return;
      }
    }
    if (ps.goo >= TAR.gooStuck) {
      ps.stuck = true; ps.sinkT = 0; ps.wig = 0; p.vx = 0;
      if (!ps.visitStuck) { ps.visitStuck = true; st.stats.stuck[p.id]++; }
      tarPop(st, tarCx(p), p.y - 14, 'Stuck!', '#ffd2f0', 22); Sfx.play('tarStuck', p.id); rumble(p.id, 0.3, 0.4, 120);
      p.sx = 1.2; p.sy = 0.82;
    }
  } else {
    p.vx = 0;
    // wiggling: ◀ and ▶ pressed in turn
    const dir = inp.left && !inp.right ? -1 : inp.right && !inp.left ? 1 : 0;
    if (dir && dir !== ps.wigDir) {
      if (ps.wigDir !== 0) {
        ps.wig++; ps.wigShake = 0.22; p.face = dir;
        if (shallow) { if (ps.wig % 2 === 0) Sfx.play('tarWiggle', p.id); }
        else ps.sinkT = Math.max(0, ps.sinkT - TAR.wiggleBack);
      }
      ps.wigDir = dir;
    }
    if (ps.wigShake > 0) ps.wigShake -= dt;
    if (p.pendingJump) { p.pendingJump = false; tarShout(st, p, ps); }
    if (shallow) {
      ps.depth = approach(ps.depth, Math.min(TAR.stuckDepth, maxD), 20 * dt);
      if (ps.wig >= TAR.shallowWiggles) {
        // wiggled free: a sticky pop out of the puddle
        ps.inTar = false; ps.stuck = false; ps.gooey = true; ps.goo = 0;
        p.y = surf + ps.depth - p.h; p.vy = -330; p.vx = p.face * 60; p.grounded = false; p.coyote = 0;
        tarPop(st, tarCx(p), p.y - 12, 'Wiggle-pop!', '#ffe3a8', 19); Sfx.play('tarPop', p.id);
        if (st.line && st.line.to === p.id) st.line = null;
        return;
      }
    } else {
      const sinkFor = st.help.slow ? TAR.sinkGold : TAR.sinkT;
      ps.sinkT += dt;
      const k = clamp(ps.sinkT / sinkFor, 0, 1);
      ps.depth = approach(ps.depth, TAR.stuckDepth + (TAR.fullDepth - TAR.stuckDepth) * k, 30 * dt);
      if (ps.sinkT >= sinkFor) { tarBloop(st, p, ps); return; }
    }
  }
  p.pendingJump = false; p.jumpBuf = 0;
  ps.depth = Math.min(ps.depth, maxD);
  p.y = surf + ps.depth - p.h; p.vy = 0; p.grounded = false; p.tileGround = false; p.coyote = 0;
}
function tarShout(st, p, ps) {
  if (ps.shoutCD > 0) return;
  ps.shoutCD = 1.2;
  tarPop(st, tarCx(p), p.y - 16, ps.stuck ? 'Help! Pull me!' : 'Hoo-hoo!', ps.stuck ? '#ffd2f0' : '#fff2c2', 15);
  Sfx.play(ps.stuck ? 'tarHelp' : 'tarHoo', p.id);
}
// fully sunk: "Bloop!", back on your last safe rock
function tarBloop(st, p, ps) {
  const cx = tarCx(p), surf = tarSurfAt(st, cx) || p.y + p.h;
  tarPop(st, cx, surf - 26, 'Bloop!', '#d8c8ff', 24);
  for (let i = 0; i < 10; i++) G.particles.push({ x: cx + (Math.random() - 0.5) * 14, y: surf, vx: (Math.random() - 0.5) * 80, vy: -90 - Math.random() * 120, life: 0.6, max: 0.6, col: '#3a2c4e', size: 3 + Math.random() * 4, grav: 500, kind: 'dot' });
  st.ripples.push({ x: cx, y: surf, t: 0, big: true });
  Sfx.play('tarBloop', p.id);
  const s = ps.safe;
  if (s.log >= 0 && st.logs[s.log]) { const lg = st.logs[s.log]; lg.sink = 0; lg.down = false; p.y = tarLogTop(lg) - p.h; }
  else p.y = s.y;
  p.x = s.x;
  Object.assign(p, { vx: 0, vy: 0, grounded: false, jumping: false, jumpBuf: 0, pendingJump: false, coyote: 0, sx: 0.6, sy: 1.4, lastVy: 0, carryVx: 0 });
  Object.assign(ps, { inTar: false, stuck: false, depth: 0, goo: 0, sinkT: 0, gooey: false, visitStuck: false, drip: 1.6 });
  if (st.line && (st.line.to === p.id || st.line.from === p.id)) st.line = null;
  burst(tarCx(p), p.y + p.h / 2, 'rgba(255,255,255,0.9)', 10);
  tarPop(st, tarCx(p), p.y - 16, 'Boing!', '#fff2c2', 18);
  st.stats.bloops[p.id]++; st.roomBloops++;
  if (!st.help.slow && st.roomBloops >= TAR.goldBloops) { st.help.slow = true; tarNews(st, 'Gold help: slow tar! You sink much slower now', true); Sfx.play('tarGold'); }
}

/* ---------- vines ---------- */
// may p grab the vine of crossing k? (never ahead of a partner who is still a bank behind)
function tarGrabOk(st, p, v) {
  const ps = st.pl[p.id], os = st.pl[1 - p.id];
  if (v.lock === p.id) return false;
  if (ps.zone <= v.cross && os.zone < v.cross) return false;
  return true;
}
function tarGrabCheck(st, p, ps) {
  if (!tarFree(ps) || ps.grabCD > 0 || ps.gooey || !p.alive) return;
  const trying = !p.grounded || p.input.jump || p.input.up || p.pendingJump;
  if (!trying) return;
  for (const v of st.vines) {
    if (!(v.state === 'tied' || v.state === 'hooked' || v.state === 'free')) continue;
    const tp = tarTip(v), pad = TAR.grabPad;
    if (tp.x < p.x - pad || tp.x > p.x + p.w + pad || tp.y < p.y - pad || tp.y > p.y + p.h * 0.62) continue;
    if (!tarGrabOk(st, p, v)) {
      if (ps.waitCD <= 0) {
        ps.waitCD = 2.5; v.wave = 0.6;
        tarPop(st, tp.x, tp.y - 18, v.lock === p.id ? 'Not for the hooker!' : 'Wait for ' + NAMES[1 - p.id] + '!', '#ffe3a8', 16);
        Sfx.play('tarNope', p.id);
      }
      continue;
    }
    tarGrab(st, p, ps, v);
    return;
  }
}
function tarGrab(st, p, ps, v) {
  const tp = tarTip(v), wasFree = v.state === 'free';
  if (v.hk) { const hp = st.pl[v.hk.by]; if (hp) hp.hooking = null; v.hk = null; }
  v.state = 'ridden'; v.rider = p.id; v.retie = null; v.throwT = 0;
  if (v.lock !== p.id) v.lock = -1;
  tarVineTo(v, tp.x, tp.y);
  const c = Math.cos(v.th), s = Math.sin(v.th);
  const own = clamp((p.vx * c - p.vy * s) / v.r, -0.9, 0.9);
  v.om = wasFree ? v.om * 0.9 + own * 0.1 : own * 0.6;
  v.Acap = Math.max(tarAmp(v), Math.abs(v.th)) * TAR.capMul + 0.02;
  ps.ride = v; ps.gooey = false; ps.grab0 = v.th;
  p.vx = 0; p.vy = 0; p.jumping = false; p.pendingJump = false; p.jumpBuf = 0; p.grounded = false;
  p.x = tp.x - p.w / 2; p.y = tp.y - 2;
  p.sx = 0.8; p.sy = 1.2;
  st.stats.swings++;
  tarPop(st, tp.x, tp.y - 22, 'Wheee!', '#c8ffd8', 18);
  Sfx.play('tarGrab', p.id); rumble(p.id, 0.2, 0.3, 80);
}
function tarRide(st, p, ps, dt) {
  const v = ps.ride, inp = p.input;
  if (p.pendingJump || p.pendingAct) { p.pendingJump = false; p.pendingAct = false; tarRelease(st, p, ps, false); return; }
  const g = TAR.vineG, th0 = v.th;
  const mv = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  let acc = -(g / v.r) * Math.sin(v.th);
  if (mv && Math.abs(v.om) > 0.02 && Math.sign(mv) === Math.sign(v.om)) { if (tarAmp(v) < v.Acap) acc += mv * TAR.pump; }
  else if (mv && Math.abs(v.om) <= 0.02 && Math.abs(v.th) < 0.05) acc += mv * TAR.pump;   // (a nudge from a standstill)
  v.om += acc * dt;
  if (mv && Math.abs(v.om) > 0.02 && Math.sign(mv) === -Math.sign(v.om)) v.om *= 1 - 0.9 * dt;
  v.om *= 1 - TAR.rideDamp * dt;
  v.th += v.om * dt;
  if (mv) p.face = mv; else if (Math.abs(v.om) > 0.1) p.face = v.om > 0 ? 1 : -1;
  let tp = tarTip(v);
  // a wall in the way: bonk and swing back
  const bx = tp.x - p.w / 2, by = tp.y - 2;
  const c0 = Math.floor((bx + 1) / T), c1 = Math.floor((bx + p.w - 1) / T), r0 = Math.floor((by + 1) / T), r1 = Math.floor((by + p.h - 1) / T);
  let hit = false;
  for (let r = r0; r <= r1 && !hit; r++) for (let c = c0; c <= c1; c++) if (tile(c, r) === '#') { hit = true; break; }
  if (hit) {
    v.th = th0; v.om = -v.om * 0.35; tp = tarTip(v);
    if (ps.bonkCD <= 0) { ps.bonkCD = 0.8; tarPop(st, tp.x, tp.y - 18, 'Bonk!', '#fff2c2', 16); Sfx.play('bonk'); }
  }
  const nx = tp.x - p.w / 2, ny = tp.y - 2;
  p.vx = (nx - p.x) / dt; p.vy = (ny - p.y) / dt;
  p.x = nx; p.y = ny; p.grounded = false;
  // gold vines: drop you off on the far bank near the top of the swing
  if (st.help.vine) {
    const toward = v.om > 0 ? v.cross + 1 : v.cross, z = st.zones[toward], cx = tarCx(p);
    const fromZone = ps.grab0 < 0 ? v.cross : v.cross + 1;
    if (z && toward !== fromZone && cx > z.x0 + 8 && cx < z.x1 - 8 && Math.abs(v.om) < 0.4) tarRelease(st, p, ps, true);
  }
}
function tarRelease(st, p, ps, auto) {
  const v = ps.ride;
  ps.ride = null; ps.grabCD = TAR.grabCD;
  const c = Math.cos(v.th), s = Math.sin(v.th);
  p.vx = clamp(v.r * v.om * c, -330, 330); p.vy = clamp(-v.r * v.om * s, -500, 500) - 110;
  if (auto) { p.vx *= 0.3; p.vy = -60; }
  p.jumping = false; p.coyote = 0; p.jumpBuf = 0; p.grounded = false;
  p.sx = 0.82; p.sy = 1.2;
  v.state = 'free'; v.rider = -1; v.throwT = 0; v.om *= 0.7;
  ps.fallVine = 1.6;
  tarPop(st, tarCx(p), p.y - 14, auto ? 'Gold drop!' : 'Let go!', auto ? C.gold : '#c8ffd8', 16);
  Sfx.play('tarLetGo', p.id);
}
// the vines that nobody rides: tied, hooked, swinging free, resting, or springing back to their stake
function tarVinesStep(st, dt) {
  for (const v of st.vines) {
    v.sway += dt; v.wave = Math.max(0, v.wave - dt); v.pushCD = Math.max(0, v.pushCD - dt);
    if (v.state === 'tied' || v.state === 'ridden') continue;
    if (v.state === 'hooked') {
      const hk = v.hk, hp = G.players[hk.by], hs = st.pl[hk.by], tie = hk.side === 'N' ? v.tieN : v.tieF;
      const at = st.stumps.find(s => s.cross === v.cross && s.side === hk.side);
      const holding = hp.alive && hp.input.act && tarFree(hs) && at && Math.abs(tarCx(hp) - at.x) <= TAR.hookReach + 8;
      if (holding) {
        hk.t = Math.min(1, hk.t + dt / TAR.hookT);
        const u = tarEase(hk.t);
        tarVineTo(v, hk.fx + (tie.x - hk.fx) * u, hk.fy + (tie.y - hk.fy) * u);
        if (hk.t >= 1 && !hk.ready) { hk.ready = true; Sfx.play('tarHookOn', hk.by); }
        continue;
      }
      // let go: a fully drawn vine swings across to the other bank (thrown); a half-drawn one just swings away
      hs.hooking = null; v.hk = null; v.state = 'free'; v.om = 0; v.lock = hk.by;
      v.throwT = hk.t >= 1 ? Math.PI * Math.sqrt(v.r / TAR.vineG) + 0.35 : 0;
      if (hk.t >= 1) { st.stats.throws++; tarPop(st, tie.x, tie.y - 20, 'Catch!', '#c8ffd8', 17); Sfx.play('whoosh'); }
      continue;
    }
    if (v.state === 'free') {
      v.om += -(TAR.vineG / v.r) * Math.sin(v.th) * dt;
      if (v.throwT > 0) v.throwT -= dt;
      else {
        v.om *= 1 - TAR.freeDamp * dt;
        v.r = approach(v.r, v.rest, 140 * dt);
      }
      v.th += v.om * dt;
      if (v.throwT <= 0 && Math.abs(v.th) < 0.03 && Math.abs(v.om) < 0.06 && Math.abs(v.r - v.rest) < 1) { v.state = 'rest'; v.th = 0; v.om = 0; v.r = v.rest; v.restT = 0; }
      continue;
    }
    if (v.state === 'rest') {
      v.restT += dt;
      // a tied vine springs back to its stake once nobody has crossed it (after a slip back)
      if (v.kind !== 'pass' && v.restT >= TAR.retie && st.pl.every(s => s.zone <= v.cross && !s.ride)) {
        v.state = 'retie'; v.retie = { t: 0, fx: tarTip(v).x, fy: tarTip(v).y }; v.lock = -1;
      }
      continue;
    }
    if (v.state === 'retie') {
      v.retie.t = Math.min(1, v.retie.t + dt / 0.6);
      const u = tarEase(v.retie.t);
      tarVineTo(v, v.retie.fx + (v.tieN.x - v.retie.fx) * u, v.retie.fy + (v.tieN.y - v.retie.fy) * u);
      if (v.retie.t >= 1) { v.state = 'tied'; v.retie = null; tarPop(st, v.tieN.x, v.tieN.y - 22, 'Boing! Tied again', '#c8ffd8', 15); Sfx.play('tarRetie'); }
    }
  }
}
// holding the action at a hook stump draws its vine to your edge
function tarHookCheck(st, p, ps) {
  if (!p.input.act || !tarFree(ps) || !p.grounded || ps.hooking) return;
  for (const s of st.stumps) {
    if (Math.abs(tarCx(p) - s.x) > TAR.hookReach || Math.abs(p.y + p.h - s.y) > 8) continue;
    const v = st.cross[s.cross].vine;
    if (!v || !(v.state === 'rest' || v.state === 'free')) continue;
    const tp = tarTip(v);
    v.state = 'hooked'; v.hk = { by: p.id, side: s.side, t: 0, fx: tp.x, fy: tp.y, ready: false }; v.throwT = 0; v.om = 0;
    v.lock = p.id;   // (the hooker holds the stick, so the other one swings)
    ps.hooking = v; st.stats.hooks++;
    tarPop(st, s.x, s.y - 50, 'Hook!', '#ffe3a8', 16); Sfx.play('tarHook', p.id);
    return;
  }
}
// "Push!": a partner standing by a rider on a push vine sends them swinging high
function tarTryPush(st, p) {
  const o = G.players[1 - p.id], os = st.pl[o.id];
  const v = os.ride;
  if (!v || v.kind !== 'push' || v.pushCD > 0 || !p.grounded) return false;
  if (Math.abs(tarCx(p) - tarCx(o)) > TAR.pushReach || Math.abs(o.y - p.y) > 70) return false;
  if (Math.abs(v.th) >= v.pushA * 0.95) return false;
  const far = st.cross[v.cross].x1 > tarCx(o) ? 1 : -1;
  v.om = far * Math.sqrt(Math.max(0, 2 * TAR.vineG / v.r * (Math.cos(v.th) - Math.cos(v.pushA))));
  v.Acap = Math.max(v.Acap, v.pushA * 1.04);
  v.pushCD = TAR.pushCD; st.stats.pushes++;
  tarPop(st, tarCx(o), o.y - 18, 'Push!', '#ffe3a8', 20); Sfx.play('tarPush', p.id);
  p.sx = 1.2; p.sy = 0.85; rumble(p.id, 0.2, 0.3, 80);
  return true;
}

/* ---------- pulling a partner out of the goo ---------- */
function tarReach(st) { return st.help.long ? TAR.reachGold : TAR.reach; }
function tarCanPull(st, p, o) {
  const os = st.pl[o.id];
  if (!os.inTar) return null;
  const dx = Math.abs(tarCx(o) - tarCx(p)), dy = Math.abs(o.y - p.y);
  return { ok: dx <= tarReach(st) && dy <= TAR.reachDy, dx };
}
function tarThrow(st, p, ps) {
  const o = G.players[1 - p.id], cp = tarCanPull(st, p, o);
  if (!cp || st.line) return false;
  if (!cp.ok) {
    if (ps.tooFarCD <= 0) {
      ps.tooFarCD = 1.2; st.roomFar++;
      st.throwFx.push({ from: p.id, x: tarCx(p), y: p.y + 6, dir: tarCx(o) > tarCx(p) ? 1 : -1, t: 0, len: tarReach(st) });
      tarPop(st, tarCx(p), p.y - 16, 'Too far!', '#ffd2a8', 17); Sfx.play('tarShort', p.id);
      if (!st.help.long && st.roomFar >= TAR.goldFar) { st.help.long = true; tarNews(st, 'Gold help: long lasso! Your vine reaches much farther', true); Sfx.play('tarGold'); }
    }
    return true;
  }
  st.line = { from: p.id, to: o.id, walk: 0, hold: 0, prog: 0, cx0: tarCx(p), dir: tarCx(p) >= tarCx(o) ? 1 : -1, t: 0 };
  st.throwFx.push({ from: p.id, x: tarCx(p), y: p.y + 6, dir: tarCx(o) > tarCx(p) ? 1 : -1, t: 0, hit: o.id });
  tarPop(st, tarCx(o), o.y - 18, 'Grab on!', '#c8ffd8', 18);
  Sfx.play('tarThrow', p.id); rumble(o.id, 0.2, 0.3, 80);
  return true;
}
function tarLineStep(st, dt) {
  const ln = st.line;
  if (!ln) return;
  const pu = G.players[ln.from], sp = G.players[ln.to], pp = st.pl[ln.from], sq = st.pl[ln.to];
  if (!sq.inTar || !tarFree(pp) || !pu.alive) { st.line = null; return; }
  ln.t += dt;
  const away = (tarCx(pu) - ln.cx0) * ln.dir;
  ln.walk = Math.max(ln.walk, away / TAR.pullAway);
  if (pu.input.act) ln.hold += TAR.pullHold * dt;
  const toward = ln.dir > 0 ? sp.input.right : sp.input.left;
  if (toward) ln.hold += TAR.pullWiggle * dt;
  ln.prog = ln.walk + ln.hold;
  if (Math.abs(tarCx(pu) - tarCx(sp)) > tarReach(st) + 140) { st.line = null; tarPop(st, tarCx(pu), pu.y - 14, 'Oops! Let go', '#ffd2a8', 15); return; }
  if (ln.prog >= 1) tarShlorp(st, pu, sp, pp, sq);
}
function tarShlorp(st, pu, sp, pp, sq) {
  st.line = null;
  const cx = tarCx(sp), rg = tarRegionAt(st, cx), surf = tarSurfAt(st, cx) || sp.y + sp.h;
  const side = tarCx(pu) >= cx ? 1 : -1;
  // land just out of the goo, on the puller's side (a log's end when the puller stands on a log)
  let lx = rg ? (side > 0 ? rg.x1 + 22 : rg.x0 - 22) : tarCx(pu);
  for (const lg of st.logs) if (cx > lg.x0 - 300 && ((side > 0 && lg.x0 > cx && lg.x0 <= tarCx(pu) + 1) || (side < 0 && lg.x1 < cx && lg.x1 >= tarCx(pu) - 1))) {
    const nl = side > 0 ? lg.x0 + 18 : lg.x1 - 18;
    if (Math.abs(nl - cx) < Math.abs(lx - cx)) lx = nl;
  }
  if ((side > 0 && lx > tarCx(pu)) || (side < 0 && lx < tarCx(pu))) lx = tarCx(pu);
  const top = tarGroundAt(st, lx);
  sq.fly = { x0: sp.x, y0: sp.y, x1: lx - sp.w / 2, y1: top - sp.h, t: 0, T: TAR.shlorpT, h: Math.max(60, sp.y - (top - sp.h) + 46) };
  Object.assign(sq, { inTar: false, stuck: false, depth: 0, goo: 0, sinkT: 0, gooey: false, drip: 2.2 });
  sp.vx = 0; sp.vy = 0;
  st.stats.shlorps++;
  tarPop(st, cx, surf - 30, 'SHLORP!', '#ffe3a8', 26);
  for (let i = 0; i < 14; i++) G.particles.push({ x: cx + (Math.random() - 0.5) * 18, y: surf, vx: (Math.random() - 0.5) * 220, vy: -120 - Math.random() * 200, life: 0.7, max: 0.7, col: i % 3 ? '#2a2038' : '#6a5590', size: 3 + Math.random() * 4, grav: 700, kind: 'dot' });
  st.ripples.push({ x: cx, y: surf, t: 0, big: true });
  Sfx.play('tarShlorp'); rumble(sp.id, 0.5, 0.5, 160); rumble(pu.id, 0.3, 0.4, 120);
  pu.sx = 1.25; pu.sy = 0.8;
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.1);
}
function tarFly(st, p, ps, dt) {
  const f = ps.fly;
  f.t += dt;
  const u = Math.min(1, f.t / f.T);
  const nx = f.x0 + (f.x1 - f.x0) * u, ny = f.y0 + (f.y1 - f.y0) * u - f.h * 4 * u * (1 - u);
  p.vx = (nx - p.x) / dt; p.vy = (ny - p.y) / dt; p.x = nx; p.y = ny;
  p.face = f.x1 > f.x0 ? 1 : -1; p.grounded = false; p.pendingJump = false; p.jumpBuf = 0;
  if (u >= 1) {
    ps.fly = null; p.vx = 0; p.vy = 0; p.sx = 1.3; p.sy = 0.72;
    puff(tarCx(p), p.y + p.h, 6, 'rgba(255,240,200,0.85)'); Sfx.play('land');
  }
}

/* ---------- logs, bubbles, Gerty ---------- */
function tarLogsStep(st, dt) {
  for (const lg of st.logs) {
    lg.bob += dt * 2.1;
    const n = st.pl.filter((s, k) => s.onLog === lg.i && G.players[k].alive && tarFree(s)).length;
    lg.load = n;
    const was = lg.sink;
    if (lg.down) {
      // gone under: it bobs all the way back up (lifting anyone stuck above it out of the goo)
      lg.sink = Math.max(0, lg.sink - TAR.logRise * dt);
      if (lg.sink <= 0.15) { lg.down = false; Sfx.play('tarPop'); }
      continue;
    }
    lg.sink = clamp(lg.sink + (n === 2 ? TAR.logTwo : n === 1 ? TAR.logOne : -TAR.logRise) * dt, 0, 1);
    if (n === 2) { lg.creak -= dt; if (lg.creak <= 0) { lg.creak = 0.9; Sfx.play('tarCreak'); tarPop(st, (lg.x0 + lg.x1) / 2, tarLogTop(lg) - 46, 'Creak!', '#ffe3a8', 14); } }
    if (was < 0.72 && lg.sink >= 0.72) { lg.down = true; tarPop(st, (lg.x0 + lg.x1) / 2, TAR.logTop - 40, 'Glug!', '#d8c8ff', 20); Sfx.play('tarGlug'); }
  }
}
function tarVentsStep(st, dt) {
  for (const vt of st.vents) {
    vt.t -= dt;
    vt.grow = clamp(1 - vt.t / 1.1, 0, 1);
    if (vt.t > 0) continue;
    vt.t = TAR.ventMin + Math.random() * (TAR.ventMax - TAR.ventMin); vt.ph = 0.5;
    const surf = tarSurfAt(st, vt.x) || 394;
    st.ripples.push({ x: vt.x, y: surf, t: 0, big: true });
    for (let i = 0; i < 9; i++) G.particles.push({ x: vt.x + (Math.random() - 0.5) * 20, y: surf - 8, vx: (Math.random() - 0.5) * 160, vy: -100 - Math.random() * 160, life: 0.55, max: 0.55, col: i % 2 ? '#3a2c4e' : '#7a64a0', size: 2 + Math.random() * 3, grav: 600, kind: 'dot' });
    Sfx.play('tarBubble');
    G.players.forEach((p, k) => {
      const ps = st.pl[k];
      if (!ps.inTar || Math.abs(tarCx(p) - vt.x) > 30) return;
      // POP: up you go, sticky but unstuck, with a fresh start on the sinking
      Object.assign(ps, { inTar: false, stuck: false, depth: 0, goo: 0.2, sinkT: 0, gooey: true });
      p.y = surf - p.h - 2; p.vy = -TAR.ventPop; p.vx = 0; p.grounded = false; p.coyote = 0; p.sx = 0.75; p.sy = 1.3;
      if (st.line && st.line.to === k) st.line = null;
      st.stats.pops++;
      tarPop(st, vt.x, surf - 50, 'Bubble pop!', '#e8dcff', 19); Sfx.play('tarPop', k);
    });
  }
}
// Gerty's back when she's lying down as a bridge: tail tip on the near bank, a hump, her neck down to the far bank
function tarGertyY(gt, x) {
  if (x < gt.x0 || x > gt.x1) return null;
  const w = gt.x1 - gt.x0, u = (x - gt.x0) / w;
  const pts = [[0, gt.yN], [0.18, gt.yN - 16], [0.44, gt.yN - 44], [0.62, gt.yN - 40], [0.82, gt.yF - 18], [1, gt.yF]];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (u <= b[0]) { const k = (u - a[0]) / (b[0] - a[0]), s = k * k * (3 - 2 * k); return a[1] + (b[1] - a[1]) * s; }
  }
  return gt.yF;
}
const tarGertySolidAt = () => TAR.gSolid;
function tarHornAt(st, p) {
  for (const h of st.horns) if (Math.abs(tarCx(p) - h.x) <= TAR.hornReach && Math.abs(p.y + p.h - h.y) < 10) return h;
  return null;
}
function tarGertyStep(st, dt) {
  const gt = st.gerty;
  if (!gt) return;
  let called = false;
  G.players.forEach((p, k) => {
    const ps = st.pl[k], h = p.alive && tarFree(ps) && p.grounded && p.input.act ? tarHornAt(st, p) : null;
    ps.calling = !!h;
    if (h) { called = true; h.blow += dt; if (h.blow >= 0.55 || h.t <= 0) { h.blow = 0; h.t = 1; Sfx.play('tarHorn', k); tarPop(st, h.x, h.y - 60, 'HOO-HOO!', '#c8ffd8', 15); } }
  });
  for (const h of st.horns) { h.t = Math.max(0, h.t - dt * 1.4); if (!G.players.some((p, k) => st.pl[k].calling && tarHornAt(st, p) === h)) h.blow = 0.4; }
  gt.called = called;
  if (called) gt.calm = 0; else gt.calm += dt;
  const grace = st.help.wait ? TAR.gGraceGold : TAR.gGrace;
  const was = gt.d;
  if (called) gt.d = Math.min(1, gt.d + TAR.gDown * dt);
  else if (gt.calm > grace) gt.d = Math.max(0, gt.d - TAR.gUp * dt);
  if (was < 1 && gt.d >= 1) { gt.say = 'Mmm-hmm! Hop on!'; gt.sayT = 1.6; Sfx.play('tarGerty'); gt.bridges++; }
  if (was >= TAR.gSolid && gt.d < TAR.gSolid) { gt.say = 'Hmm?'; gt.sayT = 1; }
  if (gt.sayT > 0) gt.sayT -= dt;
  gt.blink -= dt; if (gt.blink < -3 - (hash(gt.bridges, 3) % 3)) gt.blink = 0.15;
  gt.hum += dt;
  const cx = G.players.reduce((a, p) => a + tarCx(p), 0) / 2;
  gt.look = approach(gt.look, clamp((cx - (gt.x0 + gt.x1) / 2) / 200, -1, 1), dt * 2);
}

/* ---------- safe spots, the exit, help ---------- */
function tarExitStep(st, dt) {
  const d = st.exit;
  if (!d) return;
  const inD = (p, k) => { if (!p.alive || !tarFree(st.pl[k])) return false; const cx = p.x + p.w / 2, cy = p.y + p.h / 2; return cx > d.x + 2 && cx < d.x + d.w - 2 && cy > d.y && cy < d.y + d.h; };
  st.doorIn = G.players.map(inD);
  if (st.doorIn[0] && st.doorIn[1]) { st.exitT += dt; if (st.exitT >= TAR.exitHold) tarWin(st); }
  else st.exitT = 0;
}
function tarWin(st) {
  st.phase = 'won'; st.winT = 0; st.line = null;
  st.stats.roomT[st.k] = st.roomT;
  const d = st.exit, x = d.x + d.w / 2, y = d.y + 10;
  Sfx.play('tarRoom'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
  for (let i = 0; i < 40; i++) confetti(x, y);
  if (st.gerty) { st.gerty.say = 'Bye-bye, friends!'; st.gerty.sayT = 3; }
}
function tarNews(st, s, gold, life) { st.news = { s, gold: !!gold, t: 0, life: life || TAR.newsLife }; }
function tarPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || C.gold, size: size || 18, t: 0 }); if (st.pops.length > 14) st.pops.shift(); }
function tarProgressCheck(st) {
  for (const cr of st.cross) if (!cr.done && st.pl.every(s => s.zone > cr.k)) { cr.done = true; st.noProg = 0; Sfx.play('tarCross'); }
}
// which crossing the two of you are working on now, and who does what there
function tarActive(st) {
  const z0 = st.pl[0].zone, z1 = st.pl[1].zone, lo = Math.min(z0, z1);
  if (lo >= st.cross.length) return null;
  return st.cross[lo];
}
function tarHelp(st, dt) {
  st.noProg += dt;
  if (st.noProg >= TAR.goldStuck && !(st.help.slow && st.help.long && st.help.vine && (st.help.wait || !st.gerty))) {
    st.help.slow = st.help.long = st.help.vine = true; if (st.gerty) st.help.wait = true;
    tarNews(st, 'Gold help: slow tar, long lasso and gold vines!', true, 4.5); Sfx.play('tarGold');
  }
  if (!st.help.vine && st.roomVineFalls >= TAR.goldVine) { st.help.vine = true; tarNews(st, 'Gold help: gold vines! They drop you off on the other side', true); Sfx.play('tarGold'); }
  // Petey the pterodactyl shows the way when you've been at one spot a long time
  const pt = st.petey, hint = st.noProg >= TAR.peteyAfter && st.phase === 'play' ? tarHint(st) : null;
  pt.flap += dt;
  pt.on = !!hint;
  if (hint) {
    if (pt.t === 0) Sfx.play('tarPetey');
    pt.t += dt; pt.say = hint.s; pt.tx = clamp(hint.x, 70, W - 70); pt.ty = clamp(hint.y, 110, H - 140);
    pt.x += (pt.tx - pt.x) * Math.min(1, dt * 2); pt.y += (pt.ty + Math.sin(pt.t * 3) * 6 - pt.y) * Math.min(1, dt * 2);
  } else { pt.t = 0; pt.x += (W + 80 - pt.x) * Math.min(1, dt * 0.8); pt.y += (60 - pt.y) * Math.min(1, dt); }
}
// what to do next, in a few words (Petey and the nudge chips use it)
function tarHint(st) {
  const cr = tarActive(st);
  if (!cr) { const d = st.exit; return d ? { s: 'Both into the cave!', x: d.x + d.w / 2, y: d.y - 40 } : null; }
  const [a, b] = G.players, sa = st.pl[0], sb = st.pl[1];
  const stuck = [0, 1].find(k => st.pl[k].inTar);
  if (stuck != null) { const q = G.players[stuck]; return { s: 'Pull ' + NAMES[stuck] + ' out with the action!', x: tarCx(q), y: q.y - 60 }; }
  if (sa.zone !== sb.zone) {
    const behind = sa.zone < sb.zone ? 0 : 1, q = G.players[behind];
    if (cr.kind === 'gerty') return { s: 'Blow the horn for ' + NAMES[behind] + '!', x: (st.horns.find(h => h.cross === cr.k && h.side === 'F') || { x: W / 2 }).x, y: 280 };
    if (cr.kind === 'pass') return { s: 'Hook the vine and throw it back!', x: cr.x1 + 30, y: 280 };
    return { s: NAMES[behind] + ': hop in the tar, get pulled!', x: tarCx(q) + 40, y: q.y - 60 };
  }
  if (cr.kind === 'gerty') return { s: 'One blows the horn, one crosses!', x: (st.horns.find(h => h.cross === cr.k && h.side === 'N') || { x: 60 }).x + 40, y: 280 };
  if (cr.kind === 'pass') return { s: 'Hold the hook stump, the other swings!', x: cr.x0 - 30, y: 260 };
  if (cr.kind === 'push') return { s: 'Jump on the vine! Partner: push!', x: cr.x0 - 10, y: 230 };
  return { s: 'Jump to grab the vine!', x: cr.vine ? cr.vine.tieN.x : cr.x0, y: (cr.vine ? cr.vine.tieN.y : 300) - 60 };
}
function tarFx(st, dt) {
  st.pops = st.pops.filter(q => (q.t += dt) < 1.3);
  st.throwFx = st.throwFx.filter(q => (q.t += dt) < 0.5);
  st.ripples = st.ripples.filter(q => (q.t += dt) < 1.2);
  if (st.news) { st.news.t += dt; if (st.news.t > st.news.life) st.news = null; }
  for (const s of st.pl) { s.drip = Math.max(0, s.drip - dt); s.grabCD = Math.max(0, s.grabCD - dt); s.helpCD -= dt; s.shoutCD -= dt; s.waitCD -= dt; s.tooFarCD -= dt; s.bonkCD -= dt; }
  // a rider who let go and landed in the goo soon after: a vine fall (gold vines after a few)
  G.players.forEach((p, k) => {
    const s = st.pl[k];
    if (s.fallVine > 0) { s.fallVine -= dt; if (s.inTar) { s.fallVine = 0; st.roomVineFalls++; } else if (p.grounded) s.fallVine = 0; }
  });
  for (const v of st.vents) v.ph = Math.max(0, v.ph - dt);
}

/* ---------- the tick (ownStep) ---------- */
function tarStep(st, dt) {
  if (st.phase === 'won') {
    st.winT += dt; st.winTick++;
    if (st.winT < 1.0 && st.winTick % 14 === 0 && st.exit) confetti(st.exit.x + st.exit.w / 2, st.exit.y);
    // (anyone still flying or wading finishes; nobody steers)
    for (const p of G.players) { const ps = st.pl[p.id]; if (ps.fly) tarFly(st, p, ps, dt); }
    if (st.winT >= TAR.winHold) { const L = G.level; if (L.def.roomIndex < L.def.roomCount - 1) nextRoom(); else levelClear(); }
    tarFx(st, dt);
    return;
  }
  if (G.introT > TAR.introHold) { for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; } tarFx(st, dt); return; }
  st.roomT += dt;
  tarLogsStep(st, dt);
  tarGertyStep(st, dt);
  for (const p of G.players) {
    const ps = st.pl[p.id];
    if (!p.alive) continue;
    // the action button: a fresh press throws the lasso, pushes, or shouts; holding it hooks or calls
    if (p.pendingAct) {
      const act = p.pendingAct; p.pendingAct = false;
      if (act && tarFree(ps)) { if (!tarThrow(st, p, ps) && !tarTryPush(st, p) && !tarHornAt(st, p) && !st.stumps.some(s => Math.abs(tarCx(p) - s.x) <= TAR.hookReach)) tarShout(st, p, ps); }
      else if (ps.inTar) tarShout(st, p, ps);
      else if (ps.ride) p.pendingAct = true;   // (let go: the ride step reads it)
    }
    if (ps.fly) tarFly(st, p, ps, dt);
    else if (ps.ride) tarRide(st, p, ps, dt);
    else if (ps.inTar) tarWade(st, p, ps, dt);
    else { tarMoveNormal(st, p, ps, dt); tarHookCheck(st, p, ps); tarGrabCheck(st, p, ps); }
    p.pendingAct = false;
  }
  tarVinesStep(st, dt);
  tarLineStep(st, dt);
  tarVentsStep(st, dt);
  tarProgressCheck(st);
  tarExitStep(st, dt);
  tarHelp(st, dt);
  tarChipTimers(st, dt);
  tarFx(st, dt);
}

/* ---------- drawing: the swamp behind (cached), the tar in front ---------- */
let tarBack = null;
const TAR_STYLE = {
  steps: { glow: null, far: '#86b06a', farDark: '#6c9a58', volcano: [700, 0.9] },
  gully: { glow: null, far: '#7fa866', farDark: '#628f52', volcano: [180, 0.75] },
  logs: { glow: 'rgba(255,190,120,0.10)', far: '#8aa868', farDark: '#6f9256', volcano: [520, 1] },
  gerty: { glow: 'rgba(255,140,90,0.16)', far: '#9a9a6a', farDark: '#7f8458', volcano: [760, 0.8] },
};
function tarRrc(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function tarPaintBack(c, st, L) {
  const sty = TAR_STYLE[st.style] || TAR_STYLE.steps;
  if (sty.glow) { const gg = c.createLinearGradient(0, 0, 0, 380); gg.addColorStop(0, 'rgba(255,120,80,0)'); gg.addColorStop(1, sty.glow); c.fillStyle = gg; c.fillRect(0, 0, W, 380); }
  // the sleepy volcano far away
  const [vx, vs] = sty.volcano;
  c.save(); c.translate(vx, 330); c.scale(vs, vs);
  c.fillStyle = '#a08a9a'; c.beginPath(); c.moveTo(-170, 0); c.quadraticCurveTo(-70, -70, -34, -150); c.lineTo(34, -150); c.quadraticCurveTo(70, -70, 170, 0); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.moveTo(-34, -150); c.quadraticCurveTo(-60, -80, -120, -10); c.lineTo(-80, -10); c.quadraticCurveTo(-30, -80, -14, -150); c.closePath(); c.fill();
  c.fillStyle = '#ffb36a'; tarRrc(c, -30, -156, 60, 10, 5); c.fill();
  c.fillStyle = 'rgba(255,170,90,0.35)'; c.beginPath(); c.ellipse(0, -152, 46, 14, 0, 0, Math.PI * 2); c.fill();
  c.restore();
  // far jungle: rows of round tree crowns
  for (const [y0, col, n, sz] of [[316, sty.far, 22, 34], [338, sty.farDark, 26, 30]]) {
    c.fillStyle = col;
    c.beginPath(); c.moveTo(0, H);
    for (let i = 0; i <= n; i++) { const x = i * (W / n), r = sz * (0.7 + (hash(i, y0) % 50) / 100); c.lineTo(x, y0 - r * 0.4); c.arc(x + W / n / 2, y0 - r * 0.4, r * 0.62, Math.PI, 0); }
    c.lineTo(W, H); c.closePath(); c.fill();
  }
  // a far-away long-neck dino munching treetops
  c.fillStyle = 'rgba(70,110,80,0.55)';
  const dx = st.style === 'gully' ? 640 : st.style === 'logs' ? 200 : 380;
  c.beginPath(); c.ellipse(dx, 312, 34, 15, 0, 0, Math.PI * 2); c.fill();
  c.lineWidth = 9; c.strokeStyle = 'rgba(70,110,80,0.55)'; c.lineCap = 'round';
  c.beginPath(); c.moveTo(dx + 24, 306); c.quadraticCurveTo(dx + 48, 280, dx + 50, 254); c.stroke();
  c.beginPath(); c.moveTo(dx - 28, 312); c.quadraticCurveTo(dx - 58, 318, dx - 74, 306); c.stroke();
  c.beginPath(); c.ellipse(dx + 55, 251, 9, 6, 0.2, 0, Math.PI * 2); c.fill();
  // the gully: tall cliffs and a waterfall behind
  if (st.style === 'gully') {
    c.fillStyle = '#9a7f68'; c.fillRect(380, 120, 210, 200);
    c.fillStyle = 'rgba(255,255,255,0.08)'; for (let y = 130; y < 320; y += 26) c.fillRect(380, y, 210, 3);
    const wg = c.createLinearGradient(0, 120, 0, 320); wg.addColorStop(0, 'rgba(170,225,255,0.9)'); wg.addColorStop(1, 'rgba(210,240,255,0.6)');
    c.fillStyle = wg; c.fillRect(468, 110, 34, 210);
    c.fillStyle = 'rgba(255,255,255,0.6)'; for (let k = 0; k < 4; k++) c.fillRect(472 + k * 8, 110, 2, 210);
  }
  // palms and ferns (deco)
  for (const d of st.deco) tarPaintDeco(c, d);
  // the jungle canopy along the top, with a branch over every vine
  for (const v of st.vines) {
    c.strokeStyle = '#6a4a2e'; c.lineWidth = 9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(v.ax - 70, 8); c.quadraticCurveTo(v.ax - 20, 30, v.ax, v.ay); c.quadraticCurveTo(v.ax + 30, 34, v.ax + 80, 14); c.stroke();
    c.strokeStyle = '#8a6440'; c.lineWidth = 3; c.beginPath(); c.moveTo(v.ax - 60, 10); c.quadraticCurveTo(v.ax - 16, 28, v.ax, v.ay - 3); c.stroke();
  }
  for (let i = 0; i < 26; i++) {
    const x = i * 40 - 10 + (hash(i, 7) % 20), r = 22 + (hash(i, 9) % 18);
    c.fillStyle = i % 2 ? '#3f8f3a' : '#4fa244'; c.beginPath(); c.arc(x, -6 + (hash(i, 3) % 12), r, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = 'rgba(30,80,30,0.25)'; for (let i = 0; i < 26; i++) { const x = i * 40 + 6; c.beginPath(); c.arc(x, 10 + (hash(i, 5) % 10), 10, 0, Math.PI * 2); c.fill(); }
  // dark goo stains inside the pits (behind the tar)
  for (const rg of st.regions) if (!rg.shallow) { c.fillStyle = 'rgba(40,28,52,0.55)'; c.fillRect(rg.x0, rg.surf - 30, rg.x1 - rg.x0, 30); }
  // the banks: warm rock with moss on top
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    if (L.grid[ty][tx] !== '#') continue;
    const x = tx * T, y = ty * T, open = (a, b) => tile(a, b) !== '#';
    let depth = 0; while (depth < 6 && ty - depth - 1 >= 0 && (L.grid[ty - depth - 1][tx] === '#' || L.grid[ty - depth - 1][tx] === 't')) depth++;   // (tar counts: rock under a pit is as deep as the banks)
    c.fillStyle = ['#a07a52', '#916c48', '#80603f', '#715438', '#634a32', '#58422d'][Math.min(5, depth)];
    c.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    const h = hash(tx, ty);
    c.fillStyle = 'rgba(255,230,190,0.12)'; if (h % 3 === 0) { tarRrc(c, x + 4 + (h % 12), y + 9 + ((h >> 3) % 10), 9, 5, 2.5); c.fill(); }
    c.fillStyle = 'rgba(60,40,25,0.25)'; if (h % 4 === 1) { tarRrc(c, x + 3 + ((h >> 5) % 14), y + 6 + ((h >> 2) % 14), 7, 4, 2); c.fill(); }
    if (open(tx - 1, ty)) { c.fillStyle = 'rgba(50,32,20,0.45)'; c.fillRect(x, y, 3, T); }
    if (open(tx + 1, ty)) { c.fillStyle = 'rgba(50,32,20,0.45)'; c.fillRect(x + T - 3, y, 3, T); }
    if (ty > 0 && open(tx, ty - 1) && tile(tx, ty - 1) !== 't') {
      c.fillStyle = '#3f8f3a'; c.fillRect(x, y, T, 9);
      c.fillStyle = '#7ccf4f'; c.fillRect(x, y, T, 6);
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x + 5 + i * 10, y + 6, 3.4, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#9be36a'; c.fillRect(x, y, T, 2);
      // grass tufts and tiny flowers
      c.strokeStyle = '#4fa244'; c.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) { const gx = x + 6 + ((h >> (i * 4)) % 18); c.beginPath(); c.moveTo(gx, y + 1); c.lineTo(gx - 2, y - 5); c.moveTo(gx, y + 1); c.lineTo(gx + 2, y - 6); c.stroke(); }
      if (h % 5 === 0) { const fx = x + 8 + (h % 14); c.fillStyle = ['#ff9ac1', '#ffe066', '#ffffff'][h % 3]; for (let k = 0; k < 5; k++) { const a = k * 1.256; c.beginPath(); c.arc(fx + Math.cos(a) * 2.4, y - 6 + Math.sin(a) * 2.4, 1.8, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#ffb347'; c.beginPath(); c.arc(fx, y - 6, 1.4, 0, Math.PI * 2); c.fill(); }
    }
    if (ty > 0 && tile(tx, ty - 1) === 't') { c.fillStyle = '#4a3a2a'; c.fillRect(x, y, T, 4); }
  }
}
function tarPaintDeco(c, d) {
  const x = d.x, y = d.y;
  if (d.k === 'palm') {
    const h = d.h || 150, lean = d.lean || 0.15;
    c.strokeStyle = '#8a6440'; c.lineWidth = 10; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * h * 0.3, y - h * 0.5, x + lean * h, y - h); c.stroke();
    c.strokeStyle = 'rgba(60,40,25,0.4)'; c.lineWidth = 2;
    for (let k = 1; k < 8; k++) { const u = k / 8, px = x + lean * h * (0.3 * 2 * u * (1 - u) + u * u), py = y - h * u; c.beginPath(); c.moveTo(px - 5, py + 2); c.lineTo(px + 5, py - 1); c.stroke(); }
    const tx = x + lean * h, ty = y - h;
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k - 2.5) * 0.62, len = 52 + (k % 2) * 12;
      c.fillStyle = k % 2 ? '#4fa244' : '#5cb84d';
      c.beginPath(); c.moveTo(tx, ty);
      c.quadraticCurveTo(tx + Math.cos(a - 0.3) * len * 0.6, ty + Math.sin(a - 0.3) * len * 0.6 - 8, tx + Math.cos(a) * len, ty + Math.sin(a) * len + 18);
      c.quadraticCurveTo(tx + Math.cos(a + 0.3) * len * 0.6, ty + Math.sin(a + 0.3) * len * 0.6, tx, ty); c.fill();
    }
    c.fillStyle = '#7a5a30'; for (const [ox, oy] of [[-5, 4], [4, 6], [0, 9]]) { c.beginPath(); c.arc(tx + ox, ty + oy, 4.5, 0, Math.PI * 2); c.fill(); }
  } else if (d.k === 'fern') {
    const s = d.s || 1;
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.38, len = (34 + (k % 3) * 8) * s;
      c.strokeStyle = k % 2 ? '#3f8f3a' : '#57a84a'; c.lineWidth = 3;
      const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len * 0.9;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5 - 6, ex, ey + 6); c.stroke();
      c.fillStyle = c.strokeStyle;
      for (let j = 1; j < 6; j++) { const u = j / 6, px = x + (ex - x) * u, py = y + (ey + 6 - y) * u - 6 * Math.sin(u * Math.PI); c.beginPath(); c.ellipse(px, py, 5 * s * (1 - u * 0.5), 2 * s, a + 1.2, 0, Math.PI * 2); c.fill(); }
    }
  } else if (d.k === 'rock') {
    c.fillStyle = '#8f7a66'; c.beginPath(); c.ellipse(x, y, d.w || 26, 14, 0, Math.PI, 0); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.15)'; c.beginPath(); c.ellipse(x - 6, y - 8, 8, 4, -0.3, 0, Math.PI * 2); c.fill();
  } else if (d.k === 'reeds') {
    for (let k = 0; k < 5; k++) {
      const rx = x + k * 7 - 14, h = 40 + (hash(k, x) % 20);
      c.strokeStyle = '#6f9a3c'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(rx, y); c.quadraticCurveTo(rx + 3, y - h * 0.5, rx + (k - 2) * 2, y - h); c.stroke();
      if (k % 2 === 0) { c.fillStyle = '#7a4f2a'; tarRrc(c, rx + (k - 2) * 2 - 3, y - h - 2, 6, 14, 3); c.fill(); }
    }
  } else if (d.k === 'sign') {
    c.fillStyle = '#7d5530'; c.fillRect(x - 3, y - 44, 6, 44);
    c.font = '13px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = Math.max(70, c.measureText(d.text || '').width + 20);
    c.fillStyle = '#c9925a'; tarRrc(c, x - w / 2, y - 64, w, 26, 6); c.fill();
    c.strokeStyle = '#7d5530'; c.lineWidth = 2; tarRrc(c, x - w / 2, y - 64, w, 26, 6); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#3a2410';
    c.fillText(d.text || '', x, y - 50.5);
  } else if (d.k === 'bones') {   // a friendly old fossil, half buried in the bank
    c.fillStyle = 'rgba(255,248,230,0.55)';
    for (let k = 0; k < 4; k++) { tarRrc(c, x + k * 12 - 20, y - 4 - (k % 2) * 3, 9, 4, 2); c.fill(); }
    c.beginPath(); c.ellipse(x + 30, y - 4, 7, 5, 0, 0, Math.PI * 2); c.fill();
  } else if (d.k === 'eggs') {
    c.fillStyle = '#c9a26a'; c.beginPath(); c.ellipse(x, y - 4, 30, 9, 0, 0, Math.PI * 2); c.fill();
    for (const [ox, col] of [[-12, '#f4f0dc'], [0, '#ffe6a8'], [12, '#e6f4dc']]) { c.fillStyle = col; c.beginPath(); c.ellipse(x + ox, y - 12, 7, 10, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(120,160,110,0.5)'; c.beginPath(); c.arc(x + ox - 2, y - 14, 1.6, 0, Math.PI * 2); c.fill(); }
  }
}
function tarDrawBack(st) {
  const L = G.level, cw = canvas.width, ch = canvas.height;
  try {
    if (!tarBack || tarBack.L !== L || tarBack.cv.width !== cw || tarBack.cv.height !== ch) {
      const cv = (tarBack && tarBack.cv) || document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      const c = cv.getContext('2d');
      c.setTransform(cw / W, 0, 0, ch / H, 0, 0); c.clearRect(0, 0, W, H);
      tarPaintBack(c, st, L);
      tarBack = { cv, L };
    }
    ctx.drawImage(tarBack.cv, 0, 0, W, H);
  } catch (e) { tarBack = null; tarPaintBack(ctx, st, L); }
}
// volcano smoke and dragonflies (alive, so not cached)
function tarDrawLife(st, t) {
  const sty = TAR_STYLE[st.style] || TAR_STYLE.steps, [vx, vs] = sty.volcano;
  for (let k = 0; k < 4; k++) {
    const u = ((t * 0.12 + k / 4) % 1), sx = vx + Math.sin(u * 5 + k) * 10 * vs + u * 30 * vs, sy = 330 - 156 * vs - u * 90 * vs;
    ctx.fillStyle = 'rgba(240,235,245,' + (0.5 * (1 - u)).toFixed(3) + ')'; circle(sx, sy, (8 + u * 18) * vs); ctx.fill();
  }
  if (reduceMotion) return;
  for (let k = 0; k < 2; k++) {
    const x = (t * (30 + k * 12) + k * 400) % (W + 100) - 50, y = 150 + k * 60 + Math.sin(t * 2 + k) * 18;
    ctx.fillStyle = k ? '#5bc0eb' : '#ff9a5a'; rr(x - 7, y - 1.5, 14, 3, 1.5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; const f = Math.sin(t * 40) * 3;
    ctx.beginPath(); ctx.ellipse(x - 1, y - 3, 5, Math.max(0.5, 2 + f * 0.3), -0.4, 0, Math.PI * 2); ctx.ellipse(x + 2, y - 3, 5, Math.max(0.5, 2 - f * 0.3), 0.4, 0, Math.PI * 2); ctx.fill();
  }
}
function tarDrawVine(st, v, t) {
  const tp = tarTip(v), a = { x: v.ax, y: v.ay };
  const sway = v.state === 'rest' && !reduceMotion ? Math.sin(t * 1.3 + v.sway) * 4 : 0;
  const ex = tp.x + sway, ey = tp.y;
  // a springy green vine: a gentle curve
  const mx = (a.x + ex) / 2 + (v.state === 'rest' ? sway * 1.5 : (ex - a.x) * 0.05), my = (a.y + ey) / 2 + 10;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3c7a2e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
  ctx.strokeStyle = v.state === 'tied' || v.state === 'hooked' ? '#8fdc5a' : '#6fbf47'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
  for (let k = 1; k < 7; k++) {
    const u = k / 7, px = (1 - u) * (1 - u) * a.x + 2 * u * (1 - u) * mx + u * u * ex, py = (1 - u) * (1 - u) * a.y + 2 * u * (1 - u) * my + u * u * ey;
    const side = k % 2 ? 1 : -1, wob = reduceMotion ? 0 : Math.sin(t * 2 + k + v.sway) * 0.2;
    ctx.fillStyle = k % 2 ? '#5cb84d' : '#4fa244';
    ctx.beginPath(); ctx.ellipse(px + side * 6, py, 6, 3, side * 0.6 + wob, 0, Math.PI * 2); ctx.fill();
  }
  // the leafy handle (gold with gold vines)
  const gold = st.help.vine, wave = v.wave > 0 ? Math.sin(v.wave * 30) * 3 : 0;
  if (gold) { ctx.fillStyle = 'rgba(255,197,61,0.35)'; circle(ex + wave, ey, 13); ctx.fill(); }
  ctx.fillStyle = gold ? C.gold : '#9be36a'; ctx.strokeStyle = '#2f6b26'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(ex + wave, ey + 2, 6, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#4fa244'; ctx.beginPath(); ctx.ellipse(ex + wave - 6, ey + 6, 6, 3, 0.7, 0, Math.PI * 2); ctx.ellipse(ex + wave + 6, ey + 6, 6, 3, -0.7, 0, Math.PI * 2); ctx.fill();
  // tied: a little stake and a string to it
  if (v.state === 'tied' || v.state === 'retie') {
    const sx = v.tieN.x - 8, sy = tarGroundAt(st, v.tieN.x - 16);
    ctx.fillStyle = '#7d5530'; rr(sx - 3, sy - 16, 6, 18, 2); ctx.fill();
    ctx.fillStyle = '#a0703c'; rr(sx - 4, sy - 18, 8, 4, 2); ctx.fill();
    if (v.state === 'tied') { ctx.strokeStyle = '#6fbf47'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(sx, sy - 12); ctx.quadraticCurveTo((sx + ex) / 2, (sy - 12 + ey) / 2 + 6, ex, ey + 6); ctx.stroke(); }
  }
}
function tarDrawStump(st, s, t) {
  const x = s.x, y = s.y, v = st.cross[s.cross] && st.cross[s.cross].vine, busy = v && v.hk && v.hk.side === s.side;
  ctx.fillStyle = '#7d5530'; rr(x - 13, y - 18, 26, 18, 4); ctx.fill();
  ctx.fillStyle = '#c9925a'; ctx.beginPath(); ctx.ellipse(x, y - 18, 13, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - 18, 7, 2.4, 0, 0, Math.PI * 2); ctx.stroke();
  if (!busy) {
    // the hook stick leans on it, glowing when its vine can be hooked
    const dir = s.side === 'N' ? 1 : -1;
    if (v && (v.state === 'rest' || v.state === 'free')) { ctx.fillStyle = 'rgba(255,230,120,' + (0.3 + 0.15 * Math.sin(t * 4)).toFixed(3) + ')'; circle(x + dir * 18, y - 54, 10); ctx.fill(); }
    ctx.strokeStyle = '#a0703c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - dir * 10, y); ctx.lineTo(x + dir * 14, y - 50); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + dir * 19, y - 50, 5.5, Math.PI, Math.PI * 2); ctx.stroke();
  }
}
function tarDrawHorn(st, h, t) {
  const x = h.x, y = h.y, k = h.t;
  ctx.fillStyle = '#8f7a66'; ctx.beginPath(); ctx.ellipse(x, y, 18, 9, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#7d5530'; rr(x - 3, y - 34, 6, 28, 2); ctx.fill();
  ctx.save(); ctx.translate(x, y - 40); ctx.rotate(-0.25 - k * 0.2); ctx.scale(1 + k * 0.12, 1 + k * 0.12);
  ctx.fillStyle = '#ffd9a0'; ctx.strokeStyle = '#b07a3a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-14, 6); ctx.quadraticCurveTo(-6, -10, 16, -12); ctx.lineTo(18, 8); ctx.quadraticCurveTo(0, 2, -14, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffeccc'; ctx.beginPath(); ctx.ellipse(17, -2, 4, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#c98a4a'; ctx.beginPath(); ctx.arc(-8, 2, 5, 0, Math.PI * 1.6); ctx.stroke();
  ctx.restore();
  if (k > 0) for (let i = 0; i < 2; i++) {   // musical notes while it's blown
    const u = (1 - k) + i * 0.3, nx = x + 22 + u * 30, ny = y - 56 - u * 30;
    ctx.globalAlpha = clamp(k * 1.5 - i * 0.3, 0, 1); ctx.fillStyle = '#3f8f3a';
    circle(nx, ny, 3.5); ctx.fill(); ctx.fillRect(nx + 2.5, ny - 12, 2, 12);
    ctx.globalAlpha = 1;
  }
}
function tarDrawLog(st, lg, t) {
  const top = tarLogTop(lg), x0 = lg.x0 - 2, x1 = lg.x1 + 2, h = 22;
  ctx.fillStyle = '#8a5a30'; rr(x0, top, x1 - x0, h, 10); ctx.fill();
  ctx.fillStyle = '#a8703c'; rr(x0, top, x1 - x0, 8, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(60,35,15,0.5)'; ctx.lineWidth = 1.5;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x0 + 12 + k * 14, top + 10); ctx.lineTo(x0 + 22 + k * 14, top + 12); ctx.stroke(); }
  for (const ex of [x0 + 5, x1 - 5]) {
    ctx.fillStyle = '#d9a86a'; ctx.beginPath(); ctx.ellipse(ex, top + h / 2, 5, h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a0703c'; ctx.beginPath(); ctx.ellipse(ex, top + h / 2, 2.5, h / 4, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // a little mushroom friend on top
  ctx.fillStyle = '#ff7a6a'; ctx.beginPath(); ctx.ellipse(x1 - 16, top, 6, 5, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(x1 - 17.5, top, 3, 3); circle(x1 - 18, top - 2.5, 1.1); ctx.fill();
  // its lower half sits in the goo (all of it, once it has gone glug)
  const wl = (tarSurfAt(st, (lg.x0 + lg.x1) / 2) || 394) + 8, sub = Math.max(top, wl);
  if (sub < top + h) {
    ctx.fillStyle = 'rgba(36,26,50,0.82)'; ctx.fillRect(x0 - 1, sub, x1 - x0 + 2, top + h - sub + 1);
    ctx.strokeStyle = 'rgba(170,150,210,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 - 2, sub); ctx.lineTo(x1 + 2, sub); ctx.stroke();
  }
  if (lg.down) { ctx.fillStyle = 'rgba(36,26,50,0.55)'; rr(x0, top, x1 - x0, h, 10); ctx.fill(); }
  // two on it: worried sweat drops
  if (lg.load === 2 && !reduceMotion) { ctx.fillStyle = '#8fd8ff'; for (const ox of [-8, 8]) { const yy = top - 20 - ((t * 30 + ox + 20) % 14); ctx.beginPath(); ctx.ellipse((x0 + x1) / 2 + ox, yy, 2, 3, 0, 0, Math.PI * 2); ctx.fill(); } }
}
function tarBez(pts, u) {
  const [a, b, c] = pts, k = 1 - u;
  return { x: k * k * a.x + 2 * k * u * b.x + u * u * c.x, y: k * k * a.y + 2 * k * u * b.y + u * u * c.y };
}
// Gerty the brontosaurus: lying down as a bridge (d = 1) or standing up tall (d = 0)
function tarDrawGerty(st, gt, t) {
  const d = tarEase(gt.d), w = gt.x1 - gt.x0, surf = 394;
  const bx = gt.x0 + w * 0.5, bodyTopDown = tarGertyY(gt, bx);
  const breathe = reduceMotion ? 0 : Math.sin(gt.hum * 1.6) * 1.5;
  const bodyY = bodyTopDown - (1 - d) * 26 + breathe;
  const col = '#5fbf8f', dark = '#2f7a58', belly = '#b8f0c8';
  const tube = (pts, r0, r1) => {
    const n = 24;
    ctx.fillStyle = dark; for (let i = 0; i <= n; i++) { const u = i / n, p = tarBez(pts, u); circle(p.x, p.y, r0 + (r1 - r0) * u + 2.2); ctx.fill(); }
    ctx.fillStyle = col; for (let i = 0; i <= n; i++) { const u = i / n, p = tarBez(pts, u); circle(p.x, p.y, r0 + (r1 - r0) * u); ctx.fill(); }
  };
  // legs (into the goo)
  ctx.fillStyle = dark;
  for (const lx of [-0.22, -0.08, 0.1, 0.24]) { rr(bx + lx * w - 11, bodyY + 30, 22, surf - bodyY, 9); ctx.fill(); }
  // tail: from the body to the tip (lying on the near bank, or curled up high)
  const tailTip = { x: gt.x0 + 4 + (1 - d) * 50, y: gt.yN - 6 - (1 - d) * 100 };
  const tLeft = { x: bx - w * 0.26, y: bodyY + 22 };
  const tMid = { x: gt.x0 + w * 0.1, y: d * (tarGertyY(gt, gt.x0 + w * 0.1) + 10) + (1 - d) * (bodyY + 26) };
  tube([tLeft, tMid, tailTip], 21, 6);
  // neck and head (resting on the far bank, or way up high)
  const head = { x: gt.x1 - 10 - (1 - d) * 46, y: gt.yF - 16 - (1 - d) * 190 };
  const nBase = { x: bx + w * 0.26, y: bodyY + 18 };
  const nMid = { x: head.x - 34 - (1 - d) * 6, y: d * (tarGertyY(gt, gt.x0 + w * 0.8) + 12) + (1 - d) * (bodyY - 70) };
  tube([nBase, nMid, { x: head.x - 10, y: head.y + 6 }], 21, 11);
  // body
  ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(bx, bodyY + 30, w * 0.34 + 2, 36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(bx, bodyY + 30, w * 0.34, 34, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(bx, bodyY + 50, w * 0.27, 14, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = 'rgba(40,120,80,0.4)';
  for (const [ox, oy, r] of [[-30, 14, 7], [0, 8, 9], [28, 16, 6], [-12, 28, 5], [44, 26, 5], [-52, 26, 4]]) { circle(bx + ox, bodyY + oy, r); ctx.fill(); }
  // little leaf "steps" along her back while she's down (the path to walk)
  if (d > 0.5) {
    ctx.globalAlpha = (d - 0.5) * 2;
    for (let k = 0; k < 9; k++) { const x = gt.x0 + 26 + k * (w - 52) / 8, y = tarGertyY(gt, x); ctx.fillStyle = k % 2 ? '#ffe066' : '#ff9ac1'; circle(x, y + 5, 2.6); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  // head
  ctx.save(); ctx.translate(head.x, head.y); ctx.rotate(d > 0.5 ? 0.12 : -0.1);
  ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(0, 0, 23, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, 21, 14, 0, 0, Math.PI * 2); ctx.fill();
  const look = gt.look * 2, blink = gt.blink > 0;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-3, -4, 5.8, 6.4, 0, 0, Math.PI * 2); ctx.fill();
  if (blink) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8.5, -4); ctx.lineTo(2.5, -4); ctx.stroke(); }
  else { ctx.fillStyle = C.ink; circle(-3 + look, -3, 2.8); ctx.fill(); ctx.fillStyle = '#fff'; circle(-2 + look, -4.6, 1); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
  for (const a of [-2.4, -2.0, -1.6]) { ctx.beginPath(); ctx.moveTo(-3 + Math.cos(a) * 6.4, -4 + Math.sin(a) * 6.8); ctx.lineTo(-3 + Math.cos(a) * 9.5, -4 + Math.sin(a) * 10); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,120,150,0.5)'; circle(7, 5, 3.6); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(10, 1, 7, 0.25, 1.35); ctx.stroke();
  ctx.fillStyle = C.ink; circle(18, -3, 1.3); ctx.fill();
  ctx.fillStyle = '#ff9ac1'; for (let k = 0; k < 5; k++) { const a = k * 1.256; circle(-15 + Math.cos(a) * 3, -11 + Math.sin(a) * 3, 2.4); ctx.fill(); }
  ctx.fillStyle = '#ffe066'; circle(-15, -11, 1.8); ctx.fill();
  ctx.restore();
  if (gt.sayT > 0) tarSpeech(gt.say, head.x, head.y - 24, '#2f7a58');
}
function tarSpeech(s, x, y, edge) {
  const z = tarBig() ? 1.35 : 1, fs = Math.round(14 * z);
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(s).width + 18 * z, h = 24 * z, bx = clamp(x - w / 2, 6, W - 6 - w), by = clamp(y - h, 80, H - h - 6);
  ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = edge || C.ink; ctx.lineWidth = 2; rr(bx, by, w, h, 10); ctx.fill(); ctx.stroke();
  const tx = clamp(x, bx + 10, bx + w - 10);
  ctx.beginPath(); ctx.moveTo(tx - 5, by + h - 1); ctx.lineTo(tx + 5, by + h - 1); ctx.lineTo(tx, by + h + 6); ctx.closePath(); ctx.fill();
  text(s, bx + w / 2, by + h / 2 + 0.5, fs, C.ink, 'center', 'body');
}
function tarDrawExit(st, t) {
  const d = st.exit; if (!d) return;
  const x = d.x + d.w / 2, y = d.y + d.h, last = G.level.def.roomIndex >= G.level.def.roomCount - 1;
  // a cozy cave in a rock pile
  ctx.fillStyle = '#8f7a66'; ctx.beginPath(); ctx.moveTo(x - 46, y); ctx.quadraticCurveTo(x - 50, y - 62, x - 6, y - 74); ctx.quadraticCurveTo(x + 46, y - 74, x + 48, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.ellipse(x - 22, y - 56, 14, 6, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2c2030'; ctx.beginPath(); ctx.moveTo(x - 26, y); ctx.quadraticCurveTo(x - 28, y - 50, x, y - 52); ctx.quadraticCurveTo(x + 28, y - 50, x + 26, y); ctx.closePath(); ctx.fill();
  const glow = 0.35 + 0.15 * Math.sin(t * 3) + (st.exitT > 0 ? 0.3 : 0);
  ctx.fillStyle = 'rgba(255,210,120,' + glow.toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(x, y - 14, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4fa244'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x - 30 + k * 15, y - 70 + (k % 2) * 6, 9, 4, (k - 2) * 0.4, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#7d5530'; ctx.fillRect(x - 64, y - 40, 4, 40);
  ctx.fillStyle = '#c9925a'; rr(x - 86, y - 56, 48, 20, 5); ctx.fill();
  text(last ? 'HOME' : 'GO!', x - 62, y - 45.5, 12, '#3a2410', 'center');
}
// the goo in front: everything below the surface is hidden in thick, glossy, bubbly tar
function tarDrawTar(st, t) {
  for (const rg of st.regions) {
    const x0 = rg.x0, x1 = rg.x1, s = rg.surf, b = rg.bot;
    const gr = ctx.createLinearGradient(0, s, 0, b); gr.addColorStop(0, '#3a2c4e'); gr.addColorStop(0.35, '#241a32'); gr.addColorStop(1, '#140e1c');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(x0, b);
    for (let x = x0; x <= x1; x += 6) {
      let y = s + (reduceMotion ? 0 : Math.sin(x * 0.07 + t * 1.6) * 1.2 + Math.sin(x * 0.023 - t) * 0.8);
      for (const rp of st.ripples) { const dx = x - rp.x; if (Math.abs(dx) < 50 && Math.abs(rp.y - s) < 2) y += Math.sin(dx * 0.25 - rp.t * 12) * (rp.big ? 3 : 1.6) * (1 - rp.t / 1.2) * (1 - Math.abs(dx) / 50); }
      for (let k = 0; k < 2; k++) { const p = G.players[k]; if (st.pl[k].inTar && Math.abs(tarCx(p) - x) < 16) y -= 3 * (1 - Math.abs(tarCx(p) - x) / 16); }
      ctx.lineTo(x, y);
    }
    ctx.lineTo(x1, b); ctx.closePath(); ctx.fill();
    // the glossy shine (amber with slow tar)
    ctx.strokeStyle = st.help.slow ? 'rgba(255,197,61,0.6)' : 'rgba(170,150,210,0.45)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = x0 + 4; x <= x1 - 4; x += 6) { const y = s + 3 + (reduceMotion ? 0 : Math.sin(x * 0.07 + t * 1.6) * 1.2); if (x === x0 + 4) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,180,240,0.16)';
    for (let k = 0; k < Math.floor((x1 - x0) / 60) + 1; k++) { const hx = x0 + ((hash(k, x0) % 1000) / 1000) * (x1 - x0 - 20) + 10 + (reduceMotion ? 0 : Math.sin(t * 0.5 + k) * 6); ctx.beginPath(); ctx.ellipse(hx, s + 11 + (k % 2) * 6, 10, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
    // little bubbles that rise and pop
    if (!reduceMotion) for (let k = 0; k < Math.floor((x1 - x0) / 40) + 1; k++) {
      const per = 2.2 + (hash(k, x1) % 100) / 60, u = ((t + (hash(x0, k) % 100) / 30) % per) / per;
      const bx = x0 + 8 + (hash(k * 7, x0) % Math.max(1, (x1 - x0 - 16)));
      if (u < 0.75) { const r = 1.5 + u * 5; ctx.fillStyle = 'rgba(90,72,120,0.9)'; ctx.beginPath(); ctx.arc(bx, s + 1, r, Math.PI, 0); ctx.fill(); ctx.fillStyle = 'rgba(220,200,255,0.5)'; circle(bx - r * 0.4, s - r * 0.5, r * 0.25); ctx.fill(); }
      else { const k2 = (u - 0.75) / 0.25; ctx.strokeStyle = 'rgba(160,140,200,' + (0.6 * (1 - k2)).toFixed(3) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(bx, s, 4 + k2 * 8, 1.5 + k2 * 2, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
  }
  // the big bubble vents (Sinking Logs)
  for (const vt of st.vents) {
    const s = tarSurfAt(st, vt.x) || 394;
    if (vt.ph > 0) { const k = 1 - vt.ph / 0.5; ctx.strokeStyle = 'rgba(200,180,255,' + (0.8 * (1 - k)).toFixed(3) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(vt.x, s - 4, 10 + k * 26, 4 + k * 8, 0, 0, Math.PI * 2); ctx.stroke(); }
    else {
      const r = 4 + vt.grow * 16, wob = reduceMotion ? 0 : Math.sin(t * 9) * vt.grow;
      ctx.fillStyle = 'rgba(80,62,110,0.95)'; ctx.beginPath(); ctx.ellipse(vt.x, s + 2, r + wob, Math.max(1, r * 0.9 - wob), 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(230,215,255,0.55)'; ctx.beginPath(); ctx.ellipse(vt.x - r * 0.4, s - r * 0.45, r * 0.22, r * 0.14, -0.5, 0, Math.PI * 2); ctx.fill();
    }
  }
}
// players in the goo: tar on their body, a silly stuck face, a waving hand when deep
function tarDrawStuck(st, t) {
  G.players.forEach((p, k) => {
    const ps = st.pl[k];
    if (!p.alive) return;
    const cx = tarCx(p), top = p.y + p.h - p.h * p.sy;
    if (ps.inTar) {
      const s = tarSurfAt(st, cx) || p.y + p.h;
      ctx.fillStyle = '#2a2038'; ctx.beginPath(); ctx.ellipse(cx, s, p.w * 0.75, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(180,160,220,0.4)'; ctx.beginPath(); ctx.ellipse(cx - 5, s - 2, 5, 1.4, 0, 0, Math.PI * 2); ctx.fill();
      if (ps.stuck) {
        const sh = ps.wigShake > 0 && !reduceMotion ? Math.sin(t * 60) * 2.5 : 0;
        const ey = top + p.h * 0.36;
        if (ey < s - 2) {
          // big worried eyes looking around, a tiny "o" mouth, a sweat drop
          const look = reduceMotion ? 0 : Math.sin(t * 2.3 + k) * 1.6;
          for (const ex of [-5, 5]) { ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; circle(cx + ex + sh, ey, 4.6); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.ink; circle(cx + ex + sh + look, ey + 0.5, 1.5); ctx.fill(); }
          if (ey + 7 < s) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(cx + sh, ey + 7, 2.2, 2.8, 0, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = '#8fd8ff'; ctx.beginPath(); ctx.moveTo(cx + p.w / 2 + 2, top - 3); ctx.quadraticCurveTo(cx + p.w / 2 + 6, top + 3, cx + p.w / 2 + 2, top + 5); ctx.quadraticCurveTo(cx + p.w / 2 - 2, top + 3, cx + p.w / 2 + 2, top - 3); ctx.fill();
        } else {
          // deep: just a hand waving above the goo
          const hx = cx + 8 + (reduceMotion ? 0 : Math.sin(t * 8) * 4), hy = s - 12;
          ctx.strokeStyle = PDARK[k]; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + 6, s); ctx.lineTo(hx, hy); ctx.stroke();
          ctx.fillStyle = PCOL[k]; circle(hx, hy, 4.5); ctx.fill();
          if (!reduceMotion && Math.floor(t * 3 + k) % 2 === 0) { ctx.fillStyle = 'rgba(200,180,255,0.7)'; circle(cx - 4, s - 4 - ((t * 20) % 10), 2); ctx.fill(); }
        }
        // the sink meter: a ring that empties (deep tar only)
        const rg = tarRegionAt(st, cx);
        if (rg && !rg.shallow) {
          const k2 = clamp(ps.sinkT / (st.help.slow ? TAR.sinkGold : TAR.sinkT), 0, 1), my = Math.min(top, s - 20) - 12;
          ctx.strokeStyle = 'rgba(28,26,54,0.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, my, 7, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = k2 > 0.7 ? '#ff9ac1' : st.help.slow ? C.gold : '#c8b8ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, my, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k2)); ctx.stroke();
        }
        if (sh) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; for (const dd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + dd * (p.w / 2 + 4), Math.min(top + 6, s - 4)); ctx.lineTo(cx + dd * (p.w / 2 + 9), Math.min(top + 2, s - 8)); ctx.stroke(); } }
      }
    }
    // goo drips after a Shlorp or a Bloop
    if (ps.drip > 0 && !ps.inTar) {
      ctx.fillStyle = 'rgba(42,32,56,' + Math.min(1, ps.drip).toFixed(3) + ')';
      const by = p.y + p.h;
      for (const [ox, ph] of [[-6, 0], [2, 0.4], [7, 0.8]]) { const dy = ((t * 1.6 + ph) % 1) * 10; ctx.beginPath(); ctx.ellipse(cx + ox, by - 5 + dy, 2.2, 3.2, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(cx, by - 4, p.w * 0.45, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
    // a rider's arms up to the vine
    if (ps.ride) {
      const tp = tarTip(ps.ride);
      ctx.strokeStyle = PDARK[k]; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - 6, p.y + 8); ctx.lineTo(tp.x - 2, tp.y + 2); ctx.moveTo(cx + 6, p.y + 8); ctx.lineTo(tp.x + 2, tp.y + 2); ctx.stroke();
    }
    // the hook stick, from the hooker's hands to the vine
    if (ps.hooking && ps.hooking.hk) {
      const tp = tarTip(ps.hooking);
      ctx.strokeStyle = '#a0703c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx + p.face * 6, p.y + 10); ctx.lineTo(tp.x, tp.y + 4); ctx.stroke();
      ctx.beginPath(); ctx.arc(tp.x, tp.y, 5, 0, Math.PI); ctx.stroke();
    }
  });
}
function tarDrawLine(st, t) {
  for (const f of st.throwFx) {
    const p = G.players[f.from], k = f.t / 0.5;
    let ex, ey;
    if (f.hit != null) { const o = G.players[f.hit]; const u = Math.min(1, k * 2.5); ex = tarCx(p) + (tarCx(o) - tarCx(p)) * u; ey = p.y + 8 + (o.y - p.y) * u; }
    else { const u = Math.min(1, k * 1.6); ex = f.x + f.dir * f.len * u; ey = f.y - 40 * Math.sin(u * Math.PI) + u * u * 70; }
    ctx.globalAlpha = f.hit != null ? 1 : clamp(1.6 - k * 1.6, 0, 1);
    ctx.strokeStyle = '#6fbf47'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tarCx(p), p.y + 8); ctx.quadraticCurveTo((tarCx(p) + ex) / 2, Math.min(p.y, ey) - 30, ex, ey); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const ln = st.line;
  if (!ln) return;
  const pu = G.players[ln.from], sp = G.players[ln.to];
  const ax = tarCx(pu) - ln.dir * 4, ay = pu.y + 10, bx = tarCx(sp), by = sp.y + 6;
  const sag = 30 * (1 - clamp(ln.prog, 0, 1));
  ctx.strokeStyle = '#3c7a2e'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + sag, bx, by); ctx.stroke();
  ctx.strokeStyle = '#8fdc5a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + sag, bx, by); ctx.stroke();
  ctx.fillStyle = PCOL[sp.id]; circle(bx, by, 4); ctx.fill();
  // the pull meter over the puller
  const z = tarBig() ? 1.3 : 1, mw = 46 * z, mh = 8 * z, mx = clamp(tarCx(pu) - mw / 2, 6, W - mw - 6), my = pu.y - 30 * z;
  ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(mx - 3, my - 3, mw + 6, mh + 6, (mh + 6) / 2); ctx.fill();
  ctx.fillStyle = '#8fdc5a'; rr(mx, my, Math.max(mh, mw * clamp(ln.prog, 0, 1)), mh, mh / 2); ctx.fill();
}
function tarDrawPetey(st, t) {
  const pt = st.petey;
  if (pt.x > W + 60 || pt.x < -70) return;
  const x = pt.x, y = pt.y, f = reduceMotion ? 0 : Math.sin(pt.flap * 9);
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#e8743a';
  ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-34, -14 - f * 12); ctx.lineTo(-22, 4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(34, -14 - f * 12); ctx.lineTo(22, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff9a5a'; ctx.beginPath(); ctx.ellipse(0, 2, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(10, -6, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14, -8); ctx.lineTo(28, -4); ctx.lineTo(14, -3); ctx.closePath(); ctx.fillStyle = '#ffc53d'; ctx.fill();
  ctx.fillStyle = '#e8743a'; ctx.beginPath(); ctx.moveTo(6, -10); ctx.lineTo(-6, -18); ctx.lineTo(8, -12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; circle(11, -8, 2.6); ctx.fill(); ctx.fillStyle = C.ink; circle(11.6, -8, 1.3); ctx.fill();
  ctx.restore();
  if (pt.on && pt.say) tarSpeech(pt.say, x, y - 16, '#b8501f');
}
function tarDraw() {
  const st = G.mst; if (!st.zones) return;
  const t = G.clock;
  tarDrawBack(st);
  tarDrawLife(st, t);
  tarDrawExit(st, t);
  for (const s of st.stumps) tarDrawStump(st, s, t);
  for (const h of st.horns) tarDrawHorn(st, h, t);
  if (st.gerty) tarDrawGerty(st, st.gerty, t);
  for (const v of st.vines) tarDrawVine(st, v, t);
}

/* ---------- hint chips: each job when a crossing starts, then a nudge when someone seems unsure ---------- */
function tarChip(t1, t2, x, y, col, avoid) {
  const z = tarBig() ? 1.45 : 1, f1 = Math.round(13 * z), f2 = Math.round(12 * z);
  ctx.font = '700 ' + f1 + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  let w = ctx.measureText(t1).width;
  if (t2) { ctx.font = '700 ' + f2 + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; w = Math.max(w, ctx.measureText(t2).width); }
  w += 22 * z; const h = (t2 ? 38 : 22) * z;
  const x0 = clamp(x - w / 2, 8, W - 8 - w);
  let y0 = clamp(y - h, 78, H - 8 - h);
  for (const b of avoid || []) if (x0 < b.x1 + 4 && x0 + w > b.x0 - 4 && y0 < b.y1 + 4 && y0 + h > b.y0 - 4) y0 = b.y0 - h - 6 >= 78 ? b.y0 - h - 6 : b.y1 + 6;
  ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x0, y0, w, h, 9 * z); ctx.fill();
  text(t1, x0 + w / 2, y0 + 11 * z, f1, col, 'center', 'body');
  if (t2) text(t2, x0 + w / 2, y0 + 28 * z, f2, C.paper, 'center', 'body');
  return { x0, y0, x1: x0 + w, y1: y0 + h };
}
// which stage of the crossing (the badge starts again when it changes): k, or k + 0.5 once one of you is across
function tarStage(st) {
  const cr = tarActive(st);
  return cr ? cr.k + (st.pl[0].zone === st.pl[1].zone ? 0 : 0.5) : -1;
}
function tarChipTimers(st, dt) {
  const sg = tarStage(st);
  if (st.badge.k !== sg) { st.badge.k = sg; st.badge.t = 0; } else st.badge.t += dt;
  for (const p of G.players) {
    const nd = tarNudge(st, p), key = nd ? nd[0] : '';
    const n = st.nudge[p.id];
    if (n.key !== key) { n.key = key; n.t = 0; } else n.t += dt;
  }
}
function tarChipsFor(st, cr) {
  const out = [null, null];
  if (!cr) return out;
  const lead = cr.lead, help = 1 - lead, pl = st.pl;
  const sameZone = pl[0].zone === pl[1].zone, ahead = pl[0].zone > pl[1].zone ? 0 : 1;
  // (in 1-player mode the computer's chip says what it does, with no keys)
  const job = (id, you, keys, cpu) => { out[id] = tarCpu(id) ? [NAMES[id] + ' (computer) ' + cpu, ''] : [NAMES[id] + ': ' + you, keys]; };
  if (cr.kind === 'gerty') {
    if (sameZone) {
      job(help, 'blow the leaf horn!', 'stand at the horn, hold ' + tarActKey(help), 'blows the horn');
      job(lead, 'cross on Gerty!', 'walk over her back while she’s down', 'crosses first');
    } else {
      job(ahead, 'blow the far horn!', 'hold ' + tarActKey(ahead) + ' at the horn', 'blows the far horn');
      job(1 - ahead, 'cross on Gerty!', 'walk over when she lies down', 'will call Gerty for you');
    }
  } else if (cr.kind === 'pass') {
    if (sameZone) {
      job(help, 'hook the vine!', 'hold ' + tarActKey(help) + ' at the hook stump', 'hooks the vine for you');
      job(lead, 'swing across!', tarJumpKey(lead) + ' grab the vine · ' + tarJumpKey(lead) + ' let go', 'swings first');
    } else {
      job(ahead, 'throw the vine back!', 'hold ' + tarActKey(ahead) + ' at the stump, then let go', 'throws the vine back');
      job(1 - ahead, 'catch the vine!', 'wait at the edge, ' + tarJumpKey(1 - ahead) + ' when it comes', 'catches the vine');
    }
  } else if (sameZone) {
    job(lead, 'swing across!', tarJumpKey(lead) + ' grab · ' + tarMoveKeys(lead) + ' swing · ' + tarJumpKey(lead) + ' let go', 'swings first');
    if (cr.kind === 'push') job(help, 'give a push!', 'stand by the vine, press ' + tarActKey(help), 'gives you a push');
    else job(help, 'wait, then hop in!', NAMES[lead] + ' pulls you out of the tar', 'hops in after you');
  } else {
    job(ahead, 'pull ' + NAMES[1 - ahead] + ' out!', 'at the edge: ' + tarActKey(ahead) + ', then walk away', 'will pull you out');
    job(1 - ahead, 'hop into the tar!', 'get stuck, ' + NAMES[ahead] + ' pulls you out', 'hops into the tar');
  }
  return out;
}
function tarNudge(st, p) {
  const ps = st.pl[p.id], o = G.players[1 - p.id], os = st.pl[o.id];
  if (tarCpu(p.id) || !p.alive) return null;
  if (ps.inTar && ps.stuck) {
    const rg = tarRegionAt(st, tarCx(p));
    if (rg && rg.shallow) return ['Stuck! Wiggle out!', 'press ' + tarMoveKeys(p.id) + ' in turn'];
    if (st.line && st.line.to === p.id) return ['Hold on! ' + NAMES[o.id] + ' is pulling', 'press toward ' + NAMES[o.id] + ' to help'];
    return ['Stuck! Wiggle to sink slower', tarMoveKeys(p.id) + ' in turn · ' + NAMES[o.id] + ' pulls you out'];
  }
  if (st.line && st.line.from === p.id) return ['Walk away to pull!', 'or keep holding ' + tarActKey(p.id)];
  if (os.inTar && tarFree(ps) && !st.line) {
    const cp = tarCanPull(st, p, o);
    return cp && cp.ok ? ['Press ' + tarActKey(p.id) + ' to pull ' + NAMES[o.id] + '!', 'then walk away from the tar'] : ['Go to the edge to reach ' + NAMES[o.id], ''];
  }
  if (ps.ride) {
    const v = ps.ride, far = v.om > 0 ? v.cross + 1 : v.cross, z = st.zones[far];
    if (z && (ps.grab0 < 0 ? far === v.cross + 1 : far === v.cross) && tarCx(p) > z.x0 && tarCx(p) < z.x1) return ['Let go now: ' + tarJumpKey(p.id) + '!', ''];
    return ['Swing! ' + tarMoveKeys(p.id) + ' to pump', tarJumpKey(p.id) + ' lets go over the far side'];
  }
  return null;
}
function tarDrawTop() {
  const st = G.mst; if (!st.zones) return;
  const t = G.clock, z = tarBig() ? 1.4 : 1;
  tarDrawTar(st, t);
  for (const lg of st.logs) tarDrawLog(st, lg, t);   // (over the tar, so they float)
  tarDrawStuck(st, t);
  tarDrawLine(st, t);
  tarDrawPetey(st, t);
  const boxes = [];
  if (st.phase === 'play' && G.introT <= TAR.introHold) {
    const chips = tarChipsFor(st, tarActive(st)), showBadge = st.badge.t < TAR.badgeT;
    const pos = G.players.map(p => ({ x: tarCx(p), y: p.y - 22 }));
    if (Math.abs(pos[0].x - pos[1].x) < 180 && Math.abs(pos[0].y - pos[1].y) < 60) { if (pos[0].y <= pos[1].y) pos[0].y = pos[1].y - 46 * z; else pos[1].y = pos[0].y - 46 * z; }
    for (const p of G.players) {
      const ps = st.pl[p.id], nd = tarNudge(st, p), n = st.nudge[p.id];
      const nudgeOn = nd && !ps.fly && (n.t > TAR.nudgeT || ps.ride || (st.line && st.line.from === p.id));
      if (nudgeOn) { ctx.save(); ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 6); boxes.push(tarChip(nd[0], nd[1], pos[p.id].x, pos[p.id].y, PCOL[p.id], boxes)); ctx.restore(); }
      else if (showBadge && chips[p.id] && tarFree(ps) && p.alive) {
        ctx.save(); ctx.globalAlpha = clamp((TAR.badgeT - st.badge.t) / 0.6, 0, 1);
        boxes.push(tarChip(chips[p.id][0], chips[p.id][1], pos[p.id].x, pos[p.id].y, PCOL[p.id], boxes));
        ctx.restore();
      }
    }
  }
  // pops ("Stuck!", "SHLORP!", "Bloop!"), lifted above any chip they would cover
  for (const q of st.pops) {
    const size = q.size * (tarBig() ? 1.3 : 1);
    ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(q.s).width + size * 0.3, hh = size * 1.1, x = clamp(q.x, w / 2 + 6, W - w / 2 - 6);
    let y = Math.max(86, q.y - q.t * 26);
    for (let pass = 0; pass < 2; pass++) for (const b of boxes) if (x + w / 2 > b.x0 && x - w / 2 < b.x1 && y + hh / 2 > b.y0 && y - hh / 2 < b.y1) y = b.y0 - hh / 2 - 3;
    ctx.save(); ctx.globalAlpha = clamp(Math.min(q.t / 0.1, (1.3 - q.t) / 0.4), 0, 1);
    bigText(q.s, x, y, Math.round(size), q.col, q.t < 0.12 ? 0.7 + q.t * 2.5 : 1);
    ctx.restore();
  }
  if (st.phase === 'won') {
    const k = Math.min(1, st.winT / 0.3), last = G.level.def.roomIndex >= G.level.def.roomCount - 1;
    bigText(last ? 'Swamp crossed!' : 'Room clear!', W / 2, 210, 44, C.gold, 0.6 + 0.4 * k);
  }
}
function tarHud() {
  const st = G.mst; if (!st.stats) return;
  const big = tarBig(), fs = big ? 20 : 14, h = big ? 40 : 28;
  const stuck = st.stats.stuck[0] + st.stats.stuck[1];
  const parts = [[fmtTime(G.time), C.paper], ['Stuck ' + stuck, stuck ? '#ffd2f0' : C.paper], ['Shlorps ' + st.stats.shlorps, st.stats.shlorps ? '#c8ffd8' : C.paper]];
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const ws = parts.map(q => ctx.measureText(q[0]).width), gap = fs * 1.1;
  const w = ws.reduce((a, b) => a + b, 0) + gap * 2 + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
  let x = x0 + 15;
  parts.forEach((q, i) => { text(q[0], x, cy, fs, q[1], 'left', 'body'); x += ws[i] + gap; });
  // gold help that is on, under it
  const golds = [st.help.slow && 'Slow tar', st.help.long && 'Long lasso', st.help.vine && 'Gold vines', st.help.wait && 'Patient Gerty'].filter(Boolean);
  if (golds.length) {
    const s = golds.join(' · '), gfs = big ? 16 : 12, gh = big ? 30 : 22;
    ctx.font = '700 ' + gfs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const gw = ctx.measureText(s).width + 24, gx = pill(W - 14, 12 + h + 6, gw, gh, 'right');
    ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; rr(gx, 12 + h + 6, gw, gh, gh / 2); ctx.stroke();
    text(s, gx + gw / 2, 12 + h + 6 + gh / 2 + 0.5, gfs, C.gold, 'center', 'body');
  }
  const n = st.news;
  if (n && G.mode === 'play') {
    const a = clamp(Math.min(n.t / 0.2, (n.life - n.t) / 0.3), 0, 1), nfs = big ? 19 : 14, nh = big ? 34 : 26, ny = big ? 104 : 84;
    ctx.font = '700 ' + nfs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const nw = Math.min(W - 20, ctx.measureText(n.s).width + 32);
    ctx.save(); ctx.globalAlpha = a;
    const px = pill(W / 2, ny, nw, nh, 'center');
    if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(px, ny, nw, nh, nh / 2); ctx.stroke(); }
    text(n.s, W / 2, ny + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
    ctx.restore();
  }
}

MODES.tarpit = {
  setup(st, L) {
    st.stats = { stuck: [0, 0], bloops: [0, 0], shlorps: 0, swings: 0, throws: 0, hooks: 0, pushes: 0, pops: 0, slides: 0, roomT: [] };
    tarBack = null;
    tarRoom(st, L);
  },
  room(k, L) { tarRoom(G.mst, L); },
  step(dt) { const st = G.mst; if (st.zones) tarStep(st, dt); },
  draw() { tarDraw(); },
  drawTop() { tarDrawTop(); },
  hud() { tarHud(); },
  stats() {
    const s = G.mst.stats, stuck = s.stuck[0] + s.stuck[1], time = G.time, bl = s.bloops[0] + s.bloops[1];
    const medal = time <= 270 && stuck <= 12 ? 'Gold' : time <= 480 && stuck <= 28 ? 'Silver' : 'Bronze';
    const words = medal === 'Gold' ? 'Sticky-quick teamwork!' : medal === 'Silver' ? 'Great pulling, partners!' : 'Gooey, but you made it together!';
    return [
      { label: 'Times stuck', values: s.stuck.slice() },
      { label: 'Shlorps!', value: s.shlorps },
      medal + ' medal · ' + words,
      'Vine swings: ' + s.swings + ' · Bloops: ' + bl + ' · Bubble pops: ' + s.pops,
    ];
  },
};

/* ---------- sounds ---------- */
Sfx.extra.tarSplut = function (p) { this.tone(260 * p, 0.12, 'sine', 0.06, 120 * p); this.tone(90, 0.1, 'triangle', 0.05, 60, 0.03); };
Sfx.extra.tarSplat = function (p) { this.tone(200 * p, 0.18, 'sine', 0.08, 70 * p); this.tone(600, 0.06, 'square', 0.02, 200, 0.02); };
Sfx.extra.tarStuck = function (p) { this.tone(420 * p, 0.09, 'triangle', 0.05, 300 * p); this.tone(300 * p, 0.16, 'triangle', 0.05, 220 * p, 0.09); };
Sfx.extra.tarHop = function (p) { this.tone(220 * p, 0.1, 'sine', 0.05, 330 * p); };
Sfx.extra.tarWiggle = function (p) { this.tone(500 * p, 0.05, 'triangle', 0.03, 620 * p); };
Sfx.extra.tarHelp = function (p) { this.tone(660 * p, 0.08, 'square', 0.025, 880 * p); this.tone(880 * p, 0.12, 'square', 0.02, 700 * p, 0.09); };
Sfx.extra.tarHoo = function (p) { this.tone(520 * p, 0.12, 'sine', 0.04, 700 * p); this.tone(700 * p, 0.14, 'sine', 0.035, 520 * p, 0.13); };
Sfx.extra.tarBloop = function (p) { this.tone(180 * p, 0.12, 'sine', 0.08, 520 * p); this.tone(520 * p, 0.08, 'sine', 0.05, 900 * p, 0.12); };
Sfx.extra.tarGrab = function (p) { this.tone(400 * p, 0.06, 'triangle', 0.05, 600 * p); };
Sfx.extra.tarLetGo = function (p) { this.tone(600 * p, 0.12, 'triangle', 0.04, 900 * p); };
Sfx.extra.tarThrow = function (p) { this.tone(300 * p, 0.14, 'sawtooth', 0.02, 700 * p); this.tone(880, 0.05, 'triangle', 0.03, null, 0.12); };
Sfx.extra.tarShort = function (p) { this.tone(500 * p, 0.2, 'triangle', 0.035, 250 * p); };
Sfx.extra.tarShlorp = function () { this.tone(140, 0.12, 'sine', 0.09, 90); this.tone(160, 0.22, 'sawtooth', 0.03, 900, 0.08); this.tone(1200, 0.08, 'sine', 0.04, 1500, 0.28); };
Sfx.extra.tarHook = function (p) { this.tone(800 * p, 0.04, 'square', 0.025); this.tone(500 * p, 0.08, 'triangle', 0.03, null, 0.03); };
Sfx.extra.tarHookOn = function (p) { this.tone(700 * p, 0.06, 'triangle', 0.04, 1000 * p); };
Sfx.extra.tarRetie = function () { this.tone(330, 0.25, 'sine', 0.06, 700); };
Sfx.extra.tarPush = function (p) { this.tone(180 * p, 0.12, 'square', 0.035, 420 * p); this.tone(660, 0.08, 'triangle', 0.04, null, 0.08); };
Sfx.extra.tarNope = function (p) { this.tone(300 * p, 0.08, 'square', 0.025); this.tone(240 * p, 0.1, 'square', 0.025, null, 0.09); };
Sfx.extra.tarLog = function (p) { this.tone(160 * p, 0.08, 'triangle', 0.06, 110 * p); };
Sfx.extra.tarCreak = function () { this.tone(140, 0.18, 'sawtooth', 0.02, 110); };
Sfx.extra.tarGlug = function () { [300, 240, 190].forEach((f, i) => this.tone(f, 0.1, 'sine', 0.06, f * 0.7, i * 0.1)); };
Sfx.extra.tarBubble = function () { this.tone(120, 0.1, 'sine', 0.06, 300); this.tone(500, 0.06, 'sine', 0.03, 800, 0.08); };
Sfx.extra.tarPop = function (p) { this.tone(300 * p, 0.08, 'sine', 0.06, 900 * p); this.tone(1100, 0.05, 'triangle', 0.03, null, 0.07); };
Sfx.extra.tarHorn = function (p) { this.tone(392 * p, 0.22, 'triangle', 0.05, 392 * p); this.tone(523 * p, 0.25, 'triangle', 0.045, null, 0.22); };
Sfx.extra.tarGerty = function () { this.tone(150, 0.3, 'sine', 0.08, 120); this.tone(180, 0.35, 'sine', 0.06, 230, 0.25); };
Sfx.extra.tarWhee = function (p) { this.tone(900 * p, 0.35, 'triangle', 0.04, 300 * p); };
Sfx.extra.tarGold = function () { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.tarRoom = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.06, null, i * 0.09)); };
Sfx.extra.tarCross = function () { [659, 880].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, i * 0.07)); };
Sfx.extra.tarPetey = function () { this.tone(1400, 0.06, 'square', 0.02, 1800); this.tone(1700, 0.08, 'square', 0.02, 1300, 0.08); };
MODES.tarpit.test = { TAR, tarTip, tarAmp, tarGrabOk, tarCanPull, tarReach, tarZoneAt, tarGroundAt, tarSurfAt, tarRegionAt, tarHornAt, tarGertyY, tarLogTop, tarLogSolid, tarActive, tarFree, tarStage };
