/* Pip & Bo - Level 42-1 Runaway Coaster (team, World 42 Midnight Theme Park, 3D). */
'use strict';

/* ===== 42-1 Runaway Coaster (mode 'parkcoaster', team, view3d, one continuous ride) =====
   Pip and Bo climb into the front car of the Comet, Starlight Park's big old coaster, just to sit in it. The lap bar
   clacks down, the chain catches, and the ride sets off with nobody in the booth. They ride it through the whole lit-up
   park until they can pull the big brake levers at the station. Pip sits on the LEFT, Bo on the RIGHT, all level.

   The track carries the train (PARKCOASTER_ROUTE, parkcoaster-route.js): its speed is the track's job. The riders:
     LEAN   ◀ ▶ each. The car's tilt is the sum: one rider half, both the same way full, opposite leans cancel (eased
            S.EASE). Banked bends show an arrow board: one chevron needs a half tilt (or more), two gold chevrons both.
            Ridden right: the car hugs the rail (sparks, a small speed burst). Wrong for over S.BEND_WRONG s: it lifts
            onto two wheels, screeches, a Rattle. On a straight a full tilt held S.TIP_T tips the car up onto one side's
            wheels, narrowing it past things leaning in from the other side (scaffolding, a hook). Leaning also reaches:
            tickets out to the left (Pip) or right (Bo) are taken by the rider on that side leaning out; the far ones
            (lat 2) need the full tilt.
     HOP    jump: both within S.HOP_WIN of each other and the train hops (S.HOP_AIR s of air) over missing track. One
            alone is a little bunny hop that is not enough (the nose dips, so it is clear the other is needed).
     DUCK   hold ▼: each rider ducks their own head under low boards, bunting, a tunnel lip.
     LEVERS the action: that rider's arm swings out on their own side. Track switches (Pip's on the left, Bo's on the
            right; a red lamp means the points are set the wrong way): hit it in its zone to turn it green. Missed, the
            train takes a short rough detour beside the main line (bumps, a Rattle, no tickets) and rejoins. Bells and
            targets give bonus tickets. At the end both hit their own brake lever as the train passes the brake house; a
            miss sends it round the short station loop and the levers come again (no penalty).
     HANDS UP  At a camera sign before a big drop, pressing nothing for its first second throws both riders' arms up:
            the photo flashes and gives bonus tickets.
   RATTLES: a mistake (a bend ridden wrong, a bonk on the head, a gap hit, a thing leaned into, a detour) is a bang,
   sparks, a bolt pinging off: the HUD's bolts go down by one and the train cannot Rattle again for S.SAFE s. Photo
   arches (on the track, about every 20 s) tighten every bolt back and set the restart point. Losing every bolt before
   the next arch is a BREAKDOWN: a wheel comes off, a wind-up mechanic whirrs up, and the train is winched back to the
   last arch (tickets kept). Two Breakdowns from the same arch: gold help, five bolts until two more arches are passed,
   announced ("The mechanic added extra bolts"). Nothing can lock: the track always carries the train on.
   Only the boarding before control starts and the stop at the station are not played (jump skips them).
   One room in the game's sense; the four stretches are places along the rail (never cards).
   State lives in G.mst; the rules never read the renderer (K3D.noRender plays the same). Names are prefixed parkcoaster. */

