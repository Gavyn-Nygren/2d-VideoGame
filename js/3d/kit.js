/* Pip & Bo - 3D kit: renderer, scene, toon materials, ink outlines, painted textures, depth helpers, the photo pass.
   Loaded on demand after three.js (js/3d/k3d.js). Everything here hangs off K3D; T is three.js.

   Scene (one at a time; K3D.scene() builds a fresh one and frees the last):
     const K = K3D.scene({ bg: '#2a2230', fov: 28 })  -> { scene, camera, root, sun, amb, hemi, add(obj), tick }
     K3D.draw(dt)                                       renders K (called by render() for a view3d level)
     K3D.free()                                         frees every geometry, material and texture the scene made
   Look:
     K3D.toon(color, { map, side, transparent, opacity, emissive, flat })    toon material, 3 flat steps
     K3D.mesh(geo, mat, { ink: '#2b2130' | false, inkW: 1, cast, receive })  a mesh with an ink outline
     K3D.ink(mesh, color, w)                       adds an inverted-hull outline (smoothed normals) to any mesh
     K3D.paint(key, w, h, c => ..., { repeat })   a texture painted by 2D canvas code, cached by key
     K3D.geo(key, () => geometry)                  cached geometry (shared, freed with the scene)
   Colours: sRGB output and no tone mapping. Lights add up to exactly 1 on a lit face (amb 0.42 + sun 0.58), so a
   colour on a lit face is the same colour as in the 2D game (C.pip on a 3D Pip is the menus' orange).
   Depth helpers (always on for players and carried things): K3D.blob(color) a round shadow + ring in the player's
   colour, kept straight below with K3D.placeBlob(b, x, groundY, z, h); K3D.seeThrough(obj, color) a flat silhouette
   that shows wherever scenery hides obj.
   Screen spots: K3D.toScreen(x, y, z) -> { x, y, z } in the 2D canvas's 960x540 coordinates (z > 1 behind the camera).
   The photo pass: the frame is drawn into a multisampled target and then through one pass that blurs by depth (the
   desk and the room beyond the book go softly out of focus, like a photo of a model), with a faint vignette.
   Toggles (the look-proof page uses them): K3D.opt = { ink, shadows, seeThrough, dof }.
*/
'use strict';

