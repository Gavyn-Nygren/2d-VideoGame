/* Pip & Bo - Level 43-3 Claw Machine Rescue (team, World 43 Arcade Cabinet, 3D, two jobs all level). */
'use strict';

/* ===== 43-3 Claw Machine Rescue (mode 'arcadeclaw', team, view3d, one continuous climb) =====
   Beyond the pinball table another game wakes up: PRIZE PALACE, a claw machine. From hero size it is a glass hall as big
   as a warehouse, filled with a mountain of giant prizes. The pixel creatures who wandered in are sealed in prize
   capsules all over the mountain. ONE JOB EACH FOR THE WHOLE LEVEL (Gavyn, 2026-11-21), never swapped:
     PIP, the CLAW DRIVER, sits in the round glass cab on the claw's carriage.
       MOVE        the stick / direction keys slide the claw over the mountain (brisk, a little swing on the cable).
                   An orange AIM RING is projected straight down onto whatever is under the claw, with a thin beam.
       GRAB        jump or the action: the claw drops to the ring, closes on the toy that glows orange there and rises
                   with it (S.DOWN + S.CLOSE + S.UP s). On nothing grabbable it taps and comes back up (no penalty).
                   It never picks up Bo, a capsule or a creature.
       LET GO      the same button: the GHOST at the ring shows where the toy will sit, green if it can rest there
                   (it is lowered and set down the right way up), grey if not (then it stays held). Carrying a
                   carrier (a toy with a handle) with the ring on Bo, the button lowers it to OFFER the handle; once Bo
                   holds on, the claw lifts Bo by itself.
       The claw only runs on LIT rail (Bo's levers light it) and never further from Bo than the camera can show.
     BO, the CLIMBER, is on foot (MOVER3), with a smaller jump than usual (S.JUMPV: the toys are giant).
       RUN, JUMP   striped balls bounce Bo high.
       ACTION      at a capsule: hold S.OPEN_T s to twist it open and free the creature; at a power lever: pull it; at
                   a fuse box: open it (the rail bugs scatter); at a handle (a blue glow): hold to hang on (the claw can
                   then carry the toy with Bo on it; letting go drops Bo, and a fall onto the pile never hurts).
   TOYS (ARCADECLAW_MAP.toys): blockers, bridges, carriers, diggers, weights. A toy rests wherever its ghost was green and
   can always be picked up again. A NEEDED toy that ends up out of reach is restocked after S.RESTOCK s (a ceiling hatch).
   Toys never land on Bo (the ghost is grey over Bo) and never close Bo in.
   CAPSULES: 28 in all; the four gold ones (one per part) hold the creatures with the keys to the part gates.
   SETBACKS (the Snatcher's catch, a toy slide) put Bo back at the last checkpoint; everything moved stays moved.
   One room in the game's sense; the four parts are places on the mountain (never cards). State lives in G.mst and the
   rules never read the renderer (K3D.noRender plays the same). Names are prefixed arcadeclaw. */

