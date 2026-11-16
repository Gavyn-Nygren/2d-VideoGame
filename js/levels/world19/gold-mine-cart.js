/* Pip & Bo - Level 19-3 Gold Mine Cart (team, World 19 Tumbleweed Gulch). */
'use strict';

/* ===== 19-3 Gold Mine Cart (mode 'minecart', World 19 "Tumbleweed Gulch", team) =====
   A wild ride through a friendly gold mine, seen from the side. Pip and Bo ride ONE mine cart that rolls right on its
   own (gentle base speed, faster down slopes, slower up them); the camera scrolls with it. The mode owns the tick, the
   camera, the whole picture and the HUD (def.ownStep + def.ownHUD); the engine grid is empty apart from the two spawns.
   The RIDER (front seat): ▲ hops the whole cart (hold for a bigger hop) over gaps in the rails and rocks on the track,
   ▼ ducks the crew under low beams and waterfalls, and the action (grab) grabs a dangling gold lantern (else it rings
   the cart bell).
   The SWITCHER (back seat, the big lever): ▲ / ▼ set the lever up or down. The lever stays where it is put, and at each
   FORK the cart takes the upper or lower track the lever points to (an arrow on the switch stand shows it). A sign
   before every fork tells which way: a gold nugget (gold that way), a boarded X (dead end), a beam or a puddle (a
   bumpier way), two signs to compare (more gold), or a lantern (the good way has a lit lantern at its mouth). The
   action (or ◀) is the brake: hold it down steep slopes, or the cart takes the bend too fast ("Whoa!").
   Jobs swap at the station at the end of every stretch: Pip rides stretches 1 and 3, Bo rides 2 and 4.
   Nobody can do it alone: a lever nobody moves always meets a dead end on its side (every stretch has dead ends up and
   down), and a gap nobody jumps sends the cart back every time.
   Soft fails only: a dead end bumps a soft hay buffer ("Whoops! Dead end!"), a missed gap drops the cart into a rope
   safety net (or onto a sand pile by the lower track), and Mabel the mine mule trots over and pulls the cart back to a
   spot it rode through before the fork's sign or the gap (minecartSafeBack: always with a run-up before the next gap). A
   beam or a rock is a "Bonk!": the cart stops a moment, hats fly off, the beam swings up out of the way. A waterfall
   you don't duck is a "Splash!" that slows you.
   Gold help (announced): after 2 dead ends in a row the signs glow gold with a big gold arrow for the rest of the
   stretch; after 2 missed jumps at one gap (that the rider tried), that gap gets a gold spring plate (any hop on it
   clears the gap).
   Stretch 4 (Mother Lode) is dark: only the cart lantern lights the way. Then the cart bursts out into the sunset and
   stops at the assay office, where the gold is weighed. Confetti!
   Room def: { title, rider: 0|1, look, dark, tip, act, course: [tokens] }. Course tokens (lengths in px):
     fN  track for N px          uN dN  gentle up / down for N px     DN  a steep slope down (a SLOW sign and a bend)
     gN  a gap in the rails N px wide      r  a rock on the rails      b  a low beam (duck)     c  a waterfall (duck)
     wN  a shallow water ford N px        n / nH  a gold nugget (H px above the rails)    N  three nuggets in a row
     aN  an arc of nuggets over the next N px (a hop's arc)    l  a dangling gold lantern (grab)    F  a checkpoint
     S:text  a wall sign ({R} = the rider's name, {W} = the switcher's)
     { up: [...], down: [...], dead: 'u'|'d', sign: 'plain'|'xonly'|'both'|'count'|'lantern', good: 'u'|'d' }  a fork
     X  the swap station (stretch end)     E  the way out into daylight and the assay office (the finish)
   Every global is prefixed minecart / MINECART (and Sfx.extra.minecart*); all state lives in G.mst. */
const MINECART = {
  R: 260, H: 125,                               // a fork's ramp length and how far the branches go up / down
  cruise: 240, kDrive: 1.2, gEff: 330, vMin: 60, vMax: 440, brakeDec: 520, brakeMin: 140, fordMax: 150,
  hopV: 430, g: 980, holdK: 0.62, coyote: 16, springZone: 230, springLand: 50,
  duckRate: 9, duckOK: 0.6, bendMax: 300, bonkT: 0.95, wobbleT: 1.1,
  half: 44, wheelX: 30, wheelR: 10, seat: [18, -18],
  signAhead: 520, countAhead: [780, 500], lanternAt: 170, viewDark: 470, viewLit: 640,
  oopsT: 3.0, runUp: 340, swapT: 2.0, finT: 5.4, hintLife: 2.8, tryWin: 5, helpWrong: 2, helpMiss: 2,
  camLead: 330, camY: 300,
};
const minecartLerp = (a, b, u) => a + (b - a) * u;
const minecartSmooth = u => u * u * (3 - 2 * u);

/* ---------- the course: tokens -> base heights (2 px steps), forks, hazards, gold ---------- */
function minecartCompile(def) {
  const M = MINECART, X0 = -700, rid = def.rider || 0;
  const name = s => s.replace(/\{R\}/g, NAMES[rid]).replace(/\{W\}/g, NAMES[1 - rid]);
  const c = { x0: X0, forks: [], gaps: [], rocks: [], beams: [], curtains: [], fords: [], gold: [], lanterns: [], bends: [],
    signs: [], flags: [], station: null, exit: null, len: 0 };
  const ys = [];
  let x = X0, y = 0;
  const seg = (len, fn) => { len = Math.max(2, Math.round(len / 2) * 2); for (let k = 0; k < len; k += 2) ys.push(fn(k, len)); x += len; return len; };
  seg(-X0, () => y);
  // the things on one track (the main line, or one branch of a fork); returns where that track got to
  const walk = (toks, lane, fork, bx) => {
    let at = bx;
    for (const tk of toks) {
      if (tk && typeof tk === 'object') continue;   // (no forks inside forks)
      const t = String(tk), ch = t[0];
      if (t[1] === ':') { if (ch === 'S' && lane === 'm') c.signs.push({ x: at, kind: 'wall', text: name(t.slice(2)) }); continue; }
      const n = parseInt(t.slice(1), 10) || 0;
      const o = { lane, fork };
      if (ch === 'f') { if (lane === 'm') seg(n, () => y); at += n; }
      else if ((ch === 'u' || ch === 'd') && lane === 'm') { const y0 = y, s = ch === 'u' ? -0.12 : 0.12; const len = seg(n, (k, L) => y0 + s * L * (k / L - Math.sin(2 * Math.PI * k / L) / (2 * Math.PI))); y = y0 + s * len; at += len; }
      else if (ch === 'D' && lane === 'm') {
        const y0 = y, s = 0.34, Bl = 60;
        const len = seg(n, (k, L) => y0 + s * (k < Bl ? k * k / (2 * Bl) : k < L - Bl ? k - Bl / 2 : (L - Bl) - (L - k) * (L - k) / (2 * Bl)));
        y = y0 + s * (len - Bl);
        c.signs.push({ x: at - 380, kind: 'slow' });
        c.bends.push({ x: at + len + 20, hit: false, x0: at });
        at += len;
      }
      else if (ch === 'g') { c.gaps.push(Object.assign(o, { x0: at, x1: at + n, misses: 0, spring: false, falls: 0 })); if (lane === 'm') seg(n, () => y); at += n; }
      else if (ch === 'w') { c.fords.push(Object.assign(o, { x0: at, x1: at + n })); if (lane === 'm') seg(n, () => y); at += n; }
      else if (ch === 'r') c.rocks.push(Object.assign(o, { x: at, gone: 0 }));
      else if (ch === 'b') c.beams.push(Object.assign(o, { x: at, hit: 0 }));
      else if (ch === 'c') c.curtains.push(Object.assign(o, { x: at, wet: false }));
      else if (ch === 'n') c.gold.push(Object.assign(o, { x: at, h: n, got: 0 }));
      else if (ch === 'N') for (let k = 0; k < 3; k++) c.gold.push({ lane, fork, x: at + k * 40, h: 0, got: 0 });
      else if (ch === 'a') for (let k = 0; k < 5; k++) { const u = k / 4; c.gold.push({ lane, fork, x: at - 30 + u * (n + 60), h: 10 + 72 * 4 * u * (1 - u), got: 0 }); }
      else if (ch === 'l') c.lanterns.push(Object.assign(o, { x: at, got: 0 }));
      else if (ch === 'F' && lane === 'm') c.flags.push({ x: at, on: false, t: 0 });
      else if (ch === 'X' && lane === 'm') { c.station = { x: at + 260 }; seg(1000, () => y); at += 1000; }
      else if (ch === 'E' && lane === 'm') { c.exit = { x: at + 200, office: at + 1150 }; seg(2000, () => y); at += 2000; }
    }
    return at;
  };
  for (const tk of def.course || []) {
    if (tk && typeof tk === 'object') {
      const fk = { i: c.forks.length, x0: x, x1: 0, dead: tk.dead || null, sign: tk.sign || 'plain', good: tk.good || null, deadEnd: 0,
        restart: 0, taken: null, signX: [], gold: { u: 0, d: 0 } };
      c.forks.push(fk);
      const xu = walk(tk.up || [], 'u', fk, x + M.R), xd = walk(tk.down || [], 'd', fk, x + M.R);
      if (fk.dead) {
        const de = (fk.dead === 'u' ? xu : xd) + 140, alive = fk.dead === 'u' ? xd : xu;
        fk.deadEnd = de; fk.x1 = Math.max(alive, de + 200) + M.R;
      } else fk.x1 = Math.max(xu, xd) + M.R;
      for (const g of c.gold) if (g.fork === fk) fk.gold[g.lane]++;
      for (const l of c.lanterns) if (l.fork === fk) fk.gold[l.lane] += 3;
      if (!fk.good) fk.good = fk.dead ? (fk.dead === 'u' ? 'd' : 'u') : fk.gold.u >= fk.gold.d ? 'u' : 'd';
      if (fk.sign === 'count') fk.signX = [x - M.countAhead[0], x - M.countAhead[1]];
      else fk.signX = [x - M.signAhead];
      for (const sx of fk.signX) c.signs.push({ x: sx, kind: 'fork', fork: fk, part: fk.signX.indexOf(sx) });
      fk.restart = Math.min(...fk.signX) - 170;
      seg(fk.x1 - x, () => y);
      continue;
    }
    // one main-line token at a time (walk keeps the base heights going)
    x = walk([tk], 'm', null, x);
  }
  seg(1400, () => y);
  c.gy = Float32Array.from(ys);
  c.len = x;
  // a fork's dead end should not restart the cart inside the fork before it
  c.forks.forEach((fk, i) => { const prev = c.forks[i - 1]; if (prev) fk.restart = Math.max(fk.restart, prev.x1 + 30); });
  c.goldTotal = c.gold.length + c.lanterns.length * 3;
  // the most gold one ride can get: everything on the main line, plus the richer open track at each fork
  c.goldMax = c.gold.filter(g => g.lane === 'm').length + c.lanterns.filter(l => l.lane === 'm').length * 3 +
    c.forks.reduce((n, fk) => n + Math.max(...['u', 'd'].filter(ln => ln !== fk.dead).map(ln => fk.gold[ln])), 0);
  return c;
}
// the base (main line) height under x
function minecartBase(st, x) {
  const c = st.c, a = c.gy, f = (x - c.x0) / 2, i = Math.floor(f);
  return i < 0 ? a[0] : i >= a.length - 1 ? a[a.length - 1] : a[i] + (a[i + 1] - a[i]) * (f - i);
}
// how far a branch of fork fk is above (-) or below (+) the main line at x
function minecartOff(fk, lane, x) {
  const M = MINECART;
  if (!fk || lane === 'm' || x <= fk.x0) return 0;
  const dead = fk.dead === lane;
  if (!dead && x >= fk.x1) return 0;
  let u = x < fk.x0 + M.R ? (x - fk.x0) / M.R : !dead && x > fk.x1 - M.R ? (fk.x1 - x) / M.R : 1;
  u = minecartSmooth(clamp(u, 0, 1));
  return (lane === 'u' ? -1 : 1) * M.H * u;
}
// the rail height of a track at x (fords dip the rails into the water)
function minecartRail(st, lane, fk, x) {
  let y = minecartBase(st, x) + minecartOff(fk, lane, x);
  for (const w of st.c.fords) if (w.lane === lane && w.fork === fk && x > w.x0 && x < w.x1) y += 18 * Math.sin(Math.PI * (x - w.x0) / (w.x1 - w.x0));
  return y;
}
const minecartForkAt = (st, x) => st.c.forks.find(f => x > f.x0 && x < Math.max(f.x1, f.deadEnd)) || null;
const minecartLeverLane = st => (st.lever === 'up' ? 'u' : 'd');
// is a thing on the track the cart will run along? (a branch ahead counts when the lever points to it)
function minecartOnPath(st, o) {
  const cart = st.cart;
  if (o.lane === 'm') return true;
  if (cart.fork === o.fork) return cart.lane === o.lane;
  return o.fork.x0 > cart.x && minecartLeverLane(st) === o.lane;
}
const minecartCartRail = st => minecartRail(st, st.cart.lane, st.cart.fork, st.cart.x);
// the rail height at x on the track the cart is on or last took there (for Mabel, who walks behind the cart)
function minecartRailGuess(st, x) {
  const fk = minecartForkAt(st, x), cart = st.cart;
  if (!fk) return minecartRail(st, 'm', null, x);
  const lane = cart.fork === fk ? cart.lane : fk.taken || (fk.dead === 'u' ? 'd' : 'u');
  return minecartRail(st, lane, fk, x);
}

// each player's own keys, for prompts and the HUD (a player with a controller is shown its buttons)
function minecartKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'up') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'down') return pad ? '▼' : touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
  if (what === 'lever') return pad ? '▲▼' : touch ? '▲ ▼' : id === 0 ? 'W S' : '↑ ↓';
  return '';
}
// 1-player mode: the computer's own job gets no key hints or prompts (it knows its job)
const minecartQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

