/* Pip & Bo - Computer partner brain for 19-1 Train Heist Hop. */
'use strict';

/* How the computer plays Train Heist Hop
   It works in train coordinates (p.x + camX) and reads the stretch's cars, gaps and crates (G.mst, all on screen), the
   sack, and the hazards that have been announced (the whistle sign) or are in sight. Its plan, every step:
   - Safety first: a low bridge, arch, spout or tunnel mouth about to pass over it -> hold ▼ (duck) and stand still; it
     never starts a jump that a beam would hit. A tumbleweed rolling at it -> stop and hop it at the right moment.
   - The team's job comes from the wide gap the team is working on (MODES.heist.front, the same one the hint chips use):
       carrying the sack -> walk to the gap's edge; once the partner stands on the far roof, face them and toss with
                            just the hold time that lands the sack on them (it tries the same flight the game uses);
                            until then wait a little back from the edge ("Jump over, I'll toss it!").
       free, before the gap -> back up for a run-up, run and jump at the very edge, steer onto the far roof.
       free, past the gap   -> stand 40 px past the edge, ready to catch; when the sack flies it moves under it.
   - A sack lying on a roof: the nearer one fetches it (with a person it goes after 2.5 s if the person doesn't).
   - Small gaps are hopped on the way; crates and the caboose's cupola are jumped. No wide gap left: both to the flag
     car, or into the engine cab, where it holds the action on the brake lever (the lever needs both, so it can never
     finish alone).
   With a person it waits for them and says short things in 1-player mode only ("Jump over, I'll toss it!", "Catch!",
   "Toss it to me!", "Duck!", "Hold the brake with me!"). The leash ("Wait for me!") stops it running far ahead. */
const HEIST_BOT = { runUp: 80, duckAt: 0.24, beamSafe: 0.95, weedLo: 14, weedHi: 36, weedNear: 140 };

