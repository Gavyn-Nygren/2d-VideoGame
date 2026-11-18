/* Pip & Bo - Computer partner: 41-3 Paper Dragon Flight (mode 'popdragon').

   One plan for the dragon, shared by both seats: every 0.12 s it tries a grid of spots in the flying window, flies each
   one forward for a couple of seconds the way the dragon really moves (eased, at the seat speeds), and scores it:
   a Crumple (sooner is worse) costs most, stars passed on the way earn, and it likes the middle and its last choice.
   If every spot hits something soon but a tucked dragon would get through, both riders hold jump (the tuck).
   Each seat then does only its own job, like a person would: Pip pushes left/right toward the plan's x and breathes
   fire when a cobweb is just ahead; Bo pushes up/down toward its y. When the plan needs a big move, the other rider
   pushes the same way too (the swoop), which only helps when the partner is already pushing that way.
   Nothing here clears the level alone: with a person who never steers, the dragon flies straight into the ink bottle. */
'use strict';

const POPDRAGON_CPU = { every: 0.12, horizon: 2.4, dt: 0.15, swoopAt: 2.6, margin: 0.25, pad: 0.2 };   // (margin: plans keep the wings this much clear; pad: every other point of the dragon)

// the plan, worked out once per 0.12 s of game time. own: 'xy' when both seats are the computer (one shared plan), or
// the computer's own axis ('x' for Pip, 'y' for Bo) with the person's axis taken as it is: they keep pushing what they push
function popdragonCpuPlan(st, own, person) {
  const R = POPDRAGON_ROUTE, K = POPDRAGON, C = POPDRAGON_CPU;
  st._cpu = st._cpu || {};
  const P = st._cpu[own] || (st._cpu[own] = { at: -1, tx: 0, ty: 0.4, tuck: false });
  if (st.clock - P.at < C.every && P.at >= 0) return P;
  P.at = st.clock;
  // plan as if every cobweb burns (Pip breathes fire on them; flying into one only tears it)
  const burnt = Object.assign({}, st.burnt);
  for (const w of R.webs || []) burnt[w.burn] = burnt[w.burn] != null ? burnt[w.burn] : 0;
  const slow = 1 - 0.25 * Math.min(3, st.moths || 0);
  let lastHit = 9, hitT = 9;
  const score = (tx, ty, hw, horizon, tuckFor = 0) => {
    let s = st.s, x = st.ox, y = st.oy, vx = st.vx, vy = st.vy, cost = 0, t = 0;
    const taken = new Set();
    lastHit = 9;
    for (; t < horizon; t += C.dt) {
      // eased toward the target at the seat speeds (the wings slowed by any moths on them), pushed by the air
      const wx = own === 'y' ? person * K.VX : clamp((tx - x) / (K.VX * 0.25), -1, 1) * K.VX;
      const wy = (own === 'x' ? person * K.VY : clamp((ty - y) / (K.VY * 0.25), -1, 1) * K.VY) * slow;
      vx += clamp(wx - vx, -K.VX / K.EASE * C.dt, K.VX / K.EASE * C.dt); vy += clamp(wy - vy, -K.VY / K.EASE * C.dt, K.VY / K.EASE * C.dt);
      const dr = R.drift ? R.drift(s) : [0, 0];
      const x0 = x, y0 = y;
      x = clamp(x + (vx + dr[0]) * C.dt, -R.WX, R.WX); y = clamp(y + (vy + dr[1]) * C.dt, -R.WY, R.WY);
      const s0 = s;
      s += R.at(s).v * C.dt;
      // (checked half way through the step too: a step is over a unit sideways and forward, wider than a pencil or the
      // ink bottle's neck)
      const hwNow = (tuckFor > 0 ? (t < tuckFor ? K.HW_TUCK : K.HW) : hw) + C.margin;
      if (st.safe < t && (popdragonHit((s0 + s) / 2, (x0 + x) / 2, (y0 + y) / 2, hwNow, burnt, st.clock + t + C.dt / 2, C.pad) || popdragonHit(s, x, y, hwNow, burnt, st.clock + t + C.dt, C.pad))) { cost += 1000 * (1 + horizon - t); hitT = Math.min(hitT, t); break; }
      // the cat's paws strike a box of the window as the dragon gets there; moths and dust bunnies meet it at a spot
      for (const pw of R.paws) if (pw.s > s0 && pw.s <= s && st.burnt[pw.id] == null && x >= pw.ox[0] - 0.3 && x <= pw.ox[1] + 0.3 && y >= pw.oy[0] - 0.3 && y <= pw.oy[1] + 0.3) cost += 900 * (1 + horizon - t);
      for (const c of R.clingers) if (c.s > s0 && c.s <= s && Math.hypot(x - c.ox, y - c.oy) < R.CLING + 0.3) cost += 160;
      // candles to light: worth flying near
      for (const c of R.lights) if (c.s > s0 && c.s - 3 <= s && st.burnt[c.id] == null && Math.hypot(x - c.ox, y - c.oy) < c.r) cost -= 50;
      for (let i = 0; i < R.stars.length; i++) {
        const sr = R.stars[i];
        if (sr.s > s + 1.2) break;
        if (st.got[i] || taken.has(i) || sr.s < s - 1.2 || (sr.need && st.burnt[sr.need] == null)) continue;
        if (Math.hypot(sr.ox - x, sr.oy - y) < K.STAR_R * 0.85) { taken.add(i); cost -= 40 * (1 - t / (horizon * 2)); }
      }
    }
    lastHit = hitT;
    return cost + Math.abs(tx) * 1.5 + Math.abs(ty - 0.4) * 1.5 + Math.hypot(tx - P.tx, ty - P.ty) * 3;
  };
  // the targets to try on each axis (only the computer's own axis when it shares the dragon with a person)
  const xs = [], ys = [];
  if (own === 'y') xs.push(st.ox); else for (let x = -R.WX; x <= R.WX + 1e-6; x += 1) xs.push(x);
  if (own === 'x') ys.push(st.oy); else for (let y = -R.WY; y <= R.WY + 1e-6; y += 0.7) ys.push(y);
  let best = null;
  for (const tx of xs) for (const ty of ys) {
    hitT = 9;
    const c = score(tx, ty, K.HW, C.horizon);
    if (!best || c < best.c) best = { c, tx, ty, hit: lastHit };
  }
  // nowhere clear with open wings: a tucked dragon may slip through. The tuck lasts at most TUCK_MAX and then the wings
  // open again (and need a rest), so a tuck is only worth starting once the tucked dragon is clear of the slot before
  // they open: it folds as early as that allows (a person a moment late still gets through), or keeps one under way
  const keep = P.tuck && st.tuck > 0.3;
  // (and never lets go while open wings would still catch on the slot: checked in fine steps, as the plan's steps are
  // coarse next to a thin window pane)
  const v0 = R.at(st.s).v || 1;
  if (keep && st.tuckT < K.TUCK_MAX - 0.05 && [0, 0.04, 0.08, 0.12, 0.18, 0.24, 0.3].some(d => popdragonHit(st.s + v0 * d, st.ox, st.oy, K.HW, burnt, st.clock + d))) { P.tx = st.ox; P.ty = st.oy; return P; }
  P.tuck = false;
  if (best.c >= 1000 && st.tuckRest <= 0 && (best.hit < 2.0 || keep)) {
    let bt = null;
    for (const tx of xs) for (const ty of ys) {
      hitT = 9;
      const left = Math.max(0.01, K.TUCK_MAX - st.tuckT), c = score(tx, ty, K.HW_TUCK, Math.max(C.horizon, left + 0.9), left);
      if (!bt || c < bt.c) bt = { c, tx, ty };
    }
    if (bt.c < 1000) { best = bt; P.tuck = true; }
  } else if (best.c >= 1000 && best.hit >= 2.0) {
    // a slot ahead: line up for it now, with the wings tucked in the plan, but don't fold yet
    let bt = null;
    for (const tx of xs) for (const ty of ys) { hitT = 9; const c = score(tx, ty, K.HW_TUCK, C.horizon); if (!bt || c < bt.c) bt = { c, tx, ty }; }
    if (bt.c < best.c) best = bt;
  }
  P.tx = best.tx; P.ty = best.ty; P.c = best.c;
  return P;
}