const ARCADECLAW = (function () {
  const MP = ARCADECLAW_MAP;
  const S = {
    RUN: 0.78, JUMPV: 17.8, BOUNCE_V: 23.5, CLAW_V: 6.8, CLAW_ACC: 34, HEAVY: 0.72,
    DOWN: 0.5, CLOSE: 0.22, UP: 0.5, TAP: 0.85, OPEN_T: 0.6,
    CAB_DROP: 1.35, TIP_DROP: 3.05, GRIP: 0.42,
    LEASH_BACK: 5.5, LEASH_FWD: 15, LEASH_U: 13,
    HANG_R: 1.05, HANG_DROP: 1.0, CAP_R: 1.3, LEVER_R: 1.5, OFFER_R: 1.6, OFFER_LIFT: 0.35,
    SINK_T: 3, SINK_SPEED: 0.2, RESTOCK: 4, LOST_D: 22,
    INTRO_T: 12, SAY_T: 4.5, GOLD_N: 3, GOLD_IDLE: 120,
  };
  const CO = { S, MP };
  const hyp = Math.hypot;
  const clampN = (x, a, b) => Math.max(a, Math.min(b, x));
  const actHeld = p => !!(p.input && p.input.act);

  /* ---------- toys: shapes and frames ---------- */
  // the size a toy has now (the snake is a coil until first lifted)
  const dims = t => (t.coil && !t.uncoiled ? t.coil : t);
  CO.dims = dims;
  // a world point -> the toy's own frame (local x along w, local z along d)
  const toLocal = (t, x, z) => { const c = Math.cos(t.rot), s = Math.sin(t.rot), dx = x - t.x, dz = z - t.z; return [dx * c - dz * s, dx * s + dz * c]; };
  const toWorld = (t, lx, lz) => { const c = Math.cos(t.rot), s = Math.sin(t.rot); return [t.x + lx * c + lz * s, t.z - lx * s + lz * c]; };
  CO.toLocal = toLocal; CO.toWorld = toWorld;
  const inFoot = (t, x, z, m = 0) => { const D = dims(t), [lx, lz] = toLocal(t, x, z); return Math.abs(lx) <= D.w / 2 + m && Math.abs(lz) <= D.d / 2 + m; };
  CO.inFoot = inFoot;
  // a carrier's handle in the world
  CO.handleAt = t => { const [lx, ly, lz] = t.handle; const [x, z] = toWorld(t, lx, lz); return { x, y: t.y + ly, z }; };
  function syncSolid(t) {
    const D = dims(t), s = t.solid;
    s.x = t.x; s.z = t.z; s.w = D.w; s.d = D.d; s.y0 = t.y; s.y1 = t.y + D.h; s.rot = t.rot; s.c = Math.cos(t.rot); s.s = Math.sin(t.rot);
    s.ghost = !!t.held || !!t.gone;
  }

  /* ---------- a fresh climb ---------- */
  function fresh(st) {
    Object.assign(st, {
      t: 0, phase: 'intro', phaseT: 0, rng: 4343, fired: {}, says: [], fx: [], fxN: 0,
      lit: MP.rail.lit0, check: 0, sameCheck: 0, setbacks: 0, setbackCheck: -1, lastProgT: 0, gold: false, goldMsg: '', goldMsgT: -99,
      freed: 0, freedIds: [], catches: 0, slidesHit: 0, bumps: 0, carries: 0, partSetbacks: [0, 0, 0, 0],
      hang: null, hangOff: null, capHold: 0, capTgt: null, sink: 0, part: 0, finished: false, doneT: 0,
      clunkT: -9, humT: -9, buzzT: -9, ghost: null, prompts: {}, restocks: 0, levers: {}, opened: {},
    });
    // the ground, the capsules (solid until opened) and the toys (solid unless held)
    st.solids = MP.solids.map(s => Object.assign({}, s));
    st.sol = {}; for (const s of st.solids) st.sol[s.id] = s;
    st.caps = MP.caps.map(c => {
      const s = { id: 'cap-' + c.id, x: c.x, z: c.z, w: 1.05, d: 1.05, y0: c.y, y1: c.y + 1.2, rot: 0, look: 'capsule' };
      st.solids.push(s); st.sol[s.id] = s;
      return { def: c, id: c.id, x: c.x, y: c.y, z: c.z, open: 0, freed: false, freedT: 0, solid: s };
    });
    st.toys = MP.toys.map(d => {
      const t = Object.assign({}, d, { home: { x: d.x, y: d.y, z: d.z, rot: d.rot }, held: false, uncoiled: false, lostT: 0, moved: 0, setT: -9 });
      t.solid = { id: 'toy-' + d.id, x: 0, z: 0, w: 1, d: 1, y0: 0, y1: 1, rot: 0, look: 'toy', toy: d.id, bouncy: !!d.bouncy };
      syncSolid(t);
      st.solids.push(t.solid); st.sol[t.solid.id] = t.solid;
      return t;
    });
    st.toyById = {}; for (const t of st.toys) st.toyById[t.id] = t;
    st.w = MOVER3.world(st.solids);
    st.btn = {}; for (const b of MP.buttons) st.btn[b.id] = { down: false, t: -9 };
    st.gate = {}; for (const g of MP.gates) st.gate[g.id] = { open: false, t: -9 };
    const [cu, cs] = MP.start.claw;
    st.claw = { s: cs, u: cu, vs: 0, vu: 0, mode: 'free', t: 0, toy: null, tip: 0, tgtY: 0, place: null, offerBo: false, liftBo: false, swingX: 0, swingZ: 0 };
    st.claw.tip = tipIdle(st);
    const ps = G.players;
    const [bx, by, bz] = MP.start.bo;
    MOVER3.spawn(ps[1], bx, by, bz); ps[1].b3.heading = Math.PI;
    MOVER3.spawn(ps[0], cu, MP.railY(cs) - S.CAB_DROP, -cs); ps[0].b3.heading = Math.PI;
    K3D.heading = 0;
    // the opening plays once; after the first play a jump skips it
    st.seen = !!store.get('arcadeclaw:seen');
  }
  const rnd = st => { st.rng = (st.rng * 16807) % 2147483647; return st.rng / 2147483647; };
  CO.rnd = rnd;
  function say(st, text, who) { st.says.push({ text, t: st.t, who }); while (st.says.length > 3) st.says.shift(); }
  // what just happened, for the scenery (numbered, so the scenery never misses one when old ones are dropped)
  function fx(st, k, o = {}) { st.fxN = (st.fxN || 0) + 1; st.fx.push(Object.assign({ k, t: st.t, n: st.fxN }, o)); if (st.fx.length > 80) st.fx.splice(0, st.fx.length - 80); }
  CO.say = say; CO.fx = fx;

  /* ---------- the claw ---------- */
  const tipIdle = st => MP.railY(st.claw.s) - S.TIP_DROP;
  CO.tipIdle = tipIdle;
  const clawXZ = st => MP.at(st.claw.s, st.claw.u);
  CO.clawXZ = clawXZ;
  // the ring: the highest thing under the claw (toys, ground, capsules; not the toy it holds)
  function ringAt(st) {
    const [x, z] = clawXZ(st);
    const y = MOVER3.floorAt(st.w, x, z, tipIdle(st) - 0.05, 0);
    return { x, z, y: y === -Infinity ? -4 : y, on: MOVER3._on };
  }
  CO.ringAt = ringAt;
  // the toy the claw would close on at the ring (the top one there), or null
  function toyAtRing(st, r = ringAt(st)) {
    let best = null;
    for (const t of st.toys) {
      if (t.held || t.gone) continue;
      if (!inFoot(t, r.x, r.z, 0.3)) continue;
      const top = t.y + dims(t).h;
      if (top < r.y - 0.08) continue;
      if (!best || top > best.y + dims(best).h) best = t;
    }
    return best;
  }
  CO.toyAtRing = toyAtRing;
  // where a held toy would be set down at the ring, and whether it can rest there
  function ghostAt(st) {
    const C = st.claw, t = C.toy && st.toyById[C.toy];
    if (!t) return null;
    let [x, z] = clawXZ(st), rot = t.rot, snapped = false;
    for (const sp of MP.snaps) if (sp.toy === t.id && hyp(sp.x - x, sp.z - z) < sp.r) { x = sp.x; z = sp.z; rot = sp.rot; snapped = true; }
    const D = dims(t), c = Math.cos(rot), s = Math.sin(rot);
    // sample the floor under the footprint (not counting the toy itself, which is held and so a ghost)
    let lo = Infinity, hi = -Infinity, ends = [];
    const nx = Math.max(2, Math.ceil(D.w / 0.6)), nz = Math.max(2, Math.ceil(D.d / 0.6));
    const top = tipIdle(st);
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      const lx = (i / nx - 0.5) * D.w * 0.92, lz = (j / nz - 0.5) * D.d * 0.92;
      const wx = x + lx * c + lz * s, wz = z - lx * s + lz * c;
      const f = MOVER3.floorAt(st.w, wx, wz, top, 0);
      lo = Math.min(lo, f); hi = Math.max(hi, f);
      if (i === 0 || i === nx) ends.push(f);
    }
    const g = { toy: t.id, x, z, rot, snapped, ok: true, why: '' };
    if (t.bridge) {
      // a bridge rests on its two ends: both supported and level; the middle may be over nothing
      const e0 = Math.max(...ends.slice(0, nz + 1)), e1 = Math.max(...ends.slice(nz + 1));
      g.y = Math.max(e0, e1);
      if (!(e0 > -3.5 && e1 > -3.5) || Math.abs(e0 - e1) > 0.35) { g.ok = false; g.why = 'tilt'; }
    } else {
      g.y = hi;
      if (lo === -Infinity || hi - lo > 0.75) { g.ok = false; g.why = 'tilt'; }
    }
    if (g.y === -Infinity || g.y > top - D.h - 0.1) { g.ok = false; g.why = 'high'; }
    // never on Bo, never on a capsule, a lever or a button's rim; never over a creature
    const b = G.players[1].b3, ft = { x, z, rot, coil: t.coil, uncoiled: t.uncoiled, w: t.w, d: t.d };
    if (inFoot(ft, b.x, b.z, MOVER3.r + 0.35) && b.y < g.y + D.h + 0.2 && b.y > g.y - 2.5) { g.ok = false; g.why = 'bo'; }
    for (const cp of st.caps) if (!cp.freed && inFoot(ft, cp.x, cp.z, 0.45) && Math.abs(cp.y - g.y) < 1.4) { g.ok = false; g.why = 'cap'; }
    for (const lv of MP.levers) if (inFoot(ft, lv.x, lv.z, 0.5) && Math.abs(lv.y - g.y) < 1.5) { g.ok = false; g.why = 'lever'; }
    for (const fb of MP.fuses) if (inFoot(ft, fb.x, fb.z, 0.5) && Math.abs(fb.y - g.y) < 1.5) { g.ok = false; g.why = 'lever'; }
    // a carrier with Bo on it: Bo must land on ground beside it
    if (st.hang === t.id) {
      const hl = t.handle, hx = x + hl[0] * c + hl[2] * s, hz = z - hl[0] * s + hl[2] * c;
      const f = MOVER3.floorAt(st.w, hx + (hx - x) * 0.25, hz + (hz - z) * 0.25, g.y + 1.0, 0.1);
      if (f < g.y - 0.6) { g.ok = false; g.why = 'drop'; }
      g.boY = f;
    }
    return g;
  }
  CO.ghostAt = ghostAt;

  function clawStep(st, dt) {
    const C = st.claw, p = G.players[0], b = G.players[1].b3;
    const press = p.pendingJump || p.pendingAct;
    p.pendingJump = false; p.pendingAct = false;
    const t = C.toy && st.toyById[C.toy];
    C.t += dt;
    const idle = tipIdle(st);
    if (st.jam) { C.vs = C.vu = 0; C.tip += (idle + 0.5 - C.tip) * Math.min(1, dt * 3); if (t) carryToy(st, t); return; }
    if (C.mode === 'free') {
      C.tip = idle;
      // move: the stick in screen terms -> along the rail (s) and across it (u)
      const d = K3D.moveDir(p);
      const v = S.CLAW_V * (t && t.heavy ? S.HEAVY : 1) * (t && st.hang === t.id ? 0.85 : 1);
      const tu = d.x * v * d.s, ts = -d.z * v * d.s;
      const au = tu - C.vu, as = ts - C.vs, al = hyp(au, as), lim = S.CLAW_ACC * dt;
      if (al <= lim) { C.vu = tu; C.vs = ts; } else { C.vu += au / al * lim; C.vs += as / al * lim; }
      let ns = C.s + C.vs * dt, nu = C.u + C.vu * dt;
      // the rail: lit sections only; and never further from Bo than the camera shows
      const bs = MP.sOf(b.x, b.z), bu = MP.uOf(b.x, b.z);
      const sMax = Math.min(st.lit - 0.35, bs + S.LEASH_FWD), sMin = Math.max(MP.rail.s0, bs - S.LEASH_BACK);
      const uMin = Math.max(MP.rail.u0, bu - S.LEASH_U), uMax = Math.min(MP.rail.u1, bu + S.LEASH_U);
      if (ns > sMax) {
        if (C.vs > 0.5 && st.lit - 0.35 <= bs + S.LEASH_FWD && st.t - st.clunkT > 1.2) { st.clunkT = st.t; fx(st, 'clunk'); Sfx.play('arcadeclawRailClunk'); }
        else if (C.vs > 0.5 && st.t - st.humT > 1.2) { st.humT = st.t; Sfx.play('arcadeclawHum'); }
        ns = Math.max(C.s - 4 * dt, sMax); C.vs = Math.min(0, C.vs);
      }
      if (ns < sMin) { ns = Math.min(C.s + 4 * dt, sMin); C.vs = Math.max(0, C.vs); if (st.t - st.humT > 1.2 && ts < -0.5) { st.humT = st.t; Sfx.play('arcadeclawHum'); } }
      if (nu > uMax) { nu = Math.max(C.u - 4 * dt, uMax); C.vu = Math.min(0, C.vu); }
      if (nu < uMin) { nu = Math.min(C.u + 4 * dt, uMin); C.vu = Math.max(0, C.vu); }
      // wall fans push a carried toy sideways (the ring drifts with it, so it is always honest)
      if (t) for (const f of MP.fans) if (ns > f.s0 && ns < f.s1 && st.t % f.per < f.on) nu += f.push * dt;
      C.s = ns; C.u = clampN(nu, MP.rail.u0, MP.rail.u1);
      // swing on the cable: for the look only (a grab never misses because of it)
      C.swingX += (-C.vu * 0.05 - C.swingX) * Math.min(1, dt * 4); C.swingZ += (C.vs * 0.05 - C.swingZ) * Math.min(1, dt * 4);
      if (Math.hypot(C.vu, C.vs) > 0.5 && !st.clawMoving) Sfx.play('arcadeclawMove');
      st.clawMoving = Math.hypot(C.vu, C.vs) > 0.5;
      if (press) {
        if (!t) {
          const r = ringAt(st), hit = toyAtRing(st, r);
          C.mode = 'down'; C.t = 0; C.from = C.tip;
          if (hit) { C.grab = hit.id; C.tgtY = hit.y + dims(hit).h - S.GRIP; }
          else { C.grab = null; C.tgtY = Math.max(r.y + 0.35, (r.on && r.on.look === 'capsule') ? r.on.y1 + 0.5 : -99); if (b.y < C.tip && hyp(b.x - r.x, b.z - r.z) < 0.9) C.tgtY = Math.max(C.tgtY, b.y + MOVER3.h + 0.4); }
          C.vu = C.vs = 0; Sfx.play('arcadeclawDrop');
          if (!st.prompts.grab) st.prompts.grab = st.t;
        } else {
          // carrying a carrier with the ring on Bo: offer the handle
          const r = ringAt(st);
          if (t.carrier && st.hang !== t.id && hyp(b.x - r.x, b.z - r.z) < S.OFFER_R) {
            C.mode = 'offer'; C.t = 0; C.from = C.tip; C.vu = C.vs = 0;
            C.tgtY = b.y + MOVER3.h + 0.15 - t.handle[1] + dims(t).h - S.GRIP; // the handle at Bo's raised hands
            Sfx.play('arcadeclawDrop');
          } else {
            const g = ghostAt(st);
            if (g && g.ok) {
              C.mode = 'lower'; C.t = 0; C.from = C.tip; C.place = g; C.tgtY = g.y + dims(t).h - S.GRIP; C.vu = C.vs = 0;
              Sfx.play('arcadeclawDrop');
            } else { if (st.t - st.buzzT > 0.4) { st.buzzT = st.t; Sfx.play('arcadeclawMiss'); } fx(st, 'nope', { why: g && g.why }); }
          }
        }
      }
    } else if (C.mode === 'down') {
      const u = Math.min(1, C.t / S.DOWN);
      C.tip = C.from + (C.tgtY - C.from) * sm(u);
      if (u >= 1) {
        const hit = C.grab && st.toyById[C.grab];
        if (hit && !hit.held) { C.mode = 'close'; C.t = 0; Sfx.play('arcadeclawClose'); }
        else { C.mode = 'up'; C.t = 0; C.from = C.tip; C.grab = null; Sfx.play('arcadeclawMiss'); fx(st, 'tap'); }
      }
    } else if (C.mode === 'close') {
      if (C.t >= S.CLOSE) {
        const hit = st.toyById[C.grab];
        C.toy = hit.id; hit.held = true; hit.uncoiled = true;
        if (hit.bridge) hit.rot = Math.PI / 2; // a bridge hangs along the climb (gaps run across it)
        syncSolid(hit);
        C.mode = 'up'; C.t = 0; C.from = C.tip; st.carries++;
        // Bo holding the handle goes up with it
        if (st.hang === hit.id) { st.hangOff = null; C.liftBo = true; }
        Sfx.play('arcadeclawLift'); fx(st, 'grab', { toy: hit.id });
      }
    } else if (C.mode === 'up') {
      const u = Math.min(1, C.t / S.UP);
      C.tip = C.from + (idle - C.from) * sm(u);
      if (u >= 1) { C.mode = 'free'; C.t = 0; C.liftBo = false; }
    } else if (C.mode === 'lower') {
      const u = Math.min(1, C.t / S.DOWN);
      C.tip = C.from + (C.tgtY - C.from) * sm(u);
      if (u >= 1) {
        const g = C.place;
        t.x = g.x; t.z = g.z; t.rot = g.rot; t.y = g.y; t.held = false; t.setT = st.t; t.moved++;
        syncSolid(t);
        C.toy = null; C.mode = 'open'; C.t = 0;
        Sfx.play(t.heavy ? 'arcadeclawThudHeavy' : dims(t).h > 1.8 || dims(t).w > 3 ? 'arcadeclawThudBig' : 'arcadeclawThudSmall');
        fx(st, 'set', { toy: t.id });
        // Bo rides a carrier down and lets go on the ground beside it
        if (st.hang === t.id) { st.hang = null; fx(st, 'hop'); }
      }
    } else if (C.mode === 'open') {
      if (C.t >= S.CLOSE) { C.mode = 'up'; C.t = 0; C.from = C.tip; Sfx.play('arcadeclawOpen'); }
    } else if (C.mode === 'offer') {
      const u = Math.min(1, C.t / S.DOWN);
      C.tip = C.from + (C.tgtY - C.from) * sm(u);
      if (u >= 1) {
        if (st.hang === C.toy) { C.offerHold = (C.offerHold || 0) + dt; if (C.offerHold >= S.OFFER_LIFT) { C.mode = 'up'; C.t = 0; C.from = C.tip; C.offerHold = 0; C.liftBo = true; Sfx.play('arcadeclawLift'); } }
        else C.offerHold = 0;
        if (press) { C.mode = 'up'; C.t = 0; C.from = C.tip; C.offerHold = 0; }
      }
    }
    if (C.toy) carryToy(st, st.toyById[C.toy]);
  }
  const sm = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  // a held toy hangs from the claw, its top in the fingers
  function carryToy(st, t) {
    const [x, z] = clawXZ(st);
    t.x = x; t.z = z; t.y = st.claw.tip + S.GRIP - dims(t).h;
    syncSolid(t);
  }

  /* ---------- Bo ---------- */
  function boStep(st, dt) {
    const p = G.players[1], b = p.b3;
    const act = actHeld(p), tap = p.pendingAct;
    p.pendingAct = false;
    // hanging on a handle
    if (st.hang) {
      const t = st.toyById[st.hang], h = CO.handleAt(t);
      if (!act) { st.hang = null; st.hangOff = null; b.vy = 0; b.vx = b.vz = 0; b.ground = false; fx(st, 'letgo'); Sfx.play('arcadeclawLetGo'); }
      else {
        p.pendingJump = false;
        if (t.held) {
          // dangling: below the handle, swinging a little
          if (!st.hangOff) st.hangOff = { x: b.x - h.x, z: b.z - h.z };
          st.hangOff.x *= Math.max(0, 1 - dt * 3); st.hangOff.z *= Math.max(0, 1 - dt * 3);
          const ox = st.hangOff.x + (h.x - t.x) * 0.18, oz = st.hangOff.z + (h.z - t.z) * 0.18;
          b.x = h.x + ox; b.z = h.z + oz; b.y = h.y - S.HANG_DROP - MOVER3.h * 0.25; b.vx = b.vz = b.vy = 0; b.ground = false; b.on = null;
        } else {
          // the toy is on the ground: Bo holds the ribbon and waits
          b.vx = b.vz = 0;
          const f = MOVER3.floorAt(st.w, b.x, b.z, b.y + 0.3);
          if (f > -Infinity && b.y - f < 2.5) { b.y = f; b.ground = true; }
        }
        b.heading = Math.atan2(h.x - b.x, h.z - b.z) || b.heading;
        return;
      }
    }
    // the action: a capsule (hold), a lever or a fuse box (press), a handle (hold)
    const cap = nearCap(st, b);
    if (act && cap && !capCovered(st, cap)) {
      if (st.capTgt !== cap.id) { st.capTgt = cap.id; st.capHold = 0; Sfx.play('arcadeclawTwist'); }
      st.capHold += dt; cap.open = Math.min(1, st.capHold / S.OPEN_T);
      if (st.capHold >= S.OPEN_T) freeCap(st, cap);
      b.vx = b.vz = 0; p.pendingJump = false;
      b.heading = Math.atan2(cap.x - b.x, cap.z - b.z);
      MOVER3.step(p, st.w, dt, { dir: { x: 0, z: 0, s: 0 }, jump: false, teeter: false, jumpV: S.JUMPV });
      return;
    }
    if (st.capTgt) { const c = st.caps.find(q => q.id === st.capTgt); if (c && !c.freed) c.open = 0; st.capTgt = null; st.capHold = 0; }
    if (tap) {
      const lv = MP.levers.find(l => !st.levers[l.id] && hyp(l.x - b.x, l.z - b.z) < S.LEVER_R && Math.abs(l.y - b.y) < 1.2);
      if (lv) pullLever(st, lv);
    }
    if (act && !st.hang) {
      for (const t of st.toys) {
        if (!t.carrier || t.gone) continue;
        if (t.held && !(st.claw.toy === t.id && st.claw.mode === 'offer')) continue;
        const h = CO.handleAt(t);
        if (hyp(h.x - b.x, h.z - b.z) < S.HANG_R + MOVER3.r && b.y > h.y - 2.0 && b.y < h.y + 0.4) {
          st.hang = t.id; st.hangOff = null; fx(st, 'hang', { toy: t.id }); Sfx.play('arcadeclawHandle');
          if (!st.prompts.hang) st.prompts.hang = st.t;
          return;
        }
      }
    }
    // the sink spots
    const sk = MP.sinks.find(s => b.ground && b.x > s.x0 && b.x < s.x1 && b.z < s.z0 && b.z > s.z1 && Math.abs(b.y - s.y) < 0.3);
    if (sk) { if (st.sink === 0) Sfx.play('arcadeclawSink'); st.sink = Math.min(1, st.sink + dt / S.SINK_T); }
    else st.sink = Math.max(0, st.sink - dt * 2);
    const speed = st.sink > 0 ? S.RUN * (1 - st.sink * (1 - S.SINK_SPEED / S.RUN)) : S.RUN;
    MOVER3.step(p, st.w, dt, { speed, jumpV: S.JUMPV, jump: st.sink < 0.15, teeter: true });
    // bouncy balls and springs
    if (b.land && b.on && b.on.bouncy) { b.vy = S.BOUNCE_V * (p.input && p.input.jump ? 1.08 : 1); b.ground = false; b.jumping = false; b.on = null; Sfx.play('arcadeclawBounce'); fx(st, 'bounce'); }
    if (b.land && !b.on?.bouncy) fx(st, 'land');
    // a fall that goes on for ever (it should not happen): back to the checkpoint
    if (b.y < -9) restart(st, 'fell');
  }
  function nearCap(st, b) {
    let best = null, bd = S.CAP_R + MOVER3.r;
    for (const c of st.caps) { if (c.freed) continue; const d = hyp(c.x - b.x, c.z - b.z); if (d < bd && b.y > c.y - 0.6 && b.y < c.y + 1.3) { bd = d; best = c; } }
    return best;
  }
  CO.nearCap = nearCap;
  // a capsule under toys cannot be opened until they are lifted off
  function capCovered(st, c) {
    for (const t of st.toys) if (!t.held && !t.gone && inFoot(t, c.x, c.z, 0.35) && t.y < c.y + 1.4 && t.y + dims(t).h > c.y + 0.2) return t;
    for (const s of MP.solids) if (s.look === 'lid' && st.sol[s.id] && !st.sol[s.id].ghost && s.id === 'tb-lid' && c.def.gold && c.def.part === 0 && b0inBox(st)) return s;
    return null;
  }
  const b0inBox = st => false;
  CO.capCovered = capCovered;
  function freeCap(st, c) {
    c.freed = true; c.freedT = st.t; c.open = 1; c.solid.ghost = true;
    st.freed++; st.freedIds.push(c.id); st.lastProgT = st.t;
    st.capTgt = null; st.capHold = 0;
    Sfx.play('arcadeclawPop'); Sfx.play('arcadeclawCheer');
    fx(st, 'freed', { cap: c.id, x: c.x, y: c.y, z: c.z });
    if (!st.prompts.cap) st.prompts.cap = st.t;
    for (const g of MP.gates) if (g.key === c.id) { st.gate[g.id].pending = st.t + 1.2; }
  }
  function pullLever(st, lv) {
    st.levers[lv.id] = st.t; st.lastProgT = st.t;
    const was = st.lit; st.lit = Math.max(st.lit, lv.lights);
    Sfx.play('arcadeclawLever'); setTimeout0(() => Sfx.play('arcadeclawRailLight'));
    fx(st, 'lever', { id: lv.id, from: was, to: st.lit });
    if (!st.prompts.lever) st.prompts.lever = st.t;
  }
  const setTimeout0 = f => f();

  /* ---------- the machine: buttons, lids, gates, restocks, checkpoints ---------- */
  function machineStep(st, dt) {
    const b = G.players[1].b3;
    for (const bt of MP.buttons) {
      const B = st.btn[bt.id];
      const down = st.toys.some(t => t.heavy && !t.held && !t.gone && inFoot(t, bt.x, bt.z, 0.1) && Math.abs(t.y - bt.y) < 0.3);
      const lid = st.sol[bt.opens];
      // the lid stays open once its gold capsule is free, and never shuts on Bo
      const keep = st.caps.some(c => c.def.gold && c.freed && c.def.part === 0 && bt.id === 'btn1');
      const inside = lid && Math.abs(b.x - 4) < 2.0 && b.z < -61.6 && b.z > -66 && b.y < lid.y1;
      const open = down || keep || (B.down && inside);
      if (open !== B.down) { B.down = open; B.t = st.t; Sfx.play(open ? 'arcadeclawButton' : 'arcadeclawLid'); fx(st, open ? 'lidUp' : 'lidDown', { id: bt.opens }); if (open) st.lastProgT = st.t; }
      if (lid) lid.ghost = open;
    }
    for (const g of MP.gates) {
      const Gt = st.gate[g.id];
      if (!Gt.open && Gt.pending && st.t >= Gt.pending) { Gt.open = true; Gt.t = st.t; st.sol[g.solid].ghost = true; Sfx.play('arcadeclawGateHorn'); fx(st, 'gate', { id: g.id }); }
    }
    // a needed toy that is out of reach comes back down a ceiling hatch
    for (const t of st.toys) {
      if (t.held || !t.need) continue;
      const ob = MP.obstacles.find(o => o.id === t.need);
      if (ob && obDone(st, ob)) { t.lostT = 0; continue; }
      const far = hyp(t.x - t.home.x, t.z - t.home.z) > S.LOST_D || t.y < t.home.y - 1.2 || t.gone;
      t.lostT = far ? t.lostT + dt : 0;
      if (t.lostT >= S.RESTOCK) restock(st, t);
    }
    // checkpoints: the furthest one Bo has stood by
    for (let i = st.check + 1; i < MP.checks.length; i++) {
      const k = MP.checks[i];
      if (hyp(b.x - k.x, b.z - k.z) < 3.2 && Math.abs(b.y - k.y) < 1.5) {
        st.check = i; st.sameCheck = 0; st.lastProgT = st.t; st.gold = false;
        fx(st, 'check', { i }); Sfx.play('arcadeclawCheck');
      }
    }
    st.part = MP.parts.findIndex(pt => MP.sOf(b.x, b.z) < pt.s1);
    if (st.part < 0) st.part = MP.parts.length - 1;
  }
  function restock(st, t) {
    // the old one is put back at home (the hatch drops it from the ceiling: the scenery shows it falling)
    t.x = t.home.x; t.z = t.home.z; t.y = t.home.y; t.rot = t.home.rot; t.held = false; t.gone = false; t.lostT = 0; t.restockT = st.t;
    syncSolid(t); st.restocks++;
    Sfx.play('arcadeclawRestock'); fx(st, 'restock', { toy: t.id });
  }
  CO.restock = restock;
  function restart(st, why) {
    const k = MP.checks[st.check], p = G.players[1];
    if (st.hang) st.hang = null;
    MOVER3.spawn(p, k.x, k.y, k.z); p.b3.heading = Math.PI;
    st.sink = 0; st.setbacks++; st.partSetbacks[Math.max(0, st.part)]++;
    if (st.setbackCheck === st.check) st.sameCheck++; else { st.setbackCheck = st.check; st.sameCheck = 1; }
    if (st.sameCheck >= S.GOLD_N && !st.gold) goldOn(st, 'three tries');
    fx(st, 'restart', { why });
  }
  CO.restart = restart;
  function goldOn(st) {
    st.gold = true; st.goldMsg = 'Gold help: the next toy glows gold'; st.goldMsgT = st.t; Sfx.play('arcadeclawGold');
  }

  /* ---------- what is done (the brain, the checks and the restocks read this) ---------- */
  function obDone(st, ob) {
    const b = G.players[1].b3;
    switch (ob.kind) {
      case 'cap': return st.caps.find(c => c.id === ob.cap).freed;
      case 'lever': return !!st.levers[ob.lever];
      case 'lift': case 'bridge': case 'gate': return b.z < ob.pass || st.check > checkIndexAfter(ob);
      case 'carry': return (b.z < ob.pass && b.y > ob.passY) || st.check > checkIndexAfter(ob);
      case 'dig': return st.caps.find(c => c.id === ob.cap).freed;
      case 'sink': return b.z < MP.sinks.find(s => s.id === ob.sink).z1 - 0.3 || st.check > checkIndexAfter(ob);
      case 'weight': return st.btn[ob.button].down || st.caps.some(c => c.def.gold && c.def.part === ob.part && c.freed);
    }
    return true;
  }
  const checkIndexAfter = ob => { const i = MP.checks.findIndex(k => -k.z > ob.s + 1.5); return i < 0 ? 99 : i - 1 + 1; };
  CO.obDone = obDone;
  CO.nextOb = st => MP.obstacles.find(o => !obDone(st, o));

  /* ---------- one step ---------- */
  function step(st, dt) {
    st.t += dt; st.phaseT += dt;
    const ps = G.players;
    if (st.phase === 'intro') {
      for (const p of ps) { if (st.seen && p.pendingJump && st.phaseT > 0.4) st.phaseT = S.INTRO_T; p.pendingJump = false; p.pendingAct = false; }
      if (st.phaseT >= S.INTRO_T) { st.phase = 'play'; st.phaseT = 0; store.set('arcadeclaw:seen', 1); say(st, 'Pip drives the claw. Bo climbs!', 'guide'); }
      pipBody(st);
      return;
    }
    if (st.phase === 'done') { pipBody(st); for (const p of ps) { p.pendingJump = false; p.pendingAct = false; } return; }
    clawStep(st, dt);
    boStep(st, dt);
    machineStep(st, dt);
    st.ghost = st.claw.toy && st.claw.mode === 'free' ? ghostAt(st) : null;
    pipBody(st);
    // gold help after two minutes with no progress
    if (!st.gold && st.t - st.lastProgT > S.GOLD_IDLE) goldOn(st);
    // the end of what is built so far: through the first gate (parts 2 to 4 follow after the look check)
    const b = ps[1].b3;
    if (!st.finished && b.z < -73 && st.gate.gate1.open) { st.finished = true; st.phase = 'done'; st.doneT = st.t; Sfx.play('arcadeclawFinish'); levelClear(); }
  }
  // Pip's body sits in the cab (for name tags, bubbles and the tools)
  function pipBody(st) {
    const C = st.claw, [x, z] = clawXZ(st), b = G.players[0].b3;
    b.x = x; b.z = z; b.y = MP.railY(C.s) - S.CAB_DROP - 0.55; b.vx = C.vu; b.vz = -C.vs; b.vy = 0; b.ground = true;
  }
  CO.fresh = fresh; CO.step = step;
  return CO;
})();

