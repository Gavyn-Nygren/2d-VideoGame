/* Pip & Bo - Level 17-2 River Rapids Canoe (team, World 17 Jungle Jamboree). */
'use strict';

/* ===== 17-2 River Rapids Canoe (mode 'canoe', World 17 "Jungle Jamboree", team) =====
   Gavyn's pick: "one paddles left and right, the other bails water and pushes rocks away with an oar."
   Pip and Bo ride one canoe down a jungle river, seen from above. The river scrolls down the screen as the canoe goes
   upstream-to-downstream (up the screen). The mode owns the tick, the picture and the HUD (def.ownStep + def.ownHUD);
   the engine grid is empty apart from the two spawns.
   The PADDLER sits at the back. Each press of ◀ or ▶ is a paddle stroke on that side: it pushes the canoe forward and
   that way. Strokes on alternate sides on a steady beat (0.25-1.1 s apart) are "Swish!" strokes: they add the most
   speed and keep the canoe straight. The same side twice only steers; mashing faster than the beat (under 0.2 s)
   only splashes: the canoe slows, a little water comes in, and a mash stroke neither steers nor pushes off a bank. Holding ◀ or ▶ keeps turning. ▼ back-paddles (slow down: less water splashes in). The action or ▲ is a
   straight stroke on the other side from the last one.
   The BAILER sits at the front with a bucket and an oar. The bucket dips by itself; the action scoops: a full bucket
   (the gold part of the bucket meter) is a big scoop, a bit early a small one, and long before it is full nothing at
   all, so mashing bails slowly. A poke that hits nothing brings the oar back slowly (0.8 s).
   ◀ ▶ aim the oar (5 notches, a dotted line shows where it reaches) and ▲ pokes: a wobbly rock rolls away, a floating
   log spins aside, a branch or log in a jam is knocked loose (big logs need two pokes), a floating fruit is flicked
   into the canoe, and a poke at a big rock shoves the canoe away from it.
   Water: white water splashes in (more when the canoe is fast), bumps splash in too. Over 45% the canoe sits low and
   slows down; at 100% it is a soft "Glug! Swamped!": Cappy the capybara swims over, tips the water out and takes you
   back to the last flag. Touching a bank or an island beaches the canoe ("Bump!"): only a stroke (or a hold) away
   from it gets you going again. A jam of branches or logs across the river stops the canoe until it is poked open.
   So both jobs are needed: the current alone beaches the canoe at the first island, and only the oar opens a jam.
   Four stretches, the jobs swap at the calm pool after each one (room def paddler: 0|1): Lazy Bend, Rocky Rapids, Log
   Jam, Big Waterfall Drop (a gold gap through the rocks at the lip, a drop, a big splash, then bail to the party).
   Gold help (announced, only for tries you both took part in): Gold bucket after 2 swamps in a stretch (big scoops
   sooner and bigger), Calm water after 3 (half the splashes); Gold paddle after 3 beachings (stronger steering, any
   stroke pushes off); Gold oar after 3 missed pokes at a jam or 14 s stuck at one (longer reach, a gold arrow).
   Room def: { title, paddler: 0|1, pal, tip, act, course: [tokens] }. Course tokens (d = px down the river, offsets O
   are px right of the river's middle there):
     fN         move N px down the river          vN  the current eases to N px/s     cX  the river's middle eases to x X
     wN         the river's half-width eases to N
     b:O[:R]    a big rock                         p:O  a wobbly rock (poke it away)
     l:O:L:A:V  a floating log: length L, angle A (degrees, 90 = across the river), drifting V px/s sideways
     j:N[:HP]   a jam of N branches (HP 2: big logs) right across the river
     i:O:RW:RL[:animal]  an island (sandbar), half-width RW, half-length RL, with a sleepy animal on it
     m:O:kind   a floating fruit (mango banana berry coconut melon starfruit)
     R:N RR:N   white water (big) for N px          F  a flag (checkpoint)       S:text  a sign ({P} {B} and key words; 'text||text' gives the words for a computer's job)
     A:kind:L|R a jungle animal on the bank         g:O:W  a line of rocks across the river with a gold gap at O
     W          the waterfall lip                   P  the calm pool at the end (swap)    E  the party pool (the end)
   Every global is prefixed canoe / CANOE (and Sfx.extra.canoe*); all state lives in G.mst. */
const CANOE = {
  CY: 372,                                    // the canoe's middle on screen
  half: 52, beam: 20, endW: 10,               // half length, half width, half width at bow and stern
  bowSeat: -22, sternSeat: 26, pivot: 30,     // seats (screen px from the middle, bow up) and the oar's pivot ahead
  boostMax: 150, boostDecay: 1.6, gGood: 34, gPlain: 16, mashKeep: 0.6, side: 46,
  goodMin: 0.25, goodMax: 1.1, mashMax: 0.2, mashWater: 0.6, mashSlow: 0.85, pushHold: 0.35,
  holdAfter: 0.15, holdAcc: 300, vxMax: 170, vxDamp: 2.2,
  accUp: 130, accDown: 220, backK: 0.15,
  dipT: 0.65, goldAt: 0.75, spillBelow: 0.4, goldAtGold: 0.55, scoop: 12, scoopGold: 1.6,
  reach: 130, reachGold: 1.4, notchA: 0.42, jabT: 0.3, jabCd: 0.36, missCd: 0.8, aimRep: 0.22, aimHold: 0.32,
  splash: 4.2, splashBig: 6.4, leak: 1.5, bonkWater: 9, bankWater: 3, dropWater: 38, slowFrom: 45,
  swampT: 3.6, swapT: 2.7, finT: 5.2, tryWin: 6, hintLife: 2.8, dropLen: 300, dropT: 1.4,
  swampHelp: 2, calmHelp: 3, beachHelp: 3, jamMissHelp: 3, jamStuck: 14,
};
const CANOE_FRUIT = {
  mango: { col: '#ffb43d', dark: '#e07b1f' }, banana: { col: '#ffe14d', dark: '#c9a21c' }, berry: { col: '#a46be0', dark: '#6b3fa8' },
  coconut: { col: '#8a5a34', dark: '#5a3a20' }, melon: { col: '#7fd36a', dark: '#3f8f3a' }, starfruit: { col: '#ffd84d', dark: '#d99a12' },
};
const CANOE_PAL = {
  lazy: { water: '#4fb5a8', deep: '#3a9a95', ripple: 'rgba(225,255,245,0.45)', foam: '#f2fffb', bank: '#5aa84a', bankDark: '#3f8a3a',
    sand: '#e8cf92', mud: '#a8814e', leaf: ['#4f9e3e', '#6cc04f', '#3d8a3a', '#86d65e'], trunk: '#7a5232', flower: ['#ff7aa8', '#ffd84d', '#ff9a3d'] },
  rapids: { water: '#3fa6b8', deep: '#2f8aa6', ripple: 'rgba(230,250,255,0.5)', foam: '#ffffff', bank: '#6aa84e', bankDark: '#4a8a40',
    sand: '#d8c4a0', mud: '#8f8576', leaf: ['#4a9a40', '#62b84c', '#3a8038', '#7fcf5a'], trunk: '#6e4e30', flower: ['#ff6b6b', '#ffe14d', '#b78cff'] },
  logjam: { water: '#4a9f8a', deep: '#3a8676', ripple: 'rgba(220,250,230,0.42)', foam: '#effff6', bank: '#4f9444', bankDark: '#36763a',
    sand: '#cdb27e', mud: '#8a6a44', leaf: ['#3f8a3a', '#57a848', '#2f7034', '#73c454'], trunk: '#6a4628', flower: ['#ffb43d', '#ff7aa8', '#ffffff'] },
  falls: { water: '#47b0c0', deep: '#3592ad', ripple: 'rgba(235,252,255,0.5)', foam: '#ffffff', bank: '#78b04e', bankDark: '#558f40',
    sand: '#ead29a', mud: '#9f8458', leaf: ['#5aa844', '#76c455', '#459440', '#94dc68'], trunk: '#7a5232', flower: ['#ff7aa8', '#ffd84d', '#ff6b4a'] },
};
const canoeLerp = (a, b, u) => a + (b - a) * u;
const canoeSmooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };

