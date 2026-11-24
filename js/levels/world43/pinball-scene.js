/* Pip & Bo - 43-2 Pinball Panic: the table in 3D (PINBALL_SCENE). Loaded on demand with the 3D kit, after
   arcade-kit.js and pinball-outfits.js. Scenery only: it reads G.mst and never changes the rules.

   Comet Carnival at hero size: a glowing canyon of lacquered, printed wood under a sky of glass. Everything here hangs
   on the numbers in PINBALL_TABLE, so moving a control in the table file moves its art:
     the playfield     painted in chunks (wood grain under lacquer, printed fairground artwork with halftone dots, ball
                       trails worn through the paint on the busy lines), lit plastic inserts, pools of coloured light
     the guides        chrome wireform rails, the clear divider with its rubber-ringed posts, kerbs, one-way wire gates
     the pinball       bumpers, slingshots, outlanes with warning lights, posts, flippers (the two great flippers, the
                       twin flippers, the flippers for a friend), kickers, wire ramps, magnets on their tracks, kickouts
     the gates         star roll-overs, hold cups, target banks and their staircases, buttons, spinners and their bridges
                       of light, the lever, the scoops, the comet's mouth; a cable of white-gold chase lights runs from
                       each control to what it works, and an insert beside the control shows what it does
     the balls         clear glass pinballs with an orange (Pip) or blue (Bo) ring of light, the heroes running inside
     the backboard     the brightest thing in the world, far up the slope (COMET CARNIVAL, score reels, the bulb comet)
     the glass sky     the cover glass overhead doubling every light, smears, a cup ring; beyond it the dark arcade
   The camera: one shared camera, low behind and looking up the slope, pulling back to keep both balls in frame.
   Life (creatures, stalls, stories) is pinball-life.js (PINBALL_LIFE.build / update), called from here.

   PINBALL_SCENE.camOverride = { eye, at, fov }   the look-shot tools hold the camera still with this
   PINBALL_SCENE.snap()                           jump the camera to its wanted spot on the next frame */
'use strict';

