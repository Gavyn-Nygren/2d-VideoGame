/* Pip & Bo - World 42 Midnight Theme Park: the shared park kit (PARK). Loaded on demand with the 3D kit (K3D.files,
   pushed by the World 42 levels), so it may use three.js (K3D.T) at load time.

   Starlight Park, an old seaside amusement park, long after closing: lit by itself. Everything a World 42 level reuses:
     PARK.night(K, o)            the night: sky dome (blue-violet, a warm glow low over the park), stars that twinkle,
                                 a big moon with its halo, thin drifting cloud, the lights (moonlight, a warm uplight
                                 from the park, a blue ambient), fog, bloom on. Returns { sky, moon }.
     PARK.bulbs(K, max)          one instanced family of light bulbs (thousands in one draw call). b.add(x, y, z, col,
                                 o = { phase, speed, size, steady }); b.line(a, b, gap, col, o); b.ring(c, r, n, col, o,
                                 axis); b.done(). Chase patterns run in the shader from uTime (no per-bulb work).
                                 The park "switches on" in a wave: PARK.wave(K, x, z, t) (b.u.uWave).
     PARK.neon(K, text, o)       a neon sign on a dark board (flickers and buzzes now and then); o = { w, h, col, col2,
                                 font, flicker }
     PARK.stall(K, o)            a game stall (striped awning, counter, prizes, bulbs on the awning's edge)
     PARK.tent(K, o)             a big striped tent with a flag; PARK.booth(K, o) a ticket booth; PARK.cart(K, kind) a
                                 popcorn or candy-floss cart (popcorn steams)
     PARK.lamp(K, o)             a park lamp post (glass globes, moths round it); PARK.lanterns(K, a, b, o) a string of
                                 paper lanterns between two posts
     PARK.flags(K, a, b, o)      bunting between two points (flaps in the wind, in the shader)
     PARK.balloons(K, x, y, z)   a bunch of balloons tugging at their strings
     PARK.bench / bin / sign / hedgeAnimal / tree / fence / robot (a wind-up mascot sweeper that trundles about)
     PARK.ride(K, kind, o)       the rides as animated set pieces: 'wheel' (ferris wheel), 'carousel', 'swings',
                                 'drop' (drop tower), 'teacups', 'flume' (log flume with splashes); each lit with bulbs
     PARK.sea(K, o)              the sea with moonlight glitter, the beach, the pier with its bulbs and a little wheel
     PARK.lake(K, o)             a boating lake (still water, swan boats, reflections)
     PARK.ground(K, o)           the wet ground: paving that shines, light streaks under bright things (PARK.glint)
     PARK.fireworks(K)           bursts: f.burst(x, y, z, col, t), f.auto(on); bloom makes them glow
     PARK.gulls(K, list)         gulls asleep on roofs that take off when the train roars past (g.scare(x, z))
   Every animated piece adds its own ticker (K.tick), driven by the drawn frame's clock: scenery only, never rules.
   Level-only things (the coaster, its track and hazards) live in the level's own files. */
'use strict';

