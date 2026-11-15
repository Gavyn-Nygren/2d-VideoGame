/* Pip & Bo - Level 37-1 Runaway Royal Carriage (team, World 37 Medieval Tournament). */
'use strict';

/* ===== 37-1 Runaway Royal Carriage (mode 'royalcarriage', team, scrolls right fast, Gavyn's pick) =====
   A trumpet blast spooks the four horses pulling the King's golden carriage, with the King still inside. One squire has
   the reins, the other is on the roof, and the road goes straight through the market, the forest and over a half-built
   bridge. Jobs swap every stretch.
   Side view, auto-scrolling right; everything is in screen px and st.d is how far the carriage has come (an item at
   world d is drawn at screen x = d - st.d). One road, not lanes: what changes is the ground (bumps, ramps, gaps, a fork)
   and what hangs over it. The carriage sits left of centre (R.cx), the four horses run ahead on a long pole, a hay cart
   is towed behind. The mode owns the tick, the picture and the HUD (ownStep + ownHUD + noFalls).
   THE DRIVER (G.mst.drv, on the box seat): the horses never stop. ▶ = "Hyah!" (faster: ramps and gaps need speed),
     ◀ = haul the reins (down to 60%, never less, except at the royal stand). ▲ / ▼ lean the carriage: bumps, potholes,
     banked scaffolding and a loose strap tip it onto two wheels (the tilt gauge); lean against the tilt to bring it
     back. Past the red mark it tips over: a SPILL. Action = crack the whip: a 1 s burst that also scares animals off the
     road, 5 s cooldown. At a fork (stretch 2 on) ▲ / ▼ pick the upper road (shorter, rougher) or the lower one.
   THE ROOF HERO: ◀ ▶ run along the roof; jump hops forward onto the harness pole and then the lead horses' backs (three
     standing spots: roof, pole, lead horses) and back again (the way you hold or face). ▼ = duck flat. Action = shove
     the way you face; on the pole beside a loose strap, HOLD the action 0.8 s to re-hitch it.
   ON THE ROAD (each with a tell):
     LOW THINGS (inn signs, arches, washing lines, branches): a "Duck!" marker 1.1 s ahead. Standing on the roof when it
       passes sweeps the roof hero off the back into the hay cart (a TUMBLE: back on the roof in 2.5 s). Slowing down
       makes every tell longer.
     BANDITS (masked, comic): jump aboard at the back, drop from branches, or land on a lead horse, and head for the
       luggage (a bag lost), the King's crown at the window (Royal Nerves), or the reins (steering reversed until shoved
       off). Small ones go with 1 shove, the big one with the shield needs 2 shoves within 1 s.
     LOOSE STRAP: after a hard bump a trace strap flaps loose; the carriage tilts and veers until the roof hero re-hitches
       it on the pole while the driver holds the tilt steady (inside the steady band). The main two-person beat.
     RAMPS AND GAPS: a hay-cart ramp, the bridge's missing spans. The speed chip turns green when fast enough; the roof
       hero must be on the roof at take-off (on the pole or a horse they are bounced off). Too slow at a gap: a Spill.
     BUMPS, POTHOLES, BANKED SCAFFOLDING: tilt kicks and pushes.
     ANIMALS (geese, sheep) and an OX CART: the whip scatters animals; the ox cart needs the reins hauled while it
       lumbers off the road.
   FAVOURS: 20 ribbons ("Favours"): high ones hang from branches and signs (the roof hero grabs them standing on the
     roof), low ones are held out by townsfolk (grabbed from the pole or a horse's back). Never right next to a low sign.
   ROYAL NERVES (shared, the King's face): Spills, Tumbles, stolen bags, the crown, hits and long tilts fill it; clean
     driving drains it. Full: the King pulls the emergency cord, the carriage skids into a haystack and the stretch
     restarts ("STOP THIS CARRIAGE!", a Royal Fit). No game over.
   STRETCHES (rooms, about 40 s): Tournament Gate, Market Day, The King's Forest (dusk), The Unfinished Bridge (ends with
     the last strap and hauling the reins to stop at the royal stand; the King steps out dizzy and waves).
   GOLD HELP (only while both are playing, announced, counted): 3 bad events in a stretch = gold reins: the tilt gauge
     fills 40% slower and "Duck!" markers show 0.4 s earlier for the rest of the stretch.
   IDLE: no person presses anything for 12 s: "Taking a break", the road and the clock wait.
   MEDAL (MODES.royalcarriage.medals, js/medals.js): by time. Gold <= 185 s, Silver <= 320 s.
   OUTFITS (Gavyn's rule): royal coach livery, TOURNEY_OUTFITS 'livery'. Pip a footman's coat and a slipping tricorn,
     Bo a postilion's jacket and a cap with a streaming moon-tipped feather. The driver wears the driving gauntlets, the
     roof hero has a rope round the waist; straw sticks out after a Tumble into the hay.
   MODES.royalcarriage.plan(st) says what each job should do now (the prompts, the HUD chips and the brain read it).
   Everything lives inside this block; sounds are Sfx.extra.royalcarriage*. */
