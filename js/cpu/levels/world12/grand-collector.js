/* Pip & Bo - Computer partner: grand collector. */
'use strict';

/* 12-1 The Grand Collector (mode 'collector'): one brain for the four phases. Every phase gives each player a job
   (the level's own badges), and the jobs swap inside each phase, so the brain reads the job every step and plays it:
     Cannons   loader: fetch a keg and a ball (both before walking back), load, then wait in the safe spot by the
               cannon with the next load ready. gunner: try shots in its head (the game's own trace) while the loader
               works, aim at his belly if a shot gets there, else at the wall block that clears it best, then fire.
     Reels     stopper: walks under the reel the runner needs next and times its press on a good picture.
               runner: waits on its step until the next reel holds a good picture, then hops (a jump it tried in its
               head first), and rides the top cherry onto his hat.
     Lava      follows the level's own job list (press, hold, climb, cross, turn...) with cpuNav, waits beside its
               steps or at its gap until the partner's button builds them, and holds the action on its valve. On its
               spot it just stands (no cpuNav: its map is rebuilt whenever a step builds). If the partner stands on
               its button it waits beside it ("Scoot over!"); if they stand in its way it hops over them.
     Finale    setter: gets under his serve and bumps it up. spiker: keeps apart, gets under the gold ball, spikes it
               (or bumps it on easy). Then both grab a knot on his cord and pull.
   It dodges his junk and claw (slower on easy) and never does the partner's job, so nothing is won alone. When the
   person has pressed nothing for the level's idle time (10 s) and the brain is only waiting on them (st.blk: nothing of
   its own left to do), it stops too, so he waits like he does for two people. A person who stands on a plate or waits
   for a set while the computer works keeps it working (it stops anyway after 15 s). */
