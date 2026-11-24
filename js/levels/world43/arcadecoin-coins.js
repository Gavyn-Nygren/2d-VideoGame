/* Pip & Bo - 43-1 Coin Drop: the two coins and their riders, the spark link between them, the pixel bubbles, and the
   little bursts of light the ride throws (sparks off a grind, the ring of a landing, sparkles off a taken coin).
   Loaded on demand with the 3D kit. Display only: it reads the rules' state (G.mst) and never changes it.

   THE COINS are thick embossed tokens 2.2 across (the rules' S.R): a reeded edge, a raised rim with made-up lettering,
   and the rider's stamp standing up in the middle. Pip's coin has an orange shine and a sprout stamp, Bo's a blue
   shine and an ear stamp (Pip is orange, Bo is blue across the game). A glow strip in the rider's colour runs round
   each edge and a soft pool of the same colour lights the chute under it, so you can always tell your coin.
   THE RIDERS stand on them in a surfer stance turned toward each other, arms out for balance, leaning into a steer,
   crouching for a landing. On a jump the rider leaps and the coin kick-flips once underneath, then rings on landing.
   THE SPARK LINK: a crackling white-gold arc between the coins (a camera-facing ribbon redrawn many times a second,
   with forks and a light that moves with it). Joined: bright and thick. Stretched: thin, jagged and flickering.
   Snapped: two short stubs spitting sparks, and a thin dotted line once the coins come close enough to rejoin.
   WIPE-OUTS: the rider is flung off in a puff of pixels, the coin skitters away; then a pixel bubble with the rider
   curled inside floats where the rules put it, the coin gliding beneath, until the partner pops it.

   ARCADECOIN_COINS.build(K)              -> C (once per scene)
   ARCADECOIN_COINS.pose(K, C, st, dt)    every drawn frame (also writes each player's p.x / p.y for the name tags)
   ARCADECOIN_COINS.place(st, k)          the coin k's frame { p, t, r, u } (the look-shot tools frame it) */
'use strict';

