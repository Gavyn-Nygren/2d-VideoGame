/* Pip & Bo - Level 11-4 Javelin Throw (versus, World 11 Summer Games). */
'use strict';

/* ===== 11-4 Javelin Throw (mode 'javelin', versus, best of 5) =====
   A side view of a stadium field. Pip runs on the far runway, Bo on the near one, both at the same time, and both
   javelins land on the same measured field, so the marks sit side by side.
   Each round is 3 throws each (the "Last throw" round and sudden death: 1). Every throw:
     run      hold ▶ to run (◀ brakes). A power meter rises and falls from "go" (starting at a random point of its swing
              every throw, so pressing at the same spot on the runway is no trick); its swing is as tall as your speed
              lets it be, so full speed + pressing throw at the top = full power ("Perfect!"). A press before you run
              doesn't count ("Run first!").
     aim      the press locks the power; keep holding throw and the angle needle rises (12° up to 75°); let go to throw.
              You keep sliding forward while you aim, so press early enough.
     foul     the front foot over the line while you still hold the javelin = whistle, red flag, no mark (the line glows
              red as you get close; ◀ while aiming digs in). A javelin that comes down behind the line is "Too short!".
     flight   a real arc with gravity, a little drag and the wind's push (+ = tailwind). The flags, windsock, clouds and
              the torch flame all show the wind honestly. Slow motion for the first moment after a release (per javelin,
              so it never slows the other runner), then it sticks with a thunk and the distance pops up.
   The longer best mark wins the round. Round 1 is a calm day; rounds 2-4 are a shuffle of Big Tailwind, Swirling Gusts
   and Target Ring (land in the gold ring for +4 m); round 5 and sudden death are "Last throw" (one throw each).
   Catch-up (gold, announced on the round card and at "go"): 1 round behind = a gold steady meter (it swings slower and
   its gold top counts as full), 2+ behind = also a gold angle mark on the dial (the best angle for the wind right now).
   The players' platformer bodies are hidden (def.ownStep); the mode draws the athletes. Everything is prefixed
   jav / JAV, sounds are Sfx.extra.javelin*. Rule randomness only from MODES.javelin.rand (winds, twists, ring spot, meter start). */
const JAV = {
  x0: -26,                                 // where each run-up starts (m; the foul line is x = 0, toward the field is +)
  runAcc: 7.5, runMax: 9, coast: 3.5, brake: 14, aimDecel: 6, followDecel: 16,   // (an athlete's x is its front toe: a foul is x > 0)
  period: 1.1, steadyPeriod: 1.45, steadyTop: 0.93, speedBase: 0.45, perfect: 0.95,
  ang0: 12, angRate: 46, angMax: 75,
  vMin: 12, vMax: 30, g: 9.8, drag: 0.02, kw: 0.22, h0: 2.0, hand: -0.5,
  shot: 10, setT: 1.0, showT: 1.5, foulT: 1.1, noneT: 0.9,
  attempts: 3, ringR: 4, ringBonus: 4,
  ringBack: 3,                             // a stuck javelin's shaft (and its shadow) lies about 3 m behind its tip: it counts in
                                           // the ring when any of that is in it, so a throw that looks in the ring always scores
  ringNear: 4,                             // a miss by less than this (m) says "Just missed the ring!"
  slowT: 0.45, slowK: 0.22,
  idlePause: 40,                           // nobody pressed anything for 40 s of live play: pause (family touch, like 8-4)
};
const JAV_GY = [359, 464];                 // ground line (screen y) of Pip's far lane and Bo's near lane (the far lane sits
                                           // low enough that Pip's meter and dial stay on the grass, under the banner)
// the athletes are drawn this much bigger than the platformer bodies (more on phones, like the HUD); looks only
const javS = () => (hudBig() ? 1.7 : 1.35);
const JAV_JL = 58;                         // a javelin's drawn length (px)
const JAV_RUN = [-31, 40];                 // camera framing while both run (world m at the screen's left and right edges)
const JAV_FIELD = [-30, 106];              // camera framing once a javelin flies (widens for a very long throw)
const JAV_TWISTS = {
  calm: { name: 'Calm Day', hint: 'Run fast, press at the top, aim, let go!' },
  tail: { name: 'Big Tailwind', hint: 'The wind is with you: aim a bit higher!' },
  gusts: { name: 'Swirling Gusts', hint: 'Watch the flags: throw when the wind helps!' },
  ring: { name: 'Target Ring', hint: 'Land in the gold ring for +4 m!' },
  last: { name: 'Last Throw', hint: 'One throw each. Make it count!' },
};
// looks-only randomness (crowd, sparkles): never MODES.javelin.rand
let javVS = 9137;
const javVR = () => { javVS = (Math.imul(javVS, 1664525) + 1013904223) >>> 0; return javVS / 4294967296; };
const javCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const javSX = xm => (xm - G.mst.cam.x0) * G.mst.cam.s;
const javSY = (k, hm) => JAV_GY[k] - hm * G.mst.cam.s;