/* ---------- the HUD: creatures freed, each player's job, the Snatcher's lamp ---------- */
ARCADECLAW.hud = function (st) {
  const MP = ARCADECLAW_MAP;
  // creatures freed: a row of little capsules that pop open (top left)
  const n = MP.capsTotal, row = 14, sx = 18, sy = 50;
  pill(10, 38, 32 + Math.min(n, row) * 15, n > row ? 52 : 30);
  for (let i = 0; i < n; i++) {
    const x = sx + 10 + (i % row) * 15, y = sy + 4 + Math.floor(i / row) * 20, got = i < st.freed;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = got ? '#ffd23a' : 'rgba(255,255,255,0.14)'; circle(0, got ? 2 : 0, 5); ctx.fill();
    ctx.strokeStyle = got ? '#7a5a10' : 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    if (got) { ctx.fillStyle = '#5aff8a'; ctx.fillRect(-2.5, -5, 5, 4); ctx.fillStyle = '#16121a'; ctx.fillRect(-1.6, -4, 1, 1); ctx.fillRect(0.6, -4, 1, 1); }
    else { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-4.5, -0.6, 9, 1.2); }
    ctx.restore();
  }
  // each player's job, by their corner
  const tag = (x, k, word) => {
    pill(x, H - 46, 136, 32);
    ctx.fillStyle = PCOL[k]; circle(x + 17, H - 30, 9); ctx.fill();
    text(NAMES[k][0], x + 17, H - 29, 11, '#fff', 'center', 'body');
    arcadeclawJobIcon(x + 40, H - 30, k);
    text(word, x + 56, H - 29, 13, C.paper, 'left', 'body');
  };
  tag(12, 0, st.jam ? 'Jammed!' : 'Claw driver');
  tag(W - 148, 1, st.hang ? 'Holding on' : 'Climber');
  // the Snatcher's lamp (lit while it hunts)
  const hunt = st.snatch && st.snatch.phase && st.snatch.phase !== 'away' && st.snatch.phase !== 'rest';
  pill(W / 2 - 22, H - 46, 44, 32);
  ctx.save(); ctx.fillStyle = hunt ? (Math.sin(G.clock * 12) > 0 ? '#ff3a2a' : '#a01a10') : '#3a2a2a'; circle(W / 2, H - 30, 9); ctx.fill();
  if (hunt) { ctx.shadowColor = '#ff3a2a'; ctx.shadowBlur = 14; circle(W / 2, H - 30, 6); ctx.fill(); }
  ctx.restore();
  // the guide line (the ticket-seller creature) and the computer's words are bubbles; the gold banner
  const sy0 = st.says[st.says.length - 1];
  if (sy0 && sy0.who === 'guide' && st.t - sy0.t < ARCADECLAW.S.SAY_T) {
    const a = Math.min(1, (ARCADECLAW.S.SAY_T - (st.t - sy0.t)) * 2, (st.t - sy0.t) * 4);
    ctx.save(); ctx.globalAlpha = a; ctx.font = '700 17px "Atkinson Hyperlegible", system-ui, sans-serif';
    const mw = Math.min(W - 240, ctx.measureText(sy0.text).width + 44);
    ctx.fillStyle = 'rgba(23,25,29,0.82)'; rr(W / 2 - mw / 2, 52, mw, 36, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,58,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
    text(sy0.text, W / 2, 70.5, 17, '#fff4d0', 'center', 'body'); ctx.restore();
  }
  if (st.t - st.goldMsgT < 4) {
    const a = Math.min(1, (4 - (st.t - st.goldMsgT)) * 2);
    ctx.save(); ctx.globalAlpha = a; ctx.font = '700 18px "Atkinson Hyperlegible", system-ui, sans-serif';
    const m = st.goldMsg, mw = ctx.measureText(m).width + 40;
    ctx.fillStyle = 'rgba(120,84,10,0.92)'; rr(W / 2 - mw / 2, 100, mw, 36, 18); ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke();
    text(m, W / 2, 118.5, 18, '#ffe9a8', 'center', 'body'); ctx.restore();
  }
  if (st.phase === 'intro' && st.seen) text(btnLabel(0, 'jump') + ' / ' + btnLabel(1, 'jump') + ' skip', W - 70, H - 64, 13, 'rgba(255,255,255,0.7)', 'right', 'body');
};
function arcadeclawJobIcon(x, y, k) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#f2ecdc'; ctx.fillStyle = '#f2ecdc'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  if (k === 0) { // a claw: a line down, three fingers
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -3); ctx.stroke();
    ctx.fillRect(-4, -4, 8, 3);
    ctx.beginPath(); ctx.moveTo(-3, -1); ctx.quadraticCurveTo(-7, 4, -3, 9); ctx.moveTo(3, -1); ctx.quadraticCurveTo(7, 4, 3, 9); ctx.moveTo(0, -1); ctx.lineTo(0, 8); ctx.stroke();
  } else { // a running figure
    circle(2, -7, 2.6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1, -4); ctx.lineTo(-1, 3); ctx.lineTo(-5, 9); ctx.moveTo(-1, 3); ctx.lineTo(4, 8); ctx.moveTo(-5, -2); ctx.lineTo(0, -3); ctx.lineTo(5, 0); ctx.stroke();
  }
  ctx.restore();
}

