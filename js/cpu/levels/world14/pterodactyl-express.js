/* Pip & Bo - Computer partner brain for 14-2 Pterodactyl Express (mode 'ptero'). */
'use strict';

/* 14-2 Pterodactyl Express. Petra carries both: the room def says who flies (m.flyer) and the jobs swap every route, so
   the brain plays the job it has this route. It reads what the prompts and panels show (MODES.ptero.needs: the next
   fruit, rock pillar, nest or switch for the hanger, and the safe height band under the roof and over the ground), the
   wing meter, the winds and the smoke puffs, and presses keys like a person.
   - Flyer: picks a height (where the hanger can reach the next thing; higher before a downdraft; over or under a smoke
     puff in the way) and flaps only when the wings are at the gold TOP and Petra would sink below that height. It dives
     (▼) when far too high, slows down (◀) when the hanger is about to grab or drop something and isn't lined up yet,
     waits out a headwind that is about to blow, and speeds up (▶) on empty stretches. On the ground it waits for the
     TOP and flaps to take off.
   - Hanger: swings (◀ ▶) toward the next fruit or rock as it comes up and grabs it once it's in reach; with something
     in hand it keeps the swing calm and lets go when the dotted drop line ends in a hungry nest or on the switch.
   Waiting for a slow person: it never does the person's job. As the flyer it slows down by fruit and rocks the person
   hasn't grabbed yet, and as the hanger it asks for the height it needs. With a person it says what it needs in a short
   bubble ("Grab the rock!", "Lower, please!"), not too often. Skill only changes how quickly it reacts to the TOP and
   how calm its swing is; it plays well at every skill. */
