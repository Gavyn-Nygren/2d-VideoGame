/* Pip & Bo - Computer partner: 12-3 Ski Jump. */
'use strict';

/* Every jump names its jumper (st.jumper) and wind crew (st.crew), and the jobs swap every jump, so the brain plays
   whichever job its character has right now. It reads what a person sees: the skier on the in-run and the gold edge,
   the pose needle, the ▼ landing hint, the fans and their wind, the Gust-o-matic's red fan, the cart and its tank.
   - Jumper: it waits at the start bar until the crew is ready (standing at one of the first two fans with its wind
     tank full, or the fan cart driven out of the hut), with a short pause so a person has read the "Swap jobs!"
     banner; a person crew who is slow gets "Run to a fan!" ("Start at the first fan!", "Save the wind for me!", cart:
     "Drive out to me!"), any fan will do after 7 s, and after 12 s it goes anyway. It tucks (▼) the whole in-run, presses jump just
     before the gold edge (a little off on easy, never outside the good window), leans (◀ ▶) to keep the needle near
     the middle (seen after a short reaction: 0.06 s hard, 0.12 normal, 0.18 easy; a slight lean back floats a bit
     farther), leans back a little more to float up to a snowflake ring above it, and presses ▼ once just before touchdown for a telemark.
   - Fan crew: it runs to the first fan before take-off and waits there; in the air it runs to the next fan ahead of
     the jumper and holds the action as the jumper comes over it (a little earlier on hard), letting go once the
     jumper is past. On Night Hill it leaves early for the red fan and starts it well before the gust zone, so the
     gust is blocked. On Fan Cart Cliff it parks the cart past the lip, then drives under the jumper and holds the
     action from take-off.
   - Bubbles (1-player mode only, at most one every few seconds, rarer as they repeat): "Your jump! Go!" to a person
     still at the start bar, "Run to a fan!" / "Blow now!" / "Red fan!" / "Drive under me!" to a person crew ("Let go, then tap!" if the
     fan button is held but nothing blows, "Use the first fan!" if the crew waits at a fan past where the jumper
     landed last time; such a fan doesn't count for the 7 s rule), "Here I go!" (first try only), "Again!" after a
     Fluff, and a cheer after a good jump.
   It can't finish the level alone: distance needs the crew's fans (a jump with no fan push lands short of the green
   line and is tried again, and gold help only makes the fans stronger), and the person's jumps need the person's own
   presses. With an idle person the person's jump never leaves the gate, and the core's 30 s idle stop makes the
   computer wait too. It never cheats with hidden state beyond what is drawn (it reads the jumper's place and speed as
   the in-run and the km/h readout show them). */
