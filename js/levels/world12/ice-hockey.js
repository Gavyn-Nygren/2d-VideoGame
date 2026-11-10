/* Pip & Bo - Level 12-4 Ice Hockey (versus). */
'use strict';

/* ===== 12-4 Ice Hockey (mode 'hockey', versus, best of 5): one on one, with a goalie robot in each net =====
   Top-down rink. def.ownStep: this mode runs the whole live tick; the platformer players are hidden (p.alive false) and
   the mode draws each skater itself (Pip's body with a stick, on skates). Every top-level name is prefixed hockey /
   HOCKEY, every sound is Sfx.extra.hockey*.

   Rules as built:
   - Pip defends the LEFT net and shoots at the right one; Bo defends the RIGHT net. Net k is guarded by robot k.
   - Skating is slippery: direction keys push (momentum, gentle turning). You aim where you face, and you face the way
     you skate. Keys and touch give 8 directions; a controller stick steers and aims any way (hockeyStick). A
     controller's A / B button is the action too. Aim help bends a near-miss onto the net: P.assist for keys and touch,
     the smaller P.assistPad for a stick.
   - With the puck: tap the action = quick shot, hold = slapshot (power grows for 0.9 s; it fires by itself at 1.6 s).
     Without the puck: the action is a poke check (a short lunge; a stick that reaches the puck steals it).
   - Bumps are bouncy: a skater with the puck who bumps (or is bumped) hard drops it and wobbles; a poke lunge into
     someone makes them wobble too. Nobody gets hurt ("BOING!"). Skating the puck into the other skater's body pops it
     loose ("BLOCKED!"). A puck knocked loose counts as a steal only if the other skater picks it up within 0.7 s.
   - The robots slide along their goal line and follow the puck about 0.2 s late, so quick or angled shots beat them.
     Skaters can't go into the blue creases; a slow puck in a crease is swept out to a corner by the robot.
   - A round: first to 3 goals, or more goals at the 60 s bell (the clock stops for goals and faceoffs). Tied at the bell:
     overtime, 15 s, next goal wins (golden goal), and both robots get sleepy (slower, later, a little smaller; said on
     the overtime card). If overtime runs out, the player whose attacking end the puck is in wins ("keep it in their
     end"). Faceoff at centre after every goal; an arrow beside each skater shows which net they shoot at.
   - Round 1 is plain; rounds 2-5 are the 4 twists in a shuffled order: Big Puck, Double Puck, Bouncy Boards, Snowman
     Shuffle. A tied round replays its twist.
   - Catch-up: a player 2+ rounds behind gets gold help, announced on the round card: a Lucky stick (longer reach for
     catching and poking, shots 10% faster) and a Big Glove for their robot.
   State (G.mst): sk[2] skaters { x, y, vx, vy, a (aim), puck (index or -1), charge (s held or -1), pokeT, cd, wob,
   pickCD, guardT, lucky }, pucks[] { x, y, vx, vy, r, carrier, last, shotBy, inNet }, bots[2] { x, y, vy, r },
   goals [pip, bo], phase 'play' | 'goal' | 'face' | 'ot', ot, twist, P (this round's numbers), stat (match totals). */
const HOCKEY = {
  goals: 3, otTime: 15, otBotV: 0.6, otBotDelay: 1.6, otBotR: 3, // overtime: the robots get sleepy (slower, later, smaller)
  // skater (px, s)
  r: 16, acc: 560, maxV: 245, carryV: 0.9, glide: 0.5, carve: 2.6, brake: 520, turn: 7, chargeTurn: 3.6, chargeAcc: 0.35,
  boardE: 0.35, boardMin: 0, reach: 25, catchR: 13, catchV: 680, pickCD: 0.28,
  // shots: tap = shotV, a full charge (slapT s) = slapV; aim help bends a near-miss onto the net (keys and touch only
  // aim 8 ways, so they get the same help; a controller stick aims freely and gets less)
  tapT: 0.16, shotV: 560, slapV: 930, slapT: 0.9, autoT: 1.6, carryShare: 0.3, assist: 0.35, assistPad: 0.14, shotK: 1,
  // poke check + bumps
  pokeT: 0.22, pokeCD: 0.6, lunge: 210, lungeMax: 360, pokeReach: 33, pokeR: 20, stealCD: 0.5, guardT: 0.3,
  bumpE: 0.9, bumpMin: 170, wobT: 0.42, dropV: 150, lungeWob: 0.35, block: true, // block: a carried puck pops loose on the other skater's body
  // puck
  puckR: 7, puckDrag: 0.35, puckFric: 22, puckE: 0.78, maxPuckV: 1000, bodyE: 0.35,
  // nets + robots
  mouth: 50, netD: 26, post: 4, crease: 64, botX: 16, botR: 12, botV: 165, botAcc: 1400, botDelay: 0.22, botRange: 50,
  botE: 0.55, botLead: 0.9, botFollow: 0.4, clearT: 0.35, clearV: 330,
  // stoppages (the clock stops during them)
  goalT: 1.8, faceT: 0.8, otT: 2.0,
  // twists
  pucks: 1, bouncy: false, snowman: false, snowR: 26, snowAmp: 128, snowPeriod: 7,
  // catch-up (gold)
  goldMin: 2, luckyReach: 8, luckyShot: 1.1, gloveR: 18,
};
const HOCKEY_TWISTS = {
  classic: { name: 'Opening Faceoff', hint: 'First to 3 goals! Tap to shoot, hold for a slapshot.', P: {} },
  big: { name: 'Big Puck', hint: 'A giant puck! Easy to hit, but it blocks easily too.', P: { puckR: 13, shotK: 0.9, catchR: 16, puckDrag: 0.45 } },
  two: { name: 'Double Puck', hint: 'Two pucks at once! Either one can score.', P: { pucks: 2 } },
  bouncy: { name: 'Bouncy Boards', hint: 'Springy boards! Bank your shots off the walls.', P: { bouncy: true, puckE: 1.08, boardE: 1, boardMin: 150 } },
  snowman: { name: 'Snowman Shuffle', hint: 'A snowman slides across the middle. Shoot around him!', P: { snowman: true } },
};
const HOCKEY_MIX = ['big', 'two', 'bouncy', 'snowman'];
// the rink (px): a rounded box; goal lines at gl[0] (Pip's net, left) and gl[1] (Bo's net, right)
const HOCKEY_RINK = { x0: 36, x1: 924, y0: 110, y1: 514, cr: 90, cx: 480, cy: 312, gl: [112, 848] };
const HOCKEY_COLS = { arena: '#22325a', arenaDk: '#18244a', ice: '#eef7ff', iceDk: '#d6e9f8', iceLine: 'rgba(120,170,215,0.35)',
  red: '#e2475a', blue: '#4a86e0', crease: 'rgba(110,170,240,0.35)', board: '#ffffff', boardDk: '#b8cde0', kick: '#ffc53d',
  spring: '#ff7fbf', springDk: '#c2448a', net: '#e2475a', mesh: 'rgba(255,255,255,0.75)', puck: '#1f2233', puckHi: '#4a4f6e',
  bot: '#dfe6f1', botDk: '#8e9bb4', visor: '#2a3354', stick: '#c9955a', stickDk: '#7d5530', tape: '#ffffff',
  crowd: ['#ffd166', '#ff8fc7', '#b28dff', '#8fe3b0', '#ffffff', '#ff9a6b', '#7fc4ff'] };
const hockeyP = () => G.mst.P || HOCKEY;
const hockeyAng = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const hockeyCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
// looks-only randomness (never MODES.hockey.rand, which only shuffles the twists)
let hockeyVS = 20261104;
const hockeyVR = () => { hockeyVS = (Math.imul(hockeyVS, 1664525) + 1013904223) >>> 0; return hockeyVS / 4294967296; };

/* ---------- input ---------- */
// is this player's jump (A / B) coming from their own controller right now? (then it's the action, not "up")
function hockeyPadJump(id) {
  try { const pd = padFor(padSlots(), id), s = pd && Pads.prev[pd.ix]; return !!(s && s.jump); } catch (e) { return false; }
}
// this player's own controller stick, as a free direction (null when it rests in the dead zone or there is no pad)
function hockeyStick(id) {
  const tt = MODES.hockey.testStick; if (tt) return tt[id] || null;
  try {
    const pd = padFor(padSlots(), id), gp = pd && navigator.getGamepads && navigator.getGamepads()[pd.ix];
    if (!gp || !gp.axes) return null;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    return Math.hypot(ax, ay) >= 0.3 ? { x: ax, y: ay } : null;
  } catch (e) { return null; }
}
function hockeyInput(p) {
  const i = p.input, padA = hockeyPadJump(p.id), up = i.up || (i.jump && !padA);
  let dx = (i.right ? 1 : 0) - (i.left ? 1 : 0), dy = (i.down ? 1 : 0) - (up ? 1 : 0), analog = false;
  // a controller stick steers (and aims) any way, not just 8 ways
  const sv = hockeyStick(p.id);
  if (sv) { dx = sv.x; dy = sv.y; analog = true; }
  const press = !!(p.pendingAct || (p.pendingJump && padA));
  const hold = !!(i.act || (i.jump && padA));
  p.pendingAct = false; p.pendingJump = false;
  return { dx, dy, any: dx !== 0 || dy !== 0, press, hold, analog };
}