function heistBotMe(st, p) {
  return { cx: p.x + p.w / 2 + st.camX, top: p.y, feet: p.y + p.h, vx: p.vx, vy: p.vy, grounded: p.grounded, face: p.face };
}
// the nearest duck hazard: seconds until its box reaches a body centred at cx, and whether one is over it now
function heistBotBeam(st, cx) {
  let eta = Infinity, over = false;
  const sp = HEIST.hz * Math.max(0.05, st.speedK);
  for (const h of st.hz) {
    if (!HEIST_DUCK[h.k]) continue;
    const w = h.k === 'bridge' ? 70 : h.k === 'tower' ? 30 : h.k === 'arch' ? 90 : 80;
    if (h.phase === 'warn') { eta = Math.min(eta, h.t + (st.camX + W + 40 - (cx + 12)) / sp); continue; }
    if (h.x + w < cx - 13) continue;
    if (h.x <= cx + 13) { over = true; eta = 0; continue; }
    eta = Math.min(eta, (h.x - (cx + 12)) / sp);
  }
  return { eta, over };
}
// a tumbleweed rolling toward cx: its distance ahead (or null)
function heistBotWeed(st, cx) {
  let best = null;
  for (const h of st.hz) {
    if (h.k !== 'weed' || h.phase !== 'go') continue;
    const d = h.x - cx;
    if (d > -16 && d < HEIST_BOT.weedNear && (best === null || d < best)) best = d;
  }
  return best;
}
// steer toward train x (cpuSeek works on screen x, which is the same thing shifted)
function heistBotSeek(out, st, p, tx, dead = 3) { return cpuSeek(out, p, tx - st.camX, dead); }
// a solid low thing (crate, hay bale, cupola) on the roof just ahead in direction dir
function heistBotBlock(st, me, dir, upTo) {
  for (const s of st.solids) {
    if (s.kind === 'wall' || s.kind === 'plate') continue;
    if (me.feet < s.y0 + 1 || me.feet > s.y0 + 60) continue;   // (a step up: crates, the cupola, the cab from the boiler)
    const d = dir > 0 ? s.x0 - (me.cx + 11) : (me.cx - 11) - s.x1;
    if (d >= -2 && d < 44 && (dir > 0 ? s.x0 < upTo : s.x1 > upTo)) return { s, d };
  }
  return null;
}
// walk / hop / jump toward train x tx on the roofs; true when there
function heistBotGo(S, st, p, me, tx, out, carry, bm) {
  const d = tx - me.cx, dir = Math.sign(d);
  if (Math.abs(d) <= 5) { heistBotSeek(out, st, p, tx, 4); S.run = false; return Math.abs(me.vx) < 40; }
  // the first open gap between here and there
  let g = null;
  if (dir > 0) { for (const q of st.gaps) if (!q.plank && q.x0 >= me.cx - 6 && q.x0 < tx) { g = q; break; } }
  else { for (let i = st.gaps.length - 1; i >= 0; i--) { const q = st.gaps[i]; if (!q.plank && q.x1 <= me.cx + 6 && q.x1 > tx) { g = q; break; } } }
  const stopAt = g ? (dir > 0 ? g.x0 : g.x1) : tx;
  // a crate in the way: jump it (or onto it)
  const bl = heistBotBlock(st, me, dir, stopAt);
  if (bl && bm.eta > 0.7) {
    out.left = dir < 0; out.right = dir > 0;
    if (bl.d < (carry ? 40 : 34)) { out.jump = true; S.air = { dir, land: null, tx }; }
    return false;
  }
  if (!g) { heistBotSeek(out, st, p, tx, 4); return false; }
  const edge = dir > 0 ? g.x0 : g.x1, dEdge = (edge - me.cx) * dir, wide = g.kind === 'wide';
  if (wide && carry) { heistBotSeek(out, st, p, edge - dir * 44, 4); return false; }
  // a beam would catch us mid-jump: wait for it a little way back from the edge
  if (bm.eta < (wide ? 1.05 : 0.8) && dEdge < 90) { heistBotSeek(out, st, p, edge - dir * 70, 6); S.run = false; return false; }
  if (wide && !S.run) {
    // the run-up: up to HEIST_BOT.runUp px, less when a crate stands behind (full speed takes only about 10 px)
    let room = HEIST_BOT.runUp;
    for (const q of st.solids) {
      if (q.kind === 'wall' || q.kind === 'car' || q.kind === 'plate' || q.y0 >= HEIST.roof) continue;
      const back = dir > 0 ? edge - q.x1 : q.x0 - edge;
      if (back > 0 && back - 14 < room) room = Math.max(30, back - 14);
    }
    const car = MODES.heist.carAt(st, me.cx);
    if (car) room = Math.min(room, (dir > 0 ? edge - car.x0 : car.x1 - edge) - 14);
    // (and never so far back that the leash would hold us: a partner already over there is the limit)
    if (S.oX != null && (S.oX - edge) * dir > 0) room = Math.min(room, HEIST.maxSep - 24 - Math.abs(S.oX - edge));
    room = Math.max(room, 12);
    if (dEdge < room - 10) {
      const spot = edge - dir * room;
      if (heistBotSeek(out, st, p, spot, 5) || Math.abs(spot - me.cx) < 6) S.run = true;
      return false;
    }
    S.run = true;
  }
  out.left = dir < 0; out.right = dir > 0;
  // take off: at the very edge for a wide gap (full speed), a bit before it for a small one
  if (dEdge <= (wide ? -3 : 8)) {
    if (wide && Math.abs(me.vx) < 90) { S.run = false; return false; }   // too slow: back up and try again (a standing jump makes it too)
    out.jump = true; S.run = false;
    S.air = { dir, land: dir > 0 ? g.x1 + 26 : g.x0 - 26, tx };
  }
  return false;
}
// where a flying sack comes down to height y (train x), or null
function heistBotLanding(st, y) {
  const s = st.sack;
  let x = s.x, yy = s.y, vx = s.vx, vy = s.vy;
  for (let i = 0; i < 240; i++) {
    const dt = 1 / 120;
    vy += HEIST.sackG * dt; x += vx * dt; yy += vy * dt;
    if (vy > 0 && yy >= y) return x;
  }
  return null;
}
// the hold time (0..1 of chargeMax) whose toss lands on train x tx, from p
function heistBotTossK(st, p, me, tx) {
  let best = 0, bestErr = Infinity;
  for (let k = 0; k <= 1.0001; k += 0.05) {
    const v = MODES.heist.tossV(k, 1);
    let x = me.cx - 3, y = p.y + 5, vx = v.vx, vy = v.vy;
    for (let i = 0; i < 240; i++) { const dt = 1 / 120; vy += HEIST.sackG * dt; x += vx * dt; y += vy * dt; if (vy > 0 && y >= HEIST.roof - 14) break; }
    const err = Math.abs(x - tx);
    if (err < bestErr) { bestErr = err; best = k; }
  }
  return best;
}

