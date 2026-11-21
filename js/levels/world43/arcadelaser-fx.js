/* Pip & Bo - 43-4 Laser Tag Arena: light and effects (ARCADELASER_FX). Loaded on demand with the 3D kit. Display only.

   Light is the star of this level, so the beams are drawn as light, not as sticks:
     BEAMS      soft camera-facing ribbons (one instanced draw): a white-hot core, the player's colour round it and a
                wide faint glow where the beam lights the haze; each beam flashes in, lingers a third of a second and
                fades. A strip of its colour lies on the floor under it (the beam lighting the floor), a flare sits on
                every bounce, and a coloured point light blinks along it so the pieces round it light up.
     AIMING     the dotted line in the player's colour along exactly the path the beam will take, dots running forward,
                a diamond at every bounce, a ring round the target if it would hit; a faint copy on the floor so its
                place reads from above. Both players see both lines.
     THE TELL   the blaster's emitter swells and a ring tightens round it for the quarter second before a beam.
     SCORCHES   where a beam stops on a wall it leaves a glowing spot in its colour that cools to a dark mark over ten s.
     TAGS       a ring of light, sparks in both colours, a comic ZAP! (or BANK!) burst that pops and fades (no flash
                over the whole screen, ever).
     SHIELDS    a bubble with a fine hex pattern (cyan, or gold for the catch-up shield) that shatters when it blocks.
     SPEED, LONG BOUNCE, PICKUPS, DODGES, LANDINGS, RISERS: little bursts and trails.
     THE RING   for NEXT TAG WINS: four walls of gold light that close in.
   ARCADELASER_FX.build(K) -> fx; fx.update(K, st, dt, view) with view = { heroes: [{ x, y, z }], dark } */
'use strict';

