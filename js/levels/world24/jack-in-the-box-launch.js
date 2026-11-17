/* Pip & Bo - Level 24-2 Jack-in-the-Box Launch (team, World 24 Toy Box Town). */
'use strict';

/* ===== 24-2 Jack-in-the-Box Launch (mode 'jackbox', World 24 "Toy Box Town", team, Gavyn's pick) =====
   Pip and Bo are toy-sized in a kid's bedroom and climb a giant bookshelf with a jack-in-the-box toy: "one cranks the
   box, the other pops out and gets launched up the bookshelf. Then they swap, climbing shelf by shelf to the top"
   (Gavyn). Seen from the side; the camera scrolls UP as they climb. The mode owns the tick, the camera, the whole
   picture and the HUD (def.ownStep + def.ownHUD + def.noFalls); the engine grid is empty apart from the two spawns.
   Every launch has two jobs, and they swap after every launch (8 launches, 2 per shelf; Pip jumps first):
   THE CRANKER stands at the crank on the side of the box. Each action press turns the handle one click and plays the
     next note of the shelf's little music-box tune (an original melody). The tune bar (bottom middle) shows the notes
     and a beat ball that hops from note to note; a soft tick plays on every beat. A turn right on the beat is
     "Perfect!" (within JBOX.perfW s), close is "Good" (within JBOX.goodW s), anything else is "Off-beat" but still
     plays the note. Only one click counts per beat (extra presses in the same beat just rattle the handle), so mashing
     is no faster and makes weak launches. The power bar fills with the clicks: Perfect adds the most, Off-beat the
     least; a shelf mark on the bar shows the power that reaches the next shelf without the air hop. ◀ ▶ tilt the box
     (JBOX.tiltN steps each way, JBOX.tiltStep rad each), and a dotted arc shows where the pop will send the jumper.
     The lid POPs on the last note.
   THE JUMPER rides inside the box on the spring. Holding ▼ while the tune plays squishes the spring (+JBOX.squish
     power at the pop, "Super squish!"). In the air ◀ ▶ steer, and ▲ (W / ↑ / Space, controller A, touch ▲) is one air
     hop per launch (best at the top of the arc: it sets the climb speed to JBOX.hopV, so mashing it gains nothing).
     Only a fresh press in the air counts (▲ held from inside the box doesn't), and a press while still rising fast
     says "Not yet!" without using the hop up. Stars are collected by touching them. Shelves are one-way: you fly up
     through them and land on top coming down. Landing on the target shelf is "Landed!".
   THE YO-YO LIFT: on the new shelf the jumper walks (◀ ▶) to the gold yo-yo hook at the shelf edge and presses the
     action: a yo-yo string drops to the box. The cranker presses the action to hook it and hops in the box, then the
     jumper hauls with action presses (JBOX.haulN presses; quicker than JBOX.haulGap s apart counts half). At the top
     the box plops onto the new shelf and they SWAP: whoever rode up in the box is the next jumper (already on the
     spring), the hauler is the next cranker. So both players launch in turn, and both jobs need a person every time.
   MISSING: coming down anywhere but the target shelf (onto the shelf you started from, or below it) is a soft
     "Boing!": a plush pillow pops up, the jumper bounces back into the box, and the tune starts again. Nobody gets hurt.
     Boings count for the medal.
   THINGS ON THE WAY UP (all soft, all cartoony):
     toy car     zooms back and forth along a floating toy track: a touch is "Beep beep!", a sideways bump
     desk fan    blows a breeze band across the shelf (on JBOX.fanOn s, off JBOX.fanOff s, swirls show when it blows)
     mobile      a swinging mobile of moons and stars: touching it bounces you off ("Boing!")
     cat tail    a sleepy cat on a wall shelf swishes its tail: a touch is a "Swish!" push
     ribbon      a dangling ribbon: the first touch in a flight is a springy "Boing!" boost upward (it helps)
   GOLD HELP (always announced in the gold message line, and only while both players are pressing things, i.e. each
   pressed something in the last JBOX.activeT s; a help skipped then comes at the next boing, always in this order):
     2 boings on one launch: Gold spring (+JBOX.goldSpring power from then on, this launch);
     3 boings: Gold landing pad (the target shelf is JBOX.goldPad px wider each side, with a gold arrow, and a gentle
       gold pull steers the jumper toward the landing spot all through the flight, so even a wild aim comes back);
     4 boings: Gold calm (fans stop, the car parks, the mobile and the cat's tail rest, this launch);
     yo-yo: Gold yo-yo hook after JBOX.goldHookT s on the new shelf, while the jumper is pressing things (and the cranker
       pressed something in the last 30 s): the hook rolls over to the jumper.
     Every help counts against Gold. The results show how many.
   IDLE: when no person has pressed anything for JBOX.idleWait s the clock stops ("Taking a break"; G.time is wound
     back, so test loops must count steps, not G.time). The box waits for its cranker and the yo-yo for its jumper, so
     nobody can climb alone: an idle cranker never pops the lid or hooks the box, and an idle jumper never hauls.
     The clock also stops at the top (the win party), so the results time is the time the trophy was reached.
   MEDALS (MODES.jackbox.medals, js/medals.js): Gold ≤ 225 s, ≤ 3 boings, ≥ 55% of the stars and no gold help; Silver ≤ 360 s and ≤ 10 boings;
     otherwise Bronze.
   Shelves (roomWord 'Shelf'): Bottom Shelf (books, a ribbon), Toy Shelf (a toy car, a desk fan), Night Light Shelf
     (darker, a swinging mobile, a sleepy cat's tail), Top of the Bookshelf (fan, ribbon, car and mobile; a trophy star
     at the top). Each shelf's tune is a little longer.
   Room def: { title, look: 'books'|'toys'|'night'|'top', tune: [semitones from C5], tip, act,
     ledges: [[x0, x1, y, kind]],      y = world px, DOWN positive (the carpet is y 0, higher shelves are negative)
     launches: [{ from, to, box, crane, hang, next }],  ledge indexes; box = the box x on `from`; crane = the yo-yo hook
                                        x on `to`; hang = where the string hangs past the shelf edge; next = the box x
                                        on `to` for the next launch
     stars: [[x, y, launch]], things: [['car', launch, y, x0, x1, speed] | ['fan', launch, x, y, dir, y0, y1, x0, x1]
       | ['mobile', launch, x, y, len, amp, per] | ['tail', launch, x, y, dir, len] | ['ribbon', launch, x, y0, y1]],
     deco: [['books', x0, x1, ledge] | ['blocks', x, ledge] | ['teddy', x, ledge] | ['nightlight', x, ledge]
       | ['trophy', x, ledge] | ['wallshelf', x0, x1, y] | ['plant', x, ledge]] }.
   MODES.jackbox.plan(st) (made once a step) works out what's needed now: the prompts, the job panels and the computer
   brain read it. MODES.jackbox.predict(st, tilt, power) simulates a pop with no steering (the aim arc and the brain).
   Every global is prefixed jackbox / JBOX (and Sfx.extra.jackbox*); all state lives in G.mst. Rules never use
   Math.random (only the looks do: sparkles, confetti). */
const JBOX = {
  // the flight (px, px/s, px/s²)
  g: 1150, airA: 820, airV: 260, hopV: 420, hopWin: -260, maxVx: 430, hw: 13, ht: 40, flyMax: 6,
  // apex height above the spring for power p: hBase + hK * p
  hBase: 60, hK: 380, squish: 0.06, goldSpring: 0.24, goldPad: 50, goldPull: 520,
  // the tune and the crank
  beatT: 0.55, lead: 0.6, perfW: 0.1, goodW: 0.2, pBase: 0.42, pK: 0.58, popT: 0.32,
  tiltN: 3, tiltStep: 0.085, tiltRep: 0.22,
  // the box, walking, the yo-yo and the haul
  boxW: 56, boxH: 50, crankDX: 44, walkV: 175, craneR: 30, goldHookT: 14, yoyoT: 0.7, haulN: 10, haulGap: 0.11, swapT: 1.4,
  boingT: 1.35,
  // things
  fanA: 760, fanOn: 2.4, fanOff: 2.0, carW: 48, carH: 24, mobR: 26, tailN: 6,
  // camera, idle, help, end
  camLead: 0.58, idleWait: 12, activeT: 6, winT: 4.6, cm: 10,
};
const jackboxLerp = (a, b, u) => a + (b - a) * u;
const jackboxSmooth = u => u * u * (3 - 2 * u);
const JBOX_TOY = ['#ff5f6d', '#ffc43d', '#4fb5ff', '#6fd88a', '#b48cff', '#ff9a4a'];
// 1-player mode: the computer's own job gets no key hints or prompts (it knows its job)
const jackboxQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
// each player's own keys, for prompts and the HUD (a player with a controller is shown its buttons)
function jackboxKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'up') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'down') return pad || touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'left') return pad || touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'right') return pad || touch ? '▶' : id === 0 ? 'D' : '→';
  if (what === 'lr') return pad || touch ? '◀ ▶' : id === 0 ? 'A D' : '← →';
  if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
  return '';
}

/* ---------- a shelf (one room): ledges, launches, stars, things ---------- */
function jackboxCompile(def) {
  const c = { look: def.look || 'books', tune: def.tune || [0, 4, 7, 9, 7, 4, 5, 12], ledges: [], launches: [], stars: [], things: [], deco: def.deco || [] };
  for (const l of def.ledges || []) c.ledges.push({ x0: l[0], x1: l[1], y: l[2], kind: l[3] || 'shelf' });
  for (const L of def.launches || []) c.launches.push(Object.assign({}, L));
  for (const s of def.stars || []) c.stars.push({ x: s[0], y: s[1], li: s[2] || 0, got: false, t: 0 });
  let n = 0;
  for (const it of def.things || []) {
    const k = it[0], li = it[1];
    const o = { kind: k, li, ph: (n++ * 1.37) % 3, bumps: 0 };
    if (k === 'car') Object.assign(o, { y: it[2], x0: it[3], x1: it[4], v: it[5] || 220, x: it[3], dir: 1, beep: 0 });
    else if (k === 'fan') Object.assign(o, { x: it[2], y: it[3], dir: it[4], y0: it[5], y1: it[6], x0: it[7], x1: it[8], on: false, spin: 0 });
    else if (k === 'mobile') Object.assign(o, { x: it[2], y: it[3], len: it[4], amp: it[5], per: it[6], a: 0, bx: it[2], by: it[3] + it[4] });
    else if (k === 'tail') Object.assign(o, { x: it[2], y: it[3], dir: it[4], len: it[5], a: 0, pts: [] });
    else if (k === 'ribbon') Object.assign(o, { x: it[2], y0: it[3], y1: it[4], wig: 0 });
    c.things.push(o);
  }
  return c;
}
// the box's crank side: toward the roomier end of its shelf
function jackboxCrankSide(st) {
  const L = st.c.ledges[st.L.from], x = st.box.x;
  return x - L.x0 > L.x1 - x ? -1 : 1;
}
function jackboxRoom(st, Lv, k) {
  const def = Lv.def;
  st.k = k; st.title = def.title || '';
  st.c = jackboxCompile(def);
  st.li = 0; st.stats.roomT[k] = null; st.segStart = G.time;
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null;
  st.state = 'play'; st.win = null; st.cam = null;
  jackboxLaunch(st, 0, true);
  st.cam = jackboxCamWant(st);
  st.plan = jackboxPlan(st);
  jackboxMirror(st);
}
// start launch li of this shelf (fresh: a new room, so place everybody)
function jackboxLaunch(st, li, fresh) {
  const L = st.c.launches[li], c = st.c;
  st.li = li; st.L = L; st.gi = st.k * 2 + li;
  st.jumper = st.gi % 2; st.cranker = 1 - st.jumper;
  if (typeof setJobs === 'function') setJobs(st.cranker === 0 ? ['cranker', 'jumper'] : ['jumper', 'cranker']);   // (each card shows the player's own job)
  const from = c.ledges[L.from];
  st.box = { x: L.box, y: from.y, tilt: 0, lid: 0, spring: 0, crankA: 0, shake: 0, hop: 0, gold: false };
  st.tiltT = 0; st.tiltDir = 0;
  const side = jackboxCrankSide(st);
  st.side = side;
  st.cr = { x: L.box + side * JBOX.crankDX, y: from.y, face: -side, walk: 0, inBox: false };
  if (fresh || !st.j) st.j = {};
  Object.assign(st.j, { x: L.box, y: from.y - JBOX.boxH, vx: 0, vy: 0, inBox: true, hop: false, inv: 0, face: side < 0 ? 1 : -1, ribbon: false, spin: 0, apex: 0, sq: 0 });
  st.boings = 0; st.goldSpring = false; st.goldPad = false; st.goldCalm = false; st.flyT = 0; st.bumpsHere = 0;
  st.phase = 'crank';
  jackboxTune(st);
  st.hookX = L.crane; st.goldHook = false;
  st.yoyo = null; st.haul = 0; st.boxU = 0; st.haulLast = -9; st.swap = null; st.boing = null;   // (boxU too: left at 1, it put the box on the next shelf for the first tick of every later haul)
  for (const t of c.things) if (t.li === li) t.bumps = 0;
}
// a fresh tune (a new launch, or after a boing)
function jackboxTune(st) {
  st.note = 0; st.grades = []; st.sum = 0; st.lastSlot = -99; st.beat0 = G.time + JBOX.lead; st.lastTick = -1;
  st.pop = null; st.squishHeld = 0; st.box.lid = 0; st.box.spring = 0;
}
const jackboxTarget = st => st.c.ledges[st.L.to];
const jackboxFrom = st => st.c.ledges[st.L.from];
// the power the tune has built so far, if every note still to come is played Perfect (opt.now: only what's played)
function jackboxPower(st, now) {
  const N = st.c.tune.length, D = JBOX;
  const sum = st.sum + (now ? 0 : N - st.note);
  return D.pBase + D.pK * sum / N + (st.goldSpring ? D.goldSpring : 0);
}
const jackboxApexH = p => JBOX.hBase + JBOX.hK * p;
// the power that reaches the target shelf (with a little room to land) without the hop
function jackboxNeed(st) {
  const rise = (st.box.y - JBOX.boxH) - jackboxTarget(st).y + 28;
  return (rise - JBOX.hBase) / JBOX.hK;
}
const jackboxBothActive = st => G.time - st.inT[0] < JBOX.activeT && G.time - st.inT[1] < JBOX.activeT;

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function jackboxStep(st, dt) {
  if (!st.c) return;
  const ps = G.players;
  for (const q of [0, 1]) {
    const i = ps[q].input;
    if (i.left || i.right || i.jump || i.down || i.up || i.act || ps[q].pendingJump || ps[q].pendingAct) st.inT[q] = G.time;
    if (!cpuOn(q) && (i.left || i.right || i.jump || i.down || i.up || i.act)) st.personT = G.time;
  }
  jackboxActLabels(st);
  const people = [0, 1].filter(q => !cpuOn(q));
  st.waiting = st.state === 'play' && G.introT <= 0 && people.length > 0 && G.time - st.personT > JBOX.idleWait;
  if (st.waiting) { G.time -= dt; st.beat0 += dt; }
  st.t += dt;
  jackboxThings(st, dt);
  if (G.introT > 0 || st.waiting) {
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
    if (G.introT > 0) st.beat0 = G.time + JBOX.lead;
  } else if (st.state === 'play') {
    st.phaseT = (st.phaseT || 0) + dt;
    const ph = st.phase;
    if (ph === 'crank') jackboxCrankStep(st, dt);
    else if (ph === 'fly') jackboxFlyStep(st, dt);
    else if (ph === 'boing') jackboxBoingStep(st, dt);
    else if (ph === 'yoyo' || ph === 'hook') jackboxYoyoStep(st, dt);
    else if (ph === 'haul') jackboxHaulStep(st, dt);
    else if (ph === 'swap') jackboxSwapStep(st, dt);
    if (st.phase !== ph) st.phaseT = 0;
  } else if (st.state === 'win') { G.time -= dt; if (jackboxWinStep(st, dt)) return; }
  for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
  st.plan = jackboxPlan(st);
  jackboxLooks(st, dt);
  jackboxCam(st, dt);
  jackboxMirror(st);
}

