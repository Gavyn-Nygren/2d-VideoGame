/* Pip & Bo - Computer partner brain for 16-1 Conveyor Belt Chaos. */
'use strict';

(() => {
  /* 16-1 Conveyor Belt Chaos (MODES.conveyor): the level says who sorts (G.mst.sorter) and who works the levers
     (G.mst.op); the computer does the job it has, reading only what a person can see on screen (candy, belts, the lift,
     the trapdoor, the bins and the order board).
     OPERATOR: works out what every device should do right now, then walks to the lever that is most out of step and
     presses it like a person (one press at a time). Belts the sorter can reach bring the best useful candy toward the
     sorter (fast when far, slow when near, stopped when it's in reach) and park their candy while the sorter is busy
     carrying; a belt with a chute and nothing useful on it runs slow to get more candy out, and pushes useless candy
     off the end. The high belt the sorter can't reach routes useful candy to a drop: the trapdoor (opened as it passes
     over), the end above the low belt, or the lift; a toffee goes through the wrapper on SLOW first. The lift goes up
     when the sorter stands on it holding a candy for the high shelf, and comes down otherwise.
     SORTER: holding a candy, it takes it to its bin (riding the lift up for the high shelf) and tosses it once the toss
     aims into that bin; an unwrapped toffee is dropped on a recycle grate. Not holding one, it picks the nearest useful
     candy it can reach (on the floor, a slow or stopped belt, the lift, in the air), runs under it, jumps up through
     the belt and grabs it.
     With a person partner it says what it needs in short bubbles ("Slow the belt down, please!", "Lift up, please!",
     "Stand on the lift, I'll take you up!"). A person who does the other job's work first is simply followed: the
     computer only ever does its own job, so an idle person means no candy (computer sorter) or no sorting (computer
     operator). */
  const M = () => MODES.conveyor;
  const K = () => MODES.conveyor.CONVEYOR;
  const cx = p => p.x + p.w / 2;
  const feet = p => p.y + p.h;
  const high = p => feet(p) < K().floorY - 150;

  /* ---------- shared: candy and where it can go ---------- */
  const isUseful = (st, c) => c.st !== 'gone' && c.st !== 'held' && !(c.st === 'air' && c.aim) && M().useful(st, c.kind);
  // can a sorter on the floor (or on the low belt) get at this candy? (the high belt only from up high)
  function reachable(st, c, sorter) {
    if (c.st === 'belt') return c.belt.y >= 300 || high(sorter);
    if (c.st === 'rest' && c.surf === 'lift') return Math.abs(st.lift.y - st.lift.lo) < 4 || (high(sorter) && Math.abs(st.lift.y - st.lift.hi) < 4);
    if (c.st === 'rest' && c.surf === 'shelf') return true;
    return c.st === 'rest' || c.st === 'air';
  }
  // the drops on the high belt that send candy to the sorter: the trapdoor, the end over the low belt, the lift
  function drops(st, b) {
    const out = [];
    if (b.trap) out.push({ x: (b.trap.x0 + b.trap.x1) / 2, kind: 'trap' });
    const lf = st.lift;
    for (const side of [0, 1]) {
      if (b.ends[side] !== 'fall') continue;
      const ex = side ? b.x1 : b.x0, d = side ? 1 : -1;
      const lower = st.belts.some(o => o !== b && o.y > b.y && ex + d * 20 > o.x0 && ex + d * 20 < o.x1);
      if (lower) out.push({ x: ex + d * 30, kind: 'end' });
      else if (lf && ex + d * 30 > lf.x0 && ex + d * 30 < lf.x1) out.push({ x: ex + d * 30, kind: 'lift' });
    }
    return out;
  }

  /* ---------- the operator ---------- */
  function desired(st, S, info) {
    const want = new Map(), sorter = G.players[st.sorter], scx = cx(sorter), lf = st.lift;
    const busy = !!st.held || !!(lf && sorter.onLift && Math.abs(lf.y - lf.lo) > 4);
    const sorterHigh = high(sorter);
    // the candy the sorter is (probably) going for: the nearest useful one it can reach
    let goal = null, gd = 1e9;
    for (const c of st.candies) {
      if (!isUseful(st, c) || !reachable(st, c, sorter)) continue;
      const d = Math.abs(c.x - scx) + Math.abs(c.y - feet(sorter)) * 0.6;
      if (d < gd) { gd = d; goal = c; }
    }
    for (const b of st.belts) {
      const reach = b.y >= 300 || sorterHigh;
      const mine = st.candies.filter(c => c.st === 'belt' && c.belt === b);
      const good = mine.filter(c => isUseful(st, c) && !(c.kind === 'toffee' && c.wrapSeen));
      const junk = mine.filter(c => !good.includes(c));
      const chute = st.chutes.some(ch => ch.belt === b);
      let w = null;
      if (reach && b.y >= 300) {
        if (good.length) {
          if (busy) w = { dir: b.dir, spd: 0 };
          else {
            // bring the nearest good one to the sorter
            const tx = clamp(scx, b.x0 + 16, b.x1 - 16);
            let T = good[0];
            for (const c of good) if (Math.abs(c.x - tx) < Math.abs(T.x - tx)) T = c;
            const dx = tx - T.x;
            if (Math.abs(dx) < 26 || (goal && goal !== T && goal.st !== 'belt')) w = { dir: b.dir, spd: 0 };
            else w = { dir: Math.sign(dx), spd: Math.abs(dx) > 170 ? 2 : 1 };
            // (never send it off a falling end at the sorter's far side)
            S.goalOn = S.goalOn || {};
          }
        } else if (junk.length) {
          // push useless candy off the nearest end that isn't a wall
          const c = junk[0], left = b.ends[0] !== 'wall', right = b.ends[1] !== 'wall';
          const d = left && right ? (c.x - b.x0 < b.x1 - c.x ? -1 : 1) : left ? -1 : 1;
          w = { dir: d, spd: 2 };
        } else if (chute) w = { dir: b.dir, spd: 1 };
        else w = { dir: b.dir, spd: 0 };
      } else {
        // the high belt: route good candy to a drop (through the wrapper first for a toffee)
        const ds = drops(st, b).filter(q => q.kind !== 'lift' || (lf && Math.abs(lf.y - lf.hi) < 4 && lf.target === lf.hi && sorterHigh));
        let best = null;
        for (const c of good) {
          let tx = null, slowAt = null;
          if (c.kind === 'toffee' && st.wrap && st.wrap.belt === b && !c.wrapSeen) { tx = st.wrap.x + Math.sign(st.wrap.x - c.x || 1) * 30; slowAt = st.wrap.x; }
          else {
            let bd = 1e9;
            for (const q of ds) { const d = Math.abs(q.x - c.x); if (d < bd) { bd = d; tx = q.x; } }
            // (a candy past every drop to the far side: the nearest still works)
          }
          if (tx == null) continue;
          const d = Math.abs(tx - c.x);
          if (!best || d < best.d) best = { c, tx, d, slowAt };
        }
        if (best) {
          const c = best.c, dir = Math.sign(best.tx - c.x) || b.dir;
          let spd = best.d > 140 ? 2 : 1;
          if (best.slowAt != null && Math.abs(c.x - best.slowAt) < 130) spd = 1;
          if (b.trap && Math.abs(c.x - (b.trap.x0 + b.trap.x1) / 2) < 120 && best.slowAt == null) spd = 1;
          // the wrapper needs slow while a toffee goes through
          if (st.wrap && st.wrap.belt === b && mine.some(q => q.kind === 'toffee' && !q.wrapSeen && Math.abs(q.x - st.wrap.x) < 70 && isUseful(st, q))) spd = 1;
          // too many candies sitting about: don't hold the high belt back for long
          w = { dir, spd };
          S.trapFor = b.trap && best.slowAt == null ? c : null;
        } else if (junk.length) {
          const c = junk[0];
          const ends = [0, 1].filter(s => b.ends[s] !== 'wall');
          const d = ends.length === 2 ? (c.x - b.x0 < b.x1 - c.x ? -1 : 1) : ends[0] === 0 ? -1 : 1;
          w = { dir: d, spd: 2 };
          // (junk on the high belt never goes down the trapdoor)
        } else if (chute) w = { dir: b.dir, spd: 1 };
        else w = { dir: b.dir, spd: 0 };
        // a toffee about to go through the wrapper: slow (even when it isn't the best candy)
        if (st.wrap && st.wrap.belt === b && w.spd === 2 && mine.some(q => q.kind === 'toffee' && !q.wrapSeen && isUseful(st, q) && Math.abs(q.x - st.wrap.x) < 90)) w.spd = 1;
      }
      // hysteresis: a slow belt doesn't flip back and forth for a candy right beside its target
      want.set(b, w);
    }
    // the lift
    let liftUp = false;
    if (lf) {
      const heldBin = st.held && M().binFor(st, st.held.kind);
      const hb = heldBin && heldBin.high;
      if (sorter.onLift && hb) liftUp = true;
      else if (high(sorter) && hb && !sorter.onLift) liftUp = true;   // (up there already: no need to come down)
      want.set(lf, liftUp ? lf.hi : lf.lo);
    }
    // the trapdoor: open as a good candy passes over it
    if (st.trap) {
      const tp = st.trap, b = tp.belt;
      const over = st.candies.some(c => c.st === 'belt' && c.belt === b && isUseful(st, c) && !(c.kind === 'toffee') && c.x > tp.x0 + 2 && c.x < tp.x1 - 2);
      const soon = st.candies.some(c => c.st === 'belt' && c.belt === b && isUseful(st, c) && c.kind !== 'toffee' && b.spd && (((tp.x0 + tp.x1) / 2 - c.x) * Math.sign(b.v)) > -10 && (((tp.x0 + tp.x1) / 2 - c.x) * Math.sign(b.v)) < 90);
      want.set(tp, over ? 'open' : soon ? 'ready' : 'shut');
    }
    void info;
    return want;
  }
  function operate(st, S, p, o, dt, info) {
    const out = {}, human = !info.partnerCpu, want = desired(st, S, info), sorter = o;
    S.cd = Math.max(0, (S.cd || 0) - dt);
    // which lever is out of step, and how urgent
    let job = null;
    const consider = (sta, pri, press) => { if (!job || pri > job.pri || (pri === job.pri && Math.abs(sta.x - cx(p)) < Math.abs(job.sta.x - cx(p)))) job = { sta, pri, press }; };
    for (const sta of st.stations) {
      if (sta.kind === 'belt') {
        const b = sta.ref, w = want.get(b);
        if (!w) continue;
        const sameDir = w.spd === 0 || w.dir === b.dir;
        if (sameDir && w.spd === b.spd) continue;
        const press = !sameDir ? 'act' : w.spd > b.spd ? 'up' : 'down';
        // urgency: a stop for a grab or a useful candy about to fall off counts most
        const goodOn = st.candies.some(c => c.st === 'belt' && c.belt === b && isUseful(st, c));
        const pri = (goodOn ? 3 : 1) + (w.spd === 0 && b.spd ? 0.5 : 0) + (b.spd === 0 && st.chutes.some(ch => ch.belt === b) && !goodOn ? 0.8 : 0);
        consider(sta, pri, press);
      } else if (sta.kind === 'lift') {
        const lf = sta.ref, w = want.get(lf);
        if (w === lf.target) continue;
        consider(sta, w === lf.hi ? 4 : 1.5, w === lf.hi ? 'up' : 'down');
      } else if (sta.kind === 'trap') {
        const w = want.get(sta.ref);
        if (w === 'open') consider(sta, sta.ref.open ? 0 : 6, sta.ref.open ? 'hold' : 'act');
        else if (w === 'ready') consider(sta, 2.5, 'wait');
      }
    }
    if (!job) {
      // nothing to change: wait by the lever that is most likely next (the sorter's nearest belt)
      let best = null;
      for (const sta of st.stations) { const d = Math.abs(sta.x - cx(sorter)); if (!best || d < best.d) best = { sta, d }; }
      if (best) cpuSeek(out, p, best.sta.x, 8);
      return talk(st, S, p, o, out, info, human);
    }
    const at = Math.abs(job.sta.x - cx(p)) < K().stationR - 6;
    if (!at) { cpuSeek(out, p, job.sta.x, 6); return talk(st, S, p, o, out, info, human); }
    cpuSeek(out, p, job.sta.x, 6);
    if (job.press === 'hold') { out.act = true; return out; }
    if (job.press === 'wait' || S.cd > 0) return talk(st, S, p, o, out, info, human);
    if (job.press === 'act') out.act = 'tap';
    else if (job.press === 'up') out.jump = 'tap';
    else if (job.press === 'down') { if (!S.downWas) { out.down = true; } }
    S.downWas = !!out.down;
    S.cd = 0.14;
    return talk(st, S, p, o, out, info, human);
  }
  // with a person sorting: say what they need (only after the prompt over their head has had its go)
  function talk(st, S, p, o, out, info, human) {
    if (!human || info.partnerIdle > 15) return out;
    const lf = st.lift;
    if (st.held) {
      const bn = M().binFor(st, st.held.kind);
      S.heldT = (S.heldT || 0) + 1 / 120;
      if (bn && bn.high && lf && !o.onLift && !high(o) && S.heldT > 2.5) cpuSay(p, 'Stand on the lift, I\'ll take you up!', 2.2);
      else if (bn && S.heldT > 6) cpuSay(p, 'That one goes in the ' + M().KINDS[bn.kind].bin + ' bin!', 2.2);
    } else S.heldT = 0;
    return out;
  }

  /* ---------- the sorter ---------- */
  // run toward x on the level of `surfY` (450 the floor, a belt's y, or 240 up high); returns true when there
  function go(st, S, p, out, x, surfY, dead) {
    const fy = feet(p), lf = st.lift;
    const onLevel = Math.abs(fy - surfY) < 3 && p.grounded;
    if (surfY < 300 && fy > 300) {
      // up high: only the lift goes there
      if (!lf) return false;
      const lx = (lf.x0 + lf.x1) / 2;
      if (p.onLift) { cpuSeek(out, p, lx, 10); S.wantLift = true; return false; }
      if (Math.abs(lf.y - lf.lo) > 4 && cx(p) > lf.x0 - 30 && cx(p) < lf.x1 + 30) { cpuSeek(out, p, lf.x0 - 40, 8); S.wantLift = true; return false; }
      if (fy < K().floorY - 3) { if (p.grounded && p.onOneWay) out.down = true; cpuSeek(out, p, lx, 10); return false; }
      cpuSeek(out, p, lx, 10); S.wantLift = true;
      return false;
    }
    S.wantLift = false;
    if (onLevel) return cpuSeek(out, p, x, dead || 6);
    if (fy < surfY - 3) {
      // higher than wanted: drop through a belt, or walk off where nothing is below
      if (p.grounded && p.onOneWay && !p.onLift) out.down = true;
      else if (p.grounded && (p.onLift || fy < 300)) {
        // off the high level: step off the lift's or shelf's edge toward the open floor
        const edge = p.onLift ? lf.x0 - 30 : lf ? lf.x0 + 10 : x;
        cpuSeek(out, p, Math.abs(x - edge) < 60 ? edge : (x < cx(p) ? Math.min(edge, x) : edge), 4);
        return false;
      }
      cpuSeek(out, p, x, dead || 6);
      return false;
    }
    // lower than wanted (a belt above): get under the spot and jump up through it
    const b = st.belts.find(q => Math.abs(q.y - surfY) < 3);
    const tx = b ? clamp(x, b.x0 + 14, b.x1 - 14) : x;
    cpuSeek(out, p, tx, 30);
    if (p.grounded && Math.abs(tx - cx(p)) < 40) out.jump = 'tap';
    else if (!p.grounded && p.vy < 0) out.jump = true;
    return false;
  }
  function sort(st, S, p, o, dt, info) {
    const out = {}, human = !info.partnerCpu, lf = st.lift, C0 = K();
    // keep going up while jumping for something
    if (st.held) {
      const c = st.held, bn = M().binFor(st, c.kind);
      if (!bn || c.kind === 'toffee') {
        // an unwrapped toffee: put it on a recycle grate so it comes round again
        let g = null;
        for (const q of st.grates) if (!q.shaft && (!g || Math.abs((q.x0 + q.x1) / 2 - cx(p)) < Math.abs((g.x0 + g.x1) / 2 - cx(p)))) g = q;
        const gx = g ? (g.x0 + g.x1) / 2 : cx(p);
        if (go(st, S, p, out, gx, C0.floorY, 8) || (g && cx(p) > g.x0 + 4 && cx(p) < g.x1 - 4 && p.grounded && feet(p) > C0.floorY - 3)) { out.down = true; out.act = 'tap'; out.left = out.right = false; }
        return out;
      }
      const tgt = M().tossTarget(st, p);
      if (tgt === bn && p.grounded) { out.act = 'tap'; return out; }
      // stand a little way in front of the bin, facing it
      const side = cx(p) < bn.x ? -1 : 1;
      let sx = bn.x + side * 70;
      if (bn.high) sx = Math.min(bn.x - 60, sx);
      sx = clamp(sx, 20, W - 20);
      if (bn.high) {
        if (!high(p)) { go(st, S, p, out, sx, 240, 8); if (S.wantLift && p.onLift && human && info.partnerIdle < 15) cpuSay(p, 'Lift up, please!', 2); return out; }
        // up there: walk toward the bin until the toss aims in (the lift or the shelf)
        cpuSeek(out, p, sx, 10);
        if (Math.abs(sx - cx(p)) < 12) { out.right = bn.x > cx(p); out.left = !out.right; }
        return out;
      }
      const there = go(st, S, p, out, sx, bn.y, 10);
      if (there || Math.abs(sx - cx(p)) < 14) { out.left = bn.x < cx(p); out.right = !out.left; if (Math.abs(sx - cx(p)) < 30) { out.left = out.left && Math.abs(p.vx) < 20; out.right = out.right && Math.abs(p.vx) < 20; } }
      return out;
    }
    // not holding: grab what's in reach
    const want = c => isUseful(st, c) && !(c.kind === 'toffee' && c.wrapSeen);
    const r = M().inReach(st, p, want);
    if (r.best) { out.act = 'tap'; return out; }
    // pick a useful candy to go for (stick with it for a bit)
    let T = S.target && st.candies.includes(S.target) && isUseful(st, S.target) && reachable(st, S.target, p) ? S.target : null;
    if (!T || (S.retarget = (S.retarget || 0) - dt) <= 0) {
      let best = null;
      for (const c of st.candies) {
        if (!isUseful(st, c) || !reachable(st, c, p) || c.inWrap) continue;
        if (c.kind === 'toffee' && c.wrapSeen) continue;
        let d = Math.abs(c.x - cx(p)) + Math.abs(c.y - feet(p)) * 0.8;
        if (c.st === 'belt' && c.belt.spd === 2 && !st.gold.grab) d += 120;
        if (c === S.target) d -= 60;
        if (!best || d < best.d) best = { c, d };
      }
      T = best ? best.c : null; S.target = T; S.retarget = 0.5;
    }
    if (!T) {
      // nothing to grab yet: wait under where candy comes down to
      let wx = 480;
      const low = st.belts.filter(b => b.y >= 300);
      if (low.length) { const b = low[0]; wx = clamp(cx(p), b.x0 + 40, b.x1 - 40); }
      if (high(p)) go(st, S, p, out, wx, C0.floorY, 20); else cpuSeek(out, p, wx, 40);
      return askOp(st, S, p, o, out, info, human, null);
    }
    // where it will be in a moment
    let tx = T.x, ty = T.y;
    if (T.st === 'belt') tx = clamp(T.x + T.belt.v * 0.35, T.belt.x0 + 10, T.belt.x1 - 10);
    if (T.st === 'air') { tx = T.x + T.vx * 0.3; ty = Math.max(T.y, T.y + T.vy * 0.3); }
    const surfY = T.st === 'belt' ? T.belt.y : T.st === 'rest' && T.surf === 'lift' ? lf.y : T.st === 'rest' && T.surf === 'shelf' ? 240 : C0.floorY;
    if (T.st === 'belt' && T.belt.y < 300) {
      // the high belt, from up high
      go(st, S, p, out, tx, 240, 8);
    } else if (T.st === 'belt') {
      // a low belt: from the floor jump up and grab on the way (or stand on the belt)
      const fy = feet(p);
      if (Math.abs(fy - T.belt.y) < 3) cpuSeek(out, p, tx, 4);
      else if (fy < T.belt.y - 3) go(st, S, p, out, tx, T.belt.y, 6);
      else {
        cpuSeek(out, p, tx, 6);
        if (p.grounded && Math.abs(tx - cx(p)) < 30 && (T.belt.spd < 2 || st.gold.grab)) out.jump = 'tap';
        else if (!p.grounded && p.vy < 0) out.jump = true;
      }
    } else if (T.st === 'air') {
      if (high(p) && ty > 300) go(st, S, p, out, tx, C0.floorY, 10); else cpuSeek(out, p, tx, 6);
    } else {
      go(st, S, p, out, tx, surfY, 4);
    }
    // in the air near it: grab
    if (!p.grounded) { const r2 = M().inReach(st, p, want); if (r2.best) out.act = 'tap'; }
    return askOp(st, S, p, o, out, info, human, T);
  }
  // with a person on the levers: ask for what's needed
  function askOp(st, S, p, o, out, info, human, T) {
    if (!human || info.partnerIdle > 15) return out;
    const lf = st.lift;
    if (S.wantLift && p.onLift && lf && Math.abs(lf.y - lf.lo) < 4) { cpuSay(p, 'Lift up, please!', 2); return out; }
    if (!st.belts.some(b => b.spd) && !st.candies.some(c => isUseful(st, c))) { cpuFor(S, 'still', true, 1 / 120) > 3 && cpuSay(p, 'Start the belt, please!', 2.2); return out; }
    cpuFor(S, 'still', false, 0);
    if (T && T.st === 'belt' && T.belt.spd === 2 && !st.gold.grab && Math.abs(T.x - cx(p)) < 160) { cpuSay(p, 'Slow the belt down, please!', 2); return out; }
    if (T && T.st === 'belt' && T.belt.y < 300 && !high(p) && st.trap && T.belt === st.trap.belt) { if (Math.abs(T.x - (st.trap.x0 + st.trap.x1) / 2) < 60) cpuSay(p, 'Open the trapdoor!', 2); return out; }
    if (T && T.st === 'belt' && T.belt.y >= 300 && T.belt.spd) {
      const d = Math.sign(T.belt.v), endX = d > 0 ? T.belt.x1 : T.belt.x0;
      if ((endX - T.x) * d < 140 && (cx(p) - T.x) * d < -60 && T.belt.ends[d > 0 ? 1 : 0] !== 'wall') cpuSay(p, 'Flip the belt this way!', 2);
    }
    return out;
  }

  cpuBrain('conveyor', {
    reset(S) { S.target = null; S.cd = 0; },
    think(S, p, o, dt, info) {
      const st = info.mst;
      if (!st || !st.belts || info.intro || st.phase !== 'play') return {};
      return p.id === st.op ? operate(st, S, p, o, dt, info) : sort(st, S, p, o, dt, info);
    },
  });
})();
