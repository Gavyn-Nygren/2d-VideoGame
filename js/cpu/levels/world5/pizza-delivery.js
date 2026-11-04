/* Pip & Bo - Computer partner: pizza delivery. */
'use strict';

(() => {
  /* 5-2 Pizza Delivery: both carry one tray, and it only moves when both walk the same way, so every choice is a team
     choice. Each step the computer decides what the pair should do, then does its own half and reads the partner:
     - Walk or stop: it plays the next 1.4 s forward with a copy of the tray's lean (the spring, walking jolts, bumps,
       cobbles, puddles, the slope and the wind's rhythm) for "keep walking", "walk a moment then stop" and "stop and
       steady". It walks while it could still stop without the top box teetering, else stops and holds steady until
       the stack settles (this also slows it over bumps: it creeps).
     - A teetering box or a gust coming: stop and hold steady (both are needed to save it).
     - Crates: a team hop. Two computers hop on the run at the right spot; with a person it stops at the crate and hops
       the moment the person does, and after a short wait counts them in ("Hop with me!") and holds hop.
     - Awnings: duck when the stack would bump; if the person must duck too and doesn't, it stops short.
     - Slopes: the higher holder ducks a little to keep the tray level.
     - Door: stop in the gold zone.
     With a person: it walks when they walk. If the stack is wobbly it says "Slow down!" and holds back a moment, then
     goes along (stopping alone only strains the tray); a teeter, a gust, a crate or an awning stop it for real. When
     they wait, it takes the first step after a moment, and lets go again if they don't come along ("Walk with me!"):
     pushing alone never moves the tray. The wind is read from its rhythm, as a person hears it (the whistle comes
     1 s before each gust). */
  const P = () => MODES.pizza.PZ;
  const hf = n => P().hf0 + P().hf1 * n;
  const SIM_DT = 1 / 120, HORIZON = 1.4, SAFE = 0.8;

  // where the pair should stop (in the door's gold zone, just short of its middle)
  const stopX = m => (m.R.door ? m.R.door.cx - 8 : W - 60);
  const handOf = (feet, duck) => feet - PH - P().handUp + duck * P().duck;

  /* ---------- a copy of the tray: X, V and the stack's lean, for one plan ---------- */
  // plan: tw = seconds of walking (Infinity = keep walking to the door, 0 = stop now)
  function sim(m, tw, dir, walkV) {
    const Z = P(), R = m.R, L = m.pc[m.left], Rp = m.pc[m.right], k = hf(m.n);
    let X = m.X, V = m.V, lean = m.lean, lv = m.leanV, maxL = Math.abs(lean), roomT = m.roomT, wT0 = m.windT0;
    const sx = stopX(m), dL = L.duck, dR = Rp.duck;
    for (let t = 0; t < HORIZON; t += SIM_DT) {
      let Vt = t < tw ? dir * walkV : 0;
      if (dir > 0 ? X >= sx : X <= sx) Vt = 0;
      const steady = Vt === 0 && Math.abs(V) <= Z.steadyMaxV;
      const speeding = Vt !== 0 && (V === 0 || Math.sign(Vt) === Math.sign(V)) && Math.abs(Vt) > Math.abs(V);
      const acc = speeding ? Z.acc : steady ? Z.decSteady : Z.dec;
      const V0 = V;
      V = approach(V, Vt, acc * SIM_DT);
      const a = (V - V0) / SIM_DT, x0 = X;
      X += V * SIM_DT;
      // bumps, cobbles and puddles under each holder's feet (as the level adds them)
      const spd = Math.abs(V) / Z.walk;
      let imp = 0;
      for (const [pc, off, away] of [[L, -Z.span / 2, 1], [Rp, Z.span / 2, -1]]) {
        const p0 = x0 + off, p1 = X + off, lo = Math.min(p0, p1), hi = Math.max(p0, p1);
        if (lo === hi) continue;
        for (const b of R.bumps) if (b.cx > lo && b.cx <= hi) imp += away * Z.jBump * spd * spd;
        for (const c of R.crests) if (c > lo && c <= hi) imp += (hash(Math.round(c), pc.id + m.room * 7) & 1 ? 1 : -1) * Z.jCobble * spd * spd;
        for (const pd of R.puddles) if (!(p0 > pd.x0 && p0 < pd.x1) && p1 > pd.x0 && p1 < pd.x1) imp -= away * Z.jSplash * spd;
      }
      lv += k * imp;
      const hl = handOf(MODES.pizza.support(R, X - Z.span / 2), dL), hr = handOf(MODES.pizza.support(R, X + Z.span / 2), dR);
      const phi = clamp((hr - hl) / Z.span, -0.8, 0.8);
      // the wind's rhythm (whistle, then the gust)
      let wF = 0;
      if (R.wind) {
        const Wd = Z.wind;
        if (wT0 == null && X > R.wind.x0 - Wd.trig) wT0 = roomT;
        const tt = wT0 == null ? -1 : roomT - wT0 - Wd.first;
        if (tt >= 0) {
          const c = tt % Wd.period;
          if (c >= Wd.warn && c < Wd.warn + Wd.gust && X > R.wind.x0 && X < R.wind.x1) {
            const u = c - Wd.warn;
            wF = R.wind.dir * Wd.force * m.windMul * Math.max(0, Math.min(1, u / Wd.rampIn, (Wd.gust - u) / Wd.rampOut));
          }
        }
      }
      const F = (-Z.cAcc * clamp(a, -1500, 1500) / 300 + Z.cTilt * phi + wF) * k;
      const nS = steady ? 2 : 0, Ke = Z.K + Z.Ksteady * nS, De = Z.D + Z.Dsteady * nS;
      lv += (F - Ke * lean - De * lv) * SIM_DT;
      lean += lv * SIM_DT;
      roomT += SIM_DT;
      maxL = Math.max(maxL, Math.abs(lean));
    }
    return maxL;
  }

  /* ---------- the level's pieces, seen from the pair ---------- */
  // the gap (px) from a holder's toes to the next crate wall in the walking direction (Infinity: none)
  function crateGap(m, pc, dir) {
    let g = Infinity;
    for (const c of m.R.crates) {
      const d = dir > 0 ? c.x0 - (pc.xc + 8) : (pc.xc - 8) - c.x1;
      if (d > -2 && d < g && pc.feet > c.top + 1) g = d;
    }
    return g;
  }
  // would the stack bump an awning `ahead` px further on, with these ducks?
  function stackHitsAt(m, ahead, duckL, duckR) {
    const Z = P(), L = m.pc[m.left], Rp = m.pc[m.right];
    const X = m.X + ahead;
    const hl = handOf(L.feet, duckL) + (L.ready >= 0 ? Z.readyDip : 0), hr = handOf(Rp.feet, duckR) + (Rp.ready >= 0 ? Z.readyDip : 0);
    const top = (hl + hr) / 2 - Z.trayTh - m.n * Z.boxH;
    let c = -1e9;
    for (let x = Math.floor(X - Z.boxW / 2); x <= X + Z.boxW / 2; x += 2) if (x >= 0 && x < W) c = Math.max(c, m.R.ceil[x]);
    return top < c;
  }
  // seconds until the next gust can push the stack (Infinity: no wind here)
  function calmFor(m) {
    const R = m.R, Wd = P().wind;
    if (!R.wind || m.X > R.wind.x1 + 10 || m.X < R.wind.x0 - Wd.trig - 20) return Infinity;
    if (m.windT0 == null) return Infinity;
    const c = (m.roomT - m.windT0 - Wd.first) % Wd.period;
    return c < Wd.warn ? Wd.warn - c : c < Wd.warn + Wd.gust ? 0 : Wd.period - c + Wd.warn;
  }
  // a bubble, but not chatty: the same words at most every `gap` s and a new bubble at most every 2.5 s (urgent ones
  // skip that); words still on screen just stay up while they are true
  function say(S, p, text, secs, gap, urgent) {
    const b = CPU.bubbles[p.id], now = G.time, said = S.said || (S.said = {});
    if (b && b.t > 0 && b.text === text) { cpuSay(p, text, secs); return; }
    if (now - (said[text] == null ? -99 : said[text]) < gap || (!urgent && now - (S.sayAt == null ? -99 : S.sayAt) < 2.5)) return;
    said[text] = now; S.sayAt = now; cpuSay(p, text, secs);
  }
  const walking = (i, dir) => (dir > 0 ? i.right && !i.left : i.left && !i.right) && !i.act;

  function think(S, p, o, dt, info) {
    const m = info.mst, out = {};
    if (!m || !m.pc || !m.R || m.phase !== 'play') return out;
    const Z = P(), me = m.pc[p.id], pal = m.pc[o.id], dir = (m.R.door ? m.R.door.cx : W) >= m.X ? 1 : -1;
    const person = !info.partnerCpu, theyWalk = person && (walking(o.input, dir) || pal.carry === dir);
    const amL = p.id === m.left, front = dir > 0 ? m.pc[m.right] : m.pc[m.left], back = front === me ? pal : me;
    const air = !me.grounded || !pal.grounded, v = Math.abs(m.V);
    const step = k => { out.right = k > 0; out.left = k < 0; };
    // the stack with ducks (L, R) and `a` px further on
    const hits = (a, dL, dR) => stackHitsAt(m, dir * a, dL, dR);
    const myDucks = (a, mine) => hits(a, amL ? mine : m.pc[m.left].duck, amL ? m.pc[m.right].duck : mine);

    // ----- ducking: an awning ahead, or the higher one on a slope
    const look = Math.max(40, v * 0.5);
    let duck = hits(look, 0, 0) || hits(look * 0.5, 0, 0) || hits(0, 0, 0);
    if (!duck && me.grounded && pal.grounded && me.feet < pal.feet - 10 && !m.teeter) duck = true;

    // ----- walk or stop (hard: never walk on, whatever the partner does)
    const walkV = m.pc.some(pc => pc.duck > 0.5) || duck ? Z.duckWalk : Z.walk;
    S.planT = (S.planT || 0) - dt;
    if (S.planT <= 0) {
      S.planT = 0.03;
      const walkL = sim(m, Infinity, dir, walkV), creepL = sim(m, 0.3, dir, walkV);
      S.safe = walkL < SAFE ? 'walk' : creepL < SAFE ? 'creep' : 'stop';
    }
    let go = S.safe !== 'stop', hard = false;
    const stopHard = () => { go = false; hard = true; };
    if (m.teeter) stopHard();
    if (dir > 0 ? m.X >= stopX(m) : m.X <= stopX(m)) stopHard();                 // at the door: settle
    // the stack would bump the awning with my duck and the partner's as it is now: wait for them to duck
    // (it stays ducked meanwhile, to show how, rather than standing up to steady a push lean)
    const awnWait = hits(Math.max(14, v * 0.4), 0, 0) && myDucks(Math.max(14, v * 0.4), 1) && !hits(0, 0, 0);
    S.awnT = awnWait ? (S.awnT || 0) + dt : 0;
    // a person who keeps walking into it without ducking (after a few "Duck with me!"s) gets their way: the bump
    // knocks a box off and the level shows DUCK!, then it waits for them again (the level retries a room with a
    // smaller order if too many fall), so the pair never stands there forever
    S.awnPush = !awnWait || m.awnBonkT > 2.3 ? 0 : (S.awnPush || 0) + (theyWalk ? dt : 0);
    if (awnWait) { if (person && S.awnPush > 5) go = true; else stopHard(); }
    // in the wind with a gust coming: stop and steady
    const windy = calmFor(m) < 0.5 && m.X > m.R.wind.x0 - 20 && m.X < m.R.wind.x1 + 10;
    if (windy && S.safe !== 'walk') stopHard();
    // stopped a long while with walking still "unsafe" (one more bump right ahead, or a tray left tilted by a solo
    // hop onto a crate, which keeps the stack leaning however long it is steadied): go slowly anyway once it's settled
    S.stopT = !go && !hard && v < 5 && Math.abs(m.leanV) < 0.4 ? (S.stopT || 0) + dt : 0;
    if (S.stopT > 2.5) { S.stopT = 0; S.goOn = 1; }                             // ...and keep going a moment
    if (S.goOn > 0) { S.goOn -= dt; if (!hard) go = true; }

    // ----- crates: team hops
    const gap = Math.min(crateGap(m, front, dir), crateGap(m, back, dir));
    let hop = false;
    if (gap < Infinity && !air) {
      if (person) {
        if (pal.ready >= 0) hop = true;                                          // they pressed hop: join at once
        else if (gap < v * v / (2 * Z.dec) + 6 || (v < 5 && gap < 22)) {
          stopHard();
          // waiting at the wall: count them in, then hold hop (it waits 0.6 s for them); never into a gust. If they
          // don't join, the hop goes alone and jolts the stack, so at most twice per crate, 6 s apart, and only
          // while they are pressing keys (walking into the crate, not sure how to get over); otherwise it just waits
          // for their hop (the level shows them the key)
          const calm = calmFor(m) > 1.2;
          if (!(v < 5 && gap < 22)) S.crateT = Math.min(S.crateT || 0, 0);
          else if (calm || S.crateT < 1) S.crateT = (S.crateT || 0) + dt;
          if (S.crateT > 0.9 && info.partnerIdle < 3) say(S, p, 'Hop with me!', 1.4, 8);
          if (S.crateT > 1.8 && (S.countN || 0) < 2 && info.partnerIdle < 0.5 && calm && !m.teeter && Math.abs(m.lean) < 0.55 && Math.abs(m.leanV) < 1.5) {
            hop = true; S.holdHop = 0.6; S.crateT = -4; S.countN = (S.countN || 0) + 1;
          }
        }
      } else if (v > 130 && gap >= 10 && gap <= 15 && go) hop = true;           // two computers: hop on the run
      else if (gap < v * v / (2 * Z.dec) + 10) {                                // or stop at the wall and hop
        if (v < 5 && gap < 22) hop = true; else stopHard();
      }
    } else if (gap === Infinity) S.crateT = S.countN = 0;                      // (past it; a hop in the air keeps count)
    if (S.holdHop > 0) { S.holdHop -= dt; if (me.grounded && me.ready >= 0) hop = true; else if (!me.grounded) S.holdHop = 0; }

    // ----- with a person: walk when they walk, take the first step after a short wait, don't push alone for long
    if (person) {
      if (go && !theyWalk && !air && !hop) {
        S.lead = info.intro ? 0 : (S.lead || 0) + dt;                         // (not while the room card shows)
        // wait a moment, lean on the tray for a moment (the level then shows them the way), then let go again:
        // pushing alone never moves it and only shakes the stack
        if (info.intro || S.lead < 0.5 || S.lead % 2.6 > 1.4 || Math.abs(m.lean) > 0.4 || info.partnerIdle > 20) go = false;
        if (S.lead > 1.5 && info.partnerIdle < 20) say(S, p, 'Walk with me!', 1.6, 6);
      } else S.lead = theyWalk ? 1 : 0;
      // they walk on into a wobble: stopping alone only adds a strain on the tray, so after a moment go along
      S.refuse = theyWalk && !go && !hard ? (S.refuse || 0) + dt : 0;
      if (S.refuse > 0.6) go = true;
      else if (S.refuse > 0.25) say(S, p, 'Slow down!', 1.2, 10);
      // (one bubble per teeter: the level's own STOP! / STEADY! says the rest)
      if (m.teeter && (theyWalk || (!pal.steady && pal.idleT < Z.afkSave))) say(S, p, 'Hold steady!', 1.2, 3, true);
      else if (S.awnT > 0.8 && pal.duck < 0.5) say(S, p, 'Duck with me!', 1.6, 6);
    } else if (info.intro) go = false;

    // ----- the keys
    if (air) step(dir);                                   // keep going through a hop
    else if (hop) { out.jump = S.holdHop > 0 ? true : 'tap'; step(dir); }
    else if (go) step(dir);
    out.down = duck && !hop && me.grounded;
    // steady: a teetering box, a gust, or stopped with a wobble (only once the tray is nearly still)
    const wantSteady = !go && !hop && !air && v <= Z.steadyMaxV + 10 && !(duck && hits(0, 0, 0)) &&
      (m.teeter || windy || (!(S.awnT > 0) && (Math.abs(m.lean) > 0.15 || Math.abs(m.leanV) > 0.6)));
    if (wantSteady) { out.act = true; out.left = out.right = false; out.down = false; }
    return out;
  }

  cpuBrain('pizza', {
    think,
    // above the name tag (the level lifts tags over the tray)
    bubblePos: p => ({ x: cpuCx(p), y: p.y - 34 }),
  });
})();
