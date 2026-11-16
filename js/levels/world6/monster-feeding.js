/* Pip & Bo - Level 6-1 Monster Feeding (team). */
'use strict';

/* ===== 6-1 Monster Feeding (mode 'monster', World 6 team): the chef throws from the kitchen, the catcher catches the
   food in a basket and feeds it to the monster before it gets grumpy. Roles swap every room. Spec: w6/monster/SPEC.md ===== */
const MONSTER = {
  gF: 900, ang: 52 * Math.PI / 180,          // food gravity (px/s^2) and the fixed launch angle
  tapT: 0.15, chargeT: 1.2,                  // released before tapT = a tap (charge 0); then the charge fills 0 -> 1 in chargeT
  reloadT: 0.5, chargeSlow: 0.55,            // pot: next food after a throw; chef walk speed while charging (x maxRun)
  foodR: 9, bounceY: 0.45, bounceX: 0.6, wallBounce: 0.5, splatLife: 2.0, maxSplats: 12, foodLife: 10,
  cap: 3, rimUp: 14, basketHalf: 17, catchHalf: 22, magnetR: 34, magnetH: 40, magnetV: 240,
  bigCatchHalf: 32, bigMagnetR: 52, bigScale: 1.35, helpSplats: 4,
  refDrop: 34,                               // the throw distance is measured at a grounded catcher's rim height (ground - 34)
  gStart: 30, gBite: 22, gGold: 40, gWrong: 3, gBonk: 0, bonkCD: 0.8, wantT: 15, giveIn: 2,
  gAfter: 55, tantrumT: 1.6, riseMul: 0.85, riseMin: 0.6, shockR: 260,
  gobbleT: 0.2, tossRange: 120, tossCD: 0.25,
  feedDX: 24, feedDY: 36, afkT: 10, doneT: 2.2, popT: 1.0, goldEvery: 6,
};
const MONSTER_FOODS = ['apple', 'cake', 'fish'];
const MONSTER_COL = { apple: '#e5413a', cake: '#ff9ccf', fish: '#7fb6e0', gold: '#ffc53d' };
const MONSTER_BODY = { Munch: '#8f7be8', Nom: '#7fc8a9', Nibble: '#f29fc5' };
const MONSTER_FOOD_NAME = { apple: 'an apple', cake: 'cake', fish: 'fish', gold: 'a cupcake' };

