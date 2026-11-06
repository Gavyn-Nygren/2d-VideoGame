/* Pip & Bo - Level 16-3 Chocolate River Raft (team, World 16 Sugar Rush Factory). */
'use strict';

/* ===== 16-3 Chocolate River Raft (mode 'raft', World 16 "Sugar Rush Factory", team) =====
   Pip and Bo ride one big round cookie raft down a winding chocolate river, seen from above. The river flows to the
   right and the camera follows the raft. The mode owns the tick, the camera, the whole picture and the HUD
   (def.ownStep + def.ownHUD); the engine grid is empty apart from the two spawns.
   The PADDLER steers with ◀ ▶ ▲ ▼ (paddling against the water: ▶ faster, ◀ slower or back, ▲ ▼ across) and the action
   is a strong paddle stroke (short cooldown) the way you hold, or downstream. The current pushes too: calm creeks,
   fast rapids, back-flowing eddies by the banks, caramel whirlpools that pull you round and spin you.
   The HOOKER aims a candy-cane hook with ◀ ▶ ▲ ▼ (the tip moves round the raft, reach 140 px) and the action hooks
   floating candy into the raft's basket (wrapped sweets and lollipops 1, gummy bears waving from inner tubes 3; holding
   the action while touching one hooks it too), shoves marshmallow rocks, wafer logs and bonbons out of the way, cracks
   log jams (2 shoves) and, held, pulls the ring that opens a toffee gate.
   Why both are needed: a log jam stops the raft until it is shoved; a toffee gate's ring is up the bank, out of reach
   unless the paddler holds the raft beside it against a side current (and it only pulls while the raft is nearly
   still); docks are a pier on the top bank (a side current pushes a drifting raft away); the fudge ramp before the
   falls needs the paddler's speed (paddle strokes) and a straight line. Candy near the banks needs the paddler to line
   up, and a wall of rocks in the rapids can't be steered round.
   Soft fails only: bumping a rock, log, bonbon, jam or gate is a "Bonk!" (the raft spins and slows, and a hard bump
   bounces a candy out of the basket, floating behind to hook again). A whirlpool's middle spits you out ("Wheee!") with
   a candy flying into its swirl. Missing the fudge ramp is a "Splat! Fudge-tastic!" down the falls, and Mallow the
   marshmallow duck tows the raft back to the last flag. Banks are soft marshmallow ("Boing!", never counted).
   Each stretch ends at a dock where the jobs swap: Pip paddles stretches 1 and 3, Bo 2 and 4. The last dock is the
   candy village.
   Gold help (always announced): Gold hook (longer reach, bigger catch) after 4 near misses or 14 s stuck at a jam with
   the hooker trying; Gold paddle (stronger strokes, steadier raft) after 4 bonks in a stretch; Sleepy caramel (a calmer
   whirlpool) after 2 spit-outs from it; Gold ring (a quick tug, and the raft may drift) after 18 s trying at a gate;
   Gold fudge ramp (wider, slower) after 2 splats and Gold boost arrows after 4 (only tries the paddler took part in);
   Gold dock (a longer pier) after 14 s at a dock with the paddler trying.
   Room def: { title, paddler: 0|1, tip, act, width, current, course: [tokens] }. Course tokens (x moves along the river;
   l is across it, -1 the top bank .. 1 the bottom bank; +dx shifts an object forward):
     fN               straight for N px            uN:dy / dN:dy   bend up / down by dy px over N px
     Wn               river width -> n px (eases over 260 px)        Cn  current -> n px/s (eases over 200 px)
     c:kind:l[+dx]    candy: wrap, lolly (stuck in the riverbed), gummy (bonus, in an inner tube)
     m:l[+dx]  M:l    marshmallow rock / a big one      b:l[+dx]  a floating bonbon (drifts)
     L:l:len[+dx]     a drifting wafer log              J[+dx]    a log jam across the river (2 shoves)
     P:l:R:n[+dx]     a caramel whirlpool, radius R, with n candies swirling in it
     E:l:len[+dx]     an eddy by a bank (back-flowing water)         G:side[+dx]  a toffee gate, ring on the top (-1) or bottom (1) bank
     F  checkpoint flag    S:text  a sign ({P} the paddler, {H} the hooker)    K:l  the fudge ramp, then Fudge Falls
     D  the dock (stretch end, jobs swap)    V  the candy village dock (the finish)
   Every global is prefixed raft / RAFT (and Sfx.extra.raft*); all state lives in G.mst. */
const RAFT = {
  r: 44, drag: 1.5, steerAcc: 340, steerMax: 135, strokeImp: 165, strokeMax: 330, strokeCD: 0.55, strokeGoldK: 1.3,
  reach: 140, reachGold: 185, reachMin: 26, hookSp: 380, hookAcc: 3400, catchR: 22, catchRGold: 36, touchR: 12,
  hookCD: 0.2, whiffCD: 0.45,
  bonkV: 48, bonkCD: 0.7, lossV: 100, bankE: 0.45, bankBoing: 70,
  ringR: 32, ringRGold: 54, ringPull: 0.65, ringPullGold: 0.25, ringStill: 75, ringStillGold: 150, ringBack: 150, gateCross: 58,
  jamShoves: 2, jamR: 18,
  rampNeed: 270, rampNeedGold: 230, rampNeedGold2: 205, rampLane: 36, rampLaneGold: 62, rampLen: 140, edgeD: 190, landD: 400,
  dockV: 34, dockW: 72, dockWGold: 150, dockCross: 36, netD: 420,
  poolCore: 26, poolSpitT: 0.5, swirl: 150, pull: 80,
  helpMiss: 4, helpJamT: 14, helpBonk: 4, helpSpin: 2, helpRingT: 18, helpRamp: 2, helpRamp2: 4, helpDockT: 14, tryWin: 5,
  fallT: 3.4, swapT: 1.9, finT: 4.8, hintLife: 2.8, camLead: 300,
};
const raftLerp = (a, b, u) => a + (b - a) * u;
const raftSmooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const RAFT_CANDY = {
  wrap: { r: 12, pts: 1, drift: 0.55 },
  lolly: { r: 13, pts: 1, drift: 0 },
  gummy: { r: 17, pts: 3, drift: 0.22 },
  swirl: { r: 12, pts: 1, drift: 0 },
};
const RAFT_WRAPS = ['#ff5fa2', '#58c6ff', '#ffd23d', '#8be37a', '#c58cff', '#ff8a4a'];

/* ---------- the course: tokens -> the river (centre, width and current every 4 px) and everything in it ---------- */
function raftCompile(def) {
  const R = RAFT, X0 = -700, pad = def.paddler || 0;
  const name = s => s.replace(/\{P\}/g, NAMES[pad]).replace(/\{H\}/g, NAMES[1 - pad]);
  const c = { x0: X0, candy: [], rocks: [], bonbons: [], logs: [], jams: [], pools: [], eddies: [], gates: [], cross: [], flags: [], signs: [], ramp: null, dock: null };
  const segs = [];               // centre-line pieces { x0, x1, y0, y1 }
  const wK = [{ x: X0, v: def.width || 420 }], cK = [{ x: X0, v: def.current || 70 }];
  const later = [];              // objects placed across the river once its shape is known
  let x = X0, y = 0;
  const run = (len, dy) => { len = Math.max(4, Math.round(len / 4) * 4); segs.push({ x0: x, x1: x + len, y0: y, y1: y + dy }); x += len; y += dy; };
  const key = (arr, v, ease) => { const last = arr[arr.length - 1].v; arr.push({ x, v: last }, { x: x + ease, v }); };
  run(-X0, 0);
  let ci = 0;
  for (const tk of def.course || []) {
    const t = String(tk), ch = t[0];
    if (t.startsWith('S:')) { c.signs.push({ x, text: name(t.slice(2)) }); continue; }
    const plus = t.lastIndexOf('+'), body = plus > 0 ? t.slice(0, plus) : t, dx = plus > 0 ? parseInt(t.slice(plus + 1), 10) || 0 : 0;
    const parts = body.split(':'), n = parseFloat(body.slice(1)) || 0, ox = x + dx;
    if (ch === 'f') run(n, 0);
    else if ((ch === 'u' || ch === 'd') && parts.length === 2) { const len = parseFloat(parts[0].slice(1)) || 300, dy = parseFloat(parts[1]) || 0; run(len, ch === 'u' ? -dy : dy); }
    else if (ch === 'W') key(wK, n, 260);
    else if (ch === 'C') key(cK, n, 200);
    else if (ch === 'c') { const kind = RAFT_CANDY[parts[1]] ? parts[1] : 'wrap', l = parseFloat(parts[2]) || 0; later.push(() => c.candy.push(raftNewCandy(kind, ox, l, ci++))); }
    else if (ch === 'm' || ch === 'M') { const l = parseFloat(parts[1]) || 0; later.push(() => c.rocks.push({ x: ox, l, r: ch === 'M' ? 38 : 28, state: 'on', t: 0, vx: 0, vl: 0, wob: 0, ph: c.rocks.length * 1.7 })); }
    else if (ch === 'b') { const l = parseFloat(parts[1]) || 0; later.push(() => c.bonbons.push({ x: ox, l, r: 16, state: 'on', t: 0, vx: 0, vl: 0, act: false, ph: c.bonbons.length * 2.1, col: c.bonbons.length % 3 })); }
    else if (ch === 'L') { const l = parseFloat(parts[1]) || 0, len = parseFloat(parts[2]) || 150; later.push(() => c.logs.push({ x: ox, l, len, a: (c.logs.length % 2 ? -1 : 1) * 0.55, state: 'on', t: 0, vx: 0, vl: 0, va: 0, act: false })); }
    else if (ch === 'J') later.push(() => c.jams.push({ x: ox, hits: 0, open: false, t: 0, wob: 0, tryT: 0 }));
    else if (ch === 'P') {
      const l = parseFloat(parts[1]) || 0, rad = parseFloat(parts[2]) || 110, k = parseInt(parts[3], 10) || 0;
      later.push(() => {
        const p = { x: ox, l, R: rad, dir: c.pools.length % 2 ? -1 : 1, spins: 0, sleepy: false, coreT: 0 };
        c.pools.push(p);
        for (let i = 0; i < k; i++) { const cd = raftNewCandy('swirl', ox, l, ci++); cd.pool = p; cd.orb = i / k * Math.PI * 2; cd.orbR = rad * 0.66; c.candy.push(cd); }
      });
    } else if (ch === 'E') { const l = parseFloat(parts[1]) || 0.7, len = parseFloat(parts[2]) || 400; c.eddies.push({ x0: ox, x1: ox + len, side: l < 0 ? -1 : 1 }); }
    else if (ch === 'G') {
      const side = parseFloat(parts[1]) < 0 ? -1 : 1;
      const g = { x: ox, side, ringX: ox - R.ringBack, open: false, pull: 0, t: 0, tryT: 0, gold: false };
      c.gates.push(g);
      c.cross.push({ x0: g.ringX - 460, x1: ox, v: -side * R.gateCross, gate: g });
    } else if (ch === 'F') c.flags.push({ x: ox, on: false, t: 0 });
    else if (ch === 'K') {
      const l = parseFloat(parts[1]) || 0;
      c.ramp = { x0: ox, x1: ox + R.rampLen, edge: ox + R.edgeD, land: ox + R.landD, l, y: 0, tries: 0, fails: 0, gold: 0 };
      run(R.edgeD + 40, 0);
    } else if (ch === 'D' || ch === 'V') {
      key(cK, 40, 260);
      c.dock = { x: x + 230, net: x + 230 + R.netD, village: ch === 'V', t: 0, gold: false };
      c.cross.push({ x0: x + 40, x1: x + 230 + R.netD + 200, v: R.dockCross, dock: true });
      run(R.netD + 1200, 0);
    }
  }
  run(1400, 0);
  // sample the river every 4 px
  const N = Math.ceil((x - X0) / 4) + 2, cy = new Float32Array(N), hw = new Float32Array(N), cs = new Float32Array(N);
  const keyAt = (arr, xx) => {
    let i = 0;
    while (i < arr.length - 1 && arr[i + 1].x <= xx) i++;
    if (i >= arr.length - 1) return arr[arr.length - 1].v;
    const a = arr[i], b = arr[i + 1];
    return b.x === a.x ? b.v : raftLerp(a.v, b.v, raftSmooth((xx - a.x) / (b.x - a.x)));
  };
  let si = 0;
  for (let i = 0; i < N; i++) {
    const xx = X0 + i * 4;
    while (si < segs.length - 1 && segs[si].x1 <= xx) si++;
    const s = segs[si], u = raftSmooth((xx - s.x0) / Math.max(1, s.x1 - s.x0));
    cy[i] = raftLerp(s.y0, s.y1, u);
    hw[i] = keyAt(wK, xx) / 2;
    cs[i] = keyAt(cK, xx);
  }
  c.cy = cy; c.hw = hw; c.cs = cs; c.len = x;
  for (const f of later) f();
  return c;
}
function raftNewCandy(kind, x, l, i) {
  const K = RAFT_CANDY[kind];
  return { kind, x, l, r: K.r, pts: K.pts, drift: K.drift, got: false, gone: false, act: kind === 'lolly', t: 0, ph: i * 1.31, col: RAFT_WRAPS[i % RAFT_WRAPS.length], near: 9999, vl: 0 };
}
// the river at x: centre y, half width, current speed (interpolated)
function raftSample(arr, st, x) {
  const f = (x - st.c.x0) / 4, i = Math.floor(f);
  if (i <= 0) return arr[0];
  if (i >= arr.length - 1) return arr[arr.length - 1];
  return arr[i] + (arr[i + 1] - arr[i]) * (f - i);
}
const raftCY = (st, x) => raftSample(st.c.cy, st, x);
const raftHW = (st, x) => raftSample(st.c.hw, st, x);
const raftCS = (st, x) => raftSample(st.c.cs, st, x);
// a place across the river (l -1 top .. 1 bottom) -> y; things keep a little off the bank
const raftLY = (st, x, l, pad = 26) => raftCY(st, x) + l * (raftHW(st, x) - pad);
const raftYL = (st, x, y, pad = 26) => (y - raftCY(st, x)) / Math.max(1, raftHW(st, x) - pad);
// the water's velocity at (x, y): along the river, slower by the banks, eddies flow back, whirlpools swirl, side currents
function raftFlow(st, x, y) {
  const c = st.c, s = raftCS(st, x), slope = (raftCY(st, x + 12) - raftCY(st, x - 12)) / 24, n = Math.hypot(1, slope);
  const hw = raftHW(st, x), lat = clamp((y - raftCY(st, x)) / Math.max(1, hw), -1, 1);
  const k = 1 - 0.3 * Math.pow(Math.abs(lat), 4);
  let fx = s * k / n, fy = s * k * slope / n;
  for (const e of c.eddies) {
    if (x < e.x0 || x > e.x1 || lat * e.side < 0.42) continue;
    const u = Math.sin(Math.PI * (x - e.x0) / (e.x1 - e.x0)), d = clamp((lat * e.side - 0.42) / 0.3, 0, 1) * u;
    fx = raftLerp(fx, -s * 0.4, d); fy = raftLerp(fy, -e.side * 18 * Math.cos(Math.PI * (x - e.x0) / (e.x1 - e.x0)), d);
  }
  for (const q of c.cross) if (x > q.x0 && x < q.x1 && !(q.gate && q.gate.open)) { const u = Math.min(1, (x - q.x0) / 160, (q.x1 - x) / 80); fy += q.v * clamp(u, 0, 1); }
  for (const p of c.pools) {
    const py = raftLY(st, p.x, p.l), dx = x - p.x, dy = y - py, d = Math.hypot(dx, dy);
    if (d >= p.R || d < 1) continue;
    const u = 1 - d / p.R, calm = p.sleepy ? 0.45 : 1, sw = RAFT.swirl * Math.sqrt(u) * calm * p.dir, pl = (RAFT.pull * u + 12) * calm;
    fx = fx * (1 - u) + (-dy / d) * sw - (dx / d) * pl;
    fy = fy * (1 - u) + (dx / d) * sw - (dy / d) * pl;
  }
  return { x: fx, y: fy };
}

// each player's own keys, for prompts and the HUD (a player with a controller is shown its buttons)
function raftKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'up') return pad ? '▲' : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'down') return pad ? '▼' : touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'left') return pad ? '◀' : touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'right') return pad ? '▶' : touch ? '▶' : id === 0 ? 'D' : '→';
  if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
  return pad ? 'stick' : touch ? '◀▶▲▼' : id === 0 ? 'WASD' : '↑←↓→';
}
// 1-player mode: the computer's own job gets no key hints or prompts (it knows its job)
const raftQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

