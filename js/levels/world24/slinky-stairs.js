/* Pip & Bo - Level 24-3 Slinky Stairs (team, World 24 Toy Box Town). */
'use strict';

/* ===== 24-3 Slinky Stairs (mode 'slinky', World 24 "Toy Box Town", team, Gavyn's pick) =====
   Gavyn's idea: "ride slinkies down a tall shelf. One sets the flip timing, the other steers to land on the next step and
   not off the edge." A big rainbow slinky flops end over end down a staircase of toy steps (book stacks, toy blocks,
   pillows, a toy truck, a little lift) that zig-zags left and right down a tall bedroom shelf. Seen from the side; the
   camera scrolls DOWN with the slinky. The mode owns the tick, the camera, the whole picture and the HUD (def.ownStep +
   def.ownHUD + def.noFalls); the engine grid is empty apart from the two spawns. Positions are world px (x 0..960 across,
   y grows down; each flight starts near y 160). Nothing is scary and nobody gets hurt.
   Both ride the slinky: THE FLIPPER holds its back end, THE STEERER rides its front end.
   THE FLIPPER sets the flop. Hold the action (▲ / jump works too, controller A or X) to stretch: the FLOP METER (bottom
   middle) swings from short to far and back (SLK.rise s each way), and the slinky stretches with it. Let go to flop: the
   front end flies off in a little arc, and how far depends on where the meter was when you let go. The meter shows a
   green band: let go in it and the slinky lands on the next step (it's worked out for where the slinky stands, the step
   it's aiming at, and where a moving step will be when it lands). A hold has to start with a fresh press made since
   the last flop (so pressing early while the slinky is still landing or boinging back is fine; holding the button down
   for ever never flops). On a springy step the flop is a big one (SLK.springK further, higher).
   THE STEERER points and steers. On a step, ◀ ▶ point the slinky the way to flop (an arrow over it; it stays pointed
   until changed). A flop always goes the way the slinky points, so the flipper can't go anywhere alone. In the air,
   ◀ ▶ lean the flying end to fine-tune the landing (about ±40 px over a whole flop) and to catch stars. ▼ (or the steerer's action) is
   STICK: pressed just as the slinky touches down (SLK.perfEarly s before to SLK.perfLate s after) it's a "Perfect!"
   (counted; no sliding, no wobble). Pressing early, or mashing, doesn't count: only a flop with ONE press in the air
   can be a Perfect (a press after touchdown counts only if there was none in the air), and a press only counts after
   SLK.stickCool s without one. Holding ▼ as it lands sticks it too (no wobble, no slide), just not "Perfect".
   SOFT TROUBLE (never hurts, only counted as a "Whoa" for the medal):
     a flop that would land nowhere (off the edge, too short, too far) is a "Whoa!": the slinky boings back up to the
       step it flopped from;
     landing near a step's edge, or anywhere on a TINY step (a dice), wobbles ("Wobble!") for SLK.teeterT s: ▼ (or the
       steerer's action) saves it ("Phew! Stuck it!"), otherwise it topples off ("Whoa!", back to the step before);
     SLIPPERY steps (a shiny tin lid) slide the slinky along after landing; hold ▼ to stop, or it wobbles at the edge;
     MARBLE steps: a glass marble rolls along the step; landing on it is a "Bonk! A marble!" (back to the step before),
       so wait for it to roll by. It stops rolling while the slinky stands on its step;
     SQUISHY PILLOWS sink while the slinky stands on them (SLK.pillowT s, a ring shows the time left): flop on before
       it's flat or it's a "Squish!" back to the step before. This is the only timer, and a gentle one;
     the shelf's sides bounce the flying end back ("Boing!");
     a flop only lands on the step it left or the next one (both ways on a branch): the steps further down aren't solid
       yet (the slinky flies in front of them), so too big a flop is a whoa, never a short cut.
   Other steps: SPRINGY (a spring pad: the next flop is a big one), MOVING (a toy truck rolling side to side, a little
   lift going up and down: the green band moves with it), and BRANCHES: a step with two next steps, one each side.
   The steerer picks the way by pointing (the more-stars way is trickier; the safe way has fewer stars).
   Each flight ends on a big landing (a dictionary, a play mat, a pillow pile, the open toy box); then Pip and Bo swap
   jobs. Flights (roomWord 'Flight', room def `flip` = who flips): Bookshelf Steps, Toy Block Tower, Pillow Pile, Down to
   the Rug (it ends in the toy box). Pip flips 1 and 3.
   STARS: placed along the arcs between steps (the steerer catches them with the flying end), plus rainbow bonus stars
   (worth SLK.bonusVal) a little off the arc that need a lean.
   GOLD HELP (always announced in the gold message line, and only while both players are pressing things and neither
   is mashing: more than about SLK.mashMax / 2 fresh presses a second):
     SLK.goldGuide whoas aiming at the same step (or SLK.goldGuideSec in one flight): a gold guide (gold dots show where
       the slinky will land if you let go now) for the rest of that flight;
     SLK.goldSticky whoas at the same step: a gold sticky step (it catches the slinky SLK.catchGold px further out, and
       SLK.catchGrow px more for every whoa there after that, up to SLK.catchMax; it never wobbles or slides, a
       marble there naps at the far end, a pillow there stops sinking);
     a pillow squished SLK.goldPillow times turns gold and stops sinking;
     SLK.compassT s on one step without landing on a new one, while both play and the steerer presses ◀ ▶: a gold
       compass (the slinky points the right way by itself while the steerer lets go of ◀ ▶) and the gold guide.
   IDLE: when no person has pressed anything for SLK.idleWait s while the slinky stands on a step, it waits ("Taking a
   break") and the clock stops (G.time is wound back, so test loops must count steps, not G.time).
   Medal by time, whoas, stars, perfects and gold help (MODES.slinky.medals, js/medals.js): Gold at <= 3:30 with <= 3
   whoas, 70% of the stars, 30 Perfect landings and <= 1 gold help; Silver at <= 5:30 with <= 12 whoas; else Bronze.
   Results tiles: Stars, Perfect landings, Whoas (the engine shows the time).
   Room def: { title, flip: 0|1, look: 'books'|'blocks'|'pillows'|'rug', tip, act, signs: [[x, y, text, role, alt]],
     course: [tokens] }. A token is 'kind dx dy [w] [key=value ...]': a step whose centre is dx px across and dy px down
   from the previous one (the first token, 'start x y', is absolute). Kinds: start book block tiny spring slip car lift
   marble pillow goal. Keys: stars=n (stars on the way to this step, default 2), bonus=1 bx=px (a bonus star on the way,
   bx px off the arc), ax=px / ay=px per=s ph=rad (a moving step), per=s (a marble's roll), way=stars|safe (the first
   step of a branch path). ['split', [left path tokens], [right path tokens]] makes a branch from the previous step; the
   token after it is placed from the right path's last step and both paths lead to it. Sign text: {F} the flipper's
   name, {R} the steerer's. A sign that tells one role what to press names it ('F' or 'R') and gives an alt text, shown
   instead in 1-player mode when the computer plays that role (it says what the computer does).
   MODES.slinky.plan(st) is the one place that works out what's needed (the prompts, the HUD, the gold guide and the
   computer brain read it). Every global is prefixed slk / SLK / slinky (and Sfx.extra.slinky*); all state lives in
   G.mst. Rules never use Math.random (only the looks do: sparkles, confetti). */
const SLK = {
  // the flop: launch speeds (px/s) and gravity
  vy0: 380, g: 1500, vxMin: 110, vxMax: 520, springVy: 600, springK: 1.22,
  // the meter: s from short to far
  rise: 1.2,
  // the steerer's lean in the air (px/s², px/s)
  leanA: 340, leanV: 65,
  // the shelf's sides
  wallL: 44, wallR: 916,
  // landings
  edge: 16, tinyW: 64, perfEarly: 0.2, perfLate: 0.12, stickCool: 0.3, teeterT: 0.95, followT: 0.42, boingT: 1.15,
  slipK: 0.6, slipDec: 230, slipBrake: 1700,
  pillowT: 7, pillowSink: 20, marbleR: 11, marbleHit: 30,
  starR: 30, bonusVal: 3,
  // the camera
  camLead: 205, camFly: 250, camTop: -40,
  // gold help
  goldGuide: 2, goldGuideSec: 4, goldSticky: 3, goldPillow: 2, compassT: 20, activeT: 8, catchGold: 40, catchGrow: 20, catchMax: 160,
  holdHintT: 6, idleWait: 12, winT: 3.4, finT: 4.8,
  // a player pressing more than about mashMax / 2 fresh presses a second (a 2 s fading count) is mashing, not playing
  mashMax: 13,
};
const SLK_KIND = {
  start: { w: 170, h: 44 }, book: { w: 150, h: 40 }, block: { w: 140, h: 50 }, tiny: { w: 52, h: 40 },
  spring: { w: 104, h: 34 }, slip: { w: 180, h: 26 }, car: { w: 130, h: 34 }, lift: { w: 130, h: 22 },
  marble: { w: 186, h: 44 }, pillow: { w: 170, h: 40 }, goal: { w: 400, h: 70 },
};
const SLK_RAINBOW = ['#ff5f6d', '#ff9f43', '#ffd23f', '#6fd88a', '#4fb5ff', '#b48cff'];
const SLK_TOYS = ['#ff5f6d', '#ffc43d', '#4fb5ff', '#6fd88a', '#b48cff', '#ff8fc8'];
const slkLerp = (a, b, u) => a + (b - a) * u;
const slkSmooth = u => u * u * (3 - 2 * u);

/* ---------- the course: tokens -> steps, stars, signs ---------- */
function slkCompile(def) {
  const S = SLK, fl = def.flip || 0;
  const name = s => String(s).replace(/\{F\}/g, NAMES[fl]).replace(/\{R\}/g, NAMES[1 - fl]);
  const c = { look: def.look || 'books', steps: [], stars: [], signs: [], bottom: 0 };
  const mk = (tok, prev) => {
    const parts = tok.trim().split(/\s+/), kind = parts[0], K = SLK_KIND[kind] || SLK_KIND.book;
    const nums = [], o = {};
    for (const q of parts.slice(1)) { if (q.includes('=')) { const [k, v] = q.split('='); o[k] = isNaN(+v) ? v : +v; } else nums.push(+q); }
    const w = nums[2] || K.w;
    const cx = prev ? prev.cx + nums[0] : nums[0], y = prev ? prev.y + nums[1] : nums[1];
    const s = { i: c.steps.length, kind, cx, w, x0: cx - w / 2, x1: cx + w / 2, y, h: K.h, next: [], stars: o.stars == null ? 2 : o.stars,
      bonus: o.bonus || 0, bx: o.bx || 0, ax: o.ax || 0, ay: o.ay || 0, per: o.per || 4, ph: o.ph || 0, way: o.way || null,
      gold: false, whoas: 0, squish: 0, sink: 0, dx: 0, dy: 0, ty: y, typ: y, mph: c.steps.length * 1.3, mx: 0, col: c.steps.length };
    c.steps.push(s);
    return s;
  };
  let pend = [], prev = null;
  const link = s => { for (const q of pend) q.next.push(s.i); pend = [s]; };
  for (const tok of def.course || []) {
    if (Array.isArray(tok) && tok[0] === 'split') {
      const base = prev, ends = [];
      let last = base;
      for (const path of [tok[1], tok[2]]) {
        pend = [base]; let p = base;
        for (const t of path) { const s = mk(t, p); link(s); p = s; }
        ends.push(p); last = p;
      }
      pend = ends; prev = last;
      continue;
    }
    const s = mk(tok, prev);
    link(s); prev = s;
  }
  // stars along each hop's arc (from step centre to step centre, the way a good flop goes), and the bonus stars
  for (const a of c.steps) for (const ni of a.next) {
    const b = c.steps[ni], spring = a.kind === 'spring', vy0 = spring ? S.springVy : S.vy0, h = b.y - a.y;
    const tl = (vy0 + Math.sqrt(vy0 * vy0 + 2 * S.g * Math.max(0, h))) / S.g, vx = (b.cx - a.cx) / tl;
    const at = u => { const tt = u * tl; return { x: a.cx + vx * tt, y: a.y - 2 - vy0 * tt + S.g * tt * tt / 2 - 20 }; };
    const n = b.stars;
    for (let k = 0; k < n; k++) { const p = at((k + 1) / (n + 1)); c.stars.push({ x: p.x, y: p.y, kind: 'star', got: false, t: 0, hop: [a.i, b.i] }); }
    if (b.bonus) { const p = at(0.5); c.stars.push({ x: p.x + b.bx, y: p.y - 6, kind: 'bonus', got: false, t: 0, hop: [a.i, b.i] }); }
  }
  for (const [x, y, t, role, alt] of def.signs || []) c.signs.push({ x, y, text: name(t), who: role === 'F' ? fl : role === 'R' ? 1 - fl : -1, alt: alt ? name(alt) : null });
  c.bottom = Math.max(...c.steps.map(s => s.y + s.h + (s.ay || 0)));
  c.starsAll = c.stars.reduce((n, q) => n + (q.kind === 'bonus' ? S.bonusVal : 1), 0);
  return c;
}
// where a step is at rule time t (moving steps move; a pillow sinks)
function slkPosAt(s, t) {
  const dx = s.ax ? s.ax * Math.sin(t * Math.PI * 2 / s.per + s.ph) : 0, dy = s.ay ? s.ay * Math.sin(t * Math.PI * 2 / s.per + s.ph) : 0;
  return { x0: s.x0 + dx, x1: s.x1 + dx, y: s.y + dy + s.sink * SLK.pillowSink, dx, dy };
}
// the marble's x on its step at rule time t (it rolls end to end; s.mlag is the time it stood still while the slinky
// stood on its step, so the plan, the green band and the brain all see where it really is)
function slkMarbleAt(s, t) {
  const u = (((t + (s.mlag || 0)) / s.per + s.mph) % 2 + 2) % 2, k = u < 1 ? u : 2 - u;
  return s.x0 + s.dx + 16 + (s.w - 32) * slkSmooth(k);
}

