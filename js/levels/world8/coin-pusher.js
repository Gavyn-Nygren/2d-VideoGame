/* Pip & Bo - Level 8-4 Coin Pusher (versus). */
'use strict';

/* ===== 8-4 Coin Pusher (coin, versus): grab coins, put them in on your color, the pusher shoves them into your tube =====
   Everything here is prefixed coin / COIN. The pile physics (coinPileMake) is pure and deterministic; all drawing-only
   state (flyers, combos, rings, spin) never feeds back into the rules. Randomness: MODES.coin.rand. */

// Coin pile physics: circles (coins r 8, lucky r 10, prizes r 14) on a flat bed with open ends, pushed by a kinematic
// pusher (a box with a tent top). Position-based contacts + simple support friction. Deterministic, no DOM.
function coinPileMake(cfg) {
  const P = Object.assign({
    g: 1600, iters: 4, bedY: 450, edgeL: 120, edgeR: 840,
    hw: 90, ph: 45, apexH: 16, slideV: 110, fr: 2200, frCoin: 1400, rest: 6, maxV: 900, cell: 24,
  }, cfg || {});
  const S = { P, b: [], fallen: [], pus: { c: 480, vx: 0 } };
  S.add = (x, y, r, kind, extra) => { const o = Object.assign({ x, y, vx: 0, vy: 0, r, m: r * r / 64, kind: kind || 'coin', sup: 0, supVx: 0, shelf: 0, side: 0, own: 0, age: 0 }, extra || {}); S.b.push(o); return o; };
  // pusher polygon (convex): bottom-left, top-left (shelf edge), apex, top-right, bottom-right
  function pusherPoly(c) {
    const y0 = P.bedY, ys = P.bedY - P.ph, ya = ys - P.apexH;
    return [[c - P.hw, y0], [c - P.hw, ys], [c, ya], [c + P.hw, ys], [c + P.hw, y0]];
  }
  S.poly = () => pusherPoly(S.pus.c);
  // push circle o out of the convex polygon pts (clockwise in screen coords); returns the contact normal or null
  function circlePoly(o, pts) {
    let best = 1e9, bx = 0, by = 0, inside = true;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = pts[i], [cx, cy] = pts[(i + 1) % n];
      const ex = cx - ax, ey = cy - ay, L2 = ex * ex + ey * ey;
      let t = ((o.x - ax) * ex + (o.y - ay) * ey) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = ax + ex * t, qy = ay + ey * t, d = (o.x - qx) ** 2 + (o.y - qy) ** 2;
      if (d < best) { best = d; bx = qx; by = qy; }
      const cross = ex * (o.y - ay) - ey * (o.x - ax);
      if (cross < 0) inside = false;
    }
    const d = Math.sqrt(best);
    if (!inside && d >= o.r) return null;
    let nx = o.x - bx, ny = o.y - by;
    if (d > 1e-6) { nx /= d; ny /= d; } else { nx = 0; ny = -1; }
    if (inside) { nx = -nx; ny = -ny; }
    const pen = inside ? o.r + d : o.r - d;
    o.x += nx * pen; o.y += ny * pen;
    return { nx, ny };
  }
  S.step = (dt, c) => {
    const pus = S.pus, oldC = pus.c;
    pus.vx = (c - oldC) / dt; pus.c = c;
    const poly = pusherPoly(c), b = S.b;
    for (const o of b) {
      o.age += dt;
      o.px = o.x; o.py = o.y;
      o.vy = Math.min(o.vy + P.g * dt, P.maxV);
      o.x += o.vx * dt; o.y += o.vy * dt;
      o.sup = 0; o.supVx = 0; o.shelf = 0;
    }
    // broadphase grid
    const grid = new Map(), cs = P.cell;
    for (let i = 0; i < b.length; i++) { const o = b[i]; const k = ((o.x / cs) | 0) * 1000 + ((o.y / cs) | 0); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(i); }
    const pairs = [];
    for (let i = 0; i < b.length; i++) {
      const o = b[i], gx = (o.x / cs) | 0, gy = (o.y / cs) | 0;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const a = grid.get((gx + dx) * 1000 + gy + dy); if (!a) continue;
        for (const j of a) if (j > i) { const q = b[j]; const rr = o.r + q.r; if ((o.x - q.x) ** 2 + (o.y - q.y) ** 2 < (rr + 4) ** 2) pairs.push(i, j); }
      }
    }
    for (let it = 0; it < P.iters; it++) {
      for (let k = 0; k < pairs.length; k += 2) {
        const o = b[pairs[k]], q = b[pairs[k + 1]];
        let dx = q.x - o.x, dy = q.y - o.y; const rr = o.r + q.r, d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 < 1e-9) continue;
        const d = Math.sqrt(d2), pen = rr - d; dx /= d; dy /= d;
        const wo = 1 / o.m, wq = 1 / q.m, ws = wo + wq;
        o.x -= dx * pen * wo / ws; o.y -= dy * pen * wo / ws;
        q.x += dx * pen * wq / ws; q.y += dy * pen * wq / ws;
        if (it === P.iters - 1) {
          if (dy > 0.5) { q.sup = Math.max(q.sup, 1); }
          if (dy > 0.5) { o.sup = 2; o.supVx = q.vx; }
          if (dy < -0.5) { q.sup = 2; q.supVx = o.vx; }
        }
      }
      for (const o of b) {
        // bed (flat top from edgeL to edgeR) + its two round corners (coins tip off)
        if (o.x >= P.edgeL && o.x <= P.edgeR) { if (o.y + o.r > P.bedY && o.y < P.bedY + 20) { o.y = P.bedY - o.r; o.sup = 3; o.supVx = 0; } }
        else {
          const cx = o.x < P.edgeL ? P.edgeL : P.edgeR, dx = o.x - cx, dy = o.y - P.bedY, d2 = dx * dx + dy * dy;
          if (d2 < o.r * o.r && dy < 0) { const d = Math.sqrt(d2) || 1e-6; o.x = cx + dx / d * o.r; o.y = P.bedY + dy / d * o.r; if (dy / d < -0.5) { o.sup = 3; o.supVx = 0; } }
        }
        // pusher
        if (Math.abs(o.x - c) < P.hw + o.r + 1 && o.y > P.bedY - P.ph - P.apexH - o.r - 1) {
          const n = circlePoly(o, poly);
          if (n && n.ny < -0.5) { o.sup = 4; o.supVx = pus.vx; o.shelf = 1; }
        }
      }
    }
    for (const o of b) {
      o.vx = (o.x - o.px) / dt; o.vy = (o.y - o.py) / dt;
      if (o.vy > P.maxV) o.vy = P.maxV;
      if (o.shelf) {
        // the tent top slides coins off the side of the apex they sit on
        // (rev) a coin put in keeps its dropper's side (own) until it first rests on the bed, so a cup-zone coin that
        // bumps another coin on the way down still slides to the player who put it in
        if (!o.side) o.side = o.own || (o.x < c ? -1 : 1);
        o.vx = pus.vx + o.side * P.slideV;
      } else if (o.sup) {
        // own ends on the bed or once the coin is off the pusher's span; until then a coin put in that sits on other
        // coins on the shelf slides off them toward its dropper's side (it never rides them down the other half)
        if (o.sup === 3 || (o.own && Math.abs(o.x - c) > P.hw + o.r)) o.own = 0;
        o.side = 0;
        const want = o.supVx + o.own * 1.5 * P.slideV, fr = (o.sup === 3 ? P.fr : P.frCoin) * dt;
        o.vx = o.vx < want ? Math.min(o.vx + fr, want) : Math.max(o.vx - fr, want);
        if (o.vy < 0 && o.vy > -40) o.vy = 0; // no bounce off supports
        if (Math.abs(o.vx - want) < P.rest && Math.abs(o.vy) < P.rest) { o.vx = want; }
      }
    }
    // fallen off the bed
    for (let i = b.length - 1; i >= 0; i--) {
      const o = b[i];
      if (o.y > P.bedY + 24 || o.x < P.edgeL - 40 || o.x > P.edgeR + 40) { b.splice(i, 1); o.toSide = o.x < 480 ? 0 : 1; S.fallen.push(o); }
    }
  };
  return S;
}

const COIN = {
  // cabinet + machine (logical px). The cabinet is the '#' block under row 11; the mode draws it.
  roofY: 330, bedY: 450, edgeL: 120, edgeR: 840, cx: 480,
  hw: 90, ph: 45, apexH: 16,            // pusher: 180 wide, 45 tall, tent top 16 px high
  amp: 120, period: 6.0,                // ★ pusher centre 480 ± 120, one full back-and-forth in 6 s
  coinR: 8, luckyR: 10, prizeR: 14, g: 1600, slideV: 110,
  stock: 12,                            // coins per ledge at round start (≈ the ledge's capacity)
  // loose coins (outside the machine)
  cap: 5, capMagnet: 8, tokR: 9, tokG: 1500, sprayEvery: 0.5, looseMax: 14, pickDelay: 0.35,
  sprayVx: [60, 420], sprayVy: [-500, -200],
  holdEvery: 0.2,                       // holding coin keeps putting coins in, one every 0.2 s
  hopMax: 40,                           // (rev) coins go in only from the glass or a low hop over it (feet <= 40 px up)
  // round
  target: 32, sdTarget: 5,              // (rev) 36 -> 32: stomp-happy siblings fill a tube before the bell more often
  // Bonus Cup + Big Shove
  cupFirst: 8, cupEvery: 10, cupR: 14, cupPts: 2, shove: 40, shoveW: 1.6, shoveLead: 0.6,
  // stomp
  spill: 2, stompSafe: 1.1,             // (rev) how long a stomped player can't be stomped again (framework default 1.1 s)
  // prizes: round times; the same type goes on both ledges (mirrored)
  prizeTimes: [0, 20, 40], magnetT: 8, magnetR: 170, magnetV: 320, rainN: 6, starPts: 3,
  // ★ comeback: trailing by 6+ (4+ when behind in rounds), a gold lucky coin (worth 2, only yours) flies to you every 3 s
  // (1.5 s at a gap of 8+, 1 s at 12+, at most 3 loose); trailing by 8+, a free Lucky shove (at most one per 12 s)
  luckyShoveGap: 8, luckyShoveEvery: 12, luckyPts: 2,
  // (rev) Lucky start: whoever is behind in rounds starts the round with 2 coins already in the tube per round behind (max 4)
  luckyStart: 2, luckyStartMax: 2,
  luckyGap: 6, luckyGapBehind: 4, luckyEvery: 3, luckyBig: 8, luckyEvery1: 1.5, luckyBig2: 12, luckyEvery2: 1.0, luckyFlight: 0.9, luckyMax: 3,
  // twists
  turboPeriod: 4.0, partyEvery: 8, sprinkleA: 240, sprinkleP: 7, jackCupFirst: 3, jackCupEvery: 5, jackPts: 3,
  // feel (drawing only)
  avalanche: 6,                         // coins (points) in one push that make it an AVALANCHE!
  hintAfter: 1.5, hintUntil: 6,         // "Press F!" over a loaded player standing on their color, until they've put 6 coins in
  idlePause: 40,                        // (rev) nobody touched anything for 40 s of live play: pause (family touch, like KOTH)
};
const COIN_PRIZES = ['star', 'magnet', 'rain'];
const COIN_LIT_T = Math.sqrt(2 * (COIN.bedY - COIN.ph - COIN.coinR - COIN.roofY) / COIN.g);   // 0.289 s: glass -> shelf height
const COIN_STEPS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];   // cascade chimes climb a major pentatonic scale
let coinSfxN = 1, coinSfxD = 0;                                 // the next coinFall chime: step in the cascade and delay