cpuBrain('popdragon', {
  noIdleStop: false,
  reset(bst) { bst.fireWait = 0.15 + Math.random() * 0.15; },
  think(bst, p, o, dt, info) {
    const st = info.mst, out = {};
    if (!st) return out;
    // the finish: hold the catch as soon as the ring is up, and wait for the partner (never catches alone)
    if (st.phase === 'catch') { if (st.bounce <= 0) { out.act = true; if (!o.input.act && st.catchT > 0.25) cpuSay(p, 'Hold your button!'); } return out; }
    if (st.phase !== 'fly') return out;
    const K = POPDRAGON, R = POPDRAGON_ROUTE;
    // the partner's push on its own axis (Pip's left/right, Bo's up/down), as the dragon reads it
    const oa = popdragonAxes(o), own = info.partnerCpu ? 'xy' : p.id === 0 ? 'x' : 'y';
    const P = popdragonCpuPlan(st, own, p.id === 0 ? oa.y : oa.x);
    // aim a little ahead of where the dragon is drifting, so it eases in instead of overshooting
    const ex = P.tx - (st.ox + st.vx * K.STOP * 0.6), ey = P.ty - (st.oy + st.vy * K.STOP * 0.6);
    const push = (e, full) => (Math.abs(e) < 0.18 ? 0 : clamp(e / (full * 0.22), -1, 1));
    if (p.id === 0) {
      out.ax = push(ex, K.VX);
      if (Math.abs(out.ax) > 0 && Math.abs(out.ax) < 0.25) out.ax = Math.sign(out.ax) * 0.25;
      // helping Bo on a big climb or drop
      if (Math.abs(ey) > POPDRAGON_CPU.swoopAt * 0.7 && Math.sign(oa.y) === Math.sign(ey) && Math.abs(oa.y) > 0.3) { out.ay = -Math.sign(ey); cpuSay(p, ey > 0 ? 'Swoop up!' : 'Swoop down!'); }
      // fire on a cobweb just ahead (after a person's moment to see it)
      const w = (R.webs || []).find(q => st.burnt[q.burn] == null && q.s - st.s > 0.5 && q.s - st.s < K.FIRE_REACH - 0.5 && Math.hypot(st.ox, st.oy - (q.oy || 0)) < q.r + 0.5)
        || (R.lights || []).find(q => st.burnt[q.id] == null && q.s - st.s > 0 && q.s - st.s < K.FIRE_REACH - 0.5 && Math.hypot(st.ox - q.ox, st.oy - q.oy) < q.r + 0.6);
      if (w) { bst.seen = (bst.seen || 0) + dt; if (bst.seen > bst.fireWait && st.fireCd <= 0) out.act = 'tap'; } else bst.seen = 0;
    } else {
      out.ay = -push(ey, K.VY);
      if (Math.abs(out.ay) > 0 && Math.abs(out.ay) < 0.25) out.ay = Math.sign(out.ay) * 0.25;
      // the tail: knock off clinging moths (after a moment to notice), bat a paw just as it strikes (bonus stars), and
      // swish away a moth or dust bunny about to land
      const v = R.at(st.s).v || 1, until = (q) => (q.s - st.s) / v;
      const pn = R.paws.find(q => q.s > st.s), cn = R.clingers.find(q => q.s > st.s);
      bst.mothT = st.moths > 0 ? (bst.mothT || 0) + dt : 0;
      if (st.tailCd <= 0 && st.tail <= 0) {
        if (bst.mothT > 0.35) out.act = 'tap';
        else if (pn && until(pn) > 0.04 && until(pn) < 0.2) out.act = 'tap';
        else if (cn && until(cn) > 0.03 && until(cn) < 0.18 && Math.hypot(st.ox - cn.ox, st.oy - cn.oy) < R.CLING + 0.6) out.act = 'tap';
      }
      // helping Pip on a big swerve
      if (Math.abs(ex) > POPDRAGON_CPU.swoopAt && Math.sign(oa.x) === Math.sign(ex) && Math.abs(oa.x) > 0.3) { out.ax = Math.sign(ex); cpuSay(p, ex > 0 ? 'Swoop right!' : 'Swoop left!'); }
    }
    // 1-player: when only the person's axis can save a Crumple, a short hint for it ("Left!", "Up!")
    if (own !== 'xy' && P.c >= 1000) {
      const J = popdragonCpuPlan(st, 'xy', 0);
      if (J.c < 1000) {
        if (p.id === 1 && Math.abs(J.tx - st.ox) > 1) cpuSay(p, J.tx > st.ox ? 'Right!' : 'Left!');
        if (p.id === 0 && Math.abs(J.ty - st.oy) > 0.8) cpuSay(p, J.ty > st.oy ? 'Up!' : 'Down!');
      }
    }
    if (P.tuck) { out.jump = true; cpuSay(p, 'Tuck!'); }
    return out;
  },
});
