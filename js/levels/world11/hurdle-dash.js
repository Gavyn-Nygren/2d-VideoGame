/* Pip & Bo - Level 11-3 Hurdle Dash (versus, World 11 Summer Games). */
'use strict';

/* ===== 11-3 Hurdle Dash (mode 'hurdles', versus, best of 5, World 11 Summer Games) =====
   Gavyn's pick: "race each other over hurdles; jumps timed right give a speed burst."
   Side-on, split screen: Pip's lane on top, Bo's lane below, each with its own camera scrolling along the race (each
   strip also shows the other runner small in the far lane, so you see each other when it's close). A race map at the
   bottom shows who leads. def.ownStep: the mode runs the whole live tick; the engine players are hidden (the mode draws
   the runners) and only mirror each runner's screen spot, for name tags, bubbles and the framework's confetti.
     run    hold ▶ (◀ brakes). Speed builds to a cruise speed; nobody needs to mash, so keyboard, controller and touch
            are equal.
     jump   one fixed hop (0.56 s, the same arc at every speed). Taking off with your feet in the GOLD zone painted before
            a hurdle gives a SPEED BURST (gold trail, faster for about a second). A jump a bit off the gold still clears
            it. Too early or too late clips the hurdle: it tips over with a clatter and you stumble (slower for a moment).
            Running into it without jumping knocks it flat and slows you more. Nobody is ever hurt.
            A hop needs a short push-off step on the ground first (K.push), so mashing jump still runs, just slowly.
     dip    the action button: lean at the line. The chest crosses the line, so a dip timed right wins a photo finish.
   The gold zone is worked out from your own speed (it moves a little when you are faster), so what you see is what counts.
   Rounds: round 1 is the plain 110 m Hurdles; rounds 2-4 are three of High Hurdles / Tricky Spacing / Steeplechase
   (water jumps: a splash or wading slows you) / Windy Day (tailwind and headwind stretches), shuffled per match; round 5
   is always the Double Dash (220 m, a bit of everything). A dead heat replays (the 2nd tie in a row goes to more speed
   bursts in that race, else a short Sudden Sprint). Catch-up: whoever trails in rounds gets GOLDEN SPIKES (gold shoes, a
   bigger glowing sweet spot, longer bursts when 2 behind), always shown and announced on the round card.
   There is no round clock (def.match.roundTime 0): the race has its own stopwatch, and a race nobody finishes ends at
   a safety bell (furthest wins). All state lives in G.mst; prefix hurdles / HURDLES; sounds are Sfx.extra.hurdles*. */
const HURDLES = {
  pxM: 76,                                                   // px per metre (110 m = 8360 px, about 20 s)
  vTop: 380, acc: 640, slowAcc: 0.3, coast: 520, brake: 1200, decay: 220,   // run speed (px/s), accelerations (px/s²)
  burstAdd: 110, burstT: 0.9, burstCap: 150, burstHelp2: 1.35,               // SPEED BURST: +110 px/s for 0.9 s (top cap)
  air: 0.56, apex: 64, foot: 10, buf: 0.12, push: 0.12,      // the hop: air time, apex height, half foot width, press buffer,
                                                             // and the time on the ground a hop needs (so mashing jump still runs)
  sweet: 0.06, sweetMul: [1, 1.5, 2], sweetMax: 0.85,        // gold zone half-width (s); golden spikes widen it
  hh: 38, hHigh: 52, hWater: 40, pit: 92,                    // hurdle heights (near-lane screen px) and the water pit length
  clipMul: 0.55, clipAir: 0.75, clipT: 0.35, crashMul: 0.3, crashT: 0.6, splashMul: 0.55, splashT: 0.35, wade: 0.45,
  dipT: 0.4, dipLean: 24, dipSlow: 0.95, dipCD: 0.6, chest: 8,   // the finish dip: lean time, how far the chest goes
  wind: 55, windLen: 27.5,                                   // Windy Day: ±55 px/s, alternating every 27.5 m
  limitPad: 22,                                              // the safety bell: this many s after a fair race time
  helpMax: 2,
  // screen: two strips (Pip's lane on top), each 200 px tall; inside a strip: stands 0-62, ad boards 62-86,
  // far lane 86-122 (the other runner, small), near lane 122-178 (you), kerb and grass 178-200
  stripY: [100, 300], stripH: 200, laneTop: 86, laneMid: 122, laneBot: 178, gY: 162, farY: 107, runX: 230,
  SN: 1.45, SF: 0.84, barY: 503, finX: 380,
};
const HURDLES_TWISTS = {
  sprint: { name: '110 m Hurdles', hint: 'Hold ▶ to run. Jump in the gold zone for a SPEED BURST!' },
  high: { name: 'High Hurdles', hint: 'Taller hurdles: jump right on the gold!' },
  tricky: { name: 'Tricky Spacing', hint: 'Uneven gaps: watch out for the close ones!' },
  steeple: { name: 'Steeplechase', hint: 'Water jumps! A splash slows you down.' },
  wind: { name: 'Windy Day', hint: 'Tailwind pushes you, headwind holds you back!' },
  final: { name: 'Double Dash', hint: 'Last round: double length, a bit of everything!' },
  sudden: { name: 'Sudden Sprint', hint: 'A quick 60 m dash to settle the tie!' },
};
const HURDLES_MIX = ['high', 'tricky', 'steeple', 'wind'];
const HURDLES_COL = { track: '#d4553d', trackHi: '#e26a4f', trackDk: '#b2412d', line: 'rgba(255,255,255,0.92)', grass: '#7ccc62', grassDk: '#58a64a',
  stand: '#3f5a86', standHi: '#4f6c9c', standDk: '#2b3f63', water: '#4aa3e0', waterDk: '#2f7fc0', waterHi: 'rgba(255,255,255,0.55)',
  fans: ['#ffd166', '#ff8fc7', '#b28dff', '#8fe3b0', '#ffffff', '#7fd6ff', '#ffb36b'], skin: ['#f6d2b0', '#e0a97c', '#b97a53', '#8a5636'],
  boards: [['#ffd166', '#5a3b00'], ['#5b95ff', '#ffffff'], ['#ff6b4a', '#ffffff'], ['#8fe3b0', '#1f5a3a'], ['#b28dff', '#ffffff']],
  flags: [['#ff6b9a', '#ffd166'], ['#3dc6b8', '#ffffff'], ['#9a6bff', '#ffd166'], ['#ff9f43', '#2b3f63'], ['#5bd16b', '#ffffff']] };
const HURDLES_ADS = ['SUMMER GAMES', 'GO FOR GOLD', 'HURDLE DASH', 'PIP & BO', 'FAST FEET', 'JUMP! JUMP!'];
const hurdlesG = () => 8 * HURDLES.apex / (HURDLES.air * HURDLES.air);   // the hop's gravity (px/s²)
// looks-only randomness (particles): never MODES.hurdles.rand, so the rules' random sequence doesn't depend on the looks
let hurdlesVS = 20261104;
const hurdlesVR = () => { hurdlesVS = (Math.imul(hurdlesVS, 1664525) + 1013904223) >>> 0; return hurdlesVS / 4294967296; };
// the computer is playing this runner in 1-player mode (no key hints for it)
const hurdlesCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const hurdlesBot = id => typeof cpuOn === 'function' && cpuOn(id);

/* ---------- the course ---------- */
function hurdlesCourse(tw, rnd) {
  const K = HURDLES, obs = [];
  const add = (m, kind) => obs.push({ x: Math.round(m * K.pxM), kind, h: kind === 'high' ? K.hHigh : kind === 'water' ? K.hWater : K.hh, pit: kind === 'water' ? K.pit : 0 });
  let len = 110;
  if (tw === 'sudden') { len = 60; for (let i = 0; i < 6; i++) add(12 + i * 7, 'h'); }
  else if (tw === 'final') {
    len = 220;
    const gaps = [7, 6.2, 8.5, 6, 10, 7];
    let m = 13;
    for (let i = 0; m < len - 16; i++) {
      const kind = i === 7 || i === 19 ? 'water' : i % 4 === 2 ? 'high' : 'h';
      add(m, kind);
      m += gaps[Math.floor(rnd() * gaps.length)] + (kind === 'water' ? 2 : 0);
    }
  } else if (tw === 'tricky') {
    const gaps = [5, 5.5, 7, 9, 11];
    let m = 12, short = false;
    while (m < len - 15) {
      add(m, 'h');
      let g = gaps[Math.floor(rnd() * gaps.length)];
      if (short && g < 6) g = 9;             // never two close pairs in a row
      short = g < 6; m += g;
    }
  } else if (tw === 'steeple') { for (let i = 0; i < 13; i++) add(13 + i * 7, i === 2 || i === 6 || i === 10 ? 'water' : 'h'); }
  else for (let i = 0; i < 13; i++) add(13 + i * 7, tw === 'high' ? 'high' : 'h');
  return { obs, len: len * K.pxM, lenM: len, wind: tw === 'wind' };
}
// the wind at x (px/s, + = tailwind): smooth stretches, tailwind first
function hurdlesWind(st, x) {
  if (!st.windy) return 0;
  const L = HURDLES.windLen * HURDLES.pxM;
  return HURDLES.wind * clamp(1.7 * Math.cos(Math.PI * Math.max(0, x) / L), -1, 1);
}
// ground speed from leg speed (the wind matters less while you're slow)
const hurdlesGsp = (v, w) => (v <= 0 ? 0 : Math.max(0, v + w * Math.min(1, v / 200)));
// the takeoff window for obstacle ob at ground speed g, as distances (px) from the runner's centre to the bar:
// lo..hi clears it (lo: later than this hits it on the way up; hi: earlier than this comes down on it or, for a water
// jump, splashes), c the middle (the gold zone's centre), sw the gold zone's half-width
function hurdlesWindow(st, ob, g, k) {
  const K = HURDLES, s = Math.sqrt(Math.max(0, 1 - ob.h / K.apex)), A = K.air;
  const lo = g * A / 2 * (1 - s) + K.foot, hiBar = g * A / 2 * (1 + s) - K.foot;
  const hi = ob.pit ? Math.min(hiBar, g * A - ob.pit - K.foot) : hiBar;
  const c = (lo + hi) / 2, half = Math.max(0, (hi - lo) / 2);
  const help = st.help ? st.help[k] || 0 : 0;
  return { lo, hi, hiBar, c, half, sw: Math.min(K.sweet * K.sweetMul[help] * g, half * K.sweetMax) };
}
const hurdlesInPit = (st, x) => st.obs.some(ob => ob.pit && x > ob.x + 4 && x < ob.x + ob.pit);
const hurdlesLeanOf = r => (r.dip > 0 ? Math.sin(Math.PI * (1 - r.dip / HURDLES.dipT)) : 0);
const hurdlesChest = r => r.x + HURDLES.chest + HURDLES.dipLean * hurdlesLeanOf(r);
function hurdlesRunner(k) {
  return { k, x: -16, v: 0, y: 0, air: false, airT: 0, vAir: 0, jump: null, buf: 0, stum: 0, stumK: '', burst: 0, streak: 0,
    dip: 0, dipCD: 0, dips: 0, next: 0, gT: 1, fin: null, ph: k * 1.7, land: 0, ranT: 0, perfect: 0, crashRun: 0, face: '', faceT: 0, wet: 0 };
}
// a floating word over a runner (slot: one at a time per runner)
function hurdlesPop(st, k, s, col, size = 20, life = 0.8) {
  const r = st.run[k];
  st.pops = st.pops.filter(q => q.k !== k);
  st.pops.push({ k, x: r.x, y: HURDLES.gY - 70 - r.y, s, col, size, t: 0, life });
}
function hurdlesPart(st, k, x, y, vx, vy, life, col, size, grav, kind = 'dot') {
  if (st.parts.length > 260) st.parts.shift();
  st.parts.push({ k, x, y, vx, vy, life, max: life, col, size, grav, kind, r: hurdlesVR() * 6 });
}