function coinNozzle() {
  const st = G.mst, n = st.nozzle || { x: 480, y: 120 };
  // Sprinkler round: the spout slides along its rail, so the coins land in a moving band
  if (st.twist === 'sprinkler') return { x: n.x + COIN.sprinkleA * Math.sin(2 * Math.PI * (st.t || 0) / COIN.sprinkleP), y: n.y };
  return n;
}
// pusher centre at round time t (base sine + scheduled Big Shoves)
function coinPusherAt(t) {
  const st = G.mst;
  let c = COIN.cx + COIN.amp * Math.sin(2 * Math.PI * t / st.period + st.phase);
  for (const s of st.shoves) {
    const u = t - s.te;
    if (Math.abs(u) < COIN.shoveW / 2) c += (s.k === 0 ? -1 : 1) * COIN.shove * Math.cos(Math.PI * u / COIN.shoveW) ** 2;
  }
  return c;
}
// the next time (>= t0) the base motion reaches player k's end of the stroke
function coinNextEnd(k, t0) {
  const st = G.mst, w = 2 * Math.PI / st.period, target = k === 0 ? 1.5 * Math.PI : 0.5 * Math.PI;
  const n = Math.ceil((w * t0 + st.phase - target) / (2 * Math.PI));
  return (target - st.phase + 2 * Math.PI * n) / w;
}
// where a coin let go at (x, y0) now ends up: { side: 0|1|-1, cup: bool, t1, c }
function coinPredict(x, y0) {
  const st = G.mst, fall = Math.max(4, (COIN.bedY - COIN.ph - COIN.coinR) - y0);
  const t1 = Math.sqrt(2 * fall / COIN.g), c = coinPusherAt(st.t + t1);
  if (Math.abs(x - c) <= COIN.cupR) return { side: -1, cup: true, t1, c };   // on the apex: the cup (or its lid)
  if (x < c) return { side: 0, cup: false, t1, c };
  return { side: 1, cup: false, t1, c };
}
// (rev) a pop that would land on a young one nearby goes above it (two prizes in one second stay readable)
function coinPop(x, y, str, col, size, life) {
  const pops = G.mst.pops;
  for (let i = 0; i < 4; i++) {
    const q = pops.find(q => q.t < 0.6 && Math.abs(q.x - x) < 90 && Math.abs(q.y - 30 * q.t / q.life - y) < 22);
    if (!q) break;
    y = q.y - 30 * q.t / q.life - 24;
  }
  pops.push({ x, y, str, col: col || C.gold, size: size || 16, t: 0, life: life || 0.9 });
}
function coinBubble(k, str) { G.mst.bubble[k] = { str, t: 0 }; }
// cosmetic particles: never more than 400 from this mode (bot sims step thousands of ticks per frame)
function coinSpark(x, y, vx, vy, col, size, life, grav) {
  if (G.particles.length < 400) G.particles.push({ x, y, vx, vy, life, max: life, col, size, grav, kind: 'dot' });
}