/* ---------- cranking ---------- */
function jackboxCrankStep(st, dt) {
  const D = JBOX, ps = G.players, cp = ps[st.cranker], ic = cp.input, jp = ps[st.jumper], ij = jp.input, b = st.box, N = st.c.tune.length;
  if (st.pop) {
    // the lid is popping: a moment, then the jumper flies
    st.pop.t += dt; b.lid = Math.min(1, st.pop.t / 0.12); b.spring = Math.min(1, st.pop.t / D.popT);
    if (ij.down) st.squishHeld = 1;
    if (st.pop.t >= D.popT * 0.5 && !st.pop.gone) jackboxLaunchJumper(st);
    return;
  }
  // the beat: a soft tick on every beat while the tune waits for clicks
  const bt = (G.time - st.beat0) / D.beatT, bi = Math.floor(bt + 1e-6);
  if (bi >= 0 && bi !== st.lastTick) { st.lastTick = bi; Sfx.play(bi % 4 === 0 ? 'jackboxTickHi' : 'jackboxTick'); st.box.beat = 1; }
  // aim: ◀ ▶ tilt the box a step (held: steps again every JBOX.tiltRep s)
  const dir = (ic.right ? 1 : 0) - (ic.left ? 1 : 0);
  if (dir !== st.tiltDir) { st.tiltDir = dir; st.tiltT = 0; if (dir) jackboxTilt(st, dir); }
  else if (dir && (st.tiltT += dt) > D.tiltRep) { st.tiltT = 0; jackboxTilt(st, dir); }
  // the jumper squishes the spring (held ▼)
  st.j.sq = approach(st.j.sq || 0, ij.down ? 1 : 0, dt * 6);
  if (jp.pendingAct || jp.pendingJump) jackboxHintOnce(st, 'jwait' + st.gi, st.jumper, 'In the box! Hold ' + jackboxKey(st.jumper, 'down') + ' to squish the spring', 2.6);
  // a crank click
  if (cp.pendingAct) {
    const slot = Math.max(0, Math.round(bt)), off = G.time - (st.beat0 + slot * D.beatT);
    if (slot === st.lastSlot) {
      // (one click per beat)
      b.shake = 0.25; Sfx.play('jackboxRattle');
      st.rattles = (st.rattles || 0) + 1;
      if (st.rattles >= 3) jackboxHintOnce(st, 'rattle' + st.gi, st.cranker, 'One turn per beat! Wait for the ball to land', 2.6);
    } else {
      st.lastSlot = slot;
      const a = Math.abs(off), grade = a <= D.perfW ? 2 : a <= D.goodW ? 1 : 0;
      const add = [0.25, 0.62, 1][grade];
      st.sum += add; st.grades.push(grade); st.stats.notes[st.cranker][grade]++;
      jackboxSound('jackboxNote', st.c.tune[st.note], grade);
      b.crankA += Math.PI * 2 / N * 2; b.shake = 0.18;
      st.gradeFx = { g: grade, t: 0 };
      if (grade === 2) for (let i = 0; i < 5; i++) { const a2 = Math.random() * Math.PI * 2; jackboxPart(st, b.x + st.side * D.crankDX, b.y - 30, Math.cos(a2) * 90, Math.sin(a2) * 90, 0.5, C.gold, 3, 0, 'spark'); }
      // a note flies up out of the box
      jackboxPart(st, b.x, b.y - D.boxH - 6, (Math.random() - 0.5) * 50, -70, 1.1, JBOX_TOY[st.note % 6], 7, 20, 'note');
      st.note++;
      if (st.note >= N) {
        st.pop = { t: 0 };
        Sfx.play('jackboxPop');
        rumble(st.cranker, 0.3, 0.5, 160); rumble(st.jumper, 0.5, 0.5, 200);
      }
    }
  }
  // gentle lessons
  if (st.phaseT > 5 && st.note === 0) jackboxHintOnce(st, 'crank' + st.gi, st.cranker, 'Tap ' + jackboxKey(st.cranker, 'act') + ' to turn the crank!', 3.2);
}
function jackboxTilt(st, dir) {
  const b = st.box, n = clamp(b.tilt + dir, -JBOX.tiltN, JBOX.tiltN);
  if (n !== b.tilt) { b.tilt = n; Sfx.play('jackboxTilt'); }
}
function jackboxLaunchJumper(st) {
  const D = JBOX, b = st.box, j = st.j;
  st.pop.gone = true;
  let p = jackboxPower(st, true);
  const squish = st.squishHeld || G.players[st.jumper].input.down;
  if (squish) { p += D.squish; jackboxPop(st, b.x, b.y - 130, 'Super squish!', '#ffd0f0', 18); }
  st.lastPower = p;
  const h = jackboxApexH(p), v = Math.sqrt(2 * D.g * h), a = b.tilt * D.tiltStep;
  const iu = G.players[st.jumper].input;
  // (▲ held from inside the box is not the air hop: only a fresh press in the air is; an early one doesn't use it up)
  Object.assign(j, { inBox: false, x: b.x, y: b.y - D.boxH, vx: v * Math.tan(a), vy: -v, hop: false, ribbon: false, inv: 0, face: a >= 0 ? 1 : -1, spin: 0, apex: b.y - D.boxH, y0: b.y - D.boxH, prevUp: !!(iu.up || iu.jump), early: false });
  st.phase = 'fly'; st.flyT = 0; st.stats.launches++;
  Sfx.play('jackboxBoing');
  for (let i = 0; i < 10; i++) { const a2 = -Math.PI * (0.15 + 0.7 * Math.random()); jackboxPart(st, b.x, b.y - D.boxH, Math.cos(a2) * 200, Math.sin(a2) * 200, 0.7, JBOX_TOY[i % 6], 4, 300, 'conf'); }
}

/* ---------- flying ---------- */
function jackboxFlyStep(st, dt) {
  const D = JBOX, j = st.j, jp = G.players[st.jumper], ij = jp.input, T = jackboxTarget(st), F = jackboxFrom(st);
  st.flyT += dt;
  // the box springs back down after the pop
  st.box.spring = Math.max(0, st.box.spring - dt * 2.5); st.box.lid = Math.max(0.6, st.box.lid - dt * 0.5);
  const dir = (ij.right ? 1 : 0) - (ij.left ? 1 : 0);
  if (dir) { j.face = dir; st.steerT = G.time; }
  const vx0 = j.vx;
  j.vx += dir * D.airA * dt;
  // (steering never makes you faster than airV sideways, but a launch faster than that keeps its speed)
  const lim = Math.max(D.airV, Math.abs(vx0));
  j.vx = clamp(j.vx, -lim, lim);
  // the one air hop (best at the top of the arc)
  const hopNow = jp.pendingJump || ((ij.up || ij.jump) && !j.prevUp);
  j.prevUp = !!(ij.up || ij.jump);
  if (hopNow && !j.hop) {
    if (j.vy > -D.hopV) {
      j.hop = true; j.vy = -D.hopV; j.spin = 1; Sfx.play('jackboxHop'); jackboxPop(st, j.x, j.y - 70, 'Hop!', '#ffffff', 16);
      for (let i = 0; i < 6; i++) jackboxPart(st, j.x + (Math.random() - 0.5) * 20, j.y, (Math.random() - 0.5) * 80, 60 + Math.random() * 40, 0.5, '#ffffff', 3, 0, 'dot');
    } else if (!j.early) { j.early = true; Sfx.play('jackboxHopEarly'); jackboxHint(st, st.jumper, 'Not yet! Hop at the top of the jump', 2.4); }
  }
  // gold landing pad: a gentle pull toward the landing spot all through the flight (so a wild aim still comes back)
  if (st.goldPad && (j.vy < 0 || j.y < T.y + 10)) { const aim = jackboxAimX(st); j.vx += clamp((aim - j.x) * 4 - j.vx * 0.5, -D.goldPull, D.goldPull) * dt; }
  // fans
  for (const t of st.c.things) {
    if (t.kind !== 'fan' || t.li !== st.li || !t.on) continue;
    if (j.x > t.x0 && j.x < t.x1 && j.y - D.ht / 2 > t.y0 && j.y - D.ht / 2 < t.y1) { j.vx += t.dir * D.fanA * dt; if (!t.said) { t.said = true; jackboxPop(st, j.x, j.y - 64, 'Whoosh!', '#dff6ff', 16); } }
  }
  j.vx = clamp(j.vx, -D.maxVx, D.maxVx);
  const py = j.y;
  j.vy += D.g * dt;
  j.x += j.vx * dt; j.y += j.vy * dt;
  if (j.y < j.apex) j.apex = j.y;
  // the bookshelf's sides: a soft bounce
  if (j.x < 26) { j.x = 26; j.vx = Math.abs(j.vx) * 0.5; }
  if (j.x > W - 26) { j.x = W - 26; j.vx = -Math.abs(j.vx) * 0.5; }
  if (j.inv > 0) j.inv -= dt;
  if (j.spin > 0) j.spin = Math.max(0, j.spin - dt * 2.4);
  jackboxHazards(st);
  jackboxStars(st);
  if (st.phase !== 'fly') return;
  // landing: shelves are one-way (only coming down onto the top counts)
  if (j.vy > 0) {
    const pad = st.goldPad ? D.goldPad : 0;
    if (py <= T.y + 0.5 && j.y >= T.y && j.x > T.x0 - 6 - pad && j.x < T.x1 + 6 + pad) {
      j.y = T.y; j.x = clamp(j.x, T.x0 + 12, T.x1 - 12); jackboxLanded(st); return;
    }
    if (py <= F.y + 0.5 && j.y >= F.y && j.x > F.x0 && j.x < F.x1) { j.y = F.y; jackboxStartBoing(st, 'Boing! Back to the box'); return; }
    if (j.y > F.y + 120 || st.flyT > D.flyMax) { jackboxStartBoing(st, 'Boing! A pillow caught ' + NAMES[st.jumper]); return; }
  }
}
// where the jumper should come down: near the yo-yo hook, inside the shelf
function jackboxAimX(st) {
  const T = jackboxTarget(st), L = st.L, inward = L.crane - T.x0 < T.x1 - L.crane ? 1 : -1;
  return clamp(L.crane + inward * 80, T.x0 + 40, T.x1 - 40);
}
function jackboxLanded(st) {
  const D = JBOX, j = st.j, h = Math.max(0, Math.round(((j.y0 || j.y) - j.apex) / D.cm));
  st.stats.best = Math.max(st.stats.best, h);
  j.vx = 0; j.vy = 0; j.sq = 1;
  st.phase = 'yoyo'; st.landT = G.time;
  jackboxPop(st, j.x, j.y - 80, st.boings ? 'Landed!' : 'Landed! ' + h + ' cm high!', C.gold, 24);
  Sfx.play('jackboxLand');
  rumble(st.jumper, 0.2, 0.4, 120);
  for (let i = 0; i < 10; i++) { const a = -Math.PI * Math.random(); jackboxPart(st, j.x, j.y, Math.cos(a) * 120, Math.sin(a) * 80, 0.6, '#fff3d0', 3, 200, 'dot'); }
  jackboxHint(st, st.jumper, 'Walk to the gold yo-yo hook and press ' + jackboxKey(st.jumper, 'act'), 3.4);
}
function jackboxStartBoing(st, word) {
  const j = st.j;
  st.phase = 'boing'; st.boing = { t: 0, x: j.x, y: j.y, pillowY: Math.min(j.y, jackboxFrom(st).y + 100) };
  if (j.y > jackboxFrom(st).y + 20) st.boing.pillowY = j.y;
  st.boings++; st.stats.boings++;
  jackboxMsg(st, word, '#ffd0f0', 2.4);
  Sfx.play('jackboxPillow');
  rumble(st.jumper, 0.3, 0.3, 140);
  // gold help after missed launches (only while both are playing)
  if (jackboxBothActive(st)) {
    if (st.boings >= 2 && !st.goldSpring) { st.goldSpring = true; st.box.gold = true; st.stats.helps++; jackboxMsg(st, 'Gold spring! More bounce for this launch', C.gold, 4.2); Sfx.play('jackboxHelp'); }
    else if (st.boings >= 3 && !st.goldPad) { st.goldPad = true; st.stats.helps++; jackboxMsg(st, 'Gold landing pad! The shelf is bigger and pulls you in', C.gold, 4.4); Sfx.play('jackboxHelp'); }
    else if (st.boings >= 4 && !st.goldCalm) { st.goldCalm = true; st.stats.helps++; jackboxMsg(st, 'Gold calm! Fans, cars and tails take a nap', C.gold, 4.4); Sfx.play('jackboxHelp'); }
  }
  const pl = st.plan;
  if (st.lastPower != null && st.lastPower < jackboxNeed(st) && !j.hop) jackboxHintOnce(st, 'weak' + st.gi, st.cranker, 'Crank on the beat for a higher pop!', 3);
  else if (pl && !j.hop && st.boings === 1) jackboxHintOnce(st, 'hop' + st.gi, st.jumper, 'Press ' + jackboxKey(st.jumper, 'up') + ' at the top for an air hop!', 3);
}
function jackboxBoingStep(st, dt) {
  const D = JBOX, bo = st.boing, j = st.j, b = st.box;
  bo.t += dt;
  if (bo.t < 0.35) { j.x = bo.x; j.y = bo.pillowY - 6 + Math.sin(bo.t / 0.35 * Math.PI) * 10; j.spin = 0; return; }
  const u = jackboxSmooth(clamp((bo.t - 0.35) / (D.boingT - 0.35), 0, 1));
  j.x = jackboxLerp(bo.x, b.x, u); j.y = jackboxLerp(bo.pillowY, b.y - D.boxH, u) - Math.sin(u * Math.PI) * 120;
  if (bo.t >= D.boingT) {
    st.phase = 'crank'; j.inBox = true; j.x = b.x; j.y = b.y - D.boxH; j.vx = 0; j.vy = 0;
    jackboxTune(st);
    Sfx.play('jackboxLid');
  }
}