// each player's own keys, for prompts and the HUD (a player with a controller is shown its buttons)
function slkKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'down') return pad || touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'left') return pad || touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'right') return pad || touch ? '▶' : id === 0 ? 'D' : '→';
  if (what === 'lr') return pad || touch ? '◀ ▶' : id === 0 ? 'A D' : '← →';
  if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
  return '';
}
// 1-player mode: the computer's own job gets no key hints or prompts (it knows its job)
const slkQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

/* ---------- a flight (one room) ---------- */
function slkRoom(st, L, k) {
  const def = L.def;
  st.k = k; st.flip = def.flip || 0; st.steer = 1 - st.flip; st.title = def.title || '';
  st.c = slkCompile(def);
  st.stats.roomT[k] = null;
  const s0 = st.c.steps[0], n0 = st.c.steps[s0.next[0]];
  st.s = { state: 'rest', on: 0, rx: s0.w / 2, from: 0, fromRx: s0.w / 2, point: n0 && n0.cx < s0.cx ? -1 : 1, hold: false, m: 0, mv: 1, lastM: 0,
    holdT: 0, slide: 0, sinkT: 0, restT: 0, landPerf: false, landT: -9, fly: null, fol: null, tee: null, boing: null, win: null, squash: 0 };
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null;
  st.guide = false; st.compass = false; st.secWhoas = 0; st.stuckT = 0; st.t = 0; st.segStart = G.time;
  st.inT = [G.time, G.time]; st.lrT = [-99, -99]; st.inBits = [0, 0]; st.mash = [0, 0]; st.relT = [[-9, -9, -9, -9, -9], [-9, -9, -9, -9, -9]]; st.rt = 0; st.personT = G.time; st.waiting = false;
  st.pressT = -9; st.launchT = G.time; st.prevHold = false; st.stick = { press: -9, cool: -9, prev: false, late: 0 };
  st.cam = s0.y - SLK.camLead;
  slkMoveSteps(st);
  st.plan = slkPlan(st);
  slkMirror(st);
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function slkStep(st, dt) {
  if (!st.c) return;
  const ps = G.players, S = st.s;
  for (const q of [0, 1]) {
    const i = ps[q].input;
    if (i.left || i.right || i.jump || i.down || i.up || i.act || ps[q].pendingJump || ps[q].pendingAct) st.inT[q] = G.time;
    if (!cpuOn(q) && (i.left || i.right || i.jump || i.down || i.up || i.act)) st.personT = G.time;
    if (i.left || i.right) st.lrT[q] = G.time;
    // fresh presses (of a key that was up at least 0.05 s), counted with a 2 s fade: mashing
    const keys = [i.left, i.right, i.down, i.up || i.jump, i.act], rel = st.relT[q];
    let n = 0;
    keys.forEach((k, j) => {
      if (k && !(st.inBits[q] >> j & 1) && st.rt - rel[j] >= 0.05) n++;
      if (!k && (st.inBits[q] >> j & 1)) rel[j] = st.rt;
    });
    st.inBits[q] = keys.reduce((m, k, j) => m | (k ? 1 << j : 0), 0);
    st.mash[q] = st.mash[q] * Math.exp(-dt / 2) + n;
  }
  st.rt += dt;
  slkActLabels(st);
  // nobody (no person) has pressed anything for a while: the slinky waits on its step and the clock stops
  const people = [0, 1].filter(q => !cpuOn(q));
  st.waiting = S.state === 'rest' && G.introT <= 0 && people.length > 0 && G.time - st.personT > SLK.idleWait;
  if (st.waiting) G.time -= dt;
  if (G.introT > 0 || st.waiting) {
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
    // (a stretch held down through the intro card or a break starts as soon as it's over)
    st.prevHold = false; st.stick.prev = slkStickDown(st);
    slkLooks(st, dt); slkCam(st, dt); slkMirror(st); return;
  }
  st.t += dt;
  slkMoveSteps(st);
  // the flipper's hold (a fresh press starts a stretch) and the steerer's stick presses
  const hold = slkHoldDown(st);
  if (hold && !st.prevHold) st.pressT = G.time;
  st.prevHold = hold;
  const stk = slkStickDown(st), K = st.stick;
  if (stk && !K.prev) {
    // (every fresh press in the air is counted: only a flop with just one press can be a Perfect, so tapping ▼ on a
    // beat all the way down never is)
    if (S.state === 'fly') S.fly.presses++;
    if (G.time >= K.cool) { K.press = G.time; slkLatePerfect(st); }
    K.cool = G.time + SLK.stickCool;
  }
  K.prev = stk;
  if (S.state === 'rest') slkRestTick(st, dt, hold);
  else if (S.state === 'fly') slkFlyTick(st, dt);
  else if (S.state === 'follow') slkFollowTick(st, dt);
  else if (S.state === 'teeter') slkTeeterTick(st, dt);
  else if (S.state === 'boing') slkBoingTick(st, dt);
  else if (S.state === 'win') { if (slkWinTick(st, dt)) return; }
  for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
  st.plan = slkPlan(st);
  if (S.state === 'rest') { slkHelp(st, dt); slkNudges(st); }
  slkLooks(st, dt);
  slkCam(st, dt);
  slkMirror(st);
}
const slkHoldDown = st => { const i = G.players[st.flip].input; return !!(i.act || i.jump || i.up); };
const slkStickDown = st => { const i = G.players[st.steer].input; return !!(i.down || i.act); };
// both players have pressed something lately and neither is mashing (gold help only comes while both are playing)
const slkMashing = (st, q) => !cpuOn(q) && st.mash[q] > SLK.mashMax;
const slkBothActive = st => G.time - st.inT[0] < SLK.activeT && G.time - st.inT[1] < SLK.activeT && !slkMashing(st, 0) && !slkMashing(st, 1);
function slkMoveSteps(st) {
  for (const s of st.c.steps) {
    const p = slkPosAt(s, st.t);
    s.typ = s.ty; s.dx = p.dx; s.dy = p.dy; s.ty = p.y;
    // (a gold marble naps: it rolls off to the far end of its step and stays there)
    if (s.kind === 'marble' && s.gold) s.mx = approach(s.mx, s.x1 + s.dx - 16, 80 * DT);
    else if (s.kind === 'marble') { if (!(st.s && st.s.on === s.i && st.s.state !== 'fly')) s.mx = slkMarbleAt(s, st.t); else s.mlag = (s.mlag || 0) - DT; }
  }
}
// the slinky's spot on its step (world px)
function slkBase(st) {
  const S = st.s, s = st.c.steps[S.on];
  return { x: s.x0 + s.dx + S.rx, y: s.ty, s };
}

function slkRestTick(st, dt, hold) {
  const S = st.s, s = st.c.steps[S.on], iR = G.players[st.steer].input;
  S.restT += dt;
  // the steerer points the way (the gold compass does it by itself)
  const dir = (iR.right ? 1 : 0) - (iR.left ? 1 : 0);
  if (dir && dir !== S.point) { S.point = dir; Sfx.play('slinkyPoint'); }
  else if (!dir && st.compass && st.plan && st.plan.want && st.plan.want !== S.point) S.point = st.plan.want;
  // sliding on a slippery step: ▼ (or the steerer's action) brakes
  if (S.slide) {
    const brake = iR.down || iR.act;
    S.slide = approach(S.slide, 0, (brake ? SLK.slipBrake : SLK.slipDec) * dt);
    S.rx = clamp(S.rx + S.slide * dt, 0, s.w);
    if ((S.rx < SLK.edge && S.slide < 0) || (S.rx > s.w - SLK.edge && S.slide > 0)) { S.slide = 0; slkStartTeeter(st); return; }
  }
  // a squishy pillow sinks while you stand on it
  if (s.kind === 'pillow' && !s.gold && S.on !== 0) {
    S.sinkT -= dt;
    s.sink = clamp(1 - S.sinkT / SLK.pillowT, 0, 1);
    if (S.sinkT < 2.2 && !S.pillowSaid) { S.pillowSaid = true; Sfx.play('slinkyCreak'); slkHint(st, st.flip, 'Quick! The pillow is sinking. Flop!', 2.4); }
    if (S.sinkT <= 0) {
      s.squish++;
      slkWhoa(st, 'Squish! Too slow', s);
      if (s.squish >= SLK.goldPillow && !s.gold && slkBothActive(st)) {
        s.gold = true; st.stats.helps++; s.sink = 0;
        slkMsg(st, 'Gold pillow! It won\'t sink any more', C.gold, 4); Sfx.play('slinkyHelp');
      }
      slkStartBoing(st, S.from, S.fromRx);
      return;
    }
  }
  // the stretch: a fresh press starts it, letting go flops
  if (!S.hold) {
    if (hold && !S.slide && (G.time - st.pressT < 0.5 || st.pressT > st.launchT)) { S.hold = true; S.m = 0; S.mv = 1; S.holdT = 0; S.tickT = 0; Sfx.play('slinkyStretch'); }
    return;
  }
  S.holdT += dt;
  S.m += S.mv * dt / SLK.rise;
  if (S.m >= 1) { S.m = 2 - S.m; S.mv = -1; Sfx.play('slinkyTick'); }
  else if (S.m <= 0) { S.m = -S.m; S.mv = 1; Sfx.play('slinkyTick'); }
  if ((S.tickT -= dt) <= 0) { S.tickT = 0.11; Sfx.play('slinkyWiggle', S.m); }
  if (S.holdT > SLK.holdHintT) slkHintOnce(st, 'letgo' + S.on, st.flip, 'Let go of ' + slkKey(st.flip, 'act') + ' to flop!');
  if (!hold) slkLaunch(st);
}
function slkLaunch(st) {
  const S = st.s, b = slkBase(st), s = b.s, spring = s.kind === 'spring';
  const v = (SLK.vxMin + S.m * (SLK.vxMax - SLK.vxMin)) * (spring ? SLK.springK : 1);
  const pl = st.plan || slkPlan(st);
  S.fly = { ex: b.x + S.point * 4, ey: b.y - 2, vx: S.point * v, vy: -(spring ? SLK.springVy : SLK.vy0), lv: 0, t: 0, eyPrev: b.y - 2, presses: 0,
    target: pl.tIdx, from: S.on, fromRx: S.rx, spring, m: S.m, dir: S.point };
  S.lastM = S.m; S.hold = false; S.state = 'fly'; S.squash = 1; st.launchT = G.time;
  st.stats.flops++;
  Sfx.play(spring ? 'slinkySpring' : 'slinkyFlop');
  if (spring) slkPop(st, b.x, b.y - 80, 'Boing!', '#ffe7a8', 24);
}
function slkFlyTick(st, dt) {
  const D = SLK, S = st.s, F = S.fly, iR = G.players[st.steer].input;
  F.t += dt;
  // the steerer leans the flying end
  const dir = (iR.right ? 1 : 0) - (iR.left ? 1 : 0);
  F.lv = approach(F.lv, dir * D.leanV, D.leanA * dt);
  F.vy += D.g * dt;
  F.eyPrev = F.ey;
  F.ex += (F.vx + F.lv) * dt; F.ey += F.vy * dt;
  // the shelf's sides bounce it back
  if (F.ex < D.wallL || F.ex > D.wallR) {
    const left = F.ex < D.wallL;
    F.ex = left ? D.wallL : D.wallR; F.vx = (left ? 1 : -1) * Math.abs(F.vx) * 0.45; F.lv = 0;
    if (G.time - (F.wallT || -9) > 0.3) { F.wallT = G.time; Sfx.play('slinkyWall'); slkPop(st, F.ex, F.ey - 50, 'Boing!', '#ffe7a8', 20); }
  }
  // stars (the steerer on the flying end catches them)
  for (const q of st.c.stars) {
    if (q.got) continue;
    if (Math.hypot(q.x - F.ex, q.y - (F.ey - 18)) > D.starR) continue;
    q.got = true; q.t = 0;
    const n = q.kind === 'bonus' ? D.bonusVal : 1;
    st.stats.stars += n;
    Sfx.play(q.kind === 'bonus' ? 'slinkyBonus' : 'slinkyStar');
    if (q.kind === 'bonus') slkPop(st, q.x, q.y - 26, 'Rainbow star! +' + n, '#ffffff', 22);
    for (let i = 0; i < 7; i++) { const a = Math.random() * Math.PI * 2; slkPart(st, q.x, q.y, Math.cos(a) * 110, Math.sin(a) * 110, 0.5, q.kind === 'bonus' ? SLK_RAINBOW[i % 6] : C.gold, 3.5, 0, 'spark'); }
  }
  // landing: the first step top it comes down onto
  if (F.vy > 0) {
    for (const s of st.c.steps) {
      if (!slkSolid(st, F.from, s) || F.eyPrev > s.typ + 1.5 || F.ey < s.ty) continue;
      const m = slkCatch(s);
      if (F.ex < s.x0 + s.dx - m || F.ex > s.x1 + s.dx + m) continue;
      slkLand(st, s);
      return;
    }
  }
  // nothing left below it to land on: a whoa
  const fromTop = st.c.steps[F.from].ty;
  if (F.ey > fromTop + 60 && !slkCanCatch(st)) {
    const tg = st.c.steps[F.target] || st.c.steps[F.from];
    slkWhoa(st, 'Whoa!', tg);
    slkStartBoing(st, F.from, F.fromRx);
  } else if (F.ey > st.c.bottom + 300 || F.t > 3) {
    slkWhoa(st, 'Whoa!', st.c.steps[F.target] || st.c.steps[F.from]);
    slkStartBoing(st, F.from, F.fromRx);
  }
}
// how far past its ends a step catches the slinky: a gold step catches SLK.catchGold px further out, and
// SLK.catchGrow px more for each whoa at it after it turned gold (up to SLK.catchMax)
const slkCatch = s => !s.gold ? 3 : Math.min(SLK.catchMax, SLK.catchGold + SLK.catchGrow * Math.max(0, s.whoas - SLK.goldSticky));
// a flop can only land on the step it left or the next one (both, on a branch): the steps further down aren't solid
// yet (the slinky passes in front of them), so a big flop can't skip the stairs
const slkSolid = (st, from, s) => s.i === from || st.c.steps[from].next.includes(s.i);
// could the flying end still come down on some step (with a little lean)?
function slkCanCatch(st) {
  const F = st.s.fly, g = SLK.g;
  for (const s of st.c.steps) {
    const h = s.ty - F.ey;
    if (h < -2 || !slkSolid(st, F.from, s)) continue;
    const tt = (-F.vy + Math.sqrt(Math.max(0, F.vy * F.vy + 2 * g * h))) / g;
    const px = F.ex + (F.vx + F.lv) * tt, m = 30 + Math.min(tt, 0.6) * SLK.leanV + (s.gold ? slkCatch(s) : 0);
    if (px > s.x0 + s.dx - m && px < s.x1 + s.dx + m) return true;
  }
  return false;
}
function slkLand(st, s) {
  const D = SLK, S = st.s, F = S.fly, iR = G.players[st.steer].input;
  const x0 = s.x0 + s.dx, lx = clamp(F.ex, x0 + 2, s.x1 + s.dx - 2);
  const perfect = F.presses === 1 && G.time - st.stick.press <= D.perfEarly;
  // a marble right where it lands: bonk, back up
  if (s.kind === 'marble' && !s.gold && Math.abs(s.mx - lx) < D.marbleHit) {
    slkPop(st, lx, s.ty - 70, 'Bonk! A marble!', '#ffffff', 24); Sfx.play('slinkyMarble');
    slkWhoa(st, null, s);
    slkStartBoing(st, F.from, F.fromRx, lx, s.ty);
    return;
  }
  const back = slkBackPos(st);
  S.fol = { t: 0, bx0: back.x, by0: back.y };
  S.state = 'follow'; S.on = s.i; S.rx = lx - x0; S.from = F.from; S.fromRx = F.fromRx;
  S.landT = G.time; S.landPerf = perfect; S.restT = 0; S.pillowSaid = false; S.squash = 1;
  S.landVx = F.vx + F.lv;
  st.stick.late = perfect || F.presses ? 0 : G.time + D.perfLate;
  const held = iR.down || iR.act;
  S.slide = s.kind === 'slip' && !s.gold && !perfect && !held ? (F.vx + F.lv) * D.slipK : 0;
  if (s.kind === 'pillow' && !s.gold) { S.sinkT = D.pillowT; s.sink = 0; }
  if (s.i !== F.from) { st.stuckT = 0; st.stats.landings++; }
  if (perfect) slkPerfect(st, lx, s.ty);
  else if (S.slide) { slkPop(st, lx, s.ty - 70, 'Slippy!', '#cfefff', 22); Sfx.play('slinkySlip'); slkHint(st, st.steer, 'Hold ' + slkKey(st.steer, 'down') + ' to stop sliding!', 2.6); }
  Sfx.play(s.kind === 'pillow' || s.kind === 'goal' ? 'slinkyPlump' : 'slinkyLand');
  for (let i = 0; i < 6; i++) slkPart(st, lx + (Math.random() - 0.5) * 24, s.ty - 2, (Math.random() - 0.5) * 120, -40 - Math.random() * 50, 0.5, 'rgba(255,255,255,0.85)', 3, 260, 'dot');
  if (s.kind === 'spring') Sfx.play('slinkySpring');
}
function slkPerfect(st, x, y) {
  st.stats.perfects++; st.s.landPerf = true; st.s.slide = 0;
  slkPop(st, x, y - 80, 'Perfect!', C.gold, 30); Sfx.play('slinkyPerfect');
  for (let i = 0; i < 12; i++) { const a = -Math.PI * (i / 11); slkPart(st, x, y - 10, Math.cos(a) * 170, Math.sin(a) * 170, 0.6, i % 2 ? C.gold : '#ffffff', 3.5, 120, 'spark'); }
  rumble(st.steer, 0.2, 0.4, 120);
}
// a stick press just after touchdown still counts as a perfect landing
function slkLatePerfect(st) {
  const S = st.s;
  if (st.stick.late && G.time <= st.stick.late && !S.landPerf && (S.state === 'follow' || S.state === 'rest' || S.state === 'teeter')) {
    st.stick.late = 0;
    const b = S.state === 'follow' ? slkFrontPos(st) : slkBase(st);
    slkPerfect(st, b.x, b.y);
    if (S.state === 'teeter') { S.state = 'rest'; S.tee = null; }
  }
}
function slkFollowTick(st, dt) {
  const S = st.s, f = S.fol;
  f.t += dt;
  if (f.t < SLK.followT) return;
  S.fol = null; S.state = 'rest'; S.squash = 0.8;
  const s = st.c.steps[S.on];
  if (s.kind === 'goal') { slkStartWin(st); return; }
  // near the edge, or a tiny step: it wobbles, unless it was stuck
  const near = S.rx < SLK.edge || S.rx > s.w - SLK.edge || s.w <= SLK.tinyW, iR = G.players[st.steer].input;
  if (near && !s.gold && !S.landPerf) {
    if (iR.down || iR.act || st.stick.press >= S.landT - SLK.perfEarly) { slkStuck(st); return; }
    slkStartTeeter(st);
  }
}
function slkStartTeeter(st) {
  const S = st.s, s = st.c.steps[S.on];
  S.state = 'teeter'; S.hold = false;
  S.tee = { t: 0, side: S.rx < s.w / 2 ? -1 : 1 };
  if (s.w <= SLK.tinyW) S.tee.side = S.landVx < 0 ? -1 : 1;
  const b = slkBase(st);
  slkPop(st, b.x, b.y - 80, 'Wobble!', '#ffe7a8', 24); Sfx.play('slinkyWobble');
  slkHint(st, st.steer, 'Press ' + slkKey(st.steer, 'down') + ' to stick it!', 2);
}
function slkStuck(st) {
  const S = st.s, s = st.c.steps[S.on], b = slkBase(st);
  S.state = 'rest'; S.tee = null; S.slide = 0;
  if (s.w > SLK.tinyW) S.rx = clamp(S.rx, SLK.edge + 2, s.w - SLK.edge - 2);
  slkPop(st, b.x, b.y - 80, 'Phew! Stuck it!', '#bff0c8', 22); Sfx.play('slinkyPhew');
}
function slkTeeterTick(st, dt) {
  const S = st.s, T = S.tee, iR = G.players[st.steer].input;
  T.t += dt;
  if (iR.down || iR.act) { slkStuck(st); return; }
  if (T.t >= SLK.teeterT) {
    const s = st.c.steps[S.on], b = slkBase(st);
    slkWhoa(st, 'Whoa!', s);
    slkStartBoing(st, S.from, S.fromRx, b.x + T.side * 30, b.y + 30);
  }
}
// a whoa (counted): the pop, the sound and the gold help it can bring
function slkWhoa(st, word, tg) {
  const S = st.s, fp = slkFrontPos(st);
  st.stats.whoas++; st.secWhoas++;
  if (tg) tg.whoas++;
  if (word) slkPop(st, fp.x, fp.y - 70, word, '#ffffff', 28);
  Sfx.play('slinkyWhoa');
  rumble(0, 0.3, 0.3, 150); rumble(1, 0.3, 0.3, 150);
  if (!slkBothActive(st)) return;
  if (tg && tg.whoas >= SLK.goldSticky && !tg.gold && tg.kind !== 'goal') {
    tg.gold = true; tg.sink = 0; st.stats.helps++;
    slkMsg(st, 'Gold sticky step! It catches the slinky now', C.gold, 4.4); Sfx.play('slinkyHelp');
  } else if (!st.guide && ((tg && tg.whoas >= SLK.goldGuide) || st.secWhoas >= SLK.goldGuideSec)) {
    st.guide = true; st.stats.helps++;
    slkMsg(st, 'Gold guide! The gold dots show where you\'ll land', C.gold, 4.4); Sfx.play('slinkyHelp');
  }
  if (S.state === 'fly' && st.secWhoas === 1 && st.k === 0) slkHint(st, st.flip, 'Let go when the marker is in the green!', 3);
}
// boing back up to a step (after a whoa): the whole slinky springs back over
function slkStartBoing(st, to, toRx, fx, fy) {
  const S = st.s, fp = slkFrontPos(st), bp = slkBackPos(st);
  S.boing = { t: 0, fx0: fx != null ? fx : fp.x, fy0: fy != null ? fy : fp.y, bx0: bp.x, by0: bp.y, to, toRx };
  S.state = 'boing'; S.fly = null; S.fol = null; S.tee = null; S.hold = false; S.slide = 0;
  Sfx.play('slinkyBack');
}
function slkBoingTick(st, dt) {
  const S = st.s, B = S.boing;
  B.t += dt;
  if (B.t < SLK.boingT) return;
  const old = st.c.steps[S.on];
  if (old && old.kind === 'pillow' && S.on !== B.to) old.sink = 0;
  S.on = B.to; S.rx = B.toRx; S.boing = null; S.state = 'rest'; S.restT = 0; S.squash = 1; S.landPerf = true;
  const s = st.c.steps[S.on];
  if (s.kind === 'pillow' && !s.gold) { S.sinkT = SLK.pillowT; s.sink = 0; S.pillowSaid = false; }
  Sfx.play('slinkyLand');
}

/* ---------- the big landing at the end of a flight: next flight, or the end ---------- */
function slkStartWin(st) {
  const S = st.s, b = slkBase(st), last = G.level.def.roomIndex >= G.level.def.roomCount - 1;
  S.state = 'win'; S.win = { t: 0, last, x: b.x, y: b.y };
  st.stats.flights++; st.stats.roomT[st.k] = G.time - st.segStart;
  slkPop(st, b.x, b.y - 120, last ? 'Into the toy box!' : 'Swap jobs!', C.gold, 32);
  Sfx.play(last ? 'slinkyFanfare' : 'slinkySwap');
  for (let i = 0; i < (last ? 80 : 40); i++) { const a = -Math.PI * (0.1 + 0.8 * Math.random()); slkPart(st, b.x, b.y - 30, Math.cos(a) * 280, Math.sin(a) * 280, 1.5, SLK_RAINBOW[i % 6], 4, 320, 'conf'); }
  rumble(0, 0.2, 0.5, 200); rumble(1, 0.2, 0.5, 200);
}
function slkWinTick(st, dt) {
  const w = st.s.win;
  w.t += dt;
  if (w.last && w.t > 1 && !w.cheer) { w.cheer = true; Sfx.play('slinkyCheer'); }
  if (w.t >= (w.last ? SLK.finT : SLK.winT)) {
    const L = G.level;
    if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return true; }
    if (!w.cleared) {
      w.cleared = true; st.stats.finishT = G.time;
      L.goal = { x: w.x, y: w.y - st.cam - 40 };
      levelClear();
      return true;
    }
  }
  return false;
}

