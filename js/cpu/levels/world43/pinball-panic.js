/* Pip & Bo - Computer partner brain for 43-2 Pinball Panic (mode 'arcadepinball', 3D, two glass pinballs). */
'use strict';

(() => {
  /* 43-2 Pinball Panic. It always plays its best (a team level). It reads the table (PINBALL_TABLE) and the switches,
     gates and balls the way a person sees them lit on screen. The plan, first that applies each step:
       LANE      in the plaza at the bottom of each part it takes whichever lane the person does not (two computers:
                 Pip left, Bo right) and never rolls into the lane the person has entered.
       OPENING   the person's next gate is worked by a switch in its own lane that it can reach: it goes and works it
                 as soon as the person is near their gate. A star it rolls over at once; a cup it sits in and holds for
                 as long as the person needs; a target bank it rolls along (again whenever targets pop back while the
                 person is below the stairs); a flipper button it presses once the person sits in the cradle (stepping
                 off and on again for another go); a spinner it rolls through fast, downhill when it can, and again
                 whenever the bridge is about to go while the person has not crossed; the detour lever it pulls the
                 moment the person holds the button.
       ITS OWN   its own gate open: it goes through. Shut: it waits somewhere safe and visible a little below it, looks
                 at the switch, and says what it needs in plain words once and again every 10 s ("Roll onto the star!",
                 "Sit in the cup for me!", "Knock the targets down!", "Press the button, I'm on the flipper!", "Roll
                 through the spinner fast!", "Hold the button!"). A ledge: it sits in the cradle first. The twin
                 flippers and the scoops: it sits and waits for the person, as long as it takes.
       WAITING   while it waits it collects stars within reach of its spot (never past its gate, never near a hole).
       SAVES     when the person drains and a save post in its section is close, it rolls onto it.
       HAZARDS   it keeps off a silver ball's lit track, steps off a roaming magnet's line (the detour button's lower
                 edge is out of the magnet's reach), and sits tight in a cup or cradle through a TILT warning.
     Steering: a grid path over the table round every solid, hole and shut gate (rebuilt every 0.3 s or when the goal
     moves), followed with a speed that arrives without overshooting on the slope. The stick is smoothed, and it never
     reverses its push more than about twice a second. It never fires a flipper before the person is seated, never
     bumps the person off a switch (it waits clear of the person's line) and stops helping after CPU.idleStop s with
     no presses from the person. */
  const hyp = Math.hypot, TB = PINBALL_TABLE, R = TB.T.R;
  const laneOf = x => (x < 0 ? -1 : 1);
  const PLAZA = [[-1, 10.5], [89, 96], [191.4, 197], [293.2, 299.4]];
  const inPlaza = d => PLAZA.some(([a, b]) => d > a && d < b);
  const railAt = d => TB.secAt(d).rail || TB.T.RAIL;
  const laneX = (lane, d) => lane * (TB.secAt(d).ramp ? 3.6 : railAt(d) < 8 ? 4.0 : 4.5);
  const C = id => TB.byId[id];
  const ASK = { star: 'Roll onto the star!', cup: 'Sit in the cup for me!', targets: 'Knock the targets down!', button: 'Press the button, I\'m on the flipper!',
    spinner: 'Roll through the spinner fast!', lever: 'Pull the lever, I\'m on the button!', kicker: 'Take the kicker up to the lever!', twin: 'Sit on your flipper!', scoop: 'Into your scoop!', mouth: 'Into the comet together!' };

  /* ---------- what blocks a ball, and what opens it ---------- */
  function passed(bl, b) {
    if (bl.kind === 'twin' || bl.kind === 'scoop') return b.d > bl.d + 2.5;
    if (bl.kind === 'cross' || bl.kind === 'detour') return b.d > bl.d + 2.5;
    return b.d > (bl.top || bl.d) + 0.3;
  }
  function isOpen(st, bl) {
    switch (bl.kind) {
      case 'gate': return !PINBALL.gateShut(st, bl.id);
      case 'stairs': return st.stairs[bl.id].latched || PINBALL.bankN(st, bl.by) >= 5;
      case 'ledge': return st.ledge[bl.id].latched;
      case 'gap': return PINBALL.bridgeOn(st, bl.id) && (st.bridge[bl.id].latched || st.bridge[bl.id].t > 2.0);
    }
    return false;
  }
  // a ball's next blocker in its lane (on the detour platform: the lever / the way down, handled apart)
  function nextBlocker(st, b) {
    const list = TB.blockers[laneOf(b.x)];
    for (const bl of list) if (!passed(bl, b)) return bl;
    return null;
  }
  const onPlatform = b => b.x < 0 && b.d > 236.4 && b.d < 247.0;

  /* ---------- the grid planner ---------- */
  const GS = 0.5;
  function plan(st, sx, sd, tx, td) {
    const rw = Math.max(railAt(sd), railAt(td));
    const d0 = Math.min(sd, td) - 6, d1 = Math.max(sd, td) + 6;
    const nx = Math.round(2 * rw / GS) + 1, nd = Math.round((d1 - d0) / GS) + 1;
    if (nx * nd > 9000) return null;
    const idx = (i, j) => j * nx + i;
    const cost = new Float32Array(nx * nd);
    for (let j = 0; j < nd; j++) for (let i = 0; i < nx; i++) {
      const x = -rw + i * GS, d = d0 + j * GS;
      let c = 1;
      if (!PINBALL.free(st, x, d, 0.06, 1)) c = 0;
      else if (PINBALL.inHole(st, x, d, 0.45)) c = 0;
      else if (PINBALL.inHole(st, x, d, 1.2)) c = 4;
      else { for (const p of TB.near(d).posts) if (p.kind === 'bumper' && hyp(x - p.x, d - p.d) < p.r + R + 0.9) { c = 2.5; break; } }
      cost[idx(i, j)] = c;
    }
    const cell = (x, d) => [Math.max(0, Math.min(nx - 1, Math.round((x + rw) / GS))), Math.max(0, Math.min(nd - 1, Math.round((d - d0) / GS)))];
    let [si, sj] = cell(sx, sd), [ti, tj] = cell(tx, td);
    // a goal inside a solid (a cup's rim, a pad by a post): the nearest open cell
    if (!cost[idx(ti, tj)]) { let best = null, bd = 1e9; for (let j = Math.max(0, tj - 6); j <= Math.min(nd - 1, tj + 6); j++) for (let i = Math.max(0, ti - 6); i <= Math.min(nx - 1, ti + 6); i++) if (cost[idx(i, j)]) { const dd = hyp(i - ti, j - tj); if (dd < bd) { bd = dd; best = [i, j]; } } if (!best) return null; [ti, tj] = best; }
    cost[idx(si, sj)] = cost[idx(si, sj)] || 1;
    const N = nx * nd, g = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), done = new Uint8Array(N);
    const open = [idx(si, sj)]; g[idx(si, sj)] = 0;
    const h = k => hyp((k % nx) - ti, Math.floor(k / nx) - tj);
    const goal = idx(ti, tj);
    let iter = 0;
    while (open.length && iter++ < 6000) {
      let bi = 0, bf = 1e9;
      for (let q = 0; q < open.length; q++) { const f = g[open[q]] + h(open[q]); if (f < bf) { bf = f; bi = q; } }
      const k = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (done[k]) continue;
      done[k] = 1;
      if (k === goal) break;
      const i = k % nx, j = Math.floor(k / nx);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= nd) continue;
        const kk = idx(ii, jj), c = cost[kk];
        if (!c || done[kk]) continue;
        if (di && dj && (!cost[idx(i + di, j)] || !cost[idx(i, j + dj)])) continue;
        const ng = g[k] + c * (di && dj ? 1.414 : 1);
        if (ng < g[kk]) { g[kk] = ng; from[kk] = k; open.push(kk); }
      }
    }
    if (from[goal] < 0 && goal !== idx(si, sj)) return null;
    const pts = [];
    for (let k = goal; k >= 0; k = from[k]) { pts.push([-rw + (k % nx) * GS, d0 + Math.floor(k / nx) * GS]); if (k === idx(si, sj)) break; }
    pts.reverse();
    return pts;
  }
  function clearLine(st, x0, d0, x1, d1) {
    const n = Math.ceil(hyp(x1 - x0, d1 - d0) / 0.35);
    for (let k = 1; k <= n; k++) { const u = k / n, x = x0 + (x1 - x0) * u, d = d0 + (d1 - d0) * u; if (!PINBALL.free(st, x, d, 0.05, 1) || PINBALL.inHole(st, x, d, 0.5)) return false; }
    return true;
  }

  /* ---------- steering ---------- */
  function steer(s, st, b, tx, td, o) {
    o = o || {};
    s.goal = [tx, td];
    // the path: straight if clear, else the grid
    let wx = tx, wd = td;
    const far = hyp(tx - b.x, td - b.d);
    if (far > 0.6 && !clearLine(st, b.x, b.d, tx, td)) {
      if (!s.path || s.pathT <= 0 || hyp(s.pathGoal[0] - tx, s.pathGoal[1] - td) > 0.8) { s.path = plan(st, b.x, b.d, tx, td); s.pathT = 0.3; s.pathGoal = [tx, td]; }
      if (s.path && s.path.length) {
        // look ahead: the furthest point we can see straight
        let pick = null;
        for (let k = Math.min(s.path.length - 1, 14); k >= 0; k--) { const q = s.path[k]; if (hyp(q[0] - b.x, q[1] - b.d) < 7 && clearLine(st, b.x, b.d, q[0], q[1])) { pick = q; break; } }
        if (!pick) pick = s.path[Math.min(1, s.path.length - 1)];
        while (s.path.length > 1 && hyp(s.path[0][0] - b.x, s.path[0][1] - b.d) < 0.8) s.path.shift();
        wx = pick[0]; wd = pick[1];
      }
    } else s.path = null;
    const dx = wx - b.x, dd = wd - b.d, dist = hyp(dx, dd) || 1e-6;
    const vmax = o.fast ? 9 : (o.v || 4.0);
    const finalDist = hyp(tx - b.x, td - b.d);
    const vwant = o.fast ? vmax : Math.min(vmax, Math.sqrt(2 * 3.2 * Math.max(0, finalDist - 0.15)));
    const ux = dx / dist, ud = dd / dist;
    let cx = (ux * vwant - b.vx) * 1.6, cd = (ud * vwant - b.vd) * 1.6 + PINBALL.S.SLOPE / PINBALL.S.ACC;
    if (o.fast) { cx = ux; cd = ud; }
    const m = hyp(cx, cd);
    if (m > 1) { cx /= m; cd /= m; }
    // smoothing (no shaking): a push that turns right round must wait a moment
    const k = Math.min(1, s.dt * 9);
    s.ax = (s.ax || 0) + (cx - (s.ax || 0)) * k; s.ad = (s.ad || 0) + (cd - (s.ad || 0)) * k;
    return { ax: s.ax, ay: -s.ad };
  }
  function hold(s, st, b, x, d) { return steer(s, st, b, x, d, { v: 2.4 }); }

  /* ---------- hazards to keep clear of ---------- */
  function looseDanger(st, b) {
    const warn = [];
    for (const L of TB.loose) {
      const t0 = st.looseOn[L.id];
      if (t0 == null) continue;
      const per = L.per / (PINBALL.helpOn(st, L.d0) ? PINBALL.S.HELP_SLOW : 1), c = (st.t - t0 + L.ph) % per;
      if (c > per - PINBALL.S.LOOSE_WARN - 0.4 && b.d < L.d0 + 1 && b.d > L.d1) warn.push(L.x);
    }
    for (const s of st.loose) if (s.d > b.d - 0.5 && s.d - b.d < 7) warn.push(s.x);
    return warn;
  }

  cpuBrain('arcadepinball', {
    reset(s) { s.lane = 0; s.part = -1; s.askT = -99; s.askWhat = ''; s.job = ''; s.btnOff = 0; s.spin = null; s.pathT = 0; },
    bubblePos(p) {
      const st = G.mst; if (!st || !st.balls) return null;
      const b = st.balls[p.id], q = K3D.toScreen(b.x, TB.yAt(b.d) + 2.6 + (b.mode === 'ride' ? (b.rideH || 0) : b.h), -b.d);
      return q.z < 1 ? { x: q.x, y: q.y } : null;
    },
    think(s, p, o, dt, info) {
      const st = info.mst, out = {};
      if (!st || !st.balls || st.phase !== 'play') return out;
      s.dt = dt; s.pathT -= dt;
      const b = st.balls[p.id], ob = st.balls[o.id], person = !info.partnerCpu;
      const say = (key, now) => {
        if (s.askWhat !== key) { s.askWhat = key; s.askT = -99; }
        if (st.t - s.askT >= 10 || now) { s.askT = st.t; cpuSay(p, ASK[key] || key, 2.4); }
      };
      // riding, draining, held: nothing to press
      if (b.mode === 'ride' || b.mode === 'drain' || b.mode === 'drop' || b.mode === 'kick' || b.mode === 'magnet') return out;
      // ---- the lane for this part ----
      const part = TB.partAt(b.d);
      if (part !== s.part) { s.part = part; s.lane = 0; }
      if (inPlaza(b.d) || !s.lane) {
        let lane;
        if (person && Math.abs(ob.x) > 0.5 && TB.partAt(ob.d) === part) lane = -laneOf(ob.x);
        else if (person) lane = s.lane || laneOf(b.x);
        else if (p.id === 1 && Math.abs(ob.x) > 0.5 && TB.partAt(ob.d) === part) lane = -laneOf(ob.x); // two computers: Bo takes the other side
        else lane = s.lane || laneOf(b.x) || (p.id === 0 ? -1 : 1);
        if (!inPlaza(b.d)) lane = laneOf(b.x); // past the divider: the lane is the one it is in
        s.lane = lane;
      }
      const lane = s.lane;
      // ---- in a seat: stay, or hop out ----
      if (b.mode === 'seat') {
        const c = C(b.seat);
        if (!c) return out;
        // the partner (back from a drain, say) is stuck below at a gate whose switch is back down in this lane: go and open it
        if (c.kind !== 'mouth' && c.kind !== 'scoop' && ob.mode !== 'drain' && laneOf(ob.x) !== laneOf(b.x) && TB.partAt(ob.d) === TB.partAt(b.d)) {
          const obl = nextBlocker(st, ob), ctl = obl && obl.by && C(obl.by);
          if (ctl && !isOpen(st, obl) && laneOf(ctl.x) === laneOf(b.x) && ctl.d < b.d - 1 && ob.d > obl.d - 16 && ['star', 'cup', 'targets', 'button', 'spinner'].includes(ctl.kind)) return { jump: 'tap', ay: 1 };
        }
        if (c.kind === 'cradle' || c.kind === 'scoop' || c.kind === 'mouth') return out; // the mouth, twin flippers, flippers for a friend and scoops: wait for the person
        if (st.tilt.warn > 0 || st.tilt.t > 0) return out;         // sit out a TILT
        // a cup: stay while the gate it holds is still needed by the partner
        const g = TB.gates.find(q => q.by === c.id);
        const needed = g && !st.gate[g.id].latched && laneOf(ob.x) === g.lane && ob.d < g.d + 1 && ob.mode !== 'drain';
        if (needed) { s.job = 'cup'; return out; }
        // not needed (or its own way is open): hop out toward its own goal
        return { jump: 'tap', ay: -1 };
      }
      // ---- the person drained: a save post close by ----
      if (ob.mode === 'drain' && (ob.t2 || 0) < PINBALL.S.DRAIN_T - 0.6) {
        const sec = TB.secAt(b.d);
        if (sec.save) {
          const sp = sec.save.find(q => laneOf(q[0]) === laneOf(b.x));
          if (sp && hyp(sp[0] - b.x, sp[1] - b.d) < 6) return steer(s, st, b, sp[0], sp[1], { v: 5 });
        }
      }
      // ---- not yet in its lane (the plaza): cross into it first ----
      if (inPlaza(b.d) && laneOf(b.x) !== lane) { const pl = PLAZA.find(([a, c2]) => b.d > a && b.d < c2); return steer(s, st, b, laneX(lane, b.d), Math.max(b.d, pl[0] + 3), { v: 4.5 }); }
      if (inPlaza(b.d) && Math.abs(b.x) < 1.6) return steer(s, st, b, laneX(lane, b.d), b.d + 1.5);
      let res = null;
      // ---- the detour platform ----
      if (onPlatform(b)) {
        const lev = C('lever');
        if (PINBALL.gateShut(st, 'gDet')) {
          const held = PINBALL.onPad(st, C('btnD'), 1.2);
          if (held) {
            // press: from a step away, then onto the lever
            if (hyp(b.x - lev.x, b.d - lev.d) < 1.15) res = steer(s, st, b, lev.x + 2.4, lev.d - 1.2, { v: 3 });
            else res = steer(s, st, b, lev.x, lev.d, { v: 3 });
          } else { res = hold(s, st, b, lev.x + 2.2, lev.d - 1.4); if (person) say('Hold the button!'); }
        } else { const k = C('detourOut'); res = steer(s, st, b, k.x, k.d, { v: 2.8 }); }
        return res;
      }
      // ---- opening for the partner ----
      const obl = nextBlocker(st, ob);
      const myBl = nextBlocker(st, b);
      const myTop = myBl && !isOpen(st, myBl) ? myBl.d - 0.4 : 1e9;
      const reach = c => c && laneOf(c.x) === laneOf(b.x) && c.d < myTop + 0.2 && TB.secAt(c.d).i >= Math.min(st.both, TB.secAt(b.d).i) && Math.abs(c.d - b.d) < 30;
      if (obl && laneOf(ob.x) !== laneOf(b.x) && ob.mode !== 'drain') {
        const ctl = obl.by && C(obl.by);
        const need = obl.kind !== 'twin' && obl.kind !== 'scoop' && obl.kind !== 'cross' && obl.kind !== 'mouth' && !isOpen(st, obl);
        if (need && ctl && reach(ctl)) {
          const near = ob.d > obl.d - 14;
          switch (ctl.kind) {
            case 'star': res = steer(s, st, b, ctl.x, ctl.d, { v: 4.2 }); s.job = 'star'; break;
            case 'cup': if (near || hyp(b.x - ctl.x, b.d - ctl.d) < 4) { res = steer(s, st, b, ctl.x, ctl.d, { v: 3.0 }); s.job = 'cup'; } break;
            case 'targets': if (near) { res = targets(s, st, b, ctl); s.job = 'targets'; } break;
            case 'button': {
              const cr = obl.cradle && C(obl.cradle), sitting = cr && PINBALL.seated(st, cr.id) === ob;
              const F = st.flip[obl.id];
              const onIt = hyp(b.x - ctl.x, b.d - ctl.d) < 1.25;
              if (sitting && F.ch <= 0 && F.cool <= 0) {
                // a fresh press: step off first if already on it
                if (onIt && s.btnOff <= 0) { s.btnOff = 0.7; }
                if (s.btnOff > 0) { s.btnOff -= dt; res = steer(s, st, b, ctl.x + (laneOf(b.x) * -1) * 2.4, ctl.d - 1.0, { v: 3 }); }
                else res = steer(s, st, b, ctl.x, ctl.d, { v: 3.5 });
              } else res = hold(s, st, b, ctl.x - laneOf(b.x) * 2.3, ctl.d - 1.2);
              s.job = 'button';
              break;
            }
            case 'spinner': {
              const br = st.bridge[obl.id];
              if ((near || ob.d > obl.d - 20) && br.t < 2.5) { res = spinner(s, st, b, ctl); s.job = 'spinner'; }
              break;
            }
            case 'lever': {
              // its lane has the kicker up to the lever (the detour): go
              const k = C('detour');
              if (k && laneOf(b.x) < 0 && b.d < 235.6) { res = steer(s, st, b, k.x, k.d, { v: 3 }); s.job = 'detour'; }
              break;
            }
          }
        }
      }
      if (res) return dodge(s, st, b, res, out);
      // ---- its own way ----
      s.job = 'own';
      if (!myBl) { const m = C('mouth'); return dodge(s, st, b, steer(s, st, b, m.x + laneOf(b.x) * 1.2, m.d, { v: 3 }), out); }
      const wx = laneX(laneOf(b.x), myBl.d);
      switch (myBl.kind) {
        case 'twin': case 'scoop': { const c = C(myBl.cradle || myBl.id); if (person && !PINBALL.seated(st, c.id) && hyp(b.x - c.x, b.d - c.d) < 3 && laneOf(ob.x) !== laneOf(b.x) && ob.mode !== 'seat') say(myBl.kind === 'twin' ? 'twin' : 'scoop'); res = steer(s, st, b, c.x, c.d, { v: 3.2 }); break; }
        case 'cross': case 'detour': {
          const k = C(myBl.id);
          if (PINBALL.kickerReady(st, k, b)) res = steer(s, st, b, k.x, k.d, { v: 3 });
          else res = hold(s, st, b, k.x, k.d - 3);
          break;
        }
        case 'mouth': { const m = C('mouth'); res = steer(s, st, b, m.x + laneOf(b.x) * 1.0, m.d + 0.4, { v: 3 }); break; }
        case 'ledge': {
          const c = C(myBl.cradle);
          res = steer(s, st, b, c.x, c.d, { v: 3 });
          if (person && hyp(b.x - c.x, b.d - c.d) < 2.5) say('button');
          break;
        }
        default: {
          if (isOpen(st, myBl)) {
            // through it: aim past the top
            const top = (myBl.top || myBl.d) + 2.6;
            res = steer(s, st, b, myBl.kind === 'gap' ? wx : wx, top, { v: myBl.kind === 'gap' ? 4.6 : 4.2 });
          } else {
            // wait below it, safe and visible; ask for the switch; collect stars meanwhile
            const ctl = myBl.by && C(myBl.by);
            let waitD = myBl.d - 2.8, waitX = wx;
            if (myBl.by === 'lever') { const bt = C('btnD'); waitX = bt.x; waitD = bt.d - 0.45; }
            const gx = waitX, gd = waitD;
            if (person && ctl) say(myBl.by === 'lever' ? (onPlatform(ob) ? 'lever' : 'kicker') : ctl.kind);
            const starAt = myBl.by === 'lever' ? null : nearStar(st, b, gd, myBl.d - 1.6);
            res = starAt ? steer(s, st, b, starAt[0], starAt[1], { v: 3.4 }) : hold(s, st, b, gx, gd);
          }
        }
      }
      return dodge(s, st, b, res, out);
    },
  });
  // a star near its waiting spot (never past its gate, never by a hole, not with a silver ball coming)
  function nearStar(st, b, gd, maxD) {
    let best = null, bd = 6;
    TB.stars.forEach((q, i) => {
      if (st.got[i] || q[2] > 0 || laneOf(q[0]) !== laneOf(b.x)) return;
      if (q[1] > maxD || q[1] < gd - 7) return;
      const dd = hyp(q[0] - b.x, q[1] - b.d);
      if (dd < bd && !PINBALL.inHole(st, q[0], q[1], 1.2) && PINBALL.free(st, q[0], q[1], 0.1, 1)) { bd = dd; best = q; }
    });
    return best;
  }
  // roll along a target bank (bumpers beside it help)
  function targets(s, st, b, c) {
    const xr = c.x + c.face * (0.38 + R - 0.08);
    if (!s.tgt || s.tgt.id !== c.id) s.tgt = { id: c.id, up: true };
    const lo = c.d - 1.4, hi = c.d1 + 1.0;
    if (s.tgt.up && b.d > hi - 0.4) s.tgt.up = false;
    else if (!s.tgt.up && b.d < lo + 0.4) s.tgt.up = true;
    const far = Math.abs(b.x - xr) > 1.2;
    if (far) return steer(s, st, b, xr, s.tgt.up ? lo : hi, { v: 4 });
    { const o = steer(s, st, b, xr - c.face * 0.15, s.tgt.up ? hi : lo, { v: 3.6 }); o.ax = (o.ax || 0) - c.face * 0.35; return o; }
  }
  // roll through a spinner fast: downhill from above when there is room, else uphill from below
  function spinner(s, st, b, c) {
    const x = c.x;
    if (!s.spin || s.spin.id !== c.id || st.t - s.spin.t > 8) {
      const topOk = PINBALL.free(st, x, c.d + 3.4, 0.2, 0) && !PINBALL.inHole(st, x, c.d + 3.4, 1);
      s.spin = { id: c.id, t: st.t, from: topOk && b.d > c.d - 1 ? 1 : (topOk && clearLine(st, b.x, b.d, x, c.d + 3.4) ? 1 : -1), run: false };
    }
    const sp = s.spin, start = c.d + sp.from * 3.4, end = c.d - sp.from * 3.2;
    if (!sp.run) {
      if (hyp(b.x - x, b.d - start) < 0.9 && hyp(b.vx, b.vd) < 1.5) sp.run = true;
      return steer(s, st, b, x, start, { v: 3.6 });
    }
    if ((sp.from > 0 && b.d < c.d - 1.2) || (sp.from < 0 && b.d > c.d + 1.2)) { s.spin = null; return steer(s, st, b, x, end, { v: 2 }); }
    return steer(s, st, b, x, end, { fast: true });
  }
  // keep off a silver ball's track and a magnet's line; hop a kerb in the way
  function dodge(s, st, b, res, out) {
    if (!res) return out;
    const warn = looseDanger(st, b);
    for (const x of warn) {
      if (Math.abs(b.x - x) < R + TB.T.LOOSE_R + 0.5) {
        const side = b.x >= x ? 1 : -1, lane = laneOf(b.x), rw = railAt(b.d) - 1.2;
        let tx = x + side * 2.3;
        if (Math.abs(tx) > rw || Math.abs(tx) < 1.25 || laneOf(tx) !== lane || !PINBALL.free(st, tx, b.d, 0.1, 1)) tx = x - side * 2.3;
        if (laneOf(tx) === lane && Math.abs(tx) <= rw + 0.01 && Math.abs(tx) >= 1.2) { res = Object.assign({}, res); res.ax = Math.sign(tx - b.x) * 0.9; }
        break;
      }
    }
    // the flood on the final ramp: the next silver ball coming down this half; roll to the clear side, wait
    // there if it is close, hop it if there is no time left to get out of the way
    if (st.floodOn && b.mode === 'roll') {
      const lane = laneOf(b.x), hit = (R + TB.T.LOOSE_R) * PINBALL.S.FLOOD_HIT;
      let next = null;
      for (const f of st.flood) if (f.half === lane && f.d > b.d - 0.6 && f.d - b.d < 9 && (!next || f.d < next.d)) next = f;
      if (next && Math.abs(b.x - next.x) < hit + 0.45) {
        const inner = Math.abs(next.x) < 3.3, tx = lane * (inner ? 4.3 : 1.9);
        const gap = next.d - b.d, need = (Math.abs(b.x - next.x) < hit + 0.45) ? Math.abs(tx - b.x) : 0;
        res = Object.assign({}, res);
        res.ax = Math.max(-1, Math.min(1, (tx - b.x) * 1.4));
        // close: stop climbing (hold against the slope) while it slides past; very close and still in line: hop
        if (gap < 4.5) res.ay = Math.max(res.ay || 0, gap < 2.5 ? 0.35 : -0.15);
        if (gap < 1.9 && gap > 0.6 && need > 0.8 && !b.air) res.jump = 'tap';
      }
    }
    // a magnet coming along its line toward it: step down off the line
    TB.magnets.forEach((M, k) => {
      const m = st.magnets[k];
      if (m.hold >= 0 || Math.abs(b.d - M.d) > 1.9 || m.cool > 0) return;
      const dx = b.x - m.x;
      if (Math.abs(dx) < 2.6 && Math.sign(dx) === m.dir) s.magUntil = st.t + 0.9; // (latched for a moment: no dithering on and off the line)
    });
    if (st.t < (s.magUntil || 0)) { res = Object.assign({}, res); res.ay = Math.max(res.ay || 0, 0.7); res.ax = (res.ax || 0) * 0.3; }
    // a kerb just ahead: hop it
    for (const w of TB.near(b.d).walls) {
      if (w.kind !== 'kerb' || b.air || !s.goal) continue;
      const kd = w.a[1], near = PINBALL.segDist(b.x, b.d, w.a[0], w.a[1], w.b[0], w.b[1]) < R + w.r + 0.45;
      if (near && Math.sign(s.goal[1] - kd) !== Math.sign(b.d - kd)) { res = Object.assign({ jump: 'tap' }, res); res.ay = -Math.sign(s.goal[1] - kd); break; }
    }
    return res;
  }
})();