/* ---------- a stretch ---------- */
function minecartRoom(st, L, k) {
  const def = L.def;
  st.k = k; st.rider = def.rider || 0; st.sw = 1 - st.rider; st.title = def.title || ''; st.dark = !!def.dark; st.look = def.look || 'lantern';
  st.c = minecartCompile(def);
  st.lever = 'up'; st.leverAnim = -1; st.goldSigns = false; st.wrongRow = 0;
  st.state = 'ride'; st.t = 0; st.oops = null; st.swap = null; st.fin = null;
  st.cart = { x: 0, v: 0, h: 0, hv: 0, lane: 'm', fork: null, duck: 0, stopT: 0, tilt: 0, spin: 0, drop: 0, dropV: 0, held: false,
    hatT: -1, braking: false, bellT: 0, spring: false };
  st.hist = [{ x: 0, lane: 'm', fork: null }];
  st.cam = { x: -MINECART.camLead, y: 0 };
  st.cam.y = minecartCamY(st);
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null;
  st.mule = null; st.roomT = 0; st.segStart = G.time; st.inT = [-99, -99]; st.prevUp = [true, true]; st.prevDown = [true, true];
  st.stats.roomT[k] = null; st.stats.roomTitles[k] = st.title;
  minecartActLabels(st);
  minecartMirror(st);
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function minecartStep(st, dt) {
  if (!st.cart) return;
  const ps = G.players;
  for (const k of [0, 1]) {
    const i = ps[k].input;
    if (i.left || i.right || i.jump || i.down || i.up || i.act || ps[k].pendingJump) st.inT[k] = G.time;
  }
  st.roomT += dt; st.t += dt;
  if (G.introT > 0) {
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
    st.prevUp = ps.map(p => p.input.up); st.prevDown = ps.map(p => p.input.down);
  } else if (st.state === 'ride') minecartRide(st, dt);
  else if (st.state === 'oops') minecartOopsStep(st, dt);
  else if (st.state === 'swap') { if (minecartSwapStep(st, dt)) return; }
  else if (st.state === 'finish') { if (minecartFinStep(st, dt)) return; }
  minecartCam(st, dt);
  minecartFx(st, dt);
  minecartMirror(st);
}
function minecartRide(st, dt) {
  const M = MINECART, ps = G.players, Rp = ps[st.rider], Sp = ps[st.sw], ri = Rp.input, si = Sp.input, cart = st.cart, c = st.c;
  const upP = ps.map((p, k) => p.pendingJump || (p.input.up && !st.prevUp[k]));
  const downP = ps.map((p, k) => p.input.down && !st.prevDown[k]);
  st.prevUp = ps.map(p => p.input.up); st.prevDown = ps.map(p => p.input.down);
  const actP = ps.map(p => p.pendingAct);
  for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
  // the switcher: the lever (it stays where it is put) and the brake
  if (upP[st.sw] && st.lever !== 'up') { st.lever = 'up'; Sfx.play('minecartLever'); }
  else if (downP[st.sw] && st.lever !== 'down') { st.lever = 'down'; Sfx.play('minecartLever'); }
  else if (upP[st.sw] || downP[st.sw]) Sfx.play('minecartClick');
  cart.braking = (si.act || si.left) && cart.stopT <= 0;
  if (cart.braking) { st.brakeSq = (st.brakeSq || 0) - dt; if (st.brakeSq <= 0 && cart.v > M.brakeMin + 20) { st.brakeSq = 0.16; Sfx.play('minecartBrake'); } }
  // the rider: hop, duck, grab
  const onRail = cart.h <= 0 && cart.hv <= 0;
  cart.duckWant = ri.down && onRail;
  cart.duck = clamp(cart.duck + (cart.duckWant ? 1 : -1) * M.duckRate * dt, 0, 1);
  if (upP[st.rider] && onRail && cart.duck < 0.35 && cart.stopT <= 0) minecartHop(st);
  cart.held = !!(ri.jump || ri.up);
  if (actP[st.rider]) minecartGrab(st);
  // speed: slopes, the gentle drive back to cruise, the brake, water
  const x0 = cart.x;
  const slope = (minecartRail(st, cart.lane, cart.fork, cart.x + 3) - minecartRail(st, cart.lane, cart.fork, cart.x - 3)) / 6;
  if (cart.stopT > 0) { cart.stopT -= dt; cart.v = 0; }
  else if (cart.h <= 0 && cart.hv <= 0) {
    // (only on the rails: in the air the cart keeps the speed it hopped with, so a hop goes where it was aimed and
    // a brake held in the air can't drop the cart short into a gap)
    cart.v += (M.cruise - cart.v) * M.kDrive * dt + M.gEff * slope * dt;
    if (cart.braking && cart.v > M.brakeMin) cart.v = Math.max(M.brakeMin, cart.v - M.brakeDec * dt);
    if (c.fords.some(w => w.x0 < cart.x && w.x1 > cart.x && minecartOnPath(st, w)) && cart.h <= 0) cart.v = Math.min(cart.v, M.fordMax);
    cart.v = clamp(cart.v, M.vMin, M.vMax);
  }
  // the station and the way out slow the cart to a stop by themselves
  const stopAt = c.station ? c.station.x : c.exit ? c.exit.office - 130 : null;
  if (stopAt != null && cart.x > stopAt - 700) cart.v = Math.min(cart.v, Math.max(8, Math.sqrt(2 * 320 * Math.max(0, stopAt - cart.x))));
  cart.x += cart.v * dt;
  cart.spin += cart.v * dt / M.wheelR;
  // forks: the cart takes the lever's track at the switch; back on the main line at the far end
  for (const fk of c.forks) {
    if (x0 < fk.x0 && cart.x >= fk.x0 && cart.lane === 'm') {
      cart.lane = minecartLeverLane(st); cart.fork = fk; fk.taken = cart.lane;
      Sfx.play('minecartSwitch');
      if (fk.dead !== cart.lane) {
        if (cart.lane === fk.good) { st.stats.goodForks++; st.wrongRow = 0; }
      }
    }
  }
  if (cart.fork && cart.lane !== cart.fork.dead && cart.x >= cart.fork.x1) { cart.lane = 'm'; cart.fork = null; }
  // in the air
  if (cart.h > 0 || cart.hv > 0) {
    cart.hv -= M.g * (cart.held && cart.hv > 0 && !cart.spring ? M.holdK : 1) * dt;
    cart.h += cart.hv * dt;
    if (cart.h <= 0) {
      cart.h = 0; cart.hv = 0; cart.spring = false;
      if (!minecartOverGap(st, true)) { Sfx.play('minecartLand'); minecartDust(st, 8); }
    }
  }
  cart.tilt = cart.tilt + (Math.atan(slope) * (cart.h > 0 ? 0.4 : 1) - cart.tilt) * Math.min(1, dt * 10);
  // trail of safe spots for a pull-back
  const last = st.hist[st.hist.length - 1];
  if (cart.h <= 0 && cart.x > last.x + 40 && !minecartOverGap(st, false)) st.hist.push({ x: cart.x, lane: cart.lane, fork: cart.fork });
  if (st.hist.length > 400) st.hist.shift();
  // hazards
  if (minecartHazards(st, dt)) return;
  // the dead end's buffer
  if (cart.fork && cart.lane === cart.fork.dead && cart.x >= cart.fork.deadEnd - M.half - 6) { minecartStartOops(st, 'dead', cart.fork); return; }
  // a gap under the cart on the rails: down it goes
  const gp = cart.h <= 0 ? minecartOverGap(st, false) : null;
  if (gp) { minecartStartOops(st, 'fall', gp); return; }
  // gold, checkpoints
  minecartCollect(st);
  for (const f of c.flags) if (!f.on && cart.x > f.x) { f.on = true; Sfx.play('minecartFlag'); minecartPop(st, f.x, minecartBase(st, f.x) - 130, 'Checkpoint!', '#ffe7a8', 20); }
  if (c.station && cart.x >= c.station.x - 6 && cart.v < 20) { minecartStartSwap(st); return; }
  if (c.exit && cart.x >= c.exit.office - 136 && cart.v < 20) { minecartStartFinish(st); return; }
  // rattle sounds
  st.clackT = (st.clackT || 0) - dt * cart.v / 200;
  if (st.clackT <= 0 && cart.h <= 0 && cart.v > 30) { st.clackT = 0.42; Sfx.play('minecartClack'); }
  minecartNudges(st, dt);
}
// the rider's hop (a gold spring plate before a gap makes it big enough to clear the gap)
function minecartHop(st) {
  const M = MINECART, cart = st.cart;
  const sp = st.c.gaps.find(g => g.spring && minecartOnPath(st, g) && cart.x > g.x0 - M.springZone && cart.x < g.x0 + M.coyote);
  if (sp) {
    const need = sp.x1 + M.springLand - cart.x, T = need / Math.max(90, cart.v);
    cart.hv = clamp(M.g * T / 2, M.hopV, 700); cart.spring = true;
    // a slow cart gets a push forward too, so the spring always lands it past the gap
    cart.v = Math.max(cart.v, need / (2 * cart.hv / M.g));
    Sfx.play('minecartSpring'); minecartPop(st, cart.x, minecartCartRail(st) - 120, 'BOING!', C.gold, 26);
  } else { cart.hv = M.hopV; cart.spring = false; Sfx.play('minecartHop'); }
  cart.h = 0.01; st.stats.hops++;
  minecartDust(st, 5);
}
// a gap under the cart's middle (with a little forgiveness at the near edge, none on a landing)
function minecartOverGap(st, landing) {
  const M = MINECART, x = st.cart.x;
  for (const g of st.c.gaps) {
    if (!minecartOnPath(st, g)) continue;
    if (x > g.x0 + (landing ? 0 : M.coyote) && x < g.x1 - 4) return g;
  }
  return null;
}
function minecartGrab(st) {
  const cart = st.cart;
  const l = st.c.lanterns.find(o => !o.got && minecartOnPath(st, o) && Math.abs(o.x - cart.x) < 72);
  if (l) {
    l.got = G.time; st.gold += 3; st.stats.lanterns++; st.stats.grabs[st.rider]++;
    Sfx.play('minecartLantern');
    const y = minecartRail(st, l.lane, l.fork, l.x) - 112;
    minecartPop(st, l.x, y - 30, '+3 gold lantern!', C.gold, 22); minecartSpark(st, l.x, y, C.gold, 14);
  } else { cart.bellT = 0.5; Sfx.play('minecartBell'); }
}
// beams, rocks, waterfalls and the bend at the foot of a steep slope; returns true when the ride stopped
function minecartHazards(st, dt) {
  const M = MINECART, cart = st.cart, c = st.c, x = cart.x;
  for (const b of c.beams) {
    if (b.hit || !minecartOnPath(st, b)) continue;
    if (x + 34 >= b.x - 9 && x - 34 <= b.x + 9 && (cart.duck < M.duckOK || cart.h > 6)) {
      b.hit = G.time; minecartBonk(st, 'beam'); return false;
    }
  }
  for (const r of c.rocks) {
    if (r.gone || !minecartOnPath(st, r)) continue;
    if (Math.abs(x - r.x) < 34 && cart.h < 24) { r.gone = G.time; minecartBonk(st, 'rock'); return false; }
  }
  for (const w of c.curtains) {
    if (w.wet || !minecartOnPath(st, w)) continue;
    if (Math.abs(x - w.x) < 30) {
      if (cart.duck < M.duckOK) {
        w.wet = true; cart.v *= 0.55; st.stats.splashes++;
        Sfx.play('minecartSplash'); minecartPop(st, x, minecartCartRail(st) - 90, 'Splash! Soaked!', '#bfe8ff', 22);
        for (let i = 0; i < 18; i++) minecartPart(st, x + (Math.random() - 0.5) * 60, minecartCartRail(st) - 60, (Math.random() - 0.5) * 200, -60 - Math.random() * 160, 0.7, 'rgba(190,232,255,0.9)', 3 + Math.random() * 3, 500, 'drop');
      } else if (Math.abs(x - w.x) < 4) { w.wet = true; st.stats.dryRuns++; minecartPop(st, x, minecartCartRail(st) - 90, 'Stayed dry!', '#bfe8ff', 18); }
    }
  }
  for (const b of c.bends) {
    if (b.hit || x < b.x) continue;
    b.hit = true;
    if (cart.v > M.bendMax && cart.h <= 0) {
      cart.stopT = M.wobbleT; cart.v = 0; st.stats.wobbles++; cart.hatT = 0;
      Sfx.play('minecartWobble'); G.shake = reduceMotion ? 0 : 0.25;
      minecartPop(st, x, minecartCartRail(st) - 100, 'Whoa! Too fast!', '#ffb36b', 24);
      minecartSpark(st, x + 30, minecartCartRail(st), '#ffd27a', 16);
      if (!st.hinted.brake) { st.hinted.brake = true; minecartHint(st, st.sw, 'Hold ' + minecartKey(st.sw, 'act') + ' to brake down steep slopes!', 3.2); }
    } else if (cart.braking || cart.v < M.bendMax - 30) minecartPop(st, x, minecartCartRail(st) - 100, 'Smooth!', '#8fe3b0', 18);
  }
  void dt;
  return false;
}
function minecartBonk(st, what) {
  const M = MINECART, cart = st.cart;
  cart.stopT = M.bonkT; cart.v = 0; cart.hv = Math.min(cart.hv, 0); cart.hatT = 0;
  st.stats.bonks++;
  Sfx.play('minecartBonk'); G.shake = reduceMotion ? 0 : 0.18;
  minecartPop(st, cart.x + 30, minecartCartRail(st) - cart.h - 140, 'Bonk!', '#ffe7a8', 26);
  minecartSpark(st, cart.x + 36, minecartCartRail(st) - cart.h - 50, '#fff3c0', 10);
  const R = st.rider;
  if (what === 'beam' && !st.hinted.duck) { st.hinted.duck = true; minecartHint(st, R, 'Hold ' + minecartKey(R, 'down') + ' to duck under beams!'); }
  if (what === 'rock' && !st.hinted.rock) { st.hinted.rock = true; minecartHint(st, R, 'Jump ' + minecartKey(R, 'up') + ' just before the rock!'); }
}
function minecartCollect(st) {
  const cart = st.cart, rail = minecartCartRail(st), top = rail - cart.h - 78, bot = rail - cart.h + 6;
  for (const g of st.c.gold) {
    if (g.got || Math.abs(g.x - cart.x) > 40 || !minecartOnPath(st, g)) continue;
    const gy = minecartRail(st, g.lane, g.fork, g.x) - 24 - g.h;
    if (gy < top || gy > bot) continue;
    g.got = G.time; st.gold++;
    st.goldFly.push({ x: g.x, y: gy, t: 0 });
    Sfx.play('minecartGold', 0.9 + Math.random() * 0.3);
    minecartSpark(st, g.x, gy, '#ffe27a', 6);
  }
}

/* ---------- whoopsies: a dead end or a missed gap; Mabel the mule pulls the cart back ---------- */
// the last spot the cart rode through at or before xMax with a run-up of at least MINECART.runUp px before the next gap
// on its track (so the cart is never put back over a gap or just before one, starting slow)
function minecartSafeBack(st, xMax) {
  const gaps = st.c.gaps, run = MINECART.runUp;
  const clear = h => !gaps.some(g => (g.lane === 'm' || (g.lane === h.lane && g.fork === h.fork)) && g.x1 > h.x - 10 && g.x0 < h.x + run);
  for (let i = st.hist.length - 1; i >= 0; i--) { const h = st.hist[i]; if (h.x <= xMax && clear(h)) return h; }
  return st.hist[0];
}
function minecartStartOops(st, kind, o) {
  const M = MINECART, cart = st.cart, Rid = st.rider, Sid = st.sw;
  st.state = 'oops';
  let back;
  if (kind === 'dead') {
    back = minecartSafeBack(st, o.restart);
    st.stats.wrong++; st.wrongRow++;
    cart.x = o.deadEnd - M.half - 6;
    Sfx.play('minecartBump');
    minecartPop(st, cart.x, minecartCartRail(st) - 110, 'Whoops! Dead end!', '#ffe7a8', 26);
    if (!st.goldSigns && st.wrongRow >= M.helpWrong) {
      st.goldSigns = true; st.stats.helps++;
      minecartMsg(st, 'Gold signs! A big gold arrow shows the way at every fork', C.gold, 4.2); Sfx.play('minecartHelp');
    } else if (!st.hinted.sign) { st.hinted.sign = true; minecartHint(st, Sid, 'Read the sign before the fork, then ' + minecartKey(Sid, 'lever'), 3.4); }
  } else {
    // back to a safe spot well before the gap
    back = minecartSafeBack(st, o.x0 - 460);
    st.stats.falls++; o.falls++;
    const tried = G.time - st.inT[Rid] < M.tryWin;
    if (tried) o.misses++;
    Sfx.play('minecartWhoops');
    minecartPop(st, cart.x, minecartCartRail(st) - 110, o.lane === 'd' ? 'Whoops! Soft landing!' : 'Whoops! Into the net!', '#ffe7a8', 24);
    if (o.misses >= M.helpMiss && !o.spring) {
      o.spring = true; st.stats.helps++;
      minecartMsg(st, 'Gold spring! Hop anywhere on the gold plate to clear the gap', C.gold, 4.2); Sfx.play('minecartHelp');
    } else if (!st.hinted.gap) { st.hinted.gap = true; minecartHint(st, Rid, 'Jump ' + minecartKey(Rid, 'up') + ' just before the gap!', 3.2); }
  }
  st.hist = st.hist.filter(h => h.x <= back.x);
  if (!st.hist.length) st.hist = [back];
  st.oops = { kind, t: 0, back, x0: cart.x, swapped: false, gap: kind === 'fall' ? o : null };
  cart.v = 0; cart.hv = 0; cart.h = 0; cart.duck = 0; cart.stopT = 0; cart.dropV = kind === 'fall' ? 60 : 0;
  st.mule = { x: st.cam.x - 80, t: 0, phase: 'in', face: 1 };
}
function minecartOopsStep(st, dt) {
  const o = st.oops, cart = st.cart, mu = st.mule;
  // the switcher can still set the lever while Mabel works
  {
    const sp = G.players[st.sw], up = sp.pendingJump || (sp.input.up && !st.prevUp[st.sw]), down = sp.input.down && !st.prevDown[st.sw];
    if (up && st.lever !== 'up') { st.lever = 'up'; Sfx.play('minecartLever'); }
    else if (down && st.lever !== 'down') { st.lever = 'down'; Sfx.play('minecartLever'); }
  }
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
  st.prevUp = G.players.map(p => p.input.up); st.prevDown = G.players.map(p => p.input.down);
  o.t += dt;
  if (o.kind === 'fall') { const to = o.gap.lane === 'd' ? 86 : 104; if (cart.drop < to) { cart.dropV += 900 * dt; cart.drop = Math.min(to, cart.drop + cart.dropV * dt); if (cart.drop >= to && !o.landed) { o.landed = true; minecartDust(st, 14); Sfx.play('minecartLand'); } } }
  else if (o.t < 0.25) cart.x -= 40 * dt;   // bounce off the soft buffer
  // Mabel trots in from the left, gives a tug, everything fades and the cart is back on the track
  const target = cart.x - 120;
  if (o.t < 1.6) { mu.x += (target - mu.x) * Math.min(1, dt * 3.2); mu.phase = 'in'; }
  else if (!o.swapped) mu.phase = 'pull';
  if (o.t >= 1.9 && !o.swapped) {
    o.swapped = true;
    cart.x = o.back.x; cart.lane = o.back.lane; cart.fork = o.back.fork; cart.drop = 0; cart.dropV = 0; cart.v = 0; cart.tilt = 0;
    for (const b of st.c.bends) if (b.x > cart.x) b.hit = false;
    st.cam.x = cart.x - MINECART.camLead; st.cam.y = minecartCamY(st);
    mu.x = cart.x - 120; mu.phase = 'wave';
    Sfx.play('minecartHeehaw');
  }
  if (o.t >= MINECART.oopsT) {
    st.state = 'ride'; st.oops = null; cart.v = 70;
    mu.phase = 'off'; mu.t = 0;
    minecartPop(st, cart.x, minecartCartRail(st) - 110, 'Thanks, Mabel!', '#ffe7a8', 20);
  }
}

/* ---------- the station (swap jobs) and the assay office (the finish) ---------- */
function minecartStartSwap(st) {
  st.state = 'swap'; st.swap = { t: 0 };
  st.stats.roomT[st.k] = G.time - st.segStart;
  st.cart.v = 0;
  minecartPop(st, st.cart.x, minecartCartRail(st) - 150, 'Swap jobs!', C.gold, 30);
  Sfx.play('minecartSwap'); rumble(0, 0.1, 0.4, 120); rumble(1, 0.1, 0.4, 120);
  for (let i = 0; i < 24; i++) { const a = -Math.PI * Math.random(); minecartPart(st, st.cart.x, minecartCartRail(st) - 90, Math.cos(a) * 220, Math.sin(a) * 220, 1.0, ['#ff6b4a', '#5b95ff', '#ffe27a', '#8fe3b0'][i % 4], 4, 320, 'conf'); }
}
function minecartSwapStep(st, dt) {
  st.swap.t += dt;
  if (st.swap.t > 0.6 && !st.swap.hop) { st.swap.hop = true; Sfx.play('minecartHop'); }
  if (st.swap.t >= MINECART.swapT) {
    const L = G.level;
    if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return true; }
    levelClear(); return true;
  }
  return false;
}
function minecartStartFinish(st) {
  st.state = 'finish'; st.fin = { t: 0 };
  st.stats.roomT[st.k] = G.time - st.segStart;
  st.cart.v = 0;
  Sfx.play('minecartLoaded'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
}
function minecartFinStep(st, dt) {
  const fin = st.fin, ex = st.c.exit;
  fin.t += dt;
  // the gold is tipped onto the big scales, the needle swings, the assayer stamps it, confetti
  if (fin.t > 0.6 && !fin.tip) { fin.tip = true; Sfx.play('minecartPour'); }
  if (fin.t > 2.0 && !fin.ding) {
    fin.ding = true; Sfx.play('minecartDing');
    minecartPop(st, ex.office + 40, minecartBase(st, ex.office) - 290, st.gold + ' gold nuggets!', C.gold, 32);
    for (let i = 0; i < 60; i++) { const a = -Math.PI * Math.random(); minecartPart(st, ex.office + 40, minecartBase(st, ex.office) - 170, Math.cos(a) * 280, Math.sin(a) * 280 - 60, 1.6, ['#ff6b4a', '#5b95ff', '#ffe27a', '#8fe3b0', '#ff9fd0'][i % 5], 4, 260, 'conf'); }
  }
  if (fin.t >= MINECART.finT && !fin.cleared) {
    fin.cleared = true;
    G.level.goal = { x: ex.office + 40 - st.cam.x, y: minecartBase(st, ex.office) - 160 - st.cam.y };
    levelClear();
    return true;
  }
  return false;
}

/* ---------- what each job needs right now (the prompts, the panels and the computer read this) ---------- */
function minecartNeeds(st) {
  const M = MINECART, cart = st.cart, c = st.c, out = { hz: null, hzD: 9999, fork: null, forkD: 9999, seen: false, want: null, bend: null, bendD: 9999,
    brake: false, lantern: null, high: null };
  if (!cart || st.state !== 'ride') return out;
  const x = cart.x;
  const near = (kind, o, d) => { if (d > -40 && d < out.hzD) { out.hz = { kind, o }; out.hzD = d; } };
  for (const g of c.gaps) if (minecartOnPath(st, g) && g.x1 > x) near('gap', g, g.x0 - x);
  for (const r of c.rocks) if (!r.gone && minecartOnPath(st, r) && r.x > x - 20) near('rock', r, r.x - x);
  for (const b of c.beams) if (!b.hit && minecartOnPath(st, b) && b.x > x - 40) near('beam', b, b.x - x);
  for (const w of c.curtains) if (!w.wet && minecartOnPath(st, w) && w.x > x - 30) near('curtain', w, w.x - x);
  for (const l of c.lanterns) if (!l.got && minecartOnPath(st, l) && l.x > x - 60 && l.x - x < 320 && (!out.lantern || l.x < out.lantern.x)) out.lantern = l;
  for (const g of c.gold) if (!g.got && g.h > 40 && minecartOnPath(st, g) && g.x > x && g.x - x < 300 && (!out.high || g.x < out.high.x)) out.high = g;
  // the next fork ahead, and whether its sign can be seen yet
  for (const fk of c.forks) if (fk.x0 > x && (!out.fork || fk.x0 < out.fork.x0)) out.fork = fk;
  if (out.fork) {
    const fk = out.fork, view = st.dark ? M.viewDark : M.viewLit;
    out.forkD = fk.x0 - x;
    // a lantern sign is read at the mouths of the two tracks; a pair of count signs once both can be seen
    const readX = fk.sign === 'lantern' ? fk.x0 + M.lanternAt : Math.max(...fk.signX);
    out.seen = readX - x < view + (fk.sign === 'lantern' ? 120 : 0);
    if (out.seen || st.goldSigns) out.want = fk.good === 'u' ? 'up' : 'down';
  }
  for (const b of c.bends) if (!b.hit && b.x > x) { const d = b.x0 - x; if (d < out.bendD) { out.bendD = d; out.bend = b; } }
  // brake for a steep slope ahead (from just before the top to the bend), when going too fast for the bend
  if (out.bend && out.bendD < 160 && cart.v > M.cruise - 25) out.brake = true;
  return out;
}
// the gentle lessons when they first matter, and pressing the other job's keys
function minecartNudges(st, dt) {
  const ps = G.players, R = st.rider, S = st.sw;
  // the switcher pressing ▲ / ▼ like a rider while a gap or beam comes: the lever is their job
  if (ps[S].input.down && !st.hinted.swDuck) {
    st.swDownT = (st.swDownT || 0) + dt;
    if (st.swDownT > 1.5) { st.hinted.swDuck = true; minecartHint(st, S, 'You work the lever: ' + minecartKey(S, 'lever') + ' picks the track'); }
  } else st.swDownT = 0;
}

/* ---------- small helpers ---------- */
function minecartHint(st, id, text, life) { if (minecartQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || MINECART.hintLife }; }
function minecartMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function minecartPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 12) st.pops.shift(); }
function minecartPart(st, x, y, vx, vy, life, col, size, grav, kind) {
  if (st.parts.length > 320) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
function minecartSpark(st, x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 120; minecartPart(st, x, y, Math.cos(a) * s, Math.sin(a) * s, 0.4, col, 2 + Math.random() * 1.5, 0, 'spark'); } }
function minecartDust(st, n) {
  const cart = st.cart, y = minecartCartRail(st);
  for (let i = 0; i < n; i++) minecartPart(st, cart.x + (Math.random() - 0.5) * 80, y + 2, (Math.random() - 0.5) * 120, -20 - Math.random() * 50, 0.6, 'rgba(226,190,140,0.7)', 4 + Math.random() * 4, 40, 'dust');
}
// the touch buttons and the top-bar legend name each player's own action this stretch: the rider grabs, the switcher brakes
let minecartLabelEls = null;
function minecartActLabels(st) {
  try {
    if (!minecartLabelEls || !minecartLabelEls.every(o => document.contains(o.el))) minecartLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of minecartLabelEls) {
      const want = o.id < 0 ? 'grab/brake' : o.id === st.rider ? 'grab' : 'brake';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}
function minecartCamY(st) {
  const cart = st.cart, base = minecartBase(st, cart.x + 120);
  let y = base - MINECART.camY + (minecartCartRail(st) - minecartBase(st, cart.x)) * 0.35;
  if (st.state === 'finish' || (st.c.exit && cart.x > st.c.exit.x - 300)) y -= 30;
  if (G.introT > 0) y -= 80;
  return y;
}
function minecartCam(st, dt) {
  const cam = st.cam, cart = st.cart;
  let tx = cart.x - MINECART.camLead + clamp((cart.v - MINECART.cruise) * 0.25, -40, 60);
  if (st.state === 'finish') tx = st.c.exit.office - 480;
  cam.x += (tx - cam.x) * Math.min(1, dt * 4);
  cam.y += (minecartCamY(st) - cam.y) * Math.min(1, dt * 3);
}
function minecartFx(st, dt) {
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 5;
    if (q.kind === 'dust') { q.vx *= 1 - dt * 2; q.vy *= 1 - dt * 2; }
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.3);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  for (const f of st.goldFly) f.t += dt;
  st.goldFly = st.goldFly.filter(f => f.t < 0.55);
  const cart = st.cart;
  cart.bellT = Math.max(0, cart.bellT - dt);
  if (cart.hatT >= 0) { cart.hatT += dt; if (cart.hatT > 1.0) cart.hatT = -1; }
  if (st.mule) { st.mule.t += dt; if (st.mule.phase === 'off') { st.mule.x -= 90 * dt; if (st.mule.t > 2.5) st.mule = null; } }
  for (const f of st.c.flags) if (f.on) f.t += dt;
  // sparks from the brake shoes
  if (cart.braking && cart.v > MINECART.brakeMin + 10 && st.state === 'ride' && cart.h <= 0) {
    st.sparkT = (st.sparkT || 0) - dt;
    if (st.sparkT <= 0) { st.sparkT = 0.04; minecartPart(st, cart.x - 30, minecartCartRail(st) - 2, -60 - Math.random() * 80, -40 - Math.random() * 80, 0.35, Math.random() < 0.5 ? '#ffd27a' : '#fff3c0', 2 + Math.random() * 2, 500, 'dot'); }
  }
}
// where a seat is (world px; feet), with the duck and the swap hop
function minecartSeat(st, id) {
  const M = MINECART, cart = st.cart, front = id === st.rider, lx = front ? M.seat[0] : M.seat[1];
  const rail = minecartCartRail(st) - cart.h + cart.drop, ca = Math.cos(cart.tilt), sa = Math.sin(cart.tilt);
  const ly = -34 + cart.duck * 16;
  let x = cart.x + ca * lx - sa * ly, y = rail + sa * lx + ca * ly;
  if (st.state === 'swap' && st.swap) {
    // both hop up, swap places in the air, and land in the other seat
    const u = clamp((st.swap.t - 0.55) / 0.9, 0, 1), olx = front ? M.seat[1] : M.seat[0];
    x = minecartLerp(x, cart.x + olx, minecartSmooth(u)); y -= (front ? 60 : 95) * 4 * u * (1 - u);
  }
  // hooray at the assay office: happy hops
  if (st.state === 'finish' && st.fin && st.fin.t > 2.0) y -= Math.abs(Math.sin((st.fin.t - 2.0) * 6 + (front ? 0 : 1.3))) * 18;
  return { x, y };
}
function minecartMirror(st) {
  const cam = st.cam;
  for (const p of G.players) {
    const s = minecartSeat(st, p.id);
    p.x = s.x - cam.x - PW / 2; p.y = s.y - cam.y - PH;
    p.alive = true; p.grounded = true; p.stompSafe = 0; p.vy = 0; p.vx = st.cart.v;
    p.face = 1;
    p.stun = st.cart.stopT > 0.2 && st.cart.hatT >= 0 ? 0.5 : 0;
  }
}

