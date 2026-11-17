/* Pip & Bo - Level 34-3 Mead Hall Feast Brawl (team, World 34 Viking Voyage). */
'use strict';

/* ===== 34-3 Mead Hall Feast Brawl (mode 'meadhall', team, one screen, Gavyn's pick) =====
   The crew is home and starving. Fling food and barrels down the long tables to feed the right Vikings before they
   lose patience and start smashing the hall.
   THE HALL (side view, one screen): the kitchen hatch and its food rack on the left (on the floor), three long tables
   at three heights (A low, B middle, C top; each S.tx0-S.tx1, about 570 px), each with 4 seats. At both ends of every
   table there's a serving step (one-way platforms stacked over each other: left S.LL, right S.RL). Jump straight up
   to go up a step; walk off the outer side of a step (or hold ▼ and jump) to go down. Fire pit in the middle, hanging
   shields, the chieftain's chair top right. The mode owns the tick, the picture and the HUD (ownStep + ownHUD + noFalls).
   ACTION (one button, it does the obvious thing):
     - at the rack with empty hands: pick up the nearest food (roast, fish, bread, cheese); a mead barrel sits on the
       floor by the rack when a SKOL is coming. Carrying a barrel is slow and it can't be thrown.
     - on a serving step with food: HOLD to charge, LET GO to slide it down the table. A marker on the table shows where
       it will stop; it stops at the Viking it reaches. Too hard: it flies off the far end (a MESS). The nearest Viking to
       where it stops grabs it whether he wanted it or not.
     - anywhere else with food: tap to TOSS it in an arc to the partner (it homes in; they catch it if their hands are
       free and they're within S.tossMax). With the partner too far it lands on the floor.
     - on a food lying on the floor: pick it up. At the rack with food: put it back (a full rack: swap it with
       the nearest food on the rack).
   ORDERS: each Viking with an order shows a bubble with the food he wants and a patience ring (S.pat per feast). Right
     food: he cheers, +1 FED, and his seat is quiet for a while. Wrong food: he eats it anyway and grumbles (no score,
     patience half back). Patience out: a TANTRUM (he bangs the table and throws his plate): the ROWDY meter goes up.
   ROWDY (shared bar): +S.rowdyTantrum a tantrum, +S.rowdyMess a mess, -S.rowdyFed a right order. Full: "BRAWL!", a 4 s
     dust-cloud brawl wipes the tables, and the feast goes back to two thirds of its Fed (counted). No game over.
   BARRELS and SKOL: from feast 2, a table announces "SKOL!" (S.skolAnn s warning, a barrel appears by the rack), then
     raises its mugs for S.skolUp s. A barrel rolled down that table while the mugs are up fills every one: +1 Fed each.
     Rolled any other time it just knocks plates off (a Mess).
   TEAMWORK BEATS: the CHIEFTAIN'S PLATTER (feast 4, twice): a huge platter on the floor that needs both heroes, one at
     each handle (action to grab); it only moves when both carry it, and only jumps when both press ▲ together (within
     S.pairJump s). Get it up to the top step within S.platterT s: +3 Fed. THE FOOD FIGHT (feast 3 on): a rowdy Viking
     winds up (a red "!") and throws a roast at a hero; hold ▼ to duck, or it knocks the carried food out of your hands.
     THE HALL DOG (feast 3 on): steals any food left on the floor. THE ARM-WRESTLE (feast 3 on): the two middle Vikings
     of a table lock arms and block it; they both want the same food, and each needs it from his own end (the left one
     from the left step, the right one from the right step) within S.wrestleWin s of each other: +2 Fed.
   FEASTS (rooms, roomWord 'Feast'): First Course (tables A and B, three foods), Second Helpings (three tables, all
     foods, barrels and SKOL), The Rowdy Bench (food fight, hall dog, arm-wrestles), The Chieftain's Feast (everything,
     two chieftain platters). A feast ends when its Fed target is met (12, 16, 20, 24).
   GOLD HELP (announced, counted): 3 tantrums in a feast: a gold serving horn, patience drains 40% slower for the rest
     of the feast.
   IDLE: no person presses anything for 12 s: "Taking a break", the hall waits and the clock stops.
   MEDAL (MODES.meadhall.medals, js/medals.js): by time: Gold <= 190 s, Silver <= 330 s.
   MODES.meadhall.plan(st) lists the open orders (most urgent first, with the charge needed from each end), what to
   pick at the rack, where to stand, and the SKOL / wrestle / platter jobs (the prompts, the HUD chips and the computer
   brain read it). Everything lives inside this block; sounds are Sfx.extra.meadhall*. */