const PARKCOASTER = (function () {
  const PR = PARKCOASTER_ROUTE, R = PR.R, L = PR.lists;
  const S = {
    EASE: 0.2, TIP_T: 0.18, TIP_FULL: 0.92, HALF: 0.42, BEND_WRONG: 0.75, BURST: 0.1, BURST_T: 1.0,
    HOP_WIN: 0.3, HOP_AIR: 1.0, HOP_H: 1.5, BUNNY_AIR: 0.34, BUNNY_H: 0.28, GAP_CLEAR: 0.3,
    ARM_T: 0.35, LEVER_PRE: 1.4, LEVER_MIN: 6, LEVER_POST: 0.6, BRAKE_PRE: 1.2,
    SAFE: 1.5, BOLTS: 3, GOLD_BOLTS: 5, GOLD_ARCHES: 2, BD_STOP: 1.0, BD_FIX: 2.0, BD_WINCH: 2.0,
    CAM_QUIET: 1.0, PHOTO_TICKETS: 5, BELL_TICKETS: 3, TICKET_DS: 0.7,
    BOARD_T: 7.5, STOP_T: 5.5,
  };
  const CO = {};
  CO.S = S;
  const sgn = x => (x > 0 ? 1 : x < 0 ? -1 : 0);
  // the most tickets a run can collect (the medal's 100%)
  CO.ticketsMax = () => L.tickets.length + L.cams.length * S.PHOTO_TICKETS + L.levers.filter(l => l.kind === 'bell' || l.kind === 'target').length * S.BELL_TICKETS;

  /* ---------- what each rider presses ---------- */
  function leanOf(p) {
    const i = p.input || {};
    if (Math.abs(i.ax || 0) > 0.35) return sgn(i.ax);
    return (i.right ? 1 : 0) - (i.left ? 1 : 0);
  }
  const duckOf = p => !!(p.input && (p.input.down || (p.input.ay || 0) > 0.55));
  const anyPress = p => { const i = p.input || {}; return !!(i.left || i.right || i.down || i.jump || i.act || Math.abs(i.ax || 0) > 0.35 || Math.abs(i.ay || 0) > 0.55); };

  /* ---------- the stretch a place is in ---------- */
  CO.partAt = s => { let k = 0; for (let i = 0; i < L.parts.length; i++) if (s >= L.parts[i].s) k = i; return k; };
  CO.partNames = L.parts.map(p => p.name);

  function fresh(st) {
    Object.assign(st, {
      phase: 'board', t: 0, phaseT: 0, s: 0, v: 0, det: -1, ds: 0, burst: 0, burstT: 0,
      lean: [0, 0], tilt: 0, tipT: 0, tipped: 0, duck: [false, false], arm: [0, 0], armUp: [0, 0],
      air: 0, airT: -1, airDur: 0, airH: 0, full: false, hopFirst: -1, hopWinT: 0, hops: 0, bunny: 0,
      bolts: S.BOLTS, maxBolts: S.BOLTS, safe: 0, rattles: 0, rattleAt: [0, 0, 0, 0], breakdowns: 0, bd: null,
      restart: PR.START, archI: 0, sameArch: 0, lastBdArch: -1, gold: 0, goldMsgT: -99, goldN: 0,
      tickets: 0, got: L.tickets.map(() => false), photos: 0, camsSeen: 0, camWin: null, bells: 0, switches: 0, thrown: {},
      bendState: {}, bendsGood: 0, says: [], fx: [], brake: [false, false], brakeLoops: 0, lastWhy: '',
      bonk: [0, 0], screech: 0, hug: 0, clack: 0, flash: 0, sparksT: 0, wheelOff: 0,
      prevS: 0, started: false, finished: false, gapHit: {},
    });
  }
  // how far ahead of a lever its zone opens (a press inside it hits the lever): bells and targets set their own (short,
  // so a row of targets needs a press each), switches open about 1.4 s ahead, the brakes 1.2 s
  CO.leverPre = (lv, v) => (lv.pre != null ? lv.pre : lv.kind === 'brake' ? Math.max(4, v * S.BRAKE_PRE) : Math.max(S.LEVER_MIN, v * S.LEVER_PRE));
  // the train's place: on the main line or a detour
  CO.frame = st => (st.det >= 0 ? PR.dets[st.det].at(st.ds) : R.at(st.s));

  /* ---------- Rattles and Breakdowns ---------- */
  function rattle(st, why, who) {
    if (st.safe > 0 || st.phase !== 'ride') return false;
    st.safe = S.SAFE; st.rattles++; st.bolts--; st.lastWhy = why;
    st.rattleAt[CO.partAt(st.s)]++;
    st.fx.push({ k: 'rattle', t: st.t, why, who });
    Sfx.play('parkcoasterRattle');
    G.shake = Math.max(G.shake || 0, 0.35);
    if (typeof rumble === 'function') { rumble(0, 0.5, 0.6, 180); rumble(1, 0.5, 0.6, 180); }
    if (st.bolts <= 0) breakdown(st);
    return true;
  }
  function breakdown(st) {
    st.breakdowns++; st.phase = 'breakdown'; st.phaseT = 0;
    st.bd = { from: st.s, v0: st.v, arch: st.restart };
    st.wheelOff = 1;
    if (st.lastBdArch === st.restart) st.sameArch++; else { st.sameArch = 1; st.lastBdArch = st.restart; }
    st.fx.push({ k: 'breakdown', t: st.t });
    Sfx.play('parkcoasterBreakdown');
  }
  function restartAt(st) {
    st.phase = 'ride'; st.phaseT = 0; st.det = -1; st.ds = 0;
    st.s = st.restart; st.prevS = st.s; st.v = R.at(st.s).v;
    if (st.sameArch >= 2 && st.gold <= 0) { st.gold = S.GOLD_ARCHES; st.maxBolts = S.GOLD_BOLTS; st.goldMsgT = st.t; st.goldN++; }
    st.bolts = st.maxBolts; st.safe = 2.0; st.wheelOff = 0;
    st.air = 0; st.airT = -1; st.full = false; st.hopFirst = -1; st.tilt = 0; st.tipT = 0; st.tipped = 0;
    st.camWin = null; st.bendState = {}; st.brake = [false, false]; st.gapHit = {};
    // levers between the arch and here come again (switches thrown stay thrown)
    Sfx.play('parkcoasterRatchet');
  }

  /* ---------- one step of the ride ---------- */
  function ride(st, dt) {
    const ps = G.players;
    // the riders' presses
    for (const p of ps) { st.lean[p.id] = leanOf(p); st.duck[p.id] = duckOf(p); }
    const want = (st.lean[0] + st.lean[1]) / 2;
    const was = st.tilt;
    st.tilt += Math.max(-dt / S.EASE, Math.min(dt / S.EASE, want - st.tilt));
    if (Math.abs(was) < 0.4 && Math.abs(st.tilt) >= 0.4) Sfx.play('parkcoasterLean');
    // hop: the first press starts a bunny hop and opens the window; the other inside it makes it a full hop
    st.hopWinT -= dt;
    for (const p of ps) {
      if (!p.pendingJump) continue;
      p.pendingJump = false;
      if (st.full && st.airT >= 0) continue;
      if (st.hopFirst >= 0 && st.hopFirst !== p.id && st.hopWinT > 0) {
        st.full = true; st.airT = 0; st.airDur = S.HOP_AIR; st.airH = S.HOP_H; st.hopFirst = -1; st.hops++;
        Sfx.play('parkcoasterHop');
      } else if (st.airT < 0) {
        st.hopFirst = p.id; st.hopWinT = S.HOP_WIN; st.full = false; st.airT = 0; st.airDur = S.BUNNY_AIR; st.airH = S.BUNNY_H; st.bunny = 1;
        Sfx.play('parkcoasterBunny');
      } else if (st.hopFirst === p.id) st.hopWinT = S.HOP_WIN;
    }
    if (st.airT >= 0) {
      st.airT += dt;
      const u = st.airT / st.airDur;
      st.air = u >= 1 ? 0 : st.airH * 4 * u * (1 - u);
      if (u >= 1) { if (st.full) Sfx.play('parkcoasterLand'); st.airT = -1; st.full = false; st.air = 0; }
    }
    st.bunny = Math.max(0, st.bunny - dt * 2.5);
    // arms (levers, bells, brakes): a fresh press swings the arm out on that rider's side
    for (const p of ps) { st.arm[p.id] = Math.max(0, st.arm[p.id] - dt); if (p.pendingAct) { p.pendingAct = false; st.arm[p.id] = S.ARM_T; Sfx.play('parkcoasterSwing'); } }
    // tip onto one rail: a full tilt held on a straight (not in a bend's core)
    const inBend = L.bends.some(b => st.s > b.s0 && st.s < b.s1);
    if (Math.abs(st.tilt) >= S.TIP_FULL && !inBend && st.det < 0) { st.tipT += dt; if (st.tipT >= S.TIP_T && !st.tipped) { st.tipped = sgn(st.tilt); Sfx.play('parkcoasterTip'); } }
    else { st.tipT = 0; st.tipped = 0; }
    // forward along the track
    st.burstT -= dt; if (st.burstT <= 0) st.burst = Math.max(0, st.burst - dt * 0.2);
    st.safe -= dt;
    if (st.det >= 0) {
      const D = PR.dets[st.det];
      st.v = D.at(st.ds).v; st.ds += st.v * dt;
      if (!st.detHit && st.ds > D.len * 0.45) { st.detHit = true; rattle(st, 'detour'); }
      if (st.ds >= D.len) { st.det = -1; st.s = D.s1; st.prevS = st.s; }
      // a detour that loops back (the station loop) brings the brake levers round again
      return;
    }
    st.v = R.at(st.s).v * (1 + st.burst);
    st.prevS = st.s; st.s += st.v * dt;
    events(st, st.prevS, st.s, dt);
  }

  /* ---------- what the train passes ---------- */
  const crossed = (x, a, b) => x > a && x <= b;
  function events(st, a, b, dt) {
    const ps = G.players;
    // photo arches: bolts back, the restart point
    for (const s of L.arches) if (crossed(s, a, b)) {
      if (s > st.restart + 0.01) { st.sameArch = 0; if (st.gold > 0 && --st.gold === 0) st.maxBolts = S.BOLTS; }
      st.restart = s; st.bolts = st.maxBolts;
      st.fx.push({ k: 'arch', t: st.t, s }); Sfx.play('parkcoasterFlash'); Sfx.play('parkcoasterRatchet');
    }
    // the loudspeaker
    for (const sy of L.says) if (crossed(sy.s, a, b)) { st.says.push({ text: sy.text, t: st.t, s: sy.s }); Sfx.play('parkcoasterTannoy'); }
    // banked bends: the tilt must be right (half or full, the right way) through the bend's core
    for (let i = 0; i < L.bends.length; i++) {
      const bd = L.bends[i];
      if (b < bd.s0 || a > bd.s1 + 1) continue;
      const bs = st.bendState[i] || (st.bendState[i] = { wrong: 0, failed: false, done: false });
      if (b > bd.s0 && a < bd.s1) {
        const ok = sgn(st.tilt) === bd.dir && Math.abs(st.tilt) >= (bd.need === 2 ? S.TIP_FULL : S.HALF);
        if (!ok) bs.wrong += dt;
        if (!bs.failed && bs.wrong > S.BEND_WRONG) { bs.failed = true; st.screech = 0.8; Sfx.play('parkcoasterScreech'); rattle(st, 'bend'); }
      }
      if (!bs.done && crossed(bd.s1, a, b)) {
        bs.done = true;
        if (!bs.failed) { st.bendsGood++; st.burst = S.BURST; st.burstT = S.BURST_T; st.hug = 0.8; Sfx.play('parkcoasterHug'); }
      }
    }
    // low things across the riders' heads: each must be ducking
    for (const d of L.ducks) if (crossed(d.s, a, b)) {
      const who = d.who === 'both' ? [0, 1] : [d.who];
      const hit = who.filter(k => !st.duck[k]);
      if (hit.length) { for (const k of hit) st.bonk[k] = 1.2; Sfx.play('parkcoasterBonk'); rattle(st, 'bonk', hit); }
      else Sfx.play('parkcoasterDuck');
    }
    // things leaning in from one side: the car must be tipped the other way
    for (const tp of L.tips) if (crossed(tp.s, a, b)) {
      if (st.tipped !== tp.dir) { Sfx.play('parkcoasterBonk'); rattle(st, 'tip'); }
      else Sfx.play('parkcoasterWhoosh');
    }
    // missing track: in the air over the gap (a full hop)
    for (let i = 0; i < L.hops.length; i++) { const h = L.hops[i]; if (!(b > h.s0 + 0.15 && a < h.s1 - 0.15)) continue;
      if (!(st.full && st.air > S.GAP_CLEAR) && !st.gapHit[i]) { st.gapHit[i] = 1; rattle(st, 'gap'); st.air = 0.4; st.airT = 0; st.airDur = 0.3; st.airH = 0.4; Sfx.play('parkcoasterClunk'); }
    }
    for (let i = 0; i < L.hops.length; i++) if (crossed(L.hops[i].s1 + 2, a, b)) st.gapHit[i] = 0;
    // levers: switches, bells and targets, the brakes; a rider's arm out inside the zone hits their own side's
    for (let i = 0; i < L.levers.length; i++) {
      const lv = L.levers[i], pre = CO.leverPre(lv, st.v);
      if (b < lv.s - pre || a > lv.s + S.LEVER_POST) continue;
      const key = i;
      if (lv.kind === 'brake') {
        if (st.arm[lv.side] > S.ARM_T - 0.02 && b <= lv.s + S.LEVER_POST) { if (!st.brake[lv.side]) { st.brake[lv.side] = true; Sfx.play('parkcoasterLever'); } }
        continue;
      }
      if (st.thrown[key]) continue;
      if (st.arm[lv.side] > S.ARM_T - 0.02) {
        st.thrown[key] = true;
        if (lv.kind === 'switch' || lv.kind === 'rocket') { st.switches++; Sfx.play('parkcoasterLever'); Sfx.play('parkcoasterPoints'); }
        else { st.bells++; st.tickets += S.BELL_TICKETS; Sfx.play('parkcoasterBell'); st.fx.push({ k: 'bell', t: st.t, i }); }
      }
    }
    // the runaway rocket: thrown in time, the points behind the train send it up the siding (it goes off there);
    // missed, it catches the last car (a Rattle) and goes off on the track behind
    for (let i = 0; i < L.levers.length; i++) {
      const lv = L.levers[i];
      if (lv.kind !== 'rocket' || !crossed(lv.fork, a, b)) continue;
      if (st.thrown[i]) { st.fx.push({ k: 'rocketOff', t: st.t, i }); Sfx.play('parkcoasterFirework'); }
      else { st.fx.push({ k: 'rocketHit', t: st.t, i }); Sfx.play('parkcoasterFirework'); rattle(st, 'rocket'); }
    }
    // a switch passed unthrown: the points send the train down its detour
    for (let i = 0; i < L.levers.length; i++) {
      const lv = L.levers[i];
      if (lv.kind !== 'switch' || st.thrown[i] || !crossed(lv.fork, a, b)) continue;
      st.det = lv.det; st.ds = 0; st.detHit = false; Sfx.play('parkcoasterPoints');
      st.fx.push({ k: 'detour', t: st.t, i });
      return;
    }
    // the brake house: both levers pulled as the train passes, or round the station loop again
    if (crossed(PR.at.brake + S.LEVER_POST, a, b)) {
      if (st.brake[0] && st.brake[1]) { st.phase = 'stop'; st.phaseT = 0; st.stopFrom = st.s; st.stopV = st.v; Sfx.play('parkcoasterBrake'); }
      else if (PR.stationLoop != null) { st.brakeLoops++; st.det = PR.stationLoop; st.ds = 0; st.detHit = true; st.brake = [false, false]; st.says.push({ text: 'Round again! Both pull your brake lever!', t: st.t }); }
    }
    // hands up: a camera sign before a big drop; press nothing for its first second
    for (const cm of L.cams) if (crossed(cm.s, a, b)) { st.camWin = { t: 0, quiet: true, cm }; st.camsSeen++; }
    if (st.camWin) {
      st.camWin.t += dt;
      if (ps.some(anyPress)) st.camWin.quiet = false;
      if (st.camWin.t >= S.CAM_QUIET) {
        if (st.camWin.quiet) { st.photos++; st.tickets += S.PHOTO_TICKETS; st.flash = 1; st.armUp = [2.2, 2.2]; Sfx.play('parkcoasterFlash'); Sfx.play('parkcoasterWhee'); st.fx.push({ k: 'photo', t: st.t }); }
        st.camWin = null;
      }
    }
    // tickets: over the track (just ride), out to a side (that side's rider leaning out; lat 2 needs the full tilt),
    // or in the air over a gap (a hop)
    for (let i = 0; i < L.tickets.length; i++) {
      const tk = L.tickets[i];
      if (st.got[i] || tk.s > b + S.TICKET_DS) { if (tk.s > b + 2) break; continue; }
      if (tk.s < a - S.TICKET_DS) continue;
      let ok;
      if (tk.lat === 0) ok = !tk.air || st.air > 0.6;
      else {
        const side = tk.lat < 0 ? 0 : 1, dir = sgn(tk.lat);
        ok = Math.abs(tk.lat) >= 2 ? sgn(st.tilt) === dir && Math.abs(st.tilt) >= S.TIP_FULL : st.lean[side] === dir;
        if (tk.air) ok = ok && st.air > 0.6;
      }
      if (ok && Math.abs(tk.s - b) < S.TICKET_DS) { st.got[i] = true; st.tickets++; st.fx.push({ k: 'ticket', t: st.t, i }); Sfx.play('parkcoasterTicket'); }
    }
    // arms thrown up on a fast drop when nothing is pressed (the look only)
    const f = R.at(st.s);
    for (const p of ps) if (st.v > 11 && f.pitch < -0.25 && !anyPress(p)) st.armUp[p.id] = Math.max(st.armUp[p.id], 0.3);
  }

  /* ---------- the level ---------- */
  function step(st, dt) {
    const ps = G.players;
    st.t += dt; st.phaseT += dt;
    for (const k of [0, 1]) { st.bonk[k] = Math.max(0, st.bonk[k] - dt); st.armUp[k] = Math.max(0, st.armUp[k] - dt); }
    st.screech = Math.max(0, st.screech - dt); st.hug = Math.max(0, st.hug - dt); st.flash = Math.max(0, st.flash - dt * 1.5);
    while (st.fx.length && st.t - st.fx[0].t > 3) st.fx.shift();
    while (st.says.length > 4) st.says.shift();
    K3D.heading = Math.atan2(-CO.frame(st).t[0], -CO.frame(st).t[2]);
    if (st.phase === 'board') {
      // the boarding: they hop in, the clock strikes twelve, the park lights up in a wave, the bar drops, it rolls out
      const skip = ps.some(p => p.pendingJump);
      for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
      if (skip && st.phaseT > 0.4) st.phaseT = Math.max(st.phaseT, S.BOARD_T);
      if (st.phaseT >= S.BOARD_T - 2.2) { st.s += Math.max(0.8, R.at(st.s).v) * dt * (st.phaseT >= S.BOARD_T ? 3 : 1); }
      if (st.phaseT >= S.BOARD_T - 2.2 && !st.barDown) { st.barDown = true; Sfx.play('parkcoasterBar'); }
      if (st.s >= PR.START || (skip && st.phaseT >= S.BOARD_T)) {
        if (st.s < PR.START) st.s = PR.START;
        st.phase = 'ride'; st.phaseT = 0; st.started = true; st.prevS = st.s; st.barDown = true;
        events(st, 0, st.s, dt);
      }
      return;
    }
    if (st.phase === 'ride') return ride(st, dt);
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
    if (st.phase === 'breakdown') {
      // a wheel off: the train grinds to a stop, the mechanic whirrs up with a spanner, then the winch takes it back
      const T0 = S.BD_STOP, T1 = T0 + S.BD_FIX, T2 = T1 + S.BD_WINCH;
      if (st.phaseT < T0) { const k = 1 - st.phaseT / T0; st.v = st.bd.v0 * k; st.s += st.v * dt; }
      else st.v = 0;
      if (st.phaseT >= T0 && !st.bd.robot) { st.bd.robot = true; Sfx.play('parkcoasterRobot'); }
      if (st.phaseT >= T1 && !st.bd.winch) { st.bd.winch = true; st.bd.at = st.s; Sfx.play('parkcoasterWinch'); }
      if (st.phaseT >= T1) { const u = Math.min(1, (st.phaseT - T1) / S.BD_WINCH); st.s = st.bd.at + (st.restart - st.bd.at) * (u * u * (3 - 2 * u)); }
      if (st.phaseT >= T2) restartAt(st);
      return;
    }
    if (st.phase === 'stop') {
      // the brakes bite: a slide to a stop a hand from the buffers, the lap bar pops up, the finale fireworks
      const dist = PR.END - st.stopFrom, u = Math.min(1, st.phaseT / 2.2);
      st.s = st.stopFrom + dist * (1 - Math.pow(1 - u, 2.2)); st.v = st.stopV * Math.pow(1 - u, 1.2);
      if (st.phaseT > 2.4 && !st.barUp) { st.barUp = true; Sfx.play('parkcoasterBar'); }
      const skip = ps.some(p => p.pendingJump);
      if ((st.phaseT >= S.STOP_T || (skip && st.phaseT > 1)) && !st.finished) { st.finished = true; st.phase = 'done'; levelClear(); }
    }
  }

  /* ---------- the HUD: tickets, bolts, the tilt gauge ---------- */
  function hudBolt(x, y, on, gold) {
    ctx.save(); ctx.translate(x, y);
    ctx.globalAlpha = on ? 1 : 0.28;
    ctx.fillStyle = gold ? '#ffd24a' : '#d8d4e6'; ctx.strokeStyle = '#2a2235'; ctx.lineWidth = 1.6;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a2235'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function hudTicket(x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.15); ctx.scale(s, s);
    ctx.fillStyle = '#ffd24a'; ctx.strokeStyle = '#7a5410'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-11, -6); ctx.lineTo(11, -6); ctx.arc(11, 0, 2.6, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(11, 6); ctx.lineTo(-11, 6); ctx.arc(-11, 0, 2.6, Math.PI / 2, -Math.PI / 2, true); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(122,84,16,0.6)'; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(5, -5); ctx.lineTo(5, 5); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#7a5410'; ctx.font = '700 7px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ADMIT', -3, 0.5);
    ctx.restore();
  }
  function hud(st) {
    if (st.noHud) return;
    // tickets (top left)
    const tt = String(st.tickets);
    ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tt).width + 52;
    pill(14, 46, tw, 30); hudTicket(34, 61, 1); text(tt, 52, 61.5, 15, C.paper, 'left', 'body');
    // the bolts (three, five in gold while the mechanic's extra bolts last)
    const n = st.maxBolts, x0 = 14, y0 = 82;
    pill(x0, y0, 16 + n * 22, 30);
    for (let i = 0; i < n; i++) hudBolt(x0 + 19 + i * 22, y0 + 15, i < st.bolts, st.gold > 0);
    // the tilt gauge: a car that tips, ticks at half and full each way
    const gx = W / 2, gy = H - 34, cpu1 = cpuSolo();
    ctx.fillStyle = 'rgba(23,25,29,0.72)'; rr(gx - 92, gy - 22, 184, 44, 22); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(gx, gy + 34, 44, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    for (const k of [-1, -0.5, 0.5, 1]) {
      const a = -Math.PI / 2 + k * 0.62, full = Math.abs(k) === 1;
      const lit = Math.sign(st.tilt) === Math.sign(k) && Math.abs(st.tilt) >= Math.abs(k) - 0.05;
      ctx.strokeStyle = lit ? (full ? '#ffd24a' : '#fff6dc') : 'rgba(255,255,255,0.35)'; ctx.lineWidth = full ? 4 : 3;
      ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * 40, gy + 34 + Math.sin(a) * 40); ctx.lineTo(gx + Math.cos(a) * 50, gy + 34 + Math.sin(a) * 50); ctx.stroke();
      if (full) { ctx.fillStyle = lit ? '#ffd24a' : 'rgba(255,255,255,0.35)'; ctx.font = '700 9px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(k < 0 ? '«' : '»', gx + Math.cos(a) * 60, gy + 37 + Math.sin(a) * 58); }
    }
    ctx.save(); ctx.translate(gx, gy + 6); ctx.rotate(st.tilt * 0.62);
    ctx.fillStyle = '#f4ecd8'; ctx.strokeStyle = '#2a2235'; ctx.lineWidth = 1.5; rr(-15, -9, 30, 11, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PCOL[0]; ctx.beginPath(); ctx.arc(-6, -11, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PCOL[1]; ctx.beginPath(); ctx.arc(6, -11, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a2235'; ctx.beginPath(); ctx.arc(-9, 3, 2.6, 0, Math.PI * 2); ctx.arc(9, 3, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // which way each rider leans (a dot each side of the gauge in their colour)
    for (const k of [0, 1]) {
      const x = k === 0 ? gx - 76 : gx + 76;
      ctx.fillStyle = PCOL[k]; ctx.globalAlpha = 0.95; circle(x, gy, 9); ctx.fill(); ctx.globalAlpha = 1;
      text(NAMES[k][0], x, gy + 1, 11, '#fff', 'center', 'body');
      const l = st.lean[k];
      if (l) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + l * 17, gy); ctx.lineTo(x + l * 11, gy - 5); ctx.lineTo(x + l * 11, gy + 5); ctx.closePath(); ctx.fill(); }
      if (st.duck[k]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x, gy + 17); ctx.lineTo(x - 5, gy + 12); ctx.lineTo(x + 5, gy + 12); ctx.closePath(); ctx.fill(); }
    }
    void cpu1;
    // the gold help banner
    if (st.t - st.goldMsgT < 4) {
      const a = Math.min(1, (4 - (st.t - st.goldMsgT)) * 2);
      ctx.save(); ctx.globalAlpha = a; ctx.font = '700 18px "Atkinson Hyperlegible", system-ui, sans-serif';
      const m = 'The mechanic added extra bolts', mw = ctx.measureText(m).width + 40;
      ctx.fillStyle = 'rgba(120,84,10,0.92)'; rr(W / 2 - mw / 2, 120, mw, 36, 18); ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke();
      text(m, W / 2, 138.5, 18, '#ffe9a8', 'center', 'body'); ctx.restore();
    }
  }

  CO.fresh = fresh; CO.step = step; CO.hud = hud; CO.rattle = rattle; CO.leanOf = leanOf; CO.duckOf = duckOf; CO.anyPress = anyPress; CO.events = events;
  return CO;
})();

