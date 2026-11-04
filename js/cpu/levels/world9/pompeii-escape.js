/* Pip & Bo - Computer partner: pompeii escape. */
'use strict';

/* 9-1 Pompeii Escape. Every room is a row of teamwork walls (st.objs, done left to right), a cart to push (Room 4)
   and an exit (or the ship). For the wall in front, the brain looks at who is up already:
   - both up: wait (the column tips, the ship sails, or the wall counts as done).
   - I'm up, the partner is below: stand at the edge and hold help (on a tall wall, let go and press again now and
     then, so the level's "Super stretch" can kick in for a partner who never jumps).
   - the partner is up, I'm below: stand at the foot of the wall; when the hand reaches down, jump for it on a tall
     wall; if the partner stands at the edge but doesn't reach, press help myself (the level then reaches for me).
   - nobody up: the room's def.leads says who climbs ("lead") and who is the step. A computer partner keeps to that;
     with a person it adapts: someone on my head makes me the step, the person standing at the foot makes me the
     lead, and a person who waits elsewhere gets me taking the step job after a while.
     The step stands at the foot and keeps still; the lead hops on its head and jumps (the boost) onto the roof.
   Walking uses cpuNav with the lava pools kept out; the cart is pushed by walking into it together.
   Reads only what is on screen (positions, the hand, the column, the cart). */
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
  const geo = s => ({ foot: s.edgeX + s.dir * 12, wait: s.edgeX + s.dir * 46, edge: s.edgeX - s.dir * 12, land: s.edgeX - s.dir * 30 });

  /* ---------- the lead: hop on the step's head, then boost up ---------- */
  function lead(st, p, o, m, s, dt, info) {
    const g = geo(s), base = pompeiiBaseY(s), out = {};
    if (!p.grounded) {
      // in the air: the boost steers for the roof, a hop steers onto the head
      if (st.air === 'boost') cpuSteer(out, p, g.land, 3);
      else if (st.air === 'hop') cpuSeek(out, p, cpuCx(o), 2);
      else return go(st, p, m, g.wait, base, 6);
      out.jump = p.vy < 0;
      return out;
    }
    if (pompeiiOnHead(p)) {
      st.air = null;
      const ready = o.grounded && o.tileGround && !m.pl[o.id].lock && pompeiiAtFoot(o, s);
      st.headT = (st.headT || 0) + dt;
      if (ready && cpuFor(st, 'settle', still(o), dt) > 0.12 + (1 - info.skill) * 0.3) {
        if (CPU.last[p.id].jump) return out;   // let go first so the press counts
        st.air = 'boost'; st.headT = 0; st.landX = g.land;
        out.jump = true; cpuSteer(out, p, g.land, 3);
        return out;
      }
      // carried somewhere that won't work: step off and be the step instead
      if (!ready && st.headT > 2.2 && still(o)) { st.role = 'step'; st.roleT = 0; st.headT = 0; st.offHead = 1; }
      return out;
    }
    st.headT = 0; st.air = null;
    const stepReady = pompeiiAtFoot(o, s) && still(o) && !m.pl[o.id].lock;   // (wherever they stand at the foot)
    if (stepReady) {
      const dx = cpuCx(o) - cpuCx(p);
      if (Math.abs(dx) > 44 || Math.abs(cpuFeet(p) - base) > 3) return go(st, p, m, g.wait, base, 6, true);
      if (cpuFor(st, 'hopWait', true, dt) < 0.1 + (1 - info.skill) * 0.35) return out;
      if (CPU.last[p.id].jump) return out;
      st.air = 'hop'; out.jump = true; cpuSeek(out, p, cpuCx(o), 2);
      return out;
    }
    cpuFor(st, 'hopWait', false, dt);
    // wait a little way back from the foot (beside the partner if they stand there)
    let wx = g.wait;
    if (o.alive && near(cpuCx(o), wx, 26) && near(cpuFeet(o), base, 4)) wx = cpuCx(o) + ((cpuCx(p) - cpuCx(o)) * s.dir < 0 ? -s.dir : s.dir) * 26;
    st.waitX = wx;
    const at = near(cpuCx(p), wx, 8) && near(cpuFeet(p), base, 3);
    if (at && cpuFor(st, 'askStep', true, dt) > 3) say(st, p, info, 'Be the step!');
    return go(st, p, m, wx, base, 6, true);
  }
  /* ---------- the step: stand at the foot, keep still ---------- */
  function step(st, p, o, m, s, dt, info) {
    const g = geo(s), base = pompeiiBaseY(s);
    const atFoot = pompeiiAtFoot(p, s) && near(cpuCx(p), g.foot, 8);
    if (!atFoot) return go(st, p, m, g.foot, base, 3, true);
    const out = {};
    cpuSeek(out, p, g.foot, 3);
    if (pompeiiOnHead(o)) {
      out.left = out.right = false;
      // a partner who stands on my head and doesn't jump: keep still and tell them (walking out from under them
      // would only carry them along: riders ride)
      if (cpuFor(st, 'carry', true, dt) > 2) say(st, p, info, 'Jump now!');
      return out;
    }
    cpuFor(st, 'carry', false, dt);
    if (cpuFor(st, 'askHop', still(p), dt) > 2.5) say(st, p, info, 'Hop on my head!');
    return out;
  }
  /* ---------- the helper at the edge ---------- */
  function helper(st, p, o, m, s, dt, info) {
    const g = geo(s), out = {};
    if (pompeiiEdge(m, p) !== s) { st.actT = 0; return go(st, p, m, g.edge, s.top, 3); }
    cpuSeek(out, p, g.edge, 4);
    // reach down while the partner is below this wall (the arm out says "come here"). On a tall wall with the
    // partner standing at the foot, let go and press again now and then: a partner who never jumps for the hand
    // then gets the level's gold "Super stretch".
    const R = m.pl[p.id].reach, down = o.alive && !pompeiiUp(o, s) && !m.pl[o.id].lock;
    if (!down) { st.actT = 0; return out; }
    if (!pompeiiNear(o, s) && cpuFor(st, 'askCome', true, dt) > 4) say(st, p, info, 'Come to the wall!');
    const cycle = pompeiiTall(s) && !s.longArm && pompeiiAtFoot(o, s) && o.grounded;
    st.actT = (st.actT || 0) + dt;
    if (st.actT > 1.6) st.actT = cycle ? 0 : 1.6;
    out.act = !cycle || st.actT < 1.35;
    // the hand was taken back (or never came out): let go so the next press counts
    if (out.act && CPU.last[p.id].act && !R && cpuFor(st, 'noReach', true, dt) > 0.15) { out.act = false; st._for_noReach = 0; }
    if (R) cpuFor(st, 'noReach', false, dt);
    if (pompeiiTall(s) && R && pompeiiAtFoot(o, s) && cpuFor(st, 'askJump', true, dt) > 1.5) say(st, p, info, 'Jump for my hand!');
    return out;
  }
  /* ---------- below a wall the partner is up on ---------- */
  function below(st, p, o, m, s, dt, info) {
    const g = geo(s), base = pompeiiBaseY(s), out = {};
    if (!p.grounded && st.air === 'hand') { out.jump = p.vy < 0; return out; }
    st.air = null;
    const atFoot = pompeiiAtFoot(p, s) && near(cpuCx(p), g.foot, 8);
    if (!atFoot) return go(st, p, m, g.foot, base, 3, true);
    cpuSeek(out, p, g.foot, 3);
    const R = m.pl[o.id].reach, tall = pompeiiTall(s);
    if (R && R.s === s) {
      // the hand is coming: on a tall wall, jump for it
      if (tall && R.t > 0.05 && cpuFor(st, 'seen', true, dt) > (1 - info.skill) * 0.25 && !CPU.last[p.id].jump) { out.jump = true; st.air = 'hand'; }
      return out;
    }
    cpuFor(st, 'seen', false, dt);
    if (pompeiiEdge(m, o) === s) {
      // the partner stands at the edge without reaching: press help (the level reaches down for me)
      if (cpuFor(st, 'edgeWait', true, dt) > 0.7 + (1 - info.skill) * 0.6 && !CPU.last[p.id].act) { out.act = true; st._for_edgeWait = 0; }
      return out;
    }
    cpuFor(st, 'edgeWait', false, dt);
    if (cpuFor(st, 'askHelp', true, dt) > 3.5) say(st, p, info, 'Help me up!');
    return out;
  }

  // which job is mine at a wall nobody has climbed yet
  function role(st, p, o, s, dt, info) {
    if (st.roleFor !== s) { st.roleFor = s; st.role = s.lead === p.id ? 'lead' : 'step'; st.roleT = 9; }
    st.roleT += dt;
    if (st.offHead > 0) { st.offHead -= dt; if (pompeiiOnHead(p)) return 'off'; }
    if (pompeiiOnHead(o)) st.role = 'step';
    else if (pompeiiOnHead(p)) st.role = 'lead';
    else if (!info.partnerCpu && st.roleT > 3) {
      const g = geo(s);
      if (st.role === 'step' && pompeiiAtFoot(o, s) && cpuFor(st, 'oFoot', still(o), dt) > 1) { st.role = 'lead'; st.roleT = 0; }
      else if (st.role === 'lead' && !pompeiiAtFoot(o, s) && info.partnerIdle > 2.5 && near(cpuCx(p), st.waitX == null ? g.wait : st.waitX, 12) && cpuFor(st, 'oAway', true, dt) > 2.5) {
        st.role = 'step'; st.roleT = 0;
      }
    }
    if (st.role !== 'lead') cpuFor(st, 'oAway', false, dt);
    return st.role;
  }

  cpuBrain('pompeii', {
    think(st, p, o, dt, info) {
      const m = info.mst, out = {};
      if (!m || !m.pl || !p.alive || info.intro) return out;
      const P = m.pl[p.id];
      if (P.lock || m.pull) return out;
      // flying off a head: steer for the roof until landing
      if (st.air === 'boost') {
        if (!p.grounded) { cpuSteer(out, p, st.landX, 3); out.jump = p.vy < 0; return out; }
        st.air = null;
      }
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
      const r = role(st, p, o, s, dt, info);
      if (r === 'off') { out.left = s.dir > 0; out.right = s.dir < 0; return out; }     // (walk off the partner's head, toward the wall)
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