/* ---------- gold help and the hints ---------- */
function slkHelp(st, dt) {
  // (it counts while both are playing (the computer always is) and the steerer is trying ◀ ▶, so a steerer who only
  // presses the action never gets pointed for)
  const on = q => cpuOn(q) || (G.time - st.inT[q] < SLK.activeT && !slkMashing(st, q));
  if (on(0) && on(1) && G.time - st.lrT[st.steer] < SLK.activeT) st.stuckT += dt;
  if (!st.compass && st.stuckT > SLK.compassT) {
    st.compass = true; st.stats.helps++;
    if (!st.guide) st.guide = true;
    slkMsg(st, 'Gold compass! The slinky points the way, gold dots show the landing', C.gold, 4.6); Sfx.play('slinkyHelp');
  }
}
// gentle lessons, once each flight, when they first matter
function slkNudges(st) {
  const S = st.s, pl = st.plan, F = st.flip, R = st.steer, tg = pl.target;
  if (!tg) return;
  if (S.restT > 0.6 && !S.hold) slkHintOnce(st, 'hold' + st.k, F, 'Hold ' + slkKey(F, 'act') + ' to stretch, let go in the green!');
  if (S.restT > 0.6 && !pl.pointOK && !pl.branch) slkHintOnce(st, 'point' + st.k, R, 'Point the way: ' + (pl.want > 0 ? slkKey(R, 'right') + ' ▶' : '◀ ' + slkKey(R, 'left')));
  if (pl.branch) slkHintOnce(st, 'branch' + S.on, R, 'Two ways! Point ◀ or ▶ to pick');
  if (tg.w <= SLK.tinyW) slkHintOnce(st, 'tiny', R, 'Tiny step! Press ' + slkKey(R, 'down') + ' as you land');
  if (tg.kind === 'slip') slkHintOnce(st, 'slip', R, 'Shiny lid! Press ' + slkKey(R, 'down') + ' as you land, or it slides');
  if (tg.kind === 'marble') slkHintOnce(st, 'marble', F, 'A marble! Let go when it has rolled away');
  if (tg.ax || tg.ay) slkHintOnce(st, 'move' + st.k, F, 'It moves! The green moves with it');
  if (st.c.steps[S.on].kind === 'pillow') slkHintOnce(st, 'pillow', F, 'Squishy pillow! Flop off before it sinks');
  if (st.c.steps[S.on].kind === 'spring') slkHintOnce(st, 'spring', F, 'Springy step! A big boing next');
}
function slkHintOnce(st, key, id, text) {
  if (st.hinted[key]) return;
  st.hinted[key] = true;
  slkHint(st, id, text, 3.4);
}

