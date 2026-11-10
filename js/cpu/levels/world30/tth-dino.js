/* Pip & Bo - Computer partner: 30-1 The Time Thief, era 'dino' (Dinosaur Asteroid, 66 million years ago). */
'use strict';

/* The plan (a helpful teammate at full skill; the course is one line of ground, so no path finding is needed):
   - The job comes from the egg: whoever holds it is the CARRIER, the other one is the CLEARER. The egg changes hands
     at every ledge and pit (a toss) and at each flag, so the computer plays whichever job it has right now and never
     fights over one: if the person tosses it the egg, it carries; if the person keeps it, it clears.
   - CLEARER: runs ahead to the first thing in its way (never more than TTHDINO_BRAIN.ahead px in front of the
     carrier). A boulder, log, meteor rock or napping dino: stands next to it and taps the action (4 taps a second).
     A ledge or a pit: jumps it and waits just past the edge for the toss. A vine bridge: stands at the post and holds
     the action until the carrier is across (the bridge ties itself then), then follows. When a meteor rock lands
     between it and the carrier, it goes back and smashes the rock from its own side.
   - CARRIER: walks to the thing in the way and waits beside it (out of the clearer's way). At a ledge or a pit it
     looks at the partner and tosses the egg once they stand on the other side, then jumps after it. At a vine bridge
     it waits at the rim until the bridge is tight and walks across.
   - The Thief's dive: the carrier ducks (down) for the last half second of his aim; the clearer, when it is within
     about 330 px, runs to the carrier and whacks the claw as it comes down. Meteors: seen TTHDINO_BRAIN.react s late,
     then it walks out of the ring (the whole row in a shower) to the nearer safe side, and never walks into a ring.
   - A loose egg: the nearer one walks into it (in 1-player mode the computer lets the person have 1.5 s first when
     the person is nearer).
   - It can never clear alone and does not try: boulders need a free pair of hands, the egg needs carrying, flags and
     the nest need both players. A person who is away (10 s without a press) is waited for (the core brain does that).
   - TAKING THE JOB THE PERSON LEAVES (1-player only): when it carries the egg and has waited TTHDINO_BRAIN.takeover s
     at something the person should open (smash, jump first, hold the vine) with the person close by, it says so,
     tosses them the egg and does the clearing itself. Not again for 14 s, so the egg never ping-pongs (but
     at the same thing, when the egg came straight back before the job was done, after TTHDINO_BRAIN.retake s). The same when
     the person has hopped over a log (or a napping dino, a rock) and waits beyond it: "Come back, please!", then the
     egg is tossed over to them and the computer smashes the thing.
   - Talk (1-player only, short): asks for a smash / a jump / the vine, "Toss it to me!", "I'll hold the bridge. Go!",
     "Duck!", "Grab the egg!", "This way!".
   It reads only what a person can see: the course, the rings, the Thief's pose and claw, the egg, the partner. */
const TTHDINO_BRAIN = { react: 0.15, tap: 0.25, ahead: 400, takeover: 7, retake: 4.5, again: 14, duck: 0.5, whackNear: 330, tossWait: 0.25, jumpHold: 0.45 };

