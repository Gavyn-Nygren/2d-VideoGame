/* Pip & Bo - Level 42-3 Spook Manor (team, World 42 Midnight Theme Park, 3D, on foot). */
'use strict';

/* ===== 42-3 Spook Manor (mode 'parkmanor', team, view3d, one continuous walk) =====
   At the far end of Starlight Park stands Spook Manor, the walk-through haunted house. Its spooks are all clockwork,
   with big brass keys turning in their backs, and they only move in the dark. Pip carries the one LANTERN and Bo the
   manor's big brass winding KEY, all level (never swapped), and the two walk the whole tour while Grimsby the clockwork
   Butler stalks the halls.
     WALK      both walk and jump freely in 3D (MOVER3), a little slower than usual, quicker with the stick pushed all
               the way; the pair cannot be more than S.LEASH apart (a soft pull, as in 41-1).
     PIP       the lantern always throws a warm circle; holding the action narrows it into a beam the way Pip faces
               (PARKMANOR_LIGHT). Spooks freeze in light; the beam also shows hidden wisps.
     BO        holding the action with the key: on a frozen spook, S.UNWIND s unwinds it for good; on a moving one the
               key bites; on a locked door or a winder (chandelier, lamp) S.KEY_T s opens or winds it.
     FRIGHTS   a moving spook's touch: the hero goes stiff (cannot move or use the button). The partner brings them
               round by standing beside them for S.ROUSE s. Both stiff at once is a SCARE OUT: the pair wake at the last
               grandfather clock (spooks unwound stay unwound, wisps stay collected).
     BUTLER    PARKMANOR_SPOOKS: he only slows in light. Both standing in one hiding place hides the pair (the lantern is
               shuttered by itself); pushing out of it for S.HIDE_OUT s leaves. His touch is a Scare Out.
     CLOCKS    grandfather clocks are the restart points. Two Scare Outs from the same clock: gold help, the lantern
               burns brighter until two more clocks are passed (announced).
     WISPS     the collectable: plain ones float in view, hidden ones show when the beam passes and drift out.
   One room in the game's sense; the four stretches are places along the walk (never cards). State lives in G.mst and
   the rules never read the renderer (K3D.noRender plays the same). Names are prefixed parkmanor. */