/* ---------- prompts over the world (the first three times each action comes up) ---------- */
ARCADECLAW.drawTop = function (st) {
  if (st.phase !== 'play') return;
  const S = ARCADECLAW.S, MP = ARCADECLAW_MAP, ps = G.players, b = ps[1].b3;
  const prompt = (k, what, wx, wy, wz, label, key) => {
    st.promptN = st.promptN || {};
    const n = st.promptN[key] || 0;
    if (n > 3) return;
    const sc = K3D.toScreen(wx, wy, wz); if (sc.z > 1) return;
    if (cpuSolo() && cpuOn(k)) return;
    drawBtn(k, what, sc.x - 30, sc.y - 12, { label });
  };
  // Bo near a capsule, a lever or a handle
  const cap = ARCADECLAW.nearCap(st, b);
  if (cap && !ARCADECLAW.capCovered(st, cap) && !cap.freed) prompt(1, 'act', cap.x, cap.y + 1.9, cap.z, 'hold to open', 'cap');
  const lv = MP.levers.find(l => !st.levers[l.id] && Math.hypot(l.x - b.x, l.z - b.z) < S.LEVER_R + 0.6);
  if (lv) prompt(1, 'act', lv.x, lv.y + 2.6, lv.z, 'pull', 'lever');
  if (!st.hang) for (const t of st.toys) if (t.carrier && !t.held) { const h = ARCADECLAW.handleAt(t); if (Math.hypot(h.x - b.x, h.z - b.z) < 1.8) prompt(1, 'act', h.x, h.y + 0.9, h.z, 'hold on', 'hang'); }
  // Pip: grab when the ring is on a toy
  const C = st.claw;
  if (C.mode === 'free' && !C.toy) { const tg = ARCADECLAW.toyAtRing(st); if (tg) { const [x, z] = ARCADECLAW.clawXZ(st); prompt(0, 'jump', x, C.tip + 1.2, z, 'grab', 'grab'); } }
  if (C.mode === 'free' && C.toy && st.ghost) { const [x, z] = ARCADECLAW.clawXZ(st); prompt(0, 'jump', x, C.tip + 1.2, z, st.ghost.ok ? 'let go' : 'no room', 'letgo'); }
};