(() => {
  const P = () => PTERO;
  function say(st, p, text, gap = 6) {
    const n = st.sayN && st.sayN.text === text ? st.sayN.n : 0, all = st.sayAll || 0;
    if (G.time - (st.saidT == null ? -99 : st.saidT) < gap * (1 + Math.floor(n / 3) + Math.floor(all / 8))) return;
    st.saidT = G.time; st.sayN = { text, n: n + 1 }; st.sayAll = all + 1; cpuSay(p, text, 1.8);
  }

  // the height the flyer aims for: the job's height, kept clear of smoke puffs and ready for a downdraft
  function aimY(m, nd) {
    const Pc = P(), pt = m.pt;
    let y = nd.wantY;
    const lo = nd.minY, hi = nd.maxY;
    // a downdraft just ahead: get high first
    for (const z of m.c.zones) if (z.kind === 'down' && pt.x > z.x0 - 360 && pt.x < z.x1) y = Math.min(y, lo + 30);
    // an updraft lifts anyway: no need to aim high there
    // smoke puffs (and vents about to puff) ahead: pass over or under them
    const band = [];
    for (const q of m.puffs) if (!q.pop && q.x - pt.x > -90 && q.x - pt.x < 330) band.push({ a: q.ty - q.max - Pc.feetY - 6, b: q.ty + q.max + Pc.top + 6 });
    for (const v of m.c.vents) if (v.warn && v.x - pt.x > 0 && v.x - pt.x < 300) {
      const lanes = [190, 330, 250, 300, 210], ty = lanes[((v.n || 0) + 1 + Math.round(v.x / 97)) % lanes.length], r = Pc.puffR * (m.puffGold ? 0.7 : 1);
      band.push({ a: ty - r - Pc.feetY - 6, b: ty + r + Pc.top + 6 });
    }
    for (const bd of band) {
      if (y > bd.a && y < bd.b) {
        const up = bd.a, dn = bd.b, okUp = up >= lo, okDn = dn <= hi;
        if (okUp && (!okDn || Math.abs(y - up) <= Math.abs(dn - y))) y = up; else if (okDn) y = dn; else y = lo;
      }
    }
    return clamp(y, lo, hi);
  }

  // how far up a flap of strength J lifts her before she starts to sink again
  function riseOf(J, vy, rock) {
    const Pc = P(), g = Pc.g * (rock ? Pc.rockG : 1), d = 1 / 60;
    let v = Math.max(-340, Math.min(vy, Pc.flapKeep) - J), y = 0;
    for (let k = 0; k < 200 && v < 0; k++) { v += g * d; v -= v * Pc.drag * d; y += v * d; }
    return -y;
  }

  /* ---------- the flyer ---------- */
  function flyer(st, p, o, m, nd, dt, info) {
    const Pc = P(), pt = m.pt, out = {};
    const lag = 0.05 + (1 - info.skill) * 0.1;
    if (pt.state === 'landed') {
      // take off on the gold TOP (a person hanger: once they're ready to go)
      if (pt.wst === 'top' && pt.wt >= lag) out.act = 'tap';
      return out;
    }
    const want = aimY(m, nd);
    st.want = want;
    const low = pt.y > nd.maxY - 6, wc = MODES.ptero.wingCfg(m), good = wc.good;
    // a PERFECT flap lifts her about 60 px and she sinks back: flap when she is a little below the height we want, or at
    // the end of the TOP when skipping it would sink her too far before the next one
    // (room for a PERFECT flap: how high it would lift her against the roof just ahead)
    const rock = m.hg.item && m.hg.item.kind === 'rock';
    let roof = 0;
    for (let x = pt.x - 30; x <= pt.x + 170; x += 20) roof = Math.max(roof, MODES.ptero.cy(m, x));
    const roomUp = roof <= Pc.ceil0 + 2 || pt.y - riseOf(Pc.jPerfect * wc.j, pt.vy, rock) - Pc.top - 6 > roof, yNow = pt.y + pt.vy * 0.25;
    const closing = pt.wst === 'top' && pt.wt >= Pc.topWin * wc.win - 0.04 - lag * 0.5;
    const wantFlap = yNow > want + 15 || low || (closing && pt.y + 85 > want + 45);
    // the hanger is about to drop something: hold steady (no flaps unless we're sinking too low)
    const hc0 = MODES.ptero.hangPos(m), tk0 = nd.task, aiming = tk0 && (tk0.kind === 'switch' || tk0.kind === 'nest') && tk0.x - hc0.x > -30 && tk0.x - hc0.x < 200;
    const inUp = m.c.zones.some(z => z.kind === 'up' && pt.x > z.x0 - 30 && pt.x < z.x1 + 30);
    if (aiming && !low && pt.y < nd.maxY - 24 && pt.vy < 110) { /* steady */ }
    else if (wantFlap) {
      // (under a low roof a PERFECT flap would bonk it: then a small "good" flap just before the top)
      if (pt.wst === 'top' && pt.wt >= lag && (roomUp || low || (closing && pt.y > want + 25))) out.act = 'tap';
      else if (pt.wst === 'rise' && pt.wing >= good + 0.03 && pt.vy > 40) {
        // near the ground: a small flap now only if waiting for the TOP would let her touch down
        const toTop = (1 - pt.wing) * Pc.riseT, room = nd.maxY + 14 - pt.y;
        if (!roomUp || (low && pt.vy * toTop > room)) out.act = 'tap';
      }
    }
    // far too high: fold the wings and dive
    if ((pt.y < want - 70 || (inUp && pt.y < want - 20)) && pt.vy < 120 && !low && !aiming) out.down = true;
    // speed
    const hc = MODES.ptero.hangPos(m), tk = nd.task;
    let slow = false, fast = false;
    if (tk && tk.kind !== 'drop') {
      const ahead = tk.x - hc.x, off = Math.abs(pt.y - (tk.kind === 'switch' ? pt.y : nd.wantY));
      if (ahead > -20 && ahead < 260 && off > 30) slow = true;
      if ((tk.kind === 'switch' || tk.kind === 'nest') && ahead > -20 && ahead < 220) slow = true;
      // a person hanger: give them time to grab
      if (!info.partnerCpu && (tk.kind === 'fruit' || tk.kind === 'rock') && ahead > -10 && ahead < 140) slow = true;
      if (ahead > 700) fast = true;
    } else if (!nd.gate || nd.gate.x - pt.x > 700) fast = true;
    // a headwind about to blow (or blowing) ahead: wait it out
    for (const z of m.c.zones) if (z.kind === 'wind' && z.state !== 'calm' && pt.x > z.x0 - 260 && pt.x < z.x0) slow = true;
    // puffs we can't get around yet: hang back
    for (const q of m.puffs) if (!q.pop && q.x - pt.x > 60 && q.x - pt.x < 230) { const a = q.ty - q.max - Pc.feetY, b = q.ty + q.max + Pc.top; if (pt.y > a && pt.y < b) slow = true; }
    if (pt.state === 'back') { slow = false; fast = false; }
    out.left = slow; out.right = !slow && fast;
    // a person hanger: say what they should do
    if (!info.partnerCpu && tk) {
      const d = Math.hypot(tk.x - hc.x, tk.y - hc.y);
      if ((tk.kind === 'fruit' || tk.kind === 'rock') && d < Pc.reach + 20) say(st, p, tk.kind === 'rock' ? 'Grab the rock!' : 'Grab the fruit!');
      else if (tk.kind === 'switch' && Math.abs(tk.x - hc.x) < 150) say(st, p, 'Drop it on the switch!');
      else if (tk.kind === 'nest' && Math.abs(tk.x - hc.x) < 150) say(st, p, 'Drop it in the nest!');
    }
    if (!info.partnerCpu && pt.state === 'back') say(st, p, 'We need a rock on the switch!');
    return out;
  }

  /* ---------- the hanger ---------- */
  function hanger(st, p, o, m, nd, dt, info) {
    const Pc = P(), pt = m.pt, hg = m.hg, out = {}, M = MODES.ptero;
    if (pt.state === 'landed') return out;
    const hc = M.hangPos(m), pv = M.pivot(m), tk = nd.task;
    let thWant = 0;
    if (tk && (tk.kind === 'fruit' || tk.kind === 'rock')) {
      // swing to meet it as it comes by, grab once it's in reach (a fruit goes into the basket with any already there)
      const dx = tk.x - pv.x, dy = tk.y - pv.y;
      if (Math.abs(dx) < 120 && dy > -10) thWant = clamp(Math.atan2(dx, Math.max(10, dy)), -1.05, 1.05);
      else if (dx >= 120 && dx < 320) thWant = 0.25;
      const d = Math.hypot(tk.x - hc.x, tk.y - hc.y);
      if (d < Pc.reach * 0.82) out.act = 'tap';
      // a person flyer: ask for the height we need
      if (!info.partnerCpu && Math.abs(dx) < 300 && dx > 0) {
        if (tk.y - hc.y > 55) say(st, p, 'Lower, please!');
        else if (hc.y - tk.y > 55) say(st, p, 'Higher! Flap at the top!');
      }
    } else if (hg.item) {
      // let go when the dotted line ends in the hungry nest or on the switch
      const pts = M.predict(m, hc, M.hangVel(m), 50), h2 = M.pathHit(m, pts);
      if (tk && tk.kind === 'drop') out.act = 'tap';
      else if (h2 && tk && h2.ref === tk.ref) out.act = cpuFor(st, 'aim', true, dt) > 0.02 + (1 - info.skill) * 0.06 ? 'tap' : false;
      else cpuFor(st, 'aim', false, dt);
      // keep the swing calm so the drop line holds still
      thWant = 0;
    }
    // swing toward thWant: a little PD controller on the pendulum
    const omWant = (thWant - hg.th) * 4.5, dead = 0.25 + (1 - info.skill) * 0.25;
    if (hg.om < omWant - dead) out.right = true;
    else if (hg.om > omWant + dead) out.left = true;
    if (!info.partnerCpu && pt.vy > 100 && pt.y > nd.maxY - 30 && pt.state === 'fly') say(st, p, 'Flap at the gold top!');
    if (!info.partnerCpu && pt.state === 'landed') say(st, p, 'Flap to take off!');
    return out;
  }

  cpuBrain('ptero', {
    reset(st) { st.want = null; },
    bubblePos(p) {
      const m = G.mst;
      if (!m || !m.pt) return null;
      if (p.id === m.flyer) return { x: m.pt.x - m.cam.x, y: m.pt.y - 96 };
      const hc = MODES.ptero.hangPos(m);
      return { x: hc.x - m.cam.x, y: Math.min(H - 70, hc.y + 76) };
    },
    think(st, p, o, dt, info) {
      const m = info.mst;
      if (!m || !m.pt || info.intro) return {};
      if (m.pt.state !== 'fly' && m.pt.state !== 'back' && m.pt.state !== 'landed') return {};
      const nd = MODES.ptero.needs(m);
      return p.id === m.flyer ? flyer(st, p, o, m, nd, dt, info) : hanger(st, p, o, m, nd, dt, info);
    },
  });
})();
