/* Pip & Bo - Computer partner: pompeii escape. */
'use strict';

/* 9-1 Pompeii Escape. Every room is a row of teamwork walls (st.objs, done left to right), a cart to push (Room 4)
   and an exit (or the ship). Each wall has a crane lift (a deck at the foot, a lever beside it) and a rope ladder
   rolled up at the top. For the wall in front, the brain looks at who is up already:
   - both up: wait (the column tips, the ship sails, or the wall counts as done).
   - I'm up, the partner is below: go to the edge and press use: the ladder drops. Then wait for them.
   - the partner is up, I'm below: wait at the foot; once the ladder is down, walk to it and hold jump to climb.
   - nobody up: the room's def.leads says who rides the lift ("lead") and who pulls the lever ("step"). A computer
     partner keeps to that; with a person it adapts: the person standing on the deck makes me the lever-puller,
     the person at the lever makes me the rider. The lever-puller waits for the rider to stand still on the deck.
   Walking uses cpuNav with the lava pools kept out; the cart is pushed by walking into it together.
   Reads only what is on screen (positions, the lift, the ladder, the column, the cart). */
(() => {
  const near = (a, b, d) => Math.abs(a - b) <= d;
  // a short bubble for the person: at most one every 6 s, the same words again only after twice as long each time
  // (st.said is cleared at every new wall), and nothing while the person is away from the keys
  function say(st, p, info, text) {
    if (info.partnerCpu || info.partnerIdle > 20 || G.time - (st.saidT == null ? -99 : st.saidT) < 6) return;
    const S = st.said || (st.said = {}), k = S[text] || { n: 0, t: -99 };
    if (G.time - k.t < Math.min(30, 6 * Math.pow(2, k.n))) return;
    S[text] = { n: k.n + 1, t: G.time }; st.saidT = G.time; cpuSay(p, text, 2);
  }
  const still = q => q.grounded && Math.abs(q.vx) < 10;
  // the job in front: a wall spot (kind spot / column / ship), the cart, or null (go to the exit)
  function curObj(m) {
    const ob = m.objs[pompeiiStage(m)];
    if (!ob) return null;
    if (ob.kind === 'column' && m.column && m.column.phase !== 'stand') return { kind: 'wait' };
    return ob;
  }
  // the lava pools as cells to keep out of
  function navOpts(st, m) {
    if (!st.avoid || st.avoidRoom !== G.room) {
      const set = new Set();
      for (const pc of m.pools) set.add(pc.c + ',' + pc.r);
      st.avoid = set; st.avoidRoom = G.room;
    }
    const set = st.avoid;
    return { avoid: (tx, ty) => set.has(tx + ',' + ty), key: 'pompeii' + G.room };
  }
  function go(st, p, m, x, feet, tol = 4, noHop) {
    const o = navOpts(st, m);
    o.tol = tol; o.noHop = !!noHop;
    const out = cpuNav(st, p, x, feet, o);
    // bouncing on an awning (the map doesn't know them): steer straight for the target so it doesn't bounce forever
    if (!p.grounded && m.awnings.some(a => p.x + p.w > a.x0 && p.x < a.x1 && cpuFeet(p) <= a.top + 2 && cpuFeet(p) > a.top - 120)) {
      cpuSteer(out, p, x, tol); out.jump = false;
    }
    // no way on the map (an awning bounce, a gap): walk straight on, jumping only at a wall
    if (st.nav && st.nav.status === 'noPath' && p.grounded) {
      const d = x - cpuCx(p);
      out.left = d < -tol; out.right = d > tol; out.jump = false;
      const dir = d < 0 ? -1 : 1, fx = Math.floor((cpuCx(p) + dir * (p.w / 2 + 6)) / T), fy = Math.floor((cpuFeet(p) - 2) / T);
      if (Math.abs(d) > tol && solidFor(tile(fx, fy), p) && feet < cpuFeet(p) - 10) out.jump = !CPU.last[p.id].jump;
    }
    return out;
  }
  // a spot's handy x positions (dir points from the wall toward the drop side)
  const geo = s => ({ deck: (s.lift.x0 + s.lift.x1) / 2, lever: s.lift.leverX, edge: s.edgeX - s.dir * 12, wait: s.lift.leverX + s.dir * 30 });

  /* ---------- the rider: stand on the deck and keep still ---------- */
  function lead(st, p, o, m, s, dt, info) {
    const g = geo(s), base = pompeiiBaseY(s), out = {};
    if (!pompeiiOnDeck(m, p, s) || !near(cpuCx(p), g.deck, 5)) return go(st, p, m, g.deck, base, 3, true);
    cpuSeek(out, p, g.deck, 3);
    if (cpuFor(st, 'askLever', still(p) && s.lift.phase === 'down', dt) > 3) say(st, p, info, 'Pull the lever!');
    return out;
  }
  /* ---------- the lever-puller: stand at the lever, pull it once the rider is on the deck ---------- */
  function step(st, p, o, m, s, dt, info) {
    const g = geo(s), out = {}, lg = pompeiiGroundY(m, g.lever, true);
    if (!pompeiiAtLever(m, p, s) || !near(cpuCx(p), g.lever, 6)) return go(st, p, m, g.lever, lg, 3, true);
    cpuSeek(out, p, g.lever, 4);
    const ready = s.lift.phase === 'down' && pompeiiOnDeck(m, o, s) && still(o);
    if (cpuFor(st, 'riderStill', ready, dt) > 0.25 + (1 - info.skill) * 0.4 && !CPU.last[p.id].act) { out.act = true; st._for_riderStill = 0; }
    if (!ready && cpuFor(st, 'askDeck', still(p), dt) > 3) say(st, p, info, 'Stand on the lift!');
    return out;
  }
  /* ---------- up top: drop the ladder ---------- */
  function helper(st, p, o, m, s, dt, info) {
    const g = geo(s), out = {};
    if (pompeiiEdge(m, p) !== s) return go(st, p, m, g.edge, s.top, 3);
    cpuSeek(out, p, g.edge, 4);
    if (!s.ladder.down) { if (!CPU.last[p.id].act && cpuFor(st, 'atEdge', true, dt) > 0.15 + (1 - info.skill) * 0.3) { out.act = true; st._for_atEdge = 0; } return out; }
    cpuFor(st, 'atEdge', false, dt);
    if (!pompeiiNear(o, s) && m.pl[o.id].lock !== 'climb' && cpuFor(st, 'askCome', true, dt) > 4) say(st, p, info, 'Climb the ladder!');
    return out;
  }
  /* ---------- below a wall the partner is up on: climb the ladder once it is down ---------- */
  function below(st, p, o, m, s, dt, info) {
    const g = geo(s), base = pompeiiBaseY(s), out = {};
    if (!s.ladder.down || s.ladder.k < 1) {
      if (!pompeiiNear(p, s) || Math.abs(cpuFeet(p) - base) > 3) return go(st, p, m, g.deck, base, 4, true);
      if (cpuFor(st, 'askLadder', true, dt) > 3.5) say(st, p, info, 'Drop the ladder!');
      return out;
    }
    if (!pompeiiAtLadder(p, s) || !near(cpuCx(p), g.deck, 6) || !p.grounded) return go(st, p, m, g.deck, base, 3, true);
    // take hold (a fresh press)
    if (!CPU.last[p.id].jump) out.jump = true;
    return out;
  }

  // which job is mine at a wall nobody has climbed yet
  function role(st, p, o, s, dt, info, m) {
    if (st.roleFor !== s) { st.roleFor = s; st.role = s.lead === p.id ? 'lead' : 'step'; st.roleT = 9; }
    st.roleT += dt;
    if (!info.partnerCpu && st.roleT > 1) {
      if (st.role === 'lead' && cpuFor(st, 'oDeck', pompeiiOnDeck(m, o, s) && still(o), dt) > 0.6) { st.role = 'step'; st.roleT = 0; }
      else if (st.role === 'step' && cpuFor(st, 'oLever', pompeiiAtLever(m, o, s) && still(o), dt) > 0.6) { st.role = 'lead'; st.roleT = 0; }
    }
    return st.role;
  }

  cpuBrain('pompeii', {
    think(st, p, o, dt, info) {
      const m = info.mst, out = {};
      if (!m || !m.pl || !p.alive || info.intro) return out;
      const P = m.pl[p.id];
      if (P.lock === 'climb') { out.jump = true; return out; }   // up the ladder
      if (P.lock) return out;
      // fell back down below a wall we already climbed: hold ▼ to hop back up to my banner
      const sp = pompeiiSpawnFor(m, p.id);
      const fell = m.spots.some(s2 => s2.done && s2.kind === 'spot' && pompeiiBehind(cpuCx(p), cpuFeet(p), s2) && !pompeiiBehind(sp.x + PW / 2, sp.y + PH, s2));
      if (fell && p.grounded) { out.down = true; return out; }
      const ob = curObj(m);
      if (st.sayStage !== m.stage) { st.sayStage = m.stage; st.said = null; }
      if (!ob) {
        // to the exit arch, side by side
        const d = m.exit;
        if (!d) return out;
        return go(st, p, m, doorX(p, o, d), d.y + d.h, 4);
      }
      if (ob.kind === 'wait') return out;
      if (ob.kind === 'cart') return cart(st, p, o, m, ob, dt, info);
      const s = ob, upMe = pompeiiUp(p, s), upO = pompeiiUp(o, s);
      if (upMe && upO) return out;
      if (upMe) return helper(st, p, o, m, s, dt, info);
      if (upO) return below(st, p, o, m, s, dt, info);
      if (s.lift.phase !== 'down') return out;   // (the lift is moving: wait)
      const r = role(st, p, o, s, dt, info, m);
      return r === 'lead' ? lead(st, p, o, m, s, dt, info) : step(st, p, o, m, s, dt, info);
    },
  });

  // where to stand in a doorway: the half on my side of the partner (players can't pass each other, so neither
  // walks into the other)
  function doorX(p, o, d) {
    const dx = cpuCx(p) - cpuCx(o);
    return d.x + d.w / 2 + (!o.alive || Math.abs(dx) < 1 ? (p.id ? 1 : -1) : Math.sign(dx)) * 13;
  }

  /* ---------- the cart: both walk into it, one behind the other ---------- */
  function cart(st, p, o, m, c, dt, info) {
    const x0 = c.c * T, floor = (c.r + c.h) * T, out = {};
    const onFloor = p.grounded && p.tileGround && near(cpuFeet(p), floor, 2) && cpuCx(p) < x0;
    if (!onFloor) {
      // first down behind the cart: the front spot if the partner isn't there yet, else just behind them
      const oThere = o.alive && near(cpuFeet(o), floor, 2) && o.x + o.w <= x0 + 1;
      const x = oThere && cpuCx(o) > x0 - 60 ? Math.min(cpuCx(o) - 24, x0 - 40) : x0 - 14;
      return go(st, p, m, x, floor, 6, true);
    }
    out.right = true;
    const front = Math.abs(p.x + p.w - x0) < 1.5, behind = o.alive && Math.abs(p.x + p.w - o.x) < 2 && near(cpuFeet(o), floor, 2);
    if (front && cpuFor(st, 'alone', !(o.input.right && near(o.x + o.w, p.x, 2)), dt) > 2.5) say(st, p, info, 'Push with me!');
    if (behind && !front) cpuFor(st, 'alone', false, dt);
    return out;
  }
})();