/* ---------- a runner's tick ---------- */
function hurdlesStepRunner(st, r, p, dt) {
  const K = HURDLES, inp = p.input, k = r.k;
  if (p.pendingJump) { p.pendingJump = false; r.buf = K.buf; }
  if (p.pendingAct) {
    p.pendingAct = false;
    if (r.dipCD <= 0) { r.dip = K.dipT; r.dipCD = K.dipT + K.dipCD; r.dips++; Sfx.play('hurdlesDip', k); }
  }
  r.dip = Math.max(0, r.dip - dt); r.dipCD = Math.max(0, r.dipCD - dt); r.stum = Math.max(0, r.stum - dt);
  r.burst = Math.max(0, r.burst - dt); r.land = Math.max(0, r.land - dt); r.faceT = Math.max(0, r.faceT - dt);
  if (inp.right) r.ranT += dt;
  // a press takes off at once on the ground (after a short push-off step since the last landing), or is kept for
  // K.buf s while in the air
  if (!r.air) r.gT += dt;
  if (r.buf > 0) { if (!r.air) { if (r.gT >= K.push) { hurdlesTakeoff(st, r); r.buf = 0; } } else r.buf -= dt; }
  const w = hurdlesWind(st, r.x);
  if (r.air) {
    r.airT += dt;
    r.x += r.vAir * dt;
    const g = hurdlesG(), t = Math.min(r.airT, K.air);
    r.y = g * K.air / 2 * t - g * t * t / 2;
    r.ph += dt * 2;
    if (r.airT >= K.air) hurdlesLand(st, r, w);
  } else {
    const wading = hurdlesInPit(st, r.x);
    let target = 0, acc;
    if (inp.right && !inp.left) {
      target = r.burst > 0 ? K.vTop + K.burstAdd : K.vTop;
      if (r.dip > 0) target *= K.dipSlow;
      if (wading) target = Math.min(target, K.vTop * K.wade);
      acc = r.v < target ? K.acc * (r.stum > 0 ? K.slowAcc : 1) : wading ? K.brake : K.decay;
    } else acc = inp.left ? K.brake : K.coast;
    r.v = approach(r.v, target, acc * dt);
    const g = hurdlesGsp(r.v, w);
    r.x += g * dt; r.ph += g * dt / 22;
    if (wading && g > 40) { r.wet = 1; if (hurdlesVR() < dt * 30) hurdlesPart(st, k, r.x - 6, K.gY - 2, -40 - hurdlesVR() * 60, -120 - hurdlesVR() * 80, 0.45, HURDLES_COL.waterHi, 2.5 + hurdlesVR() * 2, 600); }
    else if (r.burst > 0 && g > 300 && hurdlesVR() < dt * 40) hurdlesPart(st, k, r.x - 14, K.gY - 20 - hurdlesVR() * 30, -80, 0, 0.3, C.gold, 2 + hurdlesVR() * 2, 0, 'spark');
  }
  r.wet = Math.max(0, r.wet - dt * 0.8);
  while (r.next < st.obs.length && r.x >= st.obs[r.next].x) hurdlesPass(st, r, r.next);
}
function hurdlesTakeoff(st, r) {
  const K = HURDLES, w = hurdlesWind(st, r.x), g = hurdlesGsp(r.v, w), ob = st.obs[r.next];
  r.air = true; r.airT = 0; r.vAir = g; r.y = 0; r.jump = null;
  // the hop goes over (or onto) the next obstacle: graded now, applied as the runner reaches the bar
  if (ob && ob.x - K.foot < r.x + g * K.air + K.foot) {
    const D = ob.x - r.x, z = hurdlesWindow(st, ob, g, r.k);
    const grade = Math.abs(D - z.c) <= z.sw ? 'P' : D >= z.lo && D <= z.hi ? 'C' : ob.pit && D > z.hi && D <= z.hiBar ? 'S' : 'X';
    r.jump = { i: r.next, grade, te: g > 1 ? (D - z.c) / g : 0 };
  }
  st.stats.jumps[r.k]++;
  Sfx.play('hurdlesJump', r.k);
  hurdlesPart(st, r.k, r.x - 8, K.gY, -50, -40, 0.3, 'rgba(255,240,225,0.8)', 3, 200);
}
function hurdlesLand(st, r, w) {
  const K = HURDLES;
  r.air = false; r.y = 0; r.airT = 0; r.land = 0.14; r.gT = 0;
  r.v = Math.max(0, r.vAir - w * Math.min(1, r.vAir / 200));
  if (r.jump && st.obs[r.jump.i] && r.x < st.obs[r.jump.i].x - 2 * K.foot) r.jump = null;   // a hop that came down before its hurdle
  if (hurdlesInPit(st, r.x)) {
    r.v *= K.splashMul; r.stum = Math.max(r.stum, K.splashT); r.wet = 1; r.streak = 0;
    st.stats.splash[r.k]++;
    hurdlesPop(st, r.k, 'Splash!', '#bfe6ff', 20); r.face = 'oh'; r.faceT = 0.6;
    Sfx.play('hurdlesSplash', r.k);
    for (let i = 0; i < 16; i++) hurdlesPart(st, r.k, r.x + (hurdlesVR() - 0.5) * 30, K.gY - 2, (hurdlesVR() - 0.3) * 200, -150 - hurdlesVR() * 200, 0.6, i % 2 ? HURDLES_COL.water : HURDLES_COL.waterHi, 2.5 + hurdlesVR() * 3, 700);
  } else {
    for (let i = 0; i < 4; i++) hurdlesPart(st, r.k, r.x + (hurdlesVR() - 0.5) * 16, K.gY, (hurdlesVR() - 0.6) * 90, -30 - hurdlesVR() * 40, 0.35, 'rgba(255,236,220,0.75)', 2.5 + hurdlesVR() * 2, 160);
  }
}
// the runner's centre reached obstacle i: apply the jump's grade (or the crash if there was no jump)
function hurdlesPass(st, r, i) {
  const K = HURDLES, ob = st.obs[i], k = r.k, jp = r.jump && r.jump.i === i ? r.jump : null;
  r.next = i + 1;
  if (jp) r.jump = null;
  const grade = jp ? jp.grade : r.air ? 'C' : 'K';
  st.lastGrade[k] = { grade, te: jp ? jp.te : 0, t: st.t };
  if (grade === 'P') {
    r.streak++; r.perfect++; r.crashRun = 0;
    st.stats.perfect[k]++; st.stats.streak[k] = Math.max(st.stats.streak[k], r.streak);
    r.burst = K.burstT * (st.help[k] >= 2 ? K.burstHelp2 : 1);
    const cap = K.vTop + K.burstCap, w = hurdlesWind(st, r.x);
    if (r.air) r.vAir = Math.min(hurdlesGsp(cap, w), Math.max(r.vAir, hurdlesGsp(K.vTop, w)) + K.burstAdd * 0.6);
    r.v = Math.min(cap, Math.max(r.v, K.vTop) + K.burstAdd);
    hurdlesPop(st, k, r.streak >= 3 ? 'BURST x' + r.streak + '!' : 'BURST!', C.gold, r.streak >= 3 ? 24 : 22, 0.85);
    r.face = 'grin'; r.faceT = 0.9; st.cheer[k] = 1.2;
    Sfx.play('hurdlesBurst', k); rumble(k, 0.1, 0.35, 70);
    for (let n = 0; n < 12; n++) hurdlesPart(st, k, ob.x + (hurdlesVR() - 0.5) * 20, K.gY - ob.h - 4, (hurdlesVR() - 0.5) * 220, -60 - hurdlesVR() * 160, 0.55, n % 3 ? C.gold : '#fff6c8', 2 + hurdlesVR() * 3, 300, 'spark');
  } else if (grade === 'C' || grade === 'S') {
    r.streak = 0; r.crashRun = 0;
    if (grade === 'C') hurdlesPop(st, k, 'Clear', '#ffffff', 15, 0.5);
  } else {
    // 'X' clipped it (too early or too late) or 'K' ran into it: it tips over (a water barrier only shakes), you stumble
    const crash = grade === 'K';
    r.streak = 0; r.crashRun = crash ? r.crashRun + 1 : 0;
    st.stats.clips[k]++;
    if (ob.pit) st.shake[k][i] = 0.35; else st.tip[k][i] = 0.0001;
    if (r.air) r.vAir *= K.clipAir;
    r.v *= crash ? K.crashMul : K.clipMul;
    r.stum = Math.max(r.stum, crash ? K.crashT : K.clipT); r.stumK = crash ? 'crash' : 'clip';
    hurdlesPop(st, k, crash ? 'Whoops!' : jp && jp.te > 0 ? 'Too early!' : 'Too late!', '#ffffff', 18, 0.75);
    r.face = 'oh'; r.faceT = 0.7;
    Sfx.play('hurdlesClatter', k); rumble(k, 0.25, 0.3, 120);
    for (let n = 0; n < 7; n++) hurdlesPart(st, k, ob.x + (hurdlesVR() - 0.3) * 20, K.gY - 4, (hurdlesVR() - 0.2) * 160, -60 - hurdlesVR() * 120, 0.5, 'rgba(255,236,220,0.85)', 2.5 + hurdlesVR() * 2.5, 400);
  }
}