/* ---------- geometry ---------- */
// keep a circle (o.x, o.y, radius r) inside the rink's rounded boards; returns the speed it hit them with
function hockeyBoard(o, r, e, minOut) {
  const R = HOCKEY_RINK, cr = R.cr;
  const ix = clamp(o.x, R.x0 + cr, R.x1 - cr), iy = clamp(o.y, R.y0 + cr, R.y1 - cr);
  const dx = o.x - ix, dy = o.y - iy, d = Math.hypot(dx, dy), lim = cr - r;
  if (d <= lim || d < 1e-6) return 0;
  const nx = dx / d, ny = dy / d;
  o.x = ix + nx * lim; o.y = iy + ny * lim;
  const vn = o.vx * nx + o.vy * ny;
  if (vn <= 0) return 0;
  const out = Math.max(vn * e, minOut || 0);
  o.vx -= (vn + out) * nx; o.vy -= (vn + out) * ny;
  return vn;
}
// push a circle out of a solid circle (cx, cy, cr); the circle's own velocity bounces (relative to the obstacle's velocity)
function hockeyPushCircle(o, r, cx, cy, cr, e, ovx = 0, ovy = 0) {
  const dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy), min = r + cr;
  if (d >= min) return 0;
  const nx = d > 1e-6 ? dx / d : 1, ny = d > 1e-6 ? dy / d : 0;
  o.x = cx + nx * min; o.y = cy + ny * min;
  const vn = (o.vx - ovx) * nx + (o.vy - ovy) * ny;
  if (vn >= 0) return 0.001;
  o.vx -= (1 + e) * vn * nx; o.vy -= (1 + e) * vn * ny;
  return -vn;
}
// the net's frame box (behind the goal line), solid from the back and the sides
function hockeyNetBox(k) {
  const R = HOCKEY_RINK, P = hockeyP(), gl = R.gl[k];
  return { x0: k ? gl : gl - P.netD, x1: k ? gl + P.netD : gl, y0: R.cy - P.mouth - 3, y1: R.cy + P.mouth + 3 };
}
function hockeyPushBox(o, r, b, e) {
  const qx = clamp(o.x, b.x0, b.x1), qy = clamp(o.y, b.y0, b.y1), dx = o.x - qx, dy = o.y - qy, d = Math.hypot(dx, dy);
  if (d >= r) return 0;
  let nx, ny, pen;
  if (d > 1e-6) { nx = dx / d; ny = dy / d; pen = r - d; }
  else { // centre inside the box: out the nearest side
    const opts = [[-1, 0, o.x - b.x0], [1, 0, b.x1 - o.x], [0, -1, o.y - b.y0], [0, 1, b.y1 - o.y]].sort((u, v) => u[2] - v[2]);
    [nx, ny] = opts[0]; pen = opts[0][2] + r;
  }
  o.x += nx * pen; o.y += ny * pen;
  const vn = o.vx * nx + o.vy * ny;
  if (vn < 0) { o.vx -= (1 + e) * vn * nx; o.vy -= (1 + e) * vn * ny; }
  return Math.max(0, -vn);
}
// the blade of a skater's stick (where the puck sits when carried)
function hockeyBlade(sk, extra = 0) {
  const P = hockeyP(), r = P.reach + (sk.lucky ? P.luckyReach * 0.5 : 0) + extra;
  return { x: sk.x + Math.cos(sk.a) * r, y: sk.y + Math.sin(sk.a) * r };
}

/* ---------- setup ---------- */
function hockeyMakeSkater(k) {
  const R = HOCKEY_RINK;
  return { id: k, x: R.cx + (k ? 110 : -110), y: R.cy, vx: 0, vy: 0, a: k ? Math.PI : 0, puck: -1, charge: -1, pokeT: 0, cd: 0, wob: 0,
    pickCD: 0, guardT: 0, lucky: false,
    // looks only
    sq: 0, sprayT: 0, cheer: 0, pop: null, swing: 0, spinA: 0 };
}
function hockeyMakePuck(i, n) {
  const R = HOCKEY_RINK, P = hockeyP();
  return { i, x: R.cx, y: R.cy + (n > 1 ? (i ? 56 : -56) : 0), vx: 0, vy: 0, r: P.puckR, carrier: -1, last: -1, shotBy: -1, shotV: 0,
    counted: true, inNet: -1, creaseT: 0, drop: 0, trail: [], bumpBy: -1, bumpT: 0 };
}
function hockeyFaceoff(st, first) {
  const R = HOCKEY_RINK, P = hockeyP();
  for (const sk of st.sk) {
    const lucky = sk.lucky;
    Object.assign(sk, hockeyMakeSkater(sk.id), { lucky });
  }
  st.pucks = [];
  for (let i = 0; i < P.pucks; i++) { const pk = hockeyMakePuck(i, P.pucks); pk.drop = first ? 0 : 1; st.pucks.push(pk); }
  for (const b of st.bots) { b.y = R.cy; b.vy = 0; b.hist = []; b.happy = 0; }
  hockeySync(st);
}
function hockeyMakeBot(k) {
  const R = HOCKEY_RINK, P = hockeyP();
  return { id: k, x: R.gl[k] + (k ? -1 : 1) * P.botX, y: R.cy, vy: 0, r: P.botR, hist: [], happy: 0, clear: 0, blink: 0 };
}
// the platformer bodies follow the skaters (feet at the skater's spot), for anything that reads p.x / p.y
function hockeySync(st) {
  for (const sk of st.sk) { const p = G.players[sk.id]; p.x = sk.x - p.w / 2; p.y = sk.y - p.h; p.alive = false; p.respawnT = Infinity; }
}

/* ---------- skaters ---------- */
function hockeySkate(st, sk, inp, dt) {
  const P = hockeyP(), charging = sk.charge >= 0;
  sk.cd = Math.max(0, sk.cd - dt); sk.pokeT = Math.max(0, sk.pokeT - dt); sk.pickCD = Math.max(0, sk.pickCD - dt);
  sk.guardT = Math.max(0, sk.guardT - dt);
  if (sk.wob > 0) { sk.wob = Math.max(0, sk.wob - dt); sk.spinA += dt * 14; }
  const can = sk.wob <= 0 && inp && inp.any;
  if (can) {
    const l = Math.hypot(inp.dx, inp.dy), ux = inp.dx / l, uy = inp.dy / l;
    const ta = Math.atan2(uy, ux), turn = (charging ? P.chargeTurn : P.turn) * dt, da = hockeyAng(sk.a, ta);
    sk.a += Math.abs(da) <= turn ? da : Math.sign(da) * turn;
    const acc = P.acc * (charging ? P.chargeAcc : 1);
    let along = sk.vx * ux + sk.vy * uy, lx = sk.vx - along * ux, ly = sk.vy - along * uy;
    const k = Math.exp(-P.carve * dt); lx *= k; ly *= k;            // the skates carve: sideways speed fades
    if (along < 0) { along = Math.min(0, along + P.brake * dt); sk.sprayT = 0.12; } // pushing against your slide: a hockey stop
    else along += acc * dt;
    sk.vx = along * ux + lx; sk.vy = along * uy + ly;
  } else {
    const k = Math.exp(-P.glide * dt); sk.vx *= k; sk.vy *= k;
  }
  const max = P.maxV * (sk.puck >= 0 ? P.carryV : 1) * (charging ? 0.85 : 1), sp = Math.hypot(sk.vx, sk.vy);
  if (sp > max && sk.pokeT <= 0) { const ns = max + (sp - max) * Math.exp(-4 * dt); sk.vx *= ns / sp; sk.vy *= ns / sp; }
  sk.x += sk.vx * dt; sk.y += sk.vy * dt;
}
function hockeySkaterWorld(st, sk) {
  const P = hockeyP(), R = HOCKEY_RINK;
  const hit = hockeyBoard(sk, P.r, P.boardE, P.bouncy ? P.boardMin : 0);
  if (hit > 120) { sk.sq = Math.min(1, hit / 300); if (st.live) Sfx.play(P.bouncy ? 'hockeyBoing' : 'hockeyBoard', sk.id); if (P.bouncy) hockeyPop(st, sk.x, sk.y - 40, 'BOING!', '#ff8fc7'); }
  for (let k = 0; k < 2; k++) {
    const gl = R.gl[k], dir = k ? -1 : 1;
    if ((sk.x - gl) * dir > 0) { // the crease (ice side only): skaters stay out
      const dx = sk.x - gl, dy = sk.y - R.cy, d = Math.hypot(dx, dy), min = P.crease + P.r;
      if (d < min && Math.abs(dx) < min - d) {
        // just over the goal line beside a post (came round the back of the net): held at the line, not snapped sideways
        sk.x = gl; if (sk.vx * dir > 0) sk.vx = 0;
      } else if (d < min) {
        const nx = d > 1e-6 ? dx / d : dir, ny = d > 1e-6 ? dy / d : 0;
        sk.x = gl + nx * min; sk.y = R.cy + ny * min;
        const vn = sk.vx * nx + sk.vy * ny; if (vn < 0) { sk.vx -= 1.2 * vn * nx; sk.vy -= 1.2 * vn * ny; }
      }
    }
    hockeyPushBox(sk, P.r, hockeyNetBox(k), 0.3);
  }
  if (P.snowman && st.snow) hockeyPushCircle(sk, P.r, st.snow.x, st.snow.y, P.snowR, 0.5, 0, st.snow.vy);
  hockeyBoard(sk, P.r, P.boardE, 0);
}
// skater vs skater: a bouncy bump. A puck carrier in a hard bump drops it; a poke lunge makes the other wobble.
function hockeyBump(st) {
  const P = hockeyP(), [A, B] = st.sk;
  const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), min = 2 * P.r;
  if (d >= min) return;
  const nx = d > 1e-6 ? dx / d : (G.tickN & 1 ? 1 : -1), ny = d > 1e-6 ? dy / d : 0, over = min - d;
  A.x -= nx * over / 2; A.y -= ny * over / 2; B.x += nx * over / 2; B.y += ny * over / 2;
  const vA = A.vx * nx + A.vy * ny, vB = B.vx * nx + B.vy * ny, closing = vA - vB;
  if (closing <= 0) return;
  const j = (1 + P.bumpE) * closing / 2;
  A.vx -= j * nx; A.vy -= j * ny; B.vx += j * nx; B.vy += j * ny;
  if (closing < P.bumpMin || !st.live) return;
  st.stat.bumps++;
  const px = (A.x + B.x) / 2, py = (A.y + B.y) / 2 - 18;
  let dropped = false;
  for (const [s, o, sgn] of [[A, B, -1], [B, A, 1]]) {
    const lunged = o.pokeT > 0 && o.wob <= 0;
    if (s.puck >= 0 && s.guardT <= 0) {
      const pk = st.pucks[s.puck];
      hockeyDrop(st, s, sgn * nx, sgn * ny); s.wob = Math.max(s.wob, P.wobT); dropped = true;
      if (pk) { pk.bumpBy = o.id; pk.bumpT = st.t; } // a steal only if the bumper gets it (hockeyPickups)
    }
    else if (lunged) s.wob = Math.max(s.wob, P.lungeWob);
    s.sq = 1;
  }
  Sfx.play(closing > 300 ? 'hockeyBigBump' : 'hockeyBump'); rumble(0, 0.3, 0.4, 110); rumble(1, 0.3, 0.4, 110);
  burst(px, py + 10, '#ffffff', 8);
  hockeyPop(st, px, py - 18, dropped ? 'BUMP!' : 'BOING!', dropped ? C.gold : '#ffffff');
  if (!reduceMotion) G.shake = Math.max(G.shake, closing > 300 ? 0.1 : 0.05);
}
// a carried puck pops loose (bump, crease, wobble); (nx, ny) = which way it squirts
function hockeyDrop(st, sk, nx, ny) {
  const P = hockeyP(), pk = st.pucks[sk.puck];
  sk.puck = -1; sk.charge = -1; sk.pickCD = Math.max(sk.pickCD, P.stealCD);
  if (!pk) return;
  pk.carrier = -1; pk.vx = sk.vx * 0.5 + nx * P.dropV; pk.vy = sk.vy * 0.5 + ny * P.dropV; pk.shotBy = -1;
}
function hockeyShoot(st, sk) {
  const P = hockeyP(), R = HOCKEY_RINK, pk = st.pucks[sk.puck], t = sk.charge;
  sk.charge = -1;
  if (!pk) { sk.puck = -1; return; }
  const pow = t < P.tapT ? 0 : clamp((t - P.tapT) / (P.slapT - P.tapT), 0, 1);
  const v = (P.shotV + (P.slapV - P.shotV) * pow) * P.shotK * (sk.lucky ? P.luckyShot : 1);
  // aim help: a shot that just misses the far net is bent onto its nearer inside edge
  let a = sk.a;
  const k = 1 - sk.id, gl = R.gl[k], dir = k ? -1 : 1, inner = P.mouth - P.post - pk.r - 3;
  if ((gl - pk.x) * dir < 0 && Math.abs(gl - pk.x) > 60) {
    const aLo = Math.atan2(R.cy - inner - pk.y, gl - pk.x), aHi = Math.atan2(R.cy + inner - pk.y, gl - pk.x);
    const dLo = hockeyAng(a, aLo), dHi = hockeyAng(a, aHi), win = sk.analog ? P.assistPad : P.assist;
    const inside = Math.sign(dLo) !== Math.sign(dHi) && Math.abs(dLo) + Math.abs(dHi) < Math.PI;
    if (!inside) { const d = Math.abs(dLo) < Math.abs(dHi) ? dLo : dHi; if (Math.abs(d) <= win) a += d; }
  }
  pk.vx = Math.cos(a) * v + sk.vx * P.carryShare; pk.vy = Math.sin(a) * v + sk.vy * P.carryShare;
  pk.carrier = -1; pk.last = sk.id; pk.shotBy = sk.id; pk.shotV = v; pk.counted = false;
  sk.puck = -1; sk.pickCD = P.pickCD; sk.swing = 1; sk.a = a;
  st.stat.hardest[sk.id] = Math.max(st.stat.hardest[sk.id], Math.round(v));
  const slap = pow >= 0.55;
  Sfx.play(slap ? 'hockeySlap' : 'hockeyShot', sk.id); rumble(sk.id, slap ? 0.35 : 0.12, 0.4, slap ? 120 : 60);
  if (slap) { st.stat.slaps[sk.id]++; hockeyPop(st, sk.x, sk.y - 52, 'SLAPSHOT!', C.gold); burst(pk.x, pk.y, C.gold, 8); }
  pk.slap = slap;
}
function hockeyPoke(st, sk) {
  const P = hockeyP();
  if (sk.cd > 0 || sk.wob > 0) return;
  const hx = Math.cos(sk.a), hy = Math.sin(sk.a), fwd = sk.vx * hx + sk.vy * hy;
  const add = Math.max(0, Math.min(P.lunge, P.lungeMax - fwd));
  sk.vx += hx * add; sk.vy += hy * add;
  sk.pokeT = P.pokeT; sk.cd = P.pokeCD; sk.swing = -1;
  Sfx.play('hockeyPoke', sk.id);
  for (let k = 0; k < 4; k++) G.particles.push({ x: sk.x - hx * 10, y: sk.y - hy * 10, vx: -hx * 80 + (hockeyVR() - 0.5) * 60, vy: -hy * 80 + (hockeyVR() - 0.5) * 60, life: 0.3, max: 0.3, col: '#ffffff', size: 3, grav: 0, kind: 'dot' });
}
// a poking stick that reaches the other skater's puck steals it
function hockeySteals(st) {
  const P = hockeyP();
  for (const sk of st.sk) {
    if (sk.pokeT <= 0 || sk.wob > 0) continue;
    const o = st.sk[1 - sk.id];
    if (o.puck < 0 || o.guardT > 0) continue;
    const pk = st.pucks[o.puck], b = hockeyBlade(sk, P.pokeReach - P.reach);
    const reach = P.pokeR + pk.r + (sk.lucky ? P.luckyReach : 0);
    const b2 = hockeyBlade(sk);
    if (Math.hypot(b.x - pk.x, b.y - pk.y) > reach && Math.hypot(b2.x - pk.x, b2.y - pk.y) > reach) continue;
    o.puck = -1; o.charge = -1; o.pickCD = P.stealCD;
    if (sk.puck >= 0) { pk.carrier = -1; pk.vx = sk.vx; pk.vy = sk.vy; continue; } // (two pucks: already carrying one)
    sk.puck = pk.i; pk.carrier = sk.id; pk.last = sk.id; pk.shotBy = -1; sk.guardT = P.guardT; sk.pokeT = 0;
    st.stat.steals[sk.id]++;
    Sfx.play('hockeySteal', sk.id); rumble(sk.id, 0.15, 0.3, 70); rumble(o.id, 0.2, 0.3, 90);
    hockeyPop(st, pk.x, pk.y - 30, 'STEAL!', PCOL[sk.id]);
  }
}

