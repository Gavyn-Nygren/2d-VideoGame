/* Pip & Bo - Level 33-1 Tornado Alley Run (team, World 33 Storm Chasers). */
'use strict';

/* ===== 33-1 Tornado Alley Run (mode 'tornadorun', team, scrolls right, Gavyn's pick) =====
   The storm van races right along a farm road with a huge tornado filling the left edge of the screen. One hero
   drives, the other stands in the roof hatch and bats away what the tornado throws.
   Side view. The road has three lanes drawn as depth bands (0 far, 1 middle, 2 near). The world scrolls under the van
   (st.dist); the van sits near the middle of the screen (st.vx, the driver can ease it 110 px either way). The mode owns
   the tick, the camera and the picture (def.ownStep + ownHUD + noFalls); the engine grid is only spawns.
   THE DRIVER (G.mst.drv): ▲ / ▼ change lane (0.18 s), ◀ ▶ ease off or speed up a little inside the window. Tap the
     action for the HORN BOOST: 1.2 s of extra speed, ready again 6 s later. Needed to jump a broken bridge (a ramp).
   THE SPOTTER (G.mst.spt, in the roof hatch): ◀ ▶ aim the big bat over the van (7 aims, from back-low to front-high).
     Tap the action to SWING (wind-up 0.12 s, hits until 0.32 s, ready at 0.4 s). Keep holding after the swing to
     BRACE: a braced spotter knocks small junk away in the aimed direction, and a cow bounces off the roof with a moo
     (a cow must never be batted). Hold ▼ to DUCK under a low bridge.
   ROAD (the driver's job; a red marker at the right edge 1.6 s ahead, 1.0 s in the corn): wrecked cars (1 lane), fallen
   power poles (2 lanes), stray cows (they wander between lanes), puddles (a slide: no lane change for 0.6 s), broken
   bridges (every lane: horn boost to jump them), and low bridges (only the middle lane fits, and the spotter ducks).
   FLYING JUNK (the spotter's job): thrown by the tornado on an arc that ends at the hatch, a red ring on the roof 0.9 s
   before it lands. Small (mailbox, fence post, road sign): any swing or a brace in the right direction. Large (hay bale,
   tyre, shed roof): only a timed swing. Later stretches throw two at once.
   THE DISH: a gust knocks the satellite dish loose. The spotter has 2 s to aim straight up and swing it back on; the
   driver must hold the lane (a lane change takes 0.6 s off).
   THE GAP (the tornado meter): every hit costs gap and a dent (the van dents, loses a hubcap, a door flaps). Clean
   driving wins it back slowly (the horn and riding near the front of the window help). At zero the van is lifted, spun
   round and dropped back at the start of the stretch (a spin-out, counted). No game over.
   STRETCHES (about 35 s each, roles swap): Farm Road, Cornfield Shortcut, Trailer Park, Storm Cellar Dash (darker; the
   van skids down a ramp into a storm cellar as the doors slam).
   GOLD HELP (3 hits in a stretch, only while both are playing): a gold bull-bar, the next 3 road hits are shrugged off.
   MEDAL (MODES.tornadorun.medals, js/medals.js): by time. Gold <= 175 s, Silver <= 300 s.
   MODES.tornadorun.plan(st) says what each job should do now (the prompts, the HUD chips and the computer brain read
   it). Sounds are Sfx.extra.tornadorun*. */
