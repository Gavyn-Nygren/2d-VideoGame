/* Pip & Bo - Level 26-2 Clown Car Getaway (team, World 26 Circus Big Top). */
'use strict';

/* ===== 26-2 Clown Car Getaway (mode 'clowncar', World 26 "Circus Big Top", team, scrolls right, Gavyn's pick) =====
   Gavyn's pick: "a runaway clown car races through the fairground. One drives, the other pops out of the roof to honk
   animals out of the way and grab clowns who jump on."
   Pip and Bo ride one tiny, rattly clown car along the fairground path, seen from the side; the camera follows the car.
   The mode owns the tick, the camera and the picture (def.ownStep + ownHUD + noFalls); the engine grid is only spawns.
   All positions are world px: x grows to the right, the road is flat at S.road (y grows down).
   THE DRIVER (front seat): ▶ is the gas, ◀ brakes (held when stopped it rolls back a little), with nothing pressed the
     car rolls to a stop. ▲ (or the action, 'hop') bounces the car on its springy wheels: hop over the custard pies and
     banana peels on the road, or the car skids round ("Wheee!") and slows right down.
   THE POPPER (out of the roof hatch): ◀ ▶ lean along the roof, ▼ (held) ducks inside, the action ('honk') squeezes the
     big horn. Honk at animals on the road ahead (ducks, a poodle, a seal, the elephant needs two honks) and they
     scurry off; if the car reaches one it's a soft "Bonk!" and the car stops for a moment. Duck under the low bunting
     banners (a "Duck!" sign stands before each) or it's a "Bonk!" and a dizzy popper for a moment.
   CLOWNS: clowns stand by the road on little trampolines and leap for the car as it passes, aimed for where the car
     will be at the stretch's pace (the gold mark on the driver's speed meter). A clown that reaches the popper's hands
     (lean ◀ ▶ under it, not ducked, not dizzy) hops inside ("Honk honk!"). A missed clown bounces down and waits by
     the road, waving, for 7 s: roll past it slowly (under 100 px/s) with the popper up and leaning over it to scoop it in.
   THE END OF A STRETCH: the car rolls into a pit-stop tent and stops by itself, the clowns pile out and cheer, and Pip
     and Bo swap seats. 4 stretches (roomWord 'Stretch'): The Midway, Carousel Corner, Funhouse Lane, The Big Top.
     Pip drives 1 and 3, Bo drives 2 and 4 (room def `drive`).
   GOLD HELP (announced, only while both are playing): 3 bonks in one stretch: gold bumpers (animals and banners can't
     bonk you, pies can't skid you) for the rest of it. 5 clowns missed in a row: gold clowns (they float down slowly
     right into the popper's hands) for the rest of the stretch.
   IDLE: 15 s with no person pressing anything: "Taking a break", the car rolls to a stop and the clock stops.
   Scoring: clowns in the car. Medal (MODES.clowncar.medals, js/medals.js): Gold <= 3:30 with >= 75% of the clowns and <= 4 bonks; Silver <= 5:30 with >= 50%.
   Room def: { title, drive: 0|1, look, pace, course: [tokens] }. Course tokens (x advances only with fN):
     fN road for N px   C:n a trampoline with n clowns   A:kind an animal on the road (duck | poodle | seal | elephant)
     P a custard pie on the road   N a banana peel   B a low banner across the road   S:text a sign ({D} driver, {R} popper)
     E the pit-stop tent at the end.
   MODES.clowncar.plan(st) is the one place that says what to do next (prompts, HUD chips and the computer brain). */
