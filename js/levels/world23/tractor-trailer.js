/* Pip & Bo - Level 23-1 Tractor & Trailer (team, World 23 Barnyard Fair). */
'use strict';

/* ===== 23-1 Tractor & Trailer (mode 'haytractor', World 23 "Barnyard Fair", team, Gavyn's pick) =====
   Gavyn's pick, as offered: "one drives the tractor over bumpy hills, the other stands in the trailer and catches hay
   bales and pumpkins tossed from the fields. Too many bumps and the load spills."
   Pip and Bo take ONE little red tractor pulling a flat wooden hay wagon across rolling farmland, seen from the side. The
   road scrolls to the right and the camera follows the tractor. The mode owns the tick, the camera, the whole picture
   and the HUD (def.ownStep + def.ownHUD + def.noFalls); the engine grid is empty apart from the two spawns. All
   positions are world px (x grows to the right, y grows down; the farm is one screen tall, so the camera only scrolls
   sideways). Everything lives inside one closure: the only globals are MODES.haytractor and Sfx.extra.haytractor*.
   THE DRIVER (on the tractor seat): ▶ is the gas, ◀ slows down (held when stopped it backs up a little), ▼ brakes. With
   nothing pressed the tractor rolls to a stop. The action is 'honk': the horn shoos sheep and geese off the road and the
   crows that land on the load ("Caw!"). Sheep and geese on the road stop the tractor ("Baa!") until honked away (or
   they wander off by themselves after 6 s).
   THE CATCHER (standing on the wagon): ◀ ▶ walk along the wagon, ▲ (or jump) jumps. Farmers, a kid, a hay baler and a
   pumpkin catapult at the roadside toss hay bales, pumpkins and the odd golden corn cob (bonus) in arcs toward the road
   as the wagon passes. Touching one with your head and hands catches it and it goes onto the stack by itself. A toss
   nobody catches bounces off the wagon or lands on the road. The baler shoots its bales high and fast over the wagon:
   jump to catch those. Holding the action is 'hold': the catcher hugs the stack and steadies it through a bump (half
   the wobble), but can't walk, jump or catch while holding.
   THE PACE: tossers aim for where the wagon will be if it keeps the field's pace (about 140-160 px/s, the gold mark on
   the driver's speed meter). Going much slower or faster makes the tosses land off the wagon, and racing past a tosser
   means it gets fewer tosses away.
   BUMPS (rocks, ruts, humps, logs, the planks of a little bridge; a yellow sign stands before each one): when the wagon
   rolls over one faster than its safe speed (small 100, big 72 px/s) it bounces hard and the load's wobble meter (on
   the back of the wagon) fills. The wobble fades slowly while you drive smoothly. A full meter spills the top items off
   the back ("Whoops!"). Pumpkins are heavy: every pumpkin in the stack makes it wobble a bit more. A hard bounce also
   makes a catcher who isn't holding go "Whoa!" for a moment. Nobody ever gets hurt.
   ON THE ROAD: a spilled or missed item lies on the road for 7 s. Roll slowly (under 95 px/s, so back up for it) until
   it is under the wagon and the catcher scoops it up by standing over it.
   CROWS land on the load and peck; after 5 s a crow flies off with the top item, unless the driver honks first.
   THE END OF A FIELD: drive up to the barn; the load goes into the barn one item at a time ("12 in the barn!"), then Pip
   and Bo hop over each other and SWAP JOBS. 4 fields (roomWord 'Field'): Hay Meadow, Pumpkin Patch, Bumpy Hills,
   Sunset Lane to the Big Barn. Pip drives 1 and 3, Bo drives 2 and 4 (room def `drive`); each room has its own `act`
   labels and the mode rewrites the [data-actlabel] text so each player's touch button says their own word.
   GOLD HELP (always announced in the news line, only while both players are playing): 3 spills in one field: a gold
   rope ties the load for the rest of that field (it can't spill). 6 tosses in a row missed: gold hay (tosses glow, float
   down slowly and aim right at the catcher) for the rest of the field. 2 items taken by crows in one field: a gold
   scarecrow rides on the wagon and the crows stay away.
   IDLE: when no person has pressed anything for 15 s the tractor waits ("Taking a break") and the clock stops.
   Scoring: items delivered to the barns (golden corn counts as one, and is also counted on its own). Medal: Gold at
   <= 3:45 with >= 70% delivered, Silver at <= 6:30 with >= 50%, else Bronze.
   Room def: { title, drive: 0|1, look: 'meadow'|'patch'|'hills'|'sunset', pace, y0, tip, act, course: [tokens] }.
   Course tokens (x advances only with f and g):
     fN flat road for N px   gN:Y the road rises or falls smoothly to height Y over N px
     r small rock   u rut   R big rock   H hump   L log   B:N a little plank bridge N px long over a creek (a bump at each end)
     T:kind:items a tosser here (kind farmer | kid | baler | catapult; items b bale, p pumpkin, c golden corn, B a high
       bale from the baler)   S:n sheep / G:n geese wander onto the road here   C:n crows fly in when the wagon gets here
     Y:text a sign ({D} the driver's name, {C} the catcher's)   E the barn (E:big the Big Barn at the fair).
   MODES.haytractor.plan(st) is the one place that says what to do next (the prompts, the HUD chips and the computer
   brain read it). */
