/* Pip & Bo - Level 33-2 Flash Flood Climb (team, World 33 Storm Chasers). */
'use strict';

/* ===== 33-2 Flash Flood Climb (mode 'floodclimb', team, scrolls UP, Gavyn's pick) =====
   A canyon is filling with brown floodwater. Winch and rope each other up before the water reaches you. The
   water never stops.
   World px: y grows downward, the canyon floor of a stretch is ledge 0 at y = 480 and the ledges go up from there
   (negative y). Ledges stick out from the canyon walls, left and right in turn, and you can jump up through them from
   below (one-way). Each climb from ledge j to ledge j+1 happens at one column, X[j]: the next ledge's end is right
   above it, with an anchor ring. The mode owns the tick, the camera and the picture (def.ownStep + ownHUD + noFalls);
   the engine grid is only spawns.
   ROPE HERO (G.mst.rope): runs and jumps. On a ledge end with an anchor ring, HOLD the action to drop the rope (it
     reaches 190 px down); the partner climbs it with ▲ ▼. Let go while someone is on it and they get 0.4 s, then slide
     back down to where they started.
   WINCH HERO (G.mst.boost; 'boost' is only the old name in the code): strong arms. Every climb has an ORE BUCKET on a
     rope (a lift cage on the Mine Scaffold) with a crank 100 px along the ledge: the rope hero stands in the bucket and
     the winch hero HOLDS the action at the crank to wind it up to the next ledge (a plain jump is not high enough).
     Tap the action next to a wedged boulder to shove it off into the flood. (Gavyn, 2026-11-15: the winch replaced a
     crouch springboard, "jump off your partner".)
   Both jump, climb a dropped rope (jump next to it to grab on; ▲ or jump climbs, ▼ slides, jump with ◀ ▶ lets go) and can ride a
   floating log (it rolls over 2.5 s after you step on it).
   WATER: rises all the time (faster each stretch), and keeps up with fast climbers: it is never more than 250 px
   below the lower hero, so it is always in sight at the bottom of the screen. Touching it sweeps a hero away: a rope
   from above pulls them up onto the partner's ledge after 1.5 s, the water jumps up a little and then holds still for
   4 s. If both are in the water, the stretch starts
   again. CRUMBLING SHELVES crack when touched and fall 1.8 s later. WATERFALL SPOUTS burst from the wall on a rhythm
   (a drip, then a 1 s gush that shoves you along the ledge and knocks you off a rope). FLASH SURGE (once a stretch
   from stretch 2): a siren, "SURGE!", the water jumps 90 px over 2 s; a white line on the wall shows where to.
   STRETCHES (roles swap): The Dry Wash (teaches winch then rope), Root Wall (logs, crumbling shelves, a boulder), The
   Narrows (spouts, a surge), Mine Scaffold (two of the climbs are old mine lift cages instead of buckets; ending on the
   rim next to the van as the canyon brims over).
   RAIN GAUGES: 20, on the ledges (some just above the water at the start) and on little shelves a plain jump reaches.
   GOLD HELP (3 sweeps in a stretch, restarts included, only while both are playing): a gold life ring, the water
   rises 30% slower for the rest of the stretch.
   MEDAL (MODES.floodclimb.medals, js/medals.js): Gold <= 190 s with 16 or more gauges and 2 or fewer sweeps; Silver <= 330 s.
   MODES.floodclimb.plan(st) says what each hero should do now (the prompts, the HUD chips and the computer brain read
   it). Sounds are Sfx.extra.floodclimb*. */