/* ---------- MODES.arcadeclaw ---------- */
MODES.arcadeclaw = {
  medals: { bronze: 'Escape down the prize chute', goals: [{ key: 'freed', gold: 25, silver: 17, more: true, word: 'creature' , text: n => 'Free at least ' + n + ' creatures' }, { key: 'setbacks', gold: 3, silver: 9, word: 'setback' }] },
  medalValues() { const st = G.mst; return { freed: st.freed, setbacks: st.catches + st.slidesHit }; },
  scene3dOpts: { bg: '#07060c', fov: 50, near: 0.15, far: 900 },
  setup(st) { ARCADECLAW.fresh(st); for (const p of G.players) p.alive = true; },
  step(dt) { ARCADECLAW.step(G.mst, dt); },
  hud() { ARCADECLAW.hud(G.mst); },
  scene3d(K) { if (typeof ARCADECLAW_SCENE !== 'undefined') ARCADECLAW_SCENE.build(K, G.mst); },
  draw3d(K, dt) { if (typeof ARCADECLAW_SCENE !== 'undefined') ARCADECLAW_SCENE.update(K, G.mst, dt); },
  drawTop() { ARCADECLAW.drawTop(G.mst); },
  resultTitle() { return 'Everybody out of Prize Palace!'; },
  stats() {
    const st = G.mst;
    const out = [
      { label: 'Creatures freed', value: st.freed + ' of ' + ARCADECLAW_MAP.capsTotal },
      { label: 'Snatcher catches', value: String(st.catches) },
      { label: 'Snatcher bumps', value: String(st.bumps) },
      { label: 'Carries', value: String(st.carries) },
    ];
    let worst = -1, wn = 0; st.partSetbacks.forEach((n, k) => { if (n > wn) { wn = n; worst = k; } });
    out.push(worst >= 0 ? 'Most setbacks on ' + ARCADECLAW_MAP.parts[worst].name + ' (' + wn + ').' : 'Not one setback. Smooth climbing!');
    if (st.freed >= ARCADECLAW_MAP.capsTotal) out.push('Everybody home!');
    else if (!st.catches) out.push('The Snatcher never caught Bo.');
    return out;
  },
};

