/* Pip & Bo - Level 29-1 Rooftop Moonlight Run (team, World 29 Ninja Dojo). */
'use strict';

/* ===== 29-1 Rooftop Moonlight Run (mode 'roofrun', World 29 "Ninja Dojo", team, scrolls right, Gavyn's pick) =====
   Gavyn's pick: "night rooftops with gaps too wide to jump alone; one throws a grappling hook, the other swings across
   and pulls them over."
   Side view of a moonlit town; the camera follows Pip and Bo to the right over tiled rooftops. The mode owns the tick,
   the camera and the picture (def.ownStep + ownHUD + noFalls); the engine grid is only spawns. World px; roofs are flat
   tops at their own heights, the street is at S.street.
   BOTH run with ◀ ▶ and jump with ▲. Small gaps and steps can be jumped, white roof cats must be hopped (a bump is a
   dizzy second), crumbly roofs fall away 0.9 s after the first foot lands on them, and moon stars hang in the air.
   A WIDE GAP needs the grappling hook, in three beats:
     1 THE THROWER (carries the hook; a strip in their colour marks the throwing spot at the roof's edge): the aim line
       sweeps up and down by itself; the action ('throw') throws along it. The hook must pass through the ring around the
       hook point above the gap (a lantern post, a swaying lantern on a line, or a kite). The ring turns green when the
       aim is on. A miss clinks, reels back and costs a moment.
     2 THE SWINGER takes the rope's handle from the peg at the edge with the action ('grab') and swings: lean the way
       you are swinging (◀ ▶) to pump higher, and leap off with the action on the way up, keeping the rope's end in
       hand. "Leap!" lights up while a leap would land on the far roof. Meanwhile the thrower can give one well-timed "Tug!" (the action, while the
       swinger is at the back of the swing) for a big push.
     3 THE PULL: the swinger now holds the far end of the rope. The thrower HOLDS the action to hold on, the swinger taps
       the action to heave them up and over. Heaves in rhythm ("Heave... ho...") pull harder; mashing slips. Letting go
       of the action half way drops the thrower.
   A FALL is soft: into a hay cart in the street and a bounce back up to the roof you left ("Whoops!", counted).
   Each stretch ends at a dojo gate; then Pip and Bo swap jobs. 4 stretches (roomWord 'Stretch'): Lantern Lane (Pip
   throws), Breezy Ridge (Bo throws; gusts of wind push back jumps and swings), Kite Alley (Pip; kites and crumbly
   roofs), The Moon Tower (Bo; everything, long gaps).
   GOLD HELP (announced, only while both are playing, each once a stretch, counted on the results card):
     3 hook misses in a row: a gold hook that grabs from much farther away;
     2 falls from the rope: a gold rope that pumps higher, and a gold ledge on every far roof to land on;
     2 drops during the pull: a gold loop, so the thrower no longer has to hold on.
   IDLE: 12 s with no person pressing anything: "Taking a break" and the clock stops.
   Medal: Gold <= 3:50 with <= 3 whoops and >= 75% of the moon stars; Silver <= 6:00 with <= 10 whoops.
   Room def: { title, thrower: 0|1, wind, sweep (s per aim sweep), course: [tokens] }. Tokens, left to right:
     'r420'         a roof 420 px wide. 'r420+30' / 'r420-25': 30 px lower / 25 px higher than the roof before it.
     'k150'         a crumbly roof.
     'g90'          a small gap to jump (120 or less); a moon star hangs over it.
     'G360:post'    a wide gap with a hook point above it: post | sway | kite. Options ':h220' (hook height above the
                    lower roof edge, default 200) and ':o0.38' (how far across the gap it hangs, default 0.42).
     after a roof, '/c200,p420,s300': a cat sitting 200 px along, a prowling cat, a moon star to jump for.
   MODES.roofrun.plan(st) says what each job should do next (prompts, HUD chips and the computer brain all read it), and
   MODES.roofrun.nav(st, id, x) is the running and jumping needed to get to x. */
