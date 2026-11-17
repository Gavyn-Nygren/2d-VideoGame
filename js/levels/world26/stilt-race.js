/* Pip & Bo - Level 26-4 Stilt Race (versus, World 26 Circus Big Top). */
'use strict';

/* ===== 26-4 Stilt Race (mode 'stiltrace', versus, best of 5, scrolls right, Gavyn's pick) =====
   Gavyn's pick: "race on wobbly stilts down the midway, and leaning too far topples you."
   def.ownStep: the mode runs the live tick, the camera and the picture; the platformer bodies are hidden and the mode
   draws Pip and Bo on tall striped stilts, Pip in the back lane and Bo in the front lane (they swap every round).
   All positions are course px: x runs from the start line (0) to the finish banner (course.len).
   BALANCE: each racer has a lean (0 = straight up, + forward). Lean is wobbly: it slowly tips further the way it
     leans, and every stride gives it a little jolt (bigger when fast). ▶ pushes your lean forward, ◀ pulls it back.
     Speed follows the lean: straight up walks slowly, leaning forward strides faster (up to 460 px/s at the edge of the
     green zone on your balance meter). Leaning past the red edge (about 43° forward, or 30° back) topples you: "Whoa!",
     a soft flop onto the sawdust, and 1.4 s to climb back up.
   THE ACTION ('steady'): windmill your arms: for 0.6 s the wobble is much calmer (refills in 1.6 s, a ring on your
     panel).
   ON THE MIDWAY (the same in both lanes): popcorn boxes and ducks crossing (hop over them with ▲: a big stride), low
     bunting (duck with ▼, or "Bonk!" and a big push back), and lemonade spills (slippery: much wobblier while on one).
     Tripping on a box or a duck jolts you forward ("Trip!"). Nobody gets hurt.
   FINISH: the first racer under the finish banner wins the round; both in the same tick: the one farther past it. The
     round clock is 60 s (def.match.roundTime): the racer farther along wins; within 12 px it's a tie.
   Rounds (each its own course from tokens, with some randomness from MODES.stiltrace.rand): 1 Popcorn Path, 2 Duck
     Crossing, 3 Bunting Boulevard, 4 Lemonade Lane, 5 Grand Midway. tiebreak(): fewer topples this match, else replay.
   The camera follows the leader but never leaves the trailer behind; a trailer more than a screen behind gets a gold
   tailwind (pulled along), announced.
   Catch-up help (gold, announced on the panel at GO; off in sudden death): 1+ rounds behind = gold balance (a calmer
   wobble); 2+ behind also gold stilts (+40 px/s top speed).
   Every top-level name is prefixed str / STR, every sound Sfx.extra.stiltrace*. */
const STR = {
  laneY: [372, 452], len0: 6200,
  tip: 2.1, push: 3.4, damp: 1.4, maxFwd: 0.75, maxBack: -0.52, green: 0.5,
  vMin: 90, vMax: 460, goldV: 40, stride: 74, jolt: 0.16, joltV: 0.3,
  steadyT: 0.6, steadyCd: 1.6, steadyDamp: 5, fallT: 1.4,
  hopV: 360, hopG: 1300, duckH: 40, slip: 2.2, goldTip: 0.7,
  camLead: 0.42, camTrail: 90, roundTime: 60, timeTie: 12, height: 92,
};
const STR_COURSES = [
  { name: 'Popcorn Path', plan: '_ _ p _ p _ _ p p _ p _ _ p _ p p _ _ p _' },
  { name: 'Duck Crossing', plan: '_ _ d _ p _ d _ _ d d _ p _ d _ _ p d _ d _' },
  { name: 'Bunting Boulevard', plan: '_ _ b _ p _ b _ _ d _ b _ p _ b _ d _ b _' },
  { name: 'Lemonade Lane', plan: '_ _ s _ p _ s d _ s _ b _ s p _ d s _ s _' },
  { name: 'Grand Midway', plan: '_ _ p _ b _ s d _ p b _ s _ d _ b p _ s d _ b _' },
];
const strCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
let strVS = 20261126;
const strVR = () => { strVS = (Math.imul(strVS, 1664525) + 1013904223) >>> 0; return strVS / 4294967296; };

function strBuildCourse(k, R) {
  const cs = STR_COURSES[k % STR_COURSES.length], c = { name: cs.name, obs: [], len: 0 };
  let x = 500;
  for (const tk of cs.plan.split(/\s+/)) {
    if (!tk) continue;
    if (tk === '_') { x += 330 + R() * 160; continue; }
    if (tk === 's') { c.obs.push({ k: 's', x, w: 170 }); x += 330; continue; }
    c.obs.push({ k: tk, x: x + R() * 40 });
    x += 260 + R() * 80;
  }
  c.len = Math.round(x + 400);
  return c;
}
function strNewRacer(k, lane, gold) {
  return { k, lane, x: 0, a: 0.02, av: 0, v: 0, st: 'walk', fallT: 0, step: 0, hopY: 0, hopV: 0, duck: false, steadyT: 0, cd: 0,
    slip: false, done: false, gold, tail: false, hit: {}, cheer: 0, pop: null, popT: 0, face: 1 };
}
function strNewRound(st, n, info, R) {
  const k = st.forceCourse != null ? st.forceCourse : Math.min(n - 1, STR_COURSES.length - 1);
  st.course = strBuildCourse(k, R);
  st.round = n; st.res = null; st.ph = 'ready'; st.rt = 0;
  const lanes = n % 2 ? [0, 1] : [1, 0];
  const w = info.wins || [0, 0];
  st.pl = [0, 1].map(id => {
    const behind = w[1 - id] - w[id];
    const gold = info.suddenDeath || st.noHelp ? 0 : behind >= 2 ? 2 : behind >= 1 ? 1 : 0;
    return strNewRacer(id, lanes[id], gold);
  });
  st.fx = []; st.pops = [];
}
function strPop(D, text, col) { D.pop = { text, col: col || '#ffffff' }; D.popT = 1.2; }
function strFx(st, x, y, vx, vy, life, col, size, grav, kind) {
  st.fx.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: strVR() * 6 });
  if (st.fx.length > 300) st.fx.shift();
}

