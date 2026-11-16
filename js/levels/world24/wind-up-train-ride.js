/* Pip & Bo - Level 24-1 Wind-Up Train Ride (team, World 24 Toy Box Town). */
'use strict';

/* ===== 24-1 Wind-Up Train Ride (mode 'windtrain', World 24 "Toy Box Town", team, Gavyn's pick) =====
   Gavyn's idea: "one cranks the key, the other switches the tracks across the floor". A wind-up toy train (an engine, an
   open wagon and a caboose) chugs along a wooden toy track across a kid's bedroom floor, seen from the side, scrolling to
   the right. The mode owns the tick, the camera, the whole picture and the HUD (def.ownStep + def.ownHUD + def.noFalls);
   the engine grid is empty apart from the two spawns. Positions are world px (x grows right, y grows down); the floor
   (and the shelf top on the Bookshelf Bridge) is at WTR.FLOOR. Nothing is scary and nobody gets hurt.
   THE WINDER rides on the engine's cab roof and winds the big brass key with the action (▲ / jump winds too, since the
   winder never jumps). The spring meter drains while the train runs, and the speed follows the spring (empty = stopped,
   "Wind me up!"). How much a press winds depends on the time since the last press: 0.3-0.7 s apart is a full CLICK (the
   beat ring round the key turns gold in that window), slower presses wind a bit less, mashing (presses under 0.22 s
   apart) winds only a little, and 0.22-0.3 s ramps up to a full click. The speed aims at vmax * min(1, 0.45 + 0.9 *
   spring), so a spring 60% full runs at full speed and a slow but steady winder still rolls. Pressing
   with the spring already full is a harmless "Sproing!": the key spins back a bit, the train shudders at low speed for
   about a second and the key can't be wound meanwhile. ▼ is the brake (hold it; ◀ works too): the train stops quickly and the
   spring doesn't drain. The winder can't leave the engine. The prompt over the engine says when to brake, when to
   hold the brake at a stop, and "Let go of ▼ to roll on" when the brake is held short of where the train must be.
   THE SWITCHER runs and jumps freely along the floor, the decks and the roofs of the wagon and the caboose (platform
   moves: ◀ ▶ run, ▲ jump, ▼ drops through a deck). The action ('switch') does the track jobs within reach:
     LEVERS: a switch splits the track into a low line on the floor and a high line on a deck of toy blocks. One way leads
       to a dead end (a wall of toy blocks across the low line, or a broken track at the end of the deck); the lever is
       always set to it to start with, so the switcher has to run ahead and flip it. Some switches have two good ways,
       one with bonus stars. A lever locks once the engine is on the switch.
     BLOCKS on the rails: toy blocks, a row of dominoes (they topple off in a line) and, under the bed, dust bunnies
       ("Shoo!"). Kick them off with the action.
     THE DRAWBRIDGE BOOK (Bookshelf Bridge): a gap between two shelves. The book stands up until the switcher jumps the
       gap and pulls the bookmark lever on the far side; it swings down and the train rolls over it.
     PASSENGERS: a toy (Teddy, Duck, Robot, Bunny) waits at a little station in each stretch. When the winder has stopped
       the train with the brake held and a wagon at the platform, the switcher's action helps them hop on ("All aboard!").
       If the whole train rolls past, they wave "Next time!" (counted, never a fail).
     THE BELL at the end of each stretch: the winder stops the engine with the brake in the end station's zone, then the
       switcher rings the bell. Then Pip and Bo hop over and SWAP JOBS.
   SOFT TROUBLE: the engine running into a block, a dead end, the raised drawbridge, the end buffer or a bouncing toy
   (a ball, a yo-yo, a metronome: wait for it with the brake) is a "Clunk!": the train stops and backs up a little
   (back to before the switch at a dead end), counted for the medal (the same thing counts at most once per 5 s, so a
   train nudging a block doesn't run the count up). A switcher who falls into the shelf gap, or is left
   behind the screen, pops back onto the caboose ("Boing!"). Roaming dust bunnies make the switcher sneeze ("Achoo!", a
   small bounce back).
   Stretches (roomWord 'Stretch', room def `wind` = who winds): Rug Run, Under the Bed (dim, a night light far away, dust
   bunnies, a lost-sock tunnel, a yo-yo), Bookshelf Bridge (book ramps, the drawbridge, a metronome), Toy Box Station (the
   finish: the toy box opens and the passengers hop in). Pip winds 1 and 3, Bo winds 2 and 4. Stars on the way: the train
   collects the low ones itself, the switcher jumps for the high ones and picks bonus branches.
   GOLD HELP (always announced in the news line, only while both players are pressing things): a block hit twice, or 18 s
   with the train waiting at it, turns gold and rolls away when the switcher comes near; a dead end (or 18 s waiting at a
   wrong lever) shows gold arrows on every lever that stretch and the levers can be flipped from further away; 2 falls
   into the shelf gap (or 25 s there) lay a gold ruler across it; 2 clunks on a bouncing toy make it take a gold nap
   (it stays out of the way), and so does 15 s of waiting just short of it; 3 sneezes put the dust bunnies to sleep
   in gold nightcaps; a winder who keeps the train crawling (20 s with the spring nearly empty while still pressing the
   key in the last 3 s, and with the switcher having pressed something in the last 30 s) gets a gold key that makes
   every click count and tops the spring up a little only while the winder keeps winding (it never moves the train for
   an idle winder); a winder who hits the end buffer twice gets a gold brake (the train stops itself in the end station
   zone); 15 s stopped at the end station makes the bell gold (it rings when the switcher comes near).
   IDLE: when no person has pressed anything for 12 s the train waits ("Taking a break") and the clock stops (G.time is
   wound back, so test loops must count steps, not G.time). A train still rolling then coasts to a stop but never rolls
   through a block, a dead end, the raised bridge or the buffer.
   Medal by time, clunks and stars (MODES.windtrain.medals, js/medals.js). Results tiles: Time (the engine's), Stars,
   Clunks, Passengers.
   Room def: { title, wind: 0|1, look: 'rug'|'bed'|'shelf'|'box', tip, act, course: [tokens] }.
   Course tokens (heights are px above the floor):
     fN flat   rN:H ramp the main line to height H over N px (on books)   *:dy[:n:gap] star(s) dy px above the rail
     b toy block   d dominoes   u dust bunny on the rails   W:len:good[:bonus] a switch (good 'up' | 'low' | 'both')
     P:name station with a passenger   O:ball|yoyo|metro a bouncing toy   Z:len roaming dust bunnies (from here)
     K lost-sock tunnel   D:w drawbridge gap   S:text sign ({W} the winder's name, {R} the switcher's)   E end station.
   MODES.windtrain.plan(st) is the one place that says what to do next (the prompts, the HUD chips and the computer brain
   read it). Every global is prefixed wtr / WTR (and Sfx.extra.windtrain*); all state lives in G.mst. */
const WTR = {
  FLOOR: 430, STEP: 4, X0: -480,
  vmax: 175, accUp: 230, accDn: 130, brakeDec: 560, upSlow: 0.82,
  drain0: 0.02, drainV: 0.11,
  windGood: 0.09, windSlow: 0.075, windMash: 0.005, beatMin: 0.3, beatMax: 0.7, sproingT: 1.0,
  cars: [{ kind: 'engine', off: 58, half: 58, h: 72 }, { kind: 'wagon', off: 168, half: 44, h: 40 }, { kind: 'caboose', off: 266, half: 44, h: 54 }],
  deckH: 118, rampW: 170, blockW: 34, domW: 104,
  run: 235, accG: 1900, accA: 1100, grav: 1700, jumpV: 665, cut: 300,
  reach: 48, goldReach: 135, helpR: 92, bellR: 60,
  camNose: 430, tryWin: 6, idleWait: 12,
  goldBlockT: 18, goldLeverT: 18, goldGapT: 25, goldKeyT: 20, goldBellT: 15, goldHzT: 15,
  swapT: 3.4, finT: 5.4,
};
const wtrLerp = (a, b, u) => a + (b - a) * u;
const wtrSmooth = u => u * u * (3 - 2 * u);
const WTR_PASS = { Teddy: '#b07a4a', Duck: '#ffd23f', Robot: '#9aa8c0', Bunny: '#ffb3d0' };

/* ---------- the course: tokens -> the main line's rail heights (4 px steps) and everything on it ---------- */
function wtrCompile(def) {
  const S = WTR, X0 = S.X0, F = S.FLOOR, wind = def.wind || 0;
  const name = s => s.replace(/\{W\}/g, NAMES[wind]).replace(/\{R\}/g, NAMES[1 - wind]);
  const c = { x0: X0, look: def.look || 'rug', stars: [], blocks: [], switches: [], stations: [], hazards: [], bunnies: [], socks: [], bridges: [], signs: [], jobs: [], gaps: [], end: null, len: 0 };
  const rail = [];
  let x = X0, h = 0;
  const seg = (len, fh) => { len = Math.max(S.STEP, Math.round(len / S.STEP) * S.STEP); for (let k = 0; k < len; k += S.STEP) rail.push(F - fh(k, len)); x += len; };
  const flat = len => { const h0 = h; seg(len, () => h0); };
  const ramp = (len, H) => { const h0 = h; seg(len, (k, L) => wtrLerp(h0, H, wtrSmooth(k / L))); h = H; };
  flat(-X0);
  for (const tk of def.course || []) {
    const t = String(tk), parts = t.split(':'), k = parts[0], a = +parts[1] || 0;
    if (k === 'S') { c.signs.push({ x, y: F - h, text: name(t.slice(2)) }); continue; }
    if (k[0] === 'f' && k.length > 1) { flat(+k.slice(1)); continue; }
    if (k[0] === 'r' && k.length > 1) { ramp(+k.slice(1), a); continue; }
    if (k === '*') {
      const n = +parts[2] || 1, gap = +parts[3] || 56;
      for (let i = 0; i < n; i++) c.stars.push({ x: x + i * gap, y: F - h - a, got: false, t: 0 });
      continue;
    }
    if (k === 'b' || k === 'd' || k === 'u') {
      const w = k === 'd' ? S.domW : S.blockW;
      const bl = { x, w, kind: k === 'd' ? 'dom' : k === 'u' ? 'bunny' : 'block', gone: false, fly: 0, clunks: 0, gold: false, t: 0, id: c.blocks.length, col: hash(c.blocks.length + 5, x | 0) % 4 };
      c.blocks.push(bl); c.jobs.push({ kind: 'block', x, o: bl });
      flat(w + 40);
      continue;
    }
    if (k === 'W') {
      const len = a || 760, good = parts[2] || 'up', bonus = parts[3] || null, R = S.rampW, D = S.deckH, base = h;
      const x0 = x, up = [];
      for (let q = 0; q < len; q += S.STEP) { const u = q < R ? wtrSmooth(q / R) : q > len - R ? wtrSmooth((len - q) / R) : 1; up.push(F - base - D * u); }
      const dead = good === 'up' ? 'low' : good === 'low' ? 'up' : null;
      const sw = { id: c.switches.length, x0, x1: x0 + len, up: Float32Array.from(up), good, bonus, dead, xd: null,
        set: dead || (bonus === 'up' ? 'low' : 'up'), taken: null, lever: { x: x0 - 58, y: F - base }, flipT: 0, t: 0, base };
      if (dead === 'low') sw.xd = x0 + Math.round(len * 0.5);
      if (dead === 'up') sw.xd = x0 + R + Math.round((len - 2 * R) * 0.55);
      if (bonus) {
        for (let i = 0; i < 5; i++) {
          const sx = x0 + R + 30 + i * (len - 2 * R - 60) / 4;
          c.stars.push({ x: sx, y: (bonus === 'up' ? F - base - D : F - base) - 44, got: false, t: 0, bonus: sw.id });
        }
      }
      c.switches.push(sw); c.jobs.push({ kind: 'lever', x: x0, o: sw });
      flat(len);
      continue;
    }
    if (k === 'P') {
      const nm = parts[1] || 'Teddy';
      const s = { x0: x, x1: x + 300, px: x + 150, name: nm, state: 'wait', hop: null, car: 1, wave: 0, id: c.stations.length };
      c.stations.push(s); c.jobs.push({ kind: 'station', x: x + 150, o: s });
      flat(300);
      continue;
    }
    if (k === 'O') {
      const kind = parts[1] || 'ball', hz = { kind, x: x + 80, y: F - h, gold: false, clunks: 0, id: c.hazards.length, P: kind === 'ball' ? 2.0 : kind === 'yoyo' ? 2.6 : 2.4, ph: 0.37 * c.hazards.length };
      c.hazards.push(hz); c.jobs.push({ kind: 'hazard', x: hz.x, o: hz });
      flat(160);
      continue;
    }
    if (k === 'Z') {
      const len = a || 600;
      c.bunnies.push({ x0: x, x1: x + len, x: x + len * 0.3, dir: 1, hop: 0, hy: 0, sp: 70, id: c.bunnies.length });
      c.bunnies.push({ x0: x, x1: x + len, x: x + len * 0.75, dir: -1, hop: 0.4, hy: 0, sp: 85, id: c.bunnies.length });
      continue;
    }
    if (k === 'K') {
      c.socks.push({ x0: x, x1: x + 340, y: F - h });
      for (let i = 0; i < 3; i++) c.stars.push({ x: x + 110 + i * 60, y: F - h - 34, got: false, t: 0 });
      flat(340);
      continue;
    }
    if (k === 'D') {
      const w = a || 130;
      const br = { gx0: x, gx1: x + w, y: F - h, down: false, ang: 0, lever: { x: x + w + 64 }, falls: 0, gold: false, t: 0, id: c.bridges.length };
      c.bridges.push(br); c.gaps.push([x, x + w]); c.jobs.push({ kind: 'bridge', x, o: br });
      flat(w);
      continue;
    }
    if (k === 'E') {
      const e = { x0: x, x1: x + 330, bell: { x: x + 316 }, buffer: x + 410, y: F - h, rung: false, gold: false, t: 0, box: !!def.finale };
      c.end = e; c.jobs.push({ kind: 'end', x: x + 316, o: e });
      flat(620);
      continue;
    }
  }
  flat(400);
  c.rail = Float32Array.from(rail);
  c.len = x;
  c.jobs.sort((p, q) => p.x - q.x);
  return c;
}
function wtrArr(arr, x0, x) { const f = clamp((x - x0) / WTR.STEP, 0, arr.length - 1.001), i = Math.floor(f), u = f - i; return arr[i] + (arr[Math.min(i + 1, arr.length - 1)] - arr[i]) * u; }
const wtrMainY = (st, x) => wtrArr(st.c.rail, st.c.x0, x);
function wtrSwAt(st, x) { for (const sw of st.c.switches) if (x > sw.x0 && x < sw.x1) return sw; return null; }
// which way the train goes at a switch: the way the engine took, else the lever
const wtrWay = sw => sw.taken || sw.set;
// the rail under the train at x (following the levers)
function wtrRailY(st, x) {
  const sw = wtrSwAt(st, x);
  if (sw && wtrWay(sw) === 'up') return wtrArr(sw.up, sw.x0, x);
  return wtrMainY(st, x);
}
const wtrGap = (st, x) => st.c.gaps.some(([a, b]) => x > a && x < b);

// each player's own keys (a player with a controller is shown its buttons, touch shows the arrows)
function wtrKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
  if (what === 'right') return pad || touch ? '▶' : id === 0 ? 'D' : '→';
  if (what === 'left') return pad || touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'up') return pad ? glyph('jump') || 'A' : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'down') return pad || touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'run') return pad ? 'stick' : touch ? '◀ ▶' : id === 0 ? 'A D' : '← →';
  return '';
}
const wtrQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const wtrBoth = st => G.time - st.inT[0] < WTR.tryWin && G.time - st.inT[1] < WTR.tryWin;

