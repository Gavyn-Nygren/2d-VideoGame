/* Pip & Bo - Level 26-1 Trapeze Catch (team, World 26 Circus Big Top). */
'use strict';

/* ===== 26-1 Trapeze Catch (mode 'trapeze', World 26 "Circus Big Top", team, Gavyn's pick) =====
   Gavyn's pick: "one swings and lets go, the other swings in from the far side to catch them. Good timing sends you
   higher, and bigger flips get more cheers."
   One screen inside the big top, seen from the side. The FLYER stands on the little board high up on the left, holding
   the fly bar. The CATCHER hangs by the knees from the catch trapeze on the right and swings. A big safety net is
   stretched under everything, so a miss is only a "Boing!" and a climb back up the ladder. Nobody ever gets hurt.
   def.ownStep + ownHUD + noFalls: the mode owns the tick and the whole picture; the engine grid is only the two spawns.
   THE CATCHER (right): ◀ ▶ pump the swing (press the way you are swinging; a gold band on the panel shows a good swing,
     and the swing slowly dies down by itself). The action ('hep') calls "Hep!" while the flyer waits on the board: the
     flyer jumps off at once. Call it when the gold ring on your panel lights up (then the flyer reaches the top of the
     swing just as you swing in). While the flyer is swinging or flying, holding the action (or a press in the last
     0.45 s) reaches out: only reaching hands can catch.
   THE FLYER (left): after the "Hep!" the flyer swings out on the fly bar by themselves. The action ('let go') lets go of
     the bar. Letting go near the top of the forward swing (the bar glows gold) is "Great timing!": a big, high flight.
     Too early flies long and fast, too late drops short. In the air, holding ▲ (jump) tucks into flips (each full turn
     is a flip, worth cheers); let go of ▲ to open up again, because a tucked flyer can't be caught. ◀ ▶ steer a little
     in the air. If the flyer never lets go, the bar swings back to the board and they wait for the next "Hep!".
   THE CATCH: open hands meet reaching hands (within 50 px; gold hands 90). The catcher swings the flyer, then tosses
     them back to the board. Cheers: 100 a catch, + up to 60 for a high flight, + 60 a flip (up to 3), + 40 a gold hoop
     in the air (acts 2-4), + 40 "Perfect!" when the hands meet dead on (within 20 px).
   A MISS falls into the net ("Boing!") and the flyer climbs the ladder back to the board (a Boing counts).
   4 acts (roomWord 'Act'), 4 catches each: Warm-Up (Pip flies), Spotlight Hoop (Bo flies), Double Hoop (Pip flies),
   Grand Finale (Bo flies). Room def: { title, fly: 0|1, hoops: [[x, y], ...], look }.
   GOLD HELP (announced, only while both are playing): 3 boings in one act: gold hands (catch from 90 px) and the
   flyer's whole path drawn, for the rest of the act. 15 s on the board without a "Hep!" while the catcher presses
   things: a gold "Hep!" (the ring stays lit, any Hep works for that jump).
   IDLE: 12 s with no person pressing anything: "Taking a break" and the clock stops.
   Medal (MODES.trapeze.medals, js/medals.js): Gold <= 3:15 with <= 3 boings and >= 2200 cheers; Silver <= 5:30 with <= 10 boings.
   MODES.trapeze.plan(st) says what to do next (prompts, HUD chips and the computer brain read it). The swings are
   steady (no randomness), and the catcher's swing has the same period as the flyer's. */
