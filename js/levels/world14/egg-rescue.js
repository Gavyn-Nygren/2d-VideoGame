/* Pip & Bo - Level 14-1 Egg Rescue (team, World 14 Dino Valley). */
'use strict';

/* ===== 14-1 Egg Rescue (mode 'eggrescue', World 14 "Dino Valley", team) =====
   Pip and Bo carry Mama Dino's giant wobbly egg home on a leaf stretcher, one at each end (Gavyn's pick). Side-on and
   scrolling: the mode owns the tick, the camera, the whole picture and the HUD (def.ownStep + def.ownHUD); the engine
   grid is empty apart from the two spawns.
   THE STRETCHER: the FRONT carrier walks on the right and leads, the BACK carrier follows on the left. The leaf has a
   fixed length: the carriers stay D0 px apart and it only gives a little (Dmin..Dmax), so nobody gets anywhere alone,
   and a carrier who stops holds the other back ("Wait for me!").
   THE EGG rolls along the leaf toward the lower end. Each carrier's hand height is their feet minus handY, plus the
   action (hold: LIFT your end over your head) or ▼ (hold: LOW, carry it at your knees). On a slope, a bobbing stone, a
   sagging vine bridge or a ledge one end is higher, so the high end goes low and the low end lifts. The leaf is a little
   bowl, so a level leaf brings the egg back to the middle. The egg at the very end of the leaf clonks your hands
   ("Eek!"); if it gets there fast, or stays there pushed for a moment, it bounces off.
   HOPS: logs, a sleepy dino's tail, creeks, gaps between river stones and ledges block your feet. Only a TOGETHER hop
   gets over them: ▲ gets you ready (hold it and you stay crouched, ready), and the moment both carriers are ready you
   both bound forward the same distance ("Together!"), aimed so both land on safe ground. A quick tap with no partner
   waits `grace` s for them; then it is a SOLO hop: your end jumps up, the egg flips off it and usually bounces off the
   leaf. A long hold you let go of just stands you back up.
   A dropped egg is never broken: "BOING! Dino eggs are tough!", it bounces, and Terry the pterodactyl flies it back to
   the last nest checkpoint (the pair goes there too).
   THE HATCH CLOCK: the egg wiggles and cracks a little more as time goes (it sets the medal, it never fails you).
   Rooms (the jobs swap every room: Pip leads rooms 1 and 3, Bo rooms 2 and 4):
     1 Fern Path (warm-up): hills, logs, a creek, a sleeping dino's tail.
     2 River Stepping Stones: stones 130 px apart (one per carrier) bob up and down and dip when stood on.
     3 Geyser Field: warm steam vents bubble, then PUFF: a carrier on one floats up, an egg over one pops into the air
       (stop and it lands back on the leaf). Cross while they rest.
     4 Mama's Nest: steep climbs, ledges (hop up one at a time and level the leaf between) and a saggy vine bridge;
       the egg rolls into Mama's nest and hatches into a baby dino.
   The front's panel shows what's coming next (the front leads and sees it first); the back's panel watches the egg.
   Gold help (announced): Gold vines (a longer together window) after 3 solo hops in a room; Sticky leaf after 2 drops
   in a room and Super sticky leaf after 4 (counted only for drops when you both took part); Sleepy geysers after 2
   geyser drops; Steady stones after 2 river drops.
   Room def: { title, front: 0|1, tip, course: [tokens] }. Course tokens (lengths in px):
     fN uN UN dN DN   flat / gentle up / steep up / gentle down / steep down for N px
     L  a log    T  a sleeping dino's tail    cN  a creek N px wide    eN  a ledge N px up
     R:n,amp,per,sink   a river with n stepping stones (bob amp px, period s, dip px when stood on)
     B:len,sag   a vine bridge over a ravine    v[:phase[,big]]   a steam vent
     n  a nest checkpoint    S:text  a sign    D:kind  scenery    X  the swap nest (room end)    E  Mama's nest (finish)
   Every global is prefixed egg / EGG (and Sfx.extra.egg*); all state lives in G.mst. */
const EGG = {
  D0: 130, Dmin: 110, Dmax: 150, hand: 10,     // carrier centres apart, and how far the leaf gives; hands sit 10 px in from each centre
  walk: 116, lowWalk: 78, acc: 900, fric: 1500,
  stepUp: 8, stepDown: 9, foot: 7,
  handY: 30, liftY: 24, lowY: 16, readyY: 5, handRate: 150,
  hopDX: 88, hopMin: 40, hopMax: 134, hopH: 60, hopT: 0.56, hopUp: 44, hopRest: 0.42,
  soloH: 42, soloT: 0.46, tapMax: 0.3, grace: 0.26, graceGold: 0.5,
  // the egg on the leaf (s: px from the middle, + toward the front)
  eggR: 17, eggH: 21, sMax: 42, sag: 11,
  Kg: 1000, bowl: 7.5, damp: 1.1, accK: 0.45, vDrop: 120, edgeT: 0.6,
  flick: 165, flickV: 260, eggG: 1500, popV: 440, popBig: 540,
  sticky: [{ kg: 1, damp: 1, vDrop: 1, flick: 1, edgeT: 1 },
    { kg: 0.72, damp: 2.1, vDrop: 1.4, flick: 0.5, edgeT: 1.8 },
    { kg: 0.5, damp: 3.2, vDrop: 1.9, flick: 0.28, edgeT: 2.8 }],
  slopes: { f: 0, u: -0.17, U: -0.3, d: 0.17, D: 0.28 }, blend: 60,
  // steam vents: rest, bubble (warning), puff; r: how wide a puff reaches
  vent: { quiet: 2.7, warn: 1.25, puff: 0.85, r: 26, lift: 38 },
  soloHelp: 3, dropHelp: 2, dropHelp2: 4, ventHelp: 2, stoneHelp: 2, tryWin: 6,
  medal: [260, 480],               // Gold up to medal[0] s (the egg is home before the hatch clock runs out) and 2 drops, Silver up to medal[1] s and 7 drops
  hatchT: 260, dropT: 1.45, backT: 1.0, swapT: 1.9, finT: 6.2, hintLife: 2.8,
  camLead: 340, camY: 362, introDrop: 40,
};
const eggLerp = (a, b, u) => a + (b - a) * u;
const eggSmooth = u => u * u * (3 - 2 * u);

/* ---------- the course: tokens -> ground (2 px steps), obstacles, rivers, vents, scenery ---------- */
function eggCompile(def) {
  const P = EGG, X0 = -700, front = def.front || 0;
  const name = s => s.replace(/\{F\}/g, NAMES[front]).replace(/\{B\}/g, NAMES[1 - front]);
  const c = { x0: X0, obst: [], gaps: [], vents: [], nests: [], signs: [], deco: [], ledges: [], swap: null, mama: null, things: [] };
  const knots = [{ x: X0, s: 0 }], steps = [];
  let x = 0;
  const flat = n => { knots.push({ x, s: 0 }); x += n; };
  for (const tk of def.course || []) {
    const t = String(tk), ch = t[0], arg = t.includes(':') ? t.slice(2) : '', n = parseInt(t.slice(1), 10) || 0;
    if ('fuUdD'.includes(ch) && !arg) { knots.push({ x, s: P.slopes[ch] }); x += n; }
    else if (ch === 'L') { flat(16); c.obst.push({ x0: x, x1: x + 30, h: 24, kind: 'log', ph: c.obst.length }); x += 30; flat(16); }
    else if (ch === 'T') { flat(16); c.obst.push({ x0: x, x1: x + 46, h: 18, kind: 'tail', ph: c.obst.length, hopped: 0 }); x += 46; flat(16); }
    else if (ch === 'c') { flat(20); c.gaps.push({ x0: x, x1: x + n, kind: 'creek' }); x += n; flat(20); }
    else if (ch === 'e') { flat(10); steps.push({ x, dy: -n }); c.ledges.push({ x, h: n }); flat(30); }
    else if (ch === 'R') {
      const [cnt, amp, per, sink] = arg.split(',').map(Number), sp = P.D0, w = 60;
      flat(10);
      const g = { x0: x, x1: x + 70 + (cnt - 1) * sp + 70, kind: 'river', stones: [], amp: amp || 8, tries: 0, gold: 0 };
      for (let k = 0; k < cnt; k++) {
        const cx = x + 70 + k * sp, ww = w - (k % 3 === 1 ? 6 : 0);
        g.stones.push({ x0: cx - ww / 2, x1: cx + ww / 2, cx, amp: amp || 8, per: (per || 3) * (0.85 + 0.3 * ((k * 37) % 10) / 10), ph: k * 1.7, sink: sink || 6, dip: 0, y: 0, base: 0, n: 0 });
      }
      c.gaps.push(g); x = g.x1; flat(10);
    } else if (ch === 'B') {
      const [len, sag] = arg.split(',').map(Number);
      flat(10);
      c.gaps.push({ x0: x, x1: x + len, kind: 'bridge', sag: sag || 30, load: 0, y0: 0 }); x += len; flat(10);
    } else if (ch === 'v') {
      const [ph, big] = arg ? arg.split(',').map(Number) : [0, 0];
      flat(30); c.vents.push({ x, ph: ph || 0, big: !!big, state: 'quiet', t: 0, popped: false, lifted: [false, false], drops: 0 }); flat(30);
    } else if (ch === 'n') { flat(40); c.nests.push({ x: x - 20, lit: false, litT: 0 }); }
    else if (ch === 'S') c.signs.push({ x, text: name(arg) });
    else if (ch === 'D') c.deco.push({ x, kind: arg, t: 0, seen: false });
    else if (ch === 'X') { flat(60); c.swap = { x }; flat(400); }
    else if (ch === 'E') { flat(40); c.mama = { x: x + 70, nestX: x + 70 }; flat(520); }
  }
  knots.push({ x, s: 0 });
  c.len = x + 900;
  c.nests.unshift({ x: -40, lit: true, litT: 1, start: true });   // (the start is checkpoint 0)
  // ground y every 2 px: the slope of each stretch, blended over P.blend px at each change; ledges are sudden steps
  const N = Math.ceil((c.len - X0) / 2) + 2, gy = new Float32Array(N);
  const slopeAt = xx => {
    let k = 0;
    while (k + 1 < knots.length && knots[k + 1].x <= xx) k++;
    let s = knots[k].s;
    const Bh = P.blend / 2;
    if (k + 1 < knots.length && knots[k + 1].x - xx < Bh) s = eggLerp(s, knots[k + 1].s, eggSmooth((xx - (knots[k + 1].x - Bh)) / (2 * Bh)));
    else if (k > 0 && xx - knots[k].x < Bh) s = eggLerp(knots[k - 1].s, s, eggSmooth((xx - (knots[k].x - Bh)) / (2 * Bh)));
    return s;
  };
  let y = 0, si = 0;
  for (let i = 0; i < N; i++) {
    const xx = X0 + i * 2;
    while (si < steps.length && steps[si].x <= xx) { y += steps[si].dy; si++; }
    gy[i] = y; y += slopeAt(xx) * 2;
  }
  c.gy = gy;
  // ledges keep the lower ground's height for drawing their face
  for (const l of c.ledges) { l.yTop = eggGYc(c, l.x + 2); l.yBot = eggGYc(c, l.x - 2); }
  for (const g of c.gaps) { g.y0 = eggGYc(c, g.x0 - 4); g.y1 = eggGYc(c, g.x1 + 4); }
  for (const g of c.gaps) if (g.kind === 'river') for (const s of g.stones) { s.base = g.y0 + 6; s.y = s.base; }
  // ferns, flowers and pebbles along the path, placed once
  c.plants = [];
  for (let xx = -500; xx < c.len - 300; xx += 38) {
    const h = hash(xx, 141);
    if (h % 4 === 0) continue;
    if (c.gaps.some(g => xx > g.x0 - 24 && xx < g.x1 + 24) || c.obst.some(o => xx > o.x0 - 20 && xx < o.x1 + 20)) continue;
    if (c.ledges.some(l => Math.abs(xx - l.x) < 24) || c.vents.some(v => Math.abs(xx - v.x) < 40)) continue;
    c.plants.push({ x: xx + (h % 26), kind: h % 9 === 0 ? 'flower' : h % 3 === 0 ? 'pebble' : 'fern', s: 0.6 + ((h >> 5) % 50) / 100, h });
  }
  return c;
}
function eggGYc(c, x) {
  const a = c.gy, f = (x - c.x0) / 2, i = Math.floor(f);
  if (i < 0) return a[0];
  if (i >= a.length - 1) return a[a.length - 1];
  return a[i] + (a[i + 1] - a[i]) * (f - i);
}
const eggGY = (st, x) => eggGYc(st.c, x);
// the bridge's planks under x: it sags in the middle, more with each carrier on it
function eggBridgeY(g, x) {
  const u = clamp((x - g.x0) / (g.x1 - g.x0), 0, 1);
  return eggLerp(g.y0, g.y1, u) + Math.sin(Math.PI * u) * (g.sag * (0.35 + 0.32 * g.load));
}
// what your feet stand on at x: the ground, the top of a log or tail, a stone, the bridge; null over water or a gap
function eggSurf(st, x) {
  const c = st.c;
  for (const g of c.gaps) if (x > g.x0 && x < g.x1) {
    if (g.kind === 'river') { for (const s of g.stones) if (x >= s.x0 && x <= s.x1) return s.y; return null; }
    if (g.kind === 'bridge') return eggBridgeY(g, x);
    return null;
  }
  const y = eggGY(st, x);
  for (const o of c.obst) if (x >= o.x0 && x <= o.x1) return y - o.h;
  return y;
}
// the ground under x for drawing and for a falling egg (water and gaps: the bottom of the water)
function eggFloor(st, x) {
  const s = eggSurf(st, x);
  if (s != null) return s;
  const g = st.c.gaps.find(gg => x > gg.x0 && x < gg.x1);
  return g ? Math.max(g.y0, g.y1) + (g.kind === 'bridge' ? 150 : 26) : eggGY(st, x);
}
// a safe place to land a hop: firm ground under both feet, not on a log or tail, not at a ledge's edge
function eggSafe(st, x, fromY) {
  const c = st.c, a = eggSurf(st, x - 8), b = eggSurf(st, x + 8), m = eggSurf(st, x);
  if (a == null || b == null || m == null) return false;
  if (Math.abs(a - b) > 6) return false;
  if (c.obst.some(o => x > o.x0 - 10 && x < o.x1 + 10)) return false;
  if (fromY != null && fromY - m > EGG.hopUp) return false;
  return true;
}
// each player's own keys, for prompts and the HUD (a player with a controller is shown its buttons)
function eggKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'jump') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'down') return pad ? 'stick ▼' : touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'right') return pad ? 'stick ▶' : touch ? '▶' : id === 0 ? 'D' : '→';
  if (what === 'left') return pad ? 'stick ◀' : touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
  return pad ? 'stick' : touch ? '◀ ▶' : id === 0 ? 'A D' : '← →';
}
// 1-player mode: the computer's own job gets no key hints or prompts (it knows its job)
const eggQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

