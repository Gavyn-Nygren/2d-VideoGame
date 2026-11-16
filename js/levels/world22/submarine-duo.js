/* Pip & Bo - Level 22-1 Submarine Duo (team, World 22 Coral Deep). */
'use strict';

/* ===== 22-1 Submarine Duo (mode 'subduo', World 22 "Coral Deep", team, Gavyn's pick) =====
   Pip and Bo ride ONE little yellow-and-teal submarine, seen from the side, through a reef canyon that scrolls to the
   right. The mode owns the tick, the camera, the whole picture and the HUD (def.ownStep + def.ownHUD + def.noFalls); the
   engine grid is empty apart from the two spawns. All positions are world px (x grows to the right, y grows down, the
   canyon is one screen tall, so the camera only scrolls sideways).
   THE STEERER (front seat, a little wheel): ◀ ▶ ▲ ▼ push the sub with gentle water physics (it glides and slows by
   itself). The action is 'toot': the horn. Sleepy pufferfish within earshot float up out of the way for a while and the
   fish scatter. Bumping coral, rock, a turtle or a pufferfish at speed is a soft BONK: a wobble, bubbles and a bounce,
   counted for the medal. Slow touches just slide. Nobody is ever hurt.
   THE GRABBER (back seat, a joystick): ◀ ▶ ▲ ▼ move the claw on its long arm (it reaches about 165 px from the front of
   the sub, never back over the hull). The action is 'grab': close the claw on whatever is under it, press again to let
   go. The grabber can't move the sub, and the steerer can't use the claw, so neither can finish a stretch alone.
   THINGS IN THE CANYON:
     pearls and shells: grab them with the claw (the sub just bumps past them). They are the collectibles.
     BOULDER passes: the canyon pinches and a boulder sits in the gap. Grab it, then the steerer backs up while the
       grabber lowers it into the sandy hole before the pinch ("Plop! It fits!"). Let go anywhere else and it sinks to
       the sand where it is (grab it again). Holding a boulder makes the sub slow. (Carrying it forward right through the
       pinch and letting go on the far side clears the way too: "Out of the way!", and the prompts then say let go.)
     LOG passes: a floaty log leans across the whole canyon from the floor to the roof. Grab it high up and pull it down
       toward the sub: the grabber pushes the claw ◀ ▼ while the steerer backs up so the log has room. Let go when it is
       nearly flat and it lies down on the sand; let go too soon (or the sub drifts out of reach and it slips) and it
       floats back up.
     CLAM gates: Clammy, a giant sleepy clam, shuts the canyon. Find her conch shell (nearby, on the sand), carry it to her
       glowing mouth and she yawns open (and gives you a big pearl, worth 3).
     turtles swim slowly up and down, pufferfish bob in tight spots, gentle currents push the sub, fish scatter.
   THE END OF A STRETCH: a checkpoint buoy whose chain hangs a gold ring in the water; the grabber clips the claw onto the
   ring. Then the sub rests, Pip and Bo hop over each other and SWAP JOBS. 4 stretches (roomWord 'Stretch'): Sunny
   Shallows, Kelp Forest, Coral Canyon, Treasure Grotto. Pip steers 1 and 3, Bo steers 2 and 4 (room def `steer`). The
   last stretch ends at the treasure chest: grab its handle.
   GOLD HELP (always announced in the news line, only while both players are playing): 35 s at one blocker or 3 slips or
   drops there: a gold boulder (let go anywhere and it rolls into the hole), a gold log (light, never slips, lies down
   from halfway), a gold conch (it floats to the claw and Clammy's mouth gets wide). 4 bonks in one tight spot: gold
   bubbles there (bumps are soft and don't count). 20 s at the buoy ring: a gold ring, twice as easy to grab.
   IDLE: when no person has pressed anything for 12 s the sub waits ("Taking a break") and the clock stops.
   Scoring: pearls (shells 1, Clammy's big pearls 3), bonks, time. Medal (MODES.subduo.medals, js/medals.js): Gold at <= 4:30 with <= 6 bonks and 50% of the
   pearls, Silver at <= 7:00 with <= 16 bonks, else Bronze (tuned with bots: a computer pair takes about 3:07,
   prompt-following kid pairs 3:45-4:30, slow kid pairs 6-7 minutes).
   Room def: { title, steer: 0|1, look: 'shallows'|'kelp'|'canyon'|'grotto', tip, act, top, bot, course: [tokens] }.
   Course tokens (y is absolute world y; a negative y means that far above the floor):
     fN flat   mN:T:B smoothly move the roof to T and the floor to B over N px   p:y[:n:gap] pearl(s)   h:y shell
     K:f:r / K:c:r coral head on the floor / hanging from the roof (radius r)   T:y:amp turtle   P:y pufferfish
     U:len:ax:ay current (acceleration px/s²)   Q a school of fish   S:text sign ({S} the steerer's name, {G} the grabber's)
     B boulder pass (hollow + pinch, needs a tall canyon)   L log pass   C:dx conch dx px back + Clammy's gate   E the end.
   MODES.subduo.plan(st) is the one place that says what to do next (the prompts, the HUD chips and the computer brain
   read it); MODES.subduo.canGrab(st) says what a press of grab would catch right now.
   Every global is prefixed subduo / SUBD (and Sfx.extra.subduo*); all state lives in G.mst. */
const SUBD = {
  acc: 430, drag: 1.9, heavyK: 0.6, ctrlStun: 0.35,
  hull: [[-34, 4, 22], [0, 2, 28], [34, 4, 22], [0, -22, 22]],
  hullTop: 44, hullBot: 30, hullHalf: 56,
  bonkV: 85, bonkCd: 1.0, wobT: 0.8,
  shX: 38, shY: 24, reach: 165, reachMin: 34, clawV: 250, angMin: -1.35, angMax: 2.75,
  grabR: 34, pearlR: 32,
  boulderR: 50, hollowW: 140, hollowD: 102, plopDX: 44,
  logLen: 266, logR: 15, logLean: 0.2, logV: 1.15, logFlat: 0.34, slipD: 34,
  ringR: 38, chestR: 40,
  camLead: 330, tryWin: 6, idleWait: 12,
  goldStuck: 35, goldSlips: 3, endGold: 20, cushionN: 4,
  swapT: 3.3, finT: 5.0, STEP: 4,
};
const subduoLerp = (a, b, u) => a + (b - a) * u;
const subduoSmooth = u => u * u * (3 - 2 * u);

/* ---------- the course: tokens -> roof and floor heights (4 px steps) and everything in the canyon ---------- */
function subduoCompile(def) {
  const S = SUBD, X0 = -420, steer = def.steer || 0;
  const name = s => s.replace(/\{S\}/g, NAMES[steer]).replace(/\{G\}/g, NAMES[1 - steer]);
  const c = { x0: X0, look: def.look || 'shallows', pearls: [], corals: [], turtles: [], puffers: [], currents: [], signs: [], schools: [],
    boulders: [], logs: [], clams: [], jobs: [], end: null, len: 0 };
  const ct = [], cb = [];
  let x = X0, top = def.top || 80, bot = def.bot || 440;
  const seg = (len, ft, fb) => {
    len = Math.max(S.STEP, Math.round(len / S.STEP) * S.STEP);
    for (let k = 0; k < len; k += S.STEP) { ct.push(ft(k, len)); cb.push(fb(k, len)); }
    x += len;
  };
  const flat = len => { const t0 = top, b0 = bot; seg(len, () => t0, () => b0); };
  const move = (len, T, B) => { const t0 = top, b0 = bot; seg(len, (k, L) => subduoLerp(t0, T, subduoSmooth(k / L)), (k, L) => subduoLerp(b0, B, subduoSmooth(k / L))); top = T; bot = B; };
  const yOf = v => (v < 0 ? bot + v : v);
  flat(-X0);
  for (const tk of def.course || []) {
    const t = String(tk), parts = t.split(':'), k = parts[0];
    const a = +parts[1] || 0, b = +parts[2] || 0;
    if (k === 'S') { c.signs.push({ x, y: bot, text: name(t.slice(2)) }); continue; }
    if (k[0] === 'f' && k.length > 1) { flat(+k.slice(1)); continue; }
    if (k[0] === 'm' && k.length > 1) { move(+k.slice(1), a, b); continue; }
    if (k === 'p' || k === 'h') {
      const n = +parts[2] || 1, gap = +parts[3] || 56;
      for (let i = 0; i < n; i++) c.pearls.push({ x: x + i * gap, y: yOf(a), kind: k === 'p' ? 'pearl' : 'shell', val: 1, got: false, t: 0, floor: a < 0 });
      continue;
    }
    if (k === 'K') {
      const r = b || 50, onFloor = parts[1] !== 'c';
      c.corals.push({ x, y: onFloor ? bot - r * 0.55 : top + r * 0.55, r, floor: onFloor, kind: hash(c.corals.length + 3, Math.round(x)) % 3 });
      continue;
    }
    if (k === 'T') { c.turtles.push({ x0: x, y0: a, amp: b || 60, x, y: a, ph: c.turtles.length * 1.7, r: 30, boop: 0 }); continue; }
    if (k === 'P') { c.puffers.push({ x0: x, y0: a, x, y: a, r: 18, puff: 0, away: 0, off: 0, ph: c.puffers.length * 2.3 }); continue; }
    if (k === 'U') { c.currents.push({ x0: x, x1: x + a, ax: b, ay: +parts[3] || 0, y0: top, y1: bot }); continue; }
    if (k === 'Q') { c.schools.push({ x, y: (top + bot) / 2 + (hash(c.schools.length, 7) % 80) - 40, n: 7, col: ['#ffd36b', '#ff9fb5', '#9fe8ff', '#b8f28a'][c.schools.length % 4], scat: 0 }); continue; }
    if (k === 'B') {
      // a boulder pass: flat, a sandy hole, flat, then the roof pinches down over a boulder sitting on the sand
      const Fy = bot, Ty = top;
      flat(70);
      const hx0 = x, hw = S.hollowW, D = S.hollowD;
      seg(hw, () => Ty, (kk, L) => Fy + D * Math.pow(clamp(Math.sin(Math.PI * kk / L) * 1.7, 0, 1), 2));
      const hollow = { x0: hx0, x1: hx0 + hw, x: hx0 + hw / 2, fy: Fy, i0: Math.round((hx0 - X0) / S.STEP), i1: Math.round((hx0 + hw - X0) / S.STEP), filled: false };
      flat(190);
      const pin = Fy - 150;
      move(90, pin, Fy);
      const px0 = x;
      flat(240);
      move(90, Ty, Fy);
      const bo = { x: px0 + 120, y: Fy - S.boulderR, r: S.boulderR, home: { x: px0 + 120, y: Fy - S.boulderR }, state: 'rest', vy: 0, hollow, done: false, id: c.boulders.length, slips: 0, gold: false, jx: px0 + 120, pin1: x };
      c.boulders.push(bo);
      c.jobs.push({ kind: 'boulder', x: hollow.x0 - 40, o: bo, t: 0 });
      continue;
    }
    if (k === 'L') {
      // a log pass: the roof comes down to 260 px over a flat floor, room for the log to lie down, then the log
      const Fy = bot, Ty = top;
      move(200, Fy - 260, Fy);
      flat(S.logLen + 240);
      const px = x;
      flat(120);
      move(200, Ty, Fy);
      const th0 = -Math.PI / 2 - S.logLean;
      const lg = { px, py: Fy, len: S.logLen, th: th0, th0, state: 'up', u: 0.8, done: false, slips: 0, gold: false, id: c.logs.length };
      c.logs.push(lg);
      c.jobs.push({ kind: 'log', x: px - S.logLen - 120, o: lg, t: 0 });
      continue;
    }
    if (k === 'C') {
      // Clammy's gate at x, her conch on the sand dx px before it
      const dx = a || 500, mid = (top + bot) / 2;
      const conch = { x: x - dx, y: bot - 16, home: null, state: 'rest', vy: 0, r: 16, held: false };
      conch.home = { x: conch.x, y: conch.y };
      const cl = { x, x1: x + 96, top, bot, mid, mouth: { x: x + 4, y: mid }, open: 0, done: false, conch, slips: 0, gold: false, id: c.clams.length, gift: null };
      c.clams.push(cl);
      c.jobs.push({ kind: 'clam', x: conch.x - 60, o: cl, t: 0 });
      flat(130);
      continue;
    }
    if (k === 'E') {
      const mid = (top + bot) / 2;
      flat(340);
      const ex = x;
      flat(420);
      c.end = { x: ex, ringX: ex, ringY: c.look === 'grotto' ? bot - 46 : mid + 10, chainTop: top, chest: c.look === 'grotto', got: false, gold: false, t: 0, wall: x - 40 };
      c.jobs.push({ kind: 'end', x: ex - 300, o: c.end, t: 0 });
      continue;
    }
  }
  flat(300);
  c.ct = Float32Array.from(ct); c.cb = Float32Array.from(cb);
  c.len = x;
  // the gift pearl inside each clam (worth 3) counts toward the total
  return c;
}
function subduoIdx(st, x) { const c = st.c; return clamp((x - c.x0) / SUBD.STEP, 0, c.ct.length - 1.001); }
function subduoCeil(st, x) { const c = st.c, f = subduoIdx(st, x), i = Math.floor(f), u = f - i; return c.ct[i] + (c.ct[Math.min(i + 1, c.ct.length - 1)] - c.ct[i]) * u; }
function subduoFloor(st, x) { const c = st.c, f = subduoIdx(st, x), i = Math.floor(f), u = f - i; return c.cb[i] + (c.cb[Math.min(i + 1, c.cb.length - 1)] - c.cb[i]) * u; }
// the lowest roof / highest floor across a span (for things wider than a point)
function subduoSpan(st, x0, x1, fn, pick) { let v = fn(st, x0); for (let x = x0 + 8; x <= x1; x += 8) v = pick(v, fn(st, x)); return pick(v, fn(st, x1)); }
const subduoSurface = (st, x) => st.look === 'shallows' && subduoCeil(st, x) <= 76;

// each player's own keys (a player with a controller is shown its buttons, touch shows the arrows)
function subduoKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
  if (what === 'right') return pad || touch ? '▶' : id === 0 ? 'D' : '→';
  if (what === 'left') return pad || touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'up') return pad || touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'down') return pad || touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'arrows') return pad ? 'stick' : touch ? '◀▶▲▼' : id === 0 ? 'WASD' : 'arrows';
  return '';
}
const subduoQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
// a person (not the computer) pressed nothing for this long
const subduoAway = (st, id) => G.time - st.inT[id] > SUBD.tryWin;