/* ---------- the course: tokens -> river middle, width and current (8 px steps) and everything in the river ---------- */
function canoeCompile(def) {
  const pd = def.paddler || 0;
  const c = { rocks: [], logs: [], jams: [], islands: [], fruit: [], rapids: [], flags: [], signs: [], deco: [], gaps: [], pool: null, finish: null, lip: null };
  const ck = [{ d: -900, y: 480, r: 1 }], wk = [{ d: -900, y: 215, r: 1 }], vk = [{ d: -900, y: 40, r: 1 }];
  const later = [];
  let d = 0, k = 0;
  for (const tk of def.course || []) {
    const t = String(tk), ch = t[0], parts = t.split(':');
    const num = i => +(parts[i] || 0);
    if (ch === 'f' && /^f\d/.test(t)) d += parseInt(t.slice(1), 10) || 0;
    else if (ch === 'v' && /^v\d/.test(t)) vk.push({ d, y: +t.slice(1), r: 300 });
    else if (ch === 'c' && /^c\d/.test(t)) ck.push({ d, y: +t.slice(1).split(':')[0], r: +(parts[1] || 500) });
    else if (ch === 'w' && /^w\d/.test(t)) wk.push({ d, y: +t.slice(1).split(':')[0], r: +(parts[1] || 400) });
    else if (t.startsWith('RR:')) c.rapids.push({ d0: d, d1: d + num(1), big: true, k: k++ });
    else if (ch === 'R' && t[1] === ':') c.rapids.push({ d0: d, d1: d + num(1), big: false, k: k++ });
    else if (t === 'F') c.flags.push({ d, on: false, k: k++ });
    else if (t === 'P') { c.pool = { d: d + 120, k: k++ }; wk.push({ d, y: 300, r: 260 }); d += 700; }
    else if (t === 'E') { c.finish = { d: d + 140, k: k++ }; wk.push({ d, y: 330, r: 280 }); d += 900; }
    else if (t === 'W') { c.lip = { d, k: k++ }; d += CANOE.dropLen; }
    else if (ch === 'S' && t[1] === ':') c.signs.push({ d, text: t.slice(2), shown: false });
    else later.push({ t, parts, d, k: k++ });   // things placed by offset: need the river's middle first
  }
  c.len = d + 700;
  // sample the river's middle, half-width and current every 8 px
  const X0 = -900, N = Math.ceil((c.len - X0) / 8) + 2;
  const sample = (kn, xx) => {
    let i = 0;
    while (i + 1 < kn.length && kn[i + 1].d <= xx) i++;
    const a = kn[i], prev = kn[i - 1];
    if (prev && xx < a.d + a.r) return canoeLerp(prev.y, a.y, canoeSmooth((xx - a.d) / a.r));
    return a.y;
  };
  c.x0 = X0; c.cx = new Float32Array(N); c.hw = new Float32Array(N); c.cur = new Float32Array(N);
  for (let i = 0; i < N; i++) { const xx = X0 + i * 8; c.cx[i] = sample(ck, xx); c.hw[i] = sample(wk, xx); c.cur[i] = sample(vk, xx); }
  const CX = dd => canoeArr(c, c.cx, dd), HW = dd => canoeArr(c, c.hw, dd);
  for (const o of later) {
    const { t, parts, d: dd } = o, ch = t[0], num = i => +(parts[i] || 0), x = CX(dd) + num(1);
    if (ch === 'b' && t[1] === ':') c.rocks.push({ d: dd, x, r: num(2) || 26, kind: 'boulder', gone: false, k: o.k });
    else if (ch === 'p' && t[1] === ':') c.rocks.push({ d: dd, x, r: 17, kind: 'wobble', gone: false, k: o.k, vx: 0, rot: 0 });
    else if (ch === 'l' && t[1] === ':') c.logs.push({ d: dd, x, len: num(2) || 110, a: (num(3) || 80) * Math.PI / 180, vx: num(4), gone: false, k: o.k, spin: 0, out: 0 });
    else if (ch === 'j' && t[1] === ':') {
      const n = Math.max(2, num(1) || 4), hp = Math.max(1, num(2) || 1), x0 = CX(dd) - HW(dd) - 24, x1 = CX(dd) + HW(dd) + 24, w = (x1 - x0) / n;
      c.jams.push({ d: dd, hp, k: o.k, stuck: 0, miss: 0, pieces: Array.from({ length: n }, (_, i) => ({ x0: x0 + i * w, x1: x0 + (i + 1) * w, hp, gone: false, out: 0, dir: x0 + (i + 0.5) * w < CX(dd) ? -1 : 1, wob: 0, k: i })) });
    } else if (ch === 'i' && t[1] === ':') c.islands.push({ d: dd, x, rw: num(2) || 60, rl: num(3) || 110, animal: parts[4] || null, k: o.k });
    else if (ch === 'm' && t[1] === ':') c.fruit.push({ d: dd, x, kind: CANOE_FRUIT[parts[2]] ? parts[2] : 'mango', got: false, fly: 0, k: o.k });
    else if (ch === 'A' && t[1] === ':') { const side = parts[2] === 'L' ? -1 : 1; c.deco.push({ d: dd, kind: parts[1], side, x: CX(dd) + side * (HW(dd) + 34), k: o.k }); }
    else if (ch === 'g' && t[1] === ':') {
      const gx = CX(dd) + num(1), gw = num(2) || 110, hw = HW(dd);
      c.gaps.push({ d: dd, x: gx, w: gw });
      for (let xx = CX(dd) - hw + 6; xx <= CX(dd) + hw - 6; xx += 46) if (Math.abs(xx - gx) > gw / 2 + 20) c.rocks.push({ d: dd + ((xx / 46) % 2 ? 6 : -6), x: xx, r: 24, kind: 'boulder', gone: false, k: o.k + xx, lip: true });
    }
  }
  // signs name the jobs and each player's own keys when they are shown (canoeSignText)
  c.paddler = pd;
  c.fruitN = c.fruit.length;
  return c;
}
function canoeArr(c, a, d) {
  const f = (d - c.x0) / 8, i = Math.floor(f);
  if (i < 0) return a[0];
  if (i >= a.length - 1) return a[a.length - 1];
  return a[i] + (a[i + 1] - a[i]) * (f - i);
}
const canoeCX = (st, d) => canoeArr(st.c, st.c.cx, d);
const canoeHW = (st, d) => canoeArr(st.c, st.c.hw, d);
const canoeCur = (st, d) => canoeArr(st.c, st.c.cur, d);
// screen y of a spot d px down the river (the canoe's middle is at CANOE.CY)
const canoeCY = () => (typeof hudBig === 'function' && hudBig() ? 330 : CANOE.CY);
const canoeSY = (st, d) => canoeCY() - (d - st.cam);
const canoeSD = (st, y) => st.cam + (canoeCY() - y);
// each player's own keys, for prompts and the HUD (a player with a controller is shown its buttons)
function canoeKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
  if (what === 'poke') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'down') return pad ? 'stick ▼' : touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'left') return pad || touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'right') return pad || touch ? '▶' : id === 0 ? 'D' : '→';
  return pad ? 'stick ◀ ▶' : touch ? '◀ ▶' : id === 0 ? 'A D' : '← →';
}
function canoeSignText(st, s) {
  const P = st.paddler, B = st.bailer;
  // 'words for a person||words when that job is the computer's' (1-player mode never shows keys for the computer's job)
  const two = s.split('||');
  if (two.length > 1) s = (/\{P/.test(two[0]) ? canoeQuiet(P) : /\{B/.test(two[0]) && canoeQuiet(B)) ? two[1] : two[0];
  return s.replace(/\{P\}/g, NAMES[P]).replace(/\{B\}/g, NAMES[B]).replace(/\{Plr\}/g, canoeKey(P, 'lr')).replace(/\{Pdown\}/g, canoeKey(P, 'down'))
    .replace(/\{Bact\}/g, canoeKey(B, 'act')).replace(/\{Blr\}/g, canoeKey(B, 'lr')).replace(/\{Bpoke\}/g, canoeKey(B, 'poke'));
}
// 1-player mode: the computer's own job gets no key hints or prompts (it knows its job)
const canoeQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const canoeBoth = st => G.time - st.inT[0] < CANOE.tryWin && G.time - st.inT[1] < CANOE.tryWin;
const canoeReach = st => CANOE.reach * (st.oarGold ? CANOE.reachGold : 1);
const canoeGoldAt = st => (st.bucketGold ? CANOE.goldAtGold : CANOE.goldAt);

/* ---------- a stretch ---------- */
function canoeRoom(st, L, k) {
  const def = L.def;
  st.k = k; st.paddler = def.paddler || 0; st.bailer = 1 - st.paddler; st.title = def.title || '';
  st.palKey = CANOE_PAL[def.pal] ? def.pal : 'lazy'; st.pal = CANOE_PAL[st.palKey];
  st.c = canoeCompile(def);
  st.stats.roomT[k] = null; st.stats.roomTitles[k] = st.title;
  st.roomSwamps = 0; st.roomBeach = 0; st.bucketGold = false; st.calmGold = false; st.paddleGold = false; st.oarGold = false;
  const x = canoeCX(st, 0);
  st.cn = { d: 0, x, v: 0, vx: 0, boost: 0, water: 0, beached: null, bonkT: 0, slideT: 0, state: 'go', t: 0, heading: 0,
    lastT: -9, lastSide: 1, streak: 0, strokeA: 0, strokeSide: 1, holdT: 0, holdDir: 0,
    dip: 0.4, scoopA: 0, scoopSide: -1, aim: 0, aimT: 0, aimDir: 0, jab: 0, jabCd: 0, jabHit: false, splashT: 0.6, slosh: 0,
    atJam: null, swamp: null, drop: null, swap: null, fin: null, bob: 0 };
  st.cam = 0; st.cp = { d: 0 };
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null; st.sign = null;
  st.roomT = 0; st.segStart = G.time; st.inT = [-99, -99]; st.prevIn = [{}, {}];
  st.plan = null; st.planTick = -1; st.needT = -1; st.need = null;
  canoeActLabels(st);
  canoeMirror(st);
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function canoeStep(st, dt) {
  if (!st.cn) return;
  const ps = G.players, cn = st.cn;
  for (const k of [0, 1]) {
    const i = ps[k].input;
    if (i.left || i.right || i.jump || i.down || i.up || i.act || ps[k].pendingJump || ps[k].pendingAct) st.inT[k] = G.time;
  }
  st.roomT += dt;
  if (G.introT > 0) {
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
    for (const k of [0, 1]) st.prevIn[k] = { left: ps[k].input.left, right: ps[k].input.right };
    cn.dip = Math.min(1, cn.dip + dt / CANOE.dipT);
  } else if (cn.state === 'swamp') canoeSwampStep(st, dt);
  else if (cn.state === 'drop') canoeDropStep(st, dt);
  else if (cn.state === 'swap') { if (canoeSwapStep(st, dt)) return; }
  else if (cn.state === 'fin') { if (canoeFinStep(st, dt)) return; }
  else canoePlay(st, dt);
  canoeWorld(st, dt);
  st.cam = cn.d;
  canoeFx(st, dt);
  canoeMirror(st);
}

function canoePlay(st, dt) {
  const P = CANOE, cn = st.cn, ps = G.players, Pd = ps[st.paddler], Bl = ps[st.bailer], c = st.c;
  const pi = Pd.input, bi = Bl.input;
  const pStraight = Pd.pendingJump || Pd.pendingAct, bPoke = Bl.pendingJump, bBail = Bl.pendingAct;
  for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
  const pPrev = st.prevIn[st.paddler], bPrev = st.prevIn[st.bailer];
  cn.t += dt;
  if (cn.bonkT > 0) cn.bonkT -= dt;
  if (cn.slideT > 0) cn.slideT -= dt;
  /* the paddler: a press of ◀ or ▶ is a stroke on that side; holding keeps turning; ▼ back-paddles */
  const L = pi.left && !pi.right, R = pi.right && !pi.left;
  if (L && !pPrev.left) canoeStroke(st, -1);
  if (R && !pPrev.right) canoeStroke(st, 1);
  if (pStraight) canoeStroke(st, -cn.lastSide || 1, true);
  const hd = L ? -1 : R ? 1 : 0;
  if (hd && hd === cn.holdDir) cn.holdT += dt; else { cn.holdDir = hd; cn.holdT = 0; }
  if (hd && cn.holdT > P.holdAfter) {
    cn.vx += hd * P.holdAcc * (st.paddleGold ? 1.35 : 1) * dt;
    if (cn.beached && (hd === cn.beached.dir || st.paddleGold) && cn.holdT > P.pushHold) canoeUnbeach(st);
  }
  const back = pi.down && !hd;
  /* the bailer: ◀ ▶ aim the oar (a hold steps on), ▲ pokes, the action scoops */
  const aL = bi.left && !bi.right, aR = bi.right && !bi.left, ad = aL ? -1 : aR ? 1 : 0;
  if (ad && ((ad < 0 && !bPrev.left) || (ad > 0 && !bPrev.right))) { cn.aim = clamp(cn.aim + ad, -2, 2); cn.aimT = 0; cn.aimDir = ad; Sfx.play('canoeAim', st.bailer); }
  else if (ad && ad === cn.aimDir) { cn.aimT += dt; if (cn.aimT > P.aimHold) { cn.aimT -= P.aimRep; cn.aim = clamp(cn.aim + ad, -2, 2); } }
  else { cn.aimDir = ad; cn.aimT = 0; }
  if (bPoke && cn.jabCd <= 0) { cn.jab = P.jabT; cn.jabCd = P.jabCd; cn.jabHit = false; Sfx.play('canoeJab', st.bailer); }
  if (cn.jabCd > 0) cn.jabCd -= dt;
  if (cn.jab > 0) { cn.jab -= dt; if (!cn.jabHit && cn.jab <= P.jabT - 0.09) { cn.jabHit = true; canoePoke(st); } }
  cn.dip = Math.min(1, cn.dip + dt / P.dipT);
  if (bBail) canoeBail(st);
  st.prevIn[st.paddler] = { left: pi.left, right: pi.right };
  st.prevIn[st.bailer] = { left: bi.left, right: bi.right };
  /* speed down the river */
  const cur = canoeCur(st, cn.d);
  cn.boost *= Math.exp(-dt / P.boostDecay);
  const slowW = 1 - 0.5 * clamp((cn.water - P.slowFrom) / (100 - P.slowFrom), 0, 1);
  let tgt = (cur + cn.boost) * slowW;
  if (back) { tgt = cur * P.backK; cn.boost = approach(cn.boost, 0, 220 * dt); }
  if (cn.slideT > 0) tgt = Math.min(tgt, 30);
  if (cn.beached) { tgt = 0; cn.v = 0; }
  cn.v = approach(cn.v, tgt, (cn.v < tgt ? P.accUp : P.accDown) * dt);
  // sideways: a little drift in big white water, then drag
  const rp = canoeRapidsAt(st, cn.d);
  if (rp && rp.big && !cn.beached) cn.vx += Math.sin(cn.d * 0.011 + rp.k) * 70 * dt;
  cn.vx *= Math.exp(-P.vxDamp * dt);
  cn.vx = clamp(cn.vx, -P.vxMax, P.vxMax);
  if (cn.beached) cn.vx = 0;
  cn.x += cn.vx * dt;
  cn.d += cn.v * dt;
  cn.heading = approach(cn.heading, clamp(Math.atan2(cn.vx, Math.max(60, cn.v)) * 0.8, -0.38, 0.38), dt * 2.5);
  /* water: the old canoe leaks a little while it moves, and white water splashes in (more when fast) */
  if (cn.v > 20) cn.water = Math.min(100, cn.water + P.leak * (st.calmGold ? 0.5 : 1) * dt);
  if (rp) {
    cn.splashT -= dt * (0.6 + 0.4 * clamp(cn.v / 150, 0, 1.4));
    if (cn.splashT <= 0) {
      cn.splashT = 0.35 + Math.random() * 0.45;
      const amt = (rp.big ? P.splashBig : P.splash) * (0.45 + 0.55 * clamp(cn.v / 140, 0, 1.3)) * (st.calmGold ? 0.5 : 1);
      canoeAddWater(st, amt, false);
    }
  }
  canoeHits(st, dt);
  // the jam: stuck in front of it for a long time with the bailer trying (the paddler is told to wait): the gold oar
  if (cn.atJam && cn.v <= 1) {
    if (G.time - st.inT[st.bailer] < CANOE.tryWin) cn.atJam.stuck += dt;
    if (cn.atJam.stuck > P.jamStuck && !st.oarGold) canoeOarGold(st);
  }
  // the end of the stretch
  if (c.lip && cn.d + P.half >= c.lip.d && cn.d < c.lip.d) { canoeStartDrop(st); return; }
  if (c.pool && cn.d >= c.pool.d) { canoeStartSwap(st); return; }
  if (c.finish && cn.d >= c.finish.d) { canoeStartFin(st); return; }
  if (cn.water >= 100) canoeStartSwamp(st);
  canoeNudges(st);
}
// a paddle stroke on side -1 (left) or 1 (right). straight: the action / ▲ (a stroke on the other side from the last)
function canoeStroke(st, side, straight) {
  const P = CANOE, cn = st.cn, id = st.paddler, dtL = G.time - cn.lastT;
  let kind;
  if (dtL < P.mashMax) kind = 'mash';
  else if (side !== cn.lastSide && dtL >= P.goodMin && dtL <= P.goodMax) kind = 'good';
  else kind = 'plain';
  // (mashing faster than the beat only splashes: the canoe loses a little speed)
  if (kind === 'mash') { cn.boost *= P.mashKeep; cn.v *= P.mashSlow; }
  else cn.boost = Math.min(P.boostMax, cn.boost + (kind === 'good' ? P.gGood : P.gPlain));
  // (a mash stroke doesn't steer, and it splashes a little water into the canoe)
  if (!straight && kind !== 'mash') cn.vx += side * P.side * (st.paddleGold ? 1.25 : 1);
  if (kind === 'mash' && cn.state === 'go') cn.water = Math.min(99, cn.water + P.mashWater);
  st.stats.strokes[id]++;
  if (kind === 'good') {
    cn.streak++; st.stats.swish[id]++;
    if (cn.streak % 4 === 0) canoePop(st, cn.x, cn.d - 70, 'Swish x' + cn.streak + '!', '#e8fff8', 16);
    Sfx.play('canoeSwish', id);
  } else { cn.streak = 0; Sfx.play(kind === 'mash' ? 'canoeSplish' : 'canoeStroke', id); }
  if (kind === 'mash') { st.mashN = (st.mashN || 0) + 1; if (st.mashN >= 10) { st.mashN = 0; canoeHintOnce(st, 'mash' + st.k, id, 'Slower! Left, right, left, right on a steady beat'); } }
  else st.mashN = 0;
  cn.lastT = G.time; cn.lastSide = side; cn.strokeA = 1; cn.strokeSide = side;
  for (let i = 0; i < 4; i++) canoePart(st, cn.x + side * 34, cn.d - 26 + Math.random() * 10, side * (30 + Math.random() * 40), -40 - Math.random() * 50, 0.5, 'rgba(255,255,255,0.85)', 2.5 + Math.random() * 2, 0, 'drop');
  if (cn.beached && kind !== 'mash' && (side === cn.beached.dir || st.paddleGold)) canoeUnbeach(st);
}
function canoeUnbeach(st) {
  const cn = st.cn, b = cn.beached;
  if (!b) return;
  cn.beached = null; cn.vx = b.dir * 90; cn.slideT = 0.45; cn.d -= b.island ? 8 : 0; cn.v = 0;
  canoePop(st, cn.x, cn.d + 60, 'Push off!', '#ffffff', 16);
  Sfx.play('canoePush', st.paddler);
}
// the bucket: a full bucket (gold) is a big scoop, an early press a small one
function canoeBail(st) {
  const P = CANOE, cn = st.cn, id = st.bailer;
  const full = cn.dip >= canoeGoldAt(st), k = st.bucketGold ? P.scoopGold : 1;
  cn.scoopA = 1; cn.scoopSide = cn.aim > 0 ? -1 : 1;
  if (cn.water <= 0.5) { cn.dip = 0; canoePop(st, cn.x, cn.d + 50, 'All dry!', '#e8fff8', 14); Sfx.play('canoeSplish', id); return; }
  // (far too soon: the bucket is still empty, so nothing comes out; a bit early: a small scoop)
  const amt = full ? P.scoop * k : cn.dip < P.spillBelow ? 0 : P.scoop * k * 0.6 * cn.dip * cn.dip;
  cn.water = Math.max(0, cn.water - amt);
  if (full) { st.stats.scoops[id]++; Sfx.play('canoeScoop', id); } else Sfx.play('canoeSplish', id);
  st.stats.bails[id]++;
  if (!full) { st.earlyN = (st.earlyN || 0) + 1; if (st.earlyN >= 6) { st.earlyN = 0; canoeHintOnce(st, 'early' + st.k, id, 'Wait for the bucket to fill (gold), then scoop!'); } }
  else st.earlyN = 0;
  cn.dip = 0;
  const sx = cn.x + cn.scoopSide * 30, n = full ? 9 : 3;
  for (let i = 0; i < n; i++) canoePart(st, sx, cn.d + 20, cn.scoopSide * (80 + Math.random() * 90), (Math.random() - 0.5) * 80, 0.55, i % 2 ? '#bff0ff' : '#ffffff', 2.5 + Math.random() * 2.5, 0, 'drop');
}
function canoeAddWater(st, amt, bonk) {
  const cn = st.cn;
  cn.water = Math.min(100, cn.water + amt);
  cn.slosh = 1;
  for (let i = 0; i < (bonk ? 10 : 5); i++) {
    const s = Math.random() < 0.5 ? -1 : 1;
    canoePart(st, cn.x + s * (18 + Math.random() * 14), cn.d + (Math.random() - 0.3) * 60, -s * (20 + Math.random() * 40), -20 - Math.random() * 40, 0.5, 'rgba(255,255,255,0.9)', 3 + Math.random() * 3, 0, 'drop');
  }
  if (!bonk && Math.random() < 0.3) Sfx.play('canoeSplash');
}
function canoeRapidsAt(st, d) { for (const r of st.c.rapids) if (d >= r.d0 && d <= r.d1) return r; return null; }

/* ---------- bumping into things ---------- */
// distance from a spot to the canoe's middle line (a capsule from stern to bow)
function canoeDist(cn, x, d) { return Math.hypot(x - cn.x, d - clamp(d, cn.d - 42, cn.d + 44)); }
function canoeHits(st, dt) {
  const P = CANOE, cn = st.cn, c = st.c;
  // the banks: stern, middle and bow
  for (const [dd, hw] of [[cn.d - 44, P.endW], [cn.d, P.beam], [cn.d + 46, P.endW]]) {
    const off = cn.x - canoeCX(st, dd), lim = canoeHW(st, dd) - hw;
    if (Math.abs(off) > lim) {
      const side = Math.sign(off);
      cn.x -= side * (Math.abs(off) - lim);
      if (!cn.beached && cn.vx * side > -25) canoeBeach(st, -side, false);
      else if (cn.vx * side > 0) cn.vx = 0;
    }
  }
  // islands (sandbars)
  for (const is of c.islands) {
    if (Math.abs(is.d - cn.d) > is.rl + 70) continue;
    for (const [px, pd] of [[cn.x, cn.d + 48], [cn.x - P.beam, cn.d], [cn.x + P.beam, cn.d], [cn.x, cn.d - 44]]) {
      const u = (px - is.x) / is.rw, w = (pd - is.d) / is.rl;
      if (u * u + w * w < 1) {
        const dir = cn.x >= is.x ? 1 : -1;
        if (!cn.beached) {
          if (cn.slideT > 0) { cn.x += dir * 40 * dt; cn.d -= 20 * dt; }
          else canoeBeach(st, dir, true);
        }
        break;
      }
    }
  }
  // rocks
  for (const r of c.rocks) {
    if (r.gone || Math.abs(r.d - cn.d) > 90) continue;
    const dist = canoeDist(cn, r.x, r.d);
    if (dist < r.r + P.beam - 1) {
      const s = cn.x >= r.x ? 1 : -1;
      cn.x += s * Math.min(4, r.r + P.beam - dist) * 0.5;
      if (r.d > cn.d - 10) cn.d -= Math.min(3, (r.r + P.beam - dist)) * 0.5;
      canoeBonk(st, s, r.kind === 'wobble' ? 'Bonk! Wobbly rock!' : 'Bonk!');
    }
  }
  // floating logs
  for (const lg of c.logs) {
    if (lg.gone || Math.abs(lg.d - cn.d) > lg.len / 2 + 70) continue;
    let best = 1e9, bx = 0;
    for (let i = 0; i <= 6; i++) {
      const u = i / 6 - 0.5, x = lg.x + Math.sin(lg.a) * lg.len * u, d = lg.d + Math.cos(lg.a) * lg.len * u, dd = canoeDist(cn, x, d);
      if (dd < best) { best = dd; bx = x; }
    }
    if (best < 9 + P.beam) { const s = cn.x >= bx ? 1 : -1; cn.d -= 1; canoeBonk(st, s, 'Bonk! A log!'); }
  }
  // jams: right across the river, the canoe stops in front of a branch that is still there
  cn.atJam = null;
  for (const jm of c.jams) {
    if (jm.d < cn.d - 20 || jm.d > cn.d + 120) continue;
    const blocked = jm.pieces.some(pc => !pc.gone && pc.x1 > cn.x - P.beam + 2 && pc.x0 < cn.x + P.beam - 2);
    if (blocked && cn.d + P.half >= jm.d - 9 && cn.d + P.half <= jm.d + 12) {
      cn.d = jm.d - 9 - P.half; cn.v = Math.min(cn.v, 0); cn.boost *= 0.5; cn.atJam = jm;
      if (!jm.hitOnce) { jm.hitOnce = true; canoePop(st, cn.x, cn.d + 80, 'Bump! Logs in the way!', '#ffe7a8', 18); Sfx.play('canoeThud'); }
    } else if (blocked && cn.d + P.half >= jm.d - 60) cn.atJam = jm;
  }
  // fruit: the canoe floats over it
  for (const f of c.fruit) {
    if (f.got || Math.abs(f.d - cn.d) > 80) continue;
    if (canoeDist(cn, f.x, f.d) < 28) canoeGetFruit(st, f, -1);
  }
  // flags
  for (const fl of c.flags) if (!fl.on && cn.d >= fl.d) {
    fl.on = true; st.cp = { d: fl.d };
    canoePop(st, canoeCX(st, fl.d) + canoeHW(st, fl.d) - 10, fl.d + 30, 'Checkpoint!', C.gold, 18); Sfx.play('canoeFlag');
  }
  for (const s of c.signs) if (!s.shown && cn.d >= s.d - 240) { s.shown = true; st.sign = { text: s.text, t: 0, life: 4.4 }; }
}
function canoeBeach(st, dir, island) {
  const cn = st.cn;
  const fast = cn.v > 60;
  cn.beached = { dir, island }; cn.v = 0; cn.boost *= 0.3; cn.vx = 0;
  st.stats.beaches++;
  if (fast) canoeAddWater(st, CANOE.bankWater, true);
  canoePop(st, cn.x, cn.d + 80, island ? 'Bump! A sandbar!' : 'Bump! The bank!', '#ffe7a8', 18);
  Sfx.play('canoeBump'); rumble(st.paddler, 0.25, 0.35, 120);
  if (G.time - st.inT[st.paddler] < CANOE.tryWin) {
    st.roomBeach++;
    if (st.roomBeach >= CANOE.beachHelp && !st.paddleGold && canoeBoth(st)) {
      st.paddleGold = true; st.stats.helps++;
      canoeMsg(st, 'Gold paddle! Stronger steering, and any stroke pushes off', C.gold, 3.8); Sfx.play('canoeHelp');
    }
  }
  canoeHint(st, st.paddler, 'Beached! ' + (dir < 0 ? canoeKey(st.paddler, 'left') : canoeKey(st.paddler, 'right')) + ' paddle away from it', 3);
}
function canoeBonk(st, s, words) {
  const cn = st.cn;
  if (cn.bonkT > 0) return;
  cn.bonkT = 0.55; cn.v = -35; cn.boost *= 0.3; cn.vx = s * 110;
  st.stats.bonks++;
  canoeAddWater(st, CANOE.bonkWater * (st.calmGold ? 0.6 : 1), true);
  canoePop(st, cn.x, cn.d + 76, words, '#ffe7a8', 20);
  Sfx.play('canoeBonk'); rumble(0, 0.3, 0.3, 120); rumble(1, 0.3, 0.3, 120);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.1);
}
function canoeGetFruit(st, f, by) {
  if (f.got) return;
  f.got = true; f.fly = 1; f.by = by;
  st.stats.fruit++;
  canoePop(st, f.x, f.d + 34, by >= 0 ? 'Flick! Yum!' : 'Yum!', '#ffe7a8', 17);
  Sfx.play('canoeFruit', by >= 0 ? by : st.paddler);
  for (let i = 0; i < 6; i++) canoePart(st, f.x, f.d, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, 0.6, C.gold, 3, 0, 'spark');
}

/* ---------- the oar ---------- */
function canoeOarSeg(st, notch, len) {
  const P = CANOE, cn = st.cn, a = notch * P.notchA + cn.heading;
  const px = cn.x + Math.sin(cn.heading) * P.pivot, pd = cn.d + P.pivot;
  return { x0: px + Math.sin(a) * 14, d0: pd + Math.cos(a) * 14, x1: px + Math.sin(a) * len, d1: pd + Math.cos(a) * len };
}
function canoeSegPt(s, x, d) {
  const ax = s.x1 - s.x0, ad = s.d1 - s.d0, L2 = ax * ax + ad * ad || 1;
  const u = clamp(((x - s.x0) * ax + (d - s.d0) * ad) / L2, 0, 1);
  return Math.hypot(x - (s.x0 + ax * u), d - (s.d0 + ad * u));
}
// how far a thing is from an oar line: rocks and fruit are dots, logs and branches are lines
function canoeObjDist(seg, o) {
  if (o.kind === 'piece') {
    let best = 1e9;
    for (let i = 0; i <= 6; i++) { const x = canoeLerp(o.ref.x0 + 8, o.ref.x1 - 8, i / 6); best = Math.min(best, canoeSegPt(seg, x, o.d)); }
    return best - 9;
  }
  if (o.kind === 'log') {
    const lg = o.ref;
    let best = 1e9;
    for (let i = 0; i <= 8; i++) { const u = i / 8 - 0.5; best = Math.min(best, canoeSegPt(seg, lg.x + Math.sin(lg.a) * lg.len * u, lg.d + Math.cos(lg.a) * lg.len * u)); }
    return best - 9;
  }
  return canoeSegPt(seg, o.x, o.d) - (o.r || 12);
}
// everything the oar could touch right now
function canoePokeables(st) {
  const cn = st.cn, c = st.c, out = [], near = d => d > cn.d - 45 && d < cn.d + 360;
  for (const r of c.rocks) if (!r.gone && near(r.d)) out.push({ kind: r.kind === 'boulder' ? 'boulder' : 'wobble', ref: r, x: r.x, d: r.d, r: r.r });
  for (const lg of c.logs) if (!lg.gone && Math.abs(lg.d - cn.d - 150) < 230) out.push({ kind: 'log', ref: lg, x: lg.x, d: lg.d, r: 9 });
  for (const jm of c.jams) if (near(jm.d)) for (const pc of jm.pieces) if (!pc.gone) out.push({ kind: 'piece', ref: pc, jam: jm, x: (pc.x0 + pc.x1) / 2, d: jm.d, r: 9 });
  for (const f of c.fruit) if (!f.got && near(f.d)) out.push({ kind: 'fruit', ref: f, x: f.x, d: f.d, r: 13 });
  return out;
}
function canoePoke(st) {
  const P = CANOE, cn = st.cn, id = st.bailer, seg = canoeOarSeg(st, cn.aim, canoeReach(st));
  let best = null, bd = 1e9;
  for (const o of canoePokeables(st)) {
    const dd = canoeObjDist(seg, o) - (o.kind === 'fruit' ? 6 : 2);
    // (along the oar: the nearest thing it meets first)
    const along = Math.hypot(o.x - seg.x0, o.d - seg.d0);
    if (dd < 6 && along < bd) { bd = along; best = o; }
  }
  const tip = { x: seg.x1, d: seg.d1 };
  if (!best) {
    const jm = st.c.jams.find(j => j.d > cn.d && j.d < cn.d + 220 && j.pieces.some(pc => !pc.gone));
    if (jm && canoeBoth(st)) { jm.miss++; if (jm.miss >= P.jamMissHelp && !st.oarGold) canoeOarGold(st); }
    for (let i = 0; i < 3; i++) canoePart(st, tip.x, tip.d, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, 0.4, 'rgba(255,255,255,0.8)', 2.5, 0, 'drop');
    cn.jabCd = Math.max(cn.jabCd, CANOE.missCd - 0.09); // (a miss: the oar comes back slowly, so jabbing at random is slow)
    st.missPoke = (st.missPoke || 0) + 1;
    if (st.missPoke >= 4) { st.missPoke = 0; canoeHintOnce(st, 'aim' + st.k, id, 'Aim the oar ' + canoeKey(id, 'lr') + ' so the dotted line touches it'); }
    return;
  }
  st.missPoke = 0;
  const side = best.x >= cn.x ? 1 : -1;
  if (best.kind === 'wobble') {
    const r = best.ref; r.gone = true; r.vx = side * 240; r.rollD = 0;
    st.stats.pokes[id]++;
    canoePop(st, r.x, r.d + 30, 'Roll away!', '#ffffff', 17); Sfx.play('canoePoke', id);
  } else if (best.kind === 'log') {
    const lg = best.ref; lg.gone = true; lg.out = 0; lg.outDir = lg.x >= canoeCX(st, lg.d) ? 1 : -1;
    st.stats.pokes[id]++;
    canoePop(st, lg.x, lg.d + 30, 'Spin away!', '#ffffff', 17); Sfx.play('canoePoke', id);
  } else if (best.kind === 'piece') {
    const pc = best.ref; pc.hp--; pc.wob = 1;
    if (pc.hp <= 0) {
      pc.gone = true; pc.out = 0;
      st.stats.pokes[id]++;
      canoePop(st, (pc.x0 + pc.x1) / 2, best.d + 30, best.jam.hp > 1 ? 'Heave! Off it goes!' : 'Pop! Off it goes!', '#ffffff', 17); Sfx.play('canoeClunk', id);
      if (best.jam.pieces.every(p => p.gone || p.x1 < canoeCX(st, best.d) - canoeHW(st, best.d) || p.x0 > canoeCX(st, best.d) + canoeHW(st, best.d))) Sfx.play('canoeCheer');
    } else { canoePop(st, (pc.x0 + pc.x1) / 2, best.d + 30, 'Once more!', '#ffe7a8', 16); Sfx.play('canoeThud'); }
  } else if (best.kind === 'fruit') {
    canoeGetFruit(st, best.ref, id);
  } else if (best.kind === 'boulder') {
    cn.vx -= side * 120; cn.bonkT = Math.max(cn.bonkT, 0.15);
    canoePop(st, best.x, best.d + 30, 'Shove!', '#ffffff', 16); Sfx.play('canoeThud');
  }
  for (let i = 0; i < 6; i++) canoePart(st, best.x, best.d, (Math.random() - 0.5) * 140, (Math.random() - 0.5) * 140, 0.5, 'rgba(255,255,255,0.9)', 3, 0, 'drop');
}
function canoeOarGold(st) {
  st.oarGold = true; st.stats.helps++;
  canoeMsg(st, 'Gold oar! ' + NAMES[st.bailer] + "'s oar reaches further, and a gold arrow shows what to poke", C.gold, 4);
  Sfx.play('canoeHelp');
}

/* ---------- moving things: rolling rocks, drifting logs, loose branches, flying fruit ---------- */
function canoeWorld(st, dt) {
  const c = st.c;
  for (const r of c.rocks) if (r.kind === 'wobble' && r.gone && r.vx) {
    r.x += r.vx * dt; r.rot += r.vx * dt / r.r; r.vx *= Math.exp(-2.5 * dt);
    const off = r.x - canoeCX(st, r.d), lim = canoeHW(st, r.d) + 6;
    if (Math.abs(off) > lim) { r.x = canoeCX(st, r.d) + Math.sign(off) * lim; r.vx = 0; }
    if (Math.abs(r.vx) < 8) r.vx = 0;
  }
  for (const lg of c.logs) {
    if (lg.gone) {
      lg.out = Math.min(1, lg.out + dt * 1.5);
      lg.a = canoeLerp(lg.a, 0, dt * 4); lg.x += lg.outDir * 180 * (1 - lg.out) * dt;
      const off = lg.x - canoeCX(st, lg.d), lim = canoeHW(st, lg.d) + 4;
      if (Math.abs(off) > lim) lg.x = canoeCX(st, lg.d) + Math.sign(off) * lim;
      continue;
    }
    if (!lg.vx) continue;
    lg.x += lg.vx * dt;
    const reachX = Math.abs(Math.sin(lg.a)) * lg.len / 2 + 6, off = lg.x - canoeCX(st, lg.d), lim = canoeHW(st, lg.d) - reachX;
    if (Math.abs(off) > lim) { lg.x = canoeCX(st, lg.d) + Math.sign(off) * lim; lg.vx = -Math.sign(off) * Math.abs(lg.vx); }
  }
  for (const jm of c.jams) for (const pc of jm.pieces) {
    if (pc.wob > 0) pc.wob = Math.max(0, pc.wob - dt * 3);
    if (pc.gone && pc.out < 1) pc.out = Math.min(1, pc.out + dt * 1.2);
  }
  for (const f of c.fruit) if (f.fly > 0) f.fly = Math.max(0, f.fly - dt * 2.2);
}

/* ---------- swamped, the waterfall, the calm pool and the party ---------- */
function canoeStartSwamp(st) {
  const cn = st.cn;
  cn.state = 'swamp'; cn.t = 0; cn.v = 0; cn.vx = 0; cn.beached = null;
  const side = cn.x >= canoeCX(st, cn.d) ? 1 : -1;
  cn.swamp = { t: 0, side, x0: cn.x, d0: cn.d, flipped: false };
  st.stats.swamps++;
  if (canoeBoth(st)) st.roomSwamps++;
  canoePop(st, cn.x, cn.d + 90, 'Glug! Swamped!', '#ffffff', 26);
  Sfx.play('canoeGlug'); rumble(0, 0.3, 0.5, 220); rumble(1, 0.3, 0.5, 220);
}
function canoeSwampStep(st, dt) {
  const P = CANOE, cn = st.cn, sw = cn.swamp;
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
  sw.t += dt;
  if (sw.t > 1.5 && !sw.flipped) {
    sw.flipped = true; cn.water = 0; Sfx.play('canoeTip');
    canoePop(st, cn.x, cn.d + 90, 'Cappy tips it out!', C.gold, 18);
    for (let i = 0; i < 18; i++) canoePart(st, cn.x + (Math.random() - 0.5) * 40, cn.d + (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 220, (Math.random() - 0.5) * 220, 0.7, i % 2 ? '#bff0ff' : '#ffffff', 3 + Math.random() * 3, 0, 'drop');
  }
  if (sw.t >= P.swampT) {
    // back to the last flag
    cn.state = 'go'; cn.d = st.cp.d; cn.x = canoeCX(st, cn.d); cn.v = 0; cn.vx = 0; cn.boost = 0; cn.water = 0; cn.dip = 1; cn.atJam = null;
    cn.swamp = null; cn.bonkT = 0.4;
    canoePop(st, cn.x, cn.d + 80, 'Off you go again!', '#ffffff', 18);
    const want = st.roomSwamps >= P.calmHelp ? 2 : st.roomSwamps >= P.swampHelp ? 1 : 0;
    if (want >= 1 && !st.bucketGold) { st.bucketGold = true; st.stats.helps++; canoeMsg(st, 'Gold bucket! Big scoops come sooner and bail more', C.gold, 3.8); Sfx.play('canoeHelp'); }
    else if (want >= 2 && !st.calmGold) { st.calmGold = true; st.stats.helps++; canoeMsg(st, 'Calm water! Only half as much water splashes in', C.gold, 3.8); Sfx.play('canoeHelp'); }
    canoeHint(st, st.bailer, 'Bail when the bucket is gold! ' + canoeKey(st.bailer, 'act'), 3);
  }
}
function canoeStartDrop(st) {
  const cn = st.cn;
  cn.state = 'drop'; cn.t = 0;
  cn.drop = { t: 0, d0: cn.d, x0: cn.x, d1: st.c.lip.d + CANOE.dropLen + 40, x1: canoeCX(st, st.c.lip.d + CANOE.dropLen + 40), splashed: false };
  cn.beached = null; cn.atJam = null;
  canoePop(st, cn.x, cn.d + 100, 'WHOOOSH!', '#ffffff', 30);
  Sfx.play('canoeWhoosh'); rumble(0, 0.4, 0.6, 400); rumble(1, 0.4, 0.6, 400);
}
function canoeDropStep(st, dt) {
  const P = CANOE, cn = st.cn, dr = cn.drop;
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
  dr.t += dt;
  const u = canoeSmooth(dr.t / P.dropT);
  cn.d = canoeLerp(dr.d0, dr.d1, u); cn.x = canoeLerp(dr.x0, dr.x1, u);
  cn.dip = Math.min(1, cn.dip + dt / P.dipT);
  if (dr.t >= P.dropT && !dr.splashed) {
    dr.splashed = true;
    cn.state = 'go'; cn.v = 60; cn.vx = 0; cn.boost = 0; st.cp = { d: cn.d }; cn.drop = null;
    canoeAddWater(st, P.dropWater * (st.calmGold ? 0.6 : 1), true);
    for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2; canoePart(st, cn.x + Math.cos(a) * 40, cn.d + Math.sin(a) * 60, Math.cos(a) * 220, Math.sin(a) * 220, 0.8, i % 2 ? '#ffffff' : '#bff0ff', 4 + Math.random() * 4, 0, 'drop'); }
    canoePop(st, cn.x, cn.d + 90, 'SPLASH! Bail it out!', '#ffffff', 26);
    Sfx.play('canoeBigSplash');
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.3);
    if (cn.water >= 100) cn.water = 99;
  }
}
function canoeStartSwap(st) {
  const cn = st.cn, pl = st.c.pool;
  cn.state = 'swap'; cn.t = 0;
  st.stats.roomT[st.k] = G.time - st.segStart;
  cn.swap = { t: 0, d0: cn.d, x0: cn.x, d1: pl.d + 180, x1: canoeCX(st, pl.d + 180), said: false };
  canoePop(st, cn.x, pl.d + 260, 'Calm pool! Swap jobs!', C.gold, 28);
  Sfx.play('canoeSwap'); rumble(0, 0.1, 0.4, 120); rumble(1, 0.1, 0.4, 120);
}
function canoeSwapStep(st, dt) {
  const P = CANOE, cn = st.cn, sw = cn.swap;
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
  sw.t += dt;
  const u = canoeSmooth(sw.t / 1.0);
  cn.d = canoeLerp(sw.d0, sw.d1, u); cn.x = canoeLerp(sw.x0, sw.x1, u); cn.heading *= Math.exp(-dt * 4);
  cn.water = Math.max(0, cn.water - dt * 30);
  if (sw.t > 1.1 && !sw.said) { sw.said = true; Sfx.play('canoeHop', 0); Sfx.play('canoeHop', 1); }
  if (sw.t >= P.swapT) {
    const L = G.level;
    if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return true; }
    canoeClear(st); return true;
  }
  return false;
}
function canoeStartFin(st) {
  const cn = st.cn, fn = st.c.finish;
  cn.state = 'fin'; cn.t = 0;
  st.stats.roomT[st.k] = G.time - st.segStart;
  cn.fin = { t: 0, d0: cn.d, x0: cn.x, d1: fn.d + 200, x1: canoeCX(st, fn.d + 200), cleared: false };
  canoePop(st, cn.x, fn.d + 280, 'Jungle Jamboree!', C.gold, 30);
  Sfx.play('canoeCheer'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
}
function canoeFinStep(st, dt) {
  const P = CANOE, cn = st.cn, fn = cn.fin;
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
  fn.t += dt;
  const u = canoeSmooth(fn.t / 1.3);
  cn.d = canoeLerp(fn.d0, fn.d1, u); cn.x = canoeLerp(fn.x0, fn.x1, u); cn.heading *= Math.exp(-dt * 4);
  cn.water = Math.max(0, cn.water - dt * 40);
  if (fn.t > 1.3 && !fn.party) {
    fn.party = true; Sfx.play('canoeParty');
    canoePop(st, cn.x, cn.d + 150, 'Hooray! You made it!', '#ffd75e', 26);
    for (let i = 0; i < 70; i++) confetti(cn.x, canoeCY() - 120);
  }
  if (fn.t >= P.finT && !fn.cleared) { fn.cleared = true; canoeClear(st); return true; }
  return false;
}
function canoeClear(st) {
  G.level.goal = { x: st.cn.x, y: canoeCY() - 60 };
  levelClear();
}

/* ---------- what each job needs right now (the prompts, the panels and the computer read this) ---------- */
// the paddler's best line: the offset from the river's middle that bumps into the least in the next 420 px
function canoePlan(st) {
  if (st.planTick === G.tickN && st.plan) return st.plan;
  const P = CANOE, cn = st.cn, c = st.c, d0 = cn.d;
  const objs = [];
  for (const r of c.rocks) if (!r.gone && r.d > d0 - 50 && r.d < d0 + 470) objs.push({ x: r.x, d: r.d, r: r.r + P.beam + 8, rd: r.r + 46, w: r.kind === 'boulder' ? 70 : 30 });
  for (const lg of c.logs) if (!lg.gone && Math.abs(lg.d - d0 - 200) < 320) for (let i = 0; i <= 4; i++) { const u = i / 4 - 0.5; objs.push({ x: lg.x + Math.sin(lg.a) * lg.len * u + lg.vx * 0.6, d: lg.d + Math.cos(lg.a) * lg.len * u, r: 9 + P.beam + 8, rd: 9 + 46, w: 40 }); }
  for (const is of c.islands) if (is.d + is.rl > d0 - 50 && is.d - is.rl < d0 + 470) objs.push({ island: is, w: 120 });
  for (const jm of c.jams) if (jm.d > d0 - 20 && jm.d < d0 + 470) for (const pc of jm.pieces) if (!pc.gone) objs.push({ piece: pc, d: jm.d, w: 9 });
  const fr = c.fruit.filter(f => !f.got && f.d > d0 + 30 && f.d < d0 + 470);
  const curOff = cn.x - canoeCX(st, d0 + 60), prev = st.plan ? st.plan.off : curOff;
  let best = null;
  const hwMin = Math.min(canoeHW(st, d0 + 60), canoeHW(st, d0 + 200));
  for (let o = -hwMin + 26; o <= hwMin - 26; o += 10) {
    let cost = Math.abs(o - curOff) * 0.035 + Math.abs(o - prev) * 0.02 + Math.abs(o) * 0.004;
    for (let dd = d0 - 20; dd <= d0 + 450; dd += 20) {
      // (the canoe slides over to the line over the first 160 px, so the way there counts too)
      const x = canoeLerp(cn.x, canoeCX(st, dd) + o, clamp((dd - d0 + 20) / 180, 0, 1)), wt = 1 + (450 - (dd - d0)) / 160;
      if (Math.abs(x - canoeCX(st, dd)) + P.beam + 12 > canoeHW(st, dd)) cost += 6 * wt;
      for (const ob of objs) {
        if (ob.island) {
          const is = ob.island, u = (x - is.x) / (is.rw + P.beam + 14), w = (dd - is.d) / (is.rl + 30);
          if (u * u + w * w < 1) cost += 12 * wt;
        } else if (ob.piece) {
          if (Math.abs(dd - ob.d) < 11 && ob.piece.x1 > x - P.beam - 4 && ob.piece.x0 < x + P.beam + 4) cost += ob.w * wt;
        } else if (Math.abs(dd - ob.d) < ob.rd && Math.abs(x - ob.x) < ob.r) cost += (ob.w / 10) * wt;
      }
    }
    for (const f of fr) if (Math.abs(canoeCX(st, f.d) + o - f.x) < 24) cost -= 14;
    if (!best || cost < best.cost) best = { off: o, cost };
  }
  if (!best) best = { off: 0, cost: 0 };
  st.plan = best; st.planTick = G.tickN;
  return best;
}
function canoeNeeds(st) {
  if (st.needT === G.tickN && st.need) return st.need;
  const P = CANOE, cn = st.cn, c = st.c;
  const out = { laneOff: 0, laneX: cn.x, poke: null, jam: null, rapidsAhead: false, beached: cn.beached };
  if (cn.state !== 'go') { st.need = out; st.needT = G.tickN; return out; }
  const pl = canoePlan(st);
  out.laneOff = pl.off; out.laneX = canoeCX(st, cn.d + 110) + pl.off;
  out.jam = c.jams.find(j => j.d > cn.d && j.d < cn.d + 300 && j.pieces.some(pc => !pc.gone && pc.x1 > cn.x - P.beam - 30 && pc.x0 < cn.x + P.beam + 30)) || null;
  out.rapidsAhead = c.rapids.some(r => r.d1 > cn.d && r.d0 < cn.d + 260);
  // the oar's job: the nearest thing in the canoe's way that the oar can move, else fruit off to the side
  const laneAt = d => canoeCX(st, d) + pl.off;
  let tgt = null, tgD = 1e9;
  const reach = canoeReach(st);
  for (const o of canoePokeables(st)) {
    if (o.kind === 'boulder') continue;
    let inWay = false;
    if (o.kind === 'wobble') inWay = Math.abs(o.x - laneAt(o.d)) < o.r + P.beam + 8 || Math.abs(o.x - cn.x) < o.r + P.beam + 6;
    else if (o.kind === 'log') {
      const lg = o.ref;
      for (let i = 0; i <= 6 && !inWay; i++) { const u = i / 6 - 0.5, x = lg.x + Math.sin(lg.a) * lg.len * u, d = lg.d + Math.cos(lg.a) * lg.len * u; if (Math.abs(x - laneAt(d)) < P.beam + 16 || Math.abs(x - cn.x) < P.beam + 12) inWay = true; }
    } else if (o.kind === 'piece') {
      const pc = o.ref, gapHere = !o.jam.pieces.some(q => !q.gone && q.x1 > laneAt(o.d) - P.beam - 2 && q.x0 < laneAt(o.d) + P.beam + 2);
      const onCanoe = pc.x1 > cn.x - P.beam - 4 && pc.x0 < cn.x + P.beam + 4, onLane = pc.x1 > laneAt(o.d) - P.beam - 4 && pc.x0 < laneAt(o.d) + P.beam + 4;
      // (at the jam: only what is in front of the canoe, because the oar can't reach a branch off to the side from
      // there; on the way: what is on the line unless it has a gap)
      inWay = cn.atJam === o.jam ? onCanoe : !gapHere && (onLane || onCanoe);
    }
    if (!inWay) continue;
    const dd = o.d - cn.d;
    if (dd < tgD) { tgD = dd; tgt = o; }
  }
  if (!tgt) {
    for (const o of canoePokeables(st)) {
      if (o.kind !== 'fruit' || Math.abs(o.x - laneAt(o.d)) < 26) continue;
      const dd = Math.hypot(o.x - cn.x, o.d - cn.d - P.pivot);
      if (dd < reach + 12 && dd < tgD) { tgD = dd; tgt = o; }
    }
  }
  if (tgt) {
    // the notch whose oar line comes closest
    let bn = 0, bdist = 1e9;
    for (let n = -2; n <= 2; n++) { const dd = canoeObjDist(canoeOarSeg(st, n, reach), tgt) + Math.abs(n - cn.aim) * 0.5; if (dd < bdist) { bdist = dd; bn = n; } }
    const exact = canoeObjDist(canoeOarSeg(st, bn, reach), tgt);
    out.poke = { kind: tgt.kind, ref: tgt.ref, x: tgt.x, d: tgt.d, notch: bn, reachable: exact < 4, aimed: bn === cn.aim, far: tgt.d - cn.d };
  }
  st.need = out; st.needT = G.tickN;
  return out;
}

/* ---------- prompts and hints ---------- */
function canoeHint(st, id, text, life) { if (canoeQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || CANOE.hintLife }; }
function canoeHintOnce(st, key, id, text) { if (st.hinted[key]) return; st.hinted[key] = true; canoeHint(st, id, text); }
function canoeMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
// a word popping up at a spot on the river (x, d)
function canoePop(st, x, d, s, col, size) {
  for (let k = 0; k < 4; k++) { const o = st.pops.find(q => q.t < 0.7 && Math.abs(q.x - x) < 120 && Math.abs(q.d - d) < 24); if (!o) break; d = o.d + 26; }
  st.pops.push({ x, d, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 12) st.pops.shift();
}
function canoePart(st, x, d, vx, vd, life, col, size, grav, kind) {
  if (st.parts.length > 300) st.parts.shift();
  // (vd: px/s up the screen, i.e. down the river)
  st.parts.push({ x, d, vx, vd, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
// gentle lessons when they first matter (once each stretch)
function canoeNudges(st) {
  const cn = st.cn, nd = canoeNeeds(st);
  if (nd.poke && nd.poke.far < 200 && nd.poke.kind !== 'fruit') canoeHintOnce(st, 'poke' + st.k, st.bailer, (nd.poke.aimed ? 'Poke it! ' + canoeKey(st.bailer, 'poke') : 'Aim ' + canoeKey(st.bailer, 'lr') + ' and poke ' + canoeKey(st.bailer, 'poke')));
  if (cn.water > 55) canoeHintOnce(st, 'water' + st.k, st.bailer, 'Lots of water! Scoop it out ' + canoeKey(st.bailer, 'act'));
  if (cn.t > 7 && st.stats.swish[st.paddler] === 0 && cn.v < 60) canoeHintOnce(st, 'swish' + st.k, st.paddler, canoeKey(st.paddler, 'left') + ' then ' + canoeKey(st.paddler, 'right') + ', in turn: Swish! Swish!');
}
// the touch buttons and the top-bar legend name each player's own action this stretch: paddle or bail
let canoeLabelEls = null;
function canoeActLabels(st) {
  try {
    if (!canoeLabelEls || !canoeLabelEls.every(o => document.contains(o.el))) canoeLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const ds = box && (box.dataset.p !== undefined ? box.dataset.p : box.dataset.legp);
      const id = ds !== undefined && ds !== null ? +ds : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of canoeLabelEls) {
      const want = o.id < 0 ? 'paddle/bail' : o.id === st.paddler ? 'paddle' : 'bail';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}
function canoeFx(st, dt) {
  const cn = st.cn;
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vd -= q.grav * dt; q.x += q.vx * dt; q.d += q.vd * dt; q.r += dt * 5;
    if (q.kind === 'drop' || q.kind === 'puff') { q.vx *= 1 - dt * 2.5; q.vd *= 1 - dt * 2.5; }
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.2);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  if (st.sign && (st.sign.t += dt) >= st.sign.life) st.sign = null;
  if (cn.strokeA > 0) cn.strokeA = Math.max(0, cn.strokeA - dt * 3);
  if (cn.scoopA > 0) cn.scoopA = Math.max(0, cn.scoopA - dt * 3);
  if (cn.slosh > 0) cn.slosh = Math.max(0, cn.slosh - dt * 2);
  cn.bob += dt;
  // a wake behind the canoe while it moves
  if (cn.state === 'go' && cn.v > 50 && Math.random() < dt * 14) {
    const s = Math.random() < 0.5 ? -1 : 1;
    canoePart(st, cn.x + s * 12, cn.d - 50, s * 30, -cn.v * 0.2, 0.8, 'rgba(255,255,255,0.55)', 3 + Math.random() * 2, 0, 'wake');
  }
}
// copy the seats into the engine players (screen px): name tags and bubbles read p.x / p.y
function canoeMirror(st) {
  const P = CANOE, cn = st.cn, ps = G.players, sy = canoeSY(st, cn.d);
  const seat = id => (id === st.bailer ? P.bowSeat : P.sternSeat);
  for (const p of ps) {
    const s = seat(p.id);
    p.x = cn.x - Math.sin(cn.heading) * s - PW / 2; p.y = sy + s + 6 - PH;
    p.alive = true; p.grounded = true; p.stompSafe = 0; p.vy = 0; p.face = 1; p.vx = 0; p.stun = 0;
  }
}

MODES.canoe = {
  CANOE,
  // the medal (js/medals.js): Gold (by 3:50) also needs 60% of the fruit and at most 1 swamp; Silver (by 5:00) 35% and at most 4
  // (computer pairs clear in about 3:30 with 16-19 of 26 fruit; scripted kid pairs in about 4:00 with 15-17; a random
  // button-masher with the computer takes 5:00-5:45, so it gets Bronze)
  medals: { bronze: 'Paddle all four stretches', goals: [{ key: 'time', gold: 230, silver: 300 },
    { key: 'fruit', gold: 0.6, silver: 0.35, more: true, pct: true, word: 'the fruit' }, { key: 'swamps', gold: 1, silver: 4, word: 'swamp', text: n => (n === 1 ? 'At most 1 swamp' : `${n} or fewer swamps`) }] },
  medalValues() { const s = G.mst.stats; return s ? { fruit: s.fruitAll ? s.fruit / s.fruitAll : 1, swamps: s.swamps } : {}; },
  needs: canoeNeeds, plan: canoePlan, cx: canoeCX, hw: canoeHW, cur: canoeCur, reach: canoeReach, goldAt: canoeGoldAt, oarSeg: canoeOarSeg,
  setup(st, L) {
    // how much fruit floats down all four stretches (for the medal)
    let fruitAll = 0;
    const rooms = (LEVELS[G.levelIndex] && LEVELS[G.levelIndex].rooms) || [L.def];
    for (const r of rooms) for (const tk of r.course || []) { const t = String(tk); if (t[0] === 'm' && t[1] === ':') fruitAll++; }
    st.stats = { fruit: 0, fruitAll, swamps: 0, bonks: 0, beaches: 0, swish: [0, 0], strokes: [0, 0], scoops: [0, 0], bails: [0, 0], pokes: [0, 0], helps: 0, roomT: [], roomTitles: [] };
    canoeRoom(st, L, 0);
  },
  room(k, L) { canoeRoom(G.mst, L, k); },
  step(dt) { canoeStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then and drawn in the canoe instead
  draw() {
    const st = G.mst;
    if (!st.cn) return;
    canoeDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.cn) return;
    canoeDrawFront(st);
  },
  hud() { const st = G.mst; if (st.cn) canoeHud(st); },
  stats() {
    const s = G.mst.stats;
    if (!s) return [];
    const out = [
      { label: 'Fruit', value: s.fruit + ' of ' + s.fruitAll },
      { label: 'Swamped', value: s.swamps },
      { label: 'Swish strokes', values: s.swish.slice() },
    ];
    let best = -1;
    s.roomT.forEach((t, k) => { if (t == null) return; if (best < 0 || t < s.roomT[best]) best = k; });
    const words = s.swamps === 0 ? 'Not one swamp: a dry canoe all the way!' : s.swamps <= 2 ? 'A splashy ride, and Cappy only had to help a little!' : 'Cappy the capybara was a busy helper today!';
    out.push(words + (best >= 0 ? ' Quickest stretch: ' + s.roomTitles[best] + '.' : '') + ' Big scoops: Pip ' + s.scoops[0] + ', Bo ' + s.scoops[1] + '. Pokes: Pip ' + s.pokes[0] + ', Bo ' + s.pokes[1] + '.');
    if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
    return out;
  },
};

/* ---------- drawing ---------- */
function canoeDrawWorld(st) {
  canoeDrawRiver(st);
  canoeDrawRapids(st);
  canoeDrawPools(st);
  canoeDrawLip(st);
  canoeDrawIslands(st);
  canoeDrawFlags(st);
  canoeDrawGaps(st);
  canoeDrawRocks(st);
  canoeDrawLogs(st);
  canoeDrawJams(st);
  canoeDrawFruit(st);
  canoeDrawBankLife(st);
}
function canoeDrawFront(st) {
  const cn = st.cn;
  canoeDrawAimLine(st);
  canoeDrawCanoe(st);
  if (cn.swamp) canoeDrawCappy(st);
  canoeDrawCanopy(st);
  for (const q of st.parts) {
    const a = clamp(q.life / q.max, 0, 1), x = q.x, y = canoeSY(st, q.d);
    if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
    ctx.globalAlpha = q.kind === 'wake' ? a * 0.6 : a; ctx.fillStyle = q.col;
    if (q.kind === 'spark') { canoeStar(x, y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
    else if (q.kind === 'conf') { ctx.save(); ctx.translate(x, y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
    else { circle(x, y, q.size * (q.kind === 'wake' ? 1.6 - 0.6 * a : 0.6 + 0.4 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  for (const q of st.pops) {
    const a = clamp(1.2 - q.t, 0, 1), x = clamp(q.x, 60, W - 60), y = canoeSY(st, q.d) - q.t * 30;
    if (y < -20 || y > H + 20) continue;
    ctx.globalAlpha = a;
    ctx.font = q.size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, q.size * 0.2); ctx.strokeStyle = 'rgba(28,26,54,0.85)'; ctx.strokeText(q.s, x, y);
    ctx.fillStyle = q.col; ctx.fillText(q.s, x, y);
  }
  ctx.globalAlpha = 1;
  // swamped: a soft fade while Cappy carries the canoe back to the flag
  if (cn.swamp && cn.swamp.t > CANOE.swampT - 0.7) {
    ctx.fillStyle = 'rgba(230,255,240,' + clamp(1 - Math.abs(cn.swamp.t - (CANOE.swampT - 0.35)) / 0.35, 0, 1) * 0.85 + ')'; ctx.fillRect(0, 0, W, H);
  }
}
function canoeStar(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
// the river: jungle banks, sandy edges, the water and its ripples
function canoeDrawRiver(st) {
  const pal = st.pal, step = 8;
  ctx.fillStyle = pal.bank; ctx.fillRect(0, 0, W, H);
  // darker leafy dapples on the banks
  const d0 = canoeSD(st, H + 40), d1 = canoeSD(st, -40);
  ctx.fillStyle = pal.bankDark;
  for (let k = Math.floor(d0 / 90); k <= Math.ceil(d1 / 90); k++) for (let j = 0; j < 3; j++) {
    const h = hash(k, j + 31), y = canoeSY(st, k * 90 + (h % 90)), x = (h >> 8) % W;
    ctx.beginPath(); ctx.ellipse(x, y, 30 + (h >> 4) % 30, 14 + (h >> 6) % 10, 0, 0, Math.PI * 2); ctx.fill();
  }
  canoeDrawGrass(st, d0, d1);
  const L = [], R = [];
  for (let y = -16; y <= H + 16; y += step) { const d = canoeSD(st, y), cx = canoeCX(st, d), hw = canoeHW(st, d); L.push([cx - hw, y]); R.push([cx + hw, y]); }
  // sand and mud edges
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const [col, lw] of [[pal.mud, 34], [pal.sand, 22]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    for (const side of [L, R]) { ctx.beginPath(); side.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
  }
  // the water
  ctx.beginPath();
  L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, pal.deep); g.addColorStop(0.5, pal.water); g.addColorStop(1, pal.deep);
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  // the banks' shadow on the water, then the bright shallow edge
  for (const [lw, al] of [[56, 0.06], [36, 0.06], [20, 0.06]]) {
    ctx.strokeStyle = 'rgba(10,50,60,' + al + ')'; ctx.lineWidth = lw;
    for (const side of [L, R]) { ctx.beginPath(); side.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 10;
  for (const side of [L, R]) { ctx.beginPath(); side.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
  // soft patches of sunlight dancing on the water and pebbles on the bottom near the edges
  {
    const fl = 46 * G.clock, cl = 120;
    const a0 = Math.floor((canoeSD(st, H + 60) - fl) / cl), a1 = Math.ceil((canoeSD(st, -60) - fl) / cl);
    for (let k = a0; k <= a1; k++) {
      const h = hash(k, 401), d = k * cl + fl + (h % cl), y = canoeSY(st, d), cx = canoeCX(st, d), hw = canoeHW(st, d);
      const x = cx + (((h >> 5) % 1000) / 1000 - 0.5) * 1.4 * hw;
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.ellipse(x, y, 34 + (h >> 11) % 24, 9, 0, 0, Math.PI * 2); ctx.fill();
      const tw = reduceMotion ? 0.6 : 0.5 + 0.5 * Math.sin(G.clock * 4 + k);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * tw) + ')'; ctx.fillRect(x + 14, y - 3, 7, 1.6); ctx.fillRect(x + 16.7, y - 5.5, 1.6, 6.6);
    }
  }
  // ripples drift down the river with the current
  const flow = 46 * G.clock, cell = 64;
  ctx.strokeStyle = pal.ripple; ctx.lineWidth = 2.2;
  const k0 = Math.floor((canoeSD(st, H + 30) - flow) / cell), k1 = Math.ceil((canoeSD(st, -30) - flow) / cell);
  for (let k = k0; k <= k1; k++) for (let j = 0; j < 3; j++) {
    const h = hash(k, j + 7), d = k * cell + flow + (h % cell), y = canoeSY(st, d), cx = canoeCX(st, d), hw = canoeHW(st, d);
    const x = cx + (((h >> 6) % 1000) / 1000 - 0.5) * 1.7 * hw, w = 10 + (h >> 12) % 14;
    ctx.beginPath(); ctx.moveTo(x - w, y + 3); ctx.quadraticCurveTo(x, y - 3, x + w, y + 3); ctx.stroke();
  }
  // lily pads near the banks
  for (let k = Math.floor(d0 / 150); k <= Math.ceil(d1 / 150); k++) {
    const h = hash(k, 77); if (h % 3) continue;
    const d = k * 150 + (h >> 4) % 150, side = h & 64 ? 1 : -1, x = canoeCX(st, d) + side * (canoeHW(st, d) - 16 - (h >> 9) % 12), y = canoeSY(st, d);
    canoeLily(x, y, 9 + (h >> 13) % 5, (h >> 3) % 6, (h & 128) !== 0);
  }
  ctx.restore();
}
// (art director pass, Nov 2026) the grassy banks were one flat green with a few dark ovals: now each dapple has a
// sunny rim, and the grass between has tufts of two-tone blades, clover, tiny flowers and the odd pebble, placed by
// hash() on a grid that scrolls with the river. The grass is still, so it is painted once per band of 136 px of river
// (at the canvas's pixel scale) into a small cache of pictures and copied on whole pixels; the water covers the middle.
const CANOE_GBAND = 136, CANOE_GPAD = 14, canoeGrassPics = new Map();
let canoeGrassSc = 0;
function canoeDrawGrass(st, d0, d1) {
  const pal = st.pal;
  // dapple rims (live: they follow the dapples drawn just before)
  for (let k = Math.floor(d0 / 90); k <= Math.ceil(d1 / 90); k++) for (let j = 0; j < 3; j++) {
    const h = hash(k, j + 31), y = canoeSY(st, k * 90 + (h % 90)), x = (h >> 8) % W, rx = 30 + (h >> 4) % 30, ry = 14 + (h >> 6) % 10;
    ctx.strokeStyle = 'rgba(255,255,220,0.16)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
    ctx.fillStyle = 'rgba(20,60,30,0.14)'; ctx.beginPath(); ctx.ellipse(x + rx * 0.12, y + ry * 0.15, rx * 0.62, ry * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  }
  const sc = Math.max(1, Math.min(3, canvas.width / W));
  if (sc !== canoeGrassSc) { canoeGrassPics.clear(); canoeGrassSc = sc; }
  const m = ctx.getTransform(), plain = m.b === 0 && m.c === 0 && Math.abs(m.a - sc) < 1e-6 && Math.abs(m.d - sc) < 1e-6;
  for (let b = Math.floor((d0 - CANOE_GPAD) / CANOE_GBAND); b <= Math.floor((d1 + CANOE_GPAD) / CANOE_GBAND); b++) {
    const key = pal.bank + '|' + b;
    let pic = canoeGrassPics.get(key);
    if (pic) { canoeGrassPics.delete(key); canoeGrassPics.set(key, pic); }
    else {
      if (canoeGrassPics.size >= 12) canoeGrassPics.delete(canoeGrassPics.keys().next().value);
      pic = document.createElement('canvas'); pic.width = Math.ceil(W * sc); pic.height = Math.ceil((CANOE_GBAND + 2 * CANOE_GPAD) * sc);
      const c = pic.getContext('2d'); c.scale(sc, sc);
      const top = (b + 1) * CANOE_GBAND + CANOE_GPAD;
      CK.on(c, () => canoeGrassPaint(pal, b, d => top - d));
      canoeGrassPics.set(key, pic);
    }
    const yTop = canoeSY(st, (b + 1) * CANOE_GBAND + CANOE_GPAD);
    if (plain) {
      const sm = ctx.imageSmoothingEnabled;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(pic, Math.round(m.e), Math.round(m.d * yTop + m.f));
      ctx.setTransform(m); ctx.imageSmoothingEnabled = sm;
    } else ctx.drawImage(pic, 0, yTop, W, CANOE_GBAND + 2 * CANOE_GPAD);
  }
}
// the grass detail of one band of river (cells of 34 px; 4 cells to a band), at y = yOf(d)
function canoeGrassPaint(pal, b, yOf) {
  const cell = 34, lit = tint(pal.bank, 0.22), dk = shade(pal.bankDark, 0.12), mid = shade(pal.bank, 0.1), nx = Math.ceil(W / cell);
  const tufts = [], lits = [], clovers = [], flowers = [], pebs = [];
  for (let k = b * 4; k < b * 4 + 4; k++) for (let j = 0; j <= nx; j++) {
    const h = hash(k * 131 + j, 913), r = h % 100;
    const x = j * cell + ((h >> 7) % cell), y = yOf(k * cell + ((h >> 13) % cell));
    if (r < 58) tufts.push(x, y, h); else if (r < 70) clovers.push(x, y, h); else if (r < 74) flowers.push(x, y, h); else if (r < 78) pebs.push(x, y, h);
    if (r % 3 === 0) lits.push(x + 9, y + 7, h);
  }
  ctx.lineCap = 'round';
  // tufts: three dark blades fanning up, then lit blades on their sunny side
  ctx.strokeStyle = dk; ctx.lineWidth = 1.6; ctx.beginPath();
  for (let i = 0; i < tufts.length; i += 3) {
    const x = tufts[i], y = tufts[i + 1], h = tufts[i + 2], s = 0.8 + ((h >> 17) % 5) * 0.1;
    ctx.moveTo(x - 3 * s, y); ctx.lineTo(x - 5 * s, y - 6 * s); ctx.moveTo(x, y); ctx.lineTo(x + 0.5, y - 8 * s); ctx.moveTo(x + 3 * s, y); ctx.lineTo(x + 6 * s, y - 5 * s);
  }
  ctx.stroke();
  ctx.strokeStyle = lit; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i = 0; i < tufts.length; i += 3) { const x = tufts[i], y = tufts[i + 1]; ctx.moveTo(x - 1.5, y); ctx.lineTo(x - 2.5, y - 6); }
  for (let i = 0; i < lits.length; i += 3) { const x = lits[i], y = lits[i + 1]; ctx.moveTo(x, y); ctx.lineTo(x + 1.5, y - 5); ctx.moveTo(x + 2.5, y); ctx.lineTo(x + 4.5, y - 3.5); }
  ctx.stroke();
  // clover: three round leaves and a lit dot
  ctx.fillStyle = mid; ctx.beginPath();
  for (let i = 0; i < clovers.length; i += 3) { const x = clovers[i], y = clovers[i + 1]; for (const a of [-2.3, -0.85, 1.57]) { const cx = x + Math.cos(a) * 2.6, cy = y + Math.sin(a) * 2.6; ctx.moveTo(cx + 2.4, cy); ctx.arc(cx, cy, 2.4, 0, Math.PI * 2); } }
  ctx.fill();
  ctx.fillStyle = lit; ctx.beginPath();
  for (let i = 0; i < clovers.length; i += 3) { const x = clovers[i] - 2, y = clovers[i + 1] - 3; ctx.moveTo(x + 0.9, y); ctx.arc(x, y, 0.9, 0, Math.PI * 2); }
  ctx.fill();
  // tiny flowers: four petals round a yellow eye
  for (let i = 0; i < flowers.length; i += 3) {
    const x = flowers[i], y = flowers[i + 1], h = flowers[i + 2];
    ctx.fillStyle = (h >> 9) % 3 ? '#ffffff' : pal.flower[(h >> 4) % 3];
    ctx.beginPath(); for (let p = 0; p < 4; p++) { const a = p * 1.57 + 0.4, cx = x + Math.cos(a) * 2, cy = y + Math.sin(a) * 2; ctx.moveTo(cx + 1.6, cy); ctx.arc(cx, cy, 1.6, 0, Math.PI * 2); } ctx.fill();
    ctx.fillStyle = '#ffc93d'; circle(x, y, 1); ctx.fill();
  }
  // pebbles in the grass: a soft shadow, a shaded stone and a lit dot
  for (let i = 0; i < pebs.length; i += 3) {
    const x = pebs[i], y = pebs[i + 1], r = 2.2 + ((pebs[i + 2] >> 5) % 3) * 0.6;
    ctx.fillStyle = 'rgba(20,60,30,0.22)'; ctx.beginPath(); ctx.ellipse(x + 1, y + r * 0.7, r * 1.2, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9b958a'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.72, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6f6a62'; ctx.beginPath(); ctx.ellipse(x + r * 0.2, y + r * 0.25, r * 0.8, r * 0.45, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x - r * 0.5, y - r * 0.45, r * 0.6, 0.9);
  }
  ctx.lineCap = 'butt';
}
function canoeLily(x, y, r, rot, flower) {
  ctx.fillStyle = '#5fbf4a'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, rot + 0.35, rot + Math.PI * 2 - 0.35); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,110,40,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(rot + Math.PI) * r * 0.8, y + Math.sin(rot + Math.PI) * r * 0.8); ctx.stroke();
  if (flower) { ctx.fillStyle = '#ffb3d1'; for (let i = 0; i < 5; i++) { const a = i * 1.257; circle(x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4, 2.8); ctx.fill(); } ctx.fillStyle = '#ffe14d'; circle(x, y, 2.2); ctx.fill(); }
}
function canoeDrawRapids(st) {
  const pal = st.pal;
  for (const rp of st.c.rapids) {
    const ya = canoeSY(st, rp.d1), yb = canoeSY(st, rp.d0);
    if (yb < -30 || ya > H + 30) continue;
    // white foam chevrons, rolling along
    for (let d = Math.floor(rp.d0 / 26) * 26; d <= rp.d1; d += 26) {
      if (d < rp.d0) continue;
      const y = canoeSY(st, d); if (y < -20 || y > H + 20) continue;
      const cx = canoeCX(st, d), hw = canoeHW(st, d), n = rp.big ? 6 : 4;
      for (let j = 0; j < n; j++) {
        const h = hash(Math.round(d / 26), j + rp.k * 13), x = cx + (((h % 1000) / 1000) - 0.5) * 1.8 * (hw - 14);
        const wob = Math.sin(G.clock * 6 + h) * 2.5, w = 8 + (h >> 10) % (rp.big ? 12 : 8);
        ctx.strokeStyle = pal.foam; ctx.globalAlpha = 0.55 + 0.35 * Math.sin(G.clock * 4 + j + d * 0.05); ctx.lineWidth = rp.big ? 3.2 : 2.4;
        ctx.beginPath(); ctx.moveTo(x - w, y + 4 + wob); ctx.lineTo(x, y - 3 + wob); ctx.lineTo(x + w, y + 4 + wob); ctx.stroke();
        if (rp.big && j % 2 === 0) { ctx.fillStyle = pal.foam; circle(x + w * 0.6, y - 6 + wob, 2 + (h >> 5) % 3); ctx.fill(); }
      }
    }
    ctx.globalAlpha = 1;
  }
}
function canoeDrawPools(st) {
  const c = st.c;
  for (const pl of [c.pool, c.finish]) {
    if (!pl) continue;
    const y = canoeSY(st, pl.d + 180); if (y < -260 || y > H + 260) continue;
    const x = canoeCX(st, pl.d + 180), fin = pl === c.finish;
    // the calm pool: still water, lily pads, a little wooden dock with a sign
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(x, y, 210, 150, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const r = ((G.clock * 20 + i * 50) % 150); ctx.globalAlpha = 1 - r / 150; ctx.beginPath(); ctx.ellipse(x, y, r * 1.3, r * 0.9, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, rr0 = 150 + (i % 3) * 18; canoeLily(x + Math.cos(a) * rr0 * 1.2, y + Math.sin(a) * rr0 * 0.75, 11, i, i % 2 === 0); }
    // the dock
    const dx = x + 175, dy = y - 30;
    ctx.fillStyle = '#b07a44'; ctx.fillRect(dx - 10, dy - 40, 90, 70);
    ctx.strokeStyle = '#7a5228'; ctx.lineWidth = 2; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(dx - 10 + i * 15, dy - 40); ctx.lineTo(dx - 10 + i * 15, dy + 30); ctx.stroke(); }
    // the sign
    ctx.fillStyle = '#7a5228'; ctx.fillRect(dx + 30, dy - 80, 5, 44);
    ctx.fillStyle = fin ? C.gold : '#e8c27a'; rr(dx - 10, dy - 104, 92, 30, 7); ctx.fill();
    ctx.strokeStyle = '#7a5228'; rr(dx - 10, dy - 104, 92, 30, 7); ctx.stroke();
    text(fin ? 'PARTY!' : 'SWAP', dx + 36, dy - 88.5, 16, '#4a3018', 'center');
    if (fin) canoeDrawParty(st, x, y);
  }
}
// the party at the end: animals dancing round the pool
function canoeDrawParty(st, x, y) {
  const t = G.clock;
  const ring = [['monkey', -170, -110], ['toucan', -60, -170], ['parrot', 60, -170], ['frog', 170, -110], ['capy', -190, 40], ['tapir', 190, 60]];
  for (const [k, ox, oy] of ring) {
    const hop = Math.abs(Math.sin(t * 5 + ox)) * 8;
    canoeAnimal(k, x + ox, y + oy - hop, Math.sign(ox) || 1, t, true);
  }
  // bunting over the pool
  ctx.strokeStyle = '#7a5228'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 220, y - 200); ctx.quadraticCurveTo(x, y - 150, x + 220, y - 200); ctx.stroke();
  for (let i = 0; i < 11; i++) {
    const u = i / 10, bx = canoeLerp(x - 220, x + 220, u), by = (1 - u) * (1 - u) * (y - 200) + 2 * u * (1 - u) * (y - 150) + u * u * (y - 200);
    ctx.fillStyle = ['#ff6b4a', '#ffc53d', '#5b95ff', '#7fd36a', '#ff7aa8'][i % 5];
    ctx.beginPath(); ctx.moveTo(bx - 8, by); ctx.lineTo(bx + 8, by); ctx.lineTo(bx, by + 14); ctx.closePath(); ctx.fill();
  }
}
function canoeDrawLip(st) {
  const lp = st.c.lip;
  if (!lp) return;
  const y0 = canoeSY(st, lp.d), y1 = canoeSY(st, lp.d + CANOE.dropLen);
  if (y0 < -40 || y1 > H + 40) return;
  // the falls: from the lip (y0) the water drops away to the pool below (y1, nearer the top of the screen)
  const cxA = canoeCX(st, lp.d), hwA = canoeHW(st, lp.d), cxB = canoeCX(st, lp.d + CANOE.dropLen), hwB = canoeHW(st, lp.d + CANOE.dropLen);
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.15, '#bfeff7'); g.addColorStop(0.8, '#3d8fa8'); g.addColorStop(1, '#2f7f99');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(cxA - hwA - 30, y0); ctx.lineTo(cxA + hwA + 30, y0); ctx.lineTo(cxB + hwB + 30, y1); ctx.lineTo(cxB - hwB - 30, y1); ctx.closePath(); ctx.fill();
  // rocky sides of the falls
  ctx.fillStyle = '#7d7466';
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(cxA + s * (hwA + 30), y0 + 6); ctx.lineTo(cxA + s * (hwA + 90), y0 + 6); ctx.lineTo(cxB + s * (hwB + 90), y1); ctx.lineTo(cxB + s * (hwB + 30), y1); ctx.closePath(); ctx.fill();
  }
  // falling streaks (they rush toward the pool below)
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
  for (let i = 0; i < 16; i++) {
    const u = ((G.clock * 1.6 + i * 0.37) % 1), x = canoeLerp(cxA - hwA, cxA + hwA, (i + 0.5) / 16), yy = canoeLerp(y0, y1, u);
    ctx.globalAlpha = 0.8 * (1 - u); ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x, yy - 26); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // mist and a rainbow over the pool below
  for (let i = 0; i < 8; i++) { const x = canoeLerp(cxB - hwB, cxB + hwB, i / 7), r = 30 + 10 * Math.sin(G.clock * 2 + i); ctx.fillStyle = 'rgba(255,255,255,0.35)'; circle(x, y1 + 10, r); ctx.fill(); }
  ctx.lineWidth = 7;
  ['#ff6b6b', '#ffb43d', '#ffe14d', '#7fd36a', '#5b95ff', '#b78cff'].forEach((col, i) => {
    ctx.strokeStyle = col; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(cxB, y1 + 60, 150 - i * 7, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  });
  ctx.globalAlpha = 1;
  // the foamy lip itself
  ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.9;
  for (let x = cxA - hwA; x <= cxA + hwA; x += 14) { circle(x, y0 + Math.sin(G.clock * 7 + x) * 2, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
}
function canoeDrawIslands(st) {
  const pal = st.pal, t = G.clock;
  for (const is of st.c.islands) {
    const y = canoeSY(st, is.d);
    if (y < -is.rl - 40 || y > H + is.rl + 40) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(is.x, y, is.rw + 8, is.rl + 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.sand; ctx.beginPath(); ctx.ellipse(is.x, y, is.rw, is.rl, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shade(pal.sand, 0.12); ctx.beginPath(); ctx.ellipse(is.x + 2, y + 3, is.rw - 2, is.rl - 2, 0, 0.2, Math.PI - 0.2); ctx.fill();
    ctx.fillStyle = pal.sand; ctx.beginPath(); ctx.ellipse(is.x - 1, y - 1, is.rw - 3, is.rl - 3, 0, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 8; k++) { const a = k * 0.8 + is.d * 0.01, px = is.x + Math.cos(a) * is.rw * 0.8, py = y + Math.sin(a) * is.rl * 0.8; if (k % 3 === 0) { ctx.fillStyle = '#fff1e0'; ctx.beginPath(); ctx.arc(px, py, 2.4, Math.PI, 0); ctx.fill(); ctx.strokeStyle = '#d9a88a'; ctx.lineWidth = 0.7; ctx.stroke(); } else { ctx.fillStyle = shade(pal.sand, 0.3); circle(px, py, 1.4); ctx.fill(); } }
    ctx.fillStyle = shade(pal.bank, 0.15); ctx.beginPath(); ctx.ellipse(is.x + 1, y + 8, is.rw * 0.62, is.rl * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.bank; ctx.beginPath(); ctx.ellipse(is.x, y + 6, is.rw * 0.62, is.rl * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.bankDark; for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, px = is.x + Math.cos(a) * is.rw * 0.62, py = y + 6 + Math.sin(a) * is.rl * 0.62; ctx.beginPath(); ctx.moveTo(px - 2, py); ctx.lineTo(px + Math.cos(a) * 5, py + Math.sin(a) * 5); ctx.lineTo(px + 2, py); ctx.fill(); }
    // a palm tree seen from above
    const px = is.x + is.rw * 0.2, py = y - is.rl * 0.35;
    for (let i = 0; i < 6; i++) {
      const a = i * 1.047 + 0.3 + Math.sin(t * 1.2 + i) * 0.05;
      ctx.fillStyle = pal.leaf[i % 4]; ctx.beginPath(); ctx.ellipse(px + Math.cos(a) * 18, py + Math.sin(a) * 18, 20, 7, a, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = shade(pal.leaf[i % 4], 0.3); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * 3, py + Math.sin(a) * 3); ctx.lineTo(px + Math.cos(a) * 36, py + Math.sin(a) * 36); ctx.stroke();
      ctx.strokeStyle = shade(pal.leaf[i % 4], 0.18); ctx.lineWidth = 0.8; ctx.beginPath();
      for (let q = 10; q < 34; q += 6) { const bx = px + Math.cos(a) * q, by = py + Math.sin(a) * q; ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a + 1.1) * 5, by + Math.sin(a + 1.1) * 5); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a - 1.1) * 5, by + Math.sin(a - 1.1) * 5); }
      ctx.stroke();
    }
    ctx.fillStyle = pal.trunk; circle(px, py, 5); ctx.fill();
    ctx.strokeStyle = shade(pal.trunk, 0.3); ctx.lineWidth = 0.8; circle(px, py, 3); ctx.stroke();
    ctx.fillStyle = '#6b4a20'; circle(px + 4, py + 4, 2.4); ctx.fill(); circle(px - 3, py + 5, 2.2); ctx.fill();
    if (is.animal) canoeAnimal(is.animal, is.x - is.rw * 0.15, y + is.rl * 0.3, 1, t, false);
  }
}
function canoeDrawFlags(st) {
  for (const fl of st.c.flags) {
    const y = canoeSY(st, fl.d); if (y < -60 || y > H + 40) continue;
    const x = canoeCX(st, fl.d) + canoeHW(st, fl.d) + 10;
    ctx.fillStyle = 'rgba(20,60,30,0.2)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 4, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a5228'; ctx.fillRect(x - 3, y - 40, 6, 44);
    ctx.fillStyle = 'rgba(255,225,180,0.35)'; ctx.fillRect(x - 3, y - 40, 1.5, 44); ctx.fillStyle = '#5a3a18'; ctx.fillRect(x + 1.5, y - 40, 1.5, 44);
    ctx.strokeStyle = '#d9b27a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 3, y - 18); ctx.lineTo(x + 3, y - 15); ctx.moveTo(x - 3, y - 15); ctx.lineTo(x + 3, y - 12); ctx.stroke();
    ctx.fillStyle = fl.on ? C.gold : '#ff6b4a'; ctx.beginPath(); ctx.moveTo(x - 3, y - 40); ctx.lineTo(x - 34, y - 31); ctx.lineTo(x - 3, y - 22); ctx.closePath(); ctx.fill();
    canoeAnimal('parrot', x + 2, y - 44, -1, G.clock, fl.on);
  }
}
function canoeDrawGaps(st) {
  for (const gp of st.c.gaps) {
    const y = canoeSY(st, gp.d); if (y < -60 || y > H + 60) continue;
    ctx.fillStyle = 'rgba(255,197,61,' + (0.25 + 0.15 * Math.sin(G.clock * 5)) + ')';
    rr(gp.x - gp.w / 2 + 14, y - 26, gp.w - 28, 52, 12); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); rr(gp.x - gp.w / 2 + 14, y - 26, gp.w - 28, 52, 12); ctx.stroke(); ctx.setLineDash([]);
    // a gold arrow pointing into the gap
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(gp.x, y - 48); ctx.lineTo(gp.x - 12, y - 32); ctx.lineTo(gp.x + 12, y - 32); ctx.closePath(); ctx.fill();
  }
}
function canoeRock(x, y, r, wob, rot, seed) {
  // (rich props pass, Nov 2026) a foam ring and a wet dark line at the water, then a cached chiselled rock with moss,
  // a wet lower half and pebbles stuck at its foot
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 3, r + 6, r * 0.9 + 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(20,60,70,0.25)'; ctx.beginPath(); ctx.ellipse(x + 1.5, y + 2.5, r * 1.08, r * 0.95, 0, 0, Math.PI * 2); ctx.fill();
  const R0 = Math.round(r), sd = (seed | 0) % 6;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
  CK.pic('cnrock' + R0 + '|' + (wob ? 1 : 0) + '|' + sd, R0 * 2.4 + 8, R0 * 2.2 + 8, R0 * 1.2 + 4, R0 * 1.1 + 4, () => canoeRockPaint(R0, wob, sd), 0, 0);
  ctx.restore();
  if (wob) {
    // a wobbly rock has a sleepy smiley face (and rocks a little)
    ctx.strokeStyle = 'rgba(40,30,30,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x - 4, y + 2, 2, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 4, y + 2, 2, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y + 5, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  }
}
function canoeRockPaint(r, wob, sd) {
  const col = wob ? '#a59a8a' : '#8d8577';
  CK.rock(0, 0, r * 1.05, r * 0.92, col, 400 + sd * 13 + r, { shadow: false, n: 10, j: 0.1, moss: wob ? undefined : '#6eb450' });
  ctx.save(); CK.blob(0, 0, r * 1.05, r * 0.92, 400 + sd * 13 + r, 10, 0.1); ctx.clip();
  ctx.fillStyle = 'rgba(30,60,70,0.22)'; ctx.fillRect(-r * 1.2, r * 0.35, r * 2.4, r);
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-r * 1.2, r * 0.35, r * 2.4, 1);
  if (wob) { ctx.fillStyle = 'rgba(110,180,80,0.7)'; ctx.beginPath(); ctx.ellipse(r * 0.3, -r * 0.55, r * 0.4, r * 0.18, 0.3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  for (let k = 0; k < 3; k++) { const a = 0.6 + k * 0.9 + sd * 0.3; CK.pebble(Math.cos(a) * r * 1.02, Math.sin(a) * r * 0.9, 1.6 + (k % 2), '#9c9486', sd * 5 + k); }
}
function canoeDrawRocks(st) {
  for (const r of st.c.rocks) {
    const y = canoeSY(st, r.d); if (y < -40 || y > H + 40) continue;
    const wob = r.kind === 'wobble';
    canoeRock(r.x, y, r.r, wob, wob ? (r.rot || 0) + Math.sin(G.clock * 3 + r.k) * (r.gone ? 0 : 0.12) : 0, r.k);
  }
}
function canoeLogShape(x, y, len, a, out, k) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-a);   // (a is measured from down the river, which is up the screen)
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; rr(-12, -len / 2 - 4, 24, len + 8, 12); ctx.fill();
  ctx.fillStyle = 'rgba(20,60,70,0.22)'; rr(-8, -len / 2 + 3, 20, len, 9); ctx.fill();
  const L0 = Math.round(len);
  CK.pic('cnlog' + L0 + '|' + (k % 2), 22, L0 + 4, 11, L0 / 2 + 2, () => canoeLogPaint(L0, k % 2), 0, 0);
  ctx.restore();
}
// (rich props pass, Nov 2026) a floating log seen from above: plated bark with grooves, knots, a lit left edge and a
// shaded right edge, a ringed cut end, moss and a dark outline in its own colour
function canoeLogPaint(len, side) {
  const y0 = -len / 2;
  ctx.fillStyle = '#9a6a3c'; rr(-9, y0, 18, len, 9); ctx.fill();
  ctx.save(); rr(-9, y0, 18, len, 9); ctx.clip();
  ctx.fillStyle = '#7a5030'; ctx.fillRect(3, y0, 6, len);
  ctx.fillStyle = 'rgba(255,225,180,0.3)'; ctx.fillRect(-8, y0, 3, len);
  ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) { const gx = -6 + i * 4; ctx.beginPath(); ctx.moveTo(gx, y0 + 8); for (let yy = y0 + 8; yy < len / 2 - 6; yy += 12) ctx.lineTo(gx + (CK.r(i, yy) - 0.5) * 2, yy + 12); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,225,180,0.25)'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-4.5 + i * 4, y0 + 10); ctx.lineTo(-4.5 + i * 4, len / 2 - 10); ctx.stroke(); }
  for (const ky of [-0.15, 0.25]) { ctx.fillStyle = '#5a3a1e'; ctx.beginPath(); ctx.ellipse(-1, ky * len, 3, 4.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#b8875a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(-1, ky * len, 4, 5.5, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
  // the cut end: rings
  ctx.fillStyle = '#d9a86a'; ctx.beginPath(); ctx.ellipse(0, y0 + 2, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b07a44'; ctx.lineWidth = 0.8; for (const rr0 of [2, 4, 6]) { ctx.beginPath(); ctx.ellipse(0, y0 + 2, rr0, rr0 * 0.5, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = '#8a5a2c'; circle(0, y0 + 2, 1); ctx.fill();
  // moss
  const my = (side ? 1 : -1) * len * 0.2;
  ctx.fillStyle = '#4f9e3e'; ctx.beginPath(); ctx.ellipse(4, my + 1, 6.5, 4.5, 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6fbf4a'; ctx.beginPath(); ctx.ellipse(3.5, my, 5.5, 3.5, 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(200,255,160,0.6)'; circle(2, my - 1, 1.2); ctx.fill(); circle(5, my + 1, 0.9); ctx.fill();
  ctx.strokeStyle = '#4a2e14'; ctx.lineWidth = 1.4; rr(-9, y0, 18, len, 9); ctx.stroke();
}
function canoeDrawLogs(st) {
  for (const lg of st.c.logs) {
    const y = canoeSY(st, lg.d); if (y < -lg.len || y > H + lg.len) continue;
    canoeLogShape(lg.x, y, lg.len, lg.a, lg.out, lg.k);
    if (lg.k % 3 === 0 && !lg.gone) canoeAnimal('turtle', lg.x, y, 1, G.clock, false);
  }
}
function canoeDrawJams(st) {
  for (const jm of st.c.jams) {
    const y = canoeSY(st, jm.d); if (y < -80 || y > H + 80) continue;
    for (const pc of jm.pieces) {
      const w = pc.x1 - pc.x0, cx = (pc.x0 + pc.x1) / 2 + (pc.gone ? pc.dir * pc.out * 160 : 0), yy = y - (pc.gone ? pc.out * 40 : 0);
      if (pc.gone && pc.out >= 1) continue;
      ctx.save(); ctx.globalAlpha = pc.gone ? 1 - pc.out : 1;
      ctx.translate(cx + (pc.wob ? Math.sin(pc.wob * 30) * 4 * pc.wob : 0), yy); ctx.rotate((pc.k % 2 ? 0.06 : -0.06) + (pc.gone ? pc.dir * pc.out * 0.9 : 0));
      if (jm.hp > 1) {
        // a big log (two pokes): a crack shows after the first
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; rr(-w / 2 - 3, -14, w + 6, 28, 14); ctx.fill();
        ctx.fillStyle = '#8f5f34'; rr(-w / 2, -11, w, 22, 11); ctx.fill();
        ctx.fillStyle = '#6e4626'; ctx.fillRect(-w / 2 + 8, 4, w - 16, 6); ctx.fillStyle = 'rgba(255,225,180,0.28)'; ctx.fillRect(-w / 2 + 8, -10, w - 16, 3);
        ctx.strokeStyle = '#5e3a1e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-w / 2 + 8, -3); ctx.lineTo(w / 2 - 8, -3); ctx.moveTo(-w / 2 + 12, 4); ctx.lineTo(w / 2 - 12, 4); ctx.moveTo(-w / 2 + 16, -7); ctx.lineTo(-w / 2 + w * 0.45, -7); ctx.stroke();
        ctx.fillStyle = '#5a3a1e'; ctx.beginPath(); ctx.ellipse(-w * 0.15, 0, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#4a2e14'; ctx.lineWidth = 1.4; rr(-w / 2, -11, w, 22, 11); ctx.stroke();
        ctx.fillStyle = '#d9a86a'; ctx.beginPath(); ctx.ellipse(w / 2 - 3, 0, 4, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#b07a44'; ctx.lineWidth = 0.8; for (const q of [1.5, 3]) { ctx.beginPath(); ctx.ellipse(w / 2 - 3, 0, q, q * 2.5, 0, 0, Math.PI * 2); ctx.stroke(); }
        if (pc.hp < jm.hp && !pc.gone) { ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-6, -11); ctx.lineTo(2, -2); ctx.lineTo(-3, 4); ctx.lineTo(5, 11); ctx.stroke(); }
      } else {
        // a leafy branch
        ctx.strokeStyle = '#7a5232'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-w / 2 + 4, 2); ctx.quadraticCurveTo(0, -6, w / 2 - 4, 2); ctx.stroke();
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-w / 6, -2); ctx.lineTo(-w / 4, -12); ctx.moveTo(w / 6, -2); ctx.lineTo(w / 4, 10); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,225,180,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-w / 2 + 6, 0); ctx.quadraticCurveTo(0, -8, w / 2 - 6, 0); ctx.stroke();
        for (let i = 0; i < 5; i++) {
          const lx = -w / 2 + 10 + i * (w - 20) / 4, ly = (i % 2 ? -8 : 7), lc = st.pal.leaf[(i + pc.k) % 4];
          ctx.fillStyle = shade(lc, 0.2); ctx.beginPath(); ctx.ellipse(lx + 1, ly + 1, 9, 5, i, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = lc; ctx.beginPath(); ctx.ellipse(lx, ly, 9, 5, i, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = tint(lc, 0.4); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lx - Math.cos(i) * 7, ly - Math.sin(i) * 7); ctx.lineTo(lx + Math.cos(i) * 7, ly + Math.sin(i) * 7); ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
      ctx.restore();
    }
    // the gold oar: a gold arrow over the branch to poke
    if (st.oarGold) {
      const nd = canoeNeeds(st);
      if (nd.poke && nd.poke.kind === 'piece' && jm.pieces.includes(nd.poke.ref)) {
        const ax = nd.poke.x, ay = y - 30 - Math.abs(Math.sin(G.clock * 5)) * 6;
        ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(ax, ay + 14); ctx.lineTo(ax - 11, ay); ctx.lineTo(ax - 4, ay); ctx.lineTo(ax - 4, ay - 12); ctx.lineTo(ax + 4, ay - 12); ctx.lineTo(ax + 4, ay); ctx.lineTo(ax + 11, ay); ctx.closePath(); ctx.fill();
      }
    }
  }
}
function canoeFruit(x, y, kind, s, t) {
  const f = CANOE_FRUIT[kind] || CANOE_FRUIT.mango;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(0, 3, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
  if (kind === 'banana') {
    ctx.strokeStyle = f.col; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, -8, 10, 0.5, Math.PI - 0.5); ctx.stroke();
    ctx.strokeStyle = f.dark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -8, 13, 0.7, Math.PI - 0.7); ctx.stroke(); ctx.lineCap = 'butt';
  } else if (kind === 'starfruit') {
    ctx.fillStyle = f.col; canoeStar(0, 0, 10, 5, t * 0.5); ctx.fill(); ctx.strokeStyle = f.dark; ctx.lineWidth = 1.5; ctx.stroke();
  } else {
    const r = kind === 'melon' ? 10 : kind === 'berry' ? 6.5 : 8;
    ctx.fillStyle = f.col; circle(0, 0, r); ctx.fill();
    if (kind === 'melon') { ctx.strokeStyle = f.dark; ctx.lineWidth = 1.5; for (const a of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.ellipse(0, 0, r * Math.abs(Math.cos(a + 1.1)) + 1, r, 0, 0, Math.PI * 2); ctx.stroke(); } }
    if (kind === 'berry') { ctx.fillStyle = f.col; circle(-6, 3, 5.5); ctx.fill(); circle(6, 3, 5.5); ctx.fill(); }
    if (kind === 'coconut') { ctx.fillStyle = '#3a2412'; circle(-2.5, -1, 1.5); ctx.fill(); circle(2.5, -1, 1.5); ctx.fill(); circle(0, 3, 1.5); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; circle(-r * 0.35, -r * 0.4, r * 0.3); ctx.fill();
    ctx.fillStyle = '#5fae3e'; ctx.beginPath(); ctx.ellipse(r * 0.4, -r - 1, 4.5, 2, -0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function canoeDrawFruit(st) {
  const cn = st.cn;
  for (const f of st.c.fruit) {
    if (f.got && f.fly <= 0) continue;
    let x = f.x, y = canoeSY(st, f.d) + Math.sin(G.clock * 2.5 + f.k) * 2.5, s = 1;
    if (f.got) {
      // flies into the canoe
      const u = 1 - f.fly, tx = cn.x, ty = canoeSY(st, cn.d);
      x = canoeLerp(f.x, tx, u); y = canoeLerp(canoeSY(st, f.d), ty, u) - Math.sin(u * Math.PI) * 50; s = 1 - u * 0.5;
    }
    if (y < -30 || y > H + 30) continue;
    canoeFruit(x, y, f.kind, s, G.clock);
    if (!f.got) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 + 0.2 * Math.sin(G.clock * 4 + f.k)) + ')'; ctx.lineWidth = 2; circle(x, y + 2, 15); ctx.stroke(); }
  }
}
// a riverbank bush (centre x 0, y 0 = the old middle): a soft shadow, a few bare twigs, then 3-4 clusters of small
// pointed leaves laid back to front (a dark back layer, the base colour, lit leaves on the upper left), each cluster
// with a shaded underside and an outline in a dark shade of its own green; berries or blossoms on some looks
function canoeBushPaint(v, side, pal) {
  const TAU = Math.PI * 2, R = (a, b) => hash(a, b) / 4294967296;
  ctx.fillStyle = 'rgba(20,60,30,0.2)'; ctx.beginPath(); ctx.ellipse(4, 15, 30, 9, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(20,60,30,0.14)'; ctx.beginPath(); ctx.ellipse(4, 15, 18, 5, 0, 0, TAU); ctx.fill();
  const n = 3 + (v % 2), cl = [];
  for (let i = 0; i < n; i++) cl.push({ x: (i - (n - 1) / 2) * 12 * side + (R(v, i) - 0.5) * 4, y: (i % 2 ? -8 : 5) + (R(i, v + 9) - 0.5) * 4, r: 15 - i * 1.6 + R(v + 3, i) * 2, col: pal.leaf[(v + i) % 4] });
  // twigs
  ctx.strokeStyle = pal.trunk; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
  for (const k of cl) { ctx.moveTo(0, 12); ctx.quadraticCurveTo(k.x * 0.4, 6, k.x, k.y + 4); } ctx.stroke(); ctx.lineCap = 'butt';
  const leaf = (x, y, l, a, col) => {
    const ca = Math.cos(a), sa = Math.sin(a), w = l * 0.42;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - ca * l / 2, y - sa * l / 2);
    ctx.quadraticCurveTo(x - sa * w, y + ca * w, x + ca * l / 2, y + sa * l / 2); ctx.quadraticCurveTo(x + sa * w, y - ca * w, x - ca * l / 2, y - sa * l / 2); ctx.fill();
  };
  // outlines round each cluster first, so the leaves sit inside a dark rim of their own green
  // a leafy, lumpy silhouette: a core and a ring of small round lobes
  const blob = (k, ex) => { ctx.beginPath(); ctx.moveTo(k.x + k.r * 0.78 + ex, k.y); ctx.arc(k.x, k.y, k.r * 0.78 + ex, 0, TAU);
    for (let j = 0; j < 11; j++) { const a = j / 11 * TAU + v, lr = k.r * (0.27 + R(j, v * 7 + ci0(k)) * 0.08) + ex, cx = k.x + Math.cos(a) * k.r * 0.74, cy = k.y + Math.sin(a) * k.r * 0.7; ctx.moveTo(cx + lr, cy); ctx.arc(cx, cy, lr, 0, TAU); } };
  const ci0 = k => Math.round(k.r * 10);
  for (const k of cl) { ctx.fillStyle = shade(k.col, 0.45); blob(k, 1.4); ctx.fill(); }
  cl.forEach((k, ci) => {
    // the body of the cluster, darker on its lower right
    ctx.fillStyle = shade(k.col, 0.12); blob(k, 0); ctx.fill();
    ctx.save(); blob(k, 0); ctx.clip();
    ctx.fillStyle = shade(k.col, 0.28); ctx.beginPath(); ctx.ellipse(k.x + k.r * 0.25, k.y + k.r * 0.35, k.r * 0.8, k.r * 0.55, 0, 0, TAU); ctx.fill();
    // three layers of little pointed leaves
    for (const [layer, col, nL] of [[0, shade(k.col, 0.3), 12], [1, k.col, 16], [2, tint(k.col, 0.25), 9]]) {
      for (let j = 0; j < nL; j++) {
        const a = R(ci * 50 + j, v * 3 + layer) * TAU, rd = Math.sqrt(R(j, ci * 9 + v + layer * 31)) * k.r * (layer === 2 ? 0.7 : 0.92);
        let lx = k.x + Math.cos(a) * rd, ly = k.y + Math.sin(a) * rd * 0.9;
        if (layer === 2) { lx -= k.r * 0.22; ly -= k.r * 0.28; }
        leaf(lx, ly, 6 + R(j, ci + 77 + layer) * 3.5, a + 0.6 + R(ci, j + layer) * 0.8, col);
      }
    }
    // leaf veins on a few front leaves, and a sunny spot
    ctx.strokeStyle = 'rgba(20,60,30,0.3)'; ctx.lineWidth = 0.7; ctx.beginPath();
    for (let j = 0; j < 4; j++) { const a = R(j, ci + 200) * TAU, rd = R(ci, j + 210) * k.r * 0.7, lx = k.x + Math.cos(a) * rd, ly = k.y + Math.sin(a) * rd; ctx.moveTo(lx - 2.5, ly + 1); ctx.lineTo(lx + 2.5, ly - 1); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,220,0.28)'; ctx.beginPath(); ctx.ellipse(k.x - k.r * 0.35, k.y - k.r * 0.4, k.r * 0.32, k.r * 0.22, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
  });
  // berries or blossoms on some looks
  if (v === 1 || v === 4) for (let j = 0; j < 6; j++) { const k = cl[j % cl.length], a = R(j, v + 300) * TAU, rd = R(v, j + 301) * k.r * 0.75, bx = k.x + Math.cos(a) * rd, by = k.y + Math.sin(a) * rd;
    if (v === 1) { ctx.fillStyle = '#c8304a'; circle(bx, by, 2); ctx.fill(); ctx.fillStyle = '#ffb0c0'; circle(bx - 0.6, by - 0.6, 0.7); ctx.fill(); }
    else { ctx.fillStyle = '#ffffff'; for (let p = 0; p < 5; p++) { circle(bx + Math.cos(p * 1.257) * 1.6, by + Math.sin(p * 1.257) * 1.6, 1.2); ctx.fill(); } ctx.fillStyle = '#ffd84d'; circle(bx, by, 0.9); ctx.fill(); } }
}
// bushes, trees, flowers and animals on the banks
function canoeDrawBankLife(st) {
  const pal = st.pal, t = G.clock;
  const d0 = canoeSD(st, H + 60), d1 = canoeSD(st, -60), cell = 70;
  for (let k = Math.floor(d0 / cell); k <= Math.ceil(d1 / cell); k++) for (const side of [-1, 1]) {
    const h = hash(k, side + 5), d = k * cell + (h % cell), y = canoeSY(st, d), edge = canoeCX(st, d) + side * canoeHW(st, d);
    const x = edge + side * (26 + (h >> 7) % 40);
    if (x < -40 || x > W + 40) continue;
    // (rich props) a bush of leaf clusters (cached, 6 looks a side): see canoeBushPaint
    const bv = h % 6;
    CK.pic('cnbush' + bv + '|' + side + '|' + pal.leaf.join(''), 84, 66, 42, 40, () => canoeBushPaint(bv, side, pal), x, y);
    // (rich props pass) pebbles on the sand and a clump of reeds at the water's edge
    const ex = edge + side * 7;
    for (let i = 0; i < 3; i++) { const px = ex + side * (i * 3), py = y - 10 + i * 9 + (h >> (i + 3)) % 5; ctx.fillStyle = '#8d8577'; ctx.beginPath(); ctx.ellipse(px, py, 2.6 - (i % 2), 1.8, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(px - 1.2, py - 1.2, 1.4, 0.8); }
    if (h % 3 === 0) {
      const rx = edge + side * 16, ry = y + 18;
      ctx.strokeStyle = pal.leaf[2]; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = -2; i <= 2; i++) { ctx.moveTo(rx + i * 2, ry); ctx.lineTo(rx + i * 4.5, ry - 14 - (i % 2) * 4); }
      ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = '#7a5232'; ctx.beginPath(); ctx.ellipse(rx + 4.5, ry - 18, 1.8, 4, 0.2, 0, Math.PI * 2); ctx.fill();
    }
    if (h % 5 === 0) { ctx.fillStyle = pal.flower[(h >> 3) % 3]; for (let i = 0; i < 4; i++) { circle(x + Math.cos(i * 1.57) * 4, y - 2 + Math.sin(i * 1.57) * 4, 3); ctx.fill(); } ctx.fillStyle = '#fff6c0'; circle(x, y - 2, 2.2); ctx.fill(); }
  }
  for (const dc of st.c.deco) {
    const y = canoeSY(st, dc.d); if (y < -60 || y > H + 60) continue;
    canoeAnimal(dc.kind, dc.x, y, -dc.side, t, false);
  }
}
// big tree canopies hang over the banks in front of everything (darker leaves at the screen edges)
function canoeDrawCanopy(st) {
  const pal = st.pal, d0 = canoeSD(st, H + 120), d1 = canoeSD(st, -120), cell = 160;
  for (let k = Math.floor(d0 / cell); k <= Math.ceil(d1 / cell); k++) for (const side of [-1, 1]) {
    const h = hash(k, side + 91); if (h % 2) continue;
    const d = k * cell + (h % cell), y = canoeSY(st, d), edge = canoeCX(st, d) + side * canoeHW(st, d);
    const x = Math.max(side < 0 ? -30 : edge + 70, Math.min(side < 0 ? edge - 70 : W + 30, edge + side * (90 + (h >> 6) % 70)));
    ctx.fillStyle = 'rgba(20,60,30,0.18)'; circle(x + 10, y + 14, 46); ctx.fill();
    for (let i = 0; i < 5; i++) { const a = i * 1.256 + (h % 7); ctx.fillStyle = pal.leaf[(i + h) % 4]; circle(x + Math.cos(a) * 24, y + Math.sin(a) * 20, 26); ctx.fill(); }
    ctx.fillStyle = pal.leaf[3]; circle(x - 6, y - 6, 16); ctx.fill();
    // sunlit leaf tips and a few leaf veins
    ctx.fillStyle = 'rgba(255,255,210,0.2)'; circle(x - 14, y - 18, 10); ctx.fill(); circle(x + 18, y - 12, 7); ctx.fill();
  }
}
// friendly jungle animals (top-down-ish cartoon): toucan monkey parrot frog tapir turtle sloth capy
function canoeAnimal(kind, x, y, face, t, party) {
  ctx.save(); ctx.translate(x, y); ctx.scale(face < 0 ? -1 : 1, 1);
  const eye = (ex, ey, r) => { ctx.fillStyle = '#fff'; circle(ex, ey, r); ctx.fill(); ctx.fillStyle = C.ink; circle(ex + r * 0.25, ey, r * 0.55); ctx.fill(); };
  if (kind === 'toucan') {
    const bob = Math.sin(t * 3) * 1.5;
    ctx.strokeStyle = '#7a5232'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-18, 12); ctx.lineTo(18, 12); ctx.stroke();
    ctx.fillStyle = '#1f1f2e'; ctx.beginPath(); ctx.ellipse(0, 2 + bob, 9, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3c0'; ctx.beginPath(); ctx.ellipse(3, -2 + bob, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff9a3d'; ctx.beginPath(); ctx.moveTo(6, -6 + bob); ctx.quadraticCurveTo(22, -8 + bob, 24, -1 + bob); ctx.quadraticCurveTo(16, 0 + bob, 6, -1 + bob); ctx.fill();
    ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.moveTo(6, -6 + bob); ctx.quadraticCurveTo(14, -8 + bob, 16, -5 + bob); ctx.lineTo(6, -4 + bob); ctx.fill();
    eye(3, -6 + bob, 2.4);
  } else if (kind === 'monkey') {
    const wave = Math.sin(t * (party ? 9 : 4)) * 0.6;
    ctx.fillStyle = '#8a5a34';
    ctx.save(); ctx.translate(-9, 0); ctx.rotate(-1.2 + wave); ctx.fillRect(-2, -16, 5, 16); ctx.restore();
    ctx.save(); ctx.translate(9, 0); ctx.rotate(1.2 - wave); ctx.fillRect(-2, -16, 5, 16); ctx.restore();
    circle(0, 6, 10); ctx.fill(); circle(0, -6, 10); ctx.fill(); circle(-10, -7, 4); ctx.fill(); circle(10, -7, 4); ctx.fill();
    ctx.fillStyle = '#f2c99a'; ctx.beginPath(); ctx.ellipse(0, -4, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
    eye(-3, -7, 2.2); eye(3, -7, 2.2);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -3, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  } else if (kind === 'parrot') {
    const flap = Math.sin(t * (party ? 12 : 2)) * (party ? 0.5 : 0.1);
    ctx.fillStyle = '#e8463a'; ctx.beginPath(); ctx.ellipse(0, -2, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f9be0'; ctx.save(); ctx.translate(-4, 0); ctx.rotate(0.3 + flap); ctx.beginPath(); ctx.ellipse(0, 2, 3.5, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#ffd84d'; ctx.beginPath(); ctx.moveTo(4, -9); ctx.lineTo(9, -7); ctx.lineTo(4, -5); ctx.fill();
    ctx.fillStyle = '#7fd36a'; ctx.beginPath(); ctx.moveTo(-2, 6); ctx.lineTo(-6, 16); ctx.lineTo(1, 7); ctx.fill();
    eye(1, -9, 2);
  } else if (kind === 'frog') {
    const hop = party ? 0 : Math.max(0, Math.sin(t * 2.2)) * 3;
    canoeLily(0, 4, 14, 1, false);
    ctx.fillStyle = '#5fcf4a'; ctx.beginPath(); ctx.ellipse(0, 2 - hop, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
    circle(-5, -5 - hop, 4); ctx.fill(); circle(5, -5 - hop, 4); ctx.fill();
    eye(-5, -5 - hop, 2.6); eye(5, -5 - hop, 2.6);
    ctx.strokeStyle = '#2f7a2a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 1 - hop, 4, 0.3, Math.PI - 0.3); ctx.stroke();
  } else if (kind === 'tapir') {
    ctx.fillStyle = '#3a3a48'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8e4f0'; ctx.beginPath(); ctx.ellipse(-2, 0, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3a48'; ctx.beginPath(); ctx.ellipse(18, 2, 8, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(26, 4, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e8e4f0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(19, 0, 2.5, 0.2, Math.PI - 0.2); ctx.stroke();
    if (!party) { const zz = (t * 0.7) % 1; ctx.globalAlpha = 1 - zz; ctx.scale(face < 0 ? -1 : 1, 1); text('z', (face < 0 ? -1 : 1) * 22 + zz * 6, -14 - zz * 14, 12 + zz * 4, '#ffffff', 'center'); }
  } else if (kind === 'turtle') {
    ctx.fillStyle = '#7fcf5a'; circle(11, -1, 4); ctx.fill(); circle(-7, -8, 3); ctx.fill(); circle(7, -8, 3); ctx.fill(); circle(-7, 7, 3); ctx.fill(); circle(7, 7, 3); ctx.fill();
    ctx.fillStyle = '#4f9a3c'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2f6a2a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, 0, 5, 4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = C.ink; circle(13, -2, 1); ctx.fill();
  } else if (kind === 'sloth') {
    const sw = Math.sin(t * 0.8) * 0.15;
    ctx.rotate(sw);
    ctx.strokeStyle = '#7a5232'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-26, -16); ctx.lineTo(26, -16); ctx.stroke();
    ctx.fillStyle = '#a8896a'; ctx.beginPath(); ctx.ellipse(0, 2, 12, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-11, -16, 5, 12); ctx.fillRect(6, -16, 5, 12);
    ctx.fillStyle = '#e8d2b0'; ctx.beginPath(); ctx.ellipse(0, -2, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a4030'; ctx.beginPath(); ctx.ellipse(-4, -3, 3, 2, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(4, -3, 3, 2, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0.2, Math.PI - 0.2); ctx.stroke();
  } else if (kind === 'capy') {
    canoeCapy(0, 0, 1, t, party);
  }
  ctx.restore();
}
// Cappy the capybara (from above, a little side-on): a round brown friend with an orange on her head
function canoeCapy(x, y, s, t, happy, face = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s);
  ctx.fillStyle = '#9a6a3e'; ctx.beginPath(); ctx.ellipse(-4, 2, 20, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a97a4a'; ctx.beginPath(); ctx.ellipse(14, -2, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a5230'; ctx.beginPath(); ctx.ellipse(23, 0, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
  circle(9, -10, 3); ctx.fill(); circle(16, -11, 3); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
  if (happy) { ctx.beginPath(); ctx.arc(15, -4, 2.2, Math.PI + 0.3, -0.3); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(13, -4); ctx.lineTo(18, -4); ctx.stroke(); }
  // the orange
  ctx.fillStyle = '#ff9a3d'; circle(10, -17, 5); ctx.fill(); ctx.fillStyle = '#5fae3e'; ctx.beginPath(); ctx.ellipse(12, -22, 3, 1.5, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// Cappy swims over to a swamped canoe and tips it out
function canoeDrawCappy(st) {
  const cn = st.cn, sw = cn.swamp, y = canoeSY(st, cn.d), side = sw.side;
  const edge = canoeCX(st, cn.d) + side * (canoeHW(st, cn.d) + 30);
  const u = canoeSmooth(sw.t / 1.3), x = canoeLerp(edge, cn.x + side * 46, u);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 30, 16, 0, 0, Math.PI * 2); ctx.fill();
  canoeCapy(x, y + Math.sin(G.clock * 5) * 2, 1.1, G.clock, sw.t > 1.5, -side);
  if (sw.t > 1.6) { ctx.save(); ctx.translate(x, y - 34); text('Cappy', 0, 0, 13, '#ffffff', 'center', 'body'); ctx.restore(); }
}
// the bailer's dotted aim line: where the oar reaches (gold with the gold oar)
function canoeDrawAimLine(st) {
  const cn = st.cn;
  if (cn.state !== 'go' || G.introT > 0) return;
  const seg = canoeOarSeg(st, cn.aim, canoeReach(st));
  ctx.strokeStyle = st.oarGold ? C.gold : PCOL[st.bailer]; ctx.globalAlpha = 0.55; ctx.lineWidth = 2.5; ctx.setLineDash([5, 7]);
  ctx.beginPath(); ctx.moveTo(seg.x0, canoeSY(st, seg.d0)); ctx.lineTo(seg.x1, canoeSY(st, seg.d1)); ctx.stroke(); ctx.setLineDash([]);
  circle(seg.x1, canoeSY(st, seg.d1), 6); ctx.stroke();
  ctx.globalAlpha = 1;
}
// one player drawn by the engine's drawPlayer (a copy at the origin, feet at 0,0)
function canoeBody(p, sx, sy, extra) {
  drawPlayer(Object.assign({}, p, { alive: true, x: -PW / 2, y: -PH, sx: sx || 1, sy: sy || 1, vy: 0, face: 1, stun: 0 }, extra || {}));
}
function canoeHull(path) {
  ctx.beginPath();
  ctx.moveTo(0, -CANOE.half);
  ctx.bezierCurveTo(14, -44, CANOE.beam + 4, -20, CANOE.beam + 2, 4);
  ctx.bezierCurveTo(CANOE.beam, 30, 12, 46, 0, CANOE.half);
  ctx.bezierCurveTo(-12, 46, -CANOE.beam, 30, -CANOE.beam - 2, 4);
  ctx.bezierCurveTo(-CANOE.beam - 4, -20, -14, -44, 0, -CANOE.half);
  ctx.closePath();
  if (path) return;
}
function canoeDrawCanoe(st) {
  const P = CANOE, cn = st.cn, ps = G.players, t = G.clock;
  let x = cn.x, y = canoeSY(st, cn.d), sc = 1, rot = cn.heading, sink = clamp(cn.water / 100, 0, 1);
  const pd = ps[st.paddler], bl = ps[st.bailer];
  if (cn.drop) { const u = cn.drop.t / P.dropT; sc = 1 + 0.35 * Math.sin(Math.PI * clamp(u, 0, 1)); rot += Math.sin(u * Math.PI * 2) * 0.15; }
  if (cn.swamp) { sink = 1; const sw = cn.swamp; if (sw.t > 1.3 && sw.t < 1.9) rot += Math.sin((sw.t - 1.3) / 0.6 * Math.PI) * 1.2 * sw.side; }
  const bob = Math.sin(cn.bob * 3) * 1.2 + (cn.slosh ? Math.sin(cn.bob * 30) * cn.slosh * 1.5 : 0);
  ctx.save(); ctx.translate(x, y + bob); ctx.rotate(rot); ctx.scale(sc, sc);
  // ripple ring and shadow
  ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + sink * 0.2) + ')'; ctx.beginPath(); ctx.ellipse(0, 0, P.beam + 10 + sink * 6, P.half + 8, 0, 0, Math.PI * 2); ctx.fill();
  if (cn.drop) { ctx.fillStyle = 'rgba(20,40,60,0.25)'; ctx.beginPath(); ctx.ellipse(10 * (sc - 1) * 8, 30 * (sc - 1) * 4, P.beam + 6, P.half, 0, 0, Math.PI * 2); ctx.fill(); }
  // the paddler's paddle (behind the hull on the stroke side)
  const ps0 = P.sternSeat, sideP = cn.strokeSide, swing = cn.strokeA;
  const bladeY = ps0 - 18 + (1 - swing) * 36 * (swing > 0 ? 1 : 0) + (swing > 0 ? 0 : 18);
  ctx.strokeStyle = '#7a5228'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(sideP * 6, ps0 - 6); ctx.lineTo(sideP * (P.beam + 18), bladeY); ctx.stroke();
  ctx.fillStyle = '#d9a86a'; ctx.beginPath(); ctx.ellipse(sideP * (P.beam + 22), bladeY + 4, 6, 11, sideP * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.lineCap = 'butt';
  // the hull
  const lowCol = sink > 0.75 ? '#a8693a' : '#c47a3c';
  ctx.fillStyle = lowCol; canoeHull(true); ctx.fill();
  ctx.strokeStyle = '#7a4420'; ctx.lineWidth = 3; ctx.stroke();
  // the inside
  ctx.save(); ctx.scale(0.8, 0.86); ctx.fillStyle = '#8f5428'; canoeHull(true); ctx.fill();
  ctx.clip();
  // water inside: fills from the stern up, sloshing
  if (cn.water > 0.5 || cn.swamp) {
    const fill = cn.swamp ? 1 : sink, top = P.half - fill * P.half * 2 - 4;
    ctx.fillStyle = 'rgba(80,185,215,' + (0.55 + 0.25 * fill) + ')';
    ctx.beginPath(); ctx.moveTo(-40, P.half + 10); ctx.lineTo(-40, top + Math.sin(t * 6) * 3 * (1 + cn.slosh)); ctx.quadraticCurveTo(0, top - 6 * Math.sin(t * 4 + 1) * (1 + cn.slosh), 40, top - Math.sin(t * 6) * 3); ctx.lineTo(40, P.half + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 3; i++) { circle(-10 + i * 10, top + 4 + Math.sin(t * 5 + i) * 2, 1.8); ctx.fill(); }
  }
  ctx.restore();
  // seats
  ctx.fillStyle = '#d9a86a';
  for (const sy of [P.bowSeat + 8, P.sternSeat + 8]) { rr(-P.beam + 3, sy - 3, (P.beam - 3) * 2, 6, 3); ctx.fill(); }
  // the bailer's oar, pointing where it is aimed (out further while poking)
  const aimA = cn.aim * P.notchA, jabU = cn.jab > 0 ? Math.sin(clamp(1 - cn.jab / P.jabT, 0, 1) * Math.PI) : 0;
  const tipD = 26 + jabU * (canoeReach(st) - 26);
  ctx.save(); ctx.translate(0, -P.pivot); ctx.rotate(aimA);
  ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 22); ctx.lineTo(0, -tipD + 8); ctx.stroke();
  ctx.fillStyle = st.oarGold ? C.gold : '#d9a86a'; ctx.beginPath(); ctx.ellipse(0, -tipD + 8, 5.5, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.lineCap = 'butt';
  ctx.restore();
  // the crew: the bailer at the front, the paddler at the back
  const sitting = (p, sy, extra) => { ctx.save(); ctx.translate(0, sy + 8); canoeBody(p, 0.92, 0.82, extra); ctx.restore(); };
  if (cn.swap) {
    // swap seats: a hop over each other
    const u = clamp((cn.swap.t - 1.1) / 0.9, 0, 1), arc = Math.sin(u * Math.PI) * 26;
    const yb = canoeLerp(P.bowSeat, P.sternSeat, canoeSmooth(u)), yp = canoeLerp(P.sternSeat, P.bowSeat, canoeSmooth(u));
    ctx.save(); ctx.translate(-arc * 0.6, yb + 8 - arc); canoeBody(bl, 0.92, 0.9); ctx.restore();
    ctx.save(); ctx.translate(arc * 0.6, yp + 8 - arc * 0.7); canoeBody(pd, 0.92, 0.9); ctx.restore();
  } else if (cn.fin && cn.fin.t > 1.3) {
    const j = Math.abs(Math.sin(cn.fin.t * 7)) * 10;
    ctx.save(); ctx.translate(0, P.bowSeat + 8 - j); canoeBody(bl, 0.95, 1.05); ctx.restore();
    ctx.save(); ctx.translate(0, P.sternSeat + 8 - Math.abs(Math.sin(cn.fin.t * 7 + 1.2)) * 10); canoeBody(pd, 0.95, 1.05); ctx.restore();
  } else {
    const wobble = cn.swamp ? { stun: 0, blink: 1 } : {};
    sitting(bl, P.bowSeat, Object.assign({ sx: 1 }, wobble));
    sitting(pd, P.sternSeat + (cn.strokeA > 0 ? -cn.strokeA * 2 : 0), wobble);
  }
  // the bucket in the bailer's hand: tips over the side on a scoop, gold when full
  const bx = cn.scoopA > 0 ? cn.scoopSide * (P.beam + 6) : -cn.scoopSide * 14, byy = P.bowSeat + 4;
  ctx.save(); ctx.translate(bx, byy); ctx.rotate(cn.scoopA > 0 ? cn.scoopSide * cn.scoopA * 1.4 : 0);
  const full = cn.dip >= canoeGoldAt(st);
  ctx.fillStyle = full ? C.gold : '#d0d6e0'; rr(-6, -6, 12, 12, 3); ctx.fill();
  ctx.strokeStyle = full ? '#b9850f' : '#7c8494'; ctx.lineWidth = 1.5; rr(-6, -6, 12, 12, 3); ctx.stroke();
  ctx.fillStyle = '#5ab8e0'; rr(-4.5, 6 - 10 * cn.dip, 9, 10 * cn.dip - 1.5, 2); if (cn.dip > 0.15) ctx.fill();
  ctx.restore();
  ctx.restore();
  // beached: a little sand puff and "!"
  if (cn.beached && cn.state === 'go') {
    ctx.fillStyle = 'rgba(255,240,200,0.7)'; circle(x - cn.beached.dir * 26, y - 30, 8 + Math.sin(t * 6) * 2); ctx.fill();
  }
}

/* ---------- HUD: the clock and fruit, each job's panel on its player's side, prompts and hints ---------- */
function canoeHud(st) {
  const P = CANOE, cn = st.cn, big = hudBig(), play = G.mode === 'play' || G.mode === 'paused', t = G.clock;
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = st.stats.fruit + '/' + st.stats.fruitAll;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.3, gap = fs;
    const w = tw + gap + icon + fs * 0.4 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, C.paper, 'left', 'body');
    canoeFruit(x0 + 15 + tw + gap + icon / 2, cy + 1, 'mango', fs / 18, t);
    text(n, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, '#ffe7a8', 'left', 'body');
    timeX0 = x0;
  }
  if (!play) return;
  const z = big ? 1.4 : 1;
  // the job panels, bottom corners: Pip's on the left, Bo's on the right
  for (const id of [0, 1]) {
    const pad = id === st.paddler, pw = Math.round(262 * z), ph = Math.round(56 * z), py = H - ph - 8;
    const px = id === 0 ? 10 : W - 10 - pw, cpuSeat = canoeQuiet(id);
    ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    const gold = pad ? st.paddleGold : (st.bucketGold || st.oarGold || st.calmGold);
    ctx.strokeStyle = gold ? C.gold : PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    text(NAMES[id] + (pad ? ' paddles' : ' bails') + (cpuSeat ? ' (computer)' : ''), px + 12 * z, py + 14 * z, 15 * z, PCOL[id], 'left');
    if (pad) {
      if (!cpuSeat) text((canoeKey(id, 'lr') + ' paddle · ' + canoeKey(id, 'down') + ' slow').replace(/stick /g, ''), px + pw - 10 * z, py + 14 * z, 11.5 * z, '#d9d3ef', 'right', 'body');
      // the stroke beat: fills after each stroke; the next stroke on the other side in the gold part is a Swish
      const bx = px + 12 * z, bw = pw - 24 * z - 64 * z, by = py + 30 * z, bh = 15 * z;
      const since = G.time - cn.lastT, f = clamp(since / P.goodMax, 0, 1), g0 = P.goodMin / P.goodMax;
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(bx, by, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,197,61,0.35)'; rr(bx + bw * g0, by, bw * (1 - g0), bh, bh / 2); ctx.fill();
      const ready = since >= P.goodMin && since <= P.goodMax;
      if (bw * f >= bh) { ctx.fillStyle = ready ? C.gold : '#ffffff'; rr(bx, by, bw * f, bh, bh / 2); ctx.fill(); }
      const nextKey = cn.lastSide > 0 ? canoeKey(id, 'left') : canoeKey(id, 'right');
      text(since > P.goodMax ? 'paddle!' : 'next: ' + (cpuSeat ? (cn.lastSide > 0 ? '◀' : '▶') : nextKey), bx + 8 * z, by + bh / 2 + 0.5, 10.5 * z, bw * f > 70 * z ? '#3a2a40' : '#ffffff', 'left', 'body');
      const tx = bx + bw + 6 * z, tw2 = 56 * z;
      ctx.fillStyle = cn.streak >= 2 ? C.gold : 'rgba(255,197,61,0.3)'; rr(tx, by - 2 * z, tw2, bh + 4 * z, (bh + 4 * z) / 2); ctx.fill();
      text(cn.streak >= 2 ? 'Swish x' + cn.streak : 'Swish', tx + tw2 / 2, by + bh / 2 + 0.5, (cn.streak >= 10 ? 9.5 : 11) * z, cn.streak >= 2 ? C.ink : '#ffe7a8', 'center', 'body');
    } else {
      if (!cpuSeat) text(canoeKey(id, 'act') + ' bail · ' + canoeKey(id, 'lr') + ' aim · ' + canoeKey(id, 'poke') + ' poke', px + pw - 10 * z, py + 14 * z, 11.5 * z, '#d9d3ef', 'right', 'body');
      // the water in the canoe, and the bucket
      const bx = px + 12 * z, bw = pw - 24 * z - 50 * z, by = py + 30 * z, bh = 15 * z, wf = clamp(cn.water / 100, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(bx, by, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,120,120,0.3)'; rr(bx + bw * 0.75, by, bw * 0.25, bh, bh / 2); ctx.fill();
      if (bw * wf >= bh) { ctx.fillStyle = wf > 0.75 ? (Math.sin(t * 12) > 0 ? '#ff8a8a' : '#5ab8e0') : '#5ab8e0'; rr(bx, by, bw * wf, bh, bh / 2); ctx.fill(); }
      text('water ' + Math.round(cn.water) + '%', bx + 8 * z, by + bh / 2 + 0.5, 10.5 * z, '#ffffff', 'left', 'body');
      const full = cn.dip >= canoeGoldAt(st), cx = bx + bw + 25 * z, cy = by + bh / 2;
      ctx.fillStyle = full ? (Math.sin(t * 14) > -0.3 ? C.gold : '#ffe39a') : 'rgba(255,255,255,0.2)'; rr(cx - 23 * z, cy - 11 * z, 46 * z, 22 * z, 7 * z); ctx.fill();
      ctx.fillStyle = '#5ab8e0'; const fh = 16 * z * cn.dip; if (fh > 2) { rr(cx - 19 * z, cy + 8 * z - fh, 38 * z, fh, 4 * z); ctx.fill(); }
      // the button is 46 px wide; shrink the word if it would come within 6 px of its edges
      const sw = full ? 'SCOOP' : 'fill'; let sfs = (full ? 10 : 10.5) * z;
      ctx.font = '700 ' + sfs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const smw = ctx.measureText(sw).width; if (smw > 32 * z) sfs *= 32 * z / smw;
      text(sw, cx, cy + 0.5, sfs, full ? C.ink : '#ffffff', 'center', 'body');
    }
  }
  // the message line (gold help): between the level pill and the clock when it fits, else lower down
  const font = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  let signY = big ? 92 : 80;
  if (st.msg) {
    let fs = big ? 20 : 14;
    const h = big ? 32 : 26;
    ctx.font = font(14);
    const left = 14 + ctx.measureText(levelCode(G.levelIndex) + ' · ' + G.level.def.name).width + 28 + 10, right = timeX0 - 10;
    ctx.font = font(fs);
    let w = ctx.measureText(st.msg.text).width + 30, cx = W / 2 + 40, y = 12;
    if (w <= right - left) cx = clamp(cx, left + w / 2, right - w / 2);
    else {
      cx = W / 2; y = signY; signY += h + 6;
      while (w > W - 40 && fs > 11) { fs--; ctx.font = font(fs); w = ctx.measureText(st.msg.text).width + 30; }
    }
    ctx.globalAlpha = clamp((st.msg.life - st.msg.t) / 0.3, 0, 1);
    pill(cx, y, w, h, 'center'); text(st.msg.text, cx, y + h / 2 + 0.5, fs, st.msg.col, 'center', 'body'); ctx.globalAlpha = 1;
  }
  // the river sign: a wooden board along the top
  if (st.sign && G.introT <= 0) {
    const s = canoeSignText(st, st.sign.text);
    let fs = big ? 19 : 14;
    ctx.font = font(fs);
    let w = ctx.measureText(s).width + 34;
    while (w > W - 30 && fs > 11) { fs--; ctx.font = font(fs); w = ctx.measureText(s).width + 34; }
    const h = fs + 14, a = clamp(Math.min(st.sign.t / 0.25, (st.sign.life - st.sign.t) / 0.4), 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#c08a4e'; rr(W / 2 - w / 2, signY, w, h, 8); ctx.fill();
    ctx.strokeStyle = '#6a4626'; ctx.lineWidth = 2.5; rr(W / 2 - w / 2, signY, w, h, 8); ctx.stroke();
    text(s, W / 2, signY + h / 2 + 0.5, fs, '#2e1c0c', 'center', 'body');
    ctx.globalAlpha = 1;
  }
  if (G.introT > 0 || cn.state !== 'go') return;
  // prompts: the bailer's above the canoe, the paddler's below it. A hint bubble replaces that player's prompt
  const fs = 14 * z, Pd = st.paddler, Bl = st.bailer, nd = canoeNeeds(st), y0 = canoeSY(st, cn.d);
  const panelTop = H - Math.round(56 * z) - 16;
  const box = (id, str, col, pulse, bubble) => {
    if (canoeQuiet(id)) return;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 22 * z, h = fs + 13 * z;
    let x = cn.x - w / 2, y;
    if (id === Bl) y = y0 - P.half - 34 * z - h; else y = y0 + P.half + 10;
    x = clamp(x, 4, W - w - 4); y = clamp(y, big ? 96 : 84, panelTop - h);
    const s = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s);
    ctx.fillStyle = bubble ? '#ffffff' : 'rgba(28,26,54,0.86)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = bubble ? PCOL[id] : col; ctx.lineWidth = 2.5; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, bubble ? C.ink : col, 'center', 'body');
    ctx.restore();
  };
  // the paddler
  if (st.hints[Pd]) box(Pd, st.hints[Pd].text, C.ink, false, true);
  else if (cn.beached) box(Pd, 'Paddle away! ' + canoeKey(Pd, cn.beached.dir < 0 ? 'left' : 'right'), C.gold, true);
  else if (cn.atJam && cn.v < 5) {
    const jm = cn.atJam, lx = nd.laneX, free = !jm.pieces.some(pc => !pc.gone && pc.x1 > lx - P.beam && pc.x0 < lx + P.beam);
    box(Pd, free && Math.abs(lx - cn.x) > 12 ? 'Steer to the gap ' + canoeKey(Pd, lx < cn.x ? 'left' : 'right') : 'Wait for ' + NAMES[Bl] + ' to poke', '#ffe7a8', false);
  } else if (nd.rapidsAhead && cn.water > 60) box(Pd, 'Slow down ' + canoeKey(Pd, 'down') + ' so less splashes in', '#d8f0ff', true);
  else {
    const e = nd.laneX - cn.x;
    if (Math.abs(e) > 70) box(Pd, (e < 0 ? canoeKey(Pd, 'left') + ' Steer left' : 'Steer right ' + canoeKey(Pd, 'right')), '#ffe7a8', false);
  }
  // the bailer
  if (st.hints[Bl]) box(Bl, st.hints[Bl].text, C.ink, false, true);
  else if (cn.water > 60) box(Bl, (cn.dip >= canoeGoldAt(st) ? 'Scoop now! ' : 'Bail! ') + canoeKey(Bl, 'act'), cn.water > 80 ? '#ff9a9a' : '#bfefff', cn.dip >= canoeGoldAt(st));
  else if (nd.poke && nd.poke.far < 230) {
    const pk = nd.poke;
    if (pk.aimed && pk.reachable) box(Bl, 'Poke it! ' + canoeKey(Bl, 'poke'), C.gold, true);
    else if (!pk.aimed) box(Bl, 'Aim ' + (pk.notch < cn.aim ? canoeKey(Bl, 'left') : canoeKey(Bl, 'right')) + (pk.kind === 'fruit' ? ' at the fruit' : ' at it'), '#ffe7a8', false);
  } else if (cn.water > 25 && cn.dip >= canoeGoldAt(st)) box(Bl, 'Scoop! ' + canoeKey(Bl, 'act'), '#bfefff', false);
}

/* ---------- sounds ---------- */
Sfx.extra.canoeStroke = function (p) { this.tone(300 * p, 0.12, 'sine', 0.04, 160 * p); };
Sfx.extra.canoeSwish = function (p) { this.tone(420 * p, 0.14, 'sine', 0.05, 200 * p); this.tone(1400, 0.08, 'triangle', 0.015, 900, 0.03); };
Sfx.extra.canoeSplish = function (p) { this.tone(600 * p, 0.05, 'sine', 0.025, 420 * p); };
Sfx.extra.canoeScoop = function (p) { this.tone(260 * p, 0.12, 'triangle', 0.05, 520 * p); this.tone(900 * p, 0.12, 'sine', 0.025, 400 * p, 0.08); };
Sfx.extra.canoeSplash = function () { this.tone(800, 0.12, 'sine', 0.02, 300); };
Sfx.extra.canoeAim = function (p) { this.tone(700 * p, 0.04, 'triangle', 0.02); };
Sfx.extra.canoeJab = function (p) { this.tone(500 * p, 0.07, 'triangle', 0.03, 800 * p); };
Sfx.extra.canoePoke = function (p) { this.tone(240 * p, 0.1, 'triangle', 0.05, 480 * p); this.tone(720 * p, 0.08, 'sine', 0.03, null, 0.06); };
Sfx.extra.canoeClunk = function (p) { this.tone(160 * p, 0.14, 'square', 0.04, 90 * p); [523, 659].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.04, null, 0.08 + i * 0.06)); };
Sfx.extra.canoeThud = function () { this.tone(120, 0.15, 'triangle', 0.07, 70); };
Sfx.extra.canoeBonk = function () { this.tone(300, 0.1, 'square', 0.035, 150); this.tone(140, 0.15, 'triangle', 0.06, 90, 0.02); };
Sfx.extra.canoeBump = function () { this.tone(200, 0.2, 'sine', 0.07, 420); this.tone(100, 0.15, 'triangle', 0.05, 70); };
Sfx.extra.canoePush = function (p) { this.tone(260 * p, 0.12, 'triangle', 0.05, 520 * p); };
Sfx.extra.canoeFruit = function (p) { [784, 988, 1175].forEach((f, i) => this.tone(f * p, 0.07, 'triangle', 0.04, null, i * 0.05)); };
Sfx.extra.canoeFlag = function () { this.tone(1500, 0.06, 'sine', 0.03, 2200); this.tone(1700, 0.06, 'sine', 0.03, 2400, 0.09); [523, 659, 784].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.04, null, 0.15 + i * 0.06)); };
Sfx.extra.canoeGlug = function () { [400, 330, 260, 200].forEach((f, i) => this.tone(f, 0.12, 'sine', 0.06, f * 0.7, i * 0.13)); };
Sfx.extra.canoeTip = function () { this.tone(220, 0.3, 'sine', 0.06, 660); this.tone(900, 0.3, 'sawtooth', 0.015, 300, 0.1); };
Sfx.extra.canoeWhoosh = function () { this.tone(900, 1.1, 'sawtooth', 0.018, 120); this.tone(600, 0.9, 'sine', 0.04, 160, 0.1); };
Sfx.extra.canoeBigSplash = function () { this.tone(140, 0.4, 'triangle', 0.08, 60); this.tone(1200, 0.4, 'sawtooth', 0.02, 200, 0.02); };
Sfx.extra.canoeSwap = function () { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.canoeHop = function (p) { this.tone(420 * p, 0.1, 'sine', 0.05, 700 * p); };
Sfx.extra.canoeHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.canoeCheer = function () { [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.canoeParty = function () { [392, 494, 587, 784, 988, 784, 988, 1175].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.055, null, i * 0.09)); this.tone(1568, 0.5, 'sine', 0.04, null, 0.75); };