/* ---------- what the team needs to do right now (the prompts, the HUD and the computer read this) ----------
   target / tIdx: the step to land on next (on a branch: the way the slinky points); want: the way the steerer should
   point (1 / -1; on a branch the brain's pick); pointOK; branch: the two next steps or null; pick: the brain's way on a
   branch; zone: { lo, hi, mc, tl, dir } the meter band that lands on the target if let go now (mc: the middle to aim
   at); inZone; wait: 'marble' | 'far' | 'slide' | null (don't let go yet); lean (in the air: -1 | 0 | 1 toward the
   landing, or a bonus star); px: where it will land with no more lean; ttd: s to touchdown; stick: press ▼ now;
   save: hold ▼ now (wobbling or sliding). */
function slkPlan(st) {
  const S = st.s, c = st.c;
  const out = { tIdx: -1, target: null, want: 0, pointOK: true, branch: null, pick: null, zone: null, inZone: false, wait: null,
    lean: 0, px: 0, ttd: 9, stick: false, save: false, aimX: 0 };
  if (!c || !S) return out;
  if (S.state === 'fly') {
    const F = S.fly, tg = c.steps[F.target];
    if (!tg) return out;
    out.target = tg; out.tIdx = tg.i;
    const g = SLK.g, h = tg.ty - F.ey;
    const tt = h >= -2 || F.vy > 0 ? (-F.vy + Math.sqrt(Math.max(0, F.vy * F.vy + 2 * g * Math.max(h, -F.vy * F.vy / (2 * g) + 0.01)))) / g : 0;
    const coast = Math.sign(F.lv) * Math.min(Math.abs(F.lv) * tt, F.lv * F.lv / (2 * SLK.leanA));
    out.ttd = tt; out.px = F.ex + F.vx * tt + coast;
    const p = slkPosAt(tg, st.t + tt), cx = (p.x0 + p.x1) / 2;
    let aim = tg.kind === 'slip' ? clamp(cx - Math.sign(F.vx) * tg.w * 0.18, p.x0 + 30, p.x1 - 30) : cx;
    if (tg.kind === 'marble') { const mx = slkMarbleAt(tg, st.t + tt); if (Math.abs(mx - aim) < 50) aim = mx < cx ? Math.min(p.x1 - 22, mx + 60) : Math.max(p.x0 + 22, mx - 60); }
    // a bonus star on this hop, still ahead: lean for it first
    for (const q of c.stars) {
      if (q.got || q.kind !== 'bonus' || q.hop[1] !== tg.i || q.hop[0] !== F.from) continue;
      const ahead = (q.x - F.ex) * Math.sign(F.vx) > -6 && q.y > F.ey - 140;
      if (ahead && Math.abs(F.ey - 18 - q.y) < 90) { aim = q.x; out.bonus = q; }
    }
    out.aimX = aim;
    const err = aim - (out.bonus ? F.ex + F.vx * Math.max(0, (q => Math.abs(q.x - F.ex) / Math.max(40, Math.abs(F.vx)))(out.bonus)) : out.px);
    out.lean = Math.abs(err) > 7 ? Math.sign(err) : 0;
    out.stick = tt < 0.075 && out.px > p.x0 - 6 && out.px < p.x1 + 6;
    return out;
  }
  if (S.state === 'teeter') { out.save = true; return out; }
  if (S.state !== 'rest') return out;
  const b = slkBase(st), cur = b.s;
  if (S.slide) { out.save = true; out.wait = 'slide'; }
  if (!cur.next.length) return out;
  let tg = c.steps[cur.next[0]];
  if (cur.next.length > 1) {
    out.branch = cur.next.map(i => c.steps[i]);
    const side = q => Math.sign((q.x0 + q.x1) / 2 + q.dx - b.x) || 1;
    tg = out.branch.find(q => side(q) === S.point) || out.branch[0];
    // the computer's pick: the more-stars way, unless this flight has been wobbly
    const starry = out.branch.find(q => q.way === 'stars') || out.branch[0], safe = out.branch.find(q => q.way === 'safe') || out.branch[1];
    out.pick = st.secWhoas >= 4 ? safe : starry;
  }
  out.target = tg; out.tIdx = tg.i;
  const z = slkZone(st, b.x, b.y, cur.kind === 'spring', tg);
  out.zone = z;
  out.want = out.pick ? (Math.sign((out.pick.x0 + out.pick.x1) / 2 + out.pick.dx - b.x) || 1) : z.dir;
  out.pointOK = out.branch ? true : S.point === z.dir;
  out.inZone = S.hold && S.m >= z.lo && S.m <= z.hi;
  if (z.lo > 1 || z.hi < 0 || z.hi - z.lo < 0.004) out.wait = out.wait || 'far';
  if (tg.kind === 'marble' && !tg.gold) {
    const lx = z.lxAt(S.hold ? S.m : z.mc), mx = slkMarbleAt(tg, st.t + z.tl);
    if (Math.abs(mx - lx) < SLK.marbleHit + 14) out.wait = out.wait || 'marble';
    out.marbleX = mx;
  }
  return out;
}
// the meter band that lands on step tg when let go now, from the slinky at (x, top)
function slkZone(st, x, top, spring, tg) {
  const D = SLK, vy0 = spring ? D.springVy : D.vy0, k = spring ? D.springK : 1;
  let tl = 0.75, p = slkPosAt(tg, st.t + tl);
  for (let it = 0; it < 3; it++) {
    p = slkPosAt(tg, st.t + tl);
    const h = p.y - (top - 2);
    tl = (vy0 + Math.sqrt(Math.max(0, vy0 * vy0 + 2 * D.g * h))) / D.g;
  }
  const cx = (p.x0 + p.x1) / 2, dir = Math.sign(cx - x) || 1, x0 = x + dir * 4;
  const mg = tg.gold ? -slkCatch(tg) + 8 : tg.w <= D.tinyW ? 6 : D.edge + 5;
  const near = dir > 0 ? p.x0 + mg - x0 : x0 - (p.x1 - mg), far = dir > 0 ? p.x1 - mg - x0 : x0 - (p.x0 + mg);
  let aim = (near + far) / 2;
  if (tg.kind === 'slip') aim = near + (far - near) * 0.3;
  if (tg.kind === 'marble' && !tg.gold) {
    const mx = slkMarbleAt(tg, st.t + tl), md = (mx - x0) * dir;
    if (Math.abs(md - aim) < 55) aim = md < aim ? Math.min(far - 4, md + 62) : Math.max(near + 4, md - 62);
  }
  const mOf = d => (d / tl / k - D.vxMin) / (D.vxMax - D.vxMin);
  return { dir, lo: mOf(near), hi: mOf(far), mc: clamp(mOf(aim), 0, 1), tl, ty: p.y, lxAt: m => x0 + dir * (D.vxMin + m * (D.vxMax - D.vxMin)) * k * tl };
}
// where a flop let go now at meter m (with no lean) goes: points for the gold guide
function slkArc(st, m) {
  const S = st.s, b = slkBase(st), spring = b.s.kind === 'spring', D = SLK, pts = [];
  const vx = S.point * (D.vxMin + m * (D.vxMax - D.vxMin)) * (spring ? D.springK : 1);
  let x = b.x + S.point * 4, y = b.y - 2, vy = -(spring ? D.springVy : D.vy0), land = null;
  for (let i = 0; i < 160; i++) {
    const py = y;
    const dt = 1 / 60; vy += D.g * dt; x += vx * dt; y += vy * dt;
    if (x < D.wallL || x > D.wallR) break;
    if (i % 3 === 0) pts.push([x, y]);
    if (vy > 0) for (const s of st.c.steps) {
      if (!slkSolid(st, S.on, s) || py > s.ty + 1.5 || y < s.ty) continue;
      const mg = slkCatch(s);
      if (x >= s.x0 + s.dx - mg && x <= s.x1 + s.dx + mg) { land = { x, y: s.ty, s }; break; }
    }
    if (land || y > b.y + 900) break;
  }
  return { pts, land };
}