/* ---------- the level ---------- */
ARCADECLAW.def = {
  name: 'Claw Machine Rescue', world: 42, kind: 'team', mode: 'arcadeclaw', outfit: 'arcadeclaw', music: 'arcadecabinet', amb: 'arcadecabinet',
  view3d: true, touch: 'stick', ownStep: true, ownHUD: true, noFalls: true, noTime: false,
  jobs: {
    claw: { title: 'Claw driver', act: 'grab', legend: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move the claw <kbd>Space</kbd> grab or let go',
      howTo: ['Lift toys away and lay them as bridges.', 'Bo\'s levers light the rail for you.'] },
    climb: { title: 'Climber', act: 'open', legend: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> run <kbd>Space</kbd> jump <kbd>F</kbd> open, pull or hold on',
      howTo: ['Hold a ribbon to be carried.', 'Hide from the red ring, or call for a bump.'] },
  },
  job: ['claw', 'climb'],
  legend: {
    pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move the claw <kbd>Space</kbd> grab or let go',
    bo: '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> run <kbd>Shift</kbd> jump',
  },
  tip: 'Pip moves the toys. Bo frees the creatures.',
  howTo: ['Pip: lift toys away and lay them as bridges.', 'Bo: hold a ribbon to be carried.', 'Bo\'s levers light the rail for Pip.', 'Hide from the red ring, or bump the Snatcher.'],
  act: { label: 'grab', labels: ['grab', 'open'] },
  map: Array.from({ length: 18 }, () => '.'.repeat(32)),
};
ARCADECLAW.def.map[16] = '.'.repeat(10) + '1' + '.'.repeat(10) + '2' + '.'.repeat(10);
LEVELS.push(ARCADECLAW.def);

