/* Pip & Bo - Computer partner: 12-1 Curling. */
'use strict';

/* Each end names its thrower (st.thrower) and sweeper (st.sweeper), so the computer plays the job its character has
   this end (Pip throws ends 1 and 3, Bo ends 2 and 4).
   - Thrower: once the end's card is gone and the sweeper is ready, it plans a shot the way a person reads the sheet:
     every aim, curl and power on a grid is tried on a copy of the ice (MODES.curling.api.simulate, guards, snow and
     robots included) with a sweeper who catches the stone early or late and sweeps until it would reach the button, and
     the shot that adds the most points to the end (robots knocked out count +2) wins; a finer look around the best one
     follows. The work is spread over many steps. Then it turns the aim (▲▼), taps the curl (◀▶) and holds the action,
     letting go when the rising meter reaches the planned power (a little off, more on easy). The "late" sweeper in the
     plan is the person's own habit: it remembers where they caught the last few stones (a stone never caught counts
     as very late), so a sweeper who comes late gets harder throws that still slide when they arrive.
     It waits for the sweeper: a computer partner at its ready spot; a person near the hack, still, and just beside the
     aim line ("Wait beside the line!", "Ready? Stop there!"), but never on it in front of the stone ("Step beside the
     line!"); or near the hack after 7 s ("Ready to sweep?"); or anywhere after 12 s ("Skate back here!"). A person who
     missed their last stone or catches very late must come beside the line (last resort 30 s); one brushing snow off
     the ice gets 20 s ("Done sweeping? Skate back!"); one standing on the path, 20 s. While a person's stone slides
     short and unswept it says "Sweep in front!".
   - Sweeper: during the aim it skates to a ready spot just beside the aim line, a little way out from the hack (where
     a person would wait), and holds the action as the stone comes by, so the broom grabs it. While attached it keeps
     skating along (the direction of the stone's way) and sweeps while the stone would stop short of the button if it
     let go now (the same coast the gold X shows: snow and guards included), and always until it hits a robot it is
     heading for. Then it lets go and skates clear, and grabs again if the stone would now stop short. It never sweeps
     a stone that would go long. Bubbles: "Sweep! Sweep!" on a grab, "Whoa!" when it lets go, "Your throw!" when a person
     thrower has pressed nothing for 7 s.
   - It never cheats with hidden state: it reads the aim arrow, the meter and the stones as a person sees them, and its
     planner runs the level's own physics on a copy (the way a person learns how far a throw goes).
   Neither job can finish an end alone: an unswept stone always stops short of the house, so an idle person means no
   clear (and the core's 30 s idle stop makes the computer wait too). Bubbles are short and only in 1-player mode. */
