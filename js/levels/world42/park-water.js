/* Pip & Bo - World 42 Midnight Theme Park: water for the park kit (added for 42-2 Log Flume Plunge; any World 42 level
   may use it, e.g. a boating lake you ride on). Loaded on demand with the 3D kit, after park-kit.js; it adds to PARK and
   changes nothing that was there.

   PARK.water(K, o) -> w   a toon water surface laid along a rail (RAIL3) between two banks:
       o = { R, w: s => half width, s0, s1, step (0.5), over (how far it reaches under the banks, 0.6),
             deep, mid, line, foam (colours), steep (s => 0..1 extra white water, e.g. weirs and rapids) }
       The surface follows the rail's height (a drop is a sloping chute of white water). Painted flow lines move
       downstream at the current's own speed (the rail's v), so they stretch out where it is fast; foam frays along both
       banks and boils on steep water. A cool moonlit sheen and the park's warm glow tint it by the view angle.
     w.reflect(x, y, z, col, len, wid, k)   a light's reflection: a soft streak lying on the water that smears toward
                                            the viewer and wobbles with the ripples (one instanced family for them all)
     w.foamAt(list)                         foam rings round things standing in the water: [{ x, y, z, r }]
     w.mesh, w.u (uniforms: uT ...)
   THE WATER MOVES (one wave field, the same sums on the graphics card and here, so everything rides the same water):
     - a swell: three trains of waves crossing each other, each travelling at the speed real waves of its length do;
     - chop on steep and fast water (weirs, rapids, chutes), on top of the swell;
     - rings: w.ring(x, z, amp) drops a ring wave that spreads from that place, sinks with distance and dies in a few
       seconds (a paddle's bite, a splashdown, a thing falling in); up to 12 at once.
     w.h(x, z)          the height of the swell and rings over the still surface at a place, now (calm water)
     w.hAt(s, x, z)     the same with the place's own chop and stillness (s along the rail); what a boat should float on
     o.calm (s => 0..1) stills the water in places (e.g. on a lift's belt)
     The surface itself heaves (its points are lifted), and is lit by its slopes: moon glints, sky on the far faces,
     light crests and dark troughs. Reflections and foam rings ride it too.
   PARK.waterTex()   the painted flow-line picture (repeats)
   Display only: nothing here is read by any level's rules. */
'use strict';