MODES.minecart = {
  // medal (js/medals.js): Gold with 70% of the gold by 4:10, Silver with 45% by 6:20
  medals: { bronze: 'Reach the assay office', goals: [{ key: 'time', gold: 250, silver: 380 }, { key: 'nuggets', gold: 0.7, silver: 0.45, more: true, pct: true, word: 'the gold nuggets' }] },
  medalValues() { const st = G.mst; return st.stats ? { nuggets: Math.min(1, st.gold / (st.goldAll || 1)) } : {}; },
  MINECART,
  compile: minecartCompile, needs: minecartNeeds, rail: minecartRail, cartRail: minecartCartRail, onPath: minecartOnPath, key: minecartKey,
  setup(st, L) {
    st.stats = { wrong: 0, goodForks: 0, bonks: 0, wobbles: 0, splashes: 0, dryRuns: 0, falls: 0, hops: 0, lanterns: 0, helps: 0, grabs: [0, 0], roomT: [], roomTitles: [] };
    st.gold = 0; st.goldFly = [];
    // count every stretch's gold up front (the HUD shows "x of all")
    const def = LEVELS[G.levelIndex];
    st.goldAll = (def.rooms || [def]).reduce((n, r) => n + minecartCompile(Object.assign({}, def, r)).goldMax, 0);
    minecartRoom(st, L, 0);
  },
  room(k, L) { minecartRoom(G.mst, L, k); },
  step(dt) { minecartStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then, and drawn in their seats instead
  draw() {
    const st = G.mst;
    if (!st.cart) return;
    minecartDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.cart) return;
    minecartDrawFront(st);
  },
  hud() { const st = G.mst; if (st.cart) minecartHud(st); },
  stats() {
    const st = G.mst, s = st.stats;
    if (!s) return [];
    const all = st.goldAll || 1, got = st.gold, frac = Math.min(1, got / all);
    const out = [
      { label: 'Gold nuggets', value: got + ' of ' + all },
      { label: 'Wrong turns', value: s.wrong },
      { label: 'Bonks', value: s.bonks + s.wobbles },
    ];
    const words = frac >= 0.9 ? 'The mother lode! The assayer needs a bigger scale!' : frac >= 0.6 ? 'A cart full of gold. Yee-haw, partners!' : 'A wild ride, and home safe together!';
    out.push(words + ' Lanterns grabbed: ' + s.lanterns + ', Mabel pull-backs: ' + (s.wrong + s.falls) + '.');
    if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
    return out;
  },
};