/* ---------- the mode ---------- */
MODES.hurdles = {
  rand: Math.random,       // the rules' randomness: the twist order and the Tricky / Double Dash gaps
  K: HURDLES, TW: HURDLES_TWISTS,
  testTwist: null, testHelp: null,
  win: hurdlesWindow, gsp: hurdlesGsp, wind: hurdlesWind, chest: hurdlesChest, lean: hurdlesLeanOf,
  setup(st) {
    st.stats = { perfect: [0, 0], clips: [0, 0], splash: [0, 0], streak: [0, 0], jumps: [0, 0], best: {}, close: null };
    const mix = HURDLES_MIX.slice();
    for (let i = mix.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [mix[i], mix[j]] = [mix[j], mix[i]]; }
    st.order = ['sprint', mix[0], mix[1], mix[2], 'final'];
  },
  resetRound(n, info) {
    const st = G.mst, K = HURDLES;
    st.round = n;
    st.twist = this.testTwist || (info.suddenDeath ? 'sudden' : st.order[n - 1] || 'final');
    const c = hurdlesCourse(st.twist, this.rand);
    st.obs = c.obs; st.len = c.len; st.lenM = c.lenM; st.windy = c.wind;
    if (st.obs.some(ob => ob.pit)) st.stats.water = true;
    st.help = this.testHelp ? this.testHelp.slice() : [0, 1].map(k => clamp(info.wins[1 - k] - info.wins[k], 0, K.helpMax));
    st.run = [hurdlesRunner(0), hurdlesRunner(1)];
    st.tip = [st.obs.map(() => 0), st.obs.map(() => 0)]; st.shake = [st.obs.map(() => 0), st.obs.map(() => 0)];
    st.lastGrade = [null, null];
    st.t = 0; st.live = false; st.limit = st.len / K.vTop * 1.15 + K.limitPad;
    st.cam = [-16 - K.runX, -16 - K.runX];
    st.parts = []; st.pops = []; st.cheer = [0, 0]; st.flash = 0; st.photo = null; st.tape = null; st.end = null; st.endT = 0;
    this.mirror();
  },
  go() { const st = G.mst; st.live = true; Sfx.play('hurdlesGun'); },
  step(dt) {
    const st = G.mst;
    if (!st.run) return;
    st.t += dt;
    const crossed = [];
    for (const r of st.run) {
      const c0 = hurdlesChest(r);
      hurdlesStepRunner(st, r, G.players[r.k], dt);
      const c1 = hurdlesChest(r);
      if (r.fin == null && c1 >= st.len) { r.fin = st.t - dt + clamp(c1 > c0 ? (st.len - c0) / (c1 - c0) : 1, 0, 1) * dt; crossed.push(r); }
    }
    this.fx(dt);
    if (crossed.length) this.finish(crossed);
    else if (st.t >= st.limit) this.bell();
  },
  // frozen ticks: the blocks before GO, and the run-out after the line during the round-end banner (looks only)
  idle(dt) {
    const st = G.mst, m = G.match;
    if (!st.run) return;
    if (m && (m.phase === 'end' || m.phase === 'over')) {
      st.endT += dt;
      for (const r of st.run) {
        r.dip = Math.max(0, r.dip - dt); r.stum = Math.max(0, r.stum - dt); r.faceT = Math.max(0, r.faceT - dt); r.burst = Math.max(0, r.burst - dt);
        if (r.air) {
          r.airT += dt; r.x += r.vAir * dt;
          const g = hurdlesG(), t = Math.min(r.airT, HURDLES.air);
          r.y = g * HURDLES.air / 2 * t - g * t * t / 2;
          if (r.airT >= HURDLES.air) { r.air = false; r.y = 0; r.v = r.vAir; }
          continue;
        }
        const over = hurdlesChest(r) >= st.len, ob = st.obs[r.next];
        // past the line: jog to a stop; still racing: run on to the line (or stop before the next hurdle)
        let dec = over ? 260 : 0;
        if (!over && ob) { const room = ob.x - 40 - r.x; dec = room > 4 ? Math.max(200, r.v * r.v / (2 * room)) : 2400; }
        r.v = approach(r.v, 0, dec * dt);
        r.x += r.v * dt; r.ph += r.v * dt / 22;
      }
    }
    this.fx(dt);
  },
  // cameras, particles, pops, and the engine players' screen spots (name tags, bubbles, confetti)
  fx(dt) {
    const st = G.mst, K = HURDLES;
    for (const k of [0, 1]) {
      const r = st.run[k];
      st.cam[k] = Math.min(r.x - K.runX, st.len - K.finX);   // (the camera stops at the finish: you run on across the screen)
      st.cheer[k] = Math.max(0, st.cheer[k] - dt);
      st.tip[k] = st.tip[k].map(t => (t > 0 ? t + dt : 0));
      st.shake[k] = st.shake[k].map(t => Math.max(0, t - dt));
    }
    for (let i = st.parts.length - 1; i >= 0; i--) {
      const q = st.parts[i];
      q.life -= dt;
      if (q.life <= 0) { st.parts.splice(i, 1); continue; }
      q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 8;
    }
    for (let i = st.pops.length - 1; i >= 0; i--) { st.pops[i].t += dt; if (st.pops[i].t > st.pops[i].life) st.pops.splice(i, 1); }
    st.flash = Math.max(0, st.flash - dt * 2.2);
    if (st.tape) st.tape.t += dt;
    // the windy streaks drift with the wind
    if (st.windy) for (const k of [0, 1]) if (hurdlesVR() < dt * 10) {
      const w = hurdlesWind(st, st.run[k].x), x = st.cam[k] + (w > 0 ? -20 : W + 20);
      hurdlesPart(st, k, x, 20 + hurdlesVR() * 150, w > 0 ? 520 : -520, 0, 2.2, 'rgba(255,255,255,0.5)', 1, 0, 'streak');
    }
    this.mirror();
  },
  mirror() {
    const st = G.mst, K = HURDLES;
    if (!st.run) return;
    for (const p of G.players) {
      const r = st.run[p.id];
      p.x = r.x - st.cam[p.id] - PW / 2; p.y = K.stripY[p.id] + K.gY - r.y - 60; p.w = PW; p.h = PH;
      p.vx = 0; p.vy = 0; p.alive = true; p.face = 1; p.stompSafe = 0; p.stun = 0; p.grounded = !r.air;
    }
  },
  // someone's chest crossed the line this tick
  finish(crossed) {
    const st = G.mst, K = HURDLES, [a, b] = st.run;
    st.tape = { t: 0 }; st.end = Math.min(...crossed.map(q => q.fin));
    Sfx.play('hurdlesTape'); Sfx.play('hurdlesCheer');
    if (crossed.length === 2 && Math.abs(a.fin - b.fin) < 0.002) {
      st.flash = 1; st.photo = { w: -1, margin: 0 }; Sfx.play('hurdlesPhoto');
      this.best(a, a.fin); this.best(b, b.fin);
      matchRoundEnd(-1, 'Dead heat!');
      return;
    }
    const w = crossed.length === 2 ? (a.fin < b.fin ? 0 : 1) : crossed[0].k, R = st.run[w], L = st.run[1 - w];
    const gl = L.air ? L.vAir : hurdlesGsp(L.v, hurdlesWind(st, L.x));
    const lt = L.fin != null ? L.fin : st.t + (st.len - hurdlesChest(L)) / Math.max(120, gl);
    const margin = Math.max(0.01, lt - R.fin), gapM = Math.max(0, st.len - hurdlesChest(L)) / K.pxM;
    this.best(R, R.fin); this.best(L, lt);
    if (!st.stats.close || margin < st.stats.close.margin) st.stats.close = { margin, w, round: st.round };
    let reason;
    if (margin < 0.1) {
      reason = 'Photo finish by ' + margin.toFixed(2) + ' s!';
      st.flash = 1; st.photo = { w, margin }; Sfx.play('hurdlesPhoto');
    } else if (gapM < 10) reason = 'Won by ' + gapM.toFixed(1) + ' m!';
    else reason = 'Won by ' + Math.round(gapM) + ' m!';
    if (R.dip > 0 && margin < 0.1 && hurdlesLeanOf(R) > 0.5) reason = 'A dip at the line, by ' + margin.toFixed(2) + ' s!';
    st.cheer = [w === 0 ? 2.5 : 0.8, w === 1 ? 2.5 : 0.8];
    matchRoundEnd(w, reason);
  },
  best(r, t) {
    const st = G.mst, b = st.stats.best[st.lenM] || (st.stats.best[st.lenM] = [null, null]);
    if (t != null && isFinite(t) && (b[r.k] == null || t < b[r.k])) b[r.k] = t;
  },
  // the safety bell: nobody finished in time, so the one further down the track wins
  bell() {
    const st = G.mst, [a, b] = st.run, d = hurdlesChest(a) - hurdlesChest(b);
    st.end = st.t;
    if (Math.abs(d) < 6) { matchRoundEnd(-1, 'Neck and neck at the bell!'); return; }
    matchRoundEnd(d > 0 ? 0 : 1, 'Furthest down the track!');
  },
  // a second dead heat in a row: more speed bursts in that race wins it
  tiebreak() {
    const r = G.mst.run;
    if (!r || r[0].perfect === r[1].perfect) return -1;
    return { winner: r[0].perfect > r[1].perfect ? 0 : 1, reason: 'More speed bursts!' };
  },
  stats() {
    const s = G.mst.stats;
    if (!s) return [];
    const out = [
      { label: 'Speed bursts', values: s.perfect.slice() },
      { label: 'Clipped hurdles', values: s.clips.slice() },
      { label: 'Best burst streak', values: s.streak.slice() },
    ];
    // (times go in a line: two "18.0" values are too wide for a tile)
    if (s.water) out.push({ label: 'Splashes', values: s.splash.slice() });
    const b = s.best[110];
    if (b && (b[0] != null || b[1] != null)) out.push('Fastest 110 m: ' + [0, 1].filter(k => b[k] != null).map(k => NAMES[k] + ' ' + b[k].toFixed(1) + ' s').join(' · '));
    const wn = G.match ? G.match.wins : [0, 0], sweep = Math.min(wn[0], wn[1]) === 0 && Math.max(wn[0], wn[1]) >= 3;
    const sw = wn[0] > wn[1] ? 0 : 1, solo = typeof cpuSolo === 'function' && cpuSolo();
    if (sweep && solo) out.push(cpuOn(sw) ? 'Too fast? Try the computer on Easy!' : 'Clean sweep, ' + NAMES[sw] + '! Gold medal!');
    else if (s.close && s.close.margin < 0.5) out.push('Closest finish: round ' + s.close.round + ', ' + NAMES[s.close.w] + ' by ' + s.close.margin.toFixed(2) + ' s');
    else if (sweep) out.push(NAMES[sw] + ' takes the gold medal!');
    return out;
  },

  // ---------------------------------------------------------------- drawing ----
  draw() {
    const st = G.mst;
    if (!st.run) return;
    hurdlesDrawTop(st);
    for (const k of [0, 1]) hurdlesDrawStrip(st, k);
    // the infield under the lanes (the race map sits on it)
    const by = HURDLES.stripY[1] + HURDLES.stripH;
    ctx.fillStyle = HURDLES_COL.grassDk; ctx.fillRect(0, by, W, H - by);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; for (let x = -((st.cam[0] + st.cam[1]) / 2 % 40); x < W; x += 40) ctx.fillRect(x, by, 20, H - by);
    // the engine draws the players between draw() and drawTop(): hidden for that moment (the strips drew them)
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
  },
  hud() {
    const st = G.mst;
    if (st.run) hurdlesHud(st);
  },
};