(function () {
  const T = K3D.T;
  const P = PARK, rnd = P.rnd;

  P.waterTex = () => K3D.paint('pk-waterflow', 256, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    // long soft streaks (the flow), each a tapered dash; some short bright glints among them
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w, y = rnd() * h, len = 30 + rnd() * 90, wd = 1.2 + rnd() * 2.6, a = 0.25 + rnd() * 0.5;
      const g = c.createLinearGradient(0, y, 0, y + len); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(x, y + len / 2, wd, len / 2, 0, 0, Math.PI * 2); c.fill();
      if (y + len > h) { c.beginPath(); c.ellipse(x, y + len / 2 - h, wd, len / 2, 0, 0, Math.PI * 2); c.fill(); }
    }
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,255,${0.4 + rnd() * 0.5})`; const x = rnd() * w, y = rnd() * h; c.beginPath(); c.ellipse(x, y, 1 + rnd() * 2, 3 + rnd() * 6, 0, 0, Math.PI * 2); c.fill(); }
  }, { repeat: true });
  // foam: a lacy, bubbly picture (repeats)
  P.foamTex = () => K3D.paint('pk-foam', 256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (let i = 0; i < 420; i++) {
      const x = rnd() * w, y = rnd() * h, r = 2 + rnd() * 9;
      c.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.5})`; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(0,0,0,1)'; c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(x + r * 0.2, y - r * 0.1, r * 0.55, 0, Math.PI * 2); c.fill(); c.globalCompositeOperation = 'source-over';
    }
  }, { repeat: true });

  // the wave field: the same sums in GLSL (PARK.waveGLSL, with the uniforms PARK.waveU()) and in JS (PARK.waveH)
  const A0 = 0.09, NR = 12;
  const TR = [[0.5, 0.773, 0.580, 1.85, 0], [0.3, -0.827, 1.432, 2.4, 1.3], [0.2, 0.82, -2.595, 3.1, 2.1]]; // [share, kx, kz, speed, phase]
  P.waveGLSL = `uniform float uWT; uniform vec4 uRing[${NR}];
    float pkWave(vec2 p) { return ${A0.toFixed(3)} * (${TR.map(w => `${w[0].toFixed(2)} * sin(dot(p, vec2(${w[1].toFixed(3)}, ${w[2].toFixed(3)})) - uWT * ${w[3].toFixed(2)} + ${w[4].toFixed(2)})`).join(' + ')}); }
    float pkChop(vec2 p) { return 0.10 * sin(dot(p, vec2(3.1, 2.2)) - uWT * 6.0) * sin(dot(p, vec2(-2.4, 3.4)) + uWT * 4.7); }
    float pkRings(vec2 p) { float h = 0.0; for (int i = 0; i < ${NR}; i++) { vec4 r = uRing[i]; float age = uWT - r.z; if (r.w == 0.0 || age < 0.0 || age > 5.0) continue;
      float d = distance(p, r.xy), fr = 2.2 * age, q = (d - fr) / (0.9 + 0.5 * age); h += r.w * exp(-age / 1.6) / (1.0 + 0.4 * d) * sin(3.927 * (d - fr)) * exp(-q * q); } return h; }`;
  let WU = null;
  P.waveU = () => WU || (WU = { uWT: { value: 0 }, uRing: { value: Array.from({ length: NR }, () => new T.Vector4(0, 0, -99, 0)) }, head: 0 });
  P.waveReset = () => { const u = P.waveU(); u.uWT.value = 0; u.head = 0; for (const r of u.uRing.value) r.set(0, 0, -99, 0); };
  P.waveH = (x, z) => {
    const u = P.waveU(), t = u.uWT.value;
    let h = 0; for (const w of TR) h += w[0] * Math.sin(x * w[1] + z * w[2] - t * w[3] + w[4]);
    h *= A0;
    for (const r of u.uRing.value) { const age = t - r.z; if (r.w === 0 || age < 0 || age > 5) continue; const d = Math.hypot(x - r.x, z - r.y), fr = 2.2 * age, q = (d - fr) / (0.9 + 0.5 * age); h += r.w * Math.exp(-age / 1.6) / (1 + 0.4 * d) * Math.sin(3.927 * (d - fr)) * Math.exp(-q * q); }
    return h;
  };
  P.waveChop = (x, z) => { const t = P.waveU().uWT.value; return 0.10 * Math.sin(x * 3.1 + z * 2.2 - t * 6.0) * Math.sin(x * -2.4 + z * 3.4 + t * 4.7); };
  P.waveRing = (x, z, amp) => { const u = P.waveU(); u.uRing.value[u.head].set(x, z, u.uWT.value, amp); u.head = (u.head + 1) % NR; };

  P.water = function (K, o) {
    const R = o.R, s0 = o.s0 || 0, s1 = o.s1 != null ? o.s1 : R.len, step = o.step || 0.5, over = o.over != null ? o.over : 0.6;
    const n = Math.max(2, Math.ceil((s1 - s0) / step)), across = 16;
    const pos = [], uv = [], fl = [], idx = [], steeps = [], calms = [];
    P.waveReset(); const WV = P.waveU();
    // flow time: tau(s) = the time the current takes to reach s (so the lines move at the current's own speed)
    let tau = 0, prev = s0;
    for (let i = 0; i <= n; i++) {
      const s = s0 + (s1 - s0) * i / n, f = R.at(s), hw = o.w(s) + over;
      tau += (s - prev) / Math.max(0.4, f.v); prev = s;
      const steep = Math.min(1, (o.steep ? o.steep(s) : 0) + Math.max(0, -f.pitch - 0.06) * 3.5);
      const calm = o.calm ? o.calm(s) : 1, chop = Math.min(1, steep + Math.max(0, f.v - 2.2) * 0.12);
      steeps.push(chop); calms.push(calm);
      for (let j = 0; j <= across; j++) {
        const a = -1 + 2 * j / across, p = R.local(s, a * hw, 0, f);
        pos.push(p[0], p[1], p[2]);
        uv.push(a * hw / Math.max(1, o.w(s)), tau);
        fl.push(steep, f.v, hw, calm, chop);
      }
      if (i) for (let j = 0; j < across; j++) { const A = (i - 1) * (across + 1) + j, B = A + across + 1; idx.push(A, A + 1, B, A + 1, B + 1, B); } // (wound to face up)
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('aUV', new T.Float32BufferAttribute(uv, 2));
    g.setAttribute('aF', new T.InterleavedBufferAttribute(new T.InterleavedBuffer(new Float32Array(fl), 5), 3, 0));
    g.setAttribute('aK', new T.InterleavedBufferAttribute(g.getAttribute('aF').data, 2, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const col = (h, k = 1) => new T.Color(h).multiplyScalar(k);
    const u = {
      uT: { value: 0 }, uFlow: P.waterTex(), uFoamT: P.foamTex(),
      uDeep: { value: col(o.deep || '#0a2a4a') }, uMid: { value: col(o.mid || '#1f5a7e') }, uLine: { value: col(o.line || '#9fd0ff', 0.55) }, uFoam: { value: col(o.foam || '#e8f4ff', 1.1) },
      uGlow: { value: col('#ff9a5a', 0.05) }, uMoon: { value: col('#b9c8ff', 0.14) }, uCam: { value: new T.Vector3() },
      uWT: WV.uWT, uRing: WV.uRing, uSky: { value: col(o.sky || '#4a4f98', 0.55) }, uMoonDir: { value: new T.Vector3(0.25, 0.35, -0.9).normalize() }, uMoonCol: { value: col('#dfe6ff', 0.9) },
      uFog: { value: K.fogCol || new T.Color('#1b1a3c') }, uFogD: { value: K.scene.fog ? K.scene.fog.density : 0.002 },
    };
    u.uFlow = { value: u.uFlow }; u.uFoamT = { value: u.uFoamT };
    const mat = new T.ShaderMaterial({ uniforms: u,
      vertexShader: `attribute vec2 aUV; attribute vec3 aF; attribute vec2 aK; varying vec2 vUV; varying vec3 vF; varying vec3 vW; varying vec3 vN; varying float vH;
        ${P.waveGLSL}
        float hAt(vec2 p) { return aK.x * (pkWave(p) + pkRings(p) + aK.y * pkChop(p)); }
        void main() { vUV = aUV; vF = aF; vec4 w = modelMatrix * vec4(position, 1.0);
          // the surface heaves; its slopes (for the light) from the heights a little way off
          float h = hAt(w.xz), e = 0.3; vN = normalize(vec3(-(hAt(w.xz + vec2(e, 0.0)) - h) / e, 1.0, -(hAt(w.xz + vec2(0.0, e)) - h) / e));
          w.y += h; vH = h; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `varying vec2 vUV; varying vec3 vF; varying vec3 vW; varying vec3 vN; varying float vH;
        uniform float uT, uFogD; uniform sampler2D uFlow, uFoamT; uniform vec3 uDeep, uMid, uLine, uFoam, uGlow, uMoon, uCam, uFog, uSky, uMoonDir, uMoonCol;
        void main() {
          vec3 nn = normalize(vN), vv = normalize(uCam - vW);
          float ax = abs(vUV.x);
          // flow coordinate: tau minus time, scaled; lines a little wavy across
          float fy = (vUV.y - uT) * 0.55;
          vec2 q = vec2(vUV.x * 0.18 + sin(fy * 3.0 + vUV.x) * 0.02, fy * 0.5) + nn.xz * 0.05;
          float lines = texture2D(uFlow, q).a * 0.8 + texture2D(uFlow, q * vec2(1.7, 0.8) + vec2(0.37, 0.11)).a * 0.5;
          // the base: deeper in the middle, lighter toward the banks
          vec3 c = mix(uDeep, uMid, smoothstep(0.1, 1.0, ax) * 0.75 + 0.15);
          // toon bands of light on the ripples
          float rip = sin(vW.x * 1.3 + uT * 1.7) * sin(vW.z * 1.1 - uT * 1.3) + 0.6 * sin((vW.x - vW.z) * 2.3 + uT * 2.6);
          c += uLine * 0.3 * (step(1.1, rip) - step(1.22, rip));
          c += uLine * step(0.55, lines) * 0.9 + uLine * smoothstep(0.25, 0.55, lines) * 0.25;
          // lit by its slopes: light crests and dark troughs, the sky on the faces turned away, the moon's glint
          c *= 1.0 - 0.3 * smoothstep(-0.01, -0.075, vH);
          c += uLine * 0.3 * smoothstep(0.025, 0.09, vH);
          c = mix(c, uSky, pow(1.0 - max(dot(nn, vv), 0.0), 3.0) * 0.4);
          float sp = pow(max(dot(nn, normalize(uMoonDir + vv)), 0.0), 120.0);
          c += uMoonCol * (step(0.6, sp) * 0.14 + sp * 0.3);
          // view tint: a moonlit sheen far off, the park's warm glow close in
          vec3 vd = normalize(vW - uCam); float graze = 1.0 - abs(vd.y);
          c += uMoon * pow(graze, 3.0) * 0.8 + uGlow * (0.5 + 0.5 * sin(vW.x * 0.07 + vW.z * 0.05));
          // foam: frayed along the banks (vF.z is the half width), boiling on steep water
          float fo = texture2D(uFoamT, vec2(vUV.x * vF.z * 0.22, fy * 1.6)).a;
          float fo2 = texture2D(uFoamT, vec2(vUV.x * vF.z * 0.31 + 0.5, fy * 2.3 + 0.3)).a;
          float bank = smoothstep(0.78, 0.98, ax + (fo2 - 0.5) * 0.12);
          float white = max(bank * step(0.35, fo), vF.x * step(0.25, fo * 0.6 + fo2 * 0.6));
          white = max(white, vF.x * 0.55);
          c = mix(c, uFoam, clamp(white, 0.0, 1.0));
          float d = length(vW - uCam); c = mix(uFog * 0.8, c, exp(-uFogD * uFogD * d * d));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`, fog: false });
    const mesh = new T.Mesh(g, mat); mesh.receiveShadow = false; mesh.castShadow = false; mesh.renderOrder = 0; mesh.userData.live = true;
    K.add(mesh);
    K.tick(dt => { u.uT.value += dt; WV.uWT.value += dt; u.uCam.value.copy(K.camera.position); if (K.moonDir) u.uMoonDir.value.copy(K.moonDir); });

    /* reflections: soft streaks lying on the water, smeared toward the viewer, wobbling with the ripples */
    const MAXR = o.maxReflect || 2500;
    const rg = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const rmat = new T.ShaderMaterial({ uniforms: { uT: u.uT, uTex: { value: P.streakTex() }, uWT: WV.uWT, uRing: WV.uRing }, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: `attribute vec3 aC; attribute float aPh; varying vec3 vC; varying vec2 vUv; varying float vPh;
        ${P.waveGLSL}
        void main() { vC = aC; vUv = uv; vPh = aPh; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); w.y += pkWave(w.xz) + pkRings(w.xz); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uT; uniform sampler2D uTex; varying vec3 vC; varying vec2 vUv; varying float vPh;
        void main() { vec2 q = vUv; q.x += sin(q.y * 26.0 - uT * 3.0 + vPh) * 0.07 + sin(q.y * 61.0 + uT * 5.0) * 0.03;
          float a = texture2D(uTex, q).a; float br = 0.65 + 0.35 * step(0.0, sin(q.y * 40.0 - uT * 2.2 + vPh));
          gl_FragColor = vec4(vC * a * br, 1.0); }` });
    const rim = new T.InstancedMesh(rg, rmat, MAXR); rim.count = 0; rim.frustumCulled = false; rim.renderOrder = 2;
    const aC = new Float32Array(MAXR * 3), aPh = new Float32Array(MAXR);
    rg.setAttribute('aC', new T.InstancedBufferAttribute(aC, 3)); rg.setAttribute('aPh', new T.InstancedBufferAttribute(aPh, 1));
    K.add(rim);
    const refl = [];
    const m4 = new T.Matrix4(), q = new T.Quaternion(), sv = new T.Vector3(), pv = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    K.tick(() => {
      const cp = K.camera.position;
      for (let i = 0; i < refl.length; i++) {
        const r = refl[i], a = Math.atan2(cp.x - r.x, cp.z - r.z);
        const hd = Math.hypot(cp.x - r.x, cp.z - r.z) + 0.01, steep = (cp.y - r.y) / hd, len = Math.max(r.wid * 1.4, r.len / (1 + steep * steep * 3));
        q.setFromAxisAngle(up, a);
        pv.set(r.x + Math.sin(a) * len * 0.42, r.y + 0.03, r.z + Math.cos(a) * len * 0.42);
        m4.compose(pv, q, sv.set(r.wid, 1, len)); rim.setMatrixAt(i, m4);
      }
      rim.instanceMatrix.needsUpdate = true;
    });
    const at = s => Math.max(0, Math.min(n, Math.round((s - s0) / (s1 - s0) * n)));
    const W = { mesh, u, rim,
      // the water's height over its still level: the swell and rings; with the place's own chop and stillness
      h: (x, z) => P.waveH(x, z),
      hAt(s, x, z) { const i = at(s); return calms[i] * (P.waveH(x, z) + steeps[i] * P.waveChop(x, z)); },
      ring: (x, z, amp) => P.waveRing(x, z, amp),
      reflect(x, y, z, c, len = 4, wid = 0.8, k = 0.5) {
        if (refl.length >= MAXR) return;
        const i = refl.length, cc = new T.Color(c).multiplyScalar(k);
        aC[i * 3] = cc.r; aC[i * 3 + 1] = cc.g; aC[i * 3 + 2] = cc.b; aPh[i] = rnd() * 6.28;
        refl.push({ x, y, z, len, wid }); rim.count = refl.length;
        rg.attributes.aC.needsUpdate = true; rg.attributes.aPh.needsUpdate = true;
      },
      // foam rings round things standing in the water (posts, rocks, a fountain's rim)
      foamAt(list) {
        const fg = new T.RingGeometry(0.8, 1.25, 28, 1).rotateX(-Math.PI / 2);
        const fm = new T.MeshBasicMaterial({ map: P.foamTex(), color: new T.Color('#dff0ff').multiplyScalar(0.8), transparent: true, depthWrite: false, toneMapped: false });
        // (the rings ride the water)
        fm.onBeforeCompile = sh => { sh.uniforms.uWT = WV.uWT; sh.uniforms.uRing = WV.uRing;
          sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + P.waveGLSL).replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec4 wq = modelMatrix * instanceMatrix * vec4(transformed, 1.0); transformed.y += pkWave(wq.xz) + pkRings(wq.xz); }'); };
        fm.customProgramCacheKey = () => 'pk-foamring';
        const im = new T.InstancedMesh(fg, fm, Math.max(1, list.length)); im.frustumCulled = false; im.renderOrder = 1;
        list.forEach((f, i) => { m4.compose(pv.set(f.x, f.y + 0.02, f.z), q.setFromAxisAngle(up, rnd() * 6), sv.set(f.r, 1, f.r)); im.setMatrixAt(i, m4); });
        im.count = list.length; K.add(im);
        let t = 0; K.tick(dt => { t += dt; fm.map.offset.set(t * 0.03, t * 0.05); });
        return im;
      },
    };
    return W;
  };
})();