/* ---------- a stretch ---------- */
function raftRoom(st, L, k) {
  const def = L.def;
  st.k = k; st.pad = def.paddler || 0; st.hook = 1 - st.pad; st.title = def.title || '';
  st.c = raftCompile(def);
  for (const r of st.c.rocks) r.y = raftLY(st, r.x, r.l);
  if (st.c.ramp) st.c.ramp.y = raftLY(st, st.c.ramp.x0, st.c.ramp.l, 40);
  st.stats.roomT[k] = null; st.stats.roomTitles[k] = st.title;
  st.state = 'ride'; st.t = 0; st.fall = null; st.swap = null; st.fin = null; st.flown = false; st.air = null;
  st.cp = { x: 0 }; st.bonksRoom = 0; st.missN = 0; st.goldPaddle = false; st.goldHook = false; st.boost = false;
  st.dockT = 0; st.docked = 0; st.noProgT = 0; st.bestX = 0; st.whiffN = 0;
  raftPlace(st, 0, 0);
  st.cam = { x: -RAFT.camLead, y: st.raft.y - H / 2 + 10 };
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null; st.fly = [];
  st.segStart = G.time; st.inT = [-99, -99];
  raftActLabels(st);
  raftMirror(st);
}
// the raft at x (l across), still, the hook resting ahead
function raftPlace(st, x, l) {
  const y = raftLY(st, x, l, RAFT.r + 10);
  st.raft = { x, y, vx: raftCS(st, x) * 0.6, vy: 0, a: 0, w: 0, bonkCD: 0, strokeCD: 0, stroke: 0, strokeDir: 1, coreT: 0, z: 0, bank: 0 };
  st.hk = { ox: 96, oy: -14, vx: 0, vy: 0, cd: 0, swing: 0, pullG: null, wx: x + 96, wy: y - 14, miss: 0 };
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function raftStep(st, dt) {
  if (!st.raft) return;
  const ps = G.players;
  for (const k of [0, 1]) {
    const i = ps[k].input;
    if (i.left || i.right || i.jump || i.down || i.up || i.act || ps[k].pendingJump || ps[k].pendingAct) st.inT[k] = G.time;
  }
  st.t += dt;
  if (G.introT > 0) { for (const p of ps) { p.pendingJump = false; p.pendingAct = false; } }
  else if (st.state === 'ride') raftRide(st, dt);
  else if (st.state === 'fall') raftFallStep(st, dt);
  else if (st.state === 'dock') { if (raftSwapStep(st, dt)) return; }
  else if (st.state === 'finish') { if (raftFinStep(st, dt)) return; }
  raftCam(st, dt);
  raftFx(st, dt);
  raftMirror(st);
}
function raftRide(st, dt) {
  const R = RAFT, ps = G.players, P = ps[st.pad], H2 = ps[st.hook], b = st.raft;
  const stroke = P.pendingAct, hookPress = H2.pendingAct;
  for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
  const pi = P.input, hi = H2.input;
  const dx = (pi.right ? 1 : 0) - (pi.left ? 1 : 0), dy = (pi.down ? 1 : 0) - (pi.jump || pi.up ? 1 : 0);
  if (st.air) raftAirStep(st, dt);
  else raftPhysics(st, dt, dx, dy, stroke);
  if (st.state !== 'ride') return;
  raftHookStep(st, dt, hi, hookPress);
  raftObjects(st, dt);
  for (const f of st.c.flags) if (!f.on && b.x > f.x) { f.on = true; st.cp = { x: f.x + 60 }; Sfx.play('raftFlag'); raftPop(st, f.x, raftCY(st, f.x) - raftHW(st, f.x) - 20, 'Checkpoint!', '#8fe3b0', 20); }
  raftRamp(st, dt);
  if (st.state !== 'ride') return;
  raftDock(st, dt);
  if (st.state !== 'ride') return;
  if (b.x > st.bestX + 30) { st.bestX = b.x; st.noProgT = 0; } else st.noProgT += dt;
  raftHelp(st, dt);
  raftNudges(st, dt);
}

/* ---------- the raft: pushed by the water, paddled, bumping things ---------- */
function raftPhysics(st, dt, dx, dy, stroke) {
  const R = RAFT, b = st.raft, fl = raftFlow(st, b.x, b.y);
  let rx = b.vx - fl.x, ry = b.vy - fl.y;
  const dg = Math.exp(-R.drag * dt);
  rx *= dg; ry *= dg;
  // steering: paddling against the water, up to a gentle speed
  const gk = st.goldPaddle ? 1.15 : 1;
  if (dx || dy) {
    const n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n, rc = rx * ux + ry * uy;
    if (rc < R.steerMax * gk) { const a = R.steerAcc * gk * dt; rx += ux * a; ry += uy * a; }
  }
  // a paddle stroke: a strong push the way the paddler holds (downstream with nothing held)
  if (b.strokeCD > 0) b.strokeCD -= dt;
  if (stroke && b.strokeCD <= 0) {
    let ux = dx, uy = dy;
    if (!ux && !uy) { const s = Math.hypot(fl.x, fl.y) || 1; ux = fl.x / s; uy = fl.y / s; }
    const n = Math.hypot(ux, uy); ux /= n; uy /= n;
    const imp = R.strokeImp * (st.goldPaddle ? R.strokeGoldK : 1);
    rx += ux * imp; ry += uy * imp;
    const rs = Math.hypot(rx, ry), cap = R.strokeMax * (st.goldPaddle ? 1.1 : 1);
    if (rs > cap) { rx *= cap / rs; ry *= cap / rs; }
    b.strokeCD = R.strokeCD; b.stroke = 0.4; b.strokeDir = ux >= -0.2 ? 1 : -1;
    st.stats.strokes[st.pad]++;
    Sfx.play('raftStroke');
    const sx = b.x - 40 + (b.strokeDir < 0 ? 80 : 0);
    for (let i = 0; i < 8; i++) raftPart(st, sx + (Math.random() - 0.5) * 20, b.y + 30 + (Math.random() - 0.5) * 16, -ux * 80 + (Math.random() - 0.5) * 70, (Math.random() - 0.5) * 70, 0.5, i % 2 ? '#a0613a' : '#fff1dc', 3 + Math.random() * 3, 0, 'drop');
  } else if (stroke) { b.strokeQueued = 0.12; }
  if (b.strokeQueued > 0) { b.strokeQueued -= dt; }
  b.vx = fl.x + rx; b.vy = fl.y + ry;
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > 520) { b.vx *= 520 / sp; b.vy *= 520 / sp; }
  b.x += b.vx * dt; b.y += b.vy * dt;
  // the spin: bonks and whirlpools turn the raft; the crew straightens it again
  b.w *= Math.exp(-(st.goldPaddle ? 2.6 : 1.8) * dt);
  b.a += b.w * dt;
  if (Math.abs(b.w) < 0.8) { b.a -= Math.round(b.a / (Math.PI * 2)) * Math.PI * 2; b.a *= Math.exp(-2.2 * dt); }
  if (b.bonkCD > 0) b.bonkCD -= dt;
  if (b.stroke > 0) b.stroke -= dt;
  if (b.bank > 0) b.bank -= dt;
  raftCollide(st, dt);
  raftPools(st, dt);
}
// bonk: a soft bump off something (n points from it to the raft)
function raftBump(st, nx, ny, kind, obj) {
  const R = RAFT, b = st.raft, vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return;
  const hit = -vn;
  b.vx -= 1.35 * vn * nx; b.vy -= 1.35 * vn * ny;
  b.vx *= 0.6; b.vy *= 0.6;
  if (hit < R.bonkV || b.bonkCD > 0) return;
  b.bonkCD = R.bonkCD;
  b.w += (Math.random() < 0.5 ? -1 : 1) * clamp(hit / 30, 2.5, 7) * (st.goldPaddle ? 0.6 : 1);
  st.stats.bonks++; st.bonksRoom++;
  if (obj) obj.wob = 1;
  Sfx.play('raftBonk'); rumble(st.pad, 0.2, 0.3, 120); rumble(st.hook, 0.2, 0.3, 120);
  const words = kind === 'rock' ? 'Squish! Bonk!' : kind === 'gate' ? 'Boing! Toffee!' : 'Bonk!';
  raftPop(st, b.x, b.y - 64, words, '#ffffff', 24);
  if (hit > R.lossV && st.score > 0) raftLose(st);
}
// a hard bump bounces one candy out of the basket: it floats behind, to hook again
function raftLose(st) {
  const b = st.raft;
  st.score--; st.stats.lost++;
  const cd = raftNewCandy('wrap', b.x - 70, clamp(raftYL(st, b.x, b.y) + (Math.random() - 0.5) * 0.4, -0.9, 0.9), st.stats.lost + 7);
  cd.act = true; cd.lost = true; cd.drift = 0.35; cd.pts = 1;
  st.c.candy.push(cd);
  st.fly.push({ x: b.x, y: b.y - 20, tx: cd.x, ty: raftLY(st, cd.x, cd.l), t: 0, col: cd.col, out: true });
  raftPop(st, b.x - 30, b.y - 40, 'Oopsie! A candy fell out', '#ffd0f0', 18);
  Sfx.play('raftOops');
}
function raftCollide(st, dt) {
  const R = RAFT, b = st.raft, c = st.c, r = R.r;
  // the banks: soft marshmallow
  const cy = raftCY(st, b.x), hw = raftHW(st, b.x), lim = hw - r - 4;
  if (Math.abs(b.y - cy) > lim) {
    const s = Math.sign(b.y - cy), slope = (raftCY(st, b.x + 10) - raftCY(st, b.x - 10)) / 20, nn = Math.hypot(1, slope);
    const nx = slope * s / nn, ny = -s / nn;
    b.y = cy + s * lim;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + R.bankE) * vn * nx; b.vy -= (1 + R.bankE) * vn * ny;
      if (-vn > R.bankBoing && b.bank <= 0) { b.bank = 0.6; Sfx.play('raftBoing'); raftPop(st, b.x, b.y + s * 50, 'Boing!', '#ffe7f3', 18); b.w += s * 1.5; }
    }
  }
  // marshmallow rocks and bonbons
  for (const o of c.rocks) if (o.state === 'on') {
    const d = Math.hypot(b.x - o.x, b.y - o.y), m = r + o.r;
    if (d < m && d > 0.1) { const nx = (b.x - o.x) / d, ny = (b.y - o.y) / d; b.x = o.x + nx * m; b.y = o.y + ny * m; raftBump(st, nx, ny, 'rock', o); }
  }
  for (const o of c.bonbons) if (o.state === 'on') {
    const oy = raftLY(st, o.x, o.l), d = Math.hypot(b.x - o.x, b.y - oy), m = r + o.r;
    if (d < m && d > 0.1) {
      const nx = (b.x - o.x) / d, ny = (b.y - oy) / d;
      // a bonbon is light: it gets nudged too
      o.vl += -ny * 0.6; o.vx += -nx * 30;
      b.x = o.x + nx * m; b.y = oy + ny * m; raftBump(st, nx, ny, 'bonbon', o);
    }
  }
  // wafer logs (a capsule)
  for (const o of c.logs) if (o.state === 'on') {
    const q = raftLogEnds(st, o), cp = raftSegNear(b.x, b.y, q.ax, q.ay, q.bx, q.by), d = Math.hypot(b.x - cp.x, b.y - cp.y), m = r + 13;
    if (d < m && d > 0.1) { const nx = (b.x - cp.x) / d, ny = (b.y - cp.y) / d; b.x = cp.x + nx * m; b.y = cp.y + ny * m; raftBump(st, nx, ny, 'log', o); }
  }
  // log jams, closed toffee gates and the net past the dock stop the raft
  const wall = (x, kind, obj) => { if (b.x > x - r - 8 && b.x < x + 30) { b.x = x - r - 8; raftBump(st, -1, 0, kind, obj); } };
  for (const j of c.jams) if (!j.open) wall(j.x - R.jamR, 'jam', j);
  for (const g of c.gates) if (!g.open) wall(g.x - 6, 'gate', g);
  if (c.dock) wall(c.dock.net, 'net', null);
}
const raftLogEnds = (st, o) => {
  const y = raftLY(st, o.x, o.l), hx = Math.cos(o.a) * o.len / 2, hy = Math.sin(o.a) * o.len / 2;
  return { ax: o.x - hx, ay: y - hy, bx: o.x + hx, by: y + hy, cx: o.x, cy: y };
};
function raftSegNear(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1, u = clamp(((px - ax) * vx + (py - ay) * vy) / L2, 0, 1);
  return { x: ax + vx * u, y: ay + vy * u, u };
}
// caramel whirlpools: the swirl spins the raft; stay in the very middle and it spits you out (with a candy)
function raftPools(st, dt) {
  const R = RAFT, b = st.raft;
  let inCore = false;
  for (const p of st.c.pools) {
    const py = raftLY(st, p.x, p.l), d = Math.hypot(b.x - p.x, b.y - py);
    if (d < p.R + R.r * 0.5) b.w = approach(b.w, p.dir * (p.sleepy ? 1.6 : 3.4) * (1 - d / (p.R + R.r)), dt * 6);
    if (d < R.poolCore) {
      inCore = true;
      b.coreT += dt;
      if (b.coreT > R.poolSpitT) {
        b.coreT = 0;
        p.spins++; st.stats.spins++;
        if (G.time - st.inT[st.pad] < R.tryWin) p.tries = (p.tries || 0) + 1;
        // spat out downstream with a big spin, and a candy flies into the swirl
        const ny = clamp(py + (b.y >= py ? 1 : -1) * 30, raftCY(st, p.x + p.R) - raftHW(st, p.x + p.R) + R.r + 10, raftCY(st, p.x + p.R) + raftHW(st, p.x + p.R) - R.r - 10);
        b.x = p.x + p.R + R.r + 14; b.y = ny; b.vx = raftCS(st, b.x) + 60; b.vy = 0; b.w = p.dir * 9;
        Sfx.play('raftWhee'); raftPop(st, b.x, b.y - 70, 'Wheee! Spun around!', '#ffe08a', 26);
        if (st.score > 0) {
          st.score--; st.stats.lost++;
          const cd = raftNewCandy('swirl', p.x, p.l, st.stats.lost + 3); cd.pool = p; cd.orb = Math.random() * 6.28; cd.orbR = p.R * 0.66; cd.act = true; cd.lost = true;
          st.c.candy.push(cd);
          st.fly.push({ x: b.x, y: b.y - 20, tx: p.x, ty: py, t: 0, col: cd.col, out: true });
        }
        if (p.tries >= R.helpSpin && !p.sleepy) { p.sleepy = true; st.stats.helps++; raftMsg(st, 'Sleepy caramel! That whirlpool is calmer now', C.gold, 3.6); Sfx.play('raftHelp'); }
        else raftHint(st, st.pad, 'Paddle round the edge! ' + raftKey(st.pad, 'act') + ' strokes push hard', 3);
      }
    }
  }
  if (!inCore) b.coreT = Math.max(0, b.coreT - dt * 2);
}