/* ---------- rules ---------- */
// one javelin's flight step (shared with the computer's planning, so its guesses use the game's own numbers)
function javFlyStep(j, wind, dt) {
  j.vx += (-JAV.drag * j.vx + JAV.kw * wind) * dt;
  j.vh += (-JAV.g - JAV.drag * j.vh) * dt;
  j.x += j.vx * dt; j.h += j.vh * dt;
}
// where a throw lands (m from the line) in a steady wind
function javFly(x, v, angDeg, wind) {
  const a = angDeg * Math.PI / 180, j = { x, h: JAV.h0, vx: v * Math.cos(a), vh: v * Math.sin(a) };
  for (let i = 0; i < 2000; i++) {
    const px = j.x, ph = j.h;
    javFlyStep(j, wind, 1 / 60);
    if (j.h <= 0) return px + (j.x - px) * ph / (ph - j.h);
  }
  return j.x;
}
// the best angle for this launch speed and wind (whole degrees)
function javBestAngle(v, wind) {
  let best = -1e9, ba = 40;
  for (let a = 20; a <= 65; a++) { const d = javFly(0, v, a, wind); if (d > best) { best = d; ba = a; } }
  return ba;
}
const javSpeedF = v => JAV.speedBase + (1 - JAV.speedBase) * clamp(v / JAV.runMax, 0, 1);
const javPeriod = k => (G.mst.gold && G.mst.gold[k] >= 1 ? JAV.steadyPeriod : JAV.period);
// the power meter (0..1, before the speed cap): a triangle wave that swings from "go", starting at a random point of
// its swing every throw (so pressing at the same spot on the runway every time doesn't always hit the top)
function javMeter(a) { const f = (a.meterT / javPeriod(a.k)) % 1; return 1 - Math.abs(f * 2 - 1); }
function javMeterEff(a) { const m = javMeter(a); return G.mst.gold[a.k] >= 1 && m >= JAV.steadyTop ? 1 : m; }
function javWindTarget(st) {
  const R = MODES.javelin.rand, tw = st.twist;
  if (tw === 'tail') return 4.5 + R() * 1.5;
  if (tw === 'gusts') return -4 + R() * 9;
  if (tw === 'ring') return -2 + R() * 4;
  if (tw === 'last') return -2.5 + R() * 5.5;
  return -1.5 + R() * 3.5;
}
function javMakeAth(k) {
  return { k, phase: 'ready', x: JAV.x0, v: 0, meterT: 0, running: false, clock: 0, ang: JAV.ang0, power: 0, meterAt: 0, speedAt: 0,
    pt: 0, stride: 0, done: false, jav: null, guide: null, stepT: 0, lastTick: 99, whoa: 0, cheer: 0 };
}
// a pop-up word at world x (m) in lane k, dy px over the ground (ox: px to the right, for words beside an athlete)
function javPop(xm, k, dy, text, col, size, life, ox) { G.mst.pops.push({ xm, k, dy, text, col, size: size || 18, t: 0, life: life || 1.2, ox: ox || 0 }); }
function javStartAttempt(st, first) {
  st.aphase = first ? 'go' : 'set'; st.at = 0; st.attId++;
  st.ath = [0, 1].map(javMakeAth);
  for (const a of st.ath) a.meterT = MODES.javelin.rand() * javPeriod(a.k);
  if (!first && st.twist !== 'gusts') st.wind = clamp(st.windBase + (MODES.javelin.rand() - 0.5) * 1.2, -6, 7);
  st.judge = { flag: null, t: 0 };
  if (!first) Sfx.play('javelinSet');
}
function javFoul(st, a, why) {
  a.phase = 'foul'; a.pt = 0; a.whoa = 1;
  st.marks[a.k][st.att] = { foul: true, why };
  st.stat.fouls[a.k]++;
  st.judge = { flag: 'red', t: 0 };
  javPop(a.x, a.k, 70, why, '#ff5a5a', 22, 1.3);
  // the first couple of fouls a match also say how to avoid them (never over the computer)
  if (!javCpu(a.k) && (st.foulHint[a.k] || 0) < 2) { st.foulHint[a.k] = (st.foulHint[a.k] || 0) + 1; javPop(a.x, a.k, 44, 'Let go before the line!', '#ffffff', 15, 1.8, 40); }
  Sfx.play('javelinWhistle', a.k);
  rumble(a.k, 0.25, 0.4, 160);
}
function javRelease(st, a) {
  const ang = a.ang, v = JAV.vMin + (JAV.vMax - JAV.vMin) * a.power, r = ang * Math.PI / 180;
  const j = { k: a.k, x: a.x + JAV.hand, h: JAV.h0, vx: v * Math.cos(r), vh: v * Math.sin(r), t: 0, slow: JAV.slowT, stuck: false,
    ang: -r, wob: 0, stickT: 0, trail: [], dist: 0, bonus: 0, att: st.att, v, angDeg: ang, hx: 0, hy: 0 };
  // the javelin leaves the athlete's hand (drawn in px), then eases onto its true path
  const hp = javHandPx(a, 'aim');
  j.hx = hp.x - javSX(j.x); j.hy = hp.y - javSY(a.k, j.h);
  st.jv.push(j); a.jav = j;
  a.phase = 'thrown'; a.pt = 0;
  st.stat.throws[a.k]++;
  st.flash.push({ k: a.k, xm: j.x, t: 0 });
  Sfx.play('javelinWhoosh', a.k);
  rumble(a.k, 0.15, 0.45, 110);
  // a quick tap throws it flat: when it lands, say how to aim higher (a couple of times a match, never for the computer)
  j.flat = ang < 22 && !javCpu(a.k);
}
function javStick(st, j, xl) {
  j.stuck = true; j.x = xl; j.h = 0; j.stickT = 0; j.wob = 1;
  const imp = Math.atan2(-j.vh, j.vx);   // (screen angle: down is +)
  j.ang = clamp(imp, 0.35, 1.25);
  const a = st.ath[j.k];
  if (j.flat && (st.flatHint[j.k] || 0) < 2) { st.flatHint[j.k]++; javPop(a.x, j.k, 70, 'Hold throw longer to aim higher!', C.gold, 16, 2.2, 130); }
  if (xl < 0.5) { // it came down behind the line (a feeble lob into a headwind): no mark
    j.dist = 0; j.short = true;
    st.marks[j.k][j.att] = { foul: true, why: 'Too short' };
    javPop(Math.max(xl, JAV.x0 + 4), j.k, 40, 'Too short!', '#ffffff', 20, 1.3);
    st.dust.push({ xm: xl, k: j.k, t: 0 });
    Sfx.play('javelinThunk', j.k);
    if (a && a.jav === j) a.done = true;
    return;
  }
  let d = Math.max(0, Math.round(xl * 10) / 10);
  // the ring: the tip or the shaft lying behind it on the ground is in the gold ring (what the player sees)
  let ringMiss = 0;
  if (st.twist === 'ring') {
    const lo = st.ringX - JAV.ringR, hi = st.ringX + JAV.ringR + JAV.ringBack;
    if (xl >= lo && xl <= hi) { j.bonus = JAV.ringBonus; st.stat.rings[j.k]++; st.ringFx.push({ k: j.k, t: 0 }); }
    else ringMiss = xl < lo ? lo - xl : xl - hi;
  }
  j.dist = Math.round((d + j.bonus) * 10) / 10;
  st.marks[j.k][j.att] = { d: j.dist, bonus: j.bonus };
  const prevBest = st.best[j.k];
  if (prevBest == null || j.dist > prevBest) st.best[j.k] = j.dist;
  if (j.dist > st.stat.longest[j.k]) st.stat.longest[j.k] = j.dist;
  st.stat.total[j.k] += j.dist; st.stat.marksN[j.k]++; st.matchDist[j.k] += j.dist;
  javPop(xl, j.k, 34, j.dist.toFixed(1) + ' m', PCOL[j.k], 24, 1.6);
  if (j.bonus) javPop(xl, j.k, 64, 'Ring bonus +' + j.bonus + ' m!', C.gold, 17, 1.6);
  else if (ringMiss && ringMiss < JAV.ringNear) javPop(xl, j.k, 64, 'Just missed the ring!', '#ffffff', 15, 1.4);
  else if (prevBest != null && j.dist > prevBest) javPop(xl, j.k, 64, 'New best!', '#ffffff', 15, 1.3);
  st.dust.push({ xm: xl, k: j.k, t: 0 });
  if (st.judge.flag !== 'red') st.judge = { flag: 'white', t: 0 };
  Sfx.play('javelinThunk', j.k);
  if (j.bonus) Sfx.play('javelinRing', j.k);
  if (j.dist >= 80) { st.cheer = 1; Sfx.play('javelinCheer'); }
  G.shake = Math.max(G.shake, 0.06);
  rumble(j.k, 0.3, 0.3, 120);
  if (a && a.jav === j) { a.done = true; a.cheer = j.dist >= (prevBest || 0) ? 1 : 0; }
}
function javAthStep(st, a, p, dt) {
  const fresh = !!(p.pendingAct || p.pendingJump), held = !!(p.input.act || p.input.jump);
  p.pendingAct = false; p.pendingJump = false;
  a.clock += dt;
  const inp = p.input;
  if (a.phase === 'ready' || a.phase === 'run') {
    if (inp.right && !inp.left) { a.v = Math.min(JAV.runMax, a.v + JAV.runAcc * dt); if (!a.running) { a.running = true; a.phase = 'run'; } }
    else if (inp.left) a.v = Math.max(0, a.v - JAV.brake * dt);
    else a.v = Math.max(0, a.v - JAV.coast * dt);
    a.x += a.v * dt;
    a.meterT += dt;
    if (fresh && !a.running) {
      // a press before the run-up would only be a feeble lob: it doesn't count (the hint says why)
      if (a.clock - (a.runHint || -9) > 1.2) { a.runHint = a.clock; javPop(a.x, a.k, 70, 'Run first!', '#ffffff', 18, 1.0, 74); }
    } else if (fresh) {
      const m = javMeterEff(a), sf = javSpeedF(a.v);
      a.meterAt = m; a.speedAt = a.v; a.power = clamp(m * sf, 0, 1);
      a.phase = 'aim'; a.ang = JAV.ang0; a.pt = 0;
      Sfx.play('javelinAim', a.k);
      if (a.power >= JAV.perfect) { st.stat.perfect[a.k]++; javPop(a.x, a.k, 64, 'Perfect!', C.gold, 20, 1.0, 40); Sfx.play('javelinPerfect', a.k); }   // (the word over the angle dial)
      if (st.gold[a.k] >= 2) a.guide = javBestAngle(JAV.vMin + (JAV.vMax - JAV.vMin) * a.power, st.wind);
    } else if (a.x > 0) javFoul(st, a, 'Foul!');
    else if (a.clock >= JAV.shot) {
      a.phase = 'none'; a.pt = 0; st.marks[a.k][st.att] = { foul: true, why: 'No throw' };
      javPop(a.x, a.k, 70, 'Time!', '#ffffff', 20, 1.1); Sfx.play('javelinWhistle', a.k);
    }
    if (a.running && a.v > 1) { a.stepT -= dt * a.v; if (a.stepT <= 0) { a.stepT = 1.6; Sfx.play('javelinStep', a.k); } }
    a.stride += a.v * dt * 2.2;
  } else if (a.phase === 'aim') {
    a.pt += dt;
    a.v = Math.max(0, a.v - JAV.aimDecel * dt - (inp.left ? JAV.brake * dt : 0));
    a.x += a.v * dt; a.stride += a.v * dt * 1.4;
    if (held) a.ang = Math.min(JAV.angMax, a.ang + JAV.angRate * dt);
    if (a.x > 0) javFoul(st, a, 'Foul!');
    else if (!held || a.clock >= JAV.shot) javRelease(st, a);
  } else if (a.phase === 'thrown') {
    a.pt += dt;
    a.v = Math.max(0, a.v - JAV.followDecel * dt); a.x = Math.min(a.x + a.v * dt, 0); a.stride += a.v * dt * 1.4;
  } else if (a.phase === 'foul') {
    a.pt += dt; a.v = Math.max(0, a.v - JAV.followDecel * dt); a.x += a.v * dt;
    if (a.pt >= JAV.foulT) a.done = true;
  } else if (a.phase === 'none') {
    a.pt += dt; if (a.pt >= JAV.noneT) a.done = true;
  }
  // the shot clock's last seconds tick
  if ((a.phase === 'ready' || a.phase === 'run' || a.phase === 'aim') && !javCpu(a.k)) {
    const left = Math.ceil(JAV.shot - a.clock);
    if (left !== a.lastTick) { a.lastTick = left; if (left <= 3 && left > 0) Sfx.play('javelinTick', a.k); }
  }
}
function javJavStep(st, dt) {
  for (const j of st.jv) {
    if (j.stuck) { j.stickT += dt; j.wob = Math.max(0, j.wob - dt * 1.4); continue; }
    let f = 1;
    if (j.slow > 0) { const q = j.slow / JAV.slowT; f = JAV.slowK + (1 - JAV.slowK) * (1 - q) * (1 - q); j.slow = Math.max(0, j.slow - dt); }
    const d = dt * f, px = j.x, ph = j.h;
    j.t += d;
    javFlyStep(j, st.wind, d);
    if (!j.stuck) j.ang = Math.atan2(-j.vh, j.vx);
    if ((G.tickN & 3) === 0) { j.trail.push({ x: j.x, h: j.h }); if (j.trail.length > 14) j.trail.shift(); }
    if (j.h <= 0) javStick(st, j, px + (j.x - px) * ph / (ph - j.h));
  }
}
function javWindStep(st, dt) {
  if (st.twist === 'gusts') {
    st.gustT -= dt;
    if (st.gustT <= 0) { st.gustT = 1.6 + MODES.javelin.rand() * 1.0; st.windGoal = javWindTarget(st); }
    st.wind = approach(st.wind, st.windGoal, 2.5 * dt);
  }
}
function javEndRound(st) {
  const b = st.best, s0 = b[0] == null ? -1 : b[0], s1 = b[1] == null ? -1 : b[1];
  st.over = true;
  if (s0 < 0 && s1 < 0) { matchRoundEnd(-1, 'No marks at all!'); return; }
  if (s0 === s1) { matchRoundEnd(-1, 'Dead heat: ' + s0.toFixed(1) + ' m each!'); return; }
  const w = s0 > s1 ? 0 : 1, lose = w ? s0 : s1;
  st.winMark = w;
  matchRoundEnd(w, lose < 0 ? 'The only mark: ' + b[w].toFixed(1) + ' m!' : 'Longest throw: ' + b[w].toFixed(1) + ' m!');
  for (let i = 0; i < 18; i++) confetti(clamp(javSX(b[w]), 30, W - 30), JAV_GY[w] - 30);
}
function javVis(st, dt) {
  st.vt += dt;
  // camera: the run-up close-up, or the whole field once a javelin flies (and while marks show)
  const flying = st.aphase === 'show' || st.over || st.jv.some(j => j.att === st.att);
  let far = 0; for (const j of st.jv) far = Math.max(far, j.x);
  const tx0 = flying ? JAV_FIELD[0] : JAV_RUN[0], tx1 = flying ? Math.max(JAV_FIELD[1], far + 10) : JAV_RUN[1];
  const ts = W / (tx1 - tx0), c = st.cam, k = 1 - Math.exp(-dt * 3.2);
  c.s += (ts - c.s) * k; c.x0 += (tx0 - c.x0) * k;
  st.windShow += (st.wind - st.windShow) * (1 - Math.exp(-dt * 4));
  st.cheer = Math.max(0, st.cheer - dt * 0.45);
  st.judge.t += dt;
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < q.life);
  for (const d of st.dust) d.t += dt;
  st.dust = st.dust.filter(d => d.t < 0.8);
  for (const f of st.flash) f.t += dt;
  st.flash = st.flash.filter(f => f.t < 0.5);
  for (const r of st.ringFx) r.t += dt;
  st.ringFx = st.ringFx.filter(r => r.t < 1.2);
  for (const c2 of st.clouds) { c2.x += st.windShow * 8 * dt; if (c2.x > W + 120) c2.x = -140; if (c2.x < -140) c2.x = W + 120; }
  for (const a of st.ath) { a.whoa = Math.max(0, a.whoa - dt * 0.8); a.cheer = Math.max(0, a.cheer - dt * 0.6); }
}