/* ---------- things: cars, fans, mobiles, tails, ribbons ---------- */
function jackboxThings(st, dt) {
  const D = JBOX;
  for (const t of st.c.things) {
    const calm = st.goldCalm && t.li === st.li;
    if (t.kind === 'car') {
      if (calm) { t.x = approach(t.x, t.x0, dt * 200); continue; }
      t.x += t.dir * t.v * dt;
      if (t.x > t.x1) { t.x = t.x1; t.dir = -1; } else if (t.x < t.x0) { t.x = t.x0; t.dir = 1; }
      if (t.beep > 0) t.beep -= dt;
    } else if (t.kind === 'fan') {
      const cyc = D.fanOn + D.fanOff, u = ((st.t + t.ph) % cyc + cyc) % cyc;
      const was = t.on;
      t.on = !calm && u < D.fanOn; t.warn = !calm && u > cyc - 0.6;
      if (!t.on) t.said = false;
      if (t.on && !was && t.li === st.li && st.phase === 'fly') Sfx.play('jackboxFan');
      t.spin += dt * (t.on ? 24 : t.warn ? 6 : 1.5);
    } else if (t.kind === 'mobile') {
      t.a = calm ? approach(t.a, 0, dt) : t.amp * Math.sin(st.t * Math.PI * 2 / t.per + t.ph);
      t.bx = t.x + Math.sin(t.a) * t.len; t.by = t.y + Math.cos(t.a) * t.len;
    } else if (t.kind === 'tail') {
      const q = jackboxTailAt(t, st.t, calm);
      t.a = q.a; t.sw = q.sw; t.pts = q.pts;
    } else if (t.kind === 'ribbon') { if (t.wig > 0) t.wig -= dt; }
  }
}
// the cat's tail at time tt: a swish rests, then sweeps out and back (a pure function of time, so the brain can look ahead)
function jackboxTailAt(t, tt, calm) {
  const D = JBOX, cyc = 3.2, u = ((tt + t.ph * 0.7) % cyc) / cyc, sw = calm ? 0 : u < 0.5 ? 0 : Math.sin((u - 0.5) / 0.5 * Math.PI);
  const a = (calm ? 0.1 : 0.15) + sw * 1.15, pts = [];
  for (let i = 1; i <= D.tailN; i++) {
    const k = i / D.tailN, ang = a * k + Math.sin(tt * 3 + k * 2) * 0.12;
    pts.push({ x: t.x + t.dir * Math.sin(ang) * t.len * k, y: t.y + Math.cos(ang) * t.len * k });
  }
  return { a, sw, pts };
}
// a toy car's x a little later (it bounces between its track ends)
function jackboxCarAt(t, ahead) {
  let x = t.x, dir = t.dir, left = Math.max(0, ahead) * t.v;
  for (let i = 0; i < 20 && left > 0; i++) {
    const room = dir > 0 ? t.x1 - x : x - t.x0, go = Math.min(room, left);
    x += dir * go; left -= go;
    if (left > 0) dir = -dir;
  }
  return x;
}
// would a pop now (after `delay` s), with this tilt and power and no steering, run into the car, mobile or tail?
function jackboxRisk(st, tilt, power, delay) {
  const D = JBOX, r = jackboxPredict(st, tilt, power);
  if (st.goldCalm) return false;
  for (const q of r.pts) {
    const tt = delay + q.t, cy = q.y - D.ht / 2;
    for (const t of st.c.things) {
      if (t.li !== st.li) continue;
      if (t.kind === 'car') { const cx = jackboxCarAt(t, tt); if (Math.abs(q.x - cx) < D.carW / 2 + D.hw + 14 && Math.abs(cy - (t.y - D.carH / 2)) < D.carH / 2 + D.ht / 2 + 8) return true; }
      else if (t.kind === 'mobile') { const a = t.amp * Math.sin((st.t + tt) * Math.PI * 2 / t.per + t.ph), bx = t.x + Math.sin(a) * t.len, by = t.y + Math.cos(a) * t.len; if (Math.hypot(q.x - bx, cy - by) < D.mobR + 26) return true; }
      else if (t.kind === 'tail') { for (const p of jackboxTailAt(t, st.t + tt, false).pts) if (Math.hypot(q.x - p.x, cy - p.y) < 30) return true; }
    }
  }
  return false;
}
function jackboxHazards(st) {
  const D = JBOX, j = st.j, cx = j.x, cy = j.y - D.ht / 2;
  for (const t of st.c.things) {
    if (t.li !== st.li) continue;
    if (t.kind === 'ribbon') {
      if (!j.ribbon && Math.abs(cx - t.x) < 18 && cy > t.y0 && cy < t.y1 + 10) {
        j.ribbon = true; t.wig = 1; j.vy = Math.min(j.vy, -560);
        jackboxPop(st, cx, cy - 50, 'Boing! Bouncy ribbon!', '#ffd6f2', 18); Sfx.play('jackboxRibbon'); st.stats.ribbons++;
      }
      continue;
    }
    if (j.inv > 0 || (st.goldCalm && t.kind !== 'fan')) continue;
    if (t.kind === 'car') {
      const bx = t.x, by = t.y - D.carH / 2;
      if (Math.abs(cx - bx) < D.carW / 2 + D.hw && Math.abs(cy - by) < D.carH / 2 + D.ht / 2) {
        const s = cx < bx ? -1 : 1;
        j.vx = s * 300 + t.dir * t.v * 0.3; j.vy = Math.max(j.vy, 60); j.inv = 0.8; j.spin = 1; t.beep = 0.6;
        jackboxBump(st, t, 'Beep beep!');
      }
    } else if (t.kind === 'mobile') {
      const dx = cx - t.bx, dy = cy - t.by, dd = Math.hypot(dx, dy);
      if (dd < D.mobR + 16) {
        const ux = dd > 0.1 ? dx / dd : 0, uy = dd > 0.1 ? dy / dd : -1, sp = Math.max(260, Math.hypot(j.vx, j.vy) * 0.7);
        j.vx = ux * sp; j.vy = uy * sp; j.inv = 0.6;
        jackboxBump(st, t, 'Boing!');
      }
    } else if (t.kind === 'tail') {
      for (const q of t.pts) {
        if (Math.hypot(cx - q.x, cy - q.y) < 22) {
          j.vx = t.dir * (220 + t.sw * 160); j.vy = Math.max(j.vy, -60); j.inv = 0.8; j.spin = 0.6;
          jackboxBump(st, t, 'Swish!');
          break;
        }
      }
    }
  }
}
function jackboxBump(st, t, word) {
  const j = st.j;
  t.bumps++; st.bumpsHere++; st.stats.bumps++;
  jackboxPop(st, j.x, j.y - 70, word, '#ffffff', 22);
  Sfx.play(t.kind === 'car' ? 'jackboxBeep' : t.kind === 'tail' ? 'jackboxSwish' : 'jackboxBonk');
  rumble(st.jumper, 0.3, 0.3, 120);
  if (t.kind === 'car') jackboxHintOnce(st, 'car' + st.gi, st.jumper, 'Steer round the toy car!', 2.6);
}
function jackboxStars(st) {
  const j = st.j, cy = j.y - JBOX.ht / 2;
  for (const s of st.c.stars) {
    if (s.got || s.li !== st.li) continue;
    if (Math.abs(s.x - j.x) < 26 && Math.abs(s.y - cy) < 30) {
      s.got = true; s.t = 0; st.stats.stars++;
      Sfx.play('jackboxStar');
      for (let i = 0; i < 7; i++) { const a = Math.random() * Math.PI * 2; jackboxPart(st, s.x, s.y, Math.cos(a) * 90, Math.sin(a) * 90, 0.55, C.gold, 3, 0, 'spark'); }
    }
  }
}

/* ---------- the yo-yo lift ---------- */
function jackboxYoyoStep(st, dt) {
  const D = JBOX, ps = G.players, j = st.j, jp = ps[st.jumper], ij = jp.input, cp = ps[st.cranker], T = jackboxTarget(st), L = st.L;
  if (j.sq > 0) j.sq = Math.max(0, j.sq - dt * 4);
  if (st.phase === 'yoyo') {
    // the jumper walks to the hook
    const dir = (ij.right ? 1 : 0) - (ij.left ? 1 : 0);
    if (dir) { j.face = dir; j.walk = (j.walk || 0) + dt * 10; }
    j.x = clamp(j.x + dir * D.walkV * dt, T.x0 + 12, T.x1 - 12);
    // (gold help: a jumper who keeps wandering about gets the hook rolled over to them)
    if (!st.goldHook && G.time - st.landT > D.goldHookT && G.time - st.inT[st.cranker] < 30 && G.time - st.inT[st.jumper] < 1) {
      st.goldHook = true; st.stats.helps++; jackboxMsg(st, 'Gold yo-yo hook! It rolls over to ' + NAMES[st.jumper], C.gold, 4); Sfx.play('jackboxHelp');
    }
    if (st.goldHook) st.hookX = approach(st.hookX, clamp(j.x, T.x0 + 12, T.x1 - 12), dt * 140);
    const at = Math.abs(j.x - st.hookX) < D.craneR;
    if (jp.pendingAct) {
      if (at) {
        j.x = st.hookX; j.face = L.hang > j.x ? 1 : -1;
        st.yoyo = { t: 0 }; st.phase = 'hook'; st.hints[st.jumper] = null;
        Sfx.play('jackboxYoyo');
        jackboxHint(st, st.cranker, 'Press ' + jackboxKey(st.cranker, 'act') + ' to hook the box and hop in!', 3.2);
      } else { Sfx.play('jackboxNo'); jackboxHint(st, st.jumper, 'Walk to the gold hook ' + (st.hookX < j.x ? '◀' : '▶'), 2.4); }
    }
    if (cp.pendingAct) jackboxHintOnce(st, 'early' + st.gi, st.cranker, 'Wait for ' + NAMES[st.jumper] + "'s yo-yo!", 2.4);
    if (G.time - st.landT > 8) jackboxHintOnce(st, 'walk' + st.gi, st.jumper, 'Walk to the gold yo-yo hook ' + (st.hookX < j.x ? '◀' : '▶') + ' and press ' + jackboxKey(st.jumper, 'act'), 3.4);
  } else {
    st.yoyo.t += dt;
    if (jp.pendingAct && st.yoyo.t > D.yoyoT) jackboxHintOnce(st, 'hookwait' + st.gi, st.jumper, 'Wait for ' + NAMES[st.cranker] + ' to hook the box', 2.4);
    if (cp.pendingAct) {
      if (st.yoyo.t < D.yoyoT) jackboxHint(st, st.cranker, 'Wait for the yo-yo to come down...', 1.6);
      else {
        st.phase = 'haul'; st.haul = 0; st.cr.inBox = true; st.haulX0 = st.box.x; st.hints[st.cranker] = null;
        st.box.lid = 0.65; st.box.spring = 0;
        Sfx.play('jackboxHook');
        jackboxPop(st, st.box.x, st.box.y - 90, 'Hooked!', C.gold, 22);
        jackboxHint(st, st.jumper, 'Haul! Tap ' + jackboxKey(st.jumper, 'act') + ' again and again', 3);
      }
    }
    if (st.yoyo.t > 9) jackboxHintOnce(st, 'hook' + st.gi, st.cranker, 'Press ' + jackboxKey(st.cranker, 'act') + ' to hook the yo-yo!', 3);
  }
}
// where the box hangs while it is hauled up (u 0..1)
function jackboxHaulPos(st, u) {
  const L = st.L, F = jackboxFrom(st), T = jackboxTarget(st), sw = jackboxSmooth(clamp(u * 3, 0, 1));
  return { x: jackboxLerp(st.haulX0, L.hang, sw), y: jackboxLerp(F.y, T.y, jackboxSmooth(u)) - Math.sin(clamp(u * 3, 0, 1) * Math.PI) * 14 };
}
function jackboxHaulStep(st, dt) {
  const D = JBOX, jp = G.players[st.jumper], j = st.j;
  if (jp.pendingAct) {
    const gap = G.time - st.haulLast;
    st.haul = Math.min(1, st.haul + (gap < D.haulGap ? 0.5 : 1) / D.haulN);
    st.haulLast = G.time; j.heave = 1;
    jackboxSound('jackboxHeave', st.haul);
    if (st.haul >= 1) {
      st.phase = 'swap'; st.swap = { t: 0, x0: st.box.x, jx0: j.x, crx: 0 };
      Sfx.play('jackboxPlop');
    }
  }
  // (the box sags a tiny bit when nobody hauls, never below where it started)
  st.boxU = approach(st.boxU || 0, st.haul, dt * 2.2);
  const p = jackboxHaulPos(st, st.boxU);
  st.box.x = p.x; st.box.y = p.y; st.box.tilt = 0;
  st.cr.x = p.x; st.cr.y = p.y;
}
function jackboxSwapStep(st, dt) {
  const D = JBOX, sw = st.swap, L = st.L, T = jackboxTarget(st), j = st.j, b = st.box;
  sw.t += dt;
  st.boxU = approach(st.boxU || 0, 1, dt * 3);
  const u = jackboxSmooth(clamp(sw.t / 0.6, 0, 1));
  // the box plops onto the new shelf; the old cranker is already inside, the hauler walks to the crank
  b.x = jackboxLerp(L.hang, L.next, u); b.y = T.y - Math.sin(u * Math.PI) * 26;
  st.cr.x = b.x; st.cr.y = b.y;
  const lastHere = st.li >= st.c.launches.length - 1, lastAll = lastHere && G.level.def.roomIndex >= G.level.def.roomCount - 1;
  // where the hauler goes: the next crank spot (or a cheer by the box)
  const nside = (() => { const x = L.next; return x - T.x0 > T.x1 - x ? -1 : 1; })();
  const goX = L.next + nside * D.crankDX;
  j.x = jackboxLerp(sw.jx0, goX, jackboxSmooth(clamp((sw.t - 0.2) / 0.8, 0, 1))); j.walk = (j.walk || 0) + dt * 10; j.face = goX > sw.jx0 ? 1 : -1;
  if (sw.t > 0.6 && !sw.said) {
    sw.said = true;
    st.roomDone = st.roomDone || 0;
    const nj = st.cranker;
    if (!lastHere) jackboxMsg(st, 'Swap! ' + NAMES[nj] + ' jumps, ' + NAMES[1 - nj] + ' cranks', '#ffe7a8', 2.6);
    Sfx.play('jackboxSwap');
  }
  if (sw.t < D.swapT) return;
  st.stats.roomT[st.k] = G.time - st.segStart;
  if (!lastHere) { jackboxLaunch(st, st.li + 1, false); return; }
  if (!lastAll) { nextRoom(); return; }
  jackboxStartWin(st);
}

/* ---------- the top: the trophy star ---------- */
function jackboxStartWin(st) {
  st.state = 'win'; st.win = { t: 0 };
  st.stats.finishT = G.time;
  jackboxPop(st, W / 2, jackboxTarget(st).y - 170, 'Top of the bookshelf!', C.gold, 30);
  Sfx.play('jackboxFanfare');
  rumble(0, 0.2, 0.5, 200); rumble(1, 0.2, 0.5, 200);
}
function jackboxWinStep(st, dt) {
  const w = st.win, T = jackboxTarget(st);
  w.t += dt;
  if (w.t > 0.8 && !w.conf) {
    w.conf = true; Sfx.play('jackboxCheer');
    const tr = st.c.deco.find(d => d[0] === 'trophy');
    const tx = tr ? tr[1] : W / 2;
    for (let i = 0; i < 70; i++) { const a = -Math.PI * (0.1 + 0.8 * Math.random()); jackboxPart(st, tx, T.y - 70, Math.cos(a) * 280, Math.sin(a) * 280, 1.6, JBOX_TOY[i % 6], 4, 300, 'conf'); }
  }
  if (w.t >= JBOX.winT && !w.cleared) {
    w.cleared = true;
    G.level.goal = { x: W / 2, y: T.y - 60 - st.cam };
    levelClear();
    return true;
  }
  return false;
}

/* ---------- what the team needs to do right now (prompts, panels and the computer read this) ----------
   job: the phase; tilt: the tilt step that lands the pop nearest the shelf (no steering); steer: -1|0|1 for the jumper
   in the air; hop: hop now; aimX: where to come down; walk: -1|0|1 to the yo-yo hook; need: the power that reaches the
   shelf without a hop; pow: the power so far (if the rest is Perfect: powMax) */
