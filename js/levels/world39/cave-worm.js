/* Pip & Bo - Level 39-3 Cave Worm Chase (team, World 39 Crystal Caverns). */
'use strict';

/* ===== 39-3 Cave Worm Chase (mode 'caveworm', team, fast scrolling, Gavyn's pick) =====
   The shards in the golem were broken teeth. The thing that bit it, a colossal crystal-eating cave worm, bursts out of
   the cracked wall and comes after Pip and Bo. It follows light, and they have a bandolier of glow gems.
   SIDE VIEW, auto-scrolling right, faster each stretch. World x along the tunnel, y up is negative, the tunnel floor is
   y = 0 and its roof y = -200 (screen y = FLOOR + y). The worm's head (three turning rings of crystal teeth) sits at
   the left edge: the fuller the JAWS meter, the closer it is, and anyone it reaches is GULPED.
   BOTH: ◀ ▶ run faster or slower (the scroll carries them), ▲ jump (hold for higher), ▼ slide.
   ROLES (swap each stretch; the bandolier and the pickaxe change hands):
     LURER: action throws a glow gem (5 on the bandolier, refilled at gem clusters). ▲ held aims high, ▼ low, ◀ back,
       else forward. The worm goes for the brightest light: at a FORK a gem landing in the tunnel the pair are NOT
       taking sends the worm down it (Jaws drain); no gem, or a gem down their own tunnel, and it follows them, closer.
       A BURST from the floor ahead (the floor bulges and glows for 1.2 s) is dragged off the path by any gem that
       lands while it is out. A gem into a marked crystal SEAM in the roof: the worm bites it open, a SHORTCUT. A gem
       thrown back: it stops to chomp it. A gem into the INHALE: it coughs and stops.
     PATHFINDER: action strikes with the pickaxe: thin crystal WALLS (2 hits; a wall left standing crumbles when someone
       is pinned against it, but that costs Jaws), STALACTITES or timber ramps over wide gaps (they drop as a bridge),
       ECHO CRYSTALS (a ping and a bright arrow in the true tunnel at the next fork for 2 s: one tunnel at each fork is
       a dead end).
   THE WORM'S MOVES: closer behind as Jaws fills; bursts from the floor ahead; BODY CROSSINGS (a loop of its body
     slides down across the tunnel as a wall of plates: go through the gaps); COLLAPSES (dust lines, then a rock); the
     INHALE (stretch 3 on: it stops and sucks for 2 s: hold ▶, or hold the action at a root to grab on).
   A GULP: swallowed, two blinking eyes in the dark, spat out glittering beside the partner (Jaws + a third).
   JAWS meter: gulps, forks the worm followed, dead ends, falls into a gap, bumps and lagging fill it; good lures and
   clean running drain it. Full: CHOMP, back to the stretch's halfway checkpoint, slimed, the worm well back.
   STRETCHES: The Crack, The Crystal Bridges, The Hollow (the inhale, the worm's own back as a bridge), Dead End (fastest;
     the tunnel ends in a blank crystal wall, the worm rises, the golem's hands catch it by the jaws; the lurer throws
     the last gem up so it looks up, the pathfinder strikes the big crystal's chain, bonk, the golem flings it down a
     bottomless shaft, and it burrows away). Level clear on the golem's palm.
   GOLD HELP (3 bad events in a stretch, both playing): gold gems: a lure lasts twice as long, echo arrows stay until
     the fork, burst tells show 0.5 s earlier.
   COLLECTABLES: 20 glow gems for the satchel (5 a stretch). MEDALS: time, gulps and gems (MODES.caveworm.medals).
   MODES.caveworm.plan(st) says what each hero should do now (the prompts, the HUD chips and the brain read it).
   Sounds are Sfx.extra.caveworm*. */