/* ---------- a stretch (one room) ---------- */
function subduoRoom(st, L, k) {
  const def = L.def;
  st.k = k; st.steer = def.steer || 0; st.grab = 1 - st.steer; st.look = def.look || 'shallows'; st.title = def.title || '';
  st.c = subduoCompile(def);
  const mid = (subduoCeil(st, 0) + subduoFloor(st, 0)) / 2;
  st.sub = { x: 0, y: mid, vx: 0, vy: 0, mvx: 0, mvy: 0, wob: 0, bonkCd: 0, stun: 0, tilt: 0, prop: 0, heavy: false };
  st.claw = { ox: 70, oy: 46, hold: null, shut: 0, snapT: 0, x: 0, y: 0, dx: 0, dy: 0 };
  st.state = 'go'; st.dock = null; st.roomT = 0; st.segStart = G.time;
  st.cam = { x: st.sub.x - SUBD.camLead, y: 0 };
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null;
  st.bucket = {}; st.cushion = {}; st.bonkHere = 0; st.waiting = false; st.tootT = 0;
  st.stats.roomT[k] = null;
  subduoClawPos(st);
  subduoMirror(st);
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function subduoStep(st, dt) {
  if (!st.c) return;
  const ps = G.players;
  for (const q of [0, 1]) {
    const i = ps[q].input;
    if (i.left || i.right || i.jump || i.down || i.up || i.act || ps[q].pendingJump || ps[q].pendingAct) st.inT[q] = G.time;
    if (!cpuOn(q) && (i.left || i.right || i.jump || i.down || i.up || i.act)) st.personT = G.time;
  }
  st.roomT += dt;
  subduoActLabels(st);
  // nobody (no person) has pressed anything for a while: the sub waits and the clock stops
  const people = [0, 1].filter(q => !cpuOn(q));
  st.waiting = st.state === 'go' && G.introT <= 0 && people.length > 0 && G.time - st.personT > SUBD.idleWait;
  if (st.waiting) G.time -= dt;
  if (G.introT > 0 || st.waiting) {
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
    subduoDrift(st, dt);
  } else if (st.state === 'go') {
    subduoSteer(st, dt);
    subduoArm(st, dt);
    subduoThings(st, dt);
    subduoMoveSub(st, dt);
    subduoHeld(st, dt);
    subduoClawPos(st);
    subduoHelp(st, dt);
    subduoNudges(st, dt);
  } else {
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
    subduoThings(st, dt);
    if (subduoDockStep(st, dt)) return;
  }
  subduoCam(st, dt);
  subduoFx(st, dt);
  subduoMirror(st);
}
const subduoBoth = st => G.time - st.inT[0] < SUBD.tryWin && G.time - st.inT[1] < SUBD.tryWin;

/* ---------- the steerer: thrust ---------- */
function subduoSteer(st, dt) {
  const S = SUBD, p = G.players[st.steer], i = p.input, s = st.sub;
  p.pendingJump = false;
  if (p.pendingAct) { p.pendingAct = false; subduoToot(st); }
  const dx = (i.right ? 1 : 0) - (i.left ? 1 : 0), dy = ((i.down ? 1 : 0) - (i.jump || i.up ? 1 : 0));
  const k = (s.heavy ? S.heavyK : 1) * (s.stun > 0 ? 0.25 : 1);
  const n = dx && dy ? Math.SQRT1_2 : 1;
  s.vx += dx * n * S.acc * k * dt; s.vy += dy * n * S.acc * k * dt;
  s.thrust = dx || dy ? 1 : 0; s.tdx = dx;
}
// the sub glides to a stop by itself (and during intro cards and breaks)
function subduoDrift(st, dt) {
  const s = st.sub;
  s.vx *= Math.max(0, 1 - 3 * dt); s.vy *= Math.max(0, 1 - 3 * dt);
  s.x += s.vx * dt; s.y += s.vy * dt;
  subduoCollide(st, false);
  subduoClawPos(st);
}
function subduoToot(st) {
  const s = st.sub;
  st.tootT = 0.6; st.stats.toots++;
  Sfx.play('subduoToot', st.steer);
  subduoPop(st, s.x + 60, s.y - 70, 'Toot toot!', '#ffffff', 20);
  for (let i = 0; i < 6; i++) subduoPart(st, s.x + 50, s.y - 20, 60 + Math.random() * 80, -40 + Math.random() * 80, 0.7, 'rgba(255,255,255,0.8)', 3, -30, 'note');
  for (const f of st.c.puffers) if (Math.abs(f.x - s.x) < 420 && f.away <= 0) { f.away = 7; f.puff = 1; subduoPop(st, f.x, f.y - 40, 'Excuse me!', '#ffe7a8', 16); }
  for (const q of st.c.schools) if (Math.abs(q.x - s.x) < 500) q.scat = 1.5;
}

/* ---------- the grabber: the claw ---------- */
function subduoShoulder(st) { const s = st.sub; return { x: s.x + SUBD.shX, y: s.y + SUBD.shY }; }
// keep a claw offset inside the arm's reach and in front of / under the hull
function subduoClampOff(ox, oy) {
  const S = SUBD;
  let d = Math.hypot(ox, oy) || 1, a = Math.atan2(oy, ox);
  // (the hull is up and behind the shoulder: snap to the nearer edge of the allowed arc)
  if (a > S.angMax || a < S.angMin) a = a > S.angMax || a < (S.angMax - Math.PI * 2 + S.angMin) / 2 ? S.angMax : S.angMin;
  d = clamp(d, S.reachMin, S.reach);
  return { ox: Math.cos(a) * d, oy: Math.sin(a) * d };
}
function subduoArm(st, dt) {
  const S = SUBD, p = G.players[st.grab], i = p.input, cl = st.claw;
  p.pendingJump = false;
  const dx = (i.right ? 1 : 0) - (i.left ? 1 : 0), dy = ((i.down ? 1 : 0) - (i.jump || i.up ? 1 : 0));
  const slow = cl.hold && cl.hold.kind === 'boulder' ? 0.7 : 1;
  cl.dx = dx * S.clawV * slow * dt; cl.dy = dy * S.clawV * slow * dt;
  if (!cl.hold || cl.hold.kind !== 'log') { const o = subduoClampOff(cl.ox + cl.dx, cl.oy + cl.dy); cl.ox = o.ox; cl.oy = o.oy; }
  if (p.pendingAct) {
    p.pendingAct = false;
    if (cl.hold) subduoRelease(st, false);
    else subduoGrab(st);
  }
  if (cl.snapT > 0) cl.snapT -= dt;
  cl.shut = approach(cl.shut, cl.hold || cl.snapT > 0 ? 1 : 0, dt * 8);
}
// the claw tip in world px, kept out of the rock
function subduoClawPos(st) {
  const cl = st.claw, sh = subduoShoulder(st);
  if (cl.hold && cl.hold.kind === 'log') { const g = subduoLogGrip(cl.hold.obj); cl.x = g.x; cl.y = g.y; return; }
  let x = sh.x + cl.ox, y = sh.y + cl.oy;
  const r = cl.hold && cl.hold.kind === 'boulder' ? cl.hold.obj.r : cl.hold ? 14 : 6, hang = subduoHang(cl);
  const top = subduoSpan(st, x - r * 0.7, x + r * 0.7, subduoCeil, Math.max) + r, bot = subduoSpan(st, x - r * 0.7, x + r * 0.7, subduoFloor, Math.min) - r;
  if (bot > top) y = clamp(y + hang, top, bot) - hang;
  cl.x = x; cl.y = y;
}
// a held boulder hangs under the claw (its centre is this far below the tip)
const subduoHang = cl => (cl.hold && cl.hold.kind === 'boulder' ? cl.hold.obj.r - 8 : 0);
// what a press of grab would catch right now: { kind, obj, d } or null
function subduoCanGrab(st) {
  const S = SUBD, cl = st.claw, c = st.c, x = cl.x, y = cl.y;
  if (cl.hold) return null;
  let best = null;
  const take = (kind, obj, d, lim) => { if (d < lim && (!best || d - lim < best.d - best.lim)) best = { kind, obj, d, lim }; };
  for (const pr of c.pearls) if (!pr.got && Math.abs(pr.x - x) < 60) take('pearl', pr, Math.hypot(pr.x - x, pr.y - y), S.pearlR + (pr.big ? 10 : 0));
  for (const b of c.boulders) if (!b.done && b.state !== 'plop') take('boulder', b, Math.hypot(b.x - x, b.y - y), b.r + 20 + (b.gold ? 16 : 0));
  for (const cl2 of c.clams) if (!cl2.done) { const q = cl2.conch; if (q.state !== 'given') take('conch', q, Math.hypot(q.x - x, q.y - y), S.grabR + (cl2.gold ? 18 : 0)); }
  for (const lg of c.logs) if (lg.state === 'up') {
    const tx = lg.px + Math.cos(lg.th) * lg.len, ty = lg.py + Math.sin(lg.th) * lg.len;
    const ax = lg.px + Math.cos(lg.th) * lg.len * 0.35, ay = lg.py + Math.sin(lg.th) * lg.len * 0.35;
    const dd = subduoSegD(x, y, ax, ay, tx, ty);
    take('log', lg, dd, S.logR + 22 + (lg.gold ? 12 : 0));
  }
  const e = c.end;
  if (e && !e.got) take(e.chest ? 'chest' : 'ring', e, Math.hypot(e.ringX - x, e.ringY - y), (e.chest ? S.chestR : S.ringR) * (e.gold ? 1.9 : 1));
  return best;
}
function subduoGrab(st) {
  const cl = st.claw, g = subduoCanGrab(st);
  cl.snapT = 0.28; st.stats.grabs++;
  if (!g) { Sfx.play('subduoSnap', st.grab); return; }
  if (g.kind === 'pearl') {
    const pr = g.obj; pr.got = true; pr.t = 0;
    st.pearls += pr.val; st.stats.pearlsRoom += pr.val;
    Sfx.play(pr.kind === 'shell' ? 'subduoShell' : 'subduoPearl', st.grab);
    subduoPop(st, pr.x, pr.y - 30, pr.val > 1 ? 'Big pearl! +' + pr.val : pr.kind === 'shell' ? 'Shell!' : 'Pearl!', pr.kind === 'shell' ? '#ffc0d0' : '#ffffff', pr.val > 1 ? 26 : 18);
    subduoSpark(st, pr.x, pr.y, pr.kind === 'shell' ? '#ffb3c8' : '#ffffff', 6);
    return;
  }
  if (g.kind === 'ring' || g.kind === 'chest') { subduoFinishStretch(st); return; }
  Sfx.play('subduoGrab', st.grab);
  if (g.kind === 'boulder') {
    const b = g.obj; b.state = 'held'; cl.hold = { kind: 'boulder', obj: b };
    // the claw holds the boulder by its top
    const sh = subduoShoulder(st), o = subduoClampOff(b.x - sh.x, b.y - b.r + 8 - sh.y); cl.ox = o.ox; cl.oy = o.oy;
    subduoPop(st, b.x, b.y - b.r - 20, 'Got it! Heavy...', '#ffffff', 18);
    st.sub.heavy = true;
  } else if (g.kind === 'conch') {
    const q = g.obj; q.state = 'held'; cl.hold = { kind: 'conch', obj: q };
    const sh = subduoShoulder(st), o = subduoClampOff(q.x - sh.x, q.y - sh.y); cl.ox = o.ox; cl.oy = o.oy;
    subduoPop(st, q.x, q.y - 30, 'Clammy\'s conch!', C.gold, 18);
  } else if (g.kind === 'log') {
    const lg = g.obj; lg.state = 'held';
    // grip where the claw touched it (never lower than a third up)
    const ux = Math.cos(lg.th), uy = Math.sin(lg.th);
    lg.u = clamp(((cl.x - lg.px) * ux + (cl.y - lg.py) * uy) / lg.len, 0.35, 1);
    cl.hold = { kind: 'log', obj: lg };
    subduoPop(st, cl.x, cl.y - 30, 'Pull it down!', '#ffffff', 18);
  }
}
function subduoRelease(st, slipped) {
  const S = SUBD, cl = st.claw, h = cl.hold;
  if (!h) return;
  cl.hold = null; st.sub.heavy = false;
  if (h.kind === 'boulder') {
    const b = h.obj, ho = b.hollow;
    if (b.gold && !ho.filled) { b.state = 'roll'; b.rt = 0; b.rx0 = b.x; b.ry0 = b.y; Sfx.play('subduoHelp'); subduoPop(st, b.x, b.y - 70, 'Roll, roll, roll!', C.gold, 20); return; }
    b.state = 'sink'; b.vy = 0;
    if (!ho.filled && Math.abs(b.x - ho.x) < S.plopDX + 14) b.toHole = true;
    else { b.toHole = false; if (!slipped && b.x - b.r <= b.pin1) { b.slips++; subduoHint(st, st.grab, 'Lower it into the sandy hole ' + subduoKey(st.grab, 'down'), 3); } }
    Sfx.play('subduoLetGo', st.grab);
  } else if (h.kind === 'conch') {
    const q = h.obj, clm = st.c.clams.find(k => k.conch === q);
    if (clm && subduoMouthD(clm, q.x, q.y) < (clm.gold ? 90 : 60)) { subduoGive(st, clm); return; }
    q.state = 'sink'; q.vy = 0; if (clm) clm.slips++;
    Sfx.play('subduoLetGo', st.grab);
  } else if (h.kind === 'log') {
    const lg = h.obj, flatK = lg.gold ? 0.9 : S.logFlat;
    if (lg.th <= -Math.PI + flatK) { lg.state = 'fall'; Sfx.play('subduoLetGo', st.grab); }
    else {
      lg.state = 'float'; lg.slips++;
      Sfx.play('subduoFloat');
      subduoPop(st, lg.px + Math.cos(lg.th) * lg.len * 0.6, lg.py + Math.sin(lg.th) * lg.len * 0.6 - 30, slipped ? 'Slipped! It floats back up' : 'Bloop! It floats back up', '#ffe7a8', 18);
      subduoHint(st, st.grab, 'Pull it all the way down, then let go', 3.2);
      if (slipped) subduoHint(st, st.steer, 'Stay close to the log! Back up slowly ' + subduoKey(st.steer, 'left'), 3.2);
    }
  }
}
const subduoMouthD = (clm, x, y) => Math.hypot(x - clm.mouth.x, y - clm.mouth.y);
function subduoGive(st, clm) {
  const q = clm.conch;
  q.state = 'given'; clm.done = true; clm.openT = 0; st.hints = [null, null];
  st.claw.hold = null;
  Sfx.play('subduoClam');
  subduoPop(st, clm.mouth.x + 40, clm.top + 60, 'Thank you! Yawwwn...', C.gold, 24);
  for (let i = 0; i < 18; i++) subduoSpark(st, clm.mouth.x, clm.mouth.y, i % 2 ? C.gold : '#ffffff', 1);
  // her gift: a big pearl floats out
  const gift = { x: clm.mouth.x + 50, y: clm.mid, kind: 'pearl', val: 3, big: true, got: false, t: 0, floor: false, rise: 1 };
  clm.gift = gift; st.c.pearls.push(gift);
  rumble(0, 0.15, 0.4, 160); rumble(1, 0.15, 0.4, 160);
}
// the log's grip point and its two ends
function subduoLogGrip(lg) { return { x: lg.px + Math.cos(lg.th) * lg.len * lg.u, y: lg.py + Math.sin(lg.th) * lg.len * lg.u }; }
function subduoLogTop(lg) { return { x: lg.px + Math.cos(lg.th) * lg.len, y: lg.py + Math.sin(lg.th) * lg.len }; }

/* ---------- held things follow the claw; let-go things sink, float or roll ---------- */
function subduoHeld(st, dt) {
  const S = SUBD, cl = st.claw, h = cl.hold, sh = subduoShoulder(st);
  if (!h) return;
  if (h.kind === 'boulder' || h.kind === 'conch') {
    const o = h.obj;
    o.x = cl.x; o.y = cl.y + subduoHang(cl);
    if (h.kind === 'boulder') {
      const ho = o.hollow;
      // lowered into its hole: plop
      if (!ho.filled && Math.abs(o.x - ho.x) < S.plopDX && o.y > ho.fy - o.r + 10) { cl.hold = null; st.sub.heavy = false; subduoPlop(st, o); }
    } else {
      const clm = st.c.clams.find(k => k.conch === o);
      if (clm && subduoMouthD(clm, o.x, o.y) < (clm.gold ? 80 : 34)) subduoGive(st, clm);
    }
    return;
  }
  if (h.kind === 'log') {
    const lg = h.obj, g0 = subduoLogGrip(lg);
    // where the grabber (and the sub's own movement) pulls the grip point
    const D = { x: g0.x + cl.dx + st.sub.mvx, y: g0.y + cl.dy + st.sub.mvy };
    let a = Math.atan2(D.y - lg.py, D.x - lg.px);
    if (a > 0.5) a -= Math.PI * 2;
    a = clamp(a, -Math.PI, lg.th0);
    lg.th = approach(lg.th, a, S.logV * (lg.gold ? 2 : 1) * dt);
    const g = subduoLogGrip(lg);
    const d = Math.hypot(g.x - sh.x, g.y - sh.y);
    if (d > S.reach + S.slipD && !lg.gold) { subduoRelease(st, true); return; }
    const o = subduoClampOff(g.x - sh.x, g.y - sh.y); cl.ox = o.ox; cl.oy = o.oy;
    if (lg.th <= -Math.PI + 0.02) { lg.th = -Math.PI; }
    lg.creak = (lg.creak || 0) - dt;
    if (Math.abs(lg.th - a) > 0.01 && lg.creak <= 0) { lg.creak = 0.35; Sfx.play('subduoCreak'); }
  }
}
function subduoPlop(st, b) {
  const ho = b.hollow, c = st.c;
  b.state = 'plop'; b.done = true; ho.filled = true; b.px0 = b.x; b.py0 = b.y; st.hints = [null, null];
  b.plopT = 0;
  for (let i = ho.i0 - 1; i <= ho.i1 + 1; i++) if (i >= 0 && i < c.cb.length) c.cb[i] = Math.min(c.cb[i], ho.fy);
  Sfx.play('subduoPlop');
  subduoPop(st, ho.x, ho.fy - 90, 'Plop! It fits!', C.gold, 26);
  for (let i = 0; i < 16; i++) subduoPart(st, ho.x + (Math.random() - 0.5) * 120, ho.fy - 4, (Math.random() - 0.5) * 120, -40 - Math.random() * 80, 0.9, '#f2dca0', 4, 60, 'sand');
  rumble(0, 0.2, 0.5, 200); rumble(1, 0.2, 0.5, 200);
  G.shake = reduceMotion ? 0 : 0.06;
}
// turtles, puffers, fish, let-go boulders and conches, logs floating or falling, clams opening, pearls rising
function subduoThings(st, dt) {
  const S = SUBD, c = st.c, t = st.roomT;
  for (const tu of c.turtles) {
    tu.y = tu.y0 + Math.sin(t * 0.75 + tu.ph) * tu.amp; tu.x = tu.x0 + Math.sin(t * 0.37 + tu.ph) * 26;
    tu.dir = Math.cos(t * 0.75 + tu.ph) > 0 ? 1 : -1;
    if (tu.boop > 0) tu.boop -= dt;
  }
  for (const f of c.puffers) {
    if (f.away > 0) f.away -= dt;
    const want = f.away > 0 ? (subduoCeil(st, f.x0) + 40 - f.y0) : 0;
    f.off = approach(f.off, want, 60 * dt);
    f.y = f.y0 + f.off + Math.sin(t * 1.6 + f.ph) * 8; f.x = f.x0;
    f.puff = approach(f.puff, f.away > 6 || f.bonk > 0 ? 1 : 0, dt * 3);
    if (f.bonk > 0) f.bonk -= dt;
  }
  for (const q of c.schools) { if (q.scat > 0) q.scat -= dt; }
  for (const b of c.boulders) {
    if (b.state === 'sink') {
      b.vy = Math.min(b.vy + 260 * dt, 160);
      const ny = b.y + b.vy * dt, fl = subduoSpan(st, b.x - b.r * 0.8, b.x + b.r * 0.8, subduoFloor, Math.min) - b.r;
      const ho = b.hollow;
      if (b.toHole && !ho.filled) { b.x = approach(b.x, ho.x, 60 * dt); if (ny > ho.fy - b.r + 10) { subduoPlop(st, b); continue; } b.y = ny; }
      else if (ny >= fl) {
        b.y = fl; b.state = 'rest'; Sfx.play('subduoThud'); subduoPart(st, b.x, b.y + b.r, 0, -30, 0.6, '#f2dca0', 5, 0, 'sand');
        // (carried forward right through the pinch and let go on the far side: that clears the way too)
        if (!b.done && b.x - b.r > b.pin1) { b.done = true; st.hints = [null, null]; Sfx.play('subduoLogDown'); subduoPop(st, b.x, b.y - b.r - 40, 'Out of the way! That works too', C.gold, 22); }
      }
      else b.y = ny;
    } else if (b.state === 'roll') {
      // a gold boulder rolls into its hole by itself
      b.rt += dt;
      const ho = b.hollow, u = subduoSmooth(clamp(b.rt / 1.6, 0, 1));
      b.x = subduoLerp(b.rx0, ho.x, u); b.y = subduoLerp(b.ry0, ho.fy - b.r - 30, u) - Math.sin(u * Math.PI) * 30;
      b.spin = (b.spin || 0) + dt * 4;
      if (u >= 1) subduoPlop(st, b);
    } else if (b.state === 'plop') {
      // it settles snug in the sand, its top just showing
      b.plopT += dt;
      const u = subduoSmooth(clamp(b.plopT / 0.45, 0, 1));
      b.x = subduoLerp(b.px0, b.hollow.x, u); b.y = subduoLerp(b.py0, b.hollow.fy + b.r - 20, u);
    }
  }
  for (const clm of c.clams) {
    const q = clm.conch;
    if (q.state === 'sink') {
      q.vy = Math.min(q.vy + 200 * dt, 120);
      const fl = subduoFloor(st, q.x) - q.r;
      q.y = Math.min(fl, q.y + q.vy * dt);
      if (q.y >= fl) q.state = 'rest';
    }
    if (clm.gold && q.state === 'rest' && !clm.done && Math.abs(st.sub.x - q.x) < 700) {
      // a gold conch floats up to the claw
      const sh = subduoShoulder(st), tx = sh.x + 80, ty = clamp(sh.y + 50, subduoCeil(st, sh.x + 80) + 30, subduoFloor(st, sh.x + 80) - 30);
      q.x = approach(q.x, tx, 70 * dt); q.y = approach(q.y, ty, 70 * dt);
    }
    if (clm.done) clm.open = approach(clm.open, 1, dt * 0.9);
    const gf = clm.gift;
    if (gf && !gf.got && gf.rise > 0) { gf.rise -= dt; gf.x += 30 * dt; }
  }
  for (const lg of c.logs) {
    if (lg.state === 'float') { lg.th = approach(lg.th, lg.th0, 0.9 * dt); if (lg.th >= lg.th0 - 0.001) lg.state = 'up'; }
    else if (lg.state === 'fall') {
      lg.th = approach(lg.th, -Math.PI, 2.4 * dt);
      if (lg.th <= -Math.PI + 0.001) {
        lg.state = 'down'; lg.done = true; st.hints = [null, null];
        Sfx.play('subduoThud'); Sfx.play('subduoLogDown');
        subduoPop(st, lg.px - lg.len / 2, lg.py - 80, 'Timber! The way is clear', C.gold, 24);
        for (let i = 0; i < 18; i++) subduoPart(st, lg.px - Math.random() * lg.len, lg.py - 4, (Math.random() - 0.5) * 100, -30 - Math.random() * 60, 0.9, '#f2dca0', 4, 60, 'sand');
        G.shake = reduceMotion ? 0 : 0.06;
      }
    }
  }
  for (const pr of c.pearls) if (pr.got) pr.t += dt;
}

/* ---------- the sub moves and bumps (soft bonks) ---------- */
function subduoMoveSub(st, dt) {
  const S = SUBD, s = st.sub;
  // gentle currents
  for (const cu of st.c.currents) if (s.x > cu.x0 && s.x < cu.x1) { s.vx += cu.ax * dt; s.vy += cu.ay * dt; s.inCurrent = cu; }
  s.vx *= Math.max(0, 1 - S.drag * dt); s.vy *= Math.max(0, 1 - S.drag * dt);
  const x0 = s.x, y0 = s.y;
  s.x += s.vx * dt; s.y += s.vy * dt;
  subduoCollide(st, true);
  s.mvx = s.x - x0; s.mvy = s.y - y0;
  if (s.bonkCd > 0) s.bonkCd -= dt;
  if (s.wob > 0) s.wob -= dt;
  if (s.stun > 0) s.stun -= dt;
  s.tilt = approach(s.tilt, clamp(s.vy / 900, -0.12, 0.12) + clamp(s.vx / 2400, -0.05, 0.05), dt * 1.5);
  s.prop += (Math.abs(s.vx) + Math.abs(s.vy) * 0.5 + (s.thrust ? 120 : 20)) * dt * 0.08;
  // propeller bubbles
  if ((s.thrust || Math.abs(s.vx) > 40) && Math.random() < dt * 14) subduoPart(st, s.x - 66, s.y + 2 + (Math.random() - 0.5) * 10, -40 - Math.random() * 40 + s.vx * 0.2, -20 - Math.random() * 20, 1.1, 'rgba(255,255,255,0.7)', 2 + Math.random() * 3, -40, 'bubble');
}
// the solid things the hull can touch: { x, y, r, kind, obj } circles, plus logs and closed clams
function subduoSolids(st, x0, x1) {
  const c = st.c, out = [];
  for (const k of c.corals) if (k.x + k.r > x0 && k.x - k.r < x1) out.push({ x: k.x, y: k.y, r: k.r * 0.86, kind: 'coral' });
  for (const b of c.boulders) if ((b.state === 'rest' || b.state === 'sink') && b.x + b.r > x0 && b.x - b.r < x1) out.push({ x: b.x, y: b.y, r: b.r - 2, kind: 'rock' });
  for (const t of c.turtles) if (t.x + 40 > x0 && t.x - 40 < x1) out.push({ x: t.x, y: t.y, r: t.r, kind: 'turtle', obj: t });
  for (const f of c.puffers) if (f.x + 40 > x0 && f.x - 40 < x1) out.push({ x: f.x, y: f.y, r: f.r + f.puff * 10, kind: 'puffer', obj: f });
  return out;
}
function subduoSegD(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, u = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(px - (ax + dx * u), py - (ay + dy * u));
}
function subduoSegP(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, u = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return { x: ax + dx * u, y: ay + dy * u };
}
// push the hull out of everything it overlaps; a fast hit is a bonk
function subduoCollide(st, live) {
  const S = SUBD, s = st.sub, c = st.c;
  const solids = subduoSolids(st, s.x - 120, s.x + 120);
  let hit = null;
  for (let it = 0; it < 3; it++) {
    for (const [hx, hy, hr] of S.hull) {
      const cx = s.x + hx, cy = s.y + hy;
      const contacts = [];
      // roof and floor: the nearest sample point of each line
      let bestC = null, bestF = null;
      for (let x = cx - hr; x <= cx + hr; x += 4) {
        const yc = subduoCeil(st, x), yf = subduoFloor(st, x);
        const dc = cy > yc ? Math.hypot(cx - x, cy - yc) : -1, df = cy < yf ? Math.hypot(cx - x, cy - yf) : -1;
        if (dc >= 0 && dc < hr && (!bestC || dc < bestC.d)) bestC = { d: dc, x, y: yc };
        if (df >= 0 && df < hr && (!bestF || df < bestF.d)) bestF = { d: df, x, y: yf };
      }
      const yc0 = subduoCeil(st, cx), yf0 = subduoFloor(st, cx);
      if (cy <= yc0) contacts.push({ nx: 0, ny: 1, pen: yc0 - cy + hr, kind: subduoSurface(st, cx) ? 'surface' : 'rock' });
      else if (bestC) { const d = bestC.d || 0.01; contacts.push({ nx: (cx - bestC.x) / d, ny: (cy - bestC.y) / d, pen: hr - d, kind: subduoSurface(st, bestC.x) ? 'surface' : 'rock' }); }
      if (cy >= yf0) contacts.push({ nx: 0, ny: -1, pen: cy - yf0 + hr, kind: 'rock' });
      else if (bestF) { const d = bestF.d || 0.01; contacts.push({ nx: (cx - bestF.x) / d, ny: (cy - bestF.y) / d, pen: hr - d, kind: 'sand' }); }
      for (const o of solids) {
        const d = Math.hypot(cx - o.x, cy - o.y);
        if (d < hr + o.r) { const dd = d || 0.01; contacts.push({ nx: (cx - o.x) / dd, ny: (cy - o.y) / dd, pen: hr + o.r - d, kind: o.kind, obj: o.obj }); }
      }
      for (const lg of c.logs) {
        if (lg.state === 'down' || Math.abs(lg.px - cx) > lg.len + 60) continue;
        const tp = subduoLogTop(lg), q = subduoSegP(cx, cy, lg.px, lg.py, tp.x, tp.y), d = Math.hypot(cx - q.x, cy - q.y);
        if (d < hr + S.logR) { const dd = d || 0.01; contacts.push({ nx: (cx - q.x) / dd, ny: (cy - q.y) / dd, pen: hr + S.logR - d, kind: 'log' }); }
      }
      for (const clm of c.clams) {
        if (clm.open > 0.7 || cx + hr < clm.x || cx - hr > clm.x1) continue;
        // a closed clam is a wall from roof to floor
        const pen = cx + hr - clm.x;
        if (pen > 0 && cx < clm.x + 30) contacts.push({ nx: -1, ny: 0, pen, kind: 'clam' });
        else if (cx >= clm.x1 - 30) contacts.push({ nx: 1, ny: 0, pen: clm.x1 - (cx - hr), kind: 'clam' });
      }
      for (const ct of contacts) {
        if (ct.pen <= 0) continue;
        s.x += ct.nx * ct.pen; s.y += ct.ny * ct.pen;
        const vn = s.vx * ct.nx + s.vy * ct.ny;
        if (vn < 0) {
          if (-vn > S.bonkV && live && ct.kind !== 'surface' && !hit) hit = { ct, vn };
          const e = -vn > S.bonkV ? 1.45 : 1;
          s.vx -= e * vn * ct.nx; s.vy -= e * vn * ct.ny;
        }
      }
    }
  }
  // the ends of the canyon
  if (s.x < c.x0 + 120) { s.x = c.x0 + 120; s.vx = Math.max(0, s.vx); }
  const wall = c.end ? c.end.wall : c.len - 100;
  if (s.x > wall - 70) { s.x = wall - 70; s.vx = Math.min(0, s.vx); }
  s.y = clamp(s.y, 40, H - 10);
  if (hit) subduoBonk(st, hit.ct, -hit.vn);
}
function subduoBonk(st, ct, v) {
  const S = SUBD, s = st.sub;
  if (st.sub.bonkCd > 0) return;
  const bk = Math.floor(s.x / 500), soft = st.cushion[bk] || st.cushion[bk - 1] || st.cushion[bk + 1];
  s.bonkCd = S.bonkCd;
  const word = ct.kind === 'turtle' ? 'Boop!' : ct.kind === 'puffer' ? 'Puff!' : ct.kind === 'log' ? 'Bonk!' : soft ? 'Boing!' : 'Bonk!';
  const px = s.x - ct.nx * 50, py = s.y - ct.ny * 34;
  subduoPop(st, px, py - 30, word, '#ffffff', 22);
  for (let i = 0; i < 10; i++) subduoPart(st, px, py, (Math.random() - 0.5) * 160, -40 - Math.random() * 90, 1.0, 'rgba(255,255,255,0.8)', 2 + Math.random() * 4, -60, 'bubble');
  if (ct.obj && ct.kind === 'turtle') ct.obj.boop = 1;
  if (ct.obj && ct.kind === 'puffer') { ct.obj.bonk = 1.2; }
  if (soft) { Sfx.play('subduoBoing'); return; }
  s.wob = S.wobT; s.stun = S.ctrlStun;
  st.stats.bonks++;
  st.bucket[bk] = (st.bucket[bk] || 0) + 1;
  Sfx.play(ct.kind === 'turtle' ? 'subduoBoop' : 'subduoBonk');
  rumble(st.steer, 0.3, 0.5, 180); rumble(st.grab, 0.15, 0.3, 140);
  G.shake = reduceMotion ? 0 : 0.07;
  if (st.bucket[bk] >= S.cushionN && subduoBoth(st)) {
    st.cushion[bk] = true; st.bucket[bk] = -99; st.stats.helps++;
    subduoMsg(st, 'Gold bubbles! Bumps are soft in this tight spot', C.gold, 4); Sfx.play('subduoHelp');
  } else if (v > 160) subduoHint(st, st.steer, 'Gently does it! Tap ' + subduoKey(st.steer, 'arrows') + ' softly', 2.8);
}

/* ---------- the end of a stretch: clip onto the buoy ring, swap seats ---------- */
function subduoFinishStretch(st) {
  const e = st.c.end, last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
  e.got = true; st.state = 'dock'; st.dock = { t: 0, last, x0: st.sub.x, y0: st.sub.y };
  if (st.claw.hold) subduoRelease(st, true);
  st.stats.roomT[st.k] = G.time - st.segStart;
  if (last) st.stats.finishT = G.time;
  Sfx.play(last ? 'subduoChest' : 'subduoClip');
  subduoPop(st, e.ringX, e.ringY - 60, last ? 'The treasure!' : 'Clip! Checkpoint!', C.gold, 28);
  for (let i = 0; i < 20; i++) subduoSpark(st, e.ringX, e.ringY, i % 2 ? C.gold : '#ffffff', 1);
  rumble(0, 0.2, 0.5, 200); rumble(1, 0.2, 0.5, 200);
}
// seats in the dome (relative to the sub): the steerer sits at the front
const subduoSeat = front => ({ x: front ? 15 : -15, y: -19 });
function subduoDockStep(st, dt) {
  const S = SUBD, d = st.dock, s = st.sub, e = st.c.end;
  d.t += dt;
  // the sub settles by the ring, the claw stays on it
  const tx = e.ringX - S.shX - 80, ty = clamp(e.ringY - S.shY - 30, subduoCeil(st, tx) + S.hullTop + 6, subduoFloor(st, tx) - S.hullBot - 6);
  const u = Math.min(1, dt * 2.5);
  s.x += (tx - s.x) * u; s.y += (ty - s.y) * u; s.vx = 0; s.vy = 0;
  const sh = subduoShoulder(st), o = subduoClampOff(e.ringX - sh.x, e.ringY - sh.y);
  st.claw.ox = o.ox; st.claw.oy = o.oy; st.claw.shut = 1;
  subduoClawPos(st);
  if (!d.last) {
    if (d.t > 0.9 && !d.said) { d.said = true; subduoPop(st, s.x, s.y - 110, 'Swap jobs!', '#ffffff', 30); Sfx.play('subduoSwap'); }
    if (d.t > 1.0 && !d.hop) { d.hop = true; Sfx.play('subduoHop', 0); Sfx.play('subduoHop', 1); }
    if (d.t >= S.swapT) { nextRoom(); return true; }
  } else {
    if (d.t > 0.6 && !d.open) { d.open = true; Sfx.play('subduoFanfare'); }
    if (d.t > 0.8 && Math.random() < dt * 30) { const a = -Math.PI * (0.15 + 0.7 * Math.random()), sp = 140 + Math.random() * 160; subduoPart(st, e.ringX, e.ringY - 20, Math.cos(a) * sp, Math.sin(a) * sp, 1.6, ['#ffd36b', '#ffffff', '#ff9fb5', '#9fe8ff', '#8fe3b0'][Math.floor(Math.random() * 5)], 4, 120, 'conf'); }
    if (d.t >= S.finT && !d.cleared) {
      d.cleared = true;
      G.level.goal = { x: e.ringX - st.cam.x, y: e.ringY - 80 };
      levelClear();
    }
    return d.t >= S.finT;
  }
  return false;
}
// where a player is drawn (world px, feet): in their seat, or hopping over to the other one during a swap
function subduoSeatSpot(st, id) {
  const s = st.sub, front = id === st.steer, a = subduoSeat(front), d = st.dock;
  let x = a.x, y = a.y, hop = 0;
  if (d && !d.last && d.t > 1.0) {
    const u = clamp((d.t - 1.0) / 0.8, 0, 1), b = subduoSeat(!front);
    x = subduoLerp(a.x, b.x, subduoSmooth(u)); y = subduoLerp(a.y, b.y, u); hop = Math.sin(u * Math.PI) * (front ? 56 : 40);
  }
  const ct = Math.cos(s.tilt), sn = Math.sin(s.tilt);
  return { x: s.x + x * ct - y * sn, y: s.y + x * sn + y * ct - hop, hop };
}

/* ---------- what to do next (prompts, chips and the computer read this) ---------- */
// the free heights for the sub's centre over x0..x1 (around the solids there), and the one closest to yWant
function subduoLane(st, x0, x1, yWant, skip) {
  const S = SUBD;
  if (x1 < x0) { const t = x0; x0 = x1; x1 = t; }
  const solids = subduoSolids(st, x0 - S.hullHalf - 60, x1 + S.hullHalf + 60).filter(o => o.kind !== 'puffer' || o.obj.away <= 0);
  let free = null;
  for (let x = x0; x <= x1 + 0.1; x += 24) {
    const top = subduoSpan(st, x - S.hullHalf, x + S.hullHalf, subduoCeil, Math.max) + S.hullTop + 4;
    const bot = subduoSpan(st, x - S.hullHalf, x + S.hullHalf, subduoFloor, Math.min) - S.hullBot - 4;
    let ivs = bot > top ? [[top, bot]] : [];
    for (const o of solids) {
      if (Math.abs(o.x - x) > S.hullHalf + o.r + 4) continue;
      const m = o.kind === 'turtle' ? 22 : 8, a = o.y - o.r - S.hullBot - m, b = o.y + o.r + S.hullTop + m;
      const nx = [];
      for (const [p, q] of ivs) { if (b <= p || a >= q) nx.push([p, q]); else { if (a > p) nx.push([p, a]); if (b < q) nx.push([b, q]); } }
      ivs = nx;
    }
    if (!free) free = ivs;
    else {
      const nx = [];
      for (const [p, q] of free) for (const [r, s] of ivs) { const lo = Math.max(p, r), hi = Math.min(q, s); if (hi > lo + 2) nx.push([lo, hi]); }
      if (!nx.length) break;
      free = nx;
    }
  }
  if (!free || !free.length) return clamp(yWant, subduoCeil(st, x0) + S.hullTop + 4, subduoFloor(st, x0) - S.hullBot - 4);
  let best = null, bd = Infinity;
  for (const [p, q] of free) { const y = clamp(yWant, p + 3, q - 3), dd = Math.abs(y - yWant); if (dd < bd) { bd = dd; best = y; } }
  void skip;
  return best;
}
// a sub spot that fits in the canyon at x (y as close to y as it can be)
function subduoFit(st, x, y) {
  const S = SUBD, top = subduoSpan(st, x - S.hullHalf, x + S.hullHalf, subduoCeil, Math.max) + S.hullTop + 6, bot = subduoSpan(st, x - S.hullHalf, x + S.hullHalf, subduoFloor, Math.min) - S.hullBot - 6;
  return bot > top ? clamp(y, top, bot) : (top + bot) / 2;
}
function subduoJob(st) { return st.c.jobs.find(j => !(j.kind === 'end' ? j.o.got : j.o.done)) || null; }
function subduoPlan(st) {
  const S = SUBD, out = { why: 'none', sx: null, sy: null, tx: null, ty: null, act: null, job: null, pearl: null, dist: 9999 };
  if (!st.c || st.state !== 'go') return out;
  const s = st.sub, cl = st.claw, h = cl.hold, job = subduoJob(st);
  out.job = job;
  const put = (why, tx, ty, ox, oy, act) => {
    out.why = why; out.tx = tx; out.ty = ty; out.act = act || null;
    out.sx = tx - S.shX - ox; out.sy = subduoFit(st, out.sx, ty - S.shY - oy);
    out.dist = Math.hypot(out.sx - s.x, out.sy - s.y);
  };
  if (h) {
    const o = h.obj;
    if (h.kind === 'boulder') {
      const ho = o.hollow;
      // (already carried forward past the pinch: just let go there)
      if (o.x - o.r > o.pin1 + 10) { out.why = 'drop'; out.act = 'release'; out.sx = s.x; out.sy = s.y; out.tx = cl.x; out.ty = cl.y; out.dist = 0; return out; }
      put('carry', ho.x, ho.fy + 12 - (o.r - 8), 64, 96, null); return out;
    }
    if (h.kind === 'conch') { const clm = st.c.clams.find(k => k.conch === o); if (clm) { put('give', clm.mouth.x - 6, clm.mouth.y, 110, 0, null); return out; } }
    if (h.kind === 'log') {
      const lg = o, th = Math.max(-Math.PI, lg.th - 0.5), r = lg.len * lg.u;
      const flatK = lg.gold ? 0.9 : S.logFlat;
      put('pull', lg.px + Math.cos(th) * r, lg.py + Math.sin(th) * r, 96, 52, lg.th <= -Math.PI + flatK * 0.45 ? 'release' : null);
      return out;
    }
  }
  // a pearl on the way (before the next job and not far ahead)
  const jx = job ? job.x : Infinity;
  let pick = null;
  for (const pr of st.c.pearls) {
    if (pr.got || pr.skip || pr.rise > 0) continue;
    if (pr.x < s.x - 30 || pr.x > Math.min(jx + (job && job.kind === 'end' ? 200 : 40), s.x + 520)) continue;
    if (!pick || pr.x < pick.x) pick = pr;
  }
  // (a big gift pearl from Clammy is always worth a look, even just behind)
  for (const pr of st.c.pearls) if (pr.big && !pr.got && !pr.skip && Math.abs(pr.x - s.x) < 400 && (pr.rise || 0) <= 0) pick = pr;
  if (pick) {
    const up = pick.y < s.y - 30 && pick.y < subduoCeil(st, pick.x) + 90;
    put('pearl', pick.x, pick.y, 72, up ? -10 : 58, 'grab');
    out.pearl = pick;
    return out;
  }
  if (!job) return out;
  const o = job.o;
  if (job.kind === 'boulder') {
    if (o.state === 'rest') {
      const left = o.x > s.x - 20;
      put('boulder', o.x + (left ? -12 : 12), o.y - o.r + 10, left ? 84 : -30, -20, 'grab');
    } else { out.why = 'wait'; out.sx = s.x; out.sy = s.y; }
    return out;
  }
  if (job.kind === 'log') {
    if (o.state === 'up') {
      const r = o.len * 0.74;
      put('log', o.px + Math.cos(o.th) * r, o.py + Math.sin(o.th) * r, 92, -6, 'grab');
    } else { out.why = 'wait'; out.sx = s.x; out.sy = s.y; }
    return out;
  }
  if (job.kind === 'clam') {
    const q = o.conch;
    if (q.state === 'rest' || q.state === 'sink') put('conch', q.x, q.y, 66, 56, 'grab');
    else { out.why = 'wait'; out.sx = s.x; out.sy = s.y; }
    return out;
  }
  if (job.kind === 'end') {
    put(o.chest ? 'chest' : 'ring', o.ringX, o.ringY, 84, o.chest ? 60 : 24, 'grab');
    return out;
  }
  return out;
}

/* ---------- help: gold help when stuck, one-time lessons, nudges ---------- */
function subduoHelp(st, dt) {
  const S = SUBD, s = st.sub, job = subduoJob(st), both = subduoBoth(st);
  if (!job) return;
  if (both && Math.abs(s.x - job.x) < 700) job.t += dt;
  const o = job.o;
  if (job.kind !== 'end' && !o.gold && both && (job.t > S.goldStuck || o.slips >= S.goldSlips)) {
    o.gold = true; st.stats.helps++; Sfx.play('subduoHelp');
    if (job.kind === 'boulder') subduoMsg(st, 'Gold boulder! Let go anywhere and it rolls into the hole', C.gold, 4.4);
    else if (job.kind === 'log') subduoMsg(st, 'Gold log! Light as a feather, and it lies down from halfway', C.gold, 4.4);
    else if (job.kind === 'clam') subduoMsg(st, 'Gold conch! It floats to the claw, and Clammy opens wide', C.gold, 4.4);
  }
  if (job.kind === 'end' && !o.gold && both && job.t > S.endGold) {
    o.gold = true; st.stats.helps++; Sfx.play('subduoHelp');
    subduoMsg(st, o.chest ? 'Gold handle! The chest is easy to grab now' : 'Gold ring! It is twice as easy to clip on', C.gold, 4);
  }
}
function subduoHintOnce(st, key, id, text, life) { if (st.hinted[key]) return; st.hinted[key] = true; subduoHint(st, id, text, life); }
function subduoNudges(st, dt) {
  const s = st.sub, Sd = st.steer, Gb = st.grab, pl = subduoPlan(st), job = pl.job;
  if (st.roomT > 3 && st.roomT < 4) {
    subduoHintOnce(st, 'steer' + st.k, Sd, 'You steer! ' + subduoKey(Sd, 'arrows') + ' push the sub', 3.4);
    subduoHintOnce(st, 'claw' + st.k, Gb, 'You work the claw! ' + subduoKey(Gb, 'arrows') + ' move it, ' + subduoKey(Gb, 'act') + ' grabs', 3.8);
  }
  if (!job) return;
  const near = Math.abs(s.x - job.x) < 420;
  if (near && job.kind === 'boulder') subduoHintOnce(st, 'boulder' + st.k, Gb, 'A boulder! Grab it ' + subduoKey(Gb, 'act') + ' and drop it in the sandy hole', 4);
  if (near && job.kind === 'log') subduoHintOnce(st, 'log' + st.k, Gb, 'A floaty log! Grab it high up and pull it down', 4);
  if (near && job.kind === 'clam') subduoHintOnce(st, 'clam' + st.k, Gb, 'Clammy is shut! Bring her the conch shell', 4);
  if (pl.why === 'carry' && !st.hinted['carry' + st.k]) { subduoHintOnce(st, 'carry' + st.k, Sd, 'Back up ' + subduoKey(Sd, 'left') + ' to the sandy hole!', 3.4); }
  if (pl.why === 'pull') subduoHintOnce(st, 'pull' + st.k, Sd, 'Back up ' + subduoKey(Sd, 'left') + ' slowly so the log has room', 3.4);
  void dt;
}

/* ---------- small helpers ---------- */
function subduoHint(st, id, text, life) { if (subduoQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || 2.8 }; }
function subduoMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function subduoPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 10) st.pops.shift(); }
function subduoPart(st, x, y, vx, vy, life, col, size, grav, kind) {
  if (st.parts.length > 280) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
function subduoSpark(st, x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 120; subduoPart(st, x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.55, col, 3 + Math.random() * 2, 0, 'star'); } }
// the touch buttons and the top-bar legend name each player's own action this stretch: the steerer toots, the grabber grabs
let subduoLabelEls = null;
function subduoActLabels(st) {
  try {
    if (!subduoLabelEls || !subduoLabelEls.every(o => document.contains(o.el))) subduoLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of subduoLabelEls) {
      const want = o.id < 0 ? 'grab/toot' : o.id === st.steer ? 'toot' : 'grab';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}
function subduoCam(st, dt) {
  const cam = st.cam, s = st.sub;
  let tx = s.x - SUBD.camLead + clamp(s.vx * 0.4, -60, 80);
  // keep the claw (and what it holds) on screen too
  tx = Math.min(tx, st.claw.x - 120); tx = Math.max(tx, st.claw.x - W + 80);
  tx = clamp(tx, st.c.x0, st.c.len - W);
  if (st.c.end) tx = Math.min(tx, st.c.end.wall + 30 - W);
  cam.x += (tx - cam.x) * Math.min(1, dt * 3);
  if (s.x - cam.x < 80) cam.x = s.x - 80;
  if (s.x - cam.x > W - 120) cam.x = s.x - (W - 120);
  cam.y = 0;
}
function subduoFx(st, dt) {
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 5;
    if (q.kind === 'bubble') { q.vx *= 1 - dt * 1.5; q.x += Math.sin(q.r * 2) * 0.3; }
    if (q.kind === 'sand' || q.kind === 'note') { q.vx *= 1 - dt * 2; q.vy *= 1 - dt * 1.2; }
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.3);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  if (st.tootT > 0) st.tootT -= dt;
  // little bubbles rising from the sand and the coral (near the camera only)
  st.bubT = (st.bubT || 0) - dt;
  if (st.bubT <= 0) {
    st.bubT = 0.25;
    const x = st.cam.x + Math.random() * W;
    subduoPart(st, x, subduoFloor(st, x) - 4, 0, -30 - Math.random() * 30, 3.5, 'rgba(255,255,255,0.55)', 1.5 + Math.random() * 2.5, -8, 'bubble');
  }
}
// copy the seats into the engine players (screen px): name tags and bubbles read p.x / p.y
function subduoMirror(st) {
  const cam = st.cam;
  for (const p of G.players) {
    const sp = subduoSeatSpot(st, p.id);
    p.x = sp.x - cam.x - PW / 2; p.y = sp.y - cam.y - PH - 26;
    p.alive = true; p.grounded = true; p.stompSafe = 0; p.vy = 0; p.vx = st.sub.vx;
    p.face = 1; p.stun = 0;
  }
}