/* ---------- the hook: the tip moves round the raft, the action hooks, shoves and pulls ---------- */
const raftReach = st => (st.goldHook ? RAFT.reachGold : RAFT.reach);
function raftHookStep(st, dt, hi, press) {
  const R = RAFT, hk = st.hk, b = st.raft;
  const ix = (hi.right ? 1 : 0) - (hi.left ? 1 : 0), iy = (hi.down ? 1 : 0) - (hi.jump || hi.up ? 1 : 0), k = ix && iy ? 0.75 : 1;
  hk.vx = approach(hk.vx, ix * R.hookSp * k, R.hookAcc * dt);
  hk.vy = approach(hk.vy, iy * R.hookSp * k, R.hookAcc * dt);
  hk.ox += hk.vx * dt; hk.oy += hk.vy * dt;
  const reach = raftReach(st), d = Math.hypot(hk.ox, hk.oy);
  if (d > reach) { hk.ox *= reach / d; hk.oy *= reach / d; }
  else if (d < R.reachMin) { const s = R.reachMin / Math.max(0.1, d); hk.ox *= s; hk.oy *= s; if (d < 0.1) hk.ox = R.reachMin; }
  hk.wx = b.x + hk.ox; hk.wy = b.y + hk.oy;
  if (hk.cd > 0) hk.cd -= dt;
  if (hk.swing > 0) hk.swing -= dt;
  if (hk.miss > 0) hk.miss -= dt;
  const catchR = st.goldHook ? R.catchRGold : R.catchR;
  // pulling a toffee ring: hold the action on it
  hk.pullG = null;
  for (const g of st.c.gates) {
    if (g.open) continue;
    const rp = raftRingPos(st, g), dd = Math.hypot(rp.x - hk.wx, rp.y - hk.wy), rr2 = g.gold ? R.ringRGold : R.ringR;
    if (dd < rr2 + 10 && hi.act) {
      hk.pullG = g;
      const still = Math.hypot(b.vx, b.vy) < (g.gold ? R.ringStillGold : R.ringStill);
      if (still) { g.pull += dt; if (!g.creak || g.creak < st.t) { g.creak = st.t + 0.22; Sfx.play('raftStretch'); } }
      else { g.pull = Math.max(0, g.pull - dt * 0.6); g.tooFast = (g.tooFast || 0) + dt; if (g.tooFast > 0.8) { g.tooFast = -2; raftHint(st, st.pad, 'Hold still! ' + raftKey(st.pad, 'left') + ' against the current', 2.6); } }
      if (g.pull >= (g.gold ? R.ringPullGold : R.ringPull)) raftOpenGate(st, g);
    } else g.pull = Math.max(0, g.pull - dt * 0.8);
  }
  // touching a candy while holding the action hooks it
  if (hi.act && !hk.pullG) for (const cd of st.c.candy) {
    if (cd.got || cd.gone || !cd.act) continue;
    const cp = raftCandyPos(st, cd);
    if (Math.hypot(cp.x - hk.wx, cp.y - hk.wy) < R.touchR + cd.r) { raftGetCandy(st, cd); press = false; break; }
  }
  if (!press || hk.pullG) return;
  if (hk.cd > 0) return;
  hk.cd = R.hookCD; hk.swing = 0.22;
  // what's under the tip: candy first, then a ring, then something to shove
  let best = null;
  const near = (x, y, rad, what) => { const dd = Math.hypot(x - hk.wx, y - hk.wy); if (dd < rad && (!best || dd - rad < best.d)) best = { d: dd - rad, what }; };
  for (const cd of st.c.candy) if (!cd.got && !cd.gone && cd.act) { const p = raftCandyPos(st, cd); near(p.x, p.y, catchR + cd.r, { kind: 'candy', cd }); }
  if (best) { raftGetCandy(st, best.what.cd); return; }
  for (const g of st.c.gates) if (!g.open) { const rp = raftRingPos(st, g); near(rp.x, rp.y, (g.gold ? R.ringRGold : R.ringR) + 10, { kind: 'ring', g }); }
  if (best) { Sfx.play('raftClink'); raftPop(st, hk.wx, hk.wy - 30, 'Hold to pull!', C.gold, 16); return; }
  const extra = st.goldHook ? 12 : 0;
  for (const o of st.c.rocks) if (o.state === 'on') near(o.x, o.y, o.r + 18 + extra, { kind: 'rock', o });
  for (const o of st.c.bonbons) if (o.state === 'on' && o.act) near(o.x, raftLY(st, o.x, o.l), o.r + 18 + extra, { kind: 'bonbon', o });
  for (const o of st.c.logs) if (o.state === 'on' && o.act) { const q = raftLogEnds(st, o), cp = raftSegNear(hk.wx, hk.wy, q.ax, q.ay, q.bx, q.by); near(cp.x, cp.y, 13 + 18 + extra, { kind: 'log', o }); }
  for (const j of st.c.jams) if (!j.open) near(j.x, clamp(hk.wy, raftCY(st, j.x) - raftHW(st, j.x), raftCY(st, j.x) + raftHW(st, j.x)), R.jamR + 16 + extra, { kind: 'jam', j });
  if (!best) {
    hk.miss = 0.25; hk.cd = R.whiffCD; st.whiffN++;
    Sfx.play('raftSwish');
    if (st.whiffN >= 3) { st.whiffN = 0; raftHint(st, st.hook, 'Aim the hook ' + raftKey(st.hook, 'aim') + ' at a candy first', 2.6); }
    return;
  }
  st.whiffN = 0;
  const w = best.what;
  if (w.kind === 'jam') { raftShoveJam(st, w.j); return; }
  raftShove(st, w.kind, w.o);
}
function raftShove(st, kind, o) {
  const b = st.raft;
  const oy = kind === 'rock' ? o.y : raftLY(st, o.x, o.l);
  // away from the raft, and toward the nearer bank so it leaves the raft's path
  let l = raftYL(st, o.x, oy), side = Math.sign(oy - b.y) || Math.sign(l) || 1;
  if (Math.abs(oy - b.y) < 20) side = l >= 0 ? 1 : -1;
  o.state = 'shoved'; o.t = 0; o.side = side;
  o.vx = clamp((o.x - b.x) * 1.2, -80, 180) + 60; o.vl = side * 2.6;
  if (kind === 'log') o.va = side * 2.2;
  st.stats.shoves[st.hook]++;
  Sfx.play('raftShove');
  raftPop(st, o.x, oy - 40, kind === 'rock' ? 'Shove! Boing!' : kind === 'log' ? 'Shove! Out of the way!' : 'Shove!', '#8fe3b0', 20);
  raftSpark(st, o.x, oy, '#ffffff', 8);
}
function raftShoveJam(st, j) {
  j.hits++; j.wob = 1;
  st.stats.shoves[st.hook]++;
  const y = raftCY(st, j.x);
  if (j.hits >= RAFT.jamShoves) {
    j.open = true; j.t = 0;
    Sfx.play('raftCrack'); raftPop(st, j.x, y - 60, 'Crack! Log jam cleared!', '#8fe3b0', 24);
    for (let i = 0; i < 18; i++) raftPart(st, j.x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * raftHW(st, j.x) * 1.6, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, 0.7, i % 2 ? '#e8b06a' : '#fff1dc', 3 + Math.random() * 3, 0, 'crumb');
  } else {
    Sfx.play('raftHeave'); raftPop(st, j.x, y - 60, 'Heave! Once more!', '#ffffff', 22);
    for (let i = 0; i < 8; i++) raftPart(st, j.x, y + (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, 0.5, '#e8b06a', 3, 0, 'crumb');
  }
}
function raftOpenGate(st, g) {
  g.open = true; g.t = 0; g.pull = 0;
  st.stats.gates++;
  Sfx.play('raftGate');
  raftPop(st, g.x, raftCY(st, g.x) - raftHW(st, g.x) - 10, 'Strrretch! Gate open!', '#8fe3b0', 24);
}
const raftRingPos = (st, g) => ({ x: g.ringX, y: raftCY(st, g.ringX) + g.side * (raftHW(st, g.ringX) + 6) });
function raftCandyPos(st, cd) {
  if (cd.pool) { const p = cd.pool, py = raftLY(st, p.x, p.l); return { x: p.x + Math.cos(cd.orb) * cd.orbR, y: py + Math.sin(cd.orb) * cd.orbR }; }
  const bob = Math.sin(G.time * 2.2 + cd.ph) * 3;
  return { x: cd.x, y: raftLY(st, cd.x, cd.l) + bob };
}
function raftGetCandy(st, cd) {
  const p = raftCandyPos(st, cd), b = st.raft;
  cd.got = true; cd.t = 0;
  st.score += cd.pts; st.stats.hooked[st.hook]++;
  if (cd.kind === 'gummy') st.stats.gummies++;
  st.hk.swing = 0.3; st.hk.cd = Math.max(st.hk.cd, 0.15);
  st.fly.push({ x: p.x, y: p.y, tx: b.x, ty: b.y - 20, t: 0, col: cd.col, kind: cd.kind });
  Sfx.play(cd.kind === 'gummy' ? 'raftGummy' : 'raftCandy');
  raftPop(st, p.x, p.y - 30, cd.kind === 'gummy' ? 'Gummy bear! +3' : cd.lost ? 'Got it back!' : '+1 candy!', cd.kind === 'gummy' ? C.gold : '#ffe7f3', cd.kind === 'gummy' ? 22 : 18);
  raftSpark(st, p.x, p.y, cd.kind === 'gummy' ? C.gold : cd.col, 10);
}

/* ---------- loose things: candy drifting and swirling, shoved rocks, bonbons, logs ---------- */
function raftObjects(st, dt) {
  const b = st.raft, c = st.c, cam = st.cam, wake = x => x < cam.x + W + 160;
  const blockAhead = x => { for (const j of c.jams) if (!j.open && j.x > x && j.x - x < 160) return true; for (const g of c.gates) if (!g.open && g.x > x && g.x - x < 160) return true; return false; };
  for (const cd of c.candy) {
    if (cd.got) { cd.t += dt; continue; }
    if (cd.gone) continue;
    if (!cd.act && wake(cd.x)) cd.act = true;
    if (cd.pool) { cd.orb += cd.pool.dir * (cd.pool.sleepy ? 0.7 : 1.4) * dt; continue; }
    if (!cd.act) continue;
    // drifting with the current (gummies in an eddy sit still), and nudged aside by the raft
    if (cd.drift && !blockAhead(cd.x)) {
      const inEddy = c.eddies.some(e => cd.x > e.x0 && cd.x < e.x1 && cd.l * e.side > 0.5);
      cd.x += raftCS(st, cd.x) * cd.drift * (inEddy ? 0.05 : 1) * dt;
    }
    const p = raftCandyPos(st, cd), d = Math.hypot(p.x - b.x, p.y - b.y);
    if (d < RAFT.r + cd.r) { cd.vl += (p.y >= b.y ? 1 : -1) * 3 * dt * 10; if (cd.kind !== 'lolly') cd.x += (p.x >= b.x ? 1 : -1) * 40 * dt; }
    cd.l = clamp(cd.l + cd.vl * dt, -0.95, 0.95); cd.vl *= Math.exp(-3 * dt);
    // near misses (for the gold hook): candy that came close and went by
    if (cd.x > b.x - 40) cd.near = Math.min(cd.near, d);
    else if (!cd.passed) {
      cd.passed = true;
      if (cd.near < raftReach(st) + 50 && G.time - st.inT[st.hook] < 8) { st.missN++; if (st.missN >= RAFT.helpMiss && !st.goldHook) raftGoldHook(st, 'Gold hook! It reaches further and grabs easier'); }
    }
    if (cd.x < b.x - 700) cd.gone = true;
  }
  for (const o of c.rocks) {
    o.wob = Math.max(0, (o.wob || 0) - dt * 3);
    if (o.state !== 'shoved') continue;
    o.t += dt; o.x += o.vx * dt; o.vx *= Math.exp(-2 * dt);
    o.l = clamp(o.l + o.vl * dt, -1.2, 1.2); o.vl *= Math.exp(-2.5 * dt); o.y = raftLY(st, o.x, o.l);
    if (o.t > 1.3) o.state = 'gone';
  }
  for (const o of c.bonbons) {
    o.wob = Math.max(0, (o.wob || 0) - dt * 3);
    if (!o.act && wake(o.x)) o.act = true;
    if (!o.act) continue;
    if (o.state === 'on') {
      if (!blockAhead(o.x)) o.x += (raftCS(st, o.x) * 0.38 + o.vx) * dt;
      o.vx *= Math.exp(-2 * dt);
      o.l = clamp(o.l + o.vl * dt + Math.sin(st.t * 0.9 + o.ph) * 0.04 * dt, -0.9, 0.9); o.vl *= Math.exp(-2 * dt);
      if (o.x < b.x - 700) o.state = 'gone';
    } else if (o.state === 'shoved') {
      o.t += dt; o.x += o.vx * dt; o.vx *= Math.exp(-2 * dt); o.l = clamp(o.l + o.vl * dt, -1.2, 1.2); o.vl *= Math.exp(-2.5 * dt);
      if (o.t > 1.2) o.state = 'gone';
    }
  }
  for (const o of c.logs) {
    o.wob = Math.max(0, (o.wob || 0) - dt * 3);
    if (!o.act && wake(o.x)) o.act = true;
    if (!o.act) continue;
    if (o.state === 'on') { if (!blockAhead(o.x)) o.x += raftCS(st, o.x) * 0.4 * dt; o.a += Math.sin(st.t * 0.5 + o.len) * 0.05 * dt; if (o.x < b.x - 800) o.state = 'gone'; }
    else if (o.state === 'shoved') {
      o.t += dt; o.x += o.vx * dt; o.vx *= Math.exp(-2 * dt); o.l = clamp(o.l + o.vl * dt, -1.3, 1.3); o.vl *= Math.exp(-2.5 * dt);
      o.a = approach(o.a, 0, dt * 2); if (o.t > 1.4) o.state = 'gone';
    }
  }
  for (const j of c.jams) { j.wob = Math.max(0, j.wob - dt * 2.5); if (j.open) j.t += dt; }
  for (const g of c.gates) if (g.open) g.t += dt;
}

/* ---------- Fudge Falls: the ramp, the jump, and a splat down the falls ---------- */
function raftRamp(st, dt) {
  const R = RAFT, rp = st.c.ramp, b = st.raft;
  if (!rp || st.flown || st.air) return;
  const lane = rp.gold >= 1 ? R.rampLaneGold : R.rampLane, need = rp.gold >= 2 ? R.rampNeedGold2 : rp.gold >= 1 ? R.rampNeedGold : R.rampNeed;
  // gold boost arrows: holding on in the lane speeds you up
  if (rp.gold >= 2 && b.x > rp.x0 - 380 && b.x < rp.x0 && Math.abs(b.y - rp.y) < lane + 10 && G.players[st.pad].input.right && b.vx < need + 30) b.vx += 260 * dt;
  if (b.x >= rp.x0 && b.px < rp.x0) {
    rp.last = { v: b.vx, off: b.y - rp.y, vy: b.vy };
    if (Math.abs(b.y - rp.y) < lane && b.vx >= need && Math.abs(b.vy) < 95) {
      st.air = { t: 0, x0: rp.x0, vx: Math.max(b.vx, 280), y: b.y };
      Sfx.play('raftRamp'); raftPop(st, b.x + 60, b.y - 80, 'Up the fudge ramp!', C.gold, 26);
    }
  }
  b.px = b.x;
  if (b.x > rp.edge && !st.air) raftStartFall(st);
}
function raftAirStep(st, dt) {
  const R = RAFT, a = st.air, b = st.raft, rp = st.c.ramp;
  a.t += dt;
  b.x += a.vx * dt; b.vy = 0; b.y = raftLerp(b.y, a.y, 0.1);
  const u = clamp((b.x - rp.x0) / (rp.land - rp.x0), 0, 1);
  b.z = Math.sin(u * Math.PI) * 90 + (u < 0.36 ? u / 0.36 * 20 : 20 * (1 - (u - 0.36) / 0.64));
  b.w = 1.2; b.a += b.w * dt * 0.3;
  if (u >= 1) {
    st.air = null; st.flown = true; b.z = 0; b.vx = raftCS(st, b.x) + 120; b.w = 2;
    st.stats.jumps++;
    Sfx.play('raftSplash'); raftPop(st, b.x, b.y - 80, 'SPLASH! Wheee!', C.gold, 32);
    rumble(0, 0.3, 0.5, 200); rumble(1, 0.3, 0.5, 200);
    for (let i = 0; i < 26; i++) { const ang = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160; raftPart(st, b.x + Math.cos(ang) * 30, b.y + Math.sin(ang) * 30, Math.cos(ang) * s, Math.sin(ang) * s, 0.8, i % 3 ? '#8a4b28' : '#fff1dc', 4 + Math.random() * 4, 0, 'drop'); }
    raftPart(st, b.x, b.y, 0, 0, 0.9, 'rgba(255,241,220,0.9)', 50, 0, 'ring');
  }
}
function raftStartFall(st) {
  const b = st.raft, rp = st.c.ramp, R = RAFT;
  st.state = 'fall';
  rp.fails++; st.stats.splats++;
  const tried = G.time - st.inT[st.pad] < R.tryWin;
  if (tried) rp.tries++;
  st.fall = { t: 0, x0: b.x, y0: b.y, toX: st.cp.x };
  if (st.hk) st.hk.pullG = null;
  Sfx.play('raftWhoa');
  raftPop(st, b.x, b.y - 70, 'Whoa!', '#ffffff', 28);
  const want = rp.tries >= R.helpRamp2 ? 2 : rp.tries >= R.helpRamp ? 1 : 0;
  if (want > rp.gold) {
    rp.gold = want; st.stats.helps++;
    raftMsg(st, want === 2 ? 'Gold boost arrows! Hold ' + (raftQuiet(st.pad) ? 'on' : raftKey(st.pad, 'right')) + ' in the gold lane' : 'Gold fudge ramp! Wider and easier to jump', C.gold, 4);
    Sfx.play('raftHelp');
  } else {
    const last = rp.last;
    const why = !last ? 'Aim for the fudge ramp!' : Math.abs(last.off) >= (rp.gold ? R.rampLaneGold : R.rampLane) ? 'Line up with the ramp ' + raftKey(st.pad, 'up') + ' ' + raftKey(st.pad, 'down') : 'Faster! Paddle strokes ' + raftKey(st.pad, 'act') + ' before the ramp';
    raftHint(st, st.pad, why, 3.6);
  }
}
function raftFallStep(st, dt) {
  const f = st.fall, b = st.raft, R = RAFT;
  f.t += dt;
  // 0-1 s: over the edge and down the chocolate falls; Mallow the marshmallow duck paddles in and tows you back
  if (f.t < 1.0) { b.x = f.x0 + f.t * 120; b.z = -f.t * 60; b.a += dt * 3; }
  if (f.t > 0.95 && !f.splat) { f.splat = true; Sfx.play('raftSplat'); raftPop(st, b.x, b.y - 40, 'Splat! Fudge-tastic!', '#ffd0f0', 28); for (let i = 0; i < 16; i++) raftPart(st, b.x + (Math.random() - 0.5) * 60, b.y + (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 220, -40 - Math.random() * 160, 0.8, '#7a4024', 4 + Math.random() * 4, 260, 'drop'); }
  if (f.t > 1.6 && !f.duck) { f.duck = true; Sfx.play('raftQuack'); }
  if (f.t > 2.2 && !f.moved) {
    f.moved = true;
    raftPlace(st, f.toX, 0);
    st.raft.z = 0;
    st.cam.x = f.toX - R.camLead; st.cam.y = st.raft.y - H / 2 + 10;
  }
  if (f.t >= R.fallT) {
    st.state = 'ride'; st.fall = null; st.bestX = st.raft.x; st.noProgT = 0;
    raftPop(st, st.raft.x, st.raft.y - 70, 'Quack! Try again!', '#ffffff', 22);
  }
}

/* ---------- the dock: stop at the pier on the top bank, then swap jobs (or the village party) ---------- */
function raftDockBox(st) {
  const d = st.c.dock, R = RAFT, w = d.gold ? R.dockWGold : R.dockW;
  return { x0: d.x - w, x1: d.x + w, lMax: d.gold ? -0.15 : -0.45 };
}
function raftDock(st, dt) {
  const d = st.c.dock, b = st.raft, R = RAFT;
  if (!d) return;
  if (b.x > d.x - 600) { st.dockT += dt; d.t += dt; }
  const box = raftDockBox(st), l = raftYL(st, b.x, b.y, R.r + 4);
  const inBox = b.x > box.x0 && b.x < box.x1 && l < box.lMax;
  if (inBox && Math.hypot(b.vx, b.vy) < (d.gold ? R.dockV + 10 : R.dockV)) {
    st.docked += dt;
    if (st.docked > 0.35) { if (d.village) raftStartFinish(st); else raftStartSwap(st); }
  } else st.docked = 0;
}
function raftStartSwap(st) {
  st.state = 'dock'; st.swap = { t: 0, x: st.raft.x, y: st.raft.y };
  st.stats.roomT[st.k] = G.time - st.segStart;
  st.hk.pullG = null;
  raftPop(st, st.raft.x, st.raft.y - 120, 'Docked! Swap jobs!', C.gold, 30);
  Sfx.play('raftSwap'); rumble(0, 0.1, 0.4, 120); rumble(1, 0.1, 0.4, 120);
  for (let i = 0; i < 24; i++) { const a = Math.random() * Math.PI * 2; raftPart(st, st.raft.x, st.raft.y - 30, Math.cos(a) * 200, Math.sin(a) * 200, 0.9, ['#ff6b4a', '#5b95ff', '#ff9ccf', C.gold][i % 4], 4, 120, 'conf'); }
}
function raftSwapStep(st, dt) {
  const sw = st.swap, b = st.raft;
  sw.t += dt;
  b.vx *= Math.exp(-4 * dt); b.vy *= Math.exp(-4 * dt); b.x += b.vx * dt; b.y += b.vy * dt; b.w *= Math.exp(-3 * dt); b.a *= Math.exp(-3 * dt);
  if (sw.t > 0.55 && !sw.hop) { sw.hop = true; Sfx.play('raftHop'); }
  if (sw.t >= RAFT.swapT) {
    const L = G.level;
    if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return true; }
    levelClear(); return true;
  }
  return false;
}
function raftStartFinish(st) {
  st.state = 'finish'; st.fin = { t: 0 };
  st.stats.roomT[st.k] = G.time - st.segStart;
  raftPop(st, st.raft.x, st.raft.y - 120, 'Sweet ride! ' + st.score + ' candy!', C.gold, 30);
  Sfx.play('raftParty'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
}
function raftFinStep(st, dt) {
  const fin = st.fin, b = st.raft;
  fin.t += dt;
  b.vx *= Math.exp(-4 * dt); b.vy *= Math.exp(-4 * dt); b.x += b.vx * dt; b.y += b.vy * dt; b.a *= Math.exp(-3 * dt);
  if (Math.random() < dt * 14) { const x = st.cam.x + 100 + Math.random() * (W - 200); raftPart(st, x, st.cam.y - 10, (Math.random() - 0.5) * 60, 120 + Math.random() * 80, 2.2, ['#ff6b4a', '#5b95ff', '#ff9ccf', C.gold, '#8be37a'][Math.floor(Math.random() * 5)], 4, 40, 'conf'); }
  if (fin.t > 0.6 && !fin.cheer) { fin.cheer = true; Sfx.play('raftCheer'); }
  if (fin.t >= RAFT.finT && !fin.done) {
    fin.done = true;
    G.level.goal = { x: b.x - st.cam.x, y: b.y - st.cam.y - 40 };
    levelClear();
    return true;
  }
  return false;
}

/* ---------- gold help ---------- */
function raftGoldHook(st, words) { st.goldHook = true; st.stats.helps++; raftMsg(st, words, C.gold, 3.8); Sfx.play('raftHelp'); }
function raftHelp(st, dt) {
  const R = RAFT, b = st.raft, nd = raftNeeds(st), hookTry = G.time - st.inT[st.hook] < R.tryWin, padTry = G.time - st.inT[st.pad] < R.tryWin;
  if (!st.goldPaddle && st.bonksRoom >= R.helpBonk) { st.goldPaddle = true; st.stats.helps++; raftMsg(st, 'Gold paddle! Strokes push harder, the raft spins less', C.gold, 3.8); Sfx.play('raftHelp'); }
  // stuck at a log jam while the hooker is trying
  if (nd.jam && nd.jam.x - b.x < 150 && hookTry) { nd.jam.tryT += dt; if (nd.jam.tryT > R.helpJamT && !st.goldHook) raftGoldHook(st, 'Gold hook! It reaches further: shove the log jam'); }
  // at a toffee gate a while, both trying
  if (nd.gate && hookTry && padTry && nd.gate.x - b.x < 520) { nd.gate.tryT += dt; if (nd.gate.tryT > R.helpRingT && !nd.gate.gold) { nd.gate.gold = true; st.stats.helps++; raftMsg(st, 'Gold ring! A quick tug opens the gate now', C.gold, 3.8); Sfx.play('raftHelp'); } }
  const d = st.c.dock;
  if (d && !d.gold && st.dockT > R.helpDockT && padTry) { d.gold = true; st.stats.helps++; raftMsg(st, 'Gold pier! Stop anywhere along the gold planks', C.gold, 3.8); Sfx.play('raftHelp'); }
}

/* ---------- what each job needs right now (the prompts, the cards and the computer read this) ---------- */
// pad: 'go' | 'candy' | 'avoid' | 'pool' | 'jam' | 'gate' | 'hold' | 'ramp' | 'dock'   with ty (the y to steer to), vx (speed)
// hook: 'ready' | 'candy' | 'shove' | 'jam' | 'ring'   with target {x, y}
function raftNeeds(st) {
  const R = RAFT, b = st.raft, c = st.c, out = { pad: 'go', ty: null, vx: null, stroke: false, hook: 'ready', target: null, obj: null, jam: null, gate: null, ramp: null, dock: null, threat: null, pool: null, candy: null, far: null };
  if (!b || st.state !== 'ride' || st.air) return out;
  const reach = raftReach(st), hk = st.hk, cs = raftCS(st, b.x);
  out.ty = raftCY(st, b.x + 160); out.vx = cs + R.steerMax * 0.8;
  for (const j of c.jams) if (!j.open && j.x > b.x - 10 && j.x - b.x < 800 && (!out.jam || j.x < out.jam.x)) out.jam = j;
  for (const g of c.gates) if (!g.open && g.x > b.x - 10 && g.x - b.x < 1000 && (!out.gate || g.x < out.gate.x)) out.gate = g;
  if (c.ramp && !st.flown && c.ramp.x0 > b.x - 10 && c.ramp.x0 - b.x < 1300) out.ramp = c.ramp;
  if (c.dock && c.dock.x - b.x < 950) out.dock = c.dock;
  // things on a collision course ahead
  let thr = null;
  const look = (x, y, r, kind, o) => {
    const ax = x - b.x;
    if (ax < -10 || ax > 380) return;
    // where the raft will be across the river when it gets there (it drifts with the river's bends)
    const yAt = b.y + (raftCY(st, x) - raftCY(st, b.x)) * 0.8;
    if (Math.abs(y - yAt) > R.r + r + 10) return;
    if (!thr || ax < thr.ax) thr = { ax, x, y, r, kind, o };
  };
  for (const o of c.rocks) if (o.state === 'on') look(o.x, o.y, o.r, 'rock', o);
  for (const o of c.bonbons) if (o.state === 'on' && o.act) look(o.x, raftLY(st, o.x, o.l), o.r, 'bonbon', o);
  for (const o of c.logs) if (o.state === 'on' && o.act) { const q = raftLogEnds(st, o); for (const u of [0, 0.5, 1]) look(raftLerp(q.ax, q.bx, u), raftLerp(q.ay, q.by, u), 14, 'log', o); }
  out.threat = thr;
  // the hooker
  const tipTo = (x, y) => Math.hypot(x - b.x, y - b.y) < reach + 30;
  if (out.gate && out.gate.x - b.x < 650 && tipTo(raftRingPos(st, out.gate).x, raftRingPos(st, out.gate).y)) { out.hook = 'ring'; out.target = raftRingPos(st, out.gate); }
  else if (out.jam && out.jam.x - b.x < R.r + reach) { out.hook = 'jam'; out.target = { x: out.jam.x - 4, y: clamp(b.y, raftCY(st, out.jam.x) - raftHW(st, out.jam.x) + 20, raftCY(st, out.jam.x) + raftHW(st, out.jam.x) - 20) }; out.obj = out.jam; }
  else if (thr && Math.hypot(thr.x - b.x, thr.y - b.y) < reach + thr.r + 20) { out.hook = 'shove'; out.target = { x: thr.x, y: thr.y }; out.obj = thr.o; }
  else {
    let best = null;
    for (const cd of c.candy) {
      if (cd.got || cd.gone || !cd.act) continue;
      const p = raftCandyPos(st, cd), d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d < reach + cd.r + 6 && (!best || d < best.d)) best = { d, cd, p };
    }
    if (best) { out.hook = 'candy'; out.candy = best.cd; out.target = best.p; }
  }
  // the paddler
  const lineY = y => clamp(y, raftCY(st, b.x) - raftHW(st, b.x) + R.r + 8, raftCY(st, b.x) + raftHW(st, b.x) - R.r - 8);
  const rp = out.ramp;
  if (rp && rp.x0 - b.x < 1000) {
    out.pad = 'ramp'; out.ty = rp.y;
    const need = rp.gold >= 2 ? R.rampNeedGold2 : rp.gold >= 1 ? R.rampNeedGold : R.rampNeed;
    out.vx = rp.x0 - b.x < 520 ? need + 60 : cs + 60;
    out.stroke = rp.x0 - b.x < 420 && b.vx < need + 40;
    out.need = need;
  } else if (out.jam && out.jam.x - b.x < 460) {
    out.pad = 'jam'; out.vx = 0; out.stopX = out.jam.x - R.jamR - R.r - 22; out.ty = b.y;
  } else if (out.gate && out.gate.ringX - b.x < 480) {
    const g = out.gate, rpos = raftRingPos(st, g);
    out.pad = 'gate'; out.ty = rpos.y - g.side * (R.r + 34); out.stopX = rpos.x + 20; out.vx = 0;
    if (Math.abs(b.x - out.stopX) < 120 && Math.abs(b.y - out.ty) < 70) out.pad = 'hold';
  } else if (out.dock && out.dock.x - b.x < 640) {
    const box = raftDockBox(st), d = out.dock;
    out.pad = 'dock'; out.ty = raftLY(st, d.x, -1, R.r + 12); out.stopX = d.x; out.vx = 0;
  } else {
    // a whirlpool ahead: pass by its edge, on the side with more room (close enough for the hooker to grab swirling candy)
    let pl = null;
    for (const p of c.pools) if (p.x + p.R > b.x - 40 && p.x - p.R - b.x < 420 && (!pl || p.x < pl.x)) pl = p;
    if (pl) {
      const py = raftLY(st, pl.x, pl.l), top = py - (raftCY(st, pl.x) - raftHW(st, pl.x)), bot = raftCY(st, pl.x) + raftHW(st, pl.x) - py;
      const s = top > bot ? -1 : 1;
      out.pad = 'pool'; out.pool = pl; out.ty = lineY(py + s * (pl.R + R.r + 6)); out.vx = c.candy.some(cd => cd.pool === pl && !cd.got) && Math.abs(b.x - pl.x) < pl.R + 40 ? cs * 0.35 : cs + 40;
    }
    if (thr && out.pad === 'go') {
      // steer round it (the hooker may shove it too)
      const s = thr.y > b.y ? -1 : 1, room = s < 0 ? thr.y - (raftCY(st, thr.x) - raftHW(st, thr.x)) : raftCY(st, thr.x) + raftHW(st, thr.x) - thr.y;
      const s2 = room > 2 * R.r + 14 ? s : -s;
      out.pad = 'avoid'; out.ty = lineY(thr.y + s2 * (thr.r + R.r + 14));
    }
    if (out.pad === 'go') {
      // the next candy ahead out of reach: steer so the hooker can get it
      let best = null;
      for (const cd of c.candy) {
        if (cd.got || cd.gone || cd.pool) continue;
        const p = raftCandyPos(st, cd), ax = p.x - b.x;
        if (ax < -30 || ax > 520) continue;
        if (!best || ax < best.ax) best = { ax, cd, p };
      }
      if (best) {
        const off = best.p.y - b.y, keep = reach * 0.55;
        if (Math.abs(off) > keep) { out.pad = 'candy'; out.far = best.cd; out.ty = lineY(best.p.y - Math.sign(off) * keep * 0.8); }
        else out.ty = lineY(b.y + off * 0.3);
        if (best.ax < 200) out.vx = cs + 30;
      }
    }
  }
  return out;
}
// the gentle lessons, when they first matter; and pressing the other job's keys
function raftNudges(st, dt) {
  const b = st.raft, nd = raftNeeds(st), P = st.pad, Hk = st.hook, pi = G.players[P].input;
  if (nd.jam && nd.jam.x - b.x < 120 && pi.right) raftHintOnce(st, 'jam' + nd.jam.x, P, 'A log jam! ' + NAMES[Hk] + ' shoves it with the hook');
  if (nd.gate && nd.pad === 'hold' && nd.hook === 'ring') raftHintOnce(st, 'gate' + nd.gate.x, Hk, 'Hook the ring and HOLD ' + raftKey(Hk, 'act'));
}

/* ---------- small helpers ---------- */
function raftHint(st, id, text, life) { if (raftQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || RAFT.hintLife }; }
function raftHintOnce(st, key, id, text) { if (st.hinted[key]) return; st.hinted[key] = true; raftHint(st, id, text); }
function raftMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function raftPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 12) st.pops.shift(); }
function raftPart(st, x, y, vx, vy, life, col, size, grav, kind) {
  if (st.parts.length > 320) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
function raftSpark(st, x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 120; raftPart(st, x, y, Math.cos(a) * s, Math.sin(a) * s, 0.5, col, 3 + Math.random() * 2, 0, 'spark'); } }
// the touch buttons and the top-bar legend name each player's own action this stretch: the paddler paddles, the hooker hooks
let raftLabelEls = null;
function raftActLabels(st) {
  try {
    if (!raftLabelEls || !raftLabelEls.every(o => document.contains(o.el))) raftLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of raftLabelEls) {
      const want = o.id < 0 ? 'paddle/hook' : o.id === st.pad ? 'paddle' : 'hook';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}
function raftCam(st, dt) {
  const R = RAFT, b = st.raft, cam = st.cam, c = st.c;
  let tx = b.x - R.camLead + clamp(b.vx * 0.35, -40, 140);
  if (c.dock) tx = Math.min(tx, c.dock.net + 140 - W);
  let ty = (raftCY(st, b.x + 260) * 0.55 + b.y * 0.45) - H / 2 + 20;
  if (st.state === 'finish') ty = b.y - H / 2 + 30;
  if (st.state === 'fall' && st.fall && !st.fall.moved) tx = st.fall.x0 - R.camLead;
  cam.x += (tx - cam.x) * Math.min(1, dt * 4);
  cam.y += (ty - cam.y) * Math.min(1, dt * 3);
  const sy = b.y - cam.y;
  if (sy < 150) cam.y = b.y - 150; else if (sy > 350) cam.y = b.y - 350;
}
function raftFx(st, dt) {
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 5;
    if (q.kind === 'drop' || q.kind === 'crumb') { q.vx *= 1 - dt * 2.5; q.vy *= 1 - dt * 2.5; }
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.3);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  for (const f of st.fly) f.t += dt;
  st.fly = st.fly.filter(f => f.t < 0.6);
  for (const f of st.c.flags) if (f.on) f.t += dt;
  // a little wake behind the raft
  const b = st.raft;
  if (st.state === 'ride' && !st.air && Math.hypot(b.vx, b.vy) > 60) {
    st.wakeT = (st.wakeT || 0) - dt;
    if (st.wakeT <= 0) { st.wakeT = 0.09; raftPart(st, b.x - b.vx / Math.hypot(b.vx, b.vy) * 46, b.y - b.vy / Math.hypot(b.vx, b.vy) * 46 + (Math.random() - 0.5) * 40, -b.vx * 0.1, (Math.random() - 0.5) * 20, 0.9, 'rgba(255,236,214,0.55)', 4 + Math.random() * 4, 0, 'wake'); }
  }
}
// the two seats on the raft (world px), turning with it; during the swap both hop over to the other seat
function raftSeat(st, id) {
  const b = st.raft, ca = Math.cos(b.a), sa = Math.sin(b.a), pad = id === st.pad;
  const lx = pad ? -20 : 20, ly = 22;
  let x = b.x + ca * lx - sa * ly, y = b.y + sa * lx + ca * ly;
  if (st.state === 'dock' && st.swap) {
    const u = clamp((st.swap.t - 0.55) / 0.9, 0, 1), olx = -lx;
    const tx = b.x + ca * olx - sa * ly, ty = b.y + sa * olx + ca * ly;
    x = raftLerp(x, tx, raftSmooth(u)); y = raftLerp(y, ty, u) - (pad ? 60 : 95) * 4 * u * (1 - u);
  }
  return { x, y: y - (b.z || 0) };
}
function raftMirror(st) {
  const cam = st.cam;
  for (const p of G.players) {
    const s = raftSeat(st, p.id);
    p.x = s.x - cam.x - PW / 2; p.y = s.y - cam.y - PH;
    p.alive = true; p.grounded = true; p.stompSafe = 0; p.vy = 0; p.vx = st.raft.vx;
    p.face = 1;
    p.stun = st.state === 'fall' && st.fall && st.fall.t > 0.9 && st.fall.t < 2.2 ? 0.5 : 0;
  }
}