/* ---------- a room ---------- */
function eggRoom(st, L, k) {
  const P = EGG, def = L.def;
  st.k = k; st.front = def.front || 0; st.back = 1 - st.front; st.title = def.title || '';
  st.c = eggCompile(def);
  st.stats.roomT[k] = null; st.stats.roomDrops[k] = 0; st.stats.roomTitles[k] = st.title;
  st.cp = 0; st.roomDrops = 0; st.helpDrops = 0; st.solos = 0; st.sticky = 0; st.goldVines = false; st.sleepy = false; st.steady = false;
  st.ventDrops = 0; st.stoneDrops = 0;
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null;
  st.roomT = 0; st.segStart = G.time; st.inT = [-99, -99]; st.swap = null; st.fin = null; st.drop = null; st.wrongT = [0, 0];
  st.ptero = null; st.wiggleT = 6; st.wiggle = 0; st.lastVx = 0; st.pairAcc = 0;
  eggPlace(st, 0);
  st.cam = { x: eggMid(st) - P.camLead, y: st.cr[st.back].y - P.camY - P.introDrop };
  st.state = 'walk';
  eggMirror(st);
}
// both carriers at nest i, standing still, the egg in the middle of the leaf
function eggPlace(st, i) {
  const P = EGG, n = st.c.nests[i], xb = n.x + 6, xf = xb + P.D0;
  const mk = (x, id) => ({ x, y: eggSurf(st, x), vx: 0, air: null, ready: null, lift: 0, liftPx: 0, face: 1, step: 0, atEdge: false, id, puffT: 0, sq: 0, rest: 0 });
  st.cr = [];
  st.cr[st.back] = mk(xb, st.back); st.cr[st.front] = mk(xf, st.front);
  st.egg = { s: 0, v: 0, air: false, wx: 0, wy: 0, wvx: 0, wvy: 0, edgeT: 0, wob: 0, spin: 0, ang: 0, clonk: 0, appear: 0.5, fresh: 0.4 };
  st.lock = 0.35;
}
const eggF = st => st.cr[st.front];
const eggB = st => st.cr[st.back];
const eggMid = st => (st.cr[0].x + st.cr[1].x) / 2;
// the two hands (leaf ends) in world px
function eggHands(st) {
  const P = EGG, F = eggF(st), B = eggB(st);
  const hy = c => c.y - P.handY - c.liftPx - (c.puffT > 0 ? 0 : 0);
  return { bx: B.x + P.hand, by: hy(B), fx: F.x - P.hand, fy: hy(F) };
}
// the leaf's top surface at world x (a sagging bowl between the hands)
function eggLeafY(st, x, h) {
  h = h || eggHands(st);
  const u = clamp((x - h.bx) / Math.max(1, h.fx - h.bx), 0, 1);
  return eggLerp(h.by, h.fy, u) + EGG.sag * (1 - (2 * u - 1) * (2 * u - 1));
}
// the leaf's tilt: + when the front end is lower (the egg rolls toward the front)
function eggTilt(st, h) { h = h || eggHands(st); return (h.fy - h.by) / Math.max(1, h.fx - h.bx); }
function eggEggPos(st) {
  const e = st.egg;
  if (e.air) return { x: e.wx, y: e.wy };
  const h = eggHands(st), x = (h.bx + h.fx) / 2 + e.s;
  return { x, y: eggLeafY(st, x, h) - EGG.eggH + 3 };
}
const eggStick = st => EGG.sticky[st.sticky || 0];

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function eggStep(st, dt) {
  if (!st.cr) return;
  const ps = G.players;
  for (const k of [0, 1]) {
    const i = ps[k].input;
    if (i.left || i.right || i.jump || i.down || i.act || ps[k].pendingJump) st.inT[k] = G.time;
  }
  if (G.introT > 0) {
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
    eggCam(st, dt); eggFx(st, dt); eggMirror(st);
    return;
  }
  st.roomT += dt;
  eggWorld(st, dt);
  if (st.state === 'walk') eggWalk(st, dt);
  else if (st.state === 'drop') eggDropStep(st, dt);
  else if (st.state === 'swap') { if (eggSwapStep(st, dt)) return; }
  else if (st.state === 'finish') { if (eggFinStep(st, dt)) return; }
  eggCam(st, dt);
  eggFx(st, dt);
  eggMirror(st);
}
// stones bob and dip, the bridge sags, vents bubble and puff (these keep going during a drop)
function eggWorld(st, dt) {
  const c = st.c, cr = st.cr;
  for (const g of c.gaps) {
    if (g.kind === 'river') {
      const amp = st.steady ? 0.4 : 1;
      for (const s of g.stones) {
        s.n = cr.filter(q => !q.air && q.x >= s.x0 - 1 && q.x <= s.x1 + 1).length;
        s.dip = approach(s.dip, s.sink * s.n * (st.steady ? 0.5 : 1), dt * 28);
        s.y = s.base + s.amp * amp * Math.sin(Math.PI * 2 * st.roomT / s.per + s.ph) + s.dip;
      }
    } else if (g.kind === 'bridge') {
      const n = cr.filter(q => !q.air && q.x > g.x0 && q.x < g.x1).length;
      g.load = approach(g.load, n, dt * 2.2);
    }
  }
  for (const v of c.vents) {
    const V = eggVentT(v), t = (st.roomT + v.ph) % V.per, was = v.state;
    v.state = t < V.quiet ? 'quiet' : t < V.quiet + V.warn ? 'warn' : 'puff';
    v.t = t;
    const onScreen = Math.abs(v.x - eggMid(st)) < 640;
    if (v.state === 'warn' && was !== 'warn' && onScreen) Sfx.play('eggPuffWarn');
    if (v.state === 'puff' && was !== 'puff') { v.popped = false; v.lifted = [false, false]; if (onScreen) Sfx.play(v.big ? 'eggPuffBig' : 'eggPuff'); }
  }
}
const eggVentT = v => {
  const V = EGG.vent;
  return v.big ? { quiet: V.quiet + 1.1, warn: V.warn + 0.35, puff: V.puff + 0.5, per: V.quiet + V.warn + V.puff + 1.95, r: V.r + 14 }
    : { quiet: V.quiet, warn: V.warn, puff: V.puff, per: V.quiet + V.warn + V.puff, r: V.r };
};
// seconds until this vent next puffs (0 while puffing), and how much longer it puffs
function eggVentInfo(st, v) {
  const V = eggVentT(v), t = (st.roomT + v.ph) % V.per;
  if (t >= V.quiet + V.warn) return { state: 'puff', toPuff: 0, puffLeft: V.per - t, nextPuff: V.per - t + V.quiet + V.warn, r: V.r, per: V.per };
  return { state: t < V.quiet ? 'quiet' : 'warn', toPuff: V.quiet + V.warn - t, puffLeft: 0, nextPuff: V.quiet + V.warn - t, r: V.r, per: V.per };
}