(() => {
  const API = () => MODES.curling.api, K = () => MODES.curling.CFG;
  const RX = 340, RSIDE = 30;     // the sweeper's ready spot: this x on the aim line, this far below it

  // a short bubble, not too often
  function say(S, p, text, gap = 4, secs = 1.8) {
    if (G.time - (S.saidT == null ? -99 : S.saidT) < gap) return;
    S.saidT = G.time; cpuSay(p, text, secs);
  }
  // where the aim line (as the arrow shows it) is at x
  const lineY = (st, x) => K().lineY + (x - K().relX) * Math.tan(st.aim);
  function readySpot(st) { return { x: RX, y: lineY(st, RX) + RSIDE }; }

  // skate toward (tx, ty), arriving with velocity (tvx, tvy): presses the 8-way directions like a stick
  function skate(out, sw, tx, ty, tvx = 0, tvy = 0, gain = 3.2, vmax = 290) {
    let dvx = tvx + (tx - sw.x) * gain, dvy = tvy + (ty - sw.y) * gain;
    const m = Math.hypot(dvx, dvy);
    if (m > vmax) { dvx *= vmax / m; dvy *= vmax / m; }
    const ex = dvx - sw.vx, ey = dvy - sw.vy, dead = 14;
    out.right = ex > dead; out.left = ex < -dead; out.down = ey > dead; out.up = ey < -dead;
    return Math.hypot(tx - sw.x, ty - sw.y);
  }

  // snow under or just in front of a moving stone (a sweeper sweeps through it)
  function snowAhead(wd, s) {
    const sn = wd.snow; if (!sn) return false;
    const C = K(), sp = Math.hypot(s.vx, s.vy) || 1;
    for (const d of [0, 18, 36]) {
      const x = s.x + s.vx / sp * d, y = s.y + s.vy / sp * d;
      const cx = Math.floor((x - C.sheet.x0) / 10), cy = Math.floor((y - C.sheet.y0) / 10);
      if (cx >= 0 && cy >= 0 && cx < sn.w && cy < sn.h && sn.a[cy * sn.w + cx] > 0.05) return true;
    }
    return false;
  }
  // a robot sitting in the house in the stone's way (a takeout: sweep hard until the hit)
  function robotAhead(stones, s) {
    const sp = Math.hypot(s.vx, s.vy); if (sp < 1) return false;
    const dx = s.vx / sp, dy = s.vy / sp;
    for (const r of stones) {
      if (r.owner !== 'robot' || r.out || r.leaving || r.moving || !API().inHouse(r)) continue;
      const ax = r.x - s.x, ay = r.y - s.y, along = ax * dx + ay * dy;
      if (along > 0 && Math.abs(ax * -dy + ay * dx) < r.r + s.r - 2) return true;
    }
    return false;
  }

  /* ---------- the thrower's planner ---------- */
  // the sweeper the plan expects: catches the stone once it passes catchX, sweeps through snow, until a robot it aims
  // at is hit, and while the stone would stop short of the button
  function simSweeper(catchX) {
    let hit = false;
    return (s, t, wd) => {
      if (s.x < catchX) return false;
      if (!hit && wd.stones.some(r => r.owner === 'robot' && r.moving)) hit = true;
      if (!hit && robotAhead(wd.stones, s)) return true;
      if (snowAhead(wd, s)) return true;
      return API().coastX(s) < K().button.x - 4;
    };
  }
  // the end's points now (own stones in rings, robots out) on a list of stones
  // (stones: the live stones in play, or the simulator's copies of them in the same order; robotsIn: the indexes of
  // the robots that sat in the house before the throw)
  function points(stones, robotsIn) {
    const A = API(); let pts = 0, gone = 0;
    stones.forEach((s, i) => {
      if (s.owner === 'robot') { if (robotsIn.has(i) && (s.out || !A.inHouse(s))) gone++; return; }
      if (s.out || s.x < K().hog) return;
      pts += A.ringPts(s);
    });
    return pts + gone * K().robotBonus;
  }
  function scoreShot(st, c, robotsIn, base, late) {
    let sum = 0;
    for (const cx of [280, late]) {
      const r = API().simulate(st, c, simSweeper(cx), { dt: 1 / 60, maxT: 14 });
      const s = r.stone;
      let v = points(r.stones, robotsIn) - base;
      if (!s.out && s.x >= K().hog) v -= Math.hypot(s.x - K().button.x, s.y - K().button.y) / 120;
      else v -= 1.5;
      sum += v;
    }
    return sum / 2 - Math.abs(c.power - 0.78) * 0.4 - Math.abs(c.spin) * 0.05;
  }
  const planKey = st => st.k + '|' + st.thrown + '|' + (st.fails[st.k] || 0) + '|' + (st.lucky ? 1 : 0);
  function planStart(S, st) {
    const cands = [];
    for (let a = -0.14; a <= 0.1401; a += 0.02) for (const spin of [-1, 0, 1]) for (const power of [0.55, 0.7, 0.85, 1])
      cands.push({ aim: +a.toFixed(3), spin, power });
    // the robots in the house now (by their place in the list the simulator copies), so the score can tell which ones a
    // shot knocked out
    const live = st.stones.filter(s => !s.out && !s.leaving), robotsIn = new Set();
    live.forEach((s, i) => { if (s.owner === 'robot' && API().inHouse(s)) robotsIn.add(i); });
    const base = points(live, robotsIn);
    S.plan = { key: planKey(st), cands, i: 0, res: [], fine: false, best: null, robotsIn, base, late: lateCatch(st) };
  }
  function planStep(S, st) {
    const pl = S.plan;
    if (pl.best) return;
    for (let n = 0; n < 3 && pl.i < pl.cands.length; n++) {   // (about 1-2 ms a step)
      const c = pl.cands[pl.i++];
      pl.res.push({ c, v: scoreShot(st, c, pl.robotsIn, pl.base, pl.late) });
    }
    if (pl.i < pl.cands.length) return;
    pl.res.sort((a, b) => b.v - a.v);
    if (!pl.fine) {
      // a finer look around the best few
      pl.fine = true;
      const seen = new Set(pl.res.map(r => r.c.aim + ',' + r.c.spin + ',' + r.c.power));
      for (const r of pl.res.slice(0, 3)) for (const da of [-0.01, 0, 0.01]) for (const dp of [-0.07, 0, 0.07]) {
        const c = { aim: +clamp(r.c.aim + da, -K().aimMax, K().aimMax).toFixed(3), spin: r.c.spin, power: +clamp(r.c.power + dp, 0.4, 1).toFixed(3) };
        const k = c.aim + ',' + c.spin + ',' + c.power;
        if (!seen.has(k)) { seen.add(k); pl.cands.push(c); }
      }
      if (pl.i < pl.cands.length) return;
    }
    pl.best = pl.res[0].c;
  }

  // where the sweeper caught the last few stones (a stone they never caught counts as very late), kept for the whole
  // level: a sweeper who comes late gets throws with more power, so the stone still slides when they get there
  const MEM = new WeakMap();
  function memOf(st) { let m = MEM.get(st); if (!m) MEM.set(st, m = { catches: [] }); return m; }
  function lateCatch(st) {
    const c = memOf(st).catches.slice(-3).sort((a, b) => a - b);
    return c.length ? clamp(c[Math.floor(c.length / 2)] + 40, 430, 620) : 430;
  }
  function watchCatch(S, st) {
    if (st.phase === 'slide' && st.cur) {
      if (S.seen !== st.cur) { S.seen = st.cur; S.caught = false; }
      if (!S.caught && st.sw.att === st.cur) { S.caught = true; memOf(st).catches.push(st.cur.x); }
    } else if (S.seen && st.phase === 'settle') {
      if (!S.caught) memOf(st).catches.push(650);
      S.seen = null;
    }
  }

  /* ---------- the thrower ---------- */
  function thrower(S, st, p, o, dt, info, out) {
    const C = K(), sw = st.sw;
    watchCatch(S, st);
    if (st.phase !== 'aim') {
      S.plan = null; S.aimSet = null; S.wait = 0; S.ready = 0; S.brushed = false;
      // a person's stone sliding unswept and short: a word for the sweeper
      if (st.phase === 'slide' && !info.partnerCpu && st.cur && st.cur.moving && !sw.att && st.cur.x > 300 &&
        API().coastX(st.cur) < C.button.x - 60 && info.partnerIdle < 5) say(S, p, 'Sweep in front!', 5);
      return;
    }
    if (G.introT > C.introLock) { S.wait = 0; return; } // (the card is up: hands off)
    if (!S.plan || S.plan.key !== planKey(st)) { planStart(S, st); S.aimSet = null; S.wait = 0; S.ready = 0; S.brushed = false; }
    planStep(S, st);
    S.wait += dt;
    if (!S.plan.best) return;
    if (!S.aimSet) {
      // a person is never spot on: a little off, more on easy
      const e = 1 - info.skill, nz = () => Math.random() + Math.random() - 1, b = S.plan.best;
      S.aimSet = { aim: clamp(b.aim + nz() * (0.002 + 0.006 * e), -C.aimMax, C.aimMax), spin: b.spin, power: clamp(b.power + nz() * (0.01 + 0.03 * e), C.minPower + 0.05, 1) };
    }
    const A = S.aimSet;
    // turn the aim
    const da = A.aim - st.aim, aimed = Math.abs(da) < 0.0016;
    if (!aimed && !st.charging) { out.up = da < 0; out.down = da > 0; }
    // tap the curl (press, let go, press...)
    const spun = st.spin === A.spin;
    if (!spun && !st.charging) {
      if (CPU.last[p.id].left || CPU.last[p.id].right) { /* let go this step */ } else { out.right = A.spin > st.spin; out.left = A.spin < st.spin; }
    }
    // the sweeper ready? (a computer: at its spot; a person: back near the hack and not racing about, or long enough)
    let ready;
    if (sw.glide) ready = false;
    else if (info.partnerCpu) {
      const r = readySpot(st);
      ready = Math.hypot(sw.x - r.x, sw.y - r.y) < 30 && Math.hypot(sw.vx, sw.vy) < 60;
    } else {
      // near the hack and not racing about, and best of all just beside the aim line (where the stone comes by), but
      // never ON it in front of the stone (the stone would bump into them: "Oops, tapped it!")
      const dy = Math.abs(sw.y - lineY(st, sw.x)), near = sw.x < 460, still = Math.hypot(sw.vx, sw.vy) < 140;
      const onPath = sw.x > 110 && sw.x < C.hog && dy < 20;
      const byLine = near && sw.x > 150 && !onPath && dy < 90;
      // a person who missed their last stone, or caught their recent ones very late, can't catch a stone from far off:
      // wait until they are beside the line (no "near the hack after 7 s" shortcut, and a much longer last resort)
      const mem = memOf(st).catches, struggling = mem.length > 0 && (mem[mem.length - 1] >= 650 || lateCatch(st) >= 560);
      // a person brushing snow off the ice during the aim (the snow end's tip says to) is busy, not lost
      if (sw.brush && st.snow) S.brushed = true;
      const giveUp = struggling ? 30 : S.brushed ? 20 : 12;
      ready = (still && ((byLine && (info.partnerIdle < 5 || struggling)) || (near && !onPath && !struggling && S.wait > 7))) || (S.wait > giveUp && !onPath) || S.wait > Math.max(giveUp, 20);
      // (only once our aim is set: while it still turns, the line sweeps across the ice and the words would be wrong)
      if (!ready && S.wait > 2.5 && aimed && spun) {
        const words = !near ? (S.brushed ? 'Done sweeping? Skate back!' : 'Skate back here!')
          : onPath ? 'Step beside the line!'
          : byLine ? (still ? 'Ready to sweep?' : 'Ready? Stop there!')
          : info.partnerIdle < 5 || struggling ? 'Wait beside the line!' : 'Ready to sweep?';
        // (only once the same words have fit for a moment: a person just skating past to their spot gets none)
        if (words !== S.words) { S.words = words; S.wordsT = 0; } else S.wordsT += dt;
        if (S.wordsT > 1) say(S, p, words, 5);
      } else S.words = null;
    }
    S.ready = ready ? S.ready + dt : 0;
    const go = aimed && spun && S.ready > 0.5 + 0.6 * (1 - info.skill) && st.aimT > 1;
    // hold the action to charge; let go when the rising meter reaches the planned power
    if (st.charging) {
      const ph = (st.chargeT / C.meterT) % 2, rising = ph < 1, step = dt / C.meterT;
      out.act = !(rising && st.power + step >= A.power - 0.002);
      if (!out.act && !info.partnerCpu) say(S, p, 'Here it comes!', 3);
    } else if (go) {
      out.act = !CPU.last[p.id].act; // (a fresh press)
    }
  }

  /* ---------- the sweeper ---------- */
  function wantSweep(S, st, s) {
    if (st.def.robots && !st.shotHits && robotAhead(st.stones, s)) return true;
    if (!S.coast || G.time - S.coastAt > 0.1 || S.coastFor !== s) { S.coast = API().coast(st, s); S.coastAt = G.time; S.coastFor = s; }
    const c = S.coast;
    if (c.out) return c.x < K().back - 4; // off the side: sweeping straightens it; off the back: let it slow
    return c.x < K().button.x - 4;
  }
  function sweeper(S, st, p, o, dt, info, out) {
    const C = K(), sw = st.sw, A = API();
    if (sw.glide) return;
    const s = st.cur && st.cur.moving && !st.cur.out ? st.cur : null;
    if (st.phase === 'aim' || (st.phase === 'slide' && !s && !sw.att)) {
      S.grabbed = false; S.hold = false;
      if (st.phase !== 'aim' || G.introT > C.introLock) return;
      // wait at the ready spot beside the aim line
      const r = readySpot(st);
      skate(out, sw, r.x, r.y, 0, 0, 3.2, 200);
      // a person who keeps us waiting (the HUD glows for them too)
      if (!info.partnerCpu && st.idle[st.thrower] > 7) say(S, p, 'Your throw!', 6);
      return;
    }
    if (st.phase !== 'slide') return;
    if (sw.att) {
      // sweeping: keep skating along, and keep the broom down while the stone would stop short
      const f = A.front(sw.att);
      const keep = sw.att === s ? wantSweep(S, st, sw.att) : false;
      if (keep) {
        out.act = true;
        out.right = f.dx > 0.38; out.left = f.dx < -0.38; out.down = f.dy > 0.38; out.up = f.dy < -0.38;
        if (!S.grabbed) { S.grabbed = true; if (!info.partnerCpu) say(S, p, 'Sweep! Sweep!', 4); }
      } else if (!info.partnerCpu && S.grabbed && sw.sweptShot > 0.4) say(S, p, 'Whoa!', 5, 1.2);
      return;
    }
    if (!s) return;
    // not attached: skate to the spot beside the stone (on our side of it) and hold the broom down once close
    const f = A.front(s), side = ((sw.x - s.x) * -f.dy + (sw.y - s.y) * f.dx) >= 0 ? 1 : -1;
    const ax = s.x + f.dx * 20 - f.dy * 26 * side, ay = s.y + f.dy * 20 + f.dx * 26 * side;
    const need = wantSweep(S, st, s);
    if (need) {
      const d = skate(out, sw, ax, ay, s.vx, s.vy, 3.5, 300);
      // a fresh press is needed after falling behind
      out.act = !sw.needUp && d < (st.lucky ? 70 : 44);
    } else {
      // keep clear of the moving stone (skating over it would tap it)
      const dx = sw.x - s.x, dy = sw.y - s.y, d = Math.hypot(dx, dy) || 1;
      if (d < 70) skate(out, sw, s.x + dx / d * 90, s.y + dy / d * 90, s.vx * 0.5, s.vy * 0.5, 3, 260);
      else skate(out, sw, sw.x, sw.y, 0, 0, 0, 0);
    }
  }

  cpuBrain('curling', {
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.sw || !st.stones) return out;
      if (p.id === st.thrower) thrower(S, st, p, o, dt, info, out);
      else sweeper(S, st, p, o, dt, info, out);
      return out;
    },
  });
})();