(() => {
  const K = TOURNEY, TAU = Math.PI * 2;
  const S = {
    cruise: 230, fast: 300, slow: 140, whipV: 330, acc: 130, haulAcc: 150, whipT: 1, whipCd: 5, scare: 460,
    leanRate: 1.7, center: 0.35, spill: 1, steady: 0.45, longTilt: 0.7, hitchT: 0.8, tumbleT: 2.5, hopT: 0.32, run: 190,
    duckTell: 1.1, goldTell: 0.4, goldTilt: 0.6, rampV: 255, airT: 0.85, oxV: 90, oxT: 3.0,
    banditV: 70, grabT: 1.2, crownT: 1.6, reinsT: 1.0, shove2: 1.0,
    nerves: { spill: 32, tumble: 14, bag: 16, crown: 26, hit: 12, long: 6, strap: 1.5, reins: 2 }, drain: 2.2, calm: 3,
    pace: 0.88, stopZone: 900, stopNear: 380, idleWait: 12, goldT: 185, silverT: 320, favours: 20, bags: 6,
  };
  // where things are on screen (x px): the carriage, the box seat, the pole spot, the lead horses, the hay cart
  const R = { gy: 446, cx: 262, roofL: 186, roofR: 334, roofY: 446 - 136, seat: 352, pole: 452, horse: 604, cart: 92, bag: 204, window: 262, front: 334 };
  const SPOT = { roof: null, pole: R.pole, horse: R.horse };
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- the script: every stretch is a list of things on the road at world distance d (px) ---------- */
  function script(k) {
    const L = [], pc = S.pace;
    const add = (d, kind, o) => { const it = Object.assign({ d: d * pc, kind, done: false }, o || {}); if (it.len) it.len *= pc; L.push(it); };
    const low = (d, what) => add(d, 'low', { what });
    const fav = (d, hi, who) => add(d, 'fav', { hi, who: who || (hi ? 'branch' : 'folk') });
    const bandit = (d, from, goal, big) => add(d, 'bandit', { from, goal, big: !!big });
    if (k === 0) {
      // Tournament Gate: duck signs, one bandit at a time, the first loose strap
      fav(900, true); low(1500, 'arch'); bandit(2100, 'back', 'bags'); add(2700, 'bump', { amt: 0.35 }); fav(3200, false);
      low(3800, 'sign'); add(4300, 'bump', { amt: 0.55, hard: true }); add(4400, 'strap'); fav(5300, true);
      bandit(5900, 'horse', 'reins'); low(6600, 'sign'); add(7000, 'geese'); fav(7500, false); bandit(7900, 'back', 'crown');
      add(8300, 'bump', { amt: 0.3 }); fav(8800, true);
      return { L, len: pc * 9300 };
    }
    if (k === 1) {
      // Market Day: stalls, geese, washing lines, bandits in pairs, a hay-cart ramp, the ox cart, a fork
      fav(800, false); low(1300, 'washing'); add(1700, 'geese'); bandit(2100, 'back', 'bags'); bandit(2250, 'horse', 'reins');
      fav(2900, true); add(3300, 'ramp', { gap: false, w: 120 }); add(3330, 'fav', { hi: true, who: 'ramp' });
      low(4100, 'washing'); add(4500, 'ox'); add(5300, 'bump', { amt: 0.55, hard: true }); add(5400, 'strap');
      add(6100, 'fork', { len: 1700 });
      // the fork's two roads: upper (shorter and bumpy) and lower (smooth); one favour on each so both pay the same
      add(6600, 'bump', { amt: 0.4, br: 'U' }); add(7000, 'fav', { hi: true, br: 'U', who: 'branch' }); add(7300, 'bump', { amt: 0.45, br: 'U' });
      add(7100, 'fav', { hi: false, br: 'L', who: 'folk' });
      bandit(8200, 'back', 'crown'); bandit(8350, 'back', 'bags', true); low(8900, 'sign'); fav(9500, false);
      return { L, len: pc * 9900 };
    }
    if (k === 2) {
      // The King's Forest (dusk): branches, bandits dropping from the trees, two forks, potholes
      low(900, 'branch'); add(1300, 'pothole', { amt: 0.4 }); fav(1800, true); bandit(2200, 'tree', 'bags');
      add(2800, 'fork', { len: 1500 }); add(3300, 'pothole', { amt: 0.45, br: 'U' }); add(3600, 'fav', { hi: true, br: 'U', who: 'branch' }); add(3800, 'pothole', { amt: 0.4, br: 'U' }); add(3700, 'fav', { hi: false, br: 'L', who: 'folk' });
      low(4700, 'branch'); add(5100, 'bump', { amt: 0.6, hard: true }); add(5200, 'strap'); fav(5600, false); bandit(5800, 'tree', 'crown');
      add(6400, 'sheep'); fav(6800, false); low(7200, 'branch');
      add(7600, 'fork', { len: 1400 }); add(8000, 'pothole', { amt: 0.45, br: 'U' }); add(8300, 'fav', { hi: true, br: 'U', who: 'branch' }); add(8400, 'fav', { hi: true, br: 'L', who: 'branch' }); add(8200, 'pothole', { amt: 0.3, br: 'L' });
      bandit(9100, 'tree', 'reins'); add(9500, 'bump', { amt: 0.5, hard: true }); add(9600, 'strap');
      return { L, len: pc * 10300 };
    }
    // The Unfinished Bridge: banked scaffolding, three gaps, everything; then the last strap and the stop
    add(700, 'bank', { amt: 0.42, len: 900 }); fav(1100, true); add(1900, 'ramp', { gap: true, w: 150 }); bandit(2300, 'back', 'bags');
    low(2900, 'beam'); add(3300, 'bump', { amt: 0.55, hard: true }); add(3400, 'strap'); fav(3700, false);
    add(4300, 'bank', { amt: -0.45, len: 800 }); bandit(4500, 'horse', 'reins'); fav(5000, false); add(5450, 'ramp', { gap: true, w: 160 }); fav(5700, true);
    low(6200, 'beam'); bandit(6600, 'back', 'crown', true); add(7200, 'bank', { amt: 0.4, len: 700 }); fav(7400, false);
    add(8100, 'ramp', { gap: true, w: 170 }); add(8700, 'bump', { amt: 0.5, hard: true }); add(8800, 'strap', { last: true });
    add(9300, 'stand');
    return { L, len: 10200 * pc, stand: 10200 * pc };
  }

  /* ---------- a stretch (one room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.drv = def.drv || 0; st.roof = 1 - st.drv; st.title = def.title || '';
    st.night = !!def.dusk; st.bridge = !!def.bridge; st.market = !!def.market; st.forest = !!def.forest;
    st.goldUsed = false; st.gold = false;
    st.bagsAtStart = st.bags; st.favAtStart = st.favs;
    labels(st);
    startStretch(st);
    K.fx(st);
  }
  function startStretch(st) {
    const sc = script(st.k);
    st.items = sc.L; st.len = sc.len; st.stand = sc.stand || 0;
    st.d = 0; st.v = S.cruise; st.T = 0;
    st.car = { tilt: 0, push: 0, kickV: 0, air: 0, airH: 0, whip: 0, cd: 0, rev: 0, veer: 0, loose: null, spill: 0, crash: 0, fork: null, forkPick: 'L', y: 0, wob: 0, lastHitT: -9, longT: 0 };
    st.hero = { zone: 'roof', x: 300, face: 1, duck: false, hop: null, tumble: 0, hold: 0, straw: 0, v: 0, act: 0 };
    st.bandits = []; st.fx2 = [];
    st.nerves = 0; st.lastBad = -9; st.state = 'go'; st.endT = 0; st.fitT = 0;
    st.rc = { bad: 0 }; st.segStart = G.time; st.bank = null;
    st.prevIn = [{}, {}]; st.cleared = false; st.party = false; st.kingOut = 0;
  }
  function labels(st) { const w = []; w[st.drv] = 'whip'; w[st.roof] = 'shove'; K.actLabels(w, 'shove'); }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.items) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    const P = G.players;
    const edge = (id, k) => { const i = P[id].input, on = k === 'jump' ? (i.jump || P[id].pendingJump) : i[k]; const was = st.prevIn[id][k]; st.prevIn[id][k] = !!on; return on && !was; };
    st.edges = [0, 1].map(id => ({ jump: P[id].pendingJump || edge(id, 'jump'), down: edge(id, 'down') }));
    if (live) {
      st.T += dt;
      driver(st, dt); roof(st, dt);
      road(st, dt); bandits(st, dt);
      nerves(st, dt);
      if (st.nerves >= 100) royalFit(st);
      if (!st.stand && st.d >= st.len && st.state === 'go') endStretch(st);
    } else if (st.state === 'spill') spillStep(st, dt);
    else if (st.state === 'fit') fitStep(st, dt);
    else if (st.state === 'end') endStep(st, dt);
    for (const p of P) { p.pendingJump = false; p.pendingAct = false; }
    if (st.hero.straw > 0) st.hero.straw -= dt;
    K.tickFx(st, dt);
    mirror(st);
  }
  function wantDir(st, id) { const i = G.players[id].input; let x = (i.right ? 1 : 0) - (i.left ? 1 : 0); return x; }

  function driver(st, dt) {
    const c = st.car, id = st.drv, p = G.players[id], i = p.input, rev = c.rev > 0 ? -1 : 1;
    if (c.cd > 0) c.cd -= dt;
    if (c.whip > 0) c.whip -= dt;
    if (c.rev > 0 && !st.bandits.some(b => b.goal === 'reins' && b.state === 'reins')) c.rev = 0;
    // speed: Hyah / haul / cruise (reversed while a bandit has the reins)
    const lr = wantDir(st, id) * rev, sd = stopDist(st), inStop = sd !== null && sd < S.stopZone;
    let target = lr > 0 ? S.fast : lr < 0 ? S.slow : S.cruise;
    // at the royal stand the reins can stop the horses (they creep on until the stand is close)
    if (lr < 0 && inStop && !c.loose) target = sd <= S.stopNear ? 0 : 60;
    // (review fix: near the stand the horses don't pick up speed again between tugs, so a driver who taps the reins
    // instead of holding them still stops; before, taps never got below a canter and the carriage lapped for ever)
    else if (lr === 0 && inStop && !c.loose) target = Math.min(st.v, S.cruise);
    if (c.whip > 0) target = S.whipV;
    if (c.crash > 0) { c.crash -= dt; target = Math.min(target, 150); }
    const acc = target < st.v ? S.haulAcc : S.acc;
    st.v = approach(st.v, target, acc * dt);
    // the whip
    if (p.pendingAct) {
      if (c.cd <= 0) {
        c.whip = S.whipT; c.cd = S.whipCd; st.stats.whips++;
        Sfx.play('royalcarriageWhip'); K.pop(st, R.seat + 40, R.roofY - 40, 'HYAH!', PCOL[id], 22);
        for (const it of st.items) if (!it.done && (it.kind === 'geese' || it.kind === 'sheep') && !it.scared) { const sx = it.d - st.d; if (sx > R.horse - 40 && sx < R.horse + S.scare) { it.scared = true; Sfx.play('royalcarriageHonk'); } }
      } else K.hint(st, id, 'The whip needs a moment... ' + Math.ceil(c.cd) + ' s', 1.2);
    }
    // a fork: ▲ / ▼ pick the road while the signpost is close
    const fk = forkAhead(st);
    if (fk && !fk.picked) {
      const e = st.edges[id];
      if (e.jump) { c.forkPick = rev > 0 ? 'U' : 'L'; Sfx.play('royalcarriageCreak'); }
      if (e.down) { c.forkPick = rev > 0 ? 'L' : 'U'; Sfx.play('royalcarriageCreak'); }
    }
    // the lean (not while choosing at a fork)
    let lean = 0;
    if (!fk || fk.picked) lean = ((i.down ? 1 : 0) - ((i.jump || i.up) ? 1 : 0)) * rev;
    st.lean = lean;
    // the tilt: pushes (bumps, banks, a loose strap) against the lean, with a little self-centring
    let push = c.push;
    if (st.bank) { push += st.bank.amt; }
    if (c.loose) push += c.loose.side * 0.38;
    if (c.kickV) { c.tilt += c.kickV * dt * 6; c.kickV = approach(c.kickV, 0, dt * 6 * Math.abs(c.kickV) + dt); }
    const grow = st.gold ? S.goldTilt : 1;
    let dTilt = push * grow - lean * S.leanRate - c.tilt * S.center;
    if (Math.sign(dTilt) === Math.sign(c.tilt) && Math.abs(dTilt) > 0) dTilt *= (st.gold ? S.goldTilt : 1);
    c.tilt += dTilt * dt;
    c.push = approach(c.push, 0, dt * 1.2);
    if (c.air > 0) c.tilt *= 1 - dt * 2;
    if (Math.abs(c.tilt) >= S.spill) spill(st, 'Over she goes! A SPILL!');
    c.veer = K.lerp(c.veer, c.loose ? Math.sin(st.clock * 3) * 6 : 0, dt * 3);
  }
  function forkAhead(st) {
    for (const it of st.items) if (it.kind === 'fork' && !it.picked) { const sx = it.d - st.d, tt = (sx - R.horse) / Math.max(60, st.v); if (tt < 1.5 + 0.3 && sx > R.cx) return it; }
    return null;
  }

  function roof(st, dt) {
    const h = st.hero, id = st.roof, p = G.players[id], i = p.input, e = st.edges[id];
    h.act = Math.max(0, h.act - dt);
    if (h.tumble > 0) {
      h.tumble -= dt;
      if (h.tumble <= 0) { h.zone = 'roof'; h.x = R.roofL + 6; h.face = 1; K.pop(st, h.x, R.roofY - 50, 'Back aboard!', PCOL[id], 16); }
      return;
    }
    if (h.hop) {
      h.hop.t += dt;
      if (h.hop.t >= S.hopT) { h.zone = h.hop.to; h.x = h.hop.toX; h.hop = null; Sfx.play('royalcarriageStep'); }
      return;
    }
    const dir = wantDir(st, id);
    if (dir) h.face = dir;
    h.duck = !!i.down;
    h.v = 0;
    if (h.zone === 'roof') {
      if (!h.duck && dir) { const nx = clamp(h.x + dir * S.run * dt, R.roofL, R.roofR); h.v = Math.abs(nx - h.x) / dt / S.run; h.x = nx; }
      if (e.jump && !h.duck) {
        const fwd = dir ? dir > 0 : h.face > 0;
        if (fwd && h.x > R.roofR - 26) hop(st, 'pole', R.pole);
        else K.hint(st, id, h.x > R.roofR - 26 ? 'Face forward (▶) and jump to hop onto the pole' : 'Run to the front of the roof to hop onto the pole', 1.4);
      }
    } else {
      if (e.jump) {
        const fwd = dir ? dir > 0 : h.face > 0;
        if (h.zone === 'pole') { if (fwd) hop(st, 'horse', R.horse); else hop(st, 'roof', R.roofR - 6); }
        else if (h.zone === 'horse' && !fwd) hop(st, 'pole', R.pole);
      }
      h.x = SPOT[h.zone];
    }
    // the action: hitch on the pole, else shove
    const strap = st.car.loose;
    if (strap && h.zone === 'pole' && i.act) {
      const steady = Math.abs(st.car.tilt) < S.steady;
      h.hold += steady ? dt : 0;
      if (!steady && Math.random() < dt * 2) K.hint(st, st.drv, 'Hold the carriage steady!', 1);
      if (h.hold >= S.hitchT) {
        st.car.loose = null; h.hold = 0; st.stats.hitches++;
        Sfx.play('royalcarriageClick'); K.pop(st, R.pole, R.gy - 120, 'Hitched!', '#d9ffd0', 20);
        if (strap.last) K.msg(st, 'Last strap hitched! Haul the reins (◀) to stop at the royal stand!', '#ffe7a8', 4);
      }
    } else h.hold = 0;
    if (p.pendingAct && !(strap && h.zone === 'pole')) shove(st);
  }
  function hop(st, to, toX) {
    const h = st.hero;
    h.hop = { from: h.zone, fromX: h.x, to, toX, t: 0 };
    h.zone = 'hop';
    Sfx.play('royalcarriageHop');
  }
  function shove(st) {
    const h = st.hero;
    h.act = 0.25;
    Sfx.play('royalcarriageWhoosh');
    let best = null, bd = 1e9;
    for (const b of st.bandits) {
      if (b.state === 'gone' || b.state === 'fall') continue;
      if (h.zone === 'roof' && b.zone === 'roof') {
        const dx = (b.x - h.x) * h.face;
        if (dx > -10 && dx < 46 && dx < bd) { best = b; bd = dx; }
      } else if (h.zone === 'horse' && b.zone === 'horse') { best = b; bd = 0; }
    }
    if (!best) return;
    if (best.big && !(best.hit > 0)) { best.hit = S.shove2; best.x += h.face * 10; Sfx.play('tourneyClang'); K.pop(st, best.x, R.roofY - 60, 'Again!', '#ffffff', 16); return; }
    shoveOff(st, best, h.face);
  }
  function shoveOff(st, b, dir) {
    b.state = 'fall'; b.t = 0; b.vx = dir * 160; b.vy = -180;
    st.stats.bandits++;
    Sfx.play('royalcarriageBonk');
    K.pop(st, b.sx || b.x, R.roofY - 50, b.big ? 'Big one off!' : 'Off you go!', '#ffffff', 18);
    if (b.goal === 'reins') st.car.rev = 0;
  }

  /* ---------- the road ---------- */
  function road(st, dt) {
    const c = st.car;
    // the upper road at a fork is shorter: the carriage gains a quarter more ground
    const onFork = st.items.find(it => it.kind === 'fork' && it.picked && st.d < it.d + it.len && st.d > it.d);
    const gain = onFork && onFork.pick === 'U' ? 1.25 : 1;
    st.d += st.v * dt * gain;
    if (c.air > 0) { c.air -= dt; c.airH = Math.sin(clamp(1 - c.air / S.airT, 0, 1) * Math.PI) * 60; if (c.air <= 0) { c.airH = 0; Sfx.play('tourneyThump'); c.kickV = (Math.random() < 0.5 ? -1 : 1) * 0.2; K.dust(st, R.cx, R.gy, 'rgba(214,190,150,0.8)', 10); } }
    if (st.bank && st.d > st.bank.end) st.bank = null;
    if (Math.random() < st.v / 300 * 0.5) K.dustTrail(st, R.cx - 70 + Math.random() * 150, R.gy, 1);
    const h = st.hero;
    for (const it of st.items) {
      if (it.done) continue;
      if (it.br && it.br !== branchAt(st, it.d)) continue;
      const sx = it.d - st.d;
      if (it.kind === 'low') {
        if (sx <= R.roofR + 6 && sx >= R.roofL - 10) {
          if (h.zone === 'roof' && !h.duck && !h.hop) tumble(st, it.what === 'washing' ? 'Wrapped in washing!' : 'Swept off the roof!');
        }
        if (sx < R.roofL - 20) { it.done = true; if (!it.hitHero) st.stats.ducks++; }
      } else if (it.kind === 'fav') {
        const hi = it.hi, reach = hi ? (h.zone === 'roof' && !h.duck && !h.hop ? h.x : null) : (h.zone === 'pole' || h.zone === 'horse' ? h.x : null);
        if (it.who === 'ramp' && !(c.air > 0)) { if (sx < R.roofL - 10) { it.done = true; st.stats.missed.push(st.k + ':ramp'); } continue; }
        if (reach !== null && Math.abs(sx - reach) < 20) { it.done = true; st.favs++; st.stats.favours++; Sfx.play('tourneyPop', 1 + st.favs * 0.02); K.spark(st, sx, hi ? R.roofY - 30 : R.gy - 90, 8, ['#ff5fa2', '#ffd23a', '#ffffff']); K.pop(st, sx, hi ? R.roofY - 60 : R.gy - 130, 'Favour!', '#ffd0ec', 16); }
        else if (sx < 60) { it.done = true; st.stats.missed.push(st.k + ':' + Math.round(it.d / S.pace) + (it.hi ? 'hi' : 'lo')); }
      } else if (it.kind === 'bump' || it.kind === 'pothole') {
        if (sx <= R.cx + 60) {
          it.done = true;
          if (c.air > 0) continue;
          const side = it.side || (Math.random() < 0.5 ? -1 : 1), fast = clamp(st.v / S.cruise, 0.6, 1.4);
          c.kickV = side * it.amt * fast; c.push += side * it.amt * 0.6 * fast;
          Sfx.play('tourneyThump'); st.shakeT = 0.25; K.dust(st, R.cx, R.gy, 'rgba(214,190,150,0.8)', 6);
          // a hard bump knocks a strap loose a moment later (the next 'strap' item in the script)
        }
      } else if (it.kind === 'strap') {
        if (sx <= R.cx) {
          it.done = true;
          if (!c.loose) { c.loose = { side: Math.random() < 0.5 ? -1 : 1, t: 0, last: !!it.last }; Sfx.play('royalcarriageSnap'); K.pop(st, R.horse, R.gy - 140, 'A strap came loose!', '#ffd0c8', 18); st.stats.straps++; }
        }
      } else if (it.kind === 'bank') {
        if (sx <= R.cx) { it.done = true; st.bank = { amt: it.amt, end: st.d + it.len }; Sfx.play('royalcarriageCreak'); }
      } else if (it.kind === 'ramp') {
        if (sx <= R.cx + 70 && !it.fired) {
          it.fired = true;
          const fast = st.v >= S.rampV || c.whip > 0;
          if (h.zone !== 'roof' && h.zone !== 'hop' && h.tumble <= 0 && (fast || !it.gap)) tumble(st, 'Bounced off at the ramp! Be on the roof for jumps.');
          if (fast) { c.air = S.airT; Sfx.play('royalcarriageWhee'); K.pop(st, R.cx, R.roofY - 80, it.gap ? 'Over the gap!' : 'Up the ramp!', '#ffffff', 22); st.stats.jumps++; }
          else if (it.gap) spill(st, 'Too slow for the gap! Into the hay below!');
          else { c.kickV = 0.4; Sfx.play('tourneyThump'); }
        }
        if (sx < -it.w) it.done = true;
      } else if (it.kind === 'geese' || it.kind === 'sheep') {
        if (it.scared) { it.run = (it.run || 0) + dt; if (it.run > 1.6) it.done = true; continue; }
        if (sx <= R.horse + 40) { it.done = true; hitThing(st, it.kind === 'geese' ? 'Honk! Geese everywhere!' : 'Baa! Through the flock!', 0.45); }
      } else if (it.kind === 'ox') {
        if (sx < W + 40) it.t = (it.t || 0) + dt;
        it.d += S.oxV * dt * (it.t > 0 ? 1 : 0);
        it.off = clamp((it.t || 0) / S.oxT, 0, 1);
        if (it.off >= 1) { it.done = true; continue; }
        if (it.d - st.d <= R.horse + 60) { it.done = true; hitThing(st, 'Crash into the ox cart! Haul the reins next time!', 0.8); }
      } else if (it.kind === 'fork') {
        if (sx <= R.horse && !it.picked) { it.picked = true; it.pick = c.forkPick; c.forkPick = 'L'; st.stats.forks.push(it.pick); Sfx.play('royalcarriageCreak'); K.pop(st, R.horse, R.gy - 150, it.pick === 'U' ? 'The upper road!' : 'The lower road!', '#ffffff', 18); }
        if (st.d > it.d + it.len) it.done = true;
      } else if (it.kind === 'bandit') {
        if (sx <= R.cx + 120) { it.done = true; spawnBandit(st, it); }
      } else if (it.kind === 'stand') {
        // the royal stand: stop in front of it (the carriage can go below 60% here)
        const sd = stopDist(st);
        if (st.v < 12 && sd <= S.stopNear && sd > -100 && !c.loose) arrive(st);
        else if (sd < -140) { st.d -= 1000; K.msg(st, 'Missed the stand! Round the lists again: haul the reins (◀) in time!', '#ffd0c8', 3.5); }
      }
    }
    if (c.loose) { c.loose.t += dt; if (Math.random() < dt * 0.6) Sfx.play('royalcarriageSnap'); }
  }
  // how far the lead horses' noses are from the royal stand (null before the last stretch)
  function stopDist(st) { return st.stand ? st.stand - st.d - (R.horse + 50) : null; }
  // which road the carriage is on at world d: 'U' or 'L' inside a fork, else null (both roads' items match nothing)
  function branchAt(st, d) {
    for (const it of st.items) if (it.kind === 'fork' && d >= it.d && d <= it.d + it.len) return it.picked ? it.pick : st.car.forkPick || 'L';
    return null;
  }
  function hitThing(st, text, kick) {
    const c = st.car;
    c.kickV = (Math.random() < 0.5 ? -1 : 1) * kick; c.crash = 0.8; st.v = Math.min(st.v, 170);
    bad(st, 'hit', text); st.stats.hits++;
    Sfx.play('royalcarriageHonk'); K.spark(st, R.horse, R.gy - 60, 14, ['#ffffff', '#f2e6c8']);
  }

  /* ---------- bandits ---------- */
  function spawnBandit(st, it) {
    const b = { from: it.from, goal: it.goal, big: it.big, state: 'board', t: 0, x: 0, zone: 'roof', hit: 0, face: 1, seed: Math.random() };
    if (it.from === 'horse' || it.goal === 'reins') { b.zone = 'horse'; b.x = R.horse; b.goal = 'reins'; }
    else if (it.from === 'tree') { b.x = rnd(R.roofL + 30, R.roofR - 20); b.drop = true; }
    else { b.x = R.roofL - 30; }
    st.bandits.push(b);
    Sfx.play('royalcarriageHey');
    const where = b.goal === 'bags' ? 'after the luggage' : b.goal === 'crown' ? 'after the crown' : 'grabbing for the reins';
    K.pop(st, b.zone === 'horse' ? R.horse : R.cx, R.roofY - 80, (b.big ? 'A BIG bandit ' : 'A bandit ') + where + '!', '#ffd0c8', 18);
  }
  function bandits(st, dt) {
    for (const b of st.bandits) {
      b.t += dt;
      if (b.hit > 0) b.hit -= dt;
      if (b.state === 'board') {
        if (b.t >= 0.5) { b.state = 'walk'; b.t = 0; if (b.zone === 'roof' && b.x < R.roofL) b.x = R.roofL; }
        continue;
      }
      if (b.state === 'walk') {
        if (b.zone === 'horse') { if (b.t >= S.reinsT) { b.state = 'reins'; b.t = 0; st.car.rev = 1; st.stats.reins++; Sfx.play('royalcarriageHey'); K.pop(st, R.horse, R.gy - 150, 'The bandit has the reins! Steering is reversed!', '#ffd0c8', 18); } continue; }
        const goalX = b.goal === 'bags' ? R.bag : R.window;
        const dx = goalX - b.x;
        b.face = dx >= 0 ? 1 : -1;
        if (Math.abs(dx) > 3) b.x += Math.sign(dx) * Math.min(Math.abs(dx), S.banditV * dt);
        else { b.state = b.goal === 'bags' ? 'grab' : 'crown'; b.t = 0; }
      } else if (b.state === 'grab') {
        if (b.t >= S.grabT) {
          if (st.bags > 0) { st.bags--; st.stats.bagsLost++; bad(st, 'bag', 'A bag of royal luggage stolen!'); }
          b.state = 'flee'; b.t = 0; b.vx = -200; b.vy = -160; b.loot = true;
        }
      } else if (b.state === 'crown') {
        if (b.t >= S.crownT) { bad(st, 'crown', 'The King\'s crown! The bandit snatched it and bolted!'); st.stats.crowns++; b.state = 'flee'; b.t = 0; b.vx = -200; b.vy = -160; b.loot = 'crown'; }
      } else if (b.state === 'reins') {
        // holds on until shoved off
      } else if (b.state === 'fall' || b.state === 'flee') {
        b.vy += 700 * dt; b.x += b.vx * dt; b.fy = (b.fy || 0) + b.vy * dt;
        if (b.t > 1.6) b.state = 'gone';
      }
    }
    st.bandits = st.bandits.filter(b => b.state !== 'gone');
  }

  /* ---------- bad things, the Royal Nerves ---------- */
  function bad(st, kind, text) {
    st.nerves = Math.min(100, st.nerves + S.nerves[kind]);
    st.lastBad = st.T; st.rc.bad++;
    if (text) K.msg(st, text, '#ffd0c8', 2.6);
    if (st.rc.bad >= 3 && !st.goldUsed && K.both(st)) {
      st.goldUsed = true; st.gold = true;
      K.goldHelp(st, 'Gold reins! The carriage tips slower and "Duck!" shows earlier for this stretch');
    }
  }
  function nerves(st, dt) {
    const c = st.car;
    if (Math.abs(c.tilt) > S.longTilt) { c.longT += dt; st.nerves += S.nerves.long * dt; } else c.longT = 0;
    if (c.loose) st.nerves += S.nerves.strap * dt;
    if (c.rev > 0) st.nerves += S.nerves.reins * dt;
    if (st.T - st.lastBad > S.calm && !c.loose && Math.abs(c.tilt) < S.steady) st.nerves = Math.max(0, st.nerves - S.drain * dt);
    st.nerves = Math.min(100, st.nerves);
  }
  function tumble(st, text) {
    const h = st.hero;
    if (h.tumble > 0) return;
    h.tumble = S.tumbleT; h.zone = 'cart'; h.hop = null; h.duck = false; h.hold = 0; h.straw = S.tumbleT + 3;
    st.stats.tumbles++; bad(st, 'tumble', text);
    Sfx.play('tourneyBoing'); K.confetti(st, R.cart, R.gy - 50, 0); for (let k = 0; k < 10; k++) K.part(st, R.cart + rnd(-20, 20), R.gy - 50, rnd(-90, 90), rnd(-200, -80), 0.9, '#f2d36b', 3, 500, 'leaf');
  }
  function spill(st, text) {
    if (st.state !== 'go') return;
    st.state = 'spill'; st.spillT = 0; st.stats.spills++;
    st.car.spillDir = Math.sign(st.car.tilt) || 1;
    bad(st, 'spill', text);
    Sfx.play('tourneyThump'); Sfx.play('tourneyWhinny'); G.shake = 0.5;
  }
  function spillStep(st, dt) {
    st.spillT += dt;
    const c = st.car;
    st.v = approach(st.v, 0, 400 * dt);
    st.d += st.v * dt;
    c.tilt = c.spillDir * (st.spillT < 0.5 ? K.lerp(1, 1.5, st.spillT / 0.5) : Math.max(0, 1.5 - (st.spillT - 1.2) * 1.5));
    if (st.spillT >= 2.2) {
      // the squires heave it upright and the horses bolt again; skip past any gap it fell at
      c.tilt = 0; c.push = 0; c.kickV = 0; c.air = 0; st.v = S.cruise; st.state = 'go';
      for (const it of st.items) if (it.kind === 'ramp' && it.fired && !it.done) { st.d = Math.max(st.d, it.d - R.cx + it.w + 40); it.done = true; }
      if (st.hero.zone === 'hop' || st.hero.zone === 'pole' || st.hero.zone === 'horse') { st.hero.zone = 'roof'; st.hero.hop = null; st.hero.x = 300; }
      K.msg(st, 'Upright again! Lean against the tilt (▲ ▼) to stop it tipping', '#ffffff', 2.4);
    }
  }
  function royalFit(st) {
    if (st.state !== 'go') return;
    st.state = 'fit'; st.fitT = 0; st.stats.fits++;
    Sfx.play('royalcarriageFit'); G.shake = 0.4;
    K.msg(st, 'STOP THIS CARRIAGE! The King pulled the cord: back to the start of ' + st.title, '#ffd0c8', 3.2);
  }
  function fitStep(st, dt) {
    st.fitT += dt;
    st.v = approach(st.v, 0, 220 * dt); st.d += st.v * dt;
    if (st.fitT >= 2.8) {
      const bags = st.bagsAtStart, favs = st.favAtStart;
      startStretch(st);
      st.bags = bags; st.favs = favs;
      K.msg(st, 'Off again! ' + st.title, '#ffffff', 2.2);
    }
  }
  function endStretch(st) {
    st.state = 'end'; st.endT = 0; st.lastRoom = false;
    st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('tourneyFanfare');
    K.pop(st, W / 2, 160, (G.level.def.done || 'Stretch done!') + ' Swap jobs!', '#ffffff', 24);
  }
  function arrive(st) {
    st.state = 'end'; st.endT = 0; st.lastRoom = true; st.v = 0;
    st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('tourneyFanfare'); Sfx.play('tourneyRoar');
  }
  function endStep(st, dt) {
    st.endT += dt;
    if (!st.lastRoom) { st.d += st.v * dt; if (st.endT > 2.2) nextRoom(); return; }
    st.kingOut = clamp((st.endT - 0.8) / 1.2, 0, 1);
    if (st.endT > 1 && !st.party) { st.party = true; Sfx.play('tourneyCheer'); K.confetti(st, W / 2, 160, 50); K.pop(st, W / 2, 140, 'The King is safe! (and very dizzy)', '#ffffff', 26); }
    if (st.endT > 3.6 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 300 }; levelClear(); }
  }
  function mirror(st) {
    const h = st.hero, rp = heroPos(st);
    K.place(st.drv, R.seat, R.roofY + 46 - st.car.airH);
    K.place(st.roof, rp.x, rp.y);
    st.run = [0, 1].map(id => (id === st.drv ? { x: st.d + R.seat, y: 0 } : { x: st.d + rp.x, y: rp.y }));
    if (h) st.run[st.roof].zone = h.zone;
  }
  function heroPos(st) {
    const h = st.hero, c = st.car, lift = c.airH;
    if (h.zone === 'cart' || h.tumble > 0) { const u = clamp(1 - h.tumble / S.tumbleT, 0, 1); return { x: K.lerp(R.cart, R.roofL + 6, K.smooth((u - 0.6) / 0.4)), y: K.lerp(R.gy - 40, R.roofY, K.smooth((u - 0.6) / 0.4)) - lift }; }
    if (h.hop) {
      const u = clamp(h.hop.t / S.hopT, 0, 1), y0 = spotY(h.hop.from), y1 = spotY(h.hop.to);
      return { x: K.lerp(h.hop.fromX, h.hop.toX, u), y: K.lerp(y0, y1, u) - Math.sin(u * Math.PI) * 30 - lift };
    }
    return { x: h.x, y: spotY(h.zone) - lift };
  }
  function spotY(z) { return z === 'pole' ? R.gy - 52 : z === 'horse' ? R.gy - 66 : R.roofY; }

  /* ---------- what to do next (the prompts, the HUD chips and the computer brain all read this) ---------- */
  function plan(st) {
    if (st.planMemo && st.planMemo.n === G.tickN && st.planMemo.k === st.k) return st.planMemo.p;
    const p = planNow(st);
    st.planMemo = { n: G.tickN, k: st.k, p };
    return p;
  }
  function planNow(st) {
    const c = st.car, h = st.hero, v = Math.max(60, st.v), tell = S.duckTell + (st.gold ? S.goldTell : 0);
    const ahead = [];
    for (const it of st.items) {
      if (it.done) continue;
      if (it.br && it.br !== branchAt(st, it.d)) continue;
      const sx = it.d - st.d;
      const atRoof = (sx - R.roofR) / v, atCar = (sx - R.cx - 60) / v, atHorse = (sx - R.horse) / v;
      if (it.kind === 'low') ahead.push({ kind: 'low', t: atRoof, clear: (sx - R.roofL + 24) / v, job: 'roof', tell: atRoof < tell });
      else if (it.kind === 'fav') ahead.push({ kind: 'fav', hi: it.hi, ramp: it.who === 'ramp', t: (sx - (it.hi ? 280 : R.pole)) / v, sx, job: 'roof' });
      else if (it.kind === 'ramp') ahead.push({ kind: 'ramp', gap: it.gap, t: (sx - R.cx - 70) / v, job: 'both' });
      else if (it.kind === 'geese' || it.kind === 'sheep') { if (!it.scared) ahead.push({ kind: 'animals', t: atHorse, sx, job: 'driver' }); }
      else if (it.kind === 'ox') ahead.push({ kind: 'ox', t: (it.d - st.d - R.horse - 60) / Math.max(10, v - S.oxV), near: sx < W + 380, off: it.off || 0, job: 'driver' });
      else if (it.kind === 'bump' || it.kind === 'pothole') ahead.push({ kind: 'bump', t: atCar, job: 'driver' });
      else if (it.kind === 'fork') ahead.push({ kind: 'fork', t: atHorse, picked: !!it.picked, job: 'driver' });
      else if (it.kind === 'bank') ahead.push({ kind: 'bank', t: atCar, amt: it.amt, job: 'driver' });
    }
    ahead.sort((a, b) => a.t - b.t);
    const out = { ahead, drv: { speed: 'cruise', lean: 0, whip: false, fork: null }, roof: { zone: 'roof', x: 300, duck: false, act: false, hold: false, why: 'ride', jump: false } };
    const nextRamp = ahead.find(a => a.kind === 'ramp' && a.t > -0.1);
    const nextLow = ahead.find(a => a.kind === 'low' && a.clear > 0);
    const ox = ahead.find(a => a.kind === 'ox');
    const animals = ahead.find(a => a.kind === 'animals' && a.t < (S.scare - 40) / v && a.t > 0);
    // ---- the driver
    const D = out.drv;
    const sd = stopDist(st);
    if (sd !== null && sd < S.stopZone) D.speed = c.loose ? 'cruise' : sd < 330 ? 'stop' : 'cruise';
    else if (ox && ox.near && ox.off < 1) D.speed = 'slow';
    else if (nextRamp && nextRamp.t < 2.2) D.speed = 'fast';
    else if (h.zone === 'pole' && c.loose) D.speed = 'cruise';
    else if (nextLow && nextLow.t < 1.6 && h.zone === 'roof' && !h.duck && st.roofLate) D.speed = 'slow';
    if (animals && c.cd <= 0) D.whip = true;
    if (c.rev > 0) D.speed = 'cruise';
    // lean against the tilt (and its trend), with a dead band so it doesn't flutter
    const trend = c.tilt + c.kickV * 0.25 + (st.bank ? st.bank.amt : 0) * 0.5 + (c.loose ? c.loose.side * 0.25 : 0) + c.push * 0.3;
    D.lean = trend > 0.12 ? 1 : trend < -0.12 ? -1 : 0;
    const fk = forkAhead(st);
    if (fk && !fk.picked) D.fork = 'L'; // the smoother road (the computer driver's default)
    D.tiltUrgent = Math.abs(c.tilt) > 0.55;
    // ---- the roof hero: the soonest threat first (duck, then the reins bandit, the crown, the luggage, a strap)
    const Rf = out.roof;
    const bandit = st.bandits.filter(b => b.state !== 'fall' && b.state !== 'flee' && b.state !== 'gone');
    const reinsB = bandit.find(b => b.zone === 'horse');
    const roofB = bandit.filter(b => b.zone === 'roof').sort((a, b) => (a.goal === 'crown' ? 0 : 1) - (b.goal === 'crown' ? 0 : 1));
    const rampSoon = nextRamp && nextRamp.t < 1.4;
    const lowSoon = nextLow && nextLow.t < 0.45;
    if (rampSoon) { Rf.zone = 'roof'; Rf.x = 300; Rf.why = 'ramp'; }
    else if (reinsB) { Rf.zone = 'horse'; Rf.why = 'reins'; Rf.act = h.zone === 'horse'; }
    else if (roofB.length) {
      // stand beside the bandit on the side you're already on, face it, shove
      const b = roofB[0], dx = (b.x - h.x) * h.face;
      // (the side is sticky within 10 px, so a hero standing right on the bandit doesn't flip round every step)
      let side = st.sideMemo || 1; if (Math.abs(h.x - b.x) > 10 || !st.sideMemo) side = h.x >= b.x ? 1 : -1; st.sideMemo = side;
      Rf.zone = 'roof'; Rf.x = clamp(b.x + side * 20, R.roofL, R.roofR); Rf.face = -side; Rf.why = b.goal; Rf.target = b;
      Rf.act = h.zone === 'roof' && dx > -4 && dx < 40;
    }
    else if (c.loose) { Rf.zone = 'pole'; Rf.why = 'strap'; Rf.hold = h.zone === 'pole'; }
    else {
      // favours, but only when nothing else is close
      const fav = ahead.find(a => a.kind === 'fav' && a.t > -0.1 && a.t < 2.2);
      if (fav && !fav.hi) { Rf.zone = 'pole'; Rf.why = 'favour'; }
      else { Rf.zone = 'roof'; Rf.x = fav && fav.hi ? 300 : 300; Rf.why = fav ? 'favour' : 'ride'; }
    }
    if (lowSoon && (h.zone === 'roof' || Rf.zone === 'roof')) { Rf.duck = h.zone === 'roof'; if (Rf.duck) { Rf.act = false; Rf.why = 'duck'; } }
    // a low thing passing over the roof while you're out on the pole is fine: stay put until it has passed
    if (nextLow && nextLow.t < 0.9 && h.zone !== 'roof' && Rf.zone === 'roof' && !rampSoon) Rf.zone = h.zone === 'hop' ? 'roof' : h.zone;
    return out;
  }

  /* ---------- drawing ---------- */
  function draw(st) {
    const t = st.clock, c = st.car, night = st.night;
    const shake = st.shakeT > 0 ? (st.shakeT -= 1 / 60, (Math.random() - 0.5) * 5) : 0;
    K.sky(st.d, t, { dusk: night });
    K.hills(st.d, { base: 330, castle: st.k >= 2, dim: night ? 0.35 : 0 });
    // scenery by stretch
    if (st.k === 0) { K.pavilions(st.d, 380, { par: 0.3, s: 0.8 }); K.pennants(-((st.d * 0.5) % 400), -((st.d * 0.5) % 400) + 1400, 250, t, { sag: 30 }); }
    else if (st.k === 1) drawTown(st, t);
    else if (st.k === 2) drawForest(st, t, true);
    else drawRavine(st, t);
    ctx.save(); ctx.translate(shake, 0);
    drawRoad(st, t);
    // items that stand on the road or beside it (behind the carriage)
    for (const it of st.items) { const sx = it.d - st.d; if (sx < -200 || sx > W + 260) continue; drawGroundItem(st, it, sx, t); }
    drawStand(st, t);
    drawCart(st, t);
    drawRig(st, t);
    for (const b of st.bandits) drawBandit(st, b, t);
    drawHero(st, t);
    // overhead things in front
    for (const it of st.items) { const sx = it.d - st.d; if (sx < -260 || sx > W + 260) continue; if (it.kind === 'low') drawLow(st, it, sx, t); if (it.kind === 'fav' && !it.done) drawFav(st, it, sx, t); }
    drawTells(st, t);
    K.drawParts(st, 0);
    ctx.restore();
    if (night) { ctx.fillStyle = 'rgba(30,20,60,0.18)'; ctx.fillRect(0, 0, W, H); }
  }
  function drawTown(st, t) {
    const off = st.d * 0.45, step = 150;
    for (let i = Math.floor(off / step) - 1; i < Math.floor(off / step) + 9; i++) {
      const x = i * step - off, h = 110 + K.hash(i) * 70, col = ['#f2e2c0', '#e8d0a8', '#f6ead2'][i % 3];
      ctx.fillStyle = col; ctx.fillRect(x, 400 - h, 130, h);
      // timber framing
      ctx.strokeStyle = '#5e3a1c'; ctx.lineWidth = 4; ctx.strokeRect(x, 400 - h, 130, h);
      ctx.beginPath(); ctx.moveTo(x, 400 - h * 0.5); ctx.lineTo(x + 130, 400 - h * 0.5); ctx.moveTo(x + 65, 400 - h); ctx.lineTo(x + 65, 400); ctx.moveTo(x, 400 - h); ctx.lineTo(x + 65, 400 - h * 0.5); ctx.stroke();
      ctx.fillStyle = ['#b8463a', '#8a5a3a', '#6a6a7a'][(i + 1) % 3]; ctx.beginPath(); ctx.moveTo(x - 10, 400 - h); ctx.lineTo(x + 65, 400 - h - 50); ctx.lineTo(x + 140, 400 - h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4a6a8a'; ctx.fillRect(x + 20, 400 - h + 18, 24, 20); ctx.fillRect(x + 86, 400 - h + 18, 24, 20);
      // a market stall awning
      if (i % 2 === 0) { for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? '#f6ecd0' : K.BANNER[i % 5]; ctx.fillRect(x + 10 + k * 22, 352, 22, 16); } ctx.fillStyle = '#8a5a32'; ctx.fillRect(x + 10, 368, 4, 34); ctx.fillRect(x + 116, 368, 4, 34); }
    }
    K.pennants(-((st.d * 0.6) % 300), -((st.d * 0.6) % 300) + 1300, 230, t, { sag: 22 });
  }
  function drawForest(st, t, dusk) {
    for (const [par, col, base, sc] of [[0.25, dusk ? '#3a5a4a' : '#5a9a5a', 360, 0.8], [0.55, dusk ? '#24402e' : '#3e7a3e', 400, 1.1]]) {
      const off = st.d * par, step = 90 * sc;
      for (let i = Math.floor(off / step) - 1; i < Math.floor(off / step) + 14; i++) {
        const x = i * step - off + K.hash(i * 7) * 30, h = (120 + K.hash(i) * 90) * sc;
        ctx.fillStyle = dusk ? '#2a1e14' : '#6a4a2a'; ctx.fillRect(x - 6 * sc, base - h * 0.4, 12 * sc, h * 0.4 + 20);
        ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, base - h * 0.6, 46 * sc, h * 0.42, 0, 0, TAU); ctx.fill();
      }
    }
  }
  function drawRavine(st, t) {
    // a river far below the half-built bridge, scaffolding towers going past
    ctx.fillStyle = '#5a7a9a'; ctx.fillRect(0, 470, W, 70);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
    for (let k = 0; k < 8; k++) { const x = ((k * 140 - st.d * 0.9) % (W + 140) + W + 140) % (W + 140) - 70; ctx.beginPath(); ctx.moveTo(x, 500 + (k % 3) * 10); ctx.lineTo(x + 40, 500 + (k % 3) * 10); ctx.stroke(); }
    const off = st.d * 0.6;
    for (let i = Math.floor(off / 260) - 1; i < Math.floor(off / 260) + 6; i++) {
      const x = i * 260 - off;
      ctx.strokeStyle = '#8a6a42'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x, 470); ctx.lineTo(x, 300); ctx.moveTo(x + 60, 470); ctx.lineTo(x + 60, 300); ctx.moveTo(x, 470); ctx.lineTo(x + 60, 390); ctx.lineTo(x, 300); ctx.stroke();
    }
  }
  function roadY(st, sx) {
    // the fork's upper road climbs a little hillside track; the lower road dips
    const d = st.d + sx;
    for (const it of st.items) if (it.kind === 'fork' && d > it.d - 300 && d < it.d + it.len + 300) {
      const pick = it.picked ? it.pick : st.car.forkPick || 'L';
      const u = K.smooth(clamp((d - it.d) / 300, 0, 1)) * K.smooth(clamp((it.d + it.len - d) / 300 + 1, 0, 1));
      return R.gy + (pick === 'U' ? -36 : 14) * u;
    }
    return R.gy;
  }
  function drawRoad(st, t) {
    const night = st.night;
    if (st.bridge) {
      // bridge deck: planks with gaps where spans are missing
      for (let x = -((st.d) % 30) - 30; x < W + 30; x += 30) {
        const d = st.d + x + 15;
        if (st.items.some(it => it.kind === 'ramp' && it.gap && d > it.d + 10 && d < it.d + it.w)) continue;
        ctx.fillStyle = (Math.floor(d / 30) % 2) ? '#a0683a' : '#8a5a32'; ctx.fillRect(x, R.gy, 29, 14);
      }
      ctx.fillStyle = '#5e3a1c'; for (let x = -((st.d) % 120) - 120; x < W + 120; x += 120) ctx.fillRect(x, R.gy + 14, 10, 60);
      return;
    }
    ctx.fillStyle = night ? '#4a6a3a' : K.COL.grass; ctx.fillRect(0, R.gy - 10, W, H - R.gy + 10);
    // the road surface follows roadY
    ctx.fillStyle = night ? '#8a7050' : K.COL.dirt; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, roadY(st, x) - 2);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(120,90,50,0.35)';
    for (let k = 0; k < 14; k++) { const x = ((k * 97 - st.d) % (W + 100) + W + 100) % (W + 100) - 50; ctx.fillRect(x, roadY(st, x) + 14 + (k % 3) * 18, 26, 3); }
  }
  function drawGroundItem(st, it, sx, t) {
    const y = roadY(st, sx);
    if (it.kind === 'bump' && !it.done) { ctx.fillStyle = '#8a7050'; ctx.beginPath(); ctx.ellipse(sx, y, 26, 8, 0, Math.PI, TAU); ctx.fill(); ctx.fillStyle = '#9a968c'; ctx.beginPath(); ctx.ellipse(sx + 4, y - 3, 9, 6, 0, 0, TAU); ctx.fill(); }
    else if (it.kind === 'pothole' && !it.done) { ctx.fillStyle = '#4a3a2a'; ctx.beginPath(); ctx.ellipse(sx, y + 4, 28, 6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(120,160,200,0.5)'; ctx.beginPath(); ctx.ellipse(sx, y + 5, 20, 3, 0, 0, TAU); ctx.fill(); }
    else if (it.kind === 'ramp') {
      if (it.gap) {
        // the missing span: posts and a drop
        ctx.fillStyle = '#5e3a1c'; ctx.fillRect(sx - 4, y, 8, 60); ctx.fillRect(sx + it.w - 4, y, 8, 60);
        ctx.fillStyle = '#a0683a'; ctx.beginPath(); ctx.moveTo(sx - 60, y); ctx.lineTo(sx, y - 16); ctx.lineTo(sx, y); ctx.closePath(); ctx.fill();
        text('GAP', sx + it.w / 2, y + 30, 14, '#ffffff', 'center', 'body');
      } else {
        // a hay cart tipped up as a ramp
        ctx.fillStyle = '#8a5a32'; ctx.beginPath(); ctx.moveTo(sx - 60, y); ctx.lineTo(sx + it.w - 40, y - 34); ctx.lineTo(sx + it.w - 40, y); ctx.closePath(); ctx.fill();
        K.hay(sx + it.w - 20, y, 0.9);
      }
    } else if (it.kind === 'geese' || it.kind === 'sheep') {
      const run = it.run || 0, n = it.kind === 'geese' ? 5 : 4;
      for (let k = 0; k < n; k++) {
        const bx = sx + k * 26 - 30 + (it.scared ? run * (k % 2 ? 160 : -60) : Math.sin(t * 3 + k) * 3), by = y - 4 - (it.scared ? Math.abs(Math.sin(run * 10 + k)) * 16 + run * 30 * (k % 2) : 0);
        if (it.kind === 'geese') { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(bx, by - 8, 10, 7, 0, 0, TAU); ctx.fill(); ctx.fillRect(bx + 6, by - 22, 3, 14); ctx.fillStyle = '#ff9a2a'; ctx.fillRect(bx + 8, by - 22, 5, 2.5); ctx.fillStyle = '#1c1a36'; circ(bx + 8, by - 20, 1); ctx.fill(); }
        else { ctx.fillStyle = '#f2f0ea'; for (let m = 0; m < 4; m++) { circ(bx - 6 + m * 4, by - 12 + (m % 2) * 3, 6); ctx.fill(); } ctx.fillStyle = '#2a2236'; ctx.fillRect(bx + 8, by - 16, 7, 8); ctx.fillRect(bx - 6, by - 6, 2, 6); ctx.fillRect(bx + 4, by - 6, 2, 6); }
      }
    } else if (it.kind === 'ox' && !it.done) {
      const off = it.off || 0, oy = y - off * 60, ox = it.d - st.d;
      ctx.save(); ctx.translate(ox, oy); ctx.scale(1 - off * 0.25, 1 - off * 0.25);
      ctx.fillStyle = '#8a5a32'; ctx.fillRect(-10, -50, 80, 34); ctx.fillStyle = '#f2cf5a'; ctx.fillRect(-8, -64, 76, 16);
      ctx.fillStyle = '#5e3a1c'; circ(4, -14, 14); ctx.fill(); circ(56, -14, 14); ctx.fill();
      ctx.fillStyle = '#7a5a3a'; ctx.beginPath(); ctx.ellipse(110, -40, 30, 18, 0, 0, TAU); ctx.fill(); ctx.fillRect(132, -52, 18, 18);
      ctx.fillStyle = '#f2e6c8'; ctx.beginPath(); ctx.moveTo(140, -52); ctx.lineTo(150, -64); ctx.lineTo(146, -50); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a3a2a'; for (const lx of [90, 100, 120, 128]) ctx.fillRect(lx, -24, 5, 24);
      ctx.restore();
    } else if (it.kind === 'fork' && !it.done) {
      const px = it.d - st.d - 120;
      if (px > -80 && px < W + 80) {
        ctx.fillStyle = '#5e3a1c'; ctx.fillRect(px - 3, y - 110, 6, 110);
        ctx.fillStyle = '#c88a52'; ctx.beginPath(); ctx.moveTo(px - 30, y - 110); ctx.lineTo(px + 40, y - 110); ctx.lineTo(px + 52, y - 100); ctx.lineTo(px + 40, y - 90); ctx.lineTo(px - 30, y - 90); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(px - 30, y - 84); ctx.lineTo(px + 40, y - 84); ctx.lineTo(px + 52, y - 74); ctx.lineTo(px + 40, y - 64); ctx.lineTo(px - 30, y - 64); ctx.closePath(); ctx.fill();
        text('▲ short, bumpy', px + 10, y - 100, 10, '#3a2010', 'center', 'body');
        text('▼ smooth', px + 10, y - 74, 10, '#3a2010', 'center', 'body');
      }
    }
  }
  function drawLow(st, it, sx, t) {
    const top = 120, bot = R.roofY - 6;
    if (it.what === 'arch') {
      // a gatehouse: two towers down to the road and a crenellated stone lintel over the roof
      const lt = bot - 70;
      for (const tx of [sx - 92, sx + 64]) {
        ctx.fillStyle = '#8e8c82'; ctx.fillRect(tx, lt - 30, 28, R.gy - lt + 30);
        ctx.fillStyle = '#a8a69c'; for (let k = 0; k < 2; k++) ctx.fillRect(tx + k * 16, lt - 42, 12, 12);
        ctx.fillStyle = '#5e5c56'; for (let yy = lt; yy < R.gy - 10; yy += 22) ctx.fillRect(tx, yy, 28, 2);
      }
      ctx.fillStyle = '#a8a69c'; ctx.beginPath(); ctx.moveTo(sx - 64, lt); ctx.lineTo(sx + 64, lt); ctx.lineTo(sx + 64, bot - 4);
      ctx.quadraticCurveTo(sx, bot - 34, sx - 64, bot - 4); ctx.closePath(); ctx.fill();
      for (let k = 0; k < 5; k++) ctx.fillRect(sx - 60 + k * 26, lt - 12, 16, 12);
      ctx.fillStyle = '#5e5c56'; ctx.fillRect(sx - 64, lt + 20, 128, 2);
      ctx.fillStyle = '#d8323a'; ctx.fillRect(sx - 30, lt + 4, 60, 12); ctx.fillStyle = '#ffd23a'; ctx.fillRect(sx - 30, lt + 2, 60, 3);
      K.heraldShield(sx, lt + 36, 12, { col: '#7a3aa8', charge: 'crown' });
    } else if (it.what === 'sign') {
      ctx.fillStyle = '#5e3a1c'; ctx.fillRect(sx + 40, top + 20, 8, 340); ctx.fillRect(sx - 30, top + 20, 78, 6);
      ctx.save(); ctx.translate(sx, top + 26); ctx.rotate(Math.sin(t * 3) * 0.12);
      ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-20, 20); ctx.moveTo(20, 0); ctx.lineTo(20, 20); ctx.stroke();
      ctx.fillStyle = '#c88a52'; ctx.fillRect(-34, 20, 68, bot - top - 50); ctx.strokeRect(-34, 20, 68, bot - top - 50);
      text('THE', 0, 40, 11, '#3a2010', 'center', 'body'); text('JOLLY', 0, 56, 13, '#3a2010', 'center', 'body'); text('LANCE', 0, 72, 13, '#3a2010', 'center', 'body');
      ctx.restore();
    } else if (it.what === 'washing') {
      ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx - 120, bot - 50); ctx.quadraticCurveTo(sx, bot - 4, sx + 120, bot - 50); ctx.stroke();
      const cols = ['#ffffff', '#ff9fb5', '#9fd0ff', '#ffe08a', '#c8f0b0'];
      for (let k = -3; k <= 3; k++) { const x = sx + k * 30, yy = bot - 26 + Math.abs(k) * -6; ctx.fillStyle = cols[(k + 5) % 5]; ctx.beginPath(); ctx.moveTo(x - 10, yy); ctx.lineTo(x + 10, yy); ctx.lineTo(x + 12 + Math.sin(t * 6 + k) * 3, yy + 22); ctx.lineTo(x - 12 + Math.sin(t * 6 + k) * 3, yy + 22); ctx.closePath(); ctx.fill(); }
    } else if (it.what === 'branch') {
      ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(sx + 140, top - 20); ctx.quadraticCurveTo(sx + 40, bot - 40, sx - 70, bot - 8); ctx.stroke();
      ctx.fillStyle = '#2e5a32'; for (let k = 0; k < 6; k++) { circ(sx - 60 + k * 36, bot - 20 - k * 14 + Math.sin(t * 2 + k) * 2, 22); ctx.fill(); }
    } else if (it.what === 'beam') {
      K.timber(sx - 80, bot - 18, 160, 18, { dark: true });
      ctx.fillStyle = '#5e3a1c'; ctx.fillRect(sx - 80, bot - 18, 8, 400); ctx.fillRect(sx + 72, bot - 18, 8, 400);
    }
  }
  function drawFav(st, it, sx, t) {
    if (it.br && it.br !== branchAt(st, it.d)) return;
    const hi = it.hi, y = hi ? R.roofY - 34 : R.gy - 96, sway = Math.sin(t * 4 + it.d) * 4;
    if (it.who === 'folk') {
      // a townsperson holding a ribbon out from the roadside
      const fy = roadY(st, sx);
      ctx.fillStyle = K.BANNER[Math.floor(it.d) % 7]; ctx.fillRect(sx + 24, fy - 46, 14, 30); ctx.fillStyle = '#f2c8a0'; circ(sx + 31, fy - 54, 7); ctx.fill();
      ctx.strokeStyle = K.BANNER[Math.floor(it.d) % 7]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx + 28, fy - 40); ctx.lineTo(sx + 6, y + 6); ctx.stroke();
    } else if (it.who === 'branch' || it.who === 'ramp') { ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx, it.who === 'ramp' ? y - 40 : 100); ctx.lineTo(sx + sway * 0.3, y - 10); ctx.stroke(); if (it.who === 'branch') { ctx.fillStyle = 'rgba(46,90,50,0.9)'; circ(sx, 100, 26); ctx.fill(); } }
    // the favour: a pink-and-gold rosette with ribbons
    const fx = sx + sway * 0.3, fy2 = it.who === 'ramp' ? y - 50 : y;
    ctx.fillStyle = '#ff5fa2'; ctx.beginPath(); ctx.moveTo(fx - 3, fy2); ctx.lineTo(fx - 8, fy2 + 16); ctx.lineTo(fx - 1, fy2 + 12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(fx + 3, fy2); ctx.lineTo(fx + 8, fy2 + 16); ctx.lineTo(fx + 1, fy2 + 12); ctx.closePath(); ctx.fill();
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + t; ctx.fillStyle = k % 2 ? '#ffd23a' : '#ff8ac0'; circ(fx + Math.cos(a) * 6, fy2 - 6 + Math.sin(a) * 6, 3.4); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; circ(fx, fy2 - 6, 3.4); ctx.fill();
  }
  function drawStand(st, t) {
    if (!st.stand) return;
    const sx = st.stand - st.d;
    if (sx > W + 400 || sx < -500) return;
    K.crowd(sx - 60, sx + 340, R.gy - 40, t, { rows: 4, mood: st.state === 'end' ? 'cheer' : 'wave', roof: true, royal: true, seed: 7 });
    ctx.fillStyle = '#d8323a'; ctx.fillRect(sx - 70, R.gy - 40, 420, 40);
    text('STOP!', sx - 40, R.gy - 150, 22, C.gold, 'center', 'display');
  }
  function drawCart(st, t) {
    // the hay cart towed behind
    const y = R.gy - st.car.airH * 0.6, x = R.cart;
    ctx.strokeStyle = '#5e3a1c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 40, y - 30); ctx.lineTo(R.roofL, y - 32); ctx.stroke();
    ctx.fillStyle = '#8a5a32'; ctx.fillRect(x - 46, y - 44, 92, 22);
    ctx.fillStyle = K.COL.hay; ctx.beginPath(); ctx.moveTo(x - 46, y - 44); ctx.quadraticCurveTo(x, y - 74, x + 46, y - 44); ctx.closePath(); ctx.fill();
    const wa = st.d / 22;
    for (const wx of [x - 26, x + 26]) wheel(wx, y - 14, 14, wa);
  }
  function wheel(x, y, r, a) {
    ctx.fillStyle = '#3a2010'; circ(x, y, r); ctx.fill();
    ctx.fillStyle = '#c88a52'; circ(x, y, r - 3); ctx.fill();
    ctx.strokeStyle = '#5e3a1c'; ctx.lineWidth = 2; ctx.beginPath(); for (let k = 0; k < 6; k++) { const b = a + k * Math.PI / 3; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(b) * (r - 3), y + Math.sin(b) * (r - 3)); } ctx.stroke();
    ctx.fillStyle = '#ffd23a'; circ(x, y, 3); ctx.fill();
  }
  function drawRig(st, t) {
    const c = st.car, lift = c.airH, gy = R.gy - lift, ph = st.d / 140, sp = clamp(st.v / S.fast, 0, 1), gold = st.gold;
    // the horses: the far pair (darker) then the near pair; lead pair at R.horse, wheel pair behind them
    const hp = (k, far) => ({ x: (k ? R.horse : R.horse - 120) + (far ? 14 : 0) + c.veer * (far ? -1 : 1) * (c.loose && k ? 1 : 0.3), y: gy - (far ? 6 : 0) });
    const coats = [['#6a4a2a', '#4a3018'], ['#f2ece0', '#c8c0b0'], ['#3a2a20', '#22180e'], ['#a8683a', '#7a4a20']];
    const rig = [];
    for (const far of [true, false]) for (const k of [0, 1]) {
      const q = hp(k, far), co = coats[(k * 2 + (far ? 1 : 0)) % 4];
      ctx.save(); if (far) ctx.globalAlpha = 0.85;
      const o = K.horse(q.x, q.y, { phase: ph + k * 0.27 + (far ? 0.13 : 0), speed: sp, coat: co[0], coatDark: co[1], s: 0.86, harness: true, gold, mane: k ? '#f2e6c8' : '#2a1a10' });
      ctx.restore();
      if (!far) rig.push(o);
    }
    // the pole and traces
    ctx.strokeStyle = '#5e3a1c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(R.front - 4, gy - 40); ctx.lineTo(R.horse + 20, gy - 46); ctx.stroke();
    // the loose strap flaps
    if (c.loose) {
      const lx = R.pole + 30, ly = gy - 50;
      ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.quadraticCurveTo(lx + 20, ly + 12 + Math.sin(t * 20) * 8, lx + 40 + Math.sin(t * 14) * 6, ly + 26); ctx.stroke();
      text('!', R.horse - 40, gy - 130 + Math.sin(t * 8) * 4, 26, '#ff5a4a', 'center', 'display');
    }
    // the carriage: tall, gold, top-heavy, tilting about the wheel on the low side
    const tilt = c.tilt * 0.32 + Math.sin(st.clock * 13) * 0.01 * sp, piv = tilt > 0 ? R.cx + 80 : R.cx - 80;
    ctx.save(); ctx.translate(piv, gy); ctx.rotate(tilt); ctx.translate(-piv, -gy);
    const L = R.roofL - 6, Rr = R.roofR + 4, top = R.roofY + 4 - lift;
    const wa = st.d / 26;
    wheel(L + 30, gy - 24, 24, wa); wheel(Rr - 30, gy - 22, 22, wa);
    ctx.fillStyle = '#5e3a1c'; ctx.fillRect(L + 20, gy - 50, Rr - L - 40, 8);
    // the body
    const bg = ctx.createLinearGradient(0, top, 0, gy - 44);
    bg.addColorStop(0, gold ? '#fff0a0' : '#ffe07a'); bg.addColorStop(1, gold ? '#e8a82a' : '#c8902a');
    ctx.fillStyle = bg; ctx.strokeStyle = '#7a5010'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(L + 6, top + 12); ctx.lineTo(Rr - 6, top + 12); ctx.quadraticCurveTo(Rr + 6, gy - 70, Rr - 14, gy - 48); ctx.lineTo(L + 14, gy - 48); ctx.quadraticCurveTo(L - 6, gy - 70, L + 6, top + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    // the roof rail and luggage
    ctx.fillStyle = '#7a3aa8'; ctx.fillRect(L + 2, top + 4, Rr - L - 4, 9); ctx.fillStyle = '#ffd23a'; ctx.fillRect(L + 2, top + 2, Rr - L - 4, 3);
    for (let k = 0; k < st.bags; k++) { const bx = R.bag - 16 + (k % 3) * 12, by = top - 2 - Math.floor(k / 3) * 10; ctx.fillStyle = ['#8a4a2a', '#5a6a8a', '#7a5a3a'][k % 3]; ctx.fillRect(bx - 5, by - 8, 11, 9); ctx.fillStyle = '#ffd23a'; ctx.fillRect(bx - 1, by - 9, 3, 2); }
    // the window and the King
    const wx = R.window, wy = top + 30;
    ctx.fillStyle = '#4a2a5a'; rr(wx - 26, wy, 52, 40, 8); ctx.fill();
    if (st.kingOut <= 0) drawKing(st, wx, wy + 24, t);
    else { ctx.fillStyle = '#2a1a3a'; ctx.fillRect(wx - 22, wy + 4, 44, 32); }
    ctx.strokeStyle = '#7a5010'; ctx.lineWidth = 3; rr(wx - 26, wy, 52, 40, 8); ctx.stroke();
    // the crest on the door
    K.heraldShield(wx + 50, wy + 30, 10, { col: '#7a3aa8', charge: 'crown' });
    K.heraldShield(wx - 50, wy + 30, 10, { col: '#7a3aa8', charge: 'crown' });
    // the box seat in front
    ctx.fillStyle = '#5e3a1c'; ctx.fillRect(Rr - 10, top + 40, 36, 8); ctx.fillRect(Rr + 18, top + 46, 6, 50);
    ctx.restore();
    // the driver on the box seat with the reins
    const dId = st.drv, dx = R.seat, dy = R.roofY + 46 - lift;
    const lean = st.lean || 0;
    K.squire(dId, dx, dy, { outfit: 'livery', face: 1, arms: 'reins', prop: 'gauntlets', v: sp, rot: lean * 0.18 + c.tilt * 0.15 });
    ctx.strokeStyle = gold ? C.gold : '#3a2010'; ctx.lineWidth = 1.6;
    for (const o of rig) { ctx.beginPath(); ctx.moveTo(dx + 14, dy - 12); ctx.quadraticCurveTo((dx + o.head.x) / 2, dy + 6, o.head.x, o.head.y); ctx.stroke(); }
    if (st.kingOut > 0) drawKingOut(st, t);
    if (c.whip > 0) { ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(dx + 6, dy - 30); ctx.quadraticCurveTo(dx + 60, dy - 90, dx + 160 + Math.sin(t * 40) * 20, dy - 60); ctx.stroke(); }
  }
  function drawKing(st, x, y, t) {
    const n = st.nerves / 100, shake = n > 0.6 ? Math.sin(t * 40) * n * 2 : 0;
    ctx.save(); ctx.translate(x + shake, y);
    ctx.fillStyle = '#f2c8a0'; circ(0, 0, 13); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 10, 12, 8, 0, 0, Math.PI); ctx.fill(); // beard
    ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.moveTo(-11, -9); ctx.lineTo(-11, -20); ctx.lineTo(-5, -14); ctx.lineTo(0, -22); ctx.lineTo(5, -14); ctx.lineTo(11, -20); ctx.lineTo(11, -9); ctx.closePath(); ctx.fill();
    // eyes: wider with nerves
    const ew = 2 + n * 2;
    ctx.fillStyle = '#ffffff'; circ(-5, -3, ew + 1); ctx.fill(); circ(5, -3, ew + 1); ctx.fill();
    ctx.fillStyle = '#1c1a36'; circ(-5, -3, 1.4); ctx.fill(); circ(5, -3, 1.4); ctx.fill();
    ctx.fillStyle = '#7a2a2a'; ctx.beginPath(); ctx.ellipse(0, 5, 3 + n * 2, 1 + n * 4, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawKingOut(st, t) {
    // the end: the King climbs down from the carriage door, staggers in a little circle and waves to the stands
    const u = st.kingOut, x = R.window - u * 96 + Math.sin(t * 3) * 6 * u, y = K.lerp(R.roofY + 60, R.gy - 2, Math.min(1, u * 1.4)) - Math.sin(u * Math.PI) * 30;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 4) * 0.12 * u);
    ctx.fillStyle = '#7a3aa8'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.lineTo(9, -30); ctx.lineTo(-9, -30); ctx.closePath(); ctx.fill(); // robe
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-14, -4, 28, 4); ctx.fillRect(-2, -30, 4, 26); // ermine trim
    // the waving arm
    const wv = Math.sin(t * 10) * 0.5;
    ctx.strokeStyle = '#7a3aa8'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(7, -26); ctx.lineTo(16 + Math.sin(wv) * 6, -44); ctx.stroke();
    ctx.fillStyle = '#f2c8a0'; circ(16 + Math.sin(wv) * 6, -46, 3.5); ctx.fill();
    ctx.restore();
    drawKing({ nerves: 30 }, x, y - 42, t);
    // dizzy stars
    for (let k = 0; k < 3; k++) { const a = t * 4 + k * TAU / 3; text('★', x + Math.cos(a) * 16, y - 70 + Math.sin(a) * 5, 10, '#ffd23a', 'center', 'display'); }
  }
  function drawBandit(st, b, t) {
    const lift = st.car.airH;
    let x = b.x, y = b.zone === 'horse' ? R.gy - 66 - lift : R.roofY - lift;
    if (b.state === 'board') { const u = clamp(b.t / 0.5, 0, 1); if (b.drop) y -= (1 - u) * 160; else if (b.zone === 'roof') { x = K.lerp(R.roofL - 50, R.roofL, u); y += (1 - u) * 60 - Math.sin(u * Math.PI) * 40; } else y -= (1 - u) * 120; }
    if (b.state === 'fall' || b.state === 'flee') { y += b.fy || 0; }
    b.sx = x;
    const sc = b.big ? 1.25 : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale((b.face || 1) * sc, sc);
    if (b.state === 'fall') ctx.rotate(b.t * 8);
    // a comic masked bandit: brown hood, grey tunic, a black eye mask, a sack
    ctx.fillStyle = '#6a6a72'; rr(-9, -24, 18, 24, 6); ctx.fill();
    ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.ellipse(0, -30, 10, 10, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2c8a0'; ctx.beginPath(); ctx.ellipse(2, -28, 7, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1c1a36'; ctx.fillRect(-4, -31, 12, 4); ctx.fillStyle = '#ffffff'; circ(0, -29, 1.2); ctx.fill(); circ(5, -29, 1.2); ctx.fill();
    ctx.fillStyle = '#1c1a36'; ctx.fillRect(-7, -1, 5, 3); ctx.fillRect(2, -1, 5, 3);
    if (b.big) { K.heraldShield(10, -14, 8, { col: '#5a1a6a', charge: 'tower', chargeCol: '#c8c0b0' }); }
    if (b.state === 'grab' || b.loot === true) { ctx.fillStyle = '#8a4a2a'; ctx.fillRect(-16, -18, 10, 10); }
    if (b.state === 'crown' || b.loot === 'crown') { ctx.fillStyle = '#ffd23a'; ctx.fillRect(6, -22, 10, 5); }
    if (b.state === 'reins') { ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(6, -14); ctx.lineTo(24, -6); ctx.stroke(); }
    if (b.hit > 0) { ctx.fillStyle = '#ffffff'; text('!', 0, -50, 16, '#ffffff', 'center', 'display'); }
    ctx.restore();
    if (b.state === 'fall' && b.t > 0.4) { ctx.fillStyle = '#3e8a34'; ctx.beginPath(); ctx.ellipse(x, R.gy + 4, 26, 14, 0, Math.PI, TAU); ctx.fill(); }
  }
  function drawHero(st, t) {
    const h = st.hero, id = st.roof, p = heroPos(st);
    const o = { outfit: 'livery', face: h.face, prop: 'rope', v: clamp(st.v / S.fast, 0, 1), straw: h.straw > 0 ? clamp(h.straw / 3, 0, 1) : 0, sq: h.duck ? 0.6 : 0, arms: h.act > 0 ? 'push' : h.zone === 'pole' && h.hold > 0 ? 'reins' : null };
    if (h.tumble > 0 && h.tumble > S.tumbleT - 0.6) { const u = (S.tumbleT - h.tumble) / 0.6; o.rot = -u * 6; p.x = K.lerp(R.roofL, R.cart, u); p.y = K.lerp(R.roofY - 30, R.gy - 40, u) - Math.sin(u * Math.PI) * 60; }
    K.squire(id, p.x, p.y, o);
    // the hitch progress ring
    if (h.hold > 0) { ctx.strokeStyle = Math.abs(st.car.tilt) < S.steady ? '#8fe3b0' : '#ff5a4a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y - 46, 12, -Math.PI / 2, -Math.PI / 2 + TAU * h.hold / S.hitchT); ctx.stroke(); }
  }
  function drawTells(st, t) {
    // "Duck!" markers for low things inside the tell
    const tell = S.duckTell + (st.gold ? S.goldTell : 0), v = Math.max(60, st.v);
    for (const it of st.items) {
      if (it.done || it.kind !== 'low') continue;
      const sx = it.d - st.d, tt = (sx - R.roofR) / v;
      if (tt < tell && tt > -0.3) {
        const x = clamp(sx, 420, W - 60), pulse = 1 + 0.1 * Math.sin(t * 16);
        ctx.save(); ctx.translate(x, R.roofY - 70); ctx.scale(pulse, pulse);
        ctx.fillStyle = st.gold ? C.gold : '#ff5a4a'; rr(-40, -16, 80, 32, 10); ctx.fill();
        text('DUCK!', 0, 1, 18, '#ffffff', 'center', 'display');
        ctx.restore();
      }
    }
    // bandit goals
    for (const b of st.bandits) if (b.state === 'grab' || b.state === 'crown') {
      const u = b.t / (b.state === 'grab' ? S.grabT : S.crownT);
      ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, R.roofY - 64, 9, -Math.PI / 2, -Math.PI / 2 + TAU * u); ctx.stroke();
    }
  }
  const circ = (x, y, r) => circle(x, y, r);
  function drawTop(st) { K.drawPops(st, 0, 0); }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '✿ ' + st.favs + ' / ' + S.favours;
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, '#ffb0d8', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play || !st.car) return;
    const c = st.car;
    // the Royal Nerves meter with the King's face, and the tilt gauge
    {
      const w = 220 * z, h = 13 * z, x = W / 2 - w / 2 - 70 * z, y = H - 40 * z;
      text('Royal Nerves', x + w / 2, y - 9 * z, 11 * z, '#ffffff', 'center', 'body');
      const u = clamp(st.nerves / 100, 0, 1);
      K.meter(x, y, w, h, u, u > 0.7 ? '#ff5a4a' : u > 0.4 ? '#ffb04a' : '#8fe3b0');
      text('♛', x - 12 * z, y + h / 2, 16 * z, '#ffd23a', 'center', 'body');
      text('bags ' + st.bags, x + w / 2, y + h + 9 * z, 10 * z, '#e8dcc8', 'center', 'body');
      // tilt gauge
      const gx = W / 2 + 110 * z, gy = y + h / 2, gr = 26 * z;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 6 * z; ctx.beginPath(); ctx.arc(gx, gy + gr * 0.6, gr, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      ctx.strokeStyle = '#ff5a4a'; ctx.beginPath(); ctx.arc(gx, gy + gr * 0.6, gr, Math.PI * 1.15, Math.PI * 1.22); ctx.stroke(); ctx.beginPath(); ctx.arc(gx, gy + gr * 0.6, gr, Math.PI * 1.78, Math.PI * 1.85); ctx.stroke();
      ctx.strokeStyle = '#8fe3b0'; ctx.beginPath(); ctx.arc(gx, gy + gr * 0.6, gr, Math.PI * 1.5 - S.steady * 0.35, Math.PI * 1.5 + S.steady * 0.35); ctx.stroke();
      const a = Math.PI * 1.5 + clamp(c.tilt, -1.1, 1.1) * 0.35 * Math.PI / 1.1 * 1.0;
      ctx.strokeStyle = st.gold ? C.gold : '#ffffff'; ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.moveTo(gx, gy + gr * 0.6); ctx.lineTo(gx + Math.cos(a) * gr, gy + gr * 0.6 + Math.sin(a) * gr); ctx.stroke();
      text('tilt', gx, gy + gr * 0.6 + 8 * z, 10 * z, '#ffffff', 'center', 'body');
    }
    const pl = plan(st), Dn = st.drv, Rn = st.roof;
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(Dn, 'driver', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      const fast = st.v >= S.rampV, sp = Math.round(st.v);
      K.chip(x0, cy, cw, chh, (pl.drv.speed === 'fast' ? kk(Dn, 'right') + 'HYAH ' : pl.drv.speed === 'slow' || pl.drv.speed === 'stop' ? kk(Dn, 'left') + 'WHOA ' : 'speed ') + sp, pl.drv.speed !== 'cruise' && !(pl.drv.speed === 'fast' && fast), fast, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, c.cd > 0 ? 'whip ' + Math.ceil(c.cd) + 's' : kk(Dn, 'act') + 'WHIP', pl.drv.whip, c.whip > 0, z);
    }
    {
      const bx = K.panel(Rn, 'roof', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z, h = st.hero;
      K.chip(x0, cy, cw, chh, kk(Rn, 'down') + 'DUCK', pl.roof.duck && !h.duck, h.duck, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(Rn, 'act') + (c.loose ? 'HITCH' : 'SHOVE'), pl.roof.act || pl.roof.hold && !(h.hold > 0), h.hold > 0 || h.act > 0, z);
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st), h = st.hero, hp = heroPos(st);
    {
      let s = null, col = C.gold, pulse = false;
      const fk = forkAhead(st);
      if (fk && !fk.picked) { s = 'Fork! ' + K.key(Dn, 'up') + ' upper / ' + K.key(Dn, 'down') + ' lower'; pulse = true; }
      else if (Math.abs(c.tilt) > 0.5) { s = 'Lean ' + (c.tilt > 0 ? K.key(Dn, c.rev > 0 ? 'down' : 'up') : K.key(Dn, c.rev > 0 ? 'up' : 'down')) + '!'; pulse = true; }
      else if (c.rev > 0) { s = 'Reins reversed!'; col = '#ffd0c8'; }
      else if (pl.drv.speed === 'fast' && st.v < S.rampV) { s = 'Faster for the jump! ' + K.key(Dn, 'right'); pulse = true; }
      else if (pl.drv.speed === 'slow' || pl.drv.speed === 'stop') { s = (pl.drv.speed === 'stop' ? 'Stop at the stand! ' : 'Whoa! ') + K.key(Dn, 'left'); pulse = true; }
      else if (pl.drv.whip) { s = 'Crack the whip! ' + K.key(Dn, 'act'); pulse = true; }
      P.say(Dn, s, R.seat + 30, R.roofY - 30, col, pulse);
    }
    {
      let s = null, col = C.gold, pulse = false;
      if (pl.roof.duck && !h.duck) { s = 'DUCK! ' + K.key(Rn, 'down'); pulse = true; }
      else if (c.loose && h.zone === 'pole') { s = 'Hold ' + K.key(Rn, 'act') + ' to hitch'; pulse = true; }
      else if (c.loose && h.zone === 'roof') { s = 'Loose strap! Hop to the pole (' + K.key(Rn, 'right') + ' + ' + K.key(Rn, 'up') + ')'; }
      else if (pl.roof.why === 'reins' && h.zone !== 'horse') { s = 'Bandit on the horses! Hop forward ' + K.key(Rn, 'up'); pulse = true; }
      else if (pl.roof.act) { s = 'Shove! ' + K.key(Rn, 'act'); pulse = true; }
      else if (pl.roof.why === 'ramp' && h.zone !== 'roof') { s = 'Back on the roof for the jump! ' + K.key(Rn, 'up'); pulse = true; }
      P.say(Rn, s, hp.x, hp.y - 50, col, pulse);
    }
  }
  MODES.royalcarriage = {
    S, R, plan, heroPos,
    medals: { bronze: 'Get the King there in one piece', goals: [{ key: 'time', gold: S.goldT, silver: S.silverT }] },
    medalValues() { return {}; },
    setup(st, L) {
      st.stats = { spills: 0, tumbles: 0, bandits: 0, bagsLost: 0, crowns: 0, reins: 0, favours: 0, fits: 0, hits: 0, straps: 0, hitches: 0, jumps: 0, ducks: 0, whips: 0, forks: [], missed: [], helps: 0, roomT: [] };
      st.favs = 0; st.bags = S.bags; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0;
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.items) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.items) drawTop(st); },
    hud() { const st = G.mst; if (st.items) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Spills', value: String(s.spills) },
        { label: 'Bandits shoved', value: String(s.bandits) },
        { label: 'Favours', value: st.favs + ' of ' + S.favours },
      ];
      out.push('Tumbles: ' + s.tumbles + '. Bags saved: ' + st.bags + ' of ' + S.bags + '. Royal Fits: ' + s.fits + '. The King arrived (dizzy, but in one piece)!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = d => ({ label: 'shove', labels: d === 0 ? ['whip', 'shove'] : ['shove', 'whip'] });
  TOURNEY.defs.royalcarriage = {
    name: 'Runaway Royal Carriage', world: 36, kind: 'team', mode: 'royalcarriage', outfit: 'none', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> speed or run / <kbd>W</kbd><kbd>S</kbd> lean, hop, duck',
      bo: '<kbd>←</kbd><kbd>→</kbd> speed or run / <kbd>↑</kbd><kbd>↓</kbd> lean, hop, duck',
      pad: 'stick drives or runs,',
    },
    tip: 'Stop the King\'s runaway carriage! The driver steers the speed and leans against the tilt; the roof hero ducks signs and shoves bandits off.',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'Tournament Gate', drv: 0, done: 'Out of the gate!', act: acts(0),
        tip: 'Pip drives: ▶ faster, ◀ slower, ▲ ▼ lean against the tilt. Bo on the roof: ▼ ducks signs, the action shoves bandits; hop to the pole to fix a loose strap.' },
      { title: 'Market Day', drv: 1, market: true, done: 'Through the market!', act: acts(1),
        tip: 'Swap jobs! Bo drives: crack the whip at geese, slow down for the ox cart, speed up for the hay-cart ramp. At the fork, ▲ is shorter but bumpy.' },
      { title: 'The King\'s Forest', drv: 0, forest: true, dusk: true, done: 'Out of the forest!', act: acts(0),
        tip: 'Bandits drop from the trees! Duck the branches, and lean through the potholes.' },
      { title: 'The Unfinished Bridge', drv: 1, bridge: true, done: 'The royal stand!', act: acts(1),
        tip: 'Speed up for each gap and keep the roof hero on the roof for the jump. At the end, hitch the last strap and haul the reins (◀) to stop at the royal stand!' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.royalcarriageWhip = function () { this.tone(2400, 0.04, 'square', 0.04, 600); this.tone(300, 0.06, 'sawtooth', 0.02, 120, 0.02); };
  Sfx.extra.royalcarriageHop = function () { this.tone(420, 0.1, 'triangle', 0.03, 700); };
  Sfx.extra.royalcarriageStep = function () { this.tone(180, 0.05, 'square', 0.02, 120); };
  Sfx.extra.royalcarriageWhoosh = function () { this.tone(600, 0.1, 'sawtooth', 0.01, 200); };
  Sfx.extra.royalcarriageBonk = function () { this.tone(320, 0.08, 'square', 0.04, 140); this.tone(900, 0.12, 'triangle', 0.02, 1400, 0.05); };
  Sfx.extra.royalcarriageHey = function () { this.tone(520, 0.12, 'sawtooth', 0.02, 680); this.tone(680, 0.1, 'sawtooth', 0.015, 500, 0.1); };
  Sfx.extra.royalcarriageSnap = function () { this.tone(1800, 0.03, 'square', 0.02, 800); };
  Sfx.extra.royalcarriageClick = function () { this.tone(900, 0.04, 'square', 0.03, 1200); this.tone(1400, 0.06, 'triangle', 0.03, null, 0.05); };
  Sfx.extra.royalcarriageCreak = function () { this.tone(200, 0.2, 'sawtooth', 0.012, 150); };
  Sfx.extra.royalcarriageWhee = function () { this.tone(400, 0.4, 'triangle', 0.03, 900); };
  Sfx.extra.royalcarriageHonk = function () { this.tone(380, 0.12, 'square', 0.03, 300); this.tone(420, 0.1, 'square', 0.02, 330, 0.12); };
  Sfx.extra.royalcarriageFit = function () { this.tone(600, 0.3, 'sawtooth', 0.03, 900); this.tone(300, 0.6, 'square', 0.02, 120, 0.2); };
})();
