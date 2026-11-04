/* Pip & Bo - Computer partner: snowball fight. */
'use strict';

(() => {
  /* Snowball Fight is head-to-head: the computer plays against you. It sees you (and your snowballs) a moment late.
     - Where to stand: every so often it scores the spots it could stand on (floor, hill, planks, fort tops) by how quickly
       it gets there, whether it would have a throw that reaches you from there (it flies the snowball with the game's own
       numbers, the same arc the game draws while you hold throw), not too close, and never long in its own corner behind
       its fort (the hideout rule drops snow on you). cpuNav walks it there.
     - Throwing: with a snowball in hand it checks the throw it would have facing you from where it stands; when one
       reaches you it stops, turns to you if needed, and taps (the quick throw is auto-aimed) or holds throw for a lob and
       lets go when the dotted arc reaches you. Tap throws fly over someone ducking. With no throw it keeps walking.
     - Dodging: for each snowball or avalanche clump coming its way it checks what helps: ducking (quick throws fly over),
       stepping left or right, or a hop; with empty hands it may catch a snowball thrown at its front instead.
     - Empty hands: it ducks to pack a new snowball when nothing is coming. MEGA snowball: it fetches it when it is nearer
       to it than to you, and throws it the same way.
     Skill: easy sees late, stops now and then, misjudges where you stand, often holds a throw too long (a weak lob that
     flies anywhere), dodges and catches rarely, sometimes throws with no real shot and forgets to pack snow. Hard sees
     about as quickly as a sharp person, leads its throws where you are walking, rarely fumbles, dodges more than a third
     of the snowballs and catches some. */
  // a number for each skill: easy, normal, hard (in between for other skills)
  const by = (s, e, n, h) => (s <= 0.7 ? e + (n - e) * clamp((s - 0.35) / 0.35, 0, 1) : n + (h - n) * clamp((s - 0.7) / 0.3, 0, 1));
  const SK = s => ({
    lag: by(s, 0.4, 0.28, 0.2),     // how late it sees you (s)
    see: by(s, 0.45, 0.3, 0.25),    // how long a snowball has to be in the air before it reacts to it (s)
    dodge: by(s, 0.05, 0.2, 0.38),  // chance it tries to get out of the way of a snowball it sees coming
    catchP: by(s, 0.05, 0.2, 0.4),  // chance it tries to catch one instead (empty hands, thrown at its front)
    lead: s > 0.5,                  // aims where you're walking
    relErr: by(s, 0.25, 0.15, 0.05),// lob let go up to this late or early (s)
    wild: by(s, 0.6, 0.25, 0),      // throws without a real shot this often per second (when you're near)
    pack: by(s, 0.5, 0.8, 1),       // chance it ducks to pack snow when its hands are empty
    wait: by(s, 0.45, 0.28, 0.1),   // pause before throwing once it has a shot (on top of seeing late)
    mega: 0.4 + 0.6 * s,            // chance it goes for the MEGA snowball
    aimErr: by(s, 45, 28, 12),      // how far off (px) it may judge where you stand, new for every throw
    spotEvery: by(s, 1.4, 0.7, 0.7),// how often it thinks again about where to stand (s, plus up to half more)
    dawdle: by(s, 0.5, 0.2, 0),     // a short stop (no walking, no new throw) this often per second
    fumble: by(s, 0.5, 0.15, 0.05), // chance a throw goes wrong: held a moment too long, a weak lob that flies anywhere
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
  function flight(mst, from, power, mega, tg, lead, stride) {
    const K = SN(), l = MODES.snow.launch(from, power, MODES.snow.aimW(power)), r = radius(mst, from.id, mega), wind = MODES.snow.wind();
    let x = l.x, y = l.y, vx = l.vx, vy = l.vy, best = 1e9;
    const dt = DT * stride, n = Math.ceil(2.2 / dt);
    for (let i = 1; i <= n; i++) {
      vy += K.ballG * dt; vx += wind * dt; x += vx * dt; y += vy * dt;
      if (y > H + 20 || x < -20 || x > W + 20) break;
      const ch = tile(Math.floor(x / T), Math.floor(y / T));
      if (ch === '#' || (ch === 'P' && !mega)) break;
      const t = i * dt, dx = lead ? clamp(tg.vx * Math.min(t, 0.7), -160, 160) : 0;
      const box = { x: tg.x + dx, y: tg.y, w: tg.w, h: tg.h };
      if (MODES.snow.circRect(x, y, r, box)) return { hit: true, t };
      best = Math.min(best, Math.abs(x - (box.x + box.w / 2)) + Math.abs(y - (box.y + box.h / 2)));
    }
    return { hit: false, miss: best };
  }
  // a pretend player standing at (cx, feet) facing dir, for planning throws from somewhere else
  const pretend = (p, cx, feet, dir) => ({ id: p.id, x: cx - PW / 2, y: feet - PH, w: PW, h: PH, face: dir, vx: 0 });
  // the best throw from `from`: a tap if it hits, else the quickest lob that hits (null when nothing reaches)
  const LOBS = [0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1];
  function bestShot(mst, from, mega, tg, lead, stride) {
    const tap = flight(mst, from, 0, mega, tg, lead, stride);
    if (tap.hit) return { power: 0, t: tap.t };
    let best = null;
    for (const pw of LOBS) {
      const f = flight(mst, from, pw, mega, tg, lead, stride);
      if (f.hit && (!best || f.t + pw * 0.8 < best.t + best.power * 0.8)) best = { power: pw, t: f.t };
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
  const inPocket = (k, cx) => (k === 0 ? cx < SN().pocketL : cx > SN().pocketR);
  // pick where to stand: quick to reach, a throw that reaches you from there, not too close, not hiding in its corner
  function pickSpot(st, p, ov, mst) {
    const pcx = cpuCx(p), pf = cpuFeet(p), list = spots(st);
    const mega = mst.pl[p.id].mega;
    let best = null;
    for (const sp of list) {
      const dx = ov.cx - sp.cx, dist = Math.abs(dx);
      if (dist < 40) continue;
      let sc = Math.abs(sp.cx - pcx) / 220 + Math.max(0, pf - sp.feet) / 200 + Math.max(0, sp.feet - pf) / 400;
      if (inPocket(p.id, sp.cx)) { if (mst.pl[p.id].pk > 2.5) continue; sc += 2.5; }
      if (dist < 110) sc += 1.2; else if (dist > 330) sc += (dist - 330) / 200;
      if (sc > (best ? best.sc : 1e9)) continue;
      const shot = bestShot(mst, pretend(p, sp.cx, sp.feet, Math.sign(dx)), mega, ov, false, 3);
      if (!shot) sc += 3; else sc += shot.power * 0.4;
      if (!best || sc < best.sc) best = { cx: sp.cx, feet: sp.feet, sc };
    }
    return best;
  }
  // a snowball or clump flying toward the computer: when would it hit each way of dodging (Infinity = misses)?
  function threat(b, me, ways, wind) {
    let x = b.x, y = b.y, vx = b.vx, vy = b.vy;
    const res = {}, dt = DT * 2;
    for (const w of ways) res[w.k] = Infinity;
    for (let i = 1; i <= 50; i++) {
      vy += SN().ballG * dt; if (b.k >= 0) vx += wind * dt; x += vx * dt; y += vy * dt;
      if (y > H + 20 || x < -20 || x > W + 20) break;
      const ch = tile(Math.floor(x / T), Math.floor(y / T));
      if (ch === '#' || (ch === 'P' && !b.mega)) break;
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
        st.dawT = 0; st.aimOff = 0;
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

      /* ---- dodge: snowballs and clumps it has seen coming ---- */
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
          if (!st.seen.has(b)) st.seen.set(b, Math.random() < sk.dodge ? (Math.random() < sk.catchP ? 'catch' : 'dodge') : 'no');
          const plan = st.seen.get(b);
          if (plan === 'no') continue;
          // catch: empty hands, a thrown (not MEGA) snowball at its front, close enough for the 0.3 s window
          const front = (b.x - pcx) * p.face > 0;
          if (plan === 'catch' && !hasBall && b.k >= 0 && !b.mega && s.catchCD <= 0 && front && r.stay < 0.22) {
            st.dodge = { k: 'catch', b, until: G.time + 0.35 }; break;
          }
          // otherwise the first way that makes it miss (ducking first, then away from the thrower, then a hop)
          const away = b.k >= 0 ? (b.vx > 0 ? 'right' : 'left') : (b.x > pcx ? 'left' : 'right');
          let order = ['duck', away, away === 'left' ? 'right' : 'left', 'jump'];
          // ...but not deeper into its own corner once it has been there a while
          const back = p.id === 0 ? 'left' : 'right';
          if (s.pk > 2) order = order.filter(k => k !== back).concat(back);
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
      // too long in its own corner: get out before the snow slides off the roof
      const hiding = s.pk > 2.5;
      if (!goal && hiding && st.spot && inPocket(p.id, st.spot.cx)) { st.spot = null; st.spotT = 0; }
      if (!goal) {
        if (!st.spot || st.spotT <= 0) { st.spot = pickSpot(st, p, ov, mst) || st.spot; st.spotT = sk.spotEvery * (1 + Math.random() * 0.5); }
        goal = st.spot;
      }

      /* ---- throwing ---- */
      let act = false, stand = false;
      if (st.hold) {
        const h = st.hold;
        h.t += dt;
        if (h.tap) { act = s.hold < 0 && h.t < 0.05; if (!act) st.hold = null; } // pressed until the wind-up starts, then let go
        else if (s.hold < 0 && h.t > 0.05) st.hold = null;                         // thrown, or knocked out of the wind-up
        else {
          // winding up a lob: let go when the arc reaches you (easy a little early or late)
          act = true; stand = true;
          const c = s.hold < K.tapT ? 0 : s.charge;
          if (!h.oops && h.relAt == null && c > 0 && flight(mst, p, c, s.mega, tg, sk.lead, 1).hit) h.relAt = G.time + (Math.random() * 2 - 1) * sk.relErr;
          if (h.relAt != null && G.time >= h.relAt && s.hold >= K.tapT + 0.02) act = false;
          if (s.full && s.autoT > 0.5) act = false; // nothing lines up: throw it anyway rather than wait
          if (!act) st.hold = null;
        }
      } else if (hasBall && s.cd <= 0 && p.stun <= 0 && s.hold < 0 && ov.alive && !st.dodge && st.dawT <= 0 && p.grounded) {
        // (only on the ground: a shot seen from the top of a hop over its fort used to stop the hop's steering, so it
        // fell back behind the fort and hopped again and again, hiding until the snow fell on it)
        // is there a throw that reaches you from here? (planned as if facing you, so walking away from you never makes it
        // turn back and forth every step: it only turns around when it is going to throw)
        const facing = p.face === dir;
        const shot = bestShot(mst, facing ? p : pretend(p, pcx, cpuFeet(p), dir), s.mega, tg, sk.lead, 2);
        if (shot) st.lostT = 0; else st.lostT = (st.lostT || 0) + dt;
        if (!shot && st.waitT > 0 && st.lostT < 0.2) stand = true; // the shot flickered away for a moment: keep still
        else if (shot) {
          // stop, turn to face you, and throw after a moment to see it (longer on easy)
          stand = true;
          if (!facing) { out.left = dir < 0; out.right = dir > 0; }
          if (!st.waitT) st.waitNeed = sk.wait * (0.5 + Math.random());
          st.waitT = (st.waitT || 0) + dt;
          if (facing && st.waitT >= st.waitNeed) {
            st.waitT = 0; st.hold = shot.power === 0 ? { t: 0, tap: true } : { t: 0, relAt: null }; act = true;
            if (Math.random() < sk.fumble) st.hold = { t: 0, relAt: G.time + 0.33 + Math.random() * 0.2, oops: true };
            st.aimOff = (Math.random() * 2 - 1) * sk.aimErr; // (for the next throw)
          }
        } else {
          st.waitT = 0;
          // easy sometimes just throws when you're near, shot or not
          if (facing && Math.abs(ov.cx - pcx) < 330 && cpuChance(sk.wild, dt)) { st.hold = { t: 0, tap: true }; act = true; }
        }
      } else st.waitT = 0;

      /* ---- moving ---- */
      const d = st.dodge;
      if (d && d.k !== 'stay') {
        if (d.k === 'duck') out.down = true;
        else if (d.k === 'left') out.left = true;
        else if (d.k === 'right') out.right = true;
        else if (d.k === 'jump') out.jump = true;
        else if (d.k === 'catch') { out.left = dir < 0 && p.face !== dir; out.right = dir > 0 && p.face !== dir; act = s.catchT <= 0 && s.catchCD <= 0; }
      } else if (!stand && !out.left && !out.right && st.dawT <= 0) {
        // empty hands and nothing coming: duck to pack a snowball (decided once per empty hand)
        if (!hasBall && st.packFor !== s.hand + ':' + mst.throws[p.id]) { st.packFor = s.hand + ':' + mst.throws[p.id]; st.packGo = Math.random() < sk.pack; }
        if (!hasBall && st.packGo && solidFloor && !hiding) out.down = true;
        else if (goal) {
          const mv = cpuNav(st, p, goal.cx, goal.feet, { tol: 8 }) || {};
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
