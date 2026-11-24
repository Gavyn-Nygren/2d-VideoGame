/* Pip & Bo - 43-4 Laser Tag Arena: the show (ARCADELASER_SHOW). Loaded on demand with the 3D kit. Display only: it reads
   the rules' state (G.mst) and never changes it.

   ARCADELASER_SHOW.build(K, st)      once per scene: the hall, the pieces, the effects, the two heroes
   ARCADELASER_SHOW.update(K, st, dt) every drawn frame
   ARCADELASER_SHOW.drawTop(st)       the held-pickup sign over a hero
   ARCADELASER_SHOW.camOverride = { eye, at, fov }   the look-shot tools hold the camera still with this

   THE CAMERA: one shared camera high behind the long near side, looking down at about 50 degrees, far enough back that
   the whole floor, both heroes and the scoreboard are always in the picture (it fits itself to the screen's shape). It
   leans a little toward the action and eases (never swings), pushes in on the round-winning tag for 0.6 s, and with
   reduced motion it holds still. Heroes hidden behind a piece show through it as a flat outline in their colour.

   THE HEROES: Pip and Bo in their tag vests, a toy blaster held in both hands, a ring on the floor in their colour.
   The vest lights are the brightest thing on them: they flash white when tagged, go dark (with a faint flicker) while
   the hero is safe, and come back on. The four lights along the blaster refill as it recharges and its emitter swells
   in the tell. A tagged hero does a comic spin. Cloaked: a faint shimmer. */
'use strict';

