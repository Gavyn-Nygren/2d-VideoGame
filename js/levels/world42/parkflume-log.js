/* Pip & Bo - 42-2 Log Flume Plunge: the log boat (a fat hollowed-out log with bark outside, a carved beaver's head for
   a prow with two big teeth and a lantern hanging from its mouth, a painted number, a brass grab rail, rope fenders),
   Pip and Bo in it with their paddles, and the water it throws (spray, the bow wave and the wake). Loaded on demand
   with the 3D kit.

   PARKFLUME_LOG.build(K, water) -> log = { g, hull, heroes, paddles, ... }
   PARKFLUME_LOG.pose(K, log, st, dt)   places the log on the water and poses the riders from the rules' state
       (st: the level's G.mst). Display only: nothing here changes the rules.
   PARKFLUME_LOG.place(st) -> { p, fwd, right, up, y }   where the log is in the world (also used by the camera)
   The log is modelled facing -Z with +X its right. Pip sits in FRONT and paddles on the LEFT (orange blade); Bo sits
   BEHIND and paddles on the RIGHT (blue blade), for the whole ride. */
'use strict';

const PARKFLUME_LOG = (function () {
  const T = K3D.T, INK = '#1a1530';
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const LOG = { len: 3.1, r: 0.64, axisY: 0.1, open: 4.0, seatZ: [-0.6, 0.62], seatX: 0, heroY: -0.02 };
  const PR = () => PARKFLUME_ROUTE;

  /* ---------- painted wood ---------- */
  const barkTex = () => K3D.paint('pf-bark', 256, 512, (c, w, h) => {
    c.fillStyle = '#5a3a26'; c.fillRect(0, 0, w, h);
    // deep vertical furrows and plates of bark
    for (let i = 0; i < 46; i++) { const x = Math.random() * w; c.strokeStyle = `rgba(30,16,10,${0.35 + Math.random() * 0.35})`; c.lineWidth = 2 + Math.random() * 5; c.beginPath(); c.moveTo(x, 0); for (let y = 0; y <= h; y += 32) c.lineTo(x + Math.sin(y * 0.05 + i) * 6, y); c.stroke(); }
    for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(${130 + Math.random() * 40},${90 + Math.random() * 30},${60 + Math.random() * 20},${0.25 + Math.random() * 0.3})`; c.fillRect(Math.random() * w, Math.random() * h, 4 + Math.random() * 10, 10 + Math.random() * 40); }
    // moss and a few knots
    for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(80,${110 + Math.random() * 40},60,${0.25 + Math.random() * 0.25})`; c.beginPath(); c.arc(Math.random() * w, h * (0.6 + Math.random() * 0.4), 4 + Math.random() * 10, 0, Math.PI * 2); c.fill(); }
    for (let i = 0; i < 5; i++) { const x = Math.random() * w, y = Math.random() * h; c.fillStyle = '#2a160c'; c.beginPath(); c.ellipse(x, y, 7, 11, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#7a5236'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, 11, 16, 0, 0, Math.PI * 2); c.stroke(); }
  }, { repeat: true });
  const innerTex = () => K3D.paint('pf-logInner', 256, 256, (c, w, h) => {
    c.fillStyle = '#c99a62'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 50; i++) { c.strokeStyle = `rgba(120,70,30,${0.15 + Math.random() * 0.2})`; c.lineWidth = 1 + Math.random() * 2; c.beginPath(); const y = Math.random() * h; c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + Math.random() * 10 - 5, w * 0.7, y + Math.random() * 10 - 5, w, y); c.stroke(); }
    // chisel marks
    for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(90,50,20,${0.15 + Math.random() * 0.15})`; c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 6, 2, Math.random(), 0, Math.PI * 2); c.fill(); }
  }, { repeat: true });
  const ringsTex = () => K3D.paint('pf-rings', 256, 256, (c, w, h) => {
    c.fillStyle = '#d8a86a'; c.beginPath(); c.arc(128, 128, 126, 0, Math.PI * 2); c.fill();
    for (let r = 8; r < 126; r += 6 + Math.random() * 5) { c.strokeStyle = `rgba(120,70,30,${0.35 + Math.random() * 0.3})`; c.lineWidth = 1.5 + Math.random() * 2; c.beginPath(); c.ellipse(128 + Math.random() * 3, 128 + Math.random() * 3, r, r * 0.96, 0, 0, Math.PI * 2); c.stroke(); }
    c.strokeStyle = '#4a2a16'; c.lineWidth = 10; c.beginPath(); c.arc(128, 128, 122, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(60,30,10,0.5)'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = Math.random() * 6; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.cos(a) * 110, 128 + Math.sin(a) * 110); c.stroke(); }
  });
  const plaqueTex = (n) => K3D.paint('pf-plaque|' + n, 256, 128, (c, w, h) => {
    c.fillStyle = '#2f6a4a'; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 4, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#f2c14e'; c.lineWidth = 8; c.stroke();
    c.fillStyle = '#fff4d8'; c.font = '900 64px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), w / 2 + 14, h / 2 + 4);
    // a little beaver tail mark
    c.fillStyle = '#f2c14e'; c.beginPath(); c.ellipse(52, h / 2, 16, 24, 0.3, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#2f6a4a'; c.lineWidth = 3; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(40, h / 2 + i * 10); c.lineTo(64, h / 2 + i * 10 - 4); c.stroke(); }
  });

  /* ---------- the log ---------- */
  function hull(K, num) {
    const g = new T.Group(), L = LOG.len, r = LOG.r;
    // the shell: a cylinder lying along Z with its top cut open (thetaLength `open` round the bottom)
    // (three's cylinder theta 0 is +Z, which rotateX(pi/2) turns to the bottom; turning by -open/2 centres the shell there)
    const outer = new T.CylinderGeometry(r, r, L, 36, 6, true, 0, LOG.open).rotateY(-LOG.open / 2).rotateX(Math.PI / 2);
    // swell the middle a little (a fat log) and taper the ends
    { const a = outer.attributes.position; for (let i = 0; i < a.count; i++) { const z = a.getZ(i) / (L / 2), k = 1 + 0.06 * (1 - z * z); a.setX(i, a.getX(i) * k); a.setY(i, a.getY(i) * k); } outer.computeVertexNormals(); }
    const bark = barkTex(); bark.repeat.set(2, 1);
    const shell = K3D.mesh(outer, K3D.toon('#ffffff', { map: bark }), { ink: INK, inkW: 1.2 }); shell.position.y = LOG.axisY; g.add(shell);
    const inner = new T.CylinderGeometry(r * 0.86, r * 0.86, L * 0.96, 32, 1, true, 0, LOG.open).rotateY(-LOG.open / 2).rotateX(Math.PI / 2);
    const inn = new T.Mesh(inner, K3D.toon('#ffffff', { map: innerTex(), side: T.BackSide })); inn.position.y = LOG.axisY; inn.receiveShadow = true; g.add(inn);
    // the cut edges: a pale rim along both sides (fresh wood) with the brass rail on posts above
    const halfOpen = (Math.PI * 2 - LOG.open) / 2, ry = LOG.axisY + Math.cos(halfOpen) * r * 1.02, rx = Math.sin(halfOpen) * r * 1.02;
    for (const sx of [-1, 1]) {
      const lip = K3D.mesh(new T.BoxGeometry(r * 0.2, 0.07, L * 0.98), K3D.toon('#d8b07a'), { ink: INK, inkW: 0.7 });
      lip.position.set(sx * rx * 0.94, ry - 0.01, 0); lip.rotation.z = -sx * (Math.PI / 2 - halfOpen) * 0.5; g.add(lip);
      const rail = K3D.mesh(new T.CylinderGeometry(0.035, 0.035, L * 0.72, 10).rotateX(Math.PI / 2), K3D.toon('#e8c060', { emissive: '#a07820', emissiveIntensity: 0.25 }), { ink: INK, inkW: 0.6 });
      rail.position.set(sx * rx * 0.9, ry + 0.17, 0.05); g.add(rail);
      for (const z of [-L * 0.34, 0.05, L * 0.36]) { const post = K3D.mesh(K3D.geo('pf-railPost', () => new T.CylinderGeometry(0.025, 0.03, 0.18, 8)), K3D.toon('#b8903a'), { ink: false }); post.position.set(sx * rx * 0.9, ry + 0.08, z); g.add(post); }
      // the painted number plaque on each side
      const pl = new T.Mesh(new T.PlaneGeometry(0.62, 0.31), K3D.toon('#ffffff', { map: plaqueTex(num), transparent: true, alphaTest: 0.4 }));
      pl.position.set(sx * (r * 1.05 + 0.005), LOG.axisY + 0.05, -0.15); pl.rotation.y = sx * Math.PI / 2; pl.rotation.z = 0.0; g.add(pl);
      // rope fenders: loops hanging along the waterline
      for (let i = 0; i < 4; i++) {
        const z = -L * 0.32 + i * L * 0.22;
        const loop = K3D.mesh(K3D.geo('pf-fender', () => new T.TorusGeometry(0.11, 0.035, 6, 14, Math.PI)), K3D.toon('#e8d6a8'), { ink: INK, inkW: 0.5 });
        loop.position.set(sx * (r * 1.06), LOG.axisY - 0.14, z); loop.rotation.set(0, sx * Math.PI / 2, Math.PI); g.add(loop);
        const knot = new T.Mesh(K3D.geo('pf-knot', () => new T.SphereGeometry(0.05, 8, 6)), K3D.toon('#c8b080')); knot.position.set(sx * (r * 1.06), LOG.axisY - 0.03, z - 0.11); g.add(knot);
      }
      // a rope along the side (a sag between the fenders)
      const rp = []; for (let i = 0; i <= 12; i++) { const u = i / 12, z = -L * 0.4 + u * L * 0.8; rp.push(new T.Vector3(sx * r * 1.07, LOG.axisY + 0.04 - Math.abs(Math.sin(u * Math.PI * 4)) * 0.07, z)); }
      g.add(K3D.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(rp), 48, 0.018, 5), K3D.toon('#e8d6a8'), { ink: false }));
    }
    // the stern: an end of sawn wood with its rings
    const capB = new T.Mesh(new T.CircleGeometry(r * 1.04, 36, -Math.PI / 2 - LOG.open / 2, LOG.open), K3D.toon('#ffffff', { map: ringsTex() }));
    capB.position.set(0, LOG.axisY, L / 2 + 0.001); g.add(capB);
    const capRim = K3D.mesh(new T.TorusGeometry(r * 1.03, 0.04, 6, 36, LOG.open).rotateZ(-Math.PI / 2 - LOG.open / 2), K3D.toon('#4a2a16'), { ink: false }); capRim.position.set(0, LOG.axisY, L / 2); g.add(capRim);
    // two seats across (planks)
    for (const z of LOG.seatZ) { const seat = K3D.mesh(new T.BoxGeometry(r * 1.6, 0.06, 0.36), K3D.toon('#9a6a3a', { map: PARK.wood('#9a6a3a') }), { ink: INK, inkW: 0.6 }); seat.position.set(0, LOG.axisY - 0.12, z + 0.12); g.add(seat); }
    // a coiled rope and a bailing bucket in the back
    const bucket = K3D.mesh(new T.CylinderGeometry(0.12, 0.09, 0.18, 12, 1, true), K3D.toon('#d8483a', { side: T.DoubleSide }), { ink: INK, inkW: 0.5 }); bucket.position.set(0.28, LOG.axisY - 0.25, L / 2 - 0.35); g.add(bucket);
    // the beaver's head prow
    const bv = beaver(K); bv.scale.setScalar(0.78); bv.position.set(0, LOG.axisY + 0.1, -L / 2 - 0.06); g.add(bv);
    return { g, beaver: bv };
  }
  function beaver(K) {
    const g = new T.Group(), fur = K3D.toon('#8a5634'), snout = K3D.toon('#8a5a3a'), dark = K3D.toon('#2a1a12');
    // the carved head: a big round wooden head leaning forward out of the log's end
    const head = K3D.mesh(K3D.roundBox(0.95, 0.85, 0.8, 0.85, 28), fur, { ink: INK, inkW: 1.1 }); head.position.set(0, 0.2, -0.08); g.add(head);
    const muz = K3D.mesh(K3D.roundBox(0.62, 0.42, 0.42, 0.9, 20), snout, { ink: INK, inkW: 0.9 }); muz.position.set(0, 0.05, -0.42); g.add(muz);
    const nose = K3D.mesh(new T.SphereGeometry(0.11, 14, 10).scale(1.4, 1, 1), dark, { ink: INK, inkW: 0.6 }); nose.position.set(0, 0.2, -0.62); g.add(nose);
    // the two big teeth (and the lantern's hook between them)
    for (const sx of [-1, 1]) { const t = K3D.mesh(K3D.roundBox(0.11, 0.19, 0.05, 0.4, 10), K3D.toon('#fff6e0', { emissive: '#fff6e0', emissiveIntensity: 0.12 }), { ink: INK, inkW: 0.6 }); t.position.set(sx * 0.06, -0.21, -0.6); g.add(t); }
    // eyes (painted, glossy) and ears
    for (const sx of [-1, 1]) {
      const e = new T.Mesh(new T.SphereGeometry(0.095, 14, 10), K3D.flat('#fff8ec')); e.scale.z = 0.5; e.position.set(sx * 0.23, 0.38, -0.44); g.add(e);
      const pu = new T.Mesh(new T.SphereGeometry(0.055, 12, 8), K3D.flat('#1a1210')); pu.scale.z = 0.5; pu.position.set(sx * 0.23, 0.37, -0.485); g.add(pu);
      const gl = new T.Mesh(new T.SphereGeometry(0.018, 6, 4), K3D.flat('#ffffff')); gl.position.set(sx * 0.23 - 0.02, 0.4, -0.51); g.add(gl);
      const ear = K3D.mesh(new T.SphereGeometry(0.12, 12, 8).scale(1, 1, 0.6), fur, { ink: INK, inkW: 0.7 }); ear.position.set(sx * 0.4, 0.62, -0.05); g.add(ear);
      // whiskers
      for (let k = 0; k < 2; k++) { const w = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 0.32, 3).rotateZ(Math.PI / 2 + sx * (0.15 + k * 0.18)), K3D.flat('#f4e8d0')); w.position.set(sx * 0.42, 0.08 - k * 0.05, -0.55); g.add(w); }
    }
    // a carved brow so the face reads cheeky
    for (const sx of [-1, 1]) { const b = K3D.mesh(new T.BoxGeometry(0.18, 0.04, 0.06), dark, { ink: false }); b.position.set(sx * 0.23, 0.52, -0.46); b.rotation.z = sx * 0.25; g.add(b); }
    // the lantern hanging from its mouth on a short chain
    const lant = new T.Group(); lant.position.set(0, -0.3, -0.72); g.add(lant);
    const chain = new T.Mesh(new T.CylinderGeometry(0.01, 0.01, 0.16, 4), K3D.toon('#3a2f3f')); chain.position.y = -0.08; lant.add(chain);
    const body = new T.Group(); body.position.y = -0.27; lant.add(body);
    const cage = K3D.mesh(new T.CylinderGeometry(0.1, 0.1, 0.2, 6, 1, true), K3D.toon('#2a2438', { side: T.DoubleSide }), { ink: INK, inkW: 0.5 }); body.add(cage);
    const glow = new T.Mesh(new T.CylinderGeometry(0.085, 0.085, 0.17, 6), K3D.flat(hot('#ffd890', 2.6))); body.add(glow);
    const cap = K3D.mesh(new T.ConeGeometry(0.13, 0.1, 6), K3D.toon('#2a2438'), { ink: INK, inkW: 0.5 }); cap.position.y = 0.15; body.add(cap);
    const base = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.03, 6), K3D.toon('#2a2438')); base.position.y = -0.11; body.add(base);
    g.userData = { lant, glow, head };
    g.rotation.x = -0.12;
    return g;
  }

  /* ---------- the paddles ---------- */
  function paddle(id) {
    const g = new T.Group(); // the grip at the origin, the shaft along -Y to the blade
    const shaft = K3D.mesh(new T.CylinderGeometry(0.028, 0.032, 1.05, 8).translate(0, -0.52, 0), K3D.toon('#d8b07a'), { ink: INK, inkW: 0.5 }); g.add(shaft);
    const tgrip = K3D.mesh(new T.CylinderGeometry(0.03, 0.03, 0.18, 8).rotateZ(Math.PI / 2), K3D.toon('#d8b07a'), { ink: INK, inkW: 0.5 }); g.add(tgrip);
    const blade = K3D.mesh(K3D.roundBox(0.24, 0.42, 0.04, 0.9, 16), K3D.toon(id ? '#3d8ef0' : '#ff8a2a', { emissive: id ? '#3d8ef0' : '#ff8a2a', emissiveIntensity: 0.25 }), { ink: INK, inkW: 0.6 });
    blade.position.y = -1.12; g.add(blade);
    const band = new T.Mesh(new T.CylinderGeometry(0.036, 0.036, 0.06, 8), K3D.toon('#f4f0e8')); band.position.y = -0.86; g.add(band);
    g.userData = { blade };
    return g;
  }

  /* ---------- spray, the wake ---------- */
  function sprayPool(K) {
    const N = 900, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N), size = new Float32Array(N);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aL', new T.BufferAttribute(life, 1)); g.setAttribute('aS', new T.BufferAttribute(size, 1));
    const m = new T.ShaderMaterial({ uniforms: { uPx: { value: 1 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'attribute float aL, aS; uniform float uPx; varying float vL; void main() { vL = aL; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.5, 90.0 * aS * uPx / -mv.z) * (0.5 + aL * 0.6); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vL; void main() { if (vL <= 0.0) discard; vec2 q = gl_PointCoord - 0.5; float d = length(q); float a = smoothstep(0.5, 0.15, d) * min(1.0, vL * 2.0); gl_FragColor = vec4(vec3(0.75, 0.88, 1.0) * a * 1.15, 1.0); }' });
    const pts = new T.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 4; K.add(pts);
    return { pts, pos, vel, life, size, n: N, head: 0, mat: m,
      emit(p, v, n, spread, up, sz = 1) {
        for (let i = 0; i < n; i++) {
          const k = this.head = (this.head + 1) % this.n;
          this.pos[k * 3] = p.x + (Math.random() - 0.5) * 0.2; this.pos[k * 3 + 1] = p.y; this.pos[k * 3 + 2] = p.z + (Math.random() - 0.5) * 0.2;
          this.vel[k * 3] = v.x + (Math.random() - 0.5) * spread; this.vel[k * 3 + 1] = up * (0.5 + Math.random() * 0.8); this.vel[k * 3 + 2] = v.z + (Math.random() - 0.5) * spread;
          this.life[k] = 0.5 + Math.random() * 0.5; this.size[k] = sz * (0.6 + Math.random() * 0.8);
        }
      },
      tick(dt) {
        for (let k = 0; k < this.n; k++) { if (this.life[k] <= 0) continue; this.vel[k * 3 + 1] -= 9 * dt; this.pos[k * 3] += this.vel[k * 3] * dt; this.pos[k * 3 + 1] += this.vel[k * 3 + 1] * dt; this.pos[k * 3 + 2] += this.vel[k * 3 + 2] * dt; this.life[k] -= dt * 1.4; }
        g.attributes.position.needsUpdate = true; g.attributes.aL.needsUpdate = true; g.attributes.aS.needsUpdate = true;
      } };
  }
  // the wake: three foam strips (the bow wave's two arms spreading to the banks, the trail behind the stern)
  function wake(K) {
    const N = 64, strips = 3, pos = new Float32Array(strips * N * 2 * 3), aA = new Float32Array(strips * N * 2), idx = [];
    for (let s = 0; s < strips; s++) for (let i = 0; i < N - 1; i++) { const a = (s * N + i) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aA', new T.BufferAttribute(aA, 1)); g.setIndex(idx);
    const uv = new Float32Array(strips * N * 2 * 2); for (let s = 0; s < strips; s++) for (let i = 0; i < N; i++) { const a = (s * N + i) * 2; uv[a * 2] = 0; uv[a * 2 + 1] = i / 8; uv[a * 2 + 2] = 1; uv[a * 2 + 3] = i / 8; }
    g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    const u = { uTex: { value: PARK.foamTex() }, uWhite: { value: 0 }, uT: { value: 0 } };
    const m = new T.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, side: T.DoubleSide,
      vertexShader: 'attribute float aA; varying float vA; varying vec2 vUv; void main() { vA = aA; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D uTex; uniform float uWhite, uT; varying float vA; varying vec2 vUv; void main() { float f = texture2D(uTex, vec2(vUv.x * 0.6, vUv.y * 0.5 - uT * 0.1)).a; float e = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x); float a = vA * e * (0.35 + f * 0.9); gl_FragColor = vec4(mix(vec3(0.7, 0.85, 1.0), vec3(1.0), uWhite) * 1.05, a * (0.55 + uWhite * 0.4)); }' });
    const mesh = new T.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 3; K.add(mesh);
    return { mesh, pos, aA, g, u, N, hist: [], acc: 0 };
  }

  /* ---------- build ---------- */
  function build(K) {
    const g = new T.Group(); K.add(g); g.userData.live = true;
    const hl = hull(K, 12);
    const rock = new T.Group(); g.add(rock); rock.add(hl.g);
    const heroes = [], seats = [], pads = [];
    for (const id of [0, 1]) {
      const seat = new T.Group(); seat.position.set(0, LOG.heroY, LOG.seatZ[id]); rock.add(seat);
      const h = K3D.hero(id); seat.add(h);
      K3D.dress(h, 'parkflume');
      const m = h.userData.body.material; m.emissive = new T.Color(PCOL[id]); m.emissiveIntensity = 0.2;
      h.userData.dry = m.color.clone(); h.userData.wetC = m.color.clone().multiplyScalar(0.72);
      // a mouth: a grin, an O on drops and soaks; a little splutter of water on a Soak
      const BW = K3D.HERO.w, BH = K3D.HERO.h, BD = K3D.HERO.d, my = BH * 0.6 - 0.15;
      const mz = K3D.roundBoxFront(BW, BH, BD, 0.6, 0, my);
      const grin = new T.Mesh(new T.CircleGeometry(0.075, 16, Math.PI, Math.PI), K3D.flat('#3a1a28')); grin.position.set(0, my + 0.03, mz + 0.004); h.userData.face.add(grin);
      const oh = new T.Mesh(new T.CircleGeometry(0.04, 14), K3D.flat('#3a1a28')); oh.position.set(0, my, mz + 0.004); oh.scale.y = 1.3; h.userData.face.add(oh);
      h.userData.extra = { grin, oh };
      const pd = paddle(id); rock.add(pd);
      heroes.push(h); seats.push(seat); pads.push(pd);
    }
    // the beaver's lantern lights the riders and the log (the one moving real light)
    const light = new T.PointLight('#ffcf8a', 2.6, 9, 1.5); light.position.set(0, 1.1, -LOG.len / 2 - 0.6); rock.add(light);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: PARK.glowTex(), color: hot('#ffcf8a', 0.5), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
    halo.scale.set(1.6, 1.6, 1); hl.beaver.userData.lant.children[1].add(halo);
    // a few bulbs along the rails (the park's look)
    const bl = PARK.bulbs(K, 40); rock.add(bl.mesh);
    for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) bl.add(sx * 0.55, 0.62, -1.05 + i * 0.36, i % 2 ? '#ff8ab0' : '#ffe07a', { size: 0.035, speed: 3, phase: i * 0.8 + (sx > 0 ? 2 : 0) });
    bl.done();
    const log = { g, rock, hull: hl, beaver: hl.beaver, heroes, seats, pads, light, halo, bulbs: bl, spray: sprayPool(K), wake: wake(K), t: 0, scr: [null, null], prev: null };
    return log;
  }

  /* ---------- where the log is ---------- */
  const v = (a) => new T.Vector3(a[0], a[1], a[2]);
  function place(st, o = {}) {
    const R = PR().R, f = R.at(st.s), c = Math.cos(st.psi), s = Math.sin(st.psi);
    const t = v(f.t), r = v(f.r);
    const fwd = t.clone().multiplyScalar(c).addScaledVector(r, s).normalize();
    const right = r.clone().multiplyScalar(c).addScaledVector(t, -s).normalize();
    const up = new T.Vector3().crossVectors(right, fwd).normalize();
    const p = v(R.local(st.s, st.x, 0, f));
    return { p, fwd, right, up, f };
  }

  const m4 = new T.Matrix4(), q = new T.Quaternion(), tmp = new T.Vector3(), tmp2 = new T.Vector3();
  function pose(K, log, st, dt) {
    log.t += dt;
    const t = log.t, pl = place(st), f = pl.f;
    // the pose: on the water, rocking on the ripples, wallowing after a Soak, sinking, nosing up off a lip
    let sink = 0;
    if (st.phase === 'sink') sink = Math.min(1, st.phaseT / PARKFLUME.S.SINK) * 0.9;
    const wallow = st.safe > 0 && st.phase === 'ride' ? Math.max(0, st.safe - 0.5) / 1.0 : 0;
    // IT FLOATS: the log rides the water under it. The water's height is read under the bow, the stern and both
    // sides; the log is pulled toward that level and those slopes like a weight on springs (heave, pitch, roll), so it
    // lifts to a wave, overshoots and settles; it lands heavy off a drop (digs in, bobs back up); it squats at the
    // stern and lifts its nose when a stroke drives it, dips it on a brake; water aboard makes it sit lower and
    // answer slower.
    const Wv = K.pf && K.pf.water, B = log.buoy || (log.buoy = { y: 0, vy: 0, p: 0, vp: 0, r: 0, vr: 0, u: st.u, acc: 0, air: 0, peak: 0 });
    const hw = (lx, lz) => (Wv ? Wv.hAt(st.s - lz, pl.p.x + pl.right.x * lx - pl.fwd.x * lz, pl.p.z + pl.right.z * lx - pl.fwd.z * lz) : 0);
    const hB = hw(0, -LOG.len * 0.45), hS = hw(0, LOG.len * 0.45), hL = hw(-LOG.r * 0.9, 0), hR = hw(LOG.r * 0.9, 0);
    const h = Math.min(dt, 0.033), heavy = 1 + 0.14 * st.water, flying = st.air > 0;
    const a = Math.max(-8, Math.min(8, (st.u - B.u) / Math.max(1e-3, dt))); B.u = st.u; B.acc += (a - B.acc) * Math.min(1, dt * 7);
    if (flying) B.peak = Math.max(B.peak, st.air);
    else if (B.air > 0) { B.vy -= 0.9 + 2.4 * Math.min(1, B.peak / 0.7); B.vp += 1.2 * Math.min(1, B.peak / 0.7); B.peak = 0; } // (touchdown)
    B.air = st.air;
    const wantY = flying ? 0 : (hB + hS + hL + hR) / 4 - 0.03 * st.water;
    const wantP = flying ? 0 : Math.atan2(hB - hS, LOG.len * 0.9) * 1.5 + B.acc * 0.03;
    const wantR = flying ? 0 : Math.atan2(hR - hL, LOG.r * 1.8) * 1.4;
    B.vy += ((wantY - B.y) * 55 / heavy - B.vy * 5.5) * h; B.y = Math.max(-0.45, Math.min(0.3, B.y + B.vy * h));
    B.vp += ((wantP - B.p) * 42 / heavy - B.vp * 5) * h; B.p = Math.max(-0.3, Math.min(0.3, B.p + B.vp * h));
    B.vr += ((wantR - B.r) * 48 / heavy - B.vr * 4.5) * h; B.r = Math.max(-0.3, Math.min(0.3, B.r + B.vr * h));
    const roll = B.r + wallow * Math.sin(t * 9) * 0.08 + st.om * -0.05 + (st.drag[0] ? -0.04 : 0) + (st.drag[1] ? 0.04 : 0);
    const nose = B.p - st.air * 0.25 + (st.splash > 0.5 ? (st.splash - 0.5) * 0.3 : 0);
    m4.makeBasis(pl.right, pl.up, pl.fwd.clone().negate());
    log.g.quaternion.setFromRotationMatrix(m4);
    log.g.position.copy(pl.p).addScaledVector(pl.up, B.y - sink + st.air * 0.9 - wallow * 0.08);
    log.rock.rotation.set(nose, 0, roll);
    log.rock.visible = !(st.phase === 'sink' && st.phaseT > PARKFLUME.S.SINK + 0.2);
    log.g.updateMatrixWorld(true);
    // the lantern swings with the rocking; it glows brighter with Speed
    const lant = log.beaver.userData.lant;
    lant.rotation.x = Math.sin(t * 2.2) * 0.06 - nose * 1.5 - B.vp * 0.25 + st.u * 0.03; lant.rotation.z = Math.sin(t * 1.7) * 0.05 - roll - B.vr * 0.25;
    const glowK = 2.2 + st.speed * 2.4;
    log.beaver.userData.glow.material.color.setRGB(1.0 * glowK, 0.85 * glowK, 0.56 * glowK);
    log.light.intensity = 2.2 + st.speed * 1.4 + Math.sin(t * 7) * 0.12;
    log.halo.material.color.copy(hot('#ffcf8a', 0.35 + st.speed * 0.4));
    log.bulbs.u.uT.value += dt * (1 + st.speed * 3);
    const wl = log.g.localToWorld.bind(log.g);
    const wp = (x, y, z) => log.rock.localToWorld(new T.Vector3(x, y, z));

    // the riders and their paddles
    const S = PARKFLUME.S;
    log.heroes.forEach((h, k) => {
      const seat = log.seats[k], pd = log.pads[k], side = k === 0 ? -1 : 1, ex = h.userData.extra;
      const pull = st.pull[k] >= 0 ? st.pull[k] / S.PULL : -1, drag = st.phase === 'ride' && st.drag[k], brace = st.phase === 'ride' && st.brace[k];
      // the body: digs in on a stroke (leans forward then back toward its side), leans out on a drag, hunches when
      // braced, bounces up off its seat on a drop taken unbraced, shakes water off after a Soak
      const sd = seat.userData;
      const wantLean = pull >= 0 ? Math.sin(pull * Math.PI) * 0.35 : drag ? 0.3 : 0;
      const wantFwd = pull >= 0 ? (pull < 0.3 ? 0.35 * pull / 0.3 : 0.35 - (pull - 0.3) / 0.7 * 0.6) : brace ? 0.45 : 0;
      sd.lean = (sd.lean || 0) + (wantLean - (sd.lean || 0)) * Math.min(1, dt * 14);
      sd.fwd = (sd.fwd || 0) + (wantFwd - (sd.fwd || 0)) * Math.min(1, dt * 14);
      sd.hunch = (sd.hunch || 0) + ((brace ? 1 : 0) - (sd.hunch || 0)) * Math.min(1, dt * 12);
      const bounce = st.oneBrace[k] > 0 ? Math.sin((1 - st.oneBrace[k]) * Math.PI) * 0.6 : 0;
      let boardY = 0, boardX = 0;
      if (st.phase === 'board') { const u = Math.min(1, Math.max(0, (st.phaseT - 0.4 - k * 0.6) / 0.9)); boardY = Math.sin(u * Math.PI) * 0.8 * (u < 1 ? 1 : 0); boardX = (1 - u) * 2.4; }
      const shake = st.safe > 0.6 && st.phase === 'ride' && st.fx.length && st.fx[st.fx.length - 1].k === 'soak' ? Math.sin(t * 40) * 0.12 * (st.safe - 0.6) : 0;
      seat.position.set(side * sd.lean * 0.22 + boardX, LOG.heroY - sd.hunch * 0.12 + bounce + boardY, LOG.seatZ[k]);
      seat.rotation.set(-sd.fwd, shake, side * sd.lean * 0.6);
      seat.scale.set(1, 1 - sd.hunch * 0.12, 1);
      // the paddle: resting across the rim, a pull from forward to back in the water on its side, held in for a drag,
      // tucked across the lap when braced; the riders' hands hold its shaft
      const sx = side, z0 = LOG.seatZ[k];
      let grip, tip;
      if (brace || st.phase !== 'ride') {
        grip = new T.Vector3(sx * -0.05, 0.42, z0 - 0.25); tip = new T.Vector3(sx * 0.62, 0.32, z0 - 0.15);
      } else if (pull >= 0) {
        const u = pull, zz = z0 - 0.95 + u * 1.45, dip = Math.sin(Math.min(1, u * 1.25) * Math.PI);
        grip = new T.Vector3(sx * (0.15 + dip * 0.1), 0.95 - dip * 0.25, z0 - 0.25 + u * 0.35);
        tip = new T.Vector3(sx * (0.95 + dip * 0.1), 0.2 - dip * 0.55, zz);
      } else if (drag) {
        grip = new T.Vector3(sx * 0.32, 0.9, z0 - 0.05); tip = new T.Vector3(sx * 1.05, -0.38, z0 + 0.5);
      } else {
        const sw = Math.sin(t * 1.3 + k) * 0.05;
        grip = new T.Vector3(sx * 0.12, 0.72, z0 - 0.35); tip = new T.Vector3(sx * 1.0, 0.42 + sw, z0 + 0.15);
      }
      grip.y += seat.position.y - LOG.heroY; tip.y += seat.position.y - LOG.heroY;
      const pk = pd.userData;
      pk.g = pk.g ? pk.g.lerp(grip, Math.min(1, dt * 18)) : grip.clone(); pk.tip = pk.tip ? pk.tip.lerp(tip, Math.min(1, dt * 18)) : tip.clone();
      pd.position.copy(pk.g);
      const dir = tmp.copy(pk.tip).sub(pk.g).normalize();
      pd.quaternion.setFromUnitVectors(tmp2.set(0, -1, 0), dir);
      // the blade faces along the stroke (square to the log's length)
      pd.rotateY(sx * 0.1);
      // hands on the shaft (or on the rail when braced)
      const hands = brace ? [wp(-0.38, 0.62, z0 - 0.2), wp(0.38, 0.62, z0 - 0.2)] : [pd.localToWorld(new T.Vector3(0, -0.05, 0)), pd.localToWorld(new T.Vector3(0, -0.42, 0))];
      if (k === 1 && !brace) hands.reverse();
      K3D.heroPose(h, { x: 0, y: 0, z: 0, heading: Math.PI, speed: 0, vy: bounce > 0.05 ? 2 : 0, hands, stun: false }, dt);
      // the face: an O on drops and Soaks, a grin with Speed and on the plunge
      const scared = st.air > 0.05 || (st.safe > 0.8 && st.phase === 'ride') || st.phase === 'sink' || bounce > 0.1;
      ex.oh.visible = scared; ex.grin.visible = !scared && (st.speed > 0.4 || st.splash > 0 || st.phase === 'dock' || st.phase === 'done');
      // wet: darker, and the outfits drip
      const m = h.userData.body.material; m.color.copy(h.userData.dry).lerp(h.userData.wetC, Math.min(1, st.wet * 1.4));
      for (const o of h.userData.worn || []) {
        const w = o.userData.wind; if (!w) continue;
        if (w.kind === 'cape') { w.node.rotation.x = 0.15 + Math.sin(t * 7 + k) * 0.06 * (0.4 + st.speed) + st.air * 0.4; w.node.rotation.z = side * sd.lean * 0.3; }
        if (w.kind === 'drips') w.node.children.forEach(d => { const u = ((t * (0.6 + st.wet * 1.4) + d.userData.ph) % 1); d.position.y = d.userData.y0 - u * 0.5; d.visible = st.wet > 0.08 && u < 0.85; });
      }
      // spray from the blade: as it bites (the first half of the pull), and a sheet off it on a drag
      if (st.phase === 'ride' && !K3D.reduceSpray) {
        const bw = pd.localToWorld(new T.Vector3(0, -1.12, 0));
        const wy = pl.p.y;
        // (the blade's bite and a dragged blade each send a ring across the water)
        const pk2 = pd.userData; if (Wv && pull > 0.15 && !pk2.bit) Wv.ring(bw.x, bw.z, 0.035); pk2.bit = pull > 0.15;
        if (Wv && drag && t - (pk2.dragT || 0) > 0.4) { pk2.dragT = t; Wv.ring(bw.x, bw.z, 0.022); }
        if (pull >= 0 && pull > 0.15 && pull < 0.6 && bw.y < wy + 0.25) { tmp.copy(pl.right).multiplyScalar(sx * 1.2).addScaledVector(pl.fwd, -1.5); log.spray.emit(new T.Vector3(bw.x, wy + 0.05, bw.z), tmp, 3, 0.8, 2.2, 0.8); }
        if (drag && Math.random() < 0.6) { tmp.copy(pl.right).multiplyScalar(sx * 0.8).addScaledVector(pl.fwd, -0.6); log.spray.emit(new T.Vector3(bw.x, wy + 0.05, bw.z), tmp, 1, 0.5, 1.4, 0.6); }
      }
      // where the riders are on screen (name tags and bubbles)
      h.getWorldPosition(tmp); tmp.y += 1.0;
      const sp = K3D.toScreen(tmp.x, tmp.y, tmp.z);
      const p = G.players[k]; if (p && sp.z < 1) { p.x = sp.x - PW / 2; p.y = sp.y - PH; }
      log.scr[k] = sp;
    });

    // the water it throws: a V of spray on a pair, the bow wave, a wall of water on a splashdown
    const bow = wl(new T.Vector3(0, 0.0, -LOG.len / 2 - 0.4)), stern = wl(new T.Vector3(0, 0, LOG.len / 2));
    const last = st.fx.length && st.fx[st.fx.length - 1];
    if (last && last !== log.lastFx) {
      log.lastFx = last;
      if (last.k === 'pair') for (const sx of [-1, 1]) { tmp.copy(pl.right).multiplyScalar(sx * 2.2).addScaledVector(pl.fwd, 0.6); log.spray.emit(bow, tmp, 18, 0.8, 2.8, 1.1); }
      if (last.k === 'splash') { const n = last.big ? 160 : 60; for (const sx of [-1, 1]) { tmp.copy(pl.right).multiplyScalar(sx * (last.big ? 5 : 3)).addScaledVector(pl.fwd, 1); log.spray.emit(bow, tmp, n / 2, 3, last.big ? 9 : 5, last.big ? 2.4 : 1.4); } }
      if (last.k === 'soak') { tmp.set(0, 0, 0); log.spray.emit(wl(new T.Vector3(0, 0.6, 0)), tmp, 70, 4, 4.5, 1.6); }
      if (last.k === 'bump' || last.k === 'bonk') { tmp.copy(pl.right).multiplyScalar((last.side || 0) * 2); log.spray.emit(bow, tmp, 16, 2, 2, 0.9); }
    }
    // rings on the water from what just happened: a pair's surge, a splashdown, a Soak, a bump, a duck plucked out
    if (Wv) {
      if (log.fxT == null || log.fxT > st.t) log.fxT = st.t;
      const since = log.fxT; log.fxT = st.t;
      for (const e of st.fx) {
        if (e.t <= since) continue;
        if (e.k === 'pair') Wv.ring(bow.x, bow.z, 0.05);
        else if (e.k === 'splash') { Wv.ring(bow.x, bow.z, e.big ? 0.5 : 0.24); Wv.ring(stern.x, stern.z, e.big ? 0.3 : 0.12); }
        else if (e.k === 'soak') Wv.ring(pl.p.x, pl.p.z, 0.15);
        else if (e.k === 'bump' || e.k === 'bonk') Wv.ring(bow.x, bow.z, 0.07);
        else if (e.k === 'duck' && K.pf.dk && K.pf.dk.pos[e.i]) { const d = K.pf.dk.pos[e.i].p; Wv.ring(d.x, d.z, e.big ? 0.07 : 0.035); }
        else if (e.k === 'sink') Wv.ring(pl.p.x, pl.p.z, 0.3);
      }
    }
    const spd = st.vs || 0;
    if (st.phase === 'ride' && spd > 1.8 && Math.random() < 0.3 + st.speed * 0.6) for (const sx of [-1, 1]) { tmp.copy(pl.right).multiplyScalar(sx * (0.8 + st.speed)).addScaledVector(pl.fwd, spd * 0.3); log.spray.emit(new T.Vector3(bow.x + pl.right.x * sx * 0.4, pl.p.y + 0.05, bow.z + pl.right.z * sx * 0.4), tmp, 1, 0.4, 1 + st.speed * 1.5, 0.7); }
    log.spray.mat.uniforms.uPx.value = K3D.R ? K3D.R.domElement.height / 720 : 1;
    log.spray.tick(dt);

    // the wake: sample the bow's two shoulders and the stern now and then; each sample drifts outward as it ages
    const W = log.wake;
    W.acc += dt; W.u.uT.value += dt;
    W.u.uWhite.value += ((st.speed > 0.6 ? 1 : 0) - W.u.uWhite.value) * Math.min(1, dt * 3);
    if (W.acc > 0.07) {
      W.acc = 0;
      const sh = (sx) => wl(new T.Vector3(sx * LOG.r * 0.95, 0, -LOG.len * 0.32));
      W.hist.unshift({ t, L: sh(-1), Rr: sh(1), S: stern.clone(), out: pl.right.clone(), back: pl.fwd.clone().negate(), y: pl.p.y + 0.03, sp: Math.max(0.4, spd), on: st.phase === 'ride' || st.phase === 'board' || st.phase === 'dock' });
      if (W.hist.length > W.N) W.hist.pop();
    }
    const P3 = W.pos, A = W.aA;
    for (let sI = 0; sI < 3; sI++) for (let i = 0; i < W.N; i++) {
      const hst = W.hist[Math.min(i, W.hist.length - 1)], a = (sI * W.N + i) * 2;
      if (!hst) { A[a] = A[a + 1] = 0; continue; }
      const age = t - hst.t, base = sI === 0 ? hst.L : sI === 1 ? hst.Rr : hst.S, sx = sI === 0 ? -1 : sI === 1 ? 1 : 0;
      const spread = sx * age * (0.9 + hst.sp * 0.35), wdt = sI === 2 ? 0.45 + age * 0.5 : 0.18 + age * 0.22;
      const c = tmp.copy(base).addScaledVector(hst.out, spread);
      const o = sI === 2 ? hst.out : hst.out;
      // (the foam lies on the water as it heaves)
      const wy2 = hst.y + (Wv && age < 4.5 ? Wv.h(c.x, c.z) : 0);
      P3[a * 3] = c.x - o.x * wdt; P3[a * 3 + 1] = wy2; P3[a * 3 + 2] = c.z - o.z * wdt;
      P3[a * 3 + 3] = c.x + o.x * wdt; P3[a * 3 + 4] = wy2; P3[a * 3 + 5] = c.z + o.z * wdt;
      const al = hst.on ? Math.max(0, 1 - age / (sI === 2 ? 3.2 : 4.2)) * Math.min(1, hst.sp / 2.5) * (i === 0 ? 0 : 1) : 0;
      A[a] = A[a + 1] = al;
    }
    W.g.attributes.position.needsUpdate = true; W.g.attributes.aA.needsUpdate = true;
  }

  return { build, pose, place, LOG };
})();