function coinStock() {
  const st = G.mst, S = st.pile;
  S.b.length = 0; S.fallen.length = 0;
  for (const side of [-1, 1]) {
    let n = 0;
    for (let row = 0; n < st.stockN; row++) for (let i = 0; i < 7 && n < st.stockN; i++) {
      const x = side < 0 ? COIN.edgeL + 10 + i * 16 + (row % 2) * 8 : COIN.edgeR - 10 - i * 16 - (row % 2) * 8;
      S.add(x, COIN.bedY - COIN.coinR - row * 14, COIN.coinR); n++;
    }
  }
}
function coinAddPrize(type) {
  const st = G.mst;
  for (const k of [0, 1]) {
    const x = k === 0 ? COIN.edgeL + 62 : COIN.edgeR - 62;
    st.pile.add(x, 362, COIN.prizeR, 'prize', { prize: type }); st.made++;
  }
  coinPop(W / 2, 372, 'Prize drop!', C.gold, 18, 1.2);
  Sfx.play('coinPrizeIn');
}
function coinSpray(st, extraSide) {
  const R = MODES.coin.rand, nz = coinNozzle();
  let sides;
  if (extraSide !== undefined) sides = [extraSide];                     // Coin shower: always toward the winner's side
  else { if (!st.bag || !st.bag.length) st.bag = R() < 0.5 ? [0, 1] : [1, 0]; sides = [st.bag.shift()]; }   // a bag of one left + one right
  st.sprayN++;
  for (const k of sides) {
    const vx = COIN.sprayVx[0] + R() * (COIN.sprayVx[1] - COIN.sprayVx[0]);
    const vy = COIN.sprayVy[0] + R() * (COIN.sprayVy[1] - COIN.sprayVy[0]);
    st.toks.push({ x: nz.x + (k === 0 ? -6 : 6), y: nz.y, vx: (k === 0 ? -1 : 1) * vx, vy, kind: 'tok', owner: -1, rest: false, t: 0, pick: 0.12, from: 'spray' });
  }
  st.sprayFx = 0.14;
  coinSpark(nz.x + (sides[0] ? 8 : -8), nz.y + 2, (sides[0] ? 1 : -1) * 60, -40, 'rgba(255,230,140,0.9)', 3, 0.25, 100);
  Sfx.play('coinSpray');
}
// loose coins: fall, bounce on solid tiles and plank tops, then rest
function coinTokStep(o, dt) {
  if (o.rest) return;
  const r = COIN.tokR, y0 = o.y;
  o.vy = Math.min(o.vy + COIN.tokG * dt, 900);
  o.x += o.vx * dt; o.y += o.vy * dt;
  if (o.x < r) { o.x = r; o.vx = Math.abs(o.vx) * 0.5; }
  if (o.x > W - r) { o.x = W - r; o.vx = -Math.abs(o.vx) * 0.5; }
  if (o.y - r < 0) { o.y = r; o.vy = Math.abs(o.vy) * 0.3; }
  if (o.vy > 0) {
    const tx = Math.floor(o.x / T), ty = Math.floor((o.y + r) / T), top = ty * T, ch = tile(tx, ty);
    if ((ch === '#' || (ch === '=' && y0 + r <= top + 0.5)) && o.y + r > top) {
      o.y = top - r;
      if (o.vy > 160) { o.vy = -o.vy * 0.32; o.vx *= 0.6; }
      else { o.vy = 0; o.vx *= 0.5; if (Math.abs(o.vx) < 25) { o.vx = 0; o.rest = true; } }
    }
  }
  // side walls of solid tiles (the cabinet top is flat; only matters if a coin flies into a wall)
  const tx = Math.floor(o.x / T), ty = Math.floor(o.y / T);
  if (tile(tx, ty) === '#') { o.x -= o.vx * dt; o.vx = -o.vx * 0.4; }
}
function coinCapOf(k) { return G.mst.magnet[k] > 0 ? COIN.capMagnet : COIN.cap; }
function coinSpill(o, n, awayDir) {
  const st = G.mst, c = st.carry[o.id];
  for (let i = 0; i < n && c.length; i++) {
    const kind = c.pop();
    const dir = (i % 2 ? -1 : 1) * (awayDir || 1);
    st.toks.push({ x: o.x + o.w / 2, y: o.y + 4, vx: dir * (110 + 70 * i), vy: -330 - 40 * i, kind, owner: kind === 'lucky' ? o.id : -1, rest: false, t: 0, pick: COIN.pickDelay, from: 'spill' });
  }
}
// (rev) over the glass strip and at most a low hop above it (not from a plank or high in a jump)
function coinOnGlass(p) {
  const cx = p.x + p.w / 2, feet = p.y + p.h;
  return cx >= COIN.stripX0 + 4 && cx <= COIN.stripX1 - 4 && feet <= COIN.roofY + 1 && feet >= COIN.roofY - COIN.hopMax;
}
// put a coin in (or say why not)
function coinTryDrop(p, fresh) {
  const st = G.mst, k = p.id, c = st.carry[k];
  if (!p.alive || p.stun > 0) return false;
  const cx = p.x + p.w / 2, feet = p.y + p.h;
  if (!c.length) { if (fresh) { coinBubble(k, 'No coins!'); Sfx.play('coinNope', k); st.stats.nope[k]++; } return false; }
  if (!coinOnGlass(p)) {
    if (fresh) { coinBubble(k, 'Stand on the glass!'); Sfx.play('coinNope', k); st.wobble[k] = 0.25; st.stats.nope[k]++; }
    return false;
  }
  const pr = coinPredict(cx, feet);
  const cup = pr.cup && st.cupOpen;
  if (!pr.cup && pr.side !== k) {
    if (fresh) { coinBubble(k, NAMES[1 - k] + '’s side!'); Sfx.play('coinNope', k); st.wobble[k] = 0.25; st.stats.nope[k]++; }
    return false;
  }
  const kind = c.pop(), r = kind === 'tok' ? COIN.coinR : COIN.luckyR, s = k === 0 ? -1 : 1;
  st.made++;
  // the coin keeps the side it was promised (the tent top slides it that way) until it first rests on the bed;
  // near the apex the lid tips it to the dropper
  // (rev) coins put in quickly one after another queue up in the slot (a new one starts just above the last one still
  // falling there), so two coins never start inside each other and shove one sideways onto the other player's side
  let y0 = feet + 2;
  for (const o of st.pile.b) if (o.falling && Math.abs(o.x - cx) < o.r + r + 1 && o.y < y0 + o.r + r + 1) y0 = Math.min(y0, o.y - o.r - r - 1);
  st.pile.add(cx, y0, r, kind, { side: s, own: s, dropper: k, cup, falling: true, landT: st.t + pr.t1 });
  st.stats.coins[k]++;
  st.hintT[k] = 0; st.bubble[k] = null;
  st.slotFx.push({ x: cx, k, t: 0 });
  Sfx.play(fresh ? 'coinDrop' : 'coinFeed', k);   // a held feed repeats every 0.2 s: the quieter one (C7)
  return true;
}
function coinScore(k, pts) {
  const st = G.mst;
  st.score[k] += pts;
  st.stats.points[k] += pts;
  st.tubeFx[k] = 0.35;
}
// a scored push: the "+N" counter over the tube grows while coins keep falling; 6+ in one push is an AVALANCHE!
function coinCombo(k, pts) {
  const st = G.mst;
  let cb = st.combo[k];
  if (!cb || cb.t > 1.0) cb = st.combo[k] = { pts: 0, t: 0, bump: 0, ava: false };
  cb.pts += pts; cb.t = 0; cb.bump = 1;
  if (!cb.ava && cb.pts >= COIN.avalanche) {
    cb.ava = true;
    st.stats.avalanches[k]++;
    coinPop(k === 0 ? 228 : W - 228, 398, 'AVALANCHE!', PCOL[k], 26, 1.3);
    Sfx.play('coinAvalanche', k);
    rumble(k, 0.35, 0.7, 260);
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.1);
    st.flash = 0.8;
    const tx = k === 0 ? 69 : 891;
    for (let i = 0; i < 14; i++) confetti(tx, 350);
  }
}
// a coin flies from where it fell (or the cup) into its slot in the tube; the tube shows coins that have landed
function coinTubeSlot(k, i) {
  const tx = k === 0 ? 24 : W - 114, ty1 = H - 14, row = Math.min(10, Math.floor(i / 5)), col = i % 5;
  return { x: tx + 13 + col * 16 + (row % 2 ? 4 : 0), y: ty1 - 16 - row * 13 };
}
function coinFly(k, x, y, n, kind, delay, dur, lift) {
  const st = G.mst, slot = coinTubeSlot(k, st.tubeN[k] + st.flyN[k]);
  st.flyN[k] += n;
  st.fly.push({ k, x0: x, y0: y, x1: slot.x, y1: slot.y, n, kind: kind === 'lucky' ? 'lucky' : 'tok', t: -(delay || 0), T: dur || 0.36, lift: lift || 46 });
}
function coinFlyStep(dt) {
  const st = G.mst;
  let landed = false;
  for (const f of st.fly) {
    f.t += dt;
    if (f.t >= f.T && !f.done) {
      landed = true;
      f.done = true; st.tubeN[f.k] += f.n; st.flyN[f.k] -= f.n; st.tubeFx[f.k] = Math.max(st.tubeFx[f.k], 0.2);
      coinSpark(f.x1, f.y1 - 4, -30 + 60 * ((st.tubeN[f.k] * 7) % 10) / 10, -90, 'rgba(255,240,170,0.95)', 2.5, 0.3, 300);
    }
  }
  if (landed) st.fly = st.fly.filter(f => !f.done);
}
function coinCupShot(o) {
  const st = G.mst, k = o.dropper, c = st.c;
  st.cupOpen = false; st.cupT = st.cupEvery; st.cupFx = 0.6;
  st.stats.cups[k]++;
  const pts = COIN.cupPts + (o.kind === 'tok' ? 0 : 1) + (st.twist === 'jackpot' ? COIN.jackPts : 0);
  coinScore(k, pts);
  const te = coinNextEnd(k, st.t + COIN.shoveLead);
  st.shoves.push({ k, te });
  st.shoveFor = { k, te };
  coinPop(c, 330 - 34, 'BIG SHOVE!', PCOL[k], 22, 1.1);
  coinPop(c + (k ? 30 : -30), 372, '+' + pts, C.gold, 18, 0.9);
  for (let i = 0; i < pts; i++) coinFly(k, c, 378, 1, 'tok', 0.05 + i * 0.07, 0.6, 120);   // the cup pours its coins into your tube
  st.rings.push({ x: c, y: 382, t: 0, col: C.gold });
  st.flash = Math.max(st.flash, 0.5);
  Sfx.play('coinCup', k);
  rumble(k, 0.3, 0.6, 160);
  burst(o.x, o.y, C.gold, 14);
}
function coinPrizeWon(k, type, x, y) {
  const st = G.mst, p = G.players[k];
  st.stats.prizes[k]++;
  const pts = type === 'star' ? COIN.starPts : 1;
  coinScore(k, pts); coinCombo(k, pts);
  for (let i = 0; i < pts; i++) coinFly(k, x, y, 1, 'tok', i * 0.08);
  if (type === 'star') coinPop(k === 0 ? 69 : 891, 300, 'Gold star!', C.gold, 18, 1.2);
  else if (type === 'magnet') { st.magnet[k] = COIN.magnetT; if (p.alive) coinPop(p.x + p.w / 2, p.y - 44, 'Magnet!', C.gold, 17, 1.0); }
  else if (type === 'rain') { st.rain.push({ k, n: COIN.rainN, t: 0 }); if (p.alive) coinPop(p.x + p.w / 2, p.y - 44, 'Coin shower!', C.gold, 17, 1.0); }
  Sfx.play('coinPrize', k);
  rumble(k, 0.2, 0.5, 140);
  for (let i = 0; i < 16; i++) confetti(k === 0 ? 69 : 891, 340);
}
// drawing-only timers (also run in idle, so pops, flyers and rings finish during the banners)
function coinFxStep(dt) {
  const st = G.mst;
  for (const q of st.pops) q.t += dt;
  if (st.pops.length) st.pops = st.pops.filter(q => q.t < q.life);
  coinFlyStep(dt);
  for (const r of st.rings) r.t += dt;
  if (st.rings.length) st.rings = st.rings.filter(r => r.t < 0.5);
  for (const s of st.slotFx) s.t += dt;
  if (st.slotFx.length) st.slotFx = st.slotFx.filter(s => s.t < 0.3);
  for (let k = 0; k < 2; k++) {
    st.tubeFx[k] = Math.max(0, st.tubeFx[k] - dt);
    st.carryFx[k] = Math.max(0, st.carryFx[k] - dt);
    const cb = st.combo[k]; if (cb) { cb.t += dt; cb.bump = Math.max(0, cb.bump - dt * 7); if (cb.t > 1.5) st.combo[k] = null; }
  }
  st.sprayFx = Math.max(0, st.sprayFx - dt);
  st.flash = Math.max(0, st.flash - dt);
  st.cupFx = Math.max(0, st.cupFx - dt);
  if (st.winFx) st.winFx.t += dt;
}
function coinRoundOver(w) {
  const st = G.mst;
  if (w < 0) return;
  st.winFx = { k: w, t: 0 };
  const tx = w === 0 ? 69 : 891;
  for (let i = 0; i < 22; i++) confetti(tx, 350);
}

