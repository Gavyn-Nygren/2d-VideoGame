/* Pip & Bo - 43-4 Laser Tag Arena: each player's own eyes (ARCADELASER_EYES). Loaded on demand with the 3D kit.
   Display only: it reads the rules' state (G.mst) and never changes it.

   FIRST PERSON, SPLIT SCREEN (Gavyn's ask, 2026-11-24). While a round is on (the count, play, NEXT TAG WINS) the
   picture is two views, Pip's eyes on the top half and Bo's below, each drawn with its own camera (the 3D kit's
   K.views). Against the computer there is one view, the person's own, full screen. The opening, the round-winning tag,
   the rebuild between rounds, the final and the world's ending stay on the shared camera (full screen), so those
   moments are watched together; a quick fade covers each change.

   THE EYES: a camera at eye height (just over the face, a little above the waist-high walls, so you see over them but
   your beam, at waist height, does not go over), turned with the hero. A small bob when walking (none with reduced
   motion), a dip on landing, a wobble when tagged (the body's comic spin would turn the whole view, so the view only
   wobbles), a little lean when stepping aside, a wider view with Speed and a slightly closer one while aiming.

   WHO SEES WHAT (three.js layers): the hall and everything else is layer 0; Pip's body is layer 1, Bo's body layer 2.
   The shared camera sees 0-2; Pip's eyes 0 and 2; Bo's eyes 0 and 1. So nobody sees the inside of their own head, and
   both bodies still cast shadows (the sun's shadow camera sees 0-2): you see your own shadow run along the floor. The
   see-through outlines are off in first person. What you hold is its own little scene drawn over your view.

   IN HAND: the hero's own blaster, both little arms holding it (Pip's yellow wristband, Bo's purple elbow pads), low
   and a little right of centre with the emitter toward the crosshair. It recharges its four lights, swells in the
   tell, kicks back on each shot, sways a little on turns, rises and steadies while aiming and drops while tagged.
   It is drawn over the view with its own depth (lit like the hall round you), so it never pokes into a wall.

   E.build(K, sc) once; E.update(K, sc, st, dt) every drawn frame (after the heroes are posed);
   E.views -> [{ id, x, y, w, h }] in the 2D canvas's 960 x 540 (or [] when the shared camera is up);
   E.spot(id, x, y, z) -> { x, y, z } a world point on view id's part of the screen (z > 1 behind), or null;
   E.hud(st) the flat HUD over each view (see ARCADELASER_HUD). */
'use strict';