MODES.subduo = {
  SUBD,
  medals: { bronze: 'Steer to the treasure grotto', goals: [{ key: 'time', gold: 270, silver: 420 }, { key: 'bonks', gold: 6, silver: 16, word: 'bonk' }, { key: 'pearls', gold: 0.5, more: true, pct: true, word: 'the pearls' }] },
  medalValues() { const st = G.mst, s = st.stats; return s ? { bonks: s.bonks, pearls: st.pearls / (st.pearlsAll || 1) } : {}; },
  compile: subduoCompile, ceil: subduoCeil, floor: subduoFloor, plan: subduoPlan, canGrab: subduoCanGrab, lane: subduoLane,
  shoulder: subduoShoulder, clampOff: subduoClampOff, job: subduoJob, key: subduoKey, fit: subduoFit,
  setup(st, L) {
    st.stats = { bonks: 0, helps: 0, grabs: 0, toots: 0, roomT: [], finishT: 0, pearlsRoom: 0 };
    st.pearls = 0; st.inT = [G.time, G.time]; st.personT = G.time;
    // count every stretch's pearls up front (the HUD shows "x of all"); each clam gives a big pearl worth 3
    const def = LEVELS[G.levelIndex];
    let n = 0;
    for (const r of def.rooms || [def]) { const c = subduoCompile(Object.assign({}, def, r)); n += c.pearls.length + c.clams.length * 3; }
    st.pearlsAll = n;
    subduoRoom(st, L, 0);
  },
  room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; subduoRoom(st, L, k); },
  step(dt) { subduoStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then, and drawn in the sub instead
  draw() {
    const st = G.mst;
    if (!st.c) return;
    subduoDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.c) return;
    subduoDrawFront(st);
  },
  hud() { const st = G.mst; if (st.c) subduoHud(st); },
  stats() {
    const st = G.mst, s = st.stats;
    if (!s) return [];
    const all = st.pearlsAll || 1, frac = st.pearls / all;
    const out = [
      { label: 'Pearls', value: st.pearls + ' of ' + all },
      { label: 'Bonks', value: String(s.bonks) },
      { label: 'Toots', value: String(s.toots) },
    ];
    const words = frac >= 0.85 ? 'A treasure chest AND a sack of pearls. Super sailors!' : frac >= 0.5 ? 'Down through the reef to the treasure!' : 'You steered all the way to the treasure grotto!';
    out.push(words + ' Grabs: ' + s.grabs + '.');
    if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
    return out;
  },
};