(() => {
  const K = CIRCUS, FONT = K.FONT;
  const S = {
    road: 446, vMax: 300, acc: 260, brake: 460, coast: 120, revMax: 90, revAcc: 200,
    hopV: 390, hopG: 1350, wheelR: 17, front: 52, back: -66, hatch: -14, roofH: 66, uMax: 34,
    leapT: 1.15, clownG: 900, clownGold: 380, catchDX: 38, catchY: 40, scoopV: 100, scoopDX: 52, waitT: 7,
    honkReach: 430, honkCd: 0.35, bonkStop: 0.9, skidT: 0.9, dizzyT: 1.2,
    camLead: 0.34, idleWait: 15, goldBonks: 3, goldMiss: 5,
  };
  const ANIMAL = {
    duck: { w: 46, honks: 1, word: 'Quack!' }, poodle: { w: 40, honks: 1, word: 'Yip yip!' },
    seal: { w: 54, honks: 1, word: 'Ork ork!' }, elephant: { w: 110, honks: 2, word: 'Hrrumph!' },
  };

  /* ---------- the course ---------- */
  function compile(def) {
    const drive = def.drive || 0, name = s => s.replace(/\{D\}/g, NAMES[drive]).replace(/\{R\}/g, NAMES[1 - drive]);
    const c = { x0: -300, pace: def.pace || 175, clowns: [], stands: [], animals: [], pies: [], banners: [], signs: [], end: null, len: 0, total: 0 };
    let x = 420;
    for (const tk of def.course || []) {
      const parts = String(tk).split(':'), k = parts[0];
      if (k[0] === 'f' && k.length > 1) { x += +k.slice(1); continue; }
      if (k === 'C') { const n = +parts[1] || 1; c.stands.push({ x, n, left: n, t: 0, next: 0 }); c.total += n; continue; }
      if (k === 'A') { const kind = parts[1] || 'duck'; c.animals.push({ x, kind, st: 'road', honks: 0, t: 0, y: 0, dir: Math.random() < 0.5 ? -1 : 1 }); continue; }
      if (k === 'P' || k === 'N') { c.pies.push({ x, kind: k === 'P' ? 'pie' : 'peel', st: 'road' }); continue; }
      if (k === 'B') { c.banners.push({ x, hit: false, passed: false }); c.signs.push({ x: x - 330, text: 'Duck! ▼', warn: true }); continue; }
      if (k === 'S') { c.signs.push({ x, text: name(String(tk).slice(2)) }); continue; }
      if (k === 'E') { c.end = { x: x + 260 }; x += 900; continue; }
    }
    c.len = x + 200;
    return c;
  }

  /* ---------- a stretch (one room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.drive = def.drive || 0; st.pop = 1 - st.drive; st.look = def.look || 'midway'; st.title = def.title || '';
    st.c = compile(def);
    st.car = { s: 60, v: 0, hopY: 0, hopV: 0, air: false, spin: 0, spinA: 0, stopT: 0, wheel: 0, gas: 0, brk: 0, puff: 0 };
    st.pp = { u: 0, duck: false, dizzy: 0, honkT: 0, honkCd: 0, face: 1 };
    st.flying = []; st.inCar = 0; st.rBonks = 0; st.missRun = 0;
    st.gold = { bumpers: false, clowns: false };
    st.state = 'go'; st.endT = 0; st.segStart = G.time;
    st.cam = { x: st.car.s - W * S.camLead };
    K.fx(st);
    actLabels(st);
    mirror(st);
  }
  function actLabels(st) { const w = []; w[st.drive] = 'hop'; w[st.pop] = 'honk'; K.actLabels(w, 'hop/honk'); }
  const roofX = st => st.car.s + S.hatch;
  const carY = st => S.road - st.car.hopY;              // the car's wheels' bottom
  const handsY = st => carY(st) - S.roofH - 34;           // the popper's hands (catch height)

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.c) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    if (!live) for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    if (live) { driver(st, dt); popper(st, dt); }
    else if (st.state === 'go') { st.car.v = approach(st.car.v, 0, S.brake * dt); st.pp.duck = false; }
    move(st, dt);
    if (st.state === 'go') { stands(st, dt); clowns(st, dt); animals(st, dt); hazards(st); if (live) nudges(st); }
    else endStep(st, dt);
    if (st.state === 'go' && st.c.end && st.car.s >= st.c.end.x - 200) toEnd(st);
    cam(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }
  function driver(st, dt) {
    const p = G.players[st.drive], i = p.input, car = st.car;
    const hop = p.pendingJump || p.pendingAct;
    p.pendingJump = false; p.pendingAct = false;
    if (hop && !car.air) { car.air = true; car.hopV = S.hopV; Sfx.play('clowncarHop', st.drive); }
    if (car.stopT > 0) { car.stopT -= dt; car.v = approach(car.v, 0, S.brake * 2 * dt); return; }
    const spinK = car.spin > 0 ? 0.35 : 1;
    if (i.right && !i.left) car.v = Math.min(S.vMax * spinK, car.v + (car.v < 0 ? S.brake : S.acc) * dt);
    else if (i.left || i.down) {
      if (car.v > 0) car.v = Math.max(0, car.v - S.brake * dt);
      else if (i.left) car.v = Math.max(-S.revMax, car.v - S.revAcc * dt);
    } else car.v = car.v > 0 ? Math.max(0, car.v - S.coast * dt) : Math.min(0, car.v + S.coast * 2 * dt);
    if (car.spin > 0) car.v = Math.min(car.v, S.vMax * 0.4);
    car.gas = i.right ? 1 : 0; car.brk = i.left || i.down ? 1 : 0;
  }
  function popper(st, dt) {
    const p = G.players[st.pop], i = p.input, pp = st.pp;
    p.pendingJump = false;
    if (pp.dizzy > 0) { pp.dizzy -= dt; p.pendingAct = false; pp.duck = false; return; }
    pp.duck = !!i.down;
    const dx = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    if (dx && !pp.duck) { pp.u = clamp(pp.u + dx * 220 * dt, -S.uMax, S.uMax); pp.face = dx; }
    if (p.pendingAct) { p.pendingAct = false; if (!pp.duck) honk(st); }
    if (pp.honkCd > 0) pp.honkCd -= dt;
    if (pp.honkT > 0) pp.honkT -= dt;
  }
  function honk(st) {
    const pp = st.pp, car = st.car;
    if (pp.honkCd > 0) return;
    pp.honkCd = S.honkCd; pp.honkT = 0.4; st.stats.honks++;
    Sfx.play('clowncarHonk', st.pop);
    K.pop(st, roofX(st) + 40, handsY(st) - 50, 'HONK!', '#ffffff', 22);
    for (let n = 0; n < 4; n++) K.part(st, roofX(st) + 20, handsY(st), 80 + Math.random() * 100, -40 + Math.random() * 60, 0.7, '#ffffff', 3, -30, 'note');
    const front = car.s + S.front;
    for (const a of st.c.animals) {
      if ((a.st === 'road' || a.st === 'grumpy') && a.x - front < S.honkReach + (a.kind === 'elephant' ? 120 : 0) && a.x - front > -40) {
        a.honks++;
        const need = ANIMAL[a.kind].honks;
        if (a.honks >= need) { a.st = 'off'; a.t = 0; st.stats.shooed++; Sfx.play('clowncarAnimal', a.kind); K.pop(st, a.x, S.road - 110, ANIMAL[a.kind].word, '#ffffff', 20); }
        else K.pop(st, a.x, S.road - 150, 'Hrrm? Again!', '#ffe7a8', 18);
      }
    }
  }
  function move(st, dt) {
    const car = st.car, s0 = car.s;
    if (car.air) { car.hopY += car.hopV * dt; car.hopV -= S.hopG * dt; if (car.hopY <= 0) { car.hopY = 0; car.hopV = 0; car.air = false; Sfx.play('clowncarLand'); K.dust(st, car.s - 20, S.road, 'rgba(230,210,170,0.7)', 4); } }
    car.s += car.v * dt;
    if (car.s < 60) { car.s = 60; car.v = Math.max(0, car.v); }
    car.wheel += (car.s - s0) / S.wheelR;
    if (car.spin > 0) { car.spin -= dt; car.spinA += dt * 14; if (car.spin <= 0) car.spinA = 0; }
    car.puff -= dt * (1 + Math.abs(car.v) / 100);
    if (car.puff <= 0) { car.puff = 0.3; K.part(st, car.s + S.back - 6, carY(st) - 16, -30 - car.v * 0.2, -20 - Math.random() * 20, 1.1, ['#ffb3d0', '#b3e0ff', '#fff3b0'][Math.floor(Math.random() * 3)], 5, -20, 'smoke'); }
  }

  /* ---------- clowns ---------- */
  function stands(st, dt) {
    const rx = roofX(st), pace = st.c.pace;
    for (const sd of st.c.stands) {
      if (sd.left <= 0) continue;
      sd.next -= dt;
      // leap when a car at the stretch's pace would be under the landing spot (just past the stand) at touchdown
      const land = rx + pace * S.leapT;
      if (land > sd.x - 40 && rx < sd.x + 160 && sd.next <= 0) {
        sd.left--; sd.next = 0.85;
        const x0 = sd.x - 10, y0 = S.road - 70, g = st.gold.clowns ? S.clownGold : S.clownG;
        const Tf = st.gold.clowns ? S.leapT * 1.25 : S.leapT;
        const xL = Math.max(land, sd.x - 30), yL = S.road - S.roofH - 34;
        st.flying.push({ x: x0, y: y0, vx: (xL - x0) / Tf, vy: (yL - y0 - 0.5 * g * Tf * Tf) / Tf, g, st: 'fly', t: 0, look: Math.floor(Math.random() * 4), rot: 0 });
        Sfx.play('clowncarBoing');
        K.pop(st, sd.x, S.road - 130, 'Wait for me!', '#ffffff', 16);
      }
    }
  }
  function clowns(st, dt) {
    const rx = roofX(st), pp = st.pp, hy = handsY(st);
    for (const cl of st.flying) {
      cl.t += dt;
      if (cl.st === 'fly' || cl.st === 'drop') {
        // gold clowns drift toward the popper's hands
        if (st.gold.clowns && cl.st === 'fly') cl.vx = approach(cl.vx, st.car.v + (rx + pp.u - cl.x) * 2.2, 400 * dt);
        const yPrev = cl.y;
        cl.vy += cl.g * dt; cl.x += cl.vx * dt; cl.y += cl.vy * dt; cl.rot += dt * 6;
        if (cl.st === 'fly' && cl.vy > 0 && yPrev <= hy + 6 && cl.y >= hy - 2 - 0) {
          const dx = cl.x - (rx + pp.u);
          if (!pp.duck && pp.dizzy <= 0 && Math.abs(dx) < S.catchDX) { catchClown(st, cl, false); continue; }
          if (Math.abs(cl.x - (rx + 0)) < 70) { cl.st = 'drop'; cl.vy = -260; cl.vx = -60 - Math.random() * 60; Sfx.play('clowncarBoing'); K.pop(st, cl.x, cl.y - 40, pp.duck ? 'Pop up!' : 'Oops!', '#ffe7a8', 17); }
        }
        if (cl.y >= S.road - 18) { cl.y = S.road - 18; cl.st = 'wait'; cl.t = 0; cl.vx = 0; missClown(st); }
      } else if (cl.st === 'wait') {
        // roll past slowly with the popper leaning over it to scoop it up
        if (Math.abs(st.car.v) < S.scoopV && !pp.duck && pp.dizzy <= 0 && Math.abs(cl.x - (rx + pp.u)) < S.scoopDX) { catchClown(st, cl, true); continue; }
        if (cl.t > S.waitT || cl.x < st.cam.x - 80) { cl.st = 'gone'; cl.t = 0; st.stats.lost++; }
      } else if (cl.st === 'in') { cl.t += dt; }
    }
    st.flying = st.flying.filter(cl => cl.st !== 'in' && !(cl.st === 'gone' && cl.t > 1));
    for (const cl of st.flying) if (cl.st === 'gone') { cl.x -= 60 * dt; }
  }
  function catchClown(st, cl, scoop) {
    cl.st = 'in';
    st.inCar++; st.caught++; st.stats.caught++; if (scoop) st.stats.scooped++;
    st.missRun = 0;
    Sfx.play('clowncarCatch', st.pop);
    K.pop(st, roofX(st), handsY(st) - 60, scoop ? 'Hop in!' : st.inCar >= 6 ? 'Honk honk! ' + st.inCar + ' in the car!' : 'Honk honk!', C.gold, 20);
    K.spark(st, roofX(st), handsY(st), 8);
  }
  function missClown(st) {
    st.stats.missed++; st.missRun++;
    if (st.missRun >= S.goldMiss && !st.gold.clowns && K.both(st)) {
      st.gold.clowns = true; st.stats.helps++; Sfx.play('clowncarHelp');
      K.msg(st, 'Gold clowns! They float right into your hands', C.gold, 4.4);
    }
  }

  /* ---------- animals, pies and banners ---------- */
  function animals(st, dt) {
    const car = st.car, front = car.s + S.front;
    for (const a of st.c.animals) {
      a.t += dt;
      if (a.st === 'off') { a.y = Math.min(80, a.y + 70 * dt); a.x += a.dir * 40 * dt; continue; }
      if (a.st === 'grumpy') { if (a.t > S.bonkStop + 0.3) { a.st = 'off'; a.t = 0; } continue; }
      const w = ANIMAL[a.kind].w;
      if (front > a.x - w / 2 - 4 && car.s < a.x + w / 2) {
        if (st.gold.bumpers) { a.st = 'off'; a.t = 0; K.pop(st, a.x, S.road - 110, 'Gold bump! ' + ANIMAL[a.kind].word, C.gold, 18); continue; }
        a.st = 'grumpy'; a.t = 0;
        car.v = Math.min(car.v, 0); car.s = Math.min(car.s, a.x - w / 2 - S.front - 6); car.stopT = S.bonkStop;
        bonk(st, a.x, S.road - 120, 'Bonk! ' + ANIMAL[a.kind].word);
        K.hint(st, st.pop, 'Honk ' + K.key(st.pop, 'act') + ' at animals before you reach them!', 3);
      }
    }
  }
  function hazards(st) {
    const car = st.car, front = car.s + S.front, rx = roofX(st), pp = st.pp;
    for (const pi of st.c.pies) {
      if (pi.st !== 'road') continue;
      if (front >= pi.x && car.s + S.back < pi.x) {
        if (car.hopY > 10) { pi.st = 'over'; st.stats.hopped++; K.pop(st, pi.x, S.road - 90, 'Boing! Over it!', '#d9ffd0', 16); continue; }
        if (front - pi.x < 30) {
          pi.st = 'splat';
          if (st.gold.bumpers) { K.pop(st, pi.x, S.road - 90, 'Gold bumpers!', C.gold, 16); continue; }
          car.spin = S.skidT; car.v = Math.min(car.v, S.vMax * 0.3);
          bonk(st, pi.x, S.road - 110, pi.kind === 'pie' ? 'Splat! Wheee!' : 'Slip! Wheee!');
          for (let n = 0; n < 10; n++) K.part(st, pi.x, S.road - 4, (Math.random() - 0.5) * 220, -80 - Math.random() * 140, 0.7, pi.kind === 'pie' ? '#fff6e0' : '#ffe14a', 4, 500, 'dot');
          K.hint(st, st.drive, 'Hop ' + K.key(st.drive, 'up') + ' over the ' + (pi.kind === 'pie' ? 'pies!' : 'peels!'), 3);
        }
      }
    }
    for (const b of st.c.banners) {
      if (b.passed) continue;
      if (rx >= b.x - 8) {
        b.passed = true;
        if (pp.duck) { st.stats.ducked++; K.pop(st, b.x, S.road - 170, 'Phew!', '#d9ffd0', 16); continue; }
        if (st.gold.bumpers) continue;
        b.hit = true; pp.dizzy = S.dizzyT; Sfx.play('clowncarBonkHead', st.pop);
        bonk(st, b.x, S.road - 170, 'Bonk! Ow, my hat!');
        K.hint(st, st.pop, 'Duck ' + K.key(st.pop, 'down') + ' under the banners!', 3);
      }
    }
  }
  function bonk(st, x, y, word) {
    st.stats.bonks++; st.rBonks++;
    Sfx.play('clowncarBonk');
    G.shake = reduceMotion ? 0 : 0.05;
    rumble(0, 0.2, 0.4, 150); rumble(1, 0.2, 0.4, 150);
    K.pop(st, x, y, word, '#ffe7a8', 20);
    if (st.rBonks >= S.goldBonks && !st.gold.bumpers && K.both(st)) {
      st.gold.bumpers = true; st.stats.helps++; Sfx.play('clowncarHelp');
      K.msg(st, 'Gold bumpers! No more bonks or skids this stretch', C.gold, 4.4);
    }
  }
  function nudges(st) {
    const pl = plan(st);
    if (pl.bannerSoon) K.hintOnce(st, 'duck', st.pop, 'A banner! Hold ' + K.key(st.pop, 'down') + ' to duck!', 2.6);
  }

  /* ---------- the pit stop ---------- */
  function toEnd(st) {
    const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
    st.state = 'end'; st.endT = 0; st.lastRoom = last;
    st.stats.roomT[st.k] = G.time - st.segStart;
    st.pp.duck = false; st.pp.dizzy = 0;
    Sfx.play('clowncarArrive');
    K.pop(st, st.c.end.x, S.road - 230, last ? 'The Big Top!' : 'Pit stop!', C.gold, 28);
  }
  function endStep(st, dt) {
    const car = st.car, park = st.c.end.x - 40;
    st.endT += dt;
    car.v = approach(car.v, clamp((park - car.s) * 2.2, -60, 200), 500 * dt);
    if (car.s > park) { car.s = park; car.v = 0; }
    // the clowns pile out one by one
    if (st.endT > 1 && st.inCar > 0 && st.endT > 1 + st.pile * 0.14) {
      st.pile++; st.inCar--;
      st.flying.push({ x: roofX(st), y: handsY(st), vx: 60 + Math.random() * 160, vy: -280 - Math.random() * 120, g: 900, st: 'out', t: 0, look: Math.floor(Math.random() * 4), rot: 0 });
      Sfx.play('clowncarPop', 0);
    }
    for (const cl of st.flying) if (cl.st === 'out') { cl.vy += cl.g * dt; cl.x += cl.vx * dt; cl.y += cl.vy * dt; if (cl.y > S.road - 18) { cl.y = S.road - 18; cl.vy = -Math.abs(cl.vy) * 0.4; cl.vx *= 0.6; } cl.t += dt; }
    if (st.endT > 1.2 && st.inCar === 0 && !st.saidN) { st.saidN = true; K.pop(st, st.c.end.x, S.road - 260, st.pile + (st.pile === 1 ? ' clown' : ' clowns') + ' made it!', C.gold, 26); Sfx.play('clowncarCheer'); K.confetti(st, st.c.end.x, S.road - 200, 30); }
    const doneT = Math.max(2.6, 1.6 + st.pile * 0.14);
    if (st.lastRoom) {
      if (st.endT > doneT + 1.2 && !st.cleared) { st.cleared = true; G.level.goal = { x: st.c.end.x - st.cam.x, y: S.road - 200 }; levelClear(); }
    } else if (st.endT > doneT + 0.6) { st.saidN = false; nextRoom(); }
  }

  /* ---------- what to do next ---------- */
  function plan(st) {
    const car = st.car, c = st.c, front = car.s + S.front, rx = roofX(st), pp = st.pp;
    const out = { vWant: c.pace, dWhy: 'pace', hop: false, honk: false, duck: false, uWant: 0, pWhy: 'ready', bannerSoon: false, animal: null, pie: null, clown: null };
    // the next animal on the road that hasn't been shooed
    for (const a of c.animals) if ((a.st === 'road' || a.st === 'grumpy') && a.x + 30 > front) { out.animal = a; break; }
    if (out.animal && !st.gold.bumpers) {
      const d = out.animal.x - ANIMAL[out.animal.kind].w / 2 - front;
      if (d < S.honkReach - 20) out.honk = pp.honkCd <= 0;
      if (d < 260) { out.vWant = Math.min(out.vWant, Math.max(0, (d - 30) * 1.2)); out.dWhy = 'animal'; }
    }
    // the next pie or peel
    for (const pi of c.pies) if (pi.st === 'road' && pi.x > car.s + S.back) { out.pie = pi; break; }
    if (out.pie && !st.gold.bumpers) {
      const d = out.pie.x - front, v = Math.max(40, car.v);
      // hop just before the front wheels reach it (only the front needs to clear it)
      if (d < 300 && d > -10) out.dWhy = 'pie';
      if (d > -4 && d / v < 0.1 && !car.air) out.hop = true;
    }
    // the next banner
    for (const b of c.banners) if (!b.passed) {
      const d = b.x - rx, v = Math.max(30, car.v);
      if (d < 420) out.bannerSoon = true;
      if (d / v < 0.45 || d < 30) { out.duck = true; out.pWhy = 'duck'; }
      break;
    }
    // clowns: the next one in the air, else one waiting by the road ahead
    let best = null;
    for (const cl of st.flying) if (cl.st === 'fly') {
      // where it will be at the hands' height
      const hy = handsY(st), a = cl.g / 2, b = cl.vy, cc = cl.y - hy;
      const disc = b * b - 4 * a * cc;
      if (disc < 0) continue;
      const t = (-b + Math.sqrt(disc)) / (2 * a);
      if (t < 0) continue;
      const lx = cl.x + cl.vx * t, rxT = rx + car.v * t;
      if (!best || t < best.t) best = { cl, t, rel: lx - rxT };
    }
    if (best) { out.clown = best; out.uWant = clamp(best.rel, -S.uMax, S.uMax); out.pWhy = 'catch'; if (best.t < 0.6) out.duck = false; }
    else {
      const w = st.flying.find(cl => cl.st === 'wait' && cl.x > rx - 40 && cl.x < rx + 700);
      if (w) {
        out.scoop = w;
        const d = w.x - rx;
        out.vWant = Math.min(out.vWant, clamp(Math.abs(d) * 0.6, 40, 90) * (d >= 0 ? 1 : -1));
        if (Math.abs(d) < 90) { out.vWant = clamp(d * 1.5, -60, 60); }
        out.dWhy = out.dWhy === 'pace' ? 'scoop' : out.dWhy;
        if (Math.abs(d) < 120) { out.uWant = clamp(d, -S.uMax, S.uMax); out.pWhy = 'scoop'; }
      }
    }
    if (out.duck && out.pWhy === 'catch') out.duck = best && best.t > 0.6;
    return out;
  }

  /* ---------- camera and mirror ---------- */
  function cam(st, dt) {
    const car = st.car, c = st.c;
    let tx = car.s - W * S.camLead + clamp(car.v * 0.4, -40, 110);
    if (st.state === 'end') tx = c.end.x - W * 0.55;
    tx = clamp(tx, c.x0, c.len - W);
    st.cam.x += (tx - st.cam.x) * Math.min(1, dt * 3);
    if (car.s + S.front + 30 - st.cam.x > W - 10) st.cam.x = car.s + S.front + 30 - (W - 10);
    if (car.s + S.back - 30 - st.cam.x < 0) st.cam.x = car.s + S.back - 30;
  }
  function mirror(st) {
    const cx = st.cam.x, cy = carY(st);
    K.place(st.drive, st.car.s + 18 - cx, cy - 26);
    K.place(st.pop, roofX(st) + st.pp.u - cx, cy - S.roofH - (st.pp.duck ? 0 : 16));
  }

  /* ---------- drawing ---------- */
  const LOOK = {
    midway: { skyT: '#ff9a7a', skyB: '#ffe0a8', far: '#c9708a', ground: '#d9b47a', path: '#e8c88e', pathD: '#c9a46a' },
    carousel: { skyT: '#8a7aff', skyB: '#ffc8d8', far: '#a86aa8', ground: '#c9a46a', path: '#e2c28a', pathD: '#bf9a62' },
    funhouse: { skyT: '#5a4aa8', skyB: '#ff9ac0', far: '#7a4a8a', ground: '#b8946a', path: '#d8b882', pathD: '#b08c5a' },
    bigtop: { skyT: '#2a2050', skyB: '#ff8a6a', far: '#5a3060', ground: '#b08a5a', path: '#d0ae78', pathD: '#a8844e' },
  };
  function draw(st) {
    const lk = LOOK[st.look] || LOOK.midway, cx = st.cam.x, t = G.clock;
    const g = ctx.createLinearGradient(0, 0, 0, S.road);
    g.addColorStop(0, lk.skyT); g.addColorStop(1, lk.skyB);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // far: a ferris wheel and tents (slow parallax)
    const far = cx * 0.15;
    for (let i = -1; i < 4; i++) {
      const n = Math.floor(far / 520) + i, x = n * 520 - far + 160;
      if (n % 2 === 0) ferris(x, 250, 110, t * 0.3 + n);
      else K.tent(x, 330, 220, 170, n % 4 === 1 ? ['#e8443a', '#fff4e6'] : ['#5b95ff', '#fff4e6']);
    }
    ctx.fillStyle = lk.far; ctx.globalAlpha = 0.35; ctx.fillRect(0, 300, W, S.road - 300); ctx.globalAlpha = 1;
    // near booths (mid parallax)
    const mid = cx * 0.5;
    for (let i = -1; i < 5; i++) {
      const n = Math.floor(mid / 300) + i, x = n * 300 - mid;
      booth(x + 40, S.road - 46, n);
    }
    K.bunting(-20, 120, W + 20, 140, 18, 30);
    // the road
    ctx.fillStyle = lk.ground; ctx.fillRect(0, S.road - 10, W, H - S.road + 10);
    ctx.fillStyle = lk.path; ctx.fillRect(0, S.road - 12, W, 28);
    ctx.fillStyle = lk.pathD; for (let x = -((cx) % 60); x < W; x += 60) ctx.fillRect(x, S.road + 4, 30, 3);
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    for (const s of st.c.signs) if (s.x > cx - 200 && s.x < cx + W + 200) drawSign(s);
    for (const sd of st.c.stands) if (sd.x > cx - 120 && sd.x < cx + W + 120) drawStand(st, sd);
    for (const b of st.c.banners) if (b.x > cx - 120 && b.x < cx + W + 120) drawBanner(b);
    for (const pi of st.c.pies) if (pi.x > cx - 60 && pi.x < cx + W + 60) drawPie(pi);
    for (const a of st.c.animals) if (a.x > cx - 160 && a.x < cx + W + 160) drawAnimal(a, t);
    if (st.c.end) drawTent(st.c.end.x, false);
    ctx.restore();
  }
  function ferris(x, y, R, a) {
    ctx.strokeStyle = 'rgba(255,240,220,0.55)'; ctx.lineWidth = 3;
    circle(x, y, R); ctx.stroke();
    for (let i = 0; i < 8; i++) { const b = a + i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(b) * R, y + Math.sin(b) * R); ctx.stroke(); ctx.fillStyle = ['#ff6b8a', '#ffc53d', '#5b95ff', '#8fe3b0'][i % 4]; rr(x + Math.cos(b) * R - 8, y + Math.sin(b) * R, 16, 12, 3); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 50, y + R + 70); ctx.moveTo(x, y); ctx.lineTo(x + 50, y + R + 70); ctx.stroke();
  }
  function booth(x, y, n) {
    const cols = [['#ff5f6d', '#fff4e6'], ['#5b95ff', '#fff4e6'], ['#8fe3b0', '#fff4e6'], ['#ffc53d', '#fff4e6']][((n % 4) + 4) % 4];
    ctx.fillStyle = '#8a5a3a'; ctx.fillRect(x, y - 70, 120, 70);
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(x + 10, y - 50, 100, 30);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i % 2]; ctx.beginPath(); ctx.moveTo(x - 6 + i * 22, y - 70); ctx.lineTo(x + 16 + i * 22, y - 70); ctx.lineTo(x + 16 + i * 22, y - 92); ctx.lineTo(x - 6 + i * 22, y - 92); ctx.fill(); }
    for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i % 2]; ctx.beginPath(); ctx.arc(x + 5 + i * 22, y - 70, 11, 0, Math.PI); ctx.fill(); }
    const prize = ((n * 7) % 3 + 3) % 3;
    ctx.fillStyle = ['#ff9fd0', '#9fe8ff', '#ffd36b'][prize]; circle(x + 30, y - 38, 8); ctx.fill(); circle(x + 60, y - 38, 8); ctx.fill(); circle(x + 90, y - 38, 8); ctx.fill();
  }
  function drawSign(s) {
    ctx.fillStyle = '#7a4a2a'; ctx.fillRect(s.x - 3, S.road - 90, 6, 80);
    ctx.font = FONT(14);
    const w = ctx.measureText(s.text).width + 20;
    ctx.fillStyle = s.warn ? '#ffd23d' : '#fff4e6'; rr(s.x - w / 2, S.road - 124, w, 34, 8); ctx.fill();
    ctx.strokeStyle = s.warn ? '#a8781a' : '#8a5a3a'; ctx.lineWidth = 2; rr(s.x - w / 2, S.road - 124, w, 34, 8); ctx.stroke();
    text(s.text, s.x, S.road - 106.5, 14, C.ink, 'center', 'body');
  }
  function drawStand(st, sd) {
    // a little trampoline and the clowns still waiting on it
    ctx.fillStyle = '#5a5a7a'; ctx.fillRect(sd.x - 30, S.road - 30, 4, 22); ctx.fillRect(sd.x + 26, S.road - 30, 4, 22);
    ctx.fillStyle = '#3a3a5a'; rr(sd.x - 34, S.road - 34, 68, 8, 4); ctx.fill();
    for (let k = 0; k < sd.left; k++) drawClown(sd.x - 18 + k * 14 - (sd.left - 1) * 2, S.road - 34 - Math.abs(Math.sin(G.clock * 6 + k)) * 10, 0.8, k % 4, 0, true);
  }
  function drawClown(x, y, s, look, rot, wave) {
    const suit = ['#ff5f6d', '#5bb8ff', '#8fe36b', '#c88dff'][look], hair = ['#ff9a3d', '#ff5fc0', '#3dd0ff', '#ffd23d'][look];
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = suit; rr(-11, -22, 22, 22, 7); ctx.fill();
    ctx.fillStyle = '#ffffff'; for (const [dx, dy] of [[-5, -15], [5, -8], [-3, -5]]) { circle(dx, dy, 2.4); ctx.fill(); }
    ctx.fillStyle = '#c03030'; rr(-13, -3, 11, 6, 3); ctx.fill(); rr(2, -3, 11, 6, 3); ctx.fill();
    ctx.fillStyle = hair; circle(-10, -32, 7); ctx.fill(); circle(10, -32, 7); ctx.fill();
    ctx.fillStyle = '#fff6ee'; circle(0, -32, 10); ctx.fill();
    ctx.fillStyle = '#ff3a3a'; circle(0, -31, 3.5); ctx.fill();
    ctx.fillStyle = C.ink; circle(-4, -35, 1.6); ctx.fill(); circle(4, -35, 1.6); ctx.fill();
    ctx.strokeStyle = '#ff3a3a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -29, 5, 0.3, Math.PI - 0.3); ctx.stroke();
    if (wave) { ctx.strokeStyle = suit; ctx.lineWidth = 4; ctx.lineCap = 'round'; const a = Math.sin(G.clock * 10) * 0.4; ctx.beginPath(); ctx.moveTo(10, -18); ctx.lineTo(18 + Math.sin(a) * 4, -30); ctx.stroke(); }
    ctx.restore();
  }
  function drawBanner(b) {
    const y = S.road - S.roofH - 58;
    ctx.fillStyle = '#c9b39a'; ctx.fillRect(b.x - 4, y - 40, 6, S.road - y + 40); ctx.fillRect(b.x + 60, y - 40, 6, S.road - y + 40);
    ctx.fillStyle = b.hit ? '#ffb0a0' : '#ff5f6d'; rr(b.x - 10, y - 18, 86, 26, 6); ctx.fill();
    text('CIRCUS', b.x + 33, y - 4.5, 14, '#fff4e6', 'center');
    ctx.save(); ctx.translate(-0, 0); K.bunting(b.x - 4, y + 8, b.x + 66, y + 8, 4, 5); ctx.restore();
  }
  function drawPie(pi) {
    if (pi.st === 'splat') { ctx.fillStyle = pi.kind === 'pie' ? '#fff6e0' : '#ffe14a'; ctx.beginPath(); ctx.ellipse(pi.x, S.road - 1, 26, 5, 0, 0, Math.PI * 2); ctx.fill(); return; }
    if (pi.kind === 'pie') {
      ctx.fillStyle = '#d9a05a'; ctx.beginPath(); ctx.ellipse(pi.x, S.road - 4, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff6e0'; ctx.beginPath(); ctx.ellipse(pi.x, S.road - 9, 15, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff3a5a'; circle(pi.x, S.road - 15, 3); ctx.fill();
    } else {
      ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.ellipse(pi.x, S.road - 4, 16, 4, 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c9a020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pi.x - 14, S.road - 4); ctx.lineTo(pi.x - 22, S.road - 12); ctx.moveTo(pi.x + 12, S.road - 4); ctx.lineTo(pi.x + 20, S.road - 10); ctx.stroke();
    }
  }
  function drawAnimal(a, t) {
    const y = S.road - a.y, x = a.x, bob = a.st === 'off' ? Math.abs(Math.sin(t * 14)) * 4 : Math.abs(Math.sin(t * 3 + x)) * 2;
    ctx.save(); ctx.translate(x, y - bob); if (a.st === 'off') { ctx.globalAlpha = clamp(1 - a.t / 1.4, 0, 1); ctx.scale(a.dir, 1); }
    if (a.kind === 'duck') {
      for (let k = 0; k < 3; k++) {
        const dx = -18 + k * 18, s = k === 0 ? 1 : 0.7;
        ctx.fillStyle = k === 0 ? '#ffffff' : '#ffe14a'; ctx.beginPath(); ctx.ellipse(dx, -10 * s, 11 * s, 8 * s, 0, 0, Math.PI * 2); ctx.fill();
        circle(dx - 7 * s, -20 * s, 6 * s); ctx.fill();
        ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.moveTo(dx - 12 * s, -20 * s); ctx.lineTo(dx - 19 * s, -18 * s); ctx.lineTo(dx - 12 * s, -16 * s); ctx.fill();
        ctx.fillStyle = C.ink; circle(dx - 8 * s, -22 * s, 1.3); ctx.fill();
      }
    } else if (a.kind === 'poodle') {
      ctx.fillStyle = '#ffc8e0';
      for (const [dx, dy, r] of [[0, -18, 12], [-14, -30, 9], [14, -22, 6], [-12, -6, 5], [8, -6, 5], [-20, -36, 5]]) { circle(dx, dy, r); ctx.fill(); }
      ctx.fillStyle = C.ink; circle(-17, -32, 1.5); ctx.fill();
      ctx.fillStyle = '#ff5fa0'; rr(-10, -26, 10, 4, 2); ctx.fill();
    } else if (a.kind === 'seal') {
      ctx.fillStyle = '#6a7a9a'; ctx.beginPath(); ctx.ellipse(0, -14, 26, 14, -0.2, 0, Math.PI * 2); ctx.fill();
      circle(-20, -30, 11); ctx.fill();
      ctx.fillStyle = C.ink; circle(-24, -33, 1.6); ctx.fill(); circle(-29, -28, 2.2); ctx.fill();
      ctx.fillStyle = ['#ff5f6d', '#ffc53d', '#5b95ff'][Math.floor(t * 2) % 3]; circle(-20, -50 - Math.abs(Math.sin(t * 5)) * 10, 9); ctx.fill();
    } else {
      // the elephant (big, grey, with a little hat)
      ctx.fillStyle = '#9aa0b8'; ctx.beginPath(); ctx.ellipse(10, -48, 50, 36, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-20, -30, 16, 30); ctx.fillRect(20, -30, 16, 30); ctx.fillRect(40, -30, 14, 30);
      circle(-38, -62, 26); ctx.fill();
      ctx.strokeStyle = '#9aa0b8'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-56, -56); ctx.quadraticCurveTo(-72, -30, -62, -14 - Math.sin(t * 3) * 6); ctx.stroke();
      ctx.fillStyle = '#b8bed2'; ctx.beginPath(); ctx.ellipse(-22, -64, 14, 20, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink; circle(-44, -68, 2.2); ctx.fill();
      ctx.fillStyle = '#ff5f6d'; ctx.beginPath(); ctx.moveTo(-50, -84); ctx.lineTo(-30, -84); ctx.lineTo(-40, -106); ctx.fill();
    }
    ctx.restore();
    if (a.st === 'road' && a.honks > 0) text('!', x, y - 70, 20, C.gold, 'center');
  }
  function drawTent(x, front) {
    if (front) return;
    K.tent(x + 40, S.road, 300, 240, ['#e8443a', '#fff4e6']);
    text('PIT STOP', x + 40, S.road - 120, 22, '#ffffff', 'center');
  }
  function drawCar(st) {
    const car = st.car, x = car.s, y = carY(st), pp = st.pp;
    ctx.save(); ctx.translate(x, y);
    if (car.spin > 0) ctx.rotate(Math.sin(car.spinA) * 0.18);
    // the popper (behind the car body)
    {
      const id = st.pop, up = pp.duck ? 0 : 1;
      const px = S.hatch + pp.u, py = -S.roofH + 20 - up * 22;
      ctx.save(); ctx.beginPath(); ctx.rect(-100, -200, 200, 200 - S.roofH + 4); ctx.clip();
      K.hero(id, px, py + 8, { face: pp.face, stun: pp.dizzy > 0, sy: pp.honkT > 0 ? 1.1 : 1 });
      if (up && pp.dizzy <= 0) {
        ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(px - 8, py - 12); ctx.lineTo(px - 13, py - 30); ctx.moveTo(px + 8, py - 12); ctx.lineTo(px + 13, py - 30); ctx.stroke();
      }
      ctx.restore();
      // the big horn on the roof
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(14, -S.roofH - 2); ctx.lineTo(34, -S.roofH - 14 - (pp.honkT > 0 ? 4 : 0)); ctx.lineTo(34, -S.roofH + 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff5f6d'; circle(12, -S.roofH - 2, 6); ctx.fill();
    }
    // the body: a tiny yellow car with red fenders
    ctx.fillStyle = '#ffd23d'; ctx.strokeStyle = '#a87a10'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(S.back, -18); ctx.lineTo(S.back + 6, -S.roofH + 10); ctx.quadraticCurveTo(-20, -S.roofH - 4, 26, -S.roofH + 6); ctx.lineTo(S.front - 6, -38); ctx.lineTo(S.front + 6, -34); ctx.lineTo(S.front + 6, -18); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a3a5a'; rr(-24, -S.roofH + 4, 8, 6, 2); ctx.fill();
    ctx.fillStyle = '#ff5fa0'; for (const [dx, dy] of [[-40, -30], [-10, -24], [30, -28]]) { circle(dx, dy, 4); ctx.fill(); }
    // the window and the driver
    ctx.fillStyle = 'rgba(190,230,255,0.9)'; rr(6, -S.roofH + 10, 28, 24, 6); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(6, -S.roofH + 10, 28, 24); ctx.clip();
    K.hero(st.drive, 20, -S.roofH + 44, { face: 1, s: 0.85 });
    ctx.restore();
    ctx.fillStyle = '#ff5f6d'; for (const wx of [S.back + 18, S.front - 14]) { ctx.beginPath(); ctx.arc(wx, -16, 22, Math.PI, 0); ctx.fill(); }
    for (const wx of [S.back + 18, S.front - 14]) {
      ctx.save(); ctx.translate(wx, -S.wheelR + 1); ctx.rotate(car.wheel);
      ctx.fillStyle = '#2a2a3a'; circle(0, 0, S.wheelR); ctx.fill();
      ctx.fillStyle = '#ffffff'; circle(0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff5f6d'; for (let k = 0; k < 4; k++) { ctx.fillRect(-1.5, -S.wheelR + 3, 3, 6); ctx.rotate(Math.PI / 2); }
      ctx.restore();
    }
    // clowns crammed in the back window
    const n = Math.min(st.inCar, 5);
    for (let k = 0; k < n; k++) { ctx.fillStyle = ['#ff9a3d', '#ff5fc0', '#3dd0ff', '#ffd23d'][k % 4]; circle(S.back + 18 + k * 9, -S.roofH + 18 - (k % 2) * 4, 5); ctx.fill(); ctx.fillStyle = '#fff6ee'; circle(S.back + 18 + k * 9, -S.roofH + 22 - (k % 2) * 4, 4); ctx.fill(); }
    if (st.gold.bumpers) { ctx.fillStyle = C.gold; rr(S.front, -30, 10, 18, 4); ctx.fill(); rr(S.back - 8, -30, 10, 18, 4); ctx.fill(); }
    ctx.restore();
    // a shadow when hopping
    if (car.hopY > 2) { ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(x - 6, S.road, 60 - car.hopY * 0.2, 5, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  function drawTop(st) {
    const cx = st.cam.x;
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    drawCar(st);
    for (const cl of st.flying) {
      if (cl.st === 'in') continue;
      ctx.globalAlpha = cl.st === 'gone' ? clamp(1 - cl.t, 0, 1) : cl.st === 'wait' && cl.t > S.waitT - 2 ? (Math.sin(G.clock * 14) > 0 ? 1 : 0.4) : 1;
      drawClown(cl.x, cl.y + 18, 1, cl.look, cl.st === 'fly' || cl.st === 'drop' ? Math.sin(cl.rot) * 0.4 : 0, cl.st === 'wait' || cl.st === 'out');
      ctx.globalAlpha = 1;
    }
    for (const b of st.c.banners) if (b.x > cx - 120 && b.x < cx + W + 120) { /* the banner cloth in front of the popper */ }
    K.drawParts(st, cx);
    ctx.restore();
    K.drawPops(st, cx, 0);
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = st.caught + ' / ' + st.totalAll;
      ctx.font = FONT(fs);
      const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.4;
      const w = tw + fs + icon + nw + 34, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      drawClown(x0 + 15 + tw + fs + icon / 2, cy + fs * 0.75, fs / 30, 0, 0, false);
      text(n, x0 + 15 + tw + fs + icon + 4, cy, fs, '#ffffff', 'left', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: 'Taking a break... press anything to drive on', col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play) return;
    const pl = plan(st), car = st.car, pp = st.pp, D = st.drive, R = st.pop;
    {
      const b = K.panel(D, 'driver', 236, 58, z), cy = b.y + 27 * z, chh = 23 * z, qt = K.quiet(D);
      const gx = b.x + 12 * z, gw = b.w * 0.56, v = Math.max(0, car.v);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(gx, cy, gw, chh, chh / 2); ctx.fill();
      ctx.fillStyle = Math.abs(car.v - st.c.pace) < 30 ? '#8fe3b0' : '#9fd0ff';
      const fw = (gw - 4) * clamp(v / S.vMax, 0, 1);
      if (fw > 2) { rr(gx + 2, cy + 2, Math.max(chh - 4, fw), chh - 4, (chh - 4) / 2); ctx.fill(); }
      const pm = gx + 2 + (gw - 4) * st.c.pace / S.vMax; ctx.fillStyle = C.gold; ctx.fillRect(pm - 2, cy - 3, 4, chh + 6);
      const lab = (qt ? '' : K.key(D, 'right') + ' ') + 'GAS';
      ctx.font = FONT(Math.round(11 * z)); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(28,26,54,0.95)'; ctx.lineWidth = 3.5 * z; ctx.strokeText(lab, gx + 9 * z, cy + chh / 2 + 0.5); ctx.fillStyle = '#fff'; ctx.fillText(lab, gx + 9 * z, cy + chh / 2 + 0.5);
      K.chip(gx + gw + 6 * z, cy, b.x + b.w - 12 * z - gx - gw - 6 * z, chh, (qt ? '' : K.key(D, 'up') + ' ') + 'HOP', pl.dWhy === 'pie' && pl.pie && pl.pie.x - car.s - S.front < 180, car.air, z);
    }
    {
      const b = K.panel(R, 'popper', 236, 58, z), cy = b.y + 27 * z, chh = 23 * z, qt = K.quiet(R), cw = (b.w - 24 * z - 12 * z) / 3;
      K.chip(b.x + 12 * z, cy, cw, chh, (qt ? '' : K.key(R, 'lr') + ' ') + 'LEAN', pl.pWhy === 'catch' && Math.abs(pl.uWant - pp.u) > 12, false, z);
      K.chip(b.x + 12 * z + cw + 6 * z, cy, cw, chh, (qt ? '' : K.key(R, 'down') + ' ') + 'DUCK', pl.duck && !pp.duck, pp.duck, z);
      K.chip(b.x + 12 * z + 2 * (cw + 6 * z), cy, cw, chh, (qt ? '' : K.key(R, 'act') + ' ') + 'HONK', pl.honk, pp.honkT > 0, z);
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st), cx = st.cam.x;
    {
      let s = null, col = C.gold, pulse = false;
      const dv = pl.vWant - car.v;
      if (pl.dWhy === 'pie' && pl.pie && pl.pie.x - car.s - S.front < 200 && pl.pie.x - car.s - S.front > 0) { s = 'Hop over it! ' + K.key(D, 'up'); pulse = pl.hop; }
      else if (pl.dWhy === 'animal' && dv < -20) s = 'Slow down ' + K.key(D, 'left') + ' (honk first!)';
      else if (pl.dWhy === 'scoop' && Math.abs(car.v) > 100) s = 'Slow down to scoop up the clown ' + K.key(D, 'left');
      else if (dv > 50) { s = 'Faster! ' + K.key(D, 'right'); col = '#ffe7a8'; }
      else if (dv < -60) { s = 'A bit slower ' + K.key(D, 'left'); col = '#ffe7a8'; }
      P.say(D, s, car.s + 40 - cx, carY(st) - 30, col, pulse);
    }
    {
      let s = null, col = C.gold, pulse = false;
      const du = pl.uWant - pp.u, ar = du < -10 ? K.key(R, 'left') : du > 10 ? K.key(R, 'right') : '';
      if (pp.dizzy > 0) { s = 'Dizzy...'; col = '#ffe7a8'; }
      else if (pl.duck && !pp.duck) { s = 'Duck! ' + K.key(R, 'down'); pulse = true; }
      else if (pp.duck && !pl.duck) { s = 'Pop up! Let go of ' + K.key(R, 'down'); }
      else if (pl.honk) { s = 'Honk! ' + K.key(R, 'act'); pulse = true; }
      else if (pl.pWhy === 'catch' && ar) s = 'Catch the clown! ' + ar;
      else if (pl.pWhy === 'catch') { s = 'Right there!'; col = '#d9ffd0'; }
      else if (pl.pWhy === 'scoop' && ar) s = 'Lean over it! ' + ar;
      P.say(R, s, roofX(st) - 40 - cx, handsY(st) - 40, col, pulse);
    }
  }
  const medal = (t, frac, bonks) => (t <= 210 && frac >= 0.75 && bonks <= 4 ? 'Gold' : t <= 330 && frac >= 0.5 ? 'Silver' : 'Bronze');

  MODES.clowncar = {
    medals: { bronze: 'Get the clown car to the big top', goals: [{ key: 'time', gold: 210, silver: 330 }, { key: 'clowns', gold: 0.75, silver: 0.5, more: true, pct: true, word: 'the clowns' }, { key: 'bonks', gold: 4, word: 'bonk' }] },
    medalValues() { const st = G.mst; return st.stats ? { clowns: st.caught / (st.totalAll || 1), bonks: st.stats.bonks } : {}; },
    S, compile, plan, medal, roofX, handsY,
    setup(st, L) {
      st.stats = { caught: 0, scooped: 0, missed: 0, lost: 0, bonks: 0, honks: 0, shooed: 0, hopped: 0, ducked: 0, helps: 0, roomT: [] };
      st.caught = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.pile = 0;
      const def = LEVELS[G.levelIndex];
      st.totalAll = (def.rooms || [def]).reduce((n, r) => n + compile(Object.assign({}, def, r)).total, 0);
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; st.pile = 0; st.saidN = false; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.c) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.c) drawTop(st); },
    hud() { const st = G.mst; if (st.c) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const all = st.totalAll || 1, frac = st.caught / all;
      const out = [
        { label: 'Clowns', value: st.caught + ' of ' + all },
        { label: 'Bonks', value: String(s.bonks) },
        { label: 'Animals shooed', value: String(s.shooed) },
      ];
      out.push((frac >= 0.85 ? 'A car stuffed full of clowns. The show can start!' : frac >= 0.6 ? 'Most of the clowns made it to the show!' : 'You got the clown car to the big top!') + ' Pies hopped: ' + s.hopped + ', banners ducked: ' + s.ducked + '.');
      if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
      return out;
    },
  };

  /* ---------- sounds ---------- */
  Sfx.extra.clowncarHonk = function (p) { this.tone(260 * p, 0.12, 'square', 0.045, 200 * p); this.tone(330 * p, 0.16, 'square', 0.04, 250 * p, 0.12); };
  Sfx.extra.clowncarHop = function (p) { this.tone(260 * p, 0.18, 'sine', 0.05, 620 * p); };
  Sfx.extra.clowncarLand = function () { this.tone(140, 0.08, 'triangle', 0.04, 100); };
  Sfx.extra.clowncarBoing = function () { this.tone(200, 0.25, 'sine', 0.04, 520); };
  Sfx.extra.clowncarCatch = function (p) { this.tone(520 * p, 0.06, 'triangle', 0.05); this.tone(780 * p, 0.09, 'triangle', 0.045, null, 0.05); this.tone(300, 0.1, 'square', 0.02, 240, 0.1); };
  Sfx.extra.clowncarBonk = function () { this.tone(120, 0.16, 'sine', 0.08, 70); this.tone(900, 0.06, 'square', 0.015, 600, 0.02); };
  Sfx.extra.clowncarBonkHead = function () { this.tone(700, 0.1, 'triangle', 0.04, 300); };
  Sfx.extra.clowncarAnimal = function (k) { const f = { duck: 600, poodle: 900, seal: 300, elephant: 140 }[k] || 400; this.tone(f, 0.12, 'sawtooth', 0.025, f * 0.8); this.tone(f * 1.1, 0.12, 'sawtooth', 0.025, f * 0.8, 0.14); };
  Sfx.extra.clowncarHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
  Sfx.extra.clowncarArrive = function () { [392, 523, 659].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.08)); };
  Sfx.extra.clowncarPop = function () { this.tone(600 + Math.random() * 200, 0.06, 'triangle', 0.035, 900); };
  Sfx.extra.clowncarCheer = function () { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.11, 'triangle', 0.05, null, i * 0.08)); };
})();
