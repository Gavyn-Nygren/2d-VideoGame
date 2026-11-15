/* Pip & Bo - Level 39-1 Mine Lift Plunge (team, World 39 Crystal Caverns). */
'use strict';

/* ===== 39-1 Mine Lift Plunge (mode 'cavelift', team, scrolls down, Gavyn's pick) =====
   The lamps of Glimmer Gulch have gone out and the deep mine is rumbling. The only way down is the hundred-year-old
   hand-cranked mine lift: an open wooden platform (S.LW = 420 px wide) on two fraying ropes, a crank at each end.
   Front view of a tall shaft, scrolling down. Depth y grows downward; the left rope end hangs at depth st.y[0] and the
   right one at st.y[1] (Pip has the left crank, Bo the right). The camera follows the lift's middle.
   BOTH DO THE SAME JOB, one side each:
     ▼ held = let out rope: your end goes down (up to 170 px/s; twice that under a waterfall). ▲ held = wind in: your
     end comes up slowly (60 px/s) and you tire (a puff ring; full = a 1 s rest). Neither = your brake holds your end.
     ◀ ▶ = walk along the platform (about 200 px from your crank). Away from the crank its brake is on.
     Action at your crank = SLAM BRAKE (both ends stop 0.5 s, 3 s cooldown); next to a thing = deal with it (shoo a
     bat, stamp out a spark, push the lamp crate back to the middle).
   TILT: the platform tips when the ends differ. Past 12 degrees the crate slides; past 22 degrees for 0.6 s is a LURCH
     (both grab the rail, a 1.2 s jam with a bang while the clamps level it to 12 degrees, the Fray meter jumps).
     Your weight tips it a little too (about 3 degrees for a hero at the far end).
     The low end's rope hangs straight, so the HIGH end swings in toward the middle: the more tilt, the narrower the
     lift on the high side. That is how you slip past a shelf: tip the lift so that shelf's side is high.
   TROUBLE (each with a tell): shelves and beams sticking out from one wall (a lantern on the shelf and a marker on the
     HUD's shaft strip; the end of the lift that hits one stops dead: a SNAG), falling rocks (a rattle, dust and a
     shadow on the planks 1 s before: walk out from under or it is a BONK), bats that land on a drum or the rail and
     nibble the rope (shoo them), sparks from the brakes after a slam or a lurch (stamp them out within 4 s), narrows
     (painted stripes: the lift only fits level, under 5 degrees, and the walls slow it), rope knots (that crank jams:
     wind up a moment to free it while the other holds), a waterfall curtain (stretch 2 on: that crank slips, double
     speed), updrafts (stretch 3 on: dust streams up 1 s before, then one end is lifted for 1.5 s).
   FRAY (shared, a rope with strands): Lurches, Snags, Bonks, nibbling bats and fires fill it; it drains slowly while
     the lift moves level. Full: the safety clamps slam shut and Old Mabel winches the lift back up to the last
     checkpoint ledge ("Hold on, I've got you!"). No game over.
   STRETCHES (rooms, about 45 s): The Old Shaft, The Wet Rock, The Crystal Throat (ends with Bo's rope snapping: the
     lift hangs from Pip's rope and swings), THE SWING: Pip's ▼ ▲ lower and raise the whole lift; Bo, with no rope,
     runs ◀ ▶ on the platform to swing it like a pendulum (running the way it swings pumps it, running against it
     damps it) and steers it round crystal spikes jutting from both walls; Bo's action grabs a passing chain to stop
     the swing. A spike that is scraped 3 times snaps off (so nobody is ever stuck above one). The lift settles onto
     the glittering cavern floor, both step out, and the ground shakes with a footstep.
   CHECKPOINTS at each stretch's halfway ledge. GOLD HELP (3 bad events in a stretch, both playing, announced,
     counted): gold cranks: Lurch only past 28 degrees, bats nibble at half speed, and every tell shows 0.5 s earlier.
   COLLECTABLES: 20 glow gems on the shaft walls, grabbed by a hero standing at that end of the lift as it passes
     (the gems set deep in the wall need that end low or level, not pulled in). Bonus: the lamp crate delivered.
   MEDAL by time: Gold <= 190 s, Silver <= 330 s.
   OUTFIT 'cavelift' (old-time miners, js/levels/world39/cave-kit.js): soot builds up (G.mst.ofx[id].soot) and a
     Lurch knocks the hats crooked for a few seconds (ofx.crook).
   MODES.cavelift.plan(st) says what each side should do now (the prompts, the HUD chips and the brain read it).
   Everything lives inside this block; sounds are Sfx.extra.cavelift*. */
