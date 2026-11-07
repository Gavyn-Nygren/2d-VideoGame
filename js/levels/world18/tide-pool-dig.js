/* Pip & Bo - Level 18-3 Tide Pool Dig (team, World 18 Pirate Cove). */
'use strict';

/* ===== 18-3 Tide Pool Dig (mode 'tidedig', team) — Gavyn's pick =====
   "One digs for buried chests while the other bails out seawater with a bucket and shoos away crabs that steal coins."
   A sunny tropical beach seen from the side, cut away so you can see under the sand: the buried chests show through the
   sand, and every hole is drawn as it goes down. Nobody gets hurt: a flooded hole is a "Glub!", a crab is shooed with
   a "Shoo!", and a wave over the sand wall is a "Whoosh!".
   - The DIGGER has the shovel. On an X (or in its hole) the action ('dig', tap or hold, about 2.6 strokes a second,
     mashing is no faster) digs the hole down tile by tile; deeper tiles take more strokes. Sand flies onto a pile beside
     the hole. Hold ▲ (jump) in a hole to climb out. The last stroke hits the chest: CLUNK, it pops open and a shower of
     gold coins lands on the sand on both sides (never in a hole). Either player walks over coins to save them: they go
     on the treasure blanket (the level's "coins saved", kept from room to room).
   - WAVES roll in on a rhythm (the HUD wave meter shows the next one coming; "BIG WAVE" is warned too) and run up the
     beach to the tide line. A wave that reaches an open hole pours water in. Water slows digging and from 8 px stops it
     ("Glub!"); deeper water floats the digger up. Water never drains by itself.
   - The BAILER has the bucket. At a hole's edge the action ('bail') scoops (12 px, Gold bucket 22 px); a full bucket
     slows walking, and the action at the sea (or a rock pool) dumps it. In rooms 3-4 the action at the sand-wall spot
     pats a sand wall: it stops one small wave and is washed flat; a BIG wave washes over it.
   - CRABS (rooms 2-4) scuttle out of their burrows by the rocks to grab loose coins or a coin off the blanket and run
     home with it. The action near a crab (either player, when it isn't digging or bailing) is "Shoo!": the crab drops
     the coin and scuttles off. A jump that lands next to a crab scares it too. A crab that gets home keeps the coin
     (a crab steal).
   - Roles swap every room (Pip digs rooms 1 and 3, Bo rooms 2 and 4). The bailer can walk over the holes (the mouth
     is solid for them only); the digger falls in.
   - Rooms: Sandy Cove (1 chest, gentle waves, no crabs), Rock Pools (2 chests, crabs, a rock pool to dump in),
     Shipwreck Beach (a deep chest under the old wreck, bigger waves, every 3rd wave BIG, a sand wall), Skull Rock
     Lagoon (a small chest, then the big chest: the tide comes in faster and higher as the room goes on, crabs from both
     sides; the big chest is too heavy, so both hold the action at the two rope posts to haul it up together).
   - A room is done once every chest is open, no coin is loose and no crab carries one.
   - Help, always gold and announced: Gold bucket (bigger scoops, no slow-down) after 2 floods in a room (the digger
     blocked by water for 6 s); Captain Polly the parrot chases coin-carrying crabs after 2 crab steals in a room; Gold
     shovel (1.7x digging) after 75 s in a room with a chest still shut.
   - Neither can clear it alone: digging alone floods out (water never drains) and nobody but the digger can dig.
   - Brains and hint chips read tidedigPlan(st): each player's job right now.
   Room def fields: see the comment above the level in js/levels/level-list.js.
   Every top-level name starts with tidedig / TIDEDIG (Sfx.extra.tidedig* too); level state lives in G.mst. */
const TIDEDIG = {
  S: 9,                      // the beach surface row (its top is the sand you walk on)
  strokeCD: 0.38,            // seconds between dig strokes (tap or hold)
  tileBase: 5, tilePer: 2,   // strokes for a tile: base + per * (how deep it is)
  stopW: 8, slowW: 12,       // water (px) that stops digging / that would slow it to nothing
  floatSub: 14,              // a floating digger's feet sink this far under the water
  climbV: 190, popV: 380, popVx: 200,
  scoop: 16, goldScoop: 28, carryMax: 140, edge: 42, scoopT: 0.3, dumpT: 0.35,
  shooR: 66, stompR: 70,
  crabOut: 80, crabHome: 64, crabFlee: 200, crabGrab: 0.5, crabPeek: 0.8,
  patT: 2.2, wallMax: 1,
  swellT: 1.9, rushV: 300, backV: 210, holdT: 0.45,
  coinR: 8, coinG: 1500,
  winHold: 2.0, newsLife: 3.8, chipT: 7, chipAgain: 16,
  floodT: 6, floodGold: 2, stealGold: 2, shovelAfter: 75, goldShovel: 1.7,
  haulT: 2.6,
};
const TIDEDIG_MEDAL = { gold: [240, 0.85], silver: [400, 0.6] };   // [seconds, share of coins saved]
const tidedigBig = () => (typeof hudBig === 'function' && hudBig());
const tidedigCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);   // 1-player mode: the computer's character
const tidedigCx = p => p.x + p.w / 2;
const tidedigFeet = p => p.y + p.h;
const tidedigSurf = () => TIDEDIG.S * T;

/* ---------- each player's own keys (keyboard, controller or touch) for the hint chips ---------- */
function tidedigDev(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
function tidedigKey(id, what) {
  const d = tidedigDev(id), solo = typeof cpuSolo === 'function' && cpuSolo();
  if (what === 'act') return d === 'pad' ? glyph('act') : d === 'touch' ? 'the round button' : solo ? 'F or /' : id === 0 ? 'F' : '/';
  if (what === 'up') return d === 'pad' ? glyph('a') : d === 'touch' ? '▲' : solo ? 'W or ↑' : id === 0 ? 'W' : '↑';
  return '';
}

/* ---------- the room ---------- */
function tidedigRoom(st, L) {
  const def = L.def, g = L.grid, S = TIDEDIG.S;
  st.k = def.roomIndex || 0; st.def = def; st.style = def.style || 'cove';
  st.digger = def.digger || 0; st.bailer = 1 - st.digger;
  st.mouth = st.bailer === 0 ? 'o' : 'u';      // a hole's mouth is solid for the bailer only
  st.rock = new Set(); st.holes = []; st.dumps = []; st.burrows = []; st.posts = []; st.stashX = 6 * T; st.wall = null;
  st.pools = [];
  const xs = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = g[r][c];
    if (ch === 'r') { st.rock.add(r * COLS + c); g[r][c] = '#'; }
    else if (ch === 'x') { xs.push(c); g[r][c] = '#'; }
    else if (ch === 'p') { st.pools.push(c); g[r][c] = '#'; }
    else if (ch === 'n') { st.burrows.push({ x: c * T + T / 2, side: c < COLS / 2 ? -1 : 1 }); g[r][c] = '.'; }
    else if (ch === 'h') { st.stashX = c * T + T / 2; g[r][c] = '.'; }
    else if (ch === 'y') { st.wall = { x: c * T + T / 2, lv: 0, prog: 0, held: 0, anim: 0 }; g[r][c] = '.'; }
    else if (ch === 'q') { st.posts.push(c * T + T / 2); g[r][c] = '.'; }
  }
  // the sea: the first water column on the surface row
  st.seaC = COLS; for (let c = 0; c < COLS; c++) if (g[S][c] === 'w') { st.seaC = c; break; }
  st.seaX = st.seaC * T;
  st.dumps.push({ x0: st.seaX - 40, x1: W, kind: 'sea', cx: st.seaX - 22 });
  if (st.pools.length) {
    const a = Math.min(...st.pools), b = Math.max(...st.pools);
    st.dumps.push({ x0: a * T - 20, x1: (b + 1) * T + 20, kind: 'pool', cx: (a + b + 1) * T / 2, pa: a, pb: b });
  }
  // the coins' landing span: right of the left rocks, left of the sea
  let minC = 0; while (minC < COLS && st.rock.has((S - 1) * COLS + minC)) minC++;
  st.minX = minC * T + 16; st.maxX = st.seaX - 24;
  const chests = def.chests || [];
  st.holes = xs.sort((a, b) => a - b).map((c, i) => {
    const ch = chests[i] || { depth: 3, coins: 10 };
    return { c, cx: c * T + T / 2, depth: 0, prog: 0, water: 0, pile: 0, pourFx: 0, glubT: 0, flooded: false,
      chest: { depth: ch.depth, coins: ch.coins, big: !!ch.big, haul: !!ch.haul, opened: false, open: 0, lift: 0 } };
  });
  st.order = def.order || st.holes.map((h, i) => i);
  // the waves and the tide
  const wv = def.waves || {};
  st.wv = { every: wv.every || 10, pour: wv.pour || 16, reach: wv.reach || 300, big: wv.big || 0, bigPour: wv.bigPour || 30,
    first: wv.first || 7, ramp: wv.ramp || null };
  st.wave = { ph: 'calm', t: st.wv.first, front: st.seaX, n: 0, big: false, poured: [], hitWall: false, reach: st.wv.reach, swell: 0 };
  st.crabCfg = def.crabs || null; st.crabT = st.crabCfg ? st.crabCfg.first || 4 : 0; st.crabs = []; st.crabNext = 0;
  st.coins = []; st.pops = []; st.news = null; st.parts = [];
  st.phase = 'play'; st.winT = 0; st.winTick = 0; st.roomT = 0; st.stepT = 0; st.jobKey = ['', ''];
  st.haul = null;
  st.room = { floods: 0, steals: 0, blockedT: 0, strokes: 0 };
  st.gold = { bucket: false, shovel: false, polly: false };
  const px = def.polly || 300;   // Captain Polly's perch
  st.polly = { on: false, x: px, y: TIDEDIG.S * T - 60, home: { x: px, y: TIDEDIG.S * T - 60 }, perch: px, target: null, t: 0, say: '', sayT: 0, face: 1 };
  st.pl = [0, 1].map(id => ({ strokeCD: 0, anim: 0, bucket: 0, act: 0, actKind: '', patT: 0, wasG: true, popCD: 0, hintT: 0, lastAct: -9, nag: '' }));
  st.chipSeen = {};
  tidedigActLabels(st);
}
// a tile's kind for drawing: sand, rock or open
const tidedigIsRock = (st, c, r) => st.rock.has(r * COLS + c);
function tidedigHoleAt(st, x) { const c = Math.floor(x / T); return st.holes.find(h => h.c === c) || null; }
const tidedigBottom = h => tidedigSurf() + h.depth * T;
const tidedigWaterTop = h => tidedigBottom(h) - h.water;
// the player's hole, when they are down inside one (below the surface, centred in its column)
function tidedigIn(st, p) {
  if (!p.alive) return null;
  const h = tidedigHoleAt(st, tidedigCx(p));
  return h && h.depth > 0 && tidedigFeet(p) > tidedigSurf() + 2 ? h : null;
}
// standing where the digger can dig h: on its X (not dug yet) or on the bottom of its hole
function tidedigAtSpot(st, p, h) {
  if (!p.alive || !h || Math.abs(tidedigCx(p) - h.cx) > 12) return false;
  return Math.abs(tidedigFeet(p) - tidedigBottom(h)) < 3.5 && (p.grounded || h.depth === 0 && p.grounded);
}
const tidedigOnSurface = p => p.alive && p.grounded && Math.abs(tidedigFeet(p) - tidedigSurf()) < 3;
const tidedigTileCost = k => TIDEDIG.tileBase + TIDEDIG.tilePer * k;
const tidedigLoose = st => st.coins.length > 0;
const tidedigOpenLeft = st => st.holes.filter(h => !h.chest.opened);

/* ---------- touch buttons and the legend name each player's own job this room ---------- */
let tidedigLabelEls = null;
function tidedigActLabels(st) {
  try {
    if (typeof document === 'undefined') return;
    if (!tidedigLabelEls || !tidedigLabelEls.every(o => document.contains(o.el))) tidedigLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const ds = box && (box.dataset.p !== undefined ? box.dataset.p : box.dataset.legp);
      const id = ds !== undefined && ds !== null ? +ds : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of tidedigLabelEls) {
      const want = o.id < 0 ? 'dig/bail' : o.id === st.digger ? 'dig' : 'bail';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}

/* ---------- little text pops and news ---------- */
function tidedigNews(st, s, gold, life) { st.news = { s, gold: !!gold, t: 0, life: life || TIDEDIG.newsLife }; }
function tidedigPop(st, x, y, s, col, size) {
  size = size || 18;
  for (let k = 0; k < 4; k++) {
    const q = st.pops.find(q => q.t < 0.9 && Math.abs(q.x - x) < 110 && Math.abs((q.y - q.t * 26) - y) < (q.size + size) * 0.6);
    if (!q) break;
    y = q.y - q.t * 26 - (q.size + size) * 0.65;
  }
  st.pops.push({ x, y, s, col: col || C.gold, size, t: 0 });
}
function tidedigSand(st, x, y, n, dir) {
  for (let i = 0; i < n; i++) st.parts.push({ x, y, vx: dir * (40 + Math.random() * 120) + (Math.random() - 0.5) * 40, vy: -160 - Math.random() * 220, life: 0.7, max: 0.7, col: Math.random() < 0.5 ? '#e0b96c' : '#c99a58', r: 1.6 + Math.random() * 2, g: 900 });
}
function tidedigDrops(st, x, y, n, col) {
  for (let i = 0; i < n; i++) st.parts.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: -80 - Math.random() * 200, life: 0.55, max: 0.55, col: col || (i % 2 ? 'rgba(120,215,240,0.85)' : 'rgba(225,248,255,0.85)'), r: 1.2 + Math.random() * 1.6, g: 800 });
}
function tidedigUsed(st, s) { if (!st.stats.gold.includes(s)) st.stats.gold.push(s); }