/* ---- rules ---- */
function monSolid(tx, ty) { if (ty < 0) return false; return tile(tx, ty) === '#'; }
// the first surface (stone or plank top) at or below y in the column of x
function monGroundY(x, y) {
  const tx = Math.floor(x / T);
  if (tx < 0 || tx >= COLS) return H;
  for (let ty = Math.max(0, Math.floor(y / T)); ty < ROWS; ty++) { const ch = tile(tx, ty); if (ch === '#' || ch === '=') return ty * T; }
  return H;
}
function monParseRoom(st, L) {
  const def = L.def, grid = L.grid;
  st.thrower = def.thrower; st.catcher = 1 - def.thrower;
  st.dMin = def.throwRange[0]; st.dMax = def.throwRange[1];
  st.fieldY = (def.fieldRow || 16) * T;
  st.monsters = []; st.burrows = []; st.bins = []; st.pot = null; st.fences = [];
  const names = def.names || ['Munch'];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const ch = grid[y][x];
    if (ch === 'Z') {
      const ax = x * T + T / 2, f = ax < W / 2 ? 1 : -1;
      st.monsters.push({ kind: 'big', ax, ay: (y + 1) * T, face: f, name: names[st.monsters.length] || names[0] });
      grid[y][x] = '.';
    }
    else if (ch === 'h') { st.burrows.push({ x: x * T + T / 2, y: (y + 1) * T }); grid[y][x] = '.'; }
    else if (ch === 'f') { st.bins.push({ tx: x, x: x * T, y: y * T, type: def.bins[st.bins.length], pop: 0 }); grid[y][x] = '.'; }
    else if (ch === 'p') { st.pot = { x: x * T + T / 2, y: (y + 1) * T }; grid[y][x] = '.'; }
    else if (ch === '|') { st.fences.push({ tx: x, ty: y }); grid[y][x] = '.'; }
  }
  // the kitchen: from the chef's spawn out to the nearest fence or wall in that row
  const sp = L.spawns[st.thrower], row = Math.round((sp.y + PH) / T) - 1, sc = Math.floor((sp.x + PW / 2) / T);
  const isFence = (cc) => st.fences.some(f => f.tx === cc && f.ty === row);
  let c0 = sc, c1 = sc;
  while (c0 - 1 >= 0 && !isFence(c0 - 1) && grid[row][c0 - 1] !== '#') c0--;
  while (c1 + 1 < COLS && !isFence(c1 + 1) && grid[row][c1 + 1] !== '#') c1++;
  st.kitchen = { c0, c1, x0: c0 * T, x1: (c1 + 1) * T, floor: (row + 1) * T, row,
    open: [isFence(c0 - 1) ? -1 : 0, isFence(c1 + 1) ? 1 : 0].filter(Boolean) };
  if (def.burrowOrder) {
    st.monsters.push({ kind: 'head', burrow: def.burrowOrder[0], face: 1, name: names[0] });
    st.order = def.burrowOrder.slice(); st.orderI = 0;
  } else { st.order = null; st.orderI = 0; }
  const needs = [].concat(def.need);
  st.monsters.forEach((m, i) => Object.assign(m, {
    i, g: MONSTER.gStart, need: needs[i] != null ? needs[i] : needs[0], eaten: 0, rise: def.rise, mul: 1,
    scale: m.kind === 'big' && st.monsters.length > 1 ? 0.9 : 1,
    state: 'up', t: 0, tantrums: 0, gobble: 0.05, gobbling: false, bonkCD: 0, spitT: 0, yum: 0, ouch: 0, open: 0, full: false,
    chomp: 0, shock: 0, popA: 0, lift: 0, growlT: 0, steamT: 0, zzzT: 0, burpT: 0, nextBurrow: null,
  }));
  monPlace(st);
}
// mouth centre, wall (nobody walks into a big monster) and the body ellipse (bonks)
function monPlace(st) {
  for (const m of st.monsters) {
    if (m.kind === 'big') {
      const s = m.scale;
      m.mx = m.ax + m.face * 30; m.my = m.ay - 48;
      m.wall = m.ax + m.face * 28;              // face -1: players' right edge <= wall; face +1: left edge >= wall
      m.bx = m.ax - m.face * 6 * s; m.by = m.ay - 60 * s; m.brx = 58 * s; m.bry = 60 * s;
    } else {
      const b = st.burrows[m.burrow];
      m.ax = b.x; m.ay = b.y; m.mx = b.x; m.my = b.y - 26; m.wall = null;
      m.bx = b.x; m.by = b.y - 30; m.brx = 30; m.bry = 30;
    }
  }
}
function monInitRoom(st, L) {
  Object.assign(st, {
    hand: null, handWant: null, reload: 0.3, grabQ: null, charging: false, holdT: 0, charge: 0, chTick: 0, fullFlash: 0, sawPause: false,
    shrug: 0, shrugMsg: 0, popAnim: 0,
    foods: [], splats: [], fx: [], puffs: [], basket: [], bwant: [], rimPrev: null, hop: 0, tossCD: 0, splatRun: 0,
    big: false, bigPop: 0, sparkT: 0, idle: [0, 0], afk: false,
    want: null, wantT: 0, wantPop: 0, wrongRun: 0, wrongType: null, gaveIn: false, tripGood: 0,
    done: false, doneT: 0, doneAge: 0, roomTantrums: 0, roomStars: 0, served: 0, bag: [], preview: null, ghost: null,
    thrown: false, grabMsg: 0, grabShown: false, tossMsgT: 0, roomStart: G.time,
  });
  monParseRoom(st, L);
  if (L.def.bins) st.want = L.def.firstWant || st.bins[0].type;
  monDecor(st);
}
// grass tufts and toadstools on the field (never in the kitchen, never by a mouth or a burrow)
function monDecor(st) {
  const k = st.kitchen, out = [], room = G.room || 0;
  for (let ty = 1; ty < ROWS; ty++) for (let tx = 1; tx < COLS - 1; tx++) {
    if (tile(tx, ty) !== '#' || tile(tx, ty - 1) === '#' || tile(tx, ty - 1) === '=') continue;
    if (ty - 1 === k.row && tx >= k.c0 - 1 && tx <= k.c1 + 1) continue;
    if (ty === k.row + 1) continue;
    const x = tx * T + 15;
    if (st.monsters.some(m => m.kind === 'big' && Math.abs(x - m.mx) < 40 + 30)) continue;
    if (st.burrows.some(b => Math.abs(x - b.x) < 40 && Math.abs(ty * T - b.y) < 4)) continue;
    const h = hash(tx * 7 + room, ty * 13 + room * 31);
    if (h % 12 === 0) out.push({ kind: 'shroom', x: tx * T + 6 + (h >> 5) % 18, y: ty * T, s: 0.8 + ((h >> 9) % 5) * 0.08 });
    else if (h % 4 === 1) out.push({ kind: 'tuft', x: tx * T + 5 + (h >> 5) % 20, y: ty * T, s: 0.8 + ((h >> 9) % 5) * 0.1 });
  }
  st.decor = out;
}
function monNextFood(st) {
  st.served++;
  if (G.level.def.gold && st.served % MONSTER.goldEvery === 0) return 'gold';
  if (!st.bag.length) {
    st.bag = MONSTER_FOODS.slice();
    for (let i = st.bag.length - 1; i > 0; i--) { const j = Math.floor(MODES.monster.rand() * (i + 1)); [st.bag[i], st.bag[j]] = [st.bag[j], st.bag[i]]; }
  }
  return st.bag.pop();
}
function monRim(p) { return { x: p.x + p.w / 2, y: p.y - MONSTER.rimUp }; }
// launch speed so the food crosses the catch height (ground - 34) d px past the gate
function monSpeed(st, d, ry) {
  const h = (st.fieldY - MONSTER.refDrop) - ry, c = Math.cos(MONSTER.ang), tn = Math.tan(MONSTER.ang);
  const den = 2 * c * c * (d * tn + h);
  return den > 0 ? Math.sqrt(MONSTER.gF * d * d / den) : 300;
}
// the throw always goes out over a fence: the one the chef faces, else the only one
function monSide(st, p) { const o = st.kitchen.open; return o.includes(p.face) ? p.face : o[0]; }
function monThrowV(st, p, charge) {
  const side = monSide(st, p), k = st.kitchen, gate = side > 0 ? k.x1 : k.x0, c = Math.cos(MONSTER.ang), tn = Math.tan(MONSTER.ang);
  const rx = p.x + p.w / 2 + side * 10, ry = p.y + 2;
  let d = st.dMin + (st.dMax - st.dMin) * charge;
  // a short throw from the back of the floating treehouse (room 4) would dip through the platform end under the
  // fence: it flies just far enough to clear that tile (solved for a grounded chef, so a jump throw lands on the same
  // spot); the X shows where
  const ry0 = k.floor - p.h + 2, dx = Math.abs(gate + side * T - rx), room = k.floor - MONSTER.foodR - 3 - ry0 + dx * tn;
  if (room > 0) {
    const vMin = Math.sqrt(MONSTER.gF * dx * dx / (2 * c * c * room));
    if (monSpeed(st, Math.abs(gate + side * d - rx), ry0) < vMin) {
      const a = MONSTER.gF / (2 * vMin * vMin * c * c), h = (st.fieldY - MONSTER.refDrop) - ry0;
      d = (tn + Math.sqrt(tn * tn + 4 * a * h)) / (2 * a) + side * (rx - gate);
    }
  }
  const v = monSpeed(st, Math.abs(gate + side * d - rx), ry);
  return { x: rx, y: ry, vx: side * v * c, vy: -v * Math.sin(MONSTER.ang), d, side, tx: gate + side * d, gate: gate + side * T };
}
// one physics step of a food; returns 'ground' | 'wall' | 'ceil' | 'out' | null
function monFoodStep(f, dt) {
  const R = MONSTER.foodR;
  f.px = f.x; f.py = f.y;
  f.vy += MONSTER.gF * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.spin = (f.spin || 0) + f.vx * dt * 0.05;
  if (f.x < -40 || f.x > W + 40 || f.y > H + 40) return 'out';
  if (f.noTiles) return null;                                                          // a toss flies straight into the mouth
  if (f.gate != null && (f.side > 0 ? f.x < f.gate : f.x > f.gate)) return null;      // chef food flies clear of the kitchen first
  const tyc = Math.floor(f.y / T);
  if (f.vx > 0 && monSolid(Math.floor((f.x + R) / T), tyc)) { f.x = Math.floor((f.x + R) / T) * T - R - 0.01; f.vx = -f.vx * MONSTER.wallBounce; return 'wall'; }
  if (f.vx < 0 && monSolid(Math.floor((f.x - R) / T), tyc)) { f.x = (Math.floor((f.x - R) / T) + 1) * T + R + 0.01; f.vx = -f.vx * MONSTER.wallBounce; return 'wall'; }
  if (f.vy > 0) {
    const ty = Math.floor((f.y + R) / T), top = ty * T, ch = ty >= 0 ? tile(Math.floor(f.x / T), ty) : '.';
    if (ch === '#' || (ch === '=' && f.py + R <= top + 0.5)) { f.y = top - R; return 'ground'; }
  } else if (f.vy < 0) {
    const ty = Math.floor((f.y - R) / T);
    if (monSolid(Math.floor(f.x / T), ty)) { f.y = (ty + 1) * T + R; f.vy = -f.vy * 0.3; return 'ceil'; }
  }
  return null;
}
// predicted path (aim preview, ghost X, bots): dots, the catch-height crossing and the first ground contact
function monPredict(st, v) {
  const f = { x: v.x, y: v.y, vx: v.vx, vy: v.vy, spin: 0, gate: v.gate, side: v.side }, pts = [], dt = DT;
  let cross = null, land = null;
  const refY = st.fieldY - MONSTER.refDrop;
  for (let k = 0; k < 600; k++) {
    const r = monFoodStep(f, dt);
    if (k % 7 === 0) pts.push([f.x, f.y]);
    if (!cross && f.vy > 0 && f.py < refY && f.y >= refY) cross = { x: f.x, y: refY, t: k * dt };
    if (r === 'ground') { land = { x: f.x, y: f.y + MONSTER.foodR, t: k * dt }; break; }
    if (r === 'out') break;
  }
  return { pts, cross, land };
}
function monFloat(x, y, str, col, size = 16) {
  const st = G.mst; if (!st.fx) return;
  st.fx.push({ x, y, str, col, size, t: 0, life: 0.9 });
  if (st.fx.length > 14) st.fx.shift();
}
// a monster says something (Yum!, Bleh!, Oh, OK!, Hey!, Hmm…): one column beside its mouth on the field side, kept
// under its meter and craving bubble (monFxPos). The same word again re-pops it; a new word stacks above the other
// one (at most two at a time: a third replaces the oldest, so the stack never squashes against the meter)
function monSay(m, str, col, size) {
  const st = G.mst; if (!st.fx) return;
  const live = st.fx.filter(q => q.m === m && q.mouth && q.t < 0.6), same = live.find(q => q.str === str);
  if (same) { same.t = 0; return; }
  if (live.length >= 2) { const old = live.reduce((a, b) => a.t > b.t ? a : b); old.t = old.life; live.splice(live.indexOf(old), 1); }   // two at a time
  const fk = hudBig() ? 1.2 : 1, off = live.length ? Math.min(...live.map(q => q.off - q.t / q.life * 30)) - 24 * fk : 0;
  st.fx.push({ x: 0, y: 0, str, col, size, t: 0, life: 0.9, m, mouth: true, off });
  if (st.fx.length > 14) st.fx.shift();
}
function monPuff(kind, x, y, vx, vy, life) {
  const st = G.mst; if (!st.puffs) return;
  st.puffs.push({ kind, x, y, vx, vy, t: 0, life });
  if (st.puffs.length > 20) st.puffs.shift();
}
function monCancel(st) { st.charging = false; st.holdT = 0; st.charge = 0; st.preview = null; }
function monThrow(st, p) {
  const v = monThrowV(st, p, st.holdT < MONSTER.tapT ? 0 : st.charge);
  const pred = monPredict(st, v); p.face = v.side;
  st.foods.push({ x: v.x, y: v.y, px: v.x, py: v.y, vx: v.vx, vy: v.vy, gate: v.gate, side: v.side, type: st.hand, wantAt: st.handWant, from: 'chef',
    bounced: false, bonked: false, full: false, spin: 0, t: 0, land: pred.land, cross: pred.cross });
  st.stats.throws++; st.thrown = true;
  st.hand = null; st.handWant = null; st.reload = MONSTER.reloadT; st.popAnim = 0; st.grabQ = null;
  monCancel(st);
  Sfx.play('monThrow', p.id); rumble(p.id, 0, 0.25, 50);
  p.sx = 1.15; p.sy = 0.85;
}
function monCatchCheck(st, f, c) {
  if (f.from !== 'chef' || !c.alive) return false;
  const rim = monRim(c), prev = st.rimPrev || rim;
  const half = st.big ? MONSTER.bigCatchHalf : MONSTER.catchHalf, mag = st.big ? MONSTER.bigMagnetR : MONSTER.magnetR;
  const rel = f.y - rim.y, relPrev = f.py - prev.y, dx = rim.x - f.x;
  if (f.vy > 0 && rel < 0 && rel > -MONSTER.magnetH && Math.abs(dx) < mag) f.x += Math.sign(dx) * Math.min(Math.abs(dx), MONSTER.magnetV * DT);
  if (relPrev < 0 && rel >= 0 && Math.abs(rim.x - f.x) <= half && f.vy - c.vy > 0) {
    if (st.basket.length >= MONSTER.cap) {
      if (!f.full) { monFloat(rim.x, rim.y - 30, 'Full!', C.paper, 15); Sfx.play('monBounce'); }
      f.vy = -Math.abs(f.vy) * 0.5; f.vx += (f.x < rim.x ? -70 : 70); f.y = rim.y - 1; f.full = true;
      return false;
    }
    st.basket.push(f.type); st.bwant.push(f.wantAt); st.splatRun = 0; st.idle[c.id] = 0;
    st.stats.catches++; st.streak++; st.stats.best = Math.max(st.stats.best, st.streak); st.stats.caught[c.id]++;
    Sfx.play('monCatch', c.id); rumble(c.id, 0, 0.3, 50);
    c.sy = 0.85; c.sx = 1.12; st.hop = 0.12;
    puff(rim.x, rim.y, 4, 'rgba(255,255,255,0.85)');
    if (f.bounced) monFloat(rim.x, rim.y - 30, 'Phew!', C.paper, 15);
    return true;
  }
  return false;
}
function monAddSplat(st, f) {
  st.splats.push({ x: f.x, y: f.y + MONSTER.foodR, type: f.type, t: 0, seed: (st.stats.throws * 7 + st.splats.length) % 5 });
  if (st.splats.length > MONSTER.maxSplats) st.splats.shift();
  burst(f.x, f.y + 4, MONSTER_COL[f.type] || '#ff6b6b', 8);
  Sfx.play('monSplat');
  if (f.from === 'chef') monMiss(st);
}
// a chef food nobody caught (splat, or off the screen)
function monMiss(st) {
  st.stats.splats++; st.streak = 0; st.splatRun++;   // dropped food is its own tile, not a Falls (def.noFalls)
  if (!st.big && st.splatRun >= MONSTER.helpSplats) {
    st.big = true; st.bigPop = 0.9; st.stats.helps++;
    Sfx.play('monHelp'); rumble(st.catcher, 0, 0.4, 90);
  }
}
function monNear(st, x, y, range) {
  let best = null, bd = range;
  for (const m of st.monsters) {
    if (m.full || m.state !== 'up') continue;
    const d = Math.hypot(m.mx - x, m.my - y);
    if (d <= bd) { bd = d; best = m; }
  }
  return best;
}
// the hungry monster the catcher should head for (nearest awake mouth)
function monTarget(st, c) {
  let best = null, bd = 1e9;
  const r = monRim(c);
  for (const m of st.monsters) { if (m.full) continue; const d = Math.hypot(m.mx - r.x, m.my - r.y) + (m.state === 'down' ? 2000 : 0); if (d < bd) { bd = d; best = m; } }
  return best;
}
function monTossFlying(st, m) { return st.foods.some(g => g.from === 'toss' && !g.dead && g.target === m.i); }
// wantAt: the craving when the chef took this food from its crate (room 2). Munch eats what it asked for, even if it
// changed its mind while the food was on the way
function monBite(st, m, type, p, wantAt) {
  const def = G.level.def;
  if (def.bins && type !== st.want && type !== 'gold' && type !== wantAt) {
    m.g = Math.min(100, m.g + MONSTER.gWrong); m.spitT = 0.5; m.chomp = 0.25;
    st.wrongRun = st.wrongType === type ? st.wrongRun + 1 : 1; st.wrongType = type;
    st.foods.push({ x: m.mx, y: m.my, px: m.mx, py: m.my, vx: m.face * 160, vy: -300, type, from: 'spit', bounced: true, spin: 0, t: 0 });
    burst(m.mx, m.my, '#c9f27a', 5);
    monSay(m, 'Bleh!', '#c9f27a', 18); Sfx.play('monBleh'); st.stats.wrong++;
    if (st.wrongRun >= MONSTER.giveIn) {
      st.want = type; st.wantPop = 0.25; st.wantT = 0; st.wrongRun = 0; st.gaveIn = true;   // kept when this ends the trip
      monSay(m, 'Oh, OK!', C.paper, 16); Sfx.play('monWant');
    }
    return;
  }
  const n = type === 'gold' ? 2 : 1;
  st.tripGood++; st.wantT = 0; st.wrongRun = 0; st.idle[p.id] = 0;
  m.eaten = Math.min(m.need, m.eaten + n); m.g = Math.max(0, m.g - (type === 'gold' ? MONSTER.gGold : MONSTER.gBite));
  m.chomp = 0.25; m.yum = 0.6; st.stats.bites++; st.stats.fed[p.id] += n;
  if (type === 'gold') burst(m.mx, m.my, C.gold, 12); else burst(m.mx, m.my, MONSTER_COL[type], 6);
  Sfx.play(type === 'gold' ? 'monGold' : 'monChomp');
  rumble(p.id, 0.1, 0.3, 60);
  if (m.eaten >= m.need) {
    m.full = true; m.g = 0; m.burpT = 0.45; m.zzzT = 1.2; m.gobbling = false;
    Sfx.play('monFull'); rumble(0, 0.2, 0.4, 120); rumble(1, 0.2, 0.4, 120);
    for (let k = 0; k < 12; k++) confetti(m.bx, m.by - 40);
    if (!st.monsters.every(o => o.full)) monFloat(m.bx, m.by - m.bry - 30, 'All full!', C.gold, 20);
  } else monSay(m, type === 'gold' ? '+2 Yum!' : 'Yum!', type === 'gold' ? C.gold : C.paper, 17);
}
function monTantrum(st, m) {
  m.state = 'tantrum'; m.t = MONSTER.tantrumT; m.tantrums++; m.shock = 0.4; m.gobbling = false;
  st.roomTantrums++; st.stats.tantrums++;
  m.mul = Math.max(MONSTER.riseMin, m.mul * MONSTER.riseMul);
  Sfx.play('monRoar'); if (!reduceMotion) G.shake = 0.3;
  for (let k = 0; k < 6; k++) puff(m.ax + (k - 2.5) * 22, m.ay - 2, 3, 'rgba(255,255,255,0.8)');
  burst(m.bx, m.by - m.bry * 0.5, '#ff5a5a', 10);
  const c = G.players[st.catcher];
  // the shockwave knocks a nearby catcher back and spills the basket
  if (c.alive && Math.abs(c.x + c.w / 2 - m.mx) < MONSTER.shockR) {
    const dir = Math.sign(c.x + c.w / 2 - m.mx) || -m.face || 1;
    knock(c, dir * 260, -260, 0.4, 0.3);
    rumble(c.id, 0.7, 0.6, 300);
    const r = monRim(c);
    while (st.basket.length) {
      const type = st.basket.pop(); st.bwant.pop();
      st.foods.push({ x: r.x, y: r.y - 6, px: r.x, py: r.y - 6, vx: (MODES.monster.rand() - 0.5) * 220, vy: -260 - MODES.monster.rand() * 120, type, from: 'spill', bounced: true, spin: 0, t: 0 });
      st.stats.spilled++;
    }
  } else rumble(c.id, 0.2, 0.3, 150);
  rumble(st.thrower, 0.3, 0.3, 200);
}
// a feeding trip ended (the basket is empty at the mouth): a picky monster picks a new craving (only after a trip
// with at least one good bite: a trip of spat-out food keeps the old one), a peek-a-boo monster moves
function monTripDone(st, m) {
  if (G.level.def.bins) { if (!st.gaveIn && st.tripGood) monNewWant(st); st.gaveIn = false; st.tripGood = 0; }
  if (st.order) monSwapBurrow(st, m);
}
function monNewWant(st) {
  const opts = st.bins.map(b => b.type).filter(t => t !== st.want);
  // wrongRun is kept: the same wrong food twice in a row counts across a craving change, so a kid who keeps bringing
  // apples gets "Oh, OK!" by the second trip at the latest
  st.want = opts[Math.floor(MODES.monster.rand() * opts.length)]; st.wantPop = 0.25; st.wantT = 0; st.gaveIn = false;
  Sfx.play('monWant');
}
function monSwapBurrow(st, m) {
  m.state = 'down'; m.t = MONSTER.popT; m.open = 0; m.gobbling = false; Sfx.play('monDive');
  st.orderI = (st.orderI + 1) % st.order.length; m.nextBurrow = st.order[st.orderI];
  for (let k = 0; k < 3; k++) monPuff('bubble', m.ax + (k - 1) * 14, m.ay - 6, (k - 1) * 10, -40 - k * 12, 0.7 + k * 0.1);
}
// the act key a player sees in hints (same detection as golfKeys)
function monKey(id) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad'; // (each player's own device: js/controls.js)
  return pad ? glyph('act') : touch ? 'throw' : id === 0 ? 'F' : '/';
}
function monTouchHint() { return document.documentElement.classList.contains('has-touch') && Pads.kind === 'touch'; }