(() => {
  const K = CAVE, TAU = Math.PI * 2;
  const S = {
    run: 140, grav: 1700, holdGrav: 1050, jumpV: 560, maxFall: 900, hh: 34, slideH: 18, slideMin: 0.35,
    roof: -200, upF: -80, band: -40, lowF: 60, ramp: 110, pitDie: 230,
    speed: [180, 195, 210, 225], headR: 190, reachX: 60,
    jaws: { gulp: 1 / 3, follow: 0.15, dead: 0.22, fall: 0.12, bump: 0.05, lagRate: 0.05, drain: 0.014, lure: 0.25, back: 0.1, cough: 0.06, wallPin: 0.18 },
    gemMax: 5, throwCD: 0.35, strikeCD: 0.28, lureT: 2.5, echoT: 2, burstTell: 1.2, burstOut: 3.6, goldTell: 0.5,
    gulpT: 1.4, chompT: 1.8, inhaleT: 2.2, inhaleDrag: 165, idleWait: 12, gems: 20,
  };
  const FLOOR = 400; // screen y of the tunnel floor
  const SY = y => FLOOR + y;

  /* ---------- the four stretches ----------
     Items by world x. gem [x, y] (satchel gems), cl (a gem cluster: refills the bandolier), root (slide), pit w
     (bridge: 'stal' or 'timber' means it needs the pathfinder), echo, fork (len, true lane 'up' | 'low', gem in the true
     lane), wall, burst, seam (skip: how far the shortcut jumps), cross (body crossing), drop (collapse), inhale, back w
     (the worm's own back over a wide gap). */
  const STRETCH = [
    { title: 'The Crack', len: 6400, items: [
      ['gem', 600, -20], ['root', 900], ['pit', 1300, 130], ['gem', 1560, -110], ['cl', 1850],
      ['echo', 2250], ['fork', 2900, 700, 'up'], ['gem', 3250, -100],
      ['wall', 3950], ['gem', 4300, -20], ['pit', 4650, 330, 'stal'], ['root', 5250], ['cl', 5450], ['gem', 5650, -110], ['burst', 6050]] },
    { title: 'The Crystal Bridges', len: 7100, items: [
      ['cross', 520], ['gem', 900, -20], ['cl', 1200], ['echo', 1550], ['fork', 2200, 700, 'low'], ['gem', 2500, 40],
      ['burst', 3150], ['cl', 3380], ['gem', 3500, -110], ['seam', 3850, 700], ['root', 4300], ['pit', 4720, 140], ['cross', 5020], ['gem', 5250, -20],
      ['cl', 5380], ['echo', 5500], ['fork', 6100, 700, 'up'], ['gem', 6400, -100]] },
    { title: 'The Hollow', len: 7500, items: [
      ['gem', 560, -20], ['drop', 850], ['inhale', 1250], ['root', 1750], ['cl', 2000], ['echo', 2350], ['fork', 3000, 700, 'low'], ['gem', 3300, 40],
      ['back', 3950, 460], ['gem', 4180, -30], ['gem', 4680, -110], ['drop', 4950], ['cross', 5250], ['cl', 5600], ['burst', 5950],
      ['inhale', 6350], ['gem', 6800, -20], ['wall', 7150]] },
    { title: 'Dead End', len: 7900, items: [
      ['root', 500], ['gem', 800, -20], ['pit', 1100, 140], ['cl', 1400], ['echo', 1750], ['fork', 2400, 700, 'low'], ['gem', 2700, 40],
      ['burst', 3350], ['gem', 3700, -110], ['cl', 3800], ['seam', 4000, 600], ['cross', 4450], ['drop', 5000], ['wall', 5300], ['inhale', 5700], ['cl', 6200],
      ['gem', 6500, -20], ['pit', 6850, 330, 'timber'], ['gem', 7350, -110]] },
  ];
  const ENDX = STRETCH[3].len, STOPX = ENDX - 700; // the dead-end wall, and where the scroll stops in front of it

  function build(k) {
    const L = STRETCH[k], o = { gems: [], cls: [], roots: [], pits: [], echos: [], forks: [], walls: [], bursts: [], seams: [], crosses: [], drops: [], inhales: [], backs: [] };
    let g = 0;
    for (const it of L.items) {
      const [kind, x] = it;
      if (kind === 'gem') o.gems.push({ x, y: it[2], id: k * 5 + g++, got: false });
      else if (kind === 'cl') o.cls.push({ x, used: false });
      else if (kind === 'root') o.roots.push({ x0: x, x1: x + 46, hit: [false, false] });
      else if (kind === 'pit') o.pits.push({ x0: x, x1: x + it[2], need: it[3] || null, bridged: false, fallT: -1 });
      else if (kind === 'echo') o.echos.push({ x, struck: -9, ring: 0 });
      else if (kind === 'fork') o.forks.push({ F: x, E: x + it[2], lane: it[3], lure: null, lureT: -9, known: -9, done: false, dead: false, lanes: [null, null], teach: k === 0 && o.forks.length === 0 });
      else if (kind === 'wall') o.walls.push({ x, hits: 0, broken: false, pin: 0, flash: 0 });
      else if (kind === 'burst') o.bursts.push({ x, ph: 'wait', t: 0, lured: 0, side: -1 });
      else if (kind === 'seam') o.seams.push({ x, skip: it[2], fed: false, open: false, used: false, t: 0 });
      else if (kind === 'cross') o.crosses.push({ x0: x, x1: x + 64, off: (k * 0.37) % 1 });
      else if (kind === 'drop') o.drops.push({ x, ph: 'wait', t: 0 });
      else if (kind === 'inhale') o.inhales.push({ x, done: false, anchors: [x - 260, x - 90, x + 80, x + 250, x + 420] });
      else if (kind === 'back') o.backs.push({ x0: x, x1: x + it[2] });
    }
    // an echo crystal belongs to the next fork after it
    for (const e of o.echos) e.fork = o.forks.find(f => f.F > e.x) || null;
    return o;
  }
  const CROSS_P = 1.25, CROSS_ON = 0.6; // a plate passes for 0.6 s of every 1.25 s
  const plateAt = (c, T) => ((T / CROSS_P + c.off) % 1) < CROSS_ON / CROSS_P;

  /* ---------- the ground: by x and lane ---------- */
  const forkAt = (st, x) => st.L.forks.find(f => x >= f.F && x < f.E) || null;
  function floorAt(st, x, lane) {
    const f = forkAt(st, x);
    if (f) {
      if (lane === 'up') return S.upF;
      const a = x - f.F, b = f.E - x;
      if (a < 50) return S.lowF * a / 50;
      if (b < S.ramp) return S.lowF * b / S.ramp;
      return S.lowF;
    }
    for (const p of st.L.pits) if (x >= p.x0 && x < p.x1) return p.bridged ? 0 : null;
    for (const b of st.L.backs) if (x >= b.x0 && x < b.x1) return Math.sin(st.T * 2.4 + x * 0.01) * 6;
    return 0;
  }
  function ceilAt(st, x, lane) {
    const f = forkAt(st, x);
    if (f && lane !== 'up') return S.band;
    return S.roof;
  }

  /* ---------- a stretch ---------- */
  function room(st, k, cp) {
    st.k = k; st.title = STRETCH[k].title; st.state = 'go'; st.endT = 0;
    st.lurer = k % 2 === 0 ? 1 : 0; st.finder = 1 - st.lurer;
    st.L = build(k); st.v = S.speed[k];
    st.cp = cp || 0; st.mid = STRETCH[k].len / 2;
    const x0 = cp ? cp : 260;
    st.camX = x0 - 260;
    // anything already behind the checkpoint is done
    if (cp) {
      for (const p of st.L.pits) if (p.x1 < cp) p.bridged = true;
      for (const w of st.L.walls) if (w.x < cp) w.broken = true;
      for (const f of st.L.forks) if (f.E < cp) f.done = true;
      for (const b of st.L.bursts) if (b.x < cp) b.ph = 'gone';
      for (const s of st.L.seams) if (s.x < cp) s.used = true;
      for (const d of st.L.drops) if (d.x < cp) d.ph = 'gone';
      for (const i of st.L.inhales) if (i.x < cp) i.done = true;
    }
    for (const g of st.L.gems) g.got = !!st.gotGem[g.id];
    st.h = [0, 1].map(id => ({ x: x0 + (id === st.finder ? 70 : 0), y: 0, vy: 0, ground: true, lane: null, slide: false, slideT: 0, stunT: 0, gulpT: 0, face: 1, ph: 0, act: false, grab: false, swingT: 0, backT: 0, prevX: x0 }));
    st.gemsLeft = S.gemMax; st.throwT = 0; st.strikeT = 0; st.flying = []; st.landed = [];
    st.jaws = cp ? 0.3 : 0; st.jawsVis = cp ? 0.3 : (k === 0 ? 0.45 : 0.2); st.pauseT = 0; st.backT = -9;
    st.inhale = null; st.slowT = 0; st.rc = { bad: 0 }; st.gold = false; st.goldUsed = false;
    st.final = null; st.burstIn = k === 0 && !cp ? 0 : -1;
    K.fx(st);
    if (!cp) st.segStart = G.time;
    labels(st);
    Music.cue({ song: ['cavechase', 'cavechase1', 'cavechase2', 'cavechase3'][k] });
  }
  const roleWord = (st, id) => (id === st.lurer ? 'throw' : 'strike');
  function labels(st) { K.actLabels([roleWord(st, 0), roleWord(st, 1)]); }
  const hh = h => (h.slide ? S.slideH : S.hh);
  const alive = h => h.gulpT <= 0;
  const scrX = (st, x) => x - st.camX;
  const headX = st => (st.inhale ? 40 : -60 + 250 * st.jawsVis) - (st.pauseT > 0 ? 60 : 0); // screen x of the head's centre

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.h) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    K.tickMabel(st, dt);
    K.glitter(st, dt, 30);
    if (live) {
      // the first fork is taught in slow motion
      let sdt = dt;
      if (st.slowT > 0) { st.slowT -= dt; sdt = dt * 0.35; }
      st.T += sdt;
      const scroll = st.inhale || st.pauseT > 0 ? (st.pauseT > 0 ? 0.4 : 0) : 1;
      if (st.pauseT > 0) st.pauseT -= sdt;
      st.camX += st.v * scroll * sdt;
      if (st.k === 3 && st.camX >= STOPX) { st.camX = STOPX; }
      for (let id = 0; id < 2; id++) heroStep(st, id, sdt);
      actions(st, sdt);
      flyStep(st, sdt);
      worldStep(st, sdt);
      jawsStep(st, sdt);
      if (st.jaws >= 1 && st.state === 'go') chomp(st);
      else if (st.k < 3 && st.camX > STRETCH[st.k].len) stretchDone(st);
      else if (st.k === 3 && st.camX >= STOPX && st.h.every(h => !alive(h) || h.x > ENDX - 140)) finale(st);
    } else if (st.state === 'chomp') chompStep(st, dt);
    else if (st.state === 'end') { st.endT += dt; st.camX += st.v * dt; for (const h of st.h) { h.x += st.v * dt; h.ph += dt * 12; } if (st.endT > 2.2) nextRoom(); }
    else if (st.state === 'final') finalStep(st, dt);
    if (st.burstIn >= 0) { st.burstIn += dt; if (st.burstIn > 2.2) st.burstIn = -1; }
    st.jawsVis = approach(st.jawsVis, st.state === 'final' ? st.jawsVis : st.jaws, 0.6 * dt);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    K.tickOfx(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }

  function heroStep(st, id, dt) {
    const p = G.players[id], i = p.input, h = st.h[id];
    h.prevX = h.x;
    if (h.gulpT > 0) { h.gulpT -= dt; if (h.gulpT <= 0) spit(st, id); return; }
    if (h.stunT > 0) h.stunT -= dt;
    if (h.swingT > 0) h.swingT -= dt;
    const ctl = h.stunT <= 0;
    const lr = ctl ? (i.right ? 1 : 0) - (i.left ? 1 : 0) : 0;
    h.act = !!i.act; h.grab = false;
    // the inhale: drag toward the mouth, unless holding on to a root
    let drag = 0;
    if (st.inhale) {
      const it = st.inhale.item, near = it.anchors.some(a => Math.abs(a - h.x) < 34);
      if (i.act && near && h.ground && id !== st.lurer) h.grab = true;
      else if (i.act && near && h.ground && st.gemsLeft <= 0) h.grab = true;
      else if (i.act && near && h.ground && !i.jump && !i.up && !p.pendingAct) h.grab = true;
      if (!h.grab) drag = -S.inhaleDrag;
    }
    const spd = h.grab ? 0 : (st.inhale ? 0 : st.v * (st.pauseT > 0 ? 0.4 : 1)) + lr * S.run * (h.stunT > 0 ? 0 : 1) + drag - (h.stunT > 0 ? 70 : 0) - (h.backT > 0 ? 120 : 0);
    if (h.backT > 0) h.backT -= dt;
    if (lr) h.face = lr;
    h.x += spd * dt; h.vx = spd;
    if (h.ground) h.ph += dt * 12 * clamp(Math.abs(spd) / 200, 0.4, 1.4);
    // slide
    if (h.ground && i.down && ctl) { if (!h.slide) Sfx.play('cavewormSlide'); h.slide = true; h.slideT = Math.max(h.slideT, S.slideMin); }
    if (h.slideT > 0) h.slideT -= dt;
    if (h.slide && !(i.down && h.ground) && h.slideT <= 0) {
      // stand up only if there is room
      if (h.y - S.hh >= ceilAt(st, h.x, h.lane) - 1 && !rootOver(st, h)) h.slide = false;
    }
    // jump
    if (ctl && p.pendingJump && h.ground && !h.grab) { h.ground = false; h.vy = -S.jumpV; h.slide = false; h.slideT = 0; Sfx.play('cavewormJump'); }
    const y0 = h.y;
    if (!h.ground) {
      const g = h.vy < 0 && (i.jump || i.up) ? S.holdGrav : S.grav;
      h.vy = Math.min(S.maxFall, h.vy + g * dt);
      h.y += h.vy * dt;
    }
    // into a fork: the lane is chosen by height at its mouth
    for (const f of st.L.forks) if (h.prevX < f.F && h.x >= f.F) { h.lane = h.y <= S.upF + 2 ? 'up' : 'low'; f.lanes[id] = h.lane; }
    if (h.lane && !forkAt(st, h.x)) h.lane = null;
    // the floor
    const fl = floorAt(st, h.x, h.lane);
    if (h.ground) {
      if (fl === null || fl > h.y + 3) { h.ground = false; h.vy = 0; }
      else h.y = fl;
    } else if (fl !== null && h.vy >= 0 && h.y >= fl && y0 <= fl + 6) { h.y = fl; h.vy = 0; h.ground = true; Sfx.play('cavewormLand'); }
    else if (fl !== null && h.ground === false && h.vy >= 0 && h.y > fl && h.y - fl < 14 && fl > 0) { h.y = fl; h.vy = 0; h.ground = true; }
    // the roof (or the rock band over the low tunnel of a fork)
    const cl = ceilAt(st, h.x, h.lane);
    if (h.y - hh(h) < cl) { h.y = cl + hh(h); if (h.vy < 0) h.vy = 0; if (h.ground && h.y > (fl === null ? 0 : fl)) h.y = fl; }
    // a dead end
    for (const f of st.L.forks) {
      if (h.lane && h.lane !== f.lane && h.x >= f.E - 70 && h.x < f.E) deadEnd(st, id, f);
    }
    // walls
    for (const w of st.L.walls) {
      if (w.broken) continue;
      if (h.x + 12 > w.x - 14 && h.prevX + 12 <= w.x - 14 + 2) {
        h.x = w.x - 26;
        if (scrX(st, h.x) < 16) { w.pin += dt; if (w.pin > 0.5) crumble(st, w); }
      }
    }
    // the screen edges: the scroll pushes from the left, nobody runs off the right
    const sx = scrX(st, h.x);
    if (sx > W - 40) h.x = st.camX + W - 40;
    if (sx < 10 && st.state === 'go') h.x = st.camX + 10;
    // a fall into a gap: bounced out by the glow-mushrooms, on the far side, dazed
    if (h.y > S.pitDie) fellIn(st, id);
  }
  const rootOver = (st, h) => st.L.roots.some(r => h.x + 10 > r.x0 && h.x - 10 < r.x1);

  // the action: the lurer throws, the pathfinder strikes
  function actions(st, dt) {
    st.throwT -= dt; st.strikeT -= dt;
    for (let id = 0; id < 2; id++) {
      const p = G.players[id], h = st.h[id];
      if (!alive(h) || !p.pendingAct) continue;
      if (id === st.lurer) {
        if (st.throwT > 0) continue;
        if (st.gemsLeft <= 0) { K.hintOnce(st, 'nogem' + Math.floor(st.T / 6), id, 'No gems! Grab a cluster', 1.6); Sfx.play('cavewormEmpty'); continue; }
        const i = p.input, aim = (i.jump || i.up) ? 'up' : i.down ? 'low' : (i.left && !i.right) ? 'back' : 'fwd';
        throwGem(st, id, aim);
      } else {
        if (st.strikeT > 0 || h.grab) continue;
        st.strikeT = S.strikeCD; h.swingT = 0.22;
        strike(st, id);
      }
    }
  }
  const AIM = { fwd: [380, -330], up: [270, -680], low: [420, -120], back: [-460, -240] };
  function throwGem(st, id, aim) {
    const h = st.h[id], [vx, vy] = AIM[aim];
    st.gemsLeft--; st.throwT = S.throwCD;
    st.flying.push({ x: h.x + 8, y: h.y - 24, vx: (aim === 'back' ? 0 : st.v) + vx, vy, lane: h.lane, t: 0, aim, gold: st.gold });
    st.stats.thrown++;
    Sfx.play('cavewormGemThrow');
    if (st.inhale && !st.inhale.cough) { st.inhale.cough = 0.4; }
  }
  // the same flight, simulated without side effects (the plan and the brain read where a throw would land)
  function predict(st, x, y, lane, aim, seam) {
    const [vx0, vy0] = AIM[aim];
    let vx = (aim === 'back' ? 0 : st.v) + vx0, vy = vy0, ln = lane, near = 1e9;
    const dt = 1 / 60;
    for (let n = 0; n < 120; n++) {
      const px = x; x += vx * dt; vy += S.grav * dt; y += vy * dt;
      for (const f of st.L.forks) if (px < f.F && x >= f.F) ln = y <= S.upF ? 'up' : 'low';
      if (ln && !forkAt(st, x)) ln = null;
      const cl = ceilAt(st, x, ln); if (y < cl + 4) { y = cl + 4; vy = Math.abs(vy) * 0.3; }
      if (seam) near = Math.min(near, Math.hypot(x - seam.x, y + 150));
      const fl = floorAt(st, x, ln);
      if (fl !== null && y >= fl && vy > 0) return { x, lane: ln, near };
      if (y > 300) return { x, lane: ln, near, lost: true };
    }
    return { x, lane: ln, near, lost: true };
  }
  function flyStep(st, dt) {
    for (const g of st.flying) {
      const px = g.x;
      g.t += dt; g.x += g.vx * dt; g.vy += S.grav * dt; g.y += g.vy * dt;
      for (const f of st.L.forks) if (px < f.F && g.x >= f.F) g.lane = g.y <= S.upF ? 'up' : 'low';
      if (g.lane && !forkAt(st, g.x)) g.lane = null;
      const cl = ceilAt(st, g.x, g.lane); if (g.y < cl + 4) { g.y = cl + 4; g.vy = Math.abs(g.vy) * 0.3; }
      for (const w of st.L.walls) if (!w.broken && px < w.x - 10 && g.x >= w.x - 10) { g.x = w.x - 12; g.vx = -40; }
      // a seam in the roof: the worm bites through it
      for (const s of st.L.seams) if (!s.fed && !s.used && Math.hypot(g.x - s.x, g.y + 150) < 50) { s.fed = true; s.t = 0; g.dead = true; Sfx.play('cavewormSeamBite'); K.msg(st, 'It bit through the seam! A shortcut!', '#bff8ef', 2); st.stats.seams++; }
      const fl = floorAt(st, g.x, g.lane);
      if (!g.dead && fl !== null && g.y >= fl && g.vy > 0) { g.dead = true; land(st, g, fl); }
      if (!g.dead && (g.y > 300 || scrX(st, g.x) < -120)) { g.dead = true; if (g.aim === 'back') backBite(st); }
    }
    st.flying = st.flying.filter(g => !g.dead);
    for (const g of st.landed) g.t += dt;
    st.landed = st.landed.filter(g => g.t < (g.gold ? S.lureT * 2 : S.lureT) && scrX(st, g.x) > -60);
  }
  function land(st, g, fl) {
    Sfx.play('cavewormGemLand');
    st.landed.push({ x: g.x, y: fl, lane: g.lane, t: 0, gold: g.gold });
    K.spark(st, scrX(st, g.x), SY(fl) - 6, 6, [K.GLOW.teal, '#ffffff']);
    if (g.aim === 'back' || scrX(st, g.x) < 60) { backBite(st); return; }
    // a fork: the worm will go where the light is
    const f = forkAt(st, g.x);
    if (f && !f.done && g.lane) { f.lure = g.lane; f.lureT = st.T; }
    // a burst: the head swings to the light
    for (const b of st.L.bursts) if ((b.ph === 'tell' || b.ph === 'out') && g.x > b.x - 800 && g.x < b.x + 600) { b.lured = st.gold ? S.lureT * 2 : S.lureT; b.side = g.x > b.x ? 1 : -1; st.stats.lured++; Sfx.play('cavewormLureChomp'); }
  }
  function backBite(st) {
    if (st.T - st.backT < 3) return;
    st.backT = st.T; st.pauseT = 1; st.jaws = Math.max(0, st.jaws - S.jaws.back); st.stats.lured++;
    Sfx.play('cavewormLureChomp'); K.msg(st, 'It stopped to chomp the gem!', '#bff8ef', 1.6);
  }
  function strike(st, id) {
    const h = st.h[id];
    Sfx.play('cavewormPickSwing');
    for (const e of st.L.echos) if (h.x > e.x - 90 && h.x < e.x + 30) {
      e.struck = st.T; e.ring = 1; if (e.fork && e.fork.known < 0) e.fork.known = st.T;
      Sfx.play('cavewormEchoPing'); K.spark(st, scrX(st, e.x), SY(-60), 10, [K.GLOW.ice, '#ffffff']); st.stats.echoes++;
      return;
    }
    for (const w of st.L.walls) if (!w.broken && w.x - h.x > -10 && w.x - h.x < 80) {
      w.hits++; w.flash = 0.2; Sfx.play('cavewormPickStrike'); K.spark(st, scrX(st, w.x - 12), SY(-30), 6, [K.GLOW.ice, K.GLOW.teal]);
      if (w.hits >= 2) { w.broken = true; st.stats.walls++; Sfx.play('cavewormWallShatter'); K.spark(st, scrX(st, w.x), SY(-90), 18, [K.GLOW.ice, K.GLOW.teal, '#ffffff']); }
      return;
    }
    for (const p of st.L.pits) if (p.need && !p.bridged && h.x > p.x0 - 200 && h.x < p.x0 + 20) {
      p.bridged = true; p.fallT = 0; Sfx.play(p.need === 'stal' ? 'cavewormStalactiteDrop' : 'cavewormRopeCut'); st.stats.bridges++;
      K.pop(st, scrX(st, (p.x0 + p.x1) / 2), SY(-60), p.need === 'stal' ? 'Bridge!' : 'Ramp!', '#ffffff', 16);
      return;
    }
  }
  function crumble(st, w) {
    w.broken = true; st.stats.walls++; st.jaws = Math.min(1, st.jaws + S.jaws.wallPin);
    Sfx.play('cavewormWallShatter'); G.shake = 0.3;
    bad(st, 'The worm\'s roar shook the wall down. Strike walls first, pathfinder!');
  }

  /* ---------- the world: forks, bursts, crossings, collapses, the inhale, seams, pickups ---------- */
  function worldStep(st, dt) {
    const L = st.L, live = st.h.filter(alive), lead = live.length ? Math.max(...live.map(h => h.x)) : st.camX + 300;
    // forks: the first one in slow motion; the worm chooses when it reaches the mouth
    for (const f of L.forks) {
      if (f.teach && !f.taught && st.h[st.lurer].x > f.F - 330) { f.taught = true; st.slowT = 0.7; K.hint(st, st.lurer, 'Throw a gem down the OTHER tunnel! ' + K.key(st.lurer, 'act'), 3); }
      if (!f.done && st.camX + 40 >= f.F) {
        f.done = true;
        const lanes = f.lanes.filter(Boolean), lured = f.lure && !lanes.includes(f.lure);
        if (lured) { st.jaws = Math.max(0, st.jaws - S.jaws.lure); st.stats.forksLured++; st.stats.lured++; Sfx.play('caveWormRoarFar'); K.msg(st, 'It went down the other tunnel!', '#bff8ef', 2); st.pauseT = 0.6; }
        else { st.jaws = Math.min(1, st.jaws + S.jaws.follow); st.stats.followed++; Sfx.play('cavewormRoar'); bad(st, f.lure ? 'The gem went down your tunnel. It followed you!' : 'No gem down the other tunnel. It followed you!'); }
      }
    }
    // bursts from the floor ahead
    for (const b of L.bursts) {
      if (b.lured > 0) b.lured -= dt;
      const tell = S.burstTell + (st.gold ? S.goldTell : 0);
      if (b.ph === 'wait' && b.x - st.camX < W - 40 + (st.gold ? st.v * S.goldTell : 0)) { b.ph = 'tell'; b.t = 0; Sfx.play('cavewormBurstTell'); }
      else if (b.ph === 'tell') { b.t += dt; if (b.t > tell) { b.ph = 'out'; b.t = 0; Sfx.play('cavewormBurstOut'); G.shake = 0.4; K.spark(st, scrX(st, b.x), SY(0), 18, [K.GLOW.teal, K.GLOW.ice, '#ffffff']); } }
      else if (b.ph === 'out') {
        b.t += dt;
        if (b.lured <= 0) for (let id = 0; id < 2; id++) { const h = st.h[id]; if (alive(h) && Math.hypot(h.x - b.x, (h.y - hh(h) / 2) - burstY(b)) < 78) gulp(st, id); }
        if (b.t > S.burstOut || scrX(st, b.x) < -100) { b.ph = 'gone'; Sfx.play('cavewormBodySlide'); }
      }
    }
    // body crossings
    for (const c of L.crosses) {
      if (!plateAt(c, st.T)) continue;
      for (let id = 0; id < 2; id++) {
        const h = st.h[id]; if (!alive(h)) continue;
        if (h.x + 11 > c.x0 && h.x - 11 < c.x1) { h.x = c.x0 - 40; h.stunT = 0.4; h.backT = 0.5; bump(st, id, 'Bonk! Wait for a gap'); }
      }
    }
    // roots: slide under
    for (const r of L.roots) for (let id = 0; id < 2; id++) {
      const h = st.h[id]; if (!alive(h) || r.hit[id]) continue;
      if (h.x + 10 > r.x0 && h.x - 10 < r.x1 && !h.slide && h.y - hh(h) < -22 + 0 && h.y > -40) { r.hit[id] = true; h.stunT = 0.45; bump(st, id, 'Tangled in a root! Slide ' + K.key(id, 'down')); }
    }
    // collapses
    for (const d of L.drops) {
      if (d.ph === 'wait' && lead > d.x - 420) { d.ph = 'tell'; d.t = 0; Sfx.play('cavewormCollapseTell'); }
      else if (d.ph === 'tell') { d.t += dt; if (d.t > 1.1) { d.ph = 'fall'; d.t = 0; } }
      else if (d.ph === 'fall') {
        d.t += dt;
        if (d.t > 0.28 && !d.hit) {
          d.hit = true; Sfx.play('cavewormCollapse'); G.shake = 0.25; K.dust(st, scrX(st, d.x), SY(0), '#b8b0a8', 10);
          for (let id = 0; id < 2; id++) { const h = st.h[id]; if (alive(h) && Math.abs(h.x - d.x) < 36 && h.y > -70) { h.stunT = 0.6; bump(st, id, 'Rocks! Watch the dust lines'); } }
        }
        if (d.t > 0.6) d.ph = 'rubble';
      }
    }
    // the inhale
    for (const it of L.inhales) if (!it.done && lead > it.x) { it.done = true; st.inhale = { item: it, t: 0 }; Sfx.play('cavewormInhale'); Music.cue({ song: 'cavechaseLow' }); K.msg(st, 'It\'s sucking you in! Hold ▶, or grab a root', C.gold, 2); }
    if (st.inhale) {
      const I = st.inhale; I.t += dt;
      if (I.cough !== undefined) I.cough -= dt;
      for (let id = 0; id < 2; id++) { const h = st.h[id]; if (alive(h) && scrX(st, h.x) < headX(st) + 90) gulp(st, id); }
      if (I.t > S.inhaleT || (I.cough !== undefined && I.cough <= 0)) {
        if (I.cough !== undefined) { st.stats.coughs++; st.jaws = Math.max(0, st.jaws - S.jaws.cough); Sfx.play('cavewormCough'); K.msg(st, 'Cough! The gem made it choke', '#bff8ef', 1.6); }
        st.inhale = null; Music.cue({ song: ['cavechase', 'cavechase1', 'cavechase2', 'cavechase3'][st.k] });
      }
    }
    // seams: once fed, the shortcut opens; the first one there takes both through
    for (const s of L.seams) {
      if (s.fed && !s.open) { s.t += dt; if (s.t > 0.6) { s.open = true; G.shake = 0.3; } }
      if (s.open && !s.used && lead > s.x - 20) {
        s.used = true; st.stats.shortcuts++;
        st.camX += s.skip;
        for (const h of st.h) { h.x += s.skip; h.prevX = h.x; h.lane = null; if (h.y < 0) h.y = 0; h.vy = 0; h.ground = true; }
        const far = Math.max(...st.h.map(h => h.x)) + 120;
        for (const p of L.pits) if (p.x0 < far) p.bridged = true;
        for (const w of L.walls) if (w.x < st.camX + 300) w.broken = true;
        for (const c of L.crosses) if (c.x0 > s.x && c.x0 < s.x + s.skip) c.x0 = c.x1 = -9999;
        st.jaws = Math.max(0, st.jaws - 0.1);
        Sfx.play('cavewormShortcut'); K.msg(st, 'Shortcut through the worm\'s own tunnel!', '#bff8ef', 2);
        st.flash = 0.5;
      }
    }
    // satchel gems and gem clusters
    for (const g of L.gems) {
      if (g.got) continue;
      for (const h of st.h) if (alive(h) && Math.abs(h.x - g.x) < 24 && g.y > h.y - hh(h) - 12 && g.y < h.y + 10) {
        g.got = true; st.gotGem[g.id] = true; st.gems++; st.stats.gems = st.gems;
        Sfx.play('caveGem', 1 + st.gems * 0.02); K.spark(st, scrX(st, g.x), SY(g.y), 8, [K.GLOW.teal, '#ffffff']); K.pop(st, scrX(st, g.x), SY(g.y) - 24, 'Gem!', '#bff8ef', 15);
        break;
      }
    }
    for (const c of L.cls) {
      if (c.used) continue;
      const h = st.h[st.lurer];
      if (alive(h) && Math.abs(h.x - c.x) < 30 && h.y > -60 && h.lane !== 'up') {
        c.used = true; const was = st.gemsLeft; st.gemsLeft = S.gemMax;
        if (was < S.gemMax) { Sfx.play('cavewormRefill'); K.pop(st, scrX(st, c.x), SY(-60), '+' + (S.gemMax - was) + ' gems', '#bff8ef', 15); }
      }
    }
    for (const w of L.walls) if (w.flash > 0) w.flash -= dt;
    for (const p of L.pits) if (p.fallT >= 0 && p.fallT < 1) p.fallT += dt;
    for (const e of L.echos) if (e.ring > 0) e.ring -= dt;
    if (st.flash > 0) st.flash -= dt;
    // the worm behind: anyone it reaches is gulped
    if (!st.inhale) for (let id = 0; id < 2; id++) { const h = st.h[id]; if (alive(h) && scrX(st, h.x) < headX(st) + S.reachX) gulp(st, id); }
    // slime and soot for the outfits
    for (let id = 0; id < 2; id++) { const o = K.ofx(st, id); o.soot = 0; }
  }
  const burstY = b => -100 + (b.lured > 0 ? -220 : 0);
  // where the burst head is drawn (it rises out of the floor in the first 0.3 s, and swings away when lured)
  function burstPos(st, b) {
    const u = b.ph === 'out' ? K.smooth(clamp(b.t / 0.3, 0, 1)) : 0, back = b.ph === 'out' && b.t > S.burstOut - 0.5 ? K.smooth((b.t - S.burstOut + 0.5) / 0.5) : 0;
    let y = K.lerp(80, -100, u) + back * 180, x = b.x;
    if (b.lured > 0) { y -= 150 * clamp((b.lt = Math.min((b.lt || 0) + 0.05, 1)), 0, 1); x += b.side * 140 * (b.lt || 0); }
    else b.lt = Math.max(0, (b.lt || 0) - 0.05);
    return { x, y };
  }

  function bump(st, id, text) {
    st.stats.bumps++; st.jaws = Math.min(1, st.jaws + S.jaws.bump);
    Sfx.play('cavewormBonk');
    K.hint(st, id, text, 1.6);
  }
  function gulp(st, id) {
    const h = st.h[id]; if (!alive(h) || st.state !== 'go') return;
    h.gulpT = S.gulpT; h.slide = false; h.vy = 0;
    st.stats.gulps++; st.jaws = Math.min(1, st.jaws + S.jaws.gulp);
    Sfx.play('cavewormGulp');
    bad(st, 'GULP! ' + NAMES[id] + ' got swallowed...');
  }
  function spit(st, id) {
    const h = st.h[id], o = st.h[1 - id];
    const x = alive(o) ? clamp(o.x - 40, st.camX + 220, st.camX + W - 80) : st.camX + 320;
    h.x = h.prevX = x; h.lane = alive(o) ? o.lane : null;
    let fl = floorAt(st, x, h.lane);
    if (fl === null) { h.x = h.prevX = x + 60; fl = floorAt(st, h.x, h.lane); if (fl === null) { for (const p of st.L.pits) if (h.x >= p.x0 && h.x < p.x1) h.x = h.prevX = p.x1 + 20; fl = 0; } }
    h.y = fl; h.vy = 0; h.ground = true; h.stunT = 0.3;
    K.ofx(st, id).slime = 3;
    Sfx.play('cavewormSpit');
    K.pop(st, scrX(st, h.x), SY(h.y) - 50, 'Ptooey!', '#c8ffd0', 18);
  }
  function deadEnd(st, id, f) {
    const h = st.h[id];
    h.lane = f.lane; h.x = h.prevX = f.E - 60; h.y = floorAt(st, h.x, h.lane); h.vy = 0; h.ground = true; h.stunT = 0.8;
    Sfx.play('cavewormDeadEndClang');
    if (!f.dead) { f.dead = true; st.stats.deadEnds++; st.jaws = Math.min(1, st.jaws + S.jaws.dead); bad(st, 'Dead end! Squeeze back through... hit the echo crystals to see the way'); }
  }
  function fellIn(st, id) {
    const h = st.h[id];
    const p = st.L.pits.find(p => h.x > p.x0 - 60 && h.x < p.x1 + 60);
    h.x = h.prevX = p ? p.x1 + 24 : h.x + 40; h.y = 0; h.vy = 0; h.ground = true; h.lane = null; h.stunT = 1;
    st.stats.falls++; st.jaws = Math.min(1, st.jaws + S.jaws.fall);
    Sfx.play('caveBoing');
    K.pop(st, scrX(st, h.x), SY(-50), 'Boing!', '#ffffff', 18);
    bad(st, NAMES[id] + ' fell in and bounced out of the mushrooms!');
  }
  function bad(st, text) {
    st.rc.bad++;
    if (text) K.msg(st, text, '#ffd0c8', 2.2);
    if (st.rc.bad >= 3 && !st.goldUsed && K.both(st)) {
      st.goldUsed = true; st.gold = true;
      K.goldHelp(st, 'Gold gems! A lure lasts twice as long, echo arrows stay up, bursts warn earlier');
    }
  }
  function jawsStep(st, dt) {
    let lag = false;
    for (const h of st.h) if (alive(h) && scrX(st, h.x) < 170) lag = true;
    if (lag && !st.inhale) st.jaws = Math.min(1, st.jaws + S.jaws.lagRate * dt);
    else st.jaws = Math.max(0, st.jaws - S.jaws.drain * dt);
  }
  function chomp(st) {
    st.state = 'chomp'; st.chompT = 0; st.stats.chomps++;
    Sfx.play('cavewormChomp');
  }
  function chompStep(st, dt) {
    st.chompT += dt;
    if (st.chompT > S.chompT) {
      const cp = st.camX + 300 > st.mid ? st.mid : 0, gold = st.gold, used = st.goldUsed, bads = st.rc.bad;
      room(st, st.k, cp);
      st.gold = gold; st.goldUsed = used; st.rc.bad = bads;
      for (let id = 0; id < 2; id++) K.ofx(st, id).slime = 3;
      K.msg(st, 'Spat out at the ' + (cp ? 'halfway crystal' : 'start of the stretch') + '. ' + st.title + '!', '#ffffff', 2.4);
    }
  }
  function stretchDone(st) {
    st.state = 'end'; st.endT = 0;
    st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('caveSting');
    K.msg(st, st.title + ' cleared! The worm is still coming...', '#bff8ef', 2);
  }

  /* ---------- the finale: Dead End ---------- */
  function finale(st) {
    st.state = 'final'; st.final = { ph: 'strike', t: 0, wormX: -260, hands: 0, look: 0, drop: 0, fling: 0 };
    st.inhale = null; st.flying = [];
    for (const h of st.h) { if (!alive(h)) { h.gulpT = 0; h.x = ENDX - 160; } h.y = 0; h.vy = 0; h.ground = true; h.slide = false; h.lane = null; }
    K.msg(st, 'A blank wall of crystal! Pathfinder, strike it!', C.gold, 2.4);
  }
  function finalStep(st, dt) {
    const F = st.final; F.t += dt;
    K.idle(st, dt, 999);
    // the heroes can shuffle along the floor in front of the wall
    for (let id = 0; id < 2; id++) {
      const h = st.h[id], i = G.players[id].input, lr = (i.right ? 1 : 0) - (i.left ? 1 : 0);
      if (F.ph === 'strike' || F.ph === 'look' || F.ph === 'chain') { h.x = clamp(h.x + lr * 120 * dt, st.camX + 420, ENDX - 30); if (lr) { h.face = lr; h.ph += dt * 10; } }
      if (h.swingT > 0) h.swingT -= dt;
    }
    const pa = id => G.players[id].pendingAct;
    if (F.ph === 'strike') {
      if (pa(st.finder) && st.h[st.finder].x > ENDX - 120) { st.h[st.finder].swingT = 0.22; Sfx.play('cavewormDeadEndClang'); K.spark(st, scrX(st, ENDX), SY(-60), 10, [K.GLOW.ice]); F.ph = 'rise'; F.t = 0; K.msg(st, 'It won\'t break...', '#ffffff', 1.6); }
    } else if (F.ph === 'rise') {
      F.wormX = K.lerp(-260, 250, K.smooth(clamp(F.t / 1.6, 0, 1)));
      if (F.t > 0.3 && !F.roared) { F.roared = true; Sfx.play('caveWormRoarNear'); G.shake = 0.6; }
      F.hands = K.smooth(clamp((F.t - 1.5) / 0.7, 0, 1));
      if (F.t > 1.6 && !F.caught) { F.caught = true; Sfx.play('cavewormGolemCatch'); G.shake = 0.5; K.msg(st, 'The golem! It caught the worm by the jaws!', '#bff8ef', 2.4); }
      if (F.t > 3) { F.ph = 'look'; F.t = 0; if (st.gemsLeft <= 0) st.gemsLeft = 1; }
    } else if (F.ph === 'look') {
      if (pa(st.lurer)) { st.gemsLeft = Math.max(0, st.gemsLeft - 1); Sfx.play('cavewormGemThrow'); F.gem = 0; F.ph = 'chain'; F.t = 0; }
    } else if (F.ph === 'chain') {
      F.look = K.smooth(clamp(F.t / 0.6, 0, 1));
      if (F.gem !== undefined) F.gem += dt;
      if (pa(st.finder) && F.t > 0.3) { st.h[st.finder].swingT = 0.22; Sfx.play('cavewormPickStrike'); F.ph = 'drop'; F.t = 0; }
    } else if (F.ph === 'drop') {
      F.drop = clamp(F.t / 0.45, 0, 1);
      if (F.t > 0.45 && !F.bonk) { F.bonk = true; Sfx.play('cavewormCrystalBonk'); K.pop(st, 250, 150, 'BONK!', '#ffffff', 26); K.spark(st, 250, 200, 20, [K.GLOW.ice, K.GLOW.teal, '#ffffff']); }
      if (F.t > 1.2) { F.ph = 'fling'; F.t = 0; Sfx.play('cavewormFling'); }
    } else if (F.ph === 'fling') {
      F.fling = K.smooth(clamp(F.t / 1.2, 0, 1));
      if (F.t > 1.6 && !F.far) { F.far = true; Sfx.play('cavewormFarBurrow'); K.msg(st, 'It\'s gone, burrowing away into the deep...', '#bff8ef', 2.6); }
      if (F.t > 3.2) { F.ph = 'palm'; F.t = 0; Sfx.play('caveGolemSigh'); }
    } else if (F.ph === 'palm') {
      if (F.t > 2.6 && !st.cleared) { st.cleared = true; st.stats.roomT[3] = G.time - st.segStart; G.level.goal = { x: W / 2, y: 300 }; levelClear(); }
    }
  }

  function mirror(st) {
    for (let id = 0; id < 2; id++) {
      const h = st.h[id];
      if (!alive(h)) { const p = G.players[id]; p.x = -200; p.y = -200; continue; }
      K.place(id, scrX(st, h.x), SY(h.y));
    }
  }

  /* ---------- the plan: what each hero should do now ---------- */
  function plan(st) {
    if (st.planN === G.tickN && st.planP) return st.planP;
    const out = { tx: [0, 0], jump: [0, 0], slide: [false, false], strike: [false, false], throwAim: [null, null], grab: [false, false], why: [null, null], fork: null, solo: false };
    st.planN = G.tickN; st.planP = out;
    if (!st.h || st.state !== 'go') return out;
    const L = st.L;
    const f = L.forks.find(f => !f.done && f.E > Math.min(st.h[0].x, st.h[1].x) - 40) || null;
    out.fork = f;
    for (let id = 0; id < 2; id++) {
      const h = st.h[id]; if (!alive(h)) continue;
      const spd = Math.max(st.v * 0.6, h.vx || st.v), finder = id === st.finder;
      let tx = st.camX + (finder ? 560 : 440);
      const ahead = (x, d) => x - h.x > -4 && x - h.x < d;
      // a fork: which lane (the true one), jump for the high one
      if (f && h.x < f.F) {
        const want = f.lane;
        out.lane = want;
        const tF = (f.F - h.x) / spd;
        if (want === 'up' && tF > 0.18 && tF < 0.42) { out.jump[id] = 'hold'; out.why[id] = 'up'; }
      }
      // gaps
      for (const p of L.pits) {
        if (p.bridged) continue;
        if (p.need && h.x < p.x0) {
          if (finder && h.x > p.x0 - 200 && h.x < p.x0 + 10) { out.strike[id] = true; out.why[id] = 'bridge'; }
          tx = Math.min(tx, p.x0 - (finder ? 30 : 90));
          continue;
        }
        const t = (p.x0 - (h.x + 12)) / spd;
        if (h.ground && t > -0.06 && t < 0.12 && h.x < p.x1) { out.jump[id] = p.x1 - p.x0 > 110 ? 'hold' : 'tap'; out.why[id] = 'gap'; }
        if (h.x > p.x0 - 20 && h.x < p.x1) tx = Math.max(tx, p.x1 + 60);
      }
      // roots
      for (const r of L.roots) { const t = (r.x0 - (h.x + 12)) / spd; if (t < 0.22 && h.x - 12 < r.x1 + 4) out.slide[id] = true; }
      // walls
      for (const w of L.walls) {
        if (w.broken || w.x < h.x - 10) continue;
        if (finder) { if (w.x - h.x < 70) { out.strike[id] = true; out.why[id] = 'wall'; } tx = Math.min(tx, w.x - 30); }
        else tx = Math.min(tx, w.x - 90);
      }
      // echo crystals
      if (finder) for (const e of L.echos) if (e.struck < 0 && h.x > e.x - 80 && h.x < e.x + 20) { out.strike[id] = true; out.why[id] = 'echo'; }
      // body crossings: go through when the gap is long enough, else hang back
      for (const c of L.crosses) {
        if (h.x - 12 > c.x1) continue;
        const d = c.x0 - (h.x + 12);
        if (d > 220) continue;
        const fast = st.v + S.run, ta = Math.max(0, d) / fast, need = (c.x1 - c.x0 + 30) / fast + 0.08;
        let ok = true;
        for (let u = ta; u < ta + need; u += 0.03) if (plateAt(c, st.T + u)) { ok = false; break; }
        if (d < 4 && !plateAt(c, st.T)) ok = true;
        tx = ok ? Math.max(tx, c.x1 + 80) : Math.min(tx, c.x0 - 85);
        if (!ok) out.why[id] = 'cross';
      }
      // bursts: hold back until it is lured away, and the lurer throws
      for (const b of L.bursts) {
        if (b.ph !== 'tell' && b.ph !== 'out') continue;
        if (b.x < h.x - 60) continue;
        if (b.lured <= 0.3) { tx = Math.min(tx, b.x - 170); out.why[id] = 'burst'; if (id === st.lurer) out.throwAim[id] = 'fwd'; }
        else if (b.lured > 0.3) tx = Math.max(tx, b.x + 120);
      }
      // collapses
      for (const d of L.drops) {
        if (d.ph !== 'tell' && d.ph !== 'fall') continue;
        const tIn = d.ph === 'tell' ? 1.1 - d.t + 0.28 : 0.28 - d.t;
        if (tIn < -0.05) continue;
        if (h.x < d.x + 45) {
          // past it before it lands, or wait for it to come down
          const pass = h.x + (st.v + S.run) * tIn > d.x + 55, wait = h.x + (st.v - S.run) * tIn < d.x - 45;
          if (pass || !wait) tx = Math.max(tx, d.x + 100);
          else { tx = Math.min(tx, d.x - 80); out.why[id] = 'drop'; }
        }
      }
      // the inhale: run against it, grab a root
      if (st.inhale) {
        tx = st.camX + W;
        if (st.inhale.item.anchors.some(a => Math.abs(a - h.x) < 30) && h.ground) out.grab[id] = true;
        if (id === st.lurer && st.gemsLeft > 0 && st.inhale.cough === undefined) out.throwAim[id] = 'fwd';
      }
      // satchel gems up high: a hop
      for (const g of L.gems) {
        const gl = forkAt(st, g.x) ? (g.y < S.band ? 'up' : 'low') : null, gf = floorAt(st, g.x, gl);
        if (g.got || gf === null || g.y > gf - 55) continue;
        const t = (g.x - h.x) / spd;
        if (t > 0.27 && t < 0.37 && h.ground && !out.slide[id] && !out.jump[id] && !(f && h.x < f.F && f.F - h.x < 260 && f.lane === 'low')) { const lane = forkAt(st, g.x) ? 'up' : null; if (lane === h.lane || !forkAt(st, g.x)) { out.jump[id] = 'tap'; out.why[id] = 'gem'; } }
      }
      // the worm behind: never lag
      if (h.lane) tx = Math.max(tx, h.x + 30); // never back out of a tunnel
      const back = out.why[id] === 'drop' || out.why[id] === 'cross' ? 150 : 230;
      tx = Math.max(tx, st.camX + back);
      out.tx[id] = clamp(tx, st.camX + back, st.camX + W - 60);
    }
    // the lurer at a fork: throw where it lands in the other tunnel
    const lid = st.lurer, lh = st.h[lid];
    if (f && alive(lh) && lh.ground && lh.x < f.F && f.lure !== (f.lane === 'up' ? 'low' : 'up')) {
      const other = f.lane === 'up' ? 'low' : 'up';
      out.wantLure = other;
      for (const aim of ['up', 'fwd', 'low']) {
        const q = predict(st, lh.x + 8, lh.y - 24, lh.lane, aim);
        if (!q.lost && q.lane === other && q.x > f.F + 20 && q.x < f.E - 80) { out.throwAim[lid] = aim; out.forkThrow = true; break; }
      }
    }
    // a seam in reach: a high throw
    if (alive(lh) && st.gemsLeft > 1) for (const s of L.seams) {
      if (s.fed || s.used || s.x < lh.x) continue;
      if (s.x - lh.x > 420) continue;
      const q = predict(st, lh.x + 8, lh.y - 24, lh.lane, 'up', s);
      if (q.near < 34) { out.throwAim[lid] = 'up'; out.seamThrow = true; }
    }
    // keep one gem for the next fork, when there is no cluster on the way
    if (out.throwAim[lid] && !out.forkThrow && st.gemsLeft <= 1) {
      const nf = L.forks.find(f2 => !f2.done && f2.F > lh.x), ncl = L.cls.find(c => !c.used && c.x > lh.x);
      if (nf && (!ncl || ncl.x > nf.F) && !st.inhale && !L.bursts.some(b => b.ph === 'out' && b.lured <= 0.3 && b.x - lh.x < 400)) out.throwAim[lid] = null;
    }
    return out;
  }

  /* ---------- drawing ---------- */
  function draw(st) {
    const t = st.clock, cx = st.camX;
    K.back(cx, 0, t, { zone: st.k < 2 ? 'crystal' : 'deep', par: 0.3, bright: 0.85 });
    // its body looping through the rock far behind
    for (let n = 0; n < 9; n++) {
      const u = n / 8, x = ((n * 140 - cx * 0.35 + t * 60) % (W + 600) + W + 600) % (W + 600) - 300, y = 140 + Math.sin(u * 5 + t * 0.6) * 40;
      ctx.globalAlpha = 0.45; K.wormSeg(x, y, 34, Math.cos(u * 5 + t * 0.6) * 0.5, { seed: n, glow: 0.3 }); ctx.globalAlpha = 1;
    }
    drawTunnel(st, t);
    drawItems(st, t);
    drawHeroes(st, t);
    drawWorm(st, t);
    K.drawGlitter(st, cx, 0);
    if (st.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + st.flash + ')'; ctx.fillRect(0, 0, W, H); }
  }
  // the tunnel: the rock roof and floor, gaps, forks
  function drawTunnel(st, t) {
    const L = st.L, cx = st.camX, x0 = cx - 40, x1 = cx + W + 40;
    // the roof: layered rock with crystals growing out of it
    const rg = ctx.createLinearGradient(0, 0, 0, SY(S.roof));
    rg.addColorStop(0, '#1e242c'); rg.addColorStop(0.7, '#323a46'); rg.addColorStop(1, '#465060');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, SY(S.roof));
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let k = 0; k < 4; k++) { const yy = 40 + k * 38, off = ((cx * 0.9 + k * 97) % 300); ctx.beginPath(); ctx.moveTo(-off, yy); for (let xx = -off; xx < W + 300; xx += 60) ctx.lineTo(xx, yy + Math.sin((xx + cx * 0.9) * 0.02 + k) * 8); ctx.lineTo(W + 300, yy + 10); ctx.lineTo(-off, yy + 10); ctx.closePath(); ctx.fill(); }
    for (let i = Math.floor(x0 / 230); i * 230 < x1; i++) {
      const hs = K.hash(i * 7 + 3), sx = scrX(st, i * 230 + hs * 120);
      if (hs > 0.35) K.cluster(sx, SY(S.roof) + 2, 0.8 + hs * 0.7, i, { t, glow: 0.7, lean: Math.PI });
      if (K.hash(i * 13) > 0.6) K.crystal(sx + 60, SY(S.roof) - 60 - hs * 60, 26 + hs * 20, 0.4 - hs, { col: K.GLOWS[i % K.GLOWS.length], glow: 0.5, t, seed: i });
    }
    ctx.fillStyle = '#4a5464'; ctx.fillRect(0, SY(S.roof) - 10, W, 10);
    K.stalactites(-((cx) % 160) - 160, W + 160, SY(S.roof), { seed: Math.floor(cx / 160), len: 34, col: '#4a5464', t });
    K.glowWorms(-((cx * 1) % 220), W + 220, SY(S.roof) - 4, t, { seed: Math.floor(cx / 220) * 7, n: 10 });
    // the floor in pieces: plain ground, gaps, forks
    const cuts = [];
    for (const p of L.pits) if (p.x1 > x0 && p.x0 < x1) cuts.push([p.x0, p.x1, p]);
    for (const b of L.backs) if (b.x1 > x0 && b.x0 < x1) cuts.push([b.x0, b.x1, null, b]);
    for (const f of L.forks) if (f.E > x0 && f.F < x1) cuts.push([f.F, f.E, null, null, f]);
    cuts.sort((a, b) => a[0] - b[0]);
    let x = x0;
    const ground = (a, b, y) => {
      if (b <= a) return;
      const sa = scrX(st, a), sb = scrX(st, b);
      ctx.fillStyle = '#4a4440'; ctx.fillRect(sa, SY(y), sb - sa, H - SY(y));
      ctx.fillStyle = '#6a625a'; ctx.fillRect(sa, SY(y), sb - sa, 8);
      ctx.fillStyle = 'rgba(79,232,214,0.35)'; ctx.fillRect(sa, SY(y), sb - sa, 2);
    };
    for (const c of cuts) {
      ground(x, Math.min(c[0], x1), 0);
      if (c[2]) { // a gap: glow-mushrooms far below, and a bridge if it has dropped
        const p = c[2], sa = scrX(st, p.x0), sb = scrX(st, p.x1);
        ctx.fillStyle = '#16202a'; ctx.fillRect(sa, SY(0), sb - sa, H);
        K.mushrooms(sa + 4, sb - 4, H + 10, t, { seed: p.x0, s: 0.7 });
        if (p.need) {
          const u = p.bridged ? clamp(p.fallT / 0.4, 0, 1) : 0;
          if (p.need === 'stal') { // a big stalactite over the gap, struck down to lie across it
            const mx = (sa + sb) / 2;
            ctx.save(); ctx.translate(mx, K.lerp(SY(S.roof) + 4, SY(0) - 6, u)); ctx.rotate(-Math.PI / 2 * u);
            ctx.fillStyle = '#9ad8e0'; ctx.strokeStyle = '#3a6a70'; ctx.lineWidth = 2;
            const len = (p.x1 - p.x0) / 2 + 30;
            ctx.beginPath(); ctx.moveTo(-26, -len * (1 - u) * 0.1); ctx.lineTo(26, 0); ctx.lineTo(0, u ? len * 0.4 : 150); ctx.closePath();
            ctx.restore();
            if (u > 0) { ctx.fillStyle = '#7ab8c0'; rr(sa - 10, SY(0) - 8 + (1 - u) * -200, sb - sa + 20, 16, 6); ctx.fill(); ctx.strokeStyle = '#3a6a70'; ctx.lineWidth = 2; ctx.stroke(); for (let k = 0; k < 4; k++) K.crystal(sa + 20 + k * (sb - sa - 40) / 3, SY(0) - 6 + (1 - u) * -200, 18, (k - 1.5) * 0.3, { col: K.GLOW.ice, glow: 0.5, seed: k }); }
            else { ctx.save(); ctx.translate(mx, SY(S.roof)); K.crystal(0, 0, 150, Math.PI, { col: K.GLOW.ice, w: 52, glow: 0.6, t, seed: 3 }); ctx.restore(); }
          } else { // an old mine timber ramp hung on a rope: cut the rope and it swings down across
            const ax = sb + 10, ay = SY(0);
            const len = sb - sa + 20, a = K.lerp(-Math.PI / 2 - 0.25, -Math.PI, u);
            ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
            ctx.fillStyle = K.COL.timber; ctx.fillRect(0, -8, len, 16); ctx.strokeStyle = K.COL.timberDark; ctx.lineWidth = 2; ctx.strokeRect(0, -8, len, 16);
            for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(k * len / 5, -8); ctx.lineTo(k * len / 5, 8); ctx.stroke(); }
            ctx.restore();
            if (!p.bridged) { const ex = ax + Math.cos(a) * len, ey = ay + Math.sin(a) * len; ctx.strokeStyle = '#c8b080'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 20, SY(S.roof)); ctx.stroke(); }
          }
        }
      } else if (c[3]) { // the worm's own back as a bridge
        const b = c[3], sa = scrX(st, b.x0), sb = scrX(st, b.x1);
        ctx.fillStyle = '#16202a'; ctx.fillRect(sa, SY(0), sb - sa, H);
        for (let k = 0; k * 46 < sb - sa + 60; k++) { const xx = sa - 20 + k * 46 + ((t * 70) % 46), yy = SY(0) + 30 + Math.sin(st.T * 2.4 + (xx + st.camX) * 0.01) * 6; K.wormSeg(xx, yy, 32, Math.PI / 2, { seed: k, glow: 0.6 }); }
      } else if (c[4]) drawFork(st, c[4], t, ground);
      x = Math.max(x, c[1]);
    }
    ground(x, x1, 0);
    for (let i = Math.floor(x0 / 170); i * 170 < x1; i++) {
      const hs = K.hash(i * 5 + 1), wx = i * 170 + hs * 90;
      if (hs < 0.5 || floorAt(st, wx, null) !== 0 || forkAt(st, wx)) continue;
      K.crystal(scrX(st, wx), SY(0) + 4, 16 + hs * 22, (hs - 0.75) * 1.2, { col: K.GLOWS[(i * 3) % K.GLOWS.length], glow: 0.6, t, seed: i });
    }
    // walls (crystal)
    for (const w of L.walls) {
      if (w.broken) continue;
      const sx = scrX(st, w.x); if (sx < -60 || sx > W + 60) continue;
      ctx.fillStyle = w.flash > 0 ? '#ffffff' : 'rgba(170,236,240,0.85)'; ctx.strokeStyle = '#3a8a90'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx - 16, SY(0)); ctx.lineTo(sx - 12, SY(S.roof)); ctx.lineTo(sx + 14, SY(S.roof)); ctx.lineTo(sx + 16, SY(0)); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (w.hits) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx - 10, SY(-140)); ctx.lineTo(sx + 4, SY(-90)); ctx.lineTo(sx - 6, SY(-50)); ctx.lineTo(sx + 8, SY(-10)); ctx.stroke(); }
      for (let k = 0; k < 3; k++) K.crystal(sx - 8 + k * 8, SY(0), 30 + k * 10, (k - 1) * 0.3, { col: K.GLOW.ice, glow: 0.5, seed: k + w.x });
    }
  }
  function drawFork(st, f, t, ground) {
    const sa = scrX(st, f.F), sb = scrX(st, f.E);
    // the low tunnel's floor (ramps in and out), the rock band between the two tunnels, the dead-end wall
    ctx.fillStyle = '#4a4440';
    ctx.beginPath(); ctx.moveTo(sa, SY(0)); ctx.lineTo(sa + 50, SY(S.lowF)); ctx.lineTo(sb - S.ramp, SY(S.lowF)); ctx.lineTo(sb, SY(0)); ctx.lineTo(sb, H); ctx.lineTo(sa, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6a625a'; ctx.beginPath(); ctx.moveTo(sa, SY(0)); ctx.lineTo(sa + 50, SY(S.lowF)); ctx.lineTo(sb - S.ramp, SY(S.lowF)); ctx.lineTo(sb, SY(0)); ctx.lineTo(sb, SY(0) + 8); ctx.lineTo(sb - S.ramp, SY(S.lowF) + 8); ctx.lineTo(sa + 50, SY(S.lowF) + 8); ctx.lineTo(sa, SY(0) + 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4e4844'; rr(sa, SY(S.upF), sb - sa, S.band - S.upF, 8); ctx.fill();
    ctx.fillStyle = '#7a7068'; ctx.fillRect(sa + 4, SY(S.upF), sb - sa - 8, 7);
    ctx.fillStyle = 'rgba(79,232,214,0.4)'; ctx.fillRect(sa + 4, SY(S.upF), sb - sa - 8, 2);
    // the dead end: a blank wall of crystal across the false tunnel
    const dy0 = f.lane === 'up' ? S.band : S.roof, dy1 = f.lane === 'up' ? S.lowF : S.upF;
    ctx.fillStyle = 'rgba(150,200,210,0.85)'; ctx.fillRect(sb - 40, SY(dy0), 40, SY(dy1) - SY(dy0));
    ctx.strokeStyle = '#3a6a70'; ctx.lineWidth = 2; ctx.strokeRect(sb - 40, SY(dy0), 40, SY(dy1) - SY(dy0));
    // the echo arrow over the true tunnel's mouth (2 s, or until the fork with gold help)
    const e = st.L.echos.find(e => e.fork === f);
    if (e && e.struck >= 0 && (st.T - e.struck < S.echoT || st.gold) && !f.done) {
      const ay = f.lane === 'up' ? SY(S.upF - 60) : SY(S.lowF - 45), ax = sa + 60, a = 0.6 + 0.4 * Math.sin(t * 10);
      ctx.fillStyle = 'rgba(255,240,170,' + a + ')'; ctx.strokeStyle = '#7a5a10'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax - 30, ay - 10); ctx.lineTo(ax + 10, ay - 10); ctx.lineTo(ax + 10, ay - 22); ctx.lineTo(ax + 36, ay); ctx.lineTo(ax + 10, ay + 22); ctx.lineTo(ax + 10, ay + 10); ctx.lineTo(ax - 30, ay + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // a lure glow down a tunnel
    if (f.lure && !f.done) { const ly = f.lane === f.lure ? 0 : 0; ctx.fillStyle = 'rgba(79,232,214,0.12)'; ctx.fillRect(sa + 40, f.lure === 'up' ? SY(S.roof) : SY(S.band), sb - sa - 80, f.lure === 'up' ? S.upF - S.roof : S.lowF - S.band + ly); }
  }
  function drawItems(st, t) {
    const L = st.L;
    const on = x => { const s = scrX(st, x); return s > -120 && s < W + 120; };
    for (const r of L.roots) if (on(r.x0)) {
      const sa = scrX(st, r.x0), sb = scrX(st, r.x1);
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      for (let k = 0; k < 4; k++) { const xx = sa + k * (sb - sa) / 3; ctx.beginPath(); ctx.moveTo(xx, SY(S.roof)); ctx.quadraticCurveTo(xx + 10 * Math.sin(t * 2 + k), SY(-100), xx + 4, SY(-22)); ctx.stroke(); }
      ctx.lineWidth = 3; ctx.strokeStyle = '#86ec7a'; ctx.beginPath(); ctx.moveTo(sa - 4, SY(-24)); ctx.lineTo(sb + 4, SY(-24)); ctx.stroke(); ctx.lineCap = 'butt';
    }
    for (const e of L.echos) if (on(e.x)) {
      const sx = scrX(st, e.x);
      K.crystal(sx, SY(0), 90, 0.05, { col: K.GLOW.ice, w: 34, glow: 0.6 + 0.4 * Math.max(0, e.ring), t, ring: Math.max(0, e.ring), seed: 9 });
      if (e.struck < 0 && Math.sin(t * 6) > 0) text('♪', sx, SY(-110), 18, '#dff6ff', 'center', 'body');
    }
    for (const c of L.crosses) if (on(c.x0)) {
      const sa = scrX(st, c.x0), mid = (sa + scrX(st, c.x1)) / 2;
      // a loop of its body sliding down across the tunnel
      for (let k = -2; k < 6; k++) {
        const ph = (st.T / CROSS_P + c.off) % 1, y = SY(S.roof) + (k + ph) * (SY(0) - SY(S.roof)) / 3.2 * 1.25 - 40;
        const plate = ((st.T / CROSS_P + c.off - (k * 0)) % 1) < CROSS_ON / CROSS_P;
        if (y < SY(S.roof) - 30 || y > SY(0) + 30) continue;
        if (plate) K.wormSeg(mid, y, 34, 0, { seed: k, glow: 0.6 });
      }
      if (plateAt(c, st.T)) { ctx.fillStyle = 'rgba(58,52,48,0.9)'; rr(sa, SY(S.roof), scrX(st, c.x1) - sa, -S.roof, 18); ctx.fill(); for (let k = 0; k < 4; k++) K.wormSeg(mid, SY(S.roof) + 25 + k * 50 + ((st.T * 200) % 50), 34, 0, { seed: k, glow: 0.6 }); }
      else { ctx.strokeStyle = 'rgba(255,210,90,0.5)'; ctx.setLineDash([6, 6]); ctx.strokeRect(sa, SY(S.roof), scrX(st, c.x1) - sa, -S.roof); ctx.setLineDash([]); }
    }
    for (const d of L.drops) if (on(d.x) && d.ph !== 'wait' && d.ph !== 'gone') {
      const sx = scrX(st, d.x);
      if (d.ph === 'tell') { ctx.strokeStyle = 'rgba(220,210,190,' + (0.4 + 0.4 * Math.sin(t * 20)) + ')'; ctx.lineWidth = 2; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(sx + k * 14, SY(S.roof)); ctx.lineTo(sx + k * 14, SY(0)); ctx.stroke(); } }
      if (d.ph === 'fall') { const y = K.lerp(SY(S.roof), SY(0) - 20, clamp(d.t / 0.28, 0, 1)); K.rock(sx - 30, y - 30, 60, 46, { col: '#6a6460', seed: d.x }); }
      if (d.ph === 'rubble') K.rock(sx - 34, SY(0) - 20, 68, 22, { col: '#5a5450', seed: d.x });
    }
    for (const s of L.seams) if (on(s.x)) {
      const sx = scrX(st, s.x), y = SY(-150);
      if (!s.open) { ctx.strokeStyle = s.fed ? '#ffffff' : 'rgba(255,210,90,' + (0.6 + 0.3 * Math.sin(t * 5)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - 30, y - 20); ctx.lineTo(sx - 10, y + 6); ctx.lineTo(sx + 6, y - 12); ctx.lineTo(sx + 30, y + 14); ctx.stroke(); K.cluster(sx, y - 6, 0.8, 5, { col: K.GLOW.gold, t, glow: 0.8 }); text('▲', sx, y + 34, 14, C.gold, 'center', 'body'); }
      else { ctx.fillStyle = '#14100e'; ctx.beginPath(); ctx.ellipse(sx + 20, SY(-60), 50, 60, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ffd25a'; ctx.lineWidth = 2; ctx.stroke(); text('shortcut', sx + 20, SY(-130), 13, '#ffd25a', 'center', 'body'); }
    }
    for (const it of L.inhales) if (on(it.x) || it.anchors.some(on)) for (const a of it.anchors) {
      if (!on(a)) continue;
      const sx = scrX(st, a);
      ctx.strokeStyle = '#7a5a30'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(sx, SY(S.roof)); ctx.quadraticCurveTo(sx + 8, SY(-120), sx, SY(-40)); ctx.stroke();
      ctx.fillStyle = '#86ec7a'; circle(sx, SY(-40), 5); ctx.fill();
    }
    for (const c of L.cls) if (!c.used && on(c.x)) K.cluster(scrX(st, c.x), SY(0), 1, 11, { col: K.GLOW.teal, t, glow: 1 });
    for (const g of L.gems) if (!g.got && on(g.x)) K.gem(scrX(st, g.x), SY(g.y), 9, t, {});
    // bursts: the floor bulges and glows, pebbles hop; then the head
    for (const b of L.bursts) if (on(b.x)) {
      const sx = scrX(st, b.x);
      if (b.ph === 'tell') {
        const u = b.t / (S.burstTell + (st.gold ? S.goldTell : 0));
        ctx.fillStyle = 'rgba(255,140,80,' + (0.3 + 0.4 * u) + ')'; ctx.beginPath(); ctx.ellipse(sx, SY(0), 70 + 20 * u, 10 + 16 * u, 0, Math.PI, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,220,150,' + (0.5 + 0.5 * Math.sin(t * 30)) + ')'; ctx.lineWidth = 2;
        for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(sx + k * 20, SY(0)); ctx.lineTo(sx + k * 26, SY(0) + 14); ctx.stroke(); }
        for (let k = 0; k < 5; k++) { ctx.fillStyle = '#8a8078'; circle(sx - 40 + k * 20, SY(0) - 4 - Math.abs(Math.sin(t * 16 + k)) * 16 * u, 3); ctx.fill(); }
        text('!', sx, SY(-80), 30, '#ffb48a', 'center', 'body');
      } else if (b.ph === 'out') {
        const p = burstPos(st, b);
        // the neck down into the floor, then the head
        for (let k = 3; k >= 0; k--) K.wormSeg(sx + (scrX(st, p.x) - sx) * k / 4, SY(0) + 60 - (SY(0) + 60 - SY(p.y)) * k / 4, 50, 0, { seed: k, glow: 0.6 });
        K.wormHead(scrX(st, p.x), SY(p.y), 80, t, { open: b.lured > 0 ? 0.4 : 0.9, ang: b.lured > 0 ? -Math.PI / 2 + b.side * 0.6 : -Math.PI, spin: 2 });
      }
    }
    // gems in flight, and gems glowing where they landed
    for (const g of st.flying) K.gem(scrX(st, g.x), SY(g.y), 7, t, { col: g.gold ? K.GLOW.gold : K.GLOW.teal });
    for (const g of st.landed) { const a = 1 - g.t / (g.gold ? S.lureT * 2 : S.lureT); ctx.globalAlpha = clamp(a * 2, 0, 1); K.gem(scrX(st, g.x), SY(g.y) - 8, 7, t, { col: g.gold ? K.GLOW.gold : K.GLOW.teal }); ctx.fillStyle = K.rgba(g.gold ? K.GLOW.gold : K.GLOW.teal, 0.2 * a); circle(scrX(st, g.x), SY(g.y) - 8, 40); ctx.fill(); ctx.globalAlpha = 1; }
  }
  function drawWorm(st, t) {
    const F = st.final;
    if (F) return drawFinal(st, t);
    const hx = headX(st) + (st.burstIn >= 0 ? 0 : 0), hy = 300, open = st.inhale ? 1 : 0.55 + 0.35 * st.jaws, spin = 1 + st.jaws * 3;
    // its body trailing off to the left, and the crack it burst from (stretch 1 start)
    if (st.burstIn >= 0) {
      const u = clamp(st.burstIn / 0.6, 0, 1);
      ctx.fillStyle = 'rgba(255,240,200,' + (1 - u) * 0.8 + ')'; ctx.fillRect(0, 0, W, H);
      if (st.burstIn < 1) for (let k = 0; k < 3; k++) K.spark(st, 80 + Math.random() * 120, 200 + Math.random() * 200, 2, [K.GLOW.teal, K.GLOW.ice]);
    }
    for (let k = 1; k < 4; k++) K.wormSeg(hx - 120 - k * 70, hy + Math.sin(t * 3 + k) * 14, S.headR * (0.9 - k * 0.05), Math.PI / 2, { seed: k, glow: 0.5 });
    K.wormHead(hx, hy, S.headR, t, { open, spin, cough: st.inhale && st.inhale.cough !== undefined });
    if (st.inhale) { ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; for (let k = 0; k < 8; k++) { const y = 220 + k * 24, x = W - ((t * 600 + k * 130) % W); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 50, y); ctx.stroke(); } }
    // the gulped: a beat of darkness with two blinking eyes, over where the head is
    for (let id = 0; id < 2; id++) {
      const h = st.h[id]; if (alive(h)) continue;
      const bx = clamp(hx + 20, 60, 300), by = 230 + id * 60;
      ctx.fillStyle = 'rgba(10,6,8,0.85)'; rr(bx - 46, by - 24, 92, 48, 20); ctx.fill();
      if (Math.sin(h.gulpT * 14) > -0.6) { ctx.fillStyle = '#ffffff'; circle(bx - 10, by, 5); ctx.fill(); circle(bx + 10, by, 5); ctx.fill(); ctx.fillStyle = PCOL[id]; circle(bx - 10, by, 2.4); ctx.fill(); circle(bx + 10, by, 2.4); ctx.fill(); }
    }
    if (st.state === 'chomp') {
      const u = K.smooth(clamp(st.chompT / 0.7, 0, 1));
      ctx.fillStyle = '#140808';
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.ellipse(W / 2, H / 2, W * 0.8 * (1 - u) + 1, H * 0.8 * (1 - u) + 1, 0, 0, TAU, true); ctx.fill();
      for (let k = 0; k < 18; k++) { const a = k / 18 * TAU + t, r = (1 - u) * 400 + 40; ctx.fillStyle = '#dff6ff'; ctx.save(); ctx.translate(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r * 0.6); ctx.rotate(a + Math.PI); ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(40, 0); ctx.lineTo(0, 12); ctx.closePath(); ctx.fill(); ctx.restore(); }
      if (st.chompT > 0.6) text('CHOMP!', W / 2, H / 2, 54, '#ffb48a', 'center', 'title');
    }
  }
  function drawFinal(st, t) {
    const F = st.final, ex = scrX(st, ENDX);
    // the blank wall at the end
    const wg = ctx.createLinearGradient(ex, 0, W, 0); wg.addColorStop(0, '#bfeef2'); wg.addColorStop(0.4, '#7fc8d2'); wg.addColorStop(1, '#4a8a96');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(ex + 6, SY(S.roof) - 10); ctx.lineTo(ex - 12, SY(-120)); ctx.lineTo(ex + 4, SY(-60)); ctx.lineTo(ex - 8, SY(0) + 4); ctx.lineTo(W + 10, SY(0) + 4); ctx.lineTo(W + 10, SY(S.roof) - 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(ex + 10 + k * 40, SY(S.roof)); ctx.lineTo(ex + 30 + k * 34, SY(-100) + (k % 2) * 30); ctx.lineTo(ex + 6 + k * 44, SY(0)); ctx.stroke(); }
    for (let k = 0; k < 6; k++) K.crystal(ex + 10 + k * 14, SY(0), 60 + (k % 3) * 30, (k - 3) * 0.12, { col: K.GLOW.ice, glow: 0.6, t, seed: k });
    // the worm rising behind; the golem's hands catching it; the big crystal above on its chain
    const wx = F.wormX - F.fling * 700, wy = 290 - F.look * 60 + F.fling * 260;
    for (let k = 1; k < 4; k++) K.wormSeg(wx - 120 - k * 70, wy + 40 + k * 20, S.headR * 0.85, Math.PI / 2, { seed: k });
    K.wormHead(wx, wy, S.headR * 0.95, t, { open: F.ph === 'rise' ? 1 : 0.7, ang: -F.look * 0.6, spin: F.bonk ? 0.3 : 2 });
    if (F.hands > 0) {
      K.golemHand(wx - 40, -60 + F.hands * 150 + F.fling * 260, 1.2, t, { ang: Math.PI / 2, open: 1 - F.hands * 0.7, calm: 1 });
      K.golemHand(wx - 40, H + 60 - F.hands * 150 + F.fling * 260, 1.2, t, { ang: -Math.PI / 2, open: 1 - F.hands * 0.7, calm: 1, flip: true });
    }
    if (F.ph !== 'palm' && F.ph !== 'fling' || F.t < 0.2) {
      const cy = K.lerp(110, wy - 120, F.drop);
      if (!F.drop) { ctx.strokeStyle = '#b8b0a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(250, 0); ctx.lineTo(250, cy - 40); ctx.stroke(); }
      if (!F.bonk) K.crystal(250, cy - 46, 90, Math.PI, { col: K.GLOW.ice, w: 50, glow: 0.8, t, seed: 4 });
    }
    if (F.gem !== undefined && F.gem < 0.5) K.gem(K.lerp(scrX(st, st.h[st.lurer].x), 250, F.gem / 0.5), K.lerp(SY(-30), 110, F.gem / 0.5), 8, t, {});
    if (F.ph === 'palm') {
      const u = K.smooth(clamp(F.t / 1.2, 0, 1));
      K.golemHand(W / 2 - 120, H + 80 - u * 120, 1.6, t, { ang: -Math.PI / 2, open: 1, calm: 1 });
      K.golemFace(W / 2 - 80, 80 + (1 - u) * -200, 1.3, t, { calm: 1 });
    }
  }
  function drawHeroes(st, t) {
    for (let id = 0; id < 2; id++) {
      const h = st.h[id]; if (!alive(h)) continue;
      const x = scrX(st, h.x), y = SY(h.y), sy = h.slide ? 0.6 : 1, rot = h.slide ? -0.25 * h.face : (h.grab ? -0.3 : 0);
      K.hero(id, x, y, { face: h.face, sy, rot, stun: h.stunT > 0, vy: h.ground ? 0 : h.vy });
      const hx = x + h.face * 12, hy = y - 20;
      if (id === st.lurer) {
        // the bandolier of glow gems across the chest: shows how many are left
        for (let k = 0; k < S.gemMax; k++) { const u = (k - 2) / 4; ctx.fillStyle = k < st.gemsLeft ? (st.gold ? K.GLOW.gold : K.GLOW.teal) : 'rgba(40,40,50,0.6)'; circle(x - 7 + k * 3.5, y - 22 + u * 8 * h.face, 2); ctx.fill(); }
      } else {
        // the pickaxe, swung on a strike
        const a = h.swingT > 0 ? -2.2 + (0.22 - h.swingT) * 12 : -0.6;
        ctx.save(); ctx.translate(hx, hy); ctx.scale(h.face, 1); ctx.rotate(a + Math.PI / 2);
        ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20); ctx.stroke();
        ctx.strokeStyle = '#c8d0d8'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-9, -18); ctx.quadraticCurveTo(0, -24, 9, -18); ctx.stroke();
        ctx.restore();
      }
      if (h.grab) { ctx.strokeStyle = '#86ec7a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 18, 22, 0, TAU); ctx.stroke(); }
    }
    if (st.final && st.final.ph === 'palm') { /* (they stand on the palm in the last beat) */ }
  }
  function drawTop(st) { K.drawParts(st, 0); K.drawPops(st, 0, 0); }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '◆ ' + st.gems + ' / ' + S.gems;
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, '#bff8ef', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    K.drawMabel(st);
    if (!play || !st.h) return;
    // the Jaws meter, with a ring of teeth
    {
      const w = 200 * z, hh2 = 12 * z, x = W / 2 - w / 2 + 14 * z, y = H - 40 * z;
      ctx.fillStyle = 'rgba(23,25,29,0.8)'; rr(x - 44 * z, y - 24 * z, w + 60 * z, 48 * z, 12 * z); ctx.fill();
      const cx = x - 24 * z, cy = y + hh2 / 2;
      ctx.fillStyle = '#3a1418'; circle(cx, cy, 13 * z); ctx.fill();
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + st.clock * (1 + st.jaws * 4); ctx.fillStyle = '#dff6ff'; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 13 * z, cy + Math.sin(a) * 13 * z); ctx.lineTo(cx + Math.cos(a + 0.2) * 6 * z, cy + Math.sin(a + 0.2) * 6 * z); ctx.lineTo(cx + Math.cos(a + 0.4) * 13 * z, cy + Math.sin(a + 0.4) * 13 * z); ctx.fill(); }
      text('Jaws', x, y - 9 * z, 11 * z, '#ffffff', 'left', 'body');
      K.meter(x, y, w, hh2, st.jaws, st.jaws > 0.66 ? '#ff7a5a' : st.jaws > 0.33 ? '#ffb35a' : '#4fe8d6');
    }
    const pl = plan(st);
    for (let id = 0; id < 2; id++) {
      const lurer = id === st.lurer, bx = K.panel(id, lurer ? 'lurer' : 'pathfinder', 210, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      const kk = what => (K.quiet(id) ? '' : K.key(id, what) + ' ');
      const lit = lurer ? !!pl.throwAim[id] : pl.strike[id];
      K.chip(x0, cy, cw, chh, kk('act') + (lurer ? 'THROW ' + st.gemsLeft : 'STRIKE'), lit, false, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk('down') + 'SLIDE', pl.slide[id], st.h[id].slide, z);
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) { if (st.state === 'final') finalPrompts(st); return; }
    const P = K.prompter(st);
    for (let id = 0; id < 2; id++) {
      const h = st.h[id]; if (!alive(h)) continue;
      const x = scrX(st, h.x), y = SY(h.y) - 48;
      let s = null, pulse = false;
      const aim = pl.throwAim[id];
      if (pl.slide[id] && !h.slide) { s = 'Slide ' + K.key(id, 'down'); pulse = true; }
      else if (pl.jump[id] && pl.why[id] === 'gap') { s = 'Jump ' + K.key(id, 'jump'); pulse = true; }
      else if (pl.grab[id] && !h.grab) { s = 'Grab the root! Hold ' + K.key(id, 'act'); pulse = true; }
      else if (st.inhale) s = 'Run! Hold ' + K.key(id, 'right');
      else if (aim) { s = 'Throw ' + (aim === 'up' ? K.key(id, 'jump') + ' + ' : aim === 'low' ? K.key(id, 'down') + ' + ' : '') + K.key(id, 'act') + (pl.forkThrow ? ' down the other tunnel' : pl.seamThrow ? ' at the seam' : ''); pulse = true; }
      else if (pl.strike[id]) { s = (pl.why[id] === 'echo' ? 'Ring the echo crystal ' : pl.why[id] === 'bridge' ? 'Knock it down for a bridge ' : 'Smash the wall ') + K.key(id, 'act'); pulse = true; }
      else if (pl.jump[id] && pl.why[id] === 'up') { s = 'Jump up! ' + K.key(id, 'jump'); pulse = true; }
      else if (pl.why[id] === 'burst') s = 'Wait! It\'s coming through';
      else if (pl.why[id] === 'cross') s = 'Wait for a gap...';
      P.say(id, s, x, y, C.gold, pulse);
    }
  }
  function finalPrompts(st) {
    const F = st.final, P = K.prompter(st);
    for (let id = 0; id < 2; id++) {
      const h = st.h[id], x = scrX(st, h.x), y = SY(h.y) - 48;
      let s = null;
      if (F.ph === 'strike' && id === st.finder) s = (h.x > ENDX - 120 ? 'Strike the wall ' : 'To the wall ') + K.key(id, h.x > ENDX - 120 ? 'act' : 'right');
      if (F.ph === 'look' && id === st.lurer) s = 'Throw the last gem up! ' + K.key(id, 'act');
      if (F.ph === 'chain' && id === st.finder) s = 'Strike the chain! ' + K.key(id, 'act');
      P.say(id, s, x, y, C.gold, true);
    }
  }

  MODES.caveworm = {
    S, STRETCH, plan, predict, floorAt, ceilAt, forkAt, plateAt, headX, ENDX, STOPX,
    medals: {
      bronze: 'Escape the worm',
      goals: [
        { key: 'time', gold: 175, silver: 300 },
        { key: 'gulps', gold: 0, silver: 4, word: 'Gulp' },
        { key: 'gems', gold: 20, silver: 12, more: true, word: 'glow gem' },
      ],
    },
    medalValues() { const st = G.mst; return { gulps: st.stats ? st.stats.gulps : 0, gems: st.gems || 0 }; },
    setup(st, L) {
      st.stats = { gulps: 0, chomps: 0, lured: 0, forksLured: 0, followed: 0, deadEnds: 0, walls: 0, bridges: 0, shortcuts: 0, seams: 0, echoes: 0, falls: 0, bumps: 0, coughs: 0, thrown: 0, gems: 0, helps: 0, roomT: [] };
      st.gems = 0; st.gotGem = {}; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0; st.T = 0;
      for (const row of L.grid) row.fill('.');
      K.mabel(st, 'Those weren\'t shards. Those were TEETH. RUN!');
      room(st, 0, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, k, 0); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.h) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.h) drawTop(st); },
    hud() { const st = G.mst; if (st.h) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Gulps', value: String(s.gulps) },
        { label: 'Glow gems', value: st.gems + ' of ' + S.gems },
        { label: 'Worm lured', value: String(s.lured) },
        { label: 'Shortcuts', value: String(s.shortcuts) },
      ];
      out.push('Chomps: ' + s.chomps + '. Walls broken: ' + s.walls + '. Dead ends: ' + s.deadEnds + '.');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const legend = {
    pip: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump <kbd>S</kbd> slide',
    bo: '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump <kbd>↓</kbd> slide',
  };
  const acts = k => ({ label: 'throw', labels: [k % 2 === 0 ? 'strike' : 'throw', k % 2 === 0 ? 'throw' : 'strike'] });
  CAVE.defs.caveworm = {
    name: 'Cave Worm Chase', world: 38, kind: 'team', mode: 'caveworm', outfit: 'caveworm', music: 'cavechase', amb: 'caveRumble',
    ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend,
    tip: 'The worm chases light. Throw a glow gem down the tunnel you are NOT taking.',
    howTo: [
      'LURER: throw glow gems (hold up or down to aim). The worm goes where the light lands.',
      'PATHFINDER: smash crystal walls, and hit the clear crystals to see which tunnel is the real one.',
      'If the floor ahead bulges and glows, the worm is coming through it.',
      'Jump, slide under roots, and keep up: the Jaws meter is how close it is.',
    ],
    act: acts(0),
    map: K.stubMap(),
    rooms: STRETCH.map((s, k) => ({ title: s.title, act: acts(k), tip: [
      'Pip strikes, Bo throws. At a fork, ring the echo crystal and send the worm the other way.',
      'Bo strikes, Pip throws. Go through the gaps in its body. Feed a gem to the seam for a shortcut!',
      'Pip strikes, Bo throws. When it inhales, hold right or grab a root. Run along its back!',
      'Bo strikes, Pip throws. Fastest yet. Where does this tunnel end...?',
    ][k] })),
  };

  /* ---------- sounds ---------- */
  Sfx.extra.cavewormRoar = function () { this.tone(90, 0.9, 'sawtooth', 0.05, 55); this.noise(0.8, { type: 'bandpass', f: 600, to: 200, q: 0.8, vol: 0.07 }); };
  Sfx.extra.cavewormTeethGrind = function () { this.noise(0.3, { type: 'bandpass', f: 1800, q: 4, vol: 0.03 }); };
  Sfx.extra.cavewormBurstTell = function () { for (let k = 0; k < 6; k++) this.noise(0.05, { type: 'highpass', f: 2000, vol: 0.03, delay: k * 0.12 }); this.tone(60, 1.1, 'sine', 0.06, 90); };
  Sfx.extra.cavewormBurstOut = function () { this.noise(0.6, { type: 'lowpass', f: 1200, to: 200, vol: 0.14 }); this.tone(70, 0.8, 'sawtooth', 0.06, 45); for (let k = 0; k < 5; k++) this.tone(2400 + k * 300, 0.15, 'triangle', 0.012, null, 0.05 + k * 0.04); [392, 466, 523].forEach((f, i) => this.tone(f, 0.25, 'sawtooth', 0.02, null, 0.1 + i * 0.1)); };
  Sfx.extra.cavewormBodySlide = function () { this.noise(0.6, { type: 'bandpass', f: 300, q: 1.5, vol: 0.05, a: 0.2 }); };
  Sfx.extra.cavewormCollapseTell = function () { for (let k = 0; k < 5; k++) this.noise(0.04, { type: 'highpass', f: 3000, vol: 0.02, delay: k * 0.15 }); };
  Sfx.extra.cavewormCollapse = function () { this.tone(55, 0.5, 'sine', 0.1, 35); this.noise(0.5, { type: 'lowpass', f: 600, to: 100, vol: 0.1 }); };
  Sfx.extra.cavewormInhale = function () { this.noise(2.0, { type: 'bandpass', f: 300, to: 1400, q: 0.8, vol: 0.06, a: 1.2 }); this.tone(80, 2, 'sawtooth', 0.02, 110); };
  Sfx.extra.cavewormCough = function () { this.noise(0.15, { type: 'lowpass', f: 900, vol: 0.1 }); this.noise(0.15, { type: 'lowpass', f: 700, vol: 0.08, delay: 0.22 }); this.tone(110, 0.2, 'square', 0.03, 70); };
  Sfx.extra.cavewormGemThrow = function () { this.tone(600, 0.12, 'triangle', 0.02, 1400); this.noise(0.08, { type: 'highpass', f: 3000, vol: 0.015 }); };
  Sfx.extra.cavewormGemLand = function () { this.tone(2093, 0.25, 'sine', 0.03); this.tone(3136, 0.2, 'sine', 0.012, null, 0.03); };
  Sfx.extra.cavewormLureChomp = function () { this.noise(0.12, { type: 'lowpass', f: 900, vol: 0.08 }); this.noise(0.12, { type: 'lowpass', f: 900, vol: 0.07, delay: 0.18 }); this.tone(1500, 0.1, 'triangle', 0.015, 600, 0.05); };
  Sfx.extra.cavewormSeamBite = function () { this.noise(0.4, { type: 'bandpass', f: 1400, to: 400, q: 1.2, vol: 0.09 }); this.tone(1760, 0.3, 'triangle', 0.02, 900); };
  Sfx.extra.cavewormShortcut = function () { this.noise(0.6, { f: 400, to: 2000, q: 0.8, vol: 0.06 }); [523, 659, 784].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.03, null, i * 0.06)); };
  Sfx.extra.cavewormPickSwing = function () { this.noise(0.08, { type: 'highpass', f: 1800, vol: 0.02 }); };
  Sfx.extra.cavewormPickStrike = function () { this.tone(1900, 0.15, 'square', 0.025, 1200); this.tone(2800, 0.3, 'sine', 0.015); };
  Sfx.extra.cavewormWallShatter = function () { this.noise(0.4, { type: 'highpass', f: 2200, vol: 0.09 }); for (let k = 0; k < 6; k++) this.tone(1800 + k * 400, 0.2, 'sine', 0.012, null, k * 0.03); };
  Sfx.extra.cavewormEchoPing = function () { this.tone(1319, 0.5, 'sine', 0.04); this.tone(1976, 0.7, 'sine', 0.035, null, 0.18); this.tone(1976, 0.5, 'sine', 0.012, null, 0.5); };
  Sfx.extra.cavewormStalactiteDrop = function () { this.tone(1600, 0.35, 'triangle', 0.02, 400); this.tone(60, 0.4, 'sine', 0.08, 40, 0.3); this.noise(0.3, { type: 'lowpass', f: 900, vol: 0.06, delay: 0.3 }); };
  Sfx.extra.cavewormRopeCut = function () { this.tone(900, 0.06, 'sawtooth', 0.03, 300); this.tone(80, 0.5, 'sine', 0.08, 50, 0.35); this.noise(0.3, { type: 'lowpass', f: 700, vol: 0.06, delay: 0.35 }); };
  Sfx.extra.cavewormRootGrab = function () { this.noise(0.08, { f: 900, q: 2, vol: 0.03 }); };
  Sfx.extra.cavewormGulp = function () { this.tone(300, 0.4, 'sine', 0.06, 80); this.noise(0.35, { type: 'lowpass', f: 600, to: 200, vol: 0.07 }); this.tone(120, 0.3, 'triangle', 0.04, 60, 0.3); };
  Sfx.extra.cavewormSpit = function () { this.tone(140, 0.12, 'sine', 0.05, 500); this.noise(0.15, { type: 'bandpass', f: 1200, q: 1, vol: 0.06 }); for (let k = 0; k < 4; k++) this.tone(2400 + k * 500, 0.1, 'sine', 0.01, null, 0.1 + k * 0.04); };
  Sfx.extra.cavewormChomp = function () { this.tone(70, 0.6, 'sawtooth', 0.08, 40); this.noise(0.25, { type: 'lowpass', f: 900, vol: 0.14, delay: 0.5 }); };
  Sfx.extra.cavewormDeadEndClang = function () { this.tone(800, 0.5, 'square', 0.025, 760); this.tone(1200, 0.6, 'sine', 0.02, null, 0.01); };
  Sfx.extra.cavewormGolemCatch = function () { this.tone(60, 0.6, 'sine', 0.12, 35); this.noise(0.4, { type: 'lowpass', f: 500, vol: 0.12 }); this.tone(1400, 0.4, 'triangle', 0.02, 1100, 0.05); };
  Sfx.extra.cavewormCrystalBonk = function () { this.tone(1400, 0.3, 'triangle', 0.04, 2200); this.tone(1046, 0.6, 'sine', 0.03, null, 0.05); this.tone(70, 0.4, 'sine', 0.08, 40); };
  Sfx.extra.cavewormFling = function () { this.noise(1.0, { f: 300, to: 1500, q: 0.7, vol: 0.06 }); this.tone(90, 1.2, 'sawtooth', 0.04, 40, 0.3); };
  Sfx.extra.cavewormFarBurrow = function () { this.noise(1.6, { type: 'lowpass', f: 200, to: 80, vol: 0.05, a: 0.3 }); this.tone(55, 1.5, 'sawtooth', 0.015, 40); };
  Sfx.extra.cavewormJump = function () { this.tone(330, 0.1, 'triangle', 0.02, 560); };
  Sfx.extra.cavewormLand = function () { this.noise(0.05, { type: 'lowpass', f: 700, vol: 0.025 }); };
  Sfx.extra.cavewormSlide = function () { this.noise(0.25, { type: 'bandpass', f: 1400, to: 700, q: 1, vol: 0.03 }); };
  Sfx.extra.cavewormBonk = function () { this.tone(400, 0.15, 'square', 0.03, 200); this.noise(0.1, { type: 'lowpass', f: 600, vol: 0.05 }); };
  Sfx.extra.cavewormRefill = function () { [1319, 1568, 1976].forEach((f, i) => this.tone(f, 0.12, 'sine', 0.025, null, i * 0.05)); };
  Sfx.extra.cavewormEmpty = function () { this.tone(220, 0.1, 'square', 0.015, 180); };
})();