(() => {
  const IDLE = 10;                                  // GC.idleAfter: he waits when nobody plays this long
  const react = info => 0.45 - 0.3 * info.skill;    // s before reacting to something new (easy 0.34, hard 0.15)
  const busyNow = (S, p) => { const ph = GC_PHASES[S.phase]; return !!(ph && ph.busy && ph.busy(S, p)); };

  // walk to x on flat ground, slowing down near it (so a late or laggy press doesn't overshoot)
  function steerTo(out, p, x, dead = 4, gain = 6) {
    const d = x - cpuCx(p), ad = Math.abs(d);
    out.left = out.right = false;
    if (ad <= dead) return Math.abs(p.vx) < 30;
    const want = Math.min(PHYS.maxRun, gain * ad + 15);
    if (p.vx * Math.sign(d) < want) { if (d > 0) out.right = true; else out.left = true; }
    return false;
  }
  // a short line now and then (1-player mode only), at most once per key until `again` s passed
  let quiet = false;   // (set while the person is away: no lines nobody reads)
  function say(st, p, key, text, again = 12) {
    if (quiet) return;
    const s = st.said || (st.said = {});
    if (s[key] != null && G.time - s[key] < again) return;
    s[key] = G.time; cpuSay(p, text, 2);
  }
  // his junk or claw about to land where p stands: { x, w } (the spot and how far to step away), or null.
  // Seen only after a reaction time; on easy some throws are missed now and then.
  function threat(st, S, p, info) {
    const r = 0.5 - 0.35 * info.skill, cx = cpuCx(p), feet = cpuFeet(p);
    const skip = st.skip || (st.skip = new WeakMap());
    let best = null;
    for (const j of S.junk) {
      if (j.t < r || j.tt - j.t <= 0 || Math.abs(feet - j.ty) > 45) continue;
      if (!skip.has(j)) skip.set(j, Math.random() < (1 - info.skill) * 0.35);
      if (skip.get(j)) continue;
      const w = 22 + p.w / 2 + 8;
      if (Math.abs(cx - j.tx) < w && (!best || j.tt - j.t < best.left)) best = { x: j.tx, w, left: j.tt - j.t };
    }
    const c = S.claw;
    if (c && !c.done && (c.phase !== 'warn' || c.t >= r) && Math.abs(feet - c.ty) < 45) {
      const w = 26 + p.w / 2 + 8;
      if (Math.abs(cx - c.tx) < w) best = { x: c.tx, w, left: 0 };
    }
    return best;
  }
  // where to step to get out from under a threat, staying within [lo, hi]
  function escapeX(p, th, lo, hi) {
    const cx = cpuCx(p), a = th.x - th.w - 6, b = th.x + th.w + 6;
    const okA = a >= lo, okB = b <= hi;
    if (okA && okB) return Math.abs(cx - a) < Math.abs(cx - b) ? a : b;
    return okA ? a : okB ? b : null;
  }
  // a hop over the partner when they stand right in the way (cpuNav doesn't know about partners). Pushing into them
  // keeps vx up without moving, so being stuck counts too (Bo hops first when both push, so they don't hop together)
  function hopPartner(st, out, p, o) {
    const was = st.hpX;
    st.hpX = p.x;
    if (!p.grounded || !o.alive || !(out.left || out.right) || Math.abs(cpuFeet(o) - cpuFeet(p)) > 4) { st.hpT = 0; return; }
    const dir = out.right ? 1 : -1, d = (cpuCx(o) - cpuCx(p)) * dir;
    const near = d > 0 && d < p.w + 10;
    st.hpT = near && was != null && Math.abs(p.x - was) < 0.3 ? (st.hpT || 0) + DT : 0;
    if (near && (Math.abs(p.vx) < 60 || st.hpT > (p.id ? 0.15 : 0.6))) { out.jump = 'tap'; st.hopAir = true; }
  }
  // the partner keeps standing between me and x (I hop, they're still there): say so now and then
  function blockedBy(st, p, o, x) {
    const d = cpuCx(o) - cpuCx(p), g = x - cpuCx(p);
    const near = o.alive && Math.abs(d) < p.w + 12 && Math.sign(d) === Math.sign(g) && Math.abs(g) > 20 && Math.abs(cpuFeet(o) - cpuFeet(p)) < 30;
    if (near) { if (st.blkSince == null || G.time - st.blkLast > 1) st.blkSince = G.time; st.blkLast = G.time; }
    if (near && G.time - st.blkSince > 3) say(st, p, 'excuse', 'Excuse me!', 10);
  }
  // the hop over the partner under way: a full jump (held while rising) on toward x. True while it lasts.
  function hopOn(st, out, p, x) {
    if (p.grounded || !st.hopAir) { if (p.grounded && !CPU.last[p.id].jump) st.hopAir = false; return false; }
    const d = x - cpuCx(p);
    out.left = d < -3; out.right = d > 3; out.jump = p.vy < 0;
    return true;
  }

  /* ===== Phase 1: Castle Cannons ===== */
  const settled = ph => !ph.balls.length && ph.wall.cols.every(c => c.blocks.every(b => b.vy === 0));
  const wallKey = ph => ph.stage + ':' + ph.wall.cols.map(c => c.blocks.map(b => b.hp).join('')).join('|');
  // grid search over (angle, power) with the game's own trace, a few traces per step
  function aimPlan(st, S, info) {
    const ph = S.ph, key = wallKey(ph) + (ph.lucky ? 'L' : '');
    if (!st.aim || st.aim.key !== key) {
      const cands = [];
      for (let a = 6; a <= 78; a += 2) for (let pw = 0.3; pw <= 1.0001; pw += 0.035) cands.push({ a, p: pw });
      const E = 1 - info.skill;
      st.aim = { key, cands, i: 0, fine: null, best: null, noise: { a: (Math.random() * 2 - 1) * 2.4 * E, p: (Math.random() * 2 - 1) * 0.035 * E } };
    }
    const A = st.aim, tr = GC_PHASES.cannons.test.trace;
    let budget = 16;                                  // (traces per step: a plan takes about half a second)
    const run = list => { while (budget > 0 && list.i < list.cands.length) { const c = list.cands[list.i++]; c.h = tr(c.a, c.p); budget--; } return list.i >= list.cands.length; };
    if (!A.best && !A.fine && run(A)) {
      const b = pickShot(A.cands, 2, 0.035);
      if (b) {
        const cands = [];
        for (let da = -1.5; da <= 1.5001; da += 0.5) for (let dp = -0.03; dp <= 0.0301; dp += 0.01) cands.push({ a: clamp(b.a + da, 5, 80), p: clamp(b.p + dp, 0, 1) });
        A.fine = { cands, i: 0 };
      } else A.best = { a: 35, p: 0.7, none: true };
    }
    if (A.fine && !A.best && run(A.fine)) A.best = pickShot(A.fine.cands, 0.5, 0.01) || pickShot(A.cands, 2, 0.035);
    return A.best;
  }
  // the shot class: a belly hit beats everything; else a block (piercing, nearer him and higher is better)
  function shotScore(h) {
    if (!h) return 0;
    if (h.kind === 'jar') return 1000;
    if (h.kind === 'block') {
      const ph = G.mst.ph, ci = ph.wall.cols.indexOf(h.col), bi = h.col.blocks.indexOf(h.b);
      return 200 + (Math.hypot(h.vx, h.vy) >= GC1.pierceV && h.b.hp <= 1 ? 40 : 0) + ci * 10 + bi * 2;
    }
    return 0;
  }
  const shotClass = h => (!h ? '' : h.kind === 'jar' ? 'jar' : h.kind === 'block' ? 'b' + G.mst.ph.wall.cols.indexOf(h.col) : '');
  function pickShot(cands, sa, sp) {
    let best = null, bs = 0;
    for (const c of cands) {
      const s0 = shotScore(c.h);
      if (!s0) continue;
      // steady shots: neighbours that do the same thing
      let n = 0;
      const cl = shotClass(c.h);
      for (const d of cands) if (d !== c && Math.abs(d.a - c.a) <= sa * 1.01 && Math.abs(d.p - c.p) <= sp * 1.01 && shotClass(d.h) === cl) n++;
      const s = s0 + n * 15;
      if (s > bs) { bs = s; best = c; }
    }
    return best;
  }
  // one aim axis: hold while far, pulse (a duty cycle) when close, so a late press doesn't overshoot
  function axis(st, k, err, thr, tol, out, pos, neg) {
    const a = Math.abs(err);
    if (a <= tol) { st[k] = 0; return true; }
    let on = a >= thr;
    if (!on) { st[k] = (st[k] || 0) + a / thr; if (st[k] >= 1) { st[k] -= 1; on = true; } }
    if (on) out[err > 0 ? pos : neg] = true;
    return false;
  }
  function gunner(st, p, o, info, S) {
    const ph = S.ph, cn = ph.cn, out = {};
    if (ph.stage !== 'wall1' && ph.stage !== 'wall2') return out;
    const ready = settled(ph), plan = ready ? aimPlan(st, S, info) : null;
    if (plan) st.tgt = { a: clamp(plan.a + st.aim.noise.a, 5, 80), p: clamp(plan.p + st.aim.noise.p, 0, 1) };
    const tgt = st.tgt || { a: 30, p: 0.7 };
    const okA = axis(st, '_a', tgt.a - cn.ang, 6, 0.45, out, 'up', 'down');
    const okP = axis(st, '_p', tgt.p - cn.pow, 0.06, 0.009, out, 'right', 'left');
    const loaded = cn.powder && cn.ball;
    st.blk = !loaded;                                 // waiting for the loader
    st.loadT = loaded ? (st.loadT || 0) + DT : 0;
    if (plan && okA && okP && loaded && cn.cool <= 0 && st.loadT > react(info)) { out.act = 'tap'; st.aim = null; }
    // a person loader who stands about: a nudge
    const carrying = ph.carry.powder || ph.carry.ball;
    st.waitT = !loaded && !carrying && !info.partnerCpu && info.partnerIdle > 2 ? (st.waitT || 0) + DT : 0;
    if (st.waitT > 6) say(st, p, 'load', cn.powder ? 'Now a ball!' : 'Bring powder!', 10);
    return out;
  }
  function loader(st, p, o, info, S) {
    const ph = S.ph, cn = ph.cn, c = ph.carry, out = {};
    if (!p.alive) return out;
    const hop = ph.hop, hx = hop.x + hop.w / 2, live = ph.stage === 'wall1' || ph.stage === 'wall2';
    const inHop = rectHit(p, hop.x, hop.y, hop.w, hop.h);
    const pile = k => ph.piles.find(q => q.kind === k);
    const deliver = (c.powder && !cn.powder) || (c.ball && !cn.ball);
    // what to get: whatever is missing from the cannon and my hands (both kinds, so the next load is ready too)
    const want = [];
    if (!c.powder) want.push(pile('powder'));
    if (!c.ball) want.push(pile('ball'));
    let goal = null, at = null;
    const needNow = (!cn.powder && !c.powder) || (!cn.ball && !c.ball);
    if (needNow || (!deliver && want.length)) {
      // fetch: the pile the cannon needs first, else the nearer one
      const need = want.filter(q => (q.kind === 'powder' ? !cn.powder : !cn.ball));
      const list = need.length ? need : want;
      const cx = cpuCx(p);
      goal = list.reduce((a, b) => (Math.abs(b.x + b.w / 2 - cx) < Math.abs(a.x + a.w / 2 - cx) ? b : a));
      at = { x: goal.x + goal.w / 2, feet: (goal.ty + 1) * T, rect: goal };
    }
    if (!at) at = { x: hx, feet: hop.y + hop.h, rect: hop, hop: true };
    if (!live && !deliver) at = { x: hx, feet: hop.y + hop.h, rect: hop, hop: true };
    // dodge his junk and claw (never while safe by the cannon)
    const th = !inHop && threat(st, S, p, info);
    if (th) {
      const ex = escapeX(p, th, 24, ph.fence - 20);
      if (ex != null && Math.abs(cpuFeet(p) - 450) < 2) { steerTo(out, p, ex, 3); return out; }
    }
    const nav = cpuNav(st, p, at.x, at.feet, { tol: 8 });
    Object.assign(out, nav);
    const r = at.rect, there = rectHit(p, r.x, r.y, r.w, r.h) && p.grounded;
    if (there && Math.abs(cpuCx(p) - at.x) < 16) {
      out.left = out.right = false; out.jump = false;
      if (at.hop) { if (deliver && live) out.act = 'tap'; else st.blk = true; }   // (else: ready, waiting for the shot)
      else out.act = 'tap';
    }
    // loaded and a person gunner who doesn't fire: a nudge
    st.firedT = live && cn.powder && cn.ball && !info.partnerCpu && info.partnerIdle > 2 ? (st.firedT || 0) + DT : 0;
    if (st.firedT > 5) say(st, p, 'fire', 'Fire away!', 12);
    return out;
  }

  /* ===== Phase 2: Jackpot Reels ===== */
  const R2 = () => GC_PHASES.reels.test;
  // the next stair's reel
  const stairReel = (ph, k) => (k >= 0 && k < ph.reels.length ? ph.reels[ph.order[k]] : null);
  // try a hop from (x, feet) onto reel r's step top in my head (the game's movement copy); seconds or 0
  function hopSim(p, ph, x, feet, r, top, kind) {
    const s = { x: x - PW / 2, y: feet - PH, vx: 0, vy: -PHYS.jumpV, g: false, jumping: true, dropT: 0 };
    const tx = (r.x0 + r.x1) / 2, panel = R2().GC2.panelY, plats = [];
    for (const q of ph.reels) { const pl = q !== r && R2().plat(q); if (pl) plats.push({ q, top: pl.top }); }
    for (let t = 0; t < 1.6; t += DT) {
      const pf = s.y + PH, d = tx - (s.x + PW / 2);
      let mv = Math.abs(d) > 2 ? Math.sign(d) : 0;
      if (kind === 'high' && s.vy < -260) mv = 0;
      navSim({}, p, s, mv, true, DT);
      const f = s.y + PH;
      if (s.vy >= 0) {
        if (pf <= top + 2 && f >= top - 0.5 && s.x + 4 < r.x1 && s.x + PW - 4 > r.x0) return t + 0.01;
        for (const o of plats) if (pf <= o.top + 2 && f >= o.top - 0.5 && s.x + 4 < o.q.x1 && s.x + PW - 4 > o.q.x0) return 0;
      }
      if (s.g || f >= panel - 1) return 0;
    }
    return 0;
  }
  // the best take-off spot on my surface [x0, x1] for a hop to reel r: steady (its neighbours work too), near me
  function hopPlan(p, ph, x0, x1, feet, r, top) {
    const tries = [];
    for (let x = x0; x <= x1; x += 5) for (const kind of ['jump', 'high']) tries.push({ x, kind, ok: hopSim(p, ph, x, feet, r, top, kind) > 0 });
    let best = null, bd = Infinity;
    const cx = cpuCx(p);
    for (const t of tries) {
      if (!t.ok) continue;
      const nb = tries.filter(u => u.kind === t.kind && Math.abs(u.x - t.x) <= 5.01 && u !== t);
      if (nb.length < 2 || !nb.every(u => u.ok)) continue;
      const d = Math.abs(t.x - cx) + (t.kind === 'high' ? 4 : 0);
      if (d < bd) { bd = d; best = t; }
    }
    if (!best) for (const t of tries) if (t.ok && Math.abs(t.x - cx) < bd) { bd = Math.abs(t.x - cx); best = t; }
    return best;
  }
  function runner(st, p, o, info, S) {
    const ph = S.ph, out = {}, R = R2();
    if (!p.alive || ph.stage !== 'live') { st.hop = null; st.blk = true; return out; }
    if (ph.P[p.id].launch) return out;                                  // the cherry's arc: hands off
    // in the air: steer the hop under way
    if (!p.grounded) {
      st.air = true;
      const h = st.hop;
      if (h && !h.none) {
        const d = h.tx - cpuCx(p);
        if (!(h.kind === 'high' && p.vy < -260) && Math.abs(d) > 2) { out.left = d < 0; out.right = d > 0; }
        out.jump = p.vy < 0;
      }
      return out;
    }
    const at = R.at(p.id);
    if (st.air) { st.air = false; st.hop = null; }                      // landed: plan the next hop afresh
    // up on his ledge without a bop: drop into the tray to go back to the start
    if (at === 9) { const dir = ph.side ? 1 : -1; out.left = dir < 0; out.right = dir > 0; return out; }
    if (at == null) return out;
    // my surface now
    let sx0, sx1, feet;
    if (at === -1) { const lg = ph.ledges[ph.side]; sx0 = lg.x0 + 12; sx1 = lg.x1 - 12; feet = lg.y; }
    else { const r = stairReel(ph, at), pl = R.plat(r); if (!pl) return out; sx0 = r.x0 + 6; sx1 = r.x1 - 6; feet = pl.top; }
    const next = stairReel(ph, at + 1), pl = next && R.plat(next);
    // dodge a throw while waiting (stay on my step)
    const th = threat(st, S, p, info);
    const dirUp = ph.side ? -1 : 1, waitX = dirUp > 0 ? sx1 - 14 : sx0 + 14;
    if (!pl || next.state !== 'stop') {
      st.readyT = 0; st.hop = null; st.blk = true;   // waiting for the stopper
      st.waitT = (st.waitT || 0) + DT;
      if (th) { const ex = escapeX(p, th, sx0, sx1); if (ex != null) { steerTo(out, p, ex, 3); return out; } }
      steerTo(out, p, at === -1 ? waitX : (sx0 + sx1) / 2 + dirUp * 12, 5);
      // a person stopper who waits: shout STOP (the runner's action) and say so
      if (!info.partnerCpu && st.waitT > 3.5 && !st.shouted) { st.shouted = true; out.act = 'tap'; say(st, p, 'stop', 'Stop the reel!', 8); }
      return out;
    }
    st.waitT = 0; st.shouted = false;
    st.readyT = (st.readyT || 0) + DT;
    if (st.readyT < react(info)) return out;
    const key = at + ':' + next.i + ':' + pl.top + ':' + feet;
    if (!st.hop || st.hop.key !== key) {
      const plan = hopPlan(p, ph, sx0, sx1, feet, next, pl.top);
      st.hop = plan ? { key, x: plan.x, kind: plan.kind, tx: (next.x0 + next.x1) / 2 } : { key, none: true };
    }
    const h = st.hop;
    if (h.none) { steerTo(out, p, waitX, 5); return out; }
    if (!steerTo(out, p, h.x, 3.5, 4) || Math.abs(p.vx) > 20) return out;
    out.left = out.right = false;
    if (CPU.last[p.id].jump) return out;      // let go first so the press counts
    out.jump = true;
    const d = h.tx - cpuCx(p);
    if (h.kind !== 'high' && Math.abs(d) > 2) { out.left = d < 0; out.right = d > 0; }
    return out;
  }
  function stopper(st, p, o, info, S) {
    const ph = S.ph, out = {}, R = R2(), n = ph.reels.length, rn = G.players[ph.runner];
    if (!p.alive) return out;
    // where the runner is (in the air: where they were)
    const at = rn.alive ? R.at(rn.id) : -1;
    if (at != null) st.lastAt = at === 9 ? -1 : at;
    if (!rn.alive) st.lastAt = -1;
    const prog = st.lastAt == null ? -1 : st.lastAt;
    // the reel to work on: the next one up that isn't a good stop yet (or whose hold runs low), one ahead at most
    let target = null;
    if (ph.stage === 'live') {
      for (let k = prog + 1; k < n && k <= prog + 2; k++) {
        const r = stairReel(ph, k), good = R.plat(r);
        const over = rn.alive && cpuCx(rn) >= r.x0 - 6 && cpuCx(rn) <= r.x1 + 6;
        if (!good || (r.state === 'stop' && r.holdLeft < 2.5 && !over)) { target = r; break; }
      }
    }
    if (!target) target = stairReel(ph, Math.min(n - 1, prog + 1)) || ph.reels[0];
    const cx = (target.x0 + target.x1) / 2;
    const here = steerTo(out, p, cx, 12);
    if (ph.stage !== 'live' || R.zone(p.id) !== target.i || !here) { st.press = null; st.blk = ph.stage !== 'live'; return out; }
    out.left = out.right = false;
    const good = R.plat(target);
    if (good) {
      st.press = null; st.blk = true;                // nothing to stop: waiting for the runner
      if (target.state === 'stop' && target.holdLeft < 2.5) out.act = 'tap';   // keep it held
      // a person runner who waits on the step below: say so
      const nextOk = prog >= -1 && stairReel(ph, prog + 1) && R.plat(stairReel(ph, prog + 1));
      st.hopWait = nextOk && !info.partnerCpu && rn.alive && rn.grounded && Math.abs(rn.vx) < 5 ? (st.hopWait || 0) + DT : 0;
      if (st.hopWait > 3) say(st, p, 'hop', 'Hop on!', 10);
      return out;
    }
    if (target.state === 'stop') { out.act = 'tap'; return out; }      // a sour stop: spin it again right away
    if (target.state !== 'spin' || target.ramp < 1) { st.press = null; return out; }
    // time the press: the press-now picture is round(pos - grace * dir); aim for the middle of a good one
    const G2 = R.GC2, rate = target.dir * target.speed * ph.slow;
    if (ph.magnet) { out.act = 'tap'; return out; }
    if (!st.press || st.press.r !== target || G.time > st.press.t + 0.3) {
      const u = target.pos - G2.grace * target.dir;
      let best = Infinity;
      for (let j = 1; j <= target.n + 1; j++) {
        const k = target.dir > 0 ? Math.ceil(u) + j - 1 : Math.floor(u) - j + 1;
        if (!R.good(target, R.sym(target, k))) continue;
        const t = (k - u) / rate;
        if (t > 0.12 && t < best) best = t;
      }
      if (best === Infinity) return out;
      const E = 0.08 + 0.26 * (1 - info.skill);    // timing error: hard 0.08 s, easy about 0.25 s
      st.press = { r: target, t: G.time + best + (Math.random() * 2 - 1) * E };
    }
    if (G.time >= st.press.t) { out.act = 'tap'; st.press = null; }
    return out;
  }

  /* ===== Phase 3: Hot Floor Climb ===== */
  // where to wait beside a group of steps (not under them, so I can hop on), on the floor below them
  function besideSteps(p, gr) {
    const cs = gr.cells.filter(c => !c.extra), c0 = Math.min(...cs.map(c => c.c)), c1 = Math.max(...cs.map(c => c.c)), r = cs[0].r;
    const feet = (r + 2) * T, cx = cpuCx(p);
    const left = (c0 - 1) * T + T / 2, right = (c1 + 1) * T + T / 2;
    const okL = c0 - 1 > 0 && tile(c0 - 1, r + 2) !== '.', okR = c1 + 1 < 25 && tile(c1 + 1, r + 2) !== '.';
    const x = okL && okR ? (Math.abs(cx - left) <= Math.abs(cx - right) ? left : right) : okL ? left : right;
    return { x, feet };
  }
  function lava(st, p, o, info, S) {
    const ph = S.ph, out = {}, L3 = GC_PHASES.lava.test;
    st.blk = true;
    if (!p.alive || ph.hot[p.id] || ph.stage !== 'leg') return out;
    const jobs = L3.jobs(), job = jobs && jobs[p.id];
    if (!job) return out;
    let goal = null, act = false, stay = false;
    const tg = job.target;
    switch (job.what) {
      case 'press': case 'hold':
        goal = { x: tg.c * T + T / 2, feet: (tg.r + 1) * T, tol: 5 };
        stay = job.what === 'hold' || !tg.latched;
        break;
      case 'turn':
        goal = { x: tg.x, feet: tg.feet, tol: 6 };
        if (gc3AtValveP(p, tg)) act = true;
        break;
      case 'cross': { const far = L3.farSide(tg); goal = { x: far.x, feet: ph.floors[tg.floor], tol: 10 }; break; }
      case 'bridge': { const far = L3.farSide(tg); goal = { x: far.dir > 0 ? tg.x0 - 40 : tg.x1 + 40, feet: ph.floors[tg.floor], tol: 10 }; break; }
      case 'steps': goal = Object.assign(besideSteps(p, tg), { tol: 10 }); break;
      case 'climb': {
        const cs = tg.cells.filter(c => !c.extra), mx = cs.reduce((s, c) => s + c.c, 0) / cs.length * T + T / 2;
        goal = { x: mx, feet: (cs[0].r - 2) * T, tol: 10 };
        break;
      }
      case 'wait': {
        // after my press: get ready for what comes next (my own steps above, or my valve after a bridge)
        const leg = GC3_LEGS[ph.leg], bs = ph.legBtns[ph.leg];
        if (leg === 'climb' && bs[1] && ph.ckpt[p.id] < bs[1].floor) goal = Object.assign(besideSteps(p, bs[1].gr), { tol: 10 });
        else if (leg === 'bridge') { const v = ph.valves[ph.leg < 3 ? 0 : 1][p.id]; goal = { x: v.x, feet: v.feet, tol: 8 }; }
        break;
      }
    }
    // a person who stands about on their job: a nudge
    const oj = jobs[o.id];
    st.pWait = oj && !info.partnerCpu && ['press', 'hold', 'turn', 'climb', 'cross'].includes(oj.what) && !(oj.what === 'turn' && oj.target.turn) && !(oj.what === 'hold' && oj.target.down) && info.partnerIdle > 4 ? (st.pWait || 0) + DT : 0;
    if (st.pWait > 1) say(st, p, 'p' + oj.what, { press: 'Your button!', hold: 'Stand on it!', turn: 'Turn with me!', climb: 'Climb up!', cross: 'Come across!' }[oj.what], 12);
    if (!goal) return out;
    blockedBy(st, p, o, goal.x);
    if (hopOn(st, out, p, goal.x)) return out;
    // the partner stands on my spot (my button, my valve): wait beside it and ask, no hopping about
    const taken = o.alive && o.grounded && Math.abs(cpuCx(o) - goal.x) < p.w && Math.abs(cpuFeet(o) - goal.feet) < 2;
    if (taken && p.grounded && Math.abs(cpuFeet(p) - goal.feet) < 2 && Math.abs(cpuCx(p) - goal.x) < 70 && ['press', 'hold', 'turn'].includes(job.what)) {
      st.blk = true;
      if (cpuFor(st, 'taken', true, DT) > 1.5 && !info.partnerCpu) say(st, p, 'scoot', 'Scoot over!', 10);
      return out;
    }
    cpuFor(st, 'taken', false, DT);
    // waiting for the partner: a waiting job, or on my spot (a climb or walk under way is my own work)
    const atGoal = Math.abs(cpuCx(p) - goal.x) <= goal.tol && Math.abs(cpuFeet(p) - goal.feet) < 2;
    st.blk = ['steps', 'bridge', 'wait'].includes(job.what) || atGoal;
    // dodge pots and pans (not while on a job spot)
    const th = !busyNow(S, p) && threat(st, S, p, info);
    if (th && p.grounded) {
      const f = L3.floorOf(p.id);
      const ex = f >= 0 ? escapeX(p, th, 45, 24 * T + 10) : null;
      if (ex != null && Math.abs(ex - cpuCx(p)) < 90 && !nearGap(ph, ex, f)) { steerTo(out, p, ex, 3); return out; }
    }
    // on my spot: just stand there (no cpuNav, whose map is rebuilt every time a step builds, and steps build while
    // I wait)
    if (atGoal && p.grounded) {
      if (act) out.act = true;
      return out;
    }
    // never below my checkpoint floor or near the lava (the key changes only when that line crosses a row)
    const lim = Math.min(ph.floors[ph.ckpt[p.id]] + 1, ph.lavaY - 8);
    const avoid = (tx, ty) => (ty + 1) * T > lim;
    const nav = cpuNav(st, p, goal.x, goal.feet, { tol: goal.tol, avoid, key: 'v' + Math.floor(lim / T) });
    Object.assign(out, nav);
    if (st.nav && st.nav.status === 'arrived') { out.left = out.right = false; out.jump = false; }
    if ((stay || act) && atGoal) { out.left = out.right = false; out.jump = false; out.down = false; }
    if (act) out.act = true;
    hopPartner(st, out, p, o);
    return out;
  }
  const gc3AtValveP = (p, v) => p.alive && p.grounded && Math.abs(cpuCx(p) - v.x) <= 22 && Math.abs(cpuFeet(p) - v.feet) < 1.5;
  const nearGap = (ph, x, f) => ph.groups.some(gr => gr.bridge && gr.floor === f && gr.state !== 'on' && x > gr.x0 - 20 && x < gr.x1 + 20);

  /* ===== Phase 4: Grand Finale ===== */
  const F4 = () => GC_PHASES.finale.test;
  // the ball a little ahead, as a simple throw (no bounces): is it in my swing's reach within `ahead` s?
  function reachSoon(ph, p, b, ahead) {
    const g = ph.mitts >= 2 ? F4().GC4.gSlow : F4().GC4.g;
    for (let t = 0; t <= ahead + 1e-6; t += 0.02) {
      const q = { x: b.x + b.vx * t, y: b.y + b.vy * t + 0.5 * g * t * t, r: b.r };
      if (F4().reach(p.id, q)) return true;
    }
    return false;
  }
  const canSwing = (ph, p) => ph.lock[p.id] <= 0 && ph.sw[p.id] <= 0 && p.stun <= 0;
  function finale(st, p, o, info, S) {
    const ph = S.ph, out = {}, C4 = F4().GC4, maxX = ph.netX - C4.netHalf - p.w / 2 - 2;
    if (!p.alive) return out;
    if (ph.stage === 'pull') return pull(st, p, o, info, S);
    if (ph.stage !== 'rally' && ph.stage !== 'swap') { st.blk = true; return out; }
    const b = ph.ball, setter = p.id === ph.setter;
    st.blk = !(b && (setter ? b.state === 'free' : b.state === 'set'));   // (else: waiting for the partner's touch)
    const th = threat(st, S, p, info);
    if (th && gc4NextP(ph) !== p.id) { const ex = escapeX(p, th, 20, maxX); if (ex != null) { steerTo(out, p, ex, 3); return out; } }
    if (setter) {
      if (b && b.state === 'free' && !b.roll) {
        const pr = F4().predict(C4.floor - PH - 14);
        const x = pr ? clamp(pr.x, 20, maxX) : b.x;
        steerTo(out, p, x, 6);
        if (canSwing(ph, p) && b.cd[p.id] <= 0 && reachSoon(ph, p, b, 0.1)) out.act = 'tap';
        st.setWait = 0;
        return out;
      }
      if (b && b.state === 'set') {   // out from under the gold ball (a head bounce would spoil the set)
        const pr = F4().predict(C4.floor - PH - 4), lx = pr ? pr.x : b.x;
        if (Math.abs(lx - cpuCx(p)) < 50) steerTo(out, p, clamp(lx + (lx > 300 ? -80 : 80), 20, maxX), 6);
        return out;
      }
      steerTo(out, p, clamp(cpuCx(o) > 300 ? 170 : 250, 20, maxX), 10);
      return out;
    }
    // the spiker
    if (b && b.state === 'set') {
      const spike = st.spike != null ? st.spike : (st.spike = Math.random() < (info.skill >= 1 ? 0.85 : info.skill >= 0.7 ? 0.55 : 0));
      const hy = spike ? C4.floor - PH - PHYS.jumpV * PHYS.jumpV / (2 * PHYS.g) - 6 : C4.floor - PH - 14;
      const pr = F4().predict(hy), lowPr = F4().predict(C4.floor - PH - 14);
      const x = clamp((pr || lowPr || b).x, 20, maxX);
      if (p.grounded) {
        steerTo(out, p, x, 4);
        if (spike && pr && !st.jumped && Math.abs(x - cpuCx(p)) < 14 && pr.t <= 0.34 && pr.t >= 0.2 && b.vy > 0) { out.jump = 'tap'; st.jumped = true; }
      } else out.jump = p.vy < 0;
      if (canSwing(ph, p) && b.cd[p.id] <= 0 && reachSoon(ph, p, b, 0.08)) out.act = 'tap';
      return out;
    }
    st.spike = null; st.jumped = false;
    // waiting: keep apart from the setter and from where his ball comes down
    const sx = cpuCx(o), pr = b && b.state === 'free' ? F4().predict(C4.floor - PH - 14) : null;
    const base = pr ? pr.x : sx;
    let home = base + 150 <= maxX - 10 ? base + 150 : base - 150;
    home = clamp(home, 40, maxX - 10);
    steerTo(out, p, home, 12);
    return out;
  }
  const gc4NextP = ph => (!ph.ball || ph.ball.state === 'shot' ? -1 : ph.ball.state === 'set' ? 1 - ph.setter : ph.setter);
  function pull(st, p, o, info, S) {
    const ph = S.ph, out = {}, C4 = F4().GC4;
    const mine = ph.hold[p.id];
    st.blk = mine >= 0;   // on the cord: the rest is the partner's
    if (mine >= 0) {
      // pull: hold ◀ (away from him) and mash the action like a person (easy a bit slower)
      out.left = true;
      st.mashT = (st.mashT || 0) - DT;
      if (st.mashT <= 0) { st.mashT = 0.13 + 0.08 * (1 - info.skill) + Math.random() * 0.03; out.act = 'tap'; }
      if (ph.hold[o.id] < 0 && !info.partnerCpu) say(st, p, 'grab', 'Grab the cord!', 12);
      return out;
    }
    // pick a knot: the other one if the partner holds one; else the right-hand one (nearer him) for whoever stands
    // further right, so nobody has to pass the other (Bo takes it on a tie)
    const kx = i => F4().knotX(i);
    let want;
    if (ph.hold[o.id] >= 0) want = 1 - ph.hold[o.id];
    else { const d = cpuCx(p) - cpuCx(o); want = Math.abs(d) > 2 ? (d > 0 ? 0 : 1) : p.id === 1 ? 0 : 1; }
    blockedBy(st, p, o, kx(want));
    if (hopOn(st, out, p, kx(want))) return out;
    const there = steerTo(out, p, kx(want), 8);
    if (Math.abs(cpuCx(p) - kx(want)) < C4.grabR - 10 && p.grounded) { out.left = out.right = false; out.act = 'tap'; }
    else if (there) out.act = 'tap';
    hopPartner(st, out, p, o);
    return out;
  }

  /* ===== the brain ===== */
  // the job the level gives my character in this phase
  function play(st, p, o, info, S) {
    const ph = S.ph;
    switch (S.phase) {
      case 'cannons':
        if (!ph.cn || (ph.lock && ph.lock[p.id])) return {};   // after a swap: let go of every key first
        return p.id === ph.gunner ? gunner(st, p, o, info, S) : loader(st, p, o, info, S);
      case 'reels':
        if (!ph.reels) return {};
        return p.id === ph.stopper ? stopper(st, p, o, info, S) : runner(st, p, o, info, S);
      case 'lava': return ph.floors ? lava(st, p, o, info, S) : {};
      case 'finale': return finale(st, p, o, info, S);
    }
    return {};
  }
  // my speech bubble goes above the level's own badge and hint over my head (they stack up from the head)
  function bubblePos(p) {
    const S = G.mst, at = { x: cpuCx(p), y: p.y };
    if (!S || !S.boss || !S.ph || G.introT > 0) return at;
    const big = typeof hudBig === 'function' && hudBig();
    let top = p.y - 8 - gcHeadLift(S, p);
    const roles = S.badgeT > 0 && GC_PHASES[S.phase] && GC_PHASES[S.phase].roles ? GC_PHASES[S.phase].roles(S) : null;
    if (roles && roles[p.id]) top -= (big ? 30 : 20) + 4;
    const h = S.hints && S.hints[p.id];
    if (h && h.t < h.life) top -= (big ? 37 : 22) + 10;
    at.y = Math.min(p.y, top + 18);
    return at;
  }
  cpuBrain('collector', {
    bubblePos,
    think(st, p, o, dt, info) {
      const S = info.mst;
      if (!S || !S.boss || !S.ph || info.intro || S.cut) return {};
      // the person walked away: when it is only waiting on them (st.blk), stop too, so he waits ("Hello? Anyone
      // there?") like he does for two people. Its own work (a climb while they hold a plate, a bump for a spiker who
      // waits) still goes on, up to 15 s.
      const away = !info.partnerCpu && info.partnerIdle > IDLE;
      quiet = away; st.blk = false;
      const out = play(st, p, o, info, S);
      return away && (st.blk || info.partnerIdle > 1.5 * IDLE) ? {} : out;
    },
  });
})();
