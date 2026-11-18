/* Pip & Bo - 42-3 Spook Manor: the clockwork spooks and Grimsby the Butler, as rules (PARKMANOR_SPOOKS). No three.js;
   loaded with the game. Their 3D models are in parkmanor-figures.js.

   Every spook is a fairground figure with a key turning in its back. It only moves in the dark:
     dormant  waiting for its wake trigger (still, eyes dark)
     wake     its eyes light and its key starts to tick for S.WAKE s before it can move (heard and seen first)
     move     the dark: it comes on (a Sheet glides straight at the nearest hero; armour takes one clanking step at a
              time and swings when close)
     frozen   in strong light: locked solid with a click, harmless to touch. The moment the light leaves, after S.THAW
              s, it moves again
     back     it gave a hero a Fright and backs off for S.BACK s
     done     Bo unwound it: sagged, eyes out, finished for the level
   Bo unwinds a FROZEN spook by holding the key on it for S.UNWIND s (from any side, within S.REACH). On a moving one the
   key will not go in: it bites (a jolt, nothing counted).
   The Butler (st.butler) walks scripted visits from PARKMANOR_HOUSE.butler; the light only slows him (to a third). He
   sees a hero in a clear line within S.B_SEE (S.B_SEE_LIT when the hero is in the lantern's light) in front of him and
   comes for them; a pair hidden together is not seen; a touch is a Scare Out (the level's api.caught()).
   The level passes api = { fright(k, why), caught(k), heroes: [...] }. Nothing here reads the renderer. */
'use strict';