MODES.raft = {
  RAFT,
  compile: raftCompile, needs: raftNeeds, cy: raftCY, hw: raftHW, cs: raftCS, ly: raftLY, flow: raftFlow, candyPos: raftCandyPos,
  ringPos: raftRingPos, logEnds: raftLogEnds, reach: raftReach, key: raftKey, dockBox: raftDockBox,
  setup(st, L) {
    st.stats = { bonks: 0, spins: 0, splats: 0, lost: 0, gates: 0, jumps: 0, gummies: 0, helps: 0, hooked: [0, 0], shoves: [0, 0], strokes: [0, 0], roomT: [], roomTitles: [] };
    st.score = 0;
    // count every stretch's candy up front (the HUD shows "x of all")
    const def = LEVELS[G.levelIndex];
    st.scoreAll = (def.rooms || [def]).reduce((n, r) => n + (r.course || []).reduce((m, t) => {
      t = String(t);
      if (t.startsWith('c:')) return m + ((RAFT_CANDY[t.split(':')[1]] || RAFT_CANDY.wrap).pts);
      if (t.startsWith('P:')) return m + (parseInt(t.split(':')[3], 10) || 0);
      return m;
    }, 0), 0);
    raftRoom(st, L, 0);
  },
  room(k, L) { raftRoom(G.mst, L, k); },
  step(dt) { raftStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then, and drawn on the raft instead
  draw() {
    const st = G.mst;
    if (!st.raft) return;
    raftDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.raft) return;
    raftDrawFront(st);
  },
  hud() { const st = G.mst; if (st.raft) raftHud(st); },
  stats() {
    const st = G.mst, s = st.stats;
    if (!s) return [];
    const all = st.scoreAll || 1, got = st.score, frac = got / all, t = G.time;
    const medal = raftMedal(frac, t);
    const out = [
      { label: 'Candy', value: got + ' of ' + all },
      { label: 'Candy hooked', values: s.hooked.slice() },
      { label: 'Bonks', value: s.bonks },
      { label: 'Medal', value: medal },
    ];
    const words = frac >= 0.9 ? 'A basket full to the brim. Sweetest crew on the river!' : frac >= 0.6 ? 'A tasty haul of candy. Great paddling and hooking!' : 'Splashy, swirly, and home safe together!';
    out.push(words + ' Shoves: ' + (s.shoves[0] + s.shoves[1]) + '. Wheees: ' + s.spins + '. Splats: ' + s.splats + '.');
    if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
    return out;
  },
};
// Gold: most of the candy and quick; Silver: a fair basket in fair time
const RAFT_MEDAL = { gold: [0.75, 270], silver: [0.45, 450] };
function raftMedal(frac, t) { return frac >= RAFT_MEDAL.gold[0] && t <= RAFT_MEDAL.gold[1] ? 'Gold' : frac >= RAFT_MEDAL.silver[0] && t <= RAFT_MEDAL.silver[1] ? 'Silver' : 'Bronze'; }