(() => {
  const K = STORMCHASE, TAU = Math.PI * 2, FONT = K.FONT;
  const S = {
    lanes: [404, 446, 488], laneT: 0.18, vx0: 430, vxMin: 320, vxMax: 540, ease: 170, speed: 320, boost: 1.55, boostT: 1.2,
    hornCd: 6, vanBack: 86, vanFront: 88, swingWind: 0.12, swingHit: 0.32, swingReady: 0.4, hitWin: 0.25, aims: 7,
    flyT: 1.5, ringT: 0.9, dishT: 2.0, slideT: 0.6, gap0: 0.62, roadCost: 0.15, junkCost: 0.11, spinT: 2.8,
    goldT: 175, silverT: 300, idleWait: 12, warnT: 1.6, cornWarnT: 1.0, aimRep: 0.1,
  };
  const LY = S.lanes;
  // the angle each aim points along (screen radians: 0 right, -PI/2 up): back-low ... straight up (3) ... front-high
  const AIMDEG = [190, 166, 142, 117, 93, 69, 45];
  const aimA = k => -AIMDEG[clamp(k, 0, 6)] * Math.PI / 180;
  const vanScale = laneF => 0.86 + laneF * 0.07;
  const vanY = laneF => K.lerp(LY[0], LY[2], laneF / 2);

  /* ---------- a stretch (one room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.drv = def.drv || 0; st.spt = 1 - st.drv; st.title = def.title || '';
    st.kinds = def.kinds; st.junk = def.junk; st.pairs = def.pairs || 0; st.junkGap = def.junkGap; st.corn = !!def.corn; st.dark = def.dark || 0;
    st.len = def.len; st.ramps = def.ramps || 0; st.bridges = def.bridges || 0; st.dishes = (def.dishes || []).slice();
    st.state = 'go'; st.endT = 0; st.party = false; st.cleared = false; st.lastRoom = false;
    st.rc = { bad: 0 }; st.segStart = G.time; st.goldUsed = false; st.bar = 0;
    restart(st);
    K.fx(st); labels(st); mirror(st);
  }
  // (also after a spin-out: back to the start of the stretch with a fresh road)
  function restart(st) {
    st.dist = 0; st.vx = S.vx0; st.lane = 1; st.laneF = 1; st.lockT = 0; st.boostT = 0; st.hornCd = 0; st.gap = S.gap0;
    st.air = 0; st.bump = 0; st.cleanT = 0; st.shake = 0; st.junkT = 3.2; st.flying = []; st.dish = null; st.dishList = st.dishes.slice();
    st.drvIn = { up: false, down: false, rep: 0 }; st.spot = { aim: 3, sw: -1, brace: false, duck: false, rep: 0, stun: 0, armA: aimA(3) };
    st.junkN = 0; st.windT = 0; st.spinT = 0;
    st.obs = build(st);
  }
  function labels(st) { const w = []; w[st.drv] = 'boost'; w[st.spt] = 'swing'; K.actLabels(w, 'boost'); }

  // the road for one stretch: things spaced in time along the distance, at least one free lane every time
  function build(st) {
    const out = [], sp = S.speed, len = st.len, gapT = st.k < 2 ? [1.5, 2.3] : [1.2, 1.9];
    let d = 1200, last = 1, n = 0;
    // fixed places for the broken bridges (ramps) and the low bridges
    const fixed = [];
    for (let i = 0; i < st.ramps; i++) fixed.push({ d: len * (st.ramps === 1 ? 0.5 : 0.3 + 0.42 * i), kind: 'ramp' });
    for (let i = 0; i < st.bridges; i++) fixed.push({ d: len * (st.bridges === 1 ? 0.72 : 0.42 + 0.36 * i) + 300, kind: 'low' });
    fixed.sort((a, b) => a.d - b.d);
    for (const f of fixed) {
      if (f.kind === 'ramp') out.push({ kind: 'ramp', d: f.d, w: 150, lanes: [0, 1, 2], hit: false });
      else out.push({ kind: 'low', d: f.d, w: 70, lanes: [0, 2], hit: false, deck: true });
    }
    while (d < len - 900) {
      const nearFixed = fixed.some(f => Math.abs(f.d - d) < sp * 1.6);
      if (!nearFixed) {
        n++;
        const kind = st.kinds[Math.floor(Math.random() * st.kinds.length)];
        if (kind === 'pole') {
          // a pole across two lanes: leave the lane next to the last free one open
          const free = Math.random() < 0.5 ? 0 : 2, lanes = [0, 1, 2].filter(l => l !== free);
          out.push({ kind: 'pole', d, w: 54, lanes, hit: false, free });
          last = free;
        } else if (kind === 'cow') {
          const l = Math.floor(Math.random() * 3);
          out.push({ kind: 'cow', d, w: 56, lanes: [l], lf: l, to: l, cowT: 0.6 + Math.random() * 0.6, hit: false, seed: n });
        } else if (kind === 'puddle') {
          const l = Math.floor(Math.random() * 3);
          out.push({ kind: 'puddle', d, w: 120, lanes: [l], hit: false, soft: true });
        } else {
          let l = Math.floor(Math.random() * 3);
          if (l === last && Math.random() < 0.6) l = (l + 1 + Math.floor(Math.random() * 2)) % 3;
          out.push({ kind: 'wreck', d, w: 96, lanes: [l], hit: false, look: n % 3 });
        }
      }
      d += sp * (gapT[0] + Math.random() * (gapT[1] - gapT[0]));
    }
    return out.sort((a, b) => a.d - b.d);
  }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.obs) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dt * 2);
    if (!st.waiting && G.introT <= 0) K.bolts(st, dt, st.k === 3 ? [3, 6] : [5, 9]);
    if (live) {
      driver(st, dt); spotter(st, dt);
      const sp = speed(st);
      st.dist += sp * dt;
      cows(st, dt);
      road(st);
      junk(st, dt);
      dish(st, dt);
      gapStep(st, dt);
      st.windT -= dt;
      if (st.windT <= 0) { st.windT = 0.9; Sfx.play('stormWind', 1.2 - st.gap); }
      if (st.dist >= st.len) finish(st);
    } else if (st.state === 'spin') spinStep(st, dt);
    else if (st.state === 'end') endStep(st, dt);
    if (st.air > 0) st.air = Math.max(0, st.air - dt);
    if (st.bump > 0) st.bump = Math.max(0, st.bump - dt * 3);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    K.tickFx(st, dt);
    mirror(st);
  }
  const speed = st => S.speed * (st.boostT > 0 ? S.boost : 1) * (st.state === 'end' ? 0.6 : 1);
  function driver(st, dt) {
    const p = G.players[st.drv], i = p.input, D = st.drvIn;
    const up = i.jump || i.up || p.pendingJump, down = i.down;
    D.rep -= dt;
    const press = d => {
      if (st.lockT > 0) { K.hintOnce(st, 'slide' + st.k, st.drv, 'Sliding! Wait a moment'); return; }
      const to = clamp(st.lane + d, 0, 2);
      if (to !== st.lane) { st.lane = to; Sfx.play('tornadorunSwerve'); if (st.dish) { st.dish.t += 0.6; K.hintOnce(st, 'dishLane', st.drv, 'Hold the lane while the dish is loose!'); } }
    };
    if (up && (!D.up || D.rep <= 0)) { press(-1); D.rep = D.up ? 0.3 : 0.35; }
    else if (down && (!D.down || D.rep <= 0)) { press(1); D.rep = D.down ? 0.3 : 0.35; }
    D.up = up; D.down = down;
    st.laneF = approach(st.laneF, st.lane, dt / S.laneT);
    if (st.lockT > 0) st.lockT -= dt;
    const want = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    st.vx = clamp(st.vx + want * S.ease * dt, S.vxMin, S.vxMax);
    if (st.hornCd > 0) st.hornCd -= dt;
    if (st.boostT > 0) st.boostT -= dt;
    if (p.pendingAct) {
      if (st.hornCd <= 0) {
        st.boostT = S.boostT; st.hornCd = S.hornCd; Sfx.play('tornadorunHorn');
        K.pop(st, st.vx + 60, vanY(st.laneF) - 120, 'HONK!', '#ffe08a', 22);
        for (let k = 0; k < 10; k++) K.part(st, st.vx - 90, vanY(st.laneF) - 12, -200 - Math.random() * 200, -30 - Math.random() * 60, 0.6, 'rgba(160,160,170,0.8)', 6, -20, 'smoke');
      } else K.hintOnce(st, 'hornCd' + Math.floor(G.time / 8), st.drv, 'The horn needs ' + Math.ceil(st.hornCd) + ' s to recharge');
    }
  }
  function spotter(st, dt) {
    const p = G.players[st.spt], i = p.input, O = st.spot;
    if (O.stun > 0) { O.stun -= dt; O.brace = false; O.duck = false; O.sw = -1; return; }
    O.duck = i.down && O.sw < 0;
    O.rep -= dt;
    const want = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    if (want && !O.duck && (O.want !== want || O.rep <= 0)) { O.aim = clamp(O.aim + want, 0, 6); O.rep = O.want === want ? S.aimRep : 0.16; }
    O.want = want;
    if (O.sw >= 0) { O.sw += dt; if (O.sw >= S.swingReady && !i.act) O.sw = -1; }
    if (p.pendingAct && !O.duck && O.sw < 0) { O.sw = 0; Sfx.play('tornadorunSwing'); }
    O.brace = O.sw >= S.swingHit && i.act && !O.duck;
    if (O.brace) O.sw = Math.max(O.sw, S.swingHit);
    // the bat's angle: aim, plus the swing's wind-up and follow-through
    let a = aimA(O.aim);
    if (O.sw >= 0 && O.sw < S.swingWind) a += 0.8 * (O.sw / S.swingWind);
    else if (O.sw >= S.swingWind && O.sw < S.swingHit && !O.brace) a += 0.8 - 1.6 * ((O.sw - S.swingWind) / (S.swingHit - S.swingWind));
    O.armA = K.lerp(O.armA, a, Math.min(1, dt * 30));
  }
  const swingLive = O => O.sw >= S.swingWind && O.sw < S.swingHit && !O.brace;
  // where the roof hatch is now (screen px)
  function hatch(st) { const s = vanScale(st.laneF), y = vanY(st.laneF) - st.air * 0; return { x: st.vx - 12 * s, y: y - 96 * s - airY(st), s }; }
  const airY = st => (st.airT > 0 ? Math.sin(Math.PI * (1 - st.air / st.airT)) * 70 : 0);

  function cows(st, dt) {
    for (const h of st.obs) {
      if (h.kind !== 'cow' || h.hit) continue;
      const sx = h.d - st.dist;
      if (sx > W + 300 || sx < -200) continue;
      h.cowT -= dt;
      // (a cow only picks a new way to wander while it is well ahead of the van: close up it is easy to read)
      if (h.cowT <= 0 && sx > st.vx + S.vanFront + 300) {
        h.cowT = 1.1 + Math.random() * 0.6;
        const opts = [h.to - 1, h.to + 1].filter(l => l >= 0 && l <= 2);
        h.to = opts[Math.floor(Math.random() * opts.length)];
        if (Math.random() < 0.3) Sfx.play('stormMoo');
      }
      h.lf = approach(h.lf, h.to, dt / 0.7);
      h.lanes = [Math.round(h.lf)];
    }
  }
  function overlap(st, h) {
    const sx = h.d - st.dist, s = vanScale(st.laneF);
    return sx < st.vx + S.vanFront * s && sx + h.w > st.vx - S.vanBack * s;
  }
  const inLane = (st, h) => (h.kind === 'cow' ? Math.abs(st.laneF - h.lf) < 0.6 : h.lanes.some(l => Math.abs(st.laneF - l) < 0.55));
  function road(st) {
    for (const h of st.obs) {
      if (h.hit || !overlap(st, h)) continue;
      if (h.kind === 'ramp') {
        h.hit = true;
        if (st.boostT > 0) { st.airT = 0.7; st.air = 0.7; st.stats.jumps++; Sfx.play('tornadorunJump'); K.pop(st, st.vx, vanY(st.laneF) - 150, 'Airborne!', '#ffffff', 26); }
        else roadHit(st, h, 'Ka-thunk! Horn for the bridges!');
        continue;
      }
      if (h.kind === 'low') {
        // the deck passes over the van: the spotter must be ducking; the van must be in the middle lane
        if (inLane(st, h)) { h.hit = true; roadHit(st, h, 'Middle lane under the bridge!'); continue; }
        if (!st.spot.duck && st.spot.stun <= 0) {
          h.hit = true; st.spot.stun = 0.8; st.stats.bonks++; bad(st, S.junkCost * 0.7);
          Sfx.play('stormThud'); K.pop(st, st.vx, vanY(st.laneF) - 140, 'Bonk!', '#ffffff', 24);
          K.hintOnce(st, 'duck' + st.k, st.spt, 'Duck under bridges: hold ' + K.key(st.spt, 'down'));
        } else if (st.spot.duck) { h.hit = true; K.pop(st, st.vx, vanY(st.laneF) - 130, 'Whoosh!', '#d9ffd0', 18); }
        continue;
      }
      if (!inLane(st, h) || st.air > 0) continue;
      if (h.kind === 'puddle') { h.hit = true; st.lockT = S.slideT; Sfx.play('stormSplash'); for (let k = 0; k < 14; k++) K.part(st, st.vx + (Math.random() - 0.5) * 140, vanY(st.laneF) - 4, (Math.random() - 0.5) * 300, -100 - Math.random() * 160, 0.6, 'rgba(160,140,110,0.85)', 4, 700, 'dot'); continue; }
      h.hit = true;
      if (st.bar > 0) {
        st.bar--; Sfx.play('cityClang'); K.pop(st, st.vx + 90, vanY(st.laneF) - 90, 'Bull-bar!', C.gold, 22);
        h.fly = { vx: 260, vy: -380, r: 0 };
        continue;
      }
      h.fly = { vx: 200 + Math.random() * 120, vy: -320, r: 0 };
      roadHit(st, h, h.kind === 'cow' ? 'Moo! Steer round the cows!' : 'Crunch! Change lanes earlier.');
    }
    for (const h of st.obs) if (h.fly) { h.fly.vy += 900 * DT; h.d += h.fly.vx * DT; h.fy = (h.fy || 0) + h.fly.vy * DT; h.fly.r += DT * 6; }
  }
  function roadHit(st, h, why) {
    st.stats.hits++; bad(st, S.roadCost);
    st.bump = 1; st.shake = 1; G.shake = Math.max(G.shake || 0, 0.4);
    Sfx.play('tornadorunCrunch'); Sfx.play('stormThud');
    K.pop(st, st.vx + 40, vanY(st.laneF) - 120, h.kind === 'cow' ? 'MOO!' : 'CRUNCH!', '#ffb0a0', 28);
    for (let k = 0; k < 14; k++) K.part(st, st.vx + 80, vanY(st.laneF) - 40, -100 + Math.random() * 300, -100 - Math.random() * 200, 0.8, k % 2 ? '#c8ccd6' : '#ffd27a', 3, 700, 'star');
    K.msg(st, why, '#ffd0c8', 2.6);
    rumble(st.drv, 0.5, 0.7, 200);
  }
  // a hit of any kind: a dent, gap lost, maybe gold help
  function bad(st, cost) {
    st.stats.dents++; st.rc.bad++; st.gap = Math.max(0, st.gap - cost); st.cleanT = 0;
    if (st.rc.bad >= 3 && !st.goldUsed && K.both(st)) {
      st.goldUsed = true; st.bar = 3;
      K.goldHelp(st, 'Gold bull-bar! The next 3 road hits just bounce off');
    }
  }

  /* ---------- flying junk ---------- */
  const SMALL = ['mailbox', 'post', 'sign'], LARGE = ['hay', 'tyre', 'roof'];
  function junk(st, dt) {
    st.junkT -= dt;
    const busy = st.dish || st.obs.some(h => h.kind === 'low' && !h.hit && (h.d - st.dist - st.vx) / speed(st) < 2.0 && h.d - st.dist + h.w > st.vx - 100);
    if (st.junkT <= 0 && !busy) {
      st.junkT = st.junkGap[0] + Math.random() * (st.junkGap[1] - st.junkGap[0]);
      const pair = Math.random() < st.pairs;
      const pick = () => { const r = Math.random(); const m = st.junk; return r < m.cow ? 'cow' : r < m.cow + m.large ? 'large' : 'small'; };
      const d0 = Math.floor(Math.random() * 5);
      launch(st, pick(), d0, S.flyT);
      if (pair) { let d1 = d0 + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2)); if (d1 < 0 || d1 > 5) d1 = d0 + (d0 < 3 ? 2 : -2); launch(st, Math.random() < 0.5 ? 'small' : 'large', d1, S.flyT + 0.55); st.junkT += 0.6; }
    } else if (busy && st.junkT < 1) st.junkT = 1;
    const O = st.spot, hc = hatch(st);
    for (const f of st.flying) {
      f.t += dt;
      if (f.done) { f.ft += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 700 * dt; f.r += dt * 8; continue; }
      const left = f.T - f.t;
      // the swing hits it (not a cow)
      if (f.size !== 'cow' && swingLive(O) && left <= S.hitWin && Math.abs(O.aim - f.dir) <= 1) { batted(st, f, hc, 'Batted!'); continue; }
      if (left <= 0) {
        if (f.size === 'cow') {
          if (O.brace) { away(f, hc, -0.6); f.cowSafe = true; st.stats.cows++; Sfx.play('stormMoo'); Sfx.play('stormBoing'); K.pop(st, hc.x, hc.y - 50, 'Moo! Boing!', '#ffffff', 22); }
          else { away(f, hc, -0.3); st.stats.junkHits++; bad(st, S.junkCost); Sfx.play('stormMoo'); Sfx.play('stormThud'); K.pop(st, hc.x, hc.y - 50, 'Cow on the roof!', '#ffb0a0', 22); K.hintOnce(st, 'cow' + st.k, st.spt, 'Cows: HOLD ' + K.key(st.spt, 'act') + ' to brace, never swing!'); st.bump = 0.6; }
        } else if (f.size === 'small' && O.brace && Math.abs(O.aim - f.dir) <= 1) batted(st, f, hc, 'Blocked!');
        else {
          away(f, hc, 0.4); st.stats.junkHits++; bad(st, S.junkCost);
          Sfx.play('stormThud'); st.bump = 0.6; st.shake = Math.max(st.shake, 0.6);
          K.pop(st, hc.x, hc.y - 40, 'Clang!', '#ffb0a0', 22);
          if (f.size === 'large' && O.brace) K.hintOnce(st, 'big' + st.k, st.spt, 'Big junk needs a swing, not a brace!');
        }
      }
    }
    st.flying = st.flying.filter(f => !f.done || f.ft < 1.2);
  }
  function launch(st, size, dir, T) {
    st.junkN++;
    const kind = size === 'cow' ? 'cow' : size === 'large' ? LARGE[st.junkN % 3] : SMALL[st.junkN % 3];
    st.flying.push({ kind, size, dir: clamp(dir, 0, 6), T, t: 0, sx: tornadoX(st) + 60, sy: 140 + Math.random() * 100, r: 0, done: false, ft: 0 });
    Sfx.play('stormWhoosh', 0.7);
  }
  function batted(st, f, hc, word) {
    st.stats.batted++;
    away(f, hc, 1); f.batted = true;
    Sfx.play('tornadorunBat'); K.spark(st, f.x, f.y, 8, ['#ffe08a', '#ffffff']);
    K.pop(st, f.x, f.y - 30, word, '#d9ffd0', 18);
  }
  // it bounces off the van (or off the bat) and away
  function away(f, hc, hard) {
    const p = junkPos(f, hc);
    f.done = true; f.ft = 0; f.x = p.x; f.y = p.y;
    const a = aimA(f.dir);
    f.vx = hard > 0.5 ? Math.cos(a) * 520 + 80 : -180 + Math.random() * 60;
    f.vy = hard > 0.5 ? Math.sin(a) * 520 - 120 : -340 - hard * 100;
  }
  // a flying piece: a curve from the tornado that comes in along its aim direction to the hatch
  function junkPos(f, hc) {
    const u = clamp(f.t / f.T, 0, 1), a = aimA(f.dir);
    const ex = hc.x + Math.cos(a) * 10, ey = hc.y + Math.sin(a) * 10;
    const cx = hc.x + Math.cos(a) * 300, cy = hc.y + Math.sin(a) * 300;
    const k = 1 - u;
    return { x: k * k * f.sx + 2 * k * u * cx + u * u * ex, y: k * k * f.sy + 2 * k * u * cy + u * u * ey };
  }

  /* ---------- the dish ---------- */
  function dish(st, dt) {
    const el = st.len > 0 ? st.dist / S.speed : 0;
    if (!st.dish && st.dishList.length && el >= st.dishList[0] && !st.flying.some(f => !f.done)) {
      st.dishList.shift();
      st.dish = { t: 0, T: S.dishT };
      Sfx.play('tornadorunGust'); Sfx.play('stormCrack');
      K.pop(st, st.vx - 60, vanY(st.laneF) - 170, 'The dish!', '#ffe08a', 24);
      K.hintOnce(st, 'dish' + st.k, st.spt, 'Aim straight up and swing it back on!');
    }
    const D = st.dish;
    if (!D) return;
    D.t += dt;
    const O = st.spot;
    if (swingLive(O) && O.aim === 3) {
      st.dish = null; st.stats.dishes++;
      Sfx.play('cityClang'); Sfx.play('tornadorunBat');
      K.pop(st, st.vx - 60, vanY(st.laneF) - 160, 'Dish fixed!', '#d9ffd0', 22);
      return;
    }
    if (D.t >= D.T) {
      st.dish = null; bad(st, S.junkCost * 0.7);
      Sfx.play('cityClang'); K.pop(st, st.vx - 60, vanY(st.laneF) - 150, 'Clatter! It dangles back on its cable', '#ffd0c8', 18);
    }
  }

  /* ---------- the gap ---------- */
  const tornadoX = st => st.vx - 200 - st.gap * 200;
  function gapStep(st, dt) {
    st.cleanT += dt;
    let g = 0;
    if (st.cleanT > 3) g += 0.012;
    if (st.boostT > 0) g += 0.05;
    g += 0.008 * (st.vx - S.vx0) / 110;
    st.gap = clamp(st.gap + g * dt, 0, 1);
    if (st.gap <= 0) spinOut(st);
  }
  function spinOut(st) {
    st.state = 'spin'; st.spinT = 0; st.stats.spins++;
    Sfx.play('tornadorunSpin'); Sfx.play('stormSiren');
    K.msg(st, 'SPIN-OUT! The tornado caught the van. Back to the start of the stretch!', '#ffd0c8', 3.2);
    st.shake = 1.5; G.shake = Math.max(G.shake || 0, 0.6);
  }
  function spinStep(st, dt) {
    st.spinT += dt;
    if (st.spinT >= S.spinT) {
      const k = st.stats; restart(st); st.stats = k; st.state = 'go'; st.rc.bad = 0;
      K.pop(st, W / 2, 200, 'Back on the road!', '#ffffff', 24);
    }
  }
  function finish(st) {
    st.state = 'end'; st.endT = 0;
    const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
    st.lastRoom = last; st.stats.roomT[st.k] = G.time - st.segStart;
    st.flying = st.flying.filter(f => f.done); st.dish = null;
    Sfx.play('stormCheer');
    K.pop(st, W / 2, 180, last ? 'Into the storm cellar!' : (G.level.def.done || 'The twister veers off!') + ' Swap jobs!', '#ffffff', 26);
  }
  function endStep(st, dt) {
    st.endT += dt;
    st.dist += speed(st) * dt * (st.lastRoom ? Math.max(0, 1 - st.endT / 2) : 1);
    st.gap = Math.min(1.3, st.gap + dt * 0.5);
    if (st.lastRoom) {
      if (st.endT > 1.8 && !st.slam) { st.slam = true; Sfx.play('tornadorunSlam'); st.shake = 1; }
      if (st.endT > 2.0 && !st.party) { st.party = true; Sfx.play('tornadorunFanfare'); K.confetti(st, W / 2, 200, 50); }
      if (st.endT > 3.4 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 300 }; levelClear(); }
    } else if (st.endT > 2.2) nextRoom();
  }
  function mirror(st) {
    const s = vanScale(st.laneF), y = vanY(st.laneF) - airY(st);
    K.place(st.drv, clamp(st.vx + 30 * s, 40, W - 40), y - 40 * s);
    K.place(st.spt, clamp(st.vx - 12 * s, 40, W - 40), y - 112 * s);
  }

  /* ---------- what to do next ----------
     plan(st): { drv: { lane (where to be), horn, x, why, clear: [s of free road per lane] }, spt: { aim, act ('tap' |
       'hold' | false), down, why, f (the junk it is watching) }, ramp (s until the next broken bridge, 99 if none),
       low (s until the next low bridge) } */
  function arrival(st, h) {
    const sx = h.d - st.dist, s = vanScale(st.laneF), front = st.vx + S.vanFront * s, back = st.vx - S.vanBack * s;
    if (sx + h.w < back) return -1;
    if (sx < front) return 0;
    return (sx - front) / speed(st);
  }
  function plan(st) {
    const out = { drv: { lane: st.lane, horn: false, x: S.vx0, why: 'cruise', clear: [99, 99, 99] }, spt: { aim: 3, act: false, down: false, why: 'watch' }, ramp: 99, low: 99 };
    if (!st.obs || st.state !== 'go') return out;
    const clear = [99, 99, 99];
    for (const h of st.obs) {
      if (h.hit && !h.fly) continue;
      if (h.fly) continue;
      const t = arrival(st, h);
      if (t < 0 || t > 4) continue;
      if (h.kind === 'ramp') { out.ramp = Math.min(out.ramp, t); continue; }
      if (h.kind === 'low') out.low = Math.min(out.low, t);
      const ls = h.kind === 'cow' ? [Math.floor(h.lf), Math.ceil(h.lf), h.to] : h.lanes;
      const w = h.soft ? 0.8 : 0; // a puddle only matters a little
      for (const l of ls) clear[l] = Math.min(clear[l], t + w);
    }
    out.drv.clear = clear;
    // lane: stay unless the lane ahead is blocked soon and a neighbour is clearly better (one lane at a time)
    const cur = st.lane;
    let best = cur;
    if (clear[cur] < 1.7) {
      for (const l of [cur - 1, cur + 1]) if (l >= 0 && l <= 2 && clear[l] > clear[best] + 0.25) best = l;
      // two lanes away is better and the middle is passable for the moment
      if (best === cur) for (const l of [cur - 2, cur + 2]) { const mid = (cur + l) / 2; if (l >= 0 && l <= 2 && clear[l] > clear[cur] + 0.4 && clear[mid] > 0.45) best = mid; }
    }
    out.drv.lane = best; out.drv.why = best === cur ? 'cruise' : 'dodge';
    // the horn: for a broken bridge (boosting as it arrives), or to win ground back when it's close
    if (st.hornCd <= 0 && st.boostT <= 0) {
      if (out.ramp <= 0.8) { out.drv.horn = true; out.drv.why = 'ramp'; }
      else if (st.gap < 0.35 && out.ramp > 7) { out.drv.horn = true; out.drv.why = 'gap'; }
    }
    if (st.dish) out.drv.lane = st.lane;
    // ease forward when things are calm (wins gap), back to the middle when the road is busy
    out.drv.x = Math.min(...clear) > 2 ? S.vx0 + 70 : S.vx0;
    // the spotter: the dish, a low bridge, then the junk that lands soonest
    const O = st.spot;
    if (out.low < 0.55 || st.obs.some(h => h.kind === 'low' && !h.hit && overlap(st, h))) { out.spt.down = true; out.spt.why = 'duck'; return out; }
    if (st.dish) { out.spt.aim = 3; out.spt.act = O.aim === 3 && O.sw < 0 ? 'tap' : false; out.spt.why = 'dish'; return out; }
    let f = null;
    for (const q of st.flying) if (!q.done && (!f || q.T - q.t < f.T - f.t)) f = q;
    if (f) {
      const left = f.T - f.t;
      out.spt.f = f;
      if (f.size === 'cow') { out.spt.act = left < 0.62 ? 'hold' : false; out.spt.why = 'cow'; }
      else {
        out.spt.aim = f.dir; out.spt.why = 'bat';
        if (O.aim === f.dir && O.sw < 0 && left <= 0.34 && left > 0.05) out.spt.act = 'tap';
        else if (O.sw >= 0 && O.sw < S.swingReady) out.spt.act = false;
      }
    }
    return out;
  }

  /* ---------- drawing ---------- */
  function draw(st) {
    const t = st.clock, cx = st.dist, fl = K.flashA(st), dark = st.dark + (st.state === 'end' && st.lastRoom ? 0 : 0);
    const sh = st.shake * 3 * Math.sin(t * 60);
    K.sky(cx, t, { mood: 'storm', flash: fl, bolt: st.bolt, dark: dark * 0.8 });
    K.farm(cx, t, { horizon: 330, dark: dark });
    ctx.save(); ctx.translate(0, sh);
    drawRoad(st, t);
    ctx.restore();
  }
  // the road repeats every ROAD_P px (a multiple of the 80 px lane dash): one picture, copied along as it scrolls
  const ROAD_P = 1040;
  const R33 = n => K.hash(n * 1.37 + 0.21);
  function drawRoad(st, t) {
    const off = st.dist;
    const x0 = -(((off % ROAD_P) + ROAD_P) % ROAD_P);
    for (let i = 0; x0 + i * ROAD_P < W; i++) K.pic('road33', ROAD_P + 4, H - 356, 0, 10, paintRoad, x0 + i * ROAD_P, 366);
    // the near verge: grass flattened by the wind (live, it streams)
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3e5028'; ctx.beginPath();
    for (let x = -(off * 1.1 % 14); x < W; x += 14) { ctx.moveTo(x, 540); ctx.quadraticCurveTo(x + 6, 528, x + 16, 522 + Math.sin(t * 6 + x) * 2); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(160,190,110,0.45)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = -(off * 1.1 % 14) + 7; x < W; x += 14) { ctx.moveTo(x, 540); ctx.quadraticCurveTo(x + 5, 530, x + 13, 526 + Math.sin(t * 6 + x * 1.3) * 2); }
    ctx.stroke();
    // road signs and mile posts on the far shoulder
    for (let x = -(off % 520); x < W + 60; x += 520) {
      const k = Math.round((x + off) / 520);
      // a galvanised post, its shadow on the gravel and a concrete foot
      ctx.fillStyle = 'rgba(20,20,24,0.3)'; ctx.beginPath(); ctx.ellipse(x + 24, 384, 9, 2.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#8a8a82'; ctx.fillRect(x + 17, 380, 10, 5);
      ctx.fillStyle = '#5a5e66'; ctx.fillRect(x + 20, 334, 4, 50);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x + 20, 334, 1.5, 50);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 23, 334, 1, 50);
      ctx.fillStyle = '#3a3e46'; for (let j = 0; j < 7; j++) ctx.fillRect(x + 21.5, 350 + j * 4.5, 1, 1.5);
      if (k % 3 === 0) {
        // a green highway sign sized to its words, with a white inner border and two bolts
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(x - 18, 322, 84, 26, 4); ctx.fill();
        ctx.fillStyle = '#1e5a2a'; rr(x - 20, 319, 84, 26, 4); ctx.fill();
        ctx.fillStyle = '#2a7a3a'; rr(x - 20, 319, 84, 24, 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(x - 19, 320, 82, 7, 3); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.2; rr(x - 17, 322, 78, 20, 3); ctx.stroke();
        ctx.fillStyle = '#c8d0c8'; circle(x - 14, 332, 1); ctx.fill(); circle(x + 58, 332, 1); ctx.fill();
        text('SHELTER ' + (3 + (k % 5)) + ' mi', x + 22, 332, 10, '#ffffff', 'center', 'body');
      } else {
        // a diamond warning sign: a dark rim, a lit upper edge, a scuffed face
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.moveTo(x + 24, 318); ctx.lineTo(x + 38, 332); ctx.lineTo(x + 24, 346); ctx.lineTo(x + 10, 332); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#1c1a20'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x + 22, 316); ctx.lineTo(x + 36, 330); ctx.lineTo(x + 22, 344); ctx.lineTo(x + 8, 330); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#d8a820'; ctx.beginPath(); ctx.moveTo(x + 36, 330); ctx.lineTo(x + 22, 344); ctx.lineTo(x + 8, 330); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.moveTo(x + 22, 318.5); ctx.lineTo(x + 33.5, 330); ctx.lineTo(x + 22, 341.5); ctx.lineTo(x + 10.5, 330); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + 22, 316); ctx.lineTo(x + 36, 330); ctx.lineTo(x + 22, 344); ctx.lineTo(x + 8, 330); ctx.closePath(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 10, 329); ctx.lineTo(x + 22, 317.5); ctx.lineTo(x + 30, 325.5); ctx.stroke();
        ctx.fillStyle = 'rgba(120,90,30,0.35)'; circle(x + 28 - (k % 4) * 3, 336, 1.6); ctx.fill(); circle(x + 15, 333 + (k % 3), 1.1); ctx.fill();
        ctx.fillStyle = '#1c1a20'; ctx.fillRect(x + 21, 324, 2, 8); ctx.fillRect(x + 21, 334, 2, 2);
      }
    }
    // telephone poles along the far side: grained wood, a crossarm with glass insulators, sagging wires
    for (let x = -(off * 0.9 % 240); x < W + 240; x += 240) {
      const k = Math.round((x + off * 0.9) / 240);
      ctx.fillStyle = '#4a3a2a'; ctx.fillRect(x, 270, 5, 100); ctx.fillRect(x - 12, 278, 29, 4);
      ctx.fillStyle = '#33281c'; ctx.fillRect(x + 3.5, 270, 1.5, 100); ctx.fillRect(x - 12, 281, 29, 1.2);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x, 270, 1.5, 100); ctx.fillRect(x - 12, 278, 29, 1);
      ctx.fillStyle = 'rgba(30,20,12,0.5)'; for (let j = 0; j < 6; j++) ctx.fillRect(x + 1 + (j % 3), 290 + j * 12, 1, 6 + (j % 2) * 4);
      ctx.fillStyle = '#2a2a30'; ctx.fillRect(x - 1, 300, 7, 2); ctx.fillRect(x + 1, 346, 3, 3);
      ctx.fillStyle = '#7ab8a0'; for (const ix of [-10, 13]) { ctx.fillRect(x + ix, 274, 3, 4); }
      ctx.fillStyle = '#d8f0e4'; for (const ix of [-10, 13]) ctx.fillRect(x + ix, 274, 1.2, 2);
      if (k % 3 === 1) { ctx.fillStyle = '#6a6e74'; rr(x + 5, 292, 9, 13, 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 6, 293, 2, 11); ctx.fillStyle = '#3a3e44'; ctx.fillRect(x + 5, 291, 9, 2); }
    }
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let x = -(off * 0.9 % 240); x < W + 240; x += 240) { ctx.moveTo(x - 10, 280); ctx.quadraticCurveTo(x + 110, 296 + Math.sin(t * 4 + x) * 4, x + 230, 280); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(42,42,48,0.6)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = -(off * 0.9 % 240); x < W + 240; x += 240) { ctx.moveTo(x + 14, 277); ctx.quadraticCurveTo(x + 134, 291 + Math.sin(t * 4 + x + 1) * 4, x + 253, 277); }
    ctx.stroke();
  }
  // the still road: far grass and gravel, the asphalt (grain, wheel polish, patches, cracks sealed with tar,
  // worn paint), the crumbling near edge and the near verge. Drawn in screen y, from y 356; x from 0 to ROAD_P + 4.
  function paintRoad() {
    const P = ROAD_P, R = R33;
    ctx.translate(0, -366);
    const wrap = (x, r, f) => { f(x); if (x - r < 4) f(x + P); if (x + r > P) f(x - P); };
    // far grass bank with tufts against the sky line
    const gg = ctx.createLinearGradient(0, 356, 0, 382); gg.addColorStop(0, '#76884e'); gg.addColorStop(1, '#5a6a3a');
    ctx.fillStyle = gg; ctx.fillRect(0, 366, P + 8, 16);
    ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    for (const [col, n0] of [['#4e602e', 0], ['#86985a', 1]]) {
      ctx.strokeStyle = col; ctx.beginPath();
      for (let k = 0; k < 260; k++) { const x = R(k * 2 + n0 + 10) * P, h = 4 + R(k + 900 + n0) * 7, lean = -2 - R(k + 400) * 3; wrap(x, 6, X => { ctx.moveTo(X, 381); ctx.quadraticCurveTo(X + lean * 0.3, 381 - h * 0.6, X + lean, 381 - h); }); }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(30,40,20,0.3)'; ctx.fillRect(0, 378, P + 8, 3);
    // the gravel shoulder: a bed of grey and tan stones, each lit on top
    ctx.fillStyle = '#5a5244'; ctx.fillRect(0, 380, P + 8, 8);
    const gravel = ['#7a7266', '#8a8478', '#6a6258', '#9a8a70', '#5e5a54'];
    for (let c = 0; c < gravel.length; c++) {
      ctx.fillStyle = gravel[c]; ctx.beginPath();
      for (let k = c; k < 330; k += gravel.length) { const x = R(k + 30) * P, y = 381 + R(k + 31) * 6, r = 0.8 + R(k + 32) * 1.6; wrap(x, r, X => { ctx.moveTo(X + r, y); ctx.ellipse(X, y, r, r * 0.7, 0, 0, TAU); }); }
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath();
    for (let k = 0; k < 330; k += 2) { const x = R(k + 30) * P, y = 381 + R(k + 31) * 6, r = 0.8 + R(k + 32) * 1.6; wrap(x, r, X => { ctx.moveTo(X + r * 0.6, y - r * 0.3); ctx.arc(X, y - r * 0.3, r * 0.5, 0, TAU); }); }
    ctx.fill();
    // the asphalt body
    const g = ctx.createLinearGradient(0, 386, 0, 512);
    g.addColorStop(0, '#42424a'); g.addColorStop(0.5, '#4c4c54'); g.addColorStop(1, '#5a5a62');
    ctx.fillStyle = g; ctx.fillRect(0, 386, P + 8, 126);
    // broad tone blotches so it is never one flat grey
    for (let k = 0; k < 26; k++) { const x = R(k + 60) * P, y = 392 + R(k + 61) * 112, rx = 40 + R(k + 62) * 90, ry = 6 + R(k + 63) * 12; ctx.fillStyle = R(k + 64) < 0.5 ? 'rgba(30,30,38,0.12)' : 'rgba(120,120,128,0.08)'; wrap(x, rx, X => { ctx.beginPath(); ctx.ellipse(X, y, rx, ry, 0, 0, TAU); ctx.fill(); }); }
    // polished wheel tracks along each lane, a faint oil drip line between them
    for (const ly of LY) {
      ctx.fillStyle = 'rgba(22,22,28,0.16)'; ctx.fillRect(0, ly - 8, P + 8, 5); ctx.fillRect(0, ly + 6, P + 8, 4);
      ctx.fillStyle = 'rgba(200,210,224,0.06)'; ctx.fillRect(0, ly - 8, P + 8, 1.5);
    }
    ctx.fillStyle = 'rgba(16,14,20,0.25)';
    for (let k = 0; k < 60; k++) { const x = R(k + 80) * P, y = LY[k % 3] - 1 + R(k + 81) * 3, rx = 3 + R(k + 82) * 8; wrap(x, rx, X => { ctx.beginPath(); ctx.ellipse(X, y, rx, 1.6, 0, 0, TAU); ctx.fill(); }); }
    // patches of newer, darker tarmac with crisp seams
    for (let k = 0; k < 5; k++) {
      const x = 40 + k * 205 + R(k + 100) * 80, y = 394 + R(k + 101) * 84, w = 50 + R(k + 102) * 70, h = 12 + R(k + 103) * 18;
      ctx.fillStyle = 'rgba(28,28,34,0.2)'; rr(x, y, w, h, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(14,14,18,0.3)'; ctx.lineWidth = 1.2; rr(x, y, w, h, 3); ctx.stroke();
      ctx.strokeStyle = 'rgba(150,150,158,0.14)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 1, y + h + 1); ctx.lineTo(x + w + 1, y + h + 1); ctx.lineTo(x + w + 1, y + 1); ctx.stroke();
    }
    // the grain: thousands of light and dark chips of stone in the tar
    for (const [col, n0, nn, rs] of [['rgba(18,18,24,0.5)', 0, 1500, 1.2], ['rgba(170,170,176,0.32)', 1, 1300, 0.9], ['rgba(220,216,200,0.35)', 2, 260, 0.8]]) {
      ctx.fillStyle = col; ctx.beginPath();
      for (let k = 0; k < nn; k++) { const x = R(k * 3 + n0 + 2000) * P, y = 387 + R(k * 3 + n0 + 7000) * 124, r = 0.4 + R(k + n0 * 3000 + 11000) * rs; ctx.rect(x, y, r * 1.6, r); if (x < 4) ctx.rect(x + P, y, r * 1.6, r); }
      ctx.fill();
    }
    // cracks: a jagged line with branches, some sealed with a glossy tar snake
    const crack = (sx, sy, n, seed, sealed) => {
      const pts = [[sx, sy]]; let x = sx, y = sy;
      for (let j = 0; j < n; j++) { x += 6 + R(seed + j) * 12; y += (R(seed + j + 50) - 0.5) * 14; y = clamp(y, 390, 506); pts.push([x, y]); }
      const path = (dx) => { ctx.beginPath(); ctx.moveTo(pts[0][0] + dx, pts[0][1]); for (const p of pts) ctx.lineTo(p[0] + dx, p[1]); };
      for (const dx of [0, -P]) {
        if (dx && x < P - 4) continue;
        if (sealed) { ctx.strokeStyle = 'rgba(28,28,34,0.8)'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; path(dx); ctx.stroke(); ctx.strokeStyle = 'rgba(160,170,190,0.25)'; ctx.lineWidth = 1; ctx.save(); ctx.translate(0, -1.5); path(dx); ctx.stroke(); ctx.restore(); }
        ctx.strokeStyle = 'rgba(14,14,18,0.55)'; ctx.lineWidth = 1.1; path(dx); ctx.stroke();
        ctx.strokeStyle = 'rgba(160,160,168,0.2)'; ctx.lineWidth = 1; ctx.save(); ctx.translate(0.8, 1); path(dx); ctx.stroke(); ctx.restore();
        ctx.strokeStyle = 'rgba(14,14,18,0.45)'; ctx.lineWidth = 0.8; ctx.beginPath();
        for (let j = 2; j < pts.length; j += 3) { const p = pts[j], a = (R(seed + j + 90) - 0.5) * 2.4 + (j % 2 ? 1 : -1); ctx.moveTo(p[0] + dx, p[1]); ctx.lineTo(p[0] + dx + Math.cos(a) * 10, p[1] + Math.sin(a) * 10); ctx.lineTo(p[0] + dx + Math.cos(a + 0.4) * 16, p[1] + Math.sin(a + 0.4) * 16); }
        ctx.stroke();
      }
      ctx.lineJoin = 'miter';
    };
    for (let k = 0; k < 9; k++) crack(R(k + 150) * P, 392 + R(k + 151) * 110, 5 + Math.floor(R(k + 152) * 9), k * 97 + 3, k % 3 === 0);
    // the lane dashes: a creamy paint, worn through in places, lit on top
    for (const y of [425, 467]) {
      for (let x = 0; x < P + 4; x += 80) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 1, y + 1.5, 40, 2.5);
        ctx.fillStyle = K.COL.roadLine; ctx.fillRect(x, y, 40, 3);
        ctx.fillStyle = 'rgba(255,255,250,0.55)'; ctx.fillRect(x, y, 40, 1);
        const kk = Math.round(x / 80) + y;
        ctx.fillStyle = 'rgba(70,70,78,0.85)'; for (let j = 0; j < 6; j++) ctx.fillRect(x + R(kk * 7 + j) * 37, y + R(kk * 7 + j + 3) * 2.5, 1.5 + R(kk + j) * 3, 1.2);
      }
    }
    // the edge lines, worn, and the road's own crumbling lip on the near side
    ctx.fillStyle = '#e8e8e0'; ctx.fillRect(0, 388, P + 8, 2); ctx.fillRect(0, 508, P + 8, 2);
    ctx.fillStyle = 'rgba(70,70,76,0.8)'; for (let k = 0; k < 80; k++) { const x = R(k + 1200) * P; ctx.fillRect(x, k % 2 ? 388 : 508, 2 + R(k + 1201) * 5, 2); }
    ctx.fillStyle = '#4a4a50'; ctx.fillRect(0, 510, P + 8, 4);
    ctx.fillStyle = '#3a3a40'; ctx.beginPath(); ctx.moveTo(0, 514);
    for (let x = 0; x <= P + 8; x += 8) ctx.lineTo(x, 514 + (Math.round(x / 8) % 3 === 1 ? 3 : 0.5) + R(x + 1300) * 2);
    ctx.lineTo(P + 8, 510); ctx.lineTo(0, 510); ctx.closePath(); ctx.fill();
    // a wet sheen across the lanes
    ctx.fillStyle = 'rgba(200,210,220,0.07)'; for (let k = 0; k < 4; k++) ctx.fillRect(0, 400 + k * 28, P + 8, 6);
    ctx.fillStyle = 'rgba(200,214,230,0.08)'; for (let k = 0; k < 14; k++) { const x = R(k + 1400) * P, y = 395 + R(k + 1401) * 110, rx = 20 + R(k + 1402) * 40; wrap(x, rx, X => { ctx.beginPath(); ctx.ellipse(X, y, rx, 2.5, 0, 0, TAU); ctx.fill(); }); }
    // the near verge: earth, then grass with darker clumps, clover and a few stones
    const vg = ctx.createLinearGradient(0, 512, 0, 540); vg.addColorStop(0, '#4e5e34'); vg.addColorStop(0.3, '#5e7040'); vg.addColorStop(1, '#526436');
    ctx.fillStyle = vg; ctx.fillRect(0, 514, P + 8, H - 514);
    ctx.fillStyle = '#5a4a34'; ctx.beginPath(); for (let k = 0; k < 40; k++) { const x = R(k + 1500) * P, w = 10 + R(k + 1501) * 30; wrap(x, w, X => { ctx.moveTo(X, 515); ctx.ellipse(X, 515, w, 2.5, 0, 0, Math.PI); }); } ctx.fill();
    for (const [col, n0] of [['#3e5028', 0], ['#6e8448', 1], ['#7e9450', 2]]) {
      ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.beginPath();
      for (let k = 0; k < 220; k++) { const x = R(k * 3 + n0 + 1600) * P, y = 520 + R(k * 3 + n0 + 1700) * 20, h = 4 + R(k + n0 * 300 + 1800) * 7; wrap(x, 6, X => { ctx.moveTo(X, y); ctx.lineTo(X - 2 - h * 0.4, y - h); }); }
      ctx.stroke();
    }
    ctx.fillStyle = '#4a7a3a'; for (let k = 0; k < 18; k++) { const x = R(k + 1900) * P, y = 524 + R(k + 1901) * 12; wrap(x, 6, X => { for (let j = 0; j < 3; j++) { const a = j / 3 * TAU - 1.57; ctx.beginPath(); ctx.arc(X + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 2, 0, TAU); ctx.fill(); } }); }
    for (let k = 0; k < 16; k++) { const x = R(k + 2000) * P, y = 520 + R(k + 2001) * 16, r = 2 + R(k + 2002) * 3; wrap(x, r, X => { ctx.fillStyle = '#7a7468'; ctx.beginPath(); ctx.ellipse(X, y, r, r * 0.7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(X - r * 0.3, y - r * 0.3, r * 0.45, r * 0.28, 0, 0, TAU); ctx.fill(); }); }
    ctx.lineCap = 'butt';
  }
  function drawObs(st, t, lane) {
    for (const h of st.obs) {
      const sx = h.d - st.dist;
      if (sx > W + 40 || sx + h.w < -80) continue;
      if (h.kind === 'cow') { if (Math.round(h.lf) !== lane) continue; }
      else if (h.kind === 'pole') { if (Math.min(...h.lanes) !== lane) continue; }
      else if (h.kind === 'ramp' || h.kind === 'low') { if (lane !== 0) continue; }
      else if (h.lanes[0] !== lane) continue;
      const y = h.kind === 'cow' ? vanY(h.lf) : LY[lane], s = vanScale(h.kind === 'cow' ? h.lf : lane);
      ctx.save(); ctx.translate(0, h.fy || 0);
      if (h.kind === 'wreck') drawWreck(sx, y, h.w, s, h, t);
      else if (h.kind === 'pole') drawPole(sx, h, t);
      else if (h.kind === 'cow') { ctx.save(); ctx.translate(sx + h.w / 2, y - 22 * s); if (h.fly) ctx.rotate(h.fly.r); ctx.scale(-1, 1); K.debris('cow', 0, 0, 0, s); ctx.restore(); }
      else if (h.kind === 'puddle') drawPuddle(sx, y, h, s, t);
      else if (h.kind === 'ramp') drawRamp(sx, h, t);
      else if (h.kind === 'low') drawLowSupports(sx, h);
      ctx.restore();
    }
  }
  // a puddle: a muddy rim, dark water reflecting the grey sky, a pale streak of light and rain rings
  function drawPuddle(sx, y, h, s, t) {
    const cx = sx + h.w / 2, rx = h.w / 2, ry = 9 * s;
    ctx.fillStyle = 'rgba(70,58,44,0.7)'; ctx.beginPath(); ctx.ellipse(cx, y - 3, rx + 5, ry + 3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(90,80,64,0.85)'; ctx.beginPath(); ctx.ellipse(cx, y - 4, rx, ry, 0, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(0, y - 4 - ry, 0, y - 4 + ry); g.addColorStop(0, 'rgba(40,46,56,0.85)'); g.addColorStop(0.6, 'rgba(96,110,124,0.75)'); g.addColorStop(1, 'rgba(150,164,176,0.7)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, y - 4, rx - 3, ry - 2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(30,34,40,0.5)'; ctx.beginPath(); ctx.ellipse(cx - rx * 0.3, y - 4 - ry * 0.3, rx * 0.35, ry * 0.25, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(230,236,244,0.55)'; rr(cx - rx * 0.5, y - 4 + ry * 0.25, rx * 0.6, 1.6, 0.8); ctx.fill(); rr(cx + rx * 0.2, y - 4 + ry * 0.45, rx * 0.25, 1.2, 0.6); ctx.fill();
    ctx.strokeStyle = 'rgba(40,30,20,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, y - 4, rx, ry, 0, 0.1, Math.PI - 0.1); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,210,220,0.5)'; ctx.lineWidth = 1.5; for (let k = 0; k < 3; k++) { const u = (t * 1.5 + k / 3) % 1; ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.ellipse(cx + (k - 1) * 30, y - 4, 4 + u * 14, 1 + u * 4, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  // a wrecked car: two-tone paint lit from above, dents, rust, a cracked windscreen, a hanging bumper, rims and tread
  function drawWreck(x, y, w, s, h, t) {
    ctx.save(); ctx.translate(x + w / 2, y); if (h.fly) ctx.rotate(h.fly.r * 0.3); ctx.scale(s, s);
    const cols = ['#8a3a3a', '#3a5a8a', '#6a7a3a'][h.look], dk = mixCol(cols, '#141418', 0.45), lt = mixCol(cols, '#ffffff', 0.3);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 2, 52, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(20,20,26,0.35)'; ctx.beginPath(); ctx.ellipse(-8, 0, 30, 3.5, 0, 0, TAU); ctx.fill();
    ctx.rotate(0.08 * (h.look - 1));
    const body = () => { ctx.beginPath(); ctx.moveTo(-48, -10); ctx.lineTo(-44, -30); ctx.lineTo(-20, -32); ctx.lineTo(-8, -50); ctx.lineTo(24, -50); ctx.lineTo(36, -30); ctx.lineTo(48, -28); ctx.lineTo(48, -10); ctx.closePath(); };
    const g = ctx.createLinearGradient(0, -50, 0, -10); g.addColorStop(0, lt); g.addColorStop(0.45, cols); g.addColorStop(1, dk);
    ctx.fillStyle = g; body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    // lower sill and the door seams, a handle, a crease of a dent with its own light and shade
    ctx.fillStyle = dk; ctx.fillRect(-50, -16, 100, 7);
    ctx.strokeStyle = 'rgba(20,20,26,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-16, -31); ctx.lineTo(-16, -12); ctx.moveTo(14, -31); ctx.lineTo(16, -12); ctx.moveTo(-46, -24); ctx.lineTo(48, -22); ctx.stroke();
    ctx.fillStyle = '#c8ccd2'; ctx.fillRect(-12, -26, 6, 1.6); ctx.fillRect(18, -26, 6, 1.6);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(10, -22, 12, 6, 0.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(10, -22, 12, 6, 0.3, Math.PI * 0.9, Math.PI * 1.6); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(-32, -26, 7, 3, -0.2, 0, TAU); ctx.fill();
    // rust blooms and scratches
    ctx.fillStyle = '#8a4a1e'; for (const [rx, ry, r] of [[-40, -14, 3.5], [-36, -12, 2], [40, -15, 3], [44, -18, 1.8], [-22, -14, 1.6]]) { ctx.beginPath(); ctx.ellipse(rx, ry, r * 1.4, r, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#b8682a'; for (const [rx, ry] of [[-40, -15], [40, -16]]) { circle(rx, ry, 1.2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(230,230,236,0.5)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(20, -20); ctx.lineTo(34, -17); ctx.moveTo(22, -18); ctx.lineTo(30, -16); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 2; body(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-43, -29); ctx.lineTo(-20, -31); ctx.lineTo(-8, -48.5); ctx.lineTo(23, -48.5); ctx.stroke();
    // windows: the windscreen glass, a dark back window, a crazed crack
    ctx.fillStyle = '#a8c0d0'; ctx.beginPath(); ctx.moveTo(-4, -46); ctx.lineTo(10, -46); ctx.lineTo(10, -32); ctx.lineTo(-14, -32); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(-2, -45); ctx.lineTo(3, -45); ctx.lineTo(-6, -33); ctx.lineTo(-10, -33); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a5a68'; ctx.beginPath(); ctx.moveTo(14, -46); ctx.lineTo(22, -46); ctx.lineTo(31, -32); ctx.lineTo(14, -32); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(200,220,236,0.35)'; ctx.beginPath(); ctx.moveTo(16, -45); ctx.lineTo(19, -45); ctx.lineTo(24, -36); ctx.lineTo(21, -36); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-2, -44); ctx.lineTo(6, -36); ctx.lineTo(0, -34); ctx.moveTo(6, -36); ctx.lineTo(9, -40); ctx.moveTo(2, -40); ctx.lineTo(-4, -38); ctx.stroke();
    // lamps (one smashed), a hanging bumper
    ctx.fillStyle = '#fff4c8'; rr(42, -27, 6, 5, 1.5); ctx.fill(); ctx.fillStyle = '#8a2a2a'; rr(-48, -25, 4, 6, 1); ctx.fill();
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(43, -26); ctx.lineTo(46, -23); ctx.lineTo(44, -22); ctx.stroke();
    ctx.fillStyle = '#9aa0a8'; ctx.save(); ctx.translate(48, -12); ctx.rotate(0.35); rr(-3, -2, 9, 4, 1.5); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#9aa0a8'; rr(-51, -14, 6, 4, 1.5); ctx.fill();
    // wheels: tread blocks, a rim with spokes, a lit edge
    for (const wx of [-28, 30]) {
      ctx.fillStyle = '#1a1a20'; circle(wx, -8, 10); ctx.fill();
      ctx.fillStyle = '#2c2c34'; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; ctx.fillRect(wx + Math.cos(a) * 8.5 - 1, -8 + Math.sin(a) * 8.5 - 1, 2, 2); }
      ctx.fillStyle = '#7a7e86'; circle(wx, -8, 5); ctx.fill();
      ctx.strokeStyle = '#4a4e56'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + wx; ctx.moveTo(wx, -8); ctx.lineTo(wx + Math.cos(a) * 4.5, -8 + Math.sin(a) * 4.5); } ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(wx, -8, 4.5, Math.PI * 1.1, Math.PI * 1.6); ctx.lineTo(wx, -8); ctx.fill();
      ctx.fillStyle = '#2a2a30'; circle(wx, -8, 1.5); ctx.fill();
    }
    // hazard lights blinking
    if (Math.sin(t * 8) > 0) { ctx.fillStyle = 'rgba(255,180,58,0.35)'; circle(46, -24, 6); ctx.fill(); circle(-46, -20, 6); ctx.fill(); ctx.fillStyle = '#ffb43a'; circle(46, -24, 3); ctx.fill(); circle(-46, -20, 3); ctx.fill(); }
    ctx.restore();
  }
  function drawPole(x, h, t) {
    // a fallen power pole across two lanes: grained creosoted wood, a snapped butt, a crossarm with glass insulators,
    // sparking wires and traffic cones
    const y0 = LY[Math.min(...h.lanes)], y1 = LY[Math.max(...h.lanes)];
    const ax = x + 10, ay = y0 - 34, bx = x + h.w - 6, by = y1 - 6, a = Math.atan2(by - ay, bx - ax), L = Math.hypot(bx - ax, by - ay);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.moveTo(ax + 4, y0 - 2); ctx.lineTo(bx + 6, y1 + 1); ctx.lineTo(bx - 6, y1 + 3); ctx.lineTo(ax - 6, y0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a3a24'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    // along the pole: shade underneath, grain lines, splits and the lit top
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
    ctx.fillStyle = '#3e2816'; ctx.fillRect(0, 1.5, L, 4.5);
    ctx.strokeStyle = 'rgba(30,18,8,0.6)'; ctx.lineWidth = 0.8; ctx.lineCap = 'butt'; ctx.beginPath();
    for (let k = 0; k < 7; k++) { const yy = -4 + k * 1.3, s0 = K.hash(h.d + k) * L * 0.3; ctx.moveTo(s0, yy); ctx.lineTo(s0 + L * (0.4 + K.hash(h.d + k + 9) * 0.5), yy + 0.3); }
    ctx.stroke();
    ctx.fillStyle = '#2a1a0c'; for (let k = 0; k < 3; k++) { const s0 = 14 + k * L * 0.3; rr(s0, -1.5, 9 + k * 3, 1.4, 0.7); ctx.fill(); }
    ctx.fillStyle = '#c8b070'; ctx.fillRect(L * 0.55, -5, 6, 3); ctx.fillStyle = '#2a1a0c'; ctx.fillRect(L * 0.55 + 1, -4.4, 4, 1.6);
    ctx.fillStyle = '#7a5434'; ctx.fillRect(0, -6, L, 2.5);
    ctx.fillStyle = 'rgba(255,230,190,0.3)'; ctx.fillRect(0, -6, L, 1);
    ctx.restore();
    // the snapped butt: pale splintered wood
    ctx.save(); ctx.translate(bx, by); ctx.rotate(a);
    ctx.fillStyle = '#d8b880'; ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(5, -5); ctx.lineTo(2, -2); ctx.lineTo(8, 0); ctx.lineTo(3, 2); ctx.lineTo(6, 5); ctx.lineTo(-2, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-1, -3); ctx.lineTo(5, -3); ctx.moveTo(-1, 1); ctx.lineTo(6, 1); ctx.stroke();
    ctx.restore();
    // the crossarm with its insulators
    ctx.save(); ctx.translate(x + 18, y0 - 30); ctx.rotate(1.1);
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-18, -3, 36, 5);
    ctx.fillStyle = 'rgba(255,230,190,0.25)'; ctx.fillRect(-18, -3, 36, 1);
    ctx.fillStyle = '#26180c'; ctx.fillRect(-18, 1, 36, 1);
    for (const ix of [-14, 12]) { ctx.fillStyle = '#5aa890'; rr(ix - 2.5, -9, 5, 6, 1.5); ctx.fill(); ctx.fillStyle = '#c8f0e0'; ctx.fillRect(ix - 1.5, -8.5, 1.2, 4); ctx.fillStyle = '#3a7a64'; ctx.fillRect(ix - 2.5, -6, 5, 1); }
    ctx.restore();
    ctx.strokeStyle = '#1a1a20'; ctx.lineWidth = 1.5; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(x + 12, y0 - 34); ctx.quadraticCurveTo(x - 30, y0 - 10, x - 20, y1 + 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(26,26,32,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 20, y0 - 40); ctx.quadraticCurveTo(x - 14, y0 - 4, x - 26, y1 + 2); ctx.stroke();
    if (Math.sin(t * 23 + h.d) > 0.3) { ctx.fillStyle = '#bfe6ff'; for (let k = 0; k < 4; k++) circle(x - 20 + Math.random() * 8, y1 + 4 - Math.random() * 10, 1.6); ctx.fill(); }
    // cones: a square rubber base, a lit side, a reflective collar
    for (const l of h.lanes) {
      const cy = LY[l];
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x - 9, cy - 1, 9, 2.2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a2a30'; ctx.fillRect(x - 18, cy - 3, 18, 3);
      ctx.fillStyle = '#ff7a2a'; ctx.beginPath(); ctx.moveTo(x - 16, cy - 2); ctx.lineTo(x - 10, cy - 20); ctx.lineTo(x - 4, cy - 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c84a14'; ctx.beginPath(); ctx.moveTo(x - 10, cy - 20); ctx.lineTo(x - 4, cy - 2); ctx.lineTo(x - 8.5, cy - 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,180,0.6)'; ctx.beginPath(); ctx.moveTo(x - 10.5, cy - 19); ctx.lineTo(x - 14.5, cy - 3); ctx.lineTo(x - 13, cy - 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 13, cy - 12, 6, 3); ctx.fillStyle = '#c8ccd2'; ctx.fillRect(x - 9.5, cy - 12, 2.5, 3);
    }
    ctx.restore();
  }
  function drawRamp(x, h, t) {
    // a broken bridge: the road snaps off over a ditch of swirling water, a lip of tarmac to jump from
    const wg = ctx.createLinearGradient(0, 386, 0, 512); wg.addColorStop(0, '#2a3a44'); wg.addColorStop(0.5, '#3a4a54'); wg.addColorStop(1, '#4a5e6a');
    ctx.fillStyle = wg; ctx.fillRect(x + 20, 386, h.w - 20, 126);
    ctx.fillStyle = 'rgba(20,30,36,0.5)'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + h.w / 2 + (k - 2) * 22, 400 + k * 24, 26, 3, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#5a7a8a'; for (let k = 0; k < 6; k++) { const yy = 400 + k * 20, u = (t * 0.8 + k * 0.2) % 1; ctx.globalAlpha = 0.6; ctx.fillRect(x + 20 + u * (h.w - 40), yy, 22, 3); }
    ctx.fillStyle = '#c8dce6'; for (let k = 0; k < 6; k++) { const yy = 401 + k * 20, u = (t * 0.8 + k * 0.2 + 0.5) % 1; ctx.globalAlpha = 0.35; ctx.fillRect(x + 24 + u * (h.w - 48), yy, 10, 1.5); }
    ctx.globalAlpha = 1;
    // the snapped ends: tarmac on a concrete slab, rebar poking out, crumbs on the edge
    const edge = (pts, dir) => {
      ctx.fillStyle = '#7a766c'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0] - dir * 5, p[1]); ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9a9488'; ctx.beginPath(); for (let k = 0; k < 14; k++) { const p = pts[1 + (k % (pts.length - 3))], yy = 392 + k * 8.5; ctx.moveTo(p[0] + 1, yy); ctx.arc(p[0] - dir * 1.5, yy, 1.2 + (k % 3) * 0.5, 0, TAU); } ctx.fill();
      ctx.strokeStyle = '#8a4a24'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
      for (let k = 0; k < 4; k++) { const p = pts[1 + k], yy = 398 + k * 30; ctx.moveTo(p[0] - dir * 3, yy); ctx.lineTo(p[0] + dir * (9 + k % 2 * 5), yy + (k % 2 ? 4 : -3)); }
      ctx.stroke(); ctx.lineCap = 'butt';
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1] + 1); for (const p of pts.slice(1, -1)) ctx.lineTo(p[0] - dir * 0.5, p[1]); ctx.stroke();
    };
    edge([[x, 386], [x + 26, 386], [x + 16, 400], [x + 28, 430], [x + 14, 470], [x + 24, 512], [x, 512]], 1);
    edge([[x + h.w, 386], [x + h.w - 18, 386], [x + h.w - 8, 420], [x + h.w - 20, 456], [x + h.w - 6, 512], [x + h.w, 512]], -1);
    // broken railings: posts, a bent rail with a lit top
    ctx.fillStyle = '#8a8e94'; for (const px of [x - 54, x - 24, x + h.w + 24, x + h.w + 54]) { ctx.fillRect(px, 376, 3, 10); }
    ctx.strokeStyle = '#6a6e74'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - 60, 377); ctx.lineTo(x + 6, 377); ctx.lineTo(x + 20, 395); ctx.moveTo(x + h.w + 60, 377); ctx.lineTo(x + h.w - 4, 377); ctx.lineTo(x + h.w - 14, 361); ctx.stroke();
    ctx.strokeStyle = '#c8c8c0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 60, 376); ctx.lineTo(x + 6, 376); ctx.lineTo(x + 20, 394); ctx.moveTo(x + h.w + 60, 376); ctx.lineTo(x + h.w - 4, 376); ctx.lineTo(x + h.w - 14, 360); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 60, 375); ctx.lineTo(x + 6, 375); ctx.moveTo(x + h.w + 60, 375); ctx.lineTo(x + h.w - 4, 375); ctx.stroke();
    ctx.lineJoin = 'miter';
    // a ramp of planks someone propped up on a cinder block: grain, nails, a lit edge
    ctx.fillStyle = '#6a6a66'; ctx.fillRect(x - 6, 494, 14, 18); ctx.fillStyle = '#4a4a46'; ctx.fillRect(x - 3, 498, 3, 10); ctx.fillRect(x + 2, 498, 3, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x - 6, 494, 14, 1.5);
    ctx.fillStyle = '#9a6a3a'; ctx.beginPath(); ctx.moveTo(x - 50, 512); ctx.lineTo(x + 4, 470); ctx.lineTo(x + 8, 512); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.moveTo(x - 50, 512); ctx.lineTo(x + 4, 470); ctx.lineTo(x + 8, 512); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#7a4e26'; ctx.beginPath(); ctx.moveTo(x - 50, 512); ctx.lineTo(x + 4, 470); ctx.lineTo(x + 4, 478); ctx.lineTo(x - 40, 512); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(60,34,14,0.55)'; ctx.lineWidth = 0.8; ctx.beginPath();
    for (let k = 1; k < 7; k++) { ctx.moveTo(x - 50 + k * 4, 512 - k * 0.5); ctx.lineTo(x + 4, 470 + k * 3.5); }
    ctx.stroke();
    ctx.fillStyle = '#5a3418'; ctx.beginPath(); ctx.ellipse(x - 18, 496, 3, 1.4, -0.65, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c8ccd2'; for (const [nx, ny] of [[x - 30, 500], [x - 10, 486], [x - 28, 506], [x - 6, 494]]) { circle(nx, ny, 1.1); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = '#d8a870'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 49, 511); ctx.lineTo(x + 4, 470.5); ctx.stroke();
    ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 4, 470); ctx.lineTo(x + 8, 512); ctx.stroke();
  }
  function drawLowSupports(x, h) {
    // the low bridge: stone piers in lanes 0 and 2 (dressed blocks, moss at the foot, wet streaks, a hazard band),
    // the deck drawn over the van later
    for (const l of [0, 2]) {
      const y = LY[l], w = h.w;
      K.pic('pier33|' + w, w + 12, 106, 2, 100, () => paintPier(w), x, y);
    }
  }
  function paintPier(w) {
    const R = n => K.hash(n * 2.11 + 0.7);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(w / 2 + 4, 1, w / 2 + 6, 3.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6a6458'; ctx.fillRect(0, -96, w, 96);
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      const y0 = -96 + r * 20, offx = r % 2 ? -w / 4 : 0;
      for (let c = -1; c < 3; c++) {
        const bx = offx + c * w / 2 + 1, bw = w / 2 - 2, cx0 = Math.max(bx, 0), cx1 = Math.min(bx + bw, w);
        if (cx1 - cx0 < 2) continue;
        const k = r * 7 + c + 3, col = mixCol('#9a9488', '#7a7468', R(k));
        const g = ctx.createLinearGradient(0, y0, 0, y0 + 18); g.addColorStop(0, mixCol(col, '#ffffff', 0.12)); g.addColorStop(1, mixCol(col, '#3a3630', 0.18));
        ctx.fillStyle = g; rr(cx0, y0 + 1, cx1 - cx0, 18, 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(cx0 + 1, y0 + 1, cx1 - cx0 - 2, 1.5);
        ctx.fillStyle = 'rgba(40,36,30,0.25)'; ctx.fillRect(cx1 - 2, y0 + 2, 1.5, 16);
        ctx.fillStyle = 'rgba(60,56,48,0.45)'; for (let j = 0; j < 5; j++) { ctx.fillRect(cx0 + R(k * 5 + j) * (cx1 - cx0 - 2), y0 + 3 + R(k * 5 + j + 40) * 14, 1.5, 1.2); }
        if (R(k + 90) < 0.3) { ctx.strokeStyle = 'rgba(40,36,30,0.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); const sx = cx0 + 4 + R(k + 91) * (cx1 - cx0 - 8); ctx.moveTo(sx, y0 + 2); ctx.lineTo(sx + 3, y0 + 9); ctx.lineTo(sx - 1, y0 + 17); ctx.stroke(); }
      }
    }
    // wet streaks running down from the deck
    ctx.fillStyle = 'rgba(40,46,52,0.22)'; for (let k = 0; k < 4; k++) { const sx = 6 + R(k + 200) * (w - 12); ctx.fillRect(sx, -96, 3 + R(k + 201) * 3, 30 + R(k + 202) * 40); }
    // the hazard band: yellow and black chevrons, worn
    ctx.save(); ctx.beginPath(); ctx.rect(0, -12, w, 5); ctx.clip();
    ctx.fillStyle = '#ffd23a'; ctx.fillRect(0, -12, w, 5);
    ctx.fillStyle = '#1c1a20'; for (let sx = -8; sx < w + 8; sx += 12) { ctx.beginPath(); ctx.moveTo(sx, -7); ctx.lineTo(sx + 5, -12); ctx.lineTo(sx + 10, -12); ctx.lineTo(sx + 5, -7); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, -12, w, 1);
    // moss and grass at the foot
    ctx.fillStyle = '#4a6a2e'; ctx.beginPath(); for (let k = 0; k < 9; k++) { const mx = k / 8 * w, r = 3 + R(k + 300) * 4; ctx.moveTo(mx + r, -1); ctx.ellipse(mx, -1, r, r * 0.7, 0, Math.PI, 0); } ctx.fill();
    ctx.fillStyle = '#6a8a3e'; ctx.beginPath(); for (let k = 0; k < 9; k++) { const mx = k / 8 * w + 1, r = 1.5 + R(k + 300) * 2; ctx.moveTo(mx + r, -2); ctx.ellipse(mx, -2, r, r * 0.6, 0, Math.PI, 0); } ctx.fill();
    ctx.strokeStyle = '#4a6a2e'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 6; k++) { const mx = 3 + R(k + 320) * (w - 6); ctx.moveTo(mx, 0); ctx.lineTo(mx - 2, -6 - R(k + 321) * 4); } ctx.stroke();
    // a dark outline in the stone's own colour
    ctx.strokeStyle = '#4a463e'; ctx.lineWidth = 1.5; ctx.strokeRect(0.75, -95.25, w - 1.5, 95.5);
  }
  function drawDeck(st, h) {
    const x = h.d - st.dist;
    if (x > W + 40 || x + h.w < -40) return;
    K.pic('deck33|' + h.w, h.w + 64, 80, 32, 2, () => paintDeck(h.w), x, 232);
  }
  // the low bridge deck: a concrete beam with a steel rail on top, panel joints, bolts, rain stains, a chevron band
  // and a clearance plate that says LOW (origin: the beam's top left, at y 232)
  function paintDeck(w) {
    const R = n => K.hash(n * 3.3 + 0.9);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-30, 74, w + 60, 4);
    const g = ctx.createLinearGradient(0, 8, 0, 74); g.addColorStop(0, '#aaa498'); g.addColorStop(0.7, '#9a9488'); g.addColorStop(1, '#86807a');
    ctx.fillStyle = g; ctx.fillRect(-30, 8, w + 60, 66);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-30, 8, w + 60, 2);
    // panel joints and their shadows
    ctx.fillStyle = 'rgba(60,56,50,0.5)'; for (let k = 1; k < 4; k++) { const jx = -30 + k * (w + 60) / 4; ctx.fillRect(jx, 10, 1.5, 54); }
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (let k = 1; k < 4; k++) { const jx = -30 + k * (w + 60) / 4; ctx.fillRect(jx + 1.5, 10, 1, 54); }
    // concrete pores and rain stains
    ctx.fillStyle = 'rgba(70,66,58,0.4)'; for (let k = 0; k < 90; k++) ctx.fillRect(-28 + R(k) * (w + 56), 11 + R(k + 300) * 52, 1.2, 1);
    ctx.fillStyle = 'rgba(60,64,70,0.18)'; for (let k = 0; k < 6; k++) { const sx = -26 + R(k + 600) * (w + 50); ctx.fillRect(sx, 10, 4 + R(k + 601) * 6, 14 + R(k + 602) * 24); }
    // a row of bolts along the top and bottom
    for (let bx = -24; bx < w + 30; bx += 14) for (const by of [14, 58]) { ctx.fillStyle = '#6a665e'; circle(bx, by, 1.8); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.4)'; circle(bx - 0.5, by - 0.6, 0.7); ctx.fill(); }
    // the lower lip and its chevron band (yellow and black)
    ctx.fillStyle = '#7a7468'; ctx.fillRect(-30, 64, w + 60, 10);
    ctx.save(); ctx.beginPath(); ctx.rect(-30, 67, w + 60, 6); ctx.clip();
    ctx.fillStyle = '#ffd23a'; ctx.fillRect(-30, 67, w + 60, 6);
    ctx.fillStyle = '#1c1a20'; for (let sx = -40; sx < w + 40; sx += 14) { ctx.beginPath(); ctx.moveTo(sx, 73); ctx.lineTo(sx + 6, 67); ctx.lineTo(sx + 12, 67); ctx.lineTo(sx + 6, 73); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-30, 64, w + 60, 1);
    // the clearance plate
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(w / 2 - 25, 28, 52, 22, 3); ctx.fill();
    ctx.fillStyle = '#ffd23a'; rr(w / 2 - 27, 26, 54, 22, 3); ctx.fill();
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 1.5; rr(w / 2 - 25, 28, 50, 18, 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(w / 2 - 25, 27, 50, 1.5);
    text('LOW', w / 2, 40, 14, '#2a2a30', 'center');
    // the steel rail on top: posts and a lit bar
    ctx.fillStyle = '#5a5e66'; ctx.fillRect(-30, 0, w + 60, 8);
    ctx.fillStyle = '#3a3e46'; ctx.fillRect(-30, 6, w + 60, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-30, 0, w + 60, 1.5);
    ctx.fillStyle = '#4a4e56'; for (let px = -26; px < w + 30; px += 20) ctx.fillRect(px, 1, 2, 6);
    ctx.strokeStyle = '#5a564e'; ctx.lineWidth = 1.5; ctx.strokeRect(-29.25, 0.75, w + 58.5, 72.5);
  }
  function drawJunk(st, t) {
    const hc = hatch(st);
    for (const f of st.flying) {
      let p;
      if (f.done) { p = { x: f.x, y: f.y }; ctx.globalAlpha = clamp(1.2 - f.ft, 0, 1); }
      else {
        p = junkPos(f, hc); f.x = p.x; f.y = p.y;
        const left = f.T - f.t;
        // the red ring where it will land, and a dashed line of its last approach
        if (left < S.ringT) {
          const a = aimA(f.dir), pul = 0.6 + 0.4 * Math.sin(t * 20);
          ctx.strokeStyle = f.size === 'cow' ? 'rgba(120,200,255,' + pul + ')' : 'rgba(255,60,50,' + pul + ')'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(hc.x + Math.cos(a) * 26, hc.y + 14, 22 * (1 - left / S.ringT * 0.4), 6, 0, 0, TAU); ctx.stroke();
          ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hc.x + Math.cos(a) * 40, hc.y + Math.sin(a) * 40); ctx.lineTo(hc.x + Math.cos(a) * 120, hc.y + Math.sin(a) * 120); ctx.stroke(); ctx.setLineDash([]);
          if (f.size === 'cow') text('BRACE!', hc.x + Math.cos(a) * 60, hc.y + Math.sin(a) * 60 - 16, 12, '#bfe6ff', 'center', 'body');
        }
      }
      f.r += 0.08;
      K.debris(f.kind, p.x, p.y, f.size === 'cow' ? Math.sin(f.r) * 0.6 : f.r, f.size === 'large' ? 0.9 : f.size === 'cow' ? 0.85 : 0.75);
      ctx.globalAlpha = 1;
    }
  }
  function drawVan(st, t) {
    const s = vanScale(st.laneF), y = vanY(st.laneF) - airY(st) + Math.sin(t * 26) * 1.2 + st.bump * Math.sin(t * 50) * 3;
    const lean = (st.lane - st.laneF) * 0.06 + (st.air > 0 ? -0.08 : 0);
    if (st.lockT > 0) for (let k = 0; k < 2; k++) K.part(st, st.vx - 60 * s + Math.random() * 120, vanY(st.laneF) - 2, -150 - Math.random() * 100, -60 - Math.random() * 80, 0.4, 'rgba(160,140,110,0.8)', 3, 600, 'dot');
    if (st.boostT > 0) { for (let k = 0; k < 6; k++) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; const yy = y - 20 - k * 12; ctx.beginPath(); ctx.moveTo(st.vx - 100 * s - 20 - (k * 13 % 40), yy); ctx.lineTo(st.vx - 100 * s - 90 - (k * 29 % 60), yy); ctx.stroke(); } }
    const dents = st.stats.dents;
    K.van(st.vx, y, { s, dents, t, hatch: true, lean, bar: st.bar > 0, dish: st.dish ? 'off' : 'on' });
    // the driver in the cab window
    ctx.save(); ctx.translate(st.vx, y); ctx.rotate(lean); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(44, -80); ctx.lineTo(56, -80); ctx.lineTo(70, -50); ctx.lineTo(44, -50); ctx.closePath(); ctx.clip();
    K.chaser(st.drv, 54, -34, { face: 1, s: 1 });
    ctx.restore();
    // the spotter in the hatch, with the bat
    const O = st.spot, hx = st.vx - 12 * s, hy = y - 92 * s;
    const duck = O.duck ? 16 : 0;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(lean); ctx.scale(s, s);
    ctx.save(); ctx.beginPath(); ctx.rect(-40, -80, 80, 80); ctx.clip();
    K.chaser(st.spt, 0, 10 + duck, { face: Math.cos(O.armA) >= 0 ? 1 : -1, stun: O.stun > 0, arms: O.duck ? null : 'bat', armA: O.armA });
    ctx.restore();
    if (!O.duck) {
      // the bat (a big padded paddle)
      const face = Math.cos(O.armA) >= 0 ? 1 : -1, sx0 = face * 9, sy0 = -2 + duck;
      const ex = sx0 + Math.cos(O.armA) * 18, ey = sy0 + Math.sin(O.armA) * 18;
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(O.armA) * 26, ey + Math.sin(O.armA) * 26); ctx.stroke();
      ctx.save(); ctx.translate(ex + Math.cos(O.armA) * 38, ey + Math.sin(O.armA) * 38); ctx.rotate(O.armA);
      ctx.fillStyle = O.brace ? '#8fe3b0' : '#e8322a'; ctx.strokeStyle = '#5a1a12'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 11, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(10, -4); ctx.moveTo(-10, 3); ctx.lineTo(10, 3); ctx.stroke();
      ctx.restore();
      if (swingLive(O)) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx0, sy0, 60, O.armA - 0.6, O.armA + 0.2); ctx.stroke(); }
      ctx.lineCap = 'butt';
    }
    // the hatch rim in front
    ctx.fillStyle = '#3a3c42'; rr(-22, 0, 44, 8, 3); ctx.fill();
    ctx.restore();
    // the aim guide: seven dots over the van, the chosen one bright
    if (st.state === 'go' && G.introT <= 0) {
      for (let k = 0; k < 7; k++) {
        const a = aimA(k), on = k === O.aim;
        ctx.fillStyle = on ? (O.brace ? '#8fe3b0' : '#ffe08a') : 'rgba(255,255,255,0.28)';
        circle(hx + Math.cos(a) * 78 * s, hy + Math.sin(a) * 78 * s, on ? 5 : 3); ctx.fill();
      }
    }
    // the loose dish, flapping on its cable
    if (st.dish) {
      const dx = st.vx - 58 * s, dy = y - 150 * s - Math.sin(st.dish.t * 7) * 10, u = st.dish.t / st.dish.T;
      ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(st.vx - 58 * s, y - 92 * s); ctx.quadraticCurveTo(dx - 30, dy + 20, dx, dy); ctx.stroke();
      ctx.save(); ctx.translate(dx, dy); ctx.rotate(st.dish.t * 6);
      ctx.fillStyle = '#e8eaee'; ctx.strokeStyle = '#6a6c72'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 16, 7, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = u > 0.6 ? '#ff5a4a' : C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(dx, dy, 24, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - u)); ctx.stroke();
    }
  }
  function drawTornado(st, t) {
    let x = tornadoX(st);
    if (st.state === 'end') x -= st.endT * 260;
    const near = clamp(1 - st.gap, 0, 1);
    // the wall cloud it hangs from, then the funnel itself (wide at the top, filling the left of the screen)
    ctx.fillStyle = st.k === 3 ? 'rgba(40,46,42,0.95)' : 'rgba(62,70,64,0.95)';
    for (let k = 0; k < 7; k++) { circle(x - 200 + k * 90 + Math.sin(t + k) * 10, 20 + (k % 2) * 16, 80); ctx.fill(); }
    K.funnel(x, 500, 560, t, { w: 520, foot: 70, alpha: 1, lean: 50 + Math.sin(t * 0.7) * 40, col: st.k === 3 ? '#262c28' : '#343c37', s: 1 });
    // dust and rain pulled into it; darker the nearer it gets
    const dg = ctx.createLinearGradient(Math.max(0, x - 100), 0, x + 360, 0);
    dg.addColorStop(0, 'rgba(30,34,30,' + (0.15 + near * 0.35) + ')'); dg.addColorStop(1, 'rgba(30,34,30,0)');
    ctx.fillStyle = dg; ctx.fillRect(0, 0, x + 360, H);
  }
  function drawSpin(st, t) {
    // the van is lifted into the funnel, spun and dropped back
    const u = st.spinT / S.spinT, x = K.lerp(st.vx, tornadoX(st) + 40, K.smooth(Math.min(1, u * 2))), y = 470 - Math.sin(Math.min(1, u) * Math.PI) * 260;
    ctx.save(); ctx.translate(x, y); ctx.rotate(u * 14); ctx.translate(-x, -y);
    K.van(x, y, { s: 0.8, t, dents: st.stats.dents });
    ctx.restore();
    if (u > 0.8) { ctx.fillStyle = 'rgba(255,255,255,' + (u - 0.8) * 4 + ')'; ctx.fillRect(0, 0, W, H); }
  }
  function drawCellar(st) {
    // the storm cellar: a grassy mound in a stone collar with two plank doors on iron straps, the van skids down into it
    const x = W / 2 + 260 - st.endT * 120;
    K.pic('cellar33', 480, 110, 160, 100, paintCellarMound, x, 420);
    const shut = clamp((st.endT - 1.6) / 0.3, 0, 1);
    const door = (sgn) => {
      ctx.save(); ctx.translate(x + (sgn < 0 ? 0 : 160), 380); ctx.rotate(1.4 * sgn * (1 - shut));
      const x0 = sgn < 0 ? 0 : -80;
      ctx.fillStyle = '#8a5a30'; ctx.fillRect(x0, 0, 80, 12);
      ctx.fillStyle = '#6e4622'; for (let k = 1; k < 5; k++) ctx.fillRect(x0 + k * 16 - 0.6, 0, 1.2, 12);
      ctx.fillStyle = 'rgba(255,220,170,0.3)'; ctx.fillRect(x0, 0, 80, 2);
      ctx.fillStyle = 'rgba(40,20,8,0.3)'; ctx.fillRect(x0, 9, 80, 3);
      ctx.fillStyle = '#3a3a40'; ctx.fillRect(x0 + 8, 3, 64, 3);
      ctx.fillStyle = '#c8ccd2'; for (let k = 0; k < 4; k++) { circle(x0 + 12 + k * 18, 4.5, 0.9); ctx.fill(); }
      ctx.fillStyle = '#2a2a30'; ctx.fillRect(sgn < 0 ? x0 + 72 : x0 + 2, 6, 6, 4);
      ctx.strokeStyle = '#4a2e14'; ctx.lineWidth = 3; ctx.strokeRect(x0, 0, 80, 12);
      ctx.restore();
    };
    door(-1); door(1);
    if (shut >= 1) text('SAFE!', x + 80, 360, 22, '#ffffff', 'center');
  }
  // the mound behind the cellar doors (origin: the doorway's left edge at y 420)
  function paintCellarMound() {
    const R = n => K.hash(n * 1.9 + 0.3);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(80, 1, 228, 7, 0, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(0, -90, 0, 0); g.addColorStop(0, '#6e8448'); g.addColorStop(1, '#4e6030');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(80, 0, 220, 90, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#3e5028'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(80, 0, 220, 90, 0, Math.PI, 0); ctx.stroke();
    // grass tufts over the crown, lit on the left
    ctx.lineCap = 'round';
    for (const [col, n0] of [['#3e5028', 0], ['#86a05a', 1]]) {
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let k = 0; k < 90; k++) { const a = Math.PI + R(k * 2 + n0) * Math.PI, rx = 220 * Math.cos(a), ry = 90 * Math.sin(a), d = 0.82 + R(k + 300 + n0) * 0.18; const px = 80 + rx * d, py = ry * d; ctx.moveTo(px, py); ctx.lineTo(px - 3 + R(k + 500) * 2, py - 5 - R(k + 600) * 5); }
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // a few field stones half sunk in the turf, and a patch of clover
    for (let k = 0; k < 7; k++) { const sx = -100 + R(k + 700) * 360, sy = -10 - R(k + 701) * 30, r = 4 + R(k + 702) * 5; if (sx > -10 && sx < 170) continue; ctx.fillStyle = '#8a8478'; ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(sx - r * 0.3, sy - r * 0.25, r * 0.45, r * 0.22, 0, 0, TAU); ctx.fill(); }
    // the stone collar round the hole and the dark way down, with steps
    ctx.fillStyle = '#7a766c'; rr(-8, -44, 176, 48, 4); ctx.fill();
    for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? '#8a8478' : '#9a9488'; rr(-8 + k * 22, -44, 21, 7, 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-8, -44, 176, 1.5);
    const dg = ctx.createLinearGradient(0, -40, 0, 10); dg.addColorStop(0, '#2a2018'); dg.addColorStop(1, '#120c08');
    ctx.fillStyle = dg; ctx.fillRect(0, -40, 160, 50);
    ctx.fillStyle = '#3a2e22'; for (let k = 0; k < 3; k++) ctx.fillRect(10 + k * 6, -24 + k * 10, 140 - k * 12, 3);
    ctx.fillStyle = 'rgba(255,220,150,0.08)'; ctx.fillRect(10, -24, 140, 1);
  }
  function drawTop(st) {
    const t = st.clock, sh = st.shake * 3 * Math.sin(t * 60), fl = K.flashA(st);
    ctx.save(); ctx.translate(0, sh);
    drawTornado(st, t);
    for (let l = 0; l < 3; l++) {
      drawObs(st, t, l);
      if (st.state !== 'spin' && Math.round(st.laneF) === l && !(st.lastRoom && st.endT > 1.7)) drawVan(st, t);
    }
    if (st.state === 'spin') drawSpin(st, t);
    if (st.state === 'end' && st.lastRoom) drawCellar(st);
    for (const h of st.obs) if (h.kind === 'low') drawDeck(st, h);
    if (st.corn) drawCorn(st, t);
    drawJunk(st, t);
    K.drawParts(st, 0);
    ctx.restore();
    // rain, wind and the edge markers for what's coming
    K.rain(t, { wind: -260 - (1 - st.gap) * 200, n: st.k === 3 ? 200 : 140, a: 0.4 });
    K.windStreaks(t, { dir: -1, n: 8, a: 0.25 });
    markers(st, t);
    if (st.dark) { const v = ctx.createRadialGradient(st.vx, 420, 120, st.vx, 420, 640); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,' + st.dark * 0.6 + ')'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); }
    K.flashTop(fl);
    K.drawPops(st, 0, 0);
  }
  function drawCorn(st, t) {
    // tall corn on the right hides what's coming until late: jointed stalks, ribbed leaves, husked ears, tassels
    const off = st.dist;
    for (let x = W - 280 - (off % 22); x < W + 22; x += 22) {
      const k = Math.round((x + off) / 22), sway = Math.sin(t * 3 + k) * 6, topY = 330 + (k % 4) * 10;
      ctx.strokeStyle = '#5e6c2a'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x, 512); ctx.quadraticCurveTo(x + sway * 0.5, 450, x + sway - 6, topY); ctx.stroke();
      ctx.strokeStyle = '#7a8a3a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 0.8, 512); ctx.quadraticCurveTo(x + sway * 0.5 - 0.8, 450, x + sway - 6.8, topY); ctx.stroke();
      ctx.strokeStyle = 'rgba(220,230,160,0.45)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 1.5, 510); ctx.quadraticCurveTo(x + sway * 0.5 - 1.5, 450, x + sway - 7.5, topY + 4); ctx.stroke();
      // nodes on the stalk
      ctx.fillStyle = '#4e5a20'; for (let j = 0; j < 4; j++) { const u = 0.15 + j * 0.2, px = (1 - u) * (1 - u) * x + 2 * u * (1 - u) * (x + sway * 0.5) + u * u * (x + sway - 6), py = (1 - u) * (1 - u) * 512 + 2 * u * (1 - u) * 450 + u * u * topY; ctx.fillRect(px - 2.5, py, 5, 1.6); }
      // leaves: a long curved blade with a pale midrib, darker underside
      for (let j = 0; j < 4; j++) {
        const lx = x + sway * 0.6, ly = 470 - j * 34, d = j % 2 ? 1 : -1, tip = lx + d * 24, ty = ly + 4 + sway * 0.2;
        ctx.fillStyle = j % 2 ? '#8a9a40' : '#9aa84a';
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.quadraticCurveTo(lx + d * 12, ly - 8, tip, ty); ctx.quadraticCurveTo(lx + d * 12, ly + 1, lx, ly + 3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(60,70,20,0.35)'; ctx.beginPath(); ctx.moveTo(lx, ly + 3); ctx.quadraticCurveTo(lx + d * 12, ly + 1, tip, ty); ctx.quadraticCurveTo(lx + d * 12, ly - 2, lx, ly + 1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(230,236,170,0.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(lx + d * 2, ly); ctx.quadraticCurveTo(lx + d * 12, ly - 4, tip - d * 2, ty - 0.5); ctx.stroke();
      }
      // the ear: green husk wrapped round a golden cob, pale silk at its tip
      const ex = x + sway * 0.7 + 4;
      ctx.fillStyle = '#e8c45a'; ctx.beginPath(); ctx.ellipse(ex, 400, 4, 10, 0.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c89a2a'; for (let j = 0; j < 4; j++) { circle(ex - 1 + (j % 2) * 2, 394 + j * 3.5, 0.9); ctx.fill(); }
      ctx.fillStyle = '#7a9a3a'; ctx.beginPath(); ctx.moveTo(ex - 5, 410); ctx.quadraticCurveTo(ex - 6, 398, ex - 1, 390); ctx.quadraticCurveTo(ex - 2, 400, ex + 1, 410); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(ex + 5, 410); ctx.quadraticCurveTo(ex + 7, 400, ex + 3, 392); ctx.quadraticCurveTo(ex + 3, 402, ex, 410); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#d8b880'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(ex - 1, 391); ctx.lineTo(ex - 4, 385); ctx.moveTo(ex, 391); ctx.lineTo(ex + 1, 384); ctx.moveTo(ex + 1, 391); ctx.lineTo(ex + 4, 386); ctx.stroke();
      // the tassel
      const tx = x + sway - 6;
      ctx.strokeStyle = '#c8a84a'; ctx.lineWidth = 1; ctx.beginPath();
      for (let j = -2; j <= 2; j++) { ctx.moveTo(tx, topY); ctx.quadraticCurveTo(tx + j * 3, topY - 8, tx + j * 5 + sway * 0.3, topY - 4 + Math.abs(j) * 2); }
      ctx.moveTo(tx, topY); ctx.lineTo(tx + sway * 0.2, topY - 12); ctx.stroke();
    }
  }
  function markers(st, t) {
    if (st.state !== 'go') return;
    const warn = st.corn ? S.cornWarnT : S.warnT;
    for (const h of st.obs) {
      if (h.hit) continue;
      const sx = h.d - st.dist, at = arrival(st, h);
      if (at < 0 || at > warn || (sx < W - 30 && !(st.corn && sx > W - 280))) continue;
      const pul = 0.7 + 0.3 * Math.sin(t * 16);
      const ls = h.kind === 'cow' ? [Math.round(h.lf)] : h.kind === 'low' ? [0, 2] : h.lanes;
      for (const l of ls) {
        ctx.fillStyle = h.kind === 'ramp' ? 'rgba(255,197,61,' + pul + ')' : 'rgba(255,70,60,' + pul + ')';
        ctx.beginPath(); ctx.moveTo(W - 6, LY[l] - 22); ctx.lineTo(W - 30, LY[l] - 34); ctx.lineTo(W - 30, LY[l] - 10); ctx.closePath(); ctx.fill();
        text('!', W - 22, LY[l] - 22, 14, '#ffffff', 'center');
      }
      if (h.kind === 'ramp') text('BRIDGE OUT: HORN!', W - 100, 372, 13, C.gold, 'center', 'body');
      if (h.kind === 'low') text('LOW BRIDGE', W - 80, 372, 13, '#ffd0c8', 'center', 'body');
    }
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '💥 ' + st.stats.batted;
      ctx.font = FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, '#ffe08a', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play) return;
    const pl = plan(st), D = st.drv, P_ = st.spt, O = st.spot;
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(D, 'driver', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, (K.quiet(D) ? '' : K.key(D, 'up') + K.key(D, 'down') + ' ') + 'LANE', pl.drv.lane !== st.lane, st.lane !== st.laneF, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, st.hornCd > 0 ? 'BOOST ' + Math.ceil(st.hornCd) + 's' : kk(D, 'act') + 'BOOST', pl.drv.horn || (pl.ramp < 1.2 && st.hornCd <= 0), st.boostT > 0, z);
    }
    {
      const bx = K.panel(P_, 'spotter', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(P_, 'act') + (pl.spt.why === 'cow' ? 'BRACE' : 'SWING'), !!pl.spt.act, O.sw >= 0, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(P_, 'down') + 'DUCK', pl.spt.down, O.duck, z);
    }
    // the tornado gap and the stretch so far
    {
      const w = 220 * z, x = W / 2 - w / 2, y = (big ? 118 : 94);
      ctx.fillStyle = 'rgba(20,22,52,0.88)'; rr(x - 12, y - 18 * z, w + 24, 56 * z, 14 * z); ctx.fill();
      text('🌪', x - 2, y + 2, 14 * z, '#ffffff', 'left', 'body');
      const gc = st.gap < 0.25 ? '#ff5a4a' : st.gap < 0.45 ? '#ffb04a' : '#8fe3b0';
      K.meter(x + 22 * z, y - 4, w - 50 * z, 10 * z, clamp(st.gap, 0, 1), gc);
      text('🚐', x + w - 22 * z, y + 2, 14 * z, '#ffffff', 'left', 'body');
      text(st.gap < 0.25 ? 'TOO CLOSE!' : 'Tornado gap', W / 2, y - 10 * z, 10 * z, st.gap < 0.25 ? '#ff8a7a' : '#aab', 'center', 'body');
      K.meter(x + 22 * z, y + 16 * z, w - 50 * z, 6 * z, clamp(st.dist / st.len, 0, 1), '#ffe08a');
      if (st.bar > 0) text('gold bull-bar x' + st.bar, W / 2, y + 30 * z, 11 * z, C.gold, 'center', 'body');
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st), s = vanScale(st.laneF), y = vanY(st.laneF);
    {
      let str = null, col = C.gold, pulse = false;
      if (pl.drv.horn || (pl.ramp < 1.0 && st.hornCd <= 0 && st.boostT <= 0)) { str = 'BOOST! ' + K.key(D, 'act'); pulse = true; }
      else if (pl.drv.lane !== st.lane) { str = (pl.drv.lane < st.lane ? 'Up a lane ' + K.key(D, 'up') : 'Down a lane ' + K.key(D, 'down')); pulse = pl.drv.clear[st.lane] < 0.9; }
      else if (pl.low < 1.5) { str = 'Middle lane!'; col = '#ffe7a8'; }
      else if (st.dish) { str = 'Hold steady!'; col = '#ffe7a8'; }
      P.say(D, str, st.vx + 60 * s, y - 70 * s, col, pulse);
    }
    {
      let str = null, col = C.gold, pulse = false;
      if (pl.spt.down) { str = 'Duck! ' + K.key(P_, 'down'); pulse = true; }
      else if (pl.spt.why === 'dish') { str = O.aim === 3 ? 'Swing! ' + K.key(P_, 'act') : 'Aim straight up ' + K.key(P_, O.aim > 3 ? 'left' : 'right'); pulse = true; }
      else if (pl.spt.why === 'cow') { str = 'A cow! HOLD ' + K.key(P_, 'act') + ' to brace'; col = '#bfe6ff'; pulse = !!pl.spt.act; }
      else if (pl.spt.why === 'bat') {
        if (O.aim !== pl.spt.aim) str = 'Aim ' + K.key(P_, pl.spt.aim > O.aim ? 'right' : 'left');
        else if (pl.spt.act) { str = 'SWING! ' + K.key(P_, 'act'); pulse = true; }
        else { str = 'Ready...'; col = '#ffe7a8'; }
      }
      P.say(P_, str, st.vx - 12 * s, y - 170 * s, col, pulse);
    }
  }

  MODES.tornadorun = {
    S, plan, aimA,
    medals: { bronze: 'Reach the storm cellar', goals: [{ key: 'time', gold: S.goldT, silver: S.silverT }] },
    medalValues() { return {}; },
    setup(st, L) {
      st.stats = { dents: 0, hits: 0, junkHits: 0, batted: 0, cows: 0, bonks: 0, dishes: 0, spins: 0, jumps: 0, helps: 0, roomT: [] };
      st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0;
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.obs) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.obs) drawTop(st); },
    hud() { const st = G.mst; if (st.obs) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Dents', value: String(s.dents) },
        { label: 'Junk batted', value: String(s.batted) },
        { label: 'Spin-outs', value: String(s.spins) },
      ];
      out.push('Road hits: ' + s.hits + '. Junk on the roof: ' + s.junkHits + '. Cows bounced home: ' + s.cows + '. Dish saves: ' + s.dishes + '. Everyone made the cellar!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = d => ({ label: 'boost', labels: d === 0 ? ['boost', 'swing'] : ['swing', 'boost'] });
  const J = (small, large, cow) => ({ small, large, cow });
  STORMCHASE.defs.tornadorun = {
    name: 'Tornado Alley Run', world: 32, kind: 'team', mode: 'tornadorun', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    jobs: {
      driver: { title: 'Driver', act: 'boost', legend: '<kbd>W</kbd><kbd>S</kbd> change lane <kbd>A</kbd><kbd>D</kbd> slower, faster',
        howTo: ['Boost (the horn) jumps a broken bridge.'] },
      spotter: { title: 'Spotter', act: 'swing', legend: '<kbd>A</kbd><kbd>D</kbd> aim the bat <kbd>S</kbd> hold to duck',
        howTo: ['Swing at the junk. Keep holding after a swing to brace for a cow.'] },
    },
    jobOf: 'drv', jobSwap: 'You swap jobs every stretch.',
    tip: 'Outrun the tornado! The driver dodges and boosts over broken bridges; the spotter aims and swings at the junk.',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'Farm Road', drv: 0, len: 11000, kinds: ['wreck', 'wreck', 'pole', 'puddle'], junk: J(1, 0, 0), pairs: 0, junkGap: [3.2, 4.2], ramps: 1, bridges: 0, dishes: [], done: 'Farm Road done!', act: acts(0),
        tip: 'Pip drives: ▲ ▼ to change lane, the action honks to jump the broken bridge. Bo swings at the junk!' },
      { title: 'Cornfield Shortcut', drv: 1, len: 11000, corn: true, kinds: ['wreck', 'cow', 'cow', 'pole', 'puddle'], junk: J(0.75, 0, 0.25), pairs: 0, junkGap: [2.9, 3.8], ramps: 1, bridges: 0, dishes: [18], done: 'Through the corn!', act: acts(1),
        tip: 'Swap jobs! The corn hides things until late. A cow flying at the van? HOLD the action to brace, never swing!' },
      { title: 'Trailer Park', drv: 0, len: 11400, kinds: ['wreck', 'pole', 'pole', 'puddle'], junk: J(0.45, 0.45, 0.1), pairs: 0.45, junkGap: [2.7, 3.5], ramps: 1, bridges: 2, dishes: [24], done: 'Out of the trailer park!', act: acts(0),
        tip: 'Hay bales and roofs need a real swing. Low bridges: the van takes the middle lane and the spotter ducks ▼.' },
      { title: 'Storm Cellar Dash', drv: 1, len: 11800, dark: 0.45, kinds: ['wreck', 'pole', 'cow', 'puddle'], junk: J(0.4, 0.4, 0.2), pairs: 0.5, junkGap: [2.4, 3.1], ramps: 2, bridges: 1, dishes: [12, 27], act: acts(1),
        tip: 'Everything at once, and it\'s getting dark! Make it to the storm cellar!' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.tornadorunSwerve = function () { this.tone(320, 0.12, 'sawtooth', 0.012, 240); };
  Sfx.extra.tornadorunHorn = function () { this.tone(330, 0.35, 'square', 0.04, 330); this.tone(415, 0.35, 'square', 0.03, 415); };
  Sfx.extra.tornadorunSwing = function () { this.tone(500, 0.12, 'sawtooth', 0.014, 1400); };
  Sfx.extra.tornadorunBat = function () { this.tone(200, 0.08, 'square', 0.05, 90); this.tone(1100, 0.06, 'triangle', 0.03, 700); };
  Sfx.extra.tornadorunCrunch = function () { this.tone(300, 0.15, 'square', 0.05, 80); this.tone(800, 0.08, 'sawtooth', 0.02, 200, 0.03); };
  Sfx.extra.tornadorunJump = function () { this.tone(200, 0.4, 'sine', 0.05, 600); };
  Sfx.extra.tornadorunGust = function () { this.tone(300, 0.6, 'sawtooth', 0.02, 900); };
  Sfx.extra.tornadorunSpin = function () { this.tone(900, 1.4, 'sawtooth', 0.03, 120); this.tone(600, 1.2, 'sine', 0.03, 200, 0.2); };
  Sfx.extra.tornadorunSlam = function () { this.tone(90, 0.3, 'square', 0.07, 50); this.tone(70, 0.4, 'sine', 0.06, 40, 0.1); };
  Sfx.extra.tornadorunFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.11)); };
})();
