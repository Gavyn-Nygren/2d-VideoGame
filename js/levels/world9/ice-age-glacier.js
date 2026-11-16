/* Pip & Bo - Level 9-3 Ice Age Glacier (team). */
'use strict';

/* ===== Ice Age Glacier (mode 'glacier', World 9 "Great Escapes", team) =====
   Pip and Bo ride ONE ice floe down a long, cracking glacier. Side-on: the mode owns the tick, the scrolling camera, the
   whole picture and the HUD (def.ownStep + def.ownHUD); the engine grid is empty apart from the two spawns.
   The STEERER (back seat, holds a pole) leans ◀ to brake and ▶ to push, and picks the high road ▲ or the low road ▼ at a
   fork. The HOPPER (front seat, the lookout) hops the floe over crevasses (▲) and ducks you both under icicle arches (▼).
   Snow bumps need SLOW and wide crevasses need FAST, so both jobs matter every few seconds. At the end of each stretch the
   glacier CRACKS: the floe splits, you swap seats in mid-air, and the next room swaps the jobs.
   Soft failure only: a bonk spins the floe and slows it; a crevasse "Oops!" gets a snowball POP a little way back; after
   a few tries at one crevasse Mammo (gold, announced) packs it smaller, then builds a snow bridge.
   Room def: { title, tip, steer: 0|1, course: [tokens], herd?, map (spawns only) }. Course tokens (lengths in px):
     rN sN lN  a run of N px: normal / steep / level slope       gN GN  a narrow / wide crevasse N px across
     mN  N snow bumps        a  an icicle arch        fN  N snowflakes along the ice      hN  N snowflakes in a hop arc
     o  a gold snowflake     S:text  a sign ({S} = the steerer's name, {H} = the hopper's)     D:kind  scenery
     { up: [...], down: [...] }  a fork: the high road and the low road     X  the crack (room end)     E  the finish
   Every global is prefixed glacier / GLACIER (and Sfx.extra.glacier*); all state lives in G.mst. */
const GLACIER = {
  FL: 128, FT: 22, seatX: [-32, 32],          // floe length and thickness; the back (steerer) and front (hopper) seats
  vMin: 110, cruise: 215, vMax: 360,          // speeds (px/s); with no lean the floe drifts back to cruise (190-245 by slope)
  push: 260, brake: 340, brakeTo: 165, drift: 150, slopeK: 160, cruiseLo: 190, cruiseHi: 245,
  slowMax: 170, fastMin: 270, tol: 5,         // SLOW and FAST zones; bumps and wide gaps check them with this slack
  slopes: { r: 0.17, s: 0.3, l: 0.07 },
  hopV: 520, g: 1900,                         // a plain hop: 0.55 s in the air, 71 px high
  airMin: 0.42, airMax: 1.15,                 // a hop in a crevasse's zone is steered to land just past the far rim
  zone: 150, zoneT: 0.62, zoneExtra: 0.25,    // the zone: the arrows (150 px, or 0.62 s) plus a hidden 0.25 s
  coyote: 12, land: 28, hopBuf: 0.16,
  duckRate: 10, duckMax: 2.5, archW: 110, archClear: 44, mogW: 64, mogH: 15,
  spinT: 1.0, spinLock: 0.75, bonkV: 15,       // a bonk spins you nearly to a stop: braking for bumps beats bonking through them
  fallT: 0.75, resetBack: 460, popLock: 0.35,
  forkOff: 170, forkRamp: 420, forkLock: 30, forkWin: 820, shelfTh: 38,
  pushWait: 3, afkT: 10, tryWin: 5,           // a fall counts as a try (for Mammo) if each player it needed pressed something in the last 5 s
  flakeR: 14, flakeLow: 40, goldH: 112, goldVal: 5, softStop: 5,
  leadSlow: 300, leadFast: 205, camY: 335,
  crackAt: 250, splitT: 2.1, finT: 2.2,
  sayFast: 2.4, sayHop: 1.3, sayDuck: 1.05, hintLife: 2.8,
};
const glacierLerp = (a, b, u) => a + (b - a) * u;

/* ---------- the course: tokens -> ground arrays (2 px steps), hazards, snowflakes, signs and scenery ---------- */
function glacierForkOff(fk, x) {
  const R = GLACIER.forkRamp;
  if (x <= fk.x0 || x >= fk.x1) return 0;
  const u = x < fk.x0 + R ? (x - fk.x0) / R : x > fk.x1 - R ? (fk.x1 - x) / R : 1;
  return GLACIER.forkOff * u * u * (3 - 2 * u);
}
function glacierCompile(def) {
  const Gc = GLACIER, X0 = -900, steer = def.steer || 0;
  const c = { x0: X0, gaps: [[], []], mogs: [[], []], arches: [[], []], flakes: [], signs: [], deco: [], forks: [], crack: null, finish: null };
  const name = s => s.replace(/\{S\}/g, NAMES[steer]).replace(/\{H\}/g, NAMES[1 - steer]);
  const knots = [{ x: X0, s: Gc.slopes.r }];
  const walk = (toks, path, x, fork) => {
    for (const tk of toks) {
      if (tk && typeof tk === 'object') {   // a fork (never inside another fork)
        const fk = { i: c.forks.length, x0: x, x1: 0 };
        c.forks.push(fk);
        knots.push({ x, s: Gc.slopes.r });
        const xu = walk(tk.up || [], 1, x + Gc.forkRamp, fk), xd = walk(tk.down || [], 0, x + Gc.forkRamp, fk);
        fk.x1 = Math.max(xu, xd) + Gc.forkRamp;
        c.signs.push({ x: x - 430, path: 0, icon: 'fork' });
        x = fk.x1;
        continue;
      }
      const t = String(tk), ch = t[0], n = parseInt(t.slice(1), 10) || 0;
      if (ch === 'r' || ch === 's' || ch === 'l') { if (!fork) knots.push({ x, s: Gc.slopes[ch] }); x += n; }
      else if (ch === 'g' || ch === 'G') {
        c.gaps[path].push({ kind: 'gap', x0: x, x1: x + n, ox0: x, ox1: x + n, wide: ch === 'G', big: ch === 'G', path, fails: 0, tries: 0, help: 0, done: false });
        x += n;
      } else if (ch === 'm') {
        const crests = [];
        for (let k = 0; k < n; k++) crests.push(x + (k + 0.5) * Gc.mogW);
        c.mogs[path].push({ kind: 'mog', x0: x, x1: x + n * Gc.mogW, n, crests, path, bonked: false, done: false });
        x += n * Gc.mogW;
      } else if (ch === 'a') { c.arches[path].push({ kind: 'arch', x0: x, x1: x + Gc.archW, path, broken: false, hit: false, done: false, shake: 0 }); x += Gc.archW; }
      else if (ch === 'f') { for (let k = 0; k < n; k++) c.flakes.push({ x: x + k * 36, path, h: Gc.flakeLow, gold: false, got: false, ph: k * 0.7 }); }
      else if (ch === 'h') { for (let k = 0; k < n; k++) c.flakes.push({ x: x + k * 36, path, h: 82 + 24 * Math.sin(Math.PI * (k + 0.5) / n), gold: false, got: false, ph: k * 0.9 }); }
      else if (ch === 'o') c.flakes.push({ x, path, h: Gc.goldH, gold: true, got: false, ph: 0 });
      else if (ch === 'S') c.signs.push({ x, path, text: name(t.slice(2)) });
      else if (ch === 'D') c.deco.push({ x, path, kind: t.slice(2) });
      else if (ch === 'X') c.crack = { x };
      else if (ch === 'E') c.finish = { x };
    }
    return x;
  };
  const end = walk(def.course || [], 0, 0, null);
  knots.push({ x: end, s: Gc.slopes.r });
  c.len = end + 1700;
  // ground: the base line from the slopes, then the forks (the low road dips, the high road rises), then the bumps
  const N = Math.ceil((c.len - X0) / 2) + 2, base = new Float32Array(N);
  let y = 0, ki = 0;
  for (let i = 0; i < N; i++) {
    const x = X0 + i * 2;
    while (ki + 1 < knots.length && knots[ki + 1].x <= x) ki++;
    base[i] = y; y += knots[ki].s * 2;
  }
  c.gy = [new Float32Array(base), new Float32Array(base)];
  for (const fk of c.forks) for (let i = Math.max(0, Math.floor((fk.x0 - X0) / 2)); i < N && X0 + i * 2 <= fk.x1; i++) {
    const off = glacierForkOff(fk, X0 + i * 2);
    c.gy[0][i] += off / 2; c.gy[1][i] -= off / 2;
  }
  for (const p of [0, 1]) for (const m of c.mogs[p]) for (let i = Math.max(0, Math.floor((m.x0 - X0) / 2)); i < N && X0 + i * 2 <= m.x1; i++) {
    const u = ((X0 + i * 2 - m.x0) % Gc.mogW) / Gc.mogW;
    c.gy[p][i] -= Gc.mogH * Math.sin(Math.PI * u);
  }
  // hazards per path, in order (prompts and the bot read these)
  c.haz = [0, 1].map(p => [].concat(c.gaps[p], c.mogs[p], c.arches[p]).sort((a, b) => a.x0 - b.x0));
  // speed signs before bumps (SLOW) and wide crevasses (FAST), unless a text sign already says it. A sign stands where
  // nothing that needs the other speed comes between it and its hazard, never in a hole or under an arch, and inside a
  // fork only where the roads are apart (the prompts over the heads warn anyway when there is no room for a sign)
  const forkOf = x => c.forks.find(fk => x >= fk.x0 && x <= fk.x1) || null;
  const inHaz = (p, x) => c.gaps[p].some(g => x > g.x0 - 40 && x < g.x1 + 40) || c.arches[p].some(a => x > a.x0 - 70 && x < a.x1 + 70);
  for (const p of [0, 1]) for (const h of c.haz[p]) {
    if (h.kind !== 'mog' && !(h.kind === 'gap' && h.wide)) continue;
    if (c.signs.some(s => s.text && s.path === p && s.x > h.x0 - 760 && s.x < h.x0)) continue;
    const fk = forkOf(h.x0), slow = h.kind === 'mog';
    const other = c.haz[p].filter(o => o.x1 <= h.x0 && (slow ? o.kind === 'gap' && o.wide : o.kind === 'mog'));
    let sx = null;
    for (let x = h.x0 - (slow ? 470 : 520); x <= h.x0 - 140 && sx === null; x += 10) {
      if (other.some(o => o.x1 + 30 > x) || inHaz(p, x)) continue;
      const xf = forkOf(x);
      if (fk ? x < fk.x0 + Gc.forkRamp || x > fk.x1 - Gc.forkRamp : xf) continue;
      sx = x;
    }
    if (sx !== null) c.signs.push({ x: sx, path: fk ? p : 0, icon: slow ? 'slow' : 'fast' });
  }
  for (const s of c.signs) for (let k = 0; k < 6; k++) {
    const g = c.gaps[s.path].find(g => s.x > g.x0 - 30 && s.x < g.x1 + 30) || c.arches[s.path].find(a => s.x > a.x0 - 60 && s.x < a.x1 + 60);
    if (!g) break;
    s.x = g.x0 - (g.kind === 'arch' ? 70 : 40);
  }
  // the most snowflakes one run can get (each fork: the better road)
  const val = fl => (fl.gold ? Gc.goldVal : 1);
  c.maxFlakes = c.flakes.filter(fl => !forkOf(fl.x)).reduce((s, fl) => s + val(fl), 0)
    + c.forks.reduce((s, fk) => s + Math.max(...[0, 1].map(p => c.flakes.filter(fl => fl.path === p && fl.x >= fk.x0 && fl.x <= fk.x1).reduce((t, fl) => t + val(fl), 0))), 0);
  return c;
}
function glacierGY(st, path, x) {
  const c = st.c, a = c.gy[path] || c.gy[0], f = (x - c.x0) / 2, i = Math.floor(f);
  if (i < 0) return a[0] + (x - c.x0) * GLACIER.slopes.r;
  if (i >= a.length - 1) return a[a.length - 1] + (x - (c.x0 + (a.length - 1) * 2)) * GLACIER.slopes.r;
  return a[i] + (a[i + 1] - a[i]) * (f - i);
}
const glacierSlopeAt = (st, path, x, d = 24) => (glacierGY(st, path, x + d) - glacierGY(st, path, x - d)) / (2 * d);
// the crevasse under x on this road (grounded: past the near rim by more than the coyote slack), if it is not bridged
function glacierHoleAt(st, path, x, grounded) {
  for (const g of st.c.gaps[path]) if (g.help < 2 && x > g.x0 + (grounded ? GLACIER.coyote : 0) && x < g.x1 - (grounded ? 2 : 0)) return g;
  return null;
}
// which road a point ahead is on: the floe's own road in the fork it is in, else the road the steerer picked
function glacierPathAt(st, x) {
  const f = st.f;
  for (const fk of st.c.forks) {
    if (x < fk.x0 || x > fk.x1) continue;
    if (f.x >= fk.x0 + GLACIER.forkLock && f.x <= fk.x1) return f.path;
    return st.forkChoice[fk.i];
  }
  return 0;
}
// the hazards ahead of the floe (on the roads it will take), nearest first
function glacierAhead(st, maxD, kinds) {
  const f = st.f, out = [];
  for (const p of [0, 1]) for (const h of st.c.haz[p]) {
    if (h.x1 < f.x - GLACIER.FL / 2 || h.x0 > f.x + maxD) continue;
    if (kinds && !kinds.includes(h.kind)) continue;
    if (glacierPathAt(st, h.x0) !== p) continue;
    out.push(h);
  }
  return out.sort((a, b) => a.x0 - b.x0);
}
function glacierForkNear(st) {
  const f = st.f;
  return st.c.forks.find(fk => f.x > fk.x0 - GLACIER.forkWin && f.x < fk.x0 + GLACIER.forkLock) || null;
}
function glacierCruise(st) {
  const Gc = GLACIER, f = st.f, s = glacierSlopeAt(st, f.path, f.x, 48);
  return clamp(Gc.cruise + (s - Gc.slopes.r) * Gc.slopeK, Gc.cruiseLo, Gc.cruiseHi);
}
// a player's feet on the floe (world): the steerer sits at the back, the hopper at the front
function glacierFeet(st, id) {
  const f = st.f, Gc = GLACIER, lx = Gc.seatX[id === st.steer ? 0 : 1], a = f.tilt;
  return { x: f.x + lx * Math.cos(a) + Gc.FT * Math.sin(a), y: f.y + lx * Math.sin(a) - Gc.FT * Math.cos(a) };
}
// each player's own keys, for bubbles and the HUD
// (the same choice as the engine's actKey: a player with a controller is shown its buttons, so with one player on a
// controller and one on the keyboard, neither prompt flickers between the two)
function glacierKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'hop' || what === 'up') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'duck' || what === 'down') return pad ? 'stick ▼' : touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'left') return pad ? 'stick ◀' : touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'right') return pad ? 'stick ▶' : touch ? '▶' : id === 0 ? 'D' : '→';
  return pad ? 'stick' : touch ? '◀ ▶' : id === 0 ? 'A D' : '← →';
}