cpuBrain('heist', {
  reset(S) { S.air = null; S.run = false; S.tossK = 0; S.waitT = 0; S.fetchT = 0; S.edgeT = 0; S.stillT = 0; },
  think(S, p, o, dt, info) {
    dt = dt || 1 / 120;
    const st = info.mst, out = {};
    if (!st || !st.cars || info.intro || G.introT > HEIST.introHold || st.state !== 'play') { S.air = null; return out; }
    const P = st.pl[p.id], O = st.pl[o.id];
    if (!p.alive || P.whoops) { S.air = null; S.run = false; return out; }
    const me = heistBotMe(st, p), human = !info.partnerCpu, s = st.sack;
    const carry = s.state === 'held' && s.who === p.id, oCarry = s.state === 'held' && s.who === o.id;
    const oX = MODES.heist.tx(st, o), oOk = o.alive && !O.whoops;
    S.oX = oOk ? oX : null;
    // in the air: finish the jump we started (hold jump to the top, keep going until over the far roof)
    if (!me.grounded) {
      if (S.air) {
        const a = S.air;
        out.jump = me.vy < 0;
        if (a.land != null && (a.dir > 0 ? me.cx < a.land : me.cx > a.land)) { out.left = a.dir < 0; out.right = a.dir > 0; }
        else if (a.tx != null) heistBotSeek(out, st, p, a.tx, 4);
      } else if (Math.abs(me.vx) > 20 && !MODES.heist.carAt(st, me.cx)) {
        // (in the air over a gap with no plan, after a bonk or a late jump: keep going the way we were)
        out.left = me.vx < 0; out.right = me.vx > 0; out.jump = me.vy < 0;
      }
      return out;
    }
    S.air = null;
    // a toss being wound up: hold until the strength we want, then let go
    if (P.charging) { out.act = P.chargeT < S.tossK * HEIST.chargeMax - 0.003; return out; }
    // ducking: something low is about to pass over
    const bm = heistBotBeam(st, me.cx);
    if (bm.over || bm.eta < HEIST_BOT.duckAt) {
      out.down = true;
      if (human && oOk && !O.duck && bm.eta < 0.9) cpuSay(p, 'Duck!');
      return out;
    }
    if (human && oOk && bm.eta < 1.2 && !O.duck) { const ob = heistBotBeam(st, oX); if (ob.eta < 0.6) cpuSay(p, 'Duck! Hold down!'); }
    // a tumbleweed rolling at us: wait for it and hop it
    const wd = heistBotWeed(st, me.cx);
    if (wd !== null && wd < HEIST_BOT.weedNear) {
      const lo = HEIST_BOT.weedLo, hi = carry ? HEIST_BOT.weedHi - 2 : HEIST_BOT.weedHi + 6;
      if (wd <= hi && wd >= lo && bm.eta > 0.7) { out.jump = true; S.air = { dir: 0, land: null, tx: me.cx }; }
      else if (Math.abs(me.vx) > 30) heistBotSeek(out, st, p, me.cx, 3);
      return out;
    }
    // what to do
    const g = MODES.heist.front(st);
    if (s.state === 'fly') {
      if (s.from === p.id) return out;
      const lx = heistBotLanding(st, me.top + 10);
      const car = MODES.heist.carAt(st, me.cx);
      if (lx != null && car) heistBotSeek(out, st, p, clamp(lx, car.x0 + 13, car.x1 - 13), 3);
      return out;
    }
    if (s.state === 'ret') return out;
    if (s.state === 'roof') {
      // the nearer one fetches it (a person gets a moment to go first); a sack I threw over a wide gap is the partner's
      const iMay = MODES.heist.mayGrab(st, p), oMay = MODES.heist.mayGrab(st, o);
      const mine = iMay && (!oMay || !oOk || Math.abs(s.x - me.cx) <= Math.abs(s.x - oX));
      S.fetchT = (S.fetchT || 0) + dt;
      if (mine || (iMay && human && S.fetchT > 2.5) || (iMay && !human && !oOk)) {
        if (human && !mine) cpuSay(p, 'I’ll get the sack!');
        const above = s.y < me.feet - 12;
        heistBotGo(S, st, p, me, s.x, out, false, bm);
        if (above && Math.abs(s.x - me.cx) < 26 && bm.eta > 0.7) { out.jump = true; S.air = { dir: 0, land: null, tx: s.x }; }
        return out;
      }
      if (human) cpuSay(p, 'Grab the gold sack!');
      // a sack I threw over a wide gap: go over to its side too (next to it, not onto it), so nobody is held back by the leash
      if (!iMay) {
        const side = me.cx < s.x ? -1 : 1, car = MODES.heist.carAt(st, s.x);
        let tx = s.x + side * 50;
        if (car) tx = clamp(tx, car.x0 + 16, car.x1 - 16);
        if (Math.abs(tx - s.x) < 20) tx = s.x - side * 50;
        heistBotGo(S, st, p, me, tx, out, false, bm);
      }
      return out;
    }
    S.fetchT = 0;
    if (!g) {
      // every wide gap is behind us: the flag car, or the engine cab and its brake
      if (st.final && st.cab) {
        const spot = st.cab.lever + (p.id === 0 ? -24 : 24);
        const inCab = MODES.heist.inCab(st, p);
        const there = heistBotGo(S, st, p, me, spot, out, carry, bm) || (inCab && Math.abs(me.cx - spot) < 20);
        if (inCab && there) {
          const oIn = MODES.heist.inCab(st, o);
          out.left = out.right = false;
          out.act = oIn && s.state === 'held';
          if (human && !oIn) cpuSay(p, 'Come into the cab!');
          else if (human && oIn && !o.input.act) cpuSay(p, 'Hold the brake with me!');
        }
        return out;
      }
      if (st.goal) {
        const spot = st.goal.x0 + (st.goal.x1 - st.goal.x0) * (p.id === 0 ? 0.36 : 0.64);
        const there = heistBotGo(S, st, p, me, spot, out, carry, bm);
        if (there && human && oX < st.goal.x0) cpuSay(p, 'Come to the flag car!');
      }
      return out;
    }
    if (carry) {
      const oReady = oOk && oX > g.x1 + 4 && (o.grounded || !!MODES.heist.carAt(st, oX));   // (a partner hopping about on the far roof counts)
      const edge = g.x0 - 13;
      if (!oReady) {
        S.edgeT = 0;
        heistBotGo(S, st, p, me, g.x0 - 46, out, true, bm);
        if (human && g.x0 - me.cx < 120 && oX < g.x0) cpuSay(p, 'Jump over, I’ll toss it!', 2.2);
        return out;
      }
      if (Math.abs(me.cx - edge) > 6 || Math.abs(me.vx) > 30) { heistBotGo(S, st, p, me, edge, out, true, bm); return out; }
      if (me.face !== 1) { out.right = true; return out; }
      S.edgeT += dt;
      // a short beat so a person sees it coming; never into a beam
      if (S.edgeT < (human ? 0.5 : 0.15) || bm.eta < 1.0) return out;
      S.tossK = heistBotTossK(st, p, me, oX);
      out.act = 'tap';
      S.edgeT = 0;
      return out;
    }
    // free: cross the gap first, then stand ready to catch
    if (me.cx < g.x0 + 6) {
      heistBotGo(S, st, p, me, g.x1 + 44, out, false, bm);
      if (human && oCarry && oX < g.x0 - 280 && g.x0 - me.cx < 160) cpuSay(p, 'Bring the sack this way!');
      if (human && !oCarry && oX > g.x1 && s.state === 'held') cpuSay(p, 'My turn to jump!');
      return out;
    }
    const spot = g.x1 + 40;
    heistBotGo(S, st, p, me, spot, out, false, bm);
    if (Math.abs(me.cx - spot) < 8 && me.face !== -1 && Math.abs(me.vx) < 20) out.left = true;   // (face the thrower)
    if (human && oCarry) {
      if (g.x0 - oX < 70) cpuSay(p, 'Toss it to me!', 2.2);
      else if (g.x0 - oX > 200) cpuSay(p, 'Bring the sack to the edge!', 2.2);
    }
    if (human && !oCarry && s.state === 'held' && oX < g.x0) cpuSay(p, 'Your turn: jump across!', 2.2);
    return out;
  },
});
