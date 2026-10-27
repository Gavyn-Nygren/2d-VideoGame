/* Pip & Bo - Level 4-3 Hot Potato Volleyball (versus). */
'use strict';

/* ===== 4-3 Hot Potato Volleyball (mode 'potato') =====
   A potato bomb with a burning fuse flies back and forth over a beach-volleyball net. The fuse is the round's clock:
   it burns down on the potato and in the HUD timer (under the match pill) from the start of every round, and gets
   urgent in its last 10 s (red, faster ticks). When it goes BOOM, whoever has it on their side loses the round.
   Tap hit = bump, hold hit = wind-up and power shot, jump + hit near the net = spike, ▼ + hit = set. Best of 7.
   Everything this level adds to the game scope starts with POT / pot. */
const POT = {
  // court: the net is a mode object (a pole the potato bounces off, and a line players can't cross); setup() reads def.potato
  netX: 480, netHalf: 4, netH: 96, floorY: 480, left: 30, right: 930, ceil: 30,
  // potato flight
  r: 11, g: 1000, maxFall: 750, maxSpeed: 1100,
  wallE: 0.85, ceilE: 0.7, floorE: 0.5, floorFric: 0.8, restV: 150, rollDec: 300, netE: 0.55,
  // fuse (seconds): a random total per potato, burning 1 s/s (x3 while resting on the floor, -1 s per floor landing)
  fuseMin: 22, fuseMax: 34, sizzle: 1.0, restBurn: 3, warnAt: 10, hotAt: 3, sdMul: 0.4, tieBand: 2,
  // swings
  tapWin: 0.15, powWin: 0.15, cool: 0.22, chargeT: 0.7, chargeSpeed: 0.6,
  autoRel: 0.6, // a full charge held this long swings by itself as soon as the potato is in reach (a kid who just holds the button)
  reachX: 20, reachUp: 30, reachDown: 6,
  // comeback: Big Mitts, one level per round behind (max 2)
  helpReach: 20, helpCharge: 0.85, helpMax: 2,
  // shots: T = flight time to the landing point; D = landing distance past the net, as a part of the half.
  // aimT / aimTS: aiming changes the flight time too: deep x(1 + aimT * aimLong) is slower and easier to reach,
  // short x(1 - aimTS * aimShort) is quicker, so neither aim is free
  lobT: 1.25, driveT: 0.8, lobD: 0.5, deepD: 0.86, jitter: 25, aimLong: 0.15, aimShort: 0.2, aimT: 1.0, aimTS: 1.5, minD: 0.15, maxD: 0.95, aimSpike: 60, spikeMin: 70,
  spikeZone: 200, spikeT0: 0.42, spikeT1: 0.32, spikeD0: 100, spikeD1: 250,
  rampPer: 0.03, rampMax: 0.3,
  // body contact
  bonkV: 650, bonkStun: 0.45, bonkSafe: 1.0, popVy: 430, popFwd: 60, touchCD: 0.15,
  serveY: 150, setV: 560, setBack: 60, setMaxVx: 260,
  twists: ['classic', 'big', 'two', 'classic', 'big', 'two', 'classic'],
  big: { r: 17, g: 760, tMul: 1.12 },
};
const POT_TWISTS = {
  classic: { name: 'Classic', hint: 'Don’t let it BOOM on your side!', hint2: 'Red-hot? Don’t let it touch the sand!' },
  big: { name: 'Big Spud!', hint: 'Floaty and easy to hit' },
  two: { name: 'Two Spuds!', hint: 'First BOOM ends the round' },
  quick: { name: 'Quick Fuse!', hint: 'Short fuse: get it over fast!' },
};
const potSide = x => (x < POT.netX ? 0 : 1);
const potNetTop = () => POT.floorY - POT.netH;
const potNow = () => (G.match ? G.match.roundT : 0);
function potMake(x, y, fuse, twist) {
  const big = twist === 'big';
  return { x, y, vx: 0, vy: 0, r: big ? POT.big.r : POT.r, g: big ? POT.big.g : POT.g, tMul: big ? POT.big.tMul : 1, big,
    fuse, fuse0: fuse, rest: false, hover: true, last: -1, cd: [0, 0], ramp: 0, spin: 0, tickT: 0.8, alive: true,
    lastCross: -9, crossings: 0, netHitT: -9, landT: -9, setUsed: [false, false], hotLand: false, hot: false,
    pulse: 0, sparkT: 0, trail: [], trailCol: 0, sizzleT: 0 };
}
// one physics step of a potato (no players). ev: optional array that collects 'land' / 'rest' / 'wall' / 'net' events.
// rnd: the random source for the net-top nudge (bots pass their own, so predicting doesn't use the game's stream)
function potPhys(pt, dt, ev, rnd) {
  if (pt.hover || !pt.alive) return;
  if (pt.rest) { pt.vy = 0; pt.vx = approach(pt.vx, 0, POT.rollDec * dt); }
  else pt.vy = Math.min(pt.vy + pt.g * dt, POT.maxFall);
  const sp = Math.hypot(pt.vx, pt.vy);
  if (sp > POT.maxSpeed) { pt.vx *= POT.maxSpeed / sp; pt.vy *= POT.maxSpeed / sp; }
  // substeps of at most 5 px, so the potato never tunnels through the 8 px net pole
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(pt.vx), Math.abs(pt.vy)) * dt / 5)), sdt = dt / n;
  const nt = potNetTop(), r = pt.r, nx0 = POT.netX - POT.netHalf, nx1 = POT.netX + POT.netHalf;
  for (let i = 0; i < n; i++) {
    pt.x += pt.vx * sdt; pt.y += pt.vy * sdt;
    if (pt.x - r < POT.left) { pt.x = POT.left + r; if (pt.vx < 0) { pt.vx = -pt.vx * POT.wallE; if (ev) ev.push('wall'); } }
    if (pt.x + r > POT.right) { pt.x = POT.right - r; if (pt.vx > 0) { pt.vx = -pt.vx * POT.wallE; if (ev) ev.push('wall'); } }
    if (pt.y - r < POT.ceil) { pt.y = POT.ceil + r; if (pt.vy < 0) pt.vy = -pt.vy * POT.ceilE; }
    if (pt.y + r >= POT.floorY) {
      pt.y = POT.floorY - r;
      if (pt.vy > POT.restV) { pt.vy = -pt.vy * POT.floorE; pt.vx *= POT.floorFric; if (ev) ev.push('land'); }
      else if (!pt.rest && pt.vy >= 0) { pt.vy = 0; pt.rest = true; if (ev) ev.push('rest'); }
    }
    // the net pole: a box [netX - netHalf, netX + netHalf] x [netTop, floor]
    const cx = clamp(pt.x, nx0, nx1), cy = clamp(pt.y, nt, POT.floorY);
    const dx = pt.x - cx, dy = pt.y - cy, d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (ev) ev.push('net');
      if (pt.y >= nt) { // the side of the net
        const s = pt.x < POT.netX ? -1 : 1;
        pt.x = POT.netX + s * (POT.netHalf + r);
        pt.vx = s * Math.max(40, Math.abs(pt.vx) * POT.netE);
      } else { // the top of the net (or its corners): bounce off along the normal, and never balance on it
        let nxn = dx, nyn = dy, d = Math.sqrt(d2);
        if (d < 0.01) { nxn = 0; nyn = -1; d = 1; }
        nxn /= d; nyn /= d;
        pt.x = cx + nxn * r; pt.y = cy + nyn * r;
        const vn = pt.vx * nxn + pt.vy * nyn;
        if (vn < 0) { pt.vx -= (1 + POT.netE) * vn * nxn; pt.vy -= (1 + POT.netE) * vn * nyn; }
        // sitting on the flat top of the pole: roll it off (to a random side when it's dead centre)
        if (Math.abs(pt.x - POT.netX) <= POT.netHalf + 1 && Math.abs(pt.vx) < 30) {
          const off = pt.x - POT.netX;
          pt.vx += (Math.abs(off) < 2 ? ((rnd || MODES.potato.rand)() < 0.5 ? -1 : 1) : Math.sign(off)) * 60;
        }
      }
    }
  }
}
// an aimed shot: land at a point on the other side after T seconds, raising the arc until it clears the net
function potShot(pt, k, power, spike, aim = 0) {
  const dir = k === 0 ? 1 : -1, half = POT.right - POT.netX - POT.netHalf, R = MODES.potato.rand;
  // aim: +1 = holding toward the other side (lands deeper), -1 = holding back toward your own wall (lands short)
  let dist = spike ? POT.spikeD0 + (POT.spikeD1 - POT.spikeD0) * power + aim * POT.aimSpike
    : clamp(POT.lobD + (POT.deepD - POT.lobD) * power + (aim > 0 ? POT.aimLong : aim < 0 ? -POT.aimShort : 0), POT.minD, POT.maxD) * half;
  dist += (R() * 2 - 1) * POT.jitter * (spike ? 0.5 : 1 - 0.5 * power);
  dist = clamp(dist, spike ? POT.spikeMin : 40, half - pt.r - 8);
  // jammed low against the net pole: scoop it a little way out first (from there every straight-up arc meets the pole)
  const jam = POT.netHalf + pt.r + 12;
  if (pt.y > potNetTop() - pt.r && Math.abs(pt.x - POT.netX) < jam) pt.x = POT.netX - dir * jam;
  let xT = POT.netX + dir * (POT.netHalf + dist);
  const yT = POT.floorY - pt.r;
  let T = (spike ? POT.spikeT0 + (POT.spikeT1 - POT.spikeT0) * power : POT.lobT + (POT.driveT - POT.lobT) * power) * (1 - pt.ramp) * pt.tMul;
  if (!spike) T *= aim > 0 ? 1 + POT.aimT * POT.aimLong : aim < 0 ? 1 - POT.aimTS * POT.aimShort : 1;
  const g = pt.g, clear = potNetTop() - pt.r - 6, e = POT.netHalf + pt.r;
  let vx = 0, vy = 0;
  const yAt = x => { const t = (x - pt.x) / vx; return t > 0 ? pt.y + vy * t + 0.5 * g * t * t : -1e9; };
  // flight time T -> 0 ok, 1 hits the net, 2 too fast, 3 hits the ceiling
  const test = T => {
    vx = (xT - pt.x) / T; vy = (yT - pt.y - 0.5 * g * T * T) / T;
    // the potato's centre must pass at least r + 6 px above the net top over the whole width it could touch
    const low = Math.max(yAt(POT.netX - dir * e), yAt(POT.netX), yAt(POT.netX + dir * e));
    const apex = vy < 0 ? pt.y - vy * vy / (2 * g) : pt.y;
    return low > clear ? 1 : Math.hypot(vx, vy) > POT.maxSpeed ? 2 : apex < POT.ceil + pt.r + 4 ? 3 : 0;
  };
  let ok = 1;
  const T0 = T;
  for (let i = 0; i < 30; i++) {
    ok = test(T);
    if (!ok) break;
    if (ok === 3) { T *= 0.94; continue; }
    T *= 1.08;
  }
  // close to the net and low, that search can jump over the narrow window that works: scan finer (longer first, then
  // shorter), and as a last resort accept a ceiling bounce (it still comes down on the other side)
  if (ok) {
    const cand = [], xT0 = xT, T1 = T;
    for (let j = 0; j <= 50; j++) cand.push(T0 * Math.pow(1.03, j));
    for (let j = 1; j <= 25; j++) cand.push(T0 * Math.pow(0.97, j));
    let pick;
    // a closer landing spot if the far one can't be reached from here
    for (const fd of [1, 0.7, 0.45, 0.25]) {
      xT = POT.netX + dir * (POT.netHalf + Math.max(spike ? POT.spikeMin : 40, dist * fd));
      pick = cand.find(t => test(t) === 0);
      if (pick === undefined) pick = cand.find(t => test(t) === 3);
      if (pick !== undefined) break;
    }
    if (pick === undefined) { xT = xT0; pick = T1; }
    T = pick; test(T);
  }
  pt.vx = vx; pt.vy = vy; pt.rest = false; pt.hover = false;
  return { T, xT };
}
// a swing reaches this box around the player (bigger with Big Mitts)
function potHitbox(p) {
  const h = ((G.mst && G.mst.help) ? G.mst.help[p.id] : 0) * POT.helpReach;
  return { x0: p.x - POT.reachX - h, x1: p.x + p.w + POT.reachX + h, y0: p.y - POT.reachUp - h, y1: p.y + p.h + POT.reachDown };
}
// a potato on p's half that a swing would reach right now
function potInReach(p, st) {
  const hb = potHitbox(p);
  for (const pt of st.pots) {
    if (!pt.alive || pt.hover || potSide(pt.x) !== p.id || pt.cd[p.id] > 0) continue;
    const hx = clamp(pt.x, hb.x0, hb.x1), hy = clamp(pt.y, hb.y0, hb.y1);
    if ((pt.x - hx) ** 2 + (pt.y - hy) ** 2 <= pt.r * pt.r) return true;
  }
  return false;
}
// nobody crosses the net: an invisible wall from the floor to the ceiling.
// ahead: also cap the speed toward the net so that the next physics tick can't carry a player past it (the round-end
// banner runs physics after idle(), so the clamp alone would come one tick late there)
function potClampPlayers(ahead = 0) {
  for (const p of G.players) {
    const fwd = p.id === 0 ? 1 : -1, edge = p.id === 0 ? POT.netX - POT.netHalf - p.w : POT.netX + POT.netHalf;
    if ((p.x - edge) * fwd > 0) { p.x = edge; p.vx = p.id === 0 ? Math.min(p.vx, 0) : Math.max(p.vx, 0); }
    if (ahead > 0 && p.vx * fwd > 0) p.vx = fwd * Math.min(Math.abs(p.vx), Math.abs(edge - p.x) / ahead);
  }
}
function potPop(txt, x, y, col, size, o = {}) {
  const st = G.mst;
  if (st && st.pops) st.pops.push(Object.assign({ txt, x, y, col, size, t: 0, life: 0.9, rise: 26 }, o));
}
// the BOOM itself: sound, flash, mash flecks, smoke. The round result is decided in potResolve().
function potExplode(pt) {
  const st = G.mst;
  pt.alive = false;
  st.booms.push({ x: pt.x, y: pt.y, r: pt.r, t: 0 });
  Sfx.play('potBoom'); if (!reduceMotion) G.shake = 0.4;
  burst(pt.x, pt.y, '#ff9a3c', 30); burst(pt.x, pt.y, '#ffe08a', 20); burst(pt.x, pt.y, '#f3e2b3', 16);
  puff(pt.x, pt.y, 12, 'rgba(90,80,90,0.7)');
}
// one or more potatoes blew up this tick: the side holding the BOOM loses (both sides at once, or right on the net: a tie)
function potResolve(booms) {
  const st = G.mst, rt = potNow(), sides = new Set();
  let netTie = false;
  for (const pt of booms) {
    potExplode(pt);
    pt.boomSide = Math.abs(pt.x - POT.netX) <= POT.tieBand ? -1 : potSide(pt.x);
    if (pt.boomSide >= 0) sides.add(pt.boomSide); else netTie = true;
  }
  // Two Spuds: the first BOOM ends the round and the other potato fizzles out
  for (const pt of st.pots) if (pt.alive) {
    pt.alive = false; st.fizz.push({ x: pt.x, y: pt.y, t: 0 });
    puff(pt.x, pt.y, 10, 'rgba(150,140,150,0.75)'); Sfx.play('potFizz');
  }
  if (sides.size !== 1) { matchRoundEnd(-1, sides.size === 2 ? 'Double BOOM!' : 'Right on the net!'); return; }
  const side = [...sides][0], win = 1 - side, pt = booms.find(q => q.boomSide === side), loser = G.players[side];
  let reason = 'BOOM on ' + NAMES[side] + '’s side!';
  if (rt - pt.lastCross < 0.5 && pt.last === win) reason = 'Just made it over!';
  if (rt - pt.netHitT < 0.8 && pt.last === side) reason = 'Stuck at the net!';
  if (pt.hotLand) reason = 'Red-hot landing on ' + NAMES[side] + '’s side!';
  if (rt - st.lastBonk[side] < 1.5) reason = 'Bonked, then BOOM!';
  if (netTie) reason = 'BOOM on ' + NAMES[side] + '’s side!';
  st.stats.booms[side]++; st.soot = side; st.sootT = 0;
  if (loser.alive) knock(loser, (side === 0 ? -1 : 1) * 160, -380, 0.8, 0.4);
  rumble(side, 1, 0.8, 450); rumble(win, 0.3, 0.3, 200);
  matchRoundEnd(win, reason);
}
// the visible fuse: wick length in px (the same scale for every potato, so a short wick means a short fuse)
const potWickLen = pt => (4 + 18 * clamp(pt.fuse / POT.fuseMax, 0, 1)) * (pt.big ? 1.25 : 1);
function potWickTip(pt, bob = 0) {
  const len = potWickLen(pt), top = pt.y + bob - pt.r * 0.95;
  return { x: pt.x + 3 + Math.sin(G.clock * 3 + pt.x * 0.01) * 1.5, y: top - len, len, top };
}
// seconds between fuse ticks: calm, then faster and faster in the last 10 s
const potTickGap = f => (f > POT.warnAt ? 0.8 : 0.12 + 0.68 * clamp(f / POT.warnAt, 0, 1));
// the potato with the least fuse left (it ticks, and it's the one the HUD timer shows)
function potNext(st) {
  let best = null;
  for (const q of st.pots || []) if (q.alive && (!best || q.fuse < best.fuse)) best = q;
  return best;
}
// a potato turns red-hot (3 s left): from now on touching the sand sets it off, so say so once, right under the timer
// pill that now reads RED-HOT! (a fixed spot reads better than text left behind by a potato flying at 600 px/s)
function potGoHot(pt, ticker) {
  pt.hot = true;
  if (ticker) Sfx.play('potHot');
  potPop('RED-HOT! Don’t let it land!', W / 2, hudBig() ? 118 : 96, '#ff5a3c', 17, { life: 2, rise: 6, under: true });
}
function potSparks(pt, dt) {
  pt.sparkT -= dt;
  if (pt.sparkT > 0) return;
  pt.sparkT = 0.06;
  const tip = potWickTip(pt, pt.hover ? Math.sin(G.clock * 3) * 3 : 0);
  G.particles.push({ x: tip.x, y: tip.y, vx: (Math.random() - 0.5) * 70, vy: -20 - Math.random() * 50, life: 0.28, max: 0.28,
    col: pt.fuse <= POT.warnAt ? '#ffb070' : '#ffe58a', size: 1.6 + Math.random() * 1.2, grav: 160, kind: 'dot' });
}