MODES.javelin = {
  rand: Math.random,
  setup(st, L) {
    for (const row of L.grid) row.fill('.');
    st.stat = { longest: [0, 0], fouls: [0, 0], perfect: [0, 0], throws: [0, 0], rings: [0, 0], total: [0, 0], marksN: [0, 0] };
    st.matchDist = [0, 0]; st.flatHint = [0, 0]; st.foulHint = [0, 0];
    const mix = ['tail', 'gusts', 'ring'];
    for (let i = mix.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [mix[i], mix[j]] = [mix[j], mix[i]]; }
    st.order = ['calm', ...mix, 'last'];
    st.cam = { x0: JAV_RUN[0], s: W / (JAV_RUN[1] - JAV_RUN[0]) };
    st.vt = 0; st.idleT = 0;
    st.clouds = [0, 1, 2, 3].map(i => ({ x: 60 + i * 250 + javVR() * 80, y: 46 + (i % 2) * 34 + javVR() * 14, s: 0.7 + javVR() * 0.5 }));
    st.crowd = [];
    // (nobody sits on the stairs or in front of the scoreboard)
    for (let row = 0; row < 4; row++) for (let x = 14 + row * 7; x < W; x += 17 + (row % 2) * 2) {
      if ([190, 470, 750].some(sx => x > sx - 6 && x < sx + 24) || (row <= 2 && x > 576 && x < 760)) continue;
      st.crowd.push({ x, row, c: (javVR() * 6) | 0, ph: javVR() * 6.28, sk: (javVR() * 4) | 0 });
    }
    st.ath = [0, 1].map(javMakeAth); st.jv = []; st.pops = []; st.dust = []; st.flash = []; st.ringFx = [];
    st.wind = 0; st.windShow = 0; st.judge = { flag: null, t: 0 }; st.gold = [0, 0]; st.best = [null, null]; st.marks = [[], []];
  },
  resetRound(n, info) {
    const st = G.mst;
    st.twist = info.suddenDeath ? 'last' : st.order[Math.min(n, st.order.length) - 1];
    st.attN = st.twist === 'last' ? 1 : JAV.attempts;
    st.att = 0; st.attId = 0; st.over = false; st.winMark = -1;
    st.marks = [[], []]; st.best = [null, null]; st.jv = []; st.pops = []; st.dust = []; st.flash = []; st.ringFx = [];
    st.windBase = javWindTarget(st); st.wind = st.windBase; st.windGoal = st.wind; st.gustT = 1.2; st.windShow = st.wind;
    st.ringX = st.twist === 'ring' ? 74 + Math.round(MODES.javelin.rand() * 10) : 0;
    st.gold = [0, 1].map(k => (info.suddenDeath ? 0 : Math.max(0, info.wins[1 - k] - info.wins[k])));
    st.cheer = 0;
    javStartAttempt(st, true);
    st.cam = { x0: JAV_RUN[0], s: W / (JAV_RUN[1] - JAV_RUN[0]) };
    // the athletes are the players: hide the platformer bodies every round (matchResetPlayers revives them)
    for (const p of G.players) Object.assign(p, { alive: false, respawnT: Infinity });
  },
  go() {
    const st = G.mst;
    if (st.gold[0] || st.gold[1]) {
      for (const k of [0, 1]) if (st.gold[k]) { javPop(JAV.x0, k, 40, st.gold[k] >= 2 ? 'Gold meter + angle mark!' : 'Gold steady meter!', C.gold, 17, 2.2, 150); Sfx.play('javelinGold', k); }
    }
  },
  step(dt) {
    const st = G.mst;
    javWindStep(st, dt);
    if (st.aphase === 'set') {
      st.at += dt;
      for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
      if (st.at >= JAV.setT) { st.aphase = 'go'; st.at = 0; Sfx.play('javelinGo'); }
    } else if (st.aphase === 'go') {
      for (const a of st.ath) javAthStep(st, a, G.players[a.k], dt);
      if (st.ath.every(a => a.done)) { st.aphase = 'show'; st.at = 0; }
    } else if (st.aphase === 'show') {
      for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
      st.at += dt;
      if (st.at >= JAV.showT) {
        if (st.att + 1 < st.attN) { st.att++; javStartAttempt(st, false); }
        else { javEndRound(st); }
      }
    }
    javJavStep(st, dt);
    javVis(st, dt);
    // nobody has pressed anything for a long time: pause the game
    if (G.players.some(p => { const i = p.input; return i.left || i.right || i.jump || i.down || i.up || i.act; })) st.idleT = 0;
    else { st.idleT += dt; if (st.idleT >= JAV.idlePause && G.mode === 'play') { st.idleT = 0; pause(); } }
  },
  idle(dt) {
    const st = G.mst; if (!st.cam) return;
    javJavStep(st, dt);
    javVis(st, dt);
  },
  tiebreak() {
    // a second tied round in a row: the longer second-best mark of this round, then the most metres this match
    const st = G.mst, sec = k => { const d = st.marks[k].filter(m => m && !m.foul).map(m => m.d).sort((a, b) => b - a); return d.length > 1 ? d[1] : -1; };
    const a = sec(0), b = sec(1);
    if (a !== b) return { winner: a > b ? 0 : 1, reason: 'Longer second-best throw!' };
    const m = st.matchDist; if (Math.abs(m[0] - m[1]) < 0.05) return -1;
    return { winner: m[0] > m[1] ? 0 : 1, reason: 'More metres this match!' };
  },
  draw() { javDrawWorld(); },
  drawTop() { javDrawTop(); },
  hud() { javHud(); },
  stats() {
    // (the unit goes in the value, as the tile labels are upper-cased and "(m)" would read "(M)"; a no-break space keeps
    // it with its number when the two values wrap onto two lines in a narrow tile)
    const s = G.mst.stat, mt = v => v.toFixed(1) + '\u00a0m', avg = k => (s.marksN[k] ? mt(s.total[k] / s.marksN[k]) : '–');
    const out = [
      { label: 'Longest throw', values: s.longest.map(v => (v ? mt(v) : '–')) },
      { label: 'Average throw', values: [avg(0), avg(1)] },
      { label: 'Perfect meters', values: s.perfect.slice() },
      s.rings[0] + s.rings[1] ? { label: 'Ring hits', values: s.rings.slice() } : { label: 'Fouls', values: s.fouls.slice() },
    ];
    const L = s.longest, w = L[0] === L[1] ? -1 : L[0] > L[1] ? 0 : 1;
    if (w >= 0 && L[w] > 0) out.push('Longest of the match: ' + NAMES[w] + ', ' + L[w].toFixed(1) + ' m!');
    return out;
  },
  // test access for bots and the computer player (read-only helpers)
  test: { JAV, JAV_GY, fly: javFly, bestAngle: javBestAngle, meter: a => javMeter(a), meterEff: a => javMeterEff(a), speedF: javSpeedF, period: javPeriod,
    sx: xm => javSX(xm), sy: (k, h) => javSY(k, h), toePx: k => javToePx(k) },
};

/* ---------- drawing ---------- */
const JAV_COL = { track: '#d0603f', trackDk: '#a9472d', trackHi: '#e27a57', grassA: '#86d468', grassB: '#78c75c', grassDk: '#4f9a45', line: 'rgba(255,255,255,0.85)',
  seat: ['#2fb3a6', '#ff9a52', '#ffd34d', '#8a7cf0'], stand: '#5c6ea8', standDk: '#3f4f86', roof: '#e9eef8', roofDk: '#b7c0d6',
  crowd: ['#ffd166', '#ff8fc7', '#b28dff', '#8fe3b0', '#ffffff', '#7fd4ff'], skin: ['#f6d2b0', '#e0a97c', '#b97a53', '#8a5636'],
  flags: [['#ff6f91', '#ffe066'], ['#3ec7a8', '#ffffff'], ['#8a7cf0', '#ffd34d'], ['#ff9a52', '#2fb3a6']] };