function jackboxPlan(st) {
  const D = JBOX, out = { job: st.phase, tilt: 0, steer: 0, hop: false, walk: 0, aimX: 0, need: 0, pow: 0, powMax: 0 };
  if (!st.c || st.state !== 'play') return out;
  const T = jackboxTarget(st), j = st.j;
  out.aimX = jackboxAimX(st); out.need = jackboxNeed(st);
  out.pow = jackboxPower(st, true); out.powMax = jackboxPower(st, false);
  if (st.phase === 'crank') {
    // the best tilt for the power the tune is heading for (Perfect from here on, or what's played plus Good)
    const p = st.note > 0 ? Math.min(out.powMax, out.pow + D.pK * (st.c.tune.length - st.note) / st.c.tune.length * 0.8) : out.powMax;
    let best = null;
    for (let k = -D.tiltN; k <= D.tiltN; k++) {
      const r = jackboxPredict(st, k, p);
      const miss = r.reach ? Math.abs(r.x - out.aimX) : 4000 + Math.abs(r.x - out.aimX);
      const cost = miss + Math.abs(k) * 4;
      if (!best || cost < best.cost) best = { k, cost, r };
    }
    out.tilt = best.k; out.pred = best.r;
  } else if (st.phase === 'fly') {
    const ya = j.vy < 0 ? j.y - j.vy * j.vy / (2 * D.g) : j.y;
    out.reach = ya < T.y - 18;
    out.hop = !j.hop && !out.reach && j.vy > -180 && j.y > T.y - 40;
    // time until the feet come down onto the shelf's height
    let tl = 0.25;
    if (out.reach || j.vy < 0) {
      const dy = T.y - j.y, disc = j.vy * j.vy + 2 * D.g * dy;
      tl = disc > 0 ? Math.max(0.12, (-j.vy + Math.sqrt(disc)) / D.g) : Math.max(0.12, -j.vy / D.g);
    }
    // aim: a star on the way (rising), then the landing spot
    let ax = out.aimX;
    if (j.vy < -60) {
      let bs = null;
      for (const s of st.c.stars) {
        if (s.got || s.li !== st.li || s.y > j.y - 30 || s.y < ya - 10) continue;
        const dyS = s.y - j.y, disc = j.vy * j.vy + 2 * D.g * dyS;
        if (disc < 0) continue;
        const ts = (-j.vy - Math.sqrt(disc)) / D.g;
        if (ts < 0.1) continue;
        const need = (s.x - j.x) / ts;
        if (Math.abs(need) > D.airV * 0.9) continue;
        // (only if the shelf can still be reached afterwards)
        const after = Math.abs(out.aimX - s.x) / Math.max(0.15, tl - ts);
        if (after > D.airV * 0.9) continue;
        if (!bs || ts < bs.ts) bs = { ts, x: s.x, need };
      }
      if (bs) { ax = bs.x; tl = bs.ts; out.star = bs; }
    }
    // steer to the speed that gets there in time (fans push: lean against them)
    let want = (ax - j.x) / tl;
    for (const t of st.c.things) if (t.kind === 'fan' && t.li === st.li && t.on && j.x > t.x0 && j.x < t.x1 && j.y - D.ht / 2 > t.y0 - 40 && j.y - D.ht / 2 < t.y1 + 40) want -= t.dir * 90;
    // and away from a car or mobile right in the way
    for (const t of st.c.things) {
      if (t.li !== st.li || st.goldCalm) continue;
      if (t.kind === 'car' && Math.abs(j.y - D.ht / 2 - (t.y - 12)) < 90 && Math.abs(j.x - t.x) < 90 && (j.vy > 0 ? t.y > j.y - 40 : t.y < j.y)) want += (j.x < t.x ? -1 : 1) * 160;
      if (t.kind === 'mobile' && Math.hypot(j.x - t.bx, j.y - 20 - t.by) < 100) want += (j.x < t.bx ? -1 : 1) * 160;
      if (t.kind === 'tail' && t.pts.length && Math.abs(j.y - 20 - t.y - t.len * 0.5) < 110 && Math.abs(j.x - t.x - t.dir * t.len * 0.4) < 120) want += -t.dir * 120;
    }
    out.want = want;
    if (j.vx < want - 22) out.steer = 1; else if (j.vx > want + 22) out.steer = -1;
  } else if (st.phase === 'yoyo') {
    const dx = st.hookX - j.x;
    out.walk = Math.abs(dx) < JBOX.craneR * 0.6 ? 0 : Math.sign(dx);
    out.atHook = Math.abs(dx) < JBOX.craneR;
  }
  return out;
}
// a pop with no steering: where does it come down at the target shelf's height (reach: does it get above it)?
function jackboxPredict(st, tilt, power) {
  const D = JBOX, b = st.box, T = jackboxTarget(st);
  const h = jackboxApexH(power), v = Math.sqrt(2 * D.g * h), a = tilt * D.tiltStep;
  let x = b.x, y = b.y - D.boxH, vx = v * Math.tan(a), vy = -v, tt = 0;
  const pts = [], dt = 1 / 60;
  let reach = false, apex = y;
  for (let i = 0; i < 400; i++) {
    tt += dt;
    vy += D.g * dt; x += vx * dt; y += vy * dt;
    if (x < 26) { x = 26; vx = Math.abs(vx) * 0.5; }
    if (x > W - 26) { x = W - 26; vx = -Math.abs(vx) * 0.5; }
    if (y < apex) apex = y;
    if (i % 3 === 0) pts.push({ x, y, t: tt });
    if (y < T.y - 18) reach = true;
    if (vy > 0 && y >= T.y && reach) return { x, y: T.y, reach: true, pts, apex, t: tt };
    if (vy > 0 && y > b.y) break;
  }
  return { x, y, reach: false, pts, apex, t: tt };
}