/* ---------- a room ---------- */
function glacierRoom(st, L, k) {
  const Gc = GLACIER, def = L.def;
  st.k = k; st.steer = def.steer || 0; st.hop = 1 - st.steer; st.title = def.title || '';
  st.c = glacierCompile(def);
  st.stats.maxFlakes[k] = st.c.maxFlakes; st.stats.segBonks[k] = 0; st.stats.segTitles[k] = st.title;
  const x = 150;
  st.f = { x, y: glacierGY(st, 0, x), vy: 0, air: false, path: 0, v: 0, tilt: Math.atan(Gc.slopes.r), lean: 0, leanIn: 0, duck: 0, duckHold: 0, duckTired: false,
    spin: 0, spinDir: 1, lock: 0, state: 'wait', t: 0, g: Gc.g, vAir: 0, hopGap: null, hopBuf: 0, fallGap: null, tumble: 0, appear: 0, dmg: 0, landT: 0, hopT: 0 };
  st.cam = { x: x - Gc.leadSlow, y: st.f.y - Gc.camY }; st.cam0 = { x: st.cam.x, y: st.cam.y }; st.lead = Gc.leadSlow;
  st.forkChoice = st.c.forks.map(() => 0); st.forkSaid = st.c.forks.map(() => false);
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null;
  st.idle = 0; st.afk = false; st.waitT = 0; st.roomT = 0; st.segStart = G.time; st.wrongT = [0, 0]; st.wrongN = [0, 0];
  st.prevDown = [true, true]; st.prevUp = [true, true]; st.short = null; st.split = null; st.fin = null; st.crackT = -1;
  st.streak = 0; st.streakT = 0; st.sprayT = 0; st.zone = 'ok'; st.scrapeT = 0;
  st.inT = [-99, -99];   // when each player last pressed anything (Mammo only helps a fall that both needed players tried)
  glacierMirror(st);
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function glacierStep(st, dt) {
  const f = st.f;
  if (!f) return;
  const ps = G.players;
  const press = [ps[0].pendingJump, ps[1].pendingJump];
  ps[0].pendingJump = false; ps[1].pendingJump = false;
  const downP = ps.map(p => p.input.down && !st.prevDown[p.id]), upP = ps.map(p => p.input.up && !st.prevUp[p.id]);
  st.prevDown = ps.map(p => p.input.down); st.prevUp = ps.map(p => p.input.up);
  const busy = ps.map((p, k) => press[k] || p.input.left || p.input.right || p.input.jump || p.input.down || p.input.up);
  for (const k of [0, 1]) if (busy[k]) st.inT[k] = G.time;
  st.idle = busy[0] || busy[1] ? 0 : st.idle + dt;
  st.roomT += dt;
  if (f.state === 'wait') glacierWait(st, dt);
  else if (f.state === 'slide' || f.state === 'crack') glacierSlide(st, dt, press, downP, upP);
  else if (f.state === 'fall') glacierFall(st, dt);
  else if (f.state === 'split') { if (glacierSplitStep(st, dt)) return; }
  else if (f.state === 'finish') { if (glacierFinStep(st, dt)) return; }
  glacierCam(st, dt);
  glacierFx(st, dt);
  glacierMirror(st);
}
// the top of a stretch: the floe waits for the card, then the steerer pushes off (or it goes by itself)
function glacierWait(st, dt) {
  const Gc = GLACIER, f = st.f, S = G.players[st.steer];
  if (G.introT > 0) { st.waitT = 0; return; }
  st.waitT += dt;
  if (st.waitT > 0.5 && !st.hinted.push) { st.hinted.push = true; glacierHint(st, st.steer, 'Hold ' + glacierKey(st.steer, 'right') + ' to push off!'); }
  if (S.input.right || st.waitT >= Gc.pushWait) {
    f.state = 'slide'; f.v = S.input.right ? 120 : 70; st.idle = 0; st.segStart = G.time;
    glacierPop(st, f.x, f.y - 70, 'Wheee!', '#ffffff', 22);
    Sfx.play('glacierPush'); rumble(st.steer, 0.1, 0.35, 90);
    st.hints[st.steer] = null;
  }
}
function glacierSlide(st, dt, press, downP, upP) {
  const Gc = GLACIER, f = st.f, ps = G.players, S = ps[st.steer], Hp = ps[st.hop], si = S.input, hi = Hp.input, c = st.c;
  f.lock = Math.max(0, f.lock - dt);
  if (f.spin > 0) f.spin = Math.max(0, f.spin - dt);
  if (f.appear > 0) f.appear = Math.max(0, f.appear - dt);
  const locked = f.lock > 0;
  // nobody has pressed anything for a long time: the floe brakes to a stop and waits
  const chilly = 'Brrr, chilly! Press any button to slide on';
  if (!st.afk && st.idle > Gc.afkT && !f.air && f.state === 'slide') st.afk = true;
  if (st.afk && st.idle === 0) { st.afk = false; if (st.msg && st.msg.text === chilly) st.msg = null; }
  if (st.afk && !st.msg) glacierMsg(st, chilly, '#c8f1ff', 999);
  // the steerer: lean (back = brake, forward = push); at a fork ▲ / ▼ pick the road
  const lean = locked || st.afk ? 0 : (si.right ? 1 : 0) - (si.left ? 1 : 0);
  f.leanIn = lean;
  const fk = f.state === 'slide' ? glacierForkNear(st) : null;
  if (fk) {
    const pick = press[S.id] || upP[S.id] ? 1 : downP[S.id] ? 0 : -1;
    if (pick >= 0 && pick !== st.forkChoice[fk.i]) {
      st.forkChoice[fk.i] = pick;
      const fe = glacierFeet(st, S.id);
      glacierPop(st, fe.x - 30, fe.y - 90, pick ? 'High road!' : 'Low road!', PCOL[S.id], 17);
      Sfx.play('glacierFork', S.id); rumble(S.id, 0, 0.25, 50);
    } else if (pick >= 0) Sfx.play('glacierFork', S.id);
    st.forkSaid[fk.i] = true;
  } else if (press[S.id] && f.state === 'slide') glacierWrong(st, S.id, 1);
  // the hopper's ◀ ▶ do nothing (a hint says who steers)
  if ((hi.left || hi.right) && f.state === 'slide') { st.wrongT[Hp.id] += dt; if (st.wrongT[Hp.id] > 0.8) glacierWrong(st, Hp.id, 0); } else st.wrongT[Hp.id] = 0;
  // speed (only on the ice)
  if (!f.air) {
    let target, rate;
    if (f.spin > Gc.spinT - Gc.spinLock) { target = Gc.bonkV; rate = 900; }   // a bonk spins you nearly to a stop
    else if (st.afk) { target = 0; rate = 220; }
    else if (lean > 0) { target = Gc.vMax; rate = Gc.push; }
    else if (lean < 0) { target = Gc.brakeTo; rate = Gc.brake; }
    else { target = glacierCruise(st); rate = Gc.drift; }
    if (f.state === 'crack') target = Math.min(target, 200);
    const v0 = f.v;
    f.v = approach(f.v, target, rate * dt);
    // speed-zone sounds: a whoosh into FAST, a scrape braking out of it
    const zone = f.v >= Gc.fastMin ? 'fast' : f.v <= Gc.slowMax ? 'slow' : 'ok';
    if (zone !== st.zone) { if (zone === 'fast') Sfx.play('glacierFast'); else if (zone === 'slow' && v0 > f.v) Sfx.play('glacierSlow'); st.zone = zone; }
    if (lean < 0 && f.v > Gc.brakeTo + 15) { st.scrapeT -= dt; if (st.scrapeT <= 0) { st.scrapeT = 0.35; Sfx.play('glacierScrape'); } } else st.scrapeT = 0;
  }
  f.lean = approach(f.lean, lean, dt * 6);
  // the hopper: duck (both of you) and hop
  if (hi.down && !f.duckTired) {
    if (f.duckHold === 0) Sfx.play('glacierDuck', Hp.id);
    f.duckHold += dt;
    if (f.duckHold >= Gc.duckMax) { f.duckTired = true; glacierHint(st, Hp.id, 'Legs tired! Duck just under the icicles', 2); }
  }
  if (!hi.down) { f.duckHold = 0; f.duckTired = false; }
  f.duck = approach(f.duck, hi.down && !f.duckTired && f.state !== 'crack' ? 1 : 0, Gc.duckRate * dt);
  f.hopBuf = Math.max(0, f.hopBuf - dt);
  if (press[Hp.id]) f.hopBuf = Gc.hopBuf;
  if (f.hopBuf > 0 && !f.air && !locked && f.state === 'slide') { f.hopBuf = 0; glacierHop(st); }
  // move along
  const xPrev = f.x, vx = f.air && f.vAir ? f.vAir : f.v;
  f.x += vx * dt;
  for (const k of c.forks) {
    if (xPrev < k.x0 + Gc.forkLock && f.x >= k.x0 + Gc.forkLock) {
      f.path = st.forkChoice[k.i];
      if (!st.forkSaid[k.i]) { const fe = glacierFeet(st, S.id); glacierPop(st, fe.x - 30, fe.y - 90, f.path ? 'High road!' : 'Low road!', PCOL[S.id], 17); }
      st.stats.forks[f.path]++;
    }
    if (xPrev < k.x1 && f.x >= k.x1) f.path = 0;
  }
  const gy = glacierGY(st, f.path, f.x);
  if (f.air) {
    f.vy += f.g * dt; f.y += f.vy * dt;
    const hole = glacierHoleAt(st, f.path, f.x, false);
    if (hole) { if (f.y > gy + 26) { glacierStartFall(st, hole); if (f.state === 'fall') return; } }
    else if (f.vy > 0 && f.y >= gy) glacierLand(st, gy);
    f.tilt = approach(f.tilt, Math.atan(glacierSlopeAt(st, f.path, f.x)) * 0.5 + clamp(f.vy / 2600, -0.12, 0.2), dt * 3);
  } else {
    const hole = glacierHoleAt(st, f.path, f.x, true);
    if (hole) { glacierStartFall(st, hole); if (f.state === 'fall') return; }
    else { f.y = gy; f.tilt = approach(f.tilt, Math.atan(glacierSlopeAt(st, f.path, f.x)), dt * 4); }
  }
  // bumps: every crest at more than SLOW speed is a bonk (hopping over them doesn't dodge it)
  for (const m of c.mogs[f.path]) {
    if (f.x < m.x0 - 10 || xPrev > m.x1 + 10) continue;
    if (!m.bonked) for (const cx of m.crests) if (xPrev < cx && f.x >= cx && f.v > Gc.slowMax + Gc.tol) { m.bonked = true; glacierBonk(st, 'mog'); break; }
    if (xPrev < m.x1 && f.x >= m.x1 && !m.done) {
      m.done = true;
      if (!m.bonked) { if (!m.scored) st.stats.smooth[st.steer]++; m.scored = true; const fe = glacierFeet(st, S.id); glacierPop(st, fe.x - 30, fe.y - 90, 'Smooth!', '#8fe3b0', 17); Sfx.play('glacierGood'); }
    }
  }
  // icicle arches: anyone's head up in the icicles is a bonk (the icicles break, so you pass anyway)
  const airH = Math.max(0, glacierGY(st, f.path, f.x) - f.y), head = airH + Gc.FT + PH * (1 - 0.42 * f.duck);
  for (const a of c.arches[f.path]) {
    const lo = a.x0 - Gc.FL / 2 + 14, hiX = a.x1 + Gc.FL / 2 - 14;
    if (f.x < lo - 4 || xPrev > hiX + 4) continue;
    if (!a.broken && f.x >= lo && f.x <= hiX && head > Gc.archClear) { a.broken = true; a.hit = true; a.shake = 0.4; glacierShatter(st, a); glacierBonk(st, 'arch'); }
    if (xPrev < hiX && f.x >= hiX && !a.done) {
      a.done = true;
      if (!a.hit && !a.broken) { if (!a.scored) st.stats.ducks[st.hop]++; a.scored = true; const fe = glacierFeet(st, Hp.id); glacierPop(st, fe.x + 30, fe.y - 90, 'Ducked!', '#bfeaff', 17); Sfx.play('glacierGood'); }
    }
  }
  // crevasses passed
  for (const gp of c.gaps[f.path]) {
    if (!(xPrev < gp.x1 && f.x >= gp.x1) || gp.done) continue;
    gp.done = true;
    if (gp.help >= 2) continue;
    // (a retry after a snowball pop cheers again but counts each crevasse, bump set and arch once in the stats)
    if (!gp.scored) { st.stats.hops[st.hop]++; if (gp.wide) { st.stats.smooth[st.steer]++; st.stats.bigHops++; } }
    gp.scored = true;
    const fe = glacierFeet(st, Hp.id);
    if (gp.wide) { glacierPop(st, fe.x, fe.y - 94, 'WHOOSH! Big hop!', C.gold, 20); Sfx.play('glacierBig'); }
    else { glacierPop(st, fe.x + 30, fe.y - 90, 'Nice hop!', '#ffffff', 17); Sfx.play('glacierGood'); }
  }
  glacierFlakes(st);
  // the end of the stretch: the crack, or the finish snowbank
  if (c.crack && f.state === 'slide' && f.x >= c.crack.x - Gc.crackAt) {
    f.state = 'crack'; st.crackT = 0;
    Sfx.play('glacierCrack'); rumble(0, 0.6, 0.6, 350); rumble(1, 0.6, 0.6, 350);
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.3);
    glacierPop(st, c.crack.x, glacierGY(st, 0, c.crack.x) - 120, 'CRRRACK!', '#ffffff', 34);
  }
  if (f.state === 'crack' && f.x >= c.crack.x - 6 && !f.air) glacierSplit(st);
  if (c.finish && (f.state === 'slide' || f.state === 'crack') && f.x + Gc.FL / 2 >= c.finish.x - 70) glacierFinish(st);
}
function glacierHop(st) {
  const Gc = GLACIER, f = st.f;
  let g = Gc.g, vAir = 0, gap = null;
  const range = Math.max(Gc.zone, f.v * Gc.zoneT) + f.v * Gc.zoneExtra;
  for (const gp of st.c.gaps[f.path]) {
    if (gp.help >= 2) continue;
    const d = gp.x0 - f.x;
    if (d < -Gc.coyote || d > range) continue;
    if (gp.wide && f.v < Gc.fastMin - Gc.tol) { st.short = gp; break; }   // too slow for a big one: a plain hop falls short
    const xl = gp.x1 + Gc.land, dist = xl - f.x;
    let T = dist / Math.max(1, f.v);
    if (T > Gc.airMax) { vAir = dist / Gc.airMax; T = Gc.airMax; }
    T = Math.max(T, Gc.airMin);
    const dy = glacierGY(st, f.path, f.x + (vAir || f.v) * T) - f.y;
    g = clamp(2 * (dy + Gc.hopV * T) / (T * T), 700, 4200);
    gap = gp;
    break;
  }
  f.air = true; f.vy = -Gc.hopV; f.g = g; f.vAir = vAir; f.hopGap = gap; f.hopT = 0.25;
  const H = G.players[st.hop], S = G.players[st.steer];
  H.sx = 0.8; H.sy = 1.25; S.sx = 0.85; S.sy = 1.18;
  Sfx.play('glacierHop', st.hop); rumble(st.hop, 0, 0.3, 60);
  for (let i = 0; i < 6; i++) glacierPart(st, f.x + (Math.random() - 0.5) * Gc.FL, f.y, (Math.random() - 0.5) * 80, -Math.random() * 90, 0.45, '#ffffff', 3 + Math.random() * 3, 300);
}
function glacierLand(st, gy) {
  const f = st.f, ps = G.players;
  const hard = f.vy > 300;
  f.y = gy; f.air = false; f.vy = 0; f.vAir = 0; f.g = GLACIER.g; f.hopGap = null; f.landT = 0.2;
  for (const p of ps) { p.sx = 1.2; p.sy = 0.8; }
  Sfx.play('glacierLand'); if (hard) { rumble(0, 0.15, 0.3, 60); rumble(1, 0.15, 0.3, 60); }
  for (let i = 0; i < 10; i++) glacierPart(st, f.x + (Math.random() - 0.5) * GLACIER.FL, gy, (Math.random() - 0.5) * 160, -40 - Math.random() * 90, 0.5, '#ffffff', 3 + Math.random() * 3, 350);
}
function glacierBonk(st, why) {
  const Gc = GLACIER, f = st.f, S = st.stats;
  f.spin = Gc.spinT; f.spinDir = why === 'arch' ? -1 : 1; f.lock = Math.max(f.lock, Gc.spinLock); f.dmg++;
  S.bonks++; S.segBonks[st.k]++;
  const fe = glacierFeet(st, st.hop);
  glacierPop(st, fe.x - 20, fe.y - 94, why === 'mog' ? 'Bumpy! Bonk!' : 'Brrr! Bonk!', '#ffffff', 22);
  Sfx.play('glacierBonk'); Sfx.play('glacierBrrr');
  rumble(0, 0.7, 0.5, 220); rumble(1, 0.7, 0.5, 220);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.18);
  for (const p of G.players) { p.sx = 1.3; p.sy = 0.7; }
  if (why === 'mog') glacierHintOnce(st, 'slow', st.steer, 'Bumps: hold ' + glacierKey(st.steer, 'left') + ' to go SLOW!');
  if (why === 'arch') glacierHintOnce(st, 'duck', st.hop, 'Hold ' + glacierKey(st.hop, 'duck') + ' to duck the icicles!');
  for (let i = 0; i < 12; i++) glacierPart(st, f.x + (Math.random() - 0.5) * Gc.FL, f.y - 20, (Math.random() - 0.5) * 240, -60 - Math.random() * 160, 0.6, i % 3 ? '#ffffff' : '#bfeaff', 3 + Math.random() * 3, 500);
}
function glacierShatter(st, a) {
  const y = glacierGY(st, a.path, (a.x0 + a.x1) / 2) - 52;
  for (let i = 0; i < 16; i++) glacierPart(st, a.x0 + Math.random() * (a.x1 - a.x0), y, (Math.random() - 0.5) * 220, -40 - Math.random() * 120, 0.7, i % 2 ? '#e9faff' : '#9fd8f5', 2.5 + Math.random() * 3, 700, 'shard');
  Sfx.play('glacierTink');
}
function glacierStartFall(st, gap) {
  const f = st.f, S = st.stats;
  gap.fails++;
  S.bonks++; S.segBonks[st.k]++;
  const slow = st.short === gap;
  st.short = null;
  // Mammo only counts a try that both needed players took part in (the hopper always, the steerer too at a big gap),
  // so one player can't get every crevasse bridged alone; whoever sat it out gets a friendly nudge instead
  const idle = (gap.wide ? [st.hop, st.steer] : [st.hop]).filter(k => G.time - st.inT[k] > GLACIER.tryWin);
  if (!idle.length) gap.tries++;
  if (gap.path === 1) {
    // a hole in the high road: down to the low road below (it lands on its own, or in a crevasse there)
    f.path = 0; f.air = true; f.hopGap = null; f.vAir = 0; f.g = GLACIER.g; f.vy = Math.max(0, f.vy);
    glacierPop(st, f.x, f.y - 70, 'Oops! Low road!', '#ffffff', 20);
    Sfx.play('glacierOops');
    glacierHintOnce(st, slow ? 'fast' : 'hop', slow ? st.steer : st.hop, slow ? 'Big gaps: hold ' + glacierKey(st.steer, 'right') + ' for FAST!' : 'Press ' + glacierKey(st.hop, 'hop') + ' on the arrows!');
    return;
  }
  f.state = 'fall'; f.t = 0; f.fallGap = gap; f.air = true; f.vy = Math.max(0, f.vy); f.g = GLACIER.g; f.tumble = 0; f.hopGap = null; f.vAir = 0; f.duck = 0;
  glacierPop(st, f.x, glacierGY(st, gap.path, gap.x0) - 80, slow ? 'Oops! Too slow!' : 'Oops!', '#ffffff', 24);
  Sfx.play('glacierOops'); rumble(0, 0.4, 0.5, 200); rumble(1, 0.4, 0.5, 200);
  if (slow) glacierHintOnce(st, 'fast', st.steer, 'Big gaps: hold ' + glacierKey(st.steer, 'right') + ' for FAST!');
  else glacierHintOnce(st, 'hop', st.hop, 'Press ' + glacierKey(st.hop, 'hop') + ' on the arrows!');
  if (idle.length) {
    for (const k of idle) glacierHint(st, k, k === st.hop ? 'Your turn! Press ' + glacierKey(k, 'hop') + ' to hop' : 'Your turn! Hold ' + glacierKey(k, 'right') + ' for FAST', 3.4);
    if (!st.afk) glacierMsg(st, 'Mammo can help once you both try!', '#c8f1ff', 3.2);
  }
}
function glacierFall(st, dt) {
  const f = st.f;
  f.t += dt; f.vy += GLACIER.g * dt; f.y += f.vy * dt;
  f.x = Math.min(f.x + f.v * 0.4 * dt, f.fallGap.x1 - 30);
  f.tumble += dt * (reduceMotion ? 1 : 3.2);
  if (f.t >= GLACIER.fallT) glacierPopBack(st);
}
// a big snowball pops the floe back onto the ice a little way before the crevasse (and Mammo may help)
function glacierPopBack(st) {
  const Gc = GLACIER, f = st.f, gap = f.fallGap, c = st.c;
  let help = 0;
  if (gap.big && gap.help === 0 && gap.tries >= 2) {
    help = 1; gap.help = 1; gap.wide = false;
    const w = gap.x1 - gap.x0, cut = Math.max(0, (w - 80) / 2);
    gap.x0 += cut; gap.x1 -= cut;
  } else if (gap.help < 2 && gap.tries >= (gap.big ? 3 : 2)) { help = 2; gap.help = 2; }
  if (help) {
    st.stats.helps++;
    glacierMsg(st, help === 1 ? 'Mammo the mammoth packed the gap smaller: just hop!' : 'Mammo the mammoth built a snow bridge!', C.gold, 3.2);
    Sfx.play('glacierHelp');
  }
  // the spot: 460 px back, clear of every hazard on that road
  const fk = c.forks.find(k => gap.x0 >= k.x0 && gap.x0 <= k.x1);
  let xr = gap.x0 - Gc.resetBack;
  const path = fk && xr >= fk.x0 + Gc.forkLock + 20 ? gap.path : 0;
  for (let n = 0; n < 20; n++) {
    const h = c.haz[path].find(h => xr > h.x0 - 90 && xr < h.x1 + 60);
    if (!h) break;
    xr = h.x0 - 100;
  }
  for (const p of [0, 1]) for (const h of c.haz[p]) if (h.x0 > xr) { h.done = false; if (h.kind === 'mog') h.bonked = false; if (h.kind === 'arch') h.hit = false; }
  f.x = xr; f.path = path; f.y = glacierGY(st, path, xr); f.air = false; f.vy = 0; f.v = Gc.cruise; f.state = 'slide';
  f.lock = Gc.popLock; f.appear = 0.45; f.tumble = 0; f.spin = 0; f.duck = 0; f.tilt = Math.atan(glacierSlopeAt(st, path, xr)); f.fallGap = null;
  st.stats.pops++;
  glacierPop(st, xr, f.y - 76, 'POP!', '#ffffff', 26);
  Sfx.play('glacierPop'); rumble(0, 0.2, 0.4, 100); rumble(1, 0.2, 0.4, 100);
  for (let i = 0; i < 22; i++) { const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 200; glacierPart(st, xr, f.y - 24, Math.cos(a) * s, Math.sin(a) * s - 60, 0.7, '#ffffff', 4 + Math.random() * 4, 300); }
}
// the glacier cracks: the floe splits, both are tossed up and swap seats in mid-air
function glacierSplit(st) {
  const Gc = GLACIER, f = st.f, cx = st.c.crack.x;
  f.state = 'split'; f.t = 0;
  const from = [0, 1].map(id => glacierFeet(st, id));
  const nx = cx + 160, ny = glacierGY(st, 0, nx), a = Math.atan(glacierSlopeAt(st, 0, nx));
  const to = [0, 1].map(id => {
    const lx = Gc.seatX[id === st.steer ? 1 : 0];
    return { x: nx + lx * Math.cos(a) + Gc.FT * Math.sin(a), y: ny + lx * Math.sin(a) - Gc.FT * Math.cos(a) };
  });
  st.split = { t: 0, from, to, nx, ny, a, landed: false,
    halves: [-1, 1].map(s => ({ x: f.x + s * Gc.FL / 4, y: f.y - Gc.FT / 2, vx: s * 60 + f.v * 0.2, vy: -160, r: f.tilt, vr: s * 3 })) };
  st.stats.segT[st.k] = G.time - st.segStart;
  glacierPop(st, f.x, f.y - 90, 'SPLIT!', '#ffffff', 30);
  Sfx.play('glacierSplit'); rumble(0, 0.5, 0.7, 300); rumble(1, 0.5, 0.7, 300);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.25);
  for (let i = 0; i < 20; i++) glacierPart(st, cx + (Math.random() - 0.5) * 30, f.y - 10, (Math.random() - 0.5) * 260, -80 - Math.random() * 220, 0.8, i % 2 ? '#ffffff' : '#9fd8f5', 3 + Math.random() * 4, 600, 'shard');
}
function glacierSplitStep(st, dt) {
  const sp = st.split;
  sp.t += dt;
  for (const h of sp.halves) { h.vy += 1300 * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.r += h.vr * dt; }
  if (!sp.landed && sp.t >= 1.05) {
    sp.landed = true;
    const ns = st.hop;
    glacierPop(st, sp.nx, sp.ny - 96, 'Swap! ' + NAMES[ns] + ' steers!', PCOL[ns], 24);
    Sfx.play('glacierSwap'); rumble(0, 0.1, 0.4, 100); rumble(1, 0.1, 0.4, 100);
    for (let i = 0; i < 14; i++) glacierPart(st, sp.nx + (Math.random() - 0.5) * GLACIER.FL, sp.ny, (Math.random() - 0.5) * 160, -40 - Math.random() * 100, 0.6, '#ffffff', 3 + Math.random() * 3, 350);
  }
  if (sp.t >= GLACIER.splitT) {
    const L = G.level;
    if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return true; }
    glacierClear(st); return true;
  }
  return false;
}
// the finish: into the big snowbank by the mammoth family
function glacierFinish(st) {
  const Gc = GLACIER, f = st.f, bx = st.c.finish.x;
  const soft = f.v <= Gc.slowMax + 10;
  f.state = 'finish'; f.t = 0;
  const from = [0, 1].map(id => glacierFeet(st, id));
  const top = glacierGY(st, 0, bx + 40) - 118;
  st.fin = { t: 0, soft, from, to: [0, 1].map(id => ({ x: bx + 10 + (id === st.steer ? -26 : 26), y: top + 4 })), bx, cleared: false };
  st.stats.segT[st.k] = G.time - st.segStart;
  if (soft) { st.stats.flakes += Gc.softStop; st.stats.softStop = true; }
  glacierPop(st, bx + 20, top - 150, soft ? 'Gentle stop! +' + Gc.softStop : 'WHUMPF!', soft ? C.gold : '#ffffff', 26);
  Sfx.play('glacierPoof'); Sfx.play('glacierTrumpet');
  rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
  for (let i = 0; i < 40; i++) { const a = -Math.PI * Math.random(), s = 80 + Math.random() * 260; glacierPart(st, bx - 40, glacierGY(st, 0, bx) - 40, Math.cos(a) * s, Math.sin(a) * s, 0.9, '#ffffff', 4 + Math.random() * 5, 400); }
}
function glacierFinStep(st, dt) {
  const f = st.f, fin = st.fin;
  fin.t += dt;
  f.v = approach(f.v, 0, 900 * dt); f.x += f.v * dt;
  if (fin.t >= 1.2 && !fin.toot) { fin.toot = true; Sfx.play('glacierTrumpet'); }
  if (fin.t >= GLACIER.finT && !fin.cleared) { fin.cleared = true; glacierClear(st); return true; }
  return false;
}
function glacierClear(st) {
  const bx = st.fin ? st.fin.bx : st.f.x;
  G.level.goal = { x: bx - st.cam.x, y: glacierGY(st, 0, bx) - 140 - st.cam.y };
  levelClear();
}
function glacierFlakes(st) {
  const Gc = GLACIER, f = st.f, S = st.stats;
  const feet = [0, 1].map(id => glacierFeet(st, id)), bodyH = PH * (1 - 0.42 * f.duck);
  for (const fl of st.c.flakes) {
    if (fl.got || Math.abs(fl.x - f.x) > 120 || fl.path !== glacierPathAt(st, fl.x)) continue;
    if (fl.path !== f.path && f.x >= fl.x - 120) {
      // the other road: never
      const fk = st.c.forks.find(k => fl.x >= k.x0 && fl.x <= k.x1);
      if (fk && f.x >= fk.x0) continue;
    }
    const fy = glacierGY(st, fl.path, fl.x) - fl.h;
    for (const fe of feet) {
      const nx = clamp(fl.x, fe.x - 13, fe.x + 13), ny = clamp(fy, fe.y - bodyH - 6, fe.y);
      if (Math.hypot(fl.x - nx, fy - ny) > Gc.flakeR) continue;
      fl.got = true;
      S.flakes += fl.gold ? Gc.goldVal : 1;
      st.streak = st.streakT > 0 ? st.streak + 1 : 0; st.streakT = 1.2;
      if (fl.gold) { S.gold++; glacierPop(st, fl.x, fy - 20, '+' + Gc.goldVal, C.gold, 22); Sfx.play('glacierGold'); rumble(0, 0, 0.3, 80); rumble(1, 0, 0.3, 80); }
      else Sfx.play('glacierFlake');
      for (let i = 0; i < (fl.gold ? 14 : 7); i++) { const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 110; glacierPart(st, fl.x, fy, Math.cos(a) * s, Math.sin(a) * s, 0.5, fl.gold ? C.gold : '#ffffff', 2 + Math.random() * 2.5, 80, 'spark'); }
      break;
    }
  }
}
// pressing the other job's buttons: a friendly nudge (once in a while)
function glacierWrong(st, id, steerer) {
  if (steerer) { st.wrongN[id]++; if (st.wrongN[id] < 2) return; }
  st.wrongN[id] = 0; st.wrongT[id] = 0;
  const key = 'wrong' + id, now = G.time;
  if (st.hinted[key] && now - st.hinted[key] < 9) return;
  st.hinted[key] = now;
  if (steerer) glacierHint(st, id, NAMES[st.hop] + ' hops! You steer ' + glacierKey(id, 'lr'));
  else glacierHint(st, id, NAMES[st.steer] + ' steers! You hop ' + glacierKey(id, 'hop') + ' and duck ' + glacierKey(id, 'duck'));
}
// 1-player mode: the computer's own seat gets no key hints or prompts (it knows its job; the person might think the
// keys were meant for them)
const glacierQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
function glacierHint(st, id, text, life) { if (glacierQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || GLACIER.hintLife }; }
function glacierHintOnce(st, key, id, text) { if (st.hinted[key]) return; st.hinted[key] = true; glacierHint(st, id, text); }
function glacierMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function glacierPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 14) st.pops.shift(); }
function glacierPart(st, x, y, vx, vy, life, col, size, grav, kind) {
  if (st.parts.length > 320) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
function glacierCam(st, dt) {
  const Gc = GLACIER, f = st.f, cam = st.cam;
  let tx, ty;
  if (f.state === 'split') { tx = st.split.nx - Gc.leadSlow; ty = st.split.ny - Gc.camY; }
  else if (f.state === 'finish') { tx = st.fin.bx - 420; ty = glacierGY(st, 0, st.fin.bx) - Gc.camY - 40; }
  else {
    const u = clamp((f.v - Gc.vMin) / (Gc.vMax - Gc.vMin), 0, 1);
    st.lead = approach(st.lead, glacierLerp(Gc.leadSlow, Gc.leadFast, u), dt * 120);
    tx = f.x - st.lead;
    ty = (f.state === 'fall' ? glacierGY(st, f.fallGap.path, f.fallGap.x0) : glacierGY(st, f.path, f.x)) - Gc.camY;
  }
  cam.x += (tx - cam.x) * Math.min(1, dt * 7);
  cam.y += (ty - cam.y) * Math.min(1, dt * 5);
}
function glacierFx(st, dt) {
  const Gc = GLACIER, f = st.f;
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 6;
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.1);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  if (st.streakT > 0) st.streakT -= dt;
  if (st.crackT >= 0) st.crackT += dt;
  if (f.landT > 0) f.landT -= dt;
  if (f.hopT > 0) f.hopT -= dt;
  for (const a of st.c.arches[0].concat(st.c.arches[1])) if (a.shake > 0) a.shake -= dt;
  // snow spray: braking digs in the pole, FAST leaves sparkly streaks
  if ((f.state === 'slide' || f.state === 'crack') && !f.air && f.v > 20) {
    st.sprayT -= dt;
    if (st.sprayT <= 0) {
      st.sprayT = 0.045;
      const bx = f.x - Gc.FL / 2, by = f.y;
      if (f.leanIn < 0 && f.v > Gc.brakeTo + 5) glacierPart(st, bx - 10, by - 2, -40 - Math.random() * 60 + f.v * 0.6, -80 - Math.random() * 90, 0.45, '#ffffff', 3 + Math.random() * 3, 420);
      else if (f.v >= Gc.fastMin) glacierPart(st, bx + Math.random() * 20, by - 3 - Math.random() * 6, -60, -20 - Math.random() * 30, 0.35, 'rgba(255,255,255,0.9)', 2 + Math.random() * 2, 120);
      else if (Math.random() < 0.35) glacierPart(st, bx + 6, by - 2, -30, -30 - Math.random() * 30, 0.3, 'rgba(255,255,255,0.8)', 2 + Math.random() * 2, 200);
    }
  }
}
// copy the floe into the engine players: name tags, bubbles and drawPlayer read p.x / p.y (screen pixels)
function glacierMirror(st) {
  const f = st.f, cam = st.cam;
  for (const p of G.players) {
    let fe = glacierFeet(st, p.id);
    if (st.split) fe = glacierArc(st.split.from[p.id], st.split.to[p.id], clamp((st.split.t - 0.12) / 0.93, 0, 1), 120);
    else if (st.fin) fe = glacierArc(st.fin.from[p.id], st.fin.to[p.id], clamp(st.fin.t / 0.7, 0, 1), 90);
    p.x = fe.x - cam.x - PW / 2; p.y = fe.y - cam.y - PH; p.vx = f.v; p.vy = f.air ? f.vy : 0;
    p.alive = true; p.grounded = !f.air; p.face = 1; p.stompSafe = 0;
    p.stun = f.state === 'slide' && f.spin > 0 ? f.spin : f.state === 'fall' ? 0.5 : 0;
  }
}
function glacierArc(a, b, u, h) {
  const e = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
  return { x: glacierLerp(a.x, b.x, e), y: glacierLerp(a.y, b.y, u) - h * 4 * u * (1 - u), u };
}