const javCache = { s: 0, stands: null, lab: '' };
// the stands (everything about them that never moves) drawn once per screen size
function javStandsLayer() {
  const s = Math.max(0.1, canvas.width / W), st = G.mst, m = G.match;
  // the scoreboard names the round ("FINAL" only for the last throw round and sudden death)
  const lab = 'JAVELIN  ·  ' + (st.twist === 'last' ? 'FINAL' : 'ROUND ' + (m ? m.round : 1));
  if (javCache.s !== s || !javCache.stands || javCache.lab !== lab) {
    javCache.s = s; javCache.lab = lab;
    const y0 = 118, h = 300 - y0, c = document.createElement('canvas');
    c.width = Math.ceil(W * s); c.height = Math.ceil(h * s);
    const g = c.getContext('2d'); g.setTransform(c.width / W, 0, 0, c.height / h, 0, -y0 * c.height / h);
    // back wall and tiers
    g.fillStyle = JAV_COL.standDk; g.fillRect(0, 128, W, 172);
    for (let row = 0; row < 4; row++) {
      const ty = 146 + row * 30;
      g.fillStyle = row % 2 ? '#5468a2' : '#4b5e98'; g.fillRect(0, ty, W, 30);
      // seat backs, in blocks of made-up colours
      for (let x = 0; x < W; x += 15) { g.fillStyle = JAV_COL.seat[((x / 120) | 0) % 4]; g.globalAlpha = 0.55; g.fillRect(x + 2, ty + 18, 11, 8); }
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, ty + 27, W, 3);
    }
    // stairs
    for (const sx of [190, 470, 750]) { g.fillStyle = '#6b7db6'; g.fillRect(sx, 146, 18, 122); g.fillStyle = 'rgba(255,255,255,0.2)'; for (let y = 150; y < 268; y += 8) g.fillRect(sx, y, 18, 2); }
    // roof canopy
    g.fillStyle = JAV_COL.roofDk; g.fillRect(0, 128, W, 12);
    g.fillStyle = JAV_COL.roof; g.fillRect(0, 124, W, 8);
    for (let x = 30; x < W; x += 120) { g.fillStyle = '#c9d1e4'; g.fillRect(x, 140, 4, 8); }
    // the front wall: a long banner with made-up colours
    g.fillStyle = '#2e3b6b'; g.fillRect(0, 268, W, 32);
    const bands = ['#ff6f91', '#ffd34d', '#3ec7a8', '#8a7cf0', '#ff9a52'];
    for (let i = 0; i < 10; i++) {
      g.fillStyle = bands[i % 5]; g.fillRect(i * 96 + 4, 272, 88, 22);
      g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(i * 96 + 4, 272, 88, 2); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(i * 96 + 4, 292, 88, 2);
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 10; i++) {   // each word shrinks to fit its panel, with air either side
      const word = i % 2 ? 'JAVELIN' : 'SUMMER GAMES';
      let fs = 15; g.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
      while (fs > 9 && g.measureText(word).width > 76) { fs -= 0.5; g.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif'; }
      g.fillStyle = i % 5 === 1 ? '#5a3a00' : '#ffffff'; g.fillText(word, i * 96 + 48, 283.5);
    }
    // the scoreboard
    g.fillStyle = '#1c1a36'; javRR(g, 584, 150, 168, 58, 8); g.fill();
    g.strokeStyle = '#ffd34d'; g.lineWidth = 3; javRR(g, 584, 150, 168, 58, 8); g.stroke();
    g.fillStyle = '#ffd34d'; g.font = '17px "Lilita One", "Arial Rounded MT Bold", sans-serif'; g.fillText('SUMMER GAMES', 668, 166);
    g.fillStyle = '#f6efdf'; g.font = '700 12px "Atkinson Hyperlegible", system-ui, sans-serif'; g.fillText(lab, 668, 186);
    for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#ff6f91' : '#3ec7a8'; g.fillRect(596 + i * 17, 198, 9, 3); }
    g.fillStyle = '#3b4672'; g.fillRect(660, 208, 16, 20);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(660, 208, 4, 20);
    // the stand's shadow falling on the tiers under the roof
    const rs = g.createLinearGradient(0, 140, 0, 175); rs.addColorStop(0, 'rgba(10,16,40,0.35)'); rs.addColorStop(1, 'rgba(10,16,40,0)');
    g.fillStyle = rs; g.fillRect(0, 140, 584, 35); g.fillRect(752, 140, W - 752, 35);
    javCache.stands = c;
  }
  ctx.drawImage(javCache.stands, 0, 118, W, 182);
}
function javRR(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// a flag on a pole that streams with the wind (it droops when calm): honest for the wind right now
function javFlag(x, y, pole, cols, wind, ph, sc = 1) {
  ctx.strokeStyle = '#e8ecf4'; ctx.lineWidth = 2 * sc; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - pole); ctx.stroke();
  ctx.fillStyle = '#ffd34d'; circle(x, y - pole, 2.2 * sc); ctx.fill();
  const d = wind >= 0 ? 1 : -1, str = clamp(Math.abs(wind) / 6, 0, 1), L = 20 * sc, hgt = 12 * sc;
  const droop = (1 - str) * 1.2, t = G.clock * (5 + str * 9) + ph;
  const pt = (u, v) => {
    // u along the flag (0 pole .. 1 tip), v across (0 top .. 1 bottom)
    const ang = droop * u * 0.9 + 0.08, wave = Math.sin(t - u * 4) * (1.5 + 3 * str) * u * sc;
    const ax = Math.cos(ang) * L * u * d, ay = Math.sin(ang) * L * u;
    return [x + ax, y - pole + 1 + ay + v * hgt * (1 - 0.25 * u * droop) + wave];
  };
  for (let band = 0; band < 2; band++) {
    ctx.fillStyle = cols[band]; ctx.beginPath();
    for (let i = 0; i <= 6; i++) { const [px, py] = pt(i / 6, band * 0.5); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    for (let i = 6; i >= 0; i--) { const [px, py] = pt(i / 6, band * 0.5 + 0.5); ctx.lineTo(px, py); }
    ctx.closePath(); ctx.fill();
  }
}
// the big windsock by the runways: it fills out and points where the wind blows
function javWindsock(x, y, wind) {
  ctx.strokeStyle = '#d9dde8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 46); ctx.stroke();
  const d = wind >= 0 ? 1 : -1, str = clamp(Math.abs(wind) / 6, 0, 1), droop = (1 - str) * 1.1 + 0.05, L = 30, t = G.clock * (6 + 8 * str);
  ctx.save(); ctx.translate(x, y - 44); ctx.scale(d, 1); ctx.rotate(droop);
  for (let i = 0; i < 4; i++) {
    const u0 = i / 4, u1 = (i + 1) / 4, r0 = 7 - 3.5 * u0 * (1 - str * 0.4), r1 = 7 - 3.5 * u1 * (1 - str * 0.4), wv = Math.sin(t - i) * 1.2 * str;
    ctx.fillStyle = i % 2 ? '#ffffff' : '#ff8a3d';
    ctx.beginPath(); ctx.moveTo(u0 * L, -r0 + wv * u0); ctx.lineTo(u1 * L, -r1 + wv * u1); ctx.lineTo(u1 * L, r1 + wv * u1); ctx.lineTo(u0 * L, r0 + wv * u0); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#9aa3b5'; ctx.fillRect(-2, -8, 4, 16);
  ctx.restore();
}
function javTorch(x, y, wind) {
  ctx.fillStyle = '#b9850f'; ctx.beginPath(); ctx.moveTo(x - 16, y - 18); ctx.lineTo(x + 16, y - 18); ctx.lineTo(x + 8, y); ctx.lineTo(x - 8, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffc53d'; ctx.fillRect(x - 18, y - 22, 36, 5);
  ctx.fillStyle = '#8a6420'; ctx.fillRect(x - 4, y, 8, 10);
  const lean = clamp(wind / 6, -1, 1) * 0.7, t = G.clock;
  for (const [col, sc] of [['#ff6b4a', 1], ['#ffb347', 0.72], ['#fff1a8', 0.42]]) {
    ctx.fillStyle = col; ctx.beginPath();
    const hgt = (34 + Math.sin(t * 9) * 4) * sc, wob = Math.sin(t * 13) * 2 * sc;
    ctx.moveTo(x - 13 * sc, y - 21); ctx.quadraticCurveTo(x - 14 * sc + lean * hgt * 0.4, y - 21 - hgt * 0.55, x + lean * hgt * 0.95 + wob, y - 21 - hgt);
    ctx.quadraticCurveTo(x + 14 * sc + lean * hgt * 0.4, y - 21 - hgt * 0.5, x + 13 * sc, y - 21); ctx.closePath(); ctx.fill();
  }
}
function javDrawCrowd(st) {
  const cheer = st.cheer;
  for (const q of st.crowd) {
    const ty = 146 + q.row * 30, hop = Math.max(0, Math.sin(G.clock * (cheer > 0.05 ? 12 : 1.5) + q.ph)) * (1.2 + cheer * 7);
    const y = ty + 14 - hop;
    ctx.fillStyle = JAV_COL.crowd[q.c]; rr(q.x - 5, y, 10, 10, 4); ctx.fill();
    ctx.fillStyle = JAV_COL.skin[q.sk]; circle(q.x, y - 3, 4); ctx.fill();
    if (cheer > 0.3 && (q.c & 1)) { ctx.strokeStyle = JAV_COL.skin[q.sk]; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.x - 4, y + 2); ctx.lineTo(q.x - 7, y - 7); ctx.moveTo(q.x + 4, y + 2); ctx.lineTo(q.x + 7, y - 7); ctx.stroke(); }
  }
}
function javDrawWorld() {
  const st = G.mst; if (!st.cam || !st.ath) return;
  const sky = ctx.createLinearGradient(0, 0, 0, 300);
  sky.addColorStop(0, C.skyTop); sky.addColorStop(1, C.skyBot);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 300);
  ctx.fillStyle = C.sunGlow; circle(860, 70, 58); ctx.fill(); ctx.fillStyle = C.sun; circle(860, 70, 38); ctx.fill();
  for (const c of st.clouds) drawCloud(c.x, c.y, c.s);
  // roof flags and the torch
  for (let i = 0; i < 8; i++) javFlag(60 + i * 120, 124, 26, JAV_COL.flags[i % 4], st.windShow, i * 1.3);
  javStandsLayer();
  javTorch(360, 124, st.windShow);
  javDrawCrowd(st);
  // the field
  const gr = ctx.createLinearGradient(0, 300, 0, H);
  gr.addColorStop(0, '#79c95e'); gr.addColorStop(1, '#8edb6d');
  ctx.fillStyle = gr; ctx.fillRect(0, 300, W, H - 300);
  ctx.fillStyle = 'rgba(20,60,20,0.18)'; ctx.fillRect(0, 300, W, 8);   // the stands' shadow on the grass
  const c = st.cam, xL = c.x0, xR = c.x0 + W / c.s;
  // mowing stripes every 5 m
  for (let m = Math.floor(xL / 5) * 5; m < xR; m += 5) {
    if (((m / 5) | 0) % 2 === 0) continue;
    ctx.fillStyle = 'rgba(40,110,40,0.10)'; ctx.fillRect(javSX(m), 300, 5 * c.s + 0.5, H - 300);
  }
  // little tufts and clover in the grass (they move with the field)
  for (let m = Math.floor(xL / 2) * 2; m < xR; m += 2) {
    const hh = hash(m + 1000, 3); if (hh % 3) continue;
    const x = javSX(m) + (hh >> 4) % 10, y = 318 + (hh >> 9) % (H - 330);
    ctx.fillStyle = hh % 2 ? 'rgba(40,110,40,0.28)' : 'rgba(255,255,255,0.18)'; ctx.fillRect(x, y, 1.5, 3); ctx.fillRect(x + 2.5, y + 1, 1.5, 2);
  }
  // runways
  for (const k of [0, 1]) {
    const gy = JAV_GY[k], x0 = javSX(-28), x1 = javSX(0);
    ctx.fillStyle = JAV_COL.trackDk; ctx.fillRect(x0, gy - 9, x1 - x0, 20);
    ctx.fillStyle = JAV_COL.track; ctx.fillRect(x0, gy - 11, x1 - x0, 18);
    ctx.fillStyle = JAV_COL.trackHi; ctx.fillRect(x0, gy - 11, x1 - x0, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x0, gy - 12, x1 - x0, 2); ctx.fillRect(x0, gy + 7, x1 - x0, 2);
    // start mark
    ctx.fillRect(javSX(JAV.x0) - 1, gy - 10, 3, 17);
    // lane colour chevrons
    ctx.fillStyle = k ? 'rgba(91,149,255,0.5)' : 'rgba(255,107,74,0.5)';
    for (let m = -24; m < -2; m += 6) { const x = javSX(m); ctx.beginPath(); ctx.moveTo(x, gy - 7); ctx.lineTo(x + 7, gy - 2); ctx.lineTo(x, gy + 3); ctx.lineTo(x + 3, gy - 2); ctx.closePath(); ctx.fill(); }
  }
  // distance lines and boards (with a wind flag every 20 m)
  const big = hudBig();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let m = 10; m < xR + 10; m += 10) {
    const x = javSX(m); if (x < -20 || x > W + 20) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(x - 1, 312, 2, H - 312);
    ctx.font = '700 ' + (big ? 15 : 11) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const bw2 = Math.max(big ? 42 : 30, ctx.measureText(m + ' m').width + (big ? 14 : 12)), bh2 = big ? 20 : 15;
    ctx.fillStyle = 'rgba(20,60,20,0.25)'; rr(x - bw2 / 2 + 1.5, 301.5, bw2, bh2, 4); ctx.fill();
    ctx.fillStyle = '#ffffff'; rr(x - bw2 / 2, 300, bw2, bh2, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(28,26,54,0.25)'; ctx.lineWidth = 1; rr(x - bw2 / 2, 300, bw2, bh2, 4); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.fillText(m + ' m', x, 300 + bh2 / 2 + 0.8);
    if (m % 20 === 0) javFlag(x + 14, 312, 24, JAV_COL.flags[(m / 20) % 4], st.windShow, m * 0.37, 0.8);
  }
  // the foul line, across both lanes
  const fx = javSX(0);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(fx - 2, 312, 5, H - 312);
  ctx.fillStyle = '#ff5a5a'; ctx.fillRect(fx - 2, JAV_GY[0] - 12, 5, 21); ctx.fillRect(fx - 2, JAV_GY[1] - 12, 5, 21);
  // the line glows red in a lane whose athlete is close to it and still has the javelin
  for (const a of st.ath) {
    if (!(a.phase === 'run' || a.phase === 'aim') || a.x < -4) continue;
    const q = clamp((a.x + 4) / 4, 0, 1) * (0.55 + 0.45 * Math.sin(st.vt * 18)), gy = JAV_GY[a.k];
    ctx.globalAlpha = 0.25 + 0.55 * q; ctx.fillStyle = '#ff3b3b'; rr(fx - 5, gy - 15, 11, 27, 4); ctx.fill(); ctx.globalAlpha = 1;
  }
  // the gold ring (Target Ring round)
  if (st.twist === 'ring') for (const k of [0, 1]) {
    const x = javSX(st.ringX), gy = JAV_GY[k], rx = JAV.ringR * c.s, pulse = 1 + Math.sin(st.vt * 4) * 0.04;
    ctx.fillStyle = 'rgba(255,197,61,0.22)'; ctx.beginPath(); ctx.ellipse(x, gy, rx * pulse, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, gy, rx * pulse, 9, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, gy, rx * 0.5, 4.5, 0, 0, Math.PI * 2); ctx.stroke();
    if (k === 0) { ctx.font = '700 11px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.fillStyle = '#7a5200'; ctx.fillText('+4 m', x, gy - 16); }
  }
  // the windsock by the runways, and the judge by the line
  javWindsock(javSX(-15), (JAV_GY[0] + JAV_GY[1]) / 2 + 22, st.windShow);
  javDrawJudge(fx + 20, (JAV_GY[0] + JAV_GY[1]) / 2 + 26, st.judge);
  // stuck javelins and dust, back lane first
  for (const k of [0, 1]) {
    for (const d of st.dust) if (d.k === k) { const q = d.t / 0.8, x = javSX(d.xm); ctx.globalAlpha = 1 - q; ctx.fillStyle = '#c9b48a'; for (let i = 0; i < 5; i++) { circle(x + (i - 2) * (6 + 14 * q), JAV_GY[k] - 2 - q * 10 * (i % 2 + 1), 3 + 3 * q); ctx.fill(); } ctx.globalAlpha = 1; }
    for (const j of st.jv) if (j.k === k && j.stuck) javDrawStuck(j, st);
    javDrawAthlete(st.ath[k]);
  }
}
function javDrawJav(x, y, ang, k, len = 46, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(ang);
  const h = len / 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#4d5470'; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(h - 6, 0); ctx.stroke();
  ctx.strokeStyle = '#f3f5fa'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(h - 6, 0); ctx.stroke();
  ctx.fillStyle = '#7d869c'; ctx.beginPath(); ctx.moveTo(h + 3, 0); ctx.lineTo(h - 8, -2.6); ctx.lineTo(h - 8, 2.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PCOL[k]; ctx.fillRect(-5, -2.4, 10, 4.8);
  ctx.fillStyle = PDARK[k]; ctx.fillRect(-5, -2.4, 2, 4.8); ctx.fillRect(3, -2.4, 2, 4.8);
  ctx.restore();
}
function javDrawStuck(j, st) {
  const L = JAV_JL, a = j.ang + Math.sin(j.stickT * 38) * 0.22 * j.wob * j.wob;
  const tx = javSX(j.x), ty = JAV_GY[j.k] + 3;
  // the best mark of this round (the first throw that reached it) stays bright; older throws fade
  const isBest = st.best[j.k] != null && j.dist === st.best[j.k] && !st.jv.some(q => q !== j && q.k === j.k && q.stuck && q.dist === j.dist && q.att < j.att);
  const old = j.att < st.att && !isBest;
  const cx = tx - Math.cos(a) * (L / 2 - 4), cy = ty - Math.sin(a) * (L / 2 - 4);
  ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(tx - 14, ty, 14, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  javDrawJav(cx, cy, a, j.k, L, old ? 0.45 : 1);
  // the best mark gets a little flag with its distance
  if (isBest && j.stickT > 0.35) {
    const big = hudBig(), fs = big ? 15 : 11, label = j.dist.toFixed(1);
    const px = tx + 6, py = ty - 2;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - (big ? 34 : 26)); ctx.stroke();
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(label).width + 10, fh = big ? 19 : 15;
    ctx.fillStyle = PCOL[j.k]; rr(px, py - (big ? 34 : 26), w, fh, 3); ctx.fill();
    text(label, px + w / 2, py - (big ? 34 : 26) + fh / 2 + 0.5, fs, '#ffffff', 'center', 'body');
    if (st.over && st.winMark === j.k) { // the round's winning mark: a gold star on top
      ctx.fillStyle = C.gold; ctx.beginPath();
      const sx2 = px + w / 2, sy2 = py - (big ? 34 : 26) - 10, r = 7 + Math.sin(st.vt * 6);
      for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; ctx.lineTo(sx2 + Math.cos(an) * q, sy2 + Math.sin(an) * q); }
      ctx.closePath(); ctx.fill();
    }
  }
}
function javDrawJudge(x, y, jd) {
  ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(x, y, 13, 3, 0, 0, Math.PI * 2); ctx.fill();
  const up = jd.flag ? Math.min(1, jd.t / 0.15) * (jd.t < 1.8 ? 1 : Math.max(0, 1 - (jd.t - 1.8) / 0.3)) : 0;
  // the flag arm
  const fcol = jd.flag === 'red' ? '#ff4d4d' : '#ffffff';
  const ax = x + 9, ay = y - 18, hx = ax + 6 - 2 * up, hy = ay + 6 - 22 * up;
  ctx.strokeStyle = '#7a5cc0'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.strokeStyle = '#8a6420'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 1, hy - 16); ctx.stroke();
  if (jd.flag || up === 0) {
    const wv = Math.sin(G.clock * 14) * 2 * up;
    ctx.fillStyle = up > 0 ? fcol : '#e8e8e8'; ctx.strokeStyle = 'rgba(28,26,54,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx + 1, hy - 16); ctx.lineTo(hx + 14, hy - 13 + wv); ctx.lineTo(hx + 1, hy - 7); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // body, face, cap
  ctx.fillStyle = '#7a5cc0'; ctx.strokeStyle = '#4b3486'; ctx.lineWidth = 2; rr(x - 10, y - 26, 20, 26, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y - 20, 4, 12);
  ctx.fillStyle = '#f6d2b0'; circle(x, y - 32, 8); ctx.fill();
  ctx.fillStyle = C.ink; circle(x - 3, y - 33, 1.4); ctx.fill(); circle(x + 3, y - 33, 1.4); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3; ctx.beginPath();
  if (jd.flag === 'red' && up > 0) { ctx.arc(x, y - 27, 2.5, Math.PI * 1.1, Math.PI * 1.9); } else ctx.arc(x, y - 30, 2.6, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, y - 38, 9, 4, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 2, y - 39, 13, 3);
  if (jd.flag === 'red' && up > 0) { ctx.strokeStyle = '#c0c0c0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 4, y - 29); ctx.lineTo(x - 8, y - 26); ctx.stroke(); ctx.fillStyle = '#c9c9c9'; circle(x - 9, y - 25, 2); ctx.fill(); } // the whistle
}
// where an athlete's front toe is on screen this frame
function javToePx(k) { const a = G.mst.ath[k]; return { x: javSX(a.x), y: JAV_GY[k] }; }
// the javelin hand (screen px) for a pose: raised behind the head, so the javelin passes over the head and the face shows
// (local: in the athlete's own unscaled drawing space, see javDrawAthlete)
function javHandPx(a, pose, local) {
  const tx = javSX(a.x), gy = JAV_GY[a.k], S = local ? 1 : javS();
  return pose === 'aim' ? { x: tx - 26 * S, y: gy - 31 * S } : { x: tx - 18 * S, y: gy - 33 * S };
}
function javDrawAthlete(a) {
  const tx = javSX(a.x), gy = JAV_GY[a.k];
  ctx.save(); ctx.translate(tx, gy); ctx.scale(javS(), javS()); ctx.translate(-tx, -gy);
  javDrawAthleteBody(a);
  ctx.restore();
}
function javDrawAthleteBody(a) {
  const st = G.mst, k = a.k, col = PCOL[k], dark = PDARK[k];
  const tx = javSX(a.x), gy = JAV_GY[k], w = 22, h = 26;
  let cx = tx - 9, lean = 0, bob = 0, pose = 'stand';
  if (a.phase === 'run' || (a.phase === 'ready' && a.v > 0.3)) { pose = 'run'; lean = 0.1 + 0.08 * a.v / JAV.runMax; bob = Math.abs(Math.sin(a.stride)) * 2.5 * Math.min(1, a.v / 3); }
  else if (a.phase === 'aim') { pose = 'aim'; lean = -0.2; }
  else if (a.phase === 'thrown') { pose = a.pt < 0.45 ? 'throw' : 'watch'; lean = a.pt < 0.45 ? 0.28 * (1 - a.pt / 0.45) + 0.06 : 0; if (a.cheer > 0) { pose = 'cheer'; bob = Math.abs(Math.sin(st.vt * 9)) * 7 * a.cheer; } }
  else if (a.phase === 'foul') { pose = 'whoa'; lean = Math.sin(st.vt * 14) * 0.25 * a.whoa + 0.15; }
  else if (a.phase === 'none') pose = 'sad';
  ctx.save();
  ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(cx, gy, 13, 3, 0, 0, Math.PI * 2); ctx.fill();
  // feet (a run cycle)
  const ph = a.stride, run = pose === 'run' || (pose === 'aim' && a.v > 0.5);
  for (const f of [0, 1]) {
    const q = ph + f * Math.PI, fx = run ? Math.cos(q) * 7 : (f ? 5 : -4) + (pose === 'aim' ? (f ? 4 : -3) : 0), lift = run ? Math.max(0, Math.sin(q)) * 5 : 0;
    ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(cx + fx + 2, gy - 2 - lift, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(cx + fx + 1, gy - 4.5 - lift, 4, 1.4);
  }
  ctx.translate(cx, gy - 3 - bob); ctx.rotate(lean);
  // ears (Bo)
  if (k === 1) { ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2; for (const ex of [-w / 2 + 4, w / 2 - 4]) { circle(ex, -h + 1, 5); ctx.fill(); ctx.stroke(); } }
  ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2.5; rr(-w / 2, -h, w, h, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(-w / 2 + 3, -h + 3, w * 0.35, h * 0.4, 5); ctx.fill();
  // the bib with a number
  ctx.fillStyle = '#ffffff'; rr(-6, -11, 12, 9, 2); ctx.fill();
  ctx.font = '700 8px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = dark; ctx.fillText(String(k + 1), 0, -6.3);
  // headband with tails that stream behind while running
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-w / 2 + 1, -h + 5, w - 2, 3.5);
  const tail = Math.min(1, a.v / 6), tw = Math.sin(st.vt * 18) * 2 * tail;
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-w / 2 + 1, -h + 5.5); ctx.lineTo(-w / 2 - 8 - 4 * tail, -h + 4 + tw - 3 * (1 - tail) + 6 * (1 - tail)); ctx.lineTo(-w / 2 - 6 - 3 * tail, -h + 8 + tw + 6 * (1 - tail)); ctx.closePath(); ctx.fill();
  // Pip's sprout
  if (k === 0) { ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(1, -h - 6); ctx.stroke(); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(5 - 2 * tail, -h - 8, 6, 3, -0.5 - 0.3 * tail, 0, Math.PI * 2); ctx.fill(); }
  // face
  const ey = -h * 0.55, look = 2.5;
  if (pose === 'whoa') {
    for (const ex of [-5, 5]) { ctx.fillStyle = '#fff'; circle(ex + look, ey, 4.2); ctx.fill(); ctx.fillStyle = C.ink; circle(ex + look, ey, 1.5); ctx.fill(); }
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(look, ey + 7, 2.6, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  } else if (pose === 'sad') {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; for (const ex of [-5, 5]) { ctx.beginPath(); ctx.moveTo(ex - 3 + look, ey + 1); ctx.lineTo(ex + 3 + look, ey - 0.5); ctx.stroke(); }
  } else if (pose === 'cheer') {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; for (const ex of [-5, 5]) { ctx.beginPath(); ctx.arc(ex + look, ey + 1.5, 3, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(look, ey + 5, 3.5, 0, Math.PI); ctx.fill();
  } else {
    const squint = pose === 'aim' || pose === 'throw';
    for (const ex of [-5, 5]) {
      if (squint) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex + look, ey, 3.6, 2.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = C.ink; circle(ex + look + 1.2, ey + 0.3, 1.7); ctx.fill(); }
      else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex + look, ey, 3.6, 4.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = C.ink; circle(ex + look + 1.2, ey + 0.8, 2); ctx.fill(); }
    }
  }
  ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(-8 + look * 0.5, ey + 6, 2.4); ctx.fill(); circle(8 + look * 0.5, ey + 6, 2.4); ctx.fill();
  // arms and the javelin
  const holding = a.phase === 'ready' || a.phase === 'run' || a.phase === 'aim';
  ctx.lineCap = 'round'; ctx.lineWidth = 4;
  const arm = (x0, y0, x1, y1) => { ctx.strokeStyle = dark; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.fillStyle = col; circle(x1, y1, 3); ctx.fill(); };
  // a point of the unrotated drawing space (dx, dy from the body's pivot) in the leaning body's own frame, for the hand
  const toBody = (dx, dy) => ({ x: dx * Math.cos(lean) + dy * Math.sin(lean), y: -dx * Math.sin(lean) + dy * Math.cos(lean) });
  if (pose === 'aim') {
    const r = a.ang * Math.PI / 180;
    ctx.restore(); ctx.save();
    const hp = javHandPx(a, 'aim', true);
    javDrawJav(hp.x + Math.cos(-r) * 4, hp.y + Math.sin(-r) * 4, -r, k);
    ctx.translate(cx, gy - 3); ctx.rotate(lean);
    const bh = toBody(hp.x - cx, hp.y - gy + 3);
    arm(-8, -h + 14, bh.x, bh.y);   // (up the back of the head, clear of the eyes)
    arm(6, -h + 13, 13, -h + 16);
  } else if (holding) {
    ctx.restore(); ctx.save();
    const hp = javHandPx(a, 'run', true), r = 0.16 + Math.sin(a.stride) * 0.04 * Math.min(1, a.v / 3);
    javDrawJav(hp.x + 2, hp.y - bob, -r, k);
    ctx.translate(cx, gy - 3 - bob); ctx.rotate(lean);
    const bh = toBody(hp.x - cx, hp.y - gy + 3);
    arm(-8, -h + 14, bh.x, bh.y);
    arm(6, -h + 14, 11 + Math.sin(a.stride) * 3, -h + 21);
  } else if (pose === 'throw') {
    arm(9, -h + 13, 18, -h - 2); arm(-5, -h + 13, -12, -h + 18);
  } else if (pose === 'cheer') {
    arm(-7, -h + 12, -12, -h - 6); arm(7, -h + 12, 12, -h - 6);
  } else if (pose === 'whoa') {
    const sw = Math.sin(st.vt * 16) * 6;
    arm(-7, -h + 12, -15, -h + 2 + sw); arm(7, -h + 12, 15, -h + 2 - sw);
    if (a.pt < 0.6) javDrawJav(20 + a.pt * 30, -h + 4 + a.pt * 34, 0.6 + a.pt * 2, k, 40);   // (tumbling away over the head)
  } else {
    arm(-6, -h + 13, -10, -h + 22); arm(6, -h + 13, 10, -h + 22);
  }
  ctx.restore();
}
function javDrawMeter(a, big) {
  // (it stands on the runway beside the athlete: the same in both lanes, and the far lane's top stays under the banner)
  const st = G.mst, k = a.k, tx = javSX(a.x), gy = JAV_GY[k], sc = big ? 1.3 : 1;
  const bw = big ? 15 : 11, bh = big ? 60 : 56, x = Math.max(8, tx - 12 * javS() - 26 * sc - bw / 2), y = gy + 4 - bh;
  const gold = st.gold[k] >= 1;
  const cap = javSpeedF(a.v), m = a.phase === 'aim' || a.phase === 'thrown' ? a.power : javMeter(a) * cap;
  ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(x - 3, y - 3, bw + 6, bh + 6, 5); ctx.fill();
  if (gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x - 3, y - 3, bw + 6, bh + 6, 5); ctx.stroke(); }
  // the speed cap: the meter can't swing above it
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x, y + bh * (1 - cap), bw, bh * cap);
  // the gold top band (steady meter): anything in it counts as full
  if (gold) { ctx.fillStyle = 'rgba(255,197,61,0.5)'; ctx.fillRect(x, y + bh * (1 - cap), bw, bh * cap * (1 - JAV.steadyTop)); }
  const fh = bh * clamp(m, 0, 1), hue = m < 0.5 ? '#5bd36a' : m < 0.85 ? '#ffd34d' : '#ff7b4a';
  const gr = ctx.createLinearGradient(0, y + bh, 0, y);
  gr.addColorStop(0, '#5bd36a'); gr.addColorStop(0.6, '#ffd34d'); gr.addColorStop(1, '#ff6b4a');
  ctx.fillStyle = gr; ctx.fillRect(x, y + bh - fh, bw, fh);
  ctx.fillStyle = hue; ctx.fillRect(x - 2, y + bh - fh - 1.5, bw + 4, 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + bh * (1 - JAV.perfect)); ctx.lineTo(x + bw, y + bh * (1 - JAV.perfect)); ctx.stroke();
}
// where the angle dial's pivot is: just ahead of the athlete, on the grass above its runway (the same in both lanes; it
// stays clear of the banner over the far lane and of the foul line's red glow on the runway)
function javDialPos(a, big) { const R = big ? 40 : 32; return { x: javSX(a.x) + 12 * javS(), y: JAV_GY[a.k] - 16, R }; }
function javDrawDial(a, big) {
  const k = a.k, { x, y, R } = javDialPos(a, big);
  ctx.fillStyle = 'rgba(28,26,54,0.88)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, R + 4, -Math.PI / 2, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
  for (let d = 0; d <= 90; d += 15) { const r = -d * Math.PI / 180; ctx.beginPath(); ctx.moveTo(x + Math.cos(r) * (R - 6), y + Math.sin(r) * (R - 6)); ctx.lineTo(x + Math.cos(r) * R, y + Math.sin(r) * R); ctx.stroke(); }
  if (a.guide) { const r = -a.guide * Math.PI / 180; ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(r) * (R - 10), y + Math.sin(r) * (R - 10)); ctx.lineTo(x + Math.cos(r) * (R + 3), y + Math.sin(r) * (R + 3)); ctx.stroke(); }
  const r = -a.ang * Math.PI / 180;
  ctx.strokeStyle = PCOL[k]; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(r) * (R - 2), y + Math.sin(r) * (R - 2)); ctx.stroke();
  const fs = big ? 17 : 13;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  // the degrees, right of the dial's foot
  const lab = Math.round(a.ang) + '°', lw = ctx.measureText(lab).width + 12, lx = x + R + 8, lh = fs + 6;
  ctx.fillStyle = 'rgba(28,26,54,0.9)'; rr(lx, y - lh, lw, lh, 6); ctx.fill();
  text(lab, lx + lw / 2, y - lh / 2 + 0.5, fs, '#ffffff', 'center', 'body');
}
// the key reminder over an athlete (rounds 1-2, before the run): each player's own device; nothing over the computer
function javKeyChip(a, big, line, side) {
  if (javCpu(a.k)) return;
  let how = 'kb'; try { how = actKey(a.k); } catch (e) { how = 'kb'; }
  let label = line;
  if (!label) {
    const solo = typeof cpuSolo === 'function' && cpuSolo();
    if (how === 'pad') label = 'Hold ▶ to run · ' + glyph('act') + ' throw';
    else if (how === 'touch') label = 'Hold ▶ to run · tap throw';
    else label = solo ? 'Hold D or → to run · F or / throw' : a.k === 0 ? 'Hold D to run · F throw' : 'Hold → to run · / throw';
  }
  const fs = big ? 18 : 13, h = big ? 30 : 22;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(label).width + (big ? 26 : 20), tx = javSX(a.x), dp = javDialPos(a, big);
  // (side: the aim reminder, right of the angle dial and its degrees)
  const x = clamp(side ? dp.x + dp.R + (big ? 76 : 64) + w / 2 : tx + 40, 8 + w / 2, W - 8 - w / 2), y = side ? dp.y - (dp.R + 4) / 2 : JAV_GY[a.k] - (big ? 96 : 84);
  ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = PCOL[a.k]; ctx.lineWidth = 2; rr(x - w / 2, y - h / 2, w, h, h / 2); ctx.stroke();
  text(label, x, y + 0.5, fs, C.gold, 'center', 'body');
}
function javDrawTop() {
  const st = G.mst, m = G.match; if (!st.cam || !st.ath) return;
  const big = hudBig();
  // release flashes
  for (const f of st.flash) { const q = f.t / 0.5, x = javSX(f.xm), y = javSY(f.k, JAV.h0); ctx.globalAlpha = 1 - q; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * (1 - q) + 1; circle(x, y, 8 + 30 * q); ctx.stroke(); ctx.globalAlpha = 1; }
  // flying javelins with their whoosh trails (back lane first)
  for (const k of [0, 1]) for (const j of st.jv) {
    if (j.k !== k || j.stuck) continue;
    const ease = Math.max(0, 1 - j.t / 0.35), ox = j.hx * ease, oy = j.hy * ease;
    if (j.trail.length > 1) { // a whoosh streak behind it
      ctx.lineCap = 'round';
      for (let i = 1; i < j.trail.length; i++) { const q0 = j.trail[i - 1], q1 = j.trail[i], f = i / j.trail.length; ctx.globalAlpha = f * 0.55; ctx.strokeStyle = i % 2 ? '#ffffff' : PCOL[k]; ctx.lineWidth = 1 + f * 3; ctx.beginPath(); ctx.moveTo(javSX(q0.x), javSY(k, q0.h)); ctx.lineTo(javSX(q1.x), javSY(k, q1.h)); ctx.stroke(); }
      ctx.lineCap = 'butt';
    }
    ctx.globalAlpha = 1;
    javDrawJav(javSX(j.x) + ox, javSY(k, j.h) + oy, j.ang, k, JAV_JL);
    // a little shadow on the grass under it
    ctx.fillStyle = 'rgba(28,26,54,0.15)'; ctx.beginPath(); ctx.ellipse(javSX(j.x), JAV_GY[k] + 1, 12, 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  // meters, dials, the shot clock
  const live = m && m.phase === 'live';
  for (const a of st.ath) {
    if (m && m.phase !== 'end' && m.phase !== 'over' && (a.phase === 'ready' || a.phase === 'run' || a.phase === 'aim' || (a.phase === 'thrown' && a.pt < 0.5))) javDrawMeter(a, big);
    if (a.phase === 'aim') javDrawDial(a, big);
    if (live && st.aphase === 'go' && (a.phase === 'ready' || a.phase === 'run' || a.phase === 'aim')) {
      const left = JAV.shot - a.clock;
      if (left <= 3.5) {
        const x = Math.max(24, javSX(a.x) - 12 * javS()), y = JAV_GY[a.k] - (big ? 108 : 96), R = big ? 15 : 12;
        ctx.fillStyle = 'rgba(28,26,54,0.82)'; circle(x, y, R); ctx.fill();
        ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(left / 3.5, 0, 1)); ctx.stroke();
        text(String(Math.max(1, Math.ceil(left))), x, y + 1, big ? 18 : 14, '#ffffff', 'center');
      }
    }
  }
  // ring bonus sparkle
  for (const r of st.ringFx) { const q = r.t / 1.2, x = javSX(st.ringX), y = JAV_GY[r.k]; ctx.globalAlpha = 1 - q; ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, JAV.ringR * st.cam.s * (1 + q), 9 * (1 + q * 2), 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
  // pop-up words
  for (const q of st.pops) {
    const f = q.t / q.life, x = clamp(javSX(q.xm) + q.ox * (hudBig() ? 1.3 : 1), 70, W - 70), y = JAV_GY[q.k] - q.dy - 18 * Math.min(1, f * 3);
    ctx.globalAlpha = f < 0.75 ? 1 : 1 - (f - 0.75) / 0.25;
    bigText(q.text, x, y, q.size * (big ? 1.25 : 1), q.col, f < 0.12 ? 0.6 + f / 0.12 * 0.5 : 1.1 - Math.min(0.1, f * 0.2));
    ctx.globalAlpha = 1;
  }
  // "Throw 2!" between throws
  if (st.aphase === 'set' && live) {
    const f = st.at / JAV.setT, lab = st.att + 1 === st.attN ? (st.attN > 1 ? 'Last throw!' : 'Throw!') : 'Throw ' + (st.att + 1) + '!';
    ctx.globalAlpha = f < 0.8 ? 1 : 1 - (f - 0.8) / 0.2;
    bigText(lab, W / 2, 228, big ? 56 : 46, C.gold, 0.8 + 0.3 * Math.min(1, f * 4));
    ctx.globalAlpha = 1;
  }
  // key reminders (rounds 1-2, first throw, until the athlete starts running) and the aim reminder
  const chipA = m && (m.phase === 'ready' || m.phase === 'count') ? 1 : live && st.aphase === 'go' ? 1 : 0;
  if (chipA && m.round <= 2) for (const a of st.ath) {
    if (st.att === 0 && (a.phase === 'ready' && !a.running)) javKeyChip(a, big);
    else if (m.round === 1 && st.att <= 1 && a.phase === 'aim' && a.ang < 30) javKeyChip(a, big, 'Hold to aim higher, let go to throw!', true);
  }
  // name tags through the intro, "Round N" and 3-2-1 (the framework draws none for hidden players)
  const tagA = G.introT > 0 || (m && (m.phase === 'intro' || m.phase === 'ready' || m.phase === 'count')) ? 1 : 0;
  if (tagA > 0) for (const a of st.ath) {
    const x = Math.max(32, javSX(a.x) - 12 * javS()), y = JAV_GY[a.k] - 34 * javS() - 14, cpu = javCpu(a.k), hw = cpu ? 30 : 18;
    ctx.globalAlpha = tagA; ctx.fillStyle = PCOL[a.k]; rr(x - hw, y - 11, hw * 2, 18, 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, y + 7); ctx.lineTo(x + 4, y + 7); ctx.lineTo(x, y + 11); ctx.fill();
    text(cpu ? NAMES[a.k] + ' · CPU' : NAMES[a.k], x, y - 1.5, 12, '#fff', 'center', 'body'); ctx.globalAlpha = 1;
  }
}
function javHud() {
  const st = G.mst, m = G.match; if (!st.cam || !st.ath || !m) return;
  const big = hudBig(), sc = big ? 1.35 : 1;
  // wind pill, top right: an arrow (→ tailwind, ← headwind) and the speed
  {
    const wv = st.windShow, fs = 14 * sc, h = 28 * sc, lab = (Math.abs(wv) < 0.05 ? '0.0' : Math.abs(wv).toFixed(1)) + ' m/s', word = Math.abs(wv) < 0.5 ? 'calm' : wv > 0 ? 'tail' : 'head';
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(lab).width, ww = ctx.measureText(word).width, w = tw + ww + 74 * sc, box = G.matchHudBox;
    let y = 12; if (box && W - 14 - w < box.x1 + 6) y = box.y1 + 6;
    const x0 = pill(W - 14, y, w, h, 'right'), cy = y + h / 2;
    // a tiny windsock icon
    ctx.save(); ctx.translate(x0 + 16 * sc, cy); ctx.scale(sc, sc);
    const d = wv >= 0 ? 1 : -1, s2 = clamp(Math.abs(wv) / 6, 0, 1);
    ctx.strokeStyle = '#d9dde8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6 * d, 9); ctx.lineTo(-6 * d, -8); ctx.stroke();
    ctx.translate(-6 * d, -6); ctx.scale(d, 1); ctx.rotate((1 - s2) * 1.0);
    ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(16, -2); ctx.lineTo(16, 2); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(6, -3.2, 4, 6.4);
    ctx.restore();
    const ax = x0 + 38 * sc, col = word === 'tail' ? '#8fe3b0' : word === 'head' ? '#ffb38a' : C.paper;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.5 * sc; ctx.lineCap = 'round';
    if (word !== 'calm') { ctx.beginPath(); ctx.moveTo(ax - d * 7 * sc, cy); ctx.lineTo(ax + d * 4 * sc, cy); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ax + d * 9 * sc, cy); ctx.lineTo(ax + d * 2 * sc, cy - 5 * sc); ctx.lineTo(ax + d * 2 * sc, cy + 5 * sc); ctx.closePath(); ctx.fill(); }
    else { circle(ax, cy, 3 * sc); ctx.fill(); }
    ctx.lineCap = 'butt';
    text(lab, ax + 14 * sc, cy + 0.5, fs, '#ffffff', 'left', 'body');
    text(word, ax + 14 * sc + tw + 6 * sc, cy + 0.5, fs * 0.86, col, 'left', 'body');
  }
  // twist pill under the level pill (not in the plain round)
  if (st.twist && st.twist !== 'calm') {
    const tw = JAV_TWISTS[st.twist], fs = big ? 20 : 13, h = big ? 36 : 26, y0 = 46;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const name = st.twist === 'ring' ? tw.name + ' at ' + st.ringX + ' m' : tw.name;   // (the ring is off screen during the run-up)
    const w = ctx.measureText(name).width + (big ? 36 : 28); pill(14, y0, w, h); text(name, 14 + (big ? 18 : 14), y0 + h / 2 + 0.5, fs, C.gold, 'left', 'body');
  }
  // throw counter under the match pill
  if (m.phase === 'live' || m.phase === 'end') {
    const box = G.matchHudBox, y = box ? box.y1 + 6 : 50, fs = big ? 18 : 12, h = big ? 28 : 22;
    const lab = st.attN === 1 ? 'One throw each' : 'Throw ' + Math.min(st.att + 1, st.attN) + ' of ' + st.attN;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(lab).width + 26; pill(W / 2, y, w, h, 'center'); text(lab, W / 2, y + h / 2 + 0.5, fs, C.paper, 'center', 'body');
  }
  // each player's marks, bottom left (Pip) and bottom right (Bo)
  for (const k of [0, 1]) {
    const right = k === 1, best = st.best[k], gold = st.gold[k] >= 1;
    const bestTxt = best == null ? 'no mark' : best.toFixed(1) + ' m';
    const fs = 14 * sc, nfs = 16 * sc, h = 30 * sc, dotW = 18 * sc;
    ctx.font = nfs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif'; const nw = ctx.measureText(NAMES[k]).width;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; const bw = ctx.measureText(bestTxt).width;
    const goldW = gold ? 24 * sc : 0, w = 14 * sc + nw + 10 * sc + bw + 12 * sc + st.attN * dotW + goldW + 10 * sc;
    const y = H - 12 - h, x0 = pill(right ? W - 14 : 14, y, w, h, right ? 'right' : 'left'), cy = y + h / 2;
    if (gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x0, y, w, h, h / 2); ctx.stroke(); }
    let x = x0 + 14 * sc;
    text(NAMES[k], x, cy + 0.5, nfs, PCOL[k], 'left'); x += nw + 10 * sc;
    text(bestTxt, x, cy + 0.5, fs, best == null ? '#b9b4d6' : '#ffffff', 'left', 'body'); x += bw + 12 * sc;
    for (let i = 0; i < st.attN; i++) {
      const mk = st.marks[k][i], dx = x + dotW / 2 + i * dotW, r = 6 * sc;
      if (!mk) { ctx.strokeStyle = i === st.att && m.phase === 'live' ? '#ffffff' : 'rgba(246,239,223,0.4)'; ctx.lineWidth = 2; circle(dx, cy, r - 1); ctx.stroke(); }
      else if (mk.foul) { ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 2.5 * sc; ctx.beginPath(); ctx.moveTo(dx - r * 0.7, cy - r * 0.7); ctx.lineTo(dx + r * 0.7, cy + r * 0.7); ctx.moveTo(dx + r * 0.7, cy - r * 0.7); ctx.lineTo(dx - r * 0.7, cy + r * 0.7); ctx.stroke(); }
      else { ctx.fillStyle = mk.d === best ? C.gold : PCOL[k]; circle(dx, cy, r); ctx.fill(); }
    }
    if (gold) { // the gold steady meter is on: a little gold meter icon
      const gx = x + st.attN * dotW + 12 * sc;
      ctx.fillStyle = 'rgba(255,197,61,0.3)'; circle(gx, cy, 10 * sc); ctx.fill();
      ctx.fillStyle = C.gold; rr(gx - 3 * sc, cy - 7 * sc, 6 * sc, 14 * sc, 2); ctx.fill();
      ctx.fillStyle = '#7a5200'; ctx.fillRect(gx - 3 * sc, cy - 1 * sc, 6 * sc, 2 * sc);
    }
  }
  // the twist card, every round, while it gets ready
  if (m.phase === 'ready' || m.phase === 'count') {
    const tw = JAV_TWISTS[st.twist] || JAV_TWISTS.calm, nf = big ? 30 : 26, hf = big ? 19 : 14;
    // the catch-up help is announced here too, in gold
    const gk = st.gold[0] ? 0 : st.gold[1] ? 1 : -1, gl = gk < 0 ? '' : (st.gold[gk] >= 2 ? 'Gold meter + angle mark for ' : 'Gold steady meter for ') + NAMES[gk] + '!';
    const ch = (big ? 78 : 60) + (gl ? (big ? 26 : 20) : 0), cy = (big ? 380 : 386) - (gl ? (big ? 16 : 10) : 0);
    ctx.font = hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const hw = Math.max(ctx.measureText(tw.hint).width, ctx.measureText(gl).width), w = Math.max(big ? 380 : 300, hw + 48), a = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(W / 2 - w / 2, cy, w, ch, 16); ctx.fill();
    if (gl) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(W / 2 - w / 2, cy, w, ch, 16); ctx.stroke(); }
    text(tw.name, W / 2, cy + (big ? 25 : 21), nf, C.gold, 'center'); text(tw.hint, W / 2, cy + (big ? 57 : 46), hf, C.paper, 'center', 'body');
    if (gl) text(gl, W / 2, cy + (big ? 83 : 66), hf, C.gold, 'center', 'body');
    ctx.globalAlpha = 1;
  }
}

