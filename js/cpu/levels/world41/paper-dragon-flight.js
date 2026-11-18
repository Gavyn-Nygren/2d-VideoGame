/* Pip & Bo - Computer partner: 41-3 Paper Dragon Flight (mode 'popdragon').

   One plan for the dragon: every 0.12 s it tries a row of spots in the flying window, flies each one forward for a
   couple of seconds the way the dragon really moves (eased, at the seat speeds), and scores it: a Crumple (sooner is
   worse) costs most, stars passed on the way earn, and it likes the middle and its last choice.
   Each seat then does only its own job, like a person would: Pip pushes left/right toward the plan's x and breathes
   fire when a cobweb is just ahead; Bo pushes up/down toward its y and swishes the tail.

   WITH A PERSON it plans only its own axis, for where the dragon actually is. It never guesses where the person
   means to go: it takes their push (smoothed, so dabs on a key read as a gentle lean) to fade out over the next half
   second, and it keeps its choice until another is clearly better (so a waggling or tapping partner cannot make it
   shake).
   THE TUCK goes by the slots themselves, not by the plan: it holds jump from a good second before a slot's walls until
   the wings are through, wherever the person has steered (tucked together, the slot draws the dragon to its middle, so
   the tuck is right even when the line-up is not). Holding early costs nothing (the three seconds only run while both
   hold) and the half fold and the dragon's head shake tell the person it is their turn. It says "Tuck!".
   THE SWOOP: on its helper axis it pushes only when the person is already pushing that way AND going further that
   way is good for the dragon (a star line or a way round something), so swoops happen when the person starts them.
   At a gold swoop sign it says which way.
   Nothing here clears the level alone: with a person who never steers, the dragon flies straight into things, and the
   catch waits for the person's button. */
'use strict';

const POPDRAGON_CPU = { every: 0.12, horizon: 2.4, dt: 0.15, swoopAt: 2.6, margin: 0.25, pad: 0.2,   // (margin: plans keep the wings this much clear; pad: every other point of the dragon)
  keepBy: 12, dwell: 0.4, fade: 0.5, tuckLead: 1.1, lean: 3.5, leanBy: 10 };

// the slot the pair should be tucked for at rail position s: from `lead` seconds before its walls until past them
function popdragonCpuSlot(s, v, lead) {
  for (const q of POPDRAGON_ROUTE.slots || []) if (s > q.s - 5 - v * lead && s < q.s + 8) return q;
  return null;
}