const PARKMANOR_SPOOKS = (function () {
  const H = PARKMANOR_HOUSE, PML = PARKMANOR_LIGHT;
  const S = {
    WAKE: 1.6, THAW: 0.35, BACK: 3.0, UNWIND: 1.0, REACH: 1.25, TOUCH: 0.72,
    SHEET_V: 1.25, TEACH_V: 0.85, ARM_STEP: 0.75, ARM_STEP_T: 0.45, ARM_WAIT: 1.4, ARM_NEAR: 1.6, ARM_RAISE: 0.75, ARM_HIT: 1.55,
    B_SEE: 10, B_SEE_LIT: 13, B_FOV: 1.25, B_CHASE: 3.1, B_SLOW: 1 / 3, B_LOSE: 3.5, B_TOUCH: 0.85,
    COOK_V: 0.95, COOK_TOUCH: 0.95, COOK_UNWIND: 2.0, DOLL_V: 1.55, DOLL_TOUCH: 0.62, DOLL_UNWIND: 0.8,
    PORT_NEAR: 1.45, PORT_RAISE: 1.1, PORT_HIT: 1.35, DANCE_SPIN: 1.5, DANCE_R: 0.75, DANCE_DRIFT: 0.34, DANCE_TOUCH: 0.66,
    BOSS_V: 1.55, BOSS_V_LIT: 0.3, BOSS_TURN: 3.0, BOSS_TURN_LIT: 2.2, BOSS_TOUCH: 0.85, BOSS_REACH: 1.35, BOSS_BEHIND: 2.0, BOSS_SHRUG: 0.9, BOSS_AGGRO: 3.0,
  };
  // how long Bo's key takes on each kind
  const UNWIND = { cook: S.COOK_UNWIND, doll: S.DOLL_UNWIND };
  const unwindOf = k => UNWIND[k] || S.UNWIND;
  const P = { S };
  P.unwindT = sp => unwindOf(sp.kind);
  const hyp = Math.hypot;

  P.init = function (st) {
    st.spooks = H.spooks.map(d => ({ id: d.id, def: d, kind: d.kind, x: d.x, z: d.z, y: 0, face: d.face || 0, state: d.wake ? 'dormant' : 'wake',
      t: 0, wakeT: S.WAKE, thaw: 0, back: 0, unwind: 0, lit: false, wasLit: false, step: 0, stepFrom: null, waitT: 0, raise: 0, vx: 0, vz: 0, bite: 0, walk: 0,
      cx: d.centre ? d.centre[0] : d.x, cz: d.centre ? d.centre[1] : d.z, th: d.ph || 0 }));
    for (const sp of st.spooks) sp.y = Math.max(0, MOVER3.floorAt(st.w, sp.x, sp.z, 8, 0));
    const hb = H.boss;
    st.boss = hb ? { state: 'idle', x: hb.x, z: hb.z, y: 0, face: hb.face, turns: 0, holdT: 0, t: 0, target: -1, lit: false, aggro: 0, said: 0 } : null;
    st.butler = { visit: -1, state: 'off', x: 0, z: 0, y: 0, face: 0, seg: 0, t: 0, pauseT: 0, target: -1, loseT: 0, lit: false, said: {}, done: {}, heard: 0, what: '' };
  };
  // back to the restart: spooks not yet unwound go home and wait for a hero again; a Butler visit not finished resets
  P.restart = function (st) {
    for (const s of st.spooks) {
      if (s.state === 'done') continue;
      Object.assign(s, { x: s.def.x, z: s.def.z, face: s.def.face || 0, state: s.def.wake && !st.fired[s.def.wake] ? 'dormant' : 'rest', wakeT: S.WAKE, thaw: 0, back: 0, unwind: 0, raise: 0, step: 0, stepFrom: null, waitT: 0,
        cx: s.def.centre ? s.def.centre[0] : s.def.x, cz: s.def.centre ? s.def.centre[1] : s.def.z, th: s.def.ph || 0 });
    }
    const b = st.butler;
    if (b.visit >= 0 && !b.done[b.visit]) { const v = H.butler[b.visit]; st.fired[v.trig] = false; }
    Object.assign(b, { visit: -1, state: 'off', target: -1 });
    // Grimsby at the exit goes back to his place (the turns already given stay given)
    const bo = st.boss;
    if (bo && bo.state !== 'down' && bo.state !== 'done') Object.assign(bo, { state: 'idle', x: H.boss.x, z: H.boss.z, face: H.boss.face, holdT: 0, t: 0, target: -1, aggro: 0 });
  };
  const heroes = st => G.players.map((p, k) => ({ k, b: p.b3, ok: p.b3 && st.stiff[k] <= 0 && !st.hidden && !st.caught && !st.ride }));
  function nearest(st, x, z) {
    let best = null, bd = 1e9;
    for (const h of heroes(st)) { if (!h.ok) continue; const d = hyp(h.b.x - x, h.b.z - z); if (d < bd) { bd = d; best = h; } }
    return best ? { h: best, d: bd } : null;
  }
  // a spook's body against the house (walls, furniture), as a circle
  const body = { x: 0, z: 0, vx: 0, vz: 0 };
  function slide(st, s, mx, mz, r = 0.38) {
    body.x = s.x + mx; body.z = s.z + mz; body.vx = body.vz = 0;
    MOVER3.push(st.w, body, r, s.y + 0.05, 1.6);
    s.x = body.x; s.z = body.z;
    const fy = MOVER3.floorAt(st.w, s.x, s.z, s.y + 0.4, 0); if (fy > -5) s.y = fy;
  }

  P.step = function (st, dt, api) {
    for (const s of st.spooks) {
      s.t += dt; s.bite = Math.max(0, s.bite - dt);
      if (s.state === 'done') { s.unwind = 1; continue; }
      if (s.state === 'dormant') { if (s.def.wake && st.fired[s.def.wake]) { s.state = 'wake'; s.wakeT = S.WAKE; } else continue; }
      // a spook back home after a Scare Out waits until a hero comes near (never on top of a restart)
      if (s.state === 'rest') { const n = nearest(st, s.x, s.z); if (n && n.d < 7.5) { s.state = 'wake'; s.wakeT = S.WAKE; } else continue; }
      const lit = PML.lit(st, s.x, s.z) || (s.kind === 'doll' && st.wound.some(w => w.def.kind === 'musicbox' && w.t > 0));
      s.wasLit = s.lit; s.lit = lit;
      if (lit) {
        if (s.state !== 'frozen') { s.state = 'frozen'; s.raise = 0; Sfx.play('parkmanorFreeze'); if (s.def.teach && !st.fired.teachLit) api.fire('teachLit'); }
        s.thaw = S.THAW; s.vx = s.vz = 0;
        continue;
      }
      // not lit: a Bo still holding the key on it lets go (the unwinding needs it still)
      if (s.state === 'frozen') { s.thaw -= dt; if (s.thaw > 0) continue; s.state = 'move'; s.unwind = 0; s.waitT = 0; Sfx.play('parkmanorTick'); }
      if (s.state === 'wake') { s.wakeT -= dt; if (s.wakeT > 0) continue; s.state = 'move'; Sfx.play('parkmanorTick'); }
      if (s.state === 'back') {
        s.back -= dt;
        const n = nearest(st, s.x, s.z);
        if (n && s.kind === 'dancer') { const dx = s.cx - n.h.b.x, dz = s.cz - n.h.b.z, d = hyp(dx, dz) || 1; s.cx += dx / d * 0.6 * dt; s.cz += dz / d * 0.6 * dt; s.th += S.DANCE_SPIN * dt; s.x = s.cx + Math.cos(s.th) * S.DANCE_R; s.z = s.cz + Math.sin(s.th) * S.DANCE_R; }
        else if (n && s.kind !== 'portrait') { const dx = s.x - n.h.b.x, dz = s.z - n.h.b.z, d = hyp(dx, dz) || 1; slide(st, s, dx / d * 0.9 * dt, dz / d * 0.9 * dt); }
        if (s.back <= 0) s.state = 'move';
        continue;
      }
      const n = nearest(st, s.x, s.z);
      if (!n) continue;
      const dx = n.h.b.x - s.x, dz = n.h.b.z - s.z, d = n.d || 1;
      if (s.kind === 'sheet' || s.kind === 'cook' || s.kind === 'doll') {
        const v = s.kind === 'cook' ? S.COOK_V : s.kind === 'doll' ? S.DOLL_V : s.def.teach ? S.TEACH_V : S.SHEET_V;
        const touch = s.kind === 'cook' ? S.COOK_TOUCH : s.kind === 'doll' ? S.DOLL_TOUCH : S.TOUCH;
        s.face = Math.atan2(dx, dz); s.walk += dt;
        slide(st, s, dx / d * v * dt, dz / d * v * dt, s.kind === 'cook' ? 0.5 : s.kind === 'doll' ? 0.26 : 0.38);
        if (d < touch) { api.fright(n.h.k, s); s.state = 'back'; s.back = S.BACK; }
      } else if (s.kind === 'portrait') {
        // it cannot leave its frame: an arm creaks out at anyone passing close in the dark, and grabs if they stay
        if (s.raise > 0) {
          s.raise += dt;
          if (s.raise >= S.PORT_RAISE) {
            for (const h of heroes(st)) if (h.ok && hyp(h.b.x - s.x, h.b.z - s.z) < S.PORT_HIT) { api.fright(h.k, s); break; }
            s.raise = 0; s.state = 'back'; s.back = S.BACK;
          }
        } else if (d < S.PORT_NEAR) { s.raise = 0.001; Sfx.play('parkmanorPortrait'); }
      } else if (s.kind === 'dancer') {
        // round and round its spot, and the spot drifts after the nearest hero
        s.th += S.DANCE_SPIN * dt;
        const ex = n.h.b.x - s.cx, ez = n.h.b.z - s.cz, ed = hyp(ex, ez) || 1;
        body.x = s.cx + ex / ed * S.DANCE_DRIFT * dt; body.z = s.cz + ez / ed * S.DANCE_DRIFT * dt; body.vx = body.vz = 0;
        MOVER3.push(st.w, body, 1.0, 0.05, 1.6); s.cx = body.x; s.cz = body.z;
        const nx = s.cx + Math.cos(s.th) * S.DANCE_R, nz = s.cz + Math.sin(s.th) * S.DANCE_R;
        s.face = Math.atan2(nx - s.x, nz - s.z); s.walk += dt;
        s.x = nx; s.z = nz;
        if (d < S.DANCE_TOUCH + 0.2) { for (const h of heroes(st)) if (h.ok && hyp(h.b.x - s.x, h.b.z - s.z) < S.DANCE_TOUCH) { api.fright(h.k, s); s.state = 'back'; s.back = S.BACK; break; } }
      } else if (s.kind === 'armour') {
        // one clanking step at a time, a pause between, and a raised arm when close (the swing is telegraphed)
        if (s.raise > 0) {
          s.raise += dt;
          if (s.raise >= S.ARM_RAISE) {
            Sfx.play('parkmanorArmour', 1);
            for (const h of heroes(st)) if (h.ok && hyp(h.b.x - s.x, h.b.z - s.z) < S.ARM_HIT) api.fright(h.k, s);
            s.raise = 0; s.state = 'back'; s.back = S.BACK * 0.6;
          }
          continue;
        }
        if (d < S.ARM_NEAR) { s.raise = 0.001; s.face = Math.atan2(dx, dz); continue; }
        if (s.step > 0) {
          s.step += dt;
          const u = Math.min(1, s.step / S.ARM_STEP_T);
          slide(st, s, (s.stepTo[0] - s.x) * u, (s.stepTo[1] - s.z) * u);
          if (u >= 1) { s.step = 0; s.waitT = 0; Sfx.play('parkmanorArmour', 0); }
          continue;
        }
        s.waitT += dt;
        if (s.waitT >= (s.wasLitOnce ? S.ARM_WAIT * 0.5 : S.ARM_WAIT)) {
          s.face = Math.atan2(dx, dz);
          s.stepTo = [s.x + dx / d * S.ARM_STEP, s.z + dz / d * S.ARM_STEP]; s.step = 0.001;
        }
      }
    }
    butler(st, dt, api);
    if (st.boss) boss(st, dt, api);
  };

  /* ---------- Bo's key on a spook ---------- */
  // the spook Bo's key would go to now (frozen or not), within reach, nearest first
  P.keyTarget = function (st, b) {
    let best = null, bd = S.REACH;
    for (const s of st.spooks) {
      if (s.state === 'done' || s.state === 'dormant' || s.state === 'rest') continue;
      const d = hyp(s.x - b.x, s.z - b.z);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  };

  /* ---------- the Butler ---------- */
  function butler(st, dt, api) {
    const B = st.butler;
    B.heard = Math.max(0, B.heard - dt);
    if (B.state === 'off') {
      for (let i = 0; i < H.butler.length; i++) {
        const v = H.butler[i];
        if (B.done[i] || !st.fired[v.trig]) continue;
        Object.assign(B, { visit: i, state: 'coming', t: 0, seg: 0, x: v.path[0][0], z: v.path[0][1], y: v.y || 0, target: -1, loseT: 0, pauseT: 0, what: '' });
        const p1 = v.path[1]; B.face = Math.atan2(p1[0] - B.x, p1[1] - B.z);
        Sfx.play('parkmanorButlerTick');
        break;
      }
      return;
    }
    const v = H.butler[B.visit];
    B.t += dt;
    // heard first: the tick and a floorboard for v.delay s before he moves
    if (B.state === 'coming') { B.heard = 1; if (B.t >= (v.delay || 3)) { B.state = 'walk'; Sfx.play('parkmanorButlerVoice', v.kind === 'walkaway' ? 2 : 0); } return; }
    B.lit = v.kind === 'hunt' && !!PML.inLantern(st, B.x, B.z);
    const slow = B.lit ? S.B_SLOW : 1;
    B.heard = 1;
    if (v.kind === 'hunt' && B.state !== 'chase') {
      // does he see anyone?
      for (const h of heroes(st)) {
        if (!h.ok) continue;
        const dx = h.b.x - B.x, dz = h.b.z - B.z, d = hyp(dx, dz);
        const far = PML.inLantern(st, h.b.x, h.b.z) ? S.B_SEE_LIT : S.B_SEE;
        let da = Math.atan2(dx, dz) - B.face; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (d < far && Math.abs(da) < S.B_FOV && PML.los(st, B.x, B.z, h.b.x, h.b.z)) { B.state = 'chase'; B.target = h.k; B.loseT = 0; B.resume = B.state; Sfx.play('parkmanorButlerVoice', 1); break; }
      }
    }
    if (B.state === 'chase') {
      const tb = G.players[B.target].b3, ok = st.stiff[B.target] <= 0 && !st.hidden && !st.caught;
      const dx = tb.x - B.x, dz = tb.z - B.z, d = hyp(dx, dz) || 1;
      const sees = ok && PML.los(st, B.x, B.z, tb.x, tb.z) && d < S.B_SEE_LIT + 2;
      B.loseT = sees ? 0 : B.loseT + dt;
      if (ok) { B.face = Math.atan2(dx, dz); const sp = S.B_CHASE * slow * dt; body.x = B.x + dx / d * sp; body.z = B.z + dz / d * sp; body.vx = body.vz = 0; MOVER3.push(st.w, body, 0.4, 0, 2); B.x = body.x; B.z = body.z; }
      if (ok && d < S.B_TOUCH) { api.caught(B.target); return; }
      // any other hero he bumps into on the way
      for (const h of heroes(st)) if (h.ok && hyp(h.b.x - B.x, h.b.z - B.z) < S.B_TOUCH) { api.caught(h.k); return; }
      if (B.loseT > S.B_LOSE || !ok) { B.state = 'walk'; B.target = -1; B.what = 'lost'; B.pauseT = 1.5; }
      return;
    }
    if (B.pauseT > 0) { B.pauseT -= dt; if (B.pauseT <= 0) B.what = ''; return; }
    // along the visit's path
    const P1 = v.path[B.seg + 1];
    if (!P1) { B.done[B.visit] = true; if (v.done) api.fire(v.done); B.state = 'off'; B.visit = -1; return; }
    const dx = P1[0] - B.x, dz = P1[1] - B.z, d = hyp(dx, dz), sp = v.speed * slow * dt;
    if (d > 0.01) B.face = Math.atan2(dx, dz);
    if (d <= sp) {
      B.x = P1[0]; B.z = P1[1]; B.seg++;
      if (v.pause && v.pause.at === B.seg) { B.pauseT = v.pause.secs; B.what = v.pause.what; Sfx.play('parkmanorButlerVoice', 3); }
    } else { B.x += dx / d * sp; B.z += dz / d * sp; }
    if (v.kind === 'hunt') for (const h of heroes(st)) if (h.ok && hyp(h.b.x - B.x, h.b.z - B.z) < S.B_TOUCH) { api.caught(h.k); return; }
  }
  /* ---------- Grimsby at the exit (the finish) ----------
     idle until a hero comes down the ballroom (H.boss.wakeZ); a speech; then he comes for the nearest hero, fast in the
     dark. Pip's light on him slows him almost to a stop (and the key in his back holds him still) and turns him toward the lantern; that shows his back, where
     the key is. Bo holds the key in his back for H.boss.hold s (from behind, in reach): one turn. He shrugs Bo off,
     swings round on Bo and comes for Bo until the light draws him again. Three turns: he winds down and bows. */
  function boss(st, dt, api) {
    const B = st.boss, hb = H.boss;
    B.t += dt; B.aggro = Math.max(0, B.aggro - dt);
    if (B.state === 'idle') {
      if (st.phase === 'play' && G.players.some(p => p.b3 && p.b3.z < hb.wakeZ && p.b3.x > -6 && p.b3.x < 30)) { B.state = 'talk'; B.t = 0; api.fire('bossTalk'); Sfx.play('parkmanorButlerVoice', 1); }
      return;
    }
    if (B.state === 'talk') { if (B.t > 2.6) { B.state = 'fight'; B.t = 0; Sfx.play('parkmanorButlerTick'); } return; }
    if (B.state === 'shrug') { if (B.t > S.BOSS_SHRUG) { B.state = 'fight'; B.t = 0; } return; }
    if (B.state === 'down') { if (B.t > 3.2) { B.state = 'done'; B.t = 0; Sfx.play('parkmanorBow'); api.fire('bossDone'); } return; }
    if (B.state !== 'fight') return;
    B.lit = !!PML.inLantern(st, B.x, B.z);
    const hs = heroes(st).filter(h => h.ok);
    if (!hs.length) return;
    let tgt = null;
    if (B.lit && hs.some(h => h.k === 0)) tgt = hs.find(h => h.k === 0);
    else if (B.aggro > 0 && hs.some(h => h.k === 1)) tgt = hs.find(h => h.k === 1);
    else { let bd = 1e9; for (const h of hs) { const d = hyp(h.b.x - B.x, h.b.z - B.z); if (d < bd) { bd = d; tgt = h; } } }
    B.target = tgt.k;
    // Bo's key in his back holds him where he stands
    if (st.keyWhat === 'boss') return;
    const dx = tgt.b.x - B.x, dz = tgt.b.z - B.z, d = hyp(dx, dz) || 1;
    let da = Math.atan2(dx, dz) - B.face; da = Math.atan2(Math.sin(da), Math.cos(da));
    const turn = (B.lit ? S.BOSS_TURN_LIT : S.BOSS_TURN) * dt;
    B.face += Math.max(-turn, Math.min(turn, da));
    // he walks the way he faces (he cannot sidestep), slowly while lit
    const sp = (B.lit ? S.BOSS_V_LIT : S.BOSS_V) * dt * Math.max(0, Math.cos(da));
    body.x = B.x + Math.sin(B.face) * sp; body.z = B.z + Math.cos(B.face) * sp; body.vx = body.vz = 0;
    MOVER3.push(st.w, body, 0.42, 0.05, 2); B.x = body.x; B.z = body.z;
    for (const h of hs) if (hyp(h.b.x - B.x, h.b.z - B.z) < S.BOSS_TOUCH && !(h.k === 1 && st.keyWhat === 'boss')) { api.caught(h.k); return; }
  }
  // where the key goes in (his back) and whether Bo stands behind him, in reach
  P.bossBack = function (st, b) {
    const B = st.boss;
    if (!B || B.state !== 'fight') return false;
    const kx = B.x - Math.sin(B.face) * 0.35, kz = B.z - Math.cos(B.face) * 0.35;
    if (hyp(b.x - kx, b.z - kz) > S.BOSS_REACH) return false;
    let da = Math.atan2(b.x - B.x, b.z - B.z) - B.face; da = Math.atan2(Math.sin(da), Math.cos(da));
    return Math.abs(da) > S.BOSS_BEHIND;
  };
  // a turn of his key is done: he shrugs Bo off and swings round on Bo
  P.bossTurned = function (st) {
    const B = st.boss, b = G.players[1].b3;
    B.turns++; B.holdT = 0; B.t = 0;
    if (B.turns >= H.boss.holds) { B.state = 'down'; Sfx.play('parkmanorUnwind'); Sfx.play('parkmanorButlerVoice', 4); return; }
    B.state = 'shrug'; B.aggro = S.BOSS_AGGRO; Sfx.play('parkmanorSag');
    const dx = b.x - B.x, dz = b.z - B.z, d = hyp(dx, dz) || 1;
    b.vx = dx / d * 6; b.vz = dz / d * 6;
    B.face = Math.atan2(dx, dz);
  };

  P.butlerNear = st => st.butler.state !== 'off' && st.butler.visit >= 0 && H.butler[st.butler.visit].kind === 'hunt';
  return P;
})();
