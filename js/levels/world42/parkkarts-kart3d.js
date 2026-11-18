/* Pip & Bo - 42-4 Go-Kart Grand Prix: the karts as 3D models, Pip and Bo in them, and the robots' karts. Loaded on
   demand with the 3D kit. Display only: it reads the rules' state and never changes it.

   PARKKARTS_KART3D.build(K, id) -> kart   a small chunky fairground go-kart: fat tyres, a rubber bumper ring, a
       spring-mounted steering wheel, a rattling lawnmower engine with a puffing exhaust, a number plate, a flag on a
       whippy pole, headlamps (with a beam and a pool of light on the road), tail lamps, underglow in the kart's colour.
       Pip's is orange, number 1; Bo's is blue, number 2. The driver sits in it in their outfit.
   PARKKARTS_KART3D.pose(kart, k, st, dt, o)   places it and its driver from the kart's rules state (k)
   PARKKARTS_KART3D.robot(K, i) -> rk     a wind-up robot in a little tin kart (the park's sweepers, out for a drive)
   The model faces +Z (its yaw is the rules' yaw), +X is its LEFT (three.js: a yaw of 0 looks toward +Z). */
'use strict';

const PARKKARTS_KART3D = (function () {
  const T = K3D.T, INK = '#1a1530';
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const mk = (geo, mat, o) => K3D.mesh(geo, mat, o);
  const KC = [{ body: '#ff8a2a', dark: '#c85a10', light: '#ffc078', glow: '#ff9a3a' }, { body: '#3d8ef0', dark: '#1f5fb8', light: '#9cc8ff', glow: '#4aa8ff' }];
  const KM = {};

  // the kart's paint: the body colour with a racing stripe, rivets, chips and the number roundel
  const bodyTex = (id) => K3D.paint('pk-body|' + id, 256, 256, (c, w, h) => {
    const k = KC[id];
    c.fillStyle = k.body; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fbf7ec'; c.fillRect(0, h * 0.42, w, h * 0.06); c.fillStyle = k.dark; c.fillRect(0, h * 0.48, w, h * 0.04);
    for (let i = 0; i < 10; i++) { c.fillStyle = 'rgba(30,20,30,0.5)'; c.beginPath(); c.arc(12 + i * 25, h * 0.88, 3, 0, Math.PI * 2); c.fill(); }
    for (let i = 0; i < 90; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(40,20,20,0.22)'; c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 1 + Math.random() * 4, 0.6 + Math.random() * 1.5, Math.random() * 3, 0, Math.PI * 2); c.fill(); }
  });
  const plateTex = (id) => K3D.paint('pk-plate|' + id, 128, 128, (c, w, h) => {
    c.fillStyle = '#fbf7ec'; c.beginPath(); c.arc(64, 64, 60, 0, Math.PI * 2); c.fill();
    c.strokeStyle = KC[id].dark; c.lineWidth = 9; c.stroke();
    c.fillStyle = '#1a1530'; c.font = '900 86px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(id + 1), 64, 70);
  });
  const flagTex = (id) => K3D.paint('pk-pennant|' + id, 128, 64, (c, w, h) => {
    c.fillStyle = KC[id].body; c.fillRect(0, 0, w, h);
    const s = 8; for (let y = 0; y < h / s; y++) for (let x = 0; x < 3; x++) { c.fillStyle = (x + y) % 2 ? '#1a1530' : '#fbf7ec'; c.fillRect(x * s, y * s, s, s); }
    c.fillStyle = '#fbf7ec'; c.font = '900 40px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(id + 1), w * 0.6, h / 2 + 2);
  });
  const tyreTex = () => K3D.paint('pk-tyre', 128, 32, (c, w, h) => { c.fillStyle = '#25222c'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a3642'; for (let i = 0; i < 16; i++) c.fillRect(i * 8, 0, 4, h); }, { repeat: true });
  const beamTex = () => K3D.paint('pk-beam', 64, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, h, 0, 0); g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const g2 = c.createLinearGradient(0, 0, w, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(0.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)');
    c.globalCompositeOperation = 'destination-out'; c.fillStyle = g2; c.fillRect(0, 0, w, h);
  });
  const poolTex = () => K3D.paint('pk-pool', 128, 128, (c, w, h) => {
    const g = c.createRadialGradient(64, 64, 2, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });

  function wheel(K, r, wd) {
    const g = new T.Group();
    const tyre = mk(K3D.geo('pk-tyre' + r, () => { const t = new T.CylinderGeometry(r, r, wd, 20, 1).rotateZ(Math.PI / 2); return t; }), K3D.mat('pk-tyreM', () => K3D.toon('#ffffff', { map: tyreTex() })), { ink: INK, inkW: 0.8 });
    g.add(tyre);
    const side = K3D.mat('pk-tyreSide', () => K3D.toon('#2a2632'));
    for (const sx of [-1, 1]) {
      const wall = mk(K3D.geo('pk-tyrewall' + r, () => new T.TorusGeometry(r * 0.82, r * 0.18, 8, 20).rotateY(Math.PI / 2)), side, { ink: false }); wall.position.x = sx * wd * 0.5; g.add(wall);
      const hub = mk(K3D.geo('pk-hub' + r, () => new T.CylinderGeometry(r * 0.5, r * 0.5, 0.04, 12).rotateZ(Math.PI / 2)), K3D.mat('pk-hubM', () => K3D.toon('#e8e2d4')), { ink: INK, inkW: 0.5 }); hub.position.x = sx * (wd * 0.5 + 0.01); g.add(hub);
      const nut = new T.Mesh(K3D.geo('pk-nut' + r, () => new T.CylinderGeometry(r * 0.16, r * 0.16, 0.05, 6).rotateZ(Math.PI / 2)), K3D.mat('pk-nutM', () => K3D.toon('#d9a94a'))); nut.position.x = sx * (wd * 0.5 + 0.03); g.add(nut);
    }
    return g;
  }

  function build(K, id) {
    const c = KC[id], g = new T.Group(), body = new T.Group(); g.add(body); // body: rolls, pitches and bounces on the springs
    g.userData.live = true;
    const paint = K3D.toon('#ffffff', { map: bodyTex(id) }), dark = K3D.toon('#2a2438'), steel = K3D.toon('#c8c4d4'), rubber = K3D.toon('#25222c');
    // the frame: a low tray, the nose cone with the number plate, the side pods
    const tray = mk(new T.BoxGeometry(1.0, 0.08, 1.7), dark, { ink: INK, inkW: 0.7 }); tray.position.set(0, 0.2, 0); body.add(tray);
    const nose = mk(K3D.roundBox(0.9, 0.34, 0.62, 0.55, 28), paint, { ink: INK, inkW: 1 }); nose.position.set(0, 0.2, 0.62); nose.scale.set(1, 1, 1); body.add(nose);
    const plate = new T.Mesh(new T.CircleGeometry(0.17, 24), K3D.toon('#ffffff', { map: plateTex(id) })); plate.position.set(0, 0.42, 0.93); plate.rotation.x = -0.35; body.add(plate);
    for (const sx of [-1, 1]) { const pod = mk(K3D.roundBox(0.26, 0.28, 0.95, 0.5, 20), paint, { ink: INK, inkW: 0.9 }); pod.position.set(sx * 0.46, 0.2, -0.05); body.add(pod); }
    // the seat: a moulded tub behind the driver with a padded back
    const seat = mk(K3D.roundBox(0.62, 0.62, 0.36, 0.6, 20), K3D.toon(c.dark), { ink: INK, inkW: 0.8 }); seat.position.set(0, 0.24, -0.42); seat.rotation.x = -0.18; body.add(seat);
    // the bumper ring: a fat black rubber ring right round the kart (it blows up with the Bumper Ring prize)
    const ringG = new T.Group(); ringG.position.y = 0.26; body.add(ringG);
    const ring = mk(K3D.geo('pk-bumper', () => new T.TorusGeometry(1, 0.1, 10, 48).rotateX(Math.PI / 2)), rubber, { ink: INK, inkW: 0.8 }); ring.scale.set(0.74, 1, 1.08); ringG.add(ring);
    const ringBig = mk(K3D.geo('pk-bumperBig', () => new T.TorusGeometry(1, 0.26, 14, 48).rotateX(Math.PI / 2)), K3D.toon('#ffd24a', { emissive: '#8a5a00', emissiveIntensity: 0.3 }), { ink: INK, inkW: 1 }); ringBig.scale.set(0.9, 1, 1.25); ringBig.visible = false; ringG.add(ringBig);
    // the steering column on a spring, and the wheel
    const col = new T.Group(); col.position.set(0, 0.28, 0.42); body.add(col);
    const spring = mk(K3D.geo('pk-spring', () => { const pts = []; for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 10; pts.push(new T.Vector3(Math.cos(a) * 0.04, i / 60 * 0.24, Math.sin(a) * 0.04)); } return new T.TubeGeometry(new T.CatmullRomCurve3(pts), 80, 0.008, 4); }), steel, { ink: false }); spring.rotation.x = -0.6; col.add(spring);
    const wheelG = new T.Group(); wheelG.position.set(0, 0.2, -0.13); wheelG.rotation.x = -0.6 - Math.PI / 2 + 0.55; col.add(wheelG);
    const sw = mk(new T.TorusGeometry(0.13, 0.025, 8, 24), K3D.toon('#2a2438'), { ink: INK, inkW: 0.6 }); wheelG.add(sw);
    for (let i = 0; i < 3; i++) { const sp = new T.Mesh(new T.BoxGeometry(0.02, 0.13, 0.015).translate(0, 0.065, 0), steel); sp.rotation.z = i / 3 * Math.PI * 2; wheelG.add(sp); }
    const hubB = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.03, 12).rotateX(Math.PI / 2), K3D.toon(c.body)); wheelG.add(hubB);
    // the lawnmower engine at the back: a finned block, a fuel tank, the pull cord, the exhaust
    const eng = new T.Group(); eng.position.set(0.18, 0.28, -0.78); body.add(eng);
    const block = mk(K3D.roundBox(0.34, 0.32, 0.3, 0.4, 16), K3D.toon('#9a96a8'), { ink: INK, inkW: 0.7 }); eng.add(block);
    for (let i = 0; i < 4; i++) { const fin = new T.Mesh(new T.BoxGeometry(0.38, 0.015, 0.32), K3D.toon('#7a7688')); fin.position.y = 0.08 + i * 0.05; eng.add(fin); }
    const tank = mk(K3D.roundBox(0.26, 0.16, 0.2, 0.5, 12), K3D.toon('#d83a3a'), { ink: INK, inkW: 0.6 }); tank.position.set(-0.36, 0.06, 0.02); eng.add(tank);
    const pull = mk(new T.TorusGeometry(0.04, 0.012, 6, 12), K3D.toon('#1a1530'), { ink: false }); pull.position.set(0.2, 0.16, 0); eng.add(pull);
    const pipe = mk(new T.CylinderGeometry(0.045, 0.055, 0.32, 10).rotateX(Math.PI / 2), steel, { ink: INK, inkW: 0.5 }); pipe.position.set(-0.05, 0.12, -0.22); pipe.rotation.y = 0.2; eng.add(pipe);
    const exhaust = new T.Vector3(0.12, 0.42, -1.12); // in body space
    // the whippy flag pole at the back (bends with speed) and its pennant
    const pole = new T.Group(); pole.position.set(-0.32, 0.3, -0.72); body.add(pole);
    const poleSegs = []; let pp = pole;
    for (let i = 0; i < 5; i++) { const sgm = new T.Group(); sgm.position.y = i ? 0.26 : 0; pp.add(sgm); const rod = new T.Mesh(new T.CylinderGeometry(0.012, 0.015, 0.26, 5).translate(0, 0.13, 0), K3D.toon('#e8e2d4')); sgm.add(rod); poleSegs.push(sgm); pp = sgm; }
    const pennantGeo = new T.PlaneGeometry(0.5, 0.26, 8, 1).translate(-0.25, -0.13, 0);
    const pennant = mk(pennantGeo, K3D.toon('#ffffff', { map: flagTex(id), side: T.DoubleSide }), { ink: INK, inkW: 0.5 }); pennant.position.y = 0.26; pennant.rotation.y = Math.PI / 2; pp.add(pennant);
    const penBase = Float32Array.from(pennantGeo.attributes.position.array);
    // wheels: small front, fat rear
    const wheels = [];
    for (const [x, z, r, wd, front] of [[0.6, 0.6, 0.2, 0.2, 1], [-0.6, 0.6, 0.2, 0.2, 1], [0.62, -0.62, 0.25, 0.3, 0], [-0.62, -0.62, 0.25, 0.3, 0]]) {
      const pivot = new T.Group(); pivot.position.set(x, r, z); g.add(pivot);
      const w = wheel(K, r, wd); pivot.add(w); wheels.push({ pivot, w, r, front });
      const arm = new T.Mesh(new T.BoxGeometry(Math.abs(x) - 0.4, 0.04, 0.05), dark); arm.position.set(x / 2 + Math.sign(x) * 0.18, 0.2, z); body.add(arm);
    }
    // lamps: headlamps (bright, they bloom) with a beam and a pool on the road; tail lamps; the underglow
    const lampM = K3D.flat(hot('#fff4d0', 4)), tailM = K3D.flat(hot('#ff3a3a', 3.2));
    for (const sx of [-1, 1]) {
      const hl = mk(new T.CylinderGeometry(0.07, 0.08, 0.06, 12).rotateX(Math.PI / 2), K3D.toon('#d8d0e8'), { ink: INK, inkW: 0.5 }); hl.position.set(sx * 0.26, 0.38, 0.88); body.add(hl);
      const lens = new T.Mesh(new T.CircleGeometry(0.058, 12), lampM); lens.position.set(sx * 0.26, 0.38, 0.915); body.add(lens);
      const tl = new T.Mesh(new T.SphereGeometry(0.05, 10, 8), tailM); tl.position.set(sx * 0.42, 0.34, -0.66); body.add(tl);
    }
    const beamM = new T.MeshBasicMaterial({ map: beamTex(), color: hot('#fff0c8', 0.32), transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false });
    const beams = new T.Group(); beams.position.set(0, 0.36, 0.95); body.add(beams);
    for (const r of [0, Math.PI / 2]) { const b = new T.Mesh(K3D.geo('pk-beamG', () => new T.PlaneGeometry(1.6, 6).rotateX(-Math.PI / 2).translate(0, 0, 3)), beamM); b.rotation.z = r; b.rotation.x = 0.06; b.userData.noSee = true; beams.add(b); }
    const poolM = new T.MeshBasicMaterial({ map: poolTex(), color: hot('#fff0c8', 0.32), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
    const pool = new T.Mesh(K3D.geo('pk-poolG', () => new T.PlaneGeometry(3.4, 5.6).rotateX(-Math.PI / 2)), poolM); pool.position.set(0, 0.03, 4.0); pool.renderOrder = 2; pool.userData.noSee = true; g.add(pool);
    const glowM = new T.MeshBasicMaterial({ map: poolTex(), color: hot(c.glow, 1.1), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
    const under = new T.Mesh(K3D.geo('pk-underG', () => new T.PlaneGeometry(2.4, 3.0).rotateX(-Math.PI / 2)), glowM); under.position.y = 0.025; under.renderOrder = 2; under.userData.noSee = true; g.add(under);
    const underTube = new T.Mesh(new T.BoxGeometry(0.9, 0.03, 1.4), K3D.flat(hot(c.glow, 2.5))); underTube.position.y = 0.13; body.add(underTube);
    // the driver
    const hero = K3D.hero(id);
    K3D.dress(hero, 'parkkarts');
    const seatG = new T.Group(); seatG.position.set(0, 0.28, -0.3); body.add(seatG); seatG.add(hero);
    // the whole kart shows through scenery in its colour (and the driver is never shown through their own kart)
    K3D.seeThrough(g, PCOL[id]);
    const blob = K3D.blob(null, 1.05); K.add(blob);
    K.add(g);
    const wind = [];
    hero.traverse(o => { if (o.userData && o.userData.wind) wind.push(o.userData.wind); });
    return { g, body, id, wheels, wheelG, col, ringG, ring, ringBig, poleSegs, pennant, penBase, beams, pool, under, glowM, poolM, beamM, hero, seatG, blob, wind, exhaust, eng, t: 0, spin: 0, bounce: 0, bv: 0, roll: 0, pitch: 0, y: 0 };
  }

  const tmpV = new T.Vector3();
  // places the kart and poses the driver: k is the rules' kart; o = { other, lift (crane, 0..1), wave, cheer, sad }
  function pose(kt, k, st, dt, o = {}) {
    kt.t += dt;
    const g = kt.g;
    const lift = o.lift || 0;
    const hop = k.hopT > 0 ? Math.sin((1 - k.hopT / PARKKARTS_KART.S.HOP_T) * Math.PI) * 0.22 : 0;
    // the springs: bumps, the hop, walls and the road's own little bumps
    const rough = (k.verge ? 0.035 : 0.008) * Math.min(1, k.v / 8);
    kt.bv += (-kt.bounce * 140 - kt.bv * 9) * dt + (Math.random() - 0.5) * rough * 600 * dt;
    if (k.wallHit && k.wallHit !== kt.lastWall) { kt.lastWall = k.wallHit; kt.bv += 1.5; }
    kt.bounce += kt.bv * dt;
    g.position.set(k.x, (o.y || 0) + hop + lift * 3.2, k.z);
    // the drift: the tail kicks out (the body turns into the bend past where it is going)
    const slipWant = k.drift ? -k.drift * 0.42 : (k.skidT > 0 ? Math.sin(k.skidT * 18) * 0.35 : 0);
    kt.slip = (kt.slip || 0) + (slipWant - (kt.slip || 0)) * Math.min(1, dt * 9);
    g.rotation.set(0, k.yaw + kt.slip + (o.spin || 0), 0);
    kt.roll += ((k.drift ? k.drift * 0.08 : k.steer * 0.05 * Math.min(1, k.v / 10)) - kt.roll) * Math.min(1, dt * 8);
    kt.pitch += ((k.braking ? 0.05 : k.boostT > 0 ? -0.04 : 0) - kt.pitch) * Math.min(1, dt * 6);
    kt.body.position.y = kt.bounce * 0.4;
    kt.body.rotation.set(kt.pitch + kt.bounce * 0.3, 0, kt.roll + (lift ? Math.sin(kt.t * 5) * 0.15 * lift : 0));
    // wheels turn with speed; the front ones steer
    kt.spin += k.v * dt;
    for (const w of kt.wheels) { w.w.rotation.x = kt.spin / w.r; if (w.front) w.pivot.rotation.y = k.steer * 0.45 * (k.drift ? -0.5 : 1); w.pivot.position.y = w.r + Math.max(0, -kt.bounce) * 0.2; }
    kt.wheelG.rotation.z = k.steer * 1.2;
    kt.col.rotation.z = Math.sin(kt.t * 30) * 0.02 * Math.min(1, k.v / 6) + kt.bv * 0.02;
    // the bumper ring blows up
    const ring = k.ringT > 0; kt.ringBig.visible = ring; kt.ring.visible = !ring;
    if (ring) { const pulse = 1 + Math.sin(kt.t * 12) * 0.04; kt.ringBig.scale.set(0.9 * pulse, 1, 1.25 * pulse); }
    // the flag pole whips back with speed and wobbles; the pennant flaps
    const sp = Math.min(1, k.v / 14);
    kt.poleSegs.forEach((s, i) => { s.rotation.x = -(0.05 + sp * 0.12) * (i ? 1 : 0.5) + Math.sin(kt.t * 9 - i) * 0.04 * (0.3 + sp); s.rotation.z = Math.sin(kt.t * 7 + i * 0.7) * 0.03 - kt.roll * 0.4; });
    const pa = kt.pennant.geometry.attributes.position;
    for (let i = 0; i < pa.count; i++) { const x = kt.penBase[i * 3]; pa.setZ(i, Math.sin(kt.t * (8 + sp * 10) + x * 9) * 0.05 * -x * (1 + sp)); }
    pa.needsUpdate = true;
    // lamps: the beam is hidden by Candy Floss
    const floss = k.flossT > 0;
    kt.beams.visible = !floss; kt.pool.visible = !floss;
    kt.glowM.opacity = 0.75 + Math.sin(kt.t * 3) * 0.1;
    // the driver: sitting, leaning into corners, bouncing, hands on the wheel
    const h = kt.hero, u = h.userData;
    kt.seatG.updateMatrixWorld(true);
    const hands = [new T.Vector3(-0.12, 0.2, -0.13), new T.Vector3(0.12, 0.2, -0.13)].map(v => { v.applyAxisAngle(new T.Vector3(0, 0, 1), k.steer * 1.2); return kt.wheelG.localToWorld(v.clone()); });
    let mood = null;
    const recentHit = k.hitSafe > 0;
    if (o.cheer) { hands[0].copy(kt.seatG.localToWorld(tmpV.set(-0.3, 1.4, 0.1))); hands[1].copy(kt.seatG.localToWorld(tmpV.set(0.3, 1.4 + Math.sin(kt.t * 14) * 0.08, 0.1))); }
    else if (recentHit || o.fist) { hands[k.id === 0 ? 1 : 0] = kt.seatG.localToWorld(tmpV.set(k.id === 0 ? 0.35 : -0.35, 1.25 + Math.sin(kt.t * 22) * 0.07, 0.15)).clone(); }
    if (lift) mood = 'whoa';
    K3D.heroPose(h, { x: 0, y: 0, z: 0, heading: 0, speed: 0, vy: 0, hands: lift ? null : hands, mood, stun: o.sad }, dt);
    // lean into corners, bounce in the seat, look across at the other kart when side by side
    const bp = u.bodyPivot;
    bp.rotation.z = -kt.roll * 2.2 + (k.drift ? k.drift * 0.12 : 0);
    bp.rotation.x = kt.pitch * 2 - (k.boostT > 0 ? 0.12 : 0);
    bp.position.y = Math.max(0, kt.bounce * 0.8) + (hop ? hop * 0.6 : 0);
    let look = 0;
    if (o.other) { const dx = o.other.x - k.x, dz = o.other.z - k.z, along = dx * Math.sin(k.yaw) + dz * Math.cos(k.yaw), side = dx * Math.cos(k.yaw) - dz * Math.sin(k.yaw); if (Math.abs(along) < 2.2 && Math.hypot(dx, dz) < 4) look = Math.sign(side) * 0.55; }
    kt.look = (kt.look || 0) + (look - (kt.look || 0)) * Math.min(1, dt * 5);
    h.rotation.y = kt.look;
    for (const e of u.eyes) e.pupil.position.x = kt.look * 0.03;
    // the scarf and cape stream in the wind
    for (const w of kt.wind) {
      if (w.kind === 'tail') w.segs.forEach((s, i) => { s.rotation.x = (i === 0 ? 0.3 - (1 - sp) * 1.4 : -0.06 * (1 - sp)) + Math.sin(kt.t * (9 + sp * 8) - i * 1.1) * (0.07 + sp * 0.1); s.rotation.y = Math.sin(kt.t * 6 - i * 0.9) * 0.18 + kt.roll * 1.5 - kt.slip * 0.4; });
      else if (w.kind === 'cape') { const m = w.mesh, a = m.geometry.attributes.position, b = m.userData.base; for (let i = 0; i < a.count; i++) { const y = b[i * 3 + 1], x = b[i * 3]; a.setZ(i, -y * -(0.4 + sp * 0.9) * 0.9 + Math.sin(kt.t * (10 + sp * 6) + y * 12 + x * 4) * 0.04 * (-y * 3)); } a.needsUpdate = true; m.geometry.computeVertexNormals(); }
    }
    K3D.placeBlob(kt.blob, k.x, o.y || 0, k.z, hop + lift * 3);
    kt.blob.scale.multiplyScalar(1);
  }

  // a wind-up robot in a little tin kart: the park kit's sweeper, with a racing cap and its broom stowed
  function robot(K, i) {
    const g = new T.Group(); g.userData.live = true;
    const cols = ['#e85a4a', '#3f9a8a', '#f2c14e', '#7a6ad0', '#d860a8', '#5aa0d8'];
    const tin = K3D.toon(cols[i % cols.length]), dark = K3D.toon('#2a2438');
    const tub = mk(K3D.roundBox(1.0, 0.34, 1.5, 0.5, 20), K3D.toon('#d8d4e0'), { ink: INK, inkW: 0.8 }); tub.position.y = 0.15; g.add(tub);
    const stripe = mk(new T.BoxGeometry(1.02, 0.08, 1.2), tin, { ink: false }); stripe.position.y = 0.36; g.add(stripe);
    const num = new T.Mesh(new T.CircleGeometry(0.14, 16), K3D.flat('#fbf7ec')); num.position.set(0, 0.38, 0.76); num.rotation.x = -0.4; g.add(num);
    for (const [x, z] of [[0.52, 0.5], [-0.52, 0.5], [0.52, -0.5], [-0.52, -0.5]]) { const w = mk(K3D.geo('pk-rbW', () => new T.CylinderGeometry(0.18, 0.18, 0.16, 14).rotateZ(Math.PI / 2)), dark, { ink: INK, inkW: 0.6 }); w.position.set(x, 0.18, z); g.add(w); }
    const r = PARK.robot(K, { col: cols[i % cols.length] }); K.root.remove(r); r.position.set(0, 0.25, -0.15); r.scale.setScalar(0.8); g.add(r);
    r.userData.broom.visible = false;
    const lamp = new T.Mesh(new T.SphereGeometry(0.07, 8, 6), K3D.flat(hot('#ffb02a', 3))); lamp.position.set(0, 1.75, -0.15); g.add(lamp);
    const blob = K3D.blob(null, 0.9); K.add(blob);
    K.add(g);
    return { g, r, blob, lamp, t: i };
  }
  function poseRobot(rk, r, dt) {
    rk.t += dt;
    rk.g.position.set(r.x, Math.abs(Math.sin(rk.t * 11)) * 0.03, r.z); rk.g.rotation.y = r.yaw;
    rk.r.userData.key.rotation.z += dt * 6; rk.r.userData.head.rotation.y = Math.sin(rk.t * 0.9 + rk.t * 0.1) * 0.4;
    rk.lamp.visible = Math.floor(rk.t * 3) % 2 === 0;
    K3D.placeBlob(rk.blob, r.x, 0, r.z, 0);
  }
  return { build, pose, robot, poseRobot, KC };
})();