// the 3D-only files: the World 42 park kit (for its chasing bulbs) and the World 43 arcade kit (both shared; loaded once
// even if listed twice), then the outfits, the prizes, the machine, the mountain, its life and the scene
for (const f of ['js/levels/world42/park-kit.js', 'js/levels/world43/arcade-kit.js', 'js/levels/world43/arcadeclaw-outfits.js', 'js/levels/world43/arcadeclaw-toys.js', 'js/levels/world43/arcadeclaw-machine.js',
  'js/levels/world43/arcadeclaw-heaps.js', 'js/levels/world43/arcadeclaw-life.js', 'js/levels/world43/arcadeclaw-scene.js'])
  if (!K3D.files.includes(f)) K3D.files.push(f);

/* ---------- sounds (inside a claw machine: its old motor and rail, soft plush, plastic capsules, a crowd of tiny cheers) ---------- */
(function () {
  const X = Sfx.extra;
  // the claw
  X.arcadeclawMove = function () { this.tone(95, 0.5, 'sawtooth', 0.008, 110); this.noise(0.45, { type: 'bandpass', f: 900, q: 4, vol: 0.008, a: 0.1 }); };
  X.arcadeclawDrop = function () { this.tone(520, 0.5, 'square', 0.014, 180); this.noise(0.5, { type: 'bandpass', f: 1600, to: 700, q: 3, vol: 0.012 }); };
  X.arcadeclawClose = function () { this.tone(240, 0.12, 'square', 0.02, 160); this.noise(0.1, { type: 'highpass', f: 3500, vol: 0.02, delay: 0.05 }); };
  X.arcadeclawLift = function () { this.tone(180, 0.6, 'sawtooth', 0.01, 420); this.noise(0.55, { type: 'bandpass', f: 800, to: 1500, q: 3, vol: 0.01 }); };
  X.arcadeclawOpen = function () { this.tone(300, 0.1, 'square', 0.016, 420); this.noise(0.08, { type: 'highpass', f: 4000, vol: 0.015 }); };
  X.arcadeclawMiss = function () { this.tone(330, 0.14, 'square', 0.02, 300); this.tone(247, 0.2, 'square', 0.02, 220, 0.14); };
  X.arcadeclawHum = function () { this.tone(60, 0.5, 'sawtooth', 0.012, 58); this.tone(120, 0.5, 'square', 0.004, 118); };
  X.arcadeclawRailClunk = function () { this.tone(80, 0.25, 'square', 0.05, 50); this.noise(0.2, { type: 'lowpass', f: 900, vol: 0.05 }); this.tone(1400, 0.08, 'triangle', 0.01, 1200, 0.03); };
  X.arcadeclawRailLight = function () { for (let k = 0; k < 8; k++) this.tone(523 + k * 110, 0.07, 'square', 0.01, null, 0.1 + k * 0.07); this.tone(60, 0.8, 'sawtooth', 0.01, 120); };
  // toys set down: small plastic, big plush, heavy tin
  X.arcadeclawThudSmall = function () { this.tone(320, 0.1, 'triangle', 0.025, 220); this.noise(0.08, { type: 'bandpass', f: 2200, q: 2, vol: 0.015 }); };
  X.arcadeclawThudBig = function () { this.tone(110, 0.3, 'sine', 0.06, 60); this.noise(0.3, { type: 'lowpass', f: 700, to: 200, vol: 0.05 }); };
  X.arcadeclawThudHeavy = function () { this.tone(70, 0.45, 'square', 0.05, 40); this.noise(0.35, { type: 'lowpass', f: 1200, to: 200, vol: 0.06 }); this.tone(1800, 0.2, 'triangle', 0.008, 1700, 0.04); };
  // Bo
  X.arcadeclawBounce = function () { this.tone(200, 0.25, 'sine', 0.05, 640); this.tone(900, 0.12, 'triangle', 0.012, 1200, 0.05); };
  X.arcadeclawHandle = function () { this.noise(0.12, { type: 'bandpass', f: 2600, q: 2, vol: 0.02 }); this.tone(660, 0.1, 'triangle', 0.015, 880); };
  X.arcadeclawLetGo = function () { this.noise(0.15, { type: 'bandpass', f: 1800, to: 900, q: 2, vol: 0.02 }); };
  X.arcadeclawSink = function () { this.noise(0.9, { type: 'lowpass', f: 900, to: 300, vol: 0.04, a: 0.2 }); for (let k = 0; k < 4; k++) this.tone(400 - k * 40, 0.06, 'sine', 0.012, null, 0.15 + k * 0.17); };
  X.arcadeclawLever = function () { this.noise(0.25, { type: 'bandpass', f: 600, to: 1600, q: 1.2, vol: 0.03 }); this.tone(110, 0.2, 'square', 0.03, 80, 0.18); this.tone(880, 0.1, 'square', 0.012, null, 0.3); };
  X.arcadeclawButton = function () { this.tone(130, 0.12, 'square', 0.05, 90); this.tone(1046, 0.12, 'square', 0.014, null, 0.08); };
  X.arcadeclawLid = function () { this.tone(150, 0.3, 'square', 0.03, 90); this.noise(0.25, { type: 'lowpass', f: 900, vol: 0.04 }); };
  // the capsules and the creatures
  X.arcadeclawTwist = function () { this.noise(0.5, { type: 'bandpass', f: 3000, to: 4200, q: 6, vol: 0.015 }); this.tone(700, 0.45, 'triangle', 0.008, 900); };
  X.arcadeclawPop = function () { this.tone(1400, 0.06, 'square', 0.03, 400); this.noise(0.06, { type: 'highpass', f: 3500, vol: 0.04 }); this.tone(500, 0.15, 'sine', 0.03, 900, 0.03); };
  X.arcadeclawCheer = function () { for (let k = 0; k < 6; k++) this.tone(900 + (k % 3) * 260 + k * 30, 0.09, 'square', 0.01, 1300 + k * 40, 0.12 + k * 0.06); };
  X.arcadeclawCheck = function () { [659, 880, 1175].forEach((f, k) => this.tone(f, 0.12, 'square', 0.014, null, k * 0.07)); };
  X.arcadeclawGold = function () { [784, 988, 1175, 1568].forEach((f, k) => this.tone(f, 0.2, 'triangle', 0.025, null, k * 0.09)); };
  X.arcadeclawRestock = function () { this.tone(1200, 0.4, 'sine', 0.012, 300); this.tone(90, 0.2, 'sine', 0.05, 50, 0.4); this.noise(0.2, { type: 'lowpass', f: 600, vol: 0.04, delay: 0.4 }); };
  X.arcadeclawGateHorn = function () { this.tone(196, 0.7, 'sawtooth', 0.025, 196); this.tone(247, 0.7, 'sawtooth', 0.02, 247); this.tone(294, 0.7, 'square', 0.012, 294, 0.05); };
  X.arcadeclawFinish = function () { [523, 659, 784, 1047, 784, 1047].forEach((f, k) => this.tone(f, 0.16, 'square', 0.016, null, k * 0.11)); this.noise(0.6, { type: 'highpass', f: 5000, vol: 0.015, delay: 0.5 }); };
})();