/* ---------- MODES.parkcoaster ---------- */
MODES.parkcoaster = {
  medals: { bronze: 'Stop the coaster', goals: [{ key: 'tickets', gold: 0.85, silver: 0.55, more: true, pct: true, word: 'the tickets' }, { key: 'rattles', gold: 3, silver: 9, word: 'rattle' }] },
  medalValues() { const st = G.mst; return { tickets: Math.min(1, st.tickets / PARKCOASTER.ticketsMax()), rattles: st.rattles }; },
  scene3dOpts: { bg: '#0d0d24', fov: 56, near: 0.2, far: 1600 },
  setup(st) { PARKCOASTER.fresh(st); for (const p of G.players) p.alive = true; },
  step(dt) { PARKCOASTER.step(G.mst, dt); },
  hud() { PARKCOASTER.hud(G.mst); },
  // the 3D scenery, car and camera (js/levels/world42/parkcoaster-scenery.js, loaded with the 3D kit)
  scene3d(K) { if (window.PARKCOASTER_SCENE || typeof PARKCOASTER_SCENE !== 'undefined') PARKCOASTER_SCENE.build(K, G.mst); },
  draw3d(K, dt) { if (typeof PARKCOASTER_SCENE !== 'undefined') PARKCOASTER_SCENE.update(K, G.mst, dt); },
  drawTop() { if (typeof PARKCOASTER_SCENE !== 'undefined') PARKCOASTER_SCENE.drawTop(G.mst); },
  resultTitle() { return 'The Comet has stopped!'; },
  stats() {
    const st = G.mst, names = PARKCOASTER.partNames;
    const out = [
      { label: 'Tickets', value: st.tickets + ' of ' + PARKCOASTER.ticketsMax() },
      { label: 'Rattles', value: String(st.rattles) },
      { label: 'Breakdowns', value: String(st.breakdowns) },
      { label: 'Switches thrown', value: String(st.switches) },
    ];
    let worst = -1, wn = 0; st.rattleAt.forEach((n, k) => { if (n > wn) { wn = n; worst = k; } });
    out.push(worst >= 0 ? 'Most Rattles on ' + names[worst] + ' (' + wn + ').' : 'Not a single Rattle. Smooth riders!');
    if (st.photos >= PARKCOASTER_ROUTE.lists.cams.length) out.push('Arms up on every drop.');
    if (st.goldN) out.push('Gold help: the mechanic added extra bolts.');
    return out;
  },
};