(() => {
  const S = {
    STEP: 4, g: 760, gGold: 360,
    vMax: 250, acc: 250, brake: 430, coast: 110, revMax: 95, revAcc: 220,
    rearR: 30, frontR: 17, base: 78, trOff: 178, deckHalf: 108, deckH: 44, wheelOff: 64, wheelR: 16,
    walk: 235, uMax: 92, jumpV: 450, jumpG: 1450, headH: 26, catchDX: 30,
    safe: { 1: 100, 2: 72 }, shakeK: { 1: 0.3, 2: 0.48 }, shakeBase: 0.12, wobDecay: 0.075, wobAfter: 0.35,
    lieT: 7, scoopV: 95, scoopDX: 38,
    honkCd: 0.45, honkReach: 560, crowPeck: 5, sheepWait: 6,
    camLead: 600, idleWait: 15, tryWin: 12,
    goldSpills: 3, goldMiss: 6, goldSteals: 2,
    finT: 4.2, slot: 44, row: 25, cols: 4,
  };
  const lerp = (a, b, u) => a + (b - a) * u;
  const smooth = u => u * u * (3 - 2 * u);
  const BUMP = {
    r: { size: 1, word: 'rock' }, u: { size: 1, word: 'rut' }, plank: { size: 1, word: 'planks' },
    R: { size: 2, word: 'big rock' }, H: { size: 2, word: 'hump' }, L: { size: 2, word: 'log' },
  };
  const TOSS = { farmer: { T: 1.2, gap: 1.05 }, kid: { T: 1.05, gap: 1.1 }, baler: { T: 1.1, gap: 0.55 }, catapult: { T: 1.5, gap: 1.35 } };
  const ITEM = { b: { r: 12, word: 'Hay!', w: 1 }, p: { r: 13, word: 'Pumpkin!', w: 1 }, c: { r: 9, word: 'Golden corn!', w: 1 } };

  /* ---------- the course: tokens -> road heights (4 px steps) and everything along it ---------- */
  function compile(def) {
    const X0 = -560, drive = def.drive || 0;
    const name = s => s.replace(/\{D\}/g, NAMES[drive]).replace(/\{C\}/g, NAMES[1 - drive]);
    const c = { x0: X0, look: def.look || 'meadow', pace: def.pace || 150, bumps: [], humps: [], tossers: [], flocks: [], crows: [],
      signs: [], creeks: [], barn: null, len: 0, total: 0, corn: 0 };
    const gy = [];
    let x = X0, y = def.y0 || 405;
    const seg = (len, f) => { len = Math.max(S.STEP, Math.round(len / S.STEP) * S.STEP); for (let k = 0; k < len; k += S.STEP) gy.push(f(k, len)); x += len; };
    const flat = len => { const y0 = y; seg(len, () => y0); };
    const go = (len, Y) => { const y0 = y; seg(len, (k, L) => lerp(y0, Y, smooth(k / L))); y = Y; };
    const bump = (bx, kind) => {
      const b = BUMP[kind];
      c.bumps.push({ x: bx, kind, size: b.size, safe: S.safe[b.size], word: b.word, n: 0 });
      if (kind === 'H') c.humps.push({ x: bx, w: 46, h: 15 });
      if (kind === 'u') c.humps.push({ x: bx, w: 22, h: -7 });
    };
    flat(-X0);
    for (const tk of def.course || []) {
      const t = String(tk), parts = t.split(':'), k = parts[0];
      if (k === 'Y') { c.signs.push({ x, text: name(t.slice(2)) }); continue; }
      if (k[0] === 'f' && k.length > 1) { flat(+k.slice(1)); continue; }
      if (k[0] === 'g' && k.length > 1) { go(+k.slice(1), +parts[1]); continue; }
      if (BUMP[k] && k !== 'plank') { bump(x, k); continue; }
      if (k === 'B') {
        const len = +parts[1] || 160;
        c.creeks.push({ x0: x, x1: x + len, y });
        bump(x + 8, 'plank'); bump(x + len - 8, 'plank');
        flat(len);
        continue;
      }
      if (k === 'T') {
        const items = (parts[2] || 'bbb').split('');
        c.tossers.push({ x, kind: parts[1] || 'farmer', items, i: 0, t: 0, arm: 0, id: c.tossers.length });
        c.total += items.length; c.corn += items.filter(q => q === 'c').length;
        continue;
      }
      if (k === 'S' || k === 'G') { c.flocks.push({ x, n: +parts[1] || 2, kind: k === 'S' ? 'sheep' : 'goose', st: 'field', walk: 0, wait: 0, t: 0 }); continue; }
      if (k === 'C') { c.crows.push({ x, n: +parts[1] || 1, done: false }); continue; }
      if (k === 'E') { flat(240); c.barn = { x, big: parts[1] === 'big' }; flat(1100); continue; }
    }
    flat(300);
    c.gy = Float32Array.from(gy); c.len = x;
    return c;
  }
  // the road height at x (y of the surface the wheels roll on)
  function gyAt(st, x) {
    const c = st.c, n = c.gy.length, f = clamp((x - c.x0) / S.STEP, 0, n - 1.001), i = Math.floor(f), u = f - i;
    let y = c.gy[i] + (c.gy[i + 1] - c.gy[i]) * u;
    for (const h of c.humps) { const d = Math.abs(x - h.x); if (d < h.w) y -= h.h * (0.5 + 0.5 * Math.cos(Math.PI * d / h.w)); }
    return y;
  }
  const tcOf = st => st.tr.s - S.trOff;
  // the top of the wagon's deck at x (it tilts with the road under its wheels and bounces)
  function deckTop(st, x) {
    const tc = tcOf(st), ya = gyAt(st, tc - S.wheelOff), yb = gyAt(st, tc + S.wheelOff);
    return (ya + yb) / 2 + (yb - ya) / (2 * S.wheelOff) * (x - tc) - S.deckH + st.wag.by;
  }
  const deckSlope = st => { const tc = tcOf(st); return Math.atan2(gyAt(st, tc + S.wheelOff) - gyAt(st, tc - S.wheelOff), 2 * S.wheelOff); };
  // the catcher's head (the catch spot) in world px
  function head(st) { const c = st.cat, x = tcOf(st) + c.u; return { x, y: deckTop(st, x) - c.jy - S.headH }; }
  // where a toss aims at x (about head height for a wagon there)
  const aimYAt = (st, x) => gyAt(st, x) - S.deckH - S.headH + 4;
  // the tractor's rear axle, front axle and lean
  function tractorPose(st) {
    const s = st.tr.s, yr = gyAt(st, s), yf = gyAt(st, s + S.base);
    const a = Math.atan2((yf - S.frontR) - (yr - S.rearR), S.base);
    return { x: s, y: yr - S.rearR + st.tr.bob, a };
  }
  const toWorld = (pose, lx, ly) => ({ x: pose.x + lx * Math.cos(pose.a) - ly * Math.sin(pose.a), y: pose.y + lx * Math.sin(pose.a) + ly * Math.cos(pose.a) });

  // each player's own keys (a player with a controller is shown its buttons, touch shows the arrows)
  function key(id, what) {
    const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
    if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
    if (what === 'right') return pad || touch ? '▶' : id === 0 ? 'D' : '→';
    if (what === 'left') return pad || touch ? '◀' : id === 0 ? 'A' : '←';
    if (what === 'up') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
    if (what === 'down') return pad || touch ? '▼' : id === 0 ? 'S' : '↓';
    if (what === 'lr') return pad ? 'stick' : touch ? '◀▶' : id === 0 ? 'A D' : '← →';
    return '';
  }
  const quiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
  // both seats are playing (a person who pressed something lately, or the computer)
  const both = st => [0, 1].every(q => cpuOn(q) || G.time - st.inT[q] < S.tryWin);

  /* ---------- a field (one room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.drive = def.drive || 0; st.catch = 1 - st.drive; st.look = def.look || 'meadow'; st.title = def.title || '';
    st.c = compile(def);
    st.tr = { s: 0, v: 0, bob: 0, bobV: 0, honkT: 0, honkCd: 0, gas: 0, brk: 0, puff: 0, wheel: 0, blockedT: 0 };
    st.wag = { by: 0, bv: 0 };
    st.cat = { u: 10, jy: 0, jv: 0, air: false, hold: false, stun: 0, face: 1, catchT: 0, prevUp: true, walk: 0 };
    st.stack = []; st.wob = 0; st.wobShow = 0; st.items = []; st.birds = []; st.toBarn = [];
    st.state = 'go'; st.barn = null; st.roomT = 0; st.segStart = G.time;
    st.cam = { x: st.tr.s - S.camLead };
    st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null; st.waiting = false;
    st.gold = { rope: false, hay: false, scare: false }; st.rSpills = 0; st.missRun = 0; st.rSteals = 0;
    st.stats.roomT[k] = null;
    mirror(st);
  }

  /* ---------- the tick (def.ownStep: this is all of it) ---------- */
  function tick(st, dt) {
    if (!st.c) return;
    const ps = G.players;
    for (const q of [0, 1]) {
      const i = ps[q].input;
      if (i.left || i.right || i.jump || i.down || i.up || i.act || ps[q].pendingJump || ps[q].pendingAct) st.inT[q] = G.time;
      if (!cpuOn(q) && (i.left || i.right || i.jump || i.down || i.up || i.act)) st.personT = G.time;
    }
    st.roomT += dt;
    actLabels(st);
    // nobody (no person) has pressed anything for a while: the tractor waits and the clock stops
    const people = [0, 1].filter(q => !cpuOn(q));
    st.waiting = st.state === 'go' && G.introT <= 0 && people.length > 0 && G.time - st.personT > S.idleWait;
    if (st.waiting) G.time -= dt;
    if (G.introT > 0 || st.waiting) {
      for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
      st.tr.v = approach(st.tr.v, 0, S.brake * dt);
      move(st, dt);
      items(st, dt, false);
    } else if (st.state === 'go') {
      driver(st, dt);
      move(st, dt);
      catcher(st, dt);
      tossers(st, dt);
      items(st, dt, true);
      birds(st, dt);
      flocks(st, dt);
      wobble(st, dt);
      nudges(st);
      if (st.c.barn && st.tr.s + 100 >= st.c.barn.x - 130) enterBarn(st);
    } else {
      for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
      items(st, dt, false);
      birds(st, dt);
      if (barnStep(st, dt)) return;
    }
    springs(st, dt);
    cam(st, dt);
    fx(st, dt);
    mirror(st);
  }

  /* ---------- the driver ---------- */
  function driver(st, dt) {
    const p = G.players[st.drive], i = p.input, tr = st.tr;
    p.pendingJump = false;
    if (p.pendingAct) { p.pendingAct = false; honk(st); }
    const gas = i.right && !i.left, brk = i.left || i.down;
    if (gas && !i.down) tr.v = Math.min(S.vMax, tr.v + (tr.v < 0 ? S.brake : S.acc) * dt);
    else if (brk) {
      if (tr.v > 0) tr.v = Math.max(0, tr.v - S.brake * dt);
      else if (i.left && !i.down) tr.v = Math.max(-S.revMax, tr.v - S.revAcc * dt);
      else tr.v = Math.min(0, tr.v + S.brake * dt);
    } else tr.v = tr.v > 0 ? Math.max(0, tr.v - S.coast * dt) : Math.min(0, tr.v + S.coast * 2 * dt);
    tr.gas = gas ? 1 : 0; tr.brk = brk ? 1 : 0;
  }
  function honk(st) {
    const tr = st.tr;
    if (tr.honkCd > 0) return;
    tr.honkCd = S.honkCd; tr.honkT = 0.5; st.stats.honks++;
    Sfx.play('haytractorHonk', st.drive);
    const pose = tractorPose(st), hp = toWorld(pose, 96, -30);
    pop(st, hp.x + 30, hp.y - 50, 'Honk honk!', '#ffffff', 20);
    for (let i = 0; i < 5; i++) part(st, hp.x + 10, hp.y, 60 + Math.random() * 80, -60 + Math.random() * 60, 0.7, '#ffffff', 3, -30, 'note');
    const front = tr.s + 100;
    let shooed = 0;
    for (const b of st.birds) if ((b.st === 'in' || b.st === 'peck') && Math.abs(b.x - tr.s) < S.honkReach + 200) { b.st = 'off'; b.t = 0; b.vx = 160 + Math.random() * 80; shooed++; }
    if (shooed) { st.stats.shooed += shooed; Sfx.play('haytractorCaw'); pop(st, tcOf(st), deckTop(st, tcOf(st)) - 150, 'Caw! Caw!', '#ffffff', 22); }
    for (const fl of st.c.flocks) {
      if ((fl.st === 'walk' || fl.st === 'road') && fl.x - front < S.honkReach && fl.x - front > -120) {
        fl.st = 'leave'; fl.t = 0;
        Sfx.play(fl.kind === 'sheep' ? 'haytractorBaa' : 'haytractorGoose');
        pop(st, fl.x, gyAt(st, fl.x) - 80, fl.kind === 'sheep' ? 'Baa! Okay!' : 'Honk! Honk!', '#ffffff', 20);
      }
    }
  }

  /* ---------- the tractor rolls; bumps under the wagon ---------- */
  function move(st, dt) {
    const tr = st.tr, c = st.c, tc0 = tcOf(st), s0 = tr.s;
    // sheep and geese on the road stop the tractor
    const front = tr.s + 100;
    for (const fl of c.flocks) {
      const onRoad = fl.st === 'road' || (fl.st === 'walk' && fl.walk > 0.5);
      if (!onRoad) continue;
      const lim = fl.x - 64;
      if (front + tr.v * dt > lim && front < fl.x + 40) {
        if (tr.v > 40 && !fl.bonked) { fl.bonked = true; Sfx.play(fl.kind === 'sheep' ? 'haytractorBaa' : 'haytractorGoose'); pop(st, fl.x, gyAt(st, fl.x) - 80, fl.kind === 'sheep' ? 'Baa! We\'re in the way!' : 'Honk! Our road!', '#ffffff', 18); st.stats.stops++; }
        tr.s = Math.min(tr.s, lim - 100); tr.v = Math.min(tr.v, 0);
      }
    }
    tr.s += tr.v * dt;
    const minS = c.x0 + S.trOff + 260;
    if (tr.s < minS) { tr.s = minS; tr.v = Math.max(0, tr.v); }
    tr.wheel += (tr.s - s0) / S.rearR;
    // the tractor's own wheels just bob over bumps; the wagon's crossing is what shakes the load
    const tc1 = tcOf(st);
    for (const b of c.bumps) {
      for (const off of [0, S.base]) {
        const a = s0 + off, z = tr.s + off;
        if ((a < b.x && z >= b.x) || (a > b.x && z <= b.x)) { tr.bobV -= 30 + Math.min(120, Math.abs(tr.v) * 0.45) * (b.size === 2 ? 1.3 : 0.9); if (Math.abs(tr.v) > 30) Sfx.play('haytractorTick'); }
      }
      if ((tc0 < b.x && tc1 >= b.x) || (tc0 > b.x && tc1 <= b.x)) crossBump(st, b, Math.abs(tr.v));
    }
    if (Math.abs(tr.v) > 5) tr.puff -= dt * (1 + Math.abs(tr.v) / 80); else tr.puff -= dt * 0.5;
    if (tr.puff <= 0) {
      tr.puff = 0.35;
      const pose = tractorPose(st), ex = toWorld(pose, 62, -70);
      part(st, ex.x, ex.y, -20 - tr.v * 0.3, -40 - Math.random() * 20, 1.4, 'rgba(255,255,255,0.75)', 5 + Math.random() * 3, -10, 'smoke');
    }
    if (tr.honkCd > 0) tr.honkCd -= dt;
    if (tr.honkT > 0) tr.honkT -= dt;
  }
  function crossBump(st, b, v) {
    const tc = tcOf(st), c = st.cat;
    b.n++;
    st.wag.bv -= Math.min(300, 50 + v * 1.0) * (b.size === 2 ? 1.15 : 0.85);
    if (v <= b.safe) { if (v > 25) Sfx.play('haytractorTick'); if (!b.soft) { b.soft = true; pop(st, b.x, gyAt(st, b.x) - 70, 'Nice and slow!', '#d9ffd0', 15); } return; }
    // a hard bounce
    const pumpkins = st.stack.filter(q => q.k === 'p').length;
    const mult = (1 + 0.07 * pumpkins + 0.015 * st.stack.length) * (c.hold ? 0.5 : 1);
    const add = st.stack.length ? (S.shakeBase + (v - b.safe) / 100 * S.shakeK[b.size]) * mult : 0;
    st.stats.hard++;
    Sfx.play(b.size === 2 ? 'haytractorThud' : 'haytractorBump');
    G.shake = reduceMotion ? 0 : (b.size === 2 ? 0.07 : 0.045);
    rumble(st.catch, 0.3, 0.5, 160); rumble(st.drive, 0.15, 0.3, 120);
    pop(st, b.x, gyAt(st, b.x) - 60, b.size === 2 ? 'BUMP!' : 'Bump!', '#ffe7a8', b.size === 2 ? 24 : 19);
    if (c.hold) { pop(st, tc + c.u, deckTop(st, tc + c.u) - 70, 'Hold tight!', '#d9ffd0', 16); }
    else if (!c.air) { c.stun = 0.4; c.jv = 150; c.air = true; pop(st, tc + c.u, deckTop(st, tc + c.u) - 70, 'Whoa!', '#ffffff', 17); }
    for (let i = 0; i < 6; i++) part(st, b.x + (Math.random() - 0.5) * 30, gyAt(st, b.x), (Math.random() - 0.5) * 120, -60 - Math.random() * 80, 0.7, '#d9b07a', 3.5, 300, 'dust');
    if (st.gold.rope) { st.wob = Math.min(0.92, st.wob + add * 0.5); return; }
    st.wob += add;
    if (st.wob >= 1) spill(st);
    else if (add > 0.25) hint(st, st.drive, 'Slow down ' + key(st.drive, 'left') + ' before the bumps!', 2.8);
  }
  function spill(st) {
    const tc = tcOf(st), n = Math.min(st.stack.length, 2 + Math.floor(st.stack.length / 6));
    for (let k = 0; k < n; k++) {
      const q = st.stack.pop(), sp = slotPos(st, st.stack.length);
      st.items.push({ k: q.k, x: sp.x, y: sp.y, vx: st.tr.v * 0.5 - 120 - Math.random() * 150, vy: -230 - Math.random() * 140, st: 'bounce', rot: 0, vr: (Math.random() - 0.5) * 9, t: 0, g: S.g, missed: true, spilled: true, lieT: S.lieT });
    }
    st.wob = S.wobAfter; st.stats.spills++; st.rSpills++;
    Sfx.play('haytractorWhoops');
    pop(st, tc - 40, deckTop(st, tc) - 120, 'Whoops! The load spilled!', '#ffffff', 24);
    if (n) hint(st, st.catch, 'Scoop them up! Stand over them when the wagon is slow', 3.4);
    hint(st, st.drive, 'Back up ' + key(st.drive, 'left') + ' to pick them up!', 3.2);
    if (st.rSpills >= S.goldSpills && !st.gold.rope && both(st)) {
      st.gold.rope = true; st.stats.helps++; Sfx.play('haytractorHelp');
      msg(st, 'Gold rope! The load can\'t spill in this field', C.gold, 4.4);
    }
  }

  /* ---------- the catcher ---------- */
  function catcher(st, dt) {
    const p = G.players[st.catch], i = p.input, c = st.cat;
    const upFresh = i.up && !c.prevUp; c.prevUp = !!i.up;
    const jump = p.pendingJump || upFresh;
    p.pendingJump = false; p.pendingAct = false;
    if (c.stun > 0) c.stun -= dt;
    c.hold = !!i.act && !c.air;
    const dx = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    c.walk = 0;
    if (!c.hold && c.stun <= 0 && dx) { c.u += dx * S.walk * (c.air ? 0.85 : 1) * dt; c.face = dx; c.walk = dx; }
    c.u = clamp(c.u, -S.uMax, S.uMax);
    if (jump && !c.air && !c.hold && c.stun <= 0) { c.air = true; c.jv = S.jumpV; Sfx.play('haytractorJump', st.catch); }
    if (c.catchT > 0) c.catchT -= dt;
  }
  function springs(st, dt) {
    const c = st.cat, w = st.wag, tr = st.tr;
    if (c.air) { c.jy += c.jv * dt; c.jv -= S.jumpG * dt; if (c.jy <= 0) { c.jy = 0; c.jv = 0; c.air = false; } }
    // the wagon and tractor bounce on springy tyres
    w.bv += (-w.by * 320 - w.bv * 9) * dt; w.by += w.bv * dt;
    tr.bobV += (-tr.bob * 380 - tr.bobV * 10) * dt; tr.bob += tr.bobV * dt;
    st.wobShow = approach(st.wobShow, st.wob, dt * 2);
  }

  /* ---------- the tossers ---------- */
  function origin(st, tz) {
    const y = gyAt(st, tz.x) - 18;
    if (tz.kind === 'baler') return { x: tz.x + 34, y: y - 44 };
    if (tz.kind === 'catapult') return { x: tz.x + 10, y: y - 62 };
    if (tz.kind === 'kid') return { x: tz.x, y: y - 40 };
    return { x: tz.x + 4, y: y - 58 };
  }
  function tossers(st, dt) {
    const tr = st.tr, tc = tcOf(st), c = st.c;
    for (const tz of c.tossers) {
      if (tz.arm > 0) tz.arm -= dt;
      if (tz.i >= tz.items.length) continue;
      if (tz.t > 0) { tz.t -= dt; continue; }
      if (Math.abs(tz.x - tc) > 900) continue;
      const k = tz.items[tz.i], high = k === 'B', gold = st.gold.hay && !high, o = origin(st, tz);
      let aimX, T, vx, vy, g = gold ? S.gGold : S.g;
      if (high) {
        // the baler shoots a bale forward over the wagon: highest point just above jumping height, then it lands ahead
        const off = -50 + hash(tz.id * 7 + tz.i, st.k + 3) % 60;
        const apexY = aimYAt(st, tz.x + 200) - 76;
        T = Math.sqrt(2 * Math.max(40, o.y - apexY) / g);
        aimX = tc + c.pace * T + off;
        if (aimX < tz.x + 190 || aimX > tz.x + 300) continue;
        vx = (aimX - o.x) / T; vy = -g * T;
      } else {
        T = TOSS[tz.kind].T * (gold ? 1.45 : 1);
        const off = gold ? st.cat.u : -70 + hash(tz.id * 13 + tz.i, st.k + 11) % 141;
        aimX = tc + (gold ? tr.v : c.pace) * T + off;
        if (aimX < tz.x - 260 || aimX > tz.x + 320) continue;
        const aimY = aimYAt(st, aimX);
        vx = (aimX - o.x) / T; vy = (aimY - o.y - 0.5 * g * T * T) / T;
      }
      st.items.push({ k: k.toLowerCase(), x: o.x, y: o.y, vx, vy, st: 'fly', rot: 0, vr: (Math.random() - 0.5) * 6, t: 0, g, gold, high, missed: false, lieT: S.lieT, from: tz.kind });
      tz.i++; tz.t = TOSS[tz.kind].gap; tz.arm = 0.4;
      Sfx.play(tz.kind === 'catapult' ? 'haytractorFling' : 'haytractorToss');
      if (!st.hinted['toss' + st.k]) { st.hinted['toss' + st.k] = true; hint(st, st.catch, 'Here it comes! Walk under it ' + key(st.catch, 'lr'), 3); }
      if (high && !st.hinted['high' + st.k]) { st.hinted['high' + st.k] = true; hint(st, st.catch, 'High bale! Jump ' + key(st.catch, 'up') + ' to catch it', 3.2); }
    }
  }

  /* ---------- flying, bouncing and lying items ---------- */
  function items(st, dt, live) {
    const tr = st.tr, tc = tcOf(st), c = st.cat, hd = head(st);
    for (const it of st.items) {
      it.t += dt;
      if (it.st === 'fly' || it.st === 'bounce') {
        it.vy += it.g * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt;
        const r = ITEM[it.k].r;
        // a catch: the item touches the catcher's head and hands
        if (it.st === 'fly' && live && !c.hold && c.stun <= 0 && it.vy > -160 && Math.abs(it.x - hd.x) < S.catchDX && it.y > hd.y - 22 && it.y < hd.y + 22) { catchIt(st, it, false); continue; }
        // the wagon deck (in front of the stack) and the tractor bonk it off
        const onDeck = it.x > tc - S.deckHalf && it.x < tc + S.deckHalf;
        if (it.vy > 0 && onDeck && it.y + r >= deckTop(st, it.x) && it.y + r < deckTop(st, it.x) + 30) {
          it.vy = -Math.max(140, Math.abs(it.vy) * 0.45); it.vx = (it.x < tc ? -1 : 1) * (110 + Math.random() * 60) + tr.v * 0.6; it.vr *= -1.5;
          if (it.st === 'fly') { miss(st, it); pop(st, it.x, it.y - 30, 'Boing! Missed', '#ffe7a8', 16); Sfx.play('haytractorBoing'); }
          it.st = 'bounce'; continue;
        }
        const pose = tractorPose(st);
        if (it.vy > 0 && it.x > tr.s - 34 && it.x < tr.s + 104 && it.y + r > pose.y - 40 && it.y < pose.y + 10) {
          it.vy = -Math.max(120, Math.abs(it.vy) * 0.4); it.vx = 150 + tr.v * 0.6;
          if (it.st === 'fly') { miss(st, it); pop(st, it.x, it.y - 30, 'Bonk! Missed', '#ffe7a8', 16); Sfx.play('haytractorBoing'); }
          it.st = 'bounce'; continue;
        }
        const gy = gyAt(st, it.x);
        if (it.y + r >= gy) {
          if (it.st === 'fly') { miss(st, it); Sfx.play('haytractorPlop'); }
          if (it.vy > 160) { it.vy = -it.vy * 0.28; it.vx *= 0.5; it.y = gy - r; it.st = 'bounce'; }
          else { it.st = 'lie'; it.y = gy - r; it.vx = 0; it.vy = 0; it.lieT = S.lieT; }
        }
      } else if (it.st === 'lie') {
        it.y = gyAt(st, it.x) - ITEM[it.k].r;
        if (live) it.lieT -= dt;
        // scooped up: the wagon rolls slowly over it and the catcher stands right above it
        if (live && Math.abs(tr.v) < S.scoopV && !c.air && !c.hold && Math.abs(it.x - (tc + c.u)) < S.scoopDX && it.x > tc - S.deckHalf && it.x < tc + S.deckHalf) { catchIt(st, it, true); continue; }
        if (it.lieT <= 0) { it.st = 'gone'; puff(st, it.x, it.y, '#d9b07a'); }
      }
    }
    st.items = st.items.filter(q => q.st !== 'gone' && q.st !== 'caught' && q.x > st.c.x0 - 200 && q.x < st.c.len + 200 && q.y < H + 100);
  }
  function miss(st, it) {
    if (it.missed) return;
    it.missed = true; st.stats.missed++; st.missRun++;
    if (st.missRun >= S.goldMiss && !st.gold.hay && both(st)) {
      st.gold.hay = true; st.stats.helps++; Sfx.play('haytractorHelp');
      msg(st, 'Gold hay! The tosses glow and float right to the catcher', C.gold, 4.4);
    }
  }
  function catchIt(st, it, scoop) {
    const c = st.cat;
    it.st = 'caught';
    st.stack.push({ k: it.k, anim: 0, fx: it.x, fy: it.y, gold: it.gold });
    if (!scoop) st.missRun = 0;
    st.stats[scoop ? 'scooped' : 'caught']++;
    c.catchT = 0.3;
    Sfx.play(scoop ? 'haytractorScoop' : it.k === 'c' ? 'haytractorCorn' : it.k === 'p' ? 'haytractorPumpkin' : 'haytractorCatch', st.catch);
    pop(st, it.x, it.y - 34, scoop ? 'Scooped!' : ITEM[it.k].word, it.k === 'c' ? C.gold : it.k === 'p' ? '#ffc08a' : '#ffffff', it.k === 'c' ? 22 : 18);
    if (it.k === 'c' || it.gold) spark(st, it.x, it.y, C.gold, 8); else spark(st, it.x, it.y, '#fff3b0', 4);
  }
  // where the n-th item sits in the stack (4 to a row, rows a little offset like stacked bales)
  function slotPos(st, n) {
    const tc = tcOf(st), row = Math.floor(n / S.cols), col = n % S.cols;
    const sway = Math.sin(G.clock * 9) * st.wobShow * row * 2.2 + (st.wobShow > 0.55 ? Math.sin(G.clock * 23) * (st.wobShow - 0.55) * row * 2 : 0);
    const x = tc - S.slot * 1.5 + col * S.slot + (row % 2 ? 6 : -4) + sway;
    return { x, y: deckTop(st, x) - 13 - row * S.row, row, col };
  }

  /* ---------- the load's wobble ---------- */
  function wobble(st, dt) {
    // it calms down while you drive smoothly (faster when rolling slowly or stopped)
    const calm = Math.abs(st.tr.v) < 60 ? 1.6 : 1;
    st.wob = Math.max(0, st.wob - S.wobDecay * calm * dt);
    for (const q of st.stack) if (q.anim < 1) q.anim = Math.min(1, q.anim + dt * 3.2);
  }

  /* ---------- crows ---------- */
  function birds(st, dt) {
    const tc = tcOf(st), c = st.c, live = st.state === 'go' && !st.waiting && G.introT <= 0;
    if (live) for (const cs of c.crows) {
      if (cs.done || tc < cs.x - 160) continue;
      cs.done = true;
      for (let i = 0; i < cs.n; i++) st.birds.push({ st: st.gold.scare ? 'shy' : 'in', x: tc + 520 + i * 70, y: 90 + i * 34, slot: i, t: 0, vx: 0, flap: Math.random() * 6, carry: null });
      Sfx.play('haytractorCaw');
      if (!st.gold.scare) hint(st, st.drive, 'A crow! Honk ' + key(st.drive, 'act') + ' to shoo it', 3.2);
    }
    for (const b of st.birds) {
      b.flap += dt * (b.st === 'peck' ? 3 : 14);
      if (b.st === 'in') {
        const top = st.stack.length ? slotPos(st, Math.max(0, st.stack.length - 1)).y - 20 : deckTop(st, tc) - 8;
        const tx = tc - 30 + b.slot * 46, ty = top - b.slot * 2;
        const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1, sp = 240;
        if (d < sp * dt + 2) { b.st = 'peck'; b.t = 0; b.x = tx; b.y = ty; }
        else { b.x += dx / d * sp * dt + st.tr.v * dt; b.y += dy / d * sp * dt; }
        if (st.gold.scare) { b.st = 'shy'; }
      } else if (b.st === 'peck') {
        const top = st.stack.length ? slotPos(st, Math.max(0, st.stack.length - 1)).y - 20 : deckTop(st, tc) - 8;
        b.x = tc - 30 + b.slot * 46; b.y = top - b.slot * 2;
        if (live) b.t += dt;
        if (st.gold.scare) b.st = 'shy';
        else if (b.t >= S.crowPeck) {
          b.st = 'off'; b.t = 0; b.vx = 140;
          if (st.stack.length) {
            const q = st.stack.pop(); b.carry = q.k; st.stats.stolen++; st.rSteals++;
            Sfx.play('haytractorCaw');
            pop(st, b.x, b.y - 30, q.k === 'p' ? 'Caw! A whole pumpkin!' : q.k === 'c' ? 'Caw! Shiny corn!' : 'Caw! A bale for my nest!', '#ffffff', 18);
            if (st.rSteals >= S.goldSteals && !st.gold.scare && both(st)) {
              st.gold.scare = true; st.stats.helps++; Sfx.play('haytractorHelp');
              msg(st, 'Gold scarecrow! It rides on the wagon and the crows stay away', C.gold, 4.4);
            }
          }
        }
      } else {
        // off (or shy): flap away up and to the right
        b.t += dt; b.x += (b.vx || 160) * dt + st.tr.v * dt * 0.3; b.y -= (b.carry ? 70 : 120) * dt;
        if (b.st === 'shy' && !b.said) { b.said = true; pop(st, b.x, b.y, 'Caw?! A scarecrow!', '#ffffff', 15); }
      }
    }
    st.birds = st.birds.filter(b => b.y > -80 && b.x < st.cam.x + W + 400);
  }

  /* ---------- sheep and geese ---------- */
  function flocks(st, dt) {
    const front = st.tr.s + 100;
    for (const fl of st.c.flocks) {
      fl.t += dt;
      if (fl.st === 'field' && front > fl.x - 720) { fl.st = 'walk'; fl.t = 0; if (!st.hinted['flock' + fl.x]) { st.hinted['flock' + fl.x] = true; hint(st, st.drive, (fl.kind === 'sheep' ? 'Sheep' : 'Geese') + ' on the road! Honk ' + key(st.drive, 'act'), 3.4); } }
      else if (fl.st === 'walk') { fl.walk = Math.min(1, fl.walk + dt / 1.6); if (fl.walk >= 1) fl.st = 'road'; }
      if (fl.st === 'road' || fl.st === 'walk') {
        if (fl.x - 64 - front < 60 && st.tr.v < 20) fl.wait += dt;
        if (fl.wait > S.sheepWait) { fl.st = 'leave'; fl.t = 0; pop(st, fl.x, gyAt(st, fl.x) - 80, fl.kind === 'sheep' ? 'Baa... fine, we\'ll move' : 'Honk... we\'ll move', '#ffffff', 16); Sfx.play(fl.kind === 'sheep' ? 'haytractorBaa' : 'haytractorGoose'); }
      } else if (fl.st === 'leave') { fl.walk = Math.max(0, fl.walk - dt / 0.9); if (fl.walk <= 0) fl.st = 'gone'; }
    }
  }

  /* ---------- nudges (the gold help switches on where it happens: spill(), miss() and birds()) ---------- */
  function hintOnce(st, keyName, id, text, life) { if (st.hinted[keyName]) return; st.hinted[keyName] = true; hint(st, id, text, life); }
  function nudges(st) {
    const D = st.drive, Cc = st.catch;
    if (st.roomT > 0.4 && st.roomT < 1.5) {
      hintOnce(st, 'drive' + st.k, D, 'You drive! ' + key(D, 'right') + ' gas, ' + key(D, 'left') + ' slow down', 3.4);
      hintOnce(st, 'catch' + st.k, Cc, 'You catch! ' + key(Cc, 'lr') + ' walk, ' + key(Cc, 'up') + ' jump', 3.4);
    }
    const tc = tcOf(st), b = st.c.bumps.find(q => q.x > tc && q.x - tc < 420);
    if (b && st.stack.length >= 3) hintOnce(st, 'hold' + st.k, Cc, 'A bump! Hold ' + key(Cc, 'act') + ' to steady the load', 3.2);
  }

  /* ---------- the barn: count the load, swap jobs ---------- */
  function enterBarn(st) {
    const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
    st.state = 'barn';
    st.barn = { t: 0, last, n: st.stack.length, counted: 0, next: 0.6, said: false, x0: st.tr.s };
    st.stats.roomT[st.k] = G.time - st.segStart;
    if (last) st.stats.finishT = G.time;
    st.cat.hold = false;
    Sfx.play('haytractorArrive');
    pop(st, st.c.barn.x + 60, gyAt(st, st.c.barn.x) - 230, last ? 'The Big Barn!' : 'The barn!', C.gold, 28);
  }
  function barnStep(st, dt) {
    const B = st.barn, tr = st.tr, bx = st.c.barn.x;
    B.t += dt;
    // the tractor rolls up to the big doors and stops
    const park = bx - 160;
    tr.v = approach(tr.v, clamp((park - tr.s) * 2.2, -60, 160), 420 * dt);
    tr.s += tr.v * dt; tr.wheel += tr.v * dt / S.rearR;
    if (tr.s > park) { tr.s = park; tr.v = 0; }
    // the load goes into the barn one item at a time
    const gap = Math.min(0.12, 1.9 / Math.max(1, B.n));
    if (B.t >= B.next && st.stack.length) {
      B.next = B.t + gap;
      const q = st.stack.pop(), sp = slotPos(st, st.stack.length);
      st.toBarn.push({ k: q.k, x0: sp.x, y0: sp.y, t: 0 });
      st.delivered++; B.counted++; if (q.k === 'c') st.stats.corn++;
      Sfx.play('haytractorCount', 0);
    }
    for (const f of st.toBarn) f.t += dt;
    st.toBarn = st.toBarn.filter(f => f.t < 0.6);
    const doneT = 0.6 + gap * B.n + 0.3;
    if (B.t >= doneT && !B.said) {
      B.said = true;
      Sfx.play(B.n ? 'haytractorBarn' : 'haytractorSwap');
      const word = B.n === 0 ? 'Empty wagon... next field!' : B.n === 1 ? '1 in the barn!' : B.n + ' in the barn!';
      pop(st, bx + 40, gyAt(st, bx) - 200, word, C.gold, 30);
      for (let i = 0; i < 16; i++) spark(st, bx + 30, gyAt(st, bx) - 120, i % 2 ? C.gold : '#ffffff', 1);
      rumble(0, 0.2, 0.5, 200); rumble(1, 0.2, 0.5, 200);
    }
    if (!B.last) {
      const swapAt = Math.max(doneT + 0.35, 1.9);
      if (B.t > swapAt && !B.swapped) { B.swapped = true; B.hopT = B.t; Sfx.play('haytractorSwap'); pop(st, tr.s - 80, gyAt(st, tr.s) - 170, 'Swap jobs!', '#ffffff', 30); Sfx.play('haytractorHop', 0); Sfx.play('haytractorHop', 1); }
      if (B.swapped && B.t >= B.hopT + 1.25) { nextRoom(); return true; }
    } else {
      if (B.t > doneT && !B.party) { B.party = true; Sfx.play('haytractorFanfare'); }
      if (B.party && Math.random() < dt * 30) { const a = -Math.PI * (0.15 + 0.7 * Math.random()), sp = 160 + Math.random() * 180; part(st, bx + 40, gyAt(st, bx) - 160, Math.cos(a) * sp, Math.sin(a) * sp, 1.7, ['#ffd36b', '#ffffff', '#ff9fb5', '#9fe8ff', '#8fe3b0', '#ff8a5a'][Math.floor(Math.random() * 6)], 4, 140, 'conf'); }
      if (B.t >= Math.max(S.finT, doneT + 1.8) && !B.cleared) {
        B.cleared = true;
        G.level.goal = { x: bx + 40 - st.cam.x, y: gyAt(st, bx) - 160 };
        levelClear();
      }
      return !!B.cleared;
    }
    return false;
  }

  /* ---------- what to do next (prompts, chips and the computer read this) ---------- */
  // when (and where along the wagon) the catcher could catch item it: { t, rel, jump, jumpAt } or null
  function catchSpot(st, it, v) {
    const tc = tcOf(st), c = st.cat;
    let x = it.x, y = it.y, vx = it.vx, vy = it.vy, best = null;
    const dt = 1 / 60;
    for (let t = dt; t < 2.6; t += dt) {
      vy += it.g * dt; x += vx * dt; y += vy * dt;
      const wc = tc + v * t, rel = x - wc;
      const dTop = gyAt(st, wc) - S.deckH + (gyAt(st, wc + S.wheelOff) - gyAt(st, wc - S.wheelOff)) / (2 * S.wheelOff) * rel;
      const hy = dTop - S.headH;
      if (y + ITEM[it.k].r > gyAt(st, x)) break;
      if (Math.abs(rel) <= S.uMax + 14 && y + ITEM[it.k].r >= dTop) break; // (it reached the deck)
      if (Math.abs(rel) > S.uMax + 18 || vy < -160) continue;
      if (y > hy - 16 && y < hy + 20) {
        // a standing catch is best, if the catcher can walk there in time (else a jump catch found earlier)
        const walkT = Math.abs(rel - c.u) / S.walk;
        if (!best || walkT <= t + 0.05) best = { t, rel: clamp(rel, -S.uMax, S.uMax), jump: false, jumpAt: 99 };
        break;
      }
      if (!best && y < hy - 16 && y > hy - 16 - 84) {
        // reachable by jumping: when to jump so the head is up there at time t
        const need = clamp(hy - y + 4, 0, S.jumpV * S.jumpV / (2 * S.jumpG) - 1), V = S.jumpV, g = S.jumpG;
        const tau = (V - Math.sqrt(Math.max(0, V * V - 2 * g * need))) / g;
        const walkT = Math.abs(rel - c.u) / S.walk;
        if (t - tau >= -0.02 && walkT <= t + 0.05) best = { t, rel: clamp(rel, -S.uMax, S.uMax), jump: true, jumpAt: t - tau };
      }
    }
    return best;
  }
  function plan(st) {
    const out = { vWant: 0, dWhy: 'none', honk: false, uWant: null, cWhy: 'none', jumpNow: false, jumpSoon: false, holdNow: false, item: null, bump: null, scoop: null, catchT: 99 };
    if (!st.c || st.state !== 'go') return out;
    const tr = st.tr, tc = tcOf(st), c = st.cat, v = tr.v, pace = st.c.pace;
    // ---- the driver ----
    let vWant = pace, why = 'pace';
    // a lying item behind or under the wagon: back up and stop over it (while it's still there)
    let scoop = null;
    for (const it of st.items) {
      if (it.st !== 'lie' || it.lieT < 1.2 || it.skip) continue;
      const rel = it.x - tc;
      if (rel < -S.deckHalf - 300 || rel > S.deckHalf + 260) continue;
      if (!scoop || Math.abs(rel) < Math.abs(scoop.x - tc)) scoop = it;
    }
    if (scoop) {
      const rel = scoop.x - tc;
      if (rel < -S.deckHalf + 20) { vWant = -Math.min(S.revMax - 10, 60 + (-rel - S.deckHalf) * 0.4); why = 'back'; }
      else if (rel > S.deckHalf - 20) { vWant = Math.min(S.scoopV - 15, 50 + (rel - S.deckHalf) * 0.4); why = 'creep'; }
      else { vWant = 0; why = 'scoop'; }
      out.scoop = scoop;
    }
    // bumps: be under the safe speed when the wagon gets there
    let bump = null, bd = 1e9;
    const dirV = vWant >= 0 ? 1 : -1;
    for (const b of st.c.bumps) { const d = (b.x - tc) * dirV; if (d >= -4 && d < bd) { bd = d; bump = b; } }
    if (bump && bd < 420) {
      const vs = bump.safe - 16, av = Math.abs(v);
      const need = Math.max(0, av * av - vs * vs) / (2 * S.brake) + 40 + av * 0.25;
      if (bd < need && Math.abs(vWant) > vs) { vWant = dirV * vs; why = 'bump'; }
    } else bump = null;
    out.bump = bump;
    // sheep or geese ahead: honk; stop if they are in the way
    const front = tr.s + 100;
    for (const fl of st.c.flocks) {
      if ((fl.st === 'walk' || fl.st === 'road') && fl.x - front < S.honkReach - 60 && fl.x - front > -100) { out.honk = true; if (fl.x - 64 - front < 80 && vWant > 0) { vWant = 0; why = 'flock'; } }
    }
    for (const b of st.birds) if ((b.st === 'in' && b.x - tc < 500) || b.st === 'peck') out.honk = true;
    out.vWant = vWant; out.dWhy = why;
    // ---- the catcher ----
    let pick = null;
    for (const it of st.items) {
      if (it.st !== 'fly') continue;
      const sp = catchSpot(st, it, v);
      if (!sp) continue;
      const walkT = Math.abs(sp.rel - c.u) / S.walk;
      const ok = walkT <= sp.t + 0.08;
      if (!pick || (ok && !pick.ok) || (ok === pick.ok && sp.t < pick.sp.t)) pick = { it, sp, ok };
    }
    if (pick) {
      out.item = pick.it; out.uWant = pick.sp.rel; out.cWhy = pick.sp.jump ? 'jump' : 'catch'; out.catchT = pick.sp.t;
      if (pick.sp.jump) { out.jumpSoon = pick.sp.jumpAt < 0.7; out.jumpNow = pick.sp.jumpAt <= 0.03 && Math.abs(pick.sp.rel - c.u) < 26; }
    }
    // a hard bump coming under the wagon: hold on (unless a catch comes first)
    if (bump && Math.abs(v) > bump.safe + 4 && st.stack.length) {
      const d = Math.abs(bump.x - tc), tt = d / Math.max(1, Math.abs(v));
      if (tt < 0.55 && (!pick || pick.sp.t > tt + 0.35)) { out.holdNow = true; out.cWhy = 'hold'; }
    }
    if (!pick && !out.holdNow && scoop) {
      const rel = scoop.x - tc;
      if (Math.abs(rel) < S.deckHalf) { out.uWant = clamp(rel, -S.uMax, S.uMax); out.cWhy = 'scoop'; }
    }
    if (out.uWant == null) { out.uWant = 20; out.cWhy = out.holdNow ? 'hold' : 'ready'; }
    return out;
  }

  /* ---------- small helpers ---------- */
  function hint(st, id, text, life) { if (quiet(id)) return; st.hints[id] = { text, t: 0, life: life || 2.8 }; }
  function msg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
  function pop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 10) st.pops.shift(); }
  function part(st, x, y, vx, vy, life, col, size, grav, kind) {
    if (st.parts.length > 300) st.parts.shift();
    st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
  }
  function spark(st, x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 120; part(st, x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.55, col, 3 + Math.random() * 2, 0, 'star'); } }
  function puff(st, x, y, col) { for (let i = 0; i < 6; i++) part(st, x + (Math.random() - 0.5) * 20, y, (Math.random() - 0.5) * 60, -30 - Math.random() * 40, 0.6, col, 4, 40, 'dust'); }
  // the touch buttons and the top-bar legend name each player's own action this field: the driver honks, the catcher holds
  let labelEls = null;
  function actLabels(st) {
    try {
      if (!labelEls || !labelEls.every(o => document.contains(o.el))) labelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
        const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
        const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
        return { el, id };
      });
      let changed = false;
      for (const o of labelEls) {
        const want = o.id < 0 ? 'honk/hold' : o.id === st.drive ? 'honk' : 'hold';
        if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
      }
      if (changed && typeof fitActLabels === 'function') fitActLabels();
    } catch (e) { /* labels stay as the framework set them */ }
  }
  function cam(st, dt) {
    const tr = st.tr, c = st.c;
    let tx = tr.s - S.camLead + clamp(tr.v * 0.45, -40, 100);
    if (st.state === 'barn' && c.barn) tx = c.barn.x - 600;
    tx = clamp(tx, c.x0, c.len - W);
    st.cam.x += (tx - st.cam.x) * Math.min(1, dt * 2.6);
    // never let the tractor or the back of the wagon leave the screen
    if (tr.s + 130 - st.cam.x > W - 10) st.cam.x = tr.s + 130 - (W - 10);
    if (tcOf(st) - S.deckHalf - 30 - st.cam.x < 0) st.cam.x = tcOf(st) - S.deckHalf - 30;
  }
  function fx(st, dt) {
    for (let i = st.parts.length - 1; i >= 0; i--) {
      const q = st.parts[i];
      if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
      q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 5;
      if (q.kind === 'smoke' || q.kind === 'note') { q.vx *= 1 - dt * 1.5; q.size += dt * 6; }
      if (q.kind === 'dust') q.vx *= 1 - dt * 2;
    }
    for (const q of st.pops) q.t += dt;
    st.pops = st.pops.filter(q => q.t < 1.3);
    for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
    if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
    // hay dust from the wheels while driving
    if (Math.abs(st.tr.v) > 90 && Math.random() < dt * 8) { const x = st.tr.s - 10; part(st, x, gyAt(st, x) - 2, -30 - Math.random() * 30, -20 - Math.random() * 20, 0.7, 'rgba(217,176,122,0.7)', 3, 20, 'dust'); }
  }
  // where a player is drawn (world px, feet): the driver on the seat, the catcher on the wagon; hopping during a swap
  function seatSpot(st, id) {
    const pose = tractorPose(st), seat = toWorld(pose, -10, -43), c = st.cat, tc = tcOf(st);
    const cx = tc + c.u, catchSpot = { x: cx, y: deckTop(st, cx) - c.jy };
    let a = id === st.drive ? seat : catchSpot, hop = 0;
    const B = st.barn;
    if (B && B.swapped && !B.last) {
      const u = clamp((B.t - B.hopT - 0.2) / 0.9, 0, 1), b = id === st.drive ? catchSpot : seat;
      a = { x: lerp(a.x, b.x, smooth(u)), y: lerp(a.y, b.y, u) };
      hop = Math.sin(u * Math.PI) * (id === st.drive ? 70 : 54);
    }
    return { x: a.x, y: a.y - hop, hop, seat: id === st.drive && hop < 4, lean: id === st.drive ? pose.a : deckSlope(st) };
  }
  // copy the seats into the engine players (screen px): name tags and bubbles read p.x / p.y
  function mirror(st) {
    const cam = st.cam;
    for (const p of G.players) {
      const sp = seatSpot(st, p.id);
      p.x = sp.x - cam.x - PW / 2; p.y = sp.y - PH * 0.9 - (sp.seat ? 6 : 2);
      p.alive = true; p.grounded = true; p.stompSafe = 0; p.vy = 0; p.vx = st.tr.v;
      p.face = 1; p.stun = 0;
    }
  }

  /* ---------- drawing ---------- */
  const LOOK = {
    meadow: { skyT: '#6ec3f2', skyB: '#fff3c4', far: '#b9dc7a', far2: '#9fd06a', field: '#ead07a', fieldD: '#d2b45a', grass: '#7fd05a', grassD: '#4a9a3c', dirt: '#d2a06a', dirtD: '#a8784a', sun: '#fff4be', crop: 'hay' },
    patch: { skyT: '#78c6ee', skyB: '#fdf0c8', far: '#a8d27a', far2: '#8cc65a', field: '#86c05a', fieldD: '#5e9a3c', grass: '#7fd05a', grassD: '#4a9a3c', dirt: '#c9925a', dirtD: '#9a6a3a', sun: '#fff4be', crop: 'pumpkin' },
    hills: { skyT: '#5fb8f0', skyB: '#e9f6ff', far: '#8ec86a', far2: '#6fb454', field: '#a6d46a', fieldD: '#7cb24a', grass: '#79c955', grassD: '#438f36', dirt: '#c99560', dirtD: '#9a6a3a', sun: '#fff4be', crop: 'corn' },
    sunset: { skyT: '#f08a6a', skyB: '#ffe2a0', far: '#c99a6a', far2: '#b98a5a', field: '#f0c070', fieldD: '#d09a50', grass: '#9cc955', grassD: '#5f9a3c', dirt: '#c98e5a', dirtD: '#94643a', sun: '#ffd27a', crop: 'hay' },
  };
  function draw(st) {
    const cam = st.cam, lk = LOOK[st.look] || LOOK.meadow;
    drawSky(st, lk);
    drawFar(st, lk);
    drawMid(st, lk);
    ctx.save(); ctx.translate(-Math.round(cam.x * 10) / 10, 0);
    drawBank(st, lk);
    for (const s of st.c.signs) drawSign(st, s);
    for (const b of st.c.bumps) drawBumpSign(st, b);
    drawBarn(st, false);
    for (const tz of st.c.tossers) if (tz.x > cam.x - 160 && tz.x < cam.x + W + 160) drawTosser(st, tz);
    drawRoad(st, lk);
    for (const b of st.c.bumps) if (b.x > cam.x - 60 && b.x < cam.x + W + 60) drawBump(st, b);
    for (const fl of st.c.flocks) drawFlock(st, fl);
    ctx.restore();
  }
  function drawTop(st) {
    const cam = st.cam;
    ctx.save(); ctx.translate(-Math.round(cam.x * 10) / 10, 0);
    for (const it of st.items) if (it.st === 'lie') drawItem(it.k, it.x, it.y, 0, it.lieT < 2 ? 0.4 + 0.6 * (Math.sin(G.clock * 14) > 0 ? 1 : 0.4) : 1, false);
    drawWagon(st);
    drawCrew(st, 'catch');
    drawTractor(st);
    for (const b of st.birds) drawCrow(st, b);
    for (const f of st.toBarn) { const bx = st.c.barn.x, u = smooth(clamp(f.t / 0.5, 0, 1)), tx = bx + 80, ty = gyAt(st, bx) - 50; drawItem(f.k, lerp(f.x0, tx, u), lerp(f.y0, ty, u) - Math.sin(u * Math.PI) * 60, u * 5, 1 - clamp((f.t - 0.45) / 0.15, 0, 1), false); }
    for (const it of st.items) if (it.st === 'fly' || it.st === 'bounce') { if (it.gold) { ctx.fillStyle = 'rgba(255,215,90,0.35)'; circle(it.x, it.y, 22 + Math.sin(G.clock * 10) * 3); ctx.fill(); } drawItem(it.k, it.x, it.y, it.rot, 1, it.gold); }
    drawBarn(st, true);
    for (const q of st.parts) {
      if (q.x < cam.x - 40 || q.x > cam.x + W + 40) continue;
      const a = clamp(q.life / q.max, 0, 1);
      ctx.globalAlpha = a; ctx.fillStyle = q.col;
      if (q.kind === 'star') { starPath(q.x, q.y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
      else if (q.kind === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
      else if (q.kind === 'note') text('♪', q.x, q.y, 14 + q.size, '#ffffff', 'center', 'body');
      else if (q.kind === 'smoke') { ctx.globalAlpha = a * 0.7; circle(q.x, q.y, q.size); ctx.fill(); }
      else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    const big = hudBig();
    for (const q of st.pops) {
      const x = clamp(q.x - cam.x, 120, W - 120), y = clamp(q.y - q.t * 30, 96, H - 120);
      ctx.globalAlpha = clamp((1.3 - q.t) / 0.3, 0, 1);
      bigText(q.s, x, y, q.size * (big ? 1.3 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
      ctx.globalAlpha = 1;
    }
  }
  function starPath(x, y, ro, ri, rot) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = rot - Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
  }
  const skyCache = {};
  function drawSky(st, lk) {
    let g = skyCache[st.look];
    if (!g) { g = ctx.createLinearGradient(0, 0, 0, H * 0.8); g.addColorStop(0, lk.skyT); g.addColorStop(1, lk.skyB); skyCache[st.look] = g; }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // the sun (low and big at sunset)
    const sunset = st.look === 'sunset', sx = sunset ? 700 : 820, sy = sunset ? 250 : 92, sr = sunset ? 54 : 38;
    ctx.fillStyle = sunset ? 'rgba(255,190,110,0.35)' : 'rgba(255,230,150,0.35)'; circle(sx, sy, sr * 1.8); ctx.fill();
    ctx.fillStyle = lk.sun; circle(sx, sy, sr); ctx.fill();
    // fluffy clouds drifting
    const cx = st.cam.x * 0.06 + G.clock * 6;
    for (let k = 0; k < 5; k++) {
      const x = ((k * 263 - cx) % 1300 + 1300) % 1300 - 170, y = 60 + (k * 37) % 90, s = 0.8 + (k % 3) * 0.25;
      ctx.fillStyle = sunset ? 'rgba(255,236,220,0.85)' : 'rgba(255,255,255,0.92)';
      circle(x, y, 18 * s); ctx.fill(); circle(x + 22 * s, y - 9 * s, 23 * s); ctx.fill(); circle(x + 46 * s, y, 17 * s); ctx.fill(); rr(x - 14 * s, y, 76 * s, 17 * s, 8 * s); ctx.fill();
    }
  }
  // far hills with a Ferris wheel and fair tents; red barns and silos
  function drawFar(st, lk) {
    const cam = st.cam;
    for (const [par, col, base, amp] of [[0.08, lk.far, 300, 26], [0.18, lk.far2, 330, 22]]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 16) { const wx = x + cam.x * par; ctx.lineTo(x, base + Math.sin(wx * 0.006 + par * 10) * amp + Math.sin(wx * 0.017) * 8); }
      ctx.lineTo(W, H); ctx.fill();
      if (par === 0.08) {
        // the county fair far away: a Ferris wheel and striped tents (bigger and nearer in the last field)
        const near = st.look === 'sunset' ? Math.min(1, Math.max(0, (st.tr.s - 2400) / 4000)) : 0;
        const fx = ((1400 - cam.x * par) % 1800 + 1800) % 1800 - 300 + (st.look === 'sunset' ? 0 : 0);
        const fy = base - 10, R = 46 + near * 40;
        ferris(fx, fy - R - 6, R, G.clock * 0.25);
        for (let i = 0; i < 3; i++) tent(fx + 70 + i * 46, fy + 4, ['#ff6b6b', '#ffd36b', '#6bb6ff'][i]);
      } else {
        const off = cam.x * par, k0 = Math.floor((off - 200) / 520), k1 = Math.floor((off + W + 200) / 520);
        for (let k = k0; k <= k1; k++) {
          const h = hash(k, 61), x = k * 520 + (h % 200) - off, wx = x + off;
          const y = base + Math.sin(wx * 0.006 + par * 10) * amp + Math.sin(wx * 0.017) * 8 + 6;
          if (h % 3 === 0) { farBarn(x, y, 0.55); if (h % 2) silo(x + 44, y, 0.55); }
          else if (h % 3 === 1) { tree(x, y, 0.7); tree(x + 30, y + 2, 0.55); }
          else windmill(x, y, 0.6, G.clock);
        }
      }
    }
  }
  function ferris(x, y, R, a) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
    circle(x, y, R); ctx.stroke();
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) { const b = a + i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(b) * R, y + Math.sin(b) * R); ctx.stroke(); }
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - R * 0.5, y + R + 8); ctx.lineTo(x, y); ctx.lineTo(x + R * 0.5, y + R + 8); ctx.stroke();
    const cols = ['#ff6b6b', '#ffd36b', '#6bb6ff', '#8fe3b0', '#ff9fd0', '#c8a0ff', '#ffb36b', '#6be0d0'];
    for (let i = 0; i < 8; i++) { const b = a + i * Math.PI / 4; ctx.fillStyle = cols[i]; rr(x + Math.cos(b) * R - 5, y + Math.sin(b) * R, 10, 8, 3); ctx.fill(); }
  }
  function tent(x, y, col) {
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - 20, y); ctx.lineTo(x, y - 30); ctx.lineTo(x + 20, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(x - 20 + i * 20, y); ctx.lineTo(x, y - 30); ctx.lineTo(x - 10 + i * 20, y); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = '#8a5a36'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(x, y - 38); ctx.stroke(); ctx.fillStyle = col; ctx.fillRect(x, y - 38, 7, 4);
  }
  function farBarn(x, y, s) {
    ctx.fillStyle = '#c8483c'; ctx.fillRect(x - 24 * s, y - 34 * s, 48 * s, 34 * s);
    ctx.fillStyle = '#7e2a22'; ctx.beginPath(); ctx.moveTo(x - 28 * s, y - 32 * s); ctx.lineTo(x - 16 * s, y - 50 * s); ctx.lineTo(x + 16 * s, y - 50 * s); ctx.lineTo(x + 28 * s, y - 32 * s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 * s; ctx.strokeRect(x - 9 * s, y - 20 * s, 18 * s, 20 * s);
  }
  function silo(x, y, s) {
    ctx.fillStyle = '#d8dce6'; ctx.fillRect(x - 9 * s, y - 60 * s, 18 * s, 60 * s);
    ctx.fillStyle = '#a8b0c0'; ctx.beginPath(); ctx.arc(x, y - 60 * s, 9 * s, Math.PI, 0); ctx.fill();
  }
  function tree(x, y, s) {
    ctx.fillStyle = '#8a5a36'; ctx.fillRect(x - 3 * s, y - 24 * s, 6 * s, 24 * s);
    ctx.fillStyle = '#4fa04a'; circle(x, y - 34 * s, 17 * s); ctx.fill(); circle(x - 11 * s, y - 26 * s, 12 * s); ctx.fill(); circle(x + 11 * s, y - 27 * s, 12 * s); ctx.fill();
  }
  function windmill(x, y, s, t) {
    ctx.fillStyle = '#e8e2d4'; ctx.beginPath(); ctx.moveTo(x - 8 * s, y); ctx.lineTo(x - 3 * s, y - 60 * s); ctx.lineTo(x + 3 * s, y - 60 * s); ctx.lineTo(x + 8 * s, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4 * s;
    for (let i = 0; i < 4; i++) { const a = t * 1.2 + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(x, y - 60 * s); ctx.lineTo(x + Math.cos(a) * 26 * s, y - 60 * s + Math.sin(a) * 26 * s); ctx.stroke(); }
  }
  // the fields behind the road: rows of hay, pumpkins or corn on a nearer band
  function drawMid(st, lk) {
    const cam = st.cam, par = 0.45, base = 372;
    ctx.fillStyle = lk.field; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 12) { const wx = x + cam.x * par; ctx.lineTo(x, base + Math.sin(wx * 0.004) * 12 + Math.sin(wx * 0.013) * 5); }
    ctx.lineTo(W, H); ctx.fill();
    const off = cam.x * par;
    if (lk.crop === 'hay') {
      // round hay bales and stripes
      ctx.strokeStyle = lk.fieldD; ctx.lineWidth = 2;
      for (let k = Math.floor((off - 40) / 60); k <= Math.floor((off + W + 40) / 60); k++) {
        const x = k * 60 - off, wx = x + off, y = base + Math.sin(wx * 0.004) * 12 + Math.sin(wx * 0.013) * 5;
        ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x - 30, y + 60); ctx.stroke();
        if (hash(k, 5) % 4 === 0) { ctx.fillStyle = '#f2cf63'; circle(x + 10, y + 4, 11); ctx.fill(); ctx.strokeStyle = '#c99a3a'; circle(x + 10, y + 4, 6); ctx.stroke(); ctx.strokeStyle = lk.fieldD; }
      }
    } else if (lk.crop === 'pumpkin') {
      for (let k = Math.floor((off - 40) / 34); k <= Math.floor((off + W + 40) / 34); k++) {
        const x = k * 34 - off, wx = x + off, y = base + Math.sin(wx * 0.004) * 12 + Math.sin(wx * 0.013) * 5;
        const h = hash(k, 9);
        ctx.strokeStyle = lk.fieldD; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 17, y + 12); ctx.quadraticCurveTo(x, y + 4, x + 17, y + 12); ctx.stroke();
        if (h % 3 !== 1) { ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.ellipse(x, y + 12 + (h % 20), 8, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#3f7a2a'; ctx.fillRect(x - 1, y + 5 + (h % 20), 2, 3); }
      }
    } else {
      for (let k = Math.floor((off - 40) / 18); k <= Math.floor((off + W + 40) / 18); k++) {
        const x = k * 18 - off, wx = x + off, y = base + Math.sin(wx * 0.004) * 12 + Math.sin(wx * 0.013) * 5;
        const sway = Math.sin(G.clock * 1.5 + k * 0.7) * 2;
        ctx.strokeStyle = '#5e9a3c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x + sway, y - 12); ctx.stroke();
        ctx.fillStyle = '#f2d060'; ctx.beginPath(); ctx.ellipse(x + sway + 2, y - 4, 2.5, 5, 0.3, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // the grassy bank behind the road: a wooden fence, flowers
  function drawBank(st, lk) {
    const cam = st.cam, x0 = Math.floor((cam.x - 20) / 8) * 8, x1 = cam.x + W + 20;
    ctx.fillStyle = lk.grass; ctx.beginPath(); ctx.moveTo(x0, H);
    for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, gyAt(st, x) - 26);
    ctx.lineTo(x1, H); ctx.closePath(); ctx.fill();
    // the fence (behind the tossers): posts and two rails
    ctx.strokeStyle = '#c89a6a'; ctx.lineWidth = 3;
    for (const dy of [44, 58]) { ctx.beginPath(); for (let x = x0; x <= x1; x += 16) ctx.lineTo(x, gyAt(st, x) - 26 - dy); ctx.stroke(); }
    ctx.fillStyle = '#a8784a';
    for (let x = Math.floor(x0 / 80) * 80; x < x1; x += 80) { const y = gyAt(st, x) - 26; ctx.fillRect(x - 3, y - 66, 6, 66); }
    for (let x = Math.floor(x0 / 34) * 34; x < x1; x += 34) {
      const h = hash(x, 23), y = gyAt(st, x) - 24;
      if (h % 4 === 0) { ctx.fillStyle = ['#ffffff', '#ffd36b', '#ff9fd0'][h % 3]; circle(x + (h % 20), y - 4, 3); ctx.fill(); }
    }
  }
  // the dirt road along the ground, grass in front of it, creeks under the little bridges
  function drawRoad(st, lk) {
    const cam = st.cam, x0 = Math.floor((cam.x - 20) / 8) * 8, x1 = cam.x + W + 20;
    // creeks under bridges
    for (const cr of st.c.creeks) {
      if (cr.x1 < x0 || cr.x0 > x1) continue;
      ctx.fillStyle = '#6ec6f0'; rr(cr.x0 - 10, cr.y - 6, cr.x1 - cr.x0 + 20, H - cr.y + 10, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) { const yy = cr.y + 40 + k * 26, xx = cr.x0 + ((G.clock * 30 + k * 40) % (cr.x1 - cr.x0)); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 18, yy); ctx.stroke(); }
    }
    // the road surface: a dirt band
    ctx.fillStyle = lk.dirt; ctx.beginPath();
    for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, gyAt(st, x) - 12);
    for (let x = x1; x >= x0; x -= 8) ctx.lineTo(x, gyAt(st, x) + 8);
    ctx.closePath(); ctx.fill();
    // wheel ruts and pebbles
    ctx.strokeStyle = lk.dirtD; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, gyAt(st, x) - 4);
    ctx.stroke();
    for (let x = Math.floor(x0 / 30) * 30; x < x1; x += 30) { const h = hash(x, 41); if (h % 3 === 0) { ctx.fillStyle = lk.dirtD; circle(x + (h % 20), gyAt(st, x) - 8 + (h % 12), 1.8); ctx.fill(); } }
    // grass in front (below the road) down to the bottom
    ctx.fillStyle = lk.grass; ctx.beginPath(); ctx.moveTo(x0, H + 10);
    for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, gyAt(st, x) + 6);
    ctx.lineTo(x1, H + 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = lk.grassD; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, gyAt(st, x) + 7);
    ctx.stroke();
    // bridges: planks and rails over the creeks
    for (const cr of st.c.creeks) {
      if (cr.x1 < x0 || cr.x0 > x1) continue;
      ctx.fillStyle = '#c8955a'; ctx.fillRect(cr.x0 - 4, cr.y - 10, cr.x1 - cr.x0 + 8, 18);
      ctx.strokeStyle = '#8a5a36'; ctx.lineWidth = 2;
      for (let x = cr.x0; x <= cr.x1; x += 14) { ctx.beginPath(); ctx.moveTo(x, cr.y - 10); ctx.lineTo(x, cr.y + 8); ctx.stroke(); }
      ctx.fillStyle = '#8a5a36'; ctx.fillRect(cr.x0 - 4, cr.y + 8, cr.x1 - cr.x0 + 8, 5);
      for (const px of [cr.x0, cr.x1]) { ctx.fillRect(px - 4, cr.y + 8, 8, 60); }
    }
    // tufts of grass and flowers in front
    for (let x = Math.floor(x0 / 26) * 26; x < x1; x += 26) {
      const h = hash(x, 77), y = gyAt(st, x) + 22 + (h % 60);
      if (y > H - 6) continue;
      ctx.strokeStyle = lk.grassD; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y - 8); ctx.moveTo(x + 3, y); ctx.lineTo(x + 5, y - 9); ctx.stroke();
      if (h % 5 === 0) { ctx.fillStyle = ['#ffffff', '#ffd36b', '#ff9fd0', '#c8a0ff'][h % 4]; circle(x + 1, y - 10, 3); ctx.fill(); }
    }
  }
  function drawSign(st, s) {
    const cam = st.cam;
    if (s.x < cam.x - 400 || s.x > cam.x + W + 400) return;
    const y = gyAt(st, s.x) - 22;
    ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(s.text).width + 22;
    ctx.fillStyle = '#8a5a36'; ctx.fillRect(s.x - 3, y - 54, 6, 54);
    ctx.fillStyle = '#fff6dc'; ctx.strokeStyle = '#a8784a'; ctx.lineWidth = 3; rr(s.x - w / 2, y - 86, w, 32, 8); ctx.fill(); ctx.stroke();
    text(s.text, s.x, y - 69.5, 15, C.ink, 'center', 'body');
  }
  // a little yellow warning sign before every bump
  function drawBumpSign(st, b) {
    const x = b.x - 150;
    if (x < st.cam.x - 60 || x > st.cam.x + W + 60 || b.kind === 'plank' && b !== st.c.bumps.find(q => q.kind === 'plank' && Math.abs(q.x - b.x) < 400)) return;
    const y = gyAt(st, x) - 22, big = b.size === 2;
    ctx.fillStyle = '#7a6a5a'; ctx.fillRect(x - 2, y - 40, 4, 40);
    ctx.save(); ctx.translate(x, y - 52); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(-12, -12, 24, 24, 3); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(x - 9, y - 47); ctx.quadraticCurveTo(x, y - (big ? 66 : 60), x + 9, y - 47); ctx.closePath(); ctx.fill();
  }
  function drawBump(st, b) {
    const y = gyAt(st, b.x), slow = Math.abs(st.tr.v) <= b.safe;
    void slow;
    if (b.kind === 'r' || b.kind === 'R') {
      const s = b.kind === 'R' ? 1.5 : 1;
      ctx.fillStyle = '#9aa0ae'; ctx.strokeStyle = '#5c6278'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(b.x - 14 * s, y + 2); ctx.lineTo(b.x - 10 * s, y - 9 * s); ctx.lineTo(b.x - 2 * s, y - 13 * s); ctx.lineTo(b.x + 9 * s, y - 10 * s); ctx.lineTo(b.x + 14 * s, y + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(b.x - 3 * s, y - 8 * s, 4 * s, 2.4 * s, -0.3, 0, Math.PI * 2); ctx.fill();
    } else if (b.kind === 'u') {
      ctx.fillStyle = 'rgba(90,60,30,0.45)'; ctx.beginPath(); ctx.ellipse(b.x, y - 2, 20, 5, 0, 0, Math.PI * 2); ctx.fill();
    } else if (b.kind === 'H') {
      ctx.strokeStyle = 'rgba(90,60,30,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x - 20, y + 4); ctx.quadraticCurveTo(b.x, y - 6, b.x + 20, y + 4); ctx.stroke();
    } else if (b.kind === 'L') {
      ctx.fillStyle = '#a8703a'; ctx.strokeStyle = '#6e4420'; ctx.lineWidth = 2; rr(b.x - 26, y - 13, 52, 13, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8c08a'; ctx.beginPath(); ctx.ellipse(b.x + 24, y - 6.5, 4, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#a8703a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(b.x + 24, y - 6.5, 2, 3, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  /* farmers, the kid, the baler and the pumpkin catapult at the roadside */
  function drawTosser(st, tz) {
    const y = gyAt(st, tz.x) - 18, arm = clamp(tz.arm / 0.4, 0, 1), done = tz.i >= tz.items.length;
    const next = done ? null : tz.items[tz.i];
    if (tz.kind === 'farmer' || tz.kind === 'kid') {
      const s = tz.kind === 'kid' ? 0.66 : 0.88, x = tz.x;
      // a pile of what's left to toss
      for (let i = tz.i; i < tz.items.length; i++) drawItem(tz.items[i].toLowerCase(), x - 30 - (i - tz.i) * 8 * s, y - 8 - (i - tz.i) * 5, 0, 1, false, 0.7);
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      // legs and overalls
      ctx.fillStyle = '#3f6fb8'; rr(-11, -30, 22, 30, 5); ctx.fill();
      ctx.fillStyle = '#5a3a22'; ctx.fillRect(-10, -4, 8, 4); ctx.fillRect(2, -4, 8, 4);
      // shirt
      ctx.fillStyle = tz.kind === 'kid' ? '#ff9f43' : '#d8483c'; rr(-12, -52, 24, 26, 7); ctx.fill();
      ctx.fillStyle = '#3f6fb8'; ctx.fillRect(-7, -46, 4, 18); ctx.fillRect(3, -46, 4, 18);
      // arms: up when tossing
      ctx.strokeStyle = '#f2c09a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (const sx of [-10, 10]) { const sg = Math.sign(sx); ctx.beginPath(); ctx.moveTo(sx, -46); ctx.lineTo(sx + sg * lerp(5, 4, arm), -46 + lerp(14, -20, arm)); ctx.stroke(); }
      // head, hat
      ctx.fillStyle = '#f2c09a'; circle(0, -62, 10); ctx.fill();
      ctx.fillStyle = C.ink; circle(-3.5, -63, 1.6); ctx.fill(); circle(3.5, -63, 1.6); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -60, 4, 0.2, Math.PI - 0.2); ctx.stroke();
      if (tz.kind === 'kid') { ctx.fillStyle = '#6bb6ff'; ctx.beginPath(); ctx.arc(0, -66, 10, Math.PI, 0); ctx.fill(); ctx.fillRect(0, -68, 15, 4); }
      else { ctx.fillStyle = '#f2d27a'; ctx.beginPath(); ctx.ellipse(0, -70, 18, 4.5, 0, 0, Math.PI * 2); ctx.fill(); rr(-9, -82, 18, 13, 5); ctx.fill(); ctx.fillStyle = '#d8483c'; ctx.fillRect(-9, -73, 18, 3); }
      if (next && arm < 0.2) drawItem(next.toLowerCase(), 0, -86, 0, 1, false, 0.7);
      ctx.restore();
    } else if (tz.kind === 'baler') {
      const x = tz.x;
      ctx.fillStyle = '#2f9a5a'; rr(x - 40, y - 52, 70, 42, 8); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(x - 40, y - 34, 70, 6);
      ctx.fillStyle = '#2a2a3a'; circle(x - 22, y - 10, 11); ctx.fill(); circle(x + 14, y - 10, 11); ctx.fill();
      ctx.fillStyle = '#c8ccd8'; circle(x - 22, y - 10, 4); ctx.fill(); circle(x + 14, y - 10, 4); ctx.fill();
      // the chute pointing forward and up
      ctx.save(); ctx.translate(x + 24, y - 44); ctx.rotate(-0.6 - arm * 0.25);
      ctx.fillStyle = '#257a48'; ctx.fillRect(0, -9, 34, 18); ctx.restore();
      ctx.fillStyle = '#ffffff'; ctx.font = '700 11px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('BALER', x - 5, y - 40);
      if (arm > 0) for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(242,207,99,0.7)'; circle(x + 40 + i * 6, y - 66 - i * 6, 2.5); ctx.fill(); }
    } else {
      // the pumpkin catapult: a wooden frame with a spoon arm
      const x = tz.x;
      ctx.fillStyle = '#a8703a'; ctx.strokeStyle = '#6e4420'; ctx.lineWidth = 2;
      rr(x - 30, y - 16, 60, 10, 4); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 16, y - 12); ctx.lineTo(x - 2, y - 44); ctx.lineTo(x + 12, y - 12); ctx.stroke();
      ctx.fillStyle = '#2a2a3a'; circle(x - 20, y - 6, 7); ctx.fill(); circle(x + 20, y - 6, 7); ctx.fill();
      const since = 0.4 - tz.arm, swing = tz.arm <= 0 ? 0 : since < 0.08 ? since / 0.08 : Math.max(0, 1 - (since - 0.08) / 0.32);
      ctx.save(); ctx.translate(x - 2, y - 40); ctx.rotate(lerp(Math.PI + 0.35, Math.PI * 2 - 1.0, swing));
      ctx.strokeStyle = '#8a5a36'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(40, 0); ctx.stroke();
      ctx.fillStyle = '#6e4420'; ctx.beginPath(); ctx.ellipse(42, 4, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
      if (next && arm <= 0.05) drawItem(next.toLowerCase(), 42, 13, Math.PI, 1, false, 0.8);
      ctx.restore();
      for (let i = tz.i; i < tz.items.length; i++) drawItem(tz.items[i].toLowerCase(), x + 40 + ((i - tz.i) % 2) * 18, y - 10 - Math.floor((i - tz.i) / 2) * 16, 0, 1, false, 0.8);
    }
  }
  // hay bale, pumpkin or golden corn at (x, y) (centre)
  function drawItem(k, x, y, rot, alpha, gold, s) {
    s = s || 1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
    if (alpha != null && alpha < 1) ctx.globalAlpha *= alpha;
    if (k === 'b') {
      ctx.fillStyle = gold ? '#ffd84a' : '#f2cf63'; ctx.strokeStyle = '#b8862e'; ctx.lineWidth = 2;
      rr(-20, -12, 40, 24, 5); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(184,134,46,0.55)'; ctx.lineWidth = 1.2;
      for (const yy of [-5, 1, 6]) { ctx.beginPath(); ctx.moveTo(-17, yy); ctx.lineTo(17, yy + 1); ctx.stroke(); }
      ctx.strokeStyle = '#a0522d'; ctx.lineWidth = 2.2;
      for (const xx of [-9, 9]) { ctx.beginPath(); ctx.moveTo(xx, -12); ctx.lineTo(xx, 12); ctx.stroke(); }
    } else if (k === 'p') {
      ctx.fillStyle = '#ff8a2a'; ctx.strokeStyle = '#c85a12'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 1, 16, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 1, 7, 13, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(-7, -4, 3, 5, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4f8a2a'; rr(-2, -16, 5, 6, 2); ctx.fill();
      ctx.strokeStyle = '#4f8a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(5, -14, 4, Math.PI, Math.PI * 1.9); ctx.stroke();
    } else {
      ctx.fillStyle = '#7fc84a'; ctx.beginPath(); ctx.ellipse(-6, 2, 12, 5, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(-6, -2, 12, 4, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#c8961a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(4, 0, 13, 6.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffe98a'; for (let i = -2; i <= 2; i++) { circle(4 + i * 4.5, -2, 1.4); ctx.fill(); circle(4 + i * 4.5, 2, 1.4); ctx.fill(); }
      const tw = 0.5 + 0.5 * Math.sin(G.clock * 8 + x * 0.1);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * tw) + ')'; starPath(14, -8, 5, 2, G.clock); ctx.fill();
    }
    ctx.restore();
  }
  /* the hay wagon: wheels, deck, front rack, the stack, the wobble meter, the gold rope and scarecrow */
  function drawWagon(st) {
    const tc = tcOf(st), tr = st.tr, pose = tractorPose(st), sl = deckSlope(st);
    const dl = tc - S.deckHalf, dr = tc + S.deckHalf, yl = deckTop(st, dl), yr = deckTop(st, dr);
    // the drawbar to the tractor's hitch
    const hitch = toWorld(pose, -40, 6);
    ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(dr - 6, yr + 12); ctx.lineTo(hitch.x, hitch.y); ctx.stroke();
    // wheels
    for (const wx of [tc - S.wheelOff, tc + S.wheelOff]) {
      const wy = gyAt(st, wx) - S.wheelR;
      ctx.fillStyle = '#2a2a3a'; circle(wx, wy, S.wheelR); ctx.fill();
      ctx.fillStyle = '#ffd23f'; circle(wx, wy, S.wheelR - 5); ctx.fill();
      ctx.strokeStyle = '#b8901a'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) { const a = tr.s / S.wheelR + i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(wx - Math.cos(a) * (S.wheelR - 6), wy - Math.sin(a) * (S.wheelR - 6)); ctx.lineTo(wx + Math.cos(a) * (S.wheelR - 6), wy + Math.sin(a) * (S.wheelR - 6)); ctx.stroke(); }
      ctx.fillStyle = '#b8901a'; circle(wx, wy, 3.5); ctx.fill();
      // the axle frame to the deck
      ctx.fillStyle = '#5a4030'; ctx.fillRect(wx - 4, deckTop(st, wx) + 10, 8, Math.max(2, wy - deckTop(st, wx) - 10));
    }
    // the front rack (ladder) behind the stack
    ctx.save(); ctx.translate(dr, yr); ctx.rotate(sl);
    ctx.strokeStyle = '#a8703a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-6, -92); ctx.moveTo(-26, 0); ctx.lineTo(-26, -92); ctx.stroke();
    ctx.lineWidth = 3; for (let yy = -20; yy >= -88; yy -= 22) { ctx.beginPath(); ctx.moveTo(-28, yy); ctx.lineTo(-4, yy); ctx.stroke(); }
    ctx.restore();
    // the stack (back to front, bottom to top)
    for (let n = 0; n < st.stack.length; n++) {
      const q = st.stack[n], sp = slotPos(st, n);
      let x = sp.x, y = sp.y;
      if (q.anim < 1) { const u = smooth(q.anim); x = lerp(q.fx, sp.x, u); y = lerp(q.fy, sp.y, u) - Math.sin(u * Math.PI) * 40; }
      drawItem(q.k, x, y, (sl + (sp.row ? Math.sin(G.clock * 9 + n) * st.wobShow * 0.06 : 0)), 1, false);
    }
    // the gold rope over the load
    if (st.gold.rope && st.stack.length) {
      const top = slotPos(st, st.stack.length - 1).y - 14;
      ctx.strokeStyle = C.gold; ctx.lineWidth = 4;
      for (const xx of [-50, 0, 50]) { ctx.beginPath(); ctx.moveTo(tc + xx - 30, deckTop(st, tc + xx - 30)); ctx.quadraticCurveTo(tc + xx, top - 10, tc + xx + 30, deckTop(st, tc + xx + 30)); ctx.stroke(); }
    }
    // the deck itself (in front of the stack)
    ctx.fillStyle = '#c8955a'; ctx.strokeStyle = '#7a5030'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(dl, yl); ctx.lineTo(dr, yr); ctx.lineTo(dr, yr + 12); ctx.lineTo(dl, yl + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(122,80,48,0.6)'; ctx.lineWidth = 1.5;
    for (let x = dl + 27; x < dr; x += 27) { ctx.beginPath(); ctx.moveTo(x, deckTop(st, x)); ctx.lineTo(x, deckTop(st, x) + 12); ctx.stroke(); }
    // the gold scarecrow riding at the back
    if (st.gold.scare) drawScarecrow(dl + 14, deckTop(st, dl + 14));
    // the wobble meter on the back of the wagon
    const mx = dl - 16, my = yl - 64, w = st.wobShow;
    ctx.fillStyle = 'rgba(28,26,54,0.75)'; rr(mx - 9, my - 4, 18, 66, 8); ctx.fill();
    const fh = 58 * clamp(w, 0, 1);
    ctx.fillStyle = st.gold.rope ? C.gold : w < 0.45 ? '#7fd05a' : w < 0.75 ? '#ffd23f' : (Math.sin(G.clock * 16) > 0 ? '#ff6a5a' : '#ffa08a');
    if (fh > 1) { rr(mx - 5, my + 58 - fh, 10, fh, 5); ctx.fill(); }
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; rr(mx - 9, my - 4, 18, 66, 8); ctx.stroke();
    // the spill line, and a little wobbly stack of bales on top
    ctx.fillStyle = '#ff6a5a'; ctx.fillRect(mx - 9, my - 1, 18, 2);
    const wig = Math.sin(G.clock * (5 + w * 12)) * (1 + w * 3);
    drawItem('b', mx - wig * 0.3, my - 14, wig * 0.03, 1, st.gold.rope, 0.42);
    drawItem('b', mx + wig, my - 25, wig * 0.06, 1, st.gold.rope, 0.42);
    if (st.gold.rope) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx - 9, my - 30); ctx.lineTo(mx + 9, my - 8); ctx.stroke(); }
  }
  function drawScarecrow(x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = '#8a5a36'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -58); ctx.moveTo(-18, -40); ctx.lineTo(18, -40); ctx.stroke();
    ctx.fillStyle = C.gold; rr(-9, -48, 18, 24, 5); ctx.fill();
    ctx.fillStyle = '#ffe9a0'; circle(0, -56, 8); ctx.fill();
    ctx.fillStyle = '#c8961a'; ctx.beginPath(); ctx.ellipse(0, -63, 13, 3.5, 0, 0, Math.PI * 2); ctx.fill(); rr(-6, -72, 12, 9, 3); ctx.fill();
    ctx.fillStyle = C.ink; circle(-3, -57, 1.4); ctx.fill(); circle(3, -57, 1.4); ctx.fill();
    ctx.restore();
  }
  /* the little red tractor (rear axle at the pose, leaning with the road) */
  function drawTractor(st) {
    const pose = tractorPose(st), tr = st.tr;
    ctx.save(); ctx.translate(pose.x, pose.y); ctx.rotate(pose.a);
    // cab roof posts and the sun roof (behind the driver)
    ctx.strokeStyle = '#3a3a4a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-30, -30); ctx.lineTo(-30, -92); ctx.moveTo(16, -30); ctx.lineTo(16, -92); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#b8901a'; ctx.lineWidth = 2.5; rr(-40, -100, 66, 11, 5); ctx.fill(); ctx.stroke();
    // body and hood
    ctx.fillStyle = '#e8443a'; ctx.strokeStyle = '#8e2a22'; ctx.lineWidth = 3;
    rr(-14, -26, 40, 26, 6); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, -40); ctx.lineTo(96, -34); ctx.lineTo(100, -4); ctx.lineTo(20, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(26, -36); ctx.lineTo(90, -31); ctx.lineTo(90, -27); ctx.lineTo(26, -31); ctx.closePath(); ctx.fill();
    // grille and headlight
    ctx.fillStyle = '#b8b8c8'; rr(92, -30, 9, 24, 3); ctx.fill();
    ctx.strokeStyle = '#7a7a8a'; ctx.lineWidth = 1.5; for (let yy = -26; yy < -8; yy += 5) { ctx.beginPath(); ctx.moveTo(93, yy); ctx.lineTo(100, yy); ctx.stroke(); }
    ctx.fillStyle = '#fff6c0'; ctx.strokeStyle = '#b8901a'; ctx.lineWidth = 2; circle(86, -38, 5); ctx.fill(); ctx.stroke();
    // the exhaust stack
    ctx.fillStyle = '#5a5a6a'; rr(58, -70, 7, 32, 3); ctx.fill(); ctx.fillStyle = '#3a3a4a'; rr(56, -72, 11, 5, 2); ctx.fill();
    // the big back wheel with its fender, the small front wheel
    const wh = (x, y, r, hub) => {
      ctx.fillStyle = '#2a2a3a'; circle(x, y, r); ctx.fill();
      ctx.strokeStyle = '#1a1a26'; ctx.lineWidth = 3;
      for (let i = 0; i < 10; i++) { const a = tr.wheel * (S.rearR / r) + i * Math.PI / 5; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4)); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
      ctx.fillStyle = '#ffd23f'; circle(x, y, hub); ctx.fill();
      ctx.fillStyle = '#e8b81a'; circle(x, y, hub * 0.45); ctx.fill();
    };
    wh(0, 0, S.rearR, 13);
    const fy = S.rearR - S.frontR;
    wh(S.base, fy, S.frontR, 7);
    ctx.fillStyle = '#e8443a'; ctx.strokeStyle = '#8e2a22'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, S.rearR + 5, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(S.rearR + 5, 2); ctx.lineTo(S.rearR - 1, 2); ctx.arc(0, 0, S.rearR - 1, Math.PI * 1.95, Math.PI * 1.05, true); ctx.closePath(); ctx.fill(); ctx.stroke();
    // the seat on top of the fender
    ctx.fillStyle = '#3a3a4a'; rr(-24, -44, 26, 7, 3); ctx.fill(); rr(-27, -64, 7, 24, 3); ctx.fill();
    ctx.restore();
    drawCrew(st, 'drive');
    ctx.save(); ctx.translate(pose.x, pose.y); ctx.rotate(pose.a);
    // the steering wheel, in front of the driver
    ctx.strokeStyle = '#3a3a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(22, -38); ctx.lineTo(12, -52); ctx.stroke();
    ctx.save(); ctx.translate(11, -53); ctx.rotate(-0.5); ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(0, 0, 9, 3, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    ctx.restore();
    // the horn's sound waves
    if (tr.honkT > 0) {
      const hp = toWorld(pose, 100, -32);
      ctx.globalAlpha = tr.honkT / 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(hp.x, hp.y, 12 + i * 12 + (0.5 - tr.honkT) * 60, -0.7, 0.7); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
  }
  // Pip and Bo: the driver on the seat (before the tractor body, which hides their legs), the catcher on the wagon
  function drawCrew(st, which) {
    for (const id of [0, 1]) {
      const sp = seatSpot(st, id), isD = id === st.drive, hopping = sp.hop > 6;
      if (which === 'drive' ? !(isD && !hopping) : (isD && !hopping)) continue;
      const p = G.players[id], save = { x: p.x, y: p.y, face: p.face, sx: p.sx, sy: p.sy, vy: p.vy, stun: p.stun, alive: p.alive, blink: p.blink };
      const sc = isD && !hopping ? 0.9 : 1;
      ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(sp.lean * 0.6); ctx.scale(sc, sc);
      p.x = -PW / 2; p.y = -PH; p.alive = true; p.vy = 0;
      p.face = isD ? 1 : st.cat.face;
      p.stun = !isD && st.cat.stun > 0.25 ? 0.5 : 0;
      if (isD) { p.sy = 1 + Math.sin(G.clock * 3 + id) * 0.02 - clamp(st.tr.bob * 0.01, -0.06, 0.06); p.sx = 2 - p.sy; }
      else if (st.cat.hold) { p.sy = 0.86; p.sx = 1.14; }
      else if (st.cat.catchT > 0) { p.sy = 0.88; p.sx = 1.12; }
      else if (st.cat.air) { p.sy = 1.1; p.sx = 0.92; }
      else { p.sy = 1 + Math.sin(G.clock * (st.cat.walk ? 14 : 3) + id) * (st.cat.walk ? 0.05 : 0.02); p.sx = 2 - p.sy; }
      if (hopping) { p.sy = 1.08; p.sx = 0.94; }
      drawPlayer(p);
      // the catcher's arms: up and ready, or hugging the stack
      if (!isD && !hopping) {
        const col = PCOL[id], h = PH * p.sy;
        ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round';
        if (st.cat.hold) { ctx.beginPath(); ctx.moveTo(-9, -h * 0.55); ctx.lineTo(-20, -h * 0.75); ctx.moveTo(9, -h * 0.55); ctx.lineTo(20, -h * 0.75); ctx.stroke(); }
        else { const up = st.cat.catchT > 0 ? 1 : 0.7; ctx.beginPath(); ctx.moveTo(-9, -h * 0.6); ctx.lineTo(-15, -h * 0.6 - 14 * up); ctx.moveTo(9, -h * 0.6); ctx.lineTo(15, -h * 0.6 - 14 * up); ctx.stroke(); }
      }
      ctx.restore();
      Object.assign(p, save);
    }
  }
  function drawCrow(st, b) {
    const wing = Math.sin(b.flap) * (b.st === 'peck' ? 0.2 : 1);
    ctx.save(); ctx.translate(b.x, b.y);
    if (b.carry) drawItem(b.carry, 0, 22, 0.2, 1, false, 0.75);
    const face = b.st === 'off' || b.st === 'shy' ? 1 : -1;
    ctx.scale(face, 1);
    ctx.fillStyle = '#2a2a3a';
    ctx.beginPath(); ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
    circle(-12, -6, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, -2); ctx.lineTo(22, -6); ctx.lineTo(20, 4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(10, -4 - 16 * wing); ctx.lineTo(14, -2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffb84a'; ctx.beginPath(); ctx.moveTo(-18, -7); ctx.lineTo(-25, -4 + (b.st === 'peck' ? Math.sin(G.clock * 12) * 2 : 0)); ctx.lineTo(-18, -3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(-13, -8, 2.4); ctx.fill(); ctx.fillStyle = C.ink; circle(-13.5, -8, 1.2); ctx.fill();
    ctx.restore();
  }
  function drawFlock(st, fl) {
    if (fl.st === 'gone' || fl.x < st.cam.x - 200 || fl.x > st.cam.x + W + 200) return;
    const roadY = gyAt(st, fl.x), u = fl.st === 'field' ? 0 : smooth(fl.walk);
    for (let i = 0; i < fl.n; i++) {
      const x = fl.x + i * 34 - (fl.n - 1) * 17 + (fl.st === 'leave' ? (1 - fl.walk) * 30 * (i % 2 ? 1 : -1) : 0);
      const y = lerp(roadY - 40, roadY - 2, u) + (i % 2) * 4, step = (fl.st === 'walk' || fl.st === 'leave') ? Math.sin(G.clock * 12 + i) * 2 : 0;
      ctx.save(); ctx.translate(x, y); ctx.scale(fl.st === 'leave' ? 1 : -1, 1);
      if (fl.kind === 'sheep') {
        ctx.fillStyle = '#3a3a4a'; ctx.fillRect(-9, -4, 3, 6 + step); ctx.fillRect(6, -4, 3, 6 - step);
        ctx.fillStyle = '#ffffff'; for (const [cx, cy, r] of [[-8, -12, 8], [0, -16, 9], [8, -12, 8], [0, -8, 9]]) { circle(cx, cy, r); ctx.fill(); }
        ctx.fillStyle = '#3a3a4a'; ctx.beginPath(); ctx.ellipse(-15, -14, 5, 6.5, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; circle(-17, -15, 1.6); ctx.fill();
      } else {
        ctx.fillStyle = '#ffa030'; ctx.fillRect(-2, -6, 2.5, 7 + step); ctx.fillRect(3, -6, 2.5, 7 - step);
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(2, -12, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(-10, -26); ctx.stroke();
        ctx.fillStyle = '#ffffff'; circle(-10, -28, 4.5); ctx.fill();
        ctx.fillStyle = '#ffa030'; ctx.beginPath(); ctx.moveTo(-14, -29); ctx.lineTo(-20, -27); ctx.lineTo(-14, -26); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C.ink; circle(-11, -29, 1.2); ctx.fill();
      }
      ctx.restore();
    }
  }
  // the barn at the end of the field: back part (behind the road things) and the front with the big open door
  function drawBarn(st, front) {
    const b = st.c.barn;
    if (!b || b.x > st.cam.x + W + 400 || b.x + 400 < st.cam.x) return;
    const s = b.big ? 1.25 : 1, y = gyAt(st, b.x), x = b.x;
    const w = 300 * s, h = 170 * s;
    if (!front) {
      if (b.big) {
        // bunting from the barn to a flag pole
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 160, y - 150); ctx.quadraticCurveTo(x - 80, y - 110, x, y - h * 0.8); ctx.stroke();
        for (let i = 0; i < 8; i++) { const u = (i + 0.5) / 8, px = lerp(x - 160, x, u), py = lerp(y - 150, y - h * 0.8, u) + Math.sin(u * Math.PI) * 18; ctx.fillStyle = ['#ff6b6b', '#ffd36b', '#6bb6ff', '#8fe3b0'][i % 4]; ctx.beginPath(); ctx.moveTo(px - 6, py); ctx.lineTo(px + 6, py); ctx.lineTo(px, py + 12); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 162, y - 160, 4, 160);
      }
      // walls and roof
      ctx.fillStyle = '#c8483c'; ctx.fillRect(x, y - h, w, h + 6);
      ctx.strokeStyle = 'rgba(126,42,34,0.45)'; ctx.lineWidth = 2;
      for (let xx = x + 18; xx < x + w; xx += 18) { ctx.beginPath(); ctx.moveTo(xx, y - h); ctx.lineTo(xx, y + 4); ctx.stroke(); }
      ctx.fillStyle = '#7e2a22';
      ctx.beginPath(); ctx.moveTo(x - 16, y - h + 4); ctx.lineTo(x + w * 0.18, y - h - 70 * s); ctx.lineTo(x + w * 0.82, y - h - 70 * s); ctx.lineTo(x + w + 16, y - h + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 16, y - h, w + 32, 7);
      // the hayloft door with hay poking out
      ctx.fillStyle = '#5a1e18'; rr(x + w / 2 - 30, y - h - 40 * s, 60, 46, 4); ctx.fill();
      ctx.fillStyle = '#f2cf63'; ctx.beginPath(); ctx.moveTo(x + w / 2 - 26, y - h + 6); for (let i = 0; i <= 8; i++) ctx.lineTo(x + w / 2 - 26 + i * 6.5, y - h - 8 - (i % 2) * 8); ctx.lineTo(x + w / 2 + 26, y - h + 6); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.strokeRect(x + w / 2 - 30, y - h - 40 * s, 60, 46);
      // the big open door on the left: dark inside with hay
      const dw = 120 * s, dh = 120 * s;
      ctx.fillStyle = '#3a1a14'; ctx.fillRect(x + 20, y - dh, dw, dh + 4);
      ctx.fillStyle = '#c8a24a'; ctx.beginPath(); ctx.moveTo(x + 20, y + 2); ctx.lineTo(x + 20, y - 30); ctx.quadraticCurveTo(x + 20 + dw / 2, y - 60, x + 20 + dw, y - 26); ctx.lineTo(x + 20 + dw, y + 2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.strokeRect(x + 20, y - dh, dw, dh + 4);
      // the open door leaf with its white X, swung to the left
      ctx.fillStyle = '#b83c32'; ctx.fillRect(x - 40, y - dh, 58, dh + 4);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.strokeRect(x - 40, y - dh, 58, dh + 4);
      ctx.beginPath(); ctx.moveTo(x - 40, y - dh); ctx.lineTo(x + 18, y + 4); ctx.moveTo(x + 18, y - dh); ctx.lineTo(x - 40, y + 4); ctx.stroke();
      // the sign over the door
      const label = b.big ? 'Big Barn' : 'Barn';
      ctx.font = '22px "Lilita One", "Arial Rounded MT Bold", sans-serif';
      const lw = ctx.measureText(label).width + 26;
      ctx.fillStyle = '#fff6dc'; ctx.strokeStyle = '#7e2a22'; ctx.lineWidth = 3; rr(x + 20 + dw / 2 - lw / 2, y - dh - 40, lw, 32, 8); ctx.fill(); ctx.stroke();
      text(label, x + 20 + dw / 2, y - dh - 23, 22, '#c8483c', 'center');
      if (b.big) { ctx.fillStyle = '#4a7ad8'; circle(x + w - 50, y - h - 20, 22); ctx.fill(); ctx.fillStyle = '#ffd23f'; circle(x + w - 50, y - h - 20, 14); ctx.fill(); ctx.fillStyle = '#4a7ad8'; ctx.beginPath(); ctx.moveTo(x + w - 62, y - h); ctx.lineTo(x + w - 70, y - h + 26); ctx.lineTo(x + w - 54, y - h + 14); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + w - 38, y - h); ctx.lineTo(x + w - 30, y - h + 26); ctx.lineTo(x + w - 46, y - h + 14); ctx.closePath(); ctx.fill(); text('1st', x + w - 50, y - h - 19, 13, '#7a4a00', 'center'); }
    }
  }

  /* ---------- the HUD: clock and delivered, the two job panels, prompts ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, ps = G.players, play = G.mode === 'play' || G.mode === 'paused', t = G.clock;
    let timeX0 = W - 14;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = st.delivered + ' / ' + st.totalAll;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.6, gap = fs;
      const w = tw + gap + icon + fs * 0.4 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      drawItem('b', x0 + 15 + tw + gap + icon / 2, cy, 0, 1, false, fs / 26);
      text(n, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, '#ffffff', 'left', 'body');
      timeX0 = x0;
    }
    if (!play) return;
    const pl = plan(st), tr = st.tr, c = st.cat;
    const tc = tcOf(st);
    const honkLit = pl.honk;
    for (const id of [0, 1]) {
      const pw = Math.round(230 * z), ph = Math.round(58 * z), py = H - ph - 10, px = id === 0 ? 12 : W - 12 - pw;
      // (it fades while the tractor or the wagon is right behind it)
      const sx0 = tc - S.deckHalf - 20 - st.cam.x, sx1 = tr.s + 110 - st.cam.x;
      const fade = sx1 > px && sx0 < px + pw && gyAt(st, st.cam.x + px + pw / 2) + 10 > py ? 0.45 : 1;
      ctx.globalAlpha = fade;
      ctx.fillStyle = 'rgba(28,26,54,0.84)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
      ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
      const qt = quiet(id), isD = id === st.drive;
      text(NAMES[id] + (isD ? ' · driver' : ' · catcher') + (qt ? ' (computer)' : ''), px + 12 * z, py + 14 * z, 13 * z, PCOL[id], 'left');
      const cy = py + 27 * z, chh = 23 * z;
      if (isD) {
        // a speed meter: the gold mark is the field's pace; it turns red if too fast for a bump just ahead
        const gx = px + 12 * z, gw = pw * 0.56, v = Math.max(0, tr.v);
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(gx, cy, gw, chh, chh / 2); ctx.fill();
        const tooFast = pl.bump && Math.abs(tr.v) > pl.bump.safe && Math.abs(pl.bump.x - tc) < 300;
        const near = Math.abs(tr.v - st.c.pace) < 28;
        ctx.fillStyle = tooFast ? (Math.sin(t * 14) > 0 ? '#ff6a5a' : '#ffa08a') : near ? '#8fe3b0' : '#9fd0ff';
        const fw = (gw - 4) * clamp(v / S.vMax, 0, 1);
        if (fw > 2) { rr(gx + 2, cy + 2, Math.max(chh - 4, fw), chh - 4, (chh - 4) / 2); ctx.fill(); }
        const pxm = gx + 2 + (gw - 4) * st.c.pace / S.vMax;
        ctx.fillStyle = C.gold; ctx.fillRect(pxm - 2, cy - 3, 4, chh + 6);
        if (pl.bump) { const sx = gx + 2 + (gw - 4) * pl.bump.safe / S.vMax; ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 1, cy + 3, 2, chh - 6); }
        const lab = (qt ? '' : key(id, 'right') + ' ') + (tr.v < -5 ? 'BACK' : 'SPEED');
        // (outlined so it reads over the fill and the marks)
        ctx.font = '700 ' + Math.round(11 * z) + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(28,26,54,0.95)'; ctx.lineWidth = 3.5 * z; ctx.strokeText(lab, gx + gw / 2, cy + chh / 2 + 0.5);
        ctx.fillStyle = '#ffffff'; ctx.fillText(lab, gx + gw / 2, cy + chh / 2 + 0.5);
        chip(px + 12 * z + gw + 6 * z, cy, pw - 24 * z - gw - 6 * z, chh, (qt ? '' : key(id, 'act') + ' ') + 'HONK', honkLit, tr.honkT > 0, z, t);
      } else {
        const moveLit = pl.cWhy !== 'none' && pl.cWhy !== 'hold' && Math.abs(pl.uWant - c.u) > 16 && pl.cWhy !== 'ready';
        const jumpLit = pl.jumpSoon && pl.cWhy === 'jump';
        const holdLit = pl.holdNow;
        const cw = (pw - 24 * z - 12 * z) / 3;
        chip(px + 12 * z, cy, cw, chh, (qt ? '' : key(id, 'lr') + ' ') + 'WALK', moveLit, !!c.walk, z, t);
        chip(px + 12 * z + cw + 6 * z, cy, cw, chh, (qt ? '' : key(id, 'up') + ' ') + 'JUMP', jumpLit, c.air, z, t);
        chip(px + 12 * z + 2 * (cw + 6 * z), cy, cw, chh, (qt ? '' : key(id, 'act') + ' ') + 'HOLD', holdLit, c.hold, z, t);
      }
      ctx.globalAlpha = 1;
    }
    // the message line (gold help): between the level pill and the clock when it fits, else under the field pill
    const m = st.waiting ? { text: 'Taking a break... press anything to drive on', col: '#ffffff', t: 1, life: 2 } : st.msg;
    if (m) {
      let fs = big ? 20 : 14;
      const h = big ? 32 : 26, font = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      ctx.font = font(14);
      const left = 14 + ctx.measureText(levelCode(G.levelIndex) + ' · ' + G.level.def.name).width + 28 + 10, right = timeX0 - 10;
      ctx.font = font(fs);
      let w = ctx.measureText(m.text).width + 30, cx = W / 2 + 40, y = 12;
      if (w <= right - left) cx = clamp(cx, left + w / 2, right - w / 2);
      else {
        cx = W / 2; y = big ? 96 : 80;
        while (w > W - 40 && fs > 11) { fs--; ctx.font = font(fs); w = ctx.measureText(m.text).width + 30; }
      }
      ctx.globalAlpha = clamp((m.life - m.t) / 0.3, 0, 1);
      pill(cx, y, w, h, 'center'); text(m.text, cx, y + h / 2 + 0.5, fs, m.col, 'center', 'body'); ctx.globalAlpha = 1;
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    // prompts: the driver's over the tractor, the catcher's over the load. A hint bubble replaces that player's prompt.
    const fs = 14 * z, yMin = big ? 100 : 84, yMax = H - Math.round(58 * z) - 18;
    const pose = tractorPose(st);
    const stackTop = st.stack.length ? slotPos(st, st.stack.length - 1).y - 16 : deckTop(st, tc) - 10;
    const spot = id => (id === st.drive ? { x: pose.x - st.cam.x - 20, y: pose.y - 100, side: 1 } : { x: tc + 60 - st.cam.x, y: Math.min(stackTop, head(st).y - 12) - 30, side: -1 });
    const placed = [];
    const place = (id, w, h) => {
      const sp = spot(id);
      let top = sp.y - h;
      // (1-player mode: keep clear of the computer's speech bubble)
      if (typeof CPU === 'object' && cpuSolo() && !cpuOn(id)) { const cb = CPU.bubbles[1 - id]; if (cb && cb.t > 0 && Math.abs(sp.x - ps[1 - id].x) < w + 80) top = Math.min(top, ps[1 - id].y - 22 - (big ? 30 : 22) - 8 - h); }
      const x = clamp(sp.side > 0 ? sp.x : sp.x - w, 4, W - w - 4);
      let y = clamp(top, yMin, yMax - h);
      for (const q of placed) if (Math.abs(q.y - y) < h + 4 && x < q.x + q.w && x + w > q.x) y = clamp(q.y - h - 6, yMin, yMax - h);
      placed.push({ x, y, w });
      return { x, y };
    };
    const say = (id, str, col, pulse) => {
      if (quiet(id) || st.hints[id] || !str) return;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, o = place(id, w, h);
      const sc = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
      ctx.save(); ctx.translate(o.x + w / 2, o.y + h / 2); ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
      text(str, 0, 0.5, fs, col, 'center', 'body');
      ctx.restore();
    };
    const D = st.drive, Cc = st.catch;
    // the driver
    {
      let str = null, col = C.gold, pulse = false;
      const dv = pl.vWant - tr.v;
      if (pl.honk) { str = 'Honk! ' + key(D, 'act'); pulse = true; }
      else if (pl.dWhy === 'flock') str = 'Honk at them! ' + key(D, 'act');
      else if (pl.dWhy === 'bump' && dv < -12) { str = 'Bump ahead! Slow down ' + key(D, 'left'); pulse = true; }
      else if (pl.dWhy === 'back' && dv < -12) str = 'Back up ' + key(D, 'left') + ' for it!';
      else if (pl.dWhy === 'scoop' && Math.abs(tr.v) > 30) str = 'Stop ' + key(D, 'down') + ' so it can be scooped';
      else if (pl.dWhy === 'creep' && dv < -12) str = 'Slowly over it...';
      else if (pl.dWhy === 'pace' && dv > 45) { str = 'Faster! ' + key(D, 'right'); col = '#ffe7a8'; }
      else if (pl.dWhy === 'pace' && dv < -60) { str = 'A bit slower ' + key(D, 'left'); col = '#ffe7a8'; }
      say(D, str, col, pulse);
    }
    // the catcher
    {
      let str = null, col = C.gold, pulse = false;
      const du = pl.uWant - c.u, ar = du < -14 ? key(Cc, 'left') : du > 14 ? key(Cc, 'right') : '';
      if (pl.holdNow) { str = 'Hold on! ' + key(Cc, 'act'); pulse = true; }
      else if (pl.cWhy === 'jump' && pl.jumpSoon && !ar) { str = 'Jump! ' + key(Cc, 'up'); pulse = pl.jumpNow; }
      else if (pl.cWhy === 'jump' && ar) str = 'High bale! ' + ar;
      else if (pl.cWhy === 'catch' && ar) { str = 'Catch! ' + ar; pulse = pl.catchT < 0.5; }
      else if (pl.cWhy === 'catch' && !ar && pl.catchT < 1) { str = 'Right there!'; col = '#d9ffd0'; }
      else if (pl.cWhy === 'scoop' && ar) str = 'Scoop it up! ' + ar;
      else if (c.hold && !pl.holdNow && pl.item) { str = 'Let go to catch!'; col = '#ffe7a8'; }
      say(Cc, str, col, pulse);
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
  function chip(x, y, w, h, str, lit, held, z, t) {
    ctx.fillStyle = lit ? (Math.sin(t * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : held ? 'rgba(143,227,176,0.85)' : 'rgba(255,255,255,0.12)';
    rr(x, y, w, h, h / 2); ctx.fill();
    let fs = 12 * z;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    while (fs > 8 && ctx.measureText(str).width > w - 8) { fs -= 0.5; ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; }
    text(str, x + w / 2, y + h / 2 + 0.5, fs, lit || held ? C.ink : '#ffffff', 'center', 'body');
  }

  const medal = (t, frac) => (t <= 225 && frac >= 0.7 ? 'Gold' : t <= 390 && frac >= 0.5 ? 'Silver' : 'Bronze');

  MODES.haytractor = {
    S, compile, gy: gyAt, deckTop, head, plan, catchSpot, tc: tcOf, slotPos, key, medal, tractorPose,
    setup(st, L) {
      st.stats = { spills: 0, missed: 0, caught: 0, scooped: 0, helps: 0, honks: 0, shooed: 0, stolen: 0, stops: 0, hard: 0, corn: 0, roomT: [], finishT: 0 };
      st.delivered = 0; st.inT = [G.time, G.time]; st.personT = G.time;
      // count every field's items up front (the HUD shows "x of all")
      const def = LEVELS[G.levelIndex];
      let n = 0, corn = 0;
      for (const r of def.rooms || [def]) { const c = compile(Object.assign({}, def, r)); n += c.total; corn += c.corn; }
      st.totalAll = n; st.cornAll = corn;
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    // the engine draws the players between draw() and drawTop(): they are hidden then, and drawn on the tractor instead
    draw() {
      const st = G.mst;
      if (!st.c) return;
      draw(st);
      st.hid = G.players.map(p => p.alive);
      for (const p of G.players) p.alive = false;
    },
    drawTop() {
      const st = G.mst;
      if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
      if (!st.c) return;
      drawTop(st);
    },
    hud() { const st = G.mst; if (st.c) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const all = st.totalAll || 1, frac = st.delivered / all;
      const out = [
        { label: 'Delivered', value: st.delivered + ' of ' + all },
        { label: 'Spills', value: String(s.spills) },
        { label: 'Gold corn', value: s.corn + ' of ' + st.cornAll },
        { label: 'Medal', value: medal(G.time, frac) },
      ];
      const words = frac >= 0.85 ? 'A barn full to the roof. Champion farmers!' : frac >= 0.6 ? 'Hay for every cow and pumpkins for the fair!' : 'You drove the whole way to the Big Barn!';
      out.push(words + ' Caught: ' + s.caught + (s.scooped ? ', scooped: ' + s.scooped : '') + '. Crows shooed: ' + s.shooed + '.');
      if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
      return out;
    },
  };

  /* ---------- sounds ---------- */
  Sfx.extra.haytractorHonk = function (p) { this.tone(330 * p, 0.14, 'square', 0.04); this.tone(392 * p, 0.2, 'square', 0.04, null, 0.17); };
  Sfx.extra.haytractorToss = function () { this.tone(300, 0.14, 'triangle', 0.03, 600); };
  Sfx.extra.haytractorFling = function () { this.tone(160, 0.1, 'square', 0.03, 90); this.tone(400, 0.25, 'triangle', 0.035, 900, 0.05); };
  Sfx.extra.haytractorCatch = function (p) { this.tone(520 * p, 0.06, 'triangle', 0.05); this.tone(780 * p, 0.09, 'triangle', 0.045, null, 0.05); };
  Sfx.extra.haytractorPumpkin = function (p) { this.tone(180 * p, 0.12, 'sine', 0.07, 120); this.tone(660 * p, 0.1, 'triangle', 0.04, null, 0.06); };
  Sfx.extra.haytractorCorn = function () { [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.04, null, i * 0.05)); };
  Sfx.extra.haytractorScoop = function () { this.tone(300, 0.1, 'triangle', 0.04, 620); [784, 988].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.035, null, 0.08 + i * 0.05)); };
  Sfx.extra.haytractorTick = function () { this.tone(150, 0.06, 'triangle', 0.035, 110); };
  Sfx.extra.haytractorBump = function () { this.tone(120, 0.16, 'sine', 0.08, 70); this.tone(240, 0.08, 'square', 0.02, 160, 0.02); };
  Sfx.extra.haytractorThud = function () { this.tone(95, 0.24, 'sine', 0.1, 55); this.tone(200, 0.1, 'square', 0.025, 120, 0.03); };
  Sfx.extra.haytractorWhoops = function () { this.tone(660, 0.12, 'triangle', 0.05, 990); this.tone(880, 0.35, 'triangle', 0.05, 220, 0.12); };
  Sfx.extra.haytractorBoing = function () { this.tone(260, 0.22, 'sine', 0.05, 560); };
  Sfx.extra.haytractorPlop = function () { this.tone(140, 0.12, 'triangle', 0.05, 90); };
  Sfx.extra.haytractorJump = function (p) { this.tone(340 * p, 0.12, 'square', 0.03, 620 * p); };
  Sfx.extra.haytractorCaw = function () { this.tone(520, 0.12, 'sawtooth', 0.025, 380); this.tone(500, 0.14, 'sawtooth', 0.025, 340, 0.18); };
  Sfx.extra.haytractorBaa = function () { for (let i = 0; i < 4; i++) this.tone(420 + (i % 2) * 18, 0.07, 'sawtooth', 0.02, null, i * 0.07); };
  Sfx.extra.haytractorGoose = function () { this.tone(700, 0.1, 'square', 0.025, 560); this.tone(700, 0.1, 'square', 0.025, 560, 0.16); };
  Sfx.extra.haytractorHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
  Sfx.extra.haytractorArrive = function () { [392, 523, 659].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.08)); };
  Sfx.extra.haytractorCount = function () { this.tone(880 + Math.random() * 60, 0.05, 'triangle', 0.035); };
  Sfx.extra.haytractorBarn = function () { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.11, 'triangle', 0.05, null, i * 0.08)); };
  Sfx.extra.haytractorSwap = function () { [659, 784, 988, 784, 988].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.045, null, i * 0.07)); };
  Sfx.extra.haytractorHop = function (p) { this.tone(300 * p, 0.2, 'sine', 0.05, 640 * p); };
  Sfx.extra.haytractorFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.11)); };
})();