/* ---------- drawing (top-down) ---------- */
let raftBankG = null;
function raftDrawWorld(st) {
  const cam = st.cam;
  if (!raftBankG) { raftBankG = ctx.createLinearGradient(0, 0, 0, H); raftBankG.addColorStop(0, '#ffe3f1'); raftBankG.addColorStop(1, '#ffd2e6'); }
  ctx.fillStyle = raftBankG; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  raftDrawSprinkles(st);
  raftDrawRiver(st);
  raftDrawWater(st);
  raftDrawThings(st);
  raftDrawBanks(st);
  ctx.restore();
}
const raftVis = (st, x, m = 80) => x > st.cam.x - m && x < st.cam.x + W + m;
// sprinkles on the frosting banks (anchored to the world)
function raftDrawSprinkles(st) {
  const cam = st.cam, cols = ['#ff5fa2', '#58c6ff', '#ffd23d', '#8be37a', '#c58cff', '#ffffff'];
  ctx.lineCap = 'round'; ctx.lineWidth = 3;
  for (let gx = Math.floor((cam.x - 40) / 46); gx * 46 < cam.x + W + 40; gx++) {
    const cy = raftCY(st, gx * 46 + 20), hw = raftHW(st, gx * 46 + 20);
    for (let gy = Math.floor((cam.y - 40) / 46); gy * 46 < cam.y + H + 40; gy++) {
      const h = hash(gx, gy + 900), x = gx * 46 + (h % 40), y = gy * 46 + ((h >>> 7) % 40);
      if (Math.abs(y - cy) < hw + 22) continue;
      const a = ((h >>> 12) % 628) / 100;
      ctx.strokeStyle = cols[(h >>> 4) % cols.length];
      ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 4, y - Math.sin(a) * 4); ctx.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); ctx.stroke();
    }
  }
}
function raftDrawRiver(st) {
  const cam = st.cam, x0 = Math.floor((cam.x - 40) / 8) * 8, x1 = cam.x + W + 40;
  ctx.fillStyle = '#713e22';
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, raftCY(st, x) - raftHW(st, x));
  for (let x = Math.floor(x1 / 8) * 8; x >= x0; x -= 8) ctx.lineTo(x, raftCY(st, x) + raftHW(st, x));
  ctx.closePath(); ctx.fill();
  // a glossy highlight down the river
  ctx.strokeStyle = 'rgba(255,220,190,0.07)'; ctx.lineWidth = 60; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); for (let x = x0; x <= x1; x += 16) ctx.lineTo(x, raftCY(st, x) - raftHW(st, x) * 0.25); ctx.stroke();
  // darker water along both banks
  ctx.strokeStyle = 'rgba(60,26,10,0.22)'; ctx.lineWidth = 36;
  for (const s of [-1, 1]) { ctx.beginPath(); for (let x = x0; x <= x1; x += 16) ctx.lineTo(x, raftCY(st, x) + s * (raftHW(st, x) - 14)); ctx.stroke(); }
}
// the water moving: ripple streaks with the current, foam on the rapids, eddies, whirlpools
function raftDrawWater(st) {
  const cam = st.cam, t = G.clock, c = st.c;
  ctx.lineCap = 'round';
  for (let gx = Math.floor((cam.x - 100) / 90); gx * 90 < cam.x + W + 100; gx++) {
    const base = gx * 90, cs0 = raftCS(st, base), fast = cs0 > 118;
    for (let k = 0; k < 4; k++) {
      const h = hash(gx, k + 77);
      const ph = ((h % 90) + t * cs0 * 0.9) % 90, x = base + ph, l = (((h >>> 8) % 170) / 100 - 0.85);
      const y = raftLY(st, x, l, 20), a = Math.sin(Math.PI * ph / 90);
      const sl = (raftCY(st, x + 8) - raftCY(st, x - 8)) / 16, len = fast ? 26 : 16;
      ctx.strokeStyle = fast ? 'rgba(255,244,228,' + (0.55 * a) + ')' : 'rgba(255,214,180,' + (0.28 * a) + ')';
      ctx.lineWidth = fast ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(x - len / 2, y - sl * len / 2); ctx.quadraticCurveTo(x, y - 3, x + len / 2, y + sl * len / 2); ctx.stroke();
      if (fast && k < 2) {
        // cream foam chevrons on the rapids
        const fx = base + ((h >>> 3) % 90 + t * cs0) % 90, fl = (((h >>> 16) % 150) / 100 - 0.75), fy = raftLY(st, fx, fl, 20);
        ctx.strokeStyle = 'rgba(255,248,236,0.5)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(fx - 8, fy - 7); ctx.lineTo(fx, fy); ctx.lineTo(fx - 8, fy + 7); ctx.stroke();
      }
    }
  }
  for (const e of c.eddies) {
    if (e.x1 < cam.x - 40 || e.x0 > cam.x + W + 40) continue;
    const mx = (e.x0 + e.x1) / 2, my = raftLY(st, mx, e.side * 0.74, 20), rx = (e.x1 - e.x0) / 2 * 0.85, ry = raftHW(st, mx) * 0.22;
    ctx.fillStyle = 'rgba(160,96,60,0.35)'; ctx.beginPath(); ctx.ellipse(mx, my, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,226,196,0.4)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a0 = -t * 0.9 * e.side + i * 2.1;
      ctx.beginPath(); ctx.ellipse(mx, my, rx * 0.8, ry * 0.6, 0, a0, a0 + 1.3); ctx.stroke();
    }
  }
  for (const p of c.pools) {
    if (!raftVis(st, p.x, p.R + 40)) continue;
    const py = raftLY(st, p.x, p.l), rg = ctx.createRadialGradient(p.x, py, 4, p.x, py, p.R);
    rg.addColorStop(0, '#8a4a16'); rg.addColorStop(0.35, '#d08a2a'); rg.addColorStop(0.8, '#e8a848'); rg.addColorStop(1, 'rgba(232,168,72,0)');
    ctx.fillStyle = rg; circle(p.x, py, p.R); ctx.fill();
    const sp = (p.sleepy ? 0.8 : 2.2) * p.dir * t;
    ctx.strokeStyle = 'rgba(255,236,190,0.75)'; ctx.lineWidth = 3;
    for (let arm = 0; arm < 3; arm++) {
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) { const u = i / 18, a = sp + arm * 2.09 + p.dir * u * 4.2, r = 8 + u * (p.R - 14); ctx.lineTo(p.x + Math.cos(a) * r, py + Math.sin(a) * r); }
      ctx.stroke();
    }
    if (p.sleepy) { text('z', p.x + 18, py - p.R * 0.5 - Math.sin(t * 2) * 4, 16, C.gold, 'center'); text('z', p.x + 30, py - p.R * 0.5 - 16 - Math.sin(t * 2 + 1) * 4, 12, C.gold, 'center'); }
  }
}
// wafer-biscuit bank edges with a frill of cream; candy trees; signs and flags
function raftDrawBanks(st) {
  const cam = st.cam, x0 = Math.floor((cam.x - 40) / 8) * 8, x1 = cam.x + W + 40;
  for (const s of [-1, 1]) {
    const pts = [];
    for (let x = x0; x <= x1; x += 8) pts.push([x, raftCY(st, x) + s * raftHW(st, x)]);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = '#c98a45'; ctx.lineWidth = 18; ctx.beginPath(); for (const [x, y] of pts) ctx.lineTo(x, y + s * 4); ctx.stroke();
    ctx.strokeStyle = '#e8b06a'; ctx.lineWidth = 12; ctx.beginPath(); for (const [x, y] of pts) ctx.lineTo(x, y + s * 4); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,96,40,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); for (let i = 0; i < pts.length; i += 2) { const [x, y] = pts[i]; ctx.moveTo(x, y - 2 + s * 4); ctx.lineTo(x, y + 6 + s * 4); } ctx.stroke();
    ctx.strokeStyle = 'rgba(255,248,236,0.9)'; ctx.lineWidth = 4; ctx.beginPath();
    for (const [x, y] of pts) ctx.lineTo(x, y - s * 3 + Math.sin(x / 13 + G.clock * 3) * 1.5);
    ctx.stroke();
  }
  const c = st.c, vil = c.dock && c.dock.village;
  for (let k = Math.floor((cam.x - 120) / 110); k * 110 < cam.x + W + 120; k++) for (const s of [-1, 1]) {
    const h = hash(k, s > 0 ? 31 : 17), x = k * 110 + (h % 60), y = raftCY(st, x) + s * (raftHW(st, x) + 34 + ((h >>> 6) % 70));
    if (y < cam.y - 60 || y > cam.y + H + 80) continue;
    if (vil && Math.abs(x - c.dock.x) < 700) continue;
    if (s < 0 && c.signs.some(q => Math.abs(q.x - x) < 120)) continue;
    raftDeco(x, y, (h >>> 10) % 6, h);
  }
  for (const s of c.signs) if (raftVis(st, s.x, 240)) {
    // on the top bank, unless that would sit under the level pills: then on the bottom bank
    let y = raftCY(st, s.x) - raftHW(st, s.x) - 22;
    if (y - 34 - st.cam.y < 150) y = raftCY(st, s.x) + raftHW(st, s.x) + 92;
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(s.text).width + 24;
    ctx.fillStyle = '#9a6a2e'; ctx.fillRect(s.x - 2, y - 4, 4, 22);
    ctx.fillStyle = 'rgba(92,44,24,0.92)'; rr(s.x - w / 2, y - 34, w, 30, 9); ctx.fill();
    ctx.strokeStyle = '#ffb3d6'; ctx.lineWidth = 2; rr(s.x - w / 2, y - 34, w, 30, 9); ctx.stroke();
    text(s.text, s.x, y - 18.5, 13, C.paper, 'center', 'body');
  }
  for (const f of c.flags) if (raftVis(st, f.x)) {
    const y = raftCY(st, f.x) + raftHW(st, f.x) + 46, up = f.on ? Math.min(1, f.t * 3) : 0;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f.x, y); ctx.lineTo(f.x, y - 46); ctx.stroke();
    ctx.strokeStyle = '#ff5fa2'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(f.x, y); ctx.lineTo(f.x, y - 46); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = f.on ? '#8be37a' : '#ffb3d6';
    const top = y - 46 + (1 - up) * 14, wave = Math.sin(G.clock * 5 + f.x) * 2;
    ctx.beginPath(); ctx.moveTo(f.x, top); ctx.quadraticCurveTo(f.x + 12, top + 3 + wave, f.x + 24, top + 7); ctx.lineTo(f.x, top + 15); ctx.closePath(); ctx.fill();
  }
  if (c.dock) raftDrawDock(st);
}
// one bank decoration: 0 lollipop tree, 1 candy cane, 2 gumdrop, 3 cupcake bush, 4 cotton-candy tree, 5 chocolate drop
function raftDeco(x, y, kind, h) {
  const cols = ['#ff5fa2', '#58c6ff', '#ffd23d', '#8be37a', '#c58cff', '#ff8a4a'], col = cols[(h >>> 3) % cols.length];
  ctx.fillStyle = 'rgba(140,60,90,0.14)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
  if (kind === 0) {
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 2.5, y - 34, 5, 38);
    ctx.fillStyle = col; circle(x, y - 44, 17); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5; ctx.beginPath();
    for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 4, r = 2 + i * 0.6; ctx.lineTo(x + Math.cos(a) * r, y - 44 + Math.sin(a) * r); }
    ctx.stroke();
  } else if (kind === 1) {
    ctx.lineCap = 'round'; ctx.lineWidth = 7;
    ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, y - 34); ctx.arc(x + 9, y - 34, 9, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = '#ff3d6e'; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, y - 34); ctx.arc(x + 9, y - 34, 9, Math.PI, 0); ctx.stroke(); ctx.setLineDash([]);
  } else if (kind === 2) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 15, y + 2); ctx.quadraticCurveTo(x - 16, y - 24, x, y - 24); ctx.quadraticCurveTo(x + 16, y - 24, x + 15, y + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = 0; i < 5; i++) ctx.fillRect(x - 9 + (h >>> i) % 16, y - 18 + ((h >>> (i + 4)) % 16), 2, 2);
  } else if (kind === 3) {
    ctx.fillStyle = '#c98a45'; ctx.beginPath(); ctx.moveTo(x - 13, y - 12); ctx.lineTo(x + 13, y - 12); ctx.lineTo(x + 10, y + 3); ctx.lineTo(x - 10, y + 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col; for (const [dx, dy, r] of [[-8, -16, 8], [8, -16, 8], [0, -22, 9]]) { circle(x + dx, y + dy, r); ctx.fill(); }
    ctx.fillStyle = '#ff3d6e'; circle(x, y - 33, 4); ctx.fill();
  } else if (kind === 4) {
    ctx.fillStyle = '#e8b06a'; ctx.fillRect(x - 2, y - 26, 4, 30);
    ctx.fillStyle = (h & 1) ? '#ffb3e0' : '#b9e6ff';
    for (const [dx, dy, r] of [[-10, -36, 12], [10, -36, 12], [0, -46, 13], [0, -30, 11]]) { circle(x + dx, y + dy, r); ctx.fill(); }
  } else {
    ctx.fillStyle = '#5a2e18'; ctx.beginPath(); ctx.moveTo(x - 13, y + 2); ctx.quadraticCurveTo(x - 6, y - 8, x, y - 22); ctx.quadraticCurveTo(x + 6, y - 8, x + 13, y + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x - 5, y - 10, 3, 8);
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 30, 8, 3);
  }
}
// things in the water: the ramp and falls, gates, jams, rocks, logs, bonbons, candy
function raftDrawThings(st) {
  const c = st.c, t = G.clock;
  if (c.ramp) raftDrawFalls(st);
  for (const g of c.gates) if (raftVis(st, g.x, 340)) raftDrawGate(st, g);
  for (const j of c.jams) if (raftVis(st, j.x, 140)) raftDrawJam(st, j);
  for (const o of c.rocks) {
    if (o.state === 'gone' || !raftVis(st, o.x)) continue;
    const a = o.state === 'shoved' ? clamp((1.3 - o.t) / 0.4, 0, 1) : 1, bob = Math.sin(t * 1.8 + o.ph) * 1.5, sq = 1 + (o.wob || 0) * 0.15 * Math.sin(t * 30);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(60,24,10,0.35)'; ctx.beginPath(); ctx.ellipse(o.x + 4, o.y + 6, o.r * 1.05, o.r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0dde8'; ctx.beginPath(); ctx.ellipse(o.x, o.y + bob + 4, o.r * sq, o.r * 0.92 / sq, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(o.x, o.y + bob - 2, o.r * 0.92 * sq, o.r * 0.8 / sq, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffb3d6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(o.x, o.y + bob - 2, o.r * 0.5, 0.3, 4.5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(o.x - o.r * 0.35, o.y + bob - o.r * 0.4, o.r * 0.25, o.r * 0.14, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,226,0.5)'; ctx.lineWidth = 2; circle(o.x, o.y + 4, o.r + 4 + Math.sin(t * 3 + o.ph) * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const o of c.logs) {
    if (o.state === 'gone' || !raftVis(st, o.x, 120)) continue;
    const q = raftLogEnds(st, o), a = o.state === 'shoved' ? clamp((1.4 - o.t) / 0.4, 0, 1) : 1;
    ctx.globalAlpha = a;
    ctx.save(); ctx.translate(q.cx, q.cy); ctx.rotate(o.a + (o.wob || 0) * 0.1 * Math.sin(t * 25));
    ctx.fillStyle = 'rgba(60,24,10,0.3)'; rr(-o.len / 2 + 4, -10, o.len, 26, 12); ctx.fill();
    raftWafer(-o.len / 2, -13, o.len, 26);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  for (const o of c.bonbons) {
    if (o.state === 'gone' || !raftVis(st, o.x)) continue;
    const y = raftLY(st, o.x, o.l), a = o.state === 'shoved' ? clamp((1.2 - o.t) / 0.4, 0, 1) : 1, bob = Math.sin(t * 2.5 + o.ph) * 2;
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(255,240,226,0.45)'; ctx.lineWidth = 2; circle(o.x, y + 3, o.r + 4 + Math.sin(t * 4 + o.ph) * 2); ctx.stroke();
    ctx.fillStyle = '#3e1d0e'; circle(o.x, y + bob, o.r); ctx.fill();
    ctx.strokeStyle = ['#ff8fc7', '#ffffff', '#ffd23d'][o.col]; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i < 5; i++) { const xx = o.x - o.r * 0.7 + i * o.r * 0.35; ctx.lineTo(xx, y + bob - 4 + (i % 2 ? 5 : -2)); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; circle(o.x - 5, y + bob - 6, 4); ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const cd of c.candy) {
    if (cd.got || cd.gone || !raftVis(st, cd.x, 160)) continue;
    const p = raftCandyPos(st, cd);
    raftDrawCandy(cd, p.x, p.y, 1, t);
  }
}
function raftWafer(x, y, w, h) {
  ctx.fillStyle = '#e8b06a'; rr(x, y, w, h, 7); ctx.fill();
  ctx.strokeStyle = '#b07a38'; ctx.lineWidth = 2; rr(x, y, w, h, 7); ctx.stroke();
  ctx.strokeStyle = 'rgba(150,96,40,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = 10; i < w - 4; i += 10) { ctx.moveTo(x + i, y + 3); ctx.lineTo(x + i, y + h - 3); }
  for (let j = 8; j < h - 2; j += 8) { ctx.moveTo(x + 3, y + j); ctx.lineTo(x + w - 3, y + j); }
  ctx.stroke();
  ctx.fillStyle = '#f6efdf'; rr(x + 3, y + 2, w - 6, 3, 2); ctx.fill();
}
function raftDrawCandy(cd, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (s >= 1) { ctx.strokeStyle = 'rgba(255,240,226,0.45)'; ctx.lineWidth = 2; circle(0, 4, cd.r + 5 + Math.sin(t * 4 + cd.ph) * 2); ctx.stroke(); }
  if (cd.kind === 'wrap' || cd.kind === 'swirl') {
    ctx.rotate(Math.sin(t * 1.5 + cd.ph) * 0.4);
    ctx.fillStyle = cd.col;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-17, -7); ctx.lineTo(-17, 7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(17, -7); ctx.lineTo(17, 7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-4, -7); ctx.lineTo(2, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(-4, -3, 2.5); ctx.fill();
  } else if (cd.kind === 'lolly') {
    ctx.fillStyle = '#fff'; ctx.fillRect(-2, 2, 4, 14);
    ctx.fillStyle = cd.col; circle(0, -2, 13); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI * 4 + t * 0.5, r = 1.5 + i * 0.5; ctx.lineTo(Math.cos(a) * r, -2 + Math.sin(a) * r); }
    ctx.stroke();
  } else if (cd.kind === 'gummy') {
    // a gummy bear in a striped inner tube, waving
    ctx.lineWidth = 7; ctx.strokeStyle = '#fff'; circle(0, 4, 15); ctx.stroke();
    ctx.strokeStyle = '#ff3d6e'; ctx.setLineDash([6, 6]); circle(0, 4, 15); ctx.stroke(); ctx.setLineDash([]);
    const wave = Math.sin(t * 8 + cd.ph) * 0.6;
    ctx.fillStyle = cd.col; ctx.globalAlpha *= 0.92;
    circle(0, -4, 9); ctx.fill(); circle(0, -15, 7); ctx.fill(); circle(-5, -21, 3); ctx.fill(); circle(5, -21, 3); ctx.fill();
    ctx.save(); ctx.translate(7, -8); ctx.rotate(-1.2 + wave); rr(-2.5, -11, 5, 12, 2.5); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(-7, -6); ctx.rotate(0.5); rr(-2.5, -1, 5, 9, 2.5); ctx.fill(); ctx.restore();
    ctx.globalAlpha /= 0.92;
    ctx.fillStyle = '#2a1408'; circle(-2.5, -16, 1.3); ctx.fill(); circle(2.5, -16, 1.3); ctx.fill();
    ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, -14, 2.2, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(-3, -6, 2.5); ctx.fill();
  }
  ctx.restore();
}
function raftDrawGate(st, g) {
  const t = G.clock, top = raftCY(st, g.x) - raftHW(st, g.x), bot = raftCY(st, g.x) + raftHW(st, g.x), rp = raftRingPos(st, g);
  for (const y of [top - 6, bot + 6]) { ctx.fillStyle = '#9a5a1e'; rr(g.x - 9, y - 9, 18, 18, 5); ctx.fill(); ctx.fillStyle = '#ffd23d'; circle(g.x, y, 4); ctx.fill(); }
  const pullU = g.open ? 0 : clamp(g.pull / (g.gold ? RAFT.ringPullGold : RAFT.ringPull), 0, 1);
  ctx.lineCap = 'round';
  if (!g.open) {
    // three stretchy toffee strands across the river (they bow while being pulled)
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 7, bow = -pullU * 26 + Math.sin(t * 3 + i) * 2;
      ctx.strokeStyle = i === 1 ? '#f2b04a' : '#d98a26'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(g.x + off, top - 4); ctx.quadraticCurveTo(g.x + off + bow, (top + bot) / 2, g.x + off, bot + 4); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,200,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(g.x + off - 2, top - 2); ctx.quadraticCurveTo(g.x + off - 2 + bow, (top + bot) / 2, g.x + off - 2, bot + 2); ctx.stroke();
    }
  } else {
    const u = clamp(g.t / 0.4, 0, 1), len = raftLerp((bot - top) / 2, 18, raftSmooth(u));
    ctx.strokeStyle = '#d98a26'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(g.x, top - 4); ctx.lineTo(g.x - 6, top + len); ctx.moveTo(g.x, bot + 4); ctx.lineTo(g.x - 6, bot - len); ctx.stroke();
  }
  // the pull ring on its post up the bank, joined to the gate by a toffee rope
  ctx.strokeStyle = 'rgba(217,138,38,0.7)'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]);
  ctx.beginPath(); ctx.moveTo(rp.x, rp.y + g.side * 14); ctx.quadraticCurveTo((rp.x + g.x) / 2, rp.y + g.side * 34, g.x, g.side < 0 ? top - 6 : bot + 6); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#9a5a1e'; ctx.fillRect(rp.x - 4, rp.y + (g.side < 0 ? -28 : 4), 8, 24);
  const glow = !g.open ? 0.5 + 0.5 * Math.sin(t * 5) : 0, rad = g.gold ? 15 : 12, ry = rp.y + pullU * 10 * -g.side;
  if (!g.open) { ctx.fillStyle = g.gold ? 'rgba(255,197,61,' + (0.3 + glow * 0.3) + ')' : 'rgba(255,255,255,' + (0.2 + glow * 0.25) + ')'; circle(rp.x, rp.y, rad + 9); ctx.fill(); }
  ctx.lineWidth = 6; ctx.strokeStyle = g.gold ? C.gold : '#ffffff'; circle(rp.x, ry, rad); ctx.stroke();
  ctx.strokeStyle = '#ff3d6e'; ctx.setLineDash([5, 5]); circle(rp.x, ry, rad); ctx.stroke(); ctx.setLineDash([]);
}
function raftDrawJam(st, j) {
  const top = raftCY(st, j.x) - raftHW(st, j.x) - 8, bot = raftCY(st, j.x) + raftHW(st, j.x) + 8, t = G.clock, len = bot - top;
  if (!j.open) {
    const wob = j.wob * Math.sin(t * 30) * 4;
    ctx.fillStyle = 'rgba(60,24,10,0.3)'; rr(j.x - 13 + wob, top + 6, 34, len, 12); ctx.fill();
    ctx.save(); ctx.translate(j.x + wob, top); ctx.rotate(Math.PI / 2); raftWafer(0, -17, len, 34); ctx.restore();
    ctx.save(); ctx.translate(j.x - 14 + wob * 0.5, top + len * 0.18); ctx.rotate(Math.PI / 2 + 0.25); raftWafer(0, -10, len * 0.4, 20); ctx.restore();
    if (j.hits) { ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 3; const my = (top + bot) / 2; ctx.beginPath(); ctx.moveTo(j.x - 15, my - 12); ctx.lineTo(j.x - 2, my + 2); ctx.lineTo(j.x - 8, my + 10); ctx.lineTo(j.x + 15, my + 18); ctx.stroke(); }
  } else {
    // two halves swung aside to the banks
    const u = raftSmooth(clamp(j.t / 0.7, 0, 1)), half = len / 2 - 6;
    ctx.save(); ctx.translate(j.x, top); ctx.rotate(Math.PI / 2 - u * 1.45); raftWafer(0, -15, half, 30); ctx.restore();
    ctx.save(); ctx.translate(j.x, bot); ctx.rotate(-Math.PI / 2 + u * 1.45); raftWafer(0, -15, half, 30); ctx.restore();
  }
}
function raftDrawFalls(st) {
  const rp = st.c.ramp, t = G.clock;
  if (!raftVis(st, rp.x0, 520)) return;
  const R = RAFT, lane = rp.gold >= 1 ? R.rampLaneGold : R.rampLane;
  if (rp.gold >= 2 && !st.flown) {
    ctx.fillStyle = 'rgba(255,197,61,0.2)'; ctx.fillRect(rp.x0 - 380, rp.y - lane, 380, lane * 2);
    for (let i = 0; i < 6; i++) { const ax = rp.x0 - 370 + ((i * 64 + t * 160) % 380); ctx.fillStyle = 'rgba(255,197,61,0.85)'; ctx.beginPath(); ctx.moveTo(ax, rp.y - 12); ctx.lineTo(ax + 16, rp.y); ctx.lineTo(ax, rp.y + 12); ctx.closePath(); ctx.fill(); }
  }
  // the fudge ramp: a wedge rising toward the edge
  const g = ctx.createLinearGradient(rp.x0, 0, rp.x1, 0);
  g.addColorStop(0, '#5a2a12'); g.addColorStop(1, '#a0582a');
  ctx.fillStyle = g; rr(rp.x0, rp.y - lane, rp.x1 - rp.x0, lane * 2, 8); ctx.fill();
  ctx.strokeStyle = rp.gold ? C.gold : '#ffd9a8'; ctx.lineWidth = 3; rr(rp.x0, rp.y - lane, rp.x1 - rp.x0, lane * 2, 8); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,220,180,0.35)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 1; i < 5; i++) { ctx.moveTo(rp.x0 + i * 28, rp.y - lane + 4); ctx.lineTo(rp.x0 + i * 28, rp.y + lane - 4); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,240,220,0.85)';
  for (const dy of [-lane * 0.5, lane * 0.5]) { ctx.beginPath(); ctx.moveTo(rp.x0 + 50, rp.y + dy - 7); ctx.lineTo(rp.x0 + 70, rp.y + dy); ctx.lineTo(rp.x0 + 50, rp.y + dy + 7); ctx.closePath(); ctx.fill(); }
  // the falls: the river drops away at the edge
  const ex = rp.edge, top = raftCY(st, ex) - raftHW(st, ex), bot = raftCY(st, ex) + raftHW(st, ex);
  const fg = ctx.createLinearGradient(ex, 0, ex + 70, 0);
  fg.addColorStop(0, '#2e1308'); fg.addColorStop(1, 'rgba(46,19,8,0)');
  ctx.fillStyle = fg; ctx.fillRect(ex, top, 70, bot - top);
  ctx.strokeStyle = '#fff1dc'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ex, top); ctx.lineTo(ex, bot); ctx.stroke();
  for (let i = 0; i < 14; i++) {
    const y = top + (i + 0.5) / 14 * (bot - top), k = ((t * 1.3 + i * 0.37) % 1);
    ctx.fillStyle = 'rgba(255,241,220,' + (0.7 * (1 - k)) + ')'; circle(ex + 10 + k * 50, y + Math.sin(i * 3) * 4, 3 + k * 5); ctx.fill();
  }
  text('FUDGE FALLS', ex + 8, top - 60, 18, '#7a3d1c', 'center');
}
function raftDrawDock(st) {
  const d = st.c.dock, R = RAFT, top = raftCY(st, d.x) - raftHW(st, d.x), w = d.gold ? R.dockWGold : R.dockW;
  if (!raftVis(st, d.x, 760)) return;
  // the pier: wafer planks out over the water (gold when it grew)
  ctx.fillStyle = 'rgba(60,24,10,0.25)'; ctx.fillRect(d.x - w - 10, top + 2, (w + 10) * 2, 36);
  for (let x = d.x - w - 10; x < d.x + w + 10; x += 16) {
    const k = Math.floor((x - d.x) / 16) & 1;
    ctx.fillStyle = d.gold ? (k ? '#ffd76a' : C.gold) : (k ? '#e8b06a' : '#d99a50');
    rr(x, top - 14, 14, 46, 3); ctx.fill();
  }
  ctx.fillStyle = '#9a5a1e'; for (const x of [d.x - w - 6, d.x + w + 4]) { circle(x, top + 30, 6); ctx.fill(); }
  ctx.fillStyle = 'rgba(92,44,24,0.92)'; rr(d.x - 42, top - 54, 84, 28, 10); ctx.fill();
  text(d.village ? 'HOME!' : 'DOCK', d.x, top - 39.5, 16, '#ffe7f3', 'center');
  // the licorice net past the pier
  const nt = raftCY(st, d.net) - raftHW(st, d.net), nb = raftCY(st, d.net) + raftHW(st, d.net);
  ctx.strokeStyle = '#d62a4f'; ctx.lineWidth = 4;
  ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(d.net + i * 8, nt); ctx.lineTo(d.net + i * 8, nb); } ctx.stroke();
  ctx.strokeStyle = '#2a1018'; ctx.lineWidth = 3;
  ctx.beginPath(); for (let y = nt + 12; y < nb; y += 22) { ctx.moveTo(d.net - 4, y); ctx.lineTo(d.net + 20, y + 8); } ctx.stroke();
  if (d.village) raftDrawVillage(st);
}
// the candy village: cupcake and gingerbread houses, a banner, and the gingerbread folks cheering
function raftDrawVillage(st) {
  const d = st.c.dock, t = G.clock, party = st.state === 'finish';
  for (let i = -5; i <= 5; i++) for (const s of [-1, 1]) {
    const x = d.x + i * 120 + (s > 0 ? 50 : 0), y = raftCY(st, x) + s * (raftHW(st, x) + (s < 0 ? 100 : 66)), h = hash(i + 9, s + 5);
    if (!raftVis(st, x, 60)) continue;
    const kind = (i + (s > 0 ? 1 : 0) + 30) % 3;
    if (kind === 0) {
      ctx.fillStyle = '#b0692e'; rr(x - 26, y - 36, 52, 38, 4); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - 32, y - 34); ctx.lineTo(x, y - 62); ctx.lineTo(x + 32, y - 34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = ['#ff5fa2', '#58c6ff', '#8be37a'][(h >>> 3) % 3]; ctx.beginPath(); ctx.moveTo(x - 26, y - 36); ctx.lineTo(x, y - 56); ctx.lineTo(x + 26, y - 36); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6b3a1f'; rr(x - 7, y - 18, 14, 20, 6); ctx.fill();
      ctx.fillStyle = '#fff3a8'; rr(x - 20, y - 28, 9, 9, 2); ctx.fill(); rr(x + 11, y - 28, 9, 9, 2); ctx.fill();
    } else if (kind === 1) {
      ctx.fillStyle = '#e8b06a'; ctx.beginPath(); ctx.moveTo(x - 24, y - 22); ctx.lineTo(x + 24, y - 22); ctx.lineTo(x + 19, y + 2); ctx.lineTo(x - 19, y + 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = (h & 4) ? '#ffb3e0' : '#c9b3ff'; for (const [dx, dy, r] of [[-14, -28, 13], [14, -28, 13], [0, -38, 15]]) { circle(x + dx, y + dy, r); ctx.fill(); }
      ctx.fillStyle = '#ff3d6e'; circle(x, y - 55, 6); ctx.fill();
      ctx.fillStyle = '#6b3a1f'; rr(x - 6, y - 14, 12, 16, 5); ctx.fill();
    } else {
      // a gingerbread friend, waving (hopping at the party)
      const hop = party ? Math.abs(Math.sin(t * 6 + i)) * 12 : Math.abs(Math.sin(t * 2 + i)) * 2;
      ctx.save(); ctx.translate(x, y - hop);
      ctx.fillStyle = '#b0692e'; circle(0, -30, 8); ctx.fill(); rr(-7, -23, 14, 18, 5); ctx.fill();
      ctx.save(); ctx.translate(7, -20); ctx.rotate(-1 + Math.sin(t * 9 + i) * 0.5); rr(-3, -12, 6, 13, 3); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(-7, -20); ctx.rotate(0.7); rr(-3, -1, 6, 11, 3); ctx.fill(); ctx.restore();
      rr(-7, -7, 5, 10, 2.5); ctx.fill(); rr(2, -7, 5, 10, 2.5); ctx.fill();
      ctx.fillStyle = '#fff'; circle(-3, -32, 1.4); ctx.fill(); circle(3, -32, 1.4); ctx.fill(); circle(0, -18, 1.5); ctx.fill(); circle(0, -13, 1.5); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -29, 3, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.restore();
    }
  }
  const by = raftCY(st, d.x) - raftHW(st, d.x) - 130;
  ctx.strokeStyle = '#ff5fa2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(d.x - 150, by); ctx.quadraticCurveTo(d.x, by + 24, d.x + 150, by); ctx.stroke();
  for (let i = 0; i < 9; i++) { const u = i / 8, x = d.x - 150 + u * 300, y = by + 12 * 4 * u * (1 - u) + 2; ctx.fillStyle = ['#ff5fa2', '#58c6ff', '#ffd23d', '#8be37a'][i % 4]; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 16); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = 'rgba(92,44,24,0.9)'; rr(d.x - 100, by - 36, 200, 28, 12); ctx.fill();
  text('Candy Village', d.x, by - 21.5, 18, '#ffe7f3', 'center');
}

/* ---------- the raft, the crew, the paddle and the hook ---------- */
function raftDrawFront(st) {
  const cam = st.cam;
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  raftDrawGuide(st);
  if (!(st.state === 'fall' && st.fall && st.fall.t > 1.0 && !st.fall.moved)) raftDrawRaft(st);
  raftDrawDuck(st);
  for (const f of st.fly) {
    const u = raftSmooth(clamp(f.t / 0.6, 0, 1)), x = raftLerp(f.x, f.tx, u), y = raftLerp(f.y, f.ty, u) - Math.sin(u * Math.PI) * 50;
    raftDrawCandy({ kind: f.kind === 'gummy' ? 'gummy' : 'wrap', r: 12, ph: 0, col: f.col }, x, y, f.out ? 0.8 : 1 - u * 0.45, G.clock);
  }
  for (const q of st.parts) {
    const a = clamp(q.life / q.max, 0, 1);
    if (q.x < cam.x - 60 || q.x > cam.x + W + 60 || q.y < cam.y - 60 || q.y > cam.y + H + 60) continue;
    ctx.globalAlpha = q.kind === 'wake' ? a * 0.8 : a; ctx.fillStyle = q.col; ctx.strokeStyle = q.col;
    if (q.kind === 'spark') { raftStarPath(q.x, q.y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
    else if (q.kind === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
    else if (q.kind === 'ring') { ctx.lineWidth = 4; circle(q.x, q.y, q.size * (1.6 - a)); ctx.stroke(); }
    else if (q.kind === 'wake') { ctx.beginPath(); ctx.ellipse(q.x, q.y, q.size * (2 - a), q.size * 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  const big = hudBig();
  for (const q of st.pops) {
    const x = clamp(q.x - cam.x, 120, W - 120), y = clamp(q.y - cam.y - q.t * 30, 90, H - 100);
    ctx.globalAlpha = clamp((1.3 - q.t) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.3 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
    ctx.globalAlpha = 1;
  }
}
function raftStarPath(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
function raftDrawRaft(st) {
  const R = RAFT, b = st.raft, z = b.z || 0, s = 1 + Math.max(0, z) / 260 + Math.min(0, z) / 140;
  const fall = st.state === 'fall' && st.fall && !st.fall.moved;
  // the shadow (far below while flying)
  ctx.fillStyle = 'rgba(40,14,4,0.35)'; ctx.beginPath(); ctx.ellipse(b.x + 6 + Math.max(0, z) * 0.3, b.y + 10 + Math.max(0, z) * 0.5, R.r * 1.02, R.r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(b.x, b.y - Math.max(0, z)); ctx.scale(s, s);
  if (fall) ctx.globalAlpha = clamp(1 - st.fall.t * 0.4, 0.4, 1);
  ctx.rotate(b.a);
  // the cookie: golden with a darker rim and chocolate chips
  ctx.fillStyle = '#c47a35'; circle(0, 3, R.r + 2); ctx.fill();
  const cg = ctx.createRadialGradient(-12, -12, 6, 0, 0, R.r);
  cg.addColorStop(0, '#f2bf72'); cg.addColorStop(1, '#d9964a');
  ctx.fillStyle = cg; circle(0, 0, R.r); ctx.fill();
  ctx.fillStyle = '#4a2410';
  for (const [x, y, r] of [[-26, -14, 4.5], [22, -22, 4], [-8, 30, 4], [30, 10, 5], [-32, 12, 3.5], [8, -36, 3.5], [0, 8, 3]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, x * 0.1, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,240,210,0.35)'; for (const [x, y] of [[-14, -26], [18, 30], [36, -6]]) { circle(x, y, 2); ctx.fill(); }
  // the basket in the middle, filling up with candy
  ctx.fillStyle = '#ff8fc7'; ctx.strokeStyle = '#c0457e'; ctx.lineWidth = 2;
  rr(-15, -30, 30, 18, 6); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(192,69,126,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = -10; i <= 10; i += 5) { ctx.moveTo(i, -29); ctx.lineTo(i, -13); } ctx.stroke();
  const n = Math.min(10, Math.ceil(st.score / 3));
  for (let i = 0; i < n; i++) { ctx.fillStyle = RAFT_WRAPS[i % RAFT_WRAPS.length]; circle(-10 + (i % 5) * 5, -31 - Math.floor(i / 5) * 4, 3.5); ctx.fill(); }
  ctx.restore();
  // the crew, sitting on the raft
  if (!fall || st.fall.t < 0.9) for (const p of G.players) raftDrawRider(st, p, s);
  raftDrawPaddle(st);
  raftDrawHook(st);
  ctx.globalAlpha = 1;
}
function raftDrawRider(st, p, s) {
  const b = st.raft, seat = raftSeat(st, p.id), sx = p.x, sy = p.y, sf = p.face;
  ctx.save(); ctx.translate(seat.x, seat.y); ctx.rotate(st.state === 'dock' ? b.a * 0.4 : b.a * 0.25); ctx.scale(s, s);
  p.x = -PW / 2; p.y = -PH; p.alive = true;
  p.face = p.id === st.pad ? (b.strokeDir < 0 && b.stroke > 0 ? -1 : 1) : (st.hk.ox < -10 ? -1 : 1);
  drawPlayer(p);
  ctx.restore();
  p.x = sx; p.y = sy; p.face = sf;
}
// the wafer paddle: dips into the chocolate on a stroke
function raftDrawPaddle(st) {
  if (st.state === 'dock' || st.state === 'finish' || (st.state === 'fall' && st.fall && st.fall.t > 0.9)) return;
  const b = st.raft, seat = raftSeat(st, st.pad), t = G.clock;
  const u = b.stroke > 0 ? 1 - b.stroke / 0.4 : 0, dir = b.strokeDir;
  const hx = seat.x - 2, hy = seat.y - 12;
  let tx, ty;
  if (b.stroke > 0) { tx = hx - dir * raftLerp(-30, 40, u); ty = hy + 34 + Math.sin(u * Math.PI) * 10; }
  else { tx = hx - 26 + Math.sin(t * 2) * 3; ty = hy + 30; }
  ctx.strokeStyle = '#9a6a2e'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx + (hx - tx) * 0.25, hy + (hy - ty) * 0.25); ctx.lineTo(tx, ty); ctx.stroke();
  const a = Math.atan2(ty - hy, tx - hx);
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(a);
  raftWafer(-4, -8, 22, 16);
  ctx.restore();
  if (b.stroke > 0.25) { ctx.strokeStyle = 'rgba(255,241,220,0.7)'; ctx.lineWidth = 2; circle(tx, ty, 10 + u * 14); ctx.stroke(); }
}
// the candy-cane hook: a pole from the hooker's hands out to the tip, a crook at the end
function raftDrawHook(st) {
  if (st.state === 'dock' || st.state === 'finish' || (st.state === 'fall' && st.fall && st.fall.t > 0.9)) return;
  const hk = st.hk, seat = raftSeat(st, st.hook), t = G.clock;
  const hx = seat.x + 4, hy = seat.y - 16, swing = hk.swing > 0 ? Math.sin((hk.swing / 0.22) * Math.PI) * 8 : 0;
  const tx = hk.wx, ty = hk.wy + swing;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty - 10); ctx.stroke();
  ctx.strokeStyle = '#ff3d6e'; ctx.setLineDash([6, 7]); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty - 10); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(tx + 7, ty - 10, 7, Math.PI, Math.PI * 2.1); ctx.stroke();
  ctx.strokeStyle = '#ff3d6e'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(tx + 7, ty - 10, 7, Math.PI, Math.PI * 2.1); ctx.stroke(); ctx.setLineDash([]);
  // where it reaches: a soft ring on the water under the tip
  ctx.strokeStyle = st.goldHook ? 'rgba(255,197,61,0.9)' : 'rgba(255,241,220,0.75)'; ctx.lineWidth = 2;
  circle(hk.wx, hk.wy + 4, (st.goldHook ? RAFT.catchRGold : RAFT.catchR) * 0.9 + Math.sin(t * 6) * 1.5); ctx.stroke();
  if (hk.pullG) { ctx.strokeStyle = C.gold; ctx.lineWidth = 4; const u = clamp(hk.pullG.pull / (hk.pullG.gold ? RAFT.ringPullGold : RAFT.ringPull), 0, 1); ctx.beginPath(); ctx.arc(hk.wx, hk.wy - 34, 12, -Math.PI / 2, -Math.PI / 2 + u * Math.PI * 2); ctx.stroke(); }
  if (hk.miss > 0) { ctx.globalAlpha = hk.miss / 0.25; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; circle(hk.wx, hk.wy, 14 + (0.25 - hk.miss) * 60); ctx.stroke(); ctx.globalAlpha = 1; }
}
// a dotted gold line from the hook to what it should do next (only for a person)
function raftDrawGuide(st) {
  if (st.state !== 'ride' || G.introT > 0 || raftQuiet(st.hook) || st.air) return;
  const nd = raftNeeds(st);
  if (!nd.target || nd.hook === 'ready') return;
  const t = G.clock, tg = nd.target, hk = st.hk;
  ctx.strokeStyle = 'rgba(255,197,61,0.75)'; ctx.lineWidth = 3; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t * 30;
  ctx.beginPath(); ctx.moveTo(hk.wx, hk.wy); ctx.lineTo(tg.x, tg.y); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
  ctx.strokeStyle = C.gold; ctx.lineWidth = 3; circle(tg.x, tg.y, 18 + Math.sin(t * 6) * 3); ctx.stroke();
}
// Mallow the marshmallow duck: paddles in and tows the raft back after a splat
function raftDrawDuck(st) {
  const f = st.fall;
  if (!f || f.t < 1.4) return;
  const b = st.raft, t = G.clock;
  let x, y, a = 1;
  if (!f.moved) { const u = raftSmooth((f.t - 1.4) / 0.8); x = raftLerp(b.x - 260, b.x - 30, u); y = b.y + 50; }
  else { const u = (f.t - 2.2) / (RAFT.fallT - 2.2); x = b.x + 60 + u * 120; y = b.y + 56 - u * 30; a = clamp(1.4 - u * 1.2, 0, 1); }
  ctx.globalAlpha = a;
  raftDuckShape(x, y, t);
  if (f.moved && f.t < 2.9) { ctx.fillStyle = '#fff'; rr(x - 34, y - 58, 68, 22, 11); ctx.fill(); text('Quack!', x, y - 46.5, 13, C.ink, 'center', 'body'); }
  ctx.globalAlpha = 1;
}
function raftDuckShape(x, y, t) {
  const bob = Math.sin(t * 6) * 2;
  ctx.fillStyle = 'rgba(40,14,4,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 12, 26, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff6fb'; ctx.beginPath(); ctx.ellipse(x, y + bob, 24, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe3f1'; ctx.beginPath(); ctx.ellipse(x - 6, y + bob - 2, 12, 7, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff6fb'; circle(x + 16, y + bob - 14, 11); ctx.fill();
  ctx.fillStyle = '#ffab3d'; ctx.beginPath(); ctx.moveTo(x + 25, y + bob - 16); ctx.lineTo(x + 36, y + bob - 12); ctx.lineTo(x + 25, y + bob - 9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.ink; circle(x + 19, y + bob - 17, 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,160,0.5)'; circle(x + 14, y + bob - 10, 2.5); ctx.fill();
}

/* ---------- the HUD: clock and candy, the job cards, prompts over the heads ---------- */
function raftHud(st) {
  const R = RAFT, big = hudBig(), z = big ? 1.4 : 1, ps = G.players, play = G.mode === 'play' || G.mode === 'paused', t = G.clock;
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = st.score + ' / ' + st.scoreAll;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.6, gap = fs;
    const w = tw + gap + icon + fs * 0.3 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, C.paper, 'left', 'body');
    raftDrawCandy({ kind: 'wrap', r: 12, ph: 0, col: '#ff5fa2' }, x0 + 15 + tw + gap + icon / 2, cy, fs / 22 * 0.99, 0);
    text(n, x0 + 15 + tw + gap + icon + fs * 0.3, cy, fs, '#ffd0e8', 'left', 'body');
    timeX0 = x0;
  }
  if (!play) return;
  const nd = raftNeeds(st), P = st.pad, Hk = st.hook, hk = st.hk, b = st.raft;
  // the job cards, bottom corners: Pip's on the left, Bo's on the right (they fade while the raft or the hook is behind them)
  const pw = Math.round(250 * z), ph = Math.round(56 * z), py = H - ph - 10;
  for (const id of [0, 1]) {
    const paddler = id === P, px = id === 0 ? 12 : W - 12 - pw;
    const near = (x, y, m) => x - st.cam.x > px - m && x - st.cam.x < px + pw + m && y - st.cam.y > py - m && y - st.cam.y < py + ph + m;
    ctx.globalAlpha = near(b.x, b.y, 50) || near(hk.wx, hk.wy, 16) ? 0.35 : 1;
    ctx.fillStyle = 'rgba(70,30,20,0.84)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const cpuSeat = raftQuiet(id);
    text(NAMES[id] + (paddler ? ' paddles' : ' hooks') + (cpuSeat ? ' (computer)' : ''), px + 12 * z, py + 15 * z, 15 * z, PCOL[id], 'left');
    let chips;
    if (paddler) {
      const steer = ['candy', 'gate', 'ramp', 'dock', 'avoid', 'pool'].includes(nd.pad) && nd.ty != null && Math.abs(b.y - nd.ty) > 30;
      chips = [['aim', 'STEER', steer], ['act', 'PADDLE', !!nd.stroke]];
    } else {
      const reachIt = nd.target && Math.hypot(nd.target.x - hk.wx, nd.target.y - hk.wy) < (st.goldHook ? 40 : 28);
      const word = nd.hook === 'ring' ? 'HOLD' : nd.hook === 'shove' || nd.hook === 'jam' ? 'SHOVE' : 'HOOK';
      chips = [['aim', 'AIM', !!nd.target && !reachIt], ['act', word, !!reachIt]];
    }
    const n = chips.length, cw = (pw - 24 * z - (n - 1) * 8 * z) / n;
    chips.forEach(([k, lab, on], i) => {
      const cx = px + 12 * z + i * (cw + 8 * z), cy = py + 26 * z, chh = 24 * z;
      ctx.fillStyle = on ? (Math.sin(t * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : 'rgba(255,255,255,0.12)';
      rr(cx, cy, cw, chh, chh / 2); ctx.fill();
      const kk = cpuSeat ? '' : raftKey(id, k);
      let fs = 12 * z;
      const s = (kk ? kk + ' ' : '') + lab;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      while (fs > 8 && ctx.measureText(s).width > cw - 8) { fs -= 0.5; ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; }
      text(s, cx + cw / 2, cy + chh / 2 + 0.5, fs, on ? C.ink : '#f2dccf', 'center', 'body');
    });
    ctx.globalAlpha = 1;
  }
  // the message line (gold help): between the level pill and the clock when it fits, else under the room pill
  if (st.msg) {
    let fs = big ? 20 : 14;
    const h = big ? 32 : 26, font = q => '700 ' + q + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.font = font(14);
    const left = 14 + ctx.measureText(levelCode(G.levelIndex) + ' · ' + G.level.def.name).width + 28 + 10, right = timeX0 - 10;
    ctx.font = font(fs);
    let w = ctx.measureText(st.msg.text).width + 30, cx = W / 2 + 40, y = 12;
    if (w <= right - left) cx = clamp(cx, left + w / 2, right - w / 2);
    else {
      cx = W / 2; y = big ? 96 : 80;
      while (w > W - 40 && fs > 11) { fs--; ctx.font = font(fs); w = ctx.measureText(st.msg.text).width + 30; }
    }
    ctx.globalAlpha = clamp((st.msg.life - st.msg.t) / 0.3, 0, 1);
    pill(cx, y, w, h, 'center'); text(st.msg.text, cx, y + h / 2 + 0.5, fs, st.msg.col, 'center', 'body'); ctx.globalAlpha = 1;
  }
  if (G.introT > 0 || st.state !== 'ride') return;
  // prompts over the heads: the paddler's opens to the left, the hooker's to the right, so they never overlap.
  // A hint bubble replaces that player's prompt while it shows.
  const fs = 14 * z, yMax = py - 8;
  const place = (p, w, h) => {
    const hx = p.x + PW / 2, right = p.id === Hk;
    let top = p.y - 30 * z - h;
    // 1-player: above the computer's speech bubble while it talks
    if (typeof CPU === 'object' && cpuSolo() && !cpuOn(p.id)) { const cb = CPU.bubbles[1 - p.id]; if (cb && cb.t > 0) top = Math.min(top, p.y - 22 - (big ? 30 : 22) - 10 - h); }
    const y = clamp(top, big ? 60 : 46, yMax - h);
    return { x: clamp(right ? hx - 10 * z : hx + 10 * z - w, 4, W - w - 4), y };
  };
  const say = (p, str, col, pulse) => {
    if (raftQuiet(p.id) || st.hints[p.id]) return;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, o = place(p, w, h);
    const sc = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(o.x + w / 2, o.y + h / 2); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(60,24,14,0.88)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, col, 'center', 'body');
    ctx.restore();
  };
  const bubble = (p, str) => {
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 22 * z, h = fs + 14 * z, o = place(p, w, h);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[p.id]; ctx.lineWidth = 2.5;
    rr(o.x, o.y, w, h, h / 2); ctx.fill(); ctx.stroke();
    text(str, o.x + w / 2, o.y + h / 2 + 0.5, fs, C.ink, 'center', 'body');
  };
  const Pp = ps[P], Hp = ps[Hk];
  const updn = ty => (ty < b.y ? raftKey(P, 'up') : raftKey(P, 'down'));
  const off = nd.ty != null ? nd.ty - b.y : 0, speed = Math.hypot(b.vx, b.vy);
  // the paddler
  if (nd.pad === 'ramp') {
    const lane = nd.ramp.gold ? R.rampLaneGold : R.rampLane;
    if (Math.abs(off) > lane * 0.7) say(Pp, 'Line up with the fudge ramp ' + updn(nd.ty), C.gold, true);
    else if (nd.stroke) say(Pp, 'Paddle hard! ' + raftKey(P, 'act') + ' ' + raftKey(P, 'act'), C.gold, true);
    else say(Pp, 'Straight at the ramp! ' + raftKey(P, 'right'), '#ffe7a8', false);
  } else if (nd.pad === 'jam') say(Pp, b.vx > 40 && nd.jam.x - b.x < 300 ? 'Log jam! Slow down ' + raftKey(P, 'left') : 'Wait: ' + NAMES[Hk] + ' shoves the logs', b.vx > 40 ? C.gold : '#f2dccf', b.vx > 40);
  else if (nd.pad === 'gate') say(Pp, 'Toffee gate! Paddle to the ring ' + updn(nd.ty), C.gold, true);
  else if (nd.pad === 'hold') { const fast = speed > (nd.gate.gold ? R.ringStillGold : R.ringStill); say(Pp, fast ? 'Hold still! ' + raftKey(P, 'left') + ' against the current' : 'Hold it here while ' + NAMES[Hk] + ' pulls', fast ? C.gold : '#f2dccf', fast); }
  else if (nd.pad === 'dock') {
    const box = raftDockBox(st), l = raftYL(st, b.x, b.y, R.r + 4);
    if (l > box.lMax) say(Pp, 'Dock at the pier! ' + raftKey(P, 'up'), C.gold, true);
    else if (b.x > box.x1) say(Pp, raftKey(P, 'left') + ' Back to the pier', C.gold, true);
    else if (speed > R.dockV) say(Pp, 'Slow down! ' + raftKey(P, 'left'), C.gold, true);
    else say(Pp, 'Stop by the pier!', '#f2dccf', false);
  } else if (nd.pad === 'pool' && Math.abs(off) > 40) say(Pp, 'Whirlpool! Paddle round it ' + updn(nd.ty), '#ffe08a', false);
  else if (nd.pad === 'candy' && Math.abs(off) > 40) say(Pp, 'Candy by the bank! Steer close ' + updn(nd.ty), '#ffd0e8', false);
  else if (nd.pad === 'avoid' && nd.threat && nd.threat.ax < 220 && nd.hook !== 'shove') say(Pp, (nd.threat.kind === 'rock' ? 'Marshmallow rock!' : nd.threat.kind === 'log' ? 'Wafer log!' : 'Bonbon!') + ' Steer ' + updn(nd.ty), '#ffe7a8', false);
  // the hooker
  const near = nd.target && Math.hypot(nd.target.x - hk.wx, nd.target.y - hk.wy) < (st.goldHook ? 40 : 28);
  if (nd.hook === 'ring') say(Hp, near ? (hk.pullG ? 'Pull! Keep holding ' + raftKey(Hk, 'act') : 'Hold ' + raftKey(Hk, 'act') + ' to pull the ring') : raftKey(Hk, 'aim') + ' Hook the toffee ring', C.gold, true);
  else if (nd.hook === 'jam') say(Hp, near ? 'Shove the log jam! ' + raftKey(Hk, 'act') : raftKey(Hk, 'aim') + ' Hook to the log jam', C.gold, near);
  else if (nd.hook === 'shove') say(Hp, near ? 'Shove it away! ' + raftKey(Hk, 'act') : raftKey(Hk, 'aim') + ' Aim at the ' + (nd.threat && nd.threat.kind === 'rock' ? 'rock' : nd.threat && nd.threat.kind === 'log' ? 'log' : 'bonbon'), C.gold, near);
  else if (nd.hook === 'candy') say(Hp, near ? 'Hook it! ' + raftKey(Hk, 'act') : (nd.candy.kind === 'gummy' ? 'Gummy bear! ' : 'Candy! ') + raftKey(Hk, 'aim'), nd.candy.kind === 'gummy' ? C.gold : '#ffd0e8', near);
  for (const p of ps) if (st.hints[p.id]) bubble(p, st.hints[p.id].text);
}

/* ---------- sounds ---------- */
Sfx.extra.raftStroke = function () { this.tone(180, 0.18, 'triangle', 0.07, 90); this.tone(900, 0.08, 'sine', 0.02, 400, 0.03); };
Sfx.extra.raftBonk = function () { this.tone(240, 0.14, 'triangle', 0.08, 120); this.tone(520, 0.1, 'sine', 0.03, 300, 0.03); };
Sfx.extra.raftBoing = function () { this.tone(170, 0.3, 'sine', 0.06, 520); };
Sfx.extra.raftOops = function () { this.tone(660, 0.25, 'sine', 0.05, 330); };
Sfx.extra.raftWhee = function () { this.tone(300, 0.6, 'sine', 0.06, 1200); this.tone(900, 0.4, 'triangle', 0.02, 300, 0.25); };
Sfx.extra.raftCandy = function () { [1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.045, null, i * 0.05)); };
Sfx.extra.raftGummy = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); this.tone(220, 0.25, 'sine', 0.04, 440); };
Sfx.extra.raftSwish = function () { this.tone(900, 0.07, 'sine', 0.025, 400); };
Sfx.extra.raftShove = function () { this.tone(150, 0.2, 'triangle', 0.08, 90); this.tone(600, 0.12, 'sine', 0.03, 900, 0.05); };
Sfx.extra.raftHeave = function () { this.tone(120, 0.22, 'sawtooth', 0.03, 80); this.tone(200, 0.15, 'triangle', 0.06, 120); };
Sfx.extra.raftCrack = function () { this.tone(1400, 0.05, 'square', 0.03, 600); this.tone(160, 0.3, 'triangle', 0.08, 70, 0.03); [659, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.04, null, 0.18 + i * 0.07)); };
Sfx.extra.raftClink = function () { this.tone(1300, 0.06, 'triangle', 0.04); };
Sfx.extra.raftStretch = function () { this.tone(260 + Math.random() * 40, 0.16, 'sawtooth', 0.018, 320); };
Sfx.extra.raftGate = function () { this.tone(500, 0.2, 'sawtooth', 0.025, 140); [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.11, 'triangle', 0.045, null, 0.15 + i * 0.07)); };
Sfx.extra.raftFlag = function () { [523, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, i * 0.07)); };
Sfx.extra.raftHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.raftRamp = function () { this.tone(220, 0.5, 'sine', 0.06, 880); this.tone(440, 0.4, 'triangle', 0.025, 1320, 0.05); };
Sfx.extra.raftSplash = function () { this.tone(140, 0.4, 'triangle', 0.08, 60); this.tone(1200, 0.25, 'sine', 0.02, 300, 0.02); [784, 988, 1175].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.04, null, 0.2 + i * 0.07)); };
Sfx.extra.raftWhoa = function () { this.tone(500, 0.5, 'sine', 0.06, 160); };
Sfx.extra.raftSplat = function () { this.tone(110, 0.3, 'triangle', 0.08, 50); this.tone(300, 0.2, 'sawtooth', 0.02, 100, 0.02); };
Sfx.extra.raftQuack = function () { this.tone(420, 0.09, 'sawtooth', 0.04, 300); this.tone(420, 0.09, 'sawtooth', 0.04, 300, 0.15); };
Sfx.extra.raftSwap = function () { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.raftHop = function () { this.tone(330, 0.15, 'sine', 0.05, 660); this.tone(392, 0.15, 'sine', 0.05, 784, 0.1); };
Sfx.extra.raftParty = function () { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.055, null, i * 0.08)); };
Sfx.extra.raftCheer = function () { [1047, 1175, 1319, 1568].forEach((f, i) => this.tone(f, 0.08, 'square', 0.02, null, i * 0.05)); };