/* ---------- drawing: the sky band, the stands, the torch ---------- */
let hurdlesSkyG = null;
function hurdlesDrawTop(st) {
  const K = HURDLES, cl = G.clock, off = (st.cam[0] + st.cam[1]) / 2 * 0.06;
  if (!hurdlesSkyG) { hurdlesSkyG = ctx.createLinearGradient(0, 0, 0, K.stripY[0]); hurdlesSkyG.addColorStop(0, '#4fb6f0'); hurdlesSkyG.addColorStop(1, '#bfe8ff'); }
  ctx.fillStyle = hurdlesSkyG; ctx.fillRect(0, 0, W, K.stripY[0]);
  // a couple of soft clouds
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 4; i++) {
    const x = ((i * 290 + 60 - off * 0.5 - cl * 6) % 1160 + 1160) % 1160 - 100, y = 18 + (i % 2) * 14;
    circle(x, y, 11); ctx.fill(); circle(x + 14, y - 5, 13); ctx.fill(); circle(x + 30, y, 10); ctx.fill(); ctx.fillRect(x, y, 30, 10);
  }
  // the far side of the stadium: a long curved stand with a roof and a sea of tiny fans
  const top = 48;
  ctx.fillStyle = HURDLES_COL.standDk; ctx.beginPath(); ctx.moveTo(0, top + 6); ctx.quadraticCurveTo(W / 2, top - 10, W, top + 6); ctx.lineTo(W, K.stripY[0]); ctx.lineTo(0, K.stripY[0]); ctx.closePath(); ctx.fill();
  for (let row = 0; row < 5; row++) {
    const y = top + 10 + row * 9;
    ctx.fillStyle = row % 2 ? HURDLES_COL.stand : HURDLES_COL.standHi; ctx.fillRect(0, y, W, 9);
    for (let c = -1; c < 98; c++) {
      const x = c * 10 + 5 - (off % 10), h = hash(c + Math.floor(off / 10), row + 40);
      if (h % 7 === 0) continue;
      ctx.fillStyle = HURDLES_COL.fans[h % HURDLES_COL.fans.length];
      circle(x, y + 4 - (Math.sin(cl * 5 + c) > 0.9 ? 1.5 : 0), 2.6); ctx.fill();
    }
  }
  // the roof edge and its flags (made-up colours)
  ctx.strokeStyle = '#e9f2ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, top + 6); ctx.quadraticCurveTo(W / 2, top - 10, W, top + 6); ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const x = 70 + i * 104, y = top + 6 - 16 * (1 - Math.pow((x - W / 2) / (W / 2), 2)) * 0.5 - 1;
    const fc = HURDLES_COL.flags[i % HURDLES_COL.flags.length], wv = Math.sin(cl * 4 + i) * 2;
    ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 22); ctx.stroke();
    ctx.fillStyle = fc[0]; ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.quadraticCurveTo(x + 8, y - 22 + wv, x + 16, y - 20 + wv); ctx.lineTo(x + 16, y - 12 + wv); ctx.quadraticCurveTo(x + 8, y - 13 + wv, x, y - 13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = fc[1]; ctx.fillRect(x + 1, y - 18.5 + wv * 0.5, 14, 2.2);
  }
  // the torch on its tower (right)
  const tx = 912, ty = 40;
  ctx.fillStyle = '#d9dbe8'; ctx.beginPath(); ctx.moveTo(tx - 6, K.stripY[0]); ctx.lineTo(tx - 3, ty + 10); ctx.lineTo(tx + 3, ty + 10); ctx.lineTo(tx + 6, K.stripY[0]); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(tx - 16, ty); ctx.lineTo(tx + 16, ty); ctx.lineTo(tx + 8, ty + 12); ctx.lineTo(tx - 8, ty + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const f = Math.sin(cl * 9 + i * 2) * 2, hgt = 22 - i * 5;
    ctx.fillStyle = ['#ff7a2f', '#ffb13d', '#fff1a8'][i];
    ctx.beginPath(); ctx.moveTo(tx - 12 + i * 4, ty); ctx.quadraticCurveTo(tx - 10 + i * 3, ty - hgt * 0.6, tx + f, ty - hgt); ctx.quadraticCurveTo(tx + 10 - i * 3, ty - hgt * 0.6, tx + 12 - i * 4, ty); ctx.closePath(); ctx.fill();
  }
}