/* ---------- the live tick ---------- */
function strTick(st, dt, live) {
  st.t += dt; if (live) st.rt += dt;
  for (const D of st.pl) strRacer(st, D, dt, live);
  if (live && !st.res) {
    const done = st.pl.filter(D => D.x >= st.course.len);
    if (done.length) {
      const w = done.length === 2 ? (st.pl[0].x === st.pl[1].x ? -1 : st.pl[0].x > st.pl[1].x ? 0 : 1) : done[0].k;
      st.res = { winner: w };
      if (w >= 0) { st.stat.wins[w]++; st.pl[w].cheer = 1; }
      for (const D of done) D.done = true;
      Sfx.play('stiltraceFinish');
      matchRoundEnd(w, w < 0 ? 'Neck and neck!' : 'First under the banner!');
    }
  }
  strCamera(st, dt);
  for (let i = st.fx.length - 1; i >= 0; i--) { const q = st.fx[i]; if ((q.life -= dt) <= 0) { st.fx.splice(i, 1); continue; } q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 5; }
  strMirror(st);
}
function strRacer(st, D, dt, live) {
  const p = G.players[D.k], i = p.input, ground = STR.laneY[D.lane];
  if (D.popT > 0) D.popT -= dt;
  if (D.cheer > 0) D.cheer = Math.max(0, D.cheer - dt * 0.3);
  if (D.done || st.res) {
    // past the line (or the round is decided): stroll on and wave
    D.v = approach(D.v, D.done ? 120 : 0, 300 * dt); D.x += D.v * dt; D.a = approach(D.a, 0.05, dt); D.av = 0;
    if (D.v > 5) D.step += D.v * dt / STR.stride;
    D.hopY = Math.max(0, D.hopY - 200 * dt); p.pendingAct = false; p.pendingJump = false;
    return;
  }
  if (!live) { p.pendingAct = false; p.pendingJump = false; return; }
  if (D.st === 'fall') {
    D.fallT -= dt; D.v = approach(D.v, 0, 600 * dt); D.x += D.v * dt;
    p.pendingAct = false; p.pendingJump = false;
    if (D.fallT <= 0) { D.st = 'walk'; D.a = 0.02; D.av = 0; D.v = 0; strPop(D, 'Back up!', '#d9ffd0'); Sfx.play('stiltraceUp', D.k); }
    return;
  }
  // presses
  if (D.cd > 0) D.cd -= dt;
  if (D.steadyT > 0) D.steadyT -= dt;
  if (p.pendingAct) { p.pendingAct = false; if (D.cd <= 0) { D.steadyT = STR.steadyT; D.cd = STR.steadyCd; Sfx.play('stiltraceSteady', D.k); st.stat.steadies[D.k]++; } }
  if (p.pendingJump) { p.pendingJump = false; if (D.hopY <= 0 && D.hopV <= 0) { D.hopV = STR.hopV; Sfx.play('stiltraceHop', D.k); } }
  D.duck = !!i.down && D.hopY <= 0;
  if (D.hopY > 0 || D.hopV > 0) { D.hopY += D.hopV * dt; D.hopV -= STR.hopG * dt; if (D.hopY <= 0) { D.hopY = 0; D.hopV = 0; D.av += 0.12; Sfx.play('stiltraceStep', D.k); } }
  // the wobble
  D.slip = st.course.obs.some(o => o.k === 's' && D.x > o.x && D.x < o.x + o.w);
  const tipK = STR.tip * (D.gold ? STR.goldTip : 1) * (D.slip ? STR.slip : 1);
  const dir = (i.right ? 1 : 0) - (i.left ? 1 : 0);
  const damp = STR.damp * (D.steadyT > 0 ? STR.steadyDamp : 1);
  D.av += (tipK * Math.sin(D.a) + dir * STR.push - damp * D.av) * dt;
  if (D.steadyT > 0) D.a = approach(D.a, clamp(D.a, -0.1, 0.45), dt * 0.6);
  D.a += D.av * dt;
  // speed from the lean
  const vTop = STR.vMax + (D.gold >= 2 ? STR.goldV : 0);
  const want = D.a >= 0 ? STR.vMin + (vTop - STR.vMin) * clamp(D.a / STR.green, 0, 1) : STR.vMin * clamp(1 + D.a / 0.3, 0, 1);
  D.v = approach(D.v, want, 700 * dt);
  const x0 = D.x;
  D.x += D.v * dt;
  // strides jolt the balance (not in the air)
  const s0 = Math.floor(D.step);
  D.step += (D.x - x0) / STR.stride;
  if (Math.floor(D.step) !== s0 && D.hopY <= 0) {
    const j = STR.jolt + STR.joltV * D.v / STR.vMax;
    D.av += (MODES.stiltrace.rand() - 0.42) * 2 * j * (D.slip ? 1.6 : 1);
    Sfx.play('stiltraceStep', D.k);
  }
  // obstacles
  for (const o of st.course.obs) {
    if (o.k === 's' || D.hit[o.x]) continue;
    if (D.x >= o.x - 6 && x0 < o.x + 6) {
      D.hit[o.x] = true;
      if (o.k === 'b') {
        if (D.duck) { strPop(D, 'Ducked!', '#d9ffd0'); continue; }
        D.av -= 1.6; D.v *= 0.5; st.stat.bonks[D.k]++; Sfx.play('stiltraceBonk', D.k);
        strPop(D, 'Bonk!', '#ffe7a8');
      } else {
        if (D.hopY > 14) { strPop(D, 'Hup!', '#d9ffd0'); st.stat.hops[D.k]++; continue; }
        D.av += 1.25; st.stat.trips[D.k]++; Sfx.play('stiltraceTrip', D.k);
        strPop(D, o.k === 'd' ? 'Quack! Trip!' : 'Trip!', '#ffe7a8');
        for (let n = 0; n < 6; n++) strFx(st, o.x, ground - 10, (strVR() - 0.5) * 160, -100 - strVR() * 120, 0.7, o.k === 'd' ? '#ffffff' : '#fff6c0', 3, 600);
      }
    }
  }
  // topple
  if (D.a > STR.maxFwd || D.a < STR.maxBack) {
    D.st = 'fall'; D.fallT = STR.fallT; D.hopY = 0; D.hopV = 0; D.fallDir = D.a > 0 ? 1 : -1; D.av = 0; st.stat.topples[D.k]++;
    Sfx.play('stiltraceTopple', D.k);
    strPop(D, 'Whoa! Topple!', '#ffffff');
    for (let n = 0; n < 8; n++) strFx(st, D.x + D.fallDir * 60, ground - 6, (strVR() - 0.5) * 140, -40 - strVR() * 80, 0.6, 'rgba(230,200,140,0.9)', 4, 300);
  }
}
function strCamera(st, dt, snap) {
  const [A, B] = st.pl, lead = A.x >= B.x ? A : B, trail = lead === A ? B : A;
  let tx = lead.x - W * STR.camLead;
  tx = Math.min(tx, trail.x - STR.camTrail);
  // the trailer is a whole screen behind: a gold tailwind pulls them along
  const gap = lead.x - trail.x, live = st.pl.every(D => !D.done) && !st.res;
  trail.tail = false;
  if (live && gap > W - 220) { trail.x = lead.x - (W - 220); trail.tail = true; tx = trail.x - STR.camTrail; if (!trail.tailSaid) { trail.tailSaid = true; strPop(trail, 'Gold tailwind!', C.gold); } }
  tx = Math.max(-120, tx);
  if (snap || !st.cam) st.cam = { x: tx };
  else st.cam.x += (tx - st.cam.x) * Math.min(1, dt * 4);
}
function strMirror(st) {
  for (const D of st.pl) {
    const p = G.players[D.k], ground = STR.laneY[D.lane];
    p.x = D.x - st.cam.x - p.w / 2; p.y = ground - STR.height - D.hopY - p.h - 10;
  }
}