/* ---------- small helpers ---------- */
// a level sound with its own arguments (Sfx.play passes only the player's pitch)
function jackboxSound(n, a, b) { try { if (Sfx.extra[n]) Sfx.extra[n].call(Sfx, a, b); } catch (e) { /* no sound */ } }
function jackboxHint(st, id, text, life) { if (jackboxQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || 2.8 }; }
function jackboxHintOnce(st, key, id, text, life) { if (st.hinted[key]) return; st.hinted[key] = true; jackboxHint(st, id, text, life || 3.2); }
function jackboxMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function jackboxPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 10) st.pops.shift(); }
function jackboxPart(st, x, y, vx, vy, life, col, size, lift, kind) {
  if (st.parts.length > 260) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, lift: lift || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
// the touch buttons and the top-bar legend name each player's own action this launch
let jackboxLabelEls = null;
function jackboxActLabels(st) {
  try {
    if (!jackboxLabelEls || !jackboxLabelEls.every(o => document.contains(o.el))) jackboxLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const ds = box && (box.dataset.p !== undefined ? box.dataset.p : box.dataset.legp);
      const id = ds !== undefined && ds !== null ? +ds : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    const ph = st.phase;
    const word = id => id < 0 ? 'action' : id === st.cranker ? (ph === 'hook' || ph === 'yoyo' ? 'hook' : 'crank') : (ph === 'yoyo' ? 'yo-yo' : 'haul');
    if (typeof setActWords === 'function') setActWords([word(0), word(1)]);   // (the cards follow the live words)
    let changed = false;
    for (const o of jackboxLabelEls) { const want = word(o.id); if (o.el.textContent !== want) { o.el.textContent = want; changed = true; } }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}
// the camera: the box sits just above the bottom HUD, with the target shelf in view above it when it fits (when it
// doesn't, the shelf the jumper is on wins); in the air it follows the jumper up, never dropping below the box view
function jackboxCamWant(st) {
  const b = st.box, j = st.j, T = st.c.ledges[st.L.to], big = hudBig();
  const foot = H - (big ? 160 : 132), head = big ? 120 : 96;
  const camBox = b.y - foot, camT = T.y - head;
  let cam;
  if (st.state === 'win') cam = T.y - H * 0.55;
  else if (st.phase === 'fly' || st.phase === 'boing') cam = Math.min(camBox, j.y - H * 0.42);
  else if (st.phase === 'swap') { const nb = T.y - foot; cam = Math.max(camT, Math.min(nb, camBox)); }
  else cam = camT >= camBox ? (camT + camBox) / 2 : (st.phase === 'crank' ? camBox : camT);
  const top = st.c.ledges.reduce((m, l) => Math.min(m, l.y), 0);
  return clamp(cam, top - 300, 150 - H);
}
function jackboxCam(st, dt) {
  const want = jackboxCamWant(st);
  if (st.cam == null) st.cam = want;
  st.cam += (want - st.cam) * Math.min(1, dt * (st.phase === 'fly' ? 4.5 : 2.6));
}
function jackboxLooks(st, dt) {
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vy += q.lift * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 5;
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.4);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  const b = st.box;
  if (b) { if (b.shake > 0) b.shake = Math.max(0, b.shake - dt); if (b.beat > 0) b.beat = Math.max(0, b.beat - dt * 4); }
  if (st.j && st.j.heave > 0) st.j.heave = Math.max(0, st.j.heave - dt * 4);
  if (st.gradeFx && (st.gradeFx.t += dt) > 0.7) st.gradeFx = null;
  for (const s of st.c.stars) if (s.got) s.t += dt;
}
// where each player is drawn (world px: feet)
function jackboxSpot(st, id) {
  if (id === st.jumper) {
    if (st.j.inBox) return { x: st.box.x, y: st.box.y - JBOX.boxH + 10 };
    return { x: st.j.x, y: st.j.y };
  }
  if (st.cr.inBox) return { x: st.box.x, y: st.box.y - JBOX.boxH + 10 };
  return { x: st.cr.x, y: st.cr.y };
}
// copy the spots into the engine players (screen px): name tags and bubbles read p.x / p.y
function jackboxMirror(st) {
  for (const p of G.players) {
    const s = jackboxSpot(st, p.id);
    p.x = s.x - PW / 2; p.y = s.y - st.cam - PH - 10;
    p.alive = true; p.grounded = true; p.stompSafe = 0; p.vy = 0; p.vx = 0; p.stun = 0;
  }
}

MODES.jackbox = {
  JBOX,
  medals: { bronze: 'Reach the top of the bookshelf', goals: [
    { key: 'time', gold: 225, silver: 360 }, { key: 'boings', gold: 3, silver: 10, word: 'Boing' },
    { key: 'stars', gold: 0.55, more: true, pct: true, word: 'the stars' }, { key: 'helps', gold: 0, word: 'gold help', text: 'No gold help' },
  ] },
  medalValues() { const st = G.mst, s = st.stats; return s ? { time: s.finishT || G.time, boings: s.boings, stars: s.stars / (st.allStars || 1), helps: s.helps } : {}; },
  plan: jackboxPlan, predict: jackboxPredict, risk: jackboxRisk, key: jackboxKey, power: jackboxPower, need: jackboxNeed, aimX: jackboxAimX,
  // where the computer's speech bubble goes: over where the level draws it
  bubblePos(p) {
    const st = G.mst;
    if (!st || !st.c || !st.j) return null;
    const s = jackboxSpot(st, p.id);
    return { x: clamp(s.x, 70, W - 70), y: clamp(s.y - st.cam - 70, 90, H - 120) };
  },
  setup(st, L) {
    st.stats = { stars: 0, boings: 0, bumps: 0, ribbons: 0, helps: 0, launches: 0, best: 0, notes: [[0, 0, 0], [0, 0, 0]], roomT: [], finishT: 0 };
    const def = LEVELS[G.levelIndex];
    st.allStars = (def.rooms || [def]).reduce((n, r) => n + (r.stars || []).length, 0);
    st.inT = [-99, -99]; st.personT = G.time; st.t = 0;
    jackboxRoom(st, L, 0);
  },
  room(k, L) { jackboxRoom(G.mst, L, k); },
  step(dt) { jackboxStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then, and drawn by the mode instead
  draw() {
    const st = G.mst;
    if (!st.c) return;
    jackboxDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.c) return;
    jackboxDrawFront(st);
  },
  hud() { const st = G.mst; if (st.c) jackboxHud(st); },
  stats() {
    const st = G.mst, s = st.stats;
    if (!s) return [];
    const all = st.allStars || 1, frac = s.stars / all;
    const perf = s.notes[0][2] + s.notes[1][2], tot = s.notes[0].reduce((a, b) => a + b, 0) + s.notes[1].reduce((a, b) => a + b, 0);
    const out = [
      { label: 'Stars', value: s.stars + ' of ' + st.allStars },
      { label: 'Boings', value: String(s.boings) },
      { label: 'Best launch', value: s.best + ' cm' },
    ];
    const words = frac >= 0.85 && s.boings <= 1 ? 'Star catchers! Right to the top of the bookshelf!' : s.boings <= 3 ? 'Up, up, up the bookshelf. Lovely launching!' : 'Boing, boing... and up! You made it to the top together!';
    out.push(words + ' Cranked on the beat: ' + perf + ' of ' + tot + ' notes Perfect.');
    out.push('Perfect cranks: ' + NAMES[0] + ' ' + s.notes[0][2] + ', ' + NAMES[1] + ' ' + s.notes[1][2] + '.' + (s.bumps ? ' Bumps on the way: ' + s.bumps + '.' : '') +
      (s.helps ? ' Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!' : ''));
    return out;
  },
};

/* ---------- drawing (world px; drawn after translate(0, -cam)) ---------- */
const JBOX_LOOK = {
  books: { wall: ['#bfe0ff', '#e4f2ff'], back: '#f0d2a8', grain: 'rgba(160,110,60,0.13)', dark: 0 },
  toys: { wall: ['#ffd9e6', '#fff1d6'], back: '#eccb9c', grain: 'rgba(160,110,60,0.13)', dark: 0 },
  night: { wall: ['#3a3f86', '#5a5aa6'], back: '#a98e78', grain: 'rgba(40,30,60,0.18)', dark: 0.32 },
  top: { wall: ['#ffc9a0', '#ffe9c2'], back: '#e7c391', grain: 'rgba(160,110,60,0.13)', dark: 0 },
};

/* ---------- richer props (cached pictures; drawing only) ---------- */
// a bookshelf plank: grained board, a lit front lip, end grain on the cut ends, a shadow on the back panel, brackets with screws
function jackboxPaintShelf(c, w, top, s) {
  const col = top ? '#9a5f30' : '#c98a52';
  c.fillStyle = 'rgba(60,30,10,0.18)'; c.fillRect(6, 18, w - 4, 10);
  for (const bx of [26, w - 34]) {
    c.fillStyle = '#8e5a2e'; c.beginPath(); c.moveTo(bx, 18); c.lineTo(bx + 8, 18); c.lineTo(bx + 8, 44); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.beginPath(); c.moveTo(bx, 18); c.lineTo(bx + 2, 18); c.lineTo(bx + 8, 42); c.lineTo(bx + 8, 44); c.closePath(); c.fill();
    c.strokeStyle = '#6a4020'; c.lineWidth = 1; c.beginPath(); c.moveTo(bx, 18); c.lineTo(bx + 8, 18); c.lineTo(bx + 8, 44); c.closePath(); c.stroke();
    ERICH.rivets(c, [[bx + 5.5, 30]], 1.2, '#c8c0b0');
  }
  ERICH.board(c, 0, 0, w, 18, { col, seed: s + 5, r: 3, lw: 2, edge: '#8e5a2e', nails: false, knots: w > 300 ? 1 : 0 });
  c.fillStyle = top ? '#b4743e' : '#dca06a'; c.fillRect(2, 0, w - 4, 5);
  c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(3, 0.5, w - 6, 1.2);
  c.fillStyle = 'rgba(60,30,10,0.18)'; c.fillRect(2, 13, w - 4, 5);
  for (const ex of [3, w - 3]) { c.strokeStyle = 'rgba(90,50,20,0.45)'; c.lineWidth = 0.8; for (let k = 1; k <= 2; k++) { c.beginPath(); c.ellipse(ex, 10, 1.4 * k, 3 * k, 0, 0, Math.PI * 2); c.stroke(); } }
  c.strokeStyle = '#8e5a2e'; c.lineWidth = 2; rrOn(c, 0, 0, w, 18, 3); c.stroke();
}
// the toy box on the carpet: painted planks, a white name panel with an inner shadow, corner guards
function jackboxPaintToyBox(c, tw, th) {
  c.fillStyle = 'rgba(28,26,54,0.2)'; rrOn(c, 4, -th + 4, tw, th, 8); c.fill();
  c.save(); rrOn(c, 0, -th, tw, th, 8); c.clip();
  for (let x = 0, i = 0; x < tw; x += 34, i++) ERICH.board(c, x, -th, 34, th, { col: i % 2 ? '#4fb5ff' : '#46aaf4', seed: i + 20, vert: true, r: 0, lw: 0.8, edge: '#2f80c8', nails: false, knots: 0 });
  c.fillStyle = 'rgba(20,40,90,0.18)'; c.fillRect(tw - 30, -th, 30, th);
  c.restore();
  c.fillStyle = 'rgba(28,26,54,0.18)'; rrOn(c, 11, -th + 13, tw - 20, th - 24, 6); c.fill();
  c.fillStyle = '#ffffff'; rrOn(c, 10, -th + 12, tw - 20, th - 24, 6); c.fill();
  c.strokeStyle = 'rgba(40,80,140,0.3)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(12, -13); c.lineTo(12, -th + 14); c.lineTo(tw - 12, -th + 14); c.stroke();
  for (const [x, yy, sx, sy] of [[0, -th, 1, 1], [tw, -th, -1, 1], [0, 0, 1, -1], [tw, 0, -1, -1]]) {
    c.fillStyle = '#ffc43d'; c.beginPath(); c.moveTo(x, yy); c.lineTo(x + 14 * sx, yy); c.lineTo(x, yy + 14 * sy); c.closePath(); c.fill();
    ERICH.rivets(c, [[x + 4 * sx, yy + 4 * sy]], 1.1, '#fff0b0');
  }
  c.strokeStyle = '#2a5a90'; c.lineWidth = 2.5; rrOn(c, 0, -th, tw, th, 8); c.stroke();
}
function jackboxDrawWorld(st) {
  const cam = st.cam, lk = JBOX_LOOK[st.c.look] || JBOX_LOOK.books;
  // the bookshelf's back panel, warm wood with a grain
  ctx.fillStyle = lk.back; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = lk.grain; ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const x = 50 + i * 66 + (hash(i, 4) % 20);
    ctx.beginPath();
    for (let y = -20; y <= H + 20; y += 30) { const wy = y + cam; ctx.lineTo(x + Math.sin(wy * 0.012 + i) * 6, y); }
    ctx.stroke();
  }
  // the back panel is made of boards: seams with a lit edge, and the sides fall into shade
  for (let i = 0; i < 6; i++) { const x = 80 + i * 160; ctx.fillStyle = 'rgba(60,30,10,0.16)'; ctx.fillRect(x, 0, 3, H); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x + 3, 0, 2, H); }
  { const g = jackboxDrawWorld.side || (jackboxDrawWorld.side = (() => { const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(40,20,5,0.22)'); g.addColorStop(0.18, 'rgba(40,20,5,0)'); g.addColorStop(0.82, 'rgba(40,20,5,0)'); g.addColorStop(1, 'rgba(40,20,5,0.22)'); return g; })()); ctx.fillStyle = g; ctx.fillRect(0, 0, W * 0.18, H); ctx.fillRect(W * 0.82, 0, W * 0.18, H); }
  // knots in the wood
  ctx.fillStyle = lk.grain;
  for (let i = 0; i < 40; i++) {
    const wy = -3000 + i * 90, y = wy - cam;
    if (y < -20 || y > H + 20) continue;
    const x = 80 + (hash(i, 8) % 800);
    ctx.beginPath(); ctx.ellipse(x, y, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save(); ctx.translate(0, -cam);
  const top = cam - 60, bot = cam + H + 60;
  // the carpet and the bed at the very bottom (the first shelf)
  if (bot > -40) jackboxDrawCarpet(st);
  // the ceiling, a window and the evening sky above the top shelf
  const topY = st.c.ledges.reduce((m, l) => Math.min(m, l.y), 0);
  if (st.c.look === 'top' && top < topY - 200) jackboxDrawCeiling(st, topY);
  // the wall shelf the cat sleeps on, and other deco
  for (const d of st.c.deco) if (d[0] === 'wallshelf' && d[3] > top && d[3] < bot) jackboxDrawWallShelf(d[1], d[2], d[3]);
  // the toy track a car zooms along
  for (const t of st.c.things) if (t.kind === 'car' && t.y > top && t.y < bot) jackboxDrawTrack(t);
  // shelves (the target glows)
  st.c.ledges.forEach((l, i) => { if (l.y > top && l.y < bot + 30 && l.kind !== 'carpet') jackboxDrawShelf(st, l, i); });
  for (const d of st.c.deco) jackboxDrawDeco(st, d, top, bot);
  // the yo-yo hook on the target shelf
  if (st.state === 'play') jackboxDrawHook(st);
  // gold landing pad and arrow
  if (st.goldPad && st.state === 'play' && (st.phase === 'fly' || st.phase === 'crank' || st.phase === 'boing')) {
    const T = jackboxTarget(st), a = 0.5 + 0.3 * Math.sin(G.clock * 6);
    ctx.fillStyle = 'rgba(255,211,74,' + a + ')'; rr(T.x0 - JBOX.goldPad, T.y - 6, T.x1 - T.x0 + JBOX.goldPad * 2, 10, 5); ctx.fill();
    const ax = jackboxAimX(st), ay = T.y - 70 - Math.abs(Math.sin(G.clock * 4)) * 10;
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax, ay + 22); ctx.lineTo(ax - 15, ay); ctx.lineTo(ax - 6, ay); ctx.lineTo(ax - 6, ay - 16); ctx.lineTo(ax + 6, ay - 16); ctx.lineTo(ax + 6, ay); ctx.lineTo(ax + 15, ay); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // stars
  for (const s of st.c.stars) {
    if (s.y < top || s.y > bot) continue;
    if (!s.got) jackboxDrawStar(s.x, s.y + Math.sin(G.clock * 2.5 + s.x * 0.05) * 3, 13, s.li === st.li && st.state === 'play' ? 1 : 0.55);
    else if (s.t < 0.5) { ctx.globalAlpha = 1 - s.t / 0.5; jackboxDrawStar(s.x, s.y - s.t * 60, 13 + s.t * 12, 1); ctx.globalAlpha = 1; }
  }
  // things
  for (const t of st.c.things) {
    const live = t.li === st.li;
    if (t.kind === 'fan') { if (t.y > top && t.y < bot) jackboxDrawFan(st, t, live); }
    else if (t.kind === 'car') { if (t.y > top && t.y < bot) jackboxDrawCar(t); }
    else if (t.kind === 'mobile') { if (t.y > top - 200 && t.y < bot) jackboxDrawMobile(t); }
    else if (t.kind === 'tail') { if (t.y > top - 100 && t.y < bot) jackboxDrawCat(st, t); }
    else if (t.kind === 'ribbon') { if (t.y1 > top && t.y0 < bot) jackboxDrawRibbon(st, t); }
  }
  ctx.restore();
  // the night shelf: darker, with a warm night light glow
  if (lk.dark) {
    const nl = st.c.deco.find(d => d[0] === 'nightlight');
    ctx.save();
    ctx.fillStyle = 'rgba(24,20,70,' + lk.dark + ')'; ctx.fillRect(0, 0, W, H);
    if (nl) {
      const L = st.c.ledges[nl[2]], x = nl[1], y = L.y - 30 - cam;
      const g = ctx.createRadialGradient(x, y, 10, x, y, 300);
      g.addColorStop(0, 'rgba(255,214,140,0.35)'); g.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }
  // the bookshelf's side posts (in front of everything at the edges)
  for (const x of [0, W - 22]) {
    ERICH.put('jbpost' + (x ? 'r' : 'l'), 22, H, 0, 0, c => {
      ERICH.board(c, 0, 0, 22, H, { col: '#b4743e', seed: x ? 7 : 3, vert: true, r: 0, lw: 1.2, nails: false, knots: 1 });
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(3, 0, 4, H);
      c.fillStyle = 'rgba(60,30,10,0.25)'; c.fillRect(18, 0, 4, H);
    }, x, 0);
    // screw heads where the shelves would be fixed, scrolling with the shelf
    const off = ((st.cam % 180) + 180) % 180;
    for (let y = -off + 40; y < H + 20; y += 180) ERICH.put('jbscrew', 8, 8, 4, 4, c => ERICH.rivets(c, [[0, 0]], 2, '#c8c0b0'), x + 11, y);
  }
}
function jackboxDrawCarpet(st) {
  const y = 0, cam = st.cam;
  // the wall below the bookshelf's bottom shelf: a skirting board
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, y - 26, W, 26);
  ctx.fillStyle = 'rgba(28,26,54,0.08)'; ctx.fillRect(0, y - 22, W, 3); ctx.fillRect(0, y - 14, W, 1.5);
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(0, y - 26, W, 1.5); ctx.fillRect(0, y - 19, W, 1);
  ctx.fillStyle = 'rgba(28,26,54,0.12)'; ctx.fillRect(0, y - 6, W, 6);
  // the rug: soft stripes
  const h = Math.max(0, cam + H - y + 20);
  ctx.fillStyle = '#7cc4e8'; ctx.fillRect(-10, y, W + 20, h);
  ctx.fillStyle = '#9ad4f0'; for (let k = 0; k < 6; k++) ctx.fillRect(-10, y + 14 + k * 26, W + 20, 9);
  ERICH.put('jbpile', W, 170, 0, 0, c => {
    for (let i = 0; i < 700; i++) { const v = ERICH.fr(i, 5); c.fillStyle = v < 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(30,70,110,0.1)'; c.fillRect(ERICH.fr(i, 6) * W, 2 + ERICH.fr(i, 7) * 166, 1.5 + v * 3, 1.3); }
    for (let k = 0; k < 6; k++) { c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, 14 + k * 26, W, 1); c.fillStyle = 'rgba(30,70,110,0.12)'; c.fillRect(0, 22 + k * 26, W, 1); }
  }, 0, y);
  for (let x = 10; x < W; x += 34) { ctx.fillStyle = '#c99a2a'; circle(x + 0.6, y + 5.6, 3); ctx.fill(); ctx.fillStyle = '#ffd36b'; circle(x, y + 5, 3); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(x - 0.8, y + 4.2, 0.9); ctx.fill(); }
  // the big toy box on the left, lid up, toys peeking out
  const tx = 40, tw = 170, th = 96;
  ctx.fillStyle = '#ff6b5e'; ctx.fillRect(tx + 6, y - th - 70, 14, 74); // (a toy rocket's fin, behind)
  ctx.save(); ctx.translate(tx, y - th); ctx.rotate(-0.5);
  ERICH.put('jblid', tw + 6, 22, 3, 19, c => { ERICH.board(c, 0, -16, tw, 16, { col: '#4f9fe0', edge: '#2a5a90', seed: 11, r: 5, lw: 2, nails: false, knots: 0 }); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(6, -15, tw - 12, 2); c.fillStyle = '#ffc43d'; c.fillRect(tw / 2 - 8, -16, 16, 16); c.strokeStyle = '#a07418'; c.lineWidth = 1; c.strokeRect(tw / 2 - 8, -16, 16, 16); }, 0, 0);
  ctx.restore();
  ctx.fillStyle = '#ffc43d'; circle(tx + 60, y - th - 6, 20); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(tx + 60, y - th - 6, 20); ctx.stroke();
  ctx.fillStyle = '#6fd88a'; rr(tx + 92, y - th - 30, 26, 34, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c8905a'; circle(tx + 140, y - th - 12, 16); ctx.fill(); ctx.stroke(); circle(tx + 130, y - th - 26, 6); ctx.fill(); ctx.stroke(); circle(tx + 150, y - th - 26, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; circle(tx + 135, y - th - 14, 1.8); ctx.fill(); circle(tx + 145, y - th - 14, 1.8); ctx.fill();
  ERICH.put('jbtoybox', tw + 12, th + 10, 4, th + 2, c => jackboxPaintToyBox(c, tw, th), tx, y);
  text('TOYS', tx + tw / 2, y - th / 2, 30, '#ff6b5e', 'center');
  // a toy block and a ball on the rug
  jackboxBlock(820, y + 2, 34, '#4fb5ff', 'A');
  jackboxBlock(858, y + 2, 34, '#ff5f6d', 'B');
  jackboxBlock(838, y - 32, 34, '#ffc43d', 'C');
  ctx.fillStyle = '#6fd88a'; circle(720, y - 18, 18); ctx.fill(); ctx.strokeStyle = '#2f8a4a'; ctx.lineWidth = 2; circle(720, y - 18, 18); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(720, y - 18, 18, -0.6, 0.6); ctx.lineTo(720, y - 18); ctx.fill();
}
function jackboxDrawCeiling(st, topY) {
  const y = topY - 230;
  ctx.fillStyle = '#ffe9c2'; ctx.fillRect(0, y - 900, W, 900);
  // a window with evening sky and a moon
  const wx = 640, wy = y - 250, ww = 220, wh = 180;
  const g = ctx.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, '#5a6ad8'); g.addColorStop(1, '#ffb27a');
  ctx.fillStyle = g; rr(wx, wy, ww, wh, 12); ctx.fill();
  ctx.fillStyle = '#fff6c8'; circle(wx + 160, wy + 50, 20); ctx.fill();
  ctx.fillStyle = '#5a6ad8'; circle(wx + 170, wy + 44, 17); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8; rr(wx, wy, ww, wh, 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
  ctx.fillStyle = '#b48cff'; ctx.fillRect(wx - 30, wy - 16, 34, wh + 40); ctx.fillRect(wx + ww - 4, wy - 16, 34, wh + 40);
  // bunting
  for (let i = 0; i < 14; i++) { const x = 40 + i * 64; ctx.fillStyle = JBOX_TOY[i % 6]; ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x + 40, y - 40); ctx.lineTo(x + 20, y - 8); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(30, y - 40); ctx.lineTo(W - 30, y - 40); ctx.stroke();
}
function jackboxBlock(x, y, s, col, letter) {
  ERICH.put('jbblk' + col + s, s + 8, s + 6, s / 2 + 2, s + 2, c => { ERICH.shadow(c, 2, 1, s / 2 + 2, 2.5, 0.16); ERICH.toyBlock(c, -s / 2, -s, s, s, col, { r: 5, lw: 2, seed: s }); }, x, y);
  text(letter, x + 0.8, y - s / 2 + 1.8, s * 0.55, shade(col, 0.35), 'center');
  text(letter, x, y - s / 2 + 1, s * 0.55, col, 'center');
}
function jackboxDrawShelf(st, l, i) {
  const target = st.state === 'play' && i === st.L.to && st.phase !== 'swap' && st.phase !== 'haul' && st.phase !== 'hook';
  const y = l.y, x0 = l.x0, w = l.x1 - l.x0, top = l.kind === 'top';
  // the plank's shadow on the back panel, the plank, its front edge
  ERICH.put('jbshelf' + Math.round(w) + (top ? 't' : ''), Math.round(w) + 12, 52, 2, 4, c => jackboxPaintShelf(c, Math.round(w), top, Math.round(x0) % 97), x0, y);
  if (target) {
    ctx.strokeStyle = 'rgba(255,211,74,' + (0.55 + 0.35 * Math.sin(G.clock * 5)) + ')'; ctx.lineWidth = 4;
    rr(x0 - 3, y - 3, w + 6, 24, 5); ctx.stroke();
  }
}
function jackboxDrawDeco(st, d, top, bot) {
  const k = d[0];
  if (k === 'wallshelf') return;
  const L = d[0] === 'books' ? st.c.ledges[d[3]] : st.c.ledges[d[2]];
  if (!L || L.y < top || L.y > bot + 100) return;
  const y = L.y;
  if (k === 'books') {
    let x = d[1], n = 0;
    while (x < d[2] - 10) {
      const h = hash(Math.round(x), n + 7), bw = 14 + (h % 12), bh = 50 + ((h >> 4) % 34), col = JBOX_TOY[(h >> 8) % 6];
      const lean = (h >> 12) % 9 === 0 && x + bw + 20 < d[2];
      ctx.save(); ctx.translate(x, y);
      if (lean) ctx.rotate(0.22);
      ctx.fillStyle = col; ctx.strokeStyle = 'rgba(28,26,54,0.55)'; ctx.lineWidth = 1.5;
      rr(0, -bh, bw, bh, 2); ctx.fill();
      // a rounded spine: shade on the right, a lit strip on the left, a title label
      ctx.fillStyle = 'rgba(20,10,40,0.2)'; ctx.fillRect(bw - 4, -bh + 1, 3, bh - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(1.5, -bh + 1, 2.5, bh - 2);
      if (bh > 60) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; rr(3, -bh * 0.62, bw - 6, 12, 2); ctx.fill(); ctx.fillStyle = 'rgba(28,26,54,0.35)'; ctx.fillRect(5, -bh * 0.62 + 5, bw - 10, 1.5); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(2, -bh + 8, bw - 4, 3); ctx.fillRect(2, -14, bw - 4, 3);
      ctx.restore();
      x += bw + (lean ? 14 : 1); n++;
    }
  } else if (k === 'blocks') {
    jackboxBlock(d[1], y, 30, '#ff9a4a', 'P'); jackboxBlock(d[1] + 32, y, 30, '#4fb5ff', 'B'); jackboxBlock(d[1] + 16, y - 30, 30, '#6fd88a', '+');
  } else if (k === 'teddy') {
    const x = d[1];
    ctx.fillStyle = '#c8905a'; ctx.strokeStyle = '#7a4e2a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y - 22, 20, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    circle(x - 15, y - 56, 8); ctx.fill(); ctx.stroke(); circle(x + 15, y - 56, 8); ctx.fill(); ctx.stroke();
    circle(x, y - 50, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f2d2a8'; ctx.beginPath(); ctx.ellipse(x, y - 45, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; circle(x - 6, y - 53, 2); ctx.fill(); circle(x + 6, y - 53, 2); ctx.fill(); circle(x, y - 47, 2.2); ctx.fill();
    ctx.fillStyle = '#ff5f6d'; ctx.beginPath(); ctx.moveTo(x - 9, y - 35); ctx.lineTo(x + 9, y - 35); ctx.lineTo(x, y - 30); ctx.closePath(); ctx.fill();
  } else if (k === 'plant') {
    const x = d[1];
    ERICH.put('jbplant', 44, 80, 22, 74, c => {
      ERICH.shadow(c, 2, 0, 16, 2.5, 0.2);
      for (let i = -2; i <= 2; i++) {
        const lx = i * 7, ly = -44 - (2 - Math.abs(i)) * 6;
        c.fillStyle = i % 2 ? '#4fae6a' : '#5cc27a'; c.beginPath(); c.ellipse(lx, ly, 6, 14, i * 0.35, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#3a8a52'; c.lineWidth = 1; c.stroke();
        c.strokeStyle = 'rgba(220,255,200,0.6)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(lx - Math.sin(i * 0.35) * 11, ly + Math.cos(i * 0.35) * 11); c.lineTo(lx + Math.sin(i * 0.35) * 10, ly - Math.cos(i * 0.35) * 10); c.stroke();
      }
      c.fillStyle = '#ff9a4a'; c.beginPath(); c.moveTo(-16, -30); c.lineTo(16, -30); c.lineTo(11, 0); c.lineTo(-11, 0); c.closePath(); c.fill();
      c.fillStyle = '#d87830'; c.beginPath(); c.moveTo(5, -30); c.lineTo(16, -30); c.lineTo(11, 0); c.lineTo(3, 0); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(-12, -24, 2.5, 20);
      c.strokeStyle = '#a8561e'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-16, -30); c.lineTo(16, -30); c.lineTo(11, 0); c.lineTo(-11, 0); c.closePath(); c.stroke();
      c.fillStyle = '#ffae66'; rrOn(c, -18, -34, 36, 7, 2); c.fill(); c.strokeStyle = '#a8561e'; c.stroke();
      c.fillStyle = '#6a4424'; c.fillRect(-14, -27.5, 28, 2);
    }, x, y);
  } else if (k === 'nightlight') {
    const x = d[1], gl = 0.6 + 0.2 * Math.sin(G.clock * 1.5);
    ctx.fillStyle = 'rgba(255,220,150,' + gl * 0.5 + ')'; circle(x, y - 34, 44); ctx.fill();
    ctx.fillStyle = '#fff3c4'; ctx.strokeStyle = '#d8a44a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y - 34, 24, Math.PI * 0.35, Math.PI * 1.65); ctx.arc(x + 12, y - 38, 18, Math.PI * 1.45, Math.PI * 0.55, true); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x - 8, y - 38, 2.5, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = '#d8a44a'; rr(x - 12, y - 8, 24, 8, 3); ctx.fill();
  } else if (k === 'trophy') {
    const x = d[1], bob = Math.sin(G.clock * 2) * 3, win = st.state === 'win';
    ctx.fillStyle = '#b4743e'; rr(x - 26, y - 20, 52, 20, 4); ctx.fill();
    ctx.fillStyle = '#ffd34a'; ctx.strokeStyle = '#a07418'; ctx.lineWidth = 2;
    ctx.fillRect(x - 6, y - 44, 12, 26);
    ctx.save(); ctx.translate(x, y - 76 + bob); ctx.rotate(win ? G.clock * 3 : Math.sin(G.clock) * 0.1);
    ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 15 : 34; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink; circle(-8, -2, 2.5); ctx.fill(); circle(8, -2, 2.5); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 3, 6, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();
    if (Math.sin(G.clock * 3) > 0.6) { ctx.fillStyle = '#ffffff'; jackboxStarPath(x + 30, y - 100, 6, 2, 0); ctx.fill(); }
  }
}
function jackboxDrawWallShelf(x0, x1, y) {
  const w = Math.round(x1 - x0);
  ERICH.put('jbwshelf' + w, w + 12, 40, 2, 4, c => {
    c.fillStyle = 'rgba(60,30,10,0.18)'; c.fillRect(6, 14, w - 4, 8);
    for (const bx of [Math.min(16, w * 0.2), w - Math.min(22, w * 0.25)]) { c.fillStyle = '#c8789a'; c.beginPath(); c.moveTo(bx, 14); c.lineTo(bx + 6, 14); c.lineTo(bx + 6, 30); c.closePath(); c.fill(); c.strokeStyle = '#a8607e'; c.lineWidth = 1; c.stroke(); }
    ERICH.board(c, 0, 0, w, 14, { col: '#e8a0c0', edge: '#a8607e', seed: w, r: 3, lw: 2, nails: false, knots: 0 });
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(3, 1, w - 6, 2);
    for (let px = 12; px < w - 8; px += 26) { c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.arc(px, 8, 1.6, 0, Math.PI * 2); c.fill(); }
  }, x0, y);
}
function jackboxDrawHook(st) {
  const L = st.L, T = jackboxTarget(st), x = st.hookX, y = T.y, t = G.clock;
  // a little toy crane: a post with an arm out over the edge and the yo-yo on top
  ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  rr(x - 4, y - 46, 8, 46, 3); ctx.fill(); ctx.stroke();
  const ax = L.hang;
  ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y - 44); ctx.lineTo(ax, y - 44); ctx.stroke();
  ctx.fillStyle = '#ff5f6d'; circle(ax, y - 34, 9); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; circle(ax, y - 34, 9); ctx.stroke();
  ctx.fillStyle = '#ffffff'; circle(ax, y - 34, 3); ctx.fill();
  if (st.phase === 'yoyo') {
    const a = 0.5 + 0.4 * Math.sin(t * 6);
    ctx.strokeStyle = 'rgba(255,211,74,' + a + ')'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.ellipse(x, y - 2, 30, 8, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
}
function jackboxStarPath(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
function jackboxDrawStar(x, y, r, a) {
  ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(255,240,170,0.35)'; circle(x, y, r * 1.5); ctx.fill();
  ctx.fillStyle = C.gold; ctx.strokeStyle = '#a07418'; ctx.lineWidth = 2;
  jackboxStarPath(x, y, r, r * 0.45, Math.sin(G.clock * 1.5 + x) * 0.15); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(x - r * 0.25, y - r * 0.3, r * 0.18); ctx.fill();
  ctx.globalAlpha = a ? ctx.globalAlpha / a : 1;
}
function jackboxDrawTrack(t) {
  const y = t.y, x0 = t.x0 - 40, x1 = t.x1 + 40;
  ctx.fillStyle = '#ff9a4a'; rr(x0, y, x1 - x0, 8, 4); ctx.fill();
  ctx.fillStyle = '#ffd36b'; for (let x = x0 + 8; x < x1 - 8; x += 24) ctx.fillRect(x, y + 3, 12, 2);
  ctx.strokeStyle = '#a8562a'; ctx.lineWidth = 1.5; rr(x0, y, x1 - x0, 8, 4); ctx.stroke();
  // little posts hold the track to the back panel
  ctx.fillStyle = '#c0703a'; for (const x of [x0 + 20, (x0 + x1) / 2, x1 - 24]) ctx.fillRect(x, y + 8, 4, 16);
}
function jackboxDrawCar(t) {
  const x = t.x, y = t.y, f = t.dir;
  ctx.save(); ctx.translate(x, y - 3); ctx.scale(f, 1);
  if (t.beep > 0) { text('BEEP!', 0, -42 - t.beep * 10, 14, '#ffffff', 'center'); }
  ctx.fillStyle = '#ff5f6d'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-24, -6); ctx.lineTo(-24, -14); ctx.quadraticCurveTo(-14, -16, -10, -26); ctx.lineTo(8, -26); ctx.quadraticCurveTo(14, -16, 24, -14); ctx.lineTo(24, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#bfeaff'; rr(-7, -23, 13, 9, 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; text('7', -16, -12, 9, '#ffffff', 'center');
  ctx.fillStyle = '#ffe36b'; circle(22, -10, 3); ctx.fill();
  for (const wx of [-14, 14]) { ctx.fillStyle = '#3a3550'; circle(wx, -4, 6); ctx.fill(); ctx.fillStyle = '#d9dbe8'; circle(wx, -4, 2.5); ctx.fill(); }
  // speed lines
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-30 - i * 4, -18 + i * 5); ctx.lineTo(-42 - i * 6 - Math.sin(G.clock * 20 + i) * 3, -18 + i * 5); ctx.stroke(); }
  ctx.restore();
}
function jackboxDrawFan(st, t, live) {
  const x = t.x, y = t.y, f = t.dir;
  // the breeze: swirls across the band while it blows (only on its own launch)
  if (live && t.on) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const u = ((G.clock * 0.9 + i * 0.37) % 1), bx = f > 0 ? t.x0 + (t.x1 - t.x0) * u : t.x1 - (t.x1 - t.x0) * u, by = t.y0 + (t.y1 - t.y0) * ((i * 0.41) % 1);
      ctx.globalAlpha = Math.sin(u * Math.PI) * 0.8;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + f * 24, by - 10, bx + f * 46, by); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx + f * 52, by - 4, 5, 0, Math.PI * 1.4); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (live && t.warn) {
    text('...', x + f * 30, y - 70, 18, '#ffffff', 'center');
  }
  // the fan: a stand, a round cage, spinning blades, a happy face on the hub
  ctx.fillStyle = '#7fc8ff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  rr(x - 22, y - 8, 44, 8, 4); ctx.fill(); ctx.stroke();
  ctx.fillRect(x - 4, y - 40, 8, 34);
  const cy = y - 58;
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; circle(x, cy, 30); ctx.fill();
  ctx.save(); ctx.translate(x, cy); ctx.scale(0.45, 1);
  for (let i = 0; i < 3; i++) {
    const a = t.spin + i * Math.PI * 2 / 3;
    ctx.fillStyle = ['#ff9aa8', '#ffe36b', '#9ef0b0'][i];
    ctx.beginPath(); ctx.ellipse(Math.cos(a) * 15, Math.sin(a) * 15, 14, 8, a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#3a6a9a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, cy, 14, 30, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffffff'; circle(x, cy, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; circle(x - 2 + f, cy - 1, 1.2); ctx.fill(); circle(x + 2 + f, cy - 1, 1.2); ctx.fill();
}
function jackboxDrawMobile(t) {
  const x = t.x, y = t.y;
  ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y - 200); ctx.lineTo(x, y); ctx.stroke();
  ctx.fillStyle = '#c98a52'; circle(x, y, 5); ctx.fill();
  // the arm swings: a moon in the middle, a star at each end
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(t.bx, t.by); ctx.stroke();
  const ax = Math.cos(t.a) * 40, ay = -Math.sin(t.a) * 40;
  ctx.beginPath(); ctx.moveTo(t.bx - ax, t.by - ay - 18); ctx.lineTo(t.bx + ax, t.by + ay - 18); ctx.stroke();
  for (const s of [-1, 1]) {
    const sx = t.bx + s * ax, sy = t.by + s * ay - 18;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + 22); ctx.stroke();
    ctx.fillStyle = s < 0 ? '#ffe36b' : '#9ad4ff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
    jackboxStarPath(sx, sy + 30, 11, 5, t.a); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 2;
  }
  // the moon (this is what bumps you)
  ctx.fillStyle = '#fff3c4'; ctx.strokeStyle = '#c8a44a'; ctx.lineWidth = 2;
  circle(t.bx, t.by, JBOX.mobR); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffe28a'; circle(t.bx + 9, t.by - 6, JBOX.mobR * 0.8); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(t.bx - 8, t.by - 2, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.beginPath(); ctx.arc(t.bx + 2, t.by - 2, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.beginPath(); ctx.arc(t.bx - 3, t.by + 7, 4, 0.2, Math.PI - 0.2); ctx.stroke();
}
function jackboxDrawCat(st, t) {
  const x = t.x, y = t.y, f = t.dir;
  // the tail (it swishes down over the shelf edge)
  if (t.pts.length) {
    ctx.strokeStyle = '#7a6a8a'; ctx.lineWidth = 15; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); for (const q of t.pts) ctx.lineTo(q.x, q.y); ctx.stroke();
    ctx.strokeStyle = '#a898b8'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(x, y); for (const q of t.pts) ctx.lineTo(q.x, q.y); ctx.stroke();
    const e = t.pts[t.pts.length - 1]; ctx.fillStyle = '#ffffff'; circle(e.x, e.y, 7); ctx.fill();
  }
  // the sleepy cat curled on its shelf
  const cx = x - f * 40, cy = y - 22;
  ctx.fillStyle = '#a898b8'; ctx.strokeStyle = '#5a4a6a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(cx, cy, 46, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const hx = cx - f * 38, hy = cy - 6;
  circle(hx, hy, 18); ctx.fill(); ctx.stroke();
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + s * 14, hy - 8); ctx.lineTo(hx + s * 9, hy - 26); ctx.lineTo(hx + s * 2, hy - 14); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = '#ffb0c8'; circle(hx - f * 2, hy + 4, 2.5); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(hx - 7, hy - 2, 3.5, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.beginPath(); ctx.arc(hx + 7, hy - 2, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();
  const zt = (G.clock * 0.6) % 1;
  ctx.globalAlpha = 1 - zt; text('z', hx - f * 10 - f * zt * 16, hy - 30 - zt * 26, 15 + zt * 8, '#ffffff', 'center'); ctx.globalAlpha = 1;
}
function jackboxDrawRibbon(st, t) {
  const n = 10, wig = t.wig > 0 ? t.wig : 0;
  ctx.strokeStyle = '#ff7ac0'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= n; i++) { const u = i / n, y = t.y0 + (t.y1 - t.y0) * u, x = t.x + Math.sin(G.clock * 2 + u * 5) * 4 * u + Math.sin(u * 9 + G.clock * 20) * wig * 10 * u; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.stroke();
  ctx.fillStyle = '#ff7ac0'; ctx.beginPath(); ctx.moveTo(t.x, t.y0); ctx.lineTo(t.x - 14, t.y0 - 10); ctx.lineTo(t.x - 14, t.y0 + 10); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(t.x, t.y0); ctx.lineTo(t.x + 14, t.y0 - 10); ctx.lineTo(t.x + 14, t.y0 + 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(t.x, t.y0, 4); ctx.fill();
  const ey = t.y1 + Math.sin(G.clock * 2) * 2;
  ctx.fillStyle = '#ffd6f2'; circle(t.x + Math.sin(G.clock * 2 + 5) * 4, ey, 6); ctx.fill();
}

function jackboxDrawFront(st) {
  const cam = st.cam;
  ctx.save(); ctx.translate(0, -cam);
  // the aim arc (the cranker sees where the pop goes)
  if (st.state === 'play' && st.phase === 'crank' && !st.pop && G.introT <= 0) {
    const r = jackboxPredict(st, st.box.tilt, Math.max(st.plan.pow, jackboxPower(st, true) + JBOX.pK * (st.c.tune.length - st.note) / st.c.tune.length * 0.62));
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    r.pts.slice(0, 18).forEach((q, i) => { if (i % 2) return; ctx.globalAlpha = 0.85 - i * 0.04; circle(q.x, q.y, 3.4); ctx.fill(); });
    ctx.globalAlpha = 1;
  }
  // the yo-yo string from the hook down to the box
  if (st.state === 'play' && (st.phase === 'hook' || st.phase === 'haul' || st.phase === 'swap')) jackboxDrawString(st);
  // the box with whoever is inside, the cranker, the jumper
  const jb = st.j.inBox && st.phase !== 'swap', crIn = st.cr.inBox;
  jackboxDrawBox(st, jb ? st.jumper : crIn ? st.cranker : -1);
  if (!crIn) jackboxDrawPerson(st, st.cranker, st.cr.x, st.cr.y, { face: st.cr.face, crank: st.phase === 'crank' && st.state === 'play' });
  if (!st.j.inBox || st.phase === 'swap') {
    const j = st.j, fly = st.phase === 'fly' || st.phase === 'boing';
    if (st.phase === 'boing' && st.boing && st.boing.t < 0.7) jackboxDrawPillow(st.boing.x, st.boing.pillowY + 4, st.boing.t);
    jackboxDrawPerson(st, st.jumper, j.x, j.y, { face: j.face, fly, spin: j.spin, sq: j.sq || 0, walk: st.phase === 'yoyo' || st.phase === 'swap' ? j.walk : 0, haul: st.phase === 'haul' || st.phase === 'hook' });
  }
  for (const q of st.parts) {
    const a = clamp(q.life / q.max, 0, 1);
    if (q.y < cam - 30 || q.y > cam + H + 30) continue;
    ctx.globalAlpha = a; ctx.fillStyle = q.col;
    if (q.kind === 'spark') { jackboxStarPath(q.x, q.y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
    else if (q.kind === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
    else if (q.kind === 'note') {
      ctx.strokeStyle = q.col; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(q.x, q.y, 5, 4, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(q.x + 4, q.y - 1); ctx.lineTo(q.x + 4, q.y - 16); ctx.lineTo(q.x + 10, q.y - 12); ctx.stroke();
    } else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // the target shelf is above the screen while cranking: an arrow at the top
  if (st.state === 'play' && st.phase === 'crank') {
    const T = jackboxTarget(st), sy = T.y - cam;
    if (sy < 30) {
      const x = clamp((T.x0 + T.x1) / 2, 60, W - 60), y = 100 + Math.abs(Math.sin(G.clock * 4)) * 6;
      ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x - 13, y); ctx.lineTo(x - 5, y); ctx.lineTo(x - 5, y + 12); ctx.lineTo(x + 5, y + 12); ctx.lineTo(x + 5, y); ctx.lineTo(x + 13, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  const big = hudBig();
  for (const q of st.pops) {
    const x = clamp(q.x, 130, W - 130), y = clamp(q.y - cam - q.t * 30, 96, H - 140);
    ctx.globalAlpha = clamp((1.4 - q.t) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.25 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
    ctx.globalAlpha = 1;
  }
}
function jackboxDrawString(st) {
  const L = st.L, T = jackboxTarget(st), x = L.hang, y0 = T.y - 34, b = st.box;
  // (it drops, then swings over to the box)
  const u = st.phase === 'hook' ? jackboxSmooth(clamp(st.yoyo.t / JBOX.yoyoT, 0, 1)) : 1;
  const y1 = jackboxLerp(y0, b.y - JBOX.boxH - 8, u), bx = jackboxLerp(x, b.x + (st.side || 1) * 12, u * u) + (st.phase === 'hook' && u >= 1 ? Math.sin(G.clock * 3) * 3 : 0);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(bx, y1); ctx.stroke();
  // the yo-yo at the end (in hook: a gold hook glints by the box)
  ctx.fillStyle = '#ff5f6d'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
  circle(bx, y1, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; circle(bx, y1, 2.6); ctx.fill();
  if (st.phase === 'hook' && st.yoyo.t > JBOX.yoyoT) {
    const a = 0.5 + 0.4 * Math.sin(G.clock * 8);
    ctx.strokeStyle = 'rgba(255,211,74,' + a + ')'; ctx.lineWidth = 3; circle(bx, y1, 14); ctx.stroke();
  }
}
function jackboxDrawPillow(x, y, t) {
  const u = clamp(t / 0.15, 0, 1), sq = t < 0.35 ? Math.sin(t / 0.35 * Math.PI) * 0.25 : 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(u * (1 + sq), u * (1 - sq)); ctx.globalAlpha = clamp((0.7 - t) / 0.2, 0, 1);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#c86a9a'; ctx.lineWidth = 2.5;
  rr(-46, -16, 92, 30, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffb0d4'; ctx.fillRect(-46, -4, 92, 7);
  ctx.fillStyle = C.ink; circle(-10, -5, 2); ctx.fill(); circle(10, -5, 2); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -3, 4, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore(); ctx.globalAlpha = 1;
}
// the jack-in-the-box: a toy-block box with a crank on its side, a lid on a hinge and a spring inside
function jackboxDrawBox(st, inside) {
  const D = JBOX, b = st.box, side = st.side || 1;
  const shake = b.shake > 0 ? Math.sin(G.clock * 70) * b.shake * 8 : 0;
  const near = st.phase === 'crank' && !st.pop ? st.note / st.c.tune.length : 0;
  const rattle = near > 0.7 ? Math.sin(G.clock * 40) * (near - 0.7) * 6 : 0;
  ctx.save(); ctx.translate(b.x + shake * 0.3, b.y); ctx.rotate(b.tilt * D.tiltStep + shake * 0.01);
  const w = D.boxW, h = D.boxH;
  // the spring and whoever rides it (behind the box front)
  const ext = b.spring * 70;
  if (inside >= 0) {
    if (ext > 2 || b.lid > 0.3) {
      ctx.strokeStyle = b.gold ? C.gold : '#c9ced8'; ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) ctx.lineTo((i % 2 ? -10 : 10), -h + 8 - (ext + 6) * i / 8);
      ctx.stroke();
    }
    // the person peeking: hidden under the lid while cranking, popping out on the last note
    // (feet at -h + PH: the head just under the rim; peek lifts it out)
    const p = G.players[inside], peek = st.phase === 'crank' ? (st.pop ? 1.1 : (6 + near * 13) / PH) : st.phase === 'haul' || st.phase === 'hook' || st.phase === 'swap' ? 0.7 : 0;
    if (peek > 0 || ext > 2) {
      const sq = st.cr.inBox ? 0 : st.j.sq || 0;
      jackboxDrawBody(p, 0, -h + PH - ext - peek * PH + sq * 5, { s: 1, sq: sq * 0.25, face: st.side < 0 ? 1 : -1 });
    }
  }
  // the box
  const cols = ['#ff5f6d', '#ffc43d', '#4fb5ff'];
  ctx.fillStyle = cols[st.k % 3]; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  rr(-w / 2, -h, w, h, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; rr(-w / 2 + 7, -h + 8, w - 14, h - 16, 5); ctx.fill();
  ctx.fillStyle = cols[(st.k + 1) % 3]; jackboxStarPath(0, -h / 2, 13, 6, 0); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke();
  if (b.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 3; rr(-w / 2 - 3, -h - 3, w + 6, h + 6, 8); ctx.stroke(); }
  // the lid (hinged at the back edge, away from the crank)
  const open = st.phase === 'crank' && !st.pop ? 0.05 + near * 0.16 + rattle * 0.02 : b.lid;
  ctx.save(); ctx.translate(-side * w / 2, -h); ctx.rotate(side * -open * 2.0);
  ctx.fillStyle = cols[(st.k + 2) % 3]; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  rr(side > 0 ? 0 : -w - 4, -8, w + 4, 9, 3); ctx.fill(); ctx.stroke();
  ctx.restore();
  // the crank on the side: an axle, an arm and a knob
  const cx = side * (w / 2 + 3), cy = -h / 2;
  ctx.fillStyle = '#d9dbe8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  circle(cx, cy, 5); ctx.fill(); ctx.stroke();
  const a = b.crankA, kx = cx + side * 6 + Math.cos(a) * 12, ky = cy + Math.sin(a) * 12;
  ctx.strokeStyle = '#8e939e'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + side * 3, cy); ctx.lineTo(kx, ky); ctx.stroke();
  ctx.fillStyle = '#ff5f6d'; circle(kx, ky, 5); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; circle(kx, ky, 5); ctx.stroke();
  // the hook ring on top (for the yo-yo)
  if (st.phase === 'hook' || st.phase === 'haul' || st.phase === 'swap') { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -h - 9, 6, Math.PI, 0); ctx.stroke(); }
  ctx.restore();
}
// Pip or Bo drawn by the engine's player drawing at (x, y feet), restoring the engine player afterwards
function jackboxDrawBody(p, x, y, o) {
  const save = { x: p.x, y: p.y, face: p.face, sx: p.sx, sy: p.sy, vy: p.vy, stun: p.stun, alive: p.alive, blink: p.blink };
  ctx.save(); ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  if (o.s && o.s !== 1) ctx.scale(o.s, o.s);
  p.x = -PW / 2; p.y = -PH; p.alive = true; p.vy = o.vy || 0; p.face = o.face || 1; p.sx = 1 + (o.sq || 0); p.sy = 1 - (o.sq || 0); p.stun = o.dizzy ? 0.5 : 0; p.blink = 0;
  drawPlayer(p);
  ctx.restore();
  Object.assign(p, save);
}
function jackboxDrawPerson(st, id, x, y, o) {
  const p = G.players[id], t = G.clock, D = JBOX;
  const win = st.state === 'win';
  const hop = win ? -Math.abs(Math.sin(t * 8 + id)) * 14 : o.walk ? -Math.abs(Math.sin(o.walk)) * 3 : 0;
  const rot = o.fly ? (o.spin || 0) * Math.PI * 2 + clamp(st.j.vx / 900, -0.25, 0.25) : 0;
  const sq = o.sq ? o.sq * 0.18 : o.haul ? (st.j.heave || 0) * 0.12 : 0;
  jackboxDrawBody(p, x, y + hop, { face: o.face, rot, sq, vy: o.fly ? st.j.vy * 0.3 : 0 });
  // arms
  const shY = y + hop - PH * 0.45;
  const arm = (hx, hy, shX) => {
    for (const [col, lw] of [[PDARK[id], 5.5], [PCOL[id], 3.2]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(shX, shY); ctx.lineTo(hx, hy); ctx.stroke(); }
    ctx.fillStyle = PCOL[id]; circle(hx, hy, 3.2); ctx.fill();
  };
  if (win) { arm(x - 16, shY - 20, x - 8); arm(x + 16, shY - 20, x + 8); return; }
  if (o.crank) {
    // a hand on the crank knob (box coordinates turned into the world)
    const b = st.box, side = st.side, a = b.crankA, ang = b.tilt * D.tiltStep;
    const lx = side * (D.boxW / 2 + 3) + side * 6 + Math.cos(a) * 12, ly = -D.boxH / 2 + Math.sin(a) * 12;
    const wx = b.x + lx * Math.cos(ang) - ly * Math.sin(ang), wy = b.y + lx * Math.sin(ang) + ly * Math.cos(ang);
    arm(wx, wy, x - side * 6); arm(wx + side * 2, wy + 2, x - side * 2);
  } else if (o.haul) {
    const L = st.L, T = jackboxTarget(st), sgn = L.hang > st.hookX ? 1 : -1, hx = st.hookX + sgn * 10, hy = T.y - 40 + (st.j.heave || 0) * 8;
    arm(hx, hy, x + sgn * 6); arm(hx - sgn * 3, hy + 5, x);
  } else if (o.fly) {
    const up = st.j.vy < 0;
    arm(x - 14, shY + (up ? -18 : -6), x - 8); arm(x + 14, shY + (up ? -18 : -6), x + 8);
  }
}

/* ---------- the HUD: clock and stars, the climb gauge, the tune bar, the job panels, prompts ---------- */
function jackboxHud(st) {
  const D = JBOX, big = hudBig(), z = big ? 1.3 : 1, ps = G.players, play = G.mode === 'play' || G.mode === 'paused', t = G.clock;
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(st.stats.finishT || G.time), n = st.stats.stars + ' / ' + st.allStars;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.2, gap = fs;
    const w = tw + gap + icon + fs * 0.4 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, st.waiting ? '#b8b2d6' : C.paper, 'left', 'body');
    ctx.fillStyle = C.gold; jackboxStarPath(x0 + 15 + tw + gap + icon / 2, cy, fs * 0.6, fs * 0.26, 0); ctx.fill();
    text(n, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, '#ffe7a8', 'left', 'body');
    timeX0 = x0;
  }
  if (!play) return;
  const pl = st.plan || jackboxPlan(st);
  // the climb gauge (right edge): the bookshelf, the shelves reached, the box
  {
    const x = W - 22, y0 = (big ? 70 : 56) + 18, y1 = H - (big ? 70 : 56) * z - 40;
    ctx.fillStyle = 'rgba(28,26,54,0.6)'; rr(x - 9, y0 - 14, 18, y1 - y0 + 28, 9); ctx.fill();
    const n = G.level.def.roomCount * 2, done = st.gi + (st.phase === 'swap' || st.state === 'win' ? 1 : 0);
    for (let i = 0; i <= n; i++) {
      const yy = y1 - (y1 - y0) * i / n;
      ctx.fillStyle = i <= done ? C.gold : 'rgba(255,255,255,0.3)'; rr(x - 7, yy - 2, 14, 4, 2); ctx.fill();
    }
    const yy = y1 - (y1 - y0) * done / n;
    ctx.fillStyle = PCOL[st.jumper]; circle(x, yy - 9, 5.5); ctx.fill();
    ctx.fillStyle = C.gold; jackboxStarPath(x, y0 - 22, 8, 3.5, 0); ctx.fill();
  }
  // the tune bar, bottom centre: notes, the beat ball and the power bar
  const ride = st.state === 'play' && G.introT <= 0;
  {
    const pw = Math.round(250 * z), ph = Math.round(66 * z), px = W / 2 - pw / 2, py = H - ph - 10, N = st.c.tune.length;
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = st.goldSpring ? C.gold : '#ffd0f0'; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const gx = px + 14 * z, gw = pw - 28 * z;
    const cranking = st.phase === 'crank' && st.state === 'play';
    const head = st.waiting ? 'Taking a break...' : !cranking ? ({ fly: 'POP! Steer to the shelf!', boing: 'Boing! Try again', yoyo: 'Yo-yo to the box', hook: 'Hook the box', haul: 'Haul it up!', swap: 'Swap jobs!' }[st.phase] || '') : st.pop ? 'POP!' : 'CRANK ON THE BEAT';
    text(head, gx, py + 12 * z, 11 * z, cranking ? '#ffd0f0' : C.gold, 'left', 'body');
    if (st.gradeFx && cranking) {
      const g = st.gradeFx.g, a = clamp((0.7 - st.gradeFx.t) / 0.25, 0, 1), sc = 1 + 0.3 * Math.max(0, 1 - st.gradeFx.t / 0.12);
      ctx.globalAlpha = a;
      ctx.save(); ctx.translate(gx + gw, py + 12 * z); ctx.scale(sc, sc);
      text(['Off-beat', 'Good!', 'Perfect!'][g], 0, 0, (g === 2 ? 13 : 11.5) * z, ['#d9d3ef', '#9ef0b0', C.gold][g], 'right', 'body');
      ctx.restore(); ctx.globalAlpha = 1;
    } else text(st.goldSpring ? 'Gold spring!' : NAMES[st.cranker] + ' cranks', gx + gw, py + 12 * z, 11 * z, st.goldSpring ? C.gold : PCOL[st.cranker], 'right', 'body');
    // notes
    const ny = py + 31 * z, step = gw / N;
    for (let i = 0; i < N; i++) {
      const nx = gx + step * (i + 0.5), played = i < st.note, g = st.grades[i];
      const col = played ? [ 'rgba(220,214,240,0.75)', '#9ef0b0', C.gold][g] : i === st.note && cranking ? '#ffffff' : 'rgba(255,255,255,0.22)';
      const lift = played ? 0 : (st.c.tune[i] % 12) * 0.25 * z;
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(nx - 1, ny + 3 - lift, 5 * z, 4 * z, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.8 * z; ctx.beginPath(); ctx.moveTo(nx + 3.5 * z, ny + 2 - lift); ctx.lineTo(nx + 3.5 * z, ny - 9 * z - lift); ctx.stroke();
    }
    // the beat ball hops onto the next note and lands on the beat
    if (cranking && !st.pop && st.note < N) {
      const bt = (G.time - st.beat0) / D.beatT, u = bt - Math.floor(bt);
      const nx = gx + step * (st.note + 0.5), hy = Math.sin(u * Math.PI) * 14 * z;
      const pre = bt < 0;
      ctx.fillStyle = pre ? 'rgba(255,255,255,0.4)' : u < 0.2 || u > 0.8 ? C.gold : '#ff9ad0';
      circle(nx, ny - 14 * z - (pre ? 0 : hy), 4.5 * z); ctx.fill();
    }
    // the power bar with the shelf mark
    const by = py + ph - 14 * z, bh = 8 * z, maxP = 1.1;
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(gx, by - bh / 2, gw, bh, bh / 2); ctx.fill();
    const pow = cranking ? jackboxPower(st, true) : st.lastPower || 0;
    const frac = clamp(pow / maxP, 0, 1);
    ctx.fillStyle = st.goldSpring ? C.gold : pow >= pl.need ? '#6fe3a0' : '#ff9ad0';
    rr(gx, by - bh / 2, Math.max(bh, gw * frac), bh, bh / 2); ctx.fill();
    const mx = gx + gw * clamp(pl.need / maxP, 0, 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(mx - 1.5, by - bh, 3, bh * 2);
    ctx.fillStyle = '#c98a52'; rr(mx - 7, by - bh - 4, 14, 4, 1); ctx.fill();
  }
  // the job panels: Pip's bottom left, Bo's bottom right
  const panels = [];
  for (const id of [0, 1]) {
    const pw = Math.round(206 * z), ph = Math.round(56 * z), py = H - ph - 10, px = id === 0 ? 12 : W - 12 - pw;
    panels[id] = { px, py, pw, ph };
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const quiet = jackboxQuiet(id), jumper = id === st.jumper, ph2 = st.phase;
    text(NAMES[id] + (jumper ? ' · jumper' : ' · cranker') + (quiet ? ' (computer)' : ''), px + 12 * z, py + 15 * z, 14 * z, PCOL[id], 'left');
    const chips = jumper
      ? ph2 === 'yoyo' || ph2 === 'hook' || ph2 === 'haul'
        ? [['lr', 'WALK', ride && ph2 === 'yoyo' && pl.walk !== 0, false], ['act', ph2 === 'yoyo' ? 'YO-YO' : 'HAUL', ride && ((ph2 === 'yoyo' && pl.atHook) || ph2 === 'haul'), (st.j.heave || 0) > 0.4]]
        : [['lr', 'STEER', ride && ph2 === 'fly' && pl.steer !== 0, false], ['up', 'HOP', ride && pl.hop, st.j.hop && ph2 === 'fly'], ['down', 'SQUISH', ride && ph2 === 'crank' && st.note > 0 && (st.j.sq || 0) < 0.5, (st.j.sq || 0) > 0.5]]
      : [['act', ph2 === 'hook' || ph2 === 'yoyo' ? 'HOOK' : 'CRANK', ride && (ph2 === 'crank' && !st.pop || ph2 === 'hook' && st.yoyo && st.yoyo.t > D.yoyoT), (st.box.shake || 0) > 0.1], ['lr', 'AIM', ride && ph2 === 'crank' && pl.tilt !== st.box.tilt, false]];
    const n = chips.length, cw = (pw - 24 * z - (n - 1) * 6 * z) / n;
    chips.forEach(([k, lab, lit, held], i) => {
      const cx = px + 12 * z + i * (cw + 6 * z), cy = py + 26 * z, chh = 24 * z;
      ctx.fillStyle = lit && !quiet ? (Math.sin(t * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : held ? 'rgba(255,138,61,0.85)' : 'rgba(255,255,255,0.12)';
      rr(cx, cy, cw, chh, chh / 2); ctx.fill();
      const kk = quiet ? '' : jackboxKey(id, k);
      let fs = 12 * z;
      const str = (kk ? kk + ' ' : '') + lab;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      while (fs > 8 && ctx.measureText(str).width > cw - 8) { fs -= 0.5; ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; }
      text(str, cx + cw / 2, cy + chh / 2 + 0.5, fs, lit && !quiet ? C.ink : '#ffffff', 'center', 'body');
    });
  }
  // the message line (gold help, swaps): between the level pills and the clock when it fits, else under them
  const msg = st.waiting ? { text: 'Taking a break... press anything to play on', col: '#ffffff', t: 1, life: 2 } : st.msg;
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
      while (w > W - 60 && fs > 11) { fs--; ctx.font = font(fs); w = ctx.measureText(msg.text).width + 30; }
    }
    ctx.globalAlpha = clamp((msg.life - msg.t) / 0.3, 0, 1);
    pill(cx, y, w, h, 'center'); text(msg.text, cx, y + h / 2 + 0.5, fs, msg.col, 'center', 'body'); ctx.globalAlpha = 1;
  }
  if (!ride || st.waiting) return;
  // prompts: over each player's job panel (the jumper's beside them in the air). A hint bubble replaces a prompt.
  const fs = 14 * z;
  const spot = (id, w, h) => {
    if (id === st.jumper && (st.phase === 'fly' || st.phase === 'yoyo')) {
      const sx = st.j.x, sy = st.j.y - st.cam;
      let x = sx < W / 2 ? sx + 40 : sx - 40 - w;
      const y = clamp(sy - 50 - h, big ? 100 : 84, H - Math.round(66 * z) - 30 - h);
      x = clamp(x, 26, W - w - 40);
      return { x, y };
    }
    const P = panels[id];
    return { x: clamp(id === 0 ? P.px : P.px + P.pw - w, 6, W - w - 6), y: P.py - h - 8 };
  };
  const say = (id, str, col, pulse) => {
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, o = spot(id, w, h);
    const s = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(o.x + w / 2, o.y + h / 2); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, col, 'center', 'body');
    ctx.restore();
  };
  const bubble = (id, str) => {
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 22 * z, h = fs + 14 * z, o = spot(id, w, h);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5;
    rr(o.x, o.y, w, h, h / 2); ctx.fill(); ctx.stroke();
    text(str, o.x + w / 2, o.y + h / 2 + 0.5, fs, C.ink, 'center', 'body');
  };
  for (const p of ps) {
    const id = p.id;
    if (jackboxQuiet(id)) continue;
    if (st.hints[id]) { bubble(id, st.hints[id].text); continue; }
    const ph = st.phase;
    if (id === st.cranker) {
      if (ph === 'crank' && !st.pop) {
        if (st.note === 0) say(id, 'Crank on the beat: tap ' + jackboxKey(id, 'act'), C.gold, true);
        else if (pl.tilt !== st.box.tilt && st.note >= 2) say(id, 'Aim the box: ' + jackboxKey(id, pl.tilt < st.box.tilt ? 'left' : 'right'), '#ffe7a8', false);
      } else if (ph === 'hook' && st.yoyo && st.yoyo.t > D.yoyoT) say(id, 'Hook the box: press ' + jackboxKey(id, 'act'), C.gold, true);
    } else {
      if (ph === 'crank' && st.note > 0 && !st.pop && (st.j.sq || 0) < 0.5) say(id, 'Hold ' + jackboxKey(id, 'down') + ' to squish the spring', '#ffd0f0', false);
      else if (ph === 'fly' && pl.hop) say(id, 'Hop now! ' + jackboxKey(id, 'up'), C.gold, true);
      else if (ph === 'fly' && pl.steer && Math.abs(pl.aimX - st.j.x) > 60) say(id, pl.steer < 0 ? '◀ Steer to the shelf' : 'Steer to the shelf ▶', '#ffe7a8', false);
      else if (ph === 'yoyo') say(id, pl.atHook ? 'Drop the yo-yo: press ' + jackboxKey(id, 'act') : (pl.walk < 0 ? '◀ ' : '') + 'Walk to the gold hook' + (pl.walk > 0 ? ' ▶' : ''), C.gold, pl.atHook);
      else if (ph === 'haul') say(id, 'Haul! Tap ' + jackboxKey(id, 'act') + ' ' + jackboxKey(id, 'act') + ' ' + jackboxKey(id, 'act'), C.gold, true);
    }
  }
}

/* ---------- sounds: a little music box ---------- */
Sfx.extra.jackboxNote = function (semi, grade) {
  const f = 523.25 * Math.pow(2, (semi || 0) / 12);
  this.tone(f, 0.32, 'sine', 0.05); this.tone(f * 2, 0.18, 'triangle', grade === 2 ? 0.022 : 0.012, null, 0.005);
  this.tone(1800, 0.02, 'square', 0.008, 1500);
};
Sfx.extra.jackboxTick = function () { this.tone(1500, 0.025, 'triangle', 0.012); };
Sfx.extra.jackboxTickHi = function () { this.tone(2000, 0.03, 'triangle', 0.016); };
Sfx.extra.jackboxRattle = function () { this.tone(220, 0.05, 'square', 0.02, 180); this.tone(260, 0.04, 'square', 0.015, 200, 0.05); };
Sfx.extra.jackboxTilt = function () { this.tone(700, 0.04, 'triangle', 0.02, 820); };
Sfx.extra.jackboxPop = function () { this.tone(300, 0.08, 'square', 0.05, 900); [784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.04, null, 0.05 + i * 0.05)); };
Sfx.extra.jackboxBoing = function () { this.tone(160, 0.35, 'sine', 0.08, 640); this.tone(320, 0.2, 'sine', 0.03, 900, 0.05); };
Sfx.extra.jackboxHop = function () { this.tone(500, 0.12, 'sine', 0.05, 1000); };
Sfx.extra.jackboxHopEarly = function () { this.tone(400, 0.08, 'triangle', 0.025, 360); };
Sfx.extra.jackboxStar = function () { [1319, 1760, 2093].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.035, null, i * 0.045)); };
Sfx.extra.jackboxLand = function () { this.tone(140, 0.1, 'triangle', 0.06, 90); [659, 880].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.04, null, 0.06 + i * 0.07)); };
Sfx.extra.jackboxPillow = function () { this.tone(140, 0.4, 'sine', 0.08, 420); this.tone(280, 0.25, 'sine', 0.03, 600, 0.12); };
Sfx.extra.jackboxLid = function () { this.tone(500, 0.05, 'square', 0.02, 300); };
Sfx.extra.jackboxYoyo = function () { this.tone(900, 0.4, 'sine', 0.03, 300); };
Sfx.extra.jackboxHook = function () { this.tone(1200, 0.05, 'square', 0.025, 900); [659, 988].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.04, null, 0.06 + i * 0.06)); };
Sfx.extra.jackboxHeave = function (u) { this.tone(260 + (u || 0) * 400, 0.08, 'triangle', 0.04, 340 + (u || 0) * 420); };
Sfx.extra.jackboxPlop = function () { this.tone(200, 0.1, 'sine', 0.06, 120); [784, 988, 1175].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.04, null, 0.1 + i * 0.06)); };
Sfx.extra.jackboxSwap = function () { this.tone(523, 0.08, 'triangle', 0.035); this.tone(784, 0.1, 'triangle', 0.035, null, 0.1); };
Sfx.extra.jackboxNo = function () { this.tone(240, 0.06, 'triangle', 0.025, 200); };
Sfx.extra.jackboxFan = function () { this.tone(180, 0.4, 'sawtooth', 0.008, 240); };
Sfx.extra.jackboxBeep = function () { this.tone(880, 0.08, 'square', 0.03); this.tone(880, 0.08, 'square', 0.03, null, 0.12); };
Sfx.extra.jackboxSwish = function () { this.tone(1200, 0.18, 'sine', 0.025, 400); };
Sfx.extra.jackboxBonk = function () { this.tone(220, 0.15, 'sine', 0.06, 520); };
Sfx.extra.jackboxRibbon = function () { this.tone(300, 0.25, 'sine', 0.06, 1100); };
Sfx.extra.jackboxHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.jackboxFanfare = function () { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.045, null, i * 0.11)); };
Sfx.extra.jackboxCheer = function () { [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.04, null, i * 0.06)); };