/* ---------- a stretch (one room) ---------- */
function wtrRoom(st, L, k) {
  const def = L.def;
  st.k = k; st.wind = def.wind || 0; st.run = 1 - st.wind; st.look = def.look || 'rug'; st.title = def.title || '';
  st.c = wtrCompile(def);
  const nose = 40;
  st.tr = { x: nose, v: 0, spring: 0.35, lastPress: -9, lastQ: null, sproing: 0, wob: 0, rev: null, daze: 0, wheel: 0, keyA: 0, keyV: 0, chug: 0, mashN: 0, emptyT: 0, slowT: 0, pressT: -9 };
  const cb = WTR.cars[2];
  st.sw = { x: nose - cb.off, feet: wtrMainY(st, nose - cb.off) - cb.h, vx: 0, vy: 0, ground: 'car2', face: 1, stun: 0, dropT: 0, coyote: 0, actT: 0, land: 0 };
  st.state = 'go'; st.dock = null; st.roomT = 0; st.goT = 0; st.segStart = G.time;
  st.cam = { x: nose - WTR.camNose };
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null;
  st.goldArrows = false; st.goldKey = false; st.sleepy = false; st.achooN = 0; st.deadN = 0; st.waiting = false;
  st.stats.roomT[k] = null;
  wtrMirror(st);
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function wtrStep(st, dt) {
  if (!st.c) return;
  const ps = G.players;
  for (const q of [0, 1]) {
    const i = ps[q].input;
    if (i.left || i.right || i.jump || i.down || i.up || i.act || ps[q].pendingJump || ps[q].pendingAct) st.inT[q] = G.time;
    if (!cpuOn(q) && (i.left || i.right || i.jump || i.down || i.up || i.act)) st.personT = G.time;
  }
  st.roomT += dt;
  wtrActLabels(st);
  const people = [0, 1].filter(q => !cpuOn(q));
  st.waiting = st.state === 'go' && G.introT <= 0 && people.length > 0 && G.time - st.personT > WTR.idleWait;
  if (st.waiting) G.time -= dt;
  let dx = 0;
  if (G.introT > 0 || st.waiting) {
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
    const tr = st.tr, x0 = tr.x;
    tr.v = approach(tr.v, 0, WTR.brakeDec * dt);
    // (coasting to a stop never rolls through a block, a dead end, the raised bridge or the buffer)
    const nx = tr.x + tr.v * dt, ob = tr.rev ? null : wtrAhead(st, tr.x, nx);
    if (ob && nx >= ob.x) { tr.x = Math.max(tr.x, ob.x - 1); tr.v = 0; } else tr.x = nx;
    dx = tr.x - x0;
    wtrRunner(st, dt, dx, true);
  } else if (st.state === 'go') {
    st.goT += dt;
    dx = wtrTrain(st, dt);
    wtrRunner(st, dt, dx, false);
    wtrThings(st, dt);
    wtrHelp(st, dt);
    wtrNudges(st);
  } else {
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
    wtrThings(st, dt);
    if (wtrDockStep(st, dt)) return;
  }
  wtrCam(st, dt);
  wtrFx(st, dt);
  wtrMirror(st);
}

/* ---------- the winder: the key, the spring, the brake ---------- */
function wtrWindAmt(gap) {
  const S = WTR;
  if (gap < 0.22) return [S.windMash, 'mash'];
  if (gap < S.beatMin) return [wtrLerp(S.windMash, S.windGood, (gap - 0.22) / (S.beatMin - 0.22)), 'fast'];
  if (gap <= S.beatMax) return [S.windGood, 'good'];
  if (gap < 1.2) return [wtrLerp(S.windGood, S.windSlow, (gap - S.beatMax) / (1.2 - S.beatMax)), 'slow'];
  return [S.windSlow, 'slow'];
}
function wtrWind(st) {
  const S = WTR, tr = st.tr, gap = st.roomT - tr.lastPress;
  tr.lastPress = st.roomT; tr.pressT = st.roomT;
  if (tr.sproing > 0) { Sfx.play('windtrainLocked', st.wind); return; }
  if (tr.spring >= 0.985) {
    tr.sproing = S.sproingT; tr.wob = 0.9; tr.spring = 0.9; tr.keyV = -14; st.stats.sproings++;
    Sfx.play('windtrainSproing');
    wtrPop(st, tr.x - 56, S.FLOOR - 140, 'Sproing!', '#ffe7a8', 24);
    wtrHint(st, st.wind, 'Full up! Wait a moment before you wind again', 2.6);
    return;
  }
  let [amt, q] = wtrWindAmt(gap);
  if (st.goldKey && q !== 'good') { amt = S.windGood; q = 'good'; }
  tr.spring = Math.min(1, tr.spring + amt); tr.lastQ = q; tr.keyV = Math.max(tr.keyV, q === 'good' ? 16 : 7);
  st.stats.winds++; if (q === 'good') st.stats.goodWinds++;
  tr.mashN = q === 'mash' ? tr.mashN + 1 : 0;
  if (tr.mashN === 6) wtrHint(st, st.wind, 'Not so fast! Wind each time the ring turns gold', 3);
  Sfx.play(q === 'good' ? 'windtrainClick' : 'windtrainTick', st.wind);
  if (q === 'good') wtrPart(st, tr.x - 56 + (Math.random() - 0.5) * 20, wtrRailY(st, tr.x - 56) - 84, (Math.random() - 0.5) * 60, -60, 0.5, C.gold, 3, 0, 'star');
}
// the obstacles ahead of the engine's nose: { x: the nose's limit, kind, o }
function wtrAhead(st, from, to) {
  const c = st.c, out = [];
  for (const b of c.blocks) if (!b.gone && b.x >= from - 1 && b.x <= to + 2) out.push({ x: b.x, kind: 'block', o: b });
  for (const sw of c.switches) {
    if (!sw.dead) continue;
    const way = sw.taken || (from < sw.x0 ? sw.set : null);
    if (way === sw.dead && sw.xd >= from - 1 && sw.xd <= to + 2) out.push({ x: sw.xd, kind: 'dead', o: sw });
  }
  for (const br of c.bridges) if (!br.down && br.gx0 - 4 >= from - 1 && br.gx0 - 4 <= to + 2) out.push({ x: br.gx0 - 4, kind: 'bridge', o: br });
  const e = c.end;
  if (e && e.buffer >= from - 1 && e.buffer <= to + 2) out.push({ x: e.buffer, kind: 'buffer', o: e });
  out.sort((p, q) => p.x - q.x);
  return out[0] || null;
}
function wtrTrain(st, dt) {
  const S = WTR, tr = st.tr, p = G.players[st.wind], i = p.input, x0 = tr.x;
  if (p.pendingAct || p.pendingJump) { p.pendingAct = false; p.pendingJump = false; wtrWind(st); }
  const e = st.c.end, auto = !!(e && e.goldStop && !e.rung && tr.x > e.x0 - 60);
  const brake = !!i.down || !!i.left || auto;   // (◀ brakes too, like the other side-on rides; the card shows ▼)
  tr.brake = brake;
  if (tr.sproing > 0) tr.sproing -= dt;
  if (tr.wob > 0) tr.wob -= dt;
  if (st.goldKey && st.roomT - tr.pressT < 1.5) tr.spring = Math.min(0.97, tr.spring + 0.045 * dt);
  if (tr.rev) {
    // backing up after a clunk
    tr.v = 0;
    tr.x = approach(tr.x, tr.rev.to, tr.rev.v * dt);
    for (const sw of st.c.switches) if (sw.taken && tr.x < sw.x0 - 2) sw.taken = null;
    if (tr.x <= tr.rev.to + 0.01) { tr.rev = null; tr.daze = 0.6; }
  } else if (tr.daze > 0) {
    tr.daze -= dt; tr.v = 0;
  } else {
    const nose = tr.x, ahead = wtrRailY(st, nose + 30), here = wtrRailY(st, nose - 30);
    let want = tr.spring > 0 ? S.vmax * Math.min(1, 0.45 + 0.9 * tr.spring) : 0;
    if (ahead < here - 6) want *= S.upSlow;
    if (tr.sproing > 0) want *= 0.35;
    if (brake) tr.v = approach(tr.v, 0, S.brakeDec * dt);
    else tr.v = approach(tr.v, want, (tr.v < want ? S.accUp : S.accDn) * dt);
    if (tr.v > 1) {
      tr.spring = Math.max(0, tr.spring - (S.drain0 + S.drainV * tr.v / S.vmax) * dt);
      if (tr.spring <= 0 && !tr.emptySaid) { tr.emptySaid = true; wtrPop(st, nose - 60, wtrRailY(st, nose) - 130, 'Wind me up!', '#ffffff', 22); Sfx.play('windtrainEmpty'); }
    }
    if (tr.spring > 0.05) tr.emptySaid = false;
    const nx = tr.x + tr.v * dt;
    const ob = wtrAhead(st, tr.x, nx);
    if (ob && nx >= ob.x) { tr.x = ob.x; wtrClunk(st, ob); }
    else tr.x = nx;
    // the engine passes a switch point: the train is on that way now
    for (const sw of st.c.switches) if (!sw.taken && x0 < sw.x0 && tr.x >= sw.x0) sw.taken = sw.set;
    // bouncing toys: the nose under one while it is down
    if (tr.v > 1 && !tr.rev) for (const hz of st.c.hazards) if (tr.x > hz.x - 26 && tr.x < hz.x + 14 && wtrHzBlock(st, hz, 0)) { wtrClunk(st, { x: tr.x, kind: 'hazard', o: hz }); break; }
  }
  const dx = tr.x - x0;
  tr.wheel += dx / 11;
  tr.keyA += tr.keyV * dt; tr.keyV = approach(tr.keyV, tr.v > 1 ? -1.2 * tr.v / S.vmax : 0, 30 * dt);
  // the chuff of a wind-up train: faster with speed
  tr.chug += Math.abs(dx);
  if (tr.chug > 46) { tr.chug = 0; Sfx.play('windtrainChug'); if (!reduceMotion) wtrPart(st, tr.x - 22, wtrRailY(st, tr.x - 22) - 78, -20 - Math.random() * 20, -40 - Math.random() * 20, 1.2, 'rgba(255,255,255,0.75)', 5 + Math.random() * 3, -10, 'puff'); }
  // the train collects the stars it runs through
  for (const s of st.c.stars) if (!s.got && wtrTrainHits(st, s.x, s.y, 14)) wtrStar(st, s, true);
  // slow-going winder: towards the gold key (only while both play)
  const stopNeed = wtrPlan(st).brake;
  if (!tr.rev && !brake && !stopNeed && tr.spring < 0.12 && st.roomT - tr.pressT < 3 && G.time - st.inT[st.run] < 30) tr.slowT += dt;
  if (!st.goldKey && tr.slowT > S.goldKeyT) {
    st.goldKey = true; st.stats.helps++; Sfx.play('windtrainHelp');
    wtrMsg(st, 'Gold key! It winds itself a little, and every click counts', C.gold, 4.4);
  }
  return dx;
}
function wtrClunk(st, ob) {
  const S = WTR, tr = st.tr;
  tr.v = 0;
  let back = 46, word = 'Clunk!';
  if (ob.kind === 'dead') { back = tr.x - (ob.o.x0 - 74); word = ob.o.dead === 'up' ? 'Clunk! Broken track!' : 'Clunk! Dead end!'; st.deadN++; ob.o.t += 6; }
  else if (ob.kind === 'bridge') { back = 40; word = 'Clunk! The bridge is up!'; }
  else if (ob.kind === 'buffer') { back = 120; word = 'Clunk! Too far!'; ob.o.clunks = (ob.o.clunks || 0) + 1; }
  else if (ob.kind === 'hazard') { back = 64; word = ob.o.kind === 'ball' ? 'Boing!' : ob.o.kind === 'yoyo' ? 'Bonk! Yo-yo!' : 'Tock! Metronome!'; ob.o.clunks++; }
  else if (ob.kind === 'block') { word = ob.o.kind === 'bunny' ? 'Achoo! Clunk!' : 'Clunk!'; ob.o.clunks++; ob.o.t += 4; }
  tr.rev = { to: tr.x - back, v: ob.kind === 'dead' ? 260 : 150 };
  tr.wob = 0.7;
  // (bumping the same thing again straight away is counted once)
  if (st.roomT - (ob.o.ckT == null ? -99 : ob.o.ckT) > 5) st.stats.clunks++;
  ob.o.ckT = st.roomT;
  Sfx.play(ob.kind === 'hazard' ? 'windtrainBoing' : 'windtrainClunk');
  const y = wtrRailY(st, tr.x) - 110;
  wtrPop(st, tr.x + 10, y, word, '#ffffff', 22);
  for (let k = 0; k < 8; k++) wtrPart(st, tr.x + 4, wtrRailY(st, tr.x) - 30, (Math.random() - 0.3) * 160, -60 - Math.random() * 90, 0.7, '#fff6d8', 3, 300, 'star');
  rumble(st.wind, 0.3, 0.5, 180); rumble(st.run, 0.1, 0.3, 120);
  G.shake = reduceMotion ? 0 : 0.06;
  if (ob.kind === 'dead' && !st.goldArrows && wtrBoth(st)) {
    st.goldArrows = true; st.stats.helps++; Sfx.play('windtrainHelp');
    wtrMsg(st, 'Gold arrows! They show the way, and levers flip from further away', C.gold, 4.4);
  } else if (ob.kind === 'block' && !ob.o.gold && ob.o.clunks >= 2 && wtrBoth(st)) wtrGoldBlock(st, ob.o);
  else if (ob.kind === 'hazard' && !ob.o.gold && ob.o.clunks >= 2 && wtrBoth(st)) wtrGoldHz(st, ob.o);
  else if (ob.kind === 'buffer' && !ob.o.goldStop && ob.o.clunks >= 2 && wtrBoth(st)) {
    ob.o.goldStop = true; st.stats.helps++; Sfx.play('windtrainHelp');
    wtrMsg(st, 'Gold brake! The train stops at the station by itself', C.gold, 4.4);
  }
  else wtrHint(st, st.wind, 'Brake ' + wtrKey(st.wind, 'down') + ' and wait when something is in the way', 3);
}
function wtrGoldBlock(st, b) {
  b.gold = true; st.stats.helps++; Sfx.play('windtrainHelp');
  wtrMsg(st, b.kind === 'dom' ? 'Gold dominoes! They tip over when ' + NAMES[st.run] + ' comes near' : b.kind === 'bunny' ? 'Gold bunny! It hops away when ' + NAMES[st.run] + ' comes near' : 'Gold block! It rolls away when ' + NAMES[st.run] + ' comes near', C.gold, 4.4);
}
function wtrGoldHz(st, hz) {
  hz.gold = true; st.stats.helps++; Sfx.play('windtrainHelp');
  wtrMsg(st, hz.kind === 'ball' ? 'Gold nap! The ball bounces up high out of the way' : hz.kind === 'yoyo' ? 'Gold nap! The yo-yo stays up' : 'Gold nap! The metronome swings out of the way', C.gold, 4.4);
}
// a bouncing toy: where its bottom is and whether it blocks the rail at time roomT + ahead
function wtrHzPos(st, hz, ahead) {
  const t = st.roomT + (ahead || 0), u = ((t / hz.P + hz.ph) % 1 + 1) % 1, F = hz.y;
  if (hz.kind === 'ball') {
    const s = Math.abs(Math.sin(Math.PI * u)), hgt = hz.gold ? 150 + 50 * s : 205 * s;
    return { x: hz.x, y: F - hgt - 20, r: 20, block: hgt < 108 };
  }
  if (hz.kind === 'yoyo') {
    const s = 0.5 - 0.5 * Math.cos(Math.PI * 2 * u), top = 150, low = F - 18, y = hz.gold ? top + 40 + 20 * s : wtrLerp(top, low, s);
    return { x: hz.x, y, r: 18, block: y > F - 108 };
  }
  const a = (hz.gold ? 0.25 : 0.62) * Math.sin(Math.PI * 2 * u), L = 250, py = 118;
  const bx = hz.x + (hz.gold ? 150 : 0) + L * Math.sin(a), by = py + L * Math.cos(a);
  return { x: bx, y: by, r: 20, a, px: hz.x + (hz.gold ? 150 : 0), py, block: Math.abs(bx - hz.x) < 46 };
}
const wtrHzBlock = (st, hz, ahead) => wtrHzPos(st, hz, ahead).block;
// does the train (any car) touch a circle at x, y?
function wtrTrainHits(st, x, y, r) {
  const tr = st.tr;
  for (const car of WTR.cars) {
    const cx = tr.x - car.off;
    if (Math.abs(x - cx) > car.half + r) continue;
    const ry = wtrRailY(st, cx);
    if (y > ry - car.h - r - 10 && y < ry + r) return true;
  }
  return false;
}
// a car's centre and roof (for the switcher to stand on)
function wtrCar(st, k) {
  const car = WTR.cars[k], cx = st.tr.x - car.off, ry = wtrRailY(st, cx);
  return { x: cx, half: car.half, top: ry - car.h, rail: ry };
}

/* ---------- the switcher: run and jump on the floor, the decks and the train ---------- */
// every surface at x: [{ y, ref, one }] (one = one-way: jump up through, ▼ drops through)
function wtrSurfaces(st, x) {
  const S = WTR, F = S.FLOOR, c = st.c, out = [];
  if (!wtrGap(st, x)) out.push({ y: F, ref: 'floor', one: false });
  const my = wtrMainY(st, x);
  if (my < F - 4) out.push({ y: my, ref: 'rail', one: true });
  for (const sw of c.switches) {
    if (x <= sw.x0 || x >= sw.x1) continue;
    if (sw.dead === 'up' && x > sw.xd) continue;
    const y = wtrArr(sw.up, sw.x0, x);
    if (y < F - sw.base - 4) out.push({ y, ref: 'deck' + sw.id, one: true });
    if (sw.dead === 'low' && x > sw.xd && x < sw.xd + 40) out.push({ y: F - sw.base - 68, ref: 'wall' + sw.id, one: true });
  }
  for (const k of c.socks) if (x > k.x0 + 6 && x < k.x1 - 6) { const u = (x - k.x0) / (k.x1 - k.x0); out.push({ y: k.y - 96 * Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 6))), ref: 'sock', one: true }); }
  for (const br of c.bridges) if (x >= br.gx0 - 2 && x <= br.gx1 + 2 && (br.down || br.gold)) out.push({ y: br.y, ref: 'bridge' + br.id, one: false });
  if (st.state === 'go') for (const k of [1, 2]) { const car = wtrCar(st, k); if (Math.abs(x - car.x) < car.half - 3) out.push({ y: car.top, ref: 'car' + k, one: true }); }
  return out;
}
function wtrRunner(st, dt, trainDx, frozen) {
  const S = WTR, s = st.sw, p = G.players[st.run], i = p.input;
  if (s.ground === 'car1' || s.ground === 'car2') s.x += trainDx;
  const ctrl = !frozen && st.state === 'go' && s.stun <= 0;
  if (s.stun > 0) s.stun -= dt;
  if (s.dropT > 0) s.dropT -= dt;
  if (s.actT > 0) s.actT -= dt;
  const dir = ctrl ? (i.right ? 1 : 0) - (i.left ? 1 : 0) : 0;
  if (dir) s.face = dir;
  s.vx = approach(s.vx, dir * S.run, (s.ground ? S.accG : S.accA) * dt);
  if (frozen) s.vx = approach(s.vx, 0, S.accG * dt);
  if (ctrl && p.pendingAct) { p.pendingAct = false; wtrSwitch(st); }
  if (ctrl && p.pendingJump && (s.ground || s.coyote > 0)) {
    p.pendingJump = false; s.vy = -S.jumpV; s.ground = null; s.coyote = 0; Sfx.play('jump', st.run);
  } else if (p.pendingJump && !s.ground && s.coyote <= 0) {
    if (s.jumpBuf === undefined || s.jumpBuf <= 0) s.jumpBuf = 0.12;
  }
  if (!frozen) p.pendingJump = false;
  if (s.jumpBuf > 0) s.jumpBuf -= dt;
  if (ctrl && !i.jump && s.vy < -S.cut && !s.boing) s.vy = -S.cut;
  // ▼ on a deck, a roof or the sock: drop through
  if (ctrl && i.down && s.ground && s.ground !== 'floor' && !s.ground.startsWith('bridge')) { s.dropT = 0.25; s.ground = null; s.vy = 40; }
  const prevFeet = s.feet;
  s.x += s.vx * dt;
  // the screen edges: never off the right; left behind is a hop back onto the caboose
  const L = st.cam.x + 12, R = st.cam.x + W - 14;
  if (s.x > R) { s.x = R; s.vx = Math.min(0, s.vx); }
  if (s.x < L) { if (frozen) s.x = L; else { wtrToCaboose(st, false); return; } }
  if (s.ground) {
    const surf = wtrSurfaces(st, s.x);
    let on = surf.find(q => q.ref === s.ground && Math.abs(q.y - s.feet) < 26);
    if (!on) on = surf.filter(q => Math.abs(q.y - s.feet) < 8).sort((a, b) => a.y - b.y)[0];
    if (on) { s.feet = on.y; s.ground = on.ref; s.vy = 0; s.coyote = 0.1; if (s.jumpBuf > 0 && ctrl) { s.jumpBuf = 0; s.vy = -S.jumpV; s.ground = null; Sfx.play('jump', st.run); } }
    else { s.ground = null; s.coyote = 0.1; s.vy = 0; }
  }
  if (!s.ground) {
    if (s.coyote > 0) s.coyote -= dt;
    s.vy = Math.min(s.vy + S.grav * dt, 900);
    s.feet += s.vy * dt;
    if (s.vy >= 0) {
      const surf = wtrSurfaces(st, s.x).filter(q => !(q.one && s.dropT > 0) && prevFeet <= q.y + 1.5 && s.feet >= q.y);
      if (surf.length) {
        const q = surf.sort((a, b) => a.y - b.y)[0];
        s.feet = q.y; s.ground = q.ref; s.vy = 0; s.boing = false; s.land = 0.12;
        if (s.jumpBuf > 0 && ctrl) { s.jumpBuf = 0; s.vy = -S.jumpV; s.ground = null; Sfx.play('jump', st.run); }
      }
    }
    if (s.feet > H + 40) {
      // fell into the shelf gap: count it towards the gold ruler
      const br = st.c.bridges.find(b => s.x > b.gx0 - 60 && s.x < b.gx1 + 60);
      if (br) { br.falls++; if (br.falls >= 2 && !br.gold && !br.down && wtrBoth(st)) wtrGoldRuler(st, br); }
      wtrToCaboose(st, true);
      return;
    }
  }
  if (s.land > 0) s.land -= dt;
  // stars
  for (const q of st.c.stars) if (!q.got && Math.abs(q.x - s.x) < 22 && Math.abs(q.y - (s.feet - PH / 2)) < 28) wtrStar(st, q, false);
  // roaming dust bunnies: achoo
  if (!st.sleepy && ctrl) for (const b of st.c.bunnies) {
    if (Math.abs(b.x - s.x) < 22 && s.feet > S.FLOOR - 26 - b.hy) {
      s.vx = (s.x < b.x ? -1 : 1) * 260; s.vy = -330; s.ground = null; s.stun = 0.45; s.boing = true;
      st.stats.achoos++; st.achooN++;
      Sfx.play('windtrainAchoo');
      wtrPop(st, s.x, s.feet - 60, 'Achoo!', '#ffffff', 20);
      for (let k = 0; k < 8; k++) wtrPart(st, b.x, S.FLOOR - 16, (Math.random() - 0.5) * 120, -30 - Math.random() * 60, 0.9, 'rgba(200,190,220,0.8)', 4, 40, 'dust');
      if (st.achooN >= 3 && wtrBoth(st)) {
        st.sleepy = true; st.stats.helps++; Sfx.play('windtrainHelp');
        wtrMsg(st, 'Gold nightcaps! The dust bunnies fall asleep', C.gold, 4);
      } else wtrHint(st, st.run, 'Jump ' + wtrKey(st.run, 'up') + ' over the dust bunnies', 2.6);
      break;
    }
  }
  // gold blocks roll away when the switcher comes near
  for (const b of st.c.blocks) if (b.gold && !b.gone && Math.abs(b.x + b.w / 2 - s.x) < 170) wtrKnock(st, b, true);
  // the gold bell rings when the switcher comes near and the train is ready
  const e = st.c.end;
  if (e && e.gold && !e.rung && Math.abs(e.bell.x - s.x) < 160 && wtrReady(st, 'end')) wtrRing(st);
}
function wtrToCaboose(st, fell) {
  const s = st.sw, car = wtrCar(st, 2);
  s.x = clamp(car.x, st.cam.x + 20, st.cam.x + W - 20); s.feet = car.top; s.vx = 0; s.vy = 0; s.ground = Math.abs(s.x - car.x) < car.half ? 'car2' : null; s.stun = 0.3;
  if (!s.ground) { s.feet = Math.min(car.top, WTR.FLOOR); s.ground = null; }
  if (fell) st.stats.falls++;
  Sfx.play('windtrainBoing');
  wtrPop(st, car.x, car.top - 50, fell ? 'Boing! Back on the caboose' : 'Hop! Back on the caboose', '#ffffff', 18);
  if (fell) wtrHint(st, st.run, 'Run and jump ' + wtrKey(st.run, 'up') + ' to get over the gap', 2.8);
}
function wtrGoldRuler(st, br) {
  br.gold = true; st.stats.helps++; Sfx.play('windtrainHelp');
  wtrMsg(st, 'A gold ruler! Walk across the gap', C.gold, 4);
}
// what a press of the switcher's action does right now: { kind, o, d } or null
function wtrCanSwitch(st) {
  const S = WTR, s = st.sw, c = st.c, F = S.FLOOR;
  let best = null;
  const take = (kind, o, d, lim) => { if (d < lim && (!best || d - lim < best.d - best.lim)) best = { kind, o, d, lim }; };
  const reach = st.goldArrows ? S.goldReach : S.reach;
  for (const sw of c.switches) if (s.feet > sw.lever.y - 150) take('lever', sw, Math.abs(s.x - sw.lever.x), reach);
  for (const b of c.blocks) if (!b.gone) { const ry = wtrMainY(st, b.x); if (s.feet > ry - 96 && s.feet < ry + 24) take('block', b, Math.max(0, b.x - s.x, s.x - b.x - b.w), S.reach); }
  for (const br of c.bridges) if (!br.down && s.feet > br.y - 150 && s.feet < br.y + 10) take('bridge', br, Math.abs(s.x - br.lever.x), S.reach);
  for (const p of c.stations) if (p.state === 'wait' && s.feet > F - 150) take('pass', p, Math.abs(s.x - p.px), S.helpR);
  if (c.end && !c.end.rung && s.feet > c.end.y - 150) take('bell', c.end, Math.abs(s.x - c.end.bell.x), S.bellR);
  return best;
}
// the train has stopped with the brake on in a station zone
function wtrReady(st, what, o) {
  const tr = st.tr;
  if (tr.rev || Math.abs(tr.v) > 2 || !tr.brake) return false;
  if (what === 'end') { const e = st.c.end; return !!e && tr.x > e.x0 && tr.x < e.buffer + 1; }
  for (const k of [1, 2]) { const car = wtrCar(st, k); if (car.x > o.x0 && car.x < o.x1) return k; }
  return false;
}
function wtrSwitch(st) {
  const s = st.sw, g = wtrCanSwitch(st);
  s.actT = 0.25; st.stats.presses++;
  if (!g) { Sfx.play('windtrainWhiff', st.run); return; }
  if (g.kind === 'lever') {
    const sw = g.o;
    if (sw.taken) { Sfx.play('windtrainLocked', st.run); wtrPop(st, sw.lever.x, sw.lever.y - 90, 'Locked! The train is on it', '#ffe7a8', 16); return; }
    sw.set = sw.set === 'up' ? 'low' : 'up'; sw.flipT = 0.3; st.stats.flips++;
    Sfx.play('windtrainLever', st.run);
    const good = !sw.dead || sw.set !== sw.dead;
    wtrPop(st, sw.lever.x, sw.lever.y - 92, sw.set === 'up' ? 'Up we go!' : 'Straight on!', good ? '#ffffff' : '#ffe7a8', 18);
    return;
  }
  if (g.kind === 'block') { wtrKnock(st, g.o, false); return; }
  if (g.kind === 'bridge') {
    const br = g.o; br.down = true; br.lowerT = 0; st.hints = [null, null];
    Sfx.play('windtrainBridge');
    wtrPop(st, (br.gx0 + br.gx1) / 2, br.y - 120, 'Creeeak... THUNK!', C.gold, 22);
    return;
  }
  if (g.kind === 'pass') {
    const ps = g.o, k = wtrReady(st, 'pass', ps);
    if (!k) {
      Sfx.play('windtrainWhiff', st.run);
      wtrPop(st, ps.px, WTR.FLOOR - 70, st.tr.v > 2 ? 'Stop the train first!' : !st.tr.brake ? 'Brake on, please!' : 'Roll a bit closer!', '#ffe7a8', 16);
      wtrHint(st, st.wind, st.tr.v <= 2 && st.tr.brake ? 'Let go of ' + wtrKey(st.wind, 'down') + ' and roll up to the station' : 'Stop at the station: hold ' + wtrKey(st.wind, 'down') + ' (brake)', 3);
      return;
    }
    ps.state = 'hop'; ps.hop = { t: 0, car: k, x: ps.px, y: WTR.FLOOR - 6 };
    Sfx.play('windtrainAboard');
    wtrPop(st, ps.px, WTR.FLOOR - 80, 'All aboard, ' + ps.name + '!', C.gold, 20);
    return;
  }
  if (g.kind === 'bell') {
    if (!wtrReady(st, 'end')) {
      Sfx.play('windtrainDing');
      const short = st.tr.v <= 2 && st.tr.brake && st.tr.x <= g.o.x0;
      wtrPop(st, g.o.bell.x, g.o.y - 120, short ? 'Ding! Roll a bit closer' : 'Ding! Stop the train here first', '#ffe7a8', 16);
      wtrHint(st, st.wind, short ? 'Let go of ' + wtrKey(st.wind, 'down') + ' and roll up to the bell' : 'Stop at the station: hold ' + wtrKey(st.wind, 'down') + ' (brake)', 3);
      return;
    }
    wtrRing(st);
  }
}
function wtrRing(st) {
  const e = st.c.end;
  e.rung = true; e.ringT = 0;
  Sfx.play('windtrainBell');
  wtrPop(st, e.bell.x, e.y - 130, e.box ? 'Ding ding! Toy Box Station!' : 'Ding ding!', C.gold, 26);
  wtrFinishStretch(st);
}
function wtrKnock(st, b, rolled) {
  b.gone = true; b.fly = 0.0001; b.rolled = rolled; st.stats.kicks++;
  const ry = wtrMainY(st, b.x);
  Sfx.play(b.kind === 'dom' ? 'windtrainDomino' : b.kind === 'bunny' ? 'windtrainShoo' : 'windtrainKick', st.run);
  wtrPop(st, b.x + b.w / 2, ry - 80, rolled ? 'Roll away!' : b.kind === 'dom' ? 'Clackety-clack!' : b.kind === 'bunny' ? 'Shoo!' : 'Bonk! Off it goes', rolled ? C.gold : '#ffffff', 18);
}
function wtrStar(st, s, byTrain) {
  s.got = true; s.t = 0; st.stars++; st.stats.starsRoom++;
  Sfx.play('windtrainStar', byTrain ? st.wind : st.run);
  wtrSpark(st, s.x, s.y, C.gold, 5);
}