/* ---------- drawing: one lane strip (its own camera) ---------- */
function hurdlesDrawStrip(st, k) {
  const K = HURDLES, y0 = K.stripY[k], cam = st.cam[k], r = st.run[k], o = st.run[1 - k];
  ctx.save();
  ctx.beginPath(); ctx.rect(0, y0, W, K.stripH); ctx.clip();
  ctx.translate(0, y0);
  hurdlesDrawStands(st, k, cam);
  hurdlesDrawBoards(st, k, cam);
  hurdlesDrawTrack(st, k, cam);
  // the far lane: the other runner's hurdles (as that runner left them) and the other runner, smaller
  const sx = x => x - cam;
  for (let i = 0; i < st.obs.length; i++) {
    const ob = st.obs[i], x = sx(ob.x);
    if (x < -80 || x > W + 80) continue;
    hurdlesDrawObstacle(st, ob, x, K.farY, K.SF, st.tip[1 - k][i], st.shake[1 - k][i], true);
  }
  const ox = sx(o.x);
  // (faded a little while right behind you, so the small far runner reads as "behind", not as a hat on your head)
  const near = clamp(1 - Math.abs(o.x - r.x) / 40, 0, 1);
  if (ox > -40 && ox < W + 40) hurdlesDrawRunner(st, o, ox, K.farY, K.SF, { alpha: 0.9 - 0.35 * near, far: true });
  hurdlesDrawFinish(st, k, cam, 'back');
  // the near lane: your gold zones, hurdles and you
  for (let i = r.next; i < Math.min(st.obs.length, r.next + 2) && G.match && G.match.phase !== 'end' && G.match.phase !== 'over'; i++) hurdlesDrawZone(st, k, i, cam);
  for (let i = 0; i < st.obs.length; i++) {
    const ob = st.obs[i], x = sx(ob.x);
    if (x < -80 || x > W + 80) continue;
    hurdlesDrawObstacle(st, ob, x, K.gY, K.SN, st.tip[k][i], st.shake[k][i], false);
  }
  hurdlesDrawRunner(st, r, sx(r.x), K.gY, K.SN, { alpha: 1 });
  hurdlesDrawFinish(st, k, cam, 'front');
  // particles and pops
  for (const q of st.parts) {
    if (q.k !== k) continue;
    const x = sx(q.x);
    if (x < -20 || x > W + 20) continue;
    const a = clamp(q.life / q.max, 0, 1);
    ctx.globalAlpha = a;
    if (q.kind === 'streak') { ctx.strokeStyle = q.col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, q.y); ctx.lineTo(x - Math.sign(q.vx) * 26, q.y); ctx.stroke(); }
    else if (q.kind === 'spark') { ctx.fillStyle = q.col; hurdlesStar(x, q.y, q.size * 1.8, q.size * 0.6, q.r); ctx.fill(); }
    else { ctx.fillStyle = q.col; circle(x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  const big = hudBig();
  for (const q of st.pops) {
    if (q.k !== k) continue;
    // (a pop rides along above its runner, so it never drifts back over the lane's name pill)
    const u = q.t / q.life, x = clamp(sx(r.x) + 20 + u * 10, 200, W - 70), y = Math.max(big ? 46 : 40, q.y - u * 26);
    ctx.globalAlpha = clamp((1 - u) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.35 : 1), q.col, 1 + 0.3 * Math.max(0, 1 - q.t / 0.12));
  }
  ctx.globalAlpha = 1;
  // the strip's bottom edge
  ctx.fillStyle = 'rgba(28,26,54,0.55)'; ctx.fillRect(0, K.stripH - 2, W, 2);
  ctx.restore();
}
function hurdlesStar(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, rr2 = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  ctx.closePath();
}
// the crowd behind the lane (half speed): each strip's fans wave that runner's colour
function hurdlesDrawStands(st, k, cam) {
  const K = HURDLES, off = cam * 0.5, cl = G.clock, cheer = st.cheer[k] > 0;
  const g = ctx.createLinearGradient(0, 0, 0, K.laneTop);
  g.addColorStop(0, HURDLES_COL.standDk); g.addColorStop(1, HURDLES_COL.stand);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 64);
  for (let row = 0; row < 3; row++) {
    const y = 8 + row * 18, sh = (row % 2) * 9;
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(0, y + 13, W, 3);
    const c0 = Math.floor((off - sh) / 18) - 1;
    for (let c = c0; c < c0 + W / 18 + 3; c++) {
      const x = c * 18 + sh - off, h = hash(c, row + k * 7);
      if (h % 9 === 0) continue;
      const bob = Math.sin(cl * (cheer ? 14 : 3) + c * 1.3) * (cheer ? 2.5 : 0.8), hy = y + bob;
      const shirt = h % 5 === 0 ? PCOL[k] : HURDLES_COL.fans[(h >> 3) % HURDLES_COL.fans.length];
      ctx.fillStyle = shirt; rr(x - 6, hy + 4, 12, 10, 4); ctx.fill();
      ctx.fillStyle = HURDLES_COL.skin[(h >> 5) % 4]; circle(x, hy, 4.6); ctx.fill();
      if (cheer && h % 3 === 0) {   // arms up
        ctx.strokeStyle = HURDLES_COL.skin[(h >> 5) % 4]; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 5, hy + 5); ctx.lineTo(x - 8, hy - 5); ctx.moveTo(x + 5, hy + 5); ctx.lineTo(x + 8, hy - 5); ctx.stroke();
      }
      if (h % 11 === 1) {           // a little flag in this runner's colour
        const wv = Math.sin(cl * 6 + c) * 2;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 6, hy + 6); ctx.lineTo(x + 6, hy - 10); ctx.stroke();
        ctx.fillStyle = PCOL[k]; ctx.beginPath(); ctx.moveTo(x + 6, hy - 10); ctx.lineTo(x + 16, hy - 7 + wv); ctx.lineTo(x + 6, hy - 3); ctx.closePath(); ctx.fill();
      }
    }
  }
}
// the advertising boards along the track (same speed as the track); windsocks on Windy Day
function hurdlesDrawBoards(st, k, cam) {
  const K = HURDLES, y = 62, h = K.laneTop - y, span = 300;
  ctx.fillStyle = '#2b2850'; ctx.fillRect(0, y, W, h);
  const i0 = Math.floor((cam - 40) / span);
  for (let i = i0; i < i0 + W / span + 2; i++) {
    const x = i * span - cam + 6, bc = HURDLES_COL.boards[((i % 5) + 5) % 5];
    ctx.fillStyle = bc[0]; rr(x, y + 2, span - 12, h - 4, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x + 2, y + 3, span - 16, 4);
    const s = HURDLES_ADS[((i % HURDLES_ADS.length) + HURDLES_ADS.length) % HURDLES_ADS.length];
    ctx.font = '15px "Lilita One", "Arial Rounded MT Bold", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = bc[1]; ctx.fillText(s, x + (span - 12) / 2, y + h / 2 + 1);
    ctx.fillStyle = bc[1]; for (const sx of [x + 18, x + span - 30]) { hurdlesStar(sx, y + h / 2, 6, 2.6, -Math.PI / 2); ctx.fill(); }
  }
  if (st.windy) {
    const step = 9 * K.pxM, j0 = Math.floor(cam / step);
    for (let j = j0; j < j0 + W / step + 2; j++) {
      const wx = j * step, x = wx - cam + 150, w = hurdlesWind(st, wx + 150), d = Math.sign(w) || 1, mag = Math.abs(w) / K.wind;
      ctx.strokeStyle = '#e9e4f5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y - 30); ctx.stroke();
      // the sock: stiff in a strong wind, droopy near the turn
      const len = 26, droop = (1 - mag) * 14, fl = Math.sin(G.clock * 12 + j) * 2;
      for (let s = 0; s < 4; s++) {
        const a = s / 4, b = (s + 1) / 4;
        ctx.fillStyle = s % 2 ? '#ffffff' : '#ff6b4a';
        ctx.beginPath();
        ctx.moveTo(x + d * len * a, y - 30 + droop * a * a - 5 * (1 - a * 0.4) + fl * a);
        ctx.lineTo(x + d * len * b, y - 30 + droop * b * b - 5 * (1 - b * 0.4) + fl * b);
        ctx.lineTo(x + d * len * b, y - 30 + droop * b * b + 5 * (1 - b * 0.4) + fl * b);
        ctx.lineTo(x + d * len * a, y - 30 + droop * a * a + 5 * (1 - a * 0.4) + fl * a);
        ctx.closePath(); ctx.fill();
      }
    }
  }
}
// the two lanes, lines, start, distance marks, water pits, and the kerb
function hurdlesDrawTrack(st, k, cam) {
  const K = HURDLES, col = HURDLES_COL, sx = x => x - cam;
  ctx.fillStyle = col.track; ctx.fillRect(0, K.laneTop, W, K.laneBot - K.laneTop);
  ctx.fillStyle = col.trackDk; ctx.fillRect(0, K.laneTop, W, 6);
  // a soft rubbery speckle (moves with the track)
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  const c0 = Math.floor(cam / 23);
  for (let c = c0; c < c0 + W / 23 + 2; c++) for (let j = 0; j < 4; j++) { const h = hash(c, j); ctx.fillRect(c * 23 - cam + (h % 19), K.laneTop + 8 + ((h >> 4) % 84), 2, 2); }
  // lane lines
  ctx.fillStyle = col.line;
  for (const y of [K.laneTop + 1, K.laneMid, K.laneBot - 2]) ctx.fillRect(0, y - 1, W, 2.5);
  // lane numbers at the start, start line, the blocks
  const x0 = sx(0);
  if (x0 > -200 && x0 < W + 60) {
    ctx.fillStyle = col.line; ctx.beginPath(); ctx.moveTo(x0 - 2, K.laneTop); ctx.lineTo(x0 + 2, K.laneTop); ctx.lineTo(x0 + 5, K.laneBot); ctx.lineTo(x0 + 1, K.laneBot); ctx.closePath(); ctx.fill();
    text(String(2 - k), x0 - 70, (K.laneTop + K.laneMid) / 2 + 1, 22, 'rgba(255,255,255,0.75)', 'center');
    text(String(k + 1), x0 - 80, (K.laneMid + K.laneBot) / 2 + 2, 34, 'rgba(255,255,255,0.8)', 'center');
    for (const [y, s] of [[K.gY, K.SN], [K.farY, K.SF]]) {
      ctx.fillStyle = '#5b6578'; ctx.fillRect(x0 - 40 * s, y - 3 * s, 26 * s, 3 * s);
      ctx.fillStyle = '#9aa3b8'; ctx.beginPath(); ctx.moveTo(x0 - 38 * s, y - 3 * s); ctx.lineTo(x0 - 34 * s, y - 10 * s); ctx.lineTo(x0 - 31 * s, y - 3 * s); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x0 - 24 * s, y - 3 * s); ctx.lineTo(x0 - 20 * s, y - 9 * s); ctx.lineTo(x0 - 17 * s, y - 3 * s); ctx.fill();
    }
  }
  // distance marks every 10 m
  for (let m = 10; m < st.lenM; m += 10) {
    const x = sx(m * K.pxM);
    if (x < -30 || x > W + 30) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x - 1, K.laneBot - 9, 2, 7);
    text(m + ' m', x + 4, K.laneBot - 6, 10, 'rgba(255,255,255,0.6)', 'left', 'body');
  }
  // water pits (both lanes)
  for (const ob of st.obs) {
    if (!ob.pit) continue;
    const x = sx(ob.x);
    if (x < -K.pit - 20 || x > W + 20) continue;
    for (const [y0, y1] of [[K.laneTop + 8, K.laneMid - 3], [K.laneMid + 6, K.laneBot - 4]]) {
      ctx.fillStyle = col.waterDk; rr(x + 2, y0, ob.pit * (y0 > K.laneMid ? 1 : 0.92), y1 - y0, 6); ctx.fill();
      ctx.fillStyle = col.water; rr(x + 4, y0 + 2, ob.pit * (y0 > K.laneMid ? 1 : 0.92) - 4, y1 - y0 - 3, 5); ctx.fill();
      ctx.strokeStyle = col.waterHi; ctx.lineWidth = 1.5;
      for (let j = 0; j < 3; j++) {
        const yy = y0 + 5 + j * (y1 - y0 - 8) / 2, ph = G.clock * 3 + j * 1.7 + ob.x;
        ctx.beginPath(); for (let q = 0; q <= 6; q++) ctx.lineTo(x + 10 + q * (ob.pit - 22) / 6, yy + Math.sin(ph + q) * 1.3); ctx.stroke();
      }
    }
  }
  // the kerb and the infield grass
  ctx.fillStyle = '#f1efe6'; ctx.fillRect(0, K.laneBot, W, 5);
  ctx.fillStyle = col.grass; ctx.fillRect(0, K.laneBot + 5, W, K.stripH - K.laneBot - 5);
  ctx.fillStyle = col.grassDk;
  const g0 = Math.floor(cam / 40);
  for (let c = g0; c < g0 + W / 40 + 2; c++) if (c % 2 === 0) ctx.fillRect(c * 40 - cam, K.laneBot + 5, 40, K.stripH - K.laneBot - 5);
}
// the gold take-off zone in front of obstacle i (where your feet should be when you jump), from your own speed
function hurdlesDrawZone(st, k, i, cam) {
  const K = HURDLES, r = st.run[k], ob = st.obs[i];
  const g = Math.max(r.air ? r.vAir : hurdlesGsp(r.v, hurdlesWind(st, r.x)), 120);   // (a standing runner sees a jogging-speed zone)
  const z = hurdlesWindow(st, ob, g, k), a = ob.x - z.c - z.sw - cam, b = ob.x - z.c + z.sw - cam;
  if (b < -10 || a > W + 10) return;
  const help = st.help[k] > 0, y = K.gY, pulse = 0.5 + 0.5 * Math.sin(G.clock * 8);
  ctx.save();
  if (help) { ctx.shadowColor = C.gold; ctx.shadowBlur = 12; }
  ctx.fillStyle = help ? `rgba(255,214,90,${0.7 + 0.2 * pulse})` : 'rgba(255,205,70,0.62)';
  ctx.beginPath(); ctx.moveTo(a + 5, y - 8); ctx.lineTo(b + 5, y - 8); ctx.lineTo(b - 2, y + 9); ctx.lineTo(a - 2, y + 9); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = help ? '#fff3b0' : 'rgba(255,240,190,0.9)'; ctx.lineWidth = 1.5; ctx.stroke();
  // chevrons pointing at the hurdle
  ctx.strokeStyle = 'rgba(150,90,0,0.55)'; ctx.lineWidth = 2;
  for (let c = a + 6; c < b - 4; c += 9) { ctx.beginPath(); ctx.moveTo(c, y - 4); ctx.lineTo(c + 4, y + 0.5); ctx.lineTo(c, y + 5); ctx.stroke(); }
  ctx.restore();
}
// a hurdle (3/4 view: near leg, far leg, the striped bar; feet point at the runner) or a steeplechase water barrier
function hurdlesDrawObstacle(st, ob, x, gy, s, tipT, shake, far) {
  // heights are near-lane screen px (what the jump has to clear); widths scale with the lane
  const h = ob.h / HURDLES.SN;
  ctx.save();
  ctx.translate(x + (shake > 0 ? Math.sin(shake * 60) * 2 * s : 0), gy);
  ctx.scale(s, s);
  const fx = 14, fy = -13;   // where the far leg stands (the 3/4 view across the lane)
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (ob.pit) {
    // the steeplechase barrier: a thick beam on two stout posts (it never tips; you splash instead)
    ctx.fillStyle = '#4d5578'; ctx.fillRect(fx - 2, fy - h, 5, h); ctx.fillRect(fx - 6, fy - 2, 13, 3);
    ctx.fillStyle = '#6a7290'; ctx.fillRect(-3, -h, 6, h); ctx.fillRect(-8, -2, 15, 3);
    const beam = () => { ctx.beginPath(); ctx.moveTo(-4, -h - 6); ctx.lineTo(fx + 4, fy - h - 6); ctx.lineTo(fx + 4, fy - h + 5); ctx.lineTo(-4, -h + 5); ctx.closePath(); };
    ctx.save(); beam(); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.clip();
    ctx.fillStyle = '#1c1a36'; for (let i = 0; i < 4; i++) ctx.fillRect(-4 + i * 6, -h - 30, 3, 40);
    ctx.restore();
    beam(); ctx.strokeStyle = '#2b2850'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.restore();
    return;
  }
  // tipping over forward (away from the runner): a quick fall with a little bounce
  if (tipT > 0) {
    const u = Math.min(1, tipT / 0.22), a = u < 1 ? u * u * 1.4 : 1.4 - Math.max(0, Math.sin((tipT - 0.22) * 18) * 0.12 * Math.exp(-(tipT - 0.22) * 8));
    ctx.rotate(a);
  }
  // the far leg and foot, then the near ones (feet point back at the runner)
  ctx.strokeStyle = '#3d3a5c'; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(fx - 11, fy); ctx.lineTo(fx, fy); ctx.lineTo(fx, fy - h + 2); ctx.stroke();
  ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(0, 0); ctx.lineTo(0, -h + 2); ctx.stroke();
  ctx.strokeStyle = '#8a90a6'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-1.2, -1); ctx.lineTo(-1.2, -h + 3); ctx.stroke();
  // the bar: a white board with stripes, from the near leg's top across to the far leg's top
  const bh = 7;
  const bar = () => { ctx.beginPath(); ctx.moveTo(-2, -h - 2); ctx.lineTo(fx + 2, fy - h - 2); ctx.lineTo(fx + 2, fy - h + bh); ctx.lineTo(-2, -h + bh); ctx.closePath(); };
  ctx.save(); bar(); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.clip();
  ctx.fillStyle = ob.kind === 'high' ? '#7b5cff' : '#e8443a';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-2 + i * 5, -h + bh); ctx.lineTo(1 + i * 5, -h + bh); ctx.lineTo(1 + i * 5, fy - h - 4); ctx.lineTo(-2 + i * 5, fy - h - 4); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  bar(); ctx.strokeStyle = 'rgba(28,26,54,0.6)'; ctx.lineWidth = 1.1; ctx.stroke();
  ctx.restore();
}
// the finish: checkered line across both lanes, the tape, and the gantry with the race clock
function hurdlesDrawFinish(st, k, cam, layer) {
  const K = HURDLES, x = st.len - cam;
  if (x < -160 || x > W + 160) return;
  if (layer === 'back') {
    for (let j = 0; j < 9; j++) for (let c = 0; c < 2; c++) {
      ctx.fillStyle = (j + c) % 2 ? '#ffffff' : '#1c1a36';
      const y = K.laneTop + j * (K.laneBot - K.laneTop) / 9, sk = (y - K.laneTop) / (K.laneBot - K.laneTop) * 4;
      ctx.fillRect(x + c * 5 + sk - 5, y, 5, (K.laneBot - K.laneTop) / 9 + 0.5);
    }
    // the far gantry post and the board
    ctx.fillStyle = '#c9cede'; ctx.fillRect(x + 16, -10, 5, K.laneTop + 30);
    ctx.fillStyle = '#2b2850'; rr(x - 54, 6, 116, 30, 6); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x - 54, 6, 116, 30, 6); ctx.stroke();
    text('FINISH', x + 4, 22, 18, C.gold, 'center');
    // the tape across the lanes at chest height: whole, or snapped after the winner broke it
    ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    const ny = K.gY - 30 * K.SN, fy = K.farY - 30 * K.SF;
    if (!st.tape) { ctx.beginPath(); ctx.moveTo(x + 2, ny); ctx.quadraticCurveTo(x + 6, (ny + fy) / 2 + 3, x + 10, fy); ctx.stroke(); }
    else {
      const u = Math.min(1, st.tape.t / 0.5), sw = Math.sin(st.tape.t * 7) * 6 * (1 - u * 0.6);
      ctx.beginPath(); ctx.moveTo(x + 10, fy); ctx.quadraticCurveTo(x + 18 + sw, fy + 10, x + 14 + sw, fy + 26 * u + 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 2, ny); ctx.quadraticCurveTo(x + 14 - sw, ny - 10 + 12 * u, x + 20 - sw, ny + 14 * u + 4); ctx.stroke();
    }
  } else {
    // the near post with the race clock (the clock stops at the winner's time)
    ctx.fillStyle = '#e1e5f0'; ctx.fillRect(x + 4, 30, 6, K.laneBot - 26);
    ctx.fillStyle = '#9aa3b8'; ctx.fillRect(x + 4, 30, 2, K.laneBot - 26);
    const tm = st.end ? st.end : st.t;
    ctx.fillStyle = '#1c1a36'; rr(x - 26, 40, 66, 24, 5); ctx.fill();
    text(tm.toFixed(2), x + 7, 52.5, 15, '#7dff9a', 'center', 'body');
  }
}