(() => {
  const K = VIKING, TAU = Math.PI * 2;
  const S = {
    floor: 462, tables: [{ y: 370, ly: 396 }, { y: 280, ly: 306 }, { y: 190, ly: 216 }],
    LL: [150, 250], RL: [830, 915], tx0: 255, tx1: 825, seats: [345, 475, 605, 735],
    rack: [30, 64, 98], rackY: 432, barrelX: 128, rackEnd: 146,
    acc: 2600, fric: 3000, vmax: 225, barrelV: 135, g: 1900, jumpV: 620, pairV: 150,
    chargeT: 1.1, slideBase: 40, slidePer: 680, seatWin: 65, slideV: 900,
    tossMax: 480, catchR: 70, restock: 0.6,
    rowdyMax: 10, rowdyTantrum: 2, rowdyMess: 1.5, rowdyFed: 0.8, brawlT: 4,
    quietLo: 3.5, quietHi: 6.5, eatT: 1.6, madT: 1.4, goldSlow: 0.6, watchSlow: 0.3, settlePat: 7,
    skolAnn: 4, skolUp: 7, barrelRoll: 520,
    platterT: 12, handle: 28, pairJump: 0.4,
    throwTell: 0.9, throwFly: 0.75, dogV: 300, dogWait: 1.2, sweepT: 8,
    wrestleT: 18, wrestleWin: 2.5,
    idleWait: 12, goldT: 190, silverT: 330,
  };
  const FOODS = {
    roast: { name: 'roast', col: '#b5562a' }, fish: { name: 'fish', col: '#7fb4cc' }, bread: { name: 'bread', col: '#e0a64a' },
    cheese: { name: 'cheese', col: '#ffd84a' }, barrel: { name: 'barrel', col: '#8a5a32' },
  };
  const LEDGES = [];
  for (const side of ['L', 'R']) for (let k = 0; k < 3; k++) LEDGES.push({ id: side + k, side, k, x0: side === 'L' ? S.LL[0] : S.RL[0], x1: side === 'L' ? S.LL[1] : S.RL[1], y: S.tables[k].ly });
  const ledge = id => LEDGES.find(l => l.id === id);
  const endX = side => (side === 'L' ? S.tx0 : S.tx1);
  const sideDir = side => (side === 'L' ? 1 : -1);
  // charge needed for a seat from an end
  const chargeFor = (side, x) => clamp((Math.abs(x - endX(side)) - S.slideBase) / S.slidePer, 0, 1);
  const stopAt = (side, c) => endX(side) + sideDir(side) * (S.slideBase + S.slidePer * c);

  /* ---------- a seeded random (repeatable bot tests) ---------- */
  function rnd(st) { let s = st.seed >>> 0 || 1; s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; st.seed = s; return s / 4294967296; }
  const pick = (st, a) => a[Math.floor(rnd(st) * a.length) % a.length];
  const rr2 = (st, a, b) => a + (b - a) * rnd(st);

  /* ---------- a feast (one room) ---------- */
  function room(st, L, k) {
    const d = L.def;
    st.k = k; st.title = d.title || ''; st.d = d;
    st.target = d.target; st.fed = 0; st.ft = 0; st.foods = d.foods; st.nTables = d.tables;
    st.seats = [];
    for (let t = 0; t < 3; t++) for (let i = 0; i < 4; i++) {
      const n = t * 4 + i;
      st.seats.push({ t, i, x: S.seats[i], state: 'quiet', qt: 0.8 + n * 0.37 % 2.2 + (t >= d.tables ? 99 : 0), food: null, pat: 0, patMax: 1, look: n + k * 5, skol: false, filled: false, mood: 0, react: '', reactT: 0, plate: true });
    }
    st.rack = [null, null, null]; st.barrel = null; st.restockT = 0.3;
    st.fly = []; st.floorItems = []; st.slides = [];
    st.h = [0, 1].map(id => ({ id, x: id === 0 ? 70 : 190, y: S.floor, vx: 0, vy: 0, ground: 'floor', face: 1, carry: null, charge: 0, charging: false, duck: false, stun: 0, dropT: 0, handle: null, jreq: 0, sq: 0, catchT: 0 }));
    st.rowdy = 0; st.brawl = 0; st.tantrums = 0; st.gold = false;
    st.skol = null; st.skolAt = (d.skol || []).slice(); st.wrestle = null; st.wrestleAt = (d.wrestle || []).slice();
    st.platter = null; st.platterAt = (d.platter || []).slice(); st.fight = null; st.fightT = 6 + rnd(st) * 3;
    st.dog = d.dog ? { x: 600, state: 'nap', item: null, t: 0, face: -1 } : null;
    st.state = 'go'; st.endT = 0; st.party = false; st.cleared = false; st.lastRoom = k === 3;
    st.rc = { tantrums: 0 }; st.itemN = st.itemN || 0;
    K.fx(st); labels(st); mirror(st);
  }
  function labels(st) { K.actLabels(['serve', 'serve'], 'serve'); }
  const item = (st, k) => ({ k, n: ++st.itemN });

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.h) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    if (live) {
      st.ft += dt;
      if (st.brawl > 0) brawlStep(st, dt);
      else {
        for (const h of st.h) hero(st, h, dt);
        platterStep(st, dt);
        seatsStep(st, dt);
        rackStep(st, dt);
        events(st, dt);
      }
      flyStep(st, dt); slideStep(st, dt); floorStep(st, dt); dogStep(st, dt);
      if (st.fed >= st.target && st.state === 'go') finish(st);
    } else if (st.state === 'done') doneStep(st, dt);
    for (const h of st.h) { if (h.sq > 0) h.sq = Math.max(0, h.sq - dt * 3); if (h.catchT > 0) h.catchT -= dt; }
    for (const s of st.seats) if (s.reactT > 0) s.reactT -= dt;
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    K.tickFx(st, dt);
    mirror(st);
  }
  function mirror(st) {
    for (const h of st.h) K.place(h.id, h.x, h.y);
    st.run = st.h.map(h => ({ x: h.x + st.fed * 40, y: h.y }));
  }

  /* ---------- the heroes ---------- */
  const onLedge = h => (h.ground && h.ground !== 'floor' ? ledge(h.ground) : null);
  const atRack = h => h.ground === 'floor' && h.x <= S.rackEnd;
  // the serving step a hero stands on, if its table is open
  const servingAt = (st, h) => { const l = onLedge(h); return l && l.k < st.nTables ? l : null; };
  function hero(st, h, dt) {
    const p = G.players[h.id], i = p.input;
    if (h.handle !== null) { if (p.pendingJump) h.jreq = S.pairJump; if (h.jreq > 0) h.jreq -= dt; if (p.pendingAct) letGo(st, h); return; }
    if (h.stun > 0) { h.stun -= dt; h.charging = false; physics(st, h, 0, dt); return; }
    if (h.dropT > 0) h.dropT -= dt;
    const grounded = !!h.ground;
    h.duck = !!i.down && grounded && !h.charging;
    let lr = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    if (h.duck || h.charging) lr = 0;
    if (lr) h.face = lr;
    if (p.pendingJump && grounded && !h.charging) {
      if (i.down && h.ground !== 'floor') { h.dropT = 0.22; h.ground = null; h.y += 2; h.vy = 60; }
      else { h.vy = -S.jumpV; h.ground = null; h.sq = 0.6; if (Math.random() < 0.5) Sfx.play('meadhallHop'); }
      h.duck = false;
    }
    // the action
    if (p.pendingAct) action(st, h);
    if (h.charging) {
      if (!h.carry || !servingAt(st, h)) h.charging = false;
      else if (i.act) h.charge = Math.min(1, h.charge + dt / S.chargeT);
      else { slide(st, h); h.charging = false; }
    }
    const vmax = h.carry && h.carry.k === 'barrel' ? S.barrelV : S.vmax;
    physics(st, h, lr * vmax, dt);
  }
  function physics(st, h, want, dt) {
    const a = want ? S.acc : S.fric;
    h.vx = approach(h.vx, want, a * dt);
    const l = onLedge(h);
    let x = h.x + h.vx * dt;
    // the table end is a wall for someone on a serving step (the table runs on from there)
    if (l) { if (l.side === 'L' && x > l.x1 - 4) { x = l.x1 - 4; h.vx = 0; } if (l.side === 'R' && x < l.x0 + 4) { x = l.x0 + 4; h.vx = 0; } }
    h.x = clamp(x, 14, W - 14);
    if (h.ground) {
      if (l && (h.x < l.x0 - 2 || h.x > l.x1 + 2)) { h.ground = null; h.vy = 0; }
      else { h.vy = 0; return; }
    }
    const y0 = h.y;
    h.vy += S.g * dt; h.y += h.vy * dt;
    if (h.vy >= 0) {
      if (h.y >= S.floor) { h.y = S.floor; h.vy = 0; h.ground = 'floor'; h.sq = 0.5; return; }
      if (h.dropT <= 0) for (const L2 of LEDGES) if (h.x >= L2.x0 - 2 && h.x <= L2.x1 + 2 && y0 <= L2.y + 0.5 && h.y >= L2.y) { h.y = L2.y; h.vy = 0; h.ground = L2.id; h.sq = 0.5; return; }
    }
  }
  function action(st, h) {
    // the chieftain's platter: grab a free handle
    const pt = st.platter;
    if (pt && pt.state === 'floor' && h.ground === pt.ground) {
      for (const k of [0, 1]) if (pt.held[k] === null && Math.abs(h.x - (pt.x + (k ? S.handle : -S.handle))) < 24) {
        if (h.carry) { drop(st, h.carry, h.x - h.face * 20, h.y - 30); h.carry = null; } // put down what you carry
        grab(st, h, k); return;
      }
    }
    const serve = servingAt(st, h);
    if (h.carry && serve) { h.charging = true; h.charge = 0; Sfx.play('meadhallCharge'); return; }
    if (h.carry && onLedge(h) && !serve) { K.pop(st, h.x, h.y - 60, 'Nobody sits here yet!', '#ffe7a8', 15); return; }
    if (h.carry && atRack(h)) { putBack(st, h); return; }
    if (h.carry) { toss(st, h); return; }
    // empty hands: food on the floor, then the rack
    const fl = st.floorItems.filter(f => f.land && Math.abs(f.x - h.x) < 34 && h.ground === 'floor').sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
    if (fl) { st.floorItems.splice(st.floorItems.indexOf(fl), 1); h.carry = fl.item; Sfx.play('meadhallPick'); return; }
    if (atRack(h)) {
      let best = -1, bd = 1e9;
      for (let k = 0; k < 3; k++) if (st.rack[k] && Math.abs(S.rack[k] - h.x) < bd) { bd = Math.abs(S.rack[k] - h.x); best = k; }
      if (st.barrel && Math.abs(S.barrelX - h.x) < bd) { h.carry = st.barrel; st.barrel = null; Sfx.play('meadhallBarrel'); return; }
      if (best >= 0) { h.carry = st.rack[best]; st.rack[best] = null; Sfx.play('meadhallPick'); return; }
      K.pop(st, h.x, h.y - 60, 'Wait for the cook!', '#ffe7a8', 15);
    }
  }
  function putBack(st, h) {
    if (h.carry.k === 'barrel') { if (!st.barrel) { st.barrel = h.carry; h.carry = null; Sfx.play('meadhallBarrel'); } return; }
    const k = st.rack.findIndex(q => !q);
    if (k >= 0) { st.rack[k] = h.carry; h.carry = null; Sfx.play('meadhallPick'); return; }
    // a full rack: swap with the nearest food on it (review: with "The rack is full!" a hero holding a food nobody
    // wanted any more had no way to take the one the cook had just put out; two computers stood there for 15-30 s)
    let best = 0;
    for (let q = 1; q < 3; q++) if (Math.abs(S.rack[q] - h.x) < Math.abs(S.rack[best] - h.x)) best = q;
    const mine = h.carry; h.carry = st.rack[best]; st.rack[best] = mine;
    Sfx.play('meadhallPick'); K.pop(st, h.x, h.y - 60, 'Swapped!', '#ffe7a8', 15);
  }
  function toss(st, h) {
    const it = h.carry;
    if (it.k === 'barrel') { K.pop(st, h.x, h.y - 60, 'Too heavy to throw! Carry it', '#ffe7a8', 15); return; }
    const o = st.h[1 - h.id], d = Math.hypot(o.x - h.x, o.y - h.y);
    h.carry = null; st.stats.tosses++;
    const to = !o.carry && o.handle === null && d < S.tossMax ? o.id : null;
    const tx = to !== null ? o.x : clamp(h.x + h.face * 180, 20, W - 20), ty = to !== null ? o.y - 40 : S.floor;
    st.fly.push({ item: it, to, x0: h.x, y0: h.y - 40, x: h.x, y: h.y - 40, tx, ty, t: 0, T: 0.42 + Math.hypot(tx - h.x, ty - h.y) / 1500, from: h.id });
    Sfx.play('meadhallToss');
  }
  function flyStep(st, dt) {
    for (let i = st.fly.length - 1; i >= 0; i--) {
      const f = st.fly[i];
      f.t += dt;
      if (f.to !== null && f.t < f.T * 0.8) { const o = st.h[f.to]; f.tx = o.x; f.ty = o.y - 40; }
      const u = Math.min(1, f.t / f.T);
      f.x = K.lerp(f.x0, f.tx, u); f.y = K.lerp(f.y0, f.ty, u) - Math.sin(u * Math.PI) * 70;
      if (u < 1) continue;
      st.fly.splice(i, 1);
      const o = f.to !== null ? st.h[f.to] : null;
      if (o && !o.carry && o.handle === null && Math.hypot(o.x - f.x, o.y - 40 - f.y) < S.catchR && o.stun <= 0) { o.carry = f.item; o.catchT = 0.4; st.stats.catches++; Sfx.play('meadhallCatch'); K.pop(st, o.x, o.y - 66, 'Caught!', '#d9ffd0', 15); }
      else drop(st, f.item, f.x, f.y);
    }
  }
  // food falls to the floor (where the hall dog finds it)
  function drop(st, it, x, y) { st.floorItems.push({ item: it, x: clamp(x, 20, W - 20), y, vy: 0, land: false, t: 0 }); }
  function floorStep(st, dt) {
    for (let i = st.floorItems.length - 1; i >= 0; i--) {
      const f = st.floorItems[i];
      if (!f.land) { f.vy += S.g * dt; f.y += f.vy * dt; if (f.y >= S.floor - 6) { f.y = S.floor - 6; f.land = true; Sfx.play('meadhallThud'); } continue; }
      f.t += dt;
      if (!st.dog && f.t > S.sweepT) { st.floorItems.splice(i, 1); K.poof(st, f.x, f.y, 6); }
    }
  }

  /* ---------- sliding down a table ---------- */
  function slide(st, h) {
    const l = servingAt(st, h), it = h.carry, c = h.charge;
    h.carry = null; h.charge = 0;
    const x0 = endX(l.side), dir = sideDir(l.side), t = l.k;
    if (it.k === 'barrel') {
      const sk = st.skol && st.skol.state === 'up' && st.skol.table === t;
      if (!sk) { mess(st, x0 + dir * 120, S.tables[t].y, 'Plates everywhere!'); st.seats.filter(s => s.t === t).forEach(s => { s.plate = false; }); }
      st.slides.push({ item: it, t, dir, x: x0, x0, stop: endX(l.side === 'L' ? 'R' : 'L') + dir * 60, barrel: true, from: h.id, done: false });
      Sfx.play('meadhallRoll');
      return;
    }
    let stop = stopAt(l.side, c);
    const seats = st.seats.filter(s => s.t === t);
    // an arm-wrestle blocks the middle of its table: food stops at the wrestler on this side
    const w = st.wrestle && st.wrestle.table === t ? st.wrestle : null;
    if (w) { const wx = seats[l.side === 'L' ? 1 : 2].x; if (dir > 0 ? stop > wx : stop < wx) stop = wx; }
    let seat = null, bd = S.seatWin + 0.01;
    for (const s of seats) { const d = Math.abs(s.x - stop); if (d < bd) { bd = d; seat = s; } }
    if (!seat) {
      // short of the first seat: the nearest grabs it; past the last: off the end
      const near = seats.slice().sort((a, b) => Math.abs(a.x - stop) - Math.abs(b.x - stop))[0];
      const past = dir > 0 ? stop > near.x : stop < near.x;
      if (past && Math.abs(stop - near.x) > S.seatWin) seat = null; else seat = near;
    }
    st.slides.push({ item: it, t, dir, x: x0, x0, stop: seat ? seat.x - dir * 14 : endX(l.side === 'L' ? 'R' : 'L') + dir * 40, seat, side: l.side, from: h.id, T: 0, done: false });
    Sfx.play('meadhallSlide');
  }
  function slideStep(st, dt) {
    for (let i = st.slides.length - 1; i >= 0; i--) {
      const q = st.slides[i];
      if (q.barrel) {
        q.x += q.dir * S.barrelRoll * dt;
        for (const s of st.seats) if (s.t === q.t && s.skol && !s.filled && (q.dir > 0 ? q.x >= s.x : q.x <= s.x)) {
          s.filled = true; fed(st, s, 1, 'SKOL!'); st.stats.skols++; Sfx.play('meadhallSkol');
        }
        if (q.dir > 0 ? q.x >= q.stop : q.x <= q.stop) { st.slides.splice(i, 1); K.poof(st, q.x, S.tables[q.t].y, 8); Sfx.play('meadhallThud'); }
        continue;
      }
      q.T += dt;
      const D = Math.abs(q.stop - q.x0), T = 0.25 + D / S.slideV, u = Math.min(1, q.T / T);
      q.x = q.x0 + (q.stop - q.x0) * (1 - (1 - u) * (1 - u));
      if (u < 1) continue;
      st.slides.splice(i, 1);
      if (!q.seat) { mess(st, q.x, S.tables[q.t].y - 10, 'Off the end! A mess!'); drop(st, q.item, q.dir > 0 ? 880 : 200, S.tables[q.t].y); continue; }
      serveSeat(st, q.seat, q.item, q.side);
    }
  }
  function serveSeat(st, s, it, side) {
    const x = s.x, y = S.tables[s.t].y;
    if (s.state === 'wrestle') {
      const w = st.wrestle, k = side === 'L' ? 0 : 1;
      if (it.k !== w.food) { wrong(st, s, 'Not ' + FOODS[it.k].name + '!'); return; }
      w.got[k] = w.gotT = S.wrestleWin;
      K.pop(st, x, y - 70, k ? 'Mine! Where\'s his?' : 'Mine! Where\'s his?', '#ffe7a8', 15);
      if (w.got[0] && w.got[1]) wrestleWin(st);
      return;
    }
    if (s.state === 'want' && it.k === s.food) {
      fed(st, s, 1, pick(st, ['SKOL!', 'Yum!', 'Ha ha!', 'More!', 'Tasty!']));
      s.state = 'eat'; s.qt = S.eatT; s.food = null; st.streak++; st.stats.best = Math.max(st.stats.best, st.streak);
      return;
    }
    if (s.state === 'want') { s.pat = Math.min(s.patMax, s.pat + s.patMax / 2); wrong(st, s, 'Not ' + FOODS[it.k].name + '! I wanted ' + FOODS[s.food].name); return; }
    wrong(st, s, 'Thanks? I wasn\'t hungry');
  }
  function fed(st, s, n, say) {
    st.fed += n; st.stats.fed += n; st.rowdy = Math.max(0, st.rowdy - S.rowdyFed * n);
    s.mood = 1; s.react = say; s.reactT = 1.2;
    K.spark(st, s.x, S.tables[s.t].y - 40, 6, ['#ffc53d', '#ffffff']);
    Sfx.play('meadhallYum');
  }
  function wrong(st, s, say) {
    st.stats.wrong++; st.streak = 0; s.mood = -1; s.react = say; s.reactT = 1.6;
    Sfx.play('meadhallGrumble');
  }
  function mess(st, x, y, say) {
    st.stats.messes++; st.streak = 0; rowdy(st, S.rowdyMess);
    K.pop(st, x, y - 30, say, '#ffb0a0', 16); K.dust(st, x, y, '#c8a070', 8); Sfx.play('meadhallCrash');
  }
  function rowdy(st, n) {
    st.rowdy = Math.min(S.rowdyMax, st.rowdy + n);
    if (st.rowdy >= S.rowdyMax && st.brawl <= 0) {
      st.brawl = S.brawlT; st.stats.brawls++; Sfx.play('meadhallBrawl');
      K.msg(st, 'BRAWL! The hall goes wild!', '#ffb0a0', 3.6);
      for (const h of st.h) { if (h.carry) { drop(st, h.carry, h.x, h.y - 40); h.carry = null; } h.charging = false; if (h.handle !== null) letGo(st, h); }
    }
  }
  function brawlStep(st, dt) {
    st.brawl -= dt;
    if (Math.random() < dt * 12) K.dust(st, S.tx0 + Math.random() * (S.tx1 - S.tx0), S.tables[Math.floor(Math.random() * st.nTables)].y - 30, '#d8c0a0', 4);
    if (Math.random() < dt * 3) K.pop(st, 300 + Math.random() * 400, 120 + Math.random() * 250, pick(st, ['BIFF!', 'WHAM!', 'CRASH!', 'OOF!', 'SKOL?!']), '#ffffff', 22);
    if (st.brawl > 0) return;
    st.fed = Math.floor(st.fed * 2 / 3); st.rowdy = 3; st.slides = []; st.platter = null;
    if (st.skol) st.skol = null; if (st.wrestle) endWrestle(st);
    for (const s of st.seats) if (s.t < st.nTables) { s.state = 'quiet'; s.qt = 1 + rnd(st) * 3; s.food = null; s.skol = false; s.plate = true; }
    K.msg(st, 'Peace again. The feast goes on from ' + st.fed + ' fed', '#ffffff', 3);
  }

  /* ---------- the Vikings at the tables ---------- */
  function seatsStep(st, dt) {
    // while an arm-wrestle or the chieftain's platter is on, the hall is watching it: the other orders' patience runs
    // much slower (review: both heroes are tied up for about 10 s by those jobs, and even a perfect pair came out of
    // each one with two or three tantrums it could do nothing about, and Gold help in every run)
    const d = st.d, drain = (st.gold ? S.goldSlow : 1) * (st.wrestle || st.platter ? S.watchSlow : 1);
    let open = 0;
    for (const s of st.seats) {
      if (s.t >= st.nTables) continue;
      if (s.state === 'want') {
        if (!s.skol) s.pat -= dt * drain;
        open++;
        if (s.pat <= 0) tantrum(st, s);
      } else if (s.state === 'eat' || s.state === 'mad') { s.qt -= dt; if (s.qt <= 0) { s.state = 'quiet'; s.qt = rr2(st, S.quietLo, S.quietHi); s.plate = true; s.mood = 0; } }
      else if (s.state === 'quiet') s.qt -= dt;
    }
    // new orders, up to the feast's count at once
    if (open < d.orders) {
      const free = st.seats.filter(s => s.t < st.nTables && s.state === 'quiet' && s.qt <= 0 && !s.skol);
      if (free.length) {
        const s = pick(st, free);
        s.state = 'want'; s.food = pick(st, st.foods); s.patMax = s.pat = rr2(st, d.pat[0], d.pat[1]); s.mood = 0;
        Sfx.play('meadhallOrder');
      }
    }
    if (st.wrestle) wrestleStep(st, dt);
  }
  // after a job that tied both heroes up (an arm-wrestle, the platter, a SKOL), the waiting Vikings get a little of
  // their patience back, so nobody throws a tantrum the moment the heroes are free again
  function settle(st) { for (const s of st.seats) if (s.state === 'want') s.pat = Math.max(s.pat, Math.min(s.patMax, S.settlePat)); }
  function tantrum(st, s) {
    s.state = 'mad'; s.qt = S.madT; s.food = null; s.mood = -2; s.react = pick(st, ['WHERE\'S MY FOOD?!', 'HUNGRY!', 'GRRR!']); s.reactT = 1.6; s.plate = false;
    st.stats.tantrums++; st.tantrums++; st.streak = 0;
    K.part(st, s.x, S.tables[s.t].y - 10, (Math.random() - 0.5) * 200, -260, 1.2, '#e8e0d0', 7, 900, 'dot');
    Sfx.play('meadhallBang');
    rowdy(st, S.rowdyTantrum);
    if (st.tantrums >= 3 && !st.gold && K.both(st)) { st.gold = true; K.goldHelp(st, 'A gold serving horn! The crew waits longer for the rest of this feast'); }
  }

  /* ---------- the kitchen rack ---------- */
  function covered(st) {
    // foods already on their way (carried, flying, sliding) cover the most urgent orders for them
    const have = {};
    const add = it => { if (it) have[it.k] = (have[it.k] || 0) + 1; };
    st.h.forEach(h => add(h.carry)); st.fly.forEach(f => add(f.item)); st.slides.forEach(q => add(q.item));
    return have;
  }
  function rackStep(st, dt) {
    st.restockT -= dt;
    if (st.restockT > 0) return;
    // what the hall still needs: an arm-wrestle's food (twice), then the open orders nobody is bringing yet
    const have = covered(st);
    const need = [];
    if (st.wrestle) for (let k = 0; k < 2; k++) if (!st.wrestle.got[k]) need.push(st.wrestle.food);
    orders(st).forEach(o => need.push(o.food));
    const left = need.filter(f => { if (have[f] > 0) { have[f]--; return false; } return true; });
    const onRack = {};
    st.rack.forEach(it => { if (it) onRack[it.k] = (onRack[it.k] || 0) + 1; });
    const missing = left.filter(f => { if (onRack[f] > 0) { onRack[f]--; return false; } return true; });
    let k = st.rack.findIndex(q => !q);
    if (k < 0) {
      // a full rack with nothing anybody wants on it: the cook swaps one
      if (!missing.length || missing.length < left.length) return;
      const wanted = new Set(left);
      k = st.rack.findIndex(it => !wanted.has(it.k));
      if (k < 0) return;
    }
    st.restockT = S.restock;
    const f = missing.length && rnd(st) < 0.85 ? missing[0] : pick(st, st.foods);
    st.rack[k] = item(st, f);
    Sfx.play('meadhallRack');
  }

  /* ---------- timed events: SKOL, arm-wrestles, the platter, the food fight ---------- */
  function events(st, dt) {
    // SKOL
    if (st.skolAt.length && st.ft >= st.skolAt[0] && !st.skol) {
      st.skolAt.shift();
      const t = Math.floor(rnd(st) * st.nTables);
      st.skol = { table: t, state: 'soon', t: S.skolAnn };
      st.barrel = st.barrel || item(st, 'barrel');
      K.msg(st, 'SKOL coming at table ' + 'ABC'[t] + '! Roll the barrel when the mugs go up', '#ffe7a8', 3.6);
      Sfx.play('vikingHorn');
    }
    if (st.skol) {
      const sk = st.skol;
      sk.t -= dt;
      if (sk.state === 'soon' && sk.t <= 0) { sk.state = 'up'; sk.t = S.skolUp; for (const s of st.seats) if (s.t === sk.table) { s.skol = true; s.filled = false; } Sfx.play('meadhallSkol'); }
      else if (sk.state === 'up' && sk.t <= 0) {
        for (const s of st.seats) s.skol = false;
        st.skol = null; st.barrel = null; settle(st);
      }
    }
    // arm-wrestle
    if (st.wrestleAt.length && st.ft >= st.wrestleAt[0] && !st.wrestle) {
      st.wrestleAt.shift();
      const t = st.nTables - 1 - Math.floor(rnd(st) * 2);
      const a = st.seats[t * 4 + 1], b = st.seats[t * 4 + 2], food = pick(st, st.foods);
      for (const s of [a, b]) { s.state = 'wrestle'; s.food = food; s.mood = 0; }
      st.wrestle = { table: t, food, t: S.wrestleT, got: [0, 0], gotT: 0 };
      K.msg(st, 'Arm-wrestle at table ' + 'ABC'[t] + '! Both want ' + FOODS[food].name + ', one from each end, together!', '#ffe7a8', 4);
      Sfx.play('meadhallBang');
    }
    // the chieftain's platter
    if (st.platterAt.length && st.ft >= st.platterAt[0] && !st.platter) {
      st.platterAt.shift();
      st.platter = { x: 330, y: S.floor, vx: 0, vy: 0, ground: 'floor', t: S.platterT, held: [null, null], state: 'floor' };
      K.msg(st, 'The chieftain\'s platter! Both grab a handle and carry it to the top step', '#ffe7a8', 4);
      Sfx.play('vikingHorn');
    }
    // the food fight
    if (st.d.fight && !st.fight) {
      st.fightT -= dt;
      if (st.fightT <= 0) {
        const targets = st.h.filter(h => h.handle === null);
        const s = pick(st, st.seats.filter(q => q.t < st.nTables && q.state !== 'wrestle'));
        if (targets.length && s) { st.fight = { seat: s, to: pick(st, targets).id, state: 'tell', t: 0, x: s.x, y: S.tables[s.t].y - 40 }; Sfx.play('meadhallWindup'); }
        st.fightT = rr2(st, 7, 10);
      }
    }
    if (st.fight) fightStep(st, dt);
  }
  function wrestleStep(st, dt) {
    const w = st.wrestle;
    w.t -= dt * (st.gold ? S.goldSlow : 1);
    if (w.gotT > 0) { w.gotT -= dt; if (w.gotT <= 0) { w.got = [0, 0]; const s = st.seats[w.table * 4 + 1]; wrong(st, s, 'Together! At the same time!'); } }
    if (w.t <= 0) { const a = st.seats[w.table * 4 + 1], b = st.seats[w.table * 4 + 2]; endWrestle(st); tantrum(st, a); b.state = 'mad'; b.qt = S.madT; }
  }
  function wrestleWin(st) {
    const w = st.wrestle, a = st.seats[w.table * 4 + 1], b = st.seats[w.table * 4 + 2];
    endWrestle(st);
    fed(st, a, 1, 'A TIE!'); fed(st, b, 1, 'SKOL!');
    a.state = b.state = 'eat'; a.qt = b.qt = S.eatT + 1; st.stats.wrestles++; st.streak += 2; st.stats.best = Math.max(st.stats.best, st.streak);
    K.confetti(st, (a.x + b.x) / 2, S.tables[w.table].y - 60, 20);
  }
  function endWrestle(st) {
    const w = st.wrestle; if (!w) return;
    for (const s of [st.seats[w.table * 4 + 1], st.seats[w.table * 4 + 2]]) if (s.state === 'wrestle') { s.state = 'quiet'; s.qt = S.quietLo; s.food = null; }
    st.wrestle = null; settle(st);
  }
  function fightStep(st, dt) {
    const f = st.fight, h = st.h[f.to];
    f.t += dt;
    if (f.state === 'tell') { if (f.t >= S.throwTell) { f.state = 'fly'; f.t = 0; f.x0 = f.x; f.y0 = f.y; Sfx.play('meadhallToss'); } return; }
    const u = Math.min(1, f.t / S.throwFly);
    f.x = K.lerp(f.x0, h.x, u); f.y = K.lerp(f.y0, h.y - 30, u) - Math.sin(u * Math.PI) * 90;
    if (u < 1) return;
    st.fight = null;
    if (h.handle !== null) return;
    if (h.duck) { st.stats.ducks++; K.pop(st, h.x, h.y - 50, 'Ducked!', '#d9ffd0', 16); K.part(st, h.x, h.y - 40, 260 * Math.sign(h.x - f.x0 || 1), -120, 0.8, '#b5562a', 7, 900, 'dot'); return; }
    st.stats.bonks++;
    h.stun = 0.4; h.charging = false; Sfx.play('meadhallBonk');
    if (h.carry) { drop(st, h.carry, h.x, h.y - 40); h.carry = null; K.pop(st, h.x, h.y - 60, 'Knocked it out of your hands!', '#ffb0a0', 15); }
    else K.pop(st, h.x, h.y - 60, 'Bonk!', '#ffb0a0', 16);
  }
  function dogStep(st, dt) {
    const dg = st.dog;
    if (!dg) return;
    dg.t += dt;
    if (dg.state === 'nap') {
      const f = st.floorItems.find(q => q.land && q.t > S.dogWait && !st.h.some(h => h.ground === 'floor' && Math.abs(h.x - q.x) < 40));
      if (f) { dg.state = 'run'; dg.item = f; Sfx.play('meadhallWoof'); }
    } else if (dg.state === 'run') {
      const f = dg.item;
      if (!st.floorItems.includes(f)) { dg.state = 'home'; return; }
      dg.face = Math.sign(f.x - dg.x) || 1; dg.x += dg.face * S.dogV * dt;
      if (Math.abs(f.x - dg.x) < 10) { st.floorItems.splice(st.floorItems.indexOf(f), 1); dg.carry = f.item; dg.state = 'off'; st.stats.dog++; K.pop(st, dg.x, S.floor - 50, 'Woof! Yum!', '#ffffff', 16); }
    } else if (dg.state === 'off') { dg.face = 1; dg.x += S.dogV * dt; if (dg.x > W + 40) { dg.carry = null; dg.state = 'home'; dg.x = W + 40; } }
    else if (dg.state === 'home') { dg.face = Math.sign(600 - dg.x) || -1; dg.x += dg.face * 160 * dt; if (Math.abs(dg.x - 600) < 6) { dg.state = 'nap'; dg.x = 600; } }
  }

  /* ---------- the chieftain's platter ---------- */
  function grab(st, h, k) {
    const pt = st.platter;
    pt.held[k] = h.id; h.handle = k; h.charging = false; h.vx = 0; h.jreq = 0;
    h.x = pt.x + (k ? S.handle : -S.handle); h.y = pt.y; h.face = k ? -1 : 1;
    Sfx.play('meadhallPick');
    if (pt.held[0] !== null && pt.held[1] !== null) { pt.state = 'carry'; K.pop(st, pt.x, pt.y - 70, 'Lift! Now jump together!', '#d9ffd0', 16); }
  }
  function letGo(st, h) {
    const pt = st.platter;
    if (pt && h.handle !== null) { pt.held[h.handle] = null; pt.state = 'floor'; }
    h.handle = null; h.vx = 0;
  }
  function platterStep(st, dt) {
    const pt = st.platter;
    if (!pt) return;
    pt.t -= dt;
    if (pt.t <= 0) {
      for (const h of st.h) if (h.handle !== null) letGo(st, h);
      st.platter = null; st.stats.platterLost++; settle(st);
      K.msg(st, 'Too slow! The chieftain is cross', '#ffb0a0', 3); rowdy(st, 3); Sfx.play('meadhallBang');
      return;
    }
    const A = pt.held[0] !== null ? st.h[pt.held[0]] : null, B = pt.held[1] !== null ? st.h[pt.held[1]] : null;
    if (A && B) {
      const ia = G.players[A.id].input, ib = G.players[B.id].input;
      const lr = (((ia.right ? 1 : 0) - (ia.left ? 1 : 0)) + ((ib.right ? 1 : 0) - (ib.left ? 1 : 0))) / 2;
      pt.vx = approach(pt.vx, lr * S.pairV, S.acc * dt);
      if (pt.ground && A.jreq > 0 && B.jreq > 0) { pt.vy = -S.jumpV; pt.ground = null; A.jreq = B.jreq = 0; Sfx.play('meadhallHop'); }
    } else pt.vx = 0;
    pt.x = clamp(pt.x + pt.vx * dt, 14 + S.handle, W - 14 - S.handle);
    const l = pt.ground && pt.ground !== 'floor' ? ledge(pt.ground) : null;
    if (l && (pt.x < l.x0 + 8 || pt.x > l.x1 - 8)) pt.ground = null;
    if (!pt.ground) {
      const y0 = pt.y;
      pt.vy += S.g * dt; pt.y += pt.vy * dt;
      if (pt.vy >= 0) {
        if (pt.y >= S.floor) { pt.y = S.floor; pt.vy = 0; pt.ground = 'floor'; }
        else for (const L2 of LEDGES) if (pt.x >= L2.x0 + 8 && pt.x <= L2.x1 - 8 && y0 <= L2.y + 0.5 && pt.y >= L2.y) { pt.y = L2.y; pt.vy = 0; pt.ground = L2.id; break; }
      }
    }
    for (const h of [A, B]) if (h) { h.x = pt.x + (h.handle ? S.handle : -S.handle); h.y = pt.y; h.ground = pt.ground; h.vy = pt.vy; }
    // up on a top step: the chieftain's
    if (pt.ground === 'L2' || pt.ground === 'R2') {
      for (const h of st.h) if (h.handle !== null) { h.handle = null; }
      st.platter = null; st.stats.platters++; settle(st);
      st.fed += 3; st.stats.fed += 3; st.rowdy = Math.max(0, st.rowdy - 2);
      K.msg(st, 'The chieftain\'s platter is served! +3 fed', '#d9ffd0', 3); K.confetti(st, 900, 170, 30); Sfx.play('meadhallCheer');
    }
  }

  /* ---------- feast done ---------- */
  function finish(st) {
    st.state = 'done'; st.endT = 0;
    st.stats.feastT.push(+st.ft.toFixed(1));
    for (const h of st.h) { h.charging = false; if (h.handle !== null) h.handle = null; }
    Sfx.play('meadhallCheer');
    K.msg(st, st.lastRoom ? 'The whole hall cheers! The roof shakes!' : (st.d.done || 'Feast done!'), '#d9ffd0', 3.4);
  }
  function doneStep(st, dt) {
    st.endT += dt;
    for (const s of st.seats) if (s.t < st.nTables) s.mood = 1;
    if (st.lastRoom) {
      if (st.endT > 0.6 && !st.party) { st.party = true; Sfx.play('vikingCheer'); K.confetti(st, W / 2, 140, 60); }
      if (st.endT > 3.4 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 300 }; levelClear(); }
    } else if (st.endT > 2.0) nextRoom();
  }

  /* ---------- what to do next ----------
     plan(st): {
       orders: [{ s, t, food, pat, cL, cR }] the open orders, least patience first, with the charge from each end,
       pick: { slot (rack index, or 'barrel'), food } what to take from the rack (the most urgent order nobody's
         bringing yet; the barrel when a SKOL is coming), or null,
       serve: { t, side } the serving step for the most urgent order,
       skol, wrestle: { t, food, need: ['L', 'R'] sides still to fill }, platter: { x, ground, t, free: [handles] },
       best(food, side): the order to slide a held food to from that end (or null), with its charge c }
     */
  function orders(st) {
    return st.seats.filter(s => s.t < st.nTables && s.state === 'want' && !s.skol).sort((a, b) => a.pat - b.pat)
      .map(s => ({ s, t: s.t, food: s.food, pat: s.pat, cL: chargeFor('L', s.x), cR: chargeFor('R', s.x) }));
  }
  function planNow(st) {
    const out = { orders: [], pick: null, serve: null, skol: st.skol, wrestle: null, platter: null };
    if (!st.h || st.state !== 'go' || st.brawl > 0) return out;
    out.orders = orders(st);
    const have = covered(st);
    const open = out.orders.filter(o => { if (have[o.food] > 0) { have[o.food]--; return false; } return true; });
    if (st.wrestle) {
      const w = st.wrestle, carrying = st.h.filter(h => h.carry && h.carry.k === w.food).length + st.fly.filter(f => f.item.k === w.food).length;
      out.wrestle = { t: w.table, food: w.food, need: ['L', 'R'].filter((sd, k) => !w.got[k]), carrying };
    }
    if (st.barrel && st.skol) out.pick = { slot: 'barrel', food: 'barrel' };
    else {
      const want = [];
      if (out.wrestle && out.wrestle.carrying < out.wrestle.need.length) want.push(out.wrestle.food);
      open.forEach(o => want.push(o.food));
      for (const f of want) { const k = st.rack.findIndex(it => it && it.k === f); if (k >= 0) { out.pick = { slot: k, food: f }; break; } }
    }
    const top = open[0] || out.orders[0];
    out.serve = top ? { t: top.t, side: 'L' } : null;
    if (st.platter) out.platter = { x: st.platter.x, ground: st.platter.ground, t: st.platter.t, held: st.platter.held.slice(), state: st.platter.state };
    return out;
  }
  function plan(st) {
    if (st.planMemo && st.planMemo.n === G.tickN && st.planMemo.k === st.k) return st.planMemo.p;
    const p = planNow(st);
    st.planMemo = { n: G.tickN, k: st.k, p };
    return p;
  }
  // the best order for a held food from one end: the least patient Viking who wants it (a wrestler on his own side)
  function best(st, food, side) {
    if (st.wrestle && st.wrestle.food === food) {
      const w = st.wrestle, k = side === 'L' ? 0 : 1;
      if (!w.got[k]) { const s = st.seats[w.table * 4 + 1 + k]; return { s, t: w.table, c: chargeFor(side, s.x), wrestle: true }; }
    }
    const o = orders(st).find(q => q.food === food);
    return o ? { s: o.s, t: o.t, c: side === 'L' ? o.cL : o.cR } : null;
  }

  /* ---------- drawing ---------- */
  const VCOL = ['#7a3a2a', '#3a5a7a', '#5a6a3a', '#6a4a7a', '#8a6a3a', '#3a6a6a'];
  const BEARD = ['#e8c070', '#a0522d', '#d8d8d8', '#5a3418', '#ff8a2a', '#f2e6c8'];
  function drawFood(k, x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineWidth = 1.5;
    if (k === 'roast') {
      ctx.fillStyle = '#f2e6c8'; ctx.fillRect(4, -3, 10, 4); circle(15, -3, 3); ctx.fill(); circle(15, 1, 3); ctx.fill();
      ctx.fillStyle = '#b5562a'; ctx.strokeStyle = '#6a2a10'; ctx.beginPath(); ctx.ellipse(-3, -1, 10, 8, -0.3, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d8783a'; ctx.beginPath(); ctx.ellipse(-6, -4, 4, 2.5, -0.3, 0, TAU); ctx.fill();
    } else if (k === 'fish') {
      ctx.fillStyle = '#7fb4cc'; ctx.strokeStyle = '#3a6a80';
      ctx.beginPath(); ctx.ellipse(0, 0, 12, 6, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(18, -6); ctx.lineTo(18, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a2a3a'; circle(-7, -1.5, 1.6); ctx.fill();
    } else if (k === 'bread') {
      ctx.fillStyle = '#e0a64a'; ctx.strokeStyle = '#8a5a1a';
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 7, 0, Math.PI, TAU); ctx.lineTo(13, 3); ctx.lineTo(-13, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#f6d28a'; for (const d of [-6, 0, 6]) { ctx.beginPath(); ctx.moveTo(d - 2, -5); ctx.lineTo(d + 2, -2); ctx.stroke(); }
    } else if (k === 'cheese') {
      ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = '#b88a00';
      ctx.beginPath(); ctx.moveTo(-12, 4); ctx.lineTo(12, 4); ctx.lineTo(12, -4); ctx.lineTo(-6, -9); ctx.lineTo(-12, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8b830'; circle(4, 0, 2.2); ctx.fill(); circle(-5, -2, 1.6); ctx.fill();
    } else if (k === 'barrel') {
      ctx.fillStyle = '#8a5a32'; ctx.strokeStyle = '#4a2a10';
      ctx.beginPath(); ctx.ellipse(0, 0, 12, 14, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#8a8e96'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-11, -6); ctx.lineTo(11, -6); ctx.moveTo(-11, 6); ctx.lineTo(11, 6); ctx.stroke();
    }
    ctx.restore();
  }
  function npc(s, x, y, t) {
    // a Viking at the table: body behind the table top at y
    const c = VCOL[s.look % VCOL.length], bc = BEARD[(s.look * 7) % BEARD.length];
    const mad = s.state === 'mad', up = s.skol || s.mood > 0 && s.reactT > 0, bob = mad ? Math.sin(t * 30) * 3 : up ? Math.sin(t * 8) * 2 : 0;
    const by = y - 6 + bob - (mad ? 10 : 0);
    ctx.fillStyle = c; rr(x - 15, by - 30, 30, 32, 8); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; rr(x + 3, by - 30, 12, 32, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(x - 12, by - 26, 3, 20);
    ctx.fillStyle = '#3a2210'; ctx.fillRect(x - 15, by - 10, 30, 4); ctx.fillStyle = '#d8b04a'; ctx.fillRect(x - 3, by - 10, 6, 4);
    ctx.fillStyle = '#f2c8a6'; circle(x, by - 38, 11); ctx.fill();
    ctx.fillStyle = 'rgba(160,90,60,0.25)'; circle(x + 4, by - 36, 8); ctx.fill();
    ctx.fillStyle = bc; ctx.beginPath(); ctx.moveTo(x - 10, by - 36); ctx.quadraticCurveTo(x, by - 14, x + 10, by - 36); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a1a2a'; circle(x - 4, by - 41, 1.6); ctx.fill(); circle(x + 4, by - 41, 1.6); ctx.fill();
    // helmet
    ctx.fillStyle = '#9aa0aa'; ctx.beginPath(); ctx.arc(x, by - 44, 11, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#6e737a'; ctx.fillRect(x - 11, by - 45, 22, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(x - 4, by - 50, 3, 2, -0.5, 0, TAU); ctx.fill();
    if (s.look % 3 === 0) { ctx.fillStyle = '#f2e6c8'; ctx.beginPath(); ctx.moveTo(x - 10, by - 46); ctx.quadraticCurveTo(x - 20, by - 52, x - 18, by - 62); ctx.quadraticCurveTo(x - 14, by - 52, x - 7, by - 50); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 10, by - 46); ctx.quadraticCurveTo(x + 20, by - 52, x + 18, by - 62); ctx.quadraticCurveTo(x + 14, by - 52, x + 7, by - 50); ctx.fill(); }
    // arms: mugs up for SKOL, fists for a tantrum, locked for a wrestle
    ctx.strokeStyle = c; ctx.lineWidth = 6; ctx.lineCap = 'round';
    if (s.skol) {
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + d * 12, by - 24); ctx.lineTo(x + d * 18, by - 52); ctx.stroke(); }
      ctx.fillStyle = s.filled ? '#ffc53d' : '#c8ccd6'; ctx.fillRect(x + 12, by - 64, 12, 13); ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 12, by - 64, 12, 13);
      if (s.filled) { ctx.fillStyle = '#ffffff'; circle(x + 18, by - 65, 4); ctx.fill(); }
    } else if (mad) { for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + d * 12, by - 20); ctx.lineTo(x + d * 16, by - 44 + Math.sin(t * 30 + d) * 6); ctx.stroke(); } }
    else if (s.state !== 'wrestle') { ctx.beginPath(); ctx.moveTo(x - 12, by - 18); ctx.lineTo(x - 16, y - 4); ctx.moveTo(x + 12, by - 18); ctx.lineTo(x + 16, y - 4); ctx.stroke(); }
    ctx.lineCap = 'butt';
  }
  function bubble(st, s, x, y, t) {
    if (s.state === 'want' && !s.skol) {
      const bx = x + 26, by = y - 66, u = s.pat / s.patMax;
      ctx.fillStyle = '#ffffff'; circle(bx, by, 17); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx - 12, by + 10); ctx.lineTo(bx - 20, by + 18); ctx.lineTo(bx - 4, by + 14); ctx.fill();
      ctx.strokeStyle = u > 0.5 ? '#5fc46a' : u > 0.25 ? '#ffc53d' : '#e84a3a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(bx, by, 17, -Math.PI / 2, -Math.PI / 2 + TAU * u); ctx.stroke();
      if (u < 0.25 && Math.sin(t * 16) > 0) { ctx.strokeStyle = '#e84a3a'; ctx.lineWidth = 2; circle(bx, by, 21); ctx.stroke(); }
      drawFood(s.food, bx - 2, by + 1, 0.9);
    }
    if (s.state === 'wrestle' && s.i === 1) {
      const w = st.wrestle, bx = x + 65, by = y - 70;
      ctx.fillStyle = '#ffffff'; rr(bx - 34, by - 16, 68, 32, 12); ctx.fill();
      drawFood(w.food, bx - 15, by, 0.8); drawFood(w.food, bx + 15, by, 0.8);
      ctx.strokeStyle = '#e84a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, by, 22, -Math.PI / 2, -Math.PI / 2 + TAU * w.t / S.wrestleT); ctx.stroke();
      for (const k of [0, 1]) if (w.got[k]) { ctx.fillStyle = '#5fc46a'; circle(bx + (k ? 15 : -15), by + 14, 5); ctx.fill(); }
    }
    if (s.reactT > 0 && s.react) {
      ctx.globalAlpha = Math.min(1, s.reactT * 2);
      text(s.react, x, y - 92 + s.reactT * 6, 13, s.mood < 0 ? '#ffb0a0' : '#ffffff', 'center', 'body');
      ctx.globalAlpha = 1;
    }
  }
  // the kitchen hatch, in screen coordinates (frame 4..142 x 296..400, opening 14..132 x 306..390)
  function paintHatch() {
    // the kitchen inside: smoky stone blocks, lighter low down where the fire lights them
    const ig = ctx.createLinearGradient(0, 306, 0, 390); ig.addColorStop(0, '#1a0e08'); ig.addColorStop(1, '#4a2a16');
    ctx.fillStyle = ig; ctx.fillRect(14, 306, 118, 84);
    ctx.strokeStyle = 'rgba(10,4,2,0.55)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let r = 0, y = 312; y < 390; r++, y += 13) { ctx.moveTo(14, y); ctx.lineTo(132, y); for (let x = 14 + (r % 2 ? 11 : 0); x < 132; x += 22) { ctx.moveTo(x, y); ctx.lineTo(x, y + 13); } }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,190,120,0.08)'; for (let r = 0, y = 312; y < 390; r++, y += 13) for (let x = 14 + (r % 2 ? 11 : 0); x < 132; x += 22) ctx.fillRect(x + 1, y + 1, 20, 1);
    // the oven mouth at the back: a stone arch, embers and a warm glow
    ctx.fillStyle = '#2a1a12'; ctx.beginPath(); ctx.moveTo(76, 386); ctx.lineTo(76, 366); ctx.arc(96, 366, 20, Math.PI, 0); ctx.lineTo(116, 386); ctx.closePath(); ctx.fill();
    const og = ctx.createRadialGradient(96, 382, 2, 96, 376, 18); og.addColorStop(0, '#ffd27a'); og.addColorStop(0.5, '#e8702a'); og.addColorStop(1, '#3a160a');
    ctx.fillStyle = og; ctx.beginPath(); ctx.moveTo(81, 386); ctx.lineTo(81, 368); ctx.arc(96, 368, 15, Math.PI, 0); ctx.lineTo(111, 386); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe08a'; for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(85 + k * 3.6, 384 - (k % 2) * 1.5, 1.4, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#5a4a40'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(77, 386); ctx.lineTo(77, 366); ctx.arc(96, 366, 19, Math.PI, 0); ctx.lineTo(115, 386); ctx.stroke();
    ctx.strokeStyle = 'rgba(30,20,14,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 7; k++) { const a = Math.PI + k / 6 * Math.PI; ctx.moveTo(96 + Math.cos(a) * 17.5, 366 + Math.sin(a) * 17.5); ctx.lineTo(96 + Math.cos(a) * 21, 366 + Math.sin(a) * 21); } ctx.stroke();
    // a shelf of crocks and a jug on the left wall
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(16, 344, 46, 3); ctx.fillStyle = 'rgba(255,200,140,0.25)'; ctx.fillRect(16, 344, 46, 1);
    for (const [cx, w, h, col] of [[24, 9, 11, '#8a6a4a'], [36, 7, 8, '#a8885a'], [48, 10, 13, '#6a5a50'], [57, 5, 7, '#9a7a5a']]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, 344 - h / 2, w / 2, h / 2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,180,0.3)'; ctx.beginPath(); ctx.ellipse(cx - w * 0.2, 344 - h * 0.65, w * 0.15, h * 0.2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = shade(col, 0.35); ctx.fillRect(cx - w * 0.3, 344 - h - 1, w * 0.6, 2);
    }
    // a pot on a hook over a little fire on the left (its steam is live)
    ctx.strokeStyle = '#3a3a40'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(42, 352); ctx.lineTo(42, 364); ctx.stroke();
    ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.ellipse(42, 371, 10, 7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#4a4a54'; ctx.fillRect(32, 364, 20, 2.5); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(38, 369, 3, 2, -0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.moveTo(34, 386); ctx.quadraticCurveTo(38, 378, 42, 382); ctx.quadraticCurveTo(46, 376, 50, 386); ctx.closePath(); ctx.fill();
    // the rail across the top with a pan, a ladle and a string of onions hanging from it
    ctx.fillStyle = '#3a3a40'; ctx.fillRect(16, 330, 114, 2.5); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(16, 330, 114, 0.8);
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(104, 332); ctx.lineTo(104, 338); ctx.stroke();
    ctx.fillStyle = '#2e2e36'; ctx.beginPath(); ctx.ellipse(104, 344, 7, 6, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#5a5a66'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(102, 342, 2.5, Math.PI, Math.PI * 1.6); ctx.fill();
    ctx.strokeStyle = '#8a8e96'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(120, 332); ctx.lineTo(120, 348); ctx.stroke(); ctx.fillStyle = '#8a8e96'; ctx.beginPath(); ctx.ellipse(120, 350, 3, 2.2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(70, 332); ctx.lineTo(70, 352); ctx.stroke();
    for (let k = 0; k < 5; k++) { const ox = 70 + (k % 2 ? 2.5 : -2.5), oy = 337 + k * 3.6; ctx.fillStyle = '#c89a5a'; ctx.beginPath(); ctx.ellipse(ox, oy, 2.8, 2.4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,230,180,0.5)'; ctx.fillRect(ox - 1.5, oy - 1.5, 1, 1); }
    // soot: the top of the opening darkest
    const sg = ctx.createLinearGradient(0, 306, 0, 330); sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.fillRect(14, 306, 118, 24);
    // the sill: a thick plank with grain and a lit edge
    ctx.fillStyle = '#7a4e2a'; ctx.fillRect(10, 386, 126, 8);
    ctx.strokeStyle = 'rgba(40,20,8,0.45)'; ctx.lineWidth = 0.8; ctx.beginPath(); for (const yy of [389, 391.5]) { ctx.moveTo(10, yy); for (let x = 10; x <= 136; x += 6) ctx.lineTo(x, yy + Math.sin(x * 0.11 + yy) * 0.5); } ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,150,0.35)'; ctx.fillRect(10, 386, 126, 1.5); ctx.fillStyle = 'rgba(20,10,4,0.4)'; ctx.fillRect(10, 392, 126, 2);
    // the timber frame: four beams with grain, a lit top/left, dark lower/right, pegged corners, an outline
    const beam = (x, y, w, h, vert) => {
      ctx.fillStyle = '#6a4424'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(30,14,6,0.45)'; ctx.lineWidth = 0.8; ctx.beginPath();
      const n = 3, L = vert ? h : w, D = vert ? w : h;
      for (let i = 1; i <= n; i++) { const o = D * i / (n + 1); for (let u = 0; u <= L; u += 6) { const v = o + Math.sin(u * 0.08 + i * 2) * 0.8; if (vert) { if (!u) ctx.moveTo(x + v, y + u); else ctx.lineTo(x + v, y + u); } else { if (!u) ctx.moveTo(x + u, y + v); else ctx.lineTo(x + u, y + v); } } }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,200,140,0.22)'; if (vert) ctx.fillRect(x, y, 1.5, h); else ctx.fillRect(x, y, w, 1.5);
      ctx.fillStyle = 'rgba(20,10,4,0.35)'; if (vert) ctx.fillRect(x + w - 2, y, 2, h); else ctx.fillRect(x, y + h - 2, w, 2);
    };
    beam(4, 296, 138, 10, false); beam(4, 390, 138, 10, false); beam(4, 306, 10, 84, true); beam(132, 306, 10, 84, true);
    ctx.strokeStyle = 'rgba(200,150,90,0.4)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 14; x < 130; x += 12) { ctx.moveTo(x, 301); ctx.quadraticCurveTo(x + 3, 298, x + 6, 301); ctx.quadraticCurveTo(x + 9, 304, x + 12, 301); }
    ctx.stroke();
    for (const [px, py] of [[9, 301], [137, 301], [9, 395], [137, 395]]) { ctx.fillStyle = '#4a2c14'; circle(px, py, 2.4); ctx.fill(); ctx.fillStyle = 'rgba(255,210,150,0.4)'; circle(px - 0.7, py - 0.7, 0.9); ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(14, 306, 118, 3); ctx.fillRect(14, 306, 3, 80);
    ctx.strokeStyle = '#2a180e'; ctx.lineWidth = 2; ctx.strokeRect(5, 297, 136, 102); ctx.lineWidth = 1.5; ctx.strokeRect(14, 306, 118, 84);
    ctx.strokeStyle = 'rgba(255,200,140,0.25)'; ctx.lineWidth = 1.5; rr(3, 295, 140, 106, 6); ctx.stroke();
  }
  // the food rack shelf (screen x 10..134 at y rackY+10..+18), its brackets and its shadow on the wall
  function paintRack() {
    ctx.fillStyle = 'rgba(20,10,4,0.3)'; ctx.fillRect(2, 8, 124, 6);
    for (const bx of [18, 102]) {
      ctx.fillStyle = '#3a3a40'; ctx.beginPath(); ctx.moveTo(bx, 8); ctx.lineTo(bx + 4, 8); ctx.lineTo(bx + 4, 24); ctx.quadraticCurveTo(bx + 2, 12, bx - 10, 10); ctx.lineTo(bx - 10, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(bx, 8, 1, 16);
      ctx.fillStyle = '#7a7e88'; circle(bx + 2, 20, 1.2); ctx.fill(); circle(bx - 6, 9.5, 1); ctx.fill();
    }
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(0, 0, 124, 8);
    ctx.strokeStyle = 'rgba(30,14,6,0.5)'; ctx.lineWidth = 0.8; ctx.beginPath(); for (const yy of [2.5, 5]) { ctx.moveTo(0, yy); for (let x = 0; x <= 124; x += 6) ctx.lineTo(x, yy + Math.sin(x * 0.1 + yy * 3) * 0.5); } ctx.stroke();
    ctx.fillStyle = 'rgba(30,14,6,0.6)'; ctx.beginPath(); ctx.ellipse(70, 4, 2.4, 1.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,210,150,0.35)'; ctx.fillRect(0, 0, 124, 1.5); ctx.fillStyle = 'rgba(20,10,4,0.45)'; ctx.fillRect(0, 6, 124, 2);
    ctx.fillStyle = 'rgba(255,200,140,0.2)'; ctx.fillRect(0, 0, 1.5, 8);
    for (const nx of [4, 120]) { ctx.fillStyle = '#7a7e88'; circle(nx, 4, 1.1); ctx.fill(); }
    ctx.strokeStyle = '#2a180e'; ctx.lineWidth = 1.2; ctx.strokeRect(0.5, 0.5, 123, 7);
  }
  function draw(st) {
    const t = G.clock || 0, shake = st.brawl > 0 ? 3 : st.party ? 4 * Math.sin(t * 40) : 0;
    ctx.save(); if (shake) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    // the hall: timber walls, roof beams, a smoke hole with the northern sky
    ctx.fillStyle = '#3a2416'; ctx.fillRect(-10, -10, W + 20, H + 20);
    // the still parts of the hall (walls, beams, smoke hole, shields, chair, hearth stones) are one picture
    K.pic('meadhall', W, H, 0, 0, () => {
      // the timber wall: upright planks with grain, knots, dark seams and a lit edge
      for (let x = 0; x < W; x += 48) {
        const k = x / 48;
        ctx.fillStyle = k % 2 ? '#4a2e1a' : '#43291a'; ctx.fillRect(x, 0, 48, S.floor);
        ctx.fillStyle = 'rgba(255,200,140,0.07)'; ctx.fillRect(x + 2, 0, 3, S.floor);
        ctx.fillStyle = '#25150b'; ctx.fillRect(x + 46, 0, 2, S.floor);
        ctx.strokeStyle = 'rgba(30,16,8,0.35)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let g = 0; g < 3; g++) { const gx = x + 10 + g * 12 + K.hash(k * 7 + g) * 4; ctx.moveTo(gx, 0); ctx.bezierCurveTo(gx + 3, S.floor * 0.3, gx - 3, S.floor * 0.6, gx + 1, S.floor); }
        ctx.stroke();
        if (K.hash(k + 40) < 0.5) { const ky = 140 + K.hash(k + 41) * 260; ctx.fillStyle = 'rgba(30,16,8,0.3)'; ctx.beginPath(); ctx.ellipse(x + 24, ky, 3, 5, 0, 0, TAU); ctx.fill(); }
      }
      // smoke-darkened high up, warm firelight low down around the hearth
      const sg = ctx.createLinearGradient(0, 0, 0, 200); sg.addColorStop(0, 'rgba(10,6,4,0.55)'); sg.addColorStop(1, 'rgba(10,6,4,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, 200);
      // roof beams with a lit top and dark underside, and carved knotwork on the lower one
      for (const y of [60, 110]) {
        ctx.fillStyle = '#2a180e'; ctx.fillRect(0, y, W, 10);
        ctx.fillStyle = 'rgba(255,200,140,0.14)'; ctx.fillRect(0, y, W, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, y + 10, W, 4);
      }
      ctx.strokeStyle = 'rgba(200,150,90,0.35)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let x = 0; x < W; x += 24) { ctx.moveTo(x, 115); ctx.quadraticCurveTo(x + 6, 111, x + 12, 115); ctx.quadraticCurveTo(x + 18, 119, x + 24, 115); }
      ctx.stroke();
      // two rafters slanting up into the dark
      ctx.fillStyle = '#24140a';
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(W / 2 + d * 70, 0); ctx.lineTo(W / 2 + d * 480, 60); ctx.lineTo(W / 2 + d * 480, 70); ctx.lineTo(W / 2 + d * 70, 12); ctx.closePath(); ctx.fill(); }
      // the smoke hole: night sky, stars, the aurora, a timber frame
      ctx.fillStyle = '#1a2a48'; rr(W / 2 - 50, 0, 100, 40, 8); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let k = 0; k < 7; k++) ctx.fillRect(W / 2 - 44 + K.hash(k + 3) * 88, 4 + K.hash(k + 9) * 30, 1.5, 1.5);
      ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 4; rr(W / 2 - 50, -4, 100, 44, 8); ctx.stroke();
      // hanging shields
      for (let k = 0; k < 7; k++) { const sc = K.SHIELD_COLS[k % K.SHIELD_COLS.length]; ctx.fillStyle = 'rgba(0,0,0,0.3)'; circle(302 + k * 85, 95, 15); ctx.fill(); K.shield(300 + k * 85, 92, 15, { col: sc[0], col2: sc[1], rot: k * 0.5 }); }
      // the chieftain's chair, top right
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(874, 116, 70, 80, 8); ctx.fill();
      ctx.fillStyle = '#6a3a1a'; rr(870, 112, 70, 80, 8); ctx.fill();
      ctx.fillStyle = '#5a2e12'; rr(905, 112, 35, 80, 8); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,140,0.2)'; ctx.fillRect(873, 116, 3, 72);
      ctx.fillStyle = '#c8323a'; rr(878, 124, 54, 40, 6); ctx.fill();
      ctx.fillStyle = '#9a2028'; rr(878, 146, 54, 18, 6); ctx.fill();
      ctx.strokeStyle = '#ffc53d'; ctx.lineWidth = 1.2; ctx.setLineDash([2, 3]); rr(881, 127, 48, 34, 5); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#3a1e0a'; ctx.lineWidth = 2; rr(870, 112, 70, 80, 8); ctx.stroke();
      // carved dragon heads on the posts
      for (const d of [-1, 1]) { const px = 905 + d * 35; ctx.fillStyle = '#7a4a22'; ctx.beginPath(); ctx.moveTo(px - 5, 118); ctx.quadraticCurveTo(px - 6, 100, px + d * 4, 98); ctx.quadraticCurveTo(px + d * 12, 98, px + d * 12, 104); ctx.lineTo(px + d * 4, 106); ctx.lineTo(px + 5, 118); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#3a1e0a'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.fillStyle = '#ffc53d'; circle(px + d * 5, 102, 1.4); ctx.fill(); }
      ctx.fillStyle = '#ffc53d'; circle(905, 112, 8); ctx.fill(); ctx.strokeStyle = '#a8761a'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(902, 109, 2.2); ctx.fill();
      const fx = 540, fy = S.floor;
      // a ring of hearth stones and crossed logs, flames, then sparks drifting up
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(fx, fy + 2, 62, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5a5a60'; rr(fx - 50, fy - 10, 100, 12, 5); ctx.fill();
      for (let k = 0; k < 7; k++) { const sx = fx - 48 + k * 16; ctx.fillStyle = k % 2 ? '#6e6e76' : '#64646c'; ctx.beginPath(); ctx.ellipse(sx, fy - 6, 9, 7, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#38383e'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.fillStyle = 'rgba(255,170,90,0.35)'; ctx.beginPath(); ctx.ellipse(sx - 2, fy - 10, 5, 2, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#4a2a14'; ctx.strokeStyle = '#2a160a'; ctx.lineWidth = 1.5;
      for (const d of [-1, 1]) { ctx.save(); ctx.translate(fx, fy - 12); ctx.rotate(d * 0.35); rr(-32, -4, 64, 8, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#c8783a'; circle(d * 31, 0, 3.5); ctx.fill(); ctx.fillStyle = '#4a2a14'; ctx.restore(); }
    }, 0, 0, true);
    const fl = 0.85 + 0.15 * Math.sin(t * 7) * Math.sin(t * 3.1);
    // (glows are pictures too, faded in and out with globalAlpha: a big gradient fill each frame is slow on a phone)
    ctx.globalAlpha = fl;
    K.pic('meadfire', 720, S.floor - 100, 0, 0, () => {
      const fg = ctx.createRadialGradient(360, S.floor - 120, 10, 360, S.floor - 120, 360);
      fg.addColorStop(0, 'rgba(255,150,60,0.32)'); fg.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = fg; ctx.fillRect(0, 0, 720, S.floor - 100);
    }, 180, 100);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(120,255,180,0.35)'; ctx.fillRect(W / 2 - 46, 14 + Math.sin(t) * 3, 92, 6);
    ctx.fillStyle = 'rgba(200,190,180,0.12)'; for (let k = 0; k < 3; k++) { const u = (t * 0.25 + k / 3) % 1; circle(W / 2 + Math.sin(t + k * 2) * 14, 60 - u * 70, 14 + u * 18); ctx.fill(); }
    // torches on the walls with flickering halos
    for (const [tx, ty] of [[56, 200], [W - 26, 268]]) {
      const f2 = 0.8 + 0.2 * Math.sin(t * 11 + tx);
      ctx.globalAlpha = f2;
      K.pic('meadtorch', 140, 140, 70, 70, () => {
        const tg = ctx.createRadialGradient(0, 0, 2, 0, 0, 70); tg.addColorStop(0, 'rgba(255,170,70,0.4)'); tg.addColorStop(1, 'rgba(255,170,70,0)');
        ctx.fillStyle = tg; ctx.fillRect(-70, -70, 140, 140);
      }, tx, ty - 14);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#2a180e'; ctx.fillRect(tx - 3, ty - 6, 6, 26); ctx.fillStyle = '#6a6e76'; ctx.fillRect(tx - 6, ty - 8, 12, 5);
      ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(tx - 6, ty - 8); ctx.quadraticCurveTo(tx - 7, ty - 22 * f2, tx + Math.sin(t * 13) * 2, ty - 30 * f2); ctx.quadraticCurveTo(tx + 7, ty - 18, tx + 6, ty - 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.moveTo(tx - 3, ty - 8); ctx.quadraticCurveTo(tx - 3, ty - 16, tx, ty - 20 * f2); ctx.quadraticCurveTo(tx + 3, ty - 14, tx + 3, ty - 8); ctx.closePath(); ctx.fill();
    }
    npc({ look: 2, state: st.party || (st.platter && st.platter.state === 'carry') ? 'eat' : 'quiet', mood: st.party ? 1 : 0, reactT: st.party ? 1 : 0, skol: !!st.party }, 905, 186, t);
    // the fire pit
    const fx = 540, fy = S.floor;
    for (let k = 0; k < 5; k++) { const f = Math.sin(t * 9 + k * 1.7) * 6; ctx.fillStyle = k % 2 ? '#ff8a2a' : '#ffc53d'; ctx.beginPath(); ctx.moveTo(fx - 30 + k * 15, fy - 8); ctx.quadraticCurveTo(fx - 34 + k * 15, fy - 40 - f, fx - 24 + k * 15 + f * 0.3, fy - 52 - f); ctx.quadraticCurveTo(fx - 18 + k * 15, fy - 30, fx - 20 + k * 15, fy - 8); ctx.fill(); }
    for (let k = 0; k < 6; k++) { const u = (t * 0.6 + K.hash(k)) % 1; ctx.fillStyle = 'rgba(255,' + (200 - u * 120 | 0) + ',80,' + (1 - u) + ')'; ctx.fillRect(fx - 20 + K.hash(k + 5) * 40 + Math.sin(t * 3 + k) * 10 * u, fy - 50 - u * 120, 2.5, 2.5); }
    // the kitchen hatch and rack (sweep): the still parts are one picture (a timber frame with grain, pegs and carved
    // knotwork round a smoky stone kitchen: an oven mouth, a shelf of crocks, pans and onions hanging from a rail, a
    // plank sill); live on top: the oven's glow breathing, steam off the pot, the name board, the cook's arms
    K.pic('meadhatch', 156, 136, 0, 0, () => { ctx.translate(-2, -288); paintHatch(); }, 2, 288);
    { const fl = 0.75 + 0.15 * Math.sin(t * 4) + 0.08 * Math.sin(t * 11.3);
      const gl = ctx.createRadialGradient(96, 372, 4, 96, 368, 70); gl.addColorStop(0, 'rgba(255,170,80,' + (0.55 * fl).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.save(); ctx.beginPath(); ctx.rect(14, 306, 118, 80); ctx.clip(); ctx.fillStyle = gl; ctx.fillRect(14, 306, 118, 80);
      for (let k = 0; k < 3; k++) { const u = (t * 0.35 + k / 3) % 1; ctx.fillStyle = 'rgba(240,230,220,' + (0.28 * Math.sin(u * Math.PI)).toFixed(3) + ')'; circle(40 + Math.sin(t * 1.3 + k * 2) * 4 + u * 6, 366 - u * 50, 5 + u * 7); ctx.fill(); }
      ctx.restore(); }
    // the name board on two little chains (sized to the word)
    { ctx.font = '700 11px "Atkinson Hyperlegible", system-ui, sans-serif'; const tw = ctx.measureText('KITCHEN').width, bw = Math.ceil(tw + 18), bx = 73 - bw / 2;
      ctx.strokeStyle = '#8a8e96'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx + 8, 306); ctx.lineTo(bx + 8, 311); ctx.moveTo(bx + bw - 8, 306); ctx.lineTo(bx + bw - 8, 311); ctx.stroke();
      ctx.fillStyle = '#7a4e2a'; rr(bx, 310, bw, 17, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,210,150,0.25)'; ctx.fillRect(bx + 2, 311, bw - 4, 1.5);
      ctx.fillStyle = 'rgba(30,14,6,0.3)'; ctx.fillRect(bx + 2, 323, bw - 4, 3);
      ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 1.5; rr(bx, 310, bw, 17, 3); ctx.stroke();
      text('KITCHEN', 73, 318.5, 11, '#ffe7c0', 'center', 'body'); }
    // the cook's arms through the hatch: a rolled linen sleeve, a forearm, a hand with a ladle
    { const hx = 60 + Math.sin(t * 3) * 16, hy = 392 + (st.restockT < 0.25 ? 10 : 0);
      ctx.strokeStyle = '#d8a888'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(60, 370); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = '#f2c8a6'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(60, 370); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,220,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(58.5, 372); ctx.lineTo(hx - 1.5, hy - 1); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = '#e8dcc0'; ctx.beginPath(); ctx.ellipse(60, 368, 6, 4, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#a8987a'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#f2c8a6'; circle(hx, hy, 3.6); ctx.fill(); ctx.strokeStyle = '#b8806a'; ctx.lineWidth = 1; ctx.stroke(); }
    // the food rack: a grained shelf with a lit edge on two iron brackets
    K.pic('meadrack', 132, 30, 4, 2, () => paintRack(), 10, S.rackY + 10);
    for (let k = 0; k < 3; k++) if (st.rack[k]) drawFood(st.rack[k].k, S.rack[k], S.rackY + 2, 1.05);
    if (st.barrel) drawFood('barrel', S.barrelX, S.floor - 14, 1.1);
    // the floor never changes: one picture (its own space starts at the floor line)
    K.pic('meadfloor', W, H - S.floor, 0, 0, () => {
      ctx.translate(0, -S.floor);
      // the floor
      ctx.fillStyle = '#6a4424'; ctx.fillRect(0, S.floor, W, H - S.floor);
      // floorboards: rows of planks, staggered joints, grain, nail heads, a worn lit edge and the wall's shadow
      for (let r2 = 0; r2 < 4; r2++) {
        const y0 = S.floor + r2 * 20;
        ctx.fillStyle = r2 % 2 ? '#64401f' : '#6e4726'; ctx.fillRect(0, y0, W, 20);
        ctx.fillStyle = 'rgba(255,210,150,0.12)'; ctx.fillRect(0, y0, W, 1.5);
        ctx.fillStyle = '#4a2c14'; ctx.fillRect(0, y0 + 19, W, 1);
        for (let x = (r2 % 2) * 60; x < W; x += 120) { ctx.fillStyle = '#4a2c14'; ctx.fillRect(x, y0, 2, 20); ctx.fillStyle = '#c8ccd6'; ctx.fillRect(x + 5, y0 + 4, 1.6, 1.6); ctx.fillRect(x + 5, y0 + 14, 1.6, 1.6); }
        ctx.fillStyle = 'rgba(40,20,8,0.3)'; for (let k = 0; k < 10; k++) ctx.fillRect(K.hash(r2 * 19 + k) * W, y0 + 6 + (k % 3) * 4, 18 + K.hash(k + r2) * 26, 1);
      }
      const shg = ctx.createLinearGradient(0, S.floor, 0, S.floor + 16); shg.addColorStop(0, 'rgba(0,0,0,0.35)'); shg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shg; ctx.fillRect(0, S.floor, W, 16);
    }, 0, S.floor, true);
    // the serving steps
    for (const l of LEDGES) {
      const lw = Math.round(l.x1 - l.x0), lh = Math.round((l.k === 0 ? S.floor : S.tables[l.k - 1].ly) - l.y);
      K.pic('meadstep|' + lw + '|' + lh, lw + 4, lh + 4, 0, 2, () => paintStep(lw, lh), l.x0, l.y);
    }
    // the tables and their Vikings
    for (let tt = 2; tt >= 0; tt--) {
      const ty = S.tables[tt].y, open = tt < st.nTables;
      K.pic('meadbench', S.tx1 - S.tx0, 12, 0, 9, paintBench, S.tx0, ty); // the bench behind
      if (open) for (const s of st.seats) if (s.t === tt) npc(s, s.x, ty, t);
      K.pic('meadtable|' + (open ? 1 : 0) + '|' + tt, S.tx1 - S.tx0 + 8, 34, 4, 2, () => paintTable(open, tt), S.tx0, ty);
      if (open) for (const s of st.seats) if (s.t === tt && s.plate) { ctx.fillStyle = '#e8e0d0'; ctx.beginPath(); ctx.ellipse(s.x, ty - 1, 12, 3, 0, 0, TAU); ctx.fill(); }
      if (!open) text('(not open yet)', (S.tx0 + S.tx1) / 2, ty - 16, 12, 'rgba(255,255,255,0.4)', 'center', 'body');
      // arm-wrestle
      if (st.wrestle && st.wrestle.table === tt) {
        const a = S.seats[1], b = S.seats[2], m = (a + b) / 2 + Math.sin(t * 6) * 8;
        ctx.strokeStyle = VCOL[1]; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(a + 12, ty - 22); ctx.lineTo(m, ty - 10); ctx.lineTo(b - 12, ty - 22); ctx.stroke(); ctx.lineCap = 'butt';
        ctx.fillStyle = '#f2c8a6'; circle(m, ty - 10, 6); ctx.fill();
      }
      // the SKOL table glows
      if (st.skol && st.skol.table === tt) { ctx.strokeStyle = st.skol.state === 'up' ? C.gold : 'rgba(255,197,61,0.5)'; ctx.lineWidth = 3; rr(S.tx0 - 3, ty - 3, S.tx1 - S.tx0 + 6, 18, 5); ctx.stroke(); }
    }
    // what they want (over everything at the tables)
    for (const s of st.seats) if (s.t < st.nTables) bubble(st, s, s.x, S.tables[s.t].y, t);
    // food on the tables
    for (const q of st.slides) drawFood(q.item.k, q.x, S.tables[q.t].y - (q.barrel ? 14 : 7), 1);
    // the charge marker: where it would stop
    for (const h of st.h) if (h.charging && h.carry) {
      const l = servingAt(st, h); if (!l) continue;
      const ty = S.tables[l.k].y, sx = stopAt(l.side, h.charge), dir = sideDir(l.side);
      let col = '#ffffff';
      if (h.carry.k !== 'barrel') {
        const b = best(st, h.carry.k, l.side);
        if (b && Math.abs(b.s.x - sx) < S.seatWin) col = '#5fc46a';
        else if (dir > 0 ? sx > S.seats[3] + S.seatWin : sx < S.seats[0] - S.seatWin) col = '#e84a3a';
        if (b) { ctx.strokeStyle = 'rgba(95,196,106,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(b.s.x, ty - 4); ctx.lineTo(b.s.x, ty + 14); ctx.stroke(); ctx.setLineDash([]); }
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(endX(l.side), ty + 6); ctx.lineTo(sx, ty + 6); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(sx, ty - 2); ctx.lineTo(sx - 7, ty - 14); ctx.lineTo(sx + 7, ty - 14); ctx.closePath(); ctx.fill();
    }
    // the platter
    if (st.platter) {
      const pt = st.platter, py = pt.y - 22;
      ctx.fillStyle = '#c8ccd6'; ctx.beginPath(); ctx.ellipse(pt.x, py, S.handle + 6, 7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#b5562a'; ctx.beginPath(); ctx.ellipse(pt.x, py - 10, 22, 12, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5fc46a'; circle(pt.x - 14, py - 6, 4); ctx.fill(); circle(pt.x + 15, py - 5, 4); ctx.fill();
      ctx.fillStyle = '#ffd84a'; circle(pt.x, py - 22, 3); ctx.fill();
      ctx.strokeStyle = pt.t < 4 ? '#e84a3a' : C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(pt.x, py - 44, 12, -Math.PI / 2, -Math.PI / 2 + TAU * pt.t / S.platterT); ctx.stroke();
      text(String(Math.ceil(pt.t)), pt.x, py - 43, 12, '#ffffff', 'center', 'body');
      for (const k of [0, 1]) if (pt.held[k] === null) { ctx.fillStyle = 'rgba(255,197,61,' + (0.5 + 0.4 * Math.sin(t * 8)) + ')'; circle(pt.x + (k ? S.handle : -S.handle), py, 5); ctx.fill(); }
    }
    // floor food, the dog
    for (const f of st.floorItems) drawFood(f.item.k, f.x, f.y, 0.9);
    if (st.dog) drawDog(st.dog, t);
    // the heroes
    for (const h of st.h) drawHero(st, h, t);
    // things in the air
    for (const f of st.fly) drawFood(f.item.k, f.x, f.y, 1);
    if (st.fight) {
      const f = st.fight;
      if (f.state === 'tell') { text('!', f.x, f.y - 60, 26, '#e84a3a', 'center', 'display'); drawFood('roast', f.x + 14, f.y - 30, 0.9); const h = st.h[f.to]; ctx.strokeStyle = 'rgba(232,74,58,0.5)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x, f.y - 30); ctx.lineTo(h.x, h.y - 30); ctx.stroke(); ctx.setLineDash([]); }
      else drawFood('roast', f.x, f.y, 1);
    }
    K.drawParts(st);
    if (st.brawl > 0) {
      ctx.fillStyle = 'rgba(216,192,160,0.55)';
      for (let k = 0; k < 14; k++) { circle(S.tx0 + 40 + K.hash(k) * (S.tx1 - S.tx0 - 80) + Math.sin(t * 7 + k) * 20, 150 + K.hash(k + 9) * 260 + Math.cos(t * 6 + k) * 16, 40 + 10 * Math.sin(t * 5 + k)); ctx.fill(); }
      text('BRAWL!', W / 2, 250, 54, '#ffffff', 'center', 'display');
    }
    ctx.restore();
  }
  const COLW = K.COL;
  // a long feast table (origin: the top left of its top): two oak boards with grain, knots and nail heads, mead rings
  // and crumbs, a carved lip, and trestle legs with a cross bar. A closed table is darker and bare.
  function paintTable(open, tt) {
    const w = S.tx1 - S.tx0, R = n => K.hash(n * 1.91 + tt * 13.7);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(6, 12, w - 12, 5);
    // trestle legs and the stretcher between them
    ctx.fillStyle = COLW.woodDark; ctx.fillRect(26, 18, w - 52, 4);
    for (const lx of [20, w - 26]) {
      ctx.fillStyle = COLW.woodDark; ctx.fillRect(lx, 12, 6, 16);
      ctx.fillStyle = 'rgba(255,200,140,0.18)'; ctx.fillRect(lx, 12, 1.5, 16);
      ctx.fillStyle = '#3a2010'; ctx.fillRect(lx - 3, 26, 12, 3);
      ctx.fillStyle = '#c8a050'; circle(lx + 3, 20, 1.2); ctx.fill();
    }
    const base = open ? COLW.wood : '#5a3a22';
    const g = ctx.createLinearGradient(0, 0, 0, 12); g.addColorStop(0, mixCol(base, '#ffffff', 0.12)); g.addColorStop(1, mixCol(base, '#2a1408', 0.3));
    ctx.fillStyle = g; rr(0, 0, w, 12, 3); ctx.fill();
    // the two boards: a seam along the middle, staggered butt joints, grain and knots
    ctx.fillStyle = 'rgba(40,20,8,0.4)'; ctx.fillRect(2, 5.5, w - 4, 1);
    ctx.fillStyle = 'rgba(40,20,8,0.35)'; for (let k = 1; k < 6; k++) { const jx = k * w / 6; ctx.fillRect(jx, k % 2 ? 1 : 6.5, 1.5, 5); }
    ctx.strokeStyle = 'rgba(40,20,8,0.3)'; ctx.lineWidth = 0.7; ctx.beginPath();
    for (let k = 0; k < 14; k++) { const gx = R(k) * w, gy = 2 + (k % 2) * 5 + R(k + 30) * 3, gl = 30 + R(k + 60) * 70; ctx.moveTo(gx, gy); ctx.bezierCurveTo(gx + gl * 0.3, gy - 1, gx + gl * 0.7, gy + 1, gx + gl, gy); }
    ctx.stroke();
    for (let k = 0; k < 4; k++) { const kx = 30 + R(k + 90) * (w - 60), ky = 3 + (k % 2) * 5; ctx.fillStyle = 'rgba(50,24,8,0.5)'; ctx.beginPath(); ctx.ellipse(kx, ky, 3, 1.4, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(50,24,8,0.3)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(kx, ky, 5, 2.2, 0, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = '#c8ccd6'; for (let k = 0; k < 7; k++) { const nx = 8 + k * (w - 16) / 6; ctx.fillRect(nx, 2.5, 1.4, 1.4); ctx.fillRect(nx + 3, 8, 1.4, 1.4); }
    if (open) {
      // mead rings and crumbs where the cups and plates have been
      ctx.strokeStyle = 'rgba(120,70,20,0.35)'; ctx.lineWidth = 0.9;
      for (let k = 0; k < 5; k++) { const rx = 20 + R(k + 120) * (w - 40); ctx.beginPath(); ctx.ellipse(rx, 6, 5, 1.8, 0, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = 'rgba(230,200,140,0.35)'; for (let k = 0; k < 18; k++) ctx.fillRect(10 + R(k + 150) * (w - 20), 2 + R(k + 170) * 8, 1.2, 1);
    }
    ctx.fillStyle = COLW.woodHi; ctx.fillRect(4, 1, w - 8, 2);
    ctx.fillStyle = 'rgba(255,230,190,0.25)'; ctx.fillRect(6, 1, w - 12, 0.8);
    // a carved lip of little notches along the front edge
    ctx.fillStyle = 'rgba(40,20,8,0.4)'; for (let x = 8; x < w - 6; x += 10) { ctx.beginPath(); ctx.moveTo(x, 12); ctx.lineTo(x + 3, 9.5); ctx.lineTo(x + 6, 12); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 1.2; rr(0, 0, w, 12, 3); ctx.stroke();
  }
  // the bench behind a table (origin: the table's top left; the bench sits 8 px above)
  function paintBench() {
    const w = S.tx1 - S.tx0 - 20;
    ctx.translate(10, 0);
    ctx.fillStyle = '#4a2a14'; ctx.fillRect(0, -8, w, 6);
    ctx.fillStyle = 'rgba(255,200,140,0.18)'; ctx.fillRect(0, -8, w, 1.2);
    ctx.fillStyle = '#2e1808'; ctx.fillRect(0, -3, w, 1);
    ctx.strokeStyle = 'rgba(20,10,4,0.4)'; ctx.lineWidth = 0.6; ctx.beginPath(); for (let k = 0; k < 6; k++) { const gx = K.hash(k + 3) * w; ctx.moveTo(gx, -6); ctx.lineTo(gx + 40, -5.5); } ctx.stroke();
    ctx.fillStyle = '#c8ccd6'; for (let k = 0; k < 6; k++) ctx.fillRect(6 + k * (w - 12) / 5, -6, 1.2, 1.2);
  }
  // a serving step on its two posts (origin: its top left; lh down to whatever it stands on)
  function paintStep(lw, lh) {
    for (const px of [6, lw - 12]) {
      ctx.fillStyle = COLW.woodDark; ctx.fillRect(px, 10, 6, lh - 10);
      ctx.fillStyle = 'rgba(255,200,140,0.15)'; ctx.fillRect(px, 10, 1.4, lh - 10);
      ctx.fillStyle = 'rgba(20,10,4,0.4)'; for (let y = 18; y < lh - 4; y += 14) ctx.fillRect(px + 2, y, 1, 6);
      ctx.fillStyle = '#d8c090'; ctx.fillRect(px - 1, 12, 8, 1.4); ctx.fillRect(px - 1, 15, 8, 1.4);
    }
    if (lh > 40) { ctx.strokeStyle = COLW.woodDark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(9, lh - 6); ctx.lineTo(lw - 9, 16); ctx.stroke(); }
    const g = ctx.createLinearGradient(0, 0, 0, 10); g.addColorStop(0, COLW.woodHi); g.addColorStop(0.3, COLW.wood); g.addColorStop(1, mixCol(COLW.wood, '#2a1408', 0.3));
    ctx.fillStyle = g; rr(0, 0, lw, 10, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,8,0.35)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(4, 4); ctx.bezierCurveTo(lw * 0.3, 3, lw * 0.6, 6, lw - 4, 5); ctx.moveTo(6, 7); ctx.bezierCurveTo(lw * 0.4, 8, lw * 0.7, 6, lw - 6, 7.5); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(3, 10, lw - 6, 3);
    ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 1.2; rr(0, 0, lw, 10, 3); ctx.stroke();
    ctx.fillStyle = '#c8ccd6'; ctx.fillRect(8, 4, 1.6, 1.6); ctx.fillRect(lw - 10, 4, 1.6, 1.6);
  }
  function drawDog(dg, t) {
    const x = dg.x, y = S.floor, run = dg.state === 'run' || dg.state === 'off' || dg.state === 'home', b = run ? Math.abs(Math.sin(t * 16)) * 4 : 0;
    ctx.save(); ctx.translate(x, y - b); ctx.scale(dg.face, 1);
    ctx.fillStyle = '#8a6a4a'; rr(-18, -20, 34, 14, 7); ctx.fill();
    ctx.fillStyle = '#7a5a3a'; circle(18, dg.state === 'nap' ? -10 : -22, 9); ctx.fill();
    ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.ellipse(14, dg.state === 'nap' ? -12 : -26, 4, 7, -0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1a1a'; circle(26, dg.state === 'nap' ? -10 : -22, 2); ctx.fill();
    ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-16, -16); ctx.lineTo(-24, -24 + Math.sin(t * 12) * 3); ctx.stroke();
    for (const lx of [-12, 10]) ctx.fillRect(lx, -8, 4, run ? 8 - b : 8);
    ctx.restore();
    if (dg.carry) drawFood(dg.carry.k, x + dg.face * 24, y - 22, 0.7);
    if (dg.state === 'nap') text('z', x - 6, y - 34 - (t * 10 % 10), 12, 'rgba(255,255,255,0.6)', 'center', 'body');
  }
  function drawHero(st, h, t) {
    const sy = h.duck ? 0.62 : 1 - h.sq * 0.12, arms = h.carry || h.handle !== null ? 'up' : null;
    K.viking(h.id, h.x, h.y, { face: h.face, sy, stun: h.stun > 0, arms: h.handle !== null ? 'fwd' : arms, cloakV: h.vx / 400 });
    if (h.carry) {
      const top = h.y - PH * sy - 14;
      drawFood(h.carry.k, h.x, top - (h.catchT > 0 ? h.catchT * 20 : 0), 1.15);
    }
    if (h.charging) {
      const bx = h.x - 22, by = h.y - PH * sy - 50;
      ctx.fillStyle = 'rgba(20,22,52,0.85)'; rr(bx - 2, by - 2, 48, 10, 5); ctx.fill();
      ctx.fillStyle = h.charge > 0.8 ? '#e84a3a' : '#ffc53d'; rr(bx, by, 44 * h.charge, 6, 3); ctx.fill();
    }
  }
  function drawTop(st) { K.drawPops(st); }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = 'Fed ' + st.fed + ' / ' + st.target;
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, '#ffd8a0', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play || !st.h) return;
    const pl = plan(st);
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    for (const id of [0, 1]) {
      const h = st.h[id], j = advice(st, pl, h);
      const bx = K.panel(id, j.job, 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(id, 'act') + (h.carry ? (servingAt(st, h) ? 'HOLD: SLIDE' : 'TOSS') : 'PICK UP'), j.act, h.charging, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(id, 'up') + 'STEP UP', j.up, !h.ground, z);
    }
    // the rowdy meter
    {
      const x = W / 2, y = H - 34 * z, w = 200 * z;
      ctx.fillStyle = 'rgba(16,26,40,0.85)'; rr(x - w / 2 - 10 * z, y - 22 * z, w + 20 * z, 46 * z, 12 * z); ctx.fill();
      text(st.title + (st.gold ? '  ★ gold horn' : ''), x, y - 10 * z, 12 * z, st.gold ? C.gold : '#ffffff', 'center', 'body');
      const f = st.rowdy / S.rowdyMax;
      K.meter(x - w / 2, y + 2 * z, w, 9 * z, f, f > 0.7 ? '#e84a3a' : f > 0.4 ? '#ff8a2a' : '#ffc53d');
      text('ROWDY', x - w / 2 - 4 * z, y + 7 * z, 10 * z, '#ffb0a0', 'right', 'body');
      for (let k = 0; k < 4; k++) { ctx.fillStyle = k < st.k ? '#8fe3b0' : k === st.k ? C.gold : 'rgba(255,255,255,0.25)'; circle(x + w / 2 + 8 * z, y - 14 * z + k * 9 * z, 3 * z); ctx.fill(); }
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting || st.brawl > 0) return;
    const P = K.prompter(st);
    for (const id of [0, 1]) { const h = st.h[id], j = advice(st, pl, h); P.say(id, j.say, h.x, h.y - 70, j.col, j.pulse); }
  }
  // what a person should do now (prompts and chips)
  function advice(st, pl, h) {
    const o = st.h[1 - h.id], A = (what) => K.key(h.id, what), out = { job: h.ground === 'floor' && h.x < 300 ? 'kitchen' : 'tables', say: null, col: C.gold, pulse: false, act: false, up: false };
    const ft = st.fight;
    if (ft && ft.to === h.id && h.handle === null) { out.say = 'Duck! Hold ' + A('down'); out.pulse = true; return out; }
    if (h.handle !== null) {
      const pt = st.platter;
      if (!pt || pt.state !== 'carry') { out.say = 'Wait for ' + NAMES[o.id] + ' on the other handle'; out.col = '#ffe7a8'; return out; }
      const under = pt.x >= S.LL[0] + 10 && pt.x <= S.LL[1] - 10;
      out.say = under ? 'Jump together! ' + A('up') + ' at the same time' : 'Carry it ' + (pt.x > 200 ? '◀' : '▶') + ' under the steps'; out.up = under; out.pulse = under; return out;
    }
    if (pl.platter && pl.platter.state === 'floor' && !h.carry) { out.say = 'Grab a handle of the platter! ' + A('act'); out.pulse = true; out.act = true; return out; }
    if (h.carry) {
      const l = servingAt(st, h);
      if (h.carry.k === 'barrel') {
        const sk = st.skol;
        if (!sk) { out.say = 'Put it back at the rack'; out.col = '#ffe7a8'; return out; }
        if (l && l.k === sk.table) { if (sk.state === 'up') { out.say = 'SKOL! Roll it! ' + A('act'); out.pulse = true; out.act = true; } else { out.say = 'Wait for the mugs to go up...'; out.col = '#ffe7a8'; } return out; }
        out.say = 'Carry it up to table ' + 'ABC'[sk.table]; out.up = true; return out;
      }
      if (l) {
        const b = best(st, h.carry.k, l.side);
        if (b && b.t === l.k) { out.say = h.charging ? 'Let go when the arrow is under him!' : 'Hold ' + A('act') + ', let go at the right Viking'; out.act = true; return out; }
        if (b) { out.say = 'Who wants it? Table ' + 'ABC'[b.t]; out.col = '#ffe7a8'; out.up = b.t > l.k; return out; }
        out.say = 'Nobody wants ' + FOODS[h.carry.k].name + ' right now'; out.col = '#ffe7a8'; return out;
      }
      const b = best(st, h.carry.k, 'L');
      if (o.ground && o.ground !== 'floor' && !o.carry) { out.say = 'Toss it to ' + NAMES[o.id] + '! ' + A('act'); out.act = true; return out; }
      out.say = b ? 'Up to table ' + 'ABC'[b.t] + ' (jump ' + A('up') + ')' : 'Nobody wants that yet'; out.up = !!b; out.col = b ? C.gold : '#ffe7a8'; return out;
    }
    if (pl.wrestle && pl.wrestle.need.length) { /* handled by the general hint below */ }
    if (atRack(h)) { out.say = pl.pick ? 'Pick up the ' + FOODS[pl.pick.food].name + '! ' + A('act') : 'Wait for the cook...'; out.act = !!pl.pick; out.col = pl.pick ? C.gold : '#ffe7a8'; return out; }
    if (h.ground === 'floor' && h.x < 300 && o.ground && o.ground !== 'floor') { out.say = 'Food at the rack ◀'; out.col = '#ffe7a8'; return out; }
    return out;
  }

  MODES.meadhall = {
    S, plan, best, chargeFor, stopAt, servingAt, atRack, LEDGES,
    medals: { bronze: 'Feed the whole mead hall', goals: [{ key: 'time', gold: S.goldT, silver: S.silverT }] },
    medalValues() { return {}; },
    setup(st, L) {
      st.stats = { fed: 0, wrong: 0, messes: 0, brawls: 0, tantrums: 0, best: 0, tosses: 0, catches: 0, skols: 0, wrestles: 0, platters: 0, platterLost: 0, ducks: 0, bonks: 0, dog: 0, helps: 0, feastT: [] };
      st.streak = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.seed = (Math.random() * 4294967296) >>> 0 || 7;
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.h) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.h) drawTop(st); },
    hud() { const st = G.mst; if (st.h) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Vikings fed', value: String(s.fed) },
        { label: 'Wrong orders', value: String(s.wrong) },
        { label: 'Messes', value: String(s.messes) },
      ];
      out.push('Brawls: ' + s.brawls + '. Best streak of right orders: ' + s.best + '. SKOL mugs filled: ' + s.skols + '. The hall is full and happy!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  VIKING.defs.meadhall = {
    name: 'Mead Hall Feast Brawl', world: 33, kind: 'team', mode: 'meadhall', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Feast',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> walk <kbd>W</kbd> step up <kbd>S</kbd> duck, drop off a table',
      bo: '<kbd>←</kbd><kbd>→</kbd> walk <kbd>↑</kbd> step up <kbd>↓</kbd> duck, drop off a table',
      pad: 'stick walks, jump steps up,',
    },
    tip: 'Feed the crew! Pick food at the kitchen rack, toss it to your partner, and on a serving step hold the action and let go to slide it to the Viking who wants it.',
    act: { label: 'serve' },
    map: K.stubMap(),
    rooms: [
      { title: 'First Course', target: 12, tables: 2, foods: ['roast', 'fish', 'bread'], orders: 3, pat: [14, 18], done: 'First course served!',
        tip: 'One at the rack tossing, one on the steps sliding: hold the action, let go when the arrow is under the hungry Viking.' },
      { title: 'Second Helpings', target: 16, tables: 3, foods: ['roast', 'fish', 'bread', 'cheese'], orders: 4, pat: [12, 16], skol: [9, 30], done: 'Second helpings done!',
        tip: 'SKOL! When a table raises its mugs, roll the barrel down it to fill every mug.' },
      { title: 'The Rowdy Bench', target: 20, tables: 3, foods: ['roast', 'fish', 'bread', 'cheese'], orders: 4, pat: [12, 16], skol: [24], wrestle: [8, 38], fight: true, dog: true, done: 'The rowdy bench is happy!',
        tip: 'Duck (▼) when a Viking throws a roast! Arm-wrestlers need the same food from both ends at once. The dog eats dropped food.' },
      { title: 'The Chieftain\'s Feast', target: 24, tables: 3, foods: ['roast', 'fish', 'bread', 'cheese'], orders: 5, pat: [12, 16], skol: [18, 48], wrestle: [24], platter: [6, 38], fight: true, dog: true,
        tip: 'The chieftain\'s platter needs both of you: one at each handle, then jump together!' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.meadhallHop = function () { this.tone(420, 0.06, 'triangle', 0.02, 640); };
  Sfx.extra.meadhallPick = function () { this.tone(660, 0.05, 'triangle', 0.03, 880); };
  Sfx.extra.meadhallBarrel = function () { this.tone(140, 0.12, 'triangle', 0.05, 110); };
  Sfx.extra.meadhallCharge = function () { this.tone(300, 0.3, 'triangle', 0.015, 700); };
  Sfx.extra.meadhallSlide = function () { this.tone(200, 0.35, 'sawtooth', 0.01, 120); };
  Sfx.extra.meadhallRoll = function () { for (let i = 0; i < 6; i++) this.tone(90 + (i % 2) * 20, 0.1, 'triangle', 0.04, null, i * 0.12); };
  Sfx.extra.meadhallToss = function () { this.tone(500, 0.18, 'triangle', 0.025, 900); };
  Sfx.extra.meadhallCatch = function () { this.tone(780, 0.08, 'triangle', 0.035, 1040); };
  Sfx.extra.meadhallThud = function () { this.tone(120, 0.1, 'square', 0.03, 70); };
  Sfx.extra.meadhallYum = function () { [523, 659, 784].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.035, null, i * 0.06)); };
  Sfx.extra.meadhallGrumble = function () { this.tone(160, 0.3, 'sawtooth', 0.02, 110); };
  Sfx.extra.meadhallCrash = function () { [900, 1300, 700].forEach((f, i) => this.tone(f, 0.08, 'square', 0.015, f * 0.5, i * 0.04)); };
  Sfx.extra.meadhallBang = function () { this.tone(90, 0.12, 'square', 0.05, 60); this.tone(90, 0.12, 'square', 0.05, 60, 0.15); };
  Sfx.extra.meadhallOrder = function () { this.tone(880, 0.05, 'triangle', 0.015); };
  Sfx.extra.meadhallRack = function () { this.tone(1200, 0.03, 'triangle', 0.01); };
  Sfx.extra.meadhallSkol = function () { [392, 523, 392, 659].forEach((f, i) => this.tone(f, 0.12, 'square', 0.025, null, i * 0.1)); };
  Sfx.extra.meadhallBrawl = function () { for (let i = 0; i < 8; i++) this.tone(100 + Math.random() * 300, 0.08, 'square', 0.04, 60, i * 0.08); };
  Sfx.extra.meadhallWindup = function () { this.tone(300, 0.5, 'triangle', 0.02, 600); };
  Sfx.extra.meadhallBonk = function () { this.tone(220, 0.12, 'square', 0.05, 90); };
  Sfx.extra.meadhallWoof = function () { this.tone(330, 0.08, 'square', 0.04, 220); this.tone(330, 0.08, 'square', 0.04, 220, 0.14); };
  Sfx.extra.meadhallCheer = function () { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.05, null, i * 0.1)); };
})();