MODES.coin = {
  rand: Math.random,
  setup(st, L) {
    // the glass strip ('$' on the cabinet top) is solid floor; remember where it is. 'f' = the fountain nozzle.
    let x0 = 99, x1 = -1;
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      const ch = L.grid[ty][tx];
      if (ch === '$') { L.grid[ty][tx] = '#'; x0 = Math.min(x0, tx); x1 = Math.max(x1, tx); }
      else if (ch === 'f') { st.nozzle = { x: (tx + 1) * T, y: (ty + 1) * T }; L.grid[ty][tx] = '.'; }   // (rev) the tile's bottom right corner: clear of the phone clock
    }
    COIN.stripX0 = x0 * T; COIN.stripX1 = (x1 + 1) * T;
    st.stats = { luckyShoves: [0, 0], luckyGot: [0, 0], lucky: [0, 0], bestPush: [0, 0], points: [0, 0], coins: [0, 0], cups: [0, 0], prizes: [0, 0], stomps: [0, 0], spilled: [0, 0], nope: [0, 0], picked: [0, 0], avalanches: [0, 0] };
    st.matchPts = [0, 0];
    const R = MODES.coin.rand;
    st.twists = ['turbo', 'party', 'sprinkler'];
    for (let i = st.twists.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [st.twists[i], st.twists[j]] = [st.twists[j], st.twists[i]]; }
    st.prizeOrder = COIN_PRIZES.slice();
    st.pile = coinPileMake({ g: COIN.g, bedY: COIN.bedY, edgeL: COIN.edgeL, edgeR: COIN.edgeR, hw: COIN.hw, ph: COIN.ph, apexH: COIN.apexH, slideV: COIN.slideV });
  },
  resetRound(n, info) {
    const st = G.mst, R = MODES.coin.rand;
    st.t = 0; st.score = [0, 0]; st.carry = [[], []]; st.toks = []; st.pops = []; st.bubble = [null, null]; st.wobble = [0, 0];
    st.hold = [false, false]; st.holdT = [0, 0]; st.luckyT = [1, 1]; st.luckyShoveT = [0, 0]; st.bag = null; st.magnet = [0, 0]; st.rain = []; st.luckyShown = [false, false]; st.luckyShoveShown = [false, false];
    st.sprayT = 0.3; st.sprayN = 0; st.cupOpen = false; st.cupFx = 0; st.shoves = []; st.shoveFor = null;
    st.tubeFx = [0, 0]; st.prizeI = 0;
    // drawing-only state
    st.fly = []; st.tubeN = [0, 0]; st.flyN = [0, 0]; st.combo = [null, null]; st.rings = []; st.slotFx = []; st.carryFx = [0, 0];
    st.sprayFx = 0; st.flash = 0; st.winFx = null; st.hintT = [0, 0];
    st.sudden = !!info.suddenDeath;
    st.twist = n === 1 || st.sudden ? 'classic' : n >= 5 ? 'jackpot' : st.twists[(n - 2) % st.twists.length];
    st.target = st.sudden ? COIN.sdTarget : COIN.target;
    st.period = st.twist === 'turbo' ? COIN.turboPeriod : COIN.period;
    st.prizeTimes = st.twist === 'party' ? [0, 1, 2, 3, 4, 5, 6].map(i => i * COIN.partyEvery) : COIN.prizeTimes.slice();
    st.cupEvery = st.twist === 'jackpot' ? COIN.jackCupEvery : COIN.cupEvery;
    st.cupT = st.twist === 'jackpot' ? COIN.jackCupFirst : COIN.cupFirst;
    st.burst = [0, 0]; st.burstT = [0, 0]; st.idleT = 0;
    // Lucky start (not in sudden death): coins already in the tube of whoever is behind in rounds
    st.head = [0, 0];
    if (!st.sudden && COIN.luckyStart > 0) for (const k of [0, 1]) {
      const behind = info.wins[1 - k] - info.wins[k];
      if (behind > 0) { st.head[k] = COIN.luckyStart * Math.min(COIN.luckyStartMax, behind); st.score[k] = st.head[k]; st.tubeN[k] = st.head[k]; }
    }
    // the pusher starts in the middle and heads to a random side first
    st.phase = R() < 0.5 ? 0 : Math.PI;
    st.stockN = COIN.stock;
    coinStock();
    // shuffle which prize comes when (same type on both ledges)
    st.prizeOrder = COIN_PRIZES.slice();
    for (let i = st.prizeOrder.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [st.prizeOrder[i], st.prizeOrder[j]] = [st.prizeOrder[j], st.prizeOrder[i]]; }
    // settle the stocked piles before GO (the pusher stands still at its start spot)
    const c0 = coinPusherAt(0);
    for (let i = 0; i < 150; i++) st.pile.step(DT, c0);
    st.pile.fallen.length = 0;
    st.made = st.pile.b.length; st.gone = 0;
    st.c = c0;
  },
  go() {
    const st = G.mst;
    for (const k of [0, 1]) if (st.head[k]) {
      coinPop(k === 0 ? 69 : 891, 300, 'Lucky start!', C.gold, 17, 1.4);
      st.tubeFx[k] = 0.5; Sfx.play('coinLucky', k);
      for (let i = 0; i < 10; i++) confetti(k === 0 ? 69 : 891, 350);
    }
  },
  step(dt) {
    const st = G.mst, S = st.pile;
    st.t += dt;
    // prizes on schedule
    while (st.prizeI < st.prizeTimes.length && st.t >= st.prizeTimes[st.prizeI]) {
      const type = st.prizeOrder[st.prizeI % st.prizeOrder.length];
      st.prizeI++;
      coinAddPrize(type);
    }
    // the Bonus Cup
    if (!st.cupOpen) { st.cupT -= dt; if (st.cupT <= 0) { st.cupOpen = true; Sfx.play('coinCupOpen'); } }
    st.shoves = st.shoves.filter(s => st.t < s.te + COIN.shoveW);
    if (st.shoveFor && st.t > st.shoveFor.te + COIN.shoveW / 2) st.shoveFor = null;
    for (const s of st.shoves) if (!s.on && st.t >= s.te - COIN.shoveW / 2) { s.on = true; Sfx.play('coinShove', s.k); }
    // act: tap = one coin, hold = one coin every 0.2 s (consumed every tick, never buffered)
    for (const p of G.players) {
      const k = p.id;
      st.wobble[k] = Math.max(0, st.wobble[k] - dt);
      if (st.magnet[k] > 0) st.magnet[k] = Math.max(0, st.magnet[k] - dt);
      if (st.bubble[k]) { st.bubble[k].t += dt; if (st.bubble[k].t > 0.9) st.bubble[k] = null; }
      if (p.pendingAct) { p.pendingAct = false; coinTryDrop(p, true); st.hold[k] = true; st.holdT[k] = COIN.holdEvery + 0.1; }
      else if (st.hold[k]) {
        if (!p.input.act || !p.alive) st.hold[k] = false;
        else { st.holdT[k] -= dt; if (st.holdT[k] <= 0) { st.holdT[k] = COIN.holdEvery; coinTryDrop(p, false); } }
      }
      // kid help: loaded, standing on your own color and not pressing -> a "Press F!" bubble (until you've put 6 coins in)
      const cx = p.x + p.w / 2;
      // (1-player mode: never over the computer's character)
      if (p.alive && p.grounded && st.carry[k].length && st.stats.coins[k] < COIN.hintUntil && coinOnGlass(p) && !(typeof cpuSolo === 'function' && cpuSolo() && cpuOn(k))) {
        const pr = coinPredict(cx, p.y + p.h);
        st.hintT[k] = pr.cup || pr.side === k ? st.hintT[k] + dt : 0;
      } else st.hintT[k] = 0;
    }
    // the fountain
    st.sprayT -= dt;
    if (st.sprayT <= 0) {
      st.sprayT += COIN.sprayEvery;
      let loose = 0; for (const o of st.toks) if (o.from === 'spray') loose++;
      if (loose < COIN.looseMax) coinSpray(st);
    }
    // comeback: a gold lucky coin flies to the player who trails by luckyGap or more (only they can pick it up)
    for (const p of G.players) {
      const k = p.id, gap = st.score[1 - k] - st.score[k], m = G.match;
      // a player who is behind in rounds gets help sooner (gap 4 instead of 6)
      const need = m && m.wins[k] < m.wins[1 - k] ? COIN.luckyGapBehind : COIN.luckyGap, behind = gap >= need;
      if (!behind || !p.alive) { st.luckyT[k] = Math.min(st.luckyT[k], 1.0); continue; }
      st.luckyT[k] -= dt;
      if (st.luckyT[k] > 0) continue;
      let mine = 0; for (const o of st.toks) if (o.owner === k) mine++;
      if (mine >= COIN.luckyMax) continue;
      st.luckyT[k] = gap >= COIN.luckyBig2 ? COIN.luckyEvery2 : gap >= COIN.luckyBig ? COIN.luckyEvery1 : COIN.luckyEvery;
      const nz = coinNozzle(), Tf = COIN.luckyFlight, tx = p.x + p.w / 2, ty = p.y + p.h / 2;
      st.toks.push({ x: nz.x, y: nz.y, vx: (tx - nz.x) / Tf, vy: (ty - nz.y - 0.5 * COIN.tokG * Tf * Tf) / Tf, kind: 'lucky', owner: k, rest: false, t: 0, pick: 0.12, from: 'lucky' });
      st.stats.lucky[k]++;
      if (!st.luckyShown[k]) { st.luckyShown[k] = true; coinPop(p.x + p.w / 2, p.y - 44, 'Lucky coins!', C.gold, 17, 0.9); }
      Sfx.play('coinLucky', k);
    }
    // comeback 2: trailing by luckyShoveGap or more -> a free gold Big Shove on your side (at most one every luckyShoveEvery s)
    for (const k of [0, 1]) {
      st.luckyShoveT[k] -= dt;
      if (st.score[1 - k] - st.score[k] >= COIN.luckyShoveGap && st.luckyShoveT[k] <= 0 && !st.shoves.some(s2 => s2.k === k && s2.te > st.t)) {
        st.luckyShoveT[k] = COIN.luckyShoveEvery;
        const te = coinNextEnd(k, st.t + COIN.shoveLead);
        st.shoves.push({ k, te, lucky: true }); st.shoveFor = { k, te, lucky: true };
        const p = G.players[k]; if (p.alive && !st.luckyShoveShown[k]) { st.luckyShoveShown[k] = true; coinPop(p.x + p.w / 2, p.y - 44, 'Lucky shove!', C.gold, 17, 0.9); }
        st.stats.luckyShoves[k]++;
      }
    }
    for (const r of st.rain) { r.t -= dt; if (r.t <= 0 && r.n > 0) { r.n--; r.t = 0.2; coinSpray(st, r.k); } }
    if (st.rain.length) st.rain = st.rain.filter(r => r.n > 0);
    // loose coins: move, magnet, pick up
    for (const o of st.toks) {
      o.t += dt; o.pick = Math.max(0, o.pick - dt);
      let pulled = false;
      for (const p of G.players) {
        if (st.magnet[p.id] > 0 && p.alive && st.carry[p.id].length < coinCapOf(p.id) && !(o.owner >= 0 && o.owner !== p.id)) {
          const dx = p.x + p.w / 2 - o.x, dy = p.y + p.h / 2 - o.y, d = Math.hypot(dx, dy);
          if (d < COIN.magnetR && d > 1) { o.x += dx / d * COIN.magnetV * dt; o.y += dy / d * COIN.magnetV * dt; o.rest = false; o.vx = 0; o.vy = 0; pulled = true; }
        }
      }
      if (!pulled) coinTokStep(o, dt);
      // a lucky coin in flight leaves a little gold trail
      if (o.kind === 'lucky' && !o.rest && (G.tickN % 4) === 0) coinSpark(o.x, o.y, 0, 0, 'rgba(255,220,90,0.8)', 3, 0.3, 0);
    }
    // who picks first alternates every tick (like the engine's push order), so a coin both touch isn't always Pip's
    const pickOrder = (G.tickN & 1) ? [G.players[1], G.players[0]] : G.players;
    for (const p of pickOrder) {
      if (!p.alive) continue;
      const k = p.id;
      for (const o of st.toks) {
        if (o.gone || o.pick > 0 || st.carry[k].length >= coinCapOf(k) || (o.owner >= 0 && o.owner !== k)) continue;
        if (o.x > p.x - 6 && o.x < p.x + p.w + 6 && o.y > p.y - 8 && o.y < p.y + p.h + 6) {
          o.gone = true; st.carry[k].push(o.kind); st.stats.picked[k]++; if (o.kind === 'lucky') st.stats.luckyGot[k]++;
          st.carryFx[k] = 0.16;
          Sfx.play('coinPick', k);
          puff(o.x, o.y, 3, 'rgba(255,215,90,0.9)');
        }
      }
    }
    if (st.toks.some(o => o.gone)) st.toks = st.toks.filter(o => !o.gone);
    // the machine
    const c = coinPusherAt(st.t);
    st.c = c;
    S.step(dt, c);
    // drawing only: coins roll with their speed over what holds them (and keep spinning while they fall)
    for (const o of S.b) { if (o.sup) o.spin = (o.vx - o.supVx) / o.r; o.rot = (o.rot || 0) + (o.spin || 0) * dt; }
    // the pushing face kicks up a little felt dust during a Big Shove
    if (st.shoveFor && (G.tickN % 5) === 0 && Math.abs(st.t - st.shoveFor.te) < 0.5) {
      const fx = st.shoveFor.k === 0 ? c - COIN.hw : c + COIN.hw;
      coinSpark(fx, COIN.bedY - 3, (st.shoveFor.k === 0 ? -1 : 1) * 70, -50, 'rgba(220,255,230,0.7)', 3, 0.35, 150);
    }
    // cup shots: a cup coin that reaches the apex height goes in
    for (let i = S.b.length - 1; i >= 0; i--) {
      const o = S.b[i];
      if (o.falling && o.y >= COIN.bedY - COIN.ph - COIN.apexH - 6) {
        o.falling = false;
        if (o.cup) {
          if (st.cupOpen) { S.b.splice(i, 1); st.gone++; coinCupShot(o); }
          else { o.cup = false; Sfx.play('coinClonk', o.dropper); coinSpark(o.x, o.y - 6, (o.side || 1) * 50, -80, '#d9d3ef', 3, 0.3, 300); } // the lid is shut: it tips to the dropper's side (o.side)
        }
      }
    }
    // things that fell off an edge score for that side (and fly into its tube)
    let nFall = [0, 0];
    for (const o of S.fallen) {
      const k = o.toSide; st.gone++;
      const pts = o.kind === 'lucky' ? COIN.luckyPts : o.kind === 'prize' ? 0 : 1;
      if (pts) {
        coinScore(k, pts); coinCombo(k, pts); coinFly(k, o.x, o.y, pts, o.kind);
        st.burst[k]++; st.burstT[k] = 1.0; if (st.burst[k] > st.stats.bestPush[k]) st.stats.bestPush[k] = st.burst[k];
      }
      if (o.kind === 'prize') coinPrizeWon(k, o.prize, o.x, o.y);
      else { coinSfxN = st.combo[k] ? st.combo[k].pts : 1; coinSfxD = 0.045 * nFall[k]++; Sfx.play('coinFall', k); }
    }
    S.fallen.length = 0;
    coinFxStep(dt);
    for (let k = 0; k < 2; k++) { st.burstT[k] -= dt; if (st.burstT[k] <= 0) st.burst[k] = 0; }
    // round win
    const s = st.score, tg = st.target;
    if (s[0] >= tg || s[1] >= tg) {
      st.matchPts[0] += s[0] - st.head[0]; st.matchPts[1] += s[1] - st.head[1];
      const w = s[0] === s[1] ? -1 : s[0] > s[1] ? 0 : 1;
      if (w < 0) matchRoundEnd(-1, 'Dead even!');
      else matchRoundEnd(w, st.sudden ? 'First to ' + tg + ' coins!' : 'Filled the tube first!');
      coinRoundOver(w);
      return;
    }
    // (rev) nobody has touched anything for a long time: pause the game (the round clock stops with it)
    if (G.players.some(p => { const i = p.input; return i.left || i.right || i.jump || i.down || i.up || i.act; })) st.idleT = 0;
    else { st.idleT += dt; if (st.idleT >= COIN.idlePause) { st.idleT = 0; pause(); } }
  },
  onStomp(p, o) {
    const st = G.mst, n = Math.min(COIN.spill, st.carry[o.id].length);
    o.stompSafe = Math.max(o.stompSafe, COIN.stompSafe);
    st.stats.stomps[p.id]++;
    if (n) { coinSpill(o, n, Math.sign((o.x - p.x) || 1)); st.stats.spilled[o.id] += n; Sfx.play('coinSpill', o.id); coinPop(o.x + o.w / 2, o.y - 40, 'Oops!', PCOL[o.id], 17, 0.8); }
  },
  idle(dt) {
    if (G.mst.pops) coinFxStep(dt);
  },
  timeUp() {
    const st = G.mst, s = st.score;
    st.matchPts[0] += s[0] - st.head[0]; st.matchPts[1] += s[1] - st.head[1];
    if (s[0] === s[1]) return { winner: -1, reason: 'Dead even!' };
    const w = s[0] > s[1] ? 0 : 1;
    coinRoundOver(w);
    return { winner: w, reason: 'More coins at the bell!' };
  },
  tiebreak() {
    const m = G.mst.matchPts;
    if (m[0] === m[1]) return -1;
    return { winner: m[0] > m[1] ? 0 : 1, reason: 'More coins this match!' };
  },
  draw() { coinDraw(); },
  drawTop() { coinDrawTop(); },
  hud() { coinHud(); },
  stats() {
    const s = G.mst.stats;
    const out = [{ label: 'Coins scored', values: s.points.slice() }, { label: 'Coins put in', values: s.coins.slice() }];
    if (s.cups[0] + s.cups[1]) out.push({ label: 'Big shoves', values: s.cups.slice() });
    if (s.prizes[0] + s.prizes[1]) out.push({ label: 'Prizes', values: s.prizes.slice() });
    if (out.length < 4 && s.stomps[0] + s.stomps[1]) out.push({ label: 'Stomps', values: s.stomps.slice() });
    const bp = s.bestPush, bk = bp[0] === bp[1] ? -1 : bp[0] > bp[1] ? 0 : 1;
    if (bk >= 0 && bp[bk] >= 3) out.push('Biggest push: ' + NAMES[bk] + ', ' + bp[bk] + ' coins at once!');
    return out;
  },
};

