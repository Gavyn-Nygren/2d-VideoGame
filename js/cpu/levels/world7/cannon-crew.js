/* Pip & Bo - Computer partner: cannon crew. */
'use strict';

(() => {
  /* Each castle names its gunner and loader (st.gunner / st.loader), so the computer does the job it has.
     Loader: keeps the cannon stocked with about two shots. It picks up a keg and a ball (the ball the castle needs:
     boom balls for the crown or stone if there are any, big balls for stone, else the nearest), walks them to the hopper
     with cpuNav (never past the fence), picks up anything a water balloon knocked out of its hands, steps away from a
     balloon's shadow, and shouts FIRE if the gunner sits on a loaded cannon for a long time.
     Gunner: when the castle has stopped moving it plans a shot the way a person reads the castle: for every standing flag
     it aims at the block under the flag and the blocks holding that one up. Each aim is tried on a copy of the castle's
     physics, first only the flight (does the ball hit that block first?), then the whole shot for the best few (how many
     flags fall). The plan is spread over many steps so it stays cheap. It turns the dials to the chosen aim, off by a
     little (more on easy), and fires once loaded. If the cannon stays empty and the loader is idle (or busy but not
     bringing what is missing for a long while), it presses fire for the HURRY call that points at the piles. */
  const TST = () => MODES.cannon.test;

  /* ---------- gunner: planning ---------- */
  // the blocks under a flag: the base and up to 3 below it (the ones under the pole)
  function chain(W, f) {
    const out = [];
    let b = W.blocks[f.base];
    for (let k = 0; k < 4 && b && !b.dead; k++) {
      out.push(b);
      const by = b.y + b.h;
      let next = null;
      for (const o of W.blocks) if (!o.dead && o !== b && Math.abs(o.y - by) < 1 && o.x < f.x && o.x + o.w > f.x) { next = o; break; }
      b = next;
    }
    return out;
  }
  // aims (angle, power) whose parabola passes through point (X, Y), for a spread of angles
  function aimsAt(cn, X, Y, out, tag) {
    const P = TST().CN, g = P.gBall;
    for (let a = 6; a <= 76; a += 3) {
      const r = a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
      const x0 = cn.x + c * P.barrel, y0 = cn.y - s * P.barrel, dx = X - x0, dy = Y - y0;
      if (dx <= 0) continue;
      const den = 2 * c * c * (dy + dx * s / c);
      if (den <= 0) continue;
      const v = Math.sqrt(g * dx * dx / den), pow = (v - P.vMin) / (P.vMax - P.vMin);
      if (pow < 0 || pow > 1) continue;
      out.push({ ang: a, pow, tag });
    }
  }
  // the ball's flight, stepped exactly like the game does, until it first touches something: the block's id, or null
  // (the ground, the moat, off the screen). No copy of the world, so it is cheap.
  function flight(W, cn, ang, pow, type) {
    const P = TST().CN, a = ang * Math.PI / 180, v = P.vMin + (P.vMax - P.vMin) * pow, r = P.ball[type].r, bs = W.blocks;
    // the box round every standing block: no block test while the ball is outside it
    let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
    for (const b of bs) if (!b.dead) { bx0 = Math.min(bx0, b.x); bx1 = Math.max(bx1, b.x + b.w); by0 = Math.min(by0, b.y); by1 = Math.max(by1, b.y + b.h); }
    bx0 -= r; bx1 += r; by0 -= r; by1 += r;
    let x = cn.x + Math.cos(a) * P.barrel, y = cn.y - Math.sin(a) * P.barrel, vx = Math.cos(a) * v, vy = -Math.sin(a) * v;
    for (let k = 0; k < 300; k++) {
      vy += P.gBall * DT;
      const n = Math.max(1, Math.ceil(Math.hypot(vx, vy) * DT / 4));
      for (let s = 0; s < n; s++) {
        x += vx * DT / n; y += vy * DT / n;
        if (x > 1000 || x < -40 || y > 580) return null;
        const tx1 = Math.floor((x - r) / T), tx2 = Math.floor((x + r) / T), ty1 = Math.floor((y - r) / T), ty2 = Math.floor((y + r) / T);
        for (let ty = ty1; ty <= ty2; ty++) for (let tx = tx1; tx <= tx2; tx++) {
          if (W.water(tx, ty) && y > ty * T + 6) return null;
          if (!W.solid(tx, ty)) continue;
          const qx = Math.max(tx * T, Math.min(x, tx * T + T)), qy = Math.max(ty * T, Math.min(y, ty * T + T));
          if (Math.hypot(x - qx, y - qy) < r) return null;
        }
        if (x < bx0 || x > bx1 || y < by0 || y > by1) continue;
        for (const b of bs) {
          if (b.dead) continue;
          const qx = Math.max(b.x, Math.min(x, b.x + b.w)), qy = Math.max(b.y, Math.min(y, b.y + b.h));
          if (Math.hypot(x - qx, y - qy) < r) return b.id;
        }
      }
    }
    return null;
  }
  // a whole shot on a copy of the world, a slice at a time: returns null while it still runs, then the result.
  // Budget: about (awake blocks + 1) x blocks per physics step, so a big collapse is spread over more steps.
  function shotStart(W0, cn, c, type) {
    const t = TST(), W = t.cnClone(W0);
    W.rand = () => 0.5;
    const ball = t.cnFire(W, cn.x, cn.y, c.ang, c.pow, type);
    return { c, W, ball, f0: t.cnFlagsLeft(W), b0: W.stats.broken, k: 0, cat: W.blocks.find(b => b.shape === 'cat') };
  }
  function shotRun(sh, budget) {
    const t = TST(), W = sh.W, n = Math.round(3.5 / DT);
    while (budget > 0 && sh.k < n) {
      t.cnStep(W, DT); W.events.length = 0; sh.k++;
      budget -= (W._aw.length + 1) * W.blocks.length;
      if (sh.k > 30 && !W.balls.length && t.cnSettled(W)) { sh.k = n; break; }
      if (!t.cnFlagsLeft(W)) { sh.k = n; break; }
    }
    if (sh.k < n) return null;
    const cat = sh.cat, catDown = !!cat && (cat.dead || Math.abs(cat.x - cat.sx) > t.CN.flagMove || Math.abs(cat.y - cat.sy) > t.CN.flagMove);
    return { flags: sh.f0 - t.cnFlagsLeft(W), broken: W.stats.broken - sh.b0, touched: sh.ball.touched, catDown };
  }
  // start a plan for this ball type (the work is done a little at a time in planStep)
  function planStart(S, st, type) {
    const W = st.W, cn = st.cannon, cands = [];
    W.flags.forEach((f, fi) => {
      if (f.down) return;
      chain(W, f).forEach((b, k) => {
        const tag = { fi, id: b.id, k };
        aimsAt(cn, b.x - 1, b.y + Math.min(b.h / 2, 14), cands, tag);
        aimsAt(cn, b.x + Math.min(8, b.w / 2), b.y + 2, cands, tag);
        if (type === 'boom') aimsAt(cn, f.x, b.y - 10, cands, tag);
      });
    });
    const cat = st.cat && !st.catDown && !st.cat.dead ? st.cat : null;
    if (cat) aimsAt(cn, cat.x - 1, cat.y + cat.h / 2, cands, { fi: -1, id: cat.id, k: 0 });
    S.plan = { type, key: planKey(st, type), cands, i: 0, good: [], full: null, j: 0, best: null };
  }
  const planKey = (st, type) => type + '|' + st.shots + '|' + st.W.blocks.filter(b => b.dead).length + '|' + st.k;
  // spend a small budget each step: flight tests first, then whole shots for the best few
  function planStep(S, st) {
    const pl = S.plan, cn = st.cannon, W = st.W;
    if (pl.best) return;
    for (let n = 0; n < 10 && pl.i < pl.cands.length; n++) {
      const c = pl.cands[pl.i++], first = flight(W, cn, c.ang, c.pow, pl.type);
      if (first === null) continue;
      const fl = c.tag.fi >= 0 ? W.flags[c.tag.fi] : null, ids = fl ? chain(W, fl).map(b => b.id) : [c.tag.id];
      if (ids.includes(first)) pl.good.push(c); else (pl.any || (pl.any = [])).push(c);
    }
    if (pl.i < pl.cands.length) return;
    if (!pl.full) {
      // a low arc and a high arc for every target block (flags in turn, the block under the flag first), at most 12
      const by = new Map();
      for (const c of pl.good) { const k = c.tag.fi + ':' + c.tag.id; if (!by.has(k)) by.set(k, []); by.get(k).push(c); }
      const groups = [...by.values()].sort((a, b) => a[0].tag.k - b[0].tag.k), pick = [];
      for (const list of groups) { pick.push(list[0]); if (list.length > 2) pick.push(list[list.length - 1]); }
      if (!pick.length && pl.any) pick.push(...pl.any.slice(0, 4));
      pl.full = pick.slice(0, 12); pl.res = [];
    }
    let budget = 4000; // about 1 ms
    while (budget > 0 && (pl.sh || pl.j < pl.full.length)) {
      if (!pl.sh) pl.sh = shotStart(W, cn, pl.full[pl.j++], pl.type);
      const r = shotRun(pl.sh, budget);
      budget = 0;
      if (!r) break;
      pl.res.push({ c: pl.sh.c, score: r.flags * 100 + (r.catDown ? 45 : 0) + r.broken * 2 + (r.touched ? 3 : 0) - pl.sh.c.ang * 0.02 });
      pl.sh = null;
    }
    if (pl.sh || pl.j < pl.full.length) return;
    pl.res.sort((a, b) => b.score - a.score);
    pl.best = pl.res.length ? pl.res[0].c : { ang: 35, pow: 0.75 };
  }

  /* ---------- gunner ---------- */
  function gunner(S, st, p, o, dt, info, out) {
    const cn = st.cannon, W = st.W, play = st.phase === 'play';
    if (!play) return;
    const loaded = cn.powder > 0 && cn.balls.length > 0;
    const type = cn.balls[0] || st.carry.ball || loaderType(st);
    const settled = !W.balls.length && TST().cnSettled(W);
    // a fresh plan once the castle is still (and again if the ball type changes)
    if (settled && (!S.plan || S.plan.key !== planKey(st, type))) { planStart(S, st, type); S.aim = null; S.readyT = 0; }
    if (S.plan && !S.plan.best) planStep(S, st);
    if (S.plan && S.plan.best && !S.aim) {
      // a person is never spot on: a little off, more on easy
      const sk = info.skill, e = 1 - sk;
      const nz = () => (Math.random() + Math.random() - 1);
      S.aim = { ang: clamp(S.plan.best.ang + nz() * (0.4 + 4.5 * e), 5, 80), pow: clamp(S.plan.best.pow + nz() * (0.004 + 0.035 * e), 0, 1) };
    }
    // turn the dials (let go now and then so they slow down near the mark)
    let aimed = false;
    if (S.aim) {
      const da = S.aim.ang - cn.ang, dp = S.aim.pow - cn.pow;
      if (Math.abs(da) > 0.3) { const slow = Math.abs(da) < 5 && cn.holdA > 0.4; out.up = !slow && da > 0; out.down = !slow && da < 0; }
      if (Math.abs(dp) > 0.004) { const slow = Math.abs(dp) < 0.06 && cn.holdP > 0.4; out.right = !slow && dp > 0; out.left = !slow && dp < 0; }
      aimed = Math.abs(da) <= 0.3 && Math.abs(dp) <= 0.004;
    }
    // fire once loaded, aimed and the castle is still (after a short human pause)
    S.readyT = loaded && aimed && settled && cn.cool <= 0 && S.plan && S.plan.key === planKey(st, type) ? (S.readyT || 0) + dt : 0;
    if (S.readyT > 0.15 + 0.45 * (1 - info.skill)) { out.act = 'tap'; S.readyT = 0; }
    // an empty cannon and a loader who isn't fetching (standing still, or busy but not bringing what is missing for a
    // long while): the HURRY call (its arrows point at the piles) and a word on what is missing
    const noP = cn.powder === 0 && !st.carry.powder, noB = cn.balls.length === 0 && !st.carry.ball;
    S.emptyT = play && !loaded && (noP || noB) ? (S.emptyT || 0) + dt : 0;
    S.callT = (S.callT || 0) - dt;
    if (loaded) S.callN = 0;
    if (!loaded && (noP || noB) && cn.cool <= 0 && S.callT <= 0 && ((st.ldIdle > 6 && info.partnerIdle > 3) || S.emptyT > 14)) {
      S.callN = (S.callN || 0) + 1; S.callT = Math.min(6 + 3 * S.callN, 20); out.act = 'tap'; // (calls further apart while nothing comes)
      cpuSay(p, noP && noB ? 'Powder and a ball!' : noP ? 'Need powder!' : 'Need a ball!', 2.2);
    }
  }

  /* ---------- loader ---------- */
  // the ball this castle wants: boom for the crown or stone, big for stone, else the nearest kind there is
  function loaderType(st) {
    const W = st.W, has = k => st.piles.some(p => p.kind === k);
    let stone = false, crown = false;
    for (const f of W.flags) {
      if (f.down) continue;
      if (f.crown) crown = true;
      for (const b of chain(W, f)) if (b.mat === 'stone') stone = true;
    }
    if ((crown || stone) && has('boom')) return 'boom';
    if (stone && has('big')) return 'big';
    return has('iron') ? 'iron' : has('big') ? 'big' : 'boom';
  }
  function loader(S, st, p, o, dt, info, out) {
    const cn = st.cannon, play = st.phase === 'play';
    if (!play || !p.alive) return;
    const want = 2, needP = cn.powder < want && !st.carry.powder, needB = cn.balls.length < want && !st.carry.ball;
    const fenceTx = cn.tx + 2, opts = { avoid: tx => tx >= fenceTx, key: 'cannon' + st.k, noHop: true }; // (the loader walks through the seated gunner)
    const type = loaderType(st), pc = cpuCx(p), pf = cpuFeet(p);
    // a balloon about to land near us: step away from its shadow (not always on easy)
    for (const b of st.balloons) {
      const left = b.tt - b.t;
      if (left > 0.9 || left < 0) continue;
      if (S.dodgeFor !== b) { S.dodgeFor = b; S.dodge = Math.random() < 0.35 + 0.6 * info.skill; }
      if (S.dodge && Math.abs(pc - b.tx) < 60 && Math.abs(pf - b.ty) < 50) {
        const away = pc >= b.tx ? 1 : -1, x = clamp(b.tx + away * 90, T * 1.5, cn.tx * T + 30);
        return Object.assign(out, cpuNav(S, p, x, pf, opts) || {});
      }
    }
    let goal = null;
    if (needP || needB) {
      // something knocked out of our hands lies on the floor: pick it up first
      const items = st.items.filter(it => !it.dead && it.age > 0.3 && ((it.kind === 'powder' && needP) || (it.kind !== 'powder' && needB && !st.carry.ball)));
      items.sort((a, b) => Math.abs(a.x - pc) - Math.abs(b.x - pc));
      if (items.length) goal = { x: items[0].x, f: items[0].y + CANNON.itemR };
      else {
        // the pile we still need that is nearest (balls of the chosen kind)
        let best = null, bd = Infinity;
        for (const pile of st.piles) {
          const ok = pile.kind === 'powder' ? needP : needB && pile.kind === type;
          if (!ok) continue;
          const x = (pile.tx0 + pile.tx1 + 1) * T / 2, f = (pile.ty + 1) * T, d = Math.abs(x - pc) + 2 * Math.abs(f - pf);
          if (d < bd) { bd = d; best = { x, f }; }
        }
        goal = best;
      }
    }
    if (!goal && (st.carry.powder || st.carry.ball) && (cn.powder < want || cn.balls.length < want || !(cn.powder > 0 && cn.balls.length > 0))) {
      goal = { x: cn.tx * T + 12, f: (cn.ty + 1) * T }; // the hopper
    }
    if (!goal && !st.carry.powder && !st.carry.ball) {
      // stocked: fetch the next load now and wait with it
      let best = null, bd = Infinity;
      for (const pile of st.piles) {
        if (pile.kind !== 'powder') continue;
        const x = (pile.tx0 + pile.tx1 + 1) * T / 2, f = (pile.ty + 1) * T, d = Math.abs(x - pc) + 2 * Math.abs(f - pf);
        if (d < bd) { bd = d; best = { x, f }; }
      }
      goal = best;
    } else if (!goal && st.carry.powder && !st.carry.ball) {
      for (const pile of st.piles) if (pile.kind === type) { goal = { x: (pile.tx0 + pile.tx1 + 1) * T / 2, f: (pile.ty + 1) * T }; break; }
    }
    if (goal) Object.assign(out, cpuNav(S, p, goal.x, goal.f, opts) || {});
    // a gunner sitting on a loaded cannon for a long time (the castle still, hands off the dials): shout FIRE now and then
    S.shoutT = (S.shoutT || 0) - dt;
    if (cn.powder > 0 && cn.balls.length > 0 && cn.idleT > 8 && info.partnerIdle > 6 && S.shoutT <= 0 && TST().cnSettled(st.W)) { S.shoutT = 9; out.act = 'tap'; }
  }

  /* A person who walked away: the core's plain 30 s idle stop would also stop a computer gunner while the person loader
     has stocked the cannon and watches. Instead it stops (until the person presses again) only when the person has
     been idle that long AND the cannon waits on them: empty for a loader, loaded with the castle still for a gunner. */
  const AWAY = [null, null]; // per computer player: the level state it stopped in for a person who walked away
  function partnerNeeded(st, o) {
    const cn = st.cannon, loaded = cn.powder > 0 && cn.balls.length > 0;
    return o.id === st.loader ? !loaded : loaded && !st.W.balls.length && TST().cnSettled(st.W);
  }

  cpuBrain('cannon', {
    noIdleStop: true, // (its own rule above)
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.W || !st.cannon) return out;
      // (kept in AWAY, not S, so a new room does not wake it: the level's mode state lives across rooms)
      if (info.partnerIdle < 0.5) AWAY[p.id] = null;
      else if (info.partnerIdle > CPU.idleStop && st.phase === 'play' && partnerNeeded(st, o)) AWAY[p.id] = st;
      if (AWAY[p.id] === st) return out;
      if (st.lock[p.id]) return out; // each castle start: let go of everything once
      if (p.id === st.gunner) gunner(S, st, p, o, dt, info, out); else loader(S, st, p, o, dt, info, out);
      return out;
    },
  });
})();
