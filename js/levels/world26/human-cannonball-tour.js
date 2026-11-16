/* Pip & Bo - Level 26-3 Human Cannonball Tour (team, World 26 Circus Big Top). */
'use strict';

/* ===== 26-3 Human Cannonball Tour (mode 'cannonball', World 26 "Circus Big Top", team, scrolls right, Gavyn's pick) =====
   Gavyn's pick: "one is fired across the circus grounds and steers through rings, while the other drives the safety-net
   truck below to catch them for the next shot."
   Side view of the circus grounds; the camera follows the action to the right. The mode owns the tick, the camera and
   the picture (def.ownStep + ownHUD + noFalls); the engine grid is only spawns. World px, the ground is flat at S.ground.
   THE CANNONBALL (in a striped cannon, wearing a helmet and a little cape): ▲ ▼ aim the barrel (25°-70°). A dotted arc
     shows the first part of the flight, and a landing ring on the ground shows where the shot comes down. The action
     ('fire') fires: "BOOM!" (a puff of confetti; nobody gets hurt). In the air: ▲ (or the action) flaps the cape for a
     little lift (2 flaps a shot, shown on the panel), ▼ dives, ◀ ▶ drift a little. Fly through the gold rings and pop
     the balloons for stars.
   THE DRIVER (the safety-net truck on the ground): ◀ ▶ drive (fast: up to 600 px/s). Park the net under the landing
     ring before the shot (the cannon's panel says "Ready!" when the net is under it), then chase the cannonball if it
     drifts. A cannonball that comes down into the net is a "Boing!" and rides in it; drive back to the next cannon
     (its loading spot glows) and stop there, and the cannonball climbs in. The action ('beep') toots the truck's horn
     (just for fun, and the cannonball's "Ready?" bubble likes it).
   A MISS lands in the soft sawdust ("Fwump! I'm OK!"); drive over to pick them up (a Miss counts).
   Each tour has 4 cannons; after the last shot the truck drives into the next tent and Pip and Bo swap jobs.
   4 tours (roomWord 'Tour'): Sawdust Alley, Balloon Garden, The High Rings, The Grand Tour. Pip flies 1 and 3.
   GOLD HELP (announced, only while both are playing): 3 misses in one tour: a gold extra-wide net for the rest of it.
   IDLE: 12 s with no person pressing anything: "Taking a break" and the clock stops.
   Medal (MODES.cannonball.medals, js/medals.js): Gold <= 3:15 with <= 2 misses and >= 60% of the stars; Silver <= 5:00 with <= 8 misses.
   Room def: { title, fly: 0|1, look, cannons: [[angle, [items]], ...] } where items are 'r0.4' (a ring at 40% of the
   flight at that angle), 'r0.4-30' (30 px higher), 'b0.5-60' (a balloon). MODES.cannonball.plan(st) says what to do next. */