const ARCADELASER_FX = (function () {
  const T = K3D.T, AR = ARCADELASER_ARENA, CO = ARCADELASER, S = CO.S;
  const F = {};
  const BEAM_Y = 0.42, LINGER = 1 / 3;
  F.BEAM_Y = BEAM_Y;
  const col3 = new T.Color();

  /* ---------- soft beams: instanced ribbons that face the camera (or lie flat on the floor) ---------- */
  function ribbons(K, max) {
    const base = new T.PlaneGeometry(1, 2).translate(0.5, 0, 0);
    const ig = new T.InstancedBufferGeometry(); ig.index = base.index; ig.setAttribute('position', base.attributes.position);
    const aA = new Float32Array(max * 4), aB = new Float32Array(max * 4), aC = new Float32Array(max * 4);
    const A = new T.InstancedBufferAttribute(aA, 4), B = new T.InstancedBufferAttribute(aB, 4), Cc = new T.InstancedBufferAttribute(aC, 4);
    for (const a of [A, B, Cc]) a.setUsage(T.DynamicDrawUsage);
    ig.setAttribute('aA', A); ig.setAttribute('aB', B); ig.setAttribute('aC', Cc); ig.instanceCount = 0;
    const mat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: `attribute vec4 aA; attribute vec4 aB; attribute vec4 aC; varying vec2 vUv; varying vec4 vC;
        void main() {
          vec3 a = aA.xyz, b = aB.xyz;
          vec3 p = mix(a, b, position.x);
          vec3 d = b - a; float L = length(d); d = L > 1e-5 ? d / L : vec3(1.0, 0.0, 0.0);
          vec3 side = aB.w > 0.5 ? normalize(cross(d, vec3(0.0, 1.0, 0.0))) : normalize(cross(d, normalize(cameraPosition - p)));
          p += side * position.y * aA.w;
          vUv = vec2(position.x * L, position.y); vC = aC;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `varying vec2 vUv; varying vec4 vC;
        void main() {
          float v = abs(vUv.y);
          float core = exp(-v * v * 160.0), glow = exp(-v * v * 10.0), haze = max(0.0, 1.0 - v) * 0.16;
          vec3 c = vC.rgb * (glow * 0.85 + haze) + vec3(1.0, 0.98, 0.94) * core * 1.3;
          gl_FragColor = vec4(c * vC.a, 1.0);
        }` });
    const mesh = new T.Mesh(ig, mat); mesh.frustumCulled = false; mesh.renderOrder = 6; mesh.userData.live = true; K.add(mesh);
    let n = 0;
    return {
      begin() { n = 0; },
      add(x0, y0, z0, x1, y1, z1, w, col, k, flatOn) {
        if (n >= max) return; const i = n++;
        aA[i * 4] = x0; aA[i * 4 + 1] = y0; aA[i * 4 + 2] = z0; aA[i * 4 + 3] = w;
        aB[i * 4] = x1; aB[i * 4 + 1] = y1; aB[i * 4 + 2] = z1; aB[i * 4 + 3] = flatOn ? 1 : 0;
        col3.set(col); aC[i * 4] = col3.r; aC[i * 4 + 1] = col3.g; aC[i * 4 + 2] = col3.b; aC[i * 4 + 3] = k;
      },
      end() { ig.instanceCount = n; A.needsUpdate = B.needsUpdate = Cc.needsUpdate = true; },
    };
  }
  /* ---------- sprites: camera-facing dots, rings, diamonds and stars, one instanced draw ---------- */
  function sprites(K, max) {
    const base = new T.PlaneGeometry(1, 1);
    const ig = new T.InstancedBufferGeometry(); ig.index = base.index; ig.setAttribute('position', base.attributes.position);
    const aP = new Float32Array(max * 4), aC = new Float32Array(max * 4);
    const Pp = new T.InstancedBufferAttribute(aP, 4), Cc = new T.InstancedBufferAttribute(aC, 4);
    Pp.setUsage(T.DynamicDrawUsage); Cc.setUsage(T.DynamicDrawUsage);
    ig.setAttribute('aP', Pp); ig.setAttribute('aC', Cc); ig.instanceCount = 0;
    const mat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: `attribute vec4 aP; attribute vec4 aC; varying vec2 vUv; varying vec3 vC; varying float vS;
        void main() { vUv = position.xy * 2.0; vC = aC.rgb; vS = aC.w; vec4 mv = viewMatrix * vec4(aP.xyz, 1.0); mv.xy += position.xy * aP.w; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec2 vUv; varying vec3 vC; varying float vS;
        void main() {
          float r = length(vUv), a;
          if (vS < 0.5) { a = smoothstep(1.0, 0.0, r); a *= a; }                                   // soft glow
          else if (vS < 1.5) { a = exp(-pow((r - 0.72) * 9.0, 2.0)); }                             // ring
          else if (vS < 2.5) { float d = abs(vUv.x) + abs(vUv.y); a = smoothstep(0.95, 0.8, d) * (0.55 + 0.45 * smoothstep(0.5, 0.0, d)); } // diamond
          else if (vS < 3.5) { a = max(exp(-abs(vUv.x) * 16.0) * exp(-abs(vUv.y) * 2.2), exp(-abs(vUv.y) * 16.0) * exp(-abs(vUv.x) * 2.2)) + exp(-r * r * 9.0); } // flare
          else { a = smoothstep(1.0, 0.8, r) * (0.7 + 0.3 * smoothstep(0.6, 0.0, r)); }             // crisp dot
          gl_FragColor = vec4(vC * a, 1.0);
        }` });
    const mesh = new T.Mesh(ig, mat); mesh.frustumCulled = false; mesh.renderOrder = 7; mesh.userData.live = true; K.add(mesh);
    let n = 0;
    return {
      begin() { n = 0; },
      add(x, y, z, size, col, k, shape) { if (n >= max) return; const i = n++; aP[i * 4] = x; aP[i * 4 + 1] = y; aP[i * 4 + 2] = z; aP[i * 4 + 3] = size; col3.set(col).multiplyScalar(k); aC[i * 4] = col3.r; aC[i * 4 + 1] = col3.g; aC[i * 4 + 2] = col3.b; aC[i * 4 + 3] = shape || 0; },
      end() { ig.instanceCount = n; Pp.needsUpdate = Cc.needsUpdate = true; },
    };
  }
  /* ---------- particles (sparks: additive; dust and shards: soft) ---------- */
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
    const pts = new T.Points(g, m); pts.frustumCulled = false; pts.renderOrder = additive ? 8 : 4; pts.userData.live = true; K.add(pts);
    let head = 0;
    return {
      add(x, y, z, vx, vy, vz, c, l, size, o = {}) {
        const i = head; head = (head + 1) % n;
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
        col3.set(c); col[i * 3] = col3.r; col[i * 3 + 1] = col3.g; col[i * 3 + 2] = col3.b;
        life[i] = max[i] = l; aL[i * 2] = 1; aL[i * 2 + 1] = size; grav[i] = o.g != null ? o.g : 0; drag[i] = o.drag || 0; grow[i] = o.grow || 0;
      },
      step(dt) {
        for (let i = 0; i < n; i++) {
          if (life[i] <= 0) { aL[i * 2] = 0; continue; }
          life[i] -= dt;
          const dk = Math.exp(-drag[i] * dt);
          vel[i * 3] *= dk; vel[i * 3 + 2] *= dk; vel[i * 3 + 1] = vel[i * 3 + 1] * dk - grav[i] * dt;
          pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
          if (pos[i * 3 + 1] < 0.02 && grav[i] > 0) { pos[i * 3 + 1] = 0.02; vel[i * 3 + 1] *= -0.35; vel[i * 3] *= 0.6; vel[i * 3 + 2] *= 0.6; }
          aL[i * 2] = Math.max(0, life[i] / max[i]); aL[i * 2 + 1] += grow[i] * dt;
        }
        g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.aL.needsUpdate = true;
        m.uniforms.uPx.value = Math.max(1, (K3D.R ? K3D.R.domElement.height : 720) / 720);
      },
    };
  }
  /* ---------- scorch marks: a dark spot stuck to the wall (a glow sprite does the hot part) ---------- */
  const scorchTex = () => K3D.paint('alf-scorch', 128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const g = c.createRadialGradient(64, 64, 2, 64, 64, 60); g.addColorStop(0, 'rgba(10,6,12,0.85)'); g.addColorStop(0.45, 'rgba(20,12,20,0.55)'); g.addColorStop(1, 'rgba(20,12,20,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(10,6,12,0.5)'; c.lineWidth = 2;
    for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28; c.beginPath(); c.moveTo(64 + Math.cos(a) * 14, 64 + Math.sin(a) * 14); c.lineTo(64 + Math.cos(a) * (34 + Math.random() * 24), 64 + Math.sin(a) * (34 + Math.random() * 24)); c.stroke(); }
  });
  /* ---------- the comic burst ---------- */
  const burstTex = (word, col) => K3D.paint('alf-burst|' + word + col, 256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.translate(w / 2, h / 2);
    const pts = 14; c.beginPath();
    for (let i = 0; i < pts * 2; i++) { const a = i / (pts * 2) * Math.PI * 2, r = i % 2 ? 70 : 118 - (i % 4) * 8; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fillStyle = '#fff6dc'; c.fill(); c.lineWidth = 9; c.strokeStyle = '#120d14'; c.stroke();
    c.beginPath(); for (let i = 0; i < pts * 2; i++) { const a = i / (pts * 2) * Math.PI * 2, r = i % 2 ? 54 : 88 - (i % 4) * 6; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fillStyle = col; c.fill();
    c.rotate(-0.12); c.font = '900 ' + (word.length > 4 ? 52 : 64) + 'px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 10; c.strokeStyle = '#120d14'; c.strokeText(word, 0, 4); c.fillStyle = '#ffffff'; c.fillText(word, 0, 4);
  });
  const hexTex = () => K3D.paint('alf-hex', 256, 128, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 2;
    const r = 12, dx = r * 1.5, dy = r * Math.sqrt(3);
    for (let i = -1; i < w / dx + 1; i++) for (let j = -1; j < h / dy + 1; j++) { const x = i * dx, y = j * dy + (i % 2 ? dy / 2 : 0); c.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.stroke(); }
  }, { repeat: true });
  const scanTex = () => K3D.paint('alf-scan', 64, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, h, 0, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#806040'); g.addColorStop(1, '#000000');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(0, y, w, 3); }
  }, { repeat: true });

  F.build = function (K) {
    const fx = { t: 0, seen: 0, beams: ribbons(K, 420), spr: sprites(K, 1600), spark: particles(K, 2200, true), soft: particles(K, 900, false), scorch: [], bursts: [], rings: [], lights: [] };
    // scorch marks
    const sm = new T.MeshBasicMaterial({ map: scorchTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const NS = 48;
    fx.scorchMesh = new T.InstancedMesh(new T.PlaneGeometry(0.42, 0.42), sm, NS); fx.scorchMesh.count = 0; fx.scorchMesh.frustumCulled = false; fx.scorchMesh.userData.live = true; fx.scorchMesh.renderOrder = 3; K.add(fx.scorchMesh);
    fx.NS = NS;
    // a point light for each player's beams and one for tags (always there, so the materials never rebuild)
    for (const c of [PCOL[0], PCOL[1], '#ffffff']) { const l = new T.PointLight(c, 0, 9, 1.6); l.position.set(0, -20, 0); K.scene.add(l); fx.lights.push({ l, k: 0 }); }
    // the comic bursts (two each: ZAP! and BANK!)
    fx.burstSpr = [];
    for (const id of [0, 1]) for (const w of ['ZAP!', 'BANK!', 'BLOCK!']) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: burstTex(w, PCOL[id]), transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
      s.visible = false; s.renderOrder = 20; s.userData = { id, w, t: 9, live: true }; K.add(s); fx.burstSpr.push(s);
    }
    // shields
    const shieldMat = col => new T.ShaderMaterial({ uniforms: { uT: { value: 0 }, uC: { value: new T.Color(col) }, uK: { value: 1 }, uMap: { value: hexTex() } },
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform float uT, uK; uniform vec3 uC; uniform sampler2D uMap; varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main() { float f = pow(1.0 - abs(dot(vN, vV)), 2.2); float hx = texture2D(uMap, vUv * vec2(3.0, 2.0) + vec2(0.0, uT * 0.05)).r; float band = 0.5 + 0.5 * sin(vUv.y * 30.0 - uT * 3.0); gl_FragColor = vec4(uC * (f * 1.1 + hx * 0.18 * (0.6 + 0.4 * band) + 0.03) * uK, 1.0); }' });
    fx.shields = [0, 1].map(() => { const m = new T.Mesh(new T.SphereGeometry(0.62, 32, 20), shieldMat('#4ae8ff')); m.visible = false; m.renderOrder = 12; m.userData.live = true; K.add(m); return m; });
    // the ring of light walls (next tag wins)
    const st2 = scanTex();
    fx.ring = [0, 1, 2, 3].map(() => { const tx = st2.clone(); tx.needsUpdate = true; tx.wrapS = tx.wrapT = T.RepeatWrapping; const m = new T.Mesh(new T.PlaneGeometry(1, 1.3).translate(0, 0.65, 0), new T.MeshBasicMaterial({ map: tx, color: K3D.hot('#ffc53d', 1.4), transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false })); m.visible = false; m.renderOrder = 9; m.userData.live = true; K.add(m); return { m, tx }; });
    fx.update = (K2, st, dt, view) => update(fx, K2, st, dt, view);
    return fx;
  };

  // the normal of where a segment ended (for scorches and sparks)
  function endNormal(st, g) {
    if (g.nx != null) return [g.nx, g.nz];
    const hx = st.ring ? st.ring.hx : AR.HX, hz = st.ring ? st.ring.hz : AR.HZ;
    const ex = Math.abs(Math.abs(g.x1) - hx), ez = Math.abs(Math.abs(g.z1) - hz);
    return ex < ez ? [-Math.sign(g.x1), 0] : [0, -Math.sign(g.z1)];
  }
  function addScorch(fx, x, y, z, nx, nz, col, st) {
    fx.scorch.push({ x: x + nx * 0.015, y, z: z + nz * 0.015, a: Math.atan2(nx, nz), t: st.t, col, s: 0.8 + Math.random() * 0.5, r: Math.random() * 6 });
    if (fx.scorch.length > fx.NS) fx.scorch.shift();
  }
  const m4 = new T.Matrix4(), q4 = new T.Quaternion(), e3 = new T.Euler(), v3 = new T.Vector3(), s3 = new T.Vector3();

  function update(fx, K, st, dt, view) {
    const t = (fx.t += dt);
    const RM = !!(typeof reduceMotion !== 'undefined' && reduceMotion) || !!K3D.reduce;
    // ----- new events -----
    for (const e of st.fx) {
      if (e.n <= fx.seen) continue;
      if (e.k === 'fire') {
        const b = st.beams.find(x => x.n === e.n);
        const col = PCOL[e.who];
        if (b) {
          let mid = null;
          for (const p of b.paths) for (const g of p.segs) {
            if (!mid) mid = [(g.x0 + g.x1) / 2, (g.z0 + g.z1) / 2];
            if (g.end === 'mirror' || g.end === 'spent') { for (let i = 0; i < 10; i++) fx.spark.add(g.x1, BEAM_Y, g.z1, (Math.random() - 0.5) * 3 + (g.nx || 0) * 2, Math.random() * 2, (Math.random() - 0.5) * 3 + (g.nz || 0) * 2, i % 2 ? '#ffffff' : col, 0.35, 0.05, { g: 6, drag: 2 }); }
            else if (g.end === 'wall' || g.end === 'frame' || g.end === 'edge' || g.end === 'prism-block') {
              const [nx, nz] = endNormal(st, g);
              addScorch(fx, g.x1, BEAM_Y, g.z1, nx, nz, col, st);
              for (let i = 0; i < 16; i++) fx.spark.add(g.x1 + nx * 0.03, BEAM_Y, g.z1 + nz * 0.03, nx * (1 + Math.random() * 3) + (Math.random() - 0.5) * 2.5, Math.random() * 2.5, nz * (1 + Math.random() * 3) + (Math.random() - 0.5) * 2.5, i % 3 ? col : '#fff6dc', 0.45, 0.05, { g: 7, drag: 1.5 });
              fx.soft.add(g.x1 + nx * 0.1, BEAM_Y, g.z1 + nz * 0.1, nx * 0.3, 0.3, nz * 0.3, '#3a3040', 1.2, 0.18, { grow: 0.5, drag: 1.5 });
            } else if (g.end === 'ring') { for (let i = 0; i < 10; i++) fx.spark.add(g.x1, BEAM_Y, g.z1, (Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2, '#ffc53d', 0.4, 0.05, { g: 6 }); }
            if (b.used.long) for (let k = 0; k < 8; k++) { const u = Math.random(); fx.spark.add(g.x0 + (g.x1 - g.x0) * u, BEAM_Y, g.z0 + (g.z1 - g.z0) * u, (Math.random() - 0.5) * 0.4, 0.3 + Math.random() * 0.4, (Math.random() - 0.5) * 0.4, '#5aff8a', 1.2, 0.05, { drag: 1 }); }
          }
          const L = fx.lights[e.who]; if (mid) { L.l.position.set(mid[0], 1.2, mid[1]); L.k = 1; }
        }
        // the muzzle flash
        const s0 = b && b.paths[0] && b.paths[0].segs[0], mx = s0 ? s0.x0 : st.heroes[e.who].x, mz = s0 ? s0.z0 : st.heroes[e.who].z;
        for (let i = 0; i < 8; i++) fx.spark.add(mx, BEAM_Y, mz, (Math.random() - 0.5) * 1.5, Math.random() * 1.2, (Math.random() - 0.5) * 1.5, col, 0.25, 0.05, { drag: 3 });
      } else if (e.k === 'tag') {
        const col = PCOL[e.who], ocol = PCOL[e.on], o = st.heroes[e.on];
        for (let i = 0; i < 36; i++) { const a = Math.random() * 6.28, s = 1.5 + Math.random() * 3.5; fx.spark.add(o.x, BEAM_Y + 0.1, o.z, Math.cos(a) * s, 1 + Math.random() * 3, Math.sin(a) * s, i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? col : ocol, 0.6, 0.07, { g: 7, drag: 1.6 }); }
        fx.rings.push({ x: o.x, z: o.z, t: st.t, col, big: e.bank });
        const L = fx.lights[2]; L.l.position.set(o.x, 1.4, o.z); L.k = 1.4;
        const w = e.bank ? 'BANK!' : 'ZAP!';
        const s = fx.burstSpr.find(x => x.userData.id === e.who && x.userData.w === w); if (s) { s.userData.t = 0; s.userData.x = o.x; s.userData.z = o.z; }
      } else if (e.k === 'shieldPop') {
        const o = st.heroes[e.who];
        for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, b2 = (Math.random() - 0.5) * 3; fx.spark.add(o.x + Math.cos(a) * 0.6, 0.5 + b2 * 0.15, o.z + Math.sin(a) * 0.6, Math.cos(a) * 3, 1 + Math.random() * 2, Math.sin(a) * 3, o.gold ? '#ffc53d' : '#4ae8ff', 0.7, 0.06, { g: 6, drag: 1.5 }); }
        const s = fx.burstSpr.find(x => x.userData.id === e.who && x.userData.w === 'BLOCK!'); if (s) { s.userData.t = 0; s.userData.x = o.x; s.userData.z = o.z; }
      } else if (e.k === 'pickup') {
        const h = st.heroes[e.who], c = ARCADELASER_PIECES.CAN_COL[e.kind];
        for (let i = 0; i < 30; i++) { const a = Math.random() * 6.28; fx.spark.add(h.x + Math.cos(a) * 0.4, 0.2, h.z + Math.sin(a) * 0.4, Math.cos(a) * 0.6, 1.5 + Math.random() * 2.5, Math.sin(a) * 0.6, i % 2 ? c : '#ffffff', 0.9, 0.06, { drag: 1.2 }); }
        fx.rings.push({ x: h.x, z: h.z, t: st.t, col: c });
      } else if (e.k === 'dodge') {
        const h = st.heroes[e.who];
        fx.rings.push({ x: h.x, z: h.z, t: st.t, col: '#fff6dc', y: 0.05 });
        for (let i = 0; i < 12; i++) fx.spark.add(h.x, BEAM_Y, h.z, (Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3, '#fff6dc', 0.4, 0.05, { drag: 3 });
      } else if (e.k === 'land' || e.k === 'jump') {
        const h = st.heroes[e.who];
        for (let i = 0; i < (e.k === 'land' ? 8 : 5); i++) { const a = Math.random() * 6.28; fx.soft.add(h.x + Math.cos(a) * 0.2, 0.05, h.z + Math.sin(a) * 0.2, Math.cos(a) * 0.8, 0.2, Math.sin(a) * 0.8, '#4a4050', 0.6, 0.12, { grow: 0.3, drag: 3 }); }
      } else if (e.k === 'riserUp' || e.k === 'riserDown') {
        const q = st.layout[e.i]; if (q) for (let i = 0; i < 14; i++) fx.soft.add(q.x + (Math.random() - 0.5) * (q.w || 1), 0.1, q.z + (Math.random() - 0.5) * (q.d || 1), (Math.random() - 0.5) * 0.8, 0.5, (Math.random() - 0.5) * 0.8, '#5a5060', 0.9, 0.2, { grow: 0.4, drag: 2 });
      } else if (e.k === 'roundWon') {
        const h = st.heroes[e.who];
        for (let i = 0; i < (RM ? 30 : 120); i++) fx.spark.add(h.x + (Math.random() - 0.5) * 3, 3 + Math.random() * 2, h.z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2, ['#ffc53d', PCOL[e.who], '#ffffff', '#5aff8a', '#ff5ad6'][i % 5], 2.4, 0.07, { g: 1.6, drag: 1.2 });
      }
    }
    fx.seen = st.fxN;

    // ----- beams -----
    const B = fx.beams; B.begin();
    const Sp = fx.spr; Sp.begin();
    for (const b of st.beams) {
      const age = st.t - b.t; if (age > LINGER || age < 0) continue;
      const k = age < 0.05 ? 1.6 - age * 6 : Math.max(0, 1 - (age - 0.05) / (LINGER - 0.05)) ** 1.5;
      const col = PCOL[b.who], w = 0.22 * (age < 0.05 ? 1.35 : 1) * (b.used.wide ? 0.85 : 1);
      for (const p of b.paths) for (const g of p.segs) {
        B.add(g.x0, BEAM_Y, g.z0, g.x1, BEAM_Y, g.z1, w, col, 1.4 * k, false);
        B.add(g.x0, 0.012, g.z0, g.x1, 0.012, g.z1, 0.38, col, 0.35 * k, true);
        if (g.end !== 'edge' || true) Sp.add(g.x1, BEAM_Y, g.z1, g.end === 'mirror' ? 0.9 : 0.6, col, 1.6 * k, 3);
        if (g.end === 'hero') Sp.add(g.x1, BEAM_Y, g.z1, 1.6, '#ffffff', 1.5 * k, 0);
      }
    }
    // ----- the aiming lines and the tells -----
    for (const h of st.heroes) {
      const col = PCOL[h.id];
      if (h.line && h.fire && (h.fire.st === 'aim' || h.fire.st === 'tell')) {
        const tell = h.fire.st === 'tell';
        let run = (t * 2.2) % 0.24;
        for (const g of h.line.segs) {
          const dx = g.x1 - g.x0, dz = g.z1 - g.z0, L = Math.hypot(dx, dz);
          for (let u = run; u < L; u += 0.24) {
            const x = g.x0 + dx * u / L, z = g.z0 + dz * u / L;
            Sp.add(x, BEAM_Y, z, 0.075, col, tell ? 2.4 : 1.6, 4);
            Sp.add(x, 0.015, z, 0.07, col, 0.35, 4);
          }
          run = (run + 0.24 - (L % 0.24)) % 0.24;
          if (g.end === 'mirror') Sp.add(g.x1, BEAM_Y, g.z1, 0.26, col, 2.2, 2);
          if (g.end === 'hero') { Sp.add(g.x1, BEAM_Y, g.z1, 0.9 + Math.sin(t * 12) * 0.08, col, 2.4, 1); Sp.add(g.x1, BEAM_Y, g.z1, 0.5, '#ffffff', 1.2, 1); }
          else if (g.end !== 'mirror') Sp.add(g.x1, BEAM_Y, g.z1, 0.22, col, 1.6, 1);
        }
      }
      // the tell: the emitter swells, a ring tightens
      if (h.fire && (h.fire.st === 'tell' || h.fire.st === 'tellTap')) {
        const u = Math.min(1, h.fire.t / S.TELL), [mx, mz] = CO.muzzle(h, h.fire.a);
        Sp.add(mx, BEAM_Y, mz, 0.25 + u * 0.45, col, 1.2 + u * 1.5, 0);
        Sp.add(mx, BEAM_Y, mz, 0.9 - u * 0.6, col, 1.8, 1);
        if (Math.random() < dt * 40) { const a = Math.random() * 6.28; fx.spark.add(mx + Math.cos(a) * 0.3, BEAM_Y + Math.sin(a) * 0.3, mz, -Math.cos(a) * 1.2, -Math.sin(a) * 1.2, 0, col, 0.2, 0.04, {}); }
      }
      // speed sparks from the heels; a green orbit while Long Bounce is loaded
      if (h.speedT > 0 && Math.hypot(h.vx, h.vz) > 1 && Math.random() < dt * 30) fx.spark.add(h.x, 0.1, h.z, -h.vx * 0.2 + (Math.random() - 0.5), 0.6, -h.vz * 0.2 + (Math.random() - 0.5), '#ffe24a', 0.4, 0.05, { g: 4 });
      if (h.longN > 0) for (let k = 0; k < h.longN; k++) { const a = t * 3 + k * 2.09; Sp.add(h.x + Math.cos(a) * 0.5, h.y + 0.5 + Math.sin(t * 2 + k) * 0.1, h.z + Math.sin(a) * 0.5, 0.16, '#5aff8a', 1.8, 0); }
      if (h.wide) for (let k = -1; k <= 1; k++) { const [mx, mz] = CO.muzzle(h, h.face + k * 0.4); Sp.add(mx, BEAM_Y + 0.25, mz, 0.12, '#ff5ad6', 1.6, 0); }
    }
    // ----- scorches: hot in the beam's colour, cooling to a dark mark (10 s) -----
    let ns = 0;
    for (const s of fx.scorch) {
      const age = st.t - s.t; if (age > 10) continue;
      const fade = Math.max(0, 1 - age / 10);
      e3.set(0, s.a, s.r); q4.setFromEuler(e3); s3.set(s.s * (0.4 + 0.6 * fade), s.s * (0.4 + 0.6 * fade), 1); v3.set(s.x, s.y, s.z);
      m4.compose(v3, q4, s3); fx.scorchMesh.setMatrixAt(ns++, m4);
      if (age < 1.5) Sp.add(s.x, s.y, s.z, 0.35 * s.s, s.col, 1.6 * (1 - age / 1.5), 0);
      else if (age < 6) Sp.add(s.x, s.y, s.z, 0.12, '#ff8a4a', 0.4 * (1 - (age - 1.5) / 4.5), 0);
    }
    fx.scorchMesh.count = ns; fx.scorchMesh.instanceMatrix.needsUpdate = true;
    // ----- rings on the floor (tags, pickups, dodges) -----
    fx.rings = fx.rings.filter(r => st.t - r.t < 0.7);
    for (const r of fx.rings) { const u = (st.t - r.t) / 0.7; Sp.add(r.x, r.y != null ? r.y + BEAM_Y : BEAM_Y, r.z, (r.big ? 3.2 : 2.2) * (0.3 + u), r.col, 2 * (1 - u), 1); }
    // ----- the comic bursts -----
    for (const s of fx.burstSpr) {
      const u = s.userData; u.t += dt;
      s.visible = u.t < 0.75;
      if (s.visible) { const k = u.t < 0.12 ? u.t / 0.12 * 1.15 : u.t < 0.2 ? 1.15 - (u.t - 0.12) / 0.08 * 0.15 : 1; const sz = (u.w === 'BANK!' ? 1.5 : 1.25) * k; s.scale.set(sz, sz, 1); s.position.set(u.x, 1.6 + u.t * 0.5, u.z); s.material.opacity = u.t > 0.55 ? 1 - (u.t - 0.55) / 0.2 : 1; s.material.rotation = Math.sin(u.t * 6) * 0.06; }
    }
    // ----- shields -----
    for (const h of st.heroes) {
      const m = fx.shields[h.id]; m.visible = h.shield > 0;
      if (m.visible) { m.position.set(h.x, h.y + 0.45, h.z); m.material.uniforms.uT.value = t; m.material.uniforms.uC.value.set(h.gold ? '#ffc53d' : '#4ae8ff'); const warn = !h.gold && h.shieldT < 3 ? (Math.sin(t * 10) > 0 ? 1 : 0.4) : 1; m.material.uniforms.uK.value = warn; m.rotation.y = t * 0.4; }
    }
    // ----- the ring of light walls -----
    const rg = st.ring;
    fx.ring.forEach((w, i) => {
      w.m.visible = !!rg;
      if (!rg) return;
      const horiz = i < 2, s = i % 2 ? 1 : -1;
      if (horiz) { w.m.position.set(0, 0, s * rg.hz); w.m.scale.set(rg.hx * 2, 1, 1); w.m.rotation.y = 0; }
      else { w.m.position.set(s * rg.hx, 0, 0); w.m.scale.set(rg.hz * 2, 1, 1); w.m.rotation.y = Math.PI / 2; }
      w.tx.repeat.set((horiz ? rg.hx : rg.hz) * 2, 1); w.tx.offset.y = -t * 0.6;
      w.m.material.color.set('#ffc53d').multiplyScalar(1.0 + Math.sin(t * 3) * 0.15);
      if (Math.random() < dt * 20) { const u = (Math.random() - 0.5) * 2; const x = horiz ? u * rg.hx : s * rg.hx, z = horiz ? s * rg.hz : u * rg.hz; fx.spark.add(x, 0.05, z, 0, 0.8 + Math.random(), 0, '#ffc53d', 0.8, 0.05, {}); }
    });
    // ----- lights fade -----
    for (const L of fx.lights) { L.k = Math.max(0, L.k - dt * 4.5); L.l.intensity = L.k * 26; if (L.k <= 0) L.l.position.y = -20; }
    B.end(); Sp.end();
    fx.spark.step(dt); fx.soft.step(dt);
  }
  return F;
})();