/* ---------- things that move by themselves ---------- */
function wtrThings(st, dt) {
  const c = st.c, F = WTR.FLOOR;
  for (const b of c.blocks) if (b.gone && b.fly > 0 && b.fly < 3) b.fly += dt;
  for (const sw of c.switches) if (sw.flipT > 0) sw.flipT -= dt;
  for (const br of c.bridges) br.ang = approach(br.ang, br.down ? 1 : 0, dt * 1.6);
  for (const s of c.stars) if (s.got) s.t += dt;
  for (const b of c.bunnies) {
    if (st.sleepy) { b.hy = 0; continue; }
    b.hop += dt * 3.2;
    b.hy = Math.abs(Math.sin(b.hop)) * 16;
    b.x += b.dir * b.sp * dt;
    if (b.x < b.x0) { b.x = b.x0; b.dir = 1; } else if (b.x > b.x1) { b.x = b.x1; b.dir = -1; }
  }
  // passengers hopping into a wagon; passengers the train left behind
  for (const p of c.stations) {
    if (p.state === 'hop') {
      p.hop.t += dt;
      const car = wtrCar(st, p.hop.car), slot = st.passengers.filter(q => q.car === p.hop.car).length, u = clamp(p.hop.t / 0.8, 0, 1);
      p.hop.x = wtrLerp(p.px, car.x - 24 + slot * 22, wtrSmooth(u)); p.hop.y = wtrLerp(F - 6, car.rail - 26, u) - Math.sin(u * Math.PI) * 60;
      if (p.hop.t >= 0.8) { p.state = 'aboard'; st.passengers.push({ name: p.name, car: p.hop.car, slot: st.passengers.filter(q => q.car === p.hop.car).length }); st.stats.passengers++; Sfx.play('windtrainSeat'); }
    } else if (p.state === 'wait' && st.state === 'go') {
      const cab = wtrCar(st, 2);
      if (cab.x - cab.half > p.x1 + 20) { p.state = 'missed'; p.wave = 0; wtrPop(st, p.px, F - 90, 'Bye! Next time!', '#ffe7a8', 18); st.stats.missed++; }
    }
    if (p.state === 'missed') p.wave += dt;
  }
  if (c.end && c.end.rung) c.end.ringT = (c.end.ringT || 0) + dt;
}

/* ---------- the end of a stretch: the bell, the swap ---------- */
function wtrFinishStretch(st) {
  const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
  st.state = 'dock'; st.dock = { t: 0, last, from: [null, null] };
  st.dock.from[st.wind] = { x: st.tr.x - 96, y: wtrRailY(st, st.tr.x - 96) - 72 };
  st.dock.from[st.run] = { x: st.sw.x, y: st.sw.feet };
  st.stats.roomT[st.k] = G.time - st.segStart;
  if (last) st.stats.finishT = G.time;
  rumble(0, 0.2, 0.5, 200); rumble(1, 0.2, 0.5, 200);
}
function wtrDockStep(st, dt) {
  const d = st.dock, e = st.c.end;
  d.t += dt;
  const tr = st.tr; tr.v = 0;
  if (!d.last) {
    if (d.t > 0.9 && !d.said) { d.said = true; wtrPop(st, tr.x - 120, e.y - 170, 'Swap jobs!', '#ffffff', 30); Sfx.play('windtrainSwap'); }
    if (d.t > 1.1 && !d.hop) { d.hop = true; Sfx.play('windtrainHop', 0); Sfx.play('windtrainHop', 1); }
    if (d.t >= WTR.swapT) { nextRoom(); return true; }
  } else {
    if (d.t > 0.5 && !d.open) { d.open = true; Sfx.play('windtrainFanfare'); }
    if (d.t > 0.8 && Math.random() < dt * 30) { const a = -Math.PI * (0.15 + 0.7 * Math.random()), sp = 140 + Math.random() * 160; wtrPart(st, e.buffer + 20, e.y - 120, Math.cos(a) * sp, Math.sin(a) * sp, 1.6, ['#ffd36b', '#ffffff', '#ff9fb5', '#9fe8ff', '#8fe3b0'][Math.floor(Math.random() * 5)], 4, 120, 'conf'); }
    if (d.t >= WTR.finT && !d.cleared) {
      d.cleared = true;
      G.level.goal = { x: e.buffer + 20 - st.cam.x, y: e.y - 140 };
      levelClear();
    }
    return d.t >= WTR.finT;
  }
  return false;
}
// where a player is drawn (world px, feet)
function wtrSpot(st, id) {
  const tr = st.tr, d = st.dock;
  const cab = { x: tr.x - 96, y: wtrRailY(st, tr.x - 96) - 72 };
  if (d && !d.last && d.t > 1.1) {
    // hop over: the winder jumps down to the platform, the switcher jumps up onto the cab
    const u = clamp((d.t - 1.1) / 0.9, 0, 1), e = st.c.end;
    const from = id === st.wind ? cab : d.from[id], to = id === st.wind ? { x: Math.min(e.bell.x - 40, tr.x + 30), y: WTR.FLOOR } : cab;
    if (id !== st.wind) from.x = d.from[id].x;
    return { x: wtrLerp(from.x, to.x, wtrSmooth(u)), y: wtrLerp(from.y, to.y, u) - Math.sin(u * Math.PI) * 70, air: u > 0 && u < 1 };
  }
  if (d && d.last && d.t > 1.0) {
    // the finale: both hop down to the toy box and bounce
    const u = clamp((d.t - 1.0) / 0.8, 0, 1), e = st.c.end, from = id === st.wind ? cab : d.from[id];
    const tx = e.buffer - 70 + id * 36, hop = d.t > 1.8 ? Math.abs(Math.sin((d.t - 1.8) * 6 + id)) * 26 : 0;
    return { x: wtrLerp(from.x, tx, wtrSmooth(u)), y: wtrLerp(from.y, WTR.FLOOR, u) - Math.sin(u * Math.PI) * 60 - hop, air: true };
  }
  if (id === st.wind) return { x: cab.x, y: cab.y, air: false };
  return { x: st.sw.x, y: st.sw.feet, air: !st.sw.ground };
}