/* ---------- the 2D 'parkcoaster' outfit (previews, world page, ready card): the 3D one is parkcoaster-outfits.js ----------
   Pip: a red-and-white striped popcorn box hat with popcorn spilling over the top (the sprout pokes up through it) and a
   green glow-stick necklace. Bo: a propeller beanie (yellow and green panels, a red-free propeller) and purple star
   glasses over the eyes. (Pip no blue, Bo no orange or red; the eyes, sprout and ears stay clear.) */
defineOutfitPart('pcPopcornHat', { layer: 'head', lift: 9, draw(c) {
  const g = c.g, ink = OF_INK;
  ofPoly(g, [-9.5, -24, -11, -33, 11, -33, 9.5, -24]); ofFillStroke(g, '#fbf3e4', ink, 1.3);
  g.save(); ofPoly(g, [-9.5, -24, -11, -33, 11, -33, 9.5, -24]); g.clip();
  g.fillStyle = '#e04848'; for (let x = -10; x < 11; x += 5.4) g.fillRect(x, -34, 2.7, 11);
  g.restore();
  ofPoly(g, [-9.5, -24, -11, -33, 11, -33, 9.5, -24]); g.strokeStyle = ink; g.lineWidth = 1.3; g.stroke();
  const pops = [[-8, -34.5], [-4.5, -35.6], [-1, -34.8], [3, -35.8], [6.5, -34.6], [9, -33.8], [-6, -37], [5, -37.6], [1.6, -38]];
  for (const [x, y] of pops) { ofCircle(g, x, y, 2.1); ofFillStroke(g, '#fff6cf', ink, 0.8); }
  g.fillStyle = '#f2c14e'; ofCircle(g, -3.6, -36.2, 0.7); g.fill(); ofCircle(g, 4, -36.6, 0.7); g.fill();
} });
defineOutfitPart('pcGlowNecklace', { layer: 'body', draw(c) {
  const g = c.g, pulse = 0.65 + 0.35 * Math.sin(c.t * 4);
  g.save(); g.shadowColor = '#7dff6a'; g.shadowBlur = 6 * pulse;
  g.strokeStyle = '#8dff7a'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -8.6); g.quadraticCurveTo(0, -3, 8, -8.6); g.stroke();
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-6, -7.4); g.quadraticCurveTo(0, -4, 6, -7.4); g.stroke();
} });
defineOutfitPart('pcPropBeanie', { layer: 'head', lift: 6, draw(c) {
  const g = c.g, ink = OF_INK, spin = c.t * 14;
  g.beginPath(); g.moveTo(-10.5, -24); g.bezierCurveTo(-10.5, -34.5, 10.5, -34.5, 10.5, -24); g.closePath(); ofFillStroke(g, '#f2d04e', ink, 1.4);
  g.save(); g.clip(); g.fillStyle = '#4fae6a'; g.beginPath(); g.moveTo(0, -24); g.lineTo(-4, -34); g.lineTo(4, -34); g.closePath(); g.fill();
  g.fillStyle = '#7a5cd6'; g.fillRect(-11, -26.5, 6, 3); g.fillRect(5, -26.5, 6, 3); g.restore();
  g.strokeStyle = ink; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -32.2); g.lineTo(0, -35.4); g.stroke();
  const w = 7 * Math.cos(spin);
  g.beginPath(); g.ellipse(0, -35.6, Math.abs(w) + 0.6, 1.4, 0, 0, Math.PI * 2); ofFillStroke(g, '#9fd8ff', ink, 0.9);
  ofCircle(g, 0, -35.6, 1); ofFillStroke(g, '#f2c14e', ink, 0.7);
} });
defineOutfitPart('pcStarGlasses', { layer: 'front', draw(c) {
  const g = c.g, ink = OF_INK, sx = (c.look || 0) * 2.5;
  const star = (x, y, r) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.5 : r; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } g.closePath(); };
  for (const x of [-5, 5]) { star(x + sx, -16, 4.6); g.fillStyle = 'rgba(167,110,255,0.35)'; g.fill(); g.strokeStyle = '#9a5cf0'; g.lineWidth = 1.5; g.stroke(); }
  g.strokeStyle = '#9a5cf0'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-1.6 + sx, -16.4); g.lineTo(1.6 + sx, -16.4); g.stroke();
  g.strokeStyle = ink; g.lineWidth = 0.5; for (const x of [-5, 5]) { star(x + sx, -16, 4.6); g.stroke(); }
} });
defineOutfit('parkcoaster', { pip: [['pcGlowNecklace', {}], ['pcPopcornHat', {}]], bo: [['pcPropBeanie', {}], ['pcStarGlasses', {}]] });