/* ---------- drawing ---------- */
const MINECART_LOOKS = {
  lantern: { top: '#3d2618', bot: '#1f130c', rock: '#5a3824', rock2: '#4a2d1c', vein: '#ffcf4a', accent: '#ffb347' },
  crystal: { top: '#33223f', bot: '#170f22', rock: '#4a3156', rock2: '#3b2646', vein: '#ffcf4a', accent: '#b98cff' },
  river: { top: '#1f2f38', bot: '#0f181e', rock: '#3a4a4f', rock2: '#2c3a40', vein: '#ffcf4a', accent: '#7fd3ff' },
  lode: { top: '#2a1a10', bot: '#130b06', rock: '#46301c', rock2: '#382514', vein: '#ffd54a', accent: '#ffd54a' },
};
const minecartHash = n => { n = (n | 0) * 374761393; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
function minecartDrawWorld(st) {
  const cam = st.cam;
  minecartDrawBack(st);
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  minecartDrawCavern(st);
  const near = s => s.x > cam.x - 260 && s.x < cam.x + W + 260;
  for (const s of st.c.signs) if (s.kind !== 'wall' && near(s)) minecartDrawSign(st, s);
  minecartDrawTracks(st);
  for (const s of st.c.signs) if (s.kind === 'wall' && near(s)) minecartDrawSign(st, s);
  minecartDrawThings(st);
  ctx.restore();
}
function minecartDrawFront(st) {
  const cam = st.cam;
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  minecartDrawMule(st);
  minecartDrawCart(st);
  minecartDrawLooseFront(st);
  ctx.restore();
  if (st.dark) minecartDrawDark(st);
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  if (st.dark) minecartDrawGlows(st);
  for (const q of st.parts) {
    const a = clamp(q.life / q.max, 0, 1);
    if (q.x < cam.x - 30 || q.x > cam.x + W + 30 || q.y < cam.y - 30 || q.y > cam.y + H + 30) continue;
    ctx.globalAlpha = q.kind === 'dust' ? a * 0.7 : q.kind === 'spark' ? Math.min(1, a * 1.6) : a; ctx.fillStyle = q.col;
    if (q.kind === 'spark') { minecartStarPath(q.x, q.y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
    else if (q.kind === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
    else if (q.kind === 'dust') { circle(q.x, q.y, q.size * (1.5 - 0.5 * a)); ctx.fill(); }
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // the mule's fade (a tug back along the track)
  if (st.state === 'oops' && st.oops) {
    const t = st.oops.t, a = t < 1.6 ? 0 : t < 1.9 ? (t - 1.6) / 0.3 : t < 2.3 ? 1 - (t - 1.9) / 0.4 : 0;
    if (a > 0) {
      ctx.fillStyle = 'rgba(20,12,6,' + (a * 0.92) + ')'; ctx.fillRect(0, 0, W, H);
      if (a > 0.5) bigText('Tug... tug...', W / 2, H / 2, 34, '#ffe7a8', 1);
    }
  }
  const big = hudBig();
  for (const q of st.pops) {
    const x = clamp(q.x - cam.x, 110, W - 110), y = clamp(q.y - cam.y - q.t * 30, 90, H - 110);
    ctx.globalAlpha = clamp((1.3 - q.t) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.3 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
    ctx.globalAlpha = 1;
  }
}
function minecartStarPath(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
// the far cavern wall (parallax), with gold veins, crystals or a river glow
function minecartDrawBack(st) {
  const lk = MINECART_LOOKS[st.look] || MINECART_LOOKS.lantern, cam = st.cam, t = G.clock;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, lk.top); g.addColorStop(1, lk.bot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // big soft rock shapes far behind
  const px = cam.x * 0.25;
  for (let k = Math.floor(px / 180) - 1; k < Math.floor((px + W) / 180) + 2; k++) {
    const x = k * 180 - px, r = minecartHash(k * 7 + 1), yy = 120 + r * 260;
    ctx.fillStyle = k % 2 ? lk.rock2 : lk.rock; ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.ellipse(x, yy, 110 + r * 60, 70 + r * 40, r, 0, Math.PI * 2); ctx.fill();
    // a lamp-lit upper face, a darker underside and a few cracks, so the far rock reads as rock
    ctx.globalAlpha = 0.18; ctx.fillStyle = '#ffd9a0'; ctx.beginPath(); ctx.ellipse(x - 14, yy - 22 - r * 10, 70 + r * 40, 28 + r * 14, r, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#120a05'; ctx.beginPath(); ctx.ellipse(x + 10, yy + 30 + r * 16, 90 + r * 40, 30 + r * 16, r, 0, Math.PI); ctx.fill();
    ctx.globalAlpha = 0.3; ctx.strokeStyle = '#120a05'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 40, yy - 20); ctx.lineTo(x - 26, yy); ctx.lineTo(x - 32, yy + 22); ctx.moveTo(x + 50, yy - 30); ctx.lineTo(x + 40, yy - 8); ctx.stroke();
    ctx.globalAlpha = 1;
    // a gold vein with glints
    if (r > 0.35) {
      ctx.strokeStyle = 'rgba(255,207,74,0.45)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 60, yy - 10); ctx.quadraticCurveTo(x - 10, yy - 40 * r, x + 30, yy + 5); ctx.quadraticCurveTo(x + 60, yy + 25, x + 90, yy - 5); ctx.stroke();
      const tw = 0.5 + 0.5 * Math.sin(t * 3 + k * 1.7);
      ctx.fillStyle = 'rgba(255,240,170,' + (0.4 + 0.6 * tw) + ')'; minecartStarPath(x + 30, yy + 5, 4 + tw * 3, 1.5, t); ctx.fill();
    }
    // crystals in the crystal cavern
    if (st.look === 'crystal' && r < 0.6) {
      const cols = ['#b98cff', '#7fe0ff', '#ff9fd0'];
      for (let j = 0; j < 3; j++) {
        const cx = x - 30 + j * 22, cy = yy + 50, hh = 26 + 18 * minecartHash(k * 3 + j);
        ctx.fillStyle = cols[(k + j) % 3]; ctx.globalAlpha = 0.75;
        ctx.beginPath(); ctx.moveTo(cx - 7, cy); ctx.lineTo(cx, cy - hh); ctx.lineTo(cx + 7, cy); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(cx - 2, cy - 4); ctx.lineTo(cx, cy - hh + 4); ctx.lineTo(cx + 1, cy - 4); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }
  // a middle layer: timber frames with hanging lanterns (off in the dark stretch)
  const mx = cam.x * 0.55;
  for (let k = Math.floor(mx / 320) - 1; k < Math.floor((mx + W) / 320) + 2; k++) {
    const x = k * 320 - mx;
    ctx.fillStyle = '#2a190e'; ctx.globalAlpha = 0.75;
    ctx.fillRect(x - 6, 40, 12, H); ctx.fillRect(x + 150, 40, 12, H); ctx.fillRect(x - 14, 40, 184, 14);
    // lit left edges, wood grain and corner braces on the timbers
    ctx.fillStyle = '#6a4426'; ctx.fillRect(x - 6, 54, 2, H); ctx.fillRect(x + 150, 54, 2, H); ctx.fillRect(x - 14, 40, 184, 2);
    ctx.fillStyle = '#2a190e'; ctx.beginPath(); ctx.moveTo(x + 6, 54); ctx.lineTo(x + 30, 54); ctx.lineTo(x + 6, 78); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 150, 54); ctx.lineTo(x + 126, 54); ctx.lineTo(x + 150, 78); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a8f9e'; for (const bx of [x, x + 156]) { circle(bx, 47, 1.6); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (!st.dark) {
      const lx = x + 78, ly = 96 + Math.sin(t * 1.4 + k) * 2;
      const gl = ctx.createRadialGradient(lx, ly, 2, lx, ly, 70);
      gl.addColorStop(0, 'rgba(255,200,110,0.45)'); gl.addColorStop(1, 'rgba(255,200,110,0)');
      ctx.fillStyle = gl; circle(lx, ly, 70); ctx.fill();
      ctx.strokeStyle = '#1a0f08'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lx, 54); ctx.lineTo(lx, ly - 9); ctx.stroke();
      ctx.fillStyle = '#ffd27a'; rr(lx - 6, ly - 8, 12, 15, 3); ctx.fill();
      ctx.fillStyle = '#3a2516'; ctx.fillRect(lx - 7, ly - 10, 14, 3); ctx.fillRect(lx - 7, ly + 6, 14, 3);
    }
  }
}
// the cavern floor and ceiling around the tracks, the river in stretch 3, the daylight outside at the end
function minecartDrawCavern(st) {
  const cam = st.cam, lk = MINECART_LOOKS[st.look] || MINECART_LOOKS.lantern, x0 = cam.x - 20, x1 = cam.x + W + 20, ex = st.c.exit, t = G.clock;
  const xin = ex ? Math.min(x1, ex.x) : x1;
  // ceiling: a lumpy rock band with friendly little stalactites
  ctx.fillStyle = lk.rock2;
  ctx.beginPath(); ctx.moveTo(x0, cam.y - 10);
  for (let x = Math.floor(x0 / 20) * 20; x <= xin + 20; x += 20) ctx.lineTo(x, minecartBase(st, x) - 268 + Math.sin(x / 57) * 10 + Math.sin(x / 23) * 4);
  ctx.lineTo(xin + 20, cam.y - 10); ctx.closePath(); ctx.fill();
  for (let k = Math.floor(x0 / 140); k <= xin / 140; k++) {
    const x = k * 140 + 40 * minecartHash(k), y = minecartBase(st, x) - 268 + Math.sin(x / 57) * 10;
    const tip = y + 18 + 14 * minecartHash(k + 5);
    ctx.fillStyle = lk.rock2; ctx.beginPath(); ctx.moveTo(x - 10, y - 2); ctx.lineTo(x, tip); ctx.lineTo(x + 10, y - 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.moveTo(x + 2, y - 2); ctx.lineTo(x, tip); ctx.lineTo(x + 10, y - 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,170,0.25)'; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x - 1, tip - 4); ctx.lineTo(x - 4, y); ctx.closePath(); ctx.fill();
  }
  // the ceiling's lower lip catches the lamplight
  ctx.strokeStyle = 'rgba(255,215,160,0.22)'; ctx.lineWidth = 3; ctx.beginPath();
  for (let x = Math.floor(x0 / 20) * 20; x <= xin + 20; x += 20) ctx.lineTo(x, minecartBase(st, x) - 270 + Math.sin(x / 57) * 10 + Math.sin(x / 23) * 4);
  ctx.stroke();
  // floor: sand and rock, with crates, barrels and pickaxes
  const floorY = x => minecartBase(st, x) + 228 + Math.sin(x / 71) * 8;
  ctx.fillStyle = lk.rock;
  ctx.beginPath(); ctx.moveTo(x0, cam.y + H + 10);
  for (let x = Math.floor(x0 / 16) * 16; x <= xin + 16; x += 16) ctx.lineTo(x, floorY(x));
  ctx.lineTo(xin + 16, cam.y + H + 10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(232,194,122,0.55)'; ctx.lineWidth = 3; ctx.beginPath();
  for (let x = Math.floor(x0 / 16) * 16; x <= xin + 16; x += 16) ctx.lineTo(x, floorY(x));
  ctx.stroke();
  // pebbles and gold flecks in the floor
  for (let k = Math.floor(x0 / 46); k <= xin / 46; k++) {
    const h = hash(k, 313), x = k * 46 + (h % 30), y = floorY(x) + 12 + (h >> 5) % 40;
    ctx.fillStyle = h % 7 === 0 ? 'rgba(255,207,74,0.75)' : 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y, 2 + (h >> 9) % 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (st.look === 'river') {
    // the underground river along the floor
    ctx.fillStyle = 'rgba(70,160,210,0.75)';
    ctx.beginPath(); ctx.moveTo(x0, cam.y + H + 10);
    for (let x = Math.floor(x0 / 12) * 12; x <= xin + 12; x += 12) ctx.lineTo(x, minecartBase(st, x) + 206 + Math.sin(x / 30 + t * 2) * 3);
    ctx.lineTo(xin + 12, cam.y + H + 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(200,240,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = Math.floor(x0 / 12) * 12; x <= xin + 12; x += 12) ctx.lineTo(x, minecartBase(st, x) + 206 + Math.sin(x / 30 + t * 2) * 3);
    ctx.stroke();
  }
  for (let k = Math.floor(x0 / 260); k <= xin / 260; k++) {
    const r = minecartHash(k * 11 + 3), x = k * 260 + r * 120, y = floorY(x);
    if (st.look === 'river') continue;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(2, 1, 20, 4, 0, 0, Math.PI * 2); ctx.fill();
    if (r < 0.3) { ctx.fillStyle = '#8a5a30'; rr(-16, -26, 32, 26, 3); ctx.fill(); ctx.strokeStyle = '#5a3a1c'; ctx.lineWidth = 2; ctx.strokeRect(-16, -26, 32, 26); ctx.beginPath(); ctx.moveTo(-16, -26); ctx.lineTo(16, 0); ctx.moveTo(16, -26); ctx.lineTo(-16, 0); ctx.stroke(); }
    else if (r < 0.55) { ctx.fillStyle = '#7a4a28'; rr(-13, -30, 26, 30, 7); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(4, -29, 8, 28); ctx.fillStyle = 'rgba(255,220,170,0.25)'; ctx.fillRect(-10, -29, 3, 28); ctx.fillStyle = '#4a2d18'; ctx.fillRect(-13, -24, 26, 3); ctx.fillRect(-13, -8, 26, 3); ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 1.5; rr(-13, -30, 26, 30, 7); ctx.stroke(); }
    else if (r < 0.75) { ctx.strokeStyle = '#7a5228'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(10, -26); ctx.stroke(); ctx.strokeStyle = '#9aa0ae'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(10, -18, 12, -2.3, -0.6); ctx.stroke(); }
    else { for (let j = 0; j < 4; j++) { ctx.fillStyle = '#c99a1a'; circle(-10 + j * 7, -4 - (j % 2) * 4, 4.4); ctx.fill(); ctx.fillStyle = '#ffcf4a'; circle(-10.5 + j * 7, -4.5 - (j % 2) * 4, 3.6); ctx.fill(); ctx.fillStyle = '#fff3b0'; circle(-12 + j * 7, -6 - (j % 2) * 4, 1.2); ctx.fill(); } }
    ctx.restore();
  }
  if (ex && x1 > ex.x) minecartDrawOutside(st, ex, Math.max(x0, ex.x), x1);
}
// the sunset outside the mine, the mine mouth and the assay office
function minecartDrawOutside(st, ex, xa, xb) {
  const cam = st.cam, t = G.clock, gy = x => minecartBase(st, x) + 120;
  ctx.save();
  ctx.beginPath(); ctx.rect(ex.x, cam.y - 20, xb - ex.x + 40, H + 40); ctx.clip();
  const g = ctx.createLinearGradient(0, cam.y, 0, cam.y + H);
  g.addColorStop(0, '#f39a5a'); g.addColorStop(0.55, '#ffd27a'); g.addColorStop(1, '#fff0c9');
  ctx.fillStyle = g; ctx.fillRect(ex.x, cam.y - 20, xb - ex.x + 40, H + 40);
  // the sun and far mesas (they scroll slower)
  const sx = cam.x + W * 0.72;
  ctx.fillStyle = 'rgba(255,240,190,0.5)'; circle(sx, cam.y + 150, 70); ctx.fill();
  ctx.fillStyle = '#fff4c4'; circle(sx, cam.y + 150, 44); ctx.fill();
  ctx.fillStyle = '#d97a4a';
  for (let k = 0; k < 6; k++) {
    const mx = cam.x + ((k * 260 - cam.x * 0.3) % 1560 + 1560) % 1560 - 200, my = cam.y + 300 - (k % 3) * 30;
    ctx.beginPath(); ctx.moveTo(mx - 120, cam.y + H); ctx.lineTo(mx - 90, my); ctx.lineTo(mx + 90, my); ctx.lineTo(mx + 120, cam.y + H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(120,45,25,0.18)'; ctx.beginPath(); ctx.moveTo(mx + 70, my); ctx.lineTo(mx + 90, my); ctx.lineTo(mx + 120, cam.y + H); ctx.lineTo(mx + 90, cam.y + H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,190,0.35)'; ctx.fillRect(mx - 90, my, 180, 2); ctx.fillStyle = 'rgba(120,45,25,0.12)'; ctx.fillRect(mx - 100, my + 30, 205, 5);
    ctx.fillStyle = '#d97a4a';
  }
  ctx.fillStyle = '#b85a33';
  for (let k = 0; k < 4; k++) {
    const mx = cam.x + ((k * 420 + 120 - cam.x * 0.6) % 1680 + 1680) % 1680 - 200, my = cam.y + 340;
    ctx.beginPath(); ctx.moveTo(mx - 100, cam.y + H); ctx.lineTo(mx - 70, my); ctx.lineTo(mx + 70, my); ctx.lineTo(mx + 100, cam.y + H); ctx.closePath(); ctx.fill();
  }
  // the desert ground, cactus
  ctx.fillStyle = '#e8c27a'; ctx.beginPath(); ctx.moveTo(xa - 20, cam.y + H + 20);
  for (let x = xa - 20; x <= xb + 20; x += 20) ctx.lineTo(x, gy(x) + Math.sin(x / 90) * 6);
  ctx.lineTo(xb + 20, cam.y + H + 20); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c99a52'; ctx.fillRect(xa - 20, gy(xa) + 40, xb - xa + 40, H);
  for (let k = Math.floor(xa / 300); k <= xb / 300; k++) {
    const x = k * 300 + 140 * minecartHash(k + 40); if (x < ex.x + 80 || Math.abs(x - ex.office) < 220) continue;
    const y = gy(x) + 4;
    ctx.fillStyle = '#4f9a4a'; rr(x - 7, y - 54, 14, 56, 7); ctx.fill(); rr(x - 24, y - 40, 10, 24, 5); ctx.fill(); rr(x + 14, y - 46, 10, 26, 5); ctx.fill();
    ctx.fillRect(x - 20, y - 22, 16, 7); ctx.fillRect(x + 4, y - 26, 16, 7);
    ctx.fillStyle = '#ff9fd0'; circle(x, y - 56, 4); ctx.fill();
  }
  // the assay office
  const ox = ex.office, oy = minecartBase(st, ox) + 10;
  ctx.fillStyle = '#b77a45'; ctx.fillRect(ox - 40, oy - 176, 230, 176);
  ctx.fillStyle = '#9a6034'; for (let i = 0; i < 8; i++) ctx.fillRect(ox - 40, oy - 176 + i * 22, 230, 2);
  ctx.fillStyle = '#c98e57'; ctx.fillRect(ox - 52, oy - 214, 254, 44);
  ctx.strokeStyle = '#704622'; ctx.lineWidth = 3; ctx.strokeRect(ox - 52, oy - 214, 254, 44);
  text('ASSAY OFFICE', ox + 75, oy - 191, 24, '#4a2a12', 'center');
  ctx.fillStyle = '#704622'; ctx.fillRect(ox - 50, oy - 120, 254, 8);
  ctx.fillStyle = '#5a3a1c'; ctx.fillRect(ox + 120, oy - 100, 46, 100);
  ctx.fillStyle = '#ffe7a8'; ctx.fillRect(ox + 10, oy - 160, 60, 40); ctx.fillStyle = '#704622'; ctx.fillRect(ox + 38, oy - 160, 4, 40); ctx.fillRect(ox + 10, oy - 142, 60, 4);
  // the big scales
  const fin = st.fin, ft = fin ? fin.t : 0, sc = ox + 40, sy = oy - 30;
  const tipA = clamp((ft - 0.6) / 1.2, 0, 1), swing = fin ? Math.sin(ft * 5) * 0.2 * Math.max(0, 1 - ft / 3) + tipA * 0.25 : 0;
  ctx.fillStyle = '#8a8fa0'; ctx.fillRect(sc - 4, sy - 100, 8, 100); ctx.fillRect(sc - 26, sy - 4, 52, 8);
  ctx.save(); ctx.translate(sc, sy - 100); ctx.rotate(swing);
  ctx.fillStyle = '#c9ced8'; ctx.fillRect(-70, -4, 140, 8);
  for (const s of [-1, 1]) {
    ctx.strokeStyle = '#8a8fa0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s * 66, 0); ctx.lineTo(s * 66 - 18, 46); ctx.moveTo(s * 66, 0); ctx.lineTo(s * 66 + 18, 46); ctx.stroke();
  }
  ctx.restore();
  for (const s of [-1, 1]) {
    const bx = sc + s * 66 * Math.cos(swing), by = sy - 100 + s * 66 * Math.sin(swing) + 46;
    ctx.fillStyle = '#ffcf4a'; ctx.beginPath(); ctx.ellipse(bx, by, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
    if (s === 1 && tipA > 0) { const n = Math.round(tipA * 9); for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? '#ffd54a' : '#ffe27a'; circle(bx - 14 + (i % 4) * 9, by - 6 - Math.floor(i / 4) * 6, 5); ctx.fill(); } }
    if (s === -1) { ctx.fillStyle = '#6a6f80'; rr(bx - 10, by - 16, 20, 12, 3); ctx.fill(); }
  }
  // a friendly assayer with a visor waves from the window
  const ax = ox + 40, ay = oy - 128, wave = Math.sin(t * 6) * 0.5;
  ctx.fillStyle = '#f2c8a0'; circle(ax, ay, 10); ctx.fill();
  ctx.fillStyle = '#4fae6a'; ctx.beginPath(); ctx.ellipse(ax, ay - 7, 14, 4, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = C.ink; circle(ax - 3, ay, 1.6); ctx.fill(); circle(ax + 3, ay, 1.6); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ax, ay + 3, 4, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.strokeStyle = '#f2c8a0'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax + 10, ay + 8); ctx.lineTo(ax + 22 + wave * 6, ay - 8); ctx.stroke();
  ctx.restore();
  // the mine mouth: a timber frame and the rock face around it
  const mx = ex.x, my = minecartBase(st, mx);
  if (mx > xa - 200) {
    ctx.fillStyle = '#7a3a26'; ctx.beginPath(); ctx.moveTo(mx - 10, cam.y - 20); ctx.lineTo(mx + 60, cam.y - 20); ctx.quadraticCurveTo(mx + 40, my - 160, mx + 24, my - 130);
    ctx.lineTo(mx + 24, my + 300); ctx.lineTo(mx - 10, my + 300); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#704622'; ctx.fillRect(mx - 6, my - 140, 18, 160); ctx.fillRect(mx - 30, my - 150, 70, 16);
    ctx.fillStyle = '#c98e57'; rr(mx - 46, my - 196, 104, 34, 5); ctx.fill();
    text('GOLDY MINE', mx + 6, my - 179, 15, '#4a2a12', 'center');
  }
}
// the tracks: the main line, both branches of every fork, trestles, the switch stands, gaps and buffers
function minecartDrawTracks(st) {
  const c = st.c, cam = st.cam, x0 = cam.x - 40, x1 = cam.x + W + 40;
  const lanes = [{ lane: 'm', fork: null }];
  for (const fk of c.forks) if (fk.x0 < x1 && Math.max(fk.x1, fk.deadEnd) > x0) { lanes.push({ lane: 'u', fork: fk }); lanes.push({ lane: 'd', fork: fk }); }
  const gapAt = (lane, fork, x) => c.gaps.some(g => g.lane === lane && g.fork === fork && x > g.x0 && x < g.x1);
  const exists = (lane, fork, x) => {
    if (lane === 'm') return !minecartForkAt(st, x) || x <= minecartForkAt(st, x).x0 + 2 || (x >= minecartForkAt(st, x).x1 - 2);
    if (x < fork.x0 || x > (fork.dead === lane ? fork.deadEnd + 30 : fork.x1)) return false;
    return true;
  };
  for (const L of lanes) {
    const a = Math.max(x0, L.fork ? L.fork.x0 : x0), b = Math.min(x1, L.fork ? (L.fork.dead === L.lane ? L.fork.deadEnd + 30 : L.fork.x1) : x1);
    if (a >= b) continue;
    // trestle posts down to the floor
    ctx.fillStyle = '#3b2414';
    for (let x = Math.ceil(a / 90) * 90; x < b; x += 90) {
      if (!exists(L.lane, L.fork, x) || gapAt(L.lane, L.fork, x)) continue;
      const y = minecartRail(st, L.lane, L.fork, x);
      ctx.fillRect(x - 4, y + 8, 8, 260);
      ctx.strokeStyle = 'rgba(59,36,20,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 4, y + 30); ctx.lineTo(x + 86, y + 110); ctx.stroke();
    }
    // ties (sleepers) and the rail
    for (let x = Math.ceil(a / 24) * 24; x < b; x += 24) {
      if (!exists(L.lane, L.fork, x) || gapAt(L.lane, L.fork, x)) continue;
      const y = minecartRail(st, L.lane, L.fork, x);
      ctx.fillStyle = '#7a4a28'; ctx.fillRect(x - 8, y + 1, 16, 8);
    }
    ctx.lineCap = 'butt';
    for (const [col, lw, dy] of [['#4a4f5c', 6, 0], ['#c9ced8', 2, -2]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
      let on = false;
      for (let x = Math.floor(a / 6) * 6; x <= b; x += 6) {
        const ok = exists(L.lane, L.fork, x) && !gapAt(L.lane, L.fork, x);
        const y = minecartRail(st, L.lane, L.fork, x) + dy;
        if (ok) { if (!on) { ctx.moveTo(x, y); on = true; } else ctx.lineTo(x, y); }
        else on = false;
      }
      ctx.stroke();
    }
  }
  // gaps: broken rail ends and a soft sand pile (or the river) below
  for (const g of c.gaps) {
    if (g.x1 < x0 || g.x0 > x1) continue;
    const y = minecartRail(st, g.lane, g.fork, g.x0), mid = (g.x0 + g.x1) / 2;
    if (g.lane === 'd') {
      // the lower track runs near the floor: a soft sand pile
      ctx.fillStyle = '#e8c27a'; ctx.beginPath(); ctx.ellipse(mid, y + 110, (g.x1 - g.x0) * 0.55, 22, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#d2a85c'; ctx.beginPath(); ctx.ellipse(mid, y + 110, (g.x1 - g.x0) * 0.55, 6, 0, 0, Math.PI); ctx.fill();
    } else {
      // a springy rope safety net strung between two posts
      const a0 = g.x0 - 40, a1 = g.x1 + 40, ny = y + 96, sag = 14;
      ctx.fillStyle = '#5a3a1c'; ctx.fillRect(a0 - 4, y + 6, 8, 104); ctx.fillRect(a1 - 4, y + 6, 8, 104);
      const netY = u => ny - 22 + (22 + sag) * Math.sin(Math.PI * u);
      ctx.strokeStyle = 'rgba(233,210,154,0.9)'; ctx.lineWidth = 1.5;
      for (let k = 1; k < 10; k++) { const u = k / 10, xx = minecartLerp(a0, a1, u); ctx.beginPath(); ctx.moveTo(xx, netY(u) - 12); ctx.lineTo(xx, netY(u)); ctx.stroke(); }
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#e9d29a';
      for (const dy of [0, -12]) { ctx.beginPath(); for (let k = 0; k <= 16; k++) { const u = k / 16; ctx.lineTo(minecartLerp(a0, a1, u), netY(u) + dy * Math.sin(Math.PI * u)); } ctx.stroke(); }
    }
    ctx.fillStyle = '#4a4f5c'; ctx.fillRect(g.x0 - 6, y - 3, 6, 9); ctx.fillRect(g.x1, y - 3, 6, 9);
    if (g.spring) {
      // the gold spring plate before the gap
      const sx0 = g.x0 - MINECART.springZone, gyy = y;
      ctx.fillStyle = 'rgba(255,197,61,' + (0.55 + 0.25 * Math.sin(G.clock * 8)) + ')'; rr(sx0, gyy - 6, MINECART.springZone, 6, 3); ctx.fill();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) { const zx = sx0 + 30 + k * 55; ctx.beginPath(); for (let j = 0; j <= 4; j++) ctx.lineTo(zx + (j % 2) * 8, gyy - 6 - j * 3); ctx.stroke(); }
    }
  }
  // fork switch stands with the arrow of the lever's track, and the dead-end buffers
  for (const fk of c.forks) {
    if (fk.x0 > x0 - 100 && fk.x0 < x1 + 100) minecartDrawSwitch(st, fk);
    if (fk.dead && fk.deadEnd > x0 - 60 && fk.deadEnd < x1 + 60) minecartDrawBuffer(st, fk);
  }
}
function minecartDrawSwitch(st, fk) {
  const x = fk.x0 - 30, y = minecartBase(st, x), passed = st.cart.fork === fk || st.cart.x > fk.x0;
  const dir = passed ? (fk.taken || minecartLeverLane(st)) : minecartLeverLane(st), up = dir === 'u';
  const glow = st.goldSigns && !passed;
  ctx.fillStyle = '#5a3a1c'; ctx.fillRect(x - 3, y - 4, 6, 30);
  ctx.fillStyle = glow ? C.gold : '#3b3a55'; rr(x - 22, y + 24, 44, 14, 4); ctx.fill();
  // the round arrow disc
  ctx.fillStyle = '#fff3d6'; ctx.strokeStyle = glow ? C.gold : '#704622'; ctx.lineWidth = 3;
  circle(x, y + 52, 16); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.translate(x, y + 52); ctx.rotate(up ? -0.75 : 0.75);
  ctx.fillStyle = PCOL[st.sw]; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-2, -8); ctx.lineTo(-2, -3); ctx.lineTo(-11, -3); ctx.lineTo(-11, 3); ctx.lineTo(-2, 3); ctx.lineTo(-2, 8); ctx.closePath(); ctx.fill();
  ctx.restore();
  // the points of the rail bend toward the chosen track
  const ry = y, bx = fk.x0;
  ctx.strokeStyle = '#c9ced8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx - 40, ry - 2); ctx.lineTo(bx + 10, ry - 2 + (up ? -6 : 6)); ctx.stroke();
}
function minecartDrawBuffer(st, fk) {
  const x = fk.deadEnd, y = minecartRail(st, fk.dead, fk, x);
  ctx.fillStyle = '#e8c27a'; rr(x - 8, y - 46, 40, 46, 8); ctx.fill();
  ctx.strokeStyle = '#b98f45'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - 6, y - 40 + k * 11); ctx.lineTo(x + 30, y - 38 + k * 11); ctx.stroke(); }
  // the boarded X behind it
  ctx.fillStyle = '#8a5a30'; ctx.save(); ctx.translate(x + 50, y - 60);
  ctx.rotate(0.7); ctx.fillRect(-46, -7, 92, 14); ctx.rotate(-1.4); ctx.fillRect(-46, -7, 92, 14);
  ctx.restore();
  ctx.fillStyle = '#5a3a1c'; ctx.fillRect(x + 36, y - 130, 8, 130); ctx.fillRect(x + 60, y - 130, 8, 130);
}
// the things along the tracks: signs, beams, rocks, waterfalls, gold, lanterns, flags, the station
function minecartDrawThings(st) {
  const c = st.c, cam = st.cam, x0 = cam.x - 120, x1 = cam.x + W + 120, t = G.clock;
  const vis = x => x > x0 && x < x1;
  for (const f of c.flags) if (vis(f.x)) {
    const y = minecartBase(st, f.x);
    ctx.fillStyle = '#5a3a1c'; ctx.fillRect(f.x - 2, y - 96, 4, 96);
    ctx.fillStyle = f.on ? '#8fe3b0' : '#ff8a5c'; ctx.beginPath(); ctx.moveTo(f.x + 2, y - 96); ctx.lineTo(f.x + 34 + Math.sin(t * 5) * 3, y - 86); ctx.lineTo(f.x + 2, y - 74); ctx.closePath(); ctx.fill();
  }
  for (const w of c.fords) if (w.x1 > x0 && w.x0 < x1) {
    const y = minecartRail(st, w.lane, w.fork, w.x0);
    ctx.fillStyle = 'rgba(80,170,220,0.6)'; rr(w.x0 - 10, y - 2, w.x1 - w.x0 + 20, 26, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(210,245,255,0.85)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = w.x0 - 6; x <= w.x1 + 6; x += 8) ctx.lineTo(x, y + 6 + Math.sin(x / 9 + t * 4) * 2);
    ctx.stroke();
  }
  for (const b of c.beams) if (vis(b.x)) minecartDrawBeam(st, b);
  for (const r of c.rocks) if (vis(r.x)) minecartDrawRock(st, r);
  for (const w of c.curtains) if (vis(w.x)) minecartDrawCurtain(st, w);
  for (const l of c.lanterns) if (vis(l.x)) minecartDrawLantern(st, l);
  // the lantern at the mouth of the good track (a lantern sign)
  for (const fk of c.forks) {
    if (fk.sign !== 'lantern' || !vis(fk.x0 + MINECART.lanternAt)) continue;
    const lx = fk.x0 + MINECART.lanternAt, alive = fk.dead === 'u' ? 'd' : 'u';
    for (const ln of ['u', 'd']) {
      const y = minecartRail(st, ln, fk, lx) - 92;
      ctx.strokeStyle = '#2a190e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, y - 60); ctx.lineTo(lx, y - 8); ctx.stroke();
      const lit = ln === alive;
      if (lit) { const gl = ctx.createRadialGradient(lx, y, 2, lx, y, 60); gl.addColorStop(0, 'rgba(255,210,120,0.6)'); gl.addColorStop(1, 'rgba(255,210,120,0)'); ctx.fillStyle = gl; circle(lx, y, 60); ctx.fill(); }
      ctx.fillStyle = lit ? '#ffd27a' : '#4a4038'; rr(lx - 8, y - 8, 16, 18, 3); ctx.fill();
      ctx.fillStyle = '#2a190e'; ctx.fillRect(lx - 9, y - 10, 18, 3); ctx.fillRect(lx - 9, y + 8, 18, 3);
    }
  }
  for (const g of c.gold) if (!g.got && vis(g.x)) minecartDrawNugget(g.x, minecartRail(st, g.lane, g.fork, g.x) - 24 - g.h, 1, t + g.x * 0.01);
  if (c.station && vis(c.station.x)) minecartDrawStation(st);
}
function minecartDrawNugget(x, y, s, t) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 3) * 2); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(255,220,100,0.25)'; circle(0, 0, 14); ctx.fill();
  ctx.fillStyle = '#ffcf4a'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-9, 2); ctx.quadraticCurveTo(-10, -6, -3, -8); ctx.quadraticCurveTo(4, -11, 8, -4); ctx.quadraticCurveTo(12, 3, 5, 7); ctx.quadraticCurveTo(-4, 10, -9, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(-3, -4, 2.2); ctx.fill();
  const tw = 0.5 + 0.5 * Math.sin(t * 5);
  ctx.fillStyle = 'rgba(255,255,230,' + tw + ')'; minecartStarPath(6, -6, 4, 1.2, 0); ctx.fill();
  ctx.restore();
}
// a sign on a post: a wall sign (words), a SLOW sign, or a fork sign with its two rows (▲ and ▼)
function minecartDrawSign(st, s) {
  const y = minecartBase(st, s.x), x = s.x;
  if (s.kind === 'wall') {
    // a painted board hung under the track from two short chains
    ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(s.text).width + 28, top = y + 46;
    ctx.strokeStyle = '#2a190e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - w / 2 + 16, y + 8); ctx.lineTo(x - w / 2 + 16, top); ctx.moveTo(x + w / 2 - 16, y + 8); ctx.lineTo(x + w / 2 - 16, top); ctx.stroke();
    ctx.fillStyle = '#c98e57'; rr(x - w / 2, top, w, 34, 6); ctx.fill();
    ctx.strokeStyle = '#704622'; ctx.lineWidth = 2.5; rr(x - w / 2, top, w, 34, 6); ctx.stroke();
    text(s.text, x, top + 17.5, 15, '#3a200c', 'center', 'body');
    return;
  }
  if (s.kind === 'slow') {
    ctx.fillStyle = '#5a3a1c'; ctx.fillRect(x - 3, y - 120, 6, 120);
    ctx.fillStyle = '#ffcf4a'; ctx.strokeStyle = '#704622'; ctx.lineWidth = 3;
    ctx.save(); ctx.translate(x, y - 140); ctx.rotate(Math.PI / 4); rr(-26, -26, 52, 52, 6); ctx.fill(); ctx.stroke(); ctx.restore();
    text('SLOW', x, y - 146, 15, '#3a200c', 'center', 'body');
    // a little downhill arrow
    ctx.strokeStyle = '#3a200c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 13, y - 130); ctx.lineTo(x + 6, y - 120); ctx.stroke();
    ctx.fillStyle = '#3a200c'; ctx.beginPath(); ctx.moveTo(x + 13, y - 116); ctx.lineTo(x + 1, y - 115); ctx.lineTo(x + 7, y - 126); ctx.closePath(); ctx.fill();
    return;
  }
  const fk = s.fork, w = 96, h = 92, top = y - 240;
  const help = st.goldSigns && st.cart.x < fk.x0;
  ctx.fillStyle = '#5a3a1c'; ctx.fillRect(x - 4, top + h, 8, y - top - h);
  if (help) { ctx.fillStyle = 'rgba(255,197,61,' + (0.35 + 0.2 * Math.sin(G.clock * 6)) + ')'; rr(x - w / 2 - 10, top - 10, w + 20, h + 20, 16); ctx.fill(); }
  ctx.fillStyle = '#c98e57'; rr(x - w / 2, top, w, h, 8); ctx.fill();
  ctx.strokeStyle = help ? C.gold : '#704622'; ctx.lineWidth = 3; rr(x - w / 2, top, w, h, 8); ctx.stroke();
  ctx.strokeStyle = '#704622'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - w / 2 + 6, top + h / 2); ctx.lineTo(x + w / 2 - 6, top + h / 2); ctx.stroke();
  const rows = fk.sign === 'count' ? (s.part === 0 ? ['u'] : ['d']) : ['u', 'd'];
  for (const ln of ['u', 'd']) {
    const ry = top + (ln === 'u' ? h * 0.25 : h * 0.75), on = rows.includes(ln);
    // the arrow
    ctx.fillStyle = on ? '#3a200c' : 'rgba(58,32,12,0.25)';
    ctx.beginPath();
    if (ln === 'u') { ctx.moveTo(x - 34, ry + 9); ctx.lineTo(x - 24, ry - 9); ctx.lineTo(x - 14, ry + 9); }
    else { ctx.moveTo(x - 34, ry - 9); ctx.lineTo(x - 24, ry + 9); ctx.lineTo(x - 14, ry - 9); }
    ctx.closePath(); ctx.fill();
    if (!on) continue;
    minecartSignIcon(st, fk, ln, x + 16, ry);
  }
  // the gold help arrow beside the sign
  if (help && (s.part === fk.signX.length - 1)) {
    const up = fk.good === 'u', ax = x + w / 2 + 34, ay = top + h / 2, b = Math.sin(G.clock * 8) * 4;
    ctx.fillStyle = C.gold; ctx.strokeStyle = '#8a5a12'; ctx.lineWidth = 3;
    ctx.beginPath();
    if (up) { ctx.moveTo(ax, ay - 34 + b); ctx.lineTo(ax + 22, ay - 6 + b); ctx.lineTo(ax + 9, ay - 6 + b); ctx.lineTo(ax + 9, ay + 26 + b); ctx.lineTo(ax - 9, ay + 26 + b); ctx.lineTo(ax - 9, ay - 6 + b); ctx.lineTo(ax - 22, ay - 6 + b); }
    else { ctx.moveTo(ax, ay + 34 - b); ctx.lineTo(ax + 22, ay + 6 - b); ctx.lineTo(ax + 9, ay + 6 - b); ctx.lineTo(ax + 9, ay - 26 - b); ctx.lineTo(ax - 9, ay - 26 - b); ctx.lineTo(ax - 9, ay + 6 - b); ctx.lineTo(ax - 22, ay + 6 - b); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}
// the picture on one row of a fork sign
function minecartSignIcon(st, fk, ln, x, y) {
  const dead = fk.dead === ln;
  if (fk.sign === 'lantern') {
    // "follow the lantern": both rows show a lantern with a question: look at the track mouths
    ctx.fillStyle = '#ffd27a'; rr(x - 8, y - 9, 16, 18, 3); ctx.fill(); ctx.fillStyle = '#3a200c'; ctx.fillRect(x - 9, y - 11, 18, 3); ctx.fillRect(x - 9, y + 8, 18, 3);
    text('?', x + 22, y + 1, 18, '#3a200c', 'center');
    return;
  }
  if (dead) {
    ctx.strokeStyle = '#a3321e'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 14, y - 12); ctx.lineTo(x + 14, y + 12); ctx.moveTo(x + 14, y - 12); ctx.lineTo(x - 14, y + 12); ctx.stroke();
    ctx.lineCap = 'butt';
    return;
  }
  if (fk.sign === 'xonly') { text('?', x, y + 1, 22, 'rgba(58,32,12,0.55)', 'center'); return; }
  if (fk.sign === 'count') { minecartDrawNugget(x - 10, y + 2, 0.85, 0); text('×' + fk.gold[ln], x + 16, y + 1, 18, '#3a200c', 'center'); return; }
  if (fk.sign === 'both' && ln !== fk.good) {
    // the bumpier way: a beam or a puddle on it
    const hasBeam = st.c.beams.some(b => b.fork === fk && b.lane === ln);
    if (hasBeam) { ctx.fillStyle = '#7a4a28'; ctx.fillRect(x - 18, y - 8, 36, 9); ctx.fillStyle = '#3a200c'; ctx.fillRect(x - 15, y - 14, 3, 6); ctx.fillRect(x + 12, y - 14, 3, 6); ctx.fillStyle = '#3a200c'; ctx.beginPath(); ctx.arc(x, y + 9, 5, Math.PI, 0); ctx.fill(); }
    else { ctx.fillStyle = '#4fa8dc'; ctx.beginPath(); ctx.ellipse(x, y + 4, 18, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.quadraticCurveTo(x + 7, y - 2, x, y); ctx.quadraticCurveTo(x - 7, y - 2, x, y - 12); ctx.fill(); }
    return;
  }
  minecartDrawNugget(x - 6, y + 2, 0.9, 0); minecartDrawNugget(x + 10, y + 4, 0.7, 1);
}
function minecartDrawBeam(st, b) {
  const y = minecartRail(st, b.lane, b.fork, b.x), lift = b.hit ? minecartSmooth(clamp((G.time - b.hit) / 0.5, 0, 1)) : 0;
  const by = y - 54 - 16;
  ctx.fillStyle = '#5a3a1c'; ctx.fillRect(b.x - 44, by - 200, 8, 200); ctx.fillRect(b.x + 36, by - 200, 8, 200);
  ctx.save(); ctx.translate(b.x - 40, by + 8); ctx.rotate(-lift * 1.3);
  ctx.fillStyle = '#8a5a30'; rr(0, -8, 84, 18, 4); ctx.fill();
  ctx.strokeStyle = '#5a3a1c'; ctx.lineWidth = 2; rr(0, -8, 84, 18, 4); ctx.stroke();
  ctx.fillStyle = '#ffcf4a'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(10 + k * 20, 10); ctx.lineTo(18 + k * 20, -8); ctx.lineTo(24 + k * 20, -8); ctx.lineTo(16 + k * 20, 10); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function minecartDrawRock(st, r) {
  let x = r.x, y = minecartRail(st, r.lane, r.fork, r.x) - 16, a = 1, rot = 0;
  if (r.gone) { const u = clamp((G.time - r.gone) / 0.9, 0, 1); x += u * 140; y += u * u * 160 - Math.sin(u * Math.PI) * 50; a = 1 - u; rot = u * 6; }
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = '#8d7a6a'; ctx.strokeStyle = '#5a4a3e'; ctx.lineWidth = 2;
  ctx.beginPath(); for (let k = 0; k < 8; k++) { const an = k / 8 * Math.PI * 2, rr2 = 18 * (0.85 + 0.15 * Math.sin(k * 2.7)); ctx.lineTo(Math.cos(an) * rr2, Math.sin(an) * rr2 * 0.9); } ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; circle(-6, -6, 5); ctx.fill();
  ctx.restore();
}
function minecartDrawCurtain(st, w) {
  const y = minecartRail(st, w.lane, w.fork, w.x), t = G.clock, top = y - 300, bot = y - 52;
  const g = ctx.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, 'rgba(140,210,250,0.15)'); g.addColorStop(1, 'rgba(170,230,255,0.75)');
  ctx.fillStyle = g; ctx.fillRect(w.x - 26, top, 52, bot - top);
  ctx.strokeStyle = 'rgba(230,250,255,0.8)'; ctx.lineWidth = 2;
  for (let k = 0; k < 5; k++) { const xx = w.x - 20 + k * 10, off = ((t * 220 + k * 40) % 60); ctx.beginPath(); ctx.moveTo(xx, bot - off - 30); ctx.lineTo(xx, bot - off); ctx.stroke(); }
  ctx.fillStyle = 'rgba(220,245,255,0.8)'; for (let k = 0; k < 4; k++) { circle(w.x - 18 + k * 12, bot + Math.sin(t * 9 + k) * 3, 4); ctx.fill(); }
}
function minecartDrawLantern(st, l) {
  if (l.got && G.time - l.got > 0.5) return;
  const y = minecartRail(st, l.lane, l.fork, l.x) - 112, sw = Math.sin(G.clock * 2 + l.x) * 0.15;
  const u = l.got ? clamp((G.time - l.got) / 0.5, 0, 1) : 0;
  ctx.save(); ctx.translate(l.x, y - 70); ctx.rotate(sw); ctx.globalAlpha = 1 - u;
  ctx.strokeStyle = '#2a190e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -140); ctx.lineTo(0, 60); ctx.stroke();
  const gl = ctx.createRadialGradient(0, 70, 2, 0, 70, 46); gl.addColorStop(0, 'rgba(255,215,90,0.7)'); gl.addColorStop(1, 'rgba(255,215,90,0)');
  ctx.fillStyle = gl; circle(0, 70, 46); ctx.fill();
  ctx.fillStyle = C.gold; rr(-10, 58, 20, 24, 4); ctx.fill(); ctx.fillStyle = '#fff3c0'; rr(-5, 62, 10, 15, 3); ctx.fill();
  ctx.fillStyle = '#b8860b'; ctx.fillRect(-12, 55, 24, 4); ctx.fillRect(-12, 81, 24, 4);
  ctx.restore();
}
function minecartDrawStation(st) {
  const x = st.c.station.x, y = minecartBase(st, x);
  ctx.fillStyle = '#8a5a30'; ctx.fillRect(x - 150, y + 10, 300, 14);
  ctx.fillStyle = '#5a3a1c'; for (let k = 0; k < 6; k++) ctx.fillRect(x - 145 + k * 58, y + 24, 8, 60);
  ctx.fillStyle = '#5a3a1c'; ctx.fillRect(x + 196, y - 150, 8, 160);
  ctx.fillStyle = '#c98e57'; rr(x + 130, y - 196, 140, 48, 8); ctx.fill(); ctx.strokeStyle = '#704622'; ctx.lineWidth = 3; rr(x + 130, y - 196, 140, 48, 8); ctx.stroke();
  text('SWAP STOP', x + 200, y - 172, 20, '#3a200c', 'center');
  // Mabel naps by the station
  if (!st.mule) minecartMuleShape(x - 210, y + 10, 1, 'nap', G.clock);
}
// Mabel the mine mule: a grey-brown mule with big ears and a straw hat
function minecartDrawMule(st) {
  const mu = st.mule;
  if (!mu) return;
  const cart = st.cart, y = minecartCartRail(st) + cart.drop, t = G.clock;
  ctx.save();
  if (mu.phase === 'off') ctx.globalAlpha = clamp(1 - mu.t / 2.5, 0, 1);
  // the tow rope to the cart
  if (mu.phase === 'pull' || mu.phase === 'wave') {
    const my0 = minecartRailGuess(st, mu.x) - 44;
    ctx.strokeStyle = '#d9b77a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(mu.x + 34, my0); ctx.quadraticCurveTo((mu.x + cart.x) / 2, Math.max(my0, y - 18) + 14, cart.x - MINECART.half, y - 18); ctx.stroke();
  }
  const my = minecartRailGuess(st, mu.x);
  minecartMuleShape(mu.x, my, mu.phase === 'off' ? -1 : 1, mu.phase, t);
  if (mu.phase === 'wave' || (mu.phase === 'pull' && st.oops && st.oops.t > 1.0)) {
    ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
    const s = mu.phase === 'wave' ? 'Hee-haw!' : 'Up you come!';
    const w = ctx.measureText(s).width + 18, bx = mu.x - w / 2, by = my - 100;
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 2; rr(bx, by, w, 24, 10); ctx.fill(); ctx.stroke();
    text(s, mu.x, by + 12.5, 15, C.ink, 'center', 'body');
  }
  ctx.restore();
}
function minecartMuleShape(x, y, face, phase, t) {
  const walk = phase === 'in' || phase === 'off' ? Math.sin(t * 12) : 0, nap = phase === 'nap';
  ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
  // legs
  ctx.fillStyle = '#7d6a5c';
  for (const [lx, ph] of [[-20, 0], [-10, Math.PI], [14, Math.PI], [24, 0]]) ctx.fillRect(lx - 3 + (nap ? 0 : Math.sin(t * 12 + ph) * 3 * Math.abs(walk)), -22, 6, nap ? 10 : 22);
  // body
  ctx.fillStyle = '#9a8676'; ctx.beginPath(); ctx.ellipse(2, nap ? -16 : -32, 30, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c9b6a6'; ctx.beginPath(); ctx.ellipse(2, nap ? -10 : -26, 20, 7, 0, 0, Math.PI); ctx.fill();
  // tail
  ctx.strokeStyle = '#5a4a3e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-27, nap ? -18 : -36); ctx.quadraticCurveTo(-38, nap ? -14 : -30 + Math.sin(t * 4) * 4, -36, nap ? -6 : -20); ctx.stroke();
  // head and neck
  const hy = nap ? -18 : -50;
  ctx.fillStyle = '#9a8676'; ctx.beginPath(); ctx.ellipse(30, hy, 10, 13, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(40, hy + 6, 11, 8, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8ddd0'; ctx.beginPath(); ctx.ellipse(46, hy + 8, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.ink; circle(48, hy + 7, 1.3); ctx.fill();
  // big ears
  ctx.fillStyle = '#8a7666';
  ctx.beginPath(); ctx.ellipse(24, hy - 16, 4, 12, -0.3 + Math.sin(t * 2) * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(31, hy - 17, 4, 12, 0.2, 0, Math.PI * 2); ctx.fill();
  // eyes: sleepy when napping, happy otherwise
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8; ctx.beginPath();
  if (nap) { ctx.moveTo(33, hy - 2); ctx.lineTo(38, hy - 2); } else ctx.arc(35, hy - 2, 2.6, Math.PI + 0.3, -0.3);
  ctx.stroke();
  if (nap) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; text('z', 52, hy - 22 - Math.sin(t * 2) * 3, 14, '#fff3c0', 'center'); text('z', 60, hy - 36 - Math.sin(t * 2 + 1) * 3, 11, '#fff3c0', 'center'); }
  // a straw hat with a flower
  ctx.fillStyle = '#e8c27a'; ctx.beginPath(); ctx.ellipse(28, hy - 9, 15, 4, -0.2, 0, Math.PI * 2); ctx.fill();
  rr(21, hy - 19, 14, 10, 4); ctx.fill();
  ctx.fillStyle = '#ff6b8a'; circle(34, hy - 14, 3); ctx.fill();
  ctx.restore();
}
// the cart: wooden body on iron wheels, the lantern at the front, the lever at the back, the crew in cowboy hats
function minecartDrawCart(st) {
  const M = MINECART, cart = st.cart, t = G.clock;
  const rail = minecartCartRail(st) - cart.h + cart.drop, rattle = cart.v > 260 && cart.h <= 0 ? Math.sin(t * 50) * 1 : 0;
  // the gold piled up in the cart, then the crew, so the front wall of the cart hides their legs
  ctx.save(); ctx.translate(cart.x, rail + rattle); ctx.rotate(cart.tilt);
  const n = Math.min(16, Math.floor(st.gold / 3));
  for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? '#ffd54a' : '#ffe27a'; circle(-34 + (i % 8) * 9.5, -41 - Math.floor(i / 8) * 5, 5); ctx.fill(); }
  ctx.restore();
  for (const p of G.players) minecartDrawRider(st, p);
  ctx.save(); ctx.translate(cart.x, rail + rattle); ctx.rotate(cart.tilt);
  // wheels
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * M.wheelX, -M.wheelR + 2); ctx.rotate(cart.spin);
    ctx.fillStyle = '#3b3a45'; circle(0, 0, M.wheelR); ctx.fill();
    ctx.strokeStyle = '#8a8fa0'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.stroke(); }
    ctx.fillStyle = '#c9ced8'; circle(0, 0, 3); ctx.fill();
    ctx.restore();
  }
  // the body: a wooden tub, wider at the top, with iron bands and rivets
  ctx.fillStyle = '#8a5a30'; ctx.strokeStyle = '#4a2d18'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-M.half, -40); ctx.lineTo(M.half, -40); ctx.lineTo(M.half - 8, -10); ctx.lineTo(-M.half + 8, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#a06a3a'; for (let k = 0; k < 3; k++) ctx.fillRect(-M.half + 4 + k * 1.5, -36 + k * 9, 2 * M.half - 8 - k * 3, 3);
  ctx.fillStyle = '#5c6070'; ctx.fillRect(-M.half - 1, -42, 2 * M.half + 2, 5); ctx.fillRect(-M.half + 6, -16, 2 * M.half - 12, 4);
  ctx.fillStyle = '#c9ced8'; for (let k = -3; k <= 3; k++) { circle(k * 12, -39.5, 1.5); ctx.fill(); }
  // a stripe in each rider's colour
  ctx.fillStyle = PCOL[st.rider]; ctx.fillRect(4, -28, 30, 5);
  ctx.fillStyle = PCOL[st.sw]; ctx.fillRect(-34, -28, 30, 5);
  // the front lantern (the headlight) and the bell
  ctx.fillStyle = '#3a2516'; ctx.fillRect(M.half - 4, -52, 4, 14);
  ctx.fillStyle = st.dark ? '#fff1b0' : '#ffd27a'; rr(M.half - 2, -60, 12, 14, 3); ctx.fill();
  ctx.fillStyle = '#3a2516'; ctx.fillRect(M.half - 3, -62, 14, 3);
  const bs = cart.bellT > 0 ? Math.sin(t * 40) * 0.5 * cart.bellT : 0;
  ctx.save(); ctx.translate(M.half - 18, -44); ctx.rotate(bs);
  ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-6, -10, 0, -10); ctx.quadraticCurveTo(6, -10, 6, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
  // the big lever at the back: up or down (it swings to its place)
  const want = st.lever === 'up' ? 0 : 1;
  st.leverAnim = st.leverAnim == null || st.leverAnim < 0 ? want : st.leverAnim + (want - st.leverAnim) * 0.3;
  const la = minecartLerp(-2.25, -3.75, st.leverAnim);   // up and back, or down and back
  ctx.save(); ctx.translate(-M.half - 2, -26); ctx.rotate(la);
  ctx.strokeStyle = '#5c6070'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30, 0); ctx.stroke();
  ctx.fillStyle = '#e04a3a'; circle(32, 0, 6); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(30, -2, 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#3b3a45'; circle(-M.half - 2, -26, 4); ctx.fill();
  // UP / DOWN tag by the lever
  ctx.restore();
  if (st.state === 'ride' || st.state === 'oops') {
    const lx = cart.x - M.half - 40, ly = rail - 28;
    ctx.font = '700 11px "Atkinson Hyperlegible", system-ui, sans-serif';
    const s = st.lever === 'up' ? '▲ UP' : '▼ DOWN', w = ctx.measureText(s).width + 12;
    ctx.fillStyle = 'rgba(28,20,14,0.8)'; rr(lx - w, ly - 8, w, 17, 8.5); ctx.fill();
    ctx.strokeStyle = PCOL[st.sw]; ctx.lineWidth = 1.5; rr(lx - w, ly - 8, w, 17, 8.5); ctx.stroke();
    text(s, lx - w / 2, ly + 1, 11, '#fff3d6', 'center', 'body');
  }
}
function minecartDrawRider(st, p) {
  const cart = st.cart, s = minecartSeat(st, p.id);
  const sx = p.x, sy = p.y, sf = p.face, ssx = p.sx, ssy = p.sy;
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(cart.tilt);
  p.x = -PW / 2; p.y = -PH; p.alive = true; p.face = 1;
  const duck = st.state === 'swap' ? 0 : cart.duck;
  p.sy = 1 - duck * 0.28; p.sx = 1 + duck * 0.18;
  drawPlayer(p);
  // a cowboy hat (it flies off on a bonk and lands back)
  const hh = PH * p.sy;
  let hx = 0, hy = -hh - 1, hr = 0;
  if (cart.hatT >= 0) { const u = cart.hatT / 1.0; hy -= Math.sin(u * Math.PI) * 46; hx = Math.sin(u * Math.PI) * (p.id === st.rider ? 10 : -10); hr = u * Math.PI * 2 * (p.id ? 1 : -1); }
  ctx.translate(hx, hy); ctx.rotate(hr);
  ctx.fillStyle = '#8a5a30'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-8, -1); ctx.quadraticCurveTo(-8, -12, -3, -11); ctx.lineTo(0, -8); ctx.lineTo(3, -11); ctx.quadraticCurveTo(8, -12, 8, -1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PDARK[p.id]; ctx.fillRect(-8, -4, 16, 3);
  ctx.restore();
  p.x = sx; p.y = sy; p.face = sf; p.sx = ssx; p.sy = ssy;
}
// things that fly in front: gold zipping into the cart
function minecartDrawLooseFront(st) {
  const cart = st.cart, tx = cart.x, ty = minecartCartRail(st) - cart.h - 46;
  for (const f of st.goldFly) { const u = minecartSmooth(clamp(f.t / 0.55, 0, 1)); minecartDrawNugget(minecartLerp(f.x, tx, u), minecartLerp(f.y, ty, u) - Math.sin(u * Math.PI) * 30, 1 - u * 0.4, G.clock); }
}
// the dark stretch: only the cart lantern and a glow around the cart light the way
function minecartDrawDark(st) {
  if (st.state === 'finish' || st.state === 'swap') return;
  const cart = st.cart, cam = st.cam, M = MINECART;
  const rail = minecartCartRail(st) - cart.h + cart.drop;
  const ca = Math.cos(cart.tilt), sa = Math.sin(cart.tilt);
  const hx = cart.x + ca * (M.half + 4) - sa * -53 - cam.x, hy = rail + sa * (M.half + 4) + ca * -53 - cam.y;
  const bx = cart.x - cam.x, by = rail - 40 - cam.y, len = M.viewDark + 40, sp = 0.42, a0 = cart.tilt + 0.12;
  const ex = st.c.exit;
  const holes = k => {
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.cos(a0 - sp * k) * len * k, hy + Math.sin(a0 - sp * k) * len * k);
    ctx.lineTo(hx + Math.cos(a0 + sp * k) * len * k, hy + Math.sin(a0 + sp * k) * len * k);
    ctx.closePath();
    ctx.moveTo(bx + 130 * k, by); ctx.arc(bx, by, 130 * k, 0, Math.PI * 2);
    if (st.mule) { const mx = st.mule.x - cam.x, my = by + 10; ctx.moveTo(mx + 80 * k, my); ctx.arc(mx, my, 80 * k, 0, Math.PI * 2); }
  };
  ctx.save();
  if (ex) { ctx.beginPath(); ctx.rect(0, 0, clamp(ex.x - cam.x, 0, W), H); ctx.clip(); }
  for (const [k, a] of [[1.15, 0.55], [0.85, 0.5]]) {
    ctx.fillStyle = 'rgba(8,4,2,' + a + ')';
    ctx.beginPath(); ctx.rect(0, 0, W, H); holes(k); ctx.fill('evenodd');
  }
  ctx.restore();
}
// in the dark: lit lanterns, gold glints and signs inside the lantern's beam glow through
function minecartDrawGlows(st) {
  const cam = st.cam, cart = st.cart, t = G.clock;
  for (const g of st.c.gold) {
    if (g.got || g.x < cam.x - 20 || g.x > cam.x + W + 20) continue;
    const y = minecartRail(st, g.lane, g.fork, g.x) - 24 - g.h;
    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 3 + g.x);
    ctx.fillStyle = '#ffe27a'; minecartStarPath(g.x, y, 7, 2, t); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const fk of st.c.forks) {
    if (fk.sign !== 'lantern') continue;
    const lx = fk.x0 + MINECART.lanternAt, ln = fk.dead === 'u' ? 'd' : 'u';
    if (lx < cam.x - 60 || lx > cam.x + W + 60) continue;
    const y = minecartRail(st, ln, fk, lx) - 92;
    const gl = ctx.createRadialGradient(lx, y, 2, lx, y, 70); gl.addColorStop(0, 'rgba(255,210,120,0.7)'); gl.addColorStop(1, 'rgba(255,210,120,0)');
    ctx.fillStyle = gl; circle(lx, y, 70); ctx.fill();
    ctx.fillStyle = '#ffd27a'; rr(lx - 8, y - 8, 16, 18, 3); ctx.fill();
  }
  for (const l of st.c.lanterns) {
    if (l.got || l.x < cam.x - 60 || l.x > cam.x + W + 60) continue;
    const y = minecartRail(st, l.lane, l.fork, l.x) - 112;
    const gl = ctx.createRadialGradient(l.x, y, 2, l.x, y, 50); gl.addColorStop(0, 'rgba(255,215,90,0.7)'); gl.addColorStop(1, 'rgba(255,215,90,0)');
    ctx.fillStyle = gl; circle(l.x, y, 50); ctx.fill();
  }
  // a sign inside the beam gets a warm glow ring (it's lit up)
  for (const s of st.c.signs) {
    if (s.kind !== 'fork') continue;
    const d = s.x - cart.x;
    if (d < 40 || d > MINECART.viewDark) continue;
    const y = minecartBase(st, s.x) - 194, a = clamp((MINECART.viewDark - d) / 120, 0, 1);
    ctx.strokeStyle = 'rgba(255,230,150,' + (0.55 * a) + ')'; ctx.lineWidth = 4; rr(s.x - 54, y - 52, 108, 100, 12); ctx.stroke();
  }
}

/* ---------- the HUD: clock and gold, the job panels, prompts over the heads ---------- */
function minecartHud(st) {
  const big = hudBig(), z = big ? 1.4 : 1, ps = G.players, play = G.mode === 'play' || G.mode === 'paused', t = G.clock;
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = st.gold + ' / ' + (st.goldAll || st.c.goldMax);
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.3, gap = fs;
    const w = tw + gap + icon + fs * 0.4 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, C.paper, 'left', 'body');
    minecartDrawNugget(x0 + 15 + tw + gap + icon / 2, cy + 1, fs / 16, t);
    text(n, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, '#ffe27a', 'left', 'body');
    timeX0 = x0;
  }
  if (!play) return;
  const nd = minecartNeeds(st), R = st.rider, S = st.sw, cart = st.cart;
  // the job panels, bottom corners: Pip's on the left, Bo's on the right
  for (const id of [0, 1]) {
    const rider = id === R, pw = Math.round(262 * z), ph = Math.round(56 * z), py = H - ph - 10;
    const px = id === 0 ? 12 : W - 12 - pw;
    ctx.fillStyle = 'rgba(28,20,14,0.82)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = (!rider && st.goldSigns) ? C.gold : PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const cpuSeat = minecartQuiet(id);
    text(NAMES[id] + (rider ? ' rides up front' : ' works the lever') + (cpuSeat ? ' (computer)' : ''), px + 12 * z, py + 15 * z, 15 * z, PCOL[id], 'left');
    let chips;
    if (rider) {
      const hz = nd.hz, soon = hz && nd.hzD < 260;
      chips = [['up', 'JUMP', soon && (hz.kind === 'gap' || hz.kind === 'rock')], ['down', 'DUCK', soon && (hz.kind === 'beam' || hz.kind === 'curtain')], ['act', 'GRAB', !!nd.lantern && Math.abs(nd.lantern.x - cart.x) < 90]];
    } else {
      const wrong = nd.want && nd.want !== st.lever && nd.forkD < 700;
      chips = [['lever', 'LEVER ' + (st.lever === 'up' ? 'UP' : 'DOWN'), !!(wrong && st.goldSigns)], ['act', 'BRAKE', nd.brake || (cart.braking && cart.v > MINECART.brakeMin + 10)]];
    }
    const n = chips.length, cw = (pw - 24 * z - (n - 1) * 8 * z) / n;
    chips.forEach(([k, lab, on], i) => {
      const cx = px + 12 * z + i * (cw + 8 * z), cy = py + 26 * z, chh = 24 * z;
      ctx.fillStyle = on ? (Math.sin(t * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : 'rgba(255,255,255,0.12)';
      rr(cx, cy, cw, chh, chh / 2); ctx.fill();
      const kk = cpuSeat ? '' : minecartKey(id, k);
      let fs = 12 * z, s = (kk ? kk + ' ' : '') + lab;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      while (fs > 8 && ctx.measureText(s).width > cw - 8) { fs -= 0.5; ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; }
      text(s, cx + cw / 2, cy + chh / 2 + 0.5, fs, on ? C.ink : '#efe0c8', 'center', 'body');
    });
  }
  // the message line (gold help): between the level pill and the clock when it fits, else under the stretch pill
  if (st.msg) {
    let fs = big ? 20 : 14;
    const h = big ? 32 : 26, font = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
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
  // prompts over the heads: the rider's opens to the right, the switcher's to the left, so they never overlap.
  // A hint bubble replaces that player's prompt while it shows.
  const fs = 14 * z, yMax = H - Math.round(56 * z) - 18;
  const place = (p, w, h) => {
    const hx = p.x + PW / 2, right = p.id === R;
    let top = p.y - 30 * z - h;
    if (typeof CPU === 'object' && cpuSolo() && !cpuOn(p.id)) { const cb = CPU.bubbles[1 - p.id]; if (cb && cb.t > 0) top = Math.min(top, p.y - 22 - (big ? 30 : 22) - 10 - h); }
    const y = clamp(top, big ? 96 : 82, yMax - h);
    return { x: clamp(right ? hx - 10 * z : hx + 10 * z - w, 4, W - w - 4), y };
  };
  const say = (p, str, col, pulse) => {
    if (minecartQuiet(p.id) || st.hints[p.id]) return;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, o = place(p, w, h);
    const s = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(o.x + w / 2, o.y + h / 2); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(28,20,14,0.86)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
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
  const Rp = ps[R], Sp = ps[S], v = Math.max(80, cart.v);
  // the rider: what comes next on the track
  const hz = nd.hz, secs = nd.hzD / v;
  if (hz && secs < 1.3) {
    if (hz.kind === 'gap') say(Rp, (hz.o.spring ? 'Gold spring! Jump ' : 'Gap! Jump ') + minecartKey(R, 'up'), C.gold, secs < 0.45);
    else if (hz.kind === 'rock') say(Rp, 'Rock! Jump ' + minecartKey(R, 'up'), C.gold, secs < 0.4);
    else if (hz.kind === 'beam') say(Rp, 'Low beam! Duck ' + minecartKey(R, 'down'), C.gold, secs < 0.6);
    else if (hz.kind === 'curtain') say(Rp, 'Waterfall! Duck ' + minecartKey(R, 'down'), '#bfe8ff', secs < 0.6);
  } else if (nd.lantern && Math.abs(nd.lantern.x - cart.x) < 110) say(Rp, 'Grab the lantern! ' + minecartKey(R, 'act'), C.gold, true);
  else if (nd.high && nd.high.x - cart.x < 200) say(Rp, 'Gold up high! Jump ' + minecartKey(R, 'up'), '#ffe7a8', false);
  // the switcher: the next fork (only once its sign can be seen), the brake
  if (nd.brake || (nd.bend && nd.bendD < 0 && cart.v > MINECART.bendMax - 40)) say(Sp, 'Steep! Hold ' + minecartKey(S, 'act') + ' to brake', C.gold, true);
  else if (nd.fork && nd.forkD < 900 && (nd.seen || st.goldSigns) && !st.c.signs.some(sg => sg.kind === 'fork' && sg.x > cart.x - 270 && sg.x < cart.x + 70)) {
    const fk = nd.fork;
    if (st.goldSigns) say(Sp, nd.want === st.lever ? 'Lever ' + (st.lever === 'up' ? 'up' : 'down') + ': good!' : 'Go ' + (nd.want === 'up' ? 'up ' + minecartKey(S, 'up') : 'down ' + minecartKey(S, 'down')), C.gold, nd.want !== st.lever);
    else {
      const ask = fk.sign === 'lantern' ? 'Follow the lit lantern! ' : fk.sign === 'count' ? 'More gold which way? ' : fk.sign === 'xonly' ? 'Miss the X! ' : 'Read the sign: ';
      say(Sp, ask + minecartKey(S, 'up') + ' or ' + minecartKey(S, 'down'), '#ffe7a8', false);
    }
  }
  for (const p of ps) if (st.hints[p.id]) bubble(p, st.hints[p.id].text);
}

/* ---------- sounds ---------- */
Sfx.extra.minecartClack = function () { this.tone(180 + Math.random() * 20, 0.04, 'square', 0.018, 120); this.tone(150, 0.04, 'square', 0.014, 100, 0.07); };
Sfx.extra.minecartLever = function () { this.tone(320, 0.06, 'square', 0.04, 200); this.tone(900, 0.05, 'triangle', 0.035, 700, 0.05); };
Sfx.extra.minecartClick = function () { this.tone(700, 0.04, 'triangle', 0.025, 600); };
Sfx.extra.minecartSwitch = function () { this.tone(500, 0.05, 'square', 0.03, 300); this.tone(260, 0.08, 'triangle', 0.04, 200, 0.04); };
Sfx.extra.minecartBrake = function () { this.tone(1500 + Math.random() * 300, 0.12, 'sawtooth', 0.012, 1200); };
Sfx.extra.minecartHop = function () { this.tone(260, 0.2, 'sine', 0.06, 640); };
Sfx.extra.minecartSpring = function () { this.tone(180, 0.35, 'sine', 0.08, 900); this.tone(360, 0.25, 'triangle', 0.03, 1200, 0.05); };
Sfx.extra.minecartLand = function () { this.tone(110, 0.14, 'triangle', 0.07, 70); this.tone(240, 0.06, 'square', 0.02, 160, 0.03); };
Sfx.extra.minecartGold = function (p) { const f = 1319 * (p || 1); this.tone(f, 0.07, 'triangle', 0.045); this.tone(f * 1.5, 0.08, 'triangle', 0.035, null, 0.05); };
Sfx.extra.minecartLantern = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.minecartBell = function () { this.tone(1760, 0.5, 'sine', 0.05, 1740); this.tone(2637, 0.3, 'sine', 0.02, null, 0.01); };
Sfx.extra.minecartBonk = function () { this.tone(220, 0.14, 'triangle', 0.09, 110); this.tone(880, 0.06, 'square', 0.025, 500); this.tone(1320, 0.18, 'sine', 0.03, 1500, 0.1); };
Sfx.extra.minecartWobble = function () { for (let i = 0; i < 5; i++) this.tone(260 + (i % 2) * 80, 0.07, 'square', 0.03, null, i * 0.07); };
Sfx.extra.minecartSplash = function () { this.tone(600, 0.3, 'sawtooth', 0.015, 120); this.tone(300, 0.25, 'sine', 0.05, 90, 0.03); };
Sfx.extra.minecartBump = function () { this.tone(140, 0.2, 'triangle', 0.08, 80); this.tone(400, 0.3, 'sine', 0.03, 200, 0.08); };
Sfx.extra.minecartWhoops = function () { this.tone(700, 0.45, 'sine', 0.06, 220); this.tone(500, 0.3, 'triangle', 0.025, 160, 0.1); };
Sfx.extra.minecartHeehaw = function () { this.tone(520, 0.18, 'sawtooth', 0.03, 380); this.tone(300, 0.26, 'sawtooth', 0.035, 240, 0.2); this.tone(520, 0.18, 'sawtooth', 0.03, 380, 0.5); this.tone(300, 0.26, 'sawtooth', 0.035, 240, 0.7); };
Sfx.extra.minecartFlag = function () { [523, 784, 1047].forEach((f, i) => this.tone(f, 0.11, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.minecartHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.minecartSwap = function () { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.minecartLoaded = function () { [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.055, null, i * 0.08)); };
Sfx.extra.minecartPour = function () { for (let i = 0; i < 9; i++) this.tone(1200 + (i % 3) * 300, 0.06, 'triangle', 0.035, null, i * 0.11); };
Sfx.extra.minecartDing = function () { this.tone(1568, 0.6, 'sine', 0.06); [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.045, null, 0.15 + i * 0.08)); };
/* ===== end of MODES.minecart ===== */