Sfx.extra.javelinStep = function (p) { this.tone(170 * p, 0.035, 'triangle', 0.03, 120 * p); };
Sfx.extra.javelinAim = function (p) { this.tone(520 * p, 0.09, 'triangle', 0.035, 820 * p); };
Sfx.extra.javelinWhoosh = function (p) { this.tone(260 * p, 0.38, 'sawtooth', 0.022, 980 * p); this.tone(1400 * p, 0.3, 'sine', 0.018, 420 * p, 0.05); };
Sfx.extra.javelinThunk = function (p) { this.tone(120 * p, 0.14, 'square', 0.06, 55 * p); this.tone(460 * p, 0.06, 'triangle', 0.04, 220 * p); this.tone(300 * p, 0.16, 'triangle', 0.02, 330 * p, 0.06); };
Sfx.extra.javelinWhistle = function () { for (let i = 0; i < 6; i++) this.tone(i % 2 ? 2350 : 2100, 0.06, 'square', 0.022, null, i * 0.055); this.tone(2250, 0.28, 'square', 0.022, 2150, 0.33); };
Sfx.extra.javelinPerfect = function (p) { [1319, 1760, 2093].forEach((f, i) => this.tone(f * p, 0.09, 'triangle', 0.04, null, i * 0.05)); };
Sfx.extra.javelinCheer = function () { [392, 494, 587, 659, 523].forEach((f, i) => this.tone(f, 0.45, 'sawtooth', 0.008, f * 1.35, i * 0.04)); this.tone(880, 0.3, 'triangle', 0.02, 1175, 0.2); };
Sfx.extra.javelinGold = function (p) { [784, 1046, 1318].forEach((f, i) => this.tone(f * p, 0.12, 'triangle', 0.045, null, i * 0.08)); };
Sfx.extra.javelinRing = function (p) { [988, 1319, 1760, 2349].forEach((f, i) => this.tone(f * p, 0.09, 'triangle', 0.04, null, 0.1 + i * 0.05)); };
Sfx.extra.javelinTick = function (p) { this.tone(1100 * p, 0.04, 'square', 0.025); };
Sfx.extra.javelinSet = function () { this.tone(660, 0.09, 'triangle', 0.04); };
Sfx.extra.javelinGo = function () { this.tone(2200, 0.12, 'square', 0.025, 2350); };
/* ===== end of 11-4 Javelin Throw ===== */