const PARK = (function () {
  const T = K3D.T;
  const P = {};
  const hot = (hex, k) => new T.Color(hex).multiplyScalar(k);
  const rnd = (() => { let s = 4242; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  P.rnd = rnd;
  P.seed = n => { /* rnd is a fixed sequence per load: scenery only */ void n; };
  const M = (key, make) => K3D.mat('park|' + key, make);
  P.toonM = (col, o) => M('t|' + col + (o ? JSON.stringify(o) : ''), () => K3D.toon(col, o));
  P.flatM = (col, k = 1, o) => M('f|' + col + '|' + k + (o ? JSON.stringify(o) : ''), () => K3D.flat(hot(col, k), o));
  const toonM = P.toonM;
  const mesh = (geo, mat, o) => K3D.mesh(geo, mat, o);
  P.INK = '#1a1530';

  /* ---------- painted textures ---------- */
  P.stripes = (a, b, n = 8, o = {}) => K3D.paint('pk-stripe|' + a + b + n + (o.v ? 'v' : 'h') + (o.scallop ? 's' : ''), 256, 256, (c, w, h) => {
    c.fillStyle = a; c.fillRect(0, 0, w, h);
    c.fillStyle = b;
    for (let i = 0; i < n; i++) if (i % 2) { if (o.v) c.fillRect(0, i * h / n, w, h / n); else c.fillRect(i * w / n, 0, w / n, h); }
    // paint wear: chips and streaks (old, much-loved)
    for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(0,0,0,${0.03 + rnd() * 0.05})`; c.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 10, 1 + rnd() * 3); }
    for (let i = 0; i < 25; i++) { c.fillStyle = `rgba(255,255,255,${0.04 + rnd() * 0.05})`; c.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 6, 1); }
  }, { repeat: true });
  P.wood = (col = '#8a5a34') => K3D.paint('pk-wood|' + col, 128, 256, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { c.strokeStyle = `rgba(40,20,10,${0.08 + rnd() * 0.12})`; c.lineWidth = 1 + rnd() * 2; c.beginPath(); const x = rnd() * w; c.moveTo(x, 0); c.bezierCurveTo(x + rnd() * 8 - 4, h * 0.3, x + rnd() * 8 - 4, h * 0.7, x + rnd() * 6 - 3, h); c.stroke(); }
    for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(40,20,10,0.25)'; c.beginPath(); c.ellipse(rnd() * w, rnd() * h, 3, 7, 0, 0, Math.PI * 2); c.fill(); }
  }, { repeat: true });
  P.paving = () => K3D.paint('pk-paving', 512, 512, (c, w, h) => {
    c.fillStyle = '#34324a'; c.fillRect(0, 0, w, h);
    const n = 8, sz = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const off = (y % 2) * sz / 2, l = 40 + rnd() * 16;
      c.fillStyle = `hsl(${240 + rnd() * 20}, 12%, ${l * 0.5}%)`; c.fillRect(x * sz + off + 2, y * sz + 2, sz - 4, sz - 4);
      if (x === n - 1 && off) c.fillRect(off - sz + 2, y * sz + 2, sz - 4, sz - 4);
    }
    // wet: shiny patches and puddles
    for (let i = 0; i < 5; i++) { const g = c.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, 'rgba(160,170,230,0.13)'); g.addColorStop(1, 'rgba(160,170,230,0)'); c.save(); c.translate(rnd() * w, rnd() * h); c.scale(20 + rnd() * 50, 10 + rnd() * 20); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.fill(); c.restore(); }
    for (let i = 0; i < 200; i++) { c.fillStyle = `rgba(255,255,255,${rnd() * 0.06})`; c.fillRect(rnd() * w, rnd() * h, 1, 1); }
  }, { repeat: true });
  P.grass = () => K3D.paint('pk-grass', 256, 256, (c, w, h) => {
    c.fillStyle = '#223a33'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) { c.fillStyle = `hsl(${140 + rnd() * 30}, ${25 + rnd() * 20}%, ${12 + rnd() * 14}%)`; c.fillRect(rnd() * w, rnd() * h, 1, 2 + rnd() * 3); }
  }, { repeat: true });
  // a soft round glow (halos, reflections)
  P.glowTex = () => K3D.paint('pk-glow', 128, 128, (c, w, h) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  P.streakTex = () => K3D.paint('pk-streak', 64, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.15, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const g2 = c.createLinearGradient(0, 0, w, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(0.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)');
    c.globalCompositeOperation = 'destination-out'; c.fillStyle = g2; c.fillRect(0, 0, w, h);
  });

  /* ---------- the night ---------- */
  P.night = function (K, o = {}) {
    const fogCol = new T.Color(o.fog || '#1b1a3c');
    K.scene.background = new T.Color('#0d0d24');
    K.scene.fog = new T.FogExp2(fogCol, o.fogD != null ? o.fogD : 0.0021);
    K.fogCol = fogCol;
    // lights: a cool moon (the one shadow), a blue-violet ambient, and a warm uplight from the park's own bulbs
    K.amb.color.set('#6c6fb8'); K.amb.intensity = 0.36 * Math.PI;
    K.sun.color.set('#b9c4ff'); K.sun.intensity = 0.34 * Math.PI;
    K.sunDir.set(0.35, 0.9, -0.6).normalize();
    const hemi = new T.HemisphereLight('#3a3f8a', '#ffb070', 0.32 * Math.PI); K.scene.add(hemi); K.hemi = hemi;
    K.bloom = { strength: o.bloom != null ? o.bloom : 0.9, threshold: 1.05, radius: 1.1 };
    K.maxBlur = 1.8; K.focusRange = 60;
    // the sky dome
    const skyMat = new T.ShaderMaterial({
      uniforms: { top: { value: new T.Color('#090a22') }, mid: { value: new T.Color('#24205a') }, low: { value: new T.Color('#5b3a74') }, glow: { value: new T.Color('#ff9a6a') }, uT: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vP; uniform vec3 top, mid, low, glow; uniform float uT;
        void main() { float y = vP.y;
          vec3 c = mix(mid, top, smoothstep(0.08, 0.7, y));
          c = mix(low, c, smoothstep(-0.02, 0.16, y));
          // the park's glow on the low sky (warm, uneven), and a cooler band over the sea (north, -z)
          float park = smoothstep(0.22, 0.0, y) * (0.55 + 0.45 * smoothstep(0.2, -0.8, vP.z)) * (0.8 + 0.2 * sin(atan(vP.x, vP.z) * 5.0));
          c += glow * park * 0.32;
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
      side: T.BackSide, depthWrite: false, fog: false,
    });
    const sky = new T.Mesh(new T.SphereGeometry(900, 48, 24), skyMat);
    sky.renderOrder = -10; sky.frustumCulled = false; K.scene.add(sky);
    // stars: points that twinkle (a few hundred big ones, bright enough to bloom a little)
    {
      const n = 1400, pos = new Float32Array(n * 3), ph = new Float32Array(n), sz = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, y = 0.06 + Math.pow(rnd(), 0.8) * 0.94, r = Math.sqrt(1 - y * y);
        pos[i * 3] = Math.cos(a) * r * 850; pos[i * 3 + 1] = y * 850; pos[i * 3 + 2] = Math.sin(a) * r * 850;
        ph[i] = rnd() * 6.28; sz[i] = rnd() < 0.08 ? 3.6 : 1.4 + rnd() * 1.4;
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aPh', new T.BufferAttribute(ph, 1)); g.setAttribute('aSz', new T.BufferAttribute(sz, 1));
      const m = new T.ShaderMaterial({ uniforms: { uT: { value: 0 }, uPx: { value: 1 } }, transparent: true, depthWrite: false, fog: false, blending: T.AdditiveBlending,
        vertexShader: 'attribute float aPh, aSz; uniform float uT, uPx; varying float vA; void main() { vA = 0.55 + 0.45 * sin(uT * (1.3 + fract(aPh) * 2.0) + aPh * 7.0); gl_PointSize = aSz * uPx; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'varying float vA; void main() { vec2 q = gl_PointCoord - 0.5; float d = length(q); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vec3(0.9, 0.92, 1.0) * a * vA * 1.4, 1.0); }' });
      const stars = new T.Points(g, m); stars.frustumCulled = false; stars.renderOrder = -9; K.scene.add(stars);
      K.tick(dt => { m.uniforms.uT.value += dt; m.uniforms.uPx.value = Math.max(1, K3D.R.domElement.height / 720); stars.position.copy(K.camera.position); sky.position.copy(K.camera.position); });
    }
    // the moon: a painted disc (craters), a halo, and its glitter path on the sea (PARK.sea)
    const mo = o.moon || { x: -60, y: 120, z: -520, r: 34 };
    const moonTex = K3D.paint('pk-moon', 256, 256, (c, w, h) => {
      const g = c.createRadialGradient(110, 100, 10, 128, 128, 128); g.addColorStop(0, '#fffdf0'); g.addColorStop(0.8, '#f4ecd0'); g.addColorStop(1, '#e6d9b4');
      c.fillStyle = g; c.beginPath(); c.arc(128, 128, 126, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 18; i++) { const x = 40 + rnd() * 176, y = 40 + rnd() * 176, r = 6 + rnd() * 22; if (Math.hypot(x - 128, y - 128) + r > 122) continue; c.fillStyle = `rgba(170,160,130,${0.18 + rnd() * 0.18})`; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,255,240,0.25)'; c.beginPath(); c.arc(x - r * 0.2, y - r * 0.2, r * 0.7, 0, Math.PI * 2); c.fill(); }
    });
    const moon = new T.Group(); moon.position.set(mo.x, mo.y, mo.z); K.scene.add(moon);
    const disc = new T.Mesh(new T.CircleGeometry(mo.r, 48), new T.MeshBasicMaterial({ map: moonTex, color: hot('#ffffff', 1.25), transparent: true, fog: false, toneMapped: false, depthWrite: false }));
    moon.add(disc);
    const halo = new T.Mesh(new T.PlaneGeometry(mo.r * 6, mo.r * 6), new T.MeshBasicMaterial({ map: P.glowTex(), color: new T.Color('#9aa4ff').multiplyScalar(0.45), transparent: true, fog: false, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
    halo.position.z = -1; moon.add(halo);
    disc.renderOrder = -8; halo.renderOrder = -8.5;
    // thin cloud, drifting across the moon now and then
    const cloudTex = K3D.paint('pk-cloud', 512, 128, (c, w, h) => {
      for (let i = 0; i < 70; i++) { const x = 40 + rnd() * (w - 80), y = h / 2 + (rnd() - 0.5) * h * 0.4, r = 14 + rnd() * 30; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(190,190,240,0.18)'); g.addColorStop(1, 'rgba(190,190,240,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
    });
    const clouds = [];
    for (let i = 0; i < 9; i++) {
      const cl = new T.Mesh(new T.PlaneGeometry(260 + rnd() * 200, 50 + rnd() * 30), new T.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.55 + rnd() * 0.4, toneMapped: false }));
      const a = -Math.PI / 2 + (rnd() - 0.5) * 2.6, d = 560 + rnd() * 120;
      cl.position.set(Math.cos(a) * d, 90 + rnd() * 120, Math.sin(a) * d); cl.lookAt(0, cl.position.y * 0.6, 0);
      cl.renderOrder = -7; K.scene.add(cl); clouds.push({ m: cl, a, d, sp: 0.004 + rnd() * 0.006 });
    }
    K.tick(dt => {
      skyMat.uniforms.uT.value += dt;
      const cp = K.camera.position;
      moon.position.set(cp.x + mo.x, mo.y + cp.y * 0.2, cp.z + mo.z); moon.lookAt(cp);
      for (const c of clouds) { c.a += c.sp * dt; c.m.position.set(cp.x + Math.cos(c.a) * c.d, c.m.position.y, cp.z + Math.sin(c.a) * c.d); c.m.lookAt(cp.x, c.m.position.y * 0.6, cp.z); }
    });
    return { sky, moon, hemi };
  };

  /* ---------- light bulbs: one instanced family ---------- */
  P.bulbs = function (K, max = 12000) {
    const geo = new T.IcosahedronGeometry(1, 1);
    const aCol = new Float32Array(max * 3), aPh = new Float32Array(max * 3);
    const u = { uT: { value: 0 }, uWave: { value: 1e5 }, uWaveO: { value: new T.Vector2(0, 0) }, uFog: { value: K.fogCol || new T.Color('#1b1a3c') }, uFogD: { value: 0.0016 }, uK: { value: 1 } };
    const mat = new T.ShaderMaterial({ uniforms: u,
      vertexShader: `attribute vec3 aCol; attribute vec3 aPh; uniform float uT, uWave, uFogD, uK; uniform vec2 uWaveO; uniform vec3 uFog; varying vec3 vC;
        void main() {
          vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
          float d = length(wp.xz - uWaveO);
          float lit = clamp((uWave - d) / 10.0, 0.0, 1.0);
          // chase: aPh.x phase, aPh.y speed (0 = steady with a faint shimmer), aPh.z: 0 bulbs, 1 every other bulb blinks
          float ch = aPh.y > 0.0 ? smoothstep(0.15, 0.85, 0.5 + 0.5 * sin(uT * aPh.y - aPh.x)) : 0.85 + 0.15 * sin(uT * 3.1 + aPh.x * 13.0);
          if (aPh.z > 0.5) ch = step(0.5, fract(uT * 0.9 + aPh.x * 0.5));
          float b = mix(0.12, mix(1.0, 3.0, ch) * uK, lit);
          vec3 c = aCol * b;
          vec4 mv = viewMatrix * wp;
          float f = exp(-uFogD * uFogD * dot(mv.xyz, mv.xyz));
          vC = mix(uFog * 0.6, c, f);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: 'varying vec3 vC; void main() { gl_FragColor = vec4(vC, 1.0); }',
    });
    const im = new T.InstancedMesh(geo, mat, max);
    im.count = 0; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
    geo.setAttribute('aCol', new T.InstancedBufferAttribute(aCol, 3)); geo.setAttribute('aPh', new T.InstancedBufferAttribute(aPh, 3));
    const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3(), col = new T.Color();
    const b = { mesh: im, u, n: 0, max,
      add(x, y, z, c = '#ffd890', o = {}) {
        if (this.n >= max) return -1;
        const i = this.n++;
        const s = o.size || 0.1;
        m4.compose(ps.set(x, y, z), q, sc.set(s, s, s)); im.setMatrixAt(i, m4);
        col.set(c); aCol[i * 3] = col.r; aCol[i * 3 + 1] = col.g; aCol[i * 3 + 2] = col.b;
        aPh[i * 3] = o.phase || 0; aPh[i * 3 + 1] = o.speed || 0; aPh[i * 3 + 2] = o.blink ? 1 : 0;
        return i;
      },
      // a straight line of bulbs from a to b (arrays), a chase running along it when o.speed
      line(a, bb, gap, c, o = {}) {
        const d = Math.hypot(bb[0] - a[0], bb[1] - a[1], bb[2] - a[2]), n = Math.max(1, Math.round(d / gap));
        for (let k = 0; k <= n; k++) {
          const t = k / n, cc = Array.isArray(c) ? c[k % c.length] : c;
          this.add(a[0] + (bb[0] - a[0]) * t, a[1] + (bb[1] - a[1]) * t + (o.sag ? -Math.sin(t * Math.PI) * o.sag : 0), a[2] + (bb[2] - a[2]) * t, cc,
            { size: o.size, speed: o.speed, phase: (o.phase || 0) + k * (o.step != null ? o.step : 0.6), blink: o.blink && k % 2 });
        }
      },
      // a ring of bulbs round c (array) with radius r in the plane given by axis ('y' flat, 'z' upright facing z, 'x')
      ring(c, r, n, cc, o = {}, axis = 'y') {
        for (let k = 0; k < n; k++) {
          const a = k / n * Math.PI * 2, ca = Math.cos(a) * r, sa = Math.sin(a) * r;
          const p = axis === 'y' ? [c[0] + ca, c[1], c[2] + sa] : axis === 'z' ? [c[0] + ca, c[1] + sa, c[2]] : [c[0], c[1] + sa, c[2] + ca];
          this.add(p[0], p[1], p[2], Array.isArray(cc) ? cc[k % cc.length] : cc, { size: o.size, speed: o.speed, phase: (o.phase || 0) + k * (o.step != null ? o.step : 0.5), blink: o.blink && k % 2 });
        }
      },
      // bulbs on a moving thing: their own instanced family parented to it (same shader)
      done() { im.count = this.n; im.instanceMatrix.needsUpdate = true; geo.attributes.aCol.needsUpdate = true; geo.attributes.aPh.needsUpdate = true; return im; },
    };
    K.add(im);
    K.tick(dt => { u.uT.value += dt; });
    (K.bulbSets || (K.bulbSets = [])).push(b);
    return b;
  };
  // the wave of light from the clock tower at midnight: every bulb family lights as the front passes it
  P.wave = function (K, x, z, r) { for (const b of K.bulbSets || []) { b.u.uWaveO.value.set(x, z); b.u.uWave.value = r; } for (const f of K.waveFns || []) f(x, z, r); };
  P.onWave = function (K, x, z, fn) { (K.waveFns || (K.waveFns = [])).push((ox, oz, r) => fn(r - Math.hypot(x - ox, z - oz))); };

  // a soft glow sprite (a halo round a lamp; a reflection on wet ground lies flat)
  P.halo = function (K, x, y, z, size, col, k = 0.6) {
    const m = new T.Sprite(new T.SpriteMaterial({ map: P.glowTex(), color: hot(col, k), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: true }));
    m.position.set(x, y, z); m.scale.set(size, size, 1); K.add(m); return m;
  };
  // a long light streak on the wet ground under something bright (it smears toward the viewer as reflections do)
  const glints = [];
  P.glint = function (K, x, z, col, len = 6, wid = 1.2, k = 0.55) {
    if (!K.glintIM) {
      const g = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      const mat = new T.MeshBasicMaterial({ map: P.streakTex(), color: new T.Color('#ffffff'), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, vertexColors: false });
      mat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aGC; varying vec3 vGC;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGC = aGC;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vGC;').replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * vGC, opacity );'); };
      const im = new T.InstancedMesh(g, mat, 3000); im.count = 0; im.frustumCulled = false; im.renderOrder = 2;
      g.setAttribute('aGC', new T.InstancedBufferAttribute(new Float32Array(3000 * 3), 3));
      K.glintIM = im; K.add(im); K.glintN = 0;
      // the streaks turn to point at the camera along the ground (cheap: one matrix each, a few hundred)
      K.tick(() => {
        const cp = K.camera.position, m4 = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), p = new T.Vector3(), up = new T.Vector3(0, 1, 0);
        for (let i = 0; i < K.glintN; i++) {
          const gl = glints[i]; const a = Math.atan2(cp.x - gl.x, cp.z - gl.z);
          // seen from high up (a steep look down) a wet-ground streak shrinks to a soft pool
          const hd = Math.hypot(cp.x - gl.x, cp.z - gl.z) + 0.01, steep = (cp.y - gl.y) / hd, len = Math.max(gl.wid * 1.2, gl.len / (1 + steep * steep * 6));
          q.setFromAxisAngle(up, a); const half = len / 2;
          p.set(gl.x + Math.sin(a) * half * 0.9, gl.y, gl.z + Math.cos(a) * half * 0.9);
          m4.compose(p, q, s.set(gl.wid, 1, len)); im.setMatrixAt(i, m4);
        }
        im.instanceMatrix.needsUpdate = true;
      });
    }
    if (K.glintN >= 3000) return;
    const i = K.glintN++, c = new T.Color(col).multiplyScalar(k), a = K.glintIM.geometry.attributes.aGC;
    a.setXYZ(i, c.r, c.g, c.b); a.needsUpdate = true;
    glints[i] = { x, z, y: 0.03, len, wid };
    K.glintIM.count = K.glintN;
  };
  P.resetGlints = () => { glints.length = 0; };

  /* ---------- the ground ---------- */
  P.ground = function (K, o = {}) {
    const g = new T.Group();
    const size = o.size || 1400;
    const pav = P.paving(); pav.repeat.set(size / 7, size / 7);
    const ground = mesh(new T.PlaneGeometry(size, size).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: pav }), { ink: false, cast: false });
    ground.position.set(o.x || 120, 0, o.z || 20); g.add(ground);
    K.add(g);
    return g;
  };

  /* ---------- neon signs ---------- */
  P.neonTex = function (text, o = {}) {
    const w = o.tw || 512, h = o.th || 160;
    return K3D.paint('pk-neon|' + text + '|' + (o.col || '') + (o.col2 || '') + (o.font || ''), w, h, (c) => {
      c.clearRect(0, 0, w, h);
      const fs = o.fs || Math.min(h * 0.62, w / Math.max(4, text.length) * 1.6);
      c.font = (o.font || '900 ' + fs + 'px "Atkinson Hyperlegible", "DejaVu Sans", sans-serif');
      c.textAlign = 'center'; c.textBaseline = 'middle';
      // the tube: a soft glow, the coloured tube, a white-hot core
      c.shadowColor = o.col || '#ff5fa8'; c.shadowBlur = 18;
      c.lineJoin = 'round'; c.lineWidth = fs * 0.12; c.strokeStyle = o.col || '#ff5fa8'; c.strokeText(text, w / 2, h / 2);
      c.shadowBlur = 0; c.lineWidth = fs * 0.05; c.strokeStyle = '#fff6fb'; c.strokeText(text, w / 2, h / 2);
      if (o.col2) { c.strokeStyle = o.col2; c.lineWidth = fs * 0.06; c.strokeRect(10, 10, w - 20, h - 20); c.strokeStyle = '#fff'; c.lineWidth = 2; c.strokeRect(10, 10, w - 20, h - 20); }
    });
  };
  P.neon = function (K, text, o = {}) {
    const g = new T.Group(), w = o.w || 6, h = o.h || w * 0.32;
    // the backing board (dark, with bolts) and the tubes over it
    if (o.board !== false) {
      const bd = mesh(new T.BoxGeometry(w * 1.04, h * 1.1, 0.16), toonM('#232036'), { ink: P.INK, inkW: 0.8 });
      bd.position.z = -0.1; g.add(bd);
    }
    const mat = new T.MeshBasicMaterial({ map: P.neonTex(text, o), color: hot('#ffffff', o.k || 2.2), transparent: true, depthWrite: false, toneMapped: false });
    const tube = new T.Mesh(new T.PlaneGeometry(w, h), mat); tube.position.z = 0.0; tube.renderOrder = 3; g.add(tube);
    g.userData.live = true;
    // flicker: now and then a tube stutters (buzzing, a few frames out)
    const base = o.k || 2.2; let t = rnd() * 10, out = 0, next = 3 + rnd() * 9;
    if (o.flicker !== false) K.tick(dt => { t += dt; if (t > next) { out = 0.25 + rnd() * 0.35; next = t + 4 + rnd() * 10; } if (out > 0) { out -= dt; mat.color.copy(hot('#ffffff', Math.sin(t * 90) > 0.2 ? base * 0.25 : base)); } else mat.color.copy(hot('#ffffff', base)); });
    if (o.x != null) g.position.set(o.x, o.y || 0, o.z || 0);
    if (o.yaw) g.rotation.y = o.yaw;
    g.userData.neonMat = mat;
    return g;
  };

  /* ---------- stalls, tents, booths, carts ---------- */
  const STALL_COLS = [['#d84a4a', '#f4ecd8'], ['#3f8f6a', '#f4ecd8'], ['#e9b23c', '#7a2f5a'], ['#5d4bb0', '#f2d06a'], ['#2f7fa8', '#f4ecd8'], ['#c4386e', '#f6d46a']];
  P.stall = function (K, B, o = {}) {
    const g = new T.Group(), w = o.w || 5, d = o.d || 3.4, hgt = 3.2, cols = STALL_COLS[(o.c != null ? o.c : Math.floor(rnd() * STALL_COLS.length)) % STALL_COLS.length];
    const wood = toonM('#7a4d30', { map: P.wood('#7a4d30') });
    // the box: back wall, sides, a counter at the front with a painted skirt
    const back = mesh(new T.BoxGeometry(w, hgt, 0.2), wood); back.position.set(0, hgt / 2, -d / 2); g.add(back);
    for (const sx of [-1, 1]) { const sd = mesh(new T.BoxGeometry(0.2, hgt, d), wood); sd.position.set(sx * w / 2, hgt / 2, 0); g.add(sd); }
    const skirt = mesh(new T.BoxGeometry(w, 1.1, 0.25), K3D.toon('#ffffff', { map: P.stripes(cols[0], cols[1], 10) })); skirt.position.set(0, 0.55, d / 2); g.add(skirt);
    const counter = mesh(new T.BoxGeometry(w + 0.2, 0.14, 0.7), toonM('#c9a06a')); counter.position.set(0, 1.15, d / 2); g.add(counter);
    // the awning: a striped slope with a scalloped edge, bulbs along it
    const aw = mesh(new T.BoxGeometry(w + 0.6, 0.08, 2.2), K3D.toon('#ffffff', { map: P.stripes(cols[0], cols[1], 10) }), { inkW: 0.9 });
    aw.position.set(0, hgt + 0.25, d / 2 + 0.2); aw.rotation.x = 0.32; g.add(aw);
    for (let i = 0; i < 9; i++) {
      const sc = mesh(K3D.geo('pk-scallop', () => new T.CylinderGeometry(0.33, 0.33, 0.07, 14, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI)), toonM(i % 2 ? cols[1] : cols[0]), { inkW: 0.7 });
      sc.position.set(-w / 2 - 0.3 + (i + 0.5) * (w + 0.6) / 9, hgt - 0.15, d / 2 + 1.25); g.add(sc);
    }
    const roof = mesh(new T.BoxGeometry(w + 0.3, 0.2, d + 0.3), toonM('#3b2e44')); roof.position.set(0, hgt + 0.1, 0); g.add(roof);
    // a sign on top
    const sgn = mesh(new T.BoxGeometry(w * 0.8, 0.9, 0.12), toonM(cols[1])); sgn.position.set(0, hgt + 0.75, -0.2); g.add(sgn);
    // prizes inside: plush toys on shelves (round heads and ears in bright colours)
    const prizeCols = ['#ff8fb3', '#8fd7ff', '#ffe27a', '#b7f08a', '#c9a3ff', '#ffb36b', '#ffffff'];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) {
      const pc = prizeCols[(i + r * 3 + (o.c || 0)) % prizeCols.length], pg = new T.Group();
      const body = mesh(K3D.geo('pk-plushB', () => new T.SphereGeometry(0.28, 14, 10)), toonM(pc), { inkW: 0.7 }); body.scale.set(1, 1.1, 0.9); pg.add(body);
      const head = mesh(K3D.geo('pk-plushH', () => new T.SphereGeometry(0.22, 14, 10)), toonM(pc), { inkW: 0.7 }); head.position.y = 0.38; pg.add(head);
      for (const ex of [-1, 1]) { const ear = mesh(K3D.geo('pk-plushE', () => new T.SphereGeometry(0.09, 10, 8)), toonM(pc), { inkW: 0.6 }); ear.position.set(ex * 0.15, 0.56, 0); pg.add(ear); }
      pg.position.set(-w / 2 + 0.7 + i * (w - 1.4) / 4, 1.6 + r * 0.85, -d / 2 + 0.45); g.add(pg);
    }
    const shelf = mesh(new T.BoxGeometry(w - 0.4, 0.08, 0.5), wood); shelf.position.set(0, 1.95, -d / 2 + 0.4); g.add(shelf);
    // warm light inside (a flat glowing back panel) and the bulbs on the awning's edge and the sign
    const glow = new T.Mesh(new T.PlaneGeometry(w - 0.4, hgt - 1.4), P.flatM('#ffcf8a', 0.85)); glow.position.set(0, 2.05, -d / 2 + 0.12); g.add(glow);
    g.position.set(o.x || 0, 0, o.z || 0); g.rotation.y = o.yaw || 0;
    K.add(g); g.updateMatrixWorld(true);
    if (B) {
      const tp = (x, y, z) => { const v3 = new T.Vector3(x, y, z).applyMatrix4(g.matrixWorld); return [v3.x, v3.y, v3.z]; };
      B.line(tp(-w / 2 - 0.3, hgt - 0.05, d / 2 + 1.3), tp(w / 2 + 0.3, hgt - 0.05, d / 2 + 1.3), 0.42, ['#ffd27a', '#ff7a6a', '#fff2c0'], { speed: 4, step: 0.9, size: 0.09 });
      B.line(tp(-w * 0.4, hgt + 1.25, -0.12), tp(w * 0.4, hgt + 1.25, -0.12), 0.4, '#fff0b0', { size: 0.08, blink: true });
      P.glint(K, ...[tp(0, 0, d / 2 + 2.2)].map(p => [p[0], p[2]])[0], '#ffcf8a', 7, 3.2, 0.32);
    }
    return g;
  };
  P.tent = function (K, B, o = {}) {
    const g = new T.Group(), r = o.r || 6, h = o.h || 6, cols = o.cols || ['#c83a4a', '#f4e8d0'];
    const tex = P.stripes(cols[0], cols[1], 16);
    const wall = mesh(new T.CylinderGeometry(r, r, h * 0.45, 32, 1, true), K3D.toon('#ffffff', { map: tex, side: T.DoubleSide })); wall.position.y = h * 0.225; g.add(wall);
    const roof = mesh(new T.ConeGeometry(r * 1.12, h * 0.65, 32, 1, true), K3D.toon('#ffffff', { map: tex, side: T.DoubleSide })); roof.position.y = h * 0.45 + h * 0.325; g.add(roof);
    const pole = mesh(new T.CylinderGeometry(0.1, 0.1, 1.6, 8), toonM('#d8b46a')); pole.position.y = h * 1.1 + 0.4; g.add(pole);
    // a pennant that flaps
    const flag = mesh(new T.PlaneGeometry(1.4, 0.7, 8, 1).translate(0.7, 0, 0), K3D.toon(cols[0], { side: T.DoubleSide }), { inkW: 0.6 }); flag.position.y = h * 1.1 + 0.95; g.add(flag);
    flag.userData.live = true;
    const fp = flag.geometry.attributes.position, fx = Float32Array.from(fp.array);
    let ft = rnd() * 10;
    K.tick(dt => { ft += dt; for (let i = 0; i < fp.count; i++) { const x = fx[i * 3]; fp.setZ(i, Math.sin(ft * 6 + x * 3) * 0.12 * x); } fp.needsUpdate = true; });
    // the door: dark with a warm glow
    const door = new T.Mesh(new T.PlaneGeometry(2.2, 2.8), P.flatM('#ffb36a', 0.7)); door.position.set(0, 1.4, r + 0.02); g.add(door);
    g.position.set(o.x || 0, 0, o.z || 0); g.rotation.y = o.yaw || 0;
    K.add(g); g.updateMatrixWorld(true);
    if (B) {
      // bulbs from the peak down each seam to the eaves
      for (let k = 0; k < 10; k++) {
        const a = k / 10 * Math.PI * 2, top = [0, h * 1.1, 0], eave = [Math.cos(a) * r * 1.1, h * 0.46, Math.sin(a) * r * 1.1];
        const w2 = p => { const v3 = new T.Vector3(...p).applyMatrix4(g.matrixWorld); return [v3.x, v3.y, v3.z]; };
        B.line(w2(top), w2(eave), 0.7, ['#ffe08a', '#ff9a7a'], { speed: 3, step: -0.8, size: 0.12 });
      }
      P.glint(K, g.position.x, g.position.z + r + 1, '#ffb36a', 8, 4, 0.3);
    }
    return g;
  };
  P.booth = function (K, B, o = {}) {
    const g = new T.Group();
    const base = mesh(new T.CylinderGeometry(1.2, 1.3, 2.4, 8), K3D.toon('#ffffff', { map: P.stripes('#2f7fa8', '#f4ecd8', 8) })); base.position.y = 1.2; g.add(base);
    const win = new T.Mesh(new T.PlaneGeometry(1.0, 0.8), P.flatM('#ffd89a', 1.1)); win.position.set(0, 1.7, 1.22); g.add(win);
    const roof = mesh(new T.ConeGeometry(1.7, 1.4, 8), toonM('#c83a4a')); roof.position.y = 3.1; g.add(roof);
    const ball = mesh(new T.SphereGeometry(0.2, 10, 8), toonM('#f2c14e')); ball.position.y = 3.95; g.add(ball);
    const sg = P.neon(K, 'TICKETS', { w: 2.2, h: 0.55, col: '#7affd4', k: 2.4 }); sg.position.set(0, 2.62, 1.0); g.add(sg);
    g.position.set(o.x || 0, 0, o.z || 0); g.rotation.y = o.yaw || 0; K.add(g);
    if (B) { g.updateMatrixWorld(true); const c = new T.Vector3(0, 2.4, 0).applyMatrix4(g.matrixWorld); B.ring([c.x, c.y, c.z], 1.6, 14, ['#ffe08a', '#ff8a8a'], { speed: 5, size: 0.08 }); }
    return g;
  };
  P.cart = function (K, B, kind = 'popcorn', o = {}) {
    const g = new T.Group(), red = kind === 'popcorn';
    const box = mesh(new T.BoxGeometry(1.8, 1.1, 1.0), K3D.toon('#ffffff', { map: P.stripes(red ? '#d8483a' : '#e86aa8', '#f8f0dc', 6) })); box.position.y = 0.95; g.add(box);
    const glass = mesh(new T.BoxGeometry(1.5, 0.9, 0.8), K3D.toon(red ? '#fff2b0' : '#ffd0ec', { transparent: true, opacity: 0.75 }), { inkW: 0.6 }); glass.position.y = 1.95; g.add(glass);
    const fill = new T.Mesh(new T.BoxGeometry(1.4, 0.4, 0.7), P.flatM(red ? '#fff0a0' : '#ffb6e6', 1.05)); fill.position.y = 1.7; g.add(fill);
    const top = mesh(new T.BoxGeometry(1.9, 0.12, 1.1), toonM(red ? '#d8483a' : '#e86aa8')); top.position.y = 2.45; g.add(top);
    for (const sx of [-1, 1]) { const wh = mesh(K3D.geo('pk-wheel', () => new T.CylinderGeometry(0.42, 0.42, 0.12, 16).rotateX(Math.PI / 2)), toonM('#3b2e44')); wh.position.set(sx * 0.6, 0.42, 0.56); g.add(wh); }
    const sg = P.neon(K, red ? 'POPCORN' : 'CANDY FLOSS', { w: 1.8, h: 0.45, col: red ? '#ffd24a' : '#ff8ad8', k: 2.3, board: false }); sg.position.set(0, 2.75, 0); g.add(sg);
    g.position.set(o.x || 0, 0, o.z || 0); g.rotation.y = o.yaw || 0; K.add(g);
    if (red) {
      // steam: a few soft puffs rising and fading
      const puffs = [];
      for (let i = 0; i < 6; i++) { const p = new T.Sprite(new T.SpriteMaterial({ map: P.glowTex(), color: new T.Color('#dcd6ff').multiplyScalar(0.35), transparent: true, depthWrite: false, blending: T.AdditiveBlending })); p.userData.ph = i / 6; g.add(p); puffs.push(p); }
      let t = 0; K.tick(dt => { t += dt * 0.35; for (const p of puffs) { const u = (t + p.userData.ph) % 1; p.position.set(Math.sin(u * 6 + p.userData.ph * 9) * 0.3, 2.6 + u * 2.4, 0); p.scale.setScalar(0.5 + u * 1.6); p.material.opacity = (1 - u) * 0.8; } });
    }
    return g;
  };

  /* ---------- lamps, lanterns, bunting, balloons ---------- */
  P.lamp = function (K, B, o = {}) {
    const g = new T.Group(), h = o.h || 4.2;
    const iron = toonM('#24223a');
    const post = mesh(K3D.geo('pk-lampPost', () => new T.CylinderGeometry(0.08, 0.14, h, 10)), iron); post.position.y = h / 2; g.add(post);
    const foot = mesh(K3D.geo('pk-lampFoot', () => new T.CylinderGeometry(0.28, 0.34, 0.4, 10)), iron); foot.position.y = 0.2; g.add(foot);
    const arm = mesh(K3D.geo('pk-lampArm', () => new T.BoxGeometry(1.6, 0.08, 0.08)), iron); arm.position.y = h - 0.3; g.add(arm);
    g.position.set(o.x || 0, 0, o.z || 0); g.rotation.y = o.yaw || 0; K.add(g); g.updateMatrixWorld(true);
    const w2 = (x, y, z) => { const v3 = new T.Vector3(x, y, z).applyMatrix4(g.matrixWorld); return [v3.x, v3.y, v3.z]; };
    const col = o.col || '#ffe2a0';
    for (const p of [w2(-0.75, h - 0.55, 0), w2(0.75, h - 0.55, 0), w2(0, h + 0.15, 0)]) {
      if (B) B.add(p[0], p[1], p[2], col, { size: 0.2 });
      P.halo(K, p[0], p[1], p[2], 2.4, col, 0.32);
    }
    P.glint(K, g.position.x, g.position.z, col, 7, 1.4, 0.45);
    // moths circling the globes
    if (o.moths !== false) P.moths(K, w2(0, h - 0.4, 0), 6);
    return g;
  };
  P.moths = function (K, c, n) {
    const ms = [];
    for (let i = 0; i < n; i++) { const m = new T.Mesh(K3D.geo('pk-moth', () => new T.PlaneGeometry(0.12, 0.08)), P.flatM('#fff6dc', 0.9, { side: T.DoubleSide })); m.userData.live = true; K.add(m); ms.push({ m, a: rnd() * 6.28, r: 0.4 + rnd() * 0.5, sp: 2 + rnd() * 3, y: rnd() }); }
    K.tick(dt => { for (const o of ms) { o.a += o.sp * dt; o.m.position.set(c[0] + Math.cos(o.a) * o.r, c[1] + Math.sin(o.a * 1.7) * 0.3 + o.y * 0.3, c[2] + Math.sin(o.a) * o.r); o.m.rotation.y = -o.a; o.m.rotation.x = Math.sin(o.a * 20) * 0.8; } });
  };
  P.lanterns = function (K, B, a, b, o = {}) {
    // paper lanterns hung along a sagging wire
    const n = o.n || Math.max(3, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 1.6)), sag = o.sag || 1.2;
    const cols = ['#ff6a5a', '#ffd24a', '#7ae0a0', '#ff9ad6', '#ffb050'];
    const pts = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new T.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t)); }
    const wire = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.02, 4), toonM('#1a1530')); K.add(wire);
    for (let i = 1; i < n; i++) {
      const t = i / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag - 0.35, z = a[2] + (b[2] - a[2]) * t;
      const c = cols[(i + (o.c || 0)) % cols.length];
      const l = new T.Mesh(K3D.geo('pk-lantern', () => new T.SphereGeometry(0.3, 12, 8).scale(1, 1.25, 1)), P.flatM(c, 1.5)); l.position.set(x, y, z); K.add(l);
      const cap = mesh(K3D.geo('pk-lanternCap', () => new T.CylinderGeometry(0.12, 0.16, 0.1, 8)), toonM('#2a2235'), { ink: false, cast: false }); cap.position.set(x, y + 0.38, z); K.add(cap);
    }
  };
  P.flags = function (K, a, b, o = {}) {
    // bunting: triangles on a string, flapping (the vertex shader waves them)
    const n = o.n || Math.max(4, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 0.7)), sag = o.sag || 0.8;
    const cols = o.cols || ['#e8483a', '#f2c14e', '#3f9a5a', '#f4ecd8', '#3d7fd0', '#d860a8'];
    const pos = [], col = [], ph = [];
    const C3 = new T.Color();
    for (let i = 0; i < n; i++) {
      const t0 = (i + 0.1) / n, t1 = (i + 0.9) / n, tm = (i + 0.5) / n;
      const P3 = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t];
      const p0 = P3(t0), p1 = P3(t1), pm = P3(tm);
      pos.push(...p0, ...p1, pm[0], pm[1] - 0.55, pm[2]);
      C3.set(cols[i % cols.length]); for (let k = 0; k < 3; k++) { col.push(C3.r, C3.g, C3.b); ph.push(k === 2 ? 1 : 0, i * 0.7); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('aW', new T.Float32BufferAttribute(ph, 2));
    g.computeVertexNormals();
    const mat = K3D.toon('#ffffff', { side: T.DoubleSide }); mat.vertexColors = true;
    const u = { uT: { value: rnd() * 10 } };
    mat.onBeforeCompile = sh => { sh.uniforms.uT = u.uT; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aW; uniform float uT;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.x += aW.x * sin(uT * 5.0 + aW.y) * 0.18; transformed.z += aW.x * cos(uT * 4.0 + aW.y) * 0.18;'); };
    const m = new T.Mesh(g, mat); m.castShadow = false; K.add(m);
    const line = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => { const t = i / 12; return new T.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t); })), 12, 0.02, 4), toonM('#1a1530')); K.add(line);
    K.tick(dt => { u.uT.value += dt; });
    return m;
  };
  P.balloons = function (K, x, y, z, n = 5) {
    const cols = ['#ff5a7a', '#ffd24a', '#7ad0ff', '#9aff8a', '#ff9ad6', '#b48aff'], bs = [];
    for (let i = 0; i < n; i++) {
      const b = mesh(K3D.geo('pk-balloon', () => new T.SphereGeometry(0.42, 16, 12).scale(1, 1.18, 1)), K3D.toon(cols[(i + Math.floor(x)) % cols.length], { emissive: cols[(i + Math.floor(x)) % cols.length], emissiveIntensity: 0.25 }), { inkW: 0.8 });
      b.userData.live = true; K.add(b); bs.push({ b, a: i / n * 6.28, ph: rnd() * 6 });
    }
    const str = new T.LineSegments(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(new Float32Array(n * 6), 3)), new T.LineBasicMaterial({ color: '#d8d0f0' }));
    str.frustumCulled = false; K.add(str);
    let t = 0;
    K.tick(dt => {
      t += dt; const a = str.geometry.attributes.position;
      bs.forEach((o, i) => { const bx = x + Math.cos(o.a) * 0.5 + Math.sin(t * 1.3 + o.ph) * 0.25, by = y + 2.2 + Math.sin(t * 2 + o.ph) * 0.15 + (i % 2) * 0.5, bz = z + Math.sin(o.a) * 0.5 + Math.cos(t * 1.1 + o.ph) * 0.25; o.b.position.set(bx, by, bz); o.b.rotation.z = Math.sin(t + o.ph) * 0.2; a.setXYZ(i * 2, x, y, z); a.setXYZ(i * 2 + 1, bx, by - 0.5, bz); });
      a.needsUpdate = true;
    });
  };

  /* ---------- small furniture ---------- */
  P.bench = function (K, x, z, yaw = 0) {
    const g = new T.Group(), w = toonM('#7a4d30', { map: P.wood('#7a4d30') }), ir = toonM('#24223a');
    for (let i = 0; i < 3; i++) { const sl = mesh(K3D.geo('pk-slat', () => new T.BoxGeometry(2.2, 0.08, 0.18)), w, { inkW: 0.6 }); sl.position.set(0, 0.55, -0.25 + i * 0.22); g.add(sl); }
    for (let i = 0; i < 2; i++) { const bk = mesh(K3D.geo('pk-slat', () => new T.BoxGeometry(2.2, 0.08, 0.18)), w, { inkW: 0.6 }); bk.position.set(0, 0.8 + i * 0.26, -0.42); bk.rotation.x = -1.3; g.add(bk); }
    for (const sx of [-1, 1]) { const lg = mesh(K3D.geo('pk-benchLeg', () => new T.BoxGeometry(0.1, 0.6, 0.6)), ir, { inkW: 0.6 }); lg.position.set(sx * 0.95, 0.3, -0.05); g.add(lg); }
    g.position.set(x, 0, z); g.rotation.y = yaw; K.add(g); return g;
  };
  P.bin = function (K, x, z) {
    const b = mesh(K3D.geo('pk-bin', () => new T.CylinderGeometry(0.36, 0.32, 1, 12)), K3D.toon('#ffffff', { map: P.stripes('#3f8f6a', '#e8e0c8', 6) }), { inkW: 0.7 });
    b.position.set(x, 0.5, z); K.add(b);
    const lid = mesh(K3D.geo('pk-binLid', () => new T.CylinderGeometry(0.4, 0.4, 0.1, 12)), toonM('#24223a'), { inkW: 0.6 }); lid.position.set(x, 1.04, z); K.add(lid);
  };
  P.signpost = function (K, x, z, words, yaw = 0) {
    const g = new T.Group();
    const post = mesh(K3D.geo('pk-signPost', () => new T.CylinderGeometry(0.08, 0.1, 3.4, 8)), toonM('#7a4d30')); post.position.y = 1.7; g.add(post);
    words.forEach((wd, i) => {
      const tex = K3D.paint('pk-sp|' + wd, 256, 64, (c, w, h) => { c.fillStyle = ['#f2c14e', '#7ad0c0', '#ff9a8a'][i % 3]; c.fillRect(0, 0, w, h); c.fillStyle = '#2a2035'; c.font = '700 34px "Atkinson Hyperlegible", "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(wd, w / 2 - 10, h / 2); c.beginPath(); c.moveTo(w - 18, 12); c.lineTo(w - 4, h / 2); c.lineTo(w - 18, h - 12); c.fill(); });
      const bd = mesh(new T.BoxGeometry(1.8, 0.45, 0.06), K3D.toon('#ffffff', { map: tex }), { inkW: 0.6 }); bd.position.set(0.5, 3 - i * 0.6, 0); bd.rotation.y = (i % 2 ? 0.5 : -0.4); g.add(bd);
    });
    g.position.set(x, 0, z); g.rotation.y = yaw; K.add(g); return g;
  };
  P.hedgeAnimal = function (K, x, z, kind = 'rabbit', yaw = 0) {
    const g = new T.Group(), m = toonM('#2f6b45'), mk = (geo, px, py, pz, s) => { const o = mesh(geo, m, { ink: '#14301f' }); o.position.set(px, py, pz); if (s) o.scale.set(...s); g.add(o); };
    const box = mesh(new T.BoxGeometry(2.4, 1, 1.4), toonM('#5a4a3a')); box.position.y = 0.5; g.add(box);
    const ball = K3D.geo('pk-hedgeBall', () => { const s = new T.IcosahedronGeometry(1, 2); const a = s.attributes.position; for (let i = 0; i < a.count; i++) { const k = 1 + Math.sin(a.getX(i) * 9) * 0.05 + Math.cos(a.getY(i) * 11) * 0.05; a.setXYZ(i, a.getX(i) * k, a.getY(i) * k, a.getZ(i) * k); } s.computeVertexNormals(); return s; });
    if (kind === 'rabbit') { mk(ball, 0, 1.9, 0, [1, 0.9, 0.8]); mk(ball, 0.2, 3, 0.3, [0.6, 0.6, 0.6]); mk(ball, 0.05, 3.9, 0.2, [0.18, 0.6, 0.15]); mk(ball, 0.45, 3.9, 0.3, [0.18, 0.6, 0.15]); }
    else if (kind === 'elephant') { mk(ball, 0, 2.1, 0, [1.3, 1, 0.9]); mk(ball, 1.1, 2.6, 0, [0.7, 0.7, 0.7]); mk(ball, 1.8, 1.8, 0, [0.22, 0.7, 0.22]); mk(ball, 0.9, 2.8, 0.6, [0.4, 0.5, 0.15]); }
    else { mk(ball, 0, 1.9, 0, [1.1, 0.8, 0.7]); mk(ball, 0.9, 2.7, 0, [0.5, 0.5, 0.5]); mk(ball, -0.9, 2.3, 0, [0.3, 0.3, 0.6]); }
    g.position.set(x, 0, z); g.rotation.y = yaw; K.add(g); return g;
  };
  // a park tree (four leaf balls in one of a few greens); with B, some wear fairy lights wound round the crown
  const LEAVES = ['#2a6a4a', '#2f5e3a', '#3a6e3e', '#245a52', '#4a6a34'];
  P.tree = function (K, x, z, s = 1, B) {
    const g = new T.Group();
    const tr = mesh(K3D.geo('pk-trunk', () => new T.CylinderGeometry(0.2, 0.32, 3, 8)), toonM('#3a2a2a')); tr.position.y = 1.5; g.add(tr);
    const leaf = toonM(LEAVES[Math.floor(rnd() * LEAVES.length)]);
    for (let i = 0; i < 4; i++) { const b = mesh(K3D.geo('pk-crown', () => new T.IcosahedronGeometry(1.4, 1)), leaf, { ink: '#0e2420' }); b.position.set((i % 2 - 0.5) * 1.1, 3.4 + i * 0.5, (i > 1 ? 0.6 : -0.5)); g.add(b); }
    g.position.set(x, 0, z); g.scale.setScalar(s); K.add(g);
    if (B && rnd() < 0.35) { const c = ['#ffe0a0', '#ff9ad6', '#9ae0ff'][Math.floor(rnd() * 3)]; for (let i = 0; i < 26; i++) { const a = i * 0.9, y = 2.6 + i * 0.11, r = 1.9 - i * 0.03; B.add(x + Math.cos(a) * r * s, y * s, z + Math.sin(a) * r * s, i % 3 ? c : '#ffffff', { size: 0.07, speed: 2, phase: i * 0.4 }); } }
    return g;
  };
  P.fence = function (K, B, a, b, o = {}) {
    // white picket fence with a bulb on every other post
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(d / 0.5)), yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const im = new T.InstancedMesh(K3D.geo('pk-picket', () => new T.BoxGeometry(0.12, 1.1, 0.06).translate(0, 0.55, 0)), toonM('#e8e2d0'), n + 1);
    const m4 = new T.Matrix4(), q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), yaw + Math.PI / 2);
    for (let i = 0; i <= n; i++) { const t = i / n; m4.compose(new T.Vector3(a[0] + (b[0] - a[0]) * t, 0, a[1] + (b[1] - a[1]) * t), q, new T.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); if (B && o.bulbs && i % 4 === 0) B.add(a[0] + (b[0] - a[0]) * t, 1.2, a[1] + (b[1] - a[1]) * t, '#ffe0a0', { size: 0.07 }); }
    K3D.ink(im, P.INK, 0.6); K.add(im); return im;
  };
  // a wind-up mascot robot sweeper (a round tin body, a key on its back that turns, a broom), trundling about
  P.robot = function (K, o = {}) {
    const g = new T.Group(), tin = toonM(o.col || '#e85a4a'), sil = toonM('#d8d4e0'), ink = P.INK;
    const body = mesh(K3D.geo('pk-robBody', () => K3D.roundBox(0.9, 1.0, 0.8, 0.5, 24)), tin, { ink }); body.position.y = 0.35; g.add(body);
    const head = mesh(K3D.geo('pk-robHead', () => K3D.roundBox(0.7, 0.55, 0.6, 0.45, 20)), sil, { ink }); head.position.y = 1.38; g.add(head);
    const eyeM = P.flatM('#9affe0', 1.6);
    for (const ex of [-0.15, 0.15]) { const e = new T.Mesh(K3D.geo('pk-robEye', () => new T.SphereGeometry(0.07, 10, 8)), eyeM); e.position.set(ex, 1.65, 0.3); g.add(e); }
    const key = mesh(K3D.geo('pk-robKey', () => new T.TorusGeometry(0.16, 0.05, 8, 16)), toonM('#f2c14e'), { ink }); key.position.set(0, 0.95, -0.5); g.add(key);
    for (const sx of [-1, 1]) { const w = mesh(K3D.geo('pk-robWheel', () => new T.CylinderGeometry(0.2, 0.2, 0.12, 14).rotateZ(Math.PI / 2)), toonM('#2a2235'), { ink }); w.position.set(sx * 0.45, 0.2, 0); g.add(w); }
    const broom = new T.Group(); broom.position.set(0.5, 0.9, 0.25); g.add(broom);
    const stick = mesh(K3D.geo('pk-broomS', () => new T.CylinderGeometry(0.035, 0.035, 1.5, 6).translate(0, -0.6, 0)), toonM('#b88a4a'), { ink }); broom.add(stick);
    const brush = mesh(K3D.geo('pk-broomB', () => new T.ConeGeometry(0.22, 0.4, 10).translate(0, -1.4, 0)), toonM('#d8b04a'), { ink }); broom.add(brush);
    g.userData = { key, broom, head, live: true };
    K.add(g);
    return g;
  };

  /* ---------- the rides (animated set pieces) ---------- */
  P.ride = function (K, B, kind, o = {}) { return RIDES[kind](K, B, o); };
  const RIDES = {
    // the ferris wheel: two rims of bulbs, spokes, gondolas that stay level and swing; o.near makes it fine enough for
    // the track to pass through it
    wheel(K, B, o) {
      const g = new T.Group(), r = o.r || 16, hub = o.hub || r + 3, wid = o.small ? 2.4 : 3.6;
      g.position.set(o.x, 0, o.z); g.rotation.y = o.yaw || 0; K.add(g);
      const steel = toonM('#d8d0e8'), dark = toonM('#3b3456');
      // the A-frame legs each side
      for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
        const a = new T.Vector3(sx * r * 0.55, 0, sz * (wid / 2 + 0.8)), b = new T.Vector3(0, hub, sz * (wid / 2 + 0.3));
        const len = a.distanceTo(b), leg = mesh(new T.CylinderGeometry(0.22, 0.32, len, 8), dark);
        leg.position.copy(a).add(b).multiplyScalar(0.5); leg.lookAt(b); leg.rotateX(Math.PI / 2); g.add(leg);
      }
      const axle = mesh(new T.CylinderGeometry(0.5, 0.5, wid + 2, 14).rotateX(Math.PI / 2), dark); axle.position.y = hub; g.add(axle);
      const wheel = new T.Group(); wheel.position.y = hub; g.add(wheel); wheel.userData.live = true;
      const spokesN = o.small ? 12 : 16;
      for (const sz of [-1, 1]) {
        const rim = mesh(new T.TorusGeometry(r, 0.16, 8, 96), steel); rim.position.z = sz * wid / 2; wheel.add(rim);
        const rim2 = mesh(new T.TorusGeometry(r * 0.62, 0.12, 8, 64), steel); rim2.position.z = sz * wid / 2; wheel.add(rim2);
        for (let k = 0; k < spokesN; k++) {
          const a = k / spokesN * Math.PI * 2, sp = mesh(K3D.geo('pk-spoke' + r, () => new T.CylinderGeometry(0.08, 0.08, r, 6).translate(0, r / 2, 0)), steel, { inkW: 0.6 });
          sp.position.z = sz * wid / 2; sp.rotation.z = a; wheel.add(sp);
        }
      }
      K3D.bake(wheel);
      // bulbs: on the rims and along the spokes (their own family, turning with the wheel)
      const wb = P.bulbs(K, 1400);
      wheel.add(wb.mesh);
      const cols = ['#ffe07a', '#ff6ab0', '#7ae8ff', '#ffffff'];
      for (const sz of [-1, 1]) {
        wb.ring([0, 0, sz * (wid / 2 + 0.12)], r, o.small ? 72 : 120, cols, { speed: 2.4, step: 0.3, size: o.small ? 0.16 : 0.18 }, 'z');
        for (let k = 0; k < spokesN; k++) { const a = k / spokesN * Math.PI * 2; wb.line([0, 0, sz * (wid / 2 + 0.12)], [Math.cos(a) * r, Math.sin(a) * r, sz * (wid / 2 + 0.12)], 1.1, cols[k % 4], { speed: 5, step: -0.9, size: 0.14 }); }
      }
      wb.ring([0, 0, wid / 2 + 0.3], 1.2, 12, '#ff6a8a', { speed: 6, size: 0.14 }, 'z');
      wb.done();
      // the gondolas: they hang from the rim and stay level
      const gon = [], gCols = ['#e8483a', '#f2c14e', '#3f9a8a', '#d860a8', '#4a7fd0', '#7ac04a'];
      const nG = o.small ? 12 : 16;
      for (let k = 0; k < nG; k++) {
        const gg = new T.Group();
        const cab = mesh(K3D.geo('pk-gon', () => K3D.roundBox(1.8, 1.3, 1.6, 0.4, 20).translate(0, -1.9, 0)), toonM(gCols[k % gCols.length]), { inkW: 0.8 }); gg.add(cab);
        const roofG = mesh(K3D.geo('pk-gonRoof', () => new T.ConeGeometry(1.3, 0.6, 6).translate(0, -0.4, 0)), toonM('#f4ecd8'), { inkW: 0.8 }); gg.add(roofG);
        const win = new T.Mesh(K3D.geo('pk-gonWin', () => new T.BoxGeometry(1.84, 0.4, 1.64).translate(0, -1.0, 0)), P.flatM('#ffe2a8', 1.15)); gg.add(win);
        const hang = mesh(K3D.geo('pk-gonHang', () => new T.CylinderGeometry(0.05, 0.05, 0.6, 6).translate(0, -0.3, 0)), dark, { inkW: 0.5 }); gg.add(hang);
        gg.userData.a = k / nG * Math.PI * 2; gg.userData.live = true; g.add(gg); gon.push(gg);
      }
      let t = rnd() * 10;
      const sp = o.speed || (o.small ? 0.12 : 0.08);
      const step = dt => {
        t += dt; wheel.rotation.z = t * sp;
        for (const gg of gon) { const a = gg.userData.a + t * sp; gg.position.set(Math.cos(a) * r, hub + Math.sin(a) * r, 0); gg.rotation.z = Math.sin(t * 1.3 + gg.userData.a * 3) * 0.06; }
      };
      K.tick(step); step(0);
      return { g, wheel, gon, hubY: hub, r, rot: () => t * sp, spokesN, wid };
    },
    carousel(K, B, o) {
      const g = new T.Group(), r = o.r || 8; g.position.set(o.x, 0, o.z); K.add(g);
      const base = mesh(new T.CylinderGeometry(r + 0.4, r + 0.6, 0.7, 40), K3D.toon('#ffffff', { map: P.stripes('#c9973a', '#7a2f5a', 24) })); base.position.y = 0.35; g.add(base);
      const turn = new T.Group(); g.add(turn); turn.userData.live = true;
      const floor = mesh(new T.CylinderGeometry(r, r, 0.15, 40), toonM('#e8dcc0')); floor.position.y = 0.78; turn.add(floor);
      const pole = mesh(new T.CylinderGeometry(1.2, 1.2, 5.2, 16), K3D.toon('#ffffff', { map: P.stripes('#f4ecd8', '#d8483a', 10, { v: true }) })); pole.position.y = 3.3; turn.add(pole);
      const mirror = new T.Mesh(new T.CylinderGeometry(1.25, 1.25, 1.6, 16, 1, true), P.flatM('#ffd8a0', 1.2)); mirror.position.y = 4.2; turn.add(mirror);
      const canopy = mesh(new T.ConeGeometry(r + 1.2, 2.8, 40, 1, true), K3D.toon('#ffffff', { map: P.stripes('#d8483a', '#f4ecd8', 24), side: T.DoubleSide })); canopy.position.y = 7.1; turn.add(canopy);
      const crown = mesh(new T.CylinderGeometry(r + 1.25, r + 1.25, 0.9, 40, 1, true), K3D.toon('#ffffff', { map: P.stripes('#7a2f5a', '#f2c14e', 40), side: T.DoubleSide })); crown.position.y = 5.3; turn.add(crown);
      const top = mesh(new T.SphereGeometry(0.5, 12, 10), toonM('#f2c14e')); top.position.y = 8.7; turn.add(top);
      // horses on brass poles, bobbing
      const hCols = ['#f4ecd8', '#3a2f3f', '#c9973a', '#e8a0b8', '#9ab8e8'], horses = [];
      const n = 16;
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2, rr = k % 2 ? r * 0.62 : r * 0.84, hg = new T.Group();
        const hb = mesh(K3D.geo('pk-horseB', () => K3D.roundBox(1.5, 0.7, 0.5, 0.55, 18)), toonM(hCols[k % hCols.length]), { inkW: 0.7 }); hb.position.y = -0.35; hg.add(hb);
        const hn = mesh(K3D.geo('pk-horseN', () => K3D.roundBox(0.4, 0.9, 0.4, 0.55, 14)), toonM(hCols[k % hCols.length]), { inkW: 0.7 }); hn.position.set(0.65, 0.05, 0); hn.rotation.z = -0.4; hg.add(hn);
        const hh = mesh(K3D.geo('pk-horseH', () => K3D.roundBox(0.7, 0.35, 0.35, 0.55, 14)), toonM(hCols[k % hCols.length]), { inkW: 0.7 }); hh.position.set(0.95, 0.4, 0); hh.rotation.z = -0.5; hg.add(hh);
        const mane = mesh(K3D.geo('pk-horseM', () => K3D.roundBox(0.15, 0.8, 0.12, 0.6, 10)), toonM('#d8483a'), { inkW: 0.6 }); mane.position.set(0.5, 0.25, 0); mane.rotation.z = -0.4; hg.add(mane);
        const saddle = mesh(K3D.geo('pk-saddle', () => new T.BoxGeometry(0.5, 0.12, 0.56)), toonM('#3f9a8a'), { inkW: 0.6 }); saddle.position.set(-0.1, 0.02, 0); hg.add(saddle);
        const hp = mesh(K3D.geo('pk-hpole', () => new T.CylinderGeometry(0.05, 0.05, 6.2, 6)), toonM('#e8c46a'), { inkW: 0.5 });
        hp.position.set(Math.cos(a) * rr, 3.8, Math.sin(a) * rr); turn.add(hp);
        hg.position.set(Math.cos(a) * rr, 2, Math.sin(a) * rr); hg.rotation.y = -a + Math.PI; turn.add(hg);
        horses.push({ hg, ph: k * 1.3 });
      }
      const cb = P.bulbs(K, 600); turn.add(cb.mesh);
      cb.ring([0, 4.86, 0], r + 1.27, 96, ['#ffe07a', '#ffffff', '#ff8a6a'], { speed: 3, step: 0.4, size: 0.11 });
      cb.ring([0, 5.76, 0], r + 1.27, 96, '#fff0c0', { blink: true, size: 0.09 });
      for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; cb.line([Math.cos(a) * (r + 1.1), 5.9, Math.sin(a) * (r + 1.1)], [0, 8.4, 0], 0.7, '#ffd27a', { speed: 4, step: -0.7, size: 0.08 }); }
      cb.done();
      let t = rnd() * 10;
      const sp = o.speed || 0.35;
      K.tick(dt => { t += dt; turn.rotation.y = t * sp; for (const h of horses) h.hg.position.y = 2 + Math.sin(t * 2.2 + h.ph) * 0.45; });
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; P.glint(K, o.x + Math.cos(a) * (r + 3), o.z + Math.sin(a) * (r + 3), '#ffd27a', 7, 2.2, 0.35); }
      return { g, turn, r, speed: sp, t: () => t };
    },
    swings(K, B, o) {
      const g = new T.Group(), r = o.r || 8, h = o.h || 16; g.position.set(o.x, 0, o.z); K.add(g);
      const tower = mesh(new T.CylinderGeometry(0.8, 1.2, h, 12), K3D.toon('#ffffff', { map: P.stripes('#3f8f6a', '#f4ecd8', 8, { v: true }) })); tower.position.y = h / 2; g.add(tower);
      const top = new T.Group(); top.position.y = h; g.add(top); top.userData.live = true;
      const hat = mesh(new T.ConeGeometry(r * 0.7, 2.4, 24, 1, true), K3D.toon('#ffffff', { map: P.stripes('#e8483a', '#f2c14e', 16), side: T.DoubleSide })); hat.position.y = 1; top.add(hat);
      const disc = mesh(new T.CylinderGeometry(r * 0.72, r * 0.72, 0.4, 24), toonM('#3b3456')); top.add(disc);
      const chairs = [], n = 16;
      for (let k = 0; k < n; k++) {
        const cg = new T.Group(); cg.userData.a = k / n * Math.PI * 2; top.add(cg);
        const chain = mesh(K3D.geo('pk-swingChain', () => new T.CylinderGeometry(0.03, 0.03, 4.6, 4).translate(0, -2.3, 0)), toonM('#cfc8e0'), { ink: false }); cg.add(chain);
        const seat = mesh(K3D.geo('pk-swingSeat', () => new T.BoxGeometry(0.7, 0.12, 0.6).translate(0, -4.7, 0)), toonM(['#f2c14e', '#e8483a', '#3d7fd0', '#7ac04a'][k % 4]), { inkW: 0.6 }); cg.add(seat);
        chairs.push(cg);
      }
      const sb = P.bulbs(K, 400); top.add(sb.mesh);
      sb.ring([0, -0.2, 0], r * 0.73, 60, ['#ffe07a', '#ff6ab0'], { speed: 4, size: 0.13 });
      sb.ring([0, 2.2, 0], 0.8, 10, '#ffffff', { size: 0.12, blink: true });
      sb.done();
      const tb = P.bulbs(K, 120); g.add(tb.mesh); tb.line([0, 0.4, 1.25], [0, h - 0.4, 0.82], 0.6, '#7ae8ff', { speed: 6, step: -0.6, size: 0.12 }); tb.done();
      let t = rnd() * 10;
      K.tick(dt => { t += dt; const sp = 0.9 + Math.sin(t * 0.13) * 0.25; top.rotation.y = t * sp; top.rotation.z = Math.sin(t * 0.4) * 0.12; const fly = 0.55 + Math.sin(t * 0.13) * 0.12; for (const c of chairs) { c.position.set(Math.cos(c.userData.a) * r * 0.7, 0, Math.sin(c.userData.a) * r * 0.7); c.rotation.set(0, -c.userData.a, -fly); } });
      return { g };
    },
    drop(K, B, o) {
      const g = new T.Group(), h = o.h || 50; g.position.set(o.x, 0, o.z); K.add(g);
      const tw = mesh(new T.BoxGeometry(2.4, h, 2.4), toonM('#3b3456')); tw.position.y = h / 2; g.add(tw);
      for (let i = 0; i < 4; i++) { const st = mesh(new T.BoxGeometry(0.2, h, 0.2), toonM('#d8d0e8'), { inkW: 0.5 }); st.position.set(i % 2 ? 1.25 : -1.25, h / 2, i > 1 ? 1.25 : -1.25); g.add(st); }
      const crown = mesh(new T.CylinderGeometry(2.2, 2.6, 2.4, 8), toonM('#d8483a')); crown.position.y = h + 1.2; g.add(crown);
      const sgn = P.neon(K, 'SKY DROP', { w: 6, h: 1.5, col: '#ff5a5a', k: 2.6 }); sgn.position.set(0, h - 3, 1.4); g.add(sgn);
      const ring = new T.Group(); g.add(ring); ring.userData.live = true;
      const rm = mesh(new T.CylinderGeometry(3.2, 3.2, 1.0, 20, 1, true), toonM('#f2c14e', { side: T.DoubleSide })); ring.add(rm);
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, s = mesh(K3D.geo('pk-dropSeat', () => new T.BoxGeometry(0.7, 0.9, 0.5)), toonM('#3d7fd0'), { inkW: 0.6 }); s.position.set(Math.cos(a) * 3.4, 0, Math.sin(a) * 3.4); s.rotation.y = -a + Math.PI / 2; ring.add(s); }
      const tb = P.bulbs(K, 400); g.add(tb.mesh);
      for (const [x, z] of [[1.3, 1.3], [-1.3, 1.3], [1.3, -1.3], [-1.3, -1.3]]) tb.line([x, 1, z], [x, h, z], 1.0, ['#ffffff', '#ff6a6a'], { speed: 8, step: -0.5, size: 0.16 });
      tb.ring([0, h + 2.5, 0], 2.3, 16, '#ff4a4a', { blink: true, size: 0.22 });
      tb.done();
      const rb = P.bulbs(K, 60); ring.add(rb.mesh); rb.ring([0, -0.55, 0], 3.25, 30, '#ffe07a', { speed: 6, size: 0.12 }); rb.done();
      let t = rnd() * 20;
      K.tick(dt => { t += dt; const c = t % 14; let y; if (c < 6) y = 2 + (h - 6) * (c / 6); else if (c < 8) y = h - 4; else if (c < 9.2) { const u = (c - 8) / 1.2; y = h - 4 - (h - 6) * u * u; } else y = 2 + Math.max(0, Math.sin((c - 9.2) * 3) * 1.2 * Math.exp(-(c - 9.2))); ring.position.y = y; });
      return { g };
    },
    teacups(K, B, o) {
      const g = new T.Group(), r = o.r || 9; g.position.set(o.x, 0, o.z); K.add(g);
      const base = mesh(new T.CylinderGeometry(r + 1, r + 1.2, 0.5, 40), K3D.toon('#ffffff', { map: P.stripes('#e8a0c8', '#f4ecd8', 24) })); base.position.y = 0.25; g.add(base);
      const turn = new T.Group(); turn.position.y = 0.5; g.add(turn); turn.userData.live = true;
      const cups = [], cCols = ['#ff8ab0', '#8ad0ff', '#ffe27a', '#a0f0a8', '#c9a3ff', '#ffb36b'];
      for (let k = 0; k < 6; k++) {
        const cg = new T.Group(), a = k / 6 * Math.PI * 2; cg.position.set(Math.cos(a) * r * 0.62, 0, Math.sin(a) * r * 0.62); turn.add(cg);
        const cup = mesh(K3D.geo('pk-cup', () => { const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(new T.Vector2(0.9 + Math.sin(u * Math.PI * 0.6) * 0.9, u * 1.5)); } return new T.LatheGeometry(pts, 24); }), toonM(cCols[k], { side: T.DoubleSide })); cg.add(cup);
        const band = mesh(K3D.geo('pk-cupBand', () => new T.TorusGeometry(1.75, 0.07, 6, 32).rotateX(Math.PI / 2).translate(0, 1.45, 0)), toonM('#f4ecd8'), { inkW: 0.5 }); cg.add(band);
        const handle = mesh(K3D.geo('pk-cupH', () => new T.TorusGeometry(0.4, 0.1, 8, 16).translate(1.85, 0.8, 0)), toonM(cCols[k]), { inkW: 0.6 }); cg.add(handle);
        cups.push(cg);
      }
      const pot = mesh(new T.SphereGeometry(2.0, 20, 14), toonM('#f4ecd8')); pot.position.y = 2.4; turn.add(pot);
      const lid = mesh(new T.ConeGeometry(1.2, 1.4, 16), toonM('#e8a0c8')); lid.position.y = 4.6; turn.add(lid);
      const tb = P.bulbs(K, 200); g.add(tb.mesh); tb.ring([0, 0.6, 0], r + 1.1, 64, ['#ff8ab0', '#ffffff', '#8ad0ff'], { speed: 3, size: 0.11 }); tb.done();
      let t = rnd() * 10;
      K.tick(dt => { t += dt; turn.rotation.y = t * 0.5; cups.forEach((c, k) => { c.rotation.y = t * (1.4 + k * 0.3) * (k % 2 ? -1 : 1); }); });
      return { g };
    },
    flume(K, B, o) {
      // the log flume: a trough on stilts that climbs, runs round and splashes down a chute into a pool
      const g = new T.Group(), h = o.h || 20; g.position.set(o.x, 0, o.z); g.rotation.y = o.yaw || 0; K.add(g);
      const pts = [[-26, 0.6, 10], [-10, 0.6, 14], [4, 0.6, 10], [10, 6, 0], [6, 13, -10], [-6, h, -14], [-20, h, -12], [-28, h - 1, -2], [-26, h - 3, 6], [-14, h - 4, 8], [-4, 2, 8], [6, 0.6, 10]];
      const curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p)), true);
      const trough = mesh(new T.TubeGeometry(curve, 240, 1.1, 10, true), K3D.toon('#ffffff', { map: P.wood('#8a5a34'), side: T.DoubleSide })); g.add(trough);
      const water = new T.Mesh(new T.TubeGeometry(curve, 240, 0.85, 6, true), K3D.toon('#3a8fd0', { emissive: '#1a4f90', emissiveIntensity: 0.5 })); water.scale.set(1, 0.98, 1); g.add(water);
      for (let i = 0; i < 40; i++) { const p = curve.getPoint(i / 40); if (p.y < 1.5) continue; const st = mesh(K3D.geo('pk-stilt', () => new T.CylinderGeometry(0.18, 0.18, 1, 6).translate(0, 0.5, 0)), toonM('#5a3a2a'), { inkW: 0.5 }); st.position.set(p.x, 0, p.z); st.scale.y = p.y - 1; g.add(st); }
      const pool = new T.Mesh(new T.CircleGeometry(9, 32).rotateX(-Math.PI / 2), K3D.toon('#2a6fb0', { emissive: '#18407a', emissiveIntensity: 0.6 })); pool.position.set(-6, 0.15, 10); g.add(pool);
      const logs = [];
      for (let k = 0; k < 4; k++) { const lg = mesh(K3D.geo('pk-log', () => K3D.roundBox(1.4, 0.8, 3.0, 0.6, 18)), toonM('#7a4d30'), { inkW: 0.8 }); lg.userData.live = true; g.add(lg); logs.push({ lg, u: k / 4 }); }
      const tb = P.bulbs(K, 500); g.add(tb.mesh);
      for (let i = 0; i < 120; i++) { const p = curve.getPoint(i / 120); tb.add(p.x, p.y + 1.15, p.z, i % 3 ? '#7ae8ff' : '#ffffff', { size: 0.12, speed: 5, phase: i * 0.5 }); }
      tb.done();
      // splashes at the bottom of the chute
      const spl = [];
      for (let i = 0; i < 14; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: P.glowTex(), color: new T.Color('#bfe6ff').multiplyScalar(0.9), transparent: true, depthWrite: false, blending: T.AdditiveBlending })); g.add(s); spl.push({ s, ph: i / 14 }); }
      const sg = P.neon(K, 'LOG FLUME', { w: 7, h: 1.6, col: '#5ae0ff', k: 2.4 }); sg.position.set(10, 8, 2); sg.rotation.y = -1; g.add(sg);
      let t = rnd() * 10;
      K.tick(dt => {
        t += dt;
        for (const l of logs) { l.u = (l.u + dt * 0.025) % 1; const p = curve.getPointAt(l.u), q = curve.getTangentAt(l.u); l.lg.position.copy(p).add(new T.Vector3(0, 0.1, 0)); l.lg.lookAt(p.clone().add(q)); }
        for (const s of spl) { const u = (t * 0.7 + s.ph) % 1; s.s.position.set(-4 + Math.cos(s.ph * 20) * u * 3, 0.5 + Math.sin(u * Math.PI) * 4, 8 + Math.sin(s.ph * 20) * u * 3); s.s.scale.setScalar(1 + u * 2); s.s.material.opacity = 1 - u; }
      });
      return { g };
    },
  };

  /* ---------- the sea, the beach and the pier ---------- */
  P.sea = function (K, B, o = {}) {
    const z0 = o.z || -150;
    // the sea: a big plane with moving moonlight glitter (a shader: ripples catch the moon on a path toward it)
    const mat = new T.ShaderMaterial({ uniforms: { uT: { value: 0 }, uMoon: { value: new T.Vector3(-60, 120, -520) }, uCam: { value: new T.Vector3() }, uFog: { value: K.fogCol } },
      vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `varying vec3 vW; uniform float uT; uniform vec3 uMoon, uCam, uFog;
        float n(vec2 p) { return sin(p.x * 0.9 + uT * 1.1) * sin(p.y * 1.3 - uT * 0.8) + 0.5 * sin(p.x * 2.7 - p.y * 1.9 + uT * 2.0); }
        void main() {
          vec3 base = mix(vec3(0.03, 0.05, 0.16), vec3(0.08, 0.10, 0.26), smoothstep(-900.0, -160.0, vW.z));
          vec2 toM = normalize(uMoon.xz - uCam.xz), rel = vW.xz - uCam.xz;
          float side = abs(rel.x * toM.y - rel.y * toM.x), along = dot(rel, toM);
          float path = exp(-side * side / (300.0 + along * 2.4)) * step(0.0, along);
          float rip = n(vW.xz * 0.35) + n(vW.xz * 1.1) * 0.5;
          float gl = path * smoothstep(0.75, 1.3, rip) * 2.4 + path * 0.12;
          vec3 c = base + vec3(0.9, 0.92, 1.0) * gl + vec3(0.06, 0.06, 0.12) * smoothstep(0.9, 1.4, rip);
          float d = length(vW - uCam); c = mix(uFog * 0.7, c, exp(-d * 0.0012));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`, fog: false });
    const sea = new T.Mesh(new T.PlaneGeometry(2400, 1200, 1, 1).rotateX(-Math.PI / 2), mat);
    sea.position.set(0, -0.6, z0 - 600); K.add(sea);
    K.tick(dt => { mat.uniforms.uT.value += dt; mat.uniforms.uCam.value.copy(K.camera.position); mat.uniforms.uMoon.value.copy(K.camera.position).add(new T.Vector3(-60, 120, -520)); });
    // the beach and the sea wall with its railing and lamps
    const sand = mesh(new T.PlaneGeometry(2400, 26).rotateX(-Math.PI / 2), K3D.toon('#6a6080'), { ink: false, cast: false }); sand.position.set(0, -0.3, z0 - 10); K.add(sand);
    const wall = mesh(new T.BoxGeometry(2400, 2.2, 1.2), toonM('#4a4566'), { ink: false }); wall.position.set(0, -0.2, z0 + 3); K.add(wall);
    if (B) for (let x = -500; x <= 700; x += 6) B.add(x, 1.4, z0 + 3.4, x % 12 ? '#ffe0a0' : '#ffb0d0', { size: 0.16, speed: 2, phase: x * 0.08 });
    // the pier: a boardwalk on legs out to sea, bulbs both sides, a little wheel and a helter-skelter at the end
    const pr = o.pier || { x: 120, z0: -146, z1: -300, w: 12 };
    const plen = pr.z0 - pr.z1;
    const deck = mesh(new T.BoxGeometry(pr.w, 0.6, plen), K3D.toon('#ffffff', { map: P.wood('#6a4a3a') })); deck.position.set(pr.x, 2.8, (pr.z0 + pr.z1) / 2); K.add(deck);
    for (let z = pr.z0; z > pr.z1; z -= 8) for (const sx of [-1, 1]) { const lg = mesh(K3D.geo('pk-pierLeg', () => new T.CylinderGeometry(0.4, 0.4, 4, 8).translate(0, 0.8, 0)), toonM('#3a2f3f'), { inkW: 0.7 }); lg.position.set(pr.x + sx * (pr.w / 2 - 0.5), 0, z); K.add(lg); }
    if (B) for (const sx of [-1, 1]) { B.line([pr.x + sx * pr.w / 2, 4.2, pr.z0], [pr.x + sx * pr.w / 2, 4.2, pr.z1], 1.2, ['#ffe07a', '#ff8ab0', '#7ae8ff'], { speed: 3, step: 0.5, size: 0.22 }); for (let z = pr.z0; z > pr.z1; z -= 12) B.add(pr.x + sx * pr.w / 2, 5.6, z, '#fff6d8', { size: 0.3 }); }
    for (let z = pr.z0 - 6; z > pr.z1; z -= 12) for (const sx of [-1, 1]) P.glint(K, pr.x + sx * pr.w / 2, z, '#ffe07a', 22, 2.5, 0.35);
    const pw = RIDES.wheel(K, B, { x: pr.x, z: pr.z1 + 18, r: 11, hub: 15, yaw: Math.PI / 2, small: true, speed: 0.15 });
    pw.g.position.y = 3.1;
    // a helter-skelter (striped tower with a slide round it)
    const hs = new T.Group(); hs.position.set(pr.x + 2, 3.1, pr.z1 + 40); K.add(hs);
    const hsT = mesh(new T.CylinderGeometry(2.0, 2.8, 16, 16), K3D.toon('#ffffff', { map: P.stripes('#f4ecd8', '#d8483a', 12, { v: true }) })); hsT.position.y = 8; hs.add(hsT);
    const hsR = mesh(new T.ConeGeometry(3.2, 4, 16), toonM('#d8483a')); hsR.position.y = 18; hs.add(hsR);
    const sp = []; for (let i = 0; i <= 80; i++) { const u = i / 80, a = u * Math.PI * 7; sp.push(new T.Vector3(Math.cos(a) * 3.6, 15 - u * 14, Math.sin(a) * 3.6)); }
    const slide = mesh(new T.TubeGeometry(new T.CatmullRomCurve3(sp), 200, 0.6, 6), toonM('#f2c14e')); slide.scale.set(1, 1, 1); hs.add(slide);
    if (B) { hs.updateMatrixWorld(true); for (let i = 0; i <= 80; i += 2) { const p = sp[i].clone().applyMatrix4(hs.matrixWorld); B.add(p.x, p.y + 0.6, p.z, '#ffe07a', { size: 0.2, speed: 6, phase: i * 0.4 }); } }
    // boats far out with a light each (a lighthouse blinking on the point)
    const lh = new T.Group(); lh.position.set(-420, 0, z0 - 260); K.add(lh);
    const lhT = mesh(new T.CylinderGeometry(3, 4.5, 30, 12), K3D.toon('#ffffff', { map: P.stripes('#f4ecd8', '#d8483a', 6, { v: true }) })); lhT.position.y = 15; lh.add(lhT);
    const beam = new T.Mesh(new T.ConeGeometry(14, 160, 16, 1, true).translate(0, -80, 0).rotateZ(Math.PI / 2), new T.MeshBasicMaterial({ color: new T.Color('#fff6d0').multiplyScalar(0.12), transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false }));
    beam.position.y = 31; lh.add(beam);
    const lamp = new T.Mesh(new T.SphereGeometry(2, 12, 8), P.flatM('#fff6d0', 3)); lamp.position.y = 31; lh.add(lamp);
    K.tick(dt => { beam.rotation.y += dt * 0.6; });
    return { sea, pierWheel: pw };
  };

  /* ---------- the boating lake ---------- */
  P.lake = function (K, B, o) {
    const g = new T.Group(); g.position.set(o.x, 0, o.z); K.add(g);
    const shape = new T.Shape(); for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2, k = 1 + Math.sin(a * 3) * 0.05 + Math.cos(a * 5) * 0.04; const px = Math.cos(a) * o.rx * k, pz = Math.sin(a) * o.rz * k; if (i === 0) shape.moveTo(px, pz); else shape.lineTo(px, pz); }
    const mat = new T.ShaderMaterial({ uniforms: { uT: { value: 0 }, uFog: { value: K.fogCol } },
      vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `varying vec3 vW; uniform float uT;
        void main() { float r = sin(vW.x * 0.6 + uT) * sin(vW.z * 0.8 - uT * 0.7) + 0.5 * sin((vW.x + vW.z) * 1.7 + uT * 1.4);
          vec3 c = vec3(0.05, 0.08, 0.2) + vec3(0.25, 0.22, 0.45) * smoothstep(0.9, 1.4, r);
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }` });
    const water = new T.Mesh(new T.ShapeGeometry(shape, 64).rotateX(Math.PI / 2), mat); water.position.y = 0.06; g.add(water);
    const rim = mesh(new T.TubeGeometry(new T.CatmullRomCurve3(shape.getPoints(64).map(p => new T.Vector3(p.x, 0.25, -p.y)), true), 128, 0.4, 6, true), toonM('#6a6080')); g.add(rim);
    K.tick(dt => { mat.uniforms.uT.value += dt; });
    // swan boats bobbing at a jetty and drifting
    const swans = [];
    for (let k = 0; k < 7; k++) {
      const sw = new T.Group();
      const hull = mesh(K3D.geo('pk-swanHull', () => K3D.roundBox(2.2, 1.0, 1.5, 0.6, 18)), toonM('#f4f0e8'), { inkW: 0.8 }); sw.add(hull);
      const neck = mesh(K3D.geo('pk-swanNeck', () => new T.TorusGeometry(0.7, 0.16, 8, 16, Math.PI * 1.1).rotateY(Math.PI / 2).translate(0, 1.0, 0.6)), toonM('#f4f0e8'), { inkW: 0.7 }); sw.add(neck);
      const beak = mesh(K3D.geo('pk-swanBeak', () => new T.ConeGeometry(0.12, 0.35, 8).rotateX(Math.PI / 2).translate(0, 1.55, 1.55)), toonM('#f08a3c'), { inkW: 0.5 }); sw.add(beak);
      const a = rnd() * Math.PI * 2, rr = 0.3 + rnd() * 0.5; sw.position.set(Math.cos(a) * o.rx * rr, 0.2, Math.sin(a) * o.rz * rr); sw.rotation.y = rnd() * 6;
      sw.userData.live = true; g.add(sw); swans.push({ sw, ph: rnd() * 6, a, rr });
    }
    let t = 0; K.tick(dt => { t += dt; for (const s of swans) { s.a += dt * 0.01; s.sw.position.x = Math.cos(s.a) * o.rx * s.rr; s.sw.position.z = Math.sin(s.a) * o.rz * s.rr; s.sw.position.y = 0.2 + Math.sin(t * 1.5 + s.ph) * 0.06; s.sw.rotation.y = -s.a + Math.PI; } });
    if (B) for (let i = 0; i < 64; i++) { const p = shape.getPoint(i / 64); B.add(o.x + p.x * 1.04, 1.0, o.z - p.y * 1.04, ['#ffe07a', '#7ae8ff'][i % 2], { size: 0.14, speed: 1.5, phase: i * 0.3 }); }
    return { g };
  };

  /* ---------- fireworks ---------- */
  P.fireworks = function (K) {
    const N = 3000, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), col = new Float32Array(N * 3), life = new Float32Array(N * 2);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setAttribute('aL', new T.BufferAttribute(life, 2));
    const m = new T.ShaderMaterial({ uniforms: { uPx: { value: 1 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, vertexColors: true,
      vertexShader: 'attribute vec2 aL; uniform float uPx; varying vec3 vC; varying float vA; void main() { vC = color; vA = aL.x; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.5, 420.0 * uPx / -mv.z) * (0.4 + aL.x); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vC; varying float vA; void main() { float d = length(gl_PointCoord - 0.5); if (vA <= 0.0) discard; gl_FragColor = vec4(vC * smoothstep(0.5, 0.0, d) * vA * 3.0, 1.0); }' });
    const pts = new T.Points(g, m); pts.frustumCulled = false; K.add(pts);
    let head = 0, auto = false, next = 0, t = 0;
    const flashes = [];
    const f = {
      burst(x, y, z, c) {
        const cc = new T.Color(c), n = 160;
        for (let i = 0; i < n; i++) {
          const k = head = (head + 1) % N, a = rnd() * Math.PI * 2, u = rnd() * 2 - 1, r = Math.sqrt(1 - u * u), sp = 9 + rnd() * 3;
          pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
          vel[k * 3] = Math.cos(a) * r * sp; vel[k * 3 + 1] = u * sp; vel[k * 3 + 2] = Math.sin(a) * r * sp;
          col[k * 3] = cc.r; col[k * 3 + 1] = cc.g; col[k * 3 + 2] = cc.b; life[k * 2] = 1; life[k * 2 + 1] = 0.5 + rnd() * 0.5;
        }
        flashes.push({ x, y, z, c: cc, t: 0.6 });
        Sfx.play('parkcoasterFirework');
      },
      auto(on) { auto = on; },
      flashes,
    };
    const cols = ['#ff5a7a', '#ffd24a', '#7ae8ff', '#9aff8a', '#ff9ad6', '#ffffff', '#b48aff'];
    K.tick(dt => {
      t += dt; m.uniforms.uPx.value = K3D.R.domElement.height / 720;
      if (auto && t > next) { next = t + 0.5 + rnd() * 1.1; const cp = K.camera.position, a = rnd() * Math.PI * 2; f.burst(cp.x + Math.cos(a) * (50 + rnd() * 60), 40 + rnd() * 40, cp.z + Math.sin(a) * (50 + rnd() * 60), cols[Math.floor(rnd() * cols.length)]); }
      for (let k = 0; k < N; k++) {
        if (life[k * 2] <= 0) continue;
        vel[k * 3 + 1] -= 6 * dt; vel[k * 3] *= 1 - 1.6 * dt; vel[k * 3 + 1] *= 1 - 1.6 * dt; vel[k * 3 + 2] *= 1 - 1.6 * dt;
        pos[k * 3] += vel[k * 3] * dt; pos[k * 3 + 1] += vel[k * 3 + 1] * dt; pos[k * 3 + 2] += vel[k * 3 + 2] * dt;
        life[k * 2] -= dt / (1.6 * life[k * 2 + 1] + 0.6);
      }
      for (const fl of flashes) fl.t -= dt;
      while (flashes.length && flashes[0].t <= 0) flashes.shift();
      g.attributes.position.needsUpdate = true; g.attributes.aL.needsUpdate = true; g.attributes.color.needsUpdate = true;
    });
    return f;
  };

  /* ---------- gulls asleep on roofs ---------- */
  P.gulls = function (K, list) {
    const gs = [];
    for (const [x, y, z] of list) {
      const g = new T.Group();
      const body = mesh(K3D.geo('pk-gullB', () => new T.SphereGeometry(0.28, 12, 8).scale(1.3, 0.9, 1)), toonM('#f4f2ec'), { inkW: 0.6 }); g.add(body);
      const head = mesh(K3D.geo('pk-gullH', () => new T.SphereGeometry(0.17, 10, 8)), toonM('#f4f2ec'), { inkW: 0.6 }); head.position.set(0.28, 0.2, 0); g.add(head);
      const beak = mesh(K3D.geo('pk-gullBk', () => new T.ConeGeometry(0.05, 0.18, 6).rotateZ(-Math.PI / 2)), toonM('#f2c14e'), { inkW: 0.4 }); beak.position.set(0.48, 0.18, 0); g.add(beak);
      const wings = [];
      for (const sz of [-1, 1]) { const w = mesh(K3D.geo('pk-gullW', () => new T.BoxGeometry(0.5, 0.04, 0.6).translate(0, 0, 0.3)), toonM('#a8a8b8'), { inkW: 0.5 }); w.position.set(0, 0.08, sz * 0.12); w.scale.z = sz; g.add(w); wings.push(w); }
      g.position.set(x, y, z); g.rotation.y = rnd() * 6; g.userData.live = true; K.add(g);
      gs.push({ g, wings, home: [x, y, z], fly: -1, a: rnd() * 6 });
    }
    K.tick(dt => {
      for (const o of gs) {
        if (o.fly < 0) { o.wings.forEach(w => { w.rotation.x = 0; }); o.g.children[1].rotation.z = Math.sin(K3D.R.info.render.frame * 0.01 + o.a) * 0.1; continue; }
        o.fly += dt; const u = o.fly;
        o.g.position.set(o.home[0] + Math.cos(o.a) * u * 6, o.home[1] + u * 4, o.home[2] + Math.sin(o.a) * u * 6);
        o.g.rotation.y = -o.a; o.wings.forEach((w, k) => { w.rotation.x = Math.sin(u * 18) * 0.9 * (k ? 1 : -1); });
        if (u > 12) { o.fly = -1; o.g.position.set(...o.home); }
      }
    });
    return { scare(x, z, r = 10) { for (const o of gs) if (o.fly < 0 && Math.hypot(o.home[0] - x, o.home[2] - z) < r) { o.fly = 0; o.a = Math.atan2(o.home[2] - z, o.home[0] - x) + (rnd() - 0.5); } }, list: gs };
  };

  /* ---------- gardens: lawns and flower beds (one instanced set of flower heads for the whole park) ----------
     P.flowers(K, max) -> F; F.bed(x, z, r) a round bed in a brick ring, F.lawn(x, z, rx, rz, yaw) a grass patch with
     flowers along its edge; F.done() after the last. Flower heads are a little bright, so they glow faintly in the dark. */
  P.flowers = function (K, max = 6000) {
    const cols = ['#ff6a8a', '#ffd24a', '#ff9ad6', '#fff2e0', '#b48aff', '#ff8a4a', '#7ad0ff'];
    const im = new T.InstancedMesh(K3D.geo('pk-flower', () => new T.IcosahedronGeometry(0.14, 0)), new T.MeshLambertMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.18 }), max);
    const stems = new T.InstancedMesh(K3D.geo('pk-tuft', () => new T.ConeGeometry(0.16, 0.42, 5).translate(0, 0.21, 0)), toonM('#2a5a3a'), max);
    im.castShadow = false; stems.castShadow = false;
    const m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), one = new T.Vector3(1, 1, 1), col = new T.Color();
    let n = 0;
    const grassM = K3D.toon('#ffffff', { map: P.grass() }), brick = toonM('#8a5a4a'), soil = toonM('#2a1e22');
    const flower = (x, z, c) => {
      if (n >= max) return;
      const s = 0.8 + rnd() * 0.5;
      m4.compose(v.set(x, 0.02, z), q.setFromAxisAngle(v.clone().set(0, 1, 0), rnd() * 6), new T.Vector3(s, s, s)); stems.setMatrixAt(n, m4);
      m4.compose(v.set(x, 0.4 * s, z), q, one); im.setMatrixAt(n, m4); im.setColorAt(n, col.set(c).multiplyScalar(1.05)); n++;
    };
    const F = {
      bed(x, z, r = 1.6) {
        const ring = mesh(K3D.geo('pk-bedRing|' + r, () => new T.TorusGeometry(r, 0.16, 6, 28).rotateX(Math.PI / 2)), brick, { inkW: 0.6 }); ring.position.set(x, 0.12, z); K.add(ring);
        const dirt = new T.Mesh(K3D.geo('pk-bedSoil|' + r, () => new T.CircleGeometry(r, 24).rotateX(-Math.PI / 2)), soil); dirt.position.set(x, 0.05, z); dirt.receiveShadow = true; K.add(dirt);
        const c = cols[Math.floor(rnd() * cols.length)], c2 = cols[Math.floor(rnd() * cols.length)];
        for (let i = 0; i < r * r * 9; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * (r - 0.25); flower(x + Math.cos(a) * d, z + Math.sin(a) * d, d < r * 0.45 ? c2 : c); }
      },
      lawn(x, z, rx, rz, yaw = 0) {
        const g = new T.Mesh(K3D.geo('pk-lawn', () => new T.CircleGeometry(1, 40).rotateX(-Math.PI / 2)), grassM); g.scale.set(rx, 1, rz); g.rotation.y = yaw; g.position.set(x, 0.03, z); g.receiveShadow = true; K.add(g);
        const c = cols[Math.floor(rnd() * cols.length)], cy = Math.cos(yaw), sy = Math.sin(yaw);
        const per = Math.round((rx + rz) * 2.2);
        for (let i = 0; i < per; i++) { const a = i / per * 6.283 + rnd() * 0.1, lx = Math.cos(a) * (rx - 0.5), lz = Math.sin(a) * (rz - 0.5); flower(x + lx * cy + lz * sy, z - lx * sy + lz * cy, i % 5 ? c : '#fff2e0'); }
      },
      done() { im.count = stems.count = n; im.instanceMatrix.needsUpdate = stems.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; K.add(im); K.add(stems); },
    };
    return F;
  };

  return P;
})();
