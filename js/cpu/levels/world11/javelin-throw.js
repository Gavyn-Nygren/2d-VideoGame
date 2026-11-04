/* Pip & Bo - Computer partner brain for 11-4 Javelin Throw (mode 'javelin'). */
'use strict';

(() => {
  /* Javelin Throw is head-to-head: the computer throws against you, on its own runway, at the same time as you.
     It reads only what the screen shows: its own athlete's place and speed, its power meter (and whether it is the gold
     steady one), the angle needle, and the wind (the flags and the wind pill). It plans each throw like a person:
     - Run: after a moment to react it holds ▶ (easy and normal sometimes settle for a little under full speed). The meter
       swings from "go" and starts each throw at a random point, so normal and hard (most of the time) wait for the right
       moment to start running, so that a top of the meter comes along just where they want to press; easy just goes.
     - Press: it looks at the coming tops of its meter and picks the last one that still lets it aim and let go before
       the line (it knows how far it slides while it aims: the game's own numbers; normal and hard also hold ◀ while
       they aim, which stops them sooner, so they can press later), then presses at that top, a little
       early or late (easy by up to about a fifth of a swing, hard by a few hundredths of a second). If it is suddenly too
       close to the line it presses at once.
     - Aim: it picks an angle for the wind it sees (easy only partly reads the wind and guesses wide), holds throw until
       the needle gets there and lets go, a bit early or late. Near the line it lets go at once to save the throw; easy
       now and then forgets to check and steps over (a foul), hard almost never.
     It never sees the other player's throw ahead of time and has no side bias (both sides run the same code).
     When you walk away it keeps playing long enough to finish a match against nobody (WALK_AWAY s), then stops
     (noIdleStop: its own stop replaces the core's 30 s one; the level pauses itself 40 s after nobody presses anything). */
  const by = (s, e, n, h) => (s <= 0.7 ? e + (n - e) * clamp((s - 0.35) / 0.35, 0, 1) : n + (h - n) * clamp((s - 0.7) / 0.3, 0, 1));
  const SK = s => ({
    react: by(s, 0.6, 0.35, 0.2),        // how long after "go" it starts running (s, plus up to 0.3 more)
    timeErr: by(s, 0.12, 0.065, 0.03),   // spread of its press around the meter's top (s)
    angErr: by(s, 7, 3.5, 1.6),          // spread of its angle choice (degrees)
    relErr: by(s, 0.09, 0.045, 0.02),    // let go this much early or late (s)
    speedMin: by(s, 0.74, 0.92, 1),      // the lowest share of top speed it settles for
    margin: by(s, 2.4, 1.1, 0.45),       // how far behind the line it plans to let go (m)
    windRead: by(s, 0.3, 0.75, 1),       // how much of the wind it takes into account when picking the angle
    forget: by(s, 0.1, 0.03, 0.005),     // chance it forgets to watch the line on a throw (it plans too close and steps over)
    sync: by(s, 0, 0.6, 0.9),            // chance it times its start so a meter top comes where it wants to press
    syncErr: by(s, 0.3, 0.16, 0.08),     // how far off that timing is (s)
    brake: s >= 0.6,                     // holds ◀ while aiming (stops sooner, so it can press closer to the line)
  });
  const WALK_AWAY = 180;
  const JT = () => MODES.javelin.test;
  const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += Math.random(); return (u - 2) / 0.58; }; // about N(0, 1)

  // how far it slides while aiming for `th` seconds from speed v (holding ◀ or not)
  function slide(v, th, brake) {
    const J = JT().JAV, d = J.aimDecel + (brake ? J.brake : 0);
    return v / d < th ? (v * v) / (2 * d) : v * th - 0.5 * d * th * th;
  }
  // how long it takes to run from x to xp, starting at speed v, toward top speed cap
  function runTime(x, v, xp, cap) {
    const J = JT().JAV, dt = 1 / 120; let t = 0;
    while (x < xp && t < 8) { v = v < cap ? Math.min(cap, v + J.runAcc * dt) : v; x += v * dt; t += dt; }
    return t;
  }
  // its place and speed `tau` seconds from now if it keeps running toward top speed `cap` (m/s)
  function ahead(x, v, tau, cap) {
    const J = JT().JAV, dt = 1 / 60;
    for (let t = 0; t < tau; t += dt) { v = v < cap ? Math.min(cap, v + J.runAcc * dt) : v; x += v * dt; }
    return { x, v };
  }
  function plan(st, a, mst, sk) {
    const J = JT().JAV;
    // the angle: what suits the wind it sees, for a strong throw, then its own guess around that
    const vGuess = J.vMin + (J.vMax - J.vMin) * 0.95;
    const best = JT().bestAngle(vGuess, mst.wind * sk.windRead);
    const P = st.p = {
      start: sk.react + Math.random() * 0.3,
      cap: J.runMax * (sk.speedMin + Math.random() * (1 - sk.speedMin)),
      ang: clamp(best + gauss() * sk.angErr, 18, 66),
      err: gauss() * sk.timeErr,
      rel: gauss() * sk.relErr,
      forget: Math.random() < sk.forget,
      said: false,
    };
    // wait for the meter: start running when a top will come just at the spot where it wants to press
    if (Math.random() < sk.sync) {
      const th = Math.max(0, (P.ang - J.ang0) / J.angRate) + Math.max(0, P.rel);
      const xp = -sk.margin - slide(P.cap, th, sk.brake) - 0.3, tRun = runTime(a.x, 0, xp, P.cap);
      const per = JT().period(a.k), mt0 = a.meterT - a.clock;   // (the meter's place at "go")
      const wait = ((0.5 * per - (mt0 + P.start + tRun)) % per + per) % per;
      P.start = Math.max(0.12, P.start + wait + gauss() * sk.syncErr);
    }
  }

  cpuBrain('javelin', {
    noIdleStop: true,
    bubbleHidden: true,
    bubblePos(p) {
      const mst = G.mst; if (!mst || !mst.ath || !mst.cam) return null;
      const t = JT().toePx(p.id); return { x: t.x - 12, y: t.y - 48 };
    },
    reset(st) { st.attId = -1; st.round = -1; },
    think(st, p, o, dt, info) {
      const out = {}, M = G.match, mst = info.mst;
      if (!M || !mst || !mst.ath || M.phase !== 'live') return out;
      if (!info.partnerCpu && info.partnerIdle > WALK_AWAY) return out;
      const k = p.id, a = mst.ath[k], J = JT().JAV, sk = SK(info.skill);
      if (mst.attId !== st.attId || M.round !== st.round) { st.attId = mst.attId; st.round = M.round; plan(st, a, mst, sk); st.saidEnd = false; }
      const P = st.p;
      // a word after its own throw (1-player mode only; cpuSay checks)
      if (!st.saidEnd && a.done) {
        st.saidEnd = true;
        const mk = mst.marks[k][mst.att];
        if (mk && mk.foul && mk.why === 'Foul!') cpuSay(p, 'Oops! Over the line!');
        else if (mk && !mk.foul && mk.d >= 82) cpuSay(p, 'What a throw!');
      }
      if (mst.aphase !== 'go') return out;
      if (a.phase === 'ready' || a.phase === 'run') {
        if (a.clock < P.start) return out;
        out.right = a.v < P.cap - 0.05 || a.v < 0.5;
        const th = Math.max(0, (P.ang - J.ang0) / J.angRate) + Math.max(0, P.rel), margin = P.forget ? -0.8 : sk.margin;
        const brk = sk.brake && !P.forget, sl = v => slide(v, th, brk);
        // too close already: press now (unless it forgot to look this time)
        if (!P.forget && a.x + sl(a.v) > -0.2) { out.act = 'tap'; return out; }
        if (!a.running) return out;
        // the coming tops of its meter: the last one that still lets it let go before the line
        const per = JT().period(k), mt = a.meterT, next = (Math.floor(mt / per - 0.5) + 1.5) * per;
        let pick = null;
        for (let n = 0; n < 6; n++) {
          const top = next + n * per, tau = top - mt;
          if (tau > 4) break;
          const f = ahead(a.x, a.v, tau, P.cap);
          if (f.x + sl(f.v) <= -margin) pick = top; else break;
        }
        // the top it is in the middle of right now also counts (when it is inside its own timing)
        const prev = next - per;
        if (pick === null && mt - prev < 0.15 && a.x + sl(a.v) <= -margin) pick = prev;
        if (pick !== null && mt >= pick + P.err) out.act = 'tap';
        if (pick === null && a.x + sl(a.v) > -margin * 0.5) out.act = 'tap'; // no good top left: go now
        return out;
      }
      if (a.phase === 'aim') {
        const want = P.ang + P.rel * J.angRate;
        let hold = a.ang < want;
        if (!P.forget && a.x + a.v * 0.06 > -0.05) hold = false; // the line: let go now
        if (a.pt < 0.02) hold = true; // (the press itself)
        out.act = hold;
        // normal and hard dig in while they aim (hold ◀), so they stop before the line
        if (sk.brake && !P.forget) out.left = a.x + slide(a.v, Math.max(0, (want - a.ang) / J.angRate) + 0.05, false) > -sk.margin;
        return out;
      }
      return out;
    },
  });
})();