function eggWalk(st, dt) {
  const P = EGG, ps = G.players, cr = st.cr, e = st.egg;
  st.lock = Math.max(0, st.lock - dt);
  const locked = st.lock > 0;
  const fresh = [ps[0].pendingJump, ps[1].pendingJump];
  for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
  for (const c of cr) { c.px = c.x; }
  /* -- hops: ▲ gets you ready; both ready = a together hop; a lone tap = a solo hop after a moment. After a together
     hop you both find your feet for a moment (rest): a press then waits, so hopping all the way is slower than walking -- */
  const grace = st.goldVines ? P.graceGold : P.grace;
  for (const id of [0, 1]) {
    const c = cr[id], inp = ps[id].input;
    if (c.rest > 0 && !c.air) c.rest = Math.max(0, c.rest - dt);
    if (fresh[id] && !locked && !c.air) {
      if (!c.ready) c.ready = { t: 0, held: true, grace: 0 };
      else { c.ready.held = true; c.ready.t = 0; }
    }
    const r = c.ready;
    if (!r) continue;
    r.t += dt;
    if (r.held && !inp.jump) {
      r.held = false;
      if (r.t < P.tapMax) r.grace = grace; else { c.ready = null; continue; }
    }
    if (!r.held && c.rest <= 0) r.grace -= dt;
  }
  if (cr[0].ready && cr[1].ready && !cr[0].air && !cr[1].air && cr[0].rest <= 0 && cr[1].rest <= 0) eggTogether(st);
  else for (const c of cr) if (c.ready && !c.ready.held && c.ready.grace <= 0 && c.rest <= 0 && !c.air) { c.ready = null; eggSoloHop(st, c); }
  /* -- walking -- */
  for (const id of [0, 1]) {
    const c = cr[id], inp = ps[id].input;
    if (c.air) { eggAirStep(st, c, dt); continue; }
    const dir = locked || c.ready ? 0 : (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const low = inp.down && !inp.act;
    const target = dir * (low ? P.lowWalk : P.walk);
    c.vx = approach(c.vx, target, (dir ? P.acc : P.fric) * dt);
    if (Math.abs(c.vx) > 0.01) {
      const nx = c.x + c.vx * dt;
      if (eggWalkable(st, c, nx)) c.x = nx;
      else c.vx = 0;
    }
    const y = eggSurf(st, c.x);
    if (y != null) c.y = y;
    c.step += Math.abs(c.x - c.px) * 0.09;
  }
  /* -- the leaf only gives a little: nobody walks off alone -- */
  eggStretch(st, dt);
  for (const c of cr) c.atEdge = !c.air && !eggWalkable(st, c, c.x + 2, true);
  /* -- hands: the action lifts your end, ▼ carries it low; getting ready dips it a little -- */
  for (const id of [0, 1]) {
    const c = cr[id], inp = ps[id].input;
    const want = locked ? 0 : (inp.act ? P.liftY : inp.down ? -P.lowY : 0) - (c.ready ? P.readyY : 0);
    c.liftPx = approach(c.liftPx, want, P.handRate * dt);
    c.lift = inp.act ? 1 : inp.down ? -1 : 0;
    if (c.sq > 0) c.sq = Math.max(0, c.sq - dt * 4);
    if ((inp.act || inp.down) && !locked) st.stats.levelT[id] += dt;
  }
  /* -- vents: a carrier on a puffing vent floats up; an egg over one pops into the air -- */
  for (const v of st.c.vents) {
    if (v.state !== 'puff') continue;
    const info = eggVentInfo(st, v), r = info.r;
    for (const c of cr) if (!v.lifted[c.id] && !c.air && Math.abs(c.x - v.x) < r) {
      v.lifted[c.id] = true;
      c.ready = null;
      c.air = { kind: 'puff', t: 0, dur: info.puffLeft + 0.3, x0: c.x, x1: c.x, y0: c.y, H: P.vent.lift * (st.sleepy ? 0.5 : 1) * (v.big ? 1.25 : 1) };
      eggPop(st, c.x, c.y - 60, 'Whee!', '#ffffff', 22);
      Sfx.play('eggWhee', c.id);
      eggHintOnce(st, 'puffme' + c.id, c.id, 'Puffed up! Carry it ' + eggKey(c.id, 'down') + ' low');
    }
    const ep = eggEggPos(st);
    if (!v.popped && !e.air && Math.abs(ep.x - v.x) < r + 8) {
      v.popped = true;
      e.air = true; e.wx = ep.x; e.wy = ep.y; e.wvx = st.pairV || 0; e.wvy = -(v.big ? P.popBig : P.popV) * (st.sleepy ? 0.62 : 1);
      e.spin = (Math.random() - 0.5) * 8; st.popVent = v;
      eggPop(st, ep.x, ep.y - 50, 'POP!', '#fff3c4', 30);
      Sfx.play('eggPop');
      eggHint(st, st.front, 'Stop! Let it land on the leaf!', 2.4);
      eggHint(st, st.back, 'Stop! Let it land on the leaf!', 2.4);
    }
  }
  /* -- the egg -- */
  const mid = eggMid(st), pv = st.lastMid == null ? 0 : (mid - st.lastMid) / dt;
  st.pairAcc = approach(st.pairAcc || 0, (pv - (st.pairV || 0)) / dt, 6000 * dt);
  st.pairV = pv; st.lastMid = mid;
  if (e.air) { if (eggEggAir(st, dt)) return; }
  else if (eggEggRoll(st, dt)) return;
  /* -- checkpoints -- */
  const c = st.c, B = eggB(st), F = eggF(st);
  for (let i = st.cp + 1; i < c.nests.length; i++) {
    const n = c.nests[i];
    if (B.x > n.x + 4 && !e.air) {
      st.cp = i; n.lit = true; n.litT = 0;
      eggPop(st, n.x, eggGY(st, n.x) - 70, 'Nest checkpoint!', '#ffe27a', 18);
      Sfx.play('eggCheck');
      for (let k = 0; k < 14; k++) { const a = Math.random() * Math.PI * 2; eggPart(st, n.x, eggGY(st, n.x) - 16, Math.cos(a) * 100, Math.sin(a) * 100 - 50, 0.7, k % 2 ? '#ffe27a' : '#ff9fc8', 3, 80, 'spark'); }
    }
  }
  /* -- the hatch clock: the egg wiggles now and then, more as it gets ready to hatch -- */
  eggHatchTick(st, dt);
  /* -- scenery wakes up as you pass -- */
  for (const d of c.deco) if (!d.seen && Math.abs(d.x - F.x) < 150) {
    d.seen = true;
    if (d.kind === 'trike' || d.kind === 'stego') { Sfx.play('eggRawr'); eggPop(st, d.x, eggGY(st, d.x) - 96, d.kind === 'trike' ? 'Rawr! (that means hi!)' : 'Good luck!', '#ffffff', 16); }
    else if (d.kind === 'ptero') Sfx.play('eggSquawk');
  }
  for (const o of c.obst) if (o.kind === 'tail' && !o.giggle && B.x > o.x1 + 6) { o.giggle = 1; eggPop(st, o.x0, eggGY(st, o.x0) - 70, 'Hee hee, that tickles!', '#ffffff', 16); Sfx.play('eggGiggle'); }
  /* -- the room end: the swap nest, or Mama's nest -- */
  if (c.swap && mid >= c.swap.x && !e.air && !F.air && !B.air) { eggStartSwap(st); return; }
  if (c.mama && F.x >= c.mama.nestX - 96 && !e.air && !F.air && !B.air) { eggStartFinish(st); return; }
  eggNudges(st, dt);
}
// can a carrier on the ground step to nx? (no gaps, no step up or down bigger than a little)
function eggWalkable(st, c, nx, look) {
  const P = EGG, dir = nx >= c.x ? 1 : -1;
  const ahead = eggSurf(st, nx + dir * (P.foot + (look ? 1 : 0))), here = eggSurf(st, nx);
  if (ahead == null || here == null) return false;
  if (c.y - ahead > P.stepUp || ahead - c.y > P.stepDown) return false;
  if (nx < st.c.nests[0].x - 120) return false;
  return true;
}
function eggStretch(st, dt) {
  const P = EGG, F = eggF(st), B = eggB(st), ps = G.players;
  let d = F.x - B.x;
  const fix = (excess, sign) => {
    // undo whatever part of this tick's steps pulled the ends too far apart (or pushed them too close)
    const mf = Math.max(0, sign * (F.x - F.px)), mb = Math.max(0, -sign * (B.x - B.px)), tot = mf + mb;
    const kf = tot > 0 ? mf / tot : 0.5, kb = tot > 0 ? mb / tot : 0.5;
    F.x -= sign * excess * kf; B.x += sign * excess * kb;
    if (kf > 0.05) { F.vx = sign > 0 ? Math.min(F.vx, B.vx) : Math.max(F.vx, B.vx); F.heldT = (F.heldT || 0) + dt; }
    if (kb > 0.05) { B.vx = sign > 0 ? Math.max(B.vx, F.vx) : Math.min(B.vx, F.vx); B.heldT = (B.heldT || 0) + dt; }
    for (const c of [F, B]) { const y = eggSurf(st, c.x); if (y != null && !c.air) c.y = y; }
  };
  if (d > P.Dmax) fix(d - P.Dmax, 1);
  else if (d < P.Dmin) fix(P.Dmin - d, -1);
  else { F.heldT = 0; B.heldT = 0; }
  // held back for a moment: say why, to whoever is waiting for whom
  d = F.x - B.x;
  if ((F.heldT || 0) > 0.8 && d >= P.Dmax - 0.5 && ps[st.front].input.right && !B.ready) eggHintEvery(st, 'wait', st.back, 'Walk with ' + NAMES[st.front] + '! ' + eggKey(st.back, 'right'), 12);
  if ((B.heldT || 0) > 0.8 && d <= P.Dmin + 0.5 && ps[st.back].input.right && !F.ready) eggHintEvery(st, 'push', st.front, 'Lead the way! ' + eggKey(st.front, 'right'), 12);
}
function eggAirStep(st, c, dt) {
  const a = c.air;
  a.t += dt;
  const u = clamp(a.t / a.dur, 0, 1);
  if (a.kind === 'hop') {
    c.x = eggLerp(a.x0, a.x1, u);
    const yl = eggSurf(st, a.x1);
    c.y = eggLerp(a.y0, yl == null ? a.y0 : yl, u) - a.H * 4 * u * (1 - u);
  } else {
    const base = eggSurf(st, c.x);
    const env = a.kind === 'puff' ? (u < 0.25 ? eggSmooth(u / 0.25) : u > 0.75 ? eggSmooth((1 - u) / 0.25) : 1) : 4 * u * (1 - u);
    c.y = (base == null ? a.y0 : base) - a.H * env;
  }
  c.vx = a.kind === 'hop' ? (a.x1 - a.x0) / a.dur : 0;
  if (u >= 1) {
    const y = eggSurf(st, c.x);
    if (y == null) { c.x = a.x0; const y0 = eggSurf(st, c.x); c.y = y0 == null ? a.y0 : y0; } else c.y = y;
    c.air = null; c.vx = 0; c.sq = 1;
    Sfx.play('eggLand', c.id);
    if (st.c.gaps.some(g => g.kind === 'river' && c.x > g.x0 && c.x < g.x1)) { Sfx.play('eggSplish'); for (let k = 0; k < 6; k++) eggPart(st, c.x + (Math.random() - 0.5) * 30, c.y + 4, (Math.random() - 0.5) * 80, -60 - Math.random() * 60, 0.5, '#bfe9ff', 2.5, 500); }
    else for (let k = 0; k < 5; k++) eggPart(st, c.x + (Math.random() - 0.5) * 20, c.y - 2, (Math.random() - 0.5) * 70, -30 - Math.random() * 30, 0.4, 'rgba(190,160,110,0.8)', 3, 300);
    if (a.kind === 'hop') {
      c.rest = EGG.hopRest;
      // landing jiggles the egg (more when you land at different heights)
      const o = st.cr[1 - c.id];
      if (c.id === st.front && !st.egg.air) { st.egg.wob = Math.max(st.egg.wob, 0.35); st.egg.v += (Math.random() - 0.5) * 30 + (o.air ? 0 : clamp((c.y - o.y) * 1.2, -40, 40)); }
    }
  }
}
// the safe hop distance for both of you right now (closest to a normal hop), or null
function eggHopDx(st) {
  const P = EGG, F = eggF(st), B = eggB(st);
  let best = null;
  for (let dx = P.hopMin; dx <= P.hopMax; dx += 2) {
    if (best != null && Math.abs(dx - P.hopDX) >= Math.abs(best - P.hopDX)) continue;
    if (eggSafe(st, F.x + dx, F.y) && eggSafe(st, B.x + dx, B.y)) best = dx;
  }
  return best;
}
function eggTogether(st) {
  const P = EGG, cr = st.cr, dx = eggHopDx(st);
  for (const c of cr) c.ready = null;
  const F = eggF(st);
  if (dx == null) {
    eggPop(st, F.x, F.y - 90, 'Not from here! Walk closer', '#ffe7a8', 18);
    Sfx.play('eggNope');
    return;
  }
  for (const c of cr) c.air = { kind: 'hop', t: 0, dur: P.hopT, x0: c.x, x1: c.x + dx, y0: c.y, H: P.hopH };
  st.stats.together++;
  const m = eggMid(st);
  eggPop(st, m, F.y - 120, 'Together!', C.gold, 26);
  Sfx.play('eggTogether');
  rumble(0, 0.1, 0.3, 80); rumble(1, 0.1, 0.3, 80);
  st.hints = [null, null];
  for (let k = 0; k < 10; k++) eggPart(st, m + (Math.random() - 0.5) * 80, F.y - 60, (Math.random() - 0.5) * 120, -60 - Math.random() * 80, 0.6, k % 2 ? C.gold : '#9be07a', 3, 300, 'spark');
}
// a hop on your own: your end jumps up and the egg flips toward the other end (it usually bounces off the leaf)
function eggSoloHop(st, c) {
  const P = EGG, e = st.egg, ss = eggStick(st);
  c.air = { kind: 'solo', t: 0, dur: P.soloT, x0: c.x, x1: c.x, y0: c.y, H: P.soloH };
  Sfx.play('jump', c.id);
  st.stats.solos++;
  if (G.time - st.inT[1 - c.id] < P.tryWin) st.solos++;
  if (!e.air) {
    const ep = eggEggPos(st), away = c.id === st.front ? -1 : 1;
    e.air = true; e.wx = ep.x; e.wy = ep.y; e.wvx = (st.pairV || 0) + away * P.flick * ss.flick + e.v * 0.3; e.wvy = -P.flickV * (0.6 + 0.4 * ss.flick);
    e.spin = away * 9; st.popVent = null;
    eggPop(st, c.x, c.y - 70, 'Whoa! Hop TOGETHER!', '#ffffff', 20);
    Sfx.play('eggWhoa');
  }
  const o = 1 - c.id;
  eggHint(st, c.id, 'Hold ' + eggKey(c.id, 'jump') + ' and wait for ' + NAMES[o] + '!', 3);
  eggHint(st, o, 'Hop with ' + NAMES[c.id] + ': ' + eggKey(o, 'jump') + '!', 3);
  if (st.solos >= P.soloHelp && !st.goldVines) {
    st.goldVines = true; st.stats.helps++;
    eggMsg(st, 'Gold vines! You have longer to hop together now', C.gold, 3.6);
    Sfx.play('eggHelp');
  }
}
/* ---------- the egg ---------- */
function eggEggRoll(st, dt) {
  const P = EGG, e = st.egg, ss = eggStick(st), h = eggHands(st), tilt = eggTilt(st, h);
  let a = P.Kg * ss.kg * tilt - P.bowl * e.s - P.damp * ss.damp * e.v - P.accK * clamp(st.pairAcc || 0, -1500, 1500);
  if (st.wiggle > 0) a += st.wiggleDir * 240 * ss.kg;
  e.v += a * dt; e.s += e.v * dt;
  e.ang = approach(e.ang, clamp(e.v * 0.004, -0.4, 0.4), dt * 3);
  if (e.fresh > 0) { e.fresh -= dt; e.s *= 0.9; e.v *= 0.9; }
  const lim = P.sMax;
  if (Math.abs(e.s) >= lim) {
    const out = Math.sign(e.s);
    if (e.v * out > P.vDrop * ss.vDrop) { eggStartDrop(st, 'roll'); return true; }
    e.s = out * lim;
    if (e.v * out > 0) {
      if (e.v * out > 30 && e.clonk <= 0) {
        e.clonk = 0.5; e.wob = 0.5;
        const who = out > 0 ? st.front : st.back, c = st.cr[who];
        eggPop(st, c.x, c.y - 80, 'Eek!', '#ffe7a8', 18); Sfx.play('eggClonk');
        eggHintOnce(st, 'edge' + st.k + who, who, 'It rolls to you: ' + eggKey(who, 'act') + ' lift your end!');
      }
      e.v = -e.v * 0.3;
    }
    if (a * out > 40) e.edgeT += dt; else e.edgeT = Math.max(0, e.edgeT - dt * 2);
    if (e.edgeT > P.edgeT * ss.edgeT) { eggStartDrop(st, 'topple'); return true; }
  } else e.edgeT = Math.max(0, e.edgeT - dt * 2);
  if (e.clonk > 0) e.clonk -= dt;
  if (e.wob > 0) e.wob = Math.max(0, e.wob - dt);
  return false;
}
// an egg in the air (popped by a vent or flipped by a solo hop): it lands back on the leaf, or bounces off the ground
function eggEggAir(st, dt) {
  const P = EGG, e = st.egg;
  e.wvy += P.eggG * dt; e.wx += e.wvx * dt; e.wy += e.wvy * dt; e.ang += e.spin * dt;
  const h = eggHands(st);
  if (e.wvy > 0 && e.wx > h.bx + 2 && e.wx < h.fx - 2) {
    const ly = eggLeafY(st, e.wx, h) - P.eggH + 3;
    if (e.wy >= ly && e.wy - e.wvy * dt <= ly + 16) {
      e.air = false; e.s = e.wx - (h.bx + h.fx) / 2; e.v = (e.wvx - (st.pairV || 0)) * 0.5; e.wob = 0.6;
      e.ang = 0; e.spin = 0;
      Sfx.play('eggPlop');
      eggPop(st, e.wx, ly - 40, Math.abs(e.s) < 25 ? 'Phew!' : 'Eep!', '#ffffff', 18);
      if (Math.abs(e.s) > P.sMax) { e.s = Math.sign(e.s) * P.sMax; if (Math.abs(e.v) > P.vDrop * eggStick(st).vDrop) { eggStartDrop(st, st.popVent ? 'vent' : 'solo'); return true; } }
      return false;
    }
  }
  if (e.wy + P.eggH >= eggFloor(st, e.wx) && e.wvy > 0) { eggStartDrop(st, st.popVent ? 'vent' : 'solo'); return true; }
  return false;
}
function eggStartDrop(st, why) {
  const P = EGG, e = st.egg;
  if (!e.air) {
    const ep = eggEggPos(st), out = Math.sign(e.s) || 1;
    e.air = true; e.wx = ep.x; e.wy = ep.y; e.wvx = (st.pairV || 0) + out * Math.max(60, Math.abs(e.v)); e.wvy = -120; e.spin = out * 6;
  }
  st.state = 'drop'; st.drop = { t: 0, why, bounces: 0, wet: false, landed: false };
  for (const c of st.cr) c.ready = null;
  st.stats.drops++; st.stats.roomDrops[st.k]++; st.roomDrops++;
  const both = G.time - st.inT[0] < P.tryWin && G.time - st.inT[1] < P.tryWin;
  if (both) {
    st.helpDrops++;
    if (why === 'vent') st.ventDrops++;
    if (st.c.gaps.some(g => g.kind === 'river' && eggMid(st) > g.x0 - 60 && eggMid(st) < g.x1 + 60)) st.stoneDrops++;
  }
  Sfx.play('eggUhoh');
  rumble(0, 0.4, 0.5, 200); rumble(1, 0.4, 0.5, 200);
  // what went wrong, said to whoever can fix it
  const tiltNow = eggTilt(st), low = tiltNow > 0 ? st.front : st.back, high = 1 - low;
  if (why === 'roll' || why === 'topple') {
    eggHint(st, low, 'Lift your end ' + eggKey(low, 'act') + ' when the egg rolls to you!', 3.4);
    eggHint(st, high, 'Carry it low ' + eggKey(high, 'down') + ' when your end is high!', 3.4);
  } else if (why === 'vent') {
    eggHint(st, st.front, 'Wait for the puff, then go!', 3.2);
    eggHint(st, st.back, 'Stop when the egg pops up!', 3.2);
  }
}
function eggDropStep(st, dt) {
  const P = EGG, e = st.egg, d = st.drop;
  d.t += dt;
  // the carriers stop and stare (and land, if they were in the air)
  for (const c of st.cr) {
    c.ready = null;
    if (c.air) eggAirStep(st, c, dt);
    else { c.vx = 0; const y = eggSurf(st, c.x); if (y != null) c.y = y; }
    c.liftPx = approach(c.liftPx, 0, P.handRate * dt);
  }
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
  if (!d.wet) {
    e.wvy += P.eggG * dt; e.wx += e.wvx * dt; e.wy += e.wvy * dt; e.ang += e.spin * dt;
    const fl = eggFloor(st, e.wx), wet = eggSurf(st, e.wx) == null && st.c.gaps.some(g => g.kind !== 'bridge' && e.wx > g.x0 && e.wx < g.x1);
    if (e.wy + P.eggH >= fl && e.wvy > 0) {
      if (wet) {
        d.wet = true; d.landed = true; e.wy = fl - P.eggH + 8;
        eggPop(st, e.wx, e.wy - 50, 'SPLOOSH! Dino eggs float!', '#bfe9ff', 24);
        Sfx.play('eggSploosh');
        for (let k = 0; k < 26; k++) { const a = -Math.PI * (0.1 + 0.8 * Math.random()), s = 100 + Math.random() * 220; eggPart(st, e.wx, e.wy + 10, Math.cos(a) * s, Math.sin(a) * s, 0.8, k % 3 ? '#bfe9ff' : '#ffffff', 3 + Math.random() * 3, 700); }
      } else {
        e.wy = fl - P.eggH; d.bounces++;
        e.wvy = -Math.abs(e.wvy) * (d.bounces === 1 ? 0.62 : 0.45); e.wvx *= 0.6; e.spin *= 0.6; e.sq = 1;
        if (d.bounces === 1) {
          d.landed = true;
          eggPop(st, e.wx, e.wy - 60, 'BOING! Dino eggs are tough!', '#ffe27a', 26);
          Sfx.play('eggBoing');
          if (!reduceMotion) G.shake = Math.max(G.shake, 0.12);
        } else if (d.bounces < 4) Sfx.play('eggBoing2');
        if (Math.abs(e.wvy) < 60) { e.wvy = 0; e.wvx = 0; }
        for (let k = 0; k < 8; k++) eggPart(st, e.wx + (Math.random() - 0.5) * 30, fl - 2, (Math.random() - 0.5) * 120, -40 - Math.random() * 50, 0.5, '#d8b27a', 3, 400);
      }
    }
    if (e.wy > fl + 400) d.landed = true;
  }
  if (e.sq > 0) e.sq = Math.max(0, e.sq - dt * 4);
  // Terry the pterodactyl swoops in to fetch it
  if (d.t > P.dropT - 0.6 && !st.ptero) { st.ptero = { t: 0, mode: 'fetch' }; Sfx.play('eggSquawk'); }
  if ((d.t >= P.dropT && d.landed) || d.t >= P.dropT + 1.2) eggBackToNest(st);
}
// Terry flies the egg back, and both of you are back at the last nest
function eggBackToNest(st) {
  const P = EGG;
  for (const c of st.cr) for (let k = 0; k < 12; k++) { const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 120; eggPart(st, c.x, c.y - 20, Math.cos(a) * s, Math.sin(a) * s, 0.7, k % 2 ? '#7ccf4f' : '#b9e88a', 5 + Math.random() * 4, 60, 'leaf'); }
  eggPlace(st, st.cp);
  st.lock = P.backT; st.state = 'walk'; st.drop = null; st.lastMid = null; st.pairV = 0; st.pairAcc = 0;
  const h = eggHands(st);
  st.ptero = { t: 0, mode: 'bring' };
  st.egg.appear = P.backT;
  eggPop(st, (h.bx + h.fx) / 2, h.by - 120, 'Terry brings it back!', '#ffffff', 20);
  for (const v of st.c.vents) v.popped = true;   // (a puff that was already going leaves you alone)
  for (const v of st.c.vents) v.lifted = [true, true];
  // gold help, only for drops you both took part in
  const want = st.helpDrops >= P.dropHelp2 ? 2 : st.helpDrops >= P.dropHelp ? 1 : 0;
  if (want > st.sticky) {
    st.sticky = want; st.stats.helps++;
    eggMsg(st, want === 1 ? 'Sticky leaf! The egg rolls slower now' : 'Super sticky leaf! The egg hardly rolls at all', C.gold, 3.8);
    Sfx.play('eggHelp');
  } else if (st.ventDrops >= P.ventHelp && !st.sleepy) {
    st.sleepy = true; st.stats.helps++;
    eggMsg(st, 'Sleepy geysers! The steam puffs softer now', C.gold, 3.8); Sfx.play('eggHelp');
  } else if (st.stoneDrops >= P.stoneHelp && !st.steady) {
    st.steady = true; st.stats.helps++;
    eggMsg(st, 'Steady stones! They bob much less now', C.gold, 3.8); Sfx.play('eggHelp');
  }
}
/* ---------- the hatch clock ---------- */
const eggHatch = () => clamp(G.time / EGG.hatchT, 0, 1.25);
function eggHatchTick(st, dt) {
  const hz = eggHatch(), e = st.egg;
  const stage = Math.min(4, Math.floor(hz * 4 + 0.0001));
  if (stage > (st.stats.crackStage || 0)) {
    st.stats.crackStage = stage;
    const ep = eggEggPos(st);
    eggPop(st, ep.x, ep.y - 46, stage >= 4 ? 'Crack! It wants to hatch!' : 'Crack!', '#fff3c4', 20);
    Sfx.play('eggCrack');
    if (stage >= 4) eggMsg(st, 'The egg is ready to hatch! Hurry to Mama!', '#ffd2a0', 3.6);
  }
  if (st.wiggle > 0) { st.wiggle -= dt; return; }
  if (hz < 0.3 || e.air) return;
  st.wiggleT -= dt;
  if (st.wiggleT <= 0) {
    st.wiggleT = 9 - 4.5 * Math.min(1, hz) + Math.random() * 3;
    st.wiggle = 0.3; st.wiggleDir = Math.random() < 0.5 ? -1 : 1; e.wob = 0.6;
    const ep = eggEggPos(st);
    eggPop(st, ep.x, ep.y - 40, 'Wiggle wiggle!', '#fff3c4', 16);
    Sfx.play('eggWiggle');
  }
}

/* ---------- the swap nest and Mama's nest ---------- */
function eggStartSwap(st) {
  const P = EGG, F = eggF(st), B = eggB(st);
  st.state = 'swap';
  st.stats.roomT[st.k] = G.time - st.segStart;
  const ep = eggEggPos(st);
  st.swap = { t: 0, f0: { x: F.x, y: F.y }, b0: { x: B.x, y: B.y }, e0: ep, said: false };
  eggPop(st, eggMid(st), F.y - 170, 'Swap ends!', C.gold, 30);
  Sfx.play('eggSwap'); rumble(0, 0.1, 0.4, 120); rumble(1, 0.1, 0.4, 120);
  for (let i = 0; i < 24; i++) { const a = -Math.PI * Math.random(); eggPart(st, st.c.swap.x, eggGY(st, st.c.swap.x) - 70, Math.cos(a) * 200, Math.sin(a) * 200, 0.9, ['#ff9a3d', '#7ccf4f', '#5ec8ff', C.gold][i % 4], 4, 400, 'conf'); }
}
function eggSwapStep(st, dt) {
  const P = EGG, sw = st.swap;
  sw.t += dt;
  for (const c of st.cr) { c.air = null; c.ready = null; c.liftPx = approach(c.liftPx, 0, P.handRate * dt); }
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
  if (sw.t > 0.6 && !sw.said) { sw.said = true; Sfx.play('eggHop', 0); Sfx.play('eggHop', 1); }
  if (sw.t >= P.swapT) {
    const L = G.level;
    if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return true; }
    eggClear(st); return true;
  }
  return false;
}
function eggStartFinish(st) {
  const F = eggF(st), B = eggB(st), m = st.c.mama;
  st.state = 'finish';
  st.stats.roomT[st.k] = G.time - st.segStart;
  st.stats.finishT = G.time;
  st.fin = { t: 0, e0: eggEggPos(st), f0: { x: F.x, y: F.y }, b0: { x: B.x, y: B.y }, cleared: false, hatched: false, nestX: m.nestX, nestY: eggGY(st, m.nestX) };
  eggPop(st, m.nestX, st.fin.nestY - 140, "Mama's nest!", C.gold, 28);
  Sfx.play('eggMama');
  rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
}
function eggFinStep(st, dt) {
  const P = EGG, fin = st.fin;
  fin.t += dt;
  for (const c of st.cr) { c.air = null; c.ready = null; }
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
  const F = eggF(st);
  // the front lowers its end and the egg rolls gently into the nest
  F.liftPx = approach(F.liftPx, -P.lowY, P.handRate * dt);
  if (fin.t > 1.3 && !fin.crack1) { fin.crack1 = true; Sfx.play('eggCrack'); eggPop(st, fin.nestX, fin.nestY - 70, 'Crack...', '#fff3c4', 20); }
  if (fin.t > 2.1 && !fin.crack2) { fin.crack2 = true; Sfx.play('eggCrack'); eggPop(st, fin.nestX, fin.nestY - 76, 'Crack crack!', '#fff3c4', 22); }
  if (fin.t > 2.9 && !fin.hatched) {
    fin.hatched = true;
    st.pops = st.pops.filter(q => !q.s.startsWith('Crack'));   // (so the cracks don't float into the big POP)
    eggPop(st, fin.nestX, fin.nestY - 130, 'POP! Hello, baby dino!', '#ffd75e', 28);
    Sfx.play('eggHatch');
    for (let i = 0; i < 70; i++) confetti(fin.nestX - st.cam.x, fin.nestY - 40 - st.cam.y);
    for (let i = 0; i < 18; i++) { const a = -Math.PI * Math.random(); eggPart(st, fin.nestX, fin.nestY - 30, Math.cos(a) * 160, Math.sin(a) * 200, 0.9, '#fff6dc', 4, 700, 'shell'); }
  }
  if (fin.t > 3.8 && !fin.mama) { fin.mama = true; Sfx.play('eggRawr'); eggPop(st, fin.nestX + 150, fin.nestY - 210, 'Thank you, Pip and Bo!', '#ffffff', 22); }
  if (fin.t > 3.0) { fin.heartT = (fin.heartT || 0) - dt; if (fin.heartT <= 0) { fin.heartT = 0.25; eggPart(st, fin.nestX + 40 + (Math.random() - 0.5) * 120, fin.nestY - 120, (Math.random() - 0.5) * 30, -50, 1.4, '#ff7fae', 7, -10, 'heart'); } }
  if (fin.t >= P.finT && !fin.cleared) { fin.cleared = true; eggClear(st); return true; }
  return false;
}
function eggClear(st) {
  const m = eggMid(st);
  G.level.goal = { x: (st.fin ? st.fin.nestX : m) - st.cam.x, y: (st.fin ? st.fin.nestY - 80 : eggF(st).y - 80) - st.cam.y };
  levelClear();
}
// where the egg is drawn during the finish: rolling off the leaf into the nest
function eggFinEggPos(st) {
  const fin = st.fin, u = clamp((fin.t - 0.3) / 0.8, 0, 1);
  const to = { x: fin.nestX, y: fin.nestY - 24 };
  return { x: eggLerp(fin.e0.x, to.x, eggSmooth(u)), y: eggLerp(fin.e0.y, to.y, u) - 40 * 4 * u * (1 - u), u };
}

