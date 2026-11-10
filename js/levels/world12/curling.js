/* Pip & Bo - Level 12-1 Curling (team). */
'use strict';

/* ===== 12-1 Curling (mode 'curling', World 12 "Winter Games", teamwork) ======================================
   Top-down view of a long curling sheet: the hack (where the thrower kneels) on the left, the house (target rings)
   on the right. One player is the THROWER: ▲▼ aim, ◀▶ pick the curl, hold the action to charge a rising-and-falling
   power meter, let go to slide the stone (a release in the meter's bottom "too gentle" zone is refused). The other is
   the SWEEPER: starts out of broom reach, skates to the moving stone and holds the action beside it to sweep, and has
   to keep skating along (a direction along the stone's way) or fall behind ("Keep skating!", grabbing again needs a
   fresh press). Sweeping makes the stone go farther and curl less. Without sweeping even the
   hardest throw stops short of the house (CURLING.vMax² / 2·mu < distance to the house), so both jobs are needed.
   4 ends (rooms), 4 stones each, roles swap every end (Pip throws ends 1 and 3, Bo ends 2 and 4).
     End 1 Draw to the Button: plain ice.     End 2 Snowman Guards: a snowman and a penguin block the straight way in.
     End 3 Robot Takeout: grumpy robot stones sit in the house; knock them out (+2 each).
     End 4 Snowy Patches: snow stops an unswept stone; sweep through it (or sweep it clear first).
   Rings score 3 / 2 / 1 by where the middle of a stone stops. An end needs at least one stone in the house; otherwise
   it is replayed with gold "Lucky slick ice" (sweeping works extra well, the broom grabs the stone from farther away,
   the aim guide becomes the gold path of a well-swept stone, a gold X shows where it stops if sweeping stops; End 2
   also moves the penguin aside, then the snowman from the 2nd replay; an unswept stone still stops short).
   Stars per end (1 for any stone in the house, 2 and 3 by points), 12 in all.
   def.ownStep: the mode runs the whole tick. The players stay visible: the mode moves them (p.x / p.y).
   Only MODES.curling and Sfx.extra.curling* are visible outside this block; MODES.curling.api has helpers (the
   physics simulator) for the computer brain and bot tests. */
{
  const CURLING = {
    r: 13,                                     // stone radius (px)
    sheet: { x0: 24, x1: 936, y0: 162, y1: 438 }, lineY: 300,
    hackX: 56, relX: 100,                      // the thrower's hack and where the stone waits
    button: { x: 790, y: 300 }, rings: [22, 44, 66], ringPts: [3, 2, 1],
    hog: 560, back: 856,                       // a thrown stone must stop past the hog line; past the back line is out
    // stone physics: deceleration (px/s²) on plain ice, swept ice, lucky swept ice and unswept snow
    vMin: 200, vMax: 420, mu: 160, muSweep: 58, muLucky: 36, muSnow: 900, stopV: 4,
    curlK: 55, curlSweep: 0.35, curlLucky: 0.2, e: 0.88, guardE: 0.5,
    aimMax: 0.14, aimRate: 0.16, meterT: 1.2, minHold: 0.1, minPower: 0.3,   // a release below minPower is refused (a tap never wastes a stone)
    // the sweeper
    skateAcc: 1150, skateMax: 300, sweepMax: 270, drag: 0.9, magnetR: 50, magnetLucky: 80, attachK: 14,
    lagT: 0.6,                                 // an attached sweeper who stops skating along falls behind after this long
    brushR: 17, snowClear: 5, tapCD: 1.2,
    // flow
    stones: 4, settleT: 1.0, tallyT: 3.4, failT: 3.4, glideT: 0.7, introLock: 0.6, slideMax: 16,
    robotBonus: 2, startSpot: { x: 300, y: 426 },   // out of broom reach of the stone's path: the sweeper has to skate to it
  };
  const K = CURLING;
  const CU_ICE = '#eaf6ff', CU_ICE2 = '#d6ecfa', CU_BLUE = '#4f8fe0', CU_RED = '#ff5f6d', CU_GOLD = '#ffc53d';
  const CU_SAY_BUTTON = ['BUTTON!', 'Bullseye!', 'Right on!'];

  // ---------- small helpers ----------
  const inHouse = s => Math.hypot(s.x - K.button.x, s.y - K.button.y) <= K.rings[2];
  function ringPts(s) {
    const d = Math.hypot(s.x - K.button.x, s.y - K.button.y);
    for (let i = 0; i < 3; i++) if (d <= K.rings[i]) return K.ringPts[i];
    return 0;
  }
  // is this player's jump (A / B) coming from their own controller? A controller's A is the action here (seated thrower
  // style); on a keyboard or touch, jump (W, ↑, ▲) is "up".
  function cuPadJump(id) {
    try { const pd = padFor(padSlots(), id), s = pd && Pads.prev[pd.ix]; return !!(s && s.jump); } catch (e) { return false; }
  }
  function cuInput(p) {
    const i = p.input, pj = !!i.jump && cuPadJump(p.id);
    return { up: !!i.up || (!!i.jump && !pj), down: !!i.down, left: !!i.left, right: !!i.right, act: !!i.act || pj };
  }
  const cuCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

  // ---------- the world: stones, guards, snow (shared by the live game and the simulator) ----------
  function cuMakeStone(x, y, owner) {
    return { x, y, vx: 0, vy: 0, r: K.r, owner, moving: false, spin: 0, rot: Math.random() * 6, shot: false, swept: false, out: false,
      leaving: 0, lx: 0, ly: 0, stopT: 0, pop: 0 };
  }
  const SNOW_C = 10;   // snow cell size (px)
  function cuSnowAt(wd, x, y) {
    const sn = wd.snow; if (!sn) return 0;
    const cx = Math.floor((x - K.sheet.x0) / SNOW_C), cy = Math.floor((y - K.sheet.y0) / SNOW_C);
    if (cx < 0 || cy < 0 || cx >= sn.w || cy >= sn.h) return 0;
    return sn.a[cy * sn.w + cx];
  }
  function cuClearSnow(wd, x, y, rad, amt) {
    const sn = wd.snow; if (!sn) return 0;
    let got = 0;
    const c0 = Math.floor((x - rad - K.sheet.x0) / SNOW_C), c1 = Math.floor((x + rad - K.sheet.x0) / SNOW_C);
    const r0 = Math.floor((y - rad - K.sheet.y0) / SNOW_C), r1 = Math.floor((y + rad - K.sheet.y0) / SNOW_C);
    for (let cy = Math.max(0, r0); cy <= Math.min(sn.h - 1, r1); cy++) for (let cx = Math.max(0, c0); cx <= Math.min(sn.w - 1, c1); cx++) {
      const mx = K.sheet.x0 + (cx + 0.5) * SNOW_C, my = K.sheet.y0 + (cy + 0.5) * SNOW_C;
      if (Math.hypot(mx - x, my - y) > rad + 4) continue;
      const k = cy * sn.w + cx, a = sn.a[k];
      if (a > 0) { sn.a[k] = Math.max(0, a - amt); got += a - sn.a[k]; }
    }
    return got;
  }
  function cuMakeSnow(rects) {
    if (!rects || !rects.length) return null;
    const w = Math.ceil((K.sheet.x1 - K.sheet.x0) / SNOW_C), h = Math.ceil((K.sheet.y1 - K.sheet.y0) / SNOW_C);
    const a = new Float32Array(w * h);
    for (const [x0, y0, x1, y1] of rects) for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
      const mx = K.sheet.x0 + (cx + 0.5) * SNOW_C, my = K.sheet.y0 + (cy + 0.5) * SNOW_C;
      // soft, blobby edges (fixed per cell, so every play looks the same)
      const edge = Math.min(mx - x0, x1 - mx, my - y0, y1 - my) + ((hash(cx, cy) % 9) - 4);
      if (edge > 0) a[cy * w + cx] = Math.max(a[cy * w + cx], edge > 8 ? 1 : 0.6);
    }
    return { w, h, a };
  }

  // One physics tick for every stone. wd = { stones, guards, snow, lucky }; events(type, a, b) reports what happened
  // (live game: sounds, messages, stats; simulator: nothing). Stones flagged .swept this tick are being swept.
  function cuPhysics(wd, dt, events) {
    const ev = events || (() => {});
    for (const s of wd.stones) {
      if (s.out || !s.moving) continue;
      const sp = Math.hypot(s.vx, s.vy);
      if (sp < K.stopV) { s.vx = 0; s.vy = 0; s.moving = false; ev('stop', s); continue; }
      const dx = s.vx / sp, dy = s.vy / sp;
      let mu = s.swept ? (wd.lucky ? K.muLucky : K.muSweep) : K.mu;
      if (!s.swept && wd.snow) mu += K.muSnow * cuSnowAt(wd, s.x, s.y);
      const ns = Math.max(0, sp - mu * dt);
      // the curl: sideways, stronger as the stone slows, much weaker while swept
      const cf = clamp(1.6 - sp / 250, 0.4, 1.6) * (s.swept ? (wd.lucky ? K.curlLucky : K.curlSweep) : 1);
      const lat = s.spin * K.curlK * cf * dt;
      s.vx = dx * ns - dy * lat; s.vy = dy * ns + dx * lat;
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.rot += s.spin * dt * (0.6 + sp / 200);
      // a swept stone leaves a clean track through the snow
      if (s.swept && wd.snow) cuClearSnow(wd, s.x, s.y, s.r, 1);
    }
    // stone on stone (equal mass, a little bouncy)
    const live = wd.stones.filter(s => !s.out && !s.leaving);
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), md = a.r + b.r;
      if (d >= md || d < 0.001) continue;
      const nx = dx / d, ny = dy / d, rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      const push = (md - d) / 2;
      a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
      if (rel <= 0) continue;
      const jn = rel * (1 + K.e) / 2;
      a.vx -= jn * nx; a.vy -= jn * ny; b.vx += jn * nx; b.vy += jn * ny;
      a.moving = b.moving = true; a.spin *= 0.3; b.spin = 0;
      ev('hit', a, b, rel);
    }
    // stone on guard (snowmen and penguins stay put)
    for (const g of wd.guards || []) for (const s of live) {
      const dx = s.x - g.x, dy = s.y - g.y, d = Math.hypot(dx, dy), md = s.r + g.r;
      if (d >= md || d < 0.001) continue;
      const nx = dx / d, ny = dy / d, rel = s.vx * nx + s.vy * ny;
      s.x = g.x + nx * md; s.y = g.y + ny * md;
      if (rel < 0) { s.vx -= (1 + K.guardE) * rel * nx; s.vy -= (1 + K.guardE) * rel * ny; s.spin *= 0.3; ev('guard', s, g, -rel); }
    }
    // out of play: past the back line, or touching a side board
    for (const s of live) {
      if (s.x - s.r > K.back) { s.out = true; s.moving = false; ev('out', s, 'long'); }
      else if (s.y - s.r < K.sheet.y0 || s.y + s.r > K.sheet.y1) { s.out = true; s.moving = false; ev('out', s, 'side'); }
    }
  }
  // the stone's front (where a broom must be) and the spot beside it where an attached sweeper skates
  function cuFront(s) {
    const sp = Math.hypot(s.vx, s.vy) || 1, dx = s.vx / sp, dy = s.vy / sp;
    return { dx, dy, bx: s.x + dx * (s.r + 13), by: s.y + dy * (s.r + 13) };
  }

  /* The simulator (for the computer brain, bot tests and the aim guide): plays one throw from the hack to a stop on a
     copy of the world. shot = { aim, spin, power }; sweep(stone, t) -> true to sweep this tick (default: never).
     Returns { stone: the thrown stone's copy (x, y, out), stones: all copies, t }. */
  function cuSimulate(st, shot, sweep, opts) {
    const o = opts || {}, dt = o.dt || 1 / 120;
    const wd = { stones: st.stones.filter(s => !s.out && !s.leaving).map(s => Object.assign({}, s)), guards: st.guards,
      snow: st.snow ? { w: st.snow.w, h: st.snow.h, a: Float32Array.from(st.snow.a) } : null, lucky: !!st.lucky };
    const s = cuMakeStone(K.relX, K.lineY, 'sim');
    const v = cuSpeed(shot.power);
    s.vx = Math.cos(shot.aim) * v; s.vy = Math.sin(shot.aim) * v; s.spin = shot.spin; s.moving = true; s.shot = true;
    wd.stones.push(s);
    let t = 0;
    while (t < (o.maxT || K.slideMax) && wd.stones.some(x => x.moving && !x.out)) {
      s.swept = !!(sweep && s.moving && !s.out && sweep(s, t, wd));
      if (s.swept && wd.snow) { const f = cuFront(s); cuClearSnow(wd, f.bx, f.by, K.brushR, K.snowClear * dt); }
      cuPhysics(wd, dt, null);
      t += dt;
    }
    return { stone: s, stones: wd.stones, t };
  }
  // where this moving stone would stop if nobody swept from now on: a short simulation of it alone, with the guards
  // and the snow (the gold X on a lucky end)
  function cuCoastSim(st, s0) {
    const dt = 1 / 60, s = Object.assign({}, s0, { swept: false });
    const wd = { stones: [s], guards: st.guards, snow: st.snow ? { w: st.snow.w, h: st.snow.h, a: Float32Array.from(st.snow.a) } : null, lucky: !!st.lucky };
    for (let t = 0; t < 10 && s.moving && !s.out; t += dt) cuPhysics(wd, dt, null);
    return { x: s.x, y: s.y, out: s.out };
  }
  const cuSpeed = power => K.vMin + (K.vMax - K.vMin) * clamp(power, 0, 1);
  // where a stone moving now would stop if nobody sweeps from here on (no curl, no collisions: a quick estimate)
  function cuCoastX(s) { const sp = Math.hypot(s.vx, s.vy); return s.x + (s.vx / (sp || 1)) * sp * sp / (2 * K.mu); }

  // ---------- setup per end ----------
  function cuEnd(st, k, replay) {
    const def = G.level.def;
    st.k = k; st.def = def;
    st.thrower = def.thrower; st.sweeper = 1 - def.thrower;
    st.stones = (def.robots || []).map(([x, y]) => Object.assign(cuMakeStone(x, y, 'robot'), { face: 0 }));
    st.lucky = !!replay || (st.fails[k] || 0) > 0;
    // on a lucky replay a guard room moves guards aside (def.luckyGuards, and def.luckyGuards2 from the 2nd replay on:
    // help that grows, announced on the cards)
    const gl = cuGuardSet(def, st.lucky ? st.fails[k] || 1 : 0);
    st.guards = gl.map(([x, y, kind]) => ({ x, y, kind, r: kind === 'snowman' ? 18 : 15, wob: 0, fade: 0 }));
    st.snow = cuMakeSnow(def.snow);
    st.snowTotal = st.snow ? st.snow.a.reduce((a, b) => a + b, 0) : 0;
    st.thrown = 0; st.cur = null; st.robotsOut = 0; st.coast = null;
    st.aim = 0; st.spin = 0; st.charging = false; st.chargeT = 0; st.power = 0;
    st.phase = 'aim'; st.t = 0; st.aimT = 0; st.shortRow = 0; st.lastShot = null;
    st.idle = [0, 0]; st.prevAct = [true, true]; st.prevLR = [true, true];
    st.lunge = 0;
    const sw = st.sw = { x: K.startSpot.x, y: K.startSpot.y, vx: 0, vy: 0, face: 1, fdx: 1, fdy: 0, att: null, side: 1, sweeping: false,
      brush: false, brushT: 0, bx: 0, by: 0, glide: null, tapCD: 0, sweptShot: 0, lag: 0, needUp: false };
    cuBrushPos(sw);
    st.fx = []; st.msg = null;
    cuPlacePlayers(st);
    cuActLabels(st);
  }
  function cuGuardSet(def, fails) {
    if (fails >= 2 && def.luckyGuards2) return def.luckyGuards2;
    if (fails >= 1 && def.luckyGuards) return def.luckyGuards;
    return def.guards || [];
  }
  // the gold help's words for a replay after this many failed tries (short: card line, long: the intro pill)
  function cuHelpText(def, fails, long) {
    if (fails >= 2 && def.luckyGuards2) return long ? 'Gold help: Lucky slick ice! The snowman and penguin scooted aside.' : 'Gold path, super sweeping, and the snowman scoots aside!';
    if (def.luckyGuards) return long ? 'Gold help: Lucky slick ice! Follow the gold path. The penguin moved aside.' : 'Gold path, super sweeping, and the penguin waddles aside.';
    return long ? 'Gold help: Lucky slick ice! Follow the gold path and the gold X.' : 'Gold path, super sweeping, and a gold X where it stops.';
  }
  function cuPlacePlayers(st) {
    const th = G.players[st.thrower], sp = G.players[st.sweeper];
    for (const p of G.players) { p.alive = true; p.respawnT = 0; p.vx = 0; p.vy = 0; p.stun = 0; p.pendingJump = false; }
    // the thrower kneels at the hack, behind the stone
    th.x = K.hackX - PW / 2 + st.lunge * 34; th.y = K.lineY + 10 - PH; th.face = 1;
    sp.x = st.sw.x - PW / 2; sp.y = st.sw.y - PH; sp.face = st.sw.face;
  }
  function cuBrushPos(sw) {
    if (sw.att) return;
    sw.bx = sw.x + sw.fdx * 24; sw.by = sw.y - 4 + sw.fdy * 18;
  }

  // ---------- the touch buttons and the top-bar legend name each player's own action this end ----------
  let cuLabelEls = null;
  function cuActLabels(st) {
    try {
      if (!cuLabelEls || !cuLabelEls.every(o => document.contains(o.el))) cuLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
        const box = el.closest('[data-p]') || el.closest('.kb-only') || el.closest('.pad-only');
        const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
        return { el, id };
      });
      let changed = false;
      for (const o of cuLabelEls) {
        const want = o.id < 0 ? 'throw/sweep' : o.id === st.thrower ? 'throw' : 'sweep';
        if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
      }
      if (changed && typeof fitActLabels === 'function') fitActLabels();
    } catch (e) { /* labels stay as the framework set them */ }
  }

  // ---------- messages ----------
  function cuMsg(st, text, col, life) { st.msg = { text, col: col || C.paper, t: life || 1.8, max: life || 1.8 }; }
  function cuFx(st, x, y, text, col, size) { st.fx.push({ x, y, text, col: col || C.paper, size: size || 22, t: 1.3 }); }

  // ---------- the live tick ----------
  function cuStep(st, dt) {
    st.t += dt;
    for (const f of st.fx) { f.t -= dt; f.y -= 22 * dt; }
    st.fx = st.fx.filter(f => f.t > 0);
    if (st.msg) { st.msg.t -= dt; if (st.msg.t <= 0) st.msg = null; }
    st.cheer = Math.max(0, (st.cheer || 0) - dt);
    for (const g of st.guards) {
      g.wob = Math.max(0, g.wob - dt);
      // a guard turns see-through while a stone (or the aim guide) is behind it, so the open way looks open
      const tall = g.kind === 'snowman' ? 62 : 44;
      const behind = p => Math.abs(p[0] - g.x) < 24 && p[1] < g.y - 4 && p[1] > g.y - tall;
      const hid = st.stones.some(s => !s.out && behind([s.x, s.y])) || (st.phase === 'aim' && st.guide && st.guide.pts.some(behind));
      g.fade = clamp(g.fade + (hid ? dt : -dt) * 5, 0, 1);
    }
    for (const s of st.stones) s.pop = Math.max(0, s.pop - dt);
    st.lunge = st.phase === 'slide' ? Math.max(0, 1 - Math.abs(st.t - 0.18) / 0.5) : Math.max(0, st.lunge - dt * 2);
    const locked = G.introT > K.introLock;
    const ins = G.players.map(cuInput);
    // idle time counts only while the aim phase waits on the thrower (not during the slide or the cards)
    const waiting = st.phase === 'aim' && G.introT <= 0 && !st.sw.glide;
    for (const k of [0, 1]) {
      const a = ins[k], any = a.up || a.down || a.left || a.right || a.act;
      st.idle[k] = any || !waiting ? 0 : st.idle[k] + dt;
    }
    cuSweeper(st, ins[st.sweeper], dt, locked);
    if (st.phase === 'aim') cuThrower(st, ins[st.thrower], dt, locked);
    else st.prevAct[st.thrower] = ins[st.thrower].act;
    if (st.phase === 'slide') {
      // the robots that were bumped out of the house roll off the sheet by themselves (grumbling)
      for (const s of st.stones) if (s.leaving) {
        s.leaving += dt; s.x += s.lx * dt; s.y += s.ly * dt;
        if (s.leaving > 1.4) { s.out = true; s.leaving = 0; }
      }
      cuPhysics(st, dt, (type, a, b, v) => cuEvent(st, type, a, b, v));
      if (st.lucky && st.cur && st.cur.moving && !st.cur.out) {
        st.coastT -= dt;
        if (st.coastT <= 0) { st.coastT = 0.1; st.coast = cuCoastSim(st, st.cur); }
      } else st.coast = null;
      for (const s of st.stones) if (s.owner === 'robot' && !s.out && !s.moving && !s.leaving && !inHouse(s) && s.wasIn) cuRobotLeave(st, s);
      const busy = st.stones.some(s => !s.out && (s.moving || s.leaving));
      if (!busy || st.t > K.slideMax) {
        for (const s of st.stones) { s.moving = false; s.vx = s.vy = 0; if (s.leaving) { s.out = true; s.leaving = 0; } }
        cuShotDone(st);
      }
    } else if (st.phase === 'settle') {
      if (st.t >= K.settleT) cuNextStone(st);
    } else if (st.phase === 'tally') {
      if (st.t >= K.tallyT) {
        if (st.k < (G.level.def.roomCount || 1) - 1) nextRoom();
        else { G.level.goal = { x: K.button.x, y: K.button.y - 40 }; levelClear(); }
      }
    } else if (st.phase === 'fail') {
      if (st.t >= K.failT) {
        cuEnd(st, st.k, true);
        G.introT = 3.4;   // the end's card again, with the gold help on it
        Sfx.play('curlingLucky');
      }
    }
    cuPlacePlayers(st);
  }

  function cuThrower(st, a, dt, locked) {
    const id = st.thrower, fresh = a.act && !st.prevAct[id];
    st.prevAct[id] = a.act;
    if (locked) { st.prevLR[id] = a.left || a.right; return; }
    st.aimT += dt;
    if (a.up) st.aim = Math.max(-K.aimMax, st.aim - K.aimRate * dt);
    if (a.down) st.aim = Math.min(K.aimMax, st.aim + K.aimRate * dt);
    const lr = a.left || a.right;
    if (lr && !st.prevLR[id]) {
      const was = st.spin;
      st.spin = clamp(st.spin + (a.left ? -1 : 1), -1, 1);
      if (st.spin !== was) Sfx.play('curlingClick', id);
    }
    st.prevLR[id] = lr;
    if (!st.charging && fresh) { st.charging = true; st.chargeT = 0; Sfx.play('curlingCharge', id); }
    if (st.charging) {
      st.chargeT += dt;
      const ph = (st.chargeT / K.meterT) % 2;
      st.power = ph < 1 ? ph : 2 - ph;
      if (!a.act) {
        st.charging = false;
        if (st.chargeT < K.minHold) { cuFx(st, K.relX + 40, K.lineY - 60, 'Hold to charge!', C.paper, 18); return; }
        // too gentle to ever reach the house: the stone stays at the hack
        if (st.power < K.minPower) { cuFx(st, K.relX + 60, K.lineY - 60, 'Too gentle! Hold longer', C.paper, 18); Sfx.play('curlingClick', id); st.power = 0; return; }
        cuThrow(st);
      }
    }
  }
  function cuThrow(st) {
    const s = cuMakeStone(K.relX, K.lineY, st.thrower), v = cuSpeed(st.power);
    s.vx = Math.cos(st.aim) * v; s.vy = Math.sin(st.aim) * v; s.spin = st.spin; s.moving = true; s.shot = true;
    st.stones.push(s); st.cur = s; st.thrown++;
    st.phase = 'slide'; st.t = 0; st.sw.sweptShot = 0; st.sw.lag = 0; st.shotHits = 0; st.shotGuard = null; st.coast = null; st.coastT = 0;
    st.stats.throws[st.thrower]++;
    for (const r of st.stones) if (r.owner === 'robot') r.wasIn = inHouse(r);
    Sfx.play('curlingThrow', st.thrower); rumble(st.thrower, 0.1, 0.3, 90);
  }

  function cuSweeper(st, a, dt, locked) {
    const sw = st.sw, id = st.sweeper, p = G.players[id];
    sw.tapCD = Math.max(0, sw.tapCD - dt);
    if (sw.glide) {
      // between stones the sweeper whooshes back to the start spot
      const g = sw.glide; g.t += dt;
      const f = clamp(g.t / K.glideT, 0, 1), e = f * f * (3 - 2 * f);
      sw.x = g.x0 + (K.startSpot.x - g.x0) * e; sw.y = g.y0 + (K.startSpot.y - g.y0) * e;
      sw.vx = sw.vy = 0; sw.face = K.startSpot.x < g.x0 ? -1 : 1; sw.fdx = 1; sw.fdy = 0;
      if (f >= 1) { sw.glide = null; sw.face = 1; }
      sw.att = null; sw.sweeping = false; sw.brush = false; cuBrushPos(sw);
      return;
    }
    const act = a.act && !locked && st.phase !== 'tally' && st.phase !== 'fail';
    if (!a.act) sw.needUp = false;
    // which moving stone the broom can grab (the nearest moving stone whose side spot is close)
    const magR = st.lucky ? K.magnetLucky : K.magnetR;
    if (!act && sw.att) {
      // letting go: the sweeper glides off to the side of the stone's path, so a release never bumps it
      const s = sw.att;
      if (s.moving && !s.out) { const f = cuFront(s); sw.vx = s.vx * 0.8 - f.dy * 70 * sw.side; sw.vy = s.vy * 0.8 + f.dx * 70 * sw.side; sw.tapCD = Math.max(sw.tapCD, 0.8); }
      sw.att = null;
    }
    if (act && !sw.needUp && st.phase === 'slide' && !(sw.att && sw.att.moving && !sw.att.out)) {
      sw.att = null; let best = magR;
      for (const s of st.stones) {
        if (!s.moving || s.out || s.leaving) continue;
        const f = cuFront(s);
        const side = ((sw.x - s.x) * -f.dy + (sw.y - s.y) * f.dx) >= 0 ? 1 : -1;
        const ax = s.x + f.dx * 20 - f.dy * 26 * side, ay = s.y + f.dy * 20 + f.dx * 26 * side;
        const d = Math.hypot(ax - sw.x, ay - sw.y);
        if (d < best) { best = d; sw.att = s; sw.side = side; }
      }
      if (sw.att) Sfx.play('curlingGrab', id);
    }
    for (const s of st.stones) s.swept = false;
    sw.sweeping = false;
    if (sw.att && (!sw.att.moving || sw.att.out)) sw.att = null;
    if (sw.att) {
      // keeping up takes skating: hold a direction along the stone's way (→ on a straight shot), or fall behind
      const jx = (a.right ? 1 : 0) - (a.left ? 1 : 0), jy = (a.down ? 1 : 0) - (a.up ? 1 : 0), jn = Math.hypot(jx, jy);
      const f0 = cuFront(sw.att);
      if (jn > 0 && (jx * f0.dx + jy * f0.dy) / jn > 0.2) sw.lag = 0; else sw.lag += dt;
      if (sw.lag > K.lagT) {
        const s = sw.att;
        sw.vx = s.vx * 0.5 - f0.dy * 60 * sw.side; sw.vy = s.vy * 0.5 + f0.dx * 60 * sw.side; sw.tapCD = Math.max(sw.tapCD, 0.8);
        sw.att = null; sw.lag = 0; sw.needUp = true;   // grabbing again takes a fresh press
        cuFx(st, sw.x, sw.y - 50, cuCpu(id) ? 'Whoops!' : 'Keep skating!', PCOL[id], 16);
      }
    }
    if (sw.att) {
      // sweeping: skate along beside the stone with the broom just in front of it
      const s = sw.att, f = cuFront(s);
      // keep the stone side the sweeper is on, unless it would push them into the boards
      let side = sw.side;
      const sy = s.y + f.dx * 26 * side;
      if (sy > K.sheet.y1 - 8 || sy < K.sheet.y0 + 20) side = -side;
      sw.side = side;
      const ax = s.x + f.dx * 20 - f.dy * 26 * side, ay = s.y + f.dy * 20 + f.dx * 26 * side;
      const k = 1 - Math.exp(-K.attachK * dt);
      sw.x += (ax - sw.x) * k + s.vx * dt; sw.y += (ay - sw.y) * k + s.vy * dt;
      sw.vx = s.vx; sw.vy = s.vy; sw.face = s.vx >= 0 ? 1 : -1; sw.fdx = f.dx; sw.fdy = f.dy;
      sw.bx = f.bx; sw.by = f.by;
      if (Math.hypot(ax - sw.x, ay - sw.y) < 34) {
        s.swept = true; sw.sweeping = true; sw.sweptShot += dt;
        st.stats.sweepT[id] += dt;
        if (st.snow) cuClearSnow(st, f.bx, f.by, K.brushR, K.snowClear * dt);
      }
    } else {
      // skating: slippery and a bit floaty
      let ix = (a.right ? 1 : 0) - (a.left ? 1 : 0), iy = (a.down ? 1 : 0) - (a.up ? 1 : 0);
      if (locked || st.phase === 'tally' || st.phase === 'fail') { ix = 0; iy = 0; }
      const n = Math.hypot(ix, iy);
      if (n > 0) {
        ix /= n; iy /= n;
        sw.vx += ix * K.skateAcc * dt; sw.vy += iy * K.skateAcc * dt;
        // turning bites a little, so steering feels possible on ice
        const sp = Math.hypot(sw.vx, sw.vy);
        if (sp > 1) { const along = sw.vx * ix + sw.vy * iy; sw.vx += (ix * along - sw.vx) * 2.2 * dt; sw.vy += (iy * along - sw.vy) * 2.2 * dt; }
        sw.fdx = ix; sw.fdy = iy; if (ix) sw.face = ix > 0 ? 1 : -1;
      } else { const d = Math.exp(-K.drag * dt); sw.vx *= d; sw.vy *= d; }
      const mx = act ? K.sweepMax : K.skateMax, sp = Math.hypot(sw.vx, sw.vy);
      if (sp > mx) { sw.vx *= mx / sp; sw.vy *= mx / sp; }
      sw.x += sw.vx * dt; sw.y += sw.vy * dt;
      cuBrushPos(sw);
      // brushing the ice anywhere clears snow (sweep a path before the throw)
      if (act && st.snow) {
        const got = cuClearSnow(st, sw.bx, sw.by, K.brushR, K.snowClear * dt);
        if (got > 0 && Math.random() < 0.5) puff(sw.bx, sw.by, 1, '#ffffff');
      }
      // a moving stone the sweeper skates over gets a gentle nudge (never a hurt)
      for (const s of st.stones) {
        if (!s.moving || s.out || s.leaving || sw.tapCD > 0) continue;
        if (Math.hypot(s.x - sw.x, s.y - sw.y) < s.r + 5) {
          s.vx *= 0.9; s.vy = s.vy * 0.9 + (sw.y < s.y ? 18 : -18); sw.tapCD = K.tapCD;
          st.stats.taps++; cuFx(st, s.x, s.y - 30, 'Oops, tapped it!', C.paper, 16); Sfx.play('curlingTap', id);
        }
      }
    }
    sw.brush = act; if (act) sw.brushT += dt;
    // the boards
    const bx0 = K.sheet.x0 + 12, bx1 = K.sheet.x1 - 12, by0 = K.sheet.y0 + 16, by1 = K.sheet.y1 - 6;
    if (sw.x < bx0) { sw.x = bx0; sw.vx = Math.abs(sw.vx) * 0.4; }
    if (sw.x > bx1) { sw.x = bx1; sw.vx = -Math.abs(sw.vx) * 0.4; }
    if (sw.y < by0) { sw.y = by0; sw.vy = Math.abs(sw.vy) * 0.4; }
    if (sw.y > by1) { sw.y = by1; sw.vy = -Math.abs(sw.vy) * 0.4; }
    // the hack is the thrower's spot
    // (pushed out of its nearest side: coming in from above or below used to snap the sweeper up to 84 px to the right)
    if (sw.x < 120 && Math.abs(sw.y - K.lineY) < 30) {
      const ox = 120 - sw.x, oy = 30 - Math.abs(sw.y - K.lineY), up = sw.y < K.lineY;
      if (oy < ox) { sw.y = K.lineY + (up ? -30 : 30); sw.vy = (up ? -1 : 1) * Math.abs(sw.vy) * 0.4; }
      else { sw.x = 120; sw.vx = Math.abs(sw.vx) * 0.4; }
    }
    if (sw.sweeping && Math.random() < 0.35) puff(sw.bx, sw.by, 1, 'rgba(255,255,255,0.9)');
    if (sw.brush && Math.floor(sw.brushT / 0.16) !== Math.floor((sw.brushT - dt) / 0.16)) Sfx.play('curlingSweep', id);
    p.face = sw.face;
  }

  function cuEvent(st, type, a, b, v) {
    if (type === 'hit') {
      st.shotHits++;
      Sfx.play('curlingClack'); G.shake = Math.min(0.15, 0.02 + v / 3000);
      burst((a.x + b.x) / 2, (a.y + b.y) / 2, '#ffffff', 6);
      for (const s of [a, b]) if (s.owner === 'robot') { s.face = 1.2; Sfx.play('curlingRobot'); }
    } else if (type === 'guard') {
      b.wob = 0.6; Sfx.play('curlingPoof'); puff(a.x, a.y, 8, '#ffffff');
      if (a === st.cur && !st.shotGuard) st.shotGuard = b.kind;
      cuFx(st, b.x, b.y - 54, b.kind === 'snowman' ? 'Poof!' : 'Squawk!', C.paper, 18);
    } else if (type === 'out') {
      puff(a.x, a.y, 8, '#ffffff');
      if (a.owner === 'robot') cuRobotOut(st, a);
      else if (a.shot && a === st.cur) st.lastOut = b;
      else Sfx.play('curlingOut');
    }
  }
  function cuRobotLeave(st, s) {
    // bumped out of the house and stopped: it beeps and trundles off the nearest side
    const dir = s.y < K.lineY ? -1 : 1;
    s.leaving = 0.001; s.lx = 0; s.ly = dir * 150; s.face = 1.4;
    cuRobotOut(st, s);
  }
  function cuRobotOut(st, s) {
    if (s.counted) return;
    s.counted = true; st.robotsOut++; st.stats.robots++;
    cuFx(st, s.x, s.y - 36, 'Bzzt! +' + K.robotBonus, CU_GOLD, 22);
    Sfx.play('curlingBonk'); st.cheer = 1.4;
  }

  function cuShotDone(st) {
    const s = st.cur;
    st.phase = 'settle'; st.t = 0;
    // a thrown stone has to cross the hog line
    if (s && !s.out && s.x < K.hog) { s.out = true; puff(s.x, s.y, 10, '#ffffff'); st.lastOut = 'short'; }
    const res = !s ? 'none' : s.out ? (st.lastOut || 'side') : inHouse(s) ? 'house' : 'guard';
    st.lastShot = { res, pts: s && !s.out ? ringPts(s) : 0, swept: st.sw.sweptShot };
    st.lastOut = null;
    const sweeperName = NAMES[st.sweeper], cpuS = cuCpu(st.sweeper);
    // a stone that bounced off a guard and missed: the advice is about the guard, not the sweeping
    if (res !== 'house' && st.shotGuard) {
      if (res === 'short') { st.shortRow = 0; st.stats.short++; }
      cuMsg(st, st.shotGuard === 'snowman' ? 'Bonk! Snowman in the way. Aim beside it!' : 'Squawk! Curl around the penguin!', C.paper, 2.6);
      Sfx.play('curlingOut');
      return;
    }
    if (res === 'house') {
      const pts = ringPts(s); s.pop = 1.2; st.cheer = 1.6; st.shortRow = 0;
      if (pts === 3) { st.stats.buttons++; cuMsg(st, CU_SAY_BUTTON[st.stats.buttons % 3] + ' +3', CU_GOLD); Sfx.play('curlingButton'); }
      else { cuMsg(st, 'In the house! +' + pts, C.paper); Sfx.play('curlingHouse'); }
    } else if (res === 'short') {
      st.shortRow++; st.stats.short++;
      cuMsg(st, cpuS ? 'Too short!' : st.sw.sweptShot < 0.3 ? 'Too short! ' + sweeperName + ': sweep in front!' : 'Too short! Sweep longer!', C.paper, 2.4);
      Sfx.play('curlingOut');
    } else if (res === 'long') { st.stats.long++; cuMsg(st, cpuS || st.sw.sweptShot < 0.3 ? 'Too long!' : 'Too long! Stop sweeping sooner', C.paper, 2.2); Sfx.play('curlingOut'); }
    else if (res === 'side') { cuMsg(st, 'Off the side!', C.paper); Sfx.play('curlingOut'); }
    else if (res === 'guard') { cuMsg(st, 'Short of the house', C.paper); st.shortRow = 0; }
  }

  function cuNextStone(st) {
    if (st.thrown >= K.stones) { cuEndDone(st); return; }
    st.phase = 'aim'; st.t = 0; st.aimT = 0; st.cur = null; st.charging = false; st.power = 0;
    const sw = st.sw;
    if (Math.hypot(sw.x - K.startSpot.x, sw.y - K.startSpot.y) > 60) sw.glide = { t: 0, x0: sw.x, y0: sw.y };
    sw.att = null; sw.vx = sw.vy = 0;
    st.stones = st.stones.filter(s => !s.out);
    if (st.thrown === K.stones - 1) cuMsg(st, st.k === (G.level.def.roomCount || 1) - 1 ? 'Final stone!' : 'Last stone of the end!', CU_GOLD, 1.6);
  }

  // live score of the end so far: rings for your stones plus robot bonuses
  function cuEndScore(st) {
    let pts = 0, n = 0;
    for (const s of st.stones) if (!s.out && s.owner !== 'robot' && !s.moving) { const v = ringPts(s); if (v) { pts += v; n++; } }
    return { pts: pts + st.robotsOut * K.robotBonus, inHouse: n };
  }
  function cuStarsFor(st, sc) {
    if (!sc.inHouse) return 0;
    const th = st.def.stars || [5, 8];
    return 1 + (sc.pts >= th[0] ? 1 : 0) + (sc.pts >= th[1] ? 1 : 0);
  }
  function cuEndDone(st) {
    const sc = cuEndScore(st);
    st.t = 0;
    if (!sc.inHouse) {
      st.phase = 'fail'; st.fails[st.k] = (st.fails[st.k] || 0) + 1; st.stats.replays++;
      Sfx.play('curlingFail');
      return;
    }
    const stars = cuStarsFor(st, sc);
    st.endStars[st.k] = stars; st.endPts[st.k] = sc.pts; st.total += sc.pts;
    st.phase = 'tally'; st.tallyStars = 0; st.cheer = 2;
    Sfx.play('curlingEnd');
  }

  // ---------- drawing ----------
  function cuStar(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath();
  }
  function cuFlake(x, y, r, col, lw) {
    ctx.strokeStyle = col; ctx.lineWidth = lw || 1.6; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, cx = Math.cos(a), sy = Math.sin(a);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cx * r, y + sy * r); ctx.stroke();
      const mx = x + cx * r * 0.6, my = y + sy * r * 0.6, b = r * 0.3;
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(a + 0.7) * b, my + Math.sin(a + 0.7) * b);
      ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(a - 0.7) * b, my + Math.sin(a - 0.7) * b); ctx.stroke();
    }
  }
  function cuPenguin(x, y, s, hop, flap) {
    ctx.save(); ctx.translate(x, y - hop); ctx.scale(s, s);
    ctx.fillStyle = '#26324a'; ctx.beginPath(); ctx.ellipse(0, -14, 10, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -11, 6.5, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#26324a';
    ctx.save(); ctx.translate(-9, -16); ctx.rotate(0.5 + flap); ctx.beginPath(); ctx.ellipse(0, 4, 3, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(9, -16); ctx.rotate(-0.5 - flap); ctx.beginPath(); ctx.ellipse(0, 4, 3, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#fff'; circle(-3, -21, 2.4); ctx.fill(); circle(3, -21, 2.4); ctx.fill();
    ctx.fillStyle = C.ink; circle(-3, -20.6, 1.2); ctx.fill(); circle(3, -20.6, 1.2); ctx.fill();
    ctx.fillStyle = '#ffa53d'; ctx.beginPath(); ctx.moveTo(-3, -17); ctx.lineTo(3, -17); ctx.lineTo(0, -13.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffa53d'; ctx.beginPath(); ctx.ellipse(-4, 0, 3.5, 1.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(4, 0, 3.5, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function cuSeal(x, y, s, hop, clap) {
    ctx.save(); ctx.translate(x, y - hop); ctx.scale(s, s);
    ctx.fillStyle = '#8c9bb0'; ctx.beginPath(); ctx.ellipse(0, -10, 12, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -21, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b8c4d4'; ctx.beginPath(); ctx.ellipse(0, -8, 7, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6f7d92';
    ctx.save(); ctx.translate(-9, -10); ctx.rotate(-0.9 + clap); ctx.beginPath(); ctx.ellipse(0, -5, 3, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(9, -10); ctx.rotate(0.9 - clap); ctx.beginPath(); ctx.ellipse(0, -5, 3, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = C.ink; circle(-3, -23, 1.6); ctx.fill(); circle(3, -23, 1.6); ctx.fill();
    ctx.fillStyle = '#3c4256'; circle(0, -19.5, 1.8); ctx.fill();
    ctx.restore();
  }
  function cuSnowman(g) {
    const w = Math.sin(g.wob * 30) * g.wob * 0.25;
    ctx.save(); ctx.translate(g.x, g.y); ctx.globalAlpha = 1 - 0.55 * (g.fade || 0);
    ctx.fillStyle = 'rgba(60,90,130,0.18)'; ctx.beginPath(); ctx.ellipse(0, 4, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(w);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#b8d2ea'; ctx.lineWidth = 2;
    circle(0, -6, 16); ctx.fill(); ctx.stroke();
    circle(0, -27, 11.5); ctx.fill(); ctx.stroke();
    circle(0, -43, 8.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink; circle(-3, -45, 1.4); ctx.fill(); circle(3, -45, 1.4); ctx.fill();
    for (const by of [-30, -24]) { circle(0, by, 1.5); ctx.fill(); }
    ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.moveTo(0, -42.5); ctx.lineTo(9, -41); ctx.lineTo(0, -40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9425a'; ctx.fillRect(-9, -36, 18, 4); ctx.fillRect(4, -34, 4, 9);
    ctx.fillStyle = '#3a3f66'; ctx.fillRect(-7, -58, 14, 9); ctx.fillRect(-10, -50, 20, 3);
    ctx.restore();
  }
  function cuStone(s, alpha) {
    const fade = s.leaving ? clamp(1 - s.leaving / 1.4, 0, 1) : 1;
    ctx.save(); ctx.globalAlpha = (alpha == null ? 1 : alpha) * fade; ctx.translate(s.x, s.y);
    const pop = s.pop > 0 ? 1 + 0.18 * Math.sin((1.2 - s.pop) * 12) * s.pop : 1;
    ctx.scale(pop, pop);
    ctx.fillStyle = 'rgba(40,70,110,0.22)'; circle(1.5, 2.5, s.r + 1); ctx.fill();
    if (s.owner === 'robot') {
      ctx.fillStyle = '#e04a55'; circle(0, 0, s.r); ctx.fill();
      ctx.strokeStyle = '#8f2032'; ctx.lineWidth = 2; circle(0, 0, s.r); ctx.stroke();
      ctx.fillStyle = '#ff7b84'; circle(-3, -4, s.r * 0.45); ctx.fill();
      // antenna
      ctx.strokeStyle = '#5b5f7a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -s.r + 2); ctx.lineTo(0, -s.r - 6); ctx.stroke();
      ctx.fillStyle = (G.clock * 3) % 1 < 0.5 ? '#ffe066' : '#ff9f43'; circle(0, -s.r - 7, 2.6); ctx.fill();
      // grumpy face (dizzy after a bump)
      const dizzy = (s.face || 0) > 0.2 || s.leaving;
      ctx.fillStyle = '#fff'; rr(-8, -4, 16, 7, 3); ctx.fill();
      ctx.fillStyle = C.ink;
      if (dizzy) { ctx.font = '700 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('x  x', 0, -0.5); }
      else { circle(-4, 0, 1.6); ctx.fill(); circle(4, 0, 1.6); ctx.fill(); }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(-8, -7); ctx.lineTo(-2, -5); ctx.moveTo(8, -7); ctx.lineTo(2, -5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, 7.5); ctx.quadraticCurveTo(0, dizzy ? 9 : 5, 4, 7.5); ctx.stroke();
    } else {
      const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, s.r);
      g.addColorStop(0, '#b9c0cf'); g.addColorStop(1, '#7d8598');
      ctx.fillStyle = g; circle(0, 0, s.r); ctx.fill();
      ctx.strokeStyle = '#535a6e'; ctx.lineWidth = 1.6; circle(0, 0, s.r); ctx.stroke();
      ctx.fillStyle = s.owner === 0 || s.owner === 1 ? PCOL[s.owner] : '#bbb';
      circle(0, 0, s.r * 0.62); ctx.fill();
      ctx.strokeStyle = s.owner === 0 || s.owner === 1 ? PDARK[s.owner] : '#888'; ctx.lineWidth = 1.5; circle(0, 0, s.r * 0.62); ctx.stroke();
      // the handle shows the spin
      ctx.rotate(s.rot); ctx.fillStyle = '#ffffff'; rr(-2.5, -s.r * 0.75, 5, s.r * 1.1, 2.5); ctx.fill();
      ctx.fillStyle = 'rgba(28,26,54,0.35)'; circle(0, 0, 2.2); ctx.fill();
    }
    ctx.restore();
  }

  function cuDrawArena(st) {
    const S = K.sheet, big = hudBig();
    // sky and far mountains
    const sky = ctx.createLinearGradient(0, 0, 0, 120);
    sky.addColorStop(0, C.skyTop); sky.addColorStop(1, C.skyBot);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 130);
    ctx.fillStyle = C.hillFar; ctx.beginPath(); ctx.moveTo(0, 70);
    for (let x = 0; x <= W; x += 60) ctx.lineTo(x, 40 + ((hash(x, 1) % 34)) + (x % 120 ? 18 : 0));
    ctx.lineTo(W, 130); ctx.lineTo(0, 130); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let x = 0; x <= W; x += 120) { const y = 40 + (hash(x, 1) % 34); ctx.beginPath(); ctx.moveTo(x - 12, y + 9); ctx.lineTo(x, y); ctx.lineTo(x + 12, y + 9); ctx.closePath(); ctx.fill(); }
    // the stands with the crowd (penguins and seals)
    ctx.fillStyle = '#5d7fa8'; ctx.fillRect(0, 74, W, 82);
    for (let r = 0; r < 3; r++) { ctx.fillStyle = r % 2 ? '#6c8fba' : '#7a9cc6'; ctx.fillRect(0, 84 + r * 22, W, 12); }
    const ch = st.cheer || 0;
    for (let r = 0; r < 3; r++) for (let i = 0; i < 24; i++) {
      const x = 22 + i * 40 + (r % 2) * 20, y = 98 + r * 22, h = hash(i, r), bob = ch > 0 ? Math.abs(Math.sin(G.clock * 10 + i + r)) * 6 * Math.min(1, ch) : Math.abs(Math.sin(G.clock * 1.5 + h)) * 1.2;
      if (h % 3 === 0) cuSeal(x, y, 0.62, bob, ch > 0 ? Math.sin(G.clock * 16 + i) * 0.5 : 0);
      else cuPenguin(x, y, 0.62, bob, ch > 0 ? Math.sin(G.clock * 18 + i) * 0.6 : 0);
    }
    // the banner on the boards: a row of snowflakes (Winter Games, no real logos or rings)
    ctx.fillStyle = '#2f4f7f'; ctx.fillRect(0, 140, W, 22);
    const flakeCols = ['#9fd8ff', '#ffffff', '#c9b8ff', '#7fe0d8', '#d6e2f0'];
    const bx = W / 2;
    ctx.font = '15px "Lilita One", "Arial Rounded MT Bold", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff'; ctx.fillText('WINTER  GAMES', bx - 160, 151.5); ctx.fillText('CURLING', bx + 170, 151.5);
    for (let i = 0; i < 5; i++) cuFlake(bx - 50 + i * 25, 151, 7, flakeCols[i], 1.6);
    for (const x of [70, 200, 760, 890]) cuFlake(x, 151, 6, 'rgba(255,255,255,0.75)', 1.4);
    // snow bank at the bottom
    ctx.fillStyle = '#f4fbff'; ctx.fillRect(0, S.y1, W, H - S.y1);
    ctx.fillStyle = '#ddeefa';
    for (let x = -20; x < W + 40; x += 46) { circle(x, S.y1 + 34 + (hash(x, 9) % 12), 28); ctx.fill(); }
    ctx.fillStyle = '#ffffff';
    for (let x = 0; x < W + 40; x += 38) { circle(x, S.y1 + 48 + (hash(x, 4) % 14), 24); ctx.fill(); }
    // cheering penguins and seals on the snow bank (away from the middle, where touch players look)
    const fans = [[70, 510, 0], [120, 520, 1], [250, 512, 0], [395, 522, 0], [560, 516, 1], [700, 520, 0], [840, 512, 1], [900, 522, 0]];
    fans.forEach(([x, y, k], i) => {
      const bob = ch > 0 ? Math.abs(Math.sin(G.clock * 9 + i * 1.3)) * 10 * Math.min(1, ch) : 0;
      if (k) cuSeal(x, y, 1, bob, ch > 0 ? Math.sin(G.clock * 15 + i) * 0.6 : 0); else cuPenguin(x, y, 1, bob, ch > 0 ? Math.sin(G.clock * 17 + i) * 0.7 : 0);
    });
    // little flags in the snow
    for (const [x, col] of [[180, '#9fd8ff'], [470, '#c9b8ff'], [770, '#7fe0d8']]) {
      ctx.strokeStyle = '#6b7a99'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 500); ctx.lineTo(x, 466); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, 466); ctx.lineTo(x + 18, 472 + Math.sin(G.clock * 3 + x) * 2); ctx.lineTo(x, 478); ctx.closePath(); ctx.fill();
    }
    // the sheet: boards, ice, lines and the house
    ctx.fillStyle = '#c99760'; ctx.fillRect(S.x0 - 10, S.y0 - 4, S.x1 - S.x0 + 20, S.y1 - S.y0 + 10);
    const ice = ctx.createLinearGradient(0, S.y0, 0, S.y1);
    ice.addColorStop(0, CU_ICE); ice.addColorStop(0.5, '#f6fbff'); ice.addColorStop(1, CU_ICE2);
    ctx.fillStyle = ice; ctx.fillRect(S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0);
    ctx.fillStyle = st.lucky ? 'rgba(255,215,90,0.35)' : 'rgba(150,190,225,0.35)';
    for (let k = 0; k < 160; k++) { const x = S.x0 + (hash(k, 11) % (S.x1 - S.x0)), y = S.y0 + (hash(k, 13) % (S.y1 - S.y0)); circle(x, y, st.lucky ? 1.6 : 1.1); ctx.fill(); }
    ctx.strokeStyle = 'rgba(160,200,230,0.5)'; ctx.lineWidth = 1;
    for (let k = 0; k < 18; k++) { const x = S.x0 + (hash(k, 21) % (S.x1 - S.x0 - 60)), y = S.y0 + 10 + (hash(k, 23) % (S.y1 - S.y0 - 20)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30 + (k % 3) * 12, y + (k % 2 ? 4 : -3)); ctx.stroke(); }
    // house rings
    const B = K.button;
    ctx.fillStyle = CU_BLUE; circle(B.x, B.y, K.rings[2]); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(B.x, B.y, K.rings[1]); ctx.fill();
    ctx.fillStyle = CU_RED; circle(B.x, B.y, K.rings[0]); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(B.x, B.y, 7); ctx.fill();
    // ring values (small, so kids can read what each ring is worth)
    ctx.font = '700 11px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillText('1', B.x + 45, B.y - 38);
    ctx.fillStyle = 'rgba(79,143,224,0.9)'; ctx.fillText('2', B.x + 33, B.y - 22);
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillText('3', B.x + 13, B.y - 10);
    // lines: centre, tee, hog (red), back, and the hack
    ctx.strokeStyle = 'rgba(40,70,110,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(K.hackX + 14, K.lineY); ctx.lineTo(K.back + 30, K.lineY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(B.x, S.y0); ctx.lineTo(B.x, S.y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(K.back, S.y0); ctx.lineTo(K.back, S.y1); ctx.stroke();
    ctx.strokeStyle = 'rgba(230,80,100,0.75)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(K.hog, S.y0); ctx.lineTo(K.hog, S.y1); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,70,110,0.3)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(150, S.y0); ctx.lineTo(150, S.y1); ctx.stroke();
    ctx.fillStyle = '#2c2a40'; rr(K.hackX - 14, K.lineY - 16, 10, 12, 3); ctx.fill(); rr(K.hackX - 14, K.lineY + 4, 10, 12, 3); ctx.fill();
    // the hog line's label (once per end, at the start)
    if (!big) {
      ctx.font = '700 10px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.fillStyle = 'rgba(200,60,80,0.7)';
      ctx.save(); ctx.translate(K.hog - 8, S.y1 - 34); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('HOG LINE', 0, 0); ctx.restore();
    }
    // snow patches
    if (st.snow) {
      const sn = st.snow;
      for (let cy = 0; cy < sn.h; cy++) for (let cx = 0; cx < sn.w; cx++) {
        const a = sn.a[cy * sn.w + cx]; if (a <= 0.02) continue;
        const x = S.x0 + (cx + 0.5) * SNOW_C, y = S.y0 + (cy + 0.5) * SNOW_C, h = hash(cx, cy);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.55 + 0.45 * a).toFixed(2) + ')';
        circle(x + (h % 5) - 2, y + ((h >> 3) % 5) - 2, 4 + 4 * a); ctx.fill();
        if (a > 0.5 && h % 4 === 0) { ctx.fillStyle = 'rgba(170,205,235,0.6)'; circle(x + 2, y + 3, 2.2); ctx.fill(); }
      }
    }
  }

  // the thrower's aim arrow, curl arrow and power meter
  function cuDrawAim(st) {
    if (st.phase !== 'aim' || G.introT > K.introLock) return;
    const x = K.relX, y = K.lineY, a = st.aim;
    // the guide: dashed, bending the way the stone curls (a gentle, swept-ish path)
    // plain ends: a fixed-length guide that reaches past the hog line to the guards. Lucky ends (gold help): the whole
    // path of a well-swept stone, bounces off guards included (worked out at most 10 times a second)
    const g0 = st.guide, same = g0 && g0.aim === st.aim && g0.spin === st.spin && g0.lucky === st.lucky && g0.n === st.thrown;
    let pts = g0 && (same || (st.lucky && G.clock - g0.at < 0.1)) ? g0.pts : null;
    if (!pts) {
      pts = [];
      if (st.lucky) {
        let n = 0;
        cuSimulate(st, { aim: a, spin: st.spin, power: 0.8 }, s => { if (n++ % 6 === 0) pts.push([s.x, s.y]); return cuCoastX(s) < K.button.x; });
        if (pts.length < 3) pts = [[x + 10, y], [x + 20, y], [x + 30, y]];
      } else {
        let px = x, py = y, vx = Math.cos(a), vy = Math.sin(a);
        const n = 60;
        for (let i = 0; i < n; i++) {
          const f = i / n;
          vy += st.spin * 0.0035 * (0.4 + f * 1.6);
          const m = Math.hypot(vx, vy); vx /= m; vy /= m;
          px += vx * 10; py += vy * 10; pts.push([px, py]);
        }
      }
      st.guide = { aim: st.aim, spin: st.spin, lucky: st.lucky, n: st.thrown, at: G.clock, pts };
    }
    ctx.save();
    ctx.setLineDash([7, 8]); ctx.lineDashOffset = -G.clock * 20;
    ctx.strokeStyle = st.lucky ? 'rgba(255,197,61,0.9)' : 'rgba(28,26,54,0.45)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); for (const [px, py] of pts) ctx.lineTo(px, py); ctx.stroke();
    ctx.setLineDash([]);
    const [ex, ey] = pts[pts.length - 1], [qx, qy] = pts[pts.length - 2];
    const ang = Math.atan2(ey - qy, ex - qx);
    ctx.fillStyle = st.lucky ? CU_GOLD : 'rgba(28,26,54,0.55)';
    ctx.translate(ex, ey); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill();
    ctx.restore();
    // the curl choice: a bent arrow over the stone
    const sc = hudBig() ? 1.3 : 1;
    ctx.save(); ctx.translate(x + 6, y + 32 * sc); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(28,26,54,0.78)'; rr(-30, -11, 60, 22, 11); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.fillStyle = C.gold; ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (st.spin === 0) { ctx.moveTo(-14, 0); ctx.lineTo(10, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(9, -5); ctx.lineTo(9, 5); }
    else { const d = st.spin; ctx.moveTo(-14, -d * 4); ctx.quadraticCurveTo(8, -d * 6, 10, d * 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(11, d * 9); ctx.lineTo(5, d * 2); ctx.lineTo(14, d * 1); }
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // the power meter (left of the hack): rises and falls while the action is held
    const mx = K.sheet.x0 + 4, my0 = K.lineY - 12, mh = 124, mw = 12;
    ctx.fillStyle = 'rgba(28,26,54,0.78)'; rr(mx - 3, my0 - 3, mw + 6, mh + 6, 7); ctx.fill();
    const grd = ctx.createLinearGradient(0, my0 + mh, 0, my0);
    grd.addColorStop(0, '#7fe0d8'); grd.addColorStop(0.6, '#ffd166'); grd.addColorStop(1, '#ff6b6b');
    ctx.fillStyle = grd; rr(mx, my0 + mh * (1 - st.power), mw, Math.max(4, mh * st.power), 5); ctx.fill();
    // the "too gentle" zone at the bottom (a release there is refused)
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(mx, my0 + mh * (1 - K.minPower), mw, mh * K.minPower);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mx - 2, my0 + mh * (1 - K.minPower)); ctx.lineTo(mx + mw + 2, my0 + mh * (1 - K.minPower)); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; rr(mx, my0, mw, mh, 5); ctx.stroke();
  }

  function cuDrawWorld(st) {
    cuDrawArena(st);
    // guards and stones, back to front
    const things = st.guards.map(g => ({ y: g.y, f: () => (g.kind === 'snowman' ? cuSnowman(g) : cuGuardPenguin(g)) }))
      .concat(st.stones.filter(s => !s.out).map(s => ({ y: s.y, f: () => cuStone(s) })));
    if (st.phase === 'aim') things.push({ y: K.lineY, f: () => cuStone({ x: K.relX + st.lunge * 34, y: K.lineY, r: K.r, owner: st.thrower, rot: st.aim + Math.PI / 2 + st.spin * 0.6, pop: 0 }) });
    things.sort((a, b) => a.y - b.y);
    for (const t of things) t.f();
    // ring values on stones in the house
    for (const s of st.stones) {
      if (s.out || s.moving || s.owner === 'robot' || s.leaving) continue;
      const v = ringPts(s); if (!v) continue;
      ctx.fillStyle = v === 3 ? CU_GOLD : 'rgba(28,26,54,0.8)'; circle(s.x + 11, s.y - 11, 7); ctx.fill();
      text(String(v), s.x + 11, s.y - 10.5, 10, v === 3 ? C.ink : '#fff', 'center', 'body');
    }
    cuDrawAim(st);
    // gold help on a lucky end: a gold X where the stone would stop if the sweeping stopped now
    const c = st.cur;
    if (st.lucky && st.phase === 'slide' && c && c.moving && !c.out) {
      const e = st.coast;
      if (e && !e.out) {
        const x = e.x, y = e.y;
        ctx.save(); ctx.globalAlpha = 0.85; ctx.strokeStyle = CU_GOLD; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - 7, y - 7); ctx.lineTo(x + 7, y + 7); ctx.moveTo(x + 7, y - 7); ctx.lineTo(x - 7, y + 7); ctx.stroke();
        ctx.restore();
      }
    }
  }
  function cuGuardPenguin(g) {
    const w = Math.sin(g.wob * 30) * g.wob * 0.3;
    ctx.save(); ctx.translate(g.x, g.y); ctx.globalAlpha = 1 - 0.55 * (g.fade || 0);
    ctx.fillStyle = 'rgba(60,90,130,0.18)'; ctx.beginPath(); ctx.ellipse(0, 3, 17, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(w);
    cuPenguin(0, 6, 1.45, 0, Math.sin(G.clock * 3) * 0.15);
    ctx.restore();
  }

  // the sweeper's broom (over the players)
  function cuDrawTop(st) {
    const sw = st.sw, p = G.players[st.sweeper];
    const hx = p.x + PW / 2 + sw.face * 6, hy = p.y + PH * 0.55;
    const wig = sw.brush ? Math.sin(sw.brushT * 28) * 5 : 0;
    const bx = sw.bx + (-sw.fdy) * wig, by = sw.by + sw.fdx * wig;
    ctx.strokeStyle = '#8a5833'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(bx, by); ctx.stroke();
    ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.atan2(sw.fdy, sw.fdx) + Math.PI / 2);
    ctx.fillStyle = PCOL[st.sweeper]; rr(-9, -3.5, 18, 7, 3); ctx.fill();
    ctx.fillStyle = sw.sweeping ? '#fff' : '#f1e3c2'; rr(-8, 2, 16, 4, 2); ctx.fill();
    ctx.restore();
    if (sw.sweeping) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(bx + (Math.random() - 0.5) * 8, by + (Math.random() - 0.5) * 8, 2); ctx.fill(); }
    // a gold glow on the broom on a lucky end
    if (st.lucky) { ctx.strokeStyle = 'rgba(255,197,61,0.7)'; ctx.lineWidth = 2; circle(bx, by, 12 + Math.sin(G.clock * 6) * 2); ctx.stroke(); }
    // role badges: "Throw!" and "Sweep!" for a moment at the start of every stone, and while someone is idle
    // (not under the intro card, which shows the framework's own name tags)
    if (st.phase === 'aim' && G.introT <= 0 && st.aimT < 2.6) {
      const a = Math.min(clamp(st.aimT / 0.2, 0, 1), clamp((2.6 - st.aimT) / 0.4, 0, 1));
      cuBadge(G.players[st.thrower], st.thrower, 'Throw!', a);
      if (!sw.glide) cuBadge(p, st.sweeper, 'Sweep!', a);
    }
    for (const f of st.fx) { ctx.save(); ctx.globalAlpha = clamp(f.t / 0.3, 0, 1); bigText(f.text, f.x, f.y, f.size * (hudBig() ? 1.25 : 1), f.col); ctx.restore(); }
  }
  function cuBadge(p, id, word, a) {
    if (a <= 0) return;
    const sc = hudBig() ? 1.3 : 1, x = p.x + PW / 2, y = p.y - 16 * sc;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(sc, sc);
    const label = NAMES[id] + ': ' + word;
    ctx.font = '700 12px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(label).width + 16;
    ctx.fillStyle = PCOL[id]; rr(-w / 2, -10, w, 18, 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(4, 8); ctx.lineTo(0, 12); ctx.fill();
    text(label, 0, -0.5, 12, '#fff', 'center', 'body');
    ctx.restore();
  }

  // ---------- key names for hints (each player's own device) ----------
  function cuKeys(id, role) {
    if (cuCpu(id)) return role === 'throw' ? 'aims and throws' : 'skates and sweeps';
    // each player's own device (like actKey in ui.js): their controller if they have one, else touch or keyboard
    let pad = false; try { pad = !!padFor(padSlots(), id); } catch (e) { /* no controllers */ }
    const touch = !pad && document.documentElement.classList.contains('has-touch') && Pads.lastNonPad === 'touch';
    if (role === 'throw') {
      if (pad) return 'stick ▲▼ aim, ◀▶ curl, hold ' + glyph('act') + ' to throw';
      if (touch) return '▲▼ aim, ◀▶ curl, hold the round button';
      return id === 0 ? 'W S aim, A D curl, hold F to throw' : '↑ ↓ aim, ← → curl, hold / to throw';
    }
    if (pad) return 'skate to the stone, hold ' + glyph('act') + ' and keep skating';
    if (touch) return 'skate to the stone, hold the round button and ▶';
    return id === 0 ? 'skate to the stone, hold F and keep skating' : 'skate to the stone, hold / and keep skating';
  }

  function cuHud(st) {
    const big = hudBig(), sc = big ? 1.3 : 1, D = G.level.def;
    // top right: this end's stones, points and stars
    const sc2 = cuEndScore(st), endStars = st.phase === 'tally' ? st.endStars[st.k] : cuStarsFor(st, sc2);
    const ptsTxt = sc2.pts + ' pts';
    ctx.font = (17 * sc) + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const tw = ctx.measureText(ptsTxt).width;
    const pw = 16 * sc + K.stones * 13 * sc + 8 * sc + tw + 12 * sc + 3 * 17 * sc + 10 * sc;
    const ph = 28 * sc, px = pill(W - 14, 12, pw, ph, 'right'), cy = 12 + ph / 2;
    for (let i = 0; i < K.stones; i++) {
      const left = i >= st.thrown || (st.phase === 'aim' && i === st.thrown);
      const x = px + 16 * sc + i * 13 * sc;
      ctx.fillStyle = left ? PCOL[st.thrower] : 'rgba(246,239,223,0.22)'; circle(x, cy, 4.8 * sc); ctx.fill();
    }
    const tx = px + 16 * sc + K.stones * 13 * sc + 4 * sc;
    text(ptsTxt, tx, cy + 1, 17 * sc, C.paper, 'left');
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = k < endStars ? CU_GOLD : 'rgba(246,239,223,0.25)';
      cuStar(tx + tw + 14 * sc + k * 17 * sc, cy, 7 * sc); ctx.fill();
    }
    // under it: stars so far
    const so = st.endStars.reduce((a, b) => a + b, 0);
    if (st.k > 0 || st.phase === 'tally') {
      const s2 = 'Stars ' + so + ' / ' + (4 * 3);
      ctx.font = '700 ' + (12 * sc) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w2 = ctx.measureText(s2).width + 20 * sc;
      pill(W - 14, 12 + ph + 4, w2, 20 * sc, 'right');
      text(s2, W - 14 - w2 / 2, 12 + ph + 4 + 10 * sc + 0.5, 12 * sc, C.gold, 'center', 'body');
    }
    // top centre: who does what now (each player's own keys)
    let hint = null, hc = C.paper;
    if (G.introT <= 0 && st.phase === 'aim') {
      if (st.sw.glide || st.aimT < 4 || st.idle[st.thrower] > 6 || st.thrown === 0) { hint = NAMES[st.thrower] + ': ' + cuKeys(st.thrower, 'throw'); hc = PCOL[st.thrower]; }
      else { hint = NAMES[st.sweeper] + ': ' + cuKeys(st.sweeper, 'sweep'); hc = PCOL[st.sweeper]; }
    } else if (st.phase === 'slide' && !st.sw.sweeping && st.cur && st.cur.moving) {
      hint = cuCpu(st.sweeper) ? NAMES[st.sweeper] + ' sweeps the stone' : NAMES[st.sweeper] + ': ' + cuKeys(st.sweeper, 'sweep'); hc = PCOL[st.sweeper];
    } else if (st.phase === 'slide' && st.sw.sweeping) { hint = cuCpu(st.sweeper) ? NAMES[st.sweeper] + ' is sweeping!' : 'Sweeping! Let go to slow it down'; hc = PCOL[st.sweeper]; }
    if (hint) {
      ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
      const roomR = 14 + ctx.measureText('Room ' + ((D.roomIndex || 0) + 1) + ' of ' + (D.roomCount || 1) + ': ' + (D.title || '')).width + 44;
      ctx.font = '700 ' + (13 * sc) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const sw = ctx.measureText(hint).width + 32;
      const top = big ? 12 + ph + 30 : 48;
      const hx = big ? clamp(W / 2, 14 + sw / 2, W - 14 - sw / 2) : clamp(W / 2, roomR + 8 + sw / 2, W - 14 - sw / 2);
      pill(hx, top, sw, 24 * sc, 'center');
      // someone is waiting on the person who has to act: the pill glows gold
      const waitOn = st.phase === 'aim' && st.idle[st.thrower] > 8 && !cuCpu(st.thrower);
      if (waitOn) { ctx.strokeStyle = 'rgba(255,197,61,' + (0.5 + 0.4 * Math.sin(G.clock * 6)).toFixed(2) + ')'; ctx.lineWidth = 2.5; rr(hx - sw / 2, top, sw, 24 * sc, 12 * sc); ctx.stroke(); }
      ctx.fillStyle = hc; circle(hx - sw / 2 + 12, top + 12 * sc, 4); ctx.fill();
      text(hint, hx + 4, top + 12.5 * sc, 13 * sc, C.paper, 'center', 'body');
    }
    // big message, in the stands above the sheet
    if (st.msg) {
      const m = st.msg, a = clamp(m.t / 0.3, 0, 1), pop = 1 + 0.15 * Math.max(0, 1 - (m.max - m.t) / 0.2);
      ctx.save(); ctx.globalAlpha = a;
      bigText(m.text, W / 2, big ? 128 : 116, 26 * (big ? 1.25 : 1), m.col, pop);
      ctx.restore();
    }
    // the end's tally card, or the replay card
    if (st.phase === 'tally' || st.phase === 'fail') {
      const a = clamp(st.t / 0.25, 0, 1), last = st.k >= (D.roomCount || 1) - 1, fail = st.phase === 'fail';
      ctx.save(); ctx.globalAlpha = a;
      if (big) { ctx.translate(W / 2, 290); ctx.scale(1.3, 1.3); ctx.translate(-W / 2, -290); }
      ctx.fillStyle = 'rgba(28,26,54,0.9)'; rr(W / 2 - 230, 205, 460, 160, 20); ctx.fill();
      if (fail) {
        text('No stones in the house!', W / 2, 236, 26, C.paper, 'center');
        text('Let’s play End ' + (st.k + 1) + ' again.', W / 2, 268, 16, '#d9d3ef', 'center', 'body');
        ctx.fillStyle = 'rgba(255,197,61,0.16)'; rr(W / 2 - 200, 290, 400, 54, 14); ctx.fill();
        text('Lucky slick ice!', W / 2, 306, 18, CU_GOLD, 'center');
        text(cuHelpText(D, st.fails[st.k] || 1, false), W / 2, 328, 13, CU_GOLD, 'center', 'body');
      } else {
        text('End ' + (st.k + 1) + ' done!', W / 2, 236, 26, C.paper, 'center');
        text(st.endPts[st.k] + ' points' + (st.robotsOut ? ' (robots out: +' + st.robotsOut * K.robotBonus + ')' : ''), W / 2, 266, 16, '#d9d3ef', 'center', 'body');
        const n = Math.min(st.endStars[st.k], Math.floor(st.t / 0.35));
        if (n > (st.tallyStars || 0)) { st.tallyStars = n; Sfx.play('curlingStar'); }
        for (let k = 0; k < 3; k++) {
          const on = k < st.tallyStars, x = W / 2 - 50 + k * 50;
          ctx.fillStyle = on ? CU_GOLD : 'rgba(246,239,223,0.2)'; cuStar(x, 304, on ? 17 : 15); ctx.fill();
        }
        text(last ? 'Total: ' + st.total + ' points!' : 'Next: ' + D.rooms[st.k + 1].title + ' · swap jobs!', W / 2, 342, 14, '#d9d3ef', 'center', 'body');
      }
      ctx.restore();
    }
    // the end's gold help, under the intro card
    if (G.introT > 0 && st.lucky && st.phase === 'aim') {
      ctx.save(); ctx.globalAlpha = clamp(G.introT / 0.5, 0, 1);
      const s = cuHelpText(D, st.fails[st.k] || 1, true);
      ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = ctx.measureText(s).width + 30;
      const gy = cpuSolo() ? 322 : 300;   // under the intro card (taller in 1-player mode)
      pill(W / 2, gy, w, 28, 'center');
      text(s, W / 2, gy + 14.5, 14, CU_GOLD, 'center', 'body');
      ctx.restore();
    }
  }

  MODES.curling = {
    CFG: CURLING, rand: Math.random,
    setup(st, L) {
      Object.assign(st, { total: 0, endStars: [0, 0, 0, 0], endPts: [0, 0, 0, 0], fails: {}, cheer: 0, fx: [], msg: null,
        stats: { sweepT: [0, 0], throws: [0, 0], buttons: 0, robots: 0, taps: 0, short: 0, long: 0, replays: 0 } });
      L.grid = L.grid.map(r => r.map(() => '.'));
      cuEnd(st, 0, false);
    },
    room(k, L) { L.grid = L.grid.map(r => r.map(() => '.')); cuEnd(G.mst, k, false); },
    step(dt) { if (G.mst.sw) cuStep(G.mst, dt); },
    draw() { if (G.mst.sw) cuDrawWorld(G.mst); },
    drawTop() { if (G.mst.sw) cuDrawTop(G.mst); },
    hud() { if (G.mst.sw) cuHud(G.mst); },
    stats() {
      const st = G.mst, s = st.stats, stars = st.endStars.reduce((a, b) => a + b, 0);
      const medal = stars >= 10 ? 'Gold medal' : stars >= 7 ? 'Silver medal' : 'Bronze medal';
      return [
        { label: 'Stars', value: stars + ' of 12' },
        { label: 'Points', value: String(st.total) },
        { label: 'Buttons', value: String(s.buttons) },
        { label: 'Sweeping', values: s.sweepT.map(t => t.toFixed(0) + 's') },
        medal + '! ' + (stars >= 10 ? 'Curling champions!' : stars >= 7 ? 'Super sweeping!' : 'Great teamwork on the ice!'),
      ];
    },
    // for the computer brain and bot tests
    api: { simulate: cuSimulate, coast: cuCoastSim, speed: cuSpeed, coastX: cuCoastX, ringPts, inHouse, front: cuFront, endScore: cuEndScore, keys: cuKeys, input: cuInput },
  };
  Sfx.extra.curlingThrow = function (p) { this.tone(180 * p, 0.25, 'triangle', 0.06, 120 * p); this.tone(520 * p, 0.08, 'sine', 0.03, 300 * p); };
  Sfx.extra.curlingCharge = function (p) { this.tone(330 * p, 0.08, 'triangle', 0.03, 440 * p); };
  Sfx.extra.curlingClick = function (p) { this.tone(880 * p, 0.04, 'square', 0.025); };
  Sfx.extra.curlingSweep = function (p) { this.tone(2600 * p, 0.05, 'sawtooth', 0.008, 1800 * p); };
  Sfx.extra.curlingGrab = function (p) { this.tone(660 * p, 0.06, 'triangle', 0.035, 880 * p); };
  Sfx.extra.curlingClack = function () { this.tone(1400, 0.04, 'square', 0.05, 900); this.tone(300, 0.1, 'triangle', 0.07, 180); };
  Sfx.extra.curlingPoof = function () { this.tone(500, 0.15, 'sine', 0.04, 200); };
  Sfx.extra.curlingTap = function (p) { this.tone(420 * p, 0.06, 'triangle', 0.04, 300 * p); };
  Sfx.extra.curlingOut = function () { this.tone(440, 0.14, 'triangle', 0.04, 330); this.tone(330, 0.18, 'triangle', 0.035, 220, 0.12); };
  Sfx.extra.curlingHouse = function () { [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
  Sfx.extra.curlingButton = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'square', 0.04, null, i * 0.07)); this.tone(2093, 0.2, 'triangle', 0.04, null, 0.3); };
  Sfx.extra.curlingRobot = function () { this.tone(220, 0.06, 'square', 0.03, 160); this.tone(180, 0.08, 'square', 0.03, 120, 0.07); };
  Sfx.extra.curlingBonk = function () { this.tone(1200, 0.05, 'square', 0.035, 600); this.tone(900, 0.06, 'square', 0.03, 400, 0.06); this.tone(1320, 0.12, 'triangle', 0.04, null, 0.14); };
  Sfx.extra.curlingStar = function () { this.tone(1175, 0.09, 'triangle', 0.05); this.tone(1568, 0.14, 'triangle', 0.05, null, 0.06); };
  Sfx.extra.curlingEnd = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, null, i * 0.08)); };
  Sfx.extra.curlingFail = function () { [440, 392, 349].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.045, null, i * 0.12)); };
  Sfx.extra.curlingLucky = function () { [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.035, null, i * 0.05)); };
}
/* ===== end of 12-1 Curling ===== */