/* ---------- pucks ---------- */
function hockeyPucks(st, dt) {
  const P = hockeyP(), R = HOCKEY_RINK;
  for (const pk of st.pucks) {
    pk.trailT = (pk.trailT || 0) + dt;
    if (pk.drop > 0) { pk.drop = Math.max(0, pk.drop - dt * 2.5); continue; } // dropping in from above at a faceoff
    if (pk.inNet >= 0) { // in the net: slide to the back and rest
      const k = Math.exp(-6 * dt); pk.vx *= k; pk.vy *= k; pk.x += pk.vx * dt; pk.y += pk.vy * dt;
      const b = hockeyNetBox(pk.inNet); pk.x = clamp(pk.x, b.x0 + pk.r, b.x1 - pk.r); pk.y = clamp(pk.y, b.y0 + pk.r + 3, b.y1 - pk.r - 3);
      continue;
    }
    if (pk.carrier >= 0) {
      const sk = st.sk[pk.carrier], bl = hockeyBlade(sk);
      pk.x = bl.x; pk.y = bl.y; pk.vx = sk.vx; pk.vy = sk.vy;
      hockeyBoard(pk, pk.r, 0, 0);
      for (let k = 0; k < 2; k++) hockeyPushBox(pk, pk.r, hockeyNetBox(k), 0);
      if (P.snowman && st.snow) hockeyPushCircle(pk, pk.r, st.snow.x, st.snow.y, P.snowR, 0);
      pk.vx = sk.vx; pk.vy = sk.vy;
      // the puck got pushed off the blade (boards, a net, the snowman): it pops loose
      if (Math.hypot(pk.x - bl.x, pk.y - bl.y) > 16) hockeyDrop(st, sk, (pk.x - bl.x) / 16, (pk.y - bl.y) / 16);
      // carried into the other skater's body: it pops loose too (the other skater can then grab it)
      // (only while skating into them: a carrier standing still or backing off keeps it, so a scrum can't ping-pong)
      const o = st.sk[1 - sk.id], od = Math.hypot(pk.x - o.x, pk.y - o.y), sd = Math.hypot(o.x - sk.x, o.y - sk.y) || 1;
      const into = ((sk.vx - o.vx) * (o.x - sk.x) + (sk.vy - o.vy) * (o.y - sk.y)) / sd;
      if (P.block && sk.puck === pk.i && sk.guardT <= 0 && od < P.r - 2 + pk.r && into > 30 && st.live) {
        const nx = od > 1e-6 ? (pk.x - o.x) / od : -Math.cos(sk.a), ny = od > 1e-6 ? (pk.y - o.y) / od : -Math.sin(sk.a);
        hockeyDrop(st, sk, nx * 0.6, ny * 0.6); pk.bumpBy = o.id; pk.bumpT = st.t;
        o.sq = 0.5; Sfx.play('hockeyThud'); hockeyPop(st, o.x, o.y - 50, 'BLOCKED!', '#ffffff');
      }
      continue;
    }
    // free puck
    const px = pk.x;
    pk.x += pk.vx * dt; pk.y += pk.vy * dt;
    let sp = Math.hypot(pk.vx, pk.vy);
    if (sp > 0) { const ns = Math.max(0, Math.min(P.maxPuckV, sp) * Math.exp(-P.puckDrag * dt) - P.puckFric * dt); pk.vx *= ns / sp; pk.vy *= ns / sp; sp = ns; }
    if (pk.slap && sp < 420) pk.slap = false;
    const hb = hockeyBoard(pk, pk.r, P.puckE, 0);
    if (hb > 90 && st.live) { Sfx.play(P.bouncy ? 'hockeyBoing' : 'hockeyBoard'); if (P.bouncy) st.vis.boardFlash = 0.2; puff(pk.x, pk.y, 3, '#ffffff'); }
    const s2 = Math.hypot(pk.vx, pk.vy); if (s2 > P.maxPuckV) { pk.vx *= P.maxPuckV / s2; pk.vy *= P.maxPuckV / s2; }
    // posts, then the goal line, then the net frame
    for (let k = 0; k < 2; k++) {
      const gl = R.gl[k], dir = k ? -1 : 1;
      for (const sy of [-1, 1]) if (hockeyPushCircle(pk, pk.r, gl, R.cy + sy * P.mouth, P.post, 0.7) > 120 && st.live) { Sfx.play('hockeyPost'); hockeyPop(st, gl, R.cy + sy * P.mouth - 24, 'CLANG!', '#ffffff'); }
      if ((px - gl) * dir > 0 && (pk.x - gl) * dir <= 0 && Math.abs(pk.y - R.cy) < P.mouth - 1) { hockeyScore(st, k, pk); break; }
      if ((pk.x - gl) * dir <= 0 || Math.abs(pk.y - R.cy) >= P.mouth) hockeyPushBox(pk, pk.r, hockeyNetBox(k), 0.6);
    }
    if (pk.inNet >= 0) continue;
    // robots
    for (const b of st.bots) {
      const before = pk.vx;
      const hit = hockeyPushCircle(pk, pk.r, b.x, b.y, b.r, P.botE, 0, b.vy);
      if (hit > 0.001) {
        const dir = b.id ? -1 : 1; pk.vx += dir * 40; // the glove pushes it back out
        if (hit > 150 && st.live) {
          const toward = before * dir < 0;
          if (toward && pk.shotBy === 1 - b.id && !pk.counted) { pk.counted = true; st.stat.shots[pk.shotBy]++; st.stat.saves[b.id]++; }
          b.happy = 0.8; Sfx.play('hockeySave'); hockeyPop(st, b.x, b.y - 44, 'SAVE!', '#7fe0ff'); burst(pk.x, pk.y, '#bfe8ff', 6);
        }
        pk.shotBy = -1;
      }
    }
    // snowman
    if (P.snowman && st.snow && hockeyPushCircle(pk, pk.r, st.snow.x, st.snow.y, P.snowR, 0.85, 0, st.snow.vy) > 120 && st.live) {
      Sfx.play('hockeyOof'); st.snow.wob = 0.5; hockeyPop(st, st.snow.x, st.snow.y - 70, 'OOF!', '#ffffff');
    }
    // skaters' bodies
    for (const sk of st.sk) if (hockeyPushCircle(pk, pk.r, sk.x, sk.y, P.r - 2, P.bodyE, sk.vx, sk.vy) > 200 && st.live) { Sfx.play('hockeyThud'); sk.sq = 0.4; }
    hockeyBoard(pk, pk.r, P.puckE, 0);   // (a body pinning the puck on the boards must not push it out of the rink)
    // a slow puck in a crease: the robot sweeps it out to a corner
    // (only the nearer net's crease counts, so the far one can't keep resetting the timer)
    {
      const k = pk.x < R.cx ? 0 : 1, gl = R.gl[k], dir = k ? -1 : 1, d = Math.hypot(pk.x - gl, pk.y - R.cy);
      if ((pk.x - gl) * dir > 0 && d < P.crease + 2 && Math.hypot(pk.vx, pk.vy) < 90) {
        pk.creaseT += dt;
        if (pk.creaseT >= P.clearT) {
          const sy = pk.y >= R.cy ? 1 : -1, l = Math.hypot(0.55, 0.85);
          pk.vx = dir * 0.55 / l * P.clearV; pk.vy = sy * 0.85 / l * P.clearV; pk.creaseT = 0; pk.shotBy = -1; pk.last = -1;
          st.bots[k].clear = 0.4; if (st.live) Sfx.play('hockeyClear');
        }
      } else if (d >= P.crease + 2) pk.creaseT = 0;
    }
    // looks: a short trail behind fast pucks
    if (sp > 380) { pk.trail.push({ x: pk.x, y: pk.y, t: 0, gold: !!pk.slap }); if (pk.trail.length > 10) pk.trail.shift(); }
  }
  for (const pk of st.pucks) { for (const q of pk.trail) q.t += dt; pk.trail = pk.trail.filter(q => q.t < 0.18); }
}
// free pucks near a blade are picked up (the nearer blade wins)
function hockeyPickups(st) {
  const P = hockeyP();
  for (const pk of st.pucks) {
    if (pk.carrier >= 0 || pk.inNet >= 0 || pk.drop > 0) continue;
    const can = [];
    for (const sk of st.sk) {
      if (sk.puck >= 0 || sk.pickCD > 0 || sk.wob > 0) continue;
      const bl = hockeyBlade(sk), d = Math.hypot(bl.x - pk.x, bl.y - pk.y), rv = Math.hypot(pk.vx - sk.vx, pk.vy - sk.vy);
      const reach = P.catchR + pk.r + (sk.lucky ? P.luckyReach : 0) + (sk.pokeT > 0 ? 6 : 0);
      if (d < reach && rv < P.catchV) can.push({ sk, d });
    }
    if (!can.length) continue;
    // the nearer blade gets it; a dead heat (a mirrored faceoff) goes to each player in turn
    let best = can[0].sk;
    if (can.length === 2) {
      if (Math.abs(can[0].d - can[1].d) < 1) { st.tieN = (st.tieN || 0) + 1; best = can[st.tieN & 1].sk; }
      else best = can[0].d < can[1].d ? can[0].sk : can[1].sk;
    }
    best.puck = pk.i; best.charge = -1; best.guardT = P.guardT;
    pk.carrier = best.id; pk.last = best.id; pk.shotBy = -1; pk.slap = false; pk.creaseT = 0;
    // knocked loose by a bump or a body block, and the other skater got it: that's a steal
    const stole = pk.bumpBy === best.id && st.t - pk.bumpT < 0.7;
    pk.bumpBy = -1;
    if (stole && st.live) { st.stat.steals[best.id]++; Sfx.play('hockeySteal', best.id); hockeyPop(st, pk.x, pk.y - 30, 'STEAL!', PCOL[best.id]); }
    else if (st.live) Sfx.play('hockeyGrab', best.id);
  }
}