const ARCADELASER_SHOW = (function () {
  const T = K3D.T, AR = ARCADELASER_ARENA, CO = ARCADELASER, S = CO.S;
  const SH = { camOverride: null };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const RM = () => !!(typeof reduceMotion !== 'undefined' && reduceMotion) || !!K3D.reduce;
  const v3 = new T.Vector3();
  const NOSEE = new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, opacity: 0 });

  /* ---------- the heroes ---------- */
  function heroRig(K, id) {
    const h = K3D.hero(id);
    K3D.dress(h, 'arcadelaser');
    const bl = ARCADELASER_GEAR.blaster(id);
    // held in front at belly height (under the face, its emitter at the beam's height), pointing the way the hero faces
    const bp = h.userData.bodyPivot;
    bl.position.set(0.05 * (id ? -1 : 1), ARCADELASER_FX.BEAM_Y - K3D.HERO.h * 0.17 - 0.02, K3D.HERO.d / 2 + 0.1); bp.add(bl);
    const grips = [new T.Object3D(), new T.Object3D()]; grips[0].position.set(-0.08, -0.12, -0.06); grips[1].position.set(0.08, -0.02, 0.14); bl.add(grips[0], grips[1]);
    K3D.seeThrough(h, PCOL[id]);
    h.userData.live = true;
    K.add(h);
    const blob = K3D.blob(PCOL[id], 0.5); blob.userData.live = true; K.add(blob);
    // cloak: every mesh's own material, and the shimmer it swaps to
    const mats = [];
    h.traverse(o => { if (o.isMesh && !o.userData.ink && !o.userData.seeThrough) mats.push({ o, m: o.material }); });
    const shimmer = new T.ShaderMaterial({ uniforms: { uT: { value: 0 }, uC: { value: new T.Color(PCOL[id]) } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform float uT; uniform vec3 uC; varying vec3 vN; varying vec3 vV; varying vec3 vW; void main() { float f = pow(1.0 - abs(dot(vN, vV)), 3.0); float w = 0.5 + 0.5 * sin(vW.y * 30.0 + uT * 6.0); gl_FragColor = vec4(mix(vec3(0.8, 0.85, 1.0), uC, 0.4) * f * (0.25 + 0.2 * w), 1.0); }' });
    return { h, bl, grips, blob, mats, shimmer, cloaked: false, spin: 0, flash: 0, lastSafe: 0, landSeen: 0, tmp: [new T.Vector3(), new T.Vector3()] };
  }
  function setCloak(r, on, t) {
    if (on === r.cloaked) { if (on) r.shimmer.uniforms.uT.value = t; return; }
    r.cloaked = on;
    for (const e of r.mats) e.o.material = on ? r.shimmer : e.m;
    r.h.traverse(o => { if (o.userData.ink) o.visible = !on; if (o.userData.seeThrough) { if (!o.userData.seeM) o.userData.seeM = o.material; o.material = on ? NOSEE : o.userData.seeM; } });
    r.blob.material.opacity = on ? 0.15 : 1;
  }

  /* ---------- the camera: fit the floor, the heroes and the scoreboard ---------- */
  const fitCam = new T.PerspectiveCamera(38, 16 / 9, 0.2, 600);
  function inView(eye, at, fov, asp, pts, m) {
    fitCam.fov = fov; fitCam.aspect = asp; fitCam.updateProjectionMatrix();
    fitCam.position.copy(eye); fitCam.lookAt(at); fitCam.updateMatrixWorld(true);
    for (const p of pts) { v3.set(p[0], p[1], p[2]).project(fitCam); if (Math.abs(v3.x) > 1 - m[0] || v3.y < -1 + m[1] || v3.y > 1 - m[2]) return false; }
    return true;
  }
  // the resting shot for this screen shape: at 50 degrees down, the nearest that shows everything
  function restShot(asp, fov) {
    const pitch = 50 * Math.PI / 180, at = new T.Vector3(0, 0, 0.4);
    const pts = [[-AR.HX - 0.4, 0, AR.HZ + 0.5], [AR.HX + 0.4, 0, AR.HZ + 0.5], [-AR.HX - 0.4, 0, -AR.HZ - 0.4], [AR.HX + 0.4, 0, -AR.HZ - 0.4], [-AR.HX, 0.9, AR.HZ + 0.4], [AR.HX, 0.9, AR.HZ + 0.4],
      // the scoreboard, low in the gallery's front wall
      [-4.2, 1.45, ARCADELASER_HALL.GZ + 0.2], [4.2, 1.45, ARCADELASER_HALL.GZ + 0.2]];
    let lo = 12, hi = 80;
    for (let i = 0; i < 24; i++) {
      const d = (lo + hi) / 2, eye = new T.Vector3(0, Math.sin(pitch) * d, at.z + Math.cos(pitch) * d);
      if (inView(eye, at, fov, asp, pts, [0.03, 0.1, 0.04])) hi = d; else lo = d;
    }
    const d = hi;
    return { eye: [0, Math.sin(pitch) * d, at.z + Math.cos(pitch) * d], at: [at.x, at.y, at.z], fov, d };
  }

  /* ---------- build ---------- */
  SH.build = function (K, st) {
    ARCADE.seed(4343);
    ARCADE.dark(K, { fog: '#0c0812', fogD: 0.0095, amb: '#4a3a5a', ambK: 0.5, key: '#ffd9b0', keyK: 0.35, fill: '#6a5aff', under: '#ff5ad6', hemiK: 0.3, bloom: 1.05 });
    K.focusRange = 60; K.maxBlur = 1.2;
    const sc = { K, t: 0 };
    sc.hall = ARCADELASER_HALL.build(K, st);
    sc.pc = ARCADELASER_PIECES.build(K, sc.hall);
    sc.fx = ARCADELASER_FX.build(K);
    sc.heroes = [heroRig(K, 0), heroRig(K, 1)];
    // Blackout: the hall's own lights come down to almost nothing (these are their full levels), and each hero carries a
    // soft glow of their own colour from the vest so they stay readable (always present, off in hall light)
    sc.base = { amb: K.amb.intensity, sun: K.sun.intensity, hemi: K.hemi.intensity, bloom: K.bloom.strength, fogD: K.scene.fog.density };
    sc.vestGlow = [0, 1].map(id => { const l = new T.PointLight(PCOL[id], 0, 3.2, 1.6); l.userData.live = true; K.add(l); return l; });
    sc.motes = ARCADE.motes(K, { n: 1600, box: 40, pixels: 0.12, k: 0.8 });
    ARCADELASER_SCENES.build(K, sc);
    ARCADELASER_EYES.build(K, sc);
    sc.cam = K3D.cams.ride({ fov: 38, k: 3, kUp: 3 });
    sc.cam.snap();
    sc.asp = 0;
    K.al = sc;
    return sc;
  };

  /* ---------- every frame ---------- */
  SH.update = function (K, st, dt) {
    const sc = K.al; if (!sc || !st.heroes) return;
    const t = (sc.t += dt);
    const dark = st.round === 4 && st.phase !== 'between' ? 1 : st.round === 4 ? clamp(st.rebuild * 2 - 0.6, 0, 1) : 0;
    sc.dark = (sc.dark == null ? dark : sc.dark + (dark - sc.dark) * Math.min(1, dt * 1.5));
    const dk = sc.dark;
    K.amb.intensity = sc.base.amb * (1 - dk * 0.88); K.sun.intensity = sc.base.sun * (1 - dk * 0.95); K.hemi.intensity = sc.base.hemi * (1 - dk * 0.85);
    K.bloom.strength = sc.base.bloom + dk * 0.3; K.scene.fog.density = sc.base.fogD * (1 + dk * 0.35);
    const gold = st.phase === 'gold' ? 1 : 0;
    // the action (for the crowd's eyes and the lean)
    const hs = st.heroes, ax = (hs[0].x + hs[1].x) / 2, az = (hs[0].z + hs[1].z) / 2;
    const lt = st.lastTag;
    const mood = { dark: sc.dark, gold, cheer: lt ? st.t - lt.t : 99, round: st.round, hero: [ax, 0.5, az], lastTagger: lt ? lt.by : -1, clock: st.t,
      say: null, nearMop: false,
      // between rounds the crowd does a wave along the rows (left to right); in the world's ending every creature waves
      wave: st.phase === 'between' ? -19 + 38 * clamp((st.phaseT - 0.4) / 3.0, 0, 1) : null, allWave: !!(st.ending && st.ending.t < 7.5) };
    const recent = st.says.length ? st.says[st.says.length - 1] : null;
    if (recent && recent !== sc.lastSay) { sc.lastSay = recent; mood.say = recent.text; }
    // the mopper gets caught in the crossfire when a beam ends near the near-left corner
    for (const b of st.beams) if (st.t - b.t < 0.05) for (const p of b.paths) for (const g of p.segs) if (g.x1 < -AR.HX + 0.3 && g.z1 > -3.2 && g.z1 < 1.2) mood.nearMop = true;
    sc.hall.update(K, st, dt, mood);
    sc.pc.update(K, st, dt, { mirrorFlash: st.beams.some(b => st.t - b.t < 0.15 && b.paths.some(p => p.bounces > 0)) ? 1 : 0 });
    sc.fx.update(K, st, dt, { dark: sc.dark });
    // the world's ending runs on its own clock (the level's outro is waiting on it)
    if (st.ending && ARCADELASER_SCENES.endStep(st, dt)) CO.endingDone(st);
    // a scene (the opening, the final, the world's ending) may have the heroes for a while
    const ov = ARCADELASER_SCENES.heroes(sc, st, t);
    // the heroes
    for (const h of hs) {
      const r = sc.heroes[h.id];
      if (ov) { sceneHero(sc, r, h, ov[h.id], t, dt); continue; }
      r.h.scale.setScalar(1); r.bl.visible = true; r.blob.visible = true;
      let land = false;
      for (const e of st.fx) if (e.n > r.landSeen && e.k === 'land' && e.who === h.id) land = true;
      r.landSeen = st.fxN;
      const sp = Math.hypot(h.vx, h.vz) / S.RUN;
      // the comic spin when tagged
      const spin = h.spinT > 0 ? (1 - h.spinT / 0.9) * Math.PI * 2 * (RM() ? 0 : 1) : 0;
      // hands on the blaster
      r.h.updateMatrixWorld(true);
      const hands = [r.grips[0].getWorldPosition(r.tmp[0]), r.grips[1].getWorldPosition(r.tmp[1])];
      const vy = h.air >= 0 ? (1 - 2 * h.air / S.AIR) * 4 : 0;
      K3D.heroPose(r.h, { x: h.x, y: h.y, z: h.z, heading: h.face + spin, speed: Math.min(1.2, sp), vy, land, hands, stun: h.safe > S.SAFE - 0.5 }, dt);
      // the blaster tips up while aiming (a steadier hold), shakes a little in the tell
      const aimHold = h.fire && (h.fire.st === 'aim' || h.fire.st === 'tell') ? 1 : 0;
      r.bl.rotation.x = -0.05 * aimHold + (h.fire && (h.fire.st === 'tell' || h.fire.st === 'tellTap') ? Math.sin(t * 70) * 0.03 : 0);
      if (h.fire && h.fire.a != null && aimHold) r.bl.rotation.y = clamp(Math.atan2(Math.sin(h.fire.a - h.face), Math.cos(h.fire.a - h.face)), -0.3, 0.3); else r.bl.rotation.y *= 0.8;
      // vest lights
      const v = r.h.userData.vest;
      if (h.safe > 0 && r.lastSafe <= 0) r.flash = 0.18;
      r.lastSafe = h.safe; r.flash = Math.max(0, r.flash - dt);
      if (v) for (const m of v.lights) {
        const k = m.userData.k || 1;
        if (r.flash > 0) m.color.setRGB(3, 3, 3);
        else if (h.safe > 0) { const fl = Math.sin(t * 23 + k * 5) > 0.93 ? 0.5 : 0.06; const back = h.safe < 0.5 ? (Math.floor(t * 10) % 2 ? 0.9 : 0.15) : fl; m.color.copy(v.base).multiplyScalar(k * back / 2.6 * 1.0); }
        else m.color.copy(v.base).multiplyScalar(k * (1 + (h.fire ? 0.15 : 0) + 0.08 * Math.sin(t * 4 + h.id)));
      }
      // the blaster: charge lights refill, the emitter swells in the tell
      const ud = r.bl.userData, ch = h.noFire > 0 ? 0 : 1 - h.rech / S.RECHARGE;
      ud.charge.forEach((m, i) => m.color.set((i + 1) / 4 <= ch + 1e-6 ? '#fff4d0' : '#3a3036').multiplyScalar((i + 1) / 4 <= ch + 1e-6 ? 1.8 : 1));
      const tell = h.fire && (h.fire.st === 'tell' || h.fire.st === 'tellTap') ? Math.min(1, h.fire.t / S.TELL) : 0;
      ud.emitM.color.set(PCOL[h.id]).multiplyScalar(h.noFire > 0 ? 0.4 : 1.6 + tell * 3);
      // cloak
      setCloak(r, h.cloakT > 0, t);
      // the floor ring
      K3D.placeBlob(r.blob, h.x, 0, h.z, h.y);
      const vg = sc.vestGlow[h.id]; vg.position.set(h.x, h.y + 0.75, h.z + 0.2); vg.intensity = dk * (h.cloakT > 0 ? 0 : h.safe > 0 ? 0.7 : 2.6);
    }
    ARCADELASER_SCENES.update(sc, st, dt);
    // see-through outlines follow the option and the cloak
    // the camera
    const asp = K.camera.aspect || 16 / 9;
    if (asp !== sc.asp) { sc.asp = asp; sc.rest = restShot(asp, 38); }
    let sh;
    if (SH.camOverride) sh = Object.assign({ up: [0, 1, 0] }, SH.camOverride);
    else {
      const rs = sc.rest, rm = RM();
      const lean = rm ? [0, 0] : [clamp(ax * 0.06, -0.7, 0.7), clamp(az * 0.05, -0.35, 0.35)];
      let eye = [rs.eye[0] + lean[0], rs.eye[1], rs.eye[2] + lean[1]], at = [rs.at[0] + lean[0], rs.at[1], rs.at[2] + lean[1]], fov = rs.fov;
      // the winner's push-in on the round-winning tag
      if (st.phase === 'won' && st.roundWinner >= 0 && !rm) {
        const w = hs[st.roundWinner], k = clamp(st.phaseT / 0.6, 0, 1) * (st.phaseT < S.WON_T - 0.4 ? 1 : clamp((S.WON_T - st.phaseT) / 0.4, 0, 1)), e = k * k * (3 - 2 * k);
        at = [at[0] + (w.x - at[0]) * e * 0.7, at[1] + 0.5 * e, at[2] + (w.z - at[2]) * e * 0.7];
        eye = [eye[0] + (w.x - eye[0]) * e * 0.45, eye[1] - (eye[1] - 6) * e * 0.4, eye[2] + (w.z + 8 - eye[2]) * e * 0.3];
        fov = rs.fov - 6 * e;
      }
      if (st.phase === 'final' && !rm) {
        // in on the winner (and the loser clapping, when near enough to share the picture)
        const w = hs[Math.max(0, st.winner)], l = hs[1 - Math.max(0, st.winner)], e0 = clamp(st.phaseT / 1.4, 0, 1), e = e0 * e0 * (3 - 2 * e0);
        const sep = Math.hypot(w.x - l.x, w.z - l.z), both = sep < 7 ? 0.35 : 0;
        const fx = w.x + (l.x - w.x) * both, fz = w.z + (l.z - w.z) * both, d = 4.6 + (both ? sep * 0.55 : 0);
        at = [at[0] + (fx - at[0]) * e, at[1] + (0.7 - at[1]) * e, at[2] + (fz - at[2]) * e];
        eye = [eye[0] + (fx + 0.4 - eye[0]) * e, eye[1] + (d * 0.72 + 0.6 - eye[1]) * e, eye[2] + (fz + d * 0.8 - eye[2]) * e];
        fov = rs.fov + (42 - rs.fov) * e;
      }
      sh = { eye, at, up: [0, 1, 0], fov };
      // a scene's camera is followed exactly (its keys are already smooth)
      const scam = ARCADELASER_SCENES.camera(sc, st, rs);
      if (scam) { sh = { eye: scam.eye, at: scam.at, up: [0, 1, 0], fov: scam.fov }; sc.cam.snap(); sc.cam._snapF = true; }
    }
    if (sc.snapNext) { sc.cam.snap(); sc.snapNext = false; }
    sc.cam.update(K, dt, null, sh);
    sc.cam._snapF = false;
    // name tags and bubbles follow the heroes on screen
    for (const p of G.players) { const h = ov ? ov[p.id] : hs[p.id]; if (!h) continue; const q = K3D.toScreen(h.x, (h.y || 0) + 1.2, h.z); if (q.z < 1) { p.x = q.x; p.y = q.y; } }
    // first person: each player's own eyes (split screen) while a round is on
    ARCADELASER_EYES.update(K, sc, st, dt);
  };

  // a hero placed by a scene: where it says, the blaster in hand or not, the vest lights on or not, a size (the ending)
  function sceneHero(sc, r, h, p, t, dt) {
    r.h.updateMatrixWorld(true);
    const grip = [r.grips[0].getWorldPosition(r.tmp[0]), r.grips[1].getWorldPosition(r.tmp[1])];
    const hands = p.hands ? [p.hands[0] || (p.blaster ? grip[0] : null), p.hands[1] || (p.blaster ? grip[1] : null)] : p.blaster ? grip : null;
    K3D.heroPose(r.h, { x: p.x, y: p.y || 0, z: p.z, heading: p.face, speed: p.speed || 0, vy: p.vy || 0, hands }, dt);
    r.h.scale.setScalar(p.scale != null ? p.scale : 1);
    r.bl.visible = p.blaster > 0;
    const v = r.h.userData.vest;
    if (v) for (const m of v.lights) { const k = m.userData.k || 1; m.color.copy(v.base).multiplyScalar(k * (0.08 + 0.92 * (p.vest != null ? p.vest : 1)) * (1 + 0.06 * Math.sin(t * 4 + h.id))); }
    const ud = r.bl.userData; ud.charge.forEach(m => m.color.set('#fff4d0').multiplyScalar(1.8)); ud.emitM.color.set(PCOL[h.id]).multiplyScalar(1.6);
    setCloak(r, false, t);
    K3D.placeBlob(r.blob, p.x, 0, p.z, p.y || 0);
    r.blob.visible = (p.scale == null || p.scale > 0.5) && (p.y || 0) < 3;
    sc.vestGlow[h.id].intensity = 0;
  }

  /* ---------- over the picture: what each hero holds ---------- */
  SH.drawTop = function (st) {
    if (!st.heroes || !K3D.K) return;
    if (ARCADELASER_EYES.on()) { ARCADELASER_EYES.top(st); return; }
    for (const h of st.heroes) {
      const hn = h.heldNow; if (!hn || h.cloakT > 0) continue;
      const q = K3D.toScreen(h.x, h.y + 1.35, h.z); if (q.z > 1) continue;
      const col = ARCADELASER_HUD.pickCol[hn];
      ctx.save(); ctx.globalAlpha = 0.92;
      ctx.fillStyle = 'rgba(23,25,29,0.8)'; circle(q.x, q.y, 13); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; circle(q.x, q.y, 13); ctx.stroke();
      ARCADELASER_HUD.icon(hn, q.x, q.y, 0.75, col);
      ctx.restore();
    }
  };
  SH.snap = () => { const sc = K3D.K && K3D.K.al; if (sc) sc.snapNext = true; };
  return SH;
})();