(() => {
  const K = CAVE, TAU = Math.PI * 2, DEG = Math.PI / 180;
  const S = {
    LW: 420, downV: 170, acc: 600, windV: 60, puff: 0.3, puffDrain: 0.35, rest: 1, walkV: 150, reach: 200, atCrank: 16,
    slide: 12, lurch: 22, goldLurch: 28, lurchHold: 0.6, jamT: 1.2, slamT: 0.5, slamCD: 3, weight: 3,
    narrowTilt: 5, narrowV: 95, knotWind: 0.6, gustV: 75, gustT: 1.5, tell: 1.0, goldTell: 0.5, stampT: 4,
    fray: { lurch: 0.26, snag: 0.14, bonk: 0.06, fire: 0.1, bat: 0.03, scrape: 0.12 }, frayDrain: 0.018,
    pxPerM: 40, idleWait: 12, goldT: 190, silverT: 330, gems: 20,
    // the swing
    swW: 2.45, swDamp: 0.12, pump: 150, swMax: 168, wallSw: 150, grabDamp: 7,
  };
  const CX = W / 2, LIFTY = 300;                   // the lift's middle on screen
  const HOME = [18, S.LW - 18];                     // where each crank is, along the platform
  const RANGE = [[10, 230], [190, S.LW - 10]];     // how far each hero can walk
  const LEN = [5200, 5400, 5600, 4300];             // stretch lengths (depth px)
  const TITLES = ['The Old Shaft', 'The Wet Rock', 'The Crystal Throat', 'The Swing'];

  /* ---------- the script: what is in the shaft, by depth from the stretch's top ---------- */
  function script(k) {
    const L = [], add = (d, kind, o) => { const it = Object.assign({ d, kind, done: false }, o || {}); L.push(it); return it; };
    const shelf = (d, side, r) => add(d, 'shelf', { side, r, th: 30 });
    const narrow = (d, len) => add(d, 'narrow', { len });
    const rock = (d, u) => add(d, 'rock', { u });
    const bats = (d, u, n) => add(d, 'bats', { u, n: n || 2 });
    const gem = (d, side, deep) => add(d, 'gem', { side, deep: !!deep });
    const knot = (d, side) => add(d, 'knot', { side });
    const fall = (d, len, side) => add(d, 'water', { len, side });
    const gust = (d, side) => add(d, 'gust', { side });
    const spike = (d, side, r) => add(d, 'spike', { side, r, hits: 0 });
    const chain = (d) => add(d, 'chain', {});
    if (k === 0) {
      // The Old Shaft: learn the cranks, a level descent, the first shelves and a narrow
      gem(420, 0); gem(700, 1); narrow(1100, 260); gem(1600, 1, true);
      shelf(2000, 0, 22); gem(2300, 0); rock(2500, 120); bats(2800, HOME[1] - 8, 2);
      gem(3300, 1); shelf(3700, 1, 20); gem(4100, 0, true); narrow(4500, 240);
    } else if (k === 1) {
      // The Wet Rock: falling stalactites, a waterfall, bats, a knot
      rock(380, 300); gem(600, 0); fall(900, 700, 0); gem(1200, 1); rock(1500, 90); shelf(1900, 1, 24);
      bats(2300, HOME[0] + 8, 2); gem(2500, 0, true); knot(2900, 1); gem(3300, 1); bats(3600, 160, 2); rock(3800, 260);
      shelf(4200, 0, 22); gem(4600, 1, true); rock(4900, 200);
    } else if (k === 2) {
      // The Crystal Throat: updrafts, alternating shelves, two narrows, then the rope snaps
      gust(400, 1); gem(700, 0); shelf(1100, 0, 20); shelf(1450, 1, 20); gem(1750, 1); narrow(2050, 260);
      bats(2500, 260, 3); gust(2700, 0); gem(2900, 0, true); shelf(3300, 1, 24); shelf(3700, 0, 18); rock(3900, 150);
      gem(4200, 1); narrow(4500, 280); gem(5000, 0);
    } else {
      // The Swing: spikes from both walls; chains to grab where both walls have one
      gem(500, 0); spike(800, -1, 190); gem(1150, 1); spike(1400, 1, 190); chain(1880); spike(2100, -1, 128); spike(2100, 1, 128);
      gem(2500, 0); spike(2800, -1, 200); spike(3400, 1, 200); gem(3800, 1);
    }
    return L;
  }
  // which gems are where (a gem is "the n-th gem" by its position in the four scripts, so collected ones stay collected)
  const GEM_IDS = (() => { const ids = []; let n = 0; for (let k = 0; k < 4; k++) ids[k] = script(k).filter(i => i.kind === 'gem').map(() => n++); return ids; })();

  /* ---------- geometry ---------- */
  const tiltOf = st => Math.asin(clamp((st.y[1] - st.y[0]) / S.LW, -0.95, 0.95));
  // the effective tilt in degrees, with the heroes' weight (positive: the right end is lower)
  const tiltDeg = st => tiltOf(st) / DEG + [0, 1].reduce((a, id) => a + (st.u[id] - S.LW / 2) / (S.LW / 2) * S.weight, 0) * 0.5;
  // the ends' x on screen: the low end hangs straight, the high end swings in
  function ends(st) {
    const th = tiltOf(st), span = S.LW * Math.cos(th), xl0 = CX - S.LW / 2, xr0 = CX + S.LW / 2;
    if (st.y[1] >= st.y[0]) return { xl: xr0 - span, xr: xr0, pullL: S.LW - span, pullR: 0 };
    return { xl: xl0, xr: xl0 + span, pullL: 0, pullR: S.LW - span };
  }
  const mid = st => (st.y[0] + st.y[1]) / 2;
  const lurchAt = st => (st.gold ? S.goldLurch : S.lurch);
  const tellT = st => S.tell + (st.gold ? S.goldTell : 0);
  // the pull-in needed to pass a shelf reaching r px past the wall's clearance
  const pullFor = r => r - 10 + 4;
  const dhFor = pull => S.LW * Math.sin(Math.acos(clamp(1 - pull / S.LW, 0, 1)));

  /* ---------- a stretch (one room) ---------- */
  function room(st, L, k) {
    st.k = k; st.title = TITLES[k];
    st.items = script(k); st.top = st.depth0 = st.depthAt[k]; st.len = LEN[k]; st.half = st.top + LEN[k] / 2; st.cp = st.top;
    st.rc = { bad: 0 }; st.gold = false; st.goldUsed = false;
    st.state = 'go'; st.endT = 0; st.cleared = false;
    for (const it of st.items) { it.d += st.top; if (it.kind === 'gem') it.id = GEM_IDS[k][st.items.filter(x => x.kind === 'gem').indexOf(it)]; if (it.kind === 'gem' && st.gotGem[it.id]) it.done = true; }
    st.bats = []; st.fires = []; st.rocks = []; st.gusts = []; st.slamCD = 0; st.slamT = 0; st.jamT = 0; st.lurchT = 0;
    st.v = [0, 0]; st.block = [null, null]; st.knot = [null, null];
    if (k === 3) { st.sw = { X: st.snapX || 30, V: st.snapV || 0, grab: null, ph: 0 }; st.y[1] = st.y[0]; }
    else st.sw = null;
    K.fx(st);
    st.segStart = G.time;
    labels(st);
    if (k === 3) Music.cue({ song: 'cavechase' });
  }
  function labels(st) { K.actLabels(st.k === 3 ? ['brake', 'grab'] : ['brake', 'brake'], 'brake'); }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.items) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    K.tickMabel(st, dt);
    K.glitter(st, dt, st.k >= 2 ? 50 : 24);
    if (live) {
      st.T += dt;
      if (st.sw) swingTick(st, dt); else liftTick(st, dt);
      if (st.state === 'go' && mid(st) >= st.top + st.len) endStretch(st);
    } else if (st.state === 'winch') winchStep(st, dt);
    else if (st.state === 'snap') snapStep(st, dt);
    else if (st.state === 'end') endStep(st, dt);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    for (let id = 0; id < 2; id++) { if (st.stun[id] > 0) st.stun[id] -= dt; }
    K.tickOfx(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }

  function liftTick(st, dt) {
    const P = G.players;
    if (st.slamCD > 0) st.slamCD -= dt;
    if (st.slamT > 0) st.slamT -= dt;
    if (st.jamT > 0) st.jamT -= dt;
    // heroes: walking, cranking, actions
    for (let id = 0; id < 2; id++) hero(st, id, dt, P[id]);
    // the ends move
    const narrowNow = st.items.find(it => it.kind === 'narrow' && mid(st) > it.d - 14 && mid(st) < it.d + it.len);
    for (let s = 0; s < 2; s++) {
      let v = st.v[s];
      if (st.slamT > 0 || st.jamT > 0) v = 0;
      if (narrowNow) v = Math.min(v, S.narrowV);
      // a gust lifts one end
      for (const g of st.gusts) if (g.side === s && g.t > g.tell && g.t < g.tell + S.gustT) v -= S.gustV;
      const ny = st.y[s] + v * dt;
      st.y[s] = collide(st, s, st.y[s], ny);
    }
    // the clamps level a lurched lift to 12 degrees while it is jammed
    if (st.jamT > 0) { const dh = st.y[1] - st.y[0], want = Math.sin(12 * DEG) * S.LW; if (Math.abs(dh) > want) { const s = dh > 0 ? 0 : 1; st.y[s] += Math.min(140 * dt, Math.abs(dh) - want); } }
    // narrows: the lift only fits level
    if (narrowNow) {
      const td = Math.abs(tiltDeg(st));
      if (td > S.narrowTilt) {
        // jammed at the top of the narrow until it is level
        if (!narrowNow.jam) { narrowNow.jam = true; bad(st, 'snag', 'Jammed in the narrows! Level it out'); Sfx.play('caveliftSnagCrunch'); }
        const top = narrowNow.d - 14;
        for (let s = 0; s < 2; s++) if (st.y[s] > top && st.y[s] - st.v[s] * dt <= top + 2) st.y[s] = Math.min(st.y[s], top + 1);
        st.scrapeT = (st.scrapeT || 0) + dt;
        if (st.scrapeT > 0.3) { st.scrapeT = 0; K.spark(st, CX + (Math.random() < 0.5 ? -1 : 1) * S.LW / 2, LIFTY, 4, ['#ffd25a', '#ffffff']); }
      } else narrowNow.jam = false;
    }
    // tilt: lurches and the crate
    const td = tiltDeg(st);
    if (Math.abs(td) > lurchAt(st) && st.jamT <= 0) { st.lurchT += dt; if (st.lurchT >= S.lurchHold) lurch(st); }
    else st.lurchT = Math.max(0, st.lurchT - dt * 2);
    if (st.crate.on) crateTick(st, dt, td);
    // creaks
    st.creakT = (st.creakT || 0) - dt;
    if (Math.abs(td) > 14 && st.creakT <= 0) { st.creakT = 0.7; Sfx.play('caveliftPlankGroan'); }
    for (let s = 0; s < 2; s++) { st.rat[s] += Math.abs(st.v[s]) * dt / 34; if (st.rat[s] >= 1) { st.rat[s] -= 1; Sfx.play('caveliftCrankRatchet', s, Math.abs(st.v[s]) / S.downV); } }
    things(st, dt);
    // fray drains while moving and level
    const moving = Math.abs(st.v[0]) + Math.abs(st.v[1]) > 40;
    if (moving && Math.abs(td) < 8) st.fray = Math.max(0, st.fray - S.frayDrain * dt);
    if (st.fray >= 1) winch(st);
    // soot builds up on the way down
    for (let id = 0; id < 2; id++) K.ofx(st, id).soot = clamp((mid(st) - st.depthAt[0]) / 16000, 0, 0.9);
  }

  // one hero: walk, crank, act
  function hero(st, id, dt, p) {
    const i = p.input, up = !!(i.jump || i.up);
    let wantV = 0;
    if (st.stun[id] > 0) { st.v[id] = 0; return; }
    // walking
    const lr = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    if (lr) { st.u[id] = clamp(st.u[id] + lr * S.walkV * dt, RANGE[id][0], RANGE[id][1]); st.face[id] = lr; st.walkPh[id] += dt * 9; }
    const at = Math.abs(st.u[id] - HOME[id]) < S.atCrank;
    st.at[id] = at;
    if (st.restT[id] > 0) st.restT[id] -= dt;
    if (at && !lr) {
      const water = st.items.some(it => it.kind === 'water' && it.side === id && st.y[id] > it.d && st.y[id] < it.d + it.len);
      const knotted = st.knot[id];
      if (i.down && !up) {
        if (knotted) { wantV = 0; if (!st.knotHint) { st.knotHint = true; K.hint(st, id, 'A knot! Wind up a little to free it', 2.2); } }
        else wantV = (st.v[id] > 0 ? approach(st.v[id], S.downV * (water ? 2 : 1), S.acc * dt) : Math.min(S.downV * 0.5, S.acc * dt * 3));
      } else if (up && st.restT[id] <= 0) {
        wantV = -S.windV; st.puff[id] += S.puff * dt;
        if (knotted) { knotted.wound += dt; if (knotted.wound >= S.knotWind) { st.knot[id] = null; knotted.freed = true; Sfx.play('caveliftKnotFree'); K.pop(st, endX(st, id), LIFTY - 70, 'Knot free!', '#d9ffd0', 16); } }
        if (st.puff[id] >= 1) { st.restT[id] = S.rest; st.puff[id] = 1; K.hint(st, id, 'Puffed out! Rest a second', 1.2); }
        st.windT[id] = (st.windT[id] || 0) - dt; if (st.windT[id] <= 0) { st.windT[id] = 0.35; Sfx.play('caveliftCrankWind'); }
      } else if (water && !i.down) wantV = 0;
    }
    if (!up || st.restT[id] > 0) st.puff[id] = Math.max(0, st.puff[id] - S.puffDrain * dt * (st.restT[id] > 0 ? 0.6 : 1));
    if (st.restT[id] > 0 && st.restT[id] - dt <= 0) st.puff[id] = 0.3;
    const was = st.v[id];
    st.v[id] = wantV;
    if (was > 30 && wantV === 0 && at) { st.squeal = (st.squeal || 0) + 1; if (st.squeal % 3 === 1) Sfx.play('caveliftBrakeSqueal'); }
    // the action
    if (p.pendingAct) act(st, id, at);
  }
  function act(st, id, at) {
    const u = st.u[id];
    // a thing next to you comes first
    const bat = st.bats.find(b => b.sit && Math.abs(b.u - u) < 34);
    if (bat) { shoo(st, bat, id); return; }
    const fire = st.fires.find(f => Math.abs(f.u - u) < 30);
    if (fire) { fire.out = true; st.stats.stamps++; Sfx.play('caveliftStampOut'); K.poof(st, platX(st, fire.u), platY(st, fire.u) - 4, 6); return; }
    if (st.crate.on && Math.abs(st.crate.u - u) < 36 && Math.abs(st.crate.u - S.LW / 2) > 30) { st.crate.push = Math.sign(S.LW / 2 - st.crate.u) * 180; st.crate.pushT = 0.4; Sfx.play('caveliftCrateSlide'); return; }
    if (at && st.slamCD <= 0) {
      st.slamT = S.slamT; st.slamCD = S.slamCD; st.stats.slams++;
      Sfx.play('caveliftSlamBrake'); G.shake = 0.15;
      spark(st);
    }
  }
  function shoo(st, bat, id) {
    bat.sit = false; bat.flee = 1; st.stats.shooed++;
    Sfx.play('caveliftShooSwat'); Sfx.play('caveliftBatSqueak');
    K.pop(st, platX(st, bat.u), LIFTY - 60, 'Shoo!', '#ffffff', 16);
  }
  function spark(st) {
    if (st.fires.length >= 2) return;
    const u = 70 + Math.random() * (S.LW - 140);
    st.fires.push({ u, t: 0, out: false });
    Sfx.play('caveliftSparkFizz');
  }

  // an end moving from y0 to y1: stopped dead by a shelf it overlaps (a Snag)
  function collide(st, s, y0, y1) {
    const e = ends(st), pull = s === 0 ? e.pullL : e.pullR;
    // (a snag stays a snag while that end sits on the shelf, moving or not)
    const b = st.block[s];
    st.block[s] = b && Math.abs(y0 - b.d) < 1.5 && pull < pullFor(b.r) ? b : null;
    for (const it of st.items) {
      if (it.kind !== 'shelf' || it.side !== s) continue;
      const need = pullFor(it.r);
      if (pull >= need) continue;
      if (y0 <= it.d && y1 > it.d) { st.block[s] = it; if (!it.snag) { it.snag = true; bad(st, 'snag', 'SNAG! Tip that side up to slip past the shelf'); Sfx.play('caveliftSnagCrunch'); G.shake = 0.2; st.stats.snags++; } return it.d; }
      if (y0 >= it.d + it.th && y1 < it.d + it.th) return it.d + it.th;
    }
    // a knot jams the crank when its end reaches it
    for (const it of st.items) if (it.kind === 'knot' && it.side === s && !it.freed && y0 <= it.d && y1 > it.d) { it.wound = it.wound || 0; st.knot[s] = it; Sfx.play('caveliftKnotJam'); K.hint(st, s, 'A knot! Wind up a moment to free it', 2.4); return it.d; }
    if (st.knot[s] && y1 > st.knot[s].d) return st.knot[s].d;
    return y1;
  }
  function lurch(st) {
    st.lurchT = 0; st.jamT = S.jamT; st.stats.lurches++;
    Sfx.play('caveliftLurchBang'); G.shake = 0.35;
    for (const id of [0, 1]) K.ofx(st, id).crook = 3;
    K.msg(st, 'LURCH! The clamps bite. Keep the two sides together', '#ffd0c8', 2.4);
    bad(st, 'lurch');
    spark(st);
  }
  function bad(st, kind, text) {
    st.fray = Math.min(1, st.fray + S.fray[kind]);
    st.rc.bad++;
    if (text) K.msg(st, text, '#ffd0c8', 2.4);
    st.stats.badWhy.push(st.k + ':' + Math.round(mid(st) - st.top) + ' ' + kind);
    Sfx.play('caveliftRopeFray');
    if (st.rc.bad >= 3 && !st.goldUsed && K.both(st)) {
      st.goldUsed = true; st.gold = true;
      K.goldHelp(st, 'Gold cranks! Lurches only past 28 degrees, slower bats and earlier warnings for this stretch');
    }
  }

  // the crate of glow lamps
  function crateTick(st, dt, td) {
    const c = st.crate;
    if (c.pushT > 0) { c.pushT -= dt; c.u += c.push * dt; }
    else if (Math.abs(td) > S.slide) { const v = Math.sign(td) * (Math.abs(td) - S.slide + 2) * 5; c.u += v * dt; c.sl = (c.sl || 0) + dt; if (c.sl > 0.5) { c.sl = 0; Sfx.play('caveliftCrateSlide'); } }
    if (c.u < 2 || c.u > S.LW - 2) {
      c.on = false; st.stats.crateLost = true;
      Sfx.play('caveliftCrateSlide'); Sfx.play('caveThud');
      K.msg(st, 'The lamp crate slid off! Mabel\'s lamps are lost down the shaft', '#ffd0c8', 3);
    }
  }

  // bats, rocks, fires, gusts and gems
  function things(st, dt) {
    const m = mid(st), tl = tellT(st), e = ends(st);
    for (const it of st.items) {
      if (it.done) continue;
      if (it.kind === 'rock' && m > it.d - 160 * tl) { it.done = true; st.rocks.push({ u: it.u, t: 0, tell: tl }); Sfx.play('caveliftRockRattle'); }
      else if (it.kind === 'bats' && m > it.d) { it.done = true; for (let n = 0; n < it.n; n++) st.bats.push({ u: clamp(it.u + (n - (it.n - 1) / 2) * 16, 12, S.LW - 12), t: 0, sit: false, fly: 1.1 + n * 0.15, flee: 0, seed: Math.random() * 9 }); Sfx.play('caveliftBatFlap'); }
      else if (it.kind === 'gust' && m > it.d - 140) { it.done = true; st.gusts.push({ side: it.side, t: 0, tell: tl }); }
      else if (it.kind === 'gem') {
        const s = it.side, y = st.y[s], near = st.u[s === 0 ? 0 : 1], heroAt = s === 0 ? Math.min(st.u[0], st.u[1]) < 44 : Math.max(st.u[0], st.u[1]) > S.LW - 44;
        const pull = s === 0 ? e.pullL : e.pullR, ok = pull < (it.deep ? 4 : 18);
        if (Math.abs(y - it.d) < 20 && heroAt && ok) {
          it.done = true; st.gotGem[it.id] = true; st.gems++; st.stats.gems++;
          Sfx.play('caveGem', 1 + st.gems * 0.02); K.spark(st, endX(st, s), LIFTY - 30, 8, [K.GLOW.teal, '#ffffff']);
          K.pop(st, endX(st, s), LIFTY - 60, 'Gem!', '#bff8ef', 16);
          void near;
        } else if (y > it.d + 30) { it.done = true; it.missed = true; st.stats.missed.push(st.k + ':' + Math.round(it.d - st.top) + (it.deep ? ':deep' : '') + (heroAt ? '' : ':away') + (ok ? '' : ':pulled')); }
      }
    }
    for (const r of st.rocks) {
      r.t += dt;
      if (!r.hit && r.t >= r.tell) {
        r.hit = true; Sfx.play('caveliftRockThud'); K.dust(st, platX(st, r.u), platY(st, r.u), 'rgba(200,190,170,0.8)', 8);
        for (let id = 0; id < 2; id++) if (Math.abs(st.u[id] - r.u) < 26 && st.stun[id] <= 0) { st.stun[id] = 1; st.stats.bonks++; Sfx.play('caveliftBonkStars'); bad(st, 'bonk', NAMES[id] + ' got bonked! Step out from under the shadow'); }
      }
    }
    st.rocks = st.rocks.filter(r => r.t < r.tell + 0.6);
    for (const b of st.bats) {
      b.t += dt;
      if (!b.sit && !b.flee && b.t >= b.fly) { b.sit = true; Sfx.play('caveliftBatSqueak'); }
      if (b.sit) { st.fray = Math.min(1, st.fray + S.fray.bat * (st.gold ? 0.5 : 1) * dt); b.nib = (b.nib || 0) + dt; if (b.nib > 1.4) { b.nib = 0; Sfx.play('caveliftRopeFray'); } if (st.fray >= 1) st.batFull = true; }
      if (b.flee) b.flee += dt;
    }
    st.bats = st.bats.filter(b => !(b.flee > 1.5));
    for (const f of st.fires) {
      f.t += dt;
      if (!f.out && f.t > S.stampT) { f.out = true; f.burnt = true; st.fray = Math.min(1, st.fray + S.fray.fire); st.rc.bad++; st.stats.fires++; Sfx.play('caveliftSparkFizz'); K.msg(st, 'A spark scorched the rope! Stamp them out quick', '#ffd0c8', 2.2); }
    }
    st.fires = st.fires.filter(f => !f.out);
    for (const g of st.gusts) {
      g.t += dt;
      if (Math.abs(g.t - g.tell) < dt) Sfx.play('caveliftUpdraftWhoosh');
      if (g.t < g.tell + S.gustT && Math.random() < 0.6) K.part(st, endX(st, g.side) + (Math.random() - 0.5) * 60, LIFTY + 120, (Math.random() - 0.5) * 20, -260, 0.8, K.rgba(K.GLOW.ice, 0.8), 2, 0, 'dot');
    }
    st.gusts = st.gusts.filter(g => g.t < g.tell + S.gustT + 0.2);
    // waterfall noise
    const wf = st.items.find(it => it.kind === 'water' && m > it.d - 300 && m < it.d + it.len + 200);
    st.wfT = (st.wfT || 0) - dt; if (wf && st.wfT <= 0) { st.wfT = 1.2; Sfx.play('caveliftWaterfallRush'); }
  }

  /* ---------- the swing (stretch 4) ---------- */
  function swingTick(st, dt) {
    const P = G.players, sw = st.sw;
    if (st.slamCD > 0) st.slamCD -= dt;
    // Pip lowers and raises the whole lift
    {
      const p = P[0], i = p.input, up = !!(i.jump || i.up);
      let v = 0;
      if (st.stun[0] <= 0) {
        if (i.down && !up) v = st.v[0] > 0 ? approach(st.v[0], S.downV, S.acc * dt) : Math.min(S.downV * 0.5, S.acc * dt * 3);
        else if (up && st.restT[0] <= 0) { v = -S.windV; st.puff[0] += S.puff * dt; if (st.puff[0] >= 1) { st.restT[0] = S.rest; st.puff[0] = 1; } }
      }
      if (!up || st.restT[0] > 0) st.puff[0] = Math.max(0, st.puff[0] - S.puffDrain * dt);
      if (st.restT[0] > 0) st.restT[0] -= dt;
      st.v[0] = v; st.u[0] = HOME[0]; st.at[0] = true;
      if (p.pendingAct && st.slamCD <= 0) { st.slamCD = S.slamCD; st.v[0] = 0; Sfx.play('caveliftSlamBrake'); }
    }
    // Bo runs to swing it
    let force = 0;
    {
      const p = P[1], i = p.input, lr = (i.right ? 1 : 0) - (i.left ? 1 : 0);
      if (st.stun[1] <= 0 && !sw.grab) {
        if (lr) { const nu = clamp(st.u[1] + lr * S.walkV * 1.1 * dt, 30, S.LW - 30); if (nu !== st.u[1]) force = lr * S.pump; st.u[1] = nu; st.face[1] = lr; st.walkPh[1] += dt * 10; }
      }
      const ch = st.items.find(it => it.kind === 'chain' && !it.done && Math.abs(mid(st) - it.d) < 70);
      if (p.input.act && ch && !sw.grab && Math.abs(sw.X) < 120) { sw.grab = ch; Sfx.play('caveliftChainGrab'); st.stats.chains++; }
      if (sw.grab && (!p.input.act || Math.abs(mid(st) - sw.grab.d) > 90)) { sw.grab = null; }
    }
    // the pendulum
    sw.V += (-S.swW * S.swW * sw.X - S.swDamp * sw.V + force) * dt;
    if (sw.grab) { sw.V *= Math.max(0, 1 - S.grabDamp * dt); sw.X *= Math.max(0, 1 - 3 * dt); }
    sw.X += sw.V * dt;
    if (Math.abs(sw.X) > S.swMax) { sw.X = Math.sign(sw.X) * S.swMax; sw.V = -sw.V * 0.4; Sfx.play('caveliftSnagCrunch'); K.spark(st, CX + sw.X + Math.sign(sw.X) * S.LW / 2, LIFTY, 6); }
    sw.ph += dt;
    st.creakT = (st.creakT || 0) - dt;
    if (Math.abs(sw.V) > 60 && st.creakT <= 0) { st.creakT = 0.9; Sfx.play('caveliftSwingCreak'); }
    // descend, stopped by spikes
    let ny = st.y[0] + st.v[0] * dt;
    for (const it of st.items) {
      if (it.kind !== 'spike' || it.done) continue;
      const band = [it.d - 22, it.d + 22], hit = it.side * sw.X > S.wallSw - it.r;
      const inBand = y => y + 15 > band[0] && y - 15 < band[1];
      if (hit && inBand(ny)) {
        if (!inBand(st.y[0])) ny = st.y[0]; // blocked from entering
        if (!it.scrT || st.T - it.scrT > 0.8) {
          it.scrT = st.T; it.hits++; st.stats.scrapes++;
          Sfx.play('caveliftSnagCrunch'); G.shake = 0.2;
          sw.V = -sw.V * 0.5 - it.side * 90; K.spark(st, CX + sw.X + it.side * S.LW / 2, LIFTY, 8, [K.GLOW.teal, '#ffffff']);
          bad(st, 'scrape', it.hits >= 3 ? 'CRACK! The spike snapped off' : 'Scraped a crystal spike! Swing the lift away from it');
          if (it.hits >= 3) { it.done = true; Sfx.play('caveCrystalRing', 0.8); }
        }
      }
      if (st.y[0] > band[1] + 20) it.done = true;
    }
    st.y[0] = ny; st.y[1] = ny;
    for (let s = 0; s < 2; s++) { st.rat[s] += Math.abs(st.v[0]) * dt / 34; if (st.rat[s] >= 1) { st.rat[s] -= 1; if (s === 0) Sfx.play('caveliftCrankRatchet', 0, Math.abs(st.v[0]) / S.downV); } }
    things(st, dt);
    if (st.fray >= 1) winch(st);
    for (let id = 0; id < 2; id++) K.ofx(st, id).soot = clamp((mid(st) - st.depthAt[0]) / 16000, 0, 0.9);
  }

  /* ---------- the fray winch, stretch ends, the snap, landing ---------- */
  function winch(st) {
    if (st.state !== 'go') return;
    st.state = 'winch'; st.winchT = 0; st.stats.winched++;
    st.cp = mid(st) > st.half ? st.half : st.top;
    st.winchFrom = mid(st);
    Sfx.play('caveliftSlamBrake'); Sfx.play('caveliftRopeCreak');
    K.msg(st, 'The rope is frayed through! "Hold on, I\'ve got you!" Mabel winches you back up', '#ffd0c8', 3.2);
  }
  function winchStep(st, dt) {
    st.winchT += dt;
    const u = K.smooth(clamp((st.winchT - 0.6) / 1.8, 0, 1)), y = K.lerp(st.winchFrom, st.cp - 40, u);
    st.y[0] = y; st.y[1] = y;
    if (st.sw) { st.sw.X *= 1 - dt * 2; st.sw.V = 0; }
    if (st.winchT > 2.8) {
      st.state = 'go'; st.fray = 0.25;
      st.bats = []; st.fires = []; st.rocks = []; st.gusts = []; st.v = [0, 0]; st.block = [null, null]; st.knot = [null, null]; st.jamT = 0; st.lurchT = 0;
      for (const it of st.items) if (it.d >= st.cp - 60 && it.kind !== 'gem') { it.done = false; it.snag = false; it.jam = false; it.freed = false; it.wound = 0; if (it.kind === 'spike') it.hits = 0; }
      for (const it of st.items) if (it.kind === 'gem' && !st.gotGem[it.id] && it.d >= st.cp - 60) { it.done = false; it.missed = false; }
      st.u = [HOME[0], HOME[1]];
      K.msg(st, 'Back at the ' + (st.cp > st.top ? 'halfway ledge' : 'top of the stretch') + '. ' + st.title + '!', '#ffffff', 2.2);
    }
  }
  function endStretch(st) {
    st.stats.roomT[st.k] = G.time - st.segStart;
    if (st.k === 2) { st.state = 'snap'; st.snapT = 0; return; }
    if (st.k === 3) { st.state = 'end'; st.endT = 0; st.landY = mid(st); Sfx.play('caveliftLiftLand'); Sfx.play('caveThud'); G.shake = 0.3; return; }
    st.state = 'end'; st.endT = 0;
    Sfx.play('caveSting');
    K.pop(st, W / 2, 170, TITLES[st.k] + ' done! ' + Math.round(mid(st) / S.pxPerM) + ' m down', '#ffffff', 22);
  }
  function snapStep(st, dt) {
    st.snapT += dt;
    if (st.snapT > 0.5 && !st.snapped) {
      st.snapped = true; Sfx.play('caveliftRopeSnap'); G.shake = 0.5; Music.cue({ song: 'cavechase' });
      K.msg(st, 'SNAP! Bo\'s rope has gone! Pip, lower us. Bo, run to swing us past the spikes!', '#ffd0c8', 3.6);
      st.crate.wedged = true;
    }
    if (st.snapped) {
      // the right end drops and the lift swings from Pip's rope
      const u = clamp((st.snapT - 0.5) / 0.5, 0, 1);
      st.y[1] = K.lerp(st.y[1], st.y[0], u);
      st.snapX = Math.sin((st.snapT - 0.5) * 3) * 90 * (1 - clamp((st.snapT - 1.5) / 3, 0, 0.6));
    }
    if (st.snapT > 2.6) { st.snapV = 0; st.depthAt[3] = mid(st); nextRoom(); }
  }
  function endStep(st, dt) {
    st.endT += dt;
    if (st.k < 3) { if (st.endT > 2.2) { st.depthAt[st.k + 1] = mid(st); nextRoom(); } return; }
    // landed on the cavern floor: step out, and the ground shakes with a footstep
    if (st.sw) { st.sw.X *= 1 - dt * 3; st.sw.V = 0; }
    if (st.endT > 0.8) { st.u[0] = Math.max(-60, st.u[0] - dt * 90); st.u[1] = Math.min(S.LW + 60, st.u[1] + dt * 90); }
    if (st.endT > 2.0 && !st.foot) { st.foot = true; Sfx.play('caveliftFootstepQuake'); G.shake = 0.6; K.msg(st, st.crate.on ? 'Mabel\'s lamps delivered! ...What was that?' : 'The cavern floor! ...What was that?', '#ffffff', 2.4); }
    if (st.endT > 3.6 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 300 }; levelClear(); }
  }

  function mirror(st) {
    for (let id = 0; id < 2; id++) K.place(id, platX(st, st.u[id]), platY(st, st.u[id]) - 2);
  }
  // a point of the platform on screen (u along it from the left end)
  function platX(st, u) {
    const e = ends(st), X = st.sw ? st.sw.X : st.state === 'snap' && st.snapX ? st.snapX : 0;
    return e.xl + (u / S.LW) * (e.xr - e.xl) + X;
  }
  function platY(st, u) { const m = mid(st); return LIFTY + (st.y[0] - m) + (u / S.LW) * (st.y[1] - st.y[0]) + (st.state === 'end' && st.k === 3 ? 0 : 0); }
  const endX = (st, s) => platX(st, s === 0 ? 0 : S.LW);

  /* ---------- what to do next (the prompts, the HUD chips and the computer brain all read this) ---------- */
  function plan(st) {
    if (st.planMemo && st.planMemo.n === G.tickN) return st.planMemo.p;
    const p = st.sw ? planSwing(st) : planLift(st);
    st.planMemo = { n: G.tickN, p };
    return p;
  }
  function planLift(st) {
    const m = mid(st), e = ends(st), out = { dh: 0, why: 'level', next: null, jobs: [null, null], slam: false, dodge: [0, 0], wind: [false, false], narrow: false };
    // the next thing that needs a tilt (or a level lift)
    const ahead = st.items.filter(it => !it.done && (it.kind === 'shelf' && !(st.y[it.side] > it.d + it.th) || it.kind === 'narrow' && m < it.d + it.len)).sort((a, b) => a.d - b.d);
    const n0 = ahead[0];
    if (n0) {
      const dist = n0.kind === 'shelf' ? n0.d - st.y[n0.side] : n0.d - 14 - Math.max(st.y[0], st.y[1]);
      out.next = n0; out.dist = dist;
      // (a shelf stays the target once it is chosen, so winding a little never flips the plan back to level)
      if (n0.kind === 'shelf' && (dist < 320 || st.tiltFor === n0)) {
        st.tiltFor = n0;
        const pull = pullFor(n0.r) + 5, dh = Math.min(dhFor(pull) + 6, Math.sin((lurchAt(st) - 4) * DEG) * S.LW);
        out.dh = n0.side === 0 ? dh : -dh; out.why = 'shelf';
        // a second shelf on the other side right after: keep this tilt until this one is passed, then swing over
      } else if (n0.kind === 'narrow' && dist < 260) { out.dh = 0; out.why = 'narrow'; out.narrow = true; }
    }
    // a knot: that side winds, the other holds
    for (let s = 0; s < 2; s++) if (st.knot[s]) { out.wind[s] = true; out.why = 'knot'; out.knotSide = s; }
    // a snag: that end holds and the other end lets out more, to tip it further (out.more)
    out.more = [false, false];
    for (let s = 0; s < 2; s++) if (st.block[s]) out.more[1 - s] = true;
    // the slam brake: a shelf about to snag in under 0.4 s with no way to pull in enough in time
    if (n0 && n0.kind === 'shelf' && !st.block[n0.side]) {
      const s = n0.side, pull = s === 0 ? e.pullL : e.pullR, v = st.v[s];
      if (pull < pullFor(n0.r) && v > 60 && (n0.d - st.y[s]) / v < 0.4 && (n0.d - st.y[s]) > 0) out.slam = true;
    }
    // jobs on the platform: a bat, a fire, the crate (on each hero's half)
    const jobs = [];
    for (const b of st.bats) if (b.sit) jobs.push({ kind: 'bat', u: b.u });
    for (const f of st.fires) if (!f.out) jobs.push({ kind: 'fire', u: f.u, urgent: f.t > S.stampT - 1.5 });
    if (st.crate.on && Math.abs(st.crate.u - S.LW / 2) > 80) jobs.push({ kind: 'crate', u: st.crate.u });
    for (const j of jobs) {
      const id = j.u < S.LW / 2 ? 0 : 1;
      if (!out.jobs[id] || j.urgent) out.jobs[id] = j;
    }
    // rocks: step out from under the shadow
    for (const r of st.rocks) if (!r.hit) for (let id = 0; id < 2; id++) if (Math.abs(st.u[id] - r.u) < 34) out.dodge[id] = st.u[id] > r.u ? 1 : -1;
    for (let id = 0; id < 2; id++) if (out.dodge[id] && (st.u[id] + out.dodge[id] * 40 < RANGE[id][0] || st.u[id] + out.dodge[id] * 40 > RANGE[id][1])) out.dodge[id] = -out.dodge[id];
    // gusts: the lifted side should let out (the other holds)
    out.gust = st.gusts.find(g => g.t > g.tell - 0.3 && g.t < g.tell + S.gustT);
    // how far each end is ahead of where the plan wants it (positive: too low)
    const dh = st.y[1] - st.y[0];
    out.ahead = [-(dh - out.dh), dh - out.dh];
    out.tilt = tiltDeg(st);
    return out;
  }
  // predict the swing a little ahead (no pumping)
  function swingAt(sw, t) {
    let X = sw.X, V = sw.V; const n = Math.ceil(t / 0.02), d = t / Math.max(1, n);
    for (let k = 0; k < n; k++) { V += (-S.swW * S.swW * X - S.swDamp * V) * d; X += V * d; }
    return X;
  }
  function planSwing(st) {
    const sw = st.sw, y = st.y[0], out = { lower: true, why: 'lower', spike: null, swing: 'pump', grab: false };
    const next = st.items.filter(it => it.kind === 'spike' && !it.done && it.d + 22 > y - 15).sort((a, b) => a.d - b.d);
    const sp = next[0];
    if (sp) {
      // all spikes at that depth (a pair, one on each wall)
      const set = next.filter(it => Math.abs(it.d - sp.d) < 4);
      const safe = X => set.every(it => !(it.side * X > S.wallSw - it.r - 12));
      out.spike = sp; out.set = set;
      const dist = sp.d - 22 - (y + 15);
      if (set.length > 1) { out.swing = 'still'; }
      else { out.swing = 'pump'; out.side = -sp.side; }
      if (dist < 220) {
        // time to get through the band at full speed; lower only if the swing will be safe the whole way
        // (once inside the band, keep going: stopping there only scrapes again)
        const tIn = Math.max(0, dist) / S.downV, tOut = (sp.d + 22 + 15 - y) / S.downV;
        let ok = true;
        for (let t = tIn; t <= tOut + 0.05; t += 0.05) if (!safe(swingAt(sw, t))) { ok = false; break; }
        if (dist < 0) ok = true;
        else if (!ok) out.lower = dist > 60;
        out.why = ok ? 'go' : 'wait';
      }
      if (set.length > 1) {
        const ch = st.items.find(it => it.kind === 'chain' && !it.done && Math.abs(y - it.d) < 70);
        if (ch && Math.abs(sw.X) < 120) out.grab = true;
      }
    }
    out.amp = Math.hypot(sw.X, sw.V / S.swW);
    return out;
  }

  /* ---------- drawing ---------- */
  const ZONE = ['mine', 'rock', 'crystal', 'cavern'];
  function draw(st) {
    const t = st.clock, m = mid(st), camY = m - LIFTY, k = st.k, X = st.sw ? st.sw.X : st.state === 'snap' && st.snapX ? st.snapX : 0;
    K.back(0, camY, t, { zone: ZONE[k], par: 0.35, bright: 0.8 });
    const wallIn = k === 3 ? S.LW / 2 + 10 + S.wallSw : S.LW / 2 + 10;
    // the shaft walls (scroll with depth)
    drawWalls(st, camY, wallIn, t);
    // the floor of the cavern far below at the end
    if (k === 3) {
      const fy = st.top + st.len - camY + 20;
      if (fy < H + 60) {
        ctx.fillStyle = '#244a50'; ctx.fillRect(0, fy, W, H - fy + 20);
        K.mushrooms(-20, W + 20, fy + 4, t, { seed: 5, s: 0.9 });
        for (let x = 30; x < W; x += 110) K.cluster(x, fy + 6, 1.1, x, { t });
        if (st.crate.on && st.state === 'end') for (let x = 120; x < W; x += 180) { const lg = ctx.createRadialGradient(x, fy - 10, 2, x, fy - 10, 70); lg.addColorStop(0, 'rgba(255,220,140,0.5)'); lg.addColorStop(1, 'rgba(255,220,140,0)'); ctx.fillStyle = lg; ctx.fillRect(x - 70, fy - 80, 140, 140); ctx.fillStyle = '#ffcf6a'; rr(x - 4, fy - 16, 8, 12, 3); ctx.fill(); }
      }
    }
    // things in the shaft
    for (const it of st.items) {
      const sy = it.d - camY;
      if (sy < -120 || sy > H + 120) continue;
      if (it.kind === 'shelf') drawShelf(st, it, sy, t, wallIn);
      else if (it.kind === 'narrow') drawNarrow(st, it, sy, t, wallIn);
      else if (it.kind === 'gem' && !it.done) { const gx = it.side === 0 ? CX - wallIn + 6 : CX + wallIn - 6; K.gem(gx, sy, it.deep ? 9 : 8, t, { col: it.deep ? K.GLOW.rose : K.GLOW.teal }); if (it.deep) { ctx.strokeStyle = 'rgba(255,143,180,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(gx, sy, 14, 0, TAU); ctx.stroke(); } }
      else if (it.kind === 'water') { const x = it.side === 0 ? CX - S.LW / 2 - 10 : CX + S.LW / 2 - 50; const y0 = Math.max(-20, sy), y1 = Math.min(H + 20, sy + it.len); if (y1 > y0) { ctx.fillStyle = 'rgba(150,210,240,0.35)'; ctx.fillRect(x, y0, 60, y1 - y0); ctx.fillStyle = 'rgba(220,245,255,0.5)'; for (let k2 = 0; k2 < 8; k2++) ctx.fillRect(x + k2 * 7 + 2, y0 + ((t * 400 + k2 * 53) % Math.max(1, y1 - y0)), 2, 18); } }
      else if (it.kind === 'knot' && !it.freed) { const x = it.side === 0 ? CX - S.LW / 2 : CX + S.LW / 2; ctx.fillStyle = '#a8865a'; circle(x + X, sy, 7); ctx.fill(); ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2; ctx.stroke(); }
      else if (it.kind === 'spike' && !it.done) drawSpike(st, it, sy, t, wallIn);
      else if (it.kind === 'chain' && !it.done) { ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 3; for (let c = -6; c < 6; c++) { ctx.beginPath(); ctx.ellipse(CX + Math.sin(t * 2 + c) * 2, sy + c * 12, 3, 6, 0, 0, TAU); ctx.stroke(); } }
    }
    drawLift(st, t, X);
    // rocks falling
    for (const r of st.rocks) {
      const x = platX(st, r.u), y = platY(st, r.u);
      if (!r.hit) {
        const u = r.t / r.tell, sh = 10 + u * 18;
        ctx.fillStyle = 'rgba(0,0,0,' + (0.2 + u * 0.3) + ')'; ctx.beginPath(); ctx.ellipse(x, y - 2, sh, 4, 0, 0, TAU); ctx.fill();
        const ry = K.lerp(-40, y - 14, u * u);
        ctx.fillStyle = '#7a7a82'; ctx.beginPath(); ctx.moveTo(x - 10, ry - 8); ctx.lineTo(x + 8, ry - 12); ctx.lineTo(x + 12, ry + 4); ctx.lineTo(x - 2, ry + 10); ctx.lineTo(x - 12, ry + 2); ctx.closePath(); ctx.fill();
        for (let d = 0; d < 3; d++) { ctx.fillStyle = 'rgba(200,190,170,0.5)'; ctx.fillRect(x - 8 + d * 8, ((t * 300 + d * 40) % 60) - 10, 2, 5); }
      }
    }
    // bats
    for (const b of st.bats) {
      const tx = platX(st, b.u), ty = platY(st, b.u) - 34;
      if (b.flee) K.bat(tx + b.flee * 200 * (b.u < S.LW / 2 ? -1 : 1), ty - b.flee * 160, t, { seed: b.seed });
      else if (!b.sit) { const u = clamp(b.t / b.fly, 0, 1); K.bat(K.lerp(b.u < S.LW / 2 ? -40 : W + 40, tx, u), K.lerp(ty - 160, ty, u) + Math.sin(t * 9 + b.seed) * 6, t, { seed: b.seed, face: b.u < S.LW / 2 ? 1 : -1 }); }
      else K.bat(tx, ty + 14, t, { sit: true, seed: b.seed });
    }
    // fires
    for (const f of st.fires) {
      const x = platX(st, f.u), y = platY(st, f.u) - 4, fl = 1 + Math.sin(t * 20 + f.u) * 0.2;
      ctx.fillStyle = 'rgba(255,140,40,0.8)'; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.quadraticCurveTo(x - 6, y - 10 * fl, x, y - 18 * fl); ctx.quadraticCurveTo(x + 6, y - 10 * fl, x + 7, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,230,120,0.9)'; ctx.beginPath(); ctx.ellipse(x, y - 4, 3, 6 * fl, 0, 0, TAU); ctx.fill();
      // a ring that runs out before it scorches the rope
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 8, 14, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - f.t / S.stampT)); ctx.stroke();
    }
    K.drawParts(st, -1e9);
    K.drawGlitter(st, 0, camY);
    // the first dark stretch is lit by the lamps: a soft vignette
    const vg = ctx.createRadialGradient(CX, LIFTY, 120, CX, LIFTY, 620);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + (k === 0 ? 0.45 : 0.3) + ')');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
  function drawWalls(st, camY, wallIn, t) {
    const k = st.k, Z = K.ZONES[ZONE[k]], step = 90;
    const y0 = Math.floor(camY / step) - 1;
    for (const sd of [-1, 1]) {
      const edge = CX + sd * wallIn;
      ctx.fillStyle = k === 0 ? '#5a4634' : k === 1 ? '#4c5a66' : k === 2 ? '#38606a' : '#2e5660';
      ctx.beginPath(); ctx.moveTo(sd < 0 ? 0 : W, -10);
      const rim = [];
      for (let n = y0; n <= y0 + H / step + 2; n++) { const y = n * step - camY, j = K.hash(n * 7 + (sd > 0 ? 3 : 0)) * 14; ctx.lineTo(edge - sd * j, y); rim.push([edge - sd * j, y]); }
      ctx.lineTo(sd < 0 ? 0 : W, H + 10); ctx.closePath(); ctx.fill();
      // a lit rim along the wall face and a shadow cast into the shaft, so the walls read as walls
      const sh = ctx.createLinearGradient(edge, 0, edge - sd * 46, 0); sh.addColorStop(0, 'rgba(0,0,0,0.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sh; ctx.fillRect(Math.min(edge, edge - sd * 46), 0, 46, H);
      ctx.strokeStyle = k === 0 ? 'rgba(255,214,160,0.45)' : 'rgba(200,240,255,0.4)'; ctx.lineWidth = 3; ctx.beginPath();
      rim.forEach(([x, y], n) => (n ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      for (let n = y0; n <= y0 + H / step + 2; n++) {
        const y = n * step - camY, h = K.hash(n * 3 + (sd > 0 ? 11 : 0));
        if (k === 0) {
          // timber cribbing and an old lantern now and then
          K.timber(sd < 0 ? edge - 130 : edge, y, 130, 12, sd);
          if (h > 0.7) { const lx = edge - sd * 26; const lg = ctx.createRadialGradient(lx, y + 26, 2, lx, y + 26, 60); lg.addColorStop(0, 'rgba(255,190,100,0.45)'); lg.addColorStop(1, 'rgba(255,190,100,0)'); ctx.fillStyle = lg; ctx.fillRect(lx - 60, y - 34, 120, 120); ctx.fillStyle = '#ffcf6a'; rr(lx - 4, y + 16, 8, 12, 3); ctx.fill(); }
        } else if (k === 1) {
          if (h > 0.5) { ctx.fillStyle = 'rgba(170,220,255,0.3)'; ctx.fillRect(edge - sd * (8 + h * 30), y, 2, 40 + h * 40); }
        } else {
          if (h > 0.45) K.crystal(edge - sd * 4, y + 30, 22 + h * 30, sd * (-1.3 + h * 0.4), { col: K.GLOWS[Math.floor(h * 97) % K.GLOWS.length], t, seed: n });
        }
      }
    }
    if (k >= 2) K.glowWorms(CX - wallIn + 20, CX + wallIn - 20, -((camY * 0.5) % 300) - 40, t, { seed: 3, n: 10 });
    void Z;
  }
  K.timber = K.timber || ((x, y, w, h) => { ctx.fillStyle = K.COL.timber; ctx.fillRect(x, y, w, h); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x, y, w, 3); });
  function drawShelf(st, it, sy, t, wallIn) {
    const sd = it.side === 0 ? -1 : 1, edge = CX + sd * wallIn, tip = edge - sd * it.r;
    const x0 = Math.min(edge, tip) - (sd < 0 ? 40 : 0), x1 = Math.max(edge, tip) + (sd > 0 ? 40 : 0);
    if (st.k === 0) { ctx.fillStyle = K.COL.timberDark; ctx.fillRect(x0, sy, x1 - x0, it.th); ctx.fillStyle = '#b07a44'; ctx.fillRect(x0, sy, x1 - x0, 9); ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 2; ctx.strokeRect(x0, sy, x1 - x0, it.th); }
    else K.rock(x0, sy, x1 - x0, it.th + 6, { seed: it.d, col: '#6a747e' });
    // the tell: a lantern or a glow on the shelf, seen from well above
    const lx = tip + sd * 8, lg = ctx.createRadialGradient(lx, sy - 6, 2, lx, sy - 6, 46);
    const col = st.k >= 2 ? K.rgba(K.GLOW.rose, 0.55) : 'rgba(255,190,90,0.55)';
    lg.addColorStop(0, col); lg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = lg; ctx.fillRect(lx - 46, sy - 52, 92, 92);
    if (st.k >= 2) K.crystal(lx, sy, 18, 0, { col: K.GLOW.rose, t }); else { ctx.fillStyle = '#ffcf6a'; rr(lx - 4, sy - 13, 8, 12, 3); ctx.fill(); }
  }
  function drawNarrow(st, it, sy, t, wallIn) {
    // the shaft pinches in: painted converging stripes at the top
    for (const sd of [-1, 1]) {
      const edge = CX + sd * wallIn;
      ctx.fillStyle = st.k === 0 ? '#4a3a2a' : '#45525c';
      ctx.fillRect(sd < 0 ? edge - 60 : edge - 4, sy, 64, it.len);
      for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? '#ffd25a' : '#2a2a2a'; ctx.beginPath(); const yy = sy - 70 + k * 14; ctx.moveTo(edge, yy); ctx.lineTo(edge - sd * 40, yy + 70 - k * 4); ctx.lineTo(edge - sd * 40, yy + 78 - k * 4); ctx.lineTo(edge, yy + 8); ctx.closePath(); ctx.fill(); }
    }
    text('NARROWS: KEEP LEVEL', CX, sy - 30, 13, '#ffd25a', 'center', 'body');
  }
  function drawSpike(st, it, sy, t, wallIn) {
    const sd = it.side, edge = CX + sd * wallIn, tip = edge - sd * it.r;
    ctx.save(); ctx.globalAlpha = it.hits >= 3 ? 0.3 : 1;
    const col = K.GLOWS[(Math.round(it.d) >> 3) % K.GLOWS.length];
    ctx.fillStyle = K.rgba(col, 0.25); ctx.beginPath(); ctx.ellipse((edge + tip) / 2, sy, it.r * 0.7, 30, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = K.shade(col, -0.3); ctx.beginPath(); ctx.moveTo(edge, sy - 22); ctx.lineTo(tip, sy); ctx.lineTo(edge, sy + 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = K.shade(col, 0.2); ctx.beginPath(); ctx.moveTo(edge, sy - 22); ctx.lineTo(tip, sy); ctx.lineTo(edge, sy - 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = K.shade(col, -0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(edge, sy - 22); ctx.lineTo(tip, sy); ctx.lineTo(edge, sy + 22); ctx.stroke();
    for (let h = 0; h < it.hits; h++) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(K.lerp(edge, tip, 0.3 + h * 0.15), sy - 10); ctx.lineTo(K.lerp(edge, tip, 0.35 + h * 0.15), sy + 8); ctx.stroke(); }
    ctx.restore();
  }
  function drawLift(st, t, X) {
    const e = ends(st), m = mid(st), yl = LIFTY + st.y[0] - m, yr = LIFTY + st.y[1] - m, xl = e.xl + X, xr = e.xr + X;
    const snapped = st.k === 3 || st.snapped;
    // the ropes up to the top
    ctx.strokeStyle = '#c8a46a'; ctx.lineWidth = 3;
    if (!snapped) {
      ctx.beginPath(); ctx.moveTo(xl, yl - 40); ctx.lineTo(xl, -20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xr, yr - 40); ctx.lineTo(xr, -20); ctx.stroke();
    } else {
      // Pip's rope now runs over a pulley above the middle of the shaft: the lift hangs from it on a chain bridle and
      // swings like a pendulum; the snapped end of Bo's rope flails
      const bx = (xl + xr) / 2, by = Math.min(yl, yr) - 120;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(CX + X * 0.12, -20); ctx.stroke();
      ctx.strokeStyle = '#9a9a9a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xl + 3, yl - 40); ctx.lineTo(bx, by); ctx.lineTo(xr - 3, yr - 40); ctx.stroke();
      ctx.fillStyle = '#8a8a90'; circle(bx, by, 5); ctx.fill();
      ctx.strokeStyle = '#c8a46a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xr, yr - 40); ctx.quadraticCurveTo(xr + 20 + Math.sin(t * 5) * 14, yr - 70, xr + 6 + Math.sin(t * 3) * 20, yr - 110); ctx.stroke();
    }
    // fray strands on the ropes
    if (st.fray > 0.3) { ctx.strokeStyle = 'rgba(230,200,140,0.8)'; ctx.lineWidth = 1; for (let k = 0; k < Math.floor(st.fray * 6); k++) { const yy = yl - 60 - k * 22; ctx.beginPath(); ctx.moveTo(xl, yy); ctx.lineTo(xl - 6 - k % 3 * 2, yy + 4); ctx.stroke(); if (!snapped) { ctx.beginPath(); ctx.moveTo(xr, yy); ctx.lineTo(xr + 6, yy + 5); ctx.stroke(); } } }
    // the platform: planks, a low rail, corner posts with the crank drums
    const ang = Math.atan2(yr - yl, xr - xl), len = Math.hypot(xr - xl, yr - yl);
    ctx.save(); ctx.translate(xl, yl); ctx.rotate(ang);
    ctx.fillStyle = st.gold ? '#c8a03a' : '#7a5230'; ctx.fillRect(0, 0, len, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 1; k < 8; k++) ctx.fillRect(k * len / 8, 0, 2, 14);
    ctx.fillStyle = '#5a3a1c'; ctx.fillRect(0, 12, len, 5);
    ctx.fillStyle = '#5a3a1c'; ctx.fillRect(0, -40, 6, 52); ctx.fillRect(len - 6, -40, 6, 52);
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(0, -18, len, 3);
    // the crank drums with their handles (turning while the rope runs)
    for (const [dx, s] of [[3, 0], [len - 3, 1]]) {
      ctx.fillStyle = st.gold ? C.gold : '#6a6a72'; circle(dx, -36, 9); ctx.fill(); ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 2; ctx.stroke();
      const a = st.rat[s] * TAU * (st.v[s] < 0 ? -1 : 1);
      ctx.strokeStyle = '#3a3a40'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(dx, -36); ctx.lineTo(dx + Math.cos(a) * 12, -36 + Math.sin(a) * 12); ctx.stroke();
    }
    ctx.restore();
    // the crate of glow lamps
    if (st.crate.on && !(st.k === 3 && st.state === 'end' && st.endT > 1)) {
      const cx = platX(st, st.crate.u), cy = platY(st, st.crate.u);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
      ctx.fillStyle = '#a8784a'; ctx.fillRect(-16, -22, 32, 22); ctx.strokeStyle = '#5a3a1c'; ctx.lineWidth = 2; ctx.strokeRect(-16, -22, 32, 22);
      ctx.beginPath(); ctx.moveTo(-16, -22); ctx.lineTo(16, 0); ctx.stroke();
      ctx.fillStyle = '#fff3d6'; ctx.fillRect(-13, -15, 26, 8); text('LAMPS', 0, -11, 8, '#5a3a1c', 'center', 'body');
      const lg = ctx.createRadialGradient(0, -24, 1, 0, -24, 16); lg.addColorStop(0, 'rgba(255,220,140,0.6)'); lg.addColorStop(1, 'rgba(255,220,140,0)'); ctx.fillStyle = lg; ctx.fillRect(-16, -40, 32, 32);
      ctx.restore();
    }
    // the heroes (drawn by the engine look with the level outfit)
    for (let id = 0; id < 2; id++) {
      const x = platX(st, st.u[id]), y = platY(st, st.u[id]) - 1;
      const crank = st.at[id] && !st.sw || (st.sw && id === 0);
      const bob = st.stun[id] > 0 ? 0 : Math.abs(Math.sin(st.walkPh[id])) * (st.at[id] ? 0 : 2);
      K.hero(id, x, y - bob, { face: crank ? (id === 0 ? 1 : -1) : st.face[id], stun: st.stun[id] > 0, sy: st.stun[id] > 0 ? 0.8 : crank && Math.abs(st.v[id]) > 30 ? 0.94 + Math.sin(t * 20) * 0.04 : 1 });
      // puff ring
      if (st.puff[id] > 0.05) { ctx.strokeStyle = st.restT[id] > 0 ? '#ff7a6a' : 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + (id ? -22 : 22), y - 40, 7, -Math.PI / 2, -Math.PI / 2 + TAU * st.puff[id]); ctx.stroke(); }
      if (st.stun[id] > 0) for (let k = 0; k < 3; k++) { const a = t * 5 + k * TAU / 3; text('★', x + Math.cos(a) * 14, y - 34 + Math.sin(a) * 4, 11, '#ffd25a', 'center', 'display'); }
    }
  }
  function drawTop(st) { K.drawPops(st, 0, 0); }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '◆ ' + st.gems + ' / ' + S.gems, dm = Math.round(mid(st) / S.pxPerM) + ' m';
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + ctx.measureText(dm).width + fs * 2 + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(dm, x0 + 15 + ctx.measureText(tm).width + fs, cy, fs, '#bfe8ff', 'left', 'body');
      text(n, x0 + w - 15, cy, fs, '#bff8ef', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    K.drawMabel(st);
    if (!play || !st.items) return;
    // the fray rope, the tilt arrow and the shaft strip
    {
      const w = 220 * z, h = 12 * z, x = W / 2 - w / 2, y = H - 44 * z;
      ctx.fillStyle = 'rgba(23,25,29,0.78)'; rr(x - 10 * z, y - 22 * z, w + 20 * z, 50 * z, 12 * z); ctx.fill();
      text('Fray', x, y - 10 * z, 11 * z, '#ffffff', 'left', 'body');
      // a rope with strands: plaited, the frayed part pale and broken
      for (let k = 0; k < 22; k++) { const u = k / 22, fr = u < st.fray; ctx.fillStyle = fr ? (st.fray > 0.7 ? '#ff7a5a' : '#f2c87a') : '#c8a46a'; rr(x + u * w, y + (k % 2) * 2, w / 22 - 1, h - 2, 3); ctx.fill(); }
      if (!st.sw) {
        const td = tiltDeg(st), lim = lurchAt(st), u = clamp(td / (lim + 6), -1, 1), ax = W / 2 + 48 * z, ay = y - 10 * z;
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(td * DEG);
        ctx.strokeStyle = Math.abs(td) > lim - 3 ? '#ff5a4a' : Math.abs(td) > S.slide ? '#ffb04a' : '#8fe3b0'; ctx.lineWidth = 3 * z;
        ctx.beginPath(); ctx.moveTo(-26 * z, 0); ctx.lineTo(26 * z, 0); ctx.stroke(); ctx.restore();
        text(Math.round(Math.abs(td)) + '°', ax + 36 * z, ay, 11 * z, '#ffffff', 'left', 'body');
        void u;
      } else {
        const a = clamp(st.sw.X / S.swMax, -1, 1), ax = W / 2 + 48 * z, ay = y - 10 * z;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax - 30 * z, ay); ctx.lineTo(ax + 30 * z, ay); ctx.stroke();
        ctx.fillStyle = '#ffd25a'; circle(ax + a * 30 * z, ay, 5 * z); ctx.fill();
        text('swing', ax + 38 * z, ay, 11 * z, '#ffffff', 'left', 'body');
      }
    }
    drawStrip(st, z);
    const pl = plan(st);
    if (!st.sw) {
      for (let id = 0; id < 2; id++) {
        const bx = K.panel(id, id ? 'right crank' : 'left crank', 200, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 12 * z) / 3, x0 = bx.x + 12 * z;
        const kk = what => (K.quiet(id) ? '' : K.key(id, what) + ' ');
        const a = pl.ahead[id], wantDown = a < -6 && !st.knot[id], wantUp = pl.wind[id] || a > 40;
        K.chip(x0, cy, cw, chh, kk('down') + 'LOWER', wantDown && st.v[id] <= 0 && st.at[id], st.v[id] > 0, z);
        K.chip(x0 + cw + 6 * z, cy, cw, chh, 'HOLD', !wantDown && !wantUp && st.v[id] > 0, st.at[id] && st.v[id] === 0, z);
        K.chip(x0 + (cw + 6 * z) * 2, cy, cw, chh, kk('up') + 'WIND', wantUp && st.v[id] >= 0 && st.at[id], st.v[id] < 0, z);
      }
    } else {
      {
        const bx = K.panel(0, 'lowers', 200, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
        K.chip(x0, cy, cw, chh, (K.quiet(0) ? '' : K.key(0, 'down') + ' ') + 'LOWER', pl.lower && st.v[0] <= 0, st.v[0] > 0, z);
        K.chip(x0 + cw + 6 * z, cy, cw, chh, 'WAIT', !pl.lower && st.v[0] > 0, !pl.lower && st.v[0] === 0, z);
      }
      {
        const bx = K.panel(1, 'swings', 200, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
        K.chip(x0, cy, cw, chh, (K.quiet(1) ? '' : K.key(1, 'lr') + ' ') + 'SWING', pl.swing === 'pump' && pl.amp < 110, pl.swing === 'pump' && pl.amp >= 110, z);
        K.chip(x0 + cw + 6 * z, cy, cw, chh, (K.quiet(1) ? '' : K.key(1, 'act') + ' ') + 'GRAB', pl.grab && !st.sw.grab, !!st.sw.grab, z);
      }
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st);
    for (let id = 0; id < 2; id++) {
      const x = platX(st, st.u[id]), y = platY(st, st.u[id]) - 44;
      let s = null, pulse = false;
      if (!st.sw) {
        const j = pl.jobs[id], a = pl.ahead[id];
        if (pl.dodge[id]) { s = 'Rock! Step ' + K.key(id, pl.dodge[id] > 0 ? 'right' : 'left'); pulse = true; }
        else if (st.knot[id]) { s = 'Knot! Wind up ' + K.key(id, 'up'); pulse = true; }
        else if (st.block[id]) { s = 'Snagged! Wind up ' + K.key(id, 'up'); pulse = true; }
        else if (j && (j.kind === 'fire' || j.kind === 'bat') && Math.abs(st.u[id] - j.u) < 34) { s = (j.kind === 'fire' ? 'Stamp! ' : 'Shoo! ') + K.key(id, 'act'); pulse = true; }
        else if (j && j.kind === 'crate' && Math.abs(st.u[id] - j.u) < 36) { s = 'Push the crate! ' + K.key(id, 'act'); pulse = true; }
        else if (j && (j.kind === 'fire' || j.kind === 'bat') && (j.urgent || j.kind === 'bat')) { s = (j.kind === 'fire' ? 'Spark!' : 'Bats!') + ' Walk ' + K.key(id, j.u > st.u[id] ? 'right' : 'left'); }
        else if (!st.at[id]) s = 'Back to your crank ' + K.key(id, HOME[id] > st.u[id] ? 'right' : 'left');
        else if (pl.why === 'shelf' && a > 40) { s = 'Your side up! ' + K.key(id, 'up'); pulse = true; }
        else if (pl.why === 'shelf' && a < -30) { s = 'Let out! ' + K.key(id, 'down'); }
        else if (pl.why === 'narrow' && Math.abs(pl.tilt) > S.narrowTilt) { s = a > 0 ? 'Level it! Hold' : 'Level it! ' + K.key(id, 'down'); pulse = true; }
      } else if (id === 0) {
        if (!pl.lower && st.v[0] > 0) { s = 'Wait! Spike below'; pulse = true; }
        else if (pl.lower && pl.why === 'go') s = 'Now! Lower ' + K.key(0, 'down');
      } else {
        if (pl.grab && !st.sw.grab) { s = 'Grab the chain! Hold ' + K.key(1, 'act'); pulse = true; }
        else if (pl.swing === 'pump' && pl.amp < 90) s = 'Run to swing us ' + K.key(1, 'lr');
        else if (pl.swing === 'still' && pl.amp > 40) s = 'Run against the swing to slow it';
      }
      P.say(id, s, x, y, C.gold, pulse);
    }
  }
  // the shaft strip: what is coming up on each wall (left of the screen)
  function drawStrip(st, z) {
    const x = 16, y0 = 60 * z + 20, h = 300 * z, w = 34 * z, m = mid(st), span = 1400;
    ctx.fillStyle = 'rgba(23,25,29,0.7)'; rr(x, y0, w, h, 8); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 4, y0 + 18, w - 8, 3);
    for (const it of st.items) {
      if (it.done && it.kind !== 'shelf') continue;
      const u = (it.d - m) / span; if (u < -0.03 || u > 1) continue;
      const yy = y0 + 20 + u * (h - 24);
      if (it.kind === 'shelf' && !(st.y[it.side] > it.d + it.th)) { ctx.fillStyle = '#ffb04a'; ctx.fillRect(it.side === 0 ? x + 3 : x + w / 2, yy - 2, w / 2 - 3, 5); }
      else if (it.kind === 'narrow') { ctx.fillStyle = '#ffd25a'; ctx.fillRect(x + 3, yy, 4, Math.max(3, it.len / span * h)); ctx.fillRect(x + w - 7, yy, 4, Math.max(3, it.len / span * h)); }
      else if (it.kind === 'spike') { ctx.fillStyle = K.GLOW.rose; ctx.beginPath(); const ex = it.side < 0 ? x + 3 : x + w - 3; ctx.moveTo(ex, yy - 4); ctx.lineTo(ex - it.side * 12, yy); ctx.lineTo(ex, yy + 4); ctx.fill(); }
      else if (it.kind === 'gem') { ctx.fillStyle = K.GLOW.teal; circle(it.side === 0 ? x + 8 : x + w - 8, yy, 2.5); ctx.fill(); }
      else if (it.kind === 'knot' || it.kind === 'water' || it.kind === 'gust') { ctx.fillStyle = it.kind === 'water' ? '#8fd0ff' : it.kind === 'gust' ? '#ffffff' : '#c8a46a'; ctx.fillRect(it.side === 0 ? x + 3 : x + w - 9, yy, 6, it.kind === 'water' ? Math.max(4, it.len / span * h) : 4); }
    }
    text('▼', x + w / 2, y0 + 9, 10, '#ffffff', 'center', 'body');
  }

  const medal = t => K.medal(t <= S.goldT, t <= S.silverT);
  MODES.cavelift = {
    S, plan, medal, tiltDeg, ends, mid, HOME, RANGE, swingAt,
    setup(st, L) {
      st.stats = { lurches: 0, snags: 0, bonks: 0, shooed: 0, stamps: 0, fires: 0, gems: 0, slams: 0, scrapes: 0, chains: 0, winched: 0, crateLost: false, missed: [], badWhy: [], helps: 0, roomT: [] };
      st.gems = 0; st.gotGem = {}; st.fray = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0; st.T = 0; st.items = null;
      st.y = [0, 0]; st.u = [HOME[0], HOME[1]]; st.face = [1, -1]; st.at = [true, true]; st.walkPh = [0, 0]; st.stun = [0, 0];
      st.puff = [0, 0]; st.restT = [0, 0]; st.windT = [0, 0]; st.rat = [0, 0]; st.depthAt = [0, 0, 0, 0];
      st.crate = { on: true, u: S.LW / 2, push: 0, pushT: 0 };
      for (const row of L.grid) row.fill('.');
      K.mabel(st, 'Crank steady, you two! That lift is older than I am!');
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
        { label: 'Glow gems', value: st.gems + ' of ' + S.gems },
        { label: 'Lurches', value: String(s.lurches) },
        { label: 'Snags', value: String(s.snags + s.scrapes) },
        { label: 'Medal', value: medal(G.time) },
      ];
      out.push('Bonks: ' + s.bonks + '. Bats shooed: ' + s.shooed + '. ' + (st.crate.on ? 'Mabel\'s lamps delivered!' : 'The lamp crate was lost down the shaft.'));
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const legend = {
    pip: '<kbd>S</kbd> lower your side <kbd>W</kbd> wind up <kbd>A</kbd><kbd>D</kbd> walk',
    bo: '<kbd>↓</kbd> lower your side <kbd>↑</kbd> wind up <kbd>←</kbd><kbd>→</kbd> walk',
  };
  CAVE.defs.cavelift = {
    name: 'Mine Lift Plunge', world: 38, kind: 'team', mode: 'cavelift', outfit: 'cavelift', music: 'cavedeep', amb: 'caveShaft',
    ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend,
    tip: 'Each of you lowers one side. Keep it level, or tip it on purpose to slip past the rocks.',
    howTo: [
      'Hold down to let out your rope. Let go and your side stops.',
      'If one side gets too far ahead the lift lurches. Watch the tilt arrow.',
      'Walk away from your crank to dodge rocks, shoo bats and grab gems. It brakes itself.',
      'At the end Bo\'s rope snaps: Pip lowers the lift and Bo runs to swing it past the spikes.',
    ],
    act: { label: 'brake', labels: ['brake', 'brake'] },
    map: K.stubMap(),
    rooms: [
      { title: TITLES[0], act: { label: 'brake', labels: ['brake', 'brake'] }, tip: 'Hold ▼ together to go down level. Tip it on purpose so the side with a shelf is high.' },
      { title: TITLES[1], act: { label: 'brake', labels: ['brake', 'brake'] }, tip: 'Falling rocks, bats and a waterfall that makes one crank slip. A knot? Wind up a moment.' },
      { title: TITLES[2], act: { label: 'brake', labels: ['brake', 'brake'] }, tip: 'Updrafts lift one side, and the shelves swap sides fast. Two narrows: keep it level!' },
      { title: TITLES[3], act: { label: 'brake', labels: ['brake', 'grab'] }, tip: 'Pip lowers the whole lift. Bo runs along it to swing it past the spikes, and grabs chains to stop.' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.caveliftCrankRatchet = function (side, sp) { const f = 900 + (sp || 0.5) * 500 + (side ? 60 : 0); this.tone(f, 0.025, 'square', 0.012, f * 0.7); this.noise(0.02, { type: 'highpass', f: 3000, vol: 0.01 }); };
  Sfx.extra.caveliftCrankWind = function () { this.tone(220, 0.18, 'sawtooth', 0.012, 260); this.tone(800, 0.04, 'square', 0.008, 600, 0.12); };
  Sfx.extra.caveliftBrakeSqueal = function () { this.tone(2400, 0.22, 'sawtooth', 0.008, 2000); this.tone(3100, 0.18, 'square', 0.004, 2800); };
  Sfx.extra.caveliftSlamBrake = function () { this.tone(140, 0.2, 'square', 0.05, 70); this.noise(0.18, { type: 'bandpass', f: 1800, q: 2, vol: 0.06 }); this.tone(2600, 0.3, 'sawtooth', 0.01, 1800, 0.02); };
  Sfx.extra.caveliftRopeCreak = function () { this.tone(170, 0.5, 'sawtooth', 0.02, 130); };
  Sfx.extra.caveliftRopeFray = function () { this.tone(340, 0.08, 'triangle', 0.025, 160); this.noise(0.06, { type: 'highpass', f: 2500, vol: 0.015 }); };
  Sfx.extra.caveliftPlankGroan = function () { this.tone(110, 0.45, 'sawtooth', 0.016, 85); this.tone(160, 0.3, 'triangle', 0.012, 120, 0.1); };
  Sfx.extra.caveliftLurchBang = function () { this.tone(70, 0.4, 'sine', 0.12, 36); this.noise(0.35, { type: 'lowpass', f: 900, to: 120, vol: 0.12 }); this.tone(1200, 0.15, 'square', 0.02, 400, 0.02); };
  Sfx.extra.caveliftSnagCrunch = function () { this.noise(0.25, { type: 'bandpass', f: 700, to: 200, q: 1, vol: 0.09 }); this.tone(120, 0.2, 'square', 0.03, 60); };
  Sfx.extra.caveliftRockRattle = function () { for (let k = 0; k < 6; k++) this.tone(600 + Math.random() * 600, 0.03, 'square', 0.01, 300, k * 0.08); this.noise(0.5, { type: 'highpass', f: 2000, vol: 0.012, a: 0.1 }); };
  Sfx.extra.caveliftRockThud = function () { this.tone(80, 0.3, 'sine', 0.09, 40); this.noise(0.2, { type: 'lowpass', f: 600, vol: 0.07 }); };
  Sfx.extra.caveliftBonkStars = function () { this.tone(1400, 0.2, 'triangle', 0.025, 2000); this.tone(1800, 0.25, 'triangle', 0.015, 2400, 0.08); };
  Sfx.extra.caveliftBatFlap = function () { for (let k = 0; k < 6; k++) this.noise(0.05, { f: 900, q: 1.2, vol: 0.02, delay: k * 0.07 }); };
  Sfx.extra.caveliftBatSqueak = function () { this.tone(4200, 0.05, 'sine', 0.015, 5200); this.tone(4800, 0.04, 'sine', 0.01, 5600, 0.07); };
  Sfx.extra.caveliftShooSwat = function () { this.noise(0.12, { f: 600, to: 1800, q: 1, vol: 0.05 }); };
  Sfx.extra.caveliftSparkFizz = function () { this.noise(0.4, { type: 'highpass', f: 3500, vol: 0.03, a: 0.02 }); };
  Sfx.extra.caveliftStampOut = function () { this.tone(120, 0.1, 'square', 0.04, 70); this.noise(0.2, { type: 'highpass', f: 2000, to: 800, vol: 0.02 }); };
  Sfx.extra.caveliftCrateSlide = function () { this.noise(0.25, { f: 400, q: 3, vol: 0.03, a: 0.03 }); };
  Sfx.extra.caveliftKnotJam = function () { this.tone(200, 0.15, 'square', 0.03, 120); this.tone(260, 0.1, 'triangle', 0.02, 160, 0.1); };
  Sfx.extra.caveliftKnotFree = function () { this.tone(400, 0.08, 'triangle', 0.03, 700); this.tone(700, 0.1, 'triangle', 0.02, 900, 0.07); };
  Sfx.extra.caveliftWaterfallRush = function () { this.noise(1.3, { f: 1200, q: 0.5, vol: 0.02, a: 0.2 }); };
  Sfx.extra.caveliftUpdraftWhoosh = function () { this.noise(1.2, { f: 300, to: 1400, q: 1, vol: 0.04, a: 0.3 }); };
  Sfx.extra.caveliftRopeSnap = function () { this.tone(1800, 0.05, 'square', 0.06, 300); this.noise(0.1, { type: 'highpass', f: 3000, vol: 0.08 }); this.tone(60, 0.6, 'sine', 0.1, 30, 0.05); };
  Sfx.extra.caveliftSwingCreak = function () { this.tone(150, 0.6, 'sawtooth', 0.016, 110); };
  Sfx.extra.caveliftChainGrab = function () { this.tone(1600, 0.08, 'square', 0.02, 1200); this.tone(2200, 0.15, 'triangle', 0.015, null, 0.03); };
  Sfx.extra.caveliftLiftLand = function () { this.tone(60, 0.5, 'sine', 0.12, 30); this.noise(0.4, { type: 'lowpass', f: 500, to: 80, vol: 0.1 }); };
  Sfx.extra.caveliftFootstepQuake = function () { this.tone(40, 1.2, 'sine', 0.16, 25); this.noise(1.0, { type: 'lowpass', f: 250, to: 50, vol: 0.14 }); };
})();
