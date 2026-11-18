/* Pip & Bo - 42-4 Go-Kart Grand Prix: everything that moves in the picture. The two karts and their drivers, the
   robots' karts, the prize boxes, the prizes on the road (floss clouds, giant teddies, water balloons, rockets), the
   drift sparks, boost flames, exhaust puffs, skid marks, slipstream lines, splashes and confetti, the wind-up crane,
   the start lights, the crowd turning to watch, and the one chase camera. Loaded on demand with the 3D kit. Display
   only: it reads the rules' state (G.mst) and never changes it.

   PARKKARTS_SCENE.build(K, st)      once per scene (builds the place with PARKKARTS_WORLD first)
   PARKKARTS_SCENE.update(K, st, dt) every drawn frame
   PARKKARTS_SCENE.drawTop(st)       the loudspeaker's lines, the wheel of fortune over a kart, "Wrong way!"
   PARKKARTS_SCENE.camOverride = { eye, at, fov }   the look-shot tools hold the camera still with this

   The camera: one chase camera behind both karts, turning with the road at most 45 degrees a second and rolling at
   most 6 (none with reduced motion). It frames the kart behind low on the screen and the one in front higher, and as
   the gap grows to the breakaway limit the one behind sinks to the bottom edge (past it, it is off the screen). */
'use strict';