/* ---------- the level ---------- */
PARKCOASTER.def = {
  name: 'Runaway Coaster', world: 41, kind: 'team', mode: 'parkcoaster', outfit: 'parkcoaster', music: 'parkmidnight', amb: 'parkmidnight',
  view3d: true, touch: 'stick', ownStep: true, ownHUD: true, noFalls: true,
  legend: {
    pip: '<kbd>A</kbd><kbd>D</kbd> lean <kbd>S</kbd> duck <kbd>F</kbd> lever <kbd>Space</kbd> hop',
    bo: '<kbd>←</kbd><kbd>→</kbd> lean <kbd>↓</kbd> duck <kbd>/</kbd> lever <kbd>Shift</kbd> hop',
  },
  tip: 'Lean together on the gold arrows. Jump together to hop.',
  howTo: ['Lean the way the arrows point. Two gold arrows: both lean.', 'Duck under low boards. Jump together over gaps.', 'Pull your lever when its lamp is red.'],
  act: { label: 'lever', labels: ['lever', 'lever'] },
  map: Array.from({ length: 18 }, () => '.'.repeat(32)),
};
PARKCOASTER.def.map[16] = '.'.repeat(10) + '1' + '.'.repeat(10) + '2' + '.'.repeat(10);

// the 3D-only files: the park kit (shared by every World 42 level), the riders' outfits, the car and the scenery
K3D.files.push('js/levels/world42/park-kit.js', 'js/levels/world42/parkcoaster-outfits.js', 'js/levels/world42/parkcoaster-car.js', 'js/levels/world42/parkcoaster-scenery.js', 'js/levels/world42/parkcoaster-set.js');