/* ---------- drawing ---------- */
const SUBD_LOOK = {
  shallows: { wT: '#6fe0ec', wB: '#2496c6', far: '#47b9d2', far2: '#3aa5c6', sand: '#f6e2a8', sandD: '#dcc07a', rock: '#f08aa0', rockD: '#c25d7a', rays: 0.22 },
  kelp: { wT: '#5cd0c4', wB: '#14788e', far: '#2f9a8c', far2: '#24877e', sand: '#e9d79c', sandD: '#c8b274', rock: '#78a88e', rockD: '#4f7c66', rays: 0.16 },
  canyon: { wT: '#52bfe6', wB: '#1a5f9e', far: '#3d93c4', far2: '#337fb3', sand: '#f4d29a', sandD: '#d4a868', rock: '#ff9a6e', rockD: '#c8644a', rays: 0.12 },
  grotto: { wT: '#3f86cc', wB: '#1a2f6e', far: '#2e5696', far2: '#284a86', sand: '#d9c9a0', sandD: '#ad9a70', rock: '#8a78c8', rockD: '#5a4a94', rays: 0.05 },
};
const subduoWaterCache = {};
function subduoDrawWorld(st) {
  const cam = st.cam, lk = SUBD_LOOK[st.look] || SUBD_LOOK.shallows;
  let g = subduoWaterCache[st.look];
  if (!g) { g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, lk.wT); g.addColorStop(1, lk.wB); subduoWaterCache[st.look] = g; }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  subduoDrawRays(st, lk);
  subduoDrawFar(st, lk);
  ctx.save(); ctx.translate(-Math.round(cam.x * 10) / 10, 0);
  if (st.look === 'kelp') subduoDrawKelp(st, 0.0, 1);
  subduoDrawCurrents(st);
  subduoDrawHollows(st);
  subduoDrawPlopped(st, true);
  subduoDrawGround(st, lk);
  subduoDrawPlopped(st, false);
  subduoDrawSigns(st);
  subduoDrawEndBack(st);
  ctx.restore();
}
function subduoDrawFront(st) {
  const cam = st.cam;
  ctx.save(); ctx.translate(-Math.round(cam.x * 10) / 10, 0);
  for (const k of st.c.corals) if (k.x > cam.x - 120 && k.x < cam.x + W + 120) subduoDrawCoral(k);
  for (const lg of st.c.logs) if (lg.px > cam.x - 80 && lg.px - lg.len < cam.x + W + 80) subduoDrawLog(st, lg);
  for (const clm of st.c.clams) subduoDrawClam(st, clm);
  subduoDrawPearls(st);
  for (const tu of st.c.turtles) if (tu.x > cam.x - 80 && tu.x < cam.x + W + 80) subduoDrawTurtle(tu, st.roomT);
  for (const f of st.c.puffers) if (f.x > cam.x - 80 && f.x < cam.x + W + 80) subduoDrawPuffer(f, st.roomT);
  subduoDrawFish(st);
  subduoDrawEndFront(st);
  for (const b of st.c.boulders) if (b.state !== 'plop' && b.state !== 'held') subduoDrawBoulder(b, st.roomT);
  subduoDrawSub(st);
  subduoDrawArm(st);
  for (const q of st.parts) {
    if (q.x < cam.x - 40 || q.x > cam.x + W + 40) continue;
    const a = clamp(q.life / q.max, 0, 1);
    ctx.globalAlpha = a; ctx.fillStyle = q.col;
    if (q.kind === 'star') { subduoStarPath(q.x, q.y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
    else if (q.kind === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
    else if (q.kind === 'bubble') { ctx.strokeStyle = q.col; ctx.lineWidth = 1.4; circle(q.x, q.y, q.size); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill(); }
    else if (q.kind === 'note') { text('♪', q.x, q.y, 14 + q.size, '#ffffff', 'center', 'body'); }
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  const big = hudBig(), placed = [];
  for (let i = st.pops.length - 1; i >= 0; i--) {
    const q = st.pops[i], sz = q.size * (big ? 1.3 : 1);
    ctx.font = sz + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const hw = ctx.measureText(q.s).width / 2 + 12;
    let x = clamp(q.x - cam.x, 110, W - 110), y = clamp(q.y - q.t * 30, 96, H - 120);
    // newer pops keep their spot; older ones step up out of the way so words never pile on each other
    for (let k = 0; k < 6; k++) { const hit = placed.find(o => Math.abs(o.x - x) < o.hw + hw && Math.abs(o.y - y) < (o.sz + sz) * 0.62); if (!hit) break; y = hit.y - (hit.sz + sz) * 0.65; }
    y = Math.max(y, 60);
    placed.push({ x, y, hw, sz });
    ctx.globalAlpha = clamp((1.3 - q.t) / 0.3, 0, 1);
    bigText(q.s, x, y, sz, q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
    ctx.globalAlpha = 1;
  }
}
function subduoStarPath(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot - Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
// sunbeams slanting down through the water
function subduoDrawRays(st, lk) {
  if (lk.rays <= 0) return;
  const t = G.clock;
  for (let k = 0; k < 6; k++) {
    const x = ((k * 211 - st.cam.x * 0.2 + Math.sin(t * 0.3 + k) * 30) % 1300 + 1300) % 1300 - 170, w = 50 + (k % 3) * 26;
    const a = lk.rays * (0.6 + 0.4 * Math.sin(t * 0.7 + k * 1.3));
    const gr = ctx.createLinearGradient(0, 0, 0, H * 0.85);
    gr.addColorStop(0, 'rgba(255,255,240,' + a + ')'); gr.addColorStop(1, 'rgba(255,255,240,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w + 160, H * 0.85); ctx.lineTo(x + 120, H * 0.85); ctx.closePath(); ctx.fill();
  }
}
// a far reef (slow parallax), little drifting specks
function subduoDrawFar(st, lk) {
  const cam = st.cam;
  { // hazy distant rock arches and spires
    const par = 0.07, col = mixCol(lk.far, lk.wT, 0.45), off = cam.x * par;
    ctx.fillStyle = col;
    for (let k = Math.floor((off - 300) / 520); k <= Math.floor((off + W + 300) / 520); k++) {
      const h = hash(k, 61), x = k * 520 + (h % 140) - off, hh = 120 + h % 90, wd = 90 + (h >> 4) % 70;
      if (h % 3 === 0) { // an arch
        ctx.beginPath(); ctx.moveTo(x - wd, 420); ctx.lineTo(x - wd * 0.8, 420 - hh); ctx.quadraticCurveTo(x, 420 - hh * 1.35, x + wd * 0.8, 420 - hh); ctx.lineTo(x + wd, 420);
        ctx.lineTo(x + wd * 0.45, 420); ctx.quadraticCurveTo(x, 420 - hh * 0.95, x - wd * 0.45, 420); ctx.closePath(); ctx.fill();
      } else { // a spire
        ctx.beginPath(); ctx.moveTo(x - wd * 0.5, 420); ctx.quadraticCurveTo(x - wd * 0.3, 420 - hh * 0.6, x - 8, 420 - hh); ctx.lineTo(x + 10, 420 - hh * 0.92); ctx.quadraticCurveTo(x + wd * 0.35, 420 - hh * 0.5, x + wd * 0.5, 420); ctx.closePath(); ctx.fill();
      }
    }
    // a slow school of far fish
    ctx.fillStyle = mixCol(lk.far, lk.wT, 0.2);
    for (let k = 0; k < 9; k++) { const x = ((k * 23 + G.clock * 14 - off * 2) % (W + 300) + W + 300) % (W + 300) - 150, y = 170 + (k % 3) * 11 + Math.sin(G.clock + k) * 3; ctx.beginPath(); ctx.ellipse(x, y, 7, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x - 11, y - 3); ctx.lineTo(x - 11, y + 3); ctx.fill(); }
  }
  for (const [par, col, base, amp] of [[0.15, lk.far, 360, 40], [0.32, lk.far2, 410, 34]]) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) { const wx = x + cam.x * par; ctx.lineTo(x, base + Math.sin(wx * 0.007) * amp + Math.sin(wx * 0.021 + 1) * 12); }
    ctx.lineTo(W, H); ctx.fill();
    // far coral silhouettes on the ridge
    const off = cam.x * par, k0 = Math.floor((off - 100) / 170), k1 = Math.floor((off + W + 100) / 170);
    for (let k = k0; k <= k1; k++) {
      const h = hash(k, par * 100 | 0), x = k * 170 + (h % 60) - off, wx = x + off, y = base + Math.sin(wx * 0.007) * amp + Math.sin(wx * 0.021 + 1) * 12 + 4;
      ctx.strokeStyle = col; ctx.lineWidth = 7; ctx.lineCap = 'round';
      const hh = 26 + h % 30;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - hh); ctx.moveTo(x, y - hh * 0.5); ctx.lineTo(x - 12, y - hh * 0.8); ctx.moveTo(x, y - hh * 0.6); ctx.lineTo(x + 13, y - hh * 0.95); ctx.stroke();
    }
  }
  // drifting specks
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let k = 0; k < 26; k++) {
    const x = ((hash(k, 3) % 1000) - cam.x * 0.5 + G.clock * 6) % W, y = (hash(k, 9) % 480) + 30 + Math.sin(G.clock * 0.8 + k) * 6;
    circle((x + W) % W, y, 1.2 + (k % 3) * 0.5); ctx.fill();
  }
  if (st.look === 'kelp') { ctx.save(); ctx.globalAlpha = 0.5; subduoDrawKelp(st, 0.5, 0.75); ctx.restore(); }
}
// tall swaying kelp: par 0 = in the world (behind the sub), else a far layer drawn in screen px
function subduoDrawKelp(st, par, s) {
  const cam = st.cam, t = G.clock, span = par ? 90 : 150;
  const x0 = par ? cam.x * par : cam.x, k0 = Math.floor((x0 - 100) / span), k1 = Math.floor((x0 + W + 100) / span);
  for (let k = k0; k <= k1; k++) {
    const h = hash(k, par ? 41 : 17), bx = k * span + (h % 50), wx = par ? bx : bx;
    const sx = par ? bx - x0 : bx;
    const fy = par ? 470 + (h % 40) : subduoFloor(st, wx), top = par ? 140 + (h % 120) : Math.max(subduoCeil(st, wx) + 30, fy - 180 - (h % 160));
    if (!par && fy - top < 60) continue;
    const n = 10, col = par ? '#1f6e5c' : ['#3f9a52', '#4fae5c', '#378a4c'][h % 3];
    ctx.strokeStyle = col; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
    ctx.beginPath();
    const pts = [];
    for (let i = 0; i <= n; i++) { const u = i / n, y = fy - (fy - top) * u, x = sx + Math.sin(t * 1.1 + k + u * 3) * 12 * u * s; pts.push([x, y]); ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = col;
    for (let i = 2; i < n; i += 2) {
      const [x, y] = pts[i], side = i % 4 ? 1 : -1;
      ctx.beginPath(); ctx.ellipse(x + side * 9 * s, y, 11 * s, 4.5 * s, side * 0.6 + Math.sin(t * 1.3 + i) * 0.2, 0, Math.PI * 2); ctx.fill();
    }
    if (!par) { ctx.fillStyle = '#ffd36b'; circle(pts[n][0], pts[n][1], 3.5); ctx.fill(); }
  }
}
function subduoDrawGround(st, lk) {
  const cam = st.cam, x0 = Math.floor((cam.x - 20) / 8) * 8, x1 = cam.x + W + 20;
  // the roof: rock (or, in the shallows, the bright water surface)
  if (st.look === 'shallows') {
    const t = G.clock;
    ctx.fillStyle = '#d9f6ff';
    ctx.beginPath(); ctx.moveTo(x0, -10);
    for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, 66 + Math.sin(x * 0.03 + t * 2) * 3 + Math.sin(x * 0.011 - t) * 2);
    ctx.lineTo(x1, -10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, 66 + Math.sin(x * 0.03 + t * 2) * 3 + Math.sin(x * 0.011 - t) * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let x = Math.floor(x0 / 60) * 60; x < x1; x += 60) { const w = 14 + (hash(x, 2) % 20); ctx.fillRect(x + Math.sin(t + x) * 6, 74 + (hash(x, 5) % 6), w, 2); }
  }
  const rockY = x => { const c = subduoCeil(st, x); return st.look === 'shallows' && c < 82 ? c - (82 - c) * 6 : c; };
  ctx.fillStyle = lk.rock; ctx.beginPath(); ctx.moveTo(x0, -10);
  for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, rockY(x));
  ctx.lineTo(x1, -10); ctx.closePath(); ctx.fill();
  // texture: holes and bumps in the coral rock, and a lighter band along its edge
  ctx.save(); ctx.beginPath(); ctx.moveTo(x0, -10);
  for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, rockY(x));
  ctx.lineTo(x1, -10); ctx.closePath(); ctx.clip();
  // layers in the rock (strata following the edge), a shadowed band, then the lit lip
  ctx.lineWidth = 3;
  for (const [d, a] of [[34, 0.10], [70, 0.08], [112, 0.06]]) {
    ctx.strokeStyle = 'rgba(60,20,50,' + a + ')'; ctx.beginPath();
    for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, rockY(x) - d + Math.sin(x * 0.05 + d) * 3);
    ctx.stroke();
  }
  ctx.strokeStyle = shade(lk.rock, 0.22); ctx.globalAlpha = 0.45; ctx.lineWidth = 22; ctx.beginPath();
  for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, rockY(x) - 16);
  ctx.stroke(); ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 8; ctx.beginPath();
  for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, rockY(x) - 3);
  ctx.stroke();
  for (let x = Math.floor(x0 / 38) * 38; x < x1; x += 38) {
    const h = hash(x, 19), y = rockY(x) - 20 - (h % 160);
    if (y < -10) continue;
    ctx.fillStyle = h % 3 ? 'rgba(120,40,80,0.16)' : 'rgba(255,255,255,0.16)';
    ctx.beginPath(); ctx.ellipse(x + (h % 30), y, 6 + (h % 9), 4 + (h % 6), 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = lk.rockD; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.beginPath();
  for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, rockY(x));
  ctx.stroke();
  // little hanging coral and crystals on the roof
  for (let x = Math.floor(x0 / 70) * 70; x < x1; x += 70) {
    const y = rockY(x), h = hash(x, 31);
    if (y < 70) continue;
    if (st.look === 'grotto' && h % 3 === 0) { ctx.fillStyle = ['#9fe8ff', '#ffb3e6', '#c8ffb0'][h % 3 === 0 ? (h >> 3) % 3 : 0]; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(G.clock * 2 + x); ctx.beginPath(); ctx.moveTo(x - 7, y - 2); ctx.lineTo(x, y + 18 + (h % 10)); ctx.lineTo(x + 7, y - 2); ctx.fill(); ctx.globalAlpha = 1; }
    else if (h % 2 === 0) { ctx.strokeStyle = lk.rockD; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x + 3, y + 12 + (h % 8)); ctx.stroke(); }
  }
  // the sand
  let gr = subduoWaterCache['sand' + st.look];
  if (!gr) { gr = ctx.createLinearGradient(0, 380, 0, H); gr.addColorStop(0, lk.sand); gr.addColorStop(1, lk.sandD); subduoWaterCache['sand' + st.look] = gr; }
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0, H + 10);
  for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, subduoFloor(st, x));
  ctx.lineTo(x1, H + 10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = shade(lk.sandD, 0.1); ctx.globalAlpha = 0.35; ctx.lineWidth = 10; ctx.beginPath();
  for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, subduoFloor(st, x) + 9);
  ctx.stroke(); ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.beginPath();
  for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, subduoFloor(st, x) + 1.5);
  ctx.stroke();
  // sand grains
  ctx.fillStyle = shade(lk.sandD, 0.15);
  for (let x = Math.floor(x0 / 14) * 14; x < x1; x += 14) { const h = hash(x, 91), y = subduoFloor(st, x) + 18 + (h % 90); if (y < H) { ctx.globalAlpha = 0.25 + (h % 3) * 0.1; ctx.fillRect(x + (h % 11), y, 2, 2); } }
  ctx.globalAlpha = 1;
  // ripples, pebbles, starfish, little shells and anemones on the sand
  for (let x = Math.floor(x0 / 46) * 46; x < x1; x += 46) {
    const h = hash(x, 77), y = subduoFloor(st, x);
    ctx.strokeStyle = 'rgba(160,120,60,0.3)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + (h % 20), y + 16 + (h % 18)); ctx.quadraticCurveTo(x + (h % 20) + 9, y + 11 + (h % 18), x + (h % 20) + 18, y + 16 + (h % 18)); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(x + (h % 20) + 2, y + 13 + (h % 18)); ctx.quadraticCurveTo(x + (h % 20) + 9, y + 9 + (h % 18), x + (h % 20) + 15, y + 13 + (h % 18)); ctx.stroke();
    if (h % 7 === 0) { ctx.fillStyle = '#ff8a6a'; subduoStarPath(x + 10, y + 6, 8, 3.4, (h % 10) * 0.3); ctx.fill(); }
    else if (h % 7 === 3) { ctx.fillStyle = '#b48ad8'; ctx.beginPath(); ctx.ellipse(x + 8, y + 2, 7, 4, 0, Math.PI, 0); ctx.fill(); for (let i = 0; i < 4; i++) { ctx.strokeStyle = '#d8b8f2'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + 3 + i * 3.4, y); ctx.lineTo(x + 2 + i * 3.6 + Math.sin(G.clock * 2 + i + x) * 2, y - 8 - (i % 2) * 3); ctx.stroke(); } }
    else if (h % 7 === 5) { ctx.fillStyle = '#e8e2d4'; circle(x + 10, y + 4, 3.5); ctx.fill(); circle(x + 16, y + 6, 2.5); ctx.fill(); }
  }
}
function subduoDrawCurrents(st) {
  const t = G.clock;
  for (const cu of st.c.currents) {
    if (cu.x1 < st.cam.x - 50 || cu.x0 > st.cam.x + W + 50) continue;
    const ang = Math.atan2(cu.ay, cu.ax), len = 50;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let k = 0; k < 18; k++) {
      const u = ((t * 0.35 + hash(k, 5) % 100 / 100) % 1);
      const x = cu.x0 + (hash(k, 11) % 1000) / 1000 * (cu.x1 - cu.x0), y = subduoLerp(cu.y0 + 30, cu.y1 - 30, (hash(k, 13) % 1000) / 1000);
      const px = x + Math.cos(ang) * u * 120, py = y + Math.sin(ang) * u * 120;
      ctx.globalAlpha = Math.sin(u * Math.PI) * 0.8;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
// the sandy hole before each boulder pass (with a bobbing gold arrow while the boulder still blocks the way)
function subduoDrawHollows(st) {
  const t = G.clock;
  for (const b of st.c.boulders) {
    const ho = b.hollow;
    if (ho.filled || b.done || ho.x < st.cam.x - 200 || ho.x > st.cam.x + W + 200) continue;
    ctx.fillStyle = 'rgba(120,80,40,0.18)'; ctx.beginPath(); ctx.ellipse(ho.x, ho.fy + SUBD.hollowD - 40, SUBD.hollowW * 0.38, 34, 0, 0, Math.PI * 2); ctx.fill();
    if (Math.abs(st.sub.x - ho.x) < 900) {
      const y = ho.fy - 60 + Math.sin(t * 4) * 6, col = b.gold ? C.gold : '#ffe7a8';
      ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ho.x - 12, y - 16); ctx.lineTo(ho.x + 12, y - 16); ctx.lineTo(ho.x + 12, y); ctx.lineTo(ho.x + 22, y); ctx.lineTo(ho.x, y + 20); ctx.lineTo(ho.x - 22, y); ctx.lineTo(ho.x - 12, y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.setLineDash([8, 7]); ctx.strokeStyle = col; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ho.x, ho.fy + SUBD.hollowD - b.r, b.r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
  }
}
// a boulder snug in its hole: the sand covers most of it
function subduoDrawPlopped(st, under) {
  for (const b of st.c.boulders) {
    if (b.state !== 'plop' || b.x < st.cam.x - 100 || b.x > st.cam.x + W + 100) continue;
    if (under) continue;
    ctx.save(); ctx.beginPath(); ctx.rect(b.x - 80, 0, 160, b.hollow.fy + 6); ctx.clip();
    subduoDrawBoulder(b, st.roomT); ctx.restore();
    if (b.plopT < 2.5) { ctx.globalAlpha = clamp(1 - b.plopT / 2.5, 0, 1); ctx.fillStyle = C.gold; for (let i = 0; i < 3; i++) { const a = G.clock * 3 + i * 2.1; subduoStarPath(b.x + Math.cos(a) * 50, b.hollow.fy - 30 + Math.sin(a) * 10, 7, 3, a); ctx.fill(); } ctx.globalAlpha = 1; }
  }
}
function subduoDrawSigns(st) {
  const cam = st.cam;
  for (const s of st.c.signs) {
    if (s.x < cam.x - 400 || s.x > cam.x + W + 400) continue;
    const y = subduoFloor(st, s.x);
    ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(s.text).width + 22;
    ctx.fillStyle = '#8a5a36'; ctx.fillRect(s.x - 3, y - 50, 6, 52);
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#2a7a8c'; ctx.lineWidth = 2.5; rr(s.x - w / 2, y - 80, w, 32, 9); ctx.fill(); ctx.stroke();
    text(s.text, s.x, y - 63.5, 15, C.ink, 'center', 'body');
    // a little starfish on the sign post
    ctx.fillStyle = '#ff8a6a'; subduoStarPath(s.x + 4, y - 26, 7, 3, 0.3); ctx.fill();
  }
}
function subduoDrawCoral(k) {
  const t = G.clock, flip = k.floor ? 1 : -1, x = k.x, y = k.y, r = k.r;
  ctx.save(); ctx.translate(x, y); ctx.scale(1, flip);
  if (k.kind === 0) {
    // brain coral
    ctx.fillStyle = '#ff8fab'; ctx.strokeStyle = '#c85878'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, r * 0.15, r, r * 0.85, 0, Math.PI, 0); ctx.lineTo(r, r * 0.6); ctx.lineTo(-r, r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,88,120,0.7)'; ctx.lineWidth = 2.5;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); for (let a = 0; a <= 10; a++) { const u = a / 10, px = (-0.8 + u * 1.6) * r, py = -r * 0.45 + i * r * 0.18 + Math.sin(u * 12 + i) * 4; a ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
  } else if (k.kind === 1) {
    // branching coral
    ctx.strokeStyle = '#ff9a52'; ctx.lineCap = 'round';
    const br = (bx, by, a, len, w, d) => {
      const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
      ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      if (d > 0) { br(ex, ey, a - 0.5 + Math.sin(t + d) * 0.03, len * 0.72, w * 0.72, d - 1); br(ex, ey, a + 0.5, len * 0.7, w * 0.72, d - 1); }
      else { ctx.fillStyle = '#ffd0a0'; circle(ex, ey, w * 0.6); ctx.fill(); }
    };
    br(0, r * 0.6, -Math.PI / 2, r * 0.62, r * 0.3, 2);
    br(-r * 0.4, r * 0.6, -Math.PI / 2 - 0.35, r * 0.5, r * 0.24, 1);
    br(r * 0.4, r * 0.6, -Math.PI / 2 + 0.35, r * 0.5, r * 0.24, 1);
  } else {
    // tube sponges
    const cols = ['#b48ad8', '#9a6ad0', '#c8a4ec'];
    for (let i = 0; i < 4; i++) {
      const px = -r * 0.6 + i * r * 0.4, hh = r * (0.9 + (i % 2) * 0.5), w = r * 0.32;
      ctx.fillStyle = cols[i % 3]; rr(px - w / 2, r * 0.6 - hh, w, hh, w / 2); ctx.fill();
      ctx.fillStyle = 'rgba(60,30,90,0.45)'; ctx.beginPath(); ctx.ellipse(px, r * 0.6 - hh + w * 0.35, w * 0.32, w * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}
function subduoDrawBoulder(b, t) {
  const r = b.r, x = b.x, y = b.y, h = b.id * 7 + 3;
  ctx.save(); ctx.translate(x, y); ctx.rotate(b.spin || 0);
  if (b.gold && !b.done) { ctx.fillStyle = 'rgba(255,197,61,' + (0.25 + 0.15 * Math.sin(G.clock * 5)) + ')'; circle(0, 0, r + 12); ctx.fill(); }
  ctx.fillStyle = '#8f96a8'; ctx.strokeStyle = '#5c6278'; ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2, rr2 = r * (0.92 + (hash(h, i) % 10) / 100); ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
  ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(60,64,88,0.32)'; circle(r * 0.35, r * 0.4, r * 0.95); ctx.fill(); ctx.restore();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(70,74,96,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.1); ctx.lineTo(r * 0.2, r * 0.05); ctx.lineTo(r * 0.15, r * 0.35); ctx.moveTo(r * 0.2, r * 0.05); ctx.lineTo(r * 0.5, -r * 0.05); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.35, r * 0.2, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6fbf73';
  for (let i = 0; i < 4; i++) { const a = -2.4 + i * 0.5; circle(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78, 7 - i); ctx.fill(); }
  ctx.fillStyle = 'rgba(70,74,96,0.35)'; circle(r * 0.25, r * 0.2, 6); ctx.fill(); circle(-r * 0.1, r * 0.45, 4); ctx.fill();
  ctx.restore();
  void t;
}
function subduoDrawLog(st, lg) {
  const tp = subduoLogTop(lg), r = SUBD.logR, ang = lg.th;
  ctx.save(); ctx.translate(lg.px, lg.py); ctx.rotate(ang);
  if (lg.gold && !lg.done) { ctx.fillStyle = 'rgba(255,197,61,' + (0.25 + 0.15 * Math.sin(G.clock * 5)) + ')'; rr(-10, -r - 9, lg.len + 20, r * 2 + 18, r + 9); ctx.fill(); }
  ctx.fillStyle = '#a8703e'; ctx.strokeStyle = '#6a4220'; ctx.lineWidth = 3;
  rr(0, -r, lg.len, r * 2, r); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(106,66,32,0.55)'; ctx.lineWidth = 2;
  for (let k = 20; k < lg.len - 20; k += 34) { ctx.beginPath(); ctx.moveTo(k, -r + 4); ctx.quadraticCurveTo(k + 12, -2, k + 6, r - 4); ctx.stroke(); }
  // the cut end with rings
  ctx.fillStyle = '#e8c08a'; ctx.beginPath(); ctx.ellipse(lg.len, 0, 6, r - 1, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#b88a52'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(lg.len, 0, 3, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  // kelp tufts growing on its upper side
  const up = -Math.cos(ang) > 0 ? -1 : 1;
  for (const k of [0.3, 0.55, 0.8]) {
    ctx.strokeStyle = '#4fae5c'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(lg.len * k, -r * up); ctx.quadraticCurveTo(lg.len * k + 6, (-r - 14) * up, lg.len * k - 2 + Math.sin(G.clock * 2 + k * 9) * 4, (-r - 22) * up); ctx.stroke();
  }
  ctx.restore();
  // roots at the floor
  ctx.strokeStyle = '#6a4220'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (const d of [-14, 0, 14]) { ctx.beginPath(); ctx.moveTo(lg.px, lg.py - 4); ctx.quadraticCurveTo(lg.px + d, lg.py + 2, lg.px + d * 1.8, lg.py + 8); ctx.stroke(); }
  // the grip spot (where to grab) while it is up
  if (lg.state === 'up' && Math.abs(st.sub.x - lg.px) < 700) {
    const g = { x: lg.px + Math.cos(lg.th) * lg.len * 0.74, y: lg.py + Math.sin(lg.th) * lg.len * 0.74 };
    ctx.strokeStyle = lg.gold ? C.gold : 'rgba(255,231,168,' + (0.55 + 0.4 * Math.sin(G.clock * 5)) + ')'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
    circle(g.x, g.y, 22); ctx.stroke(); ctx.setLineDash([]);
  }
  void tp;
}
function subduoDrawClam(st, clm) {
  if (clm.x1 < st.cam.x - 120 || clm.x > st.cam.x + W + 120) { subduoDrawConch(st, clm); return; }
  const t = G.clock, op = subduoSmooth(clm.open), mid = clm.mid, cx = clm.x + 48;
  const halfH = (clm.bot - clm.top) / 2;
  const gapY = op * (halfH - 34);
  // two big ribbed shell halves meeting at a frilly lip; opening, they slide into the roof and the sand
  ctx.save(); ctx.beginPath(); ctx.rect(clm.x - 40, clm.top - 4, 180, clm.bot - clm.top + 8); ctx.clip();
  for (const side of [-1, 1]) {
    const lipY = mid + side * gapY, hy = lipY + side * halfH, rx = 54;
    const g = ctx.createLinearGradient(0, hy, 0, lipY);
    g.addColorStop(0, '#8a58c0'); g.addColorStop(1, '#d6a0f0');
    ctx.fillStyle = g; ctx.strokeStyle = '#6a3a98'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - rx, lipY);
    ctx.ellipse(cx, lipY, rx, halfH, 0, Math.PI, side < 0 ? Math.PI * 2 : 0, side > 0);
    // the frilly (wavy) lip back across
    for (let i = 8; i >= 0; i--) { const u = i / 8, px = cx - rx + u * rx * 2; ctx.lineTo(px, lipY + Math.sin(u * Math.PI * 5) * 6 * side); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // ribs fanning out from the hinge
    ctx.strokeStyle = 'rgba(106,58,152,0.45)'; ctx.lineWidth = 3;
    for (let i = 1; i < 7; i++) { const u = i / 7, px = cx - rx + u * rx * 2; ctx.beginPath(); ctx.moveTo(cx + (u - 0.5) * 20, hy - side * 10); ctx.quadraticCurveTo(cx + (u - 0.5) * rx * 1.7, (hy + lipY) / 2, px, lipY - side * 8); ctx.stroke(); }
    // the bright blue-green mantle peeking out of the lip
    ctx.fillStyle = '#4fd0d8'; ctx.strokeStyle = '#2a9aa8'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) { const u = i / 8, px = cx - rx + 6 + u * (rx * 2 - 12); ctx.lineTo(px, lipY + Math.sin(u * Math.PI * 5) * 6 * side - side * 3); }
    for (let i = 8; i >= 0; i--) { const u = i / 8, px = cx - rx + 6 + u * (rx * 2 - 12); ctx.lineTo(px, lipY + Math.sin(u * Math.PI * 5) * 6 * side - side * 12); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // little spots on the mantle
    ctx.fillStyle = '#b8f6ff'; for (let i = 0; i < 4; i++) { circle(cx - 30 + i * 20, lipY - side * 8, 2); ctx.fill(); }
  }
  ctx.restore();
  // her face on the lip: sleepy when shut, happy when open
  const ey = mid - gapY - 22;
  if (!clm.done) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const ex of [-16, 16]) { ctx.beginPath(); ctx.arc(cx + ex, ey, 7, 0.2, Math.PI - 0.2); ctx.stroke(); }
    const z = (t * 0.6) % 1;
    ctx.globalAlpha = 1 - z; text('z', cx + 40 + z * 20, ey - 20 - z * 30, 14 + z * 8, '#ffffff', 'center'); ctx.globalAlpha = 1;
    // the glowing mouth where the conch goes
    const pr = clm.gold ? 30 : 20, pa = 0.5 + 0.4 * Math.sin(t * 4);
    ctx.strokeStyle = clm.gold ? C.gold : 'rgba(255,240,180,' + pa + ')'; ctx.lineWidth = 4;
    circle(clm.mouth.x, clm.mouth.y, pr + Math.sin(t * 4) * 3); ctx.stroke();
  } else {
    for (const ex of [-16, 16]) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(cx + ex, ey, 7, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = C.ink; circle(cx + ex + 1, ey + 1, 3.6); ctx.fill(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, ey + 10, 9, 0.3, Math.PI - 0.3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,140,170,0.5)'; circle(cx - 28, ey + 8, 5); ctx.fill(); circle(cx + 28, ey + 8, 5); ctx.fill();
    // the given conch sits on her lower lip
    if (clm.conch.state === 'given') subduoConchShape(cx - 10, mid + gapY - 12, 0.9, false);
  }
  subduoDrawConch(st, clm);
}
function subduoConchShape(x, y, s, gold) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.3);
  if (gold) { ctx.fillStyle = 'rgba(255,197,61,' + (0.35 + 0.2 * Math.sin(G.clock * 6)) + ')'; circle(0, 0, 26); ctx.fill(); }
  ctx.fillStyle = '#ffb48a'; ctx.strokeStyle = '#c8704a'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-16, 6); ctx.quadraticCurveTo(-14, -14, 4, -12); ctx.lineTo(20, -2); ctx.quadraticCurveTo(10, 12, -16, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffe0c8'; ctx.beginPath(); ctx.ellipse(-4, 2, 8, 5, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c8704a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-6, -2); ctx.moveTo(-3, -11); ctx.lineTo(0, -4); ctx.moveTo(5, -11); ctx.lineTo(6, -4); ctx.stroke();
  ctx.restore();
}
function subduoDrawConch(st, clm) {
  const q = clm.conch;
  if (q.state === 'given' || q.state === 'held') return;
  if (q.x < st.cam.x - 60 || q.x > st.cam.x + W + 60) return;
  subduoConchShape(q.x, q.y, 1, clm.gold);
  if (Math.sin(G.clock * 3 + q.x) > 0.7) { ctx.fillStyle = '#ffffff'; subduoStarPath(q.x + 12, q.y - 14, 5, 2, G.clock); ctx.fill(); }
}
function subduoDrawPearls(st) {
  const cam = st.cam, t = G.clock;
  for (const pr of st.c.pearls) {
    if (pr.x < cam.x - 60 || pr.x > cam.x + W + 60) continue;
    if (pr.got) {
      if (pr.t < 0.5) { ctx.globalAlpha = 1 - pr.t / 0.5; ctx.fillStyle = '#ffffff'; circle(pr.x, pr.y - pr.t * 60, 9 * (1 + pr.t)); ctx.fill(); ctx.globalAlpha = 1; }
      continue;
    }
    if (pr.kind === 'shell') {
      ctx.save(); ctx.translate(pr.x, pr.y + 4);
      ctx.fillStyle = '#ffb3c8'; ctx.strokeStyle = '#d0708c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 8); for (let i = 0; i <= 6; i++) { const a = Math.PI + i / 6 * Math.PI; ctx.lineTo(Math.cos(a) * 13, 4 + Math.sin(a) * 13); } ctx.closePath(); ctx.fill(); ctx.stroke();
      for (let i = 1; i < 6; i++) { const a = Math.PI + i / 6 * Math.PI; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(Math.cos(a) * 12, 4 + Math.sin(a) * 12); ctx.stroke(); }
      ctx.restore();
      continue;
    }
    const r = pr.big ? 14 : 9, bob = pr.floor ? 0 : Math.sin(t * 2 + pr.x * 0.05) * 3;
    if (pr.floor) {
      // an open oyster on the sand holding the pearl
      ctx.fillStyle = '#9a8ab0'; ctx.strokeStyle = '#6a5a80'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(pr.x, pr.y + 8, 17, 7, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(pr.x - 4, pr.y - 4, 16, 6, -0.5, Math.PI, 0); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + 0.12 * Math.sin(t * 3 + pr.x)) + ')'; circle(pr.x, pr.y + bob, r + 7); ctx.fill();
    const g = ctx.createRadialGradient(pr.x - r * 0.35, pr.y + bob - r * 0.35, 1, pr.x, pr.y + bob, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, pr.big ? '#ffd9a0' : '#d8e4f4');
    ctx.fillStyle = g; circle(pr.x, pr.y + bob, r); ctx.fill();
    ctx.strokeStyle = pr.big ? '#c89a50' : 'rgba(120,130,160,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (pr.big && Math.sin(t * 5) > 0.3) { ctx.fillStyle = C.gold; subduoStarPath(pr.x + 14, pr.y + bob - 14, 6, 2.4, t); ctx.fill(); }
  }
}
function subduoDrawTurtle(tu, t) {
  const d = tu.dir || 1, fl = Math.sin(t * 3 + tu.ph);
  ctx.save(); ctx.translate(tu.x, tu.y); ctx.scale(d, 1);
  ctx.fillStyle = '#8fd07a'; ctx.strokeStyle = '#3f7a3a'; ctx.lineWidth = 2.5;
  // flippers
  ctx.save(); ctx.translate(8, 10); ctx.rotate(0.5 + fl * 0.4); ctx.beginPath(); ctx.ellipse(10, 0, 16, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(-14, 10); ctx.rotate(0.9 - fl * 0.3); ctx.beginPath(); ctx.ellipse(8, 0, 10, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
  // head
  ctx.beginPath(); ctx.ellipse(30, -2, 11, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; circle(34, -5, 2.4); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(33, 0, 4, 0.2, Math.PI * 0.8); ctx.stroke();
  // shell
  ctx.fillStyle = '#5aa05a'; ctx.strokeStyle = '#2f6a34'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 18, 0, Math.PI, 0); ctx.lineTo(26, 4); ctx.quadraticCurveTo(0, 12, -26, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(200,240,170,0.7)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-12, 2); ctx.lineTo(-8, -10); ctx.lineTo(8, -10); ctx.lineTo(12, 2); ctx.moveTo(-8, -10); ctx.lineTo(-18, -4); ctx.moveTo(8, -10); ctx.lineTo(18, -4); ctx.stroke();
  ctx.restore();
  if (tu.boop > 0) { ctx.fillStyle = '#ff8fab'; subduoHeart(tu.x + d * 30, tu.y - 24 - (1 - tu.boop) * 20, 6); }
}
function subduoHeart(x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s); ctx.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.4, x, y - s * 0.4); ctx.bezierCurveTo(x + s * 0.6, y - s * 1.4, x + s * 1.6, y - s * 0.2, x, y + s); ctx.fill(); }
function subduoDrawPuffer(f, t) {
  const r = f.r + f.puff * 10;
  ctx.save(); ctx.translate(f.x, f.y);
  ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = '#c8962a'; ctx.lineWidth = 2.5;
  if (f.puff > 0.2) { ctx.strokeStyle = '#c8962a'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(a) * (r + 5 * f.puff), Math.sin(a) * (r + 5 * f.puff)); ctx.stroke(); } }
  // tail
  ctx.beginPath(); ctx.moveTo(r - 2, 0); ctx.lineTo(r + 10, -7 + Math.sin(t * 8) * 2); ctx.lineTo(r + 10, 7 + Math.sin(t * 8) * 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  circle(0, 0, r); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff4c0'; ctx.beginPath(); ctx.ellipse(0, r * 0.4, r * 0.7, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  // face (looking left, toward the sub)
  ctx.fillStyle = '#ffffff'; circle(-r * 0.4, -r * 0.2, 5); ctx.fill();
  ctx.fillStyle = C.ink; circle(-r * 0.45, -r * 0.18, 2.6); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(-r * 0.62, r * 0.18, 4, 0.3, Math.PI - 0.3); ctx.stroke();
  ctx.restore();
}
function subduoDrawFish(st) {
  const t = st.roomT, s = st.sub;
  for (const q of st.c.schools) {
    if (Math.abs(q.x - st.cam.x - W / 2) > W) continue;
    for (let i = 0; i < q.n; i++) {
      let x = q.x + Math.sin(t * 0.3 + i * 0.9) * 80 + i * 22 + ((t * 30) % 400) - 200, y = q.y + Math.sin(t * 0.9 + i * 1.7) * 26 + (i % 3) * 16;
      // they swim round the sub
      const dx = x - s.x, dy = y - s.y, d = Math.hypot(dx, dy);
      const push = q.scat > 0 ? 160 : 90;
      if (d < push) { x += dx / (d || 1) * (push - d) * 0.8; y += dy / (d || 1) * (push - d) * 0.8; }
      const dir = Math.cos(t * 0.3 + i * 0.9) > -0.2 ? 1 : -1;
      ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
      ctx.fillStyle = q.col; ctx.beginPath(); ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-14, -5 + Math.sin(t * 10 + i) * 2); ctx.lineTo(-14, 5 + Math.sin(t * 10 + i) * 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.ink; circle(4, -1, 1.4); ctx.fill();
      ctx.restore();
    }
  }
}
// the checkpoint buoy's chain and ring (or the treasure chest at the very end) and the rock wall behind it
function subduoDrawEndBack(st) {
  const e = st.c.end;
  if (!e || e.wall < st.cam.x - 60 || e.ringX - 400 > st.cam.x + W + 60) return;
  const lk = SUBD_LOOK[st.look] || SUBD_LOOK.shallows;
  // the end wall of the stretch
  ctx.fillStyle = lk.rock; ctx.strokeStyle = lk.rockD; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(e.wall + 400, -10); ctx.lineTo(e.wall + 10, -10);
  for (let y = 0; y <= H + 10; y += 30) ctx.lineTo(e.wall + Math.sin(y * 0.05) * 12 + (hash(y, 4) % 10), y);
  ctx.lineTo(e.wall + 400, H + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (!e.chest) {
    const topY = subduoSurface(st, e.ringX) ? 66 : subduoCeil(st, e.ringX);
    ctx.strokeStyle = '#8a8fa8'; ctx.lineWidth = 3; ctx.setLineDash([7, 4]);
    ctx.beginPath(); ctx.moveTo(e.ringX, topY + 10); ctx.lineTo(e.ringX, e.ringY - 16); ctx.stroke(); ctx.setLineDash([]);
    // the buoy (floating at the surface, or bobbing up against the roof)
    const by = topY + 4 + Math.sin(G.clock * 2) * 3;
    ctx.fillStyle = '#ff6a5a'; ctx.strokeStyle = '#a83a32'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(e.ringX, by, 22, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(e.ringX - 21, by - 4, 42, 8);
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(e.ringX, by - 16); ctx.lineTo(e.ringX, by - 40); ctx.lineTo(e.ringX + 18, by - 33); ctx.lineTo(e.ringX, by - 26); ctx.fill();
    ctx.strokeStyle = '#6a5a7a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.ringX, by - 14); ctx.lineTo(e.ringX, by - 40); ctx.stroke();
  }
}
function subduoDrawEndFront(st) {
  const e = st.c.end;
  if (!e || e.ringX < st.cam.x - 100 || e.ringX > st.cam.x + W + 100) return;
  const t = G.clock, pulse = 0.6 + 0.4 * Math.sin(t * 4);
  if (e.chest) {
    // the treasure chest: grab its handle
    const x = e.ringX, fy = subduoFloor(st, x), open = e.got ? clamp((st.dock ? st.dock.t : 0) / 0.6, 0, 1) : 0;
    ctx.fillStyle = '#9a5e2e'; ctx.strokeStyle = '#5e3a1a'; ctx.lineWidth = 3;
    rr(x - 40, fy - 44, 80, 44, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffc53d'; ctx.fillRect(x - 40, fy - 30, 80, 6); ctx.fillRect(x - 5, fy - 44, 10, 44);
    if (open > 0) {
      ctx.fillStyle = '#ffd36b'; for (let i = 0; i < 9; i++) { circle(x - 30 + i * 7.5, fy - 46 - (i % 3) * 4, 6); ctx.fill(); }
      ctx.fillStyle = '#ffffff'; circle(x - 12, fy - 54, 6); ctx.fill(); circle(x + 14, fy - 52, 5); ctx.fill();
    }
    ctx.save(); ctx.translate(x - 40, fy - 44); ctx.rotate(-open * 1.9);
    ctx.fillStyle = '#a8683a'; ctx.strokeStyle = '#5e3a1a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(80, 0); ctx.quadraticCurveTo(80, -24, 40, -26); ctx.quadraticCurveTo(0, -24, 0, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffc53d'; ctx.fillRect(35, -26, 10, 26);
    ctx.restore();
    if (!e.got) {
      ctx.strokeStyle = e.gold ? C.gold : '#ffe7a8'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(e.ringX, e.ringY, 10, Math.PI, 0); ctx.stroke();
      ctx.globalAlpha = pulse * 0.7; ctx.strokeStyle = C.gold; ctx.lineWidth = 3; circle(e.ringX, e.ringY, (e.gold ? 46 : 26) + pulse * 4); ctx.stroke(); ctx.globalAlpha = 1;
    }
    return;
  }
  const r = e.gold ? 24 : 16;
  ctx.strokeStyle = '#ffc53d'; ctx.lineWidth = 6; circle(e.ringX, e.ringY, r); ctx.stroke();
  ctx.strokeStyle = '#c8902a'; ctx.lineWidth = 2; circle(e.ringX, e.ringY, r); ctx.stroke();
  if (!e.got) { ctx.globalAlpha = pulse * 0.6; ctx.strokeStyle = C.gold; ctx.lineWidth = 3; circle(e.ringX, e.ringY, r + 12 + pulse * 5); ctx.stroke(); ctx.globalAlpha = 1; }
}

/* ---------- the submarine ---------- */
function subduoDrawSub(st) {
  const s = st.sub, t = G.clock, wob = s.wob > 0 ? Math.sin(t * 28) * 0.08 * (s.wob / SUBD.wobT) : 0;
  const bob = Math.sin(t * 1.6) * 2;
  // the headlight beam
  if (st.look === 'grotto' || st.look === 'canyon') {
    const g = ctx.createLinearGradient(s.x + 56, 0, s.x + 400, 0);
    g.addColorStop(0, 'rgba(255,250,200,' + (st.look === 'grotto' ? 0.32 : 0.16) + ')'); g.addColorStop(1, 'rgba(255,250,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(s.x + 56, s.y - 2 + bob); ctx.lineTo(s.x + 420, s.y - 90 + bob); ctx.lineTo(s.x + 420, s.y + 100 + bob); ctx.closePath(); ctx.fill();
  }
  { const fy = subduoFloor(st, s.x), gap = fy - s.y; if (gap > 0 && gap < 420) { ctx.fillStyle = 'rgba(20,40,60,' + (0.2 * (1 - gap / 420)).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(s.x, fy + 4, 62 * (1 - gap / 900), 9, 0, 0, Math.PI * 2); ctx.fill(); } }
  ctx.save(); ctx.translate(s.x, s.y + bob); ctx.rotate(s.tilt + wob);
  // propeller
  ctx.fillStyle = '#5a6a80'; rr(-70, -4, 14, 8, 3); ctx.fill();
  const pa = s.prop;
  ctx.fillStyle = '#e8eef8'; ctx.strokeStyle = '#5a6a80'; ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) { const a = pa + k * Math.PI * 2 / 3, h = Math.sin(a) * 16; ctx.beginPath(); ctx.ellipse(-72, h / 2, 4, Math.abs(h / 2) + 1, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  // tail fins
  ctx.fillStyle = '#2bb5a8'; ctx.strokeStyle = '#17786f'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-44, -10); ctx.lineTo(-62, -30); ctx.lineTo(-54, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-44, 16); ctx.lineTo(-62, 34); ctx.lineTo(-54, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
  // the dome: back glass, the two seats with Pip and Bo, then the hull over their legs
  ctx.fillStyle = 'rgba(200,240,255,0.45)'; ctx.strokeStyle = '#17786f'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, -10, 32, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
  subduoDrawCrew(st, false);
  ctx.save(); ctx.translate(s.x, s.y + bob); ctx.rotate(s.tilt + wob);
  // the hull
  ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#b8901a'; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.ellipse(0, 6, 58, 27, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 6, 56.5, 25.5, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = 'rgba(184,120,10,0.35)'; ctx.beginPath(); ctx.ellipse(4, 26, 62, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2bb5a8'; ctx.fillRect(-60, 8, 120, 9);
  ctx.fillStyle = '#17786f'; ctx.globalAlpha = 0.45; ctx.fillRect(-60, 15, 120, 2); ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; for (let i = -4; i <= 4; i++) { circle(i * 12, 12.5, 1.3); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-12, -6, 34, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(184,144,26,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-18, -16); ctx.lineTo(-18, 30); ctx.moveTo(18, -16); ctx.lineTo(18, 30); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#b8901a'; for (let i = -3; i <= 3; i++) { circle(i * 13, 24, 1.6); ctx.fill(); }
  // portholes and the headlight
  for (const px of [-30, 28]) { ctx.fillStyle = '#9fe8ff'; ctx.strokeStyle = '#17786f'; ctx.lineWidth = 3; circle(px, 2, 6.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(px - 2, 0, 2); ctx.fill(); }
  ctx.fillStyle = '#fff6c0'; ctx.strokeStyle = '#b8901a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(55, 0, 4, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // dome rim and glass shine (front)
  ctx.strokeStyle = '#17786f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -10, 32, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = '#2bb5a8'; rr(-34, -14, 68, 7, 3.5); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -10, 25, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
  // a little periscope at the back
  ctx.strokeStyle = '#17786f'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-36, -12); ctx.lineTo(-36, -30); ctx.lineTo(-28, -30); ctx.stroke();
  // the steering wheel (front seat) and the claw joystick (back seat)
  ctx.restore();
  subduoDrawCrew(st, true);
  if (st.tootT > 0) { ctx.globalAlpha = st.tootT / 0.6; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(s.x + 60, s.y - 30, 18 + i * 14 + (0.6 - st.tootT) * 60, -0.8, 0.4); ctx.stroke(); } ctx.globalAlpha = 1; }
}
// Pip and Bo in their seats (drawn before the hull so it hides their legs; a hopping player is drawn on top after)
function subduoDrawCrew(st, front) {
  for (const id of [0, 1]) {
    const sp = subduoSeatSpot(st, id), hopping = sp.hop > 6;
    if (hopping !== front) continue;
    const p = G.players[id], save = { x: p.x, y: p.y, face: p.face, sx: p.sx, sy: p.sy, vy: p.vy, stun: p.stun, alive: p.alive, blink: p.blink };
    ctx.save(); ctx.translate(sp.x, sp.y); ctx.scale(0.8, 0.8);
    p.x = -PW / 2; p.y = -PH; p.alive = true; p.vy = 0; p.face = 1;
    p.stun = st.sub.wob > 0.4 ? 0.5 : 0;
    p.sy = hopping ? 1.08 : 1 + Math.sin(G.clock * 3 + id) * 0.02; p.sx = 2 - p.sy;
    drawPlayer(p);
    ctx.restore();
    Object.assign(p, save);
    if (!hopping && !front) {
      // a tiny wheel for the steerer, a joystick for the grabber
      const isS = id === st.steer;
      ctx.save(); ctx.translate(sp.x + 11, sp.y - 6);
      if (isS) { ctx.strokeStyle = '#8a5a36'; ctx.lineWidth = 2.5; circle(0, 0, 6); ctx.stroke(); ctx.save(); ctx.rotate(G.clock * 0 + (G.players[id].input.up || G.players[id].input.jump ? -0.5 : G.players[id].input.down ? 0.5 : 0)); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke(); ctx.restore(); }
      else { ctx.strokeStyle = '#5a6a80'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(clamp(st.claw.dx * 2, -4, 4), -4); ctx.stroke(); ctx.fillStyle = '#ff6a5a'; circle(clamp(st.claw.dx * 2, -4, 4), -5, 2.6); ctx.fill(); }
      ctx.restore();
    }
  }
}
// the claw arm: two teal segments from the shoulder, the claw at the tip, and whatever it holds
function subduoDrawArm(st) {
  const cl = st.claw, sh = subduoShoulder(st), s = st.sub, bob = Math.sin(G.clock * 1.6) * 2;
  const ax = sh.x, ay = sh.y + bob, tx = cl.x, ty = cl.y;
  const h = cl.hold;
  if (h && h.kind === 'boulder') subduoDrawBoulder(h.obj, st.roomT);
  const L1 = 92, L2 = 92, d = Math.min(Math.hypot(tx - ax, ty - ay), L1 + L2 - 1), base = Math.atan2(ty - ay, tx - ax);
  const k = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d || 1), -1, 1));
  const ex = ax + Math.cos(base - k) * L1, ey = ay + Math.sin(base - k) * L1;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [col, lw] of [['#17786f', 11], ['#2bd0c0', 7]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.lineTo(tx, ty); ctx.stroke(); }
  ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#b8901a'; ctx.lineWidth = 2.5;
  circle(ax, ay, 7); ctx.fill(); ctx.stroke(); circle(ex, ey, 6.5); ctx.fill(); ctx.stroke();
  // the claw: three fingers that open and close
  const fa = Math.atan2(ty - ey, tx - ex), open = 1 - cl.shut;
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(fa);
  ctx.fillStyle = '#5a6a80'; circle(0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#c8d4e4'; ctx.lineWidth = 5;
  for (const sgn of [-1, 1]) {
    const a = sgn * (0.25 + open * 0.75);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.lineTo(Math.cos(a) * 14 + Math.cos(-sgn * 0.6) * 10, Math.sin(a) * 14 + Math.sin(-sgn * 0.6) * 10 * -1 * -1); ctx.stroke();
  }
  ctx.strokeStyle = '#5a6a80'; ctx.lineWidth = 1.5;
  ctx.restore();
  if (h && h.kind === 'conch') subduoConchShape(h.obj.x, h.obj.y + 6, 1, st.c.clams.some(k => k.conch === h.obj && k.gold));
  // a soft ring where the claw will grab, when something is in reach
  if (!h && st.state === 'go') {
    const g = subduoCanGrab(st);
    if (g) { ctx.strokeStyle = 'rgba(255,231,168,' + (0.6 + 0.3 * Math.sin(G.clock * 10)) + ')'; ctx.lineWidth = 2.5; circle(tx, ty, 18); ctx.stroke(); }
  }
  void s;
}

/* ---------- the HUD: clock and pearls, the two job panels, prompts ---------- */
function subduoArrows(id, dx, dy, dead) {
  const out = [];
  dead = dead || 20;
  if (dx < -dead) out.push(subduoKey(id, 'left')); else if (dx > dead) out.push(subduoKey(id, 'right'));
  if (dy < -dead) out.push(subduoKey(id, 'up')); else if (dy > dead) out.push(subduoKey(id, 'down'));
  return out.join(' ');
}
function subduoPearlIcon(x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 1, x, y, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c8d8ee'); ctx.fillStyle = g; circle(x, y, r); ctx.fill();
}
function subduoHud(st) {
  const big = hudBig(), z = big ? 1.35 : 1, ps = G.players, play = G.mode === 'play' || G.mode === 'paused', t = G.clock;
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = st.pearls + ' / ' + st.pearlsAll;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.3, gap = fs;
    const w = tw + gap + icon + fs * 0.4 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
    subduoPearlIcon(x0 + 15 + tw + gap + icon / 2, cy, fs * 0.5);
    text(n, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, '#ffffff', 'left', 'body');
    timeX0 = x0;
  }
  if (!play) return;
  const pl = subduoPlan(st), can = subduoCanGrab(st), s = st.sub, cl = st.claw;
  const sh = subduoShoulder(st);
  const tipNear = pl.tx != null && Math.hypot(pl.tx - sh.x, pl.ty - sh.y) < SUBD.reach + 10;
  const steerLit = pl.sx != null && pl.why !== 'none' && pl.why !== 'wait' && pl.dist > 40 && Math.abs(pl.sx - s.x) < 600;
  const grabLit = !!(can && (pl.act === 'grab' || can.kind === 'pearl')) || pl.act === 'release';
  const clawLit = !cl.hold && tipNear && pl.tx != null && Math.hypot(pl.tx - cl.x, pl.ty - cl.y) > 24 && !grabLit;
  const tootLit = st.c.puffers.some(f => f.away <= 0 && f.x > s.x && f.x - s.x < 380);
  for (const id of [0, 1]) {
    const pw = Math.round(220 * z), ph = Math.round(56 * z), py = H - ph - 10, px = id === 0 ? 12 : W - 12 - pw;
    // (it fades while the sub or the claw is right behind it)
    const fade = (s.x - st.cam.x + 70 > px && s.x - st.cam.x - 70 < px + pw && s.y + 40 > py) || (cl.x - st.cam.x > px - 20 && cl.x - st.cam.x < px + pw + 20 && cl.y + 30 > py) ? 0.4 : 1;
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(16,40,70,0.82)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const quiet = subduoQuiet(id), isS = id === st.steer;
    text(NAMES[id] + (isS ? ' · steerer' : ' · claw') + (quiet ? ' (computer)' : ''), px + 12 * z, py + 14 * z, 13 * z, PCOL[id], 'left');
    const chips = isS ? [['arrows', 'STEER', steerLit, s.thrust], ['act', 'TOOT', tootLit, st.tootT > 0]]
      : [['arrows', 'CLAW', clawLit, false], ['act', cl.hold ? (pl.act === 'release' ? 'LET GO' : 'HOLDING') : 'GRAB', grabLit, !!cl.hold && pl.act !== 'release']];
    const n = chips.length, cw = (pw - 24 * z - (n - 1) * 6 * z) / n;
    chips.forEach(([k, lab, lit, held], i) => {
      const cx = px + 12 * z + i * (cw + 6 * z), cy = py + 26 * z, chh = 23 * z;
      ctx.fillStyle = lit ? (Math.sin(t * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : held ? 'rgba(143,227,176,0.85)' : 'rgba(255,255,255,0.12)';
      rr(cx, cy, cw, chh, chh / 2); ctx.fill();
      const kk = quiet ? '' : subduoKey(id, k);
      let fs = 12 * z;
      const str = (kk ? kk + ' ' : '') + lab;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      while (fs > 8 && ctx.measureText(str).width > cw - 8) { fs -= 0.5; ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; }
      text(str, cx + cw / 2, cy + chh / 2 + 0.5, fs, lit || held ? C.ink : '#ffffff', 'center', 'body');
    });
    ctx.globalAlpha = 1;
  }
  // the message line (gold help): between the level pill and the clock when it fits, else under the stretch pill
  const msg = st.waiting ? { text: 'Taking a break... press anything to dive on', col: '#ffffff', t: 1, life: 2 } : st.msg;
  if (msg) {
    let fs = big ? 20 : 14;
    const h = big ? 32 : 26, font = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.font = font(14);
    const left = 14 + ctx.measureText(levelCode(G.levelIndex) + ' · ' + G.level.def.name).width + 28 + 10, right = timeX0 - 10;
    ctx.font = font(fs);
    let w = ctx.measureText(msg.text).width + 30, cx = W / 2 + 40, y = 12;
    if (w <= right - left) cx = clamp(cx, left + w / 2, right - w / 2);
    else {
      cx = W / 2; y = big ? 96 : 80;
      while (w > W - 40 && fs > 11) { fs--; ctx.font = font(fs); w = ctx.measureText(msg.text).width + 30; }
    }
    ctx.globalAlpha = clamp((msg.life - msg.t) / 0.3, 0, 1);
    pill(cx, y, w, h, 'center'); text(msg.text, cx, y + h / 2 + 0.5, fs, msg.col, 'center', 'body'); ctx.globalAlpha = 1;
  }
  if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
  // prompts: the steerer's over the dome, the grabber's by the claw. A hint bubble replaces that player's prompt.
  const fs = 14 * z, yMax = H - Math.round(56 * z) - 18;
  const spot = id => (id === st.steer ? { x: s.x - st.cam.x - 30, y: s.y - 62 - 8 * z, side: -1 } : { x: cl.x - st.cam.x + 24, y: cl.y + (cl.y > s.y + 40 ? -34 : 40) + 10 * z, side: 1 });
  const place = (id, w, h) => {
    const sp = spot(id);
    let top = sp.y - h;
    // (1-player mode: keep clear of the computer's speech bubble, which sits over the dome)
    if (typeof CPU === 'object' && cpuSolo() && !cpuOn(id)) { const cb = CPU.bubbles[1 - id]; if (cb && cb.t > 0 && Math.abs(sp.x - ps[1 - id].x) < w + 80 && sp.y > ps[1 - id].y - 80) top = Math.min(top, ps[1 - id].y - 22 - (big ? 30 : 22) - 8 - h); }
    let x = clamp(sp.side > 0 ? sp.x - 10 : sp.x - w + 30, 4, W - w - 4), y = clamp(top, big ? 96 : 80, yMax - h);
    // the two prompts never sit on top of each other
    if (id === st.grab && place.last && Math.abs(place.last.y - y) < h + 4 && x < place.last.x + place.last.w && x + w > place.last.x) y = clamp(place.last.y + h + 6, big ? 96 : 80, yMax - h);
    if (id === st.steer) place.last = { x, y, w };
    return { x, y };
  };
  place.last = null;
  const say = (id, str, col, pulse) => {
    if (subduoQuiet(id) || st.hints[id] || !str) return;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, o = place(id, w, h);
    const sc = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(o.x + w / 2, o.y + h / 2); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(16,40,70,0.88)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, col, 'center', 'body');
    ctx.restore();
  };
  const Sd = st.steer, Gb = st.grab;
  // the steerer
  {
    const dx = pl.sx != null ? pl.sx - s.x : 0, dy = pl.sy != null ? pl.sy - s.y : 0, ar = subduoArrows(Sd, dx, dy, 24);
    let str = null, col = C.gold, pulse = false;
    if (pl.why === 'carry' && ar) { str = 'Back up ' + ar + ' to the sandy hole!'; pulse = true; }
    else if (pl.why === 'pull' && ar) { str = 'Make room ' + ar; pulse = true; }
    else if (pl.why === 'give' && ar) str = 'To Clammy! ' + ar;
    else if (pl.why === 'conch' && ar && Math.abs(dx) < 700) str = 'Find the conch ' + ar;
    else if (['boulder', 'log', 'ring', 'chest'].includes(pl.why) && ar && Math.abs(dx) < 480) str = 'Steer ' + ar;
    else if (pl.why === 'pearl' && ar && Math.abs(dx) < 260 && Math.abs(dy) > 50) { str = 'Pearl! ' + ar; col = '#ffe7a8'; }
    else if (pl.why !== 'none' && pl.why !== 'wait' && !ar && pl.why !== 'pearl' && !cl.hold && Math.hypot(s.vx, s.vy) > 60) { str = 'Slow down!'; col = '#ffe7a8'; }
    else if (!ar && pl.why !== 'none' && pl.why !== 'pearl' && Math.hypot(s.vx, s.vy) < 60) { str = 'Hold still for ' + NAMES[Gb]; col = '#d9f6ff'; }
    say(Sd, str, col, pulse);
  }
  // the grabber
  {
    let str = null, col = C.gold, pulse = false;
    const ar = pl.tx != null ? subduoArrows(Gb, pl.tx - cl.x, pl.ty - cl.y, 14) : '';
    if (pl.act === 'release') { str = 'Let go! ' + subduoKey(Gb, 'act'); pulse = true; }
    else if (cl.hold && cl.hold.kind === 'boulder') { str = Math.abs(cl.x - pl.tx) < 60 ? 'Lower it in ' + subduoKey(Gb, 'down') : 'Hold on tight!'; col = Math.abs(cl.x - pl.tx) < 60 ? C.gold : '#d9f6ff'; }
    else if (cl.hold && cl.hold.kind === 'log') { str = 'Pull it down ' + (ar || subduoKey(Gb, 'left') + ' ' + subduoKey(Gb, 'down')); pulse = true; }
    else if (cl.hold && cl.hold.kind === 'conch') { str = Math.hypot(cl.x - pl.tx, cl.y - pl.ty) < 120 ? 'Into her mouth! ' + ar : 'Carry it to Clammy'; col = '#ffe7a8'; }
    else if (can && (pl.act === 'grab' || can.kind === 'pearl')) { str = 'Grab! ' + subduoKey(Gb, 'act'); pulse = true; }
    else if (tipNear && ar && !cl.hold) { str = 'Claw ' + ar; col = '#ffe7a8'; }
    say(Gb, str, col, pulse);
  }
  for (const id of [0, 1]) {
    const hn = st.hints[id];
    if (!hn) continue;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(hn.text).width + 22 * z, h = fs + 14 * z, o = place(id, w, h);
    ctx.globalAlpha = clamp((hn.life - hn.t) / 0.3, 0, 1);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5;
    rr(o.x, o.y, w, h, h / 2); ctx.fill(); ctx.stroke();
    text(hn.text, o.x + w / 2, o.y + h / 2 + 0.5, fs, C.ink, 'center', 'body');
    ctx.globalAlpha = 1;
  }
}

/* ---------- sounds ---------- */
Sfx.extra.subduoToot = function (p) { this.tone(392 * p, 0.18, 'square', 0.035); this.tone(523 * p, 0.22, 'square', 0.035, null, 0.2); };
Sfx.extra.subduoSnap = function (p) { this.tone(900 * p, 0.05, 'square', 0.02, 600 * p); };
Sfx.extra.subduoGrab = function (p) { this.tone(700 * p, 0.06, 'square', 0.03, 420 * p); this.tone(300, 0.1, 'triangle', 0.03, null, 0.04); };
Sfx.extra.subduoLetGo = function (p) { this.tone(420 * p, 0.12, 'triangle', 0.035, 760 * p); };
Sfx.extra.subduoPearl = function () { [1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.04, null, i * 0.05)); };
Sfx.extra.subduoShell = function () { [880, 1175].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.04, null, i * 0.06)); };
Sfx.extra.subduoBonk = function () { this.tone(180, 0.22, 'sine', 0.08, 110); this.tone(620, 0.3, 'sine', 0.02, 1200, 0.05); };
Sfx.extra.subduoBoop = function () { this.tone(520, 0.12, 'sine', 0.05, 780); };
Sfx.extra.subduoBoing = function () { this.tone(260, 0.25, 'sine', 0.05, 520); };
Sfx.extra.subduoPlop = function () { this.tone(220, 0.2, 'sine', 0.08, 90); [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.045, null, 0.15 + i * 0.07)); };
Sfx.extra.subduoThud = function () { this.tone(110, 0.25, 'sine', 0.08, 60); };
Sfx.extra.subduoCreak = function () { this.tone(140 + Math.random() * 40, 0.12, 'sawtooth', 0.012, 110); };
Sfx.extra.subduoFloat = function () { this.tone(300, 0.4, 'sine', 0.04, 700); };
Sfx.extra.subduoLogDown = function () { [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.045, null, 0.1 + i * 0.07)); };
Sfx.extra.subduoClam = function () { this.tone(200, 0.6, 'sine', 0.05, 120); [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.045, null, 0.3 + i * 0.08)); };
Sfx.extra.subduoHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.subduoClip = function () { this.tone(1200, 0.05, 'square', 0.03); [659, 784, 1047].forEach((f, i) => this.tone(f, 0.13, 'triangle', 0.05, null, 0.06 + i * 0.08)); };
Sfx.extra.subduoSwap = function () { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, 0.1 + i * 0.07)); };
Sfx.extra.subduoHop = function (p) { this.tone(300 * p, 0.2, 'sine', 0.05, 640 * p); };
Sfx.extra.subduoChest = function () { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.subduoFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.11)); };
