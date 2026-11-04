/* Pip & Bo - Level 15-3 Moon Buggy Crew (team, World 15 Orbit Outpost). */
'use strict';

/* ===== 15-3 Moon Buggy Crew (mode 'buggy', World 15 "Orbit Outpost", team) =====
   Both ride one bouncy two-seat moon buggy along the bumpy moon, seen from the side. The mode owns the tick, the camera,
   the whole picture and the HUD (def.ownStep + def.ownHUD); the engine grid is empty apart from the two spawns.
   The DRIVER: ◀ ▶ gas, brake and reverse (with nothing pressed the buggy holds still, even on a slope), ▲ hops (low
   gravity, springy wheels), and in the air ◀ ▶ tilt the buggy to land level. The action honks: it wakes a sleepy
   critter napping on the track (it hops away) and opens the rocket's hatch at the end. Hold ▼ to call Tow-Bot, who
   carries the buggy back to the last flag (a way out of anything).
   The ARM worker moves the claw of the grabber arm on the back with ◀ ▶ ▲ ▼ (the stick works too) and presses the
   action to grab and again to let go. Holding the action on a shiny moon rock grabs it too. Moon rocks pop into the
   hopper (the score). A boulder on the track stops the buggy ("Bonk!"): grab it, swing it back behind the buggy and let
   go, and it bounces off into the distance. Dropped anywhere else it just sits on the track again. A crater too wide to
   jump is filled with boulders from the rock pile beside it (3 drops). At the rocket pad the driver parks in the box and
   honks the hatch open, and the arm lifts the rock crate from the hopper into the hatch: 3, 2, 1, blast off home!
   So the driver can't get past a boulder alone, and the arm goes nowhere without the driver.
   Soft fails only ("Whoopsie!"): falling into a crater, or tipping the buggy over, calls Tow-Bot, the friendly hover
   robot, who lifts it back to the last flag (a tip-over on safe flat ground is set right on the spot). Rocks stay
   collected, boulders stay cleared.
   Gold help (announced): Gold springs (a bigger hop) after 2 misses at a hop crater, and a gold bridge after 3; a Gold
   boost on a jump ramp after 2 misses, and a gold bridge after 4 (only tries the driver took part in); a Gold magnet
   claw after 20 s stuck at a boulder while the arm is trying; Tow-Bot drops boulders into a crater the crew has been
   filling for 35 s; a Gold gyro after 3 tip-overs in a room; a wider gold parking box and a hatch magnet at the end.
   Rooms swap the jobs at the swap arch. Room 3 is dark: only the headlight and the claw lamp light the way.
   Room def: { title, driver: 0|1, dark, tip, act, course: [tokens] }. Course tokens (lengths in px, +dx shifts an
   object forward from where the course has got to):
     fN hN uN dN UN DN   flat / bumpy / gentle up / gentle down / steep up / steep down for N px
     sN    a shallow dip (a bouncy bump)          cN    a crater N px wide (hop it)
     jN    a jump ramp, then a crater N px wide    wN    a crater too wide to jump: fill it (a rock pile stands before it)
     oN    a bouncy moss bowl (BOING!)            b[+dx]  a boulder on the track      k[+dx]  a sleepy critter
     rH[+dx]  a moon rock H px above the ground    R[+dx]  a rock pillar with a moon rock on top
     F     a checkpoint flag    S:text  a sign ({D} the driver's name, {A} the arm worker's)    X  the swap arch (room end)
     E     the rocket pad (the finish)
   Every global is prefixed buggy / BUGGY (and Sfx.extra.buggy*); all state lives in G.mst. */
const BUGGY = {
  g: 600,                                        // moon gravity (px/s^2)
  half: 48, wx: 31, wy: 10, wr: 14, ext: 20,     // body half-length; wheel mounts (local), wheel radius, spring travel
  k: 34, kd: 3.4, kdUp: 6, kHard: 900, wallPen: 14, I: 1100, angDampG: 4, angDampA: 0.6,
  acc: 300, vMax: 255, brake: 560, vRev: 120, roll: 35, hold: 460, vCap: 290,
  hopV: 245, hopCD: 0.45, springUp: 260, fMax: 6000, tiltA: 3.2, gyro: 4.5, gyroGold: 9,
  mossV: 390, rampH: 46, rampL: 110, rampKick: 0.45, pitD: 150, fillD: 110, fillNeed: 3,
  pivot: [-36, -27], clawMin: 26, clawMax: 168, clawSp: 290, clawHeavy: 215, clawAcc: 2600,
  grabR: 26, grabRGold: 44, rockR: 9, boulderR: 28, critterR: 18,
  boxW: 34, boxWGold: 80, hatchR: 40, hatchRGold: 90,
  towHold: 1.2, oopsT: 2.9, swapT: 1.9, finT: 5.2, hintLife: 2.8,
  helpHop: 2, helpHopBridge: 3, helpRamp: 2, helpRampBridge: 4, magnetT: 20, fillHelpT: 35, fillHelpEvery: 12,
  gyroFlips: 3, parkHelpT: 15, hatchHelpT: 20, tryWin: 5,
  camLead: 330, camY: 380,
};
const buggyLerp = (a, b, u) => a + (b - a) * u;
const buggySmooth = u => u * u * (3 - 2 * u);

/* ---------- the course: tokens -> ground heights (2 px steps), craters, objects ---------- */
function buggyCompile(def) {
  const B = BUGGY, X0 = -700, drv = def.driver || 0;
  const name = s => s.replace(/\{D\}/g, NAMES[drv]).replace(/\{A\}/g, NAMES[1 - drv]);
  const c = { x0: X0, pits: [], dips: [], moss: [], boulders: [], critters: [], rocks: [], flags: [], signs: [], deco: [], ledges: [], piles: [], gate: null, pad: null };
  const ys = [];
  let x = X0, y = 0;
  const seg = (len, fn) => { len = Math.max(2, Math.round(len / 2) * 2); for (let k = 0; k < len; k += 2) ys.push(fn(k, len)); x += len; return len; };
  seg(-X0, () => y);
  for (const tk of def.course || []) {
    const t = String(tk), ch = t[0];
    if (t[1] === ':') {
      if (ch === 'S') c.signs.push({ x, text: name(t.slice(2)) });
      else if (ch === 'D') c.deco.push({ x, kind: t.slice(2) });
      continue;
    }
    const plus = t.indexOf('+'), n = parseInt(t.slice(1, plus < 0 ? undefined : plus), 10) || 0, dx = plus < 0 ? 0 : parseInt(t.slice(plus + 1), 10) || 0;
    const x0 = x, y0 = y;
    if (ch === 'f') seg(n, () => y0);
    else if (ch === 'h') { const m = Math.max(1, Math.round(n / 130)); seg(n, (k, L) => y0 - 10 * Math.pow(Math.sin(Math.PI * m * k / L), 2)); }
    else if ('udUD'.includes(ch)) {
      const s = { u: -0.16, d: 0.16, U: -0.3, D: 0.3 }[ch], Bl = 40;
      const len = seg(n, (k, L) => y0 + s * (k < Bl ? k * k / (2 * Bl) : k < L - Bl ? k - Bl / 2 : (L - Bl) - (L - k) * (L - k) / (2 * Bl)));
      y = y0 + s * (len - Bl);
    } else if (ch === 's') { const L = seg(n, (k, L) => y0 + 14 * Math.pow(Math.sin(Math.PI * k / L), 2)); c.dips.push({ x0, x1: x0 + L }); }
    else if (ch === 'c' || ch === 'w') {
      const D = ch === 'w' ? B.fillD : B.pitD;
      const L = seg(n, (k, L) => y0 + D * Math.min(1, Math.min(k, L - k) / 8));
      const p = { x0, x1: x0 + L, rim: y0, lipY: y0, depth: D, kind: ch === 'w' ? 'fill' : 'hop', tries: 0, fails: 0, gold: 0, bridge: false, filled: 0, need: B.fillNeed, t: 0, helpT: 0 };
      c.pits.push(p);
      if (ch === 'w') c.piles.push({ x: x0 - 150, pit: p });
    } else if (ch === 'j') {
      seg(B.rampL, (k, L) => y0 - B.rampH * Math.pow(k / L, 1.6));
      const lip = y0 - B.rampH, px0 = x;
      const L = seg(n, (k, L) => (k < 8 ? lip + (y0 + B.pitD - lip) * k / 8 : k > L - 8 ? y0 + B.pitD * (L - k) / 8 : y0 + B.pitD));
      c.pits.push({ x0: px0, x1: px0 + L, rim: y0, lipY: lip, depth: B.pitD, kind: 'ramp', rampX0: x0, tries: 0, fails: 0, gold: 0, bridge: false });
    } else if (ch === 'o') { const L = seg(n, (k, L) => y0 + 30 * Math.pow(Math.sin(Math.PI * k / L), 2)); c.moss.push({ x0, x1: x0 + L, cd: 0 }); }
    else if (ch === 'b') c.boulders.push({ x: x + dx, home: x + dx, y: 0, r: B.boulderR, state: 'track', vx: 0, vy: 0, spin: 0, t: 0, pile: false });
    else if (ch === 'k') c.critters.push({ x: x + dx, state: 'sleep', t: 0, ph: c.critters.length * 1.7 });
    else if (ch === 'r') c.rocks.push({ x: x + dx, h: n, got: false, float: n > 30, ph: c.rocks.length * 1.3, t: 0 });
    else if (ch === 'R') { c.ledges.push({ x: x + dx }); c.rocks.push({ x: x + dx, h: 136, got: false, float: false, ledge: true, ph: c.rocks.length * 1.3, t: 0 }); }
    else if (ch === 'F') c.flags.push({ x, on: false, t: 0 });
    else if (ch === 'X') { c.gate = { x: x + 40 }; seg(700, () => y0); }
    else if (ch === 'E') { c.pad = { x0: x, x1: x + 820, box: x + 500, rocket: x + 640, open: false, openT: 0 }; seg(1100, () => y0); }
  }
  seg(1400, () => y);
  c.gy = Float32Array.from(ys);
  c.len = x;
  return c;
}
// the ground under x (crater floors, filled craters and gold bridges included)
function buggyGround(st, x) {
  const c = st.c, a = c.gy, f = (x - c.x0) / 2, i = Math.floor(f);
  let y = i < 0 ? a[0] : i >= a.length - 1 ? a[a.length - 1] : a[i] + (a[i + 1] - a[i]) * (f - i);
  for (const p of c.pits) {
    if (x <= p.x0 || x >= p.x1) continue;
    if (p.bridge) y = Math.min(y, buggyLerp(p.lipY, p.rim, (x - p.x0) / (p.x1 - p.x0)) + 2);
    else if (p.kind === 'fill' && p.filled) y = Math.min(y, p.rim + p.depth * (1 - p.filled / p.need) + (p.filled >= p.need ? 2 : 0));
  }
  return y;
}
// the lowest a wheel's centre can be at x (a circle resting on the ground)
function buggyWheelGround(st, x) {
  const r = BUGGY.wr;
  let best = Infinity;
  for (let d = -r + 1; d <= r - 1; d += 3) best = Math.min(best, buggyGround(st, x + d) - Math.sqrt(r * r - d * d));
  return best;
}
const buggyPitAt = (st, x) => st.c.pits.find(p => x > p.x0 && x < p.x1) || null;
// a crater still open (not bridged or filled)
const buggyOpen = p => !p.bridge && !(p.kind === 'fill' && p.filled >= p.need);

// each player's own keys, for prompts and the HUD (a player with a controller is shown its buttons)
function buggyKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'jump') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'down') return pad ? '▼' : touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'left') return pad ? '◀' : touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'right') return pad ? '▶' : touch ? '▶' : id === 0 ? 'D' : '→';
  if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
  if (what === 'claw') return pad ? 'stick' : touch ? '◀▶▲▼' : id === 0 ? 'WASD' : '↑←↓→';
  return pad ? 'stick' : touch ? '◀ ▶' : id === 0 ? 'A D' : '← →';
}
// 1-player mode: the computer's own job gets no key hints or prompts (it knows its job)
const buggyQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