/* ---------- sounds (an old wooden coaster at midnight: clacks, chain, steel wheels, a seaside fair) ---------- */
(function () {
  const X = Sfx.extra;
  X.parkcoasterFizz = function () { this.noise(0.45, { type: 'bandpass', f: 3200, to: 4200, q: 2, vol: 0.03 }); this.tone(1800, 0.4, 'sawtooth', 0.006, 2600); };
  X.parkcoasterTrapdoor = function () { this.tone(180, 0.14, 'square', 0.05, 90); this.noise(0.2, { type: 'lowpass', f: 1200, to: 300, vol: 0.05 }); this.tone(620, 0.08, 'triangle', 0.02, 300, 0.02); };
  X.parkcoasterCreak = function () { this.tone(140, 0.5, 'sawtooth', 0.012, 110); this.tone(210, 0.35, 'sawtooth', 0.008, 175, 0.12); this.noise(0.4, { type: 'bandpass', f: 600, q: 6, vol: 0.012 }); };
  X.parkcoasterBarrel = function () { this.noise(1.2, { type: 'bandpass', f: 300, to: 700, q: 1.5, vol: 0.03 }); };
  X.parkcoasterBar = function () { this.tone(220, 0.08, 'square', 0.04, 160); this.tone(880, 0.05, 'triangle', 0.02, 700, 0.03); this.noise(0.06, { type: 'highpass', f: 2400, vol: 0.02 }); };
  X.parkcoasterClunk = function () { this.tone(120, 0.3, 'square', 0.05, 70); this.tone(80, 0.45, 'sine', 0.08, 45, 0.06); this.noise(0.15, { type: 'lowpass', f: 700, vol: 0.04 }); };
  X.parkcoasterRatchet = function () { for (let k = 0; k < 4; k++) { this.tone(1400, 0.02, 'square', 0.012, 900, k * 0.07); this.noise(0.03, { type: 'bandpass', f: 2200, q: 3, vol: 0.02, delay: k * 0.07 }); } };
  X.parkcoasterLean = function (dir) { this.noise(0.18, { type: 'bandpass', f: dir > 0 ? 900 : 700, to: 400, q: 1.4, vol: 0.02 }); };
  X.parkcoasterTip = function () { this.tone(320, 0.25, 'sawtooth', 0.014, 520); this.noise(0.3, { type: 'highpass', f: 3200, vol: 0.02 }); };
  X.parkcoasterScreech = function () { this.tone(1900, 0.5, 'sawtooth', 0.016, 2400); this.tone(2600, 0.45, 'square', 0.006, 3100); this.noise(0.5, { type: 'bandpass', f: 3500, q: 4, vol: 0.03 }); };
  X.parkcoasterRattle = function () { this.tone(160, 0.12, 'square', 0.06, 90); this.noise(0.25, { type: 'lowpass', f: 1600, to: 400, vol: 0.07 }); this.tone(2400, 0.18, 'triangle', 0.02, 3200, 0.1); };
  X.parkcoasterBonk = function () { this.tone(520, 0.12, 'triangle', 0.06, 260); this.tone(1200, 0.25, 'sine', 0.02, 1800, 0.06); };
  X.parkcoasterDuck = function () { this.noise(0.14, { type: 'bandpass', f: 600, to: 1200, q: 1, vol: 0.025 }); };
  X.parkcoasterHop = function () { this.tone(300, 0.25, 'triangle', 0.05, 720); this.noise(0.3, { type: 'bandpass', f: 1200, to: 2600, q: 0.8, vol: 0.03 }); };
  X.parkcoasterBunny = function () { this.tone(360, 0.12, 'triangle', 0.03, 480); };
  X.parkcoasterLand = function () { this.tone(110, 0.22, 'square', 0.06, 60); this.noise(0.2, { type: 'lowpass', f: 900, vol: 0.06 }); this.tone(900, 0.06, 'square', 0.015, 600, 0.04); };
  X.parkcoasterLever = function (ok) { this.tone(ok ? 260 : 200, 0.1, 'square', 0.04, ok ? 180 : 140); this.noise(0.08, { type: 'highpass', f: 1800, vol: 0.025 }); if (ok) this.tone(880, 0.15, 'triangle', 0.025, 1100, 0.08); };
  X.parkcoasterSwing = function () { this.noise(0.12, { type: 'bandpass', f: 500, to: 1500, q: 1.2, vol: 0.025 }); };
  X.parkcoasterBell = function () { for (let k = 0; k < 2; k++) { this.tone(1568, 0.5, 'triangle', 0.03, null, k * 0.16); this.tone(3136, 0.3, 'sine', 0.01, null, k * 0.16); } };
  X.parkcoasterTicket = function () { this.tone(1760, 0.05, 'triangle', 0.02, 2100); this.noise(0.04, { type: 'highpass', f: 4000, vol: 0.01 }); };
  X.parkcoasterPoints = function () { [784, 988, 1175, 1568].forEach((f, k) => this.tone(f, 0.1, 'triangle', 0.025, null, k * 0.06)); };
  X.parkcoasterFlash = function () { this.tone(4200, 0.03, 'square', 0.012, 2000); this.noise(0.25, { type: 'highpass', f: 5000, to: 2000, vol: 0.02, delay: 0.02 }); this.tone(3000, 0.5, 'sine', 0.008, 6000, 0.05); };
  X.parkcoasterWhee = function () { this.tone(500, 0.6, 'triangle', 0.025, 900); this.tone(640, 0.6, 'triangle', 0.02, 1100, 0.05); };
  X.parkcoasterWhoosh = function () { this.noise(0.7, { type: 'bandpass', f: 400, to: 1600, q: 0.7, vol: 0.05, a: 0.15 }); };
  X.parkcoasterBreakdown = function () { this.tone(200, 0.7, 'sawtooth', 0.03, 50); this.noise(0.5, { type: 'lowpass', f: 1200, to: 200, vol: 0.08 }); this.tone(1800, 0.2, 'triangle', 0.02, 1200, 0.3); this.tone(1500, 0.2, 'triangle', 0.02, 1000, 0.5); };
  X.parkcoasterRobot = function () { for (let k = 0; k < 6; k++) this.tone(700 + (k % 2) * 300, 0.05, 'square', 0.012, null, k * 0.06); this.tone(1200, 0.3, 'sine', 0.01, 1600, 0.4); };
  X.parkcoasterWinch = function () { this.tone(90, 1.4, 'sawtooth', 0.02, 110); this.noise(1.4, { type: 'bandpass', f: 400, q: 2, vol: 0.02, a: 0.2 }); };
  X.parkcoasterHug = function () { this.tone(660, 0.2, 'sine', 0.03, 880); this.tone(990, 0.3, 'sine', 0.02, 1320, 0.1); };
  X.parkcoasterBrake = function () { this.noise(1.2, { type: 'bandpass', f: 2600, to: 900, q: 2, vol: 0.05, a: 0.05 }); this.tone(140, 0.6, 'square', 0.03, 70, 0.1); };
  X.parkcoasterTannoy = function () { [659, 523, 784].forEach((f, k) => { this.tone(f, 0.28, 'sine', 0.03, null, k * 0.26); this.tone(f * 2, 0.2, 'triangle', 0.006, null, k * 0.26); }); };
  X.parkcoasterBong = function () { this.tone(196, 1.6, 'sine', 0.05, 194); this.tone(392, 1.0, 'triangle', 0.015, 390); this.tone(588, 0.6, 'sine', 0.008, 586); };
  X.parkcoasterFirework = function () { this.tone(900, 0.4, 'sine', 0.008, 2400); this.noise(0.6, { type: 'lowpass', f: 900, to: 200, vol: 0.06, delay: 0.35 }); this.noise(0.8, { type: 'highpass', f: 4000, vol: 0.012, delay: 0.45, a: 0.1 }); };
})();