(() => {
  const K = CIRCUS;
  const S = {
    P1: { x: 250, y: 58 }, L1: 170, A1: 0.87,            // the fly bar: pivot, rope length, swing (50°)
    P2: { x: 700, y: 58 }, LB: 112, LC: 205, reachX: 16,  // the catch trapeze: pivot, bar, hands (by the knees), reach
    period: 2.6, aStart: 0.3, aMin: 0.12, aMax: 0.82, aGood: 0.55, pump: 0.32, brake: 0.25, decay: 0.022,
    kickX: 160, kickY: 150, kickQ: 210, gF: 700, steerV: 105, steerA: 420,
    tuckW: Math.PI * 2 * 2.3, openW: Math.PI * 2 * 2.6, catchR: 50, goldR: 90, perfectR: 20,
    netY: 462, netX0: 70, netX1: 890, boardY: 0, reachHold: 0.45, hepWin: 0.42,
    catches: 4, holdT: 1.5, tossT: 1.0, climbT: 1.7,
    goldBoings: 3, goldHepWait: 15, idleWait: 12,
  };
  S.w = Math.PI * 2 / S.period;
  const TAU = Math.PI * 2;
  const wrap = a => ((a % TAU) + TAU) % TAU;
  const wrapPi = a => { a = wrap(a + Math.PI) - Math.PI; return a; };
  // the fly bar's hands at swing phase f (θ = A1 sin f; f = -π/2 is back at the board)
  const flyHands = f => { const th = S.A1 * Math.sin(f); return { x: S.P1.x + S.L1 * Math.sin(th), y: S.P1.y + S.L1 * Math.cos(th), th }; };
  S.board = flyHands(-Math.PI / 2);
  // the catcher's hands at phase f and amplitude A (θ = A sin f; negative θ swings toward the flyer)
  const catchHands = (f, A, reach) => { const th = -A * Math.sin(f), L = S.LC + (reach ? S.reachX : 0); return { x: S.P2.x + L * Math.sin(th), y: S.P2.y + L * Math.cos(th), th }; };
  // release from the fly bar at phase f: the starting flight (hands position and speed) and the timing quality q
  function release(f) {
    const h = flyHands(f), thd = S.A1 * S.w * Math.cos(f);
    const q = clamp(1 - Math.abs(wrapPi(f - Math.PI / 2)) / 0.6, 0, 1);
    return { x: h.x, y: h.y, vx: S.L1 * thd * Math.cos(h.th) + S.kickX, vy: -S.L1 * thd * Math.sin(h.th) - S.kickY - S.kickQ * q, q };
  }
  // steps a flight forward (no steering) and finds the closest the flyer's hands come to the catcher's reaching hands
  function predict(st, fl, fc, A, maxT = 2.2) {
    let x = fl.x, y = fl.y, vx = fl.vx, vy = fl.vy, f = fc, best = { d: Infinity, t: 0, dx: 0, dy: 0 }, apex = y;
    const dt = 1 / 60, path = [];
    for (let t = 0; t <= maxT; t += dt) {
      const ch = catchHands(f, A, true), dx = ch.x - x, dy = ch.y - y, d = Math.hypot(dx, dy);
      if (d < best.d) best = { d, t, dx, dy, x, y };
      path.push(x, y);
      x += vx * dt; vy += S.gF * dt; y += vy * dt; f += S.w * dt; apex = Math.min(apex, y);
      if (y > S.netY) break;
    }
    best.path = path; best.apex = apex;
    return best;
  }
  // the best moment for the catcher to call "Hep!": the catcher's phase then, so a top-of-swing release meets them
  function hepTarget(st) {
    const fl = release(Math.PI / 2), A = st.cat.A;
    // time from Hep to the top of the forward swing is half a period; then the flight to the catcher's far left point
    let x = fl.x, y = fl.y, vy = fl.vy, t = 0;
    const left = catchHands(Math.PI / 2, A, true);
    while (x < left.x && t < 3) { x += fl.vx / 60; vy += S.gF / 60; y += vy / 60; t += 1 / 60; }
    return wrap(Math.PI / 2 - S.w * (S.period / 2 + t));
  }

  /* ---------- an act (one room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.fly = def.fly || 0; st.catchId = 1 - st.fly; st.title = def.title || ''; st.look = def.look || 'warm';
    st.hoops = (def.hoops || []).map(([x, y]) => ({ x, y, got: false, t: 0 }));
    st.flyer = { state: 'board', f: -Math.PI / 2, x: S.board.x, y: S.board.y, vx: 0, vy: 0, rot: 0, tuck: false, spin: 0, flips: 0, q: 0,
      apex: 0, y0: 0, t: 0, from: null, bounces: 0, hoopN: 0, steer: 0, sayOpen: false };
    st.cat = { f: Math.PI * 0.3, A: S.aStart, reachT: -9, reach: false, pump: 0, hepT: -9 };
    st.caught = 0; st.rBoings = 0; st.boardT = 0; st.gold = { hands: false, hep: false }; st.goldHepUsed = false;
    st.state = 'go'; st.endT = 0; st.cheer = 0; st.segStart = G.time;
    K.fx(st);
    actLabels(st);
    mirror(st);
  }
  function actLabels(st) {
    const w = []; w[st.fly] = 'let go'; w[st.catchId] = 'hep';
    K.actLabels(w, 'hep/let go');
  }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.flyer) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    if (!live) for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    catcher(st, dt, live);
    flyer(st, dt, live);
    for (const h of st.hoops) if (h.t > 0) h.t -= dt;
    st.cheer = Math.max(0, st.cheer - dt * 0.4);
    if (st.state === 'end') endStep(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }

  /* ---------- the catcher ---------- */
  function catcher(st, dt, live) {
    const p = G.players[st.catchId], i = p.input, c = st.cat;
    const vel = -c.A * S.w * Math.cos(c.f); // dθ/dt (negative: swinging toward the flyer, i.e. left)
    c.pump = 0;
    if (live) {
      const dir = (i.right ? 1 : 0) - (i.left ? 1 : 0);
      if (dir && Math.abs(vel) > 0.08) {
        if (Math.sign(vel) === dir) { c.A = Math.min(S.aMax, c.A + S.pump * dt); c.pump = 1; }
        else { c.A = Math.max(S.aMin, c.A - S.brake * dt); c.pump = -1; }
      }
      if (p.pendingAct) {
        p.pendingAct = false;
        c.reachT = G.time;
        if (st.flyer.state === 'board') hep(st);
      }
      p.pendingJump = false;
      c.reach = !!i.act || G.time - c.reachT < S.reachHold;
    } else c.reach = false;
    if (!c.pump) c.A = Math.max(S.aMin, c.A - S.decay * dt);
    c.f = wrap(c.f + S.w * dt);
    if (st.flyer.state === 'board' && live) {
      st.boardT += dt;
      if (!st.gold.hep && !st.goldHepUsed && st.boardT > S.goldHepWait && K.both(st) && G.time - st.inT[st.catchId] < 6) {
        st.gold.hep = true; st.stats.helps++; Sfx.play('trapezeHelp');
        K.msg(st, 'Gold Hep! Any "Hep!" works for this jump', C.gold, 4);
      }
    }
  }
  function hepQuality(st) {
    if (st.gold.hep) return 1;
    return clamp(1 - Math.abs(wrapPi(st.cat.f - hepTarget(st))) / S.hepWin, 0, 1);
  }
  function hep(st) {
    const fl = st.flyer, c = st.cat, q = hepQuality(st);
    c.hepT = G.time; st.stats.heps++; if (q > 0.5) st.stats.goodHeps++;
    if (st.gold.hep) { st.gold.hep = false; st.goldHepUsed = true; }
    Sfx.play('trapezeHep', st.catchId);
    const ch = catchHands(c.f, c.A, false);
    K.pop(st, ch.x, ch.y - 120, q > 0.5 ? 'Hep!' : 'Hep?', q > 0.5 ? C.gold : '#ffffff', 26);
    fl.state = 'swing'; fl.f = -Math.PI / 2; fl.t = 0;
    st.boardT = 0;
    Sfx.play('trapezeJump', st.fly);
  }

  /* ---------- the flyer ---------- */
  function flyer(st, dt, live) {
    const p = G.players[st.fly], i = p.input, fl = st.flyer;
    fl.t += dt;
    if (fl.state === 'board') { fl.x = S.board.x; fl.y = S.board.y; fl.rot = 0; if (live) { p.pendingAct = false; p.pendingJump = false; } return; }
    if (fl.state === 'swing') {
      fl.f += S.w * dt;
      const h = flyHands(fl.f); fl.x = h.x; fl.y = h.y; fl.rot = h.th * 0.6;
      if (live && p.pendingAct) { p.pendingAct = false; letGo(st); return; }
      p.pendingJump = false;
      if (fl.f >= Math.PI * 1.5) { fl.state = 'board'; fl.f = -Math.PI / 2; Sfx.play('trapezeLand', st.fly); K.hint(st, st.fly, 'Let go ' + K.key(st.fly, 'act') + ' when the bar glows gold!', 3); }
      return;
    }
    if (fl.state === 'air') {
      p.pendingAct = false; p.pendingJump = false;
      const wantTuck = live && !!i.jump;
      if (wantTuck) { fl.tuck = true; fl.spin += S.tuckW * dt; }
      else {
        fl.tuck = false;
        // open up: finish the turn to the next upright (a tuck that barely started untwists back)
        const r = wrap(fl.spin);
        if (r > 1e-3 && r < TAU - 1e-3) {
          if (fl.spin < 0.9) fl.spin = Math.max(0, fl.spin - S.openW * dt);
          else fl.spin = Math.min(Math.ceil(fl.spin / TAU) * TAU, fl.spin + S.openW * dt);
        }
      }
      const done = Math.floor((fl.spin + 0.3) / TAU);
      if (done > fl.flips) { fl.flips = done; Sfx.play('trapezeFlip', fl.flips); K.pop(st, fl.x, fl.y - 50, fl.flips === 1 ? 'Flip!' : fl.flips + ' flips!', '#ffffff', 20); }
      const dir = live && !fl.tuck ? (i.right ? 1 : 0) - (i.left ? 1 : 0) : 0;
      fl.steer = dir;
      fl.vx = approach(fl.vx, fl.vx0 + dir * S.steerV, S.steerA * dt);
      fl.vy += S.gF * dt;
      fl.x += fl.vx * dt; fl.y += fl.vy * dt;
      fl.apex = Math.min(fl.apex, fl.y);
      fl.rot = fl.spin;
      // the gold hoops
      for (const h of st.hoops) if (!h.got && Math.hypot(h.x - fl.x, h.y - (fl.y + 20)) < 34) {
        h.got = true; h.t = 0.6; fl.hoopN++; Sfx.play('trapezeHoop'); K.spark(st, h.x, h.y, 12);
        K.pop(st, h.x, h.y - 40, 'Through the hoop!', C.gold, 20);
      }
      // the catch
      const c = st.cat, ch = catchHands(c.f, c.A, c.reach), d = Math.hypot(ch.x - fl.x, ch.y - fl.y);
      const open = wrap(fl.spin) < 0.45 || wrap(fl.spin) > TAU - 0.45;
      const R = st.gold.hands ? S.goldR : S.catchR;
      if (d < R && c.reach && open) { caught(st, d); return; }
      if (d < R + 20 && !open && !fl.sayOpen) { fl.sayOpen = true; K.pop(st, fl.x, fl.y - 60, 'Open up!', '#ffe7a8', 18); }
      if (d < R && !c.reach && !fl.sayReach) { fl.sayReach = true; K.pop(st, ch.x, ch.y + 50, 'Reach!', '#ffe7a8', 18); }
      if (fl.y > S.netY - 10 || fl.x > W + 40 || fl.x < -40) toNet(st);
      return;
    }
    if (fl.state === 'held') {
      const c = st.cat, ch = catchHands(c.f, c.A, true);
      fl.x = ch.x; fl.y = ch.y; fl.rot = ch.th + Math.PI * 0; fl.spin = 0;
      if (fl.t > S.holdT) { fl.state = 'toss'; fl.t = 0; fl.from = { x: fl.x, y: fl.y }; Sfx.play('trapezeToss'); }
      return;
    }
    if (fl.state === 'toss' || fl.state === 'climb') {
      const T = fl.state === 'toss' ? S.tossT : S.climbT, u = clamp(fl.t / T, 0, 1);
      if (fl.state === 'toss') {
        const e = K.smooth(u);
        fl.x = K.lerp(fl.from.x, S.board.x, e); fl.y = K.lerp(fl.from.y, S.board.y, e) - Math.sin(u * Math.PI) * 110; fl.rot = -u * TAU;
      } else {
        // walk to the ladder (x 46), then climb to the board
        const a = clamp(u / 0.35, 0, 1), b = clamp((u - 0.35) / 0.65, 0, 1);
        fl.x = K.lerp(fl.from.x, 46, K.smooth(a)); fl.y = K.lerp(S.netY - 20, S.board.y, b) - (a < 1 ? Math.abs(Math.sin(a * 9)) * 8 : 0); fl.rot = 0;
        if (b > 0.95) fl.x = K.lerp(46, S.board.x, (b - 0.95) / 0.05);
      }
      if (u >= 1) {
        fl.state = 'board'; fl.f = -Math.PI / 2; fl.rot = 0; Sfx.play('trapezeLand', st.fly);
        if (st.caught >= S.catches && st.state === 'go') { st.state = 'end'; st.endT = 0; endAct(st); }
      }
      return;
    }
    if (fl.state === 'net') {
      fl.vy += 1400 * dt; fl.y += fl.vy * dt; fl.x += fl.vx * dt; fl.vx *= 1 - dt * 2; fl.rot = approach(fl.rot, 0, dt * 6);
      if (fl.y > S.netY - 20) {
        fl.y = S.netY - 20;
        if (fl.bounces < 2 && Math.abs(fl.vy) > 120) { fl.vy = -Math.abs(fl.vy) * 0.5; fl.bounces++; Sfx.play('trapezeBoing'); }
        else fl.vy = 0;
      }
      if (fl.t > 1.3) { fl.state = 'climb'; fl.t = 0; fl.from = { x: fl.x, y: fl.y }; }
    }
  }
  function letGo(st) {
    const fl = st.flyer, r = release(fl.f);
    Object.assign(fl, { state: 'air', x: r.x, y: r.y, vx: r.vx, vx0: r.vx, vy: r.vy, q: r.q, t: 0, spin: 0, flips: 0, apex: r.y, y0: r.y, hoopN: 0, tuck: false, sayOpen: false, sayReach: false });
    st.stats.releases++;
    Sfx.play('trapezeWhoosh', st.fly);
    if (r.q > 0.7) { K.pop(st, r.x, r.y - 60, 'Great timing!', C.gold, 22); st.stats.great++; }
    else if (wrapPi(fl.f - Math.PI / 2) < 0) K.pop(st, r.x, r.y - 60, 'A bit early!', '#ffe7a8', 18);
    else K.pop(st, r.x, r.y - 60, 'A bit late!', '#ffe7a8', 18);
  }
  function caught(st, d) {
    const fl = st.flyer;
    fl.state = 'held'; fl.t = 0; fl.tuck = false;
    const rise = clamp(fl.y0 - fl.apex, 0, 200), high = Math.round(clamp(rise / 110, 0, 1) * 60);
    const flips = Math.min(3, fl.flips), perfect = d < S.perfectR;
    const pts = 100 + high + flips * 60 + fl.hoopN * 40 + (perfect ? 40 : 0);
    st.cheers += pts; st.caught++; st.stats.caught++; st.stats.flips += fl.flips; st.stats.hoops += fl.hoopN;
    st.stats.bestFlips = Math.max(st.stats.bestFlips, fl.flips); if (perfect) st.stats.perfect++;
    st.cheer = Math.min(1, 0.5 + pts / 400);
    Sfx.play('trapezeCatch'); Sfx.play('trapezeCheer');
    rumble(0, 0.2, 0.5, 160); rumble(1, 0.2, 0.5, 160);
    const words = perfect ? 'Perfect catch!' : flips >= 2 ? 'Amazing!' : flips === 1 ? 'Ta-da!' : 'Caught!';
    K.pop(st, fl.x, fl.y - 90, words + ' +' + pts, C.gold, 26);
    K.confetti(st, fl.x, fl.y - 30, 26);
  }
  function toNet(st) {
    const fl = st.flyer;
    fl.state = 'net'; fl.t = 0; fl.bounces = 0; fl.vy = Math.max(200, fl.vy); fl.vx = clamp(fl.vx, -200, 200);
    fl.x = clamp(fl.x, S.netX0 + 20, S.netX1 - 20); fl.y = Math.min(fl.y, S.netY - 20);
    st.stats.boings++; st.rBoings++;
    Sfx.play('trapezeBoing');
    K.pop(st, fl.x, S.netY - 80, 'Boing! Into the net', '#ffffff', 20);
    if (fl.tuck || fl.spin % TAU > 0.45) K.hint(st, st.fly, 'Let go of ' + K.key(st.fly, 'up') + ' before the catch: open hands!', 3.2);
    else if (!st.cat.reach) K.hint(st, st.catchId, 'Hold ' + K.key(st.catchId, 'act') + ' to reach as they fly in!', 3.2);
    if (st.rBoings >= S.goldBoings && !st.gold.hands && K.both(st)) {
      st.gold.hands = true; st.stats.helps++; Sfx.play('trapezeHelp');
      K.msg(st, 'Gold hands! Catches reach much further this act', C.gold, 4.4);
    }
  }
  function endAct(st) {
    const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
    st.stats.actT[st.k] = G.time - st.segStart;
    Sfx.play(last ? 'trapezeFanfare' : 'trapezeBow');
    K.pop(st, W / 2, 200, last ? 'The crowd goes wild!' : 'Take a bow!', C.gold, 32);
    st.cheer = 1;
    st.lastAct = last;
  }
  function endStep(st, dt) {
    st.endT += dt; st.cheer = 1;
    if (Math.random() < dt * 20) K.confetti(st, 100 + Math.random() * (W - 200), 60, 2);
    if (st.lastAct) {
      if (st.endT > 2.6 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 200 }; levelClear(); }
    } else if (st.endT > 2.2) nextRoom();
  }

  /* ---------- what to do next (prompts, chips and the computer read this) ---------- */
  function plan(st) {
    const fl = st.flyer, c = st.cat, out = { pumpDir: 0, pumpNow: false, hep: false, hepQ: 0, letGo: false, glow: 0, tuck: false, steer: 0, reach: false, meet: null };
    const vel = -c.A * S.w * Math.cos(c.f);
    out.pumpDir = vel < -0.08 ? -1 : vel > 0.08 ? 1 : 0;
    out.pumpNow = c.A < S.aGood + 0.12;
    if (fl.state === 'board') {
      out.hepQ = hepQuality(st);
      out.hep = out.hepQ > 0.55 && c.A >= S.aGood - 0.1;
    } else if (fl.state === 'swing') {
      const d = wrapPi(fl.f - Math.PI / 2);
      out.glow = clamp(1 - Math.abs(d) / 0.35, 0, 1);
      // let go at the top (a hair before, so the press lands on it)
      out.letGo = d > -0.08 && d < 0.3;
      const fl0 = release(Math.PI / 2), tUntil = Math.max(0, -d / S.w);
      out.meet = predict(st, fl0, c.f + S.w * tUntil, c.A);
      out.reach = true;
    } else if (fl.state === 'air') {
      const m = predict(st, fl, c.f, c.A);
      out.meet = m;
      out.reach = m.t < 0.9;
      const r = wrap(fl.spin), toOpen = r > 0.01 ? (TAU - r) / S.openW : 0;
      // tuck for a flip only when there's time to finish it and open before the hands meet
      out.tuck = m.d < 160 && m.t > (fl.tuck ? toOpen + 0.18 : 0.48 + TAU / S.tuckW) && fl.flips < 3;
      if (!fl.tuck && m.t < 0.55) out.steer = Math.abs(m.dx) > 10 ? Math.sign(m.dx) : 0;
      else if (!out.tuck && m.d > 30) out.steer = Math.abs(m.dx) > 14 ? Math.sign(m.dx) : 0;
    }
    return out;
  }

  /* ---------- where the players are (screen px, for name tags and bubbles) ---------- */
  function mirror(st) {
    const fl = st.flyer, c = st.cat;
    K.place(st.fly, fl.x, fl.y + 44);
    const bar = catchHands(c.f, c.A, false), tag = { x: S.P2.x + (S.LB + 10) * Math.sin(bar.th), y: S.P2.y + (S.LB + 10) * Math.cos(bar.th) };
    K.place(st.catchId, tag.x, tag.y - 4);
    for (const p of G.players) { p.face = p.id === st.fly ? 1 : -1; }
  }

  /* ---------- drawing ---------- */
  const LOOK = {
    warm: { ring: '#e8443a', glow: 'rgba(255,214,140,0.10)' },
    spot: { ring: '#5b95ff', glow: 'rgba(170,200,255,0.10)' },
    hoop: { ring: '#b28dff', glow: 'rgba(220,170,255,0.10)' },
    finale: { ring: '#ffc53d', glow: 'rgba(255,230,140,0.14)' },
  };
  function draw(st) {
    const t = G.clock, lk = LOOK[st.look] || LOOK.warm;
    K.bigTop(t);
    ctx.fillStyle = lk.glow; ctx.fillRect(0, 0, W, H);
    // the rigging: the king poles, the board with its ladder, the catcher's frame
    ctx.fillStyle = '#c9b39a'; ctx.fillRect(28, 30, 8, H); ctx.fillRect(W - 36, 30, 8, H);
    ctx.strokeStyle = 'rgba(240,230,210,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(32, S.P1.y); ctx.lineTo(W - 32, S.P2.y); ctx.stroke();
    // ladder up to the board
    ctx.strokeStyle = '#d9c8a8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(38, S.board.y + 44); ctx.lineTo(38, S.netY + 30); ctx.moveTo(56, S.board.y + 44); ctx.lineTo(56, S.netY + 30); ctx.stroke();
    ctx.lineWidth = 2; for (let y = S.board.y + 60; y < S.netY + 30; y += 22) { ctx.beginPath(); ctx.moveTo(38, y); ctx.lineTo(56, y); ctx.stroke(); }
    // the board
    ctx.fillStyle = '#8a5a3a'; rr(30, S.board.y + 44, S.board.x - 16, 10, 3); ctx.fill();
    ctx.fillStyle = lk.ring; rr(30, S.board.y + 44, S.board.x - 16, 4, 2); ctx.fill();
    // the safety net
    drawNet(st);
    // the ring below (sawdust) and the crowd
    ctx.fillStyle = '#d9b47a'; ctx.beginPath(); ctx.ellipse(W / 2, H - 14, 420, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = lk.ring; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(W / 2, H - 14, 420, 26, 0, Math.PI, Math.PI * 2); ctx.stroke();
    K.crowd(H - 36, st.cheer, t, 0, 150); K.crowd(H - 36, st.cheer, t, W - 150, W);
    // hoops
    for (const h of st.hoops) drawHoop(h, t);
    // the flyer's path guide (gold hands show the whole path; otherwise the first part, while swinging)
    const pl = plan(st);
    if (st.flyer.state === 'swing' && pl.meet && pl.meet.path) {
      const path = pl.meet.path, n = st.gold.hands ? path.length : Math.min(path.length, 24);
      ctx.fillStyle = st.gold.hands ? 'rgba(255,214,90,0.8)' : 'rgba(255,255,255,' + (0.25 + 0.5 * pl.glow) + ')';
      for (let i = 0; i < n; i += 6) { circle(path[i], path[i + 1] + 20, 2.5); ctx.fill(); }
    }
  }
  function drawNet(st) {
    const y = S.netY, fl = st.flyer, dip = fl.state === 'net' ? Math.max(0, (fl.y - (y - 40)) * 0.6) : 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1;
    const sag = x => (dip ? dip * Math.max(0, 1 - Math.abs(x - fl.x) / 160) : 0) + 6 * Math.sin((x - S.netX0) / (S.netX1 - S.netX0) * Math.PI);
    ctx.beginPath();
    for (let x = S.netX0; x <= S.netX1; x += 10) { const yy = y + sag(x); if (x === S.netX0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
    ctx.stroke();
    for (let x = S.netX0; x <= S.netX1; x += 20) { ctx.beginPath(); ctx.moveTo(x, y + sag(x)); ctx.lineTo(x + 10, y + 14 + sag(x + 10) * 0.6); ctx.lineTo(x + 20, y + sag(x + 20)); ctx.stroke(); }
    ctx.strokeStyle = '#e8d8b8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(S.netX0, y); ctx.lineTo(S.netX0, H); ctx.moveTo(S.netX1, y); ctx.lineTo(S.netX1, H); ctx.stroke();
  }
  function drawHoop(h, t) {
    const s = 1 + (h.t > 0 ? h.t * 0.4 : 0);
    ctx.save(); ctx.translate(h.x, h.y); ctx.scale(s * 0.55, s);
    ctx.globalAlpha = h.got ? 0.35 : 1;
    ctx.strokeStyle = C.gold; ctx.lineWidth = 7; circle(0, 0, 34); ctx.stroke();
    ctx.strokeStyle = '#fff4c0'; ctx.lineWidth = 2; circle(0, 0, 34); ctx.stroke();
    ctx.restore();
    if (!h.got) { ctx.fillStyle = 'rgba(255,214,90,0.9)'; for (let k = 0; k < 3; k++) { const a = t * 3 + k * 2.1; K.star(h.x + Math.cos(a) * 26, h.y + Math.sin(a) * 40, 4, 1.7, a); ctx.fill(); } }
    ctx.globalAlpha = 1;
  }
  function drawTop(st) {
    const fl = st.flyer, c = st.cat, pl = plan(st);
    // the fly bar (on the board it hangs hooked at the board)
    const bh = fl.state === 'swing' ? flyHands(fl.f) : fl.state === 'board' ? S.board : flyHands(barRest(st));
    const glow = fl.state === 'swing' ? pl.glow : 0;
    drawBar(S.P1, bh, glow > 0.05 ? 'rgba(255,214,90,' + (0.4 + 0.6 * glow) + ')' : null);
    // the catcher hanging by the knees
    const kb = catchHands(c.f, c.A, false), th = kb.th;
    const barP = { x: S.P2.x + S.LB * Math.sin(th), y: S.P2.y + S.LB * Math.cos(th) };
    drawBar(S.P2, barP, null);
    {
      const id = st.catchId, mid = { x: S.P2.x + (S.LB + 46) * Math.sin(th), y: S.P2.y + (S.LB + 46) * Math.cos(th) };
      const hands = catchHands(c.f, c.A, c.reach);
      ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(barP.x, barP.y); ctx.lineTo(mid.x + Math.sin(th) * -10, mid.y - 18); ctx.stroke(); // legs over the bar
      K.hero(id, mid.x + Math.sin(th) * 13, mid.y + Math.cos(th) * 13, { rot: Math.PI - th, face: -1 });
      ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 5;
      const sh = { x: S.P2.x + (S.LB + 58) * Math.sin(th), y: S.P2.y + (S.LB + 58) * Math.cos(th) };
      ctx.beginPath(); ctx.moveTo(sh.x - 6, sh.y); ctx.lineTo(hands.x - 5, hands.y); ctx.moveTo(sh.x + 6, sh.y); ctx.lineTo(hands.x + 5, hands.y); ctx.stroke();
      ctx.fillStyle = c.reach ? (st.gold.hands ? C.gold : '#ffffff') : PDARK[id]; circle(hands.x - 5, hands.y, 4.5); ctx.fill(); circle(hands.x + 5, hands.y, 4.5); ctx.fill();
      if (c.reach && st.gold.hands) { ctx.strokeStyle = 'rgba(255,214,90,0.5)'; ctx.lineWidth = 2; circle(hands.x, hands.y, S.goldR * 0.6); ctx.stroke(); }
    }
    // the flyer
    {
      const id = st.fly, ps = fl.state;
      if (ps === 'board') K.hero(id, fl.x, fl.y + 44, { face: 1 });
      else if (ps === 'swing' || ps === 'held') {
        // hanging from the hands
        const a = ps === 'swing' ? flyHands(fl.f).th : catchHands(c.f, c.A, true).th;
        ctx.save(); ctx.translate(fl.x, fl.y); ctx.rotate(-a);
        ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-7, 18); ctx.moveTo(5, 0); ctx.lineTo(7, 18); ctx.stroke();
        K.hero(id, 0, 46, { face: 1, sy: 1.08 });
        ctx.restore();
      } else {
        // flying: rotate around the body's middle (the hands are 24 px above it)
        ctx.save(); ctx.translate(fl.x, fl.y + 24); ctx.rotate(fl.rot);
        if (fl.tuck) K.hero(id, 0, PH / 2 * 0.8, { face: 1, sy: 0.78, sx: 1.12 });
        else {
          ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-5, -24); ctx.moveTo(6, -10); ctx.lineTo(5, -24); ctx.stroke();
          K.hero(id, 0, PH / 2, { face: 1, stun: ps === 'net' && fl.t < 0.6 });
        }
        ctx.restore();
      }
    }
    K.drawParts(st, 0);
    K.drawPops(st, 0, 0);
  }
  // where the fly bar swings when nobody holds it (it's pulled back to the board)
  function barRest(st) { const fl = st.flyer; return fl.state === 'air' || fl.state === 'net' ? -Math.PI / 2 + Math.max(0, 1 - fl.t) * 0 : -Math.PI / 2; }
  function drawBar(P, h, glow) {
    const dx = h.x - P.x, dy = h.y - P.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L * 14, ny = dx / L * 14;
    ctx.strokeStyle = 'rgba(240,230,210,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(P.x - 12, P.y); ctx.lineTo(h.x + nx, h.y + ny); ctx.moveTo(P.x + 12, P.y); ctx.lineTo(h.x - nx, h.y - ny); ctx.stroke();
    if (glow) { ctx.strokeStyle = glow; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(h.x + nx, h.y + ny); ctx.lineTo(h.x - nx, h.y - ny); ctx.stroke(); }
    ctx.strokeStyle = '#d9d0c0'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(h.x + nx, h.y + ny); ctx.lineTo(h.x - nx, h.y - ny); ctx.stroke();
  }

  /* ---------- the HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = st.cheers + ' cheers';
      ctx.font = FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs * 2 + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, C.gold, 'right', 'body');
      timeX0 = x0;
      // catches this act
      const cy2 = 12 + h + 8, ch = big ? 30 : 22;
      const cw = (big ? 34 : 26) * S.catches + 20, cx0 = pill(W - 14, cy2, cw, ch, 'right');
      for (let k = 0; k < S.catches; k++) { const x = cx0 + 10 + (big ? 34 : 26) * (k + 0.5); ctx.fillStyle = k < st.caught ? C.gold : 'rgba(255,255,255,0.22)'; K.star(x, cy2 + ch / 2, big ? 11 : 8, big ? 4.6 : 3.4, 0); ctx.fill(); }
    }
    K.drawMsg(st, st.waiting ? { text: 'Taking a break... press anything to swing on', col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play) return;
    const pl = plan(st), fl = st.flyer, c = st.cat, F = st.fly, Cc = st.catchId;
    // panels
    {
      const b = K.panel(Cc, 'catcher', 250, 58, z), cy = b.y + 27 * z, chh = 23 * z, qt = K.quiet(Cc);
      // swing meter with the gold band
      const gx = b.x + 12 * z, gw = b.w * 0.42;
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(gx, cy, gw, chh, chh / 2); ctx.fill();
      const gb = gx + 2 + (gw - 4) * (S.aGood - S.aMin) / (S.aMax - S.aMin);
      ctx.fillStyle = 'rgba(255,197,61,0.35)'; ctx.fillRect(gb, cy + 2, gx + gw - 2 - gb, chh - 4);
      const fw = (gw - 4) * clamp((c.A - S.aMin) / (S.aMax - S.aMin), 0, 1);
      ctx.fillStyle = c.A >= S.aGood ? '#8fe3b0' : '#9fd0ff'; if (fw > 2) { rr(gx + 2, cy + 2, Math.max(chh - 4, fw), chh - 4, (chh - 4) / 2); ctx.fill(); }
      ctx.font = FONT(Math.round(11 * z)); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      const lab = (qt ? '' : K.key(Cc, 'lr') + ' ') + 'SWING';
      ctx.strokeStyle = 'rgba(28,26,54,0.95)'; ctx.lineWidth = 3.5 * z; ctx.strokeText(lab, gx + 8 * z, cy + chh / 2 + 0.5); ctx.fillStyle = '#fff'; ctx.fillText(lab, gx + 8 * z, cy + chh / 2 + 0.5);
      const bx = gx + gw + 6 * z, bw = b.x + b.w - 12 * z - bx;
      const isBoard = fl.state === 'board';
      K.chip(bx, cy, bw, chh, (qt ? '' : K.key(Cc, 'act') + ' ') + (isBoard ? 'HEP!' : 'REACH'), isBoard ? pl.hep : pl.reach && fl.state === 'air' && pl.meet && pl.meet.t < 0.5, c.reach && !isBoard, z);
      // the Hep ring: lights up gold in the window
      if (isBoard) { const rx = bx - 2, ry = b.y + 13 * z; ctx.strokeStyle = pl.hepQ > 0.55 ? C.gold : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 3; circle(b.x + b.w - 18 * z, b.y + 14 * z, 7 * z * (0.6 + 0.4 * pl.hepQ)); ctx.stroke(); void rx; void ry; }
    }
    {
      const b = K.panel(F, 'flyer', 250, 58, z), cy = b.y + 27 * z, chh = 23 * z, qt = K.quiet(F), cw = (b.w - 24 * z - 12 * z) / 3;
      K.chip(b.x + 12 * z, cy, cw, chh, (qt ? '' : K.key(F, 'act') + ' ') + 'LET GO', fl.state === 'swing' && pl.glow > 0.55, false, z);
      K.chip(b.x + 12 * z + cw + 6 * z, cy, cw, chh, (qt ? '' : K.key(F, 'up') + ' ') + 'FLIP', fl.state === 'air' && pl.tuck && !fl.tuck, fl.tuck, z);
      K.chip(b.x + 12 * z + 2 * (cw + 6 * z), cy, cw, chh, (qt ? '' : K.key(F, 'lr') + ' ') + 'STEER', fl.state === 'air' && !!pl.steer && !fl.tuck, !!fl.steer, z);
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st);
    // the catcher's prompt
    {
      const ch = catchHands(c.f, c.A, false);
      let s = null, col = C.gold, pulse = false;
      if (fl.state === 'board') {
        if (c.A < S.aGood - 0.1) s = 'Swing higher! ' + (pl.pumpDir < 0 ? K.key(Cc, 'left') : K.key(Cc, 'right'));
        else if (pl.hep) { s = 'Call Hep! ' + K.key(Cc, 'act'); pulse = true; }
        else { s = 'Wait for the gold ring...'; col = '#ffe7a8'; }
      } else if (fl.state === 'air' && pl.meet && pl.meet.t < 0.7 && !c.reach) { s = 'Reach! ' + K.key(Cc, 'act'); pulse = true; }
      else if (fl.state === 'swing' && c.A < S.aGood - 0.1) s = 'Keep swinging ' + (pl.pumpDir < 0 ? K.key(Cc, 'left') : K.key(Cc, 'right'));
      P.say(Cc, s, clamp(ch.x, 600, W - 100), ch.y - 150, col, pulse);
    }
    // the flyer's prompt
    {
      let s = null, col = C.gold, pulse = false;
      if (fl.state === 'board') { s = 'Wait for the Hep!'; col = '#ffe7a8'; }
      else if (fl.state === 'swing') { if (pl.glow > 0.55) { s = 'Let go! ' + K.key(F, 'act'); pulse = true; } else if (wrapPi(fl.f - Math.PI / 2) < 0) { s = 'Let go on the gold...'; col = '#ffe7a8'; } }
      else if (fl.state === 'air') {
        if (fl.tuck && !pl.tuck) { s = 'Open up! Let go of ' + K.key(F, 'up'); pulse = true; }
        else if (pl.tuck && !fl.tuck) s = 'Flip! Hold ' + K.key(F, 'up');
        else if (pl.steer) s = 'Steer ' + (pl.steer < 0 ? K.key(F, 'left') : K.key(F, 'right'));
      }
      P.say(F, s, clamp(fl.x, 120, 520), fl.y - 40, col, pulse);
    }
  }
  const FONT = K.FONT;

  const medal = (t, boings, cheers) => (t <= 195 && boings <= 3 && cheers >= 2200 ? 'Gold' : t <= 330 && boings <= 10 ? 'Silver' : 'Bronze');

  MODES.trapeze = {
    medals: { bronze: 'Finish the trapeze show', goals: [{ key: 'time', gold: 195, silver: 330 }, { key: 'boings', gold: 3, silver: 10, word: 'Boing' }, { key: 'cheers', gold: 2200, more: true, word: 'cheer' }] },
    medalValues() { const st = G.mst; return st.stats ? { boings: st.stats.boings, cheers: st.cheers } : {}; },
    S, plan, release, predict, flyHands, catchHands, hepTarget, hepQuality, medal,
    setup(st, L) {
      st.stats = { caught: 0, boings: 0, flips: 0, bestFlips: 0, hoops: 0, perfect: 0, great: 0, releases: 0, heps: 0, goodHeps: 0, helps: 0, actT: [] };
      st.cheers = 0; st.inT = [G.time, G.time]; st.personT = G.time;
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; st.cleared = false; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.flyer) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.flyer) drawTop(st); },
    hud() { const st = G.mst; if (st.flyer) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Cheers', value: String(st.cheers) },
        { label: 'Flips', value: String(s.flips) },
        { label: 'Boings', value: String(s.boings) },
      ];
      out.push((s.bestFlips >= 3 ? 'A triple flip! ' : s.bestFlips === 2 ? 'A double flip! ' : '') + 'Perfect catches: ' + s.perfect + '. Gold hoops: ' + s.hoops + '. Great timing: ' + s.great + ' of ' + s.releases + '.');
      if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
      return out;
    },
  };

  /* ---------- sounds ---------- */
  Sfx.extra.trapezeHep = function (p) { this.tone(520 * p, 0.08, 'square', 0.035); this.tone(660 * p, 0.12, 'square', 0.035, null, 0.08); };
  Sfx.extra.trapezeJump = function (p) { this.tone(300 * p, 0.18, 'sine', 0.04, 520 * p); };
  Sfx.extra.trapezeWhoosh = function () { this.tone(500, 0.25, 'triangle', 0.03, 1200); };
  Sfx.extra.trapezeFlip = function (n) { this.tone(600 + n * 120, 0.08, 'triangle', 0.035, 900 + n * 120); };
  Sfx.extra.trapezeHoop = function () { [988, 1319, 1568].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.04, null, i * 0.05)); };
  Sfx.extra.trapezeCatch = function () { this.tone(330, 0.08, 'square', 0.04); this.tone(494, 0.12, 'triangle', 0.05, null, 0.06); };
  Sfx.extra.trapezeCheer = function () { for (let i = 0; i < 10; i++) this.tone(300 + Math.random() * 500, 0.08, 'sawtooth', 0.008, null, i * 0.04); [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.04, null, 0.1 + i * 0.07)); };
  Sfx.extra.trapezeBoing = function () { this.tone(180, 0.3, 'sine', 0.06, 420); };
  Sfx.extra.trapezeLand = function (p) { this.tone(220 * p, 0.08, 'triangle', 0.04, 160 * p); };
  Sfx.extra.trapezeToss = function () { this.tone(400, 0.3, 'sine', 0.04, 800); };
  Sfx.extra.trapezeHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
  Sfx.extra.trapezeBow = function () { [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.09)); };
  Sfx.extra.trapezeFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.11)); };
})();