const ARCADECOIN_COINS = (function () {
  const T = K3D.T, PR = ARCADECOIN_ROUTE, R = PR.R;
  const INK = '#120d14';
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const RAD = 1.1, TH = 0.26;
  const LOOK = [
    { metal: '#f2a442', dark: '#a85a1a', shine: '#ffb25a', edge: '#ff7a3a', name: 'PIP', stamp: 'sprout' },
    { metal: '#b8d2f4', dark: '#5a7aa8', shine: '#8ad0ff', edge: '#5aa8ff', name: 'BO', stamp: 'ear' },
  ];
  const sm = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

  /* ---------- a coin ---------- */
  function faceTex(k) {
    const L = LOOK[k];
    return K3D.paint('ac-coinface|' + k, 512, 512, (c, w, h) => {
      const cx = w / 2, cy = h / 2;
      const g = c.createRadialGradient(cx - 80, cy - 90, 20, cx, cy, w * 0.5);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.18, L.shine); g.addColorStop(0.7, L.metal); g.addColorStop(1, L.dark);
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      // fine circular machining lines and a few honest scratches
      for (let r = 30; r < w * 0.5; r += 3) { c.strokeStyle = `rgba(${r % 6 ? '255,255,255' : '0,0,0'},0.05)`; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke(); }
      let s = 7 + k * 11; const rr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < 24; i++) { c.strokeStyle = `rgba(60,30,10,${0.06 + rr() * 0.1})`; c.lineWidth = 0.8; c.beginPath(); const x = rr() * w, y = rr() * h; c.moveTo(x, y); c.lineTo(x + (rr() - 0.5) * 60, y + (rr() - 0.5) * 30); c.stroke(); }
      // the rim's lettering (made up): the rider's name, stars, ONE PLAY
      c.save(); c.translate(cx, cy); c.fillStyle = 'rgba(70,36,10,0.55)'; c.font = 'bold 34px monospace'; c.textAlign = 'center';
      const txt = ('★ ' + L.name + ' ★ ONE PLAY ★ GOOD FOR ONE GAME ').split('');
      txt.forEach((ch, i) => { c.save(); c.rotate(i / txt.length * Math.PI * 2); c.fillText(ch, 0, -190); c.restore(); });
      c.restore();
      // a beaded ring inside the rim
      for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(cx + Math.cos(a) * 158, cy + Math.sin(a) * 158, 4, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(60,30,10,0.3)'; c.beginPath(); c.arc(cx + Math.cos(a) * 158 + 1.5, cy + Math.sin(a) * 158 + 1.5, 3, 0, Math.PI * 2); c.fill(); }
      // the year (made up) under the stamp
      c.fillStyle = 'rgba(70,36,10,0.5)'; c.font = 'bold 26px monospace'; c.textAlign = 'center'; c.fillText(k ? '19 BO 87' : '19 PIP 87', cx, cy + 120);
    });
  }
  function edgeTex(k) {
    const L = LOOK[k];
    return K3D.paint('ac-coinedge|' + k, 512, 32, (c, w, h) => {
      c.fillStyle = L.metal; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 6) { c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x, 0, 2, h); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x + 3, 0, 2, h); }
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 0, w, 3); c.fillRect(0, h - 3, w, 3);
    }, { repeat: true });
  }
  // the stamp's outline: Pip's sprout (a stem and two leaves) or Bo's ear (a round head with two round ears)
  function stampShape(kind) {
    const s = new T.Shape();
    if (kind === 'sprout') {
      s.moveTo(-0.05, -0.42); s.lineTo(0.05, -0.42); s.lineTo(0.04, -0.02);
      s.quadraticCurveTo(0.2, 0.22, 0.46, 0.14); s.quadraticCurveTo(0.34, -0.06, 0.06, -0.02);
      s.lineTo(0.05, 0.06); s.quadraticCurveTo(-0.1, 0.36, -0.36, 0.3); s.quadraticCurveTo(-0.3, 0.06, -0.04, 0.04);
      s.lineTo(-0.05, -0.42);
    } else {
      // a rounded head with two round ears on top (Bo's silhouette)
      s.moveTo(-0.34, -0.36); s.lineTo(0.34, -0.36); s.quadraticCurveTo(0.42, -0.36, 0.42, -0.26); s.lineTo(0.42, 0.06);
      s.absarc(0.27, 0.2, 0.17, -0.6, Math.PI + 0.3, false);
      s.lineTo(-0.09, 0.14);
      s.absarc(-0.27, 0.2, 0.17, -0.3 - 0.1, Math.PI + 0.6, false);
      s.lineTo(-0.42, -0.26); s.quadraticCurveTo(-0.42, -0.36, -0.34, -0.36);
      const e1 = new T.Path(); e1.absarc(-0.13, -0.08, 0.05, 0, Math.PI * 2, true); s.holes.push(e1);
      const e2 = new T.Path(); e2.absarc(0.13, -0.08, 0.05, 0, Math.PI * 2, true); s.holes.push(e2);
    }
    return s;
  }
  function coinMesh(k) {
    const L = LOOK[k], g = new T.Group();
    const face = K3D.toon('#ffffff', { map: faceTex(k), emissive: L.shine, emissiveIntensity: 0.16 });
    const edge = K3D.toon('#ffffff', { map: edgeTex(k), emissive: L.shine, emissiveIntensity: 0.12 });
    const body = K3D.mesh(new T.CylinderGeometry(RAD, RAD, TH, 72), [edge, face, face], { ink: INK, inkW: 0.9 });
    g.add(body);
    // the raised rims, top and bottom
    const rimM = K3D.toon(L.shine, { emissive: L.shine, emissiveIntensity: 0.2 });
    for (const sy of [1, -1]) { const rim = K3D.mesh(new T.TorusGeometry(RAD - 0.08, 0.05, 6, 72).rotateX(Math.PI / 2), rimM, { ink: INK, inkW: 0.5 }); rim.position.y = sy * TH / 2; g.add(rim); }
    // the glow strip round the middle of the edge, in the rider's colour
    const strip = new T.Mesh(new T.CylinderGeometry(RAD + 0.006, RAD + 0.006, 0.05, 72, 1, true), K3D.flat(hot(L.edge, 1.4)));
    g.add(strip);
    // the stamp standing up from the face (both faces)
    const sg = new T.ExtrudeGeometry(stampShape(L.stamp), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 10 });
    sg.rotateX(-Math.PI / 2);
    for (const sy of [1, -1]) {
      const st = K3D.mesh(sg, rimM, { ink: INK, inkW: 0.6 });
      st.scale.setScalar(1.3); st.position.y = sy * TH / 2; if (sy < 0) st.rotation.x = Math.PI;
      g.add(st);
    }
    // a slow sweep of shine round the face (a soft crescent that turns)
    const shineTex = K3D.paint('ac-coinshine', 256, 256, (c, w, h) => {
      const gg = c.createLinearGradient(0, 0, w, 0); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(0.45, 'rgba(255,255,255,0)'); gg.addColorStop(0.5, 'rgba(255,255,255,0.9)'); gg.addColorStop(0.56, 'rgba(255,255,255,0)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gg; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); c.fill();
    });
    const shine = new T.Mesh(new T.CircleGeometry(RAD - 0.04, 48).rotateX(-Math.PI / 2), K3D.flat(hot(L.shine, 0.62), { map: shineTex, transparent: true, depthWrite: false, add: true }));
    shine.position.y = TH / 2 + 0.012; shine.renderOrder = 6; g.add(shine);
    g.userData = { strip, shine, face, edge, rimM };
    return g;
  }

  /* ---------- a mouth for the riders (a grin, an O for a jump or a fright) ---------- */
  function faces(h) {
    const BW = K3D.HERO.w, BH = K3D.HERO.h, BD = K3D.HERO.d, my = BH * 0.6 - 0.15, mz = K3D.roundBoxFront(BW, BH, BD, 0.6, 0, my);
    const grin = new T.Mesh(new T.CircleGeometry(0.075, 16, Math.PI, Math.PI), K3D.flat('#3a1a28')); grin.position.set(0, my + 0.03, mz + 0.004); h.userData.face.add(grin);
    const oh = new T.Mesh(new T.CircleGeometry(0.045, 14), K3D.flat('#3a1a28')); oh.position.set(0, my, mz + 0.004); oh.scale.y = 1.3; h.userData.face.add(oh);
    const flat = new T.Mesh(new T.PlaneGeometry(0.1, 0.02), K3D.flat('#3a1a28')); flat.position.set(0, my + 0.01, mz + 0.004); h.userData.face.add(flat);
    h.userData.mouth = { grin, oh, flat };
  }

  /* ---------- the spark link: a camera-facing ribbon through a jagged line ---------- */
  function ribbon(K, n, col, k) {
    const pos = new Float32Array(n * 2 * 3), a = new Float32Array(n * 2), idx = [];
    for (let i = 0; i < n - 1; i++) { const q = i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aA', new T.BufferAttribute(a, 1)); g.setIndex(idx);
    const u = { uC: { value: hot(col, k) }, uK: { value: 1 } };
    const m = new T.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: 'attribute float aA; varying float vA; void main() { vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uC; uniform float uK; varying float vA; void main() { float e = 1.0 - abs(vA * 2.0 - 1.0); gl_FragColor = vec4(uC * uK * pow(e, 1.5), 1.0); }' });
    const mesh = new T.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 7; mesh.userData.live = true; K.add(mesh);
    for (let i = 0; i < n; i++) { a[i * 2] = 0; a[i * 2 + 1] = 1; }
    const tmp = new T.Vector3(), dir = new T.Vector3(), side = new T.Vector3(), view = new T.Vector3();
    return { mesh, u, n,
      // pts: array of Vector3 (n of them), w: width (world units)
      set(pts, w, cam, count) {
        const N = count || pts.length;
        for (let i = 0; i < n; i++) {
          const j = Math.min(i, N - 1), p = pts[j], pn = pts[Math.min(j + 1, N - 1)], pp = pts[Math.max(j - 1, 0)];
          dir.copy(pn).sub(pp).normalize(); view.copy(cam.position).sub(p).normalize(); side.crossVectors(dir, view).normalize().multiplyScalar(w * (i < N ? 1 : 0));
          tmp.copy(p).add(side); pos[i * 6] = tmp.x; pos[i * 6 + 1] = tmp.y; pos[i * 6 + 2] = tmp.z;
          tmp.copy(p).sub(side); pos[i * 6 + 3] = tmp.x; pos[i * 6 + 4] = tmp.y; pos[i * 6 + 5] = tmp.z;
        }
        g.attributes.position.needsUpdate = true; mesh.visible = true;
      },
      hide() { mesh.visible = false; } };
  }

  /* ---------- the pixel bubble ---------- */
  function bubbleMesh() {
    const u = { uT: { value: 0 }, uC: { value: new T.Color('#ffffff') }, uK: { value: 1 } };
    const m = new T.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main() { vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix * mv; }',
      fragmentShader: `uniform float uT, uK; uniform vec3 uC; varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main() {
          float f = pow(1.0 - abs(dot(vN, vV)), 2.2);
          vec3 q = floor(vP * 9.0 + vec3(0.0, uT * 3.0, 0.0));
          float px = step(0.86, fract(sin(dot(q, vec3(12.9898, 78.233, 45.164))) * 43758.5453 + uT * 0.4));
          vec3 rainbow = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + vP.y * 0.8 + uT * 0.3));
          gl_FragColor = vec4((uC * f * 1.4 + rainbow * f * 0.6 + uC * px * 0.5 * (0.3 + f)) * uK, 1.0);
        }` });
    const mesh = new T.Mesh(new T.IcosahedronGeometry(1, 3), m); mesh.renderOrder = 8; mesh.userData.live = true;
    return { mesh, u };
  }

  /* ---------- build ---------- */
  function build(K) {
    const C = { coins: [], t: 0, prev: [{}, {}] };
    for (const k of [0, 1]) {
      const g = new T.Group(); g.userData.live = true; K.add(g);
      const token = coinMesh(k);
      const flip = new T.Group(); flip.add(token); g.add(flip);
      const rider = new T.Group(); g.add(rider);
      const h = K3D.hero(k); rider.add(h);
      K3D.dress(h, 'arcadecoin');
      const m = h.userData.body.material; m.emissive = new T.Color(PCOL[k]); m.emissiveIntensity = 0.18;
      faces(h);
      // the pool of light under the coin (a soft disc in the rider's colour on the chute)
      const poolTex = K3D.paint('ac-pool', 128, 128, (c, w, h2) => { const gg = c.createRadialGradient(64, 64, 4, 64, 64, 62); gg.addColorStop(0, 'rgba(255,255,255,0.9)'); gg.addColorStop(0.5, 'rgba(255,255,255,0.3)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gg; c.fillRect(0, 0, w, h2); });
      const pool = new T.Mesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), K3D.flat(hot(LOOK[k].edge, 0.55), { map: poolTex, transparent: true, depthWrite: false, add: true }));
      pool.scale.set(3.6, 1, 3.6); pool.renderOrder = 2; pool.userData.live = true; K.add(pool);
      // a dark contact shadow right under it (helps read the height of a jump)
      const shadow = K3D.blob(null, RAD * 1.05); shadow.userData.live = true; K.add(shadow);
      // the light it throws on the chute walls
      const light = new T.PointLight(LOOK[k].edge, 1.4, 7, 1.6); K.add(light);
      const bub = bubbleMesh(); bub.mesh.scale.setScalar(1.05); bub.mesh.visible = false; K.add(bub.mesh);
      C.coins.push({ k, g, flip, token, rider, h, pool, shadow, light, bub, scr: null, spin: k * 1.3, lean: 0, look: 0, hop: 0, prevAir: 0, outV: null });
    }
    // the spark link: a hot core, a wider soft glow, two forks, a light that moves with it
    C.core = ribbon(K, 26, '#fff6d8', 2.0);
    C.halo = ribbon(K, 26, '#ffd27a', 0.5);
    C.forks = [ribbon(K, 8, '#fff0c0', 1.5), ribbon(K, 8, '#fff0c0', 1.5), ribbon(K, 6, '#fff0c0', 1.4), ribbon(K, 6, '#fff0c0', 1.4)];
    C.dots = ribbon(K, 26, '#ffe0a0', 0.4);
    C.arcLight = new T.PointLight('#ffe2a0', 1.7, 10, 1.4); K.add(C.arcLight);
    // the bursts: soft glows that fly and fade (sparks, sparkles, pixels)
    const G = ARCADE.glows(K, 700);
    C.burst = { G, list: [], free: [] };
    for (let i = 0; i < 600; i++) { G.add(0, -9999, 0, 0, '#ffffff', 1, 0); C.burst.free.push(i); }
    G.done();
    // a landing ring that spreads on the chute (one per coin)
    C.rings = [0, 1].map(k => { const r = new T.Mesh(new T.RingGeometry(0.86, 1, 48).rotateX(-Math.PI / 2), K3D.flat(hot(LOOK[k].edge, 1.6), { transparent: true, depthWrite: false, add: true })); r.visible = false; r.renderOrder = 3; r.userData.live = true; K.add(r); return { m: r, t: 9 }; });
    return C;
  }
  // a spark: from p (Vector3) with velocity v, life secs, size, colour; gravity g
  function emit(C, p, v, life, size, col, g = 6) {
    const B = C.burst; if (!B.free.length) return;
    const i = B.free.pop(); B.G.color(i, col, 1.1);
    B.list.push({ i, p: p.clone(), v: v.clone(), t: 0, life, size, g });
  }

  /* ---------- where each coin is ---------- */
  const vv = a => new T.Vector3(a[0], a[1], a[2]);
  function frame(s, x, y) {
    const f = R.at(s), p = vv(R.bankLocal(s, x, y, f));
    return { p, t: vv(f.t), r: vv(f.br), u: vv(f.bu), f };
  }
  function place(st, k) { const c = st.c[k]; return frame(st.s, c.x, 0); }

  /* ---------- every frame ---------- */
  const m4 = new T.Matrix4(), q = new T.Quaternion(), q2 = new T.Quaternion(), tmp = new T.Vector3(), tmp2 = new T.Vector3(), e = new T.Euler();
  const X = new T.Vector3(1, 0, 0), Z = new T.Vector3(0, 0, 1);
  function pose(K, C, st, dt) {
    C.t += dt;
    const t = C.t, cam = K.camera, S = ARCADECOIN.S, ride = st.phase !== 'intro';
    const spd = st.v || 9, fast = Math.min(1, spd / 13);
    // (in the opening the coins and riders belong to the opening's own models)
    for (const cc of C.coins) { const show = ride; cc.g.visible = show; cc.pool.visible = show; cc.shadow.visible = show; cc.light.visible = show; }
    if (!ride) { C.core.hide(); C.halo.hide(); C.dots.hide(); C.forks.forEach(f => f.hide()); C.arcLight.visible = false; stepBursts(C, dt); return; }
    const ends = [];
    for (const cc of C.coins) {
      const k = cc.k, c = st.c[k], o = st.c[1 - k], h = cc.h;
      const out = c.state === 'out', bub = c.state === 'bubble';
      // the coin's place: on the chute under the rider (a bubble's coin glides ahead under the bubble)
      const sAt = bub ? st.s + c.boff : st.s, xAt = bub ? c.bx : c.x;
      let lift = c.y;
      if (st.fly) lift = c.y; // (the springboard's flight: the rules carry the arc height in c.y)
      const F = frame(sAt, xAt, 0);
      // the coin's own lean: tips into a steer, wobbles when it grinds, rings round after a landing
      cc.lean += ((-c.vx * 0.028) - cc.lean) * Math.min(1, dt * 10);
      const sinceLand = st.t - c.landT, ring = sinceLand < 0.6 ? Math.sin(sinceLand * 38) * 0.06 * (1 - sinceLand / 0.6) : 0;
      const grind = st.t - c.grindT < 0.2 ? Math.sin(t * 70) * 0.04 : 0;
      // the kick-flip: one full turn about the coin's forward line in the middle of a hop (riders' jumps only)
      const hopping = c.air > 0 && c.airH > 0.9 && c.airH < 2 && !st.fly && st.t - c.hopT < S.AIR + 0.05;
      const u = hopping ? 1 - c.air / (c.airT || 1) : 0;
      const flipA = hopping ? sm(0.28, 0.72, u) * Math.PI * 2 * (k ? -1 : 1) : 0;
      // springboard flights: the coins tip back as they rise and forward as they come down (and spin slowly)
      const flyU = st.fly ? Math.min(1, st.fly.t / st.fly.dur) : 0, flyP = st.fly ? (0.5 - flyU) * 0.5 : 0;
      cc.spin += dt * (0.4 + (st.fly ? 2.5 : 0));
      // the frame: forward along the chute, up off its floor
      m4.makeBasis(F.r, F.u, F.t.clone().negate()); q.setFromRotationMatrix(m4);
      cc.g.position.copy(F.p).addScaledVector(F.u, TH / 2 + 0.02 + lift);
      cc.g.quaternion.copy(q);
      cc.flip.rotation.set(flyP, 0, cc.lean + ring + grind, 'XYZ');
      cc.token.quaternion.setFromEuler(e.set(0, cc.spin * 0.2, 0)); cc.token.quaternion.premultiply(q2.setFromAxisAngle(Z, flipA));
      cc.token.userData.shine.rotation.y = -t * 0.7 + k;
      cc.token.userData.strip.material.color.copy(hot(LOOK[k].edge, 1.2 + Math.sin(t * 6 + k) * 0.25 + (c.state === 'ride' && c.safe > 0 ? Math.sin(t * 30) * 0.9 : 0)));
      // the rider: a surfer stance turned toward the partner, arms out, leaning into a steer; leaps over the flip
      const toward = (o.state === 'ride' ? Math.sign((o.x - c.x) || (k ? -1 : 1)) : (k ? -1 : 1));
      cc.look += ((toward * 0.95) - cc.look) * Math.min(1, dt * 5);
      const leap = hopping ? Math.sin(Math.PI * Math.min(1, u / 0.92)) * 1.25 : 0;
      const crouch = sinceLand < 0.35 ? (1 - sinceLand / 0.35) * 0.18 : 0;
      cc.rider.position.set(0, TH / 2 + 0.02 + leap - crouch * 0.4, 0);
      cc.rider.rotation.set(-0.08 - (st.fly ? flyP * 0.5 : 0), 0, cc.lean * 1.6 + (st.hold ? Math.sin(t * 16) * 0.03 : 0), 'XYZ');
      cc.rider.visible = !out && !bub;
      const steer = Math.max(-1, Math.min(1, c.vx / S.VX));
      // hands out wide for balance (in the rider's own space), swaying with the steer, high in a jump
      cc.rider.updateMatrixWorld(true);
      const hy = 0.5 + (hopping ? 0.35 : 0) + (st.fly ? 0.45 : 0) + Math.sin(t * 3.2 + k) * 0.04;
      const hands = [cc.rider.localToWorld(new T.Vector3(-0.85, hy + steer * 0.25, 0.1)), cc.rider.localToWorld(new T.Vector3(0.85, hy - steer * 0.25, 0.1))];
      K3D.heroPose(h, { x: 0, y: 0, z: 0, heading: cc.look * 1.1 + steer * 0.15, speed: 0, vy: hopping ? (u < 0.5 ? 3 : -2) : 0, land: c.landT > (cc.landSeen || -9) && sinceLand < 0.05, hands, stun: false }, dt);
      if (c.landT > (cc.landSeen || -9)) cc.landSeen = c.landT;
      const scared = hopping || st.fly || (c.state === 'ride' && c.safe > 0.5) || st.phase === 'restart';
      const happy = !scared && (st.t - (C.lastPick || -9) < 0.8 || st.phase === 'start' || st.phase === 'done' || st.arc.state === 'on');
      h.userData.mouth.oh.visible = scared; h.userData.mouth.grin.visible = !scared && happy; h.userData.mouth.flat.visible = !scared && !happy;
      // the glowing outfit parts
      for (const w of h.userData.worn || []) {
        const gl = w.userData.glow; if (!gl) continue;
        if (gl.kind === 'circuit') gl.mat.emissiveIntensity = 0.55 + 0.45 * Math.sin(t * (3 + fast * 9)) + (st.t - (C.lastSweep || -9) < 0.6 ? 0.8 : 0);
        if (gl.kind === 'buttons') { const sw = st.t - (C.lastSweep || -9) < 0.8; gl.mats.forEach((b, i) => b.m.color.copy(hot(b.col, sw || Math.floor(t * (4 + fast * 6)) % 4 === i ? 2.4 : 0.35))); }
      }
      // wiped out: the rider tumbles off backward in a puff of pixels, the coin skitters to a stop
      if (out) {
        cc.g.visible = true; cc.rider.visible = c.t < 0.7;
        const a = c.t;
        cc.rider.position.set(0, TH / 2 + 0.02 + Math.sin(Math.min(1, a / 0.7) * Math.PI) * 1.4, a * 3.2);
        cc.rider.rotation.set(-a * 9, 0, a * 4 * (k ? 1 : -1));
        const sc = Math.max(0.01, 1 - Math.max(0, a - 0.35) / 0.35); cc.rider.scale.setScalar(sc);
        cc.token.quaternion.multiply(q2.setFromAxisAngle(X, Math.min(1, a) * 0.5));
        cc.g.position.addScaledVector(F.t, -Math.min(a, 1) * 4).addScaledVector(F.u, Math.sin(Math.min(1, a * 1.5) * Math.PI) * 0.4);
        if (a > 0.35 && a < 0.75 && Math.random() < 0.6) { h.getWorldPosition(tmp); for (let i = 0; i < 3; i++) emit(C, tmp, new T.Vector3((Math.random() - 0.5) * 6, Math.random() * 5, (Math.random() - 0.5) * 6), 0.7, 0.35, i % 2 ? PCOL[k] : '#ffffff', 5); }
      } else cc.rider.scale.setScalar(1);
      // the pixel bubble: floating over its coin, the rider curled inside, bobbing; flashes as it is about to pop
      cc.bub.mesh.visible = bub;
      if (bub) {
        cc.g.visible = true;
        const bp = frame(sAt, xAt, 1.25 + Math.sin(t * 3 + k) * 0.12).p;
        cc.bub.mesh.position.copy(bp); cc.bub.mesh.scale.setScalar(1.05 + Math.sin(t * 5) * 0.03);
        cc.bub.u.uT.value = t; cc.bub.u.uC.value.set(PCOL[k]); cc.bub.u.uK.value = 0.9 + (c.t > ARCADECOIN.S.BUBBLE - 1.2 ? Math.abs(Math.sin(t * 14)) * 0.8 : 0);
        cc.rider.visible = true; cc.rider.scale.setScalar(0.82);
        cc.rider.position.set(0, 1.25 - 0.36 - TH / 2 + Math.sin(t * 3 + k) * 0.12, 0); cc.rider.rotation.set(Math.sin(t * 1.3) * 0.3, t * 0.8, Math.sin(t * 1.7) * 0.2);
      }
      // the pool of light and the contact shadow under the coin
      const fl = frame(sAt, xAt, 0.03);
      cc.pool.position.copy(fl.p); cc.pool.quaternion.copy(q);
      const pk = Math.max(0.3, 1 - lift / 5); cc.pool.scale.set(3.6 * pk, 1, 3.6 * pk); cc.pool.material.color.copy(hot(LOOK[k].edge, (0.45 + 0.15 * Math.sin(t * 5 + k)) * pk));
      const onFloor = !PR.inAir(sAt) && !(st.fly && lift > 0) || lift < 3;
      cc.shadow.visible = onFloor && !st.fly; cc.shadow.position.copy(fl.p).addScaledVector(F.u, 0.012); cc.shadow.quaternion.copy(q);
      { const kk = Math.max(0.45, 1 - lift / 4); cc.shadow.scale.set(RAD * 2.1 * kk, 1, RAD * 2.1 * kk); cc.shadow.material.opacity = 0.35 + 0.5 * kk; }
      cc.light.position.copy(cc.g.position).addScaledVector(F.u, 0.6);
      cc.light.intensity = 1.2 + 0.3 * Math.sin(t * 7 + k);
      // name tags and the HUD's speech
      h.getWorldPosition(tmp); tmp.addScaledVector(F.u, 1.05);
      const sp = K3D.toScreen(tmp.x, tmp.y, tmp.z), p = G.players[k];
      if (p && sp.z < 1) { p.x = sp.x - PW / 2; p.y = sp.y - PH; }
      cc.scr = sp;
      // the spark's ends: just above each coin's middle (riding coins only)
      ends.push(c.state === 'ride' ? cc.g.position.clone().addScaledVector(F.u, 0.42) : null);
      // grind sparks off the wall
      if (c.state === 'ride' && st.t - c.grindT < 0.05 && (cc.lastGrind || 0) !== c.grindT) {
        cc.lastGrind = c.grindT; const side = Math.sign(c.x) || 1;
        tmp.copy(cc.g.position).addScaledVector(F.r, side * RAD);
        for (let i = 0; i < 10; i++) emit(C, tmp, F.t.clone().multiplyScalar(-3 - Math.random() * 4).addScaledVector(F.u, 1 + Math.random() * 3).addScaledVector(F.r, -side * Math.random() * 2), 0.45, 0.16, i % 3 ? '#ffd27a' : '#ffffff', 9);
      }
      // a landing: the ring spreads on the chute
      if (c.landT > (cc.ringSeen || -9) && c.state === 'ride') { cc.ringSeen = c.landT; C.rings[k].t = 0; }
      const rg = C.rings[k]; rg.t += dt;
      rg.m.visible = rg.t < 0.45;
      if (rg.m.visible) { rg.m.position.copy(fl.p).addScaledVector(F.u, 0.02); rg.m.quaternion.copy(q); const s2 = 1.1 + rg.t * 5; rg.m.scale.set(s2, 1, s2); rg.m.material.color.copy(hot(LOOK[k].edge, 1.3 * (1 - rg.t / 0.45))); }
    }
    // the spark link
    arc(K, C, st, ends, dt);
    // pickups' sparkles, sweeps, zaps, pops (from the rules' list of happenings)
    for (const fx of st.fx) {
      if (fx.seen) continue; fx.seen = true;
      if (fx.k === 'pick') { C.lastPick = st.t; const pk = PR.lists.pickups[fx.i], pp = frame(pk.s, pk.x, 0.7).p; const col = pk.kind === 'star' ? '#9affea' : pk.kind === 'ticket' ? '#ff9ad0' : '#ffe27a'; for (let i = 0; i < (pk.kind === 'coin' ? 6 : 14); i++) emit(C, pp, new T.Vector3((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4), 0.55, 0.22, col, 7); }
      if (fx.k === 'sweep') { C.lastSweep = st.t; const r = PR.lists.rows[fx.row]; for (let x = r.x0; x <= r.x1; x += 0.6) { const pp = frame(r.s + 2, x, 0.8).p; emit(C, pp, new T.Vector3((Math.random() - 0.5) * 2, 4 + Math.random() * 3, (Math.random() - 0.5) * 2), 0.9, 0.3, x % 1.2 < 0.6 ? '#fff0a0' : '#ffffff', 5); } }
      if (fx.k === 'zap') { const b = PR.lists.bugs[fx.i], pp = frame(b.s, b.x, 0.5).p; for (let i = 0; i < 24; i++) emit(C, pp, new T.Vector3((Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8), 0.6, 0.3, ARCADE.NEON[i % 8], 6); }
      if (fx.k === 'pop' || fx.k === 'selfpop') { const cc = C.coins[fx.id]; cc.h.getWorldPosition(tmp); for (let i = 0; i < 20; i++) emit(C, tmp, new T.Vector3((Math.random() - 0.5) * 6, Math.random() * 5, (Math.random() - 0.5) * 6), 0.6, 0.28, i % 2 ? PCOL[fx.id] : '#ffffff', 4); }
      if (fx.k === 'snap' && ends[0] && ends[1]) { tmp.copy(ends[0]).lerp(ends[1], 0.5); for (let i = 0; i < 18; i++) emit(C, tmp, new T.Vector3((Math.random() - 0.5) * 7, Math.random() * 4, (Math.random() - 0.5) * 7), 0.5, 0.2, '#fff0c0', 8); }
    }
    stepBursts(C, dt);
  }

  /* ---------- the arc ---------- */
  const PTS = Array.from({ length: 26 }, () => new T.Vector3()), FP = Array.from({ length: 8 }, () => new T.Vector3());
  let jit = 0, seedA = 1;
  const jr = () => { seedA = (seedA * 16807) % 2147483647; return seedA / 2147483647 - 0.5; };
  function arc(K, C, st, ends, dt) {
    const A = st.arc, cam = K.camera;
    jit += dt; if (jit > 1 / 30) { jit = 0; seedA = (seedA + 7919) % 2147483647 || 1; }
    const s0 = seedA;
    const hideAll = () => { C.core.hide(); C.halo.hide(); C.dots.hide(); C.forks.forEach(f => f.hide()); };
    if (!ends[0] || !ends[1]) { hideAll(); C.arcLight.visible = false; return; }
    const a = ends[0], b = ends[1], d = a.distanceTo(b);
    const f = R.at(st.s), up = new T.Vector3(...f.bu), fwd = new T.Vector3(...f.t);
    const on = A.state === 'on', str = A.state === 'stretch', snap = A.state === 'snap';
    const flick = str && Math.sin(C.t * 47) > 0.2;
    C.arcLight.visible = !snap; C.arcLight.position.copy(a).lerp(b, 0.5).addScaledVector(up, 0.3);
    C.arcLight.intensity = on ? 1.8 + Math.sin(C.t * 40) * 0.3 : str ? (flick ? 0.45 : 1.05) : 0;
    const N = 26, amp = on ? 0.16 : 0.32;
    const jag = (out, n, p0, p1, am) => {
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), env = Math.sin(u * Math.PI);
        out[i].copy(p0).lerp(p1, u).addScaledVector(up, (jr() * 2 * am + Math.sin(u * Math.PI) * Math.min(0.6, d * 0.04)) * (i && i < n - 1 ? 1 : 0)).addScaledVector(fwd, jr() * 2 * am * env);
      }
    };
    if (snap) {
      // two stubs spitting toward each other, and a faint dotted line once close enough to rejoin
      C.core.hide(); C.halo.hide();
      for (const [i, p0, p1] of [[0, a, b], [1, b, a]]) {
        const tip = p0.clone().lerp(p1, 0.12 + Math.abs(jr()) * 0.1);
        jag(FP, 8, p0, tip, 0.12); C.forks[i].set(FP, 0.035, cam, 8); C.forks[i].u.uK.value = 0.9;
      }
      C.forks[2].hide(); C.forks[3].hide();
      const near = A.rejoin < ARCADECOIN.S.REJOIN - 0.05;
      if (near) { jag(PTS, N, a, b, 0.05); const k = 1 - Math.max(0, A.rejoin) / ARCADECOIN.S.REJOIN; C.dots.set(PTS, 0.02 + k * 0.03, cam); C.dots.u.uK.value = (Math.sin(C.t * 30) > 0 ? 0.4 : 0.9) * (0.4 + k); } else C.dots.hide();
      seedA = s0; return;
    }
    C.dots.hide();
    jag(PTS, N, a, b, amp);
    const w = on ? 0.06 : 0.025;
    C.core.set(PTS, w, cam); C.core.u.uK.value = on ? 1.0 + Math.sin(C.t * 60) * 0.15 : flick ? 0.25 : 0.8;
    C.halo.set(PTS, w * 5, cam); C.halo.u.uK.value = on ? 0.9 : flick ? 0.1 : 0.35;
    // forks: short branches off the main line (more of them when stretched)
    for (let i = 0; i < 4; i++) {
      const fk = C.forks[i], show = on ? i < 2 : true;
      if (!show) { fk.hide(); continue; }
      const j = 3 + Math.floor(Math.abs(jr()) * 2 * (N - 6)), p0 = PTS[Math.min(N - 1, j)];
      const p1 = p0.clone().addScaledVector(up, (jr() + 0.6) * 0.7).addScaledVector(fwd, jr() * 1.0);
      const n = i < 2 ? 8 : 6; jag(FP, n, p0, p1, 0.07); fk.set(FP, on ? 0.025 : 0.015, cam, n); fk.u.uK.value = flick ? 0.2 : 0.8;
    }
    seedA = s0;
  }
  function stepBursts(C, dt) {
    const B = C.burst;
    for (let n = B.list.length - 1; n >= 0; n--) {
      const s = B.list[n]; s.t += dt;
      if (s.t >= s.life) { B.G.set(s.i, 0, -9999, 0, 0); B.free.push(s.i); B.list.splice(n, 1); continue; }
      s.v.y -= s.g * dt; s.p.addScaledVector(s.v, dt);
      B.G.set(s.i, s.p.x, s.p.y, s.p.z, s.size * (1 - s.t / s.life));
    }
  }

  return { build, pose, place, frame, emit, coinMesh, faces, LOOK, RAD, TH };
})();