const PARKMANOR = (function () {
  const H = PARKMANOR_HOUSE, PML = PARKMANOR_LIGHT, SP = PARKMANOR_SPOOKS;
  const S = {
    WALK: 0.6, RUN: 0.72, BEAM_WALK: 0.5, LEASH: 11, ROUSE: 1.0, ROUSE_R: 1.15, KEY_T: 1.0, KEY_R: 1.35, PICK_R: 1.5,
    HIDE_OUT: 0.3, SCARE_T: 2.4, GOLD_CLOCKS: 2, WISP_R: 0.8, WISP_DRIFT: 1.3, FLASH: 0.45, SAY_T: 5.5, BITE: 0.6,
  };
  const CO = { S, H };
  const hyp = Math.hypot;
  CO.wispsMax = () => H.wisps.length;

  function fresh(st) {
    Object.assign(st, {
      t: 0, phase: 'play', phaseT: 0, hasLantern: false, hasKey: false, beam: false, stiff: [0, 0], rouse: [0, 0],
      hidden: null, hideOut: [0, 0], hideT: 0, wound: [], flash: 0, nextFlash: 9, rng: 1234567, fired: {}, says: [],
      restart: 0, sameClock: 0, lastScareClock: -1, gold: 0, goldMsgT: -99, goldN: 0, clockT: -9,
      frights: 0, scareOuts: 0, caughtN: 0, unwound: 0, placeFrights: [0, 0, 0, 0], got: H.wisps.map(() => 0), wispAt: H.wisps.map(w => ({ x: w.x, y: w.y, z: w.z, shown: !w.hide, t: 0 })), wisps: 0,
      keyHold: 0, keyTgt: null, keyWhat: '', biteT: 0, doors: {}, fx: [], finished: false, zone: 'path', place: 0, caught: false, scareWhy: '',
      ride: null, rideReady: {}, sprung: {}, cleaver: { t: 0, st: 'up' }, chairSfxT: 0,
    });
    st.solids = H.solids.map(s => Object.assign({}, s));
    for (const d of H.doors) { const s = { x: d.x, z: d.z, w: d.w, d: d.d, y0: 0, y1: 3.2, rot: 0, kind: 'door', id: d.id }; st.solids.push(s); st.doors[d.id] = { def: d, s, open: false, t: 0, hold: 0 }; }
    // the dining chairs: each a small solid that slides from its place at the table across the lane (ghost while tucked in)
    st.chairs = (H.chairs || []).map(c => { const sd = { x: c.home[0], z: c.home[1], w: 0.66, d: 0.7, y0: 0, y1: 1.25, rot: 0, kind: 'chair', ghost: true, id: c.id }; st.solids.push(sd); return { def: c, u: 0, s: sd, moving: false }; });
    st.w = MOVER3.world(st.solids);
    SP.init(st);
    G.players.forEach((p, k) => { const [x, z] = H.start[k]; MOVER3.spawn(p, x, 0, z); p.b3.heading = Math.PI; });
  }
  const rnd = st => { st.rng = (st.rng * 16807) % 2147483647; return st.rng / 2147483647; };

  /* ---------- triggers, the guide, doors ---------- */
  function fire(st, id) {
    if (st.fired[id]) return;
    st.fired[id] = true;
    for (const s of H.says) if (s.trig === id) say(st, s.text);
    for (const d of H.doors) if (d.lock === 'trig' && d.trig === id && d.id !== 'front') openDoor(st, d.id);
  }
  function say(st, text) { st.says.push({ text, t: st.t }); while (st.says.length > 3) st.says.shift(); Sfx.play('parkmanorGuide'); }
  function openDoor(st, id) {
    const D = st.doors[id];
    if (!D || D.open) return;
    D.open = true; D.t = 0; D.s.ghost = true; Sfx.play('parkmanorDoor', 0);
  }
  function closeDoor(st, id) {
    const D = st.doors[id];
    if (!D || !D.open) return;
    D.open = false; D.t = 0; D.s.ghost = false; Sfx.play('parkmanorDoor', 1);
  }
  CO.fire = fire; CO.say = say;

  /* ---------- Frights and Scare Outs ---------- */
  function fright(st, k, by) {
    if (st.stiff[k] > 0 || st.phase !== 'play' || st.hidden) return;
    st.stiff[k] = 0.001; st.rouse[k] = 0; st.frights++; st.placeFrights[st.place]++;
    st.fx.push({ k: 'fright', who: k, t: st.t, by: by && by.kind });
    Sfx.play('parkmanorFright', k);
    if (k === 1) { st.keyHold = 0; st.keyTgt = null; }
    if (k === 0) st.beam = false;
    if (typeof rumble === 'function') rumble(k, 0.6, 0.8, 260);
    if (st.stiff[1 - k] > 0) scareOut(st, 'both');
  }
  function scareOut(st, why) {
    if (st.phase !== 'play') return;
    st.scareOuts++; st.phase = 'scare'; st.phaseT = 0; st.scareWhy = why;
    if (st.lastScareClock === st.restart) st.sameClock++; else { st.sameClock = 1; st.lastScareClock = st.restart; }
    Sfx.play('parkmanorCackle');
    st.fx.push({ k: 'scare', t: st.t, why });
  }
  function caught(st, k) {
    if (st.phase !== 'play') return;
    st.caught = true; st.caughtN++; st.placeFrights[st.place]++; st.frights++;
    Sfx.play('parkmanorButlerVoice', 4);
    scareOut(st, 'butler');
  }
  function restartAt(st) {
    const c = H.clocks[st.restart];
    G.players.forEach((p, k) => {
      const x = c.x + (k ? 0.7 : -0.7) + (c.art === false ? 0 : Math.sin(c.face) * 1.2), z = c.z + (c.art === false ? 0 : Math.cos(c.face) * 1.2);
      MOVER3.spawn(p, x, MOVER3.floorAt(st.w, x, z, 5), z); p.b3.heading = c.face;
    });
    st.stiff = [0, 0]; st.rouse = [0, 0]; st.hidden = null; st.beam = false; st.keyHold = 0; st.keyTgt = null; st.caught = false;
    st.phase = 'play'; st.phaseT = 0; st.flash = 0;
    SP.restart(st);
    if (st.sameClock >= 2 && st.gold <= 0) { st.gold = S.GOLD_CLOCKS; st.goldMsgT = st.t; st.goldN++; Sfx.play('parkmanorWisp'); }
    Sfx.play('parkmanorClock');
  }

  /* ---------- what each player presses ---------- */
  const actHeld = p => !!(p.input && p.input.act);

  function step(st, dt) {
    const ps = G.players;
    st.t += dt; st.phaseT += dt;
    while (st.fx.length && st.t - st.fx[0].t > 4) st.fx.shift();
    st.flash = Math.max(0, st.flash - dt);
    for (const w of st.wound) { const was = w.t; w.t -= dt; if (was > 3 && w.t <= 3 && w.def.light) Sfx.play('parkmanorLampTick'); if (w.def.kind === 'musicbox' && was > 0 && w.t <= 0) fire(st, 'musicDone'); }
    st.wound = st.wound.filter(w => w.t > 0);
    for (const id in st.doors) st.doors[id].t += dt;
    // the zone the pair is in: camera heading (game state, never the picture) and the place a Fright is counted in
    const mx = (ps[0].b3.x + ps[1].b3.x) / 2, mz = (ps[0].b3.z + ps[1].b3.z) / 2;
    const zn = H.zoneAt(mx, mz) || H.zoneAt(ps[0].b3.x, ps[0].b3.z);
    if (zn) { st.zone = zn.id; st.place = zn.place; K3D.heading = zn.cam.heading; }
    if (st.phase === 'scare') {
      for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
      if (st.phaseT >= S.SCARE_T) restartAt(st);
      return;
    }
    if (st.phase === 'done') { for (const p of ps) { p.pendingJump = false; p.pendingAct = false; } return; }
    // lightning: now and then inside (a beat of blue light that freezes everything)
    if (st.zone !== 'path' && st.t >= st.nextFlash) { st.flash = S.FLASH; st.nextFlash = st.t + 11 + rnd(st) * 9; Sfx.play('parkmanorThunder'); }
    // the porch: Pip takes the lantern, Bo the key; the front door creaks open
    const hk = H.hooks;
    if (!st.hasLantern && hyp(ps[0].b3.x - hk.lantern.x, ps[0].b3.z - hk.lantern.z) < S.PICK_R) { st.hasLantern = true; Sfx.play('parkmanorLock', 1); st.fx.push({ k: 'pick', who: 0, t: st.t }); }
    if (!st.hasKey && hyp(ps[1].b3.x - hk.key.x, ps[1].b3.z - hk.key.z) < S.PICK_R) { st.hasKey = true; Sfx.play('parkmanorLock', 0); st.fx.push({ k: 'pick', who: 1, t: st.t }); }
    if (st.hasLantern && st.hasKey && !st.doors.front.open && !st.fired.frontShut) { openDoor(st, 'front'); if (!st.fired.doorSay) { st.fired.doorSay = true; say(st, 'Come in, come in. Do wipe your feet.'); } }
    // the front door shuts by itself behind them (once both are inside and past the hall clock)
    if (st.doors.front.open && !st.fired.frontShut && st.restart >= 1 && ps.every(p => p.b3.z < 4.6)) { st.fired.frontShut = true; closeDoor(st, 'front'); st.fx.push({ k: 'slam', t: st.t }); }
    // riding the dumbwaiter or the slide: nothing else happens to the pair meanwhile
    if (rideStep(st, dt)) { SP.step(st, dt, { fright: (k, by) => fright(st, k, by), caught: k => caught(st, k), fire: id => fire(st, id) }); return; }
    // hiding: both inside one hiding place (and not stiff)
    hideStep(st, dt);
    // Pip's beam
    st.beam = !!(st.hasLantern && actHeld(ps[0]) && st.stiff[0] <= 0 && !st.hidden);
    if (st.beam && !st.wasBeam) Sfx.play('parkmanorBeam');
    st.wasBeam = st.beam;
    st.lan = PML.lantern(st);
    // Bo's key
    keyStep(st, dt);
    // walking
    for (const p of ps) {
      const k = p.id, b = p.b3;
      if (st.stiff[k] > 0) { st.stiff[k] += dt; p.pendingJump = false; MOVER3.step(p, st.w, dt, { dir: { x: 0, z: 0, s: 0 }, jump: false, teeter: false }); continue; }
      if (st.hidden) { p.pendingJump = false; continue; }
      const d = K3D.moveDir(p);
      const busy = k === 1 && st.keyHold > 0;
      // aiming the beam: a gentle push (under half way) only turns Pip on the spot
      const aim = k === 0 && st.beam && d.s > 0.2 && d.s < 0.5;
      const speed = k === 0 && st.beam ? S.BEAM_WALK : d.s > 0.95 ? S.RUN : S.WALK;
      MOVER3.step(p, st.w, dt, { speed, dir: busy || aim ? { x: 0, z: 0, s: 0 } : d, jump: !busy, teeter: true });
      // the beam keeps pointing while Pip stands still; it turns with the stick even when blocked
      if (k === 0 && d.s > 0.25) b.heading = Math.atan2(d.x, d.z);
    }
    // the soft leash
    const a = ps[0].b3, c = ps[1].b3, dd = hyp(c.x - a.x, c.z - a.z);
    if (dd > S.LEASH && !st.hidden) {
      const f = (dd - S.LEASH) * 0.08 / dd, ax = (c.x - a.x) * f, az = (c.z - a.z) * f;
      if (st.stiff[0] <= 0) { a.x += ax; a.z += az; MOVER3.push(st.w, a); }
      if (st.stiff[1] <= 0) { c.x -= ax; c.z -= az; MOVER3.push(st.w, c); }
    }
    MOVER3.separate(a, c);
    // bringing a stiff partner round: stand beside them
    for (const k of [0, 1]) {
      if (st.stiff[k] <= 0) continue;
      const o = ps[1 - k].b3, me = ps[k].b3;
      if (st.stiff[1 - k] <= 0 && hyp(o.x - me.x, o.z - me.z) < S.ROUSE_R) { st.rouse[k] += dt; if (st.rouse[k] >= S.ROUSE) { st.stiff[k] = 0; st.rouse[k] = 0; Sfx.play('parkmanorWake'); st.fx.push({ k: 'wake', who: k, t: st.t }); } }
      else st.rouse[k] = Math.max(0, st.rouse[k] - dt * 2);
    }
    // triggers (a hero standing in one)
    for (const tr of H.triggers) if (!st.fired[tr.id] && ps.some((p, k) => { const b = p.b3; return b.x >= tr.x0 && b.x <= tr.x1 && b.z >= tr.z0 && b.z <= tr.z1; })) fire(st, tr.id);
    // clocks: the restart point moves on as a hero passes
    for (let i = st.restart + 1; i < H.clocks.length; i++) {
      const cl = H.clocks[i];
      if (ps.some(p => hyp(p.b3.x - cl.x, p.b3.z - cl.z) < cl.r)) {
        st.restart = i; st.sameClock = 0; st.clockT = st.t; Sfx.play('parkmanorClock'); st.fx.push({ k: 'clock', i, t: st.t });
        if (st.gold > 0 && --st.gold === 0) st.fx.push({ k: 'goldEnd', t: st.t });
      }
    }
    // the spooks and the Butler
    SP.step(st, dt, { fright: (k, by) => fright(st, k, by), caught: k => caught(st, k), fire: id => fire(st, id) });
    // the teaching Sheet unwound: the stair Sheets come on
    const teach = st.spooks.find(s => s.def.teach);
    if (teach && teach.state === 'done' && !st.fired.teachDone) fire(st, 'teachDone');
    // wisps
    wispStep(st, dt);
    // the dining chairs, the kitchen cleaver, the jack-o-springs
    chairStep(st, dt);
    cleaverStep(st, dt);
    for (const sp of H.springs || []) if (!st.sprung[sp.id] && ps.some(p => hyp(p.b3.x - sp.x, p.b3.z - sp.z) < sp.r)) { st.sprung[sp.id] = st.t; Sfx.play('parkmanorSpring'); st.fx.push({ k: 'spring', id: sp.id, t: st.t }); }
    // the dolls all unwound before the music box ever ran down: the Butler still comes to the nursery
    if (!st.fired.musicDone && st.fired.nurIn && st.spooks.filter(sp => sp.kind === 'doll').every(sp => sp.state === 'done')) fire(st, 'musicDone');
    // Bo's key in Grimsby's back (the finish)
    // out through the exit into the park, Grimsby wound down
    if (st.fired.bossDone && !st.finished && ps.every(p => p.b3.z < -106)) { st.finished = true; st.phase = 'done'; st.doneT = st.t; Sfx.play('parkmanorWisp'); levelClear(); }
  }

  /* ---------- the dining chairs: unlit, they shuffle across the lane; lit (or the Butler passing), they tuck back in ---------- */
  function chairStep(st, dt) {
    if (!st.chairs.length || !st.fired.dinIn) return;
    const ps = G.players, B = st.butler;
    let started = false;
    for (const c of st.chairs) {
      const was = c.u;
      const back = PML.lit(st, c.s.x, c.s.z) || (B.state !== 'off' && hyp(B.x - c.s.x, B.z - c.s.z) < 2.4);
      let nu = back ? Math.max(0, c.u - dt * 0.9) : Math.min(1, c.u + dt * 0.32);
      const e = u => u * u * (3 - 2 * u);
      const nx = c.def.home[0] + (c.def.block[0] - c.def.home[0]) * e(nu), nz = c.def.home[1] + (c.def.block[1] - c.def.home[1]) * e(nu);
      // never onto anybody: it waits
      if (nu > c.u && ps.some(p => hyp(p.b3.x - nx, p.b3.z - nz) < 0.78)) nu = c.u;
      else { c.s.x = nx; c.s.z = nz; c.u = nu; }
      c.s.ghost = c.u < 0.3;
      c.moving = Math.abs(c.u - was) > 1e-4;
      if (c.moving && was === 0) started = true;
    }
    st.chairSfxT -= dt;
    if (started && st.chairSfxT <= 0) { Sfx.play('parkmanorChairs'); st.chairSfxT = 1.6; }
  }

  /* ---------- the cleaver on its block: up, a warning lift, then down across the north lane ---------- */
  function cleaverStep(st, dt) {
    const C = H.cleaver, cv = st.cleaver;
    if (!C || !st.fired.kitIn) return;
    cv.t += dt;
    const per = C.up + C.warn + C.down, u = cv.t % per;
    const was = cv.st;
    cv.st = u < C.up ? 'up' : u < C.up + C.warn ? 'warn' : 'down';
    if (cv.st === 'warn' && was === 'up') Sfx.play('parkmanorCreak');
    if (cv.st === 'down' && was !== 'down') { Sfx.play('parkmanorLock', 2); st.fx.push({ k: 'chop', t: st.t }); }
    if (cv.st !== 'down') return;
    G.players.forEach((p, k) => {
      const b = p.b3;
      if (b.x > C.x - C.w / 2 && b.x < C.x + C.w / 2 && b.z > C.z0 && b.z < C.z1 && st.stiff[k] <= 0) {
        fright(st, k, { kind: 'cleaver' });
        // knocked clear of the block (a stiff hero is never left under it)
        b.x = b.x < C.x ? C.x - C.w / 2 - 0.4 : C.x + C.w / 2 + 0.4; MOVER3.push(st.w, b);
      }
    });
  }

  /* ---------- the dumbwaiter and the slide: wound by Bo, both step in together, a short ride, out on the next floor ---------- */
  function rideStep(st, dt) {
    const ps = G.players;
    if (st.ride) {
      const R = H.rides[st.ride.id];
      st.ride.t += dt;
      for (const p of ps) { p.pendingJump = false; p.pendingAct = false; p.b3.vx = p.b3.vz = 0; }
      if (st.ride.t >= R.dur) {
        ps.forEach((p, k) => { const [x, z] = R.to[k]; MOVER3.spawn(p, x, MOVER3.floorAt(st.w, x, z, 8), z); p.b3.heading = R.face; });
        // the next floor's clock counts as passed
        for (let i = st.restart + 1; i < H.clocks.length; i++) if (hyp(H.clocks[i].x - R.to[0][0], H.clocks[i].z - R.to[0][1]) < 5) { st.restart = i; st.sameClock = 0; st.clockT = st.t; }
        st.fx.push({ k: 'rideOut', id: st.ride.id, t: st.t });
        st.ride = null; Sfx.play(R.kind === 'slide' ? 'parkmanorWake' : 'parkmanorDoor', 0);
      }
      return true;
    }
    if (st.stiff[0] > 0 || st.stiff[1] > 0 || st.butler.state !== 'off') return false;
    for (const id in H.rides) {
      const R = H.rides[id];
      if (!st.rideReady[id]) continue;
      if (ps.every(p => hyp(p.b3.x - R.board.x, p.b3.z - R.board.z) < R.board.r + 0.35)) {
        st.ride = { id, t: 0 }; st.keyHold = 0; st.keyTgt = null; st.beam = false;
        fire(st, id === 'dumb' ? 'rideDumb' : 'rideSlide');
        Sfx.play(R.kind === 'slide' ? 'parkmanorSlide' : 'parkmanorWinder', 1);
        st.fx.push({ k: 'rideIn', id, t: st.t });
        return true;
      }
    }
    return false;
  }

  /* ---------- hiding from the Butler ---------- */
  function hideStep(st, dt) {
    const ps = G.players;
    if (st.hidden) {
      const hd = H.hides.find(h => h.id === st.hidden);
      st.hideT += dt;
      for (const p of ps) {
        const d = K3D.moveDir(p);
        // pushing out (toward the open side) leaves the hiding place
        st.hideOut[p.id] = d.s > 0.5 && st.hideT > 0.4 ? st.hideOut[p.id] + dt : 0;
        const b = p.b3, k = p.id;
        b.x = hd.x + (k ? 0.32 : -0.32) * Math.cos(hd.face); b.z = hd.z - (k ? 0.32 : -0.32) * Math.sin(hd.face); b.vx = b.vz = 0; b.heading = hd.face;
      }
      if (st.hideOut[0] > S.HIDE_OUT || st.hideOut[1] > S.HIDE_OUT) {
        const out = st.hideOut[0] > S.HIDE_OUT ? 0 : 1;
        st.hidden = null; Sfx.play('parkmanorHide', 1);
        // step out through the door
        for (const p of ps) { const b = p.b3; b.x += Math.sin(hd.face) * (p.id === out ? 1.0 : 0.7); b.z += Math.cos(hd.face) * (p.id === out ? 1.0 : 0.7); MOVER3.push(st.w, b); }
        st.hideOut = [0, 0];
      }
      return;
    }
    // (hiding places only open while the Butler is about: walking past a wardrobe never shuts anyone in)
    if (st.stiff[0] > 0 || st.stiff[1] > 0 || st.butler.state === 'off') return;
    for (const hd of H.hides) {
      if (ps.every(p => hyp(p.b3.x - hd.x, p.b3.z - hd.z) < hd.r + 0.35)) { st.hidden = hd.id; st.hideT = 0; st.hideN = (st.hideN || 0) + 1; st.keyHold = 0; Sfx.play('parkmanorHide', 0); break; }
    }
  }

  /* ---------- Bo's key ---------- */
  function keyStep(st, dt) {
    const p = G.players[1], b = p.b3;
    st.biteT = Math.max(0, st.biteT - dt);
    if (!st.hasKey || st.stiff[1] > 0 || st.hidden || !actHeld(p)) { st.keyHold = 0; st.keyTgt = null; st.keyWhat = ''; return; }
    // what is in reach: Grimsby's back, a spook, then a locked door, then a winder
    let tgt = null, what = '';
    if (SP.bossBack(st, b)) { tgt = st.boss; what = 'boss'; }
    const sp = !tgt && SP.keyTarget(st, b);
    if (sp) { tgt = sp; what = 'spook'; }
    if (!tgt) for (const d of H.doors) { const D = st.doors[d.id]; if (d.lock === true && !D.open && hyp(b.x - d.x, b.z - d.z) < S.KEY_R + 0.4) { tgt = D; what = 'door'; break; } }
    if (!tgt) for (const w of H.winders) if (hyp(b.x - w.x, b.z - w.z) < S.KEY_R) { tgt = w; what = 'winder'; break; }
    if (tgt !== st.keyTgt) { st.keyHold = 0; st.keyTgt = tgt; st.keyWhat = what; if (tgt && what !== 'spook' && what !== 'boss') Sfx.play('parkmanorWinder', 0); }
    if (!tgt) return;
    if (what === 'boss') {
      if (st.keyHold === 0) Sfx.play('parkmanorUnwind');
      st.keyHold += dt; tgt.holdT = st.keyHold;
      if (st.keyHold >= H.boss.hold) { SP.bossTurned(st); st.keyHold = 0; st.keyTgt = null; st.fx.push({ k: 'bossTurn', t: st.t, n: st.boss.turns }); }
      return;
    }
    if (what === 'spook') {
      if (tgt.state !== 'frozen') {
        // the key will not go in: it bites
        if (st.biteT <= 0) { st.biteT = S.BITE; tgt.bite = 0.5; Sfx.play('parkmanorLock', 2); const dx = b.x - tgt.x, dz = b.z - tgt.z, d = hyp(dx, dz) || 1; b.vx = dx / d * 3; b.vz = dz / d * 3; st.fx.push({ k: 'bite', t: st.t }); }
        st.keyHold = 0; return;
      }
      if (st.keyHold === 0) Sfx.play('parkmanorUnwind');
      st.keyHold += dt; tgt.unwind = st.keyHold / SP.unwindT(tgt);
      if (st.keyHold >= SP.unwindT(tgt)) { tgt.state = 'done'; tgt.unwind = 1; st.unwound++; st.keyHold = 0; st.keyTgt = null; Sfx.play('parkmanorSag'); st.fx.push({ k: 'unwound', t: st.t, id: tgt.id }); }
      return;
    }
    st.keyHold += dt;
    if (st.keyHold >= S.KEY_T) {
      if (what === 'door') { openDoor(st, tgt.def.id); Sfx.play('parkmanorLock', 0); if (tgt.def.id === 'organDoor') Sfx.play('parkmanorOrgan'); }
      else {
        const ex = st.wound.find(x => x.def === tgt); if (ex) ex.t = tgt.dur; else st.wound.push({ def: tgt, t: tgt.dur });
        Sfx.play(tgt.kind === 'musicbox' ? 'parkmanorMusicBox' : 'parkmanorWinder', 1);
        if (tgt.kind === 'chandelier') st.fx.push({ k: 'chand', t: st.t });
        if (tgt.ride && !st.rideReady[tgt.ride]) { st.rideReady[tgt.ride] = true; st.fx.push({ k: 'rideReady', id: tgt.ride, t: st.t }); if (tgt.kind === 'trap') Sfx.play('parkmanorOrgan'); }
      }
      st.keyHold = 0; st.keyTgt = null; st.keyDone = st.t;
    }
  }

  /* ---------- wisps ---------- */
  function wispStep(st, dt) {
    const ps = G.players;
    H.wisps.forEach((w, i) => {
      if (st.got[i]) return;
      const a = st.wispAt[i];
      a.t += dt;
      if (!a.shown) { if (PML.inLantern(st, a.x, a.z, st.lan) === 'beam') { a.shown = true; a.t = 0; Sfx.play('parkmanorWisp', 1); } else return; }
      // a shown hidden wisp drifts out toward the nearest hero after a moment
      if (w.hide && a.t > 0.5) {
        let best = null, bd = 1e9; for (const p of ps) { const d = hyp(p.b3.x - a.x, p.b3.z - a.z); if (d < bd) { bd = d; best = p.b3; } }
        if (best && bd > 0.3 && bd < 6) { const k = Math.min(1, S.WISP_DRIFT * dt / bd); a.x += (best.x - a.x) * k; a.z += (best.z - a.z) * k; a.y += (best.y + 0.9 - a.y) * k; }
      }
      for (const p of ps) {
        if (st.hidden) break;
        const b = p.b3;
        if (hyp(b.x - a.x, b.z - a.z) < S.WISP_R && Math.abs(b.y + 0.6 - a.y) < 1.4) { st.got[i] = st.t; st.wisps++; Sfx.play('parkmanorWisp', 0); st.fx.push({ k: 'wisp', t: st.t, i }); break; }
      }
    });
  }

  CO.fresh = fresh; CO.step = step; CO.fright = fright; CO.scareOut = scareOut; CO.restartAt = restartAt; CO.openDoor = openDoor;
  return CO;
})();