(() => {
  const K = STORMCHASE, TAU = Math.PI * 2, FONT = K.FONT;
  const S = {
    floor: 480, g: 1700, jumpV: 600, runV: 220, acc: 2400, maxFall: 900, climbV: 160, ropeLen: 190, ropeDrop: 0.3,
    graceT: 0.4, grabR: 18, anchorR: 22, bw: 22, bh: 26, sweepT: 1.5, sweepJump: 16, crumbleT: 1.8, logRoll: 2.5,
    surge: 90, surgeT: 2, spoutIdle: 3.2, spoutWarn: 1, spoutGush: 1, spoutPush: 260, crankV: 150, shelfH: 84, goldT: 190, silverT: 330,
    idleWait: 12, ledgeH: 16, wallL: 130, wallR: 830, chase: 250, chaseV: 120, calmT: 4,
  };

  /* ---------- a stretch (one room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.rope = def.ropeHero || 0; st.boost = 1 - st.rope; st.title = def.title || '';
    st.def = def; st.state = 'go'; st.endT = 0; st.party = false; st.cleared = false; st.lastRoom = false;
    st.rc = { bad: 0 }; st.segStart = G.time; st.goldUsed = false; st.ring = false;
    build(st, def);
    restart(st);
    K.fx(st); labels(st); mirror(st);
  }
  function labels(st) { const w = []; w[st.rope] = 'rope'; w[st.boost] = 'winch'; K.actLabels(w, 'rope'); }
  // the canyon for one stretch: ledges zig-zag up between the walls, one climb column per ledge
  function build(st, def) {
    const wl = def.wallL || S.wallL, wr = def.wallR || S.wallR;
    st.wl = wl; st.wr = wr;
    const n = def.steps, X = [], ledges = [];
    let y = S.floor;
    ledges.push({ j: 0, x0: wl, x1: wr, y, kind: 'floor' });
    for (let j = 0; j < n; j++) {
      // columns alternate sides of the canyon, with a little wander
      const right = j % 2 === (def.flip ? 1 : 0), h = K.hash(j * 7 + st.k * 31);
      X.push(right ? wr - 120 - h * 110 : wl + 120 + h * 110);
    }
    for (let j = 1; j <= n; j++) {
      y -= def.gaps ? def.gaps[(j - 1) % def.gaps.length] : 168;
      const a = X[j - 1], next = j < n ? X[j] : null;
      // ledge j's end sits just past the column below (its anchor), the rest runs to the far wall
      const goRight = next === null ? a < (wl + wr) / 2 : next > a;
      const top = j === n;
      const ledge = top ? { j, x0: wl, x1: wr, y, kind: 'rim' } : goRight ? { j, x0: a - 20, x1: wr, y, end: -1 } : { j, x0: wl, x1: a + 20, y, end: 1 };
      ledge.ax = top ? a : goRight ? a - 2 : a + 2; // where the rope hero stands to drop the rope
      ledge.rx = top ? a : goRight ? a - 30 : a + 30; // where the rope hangs
      if (top) { ledge.rx = a; }
      ledges.push(ledge);
    }
    // on the rim the rope hangs down through a gap... the rim is a full-width top: give it an edge at the column
    const rim = ledges[n], a = X[n - 1];
    if (a > (wl + wr) / 2) { rim.x0 = a - 20; rim.ax = a - 2; rim.rx = a - 30; rim.end = -1; } else { rim.x1 = a + 20; rim.ax = a + 2; rim.rx = a + 30; rim.end = 1; }
    st.X = X; st.ledges = ledges; st.topY = rim.y;
    // a winch at every climb: the climb from ledge j uses an ore bucket (def.lifts: a lift cage) at the column and a
    // crank 100 px along the ledge
    st.lifts = X.map((lx, j) => {
      const L0 = ledges[j], dir = L0.x1 - lx > lx - L0.x0 ? 1 : -1;
      return { j, x: lx, y: L0.y, top: ledges[j + 1].y, crankX: lx + dir * 100, dir, u: 0, cy: L0.y, kind: (def.lifts || []).includes(j) ? 'cage' : 'bucket' };
    });
    // boulders: wedged at the winch column of ledge j (in the bucket's way); shoved, they roll to the wall and drop into the flood
    st.rocks = (def.rocks || []).map(j => ({ j, x: X[j], y: ledges[j].y, w: 54, h: 120, gone: false, vx: 0, fall: 0 }));
    // shelves with gauges, near the wall on each ledge listed
    st.shelves = []; st.gauges = [];
    const gs = def.gauges || [];
    for (const g of gs) {
      const L0 = ledges[g.j];
      if (g.shelf) {
        const sx = L0.end === -1 || (L0.kind === 'floor' && g.side > 0) ? Math.min(wr - 70, L0.x1 - 60) : Math.max(wl + 70, L0.x0 + 60);
        const x = g.x !== undefined ? g.x : sx;
        const sh = { x0: x - 34, x1: x + 34, y: L0.y - S.shelfH, crumbly: !!def.crumbly, crack: -1, gone: false, j: g.j };
        st.shelves.push(sh);
        st.gauges.push({ x, y: sh.y - 20, got: false, shelf: sh, j: g.j });
      } else {
        // on the ledge itself, between the columns
        const x0 = Math.max(L0.x0 + 40, wl + 40), x1 = Math.min(L0.x1 - 40, wr - 40);
        const x = g.x !== undefined ? g.x : K.lerp(x0, x1, g.u === undefined ? 0.5 : g.u);
        st.gauges.push({ x, y: L0.y - 20, got: false, shelf: null, j: g.j });
      }
    }
    st.spouts = (def.spouts || []).map((j, i) => {
      const L0 = ledges[j], wallSide = L0.end === -1 ? 1 : -1; // the wall end of this ledge
      return { j, x: wallSide > 0 ? wr : wl, side: wallSide, y: L0.y - 30, t: i * 1.7, phase: 'idle' };
    });
    st.surgeAt = def.surge || 0;
  }
  // also after both are swept away: back to the floor with the water low
  function restart(st) {
    const L0 = st.ledges[0];
    st.h = [0, 1].map(id => ({ id, x: K.lerp(L0.x0, L0.x1, 0.42 + id * 0.12), y: L0.y, vx: 0, vy: 0, face: 1, grounded: true, on: 0, st: 'free', t: 0, sq: 0, sweep: 0, stun: 0, pushT: 0 }));
    st.water = S.floor + (st.def.water0 || 120); st.wv = st.def.wv; st.surgeLeft = 0; st.surged = false; st.stT = 0;
    st.ropeOn = null; st.ropeU = 0; st.grace = 0; st.calmT = 0;
    st.logs = []; st.logT = 2;
    for (const l of st.lifts) { l.u = 0; l.cy = l.y; }
    for (const r of st.rocks) { r.gone = false; r.x = st.X[r.j]; r.vx = 0; r.fall = 0; r.y = st.ledges[r.j].y; }
    for (const s of st.shelves) { s.crack = -1; s.gone = false; }
    st.camY = S.floor - 400; st.shake = 0;
  }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.ledges) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dt * 2);
    if (!st.waiting && G.introT <= 0) K.bolts(st, dt, [6, 10]);
    if (live) {
      st.stT += dt;
      waterStep(st, dt);
      shelves(st, dt); spouts(st, dt); lifts(st, dt); rocks(st, dt); logs(st, dt);
      for (const h of st.h) hero(st, h, dt);
      ropeStep(st, dt);
      gauges(st);
      sweepCheck(st);
      if (st.h.every(h => h.st !== 'swept' && h.grounded && h.on === st.ledges.length - 1)) finish(st);
    } else if (st.state === 'end') endStep(st, dt);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    cam(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }
  function waterStep(st, dt) {
    let v = st.wv * (st.ring ? 0.7 : 1);
    // the flood keeps up with fast climbers: it is never more than S.chase px below the lower hero, so it is always
    // in sight at the bottom of the screen (from there it only closes in at its steady speed)
    const up = st.h.filter(h => h.st !== 'swept');
    if (up.length) { const gap = st.water - Math.max(...up.map(h => h.y)); if (gap > S.chase) v = Math.max(v, Math.min(S.chaseV, (gap - S.chase) * 3)); }
    // just after a rescue the flood holds still for a moment (no sweep straight after a sweep)
    if (st.calmT > 0) { st.calmT -= dt; v = 0; }
    if (st.surgeAt && !st.surged && st.stT >= st.surgeAt) {
      st.surged = true; st.surgeLeft = S.surge; st.surgeLine = st.water - S.surge;
      Sfx.play('stormSiren'); K.msg(st, 'SURGE! The water is jumping up to the white line!', '#ffd0c8', 2.6);
      st.shake = 0.8;
    }
    if (st.surgeLeft > 0) { const d = Math.min(st.surgeLeft, S.surge / S.surgeT * dt); st.surgeLeft -= d; st.water -= d; if (st.surgeLeft <= 0) st.surgeLine = null; }
    st.water -= v * dt;
    st.water = Math.max(st.water, st.topY + 60);
  }
  // what a hero can stand on at height y (feet), x: ledges, shelves, the lift cage, boulders' tops, logs
  function floors(st) {
    const out = [];
    for (const L0 of st.ledges) out.push({ x0: L0.x0, x1: L0.x1, y: L0.y, on: L0.j });
    for (const s of st.shelves) if (!s.gone) out.push({ x0: s.x0, x1: s.x1, y: s.y, on: L0j(st, s), shelf: s });
    for (const l of st.lifts) out.push({ x0: l.x - 26, x1: l.x + 26, y: l.cy, on: l.cy <= l.top + 0.5 ? l.j + 1 : l.j, cage: l });
    for (const g of st.logs) if (!g.rolled) out.push({ x0: g.x - 40, x1: g.x + 40, y: st.water - 8, on: -1, log: g });
    return out;
  }
  const L0j = (st, s) => s.j;
  function hero(st, h, dt) {
    h.t += dt;
    if (h.sq > 0) h.sq = Math.max(0, h.sq - dt * 4);
    if (h.st === 'swept') {
      h.sweep -= dt;
      if (h.sweep <= 0) rescue(st, h);
      return;
    }
    const p = G.players[h.id], i = p.input, isRope = h.id === st.rope;
    const jump = p.pendingJump;
    if (h.stun > 0) h.stun -= dt;
    if (h.pushT > 0) h.pushT -= dt;
    // on the rope: climb with ▲ ▼ (or the jump key), jump with ◀ ▶ or ▼ lets go (a jump press alone keeps climbing)
    if (h.st === 'rope') {
      const R = st.ropeOn;
      if (!R) { h.st = 'free'; h.grounded = false; return; }
      const side = i.left || i.right, up = i.up || (i.jump && !side), dn = i.down;
      if (jump && (side || dn) && h.ropeT > 0.25) { h.st = 'free'; h.vy = -200; h.grounded = false; h.vx = (i.right ? 1 : i.left ? -1 : 0) * 150; return; }
      h.ropeT += dt;
      h.x = R.rx;
      const below = st.ledges[R.j - 1], bottom = below ? Math.min(below.y, R.y + S.ropeLen) : R.y + S.ropeLen;
      if (st.grace > 0 && !R.held) { /* let go above: hanging on for a moment */ }
      else if (up) h.y -= S.climbV * dt;
      else if (dn) h.y += S.climbV * dt;
      h.y = clamp(h.y, R.y, bottom);
      if (h.y <= R.y + 6) {
        // at the top: step onto the ledge
        h.st = 'free'; h.y = R.y; h.grounded = true; h.on = R.j; h.x = R.ax - R.end * 22; h.vy = 0; h.sq = 0.8;
        Sfx.play('floodclimbTop'); K.pop(st, h.x, h.y - 50, 'Up!', '#ffffff', 18);
      } else if (dn && h.y >= bottom - 0.5 && below) {
        // the bottom of the rope: step off onto the ledge below
        h.st = 'free'; h.grounded = true; h.vy = 0; h.y = below.y; h.on = below.j;
        h.x = clamp(h.x, below.x0 + 10, below.x1 - 10);
      }
      return;
    }
    const want = h.st === 'hold' || h.st === 'crank' ? 0 : (i.right ? 1 : 0) - (i.left ? 1 : 0);
    if (want) h.face = want;
    // the winch hero's crank; the rope hero's rope
    const atCrank = !isRope && h.grounded && st.lifts.find(l => Math.abs(h.x - l.crankX) < 22 && Math.abs(h.y - l.y) < 2);
    if (!isRope && h.grounded && i.act && Math.abs(h.vx) < 40 && h.stun <= 0 && atCrank) h.st = 'crank';
    else if (h.st === 'crank') h.st = 'free';
    if (!isRope && p.pendingAct && h.grounded && !atCrank && !st.rocks.some(r => !r.gone && !r.vx && Math.abs(r.y - h.y) < 2 && Math.abs(r.x - h.x) < r.w / 2 + 26)) K.hintOnce(st, 'crank' + st.k + h.on, h.id, 'Hold the action at the crank to wind the bucket up');
    if (isRope) {
      const L1 = st.ledges[h.on];
      const at = h.grounded && L1 && L1.ax !== undefined && L1.j > 0 && Math.abs(h.x - L1.ax) < S.anchorR;
      if (i.act && at && h.stun <= 0) {
        if (h.st !== 'hold') { h.st = 'hold'; st.ropeOn = { j: L1.j, rx: L1.rx, ax: L1.ax, y: L1.y, end: L1.end || 1, held: true }; st.ropeU = 0; Sfx.play('floodclimbRope'); }
        st.ropeOn.held = true; h.x = approach(h.x, L1.ax, 120 * dt);
      } else if (h.st === 'hold') {
        h.st = 'free';
        if (st.ropeOn) st.ropeOn.held = false;
      }
      if (p.pendingAct && !at && h.grounded) K.hintOnce(st, 'anchor' + st.k + h.on, h.id, 'Drop the rope at the ring on a ledge end');
    }
    // the winch hero shoves a boulder
    if (!isRope && p.pendingAct && h.grounded) {
      const r = st.rocks.find(r => !r.gone && !r.vx && Math.abs(r.y - h.y) < 2 && Math.abs(r.x - h.x) < r.w / 2 + 26);
      if (r) { r.vx = Math.sign(r.x - h.x || 1) * 340; Sfx.play('floodclimbShove'); K.pop(st, r.x, r.y - 140, 'SHOVE!', '#ffffff', 22); st.stats.shoves++; h.st = 'free'; }
    }
    if (h.st === 'hold' || h.st === 'crank') { h.vx = 0; gravity(st, h, dt); return; }
    const acc = h.grounded ? S.acc : S.acc * 0.55;
    if (h.pushT <= 0) h.vx = approach(h.vx, want * S.runV, acc * dt);
    // jumping: next to a dropped rope it grabs on
    if (jump && h.stun <= 0) {
      const R = st.ropeOn, rl = R && st.ropeU >= 1;
      if (rl && Math.abs(h.x - R.rx) < S.grabR && h.y > R.y + 20 && h.y <= R.y + S.ropeLen + 30 && h.id !== st.rope) {
        h.st = 'rope'; h.ropeT = 0; h.vx = 0; h.vy = 0; h.grounded = false; h.y = Math.min(h.y - 4, R.y + S.ropeLen); Sfx.play('floodclimbGrab');
        return;
      }
      if (h.grounded) { h.vy = -S.jumpV; h.grounded = false; h.sq = 0.5; Sfx.play('floodclimbJump', h.id); }
    }
    h.x += h.vx * dt;
    // walls and boulders
    h.x = clamp(h.x, st.wl + 11, st.wr - 11);
    for (const r of st.rocks) {
      if (r.gone || r.fall > 0) continue;
      if (h.y > r.y - r.h + 2 && h.y <= r.y + 1) {
        const d = h.x - r.x, lim = r.w / 2 + S.bw / 2;
        if (Math.abs(d) < lim) { h.x = r.x + Math.sign(d || -h.face) * lim; h.vx = 0; K.hintOnce(st, 'rock' + r.j + h.id, h.id, h.id === st.boost ? 'Tap ' + K.key(h.id, 'act') + ' to shove the boulder!' : NAMES[st.boost] + ' can shove that boulder!'); }
      }
    }
    gravity(st, h, dt);
  }
  function gravity(st, h, dt) {
    const oy = h.y;
    if (h.grounded) {
      // still on something?
      const f = floors(st).find(f => h.x > f.x0 - 4 && h.x < f.x1 + 4 && Math.abs(f.y - h.y) < 3);
      if (f) { h.y = f.y; if (f.on >= 0) h.on = f.on; if (f.shelf && f.shelf.crack < 0 && f.shelf.crumbly) { f.shelf.crack = 0; Sfx.play('stormCrack'); } if (f.log) f.log.ride = (f.log.ride || 0); return; }
      h.grounded = false;
    }
    h.vy = Math.min(S.maxFall, h.vy + S.g * dt);
    let ny = h.y + h.vy * dt;
    if (h.vy >= 0) {
      for (const f of floors(st)) {
        if (oy <= f.y + 0.5 && ny >= f.y && h.x > f.x0 - 4 && h.x < f.x1 + 4) {
          ny = f.y; h.vy = 0; h.grounded = true; h.sq = 0.6; if (f.on >= 0) h.on = f.on;
          if (f.shelf && f.shelf.crumbly && f.shelf.crack < 0) { f.shelf.crack = 0; Sfx.play('stormCrack'); }
          break;
        }
      }
    }
    h.y = ny;
  }
  function ropeStep(st, dt) {
    const R = st.ropeOn;
    if (!R) return;
    if (R.held) { st.ropeU = Math.min(1, st.ropeU + dt / S.ropeDrop); st.grace = S.graceT; return; }
    // let go: someone on it gets a moment, then slides down; nobody on it: it's pulled up
    const on = st.h.find(h => h.st === 'rope');
    if (on) {
      st.grace -= dt;
      if (st.grace <= 0) {
        on.st = 'free'; on.vy = 60; on.grounded = false; on.y = Math.max(on.y, R.y + 20);
        const below = st.ledges[R.j - 1]; if (below) on.x = clamp(R.rx, below.x0 + 12, below.x1 - 12);
        Sfx.play('floodclimbSlide'); K.pop(st, on.x, on.y - 40, 'Whoa!', '#ffd0c8', 18);
        K.hintOnce(st, 'keepHold' + st.k, st.rope, 'Keep holding until ' + NAMES[on.id] + ' is up!');
        st.ropeOn = null; st.ropeU = 0;
      }
    } else { st.ropeU -= dt / S.ropeDrop; if (st.ropeU <= 0) { st.ropeOn = null; st.ropeU = 0; } }
  }
  function shelves(st, dt) {
    for (const s of st.shelves) {
      if (s.gone || s.crack < 0) continue;
      s.crack += dt;
      if (s.crack >= S.crumbleT) {
        s.gone = true; Sfx.play('floodclimbCrumble');
        for (let k = 0; k < 10; k++) K.part(st, K.lerp(s.x0, s.x1, Math.random()), s.y, (Math.random() - 0.5) * 120, 40 + Math.random() * 100, 1, k % 2 ? '#8a7a6a' : '#5a4e44', 4, 800, 'dot');
        for (const h of st.h) if (h.grounded && h.y === s.y && h.x > s.x0 - 4 && h.x < s.x1 + 4) h.grounded = false;
      }
    }
  }
  function spouts(st, dt) {
    for (const sp of st.spouts) {
      sp.t += dt;
      const cyc = S.spoutIdle + S.spoutWarn + S.spoutGush, u = sp.t % cyc;
      sp.phase = u < S.spoutIdle ? 'idle' : u < S.spoutIdle + S.spoutWarn ? 'warn' : 'gush';
      sp.left = sp.phase === 'idle' ? S.spoutIdle - u : 0;
      if (sp.phase === 'gush' && sp.last !== 'gush') Sfx.play('floodclimbGush');
      sp.last = sp.phase;
      if (sp.phase !== 'gush') continue;
      for (const h of st.h) {
        if (h.st === 'swept') continue;
        const dx = (h.x - sp.x) * -sp.side;
        if (dx < 0 || dx > 200 || h.y < sp.y - 10 || h.y > sp.y + 40) continue;
        if (h.st === 'rope') { h.st = 'free'; h.vy = 100; h.grounded = false; }
        if (h.st === 'hold' || h.st === 'crank') h.st = 'free';
        h.vx = -sp.side * S.spoutPush; h.pushT = 0.15;
        const cycN = Math.round((sp.t - u) / cyc) + 1;
        if (h.gushHit !== cycN) { h.gushHit = cycN; st.stats.gushes++; K.pop(st, h.x, h.y - 50, 'Splosh!', '#bfe6ff', 18); K.hintOnce(st, 'spout' + st.k, h.id, 'Wait for the gush to stop!'); }
      }
    }
  }
  function lifts(st, dt) {
    for (const l of st.lifts) {
      const B = st.h[st.boost], rid = st.h.find(h => h.grounded && Math.abs(h.y - l.cy) < 3 && Math.abs(h.x - l.x) < 28);
      const crank = B.st === 'crank' && Math.abs(B.x - l.crankX) < 22;
      const oy = l.cy;
      if (crank && l.cy > l.top) {
        l.cy = Math.max(l.top, l.cy - S.crankV * dt); if (Math.random() < 0.2) Sfx.play('floodclimbCrank');
        if (l.cy - l.top < 3) l.cy = l.top;   // (the last few px at once: a rider this close steps onto the ledge)
        if (l.cy <= l.top && rid) { st.stats.rides++; Sfx.play('floodclimbClank'); K.pop(st, l.x, l.top - 60, 'CLANK!', '#ffe08a', 18); }
      }
      // an empty cage goes back down only when both heroes are below its top (someone may still need a ride)
      else if (!crank && !rid && l.cy < l.y && st.h.every(h => h.st === 'swept' || h.on <= l.j)) l.cy = Math.min(l.y, l.cy + S.crankV * 1.5 * dt);
      // carry whoever stands in the cage (at the top the cage is level with the ledge: nobody is carried down)
      if (l.cy !== oy) for (const h of st.h) if (h.grounded && Math.abs(h.y - oy) < 3 && Math.abs(h.x - l.x) < 26) { h.y = l.cy; h.on = l.cy <= l.top + 0.5 ? l.j + 1 : l.j; }
    }
  }
  function rocks(st, dt) {
    for (const r of st.rocks) {
      if (r.gone || !r.vx) continue;
      const L0 = st.ledges[r.j];
      if (r.fall <= 0) {
        r.x += r.vx * dt; r.rot = (r.rot || 0) + r.vx * dt / 30;
        if (r.x < L0.x0 + 10 || r.x > L0.x1 - 10 || r.x < st.wl + 30 || r.x > st.wr - 30) { r.fall = 0.001; r.vy = 0; Sfx.play('floodclimbRumble'); }
      } else {
        r.fall += dt; r.vy += 1400 * dt; r.y += r.vy * dt; r.rot += dt * 3;
        if (r.y > st.water) { r.gone = true; Sfx.play('stormSplash'); for (let k = 0; k < 16; k++) K.part(st, r.x, st.water, (Math.random() - 0.5) * 260, -150 - Math.random() * 200, 0.8, '#efe6d0', 4, 700, 'dot'); st.logs.push({ x: clamp(r.x, st.wl + 50, st.wr - 50), vx: 0, rock: true, t: 0 }); }
      }
    }
  }
  function logs(st, dt) {
    st.logT -= dt;
    if (st.logT <= 0 && st.def.logs) { st.logT = 6 + Math.random() * 5; const fromL = Math.random() < 0.5; st.logs.push({ x: fromL ? st.wl + 40 : st.wr - 40, vx: (fromL ? 1 : -1) * (20 + Math.random() * 20), t: 0 }); }
    for (const g of st.logs) {
      g.t += dt; g.x += g.vx * dt;
      if (g.x < st.wl + 40 || g.x > st.wr - 40) g.vx = -g.vx;
      const riders = st.h.filter(h => h.grounded && h.st !== 'swept' && Math.abs(h.y - (st.water - 8)) < 4 && Math.abs(h.x - g.x) < 44);
      for (const h of riders) { h.x += g.vx * dt; h.y = st.water - 8; }
      if (riders.length) { g.ride = (g.ride || 0) + dt; if (g.ride > S.logRoll && !g.rolled) { g.rolled = true; g.rollT = 0; Sfx.play('stormSplash'); for (const h of riders) h.grounded = false; } }
      else if (!g.rolled) g.ride = Math.max(0, (g.ride || 0) - dt);
      if (g.rolled) { g.rollT += dt; if (g.rollT > 1.5) { g.rolled = false; g.ride = 0; } }
    }
    st.logs = st.logs.filter(g => g.t < 40);
  }
  function gauges(st) {
    for (const h of st.h) {
      if (h.st === 'swept') continue;
      for (const q of st.gauges) {
        if (q.got || Math.abs(q.x - h.x) > 20 || Math.abs(q.y - (h.y - 13)) > 24) continue;
        q.got = true; st.gaugeN++;
        Sfx.play('stormPop', 1 + (st.gaugeN % 5) * 0.06); K.spark(st, q.x, q.y, 6, ['#8fdcff', '#ffffff']);
        if (q.y > st.water - 70) K.pop(st, q.x, q.y - 30, 'Close one!', '#bfe6ff', 16);
      }
    }
  }
  function sweepCheck(st) {
    for (const h of st.h) {
      if (h.st === 'swept' || h.y < st.water + 4) continue;
      // on a floating log: safe
      if (h.grounded && st.logs.some(g => !g.rolled && Math.abs(h.x - g.x) < 44) && Math.abs(h.y - (st.water - 8)) < 6) continue;
      sweep(st, h);
    }
  }
  function sweep(st, h) {
    if (st.ropeOn && h.st === 'hold') st.ropeOn.held = false;
    h.st = 'swept'; h.sweep = S.sweepT; h.vx = 0; h.vy = 0; h.grounded = false;
    st.stats.sweeps++; st.rc.bad++;
    st.water -= S.sweepJump;
    Sfx.play('stormSplash'); Sfx.play('floodclimbSweep');
    K.pop(st, h.x, st.water - 40, 'Swept away!', '#ffd0c8', 22);
    for (let k = 0; k < 18; k++) K.part(st, h.x, st.water, (Math.random() - 0.5) * 300, -150 - Math.random() * 220, 0.9, '#efe6d0', 4, 700, 'dot');
    const o = st.h[1 - h.id];
    // (sweeps are counted over the whole stretch, a restart included, so a pair that keeps being washed back gets the ring)
    const gold = st.rc.bad >= 3 && !st.goldUsed && K.both(st);
    if (gold) { st.goldUsed = true; st.ring = true; }
    if (o.st === 'swept') {
      // both in the water: the stretch starts again
      st.stats.restarts++;
      if (gold) K.goldHelp(st, 'Both swept away! Gold life ring: the water rises 30% slower for the rest of this stretch');
      else K.msg(st, 'Both swept away! The rescue team hauls you back to the start of the stretch.', '#ffd0c8', 3.4);
      Sfx.play('stormSiren');
      st.restartT = 1.6;
      setTimeout0(st);
      return;
    }
    if (gold) K.goldHelp(st, 'Gold life ring! The water rises 30% slower for the rest of this stretch');
    else K.msg(st, 'Rope from above! ' + NAMES[h.id] + ' is pulled up to ' + NAMES[o.id] + '.', '#ffe7a8', 2.4);
  }
  // (a stretch restart waits a moment so the splash shows)
  function setTimeout0(st) { st.h.forEach(h => { h.sweep = 1.6; h.both = true; }); }
  function rescue(st, h) {
    if (h.both) {
      // both swept: back to the floor
      const stats = st.stats; restart(st); st.stats = stats;
      K.pop(st, (st.wl + st.wr) / 2, S.floor - 120, 'Try again!', '#ffffff', 24);
      return;
    }
    const o = st.h[1 - h.id];
    // up onto the partner's ledge (or the highest ledge clear of the water)
    // (the partner's ledge even if they are in mid-jump: a ledge further up would leave the two more than one climb apart)
    let L1 = o.on >= 0 && st.ledges[o.on].y < st.water - 30 ? st.ledges[o.on] : null;
    if (!L1) L1 = st.ledges.find(L => L.y < st.water - 60) || st.ledges[st.ledges.length - 1];
    h.st = 'free'; h.y = L1.y; h.grounded = true; h.on = L1.j; h.vy = 0; h.vx = 0;
    h.x = clamp(o.on === L1.j ? o.x + (o.x > (L1.x0 + L1.x1) / 2 ? -40 : 40) : (L1.x0 + L1.x1) / 2, Math.max(L1.x0, st.wl) + 14, Math.min(L1.x1, st.wr) - 14);
    // not inside a boulder
    for (const r of st.rocks) if (!r.gone && r.j === L1.j && Math.abs(h.x - r.x) < r.w / 2 + 12) h.x = r.x + (h.x < r.x ? -1 : 1) * (r.w / 2 + 14);
    h.sq = 1; Sfx.play('floodclimbTop');
    st.calmT = S.calmT;
  }
  function finish(st) {
    st.state = 'end'; st.endT = 0;
    const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
    st.lastRoom = last; st.stats.roomT[st.k] = G.time - st.segStart;
    st.stats.margin = Math.max(st.stats.margin || 0, 0);
    st.stats.lowest = Math.min(st.stats.lowest === undefined ? 9999 : st.stats.lowest, Math.round(st.water - st.topY));
    Sfx.play('stormCheer');
    K.pop(st, (st.wl + st.wr) / 2, st.topY - 120, last ? 'Out of the canyon! The van is waiting!' : (st.def.done || 'Made it up!') + ' Swap jobs!', '#ffffff', 26);
    for (const h of st.h) { h.st = 'free'; h.vx = 0; }
    st.ropeOn = null;
  }
  function endStep(st, dt) {
    st.endT += dt;
    st.water -= 30 * dt * (st.lastRoom ? 1 : 0.4);
    if (st.lastRoom) {
      if (st.endT > 0.6 && !st.party) { st.party = true; Sfx.play('floodclimbFanfare'); K.confetti(st, (st.wl + st.wr) / 2, st.topY - 120, 50); }
      if (st.endT > 3 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 200 }; levelClear(); }
    } else if (st.endT > 2.2) nextRoom();
  }

  /* ---------- the camera: follows the lower hero, keeps the water in sight when it can ---------- */
  function cam(st, dt) {
    const ys = st.h.filter(h => h.st !== 'swept').map(h => h.y);
    if (!ys.length) return;
    const lo = Math.max(...ys), hi = Math.min(...ys);
    let want = Math.max(st.water - H + 30, lo - 360);
    want = Math.min(want, hi - 120, lo - 160);
    want = Math.min(want, S.floor + 60 - H);
    st.camY = K.lerp(st.camY, want, Math.min(1, dt * 4));
  }
  const camX = () => 0;
  function mirror(st) {
    for (const h of st.h) K.place(h.id, h.x, h.st === 'swept' ? -100 : h.y - st.camY);
  }

  /* ---------- what to do next ----------
     plan(st): { stage ('rope' | 'lift' | 'down' | 'top'), j (the ledge both should leave), rope: { x, act, jump,
       up, why }, boost: { x, act, jump, up, why }, waterGap (px from the lower hero's feet to the water), gauge (one worth
       a detour, or null) } */
  function ledgeOf(st, h) {
    if (h.st === 'rope') return st.ropeOn ? st.ropeOn.j - 1 : h.on;
    return h.on;
  }
  // a gauge on ledge j or its shelf worth a detour: on the ledge while the water is 90 px off, a shelf at 150
  const gaugeFor = (st, j, gap) => st.gauges.find(q => !q.got && q.j === j && (!q.shelf || (!q.shelf.gone && gap > 150)) && gap > 90) || null;
  // out of a spout's reach (it shoves 200 px along the ledge from the wall)
  const clear = (sp, x) => ((x - sp.x) * -sp.side < 215 ? sp.x - sp.side * 228 : x);
  function plan(st) {
    const R = st.h[st.rope], B = st.h[st.boost];
    const out = { stage: 'top', j: 0, rope: { x: R.x, why: 'wait' }, boost: { x: B.x, why: 'wait' }, waterGap: 999, gauge: null };
    if (!st.ledges || st.state !== 'go') return out;
    const r = ledgeOf(st, R), b = ledgeOf(st, B), n = st.ledges.length - 1;
    const lowY = Math.max(R.st === 'swept' ? -1e9 : R.y, B.st === 'swept' ? -1e9 : B.y);
    out.waterGap = st.water - lowY;
    if (R.st === 'swept' || B.st === 'swept') { out.stage = 'wait'; return out; }
    // the rope hero fell below the winch hero: the winch hero comes down to them (off the open end of its ledge)
    if (r < b) {
      const L1 = st.ledges[b];
      out.stage = 'down'; out.j = r;
      // (not when the flood is about to take that ledge: the rope hero is pulled up here by the rescue rope instead)
      if (st.ledges[r].y > st.water - 80) return out;
      const endX = L1.end === 1 ? L1.x1 + 30 : L1.end === -1 ? L1.x0 - 30 : B.x;
      out.boost = { x: endX, why: 'down' };
      out.rope = { x: R.x, why: 'wait' };
      return out;
    }
    const j = b;
    out.j = j;
    if (j >= n) { out.stage = 'top'; out.rope = { x: R.x, why: 'top' }; out.boost = { x: B.x, why: 'top' }; return out; }
    const X = st.X[j], up = st.ledges[j + 1], lift = st.lifts.find(l => l.j === j);
    const inward = up.end === -1 ? 1 : -1; // which way ledge j+1 runs from its end
    if (r === j && lift) {
      // the winch: the winch hero cranks, the rope hero rides
      out.stage = 'lift';
      // a boulder in the bucket's way: the winch hero shoves it first
      const rock = st.rocks.find(k => !k.gone && k.j === j && k.fall <= 0);
      if (rock) {
        const side = Math.sign(B.x - rock.x) || 1, bx = rock.x + side * (rock.w / 2 + 14);
        out.boost = { x: bx, act: Math.abs(B.x - bx) < 10 && !rock.vx ? 'tap' : false, why: 'shove' };
        out.rope = { x: rock.x + Math.sign(R.x - rock.x || 1) * (rock.w / 2 + 50), why: 'wait' };
        return out;
      }
      const down = lift.cy >= lift.y - 0.5;
      // a gauge on this ledge first (while the bucket is still down)
      const gg = down ? gaugeFor(st, j, out.waterGap) : null;
      if (gg) { out.gauge = gg; out.rope = { x: gg.x, why: 'gauge' }; out.boost = { x: lift.crankX, act: false, why: 'crank-wait' }; return out; }
      // a spout about to gush over the bucket or the crank: wait it out clear of it (before the ride starts)
      const spout = down && st.spouts.find(sp => sp.j === j && (sp.phase !== 'idle' || sp.left < 0.8) && (Math.abs(lift.x - sp.x) < 230 || Math.abs(lift.crankX - sp.x) < 230));
      if (spout) { out.boost = { x: clear(spout, lift.crankX), why: 'spout' }; out.rope = { x: clear(spout, lift.x) + spout.side * 14, why: 'spout' }; return out; }
      const inCage = Math.abs(R.x - lift.x) < 14 && R.grounded && Math.abs(R.y - lift.cy) < 3;
      out.rope = { x: lift.x, why: inCage ? 'ride' : 'cage' };
      const atCrank = Math.abs(B.x - lift.crankX) < 14 && B.grounded;
      out.boost = { x: lift.crankX, act: atCrank && inCage, why: inCage ? 'crank' : 'crank-wait' };
      // at the top: step off onto the ledge
      if (lift.cy <= lift.top + 0.5 && inCage) out.rope = { x: up.ax, why: 'off' };
      return out;
    }
    // r === j + 1: the rope
    out.stage = 'rope';
    const R0 = st.ropeOn, down = R0 && st.ropeU >= 1 && R0.j === j + 1;
    out.rope = { x: up.ax, act: Math.abs(R.x - up.ax) < S.anchorR - 6 && R.grounded, why: 'anchor' };
    if (R.st === 'hold') out.rope.act = true;
    if (B.st === 'rope') out.boost = { x: up.rx, up: true, why: 'climb' };
    else {
      const spout = st.spouts.find(sp => sp.j === j && (sp.phase !== 'idle' || sp.left < 1.5) && Math.abs(up.rx - sp.x) < 230);
      out.boost = { x: spout ? clear(spout, up.rx) : up.rx, jump: down && Math.abs(B.x - up.rx) < S.grabR - 6 && !spout, why: spout ? 'spout' : down ? 'grab' : 'wait-rope' };
    }
    return out;
  }

  /* ---------- drawing ---------- */
  function draw(st) {
    const t = st.clock, cy = st.camY, fl = K.flashA(st), sh = st.shake * 4 * Math.sin(t * 50);
    // the sky strip high above, then the far canyon walls
    K.sky(0, t, { mood: 'flood', flash: fl, bolt: st.bolt });
    // the last stretch ends in the open: above the rim there is only sky, the canyon is all below it
    const rimY = isLast() ? st.topY - cy : -1e9;
    ctx.save();
    if (rimY > -20) { ctx.beginPath(); ctx.rect(0, rimY, W, H - rimY + 20); ctx.clip(); }
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(90,60,40,0)'); g.addColorStop(0.3, 'rgba(90,60,40,0.85)'); g.addColorStop(1, 'rgba(60,40,28,1)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // far walls (parallax): strata bands
    for (let layer = 0; layer < 2; layer++) {
      const par = [0.3, 0.6][layer], col = ['#7a5238', '#8a5e40'][layer], inset = [60, 100][layer];
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, -10);
      for (let y = -10; y <= H + 20; y += 30) { const yy = y + cy * par; ctx.lineTo(inset + Math.sin(yy * 0.013 + layer) * 30 + K.hash(Math.floor(yy / 30)) * 20, y); }
      ctx.lineTo(0, H + 20); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W, -10);
      for (let y = -10; y <= H + 20; y += 30) { const yy = y + cy * par; ctx.lineTo(W - inset - Math.sin(yy * 0.011 + layer * 2) * 30 - K.hash(Math.floor(yy / 30) + 50) * 20, y); }
      ctx.lineTo(W, H + 20); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.save(); ctx.translate(0, -cy + sh);
    drawWalls(st, t);
    drawLedges(st, t);
    ctx.restore();
  }
  const isLast = () => !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
  function drawWalls(st, t) {
    const last = isLast(), y0 = last ? Math.max(st.camY - 40, st.topY) : st.camY - 40, y1 = st.camY + H + 40;
    for (const side of [-1, 1]) {
      const x = side < 0 ? st.wl : st.wr;
      ctx.fillStyle = '#9a6a44';
      ctx.beginPath();
      if (side < 0) { ctx.moveTo(-10, y0); for (let y = Math.floor(y0 / 24) * 24; y <= y1; y += 24) ctx.lineTo(x + Math.sin(y * 0.05) * 6 + K.hash(y) * 8, y); ctx.lineTo(-10, y1); }
      else { ctx.moveTo(W + 10, y0); for (let y = Math.floor(y0 / 24) * 24; y <= y1; y += 24) ctx.lineTo(x - Math.sin(y * 0.05) * 6 - K.hash(y + 9) * 8, y); ctx.lineTo(W + 10, y1); }
      ctx.closePath(); ctx.fill();
      // strata lines and cracks
      ctx.strokeStyle = 'rgba(70,40,24,0.45)'; ctx.lineWidth = 3;
      for (let y = Math.floor(y0 / 46) * 46; y <= y1; y += 46) {
        ctx.beginPath(); if (side < 0) { ctx.moveTo(0, y); ctx.lineTo(x - 4, y + 8); } else { ctx.moveTo(W, y); ctx.lineTo(x + 4, y + 8); } ctx.stroke();
        if (K.hash(y * 3 + side) < 0.3) {
          // a hanging root
          const rx = x + side * -2, len = 30 + K.hash(y) * 50;
          ctx.strokeStyle = '#5a3e24'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(rx, y); ctx.quadraticCurveTo(rx - side * 10 + Math.sin(t * 2 + y) * 3, y + len * 0.6, rx - side * 4, y + len); ctx.stroke();
          ctx.strokeStyle = 'rgba(70,40,24,0.45)'; ctx.lineWidth = 3;
        }
        if (K.hash(y * 7 + side) < 0.15) { ctx.fillStyle = '#4e7a3a'; circle(x - side * 6, y + 20, 8); ctx.fill(); circle(x - side * 14, y + 16, 6); ctx.fill(); ctx.fillStyle = '#9a6a44'; }
      }
      ctx.fillStyle = 'rgba(255,220,180,0.12)'; ctx.fillRect(side < 0 ? x - 10 : x, y0, 10, y1 - y0);
      // the top of the canyon: grass along the rim on both sides
      if (last && y0 === st.topY) {
        const gx0 = side < 0 ? -10 : x - 14, gw = side < 0 ? x + 24 : W + 10 - gx0;
        ctx.fillStyle = '#5a8a3a'; ctx.fillRect(gx0, y0 - 4, gw, 8);
        ctx.fillStyle = '#7aaa4a'; for (let gx = gx0 + 3; gx < gx0 + gw - 4; gx += 9) { ctx.beginPath(); ctx.moveTo(gx, y0 - 3); ctx.lineTo(gx + 2, y0 - 9 - K.hash(gx) * 4); ctx.lineTo(gx + 4, y0 - 3); ctx.fill(); }
      }
    }
    // the surge line on the wall
    if (st.surgeLine !== null && st.surgeLine !== undefined) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * Math.sin(t * 12)) + ')'; ctx.lineWidth = 3; ctx.setLineDash([14, 8]);
      ctx.beginPath(); ctx.moveTo(st.wl - 40, st.surgeLine); ctx.lineTo(st.wr + 40, st.surgeLine); ctx.stroke(); ctx.setLineDash([]);
    }
    // spouts in the walls
    for (const sp of st.spouts) {
      ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.ellipse(sp.x, sp.y, 8, 14, 0, 0, TAU); ctx.fill();
      if (sp.phase === 'warn') { for (let k = 0; k < 3; k++) { const u = (t * 2 + k / 3) % 1; ctx.fillStyle = '#bfe6ff'; circle(sp.x - sp.side * 6, sp.y + 8 + u * 50, 2.5); ctx.fill(); } }
      if (sp.phase === 'gush') {
        ctx.fillStyle = 'rgba(200,180,140,0.85)';
        ctx.beginPath(); ctx.moveTo(sp.x, sp.y - 10); ctx.quadraticCurveTo(sp.x - sp.side * 120, sp.y - 30, sp.x - sp.side * 220, sp.y + 40); ctx.lineTo(sp.x - sp.side * 200, sp.y + 60); ctx.quadraticCurveTo(sp.x - sp.side * 100, sp.y + 10, sp.x, sp.y + 12); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { const u = (t * 4 + k / 4) % 1; ctx.beginPath(); ctx.moveTo(sp.x - sp.side * u * 180, sp.y - 6 + u * 20); ctx.lineTo(sp.x - sp.side * (u * 180 + 30), sp.y + u * 30); ctx.stroke(); }
      }
    }
  }
  function drawLedge(L0, t, scaffold) {
    const x0 = L0.x0, x1 = L0.x1, y = L0.y;
    if (scaffold) {
      // wooden planks on beams with lanterns
      ctx.fillStyle = '#8a6a3a'; ctx.fillRect(x0, y, x1 - x0, 10);
      ctx.strokeStyle = '#5e3e20'; ctx.lineWidth = 1.5; for (let x = x0; x < x1; x += 26) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 10); ctx.stroke(); }
      ctx.strokeStyle = '#5e3e20'; ctx.lineWidth = 6;
      for (let x = x0 + 30; x < x1; x += 160) { ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x - 30, y + 110); ctx.stroke(); }
      return;
    }
    const g = ctx.createLinearGradient(0, y, 0, y + 30);
    g.addColorStop(0, '#a87a52'); g.addColorStop(1, '#6a4a30');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y);
    // a rough underside
    for (let x = x1; x >= x0; x -= 20) ctx.lineTo(x, y + 14 + K.hash(Math.round(x) + y) * 16);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a8a3a'; ctx.fillRect(x0, y - 3, x1 - x0, 4);
    ctx.fillStyle = '#7aaa4a'; for (let x = x0 + 4; x < x1 - 4; x += 9) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 5 - K.hash(x) * 4); ctx.lineTo(x + 4, y); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,240,220,0.2)'; ctx.fillRect(x0, y, x1 - x0, 2);
  }
  function drawLedges(st, t) {
    const y0 = st.camY - 60, y1 = st.camY + H + 60;
    for (const L0 of st.ledges) {
      if (L0.y < y0 || L0.y > y1 + 120) continue;
      drawLedge(L0, t, st.def.scaffold && L0.kind !== 'floor' && L0.kind !== 'rim');
      // the anchor ring at a ledge end
      if (L0.j > 0) {
        const glow = st.h[st.rope].on === L0.j && !st.ropeOn;
        ctx.strokeStyle = glow ? C.gold : '#c8ccd4'; ctx.lineWidth = 3;
        circle(L0.ax, L0.y - 4, 6); ctx.stroke();
        if (glow) { ctx.strokeStyle = 'rgba(255,197,61,' + (0.4 + 0.3 * Math.sin(t * 8)) + ')'; ctx.lineWidth = 2; circle(L0.ax, L0.y - 4, 12); ctx.stroke(); }
      }
      if (L0.kind === 'rim') drawRim(st, L0, t);
    }
    for (const s of st.shelves) {
      if (s.gone || s.y < y0 || s.y > y1) continue;
      const wob = s.crack >= 0 ? Math.sin(t * 40) * 1.5 * (s.crack / S.crumbleT) : 0;
      ctx.save(); ctx.translate(wob, 0);
      ctx.fillStyle = s.crumbly ? '#9a7a5a' : '#a87a52'; rr(s.x0, s.y, s.x1 - s.x0, 12, 4); ctx.fill();
      ctx.fillStyle = '#5a8a3a'; ctx.fillRect(s.x0 + 2, s.y - 2, s.x1 - s.x0 - 4, 3);
      if (s.crumbly) { ctx.strokeStyle = 'rgba(40,24,12,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(s.x0 + 20, s.y); ctx.lineTo(s.x0 + 26, s.y + 6); ctx.lineTo(s.x0 + 22, s.y + 12); if (s.crack >= 0) { ctx.moveTo(s.x1 - 18, s.y); ctx.lineTo(s.x1 - 26, s.y + 8); ctx.lineTo(s.x1 - 20, s.y + 12); } ctx.stroke(); }
      ctx.restore();
    }
    // winches: an ore bucket on a timber boom (or a lift cage in a frame), and a crank wheel
    for (const l of st.lifts) {
      if (l.kind === 'cage') {
        ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(l.x - 34, l.y); ctx.lineTo(l.x - 34, l.top - 70); ctx.moveTo(l.x + 34, l.y); ctx.lineTo(l.x + 34, l.top - 70); ctx.moveTo(l.x - 40, l.top - 70); ctx.lineTo(l.x + 40, l.top - 70); ctx.stroke();
        ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(l.x, l.top - 70); ctx.lineTo(l.x, l.cy - 56); ctx.stroke();
        ctx.strokeStyle = '#8a8c94'; ctx.lineWidth = 2; ctx.strokeRect(l.x - 26, l.cy - 56, 52, 56);
        ctx.fillStyle = '#6a4a2a'; ctx.fillRect(l.x - 28, l.cy, 56, 6);
        for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(l.x - 26 + k * 13, l.cy - 56); ctx.lineTo(l.x - 26 + k * 13, l.cy); ctx.stroke(); }
      } else {
        // a timber post on the crank's side, a boom out over the column with a pulley, the rope down to the bucket's bail
        const px = l.x + l.dir * 40, by = l.top - 64;
        ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(px, l.y); ctx.lineTo(px, by); ctx.lineTo(l.x - l.dir * 10, by); ctx.stroke();
        ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px, by + 34); ctx.lineTo(px - l.dir * 30, by); ctx.stroke();
        ctx.fillStyle = '#5a5e66'; circle(l.x, by + 4, 7); ctx.fill(); ctx.fillStyle = '#c8a050'; circle(l.x, by + 4, 2.5); ctx.fill();
        ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(l.x, by + 4); ctx.lineTo(l.x, l.cy - 44); ctx.stroke();
        // the bail (the bucket's handle) and the back of the tub
        ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(l.x - 24, l.cy - 20); ctx.quadraticCurveTo(l.x, l.cy - 62, l.x + 24, l.cy - 20); ctx.stroke();
        ctx.fillStyle = '#3a3e46'; ctx.beginPath(); ctx.moveTo(l.x - 26, l.cy - 22); ctx.lineTo(l.x + 26, l.cy - 22); ctx.lineTo(l.x + 22, l.cy + 2); ctx.lineTo(l.x - 22, l.cy + 2); ctx.closePath(); ctx.fill();
        if (l.cy >= l.y - 0.5 && st.h.every(h => Math.abs(h.x - l.x) > 20 || Math.abs(h.y - l.cy) > 3)) { ctx.fillStyle = '#8a7a6a'; circle(l.x - 8, l.cy - 22, 6); ctx.fill(); circle(l.x + 7, l.cy - 21, 5); ctx.fill(); }
        ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(l.crankX, l.y - 40); ctx.lineTo(px, by + 4); ctx.lineTo(l.x, by + 4); ctx.stroke();
      }
      // the crank
      const a = (l.y - l.cy) / 12;
      ctx.fillStyle = '#5a5e66'; ctx.fillRect(l.crankX - 4, l.y - 40, 8, 40);
      ctx.save(); ctx.translate(l.crankX, l.y - 40); ctx.rotate(a);
      ctx.strokeStyle = '#c8a050'; ctx.lineWidth = 3; circle(0, 0, 14); ctx.stroke();
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(k * Math.PI / 2) * 14, Math.sin(k * Math.PI / 2) * 14); ctx.stroke(); }
      ctx.fillStyle = '#e8322a'; circle(14, 0, 4); ctx.fill();
      ctx.restore();
      if (l.kind === 'cage') { ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(l.crankX, l.y - 40); ctx.lineTo(l.x + 30, l.top - 70); ctx.stroke(); }
    }
    // boulders
    for (const r of st.rocks) {
      if (r.gone) continue;
      ctx.save(); ctx.translate(r.x, r.y - r.h / 2); ctx.rotate(r.rot || 0);
      ctx.fillStyle = '#7a6a5a'; ctx.strokeStyle = '#4a3e34'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 0, r.w / 2 + 6, r.h / 2, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.ellipse(-8, -r.h / 4, 10, 20, 0.3, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(40,30,20,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(4, 0); ctx.lineTo(-6, 20); ctx.stroke();
      ctx.restore();
    }
    // gauges: a little instrument tube on a stand with a blue level
    for (const q of st.gauges) {
      if (q.got || q.y < y0 || q.y > y1) continue;
      const b = Math.sin(t * 3 + q.x) * 2;
      ctx.fillStyle = 'rgba(143,220,255,0.25)'; circle(q.x, q.y + b, 14); ctx.fill();
      ctx.fillStyle = '#e8eef4'; ctx.strokeStyle = '#5a6a7a'; ctx.lineWidth = 1.5; rr(q.x - 5, q.y - 12 + b, 10, 24, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a8ad0'; rr(q.x - 3, q.y + 2 + b, 6, 8, 2); ctx.fill();
      ctx.strokeStyle = '#5a6a7a'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(q.x - 5, q.y - 6 + k * 5 + b); ctx.lineTo(q.x - 1, q.y - 6 + k * 5 + b); ctx.stroke(); }
    }
  }
  function drawRim(st, L0, t) {
    // the canyon rim: grass, a fence post and the van waiting
    const vx = L0.end === -1 ? Math.min(st.wr - 100, L0.x1 - 120) : Math.max(st.wl + 100, L0.x0 + 120);
    K.van(vx, L0.y, { s: 0.75, t, dents: 2 });
    ctx.fillStyle = '#4e7a3a'; ctx.fillRect(L0.x0, L0.y - 4, L0.x1 - L0.x0, 6);
  }
  function drawWater(st, t) {
    const y = st.water;
    if (y > st.camY + H + 40) return;
    const g = ctx.createLinearGradient(0, y, 0, y + 300);
    g.addColorStop(0, '#9a7a50'); g.addColorStop(1, '#4a3420');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, y + 20);
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.04 + t * 3) * 4 + Math.sin(x * 0.013 - t * 1.7) * 3);
    ctx.lineTo(W, st.camY + H + 40); ctx.lineTo(0, st.camY + H + 40); ctx.closePath(); ctx.fill();
    // foam and floating junk
    ctx.fillStyle = 'rgba(239,230,208,0.85)';
    for (let x = 0; x < W; x += 22) { const u = Math.sin(x * 0.07 + t * 4); if (u > 0.2) { ctx.beginPath(); ctx.ellipse(x + 10, y + Math.sin(x * 0.04 + t * 3) * 4 - 1, 8 + u * 6, 3, 0, 0, TAU); ctx.fill(); } }
    ctx.strokeStyle = 'rgba(239,230,208,0.35)'; ctx.lineWidth = 2;
    for (let k = 0; k < 8; k++) { const xx = ((k * 137 + t * 40) % (W + 100)) - 50, yy = y + 20 + (k % 4) * 22; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.quadraticCurveTo(xx + 20, yy - 6, xx + 40, yy); ctx.stroke(); }
    for (let k = 0; k < 4; k++) {
      const xx = ((k * 263 + t * (18 + k * 6)) % (W + 120)) - 60;
      K.debris(['post', 'tyre', 'hay', 'sign'][k], xx, y + 4, Math.sin(t + k) * 0.4 + (k === 0 ? 1.5 : 0), 0.45);
    }
    for (const g2 of st.logs) {
      const yy = y - 8 + (g2.rolled ? 10 : 0), roll = g2.rolled ? g2.rollT * 3 : 0, wob = g2.ride > S.logRoll * 0.6 ? Math.sin(t * 30) * 0.08 : 0;
      ctx.save(); ctx.translate(g2.x, yy + 6); ctx.rotate(wob);
      if (g2.rock) { ctx.fillStyle = '#7a6a5a'; ctx.beginPath(); ctx.ellipse(0, 4, 36, 12, 0, 0, TAU); ctx.fill(); }
      else {
        ctx.fillStyle = '#7a5434'; rr(-42, -8, 84, 16, 8); ctx.fill();
        ctx.strokeStyle = '#4a2e18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-36, -2 + Math.sin(roll) * 3); ctx.lineTo(30, -1 + Math.sin(roll) * 3); ctx.stroke();
        ctx.fillStyle = '#c8a070'; ctx.beginPath(); ctx.ellipse(40, 0, 4, 7, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    // the rope from above for a swept hero
    for (const h of st.h) if (h.st === 'swept' && !h.both) {
      const u = 1 - h.sweep / S.sweepT;
      K.chaser(h.id, h.x, y + 10 - u * 20, { face: 1, stun: true, s: 0.9 });
      ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(h.x, st.camY - 20); ctx.lineTo(h.x, y - 20); ctx.stroke();
      ctx.fillStyle = '#ff6a3a'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; circle(h.x, y - 14, 14); ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = '#ff6a3a'; circle(h.x, y - 14, 12); ctx.stroke();
    }
  }
  function drawHero(st, h, t) {
    if (h.st === 'swept') return;
    let sy = 1 - h.sq * 0.16, rot = 0;
    if (h.st === 'rope') rot = Math.sin(t * 6) * 0.06;
    else if (!h.grounded) rot = h.face * clamp(h.vy / 2000, -0.15, 0.15);
    const arms = h.st === 'hold' || h.st === 'crank' ? 'bat' : h.st === 'rope' ? 'up' : null;
    K.chaser(h.id, h.x, h.y, { face: h.face, rot, sy, sx: 2 - sy, vy: h.grounded ? 0 : h.vy, stun: h.stun > 0, arms, armA: h.st === 'crank' ? t * 8 : 0.4, hood: true });
  }
  function drawRope(st, t) {
    const R = st.ropeOn;
    if (!R) return;
    const len = S.ropeLen * clamp(st.ropeU, 0, 1);
    const sway = Math.sin(t * 3) * 5;
    ctx.strokeStyle = '#c89a10'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(R.ax, R.y - 6); ctx.quadraticCurveTo(R.rx, R.y - 2, R.rx, R.y + 4); ctx.lineTo(R.rx + sway, R.y + len); ctx.stroke();
    ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(R.ax, R.y - 6); ctx.quadraticCurveTo(R.rx, R.y - 2, R.rx, R.y + 4); ctx.lineTo(R.rx + sway, R.y + len); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,80,10,0.6)'; ctx.lineWidth = 1;
    for (let y = R.y + 10; y < R.y + len; y += 9) { ctx.beginPath(); ctx.moveTo(R.rx + sway * (y - R.y) / len - 2, y); ctx.lineTo(R.rx + sway * (y - R.y) / len + 2, y + 4); ctx.stroke(); }
    ctx.lineCap = 'butt';
    if (st.ropeU >= 1) { ctx.fillStyle = '#c89a10'; circle(R.rx + sway, R.y + len, 5); ctx.fill(); }
    if (!R.held) { ctx.fillStyle = 'rgba(255,90,74,0.8)'; text('!', R.ax, R.y - 30, 18, '#ff5a4a', 'center'); }
  }
  function drawTop(st) {
    const t = st.clock, cy = st.camY, sh = st.shake * 4 * Math.sin(t * 50), fl = K.flashA(st);
    ctx.save(); ctx.translate(0, -cy + sh);
    drawRope(st, t);
    for (const h of st.h) drawHero(st, h, t);
    // the ore buckets' front: whoever rides stands inside
    for (const l of st.lifts) {
      if (l.kind !== 'bucket') continue;
      ctx.fillStyle = '#6a6e78'; ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(l.x - 27, l.cy - 18); ctx.lineTo(l.x + 27, l.cy - 18); ctx.lineTo(l.x + 22, l.cy + 4); ctx.lineTo(l.x - 22, l.cy + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#4a4e58'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(l.x - 26, l.cy - 12); ctx.lineTo(l.x + 26, l.cy - 12); ctx.stroke();
      ctx.fillStyle = '#c8a050'; circle(l.x - 24, l.cy - 18, 2.5); ctx.fill(); circle(l.x + 24, l.cy - 18, 2.5); ctx.fill();
    }
    drawWater(st, t);
    K.drawParts(st, 0);
    ctx.restore();
    K.rain(t, { wind: 80, n: 150, a: 0.35, col: 'rgba(210,200,180,1)' });
    // how far below the water is, when it's off screen
    const wy = st.water - cy;
    if (wy > H - 4 && st.state === 'go') { text('🌊 ' + Math.round(st.water - Math.max(...st.h.map(h => h.y))) + ' px below', W / 2, H - 84, 13, '#bfe6ff', 'center', 'body'); }
    K.flashTop(fl * 0.6);
    K.drawPops(st, 0, cy);
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '🧪 ' + st.gaugeN + ' / ' + st.totalG;
      ctx.font = FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, '#8fdcff', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play) return;
    const pl = plan(st), Rn = st.rope, Bn = st.boost, R = st.h[Rn], B = st.h[Bn];
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(Rn, 'rope hero', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Rn, 'act') + 'ROPE', !!pl.rope.act && R.st !== 'hold', R.st === 'hold', z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(Rn, 'up') + 'JUMP', !!pl.rope.jump, !R.grounded && R.st !== 'rope', z);
    }
    {
      const bx = K.panel(Bn, 'winch hero', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Bn, 'act') + (pl.boost.why === 'shove' ? 'SHOVE' : 'CRANK'), !!pl.boost.act && B.st !== 'crank', B.st === 'crank', z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(Bn, 'up') + 'CLIMB', pl.boost.why === 'grab' || pl.boost.why === 'climb', B.st === 'rope', z);
    }
    // the water meter: how close the flood is to the lower hero
    {
      const w = 200 * z, x = W / 2 - w / 2, y = H - 40 * z, gap = clamp(pl.waterGap / 300, 0, 1);
      ctx.fillStyle = 'rgba(20,22,52,0.88)'; rr(x - 12, y - 18 * z, w + 24, 40 * z, 14 * z); ctx.fill();
      text(pl.waterGap < 80 ? 'THE WATER IS RIGHT THERE!' : 'Flood below you', W / 2, y - 7 * z, 10 * z, pl.waterGap < 80 ? '#ff8a7a' : '#aab', 'center', 'body');
      K.meter(x, y + 2, w, 10 * z, gap, gap < 0.3 ? '#ff5a4a' : gap < 0.55 ? '#ffb04a' : '#8fdcff');
      if (st.ring) text('gold life ring', x + w + 18, y + 7, 11 * z, C.gold, 'left', 'body');
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st), cy = st.camY;
    const say = (id, h, pp, isRope) => {
      if (h.st === 'swept') return;
      let s = null, col = C.gold, pulse = false;
      const dir = pp.x > h.x + 10 ? 'right' : pp.x < h.x - 10 ? 'left' : null;
      if (pp.why === 'climb') { s = 'Climb! Hold ' + K.key(id, 'up'); pulse = true; }
      else if (pp.why === 'grab') { s = dir ? 'To the rope ' + K.key(id, dir) : 'Grab the rope: ' + K.key(id, 'up'); pulse = !dir; }
      else if (pp.why === 'anchor') { s = h.st === 'hold' ? 'Hold on until ' + NAMES[1 - id] + ' is up!' : dir ? 'To the ring ' + K.key(id, dir) : 'HOLD ' + K.key(id, 'act') + ' to drop the rope'; pulse = !dir && h.st !== 'hold'; if (h.st === 'hold') col = '#d9ffd0'; }
      else if (pp.why === 'shove') { s = dir ? 'To the boulder ' + K.key(id, dir) : 'Shove it! ' + K.key(id, 'act'); pulse = !dir; }
      else if (pp.why === 'crank' || pp.why === 'crank-wait') { s = dir ? 'To the crank ' + K.key(id, dir) : pp.act ? 'HOLD ' + K.key(id, 'act') + ' to crank!' : 'Wait for ' + NAMES[1 - id] + ' in the ' + (cageAt(st, h) ? 'cage' : 'bucket'); pulse = !!pp.act; }
      else if (pp.why === 'cage') { s = 'Into the ' + (cageAt(st, h) ? 'lift cage ' : 'ore bucket ') + (dir ? K.key(id, dir) : ''); col = '#ffe7a8'; }
      else if (pp.why === 'ride') { s = 'Hold on, ' + NAMES[1 - id] + ' winds you up!'; col = '#d9ffd0'; }
      else if (pp.why === 'off') { s = 'Step off ' + (dir ? K.key(id, dir) : ''); }
      else if (pp.why === 'spout') { s = 'Wait for the gush...'; col = '#bfe6ff'; }
      else if (pp.why === 'down') { s = 'Drop down to ' + NAMES[1 - id] + ' ' + (dir ? K.key(id, dir) : ''); col = '#ffe7a8'; }
      else if (isRope && pp.why === 'go') { s = 'To ' + NAMES[1 - id] + ' ' + (dir ? K.key(id, dir) : ''); col = '#ffe7a8'; }
      P.say(id, s, h.x, h.y - cy - 46, col, pulse);
    };
    const cageAt = (st2, h) => { const l = st2.lifts.find(q => q.j === h.on); return !!l && l.kind === 'cage'; };
    say(Rn, R, pl.rope, true);
    say(Bn, B, pl.boost, false);
  }

  MODES.floodclimb = {
    S, plan,
    medals: { bronze: 'Climb out of the canyon', goals: [{ key: 'time', gold: S.goldT, silver: S.silverT }, { key: 'gauges', gold: 16, more: true, word: 'rain gauge' }, { key: 'sweeps', gold: 2, word: 'sweep' }] },
    medalValues() { const st = G.mst; return st.stats ? { gauges: st.gaugeN, sweeps: st.stats.sweeps } : {}; },
    setup(st, L) {
      st.stats = { sweeps: 0, restarts: 0, rides: 0, shoves: 0, gushes: 0, helps: 0, roomT: [] };
      st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0; st.gaugeN = 0;
      const def = LEVELS[G.levelIndex];
      st.totalG = (def.rooms || [def]).reduce((n, r) => n + (r.gauges || []).length, 0);
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.ledges) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.ledges) drawTop(st); },
    hud() { const st = G.mst; if (st.ledges) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Rain gauges', value: st.gaugeN + ' of ' + st.totalG },
        { label: 'Sweeps', value: String(s.sweeps) },
        { label: 'Bucket rides', value: String(s.rides) },
      ];
      out.push('Closest the flood got at a stretch end: ' + (s.lowest === undefined ? '-' : s.lowest + ' px') + '. Boulders shoved: ' + s.shoves + '. Spout soakings: ' + s.gushes + '.');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = r => ({ label: 'rope', labels: r === 0 ? ['rope', 'winch'] : ['winch', 'rope'] });
  STORMCHASE.defs.floodclimb = {
    name: 'Flash Flood Climb', world: 32, kind: 'team', mode: 'floodclimb', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    jobs: {
      rope: { title: 'Rope hero', act: 'rope', legend: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump, climb <kbd>S</kbd> slide down',
        howTo: ['Ride the ore bucket up. At a ring, hold rope to drop it for your partner.'] },
      winch: { title: 'Winch hero', act: 'winch', legend: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump, climb <kbd>S</kbd> slide down',
        howTo: ['Hold winch at the crank to wind the bucket up. Tap it at a boulder to shove it.'] },
    },
    jobOf: 'ropeHero', jobSwap: 'You swap jobs every stretch.',
    tip: 'The flood is rising! The rope hero rides the ore bucket while the winch hero holds the action at the crank; then the rope hero holds the action at the ring to drop the rope.',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'The Dry Wash', ropeHero: 0, steps: 6, wv: 10, water0: 150, gaps: [164, 168],
        gauges: [{ j: 0, u: 0.1 }, { j: 0, u: 0.9 }, { j: 1, shelf: true }, { j: 2, u: 0.5 }, { j: 3, shelf: true }], done: 'Out of the dry wash!', act: acts(0),
        tip: 'Pip stands in the ore bucket and Bo holds the action at the crank to wind Pip up! Then Pip holds the action at the ring and Bo climbs the rope.' },
      { title: 'Root Wall', ropeHero: 1, steps: 7, wv: 12, water0: 140, gaps: [166, 170, 164], logs: true, crumbly: true, rocks: [2], surge: 22, flip: true,
        gauges: [{ j: 0, u: 0.15 }, { j: 1, shelf: true }, { j: 2, shelf: true }, { j: 3, u: 0.5 }, { j: 4, shelf: true }], done: 'Up the root wall!', act: acts(1),
        tip: 'Swap jobs! Shelves crumble when you stand on them, and the winch hero can shove a boulder out of the bucket\'s way. Watch for the SURGE!' },
      { title: 'The Narrows', ropeHero: 0, steps: 7, wv: 13.5, water0: 140, wallL: 200, wallR: 760, gaps: [168, 164, 170], logs: true, crumbly: true, spouts: [1, 3, 5], surge: 18,
        gauges: [{ j: 0, u: 0.8 }, { j: 1, shelf: true }, { j: 2, u: 0.4 }, { j: 3, shelf: true }, { j: 4, u: 0.6 }], done: 'Through the narrows!', act: acts(0),
        tip: 'Waterfall spouts gush from the walls on a beat: wait for the drip to stop, then go.' },
      { title: 'Mine Scaffold', ropeHero: 1, steps: 7, wv: 14.5, water0: 140, gaps: [166, 168], scaffold: true, lifts: [1, 4], surge: 20, flip: true, logs: true,
        gauges: [{ j: 0, u: 0.2 }, { j: 1, shelf: true }, { j: 2, u: 0.5 }, { j: 3, shelf: true }, { j: 4, u: 0.4 }], act: acts(1),
        tip: 'Old mine lifts! Some climbs have a lift cage instead of a bucket: same job, the winch hero cranks while the rope hero rides.' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.floodclimbJump = function (id) { this.tone(id ? 330 : 392, 0.1, 'triangle', 0.035, id ? 520 : 620); };
  Sfx.extra.floodclimbClank = function () { this.tone(160, 0.12, 'square', 0.04, 110); this.tone(1200, 0.05, 'triangle', 0.02, 900, 0.03); };
  Sfx.extra.floodclimbRope = function () { this.tone(500, 0.25, 'sawtooth', 0.012, 160); };
  Sfx.extra.floodclimbGrab = function () { this.tone(300, 0.06, 'square', 0.02, 260); };
  Sfx.extra.floodclimbTop = function () { this.tone(523, 0.08, 'triangle', 0.04, null); this.tone(784, 0.12, 'triangle', 0.04, null, 0.07); };
  Sfx.extra.floodclimbSlide = function () { this.tone(800, 0.4, 'sawtooth', 0.015, 200); };
  Sfx.extra.floodclimbShove = function () { this.tone(120, 0.2, 'square', 0.05, 70); };
  Sfx.extra.floodclimbRumble = function () { this.tone(80, 0.5, 'sawtooth', 0.04, 50); };
  Sfx.extra.floodclimbCrumble = function () { this.tone(300, 0.2, 'square', 0.02, 90); this.tone(180, 0.25, 'triangle', 0.02, 60, 0.05); };
  Sfx.extra.floodclimbGush = function () { this.tone(400, 0.9, 'sawtooth', 0.012, 200); };
  Sfx.extra.floodclimbCrank = function () { this.tone(900, 0.03, 'square', 0.01, 700); };
  Sfx.extra.floodclimbSweep = function () { this.tone(600, 0.5, 'sine', 0.04, 150); };
  Sfx.extra.floodclimbFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.11)); };
})();