MODES.glacier = {
  // medal goals (js/medals.js): bonks, and for Gold three quarters of the snowflakes (the soft stop counts too)
  medals: { bronze: 'Slide down the glacier', goals: [
    { key: 'bonks', gold: 2, silver: 10, word: 'bonk' },
    { key: 'flakes', gold: 0.75, more: true, pct: true, word: 'the snowflakes' },
  ] },
  medalValues() {
    const s = G.mst.stats;
    if (!s) return {};
    const max = s.maxFlakes.reduce((a, b) => a + (b || 0), 0) + GLACIER.softStop;
    return { bonks: s.bonks, flakes: max > 0 ? s.flakes / max : 0 };
  },
  rand: Math.random,
  GLACIER,
  compile: glacierCompile, gy: glacierGY, ahead: glacierAhead, key: glacierKey, feet: glacierFeet,
  setup(st, L) {
    st.stats = { flakes: 0, gold: 0, maxFlakes: [], bonks: 0, segBonks: [], segT: [], segTitles: [], hops: [0, 0], ducks: [0, 0], smooth: [0, 0],
      bigHops: 0, pops: 0, helps: 0, forks: [0, 0], softStop: false };
    glacierRoom(st, L, 0);
  },
  room(k, L) { glacierRoom(G.mst, L, k); },
  step(dt) { glacierStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden for that moment and drawn on the floe
  // in drawTop instead (tilted and spinning with it)
  draw() {
    const st = G.mst;
    if (!st.f) return;
    glacierDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.f) return;
    glacierDrawFront(st);
  },
  hud() { const st = G.mst; if (st.f) glacierHud(st); },
  stats() {
    const s = G.mst.stats;
    if (!s) return [];
    const max = s.maxFlakes.reduce((a, b) => a + (b || 0), 0) + GLACIER.softStop;   // the gentle stop in the snowbank is worth 5 too
    const out = [
      { label: 'Snowflakes', value: s.flakes + ' of ' + max },
      { label: 'Bonks', value: s.bonks },
      { label: 'Hops & ducks', values: [s.hops[0] + s.ducks[0], s.hops[1] + s.ducks[1]] },
      { label: 'Smooth steering', values: s.smooth.slice() },
    ];
    let best = -1;
    s.segBonks.forEach((b, k) => { if (s.segT[k] == null) return; if (best < 0 || b < s.segBonks[best] || (b === s.segBonks[best] && s.segT[k] < s.segT[best])) best = k; });
    if (best >= 0) {
      const b = s.segBonks[best];
      out.push('Smoothest stretch: ' + s.segTitles[best] + (b === 0 ? ', not one bonk!' : b === 1 ? ', just 1 bonk' : ', ' + b + ' bonks'));
    }
    const words = s.bonks === 0 ? 'Cool as ice!' : s.bonks <= 4 ? 'Slick sliding!' : 'Brrr-illiant, you made it together!';
    out.push(words);
    return out;
  },
};

