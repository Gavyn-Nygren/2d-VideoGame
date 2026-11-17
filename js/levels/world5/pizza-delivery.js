/* Pip & Bo - Level 5-2 Pizza Delivery (team). */
'use strict';

/* ===== 5-2 Pizza Delivery (mode 'pizza', World 5 "Road Trip", teamwork) =====================================
   Gavyn's rework (Nov 2026): no hold button and no hopping. Pip and Bo carry ONE tray with a stack of pizza boxes
   up and down a hilly town, and the whole game is keeping the tray level: each of them raises (▲) or lowers (▼)
   their own end. Uphill the back one raises and the front one lowers; downhill the other way round. A tilted tray
   makes the stack slide toward its low end, and a pizza is only ever lost by sliding off. Low awnings need both
   ends lowered, jumping dogs need the tray raised high, and wind gusts on the last street need the tray tilted
   into the wind.
   def.ownStep + ownHUD: the mode runs its own physics and camera. Each room is a long scrolling street built from
   its def.course (see pzBuild). The engine grid is only the spawns; players are mirrored in screen space.
   Everything lives in this block: only MODES.pizza and Sfx.extra.pz* are visible outside it. */
{
  const PZ = {
    span: 90,                                   // tray: horizontal distance between the holders (rigid)
    walk: 140, lowWalk: 115, acc: 340, dec: 480,
    stepUp: 13, g: 2000, maxFall: 900,
    handUp: 36,                                 // hand height above the feet with arms at rest
    liftMin: -26, liftMax: 20, liftRate: 80,    // raise up to 26 px, lower up to 20 px, 80 px/s (it stays where you leave it)
    trayTh: 7, boxH: 10, boxW: 40,
    // the slide (s: 0 centred, +-1 = the top box goes over the edge)
    dead: 0.06, kSlide: 9, dSlide: 2.2, dLevel: 7, settle: 0.1, svMax: 2.5,
    hf0: 0.55, hf1: 0.09,                       // taller stacks slide quicker: hf(n) = hf0 + hf1 * n
    cAcc: 0.9, jBump: 0.08, jLand: 0.05, jAwning: 0.25, jDog: 0.4, lostTo: 0.55, grace: 0.6,
    warnS: 0.45,
    // dogs: jump at the tray while it is near; they reach dogReach px above their ground
    dog: { near: 150, period: 1.5, air: 0.62, reach: 56 },
    // wind gusts (accel on the slide while in the zone; the whistle warns 1 s before each gust)
    wind: { period: 4.4, warn: 1.0, gust: 1.7, ramp: 0.3, force: 1.25, calmAfter: 3, calmMul: 0.8, calmMin: 0.5 },
    deliverR: 45, deliverV: 40, deliverHold: 0.3,
    failT: 1.6, reliefMax: 2, reliefLate: 3, reliefLateAt: 4,
    afkT: 8, groundScreen: 392,
  };
  const PZ_NOIN = Object.freeze({ left: false, right: false, jump: false, down: false, up: false, act: false });
  const PZ_FACADES = ['#f2c9b6', '#cfe3c8', '#f4e2ad', '#cbd7ec', '#ebcadf', '#e8d7bf', '#c3e2dc', '#f0d3c0', '#d8cdea'];
  const PZ_ROOFS = ['#b8664e', '#7d6a9e', '#4f7f80', '#a5694f', '#8a5a44'];
  const PZ_TRIMS = ['#ffffff', '#fff6e4', '#f7efe0'];
  const PZ_SHUTTERS = ['#4f7f80', '#c0583c', '#5b7bb5', '#8a6fb0', '#6b9a5a'];
  const pzHf = n => PZ.hf0 + PZ.hf1 * n;
  const pzRand = () => MODES.pizza.rand();
  const pzSum = a => a.reduce((s, v) => s + (v || 0), 0);
  const pzPuff = (x, y, n, col) => { if (G.particles.length < 500) puff(x, y, n, col); };
  const pzBurst = (x, y, col, n) => { if (G.particles.length < 500) burst(x, y, col, n); };
  const pzRumble = (s, w, ms, id) => { if (id === undefined) { rumble(0, s, w, ms); rumble(1, s, w, ms); } else rumble(id, s, w, ms); };
  const pzShake = v => { if (!reduceMotion) G.shake = Math.max(G.shake, v); };
  const pzCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
  const pzSmooth = u => u * u * (3 - 2 * u);

  /* ---------- the street: a heightfield built from the room's course ----------
     f300          flat, 300 px
     u400:60       a smooth slope over 400 px rising 60 px (negative falls)
     r200:-40      a straight ramp over 200 px (here falling 40 px)
     h360:50       a hump: up 50 px and back down over 360 px;  v300:40  a dip
     bridge420:60  a hump drawn as a stone bridge over a canal
     s6:10:28      stairs: 6 steps, each 10 px up (negative: down) after 28 px of tread
     b             a speed bump (a little jolt)
     a220:80       an awning over the next 220 px, its edge 80 px over the ground here
     dog           a dog in a yard, jumping at the tray as it passes
     wind700       wind gusts over the next 700 px
     S:Some text   a signboard here
     E             the customer's house (the end of the street)                                          */
  function pzBuild(def) {
    const g = [], R = { awn: [], dogs: [], signs: [], bumps: [], stairs: [], bridges: [], slopes: [], wind: null, door: null, len: 0 };
    let y = 450;
    const put = v => g.push(v);
    for (const tok of def.course) {
      const x = g.length;
      if (tok.startsWith('S:')) { R.signs.push({ x, text: tok.slice(2) }); continue; }
      if (tok === 'b') { for (let i = 0; i < 30; i++) put(y - 7 * Math.sin(Math.PI * (i + 0.5) / 30)); R.bumps.push({ cx: x + 15, x0: x }); continue; }
      if (tok === 'dog') { R.dogs.push({ x: x + 10, t: 0, air: -1, hit: false, woofT: 0, k: R.dogs.length }); continue; }
      if (tok === 'E') {
        for (let i = 0; i < 420; i++) put(y);
        R.door = { cx: x + 150, x: x + 120, y: y - 60, w: 60, h: 60 };
        continue;
      }
      let m;
      if ((m = /^f(\d+)$/.exec(tok))) { for (let i = 0; i < +m[1]; i++) put(y); continue; }
      if ((m = /^wind(\d+)$/.exec(tok))) { R.wind = { x0: x, x1: x + +m[1], dir: -1 }; continue; }
      if ((m = /^a(\d+):(\d+)$/.exec(tok))) { R.awn.push({ x0: x, x1: x + +m[1], y: y - +m[2], k: R.awn.length }); continue; }
      if ((m = /^([urhv]|bridge)(\d+):(-?\d+)$/.exec(tok))) {
        const kind = m[1], n = +m[2], d = +m[3], y0 = y;
        for (let i = 0; i < n; i++) {
          const u = (i + 0.5) / n;
          if (kind === 'u') put(y0 - d * (1 - Math.cos(Math.PI * u)) / 2);
          else if (kind === 'r') put(y0 - d * u);
          else if (kind === 'v') put(y0 + d * (1 - Math.cos(2 * Math.PI * u)) / 2);
          else put(y0 - d * (1 - Math.cos(2 * Math.PI * u)) / 2);
        }
        if (kind === 'u' || kind === 'r') { y = y0 - d; R.slopes.push({ x0: x, x1: x + n, d }); }
        if (kind === 'bridge') R.bridges.push({ x0: x, x1: x + n, y: y0, h: d });
        continue;
      }
      if ((m = /^s(\d+):(-?\d+):(\d+)$/.exec(tok))) {
        const n = +m[1], rise = +m[2], run = +m[3];
        const st = { x0: x, n, rise, run, y0: y, tread: [] };
        for (let k = 0; k < n; k++) {
          // going up: the step face comes first; going down: the tread first
          if (rise > 0) y -= rise;
          st.tread.push({ x: g.length, y });
          for (let i = 0; i < run; i++) put(y);
          if (rise < 0) y -= rise;
        }
        st.x1 = g.length; st.y1 = y;
        R.stairs.push(st);
        continue;
      }
      console.warn('Pizza Delivery: unknown course piece', tok);
    }
    R.g = Float32Array.from(g);
    R.len = g.length;
    R.awn.sort((a, b) => a.x0 - b.x0);
    return R;
  }
  const pzGAt = (R, x) => R.g[clamp(Math.floor(x), 0, R.len - 1)];
  const pzSupport = (R, xc) => Math.min(pzGAt(R, xc - 7), pzGAt(R, xc), pzGAt(R, xc + 7));
  const pzCeil = (R, x0, x1) => { let c = -1e9; for (const a of R.awn) if (a.x1 > x0 && a.x0 < x1) c = Math.max(c, a.y); return c; };
  const pzHandAt = (feet, lift) => feet - PZ.handUp + lift;
  const pzHand = pc => pzHandAt(pc.feet, pc.lift);
  // the stack's footprint (the boxes lean with the slide)
  const pzStackTop = (st, hl, hr, n) => (hl + hr) / 2 - PZ.trayTh - n * PZ.boxH;
  function pzStackHitsAt(st, X, hl, hr) {
    if (st.n <= 0) return false;
    const sh = st.s * 26, x0 = X - PZ.boxW / 2 - 4 + Math.min(0, sh), x1 = X + PZ.boxW / 2 + 4 + Math.max(0, sh);
    return pzStackTop(st, hl, hr, st.n) < pzCeil(st.R, x0, x1);
  }
  const pzStackHits = st => pzStackHitsAt(st, st.X, pzHand(st.pc[st.left]), pzHand(st.pc[st.right]));

  const pzPc = id => ({ id, xc: 0, feet: 0, vy: 0, grounded: true, lift: 0, liftV: 0, idleT: 0, lastDir: 0, landT: -9, landV: 0, upT: 0, dnT: 0 });

  function pzInitRoom(k, L, relief) {
    const st = G.mst, def = L.def;
    const R = st.cache && st.cache.k === k ? st.cache.R : pzBuild(def);
    st.cache = { k, R };
    st.room = k; st.R = R; st.def = def; st.relief = relief;
    st.left = 0; st.right = 1;
    st.X = 150; st.V = 0; st.aPair = 0; st.mode = 'idle'; st.pushDir = 0; st.pusher = -1;
    st.pc = [pzPc(0), pzPc(1)];
    st.pc[st.left].xc = st.X - PZ.span / 2; st.pc[st.right].xc = st.X + PZ.span / 2;
    for (const pc of st.pc) pc.feet = pzSupport(R, pc.xc);
    st.n = def.stack; st.start = st.n; st.need = Math.max(1, def.order - relief);
    st.s = 0; st.sv = 0; st.tilt = 0; st.wob = 0; st.wobV = 0; st.graceT = 0; st.slideT = 0;
    st.phase = 'play'; st.phaseT = 0; st.deliverT = 0; st.roomT = 0; st.failWhy = '';
    st.windState = 'calm'; st.windG = 0; st.windA = 0; st.windIn = false; st.windT0 = null;
    const tries = st.stats.retries[k] || 0, Wd = PZ.wind;
    st.windMul = R.wind && tries >= Wd.calmAfter ? Math.max(Wd.calmMin, Math.pow(Wd.calmMul, tries - Wd.calmAfter + 1)) : 1;
    st.pushT = 0; st.tugT = 0; st.awnBonkT = 0; st.dogBonkT = 0;
    for (const d of R.dogs) { d.t = 0; d.air = -1; d.hit = false; d.woofT = 0; }
    st.fx = { boxes: [], flyers: [], leaves: [], floats: [], birds: [], steam: [], bake: 0, freshT: 0, reliefT: relief > 0 ? 3 : 0, del: null,
      creakT: 0, gruntT: 0, dustT: 0, leafAcc: 0, steamAcc: 0, pop: 0, bakeN: 0, stepT: [0, 0] };
    if (st.stats.retries[k] === undefined) st.stats.retries[k] = 0;
    if (!st.deco || st.deco.room !== k) st.deco = pzDeco(k, R, def);
    st.cam = { x: 0, y: 0 };
    pzCamera(st, 1, true);
    pzMirror(st);
  }

  /* ---------- camera and the engine players (screen space, for name tags and bubbles) ---------- */
  function pzCamera(st, dt, snap) {
    const R = st.R;
    let tx = st.X - W * 0.38 + clamp(st.V * 0.4, -40, 60);
    if (R.door && st.X > R.door.cx - W * 0.45) tx = Math.max(tx, Math.min(R.door.cx - W * 0.62, R.len - W));
    tx = clamp(tx, 0, Math.max(0, R.len - W));
    const mid = (st.pc[0].feet + st.pc[1].feet) / 2;
    const ty = mid - PZ.groundScreen;
    if (snap) { st.cam.x = tx; st.cam.y = ty; return; }
    st.cam.x += (tx - st.cam.x) * Math.min(1, dt * 3.5);
    st.cam.y += (ty - st.cam.y) * Math.min(1, dt * 3);
  }
  function pzMirror(st) {
    for (const pc of st.pc) {
      const p = G.players[pc.id];
      p.x = pc.xc - st.cam.x - PW / 2; p.y = pc.feet - st.cam.y - PH; p.vx = st.V; p.vy = pc.vy; p.grounded = pc.grounded; p.alive = true;
      p.stun = 0; p.stompSafe = 0;
      if (Math.abs(st.V) > 10) p.face = Math.sign(st.V);
    }
  }

  /* ---------- one tick of the carry ---------- */
  function pzPhysics(st, dt, frozen) {
    const R = st.R, ps = st.pc, L = ps[st.left], Rp = ps[st.right];
    const mv = [0, 0];
    // 1. each player's intent: walk, and raise or lower their own end
    for (const pc of ps) {
      const p = G.players[pc.id], inp = frozen ? PZ_NOIN : p.input;
      p.pendingJump = false; p.pendingAct = false;
      const m = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      const up = !!(inp.jump || inp.up), dn = !!inp.down;
      if (!frozen) { if (inp.left || inp.right || up || dn) pc.idleT = 0; else pc.idleT += dt; }
      if (m !== 0) pc.lastDir = m;
      mv[pc.id] = m;
      const want = up && !dn ? -1 : dn && !up ? 1 : 0;
      pc.upT = want < 0 ? pc.upT + dt : 0; pc.dnT = want > 0 ? pc.dnT + dt : 0;
      const l0 = pc.lift;
      pc.lift = clamp(pc.lift + want * PZ.liftRate * dt, PZ.liftMin, PZ.liftMax);
      // you can't push the stack up into an awning
      if (pc.lift < l0) { const l1 = pc.lift, now = pzStackHits(st); pc.lift = l0; if (!now || pzStackHits(st)) pc.lift = l1; }
      pc.liftV = (pc.lift - l0) / dt;
    }
    // 2. pair speed: it only moves when both walk the same way
    const mL = mv[L.id], mR = mv[Rp.id];
    let Vt = 0, mode = 'idle', dir = 0;
    const low = L.lift > 10 || Rp.lift > 10;
    if (mL === mR) { Vt = mL * (low ? PZ.lowWalk : PZ.walk); mode = mL ? 'walk' : 'idle'; }
    else if (mL === 0 || mR === 0) { dir = mL || mR; mode = 'push'; st.pusher = mL ? L.id : Rp.id; }
    else mode = 'tug';
    const speeding = Vt !== 0 && (st.V === 0 || Math.sign(Vt) === Math.sign(st.V)) && Math.abs(Vt) > Math.abs(st.V);
    const V0 = st.V;
    st.V = approach(st.V, Vt, (speeding ? PZ.acc : PZ.dec) * dt);
    st.mode = mode; st.pushDir = dir;
    // 3. horizontal move (rigid pair): walls (steps over 13 px), the street's ends, then the awnings
    let bonked = false;
    const dX = st.V * dt;
    if (dX !== 0) {
      const nx = st.X + dX;
      const feetAt = (pc, x) => { const s = pzSupport(R, x); return s >= pc.feet - PZ.stepUp ? Math.max(s, pc.grounded ? s : pc.feet) : null; };
      const xl = nx - PZ.span / 2, xr = nx + PZ.span / 2;
      let stop = xl < 30 || xr > R.len - 30;
      const fl = feetAt(L, xl), fr = feetAt(Rp, xr);
      if (fl === null || fr === null) stop = true;
      let awn = false;
      if (!stop && st.n > 0) {
        const hl = pzHandAt(Math.min(fl, pzSupport(R, xl)), L.lift), hr = pzHandAt(Math.min(fr, pzSupport(R, xr)), Rp.lift);
        if (!pzStackHits(st) && pzStackHitsAt(st, nx, hl, hr)) { stop = true; awn = true; }
      }
      if (stop) {
        if (awn && Math.abs(st.V) > 30) pzAwningBonk(st, Math.sign(st.V));
        else if (Math.abs(st.V) > 60) { Sfx.play('bonk'); pzRumble(0.2, 0.4, 90); }
        st.V = 0; bonked = true;
      } else st.X = nx;
    }
    st.aPair = bonked ? 0 : (st.V - V0) / dt;
    const prevXc = [L.xc, Rp.xc];
    L.xc = st.X - PZ.span / 2; Rp.xc = st.X + PZ.span / 2;
    // 4. feet: step up small steps, fall down the bigger ones
    for (const pc of ps) {
      const sup = pzSupport(R, pc.xc);
      if (pc.grounded) {
        if (sup <= pc.feet + 2.5) pc.feet = sup; else { pc.grounded = false; pc.vy = 0; }
      }
      if (!pc.grounded) {
        pc.vy = Math.min(pc.vy + PZ.g * dt, PZ.maxFall);
        pc.feet += pc.vy * dt;
        const s2 = pzSupport(R, pc.xc);
        if (pc.feet >= s2) {
          const vy = pc.vy; pc.feet = s2; pc.vy = 0; pc.grounded = true; pc.landT = st.clock; pc.landV = vy;
          if (vy > 120) { st.s += (pc === L ? 1 : -1) * PZ.jLand * vy / 250; st.wobV += (pc === L ? 1 : -1) * 2; if (!frozen) pzPuff(pc.xc, pc.feet, 3, 'rgba(255,255,255,0.7)'); }
        }
      }
    }
    // 5. bumps: a little jolt to the stack
    const spd = Math.abs(st.V) / PZ.walk;
    [L, Rp].forEach((pc, i) => {
      const a = Math.min(prevXc[i], pc.xc), b = Math.max(prevXc[i], pc.xc);
      if (a === b) return;
      for (const bp of R.bumps) if (bp.cx > a && bp.cx <= b) {
        const sg = hash(bp.cx | 0, pc.id) & 1 ? 1 : -1;
        st.s += sg * PZ.jBump * spd * spd; st.wobV += sg * 6 * spd;
        if (!frozen) { Sfx.tone(110, 0.07, 'square', 0.02 + 0.03 * spd, 70); pzRumble(0.2 * spd, 0.45 * spd, 70, pc.id); pzPuff(bp.cx, pzGAt(R, bp.cx) - 4, 3, 'rgba(255,255,255,0.7)'); }
      }
      // stairs: a little tap and dust on every step
      if (!frozen && pc.grounded) for (const s of R.stairs) for (const t of s.tread) if (t.x > a && t.x <= b) {
        Sfx.tone(180 + 20 * pc.id, 0.04, 'triangle', 0.025); st.wobV += (hash(t.x, pc.id) & 1 ? 1 : -1) * 2.5;
        pzPuff(pc.xc, pc.feet, 1, 'rgba(255,255,255,0.6)');
      }
    });
    // 6. dogs and wind
    pzDogStep(st, dt, frozen);
    pzWindStep(st, dt, frozen);
    // 7. the slide: the stack slides toward the low end of a tilted tray
    const hl = pzHand(L), hr = pzHand(Rp), tilt = (hr - hl) / PZ.span;   // + : the right end is lower
    st.tilt = tilt;
    const ex = Math.sign(tilt) * Math.max(0, Math.abs(tilt) - PZ.dead), k = pzHf(Math.max(1, st.n));
    const push = PZ.kSlide * ex + st.windA - PZ.cAcc * clamp(st.aPair, -1500, 1500) / 320;
    if (ex === 0 && st.windA === 0) {
      st.sv += push * k * dt;
      st.sv -= st.sv * Math.min(1, PZ.dLevel * dt);
      if (Math.abs(st.sv) < 0.25) st.s = approach(st.s, 0, PZ.settle * dt);
    } else {
      st.sv += push * k * dt;
      st.sv -= st.sv * Math.min(1, PZ.dSlide * dt);
    }
    st.sv = clamp(st.sv, -PZ.svMax, PZ.svMax);
    st.s += st.sv * dt;
    st.slideT = Math.abs(st.s) > PZ.warnS ? st.slideT + dt : 0;
    // a cosmetic jiggle on top (cardboard boxes wobble a bit as you walk)
    st.wobV += (-90 * st.wob - 7 * st.wobV) * dt + (st.mode === 'walk' ? Math.sin(st.clock * 13) * 9 * spd * dt : 0);
    st.wob += st.wobV * dt;
    if (st.graceT > 0) { st.graceT -= dt; st.s = clamp(st.s, -0.95, 0.95); }
    if (st.awnBonkT > 0) st.awnBonkT -= dt;
    if (st.dogBonkT > 0) st.dogBonkT -= dt;
    if (frozen) return;
    // 8. creaks while it slides near the edge, and the top box going over
    if (Math.abs(st.s) > 0.7 && st.n > 0) {
      st.fx.creakT -= dt;
      if (st.fx.creakT <= 0) { st.fx.creakT = 0.3; Sfx.play('pzCreak'); pzRumble(0, 0.25, 50); }
    } else st.fx.creakT = 0;
    if (Math.abs(st.s) >= 1 && st.n > 0 && st.graceT <= 0) {
      const side = Math.sign(st.s);
      pzLoseBox(st, side);
      st.s = side * PZ.lostTo; st.sv *= 0.2; st.graceT = PZ.grace;
    }
    // 9. fail and delivery
    if (st.n < st.need) { pzFail(st, 'boxes'); return; }
    const d = R.door;
    if (d && Math.abs(st.X - d.cx) <= PZ.deliverR && L.grounded && Rp.grounded && Math.abs(st.V) <= PZ.deliverV && Math.abs(st.s) < 0.7) {
      st.deliverT += dt;
      if (st.deliverT >= PZ.deliverHold) pzDeliver(st);
    } else st.deliverT = 0;
  }

  function pzAwningBonk(st, dir) {
    if (st.awnBonkT > 1.6) return;
    st.awnBonkT = 2.2; st.stats.bonks++;
    st.s -= dir * PZ.jAwning; st.wobV -= dir * 14;
    Sfx.play('pzThunk'); pzRumble(0.4, 0.5, 140); pzShake(0.05);
    const tp = pzTopPos(st);
    pzBurst(tp.x - st.cam.x, tp.y - st.cam.y - 4, C.paper, 5);
  }

  function pzDogStep(st, dt, frozen) {
    const R = st.R, Dg = PZ.dog;
    for (const d of R.dogs) {
      const near = st.X > d.x - Dg.near && st.X < d.x + Dg.near * 0.8 && st.phase === 'play';
      if (d.woofT > 0) d.woofT -= dt;
      if (d.air >= 0) {
        d.air += dt;
        const u = d.air / Dg.air, up = Math.sin(Math.PI * clamp(u, 0, 1));
        // at the top of the jump the dog's nose meets the tray, unless it is raised out of reach
        if (!d.hit && u > 0.35 && u < 0.7 && !frozen) {
          const reachY = pzGAt(R, d.x) - Dg.reach * up;
          const hl = pzHand(st.pc[st.left]), hr = pzHand(st.pc[st.right]);
          const f = clamp((d.x - (st.X - PZ.span / 2)) / PZ.span, 0, 1), trayY = hl + (hr - hl) * f;
          if (Math.abs(d.x - st.X) < PZ.span / 2 + 6 && trayY > reachY - 2 && st.n > 0) {
            d.hit = true; st.stats.dogBonks++;
            const side = st.X >= d.x ? 1 : -1;
            st.s += side * PZ.jDog; st.wobV += side * 18; st.dogBonkT = 1.2;
            Sfx.play('pzBonk'); pzRumble(0.5, 0.6, 160); pzShake(0.06);
            pzFloat(st, d.x, trayY - 18, 'Boop!', '#ffffff', 16);
          }
        }
        if (d.air >= Dg.air) { d.air = -1; d.t = 0; }
      } else if (near) {
        d.t += dt;
        if (d.t > Dg.period - Dg.air) { d.air = 0; d.hit = false; if (!frozen && d.woofT <= 0) { Sfx.play('pzWoof'); d.woofT = 0.9; } }
      } else d.t = Math.min(d.t, Dg.period * 0.5);
    }
  }

  function pzWindStep(st, dt, frozen) {
    const R = st.R;
    st.windA = 0;
    if (!R.wind) return;
    const Wd = PZ.wind;
    if (st.windT0 == null && st.X > R.wind.x0 - 80) st.windT0 = st.roomT;
    const t = st.windT0 == null ? -1 : st.roomT - st.windT0;
    let state = 'calm', g = 0;
    if (t >= 0) {
      const c = t % Wd.period;
      if (c < Wd.warn) state = 'warn';
      else if (c < Wd.warn + Wd.gust) { state = 'gust'; const u = c - Wd.warn; g = Math.min(1, u / Wd.ramp, (Wd.gust - u) / Wd.ramp); }
    }
    const near = st.X > R.wind.x0 - 200 && st.X < R.wind.x1 + 60;
    if (state !== st.windState) {
      if (!frozen && state === 'warn' && near && st.phase === 'play') Sfx.play('pzWhistle');
      if (!frozen && state === 'gust' && near && st.phase === 'play') { Sfx.play('pzGust'); pzRumble(0.12, 0.3, 900); }
      if (st.windState === 'gust' && st.windIn && Math.abs(st.s) < 0.6) st.stats.gustsRidden++;
      st.windState = state;
    }
    st.windIn = st.X > R.wind.x0 && st.X < R.wind.x1;
    st.windG = Math.max(0, g);
    if (st.windIn) st.windA = R.wind.dir * Wd.force * st.windMul * st.windG;
  }

  function pzLoseBox(st, side) {
    if (st.n <= 0) return;
    const tp = pzTopPos(st);
    st.n--; st.stats.dropped++; G.falls++;
    const fx = st.fx.boxes;
    fx.push({ x: tp.x, y: tp.y, rot: tp.rot, vx: side * (120 + pzRand() * 50) + st.V * 0.5, vy: -60,
      vr: side * (4 + pzRand() * 2), open: false, bounced: false, rest: false, t: 0 });
    if (fx.length > 10) fx.shift();
    Sfx.play('pzSlip'); pzRumble(0.6, 0.7, 260); pzShake(0.1);
    st.fx.pop = 0.25;
  }

  function pzFail(st, why) {
    st.phase = 'fail'; st.phaseT = PZ.failT; st.failWhy = why; st.deliverT = 0;
    st.stats.fails++;
    Sfx.play('pzOops'); pzRumble(0.7, 0.7, 350); pzShake(0.12);
  }

  function pzDeliver(st) {
    const def = st.def, lost = st.start - st.n, spares = def.stack - def.order;
    const stars = lost === 0 ? 3 : lost <= Math.ceil(spares / 2) ? 2 : 1;
    st.phase = 'deliver'; st.phaseT = 0.15 * st.n + 1.0;
    st.stats.lost[st.room] = lost; st.stats.delivered[st.room] = st.n; st.stats.stars[st.room] = stars;
    st.fx.del = { t: 0, n: st.n, launched: 0, arrived: 0, stars, shown: 0 };
    Sfx.play('pzDing');
  }

  /* ---------- where things are (world space) ---------- */
  function pzGeom(st) {
    const hl = pzHand(st.pc[st.left]), hr = pzHand(st.pc[st.right]);
    const a = Math.atan2(hr - hl, PZ.span);
    return { hl, hr, a, bx: st.X, by: (hl + hr) / 2 - PZ.trayTh, ux: Math.sin(a), uy: -Math.cos(a), cx: Math.cos(a), cy: Math.sin(a) };
  }
  // box i of n: the stack shears toward the slide, the top box most
  function pzBoxAt(st, g, i, n) {
    const f = n > 1 ? i / (n - 1) : 1, h = PZ.boxH * (i + 0.5);
    const along = st.s * (8 + 22 * Math.pow(f, 1.25)) + st.wob * (0.3 + f), jit = ((hash(st.room + 1, i) % 3) - 1) * 0.8;
    return { x: g.bx + g.ux * h + g.cx * (along + jit), y: g.by + g.uy * h + g.cy * (along + jit), rot: g.a + st.s * 0.12 * f + st.wob * 0.01 * f };
  }
  function pzTopPos(st) { const g = pzGeom(st); return pzBoxAt(st, g, Math.max(0, st.n - 1), Math.max(1, st.n)); }

  function pzFloat(st, x, y, str, col, size) { // world space
    const f = st.fx.floats;
    f.push({ x, y, str, col, size: size || 16, t: 0, max: 1.1 });
    if (f.length > 12) f.shift();
  }

  /* ---------- cosmetic effects (ticked with the game, so a pause freezes them) ---------- */
  function pzFxStep(st, dt) {
    const fx = st.fx, R = st.R;
    fx.bake += dt;
    while (fx.bakeN < st.start && fx.bake >= 0.08 * fx.bakeN + 0.12) { Sfx.tone(500 + 60 * fx.bakeN, 0.04, 'triangle', 0.03); fx.bakeN++; }
    if (fx.freshT > 0) fx.freshT -= dt;
    if (fx.reliefT > 0) fx.reliefT -= dt;
    if (fx.pop > 0) fx.pop -= dt;
    for (let i = fx.boxes.length - 1; i >= 0; i--) {
      const b = fx.boxes[i];
      b.t += dt;
      if (!b.rest) {
        b.vy += 1800 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
        const gy = pzGAt(R, clamp(b.x, 0, R.len - 1)) - 4;
        if (b.vy > 0 && b.y >= gy) {
          b.y = gy;
          if (!b.bounced) {
            b.bounced = true; b.open = true; b.hitT = b.t; b.vy *= -0.35; b.vx *= 0.5; b.vr *= 0.4;
            const sx = b.x - st.cam.x, sy = b.y - st.cam.y;
            pzBurst(sx, sy, '#ffcf5a', 6); pzBurst(sx, sy, '#e2452b', 4); pzPuff(sx, sy, 4, 'rgba(255,255,255,0.8)');
            Sfx.play('pzPlop');
          } else {
            b.rest = true; b.vy = 0; b.vx = 0; b.vr = 0; b.rot = 0;
            if (fx.birds.length < 4) {
              const side = b.x < st.X ? -1 : 1;
              fx.birds.push({ box: b, side, t: -0.15, x: b.x + side * 220, y: b.y - 300, x1: b.x + side * 17, y1: b.y + 4, cooed: false });
            }
          }
        }
      }
      if (b.hitT !== undefined && b.t - b.hitT > 2.4) fx.boxes.splice(i, 1);
    }
    for (let i = fx.birds.length - 1; i >= 0; i--) {
      const bd = fx.birds[i];
      bd.t += dt;
      if (bd.t >= 0.45 && !bd.cooed) { bd.cooed = true; Sfx.play('pzCoo'); }
      if (bd.t >= 0.95 && !bd.box.eaten) bd.box.eaten = true;
      if (bd.t > 1.7) fx.birds.splice(i, 1);
    }
    for (let i = fx.floats.length - 1; i >= 0; i--) { const f = fx.floats[i]; f.t += dt; f.y -= 34 * dt; if (f.t >= f.max) fx.floats.splice(i, 1); }
    // steam from the hot pizzas
    if (st.n > 0 && st.phase !== 'deliver') {
      fx.steamAcc += dt * 5;
      while (fx.steamAcc >= 1) {
        fx.steamAcc -= 1;
        const tp = pzTopPos(st);
        if (fx.steam.length < 30) fx.steam.push({ x: tp.x + (pzRand() - 0.5) * 26, y: tp.y - 6, t: 0, max: 1.2 + pzRand() * 0.6, ph: pzRand() * 6 });
      }
    }
    for (let i = fx.steam.length - 1; i >= 0; i--) {
      const s = fx.steam[i];
      s.t += dt; s.y -= 22 * dt; s.x += Math.sin(s.t * 3 + s.ph) * 8 * dt + st.windA * -12 * dt;
      if (s.t >= s.max) fx.steam.splice(i, 1);
    }
    // wind leaves
    if (R.wind) {
      const near = st.X > R.wind.x0 - 300 && st.X < R.wind.x1 + 200;
      const rate = !near ? 0 : st.windState === 'gust' ? 40 : st.windState === 'warn' ? 6 : 1;
      fx.leafAcc += rate * dt;
      while (fx.leafAcc >= 1) {
        fx.leafAcc -= 1;
        if (fx.leaves.length < 90) fx.leaves.push({ x: st.cam.x + W + 20 + pzRand() * 80, y: st.cam.y + 120 + pzRand() * 300, vx: -(260 + pzRand() * 220), ph: pzRand() * 6,
          col: ['#e9a23b', '#d9643a', '#b5c24a', '#f2c14e'][(pzRand() * 4) | 0], r: pzRand() * 6 });
      }
      for (let i = fx.leaves.length - 1; i >= 0; i--) {
        const l = fx.leaves[i];
        l.x += l.vx * dt * (st.windState === 'gust' ? 1 : 0.45); l.ph += dt * 6; l.y += Math.sin(l.ph) * 30 * dt; l.r += dt * 8;
        if (l.x < st.cam.x - 30) fx.leaves.splice(i, 1);
      }
    }
    // delivery: the boxes fly into the door one by one, then the stars pop
    const del = fx.del;
    if (del && st.phase === 'deliver') {
      del.t += dt;
      while (del.launched < del.n && del.t >= 0.15 * del.launched) {
        const g = pzGeom(st), b = pzBoxAt(st, g, del.n - 1 - del.launched, del.n);
        fx.flyers.push({ k: del.launched, x0: b.x, y0: b.y, x1: R.door.cx, y1: R.door.y + 34, t: 0 });
        del.launched++;
      }
      for (let i = fx.flyers.length - 1; i >= 0; i--) {
        const f = fx.flyers[i];
        f.t += dt;
        if (f.t >= 0.35) {
          fx.flyers.splice(i, 1); del.arrived++;
          const k = f.k, sx = f.x1 - st.cam.x, sy = f.y1 - st.cam.y;
          Sfx.tone(1046 * (1 + 0.06 * k), 0.05, 'square', 0.035); Sfx.tone(1046 * 1.5 * (1 + 0.06 * k), 0.09, 'square', 0.035, null, 0.045);
          pzBurst(sx, sy, C.gold, 6); pzFloat(st, f.x1 + (k % 2 ? 24 : -24), f.y1 - 14, '+1', C.gold, 18); pzRumble(0, 0.15, 40);
          if (del.arrived === del.n) { for (let c = 0; c < 10; c++) confetti(sx, sy - 10); pzFloat(st, R.door.cx, R.door.y - 44, 'Thanks!', '#ffffff', 22); }
        }
      }
      const starT = 0.15 * (del.n - 1) + 0.4;
      while (del.shown < del.stars && del.t >= starT + 0.15 * del.shown) { del.shown++; Sfx.play('pzStar'); }
    }
  }

  /* ======================================================================================================
     DRAWING. Screen layers: sky, far hills and skyline, near rooftops (parallax); then the street in world
     space: houses up the hillside, props, the ground, awnings, dogs; then the players (engine), then the carry.
     ====================================================================================================== */
  // per-room light: sky colours, haze and a warm or cool wash
  const PZ_LIGHT = [
    { top: '#7fc6ee', bot: '#fdf0d2', sun: [760, 86], sunCol: '#fff4c4', haze: 'rgba(253,240,210,', far: '#a9cbe0', mid: '#93b7cf', wash: null },
    { top: '#9bbfd8', bot: '#eef0e6', sun: [200, 70], sunCol: '#fffbe8', haze: 'rgba(238,240,230,', far: '#b1c9cc', mid: '#98b3b5', wash: 'rgba(160,190,210,0.06)', rain: true },
    { top: '#8fd0f3', bot: '#ffe8c0', sun: [620, 64], sunCol: '#fff1b8', haze: 'rgba(255,232,192,', far: '#e2c79c', mid: '#cfae80', wash: null },
    { top: '#f59a6b', bot: '#ffe2a8', sun: [700, 210], sunCol: '#ffd27a', haze: 'rgba(255,214,160,', far: '#c99595', mid: '#ad7d85', wash: 'rgba(255,150,80,0.07)' },
  ];

  function pzDeco(k, R, def) {
    const out = { room: k, bld: [], props: [], far: [], mid: [], clouds: [], lines: [] };
    const doorX = R.door ? R.door.x - 70 : R.len;
    // houses along the hillside, each standing on the ground under it
    let x = k === 0 ? 0 : -20, i = 0;
    while (x < doorX - 30) {
      const h = hash(k * 31 + 7, i * 13 + 3);
      let w = 96 + (h % 6) * 14;
      const isShop = k === 0 && i === 0;
      if (isShop) w = 190;
      if (x + w > doorX - 6) w = doorX - 6 - x;
      if (w < 60) break;
      let base = -1e9, top = 1e9;
      for (let xx = Math.max(0, x); xx < Math.min(R.len, x + w); xx += 4) { base = Math.max(base, R.g[xx]); top = Math.min(top, R.g[xx]); }
      const floors = 2 + ((h >>> 4) % 3);
      out.bld.push({ x, w, base: base + 30, ground: top, top: top - 46 - floors * 50 - ((h >>> 7) % 3) * 6, floors, shop: isShop || (h >>> 10) % 3 === 0,
        col: PZ_FACADES[(h >>> 12) % PZ_FACADES.length], roof: (h >>> 15) % 3, rcol: PZ_ROOFS[(h >>> 17) % PZ_ROOFS.length],
        trim: PZ_TRIMS[(h >>> 19) % 3], shut: PZ_SHUTTERS[(h >>> 20) % PZ_SHUTTERS.length], chim: (h >>> 22) % 2 === 0,
        balcony: (h >>> 23) % 3 === 0, cat: (h >>> 25) % 5 === 0, flowers: (h >>> 26) % 2 === 0, pizzeria: isShop, seed: h });
      x += w + 4 + ((h >>> 27) % 3) * 6; i++;
    }
    // washing lines between some neighbours
    for (let j = 0; j + 1 < out.bld.length; j++) if (hash(k, j * 5 + 1) % 3 === 0) {
      const a = out.bld[j], b = out.bld[j + 1];
      out.lines.push({ x0: a.x + a.w - 6, y0: a.top + 40, x1: b.x + 6, y1: b.top + 40, seed: j });
    }
    // props on the pavement: lamps, trees, benches, hydrants, flower pots (kept off the stairs, awnings and the door)
    const busy = x => R.stairs.some(s => x > s.x0 - 20 && x < s.x1 + 20) || R.awn.some(a => x > a.x0 - 30 && x < a.x1 + 30)
      || (R.door && x > R.door.x - 120) || R.bridges.some(b => x > b.x0 - 10 && x < b.x1 + 10) || R.dogs.some(d => Math.abs(x - d.x) < 90)
      || R.signs.some(s => Math.abs(x - s.x - 30) < 50) || x < 230;
    for (let px = 260, j = 0; px < R.len - 100; px += 150 + (hash(k + 3, j) % 120), j++) {
      if (busy(px)) continue;
      const kinds = ['lamp', 'tree', 'lamp', 'bench', 'pots', 'hydrant', 'tree', 'bin', 'mail'];
      out.props.push({ x: px, kind: kinds[hash(k * 7 + 1, j) % kinds.length], seed: hash(px, k) });
    }
    // far skyline and hills, near rooftops (screen-space parallax layers)
    for (let j = 0; j < 40; j++) { const hh = hash(k + 11, j); out.far.push({ x: j * 70 + (hh % 30), w: 40 + (hh >>> 5) % 40, h: 40 + (hh >>> 9) % 90, spire: (hh >>> 13) % 7 === 0 }); }
    for (let j = 0; j < 40; j++) { const hh = hash(k + 19, j); out.mid.push({ x: j * 90 + (hh % 40), w: 70 + (hh >>> 5) % 50, h: 30 + (hh >>> 9) % 50, roof: (hh >>> 14) % 2, tree: (hh >>> 16) % 4 === 0 }); }
    for (let j = 0; j < 6; j++) { const hh = hash(k + 41, j); out.clouds.push({ x: j * 230 + (hh % 120), y: 40 + (hh >>> 7) % 90, s: 0.7 + ((hh >>> 12) % 6) / 10, sp: 4 + (hh >>> 15) % 6 }); }
    return out;
  }

  /* ----- sky and parallax (screen space) ----- */
  function pzDrawSky(st) {
    const Lt = PZ_LIGHT[st.room % 4], d = st.deco, cx = st.cam.x, cy = st.cam.y;
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, Lt.top); gr.addColorStop(0.75, Lt.bot); gr.addColorStop(1, Lt.bot);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    // sun with a soft glow
    const [sx, sy0] = Lt.sun, sy = sy0 - cy * 0.04;
    const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 140);
    sg.addColorStop(0, Lt.sunCol); sg.addColorStop(0.25, Lt.haze + '0.55)'); sg.addColorStop(1, Lt.haze + '0)');
    ctx.fillStyle = sg; ctx.fillRect(sx - 140, sy - 140, 280, 280);
    ctx.fillStyle = Lt.sunCol; circle(sx, sy, st.room === 3 ? 38 : 26); ctx.fill();
    if (st.room === 1) { // after the rain: a faint rainbow
      ctx.save(); ctx.globalAlpha = 0.22; ctx.lineWidth = 9;
      ['#ff6b6b', '#ffb347', '#ffe66b', '#8fe3b0', '#7fc8ff', '#b28dff'].forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(560 - cx * 0.05, 430 - cy * 0.05, 330 - i * 9, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); });
      ctx.restore();
    }
    // clouds drift slowly
    for (const c of d.clouds) {
      const x = ((c.x - cx * 0.08 + G.clock * c.sp) % (W + 300) + W + 300) % (W + 300) - 150, y = c.y - cy * 0.05;
      pzCloud(x, y, c.s, st.room === 1 ? 'rgba(200,208,220,0.9)' : st.room === 3 ? 'rgba(255,226,200,0.85)' : 'rgba(255,255,255,0.88)');
    }
    // far hills and skyline
    const fy = 300 - cy * 0.12;
    ctx.fillStyle = Lt.far;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) { const wx = x + cx * 0.12; ctx.lineTo(x, fy + 20 + Math.sin(wx * 0.006) * 26 + Math.sin(wx * 0.017 + 1) * 10); }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    for (const b of d.far) {
      const x = ((b.x - cx * 0.18) % 2800 + 2800) % 2800 - 100;
      if (x > W + 60 || x + b.w < -60) continue;
      ctx.fillStyle = Lt.far; ctx.fillRect(x, fy - b.h + 30, b.w, b.h + 200);
      if (b.spire) { ctx.beginPath(); ctx.moveTo(x + b.w / 2 - 8, fy - b.h + 30); ctx.lineTo(x + b.w / 2, fy - b.h - 20); ctx.lineTo(x + b.w / 2 + 8, fy - b.h + 30); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (let wy = fy - b.h + 40; wy < fy + 20; wy += 14) for (let wx = x + 6; wx < x + b.w - 6; wx += 12) if (hash(wx | 0, wy | 0) % 3 === 0) ctx.fillRect(wx, wy, 4, 6);
    }
    ctx.fillStyle = Lt.haze + '0.45)'; ctx.fillRect(0, fy - 140, W, H);
    // near rooftops
    const my = 360 - cy * 0.3;
    for (const b of d.mid) {
      const x = ((b.x - cx * 0.4) % 3600 + 3600) % 3600 - 120;
      if (x > W + 60 || x + b.w < -60) continue;
      ctx.fillStyle = Lt.mid;
      const top = my - b.h;
      ctx.fillRect(x, top, b.w, H - top);
      if (b.roof) { ctx.beginPath(); ctx.moveTo(x - 4, top); ctx.lineTo(x + b.w / 2, top - 22); ctx.lineTo(x + b.w + 4, top); ctx.fill(); }
      else ctx.fillRect(x - 3, top - 6, b.w + 6, 7);
      if (b.tree) { circle(x + b.w + 12, top + 18, 20); ctx.fill(); circle(x + b.w + 26, top + 26, 15); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      for (let wy = top + 10; wy < my + 40; wy += 18) for (let wx = x + 8; wx < x + b.w - 8; wx += 16) ctx.fillRect(wx, wy, 6, 8);
    }
    ctx.fillStyle = Lt.haze + '0.35)'; ctx.fillRect(0, my - 120, W, H);
  }
  function pzCloud(x, y, s, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, 22 * s, 0, Math.PI * 2); ctx.arc(x + 26 * s, y - 12 * s, 28 * s, 0, Math.PI * 2);
    ctx.arc(x + 56 * s, y - 2 * s, 22 * s, 0, Math.PI * 2); ctx.arc(x + 30 * s, y + 8 * s, 22 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(x + 22 * s, y - 18 * s, 14 * s, 0, Math.PI * 2); ctx.fill();
  }

  /* ----- the houses (world space) ----- */
  function pzDrawBuilding(st, b) {
    const { x, w, top, base } = b, h = base - top;
    // body with a side shade
    ctx.fillStyle = b.col; ctx.fillRect(x, top, w, h);
    ctx.fillStyle = 'rgba(60,40,60,0.10)'; ctx.fillRect(x + w - 7, top, 7, h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x, top, 4, h);
    // a cornice under the roof, a plinth at the ground
    ctx.fillStyle = b.trim; ctx.fillRect(x - 3, top, w + 6, 6);
    ctx.fillStyle = 'rgba(60,40,60,0.15)'; ctx.fillRect(x - 3, top + 6, w + 6, 2);
    // roof
    ctx.fillStyle = b.rcol;
    if (b.roof === 0) { ctx.fillRect(x - 5, top - 9, w + 10, 10); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x - 5, top - 2, w + 10, 2); }
    else if (b.roof === 1) {
      ctx.beginPath(); ctx.moveTo(x - 8, top + 1); ctx.lineTo(x + w / 2, top - 36); ctx.lineTo(x + w + 8, top + 1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 1.5;
      for (let r = 1; r < 4; r++) { const yy = top + 1 - r * 9, half = (w / 2 + 8) * (1 - r * 9 / 37); ctx.beginPath(); ctx.moveTo(x + w / 2 - half, yy); ctx.lineTo(x + w / 2 + half, yy); ctx.stroke(); }
      ctx.fillStyle = '#e8f3fa'; circle(x + w / 2, top - 12, 6); ctx.fill(); ctx.strokeStyle = b.trim; ctx.lineWidth = 2; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(x - 6, top + 1); ctx.lineTo(x + 14, top - 22); ctx.lineTo(x + w - 14, top - 22); ctx.lineTo(x + w + 6, top + 1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 1.5;
      for (let yy = top - 6; yy > top - 22; yy -= 7) { ctx.beginPath(); ctx.moveTo(x - 2, yy); ctx.lineTo(x + w + 2, yy); ctx.stroke(); }
    }
    if (b.chim) {
      const cxx = x + w * 0.74, ctop = top - (b.roof === 1 ? 34 : 28);
      ctx.fillStyle = '#9a5a44'; ctx.fillRect(cxx, ctop, 12, 24); ctx.fillStyle = '#7d4636'; ctx.fillRect(cxx - 2, ctop - 3, 16, 4);
      // a thin curl of smoke
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
      for (let k = 0; k < 6; k++) { const yy = ctop - 6 - k * 9, xx = cxx + 6 + Math.sin(G.clock * 1.5 + k * 0.9 + b.seed) * 4 + k * 2; if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
      ctx.stroke();
    }
    if (b.pizzeria) { pzDrawPizzeria(st, b); return; }
    // windows: frames, panes, shutters and flower boxes
    const groundY = b.ground;
    const cols = Math.max(1, Math.floor((w - 20) / 34)), gap = (w - cols * 20) / (cols + 1);
    for (let r = 0; r < b.floors; r++) {
      const wy = top + 18 + r * 50;
      if (wy + 30 > groundY - 56) break;
      for (let c = 0; c < cols; c++) {
        const wx = x + gap + c * (20 + gap), lit = st.room === 3 && hash(b.seed + r, c) % 3 === 0;
        ctx.fillStyle = b.shut; ctx.fillRect(wx - 7, wy, 6, 28); ctx.fillRect(wx + 21, wy, 6, 28);
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(wx - 7, wy + 9, 6, 1); ctx.fillRect(wx - 7, wy + 18, 6, 1); ctx.fillRect(wx + 21, wy + 9, 6, 1); ctx.fillRect(wx + 21, wy + 18, 6, 1);
        ctx.fillStyle = b.trim; ctx.fillRect(wx - 2, wy - 2, 24, 32);
        const pg = ctx.createLinearGradient(wx, wy, wx + 20, wy + 28);
        pg.addColorStop(0, lit ? '#ffe39a' : '#d7ecf7'); pg.addColorStop(1, lit ? '#ffc861' : '#a9cde3');
        ctx.fillStyle = pg; ctx.fillRect(wx, wy, 20, 28);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.moveTo(wx + 2, wy + 20); ctx.lineTo(wx + 12, wy + 2); ctx.lineTo(wx + 16, wy + 2); ctx.lineTo(wx + 6, wy + 20); ctx.fill();
        ctx.fillStyle = b.trim; ctx.fillRect(wx + 9, wy, 2, 28); ctx.fillRect(wx, wy + 13, 20, 2);
        if (b.cat && r === 0 && c === 0) pzDrawCat(wx + 10, wy + 28, b.seed);
        if (b.flowers && (r + c) % 2 === 0) {
          ctx.fillStyle = '#8a5833'; ctx.fillRect(wx - 3, wy + 28, 26, 6);
          for (let f = 0; f < 5; f++) { ctx.fillStyle = f % 2 ? '#5fab55' : '#4b9147'; circle(wx + 1 + f * 4.5, wy + 27, 3.2); ctx.fill(); ctx.fillStyle = ['#ff6b8a', '#ffd23f', '#ff8a3d', '#ffffff'][(f + c) % 4]; circle(wx + 1 + f * 4.5, wy + 25, 1.8); ctx.fill(); }
        } else { ctx.fillStyle = b.trim; ctx.fillRect(wx - 3, wy + 29, 26, 3); }
      }
      if (b.balcony && r === 0 && w > 110) {
        const bx = x + w / 2 - 30, by = wy + 34;
        ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(bx, by, 60, 4);
        ctx.strokeStyle = '#3d3a4f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx, by - 12); ctx.lineTo(bx + 60, by - 12);
        for (let k = 0; k <= 10; k++) { ctx.moveTo(bx + k * 6, by - 12); ctx.lineTo(bx + k * 6, by); }
        ctx.stroke();
      }
    }
    // ground floor: a shop front or a front door, at the ground under the middle of the house
    const mx = x + w / 2, gy = st.R.g[clamp(Math.floor(mx), 0, st.R.len - 1)];
    if (b.shop) {
      const sw = Math.min(w - 20, 96), sx = mx - sw / 2;
      ctx.fillStyle = '#3d3a4f'; ctx.fillRect(sx - 3, gy - 52, sw + 6, 52);
      const sg = ctx.createLinearGradient(0, gy - 48, 0, gy);
      sg.addColorStop(0, '#fff6dc'); sg.addColorStop(1, '#f3d9a2');
      ctx.fillStyle = sg; ctx.fillRect(sx, gy - 46, sw, 44);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = 1; k < 3; k++) ctx.fillRect(sx + sw * k / 3, gy - 46, 2, 44);
      // goods in the window
      for (let k = 0; k < 6; k++) { ctx.fillStyle = ['#e4572e', '#ffc53d', '#8fe3b0', '#7fc8ff', '#ff8fc7'][(k + b.seed) % 5]; circle(sx + 8 + k * (sw - 16) / 5, gy - 10, 5); ctx.fill(); }
      // a little striped awning (high up: just a decoration)
      const aw = sw + 16, ax = mx - aw / 2;
      for (let k = 0; k * 10 < aw; k++) { ctx.fillStyle = k % 2 ? '#fff4e0' : b.shut; ctx.fillRect(ax + k * 10, gy - 66, 10, 12); ctx.beginPath(); ctx.arc(ax + k * 10 + 5, gy - 54, 5, 0, Math.PI); ctx.fill(); }
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(ax, gy - 66, aw, 2);
    } else {
      // a front door: an arched frame, a fanlight, panels, a knob and a step
      ctx.fillStyle = 'rgba(60,40,60,0.25)'; rr(mx - 17, gy - 52, 34, 52, 16); ctx.fill();
      ctx.fillStyle = b.trim; rr(mx - 15, gy - 50, 30, 50, 15); ctx.fill();
      ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(mx, gy - 36, 11, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = b.trim; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let k = 1; k < 4; k++) { const a = Math.PI + k * Math.PI / 4; ctx.moveTo(mx, gy - 36); ctx.lineTo(mx + Math.cos(a) * 11, gy - 36 + Math.sin(a) * 11); }
      ctx.stroke();
      ctx.fillStyle = b.shut; ctx.fillRect(mx - 11, gy - 35, 22, 35);
      ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(mx - 8, gy - 31, 7, 12); ctx.fillRect(mx + 1, gy - 31, 7, 12); ctx.fillRect(mx - 8, gy - 15, 7, 11); ctx.fillRect(mx + 1, gy - 15, 7, 11);
      ctx.fillStyle = C.gold; circle(mx + 7, gy - 17, 1.8); ctx.fill();
      ctx.fillStyle = '#d8ccb8'; ctx.fillRect(mx - 15, gy - 3, 30, 3);
    }
    // a drainpipe
    ctx.fillStyle = 'rgba(80,80,100,0.35)'; ctx.fillRect(x + 4, top + 6, 3, base - top);
  }

  function pzDrawCat(x, y, seed) {
    const col = ['#3d3a4f', '#f0a050', '#ffffff', '#9a9aa8'][seed % 4];
    const blink = (G.clock + seed % 7) % 4 < 0.15;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, y - 6, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
    circle(x, y - 14, 5.5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 5, y - 17); ctx.lineTo(x - 4, y - 23); ctx.lineTo(x - 1, y - 18); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 5, y - 17); ctx.lineTo(x + 4, y - 23); ctx.lineTo(x + 1, y - 18); ctx.fill();
    const tail = Math.sin(G.clock * 2 + seed) * 4;
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 6, y - 3); ctx.quadraticCurveTo(x + 14, y + 2, x + 12 + tail, y + 10); ctx.stroke();
    ctx.fillStyle = seed % 4 === 0 ? '#ffd23f' : '#3d3a4f';
    if (blink) { ctx.fillRect(x - 3.5, y - 14.5, 3, 1); ctx.fillRect(x + 0.5, y - 14.5, 3, 1); }
    else { circle(x - 2, y - 14, 1.1); ctx.fill(); circle(x + 2, y - 14, 1.1); ctx.fill(); }
  }

  function pzDrawPizzeria(st, b) {
    const { x, w, top } = b, gy = st.R.g[Math.floor(x + w / 2)];
    // brick-red front with a cream band, a big plaque and a striped canopy
    ctx.fillStyle = '#d64f31'; ctx.fillRect(x, top + 6, w, gy - top - 6);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let yy = top + 12; yy < gy; yy += 8) for (let xx = x + ((yy / 8) % 2 ? 0 : 8); xx < x + w; xx += 16) ctx.fillRect(xx, yy, 14, 1);
    ctx.fillStyle = '#fff4e0'; ctx.fillRect(x, top + 6, w, 6);
    ctx.fillStyle = '#fff4e0'; rr(x + 20, top + 22, w - 40, 38, 10); ctx.fill();
    ctx.strokeStyle = '#2f8a4a'; ctx.lineWidth = 3; rr(x + 24, top + 26, w - 48, 30, 8); ctx.stroke();
    text('PIZZA', x + w / 2, top + 42, 24, '#d64f31', 'center');
    // windows upstairs
    for (let c = 0; c < 3; c++) { const wx = x + 26 + c * 52, wy = top + 74; ctx.fillStyle = '#fff4e0'; ctx.fillRect(wx - 2, wy - 2, 28, 34); ctx.fillStyle = '#ffe9b0'; ctx.fillRect(wx, wy, 24, 30); ctx.fillStyle = '#fff4e0'; ctx.fillRect(wx + 11, wy, 2, 30); }
    const cy = gy - 96;
    for (let i = 0; i * 12 < w; i++) { ctx.fillStyle = i % 2 ? '#fff4e0' : '#2f8a4a'; ctx.fillRect(x + i * 12, cy, 12, 16); ctx.beginPath(); ctx.arc(x + i * 12 + 6, cy + 16, 6, 0, Math.PI); ctx.fill(); }
    ctx.fillStyle = '#1f6b37'; ctx.fillRect(x - 4, cy - 3, w + 8, 4);
    // the oven window with a glowing pizza, and the shop door
    ctx.fillStyle = '#7a2c1c'; rr(x + 12, gy - 70, 84, 62, 10); ctx.fill();
    const glow = 0.85 + 0.15 * Math.sin(G.clock * 3);
    const og = ctx.createRadialGradient(x + 54, gy - 38, 4, x + 54, gy - 38, 44);
    og.addColorStop(0, '#fff0a8'); og.addColorStop(1, '#ff9a3c');
    ctx.globalAlpha = glow; ctx.fillStyle = og; rr(x + 16, gy - 66, 76, 54, 8); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#d88a3a'; circle(x + 54, gy - 38, 19); ctx.fill();
    ctx.fillStyle = '#ffcf5a'; circle(x + 54, gy - 38, 15); ctx.fill();
    ctx.fillStyle = '#e2452b'; for (const [dx, dy] of [[-6, -5], [6, -4], [0, 7], [-8, 5], [8, 6], [1, -1]]) { circle(x + 54 + dx, gy - 38 + dy, 2.4); ctx.fill(); }
    ctx.fillStyle = '#5a2a1a'; rr(x + w - 64, gy - 70, 50, 70, 8); ctx.fill();
    ctx.fillStyle = '#7a3a24'; rr(x + w - 59, gy - 65, 40, 65, 6); ctx.fill();
    ctx.fillStyle = '#ffe9b0'; rr(x + w - 52, gy - 58, 26, 18, 4); ctx.fill();
    ctx.fillStyle = C.gold; circle(x + w - 24, gy - 30, 2.6); ctx.fill();
    // the chef waves you off
    const wave = Math.sin(G.clock * 6) * 0.4;
    ctx.fillStyle = '#ffffff'; rr(x + 104, gy - 64, 20, 12, 5); ctx.fill(); circle(x + 109, gy - 66, 6); ctx.fill(); circle(x + 119, gy - 66, 6); ctx.fill();
    ctx.fillStyle = '#f2c29b'; circle(x + 114, gy - 46, 9); ctx.fill();
    ctx.fillStyle = C.ink; circle(x + 111, gy - 47, 1.3); ctx.fill(); circle(x + 117, gy - 47, 1.3); ctx.fill();
    ctx.strokeStyle = '#5a2a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 108, gy - 42); ctx.quadraticCurveTo(x + 114, gy - 39, x + 120, gy - 42); ctx.stroke();
    ctx.fillStyle = '#ffffff'; rr(x + 104, gy - 37, 20, 37, 6); ctx.fill();
    ctx.save(); ctx.translate(x + 124, gy - 32); ctx.rotate(-0.8 + wave); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -3, 16, 6); ctx.fillStyle = '#f2c29b'; circle(17, 0, 4); ctx.fill(); ctx.restore();
  }

  function pzDrawHouse(st) {
    const d = st.R.door, h = st.def.house || { num: '1', col: '#ffd6a5' };
    if (!d) return;
    const gy = d.y + 60, x0 = d.x - 70, x1 = d.x + 150, top = gy - 190;
    // garden fence and the path
    ctx.fillStyle = h.col; ctx.fillRect(x0, top, x1 - x0, gy - top);
    ctx.fillStyle = 'rgba(60,40,60,0.10)'; ctx.fillRect(x1 - 8, top, 8, gy - top);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x0 - 3, top, x1 - x0 + 6, 6);
    ctx.fillStyle = '#c0583c'; ctx.beginPath(); ctx.moveTo(x0 - 14, top + 2); ctx.lineTo((x0 + x1) / 2, top - 56); ctx.lineTo(x1 + 14, top + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 1.5;
    for (let r = 1; r < 6; r++) { const yy = top + 2 - r * 9, half = ((x1 - x0) / 2 + 14) * (1 - r * 9 / 58); ctx.beginPath(); ctx.moveTo((x0 + x1) / 2 - half, yy); ctx.lineTo((x0 + x1) / 2 + half, yy); ctx.stroke(); }
    ctx.fillStyle = '#a3462e'; ctx.fillRect(x1 - 50, top - 46, 14, 34);
    // windows: one with the customer peeking out
    for (const wx of [x0 + 24, x1 - 64]) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(wx - 3, top + 26, 46, 40);
      ctx.fillStyle = '#ffe9a8'; ctx.fillRect(wx, top + 29, 40, 34);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(wx + 19, top + 29, 2, 34);
      ctx.fillStyle = '#5fab55'; for (let f = 0; f < 5; f++) { circle(wx + 2 + f * 9, top + 66, 4); ctx.fill(); }
      ctx.fillStyle = '#ff6b8a'; for (let f = 0; f < 5; f++) { circle(wx + 2 + f * 9, top + 63, 2); ctx.fill(); }
    }
    const delivered = st.phase === 'deliver';
    const bob = delivered ? Math.sin(G.clock * 10) * 2 : Math.sin(G.clock * 2);
    const fx = x0 + 34, fy = top + 52 + bob;
    ctx.fillStyle = '#b48cff'; circle(fx, fy, 10); ctx.fill();
    ctx.fillStyle = C.ink; circle(fx - 4, fy - 2, 1.6); ctx.fill(); circle(fx + 4, fy - 2, 1.6); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(fx, fy + 1, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();
    // porch and door: opens on delivery
    ctx.fillStyle = '#ffffff'; ctx.fillRect(d.x - 4, gy - 80, 68, 6);
    ctx.fillStyle = '#e8dcc8'; ctx.fillRect(d.x - 6, gy - 6, 72, 6);
    ctx.fillStyle = '#5a3a20'; rr(d.x + 4, d.y + 2, 52, 58, 7); ctx.fill();
    if (delivered) {
      ctx.fillStyle = C.doorIn; rr(d.x + 6, d.y + 4, 48, 56, 6); ctx.fill();
      ctx.fillStyle = '#8a5833'; ctx.beginPath(); ctx.moveTo(d.x + 6, d.y + 4); ctx.lineTo(d.x + 18, d.y + 10); ctx.lineTo(d.x + 18, d.y + 56); ctx.lineTo(d.x + 6, d.y + 60); ctx.closePath(); ctx.fill();
      const wave = Math.sin(G.clock * 14) * 0.5;
      ctx.save(); ctx.translate(d.cx + 10, d.y + 30); ctx.rotate(wave);
      ctx.fillStyle = '#f2c29b'; circle(0, -8, 6); ctx.fill(); ctx.fillRect(-2, -4, 4, 12);
      ctx.restore();
    } else {
      ctx.fillStyle = '#8a5833'; rr(d.x + 6, d.y + 4, 48, 56, 6); ctx.fill();
      ctx.fillStyle = 'rgba(28,26,54,0.18)'; rr(d.x + 12, d.y + 10, 16, 20, 3); ctx.fill(); rr(d.x + 32, d.y + 10, 16, 20, 3); ctx.fill();
      rr(d.x + 12, d.y + 36, 16, 18, 3); ctx.fill(); rr(d.x + 32, d.y + 36, 16, 18, 3); ctx.fill();
      ctx.fillStyle = C.gold; circle(d.x + 47, d.y + 34, 2.6); ctx.fill();
    }
    ctx.fillStyle = '#fff8ea'; rr(d.cx - 14, d.y - 15, 28, 16, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(28,26,54,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    text(h.num, d.cx, d.y - 6.5, 13, C.ink, 'center', 'body');
    ctx.fillStyle = '#b84a3a'; rr(d.cx - 35, gy - 5, 70, 5, 2); ctx.fill();
    // a picket fence each side of the path
    for (const [fa, fb] of [[x0 - 40, d.x - 10], [d.x + 70, x1 + 40]]) pzFence(fa, fb, gy, '#ffffff');
  }

  function pzFence(x0, x1, gy, col) {
    ctx.fillStyle = col;
    ctx.fillRect(x0, gy - 22, x1 - x0, 3); ctx.fillRect(x0, gy - 11, x1 - x0, 3);
    for (let x = x0; x < x1; x += 9) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy - 26); ctx.lineTo(x + 3, gy - 30); ctx.lineTo(x + 6, gy - 26); ctx.lineTo(x + 6, gy); ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(x0, gy - 3, x1 - x0, 3);
  }

  /* ----- props on the pavement ----- */
  function pzDrawProp(st, p) {
    const R = st.R, gy = pzGAt(R, p.x), x = p.x;
    if (p.kind === 'lamp') {
      ctx.fillStyle = '#3d3a4f'; ctx.fillRect(x - 2.5, gy - 92, 5, 92); ctx.fillRect(x - 6, gy - 8, 12, 8);
      ctx.beginPath(); ctx.moveTo(x, gy - 92); ctx.quadraticCurveTo(x + 2, gy - 104, x + 14, gy - 102); ctx.lineWidth = 3; ctx.strokeStyle = '#3d3a4f'; ctx.stroke();
      ctx.fillStyle = '#3d3a4f'; rr(x + 8, gy - 104, 14, 8, 3); ctx.fill();
      const on = st.room === 3;
      ctx.fillStyle = on ? '#fff0a8' : '#f2ead2'; ctx.beginPath(); ctx.moveTo(x + 9, gy - 96); ctx.lineTo(x + 21, gy - 96); ctx.lineTo(x + 18, gy - 88); ctx.lineTo(x + 12, gy - 88); ctx.fill();
      if (on) { const lg = ctx.createRadialGradient(x + 15, gy - 90, 2, x + 15, gy - 90, 46); lg.addColorStop(0, 'rgba(255,230,150,0.5)'); lg.addColorStop(1, 'rgba(255,230,150,0)'); ctx.fillStyle = lg; ctx.fillRect(x - 31, gy - 136, 92, 92); }
      // a hanging flower basket
      ctx.fillStyle = '#8a5833'; ctx.beginPath(); ctx.arc(x - 9, gy - 70, 6, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#5fab55'; circle(x - 9, gy - 72, 5); ctx.fill(); ctx.fillStyle = '#ff6b8a'; circle(x - 11, gy - 74, 2); ctx.fill(); circle(x - 6, gy - 73, 2); ctx.fill();
    } else if (p.kind === 'tree') {
      const sway = Math.sin(G.clock * 1.3 + p.seed) * 1.5 - (st.windState === 'gust' && R.wind && x > R.wind.x0 - 200 && x < R.wind.x1 + 200 ? st.windG * 8 : 0);
      ctx.fillStyle = '#8a5833'; ctx.fillRect(x - 3.5, gy - 54, 7, 54);
      ctx.fillStyle = '#7d756a'; rr(x - 13, gy - 8, 26, 8, 2); ctx.fill();
      const green = st.room === 3 ? ['#c98a3a', '#e0a74a', '#b8742e'] : ['#4f9a4f', '#6dbb5f', '#3f8a46'];
      ctx.fillStyle = green[2]; circle(x + sway - 14, gy - 58, 17); ctx.fill(); circle(x + sway + 15, gy - 60, 16); ctx.fill();
      ctx.fillStyle = green[0]; circle(x + sway, gy - 72, 23); ctx.fill();
      ctx.fillStyle = green[1]; circle(x + sway - 7, gy - 80, 12); ctx.fill(); circle(x + sway + 9, gy - 66, 9); ctx.fill();
    } else if (p.kind === 'bench') {
      // (rich props pass) a park bench: a shadow, curled iron legs with feet, outlined slats with a lit top, grain and bolts
      ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(x + 2, gy, 28, 2.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3d3a4f'; ctx.fillRect(x - 22, gy - 30, 3, 30); ctx.fillRect(x + 19, gy - 30, 3, 30);
      ctx.fillRect(x - 25, gy - 2, 8, 2); ctx.fillRect(x + 17, gy - 2, 8, 2);
      ctx.strokeStyle = '#3d3a4f'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x - 17, gy - 10, 4, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(x + 17, gy - 10, 4, Math.PI * 1.5, Math.PI * 0.5); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x - 21.6, gy - 29, 0.8, 27); ctx.fillRect(x + 19.4, gy - 29, 0.8, 27);
      for (const [sy, sh] of [[gy - 16, 4], [gy - 28, 4], [gy - 22, 3]]) {
        ctx.fillStyle = '#7a4a26'; rr(x - 25.6, sy - 0.6, 51.2, sh + 1.2, 1); ctx.fill();
        ctx.fillStyle = '#b8743e'; ctx.fillRect(x - 25, sy, 50, sh);
        ctx.fillStyle = '#d99a62'; ctx.fillRect(x - 25, sy, 50, 1);
        ctx.fillStyle = 'rgba(122,74,38,0.5)'; ctx.fillRect(x - 12, sy + sh * 0.6, 14, 0.6); ctx.fillRect(x + 6, sy + sh * 0.4, 10, 0.6);
        ctx.fillStyle = '#3d3a4f'; circle(x - 20.5, sy + sh / 2, 0.8); ctx.fill(); circle(x + 20.5, sy + sh / 2, 0.8); ctx.fill();
      }
    } else if (p.kind === 'pots') {
      for (let k = 0; k < 3; k++) {
        const px = x - 16 + k * 16, s = 0.8 + (k % 2) * 0.3;
        ctx.fillStyle = '#c0583c'; ctx.beginPath(); ctx.moveTo(px - 7 * s, gy - 14 * s); ctx.lineTo(px + 7 * s, gy - 14 * s); ctx.lineTo(px + 5 * s, gy); ctx.lineTo(px - 5 * s, gy); ctx.fill();
        ctx.fillStyle = '#5fab55'; circle(px, gy - 18 * s, 8 * s); ctx.fill();
        ctx.fillStyle = ['#ffd23f', '#ff6b8a', '#ffffff'][k]; circle(px - 2, gy - 21 * s, 2.4); ctx.fill(); circle(px + 3, gy - 17 * s, 2.4); ctx.fill();
      }
    } else if (p.kind === 'hydrant') {
      // (rich props pass) a hydrant: shadow, outline, shaded right side, lit left edge, bolted base, side caps with nuts
      ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(x + 2, gy, 11, 2.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a1f1a'; rr(x - 6.8, gy - 22.8, 13.6, 22.8, 3.5); ctx.fill(); ctx.beginPath(); ctx.arc(x, gy - 22, 6.8, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 10.8, gy - 16.8, 21.6, 6.6);
      ctx.fillStyle = '#d93a2b'; rr(x - 6, gy - 22, 12, 22, 3); ctx.fill(); ctx.beginPath(); ctx.arc(x, gy - 22, 6, Math.PI, 0); ctx.fill();
      ctx.fillRect(x - 10, gy - 16, 20, 5);
      ctx.fillStyle = '#b02e22'; ctx.fillRect(x + 2, gy - 26, 4, 26); ctx.fillRect(x + 6, gy - 16, 4, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x - 4.6, gy - 25, 1.2, 22);
      ctx.fillStyle = '#8a1f1a'; rr(x - 8, gy - 4, 16, 4, 1); ctx.fill(); rr(x - 2, gy - 30, 4, 3, 1); ctx.fill();
      ctx.fillStyle = '#c9cde0'; for (const bx of [x - 6, x + 6]) { circle(bx, gy - 2, 0.9); ctx.fill(); } circle(x - 10, gy - 13.5, 1.3); ctx.fill(); circle(x + 10, gy - 13.5, 1.3); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 6, gy - 8, 12, 2);
    } else if (p.kind === 'bin') {
      // (rich props pass) a street bin: shadow, outline, ribs, a shaded right side, a domed lid with a handle
      ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(x + 2, gy, 12, 2.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2c4a4b'; rr(x - 9.8, gy - 26.8, 19.6, 26.8, 3.5); ctx.fill();
      ctx.fillStyle = '#4f7f80'; rr(x - 9, gy - 26, 18, 26, 3); ctx.fill();
      ctx.fillStyle = '#3c6566'; ctx.fillRect(x + 3, gy - 26, 6, 26);
      ctx.fillStyle = 'rgba(28,26,54,0.25)'; for (const rx of [x - 4, x + 1, x + 6]) ctx.fillRect(rx, gy - 22, 1, 18);
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x - 6, gy - 22, 2, 18);
      ctx.fillStyle = '#2c4a4b'; rr(x - 11.8, gy - 28.8, 23.6, 5.6, 2); ctx.fill(); ctx.fillStyle = '#3c6566'; ctx.fillRect(x - 11, gy - 28, 22, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x - 10, gy - 28, 20, 0.9);
      ctx.fillStyle = '#2c4a4b'; rr(x - 4, gy - 31.5, 8, 3, 1.5); ctx.fill();
    } else if (p.kind === 'mail') {
      // (rich props pass) a mailbox: a post with a lit edge, an outlined rounded box with a shaded foot, a door seam,
      // a slot and a raised flag
      ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(x + 1, gy, 7, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3d3a4f'; ctx.fillRect(x - 2, gy - 22, 4, 22); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x - 1.6, gy - 21, 0.8, 20);
      ctx.fillStyle = '#1d3f80'; rr(x - 12.8, gy - 38.8, 25.6, 19.6, 8.6); ctx.fill();
      ctx.fillStyle = '#2f6fd6'; rr(x - 12, gy - 38, 24, 18, 8); ctx.fill();
      ctx.fillStyle = '#2458b0'; rr(x - 12, gy - 26, 24, 6, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(x - 8, gy - 36.6, 14, 2, 1); ctx.fill();
      ctx.fillStyle = '#1d3f80'; ctx.fillRect(x - 6, gy - 31, 12, 1.6); ctx.fillRect(x - 11, gy - 38, 1, 17);
      ctx.fillStyle = '#c99a1f'; ctx.fillRect(x + 7.6, gy - 44.6, 4, 11); ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 8, gy - 44, 3, 10); ctx.fillRect(x + 8, gy - 44, 6, 3);
    }
  }

  function pzDrawSign(st, s) {
    const R = st.R, x = s.x + 30, gy = pzGAt(R, x);
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    const words = s.text.split(' '), lines = [''];
    for (const w of words) { const t = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w; if (ctx.measureText(t).width > 150 && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = t; }
    const bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 22, bh = 12 + lines.length * 16, by = gy - 118 - bh;
    ctx.fillStyle = '#6b4630'; ctx.fillRect(x - 3, by + bh - 4, 6, gy - by - bh + 4);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; rr(x - bw / 2 + 3, by + 3, bw, bh, 7); ctx.fill();
    ctx.fillStyle = '#fff6e0'; rr(x - bw / 2, by, bw, bh, 7); ctx.fill();
    ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 2.5; ctx.stroke();
    lines.forEach((l, i) => text(l, x, by + 14 + i * 16, 13, '#3d3a4f', 'center', 'body'));
  }

  /* ----- the ground: pavement on top, a stone wall under it ----- */
  function pzDrawGround(st) {
    const R = st.R, x0 = Math.max(0, Math.floor(st.cam.x) - 4), x1 = Math.min(R.len - 1, Math.ceil(st.cam.x + W) + 4);
    const bot = st.cam.y + H + 10;
    const path = off => { ctx.beginPath(); ctx.moveTo(x0, bot); for (let x = x0; x <= x1; x += 3) ctx.lineTo(x, R.g[x] + off); ctx.lineTo(x1, R.g[x1] + off); ctx.lineTo(x1, bot); ctx.closePath(); };
    // pavement on top, then a curb, then the retaining wall of warm stone blocks under it
    path(0); ctx.fillStyle = '#e3d8c4'; ctx.fill();
    path(7); ctx.fillStyle = '#b3a38c'; ctx.fill();
    path(11);
    const wg = ctx.createLinearGradient(0, st.cam.y + 330, 0, bot);
    wg.addColorStop(0, '#c4ad92'); wg.addColorStop(1, '#94806d');
    ctx.fillStyle = wg; ctx.fill();
    ctx.save(); path(11); ctx.clip();
    const by0 = Math.floor((st.cam.y + 200) / 20) * 20;
    for (let yy = by0, row = 0; yy < bot; yy += 20, row++) {
      const off = (yy / 20) % 2 ? 0 : 22;
      for (let xx = Math.floor(x0 / 44) * 44 - 44 + off; xx < x1 + 44; xx += 44) {
        const hsh = hash(xx | 0, yy | 0), shade = 0.06 + (hsh % 5) * 0.025;
        ctx.fillStyle = (hsh >>> 3) % 2 ? 'rgba(255,240,220,' + shade.toFixed(3) + ')' : 'rgba(90,60,40,' + shade.toFixed(3) + ')';
        rr(xx + 1.5, yy + 1.5, 41, 17, 4); ctx.fill();
      }
      ctx.fillStyle = 'rgba(80,55,40,0.2)'; ctx.fillRect(x0, yy, x1 - x0, 1.5);
      for (let xx = Math.floor(x0 / 44) * 44 - 44 + off; xx < x1 + 44; xx += 44) ctx.fillRect(xx, yy, 1.5, 20);
    }
    // the shadow the curb throws on the wall, and ivy hanging over it here and there
    ctx.restore();
    ctx.save(); path(11); ctx.clip();
    ctx.beginPath(); for (let x = x0; x <= x1; x += 3) ctx.lineTo(x, R.g[x] + 11); for (let x = x1; x >= x0; x -= 3) ctx.lineTo(x, R.g[x] + 24); ctx.closePath();
    ctx.fillStyle = 'rgba(60,40,30,0.18)'; ctx.fill();
    for (let x = Math.floor(x0 / 37) * 37; x < x1; x += 37) {
      const hh = hash(x, st.room + 5);
      if (hh % 4) continue;
      const gy = R.g[clamp(x, 0, R.len - 1)] + 10, len = 16 + (hh >>> 4) % 34;
      for (let k = 0; k < 4; k++) {
        const vx = x + k * 6 + Math.sin(G.clock * 1.2 + k + x) * 1.2;
        ctx.strokeStyle = '#4f8a46'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + k * 6, gy); ctx.quadraticCurveTo(vx + 3, gy + len * 0.5, vx, gy + len - k * 4); ctx.stroke();
        for (let l = 4; l < len - k * 4; l += 6) { ctx.fillStyle = l % 12 ? '#6dbb5f' : '#4f9a4f'; ctx.beginPath(); ctx.ellipse(vx + (l % 12 ? 2.5 : -2.5), gy + l, 3, 2, 0.5, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    ctx.restore();
    // (rich props pass) paving slabs: each slab its own tone, a lit left edge by its joint, a chip or a hairline crack
    // on some, a gum spot or a pebble now and then; the curb gets a lit lip and a dark joint every few slabs.
    // Each kind of mark is gathered into one path and filled once (one fill per colour, not per slab).
    const tones = [null, new Path2D(), new Path2D(), new Path2D()], lit = new Path2D(), cracks = new Path2D(), spots = new Path2D(), lipD = new Path2D(), lipL = new Path2D(), cj = new Path2D();
    for (let x = Math.floor(x0 / 30) * 30; x < x1; x += 30) {
      const hs = hash(x, 913), gx = R.g[clamp(x, 0, R.len - 1)], gx2 = R.g[clamp(x + 29, 0, R.len - 1)];
      if (Math.abs(gx2 - gx) > 2) continue; // a slope or a step: leave the plain pavement
      const tn = hs % 4;
      if (tn) tones[tn].rect(x + 1.5, gx + 1.6, 28.5, 5.2);
      lit.rect(x + 1.5, gx + 1.6, 1, 5.2);
      if ((hs >>> 3) % 3 === 0) { const cx = x + 6 + (hs >>> 5) % 16; cracks.moveTo(cx, gx + 1.5); cracks.lineTo(cx + 2, gx + 3.5); cracks.lineTo(cx + 1, gx + 5); cracks.lineTo(cx + 4, gx + 6.8); }
      if ((hs >>> 7) % 5 === 0) { const sx = x + 8 + (hs >>> 9) % 14; spots.moveTo(sx + 1.8, gx + 4.4); spots.ellipse(sx, gx + 4.4, 1.8, 0.9, 0, 0, Math.PI * 2); }
      lipD.rect(x, gx + 7.2, 30, 0.9); lipL.rect(x, gx + 7.2, 30, 0.6);
      if (x % 90 === 0) cj.rect(x, gx + 7.2, 1.2, 3.8);
    }
    ['', 'rgba(255,250,240,0.35)', 'rgba(120,95,70,0.1)', 'rgba(200,170,130,0.16)'].forEach((col, k) => { if (k) { ctx.fillStyle = col; ctx.fill(tones[k]); } });
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill(lit);
    ctx.strokeStyle = 'rgba(90,70,55,0.35)'; ctx.lineWidth = 0.8; ctx.stroke(cracks);
    ctx.fillStyle = 'rgba(110,90,80,0.45)'; ctx.fill(spots);
    ctx.fillStyle = 'rgba(80,60,50,0.12)'; ctx.fill(lipD);
    ctx.fillStyle = 'rgba(255,245,230,0.35)'; ctx.fill(lipL);
    ctx.fillStyle = 'rgba(80,60,50,0.3)'; ctx.fill(cj);
    ctx.fillStyle = 'rgba(80,60,50,0.22)';
    for (let x = Math.floor(x0 / 30) * 30; x < x1; x += 30) ctx.fillRect(x, R.g[clamp(x, 0, R.len - 1)] + 1, 1.5, 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let x = x0; x <= x1; x += 3) { if (x === x0) ctx.moveTo(x, R.g[x] + 0.8); else ctx.lineTo(x, R.g[x] + 0.8); }
    ctx.stroke();
    if (st.room === 1) { // wet pavement shine
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      for (let i = 0; i < 40; i++) { const x = (hash(i, 77) % R.len); if (x < x0 || x > x1) continue; ctx.fillRect(x, R.g[x] + 2, 14 + (i % 4) * 6, 1.5); }
    }
    // stairs: lit step noses, and a handrail
    for (const s of R.stairs) {
      if (s.x1 < x0 - 40 || s.x0 > x1 + 40) continue;
      for (const t of s.tread) { ctx.fillStyle = '#efe6d4'; ctx.fillRect(t.x, t.y, s.run, 3); ctx.fillStyle = 'rgba(80,60,50,0.3)'; ctx.fillRect(t.x + (s.rise > 0 ? 0 : s.run - 2), t.y, 2, Math.abs(s.rise) + 4); }
      pzRail(R, s.x0 - 10, s.x1 + 10, 40);
    }
    // bridges: an arch over a canal
    for (const b of R.bridges) pzDrawBridge(st, b);
    // speed bumps
    for (const bp of R.bumps) {
      if (bp.x0 < x0 - 40 || bp.x0 > x1) continue;
      const y1 = pzGAt(R, bp.x0 - 1);
      ctx.save(); ctx.beginPath(); ctx.moveTo(bp.x0, y1);
      for (let u = 0; u <= 30; u += 2) ctx.lineTo(bp.x0 + u, y1 - 7 * Math.sin(Math.PI * u / 30));
      ctx.closePath(); ctx.fillStyle = C.gold; ctx.fill(); ctx.clip();
      ctx.fillStyle = C.ink; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(bp.x0 + 3 + i * 9, y1); ctx.lineTo(bp.x0 + 8 + i * 9, y1 - 9); ctx.lineTo(bp.x0 + 11 + i * 9, y1 - 9); ctx.lineTo(bp.x0 + 6 + i * 9, y1); ctx.fill(); }
      ctx.restore();
    }
  }
  function pzRail(R, x0, x1, hgt) {
    const y = x => pzGAt(R, x) - hgt;
    ctx.strokeStyle = '#3d3a4f'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    const sm = x => { let s = 0, n = 0; for (let k = -24; k <= 24; k += 6) { s += y(x + k); n++; } return s / n; };
    for (let x = x0; x <= x1; x += 6) { if (x === x0) ctx.moveTo(x, sm(x)); else ctx.lineTo(x, sm(x)); }
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); for (let x = x0; x <= x1; x += 28) { ctx.moveTo(x, sm(x)); ctx.lineTo(x, pzGAt(R, x)); } ctx.stroke();
  }
  function pzDrawBridge(st, b) {
    const R = st.R;
    // water under the arch
    const wy = b.y + 34;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(b.x0 + 30, b.y + 12);
    for (let x = b.x0 + 30; x <= b.x1 - 30; x += 4) ctx.lineTo(x, pzGAt(R, x) + 24 + 18 * Math.sin(Math.PI * (x - b.x0 - 30) / (b.x1 - b.x0 - 60)));
    ctx.lineTo(b.x1 - 30, b.y + 200); ctx.lineTo(b.x0 + 30, b.y + 200); ctx.closePath();
    ctx.clip();
    const wg = ctx.createLinearGradient(0, wy - 10, 0, wy + 120);
    wg.addColorStop(0, '#2c4f6e'); wg.addColorStop(0.3, '#5fa3c7'); wg.addColorStop(1, '#3f7ea3');
    ctx.fillStyle = '#2c3a4e'; ctx.fillRect(b.x0, b.y - 100, b.x1 - b.x0, 400);
    ctx.fillStyle = wg; ctx.fillRect(b.x0, wy, b.x1 - b.x0, 300);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) { const xx = b.x0 + 40 + ((G.clock * 20 + i * 47) % (b.x1 - b.x0 - 80)); ctx.beginPath(); ctx.moveTo(xx, wy + 8 + i * 6); ctx.lineTo(xx + 16, wy + 8 + i * 6); ctx.stroke(); }
    ctx.restore();
    // the arch's stones
    ctx.strokeStyle = '#efe6d4'; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = b.x0 + 30; x <= b.x1 - 30; x += 4) { const yy = pzGAt(R, x) + 24 + 18 * Math.sin(Math.PI * (x - b.x0 - 30) / (b.x1 - b.x0 - 60)); if (x === b.x0 + 30) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
    ctx.stroke();
    // stone balustrade
    ctx.fillStyle = '#e8dcc6';
    for (let x = b.x0 + 8; x < b.x1 - 8; x += 14) { const gy = pzGAt(R, x); rr(x - 3, gy - 26, 6, 26, 2); ctx.fill(); }
    ctx.strokeStyle = '#e8dcc6'; ctx.lineWidth = 5; ctx.beginPath();
    for (let x = b.x0 + 4; x <= b.x1 - 4; x += 4) { const yy = pzGAt(R, x) - 28; if (x === b.x0 + 4) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
    ctx.stroke();
  }

  /* ----- awnings: the low ones you must get under (lower BOTH ends) ----- */
  function pzDrawAwnings(st) {
    const R = st.R, pal = [['#2f8a4a', '#fff4e0'], ['#c0583c', '#fff4e0'], ['#2f6fd6', '#fff4e0'], ['#d9922e', '#fff4e0']];
    for (const a of R.awn) {
      if (a.x1 < st.cam.x - 40 || a.x0 > st.cam.x + W + 40) continue;
      const [c1, c2] = pal[(a.k + st.room) % 4], y0 = a.y - 30;
      // the shop wall it hangs from, behind the players
      ctx.fillStyle = 'rgba(61,58,79,0.5)';
      const p0 = pzGAt(R, a.x0 + 4), p1 = pzGAt(R, a.x1 - 4);
      ctx.fillRect(a.x0 + 2, y0 + 20, 5, p0 - y0 - 20); ctx.fillRect(a.x1 - 7, y0 + 20, 5, p1 - y0 - 20);
      // sloped top
      const tg = ctx.createLinearGradient(0, y0 - 14, 0, y0 + 8);
      tg.addColorStop(0, c1); tg.addColorStop(1, '#00000000');
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(a.x0 - 8, y0 + 8); ctx.lineTo(a.x0 + 10, y0 - 12); ctx.lineTo(a.x1 - 10, y0 - 12); ctx.lineTo(a.x1 + 8, y0 + 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(a.x0 + 10, y0 - 12); ctx.lineTo(a.x1 - 10, y0 - 12); ctx.lineTo(a.x1 - 4, y0 - 6); ctx.lineTo(a.x0 + 4, y0 - 6); ctx.fill();
      // striped valance; the scallops end exactly on the line the stack can't pass (a.y)
      for (let x = a.x0 - 6, i = 0; x < a.x1 + 6; x += 12, i++) {
        ctx.fillStyle = i % 2 ? c2 : c1;
        ctx.fillRect(x, y0 + 8, 12, 16);
        ctx.beginPath(); ctx.arc(x + 6, y0 + 24, 6, 0, Math.PI); ctx.fill();
      }
      ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.fillRect(a.x0 - 6, y0 + 8, a.x1 - a.x0 + 12, 3);
      ctx.fillStyle = C.ink; rr(a.x0 - 9, y0 + 5, a.x1 - a.x0 + 18, 4, 2); ctx.fill();
      // a shop name on top
      const names = ['CAFÉ', 'BOOKS', 'FLOWERS', 'BAKERY', 'TOYS', 'CHEESE'];
      text(names[(a.k + st.room * 2) % names.length], (a.x0 + a.x1) / 2, y0 - 2, 12, '#ffffff', 'center');
    }
  }

  /* ----- dogs in their yards ----- */
  function pzDrawDogs(st) {
    const R = st.R;
    for (const d of R.dogs) {
      if (d.x < st.cam.x - 80 || d.x > st.cam.x + W + 80) continue;
      const gy = pzGAt(R, d.x);
      pzFence(d.x - 50, d.x + 50, gy, '#f4ead8');
      const u = d.air >= 0 ? clamp(d.air / PZ.dog.air, 0, 1) : 0, up = Math.sin(Math.PI * u);
      const y = gy - (PZ.dog.reach - 22) * up, look = st.X > d.x ? 1 : -1;
      pzDrawDog(d.x, y, look, up, d.k + st.room);
      if (d.woofT > 0.3) { ctx.save(); ctx.globalAlpha = clamp((d.woofT - 0.3) / 0.3, 0, 1); text('Woof!', d.x + look * 30, y - 40, 15, '#3d3a4f', 'center'); ctx.restore(); }
    }
  }
  function pzDrawDog(x, y, f, up, k) {
    const col = ['#d9a066', '#ffffff', '#6b4a3a', '#e8c890'][k % 4], spot = ['#8a5833', '#3d3a4f', '#3d2a20', '#c49a5a'][k % 4];
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    ctx.rotate(-0.5 * up);
    // tail wags
    const wag = Math.sin(G.clock * 18) * 0.6;
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(-20 + wag * 3, -24 - wag * 2); ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, -14, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = spot; circle(-4, -17, 4); ctx.fill();
    ctx.fillStyle = col; ctx.fillRect(-11, -8, 5, 8 + up * 2); ctx.fillRect(6, -8, 5, 8 - up * 2);
    circle(13, -24, 9); ctx.fill();
    ctx.beginPath(); ctx.ellipse(21, -21, 6, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = spot; ctx.beginPath(); ctx.ellipse(8, -26, 4, 8, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; circle(26, -22, 2); ctx.fill(); circle(15, -27, 1.6); ctx.fill();
    if (up > 0.3) { ctx.fillStyle = '#ff8fa3'; ctx.beginPath(); ctx.ellipse(22, -16, 2.5, 4, 0.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  function pzDrawWindsock(st) {
    const R = st.R;
    if (!R.wind) return;
    for (const px of [R.wind.x0 - 40, (R.wind.x0 + R.wind.x1) / 2, R.wind.x1 + 30]) {
      if (px < st.cam.x - 60 || px > st.cam.x + W + 60) continue;
      const base = pzGAt(R, px), top = base - 100;
      ctx.fillStyle = '#3d3a4f'; ctx.fillRect(px - 2, top, 4, 100); circle(px, top, 4); ctx.fill();
      let ang;
      if (st.windState === 'gust') ang = Math.PI + Math.sin(G.clock * 75) * 0.06 * st.windG + (1 - st.windG) * -1.1;
      else if (st.windState === 'warn') ang = Math.PI - 0.52 + Math.sin(G.clock * 38) * 0.26;
      else ang = Math.PI / 2 + 0.1 + Math.sin(G.clock * 1.5) * 0.05;
      ctx.save(); ctx.translate(px, top + 4); ctx.rotate(ang);
      for (let i = 0; i < 3; i++) {
        const x = i * 12, hw = 8 - i * 1.8, hw2 = 8 - (i + 1) * 1.8;
        const wob = st.windState === 'calm' ? 0 : Math.sin(G.clock * 30 + i) * 1.5;
        ctx.fillStyle = i % 2 ? '#ffffff' : '#ff8a3d';
        ctx.beginPath(); ctx.moveTo(x, -hw + wob); ctx.lineTo(x + 12, -hw2 + wob); ctx.lineTo(x + 12, hw2 + wob); ctx.lineTo(x, hw + wob); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }

  function pzDrawLines(st) {
    for (const l of st.deco.lines) {
      if (l.x1 < st.cam.x - 20 || l.x0 > st.cam.x + W + 20) continue;
      const mx = (l.x0 + l.x1) / 2, my = (l.y0 + l.y1) / 2 + 18;
      ctx.strokeStyle = 'rgba(61,58,79,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(l.x0, l.y0); ctx.quadraticCurveTo(mx, my + 10, l.x1, l.y1); ctx.stroke();
      const n = Math.max(2, Math.floor((l.x1 - l.x0) / 18));
      for (let j = 1; j < n; j++) {
        const t = j / n, px = (1 - t) * (1 - t) * l.x0 + 2 * (1 - t) * t * mx + t * t * l.x1, py = (1 - t) * (1 - t) * l.y0 + 2 * (1 - t) * t * (my + 10) + t * t * l.y1;
        const sw = Math.sin(G.clock * 2 + j + l.seed) * 2 - (st.windState === 'gust' ? st.windG * 5 : 0);
        ctx.fillStyle = ['#ff8fa3', '#7fc8ff', '#ffd23f', '#ffffff', '#8fe3b0'][(j + l.seed) % 5];
        ctx.beginPath(); ctx.moveTo(px - 5, py); ctx.lineTo(px + 5, py); ctx.lineTo(px + 5 + sw, py + 12); ctx.lineTo(px - 5 + sw, py + 12); ctx.fill();
      }
    }
  }

  /* ----- the carry: arms, tray (with a spirit level), and the stack ----- */
  function pzBoxShape(open, eaten) {
    if (open) {
      ctx.fillStyle = '#f4e4c1'; rr(-20, -3, 40, 8, 2); ctx.fill();
      ctx.strokeStyle = '#c49a5a'; ctx.lineWidth = 1.5; ctx.stroke();
      if (eaten) { ctx.fillStyle = '#e8a24a'; for (const dx of [-9, -2, 5, 11]) { circle(dx, -3.5, 1.2); ctx.fill(); } }
      else {
        ctx.fillStyle = '#e8a24a'; ctx.beginPath(); ctx.ellipse(0, -4, 17, 4.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.ellipse(0, -4.5, 14, 3.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e2452b'; for (const dx of [-8, -1, 6, 10]) { circle(dx, -4.5 + (dx % 3) * 0.3, 1.8); ctx.fill(); }
      }
      ctx.save(); ctx.translate(-20, -3); ctx.rotate(-2.1);
      ctx.fillStyle = '#efdcb4'; rr(0, -2, 40, 4, 1.5); ctx.fill(); ctx.strokeStyle = '#c49a5a'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
      return;
    }
    // closed box: cardboard with a lid seam, a red band and the shop's little slice logo
    ctx.fillStyle = '#e9d3a6'; rr(-20, -5, 40, 10, 2); ctx.fill();
    ctx.fillStyle = '#f6e7c8'; ctx.fillRect(-19, -4.5, 38, 3.5);
    ctx.fillStyle = 'rgba(140,100,50,0.35)'; ctx.fillRect(-19, -1, 38, 1);
    ctx.strokeStyle = '#b48a4e'; ctx.lineWidth = 1.3; rr(-20, -5, 40, 10, 2); ctx.stroke();
    ctx.fillStyle = '#d64f31'; ctx.fillRect(-19.3, 1.2, 38.6, 2.2);
    ctx.fillStyle = '#fff4e0'; circle(0, 0, 4.2); ctx.fill();
    ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.moveTo(-2.6, -2); ctx.lineTo(2.6, -2); ctx.lineTo(0, 2.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e2452b'; circle(0, -0.6, 0.9); ctx.fill();
  }

  function pzSquash(st) {
    for (const pc of st.pc) {
      const p = G.players[pc.id];
      const low = Math.max(0, pc.lift) / PZ.liftMax, high = Math.max(0, -pc.lift) / -PZ.liftMin;
      let sx = 1 + 0.18 * low, sy = 1 - 0.34 * low + 0.07 * high;
      const lt = st.clock - pc.landT;
      if (pc.grounded && lt < 0.12 && pc.landV > 150) sy = Math.min(sy, 0.85 + 0.15 * lt / 0.12);
      p.sx = sx; p.sy = sy;
      const lean = st.phase === 'play' && st.mode === 'push' && st.pusher === pc.id ? st.pushDir * 3 : 0;
      p.x = pc.xc - st.cam.x - PW / 2 + lean;
    }
  }

  function pzDrawCarry(st) {
    const g = pzGeom(st), del = st.fx.del;
    const shown = st.phase === 'deliver' && del ? Math.max(0, del.n - del.launched) : st.n;
    const n = st.phase === 'deliver' && del ? del.n : st.n;
    // arms (up over the head when raising)
    for (const pc of st.pc) {
      const p = G.players[pc.id], top = pc.feet - PH * p.sy, hand = pzHand(pc), xc = pc.xc + (p.x - (pc.xc - st.cam.x - PW / 2));
      const inner = pc.id === st.left ? 1 : -1;
      ctx.strokeStyle = PDARK[pc.id]; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const hx0 = xc + inner * 2 - 5, hx1 = xc + inner * 2 + 5;
      for (const [sx, hx] of [[xc - 8, hx0], [xc + 8, hx1]]) {
        const ex = (sx + hx) / 2 + (sx < xc ? -4 : 4), ey = (top + 8 + hand) / 2 + (hand < top ? 0 : 2);
        ctx.beginPath(); ctx.moveTo(sx, top + 8); ctx.quadraticCurveTo(ex, ey, hx, hand); ctx.stroke();
      }
      ctx.fillStyle = PCOL[pc.id]; circle(hx0, hand, 3.3); ctx.fill(); circle(hx1, hand, 3.3); ctx.fill();
      ctx.strokeStyle = PDARK[pc.id]; ctx.lineWidth = 1.2; circle(hx0, hand, 3.3); ctx.stroke(); circle(hx1, hand, 3.3); ctx.stroke();
    }
    // tray: a wooden board with a spirit level set into its front
    ctx.save(); ctx.translate(st.X, (g.hl + g.hr) / 2); ctx.rotate(g.a);
    const half = PZ.span / 2 + 12;
    ctx.fillStyle = 'rgba(28,26,54,0.18)'; rr(-half + 2, 1, half * 2, 4, 2); ctx.fill();
    // (rich props pass) the board: outlined in dark wood, a lit top edge, a shaded front, grain, a knot, two board
    // seams, brass corner caps with screws and end grain at each end
    const tt = PZ.trayTh;
    ctx.fillStyle = '#4a2e1b'; rr(-half - 0.8, -tt - 0.8, half * 2 + 1.6, tt + 1.6, 3.6); ctx.fill();
    ctx.fillStyle = '#8a5833'; rr(-half, -tt, half * 2, tt, 3); ctx.fill();
    ctx.fillStyle = '#c98b5a'; rr(-half, -tt, half * 2, tt - 2.5, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.fillRect(-half + 2.5, -tt + 0.3, half * 2 - 5, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(-half + 1, -tt + 3.4, half * 2 - 2, 1.1);
    ctx.strokeStyle = 'rgba(138,88,51,0.55)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-half + 6, -4.5); ctx.quadraticCurveTo(-34, -3.6, -20, -4); ctx.moveTo(10, -5); ctx.quadraticCurveTo(30, -4, half - 8, -4.6); ctx.moveTo(-half + 10, -2.4); ctx.lineTo(-24, -2.6); ctx.moveTo(18, -2.8); ctx.lineTo(half - 12, -2.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(110,65,35,0.6)'; ctx.beginPath(); ctx.ellipse(-30, -4, 2.4, 1.1, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#4a2e1b'; for (const sx of [-half * 0.55, half * 0.55]) ctx.fillRect(sx, -tt, 0.9, tt);
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; for (const sx of [-half * 0.55, half * 0.55]) ctx.fillRect(sx + 0.9, -tt + 0.5, 0.7, tt - 3);
    for (const d of [-1, 1]) {
      const ex = d * half;
      ctx.strokeStyle = 'rgba(90,55,30,0.5)'; ctx.lineWidth = 0.6;
      for (let r = 1.2; r < 3.6; r += 1.2) { ctx.beginPath(); ctx.arc(ex - d * 0.5, -tt / 2, r, d > 0 ? Math.PI / 2 : -Math.PI / 2, d > 0 ? Math.PI * 1.5 : Math.PI / 2); ctx.stroke(); }
      ctx.fillStyle = '#8f6a1e'; rr(ex - (d > 0 ? 6 : 0), -tt - 0.8, 6, tt + 1.6, 1.5); ctx.fill();
      ctx.fillStyle = '#e0b04a'; rr(ex - (d > 0 ? 5.4 : -0.6), -tt - 0.2, 4.8, tt - 1.4, 1.2); ctx.fill();
      ctx.fillStyle = '#5a4012'; circle(ex - d * 3, -tt / 2 - 0.3, 0.9); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(ex - d * 3 - 0.3, -tt / 2 - 0.7, 0.35); ctx.fill();
    }
    // the level vial
    const off = clamp(-g.a * 70, -9, 9), ok = Math.abs(st.tilt) <= PZ.dead, far = Math.abs(st.tilt) > PZ.dead + 0.12;
    ctx.fillStyle = '#2f3142'; rr(-14, -5.5, 28, 7, 3.5); ctx.fill();
    ctx.fillStyle = ok ? '#9fe870' : far ? '#ff8a6b' : '#ffd23f'; rr(-12.5, -4.4, 25, 4.8, 2.4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(off, -2, 3.6, 1.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(28,26,54,0.55)'; ctx.fillRect(-4.5, -4.4, 1, 4.8); ctx.fillRect(3.5, -4.4, 1, 4.8);
    ctx.restore();
    // boxes (the bake-in drops them on one by one at room start)
    const warn = Math.abs(st.s) > PZ.warnS && st.phase === 'play';
    for (let i = 0; i < shown; i++) {
      const b = pzBoxAt(st, g, i, n);
      let x = b.x, y = b.y;
      const bakeT = st.fx.bake - 0.08 * i;
      if (bakeT < 0) continue;
      if (bakeT < 0.12) y -= 40 * (1 - bakeT / 0.12) * (1 - bakeT / 0.12);
      ctx.save(); ctx.translate(x, y); ctx.rotate(b.rot);
      pzBoxShape(false);
      if (warn && i >= shown - 2) {
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(G.clock * 16);
        ctx.strokeStyle = '#e4572e'; ctx.lineWidth = 2; rr(-21, -6, 42, 12, 3); ctx.stroke();
      }
      ctx.restore();
      if (i === shown - 1 && warn) {
        const side = Math.sign(st.s), bx = x + side * 34, by = y - 10 + Math.sin(G.clock * 14) * 1.5;
        ctx.fillStyle = '#e4572e'; circle(bx, by, 10); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        text('!', bx, by + 1, 16, '#ffffff', 'center');
      }
    }
    // steam
    for (const s of st.fx.steam) {
      const a = Math.sin(Math.PI * s.t / s.max) * 0.45;
      ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; circle(s.x, s.y, 3 + s.t * 4); ctx.fill();
    }
    // flyers: delivered boxes on their way into the door
    for (const f of st.fx.flyers) {
      const t = clamp(f.t / 0.35, 0, 1), x = f.x0 + (f.x1 - f.x0) * t, y = f.y0 + (f.y1 - f.y0) * t - 60 * Math.sin(Math.PI * t);
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2.4); ctx.scale(1 - 0.4 * t, 1 - 0.4 * t); pzBoxShape(false); ctx.restore();
    }
  }

  function pzDrawBird(x, y, f, flap, peck, slice) { // a pigeon (f: 1 faces right), feet at (x, y)
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    ctx.fillStyle = '#9aa3b5';
    ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(-15, -12); ctx.lineTo(-14, -5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -8, 9, 6, -0.15, 0, Math.PI * 2); ctx.fill();
    const hx = 7 + peck * 3, hy = -15 + peck * 8;
    ctx.fillStyle = '#7fc8a8'; circle(hx - 2.5, hy + 4.5, 3); ctx.fill();
    ctx.fillStyle = '#7d879b'; circle(hx, hy, 4.6); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(hx + 1.6, hy - 1, 1.7); ctx.fill();
    ctx.fillStyle = C.ink; circle(hx + 2, hy - 1, 0.9); ctx.fill();
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(hx + 4, hy - 0.6); ctx.lineTo(hx + 8.5, hy + 0.8); ctx.lineTo(hx + 4, hy + 1.8); ctx.closePath(); ctx.fill();
    if (slice) {
      ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.moveTo(hx + 6, hy + 1); ctx.lineTo(hx + 15, hy - 2); ctx.lineTo(hx + 14, hy + 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e2452b'; circle(hx + 11.5, hy + 1.5, 1.3); ctx.fill();
    }
    ctx.fillStyle = '#b8c0cf';
    if (flap) { ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(5, -10); ctx.lineTo(-1, -10 - flap * 13); ctx.closePath(); ctx.fill(); }
    else {
      ctx.beginPath(); ctx.ellipse(-1, -8, 6, 3.4, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff8a6b'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-1, -2.5); ctx.lineTo(-1, 0); ctx.moveTo(2.5, -2.5); ctx.lineTo(2.5, 0); ctx.stroke();
    }
    ctx.restore();
  }

  function pzDrawFx(st) {
    for (const b of st.fx.boxes) {
      const a = b.hitT === undefined ? 1 : clamp(1 - (b.t - b.hitT - 1.6) / 0.8, 0, 1);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(b.x, b.y); ctx.rotate(b.rot); pzBoxShape(b.open, b.eaten); ctx.restore();
    }
    for (const bd of st.fx.birds) {
      if (bd.t < 0) continue;
      let x, y, flap = 0, peck = 0, slice = false;
      if (bd.t < 0.45) { const u = bd.t / 0.45, e = 1 - (1 - u) * (1 - u); x = bd.x + (bd.x1 - bd.x) * e; y = bd.y + (bd.y1 - bd.y) * e - 30 * Math.sin(Math.PI * u); flap = Math.sin(bd.t * 40); }
      else if (bd.t < 1.0) { x = bd.x1; y = bd.y1; peck = Math.max(0, Math.sin((bd.t - 0.45) * 22)); slice = bd.t > 0.95; }
      else { const u = (bd.t - 1.0) / 0.7; x = bd.x1 + bd.side * 240 * u * u; y = bd.y1 - 260 * u; flap = Math.sin(bd.t * 40); slice = true; }
      pzDrawBird(x, y, -bd.side, flap, peck, slice);
    }
    for (const l of st.fx.leaves) {
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.r); ctx.fillStyle = l.col; ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    for (const f of st.fx.floats) {
      ctx.save(); ctx.globalAlpha = clamp((f.max - f.t) / 0.3, 0, 1);
      bigText(f.str, f.x, f.y, f.size, f.col, 1 + 0.3 * Math.max(0, 1 - f.t / 0.15));
      ctx.restore();
    }
  }

  // the order bubble over the door: "4 × [box]" (after a retry: "3 is fine!")
  function pzDrawOrder(st) {
    const d = st.R.door;
    if (!d || st.phase === 'deliver') return;
    const sc = hudBig() ? 1.35 : 1, relief = st.fx.reliefT > 0;
    const label = relief ? st.need + ' is fine!' : st.need + ' ×';
    ctx.font = Math.round(17 * sc) + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const tw = ctx.measureText(label).width, w = tw + (relief ? 20 : 48) * sc, h = 28 * sc;
    const cx = d.cx, cy = d.y - 38 - (sc - 1) * 14;
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = relief ? C.gold : C.ink; ctx.lineWidth = 2;
    rr(-w / 2, -h / 2, w, h, 9); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, h / 2 - 1); ctx.lineTo(6, h / 2 - 1); ctx.lineTo(0, h / 2 + 8); ctx.closePath(); ctx.fill();
    if (relief) text(label, 0, 1, Math.round(17 * sc), '#e4572e', 'center');
    else {
      text(label, -w / 2 + 10 * sc, 1, Math.round(17 * sc), C.ink, 'left');
      ctx.save(); ctx.translate(w / 2 - 20 * sc, 0); ctx.scale(0.55 * sc, 0.55 * sc); pzBoxShape(false); ctx.restore();
    }
    ctx.restore();
  }

  /* ---------- prompts (world space, at most 2 at once) ---------- */
  function pzBubble(x, y, label, col, sc) {
    ctx.font = Math.round(18 * sc) + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(label).width + 26 * sc, h = 30 * sc;
    const cam = G.mst.cam, cx = clamp(x, cam.x + w / 2 + 6, cam.x + W - w / 2 - 6), s = 1 + 0.06 * Math.sin(G.clock * 9);
    ctx.save(); ctx.translate(cx, y); ctx.scale(s, s);
    ctx.fillStyle = '#ffffff'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
    text(label, 0, 1, Math.round(18 * sc), col, 'center');
    ctx.restore();
  }
  // a key bubble under a player's feet; the back player's grows to the left, the front one's to the right
  function pzKeyBubble(st, pc, what, word, sc) {
    const x = pc.xc, y = pc.feet + 25 * sc;
    const str = btnLabel(pc.id, what) + ' ' + word;
    ctx.font = '700 ' + Math.round(14 * sc) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = Math.max(26 * sc, ctx.measureText(str).width + 16 * sc), h = 24 * sc;
    const out = pc.id === st.left ? -1 : 1, lim = PZ.span / 2 - 4;
    const cx = w / 2 <= lim ? x : x + out * (w / 2 - lim), s = 1 + 0.08 * Math.max(0, Math.sin(G.clock * 10));
    ctx.save(); ctx.translate(cx, y); ctx.scale(s, s);
    ctx.fillStyle = PCOL[pc.id]; ctx.beginPath(); ctx.moveTo(x - cx - 5 * sc, -h / 2 + 1); ctx.lineTo(x - cx + 5 * sc, -h / 2 + 1); ctx.lineTo(x - cx, -h / 2 - 7 * sc); ctx.closePath(); ctx.fill();
    rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    text(str, 0, 1, Math.round(14 * sc), '#ffffff', 'center', 'body');
    ctx.restore();
  }
  function pzArrow(x, y, dir, col, len) { // a fat arrow (dir: 1 right, -1 left, 2 up, -2 down)
    ctx.save(); ctx.translate(x, y);
    if (dir === 2) ctx.rotate(-Math.PI / 2); else if (dir === -2) ctx.rotate(Math.PI / 2); else if (dir < 0) ctx.scale(-1, 1);
    ctx.fillStyle = col; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-len / 2, -4); ctx.lineTo(len / 2 - 9, -4); ctx.lineTo(len / 2 - 9, -10); ctx.lineTo(len / 2, 0); ctx.lineTo(len / 2 - 9, 10); ctx.lineTo(len / 2 - 9, 4); ctx.lineTo(-len / 2, 4); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  }

  // which end should go up (+1: the right one, -1: the left one, 0: none) to bring the stack back to the middle
  function pzFixSide(st) {
    const s = st.s, t = st.tilt;
    if (Math.abs(s) > 0.3) return t * Math.sign(s) > -0.12 ? Math.sign(s) : 0;               // tilt it back, away from the slide
    if (Math.abs(t) > PZ.dead + 0.02 && Math.sign(t) * Math.sign(st.sv) >= 0) return Math.sign(t); // the low end comes up
    return 0;
  }
  function pzNeedLower(st, ahead) {
    if (st.n <= 0) return false;
    const R = st.R, hl = pzHand(st.pc[st.left]), hr = pzHand(st.pc[st.right]);
    const top = pzStackTop(st, hl, hr, st.n);
    return top - 2 < pzCeil(R, st.X - 30 + Math.min(0, ahead), st.X + 30 + Math.max(0, ahead));
  }
  function pzDogNear(st) {
    return st.R.dogs.find(d => st.X > d.x - PZ.dog.near && st.X < d.x + PZ.span / 2 + 10);
  }

  function pzPrompts(st) {
    const R = st.R, ps = st.pc, out = [];
    if (st.phase !== 'play') return out;
    const intro = G.introT > 0.2;
    if (Math.abs(st.s) > PZ.warnS) out.push('slide');
    if (pzNeedLower(st, st.V * 0.9 + 40 * Math.sign(st.V || 1)) || st.awnBonkT > 1.2) out.push('lower');
    const dg = pzDogNear(st);
    if (dg && !out.includes('slide')) {
      const hl = pzHand(ps[st.left]), hr = pzHand(ps[st.right]);
      if (Math.max(hl, hr) > pzGAt(R, dg.x) - PZ.dog.reach - 3) out.push('raise');
    }
    if (R.wind && (st.windState === 'warn' || st.windState === 'gust') && st.X > R.wind.x0 - 80 && st.X < R.wind.x1 + 20 && !out.includes('slide')) out.push('wind');
    if (!out.length && pzFixSide(st)) out.push('tilt');
    if (!intro) {
      if (st.mode === 'push' && st.pushT > 0.5) out.push('push');
      if (st.mode === 'tug' && st.tugT > 0.6) out.push('tug');
      const afk = ps.find(pc => pc.idleT >= PZ.afkT && ps[1 - pc.id].idleT < 3 && !pzCpu(pc.id));
      if (afk) out.push('afk');
      if (R.door && Math.abs(st.X - R.door.cx) < 170) out.push('door');
    }
    return out.slice(0, 2);
  }

  function pzDrawPrompts(st) {
    const list = pzPrompts(st);
    if (!list.length) return;
    const sc = hudBig() ? 1.5 : 1, ps = st.pc, R = st.R, L = ps[st.left], Rp = ps[st.right];
    const g = pzGeom(st);
    let top = Math.max(st.cam.y + 96, pzStackTop(st, g.hl, g.hr, st.n) - 28 * sc);
    if (G.introT > 0) { const under = st.cam.y + 288 + 15 * sc + 4; if (top < under) top += (under - top) * clamp(G.introT / 0.5, 0, 1); }
    let slot = 0;
    const main = (label, col) => { pzBubble(st.X, top - slot * 38 * sc, label, col, sc); slot++; };
    const keyed = new Set();
    const key = (pc, what, word) => { if (keyed.has(pc.id) || pzCpu(pc.id)) return; keyed.add(pc.id); pzKeyBubble(st, pc, what, word, sc); };
    const fixKeys = side => {   // side: +1 the right end goes up
      if (!side) return;
      const up = side > 0 ? Rp : L, dn = side > 0 ? L : Rp;
      if (up.lift > PZ.liftMin + 1) key(up, 'jump', 'raise'); else key(dn, 'down', 'lower');
      if (dn.lift < PZ.liftMax - 1) key(dn, 'down', 'lower');
    };
    for (const pr of list) {
      if (pr === 'slide') { main('LEVEL IT!', '#e4572e'); fixKeys(Math.sign(st.s)); }
      else if (pr === 'tilt') fixKeys(pzFixSide(st));
      else if (pr === 'lower') { main('BOTH LOWER!', '#b9850f'); for (const pc of ps) if (pc.lift < PZ.liftMax - 1) key(pc, 'down', 'lower'); }
      else if (pr === 'raise') { main('Dog! RAISE IT!', '#2f9a5a'); for (const pc of ps) if (pc.lift > PZ.liftMin + 1) key(pc, 'jump', 'raise'); }
      else if (pr === 'wind') {
        main(st.windState === 'warn' ? 'Wind coming! Tilt into it' : 'Tilt into the wind!', '#2f6fd6');
        // wind blows left (dir -1): the stack is pushed left, so the left end goes up
        const side = -Math.sign(R.wind.dir);
        const want = side > 0 ? st.tilt < 0.12 : st.tilt > -0.12;
        if (want) fixKeys(-side);
      } else if (pr === 'push') {
        const idle = ps.find(pc => pc.id !== st.pusher);
        if (idle && !pzCpu(idle.id)) { pzArrow(idle.xc, idle.feet + 56 * sc, st.pushDir, PCOL[st.pusher], 34 * sc); key(idle, st.pushDir > 0 ? 'right' : 'left', 'walk'); }
      } else if (pr === 'tug') {
        const away = ps.find(pc => pc.lastDir === -1);
        if (away) { pzArrow(away.xc, away.feet + 56 * sc, 1, PCOL[1 - away.id], 34 * sc); key(away, 'right', 'walk'); }
      } else if (pr === 'afk') {
        const idle = ps.find(pc => pc.idleT >= PZ.afkT);
        if (idle) { main(NAMES[idle.id] + '! Grab your end!', PCOL[idle.id]); key(idle, 'right', 'walk'); }
      } else if (pr === 'door') {
        const d = R.door, gy = d.y + 60, pulse = 0.5 + 0.5 * Math.sin(G.clock * 6);
        ctx.fillStyle = 'rgba(255,215,90,' + (0.35 + 0.35 * pulse).toFixed(2) + ')'; rr(d.cx - PZ.deliverR, gy - 3, PZ.deliverR * 2, 10, 5); ctx.fill();
        const bob = Math.sin(G.clock * 7) * 4, ly = Math.min(gy + 64 * sc, st.cam.y + H - 14 * sc);
        ctx.font = '700 ' + Math.round(15 * sc) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
        const lw = ctx.measureText('Stop here!').width + 24 * sc;
        pzArrow(d.cx, Math.min(gy + 30 * sc, ly - 30 * sc) + bob, 2, C.gold, 26 * sc);
        ctx.fillStyle = 'rgba(28,26,54,0.85)'; rr(d.cx - lw / 2, ly - 12 * sc, lw, 24 * sc, 12 * sc); ctx.fill();
        text('Stop here!', d.cx, ly + 1, Math.round(15 * sc), C.gold, 'center', 'body');
      }
    }
  }

  function pzTimers(st, dt) {
    const ps = st.pc;
    if (st.mode === 'push') {
      st.pushT += dt;
      const pc = ps[st.pusher];
      if (pc && pc.grounded) {
        st.fx.dustT -= dt; st.fx.gruntT -= dt;
        if (st.fx.dustT <= 0) { st.fx.dustT = 0.15; pzPuff(pc.xc - st.cam.x - st.pushDir * 10, pc.feet - st.cam.y, 1, 'rgba(255,255,255,0.7)'); }
        if (st.fx.gruntT <= 0) { st.fx.gruntT = 0.45; Sfx.play('pzGrunt', pc.id); pzRumble(0, 0.2, 60, pc.id); }
      }
    } else { st.pushT = 0; st.fx.gruntT = 0.2; }
    st.tugT = st.mode === 'tug' ? st.tugT + dt : 0;
    // creak of the hands moving (a soft tick)
    for (const pc of ps) if (Math.abs(pc.liftV) > 1 && st.clock % 0.12 < dt) Sfx.tone(pc.liftV < 0 ? 620 : 420, 0.03, 'triangle', 0.012);
  }

  /* ---------- HUD (screen space) ---------- */
  function pzHud(st) {
    const big = hudBig(), s = big ? 1.5 : 1;
    const n = st.phase === 'deliver' && st.fx.del ? st.fx.del.n : st.n;
    const ncol = n > st.need + 1 ? C.paper : n === st.need + 1 ? C.gold : '#ff8a6b';
    const fs = Math.round(16 * s), fb = Math.round(12 * s), ft = Math.round(14 * s);
    ctx.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const nw = ctx.measureText(String(n)).width;
    ctx.font = '700 ' + fb + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const needS = 'need ' + st.need, rw = ctx.measureText(needS).width;
    ctx.font = '700 ' + ft + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tS = fmtTime(G.time), tw = ctx.measureText(tS).width;
    const h = 28 * s, w = 14 * s + 26 * s + nw + 8 * s + rw + 18 * s + tw + 14 * s;
    const px = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2;
    let x = px + 14 * s;
    ctx.save(); ctx.translate(x + 12 * s, cy + 0.5); ctx.scale(0.55 * s, 0.55 * s); pzBoxShape(false); ctx.restore();
    x += 26 * s;
    const pop = st.fx.pop > 0 ? 1 + 0.3 * st.fx.pop / 0.25 : 1;
    ctx.save(); ctx.translate(x + nw / 2, cy + 1); ctx.scale(pop, pop); text(String(n), 0, 0, fs, ncol, 'center'); ctx.restore();
    x += nw + 8 * s;
    text(needS, x, cy + 1, fb, '#d9d3ef', 'left', 'body');
    x += rw + 9 * s;
    ctx.fillStyle = 'rgba(246,239,223,0.25)'; ctx.fillRect(x, cy - 8 * s, 1.5, 16 * s);
    x += 9 * s;
    text(tS, x, cy + 1, ft, C.paper, 'left', 'body');
    // how far along the street (a little route line under the pill)
    const R = st.R, k = R.door ? clamp((st.X - 150) / (R.door.cx - 150), 0, 1) : 0, rw2 = w - 24 * s, rx = px + 12 * s, ry = 12 + h + 8 * s;
    ctx.fillStyle = 'rgba(23,25,29,0.55)'; rr(rx - 4, ry - 5 * s, rw2 + 8, 10 * s, 5 * s); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(rx, ry - 1, rw2, 2);
    ctx.fillStyle = C.gold; circle(rx + rw2, ry, 3.5 * s); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(rx + rw2 * k, ry, 3.5 * s); ctx.fill();
    // delivered: banner and stars
    const del = st.fx.del;
    if (del && st.phase === 'deliver') {
      const cx = W / 2, cy2 = big ? 128 : 104;
      ctx.save(); ctx.translate(cx, cy2); ctx.scale(big ? 1.3 : 1, big ? 1.3 : 1);
      ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-72, -22, 144, 64, 14); ctx.fill();
      text('Delivered!', 0, -6, 20, C.paper, 'center');
      for (let i = 0; i < 3; i++) { const on = i < del.shown; pzStar(-30 + i * 30, 22, 11 * (on ? 1 : 0.85), on ? C.gold : 'rgba(255,255,255,0.22)'); }
      ctx.restore();
    }
    if (st.phase === 'fail') {
      const a = clamp((PZ.failT - st.phaseT) / 0.2, 0, 1);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, 205); const kk = big ? 1.25 : 1; ctx.scale(kk, kk);
      ctx.fillStyle = 'rgba(28,26,54,0.9)'; rr(-215, -52, 430, 104, 20); ctx.fill();
      ctx.strokeStyle = '#ff8a6b'; ctx.lineWidth = 3; ctx.stroke();
      bigText('Oh no!', 0, -16, 44, C.paper);
      text('Too many pizzas slid off. Fresh stack coming!', 0, 26, 16, C.paper, 'center', 'body');
      ctx.restore();
    }
    if (st.fx.freshT > 0 && st.phase === 'play') {
      const msg = st.windMul < 1 ? 'Fresh stack! Only ' + st.need + ' needed now, and the wind calmed down a bit'
        : st.relief > 0 ? 'Fresh stack! The customer only needs ' + st.need + ' now' : 'Fresh stack!';
      ctx.save(); ctx.globalAlpha = clamp(st.fx.freshT / 0.3, 0, 1);
      ctx.font = '700 ' + Math.round(14 * s) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const mw = ctx.measureText(msg).width + 28 * s, my = big ? 86 : 64;
      pill(W / 2, my, mw, 26 * s, 'center');
      text(msg, W / 2, my + 13 * s + 0.5, Math.round(14 * s), C.gold, 'center', 'body');
      ctx.restore();
    }
  }
  function pzStar(x, y, r, col) {
    ctx.fillStyle = col; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); }
    ctx.closePath(); ctx.fill();
  }

  function pzWorld(st, fn) { ctx.save(); ctx.translate(-Math.round(st.cam.x * 2) / 2, -Math.round(st.cam.y * 2) / 2); try { fn(); } finally { ctx.restore(); } }

  MODES.pizza = {
    medals: { bronze: 'Deliver to every door', goals: [{ key: 'stars', gold: 11, silver: 8, more: true, text: n => `${n} of 12 stars or more`, gap: (v, n) => `${n - v} more star${n - v === 1 ? '' : 's'}` }, { key: 'time', gold: 240 }] },
    medalValues() { const s = G.mst.stats; return s ? { stars: pzSum(s.stars) } : {}; },
    rand: Math.random,
    PZ,  // tuning knobs, readable by tests and the computer partner
    hand: pzHand, handAt: pzHandAt, support: pzSupport, gAt: pzGAt, ceil: pzCeil, stackTop: pzStackTop, build: pzBuild, prompts: pzPrompts,
    setup(st, L) {
      st.stats = { delivered: [], lost: [], stars: [], retries: [], dropped: 0, fails: 0, bonks: 0, dogBonks: 0, gustsRidden: 0 };
      st.clock = 0;
      pzInitRoom(0, L, 0);
    },
    room(k, L) { pzInitRoom(k, L, 0); },
    step(dt) {
      const st = G.mst;
      if (!st.pc) return;
      st.clock += dt; st.roomT += dt;
      if (st.phase === 'fail' || st.phase === 'deliver') {
        st.phaseT -= dt; pzPhysics(st, dt, true); pzFxStep(st, dt); pzCamera(st, dt); pzMirror(st);
        if (st.phaseT <= 0) {
          if (st.phase === 'fail') {
            st.stats.retries[st.room]++;
            const tries = st.stats.retries[st.room];
            pzInitRoom(st.room, G.level, Math.min(tries >= PZ.reliefLateAt ? PZ.reliefLate : PZ.reliefMax, tries));
            st.fx.freshT = st.windMul < 1 ? 2.6 : 1.8; Sfx.play('pzFresh');
          } else if (st.room >= (G.level.def.roomCount || 1) - 1) { G.level.goal = { x: st.R.door.cx - st.cam.x, y: st.R.door.y - st.cam.y }; levelClear(); }
          else nextRoom();
        }
        return;
      }
      pzPhysics(st, dt, false);
      if (!isFinite(st.s) || !isFinite(st.sv) || !isFinite(st.X) || !isFinite(st.V) || st.pc.some(pc => !isFinite(pc.feet) || !isFinite(pc.vy))) {
        console.warn('Pizza Delivery: bad numbers, restarting the room');
        pzInitRoom(st.room, G.level, st.relief);
        return;
      }
      if (st.phase === 'play') pzTimers(st, dt);
      pzFxStep(st, dt);
      pzCamera(st, dt);
      pzMirror(st);
    },
    draw() {
      const st = G.mst;
      if (!st.pc) return;
      pzDrawSky(st);
      pzWorld(st, () => {
        const vis = b => b.x + b.w > st.cam.x - 60 && b.x < st.cam.x + W + 60;
        for (const b of st.deco.bld) if (vis(b)) pzDrawBuilding(st, b);
        pzDrawLines(st);
        pzDrawHouse(st);
        for (const p of st.deco.props) if (p.x > st.cam.x - 80 && p.x < st.cam.x + W + 80) pzDrawProp(st, p);
        pzDrawWindsock(st);
        pzDrawDogs(st);
        for (const s of st.R.signs) if (s.x > st.cam.x - 200 && s.x < st.cam.x + W + 100) pzDrawSign(st, s);
        pzDrawGround(st);
        pzDrawAwnings(st);
        pzDrawOrder(st);
      });
      const Lt = PZ_LIGHT[st.room % 4];
      if (Lt.wash) { ctx.fillStyle = Lt.wash; ctx.fillRect(0, 0, W, H); }
      pzSquash(st);
    },
    drawTop() {
      const st = G.mst;
      if (!st.pc) return;
      pzWorld(st, () => { pzDrawCarry(st); pzDrawFx(st); pzDrawPrompts(st); });
    },
    hud() { const st = G.mst; if (st.pc) pzHud(st); },
    stats() {
      const s = G.mst.stats;
      if (!s) return [];
      const stars = pzSum(s.stars), lost = s.dropped, retries = pzSum(s.retries);
      let line = lost === 0 && retries === 0 ? 'Perfect delivery: not one pizza slid off the tray!'
        : lost <= 3 ? 'Only ' + lost + (lost === 1 ? ' pizza' : ' pizzas') + ' slid off. Nice and level!'
        : lost + ' pizzas slid off… the pigeons say thanks!';
      if (retries) line += ' Do-overs: ' + retries + '.';
      return [{ label: 'Stars', value: stars + ' / 12' }, { label: 'Pizzas delivered', value: String(pzSum(s.delivered)) },
        { label: 'Pizzas slid off', value: String(lost) }, line];
    },
  };

  Sfx.extra.pzCreak = function () { this.tone(320, 0.06, 'triangle', 0.025); };
  Sfx.extra.pzSlip = function () { this.tone(700, 0.25, 'sine', 0.04, 200); };
  Sfx.extra.pzPlop = function () { this.tone(160, 0.12, 'triangle', 0.08, 80); this.tone(420, 0.05, 'square', 0.025, 260, 0.02); };
  Sfx.extra.pzThunk = function () { this.tone(240, 0.07, 'square', 0.05, 150); this.tone(90, 0.12, 'triangle', 0.06, 60, 0.02); };
  Sfx.extra.pzBonk = function () { this.tone(300, 0.08, 'square', 0.04, 180); this.tone(520, 0.06, 'triangle', 0.03, 300, 0.05); };
  Sfx.extra.pzWoof = function () { this.tone(220, 0.09, 'sawtooth', 0.04, 160); this.tone(200, 0.11, 'sawtooth', 0.035, 140, 0.16); };
  Sfx.extra.pzGrunt = function (p) { this.tone(150 * p, 0.09, 'square', 0.025, 120 * p); };
  Sfx.extra.pzWhistle = function () { this.tone(520, 0.9, 'sine', 0.025, 980); this.tone(780, 0.6, 'sine', 0.012, 1170, 0.3); };
  Sfx.extra.pzGust = function () { this.tone(320, 1.0, 'sawtooth', 0.018, 140); this.tone(1400, 0.8, 'sine', 0.01, 700, 0.1); };
  Sfx.extra.pzDing = function () { this.tone(988, 0.35, 'triangle', 0.07); this.tone(784, 0.5, 'triangle', 0.07, null, 0.3); };
  Sfx.extra.pzStar = function () { this.tone(1319, 0.12, 'triangle', 0.06); };
  Sfx.extra.pzOops = function () { this.tone(392, 0.18, 'square', 0.04, 330); this.tone(311, 0.35, 'square', 0.04, 196, 0.18); };
  Sfx.extra.pzCoo = function () { this.tone(330, 0.12, 'sine', 0.035, 290); this.tone(300, 0.18, 'sine', 0.03, 250, 0.14); };
  Sfx.extra.pzFresh = function () { [523, 659, 784].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.045, null, i * 0.05)); };
}