/* ---------- the HUD: wisps, the lantern and the key, the Butler's tick, the tour guide ---------- */
PARKMANOR.hud = function (st) {
  if (st.noHud) return;
  const S = PARKMANOR.S;
  // wisps (top left)
  const tt = st.wisps + ' / ' + PARKMANOR.wispsMax();
  ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
  const tw = ctx.measureText(tt).width + 52;
  pill(14, 46, tw, 30);
  parkmanorWispIcon(33, 61, 1, G.clock);
  text(tt, 52, 61.5, 15, C.paper, 'left', 'body');
  // who has what: the lantern by Pip's corner (bottom left), the key by Bo's (bottom right)
  const tag = (x, k, icon, word) => {
    pill(x, H - 48, 112, 32);
    ctx.fillStyle = PCOL[k]; circle(x + 17, H - 32, 9); ctx.fill();
    text(NAMES[k][0], x + 17, H - 31, 11, '#fff', 'center', 'body');
    icon(x + 40, H - 32);
    const busy = k === 0 ? st.beam : st.keyHold > 0;
    text(st.stiff[k] > 0 ? 'Stiff!' : word, x + 56, H - 31, 13, st.stiff[k] > 0 ? '#ffd0d0' : busy ? '#ffe9a8' : C.paper, 'left', 'body');
  };
  tag(14, 0, (x, y) => parkmanorLanternIcon(x, y, st.hasLantern), st.hasLantern ? (st.beam ? 'Beam' : 'Lantern') : 'Lantern?');
  tag(W - 126, 1, (x, y) => parkmanorKeyIcon(x, y, st.hasKey), st.hasKey ? 'Key' : 'Key?');
  // the Butler's tick: an edge marker toward him while he can be heard
  const B = st.butler;
  if (B.heard > 0 && B.state !== 'off') {
    const ps = G.players, mx = (ps[0].b3.x + ps[1].b3.x) / 2, mz = (ps[0].b3.z + ps[1].b3.z) / 2;
    const sc = K3D.toScreen(B.x, (B.y || 0) + 2, B.z);
    let ang;
    if (sc.z < 1 && sc.x > 30 && sc.x < W - 30 && sc.y > 30 && sc.y < H - 30) ang = null;
    else { const h = K3D.heading, dx = B.x - mx, dz = B.z - mz; const rx = dx * Math.cos(h) - dz * Math.sin(h), ry = dx * Math.sin(h) + dz * Math.cos(h); ang = Math.atan2(ry, rx); }
    if (ang != null) {
      const cx = W / 2 + Math.cos(ang) * (W / 2 - 46), cy = H / 2 + Math.sin(ang) * (H / 2 - 46);
      const px = clamp(cx, 40, W - 90), py = clamp(cy, 96, H - 70);
      const pulse = 0.6 + 0.4 * Math.abs(Math.sin(G.clock * 3.2));
      ctx.save(); ctx.globalAlpha = pulse; ctx.fillStyle = 'rgba(23,25,29,0.8)'; circle(px, py, 18); ctx.fill();
      ctx.strokeStyle = '#e8e2ff'; ctx.lineWidth = 2; ctx.stroke();
      text('tick', px, py + 1, 11, '#e8e2ff', 'center', 'body');
      ctx.translate(px, py); ctx.rotate(ang); ctx.fillStyle = '#e8e2ff'; ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(19, -6); ctx.lineTo(19, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  // the tour guide on the horn speakers (top middle)
  const sy = st.says[st.says.length - 1];
  if (sy && st.t - sy.t < S.SAY_T) {
    const a = Math.min(1, (S.SAY_T - (st.t - sy.t)) * 2, (st.t - sy.t) * 4);
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = 'italic 700 17px "Atkinson Hyperlegible", system-ui, sans-serif';
    const mw = Math.min(W - 220, ctx.measureText(sy.text).width + 70);
    ctx.fillStyle = 'rgba(23,25,29,0.82)'; rr(W / 2 - mw / 2, 52, mw, 38, 19); ctx.fill();
    ctx.strokeStyle = 'rgba(190,255,200,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    parkmanorHornIcon(W / 2 - mw / 2 + 24, 71);
    text(sy.text, W / 2 + 14, 71.5, 17, '#dff5e0', 'center', 'body');
    ctx.restore();
  }
  // the gold help banner
  if (st.t - st.goldMsgT < 4) {
    const a = Math.min(1, (4 - (st.t - st.goldMsgT)) * 2);
    ctx.save(); ctx.globalAlpha = a; ctx.font = '700 18px "Atkinson Hyperlegible", system-ui, sans-serif';
    const m = 'The lantern burns brighter', mw = ctx.measureText(m).width + 40;
    ctx.fillStyle = 'rgba(120,84,10,0.92)'; rr(W / 2 - mw / 2, 100, mw, 36, 18); ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke();
    text(m, W / 2, 118.5, 18, '#ffe9a8', 'center', 'body'); ctx.restore();
  }
  // a Scare Out
  if (st.phase === 'scare') {
    const u = st.phaseT / S.SCARE_T;
    ctx.save(); ctx.globalAlpha = Math.min(1, u * 3) * (u > 0.8 ? (1 - u) * 5 : 1);
    ctx.fillStyle = 'rgba(8,6,16,0.55)'; ctx.fillRect(0, 0, W, H);
    const m = st.scareWhy === 'butler' ? '"Do allow me to show you back to your room."' : 'Scared stiff!';
    text(m, W / 2, H / 2 - 10, st.scareWhy === 'butler' ? 22 : 34, '#f2ecff', 'center', 'body');
    text('Back to the last clock...', W / 2, H / 2 + 26, 16, '#c9c2e8', 'center', 'body');
    ctx.restore();
  }
};
// small HUD icons (2D)
function parkmanorWispIcon(x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const g = ctx.createRadialGradient(0, 2, 0, 0, 2, 11); g.addColorStop(0, 'rgba(160,255,230,0.9)'); g.addColorStop(1, 'rgba(120,255,220,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 2, 11, 0, Math.PI * 2); ctx.fill();
  const wob = Math.sin(t * 6) * 1.2;
  ctx.fillStyle = '#9ff7e0'; ctx.strokeStyle = '#2a7a6a'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, -9 + wob * 0.3); ctx.bezierCurveTo(5 + wob, -3, 6, 2, 5, 5); ctx.arc(0, 4, 5, 0, Math.PI); ctx.bezierCurveTo(-6, 2, -4, -3, 0, -9 + wob * 0.3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e8fffa'; ctx.beginPath(); ctx.arc(0, 4, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function parkmanorLanternIcon(x, y, on) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = on ? 1 : 0.4;
  if (on) { const g = ctx.createRadialGradient(0, 1, 0, 0, 1, 12); g.addColorStop(0, 'rgba(255,210,120,0.8)'); g.addColorStop(1, 'rgba(255,190,90,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 1, 12, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#3a2810'; ctx.lineWidth = 1.4; ctx.fillStyle = '#c99a3a';
  ctx.beginPath(); ctx.arc(0, -8, 3, Math.PI, 0); ctx.stroke();
  rr(-5, -6, 10, 3, 1); ctx.fill(); ctx.stroke();
  ctx.fillStyle = on ? '#ffe7a6' : '#776a52'; rr(-4, -3, 8, 9, 1.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c99a3a'; rr(-5, 6, 10, 2.5, 1); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function parkmanorKeyIcon(x, y, on) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.6); ctx.globalAlpha = on ? 1 : 0.4;
  ctx.fillStyle = '#e2b84a'; ctx.strokeStyle = '#5a3e0a'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(-6, 0, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2a2235'; ctx.beginPath(); ctx.arc(-6, 0, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e2b84a'; ctx.fillRect(-1.6, -1.4, 11, 2.8); ctx.strokeRect(-1.6, -1.4, 11, 2.8);
  ctx.fillRect(6, 1.4, 2.2, 3.2); ctx.fillRect(3, 1.4, 2, 2.4);
  ctx.restore();
}
function parkmanorHornIcon(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#b9c2b0'; ctx.strokeStyle = '#2a2a24'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-3, -3); ctx.lineTo(7, -9); ctx.lineTo(7, 9); ctx.lineTo(-3, 3); ctx.lineTo(-8, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(200,255,210,0.7)'; ctx.lineWidth = 1.3;
  for (const r of [4, 8]) { ctx.beginPath(); ctx.arc(9, 0, r, -0.7, 0.7); ctx.stroke(); }
  ctx.restore();
}

/* ---------- the prompts over the 3D picture: key progress, bringing round, hiding ---------- */
PARKMANOR.drawTop = function (st) {
  if (!st || !G.players[0].b3) return;
  const ps = G.players, scr = (x, y, z) => K3D.toScreen(x, y, z);
  const ring = (x, y, u, col) => { ctx.strokeStyle = 'rgba(23,25,29,0.7)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(u, 0, 1)); ctx.stroke(); };
  // Bo's key working on something
  if (st.keyHold > 0 && st.keyTgt) {
    const t = st.keyTgt, x = t.x != null ? t.x : t.def.x, z = t.z != null ? t.z : t.def.z;
    const s = scr(x, 2.2, z);
    if (s.z < 1) ring(s.x, s.y, st.keyHold / (st.keyWhat === 'spook' ? PARKMANOR_SPOOKS.S.UNWIND : PARKMANOR.S.KEY_T), '#ffd24a');
  }
  // a stiff hero: the partner stands beside them
  for (const k of [0, 1]) {
    if (st.stiff[k] <= 0 || st.phase !== 'play') continue;
    const b = ps[k].b3, s = scr(b.x, b.y + 1.6, b.z);
    if (s.z >= 1) continue;
    ring(s.x, s.y - 8, st.rouse[k] / PARKMANOR.S.ROUSE, PCOL[1 - k]);
    if (st.rouse[k] <= 0 && !(cpuSolo() && cpuOn(1 - k))) text('Stand by ' + NAMES[k] + '!', s.x, s.y - 36, 14, '#fff', 'center', 'body');
  }
  // the porch: the lantern and the key on their hooks
  if (!st.hasLantern || !st.hasKey) {
    const hk = PARKMANOR_HOUSE.hooks;
    if (!st.hasLantern) { const s = scr(hk.lantern.x, hk.lantern.y + 0.7, hk.lantern.z); if (s.z < 1) text('Pip takes the lantern', s.x, s.y, 13, '#ffe9a8', 'center', 'body'); }
    if (!st.hasKey) { const s = scr(hk.key.x, hk.key.y + 0.7, hk.key.z); if (s.z < 1) text('Bo takes the key', s.x, s.y, 13, '#ffe9a8', 'center', 'body'); }
  }
  // hidden: a peek through the crack
  if (st.hidden) {
    ctx.save(); ctx.fillStyle = 'rgba(6,5,12,0.62)';
    ctx.fillRect(0, 0, W, H * 0.18); ctx.fillRect(0, H * 0.82, W, H * 0.18);
    ctx.restore();
    if (st.hideT > 1.2 && st.butler.state === 'off') text('Push away to come out', W / 2, H * 0.82 + 30, 15, '#e8e2ff', 'center', 'body');
  }
};

/* ---------- MODES.parkmanor ---------- */
MODES.parkmanor = {
  medals: { bronze: 'Escape the manor', goals: [{ key: 'wisps', gold: 0.85, silver: 0.55, more: true, pct: true, word: 'the wisps' }, { key: 'frights', gold: 3, silver: 9, word: 'fright' }] },
  medalValues() { const st = G.mst; return { wisps: Math.min(1, st.wisps / PARKMANOR.wispsMax()), frights: st.frights }; },
  scene3dOpts: { bg: '#0b0a1c', fov: 34, near: 0.2, far: 1600 },
  setup(st) { PARKMANOR.fresh(st); for (const p of G.players) p.alive = true; },
  step(dt) { PARKMANOR.step(G.mst, dt); },
  hud() { PARKMANOR.hud(G.mst); },
  scene3d(K) { if (typeof PARKMANOR_SCENE !== 'undefined') PARKMANOR_SCENE.build(K, G.mst); },
  draw3d(K, dt) { if (typeof PARKMANOR_SCENE !== 'undefined') PARKMANOR_SCENE.update(K, G.mst, dt); },
  drawTop() { PARKMANOR.drawTop(G.mst); },
  resultTitle() { return 'You escaped Spook Manor!'; },
  stats() {
    const st = G.mst;
    const out = [
      { label: 'Wisps', value: st.wisps + ' of ' + PARKMANOR.wispsMax() },
      { label: 'Frights', value: String(st.frights) },
      { label: 'Scare Outs', value: String(st.scareOuts) },
      { label: 'Spooks unwound', value: String(st.unwound) },
    ];
    let worst = -1, wn = 0; st.placeFrights.forEach((n, k) => { if (n > wn) { wn = n; worst = k; } });
    out.push(worst >= 0 ? 'Most Frights in ' + PARKMANOR_HOUSE.places[worst] + ' (' + wn + ').' : 'Not one Fright. Nerves of steel!');
    if (!st.caughtN) out.push('The Butler never laid a glove on you.');
    if (st.goldN) out.push('Gold help: the lantern burned brighter.');
    return out;
  },
};

/* ---------- the 2D 'parkmanor' outfit (previews, world page, ready card): the 3D one is parkmanor-outfits.js ----------
   Gift-shop costumes. Pip: glow-in-the-dark skeleton pyjamas (black with pale green bones) and a long purple-and-white
   striped nightcap with a pom-pom, the sprout poking through beside it. Bo: a little vampire cape with a high stand-up
   collar and a purple lining, plastic fangs, and a headband of two small bat wings between the ears.
   (Pip no blue, Bo no orange or red; eyes, sprout and ears clear.) */
defineOutfitPart('pmBonesPJ', { layer: 'body', draw(c) {
  const g = c.g, ink = OF_INK;
  // black pyjama top and legs over the lower body (the orange face stays)
  g.fillStyle = '#1d1a24'; ofRR(g, -11, -11, 22, 11, 3); g.fill();
  g.strokeStyle = ink; g.lineWidth = 1; g.stroke();
  const glow = '#c8ffb8';
  g.save(); g.shadowColor = '#9dff8a'; g.shadowBlur = 4;
  g.strokeStyle = glow; g.lineWidth = 1.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, -10); g.lineTo(0, -2); g.stroke(); // spine
  for (let i = 0; i < 3; i++) { const y = -9 + i * 2.4; g.beginPath(); g.moveTo(-1, y); g.quadraticCurveTo(-6, y - 0.5, -8, y + 1.4); g.moveTo(1, y); g.quadraticCurveTo(6, y - 0.5, 8, y + 1.4); g.stroke(); }
  g.beginPath(); g.ellipse(0, -1.4, 4, 1.6, 0, 0, Math.PI * 2); g.stroke(); // hips
  g.restore();
  g.fillStyle = '#2a2632'; g.fillRect(-11, -2.2, 22, 1.2); // waistband
} });
defineOutfitPart('pmNightcap', { layer: 'head', lift: 0, draw(c) {
  const g = c.g, ink = OF_INK, sway = Math.sin(c.t * 2) * 1.5;
  g.beginPath(); g.moveTo(-10.5, -23); g.quadraticCurveTo(-8, -33, 2, -35); g.quadraticCurveTo(12 + sway, -36, 15 + sway, -28); g.lineTo(9, -30); g.quadraticCurveTo(4, -29, 9, -23); g.closePath();
  ofFillStroke(g, '#f4f0fa', ink, 1.3);
  g.save(); g.clip(); g.fillStyle = '#8a4fd0';
  for (let i = -3; i < 8; i++) { g.beginPath(); g.moveTo(-12 + i * 5, -20); g.lineTo(-8 + i * 5, -20); g.lineTo(2 + i * 5, -38); g.lineTo(-2 + i * 5, -38); g.closePath(); g.fill(); }
  g.restore();
  g.beginPath(); g.moveTo(-10.5, -23); g.quadraticCurveTo(-8, -33, 2, -35); g.quadraticCurveTo(12 + sway, -36, 15 + sway, -28); g.lineTo(9, -30); g.quadraticCurveTo(4, -29, 9, -23); g.closePath(); g.strokeStyle = ink; g.lineWidth = 1.3; g.stroke();
  ofRR(g, -11, -24.5, 21, 3.2, 1.5); ofFillStroke(g, '#f4f0fa', ink, 1);
  ofCircle(g, 15.5 + sway, -27, 2.8); ofFillStroke(g, '#ffffff', ink, 1);
} });
defineOutfitPart('pmCape', { layer: 'back', draw(c) {
  const g = c.g, ink = OF_INK, fl = Math.sin(c.t * 3) * 1.2;
  g.beginPath(); g.moveTo(-11, -14); g.quadraticCurveTo(-15 - fl, -4, -13 - fl, 1); g.lineTo(13 + fl, 1); g.quadraticCurveTo(15 + fl, -4, 11, -14); g.closePath();
  ofFillStroke(g, '#24202e', ink, 1.2);
  g.fillStyle = '#7a3fc0'; g.beginPath(); g.moveTo(-10, -12); g.quadraticCurveTo(-13 - fl, -4, -11.5 - fl, 0.4); g.lineTo(-9, 0.4); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(10, -12); g.quadraticCurveTo(13 + fl, -4, 11.5 + fl, 0.4); g.lineTo(9, 0.4); g.closePath(); g.fill();
} });
defineOutfitPart('pmCollar', { layer: 'body', draw(c) {
  const g = c.g, ink = OF_INK;
  // the high stand-up collar: two purple-lined wings either side of the neck
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 4, -8); g.lineTo(s * 13, -15); g.lineTo(s * 12, -6); g.closePath(); ofFillStroke(g, '#7a3fc0', ink, 1); g.beginPath(); g.moveTo(s * 5, -8); g.lineTo(s * 12, -13.5); g.lineTo(s * 11.6, -8); g.closePath(); g.fillStyle = '#24202e'; g.fill(); }
  g.fillStyle = '#24202e'; ofRR(g, -11, -8, 22, 8, 3); g.fill(); g.strokeStyle = ink; g.lineWidth = 1; g.stroke();
  // a gold clasp
  ofCircle(g, 0, -7.4, 1.6); ofFillStroke(g, '#e2b84a', ink, 0.7);
} });
defineOutfitPart('pmFangs', { layer: 'front', draw(c) {
  const g = c.g, ink = OF_INK;
  for (const x of [-2.6, 2.6]) { g.beginPath(); g.moveTo(x - 1.3, -10.6); g.lineTo(x + 1.3, -10.6); g.lineTo(x, -7.6); g.closePath(); ofFillStroke(g, '#ffffff', ink, 0.6); }
} });
defineOutfitPart('pmBatBand', { layer: 'head', draw(c) {
  const g = c.g, ink = OF_INK, fl = Math.sin(c.t * 8) * 0.12;
  g.strokeStyle = '#24202e'; g.lineWidth = 1.8; g.beginPath(); g.arc(0, -19, 9.6, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  for (const s of [-1, 1]) {
    g.save(); g.translate(s * 2.6, -28); g.scale(s, 1); g.rotate(-fl);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(3, -5, 8, -4); g.quadraticCurveTo(7, -2, 8, 0); g.quadraticCurveTo(6, -0.5, 5, 1.5); g.quadraticCurveTo(3.5, 0, 2, 2); g.closePath();
    ofFillStroke(g, '#2e2638', ink, 0.9); g.restore();
  }
  ofCircle(g, 0, -28.3, 1.8); ofFillStroke(g, '#2e2638', ink, 0.8);
} });
defineOutfit('parkmanor', { pip: [['pmBonesPJ', {}], ['pmNightcap', {}]], bo: [['pmCape', {}], ['pmCollar', {}], ['pmFangs', {}], ['pmBatBand', {}]] });

/* ---------- the level ---------- */
PARKMANOR.def = {
  name: 'Spook Manor', world: 41, kind: 'team', mode: 'parkmanor', outfit: 'parkmanor', music: 'parkmanor', amb: 'parkmanor',
  view3d: true, touch: 'stick', ownStep: true, ownHUD: true, noFalls: true,
  jobs: {
    lantern: { title: 'Lantern', act: 'beam', legend: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk <kbd>Space</kbd> jump <kbd>F</kbd> hold to shine a beam',
      howTo: ['Carry the lantern.', 'Spooks freeze in the lantern\'s light.'] },
    key: { title: 'Key', act: 'key', legend: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk <kbd>Space</kbd> jump <kbd>F</kbd> hold to unwind or unlock',
      howTo: ['Carry the key.', 'Unwind a frozen spook with the key.'] },
  },
  legend: {
    pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk <kbd>Space</kbd> jump',
    bo: '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> walk <kbd>Shift</kbd> jump',
  },
  tip: 'Spooks only move in the dark. Light them, then unwind them.',
  howTo: ['Spooks freeze in the lantern\'s light.', 'Bo unwinds a frozen spook with the key.', 'Hide together when the Butler comes.'],
  act: { label: 'beam', labels: ['beam', 'key'] },
  map: Array.from({ length: 18 }, () => '.'.repeat(32)),
};
PARKMANOR.def.map[16] = '.'.repeat(10) + '1' + '.'.repeat(10) + '2' + '.'.repeat(10);
LEVELS.push(PARKMANOR.def);

// the 3D-only files: the park kit (shared by every World 42 level; loaded once even if listed twice), the outfits, the
// spooks' models and the house's scenery
for (const f of ['js/levels/world42/park-kit.js', 'js/levels/world42/parkmanor-outfits.js', 'js/levels/world42/parkmanor-figures.js', 'js/levels/world42/parkmanor-scenery.js'])
  if (!K3D.files.includes(f)) K3D.files.push(f);

/* ---------- sounds (an old fairground dark ride: wood, tin, springs, clockwork, a crackly tour guide) ---------- */
(function () {
  const X = Sfx.extra;
  X.parkmanorDoor = function (shut) { if (shut) { this.tone(70, 0.5, 'sine', 0.09, 45); this.noise(0.35, { type: 'lowpass', f: 600, vol: 0.08 }); } else { this.tone(380, 1.1, 'sawtooth', 0.012, 240); this.tone(520, 0.9, 'triangle', 0.008, 300, 0.2); this.noise(1.0, { type: 'bandpass', f: 900, to: 500, q: 6, vol: 0.02 }); } };
  X.parkmanorCreak = function () { this.tone(300 + Math.random() * 120, 0.6, 'sawtooth', 0.008, 200); this.noise(0.5, { type: 'bandpass', f: 700, q: 8, vol: 0.012 }); };
  X.parkmanorBeam = function () { this.tone(1200, 0.12, 'sine', 0.012, 1800); this.noise(0.18, { type: 'highpass', f: 5000, vol: 0.008 }); };
  X.parkmanorFreeze = function () { this.tone(2400, 0.03, 'square', 0.02, 1600); this.noise(0.04, { type: 'highpass', f: 3000, vol: 0.03 }); this.tone(900, 0.08, 'triangle', 0.015, 700, 0.03); };
  X.parkmanorTick = function () { for (let k = 0; k < 4; k++) this.tone(3200, 0.015, 'square', 0.008, 2600, k * 0.14); };
  X.parkmanorUnwind = function () { for (let k = 0; k < 10; k++) this.tone(1400 - k * 70, 0.02, 'square', 0.01, null, k * 0.09); };
  X.parkmanorSag = function () { this.tone(500, 0.9, 'sawtooth', 0.016, 90); this.noise(0.6, { type: 'bandpass', f: 1600, to: 300, q: 2, vol: 0.03 }); this.tone(1800, 0.06, 'triangle', 0.02, 1200, 0.7); };
  X.parkmanorLock = function (k) { if (k === 2) { this.tone(180, 0.12, 'square', 0.05, 110); this.noise(0.1, { type: 'highpass', f: 2600, vol: 0.04 }); return; } this.tone(k ? 1500 : 900, 0.05, 'square', 0.03, k ? 1100 : 600); this.tone(k ? 2200 : 1300, 0.06, 'triangle', 0.02, null, 0.06); this.noise(0.05, { type: 'highpass', f: 3000, vol: 0.02, delay: 0.06 }); };
  X.parkmanorWinder = function (done) { if (done) { [784, 988, 1319].forEach((f, k) => this.tone(f, 0.2, 'triangle', 0.02, null, k * 0.08)); return; } for (let k = 0; k < 6; k++) this.tone(2000 + (k % 2) * 400, 0.02, 'square', 0.01, null, k * 0.12); };
  X.parkmanorLampTick = function () { for (let k = 0; k < 6; k++) this.tone(2600, 0.02, 'square', 0.012, 2200, k * 0.25); };
  X.parkmanorSheet = function () { this.noise(0.8, { type: 'bandpass', f: 500, to: 300, q: 1, vol: 0.02, a: 0.2 }); this.tone(220, 0.9, 'sine', 0.01, 196); };
  X.parkmanorArmour = function (swing) { if (swing) { this.noise(0.25, { type: 'bandpass', f: 600, to: 2000, q: 1, vol: 0.05 }); this.tone(1800, 0.3, 'triangle', 0.03, 1200, 0.15); return; } this.tone(140, 0.15, 'square', 0.04, 90); this.tone(1700, 0.25, 'triangle', 0.02, 1500, 0.02); this.noise(0.15, { type: 'highpass', f: 2400, vol: 0.03 }); };
  X.parkmanorPortrait = function () { this.tone(160, 0.8, 'sawtooth', 0.01, 110); this.noise(0.6, { type: 'bandpass', f: 300, q: 2, vol: 0.02 }); };
  X.parkmanorChairs = function () { for (let k = 0; k < 6; k++) this.tone(400 + (k % 3) * 120, 0.04, 'square', 0.01, 200, k * 0.07); };
  X.parkmanorSpring = function () { this.tone(140, 0.5, 'sawtooth', 0.04, 900); this.tone(600, 0.4, 'triangle', 0.03, 120, 0.05); this.noise(0.2, { type: 'highpass', f: 2000, vol: 0.04 }); };
  X.parkmanorDolls = function () { [1320, 1480, 1320, 1180].forEach((f, k) => this.tone(f, 0.09, 'triangle', 0.012, f * 1.1, k * 0.1)); };
  X.parkmanorMusicBox = function () { [1047, 1319, 1568, 1319, 1175, 988].forEach((f, k) => this.tone(f, 0.4, 'sine', 0.012, null, k * 0.22)); };
  X.parkmanorFright = function (k) { const f = k ? 1250 : 1050; this.tone(f, 0.45, 'sawtooth', 0.02, f * 1.6); this.tone(f * 1.5, 0.35, 'triangle', 0.02, f * 2.2, 0.05); this.noise(0.15, { type: 'highpass', f: 3000, vol: 0.03 }); this.tone(90, 0.3, 'sine', 0.06, 60, 0.3); };
  X.parkmanorWake = function () { this.tone(500, 0.15, 'triangle', 0.03, 760); this.tone(760, 0.2, 'triangle', 0.025, 1000, 0.12); };
  X.parkmanorCackle = function () { for (let k = 0; k < 7; k++) this.tone(520 - k * 18 + (k % 2) * 90, 0.09, 'sawtooth', 0.02, 420 - k * 10, k * 0.11); this.noise(0.9, { type: 'bandpass', f: 1400, q: 3, vol: 0.015 }); };
  X.parkmanorClock = function () { [659, 523, 587, 392].forEach((f, k) => { this.tone(f, 0.9, 'sine', 0.025, null, k * 0.32); this.tone(f * 2.01, 0.5, 'triangle', 0.006, null, k * 0.32); }); };
  X.parkmanorWisp = function (show) { if (show) { this.tone(880, 0.4, 'sine', 0.015, 1320); this.tone(1320, 0.5, 'sine', 0.008, 1760, 0.1); return; } this.tone(1568, 0.18, 'sine', 0.02, 2093); this.tone(2093, 0.25, 'triangle', 0.008, 2637, 0.06); };
  X.parkmanorButlerTick = function () { for (let k = 0; k < 6; k++) { this.tone(1800, 0.02, 'square', 0.008, 1500, k * 0.5); this.tone(220, 0.08, 'sine', 0.015, 180, k * 0.5 + 0.25); } this.noise(0.6, { type: 'bandpass', f: 500, q: 6, vol: 0.012, delay: 1.2 }); };
  // his recorded voice: a calm low phrase through an old speaker (0 "May I take your coat?", 1 "Guests are requested
  // not to wander.", 2 the landing, 3 a pause, 4 "Do allow me to show you back to your room.")
  X.parkmanorButlerVoice = function (k) { const base = [130, 150, 120, 140, 110][k || 0]; const n = [5, 7, 4, 3, 9][k || 0]; for (let i = 0; i < n; i++) this.tone(base * (1 + ((i * 7) % 5) * 0.06), 0.18, 'sawtooth', 0.012, base * 0.95, i * 0.2); this.noise(n * 0.2, { type: 'bandpass', f: 1800, q: 4, vol: 0.006 }); };
  X.parkmanorHide = function (out) { if (out) { this.tone(420, 0.4, 'sawtooth', 0.008, 300); return; } this.tone(160, 0.2, 'sine', 0.04, 110); this.noise(0.18, { type: 'lowpass', f: 900, vol: 0.03 }); };
  X.parkmanorThunder = function () { this.noise(2.6, { type: 'lowpass', f: 380, to: 90, vol: 0.12, a: 0.03 }); this.noise(0.3, { type: 'highpass', f: 1800, to: 600, vol: 0.04 }); };
  X.parkmanorOrgan = function () { [147, 175, 220, 294].forEach((f, k) => this.tone(f, 1.8, 'sawtooth', 0.008, null, k * 0.02)); };
  X.parkmanorSlide = function () { this.tone(900, 1.2, 'triangle', 0.02, 200); this.noise(1.2, { type: 'bandpass', f: 1200, to: 400, q: 1, vol: 0.03 }); };
  X.parkmanorBow = function () { for (let k = 0; k < 8; k++) this.tone(900 - k * 80, 0.03, 'square', 0.01, null, k * 0.12); this.tone(80, 0.6, 'sine', 0.05, 60, 1.0); };
  X.parkmanorGuide = function () { this.noise(0.25, { type: 'bandpass', f: 2200, q: 3, vol: 0.02 }); this.tone(320, 0.06, 'square', 0.006, 300, 0.05); };
})();