/* ---------- robots ---------- */
function hockeyBots(st, dt) {
  const P = hockeyP(), R = HOCKEY_RINK, N = Math.max(1, Math.round(P.botDelay / DT));
  for (const b of st.bots) {
    const dir = b.id ? -1 : 1, gl = R.gl[b.id];
    // watch the puck nearest this net (what it saw botDelay s ago)
    let pk = null, pd = 1e9;
    for (const q of st.pucks) { if (q.inNet >= 0) continue; const d = Math.abs(q.x - gl) + Math.abs(q.y - R.cy) * 0.5; if (d < pd) { pd = d; pk = q; } }
    b.hist.push(pk ? { x: pk.x, y: pk.y, vx: pk.vx, vy: pk.vy, drop: pk.drop } : null);
    while (b.hist.length > N) b.hist.shift();
    const s = b.hist[0];
    let ty = R.cy;
    if (s && !s.drop) {
      // it stands part way toward the puck's side (cutting the angle); a shot coming at it makes it slide to where the
      // shot will cross its line (as it saw it botDelay s ago)
      const toward = s.vx * dir < -200;
      ty = R.cy + (s.y - R.cy) * P.botFollow;
      if (toward) { const tt = clamp((s.x - b.x) / -s.vx, 0, 0.8); ty = R.cy + (s.y + s.vy * tt - R.cy) * P.botLead; }
    }
    ty = clamp(ty, R.cy - P.botRange, R.cy + P.botRange);
    const want = clamp((ty - b.y) * 9, -P.botV, P.botV);
    b.vy = approach(b.vy, want, P.botAcc * dt);
    b.y = clamp(b.y + b.vy * dt, R.cy - P.botRange, R.cy + P.botRange);
    b.x = gl + dir * P.botX;
    b.happy = Math.max(0, b.happy - dt); b.clear = Math.max(0, b.clear - dt);
  }
}

/* ---------- goals, faceoffs, overtime ---------- */
function hockeyScore(st, k, pk) {
  const P = hockeyP(), R = HOCKEY_RINK, s = 1 - k, dir = k ? -1 : 1;
  pk.inNet = k; pk.carrier = -1; pk.x = R.gl[k] - dir * (pk.r + 2); pk.vx *= 0.35; pk.vy *= 0.35;
  if (!st.live || st.phase !== 'play') return;
  st.goals[s]++; st.stat.goals[s]++;
  if (pk.shotBy === s && !pk.counted) { pk.counted = true; st.stat.shots[s]++; }
  const own = pk.last === k;
  for (const sk of st.sk) if (sk.puck >= 0) { const q = st.pucks[sk.puck]; sk.puck = -1; sk.charge = -1; if (q) { q.carrier = -1; } }
  st.phase = 'goal'; st.phaseT = 0; st.goalFx = { net: k, by: s, t: 0, own };
  st.sk[s].cheer = 1.6;
  Sfx.play('hockeyHorn'); Sfx.play('hockeyCheer');
  rumble(s, 0.3, 0.6, 220); rumble(k, 0.15, 0.2, 120);
  for (let i = 0; i < 26; i++) confetti(R.gl[k] + dir * 40, R.cy - 20);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.12);
  st.vis.netShake[k] = 0.5; st.vis.hop = 1.2; st.vis.hopSide = s;
  if (st.goals[s] >= P.goals || st.ot) {
    const o = st.goals[k];
    const why = st.ot ? 'Golden goal in overtime!' : own ? 'An own goal makes it ' + st.goals[s] + '–' + o + '!' : o === 0 ? 'A shutout, ' + st.goals[s] + '–0!' : 'First to 3 goals, ' + st.goals[s] + '–' + o + '!';
    matchRoundEnd(s, why);
  }
}
function hockeyStoppage(st, dt) {
  const P = hockeyP(), m = G.match;
  st.phaseT += dt;
  if (m && m.roundTime > 0) m.timeLeft = Math.min(st.otOn ? P.otTime : m.roundTime, m.timeLeft + dt); // the clock stops
  if (st.phase === 'goal' && st.phaseT >= P.goalT) { st.phase = 'face'; st.phaseT = 0; hockeyFaceoff(st, false); Sfx.play('hockeyWhistle'); }
  else if (st.phase === 'ot' && st.phaseT >= P.otT) { st.phase = 'face'; st.phaseT = 0; hockeyFaceoff(st, false); Sfx.play('hockeyWhistle'); }
  else if (st.phase === 'face' && st.phaseT >= P.faceT) { st.phase = 'play'; st.phaseT = 0; Sfx.play('hockeyDrop'); }
}
// called every live tick: a tied game about to hit the bell goes to overtime instead
function hockeyOvertimeCheck(st, dt) {
  const P = hockeyP(), m = G.match;
  if (!m || m.roundTime <= 0 || st.ot || st.phase !== 'play') return;
  if (m.timeLeft - dt > 1e-9 || st.goals[0] !== st.goals[1]) return;
  st.ot = true; st.otOn = true; m.timeLeft = P.otTime; m.lastSec = Math.ceil(P.otTime);
  st.phase = 'ot'; st.phaseT = 0; st.alert = { text: 'Overtime: next goal wins!', t: 0, life: 6 };
  // sleepy robots, so a goal comes sooner (the same for both nets; said on the overtime card)
  st.P = Object.assign({}, P, { botV: P.botV * P.otBotV, botDelay: P.botDelay * P.otBotDelay });
  for (const b of st.bots) b.r = Math.max(8, b.r - P.otBotR);
  for (const sk of st.sk) { if (sk.puck >= 0) { const q = st.pucks[sk.puck]; if (q) q.carrier = -1; } sk.puck = -1; sk.charge = -1; }
  Sfx.play('hockeyBell');
}

/* ---------- the tick ---------- */
function hockeyTick(dt, live) {
  const st = G.mst, P = hockeyP(), R = HOCKEY_RINK;
  st.live = live; st.t += dt;
  // the snowman slides up and down the red line
  if (P.snowman) {
    const sn = st.snow, ph = st.snowT = (st.snowT || 0) + (live ? dt : 0), w = 2 * Math.PI / P.snowPeriod;
    const y = R.cy + Math.sin(ph * w) * P.snowAmp;
    sn.vy = (y - sn.y) / Math.max(dt, 1e-6); sn.y = y; sn.x = R.cx; sn.wob = Math.max(0, (sn.wob || 0) - dt);
  }
  const play = live && st.phase === 'play';
  for (const sk of st.sk) {
    const p = G.players[sk.id];
    const inp = live ? hockeyInput(p) : null;
    if (inp && inp.any) sk.analog = inp.analog;
    if (st.phase === 'face') { sk.vx = 0; sk.vy = 0; continue; }
    hockeySkate(st, sk, play ? inp : null, dt);
    if (play && inp) {
      if (sk.puck >= 0) {
        if (sk.charge >= 0) { sk.charge += dt; if (!inp.hold || sk.charge >= P.autoT) hockeyShoot(st, sk); }
        else if (inp.press) sk.charge = 0;
      } else if (inp.press) hockeyPoke(st, sk);
    }
    hockeySkaterWorld(st, sk);
    // looks
    sk.sq = Math.max(0, sk.sq - dt * 4); sk.cheer = Math.max(0, sk.cheer - dt); sk.swing = approach(sk.swing, 0, dt * 4);
    if (sk.sprayT > 0) { sk.sprayT -= dt; if (Math.hypot(sk.vx, sk.vy) > 80 && hockeyVR() < 0.5) G.particles.push({ x: sk.x + (hockeyVR() - 0.5) * 16, y: sk.y + 4, vx: sk.vx * 0.4 + (hockeyVR() - 0.5) * 90, vy: sk.vy * 0.4 - 30 - hockeyVR() * 40, life: 0.35, max: 0.35, col: '#ffffff', size: 2.5 + hockeyVR() * 2, grav: 160, kind: 'dot' }); }
  }
  if (st.phase !== 'face') hockeyBump(st);
  for (const sk of st.sk) hockeySkaterWorld(st, sk);
  if (play) hockeySteals(st);
  hockeyPucks(st, dt);
  if (play) hockeyPickups(st);
  hockeyBots(st, dt);
  hockeySync(st);
  hockeyVisTick(st, dt);
  if (!live) return;
  if (st.phase !== 'play') hockeyStoppage(st, dt);
  else hockeyOvertimeCheck(st, dt);
  hockeyActLabels(st);
}