const ARCADELASER_EYES = (function () {
  const T = K3D.T, AR = ARCADELASER_ARENA, CO = ARCADELASER, S = CO.S;
  const E = { views: [], force: null };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const RM = () => !!(typeof reduceMotion !== 'undefined' && reduceMotion) || !!K3D.reduce;
  const EYE = 0.6, HFOV = 92, D = 0.6, BS = 2.2;
  E.EYE = EYE;
  // where the blaster sits in the view (x in parts of half the view's width, y of half its height, turns in radians, size)
  E.HAND = { x: 0.18, y: -0.56, yaw: 0.5, pitch: 0.12, k: 1 };
  const v3 = new T.Vector3();

  /* ---------- the blaster in hand ---------- */
  function inHand(id) {
    const root = new T.Group();            // in the camera: units of half the view's height, at depth D
    const kick = new T.Group(); root.add(kick);
    const bl = ARCADELASER_GEAR.blaster(id);
    bl.rotation.y = Math.PI; bl.scale.setScalar(BS); kick.add(bl);
    // (seen from behind, the emitter's lens faces away: a glowing ring round the flare shows its charge from here)
    const ring = new T.Mesh(new T.TorusGeometry(0.062, 0.011, 8, 24), bl.userData.emitM); ring.position.set(0, -0.005, 0.262); bl.add(ring);
    // where the hands go (in kick space; bl is turned half a turn, so x and z flip): the right hand on the pistol
    // grip, the left under the front of the shell (clear of the barrel, so the barrel and its ring show)
    const gp = [new T.Vector3(0.08, -0.12, 0.06).multiplyScalar(BS), new T.Vector3(0.0, -0.1, -0.06).multiplyScalar(BS)];
    // the shoulders, below the picture and nearer
    const sh = [new T.Vector3(0.75, -1.5, 0.9), new T.Vector3(-0.55, -1.6, 0.4)];
    const col = PCOL[id], dark = PDARK[id], armR = 0.065 * BS;
    const armM = K3D.toon(col);
    const up = new T.Vector3(0, 1, 0);
    for (let k = 0; k < 2; k++) {
      const a = sh[k], b = gp[k], dir = b.clone().sub(a), len = dir.length();
      const arm = K3D.mesh(new T.CapsuleGeometry(armR, len, 6, 14), armM, { ink: dark, inkW: 1 });
      arm.position.copy(a).add(b).multiplyScalar(0.5); arm.quaternion.setFromUnitVectors(up, dir.normalize()); kick.add(arm);
      // Pip: a yellow wristband by the hand; Bo: a purple elbow pad further back
      const band = id === 0
        ? K3D.mesh(new T.CylinderGeometry(armR * 1.12, armR * 1.12, 0.14, 18), K3D.toon('#f2c83a'), { ink: '#8a6a14', inkW: 0.8 })
        : K3D.mesh(K3D.roundBox(armR * 2.5, 0.3, armR * 2.5, 0.6, 12).translate(0, -0.15, 0), K3D.toon('#8a5ad8'), { ink: '#4a2a7a', inkW: 0.8 });
      band.position.copy(b).addScaledVector(dir, id === 0 ? -0.22 : -0.7); band.quaternion.copy(arm.quaternion); kick.add(band);
      if (id === 0) { const sw = K3D.mesh(new T.TorusGeometry(armR * 1.12, 0.012, 6, 18).rotateX(Math.PI / 2), K3D.toon('#ff9a3a'), { ink: false }); sw.position.copy(band.position); sw.quaternion.copy(arm.quaternion); kick.add(sw); }
    }
    root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
    // its own little scene, drawn over the view with the depth cleared (so it never pokes into a wall): a rig that
    // follows the eyes, and lights that copy the hall's (and the vest's glow in Blackout)
    const over = new T.Scene(), rig = new T.Object3D(); over.add(rig); rig.add(root);
    const amb = new T.AmbientLight(0xffffff, 0), hemi = new T.HemisphereLight(0xffffff, 0x000000, 0), key = new T.DirectionalLight(0xffffff, 0);
    const glow = new T.PointLight(PCOL[id], 0, 2.5, 1.5); glow.position.set(0, -0.35, -0.25); rig.add(glow);
    over.add(amb, hemi, key, key.target);
    return { root, kick, bl, ud: bl.userData, over, rig, amb, hemi, key, glow, recoil: 0, sway: 0, lastFace: null, lower: 0, aim: 0, shotSeen: 0 };
  }

  /* ---------- build ---------- */
  E.build = function (K, sc) {
    // the shared camera and the sun's shadows see both bodies; the mirrors' cube camera too
    for (const c of [K.camera, K.sun.shadow.camera]) { c.layers.enable(1); c.layers.enable(2); }
    if (sc.pc && sc.pc.env) for (const c of sc.pc.env.cam.children) { c.layers.enable(1); c.layers.enable(2); }
    sc.heroes.forEach((r, id) => r.h.traverse(o => o.layers.set(1 + id)));
    const ey = { cams: [], hand: [], ph: [0, 0], dip: [0, 0], landSeen: [0, 0], fov: [60, 60], lean: [0, 0], mode: '', cutT: 9, maxBlur: K.maxBlur };
    for (const id of [0, 1]) {
      const cam = new T.PerspectiveCamera(60, 32 / 9, 0.04, 300);
      cam.rotation.order = 'YXZ';
      cam.layers.set(0); cam.layers.enable(2 - id);
      K.scene.add(cam);
      const hd = inHand(id);
      ey.cams.push(cam); ey.hand.push(hd);
    }
    sc.eyes = ey;
    return ey;
  };

  /* ---------- which views ---------- */
  function wantViews(st) {
    if (ARCADELASER_SHOW.camOverride && !E.force) return [];
    const ph = st.phase;
    if (st.ending || !(ph === 'count' || ph === 'live' || ph === 'gold')) return E.force || [];
    const humans = [0, 1].filter(id => !(typeof cpuOn === 'function' && cpuOn(id)));
    const ids = E.force || (humans.length === 1 ? humans : [0, 1]);
    if (ids.length === 1) return [{ id: ids[0], x: 0, y: 0, w: W, h: H }];
    return [{ id: 0, x: 0, y: 0, w: W, h: H / 2 }, { id: 1, x: 0, y: H / 2, w: W, h: H / 2 }];
  }

  /* ---------- every drawn frame ---------- */
  E.update = function (K, sc, st, dt) {
    const ey = sc.eyes; if (!ey || !st.heroes) return;
    const vs = wantViews(st), mode = vs.map(v => v.id).join(',');
    if (mode !== ey.mode) { ey.mode = mode; ey.cutT = 0; for (const hd of ey.hand) hd.lastFace = null; }
    ey.cutT += dt;
    E.views = vs;
    const rm = RM(), canvasAsp = K.camera.aspect || W / H;
    for (const v of vs) {
      const id = v.id, h = st.heroes[id], cam = ey.cams[id], hd = ey.hand[id];
      const asp = canvasAsp * (v.w / W) / (v.h / H);
      // the eyes: where, which way, a bob, a landing dip, a lean when stepping aside, a wobble when tagged
      const [fx, fz] = CO.dirOf(h.face), rx = -fz, rz = fx;
      const sp = Math.hypot(h.vx, h.vz) / S.RUN, side = (h.vx * rx + h.vz * rz) / S.RUN;
      if (h.air < 0) ey.ph[id] += dt * (7 + 5 * sp) * Math.min(1, sp * 1.6);
      for (const e of st.fx) if (e.n > ey.landSeen[id] && e.k === 'land' && e.who === id) ey.dip[id] = 1;
      ey.landSeen[id] = st.fxN;
      ey.dip[id] = Math.max(0, ey.dip[id] - dt / 0.28);
      const dip = Math.sin(ey.dip[id] * Math.PI) * 0.045;
      const bob = rm ? 0 : Math.sin(ey.ph[id] * 2) * 0.014 * Math.min(1, sp);
      ey.lean[id] += ((rm ? 0 : -side * 0.035) - ey.lean[id]) * Math.min(1, dt * 8);
      const tg = h.spinT > 0 ? h.spinT / 0.9 : 0;
      const wob = rm ? 0 : tg * tg;
      cam.position.set(h.x, h.y + EYE + bob - dip, h.z);
      cam.rotation.set(-0.055 - dip * 0.6 + wob * Math.sin(st.t * 13) * 0.05, h.face + Math.PI + wob * Math.sin(st.t * 17) * 0.22, ey.lean[id] + wob * Math.sin(st.t * 21) * 0.12);
      // the view's width: wider with Speed, a little closer while aiming
      const aiming = h.fire && (h.fire.st === 'aim' || h.fire.st === 'tell') ? 1 : 0;
      const hf = HFOV + (h.speedT > 0 ? 8 : 0) - aiming * 10;
      const vf = clamp(2 * Math.atan(Math.tan(hf * Math.PI / 360) / asp) * 180 / Math.PI, 26, 64);
      ey.fov[id] += (vf - ey.fov[id]) * Math.min(1, dt * 6);
      if (ey.cutT < dt * 1.5) ey.fov[id] = vf;
      cam.fov = ey.fov[id]; cam.aspect = asp; cam.updateProjectionMatrix();
      cam.updateMatrixWorld(true);
      handStep(hd, h, st, dt, cam, asp, sp, rm);
      // the in-hand scene follows the eyes and copies the hall's light (the vest glows on the hands in Blackout)
      hd.rig.position.copy(cam.position); hd.rig.quaternion.copy(cam.quaternion);
      hd.amb.color.copy(K.amb.color); hd.amb.intensity = K.amb.intensity;
      hd.hemi.color.copy(K.hemi.color); hd.hemi.groundColor.copy(K.hemi.groundColor); hd.hemi.intensity = K.hemi.intensity;
      hd.key.color.copy(K.sun.color); hd.key.intensity = K.sun.intensity;
      hd.key.position.copy(cam.position).addScaledVector(K.sunDir, 10); hd.key.target.position.copy(cam.position);
      hd.glow.intensity = (sc.dark || 0) * (h.cloakT > 0 ? 0 : h.safe > 0 ? 0.5 : 1.6);
    }
    // the kit draws these (or the shared camera when there are none)
    K.views = vs.length ? vs.map(v => ({ camera: ey.cams[v.id], over: ey.hand[v.id].over, x: v.x / W, y: v.y / H, w: v.w / W, h: v.h / H })) : null;
    K.noSee = vs.length > 0;
    K.maxBlur = vs.length ? 0.0001 : ey.maxBlur;
  };

  // the blaster in hand: where it sits for this view's shape, recoil, sway, bob, aim, lowered while tagged, its lights
  function handStep(hd, h, st, dt, cam, asp, sp, rm) {
    const ty = Math.tan(cam.fov * Math.PI / 360);
    hd.root.position.set(0, 0, -D); hd.root.scale.setScalar(D * ty);
    for (const e of st.fx) if (e.n > hd.shotSeen && e.k === 'fire' && e.who === h.id) hd.recoil = 1;
    hd.shotSeen = st.fxN;
    hd.recoil = Math.max(0, hd.recoil - dt * 4.5);
    const turn = hd.lastFace == null ? 0 : angDiff(h.face, hd.lastFace) / Math.max(dt, 1e-3);
    hd.lastFace = h.face;
    hd.sway += ((rm ? 0 : clamp(turn * 0.05, -0.25, 0.25)) - hd.sway) * Math.min(1, dt * 10);
    const aiming = h.fire && (h.fire.st === 'aim' || h.fire.st === 'tell') ? 1 : 0;
    hd.aim += (aiming - hd.aim) * Math.min(1, dt * 10);
    hd.lower += ((h.noFire > 0 ? 1 : 0) - hd.lower) * Math.min(1, dt * 8);
    const ph = rm ? 0 : h.air < 0 ? (st.t * (7 + 5 * sp)) : 0, bobK = rm ? 0 : Math.min(1, sp);
    const rk = hd.recoil * hd.recoil;
    const HA = E.HAND, tellShake = h.fire && (h.fire.st === 'tell' || h.fire.st === 'tellTap') ? Math.sin(st.t * 70) * 0.02 : 0;
    hd.kick.scale.setScalar(HA.k);
    hd.kick.position.set(HA.x * asp * (1 - hd.aim * 0.5) + hd.sway * 0.6 + Math.sin(ph) * 0.03 * bobK,
      HA.y + hd.aim * 0.1 - hd.lower * 0.55 + Math.abs(Math.cos(ph)) * 0.04 * bobK + (h.air >= 0 ? -0.06 : 0),
      rk * 0.35);
    // (the emitter toward the crosshair; it kicks up on a shot, droops while tagged)
    hd.kick.rotation.set(HA.pitch + rk * 0.35 - hd.lower * 0.5 + tellShake, HA.yaw * (1 - hd.aim * 0.5) - hd.sway * 0.5, hd.sway * 0.4 - hd.lower * 0.25);
    // the lights (as on the body's blaster)
    const ud = hd.ud, ch = h.noFire > 0 ? 0 : 1 - h.rech / S.RECHARGE;
    ud.charge.forEach((m, i) => m.color.set((i + 1) / 4 <= ch + 1e-6 ? '#fff4d0' : '#3a3036').multiplyScalar((i + 1) / 4 <= ch + 1e-6 ? 1.8 : 1));
    const tell = h.fire && (h.fire.st === 'tell' || h.fire.st === 'tellTap') ? Math.min(1, h.fire.t / S.TELL) : 0;
    ud.emitM.color.set(PCOL[h.id]).multiplyScalar(h.noFire > 0 ? 0.4 : 1.6 + tell * 3 + hd.recoil * 4);
  }

  /* ---------- screen spots in a view ---------- */
  E.spot = function (id, x, y, z) {
    const sc = K3D.K && K3D.K.al, v = E.views.find(q => q.id === id);
    if (!sc || !sc.eyes || !v) return null;
    v3.set(x, y, z).project(sc.eyes.cams[id]);
    return { x: v.x + (v3.x + 1) / 2 * v.w, y: v.y + (1 - v3.y) / 2 * v.h, z: v3.z, nx: v3.x, ny: v3.y };
  };
  E.viewOf = id => E.views.find(q => q.id === id) || null;
  E.on = () => E.views.length > 0;
  E.cut = () => { const sc = K3D.K && K3D.K.al; return sc && sc.eyes ? sc.eyes.cutT : 9; };

  /* ---------- the flat HUD over each view ----------
     In each view: the crosshair (closes and takes your colour when a tap would tag; a ring round it refills with the
     blaster), the dot where your beam would first land, a warning arc round the crosshair pointing at a beam that is
     about to reach you (JUMP! in its last quarter second), a hit mark when you tag, the radar (bottom right: the
     pieces, the pickups, recent beams, and the other player when you can see them or just after they fire; never
     when cloaked), and your panel (top left: name, round stars, five tag lamps, the held pickup). A white flash and dim
     edges while you are safe after a tag; a pale shimmer at the edges while cloaked; a cyan rim with a shield.
     Between two views a bar with the round and the clock; with one view the clock sits top centre and the computer's
     panel top right (under the Menu button). The name over the other player (drawTop) shows only when you can see
     them. */
  const BEAM_Y = ARCADELASER_FX.BEAM_Y;
  function words(s, x, y, size, col, al = 'center', lw = 5) {
    ctx.font = `900 ${size}px "Atkinson Hyperlegible", system-ui, sans-serif`; ctx.textAlign = al; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(10,8,14,0.85)'; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  // can a look from a to b get past the tall pieces (waist-high walls do not hide anyone; the crystal prisms are clear)
  function sees(st, a, b) {
    if (!st.sol) return true;
    const tall = st.sol.filter(q => q.move !== 'low' && q.beam !== 'prism');
    return AR.clear(tall, a.x, a.z, b.x, b.z);
  }
  E.sees = sees;
  function lastShot(st, id) { for (let i = st.beams.length - 1; i >= 0; i--) if (st.beams[i].who === id) return st.beams[i].t; return -99; }
  function edgeGlow(v, rgb, a, wpx) {
    const g = ctx.createRadialGradient(v.x + v.w / 2, v.y + v.h / 2, Math.min(v.w, v.h) * 0.25, v.x + v.w / 2, v.y + v.h / 2, Math.hypot(v.w, v.h) * 0.55);
    g.addColorStop(0, rgb + '0)'); g.addColorStop(1, rgb + a + ')');
    ctx.fillStyle = g; ctx.fillRect(v.x, v.y, v.w, v.h);
    if (wpx) { ctx.strokeStyle = rgb + Math.min(1, a * 1.6) + ')'; ctx.lineWidth = wpx; ctx.strokeRect(v.x + wpx / 2, v.y + wpx / 2, v.w - wpx, v.h - wpx); }
  }
  // where the crosshair sits: a point well along the beam's straight line, at the beam's height
  function aimSpot(st, h, a) {
    const [mx, mz] = CO.muzzle(h, a), [dx, dz] = CO.dirOf(a);
    return E.spot(h.id, mx + dx * 10, BEAM_Y, mz + dz * 10);
  }

  E.hud = function (st) {
    if (!E.on() || !st.heroes) return;
    const split = E.views.length > 1;
    for (const v of E.views) { ctx.save(); ctx.beginPath(); ctx.rect(v.x, v.y, v.w, v.h); ctx.clip(); viewHud(st, v, split); ctx.restore(); }
    if (split) divider(st);
    else { clockPill(st, W / 2, 24, 1); panel(st, 1 - E.views[0].id, W - 14 - 210, 58, 1, true); }
  };
  // a quick fade over each change between the shared camera and the eyes (drawn every frame by the HUD)
  E.fade = function () { const c = E.cut(); if (c < 0.32) { ctx.fillStyle = `rgba(6,5,10,${(1 - c / 0.32).toFixed(3)})`; ctx.fillRect(0, 0, W, H); } };

  function viewHud(st, v, split) {
    const id = v.id, h = st.heroes[id], o = st.heroes[1 - id], k = split ? 0.82 : 1, t = st.t;
    // the edges: safe after a tag, cloaked, a shield, NEXT TAG WINS
    if (h.safe > 0) {
      const a = S.SAFE - h.safe;
      if (a < 0.22) { ctx.fillStyle = `rgba(255,255,255,${(0.5 * (1 - a / 0.22)).toFixed(3)})`; ctx.fillRect(v.x, v.y, v.w, v.h); }
      edgeGlow(v, 'rgba(12,8,22,', (0.62 * Math.min(1, h.safe / 0.5)).toFixed(3));
    }
    if (h.cloakT > 0) edgeGlow(v, 'rgba(200,208,255,', (0.22 + 0.06 * Math.sin(t * 7)).toFixed(3), 2);
    if (h.shield > 0) edgeGlow(v, h.gold ? 'rgba(255,214,90,' : 'rgba(74,232,255,', '0.18', 3);
    if (h.speedT > 0 && Math.hypot(h.vx, h.vz) > 1) speedLines(v, t);
    if (st.phase === 'gold') edgeGlow(v, 'rgba(255,214,90,', (0.16 + 0.08 * Math.sin(t * 5)).toFixed(3));
    // the crosshair
    const aiming = h.fire && (h.fire.st === 'aim' || h.fire.st === 'tell');
    const a = aiming && h.fire.a != null ? h.fire.a : h.face;
    const q = aimSpot(st, h, a);
    if (q && q.z < 1 && st.phase !== 'count') {
      let lock = false;
      if (st.firing && h.noFire <= 0 && !(o.cloakT > 0)) {
        const pth = aiming && h.line ? h.line : CO.path(st, h, CO.help(st, h, h.face, false));
        lock = pth.hits.some(x => x.id === o.id);
        // where the beam would first land (a dot on the wall, mirror or vest)
        if (!aiming && pth.segs.length) { const g = pth.segs[0], d = E.spot(id, g.x1, BEAM_Y, g.z1); if (d && d.z < 1) { ctx.fillStyle = PCOL[id]; ctx.globalAlpha = 0.85; circle(d.x, d.y, 2.6 * k); ctx.fill(); ctx.globalAlpha = 1; } }
      }
      const ready = h.noFire <= 0 && h.rech <= 0 && st.firing;
      const gap = (lock ? 5 : 9) * k, len = 8 * k, col = lock ? PCOL[id] : ready ? '#fff8ea' : 'rgba(246,239,223,0.45)';
      ctx.lineCap = 'round';
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        ctx.strokeStyle = 'rgba(10,8,14,0.7)'; ctx.lineWidth = 4.5 * k; ctx.beginPath(); ctx.moveTo(q.x + dx * gap, q.y + dy * gap); ctx.lineTo(q.x + dx * (gap + len), q.y + dy * (gap + len)); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = 2.2 * k; ctx.beginPath(); ctx.moveTo(q.x + dx * gap, q.y + dy * gap); ctx.lineTo(q.x + dx * (gap + len), q.y + dy * (gap + len)); ctx.stroke();
      }
      ctx.fillStyle = col; circle(q.x, q.y, 1.8 * k); ctx.fill();
      // the charge ring
      const ch = h.noFire > 0 ? 0 : 1 - h.rech / S.RECHARGE, R = 22 * k;
      ctx.lineWidth = 2.5 * k; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; circle(q.x, q.y, R); ctx.stroke();
      if (ch < 1) { ctx.strokeStyle = h.noFire > 0 ? 'rgba(255,255,255,0.25)' : '#fff4d0'; ctx.beginPath(); ctx.arc(q.x, q.y, R, -Math.PI / 2, -Math.PI / 2 + ch * Math.PI * 2); ctx.stroke(); }
      if (lock) { ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2 * k; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 14); circle(q.x, q.y, R + 5 * k); ctx.stroke(); ctx.globalAlpha = 1; }
      // a hit mark when you tag
      const lt = st.lastTag;
      if (lt && lt.by === id && t - lt.t < 0.5) {
        const e = (t - lt.t) / 0.5, r0 = (12 + 10 * e) * k;
        ctx.globalAlpha = 1 - e; ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 3 * k;
        for (const s of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { ctx.beginPath(); ctx.moveTo(q.x + s[0] * r0 * 0.7, q.y + s[1] * r0 * 0.7); ctx.lineTo(q.x + s[0] * r0 * 1.3, q.y + s[1] * r0 * 1.3); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      // a beam about to reach you: an arc round the crosshair pointing at it, JUMP! in the tell
      threat(st, h, o, q, k);
      if (h.safe > 0) words('TAGGED', q.x, q.y + 44 * k, 18 * k, '#f6efdf');
      else if (h.noFire > 0) words('...', q.x, q.y + 44 * k, 18 * k, '#f6efdf');
      for (const e of st.fx) if (e.k === 'dodge' && e.who === id && t - e.t < 0.9) words('DODGE!', q.x, q.y - 46 * k - (t - e.t) * 16, 20 * k, '#5aff8a');
    }
    radar(st, v, h, o, split ? 42 : 58);
    // (the level's name pill sits over the top left of the picture)
    panel(st, id, v.x + 12, v.y + (v.y < 10 ? 46 : 10), k, false);
  }
  function speedLines(v, t) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,226,74,0.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const s = (i * 0.618 + t * 2.2) % 1, side = i % 2 ? 1 : -1, y = v.y + v.h * (0.12 + ((i * 0.37) % 1) * 0.76), x0 = side > 0 ? v.x + v.w - 8 - s * 60 : v.x + 8 + s * 60;
      ctx.globalAlpha = 0.6 * (1 - s); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + side * 34, y); ctx.stroke();
    }
    ctx.restore();
  }
  function threat(st, h, o, q, k) {
    const f = o.fire; if (!f || !(f.st === 'aim' || f.st === 'tell' || f.st === 'tellTap') || h.safe > 0) return;
    const pth = f.st === 'tellTap' ? CO.path(st, o, f.a) : o.line; if (!pth || !pth.hits.some(x => x.id === h.id)) return;
    const near = f.st !== 'aim', rel = angDiff(Math.atan2(o.x - h.x, o.z - h.z), h.face);
    // up = ahead, left = to your left (a turn to the left raises face)
    const ang = -Math.PI / 2 - rel, R = 34 * k, wd = near ? 0.55 : 0.4;
    ctx.save();
    ctx.globalAlpha = near ? 0.75 + 0.25 * Math.sin(st.t * 30) : 0.6;
    ctx.strokeStyle = 'rgba(10,8,14,0.7)'; ctx.lineWidth = (near ? 9 : 6) * k; ctx.beginPath(); ctx.arc(q.x, q.y, R, ang - wd, ang + wd); ctx.stroke();
    ctx.strokeStyle = PCOL[o.id]; ctx.lineWidth = (near ? 6 : 3.5) * k; ctx.beginPath(); ctx.arc(q.x, q.y, R, ang - wd, ang + wd); ctx.stroke();
    // the arrowhead
    const ax = q.x + Math.cos(ang) * (R + 9 * k), ay = q.y + Math.sin(ang) * (R + 9 * k);
    ctx.fillStyle = PCOL[o.id]; ctx.beginPath(); ctx.moveTo(ax + Math.cos(ang) * 7 * k, ay + Math.sin(ang) * 7 * k); ctx.lineTo(ax + Math.cos(ang + 2.3) * 7 * k, ay + Math.sin(ang + 2.3) * 7 * k); ctx.lineTo(ax + Math.cos(ang - 2.3) * 7 * k, ay + Math.sin(ang - 2.3) * 7 * k); ctx.fill();
    ctx.restore();
    if (near) words('JUMP!', q.x, q.y + 62 * k, 26 * k, PCOL[o.id], 'center', 6);
  }
  // the radar: your way is up
  function radar(st, v, h, o, R) {
    const cx = v.x + v.w - R - 14, cy = v.y + v.h - R - 12, sc = R / 11;
    const [fx, fz] = CO.dirOf(h.face), rx = -fz, rz = fx;
    const P = (x, z) => { const dx = x - h.x, dz = z - h.z; return [cx + (dx * rx + dz * rz) * sc, cy - (dx * fx + dz * fz) * sc]; };
    ctx.save();
    ctx.fillStyle = 'rgba(14,12,20,0.72)'; circle(cx, cy, R); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, Math.PI * 2); ctx.clip();
    // rings and the view's width
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; circle(cx, cy, R * 0.5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, -Math.PI / 2 - 0.8, -Math.PI / 2 + 0.8); ctx.fill();
    // the floor's edge (or the closing ring)
    const hx = st.ring ? st.ring.hx : AR.HX, hz = st.ring ? st.ring.hz : AR.HZ;
    ctx.strokeStyle = st.ring ? 'rgba(255,214,90,0.8)' : 'rgba(246,239,223,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); for (const [x, z] of [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]]) ctx.lineTo(...P(x, z)); ctx.closePath(); ctx.stroke();
    // the pieces
    for (const s of st.sol || []) {
      if (s.shape === 'circle') { const [x, y] = P(s.x, s.z); ctx.fillStyle = s.beam === 'prism' ? 'rgba(184,168,255,0.7)' : 'rgba(150,140,170,0.75)'; circle(x, y, Math.max(1.5, s.r * sc)); ctx.fill(); continue; }
      if (s.shape === 'seg') { const a = P(...AR.wor(s, -s.hw, 0)), b = P(...AR.wor(s, s.hw, 0)); ctx.strokeStyle = 'rgba(255,240,176,0.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); continue; }
      ctx.beginPath(); for (const [lx, lz] of [[-s.hw, -s.hd], [s.hw, -s.hd], [s.hw, s.hd], [-s.hw, s.hd]]) ctx.lineTo(...P(...AR.wor(s, lx, lz))); ctx.closePath();
      if (s.move === 'low') { ctx.strokeStyle = 'rgba(200,190,150,0.7)'; ctx.lineWidth = 1.2; ctx.stroke(); } else { ctx.fillStyle = 'rgba(150,140,170,0.75)'; ctx.fill(); }
    }
    // the pickups waiting on their pads
    for (const q of st.layout) if (q.k === 'pad' && st.pads[q.id]) { const [x, y] = P(q.x, q.z); ctx.fillStyle = ARCADELASER_HUD.pickCol[st.pads[q.id].kind]; circle(x, y, 3.2); ctx.fill(); }
    // beams of the last half second
    for (const b of st.beams) if (st.t - b.t < 0.5) {
      ctx.strokeStyle = PCOL[b.who]; ctx.globalAlpha = 1 - (st.t - b.t) / 0.5; ctx.lineWidth = 1.5;
      for (const pth of b.paths) { ctx.beginPath(); pth.segs.forEach((g, i) => { if (!i) ctx.moveTo(...P(g.x0, g.z0)); ctx.lineTo(...P(g.x1, g.z1)); }); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    // the other player: when you can see them, or just after they fire (never cloaked)
    const ping = st.t - lastShot(st, o.id);
    if (!(o.cloakT > 0) && (sees(st, h, o) || ping < 1.5)) {
      const [x, y] = P(o.x, o.z), seen = sees(st, h, o);
      ctx.globalAlpha = seen ? 1 : Math.max(0, 1 - ping / 1.5);
      ctx.fillStyle = PCOL[o.id]; circle(x, y, 4.5); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; circle(x, y, 4.5); ctx.stroke();
      if (!seen) { ctx.strokeStyle = PCOL[o.id]; circle(x, y, 4.5 + ping * 8); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // you: an arrow in the middle
    ctx.fillStyle = PCOL[h.id]; ctx.strokeStyle = 'rgba(10,8,14,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 4.5, cy + 4.5); ctx.lineTo(cx, cy + 2); ctx.lineTo(cx - 4.5, cy + 4.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = PCOL[h.id]; ctx.lineWidth = 2; circle(cx, cy, R); ctx.stroke();
  }
  // a player's panel: name, round stars, five tag lamps, the held pickup
  function panel(st, id, x0, y, k, right) {
    const h = st.heroes[id], w = 210 * k, hh = 46 * k;
    ctx.save();
    ctx.fillStyle = 'rgba(23,25,29,0.74)'; rr(x0 + (right ? 210 - 210 * k : 0), y, w, hh, 13 * k); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2; rr(x0 + (right ? 210 - 210 * k : 0), y, w, hh, 13 * k); ctx.stroke();
    const X = x0 + (right ? 210 - 210 * k : 0);
    text(NAMES[id] + (typeof cpuOn === 'function' && cpuOn(id) ? ' (computer)' : ''), X + 12 * k, y + 13 * k, 13 * k, PCOL[id], 'left');
    for (let i = 0; i < S.ROUNDS; i++) star(X + w - 14 * k - i * 15 * k, y + 13 * k, 6 * k, i < st.wins[id] ? C.gold : 'rgba(255,255,255,0.18)');
    for (let i = 0; i < S.NEED; i++) {
      const lx = X + 18 * k + i * 22 * k, on = i < h.tags;
      ctx.fillStyle = on ? PCOL[id] : 'rgba(255,255,255,0.12)'; circle(lx, y + 32 * k, 7 * k); ctx.fill();
      if (on) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; circle(lx - 2 * k, y + 30 * k, 2.2 * k); ctx.fill(); }
    }
    const hn = h.heldNow;
    if (hn) {
      const px = X + w - 24 * k, py = y + 31 * k, col = ARCADELASER_HUD.pickCol[hn];
      ctx.strokeStyle = col; ctx.lineWidth = 2; circle(px, py, 11 * k); ctx.stroke();
      ARCADELASER_HUD.icon(hn, px, py, 0.62 * k, col);
      const left = hn === 'cloak' ? h.cloakT / S.CLOAK_T : hn === 'speed' ? h.speedT / S.SPEED_T : hn === 'shield' && !h.gold ? h.shieldT / S.SHIELD_T : 1;
      if (left < 1) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 14 * k, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); ctx.stroke(); }
      if (hn === 'long') text('x' + h.longN, px - 20 * k, py, 11 * k, '#fff', 'center');
    }
    ctx.restore();
  }
  function star(x, y, r, col) {
    ctx.fillStyle = col; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); }
    ctx.closePath(); ctx.fill();
  }
  function clockPill(st, x, y, k) {
    const gold = st.phase === 'gold', left = Math.max(0, S.ROUND_T - (st.rt || 0));
    const s = st.phase === 'count' ? 'Round ' + st.roundNo : gold ? 'NEXT TAG WINS' : 'R' + st.roundNo + '   ' + Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
    ctx.font = `900 ${15 * k}px "Atkinson Hyperlegible", system-ui, sans-serif`;
    const w = ctx.measureText(s).width + 28 * k;
    ctx.fillStyle = 'rgba(14,12,20,0.88)'; rr(x - w / 2, y - 13 * k, w, 26 * k, 13 * k); ctx.fill();
    ctx.strokeStyle = gold ? C.gold : 'rgba(246,239,223,0.5)'; ctx.lineWidth = 2; rr(x - w / 2, y - 13 * k, w, 26 * k, 13 * k); ctx.stroke();
    ctx.fillStyle = gold ? C.gold : (left < 10 && st.phase === 'live' ? '#ff9a7a' : '#f6efdf'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y + 1);
  }
  // the bar between the two views: Pip's colour above, Bo's below, the clock in the middle
  function divider(st) {
    ctx.fillStyle = '#0e0c14'; ctx.fillRect(0, H / 2 - 3, W, 6);
    ctx.fillStyle = PCOL[0]; ctx.fillRect(0, H / 2 - 3, W, 1.5);
    ctx.fillStyle = PCOL[1]; ctx.fillRect(0, H / 2 + 1.5, W, 1.5);
    clockPill(st, W / 2, H / 2, 1);
  }

  /* ---------- over the 3D picture, under the HUD: the name over the other player, what they hold ---------- */
  E.top = function (st) {
    if (!E.on() || !st.heroes) return;
    for (const v of E.views) {
      const h = st.heroes[v.id], o = st.heroes[1 - v.id];
      if (o.cloakT > 0 || !sees(st, h, o)) continue;
      const q = E.spot(v.id, o.x, o.y + 1.08, o.z);
      if (!q || q.z > 1 || Math.abs(q.nx) > 1 || q.ny > 1 || q.ny < -1) continue;
      const d = Math.hypot(o.x - h.x, o.z - h.z), k = clamp(2.6 / Math.max(1, d), 0.55, 1) * (E.views.length > 1 ? 0.85 : 1);
      ctx.save(); ctx.beginPath(); ctx.rect(v.x, v.y, v.w, v.h); ctx.clip();
      ctx.globalAlpha = clamp((14 - d) / 4, 0.35, 1);
      ctx.font = `900 ${Math.round(15 * k)}px "Atkinson Hyperlegible", system-ui, sans-serif`;
      const s = NAMES[o.id], w = ctx.measureText(s).width + 16 * k;
      ctx.fillStyle = 'rgba(14,12,20,0.78)'; rr(q.x - w / 2, q.y - 22 * k, w, 18 * k, 9 * k); ctx.fill();
      ctx.fillStyle = PCOL[o.id]; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, q.x, q.y - 12.5 * k);
      ctx.beginPath(); ctx.moveTo(q.x - 5 * k, q.y - 4 * k); ctx.lineTo(q.x + 5 * k, q.y - 4 * k); ctx.lineTo(q.x, q.y + 1 * k); ctx.fill();
      // five small lamps under the name: how many tags they have
      for (let i = 0; i < S.NEED; i++) { ctx.fillStyle = i < o.tags ? PCOL[o.id] : 'rgba(255,255,255,0.25)'; circle(q.x - 16 * k + i * 8 * k, q.y - 27 * k, 2.4 * k); ctx.fill(); }
      const hn = o.heldNow;
      if (hn) { const col = ARCADELASER_HUD.pickCol[hn], px = q.x + w / 2 + 12 * k, py = q.y - 13 * k; ctx.fillStyle = 'rgba(14,12,20,0.8)'; circle(px, py, 10 * k); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; circle(px, py, 10 * k); ctx.stroke(); ARCADELASER_HUD.icon(hn, px, py, 0.55 * k, col); }
      ctx.restore();
    }
  };
  return E;
})();