MODES.stiltrace = {
  rand() { return Math.random(); },
  setup(st, L) {
    for (const row of L.grid) row.fill('.');
    st.stat = { wins: [0, 0], topples: [0, 0], trips: [0, 0], bonks: [0, 0], hops: [0, 0], steadies: [0, 0], fast: [Infinity, Infinity] };
    st.forceCourse = this.testCourse != null ? this.testCourse : null;
    st.noHelp = !!this.testNoHelp;
    st.t = 0; st.rt = 0; st.fx = [];
  },
  resetRound(n, info) {
    const st = G.mst;
    strNewRound(st, n, info, () => this.rand());
    strCamera(st, 0, true);
    for (const p of G.players) Object.assign(p, { alive: false, respawnT: Infinity });
    G.particles.length = 0;
    strMirror(st);
  },
  go() {
    const st = G.mst;
    st.ph = 'race'; st.rt = 0;
    for (const D of st.pl) if (D.gold) strPop(D, D.gold >= 2 ? 'Gold balance + gold stilts!' : 'Gold balance!', C.gold);
  },
  step(dt) { strTick(G.mst, dt, true); },
  idle(dt) {
    const st = G.mst, m = G.match; if (!st.pl) return;
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
    if (m && (m.phase === 'end' || m.phase === 'over')) { strTick(st, dt, false); return; }
    st.t += dt;
    for (const D of st.pl) D.a = 0.02 + Math.sin(st.t * 3 + D.k) * 0.03;
    strCamera(st, dt); strMirror(st);
  },
  timeUp() {
    const st = G.mst, [A, B] = st.pl, d = A.x - B.x;
    st.res = { winner: -1 };
    if (Math.abs(d) < STR.timeTie) return { winner: -1, reason: 'Time! Stilt and stilt!' };
    const w = d > 0 ? 0 : 1;
    st.res = { winner: w }; st.stat.wins[w]++; st.pl[w].cheer = 1;
    return { winner: w, reason: 'Time! Strode the farthest!' };
  },
  tiebreak() {
    const t = G.mst.stat.topples;
    if (t[0] !== t[1]) return { winner: t[0] < t[1] ? 0 : 1, reason: 'Fewer topples this match!' };
    return -1;
  },
  draw() { strDrawWorld(); },
  drawTop() { strDrawTop(); },
  hud() { strHud(); },
  stats() {
    const s = G.mst.stat;
    if (!s) return [];
    const out = [
      { label: 'Rounds won', values: (G.match ? G.match.wins : s.wins).slice() },
      { label: 'Topples', values: s.topples.slice() },
      { label: 'Hops', values: s.hops.slice() },
      { label: 'Trips & bonks', values: [s.trips[0] + s.bonks[0], s.trips[1] + s.bonks[1]] },
    ];
    const t = s.topples;
    out.push(t[0] === t[1] ? '★ Steady legs: Pip and Bo, ' + t[0] + ' topples each!' : '★ Steadiest stilts: ' + NAMES[t[0] < t[1] ? 0 : 1] + ' (' + Math.min(t[0], t[1]) + ' topples)');
    return out;
  },
  test: { STR, STR_COURSES, build: strBuildCourse },
};