const PARKKARTS_SCENE = (function () {
  const T = K3D.T, TR = PARKKARTS_TRACK, KK3 = PARKKARTS_KART3D, PZ = PARKKARTS_PRIZES;
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const RM = () => !!(typeof reduceMotion !== 'undefined' && reduceMotion) || !!K3D.reduce;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  let PW = null;

  /* ---------- particles: one additive family (sparks, flames, glitter) and one soft family (smoke, floss, spray) ---------- */
  function particles(K, n, additive) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), aL = new Float32Array(n * 2);
    const vel = new Float32Array(n * 3), life = new Float32Array(n), max = new Float32Array(n), grav = new Float32Array(n), drag = new Float32Array(n), grow = new Float32Array(n);
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setAttribute('aL', new T.BufferAttribute(aL, 2));
    const m = new T.ShaderMaterial({ uniforms: { uPx: { value: 1 } }, transparent: true, depthWrite: false, vertexColors: true,
      blending: additive ? T.AdditiveBlending : T.NormalBlending,
      vertexShader: 'attribute vec2 aL; uniform float uPx; varying vec3 vC; varying float vA; void main() { vC = color; vA = aL.x; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.0, aL.y * 300.0 * uPx / -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: additive
        ? 'varying vec3 vC; varying float vA; void main() { float d = length(gl_PointCoord - 0.5); if (vA <= 0.0 || d > 0.5) discard; gl_FragColor = vec4(vC * smoothstep(0.5, 0.0, d) * vA * 2.0, 1.0); }'
        : 'varying vec3 vC; varying float vA; void main() { float d = length(gl_PointCoord - 0.5); if (vA <= 0.0 || d > 0.5) discard; gl_FragColor = vec4(vC, smoothstep(0.5, 0.25, d) * vA); }' });
    const pts = new T.Points(g, m); pts.frustumCulled = false; pts.renderOrder = additive ? 3 : 2; pts.userData.live = true; K.add(pts);
    let head = 0;
    const c3 = new T.Color();
    return {
      add(x, y, z, vx, vy, vz, c, l, size, o = {}) {
        const i = head; head = (head + 1) % n;
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
        c3.set(c); col[i * 3] = c3.r; col[i * 3 + 1] = c3.g; col[i * 3 + 2] = c3.b;
        life[i] = max[i] = l; aL[i * 2] = 1; aL[i * 2 + 1] = size; grav[i] = o.g != null ? o.g : 0; drag[i] = o.drag || 0; grow[i] = o.grow || 0;
      },
      step(dt) {
        for (let i = 0; i < n; i++) {
          if (life[i] <= 0) { aL[i * 2] = 0; continue; }
          life[i] -= dt;
          const dk = Math.exp(-drag[i] * dt);
          vel[i * 3] *= dk; vel[i * 3 + 2] *= dk; vel[i * 3 + 1] = vel[i * 3 + 1] * dk - grav[i] * dt;
          pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
          if (pos[i * 3 + 1] < 0.02 && grav[i] > 0) { pos[i * 3 + 1] = 0.02; vel[i * 3 + 1] *= -0.3; }
          aL[i * 2] = Math.max(0, life[i] / max[i]); aL[i * 2 + 1] += grow[i] * dt;
        }
        g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.aL.needsUpdate = true;
        m.uniforms.uPx.value = (K.R && K.R.getPixelRatio ? K.R.getPixelRatio() : 1) * (K3D.H || 720) / 720;
      },
    };
  }

  /* ---------- prize boxes ---------- */
  const boxTex = () => K3D.paint('pks-box', 128, 128, (c, w, h) => {
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ff5a9a' : '#ffd24a'; c.beginPath(); c.moveTo(i * 32 - 64, 0); c.lineTo(i * 32 - 32, 0); c.lineTo(i * 32 + 96, h); c.lineTo(i * 32 + 64, h); c.fill(); }
    c.fillStyle = '#7a2fc8'; c.fillRect(w / 2 - 9, 0, 18, h); c.fillRect(0, h / 2 - 9, w, 18);
    c.fillStyle = '#ffffff'; c.font = '900 52px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeStyle = '#2a1640'; c.lineWidth = 6; c.strokeText('?', w / 2, h / 2 + 3); c.fillText('?', w / 2, h / 2 + 3);
  });
  function boxes(K) {
    const list = [];
    TR.boxes.forEach((row, r) => row.lats.forEach((lat, i) => { const p = TR.pos(row.s, lat); list.push({ r, i, x: p[0], z: p[1], y: PW.Y(row.s), ph: r * 1.3 + i }); }));
    const bm = new T.InstancedMesh(K3D.geo('pks-boxG', () => K3D.roundBox(0.9, 0.9, 0.9, 0.3, 14)), K3D.toon('#ffffff', { map: boxTex(), emissive: '#ffffff', emissiveIntensity: 0.1 }), list.length);
    const bw = new T.InstancedMesh(K3D.geo('pks-bow', () => { const a = new T.TorusGeometry(0.17, 0.06, 6, 12).translate(-0.15, 0.55, 0), b = new T.TorusGeometry(0.17, 0.06, 6, 12).translate(0.15, 0.55, 0); const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([...a.toNonIndexed().attributes.position.array, ...b.toNonIndexed().attributes.position.array], 3)); g.computeVertexNormals(); return g; }), K3D.toon('#7a2fc8'), list.length);
    for (const im of [bm, bw]) { im.userData.live = true; im.frustumCulled = false; K3D.ink(im, '#1a1530', 0.6); K.add(im); }
    // a glow under each (a soft disc on the road)
    const glow = new T.InstancedMesh(K3D.geo('pks-glow', () => new T.PlaneGeometry(1.8, 1.8).rotateX(-Math.PI / 2)), new T.MeshBasicMaterial({ map: PARK.glowTex(), color: hot('#ffb0e0', 0.6), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }), list.length);
    glow.userData.live = true; glow.frustumCulled = false; K.add(glow);
    return { list, bm, bw, glow, sc: list.map(() => 1) };
  }
  const m4 = new T.Matrix4(), q4 = new T.Quaternion(), e3 = new T.Euler(), v3 = new T.Vector3(), s3 = new T.Vector3();
  function poseBoxes(sc, st, dt) {
    const B = sc.boxes, t = sc.t;
    B.list.forEach((b, j) => {
      const gone = st.boxes && st.boxes[b.r][b.i] > 0;
      B.sc[j] += ((gone ? 0 : 1) - B.sc[j]) * Math.min(1, dt * (gone ? 20 : 5));
      const s = Math.max(0.001, B.sc[j]);
      e3.set(0.25, t * 1.4 + b.ph, 0.15); q4.setFromEuler(e3);
      m4.compose(v3.set(b.x, b.y + 0.75 + Math.sin(t * 2.6 + b.ph) * 0.12, b.z), q4, s3.set(s, s, s));
      B.bm.setMatrixAt(j, m4); B.bw.setMatrixAt(j, m4);
      m4.compose(v3.set(b.x, b.y + 0.04, b.z), q4.identity(), s3.set(s, 1, s)); B.glow.setMatrixAt(j, m4);
    });
    B.bm.instanceMatrix.needsUpdate = B.bw.instanceMatrix.needsUpdate = B.glow.instanceMatrix.needsUpdate = true;
  }

  /* ---------- the prizes out on the road ---------- */
  function teddy(K) {
    // an enormous plush bear sitting in the road (it waves)
    const g = new T.Group(), fur = K3D.toon('#c8905a'), pale = K3D.toon('#f2d8b0'), ink = { inkW: 1 };
    const body = K3D.mesh(K3D.geo('pks-tBody', () => new T.SphereGeometry(1.0, 18, 14).scale(1, 1.05, 0.9)), fur, ink); body.position.y = 1.0; g.add(body);
    const belly = K3D.mesh(K3D.geo('pks-tBelly', () => new T.SphereGeometry(0.62, 16, 12).scale(1, 1.1, 0.5)), pale, { ink: false }); belly.position.set(0, 0.95, 0.62); g.add(belly);
    const head = K3D.mesh(K3D.geo('pks-tHead', () => new T.SphereGeometry(0.72, 18, 14)), fur, ink); head.position.y = 2.35; g.add(head);
    const snout = K3D.mesh(K3D.geo('pks-tSnout', () => new T.SphereGeometry(0.3, 12, 10).scale(1, 0.8, 0.8)), pale, { inkW: 0.6 }); snout.position.set(0, 2.2, 0.62); g.add(snout);
    const nose = K3D.mesh(K3D.geo('pks-tNose', () => new T.SphereGeometry(0.1, 10, 8)), K3D.toon('#2a1a1a'), { ink: false }); nose.position.set(0, 2.3, 0.86); g.add(nose);
    for (const sx of [-1, 1]) {
      const ear = K3D.mesh(K3D.geo('pks-tEar', () => new T.SphereGeometry(0.26, 12, 10).scale(1, 1, 0.6)), fur, { inkW: 0.7 }); ear.position.set(sx * 0.55, 2.9, 0); g.add(ear);
      const eye = K3D.mesh(K3D.geo('pks-tEye', () => new T.SphereGeometry(0.09, 10, 8)), K3D.toon('#1a1020'), { ink: false }); eye.position.set(sx * 0.26, 2.5, 0.64); g.add(eye);
      const leg = K3D.mesh(K3D.geo('pks-tLeg', () => new T.SphereGeometry(0.38, 12, 10).scale(1, 0.8, 1.3)), fur, { inkW: 0.7 }); leg.position.set(sx * 0.55, 0.32, 0.6); g.add(leg);
    }
    const armL = new T.Group(); armL.position.set(-0.85, 1.55, 0.1); g.add(armL);
    armL.add(Object.assign(K3D.mesh(K3D.geo('pks-tArm', () => new T.SphereGeometry(0.26, 12, 10).scale(1, 2.0, 1).translate(0, -0.4, 0)), fur, { inkW: 0.7 }), {}));
    const armR = armL.clone(); armR.position.x = 0.85; g.add(armR);
    const bow = K3D.mesh(K3D.geo('pks-tBow', () => new T.TorusGeometry(0.2, 0.07, 6, 12).scale(1.6, 1, 1)), K3D.toon('#ff5a9a'), { inkW: 0.5 }); bow.position.set(0, 1.85, 0.6); g.add(bow);
    g.userData.live = true; g.visible = false; K.add(g);
    const blob = K3D.blob(null, 1.3); blob.visible = false; K.add(blob);
    return { g, armL, armR, blob };
  }
  function flossCloud(K) {
    const g = new T.Group(), m = K3D.toon('#ffb0de', { emissive: '#ff7ac8', emissiveIntensity: 0.35 });
    for (let i = 0; i < 9; i++) { const p = K3D.mesh(K3D.geo('pks-fl', () => new T.SphereGeometry(0.6, 12, 10)), m, { inkW: 0.5 }); const a = i / 9 * Math.PI * 2; p.position.set(Math.cos(a) * 0.9, 0.7 + (i % 3) * 0.35, Math.sin(a) * 0.9); p.scale.setScalar(0.8 + (i % 4) * 0.2); g.add(p); }
    const top = K3D.mesh(K3D.geo('pks-fl', () => new T.SphereGeometry(0.6, 12, 10)), m, { inkW: 0.5 }); top.position.y = 1.4; top.scale.setScalar(1.3); g.add(top);
    g.userData.live = true; g.visible = false; K.add(g); return { g };
  }
  function balloon(K) {
    const g = new T.Group(), m = K3D.toon('#5ab8ff', { emissive: '#2a6aa0', emissiveIntensity: 0.3 });
    const b = K3D.mesh(K3D.geo('pks-bal', () => new T.SphereGeometry(0.4, 14, 10).scale(1, 1.15, 1)), m, { inkW: 0.6 }); g.add(b);
    const knot = K3D.mesh(K3D.geo('pks-knot', () => new T.ConeGeometry(0.08, 0.14, 8).translate(0, -0.5, 0)), m, { ink: false }); g.add(knot);
    const shine = new T.Mesh(K3D.geo('pks-shine', () => new T.SphereGeometry(0.08, 8, 6)), K3D.flat('#ffffff')); shine.position.set(-0.14, 0.18, 0.3); g.add(shine);
    g.userData.live = true; g.visible = false; K.add(g); return { g, b };
  }
  function rocket(K) {
    const g = new T.Group();
    const body = K3D.mesh(K3D.geo('pks-rk', () => new T.CylinderGeometry(0.16, 0.16, 0.9, 10).rotateX(Math.PI / 2)), K3D.toon('#ffffff', { map: PARK.stripes('#e0403a', '#f4f0e8', 6) }), { inkW: 0.6 }); g.add(body);
    const nose = K3D.mesh(K3D.geo('pks-rkN', () => new T.ConeGeometry(0.16, 0.4, 10).rotateX(Math.PI / 2).translate(0, 0, 0.65)), K3D.toon('#ffd24a'), { inkW: 0.5 }); g.add(nose);
    const stick = K3D.mesh(K3D.geo('pks-rkS', () => new T.CylinderGeometry(0.03, 0.03, 1.4, 5).rotateX(Math.PI / 2).translate(0.18, 0, -0.6)), K3D.toon('#b88a4a'), { ink: false }); g.add(stick);
    g.userData.live = true; g.visible = false; K.add(g); return { g };
  }

  /* ---------- the wind-up crane's hook (it comes down out of the sky for a kart) ---------- */
  function hook(K) {
    const g = new T.Group();
    const cable = new T.Mesh(K3D.geo('pks-cable', () => new T.CylinderGeometry(0.04, 0.04, 1, 6).translate(0, 0.5, 0)), K3D.toon('#2a2438')); g.add(cable);
    const hk = K3D.mesh(K3D.geo('pks-hook', () => new T.TorusGeometry(0.35, 0.09, 8, 16, Math.PI * 1.4)), K3D.toon('#ffd24a'), { inkW: 0.6 }); hk.rotation.z = -Math.PI * 0.2; g.add(hk);
    const block = K3D.mesh(K3D.geo('pks-hblock', () => K3D.roundBox(0.5, 0.6, 0.35, 0.4, 12)), K3D.toon('#e0403a'), { inkW: 0.6 }); block.position.y = 0.6; g.add(block);
    // the jib far above: a little tin crane arm with a key turning
    const jib = new T.Group(); g.add(jib);
    const arm = K3D.mesh(new T.BoxGeometry(0.6, 0.6, 6), K3D.toon('#ffd24a'), { inkW: 0.8 }); arm.position.z = -2.4; jib.add(arm);
    const key = K3D.mesh(K3D.geo('pk-robKey', () => new T.TorusGeometry(0.16, 0.05, 8, 16)), K3D.toon('#f2c14e'), { inkW: 0.5 }); key.scale.setScalar(3); key.position.set(0.6, 0, -4.6); jib.add(key);
    const lamp = new T.Mesh(new T.SphereGeometry(0.16, 8, 6), K3D.flat(hot('#ff8a3a', 3))); lamp.position.set(0, -0.4, 0); jib.add(lamp);
    g.userData.live = true; g.visible = false; K.add(g);
    return { g, cable, jib, key, lamp };
  }

  /* ---------- skid marks: a ring of thin dark quads laid behind drifting tyres ---------- */
  function skids(K, n = 900) {
    const im = new T.InstancedMesh(K3D.geo('pks-skid', () => new T.PlaneGeometry(0.22, 0.6).rotateX(-Math.PI / 2)), new T.MeshBasicMaterial({ color: '#0e0b18', transparent: true, opacity: 0.55, depthWrite: false }), n);
    im.material.polygonOffset = true; im.material.polygonOffsetFactor = -4; im.material.polygonOffsetUnits = -4;
    im.userData.live = true; im.frustumCulled = false; im.count = 0; im.renderOrder = 1; K.add(im);
    let head = 0;
    return { im, add(x, y, z, yaw) { m4.compose(v3.set(x, y + 0.045, z), q4.setFromAxisAngle(new T.Vector3(0, 1, 0), yaw), s3.set(1, 1, 1)); im.setMatrixAt(head, m4); head = (head + 1) % n; im.count = Math.min(n, im.count + 1); im.instanceMatrix.needsUpdate = true; } };
  }

  /* ---------- build ---------- */
  function build(K, st) {
    PW = PARKKARTS_WORLD.build(K);
    const sc = { K, t: 0, seen: 0 };
    sc.karts = [KK3.build(K, 0), KK3.build(K, 1)];
    sc.robots = (st.robots || []).map((r, i) => KK3.robot(K, i));
    sc.boxes = boxes(K);
    sc.teddies = [teddy(K), teddy(K)];
    sc.floss = [flossCloud(K), flossCloud(K), flossCloud(K)];
    sc.balloons = [0, 1, 2, 3, 4, 5].map(() => balloon(K));
    sc.rockets = [rocket(K), rocket(K)];
    sc.hooks = [hook(K), hook(K)];
    sc.spark = particles(K, 2400, true);
    sc.soft = particles(K, 1600, false);
    sc.skid = skids(K);
    sc.slip = [0, 1].map(() => { const g = new T.Group(); for (let i = 0; i < 6; i++) { const l = new T.Mesh(K3D.geo('pks-slipL', () => new T.BoxGeometry(0.03, 0.03, 2.4)), K3D.flat(hot('#e8f4ff', 0.8), { transparent: true, opacity: 0.5, add: true, depthWrite: false })); const a = i / 6 * Math.PI * 2; l.position.set(Math.cos(a) * 0.9, 0.7 + Math.sin(a) * 0.55, -0.4 - (i % 2) * 0.8); g.add(l); } g.userData.live = true; g.visible = false; K.add(g); return g; });
    K3D.bake(K.root);
    K.pk = sc;
    sc.cam = K3D.cams.ride({ fov: 52, k: 4.5, kUp: 3 });
    sc.cam.snap();
    sc.yaw = null;
    return sc;
  }

  /* ---------- the camera ---------- */
  function chase(sc, st, dt) {
    const ks = st.karts, w = st.lead || 0, Lk = ks[w], Ck = ks[1 - w], LIM = PARKKARTS.S.LIMIT;
    let g = Math.max(0, Lk.prog - Ck.prog);
    const far = g > LIM, sC = far ? TR.wrap(Lk.s - LIM) : Ck.s;
    g = Math.min(g, LIM);
    const u = g / LIM;
    // the road's direction round the middle of the pair; turning at most 45 degrees a second
    const mid = TR.wrap(sC + g * 0.5 + 3), f = TR.at(mid);
    let want = Math.atan2(f.tx, f.tz);
    if (sc.yaw == null || sc.snapNext) sc.yaw = want;
    let d = Math.atan2(Math.sin(want - sc.yaw), Math.cos(want - sc.yaw));
    const mx = Math.PI / 4 * dt; sc.yaw += clamp(d, -mx, mx);
    const F = [Math.sin(sc.yaw), Math.cos(sc.yaw)];
    // the frame: the kart behind at fc of the screen's height (from the top), the one in front at fl
    const th = 25 * Math.PI / 180, tH = Math.tan(26 * Math.PI / 180);
    const fc = 0.62 + 0.24 * u, fl = 0.56 - 0.2 * u;
    const tc = Math.tan(th + Math.atan((2 * fc - 1) * tH)), tl = Math.tan(th + Math.atan((2 * fl - 1) * tH));
    let b = g * tl / (tc - tl); b = Math.max(b, 7.5 + 0.2 * g);
    let h = b * tc;
    // indoors (the funhouse): lower and closer, under the lintel of the moon's mouth
    const FH = PW.FUN, inF = sC > FH.mouth - 10 && sC < FH.door - 2 ? 1 : 0;
    sc.inF = (sc.inF || 0) + (inF - (sc.inF || 0)) * Math.min(1, dt * 2.5);
    if (sc.inF > 0.001) { b *= 1 - 0.3 * sc.inF; h = h * (1 - sc.inF) + Math.min(h * 0.7, 4.4) * sc.inF; }
    // the base: the kart behind's place on the road (the middle of the pair sideways, a little)
    const latM = (ks[0].lat + ks[1].lat) / 2 * 0.6, cs = far ? sC : Ck.s;
    const cf = TR.at(cs), cx = far ? cf.x + cf.rx * latM : Ck.x * 0.4 + (cf.x + cf.rx * latM) * 0.6, cz = far ? cf.z + cf.rz * latM : Ck.z * 0.4 + (cf.z + cf.rz * latM) * 0.6;
    const y0 = PW.Y(cs);
    const eye = [cx - F[0] * b, y0 + h + 0.6, cz - F[1] * b];
    const at = [eye[0] + F[0] * Math.cos(th) * 20, eye[1] - Math.sin(th) * 20, eye[2] + F[1] * Math.cos(th) * 20];
    // a little roll into the bend (none with reduced motion)
    const roll = RM() ? 0 : clamp(-f.turn * 2.4, -6, 6) * Math.PI / 180;
    sc.roll = (sc.roll || 0) + (roll - (sc.roll || 0)) * Math.min(1, dt * 2);
    const up = [Math.cos(sc.yaw) * Math.sin(sc.roll), Math.cos(sc.roll), -Math.sin(sc.yaw) * Math.sin(sc.roll)];
    return { eye, at, up, fov: 52 };
  }
  function shotFor(sc, st, dt) {
    if (st.phase === 'finish' || st.phase === 'done') {
      // round the winner, slowly
      const k = st.karts[Math.max(0, st.winner)], a = (sc.orbit = (sc.orbit || Math.atan2(-Math.sin(k.yaw), -Math.cos(k.yaw))) + dt * 0.35), y = PW.Y(k.s);
      return { eye: [k.x + Math.sin(a) * 8.5, y + 4.2, k.z + Math.cos(a) * 8.5], at: [k.x, y + 0.9, k.z], up: [0, 1, 0], fov: 46 };
    }
    return chase(sc, st, dt);
  }

  /* ---------- every frame ---------- */
  function update(K, st, dt) {
    const sc = K.pk; if (!sc || !st || !st.karts) return;
    sc.t += dt;
    const ks = st.karts;
    // the karts and drivers
    ks.forEach((k, i) => {
      const kt = sc.karts[i], o = { other: ks[1 - i], y: PW.Yk(k) };
      // the crane: up and away, then down (the drop eases the kart down where it was set)
      let lift = 0;
      if (k.crane) { const u = k.crane.t / (st.phase === 'crane' && k.id !== st.lead ? PARKKARTS.S.CRANE_T : PARKKARTS_KART.S.CRANE_T); lift = smooth(0.2, 0.75, u); }
      kt.dl = k.crane ? lift : Math.max(0, (kt.dl || 0) - dt * 2.2);
      o.lift = kt.dl;
      if (st.phase === 'finish' || st.phase === 'done') { if (k.id === st.winner) o.cheer = st.phaseT > 0.4; else o.sad = st.phaseT > 1.2; }
      if (st.fx.some(e => e.k === 'flag' && e.who === k.id && st.t - e.t < 1.6)) o.cheer = true;
      // the road's slope (the ramp, the funhouse floor, the slide, the pier's ramps): the kart pitches with it
      if (k.on < 0) o.slope = (PW.Y(k.s + 0.7) - PW.Y(k.s - 0.7)) / 1.4;
      // over the pier's edge into the sea: it falls, splashes, and the hook fishes it out where it went in
      let kp = k;
      if (k.crane && k.crane.why === 'sea') {
        const SEA_T = PARKKARTS_KART.S.SEA_T, u = clamp(1 + k.crane.t / SEA_T, 0, 1);
        o.y = PW.PIER.y * (1 - u * u) - 0.7 * u * u + Math.sin(sc.t * 4) * 0.08 * u;
        kp = Object.assign({}, k, { x: k.crane.x, z: k.crane.z });
        if (u >= 1 && kt.splashAt !== k.splash) { kt.splashAt = k.splash; for (let j = 0; j < 70; j++) sc.soft.add(k.crane.x, -0.3, k.crane.z, (Math.random() - 0.5) * 6, 3 + Math.random() * 6, (Math.random() - 0.5) * 6, ['#9ad8ff', '#e8f6ff', '#5ab8ff'][j % 3], 1.1, 0.2, { g: 11 }); Sfx.play('parkkartsSplash'); }
      }
      // through the ford: spray off the wheels
      if (k.on >= 0 && TR.branches[k.on].kind === 'ford' && PW.fordAt != null && Math.abs(k.bs - PW.fordAt) < 5 && k.v > 3 && Math.random() < 0.8) for (let j = 0; j < 3; j++) sc.soft.add(k.x + (Math.random() - 0.5), 0.2, k.z + (Math.random() - 0.5), (Math.random() - 0.5) * 3, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 3, j % 2 ? '#bfe4ff' : '#ffffff', 0.6, 0.12, { g: 9 });
      KK3.pose(kt, kp, st, dt, o);
      // the hook
      const hk = sc.hooks[i];
      hk.g.visible = !!k.crane || kt.dl > 0.02;
      if (hk.g.visible) {
        const top = o.y + 16, ky = o.y + kt.dl * 3.2 + 1.6, down = k.crane ? smooth(0, 0.25, k.crane.t / PARKKARTS_KART.S.CRANE_T) : 1;
        const hy = top + (ky - top) * down;
        hk.g.position.set(k.crane && k.crane.why === 'sea' ? k.crane.x : k.x, hy, k.crane && k.crane.why === 'sea' ? k.crane.z : k.z); hk.cable.scale.y = Math.max(0.1, top - hy); hk.jib.position.y = top - hy; hk.key.rotation.z += dt * 6; hk.lamp.visible = Math.floor(sc.t * 4) % 2 === 0;
      }
      effects(sc, st, k, kt, dt, o.y);
    });
    // the robots
    (st.robots || []).forEach((r, i) => { const rk = sc.robots[i]; if (!rk) return; KK3.poseRobot(rk, r, dt); rk.g.position.y += PW.Y(r.s); rk.blob.position.y = PW.Y(r.s) + 0.012; });
    poseBoxes(sc, st, dt);
    items(sc, st, dt);
    events(sc, st);
    sc.spark.step(dt); sc.soft.step(dt);
    // the start lights: red one by one on the grid, all out and green at the go; again for a rolling restart
    const G0 = PW.gantry;
    if (G0) {
      const m = G.match, count = m && m.phase === 'count' ? m.t || 0 : null;
      let red = 0, green = false;
      if (st.phase === 'grid') red = count != null ? Math.min(5, 1 + Math.floor(count * 1.8)) : Math.floor(sc.t * 0.8) % 6;
      else if (st.phase === 'roll' && st.roll) red = clamp(4 - (st.roll.n || 3), 0, 5) + 2;
      else green = st.t - (st.goT == null ? 0 : st.goT) < 3 || st.phase === 'race' && st.raceT < 3;
      for (const l of G0.lights) l.m.material.color.copy(green ? hot('#3aff6a', 3) : l.i < red ? hot('#ff2a2a', 3.2) : new T.Color('#3a1010'));
      // the marshal waves the flag
      G0.flag.rotation.z = Math.sin(sc.t * 6) * 0.7; const pa = G0.cloth.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const x = G0.clothBase[i * 3]; pa.setZ(i, Math.sin(sc.t * 10 + x * 6) * 0.08 * x); } pa.needsUpdate = true;
    }
    // the crowd turns to watch the karts (heads follow the nearer kart; a little bounce when one goes past)
    const C = PW.crowd;
    if (C) {
      const mx = (ks[0].x + ks[1].x) / 2, mz = (ks[0].z + ks[1].z) / 2;
      C.seats.forEach((s, i) => {
        const dx = mx - s.p[0], dz = mz - s.p[2], near = Math.hypot(dx, dz) < 30, yaw = near ? Math.atan2(dx, dz) : C.yaw0 + Math.PI + Math.sin(sc.t * 0.4 + s.ph) * 0.3;
        s.yaw = s.yaw == null ? yaw : s.yaw + Math.atan2(Math.sin(yaw - s.yaw), Math.cos(yaw - s.yaw)) * Math.min(1, dt * 3);
        const hop = near ? Math.abs(Math.sin(sc.t * 9 + s.ph)) * 0.18 : Math.abs(Math.sin(sc.t * 2 + s.ph)) * 0.03;
        m4.compose(v3.set(s.p[0], s.p[1] + hop, s.p[2]), q4.setFromAxisAngle(new T.Vector3(0, 1, 0), s.yaw), s3.set(s.s, s.s, s.s));
        for (const im of C.parts) im.setMatrixAt(i, m4);
      });
      for (const im of C.parts) im.instanceMatrix.needsUpdate = true;
    }
    // pit robots fuss about; ring-toss hoops swing as karts go through
    if (PW.pits) PW.pits.bots.forEach(b => { b.ph += dt; b.r.userData.key.rotation.z += dt * 5; b.r.userData.head.rotation.y = Math.sin(b.ph * 1.3) * 0.6; b.r.userData.broom.rotation.x = Math.sin(b.ph * 7) * 0.5; });
    if (PW.ringToss) for (const hp of PW.ringToss.hoops) {
      for (const k of ks) { if (k.on < 0) continue; const p = new T.Vector3(0, 0, hp.z).applyMatrix4(PW.ringToss.g.matrixWorld); if (Math.hypot(k.x - p.x, k.z - p.z) < 1.2 && Math.abs(hp.v) < 1) hp.v += k.v * 0.35; }
      hp.v += (-hp.sw * 14 - hp.v * 1.2) * dt; hp.sw += hp.v * dt; hp.piv.rotation.x = hp.sw;
    }
    if (PW.gulls) for (const k of ks) PW.gulls.scare(k.x, k.z, 6);
    if (PW.fw) PW.fw.auto(st.phase === 'finish' || st.phase === 'done');
    // the camera
    let sh;
    if (PARKKARTS_SCENE.camOverride) sh = Object.assign({ up: [0, 1, 0] }, PARKKARTS_SCENE.camOverride);
    else sh = shotFor(sc, st, dt);
    if (sc.snapNext) { sc.cam.snap(); sc.snapNext = false; }
    sc.cam.update(K, dt, null, sh);
    // the screen positions of the karts (for name tags and bubbles)
    for (const p of G.players) { const k = ks[p.id]; if (!k) continue; const q = K3D.toScreen(k.x, PW.Yk(k) + 1.9, k.z); if (q.z < 1) { p.x = q.x; p.y = q.y; } }
  }

  // a kart's own effects: drift sparks, boost flames, exhaust, skid marks, slipstream lines, popcorn, floss
  function effects(sc, st, k, kt, dt, y) {
    const g = kt.g, yaw = g.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = Math.cos(yaw), lz = -Math.sin(yaw);
    const back = (side, b) => [k.x - fx * b + lx * side, y + 0.12, k.z - fz * b + lz * side];
    kt.fxT = (kt.fxT || 0) + dt;
    const sp = sc.spark, so = sc.soft;
    // exhaust: a little puff now and then (faster with speed); black smoke and a bang for the backfire
    kt.puff = (kt.puff || 0) - dt;
    if (kt.puff <= 0 && !k.crane) { kt.puff = 0.22 - Math.min(0.15, k.v * 0.01); const e = new T.Vector3().copy(kt.exhaust).applyMatrix4(kt.body.matrixWorld); so.add(e.x, e.y, e.z, -fx * 0.8 + (Math.random() - 0.5) * 0.3, 0.6, -fz * 0.8, '#9a94b0', 0.9, 0.18, { grow: 0.5, drag: 1.5 }); }
    // drift: sparks off the back wheels (yellow, then pink once charged), skid marks, tyre smoke
    if (k.drift) {
      const col = k.spark >= 2 ? ['#ff6ad0', '#ffb0f0', '#ffffff'] : k.spark >= 1 ? ['#ffd24a', '#ffb02a', '#fff6c0'] : ['#ffeec0'];
      const n = k.spark ? 5 : 1;
      for (const side of [-0.55, 0.55]) {
        const p = back(side, 0.75);
        for (let i = 0; i < n; i++) sp.add(p[0], p[1], p[2], -fx * 3 + (Math.random() - 0.5) * 3 + lx * side * 2, 1 + Math.random() * 2.5, -fz * 3 + (Math.random() - 0.5) * 3 + lz * side * 2, col[i % col.length], 0.25 + Math.random() * 0.3, k.spark >= 2 ? 0.17 : k.spark ? 0.14 : 0.08, { g: 9, drag: 2 });
        if (Math.random() < 0.35) so.add(p[0], p[1] + 0.1, p[2], (Math.random() - 0.5) * 0.6, 0.5, (Math.random() - 0.5) * 0.6, '#d8d4e8', 0.8, 0.3, { grow: 0.9, drag: 2 });
        kt.skidD = (kt.skidD || 0) + k.v * dt;
      }
      if (kt.skidD > 0.5) { kt.skidD = 0; for (const side of [-0.55, 0.55]) { const p = back(side, 0.7); sc.skid.add(p[0], p[1] - 0.12, p[2], yaw); } }
    }
    // boost: a flame out of the exhaust and a ring of glitter (pink for a big drift boost)
    if (k.boostT > 0 || k.padT > 0) {
      const e = new T.Vector3().copy(kt.exhaust).applyMatrix4(kt.body.matrixWorld), big = k.boost === 2;
      for (let i = 0; i < 3; i++) sp.add(e.x, e.y, e.z, -fx * (5 + Math.random() * 3) + (Math.random() - 0.5), 0.4 + Math.random(), -fz * (5 + Math.random() * 3) + (Math.random() - 0.5), [big ? '#ff6ad0' : '#ffb02a', '#ffe07a', '#ffffff'][i], 0.18, 0.16, { drag: 3 });
    }
    // popcorn firing out of the back
    if (k.popT > 0 && Math.random() < 0.7) { const e = new T.Vector3().copy(kt.exhaust).applyMatrix4(kt.body.matrixWorld); so.add(e.x, e.y + 0.2, e.z, -fx * 3 + (Math.random() - 0.5) * 3, 3 + Math.random() * 2, -fz * 3 + (Math.random() - 0.5) * 3, '#fff6dc', 1.4, 0.14, { g: 9 }); }
    // wrapped in floss: pink wisps
    if (k.flossT > 0 && Math.random() < 0.6) so.add(k.x + (Math.random() - 0.5) * 1.6, y + 0.6 + Math.random(), k.z + (Math.random() - 0.5) * 1.6, 0, 0.3, 0, '#ffb0de', 0.7, 0.4, { grow: 0.6 });
    // slipstream: thin lines streaming past the kart
    const sl = sc.slip[k.id]; sl.visible = !!k.slipping;
    if (sl.visible) { sl.position.set(k.x, y, k.z); sl.rotation.y = yaw; sl.children.forEach((l, i) => { l.position.z = -1.6 + ((sc.t * 9 + i * 0.37) % 1) * 3.2; }); }
    // a wall: a puff of rubber dust
    if (k.wallHit && k.wallHit !== kt.lastWallFx) { kt.lastWallFx = k.wallHit; for (let i = 0; i < 6; i++) so.add(k.x + (Math.random() - 0.5), y + 0.4, k.z + (Math.random() - 0.5), (Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2, '#7a7090', 0.7, 0.35, { grow: 0.6, drag: 2 }); }
  }

  // the things out on the road, drawn from the rules' list (pools of each kind)
  function items(sc, st, dt) {
    const used = { teddy: 0, floss: 0, balloon: 0, rocket: 0 };
    for (const it of st.items || []) {
      const p = TR.pos(it.s, it.lat), y = PW.Y(it.s);
      if (it.kind === 'teddy') {
        const td = sc.teddies[used.teddy++]; if (!td) continue;
        td.g.visible = td.blob.visible = true;
        const f = TR.at(it.s), pop = Math.min(1, it.t * 4), sq = 1 + Math.sin(Math.min(1, it.t * 3) * Math.PI) * 0.15;
        td.g.position.set(p[0], y, p[1]); td.g.rotation.y = Math.atan2(-f.tx, -f.tz); td.g.scale.set(pop * sq, pop / sq, pop * sq);
        td.armR.rotation.z = 2.4 + Math.sin(sc.t * 5) * 0.4; td.armL.rotation.z = -0.3;
        K3D.placeBlob(td.blob, p[0], y, p[1], 0);
      } else if (it.kind === 'floss') {
        const fl = sc.floss[used.floss++]; if (!fl) continue;
        fl.g.visible = true; fl.g.position.set(p[0], y, p[1]); const k = Math.min(1, it.t * 3) * Math.min(1, (it.life - it.t) * 2); fl.g.scale.setScalar(0.3 + 0.7 * k); fl.g.rotation.y = sc.t * 0.3;
      } else if (it.kind === 'balloon') {
        const b = sc.balloons[used.balloon++]; if (!b) continue;
        b.g.visible = true; const hop = Math.abs(Math.sin(it.t * 7)) * 0.9; b.g.position.set(p[0], y + 0.45 + hop, p[1]); b.b.scale.set(1 + (hop < 0.1 ? 0.2 : 0), 1 - (hop < 0.1 ? 0.2 : 0), 1);
      } else if (it.kind === 'rocket') {
        const r = sc.rockets[used.rocket++]; if (!r) continue;
        const f = TR.at(it.s);
        r.g.visible = true; r.g.position.set(p[0], y + 1.4 + Math.sin(it.t * 9) * 0.15, p[1]); r.g.rotation.y = Math.atan2(f.tx, f.tz);
        for (let i = 0; i < 3; i++) sc.spark.add(p[0] - f.tx * 0.6, y + 1.4, p[1] - f.tz * 0.6, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, ['#ffd24a', '#ff5a7a', '#ffffff'][i], 0.45, 0.1, { drag: 2 });
      }
    }
    sc.teddies.forEach((t, i) => { if (i >= used.teddy) t.g.visible = t.blob.visible = false; });
    sc.floss.forEach((t, i) => { if (i >= used.floss) t.g.visible = false; });
    sc.balloons.forEach((t, i) => { if (i >= used.balloon) t.g.visible = false; });
    sc.rockets.forEach((t, i) => { if (i >= used.rocket) t.g.visible = false; });
  }

  // one-off moments from the rules' list: boxes bursting, splashes, flashes, flags, the backfire, the drop
  function events(sc, st) {
    for (const e of st.fx) {
      if (e.t <= sc.seen) continue;
      const k = e.who != null ? st.karts[e.who] : null, y = k ? PW.Y(k.s) : 0;
      if (e.k === 'box') { const row = TR.boxes[e.r], p = TR.pos(row.s, row.lats[e.i]); for (let i = 0; i < 26; i++) sc.spark.add(p[0], PW.Y(row.s) + 0.8, p[1], (Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6, ['#ff5a9a', '#ffd24a', '#7ae8ff', '#9aff8a', '#ffffff'][i % 5], 0.8, 0.09, { g: 8, drag: 1 }); }
      else if (e.k === 'pop' || (e.k === 'hit' && e.kind === 'balloon')) { const p = e.k === 'pop' ? TR.pos(e.s, e.lat) : [k.x, k.z], yy = e.k === 'pop' ? PW.Y(e.s) : y; for (let i = 0; i < 30; i++) sc.soft.add(p[0], yy + 0.7, p[1], (Math.random() - 0.5) * 5, 1 + Math.random() * 3, (Math.random() - 0.5) * 5, ['#9ad8ff', '#e8f6ff', '#5ab8ff'][i % 3], 0.7, 0.16, { g: 9 }); }
      else if (e.k === 'flash' || (e.k === 'hit' && e.kind === 'rocket')) { for (let i = 0; i < 50; i++) { const a = Math.random() * 6.28, b = Math.random() * 3.14; sc.spark.add(k.x + 1.2, y + 2.4, k.z, Math.cos(a) * Math.sin(b) * 7, Math.cos(b) * 7, Math.sin(a) * Math.sin(b) * 7, ['#ff5a7a', '#ffd24a', '#7ae8ff', '#ffffff'][i % 4], 0.9, 0.12, { g: 4, drag: 2 }); } }
      else if (e.k === 'hit' && e.kind === 'teddy') { for (let i = 0; i < 12; i++) sc.soft.add(k.x, y + 1, k.z, (Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3, '#f2d8b0', 1.0, 0.12, { g: 3, drag: 1 }); }
      else if (e.k === 'deflect') { for (let i = 0; i < 16; i++) sc.spark.add(k.x, y + 0.6, k.z, (Math.random() - 0.5) * 6, Math.random() * 2, (Math.random() - 0.5) * 6, '#ffe07a', 0.4, 0.08, { drag: 2 }); }
      else if (e.k === 'bump') { const a = st.karts[0], b = st.karts[1], x = (a.x + b.x) / 2, z = (a.z + b.z) / 2; for (let i = 0; i < 10; i++) sc.spark.add(x, PW.Y(a.s) + 0.5, z, (Math.random() - 0.5) * 5, Math.random() * 2, (Math.random() - 0.5) * 5, '#fff6c0', 0.3, 0.07, { g: 6 }); }
      else if (e.k === 'flag') { if (PW.fw) for (let i = 0; i < 3; i++) PW.fw.burst(k.x + (i - 1) * 8, y + 22 + i * 3, k.z + 10, ['#ff5a7a', '#ffd24a', '#7ae8ff'][i]); }
      else if (e.k === 'backfire') { const kt = sc.karts[e.who], ex = new T.Vector3().copy(kt.exhaust).applyMatrix4(kt.body.matrixWorld); for (let i = 0; i < 24; i++) sc.soft.add(ex.x, ex.y, ex.z, (Math.random() - 0.5) * 2, 1 + Math.random() * 2, (Math.random() - 0.5) * 2, '#2a2438', 1.6, 0.35, { grow: 1.2, drag: 1.5 }); for (let i = 0; i < 12; i++) sc.spark.add(ex.x, ex.y, ex.z, (Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4, '#ff8a3a', 0.3, 0.1, { drag: 2 }); }
      else if (e.k === 'drop') { sc.snapNext = false; for (let i = 0; i < 16; i++) sc.soft.add(k.x + (Math.random() - 0.5) * 2, y + 0.2, k.z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3, 0.5, (Math.random() - 0.5) * 3, '#a8a0c0', 0.8, 0.3, { grow: 0.8, drag: 2 }); }
      else if (e.k === 'go') st.goT = e.t;
    }
    if (st.fx.length) sc.seen = Math.max(sc.seen, st.fx[st.fx.length - 1].t);
  }

  /* ---------- flat things over the picture ---------- */
  function bubble(txt, x, y, a) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = '700 16px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(txt).width + 40, h = 34;
    x = clamp(x, w / 2 + 8, W - w / 2 - 60);
    ctx.fillStyle = 'rgba(255,246,220,0.96)'; rr(x - w / 2, y - h, w, h, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(26,21,48,0.6)'; ctx.lineWidth = 1.5; rr(x - w / 2, y - h, w, h, 12); ctx.stroke();
    ctx.fillStyle = '#5a4f86'; ctx.beginPath(); ctx.moveTo(x - w / 2 + 10, y - h / 2 - 4); ctx.lineTo(x - w / 2 + 18, y - h / 2 - 9); ctx.lineTo(x - w / 2 + 18, y - h / 2 + 5); ctx.lineTo(x - w / 2 + 10, y - h / 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a2235'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x - w / 2 + 24, y - h / 2);
    ctx.restore();
  }
  function drawTop(st) {
    const sc = K3D.K && K3D.K.pk;
    if (!sc || !st || !st.karts) return;
    // the loudspeaker's lines (top middle, under the flags)
    const say = st.says && st.says.length && st.says[st.says.length - 1];
    if (say && st.t - say.t < 3.2) bubble(say.text, W / 2, 118, Math.min(1, (3.2 - (st.t - say.t)) * 3, (st.t - say.t) * 6));
    for (const k of st.karts) {
      const q = K3D.toScreen(k.x, PW.Y(k.s) + 2.6 + (sc.karts[k.id].dl || 0) * 3.2, k.z);
      if (q.z > 1) continue;
      // the wheel of fortune spinning over a kart that drove through a box
      if (k.spinT > 0) {
        const u = 1 - k.spinT / PZ.S.SPIN, a = u * 9 + (1 - Math.pow(1 - u, 2)) * 6, r = 24;
        ctx.save(); ctx.translate(q.x, q.y - 20);
        for (let i = 0; i < 7; i++) { ctx.fillStyle = ['#ff5a7a', '#ffd24a', '#7ae8ff', '#9aff8a', '#ff9ad6', '#ffb050', '#b48aff'][i]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a + i / 7 * Math.PI * 2, a + (i + 1) / 7 * Math.PI * 2); ctx.closePath(); ctx.fill(); }
        ctx.strokeStyle = '#1a1530'; ctx.lineWidth = 2.5; circle(0, 0, r); ctx.stroke();
        ctx.fillStyle = '#fbf7ec'; circle(0, 0, 5); ctx.fill();
        ctx.fillStyle = '#1a1530'; ctx.beginPath(); ctx.moveTo(-5, -r - 6); ctx.lineTo(5, -r - 6); ctx.lineTo(0, -r + 4); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      if (k.wrongT > 0.5 && st.phase === 'race') { ctx.save(); ctx.globalAlpha = 0.7 + Math.sin(G.clock * 10) * 0.3; text('Wrong way!', q.x, q.y - 26, 18, '#ffb36a', 'center'); ctx.restore(); }
    }
  }

  // jump the camera straight to its place (a new race, the look-shot tools after setting a moment up)
  const snap = () => { const sc = K3D.K && K3D.K.pk; if (sc) { sc.snapNext = true; sc.yaw = null; } };
  return { build, update, drawTop, snap, camOverride: null };
})();
