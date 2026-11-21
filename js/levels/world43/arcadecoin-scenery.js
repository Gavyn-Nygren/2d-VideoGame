/* Pip & Bo - 43-1 Coin Drop: the 3D scene. Inside an old arcade machine at night, at hero size: the darkness of the
   cabinet, its lamps and glows, the pixel creatures who live in it, dust in the light; the chute and everything on it
   (arcadecoin-chute.js); the coins and riders (arcadecoin-coins.js); the opening in the arcade (arcadecoin-opening.js);
   each stretch's world (arcadecoin-stretch1.js, the coin chute; arcadecoin-city.js, Circuit City); the camera; and the
   flat things drawn over the picture. Display only: it reads the rules' state (G.mst) and never changes it.

   ARCADECOIN_SCENE.build(K, st)       once per scene
   ARCADECOIN_SCENE.update(K, st, dt)  every drawn frame
   ARCADECOIN_SCENE.drawTop(st)        the controls during the fall, "pop the bubble!", little words
   ARCADECOIN_SCENE.camOverride = { eye, at, fov }   the look-shot tools hold the camera still with this */
'use strict';

const ARCADECOIN_SCENE = (function () {
  const T = K3D.T, PR = ARCADECOIN_ROUTE, R = PR.R, L = PR.lists, A = PR.at;
  const vv = a => new T.Vector3(a[0], a[1], a[2]);
  const sm = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

  /* ---------- build ---------- */
  function build(K, st) {
    ARCADE.seed(4301);
    ARCADE.dark(K, { fogD: 0.0072, bloom: 1.05, ambK: 0.3, keyK: 0.36, hemiK: 0.26 });
    const sc = { K, t: 0 };
    K.arcSc = sc;
    sc.B = ARCADE.lights(K, 40000);
    sc.G = ARCADE.glows(K, 12000);
    sc.crit = ARCADE.critters(K, 4000);
    sc.motes = ARCADE.motes(K, { n: 3200, box: 50, pixels: 0.2 });
    sc.lamps = ARCADECOIN_LIFE.lamps(K, 6);
    sc.ch = ARCADECOIN_CHUTE.build(K, sc);
    if (typeof ARCADECOIN_STRETCH1 !== 'undefined') sc.s1 = ARCADECOIN_STRETCH1.build(K, sc);
    if (typeof ARCADECOIN_CITY !== 'undefined') sc.city = ARCADECOIN_CITY.build(K, sc);
    if (typeof ARCADECOIN_OPENING !== 'undefined') sc.op = ARCADECOIN_OPENING.build(K, sc);
    sc.coins = ARCADECOIN_COINS.build(K);
    sc.B.done(); sc.G.done(); sc.crit.done();
    K3D.bake(K.root);
    sc.cam = K3D.cams.ride({ fov: 56, k: 4.2, kUp: 4 });
    sc.cam.snap();
    return sc;
  }

  /* ---------- the play camera ----------
     Behind and above the pair, looking down the chute; it slides across toward the pair's middle and backs off as they
     spread, so both coins always stay in the picture. It leans with the chute's bank (a little), looks down into the
     long fall, rises for a springboard's flight. */
  const pairX = st => {
    const xs = st.c.map(c => (c.state === 'bubble' ? c.bx : c.x));
    return { mid: (xs[0] + xs[1]) / 2, spread: Math.abs(xs[1] - xs[0]) };
  };
  function shotFor(st) {
    const s = Math.max(0.5, st.s), { mid, spread } = pairX(st), w = PR.w(s);
    const o = { back: 8.6 + spread * 0.22 + (w > 6.5 ? 1.5 : 0), height: 4.3 + spread * 0.14, ahead: 11, roll: 0.45 };
    // the long fall: the eye rises and looks down past the coins into the gear works
    const fall = sm(A.brink - 4, A.brink + 6, s) * (1 - sm(A.gears - 10, A.gears + 2, s));
    o.height += fall * 7; o.back -= fall * 3; o.ahead -= fall * 5;
    // a springboard flight: up and back to show the gap and the landing
    if (st.fly) { const u = Math.min(1, st.fly.t / st.fly.dur), k = Math.sin(u * Math.PI); o.height += k * (2.4 + L.springs[st.fly.i].big * 1.5); o.back += k * 2.5; o.ahead += k * 4; }
    if (st.hold) { o.height += 0.8; o.back += 0.6; }
    const sh = RAIL3.shot(R, s, o);
    // (at the very start there is no rail behind the pair: carry the eye on back past the top of the chute)
    const under = o.back - s; if (under > 0) { const f0 = R.at(0); for (let k = 0; k < 3; k++) sh.eye[k] -= f0.t[k] * under; }
    const fe = R.at(Math.max(0, s - o.back)), f = R.at(s);
    for (let k = 0; k < 3; k++) { sh.eye[k] += fe.br[k] * mid * 0.7; sh.at[k] += f.br[k] * mid * 0.85; }
    sh.fov = 56 + Math.min(8, spread * 0.6) + (w > 6.5 ? 3 : 0);
    return sh;
  }

  /* ---------- every frame ---------- */
  function update(K, st, dt) {
    const sc = K.arcSc; if (!sc) return;
    sc.t += dt;
    ARCADECOIN_CHUTE.update(K, sc.ch, st, dt);
    ARCADECOIN_COINS.pose(K, sc.coins, st, dt);
    if (sc.s1) ARCADECOIN_STRETCH1.update(K, sc.s1, st, dt);
    if (sc.city) ARCADECOIN_CITY.update(K, sc.city, st, dt);
    // the air clears over Circuit City (so its skyline shows right out to the edge of the board)
    { const A = ARCADECOIN_ROUTE.at, inCity = st.phase !== 'intro' && st.s > A.city - 50 && st.s < A.box + 10, f = K.scene.fog, jump = sc.fogS == null || Math.abs(st.s - sc.fogS) > 30; sc.fogS = st.s; if (f) f.density += ((inCity ? 0.0042 : 0.0072) - f.density) * (jump ? 1 : Math.min(1, dt * 1.2)); }
    if (sc.op) ARCADECOIN_OPENING.update(K, sc.op, st, dt);
    // the creatures watch the heroes go by, cheer a sweep, duck a jump
    const cp = sc.coins.coins[0].g.position.clone().lerp(sc.coins.coins[1].g.position, 0.5);
    const lastHop = Math.max(st.c[0].hopT, st.c[1].hopT);
    sc.crit.react({ hero: [cp.x, cp.y, cp.z], cheer: st.t - (sc.coins.lastSweep || -99), duck: st.t - lastHop });
    // the camera
    let sh;
    if (ARCADECOIN_SCENE.camOverride) sh = Object.assign({ up: [0, 1, 0] }, ARCADECOIN_SCENE.camOverride);
    else if (st.phase === 'intro' && sc.op) sh = ARCADECOIN_OPENING.shot(K, sc.op, st);
    else if (st.phase === 'start' || st.phase === 'done') {
      // the finish: round the START button, the riders on top
      const u = Math.min(1, st.phaseT / 2.5), c = vv(R.bankLocal(A.start + 6, 0, 0)), a = 1.2 + st.phaseT * 0.25;
      sh = { eye: [c.x + Math.cos(a) * (16 - u * 4), c.y + 7 + u * 2, c.z + Math.sin(a) * (16 - u * 4)], at: [c.x, c.y + 1, c.z], up: [0, 1, 0], fov: 50 };
    } else sh = shotFor(st);
    if (st.phase === 'intro' && sc.op && sc.op.snapNext) { sc.cam.snap(); sc.op.snapNext = false; }
    if (sc.prevPhase === 'intro' && st.phase === 'ride') sc.cam.snap();
    if (sc.prevPhase === 'restart' && st.phase === 'ride') sc.cam.snap();
    sc.prevPhase = st.phase;
    sc.cam.update(K, dt, null, sh);
    const foc = st.phase === 'intro' && sc.op ? sc.op.focus : cp;
    sc.lamps.update(foc, sc.t);
    K.focus.copy(foc); K.focusRange = 26;
  }

  /* ---------- flat things over the picture ---------- */
  function drawTop(st) {
    const sc = K3D.K && K3D.K.arcSc; if (!sc) return;
    if (st.phase === 'intro' && sc.op) ARCADECOIN_OPENING.drawTop(sc.op, st);
    // a bubble: tell the partner to pop it
    if (st.phase === 'ride') for (const k of [0, 1]) {
      const c = st.c[k], o = st.c[1 - k];
      if (c.state !== 'bubble' || o.state !== 'ride' || c.boff > 2.4) continue;
      const cc = sc.coins.coins[k], p = cc.bub.mesh.position, q = K3D.toScreen(p.x, p.y + 1.4, p.z);
      if (q.z > 1) continue;
      const a = 0.75 + Math.sin(G.clock * 8) * 0.25;
      ctx.save(); ctx.globalAlpha = a;
      text(NAMES[1 - k] + ': steer into the bubble!', q.x, q.y - 6, 17, '#ffffff', 'center');
      ctx.restore();
    }
    if (st.phase === 'restart') { ctx.save(); ctx.globalAlpha = Math.min(1, st.phaseT * 3); text('Both coins down! Back to the last ring...', W / 2, 150, 24, '#fff6dc', 'center'); ctx.restore(); }
    // a few words for the moments
    const last = st.fx.length && st.fx[st.fx.length - 1];
    if (last && st.phase === 'ride') {
      const age = st.t - last.t, word = (txt, col, size = 30) => { ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, (1.1 - age) * 3)); text(txt, W / 2, 168 - Math.min(0.3, age) * 30, size, col, 'center'); ctx.restore(); };
      if (last.k === 'sweep' && age < 1.1) word('SWEEP!', '#ffe08a', 34);
      if (last.k === 'zap' && age < 1.1) word('ZAP!', '#e8ff7a');
      if (last.k === 'gate' && age < 1.1) word('Gate open!', '#ffd24a', 24);
      if (last.k === 'snap' && age < 1.1) word('The spark snapped! Get close again', '#ffb08a', 22);
      if (last.k === 'rejoin' && age < 1.1) word('Linked!', '#fff3c4', 24);
      if (last.k === 'spring' && age < 1.1) word('BOING!', '#ffd24a', 34);
      if (last.k === 'springfail' && age < 1.1) word('Too late! Hit it together', '#ffb08a', 22);
      if (last.k === 'pop' && age < 1.1) word('Pop! Back on board', '#ffffff', 24);
    }
  }

  return { build: (K, st) => build(K, st), update, drawTop, shotFor, camOverride: null };
})();