/* ---------- drawing ---------- */
let glacierSkyG = null, glacierCrevG = null, glacierPeaks = null;
function glacierDrawWorld(st) {
  glacierDrawSky(st);
  glacierDrawHills(st);
  glacierDrawDeco(st);
  glacierDrawTrack(st);
  glacierDrawMarks(st);
  glacierDrawSigns(st);
  glacierDrawArches(st, false);
  glacierDrawFlakes(st);
  glacierDrawCrack(st);
  glacierDrawShadow(st);
}
function glacierDrawFront(st) {
  glacierDrawFinish(st);
  glacierDrawFloe(st);
  glacierDrawArches(st, true);
  for (const q of st.parts) {
    const a = clamp(q.life / q.max, 0, 1), x = q.x - st.cam.x, y = q.y - st.cam.y;
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
    ctx.globalAlpha = a; ctx.fillStyle = q.col;
    if (q.kind === 'shard') { ctx.save(); ctx.translate(x, y); ctx.rotate(q.r); ctx.beginPath(); ctx.moveTo(0, -q.size * 1.6); ctx.lineTo(q.size * 0.7, q.size); ctx.lineTo(-q.size * 0.7, q.size); ctx.closePath(); ctx.fill(); ctx.restore(); }
    else if (q.kind === 'spark') { glacierStar(x, y, q.size * 1.8, q.size * 0.6, q.r); ctx.fill(); }
    else { circle(x, y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  const big = hudBig();
  for (const q of st.pops) {
    const x = clamp(q.x - st.cam.x, 70, W - 70), y = q.y - st.cam.y - q.t * 34;
    ctx.globalAlpha = clamp((1.1 - q.t) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.3 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
    ctx.globalAlpha = 1;
  }
}
function glacierStar(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 12; i++) { const a = rot + i * Math.PI / 6, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
function glacierDrawSky(st) {
  if (!glacierSkyG) { glacierSkyG = ctx.createLinearGradient(0, 0, 0, H); glacierSkyG.addColorStop(0, '#7ec8f7'); glacierSkyG.addColorStop(0.55, '#c9ecff'); glacierSkyG.addColorStop(1, '#eef9ff'); }
  ctx.fillStyle = glacierSkyG; ctx.fillRect(0, 0, W, H);
  // a pale sun and slow clouds
  ctx.fillStyle = 'rgba(255,253,235,0.95)'; circle(800, 92, 38); ctx.fill();
  ctx.fillStyle = 'rgba(255,253,235,0.35)'; circle(800, 92, 58); ctx.fill();
  for (let i = 0; i < 5; i++) {
    const x = ((i * 271 - st.cam.x * 0.04 + G.clock * (5 + i * 2)) % (W + 260) + W + 260) % (W + 260) - 130, y = 60 + ((i * 53) % 110);
    drawCloud(x, y, 0.75 + (i % 2) * 0.4);
  }
  // far snowy peaks (parallax)
  if (!glacierPeaks) {
    glacierPeaks = [];
    for (let i = 0; i < 9; i++) glacierPeaks.push({ x: i * 210 + (hash(i, 3) % 90), h: 120 + (hash(i, 7) % 110), w: 150 + (hash(i, 11) % 90) });
  }
  const RW = 9 * 210, off = ((st.cam.x * 0.07) % RW + RW) % RW, hy = 300 - clamp((st.cam.y - st.cam0.y) * 0.035, -40, 60);
  for (const layer of [0, 1]) for (const pk of glacierPeaks) for (const rep of [-1, 0, 1]) {
    if ((pk.x + layer) % 2 && layer) continue;
    const x = pk.x - off + rep * RW + layer * 105, h = pk.h * (layer ? 0.7 : 1), w = pk.w * (layer ? 0.8 : 1), y = hy + layer * 26;
    if (x + w < -20 || x - w > W + 20) continue;
    ctx.fillStyle = layer ? '#a5cbe9' : '#b9d6ef';
    ctx.beginPath(); ctx.moveTo(x - w, y + 40); ctx.lineTo(x - w * 0.18, y - h + 10); ctx.quadraticCurveTo(x, y - h - 6, x + w * 0.18, y - h + 10); ctx.lineTo(x + w, y + 40); ctx.closePath(); ctx.fill();
    // (polish) the shaded east face and a few rock ribs
    ctx.fillStyle = layer ? 'rgba(70,110,160,0.16)' : 'rgba(70,110,160,0.13)';
    ctx.beginPath(); ctx.moveTo(x + w * 0.02, y - h + 2); ctx.quadraticCurveTo(x + w * 0.1, y - h + 4, x + w * 0.18, y - h + 10); ctx.lineTo(x + w, y + 40); ctx.lineTo(x + w * 0.12, y + 40); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = layer ? 'rgba(90,130,175,0.35)' : 'rgba(90,130,175,0.28)'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(x - w * 0.3, y - h * 0.45); ctx.lineTo(x - w * 0.42, y - h * 0.1); ctx.moveTo(x + w * 0.3, y - h * 0.4); ctx.lineTo(x + w * 0.46, y - h * 0.05); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(x - w * 0.32, y - h * 0.6); ctx.lineTo(x - w * 0.18, y - h + 10); ctx.quadraticCurveTo(x, y - h - 6, x + w * 0.18, y - h + 10); ctx.lineTo(x + w * 0.32, y - h * 0.6);
    ctx.lineTo(x + w * 0.16, y - h * 0.52); ctx.lineTo(x + w * 0.04, y - h * 0.64); ctx.lineTo(x - w * 0.1, y - h * 0.5); ctx.lineTo(x - w * 0.22, y - h * 0.62); ctx.closePath(); ctx.fill();
  }
}
// rolling snowy hills with pine trees (and a mammoth herd in Mammoth Meadow)
function glacierDrawHills(st) {
  const off = st.cam.x * 0.28, hy = 372 - clamp((st.cam.y - st.cam0.y) * 0.08, -60, 110);
  const yAt = sx => hy + Math.sin((sx + off) * 0.0045) * 22 + Math.sin((sx + off) * 0.011 + 2) * 9;
  ctx.fillStyle = '#e3f3fc';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let sx = 0; sx <= W; sx += 16) ctx.lineTo(sx, yAt(sx));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c4e2f4'; ctx.lineWidth = 3;
  ctx.beginPath(); for (let sx = 0; sx <= W; sx += 16) { const y = yAt(sx) + 2; if (sx) ctx.lineTo(sx, y); else ctx.moveTo(sx, y); } ctx.stroke();
  // (polish) snow sparkles that twinkle on the hills, fixed to the ground as it scrolls
  if (!reduceMotion) for (let k = Math.floor(off / 37); k < Math.floor(off / 37) + W / 37 + 1; k++) {
    const h = hash(k, 77), sx = k * 37 - off + (h % 30), tw = Math.sin(G.clock * 3 + h % 7);
    if (tw < 0.6) continue;
    ctx.fillStyle = 'rgba(255,255,255,' + ((tw - 0.6) * 2).toFixed(2) + ')'; const y = yAt(sx) + 14 + (h >> 6) % 40, r = 2.2;
    ctx.beginPath(); ctx.moveTo(sx, y - r * 2); ctx.lineTo(sx + r * 0.5, y); ctx.lineTo(sx, y + r * 2); ctx.lineTo(sx - r * 0.5, y); ctx.closePath(); ctx.moveTo(sx - r * 2, y); ctx.lineTo(sx, y + r * 0.5); ctx.lineTo(sx + r * 2, y); ctx.lineTo(sx, y - r * 0.5); ctx.closePath(); ctx.fill();
  }
  // pines
  const TW = 150;
  for (let k = Math.floor(off / TW) - 1; k < Math.floor(off / TW) + W / TW + 2; k++) {
    const h = hash(k, 21);
    if (h % 3 === 0) continue;
    const sx = k * TW - off + (h % 60), s = 0.6 + ((h >> 4) % 50) / 100;
    glacierPine(sx, yAt(sx) + 6, s);
  }
  if (G.level && G.level.def.herd) {
    // the herd walks along the hills (a family: two grown-ups, a teen, a baby)
    const walk = G.clock * 14;
    ctx.globalAlpha = 0.88;
    [[0, 0.4], [70, 0.36], [130, 0.28], [176, 0.21]].forEach(([dx, s], i) => {
      const wx = 600 + dx + walk - off * 0.4, sx = ((wx % 1400) + 1400) % 1400 - 200;
      glacierMammoth(sx, yAt(sx) + 3, s, 1, G.clock + i, { bob: true, fur: '#9b6a4a' });
    });
    ctx.globalAlpha = 1;
  }
}
function glacierPine(x, y, s) {
  ctx.fillStyle = '#6f4a32'; ctx.fillRect(x - 3 * s, y - 10 * s, 6 * s, 12 * s);
  for (let i = 0; i < 3; i++) {
    const w = (26 - i * 6) * s, ty = y - 10 * s - i * 14 * s;
    ctx.fillStyle = '#3f8a6e';
    ctx.beginPath(); ctx.moveTo(x - w, ty); ctx.lineTo(x, ty - 26 * s); ctx.lineTo(x + w, ty); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2f6e57'; ctx.beginPath(); ctx.moveTo(x, ty - 26 * s); ctx.lineTo(x + w, ty); ctx.lineTo(x, ty); ctx.closePath(); ctx.fill();   // (polish) shaded side
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(x - w * 0.55, ty - 11 * s); ctx.lineTo(x, ty - 26 * s); ctx.lineTo(x + w * 0.55, ty - 11 * s); ctx.quadraticCurveTo(x, ty - 7 * s, x - w * 0.55, ty - 11 * s); ctx.fill();
  }
}
// the glacier: the low road (and the main ice) as solid runs between the crevasses, then each fork's high-road shelf
function glacierDrawTrack(st) {
  const c = st.c, cam = st.cam, Gc = GLACIER, xa = cam.x - 30, xb = cam.x + W + 30, bottom = cam.y + H + 20;
  const runs = (path, a, b) => {
    const out = [];
    let x = a;
    const holes = c.gaps[path].filter(g => g.x1 > a && g.x0 < b).sort((p, q) => p.x0 - q.x0);
    for (const g of holes) { if (g.x0 > x) out.push([x, Math.min(g.x0, b)]); x = Math.max(x, g.x1); }
    if (x < b) out.push([x, b]);
    return { out, holes };
  };
  const line = (path, a, b, dy, back) => {
    const pts = [];
    for (let x = a; x < b; x += 8) pts.push(x);
    pts.push(b);
    if (back) pts.reverse();
    for (const x of pts) ctx.lineTo(x - cam.x, glacierGY(st, path, x) + (typeof dy === 'function' ? dy(x) : dy) - cam.y);
  };
  // the ice canyon wall behind the low road inside a fork (the far side, paler)
  for (const fk of c.forks) {
    if (fk.x1 < xa || fk.x0 > xb) continue;
    const a = Math.max(fk.x0, xa), b = Math.min(fk.x1, xb);
    ctx.fillStyle = '#b8def3';
    ctx.beginPath(); ctx.moveTo(a - cam.x, glacierGY(st, 1, a) - cam.y); line(1, a, b, 0, false); line(0, a, b, 0, true); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2;
    for (let x = Math.ceil(a / 46) * 46; x < b; x += 46) {
      const y1 = glacierGY(st, 1, x) + 30, y2 = glacierGY(st, 0, x) - 10;
      if (y2 - y1 < 20) continue;
      ctx.beginPath(); ctx.moveTo(x - cam.x, y1 - cam.y); ctx.lineTo(x - cam.x + 6, y2 - cam.y); ctx.stroke();
    }
  }
  const { out, holes } = runs(0, xa, xb);
  for (const [a, b] of out) {
    ctx.fillStyle = '#93d3f3';
    ctx.beginPath(); ctx.moveTo(a - cam.x, bottom - cam.y); line(0, a, b, 0, false); ctx.lineTo(b - cam.x, bottom - cam.y); ctx.closePath(); ctx.fill();
    // ice layers
    for (const [d, col, lw] of [[34, 'rgba(255,255,255,0.35)', 4], [92, 'rgba(110,185,230,0.55)', 6], [170, 'rgba(110,185,230,0.45)', 10]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(a - cam.x, glacierGY(st, 0, a) + d - cam.y); line(0, a, b, d, false); ctx.stroke();
    }
    // snow on top
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = '#d6eefb'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(a - cam.x, glacierGY(st, 0, a) + 5 - cam.y); line(0, a, b, 5, false); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(a - cam.x, glacierGY(st, 0, a) + 2 - cam.y); line(0, a, b, 2, false); ctx.stroke();
    ctx.lineCap = 'butt';
  }
  for (const g of holes) glacierDrawCrevasse(st, g, bottom, false);
  // the high road: a thick ice shelf with icicles under it
  for (const fk of c.forks) {
    if (fk.x1 < xa || fk.x0 > xb) continue;
    const { out: rs, holes: hs } = runs(1, Math.max(fk.x0, xa), Math.min(fk.x1, xb));
    const th = x => Math.min(Gc.shelfTh, glacierForkOff(fk, x) * 0.55);
    for (const [a, b] of rs) {
      ctx.fillStyle = '#aee2fa';
      ctx.beginPath(); ctx.moveTo(a - cam.x, glacierGY(st, 1, a) - cam.y); line(1, a, b, 0, false); line(1, a, b, th, true); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#6fb8e2'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(a - cam.x, glacierGY(st, 1, a) + th(a) - cam.y); line(1, a, b, th, false); ctx.stroke();
      ctx.fillStyle = '#e6f8ff';
      for (let x = Math.ceil(a / 22) * 22; x < b - 6; x += 22) {
        const t = th(x);
        if (t < 18) continue;
        const y = glacierGY(st, 1, x) + t - cam.y, l = 8 + (hash(x, 5) % 9);
        ctx.beginPath(); ctx.moveTo(x - cam.x - 5, y - 1); ctx.lineTo(x - cam.x + 5, y - 1); ctx.lineTo(x - cam.x, y + l); ctx.closePath(); ctx.fill();
      }
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(a - cam.x, glacierGY(st, 1, a) + 2 - cam.y); line(1, a, b, 2, false); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    for (const g of hs) glacierDrawCrevasse(st, g, 0, true);
  }
}
// a crevasse: a deep blue crack with jagged walls and snowy lips (a gap in the shelf is just a break in the ice)
function glacierDrawCrevasse(st, g, bottom, shelf) {
  const cam = st.cam, p = g.path, a = g.x0, b = g.x1, ya = glacierGY(st, p, a), yb = glacierGY(st, p, b);
  if (!shelf) {
    if (!glacierCrevG) { glacierCrevG = ctx.createLinearGradient(0, 0, 0, 260); glacierCrevG.addColorStop(0, '#3d80c4'); glacierCrevG.addColorStop(1, '#1b3d6c'); }
    ctx.fillStyle = '#6fb3e3';
    ctx.beginPath(); ctx.moveTo(a - cam.x, ya - cam.y); ctx.lineTo(b - cam.x, yb - cam.y); ctx.lineTo(b - cam.x, bottom - cam.y); ctx.lineTo(a - cam.x, bottom - cam.y); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(0, Math.min(ya, yb) - cam.y);
    ctx.fillStyle = glacierCrevG;
    ctx.beginPath(); ctx.moveTo(a - cam.x, ya - Math.min(ya, yb));
    const depth = bottom - Math.min(ya, yb);
    for (let k = 1; k <= 6; k++) ctx.lineTo(a - cam.x + (k % 2 ? 9 : 2) + k * (b - a) * 0.04, (ya - Math.min(ya, yb)) + depth * k / 6);
    for (let k = 6; k >= 1; k--) ctx.lineTo(b - cam.x - (k % 2 ? 9 : 2) - k * (b - a) * 0.04, (yb - Math.min(ya, yb)) + depth * k / 6);
    ctx.lineTo(b - cam.x, yb - Math.min(ya, yb)); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#6aaee0'; ctx.lineWidth = 3;
    for (const [x, y, s] of [[a, ya, 1], [b, yb, -1]]) { ctx.beginPath(); ctx.moveTo(x - cam.x, y - cam.y + 6); ctx.lineTo(x - cam.x + 8 * s, y - cam.y + 30); ctx.lineTo(x - cam.x + 3 * s, y - cam.y + 58); ctx.lineTo(x - cam.x + 12 * s, y - cam.y + 90); ctx.stroke(); }
  }
  // snowy lips
  ctx.fillStyle = '#ffffff';
  for (const [x, y, s] of [[a, ya, 1], [b, yb, -1]]) { ctx.beginPath(); ctx.ellipse(x - cam.x - 2 * s, y - cam.y + 2, 9, 6, 0, 0, Math.PI * 2); ctx.fill(); }
}
// hop arrows before each crevasse, Mammo's gold snow (packed edges, bridges)
function glacierDrawMarks(st) {
  const c = st.c, cam = st.cam, f = st.f, t = G.clock;
  for (const p of [0, 1]) for (const g of c.gaps[p]) {
    if (g.ox1 < cam.x - 40 || g.ox0 > cam.x + W + 40) continue;
    if (p === 1 && !c.forks.some(fk => g.x0 >= fk.x0 && g.x0 <= fk.x1)) continue;
    const near = g.help < 2 && glacierPathAt(st, g.x0) === p && g.x0 - f.x < 520 && g.x0 - f.x > -20;
    if (g.help < 2) for (let k = 0; k < 4; k++) {
      const x = g.x0 - 18 - k * 34, y = glacierGY(st, p, x) + 1, a = near ? 0.65 + 0.35 * Math.sin(t * 10 - k * 1.2) : 0.45;
      ctx.save(); ctx.translate(x - cam.x, y - cam.y); ctx.rotate(Math.atan(glacierSlopeAt(st, p, x)));
      ctx.globalAlpha = a; ctx.fillStyle = g.wide ? '#ff8a3d' : '#2f86e8';
      ctx.beginPath(); ctx.moveTo(-9, -7); ctx.lineTo(0, -7); ctx.lineTo(9, 0); ctx.lineTo(0, 7); ctx.lineTo(-9, 7); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (g.help >= 1) {   // packed gold snow where the edges grew
      ctx.fillStyle = '#ffe8a3'; ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5;
      for (const [x0, x1] of [[g.ox0, g.x0], [g.x1, g.ox1]]) {
        if (x1 - x0 < 2) continue;
        const y0 = glacierGY(st, p, x0), y1 = glacierGY(st, p, x1);
        ctx.beginPath(); ctx.moveTo(x0 - cam.x, y0 - cam.y); ctx.lineTo(x1 - cam.x, y1 - cam.y); ctx.lineTo(x1 - cam.x - 6, y1 - cam.y + 46); ctx.lineTo(x0 - cam.x + 6, y0 - cam.y + 46); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    if (g.help >= 2) {   // a snow bridge
      const ya = glacierGY(st, p, g.x0) - cam.y, yb = glacierGY(st, p, g.x1) - cam.y, xa = g.x0 - cam.x - 6, xb = g.x1 - cam.x + 6;
      ctx.fillStyle = '#fff6d6'; ctx.strokeStyle = C.gold; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.lineTo(xb, yb + 12); ctx.quadraticCurveTo((xa + xb) / 2, (ya + yb) / 2 + 34, xa, ya + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,197,61,0.9)';
      for (let k = 0; k < 3; k++) { glacierStar(xa + (xb - xa) * (k + 0.5) / 3, (ya + yb) / 2 - 8 - Math.abs(Math.sin(t * 3 + k)) * 6, 4, 1.6, t + k); ctx.fill(); }
    }
    if (g.help >= 1) {   // Mammo the mammoth, who helped, waits by the far rim
      const mx = g.ox1 + 74;
      glacierMammoth(mx - cam.x, glacierGY(st, p, mx) - cam.y + 4, 0.42, -1, t, { toot: Math.sin(t * 2.2) > 0.4 });
    }
  }
}
function glacierDrawShadow(st) {
  const f = st.f;
  if (!f.air || f.state !== 'slide' && f.state !== 'crack') return;
  if (glacierHoleAt(st, f.path, f.x, false)) return;
  const gy = glacierGY(st, f.path, f.x), h = gy - f.y;
  ctx.fillStyle = 'rgba(40,90,140,' + clamp(0.28 - h / 400, 0.06, 0.28) + ')';
  ctx.beginPath(); ctx.ellipse(f.x - st.cam.x, gy - st.cam.y + 1, GLACIER.FL * 0.5 * clamp(1 - h / 300, 0.5, 1), 5, Math.atan(glacierSlopeAt(st, f.path, f.x)), 0, Math.PI * 2); ctx.fill();
}
function glacierDrawSigns(st) {
  const big = hudBig(), cam = st.cam;
  for (const s of st.c.signs) {
    const x = s.x - cam.x;
    if (x < -150 || x > W + 150) continue;
    const y = glacierGY(st, s.path, s.x) - cam.y + 4;
    ctx.fillStyle = '#8a5833'; ctx.fillRect(x - 3, y - 50, 6, 50);
    if (s.icon) {
      const col = s.icon === 'slow' ? '#3d8fe0' : s.icon === 'fast' ? '#ff7a2e' : '#c98b5a', bw = big ? 104 : 84, bh = big ? 48 : 40;
      ctx.fillStyle = col; rr(x - bw / 2, y - 50 - bh, bw, bh, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(28,26,54,0.35)'; ctx.lineWidth = 2; rr(x - bw / 2, y - 50 - bh, bw, bh, 8); ctx.stroke();
      if (s.icon === 'fork') {
        text('▲ high', x, y - 50 - bh * 0.7, big ? 16 : 13, '#ffffff', 'center', 'body');
        text('▼ low', x, y - 50 - bh * 0.28, big ? 16 : 13, '#ffffff', 'center', 'body');
      } else text(s.icon === 'slow' ? '◀◀ SLOW' : 'FAST ▶▶', x, y - 50 - bh / 2 + 1, big ? 18 : 15, '#ffffff', 'center');
    } else {
      ctx.font = '700 ' + (big ? 16 : 13) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const tw = ctx.measureText(s.text).width + 22, bh = big ? 32 : 26;
      ctx.fillStyle = '#e2b07a'; rr(x - tw / 2, y - 50 - bh, tw, bh, 7); ctx.fill();
      ctx.strokeStyle = '#8a5833'; ctx.lineWidth = 2.5; rr(x - tw / 2, y - 50 - bh, tw, bh, 7); ctx.stroke();
      ctx.fillStyle = '#ffffff'; rr(x - tw / 2 + 3, y - 50 - bh - 3, tw - 6, 6, 3); ctx.fill();
      text(s.text, x, y - 50 - bh / 2 + 1, big ? 16 : 13, '#5a3416', 'center', 'body');
    }
  }
}
// icicle arches: the legs behind the floe, the top with its icicles in front of it
function glacierDrawArches(st, front) {
  const cam = st.cam;
  for (const p of [0, 1]) for (const a of st.c.arches[p]) {
    if (a.x1 + 40 < cam.x || a.x0 - 40 > cam.x + W) continue;
    const g0 = glacierGY(st, p, a.x0), g1 = glacierGY(st, p, a.x1), sh = a.shake > 0 && !reduceMotion ? Math.sin(a.shake * 60) * 2 : 0;
    const X0 = a.x0 - cam.x + sh, X1 = a.x1 - cam.x + sh, Y0 = g0 - cam.y, Y1 = g1 - cam.y;
    if (!front) {
      ctx.fillStyle = '#a9dcf5';
      ctx.beginPath(); ctx.moveTo(X0 - 16, Y0 + 3); ctx.lineTo(X0 - 6, Y0 - 70); ctx.lineTo(X0 + 8, Y0 - 70); ctx.lineTo(X0 + 4, Y0 + 3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(X1 - 4, Y1 + 3); ctx.lineTo(X1 - 8, Y1 - 70); ctx.lineTo(X1 + 6, Y1 - 70); ctx.lineTo(X1 + 16, Y1 + 3); ctx.closePath(); ctx.fill();
      continue;
    }
    // the top: a thick curved band of ice, snow on top
    ctx.fillStyle = '#c8eeff'; ctx.strokeStyle = '#5faedd'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(X0 - 20, Y0 - 64); ctx.quadraticCurveTo((X0 + X1) / 2, (Y0 + Y1) / 2 - 116, X1 + 20, Y1 - 64);
    ctx.lineTo(X1 + 20, Y1 - 58); ctx.lineTo(X0 - 20, Y0 - 58); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(X0 - 22, Y0 - 66); ctx.quadraticCurveTo((X0 + X1) / 2, (Y0 + Y1) / 2 - 120, X1 + 22, Y1 - 66); ctx.quadraticCurveTo((X0 + X1) / 2, (Y0 + Y1) / 2 - 104, X0 - 22, Y0 - 66); ctx.fill();
    // icicles down to the "duck" line (archClear above the ice); broken ones are stumps
    for (let x = a.x0 - 12, k = 0; x <= a.x1 + 12; x += 13, k++) {
      const u = (x - a.x0) / (a.x1 - a.x0), gy = glacierGY(st, p, x), top = gy - 58, tip = gy - GLACIER.archClear - (k % 2 ? 6 : 0);
      const len = a.broken ? 4 + (k % 3) : tip - top;
      const sx = x - cam.x + sh, sy = top - cam.y;
      ctx.fillStyle = '#eafaff'; ctx.strokeStyle = '#8acdf0'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx - 5, sy); ctx.lineTo(sx + 5, sy); ctx.lineTo(sx + 0.5 * Math.sin(u * 9), sy + len); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
}
function glacierFlake(x, y, r, gold, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = gold ? 'rgba(255,214,90,0.35)' : 'rgba(255,255,255,0.45)'; circle(0, 0, r * 1.35); ctx.fill();
  ctx.strokeStyle = gold ? '#b9850f' : '#5aa9e6'; ctx.lineWidth = gold ? 5 : 4.5; ctx.lineCap = 'round';
  const arms = () => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, cx = Math.cos(a), sy = Math.sin(a); ctx.moveTo(0, 0); ctx.lineTo(cx * r, sy * r); ctx.moveTo(cx * r * 0.55 + sy * r * 0.22, sy * r * 0.55 - cx * r * 0.22); ctx.lineTo(cx * r * 0.75, sy * r * 0.75); ctx.lineTo(cx * r * 0.55 - sy * r * 0.22, sy * r * 0.55 + cx * r * 0.22); } ctx.stroke(); };
  arms();
  ctx.strokeStyle = gold ? C.gold : '#ffffff'; ctx.lineWidth = gold ? 2.6 : 2.2; arms();
  ctx.lineCap = 'butt';
  ctx.restore();
}
function glacierDrawFlakes(st) {
  const cam = st.cam, t = G.clock;
  for (const fl of st.c.flakes) {
    if (fl.got) continue;
    const x = fl.x - cam.x;
    if (x < -30 || x > W + 30) continue;
    const y = glacierGY(st, fl.path, fl.x) - fl.h - cam.y + Math.sin(t * 2.5 + fl.ph) * 3;
    glacierFlake(x, y, fl.gold ? 12 : 9, fl.gold, t * 0.8 + fl.ph);
    if (fl.gold) { ctx.fillStyle = '#ffffff'; const sp = (t * 1.3 + fl.ph) % 1; if (sp < 0.4) { glacierStar(x + 10, y - 10, 5 * Math.sin(sp / 0.4 * Math.PI), 1.5, 0); ctx.fill(); } }
  }
}
function glacierDrawCrack(st) {
  const c = st.c, cam = st.cam;
  if (!c.crack) return;
  const x = c.crack.x, y = glacierGY(st, 0, x);
  if (x - cam.x < -60 || x - cam.x > W + 60) return;
  // small cracks foreshadow it; once it goes, a big zigzag runs down through the ice
  const grow = st.crackT >= 0 ? clamp(st.crackT / 0.45, 0, 1) : 0;
  const pts = [[0, 0], [10, 24], [-6, 50], [12, 86], [-8, 128], [10, 176], [-4, 230], [8, 300]];
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1f4f86'; ctx.lineWidth = grow > 0 ? 7 : 3;
  ctx.beginPath();
  const n = grow > 0 ? Math.max(2, Math.ceil(pts.length * grow)) : 3;
  for (let i = 0; i < n; i++) { const [dx, dy] = pts[i]; if (i) ctx.lineTo(x + dx - cam.x, y + dy - cam.y); else ctx.moveTo(x + dx - cam.x, y + dy - cam.y); }
  ctx.stroke();
  if (grow > 0) {
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - cam.x - 40, y - cam.y + 1); ctx.lineTo(x - cam.x - 12, y - cam.y + 4); ctx.lineTo(x - cam.x + 14, y - cam.y - 1); ctx.lineTo(x - cam.x + 44, y - cam.y + 3); ctx.stroke();
  }
  ctx.lineJoin = 'miter';
}
// scenery on the ice: the history sign, pines, a mammoth, the sloth, the napping sabre-tooth cat, an owl
function glacierDrawDeco(st) {
  const cam = st.cam, t = G.clock, big = hudBig();
  for (const d of st.c.deco) {
    const x = d.x - cam.x;
    if (x < -220 || x > W + 220) continue;
    const y = glacierGY(st, d.path, d.x) - cam.y + 4;
    if (d.kind === 'tree') glacierPine(x, y, 1.15);
    else if (d.kind === 'hist') {
      ctx.fillStyle = '#8a5833'; ctx.fillRect(x - 40, y - 58, 7, 58); ctx.fillRect(x + 33, y - 58, 7, 58);
      const bw = big ? 230 : 190, bh = big ? 70 : 58;
      ctx.fillStyle = '#e2b07a'; rr(x - bw / 2, y - 58 - bh, bw, bh, 9); ctx.fill();
      ctx.strokeStyle = '#8a5833'; ctx.lineWidth = 3; rr(x - bw / 2, y - 58 - bh, bw, bh, 9); ctx.stroke();
      ctx.fillStyle = '#ffffff'; rr(x - bw / 2 + 4, y - 58 - bh - 4, bw - 8, 8, 4); ctx.fill();
      text('ICE AGE', x, y - 58 - bh * 0.64, big ? 28 : 24, '#5a3416', 'center');
      text('20,000 years ago', x, y - 58 - bh * 0.24, big ? 16 : 13, '#5a3416', 'center', 'body');
    // the animals by the track stand a little way back on the far side of the ice, so the floe slides past in front of them
    } else if (d.kind === 'mammoth') glacierMammoth(x, y - 18, 0.66, -1, t, { toot: Math.sin(t * 1.3 + d.x) > 0.55 });   // a friendly toot now and then
    else if (d.kind === 'owl') {
      ctx.fillStyle = '#8a5833'; ctx.fillRect(x - 3, y - 46, 6, 46);
      const by = y - 46, blink = Math.sin(t * 1.7 + d.x) > 0.96;
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#b8c7d6'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, by - 14, 13, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#dde8f2'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * 9, by - 26); ctx.lineTo(x + s * 13, by - 34); ctx.lineTo(x + s * 4, by - 28); ctx.fill(); }
      for (const s of [-1, 1]) { ctx.fillStyle = '#ffc53d'; circle(x + s * 5.5, by - 18, 4.5); ctx.fill(); ctx.fillStyle = C.ink; if (blink) ctx.fillRect(x + s * 5.5 - 3, by - 18.5, 6, 1.6); else { circle(x + s * 5.5, by - 18, 2); ctx.fill(); } }
      ctx.fillStyle = '#e8a23a'; ctx.beginPath(); ctx.moveTo(x - 2.5, by - 13); ctx.lineTo(x + 2.5, by - 13); ctx.lineTo(x, by - 8); ctx.fill();
    } else if (d.kind === 'sloth') glacierSloth(x, y, t);
    else if (d.kind === 'cat') { ctx.save(); ctx.translate(x, y - 16); ctx.scale(0.85, 0.85); glacierCat(0, 0, t); ctx.restore(); }
  }
}
// a friendly woolly mammoth (x, y = between the feet; s = size; dir 1 faces right)
function glacierMammoth(x, y, s, dir, t, o = {}) {
  ctx.save(); ctx.translate(x, y + (o.bob ? Math.abs(Math.sin(t * 3)) * -2 * s : 0)); ctx.scale(s * dir, s);
  const fur = o.fur || '#8b5a3c', dark = '#5e3a24', light = '#b07b55';
  // legs
  ctx.fillStyle = dark;
  for (const lx of [-38, -18, 14, 32]) { const sw = o.bob ? Math.sin(t * 6 + lx) * 3 : 0; rr(lx - 8 + sw, -34, 16, 34, 6); ctx.fill(); }
  // body
  ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(-4, -54, 54, 36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(-8, -40, 40, 14, 0, 0, Math.PI); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) { const fx = -44 + i * 15; ctx.beginPath(); ctx.moveTo(fx, -30); ctx.lineTo(fx + 3, -20); ctx.stroke(); }
  // tail
  ctx.beginPath(); ctx.moveTo(-56, -62); ctx.quadraticCurveTo(-68, -52, -64, -40); ctx.stroke();
  // head with a hump
  ctx.fillStyle = fur; circle(40, -74, 28); ctx.fill(); circle(30, -96, 16); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(22, -74, 10, 15, -0.3, 0, Math.PI * 2); ctx.fill();   // ear
  // trunk (swings; up when trumpeting)
  const sw = o.toot ? -1 : Math.sin(t * 2) * 0.3;
  ctx.strokeStyle = fur; ctx.lineWidth = 13;
  ctx.beginPath(); ctx.moveTo(60, -68);
  if (o.toot) ctx.bezierCurveTo(78, -78, 84, -104, 76, -122);
  else ctx.bezierCurveTo(72, -50, 70 + sw * 20, -26, 82 + sw * 14, -20);
  ctx.stroke();
  // tusks
  ctx.strokeStyle = '#fffbe9'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(56, -60); ctx.quadraticCurveTo(76, -38, 92, -54); ctx.stroke();
  ctx.lineCap = 'butt';
  // eye and a smile
  ctx.fillStyle = '#ffffff'; circle(48, -82, 6); ctx.fill();
  ctx.fillStyle = C.ink; circle(50, -82, 3.4); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(51, -84, 1.3); ctx.fill();
  ctx.fillStyle = 'rgba(255,140,150,0.5)'; circle(52, -70, 4); ctx.fill();
  ctx.restore();
  if (o.toot) {   // musical notes from the trunk
    for (let i = 0; i < 3; i++) {
      const u = ((t * 0.8 + i / 3) % 1), nx = x + dir * (76 + u * 30) * s, ny = y - 124 * s - u * 50;
      ctx.globalAlpha = 1 - u; text('♪', nx, ny, 22 * s + 6, '#ffffff', 'center'); ctx.globalAlpha = 1;
    }
  }
}
// a giant ground sloth hanging from a dead tree, waving
function glacierSloth(x, y, t) {
  ctx.strokeStyle = '#8c7a68'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y - 150); ctx.stroke();
  ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x - 3, y - 128); ctx.quadraticCurveTo(x + 40, y - 150, x + 86, y - 136); ctx.stroke();
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 4, y - 150); ctx.lineTo(x - 22, y - 172); ctx.moveTo(x + 50, y - 143); ctx.lineTo(x + 58, y - 162); ctx.stroke();
  ctx.fillStyle = '#ffffff'; rr(x + 20, y - 150, 50, 7, 3); ctx.fill();
  // the sloth hangs under the branch by one arm and waves with the other
  const bx = x + 58, by = y - 92, wave = Math.sin(t * 4) * 0.5;
  ctx.strokeStyle = '#9a8060'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(bx - 8, by - 26); ctx.lineTo(bx - 14, y - 138); ctx.stroke();
  ctx.save(); ctx.translate(bx + 12, by - 20); ctx.rotate(-1.2 + wave); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -30); ctx.stroke(); ctx.restore();
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#a58a68'; ctx.beginPath(); ctx.ellipse(bx, by, 22, 30, 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d8c4a4'; ctx.beginPath(); ctx.ellipse(bx + 2, by - 30, 14, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6a5440'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(bx + 2 + s * 6, by - 31, 4.5, 3, s * 0.4, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = C.ink; for (const s of [-1, 1]) { circle(bx + 2 + s * 6, by - 31, 1.8); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx + 2, by - 26, 4, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.fillStyle = '#4a3a2c'; circle(bx + 2, by - 27, 2); ctx.fill();
}
// a sabre-tooth cat napping on a rock (Zzz)
function glacierCat(x, y, t) {
  ctx.fillStyle = '#8d97a8'; ctx.beginPath(); ctx.ellipse(x, y - 14, 58, 26, 0, Math.PI, 0); ctx.lineTo(x + 58, y); ctx.lineTo(x - 58, y); ctx.fill();
  ctx.fillStyle = '#a6afbf'; ctx.beginPath(); ctx.ellipse(x - 14, y - 26, 26, 9, -0.2, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x - 4, y - 38, 44, 5, 0, Math.PI, 0); ctx.fill();
  const by = y - 46, br = Math.sin(t * 1.6) * 1.5;
  // tail, body, head
  ctx.strokeStyle = '#d99a50'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 34, by + 4); ctx.quadraticCurveTo(x - 58, by + 2, x - 50, by - 14); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = '#e8ad62'; ctx.beginPath(); ctx.ellipse(x - 6, by, 34, 14 + br, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b97a3a'; ctx.lineWidth = 3; for (const sx of [-22, -10, 2]) { ctx.beginPath(); ctx.moveTo(x + sx, by - 12); ctx.lineTo(x + sx + 4, by - 4); ctx.stroke(); }
  const hx = x + 30, hy = by - 4;
  ctx.fillStyle = '#e8ad62'; circle(hx, hy, 15); ctx.fill();
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + s * 6 - 5, hy - 10); ctx.lineTo(hx + s * 9, hy - 20); ctx.lineTo(hx + s * 12 + 2, hy - 8); ctx.fill(); }
  ctx.fillStyle = '#f6dcb4'; ctx.beginPath(); ctx.ellipse(hx + 4, hy + 4, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + s * 6, hy - 3, 3.2, 0.2, Math.PI - 0.2); ctx.stroke(); }
  ctx.fillStyle = '#ffffff'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + 4 + s * 3 - 1.6, hy + 6); ctx.lineTo(hx + 4 + s * 3 + 1.6, hy + 6); ctx.lineTo(hx + 4 + s * 3, hy + 15); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#d35a6a'; circle(hx + 4, hy + 2, 2); ctx.fill();
  for (let i = 0; i < 3; i++) {
    const u = (t * 0.45 + i / 3) % 1;
    ctx.globalAlpha = Math.sin(u * Math.PI); text('z', hx + 12 + u * 26 + i * 2, hy - 18 - u * 40, 12 + i * 4, '#ffffff', 'center');
  }
  ctx.globalAlpha = 1;
}
// the finish: a huge soft snowbank and the mammoth family cheering beside it
function glacierDrawFinish(st) {
  const c = st.c;
  if (!c.finish) return;
  const cam = st.cam, bx = c.finish.x, sx = bx - cam.x;
  if (sx < -400 || sx > W + 400) return;
  const gy = glacierGY(st, 0, bx + 40) - cam.y, t = G.clock, toot = !!st.fin;
  glacierMammoth(sx + 250, glacierGY(st, 0, bx + 250) - cam.y + 4, 1, -1, t, { toot });
  glacierMammoth(sx + 360, glacierGY(st, 0, bx + 360) - cam.y + 4, 0.92, -1, t + 1, { toot, fur: '#9a6644' });
  glacierMammoth(sx + 175, glacierGY(st, 0, bx + 175) - cam.y + 4, 0.5, -1, t + 2, { toot: toot && Math.sin(t * 3) > 0, fur: '#a8734d' });
  // the floe, nose-first in the bank, and the bunting poles (the bank covers their feet)
  if (st.fin) {
    const fx = bx - 92;
    ctx.save(); ctx.translate(fx - cam.x, glacierGY(st, 0, fx) - cam.y - 6); ctx.rotate(-0.42); glacierDrawFloeShape(GLACIER.FL, GLACIER.FT, st.f.dmg); ctx.restore();
  }
  ctx.fillStyle = '#8a5833'; ctx.fillRect(sx - 84, gy - 196, 5, 150); ctx.fillRect(sx + 122, gy - 196, 5, 160);
  ctx.fillStyle = '#ffffff'; circle(sx - 81.5, gy - 198, 5); ctx.fill(); circle(sx + 124.5, gy - 198, 5); ctx.fill();
  // the bank
  ctx.fillStyle = '#e4f4fd';
  ctx.beginPath(); ctx.moveTo(sx - 110, gy + 30); ctx.quadraticCurveTo(sx - 80, gy - 120, sx + 20, gy - 122); ctx.quadraticCurveTo(sx + 120, gy - 124, sx + 150, gy + 30); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(sx - 96, gy - 10); ctx.quadraticCurveTo(sx - 70, gy - 116, sx + 20, gy - 118); ctx.quadraticCurveTo(sx + 100, gy - 120, sx + 128, gy - 30); ctx.quadraticCurveTo(sx + 20, gy - 70, sx - 96, gy - 10); ctx.fill();
  // bunting
  ctx.strokeStyle = '#8a5833'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sx - 80, gy - 192); ctx.quadraticCurveTo(sx + 22, gy - 162, sx + 124, gy - 192); ctx.stroke();
  const cols = [C.pip, C.bo, C.gold, '#8fe3b0'];
  for (let i = 0; i < 9; i++) {
    const u = (i + 0.5) / 9, px = glacierLerp(sx - 80, sx + 124, u), py = gy - 192 + 15 * 4 * u * (1 - u) + 1;
    ctx.fillStyle = cols[i % 4]; ctx.beginPath(); ctx.moveTo(px - 7, py); ctx.lineTo(px + 7, py); ctx.lineTo(px, py + 14); ctx.closePath(); ctx.fill();
  }
  text('FINISH', sx + 22, gy - 216, hudBig() ? 26 : 22, '#5a3416', 'center');
}
function glacierDrawFloeShape(w, h, dmg) {
  ctx.fillStyle = '#7cc4ec'; rr(-w / 2, -h, w, h, 8); ctx.fill();
  ctx.fillStyle = '#bfeaff'; rr(-w / 2, -h, w, h - 6, 8); ctx.fill();
  ctx.fillStyle = '#ffffff'; rr(-w / 2 + 2, -h - 3, w - 4, 9, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; rr(-w / 2 + 10, -h + 9, w * 0.3, 4, 2); ctx.fill();
  ctx.fillStyle = 'rgba(79,159,214,0.25)'; for (const fx of [0.2, 0.55, 0.8]) { circle(-w / 2 + w * fx, -h + 15 + (fx * 10 % 4), 2); ctx.fill(); }   // (polish) bubbles in the ice
  ctx.strokeStyle = '#4f9fd6'; ctx.lineWidth = 2.5; rr(-w / 2, -h, w, h, 8); ctx.stroke();
  if (dmg > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.8;
    for (let k = 0; k < Math.min(3, dmg); k++) { const cx = -w / 2 + 24 + k * 36; ctx.beginPath(); ctx.moveTo(cx, -h + 3); ctx.lineTo(cx + 6, -h + 10); ctx.lineTo(cx + 1, -h + 16); ctx.stroke(); }
  }
}
// one player on the floe: drawn with the engine's drawPlayer (a copy at the origin), tilted with the floe
function glacierDrawRider(st, p, lean, duck) {
  const sy = 1 - 0.42 * duck, sx = 1 + 0.18 * duck;
  ctx.save(); ctx.rotate(lean);
  drawPlayer(Object.assign({}, p, { alive: true, x: -PW / 2, y: -PH, sx: p.sx * sx, sy: p.sy * sy, vy: 0, face: 1 }));
  ctx.restore();
}
function glacierDrawFloe(st) {
  const Gc = GLACIER, f = st.f, cam = st.cam, ps = G.players;
  if (f.state === 'split') {
    const sp = st.split;
    for (const h of sp.halves) { if (h.y - cam.y > H + 80) continue; ctx.save(); ctx.translate(h.x - cam.x, h.y - cam.y); ctx.rotate(h.r); ctx.translate(0, Gc.FT / 2); glacierDrawFloeShape(Gc.FL / 2 - 4, Gc.FT, 0); ctx.restore(); }
    const grow = clamp((sp.t - 0.55) / 0.3, 0, 1);
    if (grow > 0) {
      ctx.save(); ctx.translate(sp.nx - cam.x, sp.ny - cam.y); ctx.rotate(sp.a); ctx.scale(0.6 + 0.4 * grow + 0.12 * Math.sin(grow * Math.PI), grow);
      glacierDrawFloeShape(Gc.FL, Gc.FT, 0); ctx.restore();
    }
    for (const p of ps) { ctx.save(); ctx.translate(p.x + PW / 2, p.y + PH); glacierDrawRider(st, p, Math.sin(clamp((sp.t - 0.12) / 0.93, 0, 1) * Math.PI) * 0.9 * (p.id === st.steer ? 1 : -1), 0); ctx.restore(); }
    return;
  }
  if (f.state === 'finish') {
    const fin = st.fin, u = clamp(fin.t / 0.7, 0, 1);
    for (const p of ps) {
      const hop = u >= 1 ? Math.abs(Math.sin((fin.t - 0.7) * 7 + p.id * 1.5)) * 14 : 0;
      ctx.save(); ctx.translate(p.x + PW / 2, p.y + PH - hop); glacierDrawRider(st, p, 0, 0); ctx.restore();
    }
    return;
  }
  const sx = f.x - cam.x, sy = f.y - cam.y;
  if (sx < -200 || sx > W + 200) return;
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(f.tilt + (f.state === 'fall' ? f.tumble * 0.35 : 0));
  if (f.spin > 0) {
    const u = 1 - f.spin / Gc.spinT, a = reduceMotion ? Math.sin(u * Math.PI * 4) * 0.12 * (1 - u) : f.spinDir * Math.PI * 2 * (1 - Math.pow(1 - u, 2.2));
    ctx.translate(0, -30); ctx.rotate(a); ctx.translate(0, 30);
  }
  if (f.appear > 0) { const u = 1 - f.appear / 0.45, s = 0.4 + 0.6 * u + 0.15 * Math.sin(u * Math.PI); ctx.translate(0, -20); ctx.scale(s, s); ctx.translate(0, 20); }
  // the steerer's pole: pushing strokes, digging in to brake, or held up
  const S = ps[st.steer], Hp = ps[st.hop], hx = Gc.seatX[0] - 6, hy = -Gc.FT - 15;
  let tipX, tipY;
  if (f.leanIn > 0 && !f.air) { const ph = (G.clock * 3.2) % 1; tipX = -Gc.FL / 2 - 34 + ph * 30; tipY = 3; }
  else if (f.leanIn < 0 && !f.air) { tipX = -Gc.FL / 2 + 4; tipY = 6; }
  else { tipX = -Gc.FL / 2 - 22; tipY = -Gc.FT - 52; }
  ctx.strokeStyle = '#8a5833'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hx + 18, hy - 8); ctx.lineTo(tipX, tipY); ctx.stroke();
  ctx.strokeStyle = '#c98b5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx + 18, hy - 8); ctx.lineTo(tipX, tipY); ctx.stroke();
  ctx.lineCap = 'butt';
  glacierDrawFloeShape(Gc.FL, Gc.FT, f.dmg);
  // riders: the steerer leans with the push / brake, the hopper ducks you both
  for (const p of [S, Hp]) {
    ctx.save(); ctx.translate(Gc.seatX[p.id === st.steer ? 0 : 1], -Gc.FT + 1);
    glacierDrawRider(st, p, p.id === st.steer ? f.lean * 0.24 : 0, f.duck);
    ctx.restore();
  }
  ctx.restore();
  // speed streaks at FAST
  if (f.v >= Gc.fastMin && !f.air && f.state === 'slide') {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const ph = (G.clock * 4 + i * 0.27) % 1, lx = sx - Gc.FL / 2 - 20 - ph * 90, ly = sy - 16 - i * 13;
      ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - 26, ly); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  }
}