MODES.potato = {
  rand: Math.random,
  testTwist: null,
  K: POT, potPhys, potShot, potMake, potSide, potHitbox, potExplode, potResolve,
  setup(st, L) {
    const d = L.def.potato || {};
    if (d.netX) POT.netX = d.netX;
    if (d.netH) POT.netH = d.netH;
    st.stats = { hits: [0, 0], spikes: [0, 0], bonks: [0, 0], sets: [0, 0], power: [0, 0], sideT: [0, 0], longest: 0, drops: [0, 0], booms: [0, 0] };
    st.help = [0, 0]; st.serve = -1; st.sawPause = false; st.pops = [];
    st.swings = [0, 0]; st.pows = [0, 0]; st.lastPow = [0, 0]; // swing counters (results/tests)
  },
  resetRound(n, info) {
    const st = G.mst, R = this.rand, m = G.match;
    info = info || { first: true, wins: [0, 0] };
    // the server: the winner of the last counted round (a replayed tie keeps its server); round 1 picks at random
    if (info.first || st.serve < 0) st.serve = R() < 0.5 ? 0 : 1;
    else if (!info.replay && m && m.history.length) { const h = m.history[m.history.length - 1]; if (h.winner >= 0) st.serve = h.winner; }
    // comeback: Big Mitts, one level per round behind
    const w = info.wins || [0, 0], prev = st.help || [0, 0];
    st.help = [0, 1].map(k => clamp(w[1 - k] - w[k], 0, POT.helpMax));
    st.pops = [];
    for (let k = 0; k < 2; k++) if (st.help[k] > prev[k]) st.pops.push({ txt: 'Big mitts!', k, col: C.gold, size: 16, t: 0, life: 99, rise: 30, mitts: true });
    st.sd = !!info.suddenDeath; st.roundN = n;
    st.twist = st.sd ? 'quick' : POT.twists[(n - 1) % POT.twists.length];
    if (this.testTwist) st.twist = this.testTwist;
    const fz = () => (POT.fuseMin + R() * (POT.fuseMax - POT.fuseMin)) * (st.twist === 'quick' ? POT.sdMul : 1);
    const hx = k => (k === 0 ? (POT.left + POT.netX - POT.netHalf) / 2 : (POT.netX + POT.netHalf + POT.right) / 2);
    st.pots = st.twist === 'two' ? [potMake(hx(0), POT.serveY, fz(), st.twist), potMake(hx(1), POT.serveY, fz(), st.twist)]
      : [potMake(hx(st.serve), POT.serveY, fz(), st.twist)];
    st.sw = [0, 1].map(() => ({ s: 'idle', t: 0, charge: 0, power: 0, anim: 0, animK: '', flash: 0, tickT: 0, held: 0, fullT: 0 }));
    st.bonkSafe = [0, 0]; st.lastBonk = [-9, -9];
    st.rally = 0; st.roundSideT = [0, 0];
    st.booms = []; st.fizz = []; st.soot = -1; st.sootT = 0; st.netSndT = -9;
  },
  go() {
    for (const pt of G.mst.pots) pt.hover = false;
    Sfx.play('potServe');
  },
  pre(dt) {
    const st = G.mst;
    // a wind-up let go of while the game was paused is dropped silently (shared pause rule); one still held carries on
    const resumed = st.sawPause; st.sawPause = false;
    for (const p of G.players) {
      const k = p.id, sw = st.sw[k];
      st.bonkSafe[k] = Math.max(0, st.bonkSafe[k] - dt);
      if (resumed && sw.s === 'wind' && !p.input.act) { sw.s = 'idle'; sw.charge = 0; sw.anim = 0; }
      // a fresh press is always used up here, whether or not a swing can start
      if (p.pendingAct) { p.pendingAct = false; if (sw.s === 'idle' && p.alive && p.stun <= 0) { sw.s = 'tap'; sw.t = POT.tapWin + dt; sw.power = 0; sw.anim = 0.2; sw.animK = 'tap'; sw.held = 0; st.swings[k]++; } }
      if (p.stun > 0 && sw.s === 'wind') { sw.s = 'idle'; sw.charge = 0; } // a bonk knocks you out of a wind-up
      switch (sw.s) {
        case 'tap':
          sw.t -= dt; sw.held += dt;
          if (sw.t <= 1e-9) { if (p.input.act) { sw.s = 'wind'; sw.charge = 0; sw.tickT = 0.1; sw.fullT = 0; } else { sw.s = 'cool'; sw.t = POT.cool; } }
          break;
        case 'wind': {
          const ct = POT.chargeT * Math.pow(POT.helpCharge, st.help[k]);
          // let go: the power shot. A full charge held for autoRel s also swings by itself once the potato is in reach
          if (sw.charge >= 1) sw.fullT += dt;
          if (!p.input.act || (sw.fullT >= POT.autoRel && potInReach(p, st))) { sw.s = 'pow'; sw.t = POT.powWin; sw.power = sw.charge; sw.charge = 0; sw.anim = 0.2; sw.animK = 'pow'; st.pows[k]++; st.lastPow[k] = sw.power; break; }
          const was = sw.charge;
          sw.charge = Math.min(1, sw.charge + dt / ct);
          sw.tickT -= dt;
          if (sw.charge < 1 && sw.tickT <= 0) { sw.tickT = 0.1; Sfx.tone((300 + 400 * sw.charge) * (k ? 0.84 : 1), 0.05, 'square', 0.02); }
          if (was < 1 && sw.charge >= 1) { Sfx.play('potFull', k); rumble(k, 0, 0.25, 50); sw.flash = 0.1; }
          // winding up slows you to 60 % of full speed (control() adds one tick of acceleration after this)
          const mx = Math.max(0, PHYS.maxRun * POT.chargeSpeed - (p.grounded ? PHYS.accG : PHYS.accA) * dt);
          p.vx = clamp(p.vx, -mx, mx);
          break;
        }
        case 'pow': sw.t -= dt; if (sw.t <= 1e-9) { sw.s = 'cool'; sw.t = POT.cool; } break;
        case 'cool': sw.t -= dt; if (sw.t <= 1e-9) sw.s = 'idle'; break;
      }
      if (sw.anim > 0) sw.anim = Math.max(0, sw.anim - dt);
      if (sw.flash > 0) sw.flash = Math.max(0, sw.flash - dt);
    }
  },
  step(dt) {
    const st = G.mst, nt = potNetTop(), rt = potNow();
    potClampPlayers();
    const booms = [], ticker = potNext(st);
    for (const pt of st.pots) {
      if (!pt.alive) continue;
      pt.cd[0] = Math.max(0, pt.cd[0] - dt); pt.cd[1] = Math.max(0, pt.cd[1] - dt);
      // swings and bodies: only the player whose half holds the potato's centre can touch it
      for (const p of G.players) {
        if (!p.alive || pt.hover) continue;
        const k = p.id, sw = st.sw[k], fwd = k === 0 ? 1 : -1;
        if (potSide(pt.x) !== k) continue;
        const hb = potHitbox(p);
        const hx = clamp(pt.x, hb.x0, hb.x1), hy = clamp(pt.y, hb.y0, hb.y1);
        const inHit = (pt.x - hx) ** 2 + (pt.y - hy) ** 2 <= pt.r * pt.r;
        if ((sw.s === 'tap' || sw.s === 'pow') && inHit && pt.cd[k] <= 0) {
          const power = sw.s === 'pow' ? sw.power : 0;
          const spike = !p.grounded && pt.y < nt - 4 && Math.abs(pt.x - POT.netX) < POT.spikeZone;
          const aim = ((p.input.right ? 1 : 0) - (p.input.left ? 1 : 0)) * fwd;
          const isSet = p.input.down && !spike && !pt.setUsed[k];
          const big = spike || power >= 0.5;
          if (isSet) { // a set: pop it straight up toward the net on your own side, ready for your own spike (once per visit)
            const tx = POT.netX - fwd * POT.setBack, ft = 2 * POT.setV / pt.g;
            pt.vy = -POT.setV; pt.vx = clamp((tx - pt.x) / ft, -POT.setMaxVx, POT.setMaxVx); pt.rest = false; pt.setUsed[k] = true;
            st.stats.sets[k]++; sw.animK = 'set'; sw.anim = 0.25;
            Sfx.play('potSet', k); rumble(k, 0.15, 0.35, 60);
            puff(pt.x, pt.y, 5, 'rgba(255,255,255,0.85)');
          } else {
            potShot(pt, k, power, spike, aim);
            st.stats.hits[k]++;
            if (spike) { st.stats.spikes[k]++; Sfx.play('whoosh', k); potPop('SPIKE!', pt.x, pt.y - 26, PCOL[k], 18); }
            if (power >= 0.5) st.stats.power[k]++;
            Sfx.play(big ? 'potSmash' : 'potWhack', k);
            if (big) { rumble(k, 0.4, 0.6, 110); burst(pt.x, pt.y, PCOL[k], 10); } else { rumble(k, 0.15, 0.35, 60); puff(pt.x, pt.y, 5, 'rgba(255,255,255,0.85)'); }
            pt.trailCol = k; pt.trail = [];
          }
          pt.last = k; pt.cd[k] = POT.touchCD; pt.ramp = Math.min(POT.rampMax, pt.ramp + POT.rampPer);
          sw.s = 'cool'; sw.t = POT.cool; sw.charge = 0;
          continue;
        }
        // body contact: a fast shot from the other side bonks you; otherwise it pops off your head or bumps off your side
        if (pt.cd[k] > 0) continue;
        const bx = clamp(pt.x, p.x, p.x + p.w), by = clamp(pt.y, p.y, p.y + p.h);
        if ((pt.x - bx) ** 2 + (pt.y - by) ** 2 > pt.r * pt.r) continue;
        const speed = Math.hypot(pt.vx, pt.vy);
        if (speed >= POT.bonkV && pt.last === 1 - k && st.bonkSafe[k] <= 0) {
          knock(p, Math.sign(pt.vx || -fwd) * 140, p.grounded ? -160 : p.vy, POT.bonkStun, 0.25);
          st.bonkSafe[k] = POT.bonkSafe; st.lastBonk[k] = rt;
          pt.vx *= 0.15; pt.vy = -220; pt.rest = false;
          st.stats.bonks[1 - k]++;
          Sfx.play('potBonk', k); rumble(k, 0.8, 0.5, 200);
          burst(p.x + p.w / 2, p.y, C.gold, 8);
          potPop('BONK!', p.x + p.w / 2, p.y - 20, C.gold, 18);
        } else if (pt.y < p.y + 4) {
          pt.y = p.y - pt.r; pt.vy = -POT.popVy + Math.min(0, p.vy) * 0.3;
          pt.vx = pt.vx * 0.4 + p.vx * 0.4 + fwd * POT.popFwd; pt.rest = false;
          Sfx.play('potPop', k);
        } else {
          const s = Math.sign(pt.x - (p.x + p.w / 2)) || fwd;
          // bumped off your side, but never past the net pole: with no room between you and the pole it pops up over you
          const nx = s > 0 ? p.x + p.w + pt.r : p.x - pt.r, lim = POT.netX - fwd * (POT.netHalf + pt.r);
          if ((nx - lim) * fwd > 0) {
            pt.x = k === 0 ? Math.min(pt.x, lim) : Math.max(pt.x, lim); pt.y = Math.min(pt.y, p.y - pt.r);
            pt.vy = -POT.popVy; pt.vx = -fwd * POT.popFwd;
          } else {
            pt.x = nx;
            pt.vx = s * Math.max(140, Math.abs(pt.vx - p.vx) * 0.5) + p.vx * 0.5; pt.vy = Math.min(pt.vy, -200);
          }
          pt.rest = false;
          Sfx.play('potPop', k);
        }
        pt.last = k; pt.cd[k] = POT.touchCD;
      }
      if (pt.hover) continue;
      // flight
      const ev = [], side0 = potSide(pt.x);
      potPhys(pt, dt, ev);
      const side1 = potSide(pt.x);
      if (side1 !== side0) {
        pt.setUsed = [false, false]; pt.lastCross = rt; pt.crossings++;
        st.rally++; st.stats.longest = Math.max(st.stats.longest, st.rally);
      }
      if (ev.includes('net')) { if (rt - pt.netHitT > 0.2) Sfx.play('potNet'); pt.netHitT = rt; }
      if (ev.includes('wall')) Sfx.play('wall');
      const landed = ev.includes('land'), rested = ev.includes('rest');
      if (landed || rested) st.rally = 0;
      // red-hot: touching the floor sets it off at once
      if (pt.fuse <= POT.hotAt && (landed || rested || pt.rest)) { pt.hotLand = true; booms.push(pt); continue; }
      if (landed) {
        pt.fuse -= POT.sizzle; pt.landT = rt; pt.sizzleT = 0.35; st.stats.drops[side1]++;
        Sfx.play('potSizzle'); rumble(side1, 0.1, 0.3, 80);
        puff(pt.x, pt.y + pt.r, 5, 'rgba(120,110,110,0.6)'); burst(pt.x, pt.y + pt.r, '#ff9a3c', 4);
        potPop('-1 s', pt.x, pt.y - pt.r - 18, '#ffb37a', 15, { life: 0.7, rise: 22 });
      }
      // the fuse: 1 s/s, x3 while it lies on the floor
      pt.fuse -= dt * (pt.rest ? POT.restBurn : 1);
      st.stats.sideT[side1] += dt / st.pots.length;
      st.roundSideT[side1] += dt / st.pots.length;
      if (pt === ticker) {
        if (!pt.hot && pt.fuse <= POT.hotAt) potGoHot(pt, true);
        pt.tickT -= dt;
        if (pt.tickT <= 0) {
          pt.tickT = potTickGap(pt.fuse);
          Sfx.play(pt.fuse <= POT.hotAt ? 'potTickHot' : 'potTick');
          if (pt.fuse <= POT.warnAt) pt.pulse = 0.1;
          if (pt.fuse <= POT.hotAt) rumble(side1, 0, 0.25, 40);
        }
      } else if (!pt.hot && pt.fuse <= POT.hotAt) potGoHot(pt, false);
      if (pt.pulse > 0) pt.pulse = Math.max(0, pt.pulse - dt);
      if (pt.sizzleT > 0) pt.sizzleT = Math.max(0, pt.sizzleT - dt);
      pt.spin += pt.vx * dt * 0.02;
      // a fast shot leaves a streak
      if (Math.hypot(pt.vx, pt.vy) > 700) { pt.trail.push([pt.x, pt.y]); if (pt.trail.length > 6) pt.trail.shift(); } else if (pt.trail.length) pt.trail.shift();
      potSparks(pt, dt);
      if (pt.fuse <= 0) { pt.fuse = 0; booms.push(pt); }
    }
    this.anim(dt);
    if (booms.length) potResolve(booms);
  },
  // visual timers that run in every phase (pops, explosions, smoke)
  anim(dt) {
    const st = G.mst, m = G.match;
    for (const q of st.pops) {
      if (q.mitts) { q.t = Math.min(q.t + dt, 0.9); if (m && m.phase === 'live') { q.gone = (q.gone || 0) + dt; } continue; }
      q.t += dt;
    }
    st.pops = st.pops.filter(q => q.mitts ? (q.gone || 0) < 0.4 : q.t < q.life);
    for (const b of st.booms) b.t += dt;
    for (const f of st.fizz) f.t += dt;
  },
  idle(dt) {
    const st = G.mst, m = G.match;
    if (!st.pots) return;
    potClampPlayers(dt);
    // the round is over: a wind-up in progress is dropped (no ring or raised mitts through the banner and the results)
    if (m && (m.phase === 'end' || m.phase === 'over')) for (const sw of st.sw) if (sw.s === 'wind') { sw.s = 'idle'; sw.charge = 0; sw.fullT = 0; }
    for (const pt of st.pots) if (pt.alive) { potSparks(pt, dt); if (pt.pulse > 0) pt.pulse = Math.max(0, pt.pulse - dt); }
    this.anim(dt);
    // the loser of the round is sooty and smokes a little during the banner
    if (m && m.phase === 'end' && st.soot >= 0) {
      const p = G.players[st.soot];
      st.sootT -= dt;
      if (st.sootT <= 0 && p.alive) { st.sootT = 0.3; G.particles.push({ x: p.x + p.w / 2 + (Math.random() - 0.5) * 10, y: p.y - 2, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 30, life: 0.9, max: 0.9, col: 'rgba(80,74,84,0.55)', size: 4 + Math.random() * 3, grav: -20, kind: 'dot' }); }
    }
  },
  tiebreak() {
    // two ties in a row: whoever had the potato on their side for less time in this round takes it
    const s = G.mst.roundSideT;
    if (Math.abs(s[0] - s[1]) < 1e-9) return -1;
    return { winner: s[0] < s[1] ? 0 : 1, reason: 'Kept the potato away longer!' };
  },
  draw() {
    const st = G.mst;
    if (G.mode === 'paused' && st) st.sawPause = true;
    if (!st || !st.pots) return;
    const nt = potNetTop(), m = G.match, fl = POT.floorY;
    // each half faintly in its player's colour, and a warm glow on the half holding a potato in its last 10 s
    ctx.fillStyle = 'rgba(255,107,74,0.05)'; ctx.fillRect(POT.left, POT.ceil, POT.netX - POT.left, fl - POT.ceil);
    ctx.fillStyle = 'rgba(91,149,255,0.05)'; ctx.fillRect(POT.netX, POT.ceil, POT.right - POT.netX, fl - POT.ceil);
    const hp = potNext(st);
    if (hp && !hp.hover && hp.fuse <= POT.warnAt && m && m.phase === 'live') {
      const s = potSide(hp.x), hot = hp.fuse <= POT.hotAt;
      const a = (hot ? 0.1 : 0.06) + (hot ? 0.06 : 0.04) * (hp.pulse / 0.1) + 0.02 * Math.sin(G.clock * 6);
      ctx.fillStyle = `rgba(255,120,60,${clamp(a, 0, 0.18)})`;
      if (s === 0) ctx.fillRect(POT.left, POT.ceil, POT.netX - POT.left, fl - POT.ceil); else ctx.fillRect(POT.netX, POT.ceil, POT.right - POT.netX, fl - POT.ceil);
    }
    potDrawBeach();
    // the net: a dashed line up to the sky (the halves go all the way up), the mesh, the tape and the pole
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([6, 8]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(POT.netX, 40); ctx.lineTo(POT.netX, nt - 4); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(POT.netX - 7, nt, 14, POT.netH);
    ctx.save(); ctx.beginPath(); ctx.rect(POT.netX - 7, nt, 14, POT.netH); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
    for (let y = nt - 14; y < fl + 14; y += 8) { ctx.beginPath(); ctx.moveTo(POT.netX - 7, y); ctx.lineTo(POT.netX + 7, y + 14); ctx.moveTo(POT.netX + 7, y); ctx.lineTo(POT.netX - 7, y + 14); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = C.ink; ctx.fillRect(POT.netX - 2, nt - 3, 4, POT.netH + 3);
    ctx.fillStyle = C.paper; rr(POT.netX - 8, nt - 4, 16, 5, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(28,26,54,0.5)'; ctx.lineWidth = 1; rr(POT.netX - 8, nt - 4, 16, 5, 2); ctx.stroke();
    // shadows on the sand: where each potato will come down
    for (const pt of st.pots) if (pt.alive) {
      const h = clamp((fl - pt.y) / 400, 0, 1);
      ctx.fillStyle = `rgba(20,16,40,${0.35 - 0.2 * h})`;
      ctx.beginPath(); ctx.ellipse(pt.x, fl - 2, pt.r * (1.1 - 0.5 * h), 3, 0, 0, Math.PI * 2); ctx.fill();
      // red-hot: a red ring on the sand where it would come down (touching the sand now means BOOM)
      if (pt.fuse <= POT.hotAt && !pt.hover) {
        ctx.strokeStyle = `rgba(255,70,40,${0.55 + 0.3 * Math.sin(G.clock * 14)})`; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(pt.x, fl - 2, pt.r + 9, 5, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // scorch marks where it blew
    for (const b of st.booms) if (b.y > fl - 45) {
      ctx.fillStyle = 'rgba(40,30,40,0.28)';
      ctx.beginPath(); ctx.ellipse(b.x, fl - 1, 26 + b.r, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
  },
  drawTop() {
    const st = G.mst, m = G.match;
    if (!st || !st.pots || !st.sw) return;
    // oven mitts and the charge ring
    for (const p of G.players) potDrawMitts(p, st);
    // the red-hot rule pop sits under the potatoes, so a high potato and its 3-2-1 stay in front of it
    for (const q of st.pops) if (q.under) potDrawPop(q, hudBig());
    // potatoes (in front of the players)
    for (const pt of st.pots) if (pt.alive) potDrawPotato(pt, st, m);
    // fizzled potatoes (Two Spuds) and the explosions
    for (const f of st.fizz) if (f.t < 0.6) {
      ctx.save(); ctx.globalAlpha = 1 - f.t / 0.6;
      ctx.fillStyle = 'rgba(160,150,160,0.8)';
      for (let i = 0; i < 4; i++) { circle(f.x + Math.cos(i * 1.7) * f.t * 30, f.y - f.t * 40 + Math.sin(i * 2.3) * 8, 6 + f.t * 12); ctx.fill(); }
      ctx.restore();
    }
    for (const b of st.booms) potDrawBoom(b);
  },
  hud() {
    const st = G.mst, m = G.match;
    if (!st || !st.pots || !m) return;
    const big = hudBig(), tw = POT_TWISTS[st.twist] || POT_TWISTS.classic, hint = tw.hint2 && st.roundN > 1 ? tw.hint2 : tw.hint;
    // the twist pill under the level pill (twist rounds only)
    if (st.twist !== 'classic') {
      const fs = big ? 18 : 13, ph = big ? 34 : 26;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      pill(14, 46, ctx.measureText(tw.name).width + 28, ph);
      text(tw.name, 28, 46 + ph / 2 + 0.5, fs, C.gold, 'left', 'body');
    }
    potDrawTimer(st, m, big);
    // the twist card under "Round N" / the 3-2-1 (every round)
    if (m.phase === 'ready' || m.phase === 'count') {
      const fn = big ? 34 : 26, fh = big ? 19 : 14, ph = big ? 78 : 60;
      ctx.font = '700 ' + fh + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = Math.min(W - 40, Math.max(300, ctx.measureText(hint).width + 48));
      ctx.save(); ctx.globalAlpha = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1;
      ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(W / 2 - w / 2, 284, w, ph, 16); ctx.fill();
      text(tw.name, W / 2, 284 + ph * 0.35, fn, C.gold, 'center');
      text(hint, W / 2, 284 + ph * 0.77, fh, C.paper, 'center', 'body');
      ctx.restore();
    }
    // pops: Big mitts!, SPIKE!, BONK!, -1 (the red-hot rule pop is drawn under the potatoes, in drawTop)
    for (const q of st.pops) if (!q.under) potDrawPop(q, big);
  },
  stats() {
    const s = G.mst.stats, out = [{ label: 'Hits', values: s.hits.slice() }];
    if (s.spikes[0] + s.spikes[1] > 0) out.push({ label: 'Spikes', values: s.spikes.slice() });
    if (s.bonks[0] + s.bonks[1] > 0) out.push({ label: 'Bonks', values: s.bonks.slice() });
    out.push({ label: 'Potato time', values: [Math.round(s.sideT[0]), Math.round(s.sideT[1])] }); // seconds on your side (a ' s' suffix wraps)
    out.push('Longest rally: ' + s.longest + ' over the net');
    return out;
  },
};

/* potato drawing helpers */
// one pop: rises over its life and fades at the end ("Big mitts!" follows its player and stays through the countdown)
function potDrawPop(q, big) {
  let x = q.x, y = q.y, a;
  if (q.mitts) {
    const p = G.players[q.k];
    if (!p.alive) return;
    x = p.x + p.w / 2; y = p.y - 42;
    a = clamp(q.t / 0.15, 0, 1) * (1 - clamp((q.gone || 0) / 0.4, 0, 1));
  } else a = clamp((q.life - q.t) / 0.25, 0, 1);
  const f = Math.min(1, q.t / (q.mitts ? 0.9 : q.life)), sc = (q.t < 0.12 ? 0.5 + 0.5 * q.t / 0.12 : 1) * (big ? 1.3 : 1);
  ctx.save(); ctx.globalAlpha = a;
  bigText(q.txt, x, y - q.rise * f, q.size, q.col, sc);
  ctx.restore();
}
// the beach: sandcastles with flags at the walls, a towel and a few shells (decoration only: the potato only meets the box and the net)
function potDrawBeach() {
  const fl = POT.floorY;
  const castle = (x, k) => {
    ctx.fillStyle = '#e6bf74'; ctx.strokeStyle = '#b98a43'; ctx.lineWidth = 1.5;
    rr(x - 22, fl - 18, 44, 18, 3); ctx.fill(); ctx.stroke();
    rr(x - 9, fl - 34, 18, 18, 2); ctx.fill(); ctx.stroke();
    for (const cx of [-22, 14]) { rr(x + cx, fl - 26, 8, 9, 1.5); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#b98a43';
    for (let i = 0; i < 3; i++) ctx.fillRect(x - 9 + i * 7, fl - 38, 4, 4);
    ctx.fillStyle = '#7a5530'; rr(x - 3, fl - 9, 6, 9, 3); ctx.fill();
    ctx.fillStyle = C.ink; ctx.fillRect(x - 0.75, fl - 52, 1.5, 15);
    ctx.fillStyle = PCOL[k];
    const wv = Math.sin(G.clock * 5 + k) * 1.5;
    ctx.beginPath(); ctx.moveTo(x + 0.75, fl - 52); ctx.lineTo(x + (k ? -11 : 11), fl - 48 + wv); ctx.lineTo(x + 0.75, fl - 44); ctx.closePath(); ctx.fill();
  };
  castle(62, 0); castle(POT.right - 32, 1);
  // a striped towel on each side (flat on the sand)
  for (const [x, k] of [[150, 0], [POT.right - 190, 1]]) {
    ctx.save(); ctx.beginPath(); rr(x, fl - 3, 52, 4, 2); ctx.clip();
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#fff6e6' : PCOL[k]; ctx.fillRect(x + i * 9, fl - 3, 9, 4); }
    ctx.restore();
  }
  // shells and a starfish in the sand (the floor tiles' top edge)
  ctx.fillStyle = '#ffd7c2';
  for (const x of [118, 330, 400, 600, 655, 840]) { ctx.beginPath(); ctx.ellipse(x, fl + 9, 3, 2, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#ff9f7a';
  potStar(260, fl + 10, 4.5, 2);
  potStar(770, fl + 11, 4, 1.8);
}
function potStar(x, y, r, ri) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? ri : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  ctx.closePath(); ctx.fill();
}
// a hex colour mix: a -> b by t
function potMix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = s => Math.round(((pa >> s) & 255) + ((((pb >> s) & 255) - ((pa >> s) & 255)) * t));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
// the potato bomb: a lumpy brown spud that goes red as its fuse runs out, with a face, a burning wick and a spark
function potDrawPotato(pt, st, m) {
  const hover = pt.hover, bob = hover ? Math.sin(G.clock * 3) * 3 : 0;
  const x = pt.x, y = pt.y + bob, r = pt.r, warmth = 1 - clamp(pt.fuse / POT.warnAt, 0, 1), hot = pt.fuse <= POT.hotAt;
  // speed streak behind a fast shot
  if (pt.trail.length > 1) {
    for (let i = 0; i < pt.trail.length; i++) {
      const [tx, ty] = pt.trail[i];
      ctx.globalAlpha = 0.08 + 0.07 * i; ctx.fillStyle = PCOL[pt.trailCol];
      circle(tx, ty, r * (0.45 + i * 0.09)); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // red-hot glow
  if (hot) {
    ctx.fillStyle = `rgba(255,90,60,${0.38 + 0.25 * Math.sin(G.clock * 14)})`; circle(x, y, r + 5 + 2 * (pt.pulse / 0.1)); ctx.fill();
  } else if (warmth > 0) {
    ctx.fillStyle = `rgba(255,140,80,${0.18 * warmth})`; circle(x, y, r + 4); ctx.fill();
  }
  const sc = 1 + (hot ? 0.12 : 0.05) * (pt.pulse / 0.1);
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  // the lumpy body, turning with its spin
  ctx.save(); ctx.rotate(pt.spin);
  ctx.beginPath();
  for (let i = 0; i <= 22; i++) {
    const a = i / 22 * Math.PI * 2, q = 1 + 0.06 * Math.sin(3 * a + 1) + 0.04 * Math.sin(5 * a + 2);
    const px = Math.cos(a) * r * 1.12 * q, py = Math.sin(a) * r * 0.95 * q;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = potMix('#c99a5b', '#ff5a3c', warmth); ctx.fill();
  ctx.strokeStyle = potMix('#7a5530', '#a8321e', warmth); ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = potMix('#a07440', '#c83a22', warmth);
  for (const [ex, ey] of [[-0.62, 0.42], [0.66, 0.3], [0.18, 0.66]]) { circle(ex * r, ey * r, 1.5 * r / 11); ctx.fill(); }
  ctx.restore();
  // shine
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.ellipse(-r * 0.45, -r * 0.42, r * 0.32, r * 0.18, -0.5, 0, Math.PI * 2); ctx.fill();
  // the face (upright): calm, then worried in the last 10 s, panicking when red-hot
  const s = r / 11, lx = clamp(pt.vx / 400, -1, 1) * 1.3 * s, ly = clamp(pt.vy / 600, -1, 1) * 0.8 * s;
  ctx.fillStyle = C.ink;
  for (const ex of [-3.6, 3.6]) { circle(ex * s + lx, -1.2 * s + ly, (hot ? 1.9 : 1.6) * s); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4 * s; ctx.lineCap = 'round';
  if (hot) {
    ctx.beginPath(); ctx.ellipse(lx, 4 * s + ly, 2 * s, 2.6 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8fd3ff'; ctx.beginPath(); ctx.moveTo(r * 0.85, -r * 0.5); ctx.quadraticCurveTo(r * 1.05, -r * 0.1, r * 0.85, 0); ctx.quadraticCurveTo(r * 0.68, -r * 0.1, r * 0.85, -r * 0.5); ctx.fill();
  } else if (pt.fuse <= POT.warnAt) {
    ctx.beginPath(); ctx.moveTo(-5.6 * s + lx, -5.2 * s + ly); ctx.lineTo(-2 * s + lx, -4 * s + ly); ctx.moveTo(5.6 * s + lx, -5.2 * s + ly); ctx.lineTo(2 * s + lx, -4 * s + ly); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2.5 * s + lx, 4.2 * s + ly); ctx.quadraticCurveTo(-1 * s + lx, 3 * s + ly, 0 + lx, 4.2 * s + ly); ctx.quadraticCurveTo(1 * s + lx, 5.4 * s + ly, 2.5 * s + lx, 4.2 * s + ly); ctx.stroke();
  } else if (pt.big) {
    ctx.beginPath(); ctx.moveTo(-4.5 * s + lx, 2.6 * s + ly); ctx.quadraticCurveTo(lx, 9 * s + ly, 4.5 * s + lx, 2.6 * s + ly); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-1.6 * s + lx, 2.7 * s + ly, 3.2 * s, 1.8 * s);
  } else {
    ctx.beginPath(); ctx.arc(lx, 2.2 * s + ly, 2.8 * s, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  ctx.restore();
  // the wick: shorter and shorter as the fuse burns, with a spark on the end
  const tip = potWickTip(pt, bob), top = y - r * 0.95;
  ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, top + 2); ctx.quadraticCurveTo(x - 3, top - tip.len * 0.5, tip.x, tip.y); ctx.stroke();
  const fl = 3 + Math.random() * 1.2 + (pt.sizzleT > 0 ? 2 : 0);
  ctx.fillStyle = pt.fuse <= POT.warnAt ? 'rgba(255,120,60,0.45)' : 'rgba(255,200,90,0.4)'; circle(tip.x, tip.y, fl + 3); ctx.fill();
  ctx.fillStyle = '#fff3a0'; potStar(tip.x, tip.y, fl + 1, fl * 0.45);
  ctx.fillStyle = '#ffffff'; circle(tip.x, tip.y, 1.3); ctx.fill();
  // numbers over the potato: 3 · 2 · 1 when red-hot; in Two Spuds every potato shows its own seconds
  const sec = Math.max(1, Math.ceil(pt.fuse)), zs = hudBig() ? 1.4 : 1;
  if (hot && !hover) bigText(String(sec), x, tip.y - 18 * zs, 26 * zs, C.gold, 1 + 0.25 * (pt.pulse / 0.1));
  else if (st.twist === 'two') {
    const warn = pt.fuse <= POT.warnAt, fs = 12 * zs, th = 16 * zs;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = Math.max(th + 4, ctx.measureText(String(sec)).width + 10 * zs);
    ctx.fillStyle = warn ? 'rgba(160,40,30,0.85)' : 'rgba(28,26,54,0.72)'; rr(x - tw / 2, tip.y - 6 - th, tw, th, th / 2); ctx.fill();
    text(String(sec), x, tip.y - 6 - th / 2 + 0.5, fs, '#fff', 'center', 'body');
  }
  // lying on the sand the fuse burns three times as fast: say so next to the spark
  if (pt.rest && !hot && !hover) bigText('×3', tip.x + 15 * zs, tip.y - 2, 14 * zs, '#ffb070', 1);
  // the hovering serve: a "serve!" label in the server's colour
  if (hover && st.twist !== 'two') {
    const fs = 13 * zs, th = 18 * zs;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const lw = ctx.measureText('serve!').width + 16 * zs;
    ctx.fillStyle = 'rgba(28,26,54,0.7)'; rr(x - lw / 2, tip.y - 8 - th, lw, th, th / 2); ctx.fill();
    text('serve!', x, tip.y - 8 - th / 2 + 0.5, fs, PCOL[st.serve], 'center', 'body');
  }
}
// one oven mitt centred on (x, y), fingers pointing along `ang` (0 = up); sc 1 = 9 x 11 px
function potMitt(x, y, sc, ang, id, star, white) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc);
  ctx.lineWidth = 1.5 / sc; ctx.strokeStyle = C.ink;
  ctx.fillStyle = white ? '#ffffff' : C.paper;
  rr(-4.5, -6.5, 9, 10, 4.5); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-5, -0.5, 2.2, 3.2, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = white ? '#ffffff' : PCOL[id]; rr(-4.5, 2.5, 9, 3.5, 1.5); ctx.fill(); ctx.stroke();
  if (star) { ctx.fillStyle = C.gold; potStar(1, -2.5, 2.8, 1.2); ctx.strokeStyle = C.goldDark; ctx.lineWidth = 0.8 / sc; ctx.stroke(); }
  ctx.restore();
}
function potDrawMitts(p, st) {
  if (!p.alive) return;
  const k = p.id, sw = st.sw[k], help = st.help[k], m = G.match;
  const sc = 1 + 0.25 * help, star = help > 0, dir = k === 0 ? 1 : -1;
  const cx = p.x + p.w / 2, top = p.y + p.h - p.h * p.sy, midY = p.y + p.h * 0.55;
  const walk = p.grounded && Math.abs(p.vx) > 20 ? Math.sin(G.clock * 14) * 1.5 : 0;
  const white = sw.flash > 0;
  // the shared charge ring, while winding up
  if (sw.s === 'wind') {
    const ccx = p.x + p.w / 2, ccy = p.y + p.h / 2, full = sw.charge >= 1;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(28,26,54,0.35)'; circle(ccx, ccy, 20); ctx.stroke();
    // armed (full and held autoRel s: it will swing by itself when the potato comes): white / gold at 10 Hz, as C2's auto-fire warning
    const armed = full && sw.fullT >= POT.autoRel && Math.floor(G.clock * 20) % 2 === 1;
    ctx.strokeStyle = sw.flash > 0 || armed ? '#ffffff' : full ? C.gold : PCOL[k];
    ctx.beginPath(); ctx.arc(ccx, ccy, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sw.charge); ctx.stroke();
    // both mitts up behind the head, shaking a little
    const sh = reduceMotion ? 0 : (Math.random() - 0.5) * 2;
    potMitt(cx - dir * 7 - 5, top - 3 + sh, sc, -0.3 * dir - 0.3, k, star, white);
    potMitt(cx - dir * 7 + 5, top - 5 - sh, sc, -0.3 * dir + 0.3, k, star, white);
    return;
  }
  const stunned = p.stun > 0 && !(m && m.phase === 'end' && st.soot === k);
  const restL = [cx - p.w / 2 - 3, midY + walk + (stunned ? 4 : 0)], restR = [cx + p.w / 2 + 3, midY - walk + (stunned ? 4 : 0)];
  if (sw.anim > 0 && sw.animK === 'set') {
    const u = 1 - sw.anim / 0.25;
    potMitt(cx - 6, top - 6 - 4 * u, sc, -0.2, k, star, white); potMitt(cx + 6, top - 6 - 4 * u, sc, 0.2, k, star, white);
    return;
  }
  // a swing: the net-side mitt sweeps from the waist to above the head, with a trail
  const back = dir > 0 ? restL : restR, front = dir > 0 ? restR : restL;
  potMitt(back[0], back[1], sc, -0.2 * dir, k, star, white);
  if (sw.anim > 0 && (sw.animK === 'tap' || sw.animK === 'pow')) {
    const u = 1 - sw.anim / 0.2, R = 19 * Math.sqrt(sc), sx = cx, sy = p.y + p.h * 0.35;
    const a0 = 0.7, a1 = -1.9, a = a0 + (a1 - a0) * Math.min(1, u * 1.4);
    const pw = sw.animK === 'pow';
    ctx.strokeStyle = pw ? PCOL[k] : 'rgba(255,255,255,0.85)'; ctx.lineWidth = pw ? 5 : 3; ctx.lineCap = 'round';
    ctx.globalAlpha = 0.8 * (1 - u * 0.6);
    ctx.beginPath();
    if (dir > 0) ctx.arc(sx, sy, R + 4, a0, a, true); else ctx.arc(sx, sy, R + 4, Math.PI - a0, Math.PI - a, false);
    ctx.stroke(); ctx.globalAlpha = 1;
    const mx = sx + dir * Math.cos(a) * R, my = sy + Math.sin(a) * R;
    potMitt(mx, my, sc * (pw ? 1.15 : 1), dir * (a + Math.PI / 2), k, star, white);
  } else potMitt(front[0], front[1], sc, 0.2 * dir, k, star, white);
  // the loser of the round: a sooty face
  if (m && (m.phase === 'end' || m.phase === 'over') && st.soot === k) {
    ctx.fillStyle = 'rgba(45,40,48,0.55)';
    for (const [ox, oy, rr0] of [[-5, -3, 5], [4, -1, 4.5], [0, 3, 4], [7, 5, 3], [-7, 6, 2.5]]) { circle(cx + ox, p.y + p.h * 0.42 + oy, rr0); ctx.fill(); }
    ctx.fillStyle = 'rgba(45,40,48,0.45)'; circle(cx - 3, top + 2, 3.5); ctx.fill();
  }
}
// the explosion: a white flash, an orange shock ring, and a comic "BOOM!" star
function potDrawBoom(b) {
  const t = b.t;
  if (t < 0.12) { ctx.fillStyle = `rgba(255,255,240,${0.9 * (1 - t / 0.12)})`; circle(b.x, b.y, 30 + t * 300); ctx.fill(); }
  if (t < 0.5) {
    ctx.strokeStyle = `rgba(255,150,60,${0.85 * (1 - t / 0.5)})`; ctx.lineWidth = 6 * (1 - t / 0.5) + 1;
    circle(b.x, b.y, 14 + t * 180); ctx.stroke();
  }
  if (t < 1.1) {
    const a = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.3, sc = t < 0.12 ? 0.4 + 5 * t : 1;
    // the round-end banner covers the middle (about x 270-690, y 140-290): a BOOM up there shows its star just below it
    const y = b.y < 300 && Math.abs(b.x - POT.netX) < 270 ? 335 : Math.min(b.y, POT.floorY - 36);
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(b.x, y); ctx.scale(sc, sc); ctx.rotate(-0.08);
    ctx.fillStyle = '#ffe08a'; ctx.strokeStyle = '#d0472a'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) { const an = i / 16 * Math.PI * 2, q = i % 2 ? 22 : 38; ctx.lineTo(Math.cos(an) * q * 1.35, Math.sin(an) * q * 0.85); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    bigText('BOOM!', 0, 1, 24, '#ff5a3c');
    ctx.restore();
  }
}
// the HUD fuse timer, under the match pill where other levels show their round clock: a burning rope and the seconds left
function potDrawTimer(st, m, big) {
  const pt = potNext(st), done = !pt && (m.phase === 'end' || m.phase === 'over');
  if (!pt && !done) return;
  const fuse = pt ? Math.max(0, pt.fuse) : 0, warn = !!pt && fuse <= POT.warnAt, hot = !!pt && fuse <= POT.hotAt;
  const cy = big ? 58 : 48, ch = big ? 32 : 24, w = big ? 236 : 176, x0 = W / 2 - w / 2, mid = cy + ch / 2;
  pill(W / 2, cy, w, ch, 'center');
  if (warn || done) {
    const pu = pt ? pt.pulse / 0.1 : 0;
    ctx.fillStyle = `rgba(230,70,40,${done ? 0.55 : (hot ? 0.45 : 0.28) + 0.3 * pu})`; rr(x0, cy, w, ch, ch / 2); ctx.fill();
  }
  // a mini potato bomb at the left end of the rope
  const ir = big ? 9 : 7, ix = x0 + ch / 2 + 3;
  ctx.fillStyle = done ? '#5a4a44' : potMix('#c99a5b', '#ff5a3c', 1 - clamp(fuse / POT.warnAt, 0, 1));
  ctx.beginPath(); ctx.ellipse(ix, mid + 1, ir * 1.1, ir * 0.92, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = C.ink; circle(ix - ir * 0.33, mid, ir * 0.15); ctx.fill(); circle(ix + ir * 0.33, mid, ir * 0.15); ctx.fill();
  // the rope: the part left is tan with twists, the burnt part a thin dark line; the spark eats it from the right
  const numW = big ? 46 : 36, bx = ix + ir + 4, bw = x0 + w - numW - 8 - bx, f = pt ? clamp(fuse / pt.fuse0, 0, 1) : 0;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(246,239,223,0.22)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx, mid); ctx.lineTo(bx + bw, mid); ctx.stroke();
  if (f > 0) {
    const ex = bx + bw * f, lw = big ? 6 : 4.5;
    ctx.strokeStyle = warn ? '#ff7a4a' : '#e8c48a'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(bx, mid); ctx.lineTo(ex, mid); ctx.stroke();
    ctx.strokeStyle = warn ? '#b8402a' : '#9a7448'; ctx.lineWidth = 1.2;
    for (let x = bx + 2; x < ex - 2; x += 5) { ctx.beginPath(); ctx.moveTo(x, mid + lw / 2 - 0.5); ctx.lineTo(x + 2.5, mid - lw / 2 + 0.5); ctx.stroke(); }
    const fr = (big ? 5 : 4) + Math.random() * 1.5 + (warn ? 1 : 0);
    ctx.fillStyle = warn ? 'rgba(255,110,60,0.55)' : 'rgba(255,200,90,0.5)'; circle(ex, mid, fr + 3); ctx.fill();
    ctx.fillStyle = '#fff3a0'; potStar(ex, mid, fr, fr * 0.45);
  }
  // red-hot: say it in the pill too (the rope is nearly gone by then)
  if (hot) {
    const lx = bx + bw * f + (bw * (1 - f)) / 2 + 4, lfs = big ? 17 : 13;
    ctx.save(); ctx.translate(lx, mid + 0.5); const ps = 1 + 0.12 * (pt.pulse / 0.1); ctx.scale(ps, ps);
    text('RED-HOT!', 0, 0, lfs, '#ffe08a', 'center');
    ctx.restore();
  }
  // the seconds left (or BOOM!)
  const fs = big ? 22 : 15;
  if (done) text('BOOM!', x0 + w - 12, mid + 0.5, fs, '#ffe08a', 'right');
  else {
    const sec = Math.ceil(fuse), col = hot ? '#ffe08a' : warn ? C.gold : C.paper;
    ctx.save(); ctx.translate(x0 + w - 14, mid + 0.5);
    const s = warn ? 1.15 + 0.25 * (pt.pulse / 0.1) : 1; ctx.scale(s, s);
    text(String(sec), 0, 0, fs, col, 'right');
    ctx.restore();
  }
}
Sfx.extra.potWhack = function (p) { this.tone(520 * p, 0.05, 'square', 0.05, 300 * p); this.tone(160, 0.08, 'triangle', 0.06, 110); };
Sfx.extra.potSmash = function (p) { this.tone(1400, 0.04, 'square', 0.05, 500); this.tone(220 * p, 0.14, 'sawtooth', 0.04, 90); };
Sfx.extra.potSet = function (p) { this.tone(440 * p, 0.08, 'triangle', 0.05, 880 * p); };
Sfx.extra.potPop = function (p) { this.tone(300 * p, 0.06, 'sine', 0.06, 520 * p); };
Sfx.extra.potFull = function (p) { this.tone(1320 * p, 0.1, 'triangle', 0.05); this.tone(1760 * p, 0.12, 'triangle', 0.04, null, 0.05); };
Sfx.extra.potSizzle = function () { this.tone(2400, 0.22, 'sawtooth', 0.012, 900); this.tone(180, 0.08, 'triangle', 0.05, 120); };
Sfx.extra.potNet = function () { this.tone(200, 0.06, 'triangle', 0.05, 140); };
Sfx.extra.potTick = function () { this.tone(1100, 0.03, 'square', 0.025); };
Sfx.extra.potTickHot = function () { this.tone(1500, 0.035, 'square', 0.03); };
Sfx.extra.potHot = function () { [880, 660].forEach((f, i) => this.tone(f, 0.1, 'square', 0.04, null, i * 0.1)); };
Sfx.extra.potBonk = function () { this.tone(330, 0.05, 'triangle', 0.05, 220); this.tone(1300, 0.1, 'triangle', 0.03, 1700, 0.05); };
Sfx.extra.potServe = function () { this.tone(900, 0.25, 'sine', 0.04, 500); };
Sfx.extra.potFizz = function () { this.tone(1800, 0.3, 'sawtooth', 0.01, 300); };
Sfx.extra.potBoom = function () { this.tone(160, 0.6, 'sawtooth', 0.09, 40); this.tone(90, 0.7, 'triangle', 0.1, 30, 0.02); this.tone(1200, 0.15, 'square', 0.03, 200); };