/* ---------- what to do next (prompts, chips and the computer read this) ---------- */
// the stopping distance at the train's speed (plus a little)
const wtrStopD = v => (v * v) / (2 * WTR.brakeDec) + 10 + v * 0.06;
function wtrPlan(st) {
  const S = WTR, out = { why: 'go', brake: false, hold: false, stopX: null, job: null, rx: null, ry: null, act: false, label: 'SWITCH', reason: '', bonus: null };
  if (!st.c || st.state !== 'go') { out.why = 'none'; return out; }
  const c = st.c, tr = st.tr, nose = tr.x, s = st.sw, F = S.FLOOR;
  // the winder: the first thing ahead the train must stop for
  let stop = null;
  const want = (x, why, reason, hold) => { if (stop === null || x < stop.x) stop = { x, why, reason, hold }; };
  for (const b of c.blocks) if (!b.gone && b.x > nose - 2) want(b.x - 8, 'block', b.kind === 'dom' ? 'Dominoes ahead' : b.kind === 'bunny' ? 'A dust bunny on the track' : 'A block on the track', false);
  for (const sw of c.switches) if (sw.dead && !sw.taken && sw.set === sw.dead && sw.x0 > nose - 1) want(sw.x0 - 18, 'lever', sw.dead === 'up' ? 'The lever points to the broken track' : 'The lever points to a dead end', false);
  for (const br of c.bridges) if (!br.down && br.gx0 > nose - 6) want(br.gx0 - 12, 'bridge', 'The bridge is up', false);
  for (const p of c.stations) if (p.state === 'wait' || p.state === 'hop') {
    const sx = p.px + S.cars[1].off - 10;
    if (nose - S.cars[2].off < p.x1 - 4) want(Math.max(sx, nose), 'station', 'Stop at the station for ' + p.name, true);
  }
  const e = c.end;
  if (e && !e.rung) want(Math.max(e.bell.x - 30, Math.min(nose, e.buffer - 30)), 'end', 'Stop at the station', true);
  // bouncing toys: stop short if it will be down when the nose gets there
  for (const hz of c.hazards) {
    const gapX = hz.x - 30 - nose;
    if (gapX < -40 || gapX > 260) continue;
    // (when the nose gets there and when it is through, speeding up from now)
    const tTo = d => { const v0 = Math.max(tr.v, 5), a = WTR.accUp * 0.8; return v0 > 60 ? Math.max(0, d) / v0 : (-v0 + Math.sqrt(v0 * v0 + 2 * a * Math.max(0, d))) / a; };
    const tArr = tTo(gapX), tPass = tTo(gapX + 50);
    let bad = false;
    for (let q = tArr; q <= tPass + 0.05; q += 0.05) if (wtrHzBlock(st, hz, q)) { bad = true; break; }
    if (bad && gapX > -2) want(hz.x - 34, 'hazard', hz.kind === 'ball' ? 'Wait for the ball to bounce up' : hz.kind === 'yoyo' ? 'Wait for the yo-yo to go up' : 'Wait for the metronome', false);
  }
  if (stop) {
    out.stopX = stop.x; out.reason = stop.reason; out.why = stop.why;
    const room = stop.x - nose;
    if (room <= wtrStopD(tr.v)) out.brake = true;
    if (stop.hold && room < 60) { out.brake = true; out.hold = true; }
    // (stopped or creeping just short of something in the way: keep the brake on and wait, don't creep into it)
    // (a bouncing toy is timed instead: the brake comes off as soon as the way is clear)
    if (!stop.hold && stop.why !== 'hazard' && room < 70 && tr.v < 40) { out.brake = true; out.hold = true; }
    if (room < 4 && stop.why !== 'end') out.brake = true;
  }
  // the switcher: the next job ahead
  const ready = wtrReady(st, 'end');
  let job = null;
  for (const j of c.jobs) {
    const o = j.o;
    if (j.kind === 'lever') { if (o.taken) continue; if (o.dead ? o.set === o.dead : (o.bonus && o.set !== o.bonus && o.x0 - nose > 120)) { job = j; break; } continue; }
    if (j.kind === 'block') { if (o.gone) continue; job = j; break; }
    if (j.kind === 'bridge') { if (o.down) continue; job = j; break; }
    if (j.kind === 'station') { if (o.state !== 'wait') continue; if (nose - S.cars[2].off >= o.x1 - 4) continue; job = j; break; }
    if (j.kind === 'end') { if (!o.rung) { job = j; break; } }
  }
  out.job = job;
  if (job) {
    const o = job.o;
    if (job.kind === 'lever') { out.rx = o.lever.x - 14; out.ry = F - o.base; out.label = 'FLIP'; out.bonus = !o.dead; }
    else if (job.kind === 'block') { out.rx = o.x - 18; out.ry = wtrMainY(st, o.x); out.label = o.kind === 'bunny' ? 'SHOO' : 'KICK'; }
    else if (job.kind === 'bridge') { out.rx = o.lever.x + 10; out.ry = o.y; out.label = 'LOWER'; }
    else if (job.kind === 'station') { out.rx = o.px - 30; out.ry = F; out.label = 'HELP'; out.wait = !wtrReady(st, 'pass', o); }
    else if (job.kind === 'end') { out.rx = o.bell.x - 12; out.ry = o.y; out.label = 'RING'; out.wait = !ready; }
    const g = wtrCanSwitch(st);
    out.can = !!(g && g.o === o);
    out.act = out.can && !out.wait;
  }
  void s;
  return out;
}

/* ---------- help: gold help when stuck, one-time lessons ---------- */
function wtrHelp(st, dt) {
  const S = WTR, both = wtrBoth(st), tr = st.tr, pl = wtrPlan(st);
  if (!both) return;
  const near = (x, d) => x - tr.x < d && x - tr.x > -60;
  for (const b of st.c.blocks) if (!b.gone && !b.gold && near(b.x, 400)) { b.t += dt; if (b.t > S.goldBlockT) wtrGoldBlock(st, b); }
  for (const sw of st.c.switches) if (sw.dead && !sw.taken && sw.set === sw.dead && near(sw.x0, 400)) { sw.t += dt; if (sw.t > S.goldLeverT && !st.goldArrows) { st.goldArrows = true; st.stats.helps++; Sfx.play('windtrainHelp'); wtrMsg(st, 'Gold arrows! They show the way, and levers flip from further away', C.gold, 4.4); } }
  for (const br of st.c.bridges) if (!br.down && !br.gold && near(br.gx0, 500)) { br.t += dt; if (br.t > S.goldGapT) wtrGoldRuler(st, br); }
  // a train that keeps waiting at a bouncing toy (stopped within reach of it): the toy takes a gold nap
  for (const hz of st.c.hazards) if (!hz.gold && hz.x - tr.x < 150 && hz.x - tr.x > 0 && Math.abs(tr.v) < 5 && !tr.rev) { hz.t = (hz.t || 0) + dt; if (hz.t > S.goldHzT) wtrGoldHz(st, hz); }
  const e = st.c.end;
  if (e && !e.rung && !e.gold && wtrReady(st, 'end')) { e.t += dt; if (e.t > S.goldBellT) { e.gold = true; st.stats.helps++; Sfx.play('windtrainHelp'); wtrMsg(st, 'Gold bell! It rings when ' + NAMES[st.run] + ' comes near', C.gold, 4); } }
  void pl;
}
function wtrHintOnce(st, key, id, text, life) { if (st.hinted[key]) return; st.hinted[key] = true; wtrHint(st, id, text, life); }
function wtrNudges(st) {
  const Wd = st.wind, Rn = st.run, pl = wtrPlan(st), job = pl.job, tr = st.tr;
  // (the first hints wait for the intro card to go: st.goT counts only time in play)
  if (st.goT > 0.4 && st.goT < 1) {
    wtrHintOnce(st, 'wind' + st.k, Wd, 'You wind! ' + wtrKey(Wd, 'act') + ' on the gold ring, ' + wtrKey(Wd, 'down') + ' brakes', 3.6);
    wtrHintOnce(st, 'run' + st.k, Rn, 'Run ahead! ' + wtrKey(Rn, 'act') + ' flips levers and kicks blocks', 3.8);
  }
  if (job && job.x - tr.x < 700) {
    if (job.kind === 'lever' && job.o.dead) wtrHintOnce(st, 'lever' + st.k, Rn, 'A switch! Flip the lever away from the ' + (job.o.dead === 'up' ? 'broken track' : 'dead end'), 3.8);
    if (job.kind === 'bridge') wtrHintOnce(st, 'bridge' + st.k, Rn, 'Jump the gap and pull the bookmark lever!', 3.8);
    if (job.kind === 'station') wtrHintOnce(st, 'station' + st.k, Wd, job.o.name + ' is waiting! Stop at the station: hold ' + wtrKey(Wd, 'down'), 3.8);
  }
  if (pl.why === 'hazard' && pl.brake) wtrHintOnce(st, 'hz' + st.k, Wd, 'Brake ' + wtrKey(Wd, 'down') + ' and wait for it to go up', 3.2);
}

/* ---------- small helpers ---------- */
function wtrHint(st, id, text, life) { if (wtrQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || 2.8 }; }
function wtrMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function wtrPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 10) st.pops.shift(); }
function wtrPart(st, x, y, vx, vy, life, col, size, grav, kind) {
  if (st.parts.length > 260) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
function wtrSpark(st, x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 120; wtrPart(st, x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.55, col, 3 + Math.random() * 2, 0, 'star'); } }
// the touch buttons and the top-bar legend name each player's own action this stretch
let wtrLabelEls = null;
function wtrActLabels(st) {
  try {
    if (!wtrLabelEls || !wtrLabelEls.every(o => document.contains(o.el))) wtrLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of wtrLabelEls) {
      const want = o.id < 0 ? 'wind/switch' : o.id === st.wind ? 'wind' : 'switch';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}
function wtrCam(st, dt) {
  const S = WTR, cam = st.cam, nose = st.tr.x, s = st.sw;
  let tx = nose - S.camNose;
  if (st.state === 'go' && s.x > tx + W - 70) tx = s.x - (W - 70);
  tx = Math.min(tx, nose - 170);
  tx = clamp(tx, st.c.x0, st.c.len - W);
  cam.x += (tx - cam.x) * Math.min(1, dt * 3);
  if (nose - cam.x < 150) cam.x = nose - 150;
}
function wtrFx(st, dt) {
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 5;
    if (q.kind === 'puff') { q.size += dt * 6; q.vx *= 1 - dt; }
    if (q.kind === 'dust') { q.vx *= 1 - dt * 2; }
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.4);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
}
// copy where Pip and Bo are into the engine players (screen px): the engine draws them, name tags and bubbles read p.x / p.y
function wtrMirror(st) {
  const cam = st.cam;
  for (const p of G.players) {
    const sp = wtrSpot(st, p.id), run = p.id === st.run && (!st.dock);
    p.x = sp.x - cam.x - PW / 2; p.y = sp.y - PH;
    p.alive = true; p.grounded = !sp.air; p.stompSafe = 0;
    p.vy = run ? st.sw.vy : sp.air ? -100 : 0;
    p.face = run ? st.sw.face : 1;
    p.stun = run ? (st.sw.stun > 0 ? 0.4 : 0) : (p.id === st.wind && st.tr.wob > 0.3 ? 0.4 : 0);
    // a little squash when winding, landing or hopping
    let sq = 1;
    if (p.id === st.wind && !st.dock) { const since = st.roomT - st.tr.pressT; sq = since < 0.15 ? 0.86 + since : 1; }
    if (run && st.sw.land > 0) sq = 0.85;
    if (run && !st.sw.ground) sq = 1.08;
    p.sy = sq; p.sx = 2 - sq;
  }
}

MODES.windtrain = {
  WTR,
  // Medal: Gold at <= 4:00 with <= 4 clunks and half the stars; Silver at <= 6:30 with <= 12 clunks (tuned with bots)
  medals: { bronze: 'Chug all the way to Toy Box Station', goals: [{ key: 'time', gold: 240, silver: 390 }, { key: 'clunks', gold: 4, silver: 12, word: 'clunk' }, { key: 'stars', gold: 0.5, more: true, pct: true, word: 'the stars' }] },
  medalValues() { const st = G.mst, s = st.stats; return s ? { clunks: s.clunks, stars: st.stars / (st.starsAll || 1) } : {}; },
  compile: wtrCompile, plan: wtrPlan, railY: wtrRailY, mainY: wtrMainY, canSwitch: wtrCanSwitch, ready: wtrReady, car: wtrCar,
  surfaces: wtrSurfaces, hzPos: wtrHzPos, hzBlock: wtrHzBlock, stopD: wtrStopD, key: wtrKey, windAmt: wtrWindAmt, gap: wtrGap,
  setup(st, L) {
    st.stats = { clunks: 0, falls: 0, achoos: 0, sproings: 0, winds: 0, goodWinds: 0, passengers: 0, missed: 0, helps: 0, presses: 0, flips: 0, kicks: 0, starsRoom: 0, roomT: [], finishT: 0 };
    st.stars = 0; st.passengers = []; st.inT = [G.time, G.time]; st.personT = G.time;
    // count every stretch's stars and passengers up front (the HUD shows "x of all")
    const def = LEVELS[G.levelIndex];
    let n = 0, np = 0;
    for (const r of def.rooms || [def]) { const c = wtrCompile(Object.assign({}, def, r)); n += c.stars.length; np += c.stations.length; }
    st.starsAll = n; st.passAll = np;
    wtrRoom(st, L, 0);
  },
  room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; wtrRoom(st, L, k); },
  step(dt) { wtrStep(G.mst, dt); },
  draw() { const st = G.mst; if (st.c) wtrDrawWorld(st); },
  drawTop() { const st = G.mst; if (st.c) wtrDrawFront(st); },
  hud() { const st = G.mst; if (st.c) wtrHud(st); },
  stats() {
    const st = G.mst, s = st.stats;
    if (!s) return [];
    const all = st.starsAll || 1, frac = st.stars / all;
    const out = [
      { label: 'Stars', value: st.stars + ' of ' + all },
      { label: 'Clunks', value: String(s.clunks) },
      { label: 'Passengers', value: s.passengers + ' of ' + (st.passAll || 4) },
    ];
    const good = s.winds ? Math.round(100 * s.goodWinds / s.winds) : 0;
    const words = s.passengers >= (st.passAll || 4) ? 'Every toy got a ride to Toy Box Station. All aboard!' : frac >= 0.6 ? 'Round the rug, under the bed and over the books!' : 'Chugga chugga, all the way to the toy box!';
    out.push(words + ' Winds on the beat: ' + good + '%.');
    if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
    return out;
  },
};