/* ---------- HUD: time and snowflakes, each job's panel on its player's side, prompts and hints over the heads ---------- */
function glacierNeeds(st) {
  const Gc = GLACIER, f = st.f, out = { speed: null, hop: false, duck: false, hopNow: false, fork: null };
  if (f.state !== 'slide') return out;
  const ahead = glacierAhead(st, Math.max(520, f.v * Gc.sayFast) + 10);
  for (const h of ahead) {
    const d = h.x0 - f.x;
    if (!out.speed && h.kind === 'mog' && !h.done && h.x1 > f.x) out.speed = { need: 'slow', d, h };
    if (!out.speed && h.kind === 'gap' && h.wide && h.help < 2 && d > -20) out.speed = { need: 'fast', d, h };
    if (h.kind === 'gap' && h.help < 2 && d > -Gc.coyote && d < f.v * Gc.sayHop + 20 && !out.hop) { out.hop = true; out.hopNow = d <= Math.max(Gc.zone, f.v * Gc.zoneT); out.hopD = d; }
    if (h.kind === 'arch' && !h.broken && !h.done && d < f.v * Gc.sayDuck + 40 && !out.duck) { out.duck = true; out.duckNow = d < f.v * 0.45 + 40; }
  }
  out.fork = glacierForkNear(st);
  return out;
}
function glacierHud(st) {
  const Gc = GLACIER, f = st.f, big = hudBig(), ps = G.players, play = G.mode === 'play' || G.mode === 'paused';
  // top right: the clock and the snowflakes
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = String(st.stats.flakes);
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.3, gap = fs;
    const w = tw + gap + icon + fs * 0.4 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, C.paper, 'left', 'body');
    glacierFlake(x0 + 15 + tw + gap + icon / 2, cy, fs * 0.5, false, 0.3);
    text(n, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, '#c8f1ff', 'left', 'body');
    timeX0 = x0;
  }
  if (!play || !f) return;
  const nd = glacierNeeds(st), z = big ? 1.4 : 1, t = G.clock;
  // the job panels, bottom corners: Pip's on the left, Bo's on the right
  const steerId = f.state === 'split' && st.split.landed ? st.hop : st.steer;   // the panels swap with the seats
  for (const id of [0, 1]) {
    const steer = id === steerId, pw = Math.round((steer ? 262 : 222) * z), ph = Math.round(56 * z), py = H - ph - 10;
    const px = id === 0 ? 12 : W - 12 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const cpuSeat = glacierQuiet(id);   // 1-player mode: the computer's panel names no keys
    text(NAMES[id] + (steer ? ' steers' : ' hops') + (cpuSeat ? ' (computer)' : ''), px + 12 * z, py + 15 * z, 15 * z, PCOL[id], 'left');
    if (steer) {
      if (!cpuSeat) text(glacierKey(id, 'left') + ' slow · ' + glacierKey(id, 'right') + ' fast', px + pw - 12 * z, py + 15 * z, 11 * z, '#d9d3ef', 'right', 'body');
      const bx = px + 12 * z, bw = pw - 24 * z, by = py + 30 * z, bh = 16 * z, X = v => bx + bw * clamp(v / 380, 0, 1);
      const zones = [[0, Gc.slowMax, '#5aa9e6', 'SLOW', 'slow'], [Gc.slowMax, Gc.fastMin, '#e8f4ff', 'OK', null], [Gc.fastMin, 380, '#ff8a3d', 'FAST', 'fast']];
      for (const [a, b, col, , key] of zones) {
        const want = nd.speed && nd.speed.need === key;
        ctx.fillStyle = col; ctx.globalAlpha = want ? 1 : 0.55; rr(X(a) + 1, by, X(b) - X(a) - 2, bh, bh / 2); ctx.fill(); ctx.globalAlpha = 1;
        if (want) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5 + 1.5 * Math.abs(Math.sin(t * 8)); rr(X(a) - 1, by - 2, X(b) - X(a) + 2, bh + 4, bh / 2 + 2); ctx.stroke(); }
      }
      // the speed needle, then the zone words on top of it (so it never hides "OK"), then its pointer
      const mx = X(f.v);
      ctx.fillStyle = PCOL[id]; ctx.fillRect(mx - 1.5, by - 2, 3, bh + 4);
      for (const [a, b, , lab, key] of zones) text(lab, (X(a) + X(b)) / 2, by + bh / 2 + 0.5, 10 * z, key ? '#ffffff' : '#3a4a66', 'center', 'body');
      ctx.fillStyle = PCOL[id]; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx, by + bh + 1); ctx.lineTo(mx - 6 * z, by + bh + 8 * z); ctx.lineTo(mx + 6 * z, by + bh + 8 * z); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      const chips = [['hop', 'HOP', nd.hop, nd.hopNow], ['duck', 'DUCK', nd.duck, nd.duckNow]];
      const cw = (pw - 34 * z) / 2;
      chips.forEach(([k, lab, on, now], i) => {
        const cx = px + 12 * z + i * (cw + 10 * z), cy = py + 26 * z, chh = 24 * z;
        ctx.fillStyle = on ? (now && Math.sin(t * 14) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : 'rgba(255,255,255,0.12)';
        rr(cx, cy, cw, chh, chh / 2); ctx.fill();
        text((cpuSeat ? '' : glacierKey(id, k) + ' ') + lab, cx + cw / 2, cy + chh / 2 + 0.5, 13 * z, on ? C.ink : '#d9d3ef', 'center', 'body');
      });
    }
  }
  // the message line (gold help, "chilly"): in the top row between the level pill and the clock when it fits there,
  // otherwise centred under the room pill (phones, where the HUD is bigger)
  if (st.msg) {
    let fs = big ? 20 : 14;
    const h = big ? 32 : 26, font = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.font = font(14);
    const left = 14 + ctx.measureText(levelCode(G.levelIndex) + ' · ' + G.level.def.name).width + 28 + 10, right = timeX0 - 10;
    ctx.font = font(fs);
    let w = ctx.measureText(st.msg.text).width + 30, cx = W / 2 + 40, y = 12;
    if (w <= right - left) cx = clamp(cx, left + w / 2, right - w / 2);
    else {
      cx = W / 2; y = 80;
      while (w > W - 40 && fs > 11) { fs--; ctx.font = font(fs); w = ctx.measureText(st.msg.text).width + 30; }
    }
    ctx.globalAlpha = clamp((st.msg.life - st.msg.t) / 0.3, 0, 1);
    pill(cx, y, w, h, 'center'); text(st.msg.text, cx, y + h / 2 + 0.5, fs, st.msg.col, 'center', 'body'); ctx.globalAlpha = 1;
  }
  if (G.introT > 0) return;
  // prompts over the heads: the steerer's open to the left, the hopper's to the right, so they never overlap
  const S = ps[st.steer], Hp = ps[st.hop], fs = 14 * z;
  const yMax = H - Math.round(56 * z) - 18;   // above the job panels, even while the floe tips into a crevasse
  const say = (p, str, col, left, lift, pulse) => {
    if (glacierQuiet(p.id)) return 0;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, hx = p.x + PW / 2, y = clamp(p.y - 12 * z - lift - h, 4, yMax - lift - h);
    let x = left ? hx + 14 * z - w : hx - 14 * z;
    x = clamp(x, 4, W - w - 4);
    const s = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, col, 'center', 'body');
    ctx.restore();
    return h + 6;
  };
  const bubble = (p, str, left, lift) => {
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 22 * z, h = fs + 14 * z, hx = p.x + PW / 2, y = clamp(p.y - 12 * z - lift - h, 4, yMax - lift - h);
    const x = clamp(left ? hx + 18 * z - w : hx - 18 * z, 4, W - w - 4);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[p.id]; ctx.lineWidth = 2.5;
    rr(x, y, w, h, h / 2); ctx.fill(); ctx.stroke();
    text(str, x + w / 2, y + h / 2 + 0.5, fs, C.ink, 'center', 'body');
  };
  let liftS = 0, liftH = 0;
  if (f.state === 'slide' && !st.afk) {
    if (nd.fork) {
      const ch = st.forkChoice[nd.fork.i];
      const hi = glacierKey(S.id, 'up') + (ch ? ' HIGH ✓' : ' high'), lo = glacierKey(S.id, 'down') + (ch ? ' low' : ' LOW ✓');
      liftS += say(S, hi + '  ·  ' + lo, '#ffe28a', true, liftS, false);
    } else if (nd.speed && nd.speed.d < f.v * Gc.sayFast) {
      const sp = nd.speed;
      if (sp.need === 'slow') liftS += f.v > Gc.slowMax ? say(S, glacierKey(S.id, 'left') + ' Slow down!', '#8fd3ff', true, liftS, sp.d < f.v * 1.2) : say(S, 'Good! Stay slow', '#8fe3b0', true, liftS, false);
      else liftS += f.v < Gc.fastMin ? say(S, 'Faster! ' + glacierKey(S.id, 'right'), '#ffb347', true, liftS, sp.d < f.v * 1.2) : say(S, 'Good speed!', '#8fe3b0', true, liftS, false);
    }
    if (nd.duck) liftH += say(Hp, 'DUCK! ' + glacierKey(Hp.id, 'duck'), '#bfeaff', false, liftH, nd.duckNow);
    else if (nd.hop && !f.air) liftH += say(Hp, 'HOP! ' + glacierKey(Hp.id, 'hop'), C.gold, false, liftH, nd.hopNow);
  }
  if (f.state === 'wait' && st.hints[st.steer] == null && st.waitT > 0) liftS += say(S, 'Push off! ' + glacierKey(S.id, 'right'), '#ffb347', true, liftS, true);
  for (const p of ps) {
    const h = st.hints[p.id];
    if (!h || !p.alive) continue;
    bubble(p, h.text, p.id === st.steer, p.id === st.steer ? liftS : liftH);
  }
}