const PINBALL_SCENE = (function () {
  const T = K3D.T, TB = PINBALL_TABLE, A = ARCADE;
  const R = TB.T.R, SL = TB.T.SLOPE, RAIL = TB.T.RAIL;
  const GLASS = 13.5;                 // the cover glass above the main playfield
  const WALL = 15.2;                  // the cabinet's inner side walls
  const SH = 0.55;                    // the shoulders (outside the rails) stand this high
  const INK = '#120d14';
  const yb = d => d * SL;             // the main playfield (no part-3 lift)
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const P = (x, d, h = 0) => V(x, TB.yAt(d) + h, -d);
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const rnd = () => A.rnd();
  const SC = { K: null, st: null };

  /* ====================================================================================================
     Lamps: one instanced family per shape, lit and animated in the shader (bulbs, inserts, chase lights)
     mode 0 steady (soft shimmer), 1 chase, 2 random blink, 3 a group's level (uG: cables, gates), 4 breathe
     ==================================================================================================== */
  const NG = 96;
  const lampU = { uT: { value: 0 }, uG: { value: new Float32Array(NG) }, uB0: { value: V(0, -999, 0) }, uB1: { value: V(0, -999, 0) },
    uFog: { value: new T.Color('#0e0a10') }, uFogD: { value: 0.006 }, uGlass: { value: GLASS }, uSL: { value: SL }, uTilt: { value: 0 } };
  const lampVS = `attribute vec4 aP; attribute vec4 aC; attribute vec4 aA; attribute vec4 aR;
    uniform float uT, uG[${NG}], uFogD, uGlass, uSL, uMirror, uDim, uTilt; uniform vec3 uB0, uB1;
    varying vec3 vC; varying vec2 vUv; varying float vF;
    float hash(float n) { return fract(sin(n) * 43758.5453); }
    void main() {
      vUv = uv;
      vec3 p = position * vec3(aR.y, 1.0, aR.z) * aP.w;
      float c = cos(aR.x), s = sin(aR.x);
      p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
      vec3 w = aP.xyz + p;
      float m = aA.x, ph = aA.y, sp = aA.z, b = 1.0;
      if (m < 0.5) b = 0.88 + 0.12 * sin(uT * 2.3 + ph * 6.28);
      else if (m < 1.5) b = mix(0.32, 1.3, step(fract(uT * sp - ph), 0.34));
      else if (m < 2.5) b = hash(floor(uT * sp + ph * 17.0)) > 0.45 ? 1.2 : 0.16;
      else if (m < 3.5) { float g = uG[int(aA.w)]; b = g < 0.5 ? 0.16 + 0.12 * step(fract(uT * 0.6 - ph), 0.3) : g < 1.5 ? 1.05 : 0.35 + 1.1 * step(fract(uT * sp * 1.6 - ph), 0.4); }
      else b = 0.3 + 0.7 * (0.5 + 0.5 * sin(uT * sp + ph * 6.28));
      if (aR.w > 0.0) { float d = min(distance(aP.xz, uB0.xz), distance(aP.xz, uB1.xz)); b += aR.w * (1.0 - smoothstep(0.5, 2.8, d)); }
      b *= 1.0 + uTilt * 0.6 * step(0.5, fract(uT * 5.0 + ph));
      if (uMirror > 0.5) { float gy = uGlass + (-aP.z) * uSL; w.y = 2.0 * gy - w.y; b *= uDim; }
      vC = aC.rgb * aC.w * b;
      vec4 mv = viewMatrix * vec4(w, 1.0);
      vF = exp(-uFogD * uFogD * dot(mv.xyz, mv.xyz) * 0.5);
      gl_Position = projectionMatrix * mv;
    }`;
  function lampSet(K, geo, max, o = {}) {
    const ig = new T.InstancedBufferGeometry(); ig.index = geo.index;
    ig.setAttribute('position', geo.attributes.position); if (geo.attributes.uv) ig.setAttribute('uv', geo.attributes.uv);
    const aP = new Float32Array(max * 4), aC = new Float32Array(max * 4), aA = new Float32Array(max * 4), aR = new Float32Array(max * 4);
    const at = { aP, aC, aA, aR }; for (const k in at) ig.setAttribute(k, new T.InstancedBufferAttribute(at[k], 4));
    ig.instanceCount = 0;
    const mk = (mirror) => {
      const u = Object.assign({}, lampU, { uMirror: { value: mirror ? 1 : 0 }, uDim: { value: o.dim != null ? o.dim : 0.2 } }, o.fogD != null ? { uFogD: { value: o.fogD } } : {});
      const fs = o.soft ? 'varying vec3 vC; varying vec2 vUv; varying float vF; void main() { float r = length(vUv - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - r), 2.2); gl_FragColor = vec4(vC * a * vF, 1.0); }'
        : 'uniform vec3 uFog; varying vec3 vC; varying vec2 vUv; varying float vF; void main() { gl_FragColor = vec4(mix(uFog, vC, vF), 1.0); }';
      const mat = new T.ShaderMaterial({ uniforms: u, vertexShader: lampVS, fragmentShader: fs,
        transparent: !!(o.soft || mirror), depthWrite: !(o.soft || mirror), blending: (o.soft || mirror) ? T.AdditiveBlending : T.NormalBlending,
        polygonOffset: !!o.decal, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const mesh = new T.Mesh(ig, mat); mesh.frustumCulled = false; mesh.userData.live = true; mesh.renderOrder = o.soft ? 4 : mirror ? 6 : 0;
      K.add(mesh); return mesh;
    };
    const mesh = mk(false), mirror = o.mirror ? mk(true) : null;
    const col = new T.Color();
    return { mesh, mirror, n: 0,
      // add(x, y, z, size, colour, k, { mode, ph, sp, g, rot, sx, sz, ball })
      add(x, y, z, size, c, k = 1.4, q = {}) {
        if (this.n >= max) return -1; const i = this.n++;
        col.set(c); aP.set([x, y, z, size], i * 4); aC.set([col.r, col.g, col.b, k], i * 4);
        aA.set([q.mode || 0, q.ph != null ? q.ph : rnd(), q.sp || 1, q.g || 0], i * 4); aR.set([q.rot || 0, q.sx || 1, q.sz || 1, q.ball || 0], i * 4);
        return i;
      },
      line(a, b, gap, size, c, k, q = {}) {
        const L = a.distanceTo(b), n = Math.max(1, Math.round(L / gap));
        for (let j = 0; j <= n; j++) { const t = j / n; this.add(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t, size, Array.isArray(c) ? c[j % c.length] : c, k, Object.assign({}, q, { ph: (q.ph0 || 0) + j * (q.step != null ? q.step : 0.09) })); }
      },
      setK(i, k) { aC[i * 4 + 3] = k; ig.attributes.aC.needsUpdate = true; },
      setP(i, x, y, z, s) { aP[i * 4] = x; aP[i * 4 + 1] = y; aP[i * 4 + 2] = z; if (s != null) aP[i * 4 + 3] = s; ig.attributes.aP.needsUpdate = true; },
      done() { ig.instanceCount = this.n; for (const k in at) ig.attributes[k].needsUpdate = true; return mesh; } };
  }
  const flatGeo = (shape) => { const g = new T.ShapeGeometry(shape, 6); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) * 0.5 + 0.5, -p.getZ(i) * 0.5 + 0.5); return g; };
  const starShape = (r0 = 1, r1 = 0.45, n = 5) => { const s = new T.Shape(); for (let k = 0; k < n * 2; k++) { const a = Math.PI / 2 + k * Math.PI / n, r = k % 2 ? r1 : r0; if (k) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); return s; };
  const arrowShape = () => { const s = new T.Shape(); s.moveTo(0, 1); s.lineTo(0.8, 0.1); s.lineTo(0.32, 0.1); s.lineTo(0.32, -1); s.lineTo(-0.32, -1); s.lineTo(-0.32, 0.1); s.lineTo(-0.8, 0.1); s.closePath(); return s; };
  const circShape = () => { const s = new T.Shape(); s.absarc(0, 0, 1, 0, Math.PI * 2, false); return s; };

  /* ====================================================================================================
     Painted textures
     ==================================================================================================== */
  // chrome: bands round a tube that read as reflections, fingerprints and fine scratches
  const chromeTex = () => K3D.paint('pb-chrome', 128, 64, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    [[0, '#3a3a44'], [0.12, '#f4f6ff'], [0.2, '#8a8c9c'], [0.34, '#2a2a36'], [0.5, '#c8ccd8'], [0.58, '#ffffff'], [0.66, '#9a9cac'], [0.8, '#3c3c48'], [0.9, '#e8eaf4'], [1, '#3a3a44']].forEach(([o, col]) => g.addColorStop(o, col));
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { c.strokeStyle = `rgba(255,255,255,${Math.random() * 0.25})`; c.lineWidth = 0.5; const y = Math.random() * h; c.beginPath(); c.moveTo(Math.random() * w, y); c.lineTo(Math.random() * w, y + (Math.random() - 0.5) * 3); c.stroke(); }
    for (let i = 0; i < 4; i++) { const x = Math.random() * w, y = Math.random() * h; for (let k = 0; k < 5; k++) { c.strokeStyle = 'rgba(80,70,60,0.12)'; c.beginPath(); c.ellipse(x, y, 2 + k * 1.3, 3 + k * 1.6, 0.3, 0, Math.PI * 2); c.stroke(); } }
  }, { repeat: true });
  // grey rubber, worn shiny where the balls hit it
  const rubberTex = () => K3D.paint('pb-rubber', 64, 32, (c, w, h) => {
    c.fillStyle = '#4a4a4e'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, h * 0.4, w, h * 0.18);
    for (let i = 0; i < 80; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.2})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 1); }
  }, { repeat: true });
  // the clear plastic of the divider: faint scratches and a yellowed edge
  const plasticTex = () => K3D.paint('pb-plastic', 256, 64, (c, w, h) => {
    c.fillStyle = 'rgba(200,230,255,0.16)'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,220,140,0.25)'; c.fillRect(0, 0, w, 4);
    for (let i = 0; i < 40; i++) { c.strokeStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.2})`; c.lineWidth = 0.6; c.beginPath(); const x = Math.random() * w, y = Math.random() * h; c.moveTo(x, y); c.lineTo(x + Math.random() * 30 - 15, y + Math.random() * 10 - 5); c.stroke(); }
  }, { repeat: true });
  // a soft radial (glow pools, the passing shadow)
  const softTex = (k = 'w') => K3D.paint('pb-soft' + k, 128, 128, (c, w, h) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    if (k === 'w') { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); }
    else { g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.6, 'rgba(0,0,0,0.4)'); g.addColorStop(1, 'rgba(0,0,0,0)'); }
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  // wood grain (the cabinet, kerbs, shoulders)
  const woodTex = (col = '#7a4a26', key = 'a') => K3D.paint('pb-wood|' + col + key, 256, 256, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { c.strokeStyle = `rgba(${rnd() < 0.5 ? '30,14,4' : '255,220,170'},${0.05 + rnd() * 0.1})`; c.lineWidth = 1 + rnd() * 2; c.beginPath(); let y = rnd() * h; c.moveTo(0, y); for (let x = 0; x <= w; x += 16) { y += (rnd() - 0.5) * 3; c.lineTo(x, y); } c.stroke(); }
    for (let i = 0; i < 3; i++) { const x = rnd() * w, y = rnd() * h; for (let k = 0; k < 6; k++) { c.strokeStyle = 'rgba(40,18,6,0.15)'; c.beginPath(); c.ellipse(x, y, 4 + k * 3, 2 + k * 1.4, 0, 0, Math.PI * 2); c.stroke(); } }
  }, { repeat: true });
  // the playfield art, one chunk of the table (x -WALL..WALL, d d0..d0+L), painted at res px
  const CH = 2 * WALL;
  function playTex(ci, d0, res) {
    return K3D.paint('pb-pf|' + ci, res, res, (c, w, h) => {
      const s0 = 9000 + ci * 131; A.seed(s0);
      const X = x => (x + WALL) / CH * w, Y = d => h - (d - d0) / CH * h, S = u => u / CH * w;
      const part = TB.partAt(d0 + CH / 2), mid = d0 + CH / 2;
      // base: maple under lacquer
      c.fillStyle = '#d9b27a'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { c.strokeStyle = `rgba(120,70,30,${0.04 + rnd() * 0.06})`; c.lineWidth = 1 + rnd() * 3; c.beginPath(); let x = rnd() * w; c.moveTo(x, 0); for (let y = 0; y <= h; y += 24) { x += (rnd() - 0.5) * 4; c.lineTo(x, y); } c.stroke(); }
      // the printed artwork: each part its own palette; radiating carnival stripes, a starfield, planets
      const pal = [['#b0182a', '#e8b030', '#1a3a9a', '#f2e6c8'], ['#1a2a8a', '#e8b030', '#c01a4a', '#f2e6c8'], ['#0e2a5a', '#7ad8ff', '#e8b030', '#e6f4ff'], ['#3a0e5a', '#ffcf4a', '#d81a3a', '#fff2c8']][part];
      c.save();
      c.beginPath(); c.rect(X(-RAIL - 0.2), 0, S(2 * RAIL + 0.4), h); c.clip();
      // stripes radiating from a point below (the fairground big top)
      const cx = X(0), cy = Y(d0 - 30 + (part === 0 ? 0 : 10));
      for (let k = 0; k < 40; k++) {
        const a0 = -Math.PI / 2 - 0.9 + k * 0.045, a1 = a0 + 0.045;
        c.fillStyle = k % 2 ? pal[0] : mixHex(pal[0], '#000000', 0.25);
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a0) * h * 4, cy + Math.sin(a0) * h * 4); c.lineTo(cx + Math.cos(a1) * h * 4, cy + Math.sin(a1) * h * 4); c.closePath(); c.fill();
      }
      // a deep blue night band with stars over the upper half of each chunk
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, mixHex(pal[2], '#000000', 0.25)); gr.addColorStop(0.45, pal[2] + 'cc'); gr.addColorStop(0.7, 'rgba(0,0,0,0)');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 120; i++) { c.fillStyle = `rgba(255,248,220,${0.3 + rnd() * 0.6})`; const x = rnd() * w, y = rnd() * h * 0.55, r = 0.6 + rnd() * 1.8; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
      // big painted planets and comets
      for (let i = 0; i < 3; i++) {
        const x = X((rnd() - 0.5) * 14), y = rnd() * h, r = S(1.2 + rnd() * 2.6), pc = A.pick(['#e86a2a', '#4ac0e8', '#9ae86a', '#e84a9a', '#ffd24a']);
        const pg = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r); pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.25, pc); pg.addColorStop(1, mixHex(pc, '#000000', 0.55));
        c.fillStyle = pg; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
        if (rnd() < 0.6) { c.strokeStyle = pal[1]; c.lineWidth = r * 0.12; c.beginPath(); c.ellipse(x, y, r * 1.7, r * 0.45, -0.3, 0, Math.PI * 2); c.stroke(); }
      }
      for (let i = 0; i < 2; i++) {
        const x = X((rnd() - 0.5) * 12), y = rnd() * h, L = S(5 + rnd() * 5), a = -0.5 + rnd();
        const tg = c.createLinearGradient(x, y, x - Math.cos(a) * L, y + Math.sin(a) * L); tg.addColorStop(0, '#fff6d0'); tg.addColorStop(0.3, pal[1]); tg.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = tg; c.beginPath(); c.moveTo(x, y - S(0.5)); c.lineTo(x - Math.cos(a) * L, y + Math.sin(a) * L); c.lineTo(x, y + S(0.5)); c.closePath(); c.fill();
        c.fillStyle = '#fffbe8'; c.beginPath(); c.arc(x, y, S(0.55), 0, Math.PI * 2); c.fill();
      }
      // lane arrows and dotted guides painted down each lane
      for (const lx of [-4.5, 4.5]) for (let dd = Math.ceil(d0 / 6) * 6; dd < d0 + CH; dd += 6) {
        c.fillStyle = pal[1]; c.globalAlpha = 0.55; c.beginPath(); const ax = X(lx), ay = Y(dd);
        c.moveTo(ax, ay - S(0.8)); c.lineTo(ax + S(0.6), ay); c.lineTo(ax + S(0.22), ay); c.lineTo(ax + S(0.22), ay + S(0.7)); c.lineTo(ax - S(0.22), ay + S(0.7)); c.lineTo(ax - S(0.22), ay); c.lineTo(ax - S(0.6), ay); c.closePath(); c.fill(); c.globalAlpha = 1;
      }
      // painted rings round every round thing and hazard stripes round the drains
      for (const p of TB.posts) if (p.d > d0 - 3 && p.d < d0 + CH + 3) { c.strokeStyle = pal[3]; c.lineWidth = S(0.12); c.beginPath(); c.arc(X(p.x), Y(p.d), S(p.r + 0.45), 0, Math.PI * 2); c.stroke(); if (p.kind === 'bumper') { c.strokeStyle = pal[1]; c.lineWidth = S(0.08); c.beginPath(); c.arc(X(p.x), Y(p.d), S(p.r + 0.75), 0, Math.PI * 2); c.stroke(); } }
      for (const q of TB.holes) if (q.r && q.d > d0 - 3 && q.d < d0 + CH + 3) {
        for (let k = 0; k < 16; k++) { c.fillStyle = k % 2 ? '#1a1214' : '#f2c030'; c.beginPath(); c.arc(X(q.x), Y(q.d), S(q.r + 0.55), k / 16 * Math.PI * 2, (k + 1) / 16 * Math.PI * 2); c.arc(X(q.x), Y(q.d), S(q.r + 0.15), (k + 1) / 16 * Math.PI * 2, k / 16 * Math.PI * 2, true); c.closePath(); c.fill(); }
      }
      for (const cc of TB.controls) if (cc.d > d0 - 3 && cc.d < d0 + CH + 3) {
        c.fillStyle = 'rgba(20,10,30,0.55)'; c.beginPath(); c.arc(X(cc.x), Y(cc.d), S(cc.kind === 'targets' ? 0.1 : 1.5), 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#fff2c8'; c.lineWidth = S(0.06); c.setLineDash([S(0.25), S(0.18)]); c.beginPath(); c.arc(X(cc.x), Y(cc.d), S(1.75), 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      }
      // part-1 words painted on the field
      if (part === 0) {
        c.save(); c.font = `900 ${S(1.3)}px "DejaVu Sans", sans-serif`; c.textAlign = 'center'; c.fillStyle = pal[1]; c.strokeStyle = '#3a0a10'; c.lineWidth = S(0.12);
        for (const [tx, td, txt, rot] of [[0, 12, 'ROLL!', 0], [-4.5, 27.4, 'STAR', 0], [4.5, 35.4, 'STAR', 0], [0, 66, 'COMET CARNIVAL', 0], [-4.5, 58, 'HOLD', 0], [4.5, 51, 'HOLD', 0]]) {
          if (td < d0 - 2 || td > d0 + CH + 2) continue;
          c.save(); c.translate(X(tx), Y(td)); c.rotate(rot); c.strokeText(txt, 0, 0); c.fillText(txt, 0, 0); c.restore();
        }
        c.restore();
      }
      c.restore();
      // halftone dots over the print (visible up close)
      c.globalCompositeOperation = 'multiply';
      const step = Math.max(3, Math.round(w / 300));
      for (let y = 0; y < h; y += step) for (let x = (y / step) % 2 ? step / 2 : 0; x < w; x += step) { const r = step * (0.18 + 0.2 * Math.abs(Math.sin(x * 0.013 + y * 0.009))); c.fillStyle = 'rgba(60,40,70,0.35)'; c.fillRect(x, y, r, r); }
      c.globalCompositeOperation = 'source-over';
      // ball trails: the paint worn through to the wood on the busy lines
      c.lineCap = 'round';
      for (const lx of [-4.5, -2.6, 2.6, 4.5]) {
        for (let k = 0; k < 5; k++) {
          c.strokeStyle = `rgba(232,200,150,${0.08 + rnd() * 0.1})`; c.lineWidth = S(0.5 + rnd() * 0.8);
          c.beginPath(); let x = X(lx + (rnd() - 0.5) * 1.6); c.moveTo(x, h); for (let y = h; y >= 0; y -= 20) { x += (rnd() - 0.5) * 6; c.lineTo(x, y); } c.stroke();
        }
      }
      for (const p of TB.posts) if (p.kind === 'bumper' && p.d > d0 - 3 && p.d < d0 + CH + 3) for (let k = 0; k < 3; k++) { c.strokeStyle = `rgba(232,200,150,${0.1 + rnd() * 0.1})`; c.lineWidth = S(0.35); c.beginPath(); c.arc(X(p.x), Y(p.d), S(p.r + 1.0 + k * 0.4), rnd() * 6, rnd() * 6 + 2.5); c.stroke(); }
      // scuffs, a scorch mark near a hard-worked coil, a little lacquer crazing
      for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(40,20,10,${rnd() * 0.12})`; c.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 6, 1 + rnd() * 2); }
      for (const p of TB.posts) if (p.kind === 'bumper' && p.d > d0 && p.d < d0 + CH && rnd() < 0.5) { const sg = c.createRadialGradient(X(p.x), Y(p.d), S(p.r), X(p.x), Y(p.d), S(p.r + 1.4)); sg.addColorStop(0, 'rgba(30,14,6,0.5)'); sg.addColorStop(1, 'rgba(30,14,6,0)'); c.fillStyle = sg; c.beginPath(); c.arc(X(p.x), Y(p.d), S(p.r + 1.4), 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 1;
      for (let i = 0; i < 30; i++) { c.beginPath(); let x = rnd() * w, y = rnd() * h; c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 40; y += (rnd() - 0.5) * 40; c.lineTo(x, y); } c.stroke(); }
      // the lacquer's sheen: a soft lighter band
      const sg = c.createLinearGradient(0, 0, w, h); sg.addColorStop(0.3, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,250,235,0.07)'); sg.addColorStop(0.7, 'rgba(255,255,255,0)');
      c.fillStyle = sg; c.fillRect(0, 0, w, h);
      A.seed(s0 + 77);
    });
  }

  /* ====================================================================================================
     Geometry helpers
     ==================================================================================================== */
  // a tube from a to b (world vectors)
  function tube(a, b, r, mat, o = {}) {
    const L = a.distanceTo(b), g = new T.CylinderGeometry(r, r, L, o.seg || 12, 1, !!o.open);
    const m = K3D.mesh(g, mat, { ink: o.ink != null ? o.ink : INK, inkW: o.inkW || 0.6, cast: o.cast });
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
    return m;
  }
  // a box standing on the playfield between two table points (a wall segment) of height h, thickness th
  function slabBetween(a, b, h, th, mat, o = {}) {
    const pa = P(a[0], a[1]), pb = P(b[0], b[1]), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const m = K3D.mesh(new T.BoxGeometry(th, h, L + (o.extra || 0)), mat, { ink: o.ink != null ? o.ink : INK, inkW: o.inkW || 0.6 });
    m.position.set((pa.x + pb.x) / 2, (pa.y + pb.y) / 2 + h / 2 + (o.lift || 0), (pa.z + pb.z) / 2);
    m.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
    m.rotation.order = 'YXZ'; m.rotation.x = Math.atan2(pb.y - pa.y, L) * Math.cos(m.rotation.y) * 0; // (the slope is gentle: walls stand plumb)
    return m;
  }
  // a smooth chrome tube through world points
  function wire(pts, r, mat, o = {}) {
    const curve = new T.CatmullRomCurve3(pts);
    const m = K3D.mesh(new T.TubeGeometry(curve, o.seg || Math.max(8, pts.length * 8), r, o.rs || 8), mat, { ink: o.ink != null ? o.ink : false, inkW: 0.5 });
    return m;
  }

  /* ====================================================================================================
     Build
     ==================================================================================================== */
  function build(K, st) {
    A.seed(4302);
    SC.K = K; SC.st = st;
    A.dark(K, { fog: '#140c18', bg: '#07050b', fogD: 0.0072, bloom: 1.05, ambK: 0.5, keyK: 0.55, key: '#ffe2b8', hemiK: 0.36, fill: '#6a8aff', under: '#ff9a4a' });
    K.maxBlur = 1.3; K.focusRange = 60;
    lampU.uFog.value.copy(K.fogCol); lampU.uFogD.value = 0.0072;
    K.camera.far = 2400; K.camera.updateProjectionMatrix();
    const still = new T.Group(); K.add(still); SC.still = still;
    const live = SC.live = { gates: [], stairs: [], targets: [], bumpers: [], slings: [], cups: [], buttons: [], spinners: [], bridges: [], magnets: [], flips: [], twins: [], greats: [], kick: [], stars: [], saves: [], scoops: [] };
    const chrome = SC.chrome = K3D.toon('#ffffff', { map: chromeTex(), emissive: '#262030', emissiveIntensity: 0.6 });
    const rubber = K3D.toon('#ffffff', { map: rubberTex() });
    const lamps = SC.lamps = {
      bulb: lampSet(K, new T.IcosahedronGeometry(1, 1), 9000, { mirror: true, dim: 0.22 }),
      star: lampSet(K, flatGeo(starShape()), 1200, { mirror: true, dim: 0.12, decal: true }),
      arrow: lampSet(K, flatGeo(arrowShape()), 600, { mirror: true, dim: 0.12, decal: true }),
      disc: lampSet(K, flatGeo(circShape()), 1600, { mirror: true, dim: 0.12, decal: true }),
      pool: lampSet(K, new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), 1400, { soft: true }),
      far: lampSet(K, new T.IcosahedronGeometry(1, 1), 2000, { mirror: true, dim: 0.25, fogD: 0.0008 }),
    };
    const glows = SC.glows = A.glows(K, 3000);
    const GI = '#ffe4b0';
    let gId = 0; const groups = SC.groups = {};
    const group = key => (groups[key] != null ? groups[key] : (groups[key] = Math.min(NG - 1, gId++)));

    /* ---------- the playfield, the apron, the cabinet ---------- */
    const D0 = -14, D1 = 432;
    for (let ci = 0, d0 = D0; d0 < D1; ci++, d0 += CH) {
      const res = TB.partAt(d0 + CH / 2) === 0 || d0 < 80 ? 1024 : 512;
      const tex = playTex(ci, d0, res);
      const n = 24, geo = new T.BufferGeometry(), pos = [], uv = [], idx = [];
      for (let j = 0; j <= n; j++) for (let i = 0; i <= 8; i++) {
        const x = -WALL + CH * i / 8, d = d0 + CH * j / n;
        pos.push(x, yb(d), -d); uv.push(i / 8, j / n);
      }
      for (let j = 0; j < n; j++) for (let i = 0; i < 8; i++) { const a = j * 9 + i; idx.push(a, a + 1, a + 10, a, a + 10, a + 9); }
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
      const m = K3D.mesh(geo, K3D.toon('#ffffff', { map: tex }), { ink: false, cast: false }); still.add(m);
    }
    // the shoulders outside the rails: raised lacquered wood ledges where the stalls stand
    const shoulderWood = K3D.toon('#ffffff', { map: woodTex('#5a2e18', 's') });
    for (const s of [-1, 1]) {
      const geo = new T.BoxGeometry(WALL - RAIL - 0.3, SH, D1 - D0); const m = K3D.mesh(geo, shoulderWood, { ink: INK, inkW: 0.5 });
      m.position.set(s * (RAIL + 0.3 + (WALL - RAIL - 0.3) / 2), 0, -(D0 + D1) / 2);
      m.rotation.x = Math.atan(SL); m.position.y = yb((D0 + D1) / 2) + SH / 2 - 0.05; still.add(m);
      // a painted trim strip with stars along the shoulder's edge
      const trim = K3D.mesh(new T.BoxGeometry(0.16, SH + 0.1, D1 - D0), K3D.toon('#d8a838', { emissive: '#4a3008', emissiveIntensity: 0.3 }), { ink: false });
      trim.position.set(s * (RAIL + 0.32), yb((D0 + D1) / 2) + SH / 2, -(D0 + D1) / 2); trim.rotation.x = Math.atan(SL); still.add(trim);
    }
    // the cabinet's side walls: dark wood rising to the glass, with painted side art and the lockdown channel
    const sideTex = K3D.paint('pb-side', 1024, 256, (c, w, h) => {
      c.fillStyle = '#4a2430'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { c.strokeStyle = `rgba(255,200,150,${0.05 + rnd() * 0.06})`; c.lineWidth = 2; c.beginPath(); c.moveTo(0, rnd() * h); c.lineTo(w, rnd() * h); c.stroke(); }
      // painted comets and planets along the wall (the cabinet's inside art)
      for (let i = 0; i < 14; i++) { const x = rnd() * w, y = 40 + rnd() * (h - 80), r = 8 + rnd() * 22, col = A.pick(['#e86a2a', '#4ac0e8', '#ffd24a', '#e84a9a', '#9ae86a']); c.fillStyle = col; c.globalAlpha = 0.6; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.globalAlpha = 0.35; c.fillRect(x - r * 4, y - 2, r * 4, 4); c.globalAlpha = 1; }
      c.fillStyle = '#d8a838'; c.fillRect(0, h - 14, w, 6); c.fillRect(0, 10, w, 4);
      c.font = 'bold 22px monospace'; c.fillStyle = 'rgba(255,220,150,0.35)'; c.fillText('COMET CARNIVAL', 40 + rnd() * 400, 60);
    }, { repeat: true });
    sideTex.repeat.set(10, 1);
    for (const s of [-1, 1]) {
      const m = K3D.mesh(new T.PlaneGeometry(D1 - D0, GLASS + 2), K3D.toon('#ffffff', { map: sideTex, side: T.DoubleSide }), { ink: false, cast: false });
      m.rotation.y = s * Math.PI / 2; m.rotation.order = 'YXZ'; m.rotation.x = 0; m.rotateZ(-s * Math.atan(SL));
      m.position.set(s * WALL, yb((D0 + D1) / 2) + (GLASS + 2) / 2 - 0.4, -(D0 + D1) / 2); still.add(m);
      // the steel side rail at the glass (the channel the glass slides in)
      const ch = K3D.mesh(new T.BoxGeometry(0.6, 0.5, D1 - D0), chrome, { ink: INK, inkW: 0.5 }); ch.rotation.x = Math.atan(SL);
      ch.position.set(s * (WALL - 0.2), yb((D0 + D1) / 2) + GLASS + 0.1, -(D0 + D1) / 2); still.add(ch);
      // general illumination: a row of warm bulbs in sockets along each wall (the light of the whole table)
      for (let d = D0 + 2; d < D1; d += 3.2) { lamps.bulb.add(s * (WALL - 0.35), yb(d) + 3.2, -d, 0.16, GI, 2.2, { mode: 0 }); lamps.pool.add(s * (WALL - 2.2), yb(d) + SH + 0.04, -d, 2.6, '#ffb870', 0.32, {}); }
    }
    // the apron at the bottom: painted metal with the rules card and the price card (pinball-life adds the cards)
    const apronTex = K3D.paint('pb-apron', 1024, 512, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1a2a6a'); g.addColorStop(1, '#0a1030'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(255,240,200,${rnd() * 0.7})`; c.beginPath(); c.arc(rnd() * w, rnd() * h, rnd() * 2, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#e8b030'; c.font = '900 92px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.fillText('COMET', w / 2, 150); c.fillText('CARNIVAL', w / 2, 250);
      c.strokeStyle = '#b0182a'; c.lineWidth = 6; c.strokeText('COMET', w / 2, 150); c.strokeText('CARNIVAL', w / 2, 250);
      c.font = 'bold 26px monospace'; c.fillStyle = '#f2e6c8'; c.fillText('EVERY GATE NEEDS A FRIEND', w / 2, 320);
      // scratches and worn edges
      for (let i = 0; i < 80; i++) { c.strokeStyle = `rgba(255,255,255,${rnd() * 0.12})`; c.beginPath(); const x = rnd() * w, y = rnd() * h; c.moveTo(x, y); c.lineTo(x + rnd() * 60 - 30, y + rnd() * 10 - 5); c.stroke(); }
      c.fillStyle = '#c0c4cc'; c.fillRect(0, 0, w, 12); c.fillRect(0, h - 12, w, 12);
    });
    {
      const geo = new T.PlaneGeometry(2 * RAIL + 0.6, 9, 1, 1); geo.rotateX(-Math.PI / 2 + Math.atan(SL) - 0.12);
      const m = K3D.mesh(geo, K3D.toon('#ffffff', { map: apronTex }), { ink: false }); m.position.set(0, yb(-4.8) + 0.9, 4.8); still.add(m);
      // the lockdown bar beyond it
      const bar = K3D.mesh(new T.BoxGeometry(2 * WALL + 1.6, 1.2, 1.6), chrome, { ink: INK }); bar.position.set(0, yb(-13) + 1.4, 13); still.add(bar);
    }

    /* ---------- rails, dividers, kerbs, one-way gates, ledges ---------- */
    const plastic = new T.MeshBasicMaterial({ map: plasticTex(), transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false });
    const kerbMat = K3D.toon('#ffffff', { map: K3D.paint('pb-kerb', 128, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f2e6c8' : '#c0182a'; c.fillRect(i * 16, 0, 16, h); } c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, h - 6, w, 6); }, { repeat: true }) });
    for (const w of TB.walls) {
      const a = w.a, b = w.b, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (w.kind === 'rail' && !w.sling) {
        if (w.divider) {
          // the divider: a low rail and a clear panel; rubber-ringed posts at its ends are posts
          const h0 = TB.yAt(a[1]) - yb(a[1]);
          still.add(tube(P(a[0], a[1], 0.75), P(b[0], b[1], 0.75), 0.11, chrome));
          const pan = new T.Mesh(new T.PlaneGeometry(L, 0.95), plastic); const pa = P(a[0], a[1]), pb = P(b[0], b[1]);
          pan.position.set((pa.x + pb.x) / 2, (pa.y + pb.y) / 2 + 0.5, (pa.z + pb.z) / 2); pan.rotation.y = Math.PI / 2; pan.rotateX(Math.atan2(pb.y - pa.y, L)); pan.userData.noSee = true; K.add(pan);
          for (let u = 1.6; u < L - 0.5; u += 3.2) { const q = P(a[0] + (b[0] - a[0]) * u / L, a[1] + (b[1] - a[1]) * u / L); const pst = K3D.mesh(new T.CylinderGeometry(0.07, 0.07, 1.0, 8), chrome, { ink: INK, inkW: 0.4 }); pst.position.set(q.x, q.y + 0.5, q.z); still.add(pst); }
          // a chase line of white bulbs along the top of the divider
          lamps.bulb.line(P(a[0], a[1], 1.0), P(b[0], b[1], 1.0), 0.8, 0.07, ['#fff4d8', '#ffd890'], 1.8, { mode: 1, sp: 0.5, step: 0.05 });
          continue;
        }
        // a chrome wireform guide: two tubes on posts
        const up = Math.abs(a[1] - b[1]) > Math.abs(a[0] - b[0]);
        for (const hh of [0.45, 1.05]) still.add(tube(P(a[0], a[1], hh), P(b[0], b[1], hh), 0.085, chrome, { ink: false }));
        for (let u = 0; u <= L; u += 2.2) { const q = P(a[0] + (b[0] - a[0]) * u / Math.max(L, 0.01), a[1] + (b[1] - a[1]) * u / Math.max(L, 0.01)); const pst = K3D.mesh(new T.CylinderGeometry(0.07, 0.09, 1.1, 8), chrome, { ink: INK, inkW: 0.4 }); pst.position.set(q.x, q.y + 0.55, q.z); still.add(pst); }
        // outer rails: chase lights running up the table along them
        if (up && Math.abs(a[0]) > 6) lamps.bulb.line(P(a[0] + Math.sign(a[0]) * 0.18, a[1], 1.25), P(b[0] + Math.sign(b[0]) * 0.18, b[1], 1.25), 0.9, 0.075, ['#ffd890', '#fff4d8', '#ff9a4a'], 1.7, { mode: 1, sp: 0.7, step: -0.035 });
      } else if (w.kind === 'kerb') {
        still.add(slabBetween(a, b, 0.46, 0.42, kerbMat, { inkW: 0.5 }));
        for (let x = a[0] + 0.6; x < b[0]; x += 1.2) lamps.bulb.add(x, TB.yAt(a[1]) + 0.52, -a[1], 0.07, '#ffd890', 1.6, { mode: 1, sp: 0.8, ph: x * 0.05 });
      } else if (w.kind === 'oneway') {
        // a wire gate: thin chrome loops hanging from a bar (they swing up to let a ball through going up)
        still.add(tube(P(a[0], a[1], 1.1), P(b[0], b[1], 1.1), 0.06, chrome, { ink: false }));
        for (let x = Math.min(a[0], b[0]) + 0.4; x < Math.max(a[0], b[0]); x += 0.55) { const wl = K3D.mesh(new T.TorusGeometry(0.2, 0.025, 4, 10, Math.PI), chrome, { ink: false }); const q = P(x, a[1], 0.92); wl.position.copy(q); wl.rotation.set(0, Math.PI / 2, Math.PI); wl.scale.set(1, 2.2, 1); still.add(wl); }
      } else if (w.kind === 'ledge') {
        // a raised ledge: a wooden step with a checker trim; its top is the higher playfield beyond
        const m = slabBetween(a, b, 0.9, 0.7, K3D.toon('#ffffff', { map: woodTex('#8a5a2a', 'l') }), { inkW: 0.6 }); still.add(m);
        const tr = slabBetween(a, b, 0.14, 0.74, kerbMat, { lift: 0.82, ink: false }); still.add(tr);
      }
    }

    /* ---------- posts, bumpers, slingshots ---------- */
    TB.posts.forEach((p, i) => {
      const q = P(p.x, p.d);
      if (p.kind === 'post') {
        const pst = K3D.mesh(new T.CylinderGeometry(p.r * 0.55, p.r * 0.65, 1.2, 14), chrome, { ink: INK, inkW: 0.5 }); pst.position.set(q.x, q.y + 0.6, q.z); still.add(pst);
        const ring = K3D.mesh(new T.TorusGeometry(p.r * 0.8, p.r * 0.32, 8, 20).rotateX(Math.PI / 2), rubber, { ink: INK, inkW: 0.5 }); ring.position.set(q.x, q.y + 0.55, q.z); still.add(ring);
        const cap = K3D.mesh(new T.CylinderGeometry(p.r * 0.75, p.r * 0.6, 0.18, 14), K3D.toon(A.pick(['#c0182a', '#e8b030', '#1a6ac0'])), { ink: INK, inkW: 0.5 }); cap.position.set(q.x, q.y + 1.25, q.z); still.add(cap);
        lamps.bulb.add(q.x, q.y + 1.42, q.z, 0.09, A.pick(['#fff4d8', '#ffd890', '#ff9a4a']), 1.8, { mode: rnd() < 0.3 ? 2 : 0, sp: 1.5 });
        return;
      }
      // a pop bumper: skirt, ringed body, a lit cap; it glows when it is about to kick (live.bumpers)
      const g = new T.Group(); g.position.copy(q); g.userData.live = true; K.add(g);
      const r = p.r, col = A.pick(['#e8302a', '#2a8ae8', '#e8b030', '#e84ab0', '#3ac86a']);
      const skirt = K3D.mesh(new T.CylinderGeometry(r * 1.25, r * 1.32, 0.16, 28), K3D.toon('#f2e6c8'), { ink: INK, inkW: 0.6 }); skirt.position.y = 0.08; g.add(skirt);
      const body = K3D.mesh(new T.CylinderGeometry(r * 0.92, r, 0.9, 28), K3D.toon(col), { ink: INK, inkW: 0.7 }); body.position.y = 0.6; g.add(body);
      const ringM = K3D.mesh(new T.CylinderGeometry(r * 1.02, r * 1.02, 0.18, 28, 1, true), chrome, { ink: false }); ringM.position.y = 0.42; g.add(ringM);
      const capMat = new T.MeshBasicMaterial({ color: hot(col, 1.1), toneMapped: false });
      const cap = new T.Mesh(new T.SphereGeometry(r * 0.95, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), capMat); cap.position.y = 1.0; cap.scale.y = 0.7; g.add(cap);
      const cap2 = K3D.mesh(new T.TorusGeometry(r * 0.94, 0.06, 6, 28).rotateX(Math.PI / 2), chrome, { ink: false }); cap2.position.y = 1.02; g.add(cap2);
      const gi = glows.add(q.x, q.y + 1.6, q.z, r * 2.4, col, 0.3, 0.2);
      lamps.pool.add(q.x, q.y + 0.03, q.z, r * 3.2, col, 0.55, { mode: 0 });
      live.bumpers.push({ i, g, body, cap, capMat, col, gi, q, kick: 0 });
    });
    TB.slings.forEach((s, i) => {
      // a slingshot: a striped tent (pinball-life dresses the part-1 ones as fairground stalls) with a rubber face
      const a = P(s.a[0], s.a[1]), b = P(s.b[0], s.b[1]);
      const back = [s.a[0] + Math.sign(s.a[0]) * 0.0, s.b[1]];
      const shape = new T.Shape(); shape.moveTo(s.a[0], -s.a[1]); shape.lineTo(s.b[0], -s.b[1]); shape.lineTo(s.a[0], -s.b[1] - 0.2); shape.closePath();
      const geo = new T.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false }); geo.rotateX(Math.PI / 2); geo.translate(0, 1.2, 0);
      const stripe = K3D.toon('#ffffff', { map: K3D.paint('pb-tent', 128, 64, (c, w, h) => { for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#f2e6c8' : (i ? '#1a6ac0' : '#c0182a'); c.fillRect(k * 16, 0, 16, h); } }, { repeat: true }) });
      const m = K3D.mesh(geo, stripe, { ink: INK, inkW: 0.6 }); m.position.y = TB.yAt(s.a[1]); still.add(m);
      const face = tube(P(s.a[0], s.a[1], 0.55), P(s.b[0], s.b[1], 0.55), 0.22, rubber, { inkW: 0.5 }); face.userData.live = true; K.add(face);
      const li = []; for (let u = 0.15; u < 1; u += 0.23) li.push(lamps.bulb.add(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u + 1.0, a.z + (b.z - a.z) * u, 0.1, '#fff4d8', 1.6, { mode: 0 }));
      live.slings.push({ i, face, li, n: s.n });
    });
    /* ---------- holes: outlanes (dark alleys with warning lights), gaps on the rails ---------- */
    TB.holes.forEach(h => {
      if (h.r) {
        const q = P(h.x, h.d);
        const pit = new T.Mesh(new T.CircleGeometry(h.r, 28).rotateX(-Math.PI / 2), K3D.flat('#050306')); pit.position.set(q.x, q.y + 0.02, q.z); still.add(pit);
        const lip = K3D.mesh(new T.TorusGeometry(h.r, 0.08, 6, 28).rotateX(Math.PI / 2), chrome, { ink: false }); lip.position.set(q.x, q.y + 0.04, q.z); still.add(lip);
        for (let k = 0; k < 10; k++) { const an = k / 10 * Math.PI * 2; lamps.bulb.add(q.x + Math.cos(an) * (h.r + 0.35), q.y + 0.12, q.z + Math.sin(an) * (h.r + 0.35), 0.075, '#ff3a2a', 1.8, { mode: 1, sp: 1.1, ph: k / 10 }); }
        glows.add(q.x, q.y + 0.3, q.z, h.r * 3, '#ff3a2a', 0.18, 0.6);
      } else {
        // a gap in the upper rails: a dark slot with lit edges (spinner bridges cross these)
        const x0 = h.x0, x1 = h.x1, cx = (x0 + x1) / 2;
        for (const d of [h.d0, h.d1]) lamps.bulb.line(P(x0, d, 0.06), P(x1, d, 0.06), 0.45, 0.07, h.bridge ? '#8af0ff' : '#ff3a2a', 1.7, { mode: 1, sp: 1.2 });
      }
    });

    /* ---------- the controls, the gates and the cables between them ---------- */
    const icon = (kind) => K3D.paint('pb-icon|' + kind, 128, 128, (c, w, h) => {
      c.fillStyle = '#1a1020'; c.beginPath(); c.arc(64, 64, 62, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ffe9a8'; c.fillStyle = '#ffe9a8'; c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round';
      if (kind === 'gate') { c.beginPath(); c.moveTo(24, 92); c.lineTo(104, 92); c.stroke(); c.beginPath(); c.moveTo(34, 84); c.lineTo(34, 30); c.lineTo(96, 30); c.lineTo(96, 84); c.stroke(); c.beginPath(); c.moveTo(64, 74); c.lineTo(64, 42); c.moveTo(50, 54); c.lineTo(64, 40); c.lineTo(78, 54); c.stroke(); }
      if (kind === 'stairs') { c.beginPath(); c.moveTo(22, 100); c.lineTo(22, 84); c.lineTo(44, 84); c.lineTo(44, 66); c.lineTo(66, 66); c.lineTo(66, 48); c.lineTo(88, 48); c.lineTo(88, 30); c.lineTo(106, 30); c.stroke(); }
      if (kind === 'flip') { c.beginPath(); c.moveTo(26, 94); c.lineTo(84, 70); c.stroke(); c.beginPath(); c.arc(76, 36, 12, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(60, 64); c.quadraticCurveTo(50, 40, 64, 30); c.stroke(); }
      if (kind === 'bridge') { c.beginPath(); c.moveTo(18, 80); c.quadraticCurveTo(64, 30, 110, 80); c.stroke(); for (let x = 30; x < 104; x += 16) { c.beginPath(); c.moveTo(x, 80); c.lineTo(x, 62 - Math.sin((x - 18) / 92 * Math.PI) * 14); c.stroke(); } }
      if (kind === 'lever') { c.beginPath(); c.moveTo(40, 96); c.lineTo(88, 30); c.stroke(); c.beginPath(); c.arc(88, 30, 12, 0, Math.PI * 2); c.fill(); c.fillRect(24, 92, 80, 12); }
    });
    const insert = (x, d, kind, g) => {
      const m = new T.Mesh(new T.CircleGeometry(0.62, 28).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: icon(kind), toneMapped: false, color: hot('#ffffff', 1.0), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      const q = P(x, d, 0.025); m.position.copy(q); m.userData.live = true; K.add(m);
      const ring = lamps.disc.add(q.x, q.y - 0.005, q.z, 0.8, '#ffd890', 1.2, { mode: 3, g, sp: 1.2 });
      return m;
    };
    // a cable of chase lights from a control to what it works (under the playfield's lacquer)
    const cable = (from, to, g) => {
      const [x0, d0] = from, [x1, d1] = to, dm = (d0 + d1) / 2;
      const pts = [[x0, d0], [x0, dm], [x1, dm], [x1, d1]];
      for (let k = 0; k < 3; k++) {
        const a = P(pts[k][0], pts[k][1], 0.03), b = P(pts[k + 1][0], pts[k + 1][1], 0.03), L = a.distanceTo(b);
        if (L < 0.2) continue;
        lamps.disc.line(a, b, 0.42, 0.11, '#fff0c0', 1.5, { mode: 3, g, sp: 1.0, step: 0.06, ph0: k * 0.3, ball: 0 });
      }
    };
    const gateById = {}; TB.gates.forEach(g => (gateById[g.id] = g));
    // gates
    TB.gates.forEach(g => {
      const gg = new T.Group(); gg.userData.live = true; K.add(gg);
      const q0 = P(g.x0, g.d), q1 = P(g.x1, g.d), w = Math.abs(g.x1 - g.x0), cx = (g.x0 + g.x1) / 2, q = P(cx, g.d);
      const grp = group('g:' + g.id);
      if (g.kind === 'lift') {
        // a striped barrier pole on a post at the outer end that swings up
        const pivX = g.lane < 0 ? g.x0 + 0.3 : g.x1 - 0.3, pv = P(pivX, g.d);
        const post = K3D.mesh(new T.CylinderGeometry(0.22, 0.28, 1.6, 14), K3D.toon('#2a2a36'), { ink: INK }); post.position.set(pv.x, pv.y + 0.8, pv.z); gg.add(post);
        const arm = new T.Group(); arm.position.set(pv.x, pv.y + 0.95, pv.z); gg.add(arm);
        const pole = K3D.mesh(new T.BoxGeometry(w - 0.5, 0.32, 0.26), K3D.toon('#ffffff', { map: K3D.paint('pb-pole', 128, 16, (c, ww, hh) => { for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#f2e6c8' : '#e8302a'; c.fillRect(k * 16, 0, 16, hh); } }, { repeat: true }) }), { ink: INK });
        pole.position.x = (g.lane < 0 ? 1 : -1) * (w - 0.5) / 2; arm.add(pole);
        const tipL = lamps.bulb.add(0, 0, 0, 0.12, '#ffe24a', 2, { mode: 2, sp: 2 });
        live.gates.push({ g, gg, arm, kind: 'lift', dir: g.lane < 0 ? 1 : -1, tipL, w, pv, a: 0 });
      } else {
        // a drop gate: a row of lit blades that sink into the table
        const blades = new T.Group(); gg.add(blades);
        for (let x = Math.min(g.x0, g.x1) + 0.45; x < Math.max(g.x0, g.x1) - 0.2; x += 0.9) {
          const bq = P(x, g.d);
          const bl = K3D.mesh(new T.BoxGeometry(0.78, 1.3, 0.22), K3D.toon('#1a6ac0', { emissive: '#0a2a6a', emissiveIntensity: 0.5 }), { ink: INK, inkW: 0.5 }); bl.position.set(bq.x, bq.y + 0.65, bq.z); blades.add(bl);
          const stripe = new T.Mesh(new T.PlaneGeometry(0.6, 0.12), K3D.flat(hot('#8af0ff', 1.6))); stripe.position.set(bq.x, bq.y + 1.05, bq.z + 0.115); blades.add(stripe);
        }
        const slot = new T.Mesh(new T.PlaneGeometry(w, 0.32).rotateX(-Math.PI / 2), K3D.flat('#050306')); slot.position.set(q.x, q.y + 0.015, q.z); gg.add(slot);
        live.gates.push({ g, gg, blades, kind: 'drop', a: 0 });
      }
      // the cable from its control
      const c = TB.byId[g.by];
      if (c) { cable([c.x, c.d], [cx, g.d - 0.6], grp); insert(c.x + (c.x < 0 ? 1.7 : -1.7), c.d - 1.4, 'gate', grp); }
    });
    // staircases: each step a barrier that drops and a step block that rises
    TB.stairs.forEach(s => {
      const grp = group('s:' + s.id), steps = [];
      s.steps.forEach((d, i) => {
        const w = Math.abs(s.x1 - s.x0), cx = (s.x0 + s.x1) / 2, q = P(cx, d);
        const bar = K3D.mesh(new T.BoxGeometry(w - 0.3, 0.9, 0.26), K3D.toon('#c0182a', { emissive: '#3a0606', emissiveIntensity: 0.4 }), { ink: INK, inkW: 0.5 });
        bar.position.set(q.x, q.y + 0.45, q.z); bar.userData.live = true; K.add(bar);
        const blk = K3D.mesh(new T.BoxGeometry(w - 0.3, 0.2 + i * 0.12, 1.2), K3D.toon('#ffffff', { map: woodTex('#b07a3a', 'st') }), { ink: INK, inkW: 0.5 });
        blk.position.set(q.x, q.y - 0.4, q.z + 0.6); blk.userData.live = true; K.add(blk);
        const li = lamps.bulb.add(q.x + (s.lane < 0 ? -1 : 1) * (w / 2 - 0.4), q.y + 1.05, q.z, 0.1, '#ff3a2a', 1.8, { mode: 0 });
        steps.push({ bar, blk, li, q, i, a: 0 });
      });
      live.stairs.push({ s, steps });
      const bank = TB.byId[s.by];
      cable([bank.x, (bank.d + bank.d1) / 2], [(s.x0 + s.x1) / 2, s.steps[0] - 0.6], grp); insert(bank.x + bank.face * 1.8, bank.d - 1.2, 'stairs', grp);
    });
    // controls
    for (const c of TB.controls) {
      const q = P(c.x, c.d);
      if (c.kind === 'star') {
        const base = K3D.mesh(new T.CylinderGeometry(1.15, 1.25, 0.12, 32), chrome, { ink: INK, inkW: 0.5 }); base.position.set(q.x, q.y + 0.04, q.z); still.add(base);
        const top = new T.Mesh(flatGeo(starShape(0.95, 0.42)), new T.MeshBasicMaterial({ color: hot('#fff0c0', 1.2), toneMapped: false })); top.position.set(q.x, q.y + 0.115, q.z); top.userData.live = true; K.add(top);
        const gl = glows.add(q.x, q.y + 0.5, q.z, 2.2, '#ffe9a8', 0.16, 0);
        live.stars.push({ c, top, gl, q });
      } else if (c.kind === 'cup') {
        const dish = K3D.mesh(new T.CylinderGeometry(1.15, 0.7, 0.3, 32, 1, true), K3D.toon('#2a1a30', { side: T.DoubleSide }), { ink: false }); dish.position.set(q.x, q.y + 0.0, q.z); still.add(dish);
        const lip = K3D.mesh(new T.TorusGeometry(1.15, 0.12, 8, 32).rotateX(Math.PI / 2), chrome, { ink: INK, inkW: 0.5 }); lip.position.set(q.x, q.y + 0.15, q.z); still.add(lip);
        const ringLs = []; for (let k = 0; k < 12; k++) { const an = k / 12 * Math.PI * 2; ringLs.push(lamps.bulb.add(q.x + Math.cos(an) * 1.42, q.y + 0.2, q.z + Math.sin(an) * 1.42, 0.08, '#8af0ff', 1.2, { mode: 1, sp: 0.8, ph: k / 12 })); }
        live.cups.push({ c, ringLs, q });
      } else if (c.kind === 'targets') {
        const bankG = []; c.targets.forEach((t, i) => {
          const tq = P(t.x, t.d), piv = new T.Group(); piv.position.set(tq.x + c.face * -0.05, tq.y, tq.z); piv.userData.live = true; K.add(piv);
          const plate = K3D.mesh(new T.BoxGeometry(0.16, 1.2, 1.1), K3D.toon(['#e8302a', '#e8b030', '#3ac86a', '#2a8ae8', '#e84ab0'][i]), { ink: INK, inkW: 0.5 }); plate.position.set(0, 0.6, 0); piv.add(plate);
          const face = new T.Mesh(new T.CircleGeometry(0.3, 16), K3D.flat(hot('#fff4d8', 1.3))); face.position.set(c.face * 0.09, 0.7, 0); face.rotation.y = c.face * Math.PI / 2; piv.add(face);
          bankG.push({ piv, a: 0 });
        });
        // the bank's housing behind the targets
        const hq = P(c.x + c.face * -0.5, (c.d + c.d1) / 2); const hs = K3D.mesh(new T.BoxGeometry(0.7, 1.5, c.d1 - c.d + 1.2), K3D.toon('#2a2a36'), { ink: INK }); hs.position.set(hq.x, hq.y + 0.75, hq.z); still.add(hs);
        live.targets.push({ c, bankG });
      } else if (c.kind === 'button') {
        const base = K3D.mesh(new T.CylinderGeometry(1.0, 1.15, 0.3, 28), K3D.toon('#2a2a36'), { ink: INK }); base.position.set(q.x, q.y + 0.15, q.z); still.add(base);
        const capM = new T.MeshBasicMaterial({ color: hot('#ff4a3a', 1.0), toneMapped: false });
        const cap = new T.Mesh(new T.CylinderGeometry(0.82, 0.85, 0.22, 28), capM); cap.position.set(q.x, q.y + 0.38, q.z); cap.userData.live = true; K.add(cap);
        const capT = K3D.mesh(new T.TorusGeometry(0.84, 0.05, 6, 28).rotateX(Math.PI / 2), chrome, { ink: false }); capT.position.set(q.x, q.y + 0.49, q.z); still.add(capT);
        live.buttons.push({ c, cap, capM, q });
      } else if (c.kind === 'spinner') {
        const x0 = c.x0, x1 = c.x1, w = x1 - x0;
        const p0 = P(x0, c.d), p1 = P(x1, c.d);
        for (const pp of [p0, p1]) { const pst = K3D.mesh(new T.CylinderGeometry(0.14, 0.16, 2.2, 10), chrome, { ink: INK }); pst.position.set(pp.x, pp.y + 1.1, pp.z); still.add(pst); }
        const axle = new T.Group(); axle.position.set((p0.x + p1.x) / 2, (p0.y + p1.y) / 2 + 1.9, (p0.z + p1.z) / 2); axle.userData.live = true; K.add(axle);
        const flag = K3D.mesh(new T.BoxGeometry(w - 0.4, 1.4, 0.06), K3D.toon('#ffffff', { map: K3D.paint('pb-spin', 256, 64, (cc, ww, hh) => { cc.fillStyle = '#c0182a'; cc.fillRect(0, 0, ww, hh); cc.fillStyle = '#e8b030'; cc.font = '900 40px sans-serif'; cc.textAlign = 'center'; cc.fillText('SPIN', ww / 2, 46); }) }), { ink: INK, inkW: 0.5 });
        flag.position.y = -0.7; axle.add(flag);
        live.spinners.push({ c, axle, a: 0, v: 0 });
        const br = TB.byId[c.bridge]; if (br) { const grp = group('b:' + br.id); cable([c.x, c.d], [(br.lane < 0 ? -3.75 : 3.75), br.d0 - 0.4], grp); insert(c.x + (c.x < 0 ? 1.7 : -1.7), c.d - 1.6, 'bridge', grp); }
      } else if (c.kind === 'lever') {
        const base = K3D.mesh(new T.BoxGeometry(1.4, 0.4, 1.0), K3D.toon('#2a2a36'), { ink: INK }); base.position.set(q.x, q.y + 0.2, q.z); still.add(base);
        const arm = new T.Group(); arm.position.set(q.x, q.y + 0.4, q.z); arm.userData.live = true; K.add(arm);
        arm.add(tube(V(0, 0, 0), V(0, 1.6, 0), 0.08, chrome));
        const knob = K3D.mesh(new T.SphereGeometry(0.26, 16, 12), K3D.toon('#e8302a'), { ink: INK }); knob.position.y = 1.7; arm.add(knob);
        live.lever = { c, arm };
        const grp = group('g:gDet'); insert(c.x + 1.6, c.d - 1.2, 'lever', grp);
      } else if (c.kind === 'scoop' || c.kind === 'mouth') {
        const r = c.kind === 'mouth' ? c.r : 1.1;
        const pit = new T.Mesh(new T.CircleGeometry(r, 32).rotateX(-Math.PI / 2), K3D.flat('#100410')); pit.position.set(q.x, q.y + 0.02, q.z); still.add(pit);
        for (let k = 0; k < 16; k++) { const an = k / 16 * Math.PI * 2; lamps.bulb.add(q.x + Math.cos(an) * (r + 0.3), q.y + 0.15, q.z + Math.sin(an) * (r + 0.3), 0.1, k % 2 ? '#ffd24a' : '#ff5ad6', 1.8, { mode: 1, sp: 1.4, ph: k / 16 }); }
        glows.add(q.x, q.y + 0.6, q.z, r * 3.4, '#ffb84a', 0.35, 0.3);
        live.scoops.push({ c, q });
      }
    }
    // buttons → their flippers: a cable to the cradle
    TB.flippers.forEach(f => { const bt = TB.byId[f.button], cr = TB.byId[f.cradle], grp = group('f:' + f.id); cable([bt.x, bt.d], [cr.x, cr.d - 1.2], grp); insert(bt.x + (bt.x < 0 ? 1.6 : -1.6), bt.d - 1.4, 'flip', grp); });
    { const bt = TB.byId.btnD, lv = TB.byId.lever; if (bt && lv) cable([bt.x, bt.d], [lv.x, lv.d], group('g:gDet')); }
    // save posts: a small lit button post in each section
    for (const s of TB.sections) if (s.save) for (const sp of s.save) {
      const q = P(sp[0], sp[1]);
      const m = K3D.mesh(new T.CylinderGeometry(0.42, 0.5, 0.24, 20), K3D.toon('#2a2a36'), { ink: INK }); m.position.set(q.x, q.y + 0.12, q.z); still.add(m);
      const li = lamps.disc.add(q.x, q.y + 0.25, q.z, 0.34, '#5aff8a', 1.4, { mode: 4, sp: 2 });
      live.saves.push({ q, li, s });
    }
    // bridges of light across the gaps (built by spinners)
    TB.bridges.forEach(br => {
      const ls = [], x0 = br.lane < 0 ? -TB.T.RAIL3 + 0.4 : 0.6, x1 = br.lane < 0 ? -0.6 : TB.T.RAIL3 - 0.4;
      for (let d = br.d0 - 0.2; d <= br.d1 + 0.2; d += 0.45) for (let x = x0; x <= x1; x += 0.7) { const q = P(x, d, 0.05); ls.push(lamps.disc.add(q.x, q.y, q.z, 0.2, '#8af0ff', 0, { mode: 0 })); }
      live.bridges.push({ br, ls });
    });
    /* ---------- flippers: the great flippers, twin flippers, flippers for a friend ---------- */
    const batMat = K3D.toon('#f2e6c8'), batRub = K3D.toon('#c0182a');
    const bat = (len, w) => {
      const g = new T.Group();
      const shape = new T.Shape(); shape.absarc(0, 0, w, Math.PI / 2, Math.PI * 1.5, false); shape.lineTo(len, -w * 0.45); shape.absarc(len, 0, w * 0.45, -Math.PI / 2, Math.PI / 2, false); shape.closePath();
      const geo = new T.ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 }); geo.rotateX(Math.PI / 2); geo.translate(0, 0.75, 0);
      const m = K3D.mesh(geo, batMat, { ink: INK, inkW: 0.8 }); g.add(m);
      // the red rubber ring all round the bat, a printed star and stripe on top, two bolts
      const rim = shape.getPoints(24).map(p => V(p.x, 0.42, -p.y)); rim.push(rim[0].clone());
      g.add(K3D.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(rim, true), 80, 0.16, 8, true), batRub, { ink: INK, inkW: 0.5 }));
      const topTex = K3D.paint('pb-battop', 256, 64, (c, ww, hh) => { c.fillStyle = '#f2e6c8'; c.fillRect(0, 0, ww, hh); c.fillStyle = '#c0182a'; c.fillRect(0, hh * 0.38, ww, hh * 0.24); c.fillStyle = '#e8b030'; c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 9 : 22; c.lineTo(60 + Math.cos(a) * r, hh / 2 + Math.sin(a) * r); } c.fill(); c.fillStyle = '#1a2a6a'; c.font = '900 26px sans-serif'; c.fillText('COMET', 110, hh / 2 + 9); for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(80,60,40,0.15)'; c.fillRect(Math.random() * ww, Math.random() * hh, 3, 2); } });
      const top = new T.Mesh(new T.PlaneGeometry(len * 0.8, w * 1.0).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: topTex, polygonOffset: -2 })); top.position.set(len * 0.47, 0.83, 0); g.add(top);
      for (const bx of [len * 0.2, len * 0.75]) { const bolt = K3D.mesh(new T.CylinderGeometry(0.1, 0.1, 0.06, 8), chrome, { ink: INK, inkW: 0.3 }); bolt.position.set(bx, 0.84, w * 0.35); g.add(bolt); }
      const pivot = K3D.mesh(new T.CylinderGeometry(w * 0.5, w * 0.5, 0.9, 16), chrome, { ink: INK }); pivot.position.y = 0.45; g.add(pivot);
      return g;
    };
    TB.kickers.forEach(k => {
      if (k.great) {
        // the two great flippers at the bottom: drawbridges
        const s = Math.sign(k.x), pv = P(s * 7.6, 3.2), g = bat(6.4, 0.85); g.position.copy(pv); g.rotation.y = s < 0 ? -0.32 : Math.PI + 0.32; g.userData.live = true; K.add(g);
        live.greats.push({ k, g, base: g.rotation.y, s, a: 0 });
        lamps.bulb.line(P(s * 7.4, 4.8, 0.1), P(s * 2.2, 3.0, 0.1), 0.7, 0.08, '#ffd890', 1.6, { mode: 1, sp: 0.6 });
      } else {
        // a kicker: a kick-out hole with a lit arrow
        const q = P(k.x, k.d);
        const pit = new T.Mesh(new T.CircleGeometry(k.r * 0.8, 24).rotateX(-Math.PI / 2), K3D.flat('#100410')); pit.position.set(q.x, q.y + 0.02, q.z); still.add(pit);
        const lip = K3D.mesh(new T.TorusGeometry(k.r * 0.8, 0.09, 6, 24).rotateX(Math.PI / 2), chrome, { ink: false }); lip.position.set(q.x, q.y + 0.05, q.z); still.add(lip);
        const ai = lamps.arrow.add(q.x, q.y + 0.03, q.z - k.r * 1.4, 0.55, k.cross ? '#ff5ad6' : '#5aff8a', 1.5, { mode: 1, sp: 1.2 });
        live.kick.push({ k, q, ai });
      }
    });
    const twinBat = (cr, s, len) => { const pv = P(cr.x + s * 2.4, cr.d + 0.7), g = bat(len, 0.8); g.position.copy(pv); g.rotation.y = s < 0 ? Math.PI + 0.25 : -0.25; g.userData.live = true; K.add(g); return { g, base: g.rotation.y, s }; };
    TB.twins.forEach(t => {
      const parts = t.cradles.map(cid => { const cr = TB.byId[cid], s = Math.sign(cr.x); const o = twinBat(cr, s, 4.2); const q = P(cr.x, cr.d);
        const ring = []; for (let k = 0; k < 14; k++) { const an = k / 14 * Math.PI * 2; ring.push(lamps.bulb.add(q.x + Math.cos(an) * 1.3, q.y + 0.95, q.z + Math.sin(an) * 1.3, 0.09, '#ffd24a', 0.4, { mode: 0 })); }
        return Object.assign(o, { cr, ring, q }); });
      live.twins.push({ t, parts, fire: 0 });
    });
    TB.flippers.forEach(f => { const cr = TB.byId[f.cradle], s = Math.sign(cr.x); const o = twinBat(cr, s, 3.6); live.flips.push(Object.assign(o, { f, cr, fire: 0 })); });
    /* ---------- wire ramps (rides), magnets, kickouts ---------- */
    for (const r of TB.rides) {
      if (Math.max(...r.pts.map(p => p[2])) < 1.2) continue;
      const pts = []; for (let u = 0; u <= 1.0001; u += 1 / 40) pts.push(TB.rideAt(r, u));
      for (const off of [-0.72, 0.72]) {
        const wp = pts.map((p, k) => { const q = pts[Math.min(pts.length - 1, k + 1)], o = pts[Math.max(0, k - 1)], dx = q[0] - o[0], dd = q[1] - o[1], L = Math.hypot(dx, dd) || 1; return P(p[0] + (-dd / L) * off, p[1] + (dx / L) * off, p[2] + 0.35); });
        still.add(wire(wp, 0.07, chrome, { seg: 120 }));
      }
      // its supports down to the table
      for (let k = 4; k < pts.length - 2; k += 6) { const p = pts[k]; if (p[2] < 1) continue; still.add(tube(P(p[0], p[1], 0), P(p[0], p[1], p[2] + 0.3), 0.06, chrome, { ink: false })); }
    }
    TB.magnets.forEach((M, k) => {
      const a = P(M.x0, M.d), b = P(M.x1, M.d);
      const slot = new T.Mesh(new T.PlaneGeometry(Math.abs(M.x1 - M.x0) + 1.4, 0.4).rotateX(-Math.PI / 2), K3D.flat('#060408')); slot.position.set((a.x + b.x) / 2, a.y + 0.02, a.z); still.add(slot);
      lamps.bulb.line(P(M.x0 - 0.6, M.d - 0.4, 0.06), P(M.x1 + 0.6, M.d - 0.4, 0.06), 0.5, 0.06, '#ff5ad6', 1.4, { mode: 1, sp: 1.0 });
      const cart = new T.Group(); cart.userData.live = true; K.add(cart);
      const saucer = K3D.mesh(new T.CylinderGeometry(0.85, 1.0, 0.3, 24), K3D.toon('#c0c4cc'), { ink: INK }); saucer.position.y = 0.25; cart.add(saucer);
      const dome = K3D.mesh(new T.SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), K3D.toon('#e8302a'), { ink: INK }); dome.position.y = 0.4; cart.add(dome);
      const horse = K3D.mesh(new T.TorusGeometry(0.32, 0.1, 8, 16, Math.PI), K3D.toon('#c0182a'), { ink: INK }); horse.position.y = 0.95; cart.add(horse);
      const eye = lamps.bulb.add(0, 0, 0, 0.1, '#ff5ad6', 2, { mode: 2, sp: 3 });
      live.magnets.push({ M, k, cart, eye });
    });
    TB.loose.forEach(L => {
      const q = P(L.x, L.d0 + 0.6);
      const hole = new T.Mesh(new T.CircleGeometry(0.8, 20).rotateX(-Math.PI / 2), K3D.flat('#100410')); hole.position.set(q.x, q.y + 0.02, q.z); still.add(hole);
      const path = []; for (let d = L.d0; d > L.d1; d -= 0.9) { const p = P(L.x, d, 0.03); path.push(lamps.disc.add(p.x, p.y, p.z, 0.16, '#ff3a2a', 0.0, { mode: 0 })); }
      L._path = path;
    });

    /* ---------- the glass sky and the room beyond ---------- */
    {
      const glassTex = K3D.paint('pb-glass', 1024, 1024, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        for (let i = 0; i < 22; i++) { const x = rnd() * w, y = rnd() * h; c.strokeStyle = `rgba(255,250,240,${0.012 + rnd() * 0.02})`; c.lineWidth = 14 + rnd() * 30; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + rnd() * 200 - 100, y + rnd() * 80, x + rnd() * 300 - 150, y + rnd() * 160 - 80); c.stroke(); }
        // a ring from a drinks cup and a few fingerprints
        c.strokeStyle = 'rgba(255,240,210,0.07)'; c.lineWidth = 9; c.beginPath(); c.arc(w * 0.62, h * 0.7, 70, 0, Math.PI * 2); c.stroke(); c.lineWidth = 3; c.beginPath(); c.arc(w * 0.62, h * 0.7, 62, 0.5, 4.2); c.stroke();
        for (let i = 0; i < 6; i++) { const x = rnd() * w, y = rnd() * h; for (let k = 0; k < 7; k++) { c.strokeStyle = 'rgba(255,255,255,0.025)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, y, 6 + k * 3, 9 + k * 4, 0.4, 0, Math.PI * 2); c.stroke(); } }
      });
      glassTex.wrapS = glassTex.wrapT = T.RepeatWrapping; glassTex.repeat.set(1, 8);
      const glass = new T.Mesh(new T.PlaneGeometry(2 * WALL, D1 - D0).rotateX(Math.PI / 2), new T.MeshBasicMaterial({ map: glassTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false }));
      glass.rotation.x = Math.atan(SL); glass.position.set(0, yb((D0 + D1) / 2) + GLASS, -(D0 + D1) / 2); glass.renderOrder = 7; K.add(glass); glass.userData.noSee = true;
      // the dark arcade beyond the glass: a ceiling with tube lights, other machines glowing, the shape of the room
      // the arcade's ceiling far overhead: tiles and fluorescent tubes, softly out of focus
      const ceilTex = K3D.paint('pb-ceil', 512, 1024, (c, w, h) => {
        c.fillStyle = '#1a1820'; c.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { c.fillStyle = `rgba(${90 + rnd() * 20},${86 + rnd() * 20},${96 + rnd() * 20},0.35)`; c.fillRect(x + 2, y + 2, 60, 60); }
        for (let y = 40; y < h; y += 180) for (const x of [110, 400]) { const g = c.createLinearGradient(x - 30, 0, x + 30, 0); g.addColorStop(0, 'rgba(200,230,255,0)'); g.addColorStop(0.5, 'rgba(220,240,255,0.95)'); g.addColorStop(1, 'rgba(200,230,255,0)'); c.fillStyle = g; c.fillRect(x - 30, y, 60, 110); }
        c.filter = 'blur(6px)'; c.drawImage(c.canvas, 0, 0); c.filter = 'none';
      });
      const ceil = new T.Mesh(new T.PlaneGeometry(160, 640).rotateX(Math.PI / 2), new T.MeshBasicMaterial({ map: ceilTex, toneMapped: false, color: hot('#ffffff', 0.28), fog: false, side: T.DoubleSide }));
      ceil.rotation.x = Math.atan(SL); ceil.position.set(0, yb(200) + GLASS + 70, -200); K.add(ceil);
      for (let i = 0; i < 26; i++) { const d = -40 + rnd() * 520, s = rnd() < 0.5 ? -1 : 1; glows.add(s * (40 + rnd() * 50), yb(d) + GLASS + 10 + rnd() * 25, -d, 18 + rnd() * 22, A.pick(A.NEON), 0.03, 0.4); }
      const sh = new T.Mesh(new T.PlaneGeometry(60, 40).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: softTex('k'), transparent: true, depthWrite: false, toneMapped: false }));
      sh.renderOrder = 8; sh.userData.live = true; K.add(sh); SC.shadow = { m: sh, t: 18 };
    }
    /* ---------- the backboard (the brightest thing in the world) ---------- */
    buildBackboard(K, lamps, glows);
    /* ---------- the balls and the heroes inside ---------- */
    SC.balls = [0, 1].map(id => makeBall(K, id));
    // general illumination down the lanes, pools of warm light on the lacquer
    for (let d = 2; d < 412; d += 4.2) for (const x of [-6.8, -2.2, 2.2, 6.8]) { if (TB.partAt(d) === 2 && Math.abs(x) > 6) continue; lamps.pool.add(x + (rnd() - 0.5), TB.yAt(d) + 0.03, -d, 2.0, rnd() < 0.8 ? '#ffd8a0' : A.pick(['#ff7a6a', '#7ab8ff', '#ffd24a']), 0.16, { mode: 0 }); }
    // stars: an insert where each star sits and a gold star floating over it while it is still there
    SC.starM = new T.InstancedMesh(new T.ExtrudeGeometry(starShape(0.36, 0.16), { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 }).translate(0, 0, -0.04),
      new T.MeshBasicMaterial({ color: hot('#ffd24a', 1.5), toneMapped: false }), TB.stars.length);
    SC.starM.frustumCulled = false; SC.starM.userData.live = true; K.add(SC.starM);
    SC.starIns = TB.stars.map(s => { const q = P(s[0], s[1], 0.02); return lamps.star.add(q.x, q.y, q.z, 0.42, '#ffd24a', 1.2, { mode: 4, sp: 1.6, ball: 1.4 }); });
    // life (creatures, stalls, stories): pinball-life.js
    if (typeof PINBALL_LIFE !== 'undefined') PINBALL_LIFE.build(K, SC, { P, V, lamps, glows, chrome, rubber, woodTex, softTex, hot, INK, WALL, RAIL, SH, GLASS, yb, tube, wire, group });
    for (const k in lamps) lamps[k].done();
    glows.done();
    K3D.bake(still);
    SC.cam = { eye: null, at: null, snap: true };
    SC.t = 0; SC.fxN = 0; SC.shake = 0;
    buildImpacts(K);
  }

  /* ---------- the backboard ---------- */
  function buildBackboard(K, lamps, glows) {
    const GF = SC.glowsFar = A.glows(K, 200); GF.mesh.material.uniforms.uFogD.value = 0.0008;
    const d0 = 418, y0 = yb(d0), still = SC.still;
    const bb = new T.Group(); bb.position.set(0, y0, -d0); K.add(bb); bb.userData.live = true; SC.bb = bb;
    // the cabinet head: a tall dark box with the lit backglass on its front
    const head = K3D.mesh(new T.BoxGeometry(2 * WALL + 4, 46, 6), K3D.toon('#1a0e1c'), { ink: INK }); head.position.set(0, 21, -3.4); bb.add(head);
    const glassTex = K3D.paint('pb-backglass', 1024, 1024, (c, w, h) => {
      A.seed(818);
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0a0a3a'); g.addColorStop(0.55, '#3a0e5a'); g.addColorStop(1, '#b0182a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(255,250,230,${rnd()})`; c.beginPath(); c.arc(rnd() * w, rnd() * h * 0.7, rnd() * 2.2, 0, Math.PI * 2); c.fill(); }
      // the big comet sweeping across
      const cg = c.createLinearGradient(w * 0.85, h * 0.2, w * 0.1, h * 0.55); cg.addColorStop(0, '#fffbe8'); cg.addColorStop(0.15, '#ffd24a'); cg.addColorStop(0.6, 'rgba(255,90,60,0.6)'); cg.addColorStop(1, 'rgba(255,60,120,0)');
      c.fillStyle = cg; c.beginPath(); c.moveTo(w * 0.86, h * 0.17); c.quadraticCurveTo(w * 0.5, h * 0.28, w * 0.05, h * 0.62); c.quadraticCurveTo(w * 0.5, h * 0.38, w * 0.86, h * 0.25); c.closePath(); c.fill();
      c.fillStyle = '#fffbe8'; c.beginPath(); c.arc(w * 0.85, h * 0.21, 46, 0, Math.PI * 2); c.fill();
      // planets and a big top tent
      for (const [x, y, r, col] of [[0.18, 0.2, 60, '#4ac0e8'], [0.62, 0.12, 30, '#9ae86a'], [0.4, 0.4, 22, '#e84a9a']]) { const pg = c.createRadialGradient(w * x - r * 0.3, h * y - r * 0.3, 4, w * x, h * y, r); pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.3, col); pg.addColorStop(1, mixHex(col, '#000000', 0.6)); c.fillStyle = pg; c.beginPath(); c.arc(w * x, h * y, r, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = '#ffd24a'; c.lineWidth = 6; c.beginPath(); c.ellipse(w * 0.18, h * 0.2, 100, 26, -0.25, 0, Math.PI * 2); c.stroke();
      for (let k = 0; k < 12; k++) { c.fillStyle = k % 2 ? '#f2e6c8' : '#c0182a'; c.beginPath(); c.moveTo(w * 0.5, h * 0.62); c.lineTo(w * (0.22 + k * 0.047), h * 0.92); c.lineTo(w * (0.22 + (k + 1) * 0.047), h * 0.92); c.closePath(); c.fill(); }
      // the title
      c.textAlign = 'center'; c.font = '900 120px "DejaVu Sans", sans-serif';
      c.lineWidth = 16; c.strokeStyle = '#3a0a10'; c.strokeText('COMET', w / 2, h * 0.5); c.strokeText('CARNIVAL', w / 2, h * 0.62);
      const tg = c.createLinearGradient(0, h * 0.4, 0, h * 0.64); tg.addColorStop(0, '#fff6c0'); tg.addColorStop(0.5, '#ffd24a'); tg.addColorStop(1, '#ff8a2a');
      c.fillStyle = tg; c.fillText('COMET', w / 2, h * 0.5); c.fillText('CARNIVAL', w / 2, h * 0.62);
      // pixel creatures painted cheering along the bottom
      for (let i = 0; i < 16; i++) { const x = 40 + i * 60, y = h * 0.94; c.fillStyle = A.pick(A.NEON); c.fillRect(x, y - 30, 30, 26); c.fillStyle = '#fff'; c.fillRect(x + 5, y - 24, 7, 8); c.fillRect(x + 18, y - 24, 7, 8); c.fillStyle = '#000'; c.fillRect(x + 7, y - 21, 3, 4); c.fillRect(x + 20, y - 21, 3, 4); }
    });
    const bg = new T.Mesh(new T.PlaneGeometry(2 * WALL, 26), new T.MeshBasicMaterial({ map: glassTex, toneMapped: false, color: hot('#ffffff', 1.35) }));
    bg.position.set(0, 27, -0.35); bb.add(bg);
    // bulbs round the backglass (chasing), the comet's tail of real bulbs
    const frame = (x0, y0b, x1, y1) => { for (const [a, b] of [[[x0, y0b], [x1, y0b]], [[x1, y0b], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0b]]]) lamps.far.line(V(a[0], y0 + a[1], -d0 + 0.2), V(b[0], y0 + b[1], -d0 + 0.2), 0.8, 0.22, ['#fff4d8', '#ffd24a', '#ff5ad6'], 2.4, { mode: 1, sp: 0.9, step: 0.04 }); };
    frame(-WALL - 0.6, 13.4, WALL + 0.6, 40.6);
    for (let u = 0; u <= 1; u += 0.025) { const x = 13 - u * 26 * 0.95, y = 37 - u * 9 - Math.sin(u * Math.PI) * 3; lamps.far.add(x, y0 + y, -d0 + 0.5, 0.2 + (1 - u) * 0.2, u < 0.2 ? '#fffbe8' : u < 0.6 ? '#ffd24a' : '#ff6a3a', 2.6, { mode: 1, sp: 1.6, ph: u * 3 }); }
    GF.add(0, y0 + 27, -d0 + 2, 40, '#ff9adf', 0.12, 0.1); GF.add(12, y0 + 36, -d0 + 2, 18, '#fff4c0', 0.5, 0.2);
    // the score reels: a row of big drums under the backglass (they spin as the score climbs)
    SC.reels = [];
    const reelTex = K3D.paint('pb-reel', 64, 512, (c, w, h) => { c.fillStyle = '#f2e6c8'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1020'; c.font = 'bold 44px monospace'; c.textAlign = 'center'; for (let k = 0; k < 10; k++) c.fillText(String((10 - k) % 10), w / 2, k * 51.2 + 42); }, { repeat: true });
    const box = K3D.mesh(new T.BoxGeometry(17, 4.2, 2.2), K3D.toon('#2a1a30'), { ink: INK }); box.position.set(0, 11.0, 0.4); bb.add(box);
    for (let i = 0; i < 8; i++) {
      const r = K3D.mesh(new T.CylinderGeometry(1.25, 1.25, 1.7, 24, 1, false), K3D.toon('#ffffff', { map: reelTex }), { ink: INK, inkW: 0.5 }); r.rotation.z = Math.PI / 2; r.position.set(-7.4 + i * 2.1, 11.0, 1.2);
      const holder = new T.Group(); holder.add(r); bb.add(holder); SC.reels.push({ r, a: 0 });
    }
    lamps.far.line(V(-8.6, y0 + 13.4, -d0 + 1.6), V(8.6, y0 + 13.4, -d0 + 1.6), 0.6, 0.12, '#ffd24a', 2.2, { mode: 1, sp: 1.2 });
    // the TILT lamp and a big neon sign hung over the top lanes
    SC.tiltM = new T.MeshBasicMaterial({ color: hot('#ff3a2a', 0.25), toneMapped: false });
    const tilt = new T.Mesh(new T.PlaneGeometry(6, 2), SC.tiltM); tilt.position.set(-11, 16, 0.2); bb.add(tilt);
    const tiltTx = new T.Mesh(new T.PlaneGeometry(5.4, 1.6), new T.MeshBasicMaterial({ map: K3D.paint('pb-tilttx', 256, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.font = '900 54px sans-serif'; c.textAlign = 'center'; c.fillText('TILT', w / 2, 52); }), transparent: true, toneMapped: false, color: hot('#ffffff', 1.0) })); tiltTx.position.set(-11, 16, 0.25); bb.add(tiltTx);
    const neon = A.neon(K, 'JACKPOT', { w: 9, h: 2.4, col: '#ff5ad6', col2: '#ffd24a' }); neon.position.set(10.5, 16, 0.4); bb.add(neon);
    // the backboard is seen from the bottom of the table: the arcade's haze must not swallow it
    bb.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.fog = false; });
    GF.done();
  }

  /* ---------- a glass pinball with a hero inside ---------- */
  const envTex = () => K3D.paint('pb-env', 512, 256, (c, w, h) => {
    // what the glass reflects: dark above with the glass sky's lights, the warm bright table below, the backboard ahead
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0a0814'); g.addColorStop(0.45, '#2a1830'); g.addColorStop(0.55, '#c08a50'); g.addColorStop(1, '#4a2a1a');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const x = Math.random() * w, y = h * 0.5 + Math.random() * h * 0.45; c.fillStyle = A.pick(['#ffe2b0', '#ff7a5a', '#8ac8ff', '#ffd24a']); c.globalAlpha = 0.6 + Math.random() * 0.4; c.beginPath(); c.arc(x, y, 1 + Math.random() * 4, 0, Math.PI * 2); c.fill(); }
    for (let i = 0; i < 40; i++) { c.fillStyle = '#fff4dc'; c.globalAlpha = 0.5; c.beginPath(); c.arc(Math.random() * w, Math.random() * h * 0.42, 1 + Math.random() * 2, 0, Math.PI * 2); c.fill(); }
    c.globalAlpha = 1; const bx = w * 0.25; const bgr = c.createRadialGradient(bx, h * 0.42, 4, bx, h * 0.42, 70); bgr.addColorStop(0, '#fff6d8'); bgr.addColorStop(0.3, '#ff9adf'); bgr.addColorStop(1, 'rgba(255,90,200,0)'); c.fillStyle = bgr; c.fillRect(bx - 80, h * 0.42 - 80, 160, 160);
    // two window-bright lamp strips
    c.fillStyle = '#ffffff'; c.fillRect(w * 0.6, h * 0.18, 60, 6); c.fillRect(w * 0.72, h * 0.3, 30, 4);
  });
  const scuffTex = () => K3D.paint('pb-scuff', 256, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { c.strokeStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.35})`; c.lineWidth = 0.6 + Math.random(); c.beginPath(); const x = Math.random() * w, y = Math.random() * h; c.moveTo(x, y); c.lineTo(x + Math.random() * 30 - 15, y + Math.random() * 8 - 4); c.stroke(); }
    for (let i = 0; i < 8; i++) { c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 0, Math.PI * 2); c.fill(); }
  }, { repeat: true });
  function makeBall(K, id) {
    const col = PCOL[id], tint = new T.Color(id === 0 ? '#ffb070' : '#7ab8ff');
    const g = new T.Group(); g.userData.live = true; K.add(g);
    const hero = K3D.hero(id); K3D.dress(hero, 'arcadepinball'); g.add(hero);
    const spinG = new T.Group(); g.add(spinG); // the glass's scuffs roll with the ball
    const u = { uEnv: { value: envTex() }, uTint: { value: tint }, uScuff: { value: scuffTex() }, uRot: { value: new T.Matrix3() } };
    const glassMat = new T.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, side: T.FrontSide,
      vertexShader: `uniform mat3 uRot; varying vec3 vN; varying vec3 vV; varying vec3 vW; varying vec3 vL;
        void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vV = normalize(cameraPosition - w.xyz); vL = uRot * normal; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform sampler2D uEnv, uScuff; uniform vec3 uTint; varying vec3 vN; varying vec3 vV; varying vec3 vW; varying vec3 vL;
        void main() {
          vec3 n = normalize(vN), v = normalize(vV);
          float f = pow(1.0 - max(0.0, dot(n, v)), 2.6);
          vec3 r = reflect(-v, n);
          vec2 eu = vec2(atan(r.x, -r.z) / 6.2832 + 0.5, acos(clamp(r.y, -1.0, 1.0)) / 3.1416);
          vec3 env = texture2D(uEnv, eu).rgb;
          vec3 l = normalize(vL); vec2 su = vec2(atan(l.x, l.z) / 6.2832 + 0.5, acos(clamp(l.y, -1.0, 1.0)) / 3.1416);
          float sc = texture2D(uScuff, su * vec2(2.0, 1.0)).a;
          float spec = pow(max(0.0, dot(r, normalize(vec3(-0.4, 0.8, 0.45)))), 60.0) * 2.2 + pow(max(0.0, dot(r, normalize(vec3(0.5, 0.55, -0.6)))), 120.0) * 1.6;
          vec3 c = uTint * (0.05 + 0.6 * f) + env * (0.12 + 0.9 * f) + vec3(spec) + vec3(sc * 0.18);
          float a = clamp(0.035 + 0.66 * f + spec * 0.6 + sc * 0.16, 0.0, 1.0);
          gl_FragColor = vec4(c, a);
        }` });
    // the glass and its ring squash for a moment on a hard hit or landing (sq), the hero inside rides it out
    const sq = new T.Group(); g.add(sq);
    const glass = new T.Mesh(new T.SphereGeometry(R, 48, 32), glassMat); glass.renderOrder = 12; sq.add(glass);
    // the ring of light round the ball (Pip orange, Bo blue), a glow and a pool of the same light under the ball
    const ringMat = new T.MeshBasicMaterial({ color: hot(col, 1.9), toneMapped: false });
    // (it sits a little under the equator, round the hero's middle, so it never crosses their eyes in a close-up)
    const RY = -0.36, RR = Math.sqrt(R * R - RY * RY);
    const ring = new T.Mesh(new T.TorusGeometry(RR * 1.01, 0.055, 8, 64).rotateX(Math.PI / 2).translate(0, RY, 0), ringMat); sq.add(ring);
    const ring2 = new T.Mesh(new T.TorusGeometry(RR * 1.02, 0.09, 6, 48).rotateX(Math.PI / 2).translate(0, RY, 0), new T.MeshBasicMaterial({ color: hot(col, 0.5), transparent: true, opacity: 0.22, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false })); sq.add(ring2);
    const pool = new T.Mesh(new T.PlaneGeometry(3.6, 3.6).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: softTex('w'), color: hot(col, 0.55), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
    pool.renderOrder = 4; pool.userData.live = true; K.add(pool);
    const shadow = new T.Mesh(new T.PlaneGeometry(2.4, 2.4).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: softTex('k'), transparent: true, depthWrite: false, toneMapped: false, opacity: 0.8 }));
    shadow.renderOrder = 3; shadow.userData.live = true; K.add(shadow);
    const see = K3D.seeThrough ? K3D.seeThrough(ring, col) : null;
    return { id, g, sq, hero, glass, glassMat, u, ring, ringMat, pool, shadow, q: new T.Quaternion(), rot: new T.Matrix4(), lastX: null, lastD: null, run: 0, tumble: 0, land: false, vy: 0, lastY: 0, face: 0 };
  }

  /* ====================================================================================================
     Update (every drawn frame)
     ==================================================================================================== */
  const tq = new T.Quaternion(), ax = new T.Vector3(), m3 = new T.Matrix3();
  function ballPos(b, t) {
    const h = b.mode === 'ride' ? (b.rideH || 0) : b.h;
    let y = TB.yAt(b.d) + h + R;
    if (b.mode === 'drain') y -= Math.min(2.6, (b.t2 || 0) * 3);
    if (b.mode === 'seat') y -= 0.32;
    return V(b.x, y, -b.d);
  }
  function update(K, st, dt) {
    if (!st || !st.balls || !SC.live) return;
    SC.t += dt; const t = SC.t, live = SC.live, lamps = SC.lamps;
    lampU.uT.value = t;
    const G2 = lampU.uG.value;
    // group levels: 0 off, 1 done, 2 live (a partner is waiting at it)
    const waitAt = (d, lane) => st.balls.some(b => (b.mode === 'roll' || b.mode === 'seat') && Math.sign(b.x || 1) === lane && b.d < d && b.d > d - 9);
    for (const g of TB.gates) { const i = SC.groups['g:' + g.id]; if (i == null) continue; const s = st.gate[g.id]; G2[i] = (s.open || s.latched) ? 1 : waitAt(g.d, g.lane) ? 2 : 0; }
    for (const s of TB.stairs) { const i = SC.groups['s:' + s.id]; if (i == null) continue; G2[i] = st.stairs[s.id].latched || PINBALL.bankN(st, s.by) >= 5 ? 1 : (PINBALL.bankN(st, s.by) > 0 || waitAt(s.steps[0], s.lane)) ? 2 : 0; }
    for (const f of TB.flippers) { const i = SC.groups['f:' + f.id]; if (i == null) continue; G2[i] = st.ledge[f.id].latched ? 1 : PINBALL.seated(st, f.cradle) ? 2 : 0; }
    for (const br of TB.bridges) { const i = SC.groups['b:' + br.id]; if (i == null) continue; const s = st.bridge[br.id]; G2[i] = s.latched ? 1 : s.t > 0 ? 2 : waitAt(br.d0, br.lane) ? 2 : 0; }
    // the balls
    const B = st.balls, pos = B.map(b => ballPos(b, t));
    lampU.uB0.value.copy(pos[0]); lampU.uB1.value.copy(pos[1]);
    lampU.uTilt.value = st.tilt && st.tilt.warn > 0 ? 1 : 0;
    B.forEach((b, k) => {
      const o = SC.balls[k], p = pos[k];
      if (st.phase === 'open') { const u = Math.min(1, st.phaseT / PINBALL.S.OPEN_T); const top = 380 - u * (380 - b.d); const fall = Math.max(0, 1 - u * 1.1); p.set(b.x + Math.sin(st.phaseT * 3 + k) * 3 * fall, TB.yAt(top) + R + Math.abs(Math.sin(st.phaseT * 4 + k * 1.3)) * 2.5 * fall, -top); }
      o.g.position.copy(p);
      // roll: turn the glass's scuffs by the distance travelled
      if (o.lastX != null) {
        const dx = p.x - o.lastX, dz = p.z - o.lastZ, dist = Math.hypot(dx, dz);
        if (dist > 1e-5 && dist < 5) { ax.set(dz, 0, -dx).normalize(); tq.setFromAxisAngle(ax, dist / R); o.q.premultiply(tq); }
        o.speed = dist / Math.max(dt, 1e-4);
      }
      o.lastX = p.x; o.lastZ = p.z;
      o.rot.makeRotationFromQuaternion(o.q); m3.setFromMatrix4(o.rot); o.u.uRot.value.copy(m3).transpose();
      // squash: flattened against what it hit (sqN, along the table) or onto the table after a landing (no sqN)
      const sk = b.squash || 0, sn = b.sqN;
      if (sk > 0.005 && sn && (sn[0] || sn[1])) {
        o.sq.rotation.set(0, Math.atan2(sn[1], sn[0]), 0); o.sq.scale.set(1 - 0.17 * sk, 1 + 0.06 * sk, 1 + 0.09 * sk);
        o.sq.position.set(sn[0] * R * 0.17 * sk, 0, -sn[1] * R * 0.17 * sk);
      } else if (sk > 0.005) {
        o.sq.rotation.set(0, 0, 0); o.sq.scale.set(1 + 0.12 * sk, 1 - 0.2 * sk, 1 + 0.12 * sk); o.sq.position.set(0, -R * 0.2 * sk, 0);
      } else if (o.sq.scale.x !== 1) { o.sq.rotation.set(0, 0, 0); o.sq.scale.set(1, 1, 1); o.sq.position.set(0, 0, 0); }
      // the hero inside: runs the way the ball rolls, braces in a seat, tumbles when thrown
      // like a hamster in its ball: they run the way they push (on the spot against a wall), stand and ride along when
      // the glass rolls free, and throw their arms up when it rolls away fast with nobody pushing
      const sp = Math.min(1.3, (o.speed || 0) / 5), push = b.mode === 'roll' ? (b.push || 0) : 0;
      if (b.mode === 'roll') { if (push > 0.1) o.face = b.pa; else if (sp > 0.06) o.face = Math.atan2(b.vx || 0, b.vd || 0) || o.face; }
      const run = push > 0.1 ? Math.max(sp, 0.55 * push) : 0, coast = b.mode === 'roll' && !b.air && push <= 0.1 && sp > 0.75;
      const flying = b.mode === 'ride' || b.mode === 'kick' || b.mode === 'magnet' || (b.air && b.h > 0.3);
      o.tumble = flying ? o.tumble + dt * (b.mode === 'ride' ? 7 : 3) : o.tumble * Math.pow(0.02, dt);
      const vy = (p.y - o.lastY) / Math.max(dt, 1e-4); o.lastY = p.y;
      K3D.heroPose(o.hero, { x: 0, y: -R + 0.1, z: 0, heading: o.face + Math.PI, speed: run, vy: flying ? vy : 0, land: b.land > 0.25 && !o.land, mood: b.mode === 'seat' ? 'sit' : (flying || coast) ? 'whoa' : null, stun: b.mode === 'drain' }, dt);
      o.land = b.land > 0.25;
      o.hero.rotation.x = Math.sin(o.tumble) * (flying ? 0.9 : 0); o.hero.rotation.z = Math.cos(o.tumble * 0.7) * (flying ? 0.5 : 0);
      o.hero.visible = !(b.mode === 'drain' && (b.t2 || 0) > 0.7);
      o.glass.visible = o.ring.visible = o.hero.visible;
      // the outfit's lights and swinging bits
      for (const w of o.hero.userData.worn || []) {
        if (w.userData.lamp) w.userData.lamp.color.copy(hot(k === 0 ? '#58ff7a' : '#ffd84a', 1.1 + 0.7 * (0.5 + 0.5 * Math.sin(t * 4 + k))));
        for (const s of w.userData.swing || []) { const a = Math.sin(t * (6 + sp * 8) + s.ph) * s.amt * (0.3 + sp); if (s.bob) s.o.position.y = 0.47 + Math.sin(t * 7 + s.ph) * 0.035; s.o.rotation[s.ax] = s.base + a; }
      }
      const gy = TB.yAt(b.d);
      o.pool.position.set(p.x, gy + 0.05, p.z); o.pool.visible = o.hero.visible;
      const hh = p.y - R - gy; o.shadow.position.set(p.x, gy + 0.04, p.z); o.shadow.scale.setScalar(1 + hh * 0.15); o.shadow.material.opacity = 0.75 / (1 + hh * 0.4); o.shadow.visible = o.hero.visible;
    });
    // bumpers: the 0.4 s glow before the kick, the flash after
    for (const L of live.bumpers) {
      const s = st.bump[L.i]; const ch = s ? s.ch : 0, cool = s ? s.cool : 0;
      const k = ch > 0 ? 1.4 + Math.sin(t * 40) * 0.5 : cool > 0 ? 2.4 : 1.0 + 0.15 * Math.sin(t * 3 + L.i);
      L.capMat.color.copy(hot(L.col, k));
      const kk = cool > 0 ? cool * 0.25 : 0; // (a bumper built up into a building jolts rather than swells)
      if (L.tall) L.g.scale.set(1 + kk * 0.5, 1 - kk * 0.2, 1 + kk * 0.5); else L.g.scale.setScalar(1 + kk);
      SC.glows.color(L.gi, L.col, cool > 0 ? 0.8 : ch > 0 ? 0.55 : 0.28);
    }
    for (const L of live.slings) { const s = st.sling[L.i]; const on = s && (s.ch > 0 || s.cool > 0); for (const i of L.li) lamps.bulb.setK(i, on ? 3 : 1.4); L.face.position.y = (on ? 0.1 : 0); }
    // gates
    for (const L of live.gates) {
      const s = st.gate[L.g.id], open = s.open || s.latched;
      L.a += ((open ? 1 : 0) - L.a) * Math.min(1, dt * 5);
      if (L.kind === 'lift') { L.arm.rotation.z = L.dir * L.a * 1.45; } else { L.blades.position.y = -L.a * 1.35; }
    }
    // stairs: a fallen target raises a step
    for (const L of live.stairs) for (const sp of L.steps) {
      const up = PINBALL.stepUp(st, L.s, sp.i + 1);
      sp.a += ((up ? 1 : 0) - sp.a) * Math.min(1, dt * 5);
      sp.bar.position.y = sp.q.y + 0.45 - sp.a * 1.4; sp.blk.position.y = sp.q.y - 0.5 + sp.a * (0.6 + sp.i * 0.06);
      lamps.bulb.setK(sp.li, up ? 0.3 : 1.8);
    }
    for (const L of live.targets) { const bk = st.bank[L.c.id]; L.bankG.forEach((tg, i) => { tg.a += ((bk.down[i] ? 1 : 0) - tg.a) * Math.min(1, dt * 9); tg.piv.rotation.z = L.c.face * tg.a * 1.5; }); }
    for (const L of live.stars) { const g = TB.gates.find(q => q.by === L.c.id); const done = g && (st.gate[g.id].latched); const k = done ? 2.2 : 0.9 + 0.5 * (0.5 + 0.5 * Math.sin(t * 4)); L.top.material.color.copy(hot('#fff0c0', k)); SC.glows.color(L.gl, '#ffe9a8', done ? 0.32 : 0.16); }
    for (const L of live.cups) { const sat = PINBALL.seated(st, L.c.id); for (const i of L.ringLs) lamps.bulb.setK(i, sat ? 2.6 : 1.0); }
    for (const L of live.buttons) { const on = PINBALL.onPad(st, L.c, 1.1); L.capM.color.copy(hot(on ? '#5aff8a' : '#ff4a3a', on ? 2.2 : 1.0 + 0.4 * Math.sin(t * 5))); L.cap.position.y = L.q.y + (on ? 0.28 : 0.38); }
    for (const L of live.spinners) { const sv = st.spun && st.spun[L.c.id]; L.v = Math.max(L.v * Math.pow(0.4, dt), sv && st.t - (sv.t || sv) < 0.5 ? 18 : 0); for (const b of st.balls) if (Math.abs(b.d - L.c.d) < 1.2 && b.x > L.c.x0 && b.x < L.c.x1 && b.mode === 'roll') L.v = Math.max(L.v, Math.hypot(b.vx, b.vd) * 3); L.a += L.v * dt; L.axle.rotation.x = L.a; }
    for (const L of live.bridges) { const s = st.bridge[L.br.id], on = s.latched || s.t > 0, blink = !s.latched && s.t > 0 && s.t < 2 && Math.sin(t * 20) > 0; for (const i of L.ls) lamps.disc.setK(i, on ? (blink ? 0.4 : 1.8) : 0); }
    if (live.lever) { const op = !PINBALL.gateShut(st, 'gDet'); live.lever.arm.rotation.z += ((op ? -0.9 : 0.5) - live.lever.arm.rotation.z) * Math.min(1, dt * 6); }
    for (const L of live.magnets) { const m = st.magnets[L.k], q = P(m.x, L.M.d); L.cart.position.copy(q); L.cart.rotation.y += dt * 2; lamps.bulb.setP(L.eye, q.x, q.y + 1.2, q.z); }
    for (const L of live.saves) { const draining = st.balls.some(b => b.mode === 'drain' && TB.secAt(b.d) === L.s); lamps.disc.setK(L.li, draining ? 3 : 1.0); }
    // the great flippers flick when a ball rolls onto them; twin flippers fire with both seated; flippers for a friend
    for (const L of live.greats) { const s = st.kick[L.k.id]; const fire = s && s.cool > 0; L.a += ((fire ? 1 : 0) - L.a) * Math.min(1, dt * (fire ? 30 : 6)); L.g.rotation.y = L.base + L.s * L.a * 0.7; }
    for (const L of live.twins) {
      const ring = st.twin[L.t.id].ring || 0, fired = st.fx.some(f => f.k === 'twinFire' && f.id === L.t.id && st.t - f.t < 0.4);
      L.fire += ((fired ? 1 : 0) - L.fire) * Math.min(1, dt * (fired ? 30 : 4));
      for (const pp of L.parts) { pp.g.rotation.y = pp.base - pp.s * L.fire * 0.8; const sat = PINBALL.seated(st, pp.cr.id); pp.ring.forEach((i, j) => lamps.bulb.setK(i, sat ? (j / pp.ring.length < ring ? 3 : 1.2) : 0.35)); }
    }
    for (const L of live.flips) { const F = st.flip[L.f.id]; const fired = st.fx.some(f => f.k === 'flip' && f.id === L.f.id && st.t - f.t < 0.4); L.fire += ((fired ? 1 : 0) - L.fire) * Math.min(1, dt * (fired ? 30 : 4)); L.g.rotation.y = L.base - L.s * L.fire * 0.8 + (F && F.ch > 0 ? Math.sin(t * 50) * 0.03 : 0); }
    // loose balls: the warning path lights up before one comes
    for (const L of TB.loose) { const t0 = st.looseOn[L.id]; let warn = false; if (t0 != null) { const per = L.per / (PINBALL.helpOn(st, L.d0) ? PINBALL.S.HELP_SLOW : 1), c = (st.t - t0 + L.ph) % per; warn = c > per - PINBALL.S.LOOSE_WARN; } for (const i of L._path) lamps.disc.setK(i, warn ? (Math.sin(t * 18) > 0 ? 2.4 : 0.6) : 0.15); }
    silverBalls(K, st);
    // stars: spin and bob; gone when collected
    {
      const M = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), e = new T.Euler();
      TB.stars.forEach((sr, i) => {
        const got = st.got[i];
        const p = P(sr[0], sr[1], 0.75 + (sr[2] || 0) + Math.sin(t * 2.4 + i) * 0.12);
        e.set(0, t * 2 + i, 0); q.setFromEuler(e); s.setScalar(got ? 0 : 1);
        M.compose(p, q, s); SC.starM.setMatrixAt(i, M);
        lamps.star.setK(SC.starIns[i], got ? 0.35 : 1.3);
      });
      SC.starM.instanceMatrix.needsUpdate = true;
    }
    // score reels roll toward the table's score
    if (SC.reels) { const sc = Math.floor(st.score || 0); SC.reels.forEach((r, i) => { const digit = Math.floor(sc / Math.pow(10, 7 - i)) % 10; const want = digit / 10 * Math.PI * 2; r.a += (want - r.a) * Math.min(1, dt * 4); r.r.rotation.x = r.a; }); }
    if (SC.tiltM) SC.tiltM.color.copy(hot('#ff3a2a', st.tilt && (st.tilt.warn > 0 || st.tilt.t > 0) ? (Math.sin(t * 16) > 0 ? 2.6 : 0.6) : 0.25));
    // a huge soft shadow passes over the glass now and then (someone walking past the machine)
    if (SC.shadow) { const sh = SC.shadow; sh.t -= dt; const lead = Math.max(B[0].d, B[1].d); if (sh.t < -6) sh.t = 22 + Math.random() * 14; const u = clamp(-sh.t / 6, 0, 1); sh.m.visible = sh.t < 0; sh.m.position.set(-60 + u * 120, yb(lead + 20) + GLASS + 1.5, -(lead + 20)); sh.m.material.opacity = Math.sin(u * Math.PI) * 0.55; }
    if (typeof PINBALL_LIFE !== 'undefined') PINBALL_LIFE.update(K, SC, st, dt, pos);
    impacts(st, dt);
    camera(K, st, dt, pos);
  }

  /* ---------- hits you can see: sparks off steel rails, a puff off rubber, a ripple of light where a ball lands or the
     two balls clack, and the camera knocked a little by a big landing ---------- */
  function buildImpacts(K) {
    const N = 220, geo = new T.BufferGeometry();
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
    const pts = new T.Points(geo, new T.PointsMaterial({ size: 0.26, map: softTex('w'), vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, sizeAttenuation: true }));
    pts.frustumCulled = false; pts.renderOrder = 14; pts.userData.live = true; K.add(pts);
    const parts = Array.from({ length: N }, () => ({ life: 0, max: 1, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, c: new T.Color(), g: 18 }));
    const ringTex = K3D.paint('pb-ripple', 128, 128, (c, w, h) => {
      const g = c.createRadialGradient(64, 64, 34, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    const rings = Array.from({ length: 10 }, () => {
      const m = new T.Mesh(new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, opacity: 0 }));
      m.renderOrder = 5; m.visible = false; m.userData.live = true; K.add(m);
      return { m, t: 9, dur: 0.5, size: 2 };
    });
    SC.imp = { geo, parts, rings, pi: 0, ri: 0 };
  }
  const SPARK = ['#fff4d0', '#ffd27a', '#ffffff'], RUB = ['#ffd0f0', '#ffffff', '#ffb0d8'];
  function spark(x, y, z, vx, vy, vz, col, life, g) {
    const I = SC.imp, p = I.parts[I.pi = (I.pi + 1) % I.parts.length];
    Object.assign(p, { x, y, z, vx, vy, vz, life, max: life, g: g == null ? 18 : g }); p.c.set(col);
  }
  function ripple(x, d, size, col, dur) {
    const I = SC.imp, r = I.rings[I.ri = (I.ri + 1) % I.rings.length];
    r.t = 0; r.dur = dur || 0.5; r.size = size; r.m.material.color.copy(hot(col, 1.6)); r.m.position.copy(P(x, d, 0.05)); r.m.visible = true;
  }
  function impacts(st, dt) {
    const I = SC.imp; if (!I) return;
    if ((st.fxN || 0) < SC.fxN) SC.fxN = 0; // (a restart)
    let k = 0;
    for (const f of st.fx) {
      if (f.n <= SC.fxN) continue;
      SC.fxN = f.n;
      if (++k > 24) continue;
      const b = f.who != null ? st.balls[f.who] : null;
      if (f.k === 'clack') {
        const q = P(f.x, f.d, 0.5), rub = f.kind === 'post' || f.kind === 'bumper' || f.kind === 'sling';
        // away from the wall, toward the ball's side, and up
        let nx = b ? b.x - f.x : 0, nd = b ? b.d - f.d : 1; const nl = Math.hypot(nx, nd) || 1; nx /= nl; nd /= nl;
        const n = Math.min(14, Math.round((rub ? 2 : 4) + f.v * (rub ? 0.8 : 1.6)));
        for (let i = 0; i < n; i++) {
          const a = (Math.random() - 0.5) * 2.2, sp = (rub ? 1.2 : 2.2) + Math.random() * f.v * (rub ? 0.25 : 0.55);
          const dx = nx * Math.cos(a) - nd * Math.sin(a), dd = nx * Math.sin(a) + nd * Math.cos(a);
          spark(q.x, q.y, q.z, dx * sp, 1.5 + Math.random() * (rub ? 1.5 : 3.5), -dd * sp, A.pick(rub ? RUB : SPARK), rub ? 0.35 : 0.28 + Math.random() * 0.25, rub ? 6 : 18);
        }
      } else if (f.k === 'land' && f.v > 2) {
        const col = f.who === 0 ? '#ffb070' : '#7ab8ff', v = f.v || 3;
        ripple(f.x, f.d, Math.min(3.4, 1.4 + v * 0.12), col, f.big ? 0.6 : 0.45);
        const q = P(f.x, f.d, 0.1), n = Math.min(18, Math.round(4 + v * 0.8));
        for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * (1 + v * 0.18); spark(q.x, q.y, q.z, Math.cos(a) * sp, 0.6 + Math.random() * 1.6, Math.sin(a) * sp, A.pick(['#fff0d0', col, '#ffffff']), 0.35 + Math.random() * 0.25, 7); }
        if (f.big || v > 8) SC.shake = Math.max(SC.shake, Math.min(0.32, v * 0.018));
      } else if (f.k === 'ballBump') {
        ripple(f.x, f.d, Math.min(3, 1.2 + f.v * 0.25), '#e8f4ff', 0.4);
        const q = P(f.x, f.d, 0.9);
        for (let i = 0; i < Math.min(16, 5 + f.v * 1.5); i++) { const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * f.v * 0.5; spark(q.x, q.y, q.z, Math.cos(a) * sp, Math.random() * 3, Math.sin(a) * sp, A.pick(['#ffffff', '#d8ecff', '#fff4d0']), 0.3, 10); }
        SC.shake = Math.max(SC.shake, Math.min(0.14, f.v * 0.02));
      } else if (f.k === 'bumper' && f.hit) {
        // a bumper that threw a ball: a burst of light off its cap
        const p = TB.posts[f.bk]; if (!p) continue;
        ripple(p.x, p.d, p.r * 2.6, '#ffe08a', 0.35);
        const q = P(p.x, p.d, 1.0);
        for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 2.5; spark(q.x + Math.cos(a) * p.r, q.y, q.z - Math.sin(a) * p.r, Math.cos(a) * sp, 1 + Math.random() * 2, -Math.sin(a) * sp, A.pick(SPARK), 0.3, 12); }
      }
    }
    // move and fade
    const pos = I.geo.attributes.position.array, col = I.geo.attributes.color.array;
    I.parts.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= dt; p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const a = Math.max(0, p.life / p.max);
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; col[i * 3] = p.c.r * a; col[i * 3 + 1] = p.c.g * a; col[i * 3 + 2] = p.c.b * a;
      } else if (pos[i * 3 + 1] !== -999) { pos[i * 3 + 1] = -999; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; }
    });
    I.geo.attributes.position.needsUpdate = true; I.geo.attributes.color.needsUpdate = true;
    for (const r of I.rings) {
      if (!r.m.visible) continue;
      r.t += dt; const u = r.t / r.dur;
      if (u >= 1) { r.m.visible = false; continue; }
      r.m.scale.setScalar(r.size * (0.25 + 0.75 * Math.sqrt(u))); r.m.material.opacity = 0.85 * (1 - u) * (1 - u);
    }
    SC.shake *= Math.exp(-9 * dt);
  }
  // silver balls (loose and the flood): one instanced family
  function silverBalls(K, st) {
    if (!SC.silver) {
      const mat = K3D.toon('#ffffff', { map: chromeTex(), emissive: '#4a4a5a', emissiveIntensity: 0.5 });
      SC.silver = new T.InstancedMesh(new T.SphereGeometry(TB.T.LOOSE_R, 24, 16), mat, 64); SC.silver.frustumCulled = false; SC.silver.userData.live = true; SC.silver.castShadow = true; K.add(SC.silver);
    }
    const M = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(1, 1, 1);
    let n = 0;
    for (const list of [st.loose, st.flood]) for (const b of list || []) { if (n >= 64) break; e.set(-(b.spin || 0), 0, 0); q.setFromEuler(e); M.compose(P(b.x, b.d, TB.T.LOOSE_R), q, s); SC.silver.setMatrixAt(n++, M); }
    SC.silver.count = n; SC.silver.instanceMatrix.needsUpdate = true;
  }

  /* ---------- the camera: low behind, looking up the slope, both balls always in frame ---------- */
  function camera(K, st, dt, pos) {
    const cam = K.camera, c = SC.cam;
    if (PINBALL_SCENE.camOverride) {
      const o = PINBALL_SCENE.camOverride; cam.position.set(...o.eye); cam.lookAt(V(...o.at)); if (cam.fov !== o.fov) { cam.fov = o.fov || 40; cam.updateProjectionMatrix(); }
      K.focus.set(...o.at); K.sunAt(K.focus, 26); return;
    }
    const a = pos[0], b = pos[1];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const spreadX = Math.abs(a.x - b.x), spreadZ = Math.abs(a.z - b.z), hi = Math.max(a.y - TB.yAt(-a.z), b.y - TB.yAt(-b.z));
    const asp = cam.aspect || 16 / 9;
    // how far back: enough for the width of both balls across the lanes, their spread up the table and a throw's height
    let back = Math.max(12.5, spreadX * 0.95 * (16 / 9) / asp + 4, hi * 1.1 + 10);
    back = Math.min(back, 40);
    if (st.phase === 'open') back = 18 + (1 - Math.min(1, st.phaseT / PINBALL.S.OPEN_T)) * 24;
    // the camera sits behind the rear ball and looks just past the front one, so both stay in frame up and down the table
    const rear = Math.min(-a.z, -b.z), front = Math.max(-a.z, -b.z), rearB = -a.z < -b.z ? a : b, frontB = rearB === a ? b : a;
    const lift = 5.6 + (back - 12.5) * 0.42 + spreadZ * 0.16;
    const eyeD = rear - back, eye = V(mid.x * 0.5, Math.max(TB.yAt(Math.max(-12, eyeD)) + R, rearB.y - 2) + lift, -eyeD);
    const at = V(mid.x * 0.6, frontB.y * 0.6 + rearB.y * 0.4 + 1.0, -(front + Math.max(3, 10 - spreadZ * 0.45)));
    // keep both balls inside the picture top to bottom: the view tips down until the near ball is at most 14 degrees
    // under the middle, and never so far that the far ball rises past 14 degrees over it
    if (st.phase !== 'open') {
      const pitch = (p) => Math.atan2(p.y - eye.y, Math.max(0.5, eye.z - p.z));
      const pr = pitch(rearB) - 0.03, pf = pitch(frontB) + 0.05, lim = 14 * Math.PI / 180;
      let pc = pitch(at);
      const lo = pf - lim, hi2 = pr + lim;
      pc = lo > hi2 ? (lo + hi2) / 2 : Math.min(hi2, Math.max(lo, pc));
      const hd = Math.max(0.5, eye.z - at.z);
      at.y = eye.y + Math.tan(pc) * hd;
    }
    // the camera leans in a TILT
    const tl = st.tilt && st.tilt.t > 0 ? st.tilt.dir * Math.sin(Math.min(1, st.tilt.t) * Math.PI) * 0.06 : 0;
    if (!c.eye || c.snap) { c.eye = eye.clone(); c.at = at.clone(); c.snap = false; }
    else { const k = 1 - Math.exp(-3.2 * dt); c.eye.lerp(eye, k); c.at.lerp(at, k * 1.3); }
    cam.position.copy(c.eye);
    // a big landing or a hard clack knocks the camera a little (smooth wobble, gone in a moment)
    if (SC.shake > 0.004) { const s = SC.shake, w = SC.t * 38; cam.position.x += Math.sin(w) * s; cam.position.y += Math.sin(w * 1.37 + 1) * s * 0.8; }
    cam.up.set(Math.sin(tl), Math.cos(tl), 0); cam.lookAt(c.at);
    if (Math.abs(cam.fov - 40) > 0.01) { cam.fov = 40; cam.updateProjectionMatrix(); }
    K.focus.copy(mid); K.sunAt(mid, 30);
  }

  return { build, update, snap() { if (SC.cam) SC.cam.snap = true; }, camOverride: null, SC };
})();