// test hook for bots (window.__pipbo.MODES.coin.test)
MODES.coin.test = { pusherAt: t => coinPusherAt(t), predict: (x, y) => coinPredict(x, y), COIN, onGlass: p => coinOnGlass(p),
  pop: (x, y, str, col, size, life) => coinPop(x, y, str, col, size, life),
  // where a loose coin will come to rest (a copy is stepped forward; bots use it to run for coins still in the air)
  land(o) { const q = Object.assign({}, o); for (let i = 0; i < 360 && !q.rest; i++) coinTokStep(q, DT); return { x: q.x, y: q.y, t: q.rest ? null : 3 }; } };

/* ---------- drawing ---------- */
// Coins are pretend arcade tokens with an embossed star (lead review), never money. Each kind and size is drawn once
// into a small sprite at the current screen scale and then stamped (hundreds of coins per frame stay cheap on phones).
const coinSpr = { s: 0, m: new Map(), stat: null, tube: null };
function coinSprFrame() {
  const s = Math.max(0.1, canvas.width / W);   // device px per logical px (render() scales by canvas.width / W); changes only on resize
  if (s !== coinSpr.s) { coinSpr.s = s; coinSpr.m.clear(); coinSpr.stat = null; coinSpr.tube = null; }
}
function coinStarOn(g, x, y, r, col, ang) {
  g.fillStyle = col; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (ang || 0) + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  g.closePath(); g.fill();
}
// ang turns only the emblem (star or clover); the rim, face and glint stay lit from the top left
function coinDiscOn(g, x, y, r, kind, ang) {
  const lucky = kind === 'lucky', dot = (cx, cy, rr2) => { g.beginPath(); g.arc(cx, cy, rr2, 0, Math.PI * 2); g.fill(); };
  g.fillStyle = lucky ? '#e0b52a' : C.goldDark; dot(x, y, r);
  g.fillStyle = lucky ? '#ffe36b' : C.gold; dot(x, y - 0.8, r - 1.6);
  g.fillStyle = 'rgba(255,255,255,0.55)'; dot(x - r * 0.35, y - r * 0.4, r * 0.25);
  if (lucky) { g.fillStyle = '#3fae5a'; for (let a = 0; a < 4; a++) dot(x + Math.cos(a * 1.571 + (ang || 0)) * r * 0.27, y - 0.6 + Math.sin(a * 1.571 + (ang || 0)) * r * 0.27, r * 0.23); }
  else coinStarOn(g, x, y - 0.6, r * 0.55, 'rgba(185,133,15,0.85)', ang);   // (lead review) an arcade star token, never a money coin
}
// sprites: one per kind, size and emblem angle (8 steps over the emblem's symmetry: 72° for the star, 90° for the clover)
const COIN_ROT_N = 8;
function coinSprGet(r, kind, ai) {
  const key = kind + r + ':' + ai;
  let e = coinSpr.m.get(key);
  if (!e) {
    const h = r + 1.5, c = document.createElement('canvas'), px = Math.max(4, Math.ceil(2 * h * coinSpr.s));
    c.width = c.height = px;
    const g = c.getContext('2d'); g.scale(px / (2 * h), px / (2 * h)); g.translate(h, h);
    coinDiscOn(g, 0, 0, r, kind, ai * (kind === 'lucky' ? Math.PI / 2 : 2 * Math.PI / 5) / COIN_ROT_N);
    e = { c, h }; coinSpr.m.set(key, e);
  }
  return e;
}
// one coin: rot = rolling angle (picks a pre-turned sprite), sx = horizontal squash (a coin spinning in the air)
function coinDisc(x, y, r, kind, rot, sx) {
  const lucky = kind === 'lucky', per = lucky ? Math.PI / 2 : 2 * Math.PI / 5;
  let ai = 0;
  if (rot) { ai = Math.round((rot % per) / per * COIN_ROT_N); ai = ((ai % COIN_ROT_N) + COIN_ROT_N) % COIN_ROT_N; }
  const e = coinSprGet(r, lucky ? 'lucky' : 'tok', ai), h = e.h, w = sx === undefined ? h : h * sx;
  ctx.drawImage(e.c, x - w, y - h, 2 * w, 2 * h);
}
function coinStar(x, y, r, col) { coinStarOn(ctx, x, y, r, col); }
function coinDots(a, col) {   // many bulbs in one fill: a = [x, y, r, x, y, r, ...]
  if (!a.length) return;
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < a.length; i += 3) { ctx.moveTo(a[i] + a[i + 2], a[i + 1]); ctx.arc(a[i], a[i + 1], a[i + 2], 0, Math.PI * 2); }
  ctx.fill();
}
function coinSparkle(x, y, s, col) {   // a 4-point twinkle
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.28, y - s * 0.28); ctx.lineTo(x + s, y); ctx.lineTo(x + s * 0.28, y + s * 0.28);
  ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.28, y + s * 0.28); ctx.lineTo(x - s, y); ctx.lineTo(x - s * 0.28, y - s * 0.28); ctx.closePath(); ctx.fill();
}
function coinPrizeIcon(x, y, r, type, rot) {
  ctx.save();
  if (rot) { ctx.translate(x, y); ctx.rotate(rot * 0.35); ctx.translate(-x, -y); }
  if (type === 'star') { coinStar(x, y + 1, r + 3, C.goldDark); coinStar(x, y, r + 2, C.gold); ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(x - 4, y - 5, 2.2); ctx.fill(); }
  else if (type === 'magnet') {
    ctx.lineWidth = 7; ctx.strokeStyle = '#e8445a'; ctx.beginPath(); ctx.arc(x, y - 1, r - 5, Math.PI, 0, true); ctx.stroke();
    ctx.fillStyle = '#e8445a'; ctx.fillRect(x - r + 1.5, y - 1, 7, 7); ctx.fillRect(x + r - 8.5, y - 1, 7, 7);
    ctx.fillStyle = '#f6efdf'; ctx.fillRect(x - r + 1.5, y + 3, 7, 4); ctx.fillRect(x + r - 8.5, y + 3, 7, 4);
  } else {
    ctx.fillStyle = '#ffffff'; circle(x - 5, y, 7); ctx.fill(); circle(x + 4, y - 3, 8); ctx.fill(); circle(x + 9, y + 2, 6); ctx.fill(); ctx.fillRect(x - 5, y, 14, 7);
    coinDisc(x - 4, y + 9, 3.5); coinDisc(x + 5, y + 11, 3.5);
  }
  ctx.restore();
}
function coinRR(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// everything about the cabinet that never moves, drawn once per screen size into one canvas: body, glass window,
// felt bed, the two decorative back rows of coins (static, not part of the physics), edge lips, front panel, tube glass
function coinStaticLayer() {
  if (!coinSpr.stat) {
    const ry = COIN.roofY, h = H - ry, c = document.createElement('canvas');
    c.width = Math.ceil(W * coinSpr.s); c.height = Math.ceil(h * coinSpr.s);
    const g = c.getContext('2d', { alpha: false }); g.setTransform(c.width / W, 0, 0, c.height / h, 0, -ry * c.height / h);   // opaque: a plain copy
    g.fillStyle = '#2b1b52'; g.fillRect(0, ry, W, h);
    g.fillStyle = '#3b2670'; coinRR(g, 8, ry + 4, W - 16, h - 10, 14); g.fill();
    const gy0 = ry + 12, gy1 = COIN.bedY + 6, gr = g.createLinearGradient(0, gy0, 0, gy1);
    gr.addColorStop(0, '#1c2d5e'); gr.addColorStop(1, '#2c4f88');
    g.fillStyle = gr; coinRR(g, COIN.edgeL - 8, gy0, COIN.edgeR - COIN.edgeL + 16, gy1 - gy0, 8); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.05)';   // faint diagonal glass glints
    for (const [gx, gw] of [[COIN.edgeL + 40, 34], [COIN.edgeL + 86, 12], [COIN.edgeR - 150, 22]]) { g.beginPath(); g.moveTo(gx + 40, gy0 + 4); g.lineTo(gx + 40 + gw, gy0 + 4); g.lineTo(gx + gw, gy0 + 60); g.lineTo(gx, gy0 + 60); g.closePath(); g.fill(); }
    g.fillStyle = '#2f8f62'; g.fillRect(COIN.edgeL, COIN.bedY, COIN.edgeR - COIN.edgeL, 8);
    g.fillStyle = '#226b49'; g.fillRect(COIN.edgeL, COIN.bedY + 8, COIN.edgeR - COIN.edgeL, 6);
    for (let row = 1; row >= 0; row--) for (let x = COIN.edgeL + 8 + row * 7; x < COIN.edgeR - 4; x += 15) {
      g.globalAlpha = row ? 0.45 : 0.6; coinDiscOn(g, x, COIN.bedY - 5 - row * 5, 7, 'tok', ((x * 7) % 5) * 0.25);
    }
    g.globalAlpha = 1;
    g.fillStyle = PCOL[0]; g.fillRect(COIN.edgeL - 6, COIN.bedY, 6, 14);
    g.fillStyle = PCOL[1]; g.fillRect(COIN.edgeR, COIN.bedY, 6, 14);
    g.fillStyle = '#211544'; coinRR(g, 132, 470, W - 264, 58, 12); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.10)';
    for (const tx of [24, W - 114]) { coinRR(g, tx, ry + 16, 90, H - 14 - ry - 16, 12); g.fill(); }
    coinSpr.stat = { c, ry, h };
  }
  const L = coinSpr.stat; ctx.drawImage(L.c, 0, L.ry, W, L.h);
}
// the coins stacked in a tube, kept in one small canvas that is redrawn only when a coin lands
function coinTubeStack(k, n, tx, ty0, tw, th) {
  const cache = coinSpr.tube || (coinSpr.tube = [null, null]);
  let e = cache[k];
  if (!e || e.n !== n) {
    const s = coinSpr.s, c = (e && e.c) || document.createElement('canvas');
    c.width = Math.ceil(tw * s); c.height = Math.ceil(th * s);
    const g = c.getContext('2d'); g.setTransform(c.width / tw, 0, 0, c.height / th, -tx * c.width / tw, -ty0 * c.height / th);
    const ty1 = ty0 + th;
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 5), col = i % 5, yy = ty1 - 16 - row * 13, xx = tx + 13 + col * 16 + (row % 2 ? 4 : 0);
      if (yy < ty0 + 30) break;
      const sp = coinSprGet(7.5, 'tok', (i * 3) % COIN_ROT_N);
      g.drawImage(sp.c, xx - sp.h, yy - sp.h, 2 * sp.h, 2 * sp.h);
    }
    e = cache[k] = { n, c };
  }
  if (n) ctx.drawImage(e.c, tx, ty0, tw, th);
}
function coinDraw() {
  const st = G.mst; if (!st.pile || !st.score) return;
  coinSprFrame();
  const S = st.pile, P = S.P, c = st.c || COIN.cx, t = G.clock, big = hudBig();
  const x0 = COIN.stripX0, x1 = COIN.stripX1, ry = COIN.roofY;
  coinStaticLayer();
  // score tubes
  for (let k = 0; k < 2; k++) {
    const tx = k === 0 ? 24 : W - 114, tw = 90, ty0 = ry + 16, ty1 = H - 14;
    const near = st.score[k] >= st.target - 6 && st.target > COIN.sdTarget;
    if (near || st.tubeFx[k] > 0) { ctx.globalAlpha = near ? 0.3 + 0.25 * Math.sin(t * 8) : st.tubeFx[k]; ctx.strokeStyle = near ? C.gold : '#ffffff'; ctx.lineWidth = 8; rr(tx, ty0, tw, ty1 - ty0, 12); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.strokeStyle = PCOL[k]; ctx.lineWidth = 3; rr(tx, ty0, tw, ty1 - ty0, 12); ctx.stroke();
    // target line
    const rows = Math.ceil(st.target / 5), lineY = ty1 - 8 - rows * 13 - 2;
    ctx.strokeStyle = near ? C.gold : 'rgba(255,197,61,0.7)'; ctx.setLineDash([6, 4]); ctx.lineWidth = near ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(tx + 4, lineY); ctx.lineTo(tx + tw - 4, lineY); ctx.stroke(); ctx.setLineDash([]);
    coinTubeStack(k, st.tubeN[k], tx, ty0, tw, ty1 - ty0);
    // glass shine; the winner's tube gets a bright sweep
    ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.fillRect(tx + 7, ty0 + 10, 5, ty1 - ty0 - 20);
    const wf = st.winFx;
    if (wf && wf.k === k && wf.t < 1.6) {
      const f = (wf.t % 0.8) / 0.8, sy = ty1 - (ty1 - ty0) * f;
      ctx.save(); rr(tx, ty0, tw, ty1 - ty0, 12); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(tx, sy - 14, tw, 14); ctx.restore();
    }
    text(String(st.score[k]), tx + tw / 2, ty0 + 18, (big ? 28 : 22) + st.tubeFx[k] * 14, PCOL[k], 'center');
  }
  // the pusher (candy stripes) + tent top + Bonus Cup
  const ys = P.bedY - P.ph, ya = ys - P.apexH;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(c - P.hw, P.bedY); ctx.lineTo(c - P.hw, ys); ctx.lineTo(c, ya); ctx.lineTo(c + P.hw, ys); ctx.lineTo(c + P.hw, P.bedY); ctx.closePath();
  ctx.fillStyle = '#f6efdf'; ctx.fill(); ctx.clip();
  ctx.fillStyle = '#e8445a';
  ctx.beginPath();
  for (let k = -7; k < 6; k++) { const sx = c + k * 16; ctx.moveTo(sx, P.bedY); ctx.lineTo(sx + 8, P.bedY); ctx.lineTo(sx + 8 + 30, ya); ctx.lineTo(sx + 30, ya); ctx.closePath(); }
  ctx.fill();
  // left / right halves tinted for whose side they slide coins to
  ctx.fillStyle = 'rgba(255,107,74,0.28)'; ctx.fillRect(c - P.hw, ya, P.hw, P.ph + P.apexH);
  ctx.fillStyle = 'rgba(91,149,255,0.28)'; ctx.fillRect(c, ya, P.hw, P.ph + P.apexH);
  ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.fillRect(c - P.hw, P.bedY - 7, 2 * P.hw, 7);
  ctx.restore();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(c - P.hw, P.bedY); ctx.lineTo(c - P.hw, ys); ctx.lineTo(c, ya); ctx.lineTo(c + P.hw, ys); ctx.lineTo(c + P.hw, P.bedY); ctx.stroke();
  // marquee bulbs along the tent top
  const chase = Math.floor(t * 5), dA = [], dB = [];
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1, f = 0.22 + (i % 4) * 0.2, bx = c + side * P.hw * (1 - f), by = ys - (ys - ya) * f + 5;
    ((i + chase) % 2 || st.flash > 0 ? dA : dB).push(bx, by, 2.4);
  }
  coinDots(dA, C.gold); coinDots(dB, '#fff3c4');
  // Big Shove: the face that will shove glows; while it overshoots, speed lines trail behind
  if (st.shoveFor) {
    const k = st.shoveFor.k, fx = k === 0 ? c - P.hw : c + P.hw, u = st.t - st.shoveFor.te;
    ctx.fillStyle = st.shoveFor.lucky ? C.gold : PCOL[k]; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 20); ctx.fillRect(fx - 4, ys, 8, P.ph); ctx.globalAlpha = 1;
    if (Math.abs(u) < COIN.shoveW / 2) {
      const f = Math.cos(Math.PI * u / COIN.shoveW) ** 2, bx = k === 0 ? c + P.hw : c - P.hw, dir = k === 0 ? 1 : -1;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 * f).toFixed(2) + ')'; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i < 3; i++) { const yy = ys + 10 + i * 12, l = 18 + 22 * f - i * 5; ctx.moveTo(bx + dir * 6, yy); ctx.lineTo(bx + dir * (6 + l), yy); }
      ctx.stroke();
    }
  }
  // cup on the apex (it bounces when a coin goes in)
  const cupOpen = st.cupOpen, cs = 1 + 0.5 * Math.sin(Math.min(1, st.cupFx / 0.6) * Math.PI) * (st.cupFx > 0 ? 1 : 0);
  ctx.save(); ctx.translate(c, ya - 6); ctx.scale(cs, cs); ctx.translate(-c, -(ya - 6));
  if (cupOpen) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 6); ctx.fillStyle = C.gold; circle(c, ya - 8, 22); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.fillStyle = cupOpen || st.cupFx > 0 ? C.gold : '#8a7a9a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(c - 13, ya - 14); ctx.lineTo(c + 13, ya - 14); ctx.lineTo(c + 9, ya + 2); ctx.lineTo(c - 9, ya + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (cupOpen) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(c - 8, ya - 11, 3, 9); }
  else { ctx.fillStyle = '#5d4f6e'; ctx.fillRect(c - 15, ya - 17, 30, 4); // lid
    const f = 1 - clamp(st.cupT / st.cupEvery, 0, 1); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c, ya - 6, 5, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke(); }
  ctx.restore();
  if (cupOpen) for (let i = 0; i < 3; i++) { const a = t * 1.6 + i * 2.094; coinSparkle(c + Math.cos(a) * 24, ya - 8 + Math.sin(a) * 16, 3 + 1.5 * Math.sin(t * 7 + i * 2), '#fff6c8'); }
  // pile
  for (const o of S.b) {
    if (o.kind === 'prize') coinPrizeIcon(o.x, o.y, o.r, o.prize, o.rot);
    else coinDisc(o.x, o.y, o.r, o.kind, o.rot);
  }
  // glass top: lit with where a coin would go right now (orange left of the line, blue right of it)
  const pr = coinPusherAt((st.t || 0) + COIN_LIT_T);   // the same fall time coinPredict uses for a coin let go from the glass
  const bx = clamp(pr, x0, x1), sh = 14;   // 14 px everywhere: "stand on your color" is the kid's whole rule
  ctx.fillStyle = 'rgba(255,107,74,0.6)'; ctx.fillRect(x0, ry, bx - x0, sh);
  ctx.fillStyle = 'rgba(91,149,255,0.6)'; ctx.fillRect(bx, ry, x1 - bx, sh);
  ctx.fillStyle = cupOpen ? C.gold : '#ffffff'; ctx.fillRect(bx - (cupOpen ? COIN.cupR : 2), ry, cupOpen ? COIN.cupR * 2 : 4, sh);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x0, ry + sh, x1 - x0, 2);
  // little arrows on each color point to the tube it fills
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath();
  for (let ax = x0 + 18; ax < x1 - 10; ax += 44) {
    if (Math.abs(ax - bx) < (cupOpen ? 26 : 14)) continue;
    const d = ax < bx ? -1 : 1, ay = ry + sh / 2;
    ctx.moveTo(ax + d * 5, ay); ctx.lineTo(ax - d * 2, ay - 4); ctx.lineTo(ax - d * 2, ay + 4); ctx.closePath();
  }
  ctx.fill();
  for (const s of st.slotFx) { ctx.globalAlpha = 0.75 * (1 - s.t / 0.3); ctx.fillStyle = '#ffffff'; rr(s.x - 10 - 30 * s.t, ry + 1, 20 + 60 * s.t, sh - 2, 6); ctx.fill(); }
  ctx.globalAlpha = 1;
  // shoulders with bulbs
  dA.length = 0; dB.length = 0;
  for (let bxx = 12; bxx < W; bxx += 24) {
    if (bxx > x0 - 6 && bxx < x1 + 6) continue;
    (((bxx - 12) / 24 + chase) % 2 || st.flash > 0 ? dA : dB).push(bxx, ry + 6, 3.2);
  }
  coinDots(dA, C.gold); coinDots(dB, '#fff3c4');
  // front panel with chasing marquee bulbs (they all flash gold on a cup shot or an avalanche)
  dA.length = 0; dB.length = 0;
  for (let i = 0; i < 24; i++) {
    const bxx = 152 + i * 28, on = st.flash > 0 ? Math.floor(st.flash * 10) % 2 === 0 : (i + chase) % 3 === 0;
    (on ? dA : dB).push(bxx, 475, 2.6, bxx + 14, 524, 2.6);
  }
  coinDots(dA, C.gold); coinDots(dB, 'rgba(255,197,61,0.28)');
  text('COIN PUSHER', W / 2, 495, 22, C.gold, 'center');
  text('first to ' + st.target, W / 2, 513, 12, '#d9d3ef', 'center', 'body');
  // loose coins (spinning in the air, bobbing at rest)
  for (const o of st.toks) {
    const bob = o.rest ? Math.sin(t * 4 + o.x) * 1.2 : 0, sx = o.rest ? 1 : 0.25 + 0.75 * Math.abs(Math.cos(o.t * 11 + o.x));
    if (o.pick > 0 && o.from === 'spill') ctx.globalAlpha = 0.6;
    if (o.owner >= 0) { ctx.strokeStyle = PCOL[o.owner]; ctx.lineWidth = 3; circle(o.x, o.y - 1 + bob, COIN.luckyR + 3); ctx.stroke(); }
    coinDisc(o.x, o.y - 1 + bob, o.kind === 'tok' ? COIN.tokR - 1 : COIN.luckyR, o.kind, 0, sx);
    ctx.globalAlpha = 1;
  }
  // coins flying into the tubes
  for (const f of st.fly) {
    if (f.t < 0) continue;
    const u = Math.min(1, f.t / f.T), cx2 = (f.x0 + f.x1) / 2, cy2 = Math.min(f.y0, f.y1) - f.lift, a = 1 - u;
    const x = a * a * f.x0 + 2 * a * u * cx2 + u * u * f.x1, y = a * a * f.y0 + 2 * a * u * cy2 + u * u * f.y1;
    coinDisc(x, y, 7.5, f.kind, 0, 0.3 + 0.7 * Math.abs(Math.cos(f.t * 16)));
  }
  // cup-shot rings
  for (const r of st.rings) { const f = r.t / 0.5; ctx.globalAlpha = 1 - f; ctx.strokeStyle = r.col; ctx.lineWidth = 5 * (1 - f) + 1; circle(r.x, r.y, 10 + 70 * f); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // the fountain: a short pipe from a bracket under the clock (or a rail on Sprinkler rounds) to the spout
  const nz = coinNozzle(), py0 = big ? 97 : 78, sq = 1 + st.sprayFx * 1.4;
  if (st.twist === 'sprinkler') { ctx.fillStyle = C.goldDark; rr(st.nozzle.x - COIN.sprinkleA - 14, py0 - 4, 2 * COIN.sprinkleA + 28, 6, 3); ctx.fill(); }
  ctx.fillStyle = C.goldDark; ctx.fillRect(nz.x - 9, py0, 18, nz.y - 6 - py0);
  ctx.fillStyle = C.gold; ctx.fillRect(nz.x - 6, py0, 8, nz.y - 6 - py0);
  ctx.fillStyle = C.goldDark; rr(nz.x - 15, py0 - 5, 30, 7, 3); ctx.fill();
  ctx.fillStyle = C.goldDark; rr(nz.x - 20 * sq, nz.y - 12, 40 * sq, 14, 6); ctx.fill();
  ctx.fillStyle = C.gold; rr(nz.x - 17 * sq, nz.y - 11, 34 * sq, 9, 4); ctx.fill();
  coinStar(nz.x, nz.y - 6.5, 4.2, C.goldDark);                                              // (rev) a star token on the spout
  ctx.fillStyle = 'rgba(28,26,54,0.6)'; rr(nz.x - 9 * sq, nz.y - 1.5, 18 * sq, 3.5, 1.7); ctx.fill();   // and its mouth
}
function coinDrawTop() {
  const st = G.mst; if (!st.carry) return;
  coinSprFrame();
  const live = G.match && G.match.phase === 'live';
  for (const p of G.players) {
    if (!p.alive) continue;
    const k = p.id, c = st.carry[k], cx = p.x + p.w / 2;
    const wob = st.wobble[k] > 0 ? Math.sin(G.clock * 40) * 3 : 0;
    for (let i = 0; i < c.length; i++) {
      const x = cx + wob * (i + 1) / c.length, y = p.y - 6 - i * 6, r = c[i] === 'tok' ? 6 : 7.5;
      if (i === c.length - 1 && st.carryFx[k] > 0) { const s = 1 + st.carryFx[k] * 2.2; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); coinDisc(0, 0, r, c[i]); ctx.restore(); }   // a fresh pickup pops
      else coinDisc(x, y, r, c[i]);
    }
    if (st.magnet[k] > 0) { ctx.strokeStyle = 'rgba(232,68,90,0.5)'; ctx.lineWidth = 2; circle(cx, p.y + p.h / 2, 26 + Math.sin(G.clock * 10) * 3); ctx.stroke(); }
    let b = st.bubble[k], gold = false;
    if (!b && live && st.hintT[k] > COIN.hintAfter) {   // kid help: name the coin button ((rev) keys and pad buttons in a key cap)
      const how = actKey(k);
      b = how === 'touch' ? { str: 'Tap coin!' } : { str: 'Press', key: how === 'pad' ? coinPadGlyph(k) : k === 0 ? 'F' : '/' };
      gold = true;
    }
    if (b && live) {
      const bs = hudBig() ? 1.35 : 1, fs = 12 * bs;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      let w, preW = 0, capW = 0;
      if (b.key) { preW = ctx.measureText(b.str + ' ').width; capW = Math.max(ctx.measureText(b.key).width + 10 * bs, 17 * bs); w = preW + capW + ctx.measureText('!').width + 18; }
      else w = ctx.measureText(b.str).width + 16;
      const by = p.y - 22 - c.length * 6 - 14 * bs, bx = clamp(cx - w / 2, 4, W - 4 - w);
      ctx.globalAlpha = gold ? 1 : clamp((0.9 - b.t) / 0.2, 0, 1);
      ctx.fillStyle = 'rgba(28,26,54,0.85)'; rr(bx, by - 10 * bs, w, 20 * bs, 10 * bs); ctx.fill();
      if (gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; rr(bx, by - 10 * bs, w, 20 * bs, 10 * bs); ctx.stroke(); }
      const col = gold ? C.gold : C.paper;
      if (b.key) {
        let x = bx + 8;
        text(b.str, x, by + 0.5, fs, col, 'left', 'body'); x += preW;
        ctx.fillStyle = '#b9b1d6'; rr(x, by - 7 * bs, capW, 15 * bs, 4 * bs); ctx.fill();          // key cap: a light key with a darker base
        ctx.fillStyle = C.paper; rr(x, by - 7.5 * bs, capW, 13 * bs, 4 * bs); ctx.fill();
        text(b.key, x + capW / 2, by - 0.5 * bs, fs, C.ink, 'center', 'body'); x += capW + 1;
        text('!', x, by + 0.5, fs, col, 'left', 'body');
      } else text(b.str, bx + w / 2, by + 0.5, fs, col, 'center', 'body');
      ctx.globalAlpha = 1;
    }
  }
  const pb = hudBig() ? 1.25 : 1;
  // the "+N" counter over each tube while a push pays out
  for (let k = 0; k < 2; k++) {
    const cb = st.combo[k]; if (!cb) continue;
    const a = cb.t < 1.0 ? 1 : clamp(1 - (cb.t - 1.0) / 0.5, 0, 1), sz = (15 + Math.min(13, cb.pts * 1.3)) * pb;
    ctx.globalAlpha = a;
    bigText('+' + cb.pts, k === 0 ? 69 : 891, 318 - Math.min(cb.t, 1.5) * 8, sz, cb.ava ? C.gold : PCOL[k], 1 + 0.45 * cb.bump);
  }
  for (const q of st.pops) {
    const f = q.t / q.life;
    ctx.globalAlpha = clamp((1 - f) * 2, 0, 1);
    coinPopText(q.str, q.x, q.y - 30 * f, q.size * pb, q.col, q.t < 0.12 ? 0.6 + 0.4 * q.t / 0.12 : 1);
  }
  ctx.globalAlpha = 1;
}
// like bigText, with a thicker ink outline (player-coloured words stay readable on the lavender sky and on phones)
function coinPopText(str, x, y, size, col, scale) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.26; ctx.strokeStyle = C.ink; ctx.strokeText(str, 0, 0);
  ctx.fillStyle = col; ctx.fillText(str, 0, 0);
  ctx.restore();
}
// the act button's name on this player's own controller (Xbox X, PlayStation □, Switch Y)
function coinPadGlyph(k) {
  try {
    const slot = padFor(padSlots(), k), gp = slot && navigator.getGamepads && navigator.getGamepads()[slot.ix];
    if (gp) return (GLYPHS[padFamily(gp)] || GLYPHS.xbox).act;
  } catch (e) { /* fall back to the shared glyph */ }
  return glyph('act');
}
function coinHud() {
  const st = G.mst, m = G.match; if (!st.score) return;
  const sc = hudBig() ? 1.35 : 1;
  const names = { turbo: 'Turbo Pusher', party: 'Prize Party', sprinkler: 'Sprinkler', jackpot: 'Jackpot Cup', classic: 'Coin Pusher' };
  const hints = { turbo: 'The pusher goes extra fast!', party: 'Prizes drop in every 8 seconds!', sprinkler: 'The fountain swings side to side!',
    jackpot: 'Final round: the cup pays 3 extra!', classic: 'Put coins in on your color!' };
  if (st.twist !== 'classic') {
    ctx.font = '700 ' + 13 * sc + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const nm = names[st.twist], tw = ctx.measureText(nm).width;
    pill(14, 46, tw + 28, 26 * sc); text(nm, 28, 46 + 13.5 * sc, 13 * sc, C.gold, 'left', 'body');
  }
  if (m && (m.phase === 'ready' || m.phase === 'count')) {
    const nm = st.sudden ? 'Sudden death!' : names[st.twist], hint = st.sudden ? 'First to ' + st.target + ' coins wins' : hints[st.twist];
    ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = Math.max(300, ctx.measureText(hint).width + 48);
    ctx.globalAlpha = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1;
    ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(W / 2 - w / 2, 284, w, 60, 16); ctx.fill();
    text(nm, W / 2, 305, 26, C.gold, 'center'); text(hint, W / 2, 330, 14, C.paper, 'center', 'body');
    ctx.globalAlpha = 1;
  }
  // top-right live chip: the Bonus Cup / a Big Shove on its way
  let chip = null;
  if (st.shoveFor) chip = st.shoveFor.lucky ? ['Lucky shove for ' + NAMES[st.shoveFor.k] + '!', C.gold] : ['Big shove for ' + NAMES[st.shoveFor.k] + '!', PCOL[st.shoveFor.k]];
  else if (st.cupOpen) chip = ['Bonus Cup is open!', C.gold];   // (lead review) 'Lucky' is only for comebacks
  if (chip && m && m.phase === 'live') {
    ctx.font = '700 ' + 13 * sc + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(chip[0]).width;
    pill(W - 14, 12, tw + 28, 28 * sc, 'right'); text(chip[0], W - 28, 12 + 14.5 * sc, 13 * sc, chip[1], 'right', 'body');
  }
}
Sfx.extra.coinPick = function (p) { this.tone(1320 * p, 0.05, 'square', 0.03); this.tone(1760 * p, 0.06, 'square', 0.025, null, 0.04); };
Sfx.extra.coinDrop = function (p) { this.tone(880 * p, 0.06, 'triangle', 0.05, 1320 * p); };
Sfx.extra.coinFeed = function (p) { this.tone(880 * p, 0.06, 'triangle', 0.03, 1320 * p); };   // repeats while held: C7 0.03
Sfx.extra.coinNope = function (p) { this.tone(180 * p, 0.12, 'square', 0.03, 140 * p); };
// a falling coin chimes one step higher for every coin in the same push (a cascade plays a rising scale)
Sfx.extra.coinFall = function (p) {
  const f = 1046 * p * Math.pow(2, COIN_STEPS[Math.min(COIN_STEPS.length - 1, Math.max(0, coinSfxN - 1))] / 12), d = Math.min(0.3, coinSfxD);
  this.tone(f, 0.06, 'triangle', 0.03, null, d); this.tone(f * 1.5, 0.07, 'triangle', 0.02, null, d + 0.03);
  coinSfxN = 1; coinSfxD = 0;
};
Sfx.extra.coinSpray = function () { this.tone(700, 0.05, 'sine', 0.02, 1000); };
Sfx.extra.coinCupOpen = function () { [988, 1319, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.coinCup = function (p) { this.tone(392 * p, 0.25, 'sawtooth', 0.04, 784 * p); [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f * p, 0.09, 'square', 0.035, null, 0.05 + i * 0.06)); };
Sfx.extra.coinLucky = function (p) { [1319, 1760].forEach((f, i) => this.tone(f * p, 0.08, 'sine', 0.04, null, i * 0.06)); };
Sfx.extra.coinPrizeIn = function () { this.tone(523, 0.12, 'triangle', 0.05, 784); };
Sfx.extra.coinPrize = function (p) { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f * p, 0.12, 'triangle', 0.06, null, i * 0.08)); };
Sfx.extra.coinSpill = function (p) { [1200, 900, 700].forEach((f, i) => this.tone(f * p, 0.06, 'square', 0.03, null, i * 0.05)); };
Sfx.extra.coinShove = function (p) { this.tone(150 * p, 0.45, 'sawtooth', 0.035, 520 * p); this.tone(90 * p, 0.35, 'triangle', 0.06, 60 * p, 0.25); };
Sfx.extra.coinAvalanche = function (p) { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f * p, 0.14, 'square', 0.035, null, 0.05 + i * 0.07)); this.tone(1568 * p, 0.35, 'triangle', 0.05, 2093 * p, 0.4); };
Sfx.extra.coinClonk = function (p) { this.tone(320 * p, 0.07, 'square', 0.03, 200 * p); };   // repeats (each coin on the shut lid): C7 0.03

/* ===== end of level modes ===== */