/* ---------- the waves ---------- */
function tidedigWaveCfg(st) {
  const wv = st.wv, r = wv.ramp;
  if (!r) return { every: wv.every, pour: wv.pour, reach: wv.reach };
  const k = clamp(st.roomT / r.over, 0, 1);   // the tide comes in as the room goes on
  return { every: wv.every + (r.every - wv.every) * k, pour: wv.pour + (r.pour - wv.pour) * k, reach: wv.reach + (r.reach - wv.reach) * k };
}
function tidedigWaves(st, dt) {
  const w = st.wave, cf = tidedigWaveCfg(st);
  w.swell = approach(w.swell, w.ph === 'swell' || w.ph === 'rush' ? 1 : 0, dt * 1.6);
  if (w.ph === 'calm') {
    w.t -= dt;
    if (w.t <= TIDEDIG.swellT) {
      w.ph = 'swell'; w.n++;
      w.big = !!st.wv.big && w.n % st.wv.big === 0;
      w.reach = cf.reach - (w.big ? 30 : 0);
      Sfx.play(w.big ? 'tidedigBigWave' : 'tidedigSwell');
    }
  } else if (w.ph === 'swell') {
    w.t -= dt;
    if (w.t <= 0) { w.ph = 'rush'; w.front = st.seaX; w.poured = []; w.hitWall = false; Sfx.play('tidedigRush'); }
  } else if (w.ph === 'rush') {
    let nf = w.front - TIDEDIG.rushV * (w.big ? 1.15 : 1) * dt;
    const wl = st.wall;
    if (wl && !w.hitWall && nf <= wl.x + 14 && w.front > wl.x + 14) {
      w.hitWall = true;
      if (wl.lv >= 1 && !w.big) {
        nf = wl.x + 14; wl.lv--; wl.prog = 0; wl.anim = 1;
        st.stats.blocked++;
        tidedigPop(st, wl.x, tidedigSurf() - 40, 'The wall held!', '#bff4ff', 17); Sfx.play('tidedigWallHold');
        tidedigDrops(st, wl.x + 10, tidedigSurf() - 10, 12);
        w.ph = 'hold'; w.t = TIDEDIG.holdT; w.front = nf; return;
      }
      if (wl.lv >= 1 && w.big) { wl.lv = 0; wl.prog = 0; wl.anim = 1; tidedigPop(st, wl.x, tidedigSurf() - 40, 'Whoosh! Over the wall!', '#bff4ff', 17); tidedigDrops(st, wl.x, tidedigSurf() - 10, 16); }
    }
    w.front = nf;
    for (const h of st.holes) {
      if (h.depth <= 0 || w.poured.includes(h) || w.front > h.cx) continue;
      w.poured.push(h);
      let pour = (w.big ? st.wv.bigPour : cf.pour) * (w.big && wl && w.hitWall ? 0.75 : 1);
      const cap = h.depth * T, was = h.water;
      h.water = Math.min(cap, h.water + pour);
      if (h.water > was + 0.5) {
        h.pourFx = 1;
        tidedigPop(st, h.cx, tidedigSurf() - 34, h.chest.opened ? 'Splash!' : 'Splash! Water in the hole!', '#bff4ff', 16);
        tidedigDrops(st, h.cx, tidedigSurf() - 4, 10);
        Sfx.play('tidedigPour');
        st.stats.waves++;
      }
    }
    if (w.front <= w.reach) { w.front = w.reach; w.ph = 'hold'; w.t = TIDEDIG.holdT; }
  } else if (w.ph === 'hold') {
    w.t -= dt; if (w.t <= 0) w.ph = 'back';
  } else if (w.ph === 'back') {
    w.front += TIDEDIG.backV * dt;
    if (w.front >= st.seaX) { w.front = st.seaX; w.ph = 'calm'; w.t = cf.every; }
  }
}
// the seconds until the next wave reaches the beach (for the HUD and the brain)
function tidedigWaveIn(st) {
  const w = st.wave;
  if (w.ph === 'calm') return w.t;
  if (w.ph === 'swell') return w.t;
  return 0;
}

/* ---------- digging ---------- */
function tidedigDig(st, p, h) {
  const P = st.pl[p.id];
  if (P.strokeCD > 0) return true;
  P.strokeCD = TIDEDIG.strokeCD; P.anim = 0.22;
  st.stats.strokes[p.id]++; st.room.strokes++;
  const ch = h.chest;
  if (h.depth >= ch.depth) {
    // the chest!
    ch.hit = (ch.hit || 0) + 1;
    Sfx.play('tidedigClunk', p.id);
    tidedigPop(st, h.cx, tidedigBottom(h) - 30, 'CLUNK!', '#ffe9a8', 18);
    if (ch.haul) { tidedigStartHaul(st, h); return true; }
    tidedigOpenChest(st, h);
    return true;
  }
  if (h.water >= TIDEDIG.stopW) {
    tidedigPop(st, h.cx, tidedigWaterTop(h) - 24, 'Glub!', '#9fe3ff', 18); Sfx.play('tidedigGlub', p.id);
    tidedigDrops(st, h.cx, tidedigWaterTop(h), 6);
    return true;
  }
  const slow = clamp(1 - h.water / TIDEDIG.slowW, 0.15, 1);
  const pow = (st.gold.shovel ? TIDEDIG.goldShovel : 1) * slow;
  h.prog += pow / tidedigTileCost(h.depth);
  const side = h.cx < W / 2 ? -1 : 1, pileDir = st.seaX > h.cx ? -1 : 1;
  tidedigSand(st, h.cx, tidedigBottom(h) - 6, 3, pileDir);
  Sfx.play('tidedigDig', p.id);
  if (h.water > 0.5) tidedigDrops(st, h.cx, tidedigWaterTop(h), 3);
  if (h.prog >= 1) {
    h.prog = 0;
    const r = TIDEDIG.S + h.depth;
    G.level.grid[r][h.c] = h.depth === 0 ? st.mouth : '.';
    h.depth++; h.pile = Math.min(6, h.pile + 1);
    st.stats.tiles[p.id]++;
    // (water spreads out over the new, bigger hole floor: the same water fills a little less of it)
    Sfx.play('tidedigTile', p.id);
    if (h.depth === 1) tidedigPop(st, h.cx, tidedigSurf() - 30, 'Dig dig!', '#ffe9a8', 15);
  }
  void side;
  return true;
}
function tidedigOpenChest(st, h) {
  const ch = h.chest;
  ch.opened = true; ch.open = 0.01;
  st.stats.chests++;
  Sfx.play('tidedigTreasure');
  rumble(0, 0.2, 0.5, 200); rumble(1, 0.2, 0.5, 200);
  tidedigPop(st, h.cx, tidedigSurf() - 50, ch.big ? 'The BIG treasure!' : 'Treasure!', C.gold, 24);
  tidedigSpill(st, h, ch.coins, ch.haul ? tidedigSurf() - 20 : tidedigSurf() - 6);
  if (st.polly) { st.polly.say = ch.big ? 'Squawk! Riches!' : 'Squawk! Treasure!'; st.polly.sayT = 2; }
}
// coins burst out of the hole's mouth and land on the sand on both sides (never in a hole, never in the sea)
function tidedigSpill(st, h, n, y0) {
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1, sp = 50 + (i * 37 % 100) / 100 * 210 + Math.random() * 30;
    st.coins.push({ x: h.cx + (Math.random() - 0.5) * 8, y: y0, vx: side * sp, vy: -420 - Math.random() * 300 - (i % 3) * 40, st: 'fly', t: 0, spin: Math.random() * 6, delay: i * 0.035 });
  }
}
function tidedigGroundY(st, x) {
  const c = clamp(Math.floor(x / T), 0, COLS - 1), g = G.level.grid;
  for (let r = 0; r < ROWS; r++) if (g[r][c] === '#') return r * T;
  return H;
}
function tidedigCoins(st, dt) {
  for (let i = st.coins.length - 1; i >= 0; i--) {
    const q = st.coins[i];
    if (q.delay > 0) { q.delay -= dt; continue; }
    q.t += dt; q.spin += dt * 8;
    if (q.st === 'fly') {
      q.vy += TIDEDIG.coinG * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.x < st.minX) { q.x = st.minX; q.vx = Math.abs(q.vx) * 0.5; }
      if (q.x > st.maxX) { q.x = st.maxX; q.vx = -Math.abs(q.vx) * 0.5; }
      if (q.vy > 0) {
        // over an open hole: hop off its edge to the nearer side
        const h = tidedigHoleAt(st, q.x);
        if (h && h.depth > 0 && q.y > tidedigSurf() - 12) { q.x = h.cx + (q.x < h.cx ? -T / 2 - 8 : T / 2 + 8); q.vx *= 0.3; }
        const gy = tidedigGroundY(st, q.x) - TIDEDIG.coinR;
        if (q.y >= gy) {
          q.y = gy;
          if (q.vy > 260) { q.vy *= -0.35; q.vx *= 0.6; if (q.t < 2.5) Sfx.play('tidedigClink'); }
          else { q.vy = 0; q.vx = 0; q.st = 'rest'; }
        }
      }
    }
    // picked up by walking over it
    for (const p of G.players) {
      if (!p.alive || q.t < 0.25) continue;
      if (rectHit(p, q.x - TIDEDIG.coinR, q.y - TIDEDIG.coinR, TIDEDIG.coinR * 2, TIDEDIG.coinR * 2)) {
        st.coins.splice(i, 1);
        st.stats.stash++; st.stats.picked[p.id]++;
        Sfx.play('tidedigCoin', p.id);
        st.parts.push({ x: q.x, y: q.y, vx: 0, vy: -60, life: 0.5, max: 0.5, col: C.gold, r: 6, g: 0, ring: true });
        break;
      }
    }
  }
}

/* ---------- the bucket ---------- */
function tidedigDumpAt(st, p) { const x = tidedigCx(p); return st.dumps.find(d => x >= d.x0 && x <= d.x1) || null; }
function tidedigScoopHole(st, p) {
  if (!tidedigOnSurface(p)) return null;
  let best = null;
  for (const h of st.holes) {
    if (h.depth <= 0) continue;
    const d = Math.abs(tidedigCx(p) - h.cx);
    if (d <= TIDEDIG.edge && (!best || d < best.d)) best = { h, d };
  }
  return best && best.h;
}
function tidedigShoo(st, p) {
  let best = null;
  for (const cr of st.crabs) {
    if (!cr.shooable()) continue;
    const d = Math.abs(cr.x - tidedigCx(p)), dy = Math.abs(tidedigSurf() - tidedigFeet(p));
    if (d <= TIDEDIG.shooR && dy < 70 && (!best || d < best.d)) best = { cr, d };
  }
  if (!best) return false;
  tidedigScare(st, best.cr, p.id, 'Shoo!');
  return true;
}
// the action: what it does depends on your job and where you stand
function tidedigAct(st, p) {
  const P = st.pl[p.id];
  const fresh = p.pendingAct, held = p.input.act;
  if (fresh) { P.lastAct = st.roomT; }
  if (st.phase !== 'play') { if (st.phase === 'haul') p.pendingAct = false; return; }
  if (p.id === st.digger) {
    const h = st.holes.find(h => !h.chest.opened && tidedigAtSpot(st, p, h));
    if (h && (fresh || held)) { p.pendingAct = false; tidedigDig(st, p, h); return; }
    if (fresh) {
      p.pendingAct = false;
      if (tidedigShoo(st, p)) return;
      const nh = st.holes.find(h => !h.chest.opened && Math.abs(tidedigCx(p) - h.cx) < 40);
      if (nh && !tidedigIn(st, p) && nh.depth === 0) tidedigPop(st, nh.cx, tidedigSurf() - 50, 'Stand on the X!', C.paper, 14);
      else if (!tidedigIn(st, p)) tidedigPop(st, tidedigCx(p), p.y - 16, 'Find an X to dig!', C.paper, 13);
    }
    return;
  }
  // the bailer
  if (P.act > 0) { p.pendingAct = false; return; }
  if (fresh) {
    p.pendingAct = false;
    if (P.bucket > 0) {
      const d = tidedigDumpAt(st, p);
      if (d) {
        P.bucket = 0; P.act = TIDEDIG.dumpT; P.actKind = 'dump';
        st.stats.buckets[p.id]++;
        tidedigPop(st, tidedigCx(p) + (d.kind === 'sea' ? 20 : 0), p.y - 14, 'Sploosh!', '#bff4ff', 16);
        tidedigDrops(st, tidedigCx(p) + p.face * 18, p.y + 6, 12);
        Sfx.play('tidedigDump', p.id);
        return;
      }
      if (tidedigShoo(st, p)) return;
      tidedigPop(st, tidedigCx(p), p.y - 16, st.pools.length ? 'Dump it in the sea or the rock pool!' : 'Dump it in the sea!', C.paper, 13);
      return;
    }
    if (tidedigShoo(st, p)) return;
    const h = tidedigScoopHole(st, p);
    if (h) {
      if (h.water < 0.5) { tidedigPop(st, h.cx, tidedigSurf() - 34, 'No water yet!', C.paper, 13); return; }
      const amt = Math.min(h.water, st.gold.bucket ? TIDEDIG.goldScoop : TIDEDIG.scoop);
      h.water -= amt; P.bucket = amt; P.act = TIDEDIG.scoopT; P.actKind = 'scoop'; p.face = h.cx > tidedigCx(p) ? 1 : -1;
      st.stats.scoops[p.id]++;
      tidedigDrops(st, h.cx, tidedigWaterTop(h), 5);
      Sfx.play('tidedigScoop', p.id);
      return;
    }
  }
  // the sand wall: hold (or tap) at the wall spot
  const wl = st.wall;
  if (wl && (fresh || held) && P.bucket <= 0 && tidedigOnSurface(p) && Math.abs(tidedigCx(p) - wl.x) < 30 && wl.lv < TIDEDIG.wallMax) {
    p.pendingAct = false;
    P.patT -= 1 / 120;
    if (P.patT <= 0) { P.patT = 0.22; Sfx.play('tidedigPat', p.id); tidedigSand(st, wl.x, tidedigSurf() - 6, 2, 0); }
    wl.prog += (1 / 120) / TIDEDIG.patT; wl.anim = 0.4;
    if (wl.prog >= 1) {
      wl.prog = 0; wl.lv++;
      tidedigPop(st, wl.x, tidedigSurf() - 40 - wl.lv * 10, 'Sand wall!', '#ffe9a8', 15);
      Sfx.play('tidedigWallUp', p.id);
    }
    return;
  }
  if (fresh) {
    const nearHole = st.holes.some(h => h.depth > 0 && Math.abs(tidedigCx(p) - h.cx) < 70);
    tidedigPop(st, tidedigCx(p), p.y - 16, nearHole ? 'Stand right by the hole!' : 'Scoop water out of a hole!', C.paper, 13);
  }
}