/* ---------- drawing: a runner (Pip or Bo in running kit) ---------- */
// feet at (x, gy) in strip coordinates; s = scale (near lane 1.45, far lane 0.92)
function hurdlesDrawRunner(st, r, x, gy, s, o) {
  const k = r.k, col = PCOL[k], dark = PDARK[k], m = G.match, K = HURDLES;
  const phase = m ? m.phase : 'live';
  const frozen = phase === 'intro' || phase === 'ready' || phase === 'count';
  const ended = phase === 'end' || phase === 'over';
  const won = ended && m.end && (m.end.final ? m.end.matchWinner === k : m.end.winner === k);
  const hy = r.y * s / K.SN;
  ctx.save();
  ctx.globalAlpha = o.alpha;
  ctx.translate(x, gy);
  // shadow on the track
  ctx.fillStyle = 'rgba(28,26,54,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 0, 13 * s * (1 - Math.min(0.45, hy / 150)), 3 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(0, -hy);
  ctx.scale(s, s);
  // pose: lean (rad, forward +, around the hips), hip height, legs [thigh, shin] and arms [upper, fore] as angles from
  // straight down (forward +); [0] is the far limb (drawn behind the body), [1] the near one
  const ph = r.ph, L = 8, A = 5;
  let lean = 0.14, hipY = -15, legs, arms, sh = [[1, -7], [2, -6]], face = r.faceT > 0 ? r.face : '';
  const runLegs = (amp = 0.85) => [Math.PI, 0].map(d => { const a = amp * Math.sin(ph + d); return [a, a - 1.5 * Math.max(0, Math.cos(ph + d))]; });
  const runArms = (amp = 0.95) => [0, Math.PI].map(d => { const a = amp * Math.sin(ph + d); return [a, a + 1.1]; });
  const armsUp = () => { sh = [[-8, -13], [8, -13]]; arms = [[-2.65, -2.8], [2.65, 2.8]]; };
  const g = r.air ? r.vAir : r.v;
  if (frozen) {
    // on the blocks: crouched, hands down on the line ("set": hips up while ▶ is held in the countdown)
    const set = G.players[k].input.right && phase === 'count';
    lean = set ? 0.62 : 0.42; hipY = set ? -12 : -8;
    legs = set ? [[-0.5, -0.9], [0.75, -0.55]] : [[-0.2, -1.45], [1.15, -0.4]];
    arms = [[0.4 - lean, 0.4 - lean], [0.3 - lean, 0.3 - lean]]; sh = [[5, -7], [7, -6]];
  } else if (r.air && r.airT > 0.04 && r.airT < K.air - 0.05) {
    // the hurdling split: lead leg straight out front, trail leg tucked, the arm across reaching for the lead foot
    const u = r.airT / K.air, e = Math.sin(Math.PI * Math.min(1, u * 1.15));
    lean = 0.22 + 0.32 * e;
    legs = [[-0.4 + 1.15 * e, -0.4 - 1.25 * e], [0.4 + 1.1 * e, 0.4 + 1.1 * e]];
    arms = [[0.5 + 1.2 * e, 0.7 + 1.0 * e], [-0.5 - 0.3 * e, -0.1]];
  } else if (r.stum > 0 && !ended) {
    // a stumble: arms windmilling, short scrabbling steps (never a fall)
    const w = G.clock * 22;
    lean = 0.32 + Math.sin(w * 0.5) * 0.12;
    legs = runLegs(0.6);
    armsUp(); arms = [[-2.3 + Math.cos(w) * 0.6, -2.5 + Math.cos(w) * 0.6], [2.3 + Math.sin(w) * 0.6, 2.6 + Math.sin(w) * 0.6]];
    if (!face) face = 'oh';
  } else if (ended && g < 40) {
    if (won) {   // arms up, a happy bounce
      lean = 0; hipY = -15 - Math.abs(Math.sin(G.clock * 7)) * 3;
      legs = [[-0.12, -0.12], [0.12, 0.12]]; armsUp(); face = 'grin';
    } else {      // hands on knees, puffing
      lean = 0.7; hipY = -14; legs = [[-0.15, -0.05], [0.25, 0.1]]; arms = [[0.1 - lean, 0.2 - lean], [0 - lean, 0.1 - lean]]; sh = [[6, -7], [7, -6]]; face = 'puff';
    }
  } else if (g < 5) {
    lean = 0.02; legs = [[-0.1, -0.1], [0.1, 0.1]]; arms = [[0.15, 0.4], [-0.15, 0.3]];
  } else {
    const amp = clamp(g / 300, 0.35, 1.05);
    lean = 0.12 + (r.burst > 0 ? 0.12 : 0) + 0.05 * amp;
    legs = runLegs(0.85 * amp); arms = runArms(0.95 * amp);
    if (ended && won && g < 200) armsUp();
  }
  const dipL = hurdlesLeanOf(r);
  if (dipL > 0) { lean += 0.8 * dipL; sh = [[-2, -8], [-1, -7]]; arms = [[-1.2 - lean * 0.5, -1.0 - lean * 0.5], [-1.5 - lean * 0.5, -1.3 - lean * 0.5]]; }
  if (r.land > 0 && !r.air) hipY += 2 * (r.land / 0.14);
  const gold = st.help && st.help[k] > 0;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // a two-part limb from (x0, y0): an outline in the dark colour, filled with the body colour (far limbs: all dark)
  const limb = (x0, y0, a1, a2, len1, len2, back, lw) => {
    const x1 = x0 + Math.sin(a1) * len1, y1 = y0 + Math.cos(a1) * len1, x2 = x1 + Math.sin(a2) * len2, y2 = y1 + Math.cos(a2) * len2;
    ctx.strokeStyle = dark; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (!back) { ctx.strokeStyle = col; ctx.lineWidth = lw - 2.2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    return { x: x2, y: y2, a: a2 };
  };
  // a running shoe (golden spikes: gold with a glint)
  const shoe = (f, back) => {
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(clamp(-f.a * 0.6, -1.2, 1.2));
    ctx.fillStyle = gold ? (back ? C.goldDark : C.gold) : back ? '#cfd3e2' : '#ffffff'; ctx.strokeStyle = dark; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(2.2, 0.6, 4.4, 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (gold) { ctx.fillStyle = '#fff6c8'; hurdlesStar(3.4, -0.4, 1.8, 0.7, G.clock * 4); ctx.fill(); }
    else { ctx.fillStyle = col; ctx.fillRect(0.5, -0.5, 3.2, 1.3); }
    ctx.restore();
  };
  // a stubby arm with a round fist
  const arm = (a, back) => {
    const o2 = sh[back ? 0 : 1], h = limb(o2[0], o2[1], a[0], a[1], A, A - 0.6, back, 3.8);
    ctx.fillStyle = back ? dark : col; ctx.strokeStyle = dark; ctx.lineWidth = 1.3; circle(h.x, h.y, 2.5); ctx.fill(); ctx.stroke();
  };
  const body = () => { ctx.translate(0, hipY); ctx.rotate(lean); };
  // behind the body: the far arm and the far leg
  ctx.save(); body(); arm(arms[0], true); ctx.restore();
  shoe(limb(-1, hipY, legs[0][0], legs[0][1], L, L, true, 4.4), true);
  // the body (Pip: sprout; Bo: ears), headband, race bib
  ctx.save(); body();
  const bw = 22, bh = 26, top = -bh + 3;
  if (k === 1) { ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2; for (const ex of [-bw / 2 + 4, bw / 2 - 4]) { circle(ex, top + 1, 5); ctx.fill(); ctx.stroke(); } }
  ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2.5; rr(-bw / 2, top, bw, bh, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(-bw / 2 + 3, top + 3, bw * 0.35, bh * 0.35, 5); ctx.fill();
  if (k === 0) {
    ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(-1, top - 6); ctx.stroke();
    ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(-6, top - 8 + Math.sin(G.clock * 10) * 0.6, 6, 3, 0.5 - (g > 200 ? 0.3 : 0), 0, Math.PI * 2); ctx.fill();
  }
  // headband (its tails flutter behind at speed)
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-bw / 2 + 1, top + 2, bw - 2, 3);
  ctx.fillStyle = C.gold; ctx.fillRect(-bw / 2 + 1, top + 3, bw - 2, 1);
  if (g > 120 && !frozen) {
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8;
    for (const d of [0, 1.3]) { ctx.beginPath(); ctx.moveTo(-bw / 2 + 1, top + 3.5); ctx.quadraticCurveTo(-bw / 2 - 5, top + 1 + d + Math.sin(G.clock * 20 + d) * 2, -bw / 2 - 9, top + 3 + d * 2 + Math.sin(G.clock * 20 + 1 + d) * 2); ctx.stroke(); }
  }
  // the bib, low on the tummy
  ctx.fillStyle = '#ffffff'; rr(-6, top + 16, 12, 8, 2); ctx.fill();
  ctx.strokeStyle = 'rgba(28,26,54,0.3)'; ctx.lineWidth = 0.8; rr(-6, top + 16, 12, 8, 2); ctx.stroke();
  text(String(k + 1), 0, top + 20.5, 7.5, C.ink, 'center', 'body');
  // the face, looking ahead
  const ey = top + 10;
  if (face === 'oh') {
    ctx.fillStyle = '#fff'; for (const ex of [-1, 7]) { ctx.beginPath(); ctx.ellipse(ex, ey, 3.4, 4.2, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = C.ink; for (const ex of [-1, 7]) { circle(ex + 0.6, ey, 1.5); ctx.fill(); }
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(4, ey + 6.5, 1.7, 2, 0, 0, Math.PI * 2); ctx.fill();
  } else if (face === 'grin' || face === 'puff') {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8;
    for (const ex of [-1, 7]) { ctx.beginPath(); ctx.arc(ex, ey + 1, 2.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    if (face === 'grin') { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(4, ey + 4.5, 3.4, 0, Math.PI); ctx.fill(); ctx.fillStyle = '#ff8fa3'; ctx.beginPath(); ctx.arc(4, ey + 5.9, 1.8, 0, Math.PI); ctx.fill(); }
    else { ctx.fillStyle = C.ink; circle(5, ey + 5.5, 1.6); ctx.fill(); }
  } else {
    const blink = (G.clock * 0.7 + k * 0.37) % 3 < 0.06;
    for (const ex of [-1, 7]) {
      if (blink) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ex - 2.5, ey); ctx.lineTo(ex + 2.5, ey); ctx.stroke(); continue; }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, 3.1, 3.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink; circle(ex + 1.2, ey + 0.5, 1.7); ctx.fill();
    }
    // determined little brows while racing
    if (!frozen || G.players[k].input.right) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3; for (const ex of [-1, 7]) { ctx.beginPath(); ctx.moveTo(ex - 2.6, ey - 5.2); ctx.lineTo(ex + 2.4, ey - 4); ctx.stroke(); } }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(4, ey + 4, 2.3, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(-4.5, ey + 4.5, 2); ctx.fill(); circle(10.3, ey + 4.5, 2); ctx.fill();
  // a medal once the match is decided (gold for the winner, silver for the other)
  if (phase === 'over' || (phase === 'end' && m.end && m.end.final && m.t > 0.4)) {
    const gm = m.end.matchWinner === k || m.end.matchWinner < 0;
    ctx.strokeStyle = gm ? '#ff6b4a' : '#5b95ff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-5, top + 5); ctx.lineTo(1, top + 14); ctx.lineTo(7, top + 5); ctx.stroke();
    ctx.fillStyle = gm ? C.gold : '#d9dde8'; ctx.strokeStyle = gm ? C.goldDark : '#8a90a6'; ctx.lineWidth = 1.2; circle(1, top + 16, 4.4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; hurdlesStar(1, top + 16, 2.5, 1, -Math.PI / 2); ctx.fill();
  }
  ctx.restore();
  // in front of the body: the near leg and the near arm
  shoe(limb(1, hipY, legs[1][0], legs[1][1], L, L, false, 4.6), false);
  ctx.save(); body(); arm(arms[1], false); ctx.restore();
  // a gold speed trail while bursting
  if (r.burst > 0 && !frozen && g > 200) {
    ctx.globalAlpha = o.alpha * Math.min(1, r.burst / 0.3) * 0.75;
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2.2;
    for (let j = 0; j < 3; j++) { const yy = hipY - 20 + j * 9; ctx.beginPath(); ctx.moveTo(-16 - j * 3, yy); ctx.lineTo(-34 - j * 5 - Math.sin(G.clock * 30 + j) * 4, yy); ctx.stroke(); }
  }
  ctx.restore();
}

/* ---------- HUD ---------- */
// each player's own keys (the same choice as actKey: a controller player sees its buttons)
function hurdlesKey(k, what) {
  const how = typeof actKey === 'function' ? actKey(k) : 'kb', pad = how === 'pad', touch = how === 'touch';
  if (what === 'run') return pad ? 'stick ▶' : touch ? '▶' : k === 0 ? 'D' : '→';
  if (what === 'jump') return pad ? glyph('a') : touch ? '▲' : k === 0 ? 'W' : '↑';
  return pad ? glyph('act') : touch ? 'dip button' : k === 0 ? 'F' : '/';
}
function hurdlesHud(st) {
  const K = HURDLES, m = G.match, big = hudBig(), tw = HURDLES_TWISTS[st.twist] || HURDLES_TWISTS.sprint;
  const fsz = big ? 18 : 13, ph = big ? 30 : 26;
  const live = m && m.phase === 'live';
  // the twist (top left, under the level pill)
  ctx.font = '700 ' + fsz + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  pill(14, 46, ctx.measureText(tw.name).width + 28, ph); text(tw.name, 28, 46 + ph / 2 + 0.5, fsz, C.gold, 'left', 'body');
  // the race stopwatch (top centre, under the match pill)
  const mb = G.matchHudBox, cy = mb ? mb.y1 + 4 : 48, ch = big ? 32 : 24, tm = st.end != null ? st.end : st.t;
  pill(W / 2, cy, big ? 96 : 72, ch, 'center');
  text(tm.toFixed(1) + ' s', W / 2, cy + ch / 2 + 0.5, big ? 21 : 15, C.paper, 'center');
  for (const k of [0, 1]) hurdlesLaneHud(st, k, big);
  hurdlesRaceMap(st, big);
  // the round card during "Round N" and 3-2-1: the twist and who has golden spikes
  if (m && (m.phase === 'ready' || m.phase === 'count')) {
    const lines = [[tw.hint, C.paper]];
    for (const k of [0, 1]) if (st.help[k] > 0) lines.push([(st.help[k] > 1 ? 'Golden spikes+ for ' : 'Golden spikes for ') + NAMES[k] + ': a bigger sweet spot!', C.gold]);
    const hs = big ? 17 : 14, ns = big ? 30 : 24, lh = big ? 24 : 20, h = (big ? 46 : 40) + lines.length * lh + 6;
    ctx.font = '700 ' + hs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    let w = Math.max(big ? 380 : 320, ...lines.map(l => ctx.measureText(l[0]).width + 44));
    w = Math.min(W - 20, w);
    const y = big ? 282 : 286;
    ctx.globalAlpha = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1;
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(W / 2 - w / 2, y, w, h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,197,61,0.6)'; ctx.lineWidth = 2; rr(W / 2 - w / 2, y, w, h, 16); ctx.stroke();
    text(tw.name, W / 2, y + (big ? 24 : 21), ns, C.gold, 'center');
    lines.forEach(([s, c], j) => text(s, W / 2, y + (big ? 50 : 44) + j * lh, hs, c, 'center', 'body'));
    ctx.globalAlpha = 1;
  }
  // PHOTO FINISH stamp during the round-end banner
  if (st.photo && m && m.phase === 'end') {
    const u = Math.min(1, m.t / 0.25), y = K.barY + 17;   // (over the race map, clear of the banner, both runners and the FINISH boards)
    ctx.save(); ctx.translate(W / 2, y); ctx.rotate(-0.05); ctx.scale(0.6 + 0.4 * u, 0.6 + 0.4 * u);
    ctx.fillStyle = '#fffaf0'; rr(-120, -20, 240, 40, 6); ctx.fill();
    ctx.strokeStyle = '#e8443a'; ctx.lineWidth = 3; rr(-116, -16, 232, 32, 4); ctx.stroke();
    text(st.photo.w < 0 ? 'DEAD HEAT' : 'PHOTO FINISH', 0, 1, big ? 24 : 22, '#e8443a', 'center');
    ctx.restore();
  }
  if (st.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${(reduceMotion ? 0.3 : 0.8) * st.flash * st.flash})`; ctx.fillRect(0, 0, W, H); }   // the camera flash
}
// per lane: a name tab (and golden spikes), the wind, where the other runner is, and hints for people
function hurdlesLaneHud(st, k, big) {
  const K = HURDLES, y0 = K.stripY[k], r = st.run[k], o = st.run[1 - k], m = G.match, fs = big ? 17 : 13, ph = big ? 28 : 22;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const nm = NAMES[k] + (hurdlesCpu(k) ? ' · CPU' : ''), lab = 'Lane ' + (k + 1);
  const nw = ctx.measureText(nm).width, lw = ctx.measureText(lab).width, tw = nw + lw + 34;
  ctx.fillStyle = 'rgba(28,26,54,0.78)'; rr(8, y0 + 6, tw, ph, ph / 2); ctx.fill();
  ctx.fillStyle = PCOL[k]; rr(8, y0 + 6, nw + 20, ph, ph / 2); ctx.fill();
  text(nm, 18, y0 + 6 + ph / 2 + 0.5, fs, '#ffffff', 'left', 'body');
  text(lab, 8 + nw + 26, y0 + 6 + ph / 2 + 0.5, fs, '#d9d3ef', 'left', 'body');
  let x = 8 + tw + 6;
  if (st.help[k] > 0) {
    const s = st.help[k] > 1 ? 'Golden spikes+' : 'Golden spikes', sw = ctx.measureText(s).width + 26;
    ctx.fillStyle = 'rgba(28,26,54,0.78)'; rr(x, y0 + 6, sw, ph, ph / 2); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x, y0 + 6, sw, ph, ph / 2); ctx.stroke();
    text(s, x + 13, y0 + 6 + ph / 2 + 0.5, fs, C.gold, 'left', 'body');
    x += sw + 6;
  }
  // the wind where you are (right)
  if (st.windy) {
    const w = hurdlesWind(st, r.x), tail = w >= 0, s = Math.abs(w) < 12 ? 'Calm' : tail ? 'Tailwind ▶▶' : 'Headwind ◀◀';
    const sw = ctx.measureText(s).width + 26;
    ctx.fillStyle = 'rgba(28,26,54,0.78)'; rr(W - 8 - sw, y0 + 6, sw, ph, ph / 2); ctx.fill();
    text(s, W - 8 - sw / 2, y0 + 6 + ph / 2 + 0.5, fs, Math.abs(w) < 12 ? C.paper : tail ? '#8fe3b0' : '#c9b6ff', 'center', 'body');
  }
  // the other runner off this lane's screen: a chip at the edge of the far lane
  const ox = o.x - st.cam[k];
  if ((ox < -10 || ox > W + 10) && m && m.phase !== 'intro') {
    const dm = Math.abs(o.x - r.x) / K.pxM, ahead = ox > 0, s = ahead ? NAMES[1 - k] + ' +' + dm.toFixed(0) + ' m ▶' : '◀ ' + NAMES[1 - k] + ' −' + dm.toFixed(0) + ' m';
    const sw = ctx.measureText(s).width + 22, cy = y0 + K.farY - 26;
    const cx = ahead ? W - 8 - sw : 8;
    ctx.fillStyle = 'rgba(28,26,54,0.72)'; rr(cx, cy, sw, ph, ph / 2); ctx.fill();
    text(s, cx + sw / 2, cy + ph / 2 + 0.5, fs, PCOL[1 - k], 'center', 'body');
  }
  // hints for a person (never for the computer): how to run, the first hurdles, the dip
  if (hurdlesBot(k) || !m || m.phase !== 'live') return;
  const sx = r.x - st.cam[k], hy = y0 + K.gY - r.y - 84;
  let hint = null;
  if (r.ranT < 0.3 && st.t > 1.0) hint = 'Hold ' + hurdlesKey(k, 'run') + ' to run!';
  else if (r.fin == null && st.obs[r.next] && !r.air && ((st.round === 1 && st.twist === 'sprint' && r.next < 2) || r.crashRun >= 2)) {
    const ob = st.obs[r.next], g = Math.max(hurdlesGsp(r.v, hurdlesWind(st, r.x)), 1), z = hurdlesWindow(st, ob, g, k), tt = (ob.x - r.x - z.c) / g;
    if (tt < 0.9 && tt > -0.2) hint = hurdlesKey(k, 'jump') + ': jump on the gold!';
  } else if (G.level.def.act && r.fin == null && r.dips === 0 && st.round <= 2) {
    const tt = (st.len - hurdlesChest(r)) / Math.max(1, hurdlesGsp(r.v, 0));
    if (tt < 1.3 && tt > 0) hint = hurdlesKey(k, 'dip') + ': dip at the line!';
  }
  if (!hint) return;
  const hs = big ? 19 : 14;
  ctx.font = '700 ' + hs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(hint).width + 22, h = big ? 32 : 26, bx = clamp(sx - w / 2 + 10, 6, W - w - 6), by = Math.max(y0 + 4, hy - h);
  ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = PDARK[k]; ctx.lineWidth = 2; rr(bx, by, w, h, 10); ctx.fill(); ctx.stroke();
  text(hint, bx + w / 2, by + h / 2 + 0.5, hs, C.ink, 'center', 'body');
}
// the race map at the bottom: start to finish, the hurdles, both runners
function hurdlesRaceMap(st, big) {
  const K = HURDLES, y0 = K.barY, h = 34, y = y0 + h / 2, fs = big ? 16 : 12;
  const p0 = 14, p1 = W - 14, x0 = big ? 196 : 162, x1 = W - (big ? 112 : 86);
  ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(p0, y0, p1 - p0, h, h / 2); ctx.fill();
  const X = wx => x0 + clamp(wx / st.len, 0, 1) * (x1 - x0);
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; rr(x0, y - 3, x1 - x0, 6, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x0 - 1, y - 7, 2, 14);
  for (const ob of st.obs) { ctx.fillStyle = ob.pit ? '#7fd6ff' : ob.kind === 'high' ? '#b9a4ff' : 'rgba(255,255,255,0.5)'; ctx.fillRect(X(ob.x) - 1, y - 5, 2, 10); }
  // the finish flag and the race length
  for (let j = 0; j < 3; j++) for (let c = 0; c < 3; c++) { ctx.fillStyle = (j + c) % 2 ? '#fff' : C.ink; ctx.fillRect(x1 + 4 + c * 4, y - 11 + j * 4, 4, 4); }
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x1 + 4, y - 11); ctx.lineTo(x1 + 4, y + 10); ctx.stroke();
  text(st.lenM + ' m', x1 + 22, y + 0.5, fs, '#d9d3ef', 'left', 'body');
  // the runners: Pip's face rides above the line, Bo's below; the leader's is bigger
  let lead = Math.abs(st.run[0].x - st.run[1].x) < 8 ? -1 : st.run[0].x > st.run[1].x ? 0 : 1;
  for (const k of [1, 0]) {
    const r = st.run[k], cx = X(Math.max(0, r.x)), cy = y + (k === 0 ? -5 : 5), rad = (big ? 9.5 : 7.5) * (lead === k ? 1.12 : 1);
    ctx.fillStyle = PCOL[k]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; circle(cx, cy, rad); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; circle(cx + rad * 0.12, cy - rad * 0.12, rad * 0.3); ctx.fill(); circle(cx + rad * 0.62, cy - rad * 0.12, rad * 0.3); ctx.fill();
    ctx.fillStyle = C.ink; circle(cx + rad * 0.24, cy - rad * 0.08, rad * 0.14); ctx.fill(); circle(cx + rad * 0.74, cy - rad * 0.08, rad * 0.14); ctx.fill();
  }
  // who leads, by how much (left)
  const d = Math.abs(st.run[0].x - st.run[1].x) / K.pxM;
  const m = G.match, done = m && m.end && (m.phase === 'end' || m.phase === 'over') ? m.end : null;
  const s = done ? (done.winner < 0 ? 'Dead heat!' : NAMES[done.winner] + ' wins!') : lead < 0 ? 'Neck and neck!' : NAMES[lead] + ' leads +' + (d < 10 ? d.toFixed(1) : Math.round(d)) + ' m';
  if (done) lead = done.winner;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const sw = ctx.measureText(s).width;
  text(s, Math.min(p0 + 16, x0 - 14 - sw), y + 0.5, fs, lead < 0 ? C.paper : PCOL[lead], 'left', 'body');
}

// Hurdle Dash sounds (prefix hurdles; pitch 1 Pip / 0.84 Bo for runner sounds)
Sfx.extra.hurdlesJump = function (p) { this.tone(400 * p, 0.08, 'triangle', 0.035, 640 * p); };
Sfx.extra.hurdlesBurst = function (p) { [660, 880, 1175, 1568].forEach((f, i) => this.tone(f * p, 0.08, 'triangle', 0.05, null, i * 0.035)); this.tone(300 * p, 0.25, 'sawtooth', 0.018, 900 * p); };
Sfx.extra.hurdlesClatter = function () { [0, 0.05, 0.11, 0.16].forEach((d, i) => this.tone(1000 - i * 190, 0.05, 'square', 0.03, 380, d)); this.tone(170, 0.14, 'triangle', 0.06, 90, 0.02); };
Sfx.extra.hurdlesSplash = function () { this.tone(1300, 0.25, 'sawtooth', 0.018, 220); this.tone(260, 0.32, 'sine', 0.07, 70); };
Sfx.extra.hurdlesDip = function (p) { this.tone(560 * p, 0.09, 'sine', 0.04, 330 * p); };
Sfx.extra.hurdlesTape = function () { this.tone(1500, 0.05, 'square', 0.025, 700); this.tone(720, 0.12, 'triangle', 0.04, 360, 0.03); };
Sfx.extra.hurdlesPhoto = function () { this.tone(2600, 0.03, 'square', 0.03); this.tone(1300, 0.09, 'triangle', 0.035, 2100, 0.06); };
Sfx.extra.hurdlesGun = function () { this.tone(150, 0.16, 'sawtooth', 0.05, 60); this.tone(900, 0.05, 'square', 0.025, 300); };
Sfx.extra.hurdlesCheer = function () { for (let i = 0; i < 7; i++) this.tone(520 + (i % 3) * 140 + i * 18, 0.18, 'triangle', 0.014, 760 + i * 30, 0.05 + i * 0.06); };   // the crowd at the line
