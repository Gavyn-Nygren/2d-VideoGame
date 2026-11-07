/* Pip & Bo - computer brain for 18-2 Grapple & Zip (mode 'grapple'). */
'use strict';

/* 18-2 Grapple & Zip. Every hop has a thrower and a zipper (the zipper of one hop throws the next), so the brain plays
   whichever job MODES.grapple.needs(m, id) gives it this hop. It reads what the prompts and job cards show (its job,
   where to walk, the rope, the coins and bumps along it, the power meter, the capstan beat) and presses keys like a
   person: ◀ ▶ to walk, ▲ (jump) / ▼ on the rope ladder, the action to throw, grab, let go, heave and board.
   - Walking: to the rope ladder, up or down it, then along the deck or the crow's nest to the spot.
   - Thrower: on the gold X it picks an angle by trying throws in its head with the level's own hook rules (the same
     wind, ring, gulls and laundry it can see: MODES.grapple.test.hookMove), the angle with the widest window of good
     power. It holds ▲ / ▼ to that angle, holds the action and lets go when the meter is at a power that its head-throw
     says lands in the ring. Its idea of the angle is off by a degree or two (less after each miss), so it misses now
     and then like a person. If the meter goes round twice without a good moment it lets go at the bottom (too soft:
     no throw) and thinks again.
   - Zipper: climbs to the ladder side of the crow's nest and waits for the hook, grabs the handle, then tucks (▶) and brakes (◀) so it reaches the
     knot slower than a bonk, lifts its legs (▲) for flags and high coins and dips (▼) for lanterns and low coins a
     moment before they reach it, and lets go at the knot. Then it walks to the capstan and heaves on a steady beat
     (about every 0.45 s) once the rider is in the chair.
   - Rider: hops into the chair, presses ▶ to help pull while the capstan turns, and reaches ▲ / ▼ for coins.
   With a person partner it never does the person's job; it waits and says what is needed in a short bubble ("Hold F,
   then let go!", "Grab the handle!", "Hop in the chair!", "Crank the capstan!"), not too often. Team levels always
   play at full skill, so skill only changes how quick it is. */