/* ---------- action labels: 'shoot' with the puck, 'poke' without, on the round touch buttons only (the top bar keeps
   the level's static 'shoot', so it never shifts about when the puck changes hands) ---------- */
let hockeyLabelEls = null;
function hockeyActLabels(st) {
  try {
    if (!hockeyLabelEls || !hockeyLabelEls.every(o => document.contains(o.el))) hockeyLabelEls = Array.from(document.querySelectorAll('.tbtn-act[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]');
      return { el, id: box && box.dataset.p !== undefined ? +box.dataset.p : -1 };
    });
    let changed = false;
    for (const o of hockeyLabelEls) {
      const want = o.id < 0 ? 'shoot' : st.sk[o.id].puck >= 0 ? 'shoot' : 'poke';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}

/* ---------- looks ---------- */
function hockeyPop(st, x, y, text, col) {
  if (!st.vis) return;
  st.vis.pops.push({ x: clamp(x, 60, W - 60), y: Math.max(y, 120), text, col, t: 0 });
  if (st.vis.pops.length > 6) st.vis.pops.shift();
}
function hockeyVisNew() { return { pops: [], netShake: [0, 0], hop: 0, hopSide: -1, boardFlash: 0 }; }
function hockeyVisTick(st, dt) {
  const v = st.vis;
  for (const q of v.pops) q.t += dt;
  v.pops = v.pops.filter(q => q.t < 0.9);
  v.netShake = v.netShake.map(x => Math.max(0, x - dt)); v.hop = Math.max(0, v.hop - dt); v.boardFlash = Math.max(0, v.boardFlash - dt);
  if (st.goalFx) { st.goalFx.t += dt; if (st.goalFx.t > 2.4) st.goalFx = null; }
  if (st.alert) { st.alert.t += dt; if (st.alert.t > (st.alert.life || 2.4)) st.alert = null; }
}

MODES.hockey = {
  rand: Math.random,
  setup(st, L) {
    for (const row of L.grid) row.fill('.');
    st.stat = { goals: [0, 0], shots: [0, 0], steals: [0, 0], saves: [0, 0], slaps: [0, 0], hardest: [0, 0], bumps: 0 };
    const mix = HOCKEY_MIX.slice();
    for (let i = mix.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [mix[i], mix[j]] = [mix[j], mix[i]]; }
    st.order = ['classic', ...mix];
    st.over = this.testOver || null; st.forceTwist = this.testTwist || null;
    st.vis = hockeyVisNew(); st.t = 0;
  },
  resetRound(n, info) {
    const st = G.mst, m = G.match;
    st.twist = st.forceTwist || st.order[Math.min(n, st.order.length) - 1];
    st.P = Object.assign({}, HOCKEY, HOCKEY_TWISTS[st.twist].P, st.over || {});
    const P = st.P;
    st.goals = [0, 0]; st.ot = false; st.otOn = false; st.phase = 'play'; st.phaseT = 0; st.goalFx = null; st.alert = null; st.t = 0;
    st.vis = hockeyVisNew(); st.snowT = 0;
    st.snow = P.snowman ? { x: HOCKEY_RINK.cx, y: HOCKEY_RINK.cy, vy: 0, wob: 0 } : null;
    st.sk = [0, 1].map(hockeyMakeSkater);
    st.bots = [0, 1].map(hockeyMakeBot);
    // gold catch-up: 2+ rounds behind -> Lucky stick and a Big Glove robot (announced on the round card)
    const lead = m.wins[0] - m.wins[1], deficit = [Math.max(0, -lead), Math.max(0, lead)];
    st.gold = [0, 1].map(k => deficit[k] >= P.goldMin);
    for (const k of [0, 1]) { st.sk[k].lucky = st.gold[k]; st.bots[k].r = st.gold[k] ? P.gloveR : P.botR; }
    st.goldSaid = false;
    hockeyFaceoff(st, true);
    for (const pk of st.pucks) pk.drop = 0;
  },
  go() { const st = G.mst; if (st.pucks) for (const pk of st.pucks) pk.drop = 0; Sfx.play('hockeyDrop'); },
  step(dt) { hockeyTick(dt, true); },
  idle(dt) {
    const st = G.mst, m = G.match; if (!st.sk) return;
    if (m.phase === 'end') {
      if (m.end && m.end.winner >= 0 && !st.cele) { st.cele = true; st.sk[m.end.winner].cheer = 2.4; }
      hockeyTick(dt, false);
    } else { st.cele = false; hockeyVisTick(st, dt); }
    if (m.phase === 'count' && !st.goldSaid && m.t >= 0.05) {
      st.goldSaid = true;
      for (const k of [0, 1]) if (st.gold[k]) { Sfx.play('hockeyGold', k); burst(st.sk[k].x, st.sk[k].y - 20, C.gold, 12); }
    }
  },
  timeUp() {
    const st = G.mst, g = st.goals;
    if (g[0] !== g[1]) return { winner: g[0] > g[1] ? 0 : 1, reason: 'More goals at the bell, ' + Math.max(g[0], g[1]) + '–' + Math.min(g[0], g[1]) + '!' };
    // overtime ran out: the puck's end decides (in Bo's end, Pip wins; in Pip's end, Bo wins)
    let sum = 0; for (const pk of st.pucks) sum += pk.x - HOCKEY_RINK.cx;
    if (Math.abs(sum) >= 1) { const w = sum > 0 ? 0 : 1; return { winner: w, reason: 'The puck was in ' + NAMES[1 - w] + '’s end at the bell!' }; }
    const last = st.pucks.map(p => p.last).find(x => x === 0 || x === 1);
    if (last === 0 || last === 1) return { winner: last, reason: 'Last touch at the bell!' };
    return { winner: -1, reason: 'Nobody touched the puck!' };
  },
  tiebreak() {
    const s = G.mst.stat;
    if (s.goals[0] !== s.goals[1]) return { winner: s.goals[0] > s.goals[1] ? 0 : 1, reason: 'Most goals this match!' };
    if (s.steals[0] !== s.steals[1]) return { winner: s.steals[0] > s.steals[1] ? 0 : 1, reason: 'Most steals this match!' };
    return -1;
  },
  draw() { hockeyDrawRink(); },
  drawTop() { hockeyDrawTop(); },
  hud() { hockeyHud(); },
  stats() {
    const s = G.mst.stat;
    const out = [
      { label: 'Goals', values: s.goals.slice() },
      { label: 'Shots on goal', values: s.shots.slice() },
      { label: 'Steals', values: s.steals.slice() },
      { label: 'Robot saves', values: s.saves.slice() },
    ];
    if (s.slaps[0] || s.slaps[1]) out.push('Slapshots: Pip ' + s.slaps[0] + ', Bo ' + s.slaps[1] + (s.bumps ? ' · Bouncy bumps: ' + s.bumps : '') + '!');
    else if (s.bumps > 0) out.push('Bouncy bumps: ' + s.bumps + '!');
    return out;
  },
  // test access for bot harnesses and the computer brain (read-only helpers)
  test: { HOCKEY, HOCKEY_RINK, HOCKEY_TWISTS, blade: hockeyBlade, netBox: hockeyNetBox, padJump: hockeyPadJump },
};

/* ---------- drawing ---------- */
function hockeyRinkPath(g, inset = 0) {
  const R = HOCKEY_RINK, x0 = R.x0 + inset, y0 = R.y0 + inset, w = R.x1 - R.x0 - 2 * inset, h = R.y1 - R.y0 - 2 * inset, r = R.cr - inset;
  g.beginPath(); g.moveTo(x0 + r, y0); g.arcTo(x0 + w, y0, x0 + w, y0 + h, r); g.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
  g.arcTo(x0, y0 + h, x0, y0, r); g.arcTo(x0, y0, x0 + w, y0, r); g.closePath();
}
function hockeyDrawCrowd() {
  const st = G.mst, v = st.vis || {}, cols = HOCKEY_COLS.crowd;
  const hopK = v.hop > 0 ? Math.sin((1.2 - v.hop) * 14) : 0;
  // top stands (mostly under the HUD) and the bottom row
  for (let row = 0; row < 3; row++) for (let i = 0; i < 40; i++) {
    const x = 14 + i * 24 + (row % 2 ? 12 : 0), y = 64 + row * 16, side = x < W / 2 ? 0 : 1;
    const h = hash(i, row + 3), hop = v.hop > 0 && side === v.hopSide ? Math.abs(hopK) * 6 * ((h % 3) / 2 + 0.5) : 0;
    ctx.fillStyle = cols[h % cols.length]; rr(x - 8, y - 2 - hop, 16, 14, 6); ctx.fill();
    ctx.fillStyle = ['#f6d2b0', '#e0a97c', '#b97a53', '#8a5636'][(h >> 3) % 4]; circle(x, y - 6 - hop, 6); ctx.fill();
  }
  for (let i = 0; i < 40; i++) {
    const x = 14 + i * 24, y = 532, h = hash(i, 9), side = x < W / 2 ? 0 : 1;
    const hop = v.hop > 0 && side === v.hopSide ? Math.abs(hopK) * 5 : 0;
    ctx.fillStyle = cols[h % cols.length]; circle(x, y + 4 - hop, 8); ctx.fill();
    ctx.fillStyle = ['#f6d2b0', '#e0a97c', '#b97a53', '#8a5636'][(h >> 3) % 4]; circle(x, y - 6 - hop, 6); ctx.fill();
  }
}
function hockeyDrawRink() {
  const st = G.mst, R = HOCKEY_RINK, Q = HOCKEY_COLS, P = hockeyP(), v = st.vis || hockeyVisNew();
  // the arena
  ctx.fillStyle = Q.arena; ctx.fillRect(0, 0, W, H);
  const lg = ctx.createLinearGradient(0, 0, 0, 120); lg.addColorStop(0, Q.arenaDk); lg.addColorStop(1, Q.arena);
  ctx.fillStyle = lg; ctx.fillRect(0, 0, W, 120);
  // banners: little pennants hanging from the roof
  for (let i = 0; i < 16; i++) {
    const x = 30 + i * 60, col = i % 2 ? C.pip : C.bo;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 9, 0); ctx.lineTo(x + 9, 0); ctx.lineTo(x, 16); ctx.closePath(); ctx.fill();
  }
  hockeyDrawCrowd();
  // the boards (springy pink in Bouncy Boards)
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; hockeyRinkPath(ctx, -12); ctx.save(); ctx.translate(0, 5); ctx.fill(); ctx.restore();
  ctx.fillStyle = P.bouncy ? (v.boardFlash > 0 ? '#ffd1ea' : Q.spring) : Q.board; hockeyRinkPath(ctx, -10); ctx.fill();
  ctx.fillStyle = P.bouncy ? Q.springDk : Q.kick; hockeyRinkPath(ctx, -4); ctx.fill();
  // the ice
  const ig = ctx.createLinearGradient(0, R.y0, 0, R.y1); ig.addColorStop(0, Q.ice); ig.addColorStop(1, Q.iceDk);
  ctx.fillStyle = ig; hockeyRinkPath(ctx, 0); ctx.fill();
  ctx.save(); hockeyRinkPath(ctx, 0); ctx.clip();
  // skate scratches (fixed)
  ctx.strokeStyle = Q.iceLine; ctx.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const h = hash(i, 41), x = R.x0 + 20 + (h % 840), y = R.y0 + 16 + ((h >> 10) % 370), a = ((h >> 4) % 100) / 100 * Math.PI;
    ctx.beginPath(); ctx.arc(x, y, 30 + (h % 40), a, a + 0.6); ctx.stroke();
  }
  // markings: centre red line, blue lines, goal lines, circles
  ctx.fillStyle = Q.red; ctx.fillRect(R.cx - 3, R.y0, 6, R.y1 - R.y0);
  ctx.fillStyle = Q.blue; ctx.fillRect(R.cx - 150 - 4, R.y0, 8, R.y1 - R.y0); ctx.fillRect(R.cx + 150 - 4, R.y0, 8, R.y1 - R.y0);
  ctx.fillStyle = Q.red; for (const gl of R.gl) ctx.fillRect(gl - 1.5, R.y0, 3, R.y1 - R.y0);
  ctx.strokeStyle = Q.blue; ctx.lineWidth = 3; circle(R.cx, R.cy, 62); ctx.stroke();
  ctx.fillStyle = Q.blue; circle(R.cx, R.cy, 5); ctx.fill();
  ctx.strokeStyle = Q.red; ctx.lineWidth = 2.5;
  for (const [x, y] of [[R.gl[0] + 96, R.cy - 110], [R.gl[0] + 96, R.cy + 110], [R.gl[1] - 96, R.cy - 110], [R.gl[1] - 96, R.cy + 110]]) {
    circle(x, y, 40); ctx.stroke(); ctx.fillStyle = Q.red; circle(x, y, 4); ctx.fill();
  }
  // the centre logo: a snowflake
  ctx.save(); ctx.translate(R.cx, R.cy); ctx.strokeStyle = 'rgba(74,134,224,0.35)'; ctx.lineWidth = 3;
  for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, 44); ctx.moveTo(0, 30); ctx.lineTo(8, 38); ctx.moveTo(0, 30); ctx.lineTo(-8, 38); ctx.stroke(); }
  ctx.restore();
  // creases
  for (let k = 0; k < 2; k++) {
    const gl = R.gl[k], dir = k ? -1 : 1, a0 = k ? Math.PI / 2 : -Math.PI / 2;
    ctx.fillStyle = Q.crease; ctx.beginPath(); ctx.moveTo(gl, R.cy); ctx.arc(gl, R.cy, P.crease, a0, a0 + Math.PI * dir, dir < 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = Q.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(gl, R.cy, P.crease, a0, a0 + Math.PI * dir, dir < 0); ctx.stroke();
    // the robot's track
    ctx.strokeStyle = 'rgba(74,90,130,0.35)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(gl + dir * P.botX, R.cy - P.botRange); ctx.lineTo(gl + dir * P.botX, R.cy + P.botRange); ctx.stroke(); ctx.lineCap = 'butt';
  }
  // overtime: the half the puck is in glows in the colour of the player it would win for (last 8 s)
  const m = G.match;
  if (st.ot && st.pucks && m && m.phase === 'live' && m.timeLeft <= 8 && st.phase === 'play') {
    let sum = 0; for (const pk of st.pucks) sum += pk.x - R.cx;
    if (Math.abs(sum) >= 1) {
      const w = sum > 0 ? 0 : 1; ctx.globalAlpha = 0.14 + 0.06 * Math.sin(G.clock * 8);
      ctx.fillStyle = PCOL[w]; ctx.fillRect(sum > 0 ? R.cx : R.x0, R.y0, (R.x1 - R.x0) / 2, R.y1 - R.y0); ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
  // bouncy boards: springs drawn along the inside edge
  if (P.bouncy) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 22; i++) { const x = R.x0 + R.cr + i * ((R.x1 - R.x0 - 2 * R.cr) / 21); circle(x, R.y0 - 4, 3); ctx.fill(); circle(x, R.y1 + 4, 3); ctx.fill(); }
  }
  // nets (the back part: mesh and frame)
  for (let k = 0; k < 2; k++) hockeyDrawNet(k, v.netShake[k]);
  // goal lights behind the nets
  for (let k = 0; k < 2; k++) {
    const on = st.goalFx && st.goalFx.net === k && st.goalFx.t < 2.2 && Math.floor(st.goalFx.t * 8) % 2 === 0;
    const x = k ? R.x1 + 8 : R.x0 - 8;
    ctx.fillStyle = on ? '#ff3b4e' : '#7a2a3a'; circle(x, R.cy, 8); ctx.fill();
    if (on) { ctx.fillStyle = 'rgba(255,80,100,0.35)'; circle(x, R.cy, 22); ctx.fill(); }
  }
  ctx.restore();
}
function hockeyDrawNet(k, shake) {
  const R = HOCKEY_RINK, P = hockeyP(), b = hockeyNetBox(k), Q = HOCKEY_COLS, gl = R.gl[k], dir = k ? -1 : 1;
  const sx = shake > 0 && !reduceMotion ? Math.sin(shake * 60) * 2 : 0;
  ctx.save(); ctx.translate(sx, 0);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  ctx.strokeStyle = Q.mesh; ctx.lineWidth = 1;
  ctx.save(); ctx.beginPath(); ctx.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ctx.clip();
  ctx.strokeStyle = 'rgba(150,170,200,0.7)';
  for (let i = -100; i < 120; i += 7) { ctx.beginPath(); ctx.moveTo(b.x0 + i, b.y0); ctx.lineTo(b.x0 + i + 100, b.y1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(b.x0 + i + 100, b.y0); ctx.lineTo(b.x0 + i, b.y1); ctx.stroke(); }
  ctx.restore();
  // frame: back bar and sides (open toward the ice)
  ctx.strokeStyle = Q.net; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  const back = gl - dir * P.netD;
  ctx.beginPath(); ctx.moveTo(gl, R.cy - P.mouth); ctx.lineTo(back, R.cy - P.mouth + 4); ctx.lineTo(back, R.cy + P.mouth - 4); ctx.lineTo(gl, R.cy + P.mouth); ctx.stroke();
  ctx.fillStyle = Q.net; circle(gl, R.cy - P.mouth, P.post + 1); ctx.fill(); circle(gl, R.cy + P.mouth, P.post + 1); ctx.fill();
  ctx.restore();
}
function hockeyDrawPuck(pk) {
  const Q = HOCKEY_COLS;
  for (const q of pk.trail) { ctx.globalAlpha = 0.35 * (1 - q.t / 0.18); ctx.fillStyle = q.gold ? C.gold : '#9fb3cc'; circle(q.x, q.y, pk.r * (1 - q.t / 0.3)); ctx.fill(); }
  ctx.globalAlpha = 1;
  const lift = pk.drop > 0 ? pk.drop * 70 : 0;
  ctx.fillStyle = 'rgba(28,26,54,0.22)'; ctx.beginPath(); ctx.ellipse(pk.x, pk.y + 2, pk.r * 1.1 * (1 - pk.drop * 0.4), pk.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  const y = pk.y - lift;
  ctx.fillStyle = Q.puck; ctx.beginPath(); ctx.ellipse(pk.x, y + 1.5, pk.r, pk.r * 0.78, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = Q.puckHi; ctx.beginPath(); ctx.ellipse(pk.x, y - 0.5, pk.r * 0.92, pk.r * 0.66, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(pk.x - pk.r * 0.3, y - pk.r * 0.25, pk.r * 0.35, pk.r * 0.18, -0.3, 0, Math.PI * 2); ctx.fill();
}
// skaters are drawn a bit bigger on small screens (the rules never read this)
const hockeyScale = () => (hudBig() ? 1.45 : 1.25);
function hockeyDrawStick(sk, front) {
  const Q = HOCKEY_COLS, S = hockeyScale();
  const hx = Math.cos(sk.a), hy = Math.sin(sk.a);
  // hands at the body's middle; the blade on the ice ahead (raised behind while charging a slapshot)
  const hand = { x: sk.x + hx * 6, y: sk.y - 15 * S + hy * 4 };
  let bl = hockeyBlade(sk);
  const ch = sk.charge >= 0 ? clamp(sk.charge / hockeyP().slapT, 0, 1) : 0;
  // (a slapshot wind-up lifts the stick up behind the head, drawn in front of the body so it shows)
  if (ch > 0) bl = { x: sk.x - hx * (12 + 16 * ch), y: sk.y - 30 - 26 * ch - hy * 8 };
  else if (sk.pokeT > 0) bl = hockeyBlade(sk, 8);
  if ((Math.sin(sk.a) < -0.2 && ch <= 0) === front) return;
  const col = sk.lucky ? C.gold : Q.stick, dk = sk.lucky ? C.goldDark : Q.stickDk;
  ctx.lineCap = 'round';
  ctx.strokeStyle = dk; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(bl.x, bl.y); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(bl.x, bl.y); ctx.stroke();
  // the blade: a short hook across the shaft
  const px = -hy, py = hx;
  ctx.strokeStyle = sk.lucky ? C.gold : Q.tape; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(bl.x - px * 7, bl.y - py * 7); ctx.lineTo(bl.x + px * 5, bl.y + py * 5); ctx.stroke();
  ctx.lineCap = 'butt';
  if (sk.lucky && hockeyVR() < 0.08) G.particles.push({ x: bl.x, y: bl.y, vx: 0, vy: -30, life: 0.4, max: 0.4, col: C.gold, size: 2.5, grav: 0, kind: 'dot' });
}
function hockeyDrawSkater(sk) {
  const p = G.players[sk.id], S = hockeyScale(), m = G.match;
  // team ring on the ice
  ctx.strokeStyle = PCOL[sk.id]; ctx.globalAlpha = 0.55; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(sk.x, sk.y + 1, 19, 8, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(sk.x, sk.y + 1, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
  // charge ring
  if (sk.charge >= 0) {
    const f = clamp(sk.charge / hockeyP().slapT, 0, 1);
    ctx.strokeStyle = f >= 1 ? C.gold : '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sk.x, sk.y + 1, 24, 11, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
    // the aim: a dotted line ahead of the puck
    const pk = G.mst.pucks[sk.puck];
    if (pk) {
      ctx.fillStyle = f >= 1 ? C.gold : PCOL[sk.id];
      for (let i = 1; i <= 5; i++) { const d = 14 + i * (10 + 10 * f); ctx.globalAlpha = 0.9 - i * 0.13; circle(pk.x + Math.cos(sk.a) * d, pk.y + Math.sin(sk.a) * d, 3); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }
  hockeyDrawStick(sk, false);
  // skates
  ctx.strokeStyle = '#9aa7bd'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sk.x + s * 6 - 5, sk.y + 1); ctx.lineTo(sk.x + s * 6 + 5, sk.y + 1); ctx.stroke(); }
  ctx.lineCap = 'butt';
  // the body (Pip or Bo), squashed on bumps, hopping when cheering, spinning a little when wobbly
  const hop = sk.cheer > 0 && !reduceMotion ? Math.abs(Math.sin(sk.cheer * 9)) * 9 : 0;
  ctx.save(); ctx.translate(sk.x, sk.y - hop);
  if (sk.wob > 0 && !reduceMotion) ctx.rotate(Math.sin(sk.spinA) * 0.25);
  const sq = sk.sq;
  ctx.scale(S * (1 + sq * 0.18), S * (1 - sq * 0.15));
  const face = Math.cos(sk.a) >= 0 ? 1 : -1;
  drawPlayer(Object.assign({}, p, { alive: true, x: -p.w / 2, y: -p.h, face, vy: 0, stun: sk.wob > 0 ? 1 : 0, stompSafe: 0 }));
  ctx.restore();
  hockeyDrawStick(sk, true);
  // the round-card name tag (the computer's says so)
  if (m && (m.phase === 'ready' || m.phase === 'count' || m.phase === 'intro')) hockeyTag(sk);
}
function hockeyTag(sk) {
  const big = hudBig(), cpu = hockeyCpu(sk.id), s = big ? 1.4 : 1, hw = (cpu ? 30 : 18) * s, x = sk.x, y = sk.y + 24 * s;
  ctx.fillStyle = PCOL[sk.id]; rr(x - hw, y - 9 * s, hw * 2, 18 * s, 9 * s); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 4 * s, y - 9 * s); ctx.lineTo(x + 4 * s, y - 9 * s); ctx.lineTo(x, y - 13 * s); ctx.fill();
  text(cpu ? NAMES[sk.id] + ' · CPU' : NAMES[sk.id], x, y + 0.5, 12 * s, '#fff', 'center', 'body');
}
function hockeyDrawBot(b) {
  const Q = HOCKEY_COLS, P = hockeyP(), st = G.mst, gold = st.gold && st.gold[b.id], dir = b.id ? -1 : 1;
  const x = b.x, y = b.y, happy = b.happy > 0;
  ctx.fillStyle = 'rgba(28,26,54,0.22)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 17, 7, 0, 0, Math.PI * 2); ctx.fill();
  // the glove (on the side the puck is on), bigger and gold with the Big Glove
  const gy = y + (st.pucks && st.pucks[0] && st.pucks[0].y < y ? -1 : 1) * 12, gr = gold ? 11 : 7.5;
  const tilt = b.clear > 0 ? Math.sin(b.clear * 20) * 6 : 0;
  ctx.fillStyle = gold ? C.gold : '#e2475a'; ctx.strokeStyle = gold ? C.goldDark : '#8a1f38'; ctx.lineWidth = 2;
  circle(x + dir * (8 + tilt), gy - 12, gr); ctx.fill(); ctx.stroke();
  // body
  ctx.fillStyle = Q.bot; ctx.strokeStyle = Q.botDk; ctx.lineWidth = 2.5;
  rr(x - 12, y - 32, 24, 30, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PCOL[b.id]; ctx.fillRect(x - 11, y - 12, 22, 5);
  // visor + LED eyes
  ctx.fillStyle = Q.visor; rr(x - 9, y - 28, 18, 11, 5); ctx.fill();
  ctx.strokeStyle = happy ? C.gold : '#7fe0ff'; ctx.fillStyle = '#7fe0ff'; ctx.lineWidth = 2;
  const look = clamp(b.vy / 120, -1, 1) * 1.5;
  for (const ex of [-4, 4]) {
    if (st.ot && !happy) { ctx.beginPath(); ctx.moveTo(x + ex - 2.5, y - 22); ctx.lineTo(x + ex + 2.5, y - 22); ctx.stroke(); } // sleepy
    else if (happy) { ctx.beginPath(); ctx.moveTo(x + ex - 2.5, y - 21); ctx.lineTo(x + ex, y - 24); ctx.lineTo(x + ex + 2.5, y - 21); ctx.stroke(); }
    else { circle(x + ex, y - 22.5 + look, 2); ctx.fill(); }
  }
  // antenna
  ctx.strokeStyle = Q.botDk; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 32); ctx.lineTo(x, y - 39); ctx.stroke();
  ctx.fillStyle = happy || Math.floor(G.clock * 2) % 2 ? '#ff5f6e' : '#ffd1d6'; circle(x, y - 41, 3); ctx.fill();
  if (st.ot && !happy) { const zt = (G.clock * 0.8 + b.id * 0.5) % 1; ctx.globalAlpha = 1 - zt; text('z', x - dir * (8 + zt * 8), y - 46 - zt * 14, 11 + zt * 5, '#bfe8ff', 'center'); ctx.globalAlpha = 1; }
  if (gold && b.r > P.botR) { ctx.strokeStyle = C.gold; ctx.globalAlpha = 0.45; ctx.lineWidth = 2; circle(x, y - 4, b.r + 2); ctx.stroke(); ctx.globalAlpha = 1; }
}
function hockeyDrawSnowman(sn) {
  const x = sn.x, y = sn.y, w = sn.wob > 0 && !reduceMotion ? Math.sin(sn.wob * 30) * 0.12 : 0;
  ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 28, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(w);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#b9cde0'; ctx.lineWidth = 2;
  circle(0, -14, 24); ctx.fill(); ctx.stroke();
  circle(0, -46, 16); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e2475a'; rr(-15, -34, 30, 7, 3); ctx.fill(); ctx.fillRect(6, -32, 7, 16);
  ctx.fillStyle = C.ink; circle(-5, -50, 2.2); ctx.fill(); circle(5, -50, 2.2); ctx.fill();
  for (const yy of [-20, -10]) { circle(0, yy, 2.2); ctx.fill(); }
  ctx.fillStyle = '#ff9a3d'; ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(10, -44); ctx.lineTo(0, -42); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.ink; ctx.fillRect(-11, -64, 22, 4); ctx.fillRect(-7, -76, 14, 13);
  ctx.restore();
}
function hockeyDrawTop() {
  const st = G.mst, R = HOCKEY_RINK; if (!st.sk) return;
  for (const pk of st.pucks) if (pk.inNet < 0 && pk.carrier < 0) hockeyDrawPuck(pk);
  for (const pk of st.pucks) if (pk.inNet >= 0) hockeyDrawPuck(pk);
  // everything that stands up, back to front
  const items = [];
  for (const sk of st.sk) items.push({ y: sk.y, f: () => hockeyDrawSkater(sk) });
  for (const pk of st.pucks) if (pk.carrier >= 0) items.push({ y: pk.y - 0.5, f: () => hockeyDrawPuck(pk) });
  for (const b of st.bots) items.push({ y: b.y, f: () => hockeyDrawBot(b) });
  if (st.snow) items.push({ y: st.snow.y, f: () => hockeyDrawSnowman(st.snow) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) { ctx.save(); it.f(); ctx.restore(); }
  // a faint copy of every puck on top, so a puck behind a skater, a robot or the snowman can still be seen
  ctx.save(); ctx.globalAlpha = 0.4;
  for (const pk of st.pucks) if (pk.drop <= 0) { ctx.fillStyle = HOCKEY_COLS.puck; ctx.beginPath(); ctx.ellipse(pk.x, pk.y + 0.5, pk.r, pk.r * 0.78, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  // pops
  for (const q of st.vis.pops) {
    const a = q.t < 0.6 ? 1 : 1 - (q.t - 0.6) / 0.3, s = 0.7 + 0.5 * Math.min(1, q.t / 0.12);
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); bigText(q.text, q.x, q.y - q.t * 26, 20, q.col, s); ctx.restore();
  }
  // GOAL!
  const g = st.goalFx;
  if (g && g.t < 1.9 && G.match && G.match.phase === 'live') {
    const a = g.t > 1.5 ? 1 - (g.t - 1.5) / 0.4 : 1, s = 0.6 + 0.55 * Math.min(1, g.t / 0.18) - 0.1 * Math.min(1, Math.max(0, g.t - 0.18) / 0.2);
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
    bigText('GOAL!', R.cx, R.cy - 40, 76, PCOL[g.by], s);
    bigText(g.own ? 'Own goal! ' + NAMES[g.by] + ' gets it' : NAMES[g.by] + ' scores!', R.cx, R.cy + 22, hudBig() ? 30 : 24, C.paper);
    ctx.restore();
  }
  // overtime card (play waits for the faceoff)
  if (st.phase === 'ot') {
    const big = hudBig();
    ctx.save(); ctx.globalAlpha = clamp(st.phaseT / 0.2, 0, 1);
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; const w = big ? 600 : 470, h = big ? 150 : 118; rr(R.cx - w / 2, R.cy - 92, w, h, 18); ctx.fill();
    bigText('OVERTIME!', R.cx, R.cy - 92 + (big ? 40 : 32), big ? 48 : 40, C.gold);
    text('Next goal wins! The robots are getting sleepy…', R.cx, R.cy - 92 + (big ? 88 : 70), big ? 21 : 16, C.paper, 'center', 'body');
    text('No goal? Keep the puck in their end at the bell.', R.cx, R.cy - 92 + (big ? 120 : 96), big ? 21 : 16, C.paper, 'center', 'body');
    ctx.restore();
  }
}
// the faceoff "drop" pill and the HUD
function hockeyPuckIcon(x, y, r, on, k) {
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
  if (on) { ctx.fillStyle = PCOL[k]; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke(); }
  else { ctx.strokeStyle = 'rgba(246,239,223,0.7)'; ctx.lineWidth = 1.5; ctx.stroke(); }
}
// which way each player shoots: an arrow in their colour on the ice, beside them (round cards and faceoffs)
function hockeyDirArrows(alpha) {
  const st = G.mst, R = HOCKEY_RINK; if (!st.sk) return;
  ctx.save(); ctx.globalAlpha = alpha;
  for (const sk of st.sk) {
    const dir = sk.id ? -1 : 1, x0 = sk.x + dir * 30, x1 = sk.x + dir * 92, y = sk.y - 40;
    ctx.strokeStyle = PCOL[sk.id]; ctx.fillStyle = PCOL[sk.id]; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1 - dir * 12, y); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(x1 + dir * 4, y); ctx.lineTo(x1 - dir * 16, y - 13); ctx.lineTo(x1 - dir * 16, y + 13); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function hockeyKeyChip(sk, big) {
  if (hockeyCpu(sk.id)) return;
  let k = 'kb'; try { k = actKey(sk.id); } catch (e) { k = 'kb'; }
  if (k === 'touch') return;
  const label = (k === 'pad' ? glyph('act') : sk.id === 0 ? 'F' : '/') + ' shoot · hold: slapshot';
  const fs = big ? 17 : 12, h = big ? 28 : 20;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(label).width + (big ? 22 : 18), x = clamp(sk.x + (sk.id ? 40 : -40), w / 2 + 40, W - w / 2 - 40), y = sk.y + (big ? 66 : 50);
  ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = PCOL[sk.id]; ctx.lineWidth = 2; rr(x - w / 2, y - h / 2, w, h, h / 2); ctx.stroke();
  text(label, x, y + 0.5, fs, C.gold, 'center', 'body');
}
function hockeyHud() {
  const st = G.mst, m = G.match, R = HOCKEY_RINK; if (!st.sk || !m) return;
  const big = hudBig(), tw = HOCKEY_TWISTS[st.twist], P = hockeyP();
  // goals: a scoreboard either side of the clock: the goal count as a big number in the player's colour (next to the
  // clock), then a solid puck per goal and an outlined slot for each goal still to get
  {
    const cy = big ? 58 : 48, ch = big ? 32 : 24, cw = big ? 90 : 66, r = big ? 7 : 5.5, gap = big ? 19 : 14, dw = big ? 26 : 19;
    const pw = 12 + dw + 6 + gap * (P.goals - 1) + 2 * r + 12, fs = big ? 30 : 22;
    for (const k of [0, 1]) {
      const x0 = k ? W / 2 + cw / 2 + 6 : W / 2 - cw / 2 - 6 - pw, ym = cy + ch / 2;
      ctx.fillStyle = 'rgba(28,26,54,0.95)'; rr(x0, cy, pw, ch, ch / 2); ctx.fill();
      ctx.strokeStyle = st.gold && st.gold[k] ? C.gold : PCOL[k]; ctx.lineWidth = 2; rr(x0, cy, pw, ch, ch / 2); ctx.stroke();
      const dx = k ? x0 + 12 + dw / 2 : x0 + pw - 12 - dw / 2;
      text(String(st.goals[k]), dx, ym + 1.5, fs, PCOL[k], 'center');
      for (let i = 0; i < P.goals; i++) {
        const xi = k ? x0 + 12 + dw + 6 + r + i * gap : x0 + pw - 12 - dw - 6 - r - i * gap;
        hockeyPuckIcon(xi, ym, r, i < st.goals[k], k);
      }
    }
    if (st.ot) { const oy = cy + ch + 4, ow = big ? 64 : 46; pill(W / 2, oy, ow, big ? 26 : 20, 'center'); text('OT', W / 2, oy + (big ? 13 : 10) + 0.5, big ? 18 : 13, C.gold, 'center'); }
  }
  // twist pill (not in the plain round), top left under the level pill
  if (st.twist !== 'classic') {
    const fs = big ? 20 : 13, h = big ? 34 : 26, y0 = 46;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(tw.name).width + (big ? 36 : 28); pill(14, y0, w, h); text(tw.name, 14 + (big ? 18 : 14), y0 + h / 2 + 0.5, fs, C.gold, 'left', 'body');
  }
  // one live alert chip, top right (never under the match pill)
  if (st.alert && m.phase === 'live') {
    const fs = big ? 19 : 13, h = big ? 34 : 26;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(st.alert.text).width + (big ? 32 : 26), x1 = W - 14, box = G.matchHudBox;
    const y = box && x1 - w < box.x1 + 8 ? Math.max(box.y1 + 6, big ? 94 : 76) : 12;
    const life = st.alert.life || 2.4, a = st.alert.t > life - 0.3 ? (life - st.alert.t) / 0.3 : 1;
    ctx.globalAlpha = clamp(a, 0, 1); pill(x1 - w, y, w, h); text(st.alert.text, x1 - (big ? 16 : 13), y + h / 2 + 0.5, fs, C.gold, 'right', 'body'); ctx.globalAlpha = 1;
  }
  // which way to shoot: on the round card and at every faceoff
  if (m.phase === 'ready' || m.phase === 'count' || (m.phase === 'live' && st.phase === 'face')) hockeyDirArrows(m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) * 0.75 : 0.75);
  // the faceoff: a small "Faceoff!" chip over the centre circle
  if (m.phase === 'live' && st.phase === 'face') {
    const fs = big ? 22 : 16; ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText('Faceoff!').width + 30; pill(R.cx, R.cy - 120, w, big ? 34 : 28, 'center'); text('Faceoff!', R.cx, R.cy - 120 + (big ? 17 : 14) + 0.5, fs, C.paper, 'center', 'body');
  }
  if (m.phase === 'ready' || m.phase === 'count') {
    // the twist card (and any gold help), low on the rink under the skaters
    const help = [0, 1].filter(k => st.gold && st.gold[k]);
    const dirTxt = !help.length && m.round <= 2 ? NAMES[0] + ' shoots at the right net →   ← ' + NAMES[1] + ' shoots at the left net' : '';
    const nf = big ? 28 : 24, hf = big ? 18 : 14, lines = help.length || dirTxt ? 2 : 1, ch = (big ? 70 : 54) + (lines - 1) * (big ? 26 : 20), cy = R.y1 - ch - 8;
    ctx.font = '700 ' + hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const helpTxt = help.length ? help.map(k => NAMES[k] + ' gets a Lucky stick and a Big Glove robot!').join(' ') : dirTxt;
    const hw = Math.max(ctx.measureText(tw.hint).width, helpTxt ? ctx.measureText(helpTxt).width : 0), w = Math.min(W - 60, Math.max(big ? 380 : 300, hw + 48));
    const a = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(28,26,54,0.84)'; rr(W / 2 - w / 2, cy, w, ch, 16); ctx.fill();
    if (help.length) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; rr(W / 2 - w / 2, cy, w, ch, 16); ctx.stroke(); }
    text(tw.name, W / 2, cy + (big ? 22 : 18), nf, C.gold, 'center'); text(tw.hint, W / 2, cy + (big ? 52 : 41), hf, C.paper, 'center', 'body');
    if (helpTxt) text(helpTxt, W / 2, cy + (big ? 78 : 61), hf, help.length ? C.gold : C.paper, 'center', 'body');
    if (m.round <= 2 && !help.length) for (const sk of st.sk) hockeyKeyChip(sk, big);
    ctx.globalAlpha = 1;
  }
}

Sfx.extra.hockeyShot = function (p) { this.tone(1300 * p, 0.04, 'square', 0.04, 500 * p); this.tone(260, 0.08, 'triangle', 0.06, 140); };
Sfx.extra.hockeySlap = function (p) { this.tone(1600 * p, 0.05, 'square', 0.05, 400 * p); this.tone(180, 0.16, 'triangle', 0.09, 80); this.tone(2400, 0.08, 'sawtooth', 0.015, 900, 0.02); };
Sfx.extra.hockeyPoke = function (p) { this.tone(420 * p, 0.07, 'sawtooth', 0.02, 760 * p); };
Sfx.extra.hockeySteal = function (p) { this.tone(660 * p, 0.06, 'triangle', 0.05, 990 * p); this.tone(990 * p, 0.08, 'triangle', 0.04, null, 0.05); };
Sfx.extra.hockeyGrab = function (p) { this.tone(900 * p, 0.03, 'triangle', 0.025); };
Sfx.extra.hockeyBump = function () { this.tone(170, 0.18, 'sine', 0.08, 520); };
Sfx.extra.hockeyBigBump = function () { this.tone(130, 0.26, 'sine', 0.1, 600); this.tone(700, 0.06, 'square', 0.03, 300); };
Sfx.extra.hockeyBoard = function () { this.tone(120, 0.08, 'triangle', 0.06, 80); this.tone(400, 0.03, 'square', 0.015); };
Sfx.extra.hockeyBoing = function () { this.tone(200, 0.22, 'sine', 0.07, 640); };
Sfx.extra.hockeyPost = function () { this.tone(1250, 0.08, 'square', 0.035); this.tone(1870, 0.14, 'triangle', 0.035, null, 0.03); };
Sfx.extra.hockeyThud = function () { this.tone(160, 0.06, 'triangle', 0.05, 110); };
Sfx.extra.hockeySave = function () { this.tone(520, 0.06, 'square', 0.035); this.tone(780, 0.06, 'square', 0.035, null, 0.07); this.tone(1040, 0.1, 'triangle', 0.035, null, 0.14); };
Sfx.extra.hockeyClear = function () { this.tone(600, 0.05, 'square', 0.03, 400); };
Sfx.extra.hockeyHorn = function () { this.tone(196, 0.9, 'sawtooth', 0.05); this.tone(247, 0.9, 'sawtooth', 0.04); this.tone(294, 0.9, 'sawtooth', 0.035); };
Sfx.extra.hockeyCheer = function () { this.tone(660, 0.1, 'triangle', 0.03, 880, 0.3); this.tone(784, 0.1, 'triangle', 0.03, 1046, 0.4); this.tone(988, 0.14, 'triangle', 0.025, 1318, 0.5); };
Sfx.extra.hockeyWhistle = function () { this.tone(2100, 0.12, 'triangle', 0.035, 2300); this.tone(2100, 0.2, 'triangle', 0.035, 2350, 0.14); };
Sfx.extra.hockeyDrop = function () { this.tone(2200, 0.15, 'triangle', 0.035, 2400); this.tone(320, 0.06, 'triangle', 0.05, 200, 0.12); };
Sfx.extra.hockeyBell = function () { [880, 660, 880, 660].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.05, null, i * 0.16)); };
Sfx.extra.hockeyOof = function () { this.tone(220, 0.12, 'triangle', 0.06, 150); };
Sfx.extra.hockeyGold = function (p) { this.tone(784 * p, 0.1, 'triangle', 0.05); this.tone(1046 * p, 0.12, 'triangle', 0.045, null, 0.08); this.tone(1318 * p, 0.16, 'triangle', 0.04, null, 0.16); };
/* ===== end of 12-4 Ice Hockey ===== */