MODES.monster = {
  medals: { bronze: 'Fill up every monster', goals: [{ key: 'stars', gold: 11, silver: 8, more: true, text: n => `${n} of 12 stars or more`, gap: (v, n) => `${n - v} more star${n - v === 1 ? '' : 's'}` }, { key: 'time', gold: 225 }] },
  medalValues() { const s = G.mst.stats; return s ? { stars: s.stars.reduce((a, b) => a + b, 0) } : {}; },
  rand: Math.random,
  // test hooks for bots (no engine edits)
  K: MONSTER, predict: monPredict, throwV: monThrowV, rim: monRim, foodStep: monFoodStep, key: monKey,
  fxPos: monFxPos, meterBox: monMeterBox, meterY: monMeterY, meterX: monMeterX,
  setup(st, L) {
    st.stats = { throws: 0, catches: 0, splats: 0, bites: 0, wrong: 0, tantrums: 0, spilled: 0, bonks: 0, tosses: 0, best: 0, helps: 0, bonksTwins: 0,
      caught: [0, 0], fed: [0, 0], stars: [], roomT: [] };
    st.streak = 0; st.roomTimes = []; st.tossTaught = [false, false];
    monInitRoom(st, L);
  },
  room(k, L) { monInitRoom(G.mst, L); },
  onKill(p) {
    const st = G.mst;
    if (p.id === st.catcher && st.basket) { st.stats.spilled += st.basket.length; st.basket = []; st.bwant = []; }
    if (p.id === st.thrower) monCancel(st);
  },
  step(dt) {
    const st = G.mst, L = G.level, ps = G.players, th = ps[st.thrower], c = ps[st.catcher], K = MONSTER;
    if (!st.kitchen) return;
    // C3: a charge whose button was let go during a pause is dropped silently
    if (st.sawPause) { if (st.charging && !th.input.act) monCancel(st); st.sawPause = false; }
    const intro = G.introT > 0;
    // idle timers (AFK pause)
    for (const p of ps) { const i = p.input; st.idle[p.id] = (i.left || i.right || i.jump || i.down || i.act) ? 0 : st.idle[p.id] + dt; }
    // the chef stays in the kitchen; nobody walks into a big monster
    const k = st.kitchen;
    if (th.alive) {
      if (th.x < k.x0) { th.x = k.x0; th.vx = Math.max(0, th.vx); }
      if (th.x + th.w > k.x1) { th.x = k.x1 - th.w; th.vx = Math.min(0, th.vx); }
    }
    for (const m of st.monsters) if (m.wall != null) for (const p of ps) {
      if (m.face < 0 && p.x + p.w > m.wall) { p.x = m.wall - p.w; p.vx = Math.min(0, p.vx); }
      if (m.face > 0 && p.x < m.wall) { p.x = m.wall; p.vx = Math.max(0, p.vx); }
    }
    if (st.charging) th.vx = clamp(th.vx, -PHYS.maxRun * K.chargeSlow, PHYS.maxRun * K.chargeSlow);
    // act presses are used up every tick, whether or not they can do something
    const thAct = th.pendingAct, cAct = c.pendingAct;
    th.pendingAct = false; c.pendingAct = false;
    // ---- the chef
    if (st.done) { if (st.charging) monCancel(st); }
    else if (!intro) {
      if (st.pot && !st.hand) { st.reload -= dt; if (st.reload <= 0) { st.hand = monNextFood(st); st.popAnim = 0.2; Sfx.play('monPop'); } }
      // crates: the same 0.5 s between throws as the pot. A grab pressed sooner wiggles the crate at once and is
      // remembered with its crate: the food comes when the reload ends, even if the chef walked off
      const cx = th.x + th.w / 2, bin = st.bins.find(b => cx >= b.x && cx < b.x + T);
      if (!st.pot && st.reload > 0) st.reload -= dt;
      if (!st.pot && st.grabQ && st.reload <= 0) {
        const q = st.grabQ; st.grabQ = null;
        if (th.alive && !st.hand) { st.hand = q.type; st.handWant = st.want; q.pop = 0.2; Sfx.play('monPop'); }
      }
      if (thAct) {
        if (bin && th.alive && !st.hand && st.reload > 0) { st.grabQ = bin; bin.pop = 0.2; Sfx.play('monTick', th.id); }
        else if (bin && th.alive && st.hand !== bin.type) {
          if (st.charging) monCancel(st);
          st.hand = bin.type; st.handWant = st.want; bin.pop = 0.2; Sfx.play('monPop'); st.grabQ = null;
        } else if (st.hand && th.alive && th.stun <= 0) { st.charging = true; st.holdT = 0; st.charge = 0; st.chTick = 0; }
        else { st.shrug = 0.5; st.shrugMsg = 1.0; Sfx.play('monShrug', th.id); }
      }
      if (st.charging) {
        if (!th.alive || !st.hand) monCancel(st);
        else if (th.input.act) {
          st.holdT += dt; const was = st.charge;
          st.charge = clamp((st.holdT - K.tapT) / K.chargeT, 0, 1);
          if (st.charge > 0 && st.charge < 1) {
            st.chTick += dt;
            if (st.chTick >= 0.1) { st.chTick = 0; Sfx.tone((300 + 400 * st.charge) * (th.id ? 0.84 : 1), 0.05, 'square', 0.02); }
          }
          if (was < 1 && st.charge >= 1) { Sfx.play('monReady', th.id); rumble(th.id, 0, 0.25, 50); st.fullFlash = 0.1; }
        } else monThrow(st, th);
      }
      if (L.def.bins && !st.hand && !st.grabShown && G.introT <= 0) { st.grabShown = true; st.grabMsg = 2; }
    }
    // aim preview while charging past the tap time; the faint tap-spot X while holding food
    st.preview = (st.charging && st.holdT >= K.tapT && st.hand) ? monPredict(st, monThrowV(st, th, st.charge)) : null;
    st.ghost = (!st.charging && st.hand && !intro && !st.done && th.alive) ? monPredict(st, monThrowV(st, th, 0)).land : null;
    // ---- the catcher: toss into a nearby mouth, or a harmless basket hop
    st.tossCD -= dt;
    if (cAct && !st.done && !intro) {
      const r = monRim(c), m = st.basket.length && c.alive && c.stun <= 0 ? monNear(st, r.x, r.y, K.tossRange) : null;
      if (m && st.tossCD <= 0) {
        const type = st.basket.pop(), wantAt = st.bwant.pop(), dx = m.mx - r.x, dy = m.my - (r.y - 4), t = 0.35 + Math.hypot(dx, dy) / 900;
        st.foods.push({ x: r.x, y: r.y - 4, px: r.x, py: r.y - 4, vx: dx / t, vy: (dy - 0.5 * K.gF * t * t) / t, type, wantAt, from: 'toss', target: m.i, tT: t,
          noTiles: true, bounced: true, spin: 0, t: 0 });
        st.tossCD = K.tossCD; st.stats.tosses++; st.tossMsgT = 0; st.tossTaught[c.id] = true;
        Sfx.play('monToss', c.id); c.sy = 0.88; c.sx = 1.08;
      } else { st.hop = 0.25; Sfx.play('monHop', c.id); }
    }
    // ---- foods
    for (const f of st.foods) {
      if (f.dead) continue;
      f.t += dt;
      const r = monFoodStep(f, dt);
      if (r === 'out' || f.t > K.foodLife) { f.dead = true; if (f.from === 'chef') monMiss(st); continue; }
      if (f.from === 'toss') {
        const m = st.monsters[f.target];
        if (m && !m.full && m.state === 'up' && (Math.hypot(f.x - m.mx, f.y - m.my) < 22 || f.t >= f.tT)) {
          f.dead = true; monBite(st, m, f.type, c, f.wantAt);
          if (!st.basket.length && !m.full && !monTossFlying(st, m)) monTripDone(st, m);
          continue;
        }
        if (f.t >= f.tT + 0.05) f.noTiles = false;     // its monster fell asleep: it drops and splats
      }
      if (f.from === 'chef' && !st.done && monCatchCheck(st, f, c)) { f.dead = true; continue; }
      if (f.from === 'chef' && !f.bonked) for (const m of st.monsters) {
        if (m.state !== 'up' && m.state !== 'tantrum') continue;
        const ex = (f.x - m.bx) / (m.brx + K.foodR), ey = (f.y - m.by) / (m.bry + K.foodR);
        if (ex * ex + ey * ey < 1) {
          f.bonked = true; f.vx = -f.vx * 0.4 + (f.x < m.bx ? -60 : 60); f.vy = -220;
          if (m.bonkCD <= 0 && !m.full) {
            m.g = Math.min(100, m.g + K.gBonk); m.bonkCD = K.bonkCD; m.ouch = 0.5; st.stats.bonks++; if (m.name !== 'Munch') st.stats.bonksTwins++;
            monSay(m, 'Hey!', '#ffb0a0', 18); Sfx.play('monBonk'); rumble(st.thrower, 0, 0.2, 40);
          }
          break;
        }
      }
      if (r === 'ground') {
        if (!f.bounced) { f.bounced = true; f.vy = -Math.abs(f.vy) * K.bounceY; f.vx *= K.bounceX; Sfx.play('monBounce'); puff(f.x, f.y + K.foodR, 3, 'rgba(255,255,255,0.8)'); }
        else { f.dead = true; monAddSplat(st, f); }
      }
    }
    st.foods = st.foods.filter(f => !f.dead);
    st.rimPrev = monRim(c);
    // ---- monsters. AFK pause: grumpiness waits while either player has not played for afkT s
    st.afk = Math.max(st.idle[0], st.idle[1]) >= K.afkT;
    const tgt = st.basket.length >= K.cap ? monTarget(st, c) : null;
    for (const m of st.monsters) {
      m.bonkCD -= dt; m.chomp = Math.max(0, m.chomp - dt); m.yum = Math.max(0, m.yum - dt); m.ouch = Math.max(0, m.ouch - dt);
      m.spitT = Math.max(0, m.spitT - dt); m.shock = Math.max(0, m.shock - dt); m.popA = Math.max(0, m.popA - dt);
      if (m.kind === 'head') {
        const r = monRim(c), z = c.alive && m.state === 'up' && !m.full && Math.abs(r.x - m.mx) <= K.feedDX + 6 && Math.abs(r.y + 7 - m.my) <= K.feedDY;
        m.lift = approach(m.lift, z ? 18 : 0, dt * 120);
      }
      if (m.full) {
        m.open = approach(m.open, 0, dt * 6);
        if (m.burpT > 0) { m.burpT -= dt; if (m.burpT <= 0) { Sfx.play('monBurp'); monFloat(m.mx, m.my - 30, 'Burp!', C.paper, 16); m.chomp = 0.25; } }
        m.zzzT -= dt; if (m.zzzT <= 0) { m.zzzT = 0.6; monPuff('zzz', m.bx + m.face * 18, m.by - m.bry + 6, m.face * 12, -34, 1.6); }
        continue;
      }
      if (m.state === 'tantrum') { m.t -= dt; m.open = 1; if (m.t <= 0) { m.state = 'up'; m.g = K.gAfter; m.open = 0; } continue; }
      if (m.state === 'down') {
        m.t -= dt;
        if (m.t <= 0) {
          m.burrow = m.nextBurrow; m.state = 'up'; monPlace(st); m.popA = 0.2; Sfx.play('monPeek');
          puff(m.ax, m.ay - 4, 6, 'rgba(160,120,90,0.8)'); m.shock = 0.4; m.ring = true;
          monFloat(m.bx, monMeterY(st, m) - 8 - 12 * (hudBig() ? 1.4 : 1), 'Here!', C.paper, 17);   // just above its meter
        }
        continue;
      }
      // feeding: the basket in front of the mouth
      const r = monRim(c), bxc = r.x, byc = r.y + 7;
      const inZone = c.alive && Math.abs(bxc - m.mx) <= K.feedDX + (m.kind === 'head' ? 6 : 0) && Math.abs(byc - m.my) <= K.feedDY;
      const near = st.basket.length && Math.hypot(bxc - m.mx, byc - m.my) < 140;
      m.open = approach(m.open, inZone || near || tgt === m ? 1 : 0, dt * 6);
      m.gobbling = inZone && st.basket.length > 0;
      if (m.gobbling) {
        m.gobble -= dt;
        if (m.gobble <= 0) {
          m.gobble = K.gobbleT; { const wa = st.bwant.pop(); monBite(st, m, st.basket.pop(), c, wa); }
          if (!st.basket.length && !m.full && !monTossFlying(st, m)) monTripDone(st, m);
          if (m.full || m.state !== 'up') continue;
        }
      } else m.gobble = 0.05;
      m.ring = false;
      // grumpiness
      if (!intro && !st.done && !st.afk && !m.gobbling) m.g += m.rise * m.mul * dt;
      if (m.g >= 90 && !intro && !st.afk) { m.growlT -= dt; if (m.growlT <= 0) { m.growlT = 0.8; Sfx.play('monGrowl'); } } else m.growlT = 0.3;
      if (m.g >= 75) { m.steamT -= dt; if (m.steamT <= 0) { m.steamT = 0.35; monPuff('steam', m.bx - m.face * 10 * m.scale + (m.kind === 'head' ? 0 : 0), m.by - m.bry + 2, -m.face * 18, -40, 0.8); } }
      if (m.g >= 100) { m.g = 100; monTantrum(st, m); }
    }
    // room 2: a new craving after wantT s without a correct bite (it keeps running in the AFK pause: a chef throwing
    // the wrong food at a catcher who waits for the right one still gets a new bubble)
    if (L.def.bins && !intro && !st.done) {
      st.wantT += dt;
      if (st.wantT >= K.wantT) { const m = st.monsters[0]; monNewWant(st); monSay(m, 'Hmm… no, this!', C.paper, 15); }
    }
    // toss prompt: the first time each player (as catcher) could toss: in range, but not already gobbling at the mouth
    {
      const r = monRim(c), m = !st.done && !intro && st.basket.length && c.alive ? monNear(st, r.x, r.y, K.tossRange) : null;
      st.tossable = !!(m && !m.gobbling && Math.hypot(m.mx - r.x, m.my - r.y) > 45);
      if (!st.tossTaught[c.id] && st.tossable) { st.tossMsgT = 4; st.tossTaught[c.id] = true; }
    }
    // ---- room done: everybody is full
    if (!st.done && st.monsters.every(m => m.full)) {
      st.done = true; st.doneT = K.doneT; st.doneAge = 0;
      st.roomStars = st.roomTantrums === 0 ? 3 : st.roomTantrums === 1 ? 2 : 1;
      st.stats.stars.push(st.roomStars); st.roomTimes.push(G.time - st.roomStart); st.stats.roomT.push(st.roomTantrums);
      for (const f of st.foods) puff(f.x, f.y, 4, 'rgba(255,255,255,0.8)');
      st.foods = []; monCancel(st);
    }
    if (st.done) {
      const a0 = st.doneAge; st.doneAge += dt; st.doneT -= dt;
      for (let i = 0; i < 3; i++) { const at = 0.55 + i * 0.15; if (a0 < at && st.doneAge >= at && i < st.roomStars) Sfx.play('monStar'); }
      if (st.doneT <= 0) {
        if (L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return; }
        levelClear(); return;
      }
    }
    // effects
    st.hop = Math.max(0, st.hop - dt); st.shrug = Math.max(0, st.shrug - dt); st.shrugMsg = Math.max(0, st.shrugMsg - dt);
    st.bigPop = Math.max(0, st.bigPop - dt); st.fullFlash = Math.max(0, st.fullFlash - dt); st.popAnim = Math.max(0, st.popAnim - dt);
    st.wantPop = Math.max(0, st.wantPop - dt);
    if (G.introT <= 0.4) st.grabMsg = Math.max(0, st.grabMsg - dt);
    if (st.tossMsgT > 0 && st.tossable && G.introT <= 0.4) st.tossMsgT = Math.max(0, st.tossMsgT - dt);
    for (const b of st.bins) b.pop = Math.max(0, b.pop - dt);
    if (st.big) { st.sparkT -= dt; if (st.sparkT <= 0 && c.alive) { st.sparkT = 0.4; const r = monRim(c); monPuff('spark', r.x + (MODES.monster.rand() - 0.5) * 40, r.y + 4, 0, -20, 0.5); } }
    for (const f of st.foods) if (f.type === 'gold') { f.sp = (f.sp || 0) - dt; if (f.sp <= 0) { f.sp = 0.1; monPuff('spark', f.x, f.y, 0, 10, 0.4); } }
    for (const s of st.splats) s.t += dt;
    st.splats = st.splats.filter(s => s.t < K.splatLife);
    for (const q of st.fx) q.t += dt;
    st.fx = st.fx.filter(q => q.t < q.life);
    for (const q of st.puffs) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    st.puffs = st.puffs.filter(q => q.t < q.life);
  },
  draw() {
    const st = G.mst; if (!st.kitchen) return;
    if (G.mode === 'paused') st.sawPause = true;
    monDrawWorld(st);
  },
  drawTop() { const st = G.mst; if (st.kitchen) monDrawTop(st); },
  hud() { const st = G.mst; if (st.kitchen) monDrawHUD(st); },
  stats() {
    const s = G.mst.stats, stars = s.stars.reduce((a, b) => a + b, 0);
    // dropped food has its own tile (the level has no Falls: def.noFalls)
    const tl = s.tantrums + (s.tantrums === 1 ? ' tantrum' : ' tantrums');
    const line = s.tantrums === 0 ? 'Not one tantrum. Happy monsters!'
      : s.bonks >= 5 ? (s.bonksTwins ? 'Monsters got bonked ' : 'Munch got bonked ') + s.bonks + ' times. Hey!'
      : tl + ', but everyone got full!';
    const out = [
      { label: 'Stars', value: stars + ' / 12' },
      { label: 'Catches', values: s.caught.slice() },
      { label: 'Dropped', value: String(s.splats) },
      s.tosses > 0 ? { label: 'Tossed in', value: String(s.tosses) } : { label: 'Best streak', value: String(s.best) },
    ];
    out.push(line);
    return out;
  },
};

