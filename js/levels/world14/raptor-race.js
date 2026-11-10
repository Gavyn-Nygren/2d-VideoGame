/* Pip & Bo - Level 14-4 Raptor Race (versus, World 14 Dino Valley). */
'use strict';

/* ===== 14-4 Raptor Race (mode 'raptor', versus, best of 5): ride friendly feathered raptors through a jungle =====
   Side-on, one shared course and one shared camera. def.ownStep: this mode runs the whole live tick, the camera and the
   picture; the platformer bodies are hidden (Pip rides Zippy, a sunny yellow raptor with orange feathers; Bo rides
   Noodle, a lilac raptor with blue feathers). Raptors run forward by themselves, so a kid can just hop and duck:
     ▶ runs fast, ◀ slows down (to wait for a herd or a geyser). Jump (W, ↑, pad A, touch ▲) hops logs, rocks, little compies,
     puddles and the gaps between treetop branches; hold it for a full hop. ▼ (S, ↓, stick down) ducks under low branches,
     vines and roots. A raptor drifts a little slower through its own hops and needs a short push-off step after landing,
     so hopping all the time (mashing jump) is slower than hopping just the logs.
     Forks: three paths for a while. Jump (or stick up) by the sign to leap up to the Treetops (fast springy branches with
     gaps: miss one and you drop down onto the bridge with a "Whoops!"), hold ▼ to slide down to the Muddy Creek (mud
     slows you, but it has the most speed eggs), or keep running along the Jungle Trail bridge (logs and compies).
     Speed eggs: run into one to pick it up (one at a time), then press dash (the action) for a raptor dash: much faster
     for about a second, smashing through logs, skimming the mud, ducking branches and flying over gaps.
     A stumble (a log, a rock, a branch, a compy, a trike) is a cartoon "Oof!" that slows you down; nobody gets hurt.
     Raptors bump each other a little in the same lane, and jumping over the other raptor is a "Leapfrog!".
   First nose through the brachiosaurus arch wins the round. Crossings 0.005 s apart or closer are a dead heat (replayed);
   a second tie in a row goes to more hops this match (then fewer stumbles, then more eggs), else a short
   Sudden Sprint. A safety bell at 75 s gives the
   round to whoever is farther along. After 4 ties in a row the match is called (framework).
   Round 1 is the plain Jungle Dash; rounds 2-5 are a fresh shuffle of Trike Stampede, Bouncy Ferns, Geyser Gully and
   Firefly Night. Every course is built at the start of its round from MODES.raptor.rand.
   Catch-up help, always gold and announced: Gold Zoomies (a raptor far behind runs a bit faster, with a gold dust trail
   and a HUD chip) and, for a player 2+ rounds behind, a Gold Egg ready at the start of every round (a bigger dash).
   Every top-level name is prefixed raptor / RAPTOR, every sound is Sfx.extra.raptor*. Looks use their own raptorVR. */
const RAPTOR = {
  len: 10400, sprintLen: 3600, startX: 150, startY: [0, 0], final: 720,
  // the three paths: feet height of the Treetops branch walk, the Jungle Trail (a rope bridge in forks), the Muddy Creek
  laneY: [196, 352, 470], walkT: 18, bridgeT: 12,
  bodyH: 64, duckH: 40,
  // forward speed (px/s): cruise with no key, ▶ fast, ◀ slow; a stumble drops to stumbleV
  cruise: 300, fast: 380, slow: 185, accX: 320, decX: 560, stumbleV: 120,
  // jumping (a full hop is about 89 px high and 0.55 s long; letting go early cuts it)
  jumpV: 640, g: 2300, cut: 0.5, coyote: 0.08, jumpBuf: 0.14,
  // a hop of your own drifts a little slower than running (air), and after landing the raptor needs a short push-off
  // step before the next hop, so hopping all the time (mashing jump) is slower than hopping just the logs
  airMul: 0.9, pushOff: 0.1,
  // speed changes
  highMul: 1.08, duckMul: 0.9, mudMul: 0.55, splashMul: 0.8, splashT: 0.45,
  stumbleT: 0.55, bonkT: 0.5, peepT: 0.3, peepMul: 0.6, booT: 0.4,
  // speed eggs and the dash
  eggR: 13, dashAdd: 250, dashT: 1.1, dashRamp: 0.18, goldDashAdd: 330, goldDashT: 1.5,
  // forks: the zone before the sign where jump / ▼ picks a path, and the lane changes
  forkZone: 190, transUp: 0.42, transDown: 0.34, fallMul: 0.65,
  // the two raptors
  bumpDX: 40, bumpCD: 0.45,
  // catch-up (gold): Zoomies for a raptor far behind, a Gold Egg for a player 2+ rounds behind
  tailGap: 300, tailK: 0.2, tailMax: 50, tailShow: 10, goldMin: 2,
  // camera
  camAvg: 380, camLead: 560, camLeadMax: 170, edgeL: 60,
  // finish: a photo-finish wait after the first crossing; crossings this close are a dead heat; the safety bell
  finWait: 0.03, photo: 0.005, capT: 75,
  // twists
  fernV: 1000, geyserV: 860, geyserMul: 0.5, geyserTop: 230,
  trikeCross: 2.4, trikeOn: [0.24, 0.43], trikeY0: 268, trikeY1: 520,
};
const RAPTOR_TWISTS = {
  plain: { name: 'Jungle Dash', hint: 'Hop the logs, duck the branches, pick a path at every fork!' },
  stampede: { name: 'Trike Stampede', hint: 'Friendly triceratops cross the trail! Wait for a gap, or dash through.' },
  ferns: { name: 'Bouncy Ferns', hint: 'Springy ferns BOING you over logs. A fern under a branch? Duck!' },
  geyser: { name: 'Geyser Gully', hint: 'Geysers bubble, then WHOOSH! Slow down or hurry to slip past.' },
  night: { name: 'Firefly Night', hint: 'It’s dark! Fireflies glow by the eggs, and logs have glowing mushrooms.' },
  sprint: { name: 'Sudden Sprint', hint: 'Two ties! One short sprint decides it.' },
};
const RAPTOR_MIX = ['stampede', 'ferns', 'geyser', 'night'];
const RAPTOR_LANES = ['Treetops', 'Jungle Trail', 'Muddy Creek'];
// the two raptors: Pip rides Zippy, Bo rides Noodle
const RAPTOR_DINO = [
  { name: 'Zippy', body: '#ffcf4a', dark: '#d98f1f', stripe: '#ff8a3d', belly: '#fff2bf', feather: '#ff6b4a', featherDk: '#c8442c' },
  { name: 'Noodle', body: '#b9a0ff', dark: '#7a5fd0', stripe: '#8a6ee8', belly: '#f1e9ff', feather: '#5b95ff', featherDk: '#2f5fc4' },
];
// looks-only randomness (sparkles, dust): never MODES.raptor.rand, so the rules' random sequence doesn't depend on the looks
let raptorVS = 20261104;
const raptorVR = () => { raptorVS = (Math.imul(raptorVS, 1664525) + 1013904223) >>> 0; return raptorVS / 4294967296; };
const raptorHash = (a, b) => (((Math.imul(a + 11, 73856093) ^ Math.imul(b + 5, 19349663)) >>> 0) % 1000) / 1000;
// 1-player mode: the computer rides this raptor (no key reminders for it)
const raptorCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

/* ---------- the course ---------- */
const raptorForkAt = (c, x) => { for (const f of c.forks) if (x >= f.x0 && x <= f.x1) return f; return null; };
// a treetop gap under x (lane 0 only)
function raptorGapAt(c, x) { for (const g of c.gaps) if (x > g.x && x < g.x + g.w) return g; return null; }
// the ground (feet y) of a lane at x, or null over a treetop gap
function raptorGroundAt(c, lane, x) { return lane === 0 && raptorGapAt(c, x) ? null : RAPTOR.laneY[lane]; }
// the lowest the top of a raptor's head may go on a lane at x (the branch walk over the bridge, the bridge over the creek)
function raptorCeilAt(c, lane, x) {
  if (lane === 1 && raptorForkAt(c, x)) return RAPTOR.laneY[0] + RAPTOR.walkT;
  if (lane === 2) return RAPTOR.laneY[1] + RAPTOR.bridgeT;
  return -1e9;
}
function raptorMudAt(c, lane, x) { for (const m of c.muds) if (m.lane === lane && x > m.x0 && x < m.x1) return m; return null; }
// a geyser's state at time t: 'quiet', 'bubble' (warning) or 'blow' (erupting), and how far through it is
function raptorGeyserState(g, t) {
  const per = g.quiet + 0.7 + 1.0, u = (((t + g.ph) % per) + per) % per;
  if (u < g.quiet) return { s: 'quiet', k: u / g.quiet, left: g.quiet - u };
  if (u < g.quiet + 0.7) return { s: 'bubble', k: (u - g.quiet) / 0.7, left: g.quiet + 0.7 - u };
  return { s: 'blow', k: (u - g.quiet - 0.7) / 1.0, left: per - u };
}
// the trikes of a herd at time t: each one's depth d (0 far, 1 near) while it crosses, or null
function raptorTrikes(h, t) {
  const P = RAPTOR, u = (((t + h.ph) % h.period) + h.period) % h.period, out = [];
  for (let k = 0; k < h.offs.length; k++) {
    const l = u - h.offs[k];
    out.push(l >= 0 && l <= P.trikeCross ? l / P.trikeCross : null);
  }
  return out;
}
const raptorTrikeOn = d => d != null && d >= RAPTOR.trikeOn[0] && d <= RAPTOR.trikeOn[1];
// is the herd on the trail at time t?
const raptorHerdBlocks = (h, t) => raptorTrikes(h, t).some(raptorTrikeOn);
// the next time (from t) the herd's crossing is clear for at least `need` seconds; returns the wait in seconds
function raptorHerdWait(h, t, need) {
  for (let w = 0; w < h.period + 2; w += 0.05) {
    let ok = true;
    for (let s = 0; s <= need; s += 0.05) if (raptorHerdBlocks(h, t + w + s)) { ok = false; break; }
    if (ok) return w;
  }
  return 0;
}

// build one round's course with the rules' random numbers
function raptorBuild(twist, R) {
  const P = RAPTOR, sprint = twist === 'sprint', len = sprint ? P.sprintLen : P.len;
  const c = { twist, len, forks: [], gaps: [], obs: [], muds: [], eggs: [], herds: [], trees: [], flies: [], signs: [] };
  const rr = (a, b) => a + R() * (b - a);
  const add = (o) => { o.hit = [false, false]; o.passed = [false, false]; o.fx = 0; c.obs.push(o); return o; };
  const egg = (lane, x, h) => { c.eggs.push({ lane, x: Math.round(x), h, got: [false, false], ph: R() * 6.28, t: 0 }); };
  // the layout: open trail, then a fork, three times (once in a sprint), then a last open stretch to the arch
  const n = sprint ? 1 : 3, start = P.startX + 520, span = (len - P.final - start) / n, secs = [];
  let x = start;
  for (let k = 0; k < n; k++) {
    const ow = sprint ? span * 0.38 : rr(1100, 1400);
    // (right after a fork the raptor is still climbing back onto the trail: keep that bit clear)
    secs.push({ k: 'open', x0: x + (k ? 230 : 0), x1: x + ow });
    const f = { x0: Math.round(x + ow), x1: Math.round(x + span), i: k };
    c.forks.push(f); secs.push({ k: 'fork', x0: f.x0, x1: f.x1, f });
    x += span;
  }
  secs.push({ k: 'open', x0: x + 230, x1: len - 260, last: true });
  // ----- open trail (the Jungle Trail only) -----
  for (const s of secs) {
    if (s.k !== 'open') continue;
    const end = s.last ? s.x1 : s.x1 - P.forkZone - 120;
    const keep = []; // zones kept clear for the twist's own things
    if (twist === 'stampede' && !s.last && end - s.x0 > 500) {
      const mid = Math.round(s.x0 + (end - s.x0) * rr(0.45, 0.6)), w = 140;
      const offs = R() < 0.5 ? [0, 0.7, 1.9] : [0, 1.25, 1.95];
      c.herds.push({ x0: mid - w / 2, x1: mid + w / 2, period: rr(4.6, 5.4), ph: R() * 5, offs });
      keep.push([mid - 300, mid + 230]);
    }
    if (twist === 'geyser') {
      // two geysers in a stretch sit at least 460 px apart, so each one can be timed on its own (and one WHOOSH can't
      // throw a raptor straight into the next one)
      const ng = s.last || end - s.x0 < 760 ? 1 : 2;
      let gPrev = -1e9;
      for (let k = 0; k < ng; k++) {
        const gx = Math.max(gPrev + 460, Math.round(s.x0 + 200 + (end - s.x0 - 300) * (k + 0.3 + R() * 0.4) / ng));
        if (gx > end - 60) break;
        gPrev = gx;
        add({ k: 'geyser', lane: 1, x: gx, w: 44, h: 0, quiet: rr(1.6, 2.3), ph: R() * 4, cd: [0, 0] });
        keep.push([gx - 200, gx + 150]);
      }
    }
    if (twist === 'ferns' && !s.last) {
      // a fern before a row of logs (boing over them all), and one before a low branch (duck to skip it!)
      const fx = Math.round(s.x0 + 160 + R() * 80);
      add({ k: 'fern', lane: 1, x: fx, w: 50, h: 0, sq: [0, 0] });
      for (let j = 0; j < 3; j++) add({ k: 'log', lane: 1, x: fx + 150 + j * 82, w: 40, h: 30, rot: R() });
      if (R() < 0.6) egg(1, fx + 230, 150);
      // a fern right under a low branch: duck past it (ducking never boings), or BOING into the branch
      const bx = Math.round(Math.max(s.x0 + (end - s.x0) * 0.62, fx + 150 + 3 * 82 + 300));
      keep.push([fx - 120, fx + 150 + 3 * 82 + 160]);
      if (bx + 120 < end) {
        add({ k: 'branch', lane: 1, x: bx - 12, w: 74, h: 48 });
        add({ k: 'fern', lane: 1, x: bx, w: 50, h: 0, sq: [0, 0] });
        keep.push([bx - 140, bx + 260]);
      }
    }
    const inKeep = p => keep.some(([a, b]) => p > a && p < b);
    let p = s.x0 + 150, eggs = 0;
    while (p < end - 40) {
      if (inKeep(p)) { p += 40; continue; }
      const u = R();
      if (u < 0.36) { add({ k: 'log', lane: 1, x: Math.round(p), w: 40, h: 30, rot: R() }); if (!eggs && R() < 0.35) { egg(1, p + 20, 96); eggs++; } p += 40 + rr(250, 330); }
      else if (u < 0.52) { add({ k: 'rock', lane: 1, x: Math.round(p), w: 38, h: 40 }); p += 38 + rr(260, 330); }
      else if (u < 0.68) { add({ k: 'compy', lane: 1, x: Math.round(p + 36), w: 26, h: 26, range: 34, ph: R() * 6.28, hop: 0, col: Math.floor(R() * 3) }); p += 110 + rr(230, 300); }
      else if (u < 0.82) { add({ k: 'branch', lane: 1, x: Math.round(p), w: 76, h: 48 }); p += 76 + rr(220, 290); }
      else if (u < 0.9 && !s.last) { const w = Math.round(rr(150, 230)); c.muds.push({ lane: 1, x0: Math.round(p), x1: Math.round(p + w) }); p += w + rr(200, 260); }
      else if (!eggs) { egg(1, p, 16); eggs++; p += rr(160, 220); }
      else p += 120;
    }
  }
  // ----- forks: Treetops (gaps, vines), Jungle Trail bridge (logs, compies, a dangling branch), Muddy Creek (mud, eggs) -----
  for (const s of secs) {
    if (s.k !== 'fork') continue;
    const a = s.x0 + 160, b = s.x1 - 170, L = b - a;
    c.signs.push({ x: s.x0 - P.forkZone - 20, f: s.f });
    // Treetops: 2-3 gaps, maybe a vine curtain, maybe an egg over a gap
    const ng = sprint ? 2 : 2 + (R() < 0.6 ? 1 : 0);
    let vineDone = R() < 0.3, eggDone = R() < 0.4;
    const topEgg = R() < 0.6;
    for (let k = 0; k < ng; k++) {
      const gx = Math.round(a + 60 + (L - 200) * (k + 0.2 + R() * 0.5) / ng), gw = Math.round(rr(80, 104));
      c.gaps.push({ x: gx, w: gw });
      if (!eggDone && topEgg && (k === ng - 1 || R() < 0.5)) { egg(0, gx + gw / 2, 92); eggDone = true; }
      if (!vineDone && k < ng - 1) { add({ k: 'vine', lane: 0, x: gx + gw + Math.round(rr(150, 190)), w: 60, h: 48 }); vineDone = true; }
    }
    // Jungle Trail (the rope bridge): logs, a compy, a branch dangling from the walk above
    let p = a + rr(0, 80);
    const kinds = ['log', 'log', 'compy', 'branch', sprint ? 'log' : (R() < 0.5 ? 'log' : 'rock')];
    for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
    let bEgg = R() < 0.8;
    for (const k of kinds) {
      if (p > b - 60) break;
      if (k === 'log') { add({ k: 'log', lane: 1, x: Math.round(p), w: 40, h: 30, rot: R() }); if (bEgg) { egg(1, p + 20, 96); bEgg = false; } p += 40 + rr(240, 300); }
      else if (k === 'rock') { add({ k: 'rock', lane: 1, x: Math.round(p), w: 36, h: 38 }); p += 36 + rr(250, 300); }
      else if (k === 'compy') { add({ k: 'compy', lane: 1, x: Math.round(p + 36), w: 26, h: 26, range: 30, ph: R() * 6.28, hop: 0, col: Math.floor(R() * 3) }); p += 100 + rr(220, 280); }
      else { add({ k: 'branch', lane: 1, x: Math.round(p), w: 70, h: 48, hang: true }); p += 70 + rr(210, 260); }
    }
    // Muddy Creek: an egg, then a big mud patch (dash through it!), puddles, roots, a second egg
    const m1 = Math.round(a + L * rr(0.22, 0.3)), m1w = Math.round(rr(260, 330));
    egg(2, m1 - rr(110, 150), 16);
    c.muds.push({ lane: 2, x0: m1, x1: m1 + m1w });
    let q = m1 + m1w + rr(150, 200);
    const ck = ['puddle', 'root', twist === 'geyser' ? 'geyser' : 'puddle'];
    if (!sprint && R() < 0.6) ck.push('mud');
    for (let i = ck.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ck[i], ck[j]] = [ck[j], ck[i]]; }
    let egg2 = false; const want2 = R() < 0.35;
    for (const k of ck) {
      if (q > b - 60) break;
      if (k === 'puddle') { add({ k: 'puddle', lane: 2, x: Math.round(q), w: Math.round(rr(56, 76)), h: 0 }); q += 70 + rr(170, 220); }
      else if (k === 'root') { add({ k: 'root', lane: 2, x: Math.round(q), w: 64, h: 46 }); q += 64 + rr(190, 240); }
      else if (k === 'geyser') { add({ k: 'geyser', lane: 2, x: Math.round(q), w: 44, h: 0, quiet: rr(1.5, 2.1), ph: R() * 4, cd: [0, 0] }); q += 44 + rr(220, 260); }
      else { const w = Math.round(rr(130, 180)); c.muds.push({ lane: 2, x0: Math.round(q), x1: Math.round(q + w) }); q += w + rr(170, 220); }
      if (!egg2 && want2 && q < b - 40 && R() < 0.6) { egg(2, q - rr(70, 100), 16); egg2 = true; }
    }
    if (!egg2 && want2) egg(2, Math.min(b - 30, q), 16);
  }
  // decorations (looks only): background trees, fireflies at night
  for (let tx = -400; tx < len + 1400; tx += 260 + R() * 260) c.trees.push({ x: Math.round(tx), h: 150 + R() * 140, kind: Math.floor(R() * 3), seed: Math.floor(R() * 1000) });
  if (twist === 'night') {
    for (const e of c.eggs) for (let k = 0; k < 4; k++) c.flies.push({ x: e.x + rr(-50, 50), y: P.laneY[e.lane] - e.h - rr(10, 70), ph: R() * 6.28, r: rr(14, 34) });
    for (let fx = 300; fx < len; fx += 140 + R() * 160) c.flies.push({ x: fx, y: rr(120, 440), ph: R() * 6.28, r: rr(20, 60) });
  }
  c.obs.sort((u, v) => u.x - v.x);
  c.eggs.sort((u, v) => u.x - v.x);
  c.gaps.sort((u, v) => u.x - v.x);
  return c;
}