// fly one choice forward and price it. own: 'xy' (both axes go to tx, ty), or the computer's own axis ('x' Pip, 'y' Bo)
// with the person's axis left to them: their push now (lean, -1..1) fading out over the next half second
function popdragonCpuRoll(st, burnt, tx, ty, own, lean) {
  const R = POPDRAGON_ROUTE, K = POPDRAGON, C = POPDRAGON_CPU;
  const slow = 1 - 0.25 * Math.min(3, st.moths || 0);
  let s = st.s, x = st.ox, y = st.oy, vx = st.vx, vy = st.vy, cost = 0;
  const taken = [];
  for (let t = 0; t < C.horizon; t += C.dt) {
    // eased toward the target at the seat speeds (the wings slowed by any moths on them), pushed by the air
    const fade = Math.max(0, 1 - t / C.fade);
    // (two riders going the same way swoop: a big move with both axes in hand goes half again as fast, as it will)
    const sx = own === 'xy' && Math.abs(tx - x) > C.swoopAt ? K.SWOOP : 1, sy = own === 'xy' && Math.abs(ty - y) > C.swoopAt * 0.7 ? K.SWOOP : 1;
    const wx = own === 'y' ? lean * fade * K.VX : clamp((tx - x) / (K.VX * 0.25), -1, 1) * K.VX * sx;
    const wy = (own === 'x' ? lean * fade * K.VY : clamp((ty - y) / (K.VY * 0.25), -1, 1) * K.VY * sy) * slow;
    const acx = K.VX * K.SWOOP / K.EASE * C.dt, acy = K.VY * K.SWOOP / K.EASE * C.dt;
    vx += clamp(wx - vx, -acx, acx); vy += clamp(wy - vy, -acy, acy);
    const dr = R.drift ? R.drift(s) : [0, 0];
    const x0 = x, y0 = y, s0 = s, v = R.at(s).v;
    x = clamp(x + (vx + dr[0]) * C.dt, -R.WX, R.WX); y = clamp(y + (vy + dr[1]) * C.dt, -R.WY, R.WY);
    s += v * C.dt;
    // at a slot the pair is tucked (think() holds jump there), and the slot draws the tucked dragon to its middle
    const sl = popdragonCpuSlot(s, v, 0.25);
    if (sl && sl.s - s > -3 && sl.s - s < 10) { x = approach(x, sl.ox, K.SLOT_PULL * C.dt); vx = 0; if (sl.oy != null) { y = approach(y, sl.oy, K.SLOT_PULL * C.dt); vy = 0; } }
    // (checked half way through the step too: a step is over a unit sideways and forward, wider than a pencil or the
    // ink bottle's neck)
    const hw = (sl ? K.HW_TUCK : K.HW) + C.margin;
    if (st.safe < t && (popdragonHit((s0 + s) / 2, (x0 + x) / 2, (y0 + y) / 2, hw, burnt, st.clock + t + C.dt / 2, C.pad) || popdragonHit(s, x, y, hw, burnt, st.clock + t + C.dt, C.pad))) { cost += 1000 * (1 + C.horizon - t); break; }
    // the cat's paws strike a box of the window as the dragon gets there; moths and dust bunnies meet it at a spot
    for (const pw of R.paws) if (pw.s > s0 && pw.s <= s && st.burnt[pw.id] == null && x >= pw.ox[0] - 0.3 && x <= pw.ox[1] + 0.3 && y >= pw.oy[0] - 0.3 && y <= pw.oy[1] + 0.3) cost += 900 * (1 + C.horizon - t);
    for (const c of R.clingers) if (c.s > s0 && c.s <= s && Math.hypot(x - c.ox, y - c.oy) < R.CLING + 0.3) cost += 160;
    // candles to light: worth flying near
    for (const c of R.lights) if (c.s > s0 && c.s - 3 <= s && st.burnt[c.id] == null && Math.hypot(x - c.ox, y - c.oy) < c.r) cost -= 50;
    for (let i = 0; i < R.stars.length; i++) {
      const sr = R.stars[i];
      if (sr.s > s + 1.2) break;
      if (st.got[i] || sr.s < s - 1.2 || (sr.need && st.burnt[sr.need] == null) || taken.includes(i)) continue;
      if (Math.hypot(sr.ox - x, sr.oy - y) < K.STAR_R * 0.85) { taken.push(i); cost -= 40 * (1 - t / (C.horizon * 2)); }
    }
  }
  return cost;
}
// plans count every cobweb and tissue as burnt (Pip breathes fire on them; flying into one only tears it)
function popdragonCpuBurnt(st) {
  const burnt = Object.assign({}, st.burnt);
  for (const w of POPDRAGON_ROUTE.webs || []) if (burnt[w.burn] == null) burnt[w.burn] = 0;
  return burnt;
}

// the plan, worked out once per 0.12 s of game time. own: 'xy' when both seats are the computer (one shared plan), or
// the computer's own axis with a person in the other seat (lean: the person's smoothed push on their axis)
function popdragonCpuPlan(st, own, lean) {
  const R = POPDRAGON_ROUTE, C = POPDRAGON_CPU;
  st._cpu = st._cpu || {};
  const P = st._cpu[own] || (st._cpu[own] = { at: -1, tx: 0, ty: 0.4, c: 0 });
  if (st.clock - P.at < C.every && P.at >= 0) return P;
  P.at = st.clock;
  const burnt = popdragonCpuBurnt(st);
  const price = (tx, ty) => popdragonCpuRoll(st, burnt, tx, ty, own, lean) + (own === 'y' ? 0 : Math.abs(tx) * 1.5) + (own === 'x' ? 0 : Math.abs(ty - 0.4) * 1.5);
  // the targets to try on each axis (only the computer's own axis when it shares the dragon with a person)
  const xs = [], ys = [];
  if (own === 'y') xs.push(st.ox); else for (let x = -R.WX; x <= R.WX + 1e-6; x += 1) xs.push(x);
  if (own === 'x') ys.push(st.oy); else for (let y = -R.WY; y <= R.WY + 1e-6; y += 0.7) ys.push(y);
  let best = null;
  for (const tx of xs) for (const ty of ys) {
    const c = price(tx, ty) + (own === 'y' ? 0 : Math.abs(tx - P.tx) * 3) + (own === 'x' ? 0 : Math.abs(ty - P.ty) * 3);
    if (!best || c < best.c) best = { c, tx, ty };
  }
  // keep the last choice unless the new one is clearly better (a steady hand: no dithering between two near-equal lines)
  const keepTx = own === 'y' ? st.ox : P.tx, keepTy = own === 'x' ? st.oy : P.ty, keep = price(keepTx, keepTy);
  // (and for a good third of a second whatever turns up, unless staying means a Crumple: a hand that has just moved
  // does not move straight back)
  // (when every choice is a Crumple it holds on just the same, unless one puts the Crumple off by a good third of a
  // second: least-bad choices come and go with every twitch of the partner)
  const dwell = own !== 'xy' && st.clock - (P.moved || -9) < C.dwell;
  if (keep < 1000 ? (best.c > keep - (own === 'xy' ? 0 : C.keepBy) || dwell) : (best.c >= 1000 && (best.c > keep - 350 || dwell))) best = { c: keep, tx: keepTx, ty: keepTy };
  if ((own !== 'y' && best.tx !== P.tx) || (own !== 'x' && best.ty !== P.ty)) P.moved = st.clock;
  P.tx = best.tx; P.ty = best.ty; P.c = best.c;
  return P;
}
// with a person on the other axis: would the dragon do better `by` further along THEIR axis (dir -1 or 1)? Compared with
// staying where it is, each with the computer's own axis at its best. (Asked only while the person is pushing, or when
// the computer's own axis cannot save a Crumple: 22 short flights.)
function popdragonCpuFurther(st, axis, dir) {
  const R = POPDRAGON_ROUTE, C = POPDRAGON_CPU, burnt = popdragonCpuBurnt(st);
  const best = (d) => {
    let b = 1e9;
    if (axis === 'x') { const tx = clamp(st.ox + d, -R.WX, R.WX); for (let y = -R.WY; y <= R.WY + 1e-6; y += 0.7) b = Math.min(b, popdragonCpuRoll(st, burnt, tx, y, 'xy', 0)); }
    else { const ty = clamp(st.oy + d, -R.WY, R.WY); for (let x = -R.WX; x <= R.WX + 1e-6; x += 1) b = Math.min(b, popdragonCpuRoll(st, burnt, x, ty, 'xy', 0)); }
    return b;
  };
  const stay = best(0), go = best(dir * (axis === 'x' ? C.lean : C.lean * 0.7));
  return { stay, go, good: go < stay - C.leanBy };
}