(() => {
  const K = NINJA, FONT = K.FONT, lerp = K.lerp, COL = K.COL, TAU = Math.PI * 2;
  const S = {
    street: 512, baseY: 362,
    runV: 265, runA: 2200, airA: 1300, jumpV: 575, g: 1500, coyote: 0.09, cutV: 230, maxJump: 130,
    zone: 150, throwV: 1050, range: 430, catchR: 32, goldCatchR: 68, aMin: 0.2, aMax: 1.4, sweepT: 2.8, reel: 0.45,
    hand: 34,                       // the grip is this far above the feet on a rope
    gS: 1900, pump: 1.15, goldPump: 1.6, damp: 0.06, maxA: 1.4, tugE: 0.75, ledge: 56, grabT: 0.25,
    heave: 0.125, heaveCd: 0.32, heaveWin: 0.24, zipV: 1.1, dropT: 0.3,
    crumbT: 0.9, crumbBack: 2.6, catW: 18, catH: 24, coinR: 30,
    windA: 110, windS: 0.9, gust: 7,
    idleWait: 12, goldMiss: 3, goldFall: 2, goldDrop: 2,
    goldT: 230, silverT: 360,
  };
  const STAR = '#eaf2ff';
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

  /* ---------- the course ---------- */
  function compile(def) {
    const c = { roofs: [], gaps: [], cats: [], coins: [], carts: [], gateX: 0, x0: -80, len: 0 };
    let x = c.x0, y = S.baseY, wide = null, small = 0;
    for (const tok of def.course || []) {
      const parts = tok.split('/'), m = /^([rkgG])(\d+)([+-]\d+)?((?::\w[\w.]*)*)$/.exec(parts[0]);
      if (!m) continue;
      const n = +m[2];
      if (m[1] === 'g') { small = n; x += n; continue; }
      if (m[1] === 'G') {
        const o = { w: n, kind: 'post', h: 200, o: 0.42 };
        for (const q of m[4].split(':')) { if (/^h\d+$/.test(q)) o.h = +q.slice(1); else if (/^o[\d.]+$/.test(q)) o.o = +q.slice(1); else if (q) o.kind = q; }
        wide = o; x += n; continue;
      }
      if (m[3]) y += +m[3];
      const R = { i: c.roofs.length, x, w: n, y, crumb: m[1] === 'k', ct: 0, down: 0, ledge: 0 }, prev = c.roofs[R.i - 1];
      c.roofs.push(R);
      if (R.crumb) c.carts.push({ x: x + n / 2, sq: 0, s: 0.9 });
      if (wide && prev) {
        const g = { i: c.gaps.length, left: prev.i, right: R.i, xL: prev.x + prev.w, xR: R.x, yL: prev.y, yR: R.y, kind: wide.kind,
          latched: false, hp: null, settle: 0, sw: null, across: false, tugged: false, u: 0, uT: 0, rel: 0, cd: 0, ready: 0, streak: 0, heaves: 0 };
        g.hx = g.xL + wide.w * wide.o; g.hy = Math.min(g.yL, g.yR) - wide.h; g.ph = g.i * 1.7 + (def.thrower || 0);
        g.gx = g.xL - 4; g.gy = g.yL - S.hand;                           // the handle on the peg
        g.L = dist(g.gx, g.gy, g.hx, g.hy); g.th0 = Math.atan2(g.gx - g.hx, g.gy - g.hy);
        g.ax = g.xL - 34; g.ay = g.yL - S.hand; g.bx = g.xR + 48; g.by = g.yR - S.hand;   // the pull: from, to (grips)
        g.cx = g.hx; g.cy = Math.min(g.yL, g.yR) - S.hand - 76;
        c.gaps.push(g);
        c.carts.push({ x: (g.xL + g.xR) / 2, sq: 0, s: 1 });
        // moon stars: at the bottom of the swing, on the way up, and at the top of the pull
        c.coins.push({ x: g.hx, y: g.hy + g.L + 20 });
        const a2 = Math.min(0.62, Math.asin(clamp((g.xR - 34 - g.hx) / (g.L + 20), -1, 1)));
        c.coins.push({ x: g.hx + Math.sin(a2) * (g.L + 20), y: g.hy + Math.cos(a2) * (g.L + 20) });
        const z = zipAt(g, 0.5); c.coins.push({ x: z.x, y: z.y + 18 });
      } else if (small && prev) {
        c.carts.push({ x: x - small / 2, sq: 0, s: clamp(small / 110, 0.6, 0.9) });
        c.coins.push({ x: x - small / 2, y: Math.min(prev.y, y) - 74 });
      }
      wide = null; small = 0;
      for (const it of (parts[1] || '').split(',')) {
        const q = /^([cps])(\d+)$/.exec(it); if (!q) continue;
        if (q[1] === 's') c.coins.push({ x: x + +q[2], y: y - 86 });
        else c.cats.push({ x: x + +q[2], x0: x + +q[2], y, roof: R.i, prowl: q[1] === 'p', ph: c.cats.length * 2.3, hopT: 0, face: -1 });
      }
      x += n;
    }
    const last = c.roofs[c.roofs.length - 1];
    c.gateX = last.x + last.w - 290; c.len = last.x + last.w;
    for (const q of c.coins) { q.got = false; q.t = 0; }
    return c;
  }
  // the pull's path (the thrower's grip): up from the near edge, over, and down onto the far roof
  function zipAt(g, u) {
    const v = 1 - u;
    return { x: v * v * g.ax + 2 * v * u * g.cx + u * u * g.bx, y: v * v * g.ay + 2 * v * u * g.cy + u * u * g.by };
  }
  // where a gap's hook point is at time t (it holds still once the hook has bitten)
  function hookPt(g, t) {
    if (g.kind === 'sway') { const s = Math.sin(t * 1.9 + g.ph); return { x: g.hx + s * 46, y: g.hy - (1 - s * s) * 6 }; }
    if (g.kind === 'kite') return { x: g.hx + Math.sin(t * 1.25 + g.ph) * 56, y: g.hy + Math.sin(t * 2.1 + g.ph * 2) * 22 };
    return { x: g.hx, y: g.hy };
  }
  const hookAt = (st, g) => (g.latched ? g.hp : hookPt(g, st.clock));
  const gap = st => st.c.gaps[st.gi] || null;
  const solid = R => !(R.crumb && R.down > 0);
  const aimAng = st => lerp(S.aMin, S.aMax, 0.5 - 0.5 * Math.cos(TAU * st.clock / st.sweepT));
  const handOf = r => ({ x: r.x + r.face * 18, y: r.y - 17 });
  const catchR = st => (st.gold.hook ? S.goldCatchR : S.catchR);

  /* ---------- a stretch (one room) ---------- */
  const newRunner = (id, x, y) => ({ id, x, y, vx: 0, vy: 0, face: 1, st: 'run', grounded: true, roof: 0, coy: 0, stun: 0, t: 0,
    lastRoof: 0, lastX: x, rot: 0, fling: false, hop: 0, hx: 0, hy: 0, throwT: 0, sq: 0, from: null, to: null, why: '' });
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.thr = def.thrower || 0; st.swg = 1 - st.thr; st.title = def.title || '';
    st.c = compile(def); st.gi = 0; st.sweepT = def.sweep || S.sweepT; st.windOn = !!def.wind; st.wind = 0;
    const R0 = st.c.roofs[0];
    st.run = [0, 1].map(id => newRunner(id, 70 + (id === st.thr ? 56 : 0), R0.y));
    st.hook = { state: 'held', x: 0, y: 0, vx: 0, vy: 0, d: 0, t: 0, a: 0, fx: 0, fy: 0 };
    st.rc = { miss: 0, sfall: 0, drop: 0 }; st.gold = { hook: false, rope: false, loop: false };
    st.state = 'go'; st.endT = 0; st.segStart = G.time; st.clock = st.clock || 0; st.leafT = 0;
    st.cam = { x: 0 };
    K.fx(st); actLabels(st); mirror(st);
  }
  function actLabels(st) { const w = []; w[st.thr] = 'throw'; w[st.swg] = 'grab'; K.actLabels(w, 'hook'); }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.c) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    st.wind = st.windOn && live ? clamp(Math.sin(TAU * st.clock / S.gust) * 1.7 - 0.6, 0, 1) : 0;
    world(st, dt);
    for (const r of st.run) runner(st, r, dt, live);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    hookStep(st, dt);
    if (live) { touch(st); gate(st); }
    if (st.state === 'end') endStep(st, dt);
    cam(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }
  // crumbly roofs, cats, hay carts, the wind's leaves
  function world(st, dt) {
    const c = st.c;
    for (const R of c.roofs) {
      if (!R.crumb) continue;
      if (R.down > 0) { R.down -= dt; if (R.down <= 0) { R.down = 0; R.ct = 0; K.poof(st, R.x + R.w / 2, R.y + 6, 8); Sfx.play('ninjaPoof'); } continue; }
      if (R.ct > 0) {
        R.ct += dt;
        if (R.ct >= S.crumbT) {
          R.down = S.crumbBack; Sfx.play('roofrunCrumble');
          for (let i = 0; i < 9; i++) K.part(st, R.x + Math.random() * R.w, R.y + 4, (Math.random() - 0.5) * 80, -40 - Math.random() * 60, 0.9, i % 2 ? COL.tile : COL.tileHi, 4, 700, 'conf');
        }
      }
    }
    for (const q of c.cats) { if (q.prowl) { const nx = q.x0 + Math.sin(st.clock * 0.7 + q.ph) * 44; q.face = nx > q.x ? 1 : -1; q.x = nx; } if (q.hopT > 0) q.hopT -= dt; }
    for (const q of c.carts) if (q.sq > 0) q.sq = Math.max(0, q.sq - dt * 2.2);
    for (const q of c.coins) if (q.t > 0) q.t -= dt;
    if (st.wind > 0.15) {
      st.leafT -= dt;
      if (st.leafT <= 0) { st.leafT = 0.09; K.part(st, st.cam.x + W + 20, 120 + Math.random() * 300, -360 - Math.random() * 200, 20 + Math.random() * 40, 2.4, Math.random() < 0.5 ? '#c8d8a0' : '#f0b8c8', 3, 30, 'leaf'); }
      if (!st.windSaid && st.wind > 0.5) { st.windSaid = true; K.msg(st, 'A gust of wind! It pushes back jumps and swings', '#d4e6ff', 3.6); }
    }
  }
  function runner(st, r, dt, live) {
    r.t += dt;
    if (r.stun > 0) r.stun -= dt;
    if (r.throwT > 0) r.throwT -= dt;
    if (r.hop > 0) r.hop -= dt;
    if (r.sq > 0) r.sq -= dt;
    const ctl = live && r.stun <= 0;
    if (r.st === 'run') runStep(st, r, dt, ctl);
    else if (r.st === 'hold') holdStep(st, r, dt, ctl);
    else if (r.st === 'swing') swingStep(st, r, dt, ctl);
    else if (r.st === 'zip') zipStep(st, r, dt, live);
    else if (r.st === 'haul') haulStep(st, r, dt, ctl);
    else fallStep(st, r, dt);
  }

  /* ---------- running and jumping ---------- */
  function runStep(st, r, dt, ctl) {
    const p = G.players[r.id], i = p.input, c = st.c;
    const dir = ctl ? (i.right ? 1 : 0) - (i.left ? 1 : 0) : 0;
    if (dir) r.face = dir;
    if (r.grounded) r.vx = approach(r.vx, dir * S.runV, S.runA * dt);
    else if (r.fling) { if (dir && r.vx * dir < S.runV) r.vx = approach(r.vx, dir * S.runV, S.airA * 0.5 * dt); }
    else r.vx = approach(r.vx, dir * S.runV, (dir ? S.airA : S.airA * 0.5) * dt);
    if (r.grounded) r.coy = S.coyote; else r.coy -= dt;
    if (ctl && p.pendingJump && r.coy > 0) {
      r.vy = -S.jumpV; r.grounded = false; r.coy = 0; r.fling = false;
      Sfx.play('roofrunJump', r.id); K.dust(st, r.x, r.y, 'rgba(200,206,240,0.7)', 4);
    }
    if (!r.grounded) {
      if (!r.fling && r.vy < -S.cutV && !(ctl && i.jump)) r.vy = -S.cutV;
      r.vy = Math.min(900, r.vy + S.g * dt);
      r.vx -= S.windA * st.wind * dt;
    }
    r.rot = approach(r.rot, 0, dt * 5);
    // sideways, stopped by house walls (only below a roof's top) and by the edges of the screen and the course
    let nx = r.x + r.vx * dt;
    for (const R of c.roofs) {
      if (!solid(R) || r.y <= R.y + 8) continue;
      if (nx > R.x - 9 && nx < R.x + R.w + 9) { nx = r.x <= R.x + R.w / 2 ? R.x - 9 : R.x + R.w + 9; r.vx = 0; }
    }
    const hi = Math.min(c.gateX + 70, st.cam.x + W - 36), lo = Math.max(c.x0 + 100, st.cam.x + 22);
    if (nx > hi) { nx = Math.max(r.x, hi); r.vx = Math.min(r.vx, 0); }
    if (nx < lo) { nx = Math.min(r.x, lo); r.vx = Math.max(r.vx, 0); }
    r.x = nx;
    // up and down
    if (r.grounded) {
      const R = c.roofs[r.roof];
      if (!R || !solid(R) || r.x < R.x - 6 || r.x > R.x + R.w + 6) r.grounded = false;
      else { r.y = R.y; if (R.crumb) { if (!R.ct) { R.ct = 0.001; Sfx.play('roofrunCreak'); } } else { r.lastRoof = R.i; r.lastX = r.x; } }
    } else {
      const ny = r.y + r.vy * dt;
      if (r.vy >= 0) for (const R of c.roofs) {
        if (!solid(R) || r.x < R.x - 6 || r.x > R.x + R.w + 6 || r.y > R.y + 1 || ny < R.y) continue;
        land(st, r, R); break;
      }
      if (!r.grounded) { r.y = ny; if (r.y > S.street - 96) { r.st = 'fall'; r.t = 0; } }
    }
    // cats
    if (r.stun <= 0 && r.st === 'run' && !r.fling) for (const q of c.cats) {
      if (Math.abs(q.x - r.x) < S.catW && r.y > q.y - S.catH && r.y < q.y + 8) {
        const d = r.x < q.x ? -1 : 1;
        r.vx = d * 190; r.vy = -250; r.grounded = false; r.fling = false; r.stun = 0.7; q.hopT = 0.5;
        st.stats.bumps++; Sfx.play('roofrunMeow'); Sfx.play('ninjaBonk');
        K.pop(st, q.x, q.y - 60, 'Mrow!', '#ffffff', 20); K.spark(st, q.x, q.y - 20, 6, ['#ffffff', STAR]);
        K.hintOnce(st, 'cat' + r.id, r.id, 'Hop over the cats! ' + K.key(r.id, 'up'), 3);
        break;
      }
    }
    const g = gap(st);
    // the thrower keeps hold of the rope's near end once the hook has bitten
    if (r.id === st.thr && r.st === 'run' && r.grounded && g && g.latched && r.roof === g.left && r.x >= g.xL - S.zone - 60) { r.st = 'hold'; r.vx = 0; r.face = 1; return; }
    // the action
    if (ctl && p.pendingAct && r.st === 'run') {
      if (r.id === st.thr) { if (canAim(st)) throwHook(st, r); else if (g && !g.latched && st.hook.state === 'held') K.hintOnce(st, 'spot', r.id, 'Throw from the roof\'s edge, on the ' + (r.id ? 'blue' : 'orange') + ' strip', 3.2); }
      else if (canGrab(st)) grab(st, r, g);
      else if (g && !g.latched) K.hintOnce(st, 'nohook', r.id, NAMES[st.thr] + ' has the hook this stretch. Wait for the throw!', 3.2);
    }
  }
  function land(st, r, R) {
    const hard = r.vy > 420;
    r.y = R.y; r.vy = 0; r.grounded = true; r.roof = R.i; r.fling = false; r.why = '';
    if (hard) { K.dust(st, r.x, r.y, 'rgba(200,206,240,0.7)', 6); Sfx.play('roofrunLand'); r.sq = 0.14; }
    const g = gap(st);
    if (g && g.latched && !g.across && r.id === st.swg && R.i >= g.right) {
      g.across = true; r.st = 'haul'; r.vx = 0; r.face = -1; g.cd = 0; g.ready = 0; g.streak = 0; g.heaves = 0; g.u = 0; g.uT = 0;
      st.stats.swings++;
      st.hints[r.id] = null;
      Sfx.play('ninjaCheer'); K.pop(st, r.x, r.y - 104, 'Landed!', '#ffffff', 24); K.spark(st, r.x, r.y - 10, 10, ['#ffffff', STAR]);
      rumble(r.id, 0.3, 0.5, 140);
    }
  }
  const canAim = st => { const g = gap(st), T = st.run[st.thr]; return !!g && !g.latched && st.hook.state === 'held' && T.st === 'run' && T.grounded && T.stun <= 0 && T.roof === g.left && T.x >= g.xL - S.zone; };
  const canGrab = st => { const g = gap(st), Q = st.run[st.swg]; return !!g && g.latched && g.settle <= 0 && !g.across && !g.sw && Q.st === 'run' && Q.grounded && Q.stun <= 0 && Q.roof === g.left && Q.x >= g.xL - S.zone - 50; };

  /* ---------- beat 1: the throw ---------- */
  function throwHook(st, r) {
    const h = st.hook, a = aimAng(st);
    r.face = 1; r.throwT = 0.3;
    const m = handOf(r);
    Object.assign(h, { state: 'fly', x: m.x, y: m.y, vx: Math.cos(a) * S.throwV, vy: -Math.sin(a) * S.throwV, d: 0, t: 0, a });
    st.stats.throws++;
    Sfx.play('ninjaWhoosh', 1.1);
  }
  function hookStep(st, dt) {
    const h = st.hook, g = gap(st), T = st.run[st.thr];
    if (g && g.latched && g.settle > 0) {
      g.settle -= dt;
      const k = 1 - Math.exp(-dt * 9);
      g.hp.x = lerp(g.hp.x, g.hx, k); g.hp.y = lerp(g.hp.y, g.hy, k);
      if (g.settle <= 0) { g.hp.x = g.hx; g.hp.y = g.hy; }
    }
    if (h.state === 'fly') {
      if (!g) { h.state = 'held'; return; }
      h.x += h.vx * dt; h.y += h.vy * dt; h.d += S.throwV * dt;
      const q = hookPt(g, st.clock);
      if (dist(h.x, h.y, q.x, q.y) < catchR(st)) { latch(st, g, q); return; }
      if (h.d > S.range) {
        h.state = 'back'; h.t = 0; h.fx = h.x; h.fy = h.y;
        st.rc.miss++; Sfx.play('ninjaClink', 0.7);
        K.pop(st, h.x, h.y - 20, 'Missed!', '#ffffff', 18);
        K.hintOnce(st, 'aim', st.thr, 'Throw when the ring turns green!', 3);
        if (st.rc.miss >= S.goldMiss && !st.gold.hook && K.both(st)) { st.gold.hook = true; K.goldHelp(st, 'Gold hook! It grabs from much farther away'); }
      }
    } else if (h.state === 'back') {
      h.t += dt;
      const u = clamp(h.t / S.reel, 0, 1), m = handOf(T);
      h.x = lerp(h.fx, m.x, K.smooth(u)); h.y = lerp(h.fy, m.y, K.smooth(u)) - Math.sin(u * Math.PI) * 30;
      if (u >= 1) h.state = 'held';
    }
  }
  function latch(st, g, q) {
    const T = st.run[st.thr];
    g.latched = true; g.hp = { x: q.x, y: q.y }; g.settle = 0.45;
    st.hook.state = 'on';
    st.stats.hits++; st.rc.miss = 0;
    Sfx.play('ninjaClink'); Sfx.play('roofrunLatch');
    K.pop(st, q.x, q.y - 34, 'Hooked!', '#ffffff', 24); K.spark(st, q.x, q.y, 12, ['#ffffff', COL.steel]);
    rumble(st.thr, 0.3, 0.5, 120);
  }

  /* ---------- beat 2: the swing ---------- */
  function grab(st, r, g) {
    const m = handOf(r);
    r.st = 'swing'; r.hop = 0.16; r.hx = m.x; r.hy = m.y - 14; r.grounded = false; r.vx = 0; r.vy = 0; r.why = 'rope';
    g.sw = { th: g.th0, om: 0.3, t: 0 }; g.tugged = false;
    Sfx.play('roofrunGrab'); K.hintOnce(st, 'pump', r.id, 'Lean the way you swing ' + K.key(r.id, 'lr') + ', then leap ' + K.key(r.id, 'act'), 3.4);
  }
  const swingHands = (g, th) => ({ x: g.hp.x + Math.sin(th) * g.L, y: g.hp.y + Math.cos(th) * g.L });
  function swingStep(st, r, dt, ctl) {
    const g = gap(st), sw = g && g.sw, p = G.players[r.id], i = p.input;
    if (!sw) { r.st = 'run'; return; }
    sw.t += dt;
    const dir = ctl ? (i.right ? 1 : 0) - (i.left ? 1 : 0) : 0, sgn = sw.om >= 0 ? 1 : -1;
    let acc = -(S.gS / g.L) * Math.sin(sw.th) - S.damp * sw.om - S.windS * st.wind * Math.cos(sw.th);
    if (dir) acc += (dir === sgn ? 1 : -0.5) * sgn * S.pump * (st.gold.rope ? S.goldPump : 1);
    sw.om += acc * dt; sw.th += sw.om * dt;
    if (Math.abs(sw.th) > S.maxA) { sw.th = Math.sign(sw.th) * S.maxA; sw.om = 0; }
    if (sw.th > 0.15) g.tugged = false;
    // a soft bump off the far wall when swinging in too low
    const R = st.c.roofs[g.right], fx = g.hp.x + Math.sin(sw.th) * (g.L + 34), fy = g.hp.y + Math.cos(sw.th) * (g.L + 34);
    if (sw.om > 0 && fx > R.x - 4 && fy > R.y + 6) { sw.om = -0.45 * sw.om; Sfx.play('ninjaBonk', 0.8); K.dust(st, fx, fy, 'rgba(200,206,240,0.7)', 5); }
    const hd = swingHands(g, sw.th);
    r.x = hd.x; r.y = hd.y + S.hand; r.face = sgn;
    if (ctl && p.pendingAct && sw.t > S.grabT) {
      r.st = 'run'; r.grounded = false; r.fling = true; r.coy = 0;
      r.vx = g.L * sw.om * Math.cos(sw.th); r.vy = -g.L * sw.om * Math.sin(sw.th); r.rot = -sw.th;
      g.sw = null; st.hints[r.id] = null;
      Sfx.play('ninjaWhoosh', 1.3);
    }
  }
  // the thrower, holding the rope's near end
  function holdStep(st, r, dt, ctl) {
    const g = gap(st), p = G.players[r.id];
    if (!g || !g.latched) { r.st = 'run'; return; }
    r.vx = 0; r.face = 1;
    if (!ctl) return;
    if (g.across) {
      if (p.input.act || st.gold.loop) {
        const m = handOf(r);
        r.st = 'zip'; r.hop = 0.18; r.hx = m.x; r.hy = m.y; r.grounded = false; r.why = 'zip';
        g.u = 0; g.rel = 0; g.uT = 0; g.cd = 0; g.ready = 0; g.streak = 0; g.heaves = 0;
        Sfx.play('roofrunGrab');
      }
    } else if (p.pendingAct && g.sw) {
      const sw = g.sw;
      if (!g.tugged && sw.th < -0.08 && sw.om > -0.5) {
        sw.om = Math.sqrt(Math.max(0, sw.om) ** 2 + 2 * S.tugE); g.tugged = true; r.sq = 0.2;
        st.stats.tugs++; Sfx.play('roofrunHeave', 1.2); K.pop(st, r.x, r.y - 60, 'Tug!', '#ffffff', 20);
      } else Sfx.play('ninjaTik');
    }
  }
  // the swinger's leap from here: would it land on the far roof? (the same steps the runner takes)
  function landsOn(st, g, x, y, vx, vy) {
    const R = st.c.roofs[g.right], dt = 1 / 60;
    for (let n = 0; n < 100; n++) {
      vy = Math.min(900, vy + S.g * dt); vx -= S.windA * st.wind * dt;
      const px = x, py = y;
      x += vx * dt; y += vy * dt;
      if (px < R.x - 9 && x >= R.x - 9 && y > R.y + 8) return false;
      if (vy > 0 && py <= R.y && y >= R.y) return x > R.x + 22 && x < R.x + R.w - 40;
      if (y > R.y + 60) return false;
    }
    return false;
  }

  /* ---------- beat 3: the pull ---------- */
  function zipStep(st, r, dt, live) {
    const g = gap(st), p = G.players[r.id];
    if (!g) { r.st = 'run'; return; }
    const holding = !live || p.input.act || st.gold.loop;
    if (holding) g.rel = 0; else g.rel += dt;
    g.u = approach(g.u, Math.min(1, g.uT), S.zipV * dt);
    const z = zipAt(g, g.u);
    r.x = z.x; r.y = z.y + S.hand;
    if (g.rel > S.dropT && g.u < 0.97) {
      if (g.u < 0.05) { r.st = 'hold'; r.x = g.ax - 18; r.y = g.yL; r.grounded = true; r.roof = g.left; g.uT = 0; g.u = 0; return; }
      r.st = 'fall'; r.t = 0; r.vx = 0; r.vy = 0; g.u = 0; g.uT = 0;
      Sfx.play('roofrunSlip'); K.pop(st, r.x, r.y - 60, 'Slipped!', '#ffffff', 20);
      K.hint(st, r.id, 'Keep holding ' + K.key(r.id, 'act') + ' all the way across!', 3.2);
      return;
    }
    if (g.u >= 1) crossed(st, g, r);
  }
  function haulStep(st, r, dt, ctl) {
    const g = gap(st), p = G.players[r.id], T = st.run[st.thr];
    if (!g) { r.st = 'run'; return; }
    r.vx = 0; r.face = -1;
    if (g.cd > 0) g.cd -= dt; else g.ready += dt;
    if (!ctl || !p.pendingAct) return;
    if (T.st !== 'zip') { K.hintOnce(st, 'waithold', r.id, 'Wait until ' + NAMES[st.thr] + ' holds on!', 2.6); return; }
    if (g.cd <= 0) {
      g.streak = g.heaves > 0 && g.ready < S.heaveWin ? g.streak + 1 : 0;
      g.uT += S.heave * (1 + 0.3 * Math.min(g.streak, 2)); g.cd = S.heaveCd; g.ready = 0; g.heaves++; r.sq = 0.22;
      st.stats.heaves++;
      Sfx.play('roofrunHeave', g.heaves % 2 ? 1 : 0.85);
      if (g.heaves === 1) K.pop(st, r.x + 84, r.y - 22, 'Heave ho!', '#ffffff', 17);
      else if (g.streak === 2) K.pop(st, r.x + 84, r.y - 22, 'In rhythm!', STAR, 19);
    } else {
      g.streak = 0; g.cd = Math.min(0.42, g.cd + 0.08); Sfx.play('ninjaTik');
      K.hintOnce(st, 'rhythm', r.id, 'Not so fast! Pull in rhythm: heave... ho...', 3.2);
    }
  }
  function crossed(st, g, r) {
    const R = st.c.roofs[g.right], Q = st.run[st.swg];
    r.st = 'run'; r.x = g.bx; r.y = R.y; r.grounded = true; r.roof = R.i; r.lastRoof = R.i; r.lastX = r.x; r.vx = 0; r.vy = 0; r.why = '';
    if (Q.st === 'haul') { Q.st = 'run'; Q.face = 1; }
    st.hook.state = 'held'; st.gi++; st.stats.gaps++;
    Sfx.play('ninjaCheer'); Sfx.play('ninjaWhoosh', 0.8);
    K.pop(st, r.x, r.y - 80, 'Across! Run!', '#ffffff', 26); K.spark(st, r.x, r.y - 20, 12, ['#ffffff', STAR]);
    rumble(0, 0.25, 0.4, 120); rumble(1, 0.25, 0.4, 120);
  }

  /* ---------- a soft fall: hay cart and bounce back ---------- */
  function fallStep(st, r, dt) {
    const c = st.c;
    if (r.st === 'fall') {
      let cart = c.carts[0];
      for (const q of c.carts) if (Math.abs(q.x - r.x) < Math.abs(cart.x - r.x)) cart = q;
      r.vy = Math.min(900, r.vy + S.g * dt); r.y += r.vy * dt; r.x = approach(r.x, cart.x, 560 * dt); r.rot += dt * 9;
      if (r.y >= S.street - 44) {
        r.y = S.street - 44; r.x = clamp(r.x, cart.x - 20, cart.x + 20); r.st = 'cart'; r.t = 0; cart.sq = 1;
        st.stats.whoops++;
        Sfx.play('roofrunBoing'); K.pop(st, r.x, r.y - 70, 'Whoops! Soft landing!', '#ffffff', 22);
        for (let i = 0; i < 10; i++) K.part(st, r.x + (Math.random() - 0.5) * 50, r.y - 6, (Math.random() - 0.5) * 160, -120 - Math.random() * 140, 0.8, i % 2 ? '#e8c860' : '#fff2a8', 3, 500, 'conf');
        rumble(r.id, 0.4, 0.3, 160);
        if (r.why === 'rope' && K.both(st)) {
          st.rc.sfall++;
          if (st.rc.sfall >= S.goldFall && !st.gold.rope) {
            st.gold.rope = true;
            for (const g of c.gaps) if (g.i >= st.gi && !g.across) { const R = c.roofs[g.right]; R.ledge = S.ledge; R.x -= S.ledge; R.w += S.ledge; g.xR = R.x; }
            K.goldHelp(st, 'Gold rope! It swings higher, and a gold ledge to land on');
          }
        } else if (r.why === 'zip' && K.both(st)) {
          st.rc.drop++;
          if (st.rc.drop >= S.goldDrop && !st.gold.loop) { st.gold.loop = true; st.hints[st.thr] = null; K.goldHelp(st, 'Gold loop! ' + NAMES[st.thr] + ' is tied on: just heave'); }
        }
      }
      return;
    }
    if (r.st === 'cart') {
      r.rot = 0;
      if (r.t > 0.42) {
        let R = c.roofs[r.lastRoof] || c.roofs[0];
        const g = gap(st), anchor = g && g.latched && r.id === st.thr;
        if (anchor) R = c.roofs[g.left];
        r.from = { x: r.x, y: r.y };
        r.to = { x: anchor ? clamp(r.lastX, g.xL - S.zone + 14, g.xL - 40) : clamp(r.lastX, R.x + 34, R.x + R.w - 34), y: R.y, roof: R.i, hold: anchor };
        r.st = 'bounce'; r.t = 0; Sfx.play('roofrunHop');
      }
      return;
    }
    const u = clamp(r.t / 0.8, 0, 1);
    r.x = lerp(r.from.x, r.to.x, K.smooth(u)); r.y = lerp(r.from.y, r.to.y, u) - Math.sin(u * Math.PI) * 110; r.rot = u * TAU * (r.to.x < r.from.x ? -1 : 1);
    if (u >= 1) {
      r.x = r.to.x; r.y = r.to.y; r.rot = 0; r.vx = 0; r.vy = 0; r.grounded = true; r.roof = r.to.roof; r.stun = 0.35; r.fling = false; r.why = '';
      r.st = r.to.hold ? 'hold' : 'run'; r.face = 1;
      K.dust(st, r.x, r.y, 'rgba(200,206,240,0.7)', 6); Sfx.play('roofrunLand');
    }
  }

  /* ---------- moon stars and the gate ---------- */
  function centre(st, r) {
    if (r.st === 'swing') { const g = gap(st); if (g && g.sw) return { x: g.hp.x + Math.sin(g.sw.th) * (g.L + 20), y: g.hp.y + Math.cos(g.sw.th) * (g.L + 20) }; }
    if (r.st === 'zip') return { x: r.x, y: r.y - S.hand + 18 };
    return { x: r.x, y: r.y - 13 };
  }
  function touch(st) {
    for (const r of st.run) {
      if (r.st === 'fall' || r.st === 'cart' || r.st === 'bounce') continue;
      const m = centre(st, r);
      for (const q of st.c.coins) {
        if (q.got || Math.abs(q.x - m.x) > S.coinR || Math.abs(q.y - m.y) > S.coinR) continue;
        q.got = true; q.t = 0.4; st.stars++;
        Sfx.play('roofrunStar', 1 + (st.stars % 5) * 0.06); K.spark(st, q.x, q.y, 5, ['#ffffff', STAR, '#bcd4ff']);
      }
    }
  }
  function gate(st) {
    const c = st.c;
    if (!st.run.every(r => r.st === 'run' && r.grounded && r.x >= c.gateX - 40)) return;
    const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
    st.state = 'end'; st.endT = 0; st.lastRoom = last;
    st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('ninjaGong'); Sfx.play('ninjaCheer');
    K.pop(st, c.gateX, c.roofs[c.roofs.length - 1].y - 150, last ? 'The moon tower! You made it!' : 'Dojo gate! Swap jobs!', '#ffffff', 28);
    for (const r of st.run) r.vx = 0;
  }
  function endStep(st, dt) {
    st.endT += dt;
    const y = st.c.roofs[st.c.roofs.length - 1].y;
    if (st.lastRoom) {
      if (st.endT > 0.7 && !st.party) { st.party = true; Sfx.play('roofrunFanfare'); K.confetti(st, st.c.gateX, y - 160, 50); }
      if (st.endT > 2.6 && !st.cleared) { st.cleared = true; G.level.goal = { x: st.c.gateX - st.cam.x, y: y - 60 }; levelClear(); }
    } else {
      if (st.endT > 1.5 && !st.party) { st.party = true; for (const r of st.run) K.poof(st, r.x, r.y - 14, 10); Sfx.play('ninjaPoof'); }
      if (st.endT > 2.0) { st.party = false; nextRoom(); }
    }
  }

  /* ---------- what to do next ---------- */
  /* plan(st): { phase: 'run' | 'throw' | 'swing' | 'pull', g (the gap), aiming, throwNow, canGrab, pump (-1 | 0 | 1),
       letGo, tug, onRope, holding, heave, thr: { x, act }, swg: { x, act, dir } }
     x is where that job should run to (null: stay), act is 'tap' | 'hold' | null. */
  function plan(st) {
    const c = st.c, g = gap(st), T = st.run[st.thr], Q = st.run[st.swg];
    const out = { phase: 'run', g, aiming: false, throwNow: false, canGrab: false, pump: 0, letGo: false, tug: false, onRope: false, holding: false, heave: false,
      thr: { x: null, act: null }, swg: { x: null, act: null, dir: 0 } };
    if (!g) { out.thr.x = c.gateX + 50; out.swg.x = c.gateX + 6; return out; }
    if (!g.latched) {
      out.phase = 'throw';
      out.thr.x = g.xL - 46; out.swg.x = g.xL - 108;
      out.aiming = canAim(st);
      if (out.aiming) {
        // the hook flies straight along the aim line: will it pass through the ring where the hook point will be?
        const m = handOf({ x: T.x, y: T.y, face: 1 }), a = aimAng(st), dx = Math.cos(a), dy = -Math.sin(a);
        let q = hookPt(g, st.clock);
        q = hookPt(g, st.clock + dist(m.x, m.y, q.x, q.y) / S.throwV);
        const s = (q.x - m.x) * dx + (q.y - m.y) * dy, perp = Math.abs((q.x - m.x) * dy - (q.y - m.y) * dx);
        out.throwNow = s > 0 && s < S.range - 10 && perp < catchR(st) * 0.55;
        if (out.throwNow) out.thr.act = 'tap';
      }
      return out;
    }
    if (!g.across) {
      out.phase = 'swing';
      out.swg.x = Q.fling ? null : g.xL - 40;   // (mid-flight after a leap: no steering)
      if (T.st === 'run') out.thr.x = g.xL - 46;
      if (g.sw) {
        const sw = g.sw, hd = swingHands(g, sw.th);
        out.onRope = true;
        out.pump = Math.abs(sw.om) > 0.06 ? Math.sign(sw.om) : sw.th < 0 ? 1 : -1;
        out.swg.dir = out.pump;
        out.letGo = sw.t > S.grabT && sw.om > 0 && landsOn(st, g, hd.x, hd.y + S.hand, g.L * sw.om * Math.cos(sw.th), -g.L * sw.om * Math.sin(sw.th));
        if (out.letGo) out.swg.act = 'tap';
        out.tug = !g.tugged && sw.th < -0.08 && sw.om > -0.5 && sw.t > 0.3;
        if (out.tug && T.st === 'hold') out.thr.act = 'tap';
      } else {
        out.canGrab = canGrab(st);
        if (out.canGrab) out.swg.act = 'tap';
      }
      return out;
    }
    out.phase = 'pull';
    if (T.st === 'run') out.thr.x = g.xL - 46;
    out.holding = T.st === 'zip';
    if (T.st === 'hold' || T.st === 'zip') out.thr.act = 'hold';
    out.heave = out.holding && g.cd <= 0 && g.uT < 1;
    if (out.heave) out.swg.act = 'tap';
    return out;
  }
  /* nav(st, id, tx): the running and jumping that gets a free runner to x = tx: { dir, jump }. It hops small gaps, steps
     and cats, stops at the edge of a wide gap, and waits for a crumbly roof that is already cracking or gone. */
  function nav(st, id, tx) {
    const r = st.run[id], c = st.c, out = { dir: 0, jump: false };
    if (r.st !== 'run' || r.stun > 0 || tx == null) return out;
    const d = tx - r.x;
    if (Math.abs(d) < 10) return out;
    const dir = Math.sign(d);
    out.dir = dir;
    if (!r.grounded) { out.jump = r.vy < 0; return out; }
    const R = c.roofs[r.roof];
    if (!R) return out;
    const edge = dir > 0 ? R.x + R.w : R.x, de = (edge - r.x) * dir, Q = c.roofs[r.roof + dir];
    if (!(tx >= R.x && tx <= R.x + R.w) && Q) {
      const gw = dir > 0 ? Q.x - edge : edge - (Q.x + Q.w);
      if (gw > S.maxJump) { if (de < 28) out.dir = 0; }
      else if (Q.crumb && (Q.down > 0 || Q.ct > 0.1)) { if (de < 70) out.dir = 0; }
      else if (gw > 0 ? de < 20 : Q.y < R.y - 4 && de < 36) out.jump = true;
    }
    for (const q of c.cats) if (q.roof === r.roof && (q.x - r.x) * dir > 0 && (q.x - r.x) * dir < 64) out.jump = true;
    // a moon star hanging over this roof: hop for it (never near an edge)
    if (de > 250 && !c.cats.some(q => q.roof === r.roof && (q.x - r.x) * dir > 0 && (q.x - r.x) * dir < 330)) for (const q of c.coins) if (!q.got && Math.abs(q.y - (R.y - 86)) < 20 && (q.x - r.x) * dir > 40 && (q.x - r.x) * dir < 90) out.jump = true;
    return out;
  }

  /* ---------- camera and mirror ---------- */
  function cam(st, dt) {
    const c = st.c, a = st.run[0], b = st.run[1], g = gap(st);
    const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x);
    let tx = (lo + hi) / 2 - W / 2 + 110;
    // at a wide gap show both edges and the far roof
    if (g && (g.latched || hi > g.xL - 260) && g.xR - g.xL < 560) tx = clamp(tx, g.xR + 250 - W, g.xL - 230);
    tx = Math.min(tx, lo - 90);
    tx = clamp(tx, 0, Math.max(0, c.len - W + 40));
    st.cam.x += (tx - st.cam.x) * Math.min(1, dt * 3.4);
  }
  function mirror(st) {
    for (const r of st.run) K.place(r.id, r.x - st.cam.x, Math.min(r.y, S.street - 30));
  }

  /* ---------- drawing ---------- */
  function draw(st) {
    const cx = st.cam.x, t = st.clock, c = st.c, g = gap(st), pl = plan(st);
    K.sky(cx, t, { moonX: 700, moonY: 132, moonR: 58 });
    K.skyline(cx, { y: 446 });
    K.town(cx, { y: 492 });
    ctx.fillStyle = '#17153a'; ctx.fillRect(0, S.street - 8, W, H - S.street + 8);
    ctx.fillStyle = 'rgba(120,112,170,0.35)'; ctx.fillRect(0, S.street - 8, W, 3);
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    const see = (x0, x1) => x1 > cx - 80 && x0 < cx + W + 80;
    // hook points behind the roofs
    for (const q of c.gaps) if (see(q.xL - 60, q.xR + 60)) drawHookPoint(st, q, t);
    for (const q of c.carts) if (see(q.x - 60, q.x + 60)) K.hayCart(q.x, S.street + 4, { s: q.s, squash: q.sq });
    for (const R of c.roofs) if (see(R.x - 30, R.x + R.w + 30)) drawRoof(st, R, t);
    drawGate(st, t);
    // each wide gap's throwing strip and peg
    for (const q of c.gaps) {
      if (!see(q.xL - 200, q.xL + 20) || q.i < st.gi) continue;
      const now = q === g && !q.latched;
      ctx.globalAlpha = now ? 0.75 + 0.2 * Math.sin(t * 6) : 0.35;
      ctx.fillStyle = PCOL[st.thr]; rr(q.xL - S.zone, q.yL - 3, S.zone - 14, 6, 3); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = COL.wood; ctx.strokeStyle = COL.woodDark; ctx.lineWidth = 2; rr(q.gx - 3, q.yL - 20, 7, 22, 2); ctx.fill(); ctx.stroke();
    }
    for (const q of c.cats) if (see(q.x - 30, q.x + 30)) drawCat(q, t);
    for (const q of c.coins) if (see(q.x - 20, q.x + 20)) drawStar(q, t);
    // the aim line and the ring to throw through
    if (g && !g.latched && see(g.xL - 200, g.xR)) {
      const q = hookPt(g, t), R = catchR(st), on = pl.throwNow;
      ctx.strokeStyle = on ? '#8fe3b0' : st.gold.hook ? C.gold : 'rgba(255,255,255,0.8)'; ctx.lineWidth = on ? 5 : 3;
      ctx.setLineDash(on ? [] : [7, 7]); ctx.lineDashOffset = -t * 24; circle(q.x, q.y, R + (on ? 3 : 0)); ctx.stroke(); ctx.setLineDash([]);
      if (pl.aiming && st.hook.state === 'held') {
        const m = handOf(st.run[st.thr]), a = aimAng(st), far = Math.min(S.range, dist(m.x, m.y, q.x, q.y) + 40);
        ctx.fillStyle = on ? '#8fe3b0' : '#ffffff';
        for (let d = 26; d < far; d += 22) { circle(m.x + Math.cos(a) * d, m.y - Math.sin(a) * d, d > far - 30 ? 4.5 : 3); ctx.fill(); }
      }
    }
    ctx.restore();
  }
  function drawRoof(st, R, t) {
    if (R.crumb) {
      if (R.down > 0) {
        // fallen: only the bamboo frame is left, and it comes back with a puff
        ctx.globalAlpha = 0.5; ctx.strokeStyle = '#7a9a5a'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(R.x + 8, R.y + 16); ctx.lineTo(R.x + 8, S.street); ctx.moveTo(R.x + R.w - 8, R.y + 16); ctx.lineTo(R.x + R.w - 8, S.street); ctx.stroke();
        ctx.globalAlpha = 1; return;
      }
      const sh = R.ct > 0 ? Math.sin(t * 60) * (1 + R.ct * 3) : 0;
      ctx.strokeStyle = '#7a9a5a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(R.x + 8, R.y + 12); ctx.lineTo(R.x + 8, S.street); ctx.moveTo(R.x + R.w - 8, R.y + 12); ctx.lineTo(R.x + R.w - 8, S.street);
      ctx.moveTo(R.x + 8, R.y + 60); ctx.lineTo(R.x + R.w - 8, R.y + 110); ctx.moveTo(R.x + R.w - 8, R.y + 60); ctx.lineTo(R.x + 8, R.y + 110); ctx.stroke();
      ctx.save(); ctx.translate(sh, R.ct > 0 ? R.ct * 3 : 0);
      K.roof(R.x, R.y, R.w, { noWall: true, th: 13 });
      // cracks, so it reads as crumbly before anyone steps on it
      ctx.strokeStyle = R.ct > 0 ? '#ffffff' : 'rgba(234,242,255,0.75)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = R.x + 18; x < R.x + R.w - 12; x += 34) { ctx.moveTo(x, R.y + 1); ctx.lineTo(x + 6, R.y + 6); ctx.lineTo(x + 1, R.y + 9); ctx.lineTo(x + 8, R.y + 13); }
      ctx.stroke(); ctx.restore();
      return;
    }
    if (R.ledge) {
      K.roof(R.x + R.ledge, R.y, R.w - R.ledge);
      ctx.fillStyle = C.gold; ctx.strokeStyle = '#8a6a20'; ctx.lineWidth = 2; rr(R.x - 2, R.y, R.ledge + 8, 9, 4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(R.x + 6, R.y + 8); ctx.lineTo(R.x + R.ledge + 2, R.y + 40); ctx.stroke();
    } else K.roof(R.x, R.y, R.w);
    // a chimney pot or a roof-ridge fish here and there, for the skyline
    const h = K.hash(R.i * 7 + 3);
    if (R.w > 300 && h > 0.35) {
      const x = R.x + R.w * (0.3 + 0.4 * K.hash(R.i * 5 + 1));
      K.lantern(x, R.y - 46, t, { s: 0.9 });
      ctx.strokeStyle = COL.woodDark; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 14, R.y); ctx.lineTo(x - 14, R.y - 48); ctx.lineTo(x + 2, R.y - 48); ctx.stroke();
    }
  }
  function drawHookPoint(st, g, t) {
    const q = hookAt(st, g), done = g.i < st.gi;
    ctx.lineCap = 'round';
    if (g.kind === 'post') {
      ctx.fillStyle = COL.woodDark; ctx.fillRect(g.hx - 5, g.hy + 6, 10, S.street - g.hy);
      ctx.fillStyle = COL.wood; ctx.fillRect(g.hx - 3, g.hy + 6, 4, S.street - g.hy);
      ctx.strokeStyle = COL.woodDark; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(g.hx - 34, g.hy + 16); ctx.lineTo(g.hx + 34, g.hy + 16); ctx.stroke();
      ctx.fillStyle = COL.trim; rr(g.hx - 12, g.hy - 2, 24, 8, 3); ctx.fill();
      K.lantern(g.hx - 30, g.hy + 16, t); K.lantern(g.hx + 30, g.hy + 16, t);
    } else if (g.kind === 'sway') {
      const x0 = g.xL - 26, x1 = g.xR + 26, y0 = g.hy - 26;
      ctx.strokeStyle = COL.woodDark; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0, g.yL); ctx.lineTo(x0, y0); ctx.moveTo(x1, g.yR); ctx.lineTo(x1, y0); ctx.stroke();
      ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(q.x, q.y - 6); ctx.lineTo(x1, y0); ctx.stroke();
      K.lantern(lerp(x0, q.x, 0.5), lerp(y0, q.y - 6, 0.5), t, { s: 0.8 }); K.lantern(lerp(x1, q.x, 0.5), lerp(y0, q.y - 6, 0.5), t, { s: 0.8 });
      K.lantern(q.x, q.y + 2, t, { s: 1.5, sway: 0.4 });
    } else {
      // a kite: its string runs down to the far roof
      const kx = q.x, ky = q.y - 30;
      ctx.strokeStyle = 'rgba(234,242,255,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.quadraticCurveTo(lerp(q.x, g.xR + 90, 0.6), q.y + 40, g.xR + 90, g.yR); ctx.stroke();
      ctx.save(); ctx.translate(kx, ky); ctx.rotate(Math.sin(t * 2.1 + g.ph) * 0.12);
      ctx.fillStyle = '#e8566a'; ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(26, 0); ctx.lineTo(0, 30); ctx.lineTo(-26, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(26, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(-26, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, 30); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.stroke();
      ctx.strokeStyle = '#f2e6c8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-26, 0);
      for (let i = 1; i <= 5; i++) ctx.lineTo(-26 - i * 9, Math.sin(t * 5 + i * 1.2) * 5 + i * 3);
      ctx.stroke(); ctx.restore();
    }
    // the ring the hook bites
    ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 6; circle(q.x, q.y, 7); ctx.stroke();
    ctx.strokeStyle = done ? 'rgba(223,228,245,0.5)' : COL.steel; ctx.lineWidth = 3; circle(q.x, q.y, 7); ctx.stroke();
  }
  function drawGate(st, t) {
    const c = st.c, R = c.roofs[c.roofs.length - 1], x = c.gateX + 30, y = R.y;
    if (x < st.cam.x - 200 || x > st.cam.x + W + 200) return;
    // a little tower roof behind, then a red gate with lanterns
    ctx.fillStyle = COL.wallDark; ctx.fillRect(x + 66, y - 150, 110, 150); ctx.fillRect(x + 90, y - 214, 62, 50);
    ctx.fillStyle = COL.window; ctx.fillRect(x + 88, y - 120, 24, 30); ctx.fillRect(x + 130, y - 120, 24, 30); ctx.fillRect(x + 108, y - 62, 26, 62); ctx.fillRect(x + 110, y - 204, 22, 24);
    K.roof(x + 48, y - 168, 146, { noWall: true, th: 16 });
    K.roof(x + 76, y - 228, 90, { noWall: true, th: 14 });
    ctx.fillStyle = COL.trim; ctx.fillRect(x + 119, y - 252, 4, 26);
    ctx.fillStyle = COL.trim; ctx.strokeStyle = '#5a1c24'; ctx.lineWidth = 2;
    for (const px of [x - 56, x + 44]) { rr(px, y - 118, 12, 118, 3); ctx.fill(); ctx.stroke(); }
    rr(x - 70, y - 104, 140, 10, 3); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 86, y - 132); ctx.quadraticCurveTo(x, y - 118, x + 86, y - 132); ctx.lineTo(x + 80, y - 118); ctx.quadraticCurveTo(x, y - 106, x - 80, y - 118); ctx.closePath(); ctx.fill(); ctx.stroke();
    K.lantern(x - 30, y - 96, t); K.lantern(x + 30, y - 96, t);
    ctx.fillStyle = COL.paper; rr(x - 13, y - 96, 26, 34, 3); ctx.fill();
    K.shuriken(x, y - 79, 9, 0.4);
  }
  function drawCat(q, t) {
    const hop = q.hopT > 0 ? Math.sin((0.5 - q.hopT) / 0.5 * Math.PI) * 16 : 0, f = q.face;
    ctx.save(); ctx.translate(q.x, q.y - hop); ctx.scale(f, 1);
    ctx.fillStyle = '#f6f1e6'; ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-12, -6); ctx.quadraticCurveTo(-24, -10, -20, -24 + Math.sin(t * 3 + q.ph) * 3); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-2, -9, 13, 10, 0, 0, TAU); ctx.fill(); ctx.stroke();
    circle(9, -19, 8); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, -24); ctx.lineTo(5, -31); ctx.lineTo(9, -26); ctx.moveTo(10, -26); ctx.lineTo(14, -31); ctx.lineTo(16, -23); ctx.fill(); ctx.stroke();
    ctx.fillStyle = q.hopT > 0 ? '#1c1a36' : '#7ac86a'; circle(7, -20, 1.8); ctx.fill(); circle(12.5, -20, 1.8); ctx.fill();
    ctx.fillStyle = COL.trim; ctx.fillRect(2, -13, 10, 3);
    ctx.restore();
  }
  function drawStar(q, t) {
    if (q.got && q.t <= 0) return;
    const bob = Math.sin(t * 3 + q.x * 0.02) * 3, s = q.got ? 1 + (0.4 - q.t) * 3 : 1;
    ctx.globalAlpha = q.got ? clamp(q.t / 0.4, 0, 1) : 1;
    ctx.fillStyle = 'rgba(190,212,255,0.22)'; circle(q.x, q.y + bob, 17 * s); ctx.fill();
    ctx.fillStyle = STAR; ctx.strokeStyle = '#5a6aa8'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    K.star(q.x, q.y + bob, 11 * s, 5 * s, Math.sin(t * 2 + q.x) * 0.2); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // a runner's grip while on a rope (a short hop from where the hands were)
  function grip(st, r) {
    const g = gap(st);
    let m;
    if (r.st === 'swing' && g && g.sw) m = swingHands(g, g.sw.th);
    else m = { x: r.x, y: r.y - S.hand };
    if (r.hop > 0) { const u = K.smooth(1 - r.hop / 0.18); m = { x: lerp(r.hx, m.x, u), y: lerp(r.hy, m.y, u) }; }
    return m;
  }
  function drawRunner(st, r) {
    const id = r.id, t = st.clock + id * 0.37, g = gap(st), thr = id === st.thr, sq = r.sq > 0 ? r.sq : 0;
    const wind = 0.3 + st.wind * 0.7;
    if (r.st === 'swing' && g && g.sw) { const m = grip(st, r); K.ninja(id, m.x, m.y, { pose: 'hang', anchor: 'hands', rot: -g.sw.th, face: g.sw.om >= 0 ? 1 : -1, t, wind: clamp(Math.abs(g.sw.om) * 0.5, 0.3, 1) }); return; }
    if (r.st === 'zip') { const m = grip(st, r); K.ninja(id, m.x, m.y, { pose: 'hang', anchor: 'hands', rot: Math.sin(t * 6) * 0.14 - 0.12, face: 1, t, wind: 0.9 }); return; }
    if (r.st === 'fall') { K.ninja(id, r.x, r.y, { pose: 'dizzy', rot: r.rot, face: r.face, t }); return; }
    if (r.st === 'cart') { K.ninja(id, r.x, r.y + 10, { pose: 'dizzy', face: r.face, t }); return; }
    if (r.st === 'bounce') { K.ninja(id, r.x, r.y, { pose: 'cheer', rot: r.rot, face: r.face, t }); return; }
    if (st.state === 'end') { K.ninja(id, r.x, r.y, { pose: 'cheer', face: id === 0 ? 1 : -1, t }); return; }
    if (r.stun > 0) { K.ninja(id, r.x, r.y, { pose: 'dizzy', face: r.face, t, rot: r.rot }); return; }
    if (r.st === 'haul') { K.ninja(id, r.x, r.y, { pose: 'throw', face: -1, t, rot: 0.25 + sq * 1.6, wind }); return; }
    if (r.st === 'hold') { K.ninja(id, r.x, r.y, { pose: 'throw', face: 1, t, rot: -0.3 - sq * 1.2, wind }); return; }
    const held = thr && st.hook.state === 'held';
    if (!r.grounded) { K.ninja(id, r.x, r.y, { pose: 'run', face: r.face, t, rot: r.rot, vy: r.vy, wind: 1, item: held ? 'hook' : undefined }); return; }
    if (Math.abs(r.vx) > 40) { K.ninja(id, r.x, r.y, { pose: 'run', face: r.face, t, wind: 1, item: held ? 'hook' : undefined }); return; }
    if (thr && (r.throwT > 0 || canAim(st))) { K.ninja(id, r.x, r.y, { pose: 'throw', face: 1, t, wind, item: held ? 'hook' : undefined }); return; }
    K.ninja(id, r.x, r.y, { pose: 'idle', face: r.face, t, wind, item: held ? 'hook' : undefined });
  }
  function drawRopes(st) {
    const h = st.hook, g = gap(st), T = st.run[st.thr], Q = st.run[st.swg];
    if (h.state === 'fly' || h.state === 'back') {
      const m = handOf(T);
      K.rope(m.x, m.y, h.x, h.y, h.state === 'back' ? 26 : 6, { w: 2.6 });
      K.hook(h.x, h.y, h.state === 'fly' ? Math.atan2(h.vy, h.vx) : -Math.PI / 2 + Math.sin(st.clock * 20) * 0.5, 0.9);
      return;
    }
    if (!g || !g.latched) return;
    const q = g.hp, gold = st.gold.rope ? { col: C.gold } : {};
    // the thrower's end
    const tm = T.st === 'zip' ? grip(st, T) : T.st === 'hold' ? handOf(T) : null;
    if (tm) K.rope(tm.x, tm.y, q.x, q.y, T.st === 'zip' ? 0 : 8, st.gold.loop ? { col: C.gold } : {});
    // the swinger's end: on the peg, in the swinger's hands, or hauled from the far roof
    if (g.sw) { const m = grip(st, Q); K.rope(q.x, q.y, m.x, m.y, 0, gold); }
    else if (Q.st === 'run' && Q.fling && Q.why === 'rope') K.rope(q.x, q.y, Q.x - 8, Q.y - 22, 14, gold);   // leaping, rope's end in hand
    else if (g.across) { const m = handOf(Q); K.rope(q.x, q.y, m.x, m.y, T.st === 'zip' ? 0 : 10, gold); }
    else { K.rope(q.x, q.y, g.gx, g.gy, 12, gold); ctx.fillStyle = COL.trim; ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 2; rr(g.gx - 7, g.gy - 4, 14, 8, 3); ctx.fill(); ctx.stroke(); }
    K.hook(q.x, q.y + 4, -Math.PI / 2, 0.9);
  }
  function drawTop(st) {
    const cx = st.cam.x;
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    drawRopes(st);
    // the computer's character behind, the thrower's hook hand in front
    for (const r of st.run) drawRunner(st, r);
    K.drawParts(st, cx);
    ctx.restore();
    if (st.wind > 0.05) {
      ctx.strokeStyle = 'rgba(220,232,255,' + (0.28 * st.wind) + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i < 9; i++) { const x = W - ((st.clock * (520 + i * 40) + i * 173) % (W + 200)), y = 110 + (i * 97) % 330; ctx.moveTo(x, y); ctx.lineTo(x + 70 + i * 6, y); }
      ctx.stroke();
    }
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
      text(n, x0 + w - 15, cy, fs, STAR, 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK || 'Taking a break... press anything to go on', col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play) return;
    const pl = plan(st), g = pl.g, Tn = st.thr, Qn = st.swg, T = st.run[Tn], Q = st.run[Qn];
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(Tn, 'hook thrower', 262, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 12 * z) / 3, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Tn, 'act') + 'THROW', pl.throwNow, st.hook.state === 'fly', z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(Tn, 'act') + 'TUG', pl.tug, false, z);
      K.chip(x0 + 2 * (cw + 6 * z), cy, cw, chh, (st.gold.loop ? '' : kk(Tn, 'act')) + 'HOLD ON', pl.phase === 'pull' && !pl.holding && !st.gold.loop, pl.holding, z);
    }
    {
      const bx = K.panel(Qn, 'swinger', 262, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 12 * z) / 3, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Qn, 'act') + (pl.onRope ? 'LEAP' : 'GRAB'), pl.onRope ? pl.letGo : pl.canGrab, false, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(Qn, 'lr') + 'PUMP', false, pl.onRope && !!(G.players[Qn].input.left || G.players[Qn].input.right), z);
      K.chip(x0 + 2 * (cw + 6 * z), cy, cw, chh, kk(Qn, 'act') + 'HEAVE', pl.heave, Q.sq > 0 && Q.st === 'haul', z);
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st), cx = st.cam.x;
    const sx = r => clamp(r.x - cx, 70, W - 70), sy = r => Math.min(r.y, S.street - 60) - (r.st === 'swing' ? 96 : r.st === 'zip' ? 24 : 48);
    const free = r => r.st === 'run' && r.stun <= 0;
    {
      let s = null, col = C.gold, pulse = false;
      if (pl.phase === 'throw') {
        if (pl.aiming) { if (pl.throwNow) { s = 'Throw! ' + K.key(Tn, 'act'); pulse = true; } else { s = 'Throw ' + K.key(Tn, 'act') + ' when the ring is green'; col = '#ffe7a8'; } }
        else if (st.hook.state === 'held' && free(T) && T.roof === g.left) s = 'To the edge ' + K.key(Tn, 'right');
        else if (st.hook.state === 'held' && free(T) && T.grounded && T.x < g.xL - 400) { s = 'Run ' + K.key(Tn, 'right') + '  jump ' + K.key(Tn, 'up'); col = '#ffe7a8'; }
      } else if (pl.phase === 'swing') {
        if (pl.tug) { s = 'Tug! ' + K.key(Tn, 'act'); pulse = true; }
        else if (T.st === 'hold' && !pl.onRope && !Q.fling) { s = 'Got it! Holding the rope'; col = '#d9ffd0'; }
      } else if (pl.phase === 'pull' && !st.gold.loop) {
        if (!pl.holding) { if (T.st === 'hold') { s = 'Hold on! Hold ' + K.key(Tn, 'act'); pulse = true; } }
        else { s = 'Keep holding ' + K.key(Tn, 'act'); col = '#d9ffd0'; }
      } else if (pl.phase === 'run' && free(T) && T.grounded && T.x < pl.thr.x - 300) { s = 'To the gate ' + K.key(Tn, 'right'); col = '#ffe7a8'; }
      P.say(Tn, s, sx(T), sy(T), col, pulse);
    }
    {
      let s = null, col = C.gold, pulse = false;
      if (pl.phase === 'throw') {
        if (free(Q) && Q.roof === g.left && Q.x > g.xL - 260) { s = K.quiet(Tn) ? 'The hook is coming...' : 'Wait for ' + NAMES[Tn] + '\'s hook'; col = '#ffe7a8'; }
        else if (free(Q) && Q.grounded && Q.x < g.xL - 400) { s = 'Run ' + K.key(Qn, 'right') + '  jump ' + K.key(Qn, 'up'); col = '#ffe7a8'; }
      } else if (pl.phase === 'swing') {
        if (pl.onRope) { if (pl.letGo) { s = 'Leap! ' + K.key(Qn, 'act'); pulse = true; } else { s = 'Pump ' + K.key(Qn, pl.pump > 0 ? 'right' : 'left'); col = '#ffe7a8'; } }
        else if (pl.canGrab) { s = 'Grab the rope! ' + K.key(Qn, 'act'); pulse = true; }
        else if (free(Q) && g.settle <= 0 && !Q.fling && Q.grounded) s = 'To the rope ' + K.key(Qn, Q.x > g.xL ? 'left' : 'right');
      } else if (pl.phase === 'pull') {
        if (pl.heave) { s = 'Heave! ' + K.key(Qn, 'act'); pulse = true; }
        else if (pl.holding) { s = 'Ho...'; col = '#ffe7a8'; }
        else if (!K.quiet(Tn)) { s = 'Wait for ' + NAMES[Tn] + ' to hold on'; col = '#ffe7a8'; }
      } else if (pl.phase === 'run' && free(Q) && Q.grounded && Q.x < pl.swg.x - 300) { s = 'To the gate ' + K.key(Qn, 'right'); col = '#ffe7a8'; }
      P.say(Qn, s, sx(Q), sy(Q), col, pulse);
    }
  }
  const medal = (t, whoops, frac) => K.medal(t <= S.goldT && whoops <= 3 && frac >= 0.75, t <= S.silverT && whoops <= 10);

  MODES.roofrun = {
    S, compile, plan, nav, hookPt, medal,
    setup(st, L) {
      st.stats = { throws: 0, hits: 0, swings: 0, gaps: 0, whoops: 0, bumps: 0, tugs: 0, heaves: 0, helps: 0, roomT: [] };
      st.stars = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0;
      const def = LEVELS[G.levelIndex];
      st.totalStars = (def.rooms || [def]).reduce((n, r) => n + compile(Object.assign({}, def, r)).coins.length, 0);
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
      const frac = st.stars / (st.totalStars || 1);
      const out = [
        { label: 'Moon stars', value: st.stars + ' of ' + st.totalStars },
        { label: 'Hook throws', value: s.hits + ' of ' + s.throws },
        { label: 'Whoops', value: String(s.whoops) },
        { label: 'Medal', value: medal(G.time, s.whoops, frac) },
      ];
      out.push('Gaps crossed: ' + s.gaps + '. Tugs: ' + s.tugs + '. Cat bumps: ' + s.bumps + '.');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = thr => ({ label: 'hook', labels: thr === 0 ? ['throw', 'grab'] : ['grab', 'throw'] });
  NINJA.defs.roofrun = {
    name: 'Rooftop Moonlight Run', world: 28, kind: 'team', mode: 'roofrun', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> run / pump <kbd>W</kbd> jump',
      bo: '<kbd>←</kbd><kbd>→</kbd> run / pump <kbd>↑</kbd> jump',
      pad: 'stick runs and pumps, <span data-glyph="a"></span> jumps,',
    },
    tip: 'Thrower: hook the ring over the gap. Swinger: grab, pump ◀ ▶, leap, then heave your friend across!',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'Lantern Lane', thrower: 0, sweep: 3.0, act: acts(0),
        tip: 'Pip throws the hook, Bo swings. Throw when the ring is green, then hold on while Bo heaves!',
        course: ['r620/s330', 'g80', 'r420/c210', 'G330:post', 'r460/s250', 'g95', 'r340-20', 'G350:post', 'r520/c340', 'g100', 'r360+25/s120', 'G360:post:h210',
          'r500/s190,c330', 'g90', 'r360-20', 'G350:post:o0.38', 'r660'] },
      { title: 'Breezy Ridge', thrower: 1, wind: true, sweep: 2.7, act: acts(1),
        tip: 'Swap! Bo throws, Pip swings. Swaying lanterns: watch the ring. Gusts push back, so pump hard.',
        course: ['r560/s300', 'g100', 'r380-25/c190', 'G360:sway', 'r500/s180,c330', 'g90', 'r300+20', 'g100', 'r360', 'G380:post:o0.36', 'r520-20/s260', 'g100', 'r380/c170', 'G400:sway:h215',
          'r540+20/s200,p330', 'g100', 'r360', 'G390:post:h210:o0.38', 'r660'] },
      { title: 'Kite Alley', thrower: 0, sweep: 2.5, act: acts(0),
        tip: 'Pip throws again. Kites wander, so time the throw. Cracked roofs crumble: keep running!',
        course: ['r520/s280', 'k150', 'r340/p170', 'G380:kite', 'r480/s240', 'g110', 'r300-25', 'k160', 'r380', 'G400:kite:h215', 'r500/c330', 'g100', 'r360+25', 'G380:sway:o0.36', 'r500/p310', 'k150', 'r360', 'G420:kite:h220', 'r640'] },
      { title: 'The Moon Tower', thrower: 1, wind: true, sweep: 2.3, act: acts(1),
        tip: 'The last dash to the moon tower! Bo throws, Pip swings. Long gaps: tug and pump together.',
        course: ['r500/s260', 'g100', 'r360-25/p180', 'G420:kite:h220', 'r480/s240', 'k160', 'r360', 'G440:sway:h225:o0.38', 'r520/c350', 'g100', 'r320+25', 'k150', 'r380', 'G440:post:h225:o0.36', 'r540/s120,p330', 'g100', 'r380-20', 'G450:sway:h225',
          'r480+20/s220', 'k150', 'r340/c170', 'G460:kite:h230', 'r700'] },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.roofrunJump = function (p) { this.tone(p ? 330 : 392, 0.1, 'triangle', 0.035, p ? 520 : 620); };
  Sfx.extra.roofrunLand = function () { this.tone(150, 0.07, 'sine', 0.04, 90); };
  Sfx.extra.roofrunStar = function (p) { this.tone(1175 * p, 0.07, 'triangle', 0.035); this.tone(1568 * p, 0.1, 'triangle', 0.03, null, 0.05); };
  Sfx.extra.roofrunLatch = function () { [659, 988].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.04, null, 0.04 + i * 0.07)); };
  Sfx.extra.roofrunGrab = function () { this.tone(260, 0.08, 'triangle', 0.04, 380); };
  Sfx.extra.roofrunHeave = function (p) { this.tone(200 * p, 0.14, 'sawtooth', 0.03, 130 * p); this.tone(400 * p, 0.08, 'triangle', 0.025, 300 * p, 0.02); };
  Sfx.extra.roofrunSlip = function () { this.tone(700, 0.25, 'sine', 0.04, 220); };
  Sfx.extra.roofrunBoing = function () { this.tone(150, 0.3, 'sine', 0.06, 420); this.tone(90, 0.12, 'triangle', 0.04, 60); };
  Sfx.extra.roofrunHop = function () { this.tone(300, 0.2, 'sine', 0.04, 640); };
  Sfx.extra.roofrunCreak = function () { this.tone(190, 0.18, 'sawtooth', 0.025, 140); this.tone(230, 0.1, 'sawtooth', 0.02, 170, 0.2); };
  Sfx.extra.roofrunCrumble = function () { [220, 180, 140, 110].forEach((f, i) => this.tone(f, 0.09, 'square', 0.03, f * 0.7, i * 0.05)); };
  Sfx.extra.roofrunMeow = function () { this.tone(620, 0.12, 'sine', 0.045, 880); this.tone(880, 0.2, 'sine', 0.04, 520, 0.11); };
  Sfx.extra.roofrunFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.11)); };
})();