/* ---- drawing ---- */
// grumpy colour ramp: mixed toward #c0629a in HSL, along the hue path that avoids blue (an RGB mix turned mint Nom
// grey: mint -> yellow -> orange -> red reads as "heating up"; purple Munch goes via magenta)
function monHsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s2 = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s2, l];
}
function monGrumpyMix(a, b, t) {
  const A = monHsl(a), B = monHsl(b), k = clamp(t, 0, 1);
  const up = (B[0] - A[0] + 360) % 360, down = up - 360;
  const hits = d => { for (let i = 0; i <= 12; i++) { const h = (A[0] + d * i / 12 + 360) % 360; if (h > 185 && h < 235) return true; } return false; };
  const dh = hits(up) && !hits(down) ? down : !hits(up) && hits(down) ? up : (Math.abs(up) < Math.abs(down) ? up : down);
  const kh = Math.abs(dh) > 120 ? Math.sqrt(k) : k;   // a long hue trip (mint) hurries past yellow-green
  const h = (A[0] + dh * kh + 360) % 360, sat = Math.max(A[1] + (B[1] - A[1]) * k, 0.58 * k + Math.min(A[1], B[1]) * (1 - k));
  return 'hsl(' + h.toFixed(1) + ',' + (sat * 100).toFixed(1) + '%,' + ((A[2] + (B[2] - A[2]) * k) * 100).toFixed(1) + '%)';
}
function monBodyCol(m) {
  const base = MONSTER_BODY[m.name] || MONSTER_BODY.Munch;
  if (m.state === 'tantrum') return reduceMotion && Math.floor(G.clock * 8) % 2 ? base : '#e2566b';
  if (!m.full && m.g >= 75) return monGrumpyMix(base, '#c0629a', (m.g - 75) / 25);
  return base;
}
function monDrawFood(type, x, y, s = 1, rot = 0) {
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (s !== 1) ctx.scale(s, s);
  ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round';
  if (type === 'apple') {
    ctx.fillStyle = '#e5413a'; circle(0, 1, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(-3.5, -2, 2.6); ctx.fill();
    ctx.strokeStyle = '#6b4630'; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(1, -12); ctx.stroke();
    ctx.fillStyle = '#5cc27f'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(5.5, -11, 4.5, 2.2, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (type === 'cake') {
    ctx.fillStyle = '#f6e0b5'; rr(-9, -1, 18, 10, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff9ccf'; ctx.beginPath(); ctx.arc(0, -1, 9, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; rr(-6, -5, 5, 2.5, 1.2); ctx.fill();
    ctx.fillStyle = '#e5413a'; circle(0, -11, 3); ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
  } else if (type === 'gold') {
    ctx.fillStyle = '#e0a320'; ctx.beginPath(); ctx.moveTo(-9, -1); ctx.lineTo(9, -1); ctx.lineTo(6, 10); ctx.lineTo(-6, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#b9850f'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (const dx of [-4, 0, 4]) { ctx.moveTo(dx, 1); ctx.lineTo(dx * 0.8, 8); }
    ctx.stroke(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.fillStyle = '#ffd75a'; ctx.beginPath(); ctx.arc(0, -1, 10, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e5413a'; circle(0, -12, 3); ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; circle(-4.5, -5, 1.6); ctx.fill(); circle(4, -3.5, 1.3); ctx.fill(); circle(1, -7, 1); ctx.fill();
  } else if (type === 'fish') {
    ctx.fillStyle = '#7fb6e0';
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(14, -6); ctx.lineTo(14, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-1, 0, 10, 6.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-2, -2.5, 5, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; circle(-5.5, -1.2, 2.4); ctx.fill(); ctx.fillStyle = C.ink; circle(-6, -1.2, 1.3); ctx.fill();
  }
  ctx.restore();
}
function monStarShape(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  ctx.closePath();
}
function monX(x, y, w, h, col, lw) {
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - w / 2, y - h / 2); ctx.lineTo(x + w / 2, y + h / 2); ctx.moveTo(x + w / 2, y - h / 2); ctx.lineTo(x - w / 2, y + h / 2); ctx.stroke();
}
// where the monster looks: the nearest flying chef food, else the catcher
function monLook(st, m, ex, ey) {
  let tx = null, ty = null, bd = 1e9;
  for (const f of st.foods) if (f.from === 'chef') { const d = Math.hypot(f.x - ex, f.y - ey); if (d < bd) { bd = d; tx = f.x; ty = f.y; } }
  if (tx === null) { const c = G.players[st.catcher]; tx = c.x + c.w / 2; ty = c.y; }
  const dx = tx - ex, dy = ty - ey, d = Math.hypot(dx, dy) || 1;
  return [dx / d * 3.5, dy / d * 3.5];
}
// face parts shared by the big monster and the burrow head (local coordinates, already scaled)
function monFace(st, m, o) {
  const { ex, ey, er, lmx, lmy, mw, wx, wy, s } = o, t = G.clock, tan = m.state === 'tantrum';
  const blink = ((t + m.i * 1.37) % (3.3 + m.i * 0.8)) < 0.13;
  ctx.lineWidth = 3; ctx.strokeStyle = C.ink;
  // cheeks
  if (m.spitT > 0) { ctx.fillStyle = 'rgba(160,220,90,0.75)'; for (const dx of [-1, 1]) { circle(ex + dx * er * 2.2, ey + er * 1.7, er * 0.9); ctx.fill(); } }
  else if (!m.full && (m.g >= 75 || tan)) { ctx.fillStyle = 'rgba(255,70,70,0.55)'; for (const dx of [-1, 1]) { circle(ex + dx * er * 2.1, ey + er * 1.7, er * 0.8); ctx.fill(); } }
  else if (m.g < 45 || m.full) { ctx.fillStyle = 'rgba(255,120,160,0.45)'; for (const dx of [-1, 1]) { circle(ex + dx * er * 2.1, ey + er * 1.6, er * 0.6); ctx.fill(); } }
  // eyes
  const look = monLook(st, m, wx, wy);
  for (const dx of [-1, 1]) {
    const x = ex + dx * er * 1.3, y = ey;
    if (m.full) { ctx.beginPath(); ctx.arc(x, y - 1, er * 0.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); continue; }
    if (m.ouch > 0) { ctx.beginPath(); ctx.moveTo(x - dx * er * 0.6, y - er * 0.5); ctx.lineTo(x + dx * er * 0.5, y); ctx.lineTo(x - dx * er * 0.6, y + er * 0.5); ctx.stroke(); continue; }
    if (blink) { ctx.beginPath(); ctx.moveTo(x - er * 0.7, y); ctx.lineTo(x + er * 0.7, y); ctx.stroke(); continue; }
    ctx.fillStyle = '#fff'; circle(x, y, er); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink; circle(x + look[0] * s, y + look[1] * s, er * (tan ? 0.32 : 0.45)); ctx.fill();
    if (!tan) { ctx.fillStyle = '#fff'; circle(x + look[0] * s - er * 0.15, y + look[1] * s - er * 0.18, er * 0.12); ctx.fill(); }
  }
  // brows: annoyed 15 deg, grumpy 30 deg (inner ends down)
  const a = tan || m.g >= 75 ? 0.52 : m.g >= 45 ? 0.26 : 0;
  if (a > 0 && !m.full) {
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (const dx of [-1, 1]) {
      const x = ex + dx * er * 1.3, y = ey - er * 1.45, L = er * 0.9;
      ctx.beginPath(); ctx.moveTo(x - dx * L * Math.cos(a), y - L * Math.sin(a)); ctx.lineTo(x + dx * L * Math.cos(a), y + L * Math.sin(a)); ctx.stroke();
    }
  }
  // mouth: open when food is close, chomping on each bite, else a mood line
  let op = tan ? 1 : m.open;
  if (m.chomp > 0) op = Math.max(op, 0.6) * Math.abs(Math.cos((1 - m.chomp / 0.25) * Math.PI));
  ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = C.ink;
  if (op > 0.12) {
    const ry = 4 * s + 14 * s * op;
    ctx.save();
    ctx.fillStyle = '#3a1630'; ctx.beginPath(); ctx.ellipse(lmx, lmy, mw, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#ff8fb0'; ctx.beginPath(); ctx.ellipse(lmx, lmy + ry * 0.8, mw * 0.6, ry * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    for (const dx of [-0.45, 0.45]) { ctx.beginPath(); ctx.moveTo(lmx + dx * mw - 3 * s, lmy - ry); ctx.lineTo(lmx + dx * mw + 3 * s, lmy - ry); ctx.lineTo(lmx + dx * mw, lmy - ry + 6 * s); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(lmx, lmy, mw, ry, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (m.full || m.g < 45) {
    const r = m.full ? mw * 0.9 : mw * 0.7;
    ctx.beginPath(); ctx.arc(lmx, lmy - r * 0.55, r, 0.18 * Math.PI, 0.82 * Math.PI); ctx.stroke();
  } else if (m.g < 75) {
    ctx.beginPath(); ctx.moveTo(lmx - mw * 0.6, lmy); ctx.lineTo(lmx + mw * 0.6, lmy + 1); ctx.stroke();
  } else {
    const r = mw * 0.7;
    ctx.beginPath(); ctx.arc(lmx, lmy + r * 0.75, r, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke();
  }
}
function monDrawBig(st, m) {
  const s = m.scale, tan = m.state === 'tantrum', t = G.clock, f = m.face;
  const bob = m.full ? Math.sin(t * 1.3 + m.i) * 1.2 : Math.sin(t * 2.2 + m.i * 1.7) * 2;
  const hop = tan && !reduceMotion ? -Math.abs(Math.sin((1 - m.t / MONSTER.tantrumT) * Math.PI * 3)) * 12 : 0;
  const ox = !tan && !m.full && m.g >= 90 && !reduceMotion ? Math.sin(t * 70) * 1.5 : 0, oy = bob + hop;
  const body = monBodyCol(m), rx = 58 + 0.8 * m.eaten, ry = 60;
  ctx.save(); ctx.translate(m.bx + ox, m.by + oy); ctx.scale(s, s);
  ctx.lineWidth = 3; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round';
  // feet (they stay on the ground while the body breathes; the front one taps when grumpy)
  const tap = !m.full && !tan && m.g >= 75 ? Math.max(0, Math.sin(t * 9)) * 5 : 0;
  ctx.fillStyle = body;
  rr(-f * 22 - 14, ry - 16 - bob / s, 28, 16, 8); ctx.fill(); ctx.stroke();
  rr(f * 22 - 14, ry - 16 - tap - bob / s, 28, 16, 8); ctx.fill(); ctx.stroke();
  // arms: up when food is coming, waving while gobbling (A = how far they swing out and up)
  const coming = st.foods.some(q => q.from === 'chef' && Math.hypot(q.x - m.mx, q.y - m.my) < 200);
  const A = m.full ? 0.15 : tan ? 2.0 + Math.sin(t * 20) * 0.6 : m.gobbling ? 2.3 + Math.sin(t * 14) * 0.45 : coming ? 2.5 : 0.3;
  for (const dx of [-1, 1]) {
    ctx.save(); ctx.translate(dx * (rx - 6), 6); ctx.rotate(-dx * A);
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 12, 9, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // body (it gets rounder with every bite)
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(-rx * 0.35, -ry * 0.5, rx * 0.32, ry * 0.2, -0.5, 0, Math.PI * 2); ctx.fill();
  // horn
  ctx.fillStyle = C.paper; ctx.beginPath(); ctx.moveTo(-f * 10 - 8, -ry + 6); ctx.lineTo(-f * 12, -ry - 18); ctx.lineTo(-f * 10 + 8, -ry + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  // belly patch with the tummy pie
  const pcx = -f * 8, pcy = 20;
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.ellipse(pcx, pcy, 30, 26, 0, 0, Math.PI * 2); ctx.fill();
  const fr = clamp(m.eaten / m.need, 0, 1);
  if (fr > 0) { ctx.fillStyle = 'rgba(255,197,61,0.8)'; ctx.beginPath(); ctx.moveTo(pcx, pcy); ctx.arc(pcx, pcy, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fr); ctx.closePath(); ctx.fill(); }
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(28,26,54,0.35)'; circle(pcx, pcy, 22); ctx.stroke();
  text(m.eaten + '/' + m.need, pcx, pcy + 1, 15, C.ink, 'center');
  // face
  const lmx = (m.mx - m.bx) / s, lmy = (m.my - m.by) / s;
  monFace(st, m, { ex: f * 12, ey: -28, er: 10, lmx, lmy, mw: 18, wx: m.bx + f * 12 * s, wy: m.by - 28 * s, s: 1 });
  ctx.restore();
  // tantrum: ROAR and a shockwave along the ground
  if (tan) monRoar(st, m);
}
// ROAR! over the meter and the craving bubble, never on them
function monRoar(st, m) {
  const big = hudBig() ? 1.4 : 1, fk = hudBig() ? 1.2 : 1, top = monMeterY(st, m) + 6 - (G.level.def.bins && m.kind === 'big' ? 50 : 10) * big;
  bigText('ROAR!', clamp(monMeterX(m, big), 60, W - 60), Math.max(20, top - 16 * fk) + Math.sin(G.clock * 30) * (reduceMotion ? 0 : 2), Math.round(26 * fk), '#ff5a5a');
}
function monDrawShock(m) {
  if (m.shock <= 0) return;
  const k = 1 - m.shock / 0.4;
  ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
  if (m.ring) { circle(m.bx, m.by, 30 + 34 * k); ctx.stroke(); }     // pop-up: a white ring pulse round the head
  else { const R = MONSTER.shockR * k; ctx.beginPath(); ctx.ellipse(m.kind === 'big' ? m.mx : m.ax, m.ay - 2, Math.max(1, R), Math.max(1, R * 0.12), 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function monDrawHole(b, front) {
  if (!front) {
    ctx.fillStyle = '#2b2850'; ctx.beginPath(); ctx.ellipse(b.x, b.y + 1, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = C.stoneLight; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(b.x, b.y + 1, 27, 7, 0, 0.05 * Math.PI, 0.95 * Math.PI); ctx.stroke();
    ctx.fillStyle = C.stoneLight; circle(b.x - 30, b.y + 1, 3.5); ctx.fill(); circle(b.x + 30, b.y + 1, 3.5); ctx.fill();
  }
}
function monDrawHead(st, m) {
  const b = st.burrows[m.burrow];
  let rise = 1;
  if (m.state === 'down') rise = 1 - clamp((MONSTER.popT - m.t) / 0.25, 0, 1);
  else if (m.popA > 0) rise = 1 - m.popA / 0.2;
  if (rise <= 0) return;
  const tan = m.state === 'tantrum', t = G.clock, body = monBodyCol(m);
  let ox = 0, oy = Math.sin(t * 2.6 + 1) * 1.5;
  if (tan && !reduceMotion) oy -= Math.abs(Math.sin((1 - m.t / MONSTER.tantrumT) * Math.PI * 3)) * 8;
  if (!tan && !m.full && m.g >= 90 && !reduceMotion) ox += Math.sin(t * 70) * 1.5;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, b.y + 1); ctx.clip();
  ctx.translate(b.x + ox, b.y - 30 + (1 - rise) * 64 + oy - m.lift);
  ctx.lineWidth = 3; ctx.strokeStyle = C.ink; ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(0, 0, 30, Math.PI, 0); ctx.lineTo(30, 34 + m.lift); ctx.lineTo(-30, 34 + m.lift); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(-12, -16, 9, 5, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.paper; ctx.beginPath(); ctx.moveTo(-6, -28); ctx.lineTo(-2, -44); ctx.lineTo(4, -28); ctx.closePath(); ctx.fill(); ctx.stroke();
  monFace(st, m, { ex: 0, ey: -12, er: 8, lmx: 0, lmy: 4, mw: 14, wx: b.x, wy: b.y - 42, s: 0.8 });
  ctx.restore();
  if (rise > 0.5) {
    ctx.lineWidth = 2.5; ctx.strokeStyle = C.ink; ctx.fillStyle = body;
    for (const dx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(b.x + dx * 31, b.y - 3, 7, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }
  if (tan) monRoar(st, m);
}
function monMeterY(st, m) {
  if (m.kind === 'head') return st.burrows[m.burrow].y - 128 - (hudBig() ? 14 : 0);   // clear of a stretched-up horn
  return m.by - m.bry - (st.monsters.length > 1 ? 58 : 44);
}
function monMeterBox(st, m) {
  if (m.full || (m.kind === 'head' && m.state === 'down')) return null;
  const big = hudBig() ? 1.4 : 1, my = monMeterY(st, m) + 6, mx = monMeterX(m, big);
  return { x0: mx - 60 * big, x1: mx + 66 * big, y1: my + (m.kind === 'head' || st.monsters.length > 1 ? 27 : 9) * big };
}
// kept fully on screen (on a phone the 1.4x meter of a monster at the wall would be cut off)
function monMeterX(m, big) { return clamp(m.bx, 10 + 60 * big, W - 10 - 66 * big); }
function monDrawMeter(st, m) {
  if (m.full || (m.kind === 'head' && m.state === 'down')) return;
  const big = hudBig() ? 1.4 : 1, my = monMeterY(st, m), g = m.g;
  const col = g >= 75 ? '#ff5a5a' : g >= 45 ? '#ffc53d' : '#7be08a';
  const mx = monMeterX(m, big);
  ctx.save(); ctx.translate(mx, my + 6); ctx.scale(big, big);
  const pulse = g >= 90 && !st.afk ? 0.5 + 0.5 * Math.sin(G.clock * 14) : 0;
  ctx.fillStyle = 'rgba(28,26,54,0.7)'; rr(-50, -8, 100, 16, 8); ctx.fill();
  if (pulse > 0) { ctx.strokeStyle = 'rgba(255,90,90,' + (0.4 + 0.6 * pulse) + ')'; ctx.lineWidth = 2.5; rr(-51, -9, 102, 18, 9); ctx.stroke(); }
  ctx.fillStyle = col; rr(-48, -6, Math.max(8, 96 * clamp(g, 0, 100) / 100), 12, 6); ctx.fill();
  // mood face at the left end
  ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(-50, 0, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; circle(-53, -2, 1.4); ctx.fill(); circle(-47, -2, 1.4); ctx.fill();
  ctx.lineWidth = 1.6; ctx.beginPath();
  if (g < 45) ctx.arc(-50, 0.5, 3.2, 0.15 * Math.PI, 0.85 * Math.PI);
  else if (g < 75) { ctx.moveTo(-53, 3.5); ctx.lineTo(-47, 3.5); }
  else ctx.arc(-50, 6.5, 3.2, 1.2 * Math.PI, 1.8 * Math.PI);
  ctx.stroke();
  // AFK pause: a pause icon at the right end
  if (st.afk) { ctx.fillStyle = '#fff'; ctx.fillRect(56, -5, 3, 10); ctx.fillRect(62, -5, 3, 10); }
  // room 4: the name under the meter; room 3: the tummy under the meter
  if (st.monsters.length > 1) text(m.name, 0, 19, 12, C.ink, 'center', 'body');
  if (m.kind === 'head') {
    ctx.fillStyle = 'rgba(28,26,54,0.7)'; rr(-20, 11, 40, 16, 8); ctx.fill();
    text(m.eaten + '/' + m.need, 0, 19.5, 12, C.gold, 'center', 'body');
  }
  // room 2: the craving bubble
  if (G.level.def.bins && st.want && m.kind === 'big') {
    const pop = st.wantPop > 0 ? 1 + 0.3 * (st.wantPop / 0.25) : 1, bx = m.face * 56, by = -30;
    ctx.save(); ctx.translate(bx, by); ctx.scale(pop, pop);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    circle(-m.face * 22, 14, 3); ctx.fill(); ctx.stroke(); circle(-m.face * 16, 8, 4.5); ctx.fill(); ctx.stroke();
    circle(0, -6, 18); ctx.fill(); ctx.stroke();
    monDrawFood(st.want, 0, -5, 1.1);
    ctx.restore();
  }
  ctx.restore();
}
function monDrawKitchen(st) {
  const k = st.kitchen, L = G.level, t = G.clock;
  // room 4: the treehouse (trunk and leaves behind, plank boards over the platform)
  if (k.open.length > 1) {
    const ty = k.row + 1, x0 = (k.c0 - 1) * T, x1 = (k.c1 + 2) * T, py = ty * T, cx = (x0 + x1) / 2;
    ctx.fillStyle = '#8a5833'; ctx.fillRect(cx - 20, py + 30, 40, st.fieldY - py - 30);
    ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 2; ctx.beginPath();
    for (let y = py + 50; y < st.fieldY - 10; y += 34) { ctx.moveTo(cx - 12, y); ctx.quadraticCurveTo(cx - 4, y + 8, cx - 10, y + 18); ctx.moveTo(cx + 10, y + 14); ctx.quadraticCurveTo(cx + 4, y + 22, cx + 12, y + 30); }
    ctx.stroke();
    ctx.fillStyle = '#8a5833'; ctx.beginPath(); ctx.moveTo(cx - 30, st.fieldY); ctx.lineTo(cx - 20, st.fieldY - 26); ctx.lineTo(cx + 20, st.fieldY - 26); ctx.lineTo(cx + 30, st.fieldY); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.9;
    for (const [dx, dy, r, c] of [[-1, 0, 30, 0], [-1, 1, 22, 1], [1, 0, 30, 0], [1, 1, 22, 1]]) {
      const lx = dx < 0 ? x0 - 18 - dy * 22 : x1 + 18 + dy * 22, ly = py - 30 + dy * 22;
      ctx.fillStyle = c ? C.grassDark : C.grass; circle(lx, ly, r); ctx.fill();
      ctx.fillStyle = c ? C.grass : C.grassDark; circle(lx + dx * 12, ly + 12, r * 0.6); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.plank; ctx.fillRect(x0, py, x1 - x0, T);
    ctx.fillStyle = C.plankDark; ctx.fillRect(x0, py + T - 5, x1 - x0, 5); ctx.fillRect(x0, py, x1 - x0, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x0, py + 2, x1 - x0, 4);
    for (let x = x0; x <= x1; x += T) { ctx.fillStyle = C.plankDark; ctx.fillRect(x - 1, py, 2, T - 4); ctx.fillStyle = '#6b4630'; circle(x + 6, py + 9, 1.6); ctx.fill(); circle(x + 24, py + 9, 1.6); ctx.fill(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(x0, py, x1 - x0, T);
  }
  // fences
  for (const f of st.fences) {
    const x = f.tx * T, y = f.ty * T;
    ctx.fillStyle = C.plankDark; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
    rr(x + 4, y + 6, 5, 24, 2); ctx.fill(); ctx.stroke(); rr(x + 21, y + 6, 5, 24, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.plank; rr(x + 3, y + 8, 24, 4, 2); ctx.fill(); ctx.stroke(); rr(x + 3, y + 18, 24, 3, 1.5); ctx.fill();
  }
  // the pot: a cauldron on a little fire
  if (st.pot) {
    const p = st.pot, fl = Math.sin(t * 20);
    for (let i = -1; i <= 1; i++) {
      ctx.fillStyle = i ? '#ffb347' : '#ffd75a';
      const hgt = 9 + (i ? 2 : 4) * (0.5 + 0.5 * Math.sin(t * 20 + i * 2)) + fl;
      ctx.beginPath(); ctx.moveTo(p.x + i * 8 - 4, p.y); ctx.quadraticCurveTo(p.x + i * 8 - 2, p.y - hgt * 0.6, p.x + i * 8, p.y - hgt); ctx.quadraticCurveTo(p.x + i * 8 + 2, p.y - hgt * 0.6, p.x + i * 8 + 4, p.y); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#3c3a52'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.fillRect(p.x - 11, p.y - 7, 3, 7); ctx.fillRect(p.x + 8, p.y - 7, 3, 7);
    ctx.beginPath(); ctx.arc(p.x, p.y - 19, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; circle(p.x - 5, p.y - 23, 3.5); ctx.fill();
    ctx.fillStyle = '#9aa0c0'; rr(p.x - 15, p.y - 33, 30, 5, 2.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7be08a'; ctx.beginPath(); ctx.ellipse(p.x, p.y - 33, 11, 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  // room 2: the crates; the craved one glows, and an arrow bounces over it while the chef holds something else
  for (const b of st.bins) {
    const want = b.type === st.want, bob = want ? Math.sin(t * 6) * 3 : 0, pop = b.pop > 0 ? -Math.sin(b.pop / 0.2 * Math.PI) * 5 : 0;
    const x = b.x + 2, y = b.y + 10;
    if (want) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.4 * Math.sin(8 * t)) + ')'; ctx.lineWidth = 3; rr(x - 3, y - 18, 32, 41, 8); ctx.stroke(); }
    ctx.fillStyle = C.plank; ctx.strokeStyle = C.plankDark; ctx.lineWidth = 2; rr(x, y, 26, 20, 3); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + 23, y + 17); ctx.moveTo(x + 23, y + 3); ctx.lineTo(x + 3, y + 17); ctx.stroke();
    monDrawFood(b.type, x + 13, y - 4 + bob + pop, 0.9);
    if (want && st.hand !== st.want && !st.done && G.introT <= 0.4) {
      const ay = b.y - 26 + Math.abs(Math.sin(t * 5)) * -6;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 13 - 7, ay - 6); ctx.lineTo(x + 13 + 7, ay - 6); ctx.lineTo(x + 13, ay + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
}
function monDrawWorld(st) {
  const t = G.clock;
  // meadow dressing
  for (const d of st.decor) {
    if (d.kind === 'tuft') {
      ctx.strokeStyle = C.grassDark; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
      for (const a of [-0.5, 0, 0.5]) { ctx.moveTo(d.x, d.y + 1); ctx.lineTo(d.x + Math.sin(a) * 7 * d.s, d.y - Math.cos(a) * 8 * d.s); }
      ctx.stroke();
    } else {
      ctx.save(); ctx.translate(d.x, d.y + 1); ctx.scale(d.s, d.s);
      ctx.fillStyle = '#f6e7c8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; rr(-2.5, -8, 5, 8, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e5413a'; ctx.beginPath(); ctx.arc(0, -8, 7, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; circle(-3, -11, 1.3); ctx.fill(); circle(2.5, -12, 1.1); ctx.fill(); circle(0, -9.5, 0.9); ctx.fill();
      ctx.restore();
    }
  }
  monDrawKitchen(st);
  for (const b of st.burrows) monDrawHole(b, false);
  // splats
  for (const s of st.splats) {
    ctx.globalAlpha = clamp(1 - s.t / MONSTER.splatLife, 0, 1) * 0.9;
    ctx.fillStyle = MONSTER_COL[s.type] || '#ff6b6b';
    ctx.beginPath(); ctx.ellipse(s.x, s.y - 2, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    circle(s.x - 14 + s.seed, s.y - 6, 2); ctx.fill(); circle(s.x + 13, s.y - 7 + s.seed * 0.5, 2.4); ctx.fill(); circle(s.x + 4 - s.seed, s.y - 9, 1.6); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // shadows and the landing X of flying chef food
  for (const f of st.foods) {
    if (f.from !== 'chef') continue;
    const gy = monGroundY(f.x, f.y + 10), hgt = gy - f.y;
    if (gy < H && hgt > 0) { ctx.fillStyle = 'rgba(28,26,54,0.22)'; ctx.beginPath(); ctx.ellipse(f.x, gy, (16 - 8 * clamp(hgt / 300, 0, 1)) / 2 + 2, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    if (f.land && !f.bounced) monX(f.land.x, f.land.y - 4, 14, 10, '#fff', 3);
  }
  if (st.ghost && G.introT <= 0) { ctx.globalAlpha = 0.3; monX(st.ghost.x, st.ghost.y - 4, 14, 10, '#fff', 2); ctx.globalAlpha = 1; }
  // monsters
  for (const m of st.monsters) {
    if (m.kind === 'big') monDrawBig(st, m); else monDrawHead(st, m);
    monDrawShock(m);
  }
  for (const b of st.burrows) monDrawHole(b, true);
  for (const m of st.monsters) monDrawMeter(st, m);
  // steam, Zzz, bubbles, sparkles
  for (const q of st.puffs) {
    const a = clamp(1 - q.t / q.life, 0, 1);
    ctx.globalAlpha = a;
    if (q.kind === 'zzz') text('Z', q.x, q.y, 14 + q.t * 6, C.paper, 'center');
    else if (q.kind === 'steam') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; circle(q.x, q.y, 4 + q.t * 9); ctx.fill(); }
    else if (q.kind === 'bubble') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; circle(q.x, q.y, 4 + q.t * 3); ctx.stroke(); }
    else if (q.kind === 'spark') { ctx.fillStyle = '#fff6c0'; monStarShape(q.x, q.y, 3.5 * (0.6 + a)); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}
function monBubble(x, y, str, k, avoid) {
  ctx.font = '700 ' + Math.round(14 * k) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(str).width + 22 * k, h = 26 * k;
  let bx = clamp(x - w / 2, 6, W - 6 - w), by = Math.max(4, y - h);
  // keep clear of the monsters' faces and meters: slide sideways (toward the field), else go above
  for (const r of avoid || []) {
    if (!(bx < r.x1 && bx + w > r.x0 && by < r.y1 && by + h > r.y0)) continue;
    const cand = [r.x0 - 4 - w, r.x1 + 4].filter(c => c >= 6 && c <= W - 6 - w && Math.abs(c + w / 2 - x) < w / 2 + 70);
    if (cand.length) bx = cand.sort((a, b2) => Math.abs(a + w / 2 - x) - Math.abs(b2 + w / 2 - x))[0];
    else by = Math.max(4, r.y0 - 6 - h);
  }
  ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(bx, by, w, h, 10 * k); ctx.fill();
  const tx = clamp(x, bx + 12 * k, bx + w - 12 * k);
  ctx.beginPath(); ctx.moveTo(tx - 6 * k, by + h - 0.5); ctx.lineTo(tx + 6 * k, by + h - 0.5); ctx.lineTo(tx, by + h + 7 * k); ctx.closePath(); ctx.fill();
  text(str, bx + w / 2, by + h / 2 + 0.5, Math.round(14 * k), C.paper, 'center', 'body');
  return by;
}
function monDrawBasket(st, c) {
  const r = monRim(c), top = c.y + c.h - c.h * c.sy, ry = top - MONSTER.rimUp, s = st.big ? MONSTER.bigScale : 1;
  const hop = st.hop > 0 ? -Math.sin(st.hop / 0.25 * Math.PI) * 6 : 0, n = st.basket.length;
  st.basket.forEach((type, i) => monDrawFood(type, r.x + (i - (n - 1) / 2) * 8, ry - 2 + hop - (n === 3 && i === 1 ? 4 : 0), 0.8));
  ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round';
  ctx.fillStyle = st.big ? C.gold : '#d8a45e';
  ctx.beginPath(); ctx.moveTo(r.x - 17 * s, ry); ctx.lineTo(r.x + 17 * s, ry); ctx.lineTo(r.x + 12 * s, ry + 13); ctx.lineTo(r.x - 12 * s, ry + 13); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = st.big ? C.goldDark : '#b07a3a'; ctx.lineWidth = 1.5; ctx.beginPath();
  ctx.moveTo(r.x - 15 * s, ry + 5.5); ctx.lineTo(r.x + 15 * s, ry + 5.5); ctx.moveTo(r.x - 13.5 * s, ry + 9.5); ctx.lineTo(r.x + 13.5 * s, ry + 9.5);
  for (const dx of [-8, 0, 8]) { ctx.moveTo(r.x + dx * s, ry + 3); ctx.lineTo(r.x + dx * s * 0.8, ry + 12); }
  ctx.stroke();
  ctx.fillStyle = st.big ? '#ffe08a' : '#e9c48a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  rr(r.x - 18 * s, ry - 2, 36 * s, 4, 2); ctx.fill(); ctx.stroke();
}
function monDrawTop(st) {
  const ps = G.players, th = ps[st.thrower], c = ps[st.catcher], t = G.clock, big = hudBig();
  // the chef: a toque, the food in hand, a shrug
  if (th.alive) {
    const cx = th.x + th.w / 2, top = th.y + th.h - th.h * th.sy, side = monSide(st, th);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    rr(cx - 9, top - 9, 18, 11, 3); ctx.fill(); ctx.stroke();
    circle(cx - 5, top - 12, 6); ctx.fill(); ctx.stroke(); circle(cx + 5, top - 12, 6); ctx.fill(); ctx.stroke(); circle(cx, top - 16, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(cx - 8, top - 12, 16, 6);
    if (st.shrug > 0) {
      ctx.fillStyle = PCOL[th.id]; ctx.strokeStyle = PDARK[th.id]; ctx.lineWidth = 2;
      for (const dx of [-1, 1]) { circle(cx + dx * 15, top + 2 - Math.sin(st.shrug / 0.5 * Math.PI) * 6, 4.5); ctx.fill(); ctx.stroke(); }
    }
    // a crate press during the reload: that food shows faintly in the hand until it comes
    if (!st.hand && st.grabQ) { ctx.globalAlpha = 0.45; monDrawFood(st.grabQ.type, cx + side * 13, th.y + 6, 0.8); ctx.globalAlpha = 1; }
    if (st.hand) {
      const hx = cx + side * 13 - (st.charging ? side * 4 * st.charge : 0), hy = th.y + 6 - (st.charging ? 6 : 0);
      if (st.popAnim > 0 && st.pot) {
        const k = 1 - st.popAnim / 0.2, px = st.pot.x + (hx - st.pot.x) * k, py = (st.pot.y - 34) + (hy - st.pot.y + 34) * k - Math.sin(k * Math.PI) * 26;
        monDrawFood(st.hand, px, py, 0.9);
      } else monDrawFood(st.hand, hx, hy, 0.9);
    }
    // the charge ring (shared look), shown past the tap time
    if (st.charging && st.holdT >= MONSTER.tapT) {
      const rx = th.x + th.w / 2, ry = th.y + th.h / 2;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(28,26,54,0.35)'; circle(rx, ry, 20); ctx.stroke();
      ctx.strokeStyle = st.fullFlash > 0 ? '#fff' : st.charge >= 1 ? C.gold : PCOL[th.id];
      ctx.beginPath(); ctx.arc(rx, ry, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * st.charge); ctx.stroke();
    }
  }
  // the catcher's basket
  if (c.alive) monDrawBasket(st, c);
  // food in flight
  for (const f of st.foods) monDrawFood(f.type, f.x, f.y, 1, f.spin);
  // aim preview: dotted arc and a big X where it lands
  if (st.preview && th.alive) {
    ctx.globalAlpha = 0.9; ctx.fillStyle = PCOL[th.id];
    const L2 = st.preview.land;
    st.preview.pts.forEach((pt, i) => { if (i % 2 === 0 && i > 0) { circle(pt[0], pt[1], 2.5); ctx.fill(); } });
    ctx.globalAlpha = 1;
    if (L2) { monX(L2.x, L2.y - 5, 18, 12, '#fff', 7); monX(L2.x, L2.y - 5, 18, 12, PCOL[th.id], 4); }
  }
  // off-screen marker for food above the top
  for (const f of st.foods) if (f.y < 4) {
    ctx.fillStyle = MONSTER_COL[f.type] || '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(f.x, 4); ctx.lineTo(f.x + 6, 13); ctx.lineTo(f.x - 6, 13); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // floaters
  const fk = big ? 1.2 : 1;
  for (const q of st.fx) {
    ctx.globalAlpha = clamp(1 - Math.max(0, q.t - 0.5) / 0.4, 0, 1);
    const f = monFxPos(st, q, fk);
    bigText(q.str, f.x, f.y, f.size, q.col);
    ctx.globalAlpha = 1;
  }
  monDrawPrompts(st);
}
// where a floater is drawn: it rises 30 px. A monster's words sit beside its mouth (far enough out to leave the face
// clear) and stop under its meter box
function monFxPos(st, q, fk) {
  const size = Math.round(q.size * fk), m = q.m;
  ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
  const hw = ctx.measureText(q.str).width / 2 + 4;
  let x = q.x, y0 = q.y;
  if (q.mouth) {
    if (m.kind === 'head') { const side = m.mx < W / 2 ? 1 : -1; x = m.mx + side * Math.max(56, hw + 30); y0 = m.my - 6 + q.off; }
    else { x = m.mx + m.face * Math.max(42, hw + 12); y0 = m.my - 26 + q.off; }
  }
  x = clamp(x, 60, W - 60);
  let y = Math.max(16, y0 - q.t / q.life * 30);
  const r = m && monMeterBox(st, m);
  if (r && x + hw > r.x0 && x - hw < r.x1) y = Math.max(y, r.y1 + size * 0.62);
  return { x, y, size, hw };
}
// screen rects the prompt bubbles keep clear of: big monsters' bodies, every meter (and its bubble / name / tummy)
function monAvoid(st) {
  const out = [], big = hudBig() ? 1.4 : 1;
  for (const m of st.monsters) {
    if (m.kind === 'big') { const rx = (58 + 0.8 * m.eaten) * m.scale; out.push({ x0: m.bx - rx - 4, x1: m.bx + rx + 4, y0: m.by - m.bry - 26, y1: m.by + m.bry }); }
    if (m.full || (m.kind === 'head' && m.state === 'down')) continue;
    const my = monMeterY(st, m) + 6, mx = monMeterX(m, big);
    out.push({ x0: mx - 62 * big + Math.min(0, m.face * 80 * big), x1: mx + 62 * big + Math.max(0, m.face * 80 * big), y0: my - (G.level.def.bins ? 54 : 12) * big, y1: my + 28 * big });
  }
  return out;
}
function monDrawPrompts(st) {
  if (G.introT > 0.4 || st.done || G.mode !== 'play' && G.mode !== 'paused') return;
  const ps = G.players, th = ps[st.thrower], c = ps[st.catcher], k = hudBig() ? 1.3 : 1, touch = monTouchHint();
  const list = [], room = G.level.def.roomIndex;
  // AFK first, so an idle partner always gets "Your turn!" (at most 2 bubbles per player, stacked)
  // (1-player mode: the key hints are for the person only, never over the computer's character)
  const cpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
  if (st.afk) for (const p of ps) if (st.idle[p.id] >= MONSTER.afkT && !cpu(p.id)) list.push([p, NAMES[p.id] + '! Your turn!']);
  // 1. first throw (each player's first chef room)
  if (room < 2 && !st.thrown && st.hand && !cpu(th.id)) list.push([th, (touch ? 'Hold throw' : 'Hold ' + monKey(th.id)) + ', let go!']);
  // 2. pick the crate
  if (st.grabMsg > 0 && !st.hand && !cpu(th.id)) list.push([th, 'Grab ' + MONSTER_FOOD_NAME[st.want] + ' from a crate!']);
  // 3. toss
  if (st.tossMsgT > 0 && st.tossable && !cpu(c.id)) list.push([c, (touch ? 'Tap throw' : monKey(c.id)) + ' to toss it in!']);
  // 6. shrug
  if (st.shrugMsg > 0) list.push([th, G.level.def.bins ? 'Grab food from a crate!' : 'Wait for the pot!']);
  const used = {}, count = [0, 0], avoid = monAvoid(st);
  for (const [p, str] of list) {
    if (!p.alive || count[p.id] >= 2) continue;
    count[p.id]++;
    const x = p.x + p.w / 2, y0 = used[p.id] != null ? used[p.id] - 12 * k : p.y - 46;
    used[p.id] = monBubble(x, y0, str, k, avoid);
  }
  // 4. a full basket far from the mouth: an arrow at the catcher's head points the way
  if (c.alive && st.basket.length >= MONSTER.cap) {
    const m = monTarget(st, c), r = monRim(c);
    if (m && Math.hypot(m.mx - r.x, m.my - r.y) > 200) {
      const a = Math.atan2(m.my - r.y, m.mx - r.x), bob = Math.sin(G.clock * 8) * 4;
      const ax = r.x + Math.cos(a) * (30 + bob), ay = r.y - 6 + Math.sin(a) * (30 + bob);
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(a); ctx.scale(k, k);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-2, -9); ctx.lineTo(-2, -4); ctx.lineTo(-10, -4); ctx.lineTo(-10, 4); ctx.lineTo(-2, 4); ctx.lineTo(-2, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
}
function monDrawHUD(st) {
  const k = hudBig() ? 1.3 : 1, stars = st.stats.stars.reduce((a, b) => a + b, 0);
  const tm = fmtTime(G.time), fs = Math.round(14 * k);
  ctx.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
  const sw = ctx.measureText(String(stars)).width;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const tw = ctx.measureText(tm).width, h = Math.round(28 * k);
  const w = 14 * k + 16 * k + 6 * k + sw + 18 * k + tw + 14 * k;
  const x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2;
  ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; monStarShape(x0 + 14 * k + 8 * k, cy, 8 * k); ctx.fill(); ctx.stroke();
  text(String(stars), x0 + 14 * k + 16 * k + 6 * k, cy + 1, fs, C.gold, 'left');
  ctx.fillStyle = 'rgba(246,239,223,0.6)'; circle(x0 + 14 * k + 22 * k + sw + 9 * k, cy, 2 * k); ctx.fill();
  text(tm, W - 14 - 14 * k, cy + 0.5, fs, C.paper, 'right', 'body');
  // the help pop (gold): Big basket!
  const c = G.players[st.catcher];
  if (st.bigPop > 0 && c.alive) {
    const a = 1 - st.bigPop / 0.9;
    ctx.globalAlpha = clamp(st.bigPop / 0.3, 0, 1);
    bigText('Big basket!', clamp(c.x + c.w / 2, 70, W - 70), c.y - 52 - a * 30, Math.round(18 * (hudBig() ? 1.2 : 1)), C.gold);
    ctx.globalAlpha = 1;
  }
  // room done: All full! and the room's stars
  if (st.done) {
    let x, y;
    if (st.monsters.length > 1) { x = W / 2; y = 300; }
    else { const m = st.monsters[0]; x = clamp(m.bx, 110, W - 110); y = m.kind === 'head' ? st.burrows[m.burrow].y - 130 : m.by - m.bry - 70; }
    const a = st.doneAge, kk = hudBig() ? 1.25 : 1;
    const sc = a < 0.2 ? 0.6 + 2 * a : 1;
    bigText('All full!', x, y, Math.round(26 * kk), C.gold, sc);
    for (let i = 0; i < 3; i++) {
      const at = 0.55 + i * 0.15; if (a < at) continue;
      const p = clamp((a - at) / 0.15, 0, 1), s2 = p < 1 ? 0.5 + 0.8 * p : 1, gold = i < st.roomStars;
      ctx.save(); ctx.translate(x + (i - 1) * 30 * kk, y + 32 * kk - (i === 1 ? 6 : 0)); ctx.scale(s2 * kk, s2 * kk);
      ctx.fillStyle = gold ? C.gold : '#8a86a8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; monStarShape(0, 0, 11); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
}
Sfx.extra.monPop = function () { this.tone(700, 0.05, 'sine', 0.05, 1100); };
Sfx.extra.monThrow = function (p) { this.tone(420 * p, 0.09, 'triangle', 0.05, 760 * p); };
Sfx.extra.monReady = function (p) { this.tone(1320 * p, 0.1, 'triangle', 0.05); this.tone(1760 * p, 0.12, 'triangle', 0.04, null, 0.05); };
Sfx.extra.monCatch = function (p) { this.tone(660 * p, 0.06, 'triangle', 0.06); this.tone(990 * p, 0.08, 'triangle', 0.05, null, 0.05); };
Sfx.extra.monBounce = function () { this.tone(260, 0.06, 'triangle', 0.05, 380); };
Sfx.extra.monSplat = function () { this.tone(180, 0.12, 'sawtooth', 0.03, 70); this.tone(90, 0.1, 'triangle', 0.05, 60, 0.02); };
Sfx.extra.monBonk = function () { this.tone(520, 0.05, 'square', 0.05, 300); this.tone(240, 0.12, 'triangle', 0.06, 160, 0.03); };
Sfx.extra.monChomp = function () { this.tone(140, 0.07, 'square', 0.06, 90); this.tone(110, 0.07, 'square', 0.05, 70, 0.09); };
Sfx.extra.monGold = function () { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.06, null, i * 0.06)); };
Sfx.extra.monBleh = function () { this.tone(300, 0.2, 'sawtooth', 0.04, 150); };
Sfx.extra.monGrowl = function () { this.tone(95, 0.35, 'sawtooth', 0.03, 75); };
Sfx.extra.monRoar = function () { this.tone(110, 0.6, 'sawtooth', 0.08, 60); this.tone(160, 0.5, 'square', 0.04, 80, 0.05); };
Sfx.extra.monFull = function () { [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.06, null, i * 0.08)); };
Sfx.extra.monBurp = function () { this.tone(90, 0.45, 'sawtooth', 0.07, 55); };
Sfx.extra.monStar = function () { this.tone(1319, 0.12, 'triangle', 0.06); };
Sfx.extra.monHop = function (p) { this.tone(600 * p, 0.04, 'square', 0.025); };
Sfx.extra.monToss = function (p) { this.tone(500 * p, 0.07, 'triangle', 0.05, 820 * p); };
Sfx.extra.monTick = function (p) { this.tone(520 * p, 0.03, 'triangle', 0.025); };
Sfx.extra.monShrug = function (p) { this.tone(330 * p, 0.08, 'triangle', 0.03, 280 * p); };
Sfx.extra.monHelp = function () { [659, 880, 1175].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.06, null, i * 0.06)); };
Sfx.extra.monDive = function () { this.tone(500, 0.2, 'sine', 0.05, 160); };
Sfx.extra.monPeek = function () { this.tone(200, 0.15, 'sine', 0.06, 600); };
Sfx.extra.monWant = function () { this.tone(880, 0.06, 'sine', 0.04); this.tone(1175, 0.08, 'sine', 0.04, null, 0.06); };
/* ===== end Monster Feeding ===== */

