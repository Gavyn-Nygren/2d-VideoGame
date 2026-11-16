/* Pip & Bo - Level 12-2 Bobsled (team). */
'use strict';

/* ===== 12-2 Bobsled (mode 'bobsled', World 12 "Winter Games", teamwork) ======================================
   Pip and Bo ride ONE two-person bobsled down a twisting ice run, seen from just behind the sled (a "chase cam": the
   track is drawn in pseudo-3D by the mode itself; def.ownStep + def.ownHUD; the engine grid only holds the spawns).
   START: both push the sled down the start ramp with the action button (push) on the beat of a ticking beat marker.
     A push on the beat is strong, off the beat is weak, one push per beat each, and both on the same beat is a
     TOGETHER! bonus. In the gold hop zone each rider hops in with ▲. Anyone still out at the start line scrambles in
     ("Hop in!") and the sled loses speed. The run clock starts at GO.
   RUN: every curve needs BOTH riders to lean its way (◀ or ▶), held steady (taps and ◀▶ flip-flops don't count).
     Both = a smooth banked line, and a smooth curve gives a short speed boost. One = a wobble: the sled slows and
     climbs the outer wall. Nobody, or a wrong-way lean = it climbs fast. At the lip it stops ("Whoa!") until both lean
     the right way and it slides back down. A curve nobody leaned together in can't be left (the sled waits on the lip
     at its end), so one rider alone (or with an idle or button-mashing partner) can never finish a run. S-bends show
     "Flip" just before the switch, and a lean either way is fine for a moment around it. Nothing ever crashes.
   Jobs (swap every run): the PILOT (front seat) steers on the straights to fly through snow-gate rings (a 3 s speed
     boost, worth about half a second each) and sees the next curve early in their badge; their action CALLs it out
     ("RIGHT!"), which also shows it in the brakeman's badge. The BRAKEMAN (back seat) holds the action from the first
     red BRAKE board to slow to hairpin speed. From the second board the sled can't speed up, so braking at the first
     board is the quickest safe way in; a bit fast = a wobble up the wall, too fast = up on the lip, nearly stopped,
     then a slow climb back to speed in the flat hairpin (about 3-4 s lost).
   Both: hold ▼ in TUCK zones (both tucked = fastest), and press ▲ together just before a jump bump (Big air!).
   Gold help (announced): after 4 wobbly curves in a run (or 4 s stuck on the lip), LUCKY RAILS: a lean held for a
     moment counts for 0.9 s after you let go, the sled climbs slower, and the hop window is wider. It still needs both
     riders, and taps never count as a lean.
   10 s with no press from one rider pauses the sled ("Brrr!") until they press something.
   4 runs (rooms); the official time is the sum of the four run times; medal by that total (MODES.bobsled.medals).
   Room def: { title, tip, pilot: 0|1, par (s, a clean run), course: [tokens], act }. Course tokens (lengths in m):
     sN straight · lN / rN curve · LN / RN big curve · hl / hr hairpin (75 m, BRAKE boards before it)
     zlr / zrl S-bend (two quick curves, the lean flips) · tN tuck zone · j jump bump · o<u> a snow-gate ring at
     lateral u (-0.8..0.8, 0 = middle) · F the finish line
   Medal (MODES.bobsled.medals): the summed run times against the summed room pars (a perfect pair), and the Whoas
   (K.goldX and friends).
   Only MODES.bobsled and Sfx.extra.bobsled* are visible outside this block; MODES.bobsled.api has helpers for the
   computer brain and bot tests. All state lives in G.mst. */
{
  const BOB = {
    SEG: 3, drawN: 92, near: 0.35,              // track segment length (m), segments drawn, near clip (m)
    floorW: 1.2, wallR: 1.0, wallA: 1.38,        // floor half-width, wall radius, wall angle at the lip (rad)
    camH: 1.5, camBack: 7.5, D: 1100, hor: 158,  // the chase camera
    sledRear: 1.25, runS: 0.62,                  // the sled's back end, behind its centre (m); runners' size (cartoon)
    curv: 0.065,                                 // how hard a curve of strength 1 bends on screen
    // speeds (m/s; 27 m/s = 97 km/h)
    cruise: 27, tuckBoth: 33, tuckOne: 29.5, gAcc: 3.6, drag: 2.2,
    // the push start
    rampLen: 54, hopLen: 15, beat: 0.5, beatWin: 0.12, pushK: 1.7, pushMax: 12.5, pushOff: 0.4, together: 0.7,
    rampAcc: 0.45, lateKeep: 0.7, readyT: 1.0,
    // curves
    latch: 0.22, latchLucky: 0.9, settle: 0.12, smoothBad: 0.3, smoothBadLucky: 0.6,
    uSettle: 2.4, uRiseOne: 1.05, uRiseNone: 1.8, luckyRise: 0.55,
    decOne: 7.5, decNone: 11, lipU: 1.9, lipDec: 16, needGood: 0.15, whoaU: 1.62, smoothBoost: 3.5, smoothT: 1.5,
    steer: 1.35, steerMax: 0.88,
    // hairpins, bumps, rings, tuck
    // hairpins: BRAKE boards at brakeSign and hpZone m before. From the 2nd board the sled can't speed up past hpMax
    // (and slows a little by itself), so braking from the 1st board is the quickest safe way in. A bit fast = a wobble
    // up the wall; too fast = up on the lip, nearly stopped (it waits for both leans), then a slow climb back to speed.
    hpMax: 16.5, hpTol: 1.5, hpBit: 2.5, hpZoneDec: 5, brakeDec: 14, brakeMin: 8, brakeSign: 55, hpZone: 26, hpPre: 30, hpPreDec: 4, vMax: 38, hpAcc: 2.2, tooFastV: 2.5, bitFastKeep: 0.7,
    hopWin: 0.75, hopWinLucky: 1.15, bumpOne: 0.84, bumpNone: 0.72, bumpLen: 18,
    // boosts (a higher top speed for a while): snow rings and smooth curves
    ringR: 0.3, ringBoost: 9, ringT: 3, boostAcc: 9,
    // S-bends: the flip has a little grace either side of the switch
    flipCue: 0.45, flipEarly: 0.35, flipGrace: 0.35, luckyHold: 0.25,
    // flow
    goldX: 1.07, silverX: 1.35, goldWhoas: 3, silverWhoas: 10,   // medals (x the summed room pars)
    afkT: 10, luckyAfter: 4, stallLucky: 4, finT: 2.6, callEarly: 3.6, callLate: 1.15, hintLife: 2.6,
  };
  const K = BOB;
  const FOG = [234, 244, 251];

  /* ---------- the course: tokens -> features and drawing segments ---------- */
  function bobCompile(def) {
    const c = { curves: [], tucks: [], bumps: [], rings: [], boards: [], deco: {}, finish: 0, zMin: -K.rampLen - 40 };
    let z = 0;
    const curve = (dir, len, k, kind) => { c.curves.push({ i: c.curves.length, z0: z, z1: z + len, dir, k, kind, bad: 0, good: 0, tIn: 0, whoa: false, done: false, entered: false }); z += len; };
    for (const tk of def.course || []) {
      const t = String(tk), ch = t[0], n = parseFloat(t.slice(1)) || 0;
      if (ch === 's') z += n;
      else if (ch === 'l' || ch === 'r') curve(ch === 'r' ? 1 : -1, n, 1, 'curve');
      else if (ch === 'L' || ch === 'R') curve(ch === 'R' ? 1 : -1, n, 1.45, 'big');
      else if (ch === 'h') { c.boards.push({ z: z - K.brakeSign, kind: 'brake' }, { z: z - K.hpZone, kind: 'brake' }); curve(t[1] === 'r' ? 1 : -1, 75, 2.1, 'hair'); }
      else if (ch === 'z') { const d = t[1] === 'r' ? 1 : -1; curve(d, 38, 1.1, 's'); curve(-d, 38, 1.1, 's'); }
      else if (ch === 't') { c.tucks.push({ z0: z, z1: z + n, both: 0, t: 0, done: false }); c.boards.push({ z: z - 30, kind: 'tuck' }); z += n; }
      else if (ch === 'j') { c.bumps.push({ z: z + 22, done: false }); c.boards.push({ z: z - 50, kind: 'hop' }); z += 44; }
      else if (ch === 'o') c.rings.push({ z, u: clamp(n, -0.85, 0.85), got: false, t: 0 });
      else if (ch === 'F') c.finish = z;
    }
    if (!c.finish) c.finish = z;
    // back-to-back curves (S-bends): each knows its neighbour, for the flip's grace
    for (const cv of c.curves) { const nx = c.curves[cv.i + 1]; if (nx && nx.z0 === cv.z1 && nx.dir !== cv.dir) { cv.next = nx; nx.prev = cv; } }
    c.zMax = c.finish + 420;
    // call boards before each curve that starts after a straight (on the outer wall), chevrons inside it
    for (const cv of c.curves) {
      const prev = c.curves[cv.i - 1];
      if (!prev || cv.z0 - prev.z1 > 20) c.boards.push({ z: cv.z0 - 42, kind: 'call', dir: cv.dir, side: -cv.dir, hair: cv.kind === 'hair' });
      for (let zz = cv.z0 + 6; zz < cv.z1 - 4; zz += 12) c.boards.push({ z: zz, kind: 'chev', dir: cv.dir, side: -cv.dir });
    }
    // drawing segments: curvature (eased in and out) and the hills
    const n = Math.ceil((c.zMax - c.zMin) / K.SEG) + K.drawN + 4;
    c.segC = new Float32Array(n);
    for (const cv of c.curves) {
      const len = cv.z1 - cv.z0, ramp = Math.min(18, len * 0.3);
      for (let i = Math.floor((cv.z0 - c.zMin) / K.SEG); i <= Math.ceil((cv.z1 - c.zMin) / K.SEG); i++) {
        const zz = c.zMin + (i + 0.5) * K.SEG;
        if (zz < cv.z0 || zz > cv.z1 || i < 0 || i >= n) continue;
        const e = Math.min(1, (zz - cv.z0) / ramp, (cv.z1 - zz) / ramp);
        c.segC[i] += cv.dir * cv.k * K.curv * (e * e * (3 - 2 * e));
      }
    }
    // scenery (seeded by the room, so every play looks the same)
    const seed = (def.pilot || 0) * 97 + (def.course || []).length * 13;
    for (let i = 0; i < n; i++) {
      const zz = c.zMin + i * K.SEG, h = hash(i, seed);
      const out = [];
      if (h % 5 < 2) out.push({ kind: 'pine', lat: (h & 1 ? 1 : -1) * (4.2 + ((h >> 3) % 90) / 10), s: 0.8 + ((h >> 9) % 60) / 100 });
      if ((h >> 5) % 11 === 0) out.push({ kind: 'pine', lat: (h & 2 ? 1 : -1) * (12 + ((h >> 12) % 120) / 10), s: 1.2 });
      if ((zz > -K.rampLen - 6 && zz < 12) || (zz > c.finish - 40 && zz < c.finish + 30)) {
        if (h % 3 === 0) out.push({ kind: 'fan', lat: (h & 4 ? 1 : -1) * (3.8 + ((h >> 4) % 20) / 10), col: (h >> 7) % 4, ph: (h % 100) / 16 });
        if (h % 4 === 1) out.push({ kind: 'flag', lat: (h & 8 ? 1 : -1) * 2.7, col: (h >> 6) % 4 });
      } else if ((h >> 8) % 23 === 0) out.push({ kind: 'fan', lat: (h & 4 ? 1 : -1) * (3.8 + ((h >> 4) % 15) / 10), col: (h >> 7) % 4, ph: (h % 100) / 16 });
      if (out.length) c.deco[i] = out;
    }
    c.curveN = c.curves.length;
    c.ringN = c.rings.length;
    return c;
  }
  const bobHill = z => 1.1 * Math.sin(z / 97) + 0.5 * Math.sin(z / 43 + 1.3);
  function bobTrackY(st, z) {
    let y = bobHill(z);
    for (const b of st.c.bumps) { const d = z - b.z; if (Math.abs(d) < K.bumpLen / 2) { const u = Math.cos(Math.PI * d / K.bumpLen); y += 0.85 * u * u; } }
    return y;
  }
  const bobCurveAt = (st, z) => st.c.curves.find(cv => z >= cv.z0 && z < cv.z1) || null;
  const bobTuckAt = (st, z) => st.c.tucks.find(t => z >= t.z0 && z < t.z1) || null;
  // the features ahead of the sled within d metres, nearest first ({ kind, z, dist, ... })
  function bobAhead(st, d) {
    const z = st.s.z, out = [];
    for (const cv of st.c.curves) if (cv.z1 > z && cv.z0 < z + d) out.push({ kind: cv.kind === 'hair' ? 'hairpin' : 'curve', z: cv.z0, dist: cv.z0 - z, dir: cv.dir, k: cv.k, cv, inside: z >= cv.z0 });
    for (const t of st.c.tucks) if (t.z1 > z && t.z0 < z + d) out.push({ kind: 'tuck', z: t.z0, dist: t.z0 - z, z1: t.z1, inside: z >= t.z0 });
    for (const b of st.c.bumps) if (b.z > z && b.z < z + d) out.push({ kind: 'bump', z: b.z, dist: b.z - z });
    for (const r of st.c.rings) if (!r.got && r.z > z && r.z < z + d) out.push({ kind: 'ring', z: r.z, dist: r.z - z, u: r.u });
    return out.sort((a, b) => a.dist - b.dist);
  }
  // the wall profile: lateral position u (|u| <= 1 the floor, 1..2 up the wall) -> lateral metres, height, tilt
  function bobPose(u) {
    const a = Math.abs(u), s = Math.sign(u) || 1;
    if (a <= 1) return { x: u * K.floorW, y: 0, tilt: 0 };
    const th = Math.min(1, a - 1) * K.wallA;
    return { x: s * (K.floorW + K.wallR * Math.sin(th)), y: K.wallR * (1 - Math.cos(th)), tilt: s * th };
  }

  /* ---------- keys, hints, labels ---------- */
  const bobQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
  function bobKey(id, what) {
    const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
    if (what === 'hop') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
    if (what === 'tuck') return pad ? 'stick ▼' : touch ? '▼' : id === 0 ? 'S' : '↓';
    if (what === 'left') return pad ? '◀' : touch ? '◀' : id === 0 ? 'A' : '←';
    if (what === 'right') return pad ? '▶' : touch ? '▶' : id === 0 ? 'D' : '→';
    if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
    return '';
  }
  const bobDirKey = (id, dir) => bobKey(id, dir > 0 ? 'right' : 'left');
  const bobArrow = dir => (dir > 0 ? '▶' : '◀');
  function bobHint(st, id, text, life) { if (bobQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || K.hintLife }; }
  function bobHintOnce(st, key, id, text, life) { if (st.hinted[key]) return; st.hinted[key] = true; bobHint(st, id, text, life); }
  function bobMsg(st, text, col, life) { st.msg = { text, col: col || C.paper, t: 0, life: life || 2.6 }; }
  // pops: screen text rising from the middle of the sled ('mid'), or over a rider's head (who = 0 / 1)
  function bobPop(st, s, col, size, who) {
    const same = st.pops.find(q => q.s === s && q.who === (who == null ? -1 : who));
    if (same) { same.t = 0; return; }
    st.popSide = -(st.popSide || 1);
    st.pops.push({ s, col: col || '#ffffff', size: size || 22, t: 0, who: who == null ? -1 : who, side: st.popSide, dx: (Math.random() - 0.5) * 30 }); if (st.pops.length > 8) st.pops.shift(); }
  function bobPart(st, z, x, y, vz, vx, vy, life, col, size, kind) {
    if (st.parts.length > 260) st.parts.shift();
    st.parts.push({ z, x, y, vz, vx, vy, life, max: life, col, size, kind: kind || 'dot' });
  }
  // the touch buttons and the top-bar legend name each player's own action: both push at the start; in the run the
  // pilot calls the curves and the brakeman brakes (the framework has one act label set per level)
  let bobLabelEls = null;
  function bobActLabels(st) {
    const start = st.phase === 'ready' || st.phase === 'push';
    const want = id => (id < 0 ? (start ? 'push' : 'job') : start ? 'push' : id === st.pilot ? 'call' : 'brake');
    const labs = [want(0), want(1)];
    if (st.labKey === labs.join()) return;
    st.labKey = labs.join();
    try { if (G.level && G.level.def) G.level.def.act = { label: start ? 'push' : 'act', labels: labs }; } catch (e) { /* ignore */ }
    try {
      if (!bobLabelEls || !bobLabelEls.every(o => document.contains(o.el))) bobLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
        const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
        const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
        return { el, id };
      });
      let changed = false;
      for (const o of bobLabelEls) { const w = want(o.id); if (o.el.textContent !== w) { o.el.textContent = w; changed = true; } }
      if (changed && typeof fitActLabels === 'function') fitActLabels();
    } catch (e) { /* labels stay as the framework set them */ }
  }

  /* ---------- a run (room) ---------- */
  function bobRoom(st, L, k) {
    const def = L.def;
    st.k = k; st.title = def.title || ''; st.pilot = def.pilot || 0; st.brake = 1 - st.pilot;
    st.c = bobCompile(def);
    st.s = { z: -K.rampLen, v: 0, u: 0, air: 0, airDur: 0, airH: 0, stall: 0, brake: false, tilt: 0, shake: 0, boostT: 0, ringT: 0 };
    st.r = [0, 1].map(id => ({ in: false, hopA: 0, lean: 0, tuck: 0, hopT: 0, runPh: id * 1.7, pushT: 0, call: 0 }));
    st.phase = 'ready'; st.readyT = 0; st.goT = 0; st.pt = 0; st.lastBeat = -99; st.runStart = 0; st.finT = 0;
    st.pushBeat = [-99, -99]; st.pushOn = [false, false];
    st.lean = [0, 0]; st.leanT = [-99, -99]; st.leanSince = [-99, -99]; st.rawPrev = [0, 0]; st.holdLen = [0, 0]; st.hopP = [-99, -99]; st.prevUp = [true, true];
    st.lastIn = [G.time, G.time]; st.afk = false; st.lucky = false; st.wobbly = 0;
    st.called = -1; st.callSaid = -1;
    st.hints = [null, null]; st.hinted = {}; st.msg = null; st.pops = []; st.parts = [];
    st.camX = 0; st.skyX = st.skyX || 0; st.labKey = '';
    st.stats.runT[k] = null;
    st.stats.curves += st.c.curveN; st.stats.ringN += st.c.ringN;
    bobActLabels(st);
  }

  /* ---------- the tick (def.ownStep: this is all of it) ---------- */
  function bobStep(st, dt) {
    if (!st.s) return;
    const ps = G.players, s = st.s;
    // presses: hops (▲ / controller A / stick up), action, any input (for "Brrr!")
    const hop = [0, 1].map(k => { const p = ps[k], up = !!p.input.up, e = p.pendingJump || (up && !st.prevUp[k]); st.prevUp[k] = up; p.pendingJump = false; return e; });
    const act = [0, 1].map(k => { const a = ps[k].pendingAct; ps[k].pendingAct = false; return a; });
    for (const k of [0, 1]) {
      const i = ps[k].input;
      if (G.introT > 0) { st.lastIn[k] = G.time; continue; }
      if (hop[k] || act[k] || i.left || i.right || i.down || i.jump || i.act || i.up) st.lastIn[k] = G.time;
      const raw = (i.right ? 1 : 0) - (i.left ? 1 : 0);
      if (raw !== st.rawPrev[k]) st.leanSince[k] = G.time;   // a new hold starts (or a release)
      st.rawPrev[k] = raw;
      if (raw) { st.lean[k] = raw; st.leanT[k] = G.time; st.holdLen[k] = G.time - st.leanSince[k]; }
      if (hop[k]) st.hopP[k] = G.time;
    }
    if (st.phase === 'ready') bobReady(st, dt);
    else if (st.phase === 'push') bobPush(st, dt, hop, act);
    else if (st.phase === 'run') bobRun(st, dt, hop, act);
    else if (st.phase === 'finish') { if (bobFinStep(st, dt)) return; }
    bobRiders(st, dt, hop);
    bobFx(st, dt);
    bobActLabels(st);
  }
  // each rider's effective lean: it counts once held steady for a moment (taps and flip-flopping ◀▶ count as no lean),
  // and for a moment after you let go of a steady hold (longer with Lucky rails, after a real hold)
  function bobLeanOf(st, k) {
    const i = G.players[k].input, raw = (i.right ? 1 : 0) - (i.left ? 1 : 0), settle = st.lucky ? K.settle / 2 : K.settle;
    if (raw) return G.time - st.leanSince[k] >= settle ? raw : 0;
    const latch = st.lucky && st.holdLen[k] >= K.luckyHold ? K.latchLucky : K.latch;
    return st.holdLen[k] >= settle && G.time - st.leanT[k] <= latch ? st.lean[k] : 0;
  }
  function bobReady(st, dt) {
    if (G.introT > 0) { st.readyT = 0; return; }
    const t0 = st.readyT;
    st.readyT += dt;
    // two ready beats, then GO on the third
    for (let b = 0; b < 2; b++) if (t0 < b * K.beat + 0.001 && st.readyT >= b * K.beat + 0.001) { Sfx.play('bobsledBeat'); bobPop(st, b ? 'Set...' : 'Ready...', '#ffffff', 30); }
    if (st.readyT >= K.readyT) {
      st.phase = 'push'; st.goT = G.time; st.pt = 0; st.lastBeat = 0; st.runStart = G.time;
      Sfx.play('bobsledGo'); bobPop(st, 'GO! Push!', C.gold, 38);
      rumble(0, 0.15, 0.35, 90); rumble(1, 0.15, 0.35, 90);
      for (const k of [0, 1]) bobHint(st, k, 'Push ' + bobKey(k, 'act') + ' on the beat!', 2.4);
    }
  }
  function bobPush(st, dt, hop, act) {
    const s = st.s, ps = G.players;
    st.pt += dt;
    const bi = Math.floor(st.pt / K.beat + 1e-6);
    if (bi > st.lastBeat) { st.lastBeat = bi; Sfx.play('bobsledBeat'); }
    const hopZone = s.z >= -K.hopLen;
    for (const k of [0, 1]) {
      const R = st.r[k];
      if (R.in) continue;
      const nb = Math.round(st.pt / K.beat), off = Math.abs(st.pt - nb * K.beat);
      if (act[k] && st.pushBeat[k] !== nb) {           // one push per beat each
        const on = off <= K.beatWin * (st.lucky ? 1.5 : 1);
        st.pushBeat[k] = nb; st.pushOn[k] = on; R.pushT = 0.25;
        let imp = on ? 1 : K.pushOff;
        const o = 1 - k, together = on && !st.r[o].in && st.pushBeat[o] === nb && st.pushOn[o];
        if (together) { imp += K.together; st.stats.together++; bobPop(st, 'TOGETHER!', C.gold, 26); Sfx.play('bobsledTogether'); rumble(0, 0, 0.3, 60); rumble(1, 0, 0.3, 60); }
        else if (on) Sfx.play('bobsledPush', k);
        else { Sfx.play('bobsledPushOff', k); bobHintOnce(st, 'offbeat' + k, k, 'Push on the beat: ' + bobKey(k, 'act') + ' when the dot flashes!', 2.2); }
        s.v += imp * K.pushK * Math.max(0, 1 - s.v / K.pushMax);
        st.stats.pushes[k]++;
        if (on) st.stats.onBeat[k]++;
      }
      if (hop[k]) {
        if (hopZone) bobHopIn(st, k, false);
        else bobHintOnce(st, 'early' + k, k, 'Push first! Hop in ' + bobKey(k, 'hop') + ' on the gold line', 2.2);
      }
    }
    if (s.v > 0.3) s.v += K.rampAcc * dt;
    s.z += s.v * dt;
    if (hopZone && !st.hinted.hopzone) { st.hinted.hopzone = true; for (const k of [0, 1]) if (!st.r[k].in) bobHint(st, k, 'Hop in! ' + bobKey(k, 'hop'), 2.2); Sfx.play('bobsledCall'); }
    // Brrr: somebody isn't pushing
    const idle = [0, 1].filter(k => G.time - st.lastIn[k] > K.afkT && !st.r[k].in);
    if (idle.length && !st.msg) {
      const solo = typeof cpuSolo === 'function' && cpuSolo(), me = solo ? cpuHuman() : -1;
      if (solo) { if (idle.includes(me)) bobMsg(st, 'Brrr! Push ' + bobKey(me, 'act') + ' on the beat!', '#c8f1ff', 3); }
      else bobMsg(st, idle.length === 2 ? 'Brrr! Both push ' + bobKey(0, 'act') + ' and ' + bobKey(1, 'act') + ' on the beat!' : 'Brrr! ' + NAMES[idle[0]] + ', help push!', '#c8f1ff', 3);
    }
    // the start line: anyone still out scrambles in
    if (s.z >= 0) {
      for (const k of [0, 1]) if (!st.r[k].in) bobHopIn(st, k, true);
      st.phase = 'run';
      st.stats.startV = Math.max(st.stats.startV, s.v);
      bobPop(st, Math.round(s.v * 3.6) + ' km/h start!', '#ffffff', 22);
    }
  }
  function bobHopIn(st, k, late) {
    const R = st.r[k], s = st.s;
    R.in = true; R.hopA = 0.001;
    if (late) {
      s.v *= K.lateKeep; st.stats.late++;
      bobPop(st, 'Hop in, ' + NAMES[k] + '!', PCOL[k], 22, k);
      Sfx.play('bobsledScramble');
      bobHint(st, k, 'Hop in sooner: ' + bobKey(k, 'hop') + ' in the gold zone', 2.6);
    } else { Sfx.play('bobsledHop', k); bobPop(st, 'In!', PCOL[k], 20, k); }
  }
  function bobRun(st, dt, hop, act) {
    const s = st.s, ps = G.players, P = st.pilot, B = st.brake;
    const zPrev = s.z, cv = bobCurveAt(st, s.z), tk = bobTuckAt(st, s.z);
    // Brrr: one rider pressed nothing for 10 s
    const idle = [0, 1].filter(k => G.time - st.lastIn[k] > K.afkT);
    if (idle.length && !st.afk) { st.afk = true; Sfx.play('bobsledBrrr'); }
    if (st.afk && !idle.length) { st.afk = false; if (st.msg && st.msg.brrr) st.msg = null; }
    if (st.afk) {
      const solo = typeof cpuSolo === 'function' && cpuSolo();
      bobMsg(st, 'Brrr! ' + (idle.length === 2 || solo ? 'Press any button to slide on!' : NAMES[idle[0]] + ', press any button to slide on!'), '#c8f1ff', 0.5); st.msg.brrr = true;
    }
    // the pilot's call
    if (act[P]) {
      const nx = bobAhead(st, 260).find(f => f.kind === 'curve' || f.kind === 'hairpin');
      st.r[P].call = 0.9;
      Sfx.play('bobsledCall', P);
      if (nx) { st.called = nx.cv.i; bobPop(st, nx.kind === 'hairpin' ? 'HAIRPIN ' + (nx.dir > 0 ? 'RIGHT!' : 'LEFT!') : nx.dir > 0 ? 'RIGHT!' : 'LEFT!', PCOL[P], 22, P); st.stats.calls++; }
      else bobPop(st, 'Wheee!', PCOL[P], 20, P);
    }
    if (act[B] && !bobAhead(st, K.brakeSign + K.hpPre).some(f => f.kind === 'hairpin')) bobHintOnce(st, 'savebrake', B, 'Save the brake for the hairpins (BRAKE boards)!', 2.6);
    // speed target
    let target = K.cruise, up = K.gAcc, down = K.drag;
    if (tk) {
      const n = [0, 1].filter(k => ps[k].input.down).length;
      target = n === 2 ? K.tuckBoth : n === 1 ? K.tuckOne : K.cruise;
      tk.t += dt; if (n === 2) tk.both += dt;
    }
    // boosts (rings, smooth curves): a higher top speed for a moment (they end as the BRAKE boards come up)
    const hpA = st.c.curves.find(q => q.kind === 'hair' && q.z0 > s.z && q.z0 - s.z <= K.brakeSign + K.hpPre);
    if (s.boostT > 0) { s.boostT -= dt; target += K.smoothBoost; up = K.boostAcc; }
    if (s.ringT > 0) { s.ringT -= dt; target += K.ringBoost; up = K.boostAcc; }
    target = Math.min(target, K.vMax);
    // (just before a hairpin's BRAKE boards the track flattens: boosts end and the sled eases back to cruise speed)
    if (hpA) { s.boostT = s.ringT = 0; target = Math.min(target, K.cruise); down = Math.max(down, K.hpPreDec); }
    let sync = 2;
    if (cv) {
      const dir = cv.dir, outer = -dir, sq = Math.sqrt(cv.k);
      if (!cv.entered) bobEnterCurve(st, cv);
      cv.tIn += dt;
      // S-bends: just before the switch a lean the next way is fine, and just after it a lean the old way is too
      const flip = (cv.next && (cv.z1 - s.z) / Math.max(4, s.v) <= K.flipEarly) ? cv.next.dir : cv.prev && cv.tIn <= K.flipGrace ? cv.prev.dir : 0;
      const le = [bobLeanOf(st, 0), bobLeanOf(st, 1)], ok = l => l === dir || (flip && l === flip);
      const nR = le.filter(ok).length, nW = le.filter(l => l && !ok(l)).length;
      sync = nR === 2 ? 2 : nR === 1 && nW === 0 ? 1 : 0;
      // (in the grace just after the switch, nobody leaning yet is no worse than one)
      if (cv.prev && cv.tIn <= K.flipGrace && sync === 0 && nW === 0) sync = 1;
      if (sync === 2) cv.good += dt;
      if (sync === 2) s.u = approach(s.u, outer * (1.08 + 0.12 * cv.k), K.uSettle * dt);
      else {
        const rise = (sync === 1 ? K.uRiseOne : K.uRiseNone) * sq * (st.lucky ? K.luckyRise : 1);
        s.u = approach(s.u, outer * 2, rise * dt);
        target = 0; down = (sync === 1 ? K.decOne : K.decNone) * sq * (st.lucky ? 0.7 : 1);
        cv.bad += dt;
      }
      if (cv.kind === 'hair') { target = Math.min(target, K.hpMax); up = Math.min(up, K.hpAcc); }   // (flat: slow to pick up speed)
      if (Math.abs(s.u) > K.whoaU && !cv.whoa) { cv.whoa = true; st.stats.whoas++; bobPop(st, 'Whoa!', '#ffffff', 30); Sfx.play('bobsledWhoa'); rumble(0, 0.4, 0.4, 160); rumble(1, 0.4, 0.4, 160); if (!reduceMotion) G.shake = Math.max(G.shake, 0.12); }
      if (Math.abs(s.u) >= K.lipU) { target = 0; down = Math.max(down, K.lipDec); s.stall += dt; } else s.stall = 0;
      if (s.stall > 0.9 && !st.msg) bobMsg(st, 'Stuck on the lip! Both lean ' + bobArrow(dir) + ' to slide down', '#c8f1ff', 2);
      if (s.stall > K.stallLucky) bobLucky(st);
      if (sync < 2) for (const k of [0, 1]) if (!ok(le[k]) && cv.bad > 0.2) bobHintOnce(st, 'lean' + k + '_' + cv.i, k, 'Lean ' + bobDirKey(k, dir) + ' too!', 1.6);
    } else {
      // straights: the sled slides back down to the floor, and the pilot steers between the lanes (rings)
      if (Math.abs(s.u) > K.steerMax) s.u = approach(s.u, Math.sign(s.u) * K.steerMax, K.uSettle * dt);
      else {
        const pi = ps[P].input, d = (pi.right ? 1 : 0) - (pi.left ? 1 : 0);
        s.u = clamp(s.u + d * K.steer * dt, -K.steerMax, K.steerMax);
      }
      const bi = ps[B].input;
      if ((bi.left || bi.right) && !bobAhead(st, 40).some(f => f.kind === 'curve' || f.kind === 'hairpin')) {
        st.wrongT = (st.wrongT || 0) + dt;
        if (st.wrongT > 1.3 && bobAhead(st, 90).some(f => f.kind === 'ring')) bobHintOnce(st, 'steer' + B, B, NAMES[P] + ' steers to the rings. You lean in curves!', 2.6);
      } else st.wrongT = 0;
    }
    // the hairpin approach (from the 2nd BRAKE board): the sled can't speed up past hairpin speed
    if (hpA && hpA.z0 - s.z <= K.hpZone) { target = Math.min(target, K.hpMax); up = Math.min(up, K.gAcc); down = Math.max(down, K.hpZoneDec); }
    // the brakeman's brake: from the 1st BRAKE board through the hairpin it slows to hairpin speed, elsewhere to a crawl
    s.brake = !!ps[B].input.act && !st.afk;
    if (s.brake) { target = Math.min(target, hpA || (cv && cv.kind === 'hair') ? K.hpMax : K.brakeMin); down = Math.max(down, K.brakeDec); }
    if (st.afk) { target = 0; down = Math.max(down, 9); }
    s.v = s.v < target ? Math.min(target, s.v + up * dt) : Math.max(target, s.v - down * dt);
    s.z += s.v * dt;
    // leaving a curve: smooth or wobbly. A curve nobody leaned together in can't be left: the sled rides up the wall
    // at its end and waits on the lip (so one rider alone never gets through)
    if (cv && s.z >= cv.z1 && !cv.done && cv.good < K.needGood) { s.z = cv.z1 - 0.01; s.u = approach(s.u, -cv.dir * 2, 3 * dt); }
    if (cv && s.z >= cv.z1 && !cv.done) bobExitCurve(st, cv);
    // tuck zone done
    for (const t of st.c.tucks) if (!t.done && zPrev < t.z1 && s.z >= t.z1) {
      t.done = true;
      if (t.both > t.t * 0.7) { st.stats.tucks++; bobPop(st, 'Super tuck!', '#8fd3ff', 24); Sfx.play('bobsledGood'); }
    }
    // jump bumps: both hop just before the crest
    for (const b of st.c.bumps) if (!b.done && zPrev < b.z && s.z >= b.z) {
      b.done = true;
      const win = st.lucky ? K.hopWinLucky : K.hopWin, n = [0, 1].filter(k => G.time - st.hopP[k] <= win).length;
      if (n === 2) { s.air = 0.0001; s.airDur = 0.75; s.airH = 0.6; s.v += 1; st.stats.airs++; bobPop(st, 'BIG AIR! Together!', C.gold, 30); Sfx.play('bobsledAir'); }
      else {
        s.air = 0.0001; s.airDur = 0.32; s.airH = 0.2; s.v *= n ? K.bumpOne : K.bumpNone;
        bobPop(st, n ? 'Bump! Hop together!' : 'Bonk! Hop on the bump!', '#ffffff', 24); Sfx.play('bobsledBump');
        rumble(0, 0.5, 0.4, 150); rumble(1, 0.5, 0.4, 150); if (!reduceMotion) G.shake = Math.max(G.shake, 0.15);
        for (const k of [0, 1]) if (G.time - st.hopP[k] > win) bobHintOnce(st, 'hop' + k, k, 'Press ' + bobKey(k, 'hop') + ' just before the bump!', 2.4);
      }
    }
    if (s.air > 0) { s.air += dt; if (s.air >= s.airDur) { s.air = 0; Sfx.play('bobsledLand'); for (let i = 0; i < 12; i++) bobSpray(st, 1.6); } }
    // snow-gate rings
    for (const r of st.c.rings) if (!r.got && !r.miss && zPrev < r.z && s.z >= r.z) {
      if (Math.abs(s.u - r.u) < K.ringR && Math.abs(s.u) <= 1.05) {
        r.got = true; st.stats.rings++; st.s.ringT = K.ringT; st.s.v += 0.8;
        bobPop(st, 'Ring!', '#ffe28a', 24, P); Sfx.play('bobsledRing');
        for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2; bobPart(st, r.z, r.u * K.floorW + Math.cos(a) * 0.45, 0.55 + Math.sin(a) * 0.45, s.v * 0.9, Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0.6, i % 2 ? C.gold : '#ffffff', 0.06, 'spark'); }
      } else { r.miss = true; if (!st.hinted.ringmiss) bobHintOnce(st, 'ringmiss', P, 'Steer ' + bobKey(P, 'left') + ' ' + bobKey(P, 'right') + ' through the rings!', 2.4); }
    }
    // the finish line
    if (s.z >= st.c.finish) bobFinish(st);
  }
  function bobEnterCurve(st, cv) {
    cv.entered = true;
    const s = st.s;
    if (cv.kind === 'hair') {
      if (s.v > K.hpMax + K.hpTol) {
        // too fast: up the wall. Much too fast: right up on the lip, nearly stopped, until both lean
        const much = s.v > K.hpMax + K.hpTol + K.hpBit;
        st.stats.tooFast++; cv.bad += 0.6;
        if (much) { cv.whoa = true; st.stats.whoas++; s.v = K.tooFastV; s.u = -cv.dir * K.lipU; }
        else { s.v = K.hpMax * K.bitFastKeep; s.u = -cv.dir * 1.5; }
        bobPop(st, much ? 'Too fast! Whoa!' : 'A bit fast!', '#ffffff', 30); Sfx.play('bobsledWhoa');
        rumble(0, 0.6, 0.5, 220); rumble(1, 0.6, 0.5, 220); if (!reduceMotion) G.shake = Math.max(G.shake, much ? 0.2 : 0.1);
        bobHint(st, st.brake, 'Brake sooner! Hold ' + bobKey(st.brake, 'act') + ' from the first BRAKE board', 2.8);
      } else { st.stats.brakes++; bobPop(st, 'Nice braking!', '#8fe3b0', 22, st.brake); Sfx.play('bobsledGood'); }
    }
  }
  function bobExitCurve(st, cv) {
    cv.done = true;
    const next = st.c.curves[cv.i + 1], sPart = cv.kind === 's' && next && next.kind === 's' && next.z0 === cv.z1;
    const smooth = cv.bad < (st.lucky ? K.smoothBadLucky : K.smoothBad) && !cv.whoa;
    if (smooth) {
      st.stats.smooth++; st.s.boostT = K.smoothT; st.s.v += 0.8;
      if (!sPart) { bobPop(st, cv.kind === 's' ? 'Smooth S-bend!' : cv.kind === 'hair' ? 'Smooth hairpin!' : 'Smooth!', '#8fe3b0', 26); Sfx.play('bobsledSmooth'); }
    } else {
      st.wobbly++;
      if (!cv.whoa) { bobPop(st, 'Wobble!', '#ffffff', 24); Sfx.play('bobsledWobble'); }
      if (st.wobbly >= K.luckyAfter) bobLucky(st);
    }
  }
  // gold help (announced): leans count longer and the sled climbs slower; both riders still have to lean
  function bobLucky(st) {
    if (st.lucky) return;
    st.lucky = true; st.stats.lucky++;
    bobMsg(st, 'Lucky rails! Your leans count longer (you both still lean)', C.gold, 4);
    Sfx.play('bobsledLucky');
  }
  function bobFinish(st) {
    const s = st.s;
    st.phase = 'finish'; st.finT = 0;
    const t = G.time - st.runStart;
    st.stats.runT[st.k] = t;
    st.lastRunT = t;
    bobPop(st, 'FINISH! ' + fmtTime(t), C.gold, 40);
    Sfx.play('bobsledFinish'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
    for (let i = 0; i < 40; i++) bobPart(st, s.z + 3 + Math.random() * 4, (Math.random() - 0.5) * 3, 1 + Math.random() * 2, s.v * 0.7, (Math.random() - 0.5) * 3, Math.random() * 3, 1.4, ['#ff5f6d', C.gold, '#4f8fe0', '#8fe3b0', '#ffffff'][i % 5], 0.07, 'conf');
  }
  function bobFinStep(st, dt) {
    const s = st.s;
    st.finT += dt;
    s.v = approach(s.v, 0, 9 * dt); s.z += s.v * dt;
    s.u = approach(s.u, 0, 1.5 * dt);
    if (st.finT >= K.finT) {
      const L = G.level;
      if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return true; }
      // the official time: the four run times added up
      const tot = st.stats.runT.reduce((a, b) => a + (b || 0), 0);
      G.time = tot;
      G.level.goal = { x: W / 2, y: 200 };
      levelClear();
      return true;
    }
    return false;
  }
  // the riders' bodies: leaning, tucking, hopping, running and the hop into the sled
  function bobRiders(st, dt, hop) {
    const ps = G.players, s = st.s, run = st.phase === 'run' || st.phase === 'finish';
    for (const k of [0, 1]) {
      const R = st.r[k], i = ps[k].input;
      const raw = (i.right ? 1 : 0) - (i.left ? 1 : 0);
      R.lean = approach(R.lean, R.in ? raw : 0, dt * 7);
      R.tuck = approach(R.tuck, R.in && i.down ? 1 : 0, dt * 8);
      if (R.hopA > 0 && R.hopA < 1) R.hopA = Math.min(1, R.hopA + dt / 0.38);
      if (hop[k] && R.in && R.hopA >= 1 && run) R.hopT = 0.32;
      if (R.hopT > 0) R.hopT = Math.max(0, R.hopT - dt);
      if (R.pushT > 0) R.pushT = Math.max(0, R.pushT - dt);
      if (R.call > 0) R.call = Math.max(0, R.call - dt);
      if (!R.in) R.runPh += dt * (2 + s.v * 0.9);
    }
  }
  function bobSpray(st, k) {
    const s = st.s, p = bobPose(s.u), side = Math.random() < 0.5 ? -1 : 1;
    bobPart(st, s.z - K.sledRear, p.x + side * 0.32, p.y + 0.05, s.v * (0.55 + Math.random() * 0.3), side * (0.6 + Math.random()) * k, (1 + Math.random() * 1.5) * k, 0.45, 'rgba(255,255,255,0.95)', 0.05 + Math.random() * 0.05);
  }
  function bobFx(st, dt) {
    const s = st.s;
    for (let i = st.parts.length - 1; i >= 0; i--) {
      const q = st.parts[i];
      if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
      q.z += q.vz * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy -= (q.kind === 'conf' ? 1.5 : 6) * dt;
    }
    for (const q of st.pops) q.t += dt;
    st.pops = st.pops.filter(q => q.t < 1.2);
    for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
    if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
    // runner spray (more when braking or riding the wall), and the sky turning with the curves
    if ((st.phase === 'run' || st.phase === 'finish') && s.v > 4 && s.air <= 0) {
      const n = s.brake ? 3 : Math.abs(s.u) > 1.2 ? 2 : Math.random() < 0.45 ? 1 : 0;
      for (let i = 0; i < n; i++) bobSpray(st, s.brake ? 1.6 : 1);
    }
    const cv = bobCurveAt(st, s.z);
    if (cv) st.skyX += cv.dir * cv.k * s.v * dt * 0.9;
    st.camX = st.camX + (bobPose(s.u).x * 0.85 - st.camX) * Math.min(1, dt * 6);
  }

  /* ---------- drawing ---------- */
  let bobSkyG = null, bobPeaks = null, bobFlakes = null;
  const mix = (c, k) => 'rgb(' + Math.round(c[0] + (FOG[0] - c[0]) * k) + ',' + Math.round(c[1] + (FOG[1] - c[1]) * k) + ',' + Math.round(c[2] + (FOG[2] - c[2]) * k) + ')';
  const COL = {
    snow: [247, 252, 255], floorA: [232, 245, 255], floorB: [218, 237, 252], wall: [[205, 230, 249], [184, 218, 244], [160, 203, 238]],
    wallR: [[190, 220, 244], [168, 205, 236], [146, 190, 229]], lipA: [232, 67, 79], lipB: [79, 143, 224], lipTop: [255, 255, 255],
    gold: [255, 213, 92], tuck: [91, 169, 230], hop: [255, 197, 61],
  };
  // the view for this frame: the track's centre (x, y) at each segment boundary, measured from the camera
  function bobView(st) {
    const s = st.s, c = st.c, camZ = s.z - K.camBack, f = (camZ - c.zMin) / K.SEG, i0 = Math.floor(f), pct = f - i0, n = K.drawN;
    const xs = new Float32Array(n + 2), ys = new Float32Array(n + 2), dz = new Float32Array(n + 2);
    let x = 0, dx = -(c.segC[i0] || 0) * pct;
    for (let j = 0; j <= n + 1; j++) {
      const zb = c.zMin + (i0 + j) * K.SEG;
      dz[j] = zb - camZ; xs[j] = x; ys[j] = bobTrackY(st, zb);
      x += dx; dx += c.segC[i0 + j] || 0;
    }
    const v = { xs, ys, dz, i0, n, camZ };
    const at = d => { const jf = (d - dz[0]) / K.SEG, j = clamp(Math.floor(jf), 0, n), u = clamp(jf - j, 0, 1); return { x: xs[j] + (xs[j + 1] - xs[j]) * u, y: ys[j] + (ys[j + 1] - ys[j]) * u }; };
    v.at = at;
    const sp = at(K.camBack - K.sledRear), pose = bobPose(s.u);
    const air = s.air > 0 ? s.airH * Math.sin(Math.PI * clamp(s.air / s.airDur, 0, 1)) : 0;
    v.cam = { x: sp.x + st.camX, y: bobTrackY(st, s.z) + K.camH + pose.y * 0.6 + air * 0.7 };
    v.P = (d, x2, y2) => { const sc = K.D / Math.max(K.near, d); return { X: W / 2 + (x2 - v.cam.x) * sc, Y: K.hor + (v.cam.y - y2) * sc, s: sc }; };
    v.T = (d, lat, h) => { const a = at(d); return v.P(d, a.x + lat, a.y + h); };
    return v;
  }
  function bobDrawSky(st) {
    if (!bobSkyG) { bobSkyG = ctx.createLinearGradient(0, 0, 0, K.hor + 40); bobSkyG.addColorStop(0, '#7fbfee'); bobSkyG.addColorStop(1, '#e6f4fd'); }
    ctx.fillStyle = bobSkyG; ctx.fillRect(0, 0, W, K.hor + 40);
    ctx.fillStyle = 'rgba(255,252,232,0.95)'; circle(790, 52, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,252,232,0.3)'; circle(790, 52, 42); ctx.fill();
    const off = st.skyX * 2.2;
    for (let i = 0; i < 4; i++) { const x = ((i * 290 - off * 0.3 + G.clock * 6) % (W + 300) + W + 300) % (W + 300) - 150; drawCloud(x, 28 + (i * 37) % 50, 0.6 + (i % 2) * 0.3); }
    if (!bobPeaks) { bobPeaks = []; for (let i = 0; i < 10; i++) bobPeaks.push({ x: i * 190 + hash(i, 5) % 80, h: 50 + hash(i, 9) % 60, w: 110 + hash(i, 13) % 70 }); }
    const RW = 1900;
    for (const layer of [0, 1]) for (const pk of bobPeaks) for (const rep of [-1, 0, 1]) {
      const x = ((pk.x - off * (layer ? 0.9 : 0.6)) % RW + RW) % RW - 200 + rep * RW + layer * 95, h = pk.h * (layer ? 0.65 : 1), w = pk.w * (layer ? 0.8 : 1), y = K.hor + 6;
      if (x + w < 0 || x - w > W) continue;
      ctx.fillStyle = layer ? '#a9cbe8' : '#c1daf0';
      ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = layer ? 'rgba(60,100,150,0.16)' : 'rgba(60,100,150,0.1)';
      ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w, y); ctx.lineTo(x + w * 0.1, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(x - w * 0.3, y - h * 0.7); ctx.lineTo(x, y - h); ctx.lineTo(x + w * 0.3, y - h * 0.7); ctx.lineTo(x + w * 0.12, y - h * 0.62); ctx.lineTo(x, y - h * 0.72); ctx.lineTo(x - w * 0.14, y - h * 0.6); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = mix(COL.snow, 0.6); ctx.fillRect(0, K.hor + 4, W, H - K.hor);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(0, K.hor - 4, W, 10);   // a little haze where the snow meets the sky
  }
  function quad(a, b, c2, d, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(a.X, a.Y); ctx.lineTo(b.X, b.Y); ctx.lineTo(c2.X, c2.Y); ctx.lineTo(d.X, d.Y); ctx.closePath(); ctx.fill(); }
  function bobDrawTrack(st, v) {
    const c = st.c, ths = [0, 0.42, 0.85, 1].map(u => u * K.wallA), sledDz = K.camBack - K.sledRear;
    const prof = th => ({ l: K.floorW + K.wallR * Math.sin(th), h: K.wallR * (1 - Math.cos(th)) });
    const P = v.P, lipH = prof(K.wallA).h, lipL = prof(K.wallA).l;
    const near = [];
    for (let j = v.n - 1; j >= 0; j--) {
      let da = v.dz[j], db = v.dz[j + 1];
      if (db <= K.near) continue;
      let xa = v.xs[j], ya = v.ys[j];
      const xb = v.xs[j + 1], yb = v.ys[j + 1];
      if (da < K.near) { const u = (K.near - da) / (db - da); xa += (xb - xa) * u; ya += (yb - ya) * u; da = K.near; }
      const gi = v.i0 + j, fog = Math.pow(j / v.n, 1.4) * 0.9, zz = c.zMin + gi * K.SEG;
      const A = (lat, h) => P(da, xa + lat, ya + h), B = (lat, h) => P(db, xb + lat, yb + h);
      // the snow outside the channel
      for (const sd of [-1, 1]) quad(A(sd * (lipL + 0.3), lipH + 0.14), A(sd * 60, lipH + 0.14), B(sd * 60, lipH + 0.14), B(sd * (lipL + 0.3), lipH + 0.14), mix(COL.snow, fog * 0.8));
      // walls (3 bands near, 1 far), the painted lip, the floor
      const bands = j < 40 ? 3 : 1;
      for (const sd of [-1, 1]) {
        for (let b = 0; b < bands; b++) {
          const t0 = bands === 1 ? ths[0] : ths[b], t1 = bands === 1 ? ths[3] : ths[b + 1], p0 = prof(t0), p1 = prof(t1);
          quad(A(sd * p0.l, p0.h), A(sd * p1.l, p1.h), B(sd * p1.l, p1.h), B(sd * p0.l, p0.h), mix((sd < 0 ? COL.wall : COL.wallR)[bands === 1 ? 1 : b], fog));
        }
        const lc = (gi >> 1) % 2 ? COL.lipA : COL.lipB;
        quad(A(sd * lipL, lipH), A(sd * (lipL + 0.05), lipH + 0.14), B(sd * (lipL + 0.05), lipH + 0.14), B(sd * lipL, lipH), mix(lc, fog));
        quad(A(sd * (lipL + 0.05), lipH + 0.14), A(sd * (lipL + 0.35), lipH + 0.14), B(sd * (lipL + 0.35), lipH + 0.14), B(sd * (lipL + 0.05), lipH + 0.14), mix(COL.lipTop, fog));
      }
      let fc = gi % 2 ? COL.floorA : COL.floorB;
      const inTuck = c.tucks.some(t => zz >= t.z0 && zz < t.z1), inHop = zz >= -K.hopLen && zz < 0 && st.phase !== 'run';
      if (inHop) fc = COL.gold;
      quad(A(-K.floorW, 0), A(K.floorW, 0), B(K.floorW, 0), B(-K.floorW, 0), mix(fc, fog));
      // floor marks: tuck chevrons, the start line, the finish checkers
      if (inTuck && gi % 3 === 0 && j < 60 && da > 8) {
        ctx.fillStyle = mix(COL.tuck, fog);
        const m0 = A(0, 0.001), l0 = A(-0.55, 0), r0 = A(0.55, 0), mB = P(da + (db - da) * 0.7, xa + (xb - xa) * 0.7, ya + 0.001);
        ctx.beginPath(); ctx.moveTo(l0.X, l0.Y); ctx.lineTo(mB.X, mB.Y); ctx.lineTo(r0.X, r0.Y); ctx.lineTo(m0.X, m0.Y); ctx.closePath(); ctx.fill();
      }
      if (zz <= 0 && zz + K.SEG > 0) quad(A(-K.floorW, 0), A(K.floorW, 0), P(da + 0.6, xa + K.floorW, ya), P(da + 0.6, xa - K.floorW, ya), mix([232, 67, 79], fog));
      if (zz <= c.finish && zz + K.SEG > c.finish) {
        for (let q = 0; q < 8; q++) for (let r = 0; r < 2; r++) {
          if ((q + r) % 2) continue;
          const l0 = -K.floorW + q * K.floorW / 4, d0 = da + r * 0.5;
          quad(P(d0, xa + l0, ya), P(d0, xa + l0 + K.floorW / 4, ya), P(d0 + 0.5, xa + l0 + K.floorW / 4, ya), P(d0 + 0.5, xa + l0, ya), mix([40, 38, 70], fog));
        }
      }
      // sprites of segments nearer than the sled wait until the sled is drawn (rings you fly through)
      if (da > sledDz + 0.5) bobDrawSprites(st, v, gi, da, xa, ya, fog);
      else near.push([gi, da, xa, ya, fog]);
    }
    bobDrawSled(st, v);
    for (let q = near.length - 1; q >= 0; q--) bobDrawSprites(st, v, ...near[q]);
  }
  // scenery, boards and rings on one segment
  function bobDrawSprites(st, v, gi, d, x, y, fog) {
    const c = st.c, z0 = c.zMin + gi * K.SEG, z1 = z0 + K.SEG, P = v.P;
    const lip = K.floorW + K.wallR * Math.sin(K.wallA), lipH = K.wallR * (1 - Math.cos(K.wallA)) + 0.14;
    ctx.globalAlpha = 1 - fog * 0.6;
    for (const o of d < 6 ? [] : c.deco[gi] || []) {
      const p = P(d, x + o.lat, y + lipH);
      if (p.X < -200 || p.X > W + 200) continue;
      if (o.kind === 'pine') bobPine(p.X, p.Y, p.s * o.s / 100);
      else if (o.kind === 'fan') bobFan(p.X, p.Y, p.s / 100, o.col, o.ph);
      else if (o.kind === 'flag') bobFlag(p.X, p.Y, p.s / 100, o.col);
    }
    for (const b of c.boards) {
      if (b.z < z0 || b.z >= z1 || d < 9) continue;
      ctx.globalAlpha = (1 - fog * 0.6) * clamp((d - 9) / 5, 0, 1);
      const side = b.side || (gi % 2 ? 1 : -1), p = P(d, x + side * (lip + 0.25), y + lipH);
      bobBoard(p.X, p.Y, p.s / 100, b, side);
      if (b.kind !== 'chev' && b.kind !== 'call') { const q = P(d, x - side * (lip + 0.25), y + lipH); bobBoard(q.X, q.Y, q.s / 100, b, -side); }
    }
    ctx.globalAlpha = 1 - fog * 0.6;
    for (const r of c.rings) {
      if (r.got || r.z < z0 || r.z >= z1) continue;
      const p = P(d + (r.z - z0), x + r.u * K.floorW, y + 0.55), rad = 0.46 * p.s;
      ctx.lineWidth = Math.max(1.5, 0.09 * p.s);
      ctx.strokeStyle = '#7a5a12'; ctx.beginPath(); ctx.ellipse(p.X, p.Y, rad + ctx.lineWidth * 0.5, rad * 1.02 + ctx.lineWidth * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = r.miss ? '#c9d6e3' : C.gold; ctx.beginPath(); ctx.ellipse(p.X, p.Y, rad, rad * 1.02, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth *= 0.35; ctx.beginPath(); ctx.ellipse(p.X, p.Y, rad, rad * 1.02, 0, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
      // snow-gate posts
      ctx.fillStyle = '#ffffff'; for (const sd of [-1, 1]) { ctx.fillRect(p.X + sd * rad - 0.03 * p.s, p.Y + rad * 0.8, 0.06 * p.s, 0.18 * p.s); }
    }
    if (c.finish >= z0 && c.finish < z1) bobArch(P(d, x, y), P(d, x - lip - 0.2, y + lipH), P(d, x + lip + 0.2, y + lipH));
    ctx.globalAlpha = 1;
  }
  function bobPine(x, y, s) {
    ctx.fillStyle = '#6f4a32'; ctx.fillRect(x - 12 * s, y - 40 * s, 24 * s, 42 * s);
    if (s > 0.08) { ctx.fillStyle = 'rgba(60,90,140,0.18)'; ctx.beginPath(); ctx.ellipse(x + 20 * s, y, 100 * s, 16 * s, 0, 0, Math.PI * 2); ctx.fill(); }
    for (let i = 0; i < 3; i++) {
      const w = (110 - i * 26) * s, ty = y - 30 * s - i * 62 * s;
      ctx.fillStyle = '#3f8a6e'; ctx.beginPath(); ctx.moveTo(x - w, ty); ctx.lineTo(x, ty - 110 * s); ctx.lineTo(x + w, ty); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#33745c'; ctx.beginPath(); ctx.moveTo(x, ty - 110 * s); ctx.lineTo(x + w, ty); ctx.lineTo(x, ty); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - w * 0.5, ty - 52 * s); ctx.lineTo(x, ty - 110 * s); ctx.lineTo(x + w * 0.5, ty - 52 * s); ctx.quadraticCurveTo(x, ty - 36 * s, x - w * 0.5, ty - 52 * s); ctx.fill();
    }
  }
  const FAN_COLS = ['#ff5f6d', '#4f8fe0', '#8fe3b0', '#ffc53d'];
  function bobFan(x, y, s, col, ph) {
    const hop = Math.max(0, Math.sin(G.clock * 7 + ph)) * 12 * s, c = FAN_COLS[col % 4];
    if (s > 0.08) { ctx.fillStyle = 'rgba(60,90,140,0.2)'; ctx.beginPath(); ctx.ellipse(x, y - 16 * s, 26 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = c; rr(x - 20 * s, y - 70 * s - hop, 40 * s, 52 * s, 14 * s); ctx.fill();
    ctx.fillStyle = '#ffe0c8'; circle(x, y - 84 * s - hop, 16 * s); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y - 88 * s - hop, 16 * s, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(x, y - 104 * s - hop, 6 * s); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = 7 * s; ctx.lineCap = 'round';
    const wave = Math.sin(G.clock * 9 + ph) * 0.5;
    ctx.beginPath(); ctx.moveTo(x - 16 * s, y - 62 * s - hop); ctx.lineTo(x - 32 * s, y - 100 * s - hop + wave * 10 * s); ctx.moveTo(x + 16 * s, y - 62 * s - hop); ctx.lineTo(x + 32 * s, y - 100 * s - hop - wave * 10 * s); ctx.stroke();
    ctx.lineCap = 'butt';
  }
  function bobFlag(x, y, s, col) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3 * s, y - 170 * s, 6 * s, 170 * s);
    ctx.fillStyle = FAN_COLS[col % 4];
    const w = Math.sin(G.clock * 5 + col) * 8 * s;
    ctx.beginPath(); ctx.moveTo(x + 3 * s, y - 170 * s); ctx.quadraticCurveTo(x + 40 * s, y - 160 * s + w, x + 70 * s, y - 150 * s); ctx.lineTo(x + 3 * s, y - 128 * s); ctx.closePath(); ctx.fill();
  }
  // the boards on the wall lip: curve calls, chevrons, BRAKE, TUCK, HOP
  function bobBoard(x, y, s, b, side) {
    if (s < 0.02) return;
    const w = (b.kind === 'chev' ? 60 : 120) * s, h = (b.kind === 'chev' ? 50 : 66) * s, top = y - h - 22 * s;
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x - 3 * s, top + h, 6 * s, 22 * s);
    const col = b.kind === 'brake' ? '#e8434f' : b.kind === 'tuck' ? '#4f8fe0' : b.kind === 'hop' ? '#ff9a3d' : b.hair ? '#e8434f' : '#ffc53d';
    ctx.fillStyle = col; rr(x - w / 2, top, w, h, 8 * s); ctx.fill();
    if (s > 0.1) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; rr(x - w / 2 + 5 * s, top + 4 * s, w - 10 * s, 8 * s, 4 * s); ctx.fill(); }
    ctx.strokeStyle = '#2a2740'; ctx.lineWidth = Math.max(1, 4 * s); rr(x - w / 2, top, w, h, 8 * s); ctx.stroke();
    if (b.kind === 'chev' || b.kind === 'call') {
      ctx.fillStyle = '#2a2740';
      const n = b.kind === 'chev' ? 1 : 2;
      for (let i = 0; i < n; i++) {
        const cx = x + (n === 2 ? (i - 0.5) * 34 * s : 0), d = b.dir;
        ctx.beginPath(); ctx.moveTo(cx - d * 12 * s, top + h * 0.2); ctx.lineTo(cx + d * 14 * s, top + h * 0.5); ctx.lineTo(cx - d * 12 * s, top + h * 0.8); ctx.lineTo(cx - d * 3 * s, top + h * 0.5); ctx.closePath(); ctx.fill();
      }
    } else if (s > 0.06) {
      const word = b.kind === 'brake' ? 'BRAKE' : b.kind === 'tuck' ? 'TUCK ▼' : 'HOP ▲';
      text(word, x, top + h / 2 + 1, Math.max(6, 30 * s), '#ffffff', 'center');
    }
  }
  function bobArch(base, l, r) {
    const s = base.s / 100, top = l.Y - 150 * s;
    ctx.fillStyle = '#e8434f'; ctx.fillRect(l.X - 10 * s, top, 20 * s, l.Y - top); ctx.fillRect(r.X - 10 * s, top, 20 * s, r.Y - top);
    ctx.fillStyle = '#2a2740'; rr(l.X - 14 * s, top - 40 * s, r.X - l.X + 28 * s, 50 * s, 10 * s); ctx.fill();
    if (s > 0.04) text('FINISH', (l.X + r.X) / 2, top - 15 * s, Math.max(7, 34 * s), C.gold, 'center');
  }
  // the sled and riders (from behind). Local units are centimetres; the origin is the middle of the back runners.
  function bobSledPose(st, v) {
    const s = st.s, pose = bobPose(s.u), d = K.camBack - K.sledRear;
    const air = s.air > 0 ? s.airH * Math.sin(Math.PI * clamp(s.air / s.airDur, 0, 1)) : 0;
    const p = v.T(d, pose.x, pose.y + air);
    const wob = st.phase === 'run' && bobCurveAt(st, s.z) && Math.abs(s.u) > 1.3 ? Math.sin(G.clock * 30) * 0.03 : 0;
    return { X: p.X, Y: p.Y, sc: p.s / 100, rot: pose.tilt * 0.62 + wob, air };
  }
  // seated riders in sled-local units: the brakeman's hips at (0, -48), the pilot's higher (they sit in front, farther away)
  const bobHip = (st, k) => ({ x: st.r[k].lean * (k === st.pilot ? 12 : 8), y: k === st.pilot ? -118 : -48, sc: k === st.pilot ? 0.62 : 0.78 });
  function bobDrawSled(st, v) {
    const sp = bobSledPose(st, v), s = st.s, ps = G.players;
    const c = Math.cos(sp.rot), sn = Math.sin(sp.rot);
    const loc = (lx, ly) => ({ X: sp.X + (lx * c - ly * sn) * sp.sc, Y: sp.Y + (lx * sn + ly * c) * sp.sc });
    // riders still running beside (pilot) or behind (brakeman) the sled at the push start
    const runPos = k => {
      const q = k === st.pilot ? v.T(K.camBack - 0.2, bobPose(s.u).x - 0.8, 0) : v.T(K.camBack - K.sledRear - 0.55, bobPose(s.u).x, 0);
      return { X: q.X, Y: q.Y, sc: q.s / 100 };
    };
    const seatFeet = k => { const h = bobHip(st, k); return loc(h.x, h.y + 20); };
    ctx.save(); ctx.fillStyle = 'rgba(40,60,100,0.18)'; ctx.beginPath(); ctx.ellipse(sp.X, sp.Y + 4 * sp.sc + sp.air * 60 * sp.sc, 58 * sp.sc, 9 * sp.sc, sp.rot, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    const out = k => !st.r[k].in || st.r[k].hopA < 1;
    // the pilot running at the side is farther than the sled's back: drawn first
    if (out(st.pilot)) bobDrawRunner(st, st.pilot, runPos(st.pilot), seatFeet(st.pilot), sp);
    ctx.save(); ctx.translate(sp.X, sp.Y); ctx.rotate(sp.rot); ctx.scale(sp.sc, sp.sc);
    // riders in the sled: the pilot (front), then the brakeman (back)
    for (const k of [st.pilot, st.brake]) { if (out(k)) continue; const h = bobHip(st, k); bobDrawRider(k, h.x, h.y, h.sc, st.r[k]); }
    // the cowling (back view): runners, body, stripe, push handles
    ctx.fillStyle = '#3a3654'; rr(-38, -12, 10, 12, 3); ctx.fill(); rr(28, -12, 10, 12, 3); ctx.fill();
    ctx.fillStyle = '#c9d6e3'; ctx.fillRect(-38, -3, 10, 3); ctx.fillRect(28, -3, 10, 3);
    ctx.fillStyle = '#e8434f'; ctx.strokeStyle = '#8a1f2c'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-46, -10); ctx.lineTo(46, -10); ctx.quadraticCurveTo(52, -40, 40, -62); ctx.quadraticCurveTo(0, -74, -40, -62); ctx.quadraticCurveTo(-52, -40, -46, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(-48, -32); ctx.lineTo(48, -32); ctx.lineTo(47, -24); ctx.lineTo(-47, -24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.ellipse(-22, -52, 16, 6, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(0, -46, 10); ctx.fill();
    ctx.fillStyle = '#e8434f'; bobStarPath(0, -46, 7, 3); ctx.fill();
    if (st.phase === 'ready' || st.phase === 'push') { ctx.fillStyle = '#5a5a78'; ctx.fillRect(-40, -78, 6, 18); ctx.fillRect(34, -78, 6, 18); ctx.fillRect(-40, -80, 18, 5); ctx.fillRect(22, -80, 18, 5); }
    if (s.brake && st.phase === 'run') { ctx.fillStyle = '#c9d6e3'; ctx.fillRect(-6, -4, 12, 8); }
    ctx.restore();
    // the brakeman running behind the sled is nearer: drawn last
    if (out(st.brake)) bobDrawRunner(st, st.brake, runPos(st.brake), seatFeet(st.brake), sp);
    // where each helmet top is on screen (name tags, prompts, the computer's speech bubbles)
    st.scr = st.scr || [{}, {}];
    for (const k of [0, 1]) {
      const R = st.r[k];
      let hx, hy, sc, cx, cy, hr;
      if (!out(k)) {
        // the helmet top (name tags) and the helmet's centre and radius (prompts beside it), leaning with the rider
        const h = bobHip(st, k), bh = 78 * (1 - R.tuck * 0.55), lift = bobHopLift(R), q = loc(h.x, h.y - lift + (R.tuck * 14 - bh - 22 - 25) * h.sc);
        const a = R.lean * 0.3, arm = (bh + 22 - R.tuck * 14) * h.sc, c2 = loc(h.x + Math.sin(a) * arm, h.y - lift - Math.cos(a) * arm);
        hx = q.X; hy = q.Y; sc = sp.sc * h.sc; cx = c2.X; cy = c2.Y; hr = 25 * sc;
      } else {
        const q = st.runDraw && st.runDraw[k] ? st.runDraw[k] : runPos(k);
        hx = q.X; hy = q.Y - 183 * K.runS * q.sc; sc = q.sc; hr = 25 * K.runS * q.sc; cx = hx; cy = hy + hr;
      }
      st.scr[k] = { x: hx, y: hy, sc, cx, cy, hr };
      const p = ps[k];
      p.x = hx - PW / 2; p.y = hy - 4; p.alive = true; p.face = 1; p.vx = 0; p.vy = 0;
    }
  }
  const bobHopLift = R => (R.hopT > 0 ? Math.sin(Math.PI * R.hopT / 0.32) * 26 : 0);
  function bobStarPath(x, y, ro, ri) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
  // one seated rider from behind, in sled-local units (hips at (x, y))
  function bobDrawRider(k, x, y, sc, R) {
    const col = PCOL[k], dark = PDARK[k], tuck = R.tuck, hop = bobHopLift(R);
    ctx.save(); ctx.translate(x, y - hop); ctx.scale(sc, sc);
    ctx.rotate(R.lean * 0.3);
    const bh = 78 * (1 - tuck * 0.55), hy = -bh - 22;
    ctx.translate(0, tuck * 14);
    // body (suit), arms, helmet
    ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 3.5;
    rr(-30, -bh, 60, bh + 20, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(-24, -bh + 6, 16, bh * 0.5, 8); ctx.fill();
    ctx.fillStyle = dark; ctx.fillRect(-4, -bh + 4, 8, bh - 4);
    // helmet: Bo has round ears, Pip a little sprout
    if (k === 1) { ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 3; circle(-18, hy - 16, 9); ctx.fill(); ctx.stroke(); circle(18, hy - 16, 9); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 3.5; circle(0, hy, 25); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-4, hy - 24, 8, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(-10, hy - 10, 8, 5, -0.5, 0, Math.PI * 2); ctx.fill();
    if (k === 0) { ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, hy - 25); ctx.lineTo(2, hy - 36); ctx.stroke(); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(9, hy - 39, 10, 5, -0.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  // a rider running and pushing (or hopping in: from the running spot up into the seat)
  function bobDrawRunner(st, k, rp, seatP, sp) {
    const R = st.r[k];
    let X = rp.X, Y = rp.Y, sc = rp.sc;
    const a = R.in ? R.hopA : 0;
    if (a > 0) {
      const e = a * a * (3 - 2 * a);
      X = rp.X + (seatP.X - rp.X) * e; Y = rp.Y + (seatP.Y - rp.Y) * e - Math.sin(Math.PI * a) * 40 * sc;
      sc = rp.sc + (sp.sc * 0.8 - rp.sc) * e;
    }
    st.runDraw = st.runDraw || [null, null]; st.runDraw[k] = { X, Y, sc };
    ctx.save(); ctx.translate(X, Y); ctx.scale(sc * K.runS, sc * K.runS);
    const ph = R.runPh, lunge = R.pushT > 0 ? Math.sin(Math.PI * R.pushT / 0.25) : 0;
    const col = PCOL[k], dark = PDARK[k];
    ctx.fillStyle = 'rgba(40,60,100,0.18)'; ctx.beginPath(); ctx.ellipse(0, 0, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
    // legs
    ctx.fillStyle = dark;
    const moving = st.s.v > 0.3 && a === 0;
    for (const sd of [-1, 1]) { const lift = moving ? Math.max(0, Math.sin(ph + (sd > 0 ? Math.PI : 0))) * 22 : 0; rr(sd * 14 - 8, -60 + (a > 0 ? -20 : 0), 16, 60 - lift, 7); ctx.fill(); }
    // body leaning forward when pushing
    ctx.save(); ctx.translate(0, -56); ctx.scale(1, 1 - 0.18 * lunge - (moving ? 0.1 : 0));
    ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 3.5;
    rr(-28, -80, 56, 86, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = dark; ctx.fillRect(-4, -76, 8, 78);
    if (k === 1) { ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 3; circle(-18, -118, 9); ctx.fill(); ctx.stroke(); circle(18, -118, 9); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 3.5; circle(0, -102, 25); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-4, -126, 8, 40);
    if (k === 0) { ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -127); ctx.lineTo(2, -138); ctx.stroke(); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(9, -141, 10, 5, -0.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    ctx.restore();
  }
  function bobDrawParts(st, v) {
    for (const q of st.parts) {
      const d = q.z - v.camZ;
      if (d < 3 || d > 200) continue;
      const p = v.T(d, q.x, q.y), r = clamp(q.size * p.s * 0.45, 1, q.kind === 'dot' ? 4.5 : 8);
      if (p.X < -20 || p.X > W + 20 || p.Y < -20 || p.Y > H + 20) continue;
      ctx.globalAlpha = clamp(q.life / q.max * 1.5, 0, 1); ctx.fillStyle = q.col;
      if (q.kind === 'conf') { ctx.fillRect(p.X - r, p.Y - r / 2, r * 2, r); }
      else if (q.kind === 'spark') { bobStarPath(p.X, p.Y, r * 1.6, r * 0.6); ctx.fill(); }
      else { circle(p.X, p.Y, r); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
  // gentle falling snow in front of everything (screen space)
  function bobDrawSnow(st) {
    if (!bobFlakes) { bobFlakes = []; for (let i = 0; i < 40; i++) bobFlakes.push({ x: hash(i, 41) % W, y: hash(i, 43) % H, r: 1.2 + (hash(i, 47) % 20) / 10, sp: 30 + hash(i, 53) % 50 }); }
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const drift = st.skyX * 6;
    for (const f of bobFlakes) {
      const x = ((f.x - drift * f.r * 0.3 + Math.sin(G.clock + f.y) * 10) % W + W) % W, y = ((f.y + G.clock * f.sp) % H + H) % H;
      circle(x, y, f.r); ctx.fill();
    }
  }
  function bobDrawPops(st) {
    const big = hudBig();
    // pops go beside the sled, never over the riders: the push start's on the right, the run's left and right in turn
    // (the "Ready... Set... GO!" count stays in the middle, above the riders' heads)
    const push = st.phase === 'ready' || st.phase === 'push';
    let mid = st.pops.filter(q => q.who < 0).length;
    const sx = st.scr && st.scr[0] && st.scr[0].x != null ? (st.scr[0].x + st.scr[1].x) / 2 : W / 2;
    for (const q of st.pops) {
      const count = st.phase === 'ready' || /^GO!/.test(q.s);
      let x = count ? W / 2 : push ? W / 2 + 290 : sx + q.side * 250 * (big ? 1.15 : 1), y = count ? 100 : push ? 330 : 250;
      if (q.who < 0) y -= --mid * 42 * (big ? 1.25 : 1);
      if (q.who >= 0 && st.scr && st.scr[q.who] && st.scr[q.who].x != null) { x = st.scr[q.who].x + (q.who === 0 ? -110 : 110) * (big ? 1.2 : 1); y = st.scr[q.who].y - 40; }
      y -= q.t * 36;
      ctx.globalAlpha = clamp((1.2 - q.t) / 0.3, 0, 1);
      bigText(q.s, clamp(x, 150, W - 150), clamp(y, 60, H - 120), q.size * (big ? 1.25 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- HUD ---------- */
  const FONT = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  // what each rider should do right now (the badges and the prompts over the heads)
  function bobNeeds(st) {
    const s = st.s, out = { lean: 0, leanNow: false, hair: null, tuck: null, bump: null, early: null, late: null };
    if (st.phase !== 'run') return out;
    const v = Math.max(8, s.v), ah = bobAhead(st, v * K.callEarly + 10);
    const cv = ah.find(f => f.kind === 'curve' || f.kind === 'hairpin');
    if (cv) {
      const tIn = cv.inside ? 0 : cv.dist / v;
      out.early = { dir: cv.dir, t: tIn, hair: cv.kind === 'hairpin', k: cv.k, i: cv.cv.i };
      if (tIn <= K.callLate || st.called === cv.cv.i) out.late = out.early;
      if (tIn <= 1.0) { out.lean = cv.dir; out.leanNow = cv.inside; }
      // S-bends: the flip shows a moment before the switch
      const nx = cv.cv.next;
      if (cv.inside && nx && (nx.z0 - s.z) / v <= K.flipCue) { out.lean = nx.dir; out.flip = true; out.early = { dir: nx.dir, t: 0, hair: false, k: nx.k, i: nx.i }; out.late = out.early; }
    }
    const hp = bobAhead(st, K.brakeSign + 10).find(f => f.kind === 'hairpin' && !f.inside);
    if (hp) out.hair = { t: hp.dist / v, d: hp.dist };
    const tk = ah.find(f => f.kind === 'tuck');
    if (tk && (tk.inside || tk.dist / v < 1.2)) out.tuck = tk;
    const bp = ah.find(f => f.kind === 'bump');
    if (bp && bp.dist / v < 1.6) out.bump = { t: bp.dist / v };
    return out;
  }
  function bobHud(st) {
    const big = hudBig(), z = big ? 1.4 : 1, ps = G.players, s = st.s, t = G.clock, play = G.mode === 'play' || G.mode === 'paused';
    // top right: this run's clock and the speed
    let timeX0 = W - 14;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28;
      const tm = st.phase === 'ready' ? '0:00.0' : st.phase === 'finish' ? fmtTime(st.lastRunT || 0) : fmtTime(G.time - st.runStart);
      const sp = Math.round(s.v * 3.6) + ' km/h';
      ctx.font = FONT(fs);
      const tw = ctx.measureText(tm).width, sw = ctx.measureText(sp).width, w = tw + sw + fs * 1.6 + 30;
      const x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, C.paper, 'left', 'body');
      text(sp, x0 + w - 15, cy, fs, s.v >= K.tuckOne ? '#8fd3ff' : '#c8f1ff', 'right', 'body');
      timeX0 = x0;
      // gold help in force
      if (st.lucky) {
        const lh = big ? 30 : 24, lw = (big ? 170 : 124);
        pill(W - 14, 12 + h + 6, lw, lh, 'right');
        text('Lucky rails', W - 14 - lw / 2, 12 + h + 6 + lh / 2 + 0.5, big ? 17 : 13, C.gold, 'center', 'body');
      }
    }
    if (!play) return;
    const nd = bobNeeds(st);
    // the badges, bottom corners (Pip left, Bo right)
    // (at the push start only the push chip matters: narrower badges with no lean arrows leave room for the beat bar)
    const start = st.phase === 'ready' || st.phase === 'push';
    const pw = Math.round((start ? 200 : 250) * z), ph = Math.round(58 * z), py = H - ph - 10;
    for (const id of [0, 1]) {
      const pilot = id === st.pilot, px = id === 0 ? 12 : W - 12 - pw, cpuSeat = bobQuiet(id), R = st.r[id], inp = ps[id].input;
      ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
      ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
      text(NAMES[id] + (pilot ? ' · Pilot (front)' : ' · Brakeman (back)') + (cpuSeat ? ' · CPU' : ''), px + 12 * z, py + 14 * z, 13 * z, PCOL[id], 'left', 'body');
      // lean arrows
      const ay = py + 26 * z, ah = 24 * z, aw = 30 * z;
      for (const d of start ? [] : [-1, 1]) {
        const ax = px + 12 * z + (d > 0 ? aw + 5 * z : 0), held = (d > 0 ? inp.right : inp.left), want = nd.lean === d;
        ctx.fillStyle = held ? PCOL[id] : want ? (Math.sin(t * 14) > -0.3 ? C.gold : 'rgba(255,197,61,0.5)') : 'rgba(255,255,255,0.12)';
        rr(ax, ay, aw, ah, 8 * z); ctx.fill();
        text(cpuSeat ? bobArrow(d) : bobDirKey(id, d), ax + aw / 2, ay + ah / 2 + 0.5, 13 * z, held || want ? C.ink : '#d9d3ef', 'center', 'body');
      }
      // the job chip (and tuck / hop when they matter)
      const cx0 = start ? px + 12 * z : px + 12 * z + 2 * aw + 14 * z, cw = px + pw - 12 * z - cx0;
      const chip = (label, on, now) => {
        ctx.fillStyle = on ? (now && Math.sin(t * 14) > -0.3 ? C.gold : 'rgba(255,197,61,0.6)') : 'rgba(255,255,255,0.12)';
        rr(cx0, ay, cw, ah, ah / 2); ctx.fill();
        ctx.font = FONT(12 * z);
        let fs = 12 * z; while (fs > 8 && ctx.measureText(label).width > cw - 10) { fs -= 0.5; ctx.font = FONT(fs); }
        text(label, cx0 + cw / 2, ay + ah / 2 + 0.5, fs, on ? C.ink : '#d9d3ef', 'center', 'body');
      };
      const key = w => (cpuSeat ? '' : bobKey(id, w) + ' ');
      if (st.phase === 'ready' || st.phase === 'push') {
        if (R.in) chip('In the sled!', false, false);
        else if (st.phase === 'push' && s.z >= -K.hopLen) chip(key('hop') + 'HOP IN!', true, true);
        else chip(key('act') + 'push on the beat', st.phase === 'push', st.phase === 'push' && bobBeatGlow(st) > 0.5);
      } else if (st.phase === 'finish') chip('Finish!', false, false);
      else if (!pilot && nd.hair) chip(key('act') + 'BRAKE!', true, !s.brake && nd.hair.d < K.brakeSign);
      else if (nd.tuck) chip(key('tuck') + 'TUCK', true, nd.tuck.inside && !inp.down);
      else if (nd.bump) chip(key('hop') + 'HOP together', true, nd.bump.t < 0.8);
      else if (pilot) {
        const e = nd.early;
        if (e) chip((e.hair ? 'Hairpin ' : 'Next ') + bobArrow(e.dir) + (e.t > 0.05 ? ' ' + e.t.toFixed(1) + 's' : ' now!') + (cpuSeat ? '' : ' · ' + bobKey(id, 'act') + ' call'), true, e.t < 1);
        else chip(key('left') .trim() + ' ' + key('right') + 'steer to rings', false, false);
      } else {
        if (nd.hair) chip(key('act') + 'BRAKE!', true, !s.brake);
        else if (nd.late) chip('Lean ' + bobArrow(nd.late.dir) + (nd.late.t > 0.05 ? ' soon' : ' now!'), true, nd.late.t < 0.6);
        else chip(key('act') + 'brake at hairpins', s.brake, false);
      }
    }
    // the beat bar (push start), above the badges in the middle
    if (start) bobBeatBar(st, z, pw + 12);
    // the message line: in the top row when it fits, otherwise under the room pill
    if (st.msg) {
      let fs = big ? 19 : 14;
      const h = big ? 32 : 26;
      ctx.font = FONT(14);
      const left = 14 + ctx.measureText(levelCode(G.levelIndex) + ' · ' + G.level.def.name).width + 28 + 10, right = timeX0 - 10;
      ctx.font = FONT(fs);
      let w = ctx.measureText(st.msg.text).width + 30, cx = W / 2, y = 12;
      if (w <= right - left) cx = clamp(cx, left + w / 2, right - w / 2);
      else { y = big ? 84 : 80; while (w > W - 40 && fs > 11) { fs--; ctx.font = FONT(fs); w = ctx.measureText(st.msg.text).width + 30; } }
      ctx.globalAlpha = clamp((st.msg.life - st.msg.t) / 0.3, 0, 1);
      pill(cx, y, w, h, 'center'); text(st.msg.text, cx, y + h / 2 + 0.5, fs, st.msg.col, 'center', 'body'); ctx.globalAlpha = 1;
    }
    if (G.introT > 0) return;
    // prompts beside the heads, in each rider's colour: Pip's open to the left and Bo's to the right (the same sides
    // as their badges, whichever seat they're in), each at its own rider's helmet
    const fs = 14 * z, yMax = py - 8;
    const say = (id, str, col, pulse) => {
      if (bobQuiet(id) || !st.scr || !st.scr[id] || st.scr[id].x == null) return;
      ctx.font = FONT(fs);
      const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, left = id === 0;
      const o = st.scr[id], hx = o.cx, y = clamp(o.cy - h / 2, 92, yMax - h), gap = o.hr + 8 * z;
      const x = clamp(left ? hx - gap - w : hx + gap, 4, W - w - 4);
      const sc = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
      ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 3; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
      text(str, 0, 0.5, fs, col, 'center', 'body');
      ctx.restore();
    };
    const tint = id => (id === 0 ? '#ffd2a8' : '#cfe6ff');
    // on a controller or touch both riders' keys look the same, so the prompt names the rider
    const who = id => (actKey(id) === 'kb' ? '' : NAMES[id] + ': ');
    for (const id of [0, 1]) {
      const h = st.hints[id], inp = ps[id].input;
      const needLean = st.phase === 'run' && !st.afk && nd.lean && bobLeanOf(st, id) !== nd.lean;
      // (a lean prompt wins over other tips: it's the one that matters right now)
      if (h && !(needLean && !/^Lean/.test(h.text))) { say(id, h.text, tint(id), false); continue; }
      if (st.phase !== 'run' || st.afk) continue;
      if (needLean) say(id, who(id) + (nd.flip ? 'Flip ' : 'Lean ') + bobDirKey(id, nd.lean) + '!', C.gold, nd.leanNow || nd.flip);
      else if (nd.tuck && nd.tuck.inside && !inp.down) say(id, 'Tuck ' + bobKey(id, 'tuck') + '!', '#8fd3ff', true);
      else if (nd.bump && nd.bump.t < 0.9 && G.time - st.hopP[id] > 0.6) say(id, 'Hop ' + bobKey(id, 'hop') + '!', C.gold, true);
      else if (id === st.brake && nd.hair && nd.hair.d < K.brakeSign && s.v > K.hpMax + K.hpTol && !s.brake) say(id, 'Brake! ' + bobKey(id, 'act'), '#ff8a8a', true);
    }
  }
  const bobBeatGlow = st => { if (st.phase !== 'push') return 0; const f = (st.pt / K.beat) % 1; return Math.max(0, 1 - Math.min(f, 1 - f) * 2 / (K.beatWin * 2 / K.beat)); };
  function bobBeatBar(st, z, pw) {
    const w = Math.round(Math.min(300 * z, W - 2 * pw - 40)), h = Math.round(30 * z), x0 = W / 2 - w / 2, y0 = H - 10 - h - 4 * z;
    ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(x0, y0, w, h, h / 2); ctx.fill();
    const live = st.phase === 'push', ph = live ? st.pt / K.beat : st.readyT / K.beat - 2;
    // beat marks every 1/4 of the bar; the dot sweeps one beat per mark, flashing on each beat
    const n = 4, span = w - 84 * z, mx = k => x0 + 42 * z + span * k / n;
    for (let k = 0; k <= n; k++) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; circle(mx(k), y0 + h / 2, 4 * z); ctx.fill(); }
    const fr = ((ph % n) + n) % n, dx = mx(0) + span * fr / n, glow = live ? bobBeatGlow(st) : 0;
    ctx.fillStyle = glow > 0.3 ? C.gold : '#ffffff'; circle(dx, y0 + h / 2, (7 + 5 * glow) * z); ctx.fill();
    text(live ? 'PUSH on the beat!' : 'Get ready...', W / 2, y0 - 10 * z, 13 * z, C.gold, 'center', 'body');
    // each pusher's last push: a tick in their colour (gold ring when on the beat)
    for (const k of [0, 1]) {
      if (st.r[k].in || st.pushBeat[k] < 0 || !live) continue;
      const age = st.pt - st.pushBeat[k] * K.beat;
      if (age > K.beat * 1.2) continue;
      ctx.globalAlpha = clamp(1 - age / (K.beat * 1.2), 0, 1);
      ctx.strokeStyle = st.pushOn[k] ? C.gold : 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3 * z;
      circle(x0 + (k === 0 ? 17 * z : w - 17 * z), y0 + h / 2, 8 * z); ctx.stroke();
      ctx.fillStyle = PCOL[k]; circle(x0 + (k === 0 ? 17 * z : w - 17 * z), y0 + h / 2, 5 * z); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // the medal: by the total time against the course par (a clean, perfect pair) and the number of Whoas
  function bobMedal(tot, whoas) {
    const def = LEVELS[G.levelIndex], par = (def.rooms || []).reduce((a, r) => a + (r.par || 50), 0);
    const g = tot <= par * K.goldX, sv = tot <= par * K.silverX;
    if (g && whoas <= K.goldWhoas) return { medal: 'Gold' };
    if (sv && whoas <= K.silverWhoas) return { medal: 'Silver', whoaCut: g };
    return { medal: 'Bronze', whoaCut: sv };
  }

  /* ---------- the mode ---------- */
  // the course par: the room pars summed (a clean, perfect pair), for the medal times
  const bobPar = () => ((LEVELS.find(l => l.mode === 'bobsled') || {}).rooms || []).reduce((a, r) => a + (r.par || 50), 0);
  MODES.bobsled = {
    // medal goals (js/medals.js): the summed run times against the course par (K.goldX and friends), and the Whoas
    medals: { bronze: 'Slide down all four runs', goals: [
      { key: 'time', gold: bobPar() * K.goldX, silver: bobPar() * K.silverX },
      { key: 'whoas', gold: K.goldWhoas, silver: K.silverWhoas, word: 'Whoa' },
    ] },
    medalValues() {
      const s = G.mst.stats;
      if (!s) return {};
      return { time: s.runT.filter(x => x != null).reduce((a, b) => a + b, 0), whoas: s.whoas };
    },
    BOB,
    api: { medal: bobMedal, compile: bobCompile, ahead: bobAhead, curveAt: bobCurveAt, tuckAt: bobTuckAt, leanOf: bobLeanOf, pose: bobPose, key: bobKey, needs: bobNeeds },
    setup(st, L) {
      st.stats = { runT: [], curves: 0, smooth: 0, whoas: 0, rings: 0, ringN: 0, together: 0, pushes: [0, 0], onBeat: [0, 0], late: 0, startV: 0,
        tucks: 0, airs: 0, brakes: 0, tooFast: 0, calls: 0, lucky: 0 };
      bobRoom(st, L, 0);
    },
    room(k, L) { bobRoom(G.mst, L, k); },
    step(dt) { for (const p of G.players) p.alive = true; bobStep(G.mst, dt); },
    // the engine draws the players between draw() and drawTop(): they are hidden then (the mode draws the riders)
    draw() {
      const st = G.mst;
      if (!st.s) return;
      const v = bobView(st);
      bobDrawSky(st);
      bobDrawTrack(st, v);
      bobDrawParts(st, v);
      bobDrawSnow(st);
      st.hid = true;
      for (const p of G.players) p.alive = false;
    },
    drawTop() {
      const st = G.mst;
      // (while the start card is up the engine's name tags would sit on the card: the badges name the riders)
      if (st.hid) { for (const p of G.players) p.alive = !(G.introT > 0); st.hid = false; }
      if (!st.s) return;
      bobDrawPops(st);
    },
    hud() { const st = G.mst; if (st.s) bobHud(st); },
    stats() {
      const s = G.mst.stats;
      if (!s) return [];
      const runs = s.runT.filter(x => x != null), tot = runs.reduce((a, b) => a + b, 0);
      const out = [
        { label: 'Smooth curves', value: s.smooth + ' of ' + s.curves },
        { label: 'Snow rings', value: s.rings + ' of ' + s.ringN },
        { label: 'Best push start', value: Math.round(s.startV * 3.6) + ' km/h' },
        { label: 'Whoas', value: s.whoas },
      ];
      const m = bobMedal(tot, s.whoas);
      const words = m.medal === 'Gold' ? 'Fastest sled on the mountain!' : m.whoaCut ? 'Fewer Whoas for ' + (m.medal === 'Silver' ? 'gold!' : 'silver!') : m.medal === 'Silver' ? 'Lean together for gold!' : 'You made it down together!';
      out.push(words + (runs.length ? ' · Runs ' + runs.map(fmtTime).join(' · ') : ''));
      return out;
    },
  };

  /* ---------- sounds ---------- */
  Sfx.extra.bobsledBeat = function () { this.tone(1046, 0.05, 'square', 0.025); this.tone(130, 0.08, 'triangle', 0.06, 90); };
  Sfx.extra.bobsledGo = function () { this.tone(523, 0.12, 'square', 0.045); this.tone(784, 0.35, 'square', 0.045, null, 0.1); this.tone(1046, 0.4, 'triangle', 0.04, null, 0.1); };
  Sfx.extra.bobsledPush = function (p) { this.tone(220 * p, 0.09, 'triangle', 0.07, 330 * p); this.tone(880 * p, 0.05, 'square', 0.02); };
  Sfx.extra.bobsledPushOff = function (p) { this.tone(180 * p, 0.08, 'triangle', 0.05, 150 * p); };
  Sfx.extra.bobsledTogether = function () { [523, 659, 784].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.05, null, i * 0.04)); this.tone(196, 0.12, 'triangle', 0.08, 300); };
  Sfx.extra.bobsledHop = function (p) { this.tone(300 * p, 0.14, 'sine', 0.07, 700 * p); };
  Sfx.extra.bobsledScramble = function () { [0, 0.06, 0.12].forEach((d, i) => this.tone(420 - i * 60, 0.06, 'square', 0.03, 300, d)); this.tone(300, 0.2, 'sine', 0.05, 600, 0.18); };
  Sfx.extra.bobsledCall = function (p) { this.tone(660 * p, 0.06, 'square', 0.035); this.tone(990 * p, 0.08, 'triangle', 0.035, null, 0.05); };
  Sfx.extra.bobsledSmooth = function () { this.tone(700, 0.18, 'sine', 0.04, 1400); this.tone(1175, 0.1, 'triangle', 0.035, null, 0.1); };
  Sfx.extra.bobsledWobble = function () { for (let i = 0; i < 4; i++) this.tone(i % 2 ? 300 : 360, 0.06, 'triangle', 0.04, null, i * 0.06); };
  Sfx.extra.bobsledWhoa = function () { this.tone(500, 0.35, 'sawtooth', 0.025, 900); this.tone(900, 0.3, 'sine', 0.04, 300, 0.25); };
  Sfx.extra.bobsledGood = function () { this.tone(880, 0.08, 'triangle', 0.045); this.tone(1175, 0.1, 'triangle', 0.04, null, 0.06); };
  Sfx.extra.bobsledRing = function () { [1319, 1760, 2093].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.045, null, i * 0.04)); };
  Sfx.extra.bobsledAir = function () { this.tone(330, 0.4, 'sine', 0.05, 990); [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, 0.15 + i * 0.06)); };
  Sfx.extra.bobsledBump = function () { this.tone(160, 0.16, 'square', 0.05, 80); this.tone(300, 0.06, 'triangle', 0.05, 200, 0.04); };
  Sfx.extra.bobsledLand = function () { this.tone(140, 0.1, 'triangle', 0.07, 80); };
  Sfx.extra.bobsledFinish = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, 'square', 0.04, null, i * 0.08)); };
  Sfx.extra.bobsledLucky = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
  Sfx.extra.bobsledBrrr = function () { for (let i = 0; i < 7; i++) this.tone(i % 2 ? 470 : 540, 0.045, 'square', 0.022, null, 0.05 + i * 0.045); };
}
/* ===== end of MODES.bobsled ===== */