(() => {
  const API = () => MODES.skijump.api, K = () => MODES.skijump.CFG;

  // a short bubble for the person, not too often (rarer each time the same words come back)
  function say(S, p, text, gap = 3.5, secs = 1.8) {
    const n = (S.sayN && S.sayN[text]) || 0;
    if (G.time - (S.saidT == null ? -99 : S.saidT) < gap * (1 + Math.floor(n / 4))) return;
    S.saidT = G.time; S.sayN = S.sayN || {}; S.sayN[text] = n + 1;
    cpuSay(p, text, secs);
  }
  const react = info => 0.06 + (1 - info.skill) * 0.18;
  // seconds until the jumper touches the snow (the same sum the level's ▼ hint uses)
  function toLand(st) {
    const j = st.j, h = st.hill, A = API();
    const hgt = A.surf(h, j.x) - j.y, close = j.vy - j.vx * Math.tan(A.slope(h, j.x));
    return close > 1 ? hgt / close : 9;
  }
  // is the crew ready for a take-off? (standing at a fan, or the cart out of the hut)
  // (a person's crew at a far fan, or with a fan still puffed out from blowing early, gets a few more seconds)
  const tooFar = (S, st, f) => S.land && S.land.k === st.k && f.x > S.land.x + 20;
  function crewReady(S, st, waited) {
    const c = st.crewS;
    if (st.cart) return c.x > st.hill.E.x - 10 && Math.abs(c.vx) < 60;
    const f = API().nearFan(st);
    if (!f || Math.abs(c.vx) > 80) return false;
    if (waited > 7 && !tooFar(S, st, f)) return true;
    return st.fans.indexOf(f) <= 1 && f.out <= 0 && f.air > 0.6;
  }

  /* ---------- the jumper ---------- */
  function jumper(S, p, o, st, dt, info, out) {
    const k = K(), j = st.j, h = st.hill, person = !info.partnerCpu;
    if (st.phase === 'gate') {
      out.down = true;   // tuck ready
      S.gateT = (S.gateT || 0) + dt;   // (counted from the end of the intro card)
      const ready = crewReady(S, st, S.gateT), wait = person ? 1.1 : 0.4;
      S.readyT = ready ? (S.readyT || 0) + dt : 0;
      if (person && !ready && S.gateT > 3) {
        const f = !st.cart && API().nearFan(st);
        say(S, p, st.cart ? 'Drive out to me!' : !f ? 'Run to a fan!' : tooFar(S, st, f) ? 'Use the first fan!'
          : S.actT > 0.6 ? 'Let go, then tap!' : f.out > 0 || f.air <= 0.6 ? 'Save the wind for me!' : 'Start at the first fan!', 4);
      }
      if ((S.readyT >= wait + (1 - info.skill) * 0.3 && S.gateT > 0.6) || S.gateT > 12) {
        if (person && !S.toldGo) { S.toldGo = true; if (st.tries === 0) say(S, p, 'Here I go!', 1.5, 1.4); }
        out.jump = 'tap';
      }
      return out;
    }
    if (st.phase === 'inrun') {
      out.down = true;
      if (S.aim == null) {
        // when to press: just before the lip, a little off by skill (always inside the good window)
        const spread = 0.012 + (1 - info.skill) * 0.06;
        S.aim = k.bestT + (Math.random() * 2 - 1) * spread;
      }
      const tte = (h.inTotal - j.s) / Math.max(1, j.v);
      if (!j.pressed && tte <= S.aim) out.jump = 'tap';
      return out;
    }
    if (st.phase !== 'air') return out;
    if (!j.popped) { out.jump = 'tap'; return out; }   // (missed the edge: hop as soon as possible)
    // the pose needle: a slight lean back floats farther; rings ahead steer it up or down
    let target = -0.18;
    // (only up: diving for a low ring costs more distance than the ring gives)
    const r = st.rings.find(q => !q.got && q.x > j.x + 10 && q.x < j.x + 130);
    if (r && (j.y - 8) - r.y > 6) target = -0.4;
    const lag = react(info), seen = cpuLag(S, 'pose', j.pose, lag), before = cpuLag(S, 'pose0', j.pose, lag + 0.05);
    const guess = seen + (seen - before) / 0.05 * lag * 0.8;   // where the needle is now, from how it was moving
    if (guess > target + 0.05) out.left = true; else if (guess < target - 0.05) out.right = true;
    // the telemark: one ▼ press just before touchdown
    const tl = toLand(st);
    if (S.teleAt == null) S.teleAt = 0.22 + (Math.random() - 0.5) * (0.04 + (1 - info.skill) * 0.12);
    if (!S.tele && j.t > 0.25 && tl < S.teleAt) { S.tele = true; out.down = true; }
    else if (S.tele && j.teleAt > 0) out.down = true;   // (holding it is fine: only the first press counts)
    if (person) talkCrew(S, p, o, st, dt);
    return out;
  }
  // the person runs the fans while the computer flies
  function talkCrew(S, p, o, st, dt) {
    const j = st.j, c = st.crewS, gu = st.gust;
    if (st.cart) {
      if (Math.abs(c.x - j.x) < 70 && !o.input.act && st.fans[0].air > 0.2) say(S, p, 'Blow now!', 3);
      else if (j.t > 0.4 && j.x - c.x > 90 && st.fans[0].air > 0.2) say(S, p, 'Drive under me!', 3);
      return;
    }
    if (gu && !gu.blocked && gu.state !== 'done' && j.x > gu.x0 - 200 && j.x < gu.x0) {
      if (Math.abs(c.x - st.fans[gu.fan].x) > 40 || st.fans[gu.fan].pow < 0.1) say(S, p, 'Red fan!', 3);
      return;
    }
    const near = API().nearFan(st);
    if (near && Math.abs(near.x - j.x) < 50 && near.pow < 0.1 && near.out <= 0) { if (S.actT > 0.6) say(S, p, 'Let go, then tap!', 3); else if (!o.input.act) say(S, p, 'Blow now!', 3); }
  }

  /* ---------- the fan crew ---------- */
  // run to x on the catwalk without overshooting (the crew stops quickly but not at once)
  function runTo(out, st, x, dead = 4) {
    const c = st.crewS, k = K(), d = x - c.x, stop = (c.vx * c.vx) / (2 * k.crewAcc * 1.3);
    out.left = out.right = false;
    if (Math.abs(d) <= dead) return true;
    if (Math.sign(c.vx) === Math.sign(d) && stop >= Math.abs(d) - dead) return false;   // coast to a stop
    out.right = d > 0; out.left = d < 0;
    return false;
  }
  function driveTo(out, st, x, dead = 6) {
    const c = st.crewS, k = K(), d = x - c.x, stop = (c.vx * c.vx) / (2 * k.cartAcc * 1.3);
    out.left = out.right = false;
    if (Math.abs(d) <= dead) return true;
    if (Math.sign(c.vx) === Math.sign(d) && stop >= Math.abs(d) - dead) return false;
    out.right = d > 0; out.left = d < 0;
    return false;
  }
  function crew(S, p, o, st, dt, info, out) {
    const j = st.j, h = st.hill, c = st.crewS, person = !info.partnerCpu;
    if (G.introT > K().introLock) return out;
    const flying = st.phase === 'air';
    if (st.phase !== 'gate' && st.phase !== 'inrun' && !flying) return out;
    const lag = react(info), jx = cpuLag(S, 'jx', j.x, lag);
    if (st.cart) {
      // park just past the lip; in the air drive under the jumper and hold the fan
      const tx = flying ? jx + 12 + j.vx * lag : h.E.x + 34;
      driveTo(out, st, Math.max(h.cat0 + 12, Math.min(h.cat1 - 12, tx)));
      if (flying && j.popped && st.fans[0].air > 0) out.act = true;
    } else {
      const fans = st.fans, gu = st.gust;
      let tgt = fans[0];
      if (flying) {
        tgt = fans.find(f => f.x > jx - 30) || fans[fans.length - 1];
        // Night Hill: leave early for the red fan, to start it before the gust zone
        if (gu && !gu.blocked && gu.state !== 'done' && jx > fans[gu.fan].x - 230 && jx < fans[gu.fan].x) tgt = fans[gu.fan];
      }
      runTo(out, st, tgt.x);
      const at = Math.abs(tgt.x - c.x) < 22;
      if (flying && at) {
        const isGust = gu && tgt === fans[gu.fan] && !gu.blocked;
        const lead = isGust ? 135 : 58 + info.skill * 18;
        if (tgt.x - jx < lead && jx - tgt.x < 42 && tgt.out <= 0) out.act = true;
      }
    }
    if (person) talkJumper(S, p, o, st, dt, info);
    return out;
  }
  // the person jumps while the computer runs the fans
  function talkJumper(S, p, o, st, dt, info) {
    if (st.phase === 'gate') { S.gateT = (S.gateT || 0) + dt; if (S.gateT > 5) say(S, p, 'Your jump! Go!', 5); }
  }

  /* ---------- after a jump: a cheer or "Again!" ---------- */
  function after(S, p, o, st, info) {
    if (info.partnerCpu || S.saidAfter) return;
    if (st.phase === 'short' && st.t > 0.6) {
      S.saidAfter = true;
      // a person crew who stood at a fan past where the computer landed: point at the first fan
      const f = st.jumper === p.id && !st.cart && API().nearFan(st);
      if (f && st.j.fanT < 0.15 && tooFar(S, st, f)) say(S, p, 'Use the first fan!', 1.5, 2.2);
      else say(S, p, st.jumper === p.id ? 'Again! Blow as I fly!' : 'Again! I\'ll blow!', 6, 2);
    }
    else if (st.phase === 'judge' && st.t > 0.8 && st.score) {
      S.saidAfter = true;
      const s = st.score;
      say(S, p, s.k ? 'Past the K line!' : s.who === p.id ? 'Thanks for the wind!' : 'Nice jump!', 0, 1.8);
    }
  }

  cpuBrain('skijump', {
    reset(S) { S.jk = null; },
    // the jumper high up by the start bar: the bubble sits to its right, clear of the room pill at the top left
    bubblePos(p) {
      const st = G.mst;
      if (!st || !st.j || p.id !== st.jumper) return { x: cpuCx(p), y: p.y };
      const j = st.j;
      return j.y < 200 ? { x: j.x + 95, y: Math.max(j.y - 40, 150) } : { x: j.x, y: j.y - 44 };
    },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.j || info.intro) return out;
      // fresh per-jump state (a new jump, a retry or the next hill)
      const key = st.k + ':' + st.n + ':' + st.tries;
      if (S.jk !== key) { S.jk = key; S.aim = null; S.tele = false; S.teleAt = null; S.readyT = 0; S.gateT = 0; S.toldGo = false; S.saidAfter = false; cpuLagReset(S, 'pose'); cpuLagReset(S, 'pose0'); cpuLagReset(S, 'jx'); }
      if ((st.phase === 'out' || st.phase === 'short' || st.phase === 'judge') && S.landKey !== key) { S.landKey = key; S.land = { k: st.k, x: st.j.x }; }
      S.actT = o.input.act ? (S.actT || 0) + dt : 0;   // how long the person has held the fan button
      after(S, p, o, st, info);
      if (st.phase === 'tally') return out;
      return p.id === st.jumper ? jumper(S, p, o, st, dt, info, out) : crew(S, p, o, st, dt, info, out);
    },
  });
})();