/* ---------- crabs ---------- */
function tidedigMakeCrab(st, b) {
  const cr = { x: b.x, home: b.x, dir: -b.side, ph: 'peek', t: 0, target: null, coin: false, from: null, legs: Math.random() * 6, hopY: 0, id: st.crabNext++ };
  cr.shooable = () => cr.ph === 'out' || cr.ph === 'grab' || cr.ph === 'home';
  return cr;
}
function tidedigCrabTarget(st, cr) {
  let best = null;
  for (const q of st.coins) {
    if (q.st !== 'rest' || q.delay > 0) continue;
    if (st.crabs.some(o => o !== cr && o.target === q)) continue;
    const d = Math.abs(q.x - cr.x);
    if (!best || d < best.d) best = { q, d };
  }
  if (best) return best.q;
  if (st.stats.stash > 0 && !st.crabs.some(o => o !== cr && o.target === 'stash')) return 'stash';
  return null;
}
function tidedigScare(st, cr, by, word) {
  if (cr.coin) {
    cr.coin = false;
    st.coins.push({ x: cr.x, y: tidedigSurf() - 26, vx: (Math.random() - 0.5) * 120, vy: -300, st: 'fly', t: 0.3, spin: 0, delay: 0 });
  }
  cr.ph = 'flee'; cr.t = 0; cr.target = null;
  if (by >= 0) st.stats.shoos[by]++;
  else st.stats.pollyShoos++;
  tidedigPop(st, cr.x, tidedigSurf() - 40, word || 'Shoo!', '#ffd0b0', 17);
  Sfx.play('tidedigShoo', by >= 0 ? by : 0);
}
function tidedigCrabs(st, dt) {
  const cf = st.crabCfg;
  if (!cf || !st.burrows.length) return;
  st.crabT -= dt;
  const active = st.crabs.filter(c => c.ph !== 'gone').length;
  const prize = st.coins.some(q => q.st === 'rest') || st.stats.stash > 0;
  if (st.crabT <= 0 && active < cf.max && prize && st.phase !== 'won') {
    st.crabT = cf.every * (0.8 + Math.random() * 0.4);
    const b = st.burrows[st.crabNext % st.burrows.length];
    st.crabs.push(tidedigMakeCrab(st, b));
  }
  const surf = tidedigSurf();
  for (let i = st.crabs.length - 1; i >= 0; i--) {
    const cr = st.crabs[i];
    cr.t += dt;
    let v = 0;
    if (cr.ph === 'peek') { if (cr.t > TIDEDIG.crabPeek) { cr.ph = 'out'; cr.t = 0; cr.target = tidedigCrabTarget(st, cr); } }
    else if (cr.ph === 'out') {
      if (!cr.target || (cr.target !== 'stash' && !st.coins.includes(cr.target)) || (cr.target === 'stash' && st.stats.stash <= 0) || (cr.target !== 'stash' && cr.target.st !== 'rest')) cr.target = tidedigCrabTarget(st, cr);
      if (!cr.target) { cr.ph = 'flee'; cr.t = 0; }
      else {
        const tx = cr.target === 'stash' ? st.stashX : cr.target.x, d = tx - cr.x;
        if (Math.abs(d) < 6) { cr.ph = 'grab'; cr.t = 0; }
        else v = Math.sign(d) * TIDEDIG.crabOut;
      }
    } else if (cr.ph === 'grab') {
      const ok = cr.target === 'stash' ? st.stats.stash > 0 : st.coins.includes(cr.target);
      if (!ok) { cr.ph = 'out'; cr.t = 0; cr.target = null; }
      else if (cr.t >= TIDEDIG.crabGrab) {
        if (cr.target === 'stash') { st.stats.stash--; cr.from = 'stash'; tidedigPop(st, st.stashX, surf - 46, 'Hee hee!', '#ffb08a', 14); }
        else { st.coins.splice(st.coins.indexOf(cr.target), 1); cr.from = 'sand'; }
        cr.coin = true; cr.ph = 'home'; cr.t = 0; cr.target = null; Sfx.play('tidedigSnip');
      }
    } else if (cr.ph === 'home' || cr.ph === 'flee') {
      const d = cr.home - cr.x;
      if (Math.abs(d) < 5) {
        if (cr.coin) {
          st.stats.steals++; st.room.steals++;
          tidedigPop(st, cr.x, surf - 44, 'Crab steal! -1', '#ffb08a', 15); Sfx.play('tidedigSteal');
        }
        st.crabs.splice(i, 1);
        if (cr.ph === 'flee') st.crabT = Math.max(st.crabT, 2.5);
        continue;
      }
      v = Math.sign(d) * (cr.ph === 'flee' ? TIDEDIG.crabFlee : TIDEDIG.crabHome);
    }
    if (v) { cr.x += v * dt; cr.dir = Math.sign(v); cr.legs += dt * Math.abs(v) / 6; }
    // hop over open holes
    const h = tidedigHoleAt(st, cr.x);
    cr.hopY = approach(cr.hopY, h && h.depth > 0 ? 12 : 0, dt * 120);
  }
}
// a jump that lands next to a crab scares it (any player)
function tidedigStomps(st) {
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (p.alive && p.grounded && !P.wasG && p.lastVy > 220 && Math.abs(tidedigFeet(p) - tidedigSurf()) < 6) {
      for (const cr of st.crabs) if (cr.shooable() && Math.abs(cr.x - tidedigCx(p)) < TIDEDIG.stompR) tidedigScare(st, cr, p.id, 'Eek! Scuttle!');
    }
    P.wasG = p.grounded;
  }
}
// Captain Polly (gold help): flies to any crab with a coin (or grabbing one) and shoos it
function tidedigPolly(st, dt) {
  const pp = st.polly;
  pp.t += dt; if (pp.sayT > 0) pp.sayT -= dt;
  let tx = pp.home.x, ty = pp.home.y;
  if (st.gold.polly) {
    if (pp.target && (!st.crabs.includes(pp.target) || !pp.target.shooable())) pp.target = null;
    if (!pp.target) pp.target = st.crabs.find(c => c.coin || c.ph === 'grab') || null;
    if (pp.target) {
      tx = pp.target.x; ty = tidedigSurf() - 34;
      if (Math.hypot(tx - pp.x, ty - pp.y) < 24) { tidedigScare(st, pp.target, -1, 'Squawk! Shoo!'); pp.target = null; pp.say = 'Squawk!'; pp.sayT = 1.2; }
    }
  }
  const sp = st.gold.polly && pp.target ? 300 : 140, dx = tx - pp.x, dy = ty - pp.y, d = Math.hypot(dx, dy);
  if (d > 1) { const m = Math.min(d, sp * dt); pp.x += dx / d * m; pp.y += dy / d * m; if (Math.abs(dx) > 2) pp.face = Math.sign(dx); }
}

/* ---------- the big chest (Skull Rock Lagoon): both haul it up on the rope ---------- */
function tidedigStartHaul(st, h) {
  if (st.haul) return;
  const posts = st.posts.length >= 2 ? st.posts.slice(0, 2) : [h.cx - 60, h.cx + 60];
  // whoever stands further left takes the left post
  const ps = G.players, left = tidedigCx(ps[0]) <= tidedigCx(ps[1]) ? 0 : 1;
  const post = []; post[left] = posts[0]; post[1 - left] = posts[1];
  st.haul = { h, prog: 0, post, held: [false, false], t: 0 };
  st.phase = 'haul';
  tidedigNews(st, 'Too heavy! Both hold ' + (cpuSolo() ? 'the action' : 'your action') + ' on a rope post to haul it up!', false, 5);
  st.polly.say = 'Squawk! Here\'s a rope!'; st.polly.sayT = 2.5;
  Sfx.play('tidedigRope');
}
function tidedigHaulStep(st, dt) {
  const hl = st.haul;
  hl.t += dt;
  hl.held = G.players.map(p => p.alive && p.input.act && tidedigOnSurface(p) && Math.abs(tidedigCx(p) - hl.post[p.id]) < 20);
  if (hl.held[0] && hl.held[1]) {
    const was = hl.prog;
    hl.prog = Math.min(1, hl.prog + dt / TIDEDIG.haulT);
    if (Math.floor(was * 6) !== Math.floor(hl.prog * 6)) { Sfx.play('tidedigHeave'); tidedigPop(st, hl.h.cx, tidedigSurf() - 50, 'Heave!', '#ffe9a8', 16); }
  } else if (hl.held[0] !== hl.held[1]) hl.prog = Math.max(0, hl.prog - dt * 0.05);
  hl.h.chest.lift = hl.prog;
  if (hl.prog >= 1) {
    st.phase = 'play'; st.haul = null;
    tidedigOpenChest(st, hl.h);
    tidedigNews(st, 'You hauled the big chest up together!', false, 3);
  }
}

/* ---------- the plan: each player's job right now (hint chips, Polly and the computer all read it) ---------- */
function tidedigJob(k, x, extra) { return Object.assign({ k, x }, extra || {}); }
function tidedigActive(st) {
  const D = G.players[st.digger];
  const inH = tidedigIn(st, D);
  if (inH && !inH.chest.opened) return inH;
  for (const i of st.order) if (!st.holes[i].chest.opened) return st.holes[i];
  return null;
}
function tidedigNearestCoin(st, p) {
  let best = null;
  for (const q of st.coins) { const d = Math.abs(q.x - tidedigCx(p)) + Math.abs(q.y - p.y) * 0.5; if (!best || d < best.d) best = { q, d }; }
  return best && best.q;
}
function tidedigThreat(st) {
  // the most urgent crab: one carrying a coin home, or grabbing one
  let best = null;
  for (const cr of st.crabs) {
    if (!cr.shooable()) continue;
    const u = cr.coin ? Math.abs(cr.home - cr.x) : cr.ph === 'grab' ? 30 : cr.target === 'stash' ? Math.abs(st.stashX - cr.x) + 40 : 9999;
    if (u < 9999 && (!best || u < best.u)) best = { cr, u };
  }
  return best && best.cr;
}
function tidedigPlan(st) {
  const jobs = [null, null];
  const D = G.players[st.digger], B = G.players[st.bailer], h = tidedigActive(st);
  // ----- the digger -----
  const dIn = tidedigIn(st, D);
  if (st.phase === 'haul') jobs[st.digger] = tidedigJob('haul', st.haul.post[st.digger]);
  else if (dIn && (dIn.chest.opened || dIn !== h)) jobs[st.digger] = tidedigJob('climb', h ? h.cx : W / 2, { hole: dIn });
  else if (h && (dIn === h || tidedigAtSpot(st, D, h))) jobs[st.digger] = tidedigJob(h.water >= TIDEDIG.stopW ? 'wait' : 'dig', h.cx, { hole: h });
  else if (tidedigLoose(st)) { const q = tidedigNearestCoin(st, D); jobs[st.digger] = tidedigJob('coins', q.x, { coin: q }); }
  else if (h) jobs[st.digger] = tidedigJob('goX', h.cx, { hole: h });
  else jobs[st.digger] = tidedigJob('idle', D.x);
  // ----- the bailer -----
  const P = st.pl[st.bailer], thr = tidedigThreat(st), wl = st.wall, w = st.wave;
  const wet = st.holes.filter(q => q.depth > 0 && !q.chest.opened && q.water > 0.5).sort((a, b) => (b === h) - (a === h) || b.water - a.water)[0] || null;
  const dumpTo = () => { let best = null; for (const d of st.dumps) { const x = clamp(tidedigCx(B), d.x0 + 14, d.x1 - 14), dd = Math.abs(x - tidedigCx(B)); if (!best || dd < best.dd) best = { d, x: d.kind === 'sea' ? Math.max(x, d.x0 + 18) : x, dd }; } return best; };
  if (st.phase === 'haul') jobs[st.bailer] = tidedigJob('haul', st.haul.post[st.bailer]);
  else if (thr && (thr.coin || thr.ph === 'grab' || Math.abs(thr.x - tidedigCx(B)) < 160)) jobs[st.bailer] = tidedigJob('shoo', thr.x, { crab: thr });
  else if (P.bucket > 0) { const d = dumpTo(); jobs[st.bailer] = tidedigJob('dump', d.x, { dump: d.d }); }
  else if (wet && (wet.water >= 4 || wet === h && !wl)) jobs[st.bailer] = tidedigJob('scoop', wet.cx, { hole: wet });
  else if (wl && wl.lv < TIDEDIG.wallMax && h && (w.ph === 'calm' || w.ph === 'swell')) jobs[st.bailer] = tidedigJob('wall', wl.x);
  else if (wet) jobs[st.bailer] = tidedigJob('scoop', wet.cx, { hole: wet });
  else if (tidedigLoose(st)) { const q = tidedigNearestCoin(st, B); jobs[st.bailer] = tidedigJob('coins', q.x, { coin: q }); }
  else if (thr) jobs[st.bailer] = tidedigJob('shoo', thr.x, { crab: thr });
  else jobs[st.bailer] = tidedigJob('ready', h ? h.cx + (st.seaX > h.cx ? 36 : -36) : B.x, { hole: h });
  return { jobs, h };
}
// the hint line for a job, in that player's own keys
function tidedigSay(st, id, j) {
  const a = tidedigKey(id, 'act'), u = tidedigKey(id, 'up'), o = 1 - id, oc = tidedigCpu(o);
  switch (j.k) {
    case 'dig': return 'Dig! Hold ' + a;
    case 'wait': return oc ? 'Glub! ' + NAMES[o] + ' is bailing the hole' : 'Glub! Too much water: ' + NAMES[o] + ', bail it out!';
    case 'climb': return 'Climb out: hold ' + u;
    case 'goX': return j.hole && j.hole.depth > 0 ? 'Hop into your hole and dig!' : 'Go to the X and dig!';
    case 'coins': return 'Grab the gold coins!';
    case 'haul': return 'Hold ' + a + ' on the rope post!';
    case 'shoo': return j.crab && j.crab.coin ? 'Crab! Shoo it: ' + a + ' next to it' : 'Crab coming! Shoo it: ' + a;
    case 'dump': return j.dump && j.dump.kind === 'pool' ? 'Dump it in the rock pool: ' + a : 'Dump it in the sea ➜ ' + a;
    case 'scoop': return 'Scoop the water: ' + a + ' at the hole';
    case 'wall': return 'Pat a sand wall: hold ' + a;
    case 'ready': return 'Wait by the hole: waves are coming!';
    default: return '';
  }
}