(() => {
  function say(st, p, text, gap = 7) {
    const n = st.sayN && st.sayN.text === text ? st.sayN.n : 0, all = st.sayAll || 0;
    if (G.time - (st.saidT == null ? -99 : st.saidT) < gap * (1 + Math.floor(n / 3) + Math.floor(all / 10))) return;
    st.saidT = G.time; st.sayN = { text, n: n + 1 }; st.sayAll = all + 1; cpuSay(p, text, 1.9);
  }
  const keyOf = (id, what) => (typeof grappleKey === 'function' ? grappleKey(id, what) : '');
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;

  /* ---------- walking: ladders, decks, the crow's nest ---------- */
  function walkTo(out, m, pl, nest, x, dead = 5) {
    const sh = m.ships[pl.ship];
    if (pl.mode === 'climb') { if (nest) out.jump = true; else out.down = true; return false; }
    if (pl.mode !== 'walk') return false;
    if (!!pl.onNest === !!nest) {
      const d = x - pl.x;
      if (Math.abs(d) <= dead) return true;
      out.left = d < 0; out.right = d > 0;
      return false;
    }
    const d = sh.ladX - pl.x;
    if (Math.abs(d) < 8) { if (nest) out.jump = true; else out.down = true; }
    else { out.left = d < 0; out.right = d > 0; }
    return false;
  }

  /* ---------- the thrower ---------- */
  // a throw in the head: the same hook rules as the level, from the hand at release time
  function simThrow(m, hop, ang, pow, t0) {
    const P = MODES.grapple.GRAPPLE, T = MODES.grapple.test, from = m.ships[hop.from];
    const h = T.hand(from, t0), a = ang * Math.PI / 180, v = P.vMin + pow * (P.vMax - P.vMin);
    const hk = { x: h.x, y: h.y, vx: v * Math.cos(a), vy: -v * Math.sin(a), t: 0, near: 1e9 };
    const dt = 1 / 120;
    for (let j = 1; j < 420; j++) {
      const tt = t0 + j * dt;
      hk.t += dt;
      let hit = null;
      for (let i = 0; i < 2 && !hit; i++) hit = T.hookMove(m, hop, hk, tt - dt + dt * (i + 1) / 2, dt / 2);
      if (hit) return { hit, near: hk.near };
    }
    return { hit: 'far', near: hk.near };
  }
  // pick the angle with the widest band of powers that land in the ring (thinking about a throw about now)
  function planAngle(m, hop, t0) {
    let best = null;
    for (let a = -8; a <= 74; a += 2) {
      let run = 0, bestRun = 0, sum = 0, n = 0;
      for (let pw = 0.1; pw <= 1.001; pw += 0.025) {
        const r = simThrow(m, hop, a, pw, t0);
        if (r.hit === 'ring') { run++; sum += pw; n++; if (run > bestRun) bestRun = run; } else run = 0;
      }
      if (!bestRun) continue;
      const avgPw = sum / n, score = bestRun - Math.max(0, avgPw - 0.8) * 12 - Math.abs(a - hop.ang) * 0.02;
      if (!best || score > best.score) best = { ang: a, score, pw: avgPw };
    }
    return best;
  }
  function thrower(st, p, o, m, hop, nd, dt, info) {
    const P = MODES.grapple.GRAPPLE, out = {};
    if (nd.job !== 'aim') {
      st.charging = false;
      walkTo(out, m, m.pl[p.id], nd.nest, nd.x, 4);
      return out;
    }
    // a fresh plan for every try
    if (st.planTry !== hop.tries || !st.plan || st.replan) {
      st.planTry = hop.tries; st.replan = false;
      const t0 = m.t + 0.8;
      st.plan = planAngle(m, hop, t0);
      const errK = Math.pow(0.55, hop.misses) * (hop.gold ? 0.5 : 1);
      st.angErr = gauss() * 1.4 * errK;
      st.wait = 0.25 + Math.random() * 0.35;
      st.cycles = 0;
    }
    if (!st.plan) { st.plan = { ang: 35 }; }
    if (st.wait > 0) { st.wait -= dt; return out; }
    const want = clamp(st.plan.ang, P.aimMin, P.aimMax), d = want - hop.ang;
    if (!hop.charging) {
      if (Math.abs(d) > 0.7) {
        // hold toward the angle (let go early so the faster held rate can't overshoot)
        if (Math.abs(d) > (hop.aimHold > 0.45 ? P.aimRate2 : P.aimRate) * dt * 1.5) { if (d > 0) out.jump = true; else out.down = true; }
        return out;
      }
      out.act = true; st.lastCycle = 0;
      return out;
    }
    // charging: let go when the head-throw at the next tick's power lands in the ring
    out.act = true;
    const pw = MODES.grapple.test.powAt(hop, hop.chargeT + dt);
    const cyc = Math.floor((hop.chargeT + dt) / (hop.period || P.powPeriod));
    if (pw >= P.powMin) {
      const r = simThrow(m, hop, hop.ang + st.angErr, pw, m.t + dt);
      if (r.hit === 'ring') { out.act = false; return out; }
    }
    if (cyc >= 2 && pw < P.powMin * 0.8) { out.act = false; st.replan = true; st.wait = 0.2; }
    return out;
  }

  /* ---------- the zipper on the line ---------- */
  function zipper(st, p, m, hop, pl, dt) {
    const P = MODES.grapple.GRAPPLE, T = MODES.grapple.test, out = {}, z = pl.zip, r = hop.rope;
    if (!z || !r) return out;
    if (z.at === 'stop') { out.act = 'tap'; return out; }
    const q = T.ropeAt(r, z.s), left = r.sEnd - z.s;
    // speed: tuck, unless it would reach the knot too fast to stop; brake in time for the knot
    const target = P.bonkV * 0.55;
    const slope = T.ropeAt(r, Math.min(r.sEnd, z.s + 40)).sin;
    const dec = P.brakeAcc - P.zipG * Math.max(0, slope);
    const need = z.v > target ? (z.v * z.v - target * target) / (2 * Math.max(60, dec)) : 0;
    if (z.v > target && left < need + 30 + z.v * 0.1) out.left = true;
    else if (z.v < 360 && (z.v < target || left > need + 60)) out.right = true;
    // legs up / dip for what is coming
    const look = q.x + 24 + Math.max(0, z.v) * 0.22, bodyX = q.x;
    let pose = 0;
    for (const o of hop.obs) { const ox = T.ropeU(r, o.u).x; if (ox > bodyX - 14 && ox < look + 10) { pose = o.kind === 'flag' ? -1 : 1; break; } }
    if (!pose) for (const c of hop.coins) {
      if (c.got || (c.rider && !hop.chairCoinsOn) || c.band === 'm') continue;
      const cx = T.ropeU(r, c.u).x; if (cx > bodyX - 8 && cx < look) { pose = c.band === 'h' ? -1 : 1; break; }
    }
    if (pose < 0) out.jump = true; else if (pose > 0) out.down = true;
    return out;
  }
  function rider(st, p, m, hop, pl, dt) {
    const T = MODES.grapple.test, out = {}, r = hop.rope;
    if (!r || !pl.zip) return out;
    const q = T.ropeAt(r, hop.chairS);
    // help pull while the capstan turns
    st.pullT = (st.pullT || 0) - dt;
    if (m.t - hop.lastHeave < 0.6 && hop.pullsLeft > 0 && st.pullT <= 0) { out.right = !st.pullPrev; st.pullPrev = out.right; if (!out.right) st.pullT = 0.12; }
    else st.pullPrev = false;
    const look = q.x + 60;
    let pose = 0;
    for (const o of hop.obs) { const ox = T.ropeU(r, o.u).x; if (ox > q.x - 14 && ox < look) { pose = o.kind === 'flag' ? -1 : 1; break; } }
    if (!pose) for (const c of hop.coins) {
      if (c.got) continue;
      const cq = T.ropeU(r, c.u);
      if (cq.x > q.x - 8 && cq.x < look) { const dy = (cq.y + c.off) - (q.y + MODES.grapple.GRAPPLE.rideMid); pose = dy < -8 ? -1 : dy > 8 ? 1 : 0; break; }
    }
    if (pose < 0) out.jump = true; else if (pose > 0) out.down = true;
    return out;
  }

  /* ---------- a person partner: say what is needed, now and then ---------- */
  function nudge(st, p, o, m, hop, info) {
    if (info.partnerCpu) return;
    const nd = MODES.grapple.needs(m, o.id), since = G.time - (st.jobSince || G.time);
    if (st.jobKey !== nd.job + hop.phase + hop.i) { st.jobKey = nd.job + hop.phase + hop.i; st.jobSince = G.time; return; }
    if (since < 5) return;
    const act = keyOf(o.id, 'act'), up = keyOf(o.id, 'up');
    switch (nd.job) {
      case 'climb': say(st, p, 'Climb up the rope ladder! ' + up); break;
      case 'spot': say(st, p, 'Stand on the gold X!'); break;
      case 'aim': say(st, p, hop.misses >= 2 ? 'Try another angle!' : 'Hold ' + act + ', then let go!'); break;
      case 'grab': say(st, p, 'Grab the handle! ' + act); break;
      case 'board': say(st, p, 'Hop in the chair! ' + act); break;
      case 'capstan': say(st, p, 'Run to the capstan!'); break;
      case 'crank': say(st, p, 'Crank the capstan! ' + act); break;
      default: break;
    }
  }

  cpuBrain('grapple', {
    reset(st) { st.plan = null; st.planTry = -1; st.charging = false; },
    think(st, p, o, dt, info) {
      const m = info.mst;
      if (!m || !m.hop || info.intro || m.fin) return {};
      const hop = m.hop, pl = m.pl[p.id], nd = MODES.grapple.needs(m, p.id);
      if (hop.done) return {};
      nudge(st, p, o, m, hop, info);
      if (p.id === hop.T && (hop.phase === 'aim' || hop.phase === 'fly' || hop.phase === 'reel')) {
        if (hop.phase !== 'aim') return walkTo({}, m, pl, true, nd.x || m.ships[hop.from].spotX, 4) ? {} : {};
        return thrower(st, p, o, m, hop, nd, dt, info);
      }
      const out = {};
      switch (nd.job) {
        case 'climb': case 'spot': case 'capstan': case 'waitHook':
          walkTo(out, m, pl, nd.nest, nd.x, 4); return out;
        case 'grab': case 'board':
          // (the handle and the chair can be taken from anywhere in the crow's nest)
          if (pl.mode === 'walk' && pl.onNest) out.act = 'tap'; else walkTo(out, m, pl, true, nd.x, 6);
          return out;
        case 'zip': return zipper(st, p, m, hop, pl, dt);
        case 'ride': return rider(st, p, m, hop, pl, dt);
        case 'crank': {
          if (!walkTo(out, m, pl, false, nd.x, 8)) return out;
          if (!hop.boarded) return out;
          const since = m.t - hop.lastHeave;
          if (st.beat == null) st.beat = 0.4 + Math.random() * 0.12;
          if (since >= st.beat) { out.act = 'tap'; st.beat = 0.4 + Math.random() * 0.12; }
          return out;
        }
        case 'wait':
          // waiting to ride: stand by the X
          if (p.id === hop.T && pl.mode === 'walk' && pl.ship === hop.from) walkTo(out, m, pl, true, m.ships[hop.from].spotX - 4, 6);
          return out;
        default: return out;
      }
    },
  });
})();