/* ---------- the raptors ---------- */
function raptorMakeRider(k) {
  const P = RAPTOR;
  return { id: k, x: P.startX - k * 0, px: P.startX, y: P.laneY[1], vy: 0, lane: 1, air: false, coyote: 0, cutDone: false, jumpBuf: 0,
    base: P.cruise, v: P.cruise, dashT: 0, dashAdd: P.dashAdd, dashGold: false, egg: 0, holdT: 0, stumble: 0, stumbleKind: '',
    duck: false, splashT: 0, trans: null, pick: null, tail: 0, tailSaid: false, bumpCD: 0, finT: null, carried: 0, noEggT: 0, hopAir: false, groundT: 9,
    // looks only (never read by the rules)
    run: k * 1.7, popT: 9, pop: '', popCol: '#fff', tilt: 0, trailT: 0, dustT: 0, cheerT: -1, landT: 9, blink: 0 };
}
const raptorDashV = r => (r.dashT > 0 ? r.dashAdd * Math.min(1, (r.dashT0 - r.dashT) / RAPTOR.dashRamp + 0.25, r.dashT / 0.25) : 0);
// how high a raptor's feet are above its lane's ground
const raptorHAbove = r => RAPTOR.laneY[r.lane] - r.y;
const raptorHeight = r => (r.duck || r.dashT > 0 ? RAPTOR.duckH : RAPTOR.bodyH);
function raptorPop(r, text, col) { r.pop = text; r.popCol = col || '#ffffff'; r.popT = 0; }
function raptorStumble(st, r, kind, t, word, live) {
  const P = RAPTOR;
  r.stumble = Math.max(r.stumble, t); r.stumbleKind = kind; r.base = Math.min(r.base, kind === 'peep' ? r.base * P.peepMul : P.stumbleV);
  r.dashT = 0; r.duck = false;
  if (live) st.stat.stumbles[r.id]++;
  raptorPop(r, word, '#ffe2b0');
  rumble(r.id, 0.25, 0.45, 110);
}
// one raptor's run for one tick. inp: { jumpP, jumpH, up, duck, fast, slow } or null (no input: it just trots on)
function raptorRun(st, r, inp, dt, live) {
  const P = RAPTOR, c = st.c;
  r.px = r.x;
  r.bumpCD = Math.max(0, r.bumpCD - dt); r.splashT = Math.max(0, r.splashT - dt); r.noEggT -= dt;
  if (r.stumble > 0) r.stumble = Math.max(0, r.stumble - dt);
  if (r.dashT > 0) r.dashT = Math.max(0, r.dashT - dt);
  r.jumpBuf = Math.max(0, r.jumpBuf - dt);
  if (inp && inp.jumpP) r.jumpBuf = P.jumpBuf;
  // forward speed
  const tv = !inp ? P.cruise : inp.fast ? P.fast : inp.slow ? P.slow : P.cruise;
  if (r.stumble > 0) r.base = Math.min(r.base, tv);
  else r.base = approach(r.base, tv, (r.base < tv ? P.accX : P.decX) * dt);
  const grounded = !r.air && !r.trans;
  r.duck = !!(inp && inp.duck && grounded && r.stumble <= 0);
  const mud = grounded && r.dashT <= 0 && raptorMudAt(c, r.lane, r.x);
  // (dropping through a treetop gap: mostly straight down, so it falls into the gap rather than through the branch)
  let v = r.base * (r.trans && r.trans.kind === 'fall' ? 0.4 : r.lane === 0 ? P.highMul : 1) * (r.duck ? P.duckMul : 1) * (mud ? P.mudMul : 1) * (r.splashT > 0 ? P.splashMul : 1) * (r.air && r.hopAir ? P.airMul : 1);
  v += raptorDashV(r) + r.tail;
  r.v = v; r.inMud = !!mud;
  r.x += v * dt;
  // forks: by the sign, jump (or stick up) picks the Treetops and ▼ picks the Creek; the pick happens at the fork
  // (fpx: where the last fork check left off. The camera's left edge, or a bump, can carry a raptor over a fork line after
  // its own step, and the crossing used to be missed: it stayed on the creek/treetop level past the fork's end)
  const fpx = r.chk != null && r.chk <= r.px ? r.chk : r.px;
  for (const f of c.forks) {
    if (r.lane === 1 && !r.trans && inp && r.x >= f.x0 - P.forkZone && r.x < f.x0) {
      if (inp.jumpP || inp.up) r.pick = 0;
      else if (inp.duck) r.pick = 2;
    }
    if (fpx < f.x0 && r.x >= f.x0 && r.lane === 1 && !r.trans) {
      if (r.pick === 0) { raptorTrans(r, 0, P.transUp, 'up'); raptorPop(r, 'Treetops!', '#d8ffb0'); Sfx.play('raptorUp', r.id); }
      else if (r.pick === 2) { raptorTrans(r, 2, P.transDown, 'slide'); raptorPop(r, 'Splish!', '#ffe0b0'); Sfx.play('raptorSlide', r.id); }
      if (live) st.stat.paths[r.id][r.pick == null ? 1 : r.pick]++;
      r.pick = null;
    }
    if (fpx < f.x1 && r.x >= f.x1 && (r.trans ? r.trans.lane !== 1 : r.lane !== 1)) {
      raptorTrans(r, 1, r.lane === 0 ? P.transDown : P.transUp, r.lane === 0 ? 'down' : 'climb');
      Sfx.play(r.lane === 0 ? 'raptorSlide' : 'raptorUp', r.id);
    }
  }
  r.chk = r.x;
  // up and down
  if (r.trans) {
    const T = r.trans; T.t += dt;
    const k = clamp(T.t / T.dur, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    r.y = T.y0 + (T.y1 - T.y0) * e - Math.sin(k * Math.PI) * T.arc;
    if (k >= 1) {
      r.lane = T.lane; r.y = P.laneY[T.lane]; r.vy = 0; r.air = false; r.trans = null; r.landT = 0; r.coyote = 0; r.hopAir = false; r.groundT = P.pushOff;
      if (T.kind === 'fall') { r.base *= P.fallMul; raptorPop(r, 'Boing! On a leaf', '#d8ffb0'); Sfx.play('raptorBoing', r.id); raptorDust(st, r.x, r.y, 6, 'rgba(140,210,90,0.9)'); }
      else { Sfx.play('raptorLand', r.id); raptorDust(st, r.x, r.y, 4, 'rgba(240,220,180,0.9)'); }
    }
  } else {
    const gy = raptorGroundAt(c, r.lane, r.x);
    if (!r.air) {
      if (gy == null) { r.coyote += dt; if (r.coyote > P.coyote) { r.air = true; r.vy = 0; } }
      else r.coyote = 0;
      if (r.jumpBuf > 0 && r.stumble <= 0.15 && r.groundT >= P.pushOff) {
        r.air = true; r.vy = -P.jumpV; r.jumpBuf = 0; r.cutDone = false; r.coyote = 0; r.duck = false; r.hopAir = true;
        Sfx.play('raptorHop', r.id); raptorDust(st, r.x - 10, r.y, 3, 'rgba(240,220,180,0.8)');
      }
    }
    if (r.air) {
      if (r.vy < 0 && !r.cutDone && inp && !inp.jumpH && r.dashT <= 0) { r.vy *= P.cut; r.cutDone = true; }
      r.vy += P.g * dt; r.y += r.vy * dt;
      const ceil = raptorCeilAt(c, r.lane, r.x), hh = P.bodyH;
      if (r.y - hh < ceil) { r.y = ceil + hh; if (r.vy < 0) r.vy = 0; }
      const g2 = raptorGroundAt(c, r.lane, r.x);
      if (g2 != null && r.y >= g2 && r.vy >= 0) {
        r.y = g2; r.vy = 0; r.air = false; r.landT = 0; r.groundT = 0; r.hopAir = false; Sfx.play('raptorLand', r.id); raptorDust(st, r.x, r.y, 4, 'rgba(240,220,180,0.85)');
      } else if (g2 == null && r.lane === 0 && r.y > P.laneY[0] + 22) {
        // missed the branch: drop down onto the bridge below (a big leaf breaks the fall)
        raptorTrans(r, 1, 0.42, 'fall'); r.trans.arc = 0;
        raptorPop(r, 'Whoops!', '#ffe2b0'); Sfx.play('raptorFall', r.id);
        if (live) st.stat.falls[r.id]++;
      }
    }
  }
  // looks
  r.run += dt * (4 + v / 45) * (r.air || r.trans ? 0.3 : 1);
  r.tilt += ((r.dashT > 0 ? 0.12 : r.stumble > 0 ? 0.22 : r.air ? clamp(r.vy / 1800, -0.2, 0.25) : 0) - r.tilt) * Math.min(1, dt * 10);
  r.landT += dt;
  if (!r.air && !r.trans) r.groundT += dt;
}
function raptorTrans(r, lane, dur, kind) {
  const P = RAPTOR;
  r.trans = { y0: r.y, y1: P.laneY[lane], t: 0, dur, kind, lane, arc: kind === 'up' ? 46 : kind === 'climb' ? 24 : kind === 'down' ? 30 : 8 };
  r.air = false; r.vy = 0; r.duck = false;
}
function raptorDash(st, r) {
  const P = RAPTOR;
  if (!r.egg) { if (r.noEggT <= 0) { Sfx.play('raptorNope', r.id); raptorPop(r, 'No egg!', '#e8e0d0'); r.noEggT = 0.5; } return; }
  const gold = r.egg === 2;
  r.egg = 0; r.dashT = r.dashT0 = gold ? P.goldDashT : P.dashT; r.dashAdd = gold ? P.goldDashAdd : P.dashAdd; r.dashGold = gold;
  r.stumble = 0; r.holdT = 0; r.base = Math.max(r.base, P.cruise);
  st.stat.dashes[r.id]++;
  raptorPop(r, gold ? 'GOLD DASH!' : 'DASH!', C.gold);
  Sfx.play('raptorDash', r.id); rumble(r.id, 0.25, 0.5, 140);
  for (let k = 0; k < 12; k++) { const a = raptorVR() * 6.28, s = 60 + raptorVR() * 140; raptorFx(st, r.x + 6, r.y - 40, Math.cos(a) * s - 60, Math.sin(a) * s, 0.5, k % 3 ? '#fff6dc' : '#f3d9a4', 3.5, 300, 'shell'); }
  st.vis.shock.push({ x: r.x, y: r.y - 30, t: 0 });
}

/* ---------- hazards, eggs, the other raptor ---------- */
// does the raptor at x overlap [a, b] (its body from just behind its feet to its chest)?
const raptorOver = (r, a, b) => r.x + 22 > a && r.x - 16 < b;
function raptorHazards(st, r, live) {
  const P = RAPTOR, c = st.c, t = st.t;
  if (r.trans) return;
  const h = raptorHAbove(r), top = h + raptorHeight(r), grounded = !r.air, dash = r.dashT > 0;
  for (const o of c.obs) {
    if (o.x > r.x + 40) break;
    if (o.x + o.w + (o.range || 0) < r.x - 40) continue;
    if (o.lane !== r.lane) continue;
    const id = r.id;
    switch (o.k) {
      case 'log': case 'rock': {
        if (o.gone || o.hit[id]) break;
        if (!o.passed[id] && r.x - 16 > o.x + o.w) { o.passed[id] = true; if (live) st.stat.hops[id]++; if (r.air && h > 6) { if (o.k === 'log' || raptorVR() < 0.5) raptorSparkle(st, o.x + o.w / 2, P.laneY[o.lane] - o.h - 8); } break; }
        if (raptorOver(r, o.x, o.x + o.w) && h < o.h - 2) {
          o.hit[id] = true; o.passed[id] = true;
          if (dash && o.k === 'log') { o.gone = true; o.goneT = 0; raptorPop(r, 'CRASH!', C.gold); Sfx.play('raptorCrash', r.id); raptorChips(st, o); if (live) st.stat.smash[id]++; }
          else if (dash) { r.vy = -420; r.air = true; r.cutDone = true; r.hopAir = false; raptorPop(r, 'Hup!', C.gold); Sfx.play('raptorHop', r.id); }
          else {
            if (o.k === 'log') { o.gone = true; o.goneT = 0; o.rollDir = 1; }
            else o.fx = 0.4;
            raptorStumble(st, r, 'log', P.stumbleT, o.k === 'log' ? 'Oof! Log!' : 'Oof! Rock!', live);
            Sfx.play('raptorStumble', r.id); raptorDust(st, r.x + 10, r.y, 8, 'rgba(220,190,140,0.9)');
            if (live && !st.hinted[id]) st.hinted[id] = 'jump';
          }
        }
        break;
      }
      case 'compy': {
        if (o.hop > 0 || o.hit[id]) break;
        const cx = raptorCompyX(o, t);
        if (r.x + 22 > cx - 13 && r.x - 16 < cx + 13 && h < o.h - 2) {
          o.hit[id] = true; o.hop = 1.2; o.hopDir = r.x < cx ? 1 : -1;
          if (dash) { raptorPop(r, 'Wheee!', '#d8ffb0'); Sfx.play('raptorPeep', r.id); }
          else { raptorStumble(st, r, 'peep', P.peepT, 'Peep! Sorry!', live); Sfx.play('raptorPeep', r.id); }
          for (let k = 0; k < 5; k++) raptorFx(st, cx, P.laneY[o.lane] - 18, (raptorVR() - 0.5) * 90, -60 - raptorVR() * 80, 0.6, '#ff9ec7', 2.5, 100, 'heart');
        } else if (!o.passed[id] && r.x - 16 > cx + 13) { o.passed[id] = true; if (live && h > 6) st.stat.hops[id]++; }
        break;
      }
      case 'branch': case 'vine': case 'root': {
        if (o.hit[id]) break;
        if (raptorOver(r, o.x, o.x + o.w) && top > o.h && h < o.h + 22 && !dash) {
          o.hit[id] = true; o.fx = 0.6;
          raptorStumble(st, r, 'bonk', P.bonkT, 'Bonk! Duck!', live);
          Sfx.play('raptorBonk', r.id);
          for (let k = 0; k < 6; k++) raptorFx(st, r.x + 18, P.laneY[o.lane] - o.h, (raptorVR() - 0.5) * 120, raptorVR() * 60, 0.8, raptorVR() < 0.5 ? '#6fbf4a' : '#9bdc5e', 3, 160, 'leaf');
          if (live && !st.hinted[id]) st.hinted[id] = 'duck';
        } else if (!o.passed[id] && r.x - 16 > o.x + o.w) { o.passed[id] = true; if (dash && !o.hit[id]) o.fx = 0.4; }
        break;
      }
      case 'puddle': {
        if (o.hit[id] || !grounded || dash) break;
        if (r.x > o.x + 4 && r.x < o.x + o.w - 4) {
          o.hit[id] = true; r.splashT = P.splashT; o.fx = 0.5;
          raptorPop(r, 'Splash!', '#bfe6ff'); Sfx.play('raptorSplash', r.id);
          if (live) st.stat.splashes[id]++;
          for (let k = 0; k < 9; k++) raptorFx(st, r.x, r.y - 4, (raptorVR() - 0.5) * 160, -80 - raptorVR() * 140, 0.6, raptorVR() < 0.5 ? '#9fd4ff' : '#e6f6ff', 3, 500);
        }
        break;
      }
      case 'fern': {
        if (!grounded || r.duck || r.stumble > 0) break;
        if (r.x > o.x + 6 && r.x < o.x + o.w - 6 && (!o.boing || o.boing[id] < t)) {
          o.boing = o.boing || [0, 0]; o.boing[id] = t + 0.6; o.sq[id] = 0.35;
          r.air = true; r.vy = -P.fernV; r.cutDone = true; r.jumpBuf = 0; r.hopAir = false;
          raptorPop(r, 'BOING!', '#d8ffb0'); Sfx.play('raptorFern', r.id);
          if (live) st.stat.boings[id]++;
          for (let k = 0; k < 6; k++) raptorFx(st, o.x + o.w / 2, P.laneY[1] - 10, (raptorVR() - 0.5) * 140, -100 - raptorVR() * 120, 0.7, raptorVR() < 0.5 ? '#6fbf4a' : '#c8f08a', 3, 300, 'leaf');
        }
        break;
      }
      case 'geyser': {
        if (o.cd[id] > t) break;
        const gs = raptorGeyserState(o, t);
        if (gs.s === 'blow' && gs.k < 0.92 && raptorOver(r, o.x + 4, o.x + o.w - 4) && h < P.geyserTop) {
          o.cd[id] = t + 1.4;
          // (never so high that the raptor leaves the top of the screen)
          r.air = true; r.vy = -Math.min(P.geyserV * (r.lane === 2 ? 0.55 : 1), Math.sqrt(2 * P.g * Math.max(0, r.y - 90))); r.cutDone = true; r.hopAir = false; r.base *= P.geyserMul; r.dashT = 0; r.stumble = 0.35; r.stumbleKind = 'whoosh';
          raptorPop(r, 'WHOOSH!', '#e6f6ff'); Sfx.play('raptorWhoosh', r.id); rumble(r.id, 0.25, 0.4, 120);
          if (live) { st.stat.whoosh[id]++; st.stat.stumbles[id]++; }
        }
        break;
      }
    }
  }
  // eggs: run (or hop) into one to pick it up; one at a time. Each raptor can take each egg once (the nest lays another
  // for the raptor behind), so the leader can't take them all
  for (const e of c.eggs) {
    if (e.got[r.id] || e.lane !== r.lane || Math.abs(e.x - r.x - 6) > 30) continue;
    const eh = e.h + Math.sin(st.t * 2.6 + e.ph) * (e.h > 40 ? 5 : 0);
    if (eh < h - P.eggR || eh > top + P.eggR) continue;
    if (r.egg) { if (!e.full || e.full < st.t) { e.full = st.t + 1; raptorPop(r, 'Paws full!', '#e8e0d0'); } continue; }
    e.got[r.id] = true; e.t = 0; e.pop = 0.4; r.egg = 1; r.holdT = 0;
    if (live) st.stat.eggs[r.id]++;
    raptorPop(r, 'Speed egg!', C.gold); Sfx.play('raptorEgg', r.id);
    for (let k = 0; k < 10; k++) { const a = raptorVR() * 6.28, sp = 50 + raptorVR() * 110; raptorFx(st, e.x, P.laneY[e.lane] - eh, Math.cos(a) * sp, Math.sin(a) * sp, 0.55, k % 3 ? C.gold : '#ffffff', 3, 0, 'spark'); }
  }
  // the trike herds: a trike on the trail blocks it (wait for a gap, or dash through one)
  for (const hd of c.herds) {
    if (r.lane !== 1 || r.x + 22 < hd.x0 - 4 || r.x - 16 > hd.x1 + 4) continue;
    if (!raptorHerdBlocks(hd, t) || h > 150) continue;
    // pushed out of the crossing: back to the near side, or on to the far side if nearly through
    const mid = (hd.x0 + hd.x1) / 2;
    if (r.x > mid + 30) { r.x = Math.max(r.x, hd.x1 + 18); continue; }
    r.x = Math.min(r.x, hd.x0 - 24);
    if (r.v > 140 || r.dashT > 0) {
      r.dashT = 0; r.stumble = Math.max(r.stumble, P.booT); r.stumbleKind = 'boop'; r.base = 40;
      raptorPop(r, 'Boop! Big trike!', '#ffe2b0'); Sfx.play('raptorBoop', r.id);
      if (live) { st.stat.boops[r.id]++; st.stat.stumbles[r.id]++; }
    } else r.base = Math.min(r.base, 60);
  }
}
// the two raptors bump a little in the same lane; jumping right over the other one is a "Leapfrog!"
function raptorBump(st, live) {
  const P = RAPTOR, [A, B] = st.riders;
  if (A.finT != null || B.finT != null || A.trans || B.trans || A.lane !== B.lane) return;
  const dx = B.x - A.x, was = Math.abs(B.px - A.px);
  if (Math.abs(dx) >= P.bumpDX) return;
  const hA = raptorHAbove(A), hB = raptorHAbove(B);
  if (Math.abs(hA - hB) > 40) {
    // jumping right over the other raptor
    for (const [r, o] of [[A, B], [B, A]]) if (r.px <= o.px && r.x > o.x && raptorHAbove(r) > raptorHAbove(o) + 30) { raptorPop(r, 'Leapfrog!', '#d8ffb0'); Sfx.play('raptorFrog', r.id); if (live) st.stat.frogs[r.id]++; }
    return;
  }
  // only a raptor that runs into the other one bumps (side by side at the start line is fine)
  if (was < P.bumpDX - 0.5 || A.bumpCD > 0 || B.bumpCD > 0) return;
  A.bumpCD = B.bumpCD = P.bumpCD;
  const da = A.dashT > 0, db = B.dashT > 0;
  const back = da !== db ? (da ? B : A) : (A.x < B.x ? A : B), front = back === A ? B : A;
  back.base = Math.max(P.slow * 0.8, back.base - (da !== db ? 100 : 40)); back.x -= 6; front.x += 4;
  if (live) st.stat.bumps++;
  const mx = (A.x + B.x) / 2 + 10, my = (A.y + B.y) / 2 - 40;
  st.vis.words.push({ x: mx, y: my, text: da !== db ? 'BONK!' : 'Bump!', t: 0, col: '#ffffff' });
  Sfx.play('raptorBump'); rumble(0, 0.2, 0.3, 70); rumble(1, 0.2, 0.3, 70);
  for (let k = 0; k < 6; k++) { const a = raptorVR() * 6.28; raptorFx(st, mx, my + 10, Math.cos(a) * 120, Math.sin(a) * 120, 0.3, k % 2 ? '#fff6c8' : C.gold, 2.5, 0); }
}
// a compy's x at time t (it potters back and forth, and hops off the path after a bump)
function raptorCompyX(o, t) { return o.x + Math.sin(t * 1.6 + o.ph) * o.range + (o.hop > 0 ? (1.2 - o.hop) * 60 * (o.hopDir || 1) : 0); }
// catch-up: a raptor far behind gets gold Zoomies (more the farther behind, up to tailMax)
function raptorCatchup(st, dt, live) {
  const P = RAPTOR, [A, B] = st.riders;
  for (const r of st.riders) {
    const o = r === A ? B : A, gap = o.x - r.x;
    const want = live && r.finT == null && o.finT == null && !st.sd ? clamp((gap - P.tailGap) * P.tailK, 0, P.tailMax) : 0;
    r.tail = approach(r.tail, want, 120 * dt);
    if (live && r.tail > P.tailShow && !r.tailSaid) { r.tailSaid = true; raptorPop(r, 'Gold zoomies!', C.gold); Sfx.play('raptorZoomies', r.id); st.stat.tails[r.id]++; }
    if (r.tail <= 0) r.tailSaid = false;
  }
}
// the shared camera: follows the pair, keeps the leader off the right edge, and the left edge carries the trailer along
function raptorCamera(st, dt, snap) {
  const P = RAPTOR, [A, B] = st.riders, cam = st.cam;
  const lead = Math.max(A.x, B.x), avg = (A.x + B.x) / 2;
  const want = Math.max(avg - P.camAvg, lead - P.camLead, 0);
  cam.x = snap ? want : cam.x + (want - cam.x) * Math.min(1, dt * 5);
  cam.x = Math.max(cam.x, lead - (W - P.camLeadMax));
  for (const r of st.riders) if (r.x < cam.x + P.edgeL) { r.x = cam.x + P.edgeL; r.carried = 0.2; }
  for (const r of st.riders) r.carried = Math.max(0, (r.carried || 0) - dt);
}

/* ---------- looks: effects that never touch the rules ---------- */
function raptorFx(st, x, y, vx, vy, life, col, size, grav, kind) {
  const v = st.vis; if (!v) return;
  v.fx.push({ x, y, vx, vy, life, max: life, col, size, grav, kind: kind || 'dot', rot: raptorVR() * 6 });
  if (v.fx.length > 420) v.fx.splice(0, v.fx.length - 420);
}
function raptorDust(st, x, y, n, col) { for (let k = 0; k < n; k++) raptorFx(st, x + (raptorVR() - 0.5) * 16, y - 3, -40 - raptorVR() * 70, -20 - raptorVR() * 50, 0.4, col, 3 + raptorVR() * 3, 120); }
function raptorSparkle(st, x, y) { for (let k = 0; k < 4; k++) raptorFx(st, x + (raptorVR() - 0.5) * 20, y, (raptorVR() - 0.5) * 60, -30 - raptorVR() * 50, 0.45, k % 2 ? '#fff6c8' : C.gold, 2.6, 0, 'spark'); }
function raptorChips(st, o) {
  for (let k = 0; k < 12; k++) raptorFx(st, o.x + o.w / 2, RAPTOR.laneY[o.lane] - o.h / 2, 40 + raptorVR() * 220, -80 - raptorVR() * 220, 0.8, raptorVR() < 0.5 ? '#a8693a' : '#d9a066', 4, 700, 'chip');
}
function raptorVisNew() { return { fx: [], words: [], shock: [], puffs: [], bubT: 0 }; }
function raptorVisTick(st, dt) {
  const v = st.vis; if (!v) return;
  for (const q of v.fx) { q.life -= dt; q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += dt * 6; }
  v.fx = v.fx.filter(q => q.life > 0);
  const age = (arr, life) => { for (const e of arr) e.t += dt; return arr.filter(e => e.t < life); };
  v.words = age(v.words, 0.8); v.shock = age(v.shock, 0.45); v.puffs = age(v.puffs, 2.6);
  if (!st.riders || !st.c) return;
  for (const o of st.c.obs) {
    if (o.fx > 0) o.fx = Math.max(0, o.fx - dt);
    if (o.gone) o.goneT = (o.goneT || 0) + dt;
    if (o.k === 'compy' && o.hop > 0) o.hop = Math.max(0, o.hop - dt);
    if (o.sq) for (const k of [0, 1]) if (o.sq[k] > 0) o.sq[k] = Math.max(0, o.sq[k] - dt);
  }
  for (const e of st.c.eggs) e.t += dt;
  for (const r of st.riders) {
    r.popT += dt;
    if (r.cheerT >= 0) r.cheerT += dt;
    // a dust trail while running fast, sparkles while dashing (gold with zoomies)
    r.trailT -= dt;
    if (r.trailT <= 0) {
      const dash = r.dashT > 0, gold = dash && r.dashGold || r.tail > RAPTOR.tailShow;
      r.trailT = dash ? 0.015 : gold ? 0.03 : 0.09;
      if (dash || gold) raptorFx(st, r.x - 40 + (raptorVR() - 0.5) * 8, r.y - 26 + (raptorVR() - 0.5) * 24, -60 - raptorVR() * 50, (raptorVR() - 0.5) * 30, 0.5,
        gold ? (raptorVR() < 0.5 ? C.gold : '#fff6c8') : (raptorVR() < 0.5 ? RAPTOR_DINO[r.id].feather : '#ffffff'), gold ? 2.8 : 2.3, 0, 'spark');
      else if (!r.air && !r.trans && r.v > 200) raptorFx(st, r.x - 18, r.y - 3, -30 - raptorVR() * 40, -10 - raptorVR() * 30, 0.35, r.inMud ? 'rgba(120,80,40,0.8)' : r.lane === 2 ? 'rgba(190,225,255,0.8)' : 'rgba(230,205,160,0.7)', 2.5 + raptorVR() * 2, 80);
    }
  }
  // geyser bubbles and steam puffs (looks)
  v.bubT -= dt;
  if (v.bubT <= 0) {
    v.bubT = 0.06;
    for (const o of st.c.obs) if (o.k === 'geyser' && o.x > st.cam.x - 60 && o.x < st.cam.x + W + 60) {
      const gs = raptorGeyserState(o, st.t), gy = RAPTOR.laneY[o.lane];
      if (gs.s === 'bubble') raptorFx(st, o.x + 8 + raptorVR() * (o.w - 16), gy - 6, (raptorVR() - 0.5) * 20, -40 - raptorVR() * 50, 0.5, 'rgba(240,250,255,0.85)', 2.5 + raptorVR() * 2, -20, 'bubble');
      if (gs.s === 'blow') v.puffs.push({ x: o.x + o.w / 2 + (raptorVR() - 0.5) * 18, y: gy - 10, t: 0, s: 0.8 + raptorVR() * 0.6, lane: o.lane });
    }
  }
  for (const pf of v.puffs) pf.y -= dt * (pf.lane === 2 ? 70 : 180);
}

/* ---------- the tick ---------- */
function raptorInput(p) {
  const i = p.input;
  return { jumpP: !!p.pendingJump, jumpH: !!i.jump, up: !!i.up, duck: !!i.down, fast: !!i.right && !i.left, slow: !!i.left && !i.right };
}
// live = the round is live; false during the round-end banner (the raptors trot on by themselves, nothing counts)
function raptorTick(dt, live) {
  const st = G.mst, P = RAPTOR;
  st.t += dt;
  // fresh presses: dash (the action)
  for (const r of st.riders) {
    const p = G.players[r.id];
    if (live && r.finT == null) {
      if (p.pendingAct) raptorDash(st, r);
      if (r.egg) r.holdT += dt;
    }
    r.inpNow = live && r.finT == null ? raptorInput(p) : null;
    p.pendingAct = false; p.pendingJump = false;
  }
  // in versus, who moves first alternates every tick so neither player wins every bump
  const order = G.tickN & 1 ? [st.riders[1], st.riders[0]] : st.riders;
  for (const r of order) {
    raptorRun(st, r, r.inpNow, dt, live);
    raptorHazards(st, r, live);
  }
  raptorBump(st, live);
  raptorCatchup(st, dt, live);
  raptorCamera(st, dt);
  // the finish line
  for (const r of st.riders) {
    if (r.finT == null && r.x >= st.c.len) {
      const v = Math.max(1, r.v);
      r.finT = st.t - (r.x - st.c.len) / v;
      if (live || (G.match && G.match.phase === 'end')) {
        const rt = r.finT - st.t0;
        if (st.stat.best[r.id] == null || rt < st.stat.best[r.id]) st.stat.best[r.id] = rt;
      }
      st.gateFlash = 0.6;
      if (!st.fin && live) st.fin = { first: r.id, wait: P.finWait };
      Sfx.play('raptorGate', r.id);
      for (let k = 0; k < 18; k++) { const a = raptorVR() * 6.28, sp = 80 + raptorVR() * 200; raptorFx(st, st.c.len, r.y - 40, Math.cos(a) * sp, Math.sin(a) * sp, 0.7, [C.gold, '#7ccf4f', RAPTOR_DINO[r.id].feather, '#ffffff'][k % 4], 3.5, 200, k % 2 ? 'spark' : 'dot'); }
    }
  }
  st.gateFlash = Math.max(0, (st.gateFlash || 0) - dt);
  raptorVisTick(st, dt);
  if (!live) { raptorCelebrate(st, dt); return; }
  if (st.fin) {
    st.fin.wait -= dt;
    const [A, B] = st.riders;
    if (st.fin.wait <= 0 || (A.finT != null && B.finT != null)) {
      if (A.finT != null && B.finT != null && Math.abs(A.finT - B.finT) <= P.photo) { matchRoundEnd(-1, 'Photo finish: a dead heat!'); return; }
      const w = A.finT != null && (B.finT == null || A.finT < B.finT) ? 0 : 1, l = st.riders[1 - w];
      // the margin: how long the other raptor still needs, at its speed, to reach the arch
      const margin = l.finT != null ? l.finT - st.riders[w].finT : (st.c.len - l.x) / Math.max(60, l.v) + (st.t - st.riders[w].finT);
      if (st.stat.closest == null || margin < st.stat.closest.m) st.stat.closest = { m: margin, w };
      const why = margin < 0.25 ? RAPTOR_DINO[w].name + ' wins by a nose!' : RAPTOR_DINO[w].name + ' first, by ' + margin.toFixed(1) + ' s!';
      if (matchRoundEnd(w, why)) st.cele = { id: w, t: 0 };
      return;
    }
  }
  // a safety bell: a round that somehow runs this long goes to whoever is farther along
  if (st.t - st.t0 > P.capT) {
    const [A, B] = st.riders;
    matchRoundEnd(Math.abs(A.x - B.x) < 2 ? -1 : A.x > B.x ? 0 : 1, 'Farther along at sunset!');
  }
}
// round won: the winner's raptor does a happy hop, the brachiosaurs cheer
function raptorCelebrate(st, dt) {
  const ce = st.cele; if (!ce) return;
  ce.t += dt;
  const w = st.riders[ce.id];
  if (ce.t >= 0.2 && w.cheerT < 0) { w.cheerT = 0; Sfx.play('raptorCheer'); }
}

MODES.raptor = {
  rand: Math.random,
  setup(st, L) {
    for (const row of L.grid) row.fill('.');
    st.stat = { hops: [0, 0], eggs: [0, 0], dashes: [0, 0], smash: [0, 0], stumbles: [0, 0], falls: [0, 0], splashes: [0, 0], boings: [0, 0],
      whoosh: [0, 0], boops: [0, 0], frogs: [0, 0], tails: [0, 0], paths: [[0, 0, 0], [0, 0, 0]], best: [null, null], closest: null, bumps: 0 };
    const mix = RAPTOR_MIX.slice();
    for (let i = mix.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [mix[i], mix[j]] = [mix[j], mix[i]]; }
    st.order = ['plain', ...mix];
    st.forceTwist = this.testTwist || null;
    st.hinted = [null, null]; st.hintAt = [0, 0]; // one jump / duck reminder per player per match, after their first stumble
    st.vis = raptorVisNew();
  },
  resetRound(n, info) {
    const st = G.mst, m = G.match;
    st.sd = !!info.suddenDeath;
    st.twist = info.suddenDeath ? 'sprint' : (st.forceTwist || st.order[Math.min(n, st.order.length) - 1]);
    st.c = raptorBuild(st.twist, () => this.rand());
    st.riders = [0, 1].map(k => raptorMakeRider(k));
    st.t = 0; st.t0 = 0; st.fin = null; st.cele = null; st.gateFlash = 0; st.goldSaid = false;
    st.vis = raptorVisNew();
    st.cam = { x: 0 };
    // a player 2+ rounds behind starts with a gold egg (not in a sudden-death sprint)
    const lead = m.wins[0] - m.wins[1];
    for (const k of [0, 1]) { const behind = k === 0 ? -lead : lead; st.riders[k].goldStart = !info.suddenDeath && behind >= RAPTOR.goldMin; if (st.riders[k].goldStart) st.riders[k].egg = 2; }
    // the raptors are the players: hide the platformer bodies every round (matchResetPlayers revives them)
    for (const p of G.players) Object.assign(p, { alive: false, respawnT: Infinity });
  },
  go() {
    const st = G.mst; st.t0 = st.t;
    for (const r of st.riders) raptorDust(st, r.x - 10, r.y, 8, 'rgba(240,220,180,0.9)');
    Sfx.play('raptorRoar');
  },
  step(dt) { raptorTick(dt, true); },
  idle(dt) {
    const st = G.mst, m = G.match; if (!st.riders) return;
    if (m.phase === 'end' && m.end && m.end.winner >= 0 && !st.cele) st.cele = { id: m.end.winner, t: 0 };
    if (m.phase === 'end') { raptorTick(dt, false); return; }
    // before GO: the raptors bounce on the spot at the start line, eager to go
    st.t += dt;
    for (const r of st.riders) { r.run += dt * 3; const p = G.players[r.id]; p.pendingAct = false; p.pendingJump = false; }
    raptorVisTick(st, dt);
    raptorCamera(st, dt, true);
    if (m.phase === 'count' && !st.goldSaid && m.t >= 0.05) {
      st.goldSaid = true;
      for (const r of st.riders) if (r.goldStart) { Sfx.play('raptorGold', r.id); for (let k = 0; k < 10; k++) { const a = raptorVR() * 6.28; raptorFx(st, r.x, r.y - 90, Math.cos(a) * 90, Math.sin(a) * 90, 0.5, C.gold, 3, 0, 'spark'); } }
    }
  },
  tiebreak() {
    // most hops this match, then fewer stumbles, then more speed eggs; all the same: run it again
    const s = G.mst.stat;
    if (s.hops[0] !== s.hops[1]) return { winner: s.hops[0] > s.hops[1] ? 0 : 1, reason: 'Most hops this match!' };
    if (s.stumbles[0] !== s.stumbles[1]) return { winner: s.stumbles[0] < s.stumbles[1] ? 0 : 1, reason: 'Fewest stumbles this match!' };
    if (s.eggs[0] !== s.eggs[1]) return { winner: s.eggs[0] > s.eggs[1] ? 0 : 1, reason: 'Most speed eggs this match!' };
    return -1;
  },
  draw() { raptorDrawWorld(); },
  drawTop() { raptorDrawTop(); },
  hud() { raptorHud(); },
  stats() {
    const s = G.mst.stat, f = t => (t == null ? '–' : t.toFixed(1)), g = t => (t == null ? '–' : String(Math.round(t)));
    const out = [
      { label: 'Hops', values: s.hops.slice() },
      { label: 'Egg dashes', values: s.dashes.slice() },
      { label: 'Stumbles', values: s.stumbles.slice() },
      // whole seconds here ("28.1 – 27.5" wraps onto two lines in a desktop tile); the line below gives the tenths
      { label: 'Best secs', values: [g(s.best[0]), g(s.best[1])] },
    ];
    const fast = s.best[0] == null && s.best[1] == null ? null : s.best[1] == null || (s.best[0] != null && s.best[0] <= s.best[1]) ? 0 : 1;
    const fastTxt = fast == null ? '' : ' Fastest: ' + NAMES[fast] + ' on ' + RAPTOR_DINO[fast].name + ', ' + f(s.best[fast]) + ' s.';
    if (s.closest) out.push((s.closest.m < 0.25 ? 'Closest finish: ' + NAMES[s.closest.w] + ' by a nose!' : 'Closest finish: ' + NAMES[s.closest.w] + ' by ' + s.closest.m.toFixed(1) + ' s.') + fastTxt);
    else if (fastTxt) out.push(fastTxt.trim());
    // favourite paths at the forks
    const fav = k => { const a = s.paths[k], mx = Math.max(a[0], a[1], a[2]); return mx > 0 ? RAPTOR_LANES[a.indexOf(mx)] : null; };
    const fp = fav(0), fb = fav(1);
    if (fp && fb) out.push(fp === fb ? 'Both raptors liked the ' + fp + ' best!' : 'Favourite paths: ' + NAMES[0] + ' the ' + fp + ', ' + NAMES[1] + ' the ' + fb + '.');
    return out;
  },
  // test access for the bot harness and the brain (no window globals)
  test: { RAPTOR, RAPTOR_TWISTS, build: raptorBuild, gapAt: raptorGapAt, groundAt: raptorGroundAt, ceilAt: raptorCeilAt, mudAt: raptorMudAt,
    geyserState: raptorGeyserState, trikes: raptorTrikes, herdBlocks: raptorHerdBlocks, herdWait: raptorHerdWait, compyX: raptorCompyX, forkAt: raptorForkAt },
};

/* ---------- drawing ---------- */
const RAPTOR_COLS = {
  dirt: '#b07a44', dirtDk: '#946233', dirtDk2: '#7d522b', grass: '#7ccf4f', grassDk: '#3f8f3a', grassHi: '#a8e86e',
  wall: '#6e4a2a', wallDk: '#573a20', mud: '#6b4426', mudHi: '#8a5a32', water: '#9b8a5a', waterHi: '#cfe8ee',
  bark: '#8a5a32', barkHi: '#a8743f', barkDk: '#6a4224', leaf: '#4f9a3f', leafHi: '#6fbf4a', leafDk: '#3a7a30',
  plank: '#c9925a', plankDk: '#7d5530', rope: '#e8d3a0', ropeDk: '#a8875a', hat: '#ecd9a4', hatDk: '#bfa46a',
  egg: '#fff4d6', eggSpot: '#3fb8a8', eggSpot2: '#ff9a3d', brachio: '#86c2ad', brachioDk: '#5f9a86', brachioSpot: '#a8dccb',
  trike: '#f0a35a', trikeDk: '#c9783a', frill: '#ff8a7a', horn: '#fff2d6',
};
function raptorStarShape(x, y, r, col, rot = 0) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + rot + i * Math.PI / 5, q = i % 2 ? r * 0.48 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  ctx.closePath(); ctx.fill();
}
function raptorEggShape(x, y, s, gold) {
  const K = RAPTOR_COLS;
  ctx.fillStyle = gold ? '#b9850f' : '#c8b48a'; ctx.beginPath(); ctx.ellipse(x, y + 0.8, 9.6 * s, 12.6 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = gold ? C.gold : K.egg; ctx.beginPath(); ctx.ellipse(x, y, 9 * s, 12 * s, 0, 0, Math.PI * 2); ctx.fill();
  // a zig-zag speed stripe and spots
  ctx.strokeStyle = gold ? '#fff3b0' : K.eggSpot2; ctx.lineWidth = 2.2 * s; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - 8 * s, y + 1 * s); ctx.lineTo(x - 4 * s, y - 3 * s); ctx.lineTo(x, y + 2 * s); ctx.lineTo(x + 4 * s, y - 3 * s); ctx.lineTo(x + 8 * s, y + 1 * s); ctx.stroke();
  ctx.fillStyle = gold ? '#fff3b0' : K.eggSpot;
  circle(x - 3 * s, y - 7 * s, 1.8 * s); ctx.fill(); circle(x + 4 * s, y - 8 * s, 1.3 * s); ctx.fill(); circle(x + 2 * s, y + 7 * s, 1.8 * s); ctx.fill(); circle(x - 5 * s, y + 6 * s, 1.2 * s); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(x - 3.5 * s, y - 5 * s, 2 * s, 3.4 * s, -0.3, 0, Math.PI * 2); ctx.fill();
}
function raptorDrawSky(st) {
  const cam = st.cam, night = st.c.twist === 'night';
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (night) { g.addColorStop(0, '#121838'); g.addColorStop(0.6, '#24305a'); g.addColorStop(1, '#3a4a6a'); }
  else { g.addColorStop(0, '#f6a85e'); g.addColorStop(0.45, '#ffd08a'); g.addColorStop(1, '#fff1c9'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (night) {
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 157.3 - cam.x * 0.02) % W + W) % W, sy = 10 + (i * 53) % 260, tw = 0.4 + 0.6 * Math.abs(Math.sin(G.clock * (0.7 + (i % 4) * 0.3) + i));
      ctx.globalAlpha = tw; ctx.fillStyle = '#fff6dc'; circle(sx, sy, i % 3 ? 1.1 : 1.7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const mx = 760 - ((cam.x * 0.02) % 1400);
    ctx.fillStyle = 'rgba(255,246,210,0.18)'; circle(mx, 90, 70); ctx.fill();
    ctx.fillStyle = '#fff4cf'; circle(mx, 90, 40); ctx.fill();
    ctx.fillStyle = '#121838'; circle(mx + 16, 82, 34); ctx.fill(); // a crescent moon
  } else {
    const sx = 720 - ((cam.x * 0.02) % 1400);
    const gl = ctx.createRadialGradient(sx, 120, 30, sx, 120, 170);
    gl.addColorStop(0, 'rgba(255,240,180,0.7)'); gl.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = gl; circle(sx, 120, 170); ctx.fill();
    ctx.fillStyle = '#fff3c0'; circle(sx, 120, 52); ctx.fill();
  }
  // the sleepy volcano far away, puffing little smoke clouds
  const vx = ((520 - cam.x * 0.05) % 2200 + 2200) % 2200 - 300;
  ctx.fillStyle = night ? '#2e3354' : '#c99a7a';
  ctx.beginPath(); ctx.moveTo(vx - 190, 330); ctx.lineTo(vx - 46, 168); ctx.quadraticCurveTo(vx, 158, vx + 46, 168); ctx.lineTo(vx + 190, 330); ctx.closePath(); ctx.fill();
  ctx.fillStyle = night ? '#3a3f66' : '#dcae8a'; ctx.beginPath(); ctx.moveTo(vx - 46, 168); ctx.quadraticCurveTo(vx, 158, vx + 46, 168); ctx.lineTo(vx + 22, 200); ctx.lineTo(vx - 8, 186); ctx.lineTo(vx - 30, 204); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,140,90,0.45)'; ctx.beginPath(); ctx.ellipse(vx, 166, 34, 6, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 4; i++) {
    const k = ((G.clock * 0.12 + i * 0.25) % 1), py = 150 - k * 120, px = vx + Math.sin(k * 5 + i) * 12 + k * 30;
    ctx.fillStyle = night ? 'rgba(200,205,235,' + (0.35 * (1 - k)) + ')' : 'rgba(255,255,255,' + (0.6 * (1 - k)) + ')';
    circle(px, py, 10 + k * 22); ctx.fill(); circle(px + 12 + k * 10, py + 4, 8 + k * 16); ctx.fill();
  }
  // pterodactyls gliding far away
  for (let i = 0; i < 2; i++) {
    const px = ((i * 520 + G.clock * (22 + i * 8) - cam.x * 0.08) % (W + 200) + W + 200) % (W + 200) - 100, py = 70 + i * 46 + Math.sin(G.clock * 0.8 + i) * 8, f = Math.sin(G.clock * 3 + i * 2) * 5;
    ctx.strokeStyle = night ? 'rgba(160,170,210,0.6)' : 'rgba(120,80,70,0.55)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px - 18, py - f); ctx.quadraticCurveTo(px - 8, py - 6, px, py); ctx.quadraticCurveTo(px + 8, py - 6, px + 18, py - f); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 8, py - 2); ctx.stroke(); ctx.lineCap = 'butt';
  }
  // far hills, then a jungle line of palms and round trees
  const off = cam.x * 0.12;
  ctx.fillStyle = night ? '#253a4a' : C.hillFar; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 300 + Math.sin((x + off) * 0.005 + 1.2) * 26 + Math.sin((x + off) * 0.016) * 9);
  ctx.lineTo(W, H); ctx.fill();
  const off2 = cam.x * 0.3, JW = 110;
  for (let i = -1; i < W / JW + 2; i++) {
    const k = Math.floor(off2 / JW) + i, x = k * JW - off2 + raptorHash(k, 1) * 40, hh = 60 + raptorHash(k, 2) * 60;
    ctx.fillStyle = night ? '#1f3a3a' : C.hillNear;
    if (raptorHash(k, 3) < 0.45) { // a palm
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, 340); ctx.quadraticCurveTo(x - 10, 340 - hh * 0.6, x + 6, 330 - hh); ctx.stroke();
      for (let j = 0; j < 5; j++) { const a = -2.6 + j * 0.55; ctx.beginPath(); ctx.ellipse(x + 6 + Math.cos(a) * 20, 330 - hh + Math.sin(a) * 9 + 6, 22, 6, a, 0, Math.PI * 2); ctx.fill(); }
    } else { circle(x, 330 - hh * 0.6, 28 + hh * 0.25); ctx.fill(); circle(x + 26, 336 - hh * 0.45, 22 + hh * 0.2); ctx.fill(); }
  }
  ctx.fillStyle = night ? '#1f3a3a' : C.hillNear; ctx.fillRect(0, 330, W, 30);
}
// a background tree near the trail (parallax 0.6)
function raptorDrawBgTree(t, sx, night) {
  const K = RAPTOR_COLS, base = 354;
  ctx.globalAlpha = 0.9;
  if (t.kind === 1) { // a tall palm
    ctx.strokeStyle = night ? '#3a3a3a' : '#8a6a42'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, base); ctx.quadraticCurveTo(sx + 20, base - t.h * 0.6, sx + 4, base - t.h); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = night ? '#24463a' : '#4f9a3f';
    for (let j = 0; j < 6; j++) { const a = -Math.PI + j * 0.62 + Math.sin(G.clock + t.seed) * 0.05; ctx.beginPath(); ctx.ellipse(sx + 4 + Math.cos(a) * 30, base - t.h + Math.sin(a) * 12 + 10, 34, 8, a, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = night ? '#5a4a2a' : '#8a5a32'; circle(sx + 2, base - t.h + 8, 6); ctx.fill(); circle(sx + 10, base - t.h + 10, 5); ctx.fill();
  } else if (t.kind === 2) { // a clump of giant ferns
    ctx.fillStyle = night ? '#22403a' : '#5fae48';
    for (let j = 0; j < 7; j++) { const a = -Math.PI * 0.95 + j * 0.31; ctx.beginPath(); ctx.ellipse(sx + Math.cos(a) * 34, base - 30 + Math.sin(a) * 40, 36, 9, a, 0, Math.PI * 2); ctx.fill(); }
  } else { // a round jungle tree
    ctx.fillStyle = night ? '#3a3226' : K.barkDk; ctx.fillRect(sx - 9, base - t.h * 0.7, 18, t.h * 0.7);
    ctx.fillStyle = night ? '#203a30' : K.leafDk; circle(sx, base - t.h * 0.75, 46); ctx.fill();
    ctx.fillStyle = night ? '#284a3a' : K.leaf; circle(sx - 22, base - t.h * 0.8, 32); ctx.fill(); circle(sx + 24, base - t.h * 0.72, 30); ctx.fill();
    if (!night && t.seed % 3 === 0) { ctx.fillStyle = '#ff8fa8'; for (let j = 0; j < 4; j++) { circle(sx - 30 + j * 20, base - t.h * 0.8 + (j % 2) * 16, 4); ctx.fill(); } }
  }
  ctx.globalAlpha = 1;
}
// the earth of the trail (open stretches)
function raptorDrawEarth(x0, x1, cam) {
  const K = RAPTOR_COLS, gy = RAPTOR.laneY[1];
  const a = Math.max(x0, cam.x - 20), b = Math.min(x1, cam.x + W + 20);
  if (b <= a) return;
  ctx.fillStyle = K.dirt; ctx.fillRect(a, gy, b - a, H - gy);
  ctx.fillStyle = K.dirtDk; ctx.fillRect(a, gy + 52, b - a, 26); ctx.fillStyle = K.dirtDk2; ctx.fillRect(a, gy + 120, b - a, H);
  // pebbles and a cute little fossil now and then
  const k0 = Math.floor(a / 70), k1 = Math.ceil(b / 70);
  for (let k = k0; k <= k1; k++) {
    const px = k * 70 + raptorHash(k, 7) * 50, py = gy + 24 + raptorHash(k, 8) * 120;
    if (px < x0 + 8 || px > x1 - 8) continue;
    if (raptorHash(k, 9) < 0.08) { // a fossil bone
      ctx.strokeStyle = '#f0e2c0'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px - 9, py); ctx.lineTo(px + 9, py - 3); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = '#f0e2c0'; for (const [dx, dy] of [[-10, -2], [-10, 2], [10, -5], [10, -1]]) { circle(px + dx, py + dy, 2.8); ctx.fill(); }
    } else { ctx.fillStyle = raptorHash(k, 10) < 0.5 ? 'rgba(80,50,30,0.35)' : 'rgba(255,230,190,0.25)'; ctx.beginPath(); ctx.ellipse(px, py, 5 + raptorHash(k, 11) * 5, 3 + raptorHash(k, 12) * 2, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  // grass on top, with tufts
  ctx.fillStyle = K.grassDk; ctx.fillRect(a, gy - 2, b - a, 12);
  ctx.fillStyle = K.grass; ctx.fillRect(a, gy - 4, b - a, 9);
  ctx.fillStyle = K.grassHi; ctx.fillRect(a, gy - 4, b - a, 2.5);
  ctx.fillStyle = K.grass;
  for (let k = Math.floor(a / 26); k <= Math.ceil(b / 26); k++) {
    const tx = k * 26 + raptorHash(k, 3) * 12; if (tx < x0 + 4 || tx > x1 - 4) continue;
    ctx.beginPath(); ctx.moveTo(tx - 5, gy - 2); ctx.lineTo(tx - 1, gy - 10 - raptorHash(k, 4) * 6); ctx.lineTo(tx + 1, gy - 2); ctx.lineTo(tx + 4, gy - 8 - raptorHash(k, 5) * 5); ctx.lineTo(tx + 7, gy - 2); ctx.fill();
  }
}
// a fork: the gully with the Muddy Creek, the big trees and the Treetops branch walk
function raptorDrawForkBack(st, f) {
  const K = RAPTOR_COLS, P = RAPTOR, cam = st.cam, gy = P.laneY[1], cy = P.laneY[2], hy = P.laneY[0];
  const a = Math.max(f.x0, cam.x - 40), b = Math.min(f.x1, cam.x + W + 40);
  // the gully: a shady back wall with hanging roots, the creek bed
  ctx.fillStyle = K.wall; ctx.fillRect(a, gy, b - a, cy - gy);
  ctx.fillStyle = K.wallDk; ctx.fillRect(a, gy, b - a, 22);
  for (let k = Math.floor(a / 48); k <= Math.ceil(b / 48); k++) {
    const rx = k * 48 + raptorHash(k, 21) * 30; if (rx < f.x0 + 20 || rx > f.x1 - 20) continue;
    ctx.strokeStyle = 'rgba(40,24,12,0.5)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(rx, gy + 16); ctx.quadraticCurveTo(rx + 6, gy + 40, rx - 2, gy + 40 + raptorHash(k, 22) * 40); ctx.stroke();
  }
  ctx.fillStyle = K.water; ctx.fillRect(a, cy - 6, b - a, H - cy + 6);
  ctx.fillStyle = K.mud; ctx.fillRect(a, cy + 22, b - a, H);
  ctx.strokeStyle = 'rgba(207,232,238,0.55)'; ctx.lineWidth = 2;
  for (let k = Math.floor(a / 60); k <= Math.ceil(b / 60); k++) {
    const wx = k * 60 + ((G.clock * 20) % 60), wy = cy + 4 + (((k % 3) + 3) % 3) * 6;
    if (wx < f.x0 + 10 || wx > f.x1 - 30) continue;
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + 8, wy - 3, wx + 16, wy); ctx.stroke();
  }
  // banks: a slide down into the creek at the start, a ramp up out of it at the end
  ctx.fillStyle = K.dirt;
  ctx.beginPath(); ctx.moveTo(f.x0 - 1, gy); ctx.quadraticCurveTo(f.x0 + 40, gy + 30, f.x0 + 70, cy - 4); ctx.lineTo(f.x0 - 1, cy - 4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(f.x1 + 1, gy); ctx.quadraticCurveTo(f.x1 - 40, gy + 30, f.x1 - 70, cy - 4); ctx.lineTo(f.x1 + 1, cy - 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = K.dirtDk; ctx.fillRect(f.x0 - 1, cy - 4, 70, H); ctx.fillRect(f.x1 - 69, cy - 4, 70, H);
  // the big trees at each end, with leafy tops
  for (const tx of [f.x0 - 34, f.x1 + 34]) {
    if (tx < cam.x - 140 || tx > cam.x + W + 140) continue;
    ctx.fillStyle = K.barkDk; rr(tx - 36, 40, 72, gy - 40 + 4, 14); ctx.fill();
    ctx.fillStyle = K.bark; rr(tx - 30, 40, 52, gy - 40, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(60,34,16,0.4)'; ctx.lineWidth = 2;
    for (let yy = 80; yy < gy - 10; yy += 34) { ctx.beginPath(); ctx.moveTo(tx - 20, yy); ctx.quadraticCurveTo(tx - 6, yy + 8, tx + 10, yy); ctx.stroke(); }
    ctx.fillStyle = K.barkDk; ctx.beginPath(); ctx.ellipse(tx - 4, 270, 9, 13, 0, 0, Math.PI * 2); ctx.fill(); // a knot hole
    ctx.fillStyle = K.leafDk; circle(tx, 46, 64); ctx.fill();
    ctx.fillStyle = K.leaf; circle(tx - 40, 56, 44); ctx.fill(); circle(tx + 42, 50, 40); ctx.fill(); circle(tx, 20, 46); ctx.fill();
    ctx.fillStyle = K.leafHi; circle(tx - 20, 20, 18); ctx.fill(); circle(tx + 30, 34, 14); ctx.fill();
    // roots at the foot
    ctx.fillStyle = K.bark; ctx.beginPath(); ctx.moveTo(tx - 50, gy + 2); ctx.quadraticCurveTo(tx - 30, gy - 24, tx - 20, gy - 40); ctx.lineTo(tx + 20, gy - 40); ctx.quadraticCurveTo(tx + 30, gy - 24, tx + 50, gy + 2); ctx.closePath(); ctx.fill();
  }
  // lianas from the canopy holding up the branch walk
  ctx.strokeStyle = '#5a8a3a'; ctx.lineWidth = 3;
  for (let lx = f.x0 + 240; lx < f.x1 - 120; lx += 330) {
    if (lx < cam.x - 30 || lx > cam.x + W + 30) continue;
    ctx.beginPath(); ctx.moveTo(lx - 30, 0); ctx.quadraticCurveTo(lx - 10, hy * 0.6, lx, hy + 4); ctx.stroke();
    ctx.fillStyle = K.leafHi; for (let j = 1; j < 4; j++) { ctx.beginPath(); ctx.ellipse(lx - 24 + j * 6, hy * j / 4, 6, 3, 0.6, 0, Math.PI * 2); ctx.fill(); }
  }
  // the Treetops branch walk, broken by gaps
  const segs = [];
  let sx = f.x0 - 40;
  for (const g of st.c.gaps) if (g.x > f.x0 && g.x < f.x1) { segs.push([sx, g.x]); sx = g.x + g.w; }
  segs.push([sx, f.x1 + 40]);
  for (const [s0, s1] of segs) {
    if (s1 < cam.x - 20 || s0 > cam.x + W + 20) continue;
    ctx.fillStyle = K.barkDk; rr(s0, hy - 2, s1 - s0, P.walkT + 4, 9); ctx.fill();
    ctx.fillStyle = K.bark; rr(s0, hy - 3, s1 - s0, P.walkT, 8); ctx.fill();
    ctx.fillStyle = K.barkHi; rr(s0 + 4, hy - 3, s1 - s0 - 8, 5, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(60,34,16,0.35)'; ctx.lineWidth = 1.5;
    for (let xx = s0 + 18; xx < s1 - 10; xx += 46) { ctx.beginPath(); ctx.moveTo(xx, hy + 5); ctx.lineTo(xx + 16, hy + 7); ctx.stroke(); }
    // leafy tufts along the top, and at the broken ends
    for (let xx = s0 + 10; xx < s1 - 6; xx += 64) { ctx.fillStyle = K.leafHi; ctx.beginPath(); ctx.ellipse(xx + 8, hy - 4, 9, 4, -0.4, 0, Math.PI * 2); ctx.fill(); }
    for (const ex of [s0, s1]) { ctx.fillStyle = K.leaf; circle(ex, hy + 8, 10); ctx.fill(); ctx.fillStyle = K.leafHi; circle(ex + 3, hy + 4, 6); ctx.fill(); }
  }
}
// the rope bridge (drawn over the creek, behind the raptors)
function raptorDrawBridge(st, f) {
  const K = RAPTOR_COLS, P = RAPTOR, cam = st.cam, gy = P.laneY[1];
  const a = Math.max(f.x0, cam.x - 30), b = Math.min(f.x1, cam.x + W + 30);
  ctx.strokeStyle = K.ropeDk; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(a, gy + 6); ctx.lineTo(b, gy + 6); ctx.stroke();
  for (let px = Math.floor(a / 22) * 22; px < b; px += 22) {
    if (px < f.x0 || px > f.x1 - 18) continue;
    ctx.fillStyle = K.plankDk; rr(px, gy - 1, 19, P.bridgeT + 1, 3); ctx.fill();
    ctx.fillStyle = K.plank; rr(px, gy - 2, 19, P.bridgeT - 2, 3); ctx.fill();
  }
  // posts and a sagging hand rope
  ctx.strokeStyle = K.rope; ctx.lineWidth = 2.5;
  const step = 300;
  for (let px = f.x0; px < f.x1; px += step) {
    const q = Math.min(f.x1, px + step);
    if (q < cam.x - 30 || px > cam.x + W + 30) continue;
    ctx.strokeStyle = K.rope; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(px, gy - 34); ctx.quadraticCurveTo((px + q) / 2, gy - 2, q, gy - 34); ctx.stroke();
    ctx.lineWidth = 1.5;
    for (let vx = px + 30; vx < q - 10; vx += 30) { const u = (vx - px) / (q - px), ry = gy - 34 + 32 * 2 * u * (1 - u); ctx.beginPath(); ctx.moveTo(vx, ry); ctx.lineTo(vx, gy); ctx.stroke(); }
    ctx.fillStyle = K.plankDk; rr(px - 3, gy - 40, 6, 42, 3); ctx.fill();
  }
}
function raptorDrawSign(st, sg) {
  const gy = RAPTOR.laneY[1], x = sg.x;
  ctx.fillStyle = '#6a4224'; ctx.fillRect(x - 3, gy - 100, 6, 100);
  const board = (y, label, col) => {
    ctx.save(); ctx.translate(x + 4, y);
    ctx.fillStyle = '#c9925a'; ctx.beginPath(); ctx.moveTo(-8, -11); ctx.lineTo(76, -11); ctx.lineTo(88, 0); ctx.lineTo(76, 11); ctx.lineTo(-8, 11); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7d5530'; ctx.lineWidth = 2; ctx.stroke();
    text(label, 38, 0.5, 12, col, 'center', 'body');
    ctx.restore();
  };
  board(gy - 90, '▲ Treetops', '#2f6a22');
  board(gy - 64, '▶ Trail', '#5a3a1a');
  board(gy - 38, '▼ Creek', '#2a4a7a');
  // the pick zone: gold chevrons on the path up to the fork
  for (let k = 0; k < 4; k++) {
    const cx = sg.x + 50 + k * 42, a = 0.35 + 0.35 * Math.max(0, Math.sin(G.clock * 4 - k));
    ctx.strokeStyle = 'rgba(255,197,61,' + a + ')'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 6, gy + 8); ctx.lineTo(cx + 2, gy + 13); ctx.lineTo(cx - 6, gy + 18); ctx.stroke();
  }
}
// the herd's crossing sign
function raptorDrawHerdSign(hd) {
  const gy = RAPTOR.laneY[1], x = hd.x0 - 120;
  ctx.fillStyle = '#6a4224'; ctx.fillRect(x - 2, gy - 62, 4, 62);
  ctx.save(); ctx.translate(x, gy - 78); ctx.rotate(Math.PI / 4);
  ctx.fillStyle = C.gold; rr(-19, -19, 38, 38, 5); ctx.fill(); ctx.strokeStyle = '#7d5530'; ctx.lineWidth = 2.5; rr(-19, -19, 38, 38, 5); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.translate(x, gy - 62); ctx.scale(0.2, 0.2); raptorDrawTrikeFace(0, 0, 0); ctx.restore();
}
function raptorDrawWorld() {
  const st = G.mst; if (!st.c || !st.cam) return;
  const cam = st.cam, c = st.c, P = RAPTOR, night = c.twist === 'night';
  raptorDrawSky(st);
  // background trees near the trail (parallax)
  for (const t of c.trees) { const sx = t.x - cam.x * 0.6; if (sx > -120 && sx < W + 120) raptorDrawBgTree(t, sx, night); }
  ctx.save(); ctx.translate(-cam.x, 0);
  // the brachiosaurs at the finish stand behind the trail
  raptorDrawArch(st, 'back');
  // earth between the forks, the forks themselves
  let x = -200;
  for (const f of c.forks) { raptorDrawEarth(x, f.x0, cam); x = f.x1; }
  raptorDrawEarth(x, c.len + 1200, cam);
  for (const f of c.forks) if (f.x1 + 120 > cam.x && f.x0 - 120 < cam.x + W) { raptorDrawForkBack(st, f); raptorDrawBridge(st, f); }
  // trunks for the low branches over the open trail (the branch itself is drawn in front of the raptors)
  for (const o of c.obs) if (o.k === 'branch' && !o.hang && o.x > cam.x - 140 && o.x < cam.x + W + 60) {
    const tx = o.x + o.w + 22, gy = P.laneY[1];
    ctx.fillStyle = RAPTOR_COLS.barkDk; rr(tx - 12, 60, 24, gy - 58, 8); ctx.fill();
    ctx.fillStyle = RAPTOR_COLS.bark; rr(tx - 9, 60, 16, gy - 60, 7); ctx.fill();
    ctx.fillStyle = RAPTOR_COLS.leafDk; circle(tx, 62, 40); ctx.fill(); ctx.fillStyle = RAPTOR_COLS.leaf; circle(tx - 22, 72, 26); ctx.fill(); circle(tx + 20, 54, 24); ctx.fill();
  }
  for (const sg of c.signs) if (sg.x > cam.x - 120 && sg.x < cam.x + W + 40) raptorDrawSign(st, sg);
  for (const hd of c.herds) if (hd.x0 > cam.x - 80 && hd.x0 - 120 < cam.x + W + 40) raptorDrawHerdSign(hd);
  // the start line
  if (P.startX + 60 > cam.x - 80) {
    const sx = P.startX + 36, gy = P.laneY[1];
    for (let k = 0; k < 4; k++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (k + j) % 2 ? '#ffffff' : '#2b2850'; ctx.fillRect(sx - 6 + j * 6, gy - 2 + k * 5, 6, 5); }
    ctx.fillStyle = '#6a4224'; ctx.fillRect(sx + 22, gy - 54, 4, 54);
    ctx.fillStyle = '#c9925a'; rr(sx - 8, gy - 74, 64, 24, 6); ctx.fill(); ctx.strokeStyle = '#7d5530'; ctx.lineWidth = 2; rr(sx - 8, gy - 74, 64, 24, 6); ctx.stroke();
    text('START', sx + 24, gy - 61.5, 13, '#3a2210', 'center');
  }
  ctx.restore();
}
// a front-view triceratops (for the herd and the crossing sign); (0, 0) = between its front feet
function raptorDrawTrikeFace(x, y, step) {
  const K = RAPTOR_COLS;
  ctx.save(); ctx.translate(x, y);
  // the frill, then the legs and body behind the head
  ctx.fillStyle = K.frill; ctx.beginPath(); ctx.ellipse(0, -96, 70, 52, 0, Math.PI, 0); ctx.lineTo(70, -84); ctx.quadraticCurveTo(0, -60, -70, -84); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffb3a8'; for (let k = -2; k <= 2; k++) { circle(k * 28, -128 + Math.abs(k) * 9, 6); ctx.fill(); }
  ctx.fillStyle = K.trikeDk; rr(-46, -40 - Math.max(0, step) * 6, 26, 40 + Math.max(0, step) * 6, 9); ctx.fill(); rr(20, -40 - Math.max(0, -step) * 6, 26, 40 + Math.max(0, -step) * 6, 9); ctx.fill();
  ctx.fillStyle = '#fff2d6'; for (const fx of [-38, -28, 28, 38]) { circle(fx, -2, 4); ctx.fill(); }
  ctx.fillStyle = K.trike; ctx.beginPath(); ctx.ellipse(0, -52, 52, 30, 0, 0, Math.PI * 2); ctx.fill();
  // the head with two brow horns and a little nose horn, all soft and round
  ctx.fillStyle = K.trike; ctx.beginPath(); ctx.ellipse(0, -80, 40, 36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = K.horn;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 14, -102); ctx.quadraticCurveTo(s * 30, -138, s * 22, -148); ctx.quadraticCurveTo(s * 18, -128, s * 4, -106); ctx.closePath(); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(-7, -70); ctx.quadraticCurveTo(0, -94, 7, -70); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd2a0'; ctx.beginPath(); ctx.ellipse(0, -60, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 16, -88, 8, 9, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = C.ink; for (const s of [-1, 1]) { circle(s * 16 + 1, -86, 4.2); ctx.fill(); }
  ctx.fillStyle = '#fff'; for (const s of [-1, 1]) { circle(s * 16 + 2.5, -88, 1.5); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -62, 12, 0.35, Math.PI - 0.35); ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(-28, -70, 7); ctx.fill(); circle(28, -70, 7); ctx.fill();
  ctx.restore();
}
function raptorDrawHerd(st, hd, front) {
  const P = RAPTOR, ds = raptorTrikes(hd, st.t), mid = (hd.x0 + hd.x1) / 2;
  ds.forEach((d, k) => {
    if (d == null) return;
    const y = P.trikeY0 + (P.trikeY1 - P.trikeY0) * d, isFront = y > P.laneY[1] + 2;
    if (isFront !== front) return;
    const s = 0.5 + 0.62 * d, step = Math.sin(st.t * 7 + k * 1.3);
    ctx.save(); ctx.translate(mid + (k - 1) * 8, y + Math.abs(step) * -3); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(0, 2, 60, 9, 0, 0, Math.PI * 2); ctx.fill();
    raptorDrawTrikeFace(0, 0, step);
    ctx.restore();
    if (raptorTrikeOn(d) && raptorVR() < 0.3) raptorFx(st, mid + (raptorVR() - 0.5) * 120, y - 4, (raptorVR() - 0.5) * 60, -30 - raptorVR() * 30, 0.5, 'rgba(230,205,160,0.7)', 4, 40);
  });
}
// the two brachiosaurs at the finish, nose to nose, holding the FINISH banner. part 'back' (behind) or 'front' (the banner)
function raptorDrawArch(st, part) {
  const c = st.c, gx = c.len, K = RAPTOR_COLS, fl = st.gateFlash > 0 ? st.gateFlash / 0.6 : 0;
  if (gx < st.cam.x - 420 || gx > st.cam.x + W + 420) return;
  const cheer = st.cele ? Math.abs(Math.sin(G.clock * 6)) * 8 : Math.sin(G.clock * 1.5) * 3;
  if (part === 'back') {
    for (const s of [-1, 1]) {
      const bx = gx + s * 250, by = 278;
      ctx.save(); ctx.translate(bx, 0); ctx.scale(-s, 1); // each one faces the arch
      // tail, legs, body
      ctx.fillStyle = K.brachioDk; ctx.beginPath(); ctx.moveTo(60, by + 4); ctx.quadraticCurveTo(140, by + 10, 170, by + 50 + Math.sin(G.clock * 2 + s) * 6); ctx.quadraticCurveTo(120, by + 34, 60, by + 30); ctx.closePath(); ctx.fill();
      for (const lx of [-58, -30, 32, 58]) { ctx.fillStyle = lx === -30 || lx === 32 ? K.brachioDk : K.brachio; rr(lx - 13, by, 26, 345 - by, 10); ctx.fill(); ctx.fillStyle = '#fff2d6'; for (const t of [-6, 0, 6]) { circle(lx + t, 344, 3); ctx.fill(); } }
      ctx.fillStyle = K.brachio; ctx.beginPath(); ctx.ellipse(0, by, 96, 54, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = K.brachioSpot; for (const [sx, sy, sr] of [[-30, -26, 10], [8, -36, 8], [40, -18, 12], [-56, -4, 7], [18, -8, 6]]) { circle(sx, by + sy, sr); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(-20, by - 30, 40, 12, -0.2, 0, Math.PI * 2); ctx.fill();
      // the long neck up and over, the head bending down to the arch
      ctx.strokeStyle = K.brachio; ctx.lineWidth = 34; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-60, by - 24); ctx.bezierCurveTo(-110, by - 120, -150, 150 - cheer, -214, 110 - cheer); ctx.stroke();
      ctx.strokeStyle = K.brachioSpot; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-70, by - 52); ctx.bezierCurveTo(-112, by - 130, -150, 140 - cheer, -200, 102 - cheer); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = K.brachio; ctx.beginPath(); ctx.ellipse(-222, 108 - cheer, 34, 22, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-224, 98 - cheer, 8, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink; circle(-227, 99 - cheer, 4); ctx.fill(); ctx.fillStyle = '#fff'; circle(-228.5, 97 - cheer, 1.4); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(-238, 112 - cheer, 11, 0.2, Math.PI - 0.6); ctx.stroke();
      ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(-212, 116 - cheer, 6); ctx.fill();
      ctx.fillStyle = K.brachioDk; circle(-250, 104 - cheer, 2); ctx.fill();
      ctx.restore();
    }
    // the finish line on the ground: checkered
    const gy = RAPTOR.laneY[1];
    for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (k + j) % 2 ? '#ffffff' : '#2b2850'; ctx.fillRect(gx - 6 + j * 6, gy - 3 + k * 5, 6, 5); }
    return;
  }
  // the FINISH banner hanging from their chins, swinging a little
  const sw = Math.sin(G.clock * 2) * 0.03, by = 140 - cheer;
  ctx.strokeStyle = RAPTOR_COLS.rope; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(gx - 40, by - 14); ctx.lineTo(gx - 52, by + 4); ctx.moveTo(gx + 40, by - 14); ctx.lineTo(gx + 52, by + 4); ctx.stroke();
  ctx.save(); ctx.translate(gx, by + 18); ctx.rotate(sw);
  ctx.fillStyle = 'rgba(28,26,54,0.9)'; rr(-58, -14, 116, 28, 10); ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; rr(-58, -14, 116, 28, 10); ctx.stroke();
  text('FINISH', 0, 0.5, 17, fl > 0 ? '#ffffff' : C.gold, 'center');
  ctx.restore();
}
// obstacles on the ground (behind the raptors)
function raptorDrawGroundThing(st, o, night) {
  const P = RAPTOR, gy = P.laneY[o.lane], t = st.t;
  if (o.k === 'log') {
    let x = o.x, y = gy, rot = 0, a = 1;
    if (o.gone) { const k = clamp(o.goneT / 0.8, 0, 1); x += k * 70; y -= Math.sin(k * Math.PI) * 26 + k * 20; rot = k * 3; a = 1 - k; if (a <= 0) return; }
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x + o.w / 2, y - o.h / 2); ctx.rotate(rot);
    ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(0, o.h / 2, o.w * 0.6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a4a26'; rr(-o.w / 2, -o.h / 2, o.w, o.h, 10); ctx.fill();
    ctx.fillStyle = '#9a6232'; rr(-o.w / 2 + 2, -o.h / 2 + 2, o.w - 4, o.h - 8, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(60,34,16,0.45)'; ctx.lineWidth = 1.5; for (const yy of [-6, 2]) { ctx.beginPath(); ctx.moveTo(-o.w / 2 + 6, yy); ctx.lineTo(o.w / 2 - 12, yy + 1); ctx.stroke(); }
    ctx.fillStyle = '#e0b07a'; ctx.beginPath(); ctx.ellipse(o.w / 2 - 4, 0, 7, o.h / 2 - 1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b07a44'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(o.w / 2 - 4, 0, 3.5, o.h / 4, 0, 0, Math.PI * 2); ctx.stroke();
    // a little mushroom on top (it glows at night)
    const mx = -6 + o.rot * 10;
    if (night) { ctx.fillStyle = 'rgba(140,255,220,0.35)'; circle(mx, -o.h / 2 - 6, 14); ctx.fill(); }
    ctx.fillStyle = '#fff2d6'; ctx.fillRect(mx - 1.5, -o.h / 2 - 7, 3, 7);
    ctx.fillStyle = night ? '#7affd8' : '#ff6b6b'; ctx.beginPath(); ctx.ellipse(mx, -o.h / 2 - 7, 7, 5, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(mx - 2.5, -o.h / 2 - 9, 1.2); ctx.fill(); circle(mx + 2.5, -o.h / 2 - 8.5, 1.1); ctx.fill();
    ctx.restore();
  } else if (o.k === 'rock') {
    const wob = o.fx > 0 ? Math.sin(o.fx * 50) * 2 : 0;
    ctx.save(); ctx.translate(o.x + o.w / 2 + wob, gy);
    ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(0, 0, o.w * 0.65, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7d736c'; ctx.beginPath(); ctx.moveTo(-o.w / 2 - 2, 0); ctx.quadraticCurveTo(-o.w / 2 - 2, -o.h, 0, -o.h); ctx.quadraticCurveTo(o.w / 2 + 4, -o.h, o.w / 2 + 2, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9a8f86'; ctx.beginPath(); ctx.moveTo(-o.w / 2 + 2, -2); ctx.quadraticCurveTo(-o.w / 2 + 2, -o.h + 3, 0, -o.h + 3); ctx.quadraticCurveTo(o.w / 2 - 2, -o.h + 4, o.w / 2 - 4, -6); ctx.closePath(); ctx.fill();
    if (night) { ctx.fillStyle = 'rgba(140,255,220,0.3)'; circle(-4, -o.h + 4, 16); ctx.fill(); }
    ctx.fillStyle = night ? '#7affd8' : '#7ccf4f'; ctx.beginPath(); ctx.ellipse(-4, -o.h + 4, 12, 5, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(40,30,30,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(6, -o.h + 10); ctx.lineTo(2, -o.h + 20); ctx.lineTo(8, -o.h + 26); ctx.stroke();
    ctx.restore();
  } else if (o.k === 'compy') {
    const cols = [['#7fd36a', '#4f9a3f'], ['#ffb86a', '#d9822b'], ['#8ad0ff', '#4a8ac8']][o.col];
    const cx = raptorCompyX(o, t), hopK = o.hop > 0 ? 1 - o.hop / 1.2 : 0;
    const hop = o.hop > 0 ? Math.sin(hopK * Math.PI) * 90 : Math.abs(Math.sin(t * 6 + o.ph)) * 5, a = o.hop > 0 ? 1 - hopK : 1;
    const face = Math.cos(t * 1.6 + o.ph) >= 0 ? 1 : -1;
    // it looks up at a raptor hopping over
    const over = st.riders.some(r => r.lane === o.lane && Math.abs(r.x - cx) < 60 && raptorHAbove(r) > 20);
    if (night) { ctx.fillStyle = 'rgba(200,255,160,0.3)'; circle(cx, gy - 16 - hop, 20); ctx.fill(); }
    ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, gy - hop); ctx.scale(face, 1);
    ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(0, hop, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = cols[1]; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-3, -8); ctx.lineTo(-5, 0); ctx.moveTo(3, -8); ctx.lineTo(5, 0); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-8, -12); ctx.quadraticCurveTo(-18, -14, -22, -20); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.ellipse(0, -13, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8, -22, 7.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; circle(10, over ? -25 : -23, 3.2); ctx.fill(); ctx.fillStyle = C.ink; circle(10.8, over ? -26.2 : -22.6, 1.7); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(11, -19, 2.5, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,140,0.55)'; circle(6, -19, 1.8); ctx.fill();
    ctx.restore();
  } else if (o.k === 'puddle') {
    const s = o.fx > 0 ? 1 + o.fx * 0.4 : 1;
    ctx.fillStyle = 'rgba(120,180,220,0.75)'; ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, gy + 2, o.w / 2 * s, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(230,246,255,0.8)'; ctx.lineWidth = 1.5;
    const k = (G.clock * 0.8 + o.x * 0.01) % 1; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, gy + 2, 6 + k * o.w * 0.4, 1.5 + k * 3, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  } else if (o.k === 'fern') {
    const sq = Math.max(o.sq[0], o.sq[1]), k = sq > 0 ? Math.sin((1 - sq / 0.35) * Math.PI) : 0;
    const sy = 1 - 0.45 * k + (sq > 0 ? 0 : Math.sin(G.clock * 3 + o.x) * 0.04);
    ctx.save(); ctx.translate(o.x + o.w / 2, gy); ctx.scale(1 + 0.25 * k, sy);
    ctx.fillStyle = '#3f8f3a';
    for (let j = 0; j < 6; j++) { const a = -Math.PI + 0.3 + j * (Math.PI - 0.6) / 5; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 22, -6 + Math.sin(a) * 20, 22, 6, a, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#7ccf4f';
    for (let j = 0; j < 5; j++) { const a = -Math.PI + 0.45 + j * (Math.PI - 0.9) / 4; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 18, -8 + Math.sin(a) * 18, 17, 4.5, a, 0, Math.PI * 2); ctx.fill(); }
    // the springy coil in the middle
    ctx.strokeStyle = '#e0ff9a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26); ctx.arc(5, -26, 5, Math.PI, Math.PI * 2.6); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.restore();
    if (sq <= 0 && Math.sin(G.clock * 4 + o.x) > 0.6) raptorStarShape(o.x + o.w / 2 + 14, gy - 40, 3, 'rgba(255,240,180,0.8)', G.clock);
  } else if (o.k === 'geyser') {
    const gs = raptorGeyserState(o, t), cx = o.x + o.w / 2, sh = gs.s === 'bubble' ? Math.sin(G.clock * 50) * 1.5 : 0;
    ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(cx, gy + 1, 30, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a7a6e'; for (const [dx, r] of [[-20, 9], [-8, 8], [6, 9], [19, 8]]) { circle(cx + dx + sh, gy - 3, r); ctx.fill(); }
    ctx.fillStyle = '#a89a8e'; for (const [dx, r] of [[-19, 5], [-7, 4], [7, 5], [18, 4]]) { circle(cx + dx + sh, gy - 6, r); ctx.fill(); }
    ctx.fillStyle = gs.s === 'quiet' ? '#5a4a3e' : '#cfe8ee'; ctx.beginPath(); ctx.ellipse(cx + sh, gy - 6, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
}
// a mud patch on the ground
function raptorDrawMud(st, m) {
  const gy = RAPTOR.laneY[m.lane], w = m.x1 - m.x0;
  ctx.fillStyle = RAPTOR_COLS.mud; ctx.beginPath(); ctx.ellipse(m.x0 + w / 2, gy + 3, w / 2 + 6, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = RAPTOR_COLS.mudHi;
  for (let k = 0; k < w / 40; k++) { const bx = m.x0 + 16 + k * 40 + raptorHash(k, m.x0) * 14, b = (G.clock * 0.9 + raptorHash(k, 3)) % 1; ctx.globalAlpha = 1 - b; circle(bx, gy + 1 - b * 6, 2 + b * 4); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(m.x0 + w * 0.35, gy, w * 0.2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
}
// things hanging overhead (drawn in front of the raptors): low branches, dangling twigs, vines, roots
function raptorDrawOverhead(st, o, night) {
  const K = RAPTOR_COLS, P = RAPTOR, gy = P.laneY[o.lane], bot = gy - o.h, wob = o.fx > 0 ? Math.sin(o.fx * 30) * 4 * o.fx : 0;
  if (o.k === 'branch' && !o.hang) {
    ctx.fillStyle = K.barkDk; rr(o.x - 14, bot - 18 + wob, o.w + 46, 16, 8); ctx.fill();
    ctx.fillStyle = K.bark; rr(o.x - 12, bot - 18 + wob, o.w + 40, 11, 6); ctx.fill();
    for (let k = 0; k < 4; k++) { const lx = o.x + 4 + k * (o.w - 8) / 3; ctx.fillStyle = k % 2 ? K.leaf : K.leafHi; ctx.beginPath(); ctx.ellipse(lx, bot - 4 + wob + (k % 2) * 2, 10, 6, 0.3, 0, Math.PI * 2); ctx.fill(); }
    if (night) { ctx.fillStyle = 'rgba(140,255,220,0.6)'; circle(o.x + o.w / 2, bot - 2, 3.5); ctx.fill(); }
  } else if (o.k === 'branch') {
    const top = P.laneY[0] + P.walkT;
    ctx.strokeStyle = K.barkDk; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(o.x + o.w / 2, top); ctx.lineTo(o.x + o.w / 2 + wob, bot - 10); ctx.stroke();
    for (let k = 0; k < 5; k++) { const lx = o.x + 4 + k * (o.w - 8) / 4; ctx.fillStyle = k % 2 ? K.leaf : K.leafHi; ctx.beginPath(); ctx.ellipse(lx + wob, bot - 10 + Math.abs(k - 2) * -4, 11, 8, 0.2 * (k - 2), 0, Math.PI * 2); ctx.fill(); }
    if (night) { ctx.fillStyle = 'rgba(140,255,220,0.6)'; circle(o.x + o.w / 2, bot - 4, 3.5); ctx.fill(); }
  } else if (o.k === 'vine') {
    for (let k = 0; k < 4; k++) {
      const vx = o.x + 6 + k * (o.w - 12) / 3, sway = Math.sin(G.clock * 1.5 + k) * 3 + wob;
      ctx.strokeStyle = '#4f8a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(vx, 0); ctx.quadraticCurveTo(vx + sway, bot * 0.6, vx + sway, bot - 2 - (k % 2) * 6); ctx.stroke();
      ctx.fillStyle = K.leafHi; for (let y = 20; y < bot - 6; y += 22) { ctx.beginPath(); ctx.ellipse(vx + sway * y / bot + (y % 44 ? 4 : -4), y, 5, 3, y % 44 ? 0.6 : -0.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = night ? '#7affd8' : (k % 2 ? '#ff8fa8' : '#ffd25a'); circle(vx + sway, bot - 2 - (k % 2) * 6, 4); ctx.fill();
    }
  } else if (o.k === 'root') {
    const top = P.laneY[1] + P.bridgeT;
    for (let k = 0; k < 4; k++) {
      const rx = o.x + 6 + k * (o.w - 12) / 3, sway = wob + Math.sin(G.clock + k) * 1.5;
      ctx.strokeStyle = k % 2 ? '#7a5030' : '#8a6038'; ctx.lineWidth = 5 - k % 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(rx, top); ctx.bezierCurveTo(rx + 8, top + 20, rx - 8, bot - 20, rx + sway, bot - (k % 2) * 6); ctx.stroke(); ctx.lineCap = 'butt';
    }
    if (night) { ctx.fillStyle = 'rgba(140,255,220,0.6)'; circle(o.x + o.w / 2, bot, 4); ctx.fill(); }
  }
}
function raptorDrawSteam(st, o) {
  const gs = raptorGeyserState(o, st.t); if (gs.s !== 'blow') return;
  const P = RAPTOR, gy = P.laneY[o.lane], cx = o.x + o.w / 2, top = o.lane === 2 ? P.laneY[1] + P.bridgeT : gy - P.geyserTop;
  const rise = Math.min(1, gs.k * 6), fade = gs.k > 0.85 ? (1 - gs.k) / 0.15 : 1, hgt = (gy - top) * rise;
  const g = ctx.createLinearGradient(0, gy, 0, gy - hgt);
  g.addColorStop(0, 'rgba(255,255,255,' + 0.9 * fade + ')'); g.addColorStop(1, 'rgba(230,240,255,' + 0.25 * fade + ')');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - 12, gy - 4);
  for (let y = 0; y <= hgt; y += 12) ctx.lineTo(cx - 12 - y * 0.08 + Math.sin(y * 0.08 + G.clock * 14) * 4, gy - 4 - y);
  for (let y = hgt; y >= 0; y -= 12) ctx.lineTo(cx + 12 + y * 0.08 + Math.sin(y * 0.09 + G.clock * 13) * 4, gy - 4 - y);
  ctx.closePath(); ctx.fill();
  for (const pf of st.vis.puffs) if (Math.abs(pf.x - cx) < 30 && pf.lane === o.lane && pf.y > top) { const k = pf.t / 2.6; ctx.fillStyle = 'rgba(255,255,255,' + 0.55 * (1 - k) * fade + ')'; circle(pf.x + Math.sin(pf.t * 5) * 6, pf.y, (8 + k * 16) * pf.s); ctx.fill(); }
}
function raptorDrawEgg(st, e, night) {
  if (e.got[0] && e.got[1]) return;
  const gy = RAPTOR.laneY[e.lane], fl = e.h > 40, y = gy - e.h - (fl ? Math.sin(st.t * 2.6 + e.ph) * 5 : 0);
  if (!fl) { // a twig nest
    ctx.fillStyle = '#8a5a32'; ctx.beginPath(); ctx.ellipse(e.x, gy - 4, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b07a44'; ctx.lineWidth = 1.5; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(e.x - 16 + k * 8, gy - 2); ctx.lineTo(e.x - 10 + k * 8, gy - 8); ctx.stroke(); }
  }
  const glow = 0.25 + 0.12 * Math.sin(G.clock * 4 + e.ph), ey = y - (fl ? 0 : 8);
  ctx.fillStyle = 'rgba(255,215,90,' + (night ? glow + 0.2 : glow) + ')'; circle(e.x, ey, fl ? 22 : 18); ctx.fill();
  const wig = Math.sin(G.clock * 9 + e.ph) * (Math.sin(G.clock * 1.3 + e.ph) > 0.7 ? 0.2 : 0);
  ctx.save(); ctx.translate(e.x, ey); ctx.rotate(wig); raptorEggShape(0, 0, 1, false); ctx.restore();
  if (Math.sin(G.clock * 3 + e.ph) > 0.5) raptorStarShape(e.x + 12, ey - 12, 3.2, '#fff6c8', G.clock * 2);
  // who already took it: a dot in their colour over it (it's still there for the other raptor)
  for (const k of [0, 1]) if (e.got[k]) { ctx.fillStyle = PCOL[k]; circle(e.x, ey - 22, 4); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke(); }
}
// a raptor and its rider; (0, 0) = the raptor's feet (Bo's raptor runs a few px nearer, so two side by side both show)
function raptorDrawRider(st, r) {
  const P = RAPTOR, D = RAPTOR_DINO[r.id], col = PCOL[r.id], dk = PDARK[r.id], K = RAPTOR_COLS;
  const grounded = !r.air && !r.trans, dash = r.dashT > 0;
  r.duckK = (r.duckK || 0) + (((r.duck || dash) && !r.air ? 1 : 0) - (r.duckK || 0)) * 0.25;
  const dK = r.duckK, ph = r.run, bob = grounded ? Math.abs(Math.sin(ph)) * 3 : 0, near = r.id ? 6 : -5;
  const cheer = r.cheerT >= 0 ? Math.abs(Math.sin(r.cheerT * 7)) * Math.max(0, 1 - r.cheerT / 2.5) * 26 : 0;
  const x = r.x, y = r.y + near - cheer;
  let rot = r.tilt;
  if (r.stumble > 0 && r.stumbleKind === 'whoosh') rot += Math.sin(G.clock * 20) * 0.3;
  // a shadow on the path below (none over a treetop gap)
  const gy = raptorGroundAt(st.c, r.lane, r.x);
  if (gy != null && !r.trans) { const hh = clamp((gy - r.y) / 150, 0, 0.7); ctx.fillStyle = 'rgba(28,26,54,' + (0.22 * (1 - hh)) + ')'; ctx.beginPath(); ctx.ellipse(x + 2, gy + near, 30 * (1 - hh * 0.5), 5, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.save(); ctx.translate(x, y);
  // zoomies (gold swirls) and the dash (an aura and speed lines)
  if (r.tail > P.tailShow) {
    ctx.strokeStyle = 'rgba(255,197,61,' + clamp(r.tail / P.tailMax, 0.3, 0.85) + ')'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const q = (G.clock * 3 + i * 0.33) % 1, sx = -50 - q * 50, sy = -50 + i * 16; ctx.beginPath(); ctx.arc(sx, sy, 6, Math.PI * 0.2, Math.PI * 1.6); ctx.moveTo(sx + 2, sy - 6); ctx.lineTo(sx + 22, sy - 6); ctx.stroke(); }
    ctx.lineCap = 'butt';
  }
  if (dash) {
    const gz = r.dashGold ? 1.25 : 1;
    ctx.fillStyle = r.dashGold ? 'rgba(255,214,90,0.36)' : 'rgba(255,197,61,0.26)'; ctx.beginPath(); ctx.ellipse(0, -28, 52 * gz, 30 * gz, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,245,200,0.9)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (const oy of r.dashGold ? [-52, -36, -20, -6] : [-46, -28, -10]) { const L = 30 + raptorHash(Math.floor(G.clock * 40), oy + 60) * 30; ctx.beginPath(); ctx.moveTo(-64, oy); ctx.lineTo(-64 - L, oy); ctx.stroke(); }
    ctx.lineCap = 'butt';
  }
  ctx.rotate(rot);
  const hipX = -4, hipY = -30 + dK * 9 + bob;
  // a leg: thigh, shin, toes and a little claw (running cycle, tucked in the air)
  const leg = (k, isNear) => {
    const a = ph + k * Math.PI;
    let fx, fy;
    if (!grounded) { fx = hipX + 8 + (k ? -6 : 4); fy = hipY + 20; }
    else { fx = hipX + 6 + Math.cos(a) * 15; fy = -Math.max(0, Math.sin(a)) * 11; }
    const kx = (hipX + 4 + fx) / 2 + 8, ky = (hipY + 4 + fy) / 2 - 2;
    ctx.strokeStyle = isNear ? D.body : D.dark; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(hipX + 4, hipY + 2); ctx.lineTo(kx, ky); ctx.stroke();
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx - 3, fy - 4); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.strokeStyle = isNear ? D.dark : '#5a4a3a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(fx - 2, fy); ctx.lineTo(fx + 9, fy); ctx.moveTo(fx, fy - 1); ctx.quadraticCurveTo(fx + 4, fy - 9, fx + 7, fy - 6); ctx.stroke();
    ctx.lineCap = 'butt';
  };
  leg(1, false);
  // the tail with a feather tuft, the body, the belly and back stripes
  const wag = Math.sin(ph * 0.5 + r.id) * 5 - (r.air ? 6 : 0);
  ctx.fillStyle = D.body; ctx.beginPath(); ctx.moveTo(hipX - 12, hipY - 12); ctx.quadraticCurveTo(hipX - 36, hipY - 18 + wag * 0.4, hipX - 56, hipY - 18 + wag); ctx.quadraticCurveTo(hipX - 36, hipY - 4 + wag * 0.3, hipX - 10, hipY + 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = D.feather; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(hipX - 58 - k * 2, hipY - 20 + wag + (k - 1) * 5, 9, 3.4, (k - 1) * 0.35, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = D.body; ctx.beginPath(); ctx.ellipse(hipX + 2, hipY - 4, 24, 13 - dK * 2, -0.08 - dK * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = D.belly; ctx.beginPath(); ctx.ellipse(hipX + 6, hipY + 2, 15, 6, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = D.stripe; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) { const sx = hipX - 14 + k * 9; ctx.beginPath(); ctx.moveTo(sx, hipY - 15); ctx.lineTo(sx + 3, hipY - 9); ctx.stroke(); }
  ctx.lineCap = 'butt';
  leg(0, true);
  // the neck and head (low and forward when ducking or dashing)
  const hx = hipX + 34 + dK * 8, hy = hipY - 26 + dK * 18;
  ctx.strokeStyle = D.body; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hipX + 16, hipY - 6); ctx.quadraticCurveTo(hipX + 24, hipY - 14, hx - 4, hy + 4); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = D.feather; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(hx - 10 - k * 4, hy - 9 + k * 3, 7, 3, -0.9 - k * 0.2, 0, Math.PI * 2); ctx.fill(); } // the head crest
  ctx.fillStyle = D.body; ctx.beginPath(); ctx.ellipse(hx, hy, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
  rr(hx, hy - 6, 17, 12, 6); ctx.fill(); // the snout
  ctx.fillStyle = D.belly; rr(hx + 2, hy + 1, 15, 5, 3); ctx.fill();
  const dizzy = r.stumble > 0 && r.stumbleKind !== 'peep';
  if (dizzy) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(hx + 2, hy - 3, 3.5, 0, Math.PI * 1.6); ctx.stroke(); }
  else {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(hx + 2, hy - 3, 4.6, 5.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; circle(hx + 3.6, hy - 2.6, 2.6); ctx.fill(); ctx.fillStyle = '#fff'; circle(hx + 4.4, hy - 3.8, 1); ctx.fill();
  }
  ctx.fillStyle = C.ink; circle(hx + 14, hy - 3, 1); ctx.fill(); // nostril
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
  if (dash || r.cheerT >= 0) { ctx.fillStyle = '#ff7a8a'; ctx.beginPath(); ctx.arc(hx + 9, hy + 2, 4.5, 0, Math.PI); ctx.fill(); ctx.beginPath(); ctx.arc(hx + 9, hy + 2, 4.5, 0, Math.PI); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(hx + 4, hy + 2.5); ctx.quadraticCurveTo(hx + 10, hy + 5.5, hx + 16, hy + 1.5); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,120,140,0.5)'; circle(hx - 2, hy + 3, 2.6); ctx.fill();
  // a little feathered arm, flapping
  const flap = Math.sin(ph * 2) * 0.4;
  ctx.save(); ctx.translate(hipX + 18, hipY - 4); ctx.rotate(0.6 + flap);
  ctx.fillStyle = D.feather; ctx.beginPath(); ctx.ellipse(6, 0, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = D.featherDk; ctx.beginPath(); ctx.ellipse(9, 2, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // the saddle and the rider (Pip or Bo in a safari hat), holding the reins
  const sx = hipX - 2, sy = hipY - 14;
  ctx.fillStyle = col; rr(sx - 12, sy - 1, 24, 6, 3); ctx.fill();
  ctx.fillStyle = '#8a5a32'; rr(sx - 9, sy - 4, 18, 6, 3); ctx.fill();
  const hug = dK, rx = sx + hug * 5, ry = sy - 12 + hug * 4, rw = 18, rh = 20 - hug * 5;
  ctx.strokeStyle = '#6a4224'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(rx + 8, ry + 2); ctx.quadraticCurveTo(hx - 8, hy + 10, hx - 4, hy + 4); ctx.stroke(); // reins
  if (r.id === 1) { ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 1.8; circle(rx - 6, ry - rh / 2 + 1, 3.6); ctx.fill(); ctx.stroke(); circle(rx + 6, ry - rh / 2 + 1, 3.6); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2;
  rr(rx - rw / 2, ry - rh / 2, rw, rh, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(rx - rw / 2 + 2, ry - rh / 2 + 2, 6, 6, 3); ctx.fill();
  ctx.fillStyle = col; circle(rx + 9, ry + 3, 3); ctx.fill(); ctx.stroke(); // a hand on the reins
  const ey = ry - 2;
  if (dizzy) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; for (const ex of [2, 7]) { ctx.beginPath(); ctx.moveTo(rx + ex - 2, ey - 2); ctx.lineTo(rx + ex + 2, ey + 2); ctx.moveTo(rx + ex + 2, ey - 2); ctx.lineTo(rx + ex - 2, ey + 2); ctx.stroke(); } }
  else for (const ex of [2, 7]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(rx + ex, ey, 2.4, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = C.ink; circle(rx + ex + 0.9, ey + 0.4, 1.3); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,120,140,0.5)'; circle(rx + 8.5, ey + 4.5, 1.8); ctx.fill();
  if (r.popT < 0.9 || r.cheerT >= 0 || dash) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(rx + 4.5, ey + 4, 2.2, 0.2, Math.PI - 0.2); ctx.stroke(); }
  // the safari hat (Pip's sprout pokes out the top)
  const ht = ry - rh / 2 - 1;
  ctx.fillStyle = K.hatDk; ctx.beginPath(); ctx.ellipse(rx + 1, ht + 1, 13, 3.2, -0.05, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = K.hat; ctx.beginPath(); ctx.ellipse(rx, ht - 1, 9.5, 8, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = col; ctx.fillRect(rx - 9.5, ht - 3, 19, 2.6);
  if (r.id === 0) { ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(rx, ht - 9); ctx.lineTo(rx + 1, ht - 13); ctx.stroke(); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(rx + 4.5, ht - 14, 4.6, 2.3, -0.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  // a held egg floats over the rider (gold-ringed for a Gold Egg)
  if (r.egg) {
    const ex = x + 30, ey2 = y - 92 + Math.sin(G.clock * 4 + r.id) * 3, pulse = r.holdT > 3 ? 1 + 0.12 * Math.sin(G.clock * 10) : 1;
    if (r.egg === 2) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; circle(ex, ey2, 16 * pulse); ctx.stroke(); }
    raptorEggShape(ex, ey2, 0.85 * pulse, r.egg === 2);
  }
  if (dizzy) for (let i = 0; i < 3; i++) { const a = G.clock * 9 + i * 2.1; raptorStarShape(x + 8 + Math.cos(a) * 16, y - 84 + Math.sin(a) * 4, 4, C.gold); }
  // the fork pick: a little arrow over the raptor once it has picked a path
  if (r.pick != null) {
    const ax = x - 30, ay = y - 84;
    ctx.fillStyle = r.pick === 0 ? '#5aa83a' : '#4a7ac8'; ctx.beginPath();
    if (r.pick === 0) { ctx.moveTo(ax - 8, ay + 5); ctx.lineTo(ax, ay - 6); ctx.lineTo(ax + 8, ay + 5); } else { ctx.moveTo(ax - 8, ay - 5); ctx.lineTo(ax, ay + 6); ctx.lineTo(ax + 8, ay - 5); }
    ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  }
}
// night: darkness with soft light around the raptors, the fireflies and the eggs (an offscreen mask)
let raptorNightCv = null;
function raptorDrawNight(st) {
  const cam = st.cam, c = st.c;
  if (!raptorNightCv) { try { raptorNightCv = document.createElement('canvas'); raptorNightCv.width = W / 2; raptorNightCv.height = H / 2; } catch (e) { return; } }
  const m = raptorNightCv.getContext('2d'); if (!m) return;
  m.setTransform(0.5, 0, 0, 0.5, 0, 0);
  m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, W, H);
  m.fillStyle = 'rgba(8,12,34,0.78)'; m.fillRect(0, 0, W, H);
  m.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a) => { const g = m.createRadialGradient(x, y, r * 0.2, x, y, r); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); m.fillStyle = g; m.beginPath(); m.arc(x, y, r, 0, Math.PI * 2); m.fill(); };
  for (const r of st.riders) { const sx = r.x - cam.x; hole(sx + 150, r.y - 40, 230, 0.95); hole(sx, r.y - 40, 120, 0.9); }
  for (const f of c.flies) { const sx = f.x - cam.x + Math.sin(G.clock + f.ph) * 10; if (sx > -60 && sx < W + 60) hole(sx, f.y + Math.cos(G.clock * 1.3 + f.ph) * 8, f.r * (0.7 + 0.3 * Math.sin(G.clock * 3 + f.ph)), 0.6); }
  for (const e of c.eggs) if (!(e.got[0] && e.got[1])) { const sx = e.x - cam.x; if (sx > -60 && sx < W + 60) hole(sx, RAPTOR.laneY[e.lane] - e.h - 6, 60, 0.85); }
  const gx = c.len - cam.x; if (gx > -300 && gx < W + 300) hole(gx, 200, 260, 0.9);
  m.globalCompositeOperation = 'source-over';
  ctx.drawImage(raptorNightCv, 0, 0, W, H);
  // the fireflies themselves
  for (const f of c.flies) {
    const sx = f.x - cam.x + Math.sin(G.clock + f.ph) * 10, sy = f.y + Math.cos(G.clock * 1.3 + f.ph) * 8; if (sx < -10 || sx > W + 10) continue;
    const a = 0.5 + 0.5 * Math.sin(G.clock * 4 + f.ph * 3);
    ctx.fillStyle = 'rgba(230,255,140,' + 0.25 * a + ')'; circle(sx, sy, 7); ctx.fill();
    ctx.fillStyle = 'rgba(250,255,190,' + (0.5 + 0.5 * a) + ')'; circle(sx, sy, 2.2); ctx.fill();
  }
}
function raptorWordY(x, y, below) {
  const b = G.matchHudBox; if (!b) return y;
  return y < (hudBig() ? 104 : 86) && x > b.x0 - 60 && x < b.x1 + 60 ? Math.max(y, below) : y;
}
function raptorDrawTop() {
  const st = G.mst, m = G.match; if (!st.c || !st.riders) return;
  const c = st.c, cam = st.cam, night = c.twist === 'night';
  ctx.save(); ctx.translate(-cam.x, 0);
  const vis = (x, pad = 80) => x > cam.x - pad && x < cam.x + W + pad;
  const over = o => o.k === 'branch' || o.k === 'vine' || o.k === 'root';
  for (const md of c.muds) if (md.x1 > cam.x - 20 && md.x0 < cam.x + W + 20) raptorDrawMud(st, md);
  for (const hd of c.herds) if (vis(hd.x0, 200)) raptorDrawHerd(st, hd, false);
  for (const o of c.obs) if (vis(o.x) && !over(o)) raptorDrawGroundThing(st, o, night);
  for (const e of c.eggs) if (vis(e.x)) raptorDrawEgg(st, e, night);
  // the raptors (the one behind drawn first)
  // (side by side, as at the start line: the computer's raptor goes behind its person's)
  const order = st.riders.slice().sort((a, b) => Math.abs(a.x - b.x) < 8 ? (raptorCpu(b.id) ? 1 : raptorCpu(a.id) ? -1 : a.id - b.id) : a.x - b.x);
  for (const r of order) raptorDrawRider(st, r);
  for (const o of c.obs) if (vis(o.x) && o.k === 'geyser') raptorDrawSteam(st, o);
  for (const o of c.obs) if (vis(o.x) && over(o)) raptorDrawOverhead(st, o, night);
  for (const hd of c.herds) if (vis(hd.x0, 200)) raptorDrawHerd(st, hd, true);
  raptorDrawArch(st, 'front');
  // sparkles and effects
  for (const q of st.vis.fx) {
    const a = clamp(q.life / q.max, 0, 1); ctx.globalAlpha = a; ctx.fillStyle = q.col;
    if (q.kind === 'spark') raptorStarShape(q.x, q.y, q.size * (0.6 + 0.6 * a), q.col, q.life * 4);
    else if (q.kind === 'heart') { const s = q.size; ctx.beginPath(); ctx.moveTo(q.x, q.y + s); ctx.bezierCurveTo(q.x - s * 2, q.y - s * 0.5, q.x - s * 0.6, q.y - s * 2, q.x, q.y - s * 0.6); ctx.bezierCurveTo(q.x + s * 0.6, q.y - s * 2, q.x + s * 2, q.y - s * 0.5, q.x, q.y + s); ctx.fill(); }
    else if (q.kind === 'leaf' || q.kind === 'chip' || q.kind === 'shell') {
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      if (q.kind === 'leaf') { ctx.beginPath(); ctx.ellipse(0, 0, q.size * 1.6, q.size * 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(-q.size, -q.size * 0.6); ctx.lineTo(q.size, -q.size * 0.3); ctx.lineTo(q.size * 0.2, q.size * 0.8); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    } else if (q.kind === 'bubble') { ctx.strokeStyle = q.col; ctx.lineWidth = 1.5; circle(q.x, q.y, q.size); ctx.stroke(); }
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  for (const s of st.vis.shock) { const k = s.t / 0.45; ctx.strokeStyle = 'rgba(255,197,61,' + (1 - k) + ')'; ctx.lineWidth = 4 * (1 - k) + 1; circle(s.x, s.y, 12 + 46 * k); ctx.stroke(); }
  ctx.restore();
  if (night) raptorDrawNight(st);
  ctx.save(); ctx.translate(-cam.x, 0);
  // floating words: each rider's latest, and bumps
  for (const r of st.riders) if (r.popT < 0.9 && r.pop) {
    const k = r.popT / 0.9, sx = r.x - cam.x, yy = r.y - 104 - 24 * k + (r.id ? 14 : 0);
    ctx.globalAlpha = 1 - k * k; bigText(r.pop, clamp(r.x, cam.x + 80, cam.x + W - 80), raptorWordY(sx, yy, r.y + 30), 18, r.popCol, 1 + 0.3 * Math.max(0, 1 - k * 5)); ctx.globalAlpha = 1;
  }
  for (const w of st.vis.words) { const k = w.t / 0.8; ctx.globalAlpha = 1 - k; bigText(w.text, w.x, raptorWordY(w.x - cam.x, w.y - 18 * k, w.y + 50), 16, w.col); ctx.globalAlpha = 1; }
  // name tags through "Round N" and 3-2-1 (the framework draws none for hidden players)
  const tagA = G.introT > 0 ? 1 - clamp(G.introT / 0.5, 0, 1) : m && (m.phase === 'ready' || m.phase === 'count') ? 1 : 0;
  if (tagA > 0) for (const r of st.riders) {
    ctx.globalAlpha = tagA; const cpu = raptorCpu(r.id), hw = cpu ? 30 : 18, x = r.x + (r.id ? 1 : -1) * (hw + 6), y = r.y - (r.egg ? 116 : 94);
    ctx.fillStyle = PCOL[r.id]; rr(x - hw, y - 11, hw * 2, 18, 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, y + 7); ctx.lineTo(x + 4, y + 7); ctx.lineTo(x, y + 11); ctx.fill();
    text(cpu ? NAMES[r.id] + ' · CPU' : NAMES[r.id], x, y - 1.5, 12, '#fff', 'center', 'body'); ctx.globalAlpha = 1;
  }
  if (m && m.phase === 'count' && m.t < 1.1) for (const r of st.riders) if (r.goldStart) {
    const k = m.t / 1.1; ctx.globalAlpha = 1 - k * k; bigText('Gold egg!', r.x + 96, r.y - 140 - 20 * k, 17, C.gold); ctx.globalAlpha = 1;
  }
  ctx.restore();
}
// each player's own keys for a reminder chip (none for the computer)
function raptorKeyLabel(id, what) {
  let k = 'kb'; try { k = actKey(id); } catch (e) { k = 'kb'; }
  if (what === 'dash') return k === 'pad' ? glyph('act') + ' dash!' : k === 'touch' ? 'Tap dash!' : (id === 0 ? 'F' : '/') + ' dash!';
  if (what === 'jump') return k === 'pad' ? glyph('a') + ' jumps logs!' : k === 'touch' ? '▲ jumps logs!' : (id === 0 ? 'W' : '↑') + ' jumps logs!';
  if (what === 'duck') return k === 'pad' ? 'Stick down ducks!' : k === 'touch' ? '▼ ducks!' : (id === 0 ? 'S' : '↓') + ' ducks!';
  if (what === 'fork') return k === 'pad' ? glyph('a') + ' Treetops · ▼ Creek' : k === 'touch' ? '▲ Treetops · ▼ Creek' : id === 0 ? 'W Treetops · S Creek' : '↑ Treetops · ↓ Creek';
  return k === 'pad' ? glyph('a') + ' jump · ▼ duck · ▶ fast · ' + glyph('act') + ' dash' : k === 'touch' ? '▲ jump · ▼ duck · ▶ fast · dash' : id === 0 ? 'W jump · S duck · D fast · F dash' : '↑ jump · ↓ duck · → fast · / dash';
}
function raptorChip(label, x, y, big, col, fromLeft) {
  const fs = big ? 18 : 13, h = big ? 30 : 22;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(label).width + (big ? 26 : 20), cx = clamp(fromLeft ? x + w / 2 : x, w / 2 + 6, W - w / 2 - 6);
  ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(cx - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(cx - w / 2, y - h / 2, w, h, h / 2); ctx.stroke();
  text(label, cx, y + 0.5, fs, C.gold, 'center', 'body');
}
function raptorHud() {
  const st = G.mst, m = G.match; if (!st.riders || !st.c) return;
  const big = hudBig(), tw = RAPTOR_TWISTS[st.twist], cam = st.cam;
  // bottom corners: each player's egg slot
  for (const r of st.riders) {
    const left = r.id === 0, sz = big ? 1.45 : 1, pw = 98 * sz, ph = 34 * sz, y = H - 8 - ph, x = left ? 12 : W - 12 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x, y, pw, ph, 12); ctx.fill();
    if (r.egg === 2 || r.tail > RAPTOR.tailShow) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x, y, pw, ph, 12); ctx.stroke(); }
    text(NAMES[r.id], left ? x + 12 * sz : x + pw - 12 * sz, y + ph / 2 + 0.5, 17 * sz, PCOL[r.id], left ? 'left' : 'right');
    const sx = left ? x + pw - 22 * sz : x + 22 * sz, sy = y + ph / 2;
    if (r.egg) raptorEggShape(sx, sy, 0.95 * sz * (r.holdT > 3 ? 1 + 0.1 * Math.sin(G.clock * 10) : 1), r.egg === 2);
    else if (r.dashT > 0) raptorStarShape(sx, sy, 11 * sz * (0.6 + 0.4 * Math.sin(G.clock * 30)), 'rgba(255,197,61,0.7)', G.clock * 6);
    else { ctx.strokeStyle = 'rgba(246,239,223,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.ellipse(sx, sy, 8 * sz, 11 * sz, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  }
  // bottom centre: the course map, start to arch, with the forks and both raptors
  {
    const mw = big ? 360 : 380, mh = big ? 28 : 22, x0 = W / 2 - mw / 2, y = H - (big ? 4 : 5) - mh;
    ctx.fillStyle = 'rgba(28,26,54,0.92)'; rr(x0, y, mw, mh, mh / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(246,239,223,0.18)'; ctx.lineWidth = 1.5; rr(x0, y, mw, mh, mh / 2); ctx.stroke();
    const a = x0 + 18, b = x0 + mw - 28, cy = y + mh / 2, len = st.c.len, sx = RAPTOR.startX, X = v => a + (b - a) * clamp((v - sx) / (len - sx), 0, 1);
    ctx.strokeStyle = 'rgba(246,239,223,0.35)'; ctx.lineWidth = 3; ctx.setLineDash([2, 6]); ctx.beginPath(); ctx.moveTo(a, cy); ctx.lineTo(b, cy); ctx.stroke(); ctx.setLineDash([]);
    for (const f of st.c.forks) { ctx.fillStyle = 'rgba(124,207,79,0.45)'; rr(X(f.x0), cy - mh * 0.3, X(f.x1) - X(f.x0), mh * 0.6, 4); ctx.fill(); }
    ctx.strokeStyle = 'rgba(246,239,223,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a - 6, cy - mh * 0.28); ctx.lineTo(a - 6, cy + mh * 0.28); ctx.stroke();
    for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (k + j) % 2 ? '#fff' : '#1c1a36'; ctx.fillRect(b + 6 + j * 4, cy - 4 + k * 4, 4, 4); }
    for (const r of st.riders) {
      const px = X(r.x), py = cy + (r.id ? 3 : -3);
      ctx.fillStyle = PCOL[r.id]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; circle(px, py, big ? 7 : 5.5); ctx.fill(); ctx.stroke();
    }
  }
  // twist pill (not in the plain round), top left under the level pill
  if (st.twist !== 'plain') {
    const fs = big ? 20 : 13, h = big ? 36 : 26, y0 = 46;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(tw.name).width + (big ? 36 : 28); pill(14, y0, w, h); text(tw.name, 14 + (big ? 18 : 14), y0 + h / 2 + 0.5, fs, C.gold, 'left', 'body');
  }
  if (m.phase === 'live') {
    // top right: what's coming up (a fork, a herd, geysers), then gold zoomies under it
    const chips = [], ahead = cam.x + W, lead = Math.max(st.riders[0].x, st.riders[1].x);
    if (st.c.forks.some(f => f.x0 > lead && f.x0 < ahead + 150)) chips.push({ text: 'Fork ahead! Pick a path', col: '#d8ffb0' });
    else if (st.c.herds.some(h => h.x0 > lead && h.x0 < ahead + 200)) chips.push({ text: 'Trikes crossing!', col: '#ffd2a0' });
    else if (st.c.obs.some(o => o.k === 'geyser' && o.lane === 1 && o.x > lead && o.x < ahead + 100)) chips.push({ text: 'Geyser ahead!', col: '#cfe8ee' });
    const tr = st.riders.find(r => r.tail > RAPTOR.tailShow);
    if (tr) chips.push({ text: 'Gold zoomies for ' + NAMES[tr.id] + '!', col: C.gold });
    let cy = null;
    for (const chip of chips) {
      const fs = big ? 20 : 13, h = big ? 36 : 28;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = ctx.measureText(chip.text).width + (big ? 36 : 28), x1 = W - 14, box = G.matchHudBox;
      const y = cy != null ? cy : box && x1 - w < box.x1 + 8 ? box.y1 + 6 : 12;
      pill(x1 - w, y, w, h); text(chip.text, x1 - (big ? 18 : 14), y + h / 2 + 0.5, fs, chip.col, 'right', 'body');
      cy = y + h + 6;
    }
    // reminder chips over a raptor, in its player's own keys (never for the computer): an egg held a while,
    // the first stumble on a log or a branch (jump / duck), the first fork of the match
    for (const r of st.riders) {
      if (raptorCpu(r.id) || r.finT != null || r.popT < 0.9) continue; // (after its "Oof!" word has floated away)
      let lab = null;
      const hk = st.hinted[r.id];
      if (r.egg && r.holdT > 3.5 && r.holdT < 9) lab = raptorKeyLabel(r.id, 'dash');
      else if (hk && hk !== 'done') { if (!st.hintAt[r.id]) st.hintAt[r.id] = st.t; if (st.t - st.hintAt[r.id] < 2.2) lab = raptorKeyLabel(r.id, hk); else st.hinted[r.id] = 'done'; }
      else if (m.round === 1 && st.c.forks[0] && r.lane === 1 && r.x > st.c.forks[0].x0 - RAPTOR.forkZone - 260 && r.x < st.c.forks[0].x0) lab = raptorKeyLabel(r.id, 'fork');
      if (lab && Math.sin(G.clock * 5) > -0.6) raptorChip(lab, r.x - cam.x + 10, r.y - (big ? 136 : 124), big, PCOL[r.id]);
    }
  }
  if (m.phase === 'ready' || m.phase === 'count') {
    // the twist card, every round (the plain one too)
    const nf = big ? 30 : 26, hf = big ? 19 : 14, ch = big ? 78 : 60, cy = big ? 380 : 392;
    ctx.font = hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const hw = ctx.measureText(tw.hint).width, w = Math.min(W - 40, Math.max(big ? 380 : 300, hw + 48)), a = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1;
    const cx = clamp(Math.max(W / 2 + 30, 300 + w / 2), w / 2 + 20, W - w / 2 - 20);
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(cx - w / 2, cy, w, ch, 16); ctx.fill();
    text(tw.name, cx, cy + (big ? 25 : 21), nf, C.gold, 'center'); text(tw.hint, cx, cy + (big ? 57 : 46), hf, C.paper, 'center', 'body');
    // the gold egg, announced
    const gs = st.riders.filter(r => r.goldStart);
    if (gs.length) raptorChip('Gold egg for ' + NAMES[gs[0].id] + ': a bigger dash!', cx, cy - (big ? 22 : 18), big, C.gold);
    // key reminders by each raptor before rounds 1 and 2 (each player's own device)
    if (m.round <= 2) for (const r of st.riders) if (!raptorCpu(r.id)) raptorChip(raptorKeyLabel(r.id, 'all'), r.x - cam.x + 92, r.y - (r.id ? 26 : 60) - (big ? 12 : 0), big, PCOL[r.id], true);
    ctx.globalAlpha = 1;
  }
}

Sfx.extra.raptorHop = function (p) { this.tone(300 * p, 0.1, 'triangle', 0.045, 620 * p); };
Sfx.extra.raptorLand = function () { this.tone(150, 0.05, 'triangle', 0.04, 100); };
Sfx.extra.raptorStumble = function (p) { this.tone(180 * p, 0.12, 'triangle', 0.07, 90 * p); this.tone(420 * p, 0.12, 'square', 0.025, 260 * p, 0.06); };
Sfx.extra.raptorBonk = function (p) { this.tone(700 * p, 0.05, 'square', 0.03, 500 * p); this.tone(220 * p, 0.14, 'triangle', 0.06, 140 * p, 0.03); };
Sfx.extra.raptorPeep = function () { this.tone(1500, 0.05, 'triangle', 0.035, 2100); this.tone(1800, 0.06, 'triangle', 0.03, 2400, 0.07); };
Sfx.extra.raptorEgg = function (p) { [880, 1175, 1480, 1760].forEach((f, i) => this.tone(f * p, 0.08, 'triangle', 0.04, null, i * 0.045)); };
Sfx.extra.raptorDash = function (p) { this.tone(160 * p, 0.32, 'sawtooth', 0.05, 760 * p); this.tone(520 * p, 0.22, 'triangle', 0.04, 1400 * p, 0.05); this.tone(1200 * p, 0.05, 'square', 0.02, 900 * p); };
Sfx.extra.raptorNope = function (p) { this.tone(260 * p, 0.08, 'triangle', 0.03, 200 * p); };
Sfx.extra.raptorCrash = function () { [0, 0.03, 0.07].forEach((d, i) => this.tone(320 - i * 70, 0.08, 'square', 0.04, 120, d)); this.tone(90, 0.2, 'triangle', 0.07, 50); };
Sfx.extra.raptorSplash = function () { this.tone(900, 0.1, 'sine', 0.035, 300); this.tone(500, 0.12, 'triangle', 0.03, 200, 0.04); };
Sfx.extra.raptorBoing = function (p) { this.tone(160 * p, 0.25, 'sine', 0.08, 520 * p); };
Sfx.extra.raptorFern = function (p) { this.tone(140 * p, 0.3, 'sine', 0.09, 700 * p); this.tone(420 * p, 0.15, 'triangle', 0.03, 900 * p, 0.05); };
Sfx.extra.raptorWhoosh = function () { this.tone(200, 0.4, 'sawtooth', 0.025, 900); this.tone(1200, 0.25, 'sine', 0.02, 2200, 0.05); };
Sfx.extra.raptorBoop = function (p) { this.tone(130 * p, 0.18, 'sine', 0.09, 90 * p); this.tone(330 * p, 0.1, 'triangle', 0.035, 240 * p, 0.08); };
Sfx.extra.raptorUp = function (p) { this.tone(330 * p, 0.12, 'triangle', 0.045, 880 * p); this.tone(990 * p, 0.08, 'triangle', 0.03, null, 0.1); };
Sfx.extra.raptorSlide = function (p) { this.tone(700 * p, 0.25, 'sine', 0.035, 240 * p); };
Sfx.extra.raptorFall = function (p) { this.tone(600 * p, 0.32, 'sine', 0.04, 200 * p); };
Sfx.extra.raptorBump = function () { this.tone(260, 0.07, 'triangle', 0.06, 170); this.tone(620, 0.05, 'square', 0.02, 420); };
Sfx.extra.raptorFrog = function (p) { [660, 990].forEach((f, i) => this.tone(f * p, 0.08, 'triangle', 0.04, null, i * 0.06)); };
Sfx.extra.raptorZoomies = function (p) { this.tone(400 * p, 0.3, 'sine', 0.035, 700 * p); this.tone(800 * p, 0.25, 'triangle', 0.025, 1100 * p, 0.12); };
Sfx.extra.raptorGate = function (p) { this.tone(392 * p, 0.12, 'triangle', 0.06); this.tone(523 * p, 0.12, 'triangle', 0.05, null, 0.09); this.tone(784 * p, 0.2, 'triangle', 0.045, null, 0.18); };
Sfx.extra.raptorRoar = function () { this.tone(220, 0.3, 'sawtooth', 0.035, 520); this.tone(330, 0.25, 'square', 0.02, 700, 0.05); };
Sfx.extra.raptorCheer = function () { this.tone(660, 0.08, 'triangle', 0.03, 880, 0.05); this.tone(784, 0.1, 'triangle', 0.03, 1046, 0.15); this.tone(988, 0.14, 'triangle', 0.025, 1318, 0.25); };
Sfx.extra.raptorGold = function (p) { this.tone(784 * p, 0.1, 'triangle', 0.05); this.tone(1046 * p, 0.12, 'triangle', 0.045, null, 0.08); this.tone(1318 * p, 0.16, 'triangle', 0.04, null, 0.16); };
/* ===== end of 14-4 Raptor Race ===== */