/* ---------- what each job needs right now (the prompts, the panels and the computer read this) ---------- */
function eggNeeds(st) {
  const P = EGG, out = { busy: true, hop: false, hopEdge: -1, noDx: false, level: [null, null], diff: 0, next: null, vent: null, ventInfo: null, eggAir: false, s: 0, v: 0, tilt: 0, onRiver: false, dx: null };
  if (!st.cr || st.state !== 'walk') return out;
  out.busy = st.lock > 0;
  const F = eggF(st), B = eggB(st), e = st.egg;
  out.eggAir = e.air; out.s = e.s; out.v = e.v; out.tilt = eggTilt(st);
  // keep it level: the lower end lifts, the higher end carries it low. Lifting moves a hand 24 px and carrying low 16,
  // so a gentle slope needs only one of them (both would tip the egg the other way) and a steep one needs both: pick
  // whichever mix leaves the hands closest to level, with a small cost per job so nobody is asked for nothing
  const diff = F.air || B.air ? 0 : F.y - B.y;
  out.diff = diff;
  let bestSc = Infinity;
  for (const lf of [0, P.liftY, -P.lowY]) for (const lb of [0, P.liftY, -P.lowY]) {
    const sc = Math.abs(diff - (lf - lb)) + 3 * ((lf ? 1 : 0) + (lb ? 1 : 0));
    if (sc < bestSc - 0.01) {
      bestSc = sc;
      out.level[st.front] = lf > 0 ? 'lift' : lf < 0 ? 'low' : null;
      out.level[st.back] = lb > 0 ? 'lift' : lb < 0 ? 'low' : null;
    }
  }
  // a log, a gap or a ledge at someone's feet: hop together
  if (!F.air && !B.air) {
    if (F.atEdge) out.hopEdge = st.front; else if (B.atEdge) out.hopEdge = st.back;
    if (out.hopEdge >= 0) { out.dx = eggHopDx(st); out.hop = out.dx != null; out.noDx = !out.hop; }
  }
  // what's coming next for the front (the front leads and sees it first)
  const fx = F.x, c = st.c, cand = [];
  for (const o of c.obst) if (o.x1 > fx - 4) cand.push({ kind: o.kind, x: o.x0 });
  for (const g of c.gaps) if (g.x0 > fx - 4) cand.push({ kind: g.kind, x: g.x0, g });
  for (const l of c.ledges) if (l.x > fx - 4) cand.push({ kind: 'ledge', x: l.x });
  for (const v of c.vents) if (v.x > fx - 30) cand.push({ kind: 'vent', x: v.x, v });
  if (c.mama) cand.push({ kind: 'mama', x: c.mama.nestX - 96 });
  if (c.swap) cand.push({ kind: 'swap', x: c.swap.x });
  const sl = eggGY(st, fx + 150) - eggGY(st, fx + 60);
  cand.sort((a, b) => a.x - b.x);
  out.next = cand[0] ? Object.assign({ d: cand[0].x - fx }, cand[0]) : null;
  if (out.next && out.next.d > 260 && Math.abs(sl) > 14) out.next = { kind: sl < 0 ? 'uphill' : 'downhill', d: 90 };
  out.onRiver = c.gaps.some(g => g.kind === 'river' && B.x > g.x0 - 20 && F.x < g.x1 + 20);
  // the vent nearest the pair that isn't behind the back carrier yet
  let best = null;
  for (const v of c.vents) {
    const r = eggVentT(v).r;
    if (v.x < B.x - r - 14 || v.x > F.x + 170) continue;
    if (!best || v.x < best.x) best = v;
  }
  if (best) { out.vent = best; out.ventInfo = eggVentInfo(st, best); }
  return out;
}

/* ---------- hints and lessons ---------- */
function eggNudges(st, dt) {
  const nd = eggNeeds(st), F = eggF(st), B = eggB(st), fr = st.front, bk = st.back;
  if (nd.busy) return;
  if (nd.hop && st.k < 2) for (const id of [fr, bk]) eggHintOnce(st, 'hop' + st.k + id, id, 'Hold ' + eggKey(id, 'jump') + ': you hop when you are BOTH ready');
  if (Math.abs(nd.diff) > 12) {
    const lo = nd.diff > 0 ? fr : bk, hi = 1 - lo;
    if (nd.level[lo] === 'lift') eggHintOnce(st, 'lvl' + st.k + lo, lo, 'Your end is low: lift it ' + eggKey(lo, 'act'));
    if (nd.level[hi] === 'low') eggHintOnce(st, 'lvl' + st.k + hi, hi, 'Your end is high: carry it low ' + eggKey(hi, 'down'));
  }
  if (nd.vent && nd.ventInfo.state === 'warn' && nd.vent.x > F.x - 10) eggHintOnce(st, 'vent' + st.k, fr, 'Bubbling! Wait for the puff, then go');
  void B; void dt;
}
function eggHint(st, id, text, life) { if (eggQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || EGG.hintLife }; }
function eggHintOnce(st, key, id, text) { if (st.hinted[key]) return; st.hinted[key] = true; eggHint(st, id, text); }
function eggHintEvery(st, key, id, text, gap) { const k = key + id; if (st.hinted[k] && G.time - st.hinted[k] < gap) return; st.hinted[k] = G.time; eggHint(st, id, text); }
function eggMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function eggPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 10) st.pops.shift(); }
function eggPart(st, x, y, vx, vy, life, col, size, grav, kind) {
  if (st.parts.length > 300) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
function eggCam(st, dt) {
  const P = EGG, cam = st.cam, F = eggF(st), B = eggB(st);
  let tx = eggMid(st) - P.camLead + clamp((st.pairV || 0) * 0.3, -40, 50);
  const yAvg = (F.y + B.y) / 2, ahead = eggGY(st, F.x + 240);
  let ty = yAvg * 0.65 + Math.min(yAvg, ahead) * 0.35 - P.camY;
  if (G.introT > 0) ty -= P.introDrop;
  if (st.state === 'finish') { tx = st.fin.nestX - 470; ty = st.fin.nestY - P.camY + 10; }
  if (st.state === 'drop' && st.egg.air) { tx = tx * 0.7 + (st.egg.wx - 480) * 0.3; }
  const snap = st.camSnap ? 1 : Math.min(1, dt * 5);
  cam.x += (tx - cam.x) * snap;
  cam.y += (ty - cam.y) * (st.camSnap ? 1 : Math.min(1, dt * 4));
  st.camSnap = false;
}
function eggFx(st, dt) {
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 5;
    if (q.kind === 'leaf') { q.vx *= 1 - dt * 2; q.vy *= 1 - dt * 2; }
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.3);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  for (const n of st.c.nests) if (n.lit) n.litT += dt;
  for (const d of st.c.deco) if (d.seen) d.t += dt;
  if (st.ptero) { st.ptero.t += dt; if (st.ptero.t > 1.6) st.ptero = null; }
  if (st.egg.appear > 0) st.egg.appear = Math.max(0, st.egg.appear - dt);
  // steam wisps from vents and dust from walking
  st.fxT = (st.fxT || 0) - dt;
  if (st.fxT <= 0) {
    st.fxT = 0.05;
    for (const v of st.c.vents) {
      if (Math.abs(v.x - st.cam.x - W / 2) > W) continue;
      const gy = eggGY(st, v.x), r = eggVentT(v).r;
      if (v.state === 'warn') eggPart(st, v.x + (Math.random() - 0.5) * 14, gy - 6, (Math.random() - 0.5) * 20, -40 - Math.random() * 30, 0.6, 'rgba(255,255,255,0.7)', 3 + Math.random() * 3, -10, 'steam');
      else if (v.state === 'puff') for (let k = 0; k < 3; k++) eggPart(st, v.x + (Math.random() - 0.5) * r, gy - 10, (Math.random() - 0.5) * 50, -260 - Math.random() * 160, 0.9, 'rgba(255,255,255,0.85)', 8 + Math.random() * 8, 120, 'steam');
      else if (Math.random() < 0.15) eggPart(st, v.x + (Math.random() - 0.5) * 10, gy - 6, 0, -25, 0.9, 'rgba(255,255,255,0.4)', 3, -5, 'steam');
    }
    for (const c of st.cr) if (!c.air && Math.abs(c.vx) > 60 && Math.random() < 0.35) eggPart(st, c.x - 6, c.y - 2, -20 - Math.random() * 30, -20 - Math.random() * 20, 0.35, 'rgba(190,160,110,0.6)', 2.5, 200);
  }
}
// copy the carriers into the engine players (screen px): name tags, bubbles and drawPlayer read p.x / p.y
function eggMirror(st) {
  const cam = st.cam, ps = G.players;
  for (const p of ps) {
    const f = eggBodyFeet(st, p.id);
    p.x = f.x - cam.x - PW / 2; p.y = f.y - cam.y - PH;
    p.alive = true; p.grounded = true; p.stompSafe = 0; p.vy = 0; p.face = 1; p.stun = 0;
    p.vx = st.cr[p.id].vx;
  }
}
// where each carrier's feet are drawn (in the swap and the finish they hop about)
function eggBodyFeet(st, id) {
  const c = st.cr[id];
  if (st.state === 'swap' && st.swap) {
    const sw = st.swap, u = clamp((sw.t - 0.45) / 0.8, 0, 1), from = id === st.front ? sw.f0 : sw.b0, to = id === st.front ? sw.b0 : sw.f0;
    return eggArc(from, to, u, id === st.front ? 120 : 70);
  }
  if (st.state === 'finish' && st.fin && st.fin.t > 1.2) {
    const k = id === st.front ? 1.4 : 0;
    return { x: c.x, y: c.y - Math.abs(Math.sin((st.fin.t - 1.2) * 6 + k)) * (st.fin.hatched ? 16 : 4) };
  }
  return { x: c.x, y: c.y };
}
function eggArc(a, b, u, h) {
  const e = eggSmooth(u);
  return { x: eggLerp(a.x, b.x, e), y: eggLerp(a.y, b.y, u) - h * 4 * u * (1 - u), u };
}

MODES.eggrescue = {
  EGG,
  needs: eggNeeds, hopDx: eggHopDx, ventInfo: eggVentInfo, ventT: eggVentT, hands: eggHands, tilt: eggTilt, surf: eggSurf, key: eggKey, safe: eggSafe,
  setup(st, L) {
    st.stats = { drops: 0, solos: 0, together: 0, helps: 0, levelT: [0, 0], waits: 0, roomT: [], roomDrops: [], roomTitles: [], crackStage: 0, finishT: null };
    eggRoom(st, L, 0);
  },
  room(k, L) { eggRoom(G.mst, L, k); },
  step(dt) { eggStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then, and drawn by the mode instead
  draw() {
    const st = G.mst;
    if (!st.cr) return;
    eggDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.cr) return;
    eggDrawFront(st);
  },
  hud() { const st = G.mst; if (st.cr) eggHud(st); },
  stats() {
    const s = G.mst.stats;
    if (!s) return [];
    const t = G.time, d = s.drops;
    const medal = t <= EGG.medal[0] && d <= 2 ? 'Gold' : t <= EGG.medal[1] && d <= 7 ? 'Silver' : 'Bronze';
    const onTime = t <= EGG.hatchT;
    const out = [
      { label: 'Drops', value: d },
      { label: 'Together hops', value: s.together },
      { label: 'Hatch clock', value: onTime ? 'On time!' : 'Just in time!' },
      { label: 'Medal', value: medal },
    ];
    let best = -1;
    s.roomDrops.forEach((f, k) => { if (s.roomT[k] == null) return; if (best < 0 || f < s.roomDrops[best] || (f === s.roomDrops[best] && s.roomT[k] < s.roomT[best])) best = k; });
    const words = d === 0 ? 'Not one drop! Egg-cellent teamwork!' : d <= 3 ? 'A few boings, but you got there together!' : 'Boing, boing, boing... and the baby dino is home!';
    out.push(best >= 0 && d > 0 ? words + ' Smoothest stretch: ' + s.roomTitles[best] + '.' : words);
    if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
    return out;
  },
};

