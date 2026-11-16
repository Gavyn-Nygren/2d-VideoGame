/* Pip & Bo - Level 14-2 Pterodactyl Express (team, World 14 Dino Valley). */
'use strict';

/* ===== 14-2 Pterodactyl Express (mode 'ptero', World 14 "Dino Valley", team) =====
   Petra, a big friendly pterodactyl, gives Pip and Bo a ride over Dino Valley to deliver fruit to hungry baby dinos.
   Side view, scrolling right. The mode owns the tick, the camera, the whole picture and the HUD (def.ownStep +
   def.ownHUD); the engine grid is empty apart from the two spawns.
   The FLYER rides on Petra's back and makes her flap. Her wings rise on their own (the wing meter fills), wait at the
   top for a moment (the gold TOP zone) and then droop. A flap (the action or ▲) at the TOP is a PERFECT flap and lifts
   her well; a flap just before the top is a "good" one and only just holds her up; an early flap is a weak "flop" and
   starts the wings again from the bottom, so mashing sinks. With no flaps she sinks gently. ◀ ▶ slow down and speed
   up, ▼ folds the wings to dive. If the hanger's feet (or her belly) touch the ground it is a soft "Plop! Boing!"
   landing: she sits down, and only a flap takes off again (so an idle flyer never gets anywhere). Bumping the
   canyon roof is a soft "Bonk!".
   The HANGER hangs from Petra's feet. ◀ ▶ swing (a pendulum), and the action (or ▲) grabs fruit from the trees or a
   rock from a rock pillar, and drops what you hold. Fruit dropped into a nest (or carried right into it) feeds a
   baby dino. A rock dropped onto a big stone switch opens the log gate ahead; a closed gate makes Petra bonk softly
   and fly back to the rock pillar for another go. A dotted line shows where a dropped thing will land.
   Both jobs are needed: only the flyer keeps Petra up, and only the hanger opens gates, so one player alone (or with
   a partner who presses nothing) never gets past the first gate.
   Four routes, jobs swap at the perch at the end of each route ("Swap jobs!"): Morning Delivery, Canyon Gates (roofs
   and a gate with two switches), Windy Cliffs (updrafts to ride, timed downdrafts and headwinds), Volcano Smoke Run
   (sleepy smoke puffs to fly around: touching one is an "ACHOO!" sneeze), ending at the Big Nest.
   Gold help (announced, only for tries you both took part in): Gold wings after 2 landings in a route (bigger TOP
   zone, stronger flaps), Super gold wings after 4; a Gold switch after 2 missed tries at a gate (wider, with a gold
   drop path), Magnet rocks after 4; Gold nests after 3 missed fruit drops in a route; a Gold breeze after 3 sneezes
   (smaller, slower puffs); a Calm breeze after 2 landings on Windy Cliffs (gentler gusts).
   Room def: { title, flyer: 0|1, pal, tip, act, course: [tokens] }. Course tokens (x in px from the start, y is the
   screen y, the ground is about 430):
     fN          move the cursor N px right            gY  the ground eases to height Y here   cY  the roof eases to Y (70 = open sky)
     t:kind:Y    a fruit tree, fruit at height Y (mango banana melon berry apple)
     n:Y:N       a nest at height Y with N hungry babies (on a stump or ledge when above the ground)
     r:Y         a rock pillar with its top at Y        s   a stone switch      G   the log gate (its switches: the s since the last G)
     u:N d:N w:N an updraft / a timed downdraft / a timed headwind, N px wide     v   a smoke vent (puffs)
     S:text      a sign ({F} the flyer, {H} the hanger)  D:kind  scenery (bronto trike stego ferns eggs)
     P           the perch at the end of a route (swap)  E   the Big Nest (the finish)
   Every global is prefixed ptero / PTERO (and Sfx.extra.ptero*); all state lives in G.mst. */
const PTERO = {
  // the wing meter (the beat): rises on its own, waits at the TOP, then droops back a little
  riseT: 0.72, topWin: 0.34, droopTo: 0.5, droopT: 0.32, flapT: 0.14, goodAt: 0.72, takeoffAt: 0.3,
  jPerfect: 290, jGood: 140, jWeak: 150, flapKeep: 40, takeoffV: 300,
  g: 330, drag: 1.1, sink: 125, dive: 430, diveSink: 250, rockG: 1.1,
  cruise: 130, fast: 190, slow: 60, acc: 170, backV: 240,
  // Petra's shape (from her body centre): the hanger's pivot (her feet), roof and belly clearance, nose
  pivX: 4, pivY: 26, top: 34, belly: 26, front: 66, standH: 40, seatX: -8, seatY: -22,
  // the hanger: a pendulum from her feet
  Lr: 34, pump: 7.5, gL: 16, damp: 0.75, thMax: 1.2, accK: 0.0042, reach: 38, hangCY: 60, feetY: 73,
  itemG: 900, feedR: 30, feedGold: 48, catchW: 36, catchGold: 60, swW: 50, swGold: 92, magnet: 3.2,
  upLift: 430, downPush: 300, windV: 70, windSwing: 2.2,
  gustCalm: 2.4, gustWarn: 1.1, gustBlow: 2.0,
  puffEvery: 4.4, puffWarn: 0.9, puffV: 190, puffR: 40, puffLife: 3.4,
  ground0: 430, ceil0: 70,
  tryWin: 6, grabHelp: 2, grabGoldK: 1.45, landHelp: 2, landHelp2: 4, gateHelp: 2, gateHelp2: 4, missHelp: 3, sneezeHelp: 3, windHelp: 2,
  wingGold: [{ win: 1, good: 0.72, j: 1 }, { win: 1.75, good: 0.62, j: 1.12 }, { win: 2.4, good: 0.52, j: 1.24 }],
  basket: 3, swapT: 2.5, finT: 4.6, hintLife: 2.8, camLead: 300,
};
const pteroLerp = (a, b, u) => a + (b - a) * u;
const pteroSmooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const PTERO_FRUIT = {
  mango: { col: '#ffb43d', dark: '#e07b1f', leaf: '#5fae3e' }, banana: { col: '#ffe14d', dark: '#c9a21c', leaf: '#5fae3e' },
  melon: { col: '#7fd36a', dark: '#3f8f3a', leaf: '#3f8f3a' }, berry: { col: '#a46be0', dark: '#6b3fa8', leaf: '#5fae3e' },
  apple: { col: '#ff6b5a', dark: '#c2392b', leaf: '#5fae3e' },
};
const PTERO_PAL = {
  morning: { sky: ['#ffb08a', '#ffd3a3', '#fff1d0'], sun: '#fff3b8', far: '#e3a59b', far2: '#d18f8a', mid: '#8cc47a', midDark: '#6aa65f',
    dirt: '#a8754a', dirtDark: '#7d5232', grass: '#7ccf4f', grassDark: '#3f8f3a', rock: '#9a8a7a', rockDark: '#6b5a4a', cloud: 'rgba(255,255,255,0.85)' },
  canyon: { sky: ['#f39a62', '#f9c58e', '#fde4bf'], sun: '#fff0b0', far: '#d98a64', far2: '#c4744e', mid: '#c97c50', midDark: '#a8613c',
    dirt: '#c46a3c', dirtDark: '#8e4626', grass: '#b8c95a', grassDark: '#7c8f32', rock: '#c8794a', rockDark: '#8e4a2a', cloud: 'rgba(255,245,230,0.8)' },
  cliffs: { sky: ['#6fbfee', '#a9dcf4', '#e4f6fb'], sun: '#fffbe0', far: '#9cb8cc', far2: '#86a5bb', mid: '#78a986', midDark: '#5d8f6c',
    dirt: '#8d8a78', dirtDark: '#65624f', grass: '#8fd16a', grassDark: '#4f9a44', rock: '#a3a593', rockDark: '#6f715f', cloud: 'rgba(255,255,255,0.92)' },
  volcano: { sky: ['#6a4a8e', '#d9809a', '#ffc68a'], sun: '#ffd9a0', far: '#7d5a8c', far2: '#6a4a7a', mid: '#5f7a4e', midDark: '#4a603c',
    dirt: '#6e4a3c', dirtDark: '#4a2f26', grass: '#9acb5a', grassDark: '#5f8f34', rock: '#7a6670', rockDark: '#4f3f48', cloud: 'rgba(255,220,235,0.8)' },
};

/* ---------- the course: tokens -> ground and roof (4 px steps), trees, nests, rocks, gates, winds, vents ---------- */
function pteroCompile(def) {
  const P = PTERO, fl = def.flyer || 0;
  const name = s => s.replace(/\{F\}/g, NAMES[fl]).replace(/\{H\}/g, NAMES[1 - fl]);
  const c = { trees: [], nests: [], piles: [], switches: [], gates: [], zones: [], vents: [], signs: [], deco: [], perch: null, bigNest: null };
  const gk = [{ x: -800, y: P.ground0, r: 1 }], ck = [{ x: -800, y: P.ceil0, r: 1 }];
  let x = 0, pend = [], piles = [], k = 0;
  for (const tk of def.course || []) {
    const t = String(tk), ch = t[0], parts = t.split(':');
    if (ch === 'f' && /^f\d/.test(t)) x += parseInt(t.slice(1), 10) || 0;
    else if (ch === 'g' && /^g\d/.test(t)) gk.push({ x, y: +t.slice(1).split(':')[0], r: +(parts[1] || 170) });
    else if (ch === 'c' && /^c\d/.test(t)) ck.push({ x, y: +t.slice(1).split(':')[0], r: +(parts[1] || 140) });
    else if (ch === 't' && parts.length >= 3) c.trees.push({ x, y: +parts[2], fruit: parts[1], taken: false, k: k++, palm: hash(x, 7) % 2 === 0, wob: 0 });
    else if (ch === 'n' && parts.length >= 2) c.nests.push({ x, y: +parts[1], need: +(parts[2] || 1), fed: 0, t: 0, joy: 0, k: k++ });
    else if (ch === 'r' && parts.length >= 2) { const p = { x, y: +parts[1], took: 0, k: k++ }; c.piles.push(p); piles.push(p); }
    else if (t === 's') { const s = { x, down: false, t: 0, gate: null }; c.switches.push(s); pend.push(s); }
    else if (t === 'G') {
      const g = { x, sw: pend, piles, open: 0, opening: false, passed: false, tries: 0, gold: 0, t: 0, backTo: (piles[0] ? piles[0].x : x - 700) - 260 };
      for (const s of pend) s.gate = g;
      for (const p of piles) p.gate = g;
      c.gates.push(g); pend = []; piles = [];
    } else if ((ch === 'u' || ch === 'd' || ch === 'w') && t[1] === ':') {
      const n = +parts[1] || 200;
      c.zones.push({ kind: ch === 'u' ? 'up' : ch === 'd' ? 'down' : 'wind', x0: x, x1: x + n, state: 'calm', t: (c.zones.length * 1.3) % P.gustCalm, warned: false });
    } else if (t === 'v') c.vents.push({ x, t: (c.vents.length * 1.1) % P.puffEvery, warn: false });
    else if (ch === 'S' && t[1] === ':') c.signs.push({ x, text: name(t.slice(2)) });
    else if (ch === 'D' && t[1] === ':') c.deco.push({ x, kind: t.slice(2), t: 0 });
    else if (t === 'P') { c.perch = { x: x + 120, y: 0 }; x += 400; }
    else if (t === 'E') { c.bigNest = { x: x + 140, y: 0 }; x += 500; }
  }
  c.len = x + 600;
  // sample the ground and the roof every 4 px (each knot eases in over its ramp)
  const X0 = -800, N = Math.ceil((c.len - X0) / 4) + 2;
  const sample = (kn, xx) => {
    let i = 0;
    while (i + 1 < kn.length && kn[i + 1].x <= xx) i++;
    const a = kn[i], prev = kn[i - 1];
    if (prev && xx < a.x + a.r) return pteroLerp(prev.y, a.y, pteroSmooth((xx - a.x) / a.r));
    return a.y;
  };
  c.x0 = X0; c.gy = new Float32Array(N); c.cy = new Float32Array(N);
  for (let i = 0; i < N; i++) { const xx = X0 + i * 4; c.gy[i] = sample(gk, xx); c.cy[i] = sample(ck, xx); }
  const G0 = xx => pteroArr(c, c.gy, xx);
  if (c.perch) c.perch.y = Math.min(G0(c.perch.x) - 70, 340);
  if (c.bigNest) c.bigNest.y = Math.min(G0(c.bigNest.x) - 80, 330);
  // a rock pillar's top can't be below the ground
  for (const p of c.piles) p.y = Math.min(p.y, G0(p.x) - 40);
  for (const s of c.switches) s.y = G0(s.x);
  // the babies' colours
  for (const n of c.nests) n.babies = Array.from({ length: n.need }, (_, i) => ({ col: ['#8fe07a', '#ff9ec7', '#b7a4ff', '#ffd06a', '#7fd6e0'][(n.k + i) % 5], fed: false, joy: 0, ph: (hash(n.k, i) % 100) / 16 }));
  return c;
}
function pteroArr(c, a, x) {
  const f = (x - c.x0) / 4, i = Math.floor(f);
  if (i < 0) return a[0];
  if (i >= a.length - 1) return a[a.length - 1];
  return a[i] + (a[i + 1] - a[i]) * (f - i);
}
const pteroGY = (st, x) => pteroArr(st.c, st.c.gy, x);
const pteroCY = (st, x) => pteroArr(st.c, st.c.cy, x);
// the lowest roof (largest y) and the highest ground (smallest y) between x0 and x1
function pteroBand(st, x0, x1) {
  let top = 0, bot = 9999;
  for (let x = x0; x <= x1; x += 16) { top = Math.max(top, pteroCY(st, x)); bot = Math.min(bot, pteroGY(st, x)); }
  return { top, bot };
}
// each player's own keys, for prompts and the HUD (a player with a controller is shown its buttons)
function pteroKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
  if (what === 'down') return pad ? 'stick ▼' : touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'left') return pad ? '◀' : touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'right') return pad ? '▶' : touch ? '▶' : id === 0 ? 'D' : '→';
  return pad ? 'stick' : touch ? '◀ ▶' : id === 0 ? 'A D' : '← →';
}
// 1-player mode: the computer's own job gets no key hints or prompts (it knows its job)
const pteroQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const pteroBoth = st => G.time - st.inT[0] < PTERO.tryWin && G.time - st.inT[1] < PTERO.tryWin;
const pteroWingCfg = st => PTERO.wingGold[st.wingGold || 0];
// how far the hanger can grab from (further with the gold Grabby net)
const pteroReach = st => PTERO.reach * (st.grabGold ? PTERO.grabGoldK : 1);