/* ---------- small helpers ---------- */
function slkHint(st, id, text, life) { if (slkQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || 2.8 }; }
function slkMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function slkPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 10) st.pops.shift(); }
function slkPart(st, x, y, vx, vy, life, col, size, grav, kind) {
  if (st.parts.length > 260) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
// the touch buttons and the top-bar legend name each player's own action this flight: flop or stick
let slkLabelEls = null;
function slkActLabels(st) {
  try {
    if (!slkLabelEls || !slkLabelEls.every(o => document.contains(o.el))) slkLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const ds = box && (box.dataset.p !== undefined ? box.dataset.p : box.dataset.legp);
      const id = ds !== undefined && ds !== null ? +ds : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of slkLabelEls) {
      const want = o.id < 0 ? 'flop/stick' : o.id === st.flip ? 'flop' : 'stick';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}
function slkCam(st, dt) {
  const D = SLK, S = st.s, b = slkBase(st);
  let want = b.y - D.camLead;
  if (S.state === 'fly') want = Math.max(st.c.steps[S.fly.from].ty - D.camLead, S.fly.ey - D.camFly);
  else if (S.state === 'boing') { const fp = slkFrontPos(st); want = Math.min(want, fp.y - D.camLead); }
  want = clamp(want, D.camTop, st.c.bottom + 160 - H);
  st.cam += (want - st.cam) * Math.min(1, dt * (S.state === 'fly' ? 5 : 3.2));
  // (never let the slinky's front end leave the screen)
  const fy = slkFrontPos(st).y;
  st.cam = clamp(st.cam, fy - H + 130, fy - 110);
}
function slkLooks(st, dt) {
  const S = st.s;
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 6;
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.4);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  if (S.squash > 0) S.squash = Math.max(0, S.squash - dt * 3);
  for (const q of st.c.stars) if (q.got) q.t += dt;
  // pillows the slinky left puff back up
  for (const s of st.c.steps) if (s.kind === 'pillow' && s.i !== S.on && s.sink > 0) s.sink = Math.max(0, s.sink - dt * 1.5);
}

/* ---------- where the slinky's two ends are (world px), for drawing, the camera and the name tags ---------- */
// the front end (the steerer's end)
function slkFrontPos(st) {
  const S = st.s;
  if (S.state === 'fly') return { x: S.fly.ex, y: S.fly.ey };
  if (S.state === 'boing') { const B = S.boing, d = slkBoingDest(st), u = slkSmooth(clamp(B.t / SLK.boingT, 0, 1)); return { x: slkLerp(B.fx0, d.x, u), y: slkLerp(B.fy0, d.y, u) - Math.sin(u * Math.PI) * 120 }; }
  return slkBase(st);
}
// the back end (the flipper's end)
function slkBackPos(st) {
  const S = st.s;
  if (S.state === 'fly') { const s = st.c.steps[S.fly.from]; return { x: s.x0 + s.dx + S.fly.fromRx, y: s.ty }; }
  if (S.state === 'follow') {
    const f = S.fol, fp = slkBase(st), u = slkSmooth(clamp(f.t / SLK.followT, 0, 1));
    return { x: slkLerp(f.bx0, fp.x, u), y: slkLerp(f.by0, fp.y, u) - Math.sin(u * Math.PI) * (40 + Math.abs(fp.x - f.bx0) * 0.25) };
  }
  if (S.state === 'boing') { const B = S.boing, d = slkBoingDest(st), u = slkSmooth(clamp(B.t / SLK.boingT, 0, 1)); return { x: slkLerp(B.bx0, d.x, u), y: slkLerp(B.by0, d.y, u) - Math.sin(u * Math.PI) * 50 }; }
  return slkBase(st);
}
function slkBoingDest(st) { const B = st.s.boing, s = st.c.steps[B.to]; return { x: s.x0 + s.dx + B.toRx, y: s.ty }; }
// where a player is drawn (world px: feet)
function slkSpot(st, id) {
  const S = st.s, fp = slkFrontPos(st), bp = slkBackPos(st), standH = slkStandH(st);
  if (id === st.steer) {
    if (S.state === 'fly' || S.state === 'boing') return { x: fp.x, y: fp.y - 6 };
    if (S.state === 'follow') { const u = clamp(S.fol.t / SLK.followT, 0, 1); return { x: fp.x, y: fp.y - 6 - (standH - 6) * slkSmooth(u) }; }
    if (S.state === 'win') return { x: S.win.x + 22, y: S.win.y };
    const lean = slkStandLean(st);
    return { x: fp.x + lean * 14, y: fp.y - standH };
  }
  if (S.state === 'follow' || S.state === 'boing') return { x: bp.x, y: bp.y - 8 };
  if (S.state === 'win') return { x: S.win.x - 22, y: S.win.y };
  const dir = S.state === 'fly' ? S.fly.dir : S.point;
  return { x: bp.x - dir * 30, y: bp.y };
}
const slkStandH = st => { const S = st.s; return 46 + (S.hold ? S.m * 26 : 0) - S.squash * 10; };
function slkStandLean(st) {
  const S = st.s;
  if (S.state === 'teeter') return S.tee.side * (0.6 + 0.4 * Math.sin(S.tee.t * 18));
  if (S.hold) return -S.point * S.m * 0.9;
  return S.point * 0.3;
}
// copy the spots into the engine players (screen px): name tags and bubbles read p.x / p.y
function slkMirror(st) {
  for (const p of G.players) {
    const s = slkSpot(st, p.id);
    p.x = s.x - PW / 2; p.y = s.y - st.cam - PH * 1.3;
    p.alive = true; p.grounded = true; p.stompSafe = 0; p.vy = 0; p.vx = 0; p.stun = 0;
    p.face = p.id === st.steer ? (st.s.state === 'fly' ? st.s.fly.dir : st.s.point) : st.s.point;
  }
}

MODES.slinky = {
  SLK,
  medals: { bronze: 'Flip all the way to the toy box', goals: [
    { key: 'time', gold: 210, silver: 330 }, { key: 'whoas', gold: 3, silver: 12, word: 'Whoa' },
    { key: 'stars', gold: 0.7, more: true, pct: true, word: 'the stars' }, { key: 'perfects', gold: 30, more: true, word: 'Perfect landing' },
    { key: 'helps', gold: 1, word: 'gold help', text: n => 'At most ' + n + ' gold help' + (n === 1 ? '' : 's') },
  ] },
  medalValues() { const st = G.mst, s = st.stats; return s ? { time: s.finishT || G.time, whoas: s.whoas, stars: s.stars / (st.starsAll || 1), perfects: s.perfects, helps: s.helps } : {}; },
  plan: slkPlan, key: slkKey, zone: slkZone, posAt: slkPosAt, marbleAt: slkMarbleAt, compile: slkCompile, base: slkBase, front: slkFrontPos,
  // where the computer's speech bubble goes: over the player's own end of the slinky
  bubblePos(p) {
    const st = G.mst;
    if (!st || !st.s) return null;
    const s = slkSpot(st, p.id);
    return { x: clamp(s.x, 70, W - 70), y: clamp(s.y - st.cam - 58, 90, H - 120) };
  },
  setup(st, L) {
    st.stats = { stars: 0, perfects: 0, whoas: 0, helps: 0, flops: 0, landings: 0, flights: 0, roomT: [], finishT: 0 };
    // count every flight's stars up front (the HUD shows "x of all")
    const def = LEVELS[G.levelIndex], rooms = def.rooms || [def];
    st.starsAll = rooms.reduce((n, r) => n + slkCompile(r).starsAll, 0);
    slkRoom(st, L, 0);
  },
  room(k, L) { slkRoom(G.mst, L, k); },
  step(dt) { slkStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then, and drawn by the mode instead
  draw() {
    const st = G.mst;
    if (!st.c) return;
    slkDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.c) return;
    slkDrawFront(st);
  },
  hud() { const st = G.mst; if (st.c) slkHud(st); },
  stats() {
    const st = G.mst, s = st.stats;
    if (!s) return [];
    const all = st.starsAll || 1, frac = s.stars / all;
    const out = [
      { label: 'Stars', value: s.stars + ' of ' + st.starsAll },
      { label: 'Perfect landings', value: String(s.perfects) },
      { label: 'Whoas', value: String(s.whoas) },
    ];
    const words = s.perfects >= 20 ? 'Stuck the landing again and again. Slinky champions!' : frac >= 0.7 ? 'A sky full of stars, all the way down!' : 'Flip, flop, all the way to the toy box!';
    out.push(words + ' ' + s.landings + ' steps, ' + s.flops + ' flops.');
    if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
    return out;
  },
};

/* ---------- drawing (world px; drawn after translate(0, -cam)) ---------- */
const SLK_LOOK = {
  books: { wall: ['#f2d3a6', '#e6bb88'], grain: 'rgba(150,95,45,0.12)', side: '#b8783f', sideL: '#d39a5c', board: '#c98a52', boardD: '#8e5a2e' },
  blocks: { wall: ['#cfe6ff', '#eaf4ff'], grain: 'rgba(80,130,200,0.10)', side: '#e8574a', sideL: '#ff8a7a', board: '#ffc43d', boardD: '#b8861a' },
  pillows: { wall: ['#f3d6ea', '#fbeaf3'], grain: 'rgba(200,110,170,0.10)', side: '#a77bd6', sideL: '#c6a4ee', board: '#ffffff', boardD: '#d9b7d6' },
  rug: { wall: ['#d8ecd2', '#fff0d8'], grain: 'rgba(90,150,90,0.10)', side: '#c98a52', sideL: '#dca06a', board: '#c98a52', boardD: '#8e5a2e' },
};
function slkDrawWorld(st) {
  const cam = st.cam, c = st.c, lk = SLK_LOOK[c.look] || SLK_LOOK.books;
  // the wall behind (fixed) with a soft pattern that scrolls slower (far away)
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, lk.wall[0]); g.addColorStop(1, lk.wall[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const par = cam * 0.45;
  if (c.look === 'books') {
    // the bookshelf's back panel: wood grain, and far shelves of books
    ctx.strokeStyle = lk.grain; ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) { const x = 70 + i * 110; ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + 14, H * 0.3, x - 10, H * 0.7, x + 6, H); ctx.stroke(); }
    for (let k = Math.floor(par / 300) - 1; k <= Math.floor((par + H) / 300) + 1; k++) {
      const y = k * 300 - par + 220;
      // far books, hazed toward the wall colour (solid, so they read as far away rather than see-through)
      for (let i = 0; i < 26; i++) {
        const hh = hash(k + 50, i), bh = 50 + (hh % 40), bw = 18 + (hh >> 5) % 14, x = i * 38 + (hh >> 9) % 10, bc = mixCol(SLK_TOYS[hh % 6], lk.wall[1], 0.68);
        ctx.fillStyle = bc; rr(x, y - bh, bw, bh, 3); ctx.fill();
        ctx.fillStyle = mixCol(bc, '#5a3a20', 0.12); ctx.fillRect(x + bw - 4, y - bh + 2, 3, bh - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x + 3, y - bh + 8, bw - 6, 2.5); ctx.fillRect(x + 3, y - 12, bw - 6, 2.5);
      }
      ctx.fillStyle = mixCol(lk.side, lk.wall[1], 0.5); ctx.fillRect(0, y, W, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, y, W, 2);
      ctx.fillStyle = 'rgba(142,90,46,0.18)'; ctx.fillRect(0, y + 12, W, 8);
    }
  } else if (c.look === 'blocks') {
    // wallpaper stars, and big soft toy-block towers far behind
    for (let k = Math.floor(par / 120) - 1; k <= Math.floor((par + H) / 120) + 1; k++) for (let i = 0; i < 9; i++) {
      const hh = hash(k + 7, i), x = i * 112 + (hh % 60), y = k * 120 - par + (hh >> 7) % 60;
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; slkStarPath(x, y, 7, 3, 0); ctx.fill();
    }
    for (let k = Math.floor(par / 70) - 2; k <= Math.floor((par + H) / 70) + 1; k++) for (const side of [0, 1]) {
      const hh = hash(k, side + 3), x = side ? W - 150 + (hh % 20) : 70 + (hh % 20), y = k * 70 - par;
      const bc = mixCol(SLK_TOYS[(k + side * 3 + 60) % 6], lk.wall[1], 0.6);
      ctx.fillStyle = bc; rr(x, y, 72, 66, 8); ctx.fill();
      ctx.fillStyle = mixCol(bc, '#ffffff', 0.6); rr(x + 8, y + 8, 56, 50, 5); ctx.fill();
      ctx.fillStyle = mixCol(bc, '#2a3a60', 0.18); ctx.fillRect(x + 64, y + 4, 6, 60);
    }
  } else if (c.look === 'pillows') {
    // polka dots and a quilt far behind
    for (let k = Math.floor(par / 70) - 1; k <= Math.floor((par + H) / 70) + 1; k++) for (let i = 0; i < 14; i++) {
      const x = i * 72 + (k % 2) * 36, y = k * 70 - par;
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; circle(x, y, 7); ctx.fill();
    }
    for (let k = Math.floor(par / 160) - 1; k <= Math.floor((par + H) / 160) + 1; k++) for (let i = 0; i < 7; i++) {
      const y = k * 160 - par + 40;
      const pc = mixCol(SLK_TOYS[hash(k + 20, i) % 6], lk.wall[1], 0.78);
      ctx.fillStyle = pc; rr(i * 150 - 20, y, 140, 150, 18); ctx.fill();
      ctx.strokeStyle = mixCol(pc, '#ffffff', 0.5); ctx.lineWidth = 1.5; rr(i * 150 - 12, y + 8, 124, 134, 13); ctx.stroke();
    }
  } else {
    // stripes, a window with the moon, and the night light
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 12; i++) ctx.fillRect(i * 90, 0, 40, H);
    const wy = 300 - par;
    if (wy > -300 && wy < H + 50) {
      ctx.fillStyle = '#7a9bd8'; rr(640, wy, 190, 160, 10); ctx.fill();
      ctx.fillStyle = '#fff6c8'; circle(770, wy + 50, 22); ctx.fill(); ctx.fillStyle = '#7a9bd8'; circle(780, wy + 44, 18); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; rr(640, wy, 190, 160, 10); ctx.stroke(); ctx.beginPath(); ctx.moveTo(735, wy); ctx.lineTo(735, wy + 160); ctx.moveTo(640, wy + 80); ctx.lineTo(830, wy + 80); ctx.stroke();
    }
    const ny = 900 - par;
    if (ny > -80 && ny < H + 80) {
      ctx.fillStyle = 'rgba(255,230,140,0.35)'; circle(160, ny, 60 + Math.sin(G.clock * 2) * 4); ctx.fill();
      ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.arc(160, ny, 22, 0.6, Math.PI * 2 - 0.6); ctx.arc(176, ny, 16, Math.PI * 2 - 0.9, 0.9, true); ctx.fill();
    }
  }
  ctx.save(); ctx.translate(0, -cam);
  const top = cam - 60, bot = cam + H + 60;
  // the carpet at the very bottom of the last flight
  if (c.look === 'rug') {
    const gy = c.steps[c.steps.length - 1].y + 70;
    if (gy < bot) { ctx.fillStyle = '#7cc4e8'; ctx.fillRect(0, gy, W, 600); ctx.fillStyle = '#9ad4f0'; for (let i = 0; i < 6; i++) ctx.fillRect(0, gy + 14 + i * 26, W, 7); }
  }
  // the shelf's two tall sides
  for (const x of [0, SLK.wallR + 4]) {
    ctx.fillStyle = lk.side; ctx.fillRect(x, top, SLK.wallL - 4, bot - top);
    ctx.fillStyle = lk.sideL; ctx.fillRect(x + (x ? 0 : SLK.wallL - 12), top, 8, bot - top);
  }
  for (const s of c.signs) if (s.y > top && s.y < bot) slkDrawSign(s);
  // the gold guide: dots where a flop let go now would go
  const S = st.s;
  if (st.guide && S.state === 'rest' && G.introT <= 0) {
    const arc = slkArc(st, S.hold ? S.m : (st.plan.zone ? st.plan.zone.mc : 0.5));
    ctx.fillStyle = C.gold;
    arc.pts.forEach(([x, y], i) => { if (i % 2) return; ctx.globalAlpha = 0.85; circle(x, y, 3.5); ctx.fill(); });
    ctx.globalAlpha = 1;
    if (arc.land) { ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(arc.land.x, arc.land.y - 2, 18, 6, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  for (const s of c.steps) { const y = s.ty; if (y + s.h + 200 > top && y - 120 < bot) slkDrawStep(st, s); }
  for (const q of c.stars) if (!q.got && q.y > top && q.y < bot) slkDrawStar(q);
  ctx.restore();
}
function slkStarPath(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot - Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
function slkDrawStar(q) {
  const t = G.clock, bob = Math.sin(t * 3 + q.x * 0.05) * 3, x = q.x, y = q.y + bob;
  if (q.kind === 'bonus') {
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; circle(x, y, 20); ctx.fill();
    for (let i = 0; i < 6; i++) { ctx.fillStyle = SLK_RAINBOW[i]; slkStarPath(x, y, 17 - i * 2.2, 7 - i * 0.9, t * 0.8); ctx.fill(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; slkStarPath(x, y, 17, 7, t * 0.8); ctx.stroke();
    return;
  }
  ctx.fillStyle = C.gold; ctx.strokeStyle = '#a8701a'; ctx.lineWidth = 2;
  slkStarPath(x, y, 11, 5, Math.sin(t * 2 + x) * 0.2); ctx.fill(); ctx.stroke();
  if (Math.sin(t * 3 + x) > 0.85) { ctx.fillStyle = '#ffffff'; slkStarPath(x + 8, y - 8, 4, 1.5, 0); ctx.fill(); }
}
function slkDrawSign(s) {
  const str = s.alt && s.who >= 0 && slkQuiet(s.who) ? s.alt : s.text;
  ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(str).width + 26, x = clamp(s.x, w / 2 + 50, W - w / 2 - 50);
  ctx.strokeStyle = '#a07a52'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - w / 2 + 16, s.y - 14); ctx.lineTo(x, s.y - 34); ctx.lineTo(x + w / 2 - 16, s.y - 14); ctx.stroke();
  ctx.fillStyle = 'rgba(60,40,30,0.14)'; rr(x - w / 2 + 3, s.y - 10, w, 28, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,252,240,0.95)'; rr(x - w / 2, s.y - 14, w, 28, 8); ctx.fill();
  ctx.strokeStyle = '#a07a52'; rr(x - w / 2, s.y - 14, w, 28, 8); ctx.stroke();
  text(str, x, s.y + 0.5, 15, '#4a2f14', 'center', 'body');
}
// one step (world px): its top is s.ty
function slkDrawStep(st, s) {
  const x0 = s.x0 + s.dx, w = s.w, y = s.ty, h = s.h, t = G.clock, col = SLK_TOYS[s.col % 6], col2 = SLK_TOYS[(s.col + 2) % 6];
  ctx.lineWidth = 2.5; ctx.strokeStyle = C.ink;
  // a little peg into the shelf back (where it isn't held up by anything else)
  if (s.kind !== 'lift' && s.kind !== 'car' && s.kind !== 'goal') { ctx.fillStyle = 'rgba(80,50,20,0.22)'; ctx.fillRect(s.x0 + s.dx + w / 2 - 22, y + h, 44, 10); }
  if (s.kind !== 'goal') { ctx.fillStyle = 'rgba(60,40,30,0.13)'; rr(x0 + 7, y + 9, w, h, 6); ctx.fill(); }
  if (s.gold) { ctx.fillStyle = 'rgba(255,211,74,' + (0.25 + 0.12 * Math.sin(t * 5)) + ')'; const cg = slkCatch(s); rr(x0 - cg, y - 16, w + cg * 2, h + 24, 14); ctx.fill(); }
  switch (s.kind) {
    case 'start': case 'book': {
      // a stack of two books lying flat
      const hh = h / 2;
      for (let k = 0; k < 2; k++) {
        const by = y + k * hh, bx = x0 + (k ? 6 : 0), bw = w - (k ? 12 : 0), bc = k ? col2 : col;
        ctx.fillStyle = '#fffaf0'; rr(bx + 3, by + 3, bw - 6, hh - 4, 3); ctx.fill();
        ctx.fillStyle = bc; rr(bx, by, bw, hh, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fffaf0'; ctx.fillRect(bx + bw - 14, by + 4, 10, hh - 8);
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(bx + 10, by + hh / 2 - 1.5, Math.min(50, bw * 0.3), 3);
      }
      break;
    }
    case 'block': {
      const n = Math.max(1, Math.round(w / 70)), bw = w / n;
      for (let k = 0; k < n; k++) {
        const bx = x0 + k * bw, bc = SLK_TOYS[(s.col + k) % 6];
        ctx.fillStyle = bc; rr(bx, y, bw, h, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; rr(bx + 6, y + 6, bw - 12, h - 12, 4); ctx.fill();
        text('ABCDEF'[(s.i + k) % 6], bx + bw / 2, y + h / 2 + 1, h * 0.55, bc, 'center');
      }
      break;
    }
    case 'tiny': {
      // a dice
      ctx.fillStyle = '#ffffff'; rr(x0, y, w, h, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.ink; for (const [dx, dy] of [[-12, -10], [12, 10], [0, 0], [12, -10], [-12, 10]]) { circle(x0 + w / 2 + dx, y + h / 2 + dy, 3.6); ctx.fill(); }
      break;
    }
    case 'spring': {
      // a spring pad: a red base, a coil, a bouncy top
      const S = st.s, sq = S.on === s.i && S.state === 'rest' && S.hold ? S.m * 0.4 : S.on === s.i ? S.squash * 0.3 : 0;
      ctx.fillStyle = '#e8574a'; rr(x0 + 6, y + h - 12, w - 12, 12, 4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#c9ced8'; ctx.lineWidth = 4; ctx.beginPath();
      const top = y + 8 + sq * 10;
      for (let k = 0; k <= 6; k++) ctx.lineTo(x0 + w / 2 + (k % 2 ? -w * 0.28 : w * 0.28), slkLerp(y + h - 12, top, k / 6));
      ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
      ctx.fillStyle = '#ffd23f'; rr(x0, y + sq * 10 - 2, w, 10, 5); ctx.fill(); ctx.stroke();
      break;
    }
    case 'slip': {
      // a shiny tin lid
      const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
      g.addColorStop(0, '#bcd6ee'); g.addColorStop(0.5, '#f4fbff'); g.addColorStop(1, '#9fbad6');
      ctx.fillStyle = g; rr(x0, y, w, h, h / 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 3;
      for (let k = 0; k < 3; k++) { const sx = x0 + 24 + ((t * 60 + k * w / 3) % (w - 40)); ctx.beginPath(); ctx.moveTo(sx, y + h - 6); ctx.lineTo(sx + 10, y + 5); ctx.stroke(); }
      if (Math.sin(t * 4 + s.i) > 0.6) { ctx.fillStyle = '#ffffff'; slkStarPath(x0 + w * 0.7, y + 4, 6, 2, 0); ctx.fill(); }
      break;
    }
    case 'car': {
      // a toy truck's flat bed on a little track
      ctx.fillStyle = 'rgba(80,50,20,0.25)'; ctx.fillRect(s.x0 - s.ax - 10, y + h + 12, w + s.ax * 2 + 20, 6);
      ctx.fillStyle = col; rr(x0, y, w, h - 8, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x0 + 8, y + 4, w - 16, 4);
      const spin = s.dx * 0.06;
      for (const wx of [x0 + 24, x0 + w - 24]) {
        ctx.fillStyle = '#3d3a55'; circle(wx, y + h, 11); ctx.fill(); ctx.fillStyle = '#d9dbe8'; circle(wx, y + h, 5); ctx.fill();
        ctx.strokeStyle = '#3d3a55'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx, y + h); ctx.lineTo(wx + Math.cos(spin) * 5, y + h + Math.sin(spin) * 5); ctx.stroke();
      }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
      break;
    }
    case 'lift': {
      // a little tray on two strings from a pulley up high
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0 + 10, y); ctx.lineTo(x0 + w / 2, y - 200); ctx.lineTo(x0 + w - 10, y); ctx.stroke();
      ctx.fillStyle = '#d9dbe8'; circle(x0 + w / 2, s.y - s.ay - 210, 10); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
      ctx.fillStyle = '#c98a52'; rr(x0, y, w, h, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#dca06a'; ctx.fillRect(x0 + 4, y + 3, w - 8, 4);
      ctx.fillStyle = '#ffd23f'; circle(x0 + 10, y + h / 2, 3); ctx.fill(); circle(x0 + w - 10, y + h / 2, 3); ctx.fill();
      break;
    }
    case 'marble': {
      ctx.fillStyle = col; rr(x0, y, w, h, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x0 + 8, y + 3, w - 16, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(x0 + 10, y + 16, w - 20, 4);
      // the marble
      const mx = s.mx, my = y - SLK.marbleR, r = SLK.marbleR, rot = mx * 0.09;
      const gm = ctx.createRadialGradient(mx - 3, my - 4, 1, mx, my, r);
      gm.addColorStop(0, '#ffffff'); gm.addColorStop(1, s.gold ? '#ffd34a' : '#6fd0ff');
      ctx.fillStyle = gm; circle(mx, my, r); ctx.fill(); ctx.strokeStyle = 'rgba(28,26,54,0.6)'; ctx.lineWidth = 1.5; circle(mx, my, r); ctx.stroke();
      ctx.strokeStyle = s.gold ? '#a07418' : '#ff5f6d'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(mx, my, r * 0.55, rot, rot + 2.2); ctx.stroke();
      if (s.gold) { const zt = (t * 0.7) % 1; ctx.globalAlpha = 1 - zt; text('z', mx + 8 + zt * 10, my - 16 - zt * 18, 13 + zt * 5, '#5a4a8a', 'center'); ctx.globalAlpha = 1; }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
      break;
    }
    case 'pillow': {
      // a plump pillow: puffy sides, corner tufts, a seam (it squashes flatter as it sinks)
      const sq = s.sink, ph = h + 6 - sq * 12, py = y - 2;
      ctx.fillStyle = col; ctx.beginPath();
      ctx.moveTo(x0 + 10, py + 4); ctx.quadraticCurveTo(x0 + w / 2, py - 8 + sq * 8, x0 + w - 10, py + 4);
      ctx.quadraticCurveTo(x0 + w + 4, py + 2, x0 + w, py + 12);
      ctx.quadraticCurveTo(x0 + w - 8, py + ph / 2, x0 + w, py + ph - 10);
      ctx.quadraticCurveTo(x0 + w + 4, py + ph, x0 + w - 10, py + ph - 4);
      ctx.quadraticCurveTo(x0 + w / 2, py + ph + 8 - sq * 6, x0 + 10, py + ph - 4);
      ctx.quadraticCurveTo(x0 - 4, py + ph, x0, py + ph - 10);
      ctx.quadraticCurveTo(x0 + 8, py + ph / 2, x0, py + 12);
      ctx.quadraticCurveTo(x0 - 4, py + 2, x0 + 10, py + 4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(x0 + 16, py + 10); ctx.quadraticCurveTo(x0 + w / 2, py + 2 + sq * 6, x0 + w - 16, py + 10); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x0 + w * 0.32, py + ph * 0.45, w * 0.18, ph * 0.18, -0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(28,26,54,0.22)'; for (const [tx, ty] of [[x0 + 8, py + 8], [x0 + w - 8, py + 8], [x0 + 8, py + ph - 8], [x0 + w - 8, py + ph - 8]]) { circle(tx, ty, 2.5); ctx.fill(); }
      // the time left before it's flat (a ring over it)
      const S = st.s;
      if (S.on === s.i && S.state === 'rest' && !s.gold && s.i !== 0) {
        const u = clamp(S.sinkT / SLK.pillowT, 0, 1), cx = x0 + w - 18, cy = y - 22;
        ctx.fillStyle = 'rgba(28,26,54,0.6)'; circle(cx, cy, 13); ctx.fill();
        ctx.strokeStyle = u < 0.32 ? (Math.sin(t * 12) > 0 ? '#ff6b4a' : '#ffd0a0') : '#ffffff'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cx, cy, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * u); ctx.stroke();
      }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
      break;
    }
    case 'goal': slkDrawGoal(st, s, x0, y, w, h); break;
  }
  if (s.gold && Math.sin(t * 4 + s.i) > 0.3) { ctx.fillStyle = '#ffffff'; slkStarPath(x0 + w * 0.8, y - 8, 6, 2, t); ctx.fill(); }
}
function slkDrawGoal(st, s, x0, y, w, h) {
  const look = st.c.look, t = G.clock;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  if (look === 'books') {
    // a big open picture book lying flat
    ctx.fillStyle = '#4fb5ff'; rr(x0 - 8, y + 6, w + 16, h - 6, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.moveTo(x0, y + 10); ctx.quadraticCurveTo(x0 + w / 4, y - 6, x0 + w / 2, y + 6); ctx.quadraticCurveTo(x0 + w * 0.75, y - 6, x0 + w, y + 10); ctx.lineTo(x0 + w, y + 30); ctx.lineTo(x0, y + 30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5f6d'; circle(x0 + w * 0.25, y + 18, 7); ctx.fill(); ctx.fillStyle = '#6fd88a'; ctx.fillRect(x0 + w * 0.62, y + 13, 40, 9);
  } else if (look === 'blocks') {
    // a squashy foam play mat in rainbow squares
    for (let k = 0; k < 6; k++) { ctx.fillStyle = SLK_RAINBOW[k]; ctx.fillRect(x0 + k * w / 6, y, w / 6 + 1, h); }
    ctx.strokeStyle = C.ink; rr(x0, y, w, h, 10); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + 10, y + 8); ctx.lineTo(x0 + w - 10, y + 8); ctx.stroke();
  } else if (look === 'pillows') {
    // a big pile of pillows
    for (let k = 0; k < 3; k++) { ctx.fillStyle = SLK_TOYS[(k + 1) % 6]; ctx.beginPath(); ctx.ellipse(x0 + w * (0.2 + k * 0.3), y + h * 0.55, w * 0.2, h * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x0 + w / 2, y + 12, w * 0.42, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else {
    // the open toy box (Pip and Bo land inside it)
    ctx.fillStyle = '#b5743e'; ctx.save(); ctx.translate(x0, y); ctx.rotate(-0.5 - Math.sin(t * 2) * 0.03);
    rr(-4, -70, 14, 76, 4); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#7a4a24'; ctx.fillRect(x0, y - 6, w, 14);
    for (let k = 0; k < 7; k++) { ctx.fillStyle = SLK_TOYS[k % 6]; circle(x0 + 30 + k * (w - 60) / 6, y - 2 - (k % 2) * 6, 12); ctx.fill(); }
    ctx.fillStyle = '#d98b4a'; rr(x0, y + 4, w, h + 30, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; rr(x0 + 20, y + 16, w - 40, 12, 6); ctx.fill();
    text('TOY BOX', x0 + w / 2, y + 60, 26, '#fff4dc', 'center');
  }
}
function slkDrawFront(st) {
  const cam = st.cam, S = st.s;
  ctx.save(); ctx.translate(0, -cam);
  // the aim arrow over the slinky: the way it will flop (the steerer's colour)
  if (S.state === 'rest' && G.introT <= 0) {
    const b = slkBase(st), pl = st.plan, bad = !pl.pointOK && !slkQuiet(st.steer);
    const ax = b.x + S.point * 30, ay = b.y - slkStandH(st) - 70 + (bad ? Math.sin(G.clock * 10) * 3 : 0);
    ctx.fillStyle = PCOL[st.steer]; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax + S.point * 20, ay); ctx.lineTo(ax, ay - 13); ctx.lineTo(ax, ay - 6); ctx.lineTo(ax - S.point * 18, ay - 6); ctx.lineTo(ax - S.point * 18, ay + 6); ctx.lineTo(ax, ay + 6); ctx.lineTo(ax, ay + 13); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (pl.branch) for (const q of pl.branch) {
      const qx = clamp((q.x0 + q.x1) / 2 + q.dx, 120, W - 120), qy = q.ty - 54, on = q === pl.target;
      const lab = q.way === 'stars' ? '★ more stars' : q.way === 'safe' ? 'safer' : '';
      if (!lab) continue;
      ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = ctx.measureText(lab).width + 18;
      ctx.fillStyle = on ? 'rgba(255,211,74,0.95)' : 'rgba(28,26,54,0.7)'; rr(qx - w / 2, qy - 12, w, 24, 12); ctx.fill();
      text(lab, qx, qy + 0.5, 14, on ? C.ink : '#ffffff', 'center', 'body');
    }
  }
  slkDrawSlinky(st);
  slkDrawRiders(st);
  for (const q of st.parts) {
    const a = clamp(q.life / q.max, 0, 1);
    if (q.y < cam - 30 || q.y > cam + H + 30) continue;
    ctx.globalAlpha = a; ctx.fillStyle = q.col;
    if (q.kind === 'spark') { slkStarPath(q.x, q.y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
    else if (q.kind === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  const big = hudBig();
  for (const q of st.pops) {
    const x = clamp(q.x, 130, W - 130), y = clamp(q.y - cam - q.t * 30, 96, H - 120);
    ctx.globalAlpha = clamp((1.4 - q.t) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.25 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
    ctx.globalAlpha = 1;
  }
}
// the rainbow slinky: a stack of rings standing up, or an arch from the back end to the front end
function slkDrawSlinky(st) {
  const S = st.s, N = 14;
  const ring = (x, y, ang, i, rx) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 0, rx, 4.6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = SLK_RAINBOW[i % 6]; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.ellipse(0, 0, rx, 4.6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  };
  if (S.state === 'rest' || S.state === 'teeter' || S.state === 'win') {
    const b = S.state === 'win' ? { x: S.win.x, y: S.win.y } : slkBase(st), hgt = slkStandH(st), lean = S.state === 'win' ? Math.sin(G.clock * 6) * 0.4 : slkStandLean(st);
    ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(b.x, b.y, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < N; i++) { const u = i / (N - 1); ring(b.x + lean * 16 * u * u, b.y - 4 - (hgt - 6) * u, lean * 0.35 * u, i, 15); }
    return;
  }
  const bp = slkBackPos(st), fp = slkFrontPos(st), dist = Math.hypot(fp.x - bp.x, fp.y - bp.y);
  const lift = clamp(dist * 0.42, 26, 120), mx = (bp.x + fp.x) / 2, my = Math.min(bp.y, fp.y) - lift, n = Math.round(clamp(dist / 11, N, 32));
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), a = 1 - u;
    const x = a * a * bp.x + 2 * a * u * mx + u * u * fp.x, y = a * a * (bp.y - 4) + 2 * a * u * my + u * u * (fp.y - 4);
    const tx = 2 * a * (mx - bp.x) + 2 * u * (fp.x - mx), ty = 2 * a * (my - bp.y) + 2 * u * (fp.y - my);
    ring(x, y, Math.atan2(ty, tx) + Math.PI / 2, i, 14);
  }
}
function slkDrawRiders(st) {
  const S = st.s, t = G.clock;
  for (const id of [st.flip, st.steer]) {
    const p = G.players[id], sp = slkSpot(st, id);
    const save = { x: p.x, y: p.y, face: p.face, sx: p.sx, sy: p.sy, vy: p.vy, stun: p.stun, alive: p.alive };
    let rot = 0, sq = 0, hop = 0;
    if (S.state === 'boing') rot = Math.sin(S.boing.t * 9) * 0.5;
    if (S.state === 'teeter' && id === st.steer) rot = S.tee.side * 0.25 * Math.sin(S.tee.t * 18);
    if (S.state === 'fly' && id === st.steer) rot = clamp((S.fly.vx + S.fly.lv) / 1600, -0.25, 0.25) + (S.fly.lv / SLK.leanV) * 0.2;
    if (id === st.flip && S.hold) sq = S.m * 0.18;
    if (S.state === 'win') hop = Math.abs(Math.sin(t * 7 + id)) * 14;
    const sc = 1.3;
    ctx.save(); ctx.translate(sp.x, sp.y - hop); ctx.rotate(rot); ctx.scale(sc, sc);
    p.x = -PW / 2; p.y = -PH; p.alive = true; p.vy = S.state === 'fly' && id === st.steer ? S.fly.vy * 0.5 : 0;
    p.face = id === st.steer ? (S.state === 'fly' ? S.fly.dir : S.point) : S.point; p.sx = 1 + sq; p.sy = 1 - sq; p.stun = S.state === 'boing' ? 0.5 : 0;
    drawPlayer(p);
    ctx.restore();
    Object.assign(p, save);
    // the flipper's hands on the back rings while stretching
    if (id === st.flip && S.state === 'rest') {
      const b = slkBase(st), hx = b.x - S.point * 10, hy = b.y - 12 - (S.hold ? S.m * 6 : 0);
      for (const [col, lw] of [[PDARK[id], 5.5], [PCOL[id], 3.2]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sp.x + S.point * 8, sp.y - 18); ctx.lineTo(hx, hy); ctx.stroke(); }
    }
  }
}

/* ---------- the HUD: clock and stars, the flop meter, the job panels, prompts ---------- */
function slkHud(st) {
  const D = SLK, big = hudBig(), z = big ? 1.3 : 1, ps = G.players, play = G.mode === 'play' || G.mode === 'paused', t = G.clock, S = st.s;
  const font = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(st.stats.finishT || G.time), n = st.stats.stars + ' / ' + st.starsAll;
    ctx.font = font(fs);
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.2, gap = fs;
    const w = tw + gap + icon + fs * 0.4 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
    const gx = x0 + 15 + tw + gap + icon / 2;
    ctx.fillStyle = C.gold; slkStarPath(gx, cy, fs * 0.6, fs * 0.26, 0); ctx.fill();
    text(n, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, '#ffe7a8', 'left', 'body');
    timeX0 = x0;
  }
  if (!play) return;
  const pl = st.plan || slkPlan(st), ride = G.introT <= 0;
  // the flop meter, bottom centre: the main thing to watch
  {
    const pw = Math.round(250 * z), ph = Math.round(64 * z), px = W / 2 - pw / 2, py = H - ph - 10, z0 = pl.zone;
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    const gold = st.guide || (pl.target && pl.target.gold);
    ctx.strokeStyle = S.hold ? (pl.inZone ? '#7dffa0' : '#ffffff') : gold ? C.gold : '#ffb3d0'; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const gx = px + 14 * z, gw = pw - 28 * z, gy = py + 24 * z, gh = 16 * z;
    text(S.hold ? (pl.inZone ? 'LET GO!' : 'STRETCHING...') : 'FLOP METER', gx, py + 12 * z, 11 * z, S.hold && pl.inZone ? '#7dffa0' : '#ffd6ec', 'left', 'body');
    text('★ Perfect ' + st.stats.perfects, gx + gw, py + 12 * z, 11 * z, '#ffe7a8', 'right', 'body');
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(gx, gy, gw, gh, gh / 2); ctx.fill();
    ctx.save(); rr(gx, gy, gw, gh, gh / 2); ctx.clip();
    // short to far: a rainbow fade, and the green band that lands on the next step
    for (let i = 0; i < 6; i++) { ctx.fillStyle = SLK_RAINBOW[i]; ctx.globalAlpha = 0.25; ctx.fillRect(gx + gw * i / 6, gy, gw / 6 + 1, gh); }
    ctx.globalAlpha = 1;
    if (z0 && S.state === 'rest' && ride) {
      const a = clamp(z0.lo, 0, 1), b = clamp(z0.hi, 0, 1);
      if (b > a) {
        ctx.fillStyle = gold ? C.gold : '#5fe08a'; ctx.fillRect(gx + gw * a, gy, gw * (b - a), gh);
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(gx + gw * clamp(z0.mc, a, b) - 1, gy, 2, gh);
      }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; rr(gx, gy, gw, gh, gh / 2); ctx.stroke();
    // the marker
    const mm = S.hold ? S.m : S.lastM, mxp = gx + gw * clamp(mm, 0, 1);
    ctx.globalAlpha = S.hold ? 1 : 0.4;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(mxp, gy + gh - 2); ctx.lineTo(mxp - 7 * z, gy - 9 * z); ctx.lineTo(mxp + 7 * z, gy - 9 * z); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillRect(mxp - 1.5, gy, 3, gh);
    ctx.globalAlpha = 1;
    const tg = pl.target, cur = st.c.steps[S.on];
    const note = S.state === 'win' ? 'Hooray!' : S.state === 'fly' ? (st.guide ? 'Wheee! (gold guide on)' : 'Wheee!') : S.state === 'boing' ? 'Boing! Back up...' : S.state === 'teeter' ? 'Wobble! Stick it!'
      : cur.kind === 'pillow' && !cur.gold && S.on !== 0 ? 'The pillow is sinking!' : pl.wait === 'marble' ? 'Wait for the marble...' : pl.wait === 'far' ? 'Wait for it to come closer' : pl.wait === 'slide' ? 'Sliding!'
      : tg && tg.gold ? 'Gold sticky step!' : S.hold ? 'Let go in the green' : 'short  ·  far';
    text(note, gx, py + ph - 10 * z, 10.5 * z, st.guide || (tg && tg.gold) ? C.gold : '#d9d3ef', 'left', 'body');
    if (tg) text(tg.w <= D.tinyW ? 'tiny step' : { spring: 'springy', slip: 'slippy', car: 'moving', lift: 'moving', marble: 'marble', pillow: 'pillow', goal: 'the big landing' }[tg.kind] || '', gx + gw, py + ph - 10 * z, 10.5 * z, '#ffe7a8', 'right', 'body');
  }
  // the job panels: Pip's bottom left, Bo's bottom right
  const panels = [];
  for (const id of [0, 1]) {
    const pw = Math.round(206 * z), ph = Math.round(56 * z), py = H - ph - 10, px = id === 0 ? 12 : W - 12 - pw;
    panels[id] = { px, py, pw, ph };
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const quiet = slkQuiet(id), flipper = id === st.flip;
    text(NAMES[id] + (flipper ? ' · flipper' : ' · steerer') + (quiet ? ' (computer)' : ''), px + 12 * z, py + 15 * z, 14 * z, PCOL[id], 'left');
    const rest = ride && S.state === 'rest';
    const chips = flipper
      ? [['act', 'HOLD', rest && !S.hold && pl.pointOK && !pl.wait, S.hold && !pl.inZone], ['act', 'LET GO', rest && pl.inZone, false]]
      : [[S.state === 'fly' ? (pl.lean > 0 ? 'right' : pl.lean < 0 ? 'left' : 'lr') : 'lr', S.state === 'fly' ? 'LEAN' : 'POINT', ride && (S.state === 'fly' ? pl.lean !== 0 : rest && !pl.pointOK), false],
        ['down', 'STICK', ride && (pl.stick || pl.save), slkStickDown(st)]];
    const n = chips.length, cw = (pw - 24 * z - (n - 1) * 6 * z) / n;
    chips.forEach(([k, lab, lit, held], i) => {
      const cx = px + 12 * z + i * (cw + 6 * z), cy = py + 26 * z, chh = 24 * z;
      ctx.fillStyle = lit && !quiet ? (Math.sin(t * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : held ? 'rgba(255,138,61,0.85)' : 'rgba(255,255,255,0.12)';
      rr(cx, cy, cw, chh, chh / 2); ctx.fill();
      const kk = quiet ? '' : slkKey(id, k);
      let fs = 12 * z;
      const str = (kk ? kk + ' ' : '') + lab;
      ctx.font = font(fs);
      while (fs > 8 && ctx.measureText(str).width > cw - 8) { fs -= 0.5; ctx.font = font(fs); }
      text(str, cx + cw / 2, cy + chh / 2 + 0.5, fs, lit && !quiet ? C.ink : '#ffffff', 'center', 'body');
    });
  }
  // the message line (gold help): between the level pill and the clock when it fits, else under the flight pill
  const msg = st.waiting ? { text: 'Taking a break... press anything to flop on', col: '#ffffff', t: 1, life: 2 } : st.msg;
  if (msg) {
    let fs = big ? 20 : 14;
    const h = big ? 32 : 26;
    ctx.font = font(14);
    const left = 14 + ctx.measureText(levelCode(G.levelIndex) + ' · ' + G.level.def.name).width + 28 + 10, right = timeX0 - 10;
    ctx.font = font(fs);
    let w = ctx.measureText(msg.text).width + 30, cx = W / 2 + 40, y = 12;
    if (w <= right - left) cx = clamp(cx, left + w / 2, right - w / 2);
    else {
      cx = W / 2; y = big ? 96 : 80;
      while (w > W - 60 && fs > 11) { fs--; ctx.font = font(fs); w = ctx.measureText(msg.text).width + 30; }
    }
    ctx.globalAlpha = clamp((msg.life - msg.t) / 0.3, 0, 1);
    pill(cx, y, w, h, 'center'); text(msg.text, cx, y + h / 2 + 0.5, fs, msg.col, 'center', 'body'); ctx.globalAlpha = 1;
  }
  if (!ride || st.waiting || S.state === 'win' || S.state === 'boing') return;
  // prompts: the steerer's beside the slinky, the flipper's over their job panel. A hint bubble replaces a prompt.
  const fs = 14 * z, yMin = big ? 100 : 84, yMax = H - Math.round(64 * z) - 20 - (fs + 12 * z);
  const spot = (id, w, h) => {
    if (id === st.steer) {
      const sp = slkSpot(st, id), sx = sp.x, sy = sp.y - st.cam;
      let x = sx < W / 2 ? sx + 50 : sx - 50 - w, y = clamp(sy - 30 - h, yMin, yMax);
      x = clamp(x, 6, W - w - 6);
      return { x, y };
    }
    const P = panels[id];
    return { x: clamp(id === 0 ? P.px : P.px + P.pw - w, 6, W - w - 6), y: P.py - h - 8 };
  };
  const say = (id, str, col, pulse) => {
    ctx.font = font(fs);
    const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, o = spot(id, w, h);
    const s = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(o.x + w / 2, o.y + h / 2); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, col, 'center', 'body');
    ctx.restore();
  };
  const bubble = (id, str) => {
    ctx.font = font(fs);
    const w = ctx.measureText(str).width + 22 * z, h = fs + 14 * z, o = spot(id, w, h);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5;
    rr(o.x, o.y, w, h, h / 2); ctx.fill(); ctx.stroke();
    text(str, o.x + w / 2, o.y + h / 2 + 0.5, fs, C.ink, 'center', 'body');
  };
  for (const p of ps) {
    const id = p.id;
    if (slkQuiet(id)) continue;
    if (st.hints[id]) { bubble(id, st.hints[id].text); continue; }
    if (id === st.flip) {
      if (S.state !== 'rest') continue;
      if (S.hold) say(id, pl.inZone ? 'Let go now!' : 'Let go in the green', pl.inZone ? '#7dffa0' : '#ffe7a8', pl.inZone);
      else if (pl.wait === 'marble') say(id, 'Wait for the marble to roll by...', '#ffe7a8', false);
      else if (pl.wait === 'slide') say(id, 'Sliding!', '#cfefff', false);
      else if (!pl.pointOK) say(id, 'Wait: ' + NAMES[st.steer] + ' points the way', '#ffe7a8', false);
      else if (pl.target) say(id, 'Hold ' + slkKey(id, 'act') + ' to stretch', C.gold, S.restT > 1.2);
    } else {
      if (S.state === 'teeter' || (S.state === 'rest' && S.slide)) say(id, 'Hold ' + slkKey(id, 'down') + ' to stick it!', C.gold, true);
      else if (S.state === 'fly') {
        if (pl.stick || (pl.ttd < 0.3 && pl.ttd > 0)) say(id, 'Now! ' + slkKey(id, 'down'), C.gold, true);
        else if (pl.lean) say(id, pl.lean > 0 ? 'Lean ▶' : '◀ Lean', '#ffe7a8', false);
      } else if (S.state === 'rest' && pl.branch) say(id, 'Pick a way: ◀ ▶', C.gold, !S.hold);
      else if (S.state === 'rest' && !pl.pointOK && pl.target) say(id, pl.want > 0 ? 'Point the way: ' + slkKey(id, 'right') + ' ▶' : '◀ ' + slkKey(id, 'left') + ' Point the way', C.gold, true);
    }
  }
}

/* ---------- sounds ---------- */
Sfx.extra.slinkyStretch = function () { this.tone(300, 0.1, 'triangle', 0.03, 420); };
Sfx.extra.slinkyWiggle = function (pitch, m) { this.tone(260 + (m || 0) * 520, 0.05, 'sine', 0.018); };
Sfx.extra.slinkyTick = function () { this.tone(1100, 0.03, 'square', 0.012); };
Sfx.extra.slinkyPoint = function () { this.tone(700, 0.04, 'triangle', 0.025, 900); };
Sfx.extra.slinkyFlop = function () { this.tone(520, 0.22, 'sine', 0.05, 180); this.tone(900, 0.12, 'triangle', 0.02, 600, 0.04); };
Sfx.extra.slinkySpring = function () { this.tone(160, 0.32, 'sine', 0.07, 620); this.tone(320, 0.18, 'triangle', 0.03, 900, 0.05); };
Sfx.extra.slinkyLand = function () { this.tone(220, 0.08, 'triangle', 0.05, 140); [880, 1175].forEach((f, i) => this.tone(f, 0.05, 'sine', 0.025, null, 0.04 + i * 0.04)); };
Sfx.extra.slinkyPlump = function () { this.tone(140, 0.16, 'sine', 0.07, 90); };
Sfx.extra.slinkyPerfect = function () { [784, 988, 1319, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, i * 0.05)); };
Sfx.extra.slinkyStar = function () { [1319, 1760].forEach((f, i) => this.tone(f, 0.07, 'triangle', 0.035, null, i * 0.04)); };
Sfx.extra.slinkyBonus = function () { [1047, 1319, 1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.035, null, i * 0.04)); };
Sfx.extra.slinkyWhoa = function () { this.tone(600, 0.3, 'triangle', 0.045, 260); };
Sfx.extra.slinkyBack = function () { this.tone(180, 0.35, 'sine', 0.06, 700); this.tone(360, 0.2, 'sine', 0.025, 1000, 0.1); };
Sfx.extra.slinkyWobble = function () { [420, 360, 420, 360].forEach((f, i) => this.tone(f, 0.07, 'triangle', 0.03, null, i * 0.09)); };
Sfx.extra.slinkyPhew = function () { this.tone(500, 0.12, 'sine', 0.04, 760); this.tone(760, 0.1, 'triangle', 0.025, null, 0.1); };
Sfx.extra.slinkySlip = function () { this.tone(1400, 0.2, 'sine', 0.02, 700); };
Sfx.extra.slinkyCreak = function () { this.tone(200, 0.2, 'sawtooth', 0.015, 150); };
Sfx.extra.slinkyMarble = function () { this.tone(1600, 0.05, 'sine', 0.05); this.tone(1200, 0.06, 'sine', 0.04, null, 0.06); this.tone(300, 0.15, 'triangle', 0.04, 200, 0.1); };
Sfx.extra.slinkyWall = function () { this.tone(240, 0.12, 'sine', 0.04, 420); };
Sfx.extra.slinkyHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.slinkySwap = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.13, 'triangle', 0.05, null, i * 0.08)); this.tone(2093, 0.1, 'sine', 0.02, null, 0.36); };
Sfx.extra.slinkyFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'square', 0.035, null, i * 0.11)); };
Sfx.extra.slinkyCheer = function () { [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.04, null, i * 0.06)); };