(function () {
  const T = K3D.T;
  const opt = K3D.opt = { ink: true, shadows: true, seeThrough: true, dof: true };
  let R = null, cur = null; // the renderer, the current scene
  const owned = new Set(); // geometries, materials, textures the current scene owns
  const own = x => { if (x) owned.add(x); return x; };
  const texCache = new Map(), geoCache = new Map(), matCache = new Map();

  /* ---------- renderer ---------- */
  function canvas3d() {
    let c = document.getElementById('game3d');
    if (!c) {
      c = document.createElement('canvas');
      c.id = 'game3d'; c.setAttribute('aria-hidden', 'true');
      const g = document.getElementById('game');
      g.parentNode.insertBefore(c, g);
    }
    return c;
  }
  function renderer() {
    if (R) return R;
    const c = canvas3d();
    R = new T.WebGLRenderer({ canvas: c, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!window.__k3dKeep });
    R.outputColorSpace = T.SRGBColorSpace;
    R.toneMapping = T.NoToneMapping;
    R.shadowMap.enabled = true;
    R.shadowMap.type = T.PCFShadowMap; // soft edges come from shadow.radius (PCFSoft was removed in three r18x)
    R.info.autoReset = false;
    // a lost context (driver reset, too many tabs) rebuilds everything when it comes back
    c.addEventListener('webglcontextlost', e => { e.preventDefault(); K3D.lost = true; });
    c.addEventListener('webglcontextrestored', () => { K3D.lost = false; texCache.clear(); geoCache.clear(); matCache.clear(); if (K3D.rebuild) K3D.rebuild(); });
    K3D.R = R;
    return R;
  }
  // size the 3D canvas like the 2D one (fit() in js/main.js calls this): same box, sharpness up to 2
  K3D.fit = function () {
    const c = document.getElementById('game3d');
    if (!c || !R) return;
    const g = document.getElementById('game');
    const w = g.width, h = g.height;
    if (c.width !== w || c.height !== h) { R.setPixelRatio(1); R.setSize(w, h, false); }
    if (cur) { cur.camera.aspect = w / h; cur.camera.updateProjectionMatrix(); post.size(w, h); }
  };
  K3D.show = function (on) {
    const c = on ? canvas3d() : document.getElementById('game3d');
    if (c) c.style.display = on ? '' : 'none';
  };

  /* ---------- toon materials ---------- */
  // lit faces get exactly their colour: ambient 0.42 + sun 0.58 (three's lights are in physical units, so x PI)
  const AMB = 0.42, SUN = 0.58;
  let grad = null;
  function gradient() {
    if (grad) return grad;
    // 16 steps over dot(N, L) from -1 to 1: dark below -0.25, a middle step to 0.12, then lit
    const n = 16, d = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) / n * 2 - 1, v = x < -0.25 ? 0 : x < 0.12 ? 0.42 : 1;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = Math.round(v * 255); d[i * 4 + 3] = 255;
    }
    grad = new T.DataTexture(d, n, 1);
    grad.minFilter = grad.magFilter = T.NearestFilter; grad.generateMipmaps = false; grad.needsUpdate = true;
    return grad;
  }
  K3D.toon = function (color, o = {}) {
    const m = new T.MeshToonMaterial({ color: new T.Color(color), gradientMap: gradient(), map: o.map || null,
      side: o.side != null ? o.side : T.FrontSide, transparent: !!o.transparent, opacity: o.opacity != null ? o.opacity : 1,
      alphaTest: o.alphaTest || 0, depthWrite: o.depthWrite != null ? o.depthWrite : true });
    if (o.emissive) { m.emissive = new T.Color(o.emissive); m.emissiveIntensity = o.emissiveIntensity != null ? o.emissiveIntensity : 1; }
    if (o.polygonOffset) { m.polygonOffset = true; m.polygonOffsetFactor = o.polygonOffset; m.polygonOffsetUnits = o.polygonOffset; }
    return own(m);
  };
  // a plain unlit colour (glows, the lamp bulb, printed decals that ignore light)
  K3D.flat = function (color, o = {}) {
    return own(new T.MeshBasicMaterial({ color: new T.Color(color), map: o.map || null, transparent: !!o.transparent,
      opacity: o.opacity != null ? o.opacity : 1, depthWrite: o.depthWrite != null ? o.depthWrite : true, side: o.side || T.FrontSide,
      blending: o.add ? T.AdditiveBlending : T.NormalBlending, toneMapped: false }));
  };
  // one material per key, shared (hedges, planks, roses...)
  K3D.mat = function (key, make) { if (!matCache.has(key)) matCache.set(key, make()); return matCache.get(key); };
  K3D.geo = function (key, make) { if (!geoCache.has(key)) geoCache.set(key, own(make())); return geoCache.get(key); };

  /* ---------- ink outlines (inverted hull) ---------- */
  // the outline is the same mesh drawn again from the back, pushed out along smoothed normals by a width in screen
  // pixels (so it reads the same near and far, on a phone and on a big screen)
  const inkU = { uPx: { value: 0.001 }, uScale: { value: 1 } };
  K3D.inkU = inkU;
  function smoothNormals(geo) {
    if (geo.attributes.inkNormal) return;
    const pos = geo.attributes.position, nor = geo.attributes.normal || (geo.computeVertexNormals(), geo.attributes.normal);
    const sum = new Map(), key = i => Math.round(pos.getX(i) * 1e4) + ',' + Math.round(pos.getY(i) * 1e4) + ',' + Math.round(pos.getZ(i) * 1e4);
    for (let i = 0; i < pos.count; i++) {
      const k = key(i); let s = sum.get(k); if (!s) sum.set(k, s = [0, 0, 0]);
      s[0] += nor.getX(i); s[1] += nor.getY(i); s[2] += nor.getZ(i);
    }
    const out = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const s = sum.get(key(i)), l = Math.hypot(s[0], s[1], s[2]) || 1;
      out[i * 3] = s[0] / l; out[i * 3 + 1] = s[1] / l; out[i * 3 + 2] = s[2] / l;
    }
    geo.setAttribute('inkNormal', new T.BufferAttribute(out, 3));
  }
  function inkMat(color, w) {
    const key = 'ink|' + color + '|' + w;
    return K3D.mat(key, () => own(new T.ShaderMaterial({
      uniforms: { uPx: inkU.uPx, uScale: inkU.uScale, uW: { value: w }, uCol: { value: new T.Color(color) } },
      vertexShader: `attribute vec3 inkNormal; uniform float uPx, uScale, uW;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 n = normalize(normalMatrix * inkNormal);
          mv.xyz += n * uW * uScale * uPx * max(0.5, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, 1.0);
        #include <colorspace_fragment>
      }`,
      side: T.BackSide,
    })));
  }
  K3D.ink = function (mesh, color = '#2b2130', w = 1) {
    smoothNormals(mesh.geometry);
    const o = new T.Mesh(mesh.geometry, inkMat(color, w));
    o.castShadow = false; o.receiveShadow = false; o.userData.ink = true; o.renderOrder = mesh.renderOrder;
    o.raycast = () => {};
    mesh.add(o);
    return o;
  };
  K3D.mesh = function (geo, mat, o = {}) {
    const m = new T.Mesh(own(geo), mat);
    m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
    if (o.ink !== false) K3D.ink(m, o.ink || '#2b2130', o.inkW || 1);
    return m;
  };

  /* ---------- painted textures ---------- */
  // K3D.paint(key, w, h, c => { ...2D canvas drawing... }, { repeat, flipY, nearest, alpha }) -> texture
  // The painter gets a 2D context sized w x h. Painted once, cached by key until the scene is freed.
  K3D.paint = function (key, w, h, painter, o = {}) {
    const k = key + '|' + w + 'x' + h;
    if (texCache.has(k)) return texCache.get(k);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    painter(c, w, h);
    const t = new T.CanvasTexture(cv);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = R ? R.capabilities.getMaxAnisotropy() : 8;
    if (o.repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
    if (o.nearest) { t.minFilter = t.magFilter = T.NearestFilter; t.generateMipmaps = false; }
    texCache.set(k, own(t));
    return t;
  };

  /* ---------- scene ---------- */
  K3D.scene = function (o = {}) {
    K3D.free();
    renderer();
    const scene = new T.Scene();
    scene.background = new T.Color(o.bg || '#3a3038');
    const g = document.getElementById('game');
    const camera = new T.PerspectiveCamera(o.fov || 28, g.width / g.height, o.near || 0.3, o.far || 400);
    const root = new T.Group(); scene.add(root);
    const amb = new T.AmbientLight(0xffffff, AMB * Math.PI); scene.add(amb);
    const sun = new T.DirectionalLight(0xffffff, SUN * Math.PI);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
    const sc = sun.shadow.camera; sc.left = -18; sc.right = 18; sc.top = 18; sc.bottom = -18; sc.near = 1; sc.far = 160;
    scene.add(sun); scene.add(sun.target);
    // the sun follows a point (the camera's target): its shadow box covers what is on screen at full sharpness
    const sunDir = new T.Vector3(-0.55, 1, 0.35).normalize();
    cur = { scene, camera, root, sun, amb, sunDir, focus: new T.Vector3(), tickers: [], blobs: [], post: true,
      add(obj) { root.add(obj); return obj; },
      tick(fn) { this.tickers.push(fn); },
      // aim the sun's shadow box at a point (and how far it reaches)
      sunAt(p, reach = 18) {
        sun.position.copy(p).addScaledVector(sunDir, 60); sun.target.position.copy(p);
        sc.left = -reach; sc.right = reach; sc.top = reach; sc.bottom = -reach; sc.updateProjectionMatrix();
      },
    };
    K3D.K = cur;
    K3D.fit();
    return cur;
  };
  K3D.free = function () {
    if (!cur && !owned.size) return;
    if (cur) cur.scene.traverse(o => { if (o.geometry) owned.add(o.geometry); if (o.material) [].concat(o.material).forEach(m => { owned.add(m); for (const v of Object.values(m)) if (v && v.isTexture) owned.add(v); }); });
    for (const x of owned) if (x && x.dispose && x !== grad) x.dispose();
    owned.clear(); texCache.clear(); geoCache.clear(); matCache.clear();
    if (cur && cur.shadowRT) cur.shadowRT.dispose();
    if (cur) { cur.sun.shadow.map && cur.sun.shadow.map.dispose(); cur.sun.shadow.map = null; }
    cur = null; K3D.K = null;
  };

  /* ---------- the photo pass: depth of field and a faint vignette ---------- */
  const post = {
    rt: null, quad: null, mat: null, w: 0, h: 0,
    size(w, h) {
      if (!R || (this.rt && this.w === w && this.h === h)) return;
      this.w = w; this.h = h;
      if (this.rt) { this.rt.depthTexture.dispose(); this.rt.dispose(); }
      const dt = new T.DepthTexture(w, h); dt.type = T.UnsignedIntType;
      this.rt = new T.WebGLRenderTarget(w, h, { samples: 4, type: T.HalfFloatType, depthTexture: dt });
      if (this.mat) { this.mat.uniforms.tColor.value = this.rt.texture; this.mat.uniforms.tDepth.value = dt; this.mat.uniforms.texel.value.set(1 / w, 1 / h); }
    },
    init() {
      if (this.mat) return;
      this.mat = new T.ShaderMaterial({
        uniforms: { tColor: { value: null }, tDepth: { value: null }, texel: { value: new T.Vector2() }, near: { value: 0.3 }, far: { value: 400 },
          focus: { value: 20 }, range: { value: 5 }, maxR: { value: 6 }, vig: { value: 0.12 } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: `varying vec2 vUv; uniform sampler2D tColor, tDepth; uniform vec2 texel; uniform float near, far, focus, range, maxR, vig;
          float lin(float z) { float n = z * 2.0 - 1.0; return 2.0 * near * far / (far + near - n * (far - near)); }
          float coc(float d) {
            float fa = clamp((d - focus - range) / (focus * 1.2), 0.0, 1.0);
            float ne = clamp((focus - range * 0.7 - d) / (focus * 0.5), 0.0, 1.0);
            return max(fa, ne * 0.7) * maxR;
          }
          void main() {
            float d0 = lin(texture2D(tDepth, vUv).x), c0 = coc(d0);
            vec3 col = texture2D(tColor, vUv).rgb;
            if (c0 > 0.4) {
              vec3 acc = col; float wsum = 1.0;
              for (int i = 1; i < 28; i++) {
                float fi = float(i), a = fi * 2.39996, r = sqrt(fi / 28.0) * c0;
                vec2 uv = vUv + vec2(cos(a), sin(a)) * r * texel;
                float dd = lin(texture2D(tDepth, uv).x), cc = coc(dd);
                // a sharp thing in front does not smear into the blur behind it
                float w = dd < d0 - 0.5 ? clamp(cc / max(r, 0.001), 0.0, 1.0) : 1.0;
                acc += texture2D(tColor, uv).rgb * w; wsum += w;
              }
              col = acc / wsum;
            }
            vec2 q = vUv - 0.5; col *= 1.0 - vig * smoothstep(0.25, 0.75, length(q * vec2(1.0, 0.8)) * 1.25);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
        depthTest: false, depthWrite: false,
      });
      this.quad = new T.Mesh(new T.PlaneGeometry(2, 2), this.mat);
      this.quad.frustumCulled = false;
      this.qScene = new T.Scene(); this.qScene.add(this.quad);
      this.qCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.size(R.domElement.width, R.domElement.height);
      this.mat.uniforms.tColor.value = this.rt.texture; this.mat.uniforms.tDepth.value = this.rt.depthTexture;
      this.mat.uniforms.texel.value.set(1 / this.w, 1 / this.h);
    },
  };
  K3D.post = post;

  /* ---------- drawing ---------- */
  K3D.draw = function (dt) {
    if (!cur || K3D.noRender || K3D.lost) return;
    const { scene, camera } = cur;
    for (const f of cur.tickers) f(dt);
    const cv = R.domElement;
    inkU.uPx.value = 2 * Math.tan(camera.fov * Math.PI / 360) / cv.height;
    inkU.uScale.value = opt.ink ? 1.6 * Math.max(0.75, cv.height / 720) : 0;
    scene.traverse(o => { if (o.userData.ink) o.visible = opt.ink; if (o.userData.seeThrough) o.visible = opt.seeThrough; });
    R.shadowMap.enabled = opt.shadows; cur.sun.castShadow = opt.shadows;
    R.info.reset();
    if (opt.dof && cur.post) {
      post.init(); post.size(cv.width, cv.height);
      const u = post.mat.uniforms;
      u.near.value = camera.near; u.far.value = camera.far;
      u.focus.value = camera.position.distanceTo(cur.focus); u.range.value = cur.focusRange || u.focus.value * 0.28;
      u.maxR.value = (cur.maxBlur || 7) * cv.height / 1080;
      R.setRenderTarget(post.rt); R.render(scene, camera);
      R.setRenderTarget(null); R.render(post.qScene, post.qCam);
    } else { R.setRenderTarget(null); R.render(scene, camera); }
  };

  /* ---------- screen spots ---------- */
  const v3 = new T.Vector3();
  K3D.toScreen = function (x, y, z) {
    if (!cur) return { x: 0, y: 0, z: 2 };
    v3.set(x, y, z).project(cur.camera);
    return { x: (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H, z: v3.z };
  };
  // how many 2D-canvas pixels one unit is at a point (for sizing name tags and bubbles)
  K3D.pxPerUnit = function (x, y, z) {
    const a = K3D.toScreen(x, y, z), b = K3D.toScreen(x, y + 1, z);
    return Math.abs(a.y - b.y);
  };

  /* ---------- depth helpers ---------- */
  // a round shadow straight below a player or carried thing, with a ring in its colour (always, even in mid-air)
  K3D.blob = function (color, r = 0.42) {
    const tex = K3D.paint('blob|' + color, 128, 128, (c, w, h) => {
      const g = c.createRadialGradient(64, 64, 4, 64, 64, 60);
      g.addColorStop(0, 'rgba(30,20,40,0.55)'); g.addColorStop(0.7, 'rgba(30,20,40,0.32)'); g.addColorStop(1, 'rgba(30,20,40,0)');
      c.fillStyle = g; c.beginPath(); c.arc(64, 64, 62, 0, Math.PI * 2); c.fill();
      if (color) { c.strokeStyle = color; c.lineWidth = 7; c.globalAlpha = 0.85; c.beginPath(); c.arc(64, 64, 52, 0, Math.PI * 2); c.stroke(); }
    });
    const m = new T.Mesh(K3D.geo('blobGeo', () => new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)),
      K3D.flat('#ffffff', { map: tex, transparent: true, depthWrite: false }));
    m.material.polygonOffset = true; m.material.polygonOffsetFactor = -2; m.material.polygonOffsetUnits = -2;
    m.scale.set(r * 2, 1, r * 2); m.renderOrder = 1; m.userData.r = r;
    return m;
  };
  // keep a blob on the ground below (x, z); it shrinks and fades a little the higher the thing is
  K3D.placeBlob = function (b, x, gy, z, height) {
    const k = clamp(1 - height / 6, 0.45, 1);
    b.position.set(x, gy + 0.012, z);
    b.scale.set(b.userData.r * 2 * k, 1, b.userData.r * 2 * k);
    b.material.opacity = 0.6 + 0.4 * k;
  };
  // a flat silhouette in a colour wherever scenery hides obj: drawn after the scenery, before the heroes, only where
  // something is nearer (scenery has renderOrder 0, silhouettes 5, heroes 10)
  K3D.seeThrough = function (obj, color) {
    const mat = K3D.mat('see|' + color, () => own(new T.MeshBasicMaterial({ color: new T.Color(color), transparent: false, opacity: 0.62,
      blending: T.CustomBlending, blendSrc: T.SrcAlphaFactor, blendDst: T.OneMinusSrcAlphaFactor,
      depthFunc: T.GreaterDepth, depthWrite: false, toneMapped: false })));
    const list = [];
    obj.traverse(o => { if (o.isMesh && !o.userData.ink && !o.userData.noSee) list.push(o); });
    for (const o of list) {
      const s = new T.Mesh(o.geometry, mat);
      s.renderOrder = 5; s.userData.seeThrough = true; s.castShadow = false; s.receiveShadow = false;
      o.add(s);
    }
    obj.traverse(o => { if (o.isMesh && !o.userData.seeThrough) o.renderOrder = Math.max(o.renderOrder, 10); });
  };

  /* ---------- batching still scenery ---------- */
  // K3D.bake(group): every still mesh under group (not .userData.live, not see-through, not transparent) is merged
  // with the others that share its material, ink and shadow settings, into one mesh each. Nothing on screen changes:
  // the same triangles, textures and outlines, in far fewer draw calls. Call it once a page's scenery is built.
  K3D.bake = function (group) {
    group.updateMatrixWorld(true);
    const inv = new T.Matrix4().copy(group.matrixWorld).invert();
    const buckets = new Map(), victims = [];
    const liveUnder = o => { for (let q = o; q && q !== group; q = q.parent) if (q.userData.live) return true; return false; };
    group.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o.userData.ink || o.userData.seeThrough || liveUnder(o)) return;
      const mats = [].concat(o.material);
      if (mats.some(m => m.transparent || !(m.isMeshToonMaterial || m.isMeshBasicMaterial))) return;
      const ink = o.children.find(c => c.userData.ink);
      if (o.children.some(c => !c.userData.ink)) return; // something hangs on it: leave it whole
      const geo = o.geometry.index ? o.geometry : o.geometry; // (indexed or not, both work below)
      if (ink) smoothNormals(geo);
      const m4 = new T.Matrix4().multiplyMatrices(inv, o.matrixWorld), nm = new T.Matrix3().getNormalMatrix(m4);
      const groups = geo.groups.length ? geo.groups : [{ start: 0, count: geo.index ? geo.index.count : geo.attributes.position.count, materialIndex: 0 }];
      for (const gr of groups) {
        const mat = mats[gr.materialIndex || 0] || mats[0];
        const key = mat.uuid + '|' + (ink ? ink.material.uuid : '-') + '|' + o.castShadow + '|' + o.receiveShadow + '|' + o.renderOrder;
        let b = buckets.get(key);
        if (!b) buckets.set(key, b = { mat, ink: ink && ink.material, cast: o.castShadow, receive: o.receiveShadow, order: o.renderOrder, parts: [] });
        b.parts.push({ geo, gr, m4, nm });
      }
      victims.push(o);
    });
    let made = 0;
    for (const b of buckets.values()) {
      if (b.parts.length < 2 && b.parts[0].gr.count === (b.parts[0].geo.index ? b.parts[0].geo.index.count : b.parts[0].geo.attributes.position.count)) {
        // a single whole mesh: merging gains nothing, but it still must not be lost (rebuild it below like the rest)
      }
      let nv = 0; for (const p of b.parts) nv += p.gr.count;
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), ink = b.ink ? new Float32Array(nv * 3) : null;
      const v = new T.Vector3();
      let k = 0;
      for (const p of b.parts) {
        const A = p.geo.attributes, ix = p.geo.index;
        for (let i = p.gr.start; i < p.gr.start + p.gr.count; i++, k++) {
          const j = ix ? ix.getX(i) : i;
          v.fromBufferAttribute(A.position, j).applyMatrix4(p.m4); pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z;
          if (A.normal) { v.fromBufferAttribute(A.normal, j).applyMatrix3(p.nm).normalize(); nor[k * 3] = v.x; nor[k * 3 + 1] = v.y; nor[k * 3 + 2] = v.z; }
          if (A.uv) { uv[k * 2] = A.uv.getX(j); uv[k * 2 + 1] = A.uv.getY(j); }
          if (ink) { v.fromBufferAttribute(A.inkNormal || A.normal, j).applyMatrix3(p.nm).normalize(); ink[k * 3] = v.x; ink[k * 3 + 1] = v.y; ink[k * 3 + 2] = v.z; }
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2));
      if (ink) g.setAttribute('inkNormal', new T.BufferAttribute(ink, 3));
      g.computeBoundingSphere();
      const m = new T.Mesh(own(g), b.mat); m.castShadow = b.cast; m.receiveShadow = b.receive; m.renderOrder = b.order; m.userData.baked = true;
      if (b.ink) { const o = new T.Mesh(g, b.ink); o.userData.ink = true; o.castShadow = false; o.receiveShadow = false; m.add(o); }
      group.add(m); made++;
    }
    for (const o of victims) { o.parent.remove(o); }
    return { merged: victims.length, meshes: made };
  };

  /* ---------- small geometry helpers ---------- */
  // a rounded box (superellipsoid): w x h x d, bottom at y = 0; p 0.3 boxy .. 1 round
  K3D.roundBox = function (w, h, d, p = 0.5, seg = 40) {
    const g = new T.SphereGeometry(1, seg, Math.round(seg * 0.75));
    const a = g.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const f = v => Math.sign(v) * Math.pow(Math.abs(v), p);
      a.setXYZ(i, f(a.getX(i)) * w / 2, f(a.getY(i)) * h / 2 + h / 2, f(a.getZ(i)) * d / 2);
    }
    g.computeVertexNormals();
    return g;
  };
  // the surface point of that rounded box at (x, y) on its front (for eyes, cheeks, badges)
  K3D.roundBoxFront = function (w, h, d, p, x, y) {
    const q = 2 / p, u = Math.min(1, Math.abs(x / (w / 2))), v = Math.min(1, Math.abs((y - h / 2) / (h / 2)));
    const r = 1 - Math.pow(u, q) - Math.pow(v, q);
    return r <= 0 ? 0 : Math.pow(r, 1 / q) * d / 2;
  };

  K3D.kitReady = true;
})();
