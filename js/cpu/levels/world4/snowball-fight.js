/* Pip & Bo - Computer partner: snowball fight. */
'use strict';

(() => {
  /* Snowball Fight is head-to-head: the computer plays against you. It sees you (and your snowballs) a moment late.
     - Where to stand: every so often it scores the spots it could stand on (floor, hill, planks, fort tops) by how quickly
       it gets there, whether it would have a throw that reaches you from there (it flies the snowball with the game's own
       numbers, the same line the game draws while you aim), not too close, and a little better behind its own fort wall
       (until the sun melts it). cpuNav walks it there.
     - Throwing: with a snowball in hand it checks the throws it would have facing you from where it stands: the quick
       tap first, then aimed throws from -5° to 75°. When one reaches you it stops, turns to you if needed, and taps, or
       holds throw, tilts the aim with ▲ / ▼ to that angle and lets go when the dotted line reaches you. Tap throws fly
       over someone ducking. With no throw it keeps walking. It never starts a throw while "Catch!" is up for it (that
       press would open its mittens instead).
     - Dodging and catching: for each snowball coming its way it checks what helps: ducking (quick throws fly over),
       stepping left or right, or a hop; or it may catch one thrown at its front (the game's "Catch!" moment), with or
       without a snowball in hand.
     - Empty hands: it grabs one from its snowball pile when that is close, else ducks to pack one when nothing is
       coming. MEGA snowball: it fetches it when it is nearer to it than to you, and throws it the same way.
     Skill: easy sees late, stops now and then, misjudges where you stand, often holds a throw too long (a weak lob that
     flies anywhere), dodges and catches rarely, sometimes throws with no real shot and forgets
     to pack snow. Hard sees
     about as quickly as a sharp person, leads its throws where you are walking, rarely fumbles, dodges more than a third
     of the snowballs and catches some. */
  // a number for each skill: easy, normal, hard (in between for other skills)
  const by = (s, e, n, h) => (s <= 0.7 ? e + (n - e) * clamp((s - 0.35) / 0.35, 0, 1) : n + (h - n) * clamp((s - 0.7) / 0.3, 0, 1));
  const SK = s => ({
    lag: by(s, 0.4, 0.28, 0.2),     // how late it sees you (s)
    see: by(s, 0.45, 0.3, 0.25),    // how long a snowball has to be in the air before it reacts to it (s)
    dodge: by(s, 0.05, 0.2, 0.38),  // chance it tries to get out of the way of a snowball it sees coming
    catchP: by(s, 0.08, 0.25, 0.4), // chance it tries to catch one instead (thrown at its front)
    lead: s > 0.5,                  // aims where you're walking
    relErr: by(s, 0.2, 0.1, 0.03),  // aimed throw let go up to this late (s)
    wild: by(s, 0.6, 0.25, 0),      // throws without a real shot this often per second (when you're near)
    pack: by(s, 0.5, 0.8, 1),       // chance it ducks to pack snow when its hands are empty
    wait: by(s, 0.45, 0.28, 0.1),   // pause before throwing once it has a shot (on top of seeing late)
    mega: 0.4 + 0.6 * s,            // chance it goes for the MEGA snowball
    aimErr: by(s, 45, 28, 12),      // how far off (px) it may judge where you stand, new for every throw
    spotEvery: by(s, 1.4, 0.7, 0.7),// how often it thinks again about where to stand (s, plus up to half more)
    dawdle: by(s, 0.5, 0.2, 0),     // a short stop (no walking, no new throw) this often per second
    fumble: by(s, 0.5, 0.15, 0.05), // chance a throw goes wrong: let go at whatever angle it has after a moment
  });
  const SN = () => MODES.snow.K;
  const radius = (mst, k, mega) => (mega ? SN().rMega : (SN().r + SN().cbR * mst.b[k]) * (mst.twist === 'giant' ? SN().giantR : 1));
  // what it sees of a player: the box snowballs test against (ducking makes it shorter) and how it is moving
  function look(q) {
    const b = MODES.snow.box(q);
    return { x: b.x, y: b.y, w: b.w, h: b.h, vx: q.vx, alive: q.alive, cx: q.x + q.w / 2, feet: q.y + q.h, face: q.face };
  }
  /* fly a throw from `from` (a player or a pretend one standing somewhere) with the game's own launch and gravity:
     does it reach the target box (moved along by its speed when `lead`) before a wall, the ground or a fort brick? */
  function flight(mst, from, ang, mega, tg, lead, stride, pad = 0) {
    const K = SN(), l = MODES.snow.launch(from, ang), r = radius(mst, from.id, mega), wind = MODES.snow.wind();
    let x = l.x, y = l.y, vx = l.vx, vy = l.vy, best = 1e9;
    const dt = DT * stride, n = Math.ceil(2.2 / dt);
    for (let i = 1; i <= n; i++) {
      vy += K.ballG * dt; vx += wind * dt; x += vx * dt; y += vy * dt;
      if (y > H + 20 || x < -20 || x > W + 20) break;
      const ch = tile(Math.floor(x / T), Math.floor(y / T));
      if (ch === '#' || (ch === 'P' && !mega && Math.floor(x / T) < COLS / 2 !== (from.id === 0))) break;
      const t = i * dt, dx = lead ? clamp(tg.vx * Math.min(t, 0.7), -160, 160) : 0;
      const box = { x: tg.x + dx - pad, y: tg.y - pad, w: tg.w + 2 * pad, h: tg.h + pad };
      if (MODES.snow.circRect(x, y, r, box)) return { hit: true, t };
      best = Math.min(best, Math.abs(x - (box.x + box.w / 2)) + Math.abs(y - (box.y + box.h / 2)));
    }
    return { hit: false, miss: best };
  }
  // a pretend player standing at (cx, feet) facing dir, for planning throws from somewhere else
  const pretend = (p, cx, feet, dir) => ({ id: p.id, x: cx - PW / 2, y: feet - PH, w: PW, h: PH, face: dir, vx: 0 });
  // the best throw from `from`: a tap if it hits, else the aimed throw that hits soonest, counting the time to tilt
  // the aim there from `ang0` (null when nothing reaches). shot.ang null = a tap.
  // (fine steps for a real throw: a flat throw lands far apart for every degree; coarse ones, with a looser target,
  // when it only rates where to stand)
  const ANGS = [], ANGS_COARSE = [-5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];
  for (let a = -10; a <= 75; a += 1.5) ANGS.push(a);
  function bestShot(mst, from, mega, tg, lead, stride, ang0, rough) {
    const pad = rough ? 6 : 0;
    const tap = flight(mst, from, null, mega, tg, lead, stride, pad);
    if (tap.hit) return { ang: null, t: tap.t, cost: 0 };
    let best = null;
    for (const a of rough ? ANGS_COARSE : ANGS) {
      const f = flight(mst, from, a, mega, tg, lead, stride, pad);
      if (!f.hit) continue;
      const cost = SN().tapT + Math.abs(a - (ang0 == null ? SN().aimStart : ang0)) / SN().aimRate + f.t * 0.5;
      if (!best || cost < best.cost) best = { ang: a, t: f.t, cost };
    }
    return best;
  }
  // every tile a player can stand in (floor, hill steps, planks, fort tops), rebuilt when a brick breaks
  function spots(st) {
    let key = '';
    for (const f of G.mst.forts) key += tile(f.tx, f.ty) === 'P' ? '1' : '0';
    if (st.spots && st.spotsKey === key) return st.spots;
    const list = [];
    for (let ty = 1; ty < ROWS - 1; ty++) for (let tx = 1; tx < COLS - 1; tx++) {
      const ch = tile(tx, ty), below = tile(tx, ty + 1);
      if (ch !== '#' && ch !== 'P' && (below === '#' || below === 'P' || below === '=')) list.push({ cx: tx * T + T / 2, feet: (ty + 1) * T, tx, ty });
    }
    st.spotsKey = key;
    return (st.spots = list);
  }
  // is (cx) behind its own fort wall, between the wall and its snowball pile, with the wall still standing?
  function behindWall(mst, k, cx) {
    const front = mst.forts.filter(f => f.side === k && tile(f.tx, f.ty) === 'P');
    if (front.length < 2) return false;
    const near = k === 0 ? Math.min(...front.map(f => f.tx)) * T : (Math.max(...front.map(f => f.tx)) + 1) * T;
    return k === 0 ? cx < near && cx > near - 70 : cx > near && cx < near + 70;
  }
  // pick where to stand: quick to reach, a throw that reaches you from there, not too close, a little better behind its fort wall
  function pickSpot(st, p, ov, mst) {
    const pcx = cpuCx(p), pf = cpuFeet(p), list = spots(st);
    const mega = mst.pl[p.id].mega;
    let best = null;
    for (const sp of list) {
      const dx = ov.cx - sp.cx, dist = Math.abs(dx);
      if (dist < 40) continue;
      let sc = Math.abs(sp.cx - pcx) / 220 + Math.max(0, pf - sp.feet) / 200 + Math.max(0, sp.feet - pf) / 400;
      if (!mst.melt && sp.feet === SN().floorY && behindWall(mst, p.id, sp.cx)) sc -= 0.4;
      if (dist < 110) sc += 1.2; else if (dist > 330) sc += (dist - 330) / 200;
      if (sc > (best ? best.sc : 1e9)) continue;
      if (st.bad && G.time < st.bad.until && Math.abs(st.bad.cx - sp.cx) < 20 && st.bad.feet === sp.feet) continue;
      const shot = bestShot(mst, pretend(p, sp.cx, sp.feet, Math.sign(dx)), mega, ov, false, 3, mst.pl[p.id].ang, true);
      if (!shot) sc += 3; else sc += shot.cost * 0.3;
      if (!best || sc < best.sc) best = { cx: sp.cx, feet: sp.feet, sc };
    }
    return best;
  }
  // a snowball flying toward the computer: when would it hit each way of dodging (Infinity = misses)?
  function threat(b, me, ways, wind) {
    let x = b.x, y = b.y, vx = b.vx, vy = b.vy;
    const res = {}, dt = DT * 2;
    for (const w of ways) res[w.k] = Infinity;
    for (let i = 1; i <= 50; i++) {
      vy += SN().ballG * dt; if (b.k >= 0) vx += wind * dt; x += vx * dt; y += vy * dt;
      if (y > H + 20 || x < -20 || x > W + 20) break;
      const ch = tile(Math.floor(x / T), Math.floor(y / T));
      if (ch === '#' || (ch === 'P' && !b.mega && Math.floor(x / T) < COLS / 2 !== (b.k === 0))) break;
      const t = i * dt;
      for (const w of ways) {
        if (res[w.k] < Infinity) continue;
        const bx = w.box(t);
        if (MODES.snow.circRect(x, y, b.r, bx)) res[w.k] = t;
      }
    }
    return res;
  }

  cpuBrain('snow', {
    noIdleStop: true, // its own idle stop is in think()
    reset(st) { st.round = -1; },
    think(st, p, o, dt, info) {
      const out = {}, M = G.match, mst = info.mst;
      if (!M || !mst || !mst.pl) return out;
      const sk = SK(info.skill), s = mst.pl[p.id], K = SN();
      if (M.round !== st.round || M.phase !== 'live') {
        st.hold = null; st.spot = null; st.spotT = 0; st.dodge = null; st.seen = new WeakMap(); st.waitT = 0; st.megaFor = null;
        st.dawT = 0; st.aimOff = 0; st.plan = null; st.lostT = 0;
        st._lag_o = null; // (what it saw of you last round)
        if (M.phase === 'live') st.round = M.round; else return out;
      }
      if (!p.alive || s.frozen) return out;
      // the person walked away: it keeps playing long enough to finish a match against nobody, then waits
      if (!info.partnerCpu && info.partnerIdle > 90) return out;
      const ov = cpuLag(st, 'o', look(o), sk.lag);
      const pcx = cpuCx(p), dir = ov.cx >= pcx ? 1 : -1, wind = MODES.snow.wind();
      const solidFloor = p.grounded && p.tileGround && !p.onOneWay && !p.onPartner;
      const hasBall = s.hand > 0 || s.mega;
      // where it thinks you are when it aims (a little off, more on easy)
      const tg = st.aimOff ? Object.assign({}, ov, { x: ov.x + st.aimOff }) : ov;
      // easy and normal stop for a moment now and then
      if (st.dawT > 0) st.dawT -= dt;
      else if (cpuChance(sk.dawdle, dt)) st.dawT = 0.3 + Math.random() * 0.5;

      /* ---- dodge or catch: snowballs it has seen coming ---- */
      if (st.dodge && (G.time > st.dodge.until || st.dodge.b.dead)) st.dodge = null;
      if (!st.dodge && p.stun <= 0) {
        const me = { x: p.x, y: p.y, w: p.w, h: p.h }, gy = p.grounded;
        const canDuck = solidFloor && s.hold < 0;
        const ways = [{ k: 'stay', box: () => me }];
        if (canDuck) ways.push({ k: 'duck', box: () => ({ x: me.x, y: me.y + K.duckCut, w: me.w, h: me.h - K.duckCut }) });
        ways.push({ k: 'left', box: t => ({ x: me.x - Math.max(0, 220 * t - 10), y: me.y, w: me.w, h: me.h }) });
        ways.push({ k: 'right', box: t => ({ x: me.x + Math.max(0, 220 * t - 10), y: me.y, w: me.w, h: me.h }) });
        if (gy) ways.push({ k: 'jump', box: t => ({ x: me.x, y: me.y - Math.max(0, 660 * t - 1000 * t * t), w: me.w, h: me.h }) });
        for (const b of mst.balls) {
          if (b.k === p.id || b.dead || b.age < sk.see) continue;
          const r = threat(b, me, ways, wind);
          if (!(r.stay < 0.7)) continue;
          if (!st.seen.has(b)) st.seen.set(b, Math.random() < sk.dodge + sk.catchP ? (Math.random() < sk.catchP / (sk.dodge + sk.catchP) ? 'catch' : 'dodge') : 'no');
          const plan = st.seen.get(b);
          if (plan === 'no') continue;
          // catch: the game's "Catch!" moment for this snowball (it is about to hit its front), mittens ready
          if (plan === 'catch' && !b.mega && !s.mega && s.hold < 0) {
            if (s.inc && s.inc.b === b && s.catchCD <= 0) { if (s.inc.t < 0.24) { st.dodge = { k: 'catch', b, until: G.time + 0.4 }; break; } continue; }
            if (r.stay < 0.5) continue; // (wait for the moment, unless it comes from behind: then dodge it)
          }
          // otherwise the first way that makes it miss (ducking first, then away from the thrower, then a hop)
          const away = b.vx > 0 ? 'right' : 'left';
          const order = ['duck', away, away === 'left' ? 'right' : 'left', 'jump'];
          const pick = order.find(k => r[k] === Infinity);
          if (pick) st.dodge = { k: pick, b, until: G.time + Math.min(0.6, r.stay + 0.12) };
          break;
        }
      }

      /* ---- where to stand ---- */
      st.spotT -= dt;
      const m = mst.mega;
      let goal = null;
      if (m && !s.mega && !mst.pl[o.id].mega) {
        if (st.megaFor !== m) { st.megaFor = m; st.megaGo = Math.random() < sk.mega; }
        const dMe = Math.hypot(pcx - m.x, cpuFeet(p) - m.y), dO = Math.hypot(ov.cx - m.x, ov.feet - m.y);
        if (st.megaGo && dMe < dO + 60) {
          let ty = Math.floor(m.y / T);
          while (ty < ROWS - 1 && !'#P='.includes(tile(Math.floor(m.x / T), ty + 1))) ty++;
          goal = { cx: m.x, feet: (ty + 1) * T };
        }
      }
      // empty hands and its snowball pile is close: grab one there
      const pile = mst.piles && mst.piles[p.id];
      if (!goal && !hasBall && pile && Math.abs(pile.x - pcx) < 130) goal = { cx: pile.x, feet: pile.y, pile: true };
      if (!goal) {
        if (!st.spot || st.spotT <= 0) { st.spot = pickSpot(st, p, ov, mst) || st.spot; st.spotT = sk.spotEvery * (1 + Math.random() * 0.5); }
        goal = st.spot;
      }

      /* ---- throwing ---- */
      let act = false, stand = false;
      if (st.hold) {
        const h = st.hold;
        h.t += dt;
        if (h.tap) { act = s.hold < 0 && h.t < 0.05; if (!act) st.hold = null; } // pressed until the throw starts, then let go
        else if (s.hold < 0 && h.t > 0.05) st.hold = null;                         // thrown, or knocked out of the aim
        else {
          // aiming: tilt to the angle it picked, let go when the dotted line reaches you (easy a little late)
          act = true; stand = true;
          if (MODES.snow.aiming(s)) {
            // (the angle was picked for where it thinks you are, a little off on easy: see aimOff)
            const want = h.oops ? s.ang : h.ang, d = want - s.ang;
            if (Math.abs(d) > 0.8) { out.jump = d > 0; out.down = d < 0; }
            else if (!h.oops && h.relAt == null) h.relAt = G.time + Math.random() * sk.relErr;
            if (h.relAt != null && G.time >= h.relAt) act = false;
          }
          if (s.autoT > K.aimTired - 0.3) act = false;
          if (!act) st.hold = null;
        }
      } else if (hasBall && s.cd <= 0 && p.stun <= 0 && s.hold < 0 && ov.alive && !st.dodge && !s.inc && st.dawT <= 0 && p.grounded) {
        // (only on the ground: a shot seen from the top of a hop over its fort used to stop the hop's steering, so it
        // fell back behind the fort and hopped again and again)
        // is there a throw that reaches you from here? (planned as if facing you, so walking away from you never makes it
        // turn back and forth every step: it only turns around when it is going to throw)
        const facing = p.face === dir, from = () => (facing ? p : pretend(p, pcx, cpuFeet(p), dir));
        if (st.plan) {
          // it saw a throw: stop, turn to face you, and throw after a moment to see it (longer on easy). It sticks to
          // that plan while it waits (a throw found one step and not the next must not make it walk off and back).
          stand = true;
          if (!facing) { out.left = dir < 0; out.right = dir > 0; }
          st.waitT += dt;
          if (st.waitT > st.waitNeed + 1) st.plan = null; // (could not turn: think again)
          else if (facing && st.waitT >= st.waitNeed) {
            const shot = bestShot(mst, p, s.mega, tg, sk.lead, 1, s.ang) || st.plan; // fresh look, else the plan it had
            st.plan = null; st.waitT = 0;
            st.hold = shot.ang == null ? { t: 0, tap: true } : { t: 0, ang: shot.ang, relAt: null };
            act = true;
            if (Math.random() < sk.fumble) st.hold = { t: 0, relAt: G.time + 0.3 + Math.random() * 0.3, oops: true };
            st.aimOff = (Math.random() * 2 - 1) * sk.aimErr; // (for the next throw)
          }
        } else {
          const shot = bestShot(mst, from(), s.mega, tg, sk.lead, 2, s.ang);
          if (shot) {
            st.plan = shot; st.lostT = 0; st.waitT = 0; st.waitNeed = sk.wait * (0.5 + Math.random()); stand = true;
            if (!facing) { out.left = dir < 0; out.right = dir > 0; }
          } else {
            // standing where it wanted with no throw from there for a while: try somewhere else for a few seconds
            st.lostT = (st.lostT || 0) + dt;
            if (st.lostT > 1 && st.spot && Math.abs(st.spot.cx - pcx) < 12) { st.bad = { cx: st.spot.cx, feet: st.spot.feet, until: G.time + 4 }; st.spot = null; st.spotT = 0; st.lostT = 0; }
            // easy sometimes just throws when you're near, shot or not
            if (facing && Math.abs(ov.cx - pcx) < 330 && cpuChance(sk.wild, dt)) { st.hold = { t: 0, tap: true }; act = true; }
          }
        }
      } else { st.plan = null; st.waitT = 0; }

      /* ---- moving ---- */
      const d = st.dodge;
      if (st.hold && !st.hold.tap) { /* aiming: its ▲ ▼ are the tilt, set above; it stands still */ }
      else if (d && d.k !== 'stay') {
        if (d.k === 'duck') out.down = true;
        else if (d.k === 'left') out.left = true;
        else if (d.k === 'right') out.right = true;
        else if (d.k === 'jump') out.jump = true;
        else if (d.k === 'catch') { act = s.catchT <= 0 && s.catchCD <= 0 && !!s.inc; } // press on "Catch!" (a fresh press)
      } else if (!stand && !out.left && !out.right && st.dawT <= 0) {
        // empty hands and nothing coming: duck to pack a snowball (decided once per empty hand), unless it is going to its pile
        if (!hasBall && st.packFor !== s.hand + ':' + mst.throws[p.id]) { st.packFor = s.hand + ':' + mst.throws[p.id]; st.packGo = Math.random() < sk.pack; }
        if (!hasBall && st.packGo && solidFloor && !(goal && goal.pile)) out.down = true;
        else if (goal) {
          const mv = cpuNav(st, p, goal.cx, goal.feet, { tol: goal.pile ? 4 : 8 }) || {};
          if (st.nav && st.nav.status === 'arrived' && p.grounded && Math.abs(goal.cx - pcx) <= 10) {
            // standing where it wanted: just face you, ready to throw (its small position fixes turned it back and forth)
            if (p.face !== dir && Math.abs(p.vx) < 40) { out.left = dir < 0; out.right = dir > 0; }
          } else { out.left = mv.left; out.right = mv.right; out.jump = mv.jump; out.down = mv.down; }
        }
      }
      out.act = act;
      // the person stands still for a while: once a match it says what to do
      if (!info.partnerCpu && cpuFor(st, 'still', info.partnerIdle > 0, dt) > 8 && !st.said) { st.said = true; cpuSay(p, 'Throw at me!'); }
      return out;
    },
  });
})();