/* ---------- a route ---------- */
function pteroRoom(st, L, k) {
  const def = L.def;
  st.k = k; st.flyer = def.flyer || 0; st.hanger = 1 - st.flyer; st.title = def.title || ''; st.pal = PTERO_PAL[def.pal] || PTERO_PAL.morning;
  st.palKey = def.pal || 'morning';
  st.c = pteroCompile(def);
  st.stats.roomT[k] = null; st.stats.roomFed[k] = 0; st.stats.roomTitles[k] = st.title;
  st.wingGold = 0; st.roomLands = 0; st.roomMiss = 0; st.roomSneeze = 0; st.nestGold = false; st.puffGold = false; st.windGold = false;
  st.grabGold = false; st.roomGrabMiss = 0; st.grabWatch = null;
  const x = 150, gy = pteroGY({ c: st.c }, x);
  st.pt = { x, y: gy - PTERO.standH, vx: 0, vy: 0, state: 'landed', t: 0, wing: 0.2, wst: 'rise', wt: 0, flapA: 0, flapKind: null, flapShow: 0,
    tilt: 0, sneeze: 0, immune: 0, bonkT: 0, backTo: 0, ax: 0, blink: 0, first: true, glide: null };
  st.hg = { th: 0, om: 0, item: null, stand: 1, lift: 0, grabT: 0, wob: 0 };
  st.drops = []; st.rests = []; st.puffs = [];
  st.cam = { x: x - PTERO.camLead };
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null;
  st.roomT = 0; st.segStart = G.time; st.inT = [-99, -99]; st.swap = null; st.fin = null; st.wrongT = [0, 0];
  pteroActLabels(st);
  pteroMirror(st);
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function pteroStep(st, dt) {
  if (!st.pt) return;
  const ps = G.players;
  for (const k of [0, 1]) {
    const i = ps[k].input;
    if (i.left || i.right || i.jump || i.down || i.act || ps[k].pendingJump || ps[k].pendingAct) st.inT[k] = G.time;
  }
  st.roomT += dt;
  const pt = st.pt;
  if (G.introT > 0) { for (const p of ps) { p.pendingJump = false; p.pendingAct = false; } pteroWing(st, dt, false); }
  else if (pt.state === 'swap') { if (pteroSwapStep(st, dt)) return; }
  else if (pt.state === 'finish') { if (pteroFinStep(st, dt)) return; }
  else pteroPlay(st, dt);
  pteroDrops(st, dt);
  pteroWorld(st, dt);
  pteroCam(st, dt);
  pteroFx(st, dt);
  pteroMirror(st);
}
function pteroPlay(st, dt) {
  const P = PTERO, pt = st.pt, hg = st.hg, ps = G.players, F = ps[st.flyer], Hn = ps[st.hanger];
  const fPress = F.pendingJump || F.pendingAct, hPress = Hn.pendingJump || Hn.pendingAct;
  for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
  const fi = F.input, hi = Hn.input;
  pt.t += dt;
  if (pt.immune > 0) pt.immune -= dt;
  if (pt.sneeze > 0) pt.sneeze -= dt;
  if (pt.bonkT > 0) pt.bonkT -= dt;
  // the wings (the beat): a press is a flap of some strength, or a takeoff from the ground
  const flap = pteroWing(st, dt, fPress);
  const vx0 = pt.vx;
  if (pt.state === 'landed') {
    pt.vx = 0; pt.vy = 0;
    pt.y = approach(pt.y, pteroGY(st, pt.x) - P.standH, dt * 200);
    hg.stand = approach(hg.stand, 1, dt * 5); hg.th = 0; hg.om = 0;
    if (flap) {
      if (flap === 'weak' && pt.wingAt < P.takeoffAt) { pteroPop(st, pt.x + 10, pt.y - 70, 'Wings up first!', '#ffe7a8', 16); }
      else {
        pt.state = 'fly'; pt.vy = -P.takeoffV * pteroWingCfg(st).j; pt.vx = 40; pt.first = false; pt.noLand = 0.7;
        hg.th = 0.5; hg.om = -0.8; hg.stand = 0;
        pteroPop(st, pt.x, pt.y - 80, 'Up, up and away!', '#ffffff', 20);
        Sfx.play('pteroTakeoff'); rumble(st.flyer, 0.2, 0.4, 120);
        for (let i = 0; i < 14; i++) pteroPart(st, pt.x + (Math.random() - 0.5) * 60, pteroGY(st, pt.x) - 4, (Math.random() - 0.5) * 160, -40 - Math.random() * 60, 0.6, 'rgba(210,180,140,0.8)', 4 + Math.random() * 4, 120, 'dust');
      }
    } else if (!pt.first && pt.t > 1.2) pteroHintOnce(st, 'takeoff' + st.k, st.flyer, 'Flap to take off! Wait for the wings to go UP');
  } else {
    // speed: ◀ slow, ▶ fast; flying back to the rocks after a gate bonk
    let tv = fi.right ? P.fast : fi.left ? P.slow : P.cruise;
    if (pt.state === 'back') tv = -P.backV;
    for (const z of st.c.zones) if (z.kind === 'wind' && z.state === 'blow' && pt.x > z.x0 - 40 && pt.x < z.x1) tv -= P.windV * (st.windGold ? 0.55 : 1);
    if (pt.sneeze > 0) tv *= 0.35;
    pt.vx = approach(pt.vx, tv, P.acc * dt * (pt.state === 'back' ? 2.2 : 1));
    // up and down
    const wc = pteroWingCfg(st);
    let g = P.g * (hg.item && hg.item.kind === 'rock' ? P.rockG : 1), sink = P.sink * (st.wingGold === 2 ? 0.85 : 1);
    if (fi.down && pt.state === 'fly') { g += P.dive; sink = P.diveSink; }
    for (const z of st.c.zones) {
      if (pt.x < z.x0 - 30 || pt.x > z.x1 + 30) continue;
      if (z.kind === 'up') g -= P.upLift;
      else if (z.kind === 'down' && z.state === 'blow') g += P.downPush * (st.windGold ? 0.55 : 1);
    }
    pt.vy += g * dt; pt.vy -= pt.vy * P.drag * dt; pt.vy = Math.min(pt.vy, sink);
    if (flap) {
      const J = (flap === 'perfect' ? P.jPerfect : flap === 'good' ? P.jGood : P.jWeak * pt.wingAt * pt.wingAt) * wc.j;
      pt.vy = Math.min(pt.vy, P.flapKeep) - J;
    }
    pt.vy = Math.max(pt.vy, -340);
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    if (pt.state === 'back' && pt.x <= pt.backTo) { pt.state = 'fly'; pt.vx = 0; pteroPop(st, pt.x + 40, pt.y - 80, 'Try again!', '#ffe7a8', 18); }
    // the canyon roof: a soft bonk
    const roof = Math.max(pteroCY(st, pt.x - 30), pteroCY(st, pt.x), pteroCY(st, pt.x + 40));
    if (pt.y - P.top < roof && roof <= P.ceil0 + 2) { pt.y = roof + P.top; pt.vy = Math.max(pt.vy, 0); }   // (the open sky: as high as she goes)
    else if (pt.y - P.top < roof) {
      pt.y = roof + P.top; pt.vy = Math.max(pt.vy, 90);
      if (pt.bonkT <= 0) {
        pt.bonkT = 0.7; st.stats.bonks++;
        pteroPop(st, pt.x, pt.y - 40, 'Bonk!', '#ffe7a8', 22); Sfx.play('pteroBonk'); rumble(st.flyer, 0.3, 0.3, 120);
        for (let i = 0; i < 6; i++) pteroPart(st, pt.x + (Math.random() - 0.5) * 30, roof + 4, (Math.random() - 0.5) * 60, 40 + Math.random() * 60, 0.6, st.pal.rock, 3, 500);
        pteroHintOnce(st, 'roof' + st.k, st.flyer, 'Low roof! Fewer flaps, or dive ' + pteroKey(st.flyer, 'down'));
      }
    }
    pt.ax = (pt.vx - vx0) / dt;
    // the hanger swings
    pteroHang(st, dt, Hn, hi);
    // the gates
    const hc = pteroHangPos(st);
    for (const gt of st.c.gates) {
      if (gt.passed) continue;
      if (pt.x > gt.x + 90 && hc.x > gt.x + 20) { gt.passed = true; continue; }
      const front = Math.max(pt.x + P.front, hc.x + 13);
      if (front < gt.x - 16 || pt.state === 'back') break;
      if (gt.open >= 0.7) break;
      // shut: it's opening (wait a moment), or a soft bonk and back to the rocks
      const over = front - (gt.x - 16);
      pt.x -= over; pt.vx = Math.min(pt.vx, 0);
      if (gt.opening) { pteroHintOnce(st, 'opening' + gt.x, st.flyer, 'The gate is opening...'); break; }
      st.stats.bonks++;
      if (pteroBoth(st)) gt.tries++;
      pteroPop(st, gt.x - 40, pt.y - 50, 'BONK!', '#ffe7a8', 30);
      Sfx.play('pteroBonk'); Sfx.play('pteroGateBonk'); rumble(0, 0.4, 0.5, 200); rumble(1, 0.4, 0.5, 200);
      if (!reduceMotion) G.shake = Math.max(G.shake, 0.15);
      pt.state = 'back'; pt.backTo = gt.backTo; pt.vx = -60; pt.vy = Math.min(pt.vy, -60);
      hg.om += 2.4;
      pteroHint(st, st.hanger, 'The gate is shut! Drop a rock on the stone switch', 3.2);
      pteroHint(st, st.flyer, 'Bonk! Back to the rocks for another go', 2.6);
      pteroGateHelp(st, gt);
      break;
    }
    // landing: the hanger's feet or Petra's belly touch the ground
    const feet = pteroHangFeet(st);
    if (pt.noLand > 0) pt.noLand -= dt;
    else if (pt.state !== 'landed' && (feet.y >= pteroGY(st, feet.x) - 1 || pt.y + P.belly >= pteroGY(st, pt.x))) pteroLand(st);
    // the end of the route
    const c = st.c;
    if (c.perch && pt.x >= c.perch.x - 230 && pt.state === 'fly') { pteroStartSwap(st); return; }
    if (c.bigNest && pt.x >= c.bigNest.x - 250 && pt.state === 'fly') { pteroStartFinish(st); return; }
  }
  // the hanger's press: grab or drop
  if (hPress) pteroGrab(st);
  else if (pt.state === 'landed') pteroHang(st, dt, Hn, hi);
  // fruit carried right into a hungry nest feeds it too
  if (hg.item && hg.item.kind === 'fruit') {
    const hc = pteroHangPos(st), r = st.nestGold ? P.feedGold : P.feedR;
    if (hg.feedT > 0) hg.feedT -= dt;
    else for (const n of c0(st).nests) if (n.fed < n.need && Math.hypot(hc.x - n.x, hc.y - (n.y - 16)) < r) { pteroFeed(st, n, hg.item.list.pop(), hc.x, hc.y); hg.feedT = 0.25; if (!hg.item.list.length) hg.item = null; break; }
  }
  if (hg.grabT > 0) hg.grabT = Math.max(0, hg.grabT - dt);
  pteroNudges(st);
}
const c0 = st => st.c;
// the wing meter. Returns the flap a press made ('perfect' | 'good' | 'weak') or null
function pteroWing(st, dt, press) {
  const P = PTERO, pt = st.pt, wc = pteroWingCfg(st);
  let out = null;
  if (press) {
    out = pt.wst === 'top' ? 'perfect' : pt.wing >= wc.good ? 'good' : 'weak';
    pt.wingAt = pt.wing;
    if (pt.state !== 'landed' || pt.wing >= P.takeoffAt || out !== 'weak') {
      pt.wing = 0; pt.wst = 'flap'; pt.wt = 0; pt.flapA = 1; pt.flapKind = out; pt.flapShow = 0.6;
      const id = st.flyer;
      st.stats.flaps[id]++;
      if (out === 'perfect') st.stats.perfect[id]++;
      else if (out === 'good') st.stats.good[id]++;
      if (pt.state !== 'landed') {
        if (out === 'perfect') { Sfx.play('pteroFlap', id); pteroPop(st, pt.x - 60, pt.y - 64, 'PERFECT!', C.gold, 17); for (let i = 0; i < 5; i++) pteroPart(st, pt.x - 30 + Math.random() * 40, pt.y + 10, -60 - Math.random() * 60, 60 + Math.random() * 40, 0.5, 'rgba(255,255,255,0.8)', 3, 0, 'puff'); }
        else if (out === 'good') Sfx.play('pteroFlapGood', id);
        else { Sfx.play('pteroFlop', id); st.flopN = (st.flopN || 0) + 1; if (st.flopN >= 4) { st.flopN = 0; pteroHintOnce(st, 'early' + st.k, id, 'Too early! Wait for the gold TOP, then flap'); } }
        if (out !== 'weak') st.flopN = 0;
      }
    }
  }
  if (pt.flapA > 0) pt.flapA = Math.max(0, pt.flapA - dt / P.flapT);
  if (pt.flapShow > 0) pt.flapShow = Math.max(0, pt.flapShow - dt);
  if (pt.wst === 'flap') { pt.wt += dt; if (pt.wt >= P.flapT) { pt.wst = 'rise'; pt.wt = 0; } }
  else if (pt.wst === 'rise') { pt.wing += dt / P.riseT; if (pt.wing >= 1) { pt.wing = 1; pt.wst = 'top'; pt.wt = 0; if (pt.state !== 'landed' && G.introT <= 0) Sfx.play('pteroTop', st.flyer); } }
  else if (pt.wst === 'top') { pt.wt += dt; if (pt.wt > P.topWin * wc.win) { pt.wst = 'droop'; pt.wt = 0; } }
  else if (pt.wst === 'droop') { pt.wing -= dt * (1 - P.droopTo) / P.droopT; if (pt.wing <= P.droopTo) { pt.wing = P.droopTo; pt.wst = 'rise'; } }
  return out;
}
// the hanger's swing: a pendulum from Petra's feet. ◀ ▶ pump it; her speeding up and slowing down swings it too
function pteroHang(st, dt, Hn, hi) {
  const P = PTERO, pt = st.pt, hg = st.hg;
  if (pt.state === 'landed') { hg.th = 0; hg.om = 0; return; }
  const dir = (hi.right ? 1 : 0) - (hi.left ? 1 : 0);
  hg.om += dir * P.pump * dt;
  hg.om -= P.gL * Math.sin(hg.th) * dt;
  hg.om -= pt.ax * P.accK * Math.cos(hg.th) * dt;
  for (const z of st.c.zones) if (z.kind === 'wind' && z.state === 'blow' && pt.x > z.x0 - 40 && pt.x < z.x1) hg.om -= P.windSwing * (st.windGold ? 0.5 : 1) * dt;
  hg.om *= 1 - P.damp * dt;
  hg.th += hg.om * dt;
  if (hg.th > P.thMax) { hg.th = P.thMax; hg.om = -Math.abs(hg.om) * 0.3; }
  if (hg.th < -P.thMax) { hg.th = -P.thMax; hg.om = Math.abs(hg.om) * 0.3; }
  if (dir) st.stats.swingT[st.hanger] += dt;
  hg.lift = approach(hg.lift, 0, dt * 3);
}
// where the hanger is: their middle, their feet, the pivot (Petra's feet)
function pteroPivot(st) { const pt = st.pt; return { x: pt.x + PTERO.pivX, y: pt.y + PTERO.pivY }; }
function pteroHangPos(st) {
  const P = PTERO, pv = pteroPivot(st), hg = st.hg;
  if (st.pt.state === 'landed') { const gx = st.pt.x + 34; return { x: gx, y: pteroGY(st, gx) - 13 }; }
  return { x: pv.x + P.Lr * Math.sin(hg.th), y: pv.y + P.Lr * Math.cos(hg.th) };
}
function pteroHangFeet(st) {
  const P = PTERO, pv = pteroPivot(st), hg = st.hg;
  return { x: pv.x + (P.Lr + 13) * Math.sin(hg.th), y: pv.y + (P.Lr + 13) * Math.cos(hg.th) };
}
// how fast the hanger is moving (Petra's speed plus the swing): what a dropped thing flies off with
function pteroHangVel(st) {
  const P = PTERO, pt = st.pt, hg = st.hg;
  if (pt.state === 'landed') return { vx: 0, vy: 0 };
  // (a hand lets go softly: it keeps all of the forward speed but only a little of Petra's bob up and down)
  return { vx: pt.vx + P.Lr * hg.om * Math.cos(hg.th), vy: clamp(pt.vy * 0.3, -50, 60) - P.Lr * hg.om * Math.sin(hg.th) * 0.6 };
}
// where a thing dropped now would land: its path (for the dotted line) and the spot
function pteroPredict(st, from, v, steps) {
  const P = PTERO, pts = [];
  let x = from.x, y = from.y + 6, vx = v.vx, vy = v.vy;
  const dt = 1 / 30;
  for (let i = 0; i < (steps || 60); i++) {
    vy += P.itemG * dt; x += vx * dt; y += vy * dt;
    pts.push({ x, y });
    if (y >= pteroGY(st, x)) { pts[pts.length - 1].y = pteroGY(st, x); break; }
  }
  return pts;
}
function pteroLand(st) {
  const P = PTERO, pt = st.pt, hg = st.hg;
  pt.state = 'landed'; pt.t = 0; pt.vx = 0; pt.vy = 0; hg.th = 0; hg.om = 0; hg.stand = 0.2;
  st.stats.lands++;
  pteroPop(st, pt.x + 20, pt.y - 40, 'Plop! Boing!', '#ffffff', 26);
  Sfx.play('pteroBoing'); rumble(0, 0.3, 0.5, 200); rumble(1, 0.3, 0.5, 200);
  for (let i = 0; i < 16; i++) pteroPart(st, pt.x + (Math.random() - 0.5) * 90, pteroGY(st, pt.x) - 4, (Math.random() - 0.5) * 220, -30 - Math.random() * 80, 0.7, 'rgba(210,180,140,0.8)', 4 + Math.random() * 5, 150, 'dust');
  if (G.time - st.inT[st.flyer] < P.tryWin) st.roomLands++;
  pteroHint(st, st.flyer, 'Landed! Flap at the gold TOP of the wingbeat', 3);
  const want = st.roomLands >= P.landHelp2 ? 2 : st.roomLands >= P.landHelp ? 1 : 0;
  if (want > st.wingGold) {
    st.wingGold = want; st.stats.helps++;
    pteroMsg(st, want === 1 ? 'Gold wings! A bigger gold TOP and stronger flaps' : 'Super gold wings! Petra flaps extra strong now', C.gold, 3.6);
    Sfx.play('pteroHelp');
  }
  if (st.palKey === 'cliffs' && st.roomLands >= P.windHelp && !st.windGold) {
    st.windGold = true; st.stats.helps++;
    pteroMsg(st, 'Calm breeze! The gusts are gentler now', C.gold, 3.6); Sfx.play('pteroHelp');
  }
}
// the hanger's button: drop what you hold, or grab the nearest fruit or rock in reach
function pteroGrab(st) {
  const P = PTERO, hg = st.hg, hc = pteroHangPos(st), id = st.hanger, c = st.c;
  // (with fruit in the basket, a press next to another fruit picks it too; anywhere else it drops one)
  let best = null, bd = pteroReach(st);
  const fruitIn = hg.item && hg.item.kind === 'fruit';
  if (!hg.item || (fruitIn && hg.item.list.length < P.basket)) for (const t of c.trees) if (!t.taken) { const d = Math.hypot(t.x - hc.x, t.y - hc.y); if (d < bd) { bd = d; best = { t }; } }
  if (!hg.item) for (const p of c.piles) { const d = Math.hypot(p.x - hc.x, p.y - 14 - hc.y); if (d < bd) { bd = d; best = { p }; } }
  if (hg.item && !best) {
    const v = pteroHangVel(st);
    st.drops.push({ kind: hg.item.kind, fruit: fruitIn ? hg.item.list.pop() : null, x: hc.x, y: hc.y + 6, vx: v.vx, vy: v.vy, t: 0, rot: 0, by: id, gate: pteroNeeds(st).gate });
    if (!fruitIn || !hg.item.list.length) hg.item = null;
    hg.grabT = 0.25;
    Sfx.play('pteroDrop', id);
    return;
  }
  if (!best) {
    st.whiffN = (st.whiffN || 0) + 1;
    if (st.whiffN >= 2) { st.whiffN = 0; pteroHint(st, id, st.pt.state === 'landed' ? 'Up in the air first! Then grab fruit and rocks' : 'Nothing in reach. Swing ' + pteroKey(id, 'lr') + ' next to fruit or a rock', 2.4); }
    Sfx.play('pteroWhiff', id);
    return;
  }
  st.whiffN = 0;
  st.stats.grabs[id]++;
  hg.grabT = 0.3;
  if (best.t) {
    best.t.taken = true; best.t.wob = 1;
    if (!hg.item) hg.item = { kind: 'fruit', list: [] };
    hg.item.list.push(best.t.fruit);
    pteroPop(st, hc.x, hc.y - 26, hg.item.list.length > 1 ? hg.item.list.length + ' fruit!' : 'Got it!', PTERO_FRUIT[best.t.fruit].col, 18); Sfx.play('pteroGrab', id);
    for (let i = 0; i < 6; i++) pteroPart(st, best.t.x, best.t.y - 14, (Math.random() - 0.5) * 120, -40 - Math.random() * 60, 0.8, '#6fbf4a', 4, 300, 'leaf');
    st.hinted['fruitNudge' + st.k] = true;
  } else {
    best.p.took = 0.5; hg.item = { kind: 'rock' };
    pteroPop(st, hc.x, hc.y - 26, 'Rock!', '#e8e0d0', 18); Sfx.play('pteroRock', id);
    st.hinted['rockNudge' + st.k] = true;
  }
}
function pteroFeed(st, n, fruit, x, y) {
  const b = n.babies.find(q => !q.fed);
  if (b) { b.fed = true; b.joy = 1; }
  n.fed++; n.joy = 1;
  st.stats.fed++; st.stats.roomFed[st.k]++;
  pteroPop(st, n.x, n.y - 54, n.fed >= n.need ? 'Nom nom! Thank you!' : 'Nom nom!', '#ffd4e8', 20);
  Sfx.play('pteroNom');
  for (let i = 0; i < 8; i++) pteroPart(st, n.x + (Math.random() - 0.5) * 30, n.y - 20, (Math.random() - 0.5) * 80, -60 - Math.random() * 60, 1.0, '#ff7aa8', 5, -20, 'heart');
  void fruit; void x; void y;
}

/* ---------- dropped fruit and rocks ---------- */
function pteroDrops(st, dt) {
  const P = PTERO, c = st.c;
  for (let i = st.drops.length - 1; i >= 0; i--) {
    const d = st.drops[i], y0 = d.y;
    d.t += dt; d.vy += P.itemG * dt;
    if (d.kind === 'rock') {
      // magnet rocks drift onto the switch
      const sw = c.switches.find(s => !s.down && s.gate && s.gate.gold >= 2 && Math.abs(s.x - d.x) < 190 && d.y < s.y);
      if (sw) d.vx += (sw.x - d.x) * P.magnet * dt * 2 - d.vx * dt * 1.2;
    }
    d.x += d.vx * dt; d.y += d.vy * dt; d.rot += dt * (d.kind === 'rock' ? 4 : 7) * Math.sign(d.vx || 1);
    if (d.kind === 'fruit') {
      const n = c.nests.find(q => q.fed < q.need && y0 < q.y - 4 && d.y >= q.y - 4 && Math.abs(d.x - q.x) < (st.nestGold ? P.catchGold : P.catchW));
      if (n) { pteroFeed(st, n, d.fruit, d.x, d.y); st.drops.splice(i, 1); continue; }
      if (d.y >= pteroGY(st, d.x)) {
        d.y = pteroGY(st, d.x);
        st.stats.missed++;
        pteroPop(st, d.x, d.y - 30, 'Plop! Oops!', '#ffe7a8', 16); Sfx.play('pteroPlop');
        for (let k = 0; k < 6; k++) pteroPart(st, d.x, d.y - 4, (Math.random() - 0.5) * 120, -60 - Math.random() * 60, 0.5, PTERO_FRUIT[d.fruit].col, 3, 600);
        st.rests.push({ kind: 'fruit', fruit: d.fruit, x: d.x, y: d.y, t: 0 });
        if (pteroBoth(st) && c.nests.some(q => q.fed < q.need && Math.abs(q.x - d.x) < 500)) {
          st.roomMiss++;
          if (st.roomMiss >= P.missHelp && !st.nestGold) {
            st.nestGold = true; st.stats.helps++;
            pteroMsg(st, 'Gold nests! The babies stretch up to catch', C.gold, 3.6); Sfx.play('pteroHelp');
          }
        }
        if (st.roomMiss < P.missHelp) pteroHintOnce(st, 'miss' + st.k, d.by, 'Drop it when the dotted line ends in the nest');
        st.drops.splice(i, 1);
      }
    } else {
      const sw = c.switches.find(s => !s.down && Math.abs(d.x - s.x) < (s.gate && s.gate.gold ? P.swGold : P.swW) / 2 && d.y >= s.y - 12);
      if (sw) {
        sw.down = true; sw.t = 0; st.stats.switches[d.by]++;
        pteroPop(st, sw.x, sw.y - 50, 'CLUNK!', '#ffffff', 28);
        Sfx.play('pteroClunk'); rumble(0, 0.4, 0.4, 160); rumble(1, 0.4, 0.4, 160);
        for (let k = 0; k < 14; k++) { const a = -Math.PI * Math.random(); pteroPart(st, sw.x, sw.y - 10, Math.cos(a) * 160, Math.sin(a) * 160, 0.7, k % 2 ? C.gold : '#fff2b0', 3, 300, 'spark'); }
        const gt = sw.gate;
        if (gt && gt.sw.every(s => s.down)) {
          gt.opening = true; gt.t = 0;
          pteroMsg(st, 'The gate is opening!', '#ffe7a8', 2.4); Sfx.play('pteroGate');
        } else if (gt) pteroMsg(st, 'One switch down! One more to go', '#ffe7a8', 2.6);
        st.drops.splice(i, 1);
        continue;
      }
      if (d.y >= pteroGY(st, d.x)) {
        d.y = pteroGY(st, d.x);
        Sfx.play('pteroThud');
        for (let k = 0; k < 8; k++) pteroPart(st, d.x, d.y - 3, (Math.random() - 0.5) * 140, -30 - Math.random() * 50, 0.5, 'rgba(200,170,130,0.8)', 4, 200, 'dust');
        st.rests.push({ kind: 'rock', x: d.x, y: d.y, t: 0 });
        const gt = d.gate;
        if (gt && !gt.opening) {
          const near = gt.sw.find(s => !s.down);
          if (near) {
            pteroPop(st, d.x, d.y - 30, d.x < near.x ? 'Thud! Too early' : 'Thud! Too late', '#ffe7a8', 16);
            if (pteroBoth(st)) { gt.tries++; pteroGateHelp(st, gt); }
            pteroHintOnce(st, 'rockmiss' + st.k, d.by, 'Let go when the dotted line ends on the switch');
          }
        }
        st.drops.splice(i, 1);
      }
    }
  }
  for (let i = st.rests.length - 1; i >= 0; i--) { const r = st.rests[i]; r.t += dt; if (r.t > 6) st.rests.splice(i, 1); }
}
function pteroGateHelp(st, gt) {
  const P = PTERO, want = gt.tries >= P.gateHelp2 ? 2 : gt.tries >= P.gateHelp ? 1 : 0;
  if (want > gt.gold) {
    gt.gold = want; st.stats.helps++;
    pteroMsg(st, want === 1 ? 'Gold switch! It got bigger, and the drop line turns gold' : 'Magnet rocks! They drift right onto the switch', C.gold, 3.8);
    Sfx.play('pteroHelp');
  }
}

/* ---------- the world: gates opening, winds, smoke puffs, nests, scenery ---------- */
function pteroWorld(st, dt) {
  const P = PTERO, c = st.c, pt = st.pt, live = G.introT <= 0 && (pt.state === 'fly' || pt.state === 'back' || pt.state === 'landed');
  for (const g of c.gates) {
    if (g.opening && g.open < 1) {
      g.open = Math.min(1, g.open + dt / 0.9); g.t += dt;
      if (g.open >= 1) { pteroPop(st, g.x, 150, 'Gate open!', '#8fe3b0', 26); Sfx.play('pteroOpen'); }
    }
  }
  for (const s of c.switches) s.t += dt;
  // winds: calm -> a warning -> a blow
  for (const z of c.zones) {
    if (z.kind === 'up') continue;
    if (!live) continue;
    z.t += dt;
    if (z.state === 'calm' && z.t >= P.gustCalm) { z.state = 'warn'; z.t = 0; if (Math.abs((z.x0 + z.x1) / 2 - pt.x) < 600) Sfx.play('pteroGustWarn'); }
    else if (z.state === 'warn' && z.t >= P.gustWarn) {
      z.state = 'blow'; z.t = 0;
      if (pt.x > z.x0 - 200 && pt.x < z.x1 + 50) {
        Sfx.play('pteroGust');
        pteroPop(st, pt.x, pt.y - 90, z.kind === 'down' ? 'WHOOSH! ↓' : '← WHOOSH!', '#d8f0ff', 22);
        pteroHintOnce(st, 'gust' + z.kind + st.k, st.flyer, z.kind === 'down' ? 'Downdraft! Only PERFECT flaps get through' : 'Headwind! Wait for it to calm, or push through');
      }
    } else if (z.state === 'blow' && z.t >= P.gustBlow) { z.state = 'calm'; z.t = 0; }
  }
  // smoke vents puff a sleepy smoke cloud: it rises to a height, naps there for a moment, then fades away
  for (const v of c.vents) {
    if (!live || Math.abs(v.x - pt.x) > 1400) continue;
    v.t += dt;
    const every = P.puffEvery * (st.puffGold ? 1.2 : 1);
    v.warn = v.t > every - P.puffWarn;
    if (v.t >= every) {
      v.t = 0; v.n = (v.n || 0) + 1;
      const lanes = [190, 330, 250, 300, 210];
      st.puffs.push({ x: v.x, y: pteroGY(st, v.x) - 6, r: 10, max: P.puffR * (st.puffGold ? 0.7 : 1), ty: lanes[(v.n + Math.round(v.x / 97)) % lanes.length], t: 0, life: P.puffLife, ph: Math.random() * 6, pop: 0 });
      if (Math.abs(v.x - pt.x) < 700) Sfx.play('pteroPuff');
    }
  }
  for (let i = st.puffs.length - 1; i >= 0; i--) {
    const q = st.puffs[i];
    q.t += dt;
    if (q.pop > 0) { q.pop += dt; if (q.pop > 0.4) st.puffs.splice(i, 1); continue; }
    q.y = approach(q.y, q.ty + Math.sin(q.t * 2 + q.ph) * 6, dt * P.puffV * (st.puffGold ? 0.75 : 1)); q.x -= dt * 8;
    q.r = approach(q.r, q.max, dt * 50);
    if (q.t > q.life) { q.pop = 0.01; continue; }
    // a puff on Petra or the hanger: ACHOO!
    if (live && pt.state !== 'landed' && pt.immune <= 0) {
      const hc = pteroHangPos(st);
      if (Math.hypot(q.x - (pt.x + 6), q.y - pt.y) < q.r + 30 || Math.hypot(q.x - hc.x, q.y - hc.y) < q.r + 10) {
        q.pop = 0.01; pt.immune = 1.2; pt.sneeze = 0.9; pt.vy = Math.max(pt.vy, 0) + 130; pt.vx *= 0.4; st.hg.om += 2;
        st.stats.sneezes++;
        pteroPop(st, pt.x + 40, pt.y - 60, 'Ah... ACHOO!', '#ffffff', 26);
        Sfx.play('pteroAchoo'); rumble(0, 0.3, 0.4, 160); rumble(1, 0.3, 0.4, 160);
        for (let k = 0; k < 12; k++) pteroPart(st, q.x, q.y, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, 0.6, k % 2 ? '#f3d9e8' : '#ffffff', 6, 0, 'puff');
        if (G.time - st.inT[st.flyer] < P.tryWin) st.roomSneeze++;
        pteroHintOnce(st, 'puff' + st.k, st.flyer, 'Smoke puffs make Petra sneeze! Fly around them');
        if (st.roomSneeze >= P.sneezeHelp && !st.puffGold) {
          st.puffGold = true; st.stats.helps++;
          pteroMsg(st, 'Gold breeze! Smaller, slower smoke puffs', C.gold, 3.6); Sfx.play('pteroHelp');
        }
      }
    }
  }
  for (const n of c.nests) { n.t += dt; n.joy = Math.max(0, n.joy - dt * 0.5); for (const b of n.babies) b.joy = Math.max(0, b.joy - dt * 0.4); }
  for (const t of c.trees) t.wob = Math.max(0, t.wob - dt * 1.5);
  for (const p of c.piles) p.took = Math.max(0, p.took - dt);
  // babies cheep when Petra flies near with fruit
  if (live && st.hg.item && st.hg.item.kind === 'fruit') {
    const n = c.nests.find(q => q.fed < q.need && q.x > pt.x - 40 && q.x - pt.x < 360);
    if (n && !n.cheeped) { n.cheeped = true; Sfx.play('pteroCheep'); pteroPop(st, n.x, n.y - 46, 'Cheep cheep!', '#fff6d0', 16); }
  }
}

/* ---------- what each job needs right now (the prompts, the panels and the computer read this) ---------- */
function pteroNeeds(st) {
  const P = PTERO, pt = st.pt, hg = st.hg, c = st.c;
  const out = { task: null, wantY: null, minY: 0, maxY: 999, gate: null, item: hg.item && hg.item.kind, cruiseY: null };
  if (!pt || pt.state === 'swap' || pt.state === 'finish') return out;
  const hc = pteroHangPos(st);
  // the next gate still shut
  const gate = c.gates.find(g => !g.passed && !g.opening && g.x > pt.x - 60);
  out.gate = gate || null;
  const swNext = gate ? gate.sw.find(s => !s.down && s.x > hc.x - 30) : null;
  const pileNext = gate && gate.sw.some(s => !s.down) ? gate.piles.find(p => p.x > hc.x - 18 && (!swNext || p.x < swNext.x)) : null;
  const limit = gate ? gate.x : Infinity;
  const nestAhead = xx => c.nests.find(n => n.fed < n.need && n.x > xx && n.x < limit && (!pileNext || n.x < pileNext.x));
  if (out.item === 'rock') {
    if (swNext) out.task = { kind: 'switch', x: swNext.x, y: swNext.y, ref: swNext };
    else if (!gate) out.task = { kind: 'drop', x: hc.x, y: hc.y };
  } else {
    // fruit: up to 3 in the leaf basket. Pick more while babies ahead still want it, feed the nearest hungry nest
    const held = out.item === 'fruit' ? hg.item.list.length : 0;
    let hungry = 0;
    for (const n of c.nests) if (n.fed < n.need && n.x > hc.x - 24 && n.x < limit && (!pileNext || n.x < pileNext.x)) hungry += n.need - n.fed;
    let fr = null;
    if (held < PTERO.basket && hungry > held) for (const t of c.trees) {
      if (t.taken || t.x < hc.x - 12 || t.x > limit) continue;
      if (pileNext && t.x > pileNext.x) continue;
      if (!nestAhead(t.x)) continue;
      if (!fr || t.x < fr.x) fr = t;
    }
    const n = held ? nestAhead(hc.x - 24) : null;
    if (n && (!fr || n.x < fr.x)) out.task = { kind: 'nest', x: n.x, y: n.y, ref: n };
    else if (held && pileNext && (!fr || pileNext.x < fr.x) && !n) out.task = pileNext.x - hc.x < 420 ? { kind: 'drop', x: hc.x, y: hc.y } : null;
    else if (!held && pileNext && (!fr || pileNext.x < fr.x)) out.task = { kind: 'rock', x: pileNext.x, y: pileNext.y - 14, ref: pileNext };
    else if (fr) out.task = { kind: 'fruit', x: fr.x, y: fr.y, ref: fr };
  }
  // the safe band for Petra in the next stretch
  const band = pteroBand(st, pt.x - 50, pt.x + 330);
  out.minY = band.top + P.top + 10;
  out.maxY = band.bot - P.feetY - 16;
  const tk = out.task;
  let want = null;
  if (tk && tk.kind === 'fruit') want = tk.y - P.hangCY;
  else if (tk && tk.kind === 'rock') want = tk.y - P.hangCY;
  else if (tk && tk.kind === 'nest') want = tk.y - 24 - P.hangCY;
  else if (tk && tk.kind === 'switch') want = tk.y - 120 - P.hangCY;
  out.cruiseY = (out.minY + out.maxY) / 2;
  out.wantY = clamp(want == null ? Math.min(out.cruiseY, 250) : want, out.minY, out.maxY);
  return out;
}

/* ---------- the swap at the perch and the Big Nest ---------- */
function pteroStartSwap(st) {
  const pt = st.pt, pr = st.c.perch;
  pt.state = 'swap'; pt.t = 0;
  st.stats.roomT[st.k] = G.time - st.segStart;
  st.swap = { t: 0, x0: pt.x, y0: pt.y, x1: pr.x - 10, y1: pr.y - PTERO.standH, f0: null, h0: null, said: false };
  if (st.hg.item) st.hg.item = null;
  pteroPop(st, pr.x, pr.y - 150, 'Swap jobs!', C.gold, 32);
  Sfx.play('pteroSwap'); rumble(0, 0.1, 0.4, 120); rumble(1, 0.1, 0.4, 120);
}
function pteroSwapStep(st, dt) {
  const P = PTERO, pt = st.pt, sw = st.swap;
  sw.t += dt;
  const u = pteroSmooth(sw.t / 1.0);
  pt.x = pteroLerp(sw.x0, sw.x1, u); pt.y = pteroLerp(sw.y0, sw.y1, u) - 40 * Math.sin(Math.PI * u);
  pteroWing(st, dt, false);
  if (sw.t > 1.0 && !sw.landed) {
    sw.landed = true; Sfx.play('pteroBoing');
    for (let i = 0; i < 24; i++) { const a = -Math.PI * Math.random(); pteroPart(st, pt.x, pt.y - 60, Math.cos(a) * 200, Math.sin(a) * 200, 0.9, ['#ff9a3d', '#7fd36a', '#5b95ff', C.gold][i % 4], 4, 400, 'conf'); }
  }
  if (sw.t > 1.35 && !sw.said) { sw.said = true; Sfx.play('pteroHop', 0); Sfx.play('pteroHop', 1); }
  if (sw.t >= P.swapT) {
    const L = G.level;
    if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return true; }
    pteroClear(st); return true;
  }
  return false;
}
function pteroStartFinish(st) {
  const pt = st.pt, bn = st.c.bigNest;
  pt.state = 'finish'; pt.t = 0;
  st.stats.roomT[st.k] = G.time - st.segStart;
  st.fin = { t: 0, x0: pt.x, y0: pt.y, x1: bn.x, y1: bn.y - 46, cleared: false };
  st.hg.item = null;
  pteroPop(st, bn.x, bn.y - 160, 'Special delivery!', C.gold, 30);
  Sfx.play('pteroSwap'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
}
function pteroFinStep(st, dt) {
  const P = PTERO, pt = st.pt, fin = st.fin;
  fin.t += dt;
  const u = pteroSmooth(fin.t / 1.2);
  pt.x = pteroLerp(fin.x0, fin.x1, u); pt.y = pteroLerp(fin.y0, fin.y1, u) - 50 * Math.sin(Math.PI * u);
  pteroWing(st, dt, false);
  if (fin.t > 1.2 && !fin.landed) {
    fin.landed = true; Sfx.play('pteroCheer');
    pteroPop(st, pt.x, pt.y - 120, 'Hooray! Everyone is home!', '#ffd75e', 26);
    for (let i = 0; i < 70; i++) confetti(pt.x - st.cam.x, pt.y - 80);
  }
  if (fin.t > 2.4 && !fin.toot) { fin.toot = true; Sfx.play('pteroNom'); }
  if (fin.t >= P.finT && !fin.cleared) { fin.cleared = true; pteroClear(st); return true; }
  return false;
}
function pteroClear(st) {
  const pt = st.pt;
  G.level.goal = { x: pt.x - st.cam.x, y: pt.y - 60 };
  levelClear();
}

/* ---------- prompts and hints ---------- */
function pteroHint(st, id, text, life) { if (pteroQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || PTERO.hintLife }; }
function pteroHintOnce(st, key, id, text) { if (st.hinted[key]) return; st.hinted[key] = true; pteroHint(st, id, text); }
function pteroMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function pteroPop(st, x, y, s, col, size) {
  // (a new word over one still showing goes on top of it, so they never print over each other)
  for (let k = 0; k < 4; k++) { const o = st.pops.find(q => q.t < 0.7 && Math.abs(q.x - x) < 110 && Math.abs(q.y - y) < 24); if (!o) break; y = o.y - 26; }
  st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 12) st.pops.shift();
}
function pteroPart(st, x, y, vx, vy, life, col, size, grav, kind) {
  if (st.parts.length > 320) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
// gentle lessons when they first matter (once each route)
function pteroNudges(st) {
  const pt = st.pt, nd = pteroNeeds(st), hc = pteroHangPos(st), tk = nd.task;
  pteroGrabWatch(st, tk, hc);
  if (pt.state !== 'fly') return;
  if (tk && (tk.kind === 'fruit' || tk.kind === 'rock') && Math.abs(tk.x - hc.x) < 160) {
    if (tk.y - hc.y > 60) pteroHintOnce(st, 'low' + tk.kind + st.k, st.flyer, 'Fly lower so ' + NAMES[st.hanger] + ' can reach! ' + pteroKey(st.flyer, 'down') + ' dives');
    else if (hc.y - tk.y > 60) pteroHintOnce(st, 'high' + tk.kind + st.k, st.flyer, 'Fly higher so ' + NAMES[st.hanger] + ' can reach!');
  }
  if (tk && tk.kind === 'fruit' && Math.abs(tk.x - hc.x) < 50 && Math.abs(tk.y - hc.y) < 50) pteroHintOnce(st, 'fruitNudge' + st.k, st.hanger, 'Grab the fruit! ' + pteroKey(st.hanger, 'act'));
  if (tk && tk.kind === 'rock' && Math.abs(tk.x - hc.x) < 50 && Math.abs(tk.y - hc.y) < 50) pteroHintOnce(st, 'rockNudge' + st.k, st.hanger, 'Grab a rock! ' + pteroKey(st.hanger, 'act'));
}
// a fruit or rock the hanger needed went by close but ungrabbed (twice in a route, with both playing): the gold
// Grabby net, announced, reaches further
function pteroGrabWatch(st, tk, hc) {
  const P = PTERO, cur = tk && (tk.kind === 'fruit' || tk.kind === 'rock') ? tk.ref : null, w = st.grabWatch;
  if (w && w.ref !== cur) {
    const missed = w.kind === 'fruit' ? !w.ref.taken : !(st.hg.item && st.hg.item.kind === 'rock');
    if (missed && w.both && w.minD < 110 && w.ref.x < hc.x - 10 && st.pt.state === 'fly') {
      st.roomGrabMiss++;
      if (st.roomGrabMiss >= P.grabHelp && !st.grabGold) {
        st.grabGold = true; st.stats.helps++;
        pteroMsg(st, 'Grabby net! ' + NAMES[st.hanger] + ' grabs fruit and rocks from further away', C.gold, 3.8); Sfx.play('pteroHelp');
      }
    }
    st.grabWatch = null;
  }
  if (cur) {
    if (!st.grabWatch) st.grabWatch = { ref: cur, kind: tk.kind, minD: 1e9, both: false };
    st.grabWatch.minD = Math.min(st.grabWatch.minD, Math.hypot(tk.x - hc.x, tk.y - hc.y));
    if (pteroBoth(st)) st.grabWatch.both = true;
  }
}
// the touch buttons and the top-bar legend name each player's own action this route: the flyer flaps, the hanger grabs
let pteroLabelEls = null;
function pteroActLabels(st) {
  try {
    if (!pteroLabelEls || !pteroLabelEls.every(o => document.contains(o.el))) pteroLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const ds = box && (box.dataset.p !== undefined ? box.dataset.p : box.dataset.legp);
      const id = ds !== undefined && ds !== null ? +ds : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of pteroLabelEls) {
      const want = o.id < 0 ? 'flap/grab' : o.id === st.flyer ? 'flap' : 'grab';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}
function pteroCam(st, dt) {
  const pt = st.pt, cam = st.cam;
  let tx = pt.x - PTERO.camLead + clamp(pt.vx * 0.5, -40, 70);
  if (pt.state === 'finish') tx = st.fin.x1 - 480;
  if (pt.state === 'swap') tx = st.swap.x1 - 420;
  cam.x += (tx - cam.x) * Math.min(1, dt * 4);
}
function pteroFx(st, dt) {
  const pt = st.pt;
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 5;
    if (q.kind === 'puff' || q.kind === 'dust') { q.vx *= 1 - dt * 2.5; q.vy *= 1 - dt * 2.5; }
    if (q.kind === 'leaf') { q.vx *= 1 - dt * 1.5; q.vy = Math.min(q.vy, 70); }
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.2);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  pt.tilt = approach(pt.tilt, clamp(pt.vy / 700, -0.22, 0.22) + (pt.state === 'back' ? -0.1 : 0), dt * 2);
  pt.blink = (pt.blink || 0) - dt;
  if (pt.blink < -3 - Math.random() * 3) pt.blink = 0.14;
  // wind streaks in an updraft
  for (const z of st.c.zones) {
    if (z.x1 < st.cam.x - 40 || z.x0 > st.cam.x + W + 40) continue;
    if (z.kind === 'up' && Math.random() < dt * 9) pteroPart(st, z.x0 + Math.random() * (z.x1 - z.x0), pteroGY(st, z.x0) - 10, (Math.random() - 0.5) * 20, -200 - Math.random() * 80, 1.6, Math.random() < 0.5 ? '#7fcf5a' : '#b8e68a', 4, -20, 'leaf');
  }
}
// copy the job positions into the engine players (screen px): name tags, bubbles and drawPlayer read p.x / p.y
function pteroMirror(st) {
  const P = PTERO, pt = st.pt, cam = st.cam, ps = G.players;
  const feet = [null, null];
  feet[st.flyer] = { x: pt.x + P.seatX, y: pt.y + P.seatY };
  const hc = pteroHangPos(st);
  feet[st.hanger] = { x: hc.x, y: hc.y + 13 };
  for (const p of ps) {
    const f = feet[p.id];
    p.x = f.x - cam.x - PW / 2; p.y = f.y - PH;
    p.alive = true; p.grounded = true; p.stompSafe = 0; p.vy = 0;
    p.face = 1; p.vx = pt.vx; p.stun = 0;
  }
}

// the medal times (s) for MODES.ptero.medals: Gold also needs 75% of the babies fed, Silver 40%
// (bot pairs clear in about 256-267 s with 17-19 of 20 fed; noisy bots in 300-485 s)
const PTERO_MEDAL = { gold: 300, silver: 450 };
MODES.ptero = {
  // medal goals (js/medals.js): time, and the share of the baby dinos fed
  medals: { bronze: 'Fly all four routes', goals: [
    { key: 'time', gold: PTERO_MEDAL.gold, silver: PTERO_MEDAL.silver },
    { key: 'fed', gold: 0.75, silver: 0.4, more: true, pct: true, word: 'the babies fed', text: n => `Feed at least ${Math.round(n * 100)}% of the babies`,
      gap: (v, n) => `${Math.max(1, Math.ceil((n - v) * 100))}% more of the babies fed` },
  ] },
  medalValues() { const s = G.mst.stats; return s ? { fed: s.wanted ? s.fed / s.wanted : 1 } : {}; },
  PTERO,
  needs: pteroNeeds, reach: pteroReach, gy: pteroGY, cy: pteroCY, hangPos: pteroHangPos, hangVel: pteroHangVel, predict: pteroPredict, pathHit: (st, pts) => pteroPathHit(st, pts), pivot: pteroPivot, wingCfg: pteroWingCfg,
  setup(st, L) {
    // how many babies wait in all four routes (for the medal)
    let wanted = 0;
    const rooms = (LEVELS[G.levelIndex] && LEVELS[G.levelIndex].rooms) || [L.def];
    for (const r of rooms) for (const tk of r.course || []) { const t = String(tk); if (t[0] === 'n' && t[1] === ':') wanted += +(t.split(':')[2] || 1); }
    st.stats = { fed: 0, wanted, missed: 0, perfect: [0, 0], good: [0, 0], flaps: [0, 0], lands: 0, bonks: 0, sneezes: 0, grabs: [0, 0], switches: [0, 0], swingT: [0, 0], helps: 0, roomT: [], roomFed: [], roomTitles: [] };
    pteroRoom(st, L, 0);
  },
  room(k, L) { pteroRoom(G.mst, L, k); },
  step(dt) { pteroStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then, and drawn by the mode instead
  draw() {
    const st = G.mst;
    if (!st.pt) return;
    pteroDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.pt) return;
    pteroDrawFront(st);
  },
  hud() { const st = G.mst; if (st.pt) pteroHud(st); },
  stats() {
    const s = G.mst.stats;
    if (!s) return [];
    const frac = s.wanted ? s.fed / s.wanted : 1, oops = s.lands + s.bonks + s.sneezes;
    const out = [
      { label: 'Babies fed', value: s.fed + ' of ' + s.wanted },
      { label: 'Perfect flaps', values: s.perfect.slice() },
      { label: 'Bumps', value: oops },
    ];
    let best = -1;
    s.roomFed.forEach((f, k) => { if (s.roomT[k] == null) return; if (best < 0 || s.roomT[k] < s.roomT[best]) best = k; });
    const words = frac >= 0.95 ? 'Every baby dino is full and happy. Super delivery!' : frac >= 0.6 ? 'Lots of happy, full baby dinos!' : 'Petra got you home. The babies want more fruit next time!';
    out.push(best >= 0 ? words + ' Quickest route: ' + s.roomTitles[best] + '.' : words);
    if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
    return out;
  },
};

/* ---------- drawing ---------- */
const pteroSkyG = {};
function pteroDrawWorld(st) {
  pteroDrawSky(st);
  pteroDrawFar(st);
  pteroDrawMid(st);
  pteroDrawDeco(st);
  pteroDrawZones(st, false);
  pteroDrawGround(st);
  pteroDrawRoof(st);
  pteroDrawSigns(st);
  pteroDrawPerch(st);
  pteroDrawTrees(st);
  pteroDrawPiles(st);
  pteroDrawSwitches(st);
  pteroDrawNests(st);
  pteroDrawVents(st);
  pteroDrawRests(st);
  pteroDrawGates(st);
}
function pteroDrawFront(st) {
  pteroDrawPath(st);
  pteroDrawPtero(st);
  pteroDrawDrops(st);
  pteroDrawPuffs(st);
  pteroDrawZones(st, true);
  for (const q of st.parts) {
    const a = clamp(q.life / q.max, 0, 1), x = q.x - st.cam.x, y = q.y;
    if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
    ctx.globalAlpha = q.kind === 'puff' || q.kind === 'dust' ? a * 0.8 : a; ctx.fillStyle = q.col;
    if (q.kind === 'spark') { pteroStar(x, y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
    else if (q.kind === 'conf') { ctx.save(); ctx.translate(x, y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
    else if (q.kind === 'puff' || q.kind === 'dust') { circle(x, y, q.size * (1.5 - 0.6 * a)); ctx.fill(); }
    else if (q.kind === 'leaf') { ctx.save(); ctx.translate(x, y); ctx.rotate(q.r); ctx.beginPath(); ctx.ellipse(0, 0, q.size * 1.4, q.size * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    else if (q.kind === 'heart') pteroHeart(x, y, q.size * (0.6 + 0.4 * a), q.col);
    else { circle(x, y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  const big = hudBig();
  for (const q of st.pops) {
    const x = clamp(q.x - st.cam.x, 90, W - 90), y = clamp(q.y - q.t * 34, 80, H - 90);
    ctx.globalAlpha = clamp((1.2 - q.t) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.3 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
    ctx.globalAlpha = 1;
  }
}
function pteroStar(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
function pteroHeart(x, y, s, col) {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.2, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.6, y - s * 1.2, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  ctx.fill();
}
function pteroDrawSky(st) {
  const pal = st.pal, key = st.palKey;
  if (!pteroSkyG[key]) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, pal.sky[0]); g.addColorStop(0.55, pal.sky[1]); g.addColorStop(1, pal.sky[2]);
    pteroSkyG[key] = g;
  }
  ctx.fillStyle = pteroSkyG[key]; ctx.fillRect(0, 0, W, H);
  // the sun (a sleepy, smiley morning sun)
  const sx = key === 'volcano' ? 220 : 770, sy = key === 'volcano' ? 300 : 110;
  ctx.fillStyle = 'rgba(255,240,190,0.25)'; circle(sx, sy, 86); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,190,0.35)'; circle(sx, sy, 62); ctx.fill();
  ctx.fillStyle = pal.sun; circle(sx, sy, 44); ctx.fill();
  // clouds drifting by
  for (let i = 0; i < 6; i++) {
    const span = W + 360, x = ((i * 260 - st.cam.x * (0.04 + (i % 3) * 0.02) + G.clock * (5 + i)) % span + span) % span - 180;
    const y = 70 + (i % 3) * 44 + (i * 37) % 30;
    pteroCloud(x, y, 0.7 + (i % 3) * 0.25, pal.cloud);
  }
}
function pteroCloud(x, y, s, col, flat) {
  if (!flat) {
    // a soft shaded underside and a bright top, then the cloud itself
    ctx.fillStyle = 'rgba(150,120,140,0.18)';
    ctx.beginPath(); ctx.ellipse(x + 3 * s, y + 5 * s, 46 * s, 15 * s, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(x, y, 46 * s, 16 * s, 0, 0, Math.PI * 2); ctx.fill();
  circle(x - 18 * s, y - 8 * s, 18 * s); ctx.fill(); circle(x + 10 * s, y - 14 * s, 22 * s); ctx.fill(); circle(x + 32 * s, y - 4 * s, 14 * s); ctx.fill();
  if (!flat) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; circle(x + 4 * s, y - 22 * s, 10 * s); ctx.fill(); circle(x - 22 * s, y - 13 * s, 7 * s); ctx.fill(); }
}
// far mountains and the sleepy volcano (always puffing little smoke rings)
function pteroDrawFar(st) {
  const pal = st.pal, off = st.cam.x * 0.08, hy = 330;
  const yAt = sx => hy - 40 + Math.sin((sx + off) * 0.006) * 34 + Math.sin((sx + off) * 0.013 + 1) * 16;
  // the volcano
  const vk = st.palKey === 'volcano', VW = 2600, vb = vk ? 640 : 520;
  for (const rep of [-1, 0, 1]) {
    const vx = vb - ((st.cam.x * (vk ? 0.12 : 0.06)) % VW) + rep * VW;
    if (vx < -320 || vx > W + 320) continue;
    const s = vk ? 1.35 : 0.9, top = 360 - 200 * s;
    ctx.fillStyle = vk ? '#5d4060' : pal.far2;
    ctx.beginPath(); ctx.moveTo(vx - 230 * s, 380); ctx.quadraticCurveTo(vx - 70 * s, top + 40 * s, vx - 34 * s, top); ctx.lineTo(vx + 34 * s, top); ctx.quadraticCurveTo(vx + 70 * s, top + 40 * s, vx + 230 * s, 380); ctx.fill();
    // the shady right flank, rock gullies and a lit left edge
    ctx.fillStyle = 'rgba(40,20,40,0.14)';
    ctx.beginPath(); ctx.moveTo(vx + 6 * s, top); ctx.lineTo(vx + 34 * s, top); ctx.quadraticCurveTo(vx + 70 * s, top + 40 * s, vx + 230 * s, 380); ctx.lineTo(vx + 60 * s, 380); ctx.quadraticCurveTo(vx + 40 * s, top + 90 * s, vx + 6 * s, top); ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,40,0.16)'; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
    for (const [a, b] of [[-26, -110], [26, 120], [-8, -40], [10, 54]]) { ctx.beginPath(); ctx.moveTo(vx + a * s, top + 14 * s); ctx.quadraticCurveTo(vx + (a + b) * 0.45 * s, top + 110 * s, vx + b * s, 376); ctx.stroke(); }
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(255,240,230,0.35)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(vx - 228 * s, 378); ctx.quadraticCurveTo(vx - 70 * s, top + 40 * s, vx - 34 * s, top); ctx.stroke();
    ctx.fillStyle = vk ? '#ff9a6a' : '#e6977a'; ctx.beginPath(); ctx.ellipse(vx, top + 2, 34 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,150,' + (0.35 + 0.15 * Math.sin(G.clock * 1.6)) + ')'; ctx.beginPath(); ctx.ellipse(vx, top + 1, 22 * s, 3.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    // a sleepy face on the volcano
    ctx.strokeStyle = vk ? '#3a2840' : 'rgba(60,40,50,0.5)'; ctx.lineWidth = 3 * s;
    for (const ex of [-22, 22]) { ctx.beginPath(); ctx.arc(vx + ex * s, top + 62 * s, 7 * s, 0.2, Math.PI - 0.2); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(vx, top + 82 * s, 10 * s, 0.3, Math.PI - 0.3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,140,150,0.35)'; circle(vx - 38 * s, top + 78 * s, 8 * s); ctx.fill(); circle(vx + 38 * s, top + 78 * s, 8 * s); ctx.fill();
    // smoke rings
    for (let i = 0; i < 4; i++) {
      const u = ((G.clock * 0.12 + i / 4) % 1), r = (12 + u * 40) * s;
      ctx.globalAlpha = 0.55 * (1 - u); ctx.fillStyle = vk ? '#f3d0e0' : '#ffffff';
      pteroCloud(vx + Math.sin(u * 5 + i) * 16 * s, top - 14 - u * 170 * s, r / 30, ctx.fillStyle, true);
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = pal.far;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let sx = 0; sx <= W; sx += 16) ctx.lineTo(sx, yAt(sx));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = tint(pal.far, 0.25); ctx.lineWidth = 2.5;
  ctx.beginPath(); for (let sx = 0; sx <= W; sx += 16) sx ? ctx.lineTo(sx, yAt(sx) + 1.5) : ctx.moveTo(sx, yAt(sx) + 1.5); ctx.stroke();
}
// the nearer jungle hills with palm silhouettes
function pteroDrawMid(st) {
  const pal = st.pal, off = st.cam.x * 0.3, hy = 372;
  const yAt = sx => hy + Math.sin((sx + off) * 0.005 + 2) * 18 + Math.sin((sx + off) * 0.012) * 8;
  ctx.fillStyle = pal.mid;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let sx = 0; sx <= W; sx += 16) ctx.lineTo(sx, yAt(sx));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = tint(pal.mid, 0.22); ctx.lineWidth = 3;
  ctx.beginPath(); for (let sx = 0; sx <= W; sx += 16) sx ? ctx.lineTo(sx, yAt(sx) + 2) : ctx.moveTo(sx, yAt(sx) + 2); ctx.stroke();
  const TW = 110;
  ctx.fillStyle = pal.midDark; ctx.strokeStyle = pal.midDark;
  for (let k = Math.floor(off / TW) - 1; k < Math.floor(off / TW) + W / TW + 2; k++) {
    const h = hash(k, 41), sx = k * TW - off + (h % 60), gy = yAt(sx) + 4;
    if (h % 3 === 0) {   // a palm
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx, gy); ctx.quadraticCurveTo(sx + 8, gy - 30, sx + 4, gy - 58); ctx.stroke();
      for (let j = 0; j < 5; j++) { const a = -Math.PI / 2 + (j - 2) * 0.55; ctx.beginPath(); ctx.ellipse(sx + 4 + Math.cos(a) * 14, gy - 58 + Math.sin(a) * 8 + 6, 16, 4, a, 0, Math.PI * 2); ctx.fill(); }
    } else if (h % 3 === 1) {   // a fern clump
      for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.ellipse(sx + j * 9, gy - 8, 5, 14, (j - 1.5) * 0.4, 0, Math.PI * 2); ctx.fill(); }
    }
  }
}
// friendly dinos standing in the back
function pteroDrawDeco(st) {
  const cam = st.cam;
  for (const d of st.c.deco) {
    const x = d.x - cam.x;
    if (x < -260 || x > W + 260) continue;
    const gy = pteroGY(st, d.x);
    if (d.kind === 'bronto') pteroBronto(x, gy, 1, G.clock + d.x * 0.01);
    else if (d.kind === 'trike') pteroTrike(x, gy, 1, G.clock + d.x * 0.01);
    else if (d.kind === 'stego') pteroStego(x, gy, 1, G.clock + d.x * 0.01);
    else if (d.kind === 'eggs') pteroEggs(x, gy);
    else if (d.kind === 'ferns') pteroFerns(x, gy, st.pal);
  }
}
function pteroDinoEye(x, y, r, blink) {
  if (blink) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0.2, Math.PI - 0.2); ctx.stroke(); return; }
  ctx.fillStyle = '#ffffff'; circle(x, y, r); ctx.fill();
  ctx.fillStyle = C.ink; circle(x + r * 0.25, y + r * 0.1, r * 0.55); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(x + r * 0.45, y - r * 0.25, r * 0.2); ctx.fill();
}
function pteroBronto(x, gy, s, t) {
  ctx.save(); ctx.translate(x, gy); ctx.scale(s, s);
  const neck = Math.sin(t * 0.7) * 0.08, col = '#7fb9a0', dark = '#5c9580';
  ctx.fillStyle = dark;
  for (const lx of [-44, -18, 22, 46]) { ctx.fillRect(lx - 8, -46, 16, 46); }
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(0, -62, 70, 34, 0, 0, Math.PI * 2); ctx.fill();
  // tail
  ctx.beginPath(); ctx.moveTo(-60, -70); ctx.quadraticCurveTo(-120, -60, -150, -30); ctx.quadraticCurveTo(-110, -50, -60, -48); ctx.fill();
  // neck and head
  ctx.save(); ctx.translate(46, -78); ctx.rotate(neck);
  ctx.beginPath(); ctx.moveTo(-14, 10); ctx.quadraticCurveTo(30, -40, 40, -120); ctx.lineTo(62, -118); ctx.quadraticCurveTo(48, -40, 20, 16); ctx.fill();
  ctx.beginPath(); ctx.ellipse(58, -124, 22, 13, 0.1, 0, Math.PI * 2); ctx.fill();
  pteroDinoEye(60, -128, 4.5, Math.sin(t * 1.3) > 0.97);
  ctx.strokeStyle = '#3c6e5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(68, -120, 6, 0.2, Math.PI - 0.6); ctx.stroke();
  ctx.fillStyle = 'rgba(255,140,150,0.5)'; circle(52, -118, 4); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(-10, -74, 40, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a9d8c2';
  for (const [sx, sy] of [[-20, -80], [6, -88], [30, -78]]) { circle(sx, sy, 5); ctx.fill(); }
  ctx.restore();
}
function pteroTrike(x, gy, s, t) {
  ctx.save(); ctx.translate(x, gy); ctx.scale(s, s);
  const bob = Math.abs(Math.sin(t * 2)) * 2, col = '#e8a35c', dark = '#c47f3c';
  ctx.fillStyle = dark; for (const lx of [-24, -8, 12, 26]) ctx.fillRect(lx - 5, -22, 10, 22);
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, -30 - bob, 40, 20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-36, -34); ctx.quadraticCurveTo(-60, -30, -66, -18); ctx.quadraticCurveTo(-50, -24, -36, -22); ctx.fill();
  // frill and head
  ctx.fillStyle = '#ffcf7a'; ctx.beginPath(); ctx.ellipse(36, -44 - bob, 20, 24, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff8f6a'; for (let i = 0; i < 6; i++) { const a = -1.9 + i * 0.5; circle(36 + Math.cos(a) * 20, -44 - bob + Math.sin(a) * 22, 3); ctx.fill(); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(50, -32 - bob, 18, 13, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff6e0';
  ctx.beginPath(); ctx.moveTo(50, -44 - bob); ctx.quadraticCurveTo(62, -58, 70, -60 - bob); ctx.quadraticCurveTo(62, -50, 56, -42 - bob); ctx.fill();
  ctx.beginPath(); ctx.moveTo(64, -30 - bob); ctx.lineTo(74, -36 - bob); ctx.lineTo(67, -27 - bob); ctx.fill();
  pteroDinoEye(52, -38 - bob, 3.5, Math.sin(t * 1.7) > 0.96);
  ctx.strokeStyle = '#8a4f22'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(58, -27 - bob, 5, 0.3, Math.PI - 0.5); ctx.stroke();
  ctx.restore();
}
function pteroStego(x, gy, s, t) {
  ctx.save(); ctx.translate(x, gy); ctx.scale(s, s);
  const col = '#b3a3e6', dark = '#8d7cc4';
  ctx.fillStyle = '#ff9fb8';
  for (let i = 0; i < 5; i++) { const px = -30 + i * 14, py = -52 - Math.sin(i / 4 * Math.PI) * 10; ctx.beginPath(); ctx.moveTo(px - 8, py + 10); ctx.lineTo(px, py - 14); ctx.lineTo(px + 8, py + 10); ctx.fill(); }
  ctx.fillStyle = dark; for (const lx of [-22, -6, 12, 24]) ctx.fillRect(lx - 5, -22, 10, 22);
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, -32, 40, 20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-34, -34); ctx.quadraticCurveTo(-64, -34, -72, -20); ctx.quadraticCurveTo(-52, -24, -34, -22); ctx.fill();
  ctx.beginPath(); ctx.ellipse(44, -24, 14, 10, 0.3, 0, Math.PI * 2); ctx.fill();
  pteroDinoEye(48, -27, 3.2, Math.sin(t * 1.5 + 1) > 0.96);
  ctx.strokeStyle = '#5d4c94'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(52, -20, 4, 0.3, Math.PI - 0.6); ctx.stroke();
  ctx.restore();
}
function pteroEggs(x, gy) {
  const cols = ['#fff3d6', '#d9f0ff', '#ffe0ec'];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.ellipse(x - 16 + i * 16, gy - 12, 9, 12, (i - 1) * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(120,90,60,0.25)'; circle(x - 18 + i * 16, gy - 14, 2); ctx.fill(); circle(x - 13 + i * 16, gy - 8, 1.6); ctx.fill();
  }
}
function pteroFerns(x, gy, pal) {
  ctx.fillStyle = pal.grassDark;
  for (let j = 0; j < 6; j++) { ctx.beginPath(); ctx.ellipse(x + (j - 2.5) * 8, gy - 14, 4, 18, (j - 2.5) * 0.35, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = pal.grass;
  for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.ellipse(x + (j - 1.5) * 9, gy - 10, 3, 13, (j - 1.5) * 0.4, 0, Math.PI * 2); ctx.fill(); }
}
// the ground: dirt with a grassy top, ferns and pebbles
function pteroDrawGround(st) {
  const pal = st.pal, cam = st.cam, xa = Math.floor((cam.x - 20) / 8) * 8, xb = cam.x + W + 20;
  ctx.fillStyle = pal.dirt;
  ctx.beginPath(); ctx.moveTo(xa - cam.x, H + 10);
  for (let x = xa; x <= xb; x += 8) ctx.lineTo(x - cam.x, pteroGY(st, x));
  ctx.lineTo(xb - cam.x, H + 10); ctx.closePath(); ctx.fill();
  const band = (off, wdt, a) => {
    ctx.lineWidth = wdt; ctx.globalAlpha = a;
    ctx.beginPath(); for (let x = xa; x <= xb; x += 8) { const y = pteroGY(st, x) + off; if (x === xa) ctx.moveTo(x - cam.x, y); else ctx.lineTo(x - cam.x, y); } ctx.stroke();
  };
  ctx.strokeStyle = pal.dirtDark;
  band(120, 90, 0.4); band(12, 12, 0.25);
  band(40, 6, 0.45); band(80, 6, 0.45);
  ctx.globalAlpha = 1;
  // buried rocks with a lit top
  for (let x = Math.floor(xa / 140) * 140; x < xb; x += 140) {
    const h = hash(x, 77); if (h % 3) continue;
    const bx = x - cam.x + (h % 80), by = pteroGY(st, x) + 60 + (h % 40), bw = 14 + (h % 10);
    ctx.fillStyle = '#9a8a7c'; ctx.beginPath(); ctx.ellipse(bx, by, bw, bw * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7d6e62'; ctx.beginPath(); ctx.ellipse(bx + 2, by + 2, bw * 0.85, bw * 0.45, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(bx - bw * 0.3, by - bw * 0.25, bw * 0.35, bw * 0.14, -0.2, 0, Math.PI * 2); ctx.fill();
  }
  // pebbles and fossils (a friendly bone or a shell now and then)
  for (let x = Math.floor(xa / 46) * 46; x < xb; x += 46) {
    const h = hash(x, 19), y = pteroGY(st, x) + 18 + (h % 50);
    if (h % 9 === 0) { ctx.strokeStyle = 'rgba(255,240,220,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x - cam.x, y, 6, 0, Math.PI * 1.6); ctx.stroke(); ctx.beginPath(); ctx.arc(x - cam.x, y, 3, 0, Math.PI * 1.6); ctx.stroke(); }
    else if (h % 4 === 0) { ctx.fillStyle = pal.dirtDark; ctx.beginPath(); ctx.ellipse(x - cam.x, y, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.lineJoin = 'round';
  ctx.strokeStyle = pal.grassDark; ctx.lineWidth = 10;
  ctx.beginPath(); for (let x = xa; x <= xb; x += 8) { const y = pteroGY(st, x) + 2; if (x === xa) ctx.moveTo(x - cam.x, y); else ctx.lineTo(x - cam.x, y); } ctx.stroke();
  ctx.strokeStyle = pal.grass; ctx.lineWidth = 6;
  ctx.beginPath(); for (let x = xa; x <= xb; x += 8) { const y = pteroGY(st, x) - 1; if (x === xa) ctx.moveTo(x - cam.x, y); else ctx.lineTo(x - cam.x, y); } ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,230,0.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); for (let x = xa; x <= xb; x += 8) { const y = pteroGY(st, x) - 3.5; if (x === xa) ctx.moveTo(x - cam.x, y); else ctx.lineTo(x - cam.x, y); } ctx.stroke();
  ctx.fillStyle = pal.grassDark;
  for (let x = Math.floor(xa / 14) * 14; x < xb; x += 14) { const y = pteroGY(st, x + 7) + 5; ctx.beginPath(); ctx.arc(x - cam.x + 7, y, 5 + (hash(x, 3) % 3), 0, Math.PI); ctx.fill(); }
  // grass tufts and little flowers
  for (let x = Math.floor(xa / 34) * 34; x < xb; x += 34) {
    const h = hash(x, 23), y = pteroGY(st, x) - 2, sx = x - cam.x + (h % 14);
    ctx.fillStyle = pal.grassDark;
    if (h % 3 === 0) { for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.ellipse(sx + (j - 1) * 4, y - 6, 2, 8, (j - 1) * 0.4, 0, Math.PI * 2); ctx.fill(); } }
    else if (h % 5 === 1) { ctx.fillStyle = ['#ffd84d', '#ff8fb5', '#ffffff'][h % 3]; circle(sx, y - 6, 3); ctx.fill(); ctx.fillStyle = '#ffb347'; circle(sx, y - 6, 1.2); ctx.fill(); }
  }
}
// the canyon roof: rock hanging down with friendly stalactites
function pteroDrawRoof(st) {
  const pal = st.pal, cam = st.cam, xa = Math.floor((cam.x - 20) / 8) * 8, xb = cam.x + W + 20;
  let any = false;
  for (let x = xa; x <= xb; x += 24) if (pteroCY(st, x) > PTERO.ceil0 + 4) { any = true; break; }
  if (!any) return;
  ctx.fillStyle = pal.rock;
  ctx.beginPath(); ctx.moveTo(xa - cam.x, -10);
  for (let x = xa; x <= xb; x += 8) { const cy = pteroCY(st, x); ctx.lineTo(x - cam.x, cy > PTERO.ceil0 + 2 ? cy : -10); }
  ctx.lineTo(xb - cam.x, -10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = pal.rockDark; ctx.lineWidth = 4;
  ctx.beginPath();
  let pen = false;
  for (let x = xa; x <= xb; x += 8) { const cy = pteroCY(st, x); if (cy > PTERO.ceil0 + 2) { if (!pen) { ctx.moveTo(x - cam.x, cy); pen = true; } else ctx.lineTo(x - cam.x, cy); } else pen = false; }
  ctx.stroke();
  // stripes in the rock and stalactites along its edge
  ctx.globalAlpha = 0.25; ctx.fillStyle = pal.rockDark;
  for (let x = Math.floor(xa / 60) * 60; x < xb; x += 60) { const cy = pteroCY(st, x); if (cy > 110) { ctx.fillRect(x - cam.x, cy - 40, 60, 8); ctx.fillRect(x - cam.x + 20, cy - 80, 50, 6); } }
  ctx.globalAlpha = 1;
  for (let x = Math.floor(xa / 38) * 38; x < xb; x += 38) {
    const cy = pteroCY(st, x), h = hash(x, 5);
    if (cy < PTERO.ceil0 + 30) continue;
    const len = 10 + (h % 12);
    ctx.fillStyle = pal.rock; ctx.beginPath(); ctx.moveTo(x - cam.x - 8, cy - 2); ctx.quadraticCurveTo(x - cam.x, cy + len * 1.4, x - cam.x + 8, cy - 2); ctx.fill();
    ctx.strokeStyle = pal.rockDark; ctx.lineWidth = 2; ctx.stroke();
  }
}
function pteroDrawSigns(st) {
  const cam = st.cam;
  for (const s of st.c.signs) {
    const x = s.x - cam.x;
    if (x < -260 || x > W + 260) continue;
    const gy = pteroGY(st, s.x);
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = Math.min(320, ctx.measureText(s.text).width + 22);
    ctx.fillStyle = 'rgba(30,20,10,0.18)'; ctx.beginPath(); ctx.ellipse(x, gy + 1, 14, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7d5530'; ctx.fillRect(x - 3, gy - 46, 6, 46);
    ctx.fillStyle = '#5e3e22'; ctx.fillRect(x + 1, gy - 46, 2, 46);
    ctx.fillStyle = 'rgba(40,25,10,0.2)'; rr(x - w / 2 + 2, gy - 71, w, 30, 7); ctx.fill();
    ctx.fillStyle = '#c9925a'; rr(x - w / 2, gy - 74, w, 30, 7); ctx.fill();
    ctx.fillStyle = '#b98250'; rr(x - w / 2, gy - 50, w, 6, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x - w / 2 + 7, gy - 71.5, w - 14, 1.5);
    ctx.strokeStyle = '#7d5530'; ctx.lineWidth = 2.5; rr(x - w / 2, gy - 74, w, 30, 7); ctx.stroke();
    text(s.text, x, gy - 58.5, 13, '#3a2410', 'center', 'body');
  }
}
// the hanger's little leaf basket with up to 3 fruit in it
function pteroBasket(x, y, list, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  list.forEach((f, i) => pteroFruit((i - (list.length - 1) / 2) * 9, -6 - (i === 1 ? 4 : 0), f, 0.75));
  ctx.fillStyle = '#5fae3e'; ctx.beginPath(); ctx.moveTo(-13, -4); ctx.quadraticCurveTo(0, 14, 13, -4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#3f8f3a'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(0, 6); ctx.lineTo(6, 0); ctx.stroke();
  ctx.restore();
}
// a piece of fruit (also used in the HUD)
function pteroFruit(x, y, kind, s, rot) {
  const f = PTERO_FRUIT[kind] || PTERO_FRUIT.mango;
  ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1); if (rot) ctx.rotate(rot);
  if (kind === 'banana') {
    ctx.fillStyle = f.col; ctx.strokeStyle = f.dark; ctx.lineWidth = 1.5;
    for (const a of [-0.5, 0, 0.5]) { ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(10, 2, 2, 14); ctx.quadraticCurveTo(4, 2, -3, -7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = '#7a5a2a'; ctx.fillRect(-2, -11, 4, 4);
  } else if (kind === 'berry') {
    ctx.fillStyle = f.col; for (const [bx, by] of [[-5, -2], [5, -2], [0, 3], [-4, 7], [4, 7], [0, -6]]) { circle(bx, by, 4.6); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; circle(-6, -4, 1.4); ctx.fill(); circle(4, -4, 1.4); ctx.fill();
    ctx.fillStyle = f.leaf; ctx.beginPath(); ctx.ellipse(2, -11, 6, 2.5, -0.4, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'melon') {
    ctx.fillStyle = f.col; circle(0, 1, 11); ctx.fill();
    ctx.strokeStyle = f.dark; ctx.lineWidth = 2; for (const a of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.ellipse(0, 1, 11 * Math.abs(Math.cos(a + 1.2)) + 2, 11, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; circle(-4, -4, 3); ctx.fill();
  } else {
    ctx.fillStyle = f.col; ctx.beginPath(); ctx.ellipse(0, 1, kind === 'apple' ? 10 : 9, kind === 'apple' ? 10 : 11.5, kind === 'mango' ? 0.3 : 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(-3.5, -3, 2.5, 4, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-1, -12, 2, 5);
    ctx.fillStyle = f.leaf; ctx.beginPath(); ctx.ellipse(5, -10, 6, 2.6, -0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function pteroDrawTrees(st) {
  const cam = st.cam, nd = pteroNeeds(st), tk = nd.task;
  for (const t of st.c.trees) {
    const x = t.x - cam.x;
    if (x < -120 || x > W + 120) continue;
    const gy = pteroGY(st, t.x), topY = t.y - 26, sway = Math.sin(G.clock * 1.4 + t.x) * 3 + t.wob * Math.sin(G.clock * 30) * 4;
    ctx.save();
    if (t.palm) {
      ctx.strokeStyle = '#a8754a'; ctx.lineWidth = 11; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.quadraticCurveTo(x - 16, (gy + topY) / 2, x + sway, topY); ctx.stroke();
      ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 2;
      for (let yy = gy - 14; yy > topY + 8; yy -= 14) { const u = (gy - yy) / (gy - topY), xx = pteroLerp(x, x + sway, u) - 16 * 2 * u * (1 - u) * 2; ctx.beginPath(); ctx.moveTo(xx - 5, yy); ctx.lineTo(xx + 5, yy - 3); ctx.stroke(); }
      ctx.lineCap = 'butt';
      for (let j = 0; j < 6; j++) {
        const a = -Math.PI / 2 + (j - 2.5) * 0.62 + Math.sin(G.clock * 1.2 + j) * 0.05;
        ctx.fillStyle = j % 2 ? '#4f9a3c' : '#62b04a';
        ctx.beginPath(); ctx.ellipse(x + sway + Math.cos(a) * 24, topY + Math.sin(a) * 12 + 8, 28, 7, a, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.fillStyle = '#8a5a34'; ctx.beginPath(); ctx.moveTo(x - 8, gy); ctx.lineTo(x - 5, topY); ctx.lineTo(x + 5, topY); ctx.lineTo(x + 8, gy); ctx.fill();
      ctx.fillStyle = '#4f9a3c'; circle(x - 20 + sway, topY - 4, 22); ctx.fill(); circle(x + 18 + sway, topY - 2, 20); ctx.fill();
      ctx.fillStyle = '#62b04a'; circle(x + sway, topY - 20, 26); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; circle(x - 8 + sway, topY - 28, 10); ctx.fill();
    }
    if (!t.taken) {
      const fx = x + sway * 0.8, fy = t.y + Math.sin(G.clock * 2 + t.x) * 1.5;
      if (tk && tk.ref === t && G.introT <= 0) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(G.clock * 6); ctx.fillStyle = '#fff6b0'; circle(fx, fy, 20); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.strokeStyle = '#5a7a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, topY + 6); ctx.lineTo(fx, fy - 10); ctx.stroke();
      pteroFruit(fx, fy, t.fruit, 1.15);
    }
    ctx.restore();
  }
}
function pteroRock(x, y, r, col) {
  ctx.fillStyle = col || '#a8a29a'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.15, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.35, r * 0.4, r * 0.28, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(60,50,40,0.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, r * 1.15, r, 0, 0, Math.PI * 2); ctx.stroke();
}
function pteroDrawPiles(st) {
  const cam = st.cam, pal = st.pal, nd = pteroNeeds(st), tk = nd.task;
  for (const p of st.c.piles) {
    const x = p.x - cam.x;
    if (x < -80 || x > W + 80) continue;
    const gy = pteroGY(st, p.x);
    ctx.fillStyle = pal.rockDark; rr(x - 20, p.y, 40, gy - p.y + 4, 4); ctx.fill();
    ctx.fillStyle = pal.rock;
    for (let yy = p.y + 8, j = 0; yy < gy; yy += 16, j++) rr(x - 18 + (j % 2) * 4, yy, 32, 13, 3), ctx.fill();
    ctx.fillStyle = pal.rockDark; rr(x - 26, p.y - 4, 52, 10, 4); ctx.fill();
    if (tk && tk.ref === p && G.introT <= 0) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(G.clock * 6); ctx.fillStyle = '#fff6b0'; circle(x, p.y - 14, 26); ctx.fill(); ctx.globalAlpha = 1; }
    const n = p.took > 0 ? 2 : 3;
    if (n === 3) pteroRock(x, p.y - 22, 8);
    pteroRock(x - 9, p.y - 10, 8); pteroRock(x + 9, p.y - 10, 8);
  }
}
function pteroDrawSwitches(st) {
  const cam = st.cam;
  for (const s of st.c.switches) {
    const x = s.x - cam.x;
    if (x < -120 || x > W + 120) continue;
    const y = s.y, gold = s.gate && s.gate.gold && !s.down, w = gold ? PTERO.swGold : PTERO.swW;
    if (gold) {
      ctx.globalAlpha = 0.45 + 0.25 * Math.sin(G.clock * 5); ctx.fillStyle = C.gold;
      ctx.beginPath(); ctx.ellipse(x, y - 4, w / 2 + 6, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      // a bobbing gold arrow
      const ay = y - 70 + Math.sin(G.clock * 5) * 6;
      ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 12, ay); ctx.lineTo(x + 12, ay); ctx.lineTo(x + 12, ay + 12); ctx.lineTo(x + 20, ay + 12); ctx.lineTo(x, ay + 28); ctx.lineTo(x - 20, ay + 12); ctx.lineTo(x - 12, ay + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#5e5346'; rr(x - w / 2 - 6, y - 8, w + 12, 12, 4); ctx.fill();
    const h = s.down ? 4 : 13;
    ctx.fillStyle = s.down ? '#ffd76a' : '#b8ada0';
    ctx.beginPath(); ctx.ellipse(x, y - 8, w / 2, h, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = s.down ? '#b9850f' : '#7a6e60'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(x, y - 8, w / 2, h, 0, Math.PI, 0); ctx.stroke();
    // a carved spiral, like the one on the gate
    ctx.strokeStyle = s.down ? '#b9850f' : '#7a6e60'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let a = 0; a < Math.PI * 3.2; a += 0.3) { const r = 1 + a * 1.4; ctx.lineTo(x + Math.cos(a) * r, y - 8 - h * 0.45 + Math.sin(a) * r * 0.45); } ctx.stroke();
    if (s.down) {
      pteroRock(x, y - 18, 9);
      ctx.globalAlpha = clamp(1 - s.t, 0, 0.8); ctx.fillStyle = C.gold; circle(x, y - 10, 30 + s.t * 30); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
}
function pteroBaby(x, y, col, hungry, t, joy) {
  const bob = hungry ? Math.abs(Math.sin(t * 6)) * 4 : Math.sin(t * 2) * 1.5;
  ctx.save(); ctx.translate(x, y - bob);
  ctx.fillStyle = col; circle(0, 0, 10); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 9, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
  // eggshell hat
  ctx.fillStyle = '#fff8e8'; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-5, -12); ctx.lineTo(-2, -8); ctx.lineTo(1, -13); ctx.lineTo(4, -8); ctx.lineTo(7, -12); ctx.lineTo(8, -5); ctx.quadraticCurveTo(0, -9, -8, -6); ctx.fill();
  if (hungry) {
    pteroDinoEye(-4, -2, 3, false); pteroDinoEye(4, -2, 3, false);
    const open = 3 + Math.abs(Math.sin(t * 6)) * 4;
    ctx.fillStyle = '#c2392b'; ctx.beginPath(); ctx.ellipse(0, 5, 5, open, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8a8a'; ctx.beginPath(); ctx.ellipse(0, 5 + open * 0.4, 3, open * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6;
    for (const ex of [-4, 4]) { ctx.beginPath(); ctx.arc(ex, -1, 2.4, Math.PI + 0.3, -0.3); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, 3, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,150,0.5)'; circle(-7, 3, 2.2); ctx.fill(); circle(7, 3, 2.2); ctx.fill();
    if (joy > 0) pteroHeart(10, -14 - (1 - joy) * 10, 4, 'rgba(255,110,150,' + joy + ')');
  }
  ctx.restore();
}
function pteroDrawNests(st) {
  const cam = st.cam, pal = st.pal, nd = pteroNeeds(st), tk = nd.task;
  for (const n of st.c.nests) {
    const x = n.x - cam.x;
    if (x < -120 || x > W + 120) continue;
    const gy = pteroGY(st, n.x);
    if (n.y < gy - 14) {   // on a stump or a ledge
      ctx.fillStyle = '#8a5a34'; rr(x - 22, n.y + 2, 44, gy - n.y, 6); ctx.fill();
      ctx.fillStyle = '#a8754a'; ctx.beginPath(); ctx.ellipse(x, n.y + 4, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6b4226'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, n.y + 4, 12, 3, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#62b04a'; ctx.beginPath(); ctx.ellipse(x + 18, n.y + 30, 10, 4, 0.6, 0, Math.PI * 2); ctx.fill();
    }
    if (tk && tk.ref === n && G.introT <= 0) { ctx.globalAlpha = 0.3 + 0.2 * Math.sin(G.clock * 6); ctx.fillStyle = st.nestGold ? C.gold : '#fff6b0'; ctx.beginPath(); ctx.ellipse(x, n.y - 10, (st.nestGold ? PTERO.catchGold : PTERO.catchW) + 8, 26, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    const nb = n.babies.length;
    n.babies.forEach((b, i) => pteroBaby(x + (i - (nb - 1) / 2) * 18, n.y - 12 - (st.nestGold && !b.fed ? 6 : 0), b.col, !b.fed, n.t + b.ph, b.joy));
    // the twig bowl
    ctx.fillStyle = '#9a6a3a'; ctx.beginPath(); ctx.ellipse(x, n.y, 30 + nb * 5, 11, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#6b4226'; ctx.lineWidth = 2.5;
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x - 30 - nb * 5 + k * 4, n.y - 1 + k * 2); ctx.quadraticCurveTo(x, n.y + 8 + k * 2, x + 30 + nb * 5 - k * 4, n.y - 1 + k * 2); ctx.stroke(); }
    ctx.strokeStyle = '#c49460'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, n.y, 30 + nb * 5, 5, 0, 0, Math.PI * 2); ctx.stroke();
    if (n.fed < n.need && G.introT <= 0) {
      // how many more it wants
      ctx.font = '700 12px "Atkinson Hyperlegible", system-ui, sans-serif';
      const s = (n.need - n.fed) + ' hungry', w = ctx.measureText(s).width + 14;
      ctx.fillStyle = 'rgba(28,26,54,0.7)'; rr(x - w / 2, n.y + 12, w, 18, 9); ctx.fill();
      text(s, x, n.y + 21.5, 12, '#ffd4e8', 'center', 'body');
    }
  }
}
function pteroDrawVents(st) {
  const cam = st.cam, pal = st.pal;
  for (const v of st.c.vents) {
    const x = v.x - cam.x;
    if (x < -80 || x > W + 80) continue;
    const gy = pteroGY(st, v.x), sh = v.warn ? Math.sin(G.clock * 50) * 2 : 0;
    ctx.fillStyle = pal.rockDark; ctx.beginPath(); ctx.moveTo(x - 42 + sh, gy + 2); ctx.quadraticCurveTo(x - 20 + sh, gy - 30, x - 12 + sh, gy - 26); ctx.lineTo(x + 12 + sh, gy - 26); ctx.quadraticCurveTo(x + 20 + sh, gy - 30, x + 42 + sh, gy + 2); ctx.fill();
    ctx.fillStyle = '#ff9a6a'; ctx.beginPath(); ctx.ellipse(x + sh, gy - 26, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    if (v.warn) { ctx.globalAlpha = 0.6; pteroCloud(x + sh, gy - 40, 0.3, '#f3d9e8'); ctx.globalAlpha = 1; }
  }
}
function pteroDrawRests(st) {
  const cam = st.cam;
  for (const r of st.rests) {
    const x = r.x - cam.x;
    ctx.globalAlpha = clamp((6 - r.t) / 1, 0, 1);
    if (r.kind === 'rock') pteroRock(x, r.y - 7, 8);
    else pteroFruit(x, r.y - 8, r.fruit, 1, 1.2);
    ctx.globalAlpha = 1;
  }
}
function pteroDrawPerch(st) {
  const cam = st.cam, pr = st.c.perch, bn = st.c.bigNest;
  if (pr) {
    const x = pr.x - cam.x;
    if (x > -200 && x < W + 200) {
      const gy = pteroGY(st, pr.x);
      ctx.fillStyle = '#8a5a34'; ctx.beginPath(); ctx.moveTo(x - 60, gy + 4); ctx.quadraticCurveTo(x - 40, gy - 20, x - 42, pr.y); ctx.lineTo(x + 42, pr.y); ctx.quadraticCurveTo(x + 40, gy - 20, x + 60, gy + 4); ctx.fill();
      ctx.fillStyle = '#c9925a'; ctx.beginPath(); ctx.ellipse(x, pr.y, 44, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 2; for (const r of [8, 18, 28]) { ctx.beginPath(); ctx.ellipse(x, pr.y, r * 1.4, r * 0.3, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = '#62b04a'; ctx.beginPath(); ctx.ellipse(x - 50, pr.y + 40, 16, 6, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 52, pr.y + 70, 16, 6, 0.5, 0, Math.PI * 2); ctx.fill();
      // the swap flag
      ctx.fillStyle = '#7d5530'; ctx.fillRect(x + 34, pr.y - 70, 4, 70);
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(x + 38, pr.y - 70); ctx.lineTo(x + 84, pr.y - 60 + Math.sin(G.clock * 4) * 3); ctx.lineTo(x + 38, pr.y - 48); ctx.fill();
      text('SWAP', x + 56, pr.y - 60, 11, C.ink, 'center', 'body');
    }
  }
  if (bn) {
    const x = bn.x - cam.x;
    if (x > -300 && x < W + 300) {
      const gy = pteroGY(st, bn.x);
      ctx.fillStyle = st.pal.rockDark; ctx.beginPath(); ctx.moveTo(x - 90, gy + 4); ctx.lineTo(x - 64, bn.y + 6); ctx.lineTo(x + 64, bn.y + 6); ctx.lineTo(x + 90, gy + 4); ctx.fill();
      ctx.fillStyle = st.pal.rock; for (let yy = bn.y + 20; yy < gy; yy += 24) rr(x - 60 + (yy % 48 ? 6 : 0), yy, 110, 16, 5), ctx.fill();
      const babies = ['#8fe07a', '#ff9ec7', '#b7a4ff', '#ffd06a', '#7fd6e0'];
      const done = st.fin && st.fin.landed;
      babies.forEach((col, i) => pteroBaby(x + (i - 2) * 22, bn.y - 12 - (done ? Math.abs(Math.sin(G.clock * 8 + i)) * 8 : 0), col, !done, G.clock + i, done ? 1 : 0));
      ctx.fillStyle = '#9a6a3a'; ctx.beginPath(); ctx.ellipse(x, bn.y, 80, 18, 0, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = '#6b4226'; ctx.lineWidth = 3;
      for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x - 80 + k * 6, bn.y + k * 2); ctx.quadraticCurveTo(x, bn.y + 14 + k * 2, x + 80 - k * 6, bn.y + k * 2); ctx.stroke(); }
      ctx.strokeStyle = '#c49460'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, bn.y, 80, 7, 0, 0, Math.PI * 2); ctx.stroke();
      // the HOME banner on two sticks
      ctx.fillStyle = '#7d5530'; ctx.fillRect(x - 70, bn.y - 110, 4, 104); ctx.fillRect(x + 66, bn.y - 110, 4, 104);
      ctx.fillStyle = '#ff8fb5'; rr(x - 70, bn.y - 116, 140, 30, 8); ctx.fill();
      text('BIG NEST · HOME', x, bn.y - 100.5, 14, '#ffffff', 'center');
    }
  }
}
// the log gate: two stone posts and a wall of logs that slides up into the sky when it opens
function pteroDrawGates(st) {
  const cam = st.cam, pal = st.pal;
  for (const g of st.c.gates) {
    const x = g.x - cam.x;
    if (x < -80 || x > W + 80) continue;
    const gy = pteroGY(st, g.x), top = Math.max(-20, pteroCY(st, g.x) - 30), lift = pteroSmooth(g.open) * (gy - top + 30);
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 40, top, 80, gy - top + 8); ctx.clip();
    for (let k = -1; k <= 1; k++) {
      const lx = x + k * 11, col = k ? '#a8703c' : '#b87d46';
      ctx.fillStyle = col; rr(lx - 6, top - lift, 12, gy - top + 4, 6); ctx.fill();
      ctx.strokeStyle = '#7d4f28'; ctx.lineWidth = 1.5;
      for (let yy = top + 30 - lift; yy < gy - lift; yy += 46) { ctx.beginPath(); ctx.moveTo(lx - 4, yy); ctx.lineTo(lx + 3, yy + 8); ctx.stroke(); }
    }
    // vine lashings and the spiral badge that matches the switch
    ctx.fillStyle = '#4f9a3c';
    for (let yy = top + 60 - lift; yy < gy - lift; yy += 110) ctx.fillRect(x - 18, yy, 36, 6);
    const by = gy - 90 - lift;
    ctx.fillStyle = '#b8ada0'; circle(x, by, 13); ctx.fill(); ctx.strokeStyle = '#7a6e60'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let a = 0; a < Math.PI * 3.2; a += 0.3) { const r = 1 + a * 1.2; ctx.lineTo(x + Math.cos(a) * r, by + Math.sin(a) * r); } ctx.stroke();
    if (g.sw.length > 1) for (let i = 0; i < g.sw.length; i++) { ctx.fillStyle = g.sw[i].down ? C.gold : 'rgba(0,0,0,0.35)'; circle(x - 8 + i * 16, by + 24, 4.5); ctx.fill(); }
    ctx.restore();
    // posts
    for (const sd of [-1, 1]) {
      ctx.fillStyle = pal.rockDark; rr(x + sd * 22 - 6, top, 12, gy - top + 4, 4); ctx.fill();
      ctx.fillStyle = pal.rock; rr(x + sd * 22 - 4, top, 6, gy - top + 4, 3); ctx.fill();
    }
  }
}
// winds: updrafts (leafy column), downdrafts and headwinds (warned, then blowing)
function pteroDrawZones(st, front) {
  const cam = st.cam;
  for (const z of st.c.zones) {
    const x0 = z.x0 - cam.x, x1 = z.x1 - cam.x;
    if (x1 < -40 || x0 > W + 40) continue;
    const gy = pteroGY(st, (z.x0 + z.x1) / 2);
    if (z.kind === 'up') {
      if (front) continue;
      const g = ctx.createLinearGradient(0, gy, 0, 60);
      g.addColorStop(0, 'rgba(200,255,200,0.35)'); g.addColorStop(1, 'rgba(200,255,200,0)');
      ctx.fillStyle = g; ctx.fillRect(x0, 60, x1 - x0, gy - 60);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const xx = x0 + (x1 - x0) * ((i + 0.5) / 6), yy = gy - ((G.clock * 160 + i * 70) % (gy - 80));
        ctx.beginPath(); ctx.moveTo(xx - 8, yy + 8); ctx.lineTo(xx, yy); ctx.lineTo(xx + 8, yy + 8); ctx.stroke();
      }
      ctx.lineCap = 'butt';
      continue;
    }
    if (!front) {
      if (z.state === 'warn') {
        ctx.globalAlpha = 0.3 + 0.3 * Math.abs(Math.sin(G.clock * 10));
        ctx.fillStyle = z.kind === 'down' ? '#bfe6ff' : '#e0f4ff'; ctx.fillRect(x0, 70, x1 - x0, gy - 70);
        ctx.globalAlpha = 1;
      }
      // a windsock post at the start of the zone shows what it does
      const sx = x0, sy = pteroGY(st, z.x0);
      ctx.fillStyle = '#7d5530'; ctx.fillRect(sx - 2, sy - 70, 4, 70);
      const blow = z.state === 'blow' ? 1 : z.state === 'warn' ? 0.6 : 0.2, flap = Math.sin(G.clock * (6 + blow * 10)) * 3;
      ctx.save(); ctx.translate(sx, sy - 66);
      ctx.rotate(z.kind === 'down' ? Math.PI / 2 * blow * 0.8 : -Math.PI * blow * 0.95);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#ffffff' : '#ff6b5a'; ctx.beginPath(); ctx.moveTo(k * 9, -6 + k * 0.8); ctx.lineTo(k * 9 + 9, -5 + (k + 1) * 0.8 + flap * (k / 4)); ctx.lineTo(k * 9 + 9, 5 - (k + 1) * 0.8 + flap * (k / 4)); ctx.lineTo(k * 9, 6 - k * 0.8); ctx.fill(); }
      ctx.restore();
      continue;
    }
    if (z.state !== 'blow') continue;
    ctx.strokeStyle = z.kind === 'down' ? 'rgba(150,200,255,0.75)' : 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const h = hash(i, 77);
      if (z.kind === 'down') {
        const xx = x0 + (h % 1000) / 1000 * (x1 - x0), yy = 80 + ((G.clock * 380 + h % 400) % (gy - 100));
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 26); ctx.stroke();
      } else {
        const yy = 100 + (h % 1000) / 1000 * (gy - 130), xx = x1 - ((G.clock * 420 + h % 500) % (x1 - x0 + 40));
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 34, yy); ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
  }
}
function pteroDrawPuffs(st) {
  const cam = st.cam;
  for (const q of st.puffs) {
    const x = q.x - cam.x, y = q.y;
    if (x < -80 || x > W + 80) continue;
    const pop = q.pop > 0 ? q.pop / 0.4 : 0, r = q.r * (1 + pop * 0.6);
    ctx.globalAlpha = (1 - pop) * 0.92;
    ctx.fillStyle = '#e9d3e6'; circle(x - r * 0.45, y + r * 0.1, r * 0.62); ctx.fill(); circle(x + r * 0.45, y + r * 0.12, r * 0.6); ctx.fill();
    ctx.fillStyle = '#f6e6f2'; circle(x, y - r * 0.15, r * 0.75); ctx.fill();
    if (!pop) {
      ctx.strokeStyle = '#8a6a8a'; ctx.lineWidth = 2;
      for (const ex of [-0.25, 0.25]) { ctx.beginPath(); ctx.arc(x + ex * r, y - r * 0.15, r * 0.1, 0.2, Math.PI - 0.2); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(x, y + r * 0.05, r * 0.12, 0.3, Math.PI - 0.3); ctx.stroke();
      ctx.fillStyle = 'rgba(255,150,180,0.45)'; circle(x - r * 0.42, y + r * 0.02, r * 0.09); ctx.fill(); circle(x + r * 0.42, y + r * 0.02, r * 0.09); ctx.fill();
      if (Math.sin(G.clock * 2 + q.ph) > 0.6) text('z', x + r * 0.7, y - r * 0.7, 12, '#8a6a8a', 'center');
    }
    ctx.globalAlpha = 1;
  }
}
function pteroDrawDrops(st) {
  const cam = st.cam;
  for (const d of st.drops) {
    const x = d.x - cam.x;
    if (d.kind === 'rock') { ctx.save(); ctx.translate(x, d.y); ctx.rotate(d.rot); pteroRock(0, 0, 9); ctx.restore(); }
    else pteroFruit(x, d.y, d.fruit, 1.1, d.rot);
  }
}
// the dotted line from a held thing to where it would land (gold when it lands on its target)
function pteroDrawPath(st) {
  const pt = st.pt, hg = st.hg;
  if (!hg.item || (pt.state !== 'fly' && pt.state !== 'back') || G.introT > 0) return;
  const hc = pteroHangPos(st), pts = pteroPredict(st, hc, pteroHangVel(st), 50), end = pts[pts.length - 1];
  const hit = pteroPathHit(st, pts);
  const nd = pteroNeeds(st), goldGate = hg.item.kind === 'rock' && nd.gate && nd.gate.gold;
  const col = hit ? '#8fe3b0' : goldGate ? C.gold : 'rgba(255,255,255,0.85)';
  ctx.fillStyle = col;
  for (let i = 1; i < pts.length; i += 2) { const q = pts[i]; if (hit && hit.i < i) break; circle(q.x - st.cam.x, q.y, i < 4 ? 2 : 2.6); ctx.fill(); }
  if (!hit && end) { ctx.strokeStyle = col; ctx.lineWidth = 2.5; const ex = end.x - st.cam.x; ctx.beginPath(); ctx.moveTo(ex - 7, end.y - 9); ctx.lineTo(ex + 7, end.y + 1); ctx.moveTo(ex + 7, end.y - 9); ctx.lineTo(ex - 7, end.y + 1); ctx.stroke(); }
  if (hit) { ctx.strokeStyle = '#8fe3b0'; ctx.lineWidth = 3; circle(hit.x - st.cam.x, hit.y, 14 + Math.sin(G.clock * 10) * 2); ctx.stroke(); }
}
// does a predicted path land on a hungry nest (fruit) or a switch (rock)? { x, y, i } or null
function pteroPathHit(st, pts) {
  const P = PTERO, hg = st.hg, c = st.c;
  if (!hg.item) return null;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (hg.item.kind === 'fruit') {
      for (const n of c.nests) if (n.fed < n.need && a.y < n.y - 4 && b.y >= n.y - 4 && Math.abs(b.x - n.x) < (st.nestGold ? P.catchGold : P.catchW) - 4) return { x: n.x, y: n.y - 8, i, ref: n };
    } else {
      for (const s of c.switches) if (!s.down && b.y >= s.y - 12 && Math.abs(b.x - s.x) < (s.gate && s.gate.gold ? P.swGold : P.swW) / 2 - 3) return { x: s.x, y: s.y - 10, i, ref: s };
    }
  }
  return null;
}
// one player drawn by the engine's drawPlayer (a copy at the origin, feet at 0,0)
function pteroBody(p, rot, sx, sy, extra) {
  ctx.save(); ctx.rotate(rot || 0);
  drawPlayer(Object.assign({}, p, { alive: true, x: -PW / 2, y: -PH, sx: (p.sx || 1) * (sx || 1), sy: (p.sy || 1) * (sy || 1), vy: 0, face: 1 }, extra || {}));
  ctx.restore();
}
// Petra herself, with the flyer on her back and the hanger on her feet
function pteroDrawPtero(st) {
  const P = PTERO, pt = st.pt, hg = st.hg, cam = st.cam, ps = G.players;
  const x = pt.x - cam.x, y = pt.y, t = G.clock, landed = pt.state === 'landed' || (pt.state === 'swap' && st.swap.landed) || (pt.state === 'finish' && st.fin.landed);
  // the wing pose: rises with the meter, sweeps down on a flap, folds on the ground
  let up = -0.5 + 1.6 * pt.wing;
  if (pt.wst === 'flap') up = pteroLerp(-0.9, 1.0, pt.flapA);
  if (pt.wst === 'top') up = 1.1 + Math.sin(t * 20) * 0.04;
  if (landed && pt.wst !== 'flap') up = 0.15 + pt.wing * 0.4;
  if (pt.state === 'swap' || pt.state === 'finish') up = landed ? 0.3 : Math.sin(t * 9) * 0.9;
  const sneeze = pt.sneeze > 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(pt.tilt + (sneeze ? Math.sin(pt.sneeze * 30) * 0.08 : 0));
  // shadow-ish glow under her when low? (no: the ground is far) — the far wing first
  pteroWingShape(-12, -8, up * 0.92, 0.85, '#2f8f86', '#57b8ab');
  // tail
  ctx.fillStyle = '#3fb7a8';
  ctx.beginPath(); ctx.moveTo(-34, -4); ctx.quadraticCurveTo(-60, 0, -74, 6); ctx.quadraticCurveTo(-58, 6, -34, 6); ctx.fill();
  ctx.fillStyle = '#ff7b54'; ctx.beginPath(); ctx.moveTo(-74, 6); ctx.lineTo(-84, -2); ctx.lineTo(-90, 8); ctx.lineTo(-82, 14); ctx.closePath(); ctx.fill();
  // legs and feet (down to the pivot)
  ctx.strokeStyle = '#e8873c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  const legY = landed ? P.standH : P.pivY;
  ctx.beginPath(); ctx.moveTo(-2, 10); ctx.lineTo(P.pivX - 3, legY - 2); ctx.moveTo(8, 10); ctx.lineTo(P.pivX + 5, legY - 2); ctx.stroke();
  ctx.lineWidth = 3;
  for (const fx of [P.pivX - 3, P.pivX + 5]) { ctx.beginPath(); ctx.moveTo(fx, legY - 2); ctx.lineTo(fx + 5, legY + 1); ctx.moveTo(fx, legY - 2); ctx.lineTo(fx - 4, legY + 1); ctx.stroke(); }
  ctx.lineCap = 'butt';
  // body
  ctx.fillStyle = '#3fb7a8'; ctx.beginPath(); ctx.ellipse(0, 0, 40, 19, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe6b0'; ctx.beginPath(); ctx.ellipse(6, 7, 28, 10, 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.ellipse(-8, -9, 18, 5, -0.1, 0, Math.PI * 2); ctx.fill();
  // a leafy saddle
  ctx.fillStyle = '#7ccf4f'; ctx.beginPath(); ctx.ellipse(P.seatX, -16, 16, 6, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#3f8f3a'; ctx.fillRect(P.seatX - 16, -17, 32, 3);
  // neck and head
  ctx.fillStyle = '#3fb7a8';
  ctx.beginPath(); ctx.moveTo(26, -10); ctx.quadraticCurveTo(40, -24, 44, -30); ctx.lineTo(54, -22); ctx.quadraticCurveTo(44, -8, 34, 4); ctx.fill();
  ctx.save(); ctx.translate(50, -30); ctx.rotate(sneeze ? -0.3 : Math.sin(t * 2) * 0.04);
  ctx.fillStyle = '#ff7b54'; ctx.beginPath(); ctx.moveTo(-4, -8); ctx.quadraticCurveTo(-26, -24, -42, -20); ctx.quadraticCurveTo(-22, -10, -6, 2); ctx.fill();
  ctx.fillStyle = '#3fb7a8'; ctx.beginPath(); ctx.ellipse(0, -2, 15, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffc05a';
  ctx.beginPath(); ctx.moveTo(8, -6); ctx.quadraticCurveTo(30, -4, 40, 2); ctx.quadraticCurveTo(26, 6, 8, 6); ctx.fill();
  ctx.strokeStyle = '#c98a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(10, 2); ctx.quadraticCurveTo(24, 4, 36, 2); ctx.stroke();
  if (pt.blink > 0 || sneeze) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(2, -4, 4, 0.2, Math.PI - 0.2); ctx.stroke(); }
  else pteroDinoEye(2, -5, 5, false);
  ctx.fillStyle = 'rgba(255,130,150,0.55)'; circle(-4, 4, 3.5); ctx.fill();
  ctx.restore();
  // the near wing in front
  pteroWingShape(-4, -6, up, 1, '#36a89a', '#6fd0c2');
  // the flyer rides on top (in front of the near wing, so the raised wing never hides them)
  if (pt.state !== 'swap' || st.swap.t < 1.35) {
    const fp = ps[st.flyer];
    ctx.save(); ctx.translate(P.seatX, P.seatY + 4);
    const bounce = pt.wst === 'flap' ? -pt.flapA * 3 : 0;
    ctx.translate(0, bounce);
    pteroBody(fp, 0, pt.flapA > 0 ? 1.08 : 1, pt.flapA > 0 ? 0.9 : 1, { blink: pt.blink > 0 ? 1 : 0 });
    ctx.restore();
  }
  ctx.restore();
  // the hanger
  pteroDrawHanger(st);
  // the little wing meter beside her (the beat): fills as the wings rise, gold at the TOP
  if ((pt.state === 'fly' || pt.state === 'back' || pt.state === 'landed') && G.introT <= 0) {
    const mx = x - 92, my = y - 62, mh = 46, top = pt.wst === 'top';
    ctx.fillStyle = 'rgba(28,26,54,0.7)'; rr(mx - 7, my - 4, 14, mh + 8, 7); ctx.fill();
    const wc = pteroWingCfg(st), gz = mh * (1 - wc.good);
    ctx.fillStyle = 'rgba(255,197,61,0.3)'; rr(mx - 4, my, 8, gz, 4); ctx.fill();
    ctx.fillStyle = top ? C.gold : '#ffffff'; const fh = mh * pt.wing; rr(mx - 4, my + mh - fh, 8, fh, 4); ctx.fill();
    if (top) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2 + Math.abs(Math.sin(t * 16)) * 2; rr(mx - 8, my - 5, 16, mh + 10, 8); ctx.stroke(); }
  }
}
// a wing seen from the side: a leathery sail from the shoulder, its tip up (up = 1) or down (up = -1)
function pteroWingShape(sx, sy, up, s, col, light) {
  const tipX = sx - 26 * s, tipY = sy - 84 * up * s, rearX = sx - 40 * s;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(sx + 14 * s, sy);
  ctx.quadraticCurveTo(sx + 6 * s, sy - 48 * up * s, tipX, tipY);
  ctx.quadraticCurveTo(sx - 26 * s, sy - 30 * up * s, rearX, sy + 4 * s);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = light; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(sx + 8 * s, sy); ctx.quadraticCurveTo(sx + 2 * s, sy - 36 * up * s, tipX + 4 * s, tipY + 10 * up * s); ctx.quadraticCurveTo(sx - 14 * s, sy - 20 * up * s, sx - 20 * s, sy + 2 * s); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  // the little thumb claw near the tip
  ctx.fillStyle = '#ffe6b0'; circle(pteroLerp(sx + 14 * s, tipX, 0.72), pteroLerp(sy, tipY, 0.72) , 3 * s); ctx.fill();
}
function pteroDrawHanger(st) {
  const P = PTERO, pt = st.pt, hg = st.hg, cam = st.cam, p = G.players[st.hanger];
  if (pt.state === 'swap' || pt.state === 'finish') { pteroDrawSwapPeople(st); return; }
  const hc = pteroHangPos(st);
  if (pt.state === 'landed') {
    ctx.save(); ctx.translate(hc.x - cam.x, hc.y + 13);
    pteroBody(p, 0, 1, 1);
    if (hg.item) { if (hg.item.kind === 'rock') pteroRock(10, -16, 7); else pteroBasket(12, -14, hg.item.list, 0.85); }
    ctx.restore();
    return;
  }
  const pv = pteroPivot(st);
  ctx.save(); ctx.translate(pv.x - cam.x, pv.y); ctx.rotate(-hg.th);
  // arms up to Petra's feet
  ctx.strokeStyle = PDARK[p.id]; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-6, P.Lr - 12); ctx.lineTo(-2, 1); ctx.moveTo(6, P.Lr - 12); ctx.lineTo(2, 1); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.translate(0, P.Lr + 13);
  const wig = Math.sin(G.clock * 7) * 0.04;
  pteroBody(p, wig, 1, 1.05);
  ctx.restore();
  // the gold Grabby net: a soft gold ring shows how far the hanger can grab
  if (st.grabGold && !hg.item) {
    ctx.strokeStyle = C.gold; ctx.globalAlpha = 0.35 + 0.15 * Math.sin(G.clock * 5); ctx.lineWidth = 2.5; ctx.setLineDash([6, 6]);
    circle(hc.x - cam.x, hc.y, pteroReach(st)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  // what the hanger holds, in one hand by their side
  if (hg.item) {
    const ix = hc.x - cam.x + 12 * Math.cos(hg.th), iy = hc.y + 10;
    if (hg.item.kind === 'rock') pteroRock(ix, iy, 8); else pteroBasket(ix, iy, hg.item.list, 0.9);
  }
}
// the swap at the perch and the landing at the Big Nest: both hop around Petra
function pteroDrawSwapPeople(st) {
  const P = PTERO, pt = st.pt, cam = st.cam, ps = G.players;
  const seat = { x: pt.x + P.seatX - cam.x, y: pt.y + P.seatY + 4 };
  const ground = { x: pt.x + 38 - cam.x, y: pt.y + P.standH };
  const sw = st.swap || st.fin, tt = sw.t, u = clamp((tt - 1.35) / 0.8, 0, 1);
  const arc = (a, b, k, h) => ({ x: pteroLerp(a.x, b.x, pteroSmooth(k)), y: pteroLerp(a.y, b.y, k) - h * 4 * k * (1 - k) });
  if (st.fin) {
    const hp = arc({ x: pt.x + P.pivX - cam.x, y: pt.y + P.feetY }, { x: pt.x - 44 - cam.x, y: pt.y + P.standH - 6 }, clamp((tt - 1.0) / 0.5, 0, 1), 60);
    ctx.save(); ctx.translate(hp.x, hp.y - (tt > 1.6 ? Math.abs(Math.sin(tt * 7)) * 10 : 0)); pteroBody(ps[st.hanger], 0, 1, 1); ctx.restore();
    if (tt > 1.6) { ctx.save(); ctx.translate(seat.x, seat.y - Math.abs(Math.sin(tt * 7 + 1)) * 10); pteroBody(ps[st.flyer], 0, 1, 1); ctx.restore(); }
    return;
  }
  // the hanger lets go onto the perch, then they swap places
  const h0 = sw.landed ? ground : { x: pt.x + P.pivX - cam.x, y: pt.y + P.feetY };
  const hp = arc(h0, seat, u, 70), fp = arc(seat, ground, u, 50);
  if (tt >= 1.35) { ctx.save(); ctx.translate(fp.x, fp.y); pteroBody(ps[st.flyer], 0, 1, 1); ctx.restore(); }
  ctx.save(); ctx.translate(hp.x, hp.y); if (u > 0 && u < 1) ctx.rotate(u * Math.PI * 2); pteroBody(ps[st.hanger], 0, 1, 1); ctx.restore();
}

/* ---------- HUD: the clock and fruit, each job's panel on its player's side, prompts and hints ---------- */
function pteroHud(st) {
  const P = PTERO, pt = st.pt, big = hudBig(), ps = G.players, play = G.mode === 'play' || G.mode === 'paused', t = G.clock;
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = st.stats.fed + '/' + st.stats.wanted;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.3, gap = fs;
    const w = tw + gap + icon + fs * 0.4 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, C.paper, 'left', 'body');
    pteroFruit(x0 + 15 + tw + gap + icon / 2, cy + 1, 'mango', fs / 18);
    text(n, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, '#ffd4e8', 'left', 'body');
    timeX0 = x0;
  }
  if (!play) return;
  const z = big ? 1.4 : 1;
  // the job panels, bottom corners: Pip's on the left, Bo's on the right
  for (const id of [0, 1]) {
    const flyer = id === st.flyer, pw = Math.round(250 * z), ph = Math.round(54 * z), py = H - ph - 8;
    const px = id === 0 ? 10 : W - 10 - pw, cpuSeat = pteroQuiet(id);
    ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    text(NAMES[id] + (flyer ? ' flies' : ' hangs') + (cpuSeat ? ' (computer)' : ''), px + 12 * z, py + 14 * z, 15 * z, PCOL[id], 'left');
    if (flyer) {
      if (!cpuSeat) text(pteroKey(id, 'act') + ' flap · ' + pteroKey(id, 'lr') + ' speed · ' + pteroKey(id, 'down') + ' dive', px + pw - 10 * z, py + 14 * z, 11.5 * z, '#d9d3ef', 'right', 'body');
      // the wing meter: the wings rise from DOWN to UP; flap in the gold TOP
      const wc = pteroWingCfg(st), bx = px + 12 * z, bw = pw - 24 * z - 58 * z, by = py + 28 * z, bh = 16 * z, top = pt.wst === 'top';
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(bx, by, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,197,61,0.35)'; rr(bx + bw * wc.good, by, bw * (1 - wc.good), bh, bh / 2); ctx.fill();
      if (bw * pt.wing >= bh) { ctx.fillStyle = top ? C.gold : '#ffffff'; rr(bx, by, bw * pt.wing, bh, bh / 2); ctx.fill(); }
      text('wings up', bx + 8 * z, by + bh / 2 + 0.5, 10.5 * z, bw * pt.wing > 52 * z ? '#3a2a40' : '#ffffff', 'left', 'body');
      const tx = bx + bw + 6 * z, tw2 = 50 * z;
      ctx.fillStyle = top ? (Math.sin(t * 18) > -0.2 ? C.gold : '#ffe39a') : 'rgba(255,197,61,0.3)'; rr(tx, by - 2 * z, tw2, bh + 4 * z, (bh + 4 * z) / 2); ctx.fill();
      // (just after a flap the TOP box says how good it was)
      const shown = !top && pt.flapShow > 0 && pt.flapKind;
      if (shown) ctx.globalAlpha = clamp(pt.flapShow / 0.3, 0, 1);
      const lab = top ? 'FLAP!' : !shown ? 'TOP' : pt.flapKind === 'perfect' ? 'PERFECT' : pt.flapKind === 'good' ? 'good' : 'flop';
      const lc = top ? C.ink : !shown ? '#ffe7a8' : pt.flapKind === 'perfect' ? '#ffffff' : pt.flapKind === 'good' ? '#8fe3b0' : '#ff9a9a';
      text(lab, tx + tw2 / 2, by + bh / 2 + 0.5, (shown && pt.flapKind === 'perfect' ? 9.5 : 12) * z, lc, 'center', 'body');
      ctx.globalAlpha = 1;
    } else {
      if (!cpuSeat) text(pteroKey(id, 'lr') + ' swing · ' + pteroKey(id, 'act') + ' grab / drop', px + pw - 10 * z, py + 14 * z, 11.5 * z, '#d9d3ef', 'right', 'body');
      const item = st.hg.item, nd = pteroNeeds(st), tk = nd.task;
      const cx = px + 12 * z, cy = py + 37 * z;
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; circle(cx + 12 * z, cy, 12 * z); ctx.fill();
      if (item) { if (item.kind === 'rock') pteroRock(cx + 12 * z, cy, 8 * z); else pteroBasket(cx + 12 * z, cy + 2, item.list, 0.8 * z); }
      const job = pt.state === 'swap' ? 'Swap jobs!' : pt.state === 'finish' ? 'Special delivery!' : !tk ? (item && item.kind === 'rock' ? 'Carry it to the next switch' : nd.gate && nd.gate.sw.some(s => !s.down) ? 'Wait for the next rocks' : 'Look out for fruit!') : tk.kind === 'fruit' ? 'Grab the fruit' : tk.kind === 'rock' ? 'Grab a rock' : tk.kind === 'nest' ? 'Feed the hungry babies' : tk.kind === 'switch' ? 'Drop it on the switch' : 'Let go of it';
      text(item ? (item.kind === 'rock' ? 'Rock: ' : 'Fruit x' + item.list.length + ': ') + job : job, cx + 30 * z, cy + 0.5, 12.5 * z, tk ? '#ffe7a8' : '#d9d3ef', 'left', 'body');
    }
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
  if (G.introT > 0 || (pt.state !== 'fly' && pt.state !== 'back' && pt.state !== 'landed')) return;
  // prompts: the flyer's above Petra, the hanger's below the hanger. A hint bubble replaces that player's prompt
  const fs = 14 * z, F = st.flyer, Hh = st.hanger, nd = pteroNeeds(st), hc = pteroHangPos(st), cam = st.cam;
  const panelTop = H - Math.round(54 * z) - 16;
  const box = (id, str, col, pulse, bubble) => {
    if (pteroQuiet(id)) return;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 22 * z, h = fs + 13 * z;
    let x, y;
    if (id === F) { x = pt.x - cam.x - w / 2; y = pt.y - 112 * (big ? 1.05 : 1) - h; }
    else { x = hc.x - cam.x + 20 * z; y = hc.y + 22; }
    x = clamp(x, 4, W - w - 4); y = clamp(y, big ? 96 : 80, panelTop - h);
    const s = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s);
    ctx.fillStyle = bubble ? '#ffffff' : 'rgba(28,26,54,0.86)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = bubble ? PCOL[id] : col; ctx.lineWidth = 2.5; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, bubble ? C.ink : col, 'center', 'body');
    ctx.restore();
  };
  // the flyer
  if (st.hints[F]) box(F, st.hints[F].text, C.ink, false, true);
  else if (pt.state === 'landed') box(F, pt.wst === 'top' ? 'Flap to take off! ' + pteroKey(F, 'act') : 'Wings going up... then flap!', C.gold, pt.wst === 'top');
  else {
    const dz = st.c.zones.find(q => q.kind !== 'up' && q.state === 'warn' && pt.x > q.x0 - 320 && pt.x < q.x1);
    const dn = st.c.zones.find(q => q.kind === 'down' && q.state === 'blow' && pt.x > q.x0 - 30 && pt.x < q.x1 + 30);
    if (dz) box(F, dz.kind === 'down' ? 'Downdraft coming! Get high' : 'Headwind coming!', '#d8f0ff', true);
    else if (dn) box(F, 'Perfect flaps! ' + pteroKey(F, 'act') + ' at the TOP', C.gold, true);
    else if (pt.y > nd.maxY + 10) box(F, 'Too low! Flap at the TOP ' + pteroKey(F, 'act'), '#ff9a9a', true);
    else if (nd.task && nd.task.kind !== 'drop' && Math.abs(nd.task.x - hc.x) < 420) {
      const dy = nd.wantY - pt.y;
      if (dy > 40) box(F, pteroKey(F, 'down') + ' Fly lower for ' + NAMES[Hh], '#ffe7a8', false);
      else if (dy < -40) box(F, 'Flap higher for ' + NAMES[Hh] + ' ' + pteroKey(F, 'act'), '#ffe7a8', false);
    }
  }
  // the hanger
  if (st.hints[Hh]) box(Hh, st.hints[Hh].text, C.ink, false, true);
  else if (pt.state !== 'landed') {
    const tk = nd.task, item = st.hg.item;
    if (item) {
      const hit = pteroPathHit(st, pteroPredict(st, hc, pteroHangVel(st), 50));
      if (hit) box(Hh, 'Drop it now! ' + pteroKey(Hh, 'act'), '#8fe3b0', true);
      else if (tk && tk.kind === 'drop') box(Hh, 'Let go of it ' + pteroKey(Hh, 'act'), '#ffe7a8', false);
    } else if (tk && (tk.kind === 'fruit' || tk.kind === 'rock')) {
      const d = Math.hypot(tk.x - hc.x, tk.y - hc.y);
      if (d < pteroReach(st)) box(Hh, 'Grab it! ' + pteroKey(Hh, 'act'), C.gold, true);
      else if (Math.abs(tk.x - hc.x) < 90 && Math.abs(tk.y - hc.y) < 70) box(Hh, 'Swing ' + pteroKey(Hh, 'lr') + ' to reach', '#ffe7a8', false);
    }
  }
}

/* ---------- sounds ---------- */
Sfx.extra.pteroFlap = function (p) { this.tone(180 * p, 0.18, 'triangle', 0.07, 90 * p); this.tone(900, 0.12, 'sine', 0.025, 300, 0.02); };
Sfx.extra.pteroFlapGood = function (p) { this.tone(170 * p, 0.13, 'triangle', 0.05, 110 * p); };
Sfx.extra.pteroFlop = function (p) { this.tone(260 * p, 0.08, 'sine', 0.03, 200 * p); };
Sfx.extra.pteroTop = function () { this.tone(1175, 0.06, 'sine', 0.035); };
Sfx.extra.pteroTakeoff = function () { [330, 440, 554, 660].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, i * 0.05)); this.tone(160, 0.25, 'triangle', 0.06, 90); };
Sfx.extra.pteroBoing = function () { this.tone(220, 0.3, 'sine', 0.08, 520); this.tone(110, 0.15, 'triangle', 0.06, 70); };
Sfx.extra.pteroBonk = function () { this.tone(300, 0.1, 'square', 0.035, 150); this.tone(140, 0.15, 'triangle', 0.06, 90, 0.02); };
Sfx.extra.pteroGateBonk = function () { this.tone(120, 0.25, 'triangle', 0.07, 70); this.tone(240, 0.08, 'square', 0.02, 180, 0.05); };
Sfx.extra.pteroGrab = function (p) { this.tone(660 * p, 0.08, 'triangle', 0.05, 990 * p); this.tone(1320 * p, 0.06, 'sine', 0.025, null, 0.07); };
Sfx.extra.pteroRock = function (p) { this.tone(200 * p, 0.08, 'square', 0.03, 140 * p); this.tone(520 * p, 0.06, 'triangle', 0.03, null, 0.05); };
Sfx.extra.pteroDrop = function (p) { this.tone(700 * p, 0.25, 'sine', 0.03, 260 * p); };
Sfx.extra.pteroWhiff = function (p) { this.tone(420 * p, 0.06, 'sine', 0.02, 320 * p); };
Sfx.extra.pteroThud = function () { this.tone(110, 0.15, 'triangle', 0.07, 60); };
Sfx.extra.pteroPlop = function () { this.tone(380, 0.08, 'sine', 0.05, 160); };
Sfx.extra.pteroClunk = function () { this.tone(160, 0.15, 'square', 0.05, 90); [523, 659, 784].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, 0.08 + i * 0.06)); };
Sfx.extra.pteroGate = function () { this.tone(140, 0.7, 'sawtooth', 0.02, 260); this.tone(90, 0.6, 'triangle', 0.05, 120, 0.05); };
Sfx.extra.pteroOpen = function () { [392, 523, 659].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.pteroNom = function () { [0, 0.12, 0.24].forEach(d => this.tone(520 + d * 400, 0.07, 'square', 0.03, 380, d)); this.tone(1046, 0.18, 'sine', 0.04, null, 0.36); };
Sfx.extra.pteroCheep = function () { this.tone(1800, 0.05, 'sine', 0.03, 2400); this.tone(1900, 0.05, 'sine', 0.03, 2500, 0.09); };
Sfx.extra.pteroGustWarn = function () { this.tone(500, 0.3, 'sine', 0.02, 800); };
Sfx.extra.pteroGust = function () { this.tone(300, 0.6, 'sawtooth', 0.016, 900); this.tone(600, 0.5, 'sine', 0.022, 300, 0.1); };
Sfx.extra.pteroPuff = function () { this.tone(200, 0.2, 'sine', 0.025, 120); };
Sfx.extra.pteroAchoo = function () { this.tone(700, 0.25, 'sine', 0.04, 1100); this.tone(1200, 0.2, 'sawtooth', 0.025, 300, 0.28); };
Sfx.extra.pteroSwap = function () { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.pteroHop = function (p) { this.tone(420 * p, 0.1, 'sine', 0.05, 700 * p); };
Sfx.extra.pteroHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.pteroCheer = function () { [392, 494, 587, 784, 988].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.08)); this.tone(1568, 0.4, 'sine', 0.04, null, 0.45); };