/* ---------- drawing: the bedroom ---------- */
const WTR_LOOK = {
  rug: { wT: '#bcd8f4', wB: '#e8f1fb', dot: 'rgba(255,255,255,0.55)', board: '#d9a46c', boardD: '#b98250', rugA: '#b49be0', rugB: '#ffe08a', rugC: '#ff9fb5', skirt: '#f7f1e6' },
  bed: { wT: '#2a2450', wB: '#3c3468', dot: 'rgba(255,255,255,0.06)', board: '#4a3e6e', boardD: '#3a3058', rugA: '#5a4a80', rugB: '#6a5a92', rugC: '#4a3c70', skirt: '#4a4270' },
  shelf: { wT: '#b98a5c', wB: '#d0a274', dot: 'rgba(0,0,0,0)', board: '#c98a52', boardD: '#8e5a2e', rugA: '#c98a52', rugB: '#dca06a', rugC: '#8e5a2e', skirt: '#a8743e' },
  box: { wT: '#f6cfa8', wB: '#fff0d8', dot: 'rgba(255,255,255,0.5)', board: '#d49a62', boardD: '#ae7444', rugA: '#7cc4e8', rugB: '#8fe3b0', rugC: '#ff9fb5', skirt: '#fff6ea' },
};
const WTR_BLOCK = ['#e8574a', '#5b95ff', '#f6c84a', '#5cc27f'];
function wtrDrawWorld(st) {
  const cam = st.cam, lk = WTR_LOOK[st.look] || WTR_LOOK.rug, F = WTR.FLOOR;
  wtrDrawBack(st, lk);
  ctx.save(); ctx.translate(-Math.round(cam.x * 10) / 10, 0);
  wtrDrawFloor(st, lk);
  for (const e of [st.c.end]) if (e) wtrDrawEndBack(st, e);
  wtrDrawSigns(st);
  for (const k of st.c.socks) if (k.x1 > cam.x - 40 && k.x0 < cam.x + W + 40) wtrDrawSock(st, k, false);
  wtrDrawTrack(st);
  for (const p of st.c.stations) if (p.x1 > cam.x - 60 && p.x0 < cam.x + W + 60) wtrDrawStation(st, p);
  for (const sw of st.c.switches) if (sw.lever.x > cam.x - 80 && sw.lever.x < cam.x + W + 80) wtrDrawLever(st, sw);
  for (const br of st.c.bridges) if (br.gx1 + 100 > cam.x && br.gx0 - 100 < cam.x + W) wtrDrawBridge(st, br);
  for (const b of st.c.blocks) if (b.x + 200 > cam.x && b.x - 60 < cam.x + W) wtrDrawBlock(st, b);
  for (const hz of st.c.hazards) if (Math.abs(hz.x - cam.x - W / 2) < W) wtrDrawHazard(st, hz);
  wtrDrawStars(st);
  wtrDrawTrain(st);
  for (const p of st.c.stations) if (p.state === 'hop') wtrDrawPassenger(p.name, p.hop.x, p.hop.y, 1, G.clock, false);
  for (const b of st.c.bunnies) if (b.x > cam.x - 40 && b.x < cam.x + W + 40) wtrDrawBunny(b.x, F - b.hy, st.sleepy, b.dir, G.clock + b.id);
  if (st.c.end) wtrDrawEndFront(st, st.c.end);
  ctx.restore();
  void F;
}
// the far room: wallpaper, a window, the skirting board (parallax), or the bed's underside, or the bookshelf's back
function wtrDrawBack(st, lk) {
  const cam = st.cam, F = WTR.FLOOR, t = G.clock;
  const g = ctx.createLinearGradient(0, 0, 0, 330); g.addColorStop(0, lk.wT); g.addColorStop(1, lk.wB);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (st.look === 'rug' || st.look === 'box') {
    // wallpaper stars
    ctx.fillStyle = lk.dot;
    const off = cam.x * 0.25;
    for (let k = Math.floor((off - 60) / 90); k <= Math.floor((off + W + 60) / 90); k++) for (let r = 0; r < 4; r++) {
      const x = k * 90 + (r % 2) * 45 - off, y = 30 + r * 70;
      wtrStarPath(x, y, 7, 3, 0); ctx.fill();
    }
    // a window, a poster and a shelf, every 1500 px
    const o2 = cam.x * 0.3;
    for (let k = Math.floor((o2 - 400) / 1500); k <= Math.floor((o2 + W + 400) / 1500); k++) {
      const x = k * 1500 - o2 + 300;
      wtrDrawWindow(x, 70, st.look === 'box');
      const px = x + 520, h = hash(k, 3);
      ctx.fillStyle = 'rgba(40,30,70,0.12)'; rr(px + 5, 95, 90, 110, 6); ctx.fill(); ctx.fillRect(px + 164, 182, 180, 6);
      ctx.fillStyle = ['#ff9fb5', '#9fe8ff', '#b8f28a'][h % 3]; rr(px, 90, 90, 110, 6); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; rr(px, 90, 90, 110, 6); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; wtrStarPath(px + 45, 140, 24, 10, 0); ctx.fill();
      ctx.fillStyle = '#c98a52'; ctx.fillRect(px + 160, 170, 180, 12);
      for (let i = 0; i < 4; i++) { ctx.fillStyle = WTR_BLOCK[(h + i) % 4]; rr(px + 172 + i * 40, 140, 28, 30, 4); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(px + 192 + i * 40, 142, 8, 28); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(px + 174 + i * 40, 142, 22, 3); }
    }
    { const g = ctx.createLinearGradient(0, 230, 0, 300); g.addColorStop(0, 'rgba(40,30,70,0)'); g.addColorStop(1, 'rgba(40,30,70,0.1)'); ctx.fillStyle = g; ctx.fillRect(0, 230, W, 70); }
    if (st.look === 'box') {
      // an evening lamp glow
      const lx = W * 0.75 - (cam.x * 0.15) % 600;
      const lg = ctx.createRadialGradient(lx, 120, 10, lx, 120, 320); lg.addColorStop(0, 'rgba(255,220,150,0.55)'); lg.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    }
    // skirting board and the far floorboards
    ctx.fillStyle = lk.skirt; ctx.fillRect(0, 300, W, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 300, W, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, 308, W, 1.5);
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0, 318, W, 3);
    ctx.fillStyle = lk.board; ctx.fillRect(0, 320, W, H - 320);
    ctx.strokeStyle = lk.boardD; ctx.lineWidth = 1.5;
    for (const y of [334, 352, 374]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    const o3 = cam.x * 0.7;
    for (let k = Math.floor(o3 / 160); k <= Math.floor((o3 + W) / 160) + 1; k++) { const x = k * 160 - o3 + (k % 2) * 60; ctx.beginPath(); ctx.moveTo(x, 334); ctx.lineTo(x, 352); ctx.stroke(); }
    // far toys on the floor (parallax 0.6)
    const o4 = cam.x * 0.6;
    for (let k = Math.floor((o4 - 300) / 700); k <= Math.floor((o4 + W + 300) / 700); k++) {
      const x = k * 700 - o4 + 120, h = hash(k, 11) % 3;
      if (h === 0) { for (let i = 0; i < 3; i++) for (let j = 0; j <= i; j++) { ctx.fillStyle = WTR_BLOCK[(i + j + k) & 3]; rr(x + j * 22 - i * 11 + 22, 352 - (3 - i) * 20, 20, 20, 3); ctx.fill(); } }
      else if (h === 1) { ctx.fillStyle = '#ff6b8a'; circle(x + 40, 342, 18); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 22, 339, 36, 6); ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.beginPath(); ctx.ellipse(x + 40, 360, 20, 4, 0, 0, Math.PI * 2); ctx.fill(); }
      // (a ring-stacking toy, not a teddy: a far teddy looked like the Teddy passenger left behind)
      else { ctx.fillStyle = '#c98a52'; rr(x + 37, 300, 6, 56, 3); ctx.fill(); for (let i = 0; i < 4; i++) { ctx.fillStyle = WTR_BLOCK[(i + k) & 3]; rr(x + 40 - (30 - i * 6), 344 - i * 12, 2 * (30 - i * 6), 12, 6); ctx.fill(); } ctx.fillStyle = '#ffd23f'; circle(x + 40, 298, 6); ctx.fill(); }
    }
    return;
  }
  if (st.look === 'bed') {
    // far wall with a night light glowing low down far away
    const nx = W * 0.82 - (cam.x * 0.12) % 1400;
    for (const x of [nx, nx + 1400]) {
      const lg = ctx.createRadialGradient(x, 290, 4, x, 290, 260); lg.addColorStop(0, 'rgba(255,214,140,0.55)'); lg.addColorStop(0.4, 'rgba(255,190,120,0.18)'); lg.addColorStop(1, 'rgba(255,190,120,0)');
      ctx.fillStyle = lg; ctx.fillRect(x - 280, 20, 560, 520);
      ctx.fillStyle = '#fff2c8'; rr(x - 14, 276, 28, 30, 8); ctx.fill(); ctx.fillStyle = '#ffd36b'; circle(x, 286, 8); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; wtrStarPath(x, 286, 6, 2.5, 0); ctx.fill();
    }
    ctx.fillStyle = lk.board; ctx.fillRect(0, 320, W, H - 320);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0, 318, W, 4);
    // the bed's underside: slats and a stripy mattress, and the bed legs
    const o = cam.x * 0.95;
    ctx.fillStyle = '#3e5c9a'; ctx.fillRect(0, 0, W, 64);
    ctx.fillStyle = '#4f72b4'; for (let x = -((o * 1) % 40); x < W; x += 40) ctx.fillRect(x, 0, 18, 60);
    ctx.fillStyle = '#8a5a36'; ctx.fillRect(0, 60, W, 14);
    for (let k = Math.floor(o / 220); k <= Math.floor((o + W) / 220) + 1; k++) { const x = k * 220 - o; ctx.fillStyle = '#6e4628'; ctx.fillRect(x, 70, 50, 18); }
    for (let k = Math.floor((o - 200) / 1600); k <= Math.floor((o + W + 200) / 1600); k++) { const x = k * 1600 - o + 500; ctx.fillStyle = '#6e4628'; ctx.fillRect(x, 70, 40, 260); ctx.fillStyle = '#5a3a20'; ctx.fillRect(x + 30, 70, 10, 260); }
    // little lost things far back
    const o4 = cam.x * 0.6;
    for (let k = Math.floor((o4 - 200) / 520); k <= Math.floor((o4 + W + 200) / 520); k++) {
      const x = k * 520 - o4, h = hash(k, 21) % 3;
      if (h === 0) { ctx.fillStyle = '#e8574a'; rr(x, 336, 60, 10, 4); ctx.fill(); ctx.fillStyle = '#f6efdf'; ctx.beginPath(); ctx.moveTo(x + 60, 336); ctx.lineTo(x + 72, 341); ctx.lineTo(x + 60, 346); ctx.fill(); }
      else if (h === 1) { ctx.fillStyle = '#7a6aa8'; circle(x + 30, 340, 12); ctx.fill(); circle(x + 46, 336, 9); ctx.fill(); }
      else { ctx.fillStyle = '#5b95ff'; rr(x, 330, 46, 16, 5); ctx.fill(); ctx.fillStyle = '#2a2450'; circle(x + 10, 348, 5); ctx.fill(); circle(x + 36, 348, 5); ctx.fill(); }
    }
    return;
  }
  // the bookshelf: the shelf above, the back panel and books standing behind the track
  const o = cam.x;
  ctx.fillStyle = '#a8743e'; ctx.fillRect(0, 0, W, 300);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 2;
  for (let y = 20; y < 300; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(W * 0.3, y + 6, W * 0.6, y - 6, W, y + 2); ctx.stroke(); }
  for (let k = Math.floor((o * 0.9 - 40) / 34); k <= Math.floor((o * 0.9 + W + 40) / 34); k++) {
    const h = hash(k, 31), x = k * 34 - o * 0.9;
    if (h % 9 === 0) continue;
    const bh = 150 + h % 120, bw = 22 + h % 12, col = ['#e8574a', '#5b95ff', '#5cc27f', '#f6c84a', '#b28dff', '#ff9fb5', '#4fb8c0'][h % 7];
    ctx.fillStyle = col; rr(x, F - bh, bw, bh, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 3, F - bh + 14, bw - 6, 4); ctx.fillRect(x + 3, F - 24, bw - 6, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x + bw - 4, F - bh, 4, bh);
  }
  ctx.fillStyle = 'rgba(40,20,0,0.18)'; ctx.fillRect(0, 0, W, H);
  // the shelf above
  ctx.fillStyle = '#c98a52'; ctx.fillRect(0, 70, W, 34); ctx.fillStyle = '#dca06a'; ctx.fillRect(0, 70, W, 6); ctx.fillStyle = '#8e5a2e'; ctx.fillRect(0, 100, W, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 106, W, 10);
  void t;
}
function wtrDrawWindow(x, y, evening) {
  ctx.fillStyle = '#ffffff'; rr(x - 8, y - 8, 236, 186, 8); ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + 170); g.addColorStop(0, evening ? '#ffb27a' : '#7cc8f8'); g.addColorStop(1, evening ? '#ffe0a8' : '#d6f0ff');
  ctx.fillStyle = g; ctx.fillRect(x, y, 220, 170);
  ctx.fillStyle = evening ? 'rgba(255,240,200,0.95)' : 'rgba(255,245,200,0.95)'; circle(x + 160, y + (evening ? 120 : 50), 22); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; circle(x + 50, y + 60, 16); ctx.fill(); circle(x + 70, y + 54, 20); ctx.fill(); circle(x + 92, y + 62, 14); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 106, y, 8, 170); ctx.fillRect(x, y + 80, 220, 8);
  // curtains
  ctx.fillStyle = evening ? '#e8a0c8' : '#ff9fb5';
  ctx.beginPath(); ctx.moveTo(x - 20, y - 14); ctx.lineTo(x + 40, y - 14); ctx.quadraticCurveTo(x + 10, y + 90, x + 30, y + 196); ctx.lineTo(x - 20, y + 196); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 240, y - 14); ctx.lineTo(x + 180, y - 14); ctx.quadraticCurveTo(x + 210, y + 90, x + 190, y + 196); ctx.lineTo(x + 240, y + 196); ctx.fill();
  ctx.fillStyle = '#c98a52'; ctx.fillRect(x - 30, y - 20, 280, 8);
}
function wtrStarPath(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot - Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
// the floor in the world: the big rug (or dusty carpet, or the shelf plank with the gaps between bookcases)
function wtrDrawFloor(st, lk) {
  const cam = st.cam, F = WTR.FLOOR, x0 = cam.x - 20, x1 = cam.x + W + 20;
  if (st.look === 'shelf') {
    ctx.fillStyle = '#c98a52'; ctx.fillRect(x0, F, x1 - x0, 44);
    ctx.fillStyle = '#dca06a'; ctx.fillRect(x0, F, x1 - x0, 5);
    ctx.fillStyle = '#8e5a2e'; ctx.fillRect(x0, F + 40, x1 - x0, 6);
    ctx.fillStyle = '#7a4c26'; ctx.fillRect(x0, F + 46, x1 - x0, H - F);
    for (let k = Math.floor(x0 / 40); k * 40 < x1; k++) { const h = hash(k, 41); if (h % 5 === 0) continue; ctx.fillStyle = ['#a8443a', '#3c6aa8', '#3e8a5a', '#b8902a'][h % 4]; ctx.fillRect(k * 40 + 4, F + 56 + h % 20, 30, 80); }
    // the gaps between bookcases: a long way down to the carpet
    for (const [a, b] of st.c.gaps) {
      if (b < x0 || a > x1) continue;
      const g = ctx.createLinearGradient(0, F - 300, 0, H); g.addColorStop(0, '#5a3a20'); g.addColorStop(1, '#2a1a10');
      ctx.fillStyle = g; ctx.fillRect(a, 104, b - a, H);
      ctx.fillStyle = '#7cc4e8'; ctx.fillRect(a, H - 30, b - a, 30);
      ctx.fillStyle = '#8e5a2e'; ctx.fillRect(a - 10, 104, 10, H); ctx.fillRect(b, 104, 10, H);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(a - 10, 104, 3, H);
    }
    return;
  }
  // the rug: stripes and a tassel border, from just behind the track to the bottom
  ctx.fillStyle = lk.rugA; ctx.fillRect(x0, F - 40, x1 - x0, H - F + 40);
  ctx.fillStyle = lk.rugB; ctx.fillRect(x0, F - 40, x1 - x0, 10); ctx.fillRect(x0, F + 32, x1 - x0, 12);
  ctx.fillStyle = lk.rugC; ctx.fillRect(x0, F + 62, x1 - x0, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let k = Math.floor(x0 / 48); k * 48 < x1; k++) { const x = k * 48; ctx.beginPath(); ctx.moveTo(x, F + 92); ctx.lineTo(x + 12, F + 80); ctx.lineTo(x + 24, F + 92); ctx.lineTo(x + 12, F + 104); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let k = Math.floor(x0 / 12); k * 12 < x1; k++) ctx.fillRect(k * 12, F - 44, 3, 6);
  // woven threads, a few fluffy flecks, and shade towards the front edge
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; for (let y = F - 28; y < H; y += 7) ctx.fillRect(x0, y, x1 - x0, 1.5);
  ctx.fillStyle = 'rgba(40,20,60,0.06)'; for (let y = F - 25; y < H; y += 7) ctx.fillRect(x0, y, x1 - x0, 1);
  for (let k = Math.floor(x0 / 23); k * 23 < x1; k++) { const h = hash(k, 47); ctx.fillStyle = h % 2 ? 'rgba(255,255,255,0.14)' : 'rgba(40,20,60,0.1)'; ctx.fillRect(k * 23 + (h % 15), F + 8 + (h % (H - F - 16)), 4, 2); }
  { const g = ctx.createLinearGradient(0, F + 40, 0, H); g.addColorStop(0, 'rgba(30,20,50,0)'); g.addColorStop(1, 'rgba(30,20,50,0.16)'); ctx.fillStyle = g; ctx.fillRect(x0, F + 40, x1 - x0, H - F - 40); }
}
function wtrDrawSigns(st) {
  for (const s of st.c.signs) {
    if (s.x < st.cam.x - 200 || s.x > st.cam.x + W + 200) continue;
    // (bigger letters on phones, where the stage is drawn small)
    const fs = hudBig() ? 20 : 15, bh = fs * 2;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(s.text).width + 22, y = s.y - 190 - (bh - 30);
    ctx.fillStyle = '#8e5a2e'; ctx.fillRect(s.x - 3, y + bh - 4, 6, 150 + 30 - bh + 4);
    ctx.fillStyle = '#6e4220'; ctx.fillRect(s.x + 1, y + bh - 4, 2, 150 + 30 - bh + 4);
    ctx.fillStyle = 'rgba(40,30,70,0.16)'; rr(s.x - w / 2 + 3, y + 4, w, bh, 8); ctx.fill();
    ctx.fillStyle = '#fff8e8'; ctx.strokeStyle = '#c98a52'; ctx.lineWidth = 3; rr(s.x - w / 2, y, w, bh, 8); ctx.fill(); ctx.stroke();
    text(s.text, s.x, y + bh / 2 + 0.5, fs, C.ink, 'center', 'body');
  }
}
// a stretch of wooden toy track along ys(x) from xa to xb
function wtrRailPath(ys, xa, xb, off) {
  ctx.beginPath();
  ctx.moveTo(xa, ys(xa) + off);
  for (let x = xa + 8; x < xb; x += 8) ctx.lineTo(x, ys(x) + off);
  ctx.lineTo(xb, ys(xb) + off);
}
function wtrDrawRail(ys, xa, xb) {
  if (xb <= xa) return;
  ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  wtrRailPath(ys, xa, xb, 5); ctx.strokeStyle = '#9c6a3a'; ctx.lineWidth = 12; ctx.stroke();
  wtrRailPath(ys, xa, xb, 4); ctx.strokeStyle = '#e8bf86'; ctx.lineWidth = 9; ctx.stroke();
  wtrRailPath(ys, xa, xb, 1); ctx.strokeStyle = '#f6dcae'; ctx.lineWidth = 2; ctx.stroke();
  wtrRailPath(ys, xa, xb, 4); ctx.strokeStyle = '#b88650'; ctx.lineWidth = 1.5; ctx.stroke();
  // the little joins between track pieces
  ctx.fillStyle = '#9c6a3a';
  for (let x = Math.ceil(xa / 140) * 140; x < xb; x += 140) { const y = ys(x); ctx.fillRect(x - 1.5, y, 3, 9); }
}
// ABC block pillars under a deck, or a pile of books under a raised main line
function wtrDrawSupports(st, ys, xa, xb, books) {
  const F = WTR.FLOOR;
  if (books) {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(xa, F); for (let x = xa; x <= xb; x += 8) ctx.lineTo(x, ys(x) + 9); ctx.lineTo(xb, ys(xb) + 9); ctx.lineTo(xb, F); ctx.closePath(); ctx.clip();
    for (let y = F - 16, i = 0; y > F - 300; y -= 16, i++) {
      const sh = (hash(i, 7) % 30) - 15;
      ctx.fillStyle = ['#e8574a', '#5b95ff', '#5cc27f', '#f6c84a', '#b28dff', '#ff9fb5'][i % 6];
      ctx.fillRect(xa - 40 + sh, y, xb - xa + 80, 15);
      ctx.fillStyle = '#fffaf0'; ctx.fillRect(xa - 40 + sh, y + 3, xb - xa + 80, 3);
    }
    ctx.restore();
    return;
  }
  for (let x = Math.ceil((xa + 20) / 72) * 72; x < xb - 20; x += 72) {
    const top = ys(x) + 10;
    if (F - top < 20) continue;
    let y = F, i = 0;
    while (y - 34 > top - 2) { wtrABC(x - 17, y - 34, 34, (hash(x, i) % 4), String.fromCharCode(65 + (hash(x, i + 9) % 26))); y -= 34; i++; }
    if (y > top + 2) { ctx.fillStyle = WTR_BLOCK[(i + 1) & 3]; rr(x - 15, top, 30, y - top, 3); ctx.fill(); }
  }
}
function wtrABC(x, y, s, ci, letter) {
  ctx.fillStyle = WTR_BLOCK[ci]; rr(x, y, s, s, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; rr(x, y, s, s, 4); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; rr(x + s * 0.18, y + s * 0.18, s * 0.64, s * 0.64, 3); ctx.fill();
  text(letter, x + s / 2, y + s / 2 + 1, s * 0.5, WTR_BLOCK[ci], 'center');
}
function wtrDrawTrack(st) {
  const c = st.c, cam = st.cam, F = WTR.FLOOR, xa = cam.x - 40, xb = cam.x + W + 40;
  const main = x => wtrMainY(st, x);
  // where the main line is missing: after a low dead end (the high line goes round), and over the gaps
  const cuts = [];
  for (const sw of c.switches) if (sw.dead === 'low') cuts.push([sw.xd + 40, sw.x1 - 6]);
  for (const [a, b] of c.gaps) cuts.push([a, b]);
  // raised main line (books)
  let run0 = null;
  for (let x = Math.floor(xa / 8) * 8; x <= xb + 8; x += 8) {
    const up = main(x) < F - 4;
    if (up && run0 === null) run0 = x;
    if ((!up || x > xb) && run0 !== null) { wtrDrawSupports(st, main, run0 - 8, x, true); run0 = null; }
  }
  // decks of the switches (behind the low line)
  for (const sw of c.switches) {
    if (sw.x1 < xa || sw.x0 > xb) continue;
    const ys = x => wtrArr(sw.up, sw.x0, x), end = sw.dead === 'up' ? sw.xd : sw.x1;
    wtrDrawSupports(st, ys, sw.x0 + 30, end, false);
    wtrDrawRail(ys, Math.max(sw.x0, xa), Math.min(end, xb));
    if (sw.dead === 'up') {
      // the broken end: a jagged edge, a dangling piece and a little cone
      const y = ys(sw.xd);
      ctx.fillStyle = '#e8bf86'; ctx.beginPath(); ctx.moveTo(sw.xd, y); ctx.lineTo(sw.xd + 8, y + 3); ctx.lineTo(sw.xd + 3, y + 6); ctx.lineTo(sw.xd + 9, y + 10); ctx.lineTo(sw.xd, y + 10); ctx.fill();
      ctx.save(); ctx.translate(sw.xd + 18, y + 8); ctx.rotate(1.1); ctx.fillStyle = '#e8bf86'; ctx.fillRect(0, -4, 46, 9); ctx.fillStyle = '#9c6a3a'; ctx.fillRect(0, 4, 46, 2); ctx.restore();
      ctx.fillStyle = '#ff8a3a'; ctx.beginPath(); ctx.moveTo(sw.xd - 24, y); ctx.lineTo(sw.xd - 14, y - 26); ctx.lineTo(sw.xd - 4, y); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(sw.xd - 19, y - 14, 10, 4);
    }
    // the bonus way glitters
    if (sw.bonus === 'up' && !sw.taken) { ctx.fillStyle = 'rgba(255,214,90,' + (0.25 + 0.2 * Math.sin(G.clock * 4)) + ')'; ctx.fillRect(sw.x0 + WTR.rampW, ys(sw.x0 + WTR.rampW) - 6, sw.x1 - sw.x0 - 2 * WTR.rampW, 4); }
  }
  // the main (low) line, in pieces between the cuts
  let a = xa;
  const cs = cuts.filter(([p, q]) => q > xa && p < xb).sort((p, q) => p[0] - q[0]);
  for (const [p, q] of cs) { wtrDrawRail(main, a, Math.min(p, xb)); a = Math.max(a, q); }
  wtrDrawRail(main, a, xb);
  // the low dead end: a wall of blocks across the line
  for (const sw of c.switches) if (sw.dead === 'low' && sw.xd > xa - 80 && sw.xd < xb) {
    const y = F - sw.base;
    wtrABC(sw.xd, y - 34, 34, 0, 'S'); wtrABC(sw.xd, y - 68, 34, 2, 'T'); wtrABC(sw.xd + 6, y - 34 + 0, 0.01, 1, '');
    ctx.fillStyle = '#e8574a'; ctx.fillRect(sw.xd - 6, y - 82, 46, 12); ctx.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) ctx.fillRect(sw.xd - 2 + i * 15, y - 82, 7, 12);
  }
}
function wtrDrawLever(st, sw) {
  const x = sw.lever.x, y = sw.lever.y, t = G.clock, up = sw.set === 'up';
  const tilt = (up ? 0.5 : -0.5) * (1 - Math.max(0, sw.flipT) / 0.3 * 0.8);
  // box and stick
  ctx.fillStyle = '#8e5a2e'; rr(x - 14, y - 14, 28, 14, 3); ctx.fill();
  ctx.save(); ctx.translate(x, y - 12); ctx.rotate(tilt);
  ctx.strokeStyle = '#5a6a80'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -30); ctx.stroke();
  ctx.fillStyle = '#e8574a'; circle(0, -32, 6); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(-2, -34, 2); ctx.fill();
  ctx.restore();
  // the round sign on its post: which way the track goes
  ctx.fillStyle = '#8e5a2e'; ctx.fillRect(x + 18, y - 76, 4, 76);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = sw.taken ? '#9aa' : '#2a2f4f'; ctx.lineWidth = 3; circle(x + 20, y - 86, 15); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.translate(x + 20, y - 86); ctx.rotate(up ? -0.75 : 0);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(7, 0); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(3, -6); ctx.lineTo(3, 6); ctx.fill();
  ctx.restore();
  if (sw.taken) { ctx.fillStyle = '#9aa8c0'; rr(x + 14, y - 72, 12, 9, 2); ctx.fill(); }
  // gold arrows: the good way
  if (st.goldArrows && !sw.taken) {
    const goodUp = sw.dead ? sw.dead === 'low' : sw.bonus === 'up';
    const bob = Math.sin(t * 5) * 4;
    ctx.save(); ctx.translate(x + 20, y - 128 + bob); ctx.rotate(goodUp ? -0.75 : 0);
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(4, -6); ctx.lineTo(4, -14); ctx.lineTo(20, 0); ctx.lineTo(4, 14); ctx.lineTo(4, 6); ctx.lineTo(-16, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,197,61,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); circle(x, y - 20, WTR.goldReach); ctx.stroke(); ctx.setLineDash([]);
  }
}
function wtrDrawBridge(st, br) {
  const y = br.y, a = br.ang, L = br.gx1 - br.gx0 + 12;
  // the book: hinged at the far edge, standing up until lowered
  ctx.save(); ctx.translate(br.gx1 + 4, y);
  ctx.rotate(Math.PI / 2 * (1 - a));
  ctx.fillStyle = '#3c6aa8'; rr(-L, -14, L, 16, 3); ctx.fill();
  ctx.fillStyle = '#fffaf0'; ctx.fillRect(-L + 4, -12, L - 8, 4);
  ctx.fillStyle = C.gold; ctx.fillRect(-L * 0.5 - 4, -14, 8, 16);
  ctx.restore();
  if (a > 0.98) wtrDrawRail(() => y - 2, br.gx0 - 4, br.gx1 + 4);
  // the gold ruler for walking across
  if (br.gold && !br.down) { ctx.fillStyle = C.gold; rr(br.gx0 - 6, y - 4, br.gx1 - br.gx0 + 12, 8, 2); ctx.fill(); ctx.fillStyle = C.goldDark; for (let x = br.gx0; x < br.gx1; x += 12) ctx.fillRect(x, y - 4, 1.5, 4); }
  // the bookmark lever on the far side
  const lx = br.lever.x, pulled = br.down;
  ctx.fillStyle = '#8e5a2e'; ctx.fillRect(lx - 3, y - 70, 6, 70);
  ctx.fillStyle = '#ff6b8a'; ctx.beginPath(); ctx.moveTo(lx, y - 70); ctx.lineTo(lx + 16, y - 70 + (pulled ? 50 : 10)); ctx.lineTo(lx + 8, y - 70 + (pulled ? 56 : 18)); ctx.lineTo(lx - 2, y - 66); ctx.fill();
  ctx.fillStyle = C.gold; circle(lx, y - 72, 5); ctx.fill();
}
function wtrDrawBlock(st, b) {
  const y = wtrMainY(st, b.x), t = b.fly;
  if (b.gone && t > 1.6) return;
  ctx.save();
  if (b.gone) ctx.globalAlpha = clamp(1.6 - t, 0, 1);
  if (b.kind === 'dom') {
    for (let i = 0; i < 5; i++) {
      const dx = b.x + 8 + i * 22, fall = b.gone ? clamp((t - i * 0.09) / 0.22, 0, 1) : 0;
      ctx.save(); ctx.translate(dx + 10, y); ctx.rotate(fall * 1.45); ctx.translate(fall * 30 * (i === 4 ? 1 : 0), fall * (t > 0.7 ? (t - 0.7) * 200 : 0));
      ctx.fillStyle = b.gold ? C.gold : '#fffaf0'; ctx.strokeStyle = '#2a2f4f'; ctx.lineWidth = 2; rr(-10, -44, 12, 44, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a2f4f'; ctx.fillRect(-10, -23, 12, 2); circle(-4, -33, 2); ctx.fill(); circle(-4, -12, 2); ctx.fill();
      ctx.restore();
    }
  } else if (b.kind === 'bunny') {
    const k = b.gone ? t : 0;
    wtrDrawBunny(b.x + 17 + k * 160, y - k * 120 + k * k * 260, false, 1, G.clock * 2 + b.id, b.gold);
  } else {
    const k = b.gone ? t : 0, x = b.x + (b.rolled ? k * 260 : k * 140), yy = y - 34 - (b.rolled ? 0 : k * 160 - k * k * 300);
    ctx.save(); ctx.translate(x + 17, yy + 17); ctx.rotate(k * (b.rolled ? 7 : 5));
    wtrABC(-17, -17, 34, b.col, String.fromCharCode(65 + b.id % 26));
    if (b.gold) { ctx.fillStyle = 'rgba(255,197,61,0.55)'; rr(-17, -17, 34, 34, 4); ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 3; rr(-17, -17, 34, 34, 4); ctx.stroke(); }
    ctx.restore();
  }
  ctx.restore();
}
function wtrDrawBunny(x, y, sleepy, dir, t, gold) {
  ctx.fillStyle = gold ? C.gold : '#d8d0e8';
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; circle(x + Math.cos(a) * 12, y - 14 + Math.sin(a) * 10, 7); ctx.fill(); }
  circle(x, y - 14, 12); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - 6, y - 30, 4, 9, -0.25, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 6, y - 30, 4, 9, 0.25, 0, Math.PI * 2); ctx.fill();
  if (sleepy) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; for (const ex of [-4, 4]) { ctx.beginPath(); ctx.arc(x + ex + dir * 2, y - 16, 2.4, 0, Math.PI); ctx.stroke(); }
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(x - 10, y - 26); ctx.lineTo(x + 12, y - 26); ctx.lineTo(x + 18, y - 44); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffffff'; circle(x + 18, y - 44, 3); ctx.fill();
    text('z', x + 18 + Math.sin(t * 2) * 3, y - 54 - (t * 10 % 10), 11, '#ffffff', 'center', 'body');
  } else {
    ctx.fillStyle = C.ink; circle(x - 4 + dir * 2, y - 16, 2.2); ctx.fill(); circle(x + 4 + dir * 2, y - 16, 2.2); ctx.fill();
    ctx.fillStyle = '#ff9fb5'; circle(x + dir * 2, y - 11, 1.8); ctx.fill();
  }
}
function wtrDrawHazard(st, hz) {
  const q = wtrHzPos(st, hz, 0), F = hz.y;
  if (hz.kind === 'ball') {
    const sq = q.y + q.r > F - 26 ? 1 - (q.y + q.r - (F - 26)) / 60 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(q.x, F + 4, 20 * (1.2 - (F - q.y) / 400), 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(q.x, q.y); ctx.scale(2 - sq, sq);
    ctx.fillStyle = hz.gold ? C.gold : '#ff6b8a'; circle(0, 0, q.r); ctx.fill();
    ctx.fillStyle = hz.gold ? '#fff2c0' : '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, q.r, q.r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hz.gold ? C.goldDark : '#5b95ff'; circle(0, 0, 5); ctx.fill();
    ctx.restore();
    if (hz.gold) text('z', q.x + 20, q.y - 26, 12, '#ffffff', 'center', 'body');
  } else if (hz.kind === 'yoyo') {
    ctx.strokeStyle = '#f6efdf'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.x, 80); ctx.lineTo(q.x, q.y); ctx.stroke();
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(st.roomT * 9);
    ctx.fillStyle = hz.gold ? C.gold : '#5cc27f'; circle(0, 0, q.r); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-q.r + 4, 0); ctx.lineTo(q.r - 4, 0); ctx.stroke();
    ctx.fillStyle = '#ffffff'; circle(0, 0, 4); ctx.fill();
    ctx.restore();
  } else {
    // the metronome on the shelf above: a long arm swinging over the track
    ctx.fillStyle = hz.gold ? '#e8c060' : '#8e5a2e'; ctx.beginPath(); ctx.moveTo(q.px - 34, 104); ctx.lineTo(q.px + 34, 104); ctx.lineTo(q.px + 16, 60); ctx.lineTo(q.px - 16, 60); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a6a80'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(q.px, q.py); ctx.lineTo(q.x, q.y); ctx.stroke();
    ctx.fillStyle = hz.gold ? C.gold : '#ffd23f'; ctx.strokeStyle = hz.gold ? C.goldDark : '#b8901a'; ctx.lineWidth = 3; rr(q.x - 18, q.y - 14, 36, 28, 6); ctx.fill(); ctx.stroke();
  }
  // a little warning shadow on the rail when it is about to come down
  if (!hz.gold && q.block) { ctx.fillStyle = 'rgba(232,87,74,0.35)'; rr(hz.x - 30, F - 4, 50, 8, 4); ctx.fill(); }
}
function wtrDrawStars(st) {
  const cam = st.cam, t = G.clock;
  for (const s of st.c.stars) {
    if (s.x < cam.x - 30 || s.x > cam.x + W + 30) continue;
    if (s.got) { if (s.t < 0.5) { ctx.globalAlpha = 1 - s.t / 0.5; ctx.fillStyle = C.gold; wtrStarPath(s.x, s.y - s.t * 50, 12 + s.t * 10, 5, s.t * 6); ctx.fill(); ctx.globalAlpha = 1; } continue; }
    const bob = Math.sin(t * 3 + s.x * 0.05) * 3;
    ctx.fillStyle = C.gold; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    wtrStarPath(s.x, s.y + bob, 12, 5.2, Math.sin(t * 2 + s.x) * 0.2); ctx.fill(); ctx.stroke();
  }
}
// a toy passenger standing (or sitting) with feet at x, y
function wtrDrawPassenger(name, x, y, s, t, wave) {
  const col = WTR_PASS[name] || '#b07a4a';
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (name === 'Duck') {
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, -10, 13, 10, 0, 0, Math.PI * 2); ctx.fill(); circle(6, -24, 8); ctx.fill();
    ctx.fillStyle = '#ff8a3a'; ctx.beginPath(); ctx.moveTo(12, -25); ctx.lineTo(21, -22); ctx.lineTo(12, -19); ctx.fill();
    ctx.fillStyle = C.ink; circle(8, -26, 1.8); ctx.fill();
  } else if (name === 'Robot') {
    ctx.fillStyle = col; rr(-10, -22, 20, 20, 3); ctx.fill(); rr(-8, -36, 16, 13, 3); ctx.fill();
    ctx.fillStyle = '#9fe8ff'; ctx.fillRect(-5, -32, 3, 3); ctx.fillRect(2, -32, 3, 3);
    ctx.strokeStyle = '#5a6a80'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, -42); ctx.stroke(); ctx.fillStyle = '#e8574a'; circle(0, -43, 2.5); ctx.fill();
    ctx.fillStyle = '#e8574a'; circle(0, -12, 3); ctx.fill();
  } else {
    // a teddy or a bunny: round body, round head, ears
    ctx.fillStyle = col; rr(-10, -20, 20, 20, 8); ctx.fill(); circle(0, -28, 10); ctx.fill();
    if (name === 'Bunny') { ctx.beginPath(); ctx.ellipse(-4, -42, 3.5, 9, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(4, -42, 3.5, 9, 0.2, 0, Math.PI * 2); ctx.fill(); }
    else { circle(-8, -36, 4); ctx.fill(); circle(8, -36, 4); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; circle(0, -25, 4.5); ctx.fill();
    ctx.fillStyle = C.ink; circle(-3.5, -30, 1.6); ctx.fill(); circle(3.5, -30, 1.6); ctx.fill(); circle(0, -26, 1.4); ctx.fill();
  }
  if (wave) { ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round'; const a = -1.2 + Math.sin(t * 9) * 0.5; ctx.beginPath(); ctx.moveTo(8, -16); ctx.lineTo(8 + Math.cos(a) * 12, -16 + Math.sin(a) * 12); ctx.stroke(); }
  ctx.restore();
}
function wtrDrawStation(st, p) {
  const F = WTR.FLOOR, t = G.clock;
  // a toy platform with a little roof
  ctx.fillStyle = '#f6efdf'; rr(p.x0, F - 6, p.x1 - p.x0, 10, 3); ctx.fill();
  ctx.fillStyle = '#e8574a'; for (let x = p.x0; x < p.x1; x += 24) ctx.fillRect(x, F - 6, 12, 3);
  ctx.fillStyle = '#8e5a2e'; ctx.fillRect(p.px - 58, F - 150, 6, 146); ctx.fillRect(p.px + 52, F - 150, 6, 146);
  ctx.fillStyle = '#5b95ff'; ctx.beginPath(); ctx.moveTo(p.px - 76, F - 148); ctx.lineTo(p.px + 76, F - 148); ctx.lineTo(p.px + 60, F - 172); ctx.lineTo(p.px - 60, F - 172); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff'; rr(p.px - 46, F - 140, 92, 22, 6); ctx.fill();
  text(p.name + ' Stop', p.px, F - 128.5, 13, C.ink, 'center', 'body');
  if (p.state === 'wait') {
    const ready = wtrReady(st, 'pass', p);
    wtrDrawPassenger(p.name, p.px, F - 6 - (ready ? Math.abs(Math.sin(t * 8)) * 6 : 0), 1, t, ready);
    if (st.state === 'go' && st.tr.x > p.x0 - 700) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6); text('!', p.px, F - 74, 20, C.gold, 'center'); ctx.globalAlpha = 1; }
  } else if (p.state === 'missed') wtrDrawPassenger(p.name, p.px, F - 6, 1, t, true);
}
function wtrDrawSock(st, k, front) {
  const y = k.y, h = 96, w = k.x1 - k.x0, cx = (k.x0 + k.x1) / 2;
  if (!front) {
    ctx.fillStyle = '#3a2c5a'; ctx.beginPath(); ctx.ellipse(cx, y - h / 2 + 2, w / 2 - 4, h / 2 - 6, 0, 0, Math.PI * 2); ctx.fill();
    return;
  }
  ctx.save();
  ctx.beginPath(); ctx.moveTo(k.x0 + 26, y); ctx.lineTo(k.x0 + 26, y - h + 30); ctx.quadraticCurveTo(k.x0 + 26, y - h, k.x0 + 60, y - h); ctx.lineTo(k.x1 - 60, y - h); ctx.quadraticCurveTo(k.x1 - 10, y - h, k.x1 - 10, y - h + 34); ctx.lineTo(k.x1 - 10, y); ctx.closePath();
  ctx.clip();
  ctx.fillStyle = '#ff9fb5'; ctx.fillRect(k.x0, y - h - 4, w, h + 8);
  ctx.fillStyle = '#ffffff'; for (let x = k.x0 + 30; x < k.x1; x += 44) ctx.fillRect(x, y - h, 18, h);
  ctx.fillStyle = '#e8574a'; ctx.fillRect(k.x1 - 70, y - h, 60, h);
  ctx.restore();
  // the open ends (the train goes in and out of them)
  ctx.fillStyle = '#ffd2dd'; ctx.beginPath(); ctx.ellipse(k.x0 + 26, y - h / 2 + 4, 10, h / 2 - 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a2c5a'; ctx.beginPath(); ctx.ellipse(k.x0 + 28, y - h / 2 + 6, 6, h / 2 - 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(k.x0 + 60, y - h + 10); ctx.lineTo(k.x1 - 60, y - h + 10); ctx.stroke();
}
function wtrDrawEndBack(st, e) {
  const F = e.y;
  if (e.box) return;
  // a toy station house with a clock
  const hx = e.x0 + 70;
  ctx.fillStyle = '#ffe7a8'; rr(hx, F - 150, 170, 150, 6); ctx.fill();
  ctx.fillStyle = '#e8574a'; ctx.beginPath(); ctx.moveTo(hx - 16, F - 146); ctx.lineTo(hx + 186, F - 146); ctx.lineTo(hx + 85, F - 210); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(hx + 85, F - 168, 15); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx + 85, F - 168); ctx.lineTo(hx + 85, F - 178); ctx.moveTo(hx + 85, F - 168); ctx.lineTo(hx + 93, F - 168); ctx.stroke();
  ctx.fillStyle = '#5b95ff'; rr(hx + 20, F - 120, 40, 40, 4); ctx.fill(); rr(hx + 110, F - 120, 40, 40, 4); ctx.fill();
  ctx.fillStyle = '#8e5a2e'; rr(hx + 68, F - 74, 34, 74, 4); ctx.fill();
  ctx.fillStyle = '#ffffff'; rr(hx + 25, F - 142, 120, 18, 5); ctx.fill(); text('STATION', hx + 85, F - 132.5, 12, C.ink, 'center', 'body');
  ctx.fillStyle = '#f6efdf'; rr(e.x0, F - 6, e.x1 - e.x0 + 40, 10, 3); ctx.fill();
}
function wtrDrawEndFront(st, e) {
  const F = e.y, t = G.clock;
  // the buffer stop
  const bx = e.buffer + 6;
  ctx.fillStyle = '#8e5a2e'; ctx.fillRect(bx, F - 30, 12, 30);
  ctx.fillStyle = '#e8574a'; rr(bx - 4, F - 44, 22, 16, 3); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + 3, F - 44, 6, 16);
  // the bell on its post
  const bl = e.bell.x, ring = e.rung ? Math.sin((e.ringT || 0) * 30) * Math.max(0, 1 - (e.ringT || 0) / 1.5) * 0.5 : 0;
  ctx.fillStyle = '#8e5a2e'; ctx.fillRect(bl - 3, F - 120, 6, 120); ctx.fillRect(bl - 3, F - 120, 28, 5);
  ctx.save(); ctx.translate(bl + 22, F - 116); ctx.rotate(ring);
  ctx.fillStyle = e.gold ? C.gold : '#f2c14e'; ctx.strokeStyle = '#b8901a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-10, 22); ctx.quadraticCurveTo(-10, 2, 0, 2); ctx.quadraticCurveTo(10, 2, 10, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#b8901a'; circle(0, 24, 3); ctx.fill();
  ctx.restore();
  if (e.gold && !e.rung) { ctx.strokeStyle = 'rgba(255,197,61,' + (0.5 + 0.3 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 3; circle(bl + 22, F - 104, 22 + Math.sin(t * 6) * 3); ctx.stroke(); }
  // the zone: where to stop
  if (!e.rung && st.state === 'go') { ctx.fillStyle = 'rgba(255,197,61,' + (0.35 + 0.15 * Math.sin(t * 4)) + ')'; ctx.fillRect(e.x0, F + 12, e.buffer - e.x0, 6); text('STOP HERE', (e.x0 + e.buffer) / 2, F + 30, 13, C.gold, 'center', 'body'); }
  if (e.box) wtrDrawToyBox(st, e);
}
function wtrDrawToyBox(st, e) {
  const x = e.buffer + 50, F = e.y, d = st.dock, open = d && d.last ? clamp((d.t - 0.4) / 0.8, 0, 1) : 0;
  ctx.fillStyle = '#c98a52'; rr(x, F - 150, 230, 150, 8); ctx.fill();
  ctx.fillStyle = '#dca06a'; ctx.fillRect(x + 8, F - 120, 214, 10); ctx.fillRect(x + 8, F - 60, 214, 10);
  ctx.fillStyle = '#e8574a'; wtrStarPath(x + 115, F - 85, 26, 11, 0); ctx.fill();
  ctx.fillStyle = '#ffffff'; rr(x + 50, F - 30, 130, 22, 6); ctx.fill(); text('TOY BOX', x + 115, F - 18.5, 14, C.ink, 'center', 'body');
  ctx.save(); ctx.translate(x, F - 150); ctx.rotate(-open * 1.3);
  ctx.fillStyle = '#ae7444'; rr(-6, -30, 242, 34, 8); ctx.fill(); ctx.fillStyle = '#c98a52'; rr(2, -24, 226, 8, 4); ctx.fill(); ctx.fillStyle = C.gold; ctx.fillRect(108, -30, 20, 34);
  ctx.restore();
  if (open > 0.3) {
    // toys peek out
    ctx.fillStyle = '#5b95ff'; circle(x + 60, F - 156, 16); ctx.fill();
    ctx.fillStyle = '#5cc27f'; rr(x + 120, F - 176, 30, 30, 4); ctx.fill();
    ctx.fillStyle = '#ffd23f'; circle(x + 180, F - 158, 14); ctx.fill();
    let i = 0;
    for (const q of st.passengers) { const u = clamp((d.t - 1.2 - i * 0.25) / 0.6, 0, 1); wtrDrawPassenger(q.name, wtrLerp(st.tr.x - 168, x + 50 + i * 44, u), wtrLerp(F - 30, F - 150, u) - Math.sin(u * Math.PI) * 80, 1, G.clock, u >= 1); i++; }
  }
}
// the train: a green wind-up engine with a big brass key, a red open wagon and a yellow caboose
function wtrDrawTrain(st) {
  const tr = st.tr, S = WTR, t = G.clock;
  const wob = tr.wob > 0 ? Math.sin(t * 30) * 0.04 * tr.wob : 0;
  // soft shadows on the floor (or on the high track) under each car
  for (let k = 2; k >= 0; k--) { const car = S.cars[k], cx = tr.x - car.off, ry = wtrRailY(st, cx); ctx.fillStyle = 'rgba(30,20,50,0.18)'; ctx.beginPath(); ctx.ellipse(cx, ry + 3, car.half + 6, 5, 0, 0, Math.PI * 2); ctx.fill(); }
  for (let k = 2; k >= 0; k--) {
    const car = S.cars[k], cx = tr.x - car.off, ry = wtrRailY(st, cx);
    const a = Math.atan2(wtrRailY(st, cx + car.half * 0.8) - wtrRailY(st, cx - car.half * 0.8), car.half * 1.6);
    // coupling to the car in front
    if (k > 0) { const f = S.cars[k - 1], fx = tr.x - f.off - f.half, bx = cx + car.half; ctx.strokeStyle = '#3a3a4a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx - 2, wtrRailY(st, bx) - 18); ctx.lineTo(fx + 2, wtrRailY(st, fx) - 18); ctx.stroke(); }
    ctx.save(); ctx.translate(cx, ry); ctx.rotate(a + wob);
    // wheels
    const wh = k === 0 ? [-40, -10, 26] : [-26, 26];
    for (const wx of wh) {
      const r = k === 0 && wx === 26 ? 9 : 11;
      ctx.fillStyle = '#2a2f4f'; circle(wx, -r + 1, r); ctx.fill();
      ctx.fillStyle = '#f6c84a'; circle(wx, -r + 1, r * 0.45); ctx.fill();
      ctx.strokeStyle = '#f6c84a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx + Math.cos(tr.wheel) * r * 0.8, -r + 1 + Math.sin(tr.wheel) * r * 0.8); ctx.lineTo(wx - Math.cos(tr.wheel) * r * 0.8, -r + 1 - Math.sin(tr.wheel) * r * 0.8); ctx.stroke();
    }
    if (k === 0) {
      // connecting rod
      ctx.strokeStyle = '#c8d4e4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-40 + Math.cos(tr.wheel) * 6, -10 + Math.sin(tr.wheel) * 6); ctx.lineTo(-10 + Math.cos(tr.wheel) * 6, -10 + Math.sin(tr.wheel) * 6); ctx.stroke();
      // chassis, boiler, cab
      ctx.fillStyle = '#2a2f4f'; rr(-58, -22, 116, 8, 3); ctx.fill();
      ctx.fillStyle = '#4cb36a'; ctx.strokeStyle = '#2e7a46'; ctx.lineWidth = 3;
      rr(-14, -50, 68, 32, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8574a'; for (const bx of [4, 26]) ctx.fillRect(bx, -50, 6, 32);
      ctx.fillStyle = '#4cb36a'; rr(-58, -72, 46, 54, 5); ctx.fill(); ctx.strokeStyle = '#2e7a46'; rr(-58, -72, 46, 54, 5); ctx.stroke();
      ctx.fillStyle = '#e8574a'; rr(-62, -78, 54, 9, 4); ctx.fill();
      ctx.fillStyle = '#d6f0ff'; rr(-48, -64, 26, 20, 4); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-45, -61, 6, 14);
      // chimney and dome
      ctx.fillStyle = '#2a2f4f'; rr(30, -74, 12, 26, 3); ctx.fill(); rr(26, -80, 20, 8, 3); ctx.fill();
      ctx.fillStyle = '#f2c14e'; circle(14, -51, 7); ctx.fill();
      // a friendly face on the front
      ctx.fillStyle = '#fffaf0'; circle(47, -36, 7); ctx.fill(); ctx.fillStyle = C.ink; circle(49, -36, 3.2); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(46, -27, 5, 0.2, Math.PI * 0.8); ctx.stroke();
      ctx.fillStyle = 'rgba(255,120,140,0.5)'; circle(40, -28, 3); ctx.fill();
      // cowcatcher and headlamp
      ctx.fillStyle = '#e8574a'; ctx.beginPath(); ctx.moveTo(52, -18); ctx.lineTo(60, -18); ctx.lineTo(62, -4); ctx.lineTo(50, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff6c0'; circle(56, -52, 4.5); ctx.fill();
      // the big brass key on the boiler
      const ka = tr.keyA, bw = Math.abs(Math.cos(ka)) * 15 + 2;
      ctx.fillStyle = '#b8901a'; ctx.fillRect(6, -66, 6, 18);
      ctx.fillStyle = st.goldKey ? '#ffe27a' : '#f2c14e'; ctx.strokeStyle = '#b8901a'; ctx.lineWidth = 2.5;
      for (const sg of [-1, 1]) { ctx.beginPath(); ctx.ellipse(9 + sg * bw * 0.55, -76, bw * 0.55, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      if (st.goldKey) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.4 + 0.3 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 2; circle(9, -76, 18); ctx.stroke(); }
    } else if (k === 1) {
      ctx.fillStyle = '#2a2f4f'; rr(-44, -20, 88, 6, 3); ctx.fill();
      ctx.fillStyle = '#e8574a'; ctx.strokeStyle = '#a33328'; ctx.lineWidth = 3; rr(-42, -40, 84, 24, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; for (let i = -34; i < 40; i += 17) ctx.fillRect(i, -36, 9, 16);
    } else {
      ctx.fillStyle = '#2a2f4f'; rr(-44, -20, 88, 6, 3); ctx.fill();
      ctx.fillStyle = '#f6c84a'; ctx.strokeStyle = '#b8901a'; ctx.lineWidth = 3; rr(-40, -50, 80, 34, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8574a'; rr(-46, -56, 92, 9, 4); ctx.fill(); rr(-14, -66, 28, 12, 3); ctx.fill();
      ctx.fillStyle = '#d6f0ff'; for (const wx of [-28, 8]) { rr(wx, -44, 20, 16, 3); ctx.fill(); }
    }
    ctx.restore();
    // passengers riding in this car
    if (k > 0) {
      if (!(st.dock && st.dock.last && st.dock.t > 1.2)) for (const q of st.passengers) if (q.car === k) {
        const px = cx - 24 + q.slot * 22 + (k === 2 ? 4 : 0), py = wtrRailY(st, px) - (k === 1 ? 26 : 30);
        if (k === 1) wtrDrawPassenger(q.name, px, py, 0.8, t, false);
        else { ctx.save(); ctx.beginPath(); ctx.rect(cx - 40, wtrRailY(st, cx) - 46, 80, 18); ctx.clip(); wtrDrawPassenger(q.name, px, py + 10, 0.8, t, false); ctx.restore(); }
      }
      if (k === 1) { ctx.save(); ctx.translate(cx, ry); ctx.rotate(a); ctx.fillStyle = '#e8574a'; ctx.strokeStyle = '#a33328'; ctx.lineWidth = 3; rr(-42, -28, 84, 12, 3); ctx.fill(); ctx.stroke(); ctx.restore(); }
    }
  }
  // the beat ring round the key: grey, then gold (wind now!), then waiting
  if (st.state === 'go') {
    const kx = tr.x - S.cars[0].off + 9, ky = wtrRailY(st, tr.x - S.cars[0].off) - 76, since = st.roomT - tr.lastPress;
    const u = clamp(since / S.beatMax, 0, 1), inWin = since >= S.beatMin && since <= S.beatMax;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; circle(kx, ky, 22); ctx.stroke();
    if (since < 1.2) {
      ctx.strokeStyle = inWin ? C.gold : since > S.beatMax ? 'rgba(255,255,255,0.8)' : 'rgba(170,180,200,0.9)'; ctx.lineWidth = inWin ? 6 : 4;
      ctx.beginPath(); ctx.arc(kx, ky, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * u); ctx.stroke();
      // the gold window marked on the ring
      ctx.strokeStyle = 'rgba(255,197,61,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(kx, ky, 27, -Math.PI / 2 + Math.PI * 2 * S.beatMin / S.beatMax, Math.PI * 1.5); ctx.stroke();
    }
    if (tr.sproing > 0) text('!', kx + 26, ky - 18, 18, '#ffe7a8', 'center');
  }
}

/* ---------- drawing: in front of the players ---------- */
let wtrDimCanvas = null;
function wtrDrawFront(st) {
  const cam = st.cam;
  ctx.save(); ctx.translate(-Math.round(cam.x * 10) / 10, 0);
  for (const k of st.c.socks) if (k.x1 > cam.x - 40 && k.x0 < cam.x + W + 40) wtrDrawSock(st, k, true);
  for (const q of st.parts) {
    if (q.x < cam.x - 40 || q.x > cam.x + W + 40) continue;
    const a = clamp(q.life / q.max, 0, 1);
    ctx.globalAlpha = a; ctx.fillStyle = q.col;
    if (q.kind === 'star') { wtrStarPath(q.x, q.y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
    else if (q.kind === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
    else { circle(q.x, q.y, q.size * (q.kind === 'puff' ? 1 : 0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  if (st.look === 'bed') wtrDrawDim(st);
  const big = hudBig();
  for (const q of st.pops) {
    const x = clamp(q.x - cam.x, 110, W - 110), y = clamp(q.y - q.t * 30, 96, H - 120);
    ctx.globalAlpha = clamp((1.4 - q.t) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.3 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
    ctx.globalAlpha = 1;
  }
}
// under the bed it is dim: a soft dark overlay with light round the headlamp, the players and the night light
function wtrDrawDim(st) {
  try {
    if (!wtrDimCanvas) { wtrDimCanvas = document.createElement('canvas'); wtrDimCanvas.width = W; wtrDimCanvas.height = H; }
    const d = wtrDimCanvas.getContext('2d'), cam = st.cam, tr = st.tr;
    d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H);
    d.fillStyle = 'rgba(12,8,36,0.5)'; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => { const g = d.createRadialGradient(x, y, r * 0.2, x, y, r); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(x - r, y - r, r * 2, r * 2); };
    const ry = wtrRailY(st, tr.x);
    hole(tr.x - cam.x + 150, ry - 40, 190, 0.85);
    hole(tr.x - cam.x - 120, ry - 60, 170, 0.7);
    for (const p of G.players) hole(p.x + PW / 2, p.y + PH / 2, 90, 0.8);
    d.globalCompositeOperation = 'source-over';
    ctx.drawImage(wtrDimCanvas, 0, 0, W, H);
    // the headlamp beam
    const g = ctx.createLinearGradient(tr.x - cam.x, 0, tr.x - cam.x + 300, 0);
    g.addColorStop(0, 'rgba(255,246,190,0.3)'); g.addColorStop(1, 'rgba(255,246,190,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(tr.x - cam.x - 2, ry - 52); ctx.lineTo(tr.x - cam.x + 320, ry - 120); ctx.lineTo(tr.x - cam.x + 320, ry + 10); ctx.closePath(); ctx.fill();
  } catch (e) { /* no dim */ }
}

/* ---------- the HUD: clock and stars, the two job panels, prompts ---------- */
function wtrHud(st) {
  const big = hudBig(), z = big ? 1.35 : 1, ps = G.players, play = G.mode === 'play' || G.mode === 'paused', t = G.clock;
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = st.stars + ' / ' + st.starsAll;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.3, gap = fs;
    const w = tw + gap + icon + fs * 0.4 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
    ctx.fillStyle = C.gold; wtrStarPath(x0 + 15 + tw + gap + icon / 2, cy, fs * 0.62, fs * 0.27, 0); ctx.fill();
    text(n, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, '#ffffff', 'left', 'body');
    timeX0 = x0;
  }
  if (!play) return;
  const pl = wtrPlan(st), tr = st.tr, s = st.sw;
  const since = st.roomT - tr.lastPress, inWin = since >= WTR.beatMin && since <= WTR.beatMax;
  const windLit = !pl.brake && tr.spring < 0.9 && tr.sproing <= 0 && (inWin || since > WTR.beatMax);
  const runFar = pl.rx != null && Math.abs(pl.rx - s.x) > 60;
  for (const id of [0, 1]) {
    const pw = Math.round(236 * z), ph = Math.round(58 * z), py = H - ph - 10, px = id === 0 ? 12 : W - 12 - pw;
    // (it fades while the switcher is right behind it)
    const sx = s.x - st.cam.x, fade = sx > px - 20 && sx < px + pw + 20 && s.feet > py - 10 ? 0.4 : 1;
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(40,28,60,0.84)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const quiet = wtrQuiet(id), isW = id === st.wind;
    text(NAMES[id] + (isW ? ' · winder' : ' · switcher') + (quiet ? ' (computer)' : ''), px + 12 * z, py + 14 * z, 13 * z, PCOL[id], 'left');
    if (isW) {
      // the spring meter
      const bx = px + pw - 92 * z, bw = 80 * z, by = py + 9 * z, bh = 10 * z;
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(bx, by, bw, bh, bh / 2); ctx.fill();
      const f = tr.spring;
      ctx.fillStyle = st.goldKey ? C.gold : f < 0.15 ? '#ff8a6a' : f > 0.95 ? '#ffe7a8' : '#8fe3b0';
      if (f > 0.01) { rr(bx, by, Math.max(bh, bw * f), bh, bh / 2); ctx.fill(); }
      if (f <= 0.01 && Math.sin(t * 8) > 0) { ctx.strokeStyle = '#ff8a6a'; ctx.lineWidth = 2; rr(bx, by, bw, bh, bh / 2); ctx.stroke(); }
    }
    const chips = isW ? [['act', 'WIND', windLit, since < 0.15], ['down', 'BRAKE', pl.brake && !tr.brake, tr.brake]]
      : [['run', 'RUN', runFar && !pl.act, Math.abs(s.vx) > 30], ['act', pl.job ? pl.label : 'SWITCH', !!pl.act, s.actT > 0]];
    const n = chips.length, cw = (pw - 24 * z - (n - 1) * 6 * z) / n;
    chips.forEach(([k, lab, lit, held], i) => {
      const cx = px + 12 * z + i * (cw + 6 * z), cy = py + 27 * z, chh = 23 * z;
      ctx.fillStyle = lit ? (Math.sin(t * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : held ? 'rgba(143,227,176,0.85)' : 'rgba(255,255,255,0.12)';
      rr(cx, cy, cw, chh, chh / 2); ctx.fill();
      const kk = quiet ? '' : wtrKey(id, k);
      let fs = 12 * z;
      const str = (kk ? kk + ' ' : '') + lab;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      while (fs > 8 && ctx.measureText(str).width > cw - 8) { fs -= 0.5; ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; }
      text(str, cx + cw / 2, cy + chh / 2 + 0.5, fs, lit || held ? C.ink : '#ffffff', 'center', 'body');
    });
    ctx.globalAlpha = 1;
  }
  // the message line (gold help): between the level pill and the clock when it fits, else under the stretch pill
  const msg = st.waiting ? { text: 'Taking a break... press anything to chug on', col: '#ffffff', t: 1, life: 2 } : st.msg;
  if (msg) {
    let fs = big ? 20 : 14;
    const h = big ? 32 : 26, font = q => '700 ' + q + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
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
  // prompts: the winder's over the engine, the switcher's over the switcher. A hint bubble replaces that player's prompt.
  const fs = 14 * z, yMax = H - Math.round(58 * z) - 18;
  const spot = id => (id === st.wind ? { x: ps[id].x + PW / 2, y: ps[id].y - 26 - 8 * z } : { x: s.x - st.cam.x, y: s.feet - PH - 22 - 8 * z });
  const place = (id, w, h) => {
    const sp = spot(id);
    let top = sp.y - h;
    if (typeof CPU === 'object' && cpuSolo() && !cpuOn(id)) { const cb = CPU.bubbles[1 - id]; if (cb && cb.t > 0 && Math.abs(sp.x - ps[1 - id].x) < w + 80 && sp.y > ps[1 - id].y - 80) top = Math.min(top, ps[1 - id].y - 22 - (big ? 30 : 22) - 8 - h); }
    let x = clamp(sp.x - w / 2, 4, W - w - 4), y = clamp(top, big ? 96 : 80, yMax - h);
    if (place.last && Math.abs(place.last.y - y) < h + 4 && x < place.last.x + place.last.w && x + w > place.last.x) y = clamp(place.last.y - h - 6, big ? 96 : 80, yMax - h);
    // keep the track signs readable: step above (or below) any sign board the bubble would cover
    for (const b of place.signs) if (x < b.x1 + 4 && x + w > b.x0 - 4 && y < b.y1 + 4 && y + h > b.y0 - 4) { const up = b.y0 - h - 6; y = up >= (big ? 96 : 80) ? up : Math.min(yMax - h, b.y1 + 6); }
    place.last = { x, y, w };
    return { x, y };
  };
  place.last = null;
  place.signs = st.c.signs.filter(sg => sg.x > st.cam.x - 300 && sg.x < st.cam.x + W + 300).map(sg => {
    const sfs = hudBig() ? 20 : 15, bh = sfs * 2; ctx.font = '700 ' + sfs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const sw = ctx.measureText(sg.text).width + 22, sy = sg.y - 190 - (bh - 30), sx = sg.x - st.cam.x;
    return { x0: sx - sw / 2, x1: sx + sw / 2, y0: sy, y1: sy + bh };
  });
  const say = (id, str, col, pulse) => {
    if (wtrQuiet(id) || st.hints[id] || !str) return;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, o = place(id, w, h);
    const sc = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(o.x + w / 2, o.y + h / 2); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(40,28,60,0.88)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, col, 'center', 'body');
    ctx.restore();
  };
  const Wd = st.wind, Rn = st.run;
  {
    let str = null, col = C.gold, pulse = false;
    const dn = wtrKey(Wd, 'down'), ak = wtrKey(Wd, 'act');
    if (tr.rev) { str = 'Back we go...'; col = '#ffe7a8'; }
    else if (pl.brake && tr.v > 4) { str = 'Brake! Hold ' + dn; pulse = true; }
    else if (pl.hold || (pl.brake && tr.v <= 4 && pl.stopX - tr.x < 80)) { str = pl.why === 'station' || pl.why === 'end' ? 'Hold ' + dn + ' (brake) here' : 'Hold ' + dn + ' and wait'; col = '#d9f6ff'; if (pl.why === 'end' || pl.why === 'station') pulse = !tr.brake; }
    else if (tr.sproing > 0) { str = 'Sproing! Wait a moment'; col = '#ffe7a8'; }
    else if (tr.spring <= 0.01) { str = 'Wind me up! Press ' + ak + ' on the gold ring'; pulse = true; }
    else if (tr.brake && !pl.brake && tr.v <= 4 && !(st.c.end && st.c.end.goldStop) && !wtrReady(st, 'end') && !st.c.stations.some(q => q.state === 'wait' && wtrReady(st, 'pass', q))) { str = 'Let go of ' + dn + ' to roll on'; col = '#d9f6ff'; }
    else if (tr.spring < 0.5 && windLit) str = 'Wind! Press ' + ak + ' on the gold ring';
    say(Wd, str, col, pulse);
  }
  {
    let str = null, col = C.gold, pulse = false;
    const ak = wtrKey(Rn, 'act'), j = pl.job, dx = pl.rx != null ? pl.rx - s.x : 0, dirK = k => { const q = wtrKey(Rn, k); return /^[A-Z]$/.test(q) ? (k === 'right' ? '▶ ' : '◀ ') + q : q; }, ar = dx > 40 ? dirK('right') : dx < -40 ? dirK('left') : '';
    if (j) {
      const nm = j.kind === 'station' ? j.o.name : '';
      if (pl.act) { str = { FLIP: 'Flip the lever! ', KICK: 'Kick it off! ', SHOO: 'Shoo! ', LOWER: 'Lower the bridge! ', HELP: 'Help ' + nm + ' on! ', RING: 'Ring the bell! ' }[pl.label] + ak; pulse = true; }
      else if (pl.can && pl.wait) { str = tr.v > 2 ? 'Wait for the train to stop' : !tr.brake ? 'Wait for the brake' : 'Wait for the train to roll up'; col = '#d9f6ff'; }
      else if (Math.abs(dx) < 700 && ar) {
        str = { lever: pl.bonus ? 'Bonus stars! To the lever ' : 'To the lever ', block: j.o.kind === 'dom' ? 'To the dominoes ' : j.o.kind === 'bunny' ? 'To the dust bunny ' : 'To the block ', bridge: 'Jump the gap ', station: 'To ' + nm + ' ', end: 'To the bell ' }[j.kind] + ar;
        col = pl.bonus ? '#ffe7a8' : C.gold;
        if (j.kind === 'bridge' && s.x > j.o.gx1) str = 'To the bookmark ' + ar;
      }
    }
    say(Rn, str, col, pulse);
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
Sfx.extra.windtrainClick = function (p) { this.tone(1400 * p, 0.04, 'square', 0.03); this.tone(900 * p, 0.06, 'triangle', 0.035, null, 0.03); };
Sfx.extra.windtrainTick = function (p) { this.tone(1100 * p, 0.03, 'square', 0.018); };
Sfx.extra.windtrainLocked = function (p) { this.tone(220 * p, 0.08, 'square', 0.02); };
Sfx.extra.windtrainSproing = function () { this.tone(300, 0.5, 'sine', 0.06, 900); this.tone(900, 0.4, 'sine', 0.03, 260, 0.2); };
Sfx.extra.windtrainChug = function () { this.tone(140 + Math.random() * 20, 0.06, 'triangle', 0.025, 90); };
Sfx.extra.windtrainEmpty = function () { this.tone(500, 0.35, 'sine', 0.04, 160); };
Sfx.extra.windtrainClunk = function () { this.tone(160, 0.2, 'square', 0.05, 80); this.tone(90, 0.25, 'triangle', 0.08, 50, 0.03); };
Sfx.extra.windtrainBoing = function () { this.tone(260, 0.25, 'sine', 0.06, 620); };
Sfx.extra.windtrainLever = function (p) { this.tone(500 * p, 0.05, 'square', 0.03, 300 * p); this.tone(800 * p, 0.08, 'triangle', 0.035, null, 0.06); };
Sfx.extra.windtrainKick = function (p) { this.tone(240 * p, 0.1, 'square', 0.04, 120 * p); [523, 659].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.035, null, 0.1 + i * 0.06)); };
Sfx.extra.windtrainDomino = function () { for (let i = 0; i < 5; i++) this.tone(900 - i * 80, 0.04, 'square', 0.025, null, i * 0.09); };
Sfx.extra.windtrainShoo = function () { this.tone(700, 0.1, 'sine', 0.04, 1200); this.tone(1200, 0.12, 'sine', 0.03, 900, 0.1); };
Sfx.extra.windtrainAchoo = function () { this.tone(500, 0.12, 'sawtooth', 0.02, 700); this.tone(300, 0.2, 'sawtooth', 0.03, 140, 0.14); };
Sfx.extra.windtrainStar = function () { [1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.035, null, i * 0.04)); };
Sfx.extra.windtrainWhiff = function (p) { this.tone(400 * p, 0.05, 'triangle', 0.02, 300 * p); };
Sfx.extra.windtrainBridge = function () { this.tone(180, 0.6, 'sawtooth', 0.015, 120); this.tone(90, 0.3, 'triangle', 0.09, 50, 0.6); [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.045, null, 0.75 + i * 0.07)); };
Sfx.extra.windtrainAboard = function () { this.tone(660, 0.12, 'square', 0.03); this.tone(880, 0.16, 'square', 0.03, null, 0.13); };
Sfx.extra.windtrainSeat = function () { [784, 988, 1175].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.04, null, i * 0.06)); };
Sfx.extra.windtrainDing = function () { this.tone(1568, 0.5, 'sine', 0.05); };
Sfx.extra.windtrainBell = function () { this.tone(1568, 0.6, 'sine', 0.06); this.tone(1568, 0.6, 'sine', 0.06, null, 0.25); this.tone(2093, 0.4, 'sine', 0.03, null, 0.25); };
Sfx.extra.windtrainHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.windtrainSwap = function () { this.tone(587, 0.18, 'square', 0.035); this.tone(740, 0.25, 'square', 0.035, null, 0.2); [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, 0.5 + i * 0.07)); };
Sfx.extra.windtrainHop = function (p) { this.tone(300 * p, 0.2, 'sine', 0.05, 640 * p); };
Sfx.extra.windtrainFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.11)); this.tone(587, 0.3, 'square', 0.03, null, 0.9); this.tone(740, 0.4, 'square', 0.03, null, 1.2); };