(() => {
  const K = CIRCUS, FONT = K.FONT;
  const S = {
    ground: 444, V: 680, g: 620, aMin: 0.44, aMax: 1.22, aimV: 0.9, mouth: 46, cannonY: 374,
    flaps: 2, flapV: 230, flapMax: -320, diveG: 900, driftV: 70, driftA: 260,
    truckV: 600, truckA: 1000, truckBrake: 1600, netW: 116, goldNetW: 196, netY: 386, loadDX: 34, pickDX: 56,
    ringR: 34, balloonR: 16, gap: 260, idleWait: 12, goldMiss: 3,
  };
  const lerp = K.lerp;
  // the nominal flight from a cannon at x with barrel angle a: where it is at time t
  const mouthAt = (cx, a) => ({ x: cx + Math.cos(a) * S.mouth, y: S.cannonY - Math.sin(a) * S.mouth });
  function pathAt(cx, a, t) { const m = mouthAt(cx, a); return { x: m.x + S.V * Math.cos(a) * t, y: m.y - S.V * Math.sin(a) * t + 0.5 * S.g * t * t }; }
  function flightT(cx, a) { const m = mouthAt(cx, a), vy = -S.V * Math.sin(a); return (-vy + Math.sqrt(vy * vy + 2 * S.g * (S.netY - m.y))) / S.g; }

  function compile(def) {
    const c = { cannons: [], rings: [], balloons: [], end: 0, len: 0, totalStars: 0 };
    let x = 200;
    for (const [deg, items] of def.cannons || []) {
      const a = deg * Math.PI / 180, T = flightT(x, a), land = pathAt(x, a, T).x;
      const cn = { x, a, land, T };
      c.cannons.push(cn);
      for (const it of items || []) {
        const m = /^([rb])([\d.]+)(-?\d+)?$/.exec(it); if (!m) continue;
        const u = +m[2], dy = m[3] ? +m[3] : 0, p = pathAt(x, a, T * u);
        if (m[1] === 'r') c.rings.push({ x: p.x, y: p.y + dy, got: false, t: 0 });
        else c.balloons.push({ x: p.x, y: p.y + dy, got: false, t: 0, col: c.balloons.length % 4 });
      }
      x = land + S.gap;
    }
    c.end = x + 120; c.len = x + 900;
    c.totalStars = c.rings.length + c.balloons.length;
    return c;
  }

  /* ---------- a tour (one room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.fly = def.fly || 0; st.drv = 1 - st.fly; st.look = def.look || 'alley'; st.title = def.title || '';
    st.c = compile(def);
    const c0 = st.c.cannons[0];
    st.ball = { state: 'aim', ci: 0, a: c0.a * 0.82 + 0.15, x: 0, y: 0, vx: 0, vy: 0, drift: 0, flaps: S.flaps, rot: 0, t: 0, flapT: 0 };
    st.truck = { x: c0.x - 10, v: 0, beepT: 0, wheel: 0, ride: false };
    st.rMiss = 0; st.gold = { net: false }; st.state = 'go'; st.endT = 0; st.segStart = G.time; st.fireT = 0;
    st.cam = { x: c0.x - 140 };
    K.fx(st);
    actLabels(st);
    mirror(st);
  }
  function actLabels(st) { const w = []; w[st.fly] = 'fire'; w[st.drv] = 'beep'; K.actLabels(w, 'fire/beep'); }
  const netW = st => (st.gold.net ? S.goldNetW : S.netW);
  const cannon = st => st.c.cannons[st.ball.ci];

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.c) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    if (!live) for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    truck(st, dt, live || st.state === 'end');
    ball(st, dt, live);
    for (const r of st.c.rings) if (r.t > 0) r.t -= dt;
    for (const cn of st.c.cannons) if (cn.kick > 0) cn.kick -= dt;
    if (st.state === 'end') endStep(st, dt);
    cam(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }
  function truck(st, dt, live) {
    const p = G.players[st.drv], i = p.input, tr = st.truck;
    let dir = 0;
    if (st.state === 'end') dir = 1;
    else if (live) {
      dir = (i.right ? 1 : 0) - (i.left ? 1 : 0);
      p.pendingJump = false;
      if (p.pendingAct) { p.pendingAct = false; tr.beepT = 0.4; Sfx.play('cannonballBeep', st.drv); K.pop(st, tr.x + 60, S.ground - 110, 'Beep beep!', '#ffffff', 16); }
    }
    if (dir) tr.v = clamp(tr.v + dir * (Math.sign(tr.v) === -dir ? S.truckBrake : S.truckA) * dt, -S.truckV, S.truckV);
    else tr.v = approach(tr.v, 0, S.truckBrake * dt);
    const x0 = tr.x;
    tr.x += tr.v * dt;
    if (tr.x < st.c.cannons[0].x - 160) { tr.x = st.c.cannons[0].x - 160; tr.v = 0; }
    if (st.state !== 'end' && tr.x > st.c.len - 120) { tr.x = st.c.len - 120; tr.v = 0; } // (the end of the grounds; the drive-off after the last shot goes on)
    tr.wheel += (tr.x - x0) / 16;
    if (tr.beepT > 0) tr.beepT -= dt;
  }
  function ball(st, dt, live) {
    const b = st.ball, p = G.players[st.fly], i = p.input, tr = st.truck;
    b.t += dt;
    if (b.state === 'aim') {
      const cn = cannon(st);
      if (live) {
        if (i.jump || i.up) b.a = Math.min(S.aMax, b.a + S.aimV * dt);
        if (i.down) b.a = Math.max(S.aMin, b.a - S.aimV * dt);
        p.pendingJump = false;
        if (p.pendingAct) { p.pendingAct = false; fire(st, cn); return; }
      }
      const m = mouthAt(cn.x, b.a); b.x = m.x; b.y = m.y; b.rot = -b.a;
      return;
    }
    if (b.state === 'fly') {
      if (live) {
        const flap = p.pendingJump || p.pendingAct;
        p.pendingJump = false; p.pendingAct = false;
        if (flap && b.flaps > 0) { b.flaps--; b.vy = Math.max(S.flapMax, Math.min(b.vy, 0) - S.flapV); b.flapT = 0.35; Sfx.play('cannonballFlap', st.fly); st.stats.flaps++; }
        b.drift = (i.right ? 1 : 0) - (i.left ? 1 : 0);
      } else b.drift = 0;
      if (b.flapT > 0) b.flapT -= dt;
      b.vx = approach(b.vx, b.vx0 + b.drift * S.driftV, S.driftA * dt);
      b.vy += (live && i.down ? S.diveG : S.g) * dt;
      const yPrev = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt; b.rot = Math.atan2(b.vy, b.vx);
      for (const r of st.c.rings) if (!r.got && Math.abs(r.x - b.x) < 14 && Math.abs(r.y - b.y) < S.ringR - 6) { r.got = true; r.t = 0.5; st.stars++; Sfx.play('cannonballRing'); K.spark(st, r.x, r.y, 12); K.pop(st, r.x, r.y - 50, 'Ring! ★', C.gold, 20); }
      for (const bl of st.c.balloons) if (!bl.got && Math.hypot(bl.x - b.x, bl.y - b.y) < S.balloonR + 14) { bl.got = true; st.stars++; Sfx.play('cannonballPop'); K.spark(st, bl.x, bl.y, 10, ['#ff9fd0', '#ffffff']); K.pop(st, bl.x, bl.y - 40, 'Pop! ★', '#ffffff', 18); }
      // the net
      if (b.vy > 0 && yPrev <= S.netY && b.y >= S.netY) {
        if (Math.abs(b.x - tr.x) < netW(st) / 2) { landNet(st); return; }
      }
      if (b.y >= S.ground - 12) { b.y = S.ground - 12; miss(st); }
      return;
    }
    if (b.state === 'net' || b.state === 'ride') {
      // bounce in the net, then ride along
      if (b.state === 'net') { b.vy += 1400 * dt; b.y += b.vy * dt; if (b.y > S.netY - 4) { b.y = S.netY - 4; b.vy = b.vy > 160 ? -b.vy * 0.45 : 0; if (!b.vy) b.state = 'ride'; } }
      b.x = tr.x + clamp(b.x - tr.x, -20, 20) * 0.9; b.rot = approach(b.rot, 0, dt * 6);
      if (b.state === 'ride') { b.y = S.netY - 4; nextCannon(st); }
      return;
    }
    if (b.state === 'ground') {
      if (b.t > 0.8 && Math.abs(tr.x - b.x) < S.pickDX && Math.abs(tr.v) < 120) {
        b.state = 'net'; b.vy = -260; Sfx.play('cannonballBoing'); K.pop(st, tr.x, S.ground - 130, 'Hop on!', '#ffffff', 18);
      }
      return;
    }
    if (b.state === 'load') {
      const cn = cannon(st), u = clamp(b.t / 0.9, 0, 1), m = mouthAt(cn.x, b.a);
      b.x = lerp(b.from.x, m.x, K.smooth(u)); b.y = lerp(b.from.y, m.y, u) - Math.sin(u * Math.PI) * 70; b.rot = -b.a * u;
      if (u >= 1) { b.state = 'aim'; b.t = 0; b.flaps = S.flaps; Sfx.play('cannonballLoad'); }
    }
  }
  function fire(st, cn) {
    const b = st.ball, m = mouthAt(cn.x, b.a);
    Object.assign(b, { state: 'fly', x: m.x, y: m.y, vx: S.V * Math.cos(b.a), vx0: S.V * Math.cos(b.a), vy: -S.V * Math.sin(b.a), t: 0, flaps: S.flaps, drift: 0 });
    st.stats.shots++; st.fireT = G.time;
    cn.fired = true; cn.kick = 0.4;
    Sfx.play('cannonballBoom');
    G.shake = reduceMotion ? 0 : 0.06; rumble(st.fly, 0.5, 0.6, 200);
    K.pop(st, m.x + 40, m.y - 60, 'BOOM!', '#ffffff', 30);
    K.confetti(st, m.x, m.y, 24);
    for (let n = 0; n < 8; n++) K.part(st, m.x, m.y, Math.cos(b.a) * (60 + Math.random() * 80) + (Math.random() - 0.5) * 60, -Math.sin(b.a) * 80 + (Math.random() - 0.5) * 60, 1.2, 'rgba(255,255,255,0.8)', 8, -10, 'smoke');
  }
  function landNet(st) {
    const b = st.ball;
    b.state = 'net'; b.vy = -Math.min(380, b.vy * 0.5); b.t = 0;
    st.stats.caught++;
    Sfx.play('cannonballBoing'); Sfx.play('cannonballCheer');
    const d = Math.abs(b.x - st.truck.x);
    K.pop(st, b.x, S.netY - 120, d < 18 ? 'Bullseye! Boing!' : 'Boing! Caught!', C.gold, 24);
    if (d < 18) st.stats.bulls++;
    K.confetti(st, b.x, S.netY - 40, 18);
    rumble(st.drv, 0.25, 0.5, 160);
  }
  function miss(st) {
    const b = st.ball;
    b.state = 'ground'; b.t = 0; b.vx = 0; b.vy = 0; b.rot = 0;
    st.stats.misses++; st.rMiss++;
    Sfx.play('cannonballFwump');
    K.pop(st, b.x, S.ground - 100, 'Fwump! I\'m OK!', '#ffffff', 20);
    K.dust(st, b.x, S.ground - 4, 'rgba(230,200,140,0.9)', 12);
    K.hint(st, st.drv, 'Drive ' + K.key(st.drv, 'lr') + ' to the landing ring before the BOOM!', 3.2);
    if (st.rMiss >= S.goldMiss && !st.gold.net && K.both(st)) {
      st.gold.net = true; st.stats.helps++; Sfx.play('cannonballHelp');
      K.msg(st, 'Gold net! A much wider net for this tour', C.gold, 4.4);
    }
  }
  // the cannonball rides in the net: to the next cannon (stop at its loading spot) or, after the last, the end
  function nextCannon(st) {
    const b = st.ball, tr = st.truck, nxt = st.c.cannons[b.ci + 1];
    if (!nxt) { if (st.state === 'go') endTour(st); return; }
    if (Math.abs(tr.x - (nxt.x - 10)) < S.loadDX && Math.abs(tr.v) < 60) {
      b.ci++; b.state = 'load'; b.t = 0; b.from = { x: b.x, y: b.y }; b.a = nxt.a * 0.82 + 0.15;
      Sfx.play('cannonballHop');
    }
  }
  function endTour(st) {
    const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
    st.state = 'end'; st.endT = 0; st.lastRoom = last;
    st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('cannonballArrive');
    K.pop(st, st.c.end, S.ground - 260, last ? 'Tour complete!' : 'On to the next tour!', C.gold, 28);
  }
  function endStep(st, dt) {
    st.endT += dt;
    const b = st.ball; if (b.state === 'ride' || b.state === 'net') b.x = st.truck.x;
    if (st.lastRoom) {
      if (st.endT > 0.8 && !st.party) { st.party = true; Sfx.play('cannonballFanfare'); K.confetti(st, st.truck.x, S.ground - 200, 50); }
      if (st.endT > 2.6 && !st.cleared) { st.cleared = true; G.level.goal = { x: st.truck.x - st.cam.x, y: S.ground - 200 }; levelClear(); }
    } else if (st.endT > 2.0) { st.party = false; nextRoom(); }
  }

  /* ---------- what to do next ---------- */
  // where the ball will come down to the net's height from its current flight (no more steering)
  function landFrom(b) {
    const a = 0.5 * S.g, bb = b.vy, cc = b.y - S.netY, disc = bb * bb - 4 * a * cc;
    if (disc < 0) return { x: b.x, t: 0 };
    const t = (-bb + Math.sqrt(disc)) / (2 * a);
    return { x: b.x + b.vx * t, t };
  }
  function plan(st) {
    const b = st.ball, tr = st.truck, out = { landX: null, xWant: tr.x, dWhy: 'wait', aimWant: null, fire: false, ready: false, flap: false, drift: 0 };
    if (b.state === 'aim' || b.state === 'load') {
      const cn = cannon(st), a = b.state === 'aim' ? b.a : cn.a;
      out.landX = pathAt(cn.x, a, flightT(cn.x, a)).x;
      out.aimWant = cn.a;
      out.xWant = out.landX; out.dWhy = 'spot';
      out.ready = Math.abs(tr.x - out.landX) < netW(st) * 0.3 && Math.abs(tr.v) < 40;
      out.fire = b.state === 'aim' && Math.abs(b.a - cn.a) < 0.03 && out.ready;
    } else if (b.state === 'fly') {
      const l = landFrom(b);
      out.landX = l.x; out.xWant = l.x; out.dWhy = 'chase';
      // flap for a balloon above, or to stretch a short flight onto the net
      const short = l.x < tr.x - netW(st) * 0.35, tooFarForTruck = Math.abs(l.x - tr.x) > S.truckV * l.t * 0.7 + netW(st) * 0.3;
      if (tooFarForTruck) out.drift = Math.sign(tr.x - l.x);
      if (short && b.flaps > 0 && b.vy > 0 && tooFarForTruck) out.flap = true;
      for (const bl of st.c.balloons) if (!bl.got && bl.x > b.x && bl.x - b.x < 120 && bl.y < b.y - 10 && bl.y > b.y - 110 && b.flaps > 0 && b.vy > -100) out.flap = true;
    } else if (b.state === 'ground') { out.xWant = b.x; out.dWhy = 'pick'; }
    else if (b.state === 'net' || b.state === 'ride') {
      const nxt = st.c.cannons[b.ci + 1];
      out.xWant = nxt ? nxt.x - 10 : tr.x + 200; out.dWhy = nxt ? 'load' : 'end';
    }
    return out;
  }

  /* ---------- camera and mirror ---------- */
  function cam(st, dt) {
    const b = st.ball, tr = st.truck, pl = plan(st);
    let lo = Math.min(b.x, tr.x), hi = Math.max(b.x, tr.x);
    if (pl.landX != null && b.state === 'aim') hi = Math.max(hi, pl.landX + 60);
    let tx = (lo + hi) / 2 - W / 2;
    if (hi - lo > W - 200) tx = (b.state === 'fly' ? b.x - W / 2 : lo - 100);
    tx = clamp(tx, -300, st.c.len - W);
    st.cam.x += (tx - st.cam.x) * Math.min(1, dt * 3.2);
    if (b.state === 'fly') { if (b.x - st.cam.x > W - 80) st.cam.x = b.x - (W - 80); if (b.x - st.cam.x < 80) st.cam.x = b.x - 80; }
  }
  function mirror(st) {
    const cx = st.cam.x, b = st.ball;
    K.place(st.fly, b.x - cx, b.y + PH / 2);
    K.place(st.drv, st.truck.x - 40 - cx, S.ground - 40);
  }

  /* ---------- drawing ---------- */
  const LOOK = {
    alley: { skyT: '#7ac8f0', skyB: '#fff0c8', far: '#c8e08a', ground: '#e2c38a', groundD: '#c9a46a' },
    balloon: { skyT: '#9ad0ff', skyB: '#ffe4f0', far: '#a8d88a', ground: '#e6c890', groundD: '#c8a66c' },
    high: { skyT: '#5aa8f0', skyB: '#e8f6ff', far: '#9ad07a', ground: '#dcbc84', groundD: '#bf9a62' },
    grand: { skyT: '#ff8a6a', skyB: '#ffe0a0', far: '#d8a070', ground: '#d8b47a', groundD: '#b08a52' },
  };
  function draw(st) {
    const lk = LOOK[st.look] || LOOK.alley, cx = st.cam.x, t = G.clock;
    const g = ctx.createLinearGradient(0, 0, 0, S.ground);
    g.addColorStop(0, lk.skyT); g.addColorStop(1, lk.skyB);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // the sun, drifting clouds, a hazy line of hills with trees, then the tents (each layer slower than the next)
    ctx.fillStyle = 'rgba(255,250,220,0.3)'; circle(W * 0.82, 110, 62); ctx.fill();
    ctx.fillStyle = '#fff6d0'; circle(W * 0.82, 110, 38); ctx.fill();
    for (let i = -1; i < 7; i++) {
      const base = Math.floor(cx * 0.08 / 220) + i, x = base * 220 - cx * 0.08, y = 60 + (hash(base, 3) % 70);
      drawCloud(x, y, 0.8 + (hash(base, 5) % 3) * 0.15);
    }
    { const hz = cx * 0.12, hc = mixCol(lk.far, lk.skyB, 0.45), hy = x => S.ground - 120 - Math.sin((x + hz) * 0.006) * 28 - Math.sin((x + hz) * 0.017) * 10;
      ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(0, S.ground);
      for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, hy(x));
      ctx.lineTo(W, S.ground); ctx.closePath(); ctx.fill();
      ctx.fillStyle = mixCol(lk.far, '#4a7a4a', 0.3);
      for (let x = -(hz % 46) - 46; x < W + 46; x += 46) { const n = Math.floor((x + hz) / 46 + 0.5), hh = hash(n, 9); if (hh % 3 === 0) continue;
        const ty = hy(x) + 4; circle(x, ty - 8, 10 + hh % 6); ctx.fill(); ctx.fillRect(x - 1.5, ty - 4, 3, 8); } }
    const far = cx * 0.25;
    for (let i = -1; i < 5; i++) { const n = Math.floor(far / 360) + i, x = n * 360 - far + 100; K.tent(x, S.ground - 30, 200, 150, n % 2 ? ['#5b95ff', '#fff4e6'] : ['#e8443a', '#fff4e6']); }
    // a grassy verge with a lit lip and tufts, then the dirt track
    ctx.fillStyle = lk.far; ctx.fillRect(0, S.ground - 34, W, 40);
    ctx.fillStyle = tint(lk.far, 0.3); ctx.fillRect(0, S.ground - 34, W, 3);
    ctx.fillStyle = shade(lk.far, 0.15); ctx.fillRect(0, S.ground - 4, W, 6);
    for (let x = -(cx * 0.9 % 30) - 30; x < W + 30; x += 30) { const n = Math.floor((x + cx * 0.9) / 30 + 0.5), hh = hash(n, 21); ctx.fillStyle = shade(lk.far, 0.2);
      ctx.beginPath(); ctx.moveTo(x, S.ground - 20 + hh % 10); ctx.lineTo(x + 3, S.ground - 30 + hh % 10); ctx.lineTo(x + 6, S.ground - 20 + hh % 10); ctx.fill();
      if (hh % 7 === 0) { ctx.fillStyle = ['#ffffff', '#ffd36b', '#ff9fb5'][hh % 3]; circle(x + 3, S.ground - 30 + hh % 10, 2.5); ctx.fill(); } }
    ctx.fillStyle = lk.ground; ctx.fillRect(0, S.ground, W, H - S.ground);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, S.ground, W, 2);
    ctx.fillStyle = lk.groundD; for (let x = -(cx % 80); x < W; x += 80) ctx.fillRect(x, S.ground + 18, 40, 3);
    ctx.fillStyle = shade(lk.ground, 0.18);
    for (let x = -(cx % 50) - 50; x < W + 50; x += 50) { const n = Math.floor((x + cx) / 50 + 0.5), hh = hash(n, 13); circle(x + hh % 40, S.ground + 34 + (hh >> 6) % 80, 1.6 + hh % 2); ctx.fill(); }
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    // the end tent
    K.tent(st.c.end + 200, S.ground, 320, 250, ['#ffc53d', '#fff4e6']);
    // rings and balloons
    for (const r of st.c.rings) if (r.x > cx - 60 && r.x < cx + W + 60) drawRing(r, t);
    for (const bl of st.c.balloons) if (!bl.got && bl.x > cx - 60 && bl.x < cx + W + 60) drawBalloon(bl, t);
    // the aim guide and the landing ring
    const pl = plan(st), b = st.ball;
    if (b.state === 'aim') {
      const cn = cannon(st), T = flightT(cn.x, b.a);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let k = 1; k <= 9; k++) { const p = pathAt(cn.x, b.a, T * k * 0.045); circle(p.x, p.y, 3); ctx.fill(); }
    }
    if (pl.landX != null && b.state !== 'net' && b.state !== 'ride') {
      const lx = pl.landX, under = Math.abs(st.truck.x - lx) < netW(st) * 0.3;
      ctx.strokeStyle = under ? '#8fe3b0' : C.gold; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(lx, S.ground + 4, 34 + Math.sin(t * 6) * 3, 8, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx, S.ground - 6); ctx.lineTo(lx, S.ground - 30); ctx.stroke();
    }
    // cannons
    for (let k = 0; k < st.c.cannons.length; k++) drawCannon(st, st.c.cannons[k], k);
    ctx.restore();
  }
  function drawRing(r, t) {
    const s = 1 + (r.t > 0 ? r.t * 0.5 : 0);
    ctx.save(); ctx.translate(r.x, r.y); ctx.scale(0.45 * s, s);
    ctx.globalAlpha = r.got ? 0.35 : 1;
    if (!r.got) { ctx.strokeStyle = 'rgba(255,214,90,0.22)'; ctx.lineWidth = 18; circle(0, 0, S.ringR); ctx.stroke(); }
    ctx.strokeStyle = '#b8801a'; ctx.lineWidth = 10; circle(0, 1, S.ringR); ctx.stroke();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 8; circle(0, 0, S.ringR); ctx.stroke();
    ctx.strokeStyle = '#ff5f6d'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.lineDashOffset = t * 30; circle(0, 0, S.ringR); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,240,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, S.ringR - 2, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawBalloon(bl, t) {
    const y = bl.y + Math.sin(t * 2 + bl.x) * 4;
    ctx.strokeStyle = 'rgba(80,60,60,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bl.x, y + S.balloonR); ctx.lineTo(bl.x + 4, y + S.balloonR + 30); ctx.stroke();
    const bc = ['#ff5f8a', '#ffc53d', '#5bb8ff', '#8fe36b'][bl.col], R = S.balloonR;
    ctx.fillStyle = shade(bc, 0.22); ctx.beginPath(); ctx.ellipse(bl.x, y, R * 0.85, R, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = bc; ctx.beginPath(); ctx.ellipse(bl.x - R * 0.1, y - R * 0.08, R * 0.72, R * 0.88, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shade(bc, 0.3); ctx.beginPath(); ctx.moveTo(bl.x - 3, y + R + 3); ctx.lineTo(bl.x + 3, y + R + 3); ctx.lineTo(bl.x, y + R - 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade(bc, 0.4); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(bl.x, y, R * 0.85, R, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(bl.x - R * 0.35, y - R * 0.4, R * 0.15, R * 0.28, -0.4, 0, Math.PI * 2); ctx.fill();
  }
  function drawCannon(st, cn, k) {
    const b = st.ball, cur = k === b.ci, a = cur && (b.state === 'aim' || b.state === 'load') ? b.a : cn.a;
    const kick = Math.max(0, cn.kick || 0);
    // the loading spot glows while the truck should stop there
    if (k === b.ci + 1 && (b.state === 'ride' || b.state === 'net')) { ctx.fillStyle = 'rgba(255,214,90,' + (0.35 + 0.25 * Math.sin(G.clock * 8)) + ')'; rr(cn.x - 10 - S.loadDX, S.ground - 4, S.loadDX * 2, 10, 5); ctx.fill(); }
    ctx.fillStyle = 'rgba(40,30,30,0.2)'; ctx.beginPath(); ctx.ellipse(cn.x, S.ground + 1, 46, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(cn.x, S.cannonY);
    ctx.save(); ctx.rotate(-a); ctx.translate(-kick * 20, 0);
    ctx.fillStyle = '#5a5a7a'; rr(-24, -17, S.mouth + 24, 34, 10); ctx.fill();
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#e8443a' : '#fff4e6'; ctx.fillRect(-12 + i * 14, -17, 7, 34); }
    ctx.fillStyle = 'rgba(20,20,40,0.22)'; ctx.fillRect(-20, 6, S.mouth + 14, 11);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-18, -14, S.mouth + 10, 3);
    ctx.strokeStyle = '#2e2e48'; ctx.lineWidth = 2; rr(-24, -17, S.mouth + 24, 34, 10); ctx.stroke();
    ctx.fillStyle = '#3a3a5a'; rr(S.mouth - 6, -20, 10, 40, 4); ctx.fill();
    ctx.fillStyle = '#7a7a9a'; rr(S.mouth - 6, -20, 3, 40, 2); ctx.fill();
    ctx.fillStyle = C.gold; circle(-24, 0, 6); ctx.fill(); ctx.fillStyle = '#b8801a'; circle(-24, 0, 2.5); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#8a5a3a'; ctx.beginPath(); ctx.moveTo(-34, S.ground - S.cannonY); ctx.lineTo(-10, 0); ctx.lineTo(14, 0); ctx.lineTo(30, S.ground - S.cannonY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6a4228'; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(14, 0); ctx.lineTo(30, S.ground - S.cannonY); ctx.lineTo(10, S.ground - S.cannonY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4a2a18'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-34, S.ground - S.cannonY); ctx.lineTo(-10, 0); ctx.lineTo(14, 0); ctx.lineTo(30, S.ground - S.cannonY); ctx.stroke();
    for (const wx of [-14, 18]) {
      const wy = S.ground - S.cannonY - 14;
      ctx.fillStyle = '#3a2a3a'; circle(wx, wy, 16); ctx.fill();
      ctx.strokeStyle = '#8a6a5a'; ctx.lineWidth = 2; for (let s2 = 0; s2 < 4; s2++) { const aa = s2 * Math.PI / 4; ctx.beginPath(); ctx.moveTo(wx - Math.cos(aa) * 12, wy - Math.sin(aa) * 12); ctx.lineTo(wx + Math.cos(aa) * 12, wy + Math.sin(aa) * 12); ctx.stroke(); }
      ctx.strokeStyle = '#5a4a4a'; ctx.lineWidth = 3; circle(wx, wy, 13.5); ctx.stroke();
      ctx.fillStyle = C.gold; circle(wx, wy, 5); ctx.fill();
    }
    ctx.restore();
    ctx.font = FONT(15); const bw = Math.max(26, ctx.measureText(String(k + 1)).width + 16);
    ctx.fillStyle = 'rgba(40,26,40,0.8)'; rr(cn.x - bw / 2, S.ground + 18, bw, 24, 12); ctx.fill();
    text(String(k + 1), cn.x, S.ground + 30.5, 15, '#ffffff', 'center', 'body');
  }
  function drawTruck(st) {
    const tr = st.truck, x = tr.x, y = S.ground, nw = netW(st);
    ctx.fillStyle = 'rgba(40,30,30,0.22)'; ctx.beginPath(); ctx.ellipse(x + 20, y + 1, nw / 2 + 50, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(x, y);
    // the net frame on the back
    ctx.strokeStyle = st.gold.net ? C.gold : '#e8d8b8'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-nw / 2, -40); ctx.lineTo(-nw / 2, S.netY - y); ctx.moveTo(nw / 2, -40); ctx.lineTo(nw / 2, S.netY - y); ctx.stroke();
    const b = st.ball, sag = (b.state === 'net' || b.state === 'ride') ? clamp((b.y - (S.netY - 20)) * 0.6, 0, 18) : 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-nw / 2, S.netY - y); ctx.quadraticCurveTo(clamp(b.x - x, -nw / 2, nw / 2), S.netY - y + 14 + sag * 2, nw / 2, S.netY - y); ctx.stroke();
    for (let k = -nw / 2 + 10; k < nw / 2; k += 12) { ctx.beginPath(); ctx.moveTo(k, S.netY - y + 2); ctx.lineTo(k + 6, S.netY - y + 10 + sag * 0.6); ctx.stroke(); }
    // the truck: red with a gold stripe, the cab in front (right)
    ctx.fillStyle = '#e8443a'; rr(-nw / 2 - 10, -40, nw + 20, 22, 6); ctx.fill();
    ctx.fillStyle = C.gold; ctx.fillRect(-nw / 2 - 10, -32, nw + 20, 5);
    ctx.fillStyle = '#b02a28'; ctx.fillRect(-nw / 2 - 8, -24, nw + 16, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-nw / 2 - 6, -40, nw + 12, 2);
    ctx.strokeStyle = '#8a1e1e'; ctx.lineWidth = 1.8; rr(-nw / 2 - 10, -40, nw + 20, 22, 6); ctx.stroke();
    ctx.fillStyle = '#e8443a'; rr(nw / 2 + 4, -64, 48, 46, 8); ctx.fill();
    ctx.fillStyle = '#b02a28'; rr(nw / 2 + 38, -62, 14, 44, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(nw / 2 + 10, -63, 34, 2);
    ctx.strokeStyle = '#8a1e1e'; ctx.lineWidth = 1.8; rr(nw / 2 + 4, -64, 48, 46, 8); ctx.stroke();
    ctx.fillStyle = '#fff6c0'; rr(nw / 2 + 48, -34, 6, 7, 2); ctx.fill();
    ctx.fillStyle = 'rgba(190,230,255,0.9)'; rr(nw / 2 + 12, -58, 32, 20, 5); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(nw / 2 + 12, -58, 32, 20); ctx.clip(); K.hero(st.drv, nw / 2 + 28, -30, { face: tr.v < -10 ? -1 : 1, s: 0.8 }); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(nw / 2 + 16, -38); ctx.lineTo(nw / 2 + 26, -58); ctx.lineTo(nw / 2 + 31, -58); ctx.lineTo(nw / 2 + 21, -38); ctx.fill();
    if (tr.beepT > 0) { ctx.fillStyle = '#ffffff'; text('♪', nw / 2 + 64, -58, 18, '#ffffff', 'center', 'body'); }
    for (const wx of [-nw / 2 + 8, nw / 2 - 4, nw / 2 + 36]) {
      ctx.save(); ctx.translate(wx, -14); ctx.rotate(tr.wheel);
      ctx.fillStyle = '#2a2a3a'; circle(0, 0, 14); ctx.fill(); ctx.strokeStyle = '#4a4a5e'; ctx.lineWidth = 2; circle(0, 0, 10); ctx.stroke(); ctx.fillStyle = '#ffffff'; circle(0, 0, 5); ctx.fill();
      ctx.fillStyle = '#ffc53d'; ctx.fillRect(-1.5, -12, 3, 5);
      ctx.restore();
    }
    ctx.restore();
  }
  function drawTop(st) {
    const cx = st.cam.x, b = st.ball;
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    drawTruck(st);
    if (b.state !== 'aim') {
      // the cannonball: helmet and cape, flying head first
      ctx.save(); ctx.translate(b.x, b.y);
      const flying = b.state === 'fly';
      if (flying) {
        ctx.rotate(b.rot + Math.PI / 2);
        ctx.fillStyle = PCOL[st.fly]; ctx.globalAlpha = 0.85;
        const fl = b.flapT > 0 ? 1.4 : 1;
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-18 * fl, 30 + Math.sin(G.clock * 20) * 4); ctx.lineTo(18 * fl, 30 - Math.sin(G.clock * 20) * 4); ctx.lineTo(10, 0); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        K.hero(st.fly, 0, PH / 2, { face: 1, rot: 0, sy: 1.12, sx: 0.9 });
      } else K.hero(st.fly, 0, PH / 2, { face: 1, stun: b.state === 'ground' && b.t < 0.8, sy: b.state === 'load' ? 1.1 : 1 });
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, flying ? -PH / 2 + 2 : -PH / 2 + 2, 11, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#e8443a'; ctx.fillRect(-11, -PH / 2 - 1, 22, 3);
      ctx.restore();
    } else {
      // peeking out of the cannon's mouth
      const cn = cannon(st), m = mouthAt(cn.x, b.a);
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(-b.a + Math.PI / 2);
      ctx.beginPath(); ctx.rect(-30, -60, 60, 58); ctx.clip();
      K.hero(st.fly, 0, 14, { face: 1 });
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 14 - PH + 2, 11, Math.PI, 0); ctx.fill();
      ctx.restore();
    }
    K.drawParts(st, cx);
    ctx.restore();
    // an arrow at the screen edge when the truck is off screen
    const tx = st.truck.x - cx;
    if (tx < -40 || tx > W + 40) { const ex = tx < 0 ? 24 : W - 24; ctx.fillStyle = PCOL[st.drv]; ctx.beginPath(); ctx.moveTo(ex + (tx < 0 ? -12 : 12), S.ground - 40); ctx.lineTo(ex, S.ground - 52); ctx.lineTo(ex, S.ground - 28); ctx.closePath(); ctx.fill(); }
    K.drawPops(st, cx, 0);
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '★ ' + st.stars + ' / ' + st.totalStars;
      ctx.font = FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, C.gold, 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: 'Taking a break... press anything to go on', col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play) return;
    const pl = plan(st), b = st.ball, tr = st.truck, F = st.fly, D = st.drv;
    {
      const bx = K.panel(F, 'cannonball', 250, 58, z), cy = bx.y + 27 * z, chh = 23 * z, qt = K.quiet(F), cw = (bx.w - 24 * z - 12 * z) / 3;
      const aiming = b.state === 'aim';
      K.chip(bx.x + 12 * z, cy, cw, chh, (qt ? '' : K.key(F, 'up') + K.key(F, 'down') + ' ') + 'AIM', aiming && pl.aimWant != null && Math.abs(b.a - pl.aimWant) > 0.05 && false, false, z);
      K.chip(bx.x + 12 * z + cw + 6 * z, cy, cw, chh, (qt ? '' : K.key(F, 'act') + ' ') + (aiming ? 'FIRE' : 'FLAP ' + '●'.repeat(b.state === 'fly' ? b.flaps : S.flaps)), aiming && pl.ready, b.flapT > 0, z);
      K.chip(bx.x + 12 * z + 2 * (cw + 6 * z), cy, cw, chh, (qt ? '' : K.key(F, 'lr') + ' ') + 'DRIFT', b.state === 'fly' && !!pl.drift, !!b.drift, z);
    }
    {
      const bx = K.panel(D, 'net truck', 250, 58, z), cy = bx.y + 27 * z, chh = 23 * z, qt = K.quiet(D);
      const far = Math.abs(pl.xWant - tr.x), dir = pl.xWant > tr.x ? K.key(D, 'right') : K.key(D, 'left');
      const lab = pl.dWhy === 'spot' ? (pl.ready ? 'READY!' : 'TO THE RING ' + dir) : pl.dWhy === 'chase' ? 'CATCH! ' + (far > 20 ? dir : '') : pl.dWhy === 'pick' ? 'PICK UP ' + dir : pl.dWhy === 'load' ? 'TO CANNON ' + (far > S.loadDX ? dir : '■') : 'DRIVE';
      K.chip(bx.x + 12 * z, cy, bx.w - 24 * z, chh, lab, far > 30 && pl.dWhy !== 'wait', pl.ready, z);
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st), cx = st.cam.x;
    {
      let s = null, col = C.gold, pulse = false;
      if (b.state === 'aim') {
        if (pl.ready) { s = 'Fire! ' + K.key(F, 'act'); pulse = true; }
        else { s = 'Aim ' + K.key(F, 'up') + K.key(F, 'down') + ', wait for the net...'; col = '#ffe7a8'; }
      } else if (b.state === 'fly') {
        if (pl.flap) { s = 'Flap! ' + K.key(F, 'up'); pulse = true; }
        else if (pl.drift) s = 'Drift ' + (pl.drift < 0 ? K.key(F, 'left') : K.key(F, 'right'));
      }
      P.say(F, s, b.x - cx, b.y - 40, col, pulse);
    }
    {
      let s = null, col = C.gold, pulse = false;
      const far = pl.xWant - tr.x, dir = far > 0 ? K.key(D, 'right') : K.key(D, 'left');
      if (pl.dWhy === 'spot' && !pl.ready) s = 'Park under the ring ' + dir;
      else if (pl.dWhy === 'chase' && Math.abs(far) > 20) { s = 'Catch! ' + dir; pulse = true; }
      else if (pl.dWhy === 'pick') s = 'Pick them up ' + dir;
      else if (pl.dWhy === 'load' && Math.abs(far) > S.loadDX) s = 'To cannon ' + (b.ci + 2) + ' ' + dir;
      else if (pl.dWhy === 'load') { s = 'Stop here!'; col = '#d9ffd0'; }
      P.say(D, s, clamp(tr.x - cx, 80, W - 80), S.ground - 90, col, pulse);
    }
  }
  const medal = (t, misses, frac) => (t <= 195 && misses <= 2 && frac >= 0.6 ? 'Gold' : t <= 300 && misses <= 8 ? 'Silver' : 'Bronze');

  MODES.cannonball = {
    medals: { bronze: 'Finish the cannonball tour', goals: [{ key: 'time', gold: 195, silver: 300 }, { key: 'misses', gold: 2, silver: 8, word: 'miss' }, { key: 'stars', gold: 0.6, more: true, pct: true, word: 'the stars' }] },
    medalValues() { const st = G.mst; return st.stats ? { misses: st.stats.misses, stars: st.stars / (st.totalStars || 1) } : {}; },
    S, compile, plan, pathAt, flightT, medal,
    setup(st, L) {
      st.stats = { shots: 0, caught: 0, misses: 0, bulls: 0, flaps: 0, helps: 0, roomT: [] };
      st.stars = 0; st.inT = [G.time, G.time]; st.personT = G.time;
      const def = LEVELS[G.levelIndex];
      st.totalStars = (def.rooms || [def]).reduce((n, r) => n + compile(Object.assign({}, def, r)).totalStars, 0);
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.c) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.c) drawTop(st); },
    hud() { const st = G.mst; if (st.c) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Stars', value: st.stars + ' of ' + st.totalStars },
        { label: 'Caught', value: s.caught + ' of ' + s.shots },
        { label: 'Misses', value: String(s.misses) },
      ];
      out.push((s.bulls ? 'Bullseyes in the middle of the net: ' + s.bulls + '. ' : '') + 'Cape flaps: ' + s.flaps + '.');
      if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
      return out;
    },
  };

  /* ---------- sounds ---------- */
  Sfx.extra.cannonballBoom = function () { this.tone(90, 0.4, 'sawtooth', 0.07, 40); this.tone(160, 0.2, 'square', 0.04, 60, 0.02); [784, 988, 1175].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.03, null, 0.15 + i * 0.05)); };
  Sfx.extra.cannonballFlap = function (p) { this.tone(380 * p, 0.1, 'triangle', 0.035, 620 * p); };
  Sfx.extra.cannonballRing = function () { [988, 1319, 1568].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.04, null, i * 0.05)); };
  Sfx.extra.cannonballPop = function () { this.tone(900, 0.05, 'square', 0.04, 300); };
  Sfx.extra.cannonballBoing = function () { this.tone(170, 0.32, 'sine', 0.06, 440); };
  Sfx.extra.cannonballCheer = function () { [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.045, null, 0.08 + i * 0.07)); };
  Sfx.extra.cannonballFwump = function () { this.tone(110, 0.2, 'sine', 0.07, 70); };
  Sfx.extra.cannonballBeep = function (p) { this.tone(440 * p, 0.08, 'square', 0.03); this.tone(440 * p, 0.08, 'square', 0.03, null, 0.12); };
  Sfx.extra.cannonballHop = function () { this.tone(300, 0.2, 'sine', 0.045, 640); };
  Sfx.extra.cannonballLoad = function () { this.tone(200, 0.1, 'triangle', 0.04, 140); };
  Sfx.extra.cannonballHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
  Sfx.extra.cannonballArrive = function () { [392, 523, 659].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.08)); };
  Sfx.extra.cannonballFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.11)); };
})();