cpuBrain('popdragon', {
  noIdleStop: false,
  reset(bst) { bst.fireWait = 0.15 + Math.random() * 0.15; bst.lean = 0; bst.help = null; bst.hint = null; },
  think(bst, p, o, dt, info) {
    const st = info.mst, out = {};
    if (!st) return out;
    // the finish: hold the catch as soon as the ring is up, and wait for the partner (never catches alone)
    if (st.phase === 'catch') { if (st.bounce <= 0) { out.act = true; if (!o.input.act && st.catchT > 0.25) cpuSay(p, 'Hold your button!'); } return out; }
    if (st.phase !== 'fly') return out;
    const K = POPDRAGON, R = POPDRAGON_ROUTE, C = POPDRAGON_CPU;
    // the partner's push on its own axis (Pip's left/right, Bo's up/down), as the dragon reads it, smoothed over a
    // fifth of a second
    const oa = popdragonAxes(o), solo = !info.partnerCpu, own = solo ? (p.id === 0 ? 'x' : 'y') : 'xy';
    const theirs = p.id === 0 ? oa.y : oa.x;
    bst.lean = (bst.lean || 0) + (theirs - (bst.lean || 0)) * Math.min(1, dt / 0.2);
    const P = popdragonCpuPlan(st, own, bst.lean);
    const v = R.at(st.s).v || 1;
    // coming up to a slot it lines up with the gap, whatever else the plan fancies (the plan flies slots as if tucked
    // and drawn in, which a partner who is late on the tuck would make untrue)
    const near = (R.slots || []).find(q => q.s - st.s > -3 && q.s - st.s < v * 1.3);
    const aimX = near ? near.ox : P.tx, aimY = near && near.oy != null ? near.oy : P.ty;
    // aim a little ahead of where the dragon is drifting, so it eases in instead of overshooting
    const ex = aimX - (st.ox + st.vx * K.STOP * 0.6), ey = aimY - (st.oy + st.vy * K.STOP * 0.6);
    const push = (e, full) => (Math.abs(e) < 0.18 ? 0 : clamp(e / (full * 0.22), -1, 1));
    if (p.id === 0) {
      out.ax = push(ex, K.VX);
      if (Math.abs(out.ax) > 0 && Math.abs(out.ax) < 0.25) out.ax = Math.sign(out.ax) * 0.25;
      // fire on a cobweb just ahead (after a person's moment to see it)
      const w = (R.webs || []).find(q => st.burnt[q.burn] == null && q.s - st.s > 0.5 && q.s - st.s < K.FIRE_REACH - 0.5 && Math.hypot(st.ox, st.oy - (q.oy || 0)) < q.r + 0.5)
        || (R.lights || []).find(q => st.burnt[q.id] == null && q.s - st.s > 0 && q.s - st.s < K.FIRE_REACH - 0.5 && Math.hypot(st.ox - q.ox, st.oy - q.oy) < q.r + 0.6);
      if (w) { bst.seen = (bst.seen || 0) + dt; if (bst.seen > bst.fireWait && st.fireCd <= 0) out.act = 'tap'; } else bst.seen = 0;
    } else {
      out.ay = -push(ey, K.VY);
      if (Math.abs(out.ay) > 0 && Math.abs(out.ay) < 0.25) out.ay = Math.sign(out.ay) * 0.25;
      // the tail: knock off clinging moths (after a moment to notice), bat a paw just as it strikes (bonus stars), and
      // swish away a moth or dust bunny about to land
      const until = (q) => (q.s - st.s) / v;
      const pn = R.paws.find(q => q.s > st.s), cn = R.clingers.find(q => q.s > st.s);
      bst.mothT = st.moths > 0 ? (bst.mothT || 0) + dt : 0;
      if (st.tailCd <= 0 && st.tail <= 0) {
        if (bst.mothT > 0.35) out.act = 'tap';
        else if (pn && until(pn) > 0.04 && until(pn) < 0.2) out.act = 'tap';
        else if (cn && until(cn) > 0.03 && until(cn) < 0.18 && Math.hypot(st.ox - cn.ox, st.oy - cn.oy) < R.CLING + 0.6) out.act = 'tap';
      }
    }
    // the helper axis: push the same way as the partner (a swoop) only when they are already pushing and it is good
    const axis = p.id === 0 ? 'y' : 'x', dirNow = Math.abs(theirs) > 0.3 ? Math.sign(theirs) : 0;
    let help = 0;
    if (!solo) {
      // two computers share one plan: the helper joins a big move the plan wants
      const e = p.id === 0 ? ey : ex, big = p.id === 0 ? C.swoopAt * 0.7 : C.swoopAt;
      if (dirNow && Math.abs(e) > big && Math.sign(e) === dirNow) help = dirNow;
    } else if (dirNow) {
      // asked afresh every 0.12 s while they push; a yes is kept for 0.4 s so the help does not flicker
      const H = bst.help && bst.help.dir === dirNow ? bst.help : (bst.help = { dir: dirNow, at: -1, good: -9 });
      if (st.clock - H.at >= C.every) { H.at = st.clock; if (popdragonCpuFurther(st, axis, dirNow).good) H.good = st.clock; }
      if (st.clock - H.good < 0.4) help = dirNow;
    } else bst.help = null;
    if (help) {
      if (p.id === 0) out.ay = -help; else out.ax = help;
      cpuSay(p, p.id === 0 ? (help > 0 ? 'Swoop up!' : 'Swoop down!') : (help > 0 ? 'Swoop right!' : 'Swoop left!'));
    }
    if (solo) {
      // a gold swoop sign coming up: say which way, so the person leans and the swoop can start
      const sg = (R.signs || []).find(q => q.kind === 'swoop' && st.s > q.s - v * 1.2 && st.s < q.s + 12);
      if (sg && !help && ((sg.dir === 'left' || sg.dir === 'right') === (p.id === 1))) cpuSay(p, 'Swoop ' + sg.dir + '!');
      // when only the person's axis can save a Crumple, a short hint for it ("Left!", "Up!"), looked up twice a second
      if (P.c >= 1000) {
        const Hn = bst.hint || (bst.hint = { at: -9, say: '' });
        if (st.clock - Hn.at > 0.5) {
          Hn.at = st.clock; Hn.say = '';
          const a = popdragonCpuFurther(st, axis, -1), b = popdragonCpuFurther(st, axis, 1);
          if (Math.min(a.go, b.go) < 1000) Hn.say = a.go < b.go ? (p.id === 1 ? 'Left!' : 'Down!') : (p.id === 1 ? 'Right!' : 'Up!');
        }
        if (Hn.say) cpuSay(p, Hn.say);
      }
    }
    // the tuck: at a slot, from a little before its walls until the open wings would be clear of them
    const sl = popdragonCpuSlot(st.s, v, C.tuckLead);
    // (while the slot is drawing the tucked dragon to its middle, its own push there does nothing: hands off)
    if (sl && st.tuck > 0.6 && sl.s - st.s > -3 && sl.s - st.s < 10) { if (p.id === 0) out.ax = 0; else if (sl.oy != null) out.ay = 0; }
    if (sl && st.tuckRest <= 0) {
      const burnt = popdragonCpuBurnt(st);
      if (st.s < sl.s + 1 || [0, 0.05, 0.1, 0.16, 0.22, 0.3].some(d => popdragonHit(st.s + v * d, st.ox, st.oy, K.HW, burnt, st.clock + d))) { out.jump = true; if (st.s < sl.s) cpuSay(p, 'Tuck!'); }
    }
    return out;
  },
});