/* ---------- drawing ---------- */
// each room's own colours: Fern Path (morning), River Stepping Stones (bright day), Geyser Field (warm), Mama's Nest (sunset)
const EGG_LOOK = [
  { sky: ['#8fd3f0', '#d8f2e6', '#fff1c9'], far: '#a9cf8a', mid: '#6fae5a', midDark: '#4f8f45', soil: '#8a5a3a', soilDark: '#6b4229', grass: '#7ccf4f', grassDark: '#4f9a3a' },
  { sky: ['#6ec2f2', '#bfe6f7', '#f3fbe8'], far: '#9fd0a0', mid: '#5fa868', midDark: '#3f8a52', soil: '#86603f', soilDark: '#66452b', grass: '#86d65a', grassDark: '#4f9a3a' },
  { sky: ['#f6b26b', '#ffd59a', '#fff1c9'], far: '#d9a877', mid: '#b98455', midDark: '#94633b', soil: '#a8683c', soilDark: '#7d4a28', grass: '#d9a85a', grassDark: '#a8783a' },
  { sky: ['#f48a7a', '#ffc28a', '#ffe9c2'], far: '#c79a9a', mid: '#8f8a6a', midDark: '#6e6a4f', soil: '#7d6a58', soilDark: '#5a4a3c', grass: '#8fcf5a', grassDark: '#5a9a3a' },
];
const eggLook = st => EGG_LOOK[st.k % 4];
let eggSkyG = [null, null, null, null];
function eggDrawWorld(st) {
  eggDrawSky(st);
  eggDrawFar(st);
  eggDrawMid(st);
  eggDrawBack(st);
  eggDrawGround(st);
  eggDrawPlants(st);
  eggDrawNests(st);
  eggDrawObstacles(st);
  eggDrawStones(st);
  eggDrawBridge(st);
  eggDrawVents(st, false);
}
function eggDrawFront(st) {
  eggDrawMama(st, true);
  eggDrawCarriers(st);
  eggDrawVents(st, true);
  eggDrawMama(st, false);
  eggDrawPtero(st);
  for (const q of st.parts) {
    const a = clamp(q.life / q.max, 0, 1), x = q.x - st.cam.x, y = q.y - st.cam.y;
    if (x < -30 || x > W + 30 || y < -40 || y > H + 30) continue;
    ctx.globalAlpha = q.kind === 'steam' ? a * 0.75 : a; ctx.fillStyle = q.col;
    if (q.kind === 'spark') { eggStar(x, y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
    else if (q.kind === 'conf') { ctx.save(); ctx.translate(x, y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
    else if (q.kind === 'steam') { circle(x, y, q.size * (1.5 - 0.6 * a)); ctx.fill(); }
    else if (q.kind === 'leaf') { ctx.save(); ctx.translate(x, y); ctx.rotate(q.r); ctx.beginPath(); ctx.ellipse(0, 0, q.size, q.size * 0.45, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    else if (q.kind === 'heart') { eggHeart(x, y, q.size); ctx.fill(); }
    else if (q.kind === 'shell') { ctx.save(); ctx.translate(x, y); ctx.rotate(q.r); ctx.beginPath(); ctx.moveTo(-q.size, 0); ctx.lineTo(0, -q.size); ctx.lineTo(q.size, q.size * 0.4); ctx.closePath(); ctx.fill(); ctx.restore(); }
    else { circle(x, y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  const big = hudBig();
  for (const q of st.pops) {
    const x = clamp(q.x - st.cam.x, 110, W - 110), y = clamp(q.y - st.cam.y - q.t * 34, 86, H - 100);
    ctx.globalAlpha = clamp((1.3 - q.t) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.3 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
    ctx.globalAlpha = 1;
  }
}
function eggStar(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
function eggHeart(x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.2, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 1.2, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  ctx.closePath();
}
function eggDrawSky(st) {
  const k = st.k % 4, lk = eggLook(st);
  if (!eggSkyG[k]) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, lk.sky[0]); g.addColorStop(0.55, lk.sky[1]); g.addColorStop(1, lk.sky[2]); eggSkyG[k] = g; }
  ctx.fillStyle = eggSkyG[k]; ctx.fillRect(0, 0, W, H);
  // the sun
  const sx = k === 3 ? 640 : 790, sy = k === 3 ? 170 : 92;
  ctx.fillStyle = 'rgba(255,240,180,0.35)'; circle(sx, sy, 74); ctx.fill();
  ctx.fillStyle = k === 3 ? '#ffd27a' : '#fff1a8'; circle(sx, sy, 46); ctx.fill();
  // puffy clouds drifting
  for (let i = 0; i < 4; i++) {
    const x = ((i * 290 - st.cam.x * 0.04 + G.clock * (5 + i * 2)) % (W + 300) + W + 300) % (W + 300) - 150, y = 56 + i * 34 + (i % 2) * 12;
    ctx.fillStyle = k === 3 ? 'rgba(255,214,196,0.85)' : 'rgba(255,255,255,0.85)';
    circle(x, y, 22); ctx.fill(); circle(x + 26, y - 8, 26); ctx.fill(); circle(x + 54, y, 20); ctx.fill();
    ctx.fillRect(x, y, 54, 16);
  }
  // little pterodactyls far away
  for (let i = 0; i < 2; i++) {
    const per = 26 + i * 9, u = ((G.clock + i * 11) % per) / per;
    if (u > 0.6) continue;
    const bx = eggLerp(-60, W + 60, u / 0.6), by = 120 + i * 50 + Math.sin(G.clock * 1.4 + i) * 12, f = Math.sin(G.clock * 6 + i) * 6;
    ctx.strokeStyle = 'rgba(90,70,90,0.55)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx - 14, by - f); ctx.quadraticCurveTo(bx - 6, by - 6, bx, by); ctx.quadraticCurveTo(bx + 6, by - 6, bx + 14, by - f); ctx.stroke();
    ctx.lineCap = 'butt';
  }
}
// far hills: a sleepy volcano puffing little clouds, and a long-neck dino munching a tree
function eggDrawFar(st) {
  const lk = eggLook(st), off = st.cam.x * 0.08, hy = 330 - clamp((st.cam.y + 200) * 0.03, -30, 50);
  // the volcano (it never does more than puff)
  const vx = 300 - (off % 2400) + (off % 2400 > 900 ? 2400 : 0), vy = hy + 10;
  if (vx > -200 && vx < W + 200) {
    ctx.fillStyle = '#b08a7a';
    ctx.beginPath(); ctx.moveTo(vx - 170, vy + 30); ctx.lineTo(vx - 36, vy - 120); ctx.lineTo(vx + 36, vy - 120); ctx.lineTo(vx + 170, vy + 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9c7568'; ctx.beginPath(); ctx.moveTo(vx - 36, vy - 120); ctx.lineTo(vx + 36, vy - 120); ctx.lineTo(vx + 20, vy - 104); ctx.lineTo(vx - 18, vy - 108); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const u = ((G.clock * 0.12 + i / 4) % 1);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.55 * (1 - u)) + ')';
      circle(vx + Math.sin(u * 5 + i) * 14 + u * 30, vy - 130 - u * 110, 12 + u * 22); ctx.fill();
    }
  }
  ctx.fillStyle = lk.far;
  const yAt = sx => hy + Math.sin((sx + off) * 0.004) * 24 + Math.sin((sx + off) * 0.011 + 1) * 9;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let sx = 0; sx <= W; sx += 16) ctx.lineTo(sx, yAt(sx));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  // long-neck dinos on the far hills
  const RW = 1500;
  for (const [bx0, s] of [[620, 1], [1280, 0.8]]) for (const rep of [-1, 0, 1]) {
    const sx = bx0 - (off * 1.4 % RW) + rep * RW;
    if (sx < -160 || sx > W + 160) continue;
    eggBronto(sx, yAt(sx) + 6, s * 0.55, 'rgba(70,110,80,0.35)', G.clock + bx0);
  }
}
// a long-neck dino silhouette (or a coloured one): body, tail, neck up to a tree, a munching head
function eggBronto(x, y, s, col, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(0, -34, 50, 26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-40, -40); ctx.quadraticCurveTo(-90, -30, -118, -8); ctx.quadraticCurveTo(-86, -20, -40, -22); ctx.fill();
  const nod = Math.sin(t * 1.3) * 4;
  ctx.beginPath(); ctx.moveTo(26, -50); ctx.quadraticCurveTo(52, -96, 58, -132 + nod); ctx.lineTo(72, -130 + nod); ctx.quadraticCurveTo(66, -90, 46, -30); ctx.fill();
  ctx.beginPath(); ctx.ellipse(70, -136 + nod, 15, 9, 0.2, 0, Math.PI * 2); ctx.fill();
  for (const lx of [-30, -10, 16, 34]) ctx.fillRect(lx - 6, -18, 12, 18);
  ctx.restore();
}
// the nearer jungle: palms and big ferns
function eggDrawMid(st) {
  const lk = eggLook(st), off = st.cam.x * 0.3, hy = 400 - clamp((st.cam.y + 200) * 0.09, -70, 90);
  const yAt = sx => hy + Math.sin((sx + off) * 0.006 + 2) * 18 + Math.sin((sx + off) * 0.017) * 6;
  ctx.fillStyle = lk.mid;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let sx = 0; sx <= W; sx += 16) ctx.lineTo(sx, yAt(sx));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  const TW = 130;
  for (let k = Math.floor(off / TW) - 1; k < Math.floor(off / TW) + W / TW + 2; k++) {
    const h = hash(k, 77), sx = k * TW - off + (h % 60), gy = yAt(sx) + 4;
    ctx.fillStyle = lk.midDark; ctx.strokeStyle = lk.midDark;
    if (h % 3 === 0) {   // a palm tree
      ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, gy); ctx.quadraticCurveTo(sx + 12, gy - 40, sx + 4, gy - 76); ctx.stroke();
      ctx.lineCap = 'butt';
      for (let j = 0; j < 5; j++) { const a = -Math.PI / 2 + (j - 2) * 0.62 + Math.sin(G.clock * 0.8 + k) * 0.05; ctx.beginPath(); ctx.ellipse(sx + 4 + Math.cos(a) * 20, gy - 78 + Math.sin(a) * 10, 24, 6, a, 0, Math.PI * 2); ctx.fill(); }
    } else if (h % 3 === 1) {   // a big fern clump
      for (let j = 0; j < 5; j++) { const a = -Math.PI / 2 + (j - 2) * 0.45; ctx.beginPath(); ctx.ellipse(sx + Math.cos(a) * 18, gy - 6 + Math.sin(a) * 18, 22, 6, a, 0, Math.PI * 2); ctx.fill(); }
    } else if (st.k === 2) {   // geyser field: little steam wisps far away
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; const u = (G.clock * 0.3 + k * 0.37) % 1; circle(sx, gy - 10 - u * 40, 6 + u * 10); ctx.fill();
    }
  }
}
// scenery behind the path: signs, friendly dinos, the swap nest's post
function eggDrawBack(st) {
  const cam = st.cam;
  for (const s of st.c.signs) {
    const x = s.x - cam.x, y = eggGY(st, s.x) - cam.y;
    if (x < -200 || x > W + 200) continue;
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    if (!s.lines) {
      // wrap the sign's words onto two or three short lines (measured once)
      s.lines = [];
      let cur = '';
      for (const wd of s.text.split(' ')) { const t = cur ? cur + ' ' + wd : wd; if (cur && ctx.measureText(t).width > 170) { s.lines.push(cur); cur = wd; } else cur = t; }
      if (cur) s.lines.push(cur);
      s.w = Math.max(...s.lines.map(l => ctx.measureText(l).width)) + 22;
    }
    const bh = s.lines.length * 16 + 12, top = y - 62 - bh;
    ctx.fillStyle = '#7d5530'; ctx.fillRect(x - 3, top + bh - 2, 6, y - top - bh + 2);
    ctx.fillStyle = '#e8c48a'; rr(x - s.w / 2, top, s.w, bh, 8); ctx.fill();
    ctx.strokeStyle = '#8f5f32'; ctx.lineWidth = 2.5; rr(x - s.w / 2, top, s.w, bh, 8); ctx.stroke();
    s.lines.forEach((l, i) => text(l, x, top + 14 + i * 16, 13, '#4a2e18', 'center', 'body'));
  }
  for (const d of st.c.deco) {
    const x = d.x - cam.x, y = eggGY(st, d.x) - cam.y;
    if (x < -160 || x > W + 160) continue;
    if (d.kind === 'trike') eggTrike(x, y - 20, d.t, d.seen);
    else if (d.kind === 'stego') eggStego(x, y - 22, d.t, d.seen);
    else if (d.kind === 'bronto') eggBronto(x, y - 30, 0.9, '#8fbf7a', G.clock);
    else if (d.kind === 'palm') eggPalm(x, y);
    else if (d.kind === 'mush') eggMush(x, y);
    else if (d.kind === 'flowers') for (let i = 0; i < 5; i++) eggFlower(x + i * 14 - 28, y - 4 - (i % 2) * 6, ['#ff8fc7', '#ffd75e', '#ffffff'][i % 3]);
    else if (d.kind === 'pool') eggPool(x, y);
    else if (d.kind === 'dragonfly') eggDragonfly(x + Math.sin(G.clock * 1.5) * 30, y - 90 + Math.sin(G.clock * 3) * 10);
  }
  // the swap nest's post
  const sw = st.c.swap;
  if (sw) {
    const x = sw.x - cam.x, y = eggGY(st, sw.x) - cam.y;
    if (x > -200 && x < W + 200) {
      ctx.fillStyle = '#7d5530'; ctx.fillRect(x + 70, y - 90, 6, 90);
      ctx.fillStyle = C.gold; rr(x + 20, y - 122, 106, 36, 10); ctx.fill();
      ctx.strokeStyle = '#8f5f32'; ctx.lineWidth = 2.5; rr(x + 20, y - 122, 106, 36, 10); ctx.stroke();
      text('SWAP ENDS', x + 73, y - 103.5, 14, '#4a2e18', 'center', 'body');
    }
  }
}
function eggPalm(x, y) {
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 14, y - 60, x - 4, y - 120); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#4f9a3a';
  for (let j = 0; j < 6; j++) { const a = -Math.PI / 2 + (j - 2.5) * 0.55 + Math.sin(G.clock + x * 0.01) * 0.04; ctx.beginPath(); ctx.ellipse(x - 4 + Math.cos(a) * 28, y - 122 + Math.sin(a) * 12 + 8, 34, 8, a, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#7d5530'; circle(x - 8, y - 112, 5); ctx.fill(); circle(x + 2, y - 110, 5); ctx.fill();
}
function eggMush(x, y) {
  ctx.fillStyle = '#fff1dc'; ctx.fillRect(x - 3, y - 12, 6, 12);
  ctx.fillStyle = '#ff7a6b'; ctx.beginPath(); ctx.ellipse(x, y - 12, 11, 7, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(x - 4, y - 15, 1.8); ctx.fill(); circle(x + 4, y - 14, 1.5); ctx.fill();
}
function eggFlower(x, y, col) {
  ctx.strokeStyle = '#4f9a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x, y); ctx.stroke();
  ctx.fillStyle = col;
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; circle(x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4, 2.6); ctx.fill(); }
  ctx.fillStyle = '#ffb02e'; circle(x, y, 2); ctx.fill();
}
function eggPool(x, y) {
  ctx.fillStyle = '#8fd8d0'; ctx.beginPath(); ctx.ellipse(x, y - 2, 40, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(x - 10, y - 4, 14, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  const u = (G.clock * 0.6) % 1; ctx.fillStyle = 'rgba(255,255,255,' + (0.4 * (1 - u)) + ')'; circle(x + 12, y - 10 - u * 24, 5 + u * 6); ctx.fill();
}
function eggDragonfly(x, y) {
  ctx.fillStyle = '#5ec8ff'; ctx.fillRect(x - 9, y - 1.5, 18, 3);
  ctx.fillStyle = 'rgba(220,245,255,0.8)';
  const f = Math.sin(G.clock * 40) * 2;
  ctx.beginPath(); ctx.ellipse(x - 2, y - 5 - f, 7, 3, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 3, y - 5 + f, 7, 3, 0.3, 0, Math.PI * 2); ctx.fill();
}
// a baby triceratops: waves its little tail and bobs its head when you pass
function eggTrike(x, y, t, seen) {
  const bob = seen ? Math.abs(Math.sin(t * 6)) * 4 : 0;
  ctx.save(); ctx.translate(x, y - bob);
  ctx.fillStyle = '#e88a4a';
  ctx.beginPath(); ctx.ellipse(0, 0, 30, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-26, -2); ctx.quadraticCurveTo(-44, 2 + Math.sin(G.clock * 8) * 4, -50, 10); ctx.quadraticCurveTo(-38, 10, -24, 8); ctx.fill();
  for (const lx of [-16, -4, 10, 20]) ctx.fillRect(lx - 4, 10, 8, 12);
  // head with a frill and three little horns
  ctx.fillStyle = '#f6b06b'; ctx.beginPath(); ctx.ellipse(30, -14, 18, 20, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e88a4a'; ctx.beginPath(); ctx.ellipse(40, -4, 15, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff6dc';
  ctx.beginPath(); ctx.moveTo(44, -12); ctx.lineTo(52, -24); ctx.lineTo(48, -10); ctx.fill();
  ctx.beginPath(); ctx.moveTo(36, -12); ctx.lineTo(40, -26); ctx.lineTo(41, -11); ctx.fill();
  ctx.beginPath(); ctx.moveTo(52, -4); ctx.lineTo(60, -8); ctx.lineTo(53, 0); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(42, -8, 4.2); ctx.fill(); ctx.fillStyle = C.ink; circle(43, -8, 2.2); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(46, 2, 4, 0.2, 1.6); ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,140,0.5)'; circle(38, 0, 3); ctx.fill();
  ctx.restore();
}
// a stegosaurus peeking out, plates along its back
function eggStego(x, y, t, seen) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#ffb3c8';
  for (let i = 0; i < 5; i++) { const px = -30 + i * 14, ph = 14 + (i % 2) * 4; ctx.beginPath(); ctx.moveTo(px - 7, -14); ctx.lineTo(px, -14 - ph); ctx.lineTo(px + 7, -14); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#7fbf9a';
  ctx.beginPath(); ctx.ellipse(0, 0, 40, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-36, -2); ctx.quadraticCurveTo(-60, 0, -64, 12); ctx.quadraticCurveTo(-48, 10, -34, 10); ctx.fill();
  for (const lx of [-22, -8, 12, 24]) ctx.fillRect(lx - 5, 10, 10, 12);
  const nod = seen ? Math.sin(t * 5) * 3 : 0;
  ctx.beginPath(); ctx.ellipse(44, -4 + nod, 14, 10, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(48, -8 + nod, 3.6); ctx.fill(); ctx.fillStyle = C.ink; circle(49, -8 + nod, 1.8); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(50, -1 + nod, 4, 0.2, 1.5); ctx.stroke();
  ctx.restore();
}
// the ground: soil with a grassy top, cut away into water and ravines under the gaps
function eggDrawGround(st) {
  const lk = eggLook(st), c = st.c, cam = st.cam, xa = cam.x - 20, xb = cam.x + W + 20, bot = H + 10;
  const gapAt = x => c.gaps.find(g => x > g.x0 && x < g.x1);
  const yDraw = x => {
    const g = gapAt(x);
    if (!g) return eggGY(st, x);
    const u = (x - g.x0) / (g.x1 - g.x0), deep = g.kind === 'bridge' ? 360 : 50;
    return Math.max(g.y0, g.y1) + deep * Math.pow(Math.sin(Math.PI * clamp(u, 0, 1)), 0.25);
  };
  const pts = [];
  for (let x = Math.floor(xa / 4) * 4; x <= xb; x += 4) pts.push(x);
  ctx.fillStyle = lk.soil;
  ctx.beginPath(); ctx.moveTo(xa - cam.x, bot);
  for (const x of pts) ctx.lineTo(x - cam.x, yDraw(x) - cam.y);
  ctx.lineTo(xb - cam.x, bot); ctx.closePath(); ctx.fill();
  // soil stripes and pebbles
  ctx.strokeStyle = lk.soilDark; ctx.lineWidth = 7; ctx.globalAlpha = 0.5;
  ctx.beginPath(); pts.forEach((x, i) => { const y = yDraw(x) + 46 - cam.y; if (i) ctx.lineTo(x - cam.x, y); else ctx.moveTo(x - cam.x, y); }); ctx.stroke();
  ctx.globalAlpha = 1;
  for (let x = Math.floor(xa / 60) * 60; x < xb; x += 60) {
    if (gapAt(x)) continue;
    const h = hash(x, 5); ctx.fillStyle = lk.soilDark; circle(x - cam.x + (h % 30), eggGY(st, x) + 22 + (h % 40) - cam.y, 3 + (h % 3)); ctx.fill();
  }
  // water in the creeks and rivers (a ravine under the bridge is just deep and shady)
  for (const g of c.gaps) {
    if (g.x1 < xa || g.x0 > xb) continue;
    const wy = Math.max(g.y0, g.y1) + 12 - cam.y;
    if (g.kind === 'bridge') {
      ctx.fillStyle = 'rgba(40,30,30,0.25)'; ctx.fillRect(g.x0 - cam.x, wy, g.x1 - g.x0, H);
      continue;
    }
    const gr = ctx.createLinearGradient(0, wy, 0, wy + 60); gr.addColorStop(0, '#5ec8e8'); gr.addColorStop(1, '#2f7fb0');
    ctx.fillStyle = gr; ctx.fillRect(g.x0 - cam.x, wy, g.x1 - g.x0, 80);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    for (let x = g.x0 + 10; x < g.x1 - 10; x += 34) {
      const ph = G.clock * 2 + x * 0.05;
      ctx.beginPath(); ctx.moveTo(x - cam.x + Math.sin(ph) * 4, wy + 6 + (x % 3) * 4); ctx.lineTo(x - cam.x + 12 + Math.sin(ph) * 4, wy + 6 + (x % 3) * 4); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(g.x0 - cam.x, wy, g.x1 - g.x0, 3);
  }
  // the grass along the top (not over water)
  ctx.strokeStyle = lk.grass; ctx.lineWidth = 7; ctx.lineJoin = 'round';
  let on = false;
  ctx.beginPath();
  for (const x of pts) {
    if (gapAt(x)) { on = false; continue; }
    const y = eggGY(st, x) - cam.y + 2;
    if (!on) { ctx.moveTo(x - cam.x, y); on = true; } else ctx.lineTo(x - cam.x, y);
  }
  ctx.stroke();
  ctx.strokeStyle = lk.grassDark; ctx.lineWidth = 2;
  ctx.beginPath(); on = false;
  for (const x of pts) {
    if (gapAt(x)) { on = false; continue; }
    const y = eggGY(st, x) - cam.y + 6;
    if (!on) { ctx.moveTo(x - cam.x, y); on = true; } else ctx.lineTo(x - cam.x, y);
  }
  ctx.stroke();
  // ledges: a rocky face
  for (const l of c.ledges) {
    const x = l.x - cam.x;
    if (x < -40 || x > W + 40) continue;
    ctx.fillStyle = '#8a7a6a'; rr(x - 6, l.yTop - cam.y + 2, 12, l.yBot - l.yTop + 6, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x - 4, l.yTop - cam.y + 6, 3, l.yBot - l.yTop - 4);
  }
}
function eggDrawPlants(st) {
  const cam = st.cam, xa = cam.x - 40, xb = cam.x + W + 40, lk = eggLook(st);
  for (const pl of st.c.plants) {
    if (pl.x < xa || pl.x > xb) continue;
    const x = pl.x - cam.x, y = eggGY(st, pl.x) - cam.y;
    if (pl.kind === 'fern') {
      ctx.fillStyle = st.k === 2 ? '#b98a4a' : (pl.h % 2 ? '#5fae45' : '#4f9a3a');
      for (let j = 0; j < 3; j++) { const a = -Math.PI / 2 + (j - 1) * 0.6 + Math.sin(G.clock * 1.2 + pl.h) * 0.06; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 9 * pl.s, y + Math.sin(a) * 9 * pl.s, 11 * pl.s, 3.2 * pl.s, a, 0, Math.PI * 2); ctx.fill(); }
    } else if (pl.kind === 'flower') eggFlower(x, y - 6, ['#ff8fc7', '#ffd75e', '#ffffff', '#b28dff'][pl.h % 4]);
    else { ctx.fillStyle = lk.soilDark; ctx.beginPath(); ctx.ellipse(x, y + 1, 5 * pl.s + 2, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  }
}
// twig nests: the checkpoints (flowers bloom on one you've reached)
function eggNestShape(x, y, w, h, col, dark) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) { const a = i * 0.7; ctx.beginPath(); ctx.moveTo(x - w + 4 + i * (2 * w - 8) / 9, y - h * 0.6 + Math.sin(a) * 2); ctx.lineTo(x - w + 14 + i * (2 * w - 8) / 9, y + h * 0.6 - Math.cos(a) * 2); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(x, y - h * 0.35, w * 0.7, h * 0.35, 0, 0, Math.PI * 2); ctx.fill();
}
function eggDrawNests(st) {
  const cam = st.cam;
  st.c.nests.forEach((n, i) => {
    if (n.start && i === 0 && st.k > 0) return;
    const x = n.x - cam.x, y = eggGY(st, n.x) - cam.y;
    if (x < -60 || x > W + 60) return;
    if (n.lit) { ctx.fillStyle = 'rgba(255,226,122,' + (0.25 + 0.1 * Math.sin(G.clock * 4)) + ')'; ctx.beginPath(); ctx.ellipse(x, y - 6, 40, 16, 0, 0, Math.PI * 2); ctx.fill(); }
    eggNestShape(x, y - 5, 26, 9, '#b07a44', '#7d5028');
    if (n.lit) for (let k = 0; k < 3; k++) eggFlower(x - 18 + k * 18, y - 14 - (k % 2) * 3, ['#ff8fc7', '#ffd75e', '#ffffff'][k]);
  });
  const sw = st.c.swap;
  if (sw) {
    const x = sw.x - cam.x, y = eggGY(st, sw.x) - cam.y;
    if (x > -80 && x < W + 80) eggNestShape(x, y - 6, 44, 12, '#c08a50', '#7d5028');
  }
}
function eggDrawObstacles(st) {
  const cam = st.cam;
  for (const o of st.c.obst) {
    const x0 = o.x0 - cam.x, x1 = o.x1 - cam.x, gy = eggGY(st, (o.x0 + o.x1) / 2) - cam.y;
    if (x1 < -80 || x0 > W + 80) continue;
    if (o.kind === 'log') {
      const cx = (x0 + x1) / 2, r = o.h / 2;
      ctx.fillStyle = '#8a5a34'; rr(x0 - 4, gy - o.h, x1 - x0 + 8, o.h, r); ctx.fill();
      ctx.strokeStyle = '#5e3a1e'; ctx.lineWidth = 2; rr(x0 - 4, gy - o.h, x1 - x0 + 8, o.h, r); ctx.stroke();
      ctx.fillStyle = '#d9a86a'; ctx.beginPath(); ctx.ellipse(x0 + 2, gy - r, r * 0.55, r - 1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a8753f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x0 + 2, gy - r, r * 0.3, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#6fbf4a'; ctx.beginPath(); ctx.ellipse(cx + 4, gy - o.h + 1, 9, 3, 0, Math.PI, 0); ctx.fill();
      eggMush(cx + 10, gy - o.h + 2);
    } else {
      // a sleeping dino's tail lying across the path (its body naps behind a bush)
      const wag = Math.sin(G.clock * 2 + o.ph) * 3;
      ctx.fillStyle = '#6cc070';
      ctx.beginPath(); ctx.moveTo(x0 - 8, gy); ctx.quadraticCurveTo(x0 + 6, gy - o.h - 6, (x0 + x1) / 2, gy - o.h); ctx.quadraticCurveTo(x1 - 4, gy - o.h + 4, x1 + 16, gy - 4 + wag); ctx.lineTo(x1 + 10, gy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#3f8a4a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#ffd75e'; for (let k = 0; k < 3; k++) { circle(x0 + 8 + k * 12, gy - o.h + 5 + k * 0.5, 3); ctx.fill(); }
      // the bush with the sleepy dino and its Zzz
      ctx.fillStyle = '#3f8f3a'; for (const [dx, dy, r] of [[-22, -10, 16], [-36, -4, 12], [-10, -4, 12]]) { circle(x0 + dx, gy + dy, r); ctx.fill(); }
      const z = (G.clock * 0.6 + o.ph) % 1;
      ctx.globalAlpha = 1 - z; text('z', x0 - 22 + z * 14, gy - 34 - z * 26, 12 + z * 8, '#ffffff', 'center'); ctx.globalAlpha = 1;
    }
  }
}
function eggDrawStones(st) {
  const cam = st.cam;
  for (const g of st.c.gaps) {
    if (g.kind !== 'river' || g.x1 < cam.x - 40 || g.x0 > cam.x + W + 40) continue;
    const wy = Math.max(g.y0, g.y1) + 12 - cam.y;
    for (const s of g.stones) {
      const x0 = s.x0 - cam.x, x1 = s.x1 - cam.x, y = s.y - cam.y, cx = (x0 + x1) / 2, w = x1 - x0;
      // ripples where it meets the water
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
      const rp = (G.clock * 0.8 + s.ph) % 1;
      ctx.globalAlpha = 1 - rp; ctx.beginPath(); ctx.ellipse(cx, wy + 2, w * 0.5 + rp * 18, 4 + rp * 3, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#8f8a86'; rr(x0, y, w, Math.max(10, wy + 16 - y), 12); ctx.fill();
      ctx.fillStyle = '#a9a39e'; rr(x0 + 2, y, w - 4, 10, 6); ctx.fill();
      ctx.fillStyle = '#6fbf4a'; ctx.beginPath(); ctx.ellipse(cx - w * 0.18, y + 2, w * 0.22, 3, 0, 0, Math.PI * 2); ctx.fill();
      if (s.n) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; for (const sd of [-1, 1]) { circle(cx + sd * (w * 0.5 + 4), wy + 1, 2.4); ctx.fill(); } }
      if (st.steady) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x0 + 1, y + 1, w - 2, 9, 5); ctx.stroke(); }
    }
  }
}
function eggDrawBridge(st) {
  const cam = st.cam;
  for (const g of st.c.gaps) {
    if (g.kind !== 'bridge' || g.x1 < cam.x - 40 || g.x0 > cam.x + W + 40) continue;
    const pts = [];
    for (let x = g.x0; x <= g.x1; x += 6) pts.push([x - cam.x, eggBridgeY(g, x) - cam.y]);
    // posts at each end
    for (const px of [g.x0, g.x1]) { const yy = eggGY(st, px + (px === g.x0 ? -4 : 4)) - cam.y; ctx.fillStyle = '#7d5530'; ctx.fillRect(px - cam.x - 4, yy - 40, 8, 42); }
    ctx.strokeStyle = '#5a6e2a'; ctx.lineWidth = 3;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - 28) : ctx.moveTo(x, y - 28))); ctx.stroke();
    for (let i = 0; i < pts.length; i += 3) { const [x, y] = pts[i]; ctx.strokeStyle = 'rgba(90,110,42,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y - 28); ctx.lineTo(x, y); ctx.stroke(); }
    for (let i = 0; i < pts.length - 1; i += 2) { const [x, y] = pts[i]; ctx.fillStyle = i % 4 ? '#c9925a' : '#b07a44'; ctx.fillRect(x - 1, y, 11, 6); }
    ctx.strokeStyle = '#5a6e2a'; ctx.lineWidth = 3;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 5) : ctx.moveTo(x, y + 5))); ctx.stroke();
    // leaves on the vines
    ctx.fillStyle = '#7ccf4f'; for (let i = 2; i < pts.length; i += 7) { const [x, y] = pts[i]; ctx.beginPath(); ctx.ellipse(x, y - 28, 5, 2.5, 0.6, 0, Math.PI * 2); ctx.fill(); }
  }
}
// steam vents: a rocky little cone; bubbling when it's about to puff; a big puff of warm steam
function eggDrawVents(st, front) {
  const cam = st.cam;
  for (const v of st.c.vents) {
    const x = v.x - cam.x, y = eggGY(st, v.x) - cam.y, info = eggVentInfo(st, v), r = info.r;
    if (x < -100 || x > W + 100) continue;
    if (!front) {
      // a warm glow on the ground shows how far a puff reaches
      ctx.fillStyle = info.state === 'quiet' ? 'rgba(255,200,140,0.25)' : 'rgba(255,150,80,0.4)'; ctx.beginPath(); ctx.ellipse(x, y + 2, r + 4, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9a7a62'; ctx.beginPath(); ctx.moveTo(x - r - 6, y + 2); ctx.quadraticCurveTo(x - r * 0.5, y - 22, x - 10, y - 18); ctx.lineTo(x + 10, y - 18); ctx.quadraticCurveTo(x + r * 0.5, y - 22, x + r + 6, y + 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b8957a'; ctx.beginPath(); ctx.moveTo(x - r * 0.7, y - 4); ctx.quadraticCurveTo(x - r * 0.4, y - 16, x - 8, y - 15); ctx.lineTo(x - 2, y - 15); ctx.quadraticCurveTo(x - r * 0.3, y - 8, x - r * 0.4, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = info.state === 'warn' ? '#ff9a4a' : '#5a3e30'; ctx.beginPath(); ctx.ellipse(x, y - 18, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
      if (info.state === 'warn') { ctx.fillStyle = 'rgba(255,160,80,' + (0.25 + 0.2 * Math.sin(G.clock * 18)) + ')'; ctx.beginPath(); ctx.ellipse(x, y - 4, r + 6, 10, 0, 0, Math.PI * 2); ctx.fill(); }
      if (st.sleepy) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 12, 12, 5, 0, 0, Math.PI * 2); ctx.stroke(); }
      // a little timer ring on quiet vents: how long it rests
      if (info.state !== 'puff') {
        const V = eggVentT(v), u = clamp(info.toPuff / (V.quiet + V.warn), 0, 1);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 4; circle(x, y - 40, 9); ctx.stroke();
        ctx.strokeStyle = info.state === 'warn' ? '#ff8a4a' : '#8fe3b0'; ctx.beginPath(); ctx.arc(x, y - 40, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * u); ctx.stroke();
      }
    } else if (info.state === 'puff') {
      // the steam column (drawn over the players: you float in it)
      const V = eggVentT(v), u = clamp((V.puff - info.puffLeft) / V.puff, 0, 1), hgt = (v.big ? 260 : 190) * Math.min(1, u * 4) * (st.sleepy ? 0.7 : 1);
      ctx.globalAlpha = 0.75 * (1 - Math.max(0, u - 0.7) / 0.3);
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 8; k++) { const yy = y - 12 - hgt * k / 7, rr2 = r * (0.5 + k * 0.12) + Math.sin(G.clock * 9 + k) * 3; circle(x + Math.sin(G.clock * 4 + k) * 5, yy, rr2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }
}
// Mama Dino at her nest (the last room): behind the nest, then the nest's front rim and the baby
function eggDrawMama(st, back) {
  const m = st.c.mama;
  if (!m) return;
  const cam = st.cam, nx = m.nestX - cam.x, ny = eggGY(st, m.nestX) - cam.y;
  if (nx < -400 || nx > W + 400) return;
  const fin = st.fin, t = G.clock;
  if (back) {
    // Mama: a big round friendly long-neck, leaning down to look in the nest when you arrive
    const lean = fin ? clamp((fin.t - 0.8) / 1.2, 0, 1) : 0;
    const bx = nx + 150, by = ny - 50;
    ctx.save(); ctx.translate(bx, by);
    ctx.fillStyle = '#7fc66a';
    ctx.beginPath(); ctx.moveTo(60, -10); ctx.quadraticCurveTo(140, 10 + Math.sin(t * 1.5) * 6, 170, 40); ctx.quadraticCurveTo(120, 30, 60, 30); ctx.fill();
    ctx.beginPath(); ctx.ellipse(20, 0, 74, 48, 0, 0, Math.PI * 2); ctx.fill();
    for (const lx of [-26, 4, 36, 60]) { ctx.fillRect(lx - 10, 30, 20, 22); }
    ctx.fillStyle = '#a5dc8a'; ctx.beginPath(); ctx.ellipse(10, 16, 46, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5fae55'; for (const [sx, sy, r] of [[20, -30, 8], [46, -16, 6], [-6, -36, 6], [60, -34, 5]]) { circle(sx, sy, r); ctx.fill(); }
    // the neck curves up, then down toward the nest as she leans
    const hx = eggLerp(-40, -110, lean), hy = eggLerp(-150, -70, lean) + Math.sin(t * 1.2) * 4;
    ctx.strokeStyle = '#7fc66a'; ctx.lineWidth = 26; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-30, -20); ctx.quadraticCurveTo(-50, -110, hx + 10, hy + 8); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#7fc66a'; ctx.beginPath(); ctx.ellipse(hx, hy, 30, 22, -0.2 - lean * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(hx - 8, hy - 6, 7); ctx.fill(); ctx.fillStyle = C.ink; circle(hx - 10, hy - 5, 3.6); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(hx - 12 + k * 4, hy - 13); ctx.lineTo(hx - 14 + k * 5, hy - 18); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(hx - 16, hy + 6, 7, 0.3, 1.8); ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,140,0.55)'; circle(hx - 2, hy + 6, 5); ctx.fill();
    // a pink bow on her head
    ctx.fillStyle = '#ff8fc7'; ctx.beginPath(); ctx.moveTo(hx + 6, hy - 20); ctx.lineTo(hx - 6, hy - 30); ctx.lineTo(hx - 4, hy - 14); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 6, hy - 20); ctx.lineTo(hx + 20, hy - 28); ctx.lineTo(hx + 16, hy - 12); ctx.closePath(); ctx.fill();
    ctx.restore();
    // the big nest
    eggNestShape(nx, ny - 8, 58, 16, '#c08a50', '#7d5028');
    if (!fin) { ctx.fillStyle = 'rgba(255,226,122,' + (0.3 + 0.15 * Math.sin(t * 4)) + ')'; ctx.beginPath(); ctx.ellipse(nx, ny - 14, 48, 9, 0, 0, Math.PI * 2); ctx.fill(); }
    return;
  }
  if (!fin) return;
  // the egg in the nest, cracking, then the baby dino
  if (!fin.hatched) {
    const p = eggFinEggPos(st);
    const wig = fin.t > 1.2 ? Math.sin(fin.t * 30) * 0.12 * clamp((fin.t - 1.2) / 0.5, 0, 1) : 0;
    eggDrawEgg(st, p.x - cam.x, p.y - cam.y, wig, 1, Math.min(4, 2 + Math.floor((fin.t - 1.2) / 0.8)));
  } else {
    const u = clamp((fin.t - 2.9) / 0.5, 0, 1), hop = Math.abs(Math.sin((fin.t - 2.9) * 5)) * 10 * u;
    eggBaby(nx, ny - 26 - hop, u, fin.t);
  }
  ctx.fillStyle = '#b07a44'; ctx.beginPath(); ctx.ellipse(nx, ny - 4, 58, 9, 0, 0, Math.PI); ctx.fill();
}
// the baby dino: big eyes, a little smile, half an eggshell on its head
function eggBaby(x, y, u, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(0.4 + 0.6 * u, 0.4 + 0.6 * u);
  ctx.fillStyle = '#8fdc7a';
  ctx.beginPath(); ctx.ellipse(0, 6, 20, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(10, -14, 17, 15, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c5f0b2'; ctx.beginPath(); ctx.ellipse(2, 12, 11, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(6, -16, 6); ctx.fill(); circle(18, -16, 5); ctx.fill();
  ctx.fillStyle = C.ink; circle(7, -15, 3); ctx.fill(); circle(19, -15, 2.6); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(8, -17, 1.2); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(14, -8, 5, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,140,0.5)'; circle(2, -8, 3); ctx.fill();
  // little arms waving
  ctx.strokeStyle = '#6cc060'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  const w = Math.sin(t * 10) * 0.5;
  ctx.beginPath(); ctx.moveTo(-10, 2); ctx.lineTo(-20, -6 + w * 8); ctx.moveTo(14, 4); ctx.lineTo(24, -4 - w * 8); ctx.stroke();
  ctx.lineCap = 'butt';
  // the eggshell hat
  ctx.fillStyle = '#fff3dc'; ctx.beginPath(); ctx.moveTo(-6, -24); ctx.lineTo(0, -32); ctx.lineTo(5, -26); ctx.lineTo(10, -34); ctx.lineTo(15, -26); ctx.lineTo(21, -33); ctx.lineTo(26, -22); ctx.quadraticCurveTo(10, -40, -6, -24); ctx.fill();
  ctx.fillStyle = '#7cc9b5'; circle(8, -30, 2); ctx.fill(); circle(18, -28, 1.6); ctx.fill();
  ctx.restore();
}
// Terry the pterodactyl: fetches a dropped egg and brings it back to the leaf
function eggDrawPtero(st) {
  const pt = st.ptero;
  if (!pt) return;
  const cam = st.cam;
  let x, y, carry = false;
  if (pt.mode === 'fetch') {
    const e = st.egg, u = clamp(pt.t / 0.6, 0, 1);
    x = eggLerp(e.wx - 300, e.wx, eggSmooth(u)) - cam.x; y = eggLerp(e.wy - 260, e.wy - 30, eggSmooth(u)) - cam.y;
  } else {
    const h = eggHands(st), mx = (h.bx + h.fx) / 2, my = eggLeafY(st, mx, h) - EGG.eggH, u = clamp(pt.t / 0.85, 0, 1);
    if (u < 1) { x = eggLerp(mx - 280, mx, eggSmooth(u)) - cam.x; y = eggLerp(my - 260, my - 30, eggSmooth(u)) - cam.y; carry = true; }
    else { const v = clamp((pt.t - 0.85) / 0.7, 0, 1); x = mx + v * 320 - cam.x; y = my - 30 - v * 280 - cam.y; }
  }
  ctx.save(); ctx.translate(x, y);
  const f = Math.sin(G.clock * 14) * 0.7;
  if (carry) eggDrawEgg(st, 0, 36, 0, 1, st.stats.crackStage || 0);
  ctx.fillStyle = '#f2a65a';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 26, -18 - f * 16, s * 50, -6 - f * 18); ctx.quadraticCurveTo(s * 30, 4, s * 8, 8); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#ffbf7a'; ctx.beginPath(); ctx.ellipse(0, 4, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(10, -6, 9, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd75e'; ctx.beginPath(); ctx.moveTo(16, -8); ctx.lineTo(32, -3); ctx.lineTo(16, -1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e88a4a'; ctx.beginPath(); ctx.moveTo(6, -12); ctx.lineTo(-6, -20); ctx.lineTo(4, -8); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(12, -8, 3.4); ctx.fill(); ctx.fillStyle = C.ink; circle(13, -8, 1.8); ctx.fill();
  ctx.strokeStyle = '#c07a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, 13); ctx.lineTo(-4, 22); ctx.moveTo(4, 13); ctx.lineTo(5, 22); ctx.stroke();
  ctx.restore();
}
// one player drawn by the engine's drawPlayer (a copy at the origin)
function eggDrawBody(p, rot, sx, sy) {
  ctx.save(); ctx.rotate(rot || 0);
  drawPlayer(Object.assign({}, p, { alive: true, x: -PW / 2, y: -PH, sx: p.sx * (sx || 1), sy: p.sy * (sy || 1), vy: 0 }));
  ctx.restore();
}
function eggDrawCarriers(st) {
  const cam = st.cam, ps = G.players, h = eggHands(st), lk = eggLook(st);
  const setDown = st.state === 'swap' || (st.state === 'finish' && st.fin && st.fin.t > 1.1);
  // the bodies (crouched when carrying low or getting ready, stretched when lifting)
  for (const id of [st.back, st.front]) {
    const c = st.cr[id], p = ps[id], f = eggBodyFeet(st, id);
    const crouch = clamp(-c.liftPx / EGG.lowY, 0, 1), stretch = clamp(c.liftPx / EGG.liftY, 0, 1), sq = c.sq || 0;
    const bob = !c.air && Math.abs(c.vx) > 20 ? Math.abs(Math.sin(c.step)) * 2 : 0;
    ctx.save(); ctx.translate(f.x - cam.x, f.y - cam.y - bob);
    eggDrawBody(p, 0, 1 + crouch * 0.12 + sq * 0.15, 1 - crouch * 0.22 + stretch * 0.06 - sq * 0.15);
    ctx.restore();
  }
  if (setDown && st.state === 'swap') { eggDrawLeafOnNest(st); return; }
  // the leaf between the hands, then the egg, then the hands gripping the ends
  const ex = 16;
  const bx = h.bx - cam.x, by = h.by - cam.y, fx = h.fx - cam.x, fy = h.fy - cam.y;
  const leafPt = u => { const x = eggLerp(bx, fx, u); return [x, eggLerp(by, fy, u) + EGG.sag * (1 - (2 * u - 1) * (2 * u - 1))]; };
  const ux = ex / Math.max(1, fx - bx);
  ctx.fillStyle = st.sticky ? '#9be07a' : '#5fbf4a'; ctx.strokeStyle = '#2f7d32'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) { const u = -ux + (1 + 2 * ux) * i / 20, [x, y] = leafPt(u); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  for (let i = 20; i >= 0; i--) { const u = -ux + (1 + 2 * ux) * i / 20, [x, y] = leafPt(u), th = 9 * Math.sin(Math.PI * clamp(i / 20, 0, 1)); ctx.lineTo(x, y + th); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  if (st.sticky) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; ctx.stroke(); }
  // the midrib and a few veins
  ctx.strokeStyle = 'rgba(47,125,50,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = 0; i <= 12; i++) { const u = -ux + (1 + 2 * ux) * i / 12, [x, y] = leafPt(u); if (i) ctx.lineTo(x, y + 4); else ctx.moveTo(x, y + 4); }
  ctx.stroke();
  for (let i = 1; i < 6; i++) { const [x, y] = leafPt(i / 6); ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + 6, y + 8); ctx.stroke(); }
  // the egg (on the leaf, in the air, or flying back with Terry)
  const e = st.egg;
  if (st.state === 'finish' && st.fin) { /* (the nest draws it) */ }
  else if (!(st.ptero && st.ptero.mode === 'bring' && st.ptero.t < 0.85)) {
    const ep = st.state === 'drop' || e.air ? { x: e.wx, y: e.wy } : eggEggPos(st);
    const wob = e.wob > 0 ? Math.sin(e.wob * 40) * 0.12 : 0, wig = st.wiggle > 0 ? Math.sin(st.wiggle * 60) * 0.2 : 0;
    eggDrawEgg(st, ep.x - cam.x, ep.y - cam.y, (e.air || st.state === 'drop' ? e.ang : e.ang + wob + wig), 1, st.stats.crackStage || 0, e.sq || 0);
    // a warning glow when it's near the end of the leaf
    if (!e.air && st.state === 'walk' && Math.abs(e.s) > EGG.sMax * 0.7) {
      const who = e.s > 0 ? st.front : st.back, c = st.cr[who];
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(G.clock * 14);
      ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ep.x - cam.x, ep.y - cam.y, EGG.eggH + 6, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1; void c;
    }
  }
  // arms and hands
  for (const id of [st.back, st.front]) {
    const c = st.cr[id], f = eggBodyFeet(st, id), p = ps[id];
    const sx = f.x - cam.x + (id === st.front ? -6 : 6), sy = f.y - cam.y - PH * 0.55;
    const hx = id === st.front ? fx : bx, hy = id === st.front ? fy : by;
    ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy + 2); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = PCOL[id]; ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 2; circle(hx, hy + 2, 5); ctx.fill(); ctx.stroke();
    // getting ready to hop: a little gold ring under your feet (both rings: up you go!)
    if (c.ready && st.state === 'walk') {
      const r = c.ready, pulse = r.held ? 1 : clamp(r.grace / EGG.grace, 0, 1);
      ctx.globalAlpha = 0.5 + 0.4 * pulse; ctx.strokeStyle = C.gold; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(f.x - cam.x, f.y - cam.y + 1, 18, 5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    void p; void lk;
  }
}
function eggDrawLeafOnNest(st) {
  const cam = st.cam, sw = st.c.swap, x = sw.x - cam.x, y = eggGY(st, sw.x) - cam.y - 16;
  ctx.fillStyle = '#5fbf4a'; ctx.strokeStyle = '#2f7d32'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, 70, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  eggDrawEgg(st, x, y - EGG.eggH + 2, Math.sin(G.clock * 8) * 0.08, 1, st.stats.crackStage || 0);
}
// the egg: cream with green and teal speckles; cracks grow with the hatch clock
function eggDrawEgg(st, x, y, rot, s, cracks, sq) {
  const R = EGG.eggR, Hh = EGG.eggH, e = st.egg;
  ctx.save(); ctx.translate(x, y + Hh); ctx.rotate(rot || 0);
  const ap = e && e.appear > 0 ? 1 : 1, sqz = sq || 0;
  ctx.scale(s * ap * (1 + sqz * 0.18), s * (1 - sqz * 0.2));
  ctx.translate(0, -Hh);
  ctx.fillStyle = 'rgba(28,26,54,0.16)'; ctx.beginPath(); ctx.ellipse(0, Hh - 1, R * 0.8, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff3dc'; ctx.strokeStyle = '#c9a878'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, R, Hh, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(230,200,150,0.45)'; ctx.beginPath(); ctx.ellipse(4, 6, R * 0.8, Hh * 0.75, 0, 0, Math.PI * 2); ctx.fill();
  for (const [dx, dy, r, col] of [[-7, -10, 3.4, '#7cc9b5'], [6, -4, 2.6, '#9fd36b'], [-2, 7, 3, '#7cc9b5'], [9, 9, 2.2, '#9fd36b'], [-10, 3, 2, '#9fd36b'], [3, -15, 1.8, '#7cc9b5']]) { ctx.fillStyle = col; circle(dx, dy, r); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(-6, -9, 3.5, 7, 0.3, 0, Math.PI * 2); ctx.fill();
  // cracks
  ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
  const crack = pts => { ctx.beginPath(); pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.stroke(); };
  if (cracks >= 1) crack([[-4, -18], [-1, -12], [-5, -8], [-1, -4]]);
  if (cracks >= 2) crack([[8, -14], [5, -9], [10, -5], [7, 0]]);
  if (cracks >= 3) crack([[-14, -2], [-9, 0], [-12, 5], [-6, 8]]);
  if (cracks >= 4) { crack([[2, 4], [6, 8], [3, 12], [8, 16]]); ctx.fillStyle = C.ink; circle(-1, -6, 1.6); ctx.fill(); circle(5, -6, 1.6); ctx.fill(); }
  ctx.restore();
}

/* ---------- HUD: the clock and drops, each carrier's panel on its player's side, prompts and hints over the heads ---------- */
const EGG_NEXT = { log: 'a log: hop together', tail: 'a sleepy tail: hop it', creek: 'a creek: hop together', river: 'stepping stones', ledge: 'a ledge: hop up', vent: 'a steam vent', bridge: 'a wobbly bridge', uphill: 'uphill: level it', downhill: 'downhill: level it', swap: 'the swap nest', mama: "Mama's nest!" };
function eggHud(st) {
  const P = EGG, big = hudBig(), ps = G.players, play = G.mode === 'play' || G.mode === 'paused', z = big ? 1.4 : 1, t = G.clock;
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = String(st.stats.drops);
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.1, gap = fs * 0.9, ring = fs * 1.5;
    const w = tw + gap + icon + fs * 0.35 + nw + gap + ring + 26, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 13, cy, fs, C.paper, 'left', 'body');
    // a little egg: the drops so far
    const ix = x0 + 13 + tw + gap + icon / 2;
    ctx.fillStyle = '#fff3dc'; ctx.beginPath(); ctx.ellipse(ix, cy, fs * 0.36, fs * 0.46, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7cc9b5'; circle(ix - fs * 0.1, cy - fs * 0.12, fs * 0.09); ctx.fill();
    text(n, ix + icon / 2 + fs * 0.35, cy, fs, '#ffe7a8', 'left', 'body');
    // the hatch clock: a ring that fills as the egg gets ready to hatch
    const hx = x0 + w - 13 - ring / 2, hz = eggHatch(), rr0 = ring * 0.42;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = fs * 0.22; circle(hx, cy, rr0); ctx.stroke();
    ctx.strokeStyle = hz >= 1 ? '#ff9a6b' : hz > 0.75 ? '#ffd27a' : '#8fe3b0';
    ctx.beginPath(); ctx.arc(hx, cy, rr0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, hz)); ctx.stroke();
    const wig = hz > 0.75 ? Math.sin(t * 20) * 0.15 : 0;
    ctx.save(); ctx.translate(hx, cy); ctx.rotate(wig);
    ctx.fillStyle = '#fff3dc'; ctx.beginPath(); ctx.ellipse(0, 0, fs * 0.22, fs * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    if (hz > 0.5) { ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(0, 0); ctx.lineTo(-2, 3); ctx.stroke(); }
    ctx.restore();
    timeX0 = x0;
  }
  if (!play) return;
  const nd = eggNeeds(st);
  // the job panels, bottom corners: Pip's on the left, Bo's on the right
  for (const id of [0, 1]) {
    const isF = id === st.front, pw = Math.round(270 * z), ph = Math.round(58 * z), py = H - ph - 10;
    const px = id === 0 ? 12 : W - 12 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const cpuSeat = eggQuiet(id);
    const title = NAMES[id] + (isF ? ' leads' : ' follows') + (cpuSeat ? ' (computer)' : isF ? ' (front)' : ' (back)');
    text(title, px + 12 * z, py + 14 * z, 14 * z, PCOL[id], 'left');
    ctx.font = 14 * z + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const room = pw - 24 * z - ctx.measureText(title).width - 10 * z;   // what's left of the top line beside the title
    if (isF) {
      // the front sees what's coming (shortened, then smaller, until it fits beside the title)
      const nx = nd.next, what = nx && nx.d < 420 ? EGG_NEXT[nx.kind] || nx.kind : null;
      const tries = what ? ['Next: ' + what, what, what.split(':')[0]] : ['All clear ahead', 'All clear'];
      let nt = tries[tries.length - 1], nfs = 9 * z;
      found: for (const s of [11, 10, 9]) for (const tt of tries) {
        ctx.font = '700 ' + s * z + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
        if (ctx.measureText(tt).width <= room) { nt = tt; nfs = s * z; break found; }
      }
      text(nt, px + pw - 12 * z, py + 14 * z, nfs, nx && nx.d < 160 ? C.gold : '#d9d3ef', 'right', 'body');
    } else {
      // the back watches the egg: where it sits on the leaf
      const bw = clamp(room, 40 * z, 92 * z), bx = px + pw - 12 * z - bw, by = py + 9 * z, bh = 10 * z;
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(bx, by, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = 'rgba(143,227,176,0.6)'; rr(bx + bw * 0.3, by, bw * 0.4, bh, bh / 2); ctx.fill();
      const u = 0.5 + 0.5 * clamp((st.egg.air ? 0 : st.egg.s) / P.sMax, -1, 1), danger = Math.abs(st.egg.s) > P.sMax * 0.7;
      ctx.fillStyle = st.egg.air ? '#ffd27a' : danger ? '#ff8a8a' : '#fff3dc';
      ctx.beginPath(); ctx.ellipse(bx + bw * u, by + bh / 2, 5 * z, 6.5 * z, 0, 0, Math.PI * 2); ctx.fill();
    }
    const myLevel = nd.level[id], mine = st.cr[id];
    const chips = [
      ['right', 'WALK', !nd.hop && !nd.eggAir && st.state === 'walk' && Math.abs(st.pairV || 0) < 10 && !(nd.ventInfo && nd.ventInfo.state !== 'quiet' && isF)],
      ['jump', 'HOP', nd.hop || (st.cr[1 - id].ready && !mine.ready)],
      ['act', 'LIFT', myLevel === 'lift' || (Math.abs(st.egg.s) > 26 && Math.sign(st.egg.s) === (isF ? 1 : -1))],
      ['down', 'LOW', myLevel === 'low'],
    ];
    const cw = (pw - 24 * z - 18 * z) / 4;
    chips.forEach(([k, lab, on], i) => {
      const cx = px + 12 * z + i * (cw + 6 * z), cy = py + 27 * z, chh = 23 * z;
      const doing = (k === 'right' && Math.abs(mine.vx) > 20) || (k === 'jump' && (mine.ready || mine.air)) || (k === 'act' && mine.liftPx > 8) || (k === 'down' && mine.liftPx < -8);
      ctx.fillStyle = doing ? '#8fe3b0' : on ? (Math.sin(t * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : 'rgba(255,255,255,0.12)';
      rr(cx, cy, cw, chh, chh / 2); ctx.fill();
      const kk = cpuSeat ? '' : eggKey(id, k);
      const label = (kk && kk.length <= 2 ? kk + ' ' : '') + lab;
      text(label, cx + cw / 2, cy + chh / 2 + 0.5, (label.length > 7 ? 10 : 11.5) * z, on || doing ? C.ink : '#d9d3ef', 'center', 'body');
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
  if (G.introT > 0 || st.state !== 'walk') return;
  // prompts over the heads: the front's opens to the right, the back's to the left, so they never cover each other or
  // the egg. A hint bubble replaces that player's prompt while it shows.
  const fs = 14 * z, yMax = H - Math.round(58 * z) - 18, h = eggHands(st);
  const topY = Math.min(h.by, h.fy) - EGG.eggH * 2 - 14 - st.cam.y;
  const place = (id, w, hh) => {
    const p = ps[id], hx = p.x + PW / 2;
    const y = clamp(Math.min(p.y - 64 * z, topY) - hh, 46, yMax - hh);
    const x = id === st.front ? hx - 12 * z : hx + 12 * z - w;
    return { x: clamp(x, 4, W - w - 4), y };
  };
  const say = (id, str, col, pulse) => {
    if (eggQuiet(id) || st.hints[id]) return;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 20 * z, hh = fs + 12 * z, o = place(id, w, hh);
    const s = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(o.x + w / 2, o.y + hh / 2); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-w / 2, -hh / 2, w, hh, hh / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -hh / 2, w, hh, hh / 2); ctx.stroke();
    text(str, 0, 0.5, fs, col, 'center', 'body');
    ctx.restore();
  };
  const bubble = (id, str) => {
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 22 * z, hh = fs + 14 * z, o = place(id, w, hh);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5;
    rr(o.x, o.y, w, hh, hh / 2); ctx.fill(); ctx.stroke();
    text(str, o.x + w / 2, o.y + hh / 2 + 0.5, fs, C.ink, 'center', 'body');
  };
  if (st.lock <= 0) for (const id of [0, 1]) {
    const c = st.cr[id], o = st.cr[1 - id], isF = id === st.front, on = NAMES[1 - id];
    const toMe = !st.egg.air && Math.abs(st.egg.s) > 26 && Math.sign(st.egg.s) === (isF ? 1 : -1);
    if (c.air && c.air.kind === 'puff') say(id, 'Whee! ' + eggKey(id, 'down') + ' carry it low', '#ffffff', true);
    else if (st.egg.air) say(id, 'Stop! Catch the egg!', '#ffe7a8', true);
    else if (c.ready && !o.ready) say(id, 'Ready! Now ' + on + ' presses ' + (eggQuiet(1 - id) ? 'hop' : eggKey(1 - id, 'jump')), C.gold, false);
    else if (o.ready && !c.ready) say(id, eggKey(id, 'jump') + ' Hop with ' + on + '!', C.gold, true);
    else if (nd.hop) say(id, eggKey(id, 'jump') + ' Hop together!', C.gold, true);
    else if (nd.level[id] === 'lift' && c.liftPx < 8) say(id, eggKey(id, 'act') + ' Lift your end!', C.gold, true);
    else if (nd.level[id] === 'low' && c.liftPx > -6 && Math.abs(nd.diff) > 14) say(id, eggKey(id, 'down') + ' Carry it low!', '#ffe7a8', false);
    else if (toMe && c.liftPx < 8) say(id, eggKey(id, 'act') + ' Lift! It rolls to you', '#ff9a9a', true);
    else if (isF && nd.vent && nd.vent.x > c.x - 6 && nd.vent.x - c.x < 120 && (nd.ventInfo.state === 'warn' || (nd.ventInfo.state === 'quiet' && nd.ventInfo.toPuff < 1.7))) say(id, 'Wait for the puff!', '#ffe7a8', true);
    else if (isF && nd.vent && nd.ventInfo.state === 'puff' && nd.vent.x > c.x - 6) say(id, 'Puff! Wait...', '#ffffff', false);
    else if (isF && nd.vent && nd.vent.x > c.x - 6 && nd.vent.x - c.x < 120 && nd.ventInfo.state === 'quiet' && nd.ventInfo.toPuff > 2.3 && Math.abs(c.vx) < 20) say(id, 'Go now! ' + eggKey(id, 'right'), '#8fe3b0', true);
    else if (st.roomT < 9 && Math.abs(st.pairV || 0) < 5 && eggMid(st) < st.c.nests[0].x + 140) say(id, 'Walk together ' + eggKey(id, 'right'), '#ffe7a8', false);
  }
  for (const id of [0, 1]) if (st.hints[id]) bubble(id, st.hints[id].text);
}

/* ---------- sounds ---------- */
Sfx.extra.eggHop = function (p) { this.tone(420 * p, 0.1, 'sine', 0.05, 700 * p); };
Sfx.extra.eggLand = function () { this.tone(150, 0.07, 'triangle', 0.045, 90); };
Sfx.extra.eggTogether = function () { [523, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.05)); this.tone(330, 0.2, 'sine', 0.05, 700); };
Sfx.extra.eggWhoa = function () { this.tone(900, 0.4, 'sine', 0.05, 300); };
Sfx.extra.eggClonk = function () { this.tone(500, 0.06, 'triangle', 0.05, 380); this.tone(250, 0.08, 'sine', 0.04, 200, 0.03); };
Sfx.extra.eggUhoh = function () { [660, 494].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.05, null, i * 0.15)); };
Sfx.extra.eggBoing = function () { this.tone(180, 0.38, 'sine', 0.09, 620); this.tone(360, 0.2, 'triangle', 0.03, 900, 0.05); };
Sfx.extra.eggBoing2 = function () { this.tone(220, 0.22, 'sine', 0.05, 520); };
Sfx.extra.eggSploosh = function () { this.tone(1200, 0.35, 'sawtooth', 0.02, 160); this.tone(260, 0.45, 'sine', 0.07, 60); this.tone(700, 0.2, 'sine', 0.04, 1400, 0.25); };
Sfx.extra.eggSplish = function () { this.tone(900, 0.12, 'sine', 0.025, 400); };
Sfx.extra.eggPlop = function () { this.tone(320, 0.08, 'sine', 0.05, 200); };
Sfx.extra.eggPop = function () { this.tone(240, 0.16, 'sine', 0.06, 900); this.tone(1200, 0.06, 'triangle', 0.03, 700, 0.05); };
Sfx.extra.eggWhee = function (p) { this.tone(500 * p, 0.35, 'sine', 0.045, 1100 * p); };
Sfx.extra.eggPuffWarn = function () { [0, 0.18, 0.36].forEach(d => this.tone(300 + d * 400, 0.1, 'sine', 0.015, 420 + d * 400, d)); };
Sfx.extra.eggPuff = function () { this.tone(220, 0.6, 'sawtooth', 0.016, 900); this.tone(700, 0.5, 'sine', 0.02, 300, 0.08); };
Sfx.extra.eggPuffBig = function () { this.tone(160, 0.9, 'sawtooth', 0.02, 800); this.tone(520, 0.8, 'sine', 0.025, 240, 0.1); };
Sfx.extra.eggCheck = function () { this.tone(200, 0.18, 'sine', 0.05, 520); [784, 988, 1175].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, 0.08 + i * 0.06)); };
Sfx.extra.eggSwap = function () { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.eggHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.eggNope = function () { this.tone(300, 0.1, 'square', 0.025, 240); };
Sfx.extra.eggCrack = function () { this.tone(1500, 0.03, 'square', 0.03, 800); this.tone(1100, 0.03, 'square', 0.025, 600, 0.06); };
Sfx.extra.eggWiggle = function () { [0, 0.07, 0.14].forEach((d, i) => this.tone(600 + i * 80, 0.05, 'triangle', 0.025, null, d)); };
Sfx.extra.eggRawr = function () { this.tone(260, 0.3, 'sawtooth', 0.02, 180); this.tone(520, 0.18, 'triangle', 0.025, 360, 0.05); };
Sfx.extra.eggSquawk = function () { this.tone(900, 0.08, 'sawtooth', 0.02, 700); this.tone(1000, 0.1, 'sawtooth', 0.018, 760, 0.1); };
Sfx.extra.eggGiggle = function () { [880, 988, 880, 988].forEach((f, i) => this.tone(f, 0.06, 'sine', 0.03, null, i * 0.07)); };
Sfx.extra.eggMama = function () { [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.05, null, i * 0.1)); };
Sfx.extra.eggHatch = function () { this.tone(300, 0.2, 'sine', 0.06, 1200); [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.05, null, 0.15 + i * 0.08)); };