/* ---------- sounds ---------- */
Sfx.extra.glacierPush = function () { this.tone(220, 0.25, 'triangle', 0.05, 440); this.tone(660, 0.12, 'sine', 0.03, 990, 0.12); };
Sfx.extra.glacierHop = function (p) { this.tone(300 * p, 0.16, 'sine', 0.07, 760 * p); this.tone(600 * p, 0.06, 'triangle', 0.025, null, 0.02); };
Sfx.extra.glacierLand = function () { this.tone(150, 0.08, 'triangle', 0.06, 80); this.tone(900, 0.05, 'sawtooth', 0.008, 300); };
Sfx.extra.glacierDuck = function (p) { this.tone(520 * p, 0.09, 'triangle', 0.035, 300 * p); };
Sfx.extra.glacierFlake = function () { const n = Math.min(12, (G.mst && G.mst.streak) || 0); this.tone(1319 * Math.pow(2, n / 12), 0.08, 'triangle', 0.04); this.tone(2637 * Math.pow(2, n / 12), 0.06, 'sine', 0.015, null, 0.03); };
Sfx.extra.glacierGold = function () { [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.05)); };
Sfx.extra.glacierGood = function () { this.tone(880, 0.08, 'triangle', 0.045); this.tone(1175, 0.1, 'triangle', 0.04, null, 0.06); };
Sfx.extra.glacierBig = function () { this.tone(330, 0.3, 'sawtooth', 0.02, 990); [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, 0.1 + i * 0.06)); };
Sfx.extra.glacierBonk = function () { this.tone(330, 0.06, 'triangle', 0.07, 200); this.tone(160, 0.18, 'square', 0.04, 90, 0.03); };
Sfx.extra.glacierBrrr = function () { for (let i = 0; i < 7; i++) this.tone(i % 2 ? 470 : 540, 0.045, 'square', 0.022, null, 0.1 + i * 0.045); };
Sfx.extra.glacierOops = function () { this.tone(760, 0.55, 'sine', 0.06, 180); };
Sfx.extra.glacierPop = function () { this.tone(180, 0.12, 'sine', 0.08, 900); this.tone(1200, 0.08, 'triangle', 0.035, null, 0.08); };
Sfx.extra.glacierCrack = function () { this.tone(2200, 0.05, 'square', 0.05, 400); this.tone(160, 0.45, 'sawtooth', 0.05, 50, 0.02); [0.1, 0.18, 0.27].forEach((d, i) => this.tone(1400 - i * 300, 0.04, 'square', 0.03, 300, d)); };
Sfx.extra.glacierSplit = function () { this.play('crumble'); this.tone(300, 0.4, 'sine', 0.05, 1100, 0.1); };
Sfx.extra.glacierSwap = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.glacierFast = function () { this.tone(300, 0.2, 'sawtooth', 0.02, 640); };
Sfx.extra.glacierSlow = function () { this.tone(500, 0.16, 'triangle', 0.03, 330); };
Sfx.extra.glacierScrape = function () { this.tone(420, 0.12, 'sawtooth', 0.012, 260); };
Sfx.extra.glacierFork = function (p) { this.tone(660 * p, 0.05, 'square', 0.035); this.tone(990 * p, 0.06, 'triangle', 0.03, null, 0.04); };
Sfx.extra.glacierHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.glacierTrumpet = function () { this.tone(233, 0.35, 'sawtooth', 0.045, 466); this.tone(349, 0.4, 'sawtooth', 0.035, 698, 0.3); };
Sfx.extra.glacierPoof = function () { this.tone(320, 0.35, 'triangle', 0.07, 70); this.tone(1100, 0.25, 'sawtooth', 0.01, 200); };
Sfx.extra.glacierTink = function () { [2093, 2637, 3136, 2349].forEach((f, i) => this.tone(f, 0.07, 'triangle', 0.035, null, i * 0.04)); };
/* ===== end of MODES.glacier ===== */
