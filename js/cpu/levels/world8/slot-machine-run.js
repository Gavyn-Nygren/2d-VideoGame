/* Pip & Bo - Computer partner: slot machine run. */
'use strict';

(() => {
  /* Each room names the stopper (G.mst.stopper) and the runner (G.mst.runner); the computer does the job it has.
     The way across is a row of "stations" left to right: tile ledges (the start, a pillar, the goal ledge) and reels.
     Runner: stands near the front of its station until the next station is something to land on (a ledge, or a reel
     stopped on a good picture with enough hold left), then plans the hop on a copy of the game's movement (tiles,
     stopped reels as one-way platforms, cherry bounces): it tries standing jumps from a few spots, running jumps and
     "steer only once high enough" flights, and follows the quickest one that lands on that station. On a cherry it
     keeps bouncing over the cherry and leaves on the bounce that reaches. If the stopper keeps it waiting it shouts
     STOP (the runner's action). After the JACKPOT it walks into the door.
     Stopper: walks the deck under the reel the runner needs next and stops it on a good picture (watching the reel
     spin, with a person's reaction time: on easy it misses now and then, which the level forgives). With no hold
     limit it stops reels ahead early; with a hold limit it waits until the runner is close, presses again to renew the
     hold while the runner gets ready, and re-spins a sour stop. A runner who jumps first gets a mid-air save. After the
     JACKPOT it rides the spring up to the door.
     It reads only what the screen shows: the reels, the pictures, the hold bars and where the runner is. */
  const TS = () => MODES.slots.test;
  // the highest top a reel can stop on (a tall 7 is higher than a BAR): a leap aims over it, so any good stop catches it
  const highTop = r => r.yp + Math.min(...r.strip.filter(ch => TS().slotsGoodCh(r, ch) && SLOTS_SYM[ch].top != null).map(ch => SLOTS_SYM[ch].top));
  const SL = () => MODES.slots.test.SLOTS;
  const SIM_DT = 1 / 120, SIM_T = 2.6;
  // a speech bubble, at most once every `gap` seconds for the same words (cpuSay alone keeps a bubble up while called)
  function say(st, p, text, gap) {
    const at = st.saidAt || (st.saidAt = {});
    if (at[text] != null && G.time - at[text] < gap) return;
    at[text] = G.time; cpuSay(p, text, 2);
  }

  /* ---------- stations ---------- */
  const stCache = new WeakMap();
  function stations(M) {
    let S = stCache.get(M.reels);
    if (S) return S;
    S = [];
    const tray = SL().trayY;
    const solid = (tx, ty) => tx < 0 || tx >= COLS || ty < 0 || (ty < ROWS && G.level.grid[ty][tx] === '#');
    // tile ledges above the coin tray: runs of columns with the same top
    for (let ty = 2; ty * T < tray - 1; ty++) {
      let tx = 1;
      while (tx < COLS - 1) {
        if (!(solid(tx, ty) && !solid(tx, ty - 1))) { tx++; continue; }
        let e = tx; while (e + 1 < COLS - 1 && solid(e + 1, ty) && !solid(e + 1, ty - 1)) e++;
        S.push({ kind: 'tile', x0: tx * T, x1: (e + 1) * T, top: ty * T });
        tx = e + 1;
      }
    }
    for (const r of M.reels) S.push({ kind: 'reel', r, x0: r.x0, x1: r.x1 });
    S.sort((a, b) => a.x0 - b.x0 || (a.top || 0) - (b.top || 0));
    S.forEach((s, i) => { s.i = i; s.goal = s.kind === 'tile' && Math.abs(s.top - M.goalTop) < 1 && s.x1 > M.goalX; });
    stCache.set(M.reels, S);
    return S;
  }
  // the top to land on (null while a reel spins or shows a sour picture), and whether it bounces
  function topOf(s) {
    if (s.kind === 'tile') return { top: s.top, bounce: false };
    const pl = TS().slotsPlat(s.r);
    return pl ? { top: pl.top, bounce: pl.bounce } : null;
  }
  // the station a player stands on, or bounces on (over a cherry, above it), else null
  function standing(M, S, p) {
    if (!p.alive) return null;
    const P = M.pl[p.id], cx = p.x + p.w / 2, feet = p.y + p.h;
    if (P.on) return S.find(s => s.r === P.on) || null;
    if (P.boing) return S.find(s => s.r === P.boing) || null;
    if (p.grounded) return S.find(s => s.kind === 'tile' && Math.abs(s.top - feet) < 1.5 && p.x + p.w > s.x0 && p.x < s.x1) || null;
    if (P.cherryT > 0) {
      for (const s of S) {
        if (s.kind !== 'reel' || cx < s.x0 - 6 || cx > s.x1 + 6) continue;
        const tp = topOf(s);
        if (tp && tp.bounce && feet <= tp.top + 2) return s;
      }
    }
    return null;
  }
  const nextOf = (S, cur) => S.find(s => s.x0 >= cur.x1 - 2 && s !== cur) || null;

  /* ---------- the runner's moves, shared by the copy (sim) and the real runner ---------- */
  // left / right toward x without overshooting (ground: friction stops you, air: you push back)
  function seekDir(s, x, dead) {
    const d = x - (s.x + PW / 2), v = s.vx;
    if (Math.abs(d) <= dead) return Math.abs(v) > 40 ? -Math.sign(v) : 0;
    const acc = s.g ? PHYS.fricG : PHYS.accA;
    if (Math.sign(v) === Math.sign(d) && (v * v) / (2 * acc) >= Math.abs(d) - dead * 0.5) return -Math.sign(v);
    return Math.sign(d);
  }
  /* a plan: { mode: 'now' | 'stand' | 'run', tox (centre x to jump at), back (run-up start x), gate: 'now' | 'above' |
     'fall' (when the air steering starts), tx (centre x to land at), top, D (direction) }.
     ph: { stage: 'pre' | 'back' | 'run' | 'air' } . Returns { dir, press, hold }. */
  function policy(s, k, ph) {
    const cx = s.x + PW / 2;
    if (ph.stage === 'air' || !s.g) {
      if (ph.stage !== 'air' && !s.g && k.mode === 'now') ph.stage = 'air';
      let go = k.gate === 'now' || (k.gate === 'above' && s.y + PH < k.top - 4) || (k.gate === 'fall' && s.vy > 0);
      if (ph.stage === 'air' && !go && s.vy > 0 && s.y + PH > k.top - 30) go = true;   // never wait past the target's height
      return { dir: go ? seekDir(s, k.tx, 3) : 0, press: false, hold: true };
    }
    if (k.mode === 'now') { ph.stage = 'air'; return { dir: 0, press: true, hold: true }; }
    if (k.mode === 'stand') {
      if (Math.abs(k.tox - cx) < 4 && Math.abs(s.vx) < 30) { ph.stage = 'air'; return { dir: 0, press: true, hold: true }; }
      return { dir: seekDir(s, k.tox, 2), press: false, hold: false };
    }
    // run: back up to the run-up spot, then run and jump on the spot
    if (ph.stage === 'pre') ph.stage = k.D * (cx - k.back) > 2 ? 'back' : 'run';
    if (ph.stage === 'back') {
      if (k.D * (cx - k.back) <= 2) ph.stage = 'run';
      else return { dir: -k.D, press: false, hold: false };
    }
    if (k.D * (cx - k.tox) >= 0) { ph.stage = 'air'; return { dir: k.D, press: true, hold: true }; }
    return { dir: k.D, press: false, hold: false };
  }

  // the copy of the game's movement: tiles and the reels' platforms as they are now
  const solidAt = (tx, ty) => solidFor(tile(tx, ty), G.players[0]);
  function simStep(s, mv, press, hold, plats, dt) {
    if (s.g || mv) s.carry = 0;
    if (mv) s.vx = approach(s.vx, mv * PHYS.maxRun, (s.g ? PHYS.accG : PHYS.accA) * dt);
    else s.vx = approach(s.vx, 0, (s.g ? PHYS.fricG : PHYS.fricA) * dt);
    if (press && s.g) { s.vy = -PHYS.jumpV; s.jumping = true; s.g = false; }
    if (s.jumping && !hold && s.vy < 0) { s.vy *= PHYS.cut; s.jumping = false; }
    if (s.vy >= 0) s.jumping = false;
    s.vy = Math.min(s.vy + PHYS.g * dt, PHYS.maxFall);
    // x
    s.x += s.vx * dt;
    let ty1 = Math.floor((s.y + 0.01) / T), ty2 = Math.floor((s.y + PH - 0.01) / T);
    if (s.vx > 0) { const tx = Math.floor((s.x + PW - 0.001) / T); for (let ty = ty1; ty <= ty2; ty++) if (solidAt(tx, ty)) { s.x = tx * T - PW; s.vx = 0; break; } }
    else if (s.vx < 0) { const tx = Math.floor((s.x + 0.001) / T); for (let ty = ty1; ty <= ty2; ty++) if (solidAt(tx, ty)) { s.x = (tx + 1) * T; s.vx = 0; break; } }
    // y
    s.y += s.vy * dt;
    const tx1 = Math.floor((s.x + 0.01) / T), tx2 = Math.floor((s.x + PW - 0.01) / T);
    if (s.vy > 0) {
      const ty = Math.floor((s.y + PH - 0.001) / T);
      for (let tx = tx1; tx <= tx2; tx++) if (solidAt(tx, ty)) { s.y = ty * T - PH; s.vy = 0; break; }
    } else if (s.vy < 0) {
      const ty = Math.floor((s.y + 0.001) / T);
      for (let tx = tx1; tx <= tx2; tx++) if (solidAt(tx, ty)) { s.y = (ty + 1) * T; s.vy = 0; s.jumping = false; break; }
    }
    const by = s.y + PH, gy = Math.floor((by + 1) / T);
    s.g = false; s.on = null; s.boing = null;
    for (let tx = tx1; tx <= tx2; tx++) if (solidAt(tx, gy)) { s.g = true; break; }
    // stopped reels: one-way platforms (land from above), cherries bounce
    if (s.vy >= -1) {
      let best = null;
      for (const pl of plats) {
        if (!(s.x + 4 < pl.x1 && s.x + PW - 4 > pl.x0)) continue;
        if (s.pf > pl.top + 2 || by < pl.top - 0.5) continue;
        if (!best || pl.top < best.top) best = pl;
      }
      if (best) {
        s.y = best.top - PH;
        if (best.bounce) { s.vy = -SL().cherryV; s.g = false; s.jumping = false; s.boing = best.r; }
        else { s.vy = 0; s.g = true; s.on = best.r; }
      }
    }
    s.pf = s.y + PH;
  }
  function platsNow(M) {
    const out = [];
    for (const r of M.reels) { const pl = TS().slotsPlat(r); if (pl) out.push({ r, x0: r.x0, x1: r.x1, top: pl.top, bounce: pl.bounce }); }
    return out;
  }
  // try one plan from the runner's state: seconds to land on the target (and how far from its middle), or null
  function simPlan(p, k, tgt, plats, from) {
    const s = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, g: p.grounded, jumping: p.jumping, pf: p.y + p.h, carry: 0, on: null, boing: null };
    const ph = { stage: p.grounded ? 'pre' : 'air' };
    let air = !s.g;
    const tray = SL().trayY;
    for (let t = 0; t < SIM_T; t += SIM_DT) {
      const c = policy(s, k, ph);
      simStep(s, c.dir, c.press, c.hold, plats, SIM_DT);
      if (s.y + PH >= tray - 1) return null;
      if (!s.g && !s.boing) { air = true; continue; }
      const cx = s.x + PW / 2;
      if (s.boing) {
        if (tgt.kind === 'reel' && s.boing === tgt.r && cx > tgt.x0 + 8 && cx < tgt.x1 - 8) return { t, off: Math.abs(cx - (tgt.x0 + tgt.x1) / 2) };
        if (air && s.boing !== (from && from.r)) return null;   // bounced on some other cherry
        air = true; continue;
      }
      if (!air) { if (t > 2) return null; continue; }
      // landed: on the target?
      const ok = tgt.kind === 'reel' ? s.on === tgt.r : (!s.on && Math.abs(s.y + PH - tgt.top) < 1);
      if (ok && s.x + PW - 8 > tgt.x0 && s.x + 8 < tgt.x1) return { t, off: Math.abs(cx - k.tx) };
      return null;
    }
    return null;
  }
  // every plan worth trying from here to tgt, the quickest safe one first
  function planHop(p, M, cur, tgt, cherry, leapTop) {
    const tp = leapTop != null ? { top: leapTop, bounce: false } : topOf(tgt);
    if (!tp) return null;
    const D = (tgt.x0 + tgt.x1) / 2 > p.x + p.w / 2 ? 1 : -1;
    // land a little past the near edge on a goal ledge (the jackpot), else in the middle
    const tx = tgt.goal ? (D > 0 ? tgt.x0 + 26 : tgt.x1 - 26) : (tgt.x0 + tgt.x1) / 2;
    const plats = platsNow(M), out = [];
    if (leapTop != null) plats.push({ r: tgt.r, x0: tgt.x0, x1: tgt.x1, top: leapTop, bounce: false });   // as if it stops on its tallest picture
    const base = { tx, top: tp.top, D };
    const gates = ['now', 'above', 'fall'];
    if (!p.grounded || cherry) for (const gate of gates) out.push(Object.assign({ mode: 'now', gate }, base));
    else {
      const lo = cur.x0 + 6, hi = cur.x1 - 6;
      const edge = D > 0 ? hi : lo;
      for (const gate of gates) {
        out.push(Object.assign({ mode: 'now', gate }, base));
        for (const back of [8, 22, 40]) out.push(Object.assign({ mode: 'stand', gate, tox: clamp(edge - D * back, lo, hi) }, base));
        out.push(Object.assign({ mode: 'stand', gate, tox: (cur.x0 + cur.x1) / 2 }, base));
      }
      for (const gate of ['now', 'above']) for (const at of [2, 14]) {
        out.push(Object.assign({ mode: 'run', gate, tox: clamp(edge - D * at, lo, hi), back: D > 0 ? lo : hi }, base));
      }
    }
    let best = null, bestS = Infinity;
    for (const k of out) {
      const r = simPlan(p, k, tgt, plats, cur);
      if (!r) continue;
      const sc = r.t + r.off / 150;
      if (sc < bestS) { bestS = sc; best = k; best.simT = r.t; }
    }
    return best;
  }

  /* ---------- runner ---------- */
  function runner(st, p, o, dt, info, M, S, out) {
    if (!p.alive) { st.plan = null; return out; }
    const last = CPU.last[p.id] || {};
    const door = G.level.door;
    if (M.phase !== 'play') {
      if (door && p.grounded) seekOut(out, p, door.x + door.w / 2, 3);
      return out;
    }
    const P = M.pl[p.id];
    const cur = standing(M, S, p);
    if (cur) { if (cur !== st.cur) { st.cur = cur; st.waitT = 0; } }
    st.replan = (st.replan || 0) - dt;
    // follow the plan
    if (st.plan) {
      const k = st.plan;
      if ((p.grounded || P.boing) && st.ph.stage === 'air' && st.airT > 0.05) st.plan = null;   // landed (wherever): look again
      else if ((st.planT += dt) > SIM_T + 1) st.plan = null;
      else {
        if (!p.grounded) st.airT += dt;
        const c = policy({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, g: p.grounded }, k, st.ph);
        out.left = c.dir < 0; out.right = c.dir > 0;
        if (c.press) {
          if (last.jump) { out.jump = false; st.ph.stage = k.mode === 'run' ? 'run' : 'pre'; }
          else { out.jump = 'tap'; if (k.leap) { out.act = 'tap'; say(st, p, 'Stop it under me!', 6); } }
        }
        else out.jump = c.hold && !p.grounded;
        // the target reel started spinning again before we got there and we are still on the ground: stop
        if (p.grounded && st.ph.stage !== 'air' && !k.leap && !topOf(k.tgt)) st.plan = null;
        // a leap of faith whose stopper walked away before take-off: wait again
        if (k.leap && p.grounded && st.ph.stage !== 'air' && TS().slotsZone(M, o) !== k.tgt.r.i) st.plan = null;
        return out;
      }
    }
    if (!st.cur) { return out; }
    const nx = nextOf(S, st.cur);
    if (!nx) return out;
    const tp = topOf(nx), r = nx.r;
    // a reel with a short hold left may spin away mid-jump: wait for the stopper to renew it
    const holdOk = nx.kind !== 'reel' || (tp && (r.holdT == null || r.holdLeft > 1.0 || r.state === 'settle'));
    const onCherry = !!(cur && (topOf(cur) || {}).bounce);
    // a person's moment to see that the reel stopped
    if (st.rdyI !== nx.i) { st.rdyI = nx.i; cpuFor(st, 'ready', false, dt); cpuFor(st, 'leap', false, dt); }
    const seen = cpuFor(st, 'ready', !!(tp && holdOk), dt) >= 0.3 - 0.15 * info.skill;
    if (tp && holdOk && seen && (cur || onCherry) && st.replan <= 0 && (p.grounded || (onCherry && p.vy < 0))) {
      st.replan = 0.12;
      const k = planHop(p, M, st.cur, nx, onCherry && !p.grounded);
      if (k) {
        k.tgt = nx; st.plan = k; st.ph = { stage: p.grounded ? 'pre' : 'air' }; st.planT = 0; st.airT = 0;
        return runner(st, p, o, 0, info, M, S, out);
      }
    }
    // wait: at the front of a ledge or reel, or over the middle of a cherry
    st.waitT = (st.waitT || 0) + dt;
    const front = onCherry ? (st.cur.x0 + st.cur.x1) / 2 : nx.x0 > st.cur.x1 - 2 ? st.cur.x1 - 16 : (st.cur.x0 + st.cur.x1) / 2;
    if (p.grounded || onCherry) seekOut(out, p, front, 3);
    out.jump = false;
    if (!tp && !info.partnerCpu && info.partnerIdle < 20) {
      // short-hold rooms (Turbo Spin's tip: "Jump, then stop the reel under Bo!"): a person stopper standing under the
      // next reel may be waiting for us to jump first. After a moment, jump at it and shout STOP (a mid-air save).
      const leapOk = nx.kind === 'reel' && !r.need && r.holdT != null && r.holdT <= 3 && o.alive && p.grounded && cur
        && TS().slotsZone(M, o) === r.i && r.state === 'spin' && r.ramp >= 1;
      if (leapOk && cpuFor(st, 'leap', true, dt) > 1.6 - 0.6 * info.skill && st.replan <= 0) {
        st.replan = 0.12;
        const k = planHop(p, M, st.cur, nx, false, highTop(r));
        if (k) {
          k.tgt = nx; k.leap = true; st.plan = k; st.ph = { stage: 'pre' }; st.planT = 0; st.airT = 0;
          return runner(st, p, o, 0, info, M, S, out);
        }
      } else if (!leapOk) cpuFor(st, 'leap', false, dt);
      // a stopper who keeps us waiting: shout STOP (the runner's action) now and then, and say it once in a while
      if (st.waitT > 3) {
        st.shoutT = (st.shoutT || 0) - dt;
        if (st.shoutT <= 0) { out.act = 'tap'; st.shoutT = 5; say(st, p, 'Stop that reel!', 12); }
      }
    }
    return out;
  }
  function seekOut(out, p, x, dead) {
    const d = seekDir({ x: p.x, vx: p.vx, g: p.grounded }, x, dead);
    out.left = d < 0; out.right = d > 0;
  }

  /* ---------- stopper ---------- */
  // the reel the runner needs next: the one they fly to, or the next one after where they stand
  function neededReel(M, S, rn, st) {
    if (!rn.alive) { st.rnCur = null; return null; }   // gulped: wait to see where they come back
    const cur = standing(M, S, rn);
    if (cur) { st.rnCur = cur; }
    if (!cur && st.rnCur) {
      // in the air: the reel under where they are heading (a mid-air save), if they have left their station
      const cx = rn.x + rn.w / 2, ahead = cx + rn.vx * 0.25;
      const over = S.find(s => s.kind === 'reel' && ahead > s.x0 - 10 && ahead < s.x1 + 10 && s !== st.rnCur && !topOf(s));
      if (over && (cx > st.rnCur.x1 || cx < st.rnCur.x0)) return { s: over, near: 0 };
    }
    const from = cur || st.rnCur;
    if (!from) return null;
    let s = nextOf(S, from), near = 0;
    while (s && s.kind !== 'reel') { s = nextOf(S, s); near++; }
    return s ? { s, near } : null;
  }
  function stopper(st, p, o, dt, info, M, S, out) {
    if (!p.alive) return out;
    const spring = M.spring, door = G.level.door;
    if (M.phase !== 'play') {
      // the jackpot: ride the spring up, then into the door
      if (M.pl[p.id].fly && !p.grounded) return out;
      if (p.y + p.h > SL().trayY) { if (spring && spring.on) seekOut(out, p, spring.x + T / 2, 2); }
      else if (door) seekOut(out, p, door.x + door.w / 2, 3);
      return out;
    }
    // the reels as the computer sees them: a person's moment late
    const lag = 0.27 - 0.19 * info.skill;
    st.seen = M.reels.map(r => cpuLag(st, 'pos' + r.i, r.pos, lag));
    const need = neededReel(M, S, o, st);
    if (!need) return out;
    // the needed reel already stands ready (a good picture with plenty of hold): get the one after it ready too
    let tgt = need.s, near = need.near;
    const ready = s => TS().slotsPlat(s.r) && s.r.state === 'stop' && (s.r.holdT == null || s.r.holdLeft > 2.5 || TS().slotsOver(M, s.r));
    while (ready(tgt)) {
      let n = nextOf(S, tgt);
      while (n && n.kind !== 'reel') n = nextOf(S, n);
      if (!n) break;
      tgt = n; near++;
    }
    const r = tgt.r, cx = (r.x0 + r.x1) / 2;
    seekOut(out, p, cx, 6);
    if (TS().slotsZone(M, p) !== r.i) return out;
    const rnReady = near === 0 && (o.alive || r.holdT == null);
    const early = r.holdT == null || (r.holdT >= 6 && near <= 1);
    st.pressCD = (st.pressCD || 0) - dt;
    if (st.pressCD > 0) return out;
    if (r.state === 'spin' && (rnReady || early)) {
      if (r.ramp < 1) return out;
      if (goodNow(st, r, info, dt)) { out.act = 'tap'; st.pressCD = 0.2; }
    } else if (r.state === 'stop') {
      const good = TS().slotsGoodCh(r, TS().slotsSym(r, r.target));
      if (!good) { if (rnReady || early) { out.act = 'tap'; st.pressCD = 0.4; } }   // sour: spin it again at once
      else if (r.holdT != null && r.holdLeft < 1.6 && !TS().slotsOver(M, r) && rnReady) { out.act = 'tap'; st.pressCD = 0.5; }
    }
    if (!info.partnerCpu && r.state === 'stop' && TS().slotsPlat(r) && rnReady && o.grounded && Math.abs(o.vx) < 5 && info.partnerIdle > 3 && info.partnerIdle < 20) say(st, p, 'Hop on!', 10);
    return out;
  }
  // press now? The computer watches the reel with a person's delay and guesses where it is now (a little off on easy)
  function goodNow(st, r, info, dt) {
    const lag = 0.27 - 0.19 * info.skill, rate = r.dir * r.speed * r.slow * r.ramp;
    const seen = st.seen[r.i];
    st.errT = (st.errT || 0) - dt;
    if (st.errT <= 0) { st.err = (Math.random() * 2 - 1) * (1 - info.skill) * 0.9; st.errT = 0.4; }
    const est = seen + rate * lag * (1 + st.err), g = SL().grace * r.dir;
    const good = q => TS().slotsGoodCh(r, TS().slotsSym(r, Math.round(q)));
    return good(est - g) && good(est - g - 0.22) && good(est - g + 0.22);
  }

  cpuBrain('slots', {
    reset(st) { st.plan = null; st.cur = null; },
    think(st, p, o, dt, info) {
      const M = info.mst, out = {};
      if (!M || !M.reels) return out;
      const S = stations(M);
      if (info.intro && G.introT > SL().introHold) return out;
      return M.stopper === p.id ? stopper(st, p, o, dt, info, M, S, out) : runner(st, p, o, dt, info, M, S, out);
    },
  });
})();