/* ---------- a room ---------- */
function buggyRoom(st, L, k) {
  const def = L.def;
  st.k = k; st.drv = def.driver || 0; st.armId = 1 - st.drv; st.title = def.title || ''; st.dark = !!def.dark;
  st.c = buggyCompile(def);
  for (const b of st.c.boulders) b.y = buggyGround(st, b.x) - b.r + 3;
  st.stats.roomT[k] = null; st.stats.roomTitles[k] = st.title;
  st.rocksN += st.c.rocks.length;
  st.cp = { x: 0 }; st.flips = 0; st.gyro = false; st.magnet = false;
  st.state = 'drive'; st.t = 0; st.oops = null; st.swap = null; st.fin = null; st.parked = false; st.parkT = 0; st.padT = 0;
  st.crate = { where: 'hopper', x: 0, y: 0, vy: 0 };
  st.blockT = 0; st.towHold = 0; st.hornT = 0; st.honkVis = 0; st.stuckT = 0;
  buggyPlace(st, 0);
  st.cam = { x: st.bg.x - BUGGY.camLead, y: st.bg.y - BUGGY.camY + 40 };
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null; st.wrongT = [0, 0];
  st.roomT = 0; st.segStart = G.time; st.inT = [-99, -99];
  buggyActLabels(st);
  buggyMirror(st);
}
// the buggy at x, level and still, the claw folded up
function buggyPlace(st, x) {
  const B = BUGGY, gy = buggyGround(st, x);
  const rest = B.wy + (B.ext - (B.g / 2) / B.k) + B.wr;   // body centre above the ground at rest
  const prev = st.bg;
  st.bg = { x, y: gy - rest, vx: 0, vy: 0, a: 0, w: 0, px: x, air: false, airT: 0, hopCD: 0.3, contacts: 2,
    wh: [{ c: 0, cp: 0, spin: prev ? prev.wh[0].spin : 0, x, y: gy - B.wr, on: true }, { c: 0, cp: 0, spin: prev ? prev.wh[1].spin : 0, x, y: gy - B.wr, on: true }],
    bump: 0, vf: 0, lean: 0 };
  for (const w of st.bg.wh) { w.c = B.ext - (rest - B.wy - B.wr); w.cp = w.c; }
  st.arm = { ox: 70, oy: -60, vx: 0, vy: 0, wx: 0, wy: 0, hold: null, shut: 0, lastOx: 70, lastOy: -60, wvx: 0, wvy: 0 };
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function buggyStep(st, dt) {
  if (!st.bg) return;
  const ps = G.players;
  for (const k of [0, 1]) {
    const i = ps[k].input;
    if (i.left || i.right || i.jump || i.down || i.up || i.act || ps[k].pendingJump) st.inT[k] = G.time;
  }
  st.roomT += dt; st.t += dt;
  if (G.introT > 0) { for (const p of ps) { p.pendingJump = false; p.pendingAct = false; } }
  else if (st.state === 'drive') buggyDrive(st, dt);
  else if (st.state === 'oops') buggyOopsStep(st, dt);
  else if (st.state === 'swap') { if (buggySwapStep(st, dt)) return; }
  else if (st.state === 'finish') { if (buggyFinStep(st, dt)) return; }
  buggyCam(st, dt);
  buggyFx(st, dt);
  buggyMirror(st);
}
function buggyDrive(st, dt) {
  const B = BUGGY, ps = G.players, D = ps[st.drv], A = ps[st.armId], di = D.input, ai = A.input, b = st.bg;
  const hop = D.pendingJump, honk = D.pendingAct, grab = A.pendingAct;
  for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
  // the driver: gas / brake / reverse on the ground, tilt in the air; parked at the rocket, the buggy stays put
  let thr = (di.right ? 1 : 0) - (di.left ? 1 : 0);
  if (st.parked) thr = 0;
  // hold ▼ (and nothing else) to call Tow-Bot back to the last flag
  if (di.down && !di.left && !di.right && !st.parked) { st.towHold += dt; if (st.towHold >= B.towHold) { st.towHold = 0; buggyStartOops(st, 'tow'); return; } }
  else st.towHold = 0;
  if (honk) buggyHonk(st);
  buggyPhysics(st, dt, thr, hop && !st.parked);
  buggyBlockers(st, dt);
  if (thr && Math.abs(b.vf) < 6 && (b.contacts || Math.abs(b.vy) < 8)) st.stuckT += dt; else st.stuckT = 0;
  if (thr || Math.abs(b.vf) > 40) { st.puttT = (st.puttT || 0) - dt; if (st.puttT <= 0) { st.puttT = thr ? 0.15 : 0.3; Sfx.play('buggyPutt'); } }
  buggyArmStep(st, dt, ai, grab);
  buggyObjects(st, dt);
  // flags, the swap arch, the rocket pad
  for (const f of st.c.flags) if (!f.on && b.x > f.x) {
    f.on = true; st.cp = { x: f.x + 70 };
    Sfx.play('buggyFlag'); buggyPop(st, f.x, buggyGround(st, f.x) - 110, 'Checkpoint!', '#8fe3b0', 22);
  }
  if (st.c.gate && b.x > st.c.gate.x && st.state === 'drive') { buggyStartSwap(st); return; }
  buggyPad(st, dt);
  if (st.state !== 'drive') return;
  // whoopsies: down a crater, or tipped over
  const pit = buggyPitAt(st, b.x);
  if (pit && buggyOpen(pit) && b.y > pit.rim + 40) { buggyStartOops(st, 'pit', pit); return; }
  if (buggyTipped(st)) { buggyStartOops(st, 'flip'); return; }
  buggyHelp(st, dt);
  buggyNudges(st, dt, di, ai);
}

/* ---------- the buggy: a springy two-wheel body ---------- */
function buggyPhysics(st, dt, thr, hop) {
  const B = BUGGY, b = st.bg;
  const ca = Math.cos(b.a), sa = Math.sin(b.a), fx = ca, fy = sa, dx = -sa, dy = ca;   // forward and down (body axes)
  let ax = 0, ay = B.g, al = 0, n = 0, wall = false;
  const springs = [];
  for (const k of [0, 1]) {
    const w = b.wh[k], s = k ? 1 : -1;
    const mx = b.x + fx * s * B.wx + dx * B.wy, my = b.y + fy * s * B.wx + dy * B.wy;
    let c = 0;
    const prx = w.rx;
    if (dy > 0.3) {
      const rx = mx + dx * (B.ext - w.c), gc = buggyWheelGround(st, rx);
      c = B.ext - (gc - my) / dy;
      // a wall: the ground under the wheel rose sharply since the last step (a crater's far side), not a body sinking
      if (w.rx != null && c - w.cp > B.wallPen && c > B.ext * 0.6 && buggyWheelGround(st, w.rx) - gc > 3) wall = true;
      w.rx = rx;
    } else w.rx = null;
    springs.push({ w, mx, my, c, prx });
  }
  if (wall) {
    // a wheel ran into a crater wall: back to where we were, bounce off it a little
    b.x = b.px; b.vx = -b.vx * 0.25;
    for (const s of springs) { s.c = s.w.cp; s.w.rx = s.prx; }
  }
  for (const s of springs) {
    const w = s.w, c = s.c;
    w.on = c > 0;
    if (c > 0) {
      n++;
      const dc = (c - w.cp) / dt;
      let F = B.k * c + (dc > 0 ? B.kd : B.kdUp) * dc;
      if (c > B.ext) F += B.kHard * (c - B.ext);
      F = clamp(F, 0, B.fMax);   // (a wheel jammed against a crater wall never catapults the buggy)
      const Fx = -dx * F, Fy = -dy * F;
      ax += Fx; ay += Fy;
      al += ((s.mx - b.x) * Fy - (s.my - b.y) * Fx) / B.I;
    }
    w.cp = Math.max(0, c); w.c = Math.max(0, c);
    w.x = s.mx + dx * (B.ext - Math.min(B.ext, w.c)); w.y = s.my + dy * (B.ext - Math.min(B.ext, w.c));
  }
  // leaving a jump ramp's lip: the ramp kicks the buggy up (a hop on top of it carries it over the crater)
  if (!n && b.contacts) { const rp = st.c.pits.find(p => p.kind === 'ramp' && b.x > p.x0 - 80 && b.x < p.x0 + 30); if (rp && b.vx > 0) b.vy -= b.vx * B.rampKick; }
  b.contacts = n;
  const vf = b.vx * fx + b.vy * fy;
  if (n) {
    // drive along the body: gas, brake, reverse; with nothing pressed it holds still (and doesn't roll down slopes)
    let af;
    if (thr > 0) af = vf < 0 ? B.brake : B.acc * clamp((B.vMax - vf) / 40, 0, 1);
    else if (thr < 0) af = vf > 0 ? -B.brake : -B.acc * 0.7 * clamp((B.vRev + vf) / 30, 0, 1);
    else af = Math.abs(vf) < 30 ? clamp(-vf / dt - B.g * fy, -B.hold, B.hold) : -Math.sign(vf) * B.roll;
    const share = n === 2 ? 1 : 0.6;
    ax += fx * af * share; ay += fy * af * share;
    // gold boost on a ramp
    const rp = st.c.pits.find(p => p.kind === 'ramp' && p.gold >= 1 && b.x > p.rampX0 - 60 && b.x < p.x0);
    if (rp && thr > 0 && vf < 275) { ax += fx * 500; ay += fy * 500; }
  }
  // (no hop on top of a moss bounce: the two together would fly over anything)
  if (hop && b.hopCD <= 0 && n && !(b.mossT > 0)) {
    let v = B.hopV * (n === 2 ? 1 : 0.85);
    const gp = st.c.pits.find(p => (p.kind === 'hop' || p.kind === 'ramp') && p.gold >= 1 && b.x > (p.kind === 'ramp' ? p.rampX0 : p.x0 - 240) - 20 && b.x < p.x0 + 20);
    if (gp) v *= gp.kind === 'ramp' ? 1.3 : 1.35;
    b.vy = Math.min(b.vy, 0) - v; b.hopCD = B.hopCD;   // (straight up: a hop on a ramp keeps its speed)
    Sfx.play('buggyHop', st.drv); st.stats.hops++;
    if (gp) buggySpark(st, b.x, b.y + 30, C.gold, 10);
  }
  if (b.hopCD > 0) b.hopCD -= dt;
  if (b.mossT > 0) b.mossT -= dt;
  // in the air: ◀ ▶ tilt; a little gyro keeps it from spinning (the gold gyro much more)
  if (!n) {
    al += thr * B.tiltA;
    const ga = st.gyro ? B.gyroGold : B.gyro;
    al += -ga * b.a - (st.gyro ? 1.5 : 0.3) * b.w;
    al -= b.w * B.angDampA;
  } else al -= b.w * B.angDampG;
  // bouncy moss
  for (const m of st.c.moss) {
    if (m.cd > 0) { m.cd -= dt; continue; }
    if (n && b.x > m.x0 + (m.x1 - m.x0) * 0.25 && b.x < m.x1 - (m.x1 - m.x0) * 0.25 && b.vy > -100) {
      b.vy = -B.mossV; m.cd = 0.6; b.w *= 0.3; b.mossT = 0.4;
      Sfx.play('buggyBoing'); buggyPop(st, b.x, b.y - 60, 'BOING!', '#d6a8ff', 28);
      for (let i = 0; i < 14; i++) buggyPart(st, b.x + (Math.random() - 0.5) * 60, b.y + 36, (Math.random() - 0.5) * 160, -60 - Math.random() * 120, 0.6, i % 2 ? '#c58cff' : '#ffb3f0', 3 + Math.random() * 3, 300);
    }
  }
  b.px = b.x;
  // (the springs can push the body up only so fast: a wheel jammed deep against a crater wall never catapults it)
  const vy0 = b.vy;
  b.vx += ax * dt; b.vy += ay * dt; b.w += al * dt;
  if (b.vy < vy0 && b.vy < -B.springUp) b.vy = Math.min(vy0, -B.springUp);
  // (a speed cap: nothing can fly over a crater that is too wide)
  const sp = Math.hypot(b.vx, b.vy);
  if (Math.abs(b.vx) > B.vCap) b.vx = Math.sign(b.vx) * B.vCap;
  if (sp > 700) { b.vx *= 700 / sp; b.vy *= 700 / sp; }
  b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
  if (b.a > Math.PI) b.a -= Math.PI * 2; else if (b.a < -Math.PI) b.a += Math.PI * 2;
  // the belly scrapes the ground instead of sinking into it
  for (const s of [-1, 1]) {
    const px = b.x + Math.cos(b.a) * s * 44 - Math.sin(b.a) * 10, py = b.y + Math.sin(b.a) * s * 44 + Math.cos(b.a) * 10, g = buggyGround(st, px);
    if (py > g) { b.y -= (py - g); if (b.vy > 0) b.vy = 0; b.w += -s * 0.6 * dt * 60 * 0.02; }
  }
  // landing: a squishy thud
  const wasAir = b.air;
  b.air = n === 0;
  b.airT = b.air ? b.airT + dt : 0;
  if (wasAir && !b.air && b.lastVy > 160) { Sfx.play('buggyLand'); b.bump = 1; for (let i = 0; i < 8; i++) buggyPart(st, b.x + (Math.random() - 0.5) * 80, b.y + 34, (Math.random() - 0.5) * 120, -20 - Math.random() * 50, 0.6, 'rgba(210,205,235,0.8)', 4 + Math.random() * 4, 80, 'dust'); }
  b.lastVy = b.vy;
  b.vf = vf;
  for (const w of b.wh) w.spin += (n ? vf : vf * 0.98) / B.wr * dt;
  b.bump = Math.max(0, b.bump - dt * 3);
}
// did the buggy tip over? (its roll bar touching the ground, or lying on its side)
function buggyTipped(st) {
  const b = st.bg;
  for (const s of [-1, 1]) {
    const px = b.x + Math.cos(b.a) * s * 36 + Math.sin(b.a) * 34, py = b.y + Math.sin(b.a) * s * 36 - Math.cos(b.a) * 34;
    if (py > buggyGround(st, px) - 2) return true;
  }
  return Math.abs(b.a) > 1.45 && b.contacts === 0 && b.y > buggyGround(st, b.x) - 40;
}
// boulders, sleepy critters and the rocket stop the buggy
function buggyBlockers(st, dt) {
  const b = st.bg, B = BUGGY, front = b.x + B.half;
  let stop = null;
  for (const o of st.c.boulders) if (o.state === 'track' && o.x > b.x - 20 && o.x - o.r < front + 4) { const lim = o.x - o.r; if (!stop || lim < stop.lim) stop = { lim, o, kind: 'boulder' }; }
  for (const o of st.c.critters) if (o.state === 'sleep' && o.x > b.x - 20 && o.x - B.critterR < front + 4) { const lim = o.x - B.critterR; if (!stop || lim < stop.lim) stop = { lim, o, kind: 'critter' }; }
  const pad = st.c.pad;
  if (pad && front > pad.rocket - 70) stop = { lim: pad.rocket - 70, kind: 'rocket' };
  if (stop && front > stop.lim) {
    b.x -= front - stop.lim;
    if (b.vx > 70) {
      b.vx = -b.vx * 0.3;
      if (stop.kind === 'boulder') { Sfx.play('buggyBonk'); buggyPop(st, stop.lim, b.y - 50, 'Bonk!', '#ffffff', 24); stop.o.wob = 1; st.stats.bonks++; }
      else if (stop.kind === 'critter') { Sfx.play('buggyBeep'); buggyPop(st, stop.lim, b.y - 50, 'Beep!', '#bff0c8', 22); }
      else Sfx.play('buggyBonk');
    } else if (b.vx > 0) b.vx = 0;
  }
  // (reversing into one behind you)
  const rear = b.x - B.half;
  for (const o of st.c.boulders) if (o.state === 'track' && o.x < b.x && o.x + o.r > rear) { b.x += o.x + o.r - rear; if (b.vx < 0) b.vx = 0; }
}
function buggyHonk(st) {
  const b = st.bg, B = BUGGY;
  st.hornT = 0.45; st.honkVis = 1; st.stats.honks++;
  Sfx.play('buggyHonk');
  buggyPop(st, b.x + 60, b.y - 70, 'Beep beep!', '#fff3a8', 20);
  let woke = false;
  for (const o of st.c.critters) if (o.state === 'sleep' && o.x > b.x - 40 && o.x - b.x < 340) {
    o.state = 'wake'; o.t = 0; woke = true; st.stats.critters++;
  }
  if (woke) Sfx.play('buggyCritter');
  const pad = st.c.pad;
  if (pad && !pad.open && b.x > pad.x0 - 100) { pad.open = true; pad.openT = 0; Sfx.play('buggyHatch'); buggyPop(st, pad.rocket - 60, buggyGround(st, pad.rocket) - 200, 'Hatch open!', C.gold, 22); }
  void B;
}

/* ---------- the arm: the claw moves on ◀ ▶ ▲ ▼, the action grabs and lets go ---------- */
function buggyPivot(st) {
  const b = st.bg, [px, py] = BUGGY.pivot, ca = Math.cos(b.a), sa = Math.sin(b.a);
  return { x: b.x + ca * px - sa * py, y: b.y + sa * px + ca * py };
}
function buggyClaw(st) { const pv = buggyPivot(st); return { x: pv.x + st.arm.ox, y: pv.y + st.arm.oy }; }
function buggyArmStep(st, dt, ai, grab) {
  const B = BUGGY, arm = st.arm, hold = arm.hold;
  const heavy = hold && hold.kind !== 'rock';
  const sp = heavy ? B.clawHeavy : B.clawSp;
  const ix = (ai.right ? 1 : 0) - (ai.left ? 1 : 0), iy = (ai.down ? 1 : 0) - (ai.jump || ai.up ? 1 : 0);
  const k = ix && iy ? 0.78 : 1;
  arm.vx = approach(arm.vx, ix * sp * k, B.clawAcc * dt);
  arm.vy = approach(arm.vy, iy * sp * k, B.clawAcc * dt);
  const ox0 = arm.ox, oy0 = arm.oy;
  arm.ox += arm.vx * dt; arm.oy += arm.vy * dt;
  // the arm's reach, and the claw stays above the ground (higher when something hangs from it)
  let d = Math.hypot(arm.ox, arm.oy);
  if (d > B.clawMax) { arm.ox *= B.clawMax / d; arm.oy *= B.clawMax / d; }
  else if (d < B.clawMin) {
    // (over the top of the pivot rather than straight out, so the claw slides across it instead of sticking there)
    if (Math.abs(arm.ox) < B.clawMin) arm.oy = -Math.sqrt(B.clawMin * B.clawMin - arm.ox * arm.ox);
    else { const s = B.clawMin / Math.max(1, d); arm.ox *= s; arm.oy *= s; }
  }
  const pv = buggyPivot(st), lift = hold ? (hold.kind === 'boulder' ? B.boulderR * 2 + 8 : hold.kind === 'crate' ? 44 : 8) : 8;
  const gy = buggyGround(st, pv.x + arm.ox) - lift;
  if (pv.y + arm.oy > gy) arm.oy = gy - pv.y;
  // and not through the buggy itself (a little room over the deck)
  if (Math.abs(arm.ox + 2) < 52 && arm.oy > -14 - (hold && hold.kind === 'boulder' ? 60 : hold && hold.kind === 'crate' ? 30 : 0) && arm.ox > -40) {
    arm.oy = Math.min(arm.oy, -14 - (hold && hold.kind === 'boulder' ? 60 : hold && hold.kind === 'crate' ? 30 : 0));
  }
  // the claw's speed in the world (for tossing)
  const bv = st.bg;
  arm.wvx = bv.vx + (arm.ox - ox0) / dt; arm.wvy = bv.vy + (arm.oy - oy0) / dt;
  arm.shut = approach(arm.shut, hold ? 1 : 0, dt * 9);
  const cl = buggyClaw(st);
  arm.wx = cl.x; arm.wy = cl.y;
  // moon rocks: a press near one, or touching one while holding the action
  const rr = (st.magnet ? B.grabRGold : B.grabR);
  for (const r of st.c.rocks) {
    if (r.got) continue;
    const rp = buggyRockPos(st, r), dd = Math.hypot(rp.x - cl.x, rp.y - cl.y);
    if (dd < rr && ((grab && !hold) || ai.act)) { buggyGetRock(st, r); grab = false; }
  }
  if (!grab) return;
  if (hold) { buggyRelease(st); return; }
  // what's under the claw: a boulder, the rock pile, the crate, a critter
  let best = null;
  const near = (x, y, r, what) => { const dd = Math.hypot(x - cl.x, y - cl.y); if (dd < r && (!best || dd < best.d)) best = { d: dd, what }; };
  const extra = st.magnet ? 24 : 0;
  for (const o of st.c.boulders) if (o.state === 'track') near(o.x, o.y, o.r + 16 + extra, { kind: 'boulder', o });
  for (const pl of st.c.piles) if (buggyOpen(pl.pit)) near(pl.x, buggyGround(st, pl.x) - 40, 50 + extra, { kind: 'pile', pl });
  if (st.parked && (st.crate.where === 'hopper' || st.crate.where === 'ground')) { const cp = buggyCratePos(st); near(cp.x, cp.y - 16, 34 + extra, { kind: 'crate' }); }   // (by its handle)
  for (const o of st.c.critters) if (o.state === 'sleep') near(o.x, buggyGround(st, o.x) - 16, 30, { kind: 'critter', o });
  if (!best) { arm.miss = 0.25; Sfx.play('buggyClack'); return; }
  const w = best.what;
  if (w.kind === 'boulder') { w.o.state = 'held'; arm.hold = { kind: 'boulder', o: w.o }; Sfx.play('buggyGrab'); st.stats.lifts[st.armId]++; }
  else if (w.kind === 'pile') {
    const o = { x: cl.x, home: null, y: cl.y + BUGGY.boulderR + 4, r: BUGGY.boulderR, state: 'held', vx: 0, vy: 0, spin: 0, t: 0, pile: true };
    st.c.boulders.push(o); arm.hold = { kind: 'boulder', o }; Sfx.play('buggyGrab');
  } else if (w.kind === 'crate') { st.crate.where = 'held'; arm.hold = { kind: 'crate' }; Sfx.play('buggyGrab'); }
  else if (w.kind === 'critter') { buggyPop(st, w.o.x, buggyGround(st, w.o.x) - 60, 'Hee-hee! That tickles!', '#bff0c8', 18); Sfx.play('buggyCritter'); w.o.tickle = 1; }
}
function buggyRelease(st) {
  const arm = st.arm, h = arm.hold;
  arm.hold = null;
  Sfx.play('buggyLetGo');
  if (h.kind === 'boulder') {
    const o = h.o;
    o.state = 'fly'; o.vx = clamp(arm.wvx, -320, 320); o.vy = clamp(arm.wvy, -320, 320) - 20; o.spin = o.vx / o.r;
  } else if (h.kind === 'crate') {
    const cr = st.crate;
    cr.where = 'fly'; cr.x = arm.wx; cr.y = arm.wy + 26; cr.vy = 0;
    // into the open hatch? (the hatch magnet reaches further)
    const pad = st.c.pad;
    if (pad) {
      const hx = pad.rocket - 58, hy = buggyGround(st, pad.rocket) - 150, R = st.hatchMag ? BUGGY.hatchRGold : BUGGY.hatchR;
      if (Math.hypot(cr.x - hx, cr.y - hy) < R) {
        if (pad.open) { cr.where = 'in'; buggyStartFinish(st); }
        else buggyHint(st, st.drv, 'Honk to open the hatch! ' + buggyKey(st.drv, 'act'), 3);
      }
    }
  }
}
const buggyRockPos = (st, r) => ({ x: r.x, y: buggyGround(st, r.x) - r.h - 9 + (r.float ? Math.sin(G.time * 2 + r.ph) * 5 : 0) });
function buggyCratePos(st) {
  const cr = st.crate;
  if (cr.where === 'ground' || cr.where === 'fly') return { x: cr.x, y: cr.y };
  if (cr.where === 'held') return { x: st.arm.wx, y: st.arm.wy + 26 };
  const b = st.bg, ca = Math.cos(b.a), sa = Math.sin(b.a), lx = -38, ly = -12;   // in the hopper
  return { x: b.x + ca * lx - sa * ly, y: b.y + sa * lx + ca * ly };
}
function buggyGetRock(st, r) {
  r.got = true; r.t = 0;
  st.rocks++; st.stats.grabs[st.armId]++;
  const rp = buggyRockPos(st, r);
  st.flyRocks.push({ x: rp.x, y: rp.y, t: 0 });
  Sfx.play('buggyRock');
  buggyPop(st, rp.x, rp.y - 30, '+1 moon rock!', '#bfe8ff', 18);
  buggySpark(st, rp.x, rp.y, '#bfe8ff', 10);
}

/* ---------- loose things: flying boulders, waking critters, the crate ---------- */
function buggyObjects(st, dt) {
  const B = BUGGY, b = st.bg, arm = st.arm;
  for (const o of st.c.boulders) {
    o.wob = Math.max(0, (o.wob || 0) - dt * 3);
    if (o.state === 'held') { o.x = arm.wx; o.y = arm.wy + o.r + 4; o.spin += (arm.wvx - b.vx) * dt * 0.01; continue; }
    if (o.state === 'away') { o.t += dt; o.x += o.vx * dt; o.spin += dt * 4; if (o.t > 1.2) o.state = 'gone'; continue; }
    if (o.state !== 'fly') continue;
    o.vy += B.g * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.spin += o.vx / o.r * dt;
    const g = buggyGround(st, o.x);
    if (o.y + o.r < g) continue;
    // landed: in a crater (plop), behind the buggy (cleared: it bounces off into the distance), or back on the track
    const pit = buggyPitAt(st, o.x);
    if (pit && buggyOpen(pit)) {
      o.state = 'gone';
      if (pit.kind === 'fill') {
        pit.filled = Math.min(pit.need, pit.filled + 1); st.stats.fills++;
        Sfx.play('buggyPlop');
        if (pit.filled >= pit.need) { buggyPop(st, (pit.x0 + pit.x1) / 2, pit.rim - 60, 'Filled! Drive across!', C.gold, 26); Sfx.play('buggyFilled'); }
        else buggyPop(st, (pit.x0 + pit.x1) / 2, pit.rim - 50, 'Plop! ' + pit.filled + ' of ' + pit.need, '#ffffff', 22);
      } else { Sfx.play('buggyPlop'); buggyPop(st, o.x, pit.rim - 40, 'Plop!', '#ffffff', 20); }
      for (let i = 0; i < 12; i++) buggyPart(st, o.x + (Math.random() - 0.5) * 50, pit.rim + 10, (Math.random() - 0.5) * 140, -60 - Math.random() * 120, 0.7, 'rgba(210,205,235,0.85)', 5 + Math.random() * 5, 200, 'dust');
      continue;
    }
    if (o.x < b.x - B.half + 6) {
      o.state = 'away'; o.t = 0; o.vx = Math.min(-60, o.vx * 0.5);
      if (!o.pile) st.stats.cleared++;
      Sfx.play('buggyToss'); buggyPop(st, o.x, g - 70, 'Boulder cleared!', '#8fe3b0', 22);
      for (let i = 0; i < 10; i++) buggyPart(st, o.x + (Math.random() - 0.5) * 40, g, (Math.random() - 0.5) * 120, -40 - Math.random() * 80, 0.6, 'rgba(210,205,235,0.85)', 5 + Math.random() * 4, 160, 'dust');
      continue;
    }
    // back on the track: it rolls off the buggy's nose if it lands on it
    o.state = 'track'; o.vx = 0; o.vy = 0;
    if (Math.abs(o.x - b.x) < B.half + o.r) o.x = b.x + B.half + o.r + 4;
    o.y = buggyGround(st, o.x) - o.r + 3; o.wob = 1;
    Sfx.play('buggyThud');
    for (let i = 0; i < 8; i++) buggyPart(st, o.x + (Math.random() - 0.5) * 40, g, (Math.random() - 0.5) * 100, -30 - Math.random() * 60, 0.5, 'rgba(210,205,235,0.85)', 4 + Math.random() * 4, 160, 'dust');
  }
  for (const o of st.c.critters) {
    if (o.tickle) o.tickle = Math.max(0, o.tickle - dt);
    if (o.state === 'wake') { o.t += dt; if (o.t > 1.4) o.state = 'gone'; }
  }
  const cr = st.crate;
  if (cr.where === 'fly') {
    cr.vy += B.g * dt; cr.y += cr.vy * dt;
    const g = buggyGround(st, cr.x) - 14;
    // dropped over the buggy: it lands back in the hopper (the claw can't reach under the buggy)
    if (Math.abs(cr.x - b.x) < B.half + 6 && cr.y >= b.y - 18) { cr.where = 'hopper'; Sfx.play('buggyThud'); buggyPop(st, b.x, b.y - 60, 'Clunk! Back in the hopper', '#ffffff', 18); }
    else if (cr.y >= g) { cr.y = g; cr.where = 'ground'; cr.t = 0; Sfx.play('buggyThud'); }
  } else if (cr.where === 'ground') {
    // out of the claw's reach for a moment: Tow-Bot pops it back in the hopper
    const pv = buggyPivot(st);
    cr.t = Math.hypot(cr.x - pv.x, cr.y - 16 - pv.y) > B.clawMax ? (cr.t || 0) + dt : 0;
    if (cr.t > 2) { cr.where = 'hopper'; Sfx.play('buggyTow'); buggyPop(st, b.x, b.y - 60, 'Tow-Bot put the crate back', '#bfe8ff', 18); }
  }
}

/* ---------- the rocket pad: park in the box, honk the hatch open, load the crate ---------- */
function buggyPad(st, dt) {
  const pad = st.c.pad, b = st.bg;
  if (!pad) return;
  if (pad.open) pad.openT += dt;
  if (b.x > pad.x0 - 100) st.padT += dt;
  if (st.parked) { st.parkT += dt; return; }
  const W = st.wideBox ? BUGGY.boxWGold : BUGGY.boxW;
  if (Math.abs(b.x - pad.box) < W && Math.abs(b.vf) < 25 && b.contacts === 2) {
    st.parked = true; st.parkT = 0;
    Sfx.play('buggyPark'); buggyPop(st, b.x, b.y - 80, 'Parked!', '#8fe3b0', 26);
  }
}

/* ---------- fails: Tow-Bot to the rescue ---------- */
function buggyStartOops(st, kind, pit) {
  const B = BUGGY, b = st.bg, arm = st.arm;
  st.state = 'oops';
  // what the arm held goes back where it came from
  if (arm.hold) {
    if (arm.hold.kind === 'boulder') { const o = arm.hold.o; if (o.pile) o.state = 'gone'; else { o.state = 'track'; o.x = o.home; o.y = buggyGround(st, o.x) - o.r + 3; } }
    else if (arm.hold.kind === 'crate') st.crate.where = 'hopper';
    arm.hold = null;
  }
  // a tip-over on safe flat ground is set right where it happened; everything else goes back to the last flag
  const safe = kind === 'flip' && [-80, -40, 0, 40, 80].every(d => !buggyPitAt(st, b.x + d) && Math.abs(buggyGround(st, b.x + d) - buggyGround(st, b.x)) < 14)
    && !st.c.boulders.some(o => o.state === 'track' && Math.abs(o.x - b.x) < 110) && !st.c.moss.some(m => b.x > m.x0 - 60 && b.x < m.x1 + 60);
  st.oops = { kind, t: 0, x0: b.x, y0: b.y, a0: b.a, toX: safe ? b.x : st.cp.x, here: safe, pit: pit || null, moved: false };
  if (kind !== 'tow') { st.stats.oops++; buggyPop(st, b.x, b.y - 70, 'Whoopsie!', '#ffd0f0', 32); Sfx.play('buggyWhoops'); rumble(0, 0.4, 0.5, 220); rumble(1, 0.4, 0.5, 220); }
  else { buggyPop(st, b.x, b.y - 70, 'Tow-Bot, help!', '#bfe8ff', 24); Sfx.play('buggyTowCall'); }
  if (kind === 'flip') {
    st.flips++;
    if (st.flips >= B.gyroFlips && !st.gyro) { st.gyro = true; st.stats.helps++; buggyMsg(st, 'Gold gyro! The buggy lands level more easily now', C.gold, 3.6); Sfx.play('buggyHelp'); }
    buggyHint(st, st.drv, 'In the air, ' + buggyKey(st.drv, 'left') + ' ' + buggyKey(st.drv, 'right') + ' tilt the buggy level', 3.4);
  }
  if (kind === 'pit' && pit) {
    pit.fails++;
    if (G.time - st.inT[st.drv] < B.tryWin) pit.tries++;
    buggyPitHelp(st, pit);
  }
}
function buggyPitHelp(st, p) {
  const B = BUGGY, D = st.drv;
  let want = p.gold;
  if (p.kind === 'hop') want = p.tries >= B.helpHopBridge ? 2 : p.tries >= B.helpHop ? 1 : 0;
  else if (p.kind === 'ramp') want = p.tries >= B.helpRampBridge ? 2 : p.tries >= B.helpRamp ? 1 : 0;
  if (want > p.gold) {
    p.gold = want; st.stats.helps++;
    if (want === 2) { p.bridge = true; buggyMsg(st, 'Tow-Bot laid a gold bridge over that crater!', C.gold, 3.8); }
    else if (p.kind === 'hop') buggyMsg(st, 'Gold springs! Your hop is bigger at this crater', C.gold, 3.6);
    else buggyMsg(st, 'Gold boost! The ramp gives you extra speed', C.gold, 3.6);
    Sfx.play('buggyHelp');
  } else if (p.kind === 'hop') buggyHint(st, D, 'Go fast, then hop ' + buggyKey(D, 'jump') + ' right at the edge!', 3.2);
  else if (p.kind === 'ramp') buggyHint(st, D, 'Full speed ' + buggyKey(D, 'right') + ' up the ramp, hop ' + buggyKey(D, 'jump') + ' at the top!', 3.2);
  else if (p.kind === 'fill') buggyHint(st, D, 'Stop at the edge! The claw fills it first', 3.2);
}
function buggyOopsStep(st, dt) {
  const B = BUGGY, o = st.oops, b = st.bg;
  o.t += dt;
  // 0-0.8 s: it settles (falls into the crater, lies on its roof); then Tow-Bot flies in, lifts it up and away,
  // and sets it down at the flag (or right here, the right way up)
  if (o.t < 0.8) { buggyPhysics(st, dt, 0, false); o.x0 = b.x; o.y0 = b.y; o.a0 = b.a; return; }
  const u1 = clamp((o.t - 1.3) / 0.6, 0, 1), u2 = clamp((o.t - 2.0) / 0.7, 0, 1);
  if (!o.lifted && o.t > 1.3) { o.lifted = true; Sfx.play('buggyTow'); }
  if (o.t < 1.9 || o.here) {
    const up = o.here ? 70 : 200;
    b.x = o.x0; b.y = o.y0 - up * buggySmooth(u1); b.a = buggyLerp(o.a0, 0, buggySmooth(u1)); b.vx = b.vy = b.w = 0;
    if (o.here && u2 > 0) { const rest = buggyRestY(st, b.x); b.y = buggyLerp(o.y0 - up, rest, buggySmooth(u2)); }
  } else {
    if (!o.moved) { o.moved = true; st.cam.x = o.toX - BUGGY.camLead; st.cam.y = buggyGround(st, o.toX) - BUGGY.camY; }
    const rest = buggyRestY(st, o.toX);
    b.x = o.toX; b.a = 0; b.y = buggyLerp(rest - 200, rest, buggySmooth(u2)); b.vx = b.vy = b.w = 0;
  }
  if (o.t >= B.oopsT) {
    const x = o.here ? o.x0 : o.toX;
    buggyPlace(st, x);
    st.state = 'drive'; st.oops = null;
    Sfx.play('buggyLand');
    buggyPop(st, x, st.bg.y - 70, o.kind === 'tow' ? 'Here you go!' : 'Back on track!', '#bfe8ff', 20);
  }
}
function buggyRestY(st, x) { const B = BUGGY; return buggyGround(st, x) - (B.wy + (B.ext - (B.g / 2) / B.k) + B.wr); }

/* ---------- the swap arch and the rocket ---------- */
function buggyStartSwap(st) {
  st.state = 'swap';
  st.swap = { t: 0 };
  st.stats.roomT[st.k] = G.time - st.segStart;
  if (st.arm.hold) { if (st.arm.hold.kind === 'boulder') st.arm.hold.o.state = 'gone'; st.arm.hold = null; }
  buggyPop(st, st.bg.x, st.bg.y - 150, 'Swap seats!', C.gold, 30);
  Sfx.play('buggySwap'); rumble(0, 0.1, 0.4, 120); rumble(1, 0.1, 0.4, 120);
  for (let i = 0; i < 24; i++) { const a = -Math.PI * Math.random(); buggyPart(st, st.c.gate.x, buggyGround(st, st.c.gate.x) - 110, Math.cos(a) * 200, Math.sin(a) * 200, 0.9, ['#ff6b4a', '#5b95ff', '#c9c3f0', C.gold][i % 4], 4, 300, 'conf'); }
}
function buggySwapStep(st, dt) {
  const sw = st.swap;
  sw.t += dt;
  buggyPhysics(st, dt, 0, false);
  if (sw.t > 0.6 && !sw.hop) { sw.hop = true; Sfx.play('buggyHop', 0); Sfx.play('buggyHop', 1); }
  if (sw.t >= BUGGY.swapT) {
    const L = G.level;
    if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return true; }
    levelClear(); return true;
  }
  return false;
}
function buggyStartFinish(st) {
  st.state = 'finish';
  st.fin = { t: 0 };
  st.stats.roomT[st.k] = G.time - st.segStart;
  const pad = st.c.pad;
  buggyPop(st, pad.rocket - 60, buggyGround(st, pad.rocket) - 220, 'Loaded! ' + st.rocks + ' moon rocks!', C.gold, 28);
  Sfx.play('buggyLoaded'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
}
function buggyFinStep(st, dt) {
  const fin = st.fin, pad = st.c.pad, b = st.bg;
  fin.t += dt;
  // a tractor beam lifts the buggy (with Pip and Bo) into the cargo bay, then 3, 2, 1, blast off
  if (fin.t > 0.9 && fin.t < 2.0) { const u = buggySmooth(clamp((fin.t - 0.9) / 1.0, 0, 1)), rest = buggyRestY(st, pad.box); b.y = buggyLerp(rest, rest - 70, u); b.x = buggyLerp(fin.bx == null ? (fin.bx = b.x) : fin.bx, pad.rocket, u); b.a = 0; }
  else if (fin.t < 0.9) buggyPhysics(st, dt, 0, false);
  if (fin.t > 0.9 && !fin.beam) { fin.beam = true; Sfx.play('buggyBeam'); }
  for (const [tt, n] of [[2.2, 3], [2.8, 2], [3.4, 1]]) if (fin.t > tt && !fin['c' + n]) { fin['c' + n] = true; Sfx.play('buggyCount'); buggyPop(st, pad.rocket, buggyGround(st, pad.rocket) - 360, String(n), C.gold, 44); }
  if (fin.t > 4.0 && !fin.go) { fin.go = true; Sfx.play('buggyLaunch'); buggyPop(st, pad.rocket, buggyGround(st, pad.rocket) - 380, 'Blast off!', C.gold, 40); G.shake = reduceMotion ? 0 : 0.3; }
  if (fin.go) {
    fin.rise = (fin.rise || 0) + dt * (60 + (fin.t - 4.0) * 420);
    for (let i = 0; i < 3; i++) buggyPart(st, pad.rocket + (Math.random() - 0.5) * 50, buggyGround(st, pad.rocket) - fin.rise + 10, (Math.random() - 0.5) * 200, 40 + Math.random() * 80, 0.9, i % 2 ? 'rgba(255,255,255,0.85)' : 'rgba(255,200,120,0.9)', 8 + Math.random() * 8, -20, 'dust');
  }
  if (fin.t >= BUGGY.finT && !fin.cleared) {
    fin.cleared = true;
    G.level.goal = { x: pad.rocket - st.cam.x, y: buggyGround(st, pad.rocket) - fin.rise - st.cam.y };
    levelClear();
    return true;
  }
  return false;
}

/* ---------- gold help ---------- */
function buggyHelp(st, dt) {
  const B = BUGGY, b = st.bg, nd = buggyNeeds(st), armTry = G.time - st.inT[st.armId] < B.tryWin, drvTry = G.time - st.inT[st.drv] < B.tryWin;
  // stuck at a boulder while the arm is trying: the gold magnet claw
  if (nd.block && nd.block.kind === 'boulder' && nd.blockD < 40 && Math.abs(b.vf) < 20) { if (armTry) st.blockT += dt; }
  else st.blockT = Math.max(0, st.blockT - dt * 0.5);
  if (!st.magnet && st.blockT > B.magnetT) { st.magnet = true; st.stats.helps++; buggyMsg(st, 'Gold magnet claw! It grabs from further away now', C.gold, 3.8); Sfx.play('buggyHelp'); }
  // a crater you've been filling for a while: Tow-Bot drops boulders in too
  const fp = nd.fill;
  if (fp && nd.fillD < 80 && armTry && drvTry) {
    fp.t += dt;
    if (fp.t > B.fillHelpT) {
      fp.helpT -= dt;
      if (fp.helpT <= 0) {
        fp.helpT = B.fillHelpEvery;
        if (!fp.helped) { fp.helped = true; st.stats.helps++; buggyMsg(st, 'Tow-Bot is helping to fill the crater!', C.gold, 3.6); Sfx.play('buggyHelp'); }
        const o = { x: (fp.x0 + fp.x1) / 2 + (Math.random() - 0.5) * 60, home: null, y: fp.rim - 260, r: BUGGY.boulderR, state: 'fly', vx: 0, vy: 0, spin: 0, t: 0, pile: true };
        st.c.boulders.push(o);
        st.towDrop = { x: o.x, t: 0 };
      }
    }
  }
  // the rocket pad: a wider gold box, then a hatch magnet
  if (st.c.pad && !st.parked && st.padT > B.parkHelpT && drvTry && !st.wideBox) { st.wideBox = true; st.stats.helps++; buggyMsg(st, 'Gold parking box! Stop anywhere in the gold', C.gold, 3.6); Sfx.play('buggyHelp'); }
  if (st.parked && st.parkT > B.hatchHelpT && armTry && !st.hatchMag) { st.hatchMag = true; st.stats.helps++; buggyMsg(st, 'Gold hatch magnet! Let go near the hatch', C.gold, 3.6); Sfx.play('buggyHelp'); }
  if (st.towDrop) { st.towDrop.t += dt; if (st.towDrop.t > 1.4) st.towDrop = null; }
}

/* ---------- what each job needs right now (the prompts, the panels and the computer read this) ---------- */
function buggyNeeds(st) {
  const B = BUGGY, b = st.bg, c = st.c, out = { drv: null, arm: null, block: null, blockD: 9999, pit: null, pitD: 9999, fill: null, fillD: 9999, rock: null, target: null, honkD: 9999 };
  if (!b || st.state !== 'drive') return out;
  const front = b.x + B.half, pv = buggyPivot(st), arm = st.arm, hold = arm.hold;
  // the nearest thing blocking the track ahead
  for (const o of c.boulders) if (o.state === 'track' && o.x > b.x) { const d = o.x - o.r - front; if (d < out.blockD) { out.blockD = d; out.block = { kind: 'boulder', o }; } }
  for (const o of c.critters) if (o.state === 'sleep' && o.x > b.x - 20) { const d = o.x - B.critterR - front; if (d < out.honkD) out.honkD = d; if (d < out.blockD) { out.blockD = d; out.block = { kind: 'critter', o }; } }
  for (const p of c.pits) {
    if (!buggyOpen(p) || p.x1 < b.x - 30) continue;
    const d = (p.kind === 'ramp' ? p.rampX0 : p.x0) - front;
    if (p.kind === 'fill') { if (p.x0 - front < out.fillD) { out.fillD = p.x0 - front; out.fill = p; } continue; }
    if (d < out.pitD) { out.pitD = d; out.pit = p; }
  }
  // the driver
  const pad = c.pad;
  if (b.air || b.contacts === 0) out.drv = Math.abs(b.a) > 0.22 ? 'level' : 'air';
  else if (pad && b.x > pad.x0 - 250) {
    const d = pad.box - b.x, Wb = st.wideBox ? B.boxWGold : B.boxW;
    out.drv = st.parked ? (pad.open ? 'wait' : 'honkHatch') : d < -Wb + 6 ? 'back' : Math.abs(d) < Wb - 6 ? 'stop' : 'park';
  } else if (out.block && out.block.kind === 'critter' && out.honkD < 300) out.drv = 'honk';
  else if (out.block && out.blockD < 70 && out.block.kind === 'boulder') out.drv = 'waitArm';
  else if (out.fill && out.fillD < 260 && (!out.pit || out.fillD < out.pitD)) out.drv = out.fillD < 34 ? 'waitArm' : 'stopEdge';
  else if (out.pit && out.pit.kind === 'hop' && out.pitD < 260) out.drv = out.pitD < 34 + Math.max(0, b.vf) * 0.12 ? 'hop' : b.vf < 175 ? 'speed' : 'go';
  else if (out.pit && out.pit.kind === 'ramp' && out.pitD < 520) out.drv = front > out.pit.x0 - 34 ? 'hop' : b.vf < 230 ? 'full' : 'go';
  else out.drv = 'go';
  // the arm
  if (hold && hold.kind === 'boulder') {
    const fp = out.fill;
    if (fp && fp.x0 - front < 120) { out.arm = 'drop'; out.target = { x: Math.max(fp.x0 + 40, pv.x + 60), y: Math.min(pv.y - 50, fp.rim - 90) }; }
    else { out.arm = 'toss'; out.target = { x: b.x - 140, y: pv.y - 40 }; }
  } else if (hold && hold.kind === 'crate') { out.arm = 'hatch'; out.target = pad ? { x: pad.rocket - 58, y: buggyGround(st, pad.rocket) - 176 } : null; }
  else if (st.parked && st.crate.where !== 'in') { out.arm = 'crate'; const cp = buggyCratePos(st); out.target = { x: cp.x, y: cp.y - 16 }; }
  else if (out.block && out.block.kind === 'boulder' && out.blockD < 150) { out.arm = 'boulder'; out.target = { x: out.block.o.x, y: out.block.o.y }; }
  else if (out.fill && out.fillD < 70) { const pl = c.piles.find(q => q.pit === out.fill); out.arm = 'pile'; out.target = pl ? { x: pl.x, y: buggyGround(st, pl.x) - 40 } : null; }
  else {
    let best = null;
    for (const r of c.rocks) {
      if (r.got) continue;
      const rp = buggyRockPos(st, r), d = Math.hypot(rp.x - pv.x, rp.y - pv.y);
      if (d < B.clawMax + 24 && (!best || d < best.d)) best = { d, r, rp };
    }
    if (best) { out.arm = 'rock'; out.rock = best.r; out.target = best.rp; }
    else out.arm = 'ready';
  }
  return out;
}
// the gentle lessons, once each room, when they first matter; and pressing the other job's keys
function buggyNudges(st, dt, di, ai) {
  const D = st.drv, A = st.armId, b = st.bg;
  // the driver pushing on into a boulder
  if (di.right && Math.abs(b.vf) < 5 && b.contacts) { st.wrongT[D] += dt; if (st.wrongT[D] > 1.2) { st.wrongT[D] = -6; const nd = buggyNeeds(st); if (nd.block && nd.block.kind === 'boulder' && nd.blockD < 40) buggyHint(st, D, 'A boulder! ' + NAMES[A] + '\'s claw has to move it', 2.6); } }
  else if (st.wrongT[D] > 0) st.wrongT[D] = 0;
  else st.wrongT[D] = Math.min(0, st.wrongT[D] + dt);
  // the arm pressing a lot with nothing under the claw
  if (st.arm.miss > 0) { st.arm.miss -= dt; st.missN = (st.missN || 0) + (st.arm.miss > 0.24 ? 1 : 0); if (st.missN >= 3) { st.missN = 0; buggyHint(st, A, 'Move the claw ' + buggyKey(A, 'claw') + ' onto a rock first', 2.6); } }
  void ai;
}

/* ---------- small helpers ---------- */
function buggyHint(st, id, text, life) { if (buggyQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || BUGGY.hintLife }; }
function buggyHintOnce(st, key, id, text) { if (st.hinted[key]) return; st.hinted[key] = true; buggyHint(st, id, text); }
function buggyMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function buggyPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 12) st.pops.shift(); }
function buggyPart(st, x, y, vx, vy, life, col, size, grav, kind) {
  if (st.parts.length > 300) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
function buggySpark(st, x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 120; buggyPart(st, x, y, Math.cos(a) * s, Math.sin(a) * s, 0.5, col, 3 + Math.random() * 2, 0, 'spark'); } }
// the touch buttons and the top-bar legend name each player's own action this room: the driver honks, the arm grabs
let buggyLabelEls = null;
function buggyActLabels(st) {
  try {
    if (!buggyLabelEls || !buggyLabelEls.every(o => document.contains(o.el))) buggyLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of buggyLabelEls) {
      const want = o.id < 0 ? 'honk/grab' : o.id === st.drv ? 'honk' : 'grab';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}
function buggyCam(st, dt) {
  const B = BUGGY, b = st.bg, cam = st.cam;
  let tx = b.x - B.camLead + clamp(b.vx * 0.3, -50, 110);
  const gAhead = buggyGround(st, b.x + 200), gHere = buggyGround(st, b.x);
  let ty = Math.min(gHere, gAhead + 20) * 0.75 + b.y * 0.25 + 30 - B.camY;
  if (G.introT > 0) ty -= 30;
  if (st.state === 'finish') { const pad = st.c.pad; tx = pad.rocket - 520; ty = buggyGround(st, pad.rocket) - B.camY - Math.min(120, (st.fin.rise || 0) * 0.3); }
  if (st.state === 'oops' && st.oops && st.oops.t < 1.9) ty = Math.min(ty, st.oops.y0 - B.camY + 20);
  cam.x += (tx - cam.x) * Math.min(1, dt * 5);
  cam.y += (ty - cam.y) * Math.min(1, dt * 4);
  // keep the buggy on screen when it bounces high
  const sy = b.y - cam.y;
  if (sy < 130) cam.y = b.y - 130; else if (sy > 430) cam.y = b.y - 430;
}
function buggyFx(st, dt) {
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
  for (const f of st.flyRocks) f.t += dt;
  st.flyRocks = st.flyRocks.filter(f => f.t < 0.6);
  for (const r of st.c.rocks) if (r.got) r.t += dt;
  for (const f of st.c.flags) if (f.on) f.t += dt;
  st.hornT = Math.max(0, st.hornT - dt); st.honkVis = Math.max(0, st.honkVis - dt * 2.5);
  // dust from the wheels
  const b = st.bg;
  if (st.state === 'drive' && b.contacts && Math.abs(b.vf) > 80) {
    st.dustT = (st.dustT || 0) - dt;
    if (st.dustT <= 0) { st.dustT = 0.07; const w = b.wh[0]; buggyPart(st, w.x - Math.sign(b.vf) * 10, w.y + 12, -b.vf * 0.25, -20 - Math.random() * 40, 0.6, 'rgba(210,205,235,0.7)', 4 + Math.random() * 4, 30, 'dust'); }
  }
}
// copy the seats into the engine players (screen px): name tags and bubbles read p.x / p.y
function buggySeat(st, id) {
  const b = st.bg, lx = id === st.drv ? 12 : -14, ly = -12, ca = Math.cos(b.a), sa = Math.sin(b.a);
  let x = b.x + ca * lx - sa * ly, y = b.y + sa * lx + ca * ly;
  if (st.state === 'swap' && st.swap) {
    // both hop out, swap places in the air, and land in the other seat
    const u = clamp((st.swap.t - 0.55) / 0.9, 0, 1), olx = id === st.drv ? -14 : 12;
    const tx = b.x + ca * olx - sa * ly, ty = b.y + sa * olx + ca * ly;
    x = buggyLerp(x, tx, buggySmooth(u)); y = buggyLerp(y, ty, u) - (id === st.drv ? 70 : 110) * 4 * u * (1 - u);
  }
  return { x, y };
}
function buggyMirror(st) {
  const cam = st.cam;
  for (const p of G.players) {
    const s = buggySeat(st, p.id);
    p.x = s.x - cam.x - PW / 2; p.y = s.y - cam.y - PH;
    p.alive = true; p.grounded = true; p.stompSafe = 0; p.vy = 0; p.vx = st.bg.vx;
    p.face = 1;
    p.stun = st.state === 'oops' && st.oops && st.oops.kind !== 'tow' && st.oops.t < 1.9 ? 0.5 : 0;
  }
}

MODES.buggy = {
  BUGGY,
  compile: buggyCompile, ground: buggyGround, needs: buggyNeeds, pivot: buggyPivot, claw: buggyClaw, rockPos: buggyRockPos, cratePos: buggyCratePos, key: buggyKey,
  setup(st, L) {
    st.stats = { oops: 0, bonks: 0, hops: 0, honks: 0, critters: 0, cleared: 0, fills: 0, helps: 0, grabs: [0, 0], lifts: [0, 0], roomT: [], roomTitles: [] };
    st.rocks = 0; st.rocksN = 0; st.flyRocks = [];
    // count every room's moon rocks up front (the HUD shows "x of all")
    const def = LEVELS[G.levelIndex];
    st.rocksAll = (def.rooms || [def]).reduce((n, r) => n + (r.course || []).filter(t => /^[rR]/.test(String(t))).length, 0);
    buggyRoom(st, L, 0);
  },
  room(k, L) { buggyRoom(G.mst, L, k); },
  step(dt) { buggyStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then, and drawn in their seats instead
  draw() {
    const st = G.mst;
    if (!st.bg) return;
    buggyDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.bg) return;
    buggyDrawFront(st);
  },
  hud() { const st = G.mst; if (st.bg) buggyHud(st); },
  stats() {
    const st = G.mst, s = st.stats;
    if (!s) return [];
    const all = st.rocksAll || st.rocksN, got = st.rocks, t = G.time, frac = all ? got / all : 1;
    const medal = frac >= 0.8 && t <= 270 ? 'Gold' : frac >= 0.5 && t <= 420 ? 'Silver' : 'Bronze';
    const out = [
      { label: 'Moon rocks', value: got + ' of ' + all },
      { label: 'Rocks grabbed', values: s.grabs.slice() },
      { label: 'Whoopsies', value: s.oops },
      { label: 'Medal', value: medal },
    ];
    const words = frac >= 0.95 ? 'Every shiny rock on board. Out of this world!' : frac >= 0.7 ? 'A big haul of moon rocks. Great crew!' : 'Bumpy, bouncy, and home safe together!';
    out.push(words + ' Boulders tossed: ' + s.cleared + '.');
    if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
    return out;
  },
};

/* ---------- drawing ---------- */
let buggySkyG = null, buggySkyDark = null, buggyStars = null;
function buggyDrawWorld(st) {
  const cam = st.cam;
  buggyDrawSky(st);
  buggyDrawFar(st);
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  buggyDrawBack(st);
  buggyDrawGround(st);
  buggyDrawThings(st);
  ctx.restore();
  if (st.dark) buggyDrawDark(st);
}
function buggyDrawFront(st) {
  const cam = st.cam;
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  if (st.state === 'finish') buggyDrawRocket(st, true);
  buggyDrawTowBot(st);
  if (!(st.state === 'finish' && st.fin.t > 2.0)) buggyDrawBuggy(st);
  buggyDrawLoose(st);
  if (st.c.gate) buggyDrawGate(st, true);
  if (st.state === 'finish') buggyDrawRocket(st, false);
  buggyDrawGuide(st);
  for (const q of st.parts) {
    const a = clamp(q.life / q.max, 0, 1);
    if (q.x < cam.x - 30 || q.x > cam.x + W + 30 || q.y < cam.y - 30 || q.y > cam.y + H + 30) continue;
    ctx.globalAlpha = q.kind === 'dust' ? a * 0.7 : a; ctx.fillStyle = q.col;
    if (q.kind === 'spark') { buggyStarPath(q.x, q.y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
    else if (q.kind === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
    else if (q.kind === 'dust') { circle(q.x, q.y, q.size * (1.5 - 0.5 * a)); ctx.fill(); }
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  const big = hudBig();
  for (const q of st.pops) {
    const x = clamp(q.x - cam.x, 90, W - 90), y = clamp(q.y - cam.y - q.t * 30, 80, H - 100);
    ctx.globalAlpha = clamp((1.3 - q.t) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.3 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
    ctx.globalAlpha = 1;
  }
}
function buggyStarPath(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
function buggyDrawSky(st) {
  if (!buggySkyG) {
    buggySkyG = ctx.createLinearGradient(0, 0, 0, H);
    buggySkyG.addColorStop(0, '#0b0e2e'); buggySkyG.addColorStop(0.6, '#251e55'); buggySkyG.addColorStop(1, '#4a3a7e');
    buggySkyDark = ctx.createLinearGradient(0, 0, 0, H);
    buggySkyDark.addColorStop(0, '#04051a'); buggySkyDark.addColorStop(1, '#171238');
    buggyStars = [];
    for (let i = 0; i < 140; i++) { const h = hash(i, 151); buggyStars.push({ x: h % 2000, y: (h >>> 11) % 330, s: 0.6 + ((h >>> 5) % 10) / 6, ph: (h % 628) / 100 }); }
  }
  ctx.fillStyle = st.dark ? buggySkyDark : buggySkyG; ctx.fillRect(0, 0, W, H);
  const cx = st.cam.x * 0.03, t = G.clock;
  for (const s of buggyStars) {
    const x = ((s.x - cx) % 2000 + 2000) % 2000 * (W + 40) / 2000 - 20;
    ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 1.6 + s.ph);
    ctx.fillStyle = s.s > 1.8 ? '#fff6c8' : '#ffffff';
    if (s.s > 2.1) { buggyStarPath(x, s.y, s.s * 2.2, s.s * 0.6, t * 0.3 + s.ph); ctx.fill(); }
    else { ctx.fillRect(x, s.y, s.s, s.s); }
  }
  ctx.globalAlpha = 1;
  // the ringed planet far away, and the Earth (home!) hanging in the sky
  const px = 170 - (st.cam.x * 0.01) % 60;
  ctx.save(); ctx.translate(px, 92); ctx.rotate(-0.35);
  ctx.strokeStyle = 'rgba(255,214,150,0.55)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 0, 40, 10, 0, Math.PI, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#c99ad8'; circle(0, 0, 21); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-21, -6, 42, 4); ctx.fillRect(-19, 4, 38, 3);
  ctx.strokeStyle = 'rgba(255,214,150,0.75)'; ctx.beginPath(); ctx.ellipse(0, 0, 40, 10, 0, 0, Math.PI); ctx.stroke();
  ctx.restore();
  const ex = 790 - (st.cam.x * 0.008) % 40, ey = 106;
  ctx.fillStyle = 'rgba(120,180,255,0.18)'; circle(ex, ey, 62); ctx.fill();
  ctx.save(); circle(ex, ey, 46); ctx.clip();
  ctx.fillStyle = '#3f86e8'; ctx.fillRect(ex - 50, ey - 50, 100, 100);
  ctx.fillStyle = '#5cc27f';
  ctx.beginPath(); ctx.ellipse(ex - 14, ey - 10, 16, 22, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(ex + 20, ey + 14, 14, 10, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(ex + 12, ey - 24, 9, 6, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (const [a, r, l] of [[0.3, 30, 1.1], [2.4, 22, 0.9], [4.2, 36, 0.7]]) { ctx.beginPath(); ctx.arc(ex + Math.cos(a) * 6, ey + Math.sin(a) * 6, r, a + t * 0.05, a + l + t * 0.05); ctx.stroke(); }
  ctx.fillStyle = 'rgba(10,20,60,0.35)'; ctx.beginPath(); ctx.arc(ex + 22, ey + 10, 52, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// far moon mountains and nearer crater hills (parallax)
function buggyDrawFar(st) {
  const cam = st.cam, base = 330 - clamp(cam.y * 0.08, -40, 40);
  ctx.fillStyle = st.dark ? '#22213f' : '#4a4a7a';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 20; x += 20) { const u = x + cam.x * 0.12, h = hash(Math.floor(u / 60), 7) % 70; ctx.lineTo(x, base - 30 - Math.abs(Math.sin(u / 95)) * 60 - h * 0.4); }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = st.dark ? '#1a1932' : '#3a3a66';
  ctx.beginPath(); ctx.moveTo(0, H);
  const b2 = 370 - clamp(cam.y * 0.18, -50, 60);
  for (let x = 0; x <= W + 16; x += 16) { const u = x + cam.x * 0.3; ctx.lineTo(x, b2 - 18 - Math.sin(u / 140) * 16 - Math.sin(u / 47 + 1) * 6); }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  // crater rims on the near hills
  ctx.fillStyle = st.dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)';
  for (let k = -1; k < 8; k++) {
    const u0 = Math.floor(cam.x * 0.3 / 170) + k, x = u0 * 170 - cam.x * 0.3 + (hash(u0, 3) % 80);
    ctx.beginPath(); ctx.ellipse(x, b2 + 14 + hash(u0, 5) % 30, 22 + hash(u0, 9) % 18, 5, 0, 0, Math.PI * 2); ctx.fill();
  }
}
// signs, flags, rock pillars, the rock pile, the swap arch's back post, the rocket
function buggyDrawBack(st) {
  const c = st.c, cam = st.cam, vis = x => x > cam.x - 220 && x < cam.x + W + 220;
  for (const l of c.ledges) if (vis(l.x)) {
    const g = buggyGround(st, l.x);
    ctx.fillStyle = st.dark ? '#2e2c4c' : '#5d5a85';
    ctx.beginPath(); ctx.moveTo(l.x - 26, g + 6); ctx.lineTo(l.x - 18, g - 60); ctx.lineTo(l.x - 22, g - 100); ctx.lineTo(l.x - 14, g - 128); ctx.lineTo(l.x + 16, g - 128); ctx.lineTo(l.x + 22, g - 96); ctx.lineTo(l.x + 18, g - 50); ctx.lineTo(l.x + 28, g + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(l.x - 12, g - 124, 6, 110);
    ctx.fillStyle = st.dark ? '#3a3860' : '#7a77a6'; rr(l.x - 20, g - 132, 40, 10, 5); ctx.fill();
  }
  for (const pl of c.piles) if (vis(pl.x)) {
    const g = buggyGround(st, pl.x);
    for (const [dx, dy, r] of [[-34, -14, 18], [0, -16, 22], [32, -12, 17], [-16, -42, 18], [18, -40, 17], [2, -64, 15]]) buggyDrawBoulderShape(pl.x + dx, g + dy, r, 0, (dx + 50) % 7, st.dark);
    if (buggyOpen(pl.pit)) { ctx.fillStyle = 'rgba(28,26,54,0.75)'; rr(pl.x - 44, g - 106, 88, 22, 11); ctx.fill(); text('ROCK PILE', pl.x, g - 94.5, 12, '#d9d3ef', 'center', 'body'); }
  }
  for (const s of c.signs) if (vis(s.x)) {
    const g = buggyGround(st, s.x);
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(s.text).width + 24;
    ctx.fillStyle = '#5c6688'; ctx.fillRect(s.x - 2, g - 34, 4, 34);
    ctx.fillStyle = st.dark ? 'rgba(40,38,80,0.95)' : 'rgba(28,26,54,0.88)'; rr(s.x - w / 2, g - 62, w, 30, 9); ctx.fill();
    ctx.strokeStyle = '#9aa6c4'; ctx.lineWidth = 2; rr(s.x - w / 2, g - 62, w, 30, 9); ctx.stroke();
    text(s.text, s.x, g - 46.5, 13, C.paper, 'center', 'body');
  }
  for (const f of c.flags) if (vis(f.x)) {
    const g = buggyGround(st, f.x), up = f.on ? Math.min(1, f.t * 3) : 0, top = g - 40 - up * 34;
    ctx.fillStyle = '#d9dbe8'; ctx.fillRect(f.x - 1.5, g - 76, 3, 76);
    ctx.fillStyle = f.on ? '#8fe3b0' : '#a7a4c4';
    const wave = Math.sin(G.clock * 5) * 2;
    ctx.beginPath(); ctx.moveTo(f.x + 1.5, top); ctx.quadraticCurveTo(f.x + 14, top + 3 + wave, f.x + 28, top + 8); ctx.lineTo(f.x + 1.5, top + 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; buggyStarPath(f.x + 11, top + 8, 4, 1.8, 0); ctx.fill();
  }
  if (c.gate) buggyDrawGate(st, false);
  if (c.pad) { buggyDrawPad(st); if (st.state !== 'finish') { buggyDrawRocket(st, true); buggyDrawRocket(st, false); } }
}
function buggyDrawGround(st) {
  const cam = st.cam, x0 = Math.floor(cam.x / 4) * 4 - 8, x1 = cam.x + W + 8, dark = st.dark;
  const g = ctx.createLinearGradient(0, cam.y + 300, 0, cam.y + H);
  g.addColorStop(0, dark ? '#4a4870' : '#8d8ab3'); g.addColorStop(1, dark ? '#2a2846' : '#5d5a84');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x0, cam.y + H + 10);
  for (let x = x0; x <= x1; x += 4) ctx.lineTo(x, buggyGround(st, x));
  ctx.lineTo(x1, cam.y + H + 10); ctx.closePath(); ctx.fill();
  // little craters and pebbles in the dust (anchored to the world)
  for (let k = Math.floor(x0 / 70); k * 70 < x1; k++) {
    const h = hash(k, 41), x = k * 70 + (h % 50), gy = buggyGround(st, x);
    if (buggyPitAt(st, x)) continue;
    ctx.fillStyle = dark ? 'rgba(0,0,0,0.18)' : 'rgba(40,36,80,0.18)';
    ctx.beginPath(); ctx.ellipse(x, gy + 22 + (h >>> 4) % 40, 10 + (h >>> 8) % 12, 3 + (h >>> 3) % 2, 0, 0, Math.PI * 2); ctx.fill();
    if (h % 3 === 0) { ctx.fillStyle = dark ? '#5a5880' : '#b3afd6'; circle(x + 20, gy - 2, 3); ctx.fill(); }
  }
  // the dusty top edge
  ctx.strokeStyle = dark ? '#6d6a96' : C.grass; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.beginPath();
  let pen = false;
  for (let x = x0; x <= x1; x += 4) {
    const p = buggyPitAt(st, x), inside = p && buggyOpen(p) && x > p.x0 + 6 && x < p.x1 - 6;
    if (inside) { pen = false; continue; }
    if (!pen) { ctx.moveTo(x, buggyGround(st, x)); pen = true; } else ctx.lineTo(x, buggyGround(st, x));
  }
  ctx.stroke();
  // craters: a dark hole, filled boulders, gold bridges
  for (const p of st.c.pits) {
    if (p.x1 < cam.x - 20 || p.x0 > cam.x + W + 20) continue;
    const top = Math.min(p.rim, p.lipY);
    const hg = ctx.createLinearGradient(0, top, 0, p.rim + p.depth);
    hg.addColorStop(0, dark ? '#120f28' : '#2a2650'); hg.addColorStop(1, '#0a0820');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.moveTo(p.x0, p.lipY);
    for (let x = p.x0; x <= p.x1; x += 4) ctx.lineTo(x, buggyGround(st, x) + 0.5);
    ctx.lineTo(p.x1, p.rim); ctx.closePath(); ctx.fill();
    if (p.kind === 'fill' && p.filled) {
      const fy = p.rim + p.depth * (1 - p.filled / p.need);
      for (let i = 0; i < p.filled * 3; i++) { const bx = p.x0 + 20 + ((i * 47) % (p.x1 - p.x0 - 40)), by = fy + 18 + (i % 3) * 10; buggyDrawBoulderShape(bx, by, 20, i, i % 5, dark); }
    }
    if (p.kind === 'fill' && p.filled < p.need) {
      // how full it is
      const cx = (p.x0 + p.x1) / 2;
      ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(cx - 46, p.rim - 34, 92, 24, 12); ctx.fill();
      for (let i = 0; i < p.need; i++) { ctx.fillStyle = i < p.filled ? C.gold : 'rgba(255,255,255,0.25)'; circle(cx - 24 + i * 24, p.rim - 22, 7); ctx.fill(); }
    }
    if (p.bridge) {
      ctx.save(); ctx.translate(p.x0, p.lipY); ctx.rotate(Math.atan2(p.rim - p.lipY, p.x1 - p.x0));
      const L = Math.hypot(p.x1 - p.x0, p.rim - p.lipY);
      ctx.fillStyle = C.goldDark; ctx.fillRect(-4, 2, L + 8, 10);
      ctx.fillStyle = C.gold; ctx.fillRect(-4, 0, L + 8, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let x = 10; x < L; x += 26) ctx.fillRect(x, 2, 12, 2);
      ctx.restore();
    }
    // gold springs / boost marks
    if (p.gold === 1 && !p.bridge) {
      const gx = p.kind === 'ramp' ? p.rampX0 : p.x0 - 70, gl = p.kind === 'ramp' ? BUGGY.rampL : 70;
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(G.clock * 6);
      ctx.fillStyle = C.gold;
      for (let x = gx; x < gx + gl; x += 16) { const y = buggyGround(st, x); ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x + 7, y - 10); ctx.lineTo(x + 14, y - 2); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }
  // bouncy moss
  for (const m of st.c.moss) {
    if (m.x1 < cam.x - 20 || m.x0 > cam.x + W + 20) continue;
    for (let x = m.x0 + 8; x < m.x1 - 8; x += 9) {
      const y = buggyGround(st, x), h = hash(Math.round(x), 17);
      ctx.fillStyle = h % 2 ? '#c58cff' : '#a26ae8'; circle(x, y + 1, 6 + (h % 3)); ctx.fill();
      if (h % 5 === 0) { ctx.fillStyle = '#ffb3f0'; circle(x, y - 6 - Math.abs(Math.sin(G.clock * 3 + x)) * 2, 3); ctx.fill(); }
    }
  }
}
function buggyDrawBoulderShape(x, y, r, spin, seed, dark) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin || 0);
  ctx.fillStyle = dark ? '#57537a' : '#8a7f9e';
  ctx.beginPath();
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, rr2 = r * (0.86 + ((hash(i, seed) % 100) / 100) * 0.18); ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = dark ? '#3a3756' : '#5a5170'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.35, r * 0.2, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(40,30,60,0.25)'; circle(r * 0.3, r * 0.15, r * 0.2); ctx.fill(); circle(-r * 0.2, r * 0.4, r * 0.12); ctx.fill();
  ctx.restore();
}
function buggyDrawRock(x, y, s, glow, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (glow) { ctx.fillStyle = 'rgba(160,220,255,' + (0.25 + 0.12 * Math.sin(t * 4)) + ')'; circle(0, 0, 16); ctx.fill(); }
  ctx.fillStyle = '#7fd8ff'; ctx.strokeStyle = '#2f6fa8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(8, -3); ctx.lineTo(6, 7); ctx.lineTo(-5, 8); ctx.lineTo(-9, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d8f4ff'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(2, -1); ctx.lineTo(-9, -1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff'; buggyStarPath(4, -5, 3.5 + Math.sin(t * 5) * 1.2, 1, t); ctx.fill();
  ctx.restore();
}
function buggyDrawCritter(st, o) {
  const g = buggyGround(st, o.x), t = G.clock;
  let x = o.x, y = g, s = 1, a = 1;
  if (o.state === 'wake') { const u = clamp((o.t - 0.35) / 1.0, 0, 1); x += u * 40; y -= Math.sin(u * Math.PI) * 60 + u * 30; s = 1 - u * 0.5; a = 1 - Math.max(0, u - 0.6) / 0.4; }
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s);
  const breathe = o.state === 'sleep' ? 1 + Math.sin(t * 2 + o.ph) * 0.05 : 1;
  ctx.fillStyle = '#7ee08a'; ctx.strokeStyle = '#3a8f4a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, -15 * breathe, 18, 15 * breathe, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#3a8f4a'; ctx.beginPath(); ctx.moveTo(0, -29); ctx.quadraticCurveTo(6, -40, 2, -46); ctx.stroke();
  ctx.fillStyle = '#ffd75e'; circle(2, -46, 4); ctx.fill();
  if (o.state === 'sleep' && !o.tickle) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; for (const ex of [-6, 6]) { ctx.beginPath(); ctx.arc(ex, -16, 3.5, 0.2, Math.PI - 0.2); ctx.stroke(); }
    ctx.globalAlpha = a * (0.5 + 0.5 * Math.sin(t * 2 + o.ph));
    text('z', 18, -36 - (t * 8 + o.ph * 5) % 12, 13, '#e9e4ff', 'center'); text('Z', 26, -46 - (t * 8 + o.ph * 5 + 6) % 12, 16, '#e9e4ff', 'center');
  } else {
    for (const ex of [-6, 6]) { ctx.fillStyle = '#fff'; circle(ex, -17, 5); ctx.fill(); ctx.fillStyle = C.ink; circle(ex + 1.5, -17, 2.5); ctx.fill(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -10, 4, 0.2, Math.PI - 0.2); ctx.stroke();
    if (o.state === 'wake' && o.t < 0.5) text('!', 0, -60, 20, '#ffd75e', 'center');
    // a little wave goodbye
    if (o.state === 'wake') { ctx.strokeStyle = '#3a8f4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(14, -18); ctx.lineTo(24, -28 + Math.sin(t * 16) * 5); ctx.stroke(); }
  }
  ctx.fillStyle = 'rgba(255,140,170,0.5)'; circle(-11, -10, 3); ctx.fill(); circle(11, -10, 3); ctx.fill();
  ctx.restore();
}
// boulders on the track, critters, moon rocks (on the ground, on pillars, floating in bubbles)
function buggyDrawThings(st) {
  const c = st.c, cam = st.cam, vis = x => x > cam.x - 80 && x < cam.x + W + 80, t = G.clock;
  for (const o of c.boulders) if (o.state === 'track' && vis(o.x)) buggyDrawBoulderShape(o.x + Math.sin(t * 40) * 2 * (o.wob || 0), o.y, o.r, o.spin, (o.home || 1) | 0, st.dark);
  for (const o of c.critters) if (o.state !== 'gone' && vis(o.x)) buggyDrawCritter(st, o);
  for (const r of c.rocks) {
    if (!vis(r.x)) continue;
    const p = buggyRockPos(st, r);
    if (r.got) { if (r.t < 0.4) { ctx.globalAlpha = 1 - r.t / 0.4; ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = 2; circle(p.x, p.y, 12 + r.t * 50); ctx.stroke(); ctx.globalAlpha = 1; } continue; }
    if (r.float) {
      ctx.strokeStyle = 'rgba(220,240,255,0.55)'; ctx.lineWidth = 2; circle(p.x, p.y, 17); ctx.stroke();
      ctx.fillStyle = 'rgba(200,230,255,0.12)'; circle(p.x, p.y, 17); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(p.x - 7, p.y - 7, 3); ctx.fill();
    }
    buggyDrawRock(p.x, p.y, 1, true, t + r.ph);
  }
}
function buggyDrawGate(st, front) {
  const gx = st.c.gate.x, g = buggyGround(st, gx), t = G.clock;
  if (!front) {
    ctx.fillStyle = '#5c6688'; rr(gx - 70, g - 150, 12, 150, 4); ctx.fill();
    // the banner across the top
    ctx.fillStyle = 'rgba(28,26,54,0.9)'; rr(gx - 76, g - 176, 152, 34, 12); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; rr(gx - 76, g - 176, 152, 34, 12); ctx.stroke();
    text('SWAP SEATS!', gx, g - 158.5, 18, C.gold, 'center');
    for (let i = 0; i < 7; i++) { ctx.fillStyle = (Math.floor(t * 4) + i) % 2 ? C.gold : '#fff6c8'; circle(gx - 66 + i * 22, g - 180, 3.5); ctx.fill(); }
  } else { ctx.fillStyle = '#7f88aa'; rr(gx + 58, g - 150, 12, 150, 4); ctx.fill(); }
}
function buggyDrawPad(st) {
  const pad = st.c.pad, g = buggyGround(st, pad.box), Wb = st.wideBox ? BUGGY.boxWGold : BUGGY.boxW;
  ctx.fillStyle = '#4f4b74'; ctx.fillRect(pad.x0 + 200, g, pad.x1 - pad.x0 - 200, 10);
  ctx.fillStyle = '#ffc53d'; for (let x = pad.x0 + 204; x < pad.x1; x += 30) ctx.fillRect(x, g + 2, 14, 4);
  // the parking box under the hatch
  const on = st.parked;
  ctx.strokeStyle = on ? '#8fe3b0' : st.wideBox ? C.gold : '#ffffff'; ctx.lineWidth = 3; ctx.setLineDash([10, 7]);
  rr(pad.box - Wb - BUGGY.half, g - 6, (Wb + BUGGY.half) * 2, 12, 4); ctx.stroke(); ctx.setLineDash([]);
  if (!on) text('PARK', pad.box, g + 26, 16, st.wideBox ? C.gold : '#ffffff', 'center');
}
function buggyDrawRocket(st, back) {
  const pad = st.c.pad, x = pad.rocket, g0 = buggyGround(st, x), rise = st.fin ? st.fin.rise || 0 : 0, g = g0 - rise, t = G.clock;
  if (back) {
    // the launch tower (stays behind)
    ctx.strokeStyle = '#8a8fb0'; ctx.lineWidth = 4;
    ctx.strokeRect(x + 78, g0 - 330, 30, 330);
    for (let y = g0 - 320; y < g0; y += 30) { ctx.beginPath(); ctx.moveTo(x + 78, y); ctx.lineTo(x + 108, y + 30); ctx.stroke(); }
    ctx.fillStyle = '#ff6b4a'; circle(x + 93, g0 - 338, 5 + Math.sin(t * 4)); ctx.fill();
    return;
  }
  ctx.save(); ctx.translate(x, g);
  if (st.fin && st.fin.go) { const f = 0.8 + 0.3 * Math.sin(t * 40); ctx.fillStyle = '#ffd75e'; ctx.beginPath(); ctx.moveTo(-26, -6); ctx.quadraticCurveTo(0, 90 * f, 26, -6); ctx.fill(); ctx.fillStyle = '#ff9a3d'; ctx.beginPath(); ctx.moveTo(-16, -6); ctx.quadraticCurveTo(0, 55 * f, 16, -6); ctx.fill(); }
  // fins
  ctx.fillStyle = '#ff6b4a'; ctx.strokeStyle = '#b8402a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-50, -100); ctx.lineTo(-86, -8); ctx.lineTo(-44, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5b95ff'; ctx.strokeStyle = '#2f5fc4';
  ctx.beginPath(); ctx.moveTo(50, -100); ctx.lineTo(86, -8); ctx.lineTo(44, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
  // the body
  ctx.fillStyle = '#f2f2ff'; ctx.strokeStyle = '#8a8fb0'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-52, -10); ctx.lineTo(-56, -220); ctx.quadraticCurveTo(-50, -330, 0, -380); ctx.quadraticCurveTo(50, -330, 56, -220); ctx.lineTo(52, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffc53d'; ctx.fillRect(-55, -250, 110, 14);
  ctx.fillStyle = '#ff6b4a'; ctx.beginPath(); ctx.moveTo(-24, -345); ctx.quadraticCurveTo(0, -372, 24, -345); ctx.lineTo(0, -380); ctx.closePath(); ctx.fill();
  // a round window: Pip and Bo wave from it once they're aboard
  ctx.fillStyle = '#9fe0ff'; ctx.strokeStyle = '#5c6688'; ctx.lineWidth = 5; circle(0, -290, 20); ctx.fill(); ctx.stroke();
  if (st.fin && st.fin.t > 2.0) { ctx.save(); circle(0, -290, 18); ctx.clip(); ctx.fillStyle = C.pip; rr(-14, -292, 12, 20, 5); ctx.fill(); ctx.fillStyle = C.bo; rr(2, -294, 12, 22, 5); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(-7, -297, 5); ctx.fill();
  // the hatch on the left side (it swings open on a honk)
  const hy = -150, open = pad.open ? clamp(pad.openT / 0.4, 0, 1) : 0;
  ctx.fillStyle = '#2b2850'; rr(-56, hy - 26, 30, 52, 8); ctx.fill();
  if (st.crate.where === 'in') { ctx.fillStyle = '#c98b5a'; rr(-52, hy - 10, 24, 20, 4); ctx.fill(); }
  ctx.save(); ctx.translate(-56, hy - 26); ctx.scale(1 - open * 1.6, 1);
  ctx.fillStyle = '#d9dbe8'; ctx.strokeStyle = '#8a8fb0'; ctx.lineWidth = 2; rr(0, 0, 30, 52, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffc53d'; circle(22, 26, 3.5); ctx.fill();
  ctx.restore();
  if (!pad.open && st.parked) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6); text('HONK!', -40, hy - 44, 15, C.gold, 'center'); ctx.globalAlpha = 1; }
  // the cargo door at the bottom glows while the tractor beam is on
  if (st.fin && st.fin.t > 0.9 && st.fin.t < 2.1) { ctx.fillStyle = 'rgba(140,240,255,0.35)'; ctx.beginPath(); ctx.moveTo(-30, -20); ctx.lineTo(30, -20); ctx.lineTo(70, 30); ctx.lineTo(-170, 30); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
// Tow-Bot: a friendly hover robot with a magnet on a cable
function buggyDrawTowBot(st) {
  const o = st.oops, td = st.towDrop;
  if (td) { const u = clamp(td.t / 1.4, 0, 1); buggyTowBotShape(td.x + u * 120, buggyGround(st, td.x) - 280 - u * 80, 0, 1); }
  if (!o || o.t < 0.8) return;
  const b = st.bg, u = clamp((o.t - 0.8) / 0.5, 0, 1), leave = clamp((o.t - (BUGGY.oopsT - 0.35)) / 0.35, 0, 1);
  const tx = b.x, ty = b.y - 120;
  const x = buggyLerp(tx + 260, tx, buggySmooth(u)) + leave * 200, y = buggyLerp(ty - 220, ty, buggySmooth(u)) - leave * 220;
  if (u >= 1 && leave <= 0) { ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y + 26); ctx.lineTo(b.x, b.y - 34); ctx.stroke(); ctx.fillStyle = '#ff6b6b'; rr(b.x - 10, b.y - 40, 20, 10, 4); ctx.fill(); }
  buggyTowBotShape(x, y, Math.sin(G.clock * 3) * 0.08, 1);
}
function buggyTowBotShape(x, y, tilt, wave) {
  const t = G.clock;
  ctx.save(); ctx.translate(x, y + Math.sin(t * 4) * 4); ctx.rotate(tilt);
  ctx.fillStyle = 'rgba(140,220,255,0.35)'; ctx.beginPath(); ctx.moveTo(-14, 22); ctx.lineTo(14, 22); ctx.lineTo(6, 44 + Math.sin(t * 30) * 4); ctx.lineTo(-6, 44 + Math.sin(t * 30) * 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f2f2ff'; ctx.strokeStyle = '#5c6688'; ctx.lineWidth = 3;
  rr(-30, -24, 60, 48, 20); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2b2850'; rr(-20, -14, 40, 24, 10); ctx.fill();
  ctx.fillStyle = '#7fe8ff'; circle(-8, -3, 4); ctx.fill(); circle(8, -3, 4); ctx.fill();
  ctx.strokeStyle = '#7fe8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 2, 6, 0.3, Math.PI - 0.3); ctx.stroke();
  ctx.strokeStyle = '#5c6688'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, -34); ctx.stroke();
  ctx.fillStyle = '#ffc53d'; circle(0, -36, 4.5); ctx.fill();
  ctx.strokeStyle = '#5c6688'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(28, -4); ctx.lineTo(40, -14 - Math.abs(Math.sin(t * 8)) * 8 * wave); ctx.stroke();
  ctx.restore();
}
// the buggy itself: wheels on springs, the body, the hopper, the crew in their bubble helmets, the arm
function buggyDrawBuggy(st) {
  const B = BUGGY, b = st.bg, t = G.clock, ca = Math.cos(b.a), sa = Math.sin(b.a);
  const L = (lx, ly) => ({ x: b.x + ca * lx - sa * ly, y: b.y + sa * lx + ca * ly });
  // springs from the mounts down to the wheels
  for (const k of [0, 1]) {
    const w = b.wh[k], m = L((k ? 1 : -1) * B.wx, B.wy);
    ctx.strokeStyle = '#b4b8cc'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(m.x, m.y);
    for (let i = 1; i <= 6; i++) { const u = i / 6, side = i === 6 ? 0 : i % 2 ? 6 : -6; ctx.lineTo(buggyLerp(m.x, w.x, u) + ca * side, buggyLerp(m.y, w.y, u) + sa * side); }
    ctx.stroke();
  }
  // wheels
  for (const w of b.wh) {
    ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(w.spin);
    ctx.fillStyle = '#3b3a55'; circle(0, 0, B.wr + 1); ctx.fill();
    ctx.fillStyle = '#56547a'; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; ctx.fillRect(Math.cos(a) * (B.wr - 1) - 2.5, Math.sin(a) * (B.wr - 1) - 2.5, 5, 5); }
    ctx.fillStyle = '#d9dbe8'; circle(0, 0, 8); ctx.fill();
    ctx.strokeStyle = '#8a8fb0'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 7); ctx.stroke(); }
    ctx.fillStyle = '#ffc53d'; circle(0, 0, 2.5); ctx.fill();
    ctx.restore();
  }
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
  // antenna with a blinking light, and the roll bar
  const sway = clamp(b.vf * 0.04, -8, 10);
  ctx.strokeStyle = '#8a8fb0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(32, -14); ctx.quadraticCurveTo(34 - sway * 0.5, -40, 32 - sway, -58); ctx.stroke();
  ctx.fillStyle = Math.sin(t * 6) > 0 ? '#ff6b6b' : '#ffb0b0'; circle(32 - sway, -59, 3.5); ctx.fill();
  ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-26, -10); ctx.lineTo(-24, -48); ctx.quadraticCurveTo(0, -58, 24, -48); ctx.lineTo(26, -10); ctx.stroke();
  ctx.restore();
  // the crew, sitting (drawn rotated with the buggy), in bubble helmets
  if (st.state === 'finish' && st.fin.t > 1.2) { /* aboard the rocket */ } else for (const p of G.players) buggyDrawRider(st, p);
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
  // the chassis: a rounded tub, the front cowl with the headlight
  ctx.fillStyle = '#5c6688'; rr(-50, -2, 100, 14, 7); ctx.fill();
  ctx.fillStyle = '#eef0fa'; ctx.strokeStyle = '#8a8fb0'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-48, -16); ctx.lineTo(-26, -16); ctx.lineTo(-24, -12); ctx.lineTo(18, -12); ctx.lineTo(34, -22); ctx.quadraticCurveTo(50, -20, 52, -6); ctx.lineTo(50, 4); ctx.lineTo(-48, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PCOL[st.drv]; ctx.fillRect(-46, -6, 96, 4);
  ctx.fillStyle = PCOL[st.armId]; ctx.fillRect(-46, -2, 96, 3);
  ctx.fillStyle = '#ffe680'; circle(48, -10, 5); ctx.fill();
  if (st.honkVis > 0 || st.dark) { ctx.fillStyle = 'rgba(255,240,160,' + (0.3 + st.honkVis * 0.5) + ')'; circle(48, -10, 10 + st.honkVis * 6); ctx.fill(); }
  // the hopper (rocks pile up in its crate) and the arm's turret
  if (st.crate.where === 'hopper') {
    ctx.fillStyle = '#c98b5a'; ctx.strokeStyle = '#8a5833'; ctx.lineWidth = 2;
    rr(-54, -26, 30, 16, 4); ctx.fill(); ctx.stroke();
    const n = Math.min(12, st.rocks);
    for (let i = 0; i < n; i++) buggyDrawRock(-50 + (i % 4) * 7, -27 - Math.floor(i / 4) * 5, 0.42, false, t + i);
  }
  ctx.fillStyle = '#5c6688'; rr(-42, -30, 12, 14, 3); ctx.fill();
  ctx.restore();
  // the horn's sound rings
  if (st.hornT > 0) { const u = 1 - st.hornT / 0.45, h = L(52, -8); ctx.strokeStyle = 'rgba(255,240,160,' + (1 - u) + ')'; ctx.lineWidth = 3; for (const r of [14, 26]) { ctx.beginPath(); ctx.arc(h.x, h.y, r + u * 30, -0.7, 0.7); ctx.stroke(); } }
  buggyDrawArm(st);
}
function buggyDrawRider(st, p) {
  const b = st.bg, s = buggySeat(st, p.id);
  const sx = p.x, sy = p.y, sf = p.face;
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(st.state === 'swap' ? b.a * 0.5 : b.a);
  // drawPlayer draws at p.x, p.y in the current transform: put the feet at our origin for a moment
  p.x = -PW / 2; p.y = -PH; p.alive = true;
  p.face = p.id === st.drv ? 1 : (st.arm.ox < -10 ? -1 : 1);
  drawPlayer(p);
  // the bubble helmet
  ctx.fillStyle = 'rgba(200,235,255,0.18)'; ctx.strokeStyle = 'rgba(235,248,255,0.85)'; ctx.lineWidth = 2;
  circle(0, -PH + 8, 18); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(-9, -PH, 3, 5, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  p.x = sx; p.y = sy; p.face = sf;
}
// two arm segments (the elbow bends up, away from the ground) to the claw
function buggyArmJoints(st) {
  const pv = buggyPivot(st), cl = { x: pv.x + st.arm.ox, y: pv.y + st.arm.oy }, L1 = 92, L2 = 92;
  const dx = cl.x - pv.x, dy = cl.y - pv.y, d = Math.min(L1 + L2 - 0.01, Math.max(1, Math.hypot(dx, dy)));
  const a = Math.atan2(dy, dx), e = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const s = dx >= 0 ? -1 : 1, ea = a + s * e;
  return { pv, el: { x: pv.x + Math.cos(ea) * L1, y: pv.y + Math.sin(ea) * L1 }, cl };
}
function buggyDrawArm(st) {
  const { pv, el, cl } = buggyArmJoints(st), arm = st.arm;
  const seg = (a, b2, w) => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8a5a12'; ctx.lineWidth = w + 4; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
    ctx.strokeStyle = C.gold; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, a.y - w * 0.2); ctx.lineTo(b2.x, b2.y - w * 0.2); ctx.stroke();
  };
  seg(pv, el, 10); seg(el, cl, 8);
  ctx.fillStyle = '#5c6688'; circle(pv.x, pv.y, 7); ctx.fill(); circle(el.x, el.y, 6); ctx.fill();
  ctx.fillStyle = '#d9dbe8'; circle(el.x, el.y, 3); ctx.fill();
  // the claw: two fingers that close when holding (it always hangs straight down)
  const open = 1 - arm.shut;
  ctx.save(); ctx.translate(cl.x, cl.y);
  ctx.fillStyle = '#5c6688'; rr(-9, -6, 18, 10, 4); ctx.fill();
  ctx.strokeStyle = '#3b3a55'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 6, 2); ctx.quadraticCurveTo(s * (10 + open * 8), 12, s * (3 + open * 6), 20); ctx.stroke(); }
  ctx.restore();
  // the claw lamp (bright in the dark)
  ctx.fillStyle = st.dark ? '#fff6c8' : 'rgba(255,246,200,0.8)'; circle(cl.x, cl.y - 2, 3); ctx.fill();
  if (arm.miss > 0) { ctx.globalAlpha = arm.miss / 0.25; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; circle(cl.x, cl.y + 10, 16 + (0.25 - arm.miss) * 60); ctx.stroke(); ctx.globalAlpha = 1; }
}
// held and flying boulders, the crate, rocks zipping into the hopper
function buggyDrawLoose(st) {
  for (const o of st.c.boulders) {
    if (o.state === 'held' || o.state === 'fly') buggyDrawBoulderShape(o.x, o.y, o.r, o.spin, (o.home || 1) | 0, false);
    else if (o.state === 'away') { const u = clamp(o.t / 1.2, 0, 1), y = o.y - Math.abs(Math.sin(u * Math.PI * 2.5)) * 40 * (1 - u) - u * 40; ctx.globalAlpha = 1 - u; buggyDrawBoulderShape(o.x, y, o.r * (1 - u * 0.6), o.spin, (o.home || 1) | 0, false); ctx.globalAlpha = 1; }
  }
  if (st.arm.hold && st.arm.hold.kind === 'boulder') {
    const o = st.arm.hold.o;
    ctx.strokeStyle = '#3b3a55'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(st.arm.wx - 6, st.arm.wy + 16); ctx.lineTo(o.x - o.r * 0.55, o.y - o.r * 0.55); ctx.moveTo(st.arm.wx + 6, st.arm.wy + 16); ctx.lineTo(o.x + o.r * 0.55, o.y - o.r * 0.55); ctx.stroke();
  }
  const cr = st.crate;
  if (cr.where === 'held' || cr.where === 'fly' || cr.where === 'ground') {
    const p = buggyCratePos(st);
    ctx.fillStyle = '#c98b5a'; ctx.strokeStyle = '#8a5833'; ctx.lineWidth = 2.5; rr(p.x - 18, p.y - 14, 36, 28, 5); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#8a5833'; ctx.beginPath(); ctx.moveTo(p.x - 18, p.y); ctx.lineTo(p.x + 18, p.y); ctx.stroke();
    for (let i = 0; i < 4; i++) buggyDrawRock(p.x - 11 + i * 7, p.y - 16, 0.45, false, G.clock + i);
  }
  const b = st.bg, hx = b.x + Math.cos(b.a) * -39 - Math.sin(b.a) * -26, hy = b.y + Math.sin(b.a) * -39 + Math.cos(b.a) * -26;
  for (const f of st.flyRocks) { const u = buggySmooth(clamp(f.t / 0.6, 0, 1)); buggyDrawRock(buggyLerp(f.x, hx, u), buggyLerp(f.y, hy, u) - Math.sin(u * Math.PI) * 40, 1 - u * 0.5, false, G.clock); }
}
// a dotted gold line from the claw to what it should do next (boulders, the pile, the toss spot, the hatch)
function buggyDrawGuide(st) {
  if (st.state !== 'drive' || G.introT > 0 || buggyQuiet(st.armId)) return;
  const nd = buggyNeeds(st);
  if (!nd.target || !['boulder', 'toss', 'pile', 'drop', 'crate', 'hatch'].includes(nd.arm)) return;
  const cl = { x: st.arm.wx, y: st.arm.wy }, tg = nd.target, t = G.clock;
  ctx.strokeStyle = 'rgba(255,197,61,0.8)'; ctx.lineWidth = 3; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t * 30;
  ctx.beginPath(); ctx.moveTo(cl.x, cl.y); ctx.lineTo(tg.x, tg.y); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
  const r = 14 + Math.sin(t * 6) * 3;
  ctx.strokeStyle = C.gold; ctx.lineWidth = 3; circle(tg.x, tg.y, r); ctx.stroke();
  if (nd.arm === 'toss' || nd.arm === 'drop' || nd.arm === 'hatch') { ctx.beginPath(); ctx.moveTo(tg.x - 7, tg.y - 7); ctx.lineTo(tg.x + 7, tg.y + 7); ctx.moveTo(tg.x + 7, tg.y - 7); ctx.lineTo(tg.x - 7, tg.y + 7); ctx.stroke(); }
}
// the dark side: only the headlight, the claw lamp and a glow around the buggy light the way
function buggyDrawDark(st) {
  const b = st.bg, cam = st.cam, ca = Math.cos(b.a), sa = Math.sin(b.a);
  const hx = b.x + ca * 50 + sa * 10 - cam.x, hy = b.y + sa * 50 - ca * 10 - cam.y, len = 430, spread = 0.34 + st.honkVis * 0.1;
  const cl = { x: st.arm.wx - cam.x, y: st.arm.wy - cam.y }, bx = b.x - cam.x, by = b.y - cam.y;
  const holes = k => {
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.cos(b.a - spread * k) * len * k, hy + Math.sin(b.a - spread * k) * len * k);
    ctx.lineTo(hx + Math.cos(b.a + spread * k) * len * k, hy + Math.sin(b.a + spread * k) * len * k);
    ctx.closePath();
    ctx.moveTo(cl.x + 80 * k, cl.y); ctx.arc(cl.x, cl.y, 80 * k, 0, Math.PI * 2);
    ctx.moveTo(bx + 110 * k, by); ctx.arc(bx, by, 110 * k, 0, Math.PI * 2);
  };
  if (st.state === 'finish' || st.state === 'swap') return;
  for (const [k, a] of [[1.15, 0.35], [0.85, 0.4]]) {
    ctx.fillStyle = 'rgba(4,4,20,' + a + ')';
    ctx.beginPath(); ctx.rect(0, 0, W, H); holes(k); ctx.fill('evenodd');
  }
  // moon rocks glint through the dark
  for (const r of st.c.rocks) {
    if (r.got) continue;
    const p = buggyRockPos(st, r), x = p.x - cam.x, y = p.y - cam.y;
    if (x < -20 || x > W + 20) continue;
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(G.clock * 3 + r.ph);
    ctx.fillStyle = '#bfe8ff'; buggyStarPath(x, y, 6, 2, G.clock); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ---------- the HUD: clock and rocks, the job panels, prompts over the heads ---------- */
function buggyHud(st) {
  const B = BUGGY, big = hudBig(), z = big ? 1.4 : 1, ps = G.players, play = G.mode === 'play' || G.mode === 'paused', t = G.clock;
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = st.rocks + ' / ' + (st.rocksAll || st.rocksN);
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.2, gap = fs;
    const w = tw + gap + icon + fs * 0.4 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, C.paper, 'left', 'body');
    buggyDrawRock(x0 + 15 + tw + gap + icon / 2, cy, fs / 16, false, t);
    text(n, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, '#bfe8ff', 'left', 'body');
    timeX0 = x0;
  }
  if (!play) return;
  const nd = buggyNeeds(st), D = st.drv, A = st.armId;
  // the job panels, bottom corners: Pip's on the left, Bo's on the right
  for (const id of [0, 1]) {
    const drv = id === D, pw = Math.round(258 * z), ph = Math.round(56 * z), py = H - ph - 10;
    const px = id === 0 ? 12 : W - 12 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const cpuSeat = buggyQuiet(id);
    text(NAMES[id] + (drv ? ' drives' : ' works the claw') + (cpuSeat ? ' (computer)' : ''), px + 12 * z, py + 15 * z, 15 * z, PCOL[id], 'left');
    let chips;
    if (drv) {
      const go = ['speed', 'full', 'park', 'back', 'stopEdge', 'level'].includes(nd.drv);
      chips = [['lr', nd.drv === 'level' ? 'TILT' : 'DRIVE', go], ['jump', 'HOP', nd.drv === 'hop'], ['act', 'HONK', nd.drv === 'honk' || nd.drv === 'honkHatch']];
    } else {
      const reach = nd.target && Math.hypot(nd.target.x - st.arm.wx, nd.target.y - st.arm.wy) < (st.magnet ? 60 : 36);
      const holding = !!st.arm.hold;
      chips = [['claw', 'MOVE', !!nd.target && !reach && nd.arm !== 'ready'], ['act', holding ? 'LET GO' : 'GRAB', (reach && !holding) || (holding && buggyLetGoNow(st, nd))]];
    }
    const n = chips.length, cw = (pw - 24 * z - (n - 1) * 8 * z) / n;
    chips.forEach(([k, lab, on], i) => {
      const cx = px + 12 * z + i * (cw + 8 * z), cy = py + 26 * z, chh = 24 * z;
      ctx.fillStyle = on ? (Math.sin(t * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : 'rgba(255,255,255,0.12)';
      rr(cx, cy, cw, chh, chh / 2); ctx.fill();
      const kk = cpuSeat ? '' : buggyKey(id, k);
      let fs = 12 * z, s = (kk ? kk + ' ' : '') + lab;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      while (fs > 8 && ctx.measureText(s).width > cw - 8) { fs -= 0.5; ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; }
      text(s, cx + cw / 2, cy + chh / 2 + 0.5, fs, on ? C.ink : '#d9d3ef', 'center', 'body');
    });
  }
  // the message line (gold help): between the level pill and the clock when it fits, else under the room pill
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
  if (G.introT > 0 || st.state !== 'drive') return;
  // prompts over the heads: the driver's opens to the right, the arm worker's to the left, so they never overlap.
  // A hint bubble replaces that player's prompt while it shows.
  const fs = 14 * z, yMax = H - Math.round(56 * z) - 18;
  const place = (p, w, h) => {
    const hx = p.x + PW / 2, right = p.id === D;
    const y = clamp(p.y - 30 * z - h, big ? 60 : 46, yMax - h);
    return { x: clamp(right ? hx - 10 * z : hx + 10 * z - w, 4, W - w - 4), y };
  };
  const say = (p, str, col, pulse) => {
    if (buggyQuiet(p.id) || st.hints[p.id]) return;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, o = place(p, w, h);
    const s = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(o.x + w / 2, o.y + h / 2); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
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
  const Dp = ps[D], Ap = ps[A], b = st.bg;
  // the driver
  if (st.towHold > 0.15) say(Dp, 'Calling Tow-Bot... ' + Math.ceil((B.towHold - st.towHold) * 10) / 10 + 's', '#bfe8ff', false);
  else if (nd.drv === 'level') say(Dp, 'Level out! ' + buggyKey(D, b.a > 0 ? 'left' : 'right'), C.gold, true);
  else if (nd.drv === 'honk') say(Dp, 'A sleepy critter! Honk ' + buggyKey(D, 'act'), C.gold, true);
  else if (nd.drv === 'hop') say(Dp, 'Hop! ' + buggyKey(D, 'jump'), C.gold, true);
  else if (nd.drv === 'speed') say(Dp, 'Crater! Speed up ' + buggyKey(D, 'right'), '#ffe7a8', false);
  else if (nd.drv === 'full') say(Dp, 'Ramp! Full speed ' + buggyKey(D, 'right'), '#ffe7a8', true);
  else if (nd.drv === 'stopEdge') say(Dp, b.vf > 60 ? 'Slow down! Stop at the edge ' + buggyKey(D, 'left') : 'Creep up to the edge ' + buggyKey(D, 'right'), C.gold, b.vf > 60);
  else if (nd.drv === 'waitArm' && nd.fill) say(Dp, 'Wait here: ' + NAMES[A] + ' fills the crater', '#d9d3ef', false);
  else if (nd.drv === 'waitArm') say(Dp, 'Wait for ' + NAMES[A] + '\'s claw', '#d9d3ef', false);
  else if (nd.drv === 'park') say(Dp, 'Park in the box ' + buggyKey(D, 'right'), C.gold, false);
  else if (nd.drv === 'back') say(Dp, buggyKey(D, 'left') + ' Back up into the box', C.gold, true);
  else if (nd.drv === 'stop') say(Dp, 'Stop here! Let go', C.gold, true);
  else if (nd.drv === 'honkHatch') say(Dp, 'Honk the hatch open! ' + buggyKey(D, 'act'), C.gold, true);
  else if (st.stuckT > 6) say(Dp, 'Stuck? Hold ' + buggyKey(D, 'down') + ' for Tow-Bot', '#bfe8ff', false);
  // the arm worker
  const holding = st.arm.hold, near = nd.target && Math.hypot(nd.target.x - st.arm.wx, nd.target.y - st.arm.wy) < (st.magnet ? 60 : 36);
  if (nd.arm === 'boulder') say(Ap, near ? 'Grab it! ' + buggyKey(A, 'act') : buggyKey(A, 'claw') + ' Claw to the boulder', C.gold, near);
  else if (nd.arm === 'toss') say(Ap, buggyLetGoNow(st, nd) ? 'Let go! ' + buggyKey(A, 'act') : buggyKey(A, 'left') + ' Swing it back behind', C.gold, buggyLetGoNow(st, nd));
  else if (nd.arm === 'pile') say(Ap, near ? 'Grab a boulder! ' + buggyKey(A, 'act') : buggyKey(A, 'claw') + ' Claw to the rock pile', C.gold, near);
  else if (nd.arm === 'drop') say(Ap, buggyLetGoNow(st, nd) ? 'Drop it in! ' + buggyKey(A, 'act') : 'Over the crater ' + buggyKey(A, 'right'), C.gold, buggyLetGoNow(st, nd));
  else if (nd.arm === 'crate') say(Ap, near ? 'Grab the crate! ' + buggyKey(A, 'act') : buggyKey(A, 'claw') + ' Claw to the crate', C.gold, near);
  else if (nd.arm === 'hatch') say(Ap, buggyLetGoNow(st, nd) ? 'Let go! ' + buggyKey(A, 'act') : 'Up to the hatch ' + buggyKey(A, 'claw'), C.gold, buggyLetGoNow(st, nd));
  else if (nd.arm === 'rock' && !holding) {
    const rp = nd.target, d = Math.hypot(rp.x - st.arm.wx, rp.y - st.arm.wy);
    if (d < 140) say(Ap, d < 30 ? 'Grab it! ' + buggyKey(A, 'act') : 'Moon rock! ' + buggyKey(A, 'claw'), '#bfe8ff', d < 30);
  }
  for (const p of ps) if (st.hints[p.id]) bubble(p, st.hints[p.id].text);
}
// is the held thing where letting go does the job?
function buggyLetGoNow(st, nd) {
  const arm = st.arm, b = st.bg;
  if (!arm.hold) return false;
  if (nd.arm === 'toss') return arm.wx < b.x - 80;
  if (nd.arm === 'drop') return nd.fill && arm.wx > nd.fill.x0 + 6 && arm.wx < nd.fill.x1 - 20;
  if (nd.arm === 'hatch') { const pad = st.c.pad; return pad && Math.hypot(arm.wx - (pad.rocket - 58), arm.wy + 26 - (buggyGround(st, pad.rocket) - 150)) < (st.hatchMag ? BUGGY.hatchRGold : BUGGY.hatchR) - 6; }
  return false;
}

/* ---------- sounds ---------- */
Sfx.extra.buggyPutt = function () { this.tone(70 + Math.random() * 10, 0.06, 'triangle', 0.03, 55); };
Sfx.extra.buggyHop = function (p) { this.tone(260 * p, 0.2, 'sine', 0.06, 620 * p); };
Sfx.extra.buggyLand = function () { this.tone(120, 0.16, 'sine', 0.07, 70); this.tone(420, 0.12, 'sine', 0.025, 260, 0.04); };
Sfx.extra.buggyBoing = function () { this.tone(150, 0.4, 'sine', 0.09, 620); this.tone(300, 0.3, 'triangle', 0.03, 900, 0.05); };
Sfx.extra.buggyBonk = function () { this.tone(200, 0.12, 'triangle', 0.08, 110); this.tone(900, 0.05, 'square', 0.02, 500); };
Sfx.extra.buggyBeep = function () { this.tone(880, 0.08, 'square', 0.03); this.tone(880, 0.08, 'square', 0.03, null, 0.12); };
Sfx.extra.buggyHonk = function () { this.tone(392, 0.13, 'square', 0.05, 380); this.tone(523, 0.13, 'square', 0.03, 500); this.tone(392, 0.18, 'square', 0.05, 370, 0.17); this.tone(523, 0.18, 'square', 0.03, 490, 0.17); };
Sfx.extra.buggyCritter = function () { [660, 990, 1320].forEach((f, i) => this.tone(f, 0.09, 'sine', 0.05, f * 1.2, i * 0.07)); };
Sfx.extra.buggyHatch = function () { this.tone(300, 0.25, 'sawtooth', 0.025, 600); [784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, 0.2 + i * 0.08)); };
Sfx.extra.buggyClack = function () { this.tone(1400, 0.03, 'square', 0.025, 900); };
Sfx.extra.buggyGrab = function () { this.tone(1200, 0.04, 'square', 0.035, 700); this.tone(180, 0.1, 'triangle', 0.06, 120, 0.02); };
Sfx.extra.buggyLetGo = function () { this.tone(500, 0.08, 'triangle', 0.035, 900); };
Sfx.extra.buggyRock = function () { [1319, 1760, 2093].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.045, null, i * 0.05)); };
Sfx.extra.buggyPlop = function () { this.tone(220, 0.25, 'sine', 0.08, 70); this.tone(90, 0.3, 'triangle', 0.06, 50, 0.05); };
Sfx.extra.buggyFilled = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, 0.15 + i * 0.07)); };
Sfx.extra.buggyToss = function () { this.tone(260, 0.3, 'sawtooth', 0.02, 90); [784, 988].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.045, null, 0.12 + i * 0.07)); };
Sfx.extra.buggyThud = function () { this.tone(110, 0.18, 'triangle', 0.08, 60); };
Sfx.extra.buggyPark = function () { [659, 880].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.09)); };
Sfx.extra.buggyWhoops = function () { this.tone(700, 0.45, 'sine', 0.06, 220); this.tone(500, 0.3, 'triangle', 0.025, 160, 0.1); };
Sfx.extra.buggyTowCall = function () { this.tone(600, 0.12, 'sine', 0.05, 900); this.tone(900, 0.12, 'sine', 0.05, 600, 0.14); };
Sfx.extra.buggyTow = function () { this.tone(300, 0.6, 'sine', 0.04, 600); this.tone(1200, 0.08, 'square', 0.02, null, 0.1); this.tone(1500, 0.08, 'square', 0.02, null, 0.22); };
Sfx.extra.buggyFlag = function () { [523, 784, 1047].forEach((f, i) => this.tone(f, 0.11, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.buggyHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.buggySwap = function () { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.buggyLoaded = function () { [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.055, null, i * 0.08)); };
Sfx.extra.buggyBeam = function () { this.tone(400, 1.0, 'sine', 0.04, 1200); this.tone(600, 1.0, 'triangle', 0.015, 1800, 0.05); };
Sfx.extra.buggyCount = function () { this.tone(660, 0.14, 'square', 0.045); };
Sfx.extra.buggyLaunch = function () { this.tone(990, 0.3, 'square', 0.05); this.tone(80, 1.6, 'sawtooth', 0.05, 40, 0.1); this.tone(1200, 1.2, 'sine', 0.03, 300, 0.2); };
/* ===== end of MODES.buggy ===== */