/* ---------- the 2D outfit 'arcadeclaw' (previews, the world page, the title run): the same as the 3D one ----------
   Pip: the prize-counter attendant (mint-and-white striped waistcoat with pinned tickets, a yellow bow tie, a yellow
   operator's headset). Bo: kitted out from the prizes (a teal ticket-ribbon harness with a glow stick, half a clear yellow
   capsule as a helmet, purple fingerless gloves). */
defineOutfitPart('aclWaistcoat', { layer: 'body', draw(c) {
  const g = c.g, ink = OF_INK;
  g.save(); g.beginPath(); g.moveTo(-11, -14); g.lineTo(-3, -14); g.lineTo(0, -6); g.lineTo(3, -14); g.lineTo(11, -14); g.lineTo(11, -2); g.lineTo(-11, -2); g.closePath(); g.clip();
  for (let x = -12; x < 12; x += 3) { g.fillStyle = (Math.round(x / 3) % 2) ? '#f6fff8' : '#5fd6a0'; g.fillRect(x, -15, 3, 14); }
  g.restore();
  g.beginPath(); g.moveTo(-11, -14); g.lineTo(-3, -14); g.lineTo(0, -6); g.lineTo(3, -14); g.lineTo(11, -14); g.lineTo(11, -2); g.lineTo(-11, -2); g.closePath(); g.strokeStyle = ink; g.lineWidth = 1.1; g.stroke();
  // three prize tickets pinned on
  [[-8, -10, -0.2, '#ff8ab8'], [-6, -6.5, 0.15, '#ffd23a'], [7, -9, 0.1, '#7ae8ff']].forEach(([x, y, a, col]) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = col; g.fillRect(-1.6, -1.1, 3.2, 2.2); g.strokeStyle = ink; g.lineWidth = 0.5; g.strokeRect(-1.6, -1.1, 3.2, 2.2); g.restore(); });
} });
defineOutfitPart('aclBowTie', { layer: 'front', draw(c) {
  const g = c.g, ink = OF_INK;
  g.beginPath(); g.moveTo(0, -13.5); g.lineTo(-3.6, -15.5); g.lineTo(-3.6, -11.5); g.closePath(); g.moveTo(0, -13.5); g.lineTo(3.6, -15.5); g.lineTo(3.6, -11.5); g.closePath(); ofFillStroke(g, '#ffd23a', ink, 0.8);
  g.beginPath(); g.arc(0, -13.5, 1.1, 0, Math.PI * 2); ofFillStroke(g, '#e8b020', ink, 0.6);
} });
defineOutfitPart('aclHeadset', { layer: 'head', lift: 1, draw(c) {
  const g = c.g, ink = OF_INK;
  g.strokeStyle = '#ffd23a'; g.lineWidth = 1.8; g.beginPath(); g.arc(0, -17, 10.5, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
  g.strokeStyle = ink; g.lineWidth = 0.6; g.beginPath(); g.arc(0, -17, 11.4, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 10.2, -19, 2.2, 3, 0, 0, Math.PI * 2); ofFillStroke(g, '#ffd23a', ink, 0.9); }
  // the little microphone round to the mouth
  g.strokeStyle = '#3a3a44'; g.lineWidth = 1; g.beginPath(); g.moveTo(-10, -17); g.quadraticCurveTo(-9, -12, -5, -12.5); g.stroke();
  g.beginPath(); g.arc(-4.6, -12.6, 1.1, 0, Math.PI * 2); ofFillStroke(g, '#3a3a44', ink, 0.5);
} });
defineOutfitPart('aclHarness', { layer: 'body', draw(c) {
  const g = c.g, ink = OF_INK, pulse = 0.65 + 0.35 * Math.sin(c.t * 4);
  g.strokeStyle = ink; g.lineWidth = 3.2; g.beginPath(); g.moveTo(-8, -15); g.lineTo(6, -3); g.moveTo(8, -15); g.lineTo(-6, -3); g.moveTo(-11, -5); g.lineTo(11, -5); g.stroke();
  g.strokeStyle = '#2ab8a8'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-8, -15); g.lineTo(6, -3); g.moveTo(8, -15); g.lineTo(-6, -3); g.moveTo(-11, -5); g.lineTo(11, -5); g.stroke();
  g.fillStyle = '#c8ccd6'; g.beginPath(); g.arc(0, -9, 1.6, 0, Math.PI * 2); g.fill(); g.strokeStyle = ink; g.lineWidth = 0.6; g.stroke();
  // the glow stick clipped on
  g.save(); g.shadowColor = '#7aff9a'; g.shadowBlur = 5 * pulse; g.fillStyle = `rgba(120,255,150,${0.75 + 0.25 * pulse})`; g.fillRect(8, -8, 1.8, 6); g.restore();
  g.strokeStyle = ink; g.lineWidth = 0.6; g.strokeRect(8, -8, 1.8, 6);
} });
defineOutfitPart('aclCapsuleHelmet', { layer: 'head', lift: 3, draw(c) {
  const g = c.g, ink = OF_INK;
  g.beginPath(); g.moveTo(-9, -23); g.bezierCurveTo(-9, -31, 9, -31, 9, -23); g.closePath(); g.fillStyle = 'rgba(255,214,60,0.55)'; g.fill(); g.strokeStyle = ink; g.lineWidth = 1.1; g.stroke();
  g.fillStyle = '#ffd23a'; g.fillRect(-9.6, -24, 19.2, 1.8); g.strokeStyle = ink; g.lineWidth = 0.7; g.strokeRect(-9.6, -24, 19.2, 1.8);
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-4, -28, 2.2, 1, -0.4, 0, Math.PI * 2); g.fill();
} });
defineOutfitPart('aclGloves', { layer: 'front', draw(c) {
  const g = c.g, ink = OF_INK;
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 11.5, -8, 2.6, 2.4, 0, 0, Math.PI * 2); ofFillStroke(g, '#8a5ad8', ink, 0.9); }
} });
defineOutfit('arcadeclaw', { pip: [['aclWaistcoat', {}], ['aclBowTie', {}], ['aclHeadset', {}]], bo: [['aclHarness', {}], ['aclCapsuleHelmet', {}], ['aclGloves', {}]] });