/* ---------- gold help ---------- */
function tidedigHelp(st, pl, dt) {
  const R = st.room, D = G.players[st.digger], h = pl.h;
  // a flood: the digger stuck by water for a while
  const blocked = h && tidedigIn(st, D) === h && h.water >= TIDEDIG.stopW && !h.chest.opened;
  if (blocked) { R.blockedT += dt; if (!h.flooded && R.blockedT >= TIDEDIG.floodT) { h.flooded = true; R.floods++; st.stats.floods++; } }
  else { R.blockedT = 0; if (h) h.flooded = false; }
  if (!st.gold.bucket && R.floods >= TIDEDIG.floodGold) {
    st.gold.bucket = true; tidedigUsed(st, 'Gold bucket');
    tidedigNews(st, 'Gold bucket! Bigger scoops for ' + NAMES[st.bailer] + ', and no slow-down', true, 4.5); Sfx.play('tidedigGold');
  }
  if (!st.gold.polly && R.steals >= TIDEDIG.stealGold) {
    st.gold.polly = true; tidedigUsed(st, 'Captain Polly');
    tidedigNews(st, 'Captain Polly the parrot will chase the crabs!', true, 4.5); Sfx.play('tidedigGold');
    st.polly.say = 'Squawk! Leave it to me!'; st.polly.sayT = 2.5;
  }
  if (!st.gold.shovel && st.roomT >= TIDEDIG.shovelAfter && tidedigOpenLeft(st).length && R.strokes > 4) {
    st.gold.shovel = true; tidedigUsed(st, 'Gold shovel');
    tidedigNews(st, 'Gold shovel! ' + NAMES[st.digger] + ' digs faster now', true, 4.5); Sfx.play('tidedigGold');
  }
}

/* ---------- the tick ---------- */
function tidedigWin(st) {
  st.phase = 'won'; st.winT = 0;
  st.stats.roomT[st.k] = st.roomT;
  Sfx.play('tidedigRoom'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
  for (let i = 0; i < 40; i++) confetti(st.stashX, tidedigSurf() - 20);
  st.polly.say = G.level.def.roomIndex >= G.level.def.roomCount - 1 ? 'Squawk! Rich pirates!' : 'Squawk! Well dug!'; st.polly.sayT = 2;
}
function tidedigPre(st, dt) {
  if (st.phase === 'won') {
    st.winT += dt; st.winTick++;
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; p.input.left = p.input.right = p.input.jump = false; }
    if (st.winT < 1.0 && st.winTick % 14 === 0) confetti(st.stashX, tidedigSurf() - 20);
    if (st.winT >= TIDEDIG.winHold) { const L = G.level; if (L.def.roomIndex < L.def.roomCount - 1) nextRoom(); else levelClear(); }
    return;
  }
  for (const p of G.players) {
    const P = st.pl[p.id];
    P.strokeCD -= dt; P.popCD -= dt; if (P.anim > 0) P.anim -= dt; if (P.act > 0) P.act -= dt;
    if (!p.alive) continue;
    // the digger climbs out of a hole with ▲ / jump held, and pops out sideways at the top
    const h = p.id === st.digger ? tidedigIn(st, p) : null;
    if (h && (p.input.jump || p.input.up) && st.phase !== 'won') {
      p.vy = Math.min(p.vy, -TIDEDIG.climbV); p.jumping = false;
      if (tidedigFeet(p) < tidedigSurf() + 12 && P.popCD <= 0) {
        const dir = p.input.right ? 1 : p.input.left ? -1 : (p.face || 1);
        p.vy = -TIDEDIG.popV; p.vx = dir * TIDEDIG.popVx; p.carryVx = dir * TIDEDIG.popVx; P.popCD = 0.5; p.face = dir;
        tidedigSand(st, tidedigCx(p), tidedigSurf(), 4, dir);
      }
    }
  }
}
function tidedigStep(st, dt) {
  if (st.phase === 'won') return;
  const intro = G.introT > 0;
  st.roomT += dt; st.stepT += dt;
  for (const p of G.players) {
    const P = st.pl[p.id];
    // a full bucket is heavy
    if (p.id === st.bailer && P.bucket > 0 && !st.gold.bucket) p.vx = clamp(p.vx, -TIDEDIG.carryMax, TIDEDIG.carryMax);
    // water floats the digger up
    const h = p.id === st.digger ? tidedigIn(st, p) : null;
    if (h && h.water > 0) {
      const fy = tidedigWaterTop(h) + TIDEDIG.floatSub;
      if (tidedigFeet(p) > fy && fy < tidedigBottom(h)) { p.y = fy - p.h; p.vy = Math.min(p.vy, 0); p.grounded = true; }
    }
    if (!intro) tidedigAct(st, p); else p.pendingAct = false;
  }
  tidedigStomps(st);
  if (!intro) { tidedigWaves(st, dt); tidedigCrabs(st, dt); }
  tidedigCoins(st, dt);
  tidedigPolly(st, dt);
  if (st.phase === 'haul') tidedigHaulStep(st, dt);
  for (const h of st.holes) { h.pourFx = Math.max(0, h.pourFx - dt * 1.4); if (h.chest.opened && h.chest.open < 1) h.chest.open = Math.min(1, h.chest.open + dt * 3); }
  if (st.wall) st.wall.anim = Math.max(0, st.wall.anim - dt * 2);
  const pl = tidedigPlan(st);
  // a job change restarts the hint chip timer
  const key = pl.jobs.map(j => j ? j.k : '').join('/');
  if (key !== st.jobKeyAll) { st.jobKeyAll = key; st.stepT = 0; }
  if (!intro) tidedigHelp(st, pl, dt);
  // done: every chest open, no coin loose, no crab with a coin
  if (st.phase === 'play' && !tidedigOpenLeft(st).length && !st.coins.length && !st.crabs.some(c => c.coin)) tidedigWin(st);
  st.pops = st.pops.filter(q => (q.t += dt) < 1.3);
  for (let i = st.parts.length - 1; i >= 0; i--) { const q = st.parts[i]; if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; } q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
  if (st.news) { st.news.t += dt; if (st.news.t > st.news.life) st.news = null; }
  if ((G.tickN || 0) % 60 === 0) tidedigActLabels(st);
}