TTH_BRAINS.dino = {
  reset(b) { b.jumpHold = 0; b.jumpRest = 0; b.creepT = 0; b.stall = 0; b.stallSig = ''; b.tookT = -99; b.tookAt = null; b.tossT = 0; b.looseT = 0; b.waitT = 0; },
  back(b) { b.stall = 0; b.tossT = 0; b.looseT = 0; b.waitT = 0; },
  think(b, p, o, dt, info, S) {
    const ph = S.ph;
    if (!ph || !ph.c || !p.alive || !ph.started || ph.end) return {};
    const K = TTHDINO, R = TTHDINO_BRAIN, cam = S.cam, out = {};
    // (brains run between ticks, when players are on SCREEN: P and O are world-coord copies for the course maths)
    const wp = q => ({ id: q.id, x: q.x + cam.x, y: q.y + cam.y, w: q.w, h: q.h, vx: q.vx, vy: q.vy, grounded: q.grounded });
    const P = wp(p), O = wp(o), cx = cpuCx(P), ocx = cpuCx(O), feet = cpuFeet(P), ofeet = cpuFeet(O), hw = p.w / 2;
    const me = ph.P[p.id], e = ph.egg, hid = tthDinoHolder(ph), carry = hid === p.id, solo = !info.partnerCpu, th = ph.th;
    const say = (k, txt, again) => tthBrainSay(b, p, k, txt, again);
    // a jump is a fresh press held for a while, then let go for a moment (so the next one is a fresh press again)
    if (b.jumpHold > 0) { b.jumpHold -= dt; out.jump = true; if (b.jumpHold <= 0) b.jumpRest = 0.16; }
    else if (b.jumpRest > 0) b.jumpRest -= dt;
    const hop = () => { if (p.grounded && b.jumpHold <= 0 && !(b.jumpRest > 0)) { out.jump = true; b.jumpHold = R.jumpHold; } };
    const tap = key => tthBrainTap(b, key, R.tap);

    // ---- meteor rings (seen a moment late): the rows of ground that are about to be hit ----
    const rings = [], rows = [];
    for (const m of ph.mets) if (m.state === 'warn' && m.t >= R.react && Math.abs(m.gy - feet) < 120) rings.push([m.x - m.r - 16, m.x + m.r + 16, m.warn - m.t]);
    rings.sort((a, c) => a[0] - c[0]);
    for (const r of rings) { const l = rows[rows.length - 1]; if (l && r[0] <= l[1] + 26) l[1] = Math.max(l[1], r[1]); else rows.push([r[0], r[1]]); }
    // somewhere I can walk to from here: no wall, pit or fire on the way
    const walkable = x => {
      if (x < ph.fire.x + 70) return false;
      const d = Math.sign(x - cx);
      for (let q = cx; d > 0 ? q <= x + hw : q >= x - hw; q += d * 8) if (Math.abs(tthDinoG(ph, q) - feet) > 30) return false;
      return true;
    };

    // ---- walking: jump the pits and ledges on the way when my hands are free, stop at them with the egg ----
    const travel = (x, dead = 4) => {
      const d = Math.sign(x - cx);
      if (!d) return true;
      const lead = cx + d * hw;
      for (const g of ph.pits) {
        if (g.taut) continue;                                   // a tight bridge is ground
        const rim = d > 0 ? g.x0 : g.x1, far = d > 0 ? g.x1 : g.x0;
        if ((rim - lead) * d < -hw - 2 || (rim - lead) * d > 200 || (x - rim) * d <= 0) continue;   // not on my way
        if (g.stone) {   // gold help put a stepping stone in the middle: two small hops, even with the egg
          const m = (g.x0 + g.x1) / 2, r2 = d > 0 ? m + 24 : m - 24;
          out.left = d < 0; out.right = d > 0;
          if (((cx - rim) * d >= -8 && (cx - rim) * d < 6) || ((cx - r2) * d >= -8 && (cx - r2) * d < 6)) hop();
          if ((cx - far) * d < 6) return false;
          break;
        }
        if (carry || g.kind === 'vine') { x = rim - d * (hw + 6); break; }
        // a free jump: run at it and take off at the very edge (once the centre is over the rim's last few px)
        out.left = d < 0; out.right = d > 0;
        if ((cx - rim) * d >= -8 && feet <= g.base + 8) hop();
        if ((cx - far) * d < 6) return false;
        break;
      }
      // a step up right ahead that I want to get over: jump (free hands only; the egg is too heavy)
      if (!carry && p.grounded) {
        for (let q = 6; q <= 40; q += 6) {
          const gy = tthDinoG(ph, lead + d * q);
          if (gy < feet - 16) { if (feet - gy <= 100 && (x - (lead + d * q)) * d > 6) { hop(); out.left = d < 0; out.right = d > 0; return false; } break; }
        }
      }
      // never walk into a ring
      if (!rows.some(r => cx > r[0] && cx < r[1])) for (const r of rows) if ((d > 0 ? r[0] - lead : lead - r[1]) > -2 && (d > 0 ? r[0] - lead : lead - r[1]) < 26 && (x - (d > 0 ? r[0] : r[1])) * d > 0) return false;
      return cpuSeek(out, p, x - cam.x, dead);
    };
    // stand anywhere in [a, c] (no fiddling about for an exact spot); -> true once there
    const park = (a, c) => {
      if (cx >= a && cx <= c) return Math.abs(p.vx) < 60;
      travel(cx < a ? Math.min(a + 14, (a + c) / 2) : Math.max(c - 14, (a + c) / 2), 6);
      return false;
    };
    // the last steps back toward an edge behind me: small careful steps (a tap, a look, a tap)
    const creep = x => {
      const d = Math.sign(x - cx);
      if (Math.abs(x - cx) < 8) return true;
      if ((b.creepT = (b.creepT || 0) + dt) % 0.4 < 0.11) { out.left = d < 0; out.right = d > 0; }
      return false;
    };

    // in the air over a pit: the jump is under way, see it through
    if (!p.grounded && tthDinoPitAt(ph, cx, 20) && Math.abs(p.vx) > 40) { out.left = p.vx < 0; out.right = p.vx > 0; return out; }

    // ---- out of a ring first ----
    const row = rows.find(r => cx > r[0] && cx < r[1]);
    if (row && !(me.post && ph.P[o.id].onVine)) {
      // which way out? One I can walk, and where I am out of every ring on the way before it lands (a shower lands
      // one by one, from the left: mostly it is "run on, ahead of the booms")
      const L = row[0] - 8, Rr = row[1] + 8, okL = walkable(L), okR = walkable(Rr), v = (carry ? K.carryV : PHYS.maxRun) * 0.92;
      const inTime = d => rings.every(r => r[1] < row[0] || r[0] > row[1] || (d > 0 ? r[1] < cx || (r[1] - cx) / v < r[2] - 0.05 : r[0] > cx || (cx - r[0]) / v < r[2] - 0.05));
      const tL = okL && inTime(-1), tR = okR && inTime(1);
      const goR = tR && tL ? Rr - cx <= cx - L + 40 : tR ? true : tL ? false : okR && (!okL || Rr - cx <= cx - L);
      if (okL || okR) { cpuSteer(out, p, (goR ? Rr : L) - cam.x, 2); return out; }
    }

    // ---- the Thief's dive ----
    const aiming = th.mode === 'aim' && th.t >= R.react, diving = th.mode === 'dive';
    if (carry && p.grounded && (diving || (th.mode === 'aim' && th.t >= th.aim - R.duck))) return { down: true };
    const gate = ph.gate, obs = ph.c.obs, gi = gate ? obs.indexOf(gate) : obs.length;
    const past = (q, x, f) => tthDinoPast(q, x, f);
    let mine = null;
    for (let i = Math.max(0, gi); i < obs.length; i++) if (!obs[i].gone && !past(obs[i], cx, feet)) { mine = obs[i]; break; }
    const iPast = !!gate && mine !== gate, oPast = !!gate && past(gate, ocx, ofeet);
    if (!carry && hid === o.id && (aiming || diving)) {
      if (Math.abs(ocx - cx) < R.whackNear) {
        const cl = tthThiefPts(S.thief).claw;
        let tx = ocx + 44;
        if (iPast && !oPast) tx = Math.max(tx, (gate.kind === 'ledge' ? gate.x0 : gate.x1) + hw + 8);   // stay on my side of the edge
        else if (!iPast && oPast) tx = Math.min(tx, gate.x0 - hw - 8);
        travel(tx, 10);
        if ((diving || th.t >= K.dive.pre + R.react) && Math.abs(cx - cl.x) < K.dive.reach - 8 && tap('whack')) out.act = 'tap';
        return out;
      }
      if (solo) say('duck', 'Duck!', 6);
    }

    // ---- a loose egg: the nearer one walks into it ----
    if (e.state === 'loose') {
      b.looseT += dt;
      const nearer = Math.abs(cx - e.x) < Math.abs(ocx - e.x) - (p.id ? 0.5 : -0.5);
      if (nearer || (solo && b.looseT > 1.5) || b.looseT > 4) travel(e.x, 3);
      else if (solo && b.looseT > 0.8) say('grab', 'Grab the egg!', 8);
      return out;
    }
    b.looseT = 0;
    if (e.state !== 'held') return out;   // (in the air: wait for the catch)

    // ---- where the stretch ends: the flag (both must be there) or the nest ----
    const flag = ph.c.flags[ph.k] && !ph.c.flags[ph.k].got ? ph.c.flags[ph.k] : null, nest = ph.c.nest;
    const openRoad = () => {
      if (flag) return travel(flag.x + (carry ? 6 : 30), 8);
      return carry ? travel(nest.x - 50, 10) : park(nest.x - 190, nest.x - 110);   // (the carrier stops at the rim: the egg hops in)
    };
    if (mine && flag && mine.x0 > flag.x) mine = null;   // the flag comes first
    // (a meteor rock landed between us, or I hopped over a log the carrier can't pass: go back and smash it from my side)
    const behind = !carry && iPast && !oPast && tthDinoBlocker(gate);
    if (behind) mine = gate;
    const blocker = mine && tthDinoBlocker(mine), sig = mine ? mine.x0 + ':' + mine.hits + ':' + (mine.held ? 1 : 0) + ':' + (oPast ? 1 : 0) : '';
    if (sig !== b.stallSig) { b.stallSig = sig; b.stall = 0; }

    /* ================= CARRIER ================= */
    if (carry) {
      if (!mine) { openRoad(); if (solo && Math.abs(ocx - cx) > 300 && ocx < cx) say('way', 'This way!', 10); return out; }
      let at = false, ask = '';
      if (blocker) { at = park(mine.x0 - 124, mine.x0 - 46); ask = oPast ? 'Come back, please!' : mine.kind === 'nap' ? 'Shoo it away, please!' : 'Smash it, please!'; }
      else if (mine.kind === 'vine') {
        if (mine.taut && (mine.tied || mine.pull >= 0.98 || cx > mine.x0)) { travel(mine.x1 + 40, 8); return out; }
        at = park(mine.x0 - 96, mine.x0 - 18); ask = 'Hold the vine at the post!';
      } else {   // a ledge or a pit: toss the egg to the partner on the other side
        if (mine.stone) { travel(mine.x1 + 30, 6); return out; }   // (the gold stepping stone: just walk across)
        const ledge = mine.kind === 'ledge', dx = ocx - cx, there = past(mine, ocx, ofeet) && o.grounded;
        const inRange = Math.abs(dx) <= K.toss.range - 8 && Math.abs(ofeet - feet) <= K.toss.up - 6;
        ask = ledge ? 'Jump up first!' : 'Jump across first!';
        if (there && inRange && p.grounded && Math.abs(p.vx) < 60 && o.stun <= 0 && me.lock <= 0) {
          b.tossT += dt;
          if (Math.abs(dx) > 34 && Math.sign(dx) !== p.face) { out.left = dx < 0; out.right = dx > 0; }   // look at them
          else if (b.tossT >= R.tossWait && tap('toss')) out.act = 'tap';
          return out;
        }
        b.tossT = 0;
        // wait a little back from the edge; step closer when the partner stands too far on the other side
        if (there && !inRange) { at = travel(mine.x0 - (ledge ? 18 : 30), 5); if (solo && at) say('near', 'Come closer, please!', 8); }
        else at = ledge ? park(mine.x0 - 110, mine.x0 - 16) : park(mine.x0 - 86, mine.x0 - 30);
      }
      // the person leaves the clearing to me: ask, then toss them the egg and do it myself
      // (also when the person has jumped over a log / a napping dino / a rock and waits on the far side: toss it over)
      if (solo && at && (!oPast || blocker) && !mine.held) {
        b.stall += dt;
        if (b.stall > 3) say('ask', ask, 9);
        const dx = ocx - cx, inRange = Math.abs(dx) <= K.toss.range - 10 && Math.abs(ofeet - feet) <= 60 && o.grounded && o.stun <= 0;
        const same = b.tookAt === mine.x0;   // (the egg came straight back before I was done here: offer again sooner)
        if (b.stall > (same ? R.retake : R.takeover) && (same || G.time - b.tookT > R.again) && me.lock <= 0) {
          if (!inRange) say('come', 'Come over here!', 8);
          else if (Math.abs(dx) > 34 && Math.sign(dx) !== p.face) { out.left = dx < 0; out.right = dx > 0; }
          else { out.act = 'tap'; b.tookT = G.time; b.tookAt = mine.x0; b.stall = 0; say('took', 'Catch! I\'ll do it.', 6); }
        }
      }
      return out;
    }

    /* ================= CLEARER ================= */
    // past the edge the carrier still stands at: wait for the toss, close to the edge
    if (iPast && !oPast && !behind) {
      const edge = gate.kind === 'ledge' ? gate.x0 : gate.x1;
      const at = cx >= edge + 12 && cx <= edge + 64;
      if (cx < edge + 12) travel(edge + 36, 8); else if (!at) creep(edge + 44);   // (back toward the edge: carefully)
      if (solo && at && Math.abs(ocx - gate.x0) < 120) { b.waitT += dt; if (b.waitT > 2.5) say('toss', gate.kind === 'ledge' ? 'Toss it up to me!' : 'Toss it over to me!', 9); } else b.waitT = 0;
      return out;
    }
    b.waitT = 0;
    // don't run off: the carrier is slow
    const tooFar = x => x > cx && cx - ocx > R.ahead;
    if (!mine) { if (!tooFar(flag ? flag.x : nest.x)) openRoad(); return out; }
    if (tooFar(mine.x0)) { if (solo) say('way', 'This way!', 10); return out; }
    // (a jump over a pit lands 150 px further on: not while the carrier is that far behind, or the leash says no)
    if (tthDinoPit(mine) && cx - ocx > R.ahead - 110 && cx > mine.x0 - 90 && cx < mine.x0 + 4) return out;
    if (blocker) {
      const side = cx <= (mine.x0 + mine.x1) / 2 ? -1 : 1, spot = side < 0 ? mine.x0 - hw - 5 : mine.x1 + hw + 5;
      const d = Math.max(mine.x0 - (P.x + P.w), P.x - mine.x1, 0);
      if (d > K.hit.reach - 10) travel(spot, 5);
      else if (feet >= mine.top - 12 && feet <= mine.base + 40 && tap('hit')) out.act = 'tap';
      return out;
    }
    if (mine.kind === 'vine' && !mine.tied) {
      const post = mine.x0 - K.postX;
      if (Math.abs(cx - post) > K.postR - 6 || !p.grounded) { park(post - K.postR + 10, post + K.postR - 10); return out; }
      out.act = true;   // pull it tight and hold on until the carrier is across
      if (solo && Math.abs(ocx - mine.x0) < 260) say('hold', 'I\'ll hold the bridge. Go!', 8);
      return out;
    }
    // a ledge, a pit or a tied bridge: over it
    travel(mine.kind === 'ledge' ? mine.x0 + 36 : mine.x1 + 36, 8);
    return out;
  },
};