/* ---------- drawing ---------- */
function strDrawWorld() {
  const st = G.mst; if (!st.pl || !st.course) return;
  const cx = st.cam.x, t = G.clock, night = st.round >= 5;
  const g = ctx.createLinearGradient(0, 0, 0, 400);
  g.addColorStop(0, night ? '#1a1640' : '#4a3a90'); g.addColorStop(1, night ? '#7a3a6a' : '#ffa080');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(255,255,240,' + (0.4 + 0.4 * Math.sin(t * 2 + i)) + ')'; circle((i * 137) % W, 20 + (i * 53) % 140, 1.4); ctx.fill(); }
  // the moon, and a dim line of far trees and roofs
  ctx.fillStyle = 'rgba(255,240,220,0.18)'; circle(W * 0.16, 92, 46); ctx.fill();
  ctx.fillStyle = night ? '#fff4d8' : 'rgba(255,244,216,0.75)'; circle(W * 0.16, 92, 26); ctx.fill();
  ctx.fillStyle = 'rgba(220,200,180,0.35)'; circle(W * 0.16 + 7, 86, 5); ctx.fill(); circle(W * 0.16 - 8, 100, 3.5); ctx.fill();
  { const sk = cx * 0.08; ctx.fillStyle = night ? '#3a2a5a' : '#7a4a7a';
    ctx.beginPath(); ctx.moveTo(0, 330);
    for (let x = -20; x <= W + 20; x += 20) { const n = Math.floor((x + sk) / 20), hh = hash(n, 5); ctx.lineTo(x - (sk % 20), 262 - (hh % 4 === 0 ? 26 + hh % 20 : 6 + Math.abs(Math.sin(n * 0.6)) * 14)); }
    ctx.lineTo(W, 330); ctx.closePath(); ctx.fill(); }
  // far: tents and a ferris wheel
  const far = cx * 0.2;
  for (let i = -1; i < 5; i++) { const n = Math.floor(far / 380) + i, x = n * 380 - far + 120; K26tent(x, 330, n); }
  // booths and lights (mid)
  const mid = cx * 0.5;
  ctx.fillStyle = '#3a2048'; ctx.fillRect(0, 300, W, 40);
  ctx.fillStyle = 'rgba(255,200,160,0.12)'; ctx.fillRect(0, 300, W, 2);
  for (let i = -1; i < 6; i++) {
    const n = Math.floor(mid / 260) + i, x = n * 260 - mid, k = ((n % 4) + 4) % 4, c = ['#ff5f6d', '#5b95ff', '#ffc53d', '#8fe3b0'][k];
    // a lit stall (a picture drawn once per kind) and its string of bulbs
    CIRCUS.blit(strStall(k), x, 236, 160, 96);
    for (let b = 0; b < 6; b++) { const on = (b + n + Math.floor(t * 2)) % 3 !== 0; if (on) { ctx.fillStyle = 'rgba(255,240,170,0.25)'; circle(x + 30 + b * 20, 244, 5); ctx.fill(); } ctx.fillStyle = on ? '#fff2b0' : '#a88050'; circle(x + 30 + b * 20, 244, 2.2); ctx.fill(); }
  }
  CIRCUS.bunting(-20, 200, W + 20, 215, 14, 28);
  // the midway path: two raked sawdust lanes with chalk edges on packed dirt (pebbles, straw, popcorn, stilt prints),
  // one picture repeating every 480 px
  CIRCUS.strip(strTrackPic(), 480, H - 330, cx, 330);
  ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
  // start and finish
  for (const [x, lab] of [[0, 'START'], [st.course.len, 'FINISH']]) {
    ctx.fillStyle = '#ffffff'; for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? '#2a2a3a' : '#ffffff'; ctx.fillRect(x - 4, 340 + k * 20, 8, 20); }
    if (lab === 'FINISH') {
      for (const px of [x - 90, x + 82]) {
        ctx.fillStyle = 'rgba(20,10,30,0.25)'; ctx.beginPath(); ctx.ellipse(px + 5, 480, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
        CIRCUS.post(px, 120, 8, 360, '#d8c0a0');
        for (let k = 0; k < 6; k++) { ctx.fillStyle = '#e8443a'; ctx.fillRect(px, 160 + k * 52, 8, 10); ctx.fillStyle = '#a02838'; ctx.fillRect(px + 5, 160 + k * 52, 3, 10); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(px, 160 + k * 52, 8, 1.2); }
        ctx.fillStyle = '#5a4a5a'; ctx.fillRect(px - 3, 468, 14, 12); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(px - 3, 468, 14, 1.5);
        for (const bx of [px - 0.5, px + 8.5]) { ctx.fillStyle = '#b8b8c8'; circle(bx, 474, 1.3); ctx.fill(); }
      }
      ctx.fillStyle = 'rgba(20,10,30,0.25)'; rr(x - 93, 114, 192, 40, 10); ctx.fill();
      ctx.fillStyle = C.gold; rr(x - 96, 110, 192, 40, 10); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(x - 92, 112, 184, 6, 3); ctx.fill();
      ctx.strokeStyle = '#a8781a'; ctx.lineWidth = 2; rr(x - 96, 110, 192, 40, 10); ctx.stroke();
      for (let k = 0; k < 9; k++) { ctx.fillStyle = (k + Math.floor(t * 4)) % 2 ? '#fff2b0' : '#ff8a5a'; circle(x - 84 + k * 21, 106, 3); ctx.fill(); }
      text('FINISH', x, 131, 24, '#3a2048', 'center');
    } else text(lab, x, 336, 14, '#ffffff', 'center', 'body');
  }
  // obstacles in each lane (back lane first)
  for (const lane of [0, 1]) for (const o of st.course.obs) if (o.x > cx - 220 && o.x < cx + W + 220) strDrawOb(o, STR.laneY[lane], lane, t);
  ctx.restore();
}
// the track picture (480 x H - 330 from y 330)
function strTrackPic() {
  const K = CIRCUS;
  return K.pic('w26stilt', 480, H - 330, c => {
    const w = 480, h = H - 330;
    K.dirtTile(c, w, 0, h, { base: '#c9a46a', ruts: [], steps: 0, tickets: true, seed: 9, pebbleEvery: 2000, popEvery: 7000 });
    const g = c.createLinearGradient(0, 0, 0, 10); g.addColorStop(0, 'rgba(20,10,30,0.3)'); g.addColorStop(1, 'rgba(20,10,30,0)'); c.fillStyle = g; c.fillRect(0, 0, w, 10);
    for (const ly of STR.laneY) {
      const y0 = ly - 14 - 330;
      // the raked lane: smoother pale sawdust with fine rake lines, a lit top and a shaded lower lip
      c.fillStyle = '#d9b47a'; c.fillRect(0, y0, w, 22);
      for (let k = 0; k < 5; k++) { c.strokeStyle = k % 2 ? 'rgba(255,248,220,0.35)' : 'rgba(150,100,50,0.22)'; c.lineWidth = 0.8; c.beginPath(); for (let x = 0; x <= w; x += 12) { const yy = y0 + 4 + k * 3.6 + Math.sin(x / w * Math.PI * 6 + k) * 0.6; x ? c.lineTo(x, yy) : c.moveTo(x, yy); } c.stroke(); }
      for (let i = 0; i < 140; i++) { const hh = hash(i + ly, 91), x = hh % w, y = y0 + 2 + (hh >>> 9) % 18; c.fillStyle = hh % 2 ? 'rgba(255,246,214,0.6)' : 'rgba(160,110,60,0.45)'; c.fillRect(x, y, 1.6, 0.9); }
      // stilt prints: little round dents in pairs along the lane
      for (let x = 10; x < w; x += 46) { const hh = hash(x, ly); c.fillStyle = 'rgba(110,70,30,0.25)'; c.beginPath(); c.ellipse(x + hh % 8, y0 + 9 + (hh >>> 4) % 3, 2.6, 1.2, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(x + 20 + hh % 6, y0 + 13 - (hh >>> 6) % 3, 2.6, 1.2, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,250,230,0.3)'; c.fillRect(x + hh % 8 - 2, y0 + 10.6 + (hh >>> 4) % 3, 4, 0.7); }
      c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(0, y0, w, 2);
      c.fillStyle = 'rgba(120,80,40,0.3)'; c.fillRect(0, y0 + 20, w, 2);
      // chalk edge lines, a little uneven
      for (const ey of [y0 - 2, y0 + 23]) { c.strokeStyle = 'rgba(255,252,240,0.55)'; c.lineWidth = 1.4; c.setLineDash([22, 5, 9, 4]); c.beginPath(); c.moveTo(0, ey); for (let x = 0; x <= w; x += 16) c.lineTo(x, ey + Math.sin(x * 0.07 + ly) * 0.5); c.stroke(); c.setLineDash([]); }
    }
  });
}
// a stall: wooden counter, striped awning with scallops and a glowing sign, drawn once per kind into a picture
// (160 x 96, from the stall's left edge and y 236)
const _strStalls = {};
function strStall(k) {
  const sc = Math.max(1, Math.min(3, canvas.width / W)), key = k + '|' + sc;
  if (_strStalls[key]) return _strStalls[key];
  const cv = document.createElement('canvas'); cv.width = Math.ceil(160 * sc); cv.height = Math.ceil(96 * sc);
  const c = cv.getContext('2d'); c.scale(sc, sc); c.translate(0, -236);
  const x = 0, col = ['#ff5f6d', '#5b95ff', '#ffc53d', '#8fe3b0'][k];
  c.fillStyle = 'rgba(20,10,30,0.3)'; c.beginPath(); c.ellipse(x + 80, 322, 70, 5, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#6a3a3a'; c.fillRect(x + 24, 262, 112, 58);
  // (art pass 2) plank walls with grain, a warm-lit inside with goods on a shelf each side of the sign, corner posts,
  // a painted counter with a lit lip and nail heads, and an awning with folds, a dark hem and a pole
  c.fillStyle = 'rgba(30,10,14,0.35)'; for (let px = x + 38; px < x + 124; px += 14) c.fillRect(px, 262, 1.2, 42);
  c.strokeStyle = 'rgba(30,10,14,0.25)'; c.lineWidth = 0.7; c.beginPath(); for (let px = x + 30; px < x + 124; px += 14) { const q = hash(px, k + 9); c.moveTo(px + q % 4, 264); c.bezierCurveTo(px + 2, 278, px - 1, 290, px + 1 + q % 3, 302); } c.stroke();
  { const gg = c.createLinearGradient(0, 270, 0, 306); gg.addColorStop(0, 'rgba(255,220,150,0.08)'); gg.addColorStop(1, 'rgba(255,220,150,0.42)'); c.fillStyle = gg; c.fillRect(x + 32, 270, 96, 36); }
  c.fillStyle = '#4a2424'; c.fillRect(x + 32, 286, 96, 2.5); c.fillStyle = 'rgba(255,230,180,0.3)'; c.fillRect(x + 32, 286, 96, 0.8);
  for (const gx of [x + 38, x + 46, x + 114, x + 122]) {
    if (k === 0) { c.fillStyle = '#fff4e6'; c.fillRect(gx - 3, 278, 6, 8); c.fillStyle = '#ff5f6d'; c.fillRect(gx - 1, 278, 2, 8); c.fillStyle = '#fff2b0'; circleOn(c, gx - 1.5, 277, 1.8); c.fill(); circleOn(c, gx + 1.5, 276.5, 1.8); c.fill(); }
    else if (k === 1) { c.fillStyle = ['#ffd36b', '#9fe8ff', '#ff9fd0'][Math.round(gx) % 3]; circleOn(c, gx, 282.5, 3.5); c.fill(); c.fillStyle = 'rgba(255,255,255,0.6)'; circleOn(c, gx - 1.2, 281.3, 1); c.fill(); }
    else if (k === 2) { c.fillStyle = '#c88a5a'; circleOn(c, gx, 282, 3.5); c.fill(); circleOn(c, gx - 2.6, 278.6, 1.5); c.fill(); circleOn(c, gx + 2.6, 278.6, 1.5); c.fill(); c.fillStyle = '#3a2048'; c.fillRect(gx - 1.6, 281, 1, 1); c.fillRect(gx + 0.6, 281, 1, 1); }
    else { c.fillStyle = 'rgba(255,240,150,0.85)'; c.fillRect(gx - 2.5, 278, 5, 8); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(gx - 2, 278.5, 1, 6); c.fillStyle = '#8fe3b0'; c.fillRect(gx - 2.5, 278, 5, 1.2); }
  }
  c.fillStyle = '#8a5038'; c.fillRect(x + 22, 304, 116, 16);
  c.fillStyle = col; c.fillRect(x + 26, 309, 108, 6); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(x + 26, 309, 108, 1);
  c.fillStyle = '#fff4e6'; for (let d = 0; d < 9; d++) { c.beginPath(); c.moveTo(x + 30 + d * 12, 315); c.lineTo(x + 34 + d * 12, 309); c.lineTo(x + 37 + d * 12, 309); c.lineTo(x + 33 + d * 12, 315); c.closePath(); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x + 22, 304, 116, 2);
  c.fillStyle = 'rgba(30,10,14,0.35)'; c.fillRect(x + 22, 318, 116, 2);
  c.fillStyle = '#3a2a2a'; for (const nx of [x + 25, x + 135]) for (const ny of [307, 317]) { circleOn(c, nx, ny, 0.9); c.fill(); }
  c.strokeStyle = '#3a1c1c'; c.lineWidth = 1.2; c.strokeRect(x + 22.5, 304.5, 115, 15);
  c.fillStyle = '#5a2c2c'; c.fillRect(x + 124, 262, 12, 42);
  for (const px of [x + 22, x + 134]) { c.fillStyle = '#4a2424'; c.fillRect(px, 246, 4, 58); c.fillStyle = 'rgba(255,220,190,0.3)'; c.fillRect(px, 246, 1.1, 58); }
  for (let s = 0; s < 6; s++) { c.fillStyle = s % 2 ? '#fff4e6' : col; c.fillRect(x + 18 + s * 21, 246, 21, 18); c.beginPath(); c.arc(x + 28.5 + s * 21, 264, 10.5, 0, Math.PI); c.fill(); }
  for (let s = 0; s < 6; s++) { c.fillStyle = 'rgba(20,10,30,0.12)'; c.fillRect(x + 31 + s * 21, 247, 8, 17); c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(x + 19 + s * 21, 247, 4, 17); }
  c.strokeStyle = shade(col, 0.5); c.lineWidth = 1; c.beginPath(); for (let s = 0; s < 6; s++) { c.moveTo(x + 39 + s * 21, 264); c.arc(x + 28.5 + s * 21, 264, 10.5, 0, Math.PI); } c.stroke();
  c.fillStyle = 'rgba(20,10,30,0.18)'; c.fillRect(x + 81, 246, 63, 18);
  c.strokeStyle = shade(col, 0.45); c.lineWidth = 1.5; c.strokeRect(x + 18, 246, 126, 18);
  c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(x + 18, 246, 126, 1.5);
  c.fillStyle = '#c9a050'; c.fillRect(x + 15, 243, 132, 3); c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(x + 15, 243, 132, 0.8);
  const lab = ['POPCORN', 'GAMES', 'PRIZES', 'LEMONADE'][k];
  c.font = CIRCUS.FONT(12); const sw = c.measureText(lab).width + 18;
  c.fillStyle = shade(col, 0.4); rrOn(c, x + 80 - sw / 2, 278, sw, 22, 6); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.92)'; rrOn(c, x + 80 - sw / 2 + 2, 280, sw - 4, 18, 5); c.fill();
  c.font = '700 12px "Atkinson Hyperlegible", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#3a2048'; c.fillText(lab, x + 80, 289.5);
  // keep the picture only once the fonts are in, so the sign is never drawn in a stand-in font
  if (!document.fonts || document.fonts.status === 'loaded') _strStalls[key] = cv;
  return cv;
}
// a striped paper popcorn box heaped with shaded kernels (36 x 48 from (x - 18, y - 44); the box is 26 wide, 30 tall)
function strPopPic() {
  return CIRCUS.pic('w26popbox', 36, 48, c => {
    c.translate(18, 44);
    c.fillStyle = 'rgba(40,20,30,0.22)'; c.beginPath(); c.ellipse(2, 0, 16, 4, 0, 0, Math.PI * 2); c.fill();
    // kernels heaped over the rim (back ones darker), each with a butter-yellow middle
    const ks = [[-9, -33, 4.2], [-3, -37, 4.4], [3, -35, 4.3], [9, -32, 4], [-6, -30, 4], [6, -30, 4.1], [0, -31, 4.2], [-11, -29, 3.4], [11, -28, 3.4], [-1, -40, 3.6]];
    for (const [dx, dy, r] of ks) {
      c.fillStyle = '#e8d8a8'; c.beginPath(); c.arc(dx + 0.8, dy + 0.8, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff8dc'; for (const [ax, ay, q] of [[-0.35, -0.2, 0.62], [0.4, -0.3, 0.55], [0, 0.35, 0.58]]) { c.beginPath(); c.arc(dx + ax * r, dy + ay * r, r * q, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#f2c860'; c.beginPath(); c.arc(dx + 0.6, dy + 0.9, r * 0.28, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(dx - r * 0.35, dy - r * 0.4, r * 0.18, 0, Math.PI * 2); c.fill();
    }
    // the box: red and white stripes, a shaded right side, a folded rim and a gold star label
    c.save(); c.beginPath(); c.moveTo(-13, -30); c.lineTo(13, -30); c.lineTo(10, 0); c.lineTo(-10, 0); c.closePath(); c.clip();
    c.fillStyle = '#ff5f6d'; c.fillRect(-14, -31, 28, 32);
    c.fillStyle = '#ffffff'; for (const sx of [-8, -1, 6]) { c.beginPath(); c.moveTo(sx - 0.6, -31); c.lineTo(sx + 3.6, -31); c.lineTo(sx + 3, 1); c.lineTo(sx - 0.2, 1); c.closePath(); c.fill(); }
    c.fillStyle = 'rgba(60,10,30,0.22)'; c.fillRect(4, -31, 10, 32);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(-12, -31, 1.5, 32);
    c.restore();
    c.fillStyle = '#e8443a'; c.fillRect(-14, -31, 28, 3); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(-14, -31, 28, 1);
    c.fillStyle = '#ffc53d'; c.beginPath(); c.arc(0, -15, 5.5, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#b8801a'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#b8801a'; c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 1.5 : 3.4; c.lineTo(Math.cos(a) * r, -15 + Math.sin(a) * r); } c.closePath(); c.fill();
    c.strokeStyle = '#a02838'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-13, -30); c.lineTo(13, -30); c.lineTo(10, 0); c.lineTo(-10, 0); c.closePath(); c.stroke();
  });
}
function K26tent(x, y, n) { CIRCUS.tent(x, y, 220, 160, n % 2 ? ['#5b3a8a', '#e8d8f0'] : ['#8a2a3a', '#f0d8d0']); }
function strDrawOb(o, y, lane, t) {
  if (o.k === 's') {
    // a slippery lemonade spill: a puddle with a darker rim, ripples, glints and a tipped paper cup
    const cx = o.x + o.w / 2, rw = o.w / 2;
    ctx.fillStyle = 'rgba(200,170,40,0.55)'; ctx.beginPath(); ctx.ellipse(cx + 1, y - 1, rw + 1, 8.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,120,0.85)'; ctx.beginPath(); ctx.ellipse(cx, y - 2, rw, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,120,0.85)'; for (const [dx, r] of [[-rw - 4, 2.6], [rw + 3, 2], [rw * 0.4, 2.2]]) { circle(cx + dx, y - 1 + (dx > 0 ? 2 : -1), r); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1; const rp = reduceMotion ? 0.5 : (t * 0.8 + o.x * 0.01) % 1;
    ctx.beginPath(); ctx.ellipse(cx + rw * 0.2, y - 2, rw * (0.3 + rp * 0.5), 2.5 + rp * 3, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(cx - rw * 0.45, y - 5, 5, 1.4, -0.1, 0, Math.PI * 2); ctx.fill(); circle(cx + rw * 0.55, y - 4, 1.2); ctx.fill();
    ctx.save(); ctx.translate(cx - rw - 2, y - 5); ctx.rotate(-1.35);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(5, -7); ctx.lineTo(3.5, 6); ctx.lineTo(-3.5, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffc53d'; ctx.fillRect(-4.6, -3, 9, 3); ctx.fillStyle = 'rgba(40,20,30,0.18)'; ctx.fillRect(1, -7, 4, 13);
    ctx.strokeStyle = '#b89a60'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(5, -7); ctx.lineTo(3.5, 6); ctx.lineTo(-3.5, 6); ctx.closePath(); ctx.stroke();
    ctx.restore();
    return;
  }
  if (o.k === 'p') { CIRCUS.blit(strPopPic(), o.x - 18, y - 44, 36, 48); return; }
  if (o.k === 'd') {
    const bob = Math.abs(Math.sin(t * 6 + o.x)) * 3;
    ctx.fillStyle = 'rgba(40,20,30,0.2)'; ctx.beginPath(); ctx.ellipse(o.x - 2, y, 14, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b820'; ctx.beginPath(); ctx.ellipse(o.x + 1, y - 9 - bob, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.ellipse(o.x, y - 10 - bob, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
    circle(o.x - 9, y - 22 - bob, 7); ctx.fill();
    ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.moveTo(o.x - 15, y - 22 - bob); ctx.lineTo(o.x - 22, y - 20 - bob); ctx.lineTo(o.x - 15, y - 18 - bob); ctx.fill();
    ctx.fillStyle = C.ink; circle(o.x - 10, y - 24 - bob, 1.4); ctx.fill();
    return;
  }
  if (o.k === 'b') {
    // low bunting at head height on stilts, on two poles
    const top = y - STR.height - 40;
    for (const px of [o.x - 30, o.x + 26]) {
      ctx.fillStyle = 'rgba(40,20,30,0.2)'; ctx.beginPath(); ctx.ellipse(px + 2.5, y, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      CIRCUS.post(px, top - 10, 5, y - top + 10, '#d8c0a0');
      ctx.fillStyle = '#e8443a'; for (let k = top; k < y - 6; k += 30) ctx.fillRect(px, k, 5, 4);
      ctx.fillStyle = '#6a5a4a'; ctx.fillRect(px - 1.5, y - 6, 8, 6); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(px - 1.5, y - 6, 8, 1);
      ctx.fillStyle = '#b8801a'; circle(px + 2.5, top - 11, 4); ctx.fill(); ctx.fillStyle = C.gold; circle(px + 2, top - 11.5, 3.2); ctx.fill(); ctx.fillStyle = '#fff4c0'; circle(px + 1.2, top - 12.6, 1.1); ctx.fill();
    }
    CIRCUS.bunting(o.x - 30, top, o.x + 30, top, 3, 4);
  }
}
function strDrawRacer(st, D) {
  const ground = STR.laneY[D.lane], x = D.x, id = D.k, t = G.clock;
  if (D.st !== 'fall') { ctx.fillStyle = 'rgba(40,20,30,' + (0.22 - Math.min(0.1, D.hopY * 0.004)) + ')'; ctx.beginPath(); ctx.ellipse(x, ground + 1, 18, 4, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.save(); ctx.translate(x, ground - D.hopY);
  if (D.st === 'fall') {
    // flopped over on the sawdust, stilts beside
    const u = clamp((STR.fallT - D.fallT) / 0.35, 0, 1), dir = D.fallDir || 1;
    ctx.rotate(dir * u * 1.35);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-6, -STR.height); ctx.moveTo(6, 0); ctx.lineTo(6, -STR.height); ctx.stroke();
    CIRCUS.hero(id, 0, -STR.height, { stun: true, face: dir });
    ctx.restore();
    return;
  }
  ctx.rotate(D.a);
  // stilts: two striped poles that stride
  const sw = Math.sin(D.step * Math.PI) * 10;
  for (const [k, off] of [[0, sw], [1, -sw]]) {
    ctx.save(); ctx.translate(0, -STR.height); ctx.rotate(off * 0.012);
    const sx0 = -4 + (k ? 5 : -5);
    ctx.fillStyle = PCOL[id]; ctx.fillRect(sx0, 0, 7, STR.height);
    ctx.fillStyle = '#ffffff'; for (let s = 8; s < STR.height; s += 16) ctx.fillRect(sx0, s, 7, 7);
    ctx.fillStyle = 'rgba(20,20,40,0.22)'; ctx.fillRect(sx0 + 4.5, 0, 2.5, STR.height);
    ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 1.2; ctx.strokeRect(sx0, 0, 7, STR.height);
    ctx.fillStyle = '#3a3a4a'; rr(sx0 - 1, STR.height - 5, 9, 6, 2); ctx.fill();
    ctx.restore();
  }
  // arms windmilling when steadying
  if (D.steadyT > 0) {
    const a = t * 22;
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 9, -STR.height - 16); ctx.lineTo(s * 9 + Math.cos(a * s) * 18, -STR.height - 16 + Math.sin(a * s) * 18); ctx.stroke(); }
  }
  const sq = D.duck ? 0.72 : 1;
  CIRCUS.hero(id, 0, -STR.height, { face: 1, sy: sq, sx: D.duck ? 1.2 : 1 });
  ctx.restore();
}
function strDrawTop() {
  const st = G.mst; if (!st.pl || !st.course) return;
  const cx = st.cam.x;
  ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
  // back lane racer first
  const order = st.pl.slice().sort((a, b) => a.lane - b.lane);
  for (const D of order) strDrawRacer(st, D);
  for (const q of st.fx) { ctx.globalAlpha = clamp(q.life / q.max, 0, 1); ctx.fillStyle = q.col; circle(q.x, q.y, q.size); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.restore();
  for (const D of st.pl) if (D.pop && D.popT > 0) {
    const ground = STR.laneY[D.lane], x = clamp(D.x - cx, 100, W - 100), y = ground - STR.height - 70 - D.hopY - (1.2 - D.popT) * 20;
    ctx.globalAlpha = clamp(D.popT / 0.3, 0, 1);
    bigText(D.pop.text, x, Math.max(100, y), hudBig() ? 24 : 19, D.pop.col);
    ctx.globalAlpha = 1;
  }
}
function strHud() {
  const st = G.mst, m = G.match; if (!st.pl || !st.course || !m) return;
  const big = hudBig(), sz = big ? 1.4 : 1;
  for (const D of st.pl) {
    const left = D.k === 0, pw = 232 * sz, ph = 44 * sz, y = H - 6 - ph, x = left ? 10 : W - 10 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x, y, pw, ph, ph / 2); ctx.fill();
    if (D.gold || D.tail) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; rr(x, y, pw, ph, ph / 2); ctx.stroke(); }
    const nx = left ? x + 16 * sz : x + pw - 16 * sz;
    text(NAMES[D.k], nx, y + ph / 2 + 0.5, 18 * sz, PCOL[D.k], left ? 'left' : 'right');
    // the balance meter: back red, green middle, forward red; the needle is the lean
    const bw = 120 * sz, bh = 10 * sz, bx = left ? x + 56 * sz : x + pw - 56 * sz - bw, by = y + ph * 0.28;
    const f = a => bx + bw * clamp((a - STR.maxBack) / (STR.maxFwd - STR.maxBack), 0, 1);
    ctx.fillStyle = '#ff6a5a'; rr(bx, by, bw, bh, bh / 2); ctx.fill();
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(f(-0.3), by, f(0.62) - f(-0.3), bh);
    ctx.fillStyle = '#8fe3b0'; ctx.fillRect(f(0.2), by, f(STR.green) - f(0.2), bh);
    ctx.fillStyle = '#ffffff'; const nxp = f(D.a); ctx.fillRect(nxp - 2, by - 4, 4, bh + 8);
    let lab = '', col = 'rgba(246,239,223,0.85)';
    if (m.phase === 'ready' || m.phase === 'count' || m.phase === 'intro') lab = 'Ready...';
    else if (D.done || st.res) { const w = m.end ? m.end.winner : st.res ? st.res.winner : -2; lab = w === D.k ? 'Winner!' : 'Good race!'; }
    else if (D.st === 'fall') lab = 'Toppled! Climbing up...';
    else if (D.tail) { lab = 'Gold tailwind!'; col = C.gold; }
    else if (D.slip) { lab = 'Slippery!'; col = '#fff3a0'; }
    else if (D.a > 0.6) { lab = 'Too far! ◀'; col = '#ff9a8a'; }
    else if (D.a < -0.25) { lab = 'Lean forward ▶'; col = '#ffe7a8'; }
    else if (D.gold) { lab = 'Gold balance'; col = C.gold; }
    else lab = Math.round(D.v) + ' speed';
    text(lab, bx + bw / 2, y + ph * 0.72, 11 * sz, col, 'center', 'body');
    // the steady ring
    const rx = left ? x + pw - 20 * sz : x + 20 * sz, ry = y + ph / 2, r = 10 * sz;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 3; circle(rx, ry, r); ctx.stroke();
    const fill = D.cd > 0 ? 1 - D.cd / STR.steadyCd : 1;
    ctx.strokeStyle = fill >= 1 ? '#8fe3b0' : '#ffffff'; ctx.beginPath(); ctx.arc(rx, ry, r, -Math.PI / 2, -Math.PI / 2 + fill * Math.PI * 2); ctx.stroke();
  }
  // course progress at the bottom middle
  {
    const x0 = W / 2 - (big ? 100 : 180), x1 = W / 2 + (big ? 100 : 180), y = H - (big ? 36 : 24);
    ctx.fillStyle = 'rgba(28,26,54,0.7)'; rr(x0 - 14, y - 12, x1 - x0 + 28, 24, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; rr(x0, y - 2, x1 - x0, 4, 2); ctx.fill();
    for (const D of st.pl) { const px = x0 + (x1 - x0) * clamp(D.x / st.course.len, 0, 1); ctx.fillStyle = PCOL[D.k]; circle(px, y + (D.k ? 4 : -4), 6 * (big ? 1.2 : 1)); ctx.fill(); }
  }
  // the course name
  {
    const fs = big ? 17 : 13, h = big ? 32 : 26, y0 = 46, lab = st.course.name;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(lab).width + (big ? 34 : 28); pill(14, y0, w, h); text(lab, 14 + (big ? 17 : 14), y0 + h / 2 + 0.5, fs, C.gold, 'left', 'body');
  }
  // each person's keys early in rounds 1-2
  if (m.phase === 'live' && st.round <= 2 && st.rt < 7) {
    for (const D of st.pl) {
      if (strCpu(D.k)) continue;
      const kb = actKey(D.k), s = kb === 'pad' ? 'stick ◀ ▶ lean, ' + glyph('a') + ' hop, down duck' : kb === 'touch' ? '◀ ▶ lean, ▲ hop, ▼ duck, ● steady' : D.k === 0 ? 'A D lean, W hop, S duck, F steady' : '← → lean, ↑ hop, ↓ duck, / steady';
      const left = D.k === 0, cxp = left ? 10 + 116 * sz : W - 10 - 116 * sz, yy = H - 6 - 44 * sz - (big ? 26 : 18);
      ctx.font = '700 ' + (12 * sz) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = ctx.measureText(s).width + 20; ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(cxp - w / 2, yy - 11 * sz, w, 22 * sz, 11 * sz); ctx.fill();
      text(s, cxp, yy + 0.5, 12 * sz, PCOL[D.k], 'center', 'body');
    }
  }
}

/* ---------- sounds ---------- */
Sfx.extra.stiltraceStep = function (p) { this.tone(180 * p + Math.random() * 30, 0.04, 'triangle', 0.02, 140 * p); };
Sfx.extra.stiltraceHop = function (p) { this.tone(320 * p, 0.16, 'sine', 0.04, 620 * p); };
Sfx.extra.stiltraceSteady = function (p) { this.tone(500 * p, 0.12, 'triangle', 0.03, 700 * p); this.tone(700 * p, 0.12, 'triangle', 0.03, 500 * p, 0.12); };
Sfx.extra.stiltraceTrip = function (p) { this.tone(420 * p, 0.1, 'square', 0.03, 260 * p); };
Sfx.extra.stiltraceBonk = function (p) { this.tone(700 * p, 0.08, 'triangle', 0.04, 300 * p); };
Sfx.extra.stiltraceTopple = function (p) { this.tone(600 * p, 0.4, 'triangle', 0.045, 150 * p); this.tone(110, 0.18, 'sine', 0.06, 70, 0.35); };
Sfx.extra.stiltraceUp = function (p) { [392, 523].forEach((f, i) => this.tone(f * p, 0.08, 'triangle', 0.035, null, i * 0.07)); };
Sfx.extra.stiltraceFinish = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, i * 0.06)); };