/* ---------- drawing ---------- */
let tidedigBackCache = null;
const TIDEDIG_SAND = ['#f6dc9a', '#ecca80', '#e0b96c', '#d3a75c', '#c79a52', '#b98c49', '#ab7f42'];
function tidedigPalm(c, x, y, h, lean, t) {
  // a curvy palm trunk with rings and a crown of leaves, coconuts under them
  const tx = x + lean, ty = y - h;
  c.strokeStyle = '#8a5a32'; c.lineWidth = 12; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * 0.2, y - h * 0.55, tx, ty); c.stroke();
  c.strokeStyle = '#a8703e'; c.lineWidth = 2;
  for (let k = 0.12; k < 1; k += 0.11) {
    const px = x + (tx - x) * k + lean * 0.2 * Math.sin(k * Math.PI) * 0.5, py = y - h * k;
    c.beginPath(); c.moveTo(px - 6, py); c.lineTo(px + 6, py - 2); c.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55 + Math.sin((t || 0) + i) * 0.02, len = 52 + (i % 2) * 10;
    const ex = tx + Math.cos(a) * len * 1.2, ey = ty + Math.sin(a) * len * 0.5 + 22;
    c.fillStyle = i % 2 ? '#3fae5a' : '#2f9a4c';
    c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo((tx + ex) / 2, ty - 26 + Math.abs(i - 2.5) * 6, ex, ey);
    c.quadraticCurveTo((tx + ex) / 2, ty - 8, tx, ty + 4); c.fill();
  }
  c.fillStyle = '#6b4a28'; for (const [dx, dy] of [[-5, 6], [5, 7], [0, 11]]) { c.beginPath(); c.arc(tx + dx, ty + dy, 5, 0, Math.PI * 2); c.fill(); }
}
function tidedigRockBlob(c, x, y, w, h, col, dark) {
  c.fillStyle = dark; c.beginPath(); c.ellipse(x, y + 3, w / 2, h / 2, 0, Math.PI, 0); c.fill();
  c.fillStyle = col; c.beginPath(); c.ellipse(x, y, w / 2, h / 2, 0, Math.PI, 0); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.14)'; c.beginPath(); c.ellipse(x - w * 0.15, y - h * 0.28, w * 0.18, h * 0.1, -0.3, 0, Math.PI * 2); c.fill();
}
function tidedigPaintBack(c, st) {
  const g = G.level.grid, S = TIDEDIG.S, surf = tidedigSurf();
  // the sky
  const sky = c.createLinearGradient(0, 0, 0, surf); sky.addColorStop(0, C.skyTop); sky.addColorStop(1, C.skyBot);
  c.fillStyle = sky; c.fillRect(0, 0, W, surf + 10);
  c.fillStyle = C.sunGlow; c.beginPath(); c.arc(640, 112, 58, 0, Math.PI * 2); c.fill();
  c.fillStyle = C.sun; c.beginPath(); c.arc(640, 112, 36, 0, Math.PI * 2); c.fill();
  // the far sea and its horizon
  const hz = 196;
  const sea = c.createLinearGradient(0, hz, 0, surf); sea.addColorStop(0, '#2fb6d8'); sea.addColorStop(1, '#6fdbe0');
  c.fillStyle = sea; c.fillRect(0, hz, W, surf - hz + 10);
  c.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 26; i++) { const x = (i * 137) % W, y = hz + 8 + (i * 29) % (surf - hz - 14); c.fillRect(x, y, 14 + (i % 3) * 6, 2); }
  // a little island with a palm, and a friendly pirate ship far away (smiley flag)
  c.fillStyle = '#e9cf8f'; c.beginPath(); c.ellipse(170, hz + 4, 70, 12, 0, Math.PI, 0); c.fill();
  c.fillStyle = '#5fbf6a'; c.beginPath(); c.ellipse(170, hz - 6, 40, 12, 0, Math.PI, 0); c.fill();
  c.strokeStyle = '#8a5a32'; c.lineWidth = 3; c.beginPath(); c.moveTo(186, hz - 6); c.quadraticCurveTo(190, hz - 26, 198, hz - 38); c.stroke();
  c.fillStyle = '#3fae5a'; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(198 + Math.cos(i * 1.6) * 10, hz - 40 + Math.sin(i * 1.6) * 4, 12, 4, i * 0.8, 0, Math.PI * 2); c.fill(); }
  const sx = 560, sy = hz + 2;
  c.fillStyle = '#7a4a28'; c.beginPath(); c.moveTo(sx - 40, sy - 12); c.lineTo(sx + 40, sy - 12); c.lineTo(sx + 30, sy); c.lineTo(sx - 30, sy); c.closePath(); c.fill();
  c.strokeStyle = '#5a3418'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(sx, sy - 12); c.lineTo(sx, sy - 60); c.stroke();
  c.fillStyle = '#fff6e0'; c.beginPath(); c.moveTo(sx + 2, sy - 56); c.quadraticCurveTo(sx + 26, sy - 40, sx + 2, sy - 18); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(sx - 2, sy - 50); c.quadraticCurveTo(sx - 20, sy - 36, sx - 2, sy - 20); c.closePath(); c.fill();
  c.fillStyle = '#2a2a3a'; c.fillRect(sx, sy - 70, 14, 9);
  c.fillStyle = '#fff'; c.beginPath(); c.arc(sx + 7, sy - 66, 2.6, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#2a2a3a'; c.lineWidth = 1; c.beginPath(); c.arc(sx + 7, sy - 66.5, 1.4, 0.2, Math.PI - 0.2); c.stroke();
  // room scenery behind the beach
  tidedigPaintDeco(c, st);
  // the sand, cut away: layers get darker deeper down, with shells and pebbles
  for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) {
    if (g[r][cc] !== '#' && !(r >= S && st.holes.some(h => h.c === cc))) continue;
    const x = cc * T, y = r * T, hh = hash(cc, r);
    if (tidedigIsRock(st, cc, r)) {
      if (r < S) continue;   // (rocks above the beach are drawn as one big rock in tidedigPaintDeco)
      c.fillStyle = r >= 16 ? '#8a6a4c' : '#9a8a7a'; c.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
      c.fillStyle = r >= 16 ? '#6e5238' : '#7a6c60';
      c.beginPath(); c.ellipse(x + 8 + hh % 14, y + 9 + (hh >> 3) % 12, 7, 4, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x + 3, y + 3, T - 8, 2);
      continue;
    }
    const k = clamp(r - S, 0, TIDEDIG_SAND.length - 1);
    c.fillStyle = TIDEDIG_SAND[k]; c.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    c.fillStyle = 'rgba(150,100,40,0.22)';
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x + 3 + ((hh >> (i * 3)) % 24), y + 4 + ((hh >> (i * 4 + 2)) % 22), 1.3, 0, Math.PI * 2); c.fill(); }
    if (hh % 11 === 0 && r > S) { c.fillStyle = '#fff1e0'; c.beginPath(); c.arc(x + 15, y + 15, 4, Math.PI, 0); c.fill(); c.fillStyle = '#f2b8a0'; c.fillRect(x + 11, y + 15, 8, 1.5); }
    if (hh % 13 === 3 && r > S + 1) { c.fillStyle = '#a89c90'; c.beginPath(); c.ellipse(x + 10, y + 20, 4, 3, 0.3, 0, Math.PI * 2); c.fill(); }
    if (hh % 17 === 5 && r > S + 2) {
      // a little starfish fossil
      c.fillStyle = 'rgba(255,170,110,0.5)'; c.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? 2.4 : 6; c.lineTo(x + 18 + Math.cos(a) * rr2, y + 12 + Math.sin(a) * rr2); }
      c.closePath(); c.fill();
    }
  }
  // strata lines across the cut face
  c.strokeStyle = 'rgba(140,90,30,0.18)'; c.lineWidth = 2;
  for (let r = S + 1; r < 16; r++) { c.beginPath(); for (let x = 0; x <= st.seaX; x += 20) c.lineTo(x, r * T + Math.sin(x * 0.03 + r) * 3); c.stroke(); }
  // the bright dry top of the beach
  for (let cc = 0; cc < COLS; cc++) {
    if (g[S][cc] !== '#' || tidedigIsRock(st, cc, S)) continue;
    c.fillStyle = '#fff0c0'; c.fillRect(cc * T, surf, T, 4);
  }
  // the cut face edge under the beach (a soft shadow line, so it reads as a cross-section)
  c.fillStyle = 'rgba(90,60,20,0.18)'; c.fillRect(0, surf + 4, st.seaX, 3);
  // rock pools
  for (const d of st.dumps) {
    if (d.kind !== 'pool') continue;
    const x0 = d.pa * T + 2, x1 = (d.pb + 1) * T - 2, mx = (x0 + x1) / 2, rw = (x1 - x0) / 2;
    c.fillStyle = '#c99a58'; c.beginPath(); c.ellipse(mx, surf + 1, rw + 6, 13, 0, 0, Math.PI); c.fill();
    const pg = c.createLinearGradient(0, surf, 0, surf + 12); pg.addColorStop(0, '#5fd6ee'); pg.addColorStop(1, '#2aa3c9');
    c.fillStyle = pg; c.beginPath(); c.ellipse(mx, surf + 1, rw, 10, 0, 0, Math.PI); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(mx - rw * 0.6, surf + 2, rw * 0.5, 1.5); c.fillRect(mx + 4, surf + 5, rw * 0.3, 1.5);
    tidedigRockBlob(c, x0 - 2, surf + 2, 22, 16, '#9a8a7a', '#5a4c40'); tidedigRockBlob(c, x1 + 2, surf + 2, 18, 12, '#8a7a6c', '#5a4c40');
    // a starfish and a tiny weed in the pool
    c.fillStyle = '#ff8a5a'; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r2 = i % 2 ? 2 : 5; c.lineTo(mx + 6 + Math.cos(a) * r2, surf + 6 + Math.sin(a) * r2 * 0.6); }
    c.closePath(); c.fill();
    c.strokeStyle = '#3fae5a'; c.lineWidth = 2; c.beginPath(); c.moveTo(mx - 12, surf + 8); c.quadraticCurveTo(mx - 16, surf + 1, mx - 11, surf - 5); c.stroke();
  }
}
function tidedigPaintDeco(c, st) {
  const surf = tidedigSurf();
  if (st.style === 'cove' || st.style === 'pools') {
    tidedigPalm(c, 70, surf + 2, 170, 36, 0);
    tidedigPalm(c, 640, surf + 2, 130, -26, 1);
  }
  // the rocks above the beach (crab homes): one big rock, or Skull Rock
  let rc0 = 99, rc1 = -1, rr0 = 99;
  for (const i of st.rock) { const r = Math.floor(i / COLS), cc = i % COLS; if (r >= TIDEDIG.S) continue; rc0 = Math.min(rc0, cc); rc1 = Math.max(rc1, cc); rr0 = Math.min(rr0, r); }
  if (rc1 >= 0 && st.style !== 'skull') {
    const bx = (rc0 + rc1 + 1) * T / 2, bw = (rc1 - rc0 + 1) * T + 50, bh = (TIDEDIG.S - rr0) * T * 2 + 20;
    tidedigRockBlob(c, bx, surf + 2, bw, bh, '#9a8a7a', '#6e6054');
    tidedigRockBlob(c, bx + bw * 0.3, surf + 2, bw * 0.5, bh * 0.45, '#8a7a6c', '#5e5246');
    c.fillStyle = '#3fae5a'; c.beginPath(); c.ellipse(bx - 6, surf - bh / 2 + 6, 16, 5, 0.2, 0, Math.PI * 2); c.fill();
  }
  if (st.style === 'wreck') {
    tidedigPalm(c, 60, surf + 2, 160, 30, 0);
    // an old friendly shipwreck half in the sand: ribs, a broken mast with a patched flag
    c.strokeStyle = '#7a4a28'; c.lineWidth = 10; c.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const x = 380 + i * 36, h2 = 60 + Math.sin(i * 1.3) * 16 + (i === 2 || i === 3 ? 26 : 0);
      c.beginPath(); c.moveTo(x, surf + 4); c.quadraticCurveTo(x + (i < 3 ? -18 : 18), surf - h2 * 0.6, x + (i < 3 ? -8 : 8), surf - h2); c.stroke();
    }
    c.strokeStyle = '#9a6238'; c.lineWidth = 6; c.beginPath(); c.moveTo(366, surf - 40); c.lineTo(574, surf - 46); c.stroke();
    c.strokeStyle = '#6b4024'; c.lineWidth = 8; c.beginPath(); c.moveTo(600, surf + 4); c.lineTo(640, surf - 150); c.stroke();
    c.fillStyle = '#fff6e0'; c.beginPath(); c.moveTo(636, surf - 140); c.lineTo(690, surf - 128); c.lineTo(632, surf - 100); c.closePath(); c.fill();
    c.fillStyle = '#ffb36b'; c.fillRect(650, surf - 128, 12, 10);
  }
  if (st.style === 'skull') {
    tidedigPalm(c, 700, surf + 2, 120, -20, 1);
    // Skull Rock: a big round friendly rock with a smiley face (and a bandana)
    const x = 70, y = surf - 88;
    c.fillStyle = '#b8b0a4'; c.beginPath(); c.ellipse(x, y, 92, 104, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#9a9286'; c.beginPath(); c.ellipse(x + 20, y + 30, 70, 70, 0, 0, Math.PI); c.fill();
    c.fillStyle = '#e8473a'; c.beginPath(); c.ellipse(x, y - 70, 80, 26, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x - 50 + i * 25, y - 78, 3, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#4a4440';
    c.beginPath(); c.ellipse(x - 30, y - 20, 16, 20, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(x + 30, y - 20, 16, 20, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x - 26, y - 26, 5, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(x + 34, y - 26, 5, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#4a4440'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.arc(x, y + 12, 32, 0.3, Math.PI - 0.3); c.stroke();
    c.fillStyle = 'rgba(255,140,150,0.4)'; c.beginPath(); c.arc(x - 52, y + 8, 9, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(x + 52, y + 8, 9, 0, Math.PI * 2); c.fill();
  }
  // small rocks by the crab burrows
  for (const b of st.burrows) tidedigRockBlob(c, b.x + b.side * 16, surf + 2, 44, 30, '#9a8a7a', '#6e6054');
}
function tidedigDrawBack(st) {
  const L = G.level, cw = canvas.width, ch = canvas.height;
  try {
    if (!tidedigBackCache || tidedigBackCache.L !== L || tidedigBackCache.cv.width !== cw || tidedigBackCache.cv.height !== ch) {
      const cv = (tidedigBackCache && tidedigBackCache.cv) || document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      const c = cv.getContext('2d');
      c.setTransform(cw / W, 0, 0, ch / H, 0, 0); c.clearRect(0, 0, W, H);
      tidedigPaintBack(c, st);
      tidedigBackCache = { cv, L };
    }
    ctx.drawImage(tidedigBackCache.cv, 0, 0, W, H);
  } catch (e) { tidedigBackCache = null; tidedigPaintBack(ctx, st); }
}
function tidedigCloudsDraw(t) {
  for (let i = 0; i < 4; i++) {
    const x = ((i * 260 + t * (5 + i * 2)) % (W + 200)) - 100, y = 70 + (i * 47) % 90;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.arc(x + 20, y - 8, 20, 0, Math.PI * 2); ctx.arc(x + 42, y, 15, 0, Math.PI * 2); ctx.rect(x, y, 42, 15); ctx.fill();
  }
}
function tidedigDrawSea(st, t) {
  const surf = tidedigSurf(), x0 = st.seaX, w = st.wave;
  // the near sea on the right, rising a little as a wave swells
  const lvl = surf + 8 - w.swell * 10 - (w.big ? w.swell * 8 : 0);
  const g = ctx.createLinearGradient(0, lvl, 0, surf + T + 4); g.addColorStop(0, '#45cde0'); g.addColorStop(1, '#2aa3c9');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x0 - 6, surf + T + 4);
  for (let x = x0 - 6; x <= W; x += 10) ctx.lineTo(x, lvl + Math.sin(t * 2 + x * 0.05) * 2.5);
  ctx.lineTo(W, surf + T + 4); ctx.closePath(); ctx.fill();
  // the swell: a curling wave hump rolling in
  if (w.swell > 0.02) {
    const hx = x0 + 110 - (w.ph === 'rush' ? 0 : 0), hh = (w.big ? 46 : 30) * w.swell;
    ctx.fillStyle = '#3cc3dc';
    ctx.beginPath(); ctx.moveTo(x0 - 6, lvl + 2);
    ctx.quadraticCurveTo(hx - 30, lvl - hh * 1.1, hx + 10, lvl - hh); ctx.quadraticCurveTo(hx + 40, lvl - hh * 0.9, hx + 30, lvl - hh * 0.4);
    ctx.quadraticCurveTo(hx + 80, lvl, W, lvl + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(hx - 10 + i * 8, lvl - hh + 2 + Math.sin(t * 6 + i) * 1.5, 4.5 - i * 0.4, 0, Math.PI * 2); ctx.fill(); }
  }
  // the seabed under the near sea
  ctx.fillStyle = '#e8c57a'; ctx.fillRect(x0, surf + T, W - x0, 6);
  // sparkles
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 6; i++) { const x = x0 + 12 + ((i * 53 + t * 14) % (W - x0 - 20)); ctx.fillRect(x, lvl + 8 + (i % 3) * 5, 8, 1.5); }
  // the tide line: wet sand where the waves reach
  const reach = tidedigWaveCfg(st).reach;
  ctx.fillStyle = 'rgba(160,120,60,0.22)'; ctx.fillRect(reach, surf, x0 - reach, 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]);
  ctx.beginPath(); ctx.moveTo(reach, surf - 1); ctx.lineTo(reach, surf + 10); ctx.stroke(); ctx.setLineDash([]);
  // the wave running up the beach: a foamy tongue of water
  if (w.ph === 'rush' || w.ph === 'hold' || w.ph === 'back') {
    const fx = w.front, th = w.big ? 16 : 11;
    const fg = ctx.createLinearGradient(fx, 0, x0, 0); fg.addColorStop(0, 'rgba(120,220,235,0.75)'); fg.addColorStop(1, 'rgba(60,195,220,0.9)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.moveTo(x0, surf + 4); ctx.lineTo(x0, surf - th);
    for (let x = x0; x >= fx; x -= 12) ctx.lineTo(x, surf - th * (0.55 + 0.45 * Math.sin((x - fx) / 60 + t * 3)) * clamp((x - fx) / 40, 0.3, 1));
    ctx.lineTo(fx, surf + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(fx + 4 + i * 7, surf - 2 - Math.abs(Math.sin(t * 5 + i)) * 4, 4.2 - i * 0.4, 0, Math.PI * 2); ctx.fill(); }
  }
}
function tidedigDrawChest(x, y, open, big, alpha, lift) {
  // a wooden pirate chest with gold bands; open > 0 lifts the lid and shows the gold
  const w = big ? 40 : 26, h = big ? 24 : 18;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y);
  if (open > 0) {
    // the lid tipped open behind the box (standing up over its back edge)
    const lh = 12 + open * 4;
    ctx.save(); ctx.translate(0, -h + 2); ctx.rotate(-0.22 * open);
    ctx.fillStyle = '#5f3418'; rr(-w / 2 - 1, -lh - 1, w + 2, lh + 2, 5); ctx.fill();
    ctx.fillStyle = '#8a4e26'; rr(-w / 2, -lh, w, lh, 5); ctx.fill();
    ctx.fillStyle = C.gold; ctx.fillRect(-w / 2 + 4, -lh, 4, lh); ctx.fillRect(w / 2 - 8, -lh, 4, lh);
    ctx.restore();
  }
  ctx.fillStyle = '#5f3418'; rr(-w / 2 - 1, -h - 1, w + 2, h + 2, 4); ctx.fill();
  ctx.fillStyle = '#9a5a2e'; rr(-w / 2, -h, w, h, 3); ctx.fill();
  ctx.fillStyle = '#b06c38'; ctx.fillRect(-w / 2 + 2, -h + 3, w - 4, 3);
  ctx.fillStyle = C.gold; ctx.fillRect(-w / 2 + 4, -h, 4, h); ctx.fillRect(w / 2 - 8, -h, 4, h);
  if (open > 0) {
    // gold heaped inside and the lid tipped back
    ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(0, -h, w / 2 - 2, 6 + open * 3, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff3b0'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-w / 3 + i * w / 5, -h - 3, 1.6, 0, Math.PI * 2); ctx.fill(); }
  } else {
    ctx.fillStyle = '#8a4e26'; ctx.beginPath(); ctx.moveTo(-w / 2, -h); ctx.quadraticCurveTo(0, -h - 14, w / 2, -h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.gold; ctx.fillRect(-w / 2 + 4, -h - 6, 4, 6); ctx.fillRect(w / 2 - 8, -h - 6, 4, 6);
    ctx.fillStyle = '#ffe9a8'; rr(-4, -h - 4, 8, 8, 2); ctx.fill(); ctx.fillStyle = '#5f3418'; ctx.fillRect(-1, -h - 1, 2, 3);
  }
  if (lift) { ctx.strokeStyle = C.rope; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-w / 2 + 3, -h); ctx.lineTo(0, -h - 20); ctx.lineTo(w / 2 - 3, -h); ctx.stroke(); }
  ctx.restore();
}
function tidedigDrawHoles(st, t) {
  const surf = tidedigSurf();
  for (const h of st.holes) {
    const x = h.c * T, ch = h.chest, bot = tidedigBottom(h);
    // the hole: dug tiles are shady sand with scooped walls
    if (h.depth > 0) {
      const gr = ctx.createLinearGradient(0, surf, 0, bot); gr.addColorStop(0, '#c99a58'); gr.addColorStop(1, '#8f6532');
      ctx.fillStyle = gr; ctx.fillRect(x, surf, T, bot - surf);
      ctx.fillStyle = 'rgba(70,40,10,0.25)'; ctx.fillRect(x, surf, 4, bot - surf); ctx.fillRect(x + T - 4, surf, 4, bot - surf);
      ctx.strokeStyle = 'rgba(90,55,20,0.22)'; ctx.lineWidth = 1.5;
      for (let y = surf + 10; y < bot - 4; y += 12) { ctx.beginPath(); ctx.arc(x + 15 + Math.sin(y) * 5, y, 6, 0.2, Math.PI - 0.2); ctx.stroke(); }
      // shovel marks around the mouth
      ctx.fillStyle = '#e0b96c'; ctx.fillRect(x - 3, surf, 3, 6); ctx.fillRect(x + T, surf, 3, 6);
    }
    // the next tile, scooped part way
    if (!ch.opened && h.depth < ch.depth && h.prog > 0) {
      const d = Math.round(h.prog * 22);
      ctx.fillStyle = '#9a6d36'; ctx.beginPath(); ctx.ellipse(x + 15, bot, 13, d * 0.6 + 1, 0, 0, Math.PI); ctx.fill();
    }
    // the chest under it (seen through the cut-away sand until it's dug to)
    const cy = surf + (ch.depth + 1) * T - 2 - (ch.lift || 0) * (ch.depth + 0.3) * T;
    const reached = h.depth >= ch.depth;
    if (!(ch.opened && ch.haul)) tidedigDrawChest(h.cx, cy, ch.open, ch.big, reached || ch.opened ? 1 : 0.55, ch.lift > 0 && !ch.opened);
    if (!reached && !ch.opened) {
      ctx.fillStyle = 'rgba(214,173,98,0.35)'; ctx.fillRect(h.cx - 22, cy - 26, 44, 28);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '700 12px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', h.cx + (ch.big ? 26 : 20), cy - 18 + Math.sin(t * 3) * 2);
    }
    // gold shine up the hole when it opens
    if (ch.opened && ch.open < 1 && !ch.haul) {
      ctx.fillStyle = 'rgba(255,230,120,' + (0.5 * (1 - ch.open)) + ')'; ctx.fillRect(x + 4, surf - 40, T - 8, bot - surf + 40);
    }
    // water in the hole
    if (h.water > 0.3 && h.depth > 0) {
      const wt = tidedigWaterTop(h);
      ctx.fillStyle = 'rgba(64,190,220,0.62)'; ctx.fillRect(x + 1, wt, T - 2, bot - wt);
      ctx.fillStyle = 'rgba(220,250,255,0.85)';
      ctx.beginPath(); ctx.moveTo(x + 1, wt + 3); for (let i = 0; i <= 5; i++) ctx.lineTo(x + 1 + i * 5.6, wt + Math.sin(t * 4 + i) * 1.5); ctx.lineTo(x + T - 1, wt + 3); ctx.closePath(); ctx.fill();
    }
    // a stream of water pouring in from a wave
    if (h.pourFx > 0) {
      ctx.fillStyle = 'rgba(120,220,240,' + (0.75 * h.pourFx) + ')';
      ctx.beginPath(); ctx.moveTo(x + T, surf - 4); ctx.quadraticCurveTo(x + 18, surf + 6, x + 12, Math.min(bot, surf + (1 - h.pourFx) * 120 + 20)); ctx.lineTo(x + 6, Math.min(bot, surf + 20)); ctx.quadraticCurveTo(x + 10, surf, x + T - 4, surf - 6); ctx.closePath(); ctx.fill();
    }
    // the X on the sand before digging starts
    if (h.depth === 0 && !ch.opened) {
      const k = 0.85 + 0.15 * Math.sin(t * 3);
      ctx.strokeStyle = '#d63a2c'; ctx.lineWidth = 5 * k; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(h.cx - 10, surf - 3); ctx.lineTo(h.cx + 10, surf + 5); ctx.moveTo(h.cx + 10, surf - 3); ctx.lineTo(h.cx - 10, surf + 5); ctx.stroke();
      ctx.strokeStyle = 'rgba(214,58,44,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.ellipse(h.cx, surf + 1, 20, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    // the sand pile beside the hole (on the land side)
    if (h.pile > 0) {
      const side = st.seaX > h.cx ? -1 : 1, px = h.cx + side * 34, ph = 6 + h.pile * 4, pw = 16 + h.pile * 4;
      ctx.fillStyle = '#e8c57a'; ctx.beginPath(); ctx.ellipse(px, surf + 1, pw, ph, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#f6dc9a'; ctx.beginPath(); ctx.ellipse(px - 3, surf - ph * 0.45, pw * 0.4, ph * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // the haul ropes
  if (st.haul) {
    const hl = st.haul, h = hl.h, cy = surf + (h.chest.depth + 1) * T - 2 - hl.prog * (h.chest.depth + 0.3) * T - (h.chest.big ? 44 : 34);
    for (let k = 0; k < 2; k++) {
      const px = hl.post[k];
      ctx.strokeStyle = hl.held[k] ? '#ffe9a8' : C.rope; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px, surf - 34); ctx.quadraticCurveTo((px + h.cx) / 2, surf - 46, h.cx, Math.max(surf - 40, cy)); ctx.lineTo(h.cx, cy); ctx.stroke();
    }
  }
}
function tidedigDrawWall(st, t) {
  const wl = st.wall;
  if (!wl) return;
  const surf = tidedigSurf(), x = wl.x;
  // the spot: a little flag and a dotted mound outline
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
  ctx.beginPath(); ctx.ellipse(x, surf + 1, 26, 22, 0, Math.PI, 0); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = '#7a5228'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 30, surf); ctx.lineTo(x - 30, surf - 34); ctx.stroke();
  ctx.fillStyle = '#5bc8ff'; ctx.beginPath(); ctx.moveTo(x - 29, surf - 34); ctx.lineTo(x - 14, surf - 29); ctx.lineTo(x - 29, surf - 24); ctx.closePath(); ctx.fill();
  const lv = wl.lv + wl.prog * 0.9;
  if (lv > 0.02) {
    const hh = 6 + lv * 9, wob = wl.anim > 0 ? Math.sin(t * 40) * wl.anim * 2 : 0;
    ctx.fillStyle = '#d9b46a'; ctx.beginPath(); ctx.ellipse(x + wob, surf + 2, 26, hh + 2, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ecca80'; ctx.beginPath(); ctx.ellipse(x + wob, surf + 1, 24, hh, 0, Math.PI, 0); ctx.fill();
    // pat marks and a tiny castle tower on a full wall
    ctx.fillStyle = 'rgba(160,110,50,0.3)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x - 10 + i * 10 + wob, surf - hh * 0.5, 3, 0, Math.PI * 2); ctx.fill(); }
    if (wl.lv >= 2) { ctx.fillStyle = '#e0b96c'; ctx.fillRect(x - 6 + wob, surf - hh - 12, 12, 13); ctx.fillRect(x - 8 + wob, surf - hh - 15, 4, 4); ctx.fillRect(x - 2 + wob, surf - hh - 15, 4, 4); ctx.fillRect(x + 4 + wob, surf - hh - 15, 4, 4); }
  }
}
function tidedigDrawStash(st, t) {
  const surf = tidedigSurf(), x = st.stashX, n = st.stats.stash;
  // the treasure blanket (red and white checks) with a heap of coins and a little flag
  ctx.fillStyle = '#e8473a'; ctx.beginPath(); ctx.moveTo(x - 40, surf); ctx.lineTo(x + 40, surf); ctx.lineTo(x + 34, surf - 6); ctx.lineTo(x - 34, surf - 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++) ctx.fillRect(x - 34 + i * 12, surf - 6, 6, 3), ctx.fillRect(x - 28 + i * 12, surf - 3, 6, 3);
  if (n > 0) {
    // a heap of coins: rows of little coins, narrower toward the top (one coin per 3 saved, up to 30)
    const k = Math.min(30, Math.ceil(n / 3));
    let i = 0;
    for (let row = 0; i < k; row++) {
      const per = Math.max(1, 7 - row), y = surf - 9 - row * 5.5;
      for (let c = 0; c < per && i < k; c++, i++) {
        const cx = x + (c - (per - 1) / 2) * 8 + (row % 2) * 1.5;
        ctx.fillStyle = '#b9850f'; ctx.beginPath(); ctx.ellipse(cx, y + 1.2, 5, 3.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffc53d'; ctx.beginPath(); ctx.ellipse(cx, y, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff1a8'; ctx.beginPath(); ctx.ellipse(cx - 1, y - 0.6, 2, 1, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (!reduceMotion) { const q = (t * 0.6) % 1; ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * Math.sin(q * Math.PI)) + ')'; const sx = x - 14 + q * 28, sy = surf - 14 - Math.sin(q * Math.PI) * 6; ctx.beginPath(); ctx.moveTo(sx, sy - 4); ctx.lineTo(sx + 1.2, sy - 1.2); ctx.lineTo(sx + 4, sy); ctx.lineTo(sx + 1.2, sy + 1.2); ctx.lineTo(sx, sy + 4); ctx.lineTo(sx - 1.2, sy + 1.2); ctx.lineTo(sx - 4, sy); ctx.lineTo(sx - 1.2, sy - 1.2); ctx.closePath(); ctx.fill(); }
  }
  ctx.strokeStyle = '#7a5228'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + 36, surf); ctx.lineTo(x + 36, surf - 50); ctx.stroke();
  ctx.fillStyle = '#2a2a3a'; ctx.fillRect(x + 37, surf - 50, 22, 14);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 48, surf - 44, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a2a3a'; ctx.beginPath(); ctx.arc(x + 46.5, surf - 45, 0.9, 0, Math.PI * 2); ctx.arc(x + 49.5, surf - 45, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + 48, surf - 44, 2, 0.3, Math.PI - 0.3); ctx.stroke();
  // the count on a little sign
  ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
  const s = String(n), tw = ctx.measureText(s).width + 14;
  ctx.fillStyle = 'rgba(28,26,54,0.75)'; rr(x - tw / 2, surf + 10, tw, 18, 9); ctx.fill();
  ctx.fillStyle = C.gold; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, surf + 19.5);
}
function tidedigCoin(x, y, spin, s) {
  const k = Math.abs(Math.cos(spin)) * 0.8 + 0.2, r = TIDEDIG.coinR * (s || 1);
  ctx.fillStyle = '#b9850f'; ctx.beginPath(); ctx.ellipse(x, y + 1, r * k + 0.5, r + 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffc53d'; ctx.beginPath(); ctx.ellipse(x, y, r * k, r, 0, 0, Math.PI * 2); ctx.fill();
  if (k > 0.5) { ctx.fillStyle = '#fff1a8'; ctx.beginPath(); ctx.ellipse(x, y, r * k * 0.45, r * 0.45, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e0a51e'; ctx.fillRect(x - 1, y - r * 0.35, 2, r * 0.7); }
}
function tidedigDrawCrab(st, cr, t) {
  const surf = tidedigSurf();
  let x = cr.x, y = surf - cr.hopY;
  const peekK = cr.ph === 'peek' ? clamp(cr.t / TIDEDIG.crabPeek, 0, 1) : 1;
  ctx.save(); ctx.translate(x, y);
  if (cr.ph === 'peek') {
    // only the eyes peep out of the burrow
    ctx.fillStyle = '#5a3a20'; ctx.beginPath(); ctx.ellipse(0, 2, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    const ey = 4 - peekK * 12;
    for (const ex of [-5, 5]) { ctx.fillStyle = '#e8573a'; ctx.fillRect(ex - 1, ey, 2, 6); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 3.6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(ex + cr.dir, ey + 0.5, 1.7, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); return;
  }
  const bob = Math.sin(cr.legs) * 1.2, flee = cr.ph === 'flee';
  // legs
  ctx.strokeStyle = '#c23c22'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
    const a = Math.sin(cr.legs + i * 1.3 + (s > 0 ? 1.5 : 0)) * 3;
    ctx.beginPath(); ctx.moveTo(s * (6 + i * 2), -6); ctx.lineTo(s * (12 + i * 3), -3 + a * 0.3); ctx.lineTo(s * (13 + i * 3) + a * 0.5, 0); ctx.stroke();
  }
  // body
  ctx.fillStyle = '#c23c22'; ctx.beginPath(); ctx.ellipse(0, -8 + bob, 13, 8.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff6a4a'; ctx.beginPath(); ctx.ellipse(0, -9 + bob, 12, 7.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(-4, -12 + bob, 4, 2, -0.3, 0, Math.PI * 2); ctx.fill();
  // claws: up holding a coin, or waving
  const up = cr.coin ? -14 : flee ? -12 + Math.sin(t * 20) * 3 : -6 + Math.sin(t * 6 + cr.id) * 2;
  for (const s of [-1, 1]) {
    ctx.strokeStyle = '#c23c22'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s * 9, -9 + bob); ctx.lineTo(s * 14, up + 4 + bob); ctx.stroke();
    ctx.fillStyle = '#ff6a4a'; ctx.beginPath(); ctx.arc(s * 15, up + bob, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c23c22'; ctx.beginPath(); ctx.moveTo(s * 15, up + bob); ctx.lineTo(s * 20, up - 3 + bob); ctx.lineTo(s * 19, up + 2 + bob); ctx.closePath(); ctx.fill();
  }
  if (cr.coin) tidedigCoin(0, up - 8 + bob, t * 6, 0.9);
  // eyes on stalks, and a smile (a cheeky grin while carrying, a wobbly "eek" while fleeing)
  for (const ex of [-5, 5]) {
    ctx.fillStyle = '#c23c22'; ctx.fillRect(ex - 1, -20 + bob, 2, 6);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, -21 + bob, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(ex + cr.dir * 1.3, -20.5 + bob, flee ? 1.2 : 1.9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#5a1a10'; ctx.lineWidth = 1.5;
  if (flee) { ctx.beginPath(); ctx.ellipse(0, -6 + bob, 2.5, 2, 0, 0, Math.PI * 2); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(0, -8 + bob, 4, 0.3, Math.PI - 0.3); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,140,150,0.6)'; ctx.beginPath(); ctx.arc(-8, -7 + bob, 2, 0, Math.PI * 2); ctx.arc(8, -7 + bob, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  void peekK; void x;
}
function tidedigDrawPolly(st, t) {
  const pp = st.polly, surf = tidedigSurf();
  // her perch: a little driftwood stand
  const px = pp.perch, py = pp.home.y + 16;
  ctx.strokeStyle = '#7a5228'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(px, surf); ctx.lineTo(px, py); ctx.moveTo(px - 14, py); ctx.lineTo(px + 14, py); ctx.stroke();
  ctx.fillStyle = '#9a6a38'; ctx.beginPath(); ctx.ellipse(px, surf, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  const flying = st.gold.polly && pp.target || Math.hypot(pp.x - pp.home.x, pp.y - pp.home.y) > 6;
  const x = pp.x, y = pp.y + (flying ? Math.sin(t * 10) * 2 : 0), f = pp.face;
  ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
  // tail
  ctx.fillStyle = '#2f7ad8'; ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(-20, 20); ctx.lineTo(-12, 22); ctx.lineTo(-2, 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffc53d'; ctx.beginPath(); ctx.moveTo(-6, 9); ctx.lineTo(-16, 22); ctx.lineTo(-10, 22); ctx.closePath(); ctx.fill();
  // body and head
  ctx.fillStyle = '#e8473a'; ctx.beginPath(); ctx.ellipse(0, 4, 9, 12, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -9, 8, 0, Math.PI * 2); ctx.fill();
  // wing (flapping when flying)
  const wa = flying ? Math.sin(t * 22) * 0.9 : 0.2;
  ctx.save(); ctx.translate(-1, 0); ctx.rotate(-wa);
  ctx.fillStyle = '#3fae5a'; ctx.beginPath(); ctx.ellipse(-4, 4, 6, 11, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2f7ad8'; ctx.beginPath(); ctx.ellipse(-5, 10, 4, 5, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // face: a big curved beak and a friendly eye
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(6, -10, 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(7, -10, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(10, -9); ctx.quadraticCurveTo(18, -8, 15, -1); ctx.lineTo(10, -4); ctx.closePath(); ctx.fill();
  // a little captain's hat
  ctx.fillStyle = '#2a2a3a'; ctx.beginPath(); ctx.moveTo(-6, -15); ctx.quadraticCurveTo(4, -26, 14, -15); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.gold; ctx.fillRect(1, -20, 5, 2);
  if (st.gold.polly) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(2, 0, 16, 22, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
  if (pp.sayT > 0) {
    ctx.font = '700 12px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(pp.say).width + 14, bx = clamp(x - tw / 2, 6, W - tw - 6), by = clamp(y - 48, 80, H - 30);
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#2f9a4c'; ctx.lineWidth = 2; rr(bx, by, tw, 20, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(pp.say, bx + tw / 2, by + 10.5);
  }
}
function tidedigDrawPosts(st, t) {
  const surf = tidedigSurf();
  for (const x of st.posts) {
    ctx.fillStyle = '#7a5228'; rr(x - 5, surf - 38, 10, 40, 3); ctx.fill();
    ctx.fillStyle = '#9a6a38'; rr(x - 7, surf - 42, 14, 7, 3); ctx.fill();
    ctx.strokeStyle = C.rope; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x - 5, surf - 28 + k * 4); ctx.lineTo(x + 5, surf - 26 + k * 4); ctx.stroke(); }
  }
  void t;
}
function tidedigDraw() {
  const st = G.mst;
  if (!st.holes) return;
  const t = G.clock;
  tidedigDrawBack(st);
  tidedigCloudsDraw(t);
  // the burrows (dark holes in the sand at the rocks)
  for (const b of st.burrows) { ctx.fillStyle = '#5a3a20'; ctx.beginPath(); ctx.ellipse(b.x, tidedigSurf() + 1, 13, 5, 0, Math.PI, 0); ctx.fill(); }
  tidedigDrawSea(st, t);
  tidedigDrawStash(st, t);
  tidedigDrawWall(st, t);
  tidedigDrawPosts(st, t);
  tidedigDrawHoles(st, t);
  for (const q of st.coins) if (q.delay <= 0) tidedigCoin(q.x, q.y, q.spin, 1);
  for (const cr of st.crabs) tidedigDrawCrab(st, cr, t);
}
// the shovel and the bucket in the players' hands
function tidedigDrawTools(st, t) {
  for (const p of G.players) {
    if (!p.alive) continue;
    const P = st.pl[p.id], cx = tidedigCx(p), f = p.face || 1;
    ctx.save();
    if (p.id === st.digger) {
      const k = P.anim > 0 ? Math.sin((P.anim / 0.22) * Math.PI) : 0;
      ctx.translate(cx + f * 12, p.y + 14 + k * 8); ctx.rotate(f * (0.5 - k * 0.9));
      ctx.strokeStyle = '#8a5a32'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 12); ctx.stroke();
      ctx.fillStyle = st.gold.shovel ? C.gold : '#c9d2de'; ctx.strokeStyle = st.gold.shovel ? C.goldDark : '#7a8494'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-6, 11); ctx.lineTo(6, 11); ctx.lineTo(5, 20); ctx.quadraticCurveTo(0, 25, -5, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#8a5a32'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-4, -15); ctx.lineTo(4, -15); ctx.stroke();
    } else {
      const sc = P.act > 0 && P.actKind === 'scoop' ? Math.sin((P.act / TIDEDIG.scoopT) * Math.PI) : 0;
      const dp = P.act > 0 && P.actKind === 'dump' ? Math.sin((P.act / TIDEDIG.dumpT) * Math.PI) : 0;
      ctx.translate(cx + f * 15, p.y + 16 + sc * 10); ctx.rotate(f * (dp * 1.6 + sc * 0.6));
      const gold = st.gold.bucket, bw = gold ? 9 : 7.5;
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -2, bw - 1, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = gold ? '#b9850f' : '#a82a20'; ctx.beginPath(); ctx.moveTo(-bw - 1, -2); ctx.lineTo(bw + 1, -2); ctx.lineTo(bw - 1, 12); ctx.lineTo(-bw + 1, 12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = gold ? C.gold : '#e8473a'; ctx.beginPath(); ctx.moveTo(-bw, -1); ctx.lineTo(bw, -1); ctx.lineTo(bw - 2, 11); ctx.lineTo(-bw + 2, 11); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-bw + 2, 1, 2.5, 8);
      if (P.bucket > 0) { ctx.fillStyle = '#5fd6ee'; ctx.fillRect(-bw + 0.5, -2, bw * 2 - 1, 3); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(-bw + 3, -2, 4, 1.2); }
    }
    ctx.restore();
    // a tiny pirate bandana on top (red for Pip, blue-striped for Bo)
    const w = p.w * p.sx, h = p.h * p.sy, by = p.y + p.h - h;
    ctx.fillStyle = p.id === 0 ? '#d63a2c' : '#2a3a8a';
    rr(cx - w / 2 + 2, by + 1, w - 4, 6, 3); ctx.fill();
    ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx - w / 2 + 6 + i * 6, by + 4, 1.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = p.id === 0 ? '#d63a2c' : '#2a3a8a'; ctx.beginPath(); ctx.moveTo(cx - f * (w / 2 - 2), by + 3); ctx.lineTo(cx - f * (w / 2 + 6), by + 1 + Math.sin(t * 8 + p.id) * 1.5); ctx.lineTo(cx - f * (w / 2 + 5), by + 8); ctx.closePath(); ctx.fill();
  }
}
function tidedigChip(t1, t2, x, y, col, avoid) {
  const z = tidedigBig() ? 1.6 : 1, f1 = Math.round(13 * z), f2 = Math.round(12 * z);
  ctx.font = '700 ' + f1 + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  let w = ctx.measureText(t1).width;
  if (t2) { ctx.font = '700 ' + f2 + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; w = Math.max(w, ctx.measureText(t2).width); }
  w = Math.min(W - 16, w + 22 * z); const h = (t2 ? 38 : 22) * z;
  const x0 = clamp(x - w / 2, 8, W - 8 - w);
  let y0 = clamp(y - h, 84, H - 8 - h);
  for (const b of avoid || []) if (x0 < b.x1 + 4 && x0 + w > b.x0 - 4 && y0 < b.y1 + 4 && y0 + h > b.y0 - 4) y0 = b.y0 - h - 6 >= 84 ? b.y0 - h - 6 : b.y1 + 6;
  ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x0, y0, w, h, 10 * z); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(x0, y0, w, h, 10 * z); ctx.stroke();
  text(t1, x0 + w / 2, y0 + 11 * z, f1, col, 'center', 'body');
  if (t2) text(t2, x0 + w / 2, y0 + 28 * z, f2, C.paper, 'center', 'body');
  return { x0, y0, x1: x0 + w, y1: y0 + h };
}
function tidedigDrawTop() {
  const st = G.mst;
  if (!st.holes) return;
  const t = G.clock, big = tidedigBig(), boxes = [];
  tidedigDrawTools(st, t);
  // water over a digger in a flooded hole (so it reads as being in the water), with bubbles
  for (const h of st.holes) {
    if (h.water < 6 || h.depth <= 0) continue;
    const D = G.players[st.digger];
    if (tidedigIn(st, D) !== h) continue;
    const wt = tidedigWaterTop(h), bot = tidedigBottom(h);
    ctx.fillStyle = 'rgba(64,190,220,0.38)'; ctx.fillRect(h.c * T + 1, wt, T - 2, bot - wt);
    if (!reduceMotion) for (let i = 0; i < 3; i++) { const k = (t * 0.9 + i / 3) % 1; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(h.cx - 5 + i * 5, wt + (bot - wt) * (1 - k), 2.2, 0, Math.PI * 2); ctx.stroke(); }
  }
  // particles (sand, drops, coin rings)
  for (const q of st.parts) {
    ctx.globalAlpha = clamp(q.life / q.max, 0, 1);
    if (q.ring) { ctx.strokeStyle = q.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, q.r + (1 - q.life / q.max) * 10, 0, Math.PI * 2); ctx.stroke(); }
    else { ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  tidedigDrawPolly(st, t);
  // the haul bar
  if (st.haul) {
    const hl = st.haul, bw = 140, x0 = hl.h.cx - bw / 2, y0 = tidedigSurf() - 92;
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(x0 - 6, y0 - 6, bw + 12, 26, 10); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; rr(x0, y0 + 6, bw, 8, 4); ctx.fill();
    ctx.fillStyle = C.gold; rr(x0, y0 + 6, Math.max(8, bw * hl.prog), 8, 4); ctx.fill();
    text(hl.held[0] && hl.held[1] ? 'HEAVE!' : 'Both hold the rope!', hl.h.cx, y0 - 1, 11, C.paper, 'center', 'body');
    for (let k = 0; k < 2; k++) { ctx.fillStyle = hl.held[k] ? PCOL[k] : 'rgba(255,255,255,0.3)'; circle(hl.post[k], tidedigSurf() - 52, 6); ctx.fill(); }
  }
  // job hints over each person (never for the computer): when a job starts, and again when it drags on
  const pl = tidedigPlan(st);
  const show = st.phase !== 'won' && G.introT <= 0 && (st.stepT < TIDEDIG.chipT || st.stepT > TIDEDIG.chipAgain || st.k === 0 && st.roomT < 40);
  if (show) {
    ctx.save(); if (st.stepT > TIDEDIG.chipAgain && !reduceMotion) ctx.globalAlpha = 0.82 + 0.18 * Math.sin(t * 5);
    for (const id of [st.bailer, st.digger]) {
      const p = G.players[id], j = pl.jobs[id];
      if (!p.alive || !j || tidedigCpu(id)) continue;
      const line = tidedigSay(st, id, j);
      if (!line) continue;
      const role = id === st.digger ? ' (digger)' : ' (bailer)';
      boxes.push(tidedigChip(NAMES[id] + role + ': ' + line, '', tidedigCx(p), Math.min(p.y, tidedigSurf() - 26) - 22, PCOL[id], boxes));
    }
    ctx.restore();
  }
  // pops (Glub!, Shoo!, Splash!)
  for (const q of st.pops) {
    const size = q.size * (big ? 1.3 : 1);
    ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(q.s).width + size * 0.3, x = clamp(q.x, w / 2 + 6, W - w / 2 - 6);
    let y = clamp(q.y - q.t * 26, 92, H - 20);
    for (const b of boxes) if (x + w / 2 > b.x0 && x - w / 2 < b.x1 && y + size * 0.55 > b.y0 && y - size * 0.55 < b.y1) y = Math.max(92, b.y0 - size * 0.6 - 2);
    ctx.save(); ctx.globalAlpha = clamp(Math.min(q.t / 0.1, (1.3 - q.t) / 0.4), 0, 1);
    bigText(q.s, x, y, Math.round(size), q.col);
    ctx.restore();
  }
  if (st.phase === 'won') {
    const k = Math.min(1, st.winT / 0.3), last = G.level.def.roomIndex >= G.level.def.roomCount - 1;
    bigText(last ? 'Treasure cove cleared!' : 'Room clear!', W / 2, 200, 44, C.gold, 0.6 + 0.4 * k);
  }
}
function tidedigHud() {
  const st = G.mst;
  if (!st.stats) return;
  const big = tidedigBig(), fs = big ? 20 : 14, h = big ? 40 : 28;
  const s = st.stats;
  // top right: time, coins saved, crab steals
  const parts = [[fmtTime(G.time), C.paper], [s.stash + '/' + s.coinsTotal, '#ffe066'], ['Crab steals ' + s.steals, s.steals ? '#ffb08a' : C.paper]];
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const ws = parts.map(q => ctx.measureText(q[0]).width), gap = fs, ci = fs * 1.3;
  const w = ws.reduce((a, b) => a + b, 0) + gap * 2 + 30 + ci, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
  let x = x0 + 15;
  parts.forEach((q, i) => {
    if (i === 1) { tidedigCoin(x + fs * 0.45, cy, 0, big ? 1.15 : 0.85); x += ci; }
    text(q[0], x, cy, fs, q[1], 'left', 'body'); x += ws[i] + gap;
  });
  // gold help chips under it
  let gy = 12 + h + 6;
  for (const [on, sx] of [[st.gold.bucket, 'GOLD BUCKET'], [st.gold.polly, 'CAPTAIN POLLY'], [st.gold.shovel, 'GOLD SHOVEL']]) {
    if (!on) continue;
    const fs2 = big ? 15 : 11;
    ctx.font = '700 ' + fs2 + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w2 = ctx.measureText(sx).width + 20;
    pill(W - 14, gy, w2, fs2 + 10, 'right');
    text(sx, W - 24, gy + (fs2 + 10) / 2 + 0.5, fs2, C.gold, 'right', 'body');
    gy += fs2 + 14;
  }
  // the wave meter (top centre): next wave coming in, or the big one
  const wv = st.wave, ny = big ? 60 : 50;
  if (st.phase !== 'won') {
    const fs3 = big ? 18 : 13, bw = big ? 300 : 220, bh = big ? 40 : 30, y = ny;
    const left = tidedigWaveIn(st), every = Math.max(1, tidedigWaveCfg(st).every);
    let label, col = C.paper, fill;
    if (wv.ph === 'calm') { label = 'Next wave ' + Math.ceil(left) + ' s'; fill = 1 - clamp((left - TIDEDIG.swellT) / every, 0, 1); }
    else if (wv.ph === 'swell') { label = wv.big ? 'BIG WAVE coming!' : 'Wave coming!'; col = wv.big ? '#ffb08a' : '#bff4ff'; fill = 1; }
    else { label = wv.big ? 'BIG WAVE!' : 'Splash!'; col = '#bff4ff'; fill = 1; }
    const flash = wv.ph === 'swell' && !reduceMotion ? 0.82 + 0.18 * Math.sin(G.clock * 14) : 1;
    ctx.save(); ctx.globalAlpha = flash;
    pill(W / 2, y, bw, bh, 'center');
    // a little wave icon
    const ix = W / 2 - bw / 2 + 20, iy = y + bh / 2;
    ctx.strokeStyle = '#5fd6ee'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ix - 9, iy + 4); ctx.quadraticCurveTo(ix - 4, iy - 8, ix + 4, iy - 4); ctx.quadraticCurveTo(ix, iy, ix + 2, iy + 4); ctx.stroke();
    text(label, ix + 16, iy + 0.5, fs3, col, 'left', 'body');
    const bx = W / 2 + (big ? 50 : 36), barW = W / 2 + bw / 2 - 14 - bx;
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(bx, iy - 4, barW, 8, 4); ctx.fill();
    ctx.fillStyle = wv.big && wv.ph !== 'calm' ? '#ffb08a' : '#5fd6ee'; rr(bx, iy - 4, Math.max(8, barW * fill), 8, 4); ctx.fill();
    ctx.restore();
  }
  const n = st.news;
  if (n && G.mode === 'play') {
    const a = clamp(Math.min(n.t / 0.2, (n.life - n.t) / 0.3), 0, 1), nfs = big ? 19 : 14, nh = big ? 34 : 26, yy = ny + (big ? 46 : 36);
    ctx.font = '700 ' + nfs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const nw = Math.min(W - 20, ctx.measureText(n.s).width + 32);
    ctx.save(); ctx.globalAlpha = a;
    const px = pill(W / 2, yy, nw, nh, 'center');
    if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(px, yy, nw, nh, nh / 2); ctx.stroke(); }
    text(n.s, W / 2, yy + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
    ctx.restore();
  }
}

MODES.tidedig = {
  setup(st, L) {
    const lv = LEVELS[G.levelIndex], rooms = lv.rooms || [];
    const total = rooms.reduce((n, r) => n + (r.chests || []).reduce((m, c) => m + c.coins, 0), 0);
    const chests = rooms.reduce((n, r) => n + (r.chests || []).length, 0);
    st.stats = { coinsTotal: total, chestsTotal: chests, stash: 0, steals: 0, chests: 0, picked: [0, 0], shoos: [0, 0], pollyShoos: 0,
      scoops: [0, 0], buckets: [0, 0], strokes: [0, 0], tiles: [0, 0], floods: 0, blocked: 0, waves: 0, roomT: [], gold: [] };
    tidedigRoom(st, L);
  },
  room(k, L) { tidedigRoom(G.mst, L); },
  pre(dt) { const st = G.mst; if (st.holes) tidedigPre(st, dt); },
  step(dt) { const st = G.mst; if (st.holes) tidedigStep(st, dt); },
  draw() { tidedigDraw(); },
  drawTop() { tidedigDrawTop(); },
  hud() { tidedigHud(); },
  stats() {
    const s = G.mst.stats, time = G.time, share = s.coinsTotal ? s.stash / s.coinsTotal : 0;
    const medal = time <= TIDEDIG_MEDAL.gold[0] && share >= TIDEDIG_MEDAL.gold[1] ? 'Gold' : time <= TIDEDIG_MEDAL.silver[0] && share >= TIDEDIG_MEDAL.silver[1] ? 'Silver' : 'Bronze';
    const words = s.steals === 0 ? 'Not one coin for the crabs! Treasure masters!' : share >= 0.85 ? 'Super digging and bailing, pirates!' : 'The crabs got a few, and you found every chest!';
    const extra = 'Shoos: Pip ' + s.shoos[0] + ', Bo ' + s.shoos[1] + (s.pollyShoos ? ', Polly ' + s.pollyShoos : '') + ' · Waves held by walls ' + s.blocked + ' · Floods ' + s.floods + (s.gold.length ? ' · Help: ' + s.gold.join(', ') : '');
    return [
      { label: 'Coins saved', value: s.stash + ' of ' + s.coinsTotal },
      { label: 'Crab steals', value: s.steals },
      { label: 'Sand dug', values: s.tiles.slice() },
      { label: 'Buckets bailed', values: s.buckets.slice() },
      medal + ' medal · ' + words,
      extra,
    ];
  },
};

/* ---------- sounds ---------- */
Sfx.extra.tidedigDig = function (p) { this.tone(260 * p, 0.06, 'triangle', 0.035, 160 * p); this.tone(1200, 0.04, 'sawtooth', 0.008, 600, 0.02); };
Sfx.extra.tidedigTile = function (p) { this.tone(180 * p, 0.12, 'sine', 0.06, 110 * p); };
Sfx.extra.tidedigClunk = function () { this.tone(140, 0.12, 'square', 0.04, 90); this.tone(420, 0.08, 'triangle', 0.03, null, 0.05); };
Sfx.extra.tidedigTreasure = function () { [659, 784, 988, 1319, 1568].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.tidedigCoin = function (p) { const f = 1320 + Math.random() * 300; this.tone(f, 0.06, 'triangle', 0.04, null); this.tone(f * 1.5, 0.08, 'sine', 0.025, null, 0.04); void p; };
Sfx.extra.tidedigClink = function () { this.tone(2100 + Math.random() * 400, 0.04, 'triangle', 0.012); };
Sfx.extra.tidedigGlub = function (p) { this.tone(300 * p, 0.12, 'sine', 0.06, 140 * p); this.tone(220 * p, 0.12, 'sine', 0.05, 110 * p, 0.1); };
Sfx.extra.tidedigScoop = function (p) { this.tone(500 * p, 0.1, 'sine', 0.05, 260 * p); this.tone(900, 0.06, 'sawtooth', 0.008, 400, 0.04); };
Sfx.extra.tidedigDump = function (p) { this.tone(700 * p, 0.25, 'sawtooth', 0.015, 140 * p); this.tone(220, 0.2, 'sine', 0.05, 90, 0.05); };
Sfx.extra.tidedigSwell = function () { this.tone(120, 0.6, 'sine', 0.03, 200); };
Sfx.extra.tidedigBigWave = function () { this.tone(90, 0.9, 'sawtooth', 0.02, 180); this.tone(400, 0.12, 'square', 0.025, 300, 0.1); this.tone(400, 0.12, 'square', 0.025, 300, 0.35); };
Sfx.extra.tidedigRush = function () { this.tone(1400, 0.5, 'sawtooth', 0.012, 300); this.tone(160, 0.4, 'sine', 0.03, 80); };
Sfx.extra.tidedigPour = function () { this.tone(800, 0.3, 'sine', 0.03, 200); };
Sfx.extra.tidedigShoo = function (p) { this.tone(600 * p, 0.08, 'square', 0.03, 900 * p); this.tone(1200, 0.06, 'triangle', 0.03, 1600, 0.06); };
Sfx.extra.tidedigSnip = function () { this.tone(1800, 0.03, 'square', 0.02); this.tone(1500, 0.03, 'square', 0.02, null, 0.05); };
Sfx.extra.tidedigSteal = function () { this.tone(500, 0.12, 'triangle', 0.035, 300); this.tone(300, 0.15, 'triangle', 0.03, 200, 0.1); };
Sfx.extra.tidedigPat = function (p) { this.tone(160 * p, 0.05, 'triangle', 0.04, 120 * p); };
Sfx.extra.tidedigWallUp = function () { [440, 554, 659].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.04, null, i * 0.05)); };
Sfx.extra.tidedigWallHold = function () { this.tone(200, 0.2, 'sine', 0.05, 120); this.tone(660, 0.1, 'triangle', 0.03, 880, 0.12); };
Sfx.extra.tidedigRope = function () { this.tone(500, 0.1, 'triangle', 0.04, 700); this.tone(900, 0.08, 'square', 0.015, 1300, 0.1); };
Sfx.extra.tidedigHeave = function () { this.tone(220, 0.12, 'square', 0.03, 300); };
Sfx.extra.tidedigGold = function () { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.tidedigRoom = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.06, null, i * 0.09)); };
MODES.tidedig.test = { TIDEDIG, TIDEDIG_MEDAL, tidedigPlan, tidedigIn, tidedigAtSpot, tidedigOnSurface, tidedigActive, tidedigWaveIn, tidedigScoopHole, tidedigDumpAt, tidedigHoleAt };
