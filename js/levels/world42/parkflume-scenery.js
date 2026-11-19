/* Pip & Bo - 42-2 Log Flume Plunge: the 3D scene. Timber Falls at midnight inside Starlight Park (built with the shared
   park kit, PARK, and its water, park-water.js): the ground with the channel cut into it, the water, the banks (stone
   kerbs with bulbs, tyres and logs for fenders), the dock, everything on the water that the rules count (ducks, swans,
   the fountain, the water wheel, weirs and their "Hold on!" signs, lifebuoy arches), the gardens round it (willows hung
   with bulbs, lantern strings across the water, floating lanterns, lily pads, fireflies), the coaster's trestle with
   the Comet going over, the park's rides beyond, the camera, and the flat things drawn over the picture.
   Loaded on demand with the 3D kit. Display only: it reads the rules' state (G.mst) and never changes it.

   PARKFLUME_SCENE.build(K, st)        once per scene
   PARKFLUME_SCENE.update(K, st, dt)   every drawn frame: the log, riders, ducks, moving things, camera, lights
   PARKFLUME_SCENE.drawTop(st)         the loudspeaker's bubbles, duck sparkles, "Soak!", prompts, the photo flash
   PARKFLUME_SCENE.camOverride = { eye, at, fov }   the look-shot tools hold the camera still with this */
'use strict';

const PARKFLUME_SCENE = (function () {
  const T = K3D.T, INK = '#1a1530';
  const PR = PARKFLUME_ROUTE, R = PR.R, L = PR.lists, A = PR.at;
  const v3 = (a) => new T.Vector3(a[0], a[1], a[2]);
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  let rnd = PARK.rnd;
  const sm = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  // a place in the world from channel terms: s along, x right of the middle, y up from the water
  const CW = (s, x, y = 0) => R.local(s, x, y);
  const S1_END = A.arch3 + 12; // the end of stretch 1 (the look gate builds everything up to here)

  /* ---------- the ground: a height field with the channel cut into it ---------- */
  // the jungle: everything west of the gardens and north of the lift (rolling ground, high banks of rock)
  const jungleK = (x, z) => sm(-118, -134, x) * sm(-2, -16, z);
  const groundAt = (x, z) => {
    let y = -2.2 * sm(-112, -140, x);
    const j = jungleK(x, z);
    if (j > 0) y += j * (1.3 + 1.2 * Math.sin(x * 0.13 + 1.1) * Math.cos(z * 0.11) + 0.6 * Math.sin(x * 0.37 + z * 0.29));
    return y;
  };
  /* ---------- the lay of the park: where the walks run, what the ground is, and who stands where ---------- */
  // The cobbled walks are drawn on purpose: a promenade down each side of the first stretch that runs through the
  // rides' plazas, links from the rides to the towpath (the gravel beside the water), to the dock's jetty and to both
  // ends of the footbridge, an outer loop behind the rides, a walk south of the long reach, and one from the sawmill's
  // yard to the lagoon's beach. Everything that stands in the park is placed against this plan (see gardens()).
  const WALKS = [
    // west: the jetty, the swings, the drop tower, down to the towpath of the long reach
    [[-9, 3], [-22, -6], [-30, -34], [-38, -70], [-52, -100], [-66, -128], [-70, -150], [-70, -167]],
    [[-30, -34], [-9, -34]], [[-38, -70], [-18, -71], [1, -70]],
    [[-9, -156], [-22, -151], [-44, -140], [-66, -128]],
    [[-38, -70], [-66, -66], [-90, -86], [-96, -112], [-86, -128], [-66, -128]],
    // east: the carousel, the big wheel, the teacups, and the loop behind them
    [[10, -8], [28, -6], [36, -38], [42, -78], [46, -118], [40, -146], [30, -168]],
    [[36, -38], [10, -40]], [[46, -118], [26, -113], [8, -111]], [[30, -168], [20, -159], [8, -156.5]],
    [[36, -38], [62, -44], [78, -80], [76, -125], [60, -158], [30, -168]],
    // south of the long reach, with a way up to its towpath
    [[30, -168], [22, -198], [-18, -214], [-70, -212], [-104, -204]], [[-70, -212], [-70, -197]],
    // the sawmill's yard to the lagoon's beach
    [[-42, 52], [-10, 60], [27, 56]],
  ];
  const HW = 1.7; // half a walk's width
  // each ride stands on a cobbled plaza (the big wheel's is long, under the wheel)
  const PLAZAS = [];
  for (const r of PR.art.rides) {
    if (r.k === 'wheel') { const c = Math.cos(r.yaw || 0), sn = Math.sin(r.yaw || 0); for (const d of [-9, 0, 9]) PLAZAS.push([r.x + c * d, r.z - sn * d, 8.5]); }
    else PLAZAS.push([r.x, r.z, r.k === 'drop' ? 8 : (r.r || 8) + 3.2, r]);
  }
  let LAY = null;
  function lay() {
    if (LAY) return LAY;
    const B = 6, key = (a, b) => a + ',' + b;
    const grid = () => {
      const m = new Map();
      return {
        add(x, z, v) { const k = key(Math.floor(x / B), Math.floor(z / B)); if (!m.has(k)) m.set(k, []); m.get(k).push(v); },
        near(x, z, reach) {
          let best = null, bd = 1e9;
          const bx = Math.floor(x / B), bz = Math.floor(z / B);
          for (let a = bx - reach; a <= bx + reach; a++) for (let b = bz - reach; b <= bz + reach; b++) {
            const l = m.get(key(a, b)); if (!l) continue;
            for (const q of l) { const d = (q[0] - x) ** 2 + (q[1] - z) ** 2; if (d < bd) { bd = d; best = q; } }
          }
          return best ? { q: best, d: Math.sqrt(bd) } : null;
        },
      };
    };
    // the channel's samples, and the walks' (a point every metre), in grids of buckets to find the nearest quickly
    const ch = grid(), wk = grid(), lines = [];
    for (let s = 0; s <= R.len; s += 0.5) { const f = R.at(s), p = f.p; ch.add(p[0], p[2], [p[0], p[2], p[1], PR.w(s), f.t[0], f.t[2], s]); }
    for (const pts of WALKS) {
      const cv = new T.CatmullRomCurve3(pts.map(q => new T.Vector3(q[0], 0, q[1])), false, 'centripetal'), n = Math.ceil(cv.getLength()), line = [];
      for (let i = 0; i <= n; i++) { const q = cv.getPointAt(i / n), t = cv.getTangentAt(i / n); wk.add(q.x, q.z, [q.x, q.z]); line.push([q.x, q.z, t.x, t.z]); }
      lines.push(line);
    }
    LAY = { nearest: (x, z, reach = 3) => ch.near(x, z, reach), walk: (x, z) => { const n = wk.near(x, z, 1); return n ? n.d : 99; }, lines };
    return LAY;
  }
  const FX0 = -230, FX1 = 90, FZ0 = -240, FZ1 = 125; // the height field's edges
  // what the ground is at a place: its height, and how much of it is cobbles, gravel, the channel's bed, jungle floor,
  // lagoon sand and the mill's sawdust
  function surfAt(x, z) {
    const Lq = lay(), jun = jungleK(x, z);
    let y = groundAt(x, z), pave = 0, grav = 0, bed = 0, sand = 0, dust = 0;
    const n = Lq.nearest(x, z), far = Lq.nearest(x, z, 6);
    const kd = far ? PR.kind(far.q[6]) : 'garden';
    if (n && n.d < n.q[3] + 0.5 && n.q[2] < y - 0.05) { y = n.q[2] - 1.1; bed = 1; }
    // inside the sawmill the walkways sit just above the water: the ground under the whole building drops to them
    else if (n && PR.kind(n.q[6]) === 'mill' && n.d < Math.max(n.q[3] + 3.2, 7.2) + 0.2) { y = n.q[2] - 0.2; dust = 1; }
    else if (n && n.d < n.q[3] + 3.2 && n.q[2] < y + 0.2) { if (kd === 'lagoon') sand = 1; else if (kd === 'mill' || kd === 'pond') dust = 1; else if (jun < 0.5) grav = 1; }
    else if (jun < 0.5) {
      if (far && (kd === 'lagoon') && far.d < far.q[3] + 9) sand = 1 - sm(far.q[3] + 6, far.q[3] + 9, far.d);
      else if (far && (kd === 'mill' || kd === 'pond') && far.d < far.q[3] + 16) dust = 1 - sm(far.q[3] + 11, far.q[3] + 16, far.d);
      // the cobbled walks and the rides' plazas (a soft edge, so the kerb line runs smooth across the field's squares)
      if (!sand && dust < 0.5) {
        let d = Lq.walk(x, z) - HW;
        for (const q of PLAZAS) d = Math.min(d, Math.hypot(x - q[0], z - q[1]) - q[2]);
        pave = 1 - sm(-0.55, 0.55, d);
      }
    }
    return { y, pave, grav, bed, jun, sand, dust };
  }
  // one word for the ground at a place (beyond the height field it is all lawn)
  const kindAt = (x, z) => {
    if (x < FX0 || x > FX1 || z < FZ0 || z > FZ1) return 'grass';
    const q = surfAt(x, z);
    return q.bed ? 'water' : q.dust > 0.25 ? 'dust' : q.sand > 0.25 ? 'sand' : q.grav ? 'gravel' : q.pave > 0.2 ? 'pave' : q.jun >= 0.4 ? 'jungle' : 'grass';
  };
  // true where a round patch is lawn all over (nothing of a walk, the towpath, sand or sawdust under it)
  const grassy = (x, z, r) => {
    if (kindAt(x, z) !== 'grass') return false;
    for (const k of r > 2 ? [1, 0.5] : [1]) for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + k; if (kindAt(x + Math.cos(a) * r * k, z + Math.sin(a) * r * k) !== 'grass') return false; }
    return true;
  };

  // WHO STANDS WHERE: a fine grid of taken ground. Everything built is scanned into it (scan), and everything
  // scattered asks for its patch first (claim), so nothing is planted through anything else. 'hi' is taken air (the
  // coaster's track, the big wheel): nothing tall goes under it.
  let OCC = { lo: new Set(), hi: new Set(), seen: new WeakSet() };
  const CELL = 0.5, ck = (a, b) => (a + 4096) * 8192 + (b + 4096);
  const cells = (x, z, r, f) => {
    const a0 = Math.floor((x - r) / CELL), a1 = Math.floor((x + r) / CELL), b0 = Math.floor((z - r) / CELL), b1 = Math.floor((z + r) / CELL), r2 = (r + CELL * 0.4) ** 2;
    for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) { const dx = (a + 0.5) * CELL - x, dz = (b + 0.5) * CELL - z; if (dx * dx + dz * dz <= r2 && f(ck(a, b))) return true; }
    return false;
  };
  const clear = (x, z, r, tall) => !cells(x, z, r, k => OCC.lo.has(k) || (!!tall && OCC.hi.has(k)));
  const mark = (x, z, r, hi) => { const set = hi ? OCC.hi : OCC.lo; cells(x, z, r, k => { set.add(k); }); };
  const claim = (x, z, r, tall) => clear(x, z, r, tall) && (mark(x, z, r), true);
  // scan everything built so far that stands on the ground (not flat decals, not things overhead, not the long swept
  // strips that follow the channel) into the grid
  function scan(K) {
    K.root.updateMatrixWorld(true);
    const bx = new T.Box3(), m4 = new T.Matrix4();
    const put = () => {
      const sx = bx.max.x - bx.min.x, sz = bx.max.z - bx.min.z; if (sx > 30 || sz > 30 || bx.max.y - bx.min.y < 0.3) return;
      const gy = groundAt((bx.min.x + bx.max.x) / 2, (bx.min.z + bx.max.z) / 2); if (bx.min.y > gy + 1.8 || bx.max.y < gy - 0.3) return;
      for (let a = Math.floor((bx.min.x - 0.15) / CELL); a <= Math.floor((bx.max.x + 0.15) / CELL); a++) for (let b = Math.floor((bx.min.z - 0.15) / CELL); b <= Math.floor((bx.max.z + 0.15) / CELL); b++) OCC.lo.add(ck(a, b));
    };
    const walk = o => {
      if (o.userData.big || o.userData.ink || o.isSprite || o.isPoints || o.isLine) return;
      if (o.isMesh && o.geometry && !OCC.seen.has(o)) {
        OCC.seen.add(o);
        const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
        if (o.isInstancedMesh) { for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); m4.premultiply(o.matrixWorld); bx.copy(g.boundingBox).applyMatrix4(m4); put(); } }
        else { bx.copy(g.boundingBox).applyMatrix4(o.matrixWorld); put(); }
      }
      for (const c of o.children) walk(c);
    };
    walk(K.root);
  }
  // a tree's bed: a round of grass and dark mulch inside a stone kerb (so a tree by the towpath stands in a bed of its
  // own, never straight out of the gravel or the cobbles)
  function planter(K, x, y, z, r) {
    r = Math.round(r * 5) / 5;
    const ring = K3D.mesh(K3D.geo('pf-planter|' + r, () => new T.TorusGeometry(r, 0.17, 6, 28).rotateX(Math.PI / 2)), K3D.toon('#9a92a8'), { ink: INK, inkW: 0.6 }); ring.position.set(x, y + 0.1, z); K.add(ring);
    const turf = new T.Mesh(K3D.geo('pf-planterTurf|' + r, () => new T.CircleGeometry(r, 28).rotateX(-Math.PI / 2)), K3D.toon('#ffffff', { map: PARK.grass() })); turf.position.set(x, y + 0.07, z); turf.receiveShadow = true; K.add(turf);
    const mulch = new T.Mesh(K3D.geo('pf-planterMulch|' + r, () => new T.CircleGeometry(r * 0.45, 20).rotateX(-Math.PI / 2)), K3D.toon('#2a1e22')); mulch.position.set(x, y + 0.09, z); mulch.receiveShadow = true; K.add(mulch);
  }

  // the ground: the park kit's grass, gravel and cobbles (the same textures and moonlight as the rest of World 42) laid
  // over a height field with the channel cut into it; per vertex a mask says what it is (aM: cobbles, gravel, the
  // channel's bed, jungle floor; aK: lagoon sand, the mill's sawdust yard)
  function ground(K) {
    const x0 = FX0, x1 = FX1, z0 = FZ0, z1 = FZ1, cs = 1.25;
    const nx = Math.round((x1 - x0) / cs), nz = Math.round((z1 - z0) / cs);
    const N = (nx + 1) * (nz + 1);
    const pos = new Float32Array(N * 3), uv = new Float32Array(N * 2), aM = new Float32Array(N * 4), aK = new Float32Array(N * 2);
    let i = 0;
    for (let jz = 0; jz <= nz; jz++) for (let jx = 0; jx <= nx; jx++, i++) {
      const x = x0 + jx * cs, z = z0 + jz * cs;
      const { y, pave, grav, bed, jun, sand, dust } = surfAt(x, z);
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      uv[i * 2] = x / 5; uv[i * 2 + 1] = z / 5;
      aM[i * 4] = pave; aM[i * 4 + 1] = grav; aM[i * 4 + 2] = bed; aM[i * 4 + 3] = jun;
      aK[i * 2] = sand; aK[i * 2 + 1] = dust;
    }
    const idx = [];
    for (let jz = 0; jz < nz; jz++) for (let jx = 0; jx < nx; jx++) { const a = jz * (nx + 1) + jx, b = a + nx + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    g.setAttribute('aM', new T.BufferAttribute(aM, 4)); g.setAttribute('aK', new T.BufferAttribute(aK, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const U = { uPave: { value: PARK.cobbles() }, uGrass: { value: PARK.lawnTex() }, uGravel: { value: PARK.gravelTex() }, uNoise: { value: PARK.noiseTex() },
      uMoonDir: { value: new T.Vector3(0.25, 0.35, -0.9).normalize() }, uMoonCol: { value: new T.Color('#dfe6ff') } };
    const mat = K3D.toon('#ffffff');
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aM; attribute vec2 aK; varying vec4 vM; varying vec2 vK; varying vec3 vGW;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvM = aM; vK = aK; vGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec4 vM; varying vec2 vK; varying vec3 vGW; uniform sampler2D uPave, uGrass, uGravel, uNoise; uniform vec3 uMoonDir, uMoonCol; float gWet;`).replace('#include <map_fragment>', `
        vec2 wp = vGW.xz;
        vec3 nz = texture2D(uNoise, wp / 190.0).rgb, nz2 = texture2D(uNoise, wp / 41.0 + 0.37).rgb, nz3 = texture2D(uNoise, wp / 9.0 + 0.71).rgb;
        vec3 gr = texture2D(uGrass, wp / 5.5).rgb * mix(0.7, 1.25, nz.r) * mix(0.85, 1.12, nz2.r);
        gr = mix(gr, gr * vec3(1.12, 1.0, 0.82), smoothstep(0.55, 0.8, nz.g) * 0.6);
        // the jungle floor: deep moss, leaf litter and dark earth
        vec3 jf = texture2D(uGrass, wp / 3.0).rgb * vec3(0.62, 0.86, 0.62) * mix(0.55, 1.05, nz2.g);
        jf = mix(jf, vec3(0.30, 0.22, 0.14) * mix(0.7, 1.2, nz3.r), smoothstep(0.5, 0.75, nz3.g) * 0.7);
        gr = mix(gr, jf, smoothstep(0.2, 0.8, vM.w));
        vec3 pv = texture2D(uPave, wp / 7.0).rgb * mix(0.8, 1.15, nz2.b);
        pv = mix(pv, pv * vec3(0.8, 1.05, 0.85), smoothstep(0.6, 0.85, nz.b) * 0.5);
        vec3 gv = texture2D(uGravel, wp / 3.5).rgb * mix(0.85, 1.1, nz2.g);
        vec3 sd = texture2D(uGravel, wp / 6.0).rgb * vec3(1.45, 1.25, 0.95) * mix(0.9, 1.08, nz3.b);
        vec3 du = texture2D(uGravel, wp / 2.5).rgb * vec3(1.35, 1.05, 0.72) * mix(0.8, 1.1, nz3.r);
        float p = smoothstep(0.3, 0.7, vM.x);
        vec3 col = mix(gr, pv, p); col = mix(col, gv, smoothstep(0.3, 0.7, vM.y));
        col = mix(col, sd, smoothstep(0.1, 0.7, vK.x)); col = mix(col, du, smoothstep(0.1, 0.7, vK.y));
        col = mix(col, vec3(0.42, 0.41, 0.5), smoothstep(0.1, 0.3, vM.x) * (1.0 - smoothstep(0.3, 0.5, vM.x)) * 0.8);
        col = mix(col, vec3(0.16, 0.2, 0.26) * mix(0.8, 1.2, nz3.g), smoothstep(0.2, 0.8, vM.z));
        gWet = p * smoothstep(0.62, 0.74, nz2.g * 0.7 + nz.g * 0.5);
        col *= 1.0 - gWet * 0.35;
        diffuseColor.rgb *= col;`).replace('#include <opaque_fragment>', `#include <opaque_fragment>
        {
          vec3 V = normalize(cameraPosition - vGW), Rf = reflect(-V, vec3(0.0, 1.0, 0.0));
          float rm = max(dot(Rf, uMoonDir), 0.0);
          gl_FragColor.rgb += uMoonCol * (gWet * pow(rm, 40.0) * 0.5 + smoothstep(0.3, 0.7, vM.x) * pow(rm, 30.0) * 0.035);
        }`);
    };
    mat.customProgramCacheKey = () => 'pf-ground';
    K.tick(() => { if (K.moonDir) U.uMoonDir.value.copy(K.moonDir); });
    const m = new T.Mesh(g, mat); m.receiveShadow = true; m.userData.live = true; K.add(m); // (live: its own shader, kept out of the bake)
    // beyond the height field: flat lawn all round (a frame with a hole where the field is)
    const far = new T.Group(); far.userData.big = true;
    const fm = K3D.toon('#ffffff', { map: PARK.lawnTex() });
    for (const [cx, cz, w, d] of [[(x0 + x1) / 2, z0 - 400, 1800, 800], [(x0 + x1) / 2, z1 + 400, 1800, 800], [x0 - 400, (z0 + z1) / 2, 800, z1 - z0], [x1 + 400, (z0 + z1) / 2, 800, z1 - z0]]) {
      const geo = new T.PlaneGeometry(w, d).rotateX(-Math.PI / 2); const uvs = geo.attributes.uv; for (let k = 0; k < uvs.count; k++) uvs.setXY(k, uvs.getX(k) * w / 5.5, uvs.getY(k) * d / 5.5);
      const p = new T.Mesh(geo, fm); p.position.set(cx, -0.02, cz); p.receiveShadow = true; far.add(p);
    }
    K.add(far);
    return { nearest: lay().nearest };
  }

  /* ---------- the banks: a stone kerb (a wall where the water runs in a cut), with bulbs and fenders ---------- */
  const stoneTex = () => K3D.paint('pf-stone', 256, 256, (c, w, h) => {
    c.fillStyle = '#6a6478'; c.fillRect(0, 0, w, h);
    const rows = 4;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * 32;
      for (let x = -64 + off; x < w; x += 64 + Math.random() * 8) {
        const l = 38 + Math.random() * 16;
        c.fillStyle = `hsl(${250 + Math.random() * 20}, 10%, ${l}%)`; c.fillRect(x + 3, r * h / rows + 3, 60, h / rows - 6);
        c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(x + 3, r * h / rows + 3, 60, 4);
      }
    }
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(60,110,70,${0.2 + Math.random() * 0.3})`; c.beginPath(); c.arc(Math.random() * w, h * 0.8 + Math.random() * h * 0.2, 3 + Math.random() * 8, 0, Math.PI * 2); c.fill(); }
  }, { repeat: true });
  function banks(K, Bu, W, s0, s1) {
    const step = 1.0, n = Math.ceil((s1 - s0) / step), stone = K3D.toon('#ffffff', { map: stoneTex() }), cap = K3D.toon('#9a92a8');
    const tyres = [], logs = [];
    for (const side of [-1, 1]) {
      const pos = [], uv = [], idx = [], cpos = [], cidx = [];
      for (let i = 0; i <= n; i++) {
        const s = s0 + (s1 - s0) * i / n, f = R.at(s), w = PR.w(s), wy = f.p[1];
        const outer = R.local(s, side * (w + 1.4), 0, f), gy = groundAt(outer[0], outer[2]);
        const top = Math.max(gy, wy + 0.35) + 0.14;
        const a = R.local(s, side * (w - 0.05), -0.7, f), b = R.local(s, side * w, top - wy, f);
        pos.push(a[0], a[1], a[2], b[0], b[1], b[2]); uv.push(s / 2.5, 0, s / 2.5, (top - wy + 0.7) / 2.5);
        const c1 = R.local(s, side * (w - 0.08), top - wy + 0.04, f), c2 = R.local(s, side * (w + 0.85), top - wy, f), c3 = R.local(s, side * (w + 1.0), gy - wy - 0.02, f);
        cpos.push(...c1, ...c2, ...c3);
        if (i) { const A0 = (i - 1) * 2; if (side > 0) idx.push(A0, A0 + 1, A0 + 2, A0 + 1, A0 + 3, A0 + 2); else idx.push(A0, A0 + 2, A0 + 1, A0 + 1, A0 + 2, A0 + 3);
          const C0 = (i - 1) * 3; for (const [p, q] of [[0, 1], [1, 2]]) { if (side > 0) cidx.push(C0 + p, C0 + q, C0 + p + 3, C0 + q, C0 + q + 3, C0 + p + 3); else cidx.push(C0 + p, C0 + p + 3, C0 + q, C0 + q, C0 + p + 3, C0 + q + 3); } }
        // bulbs on the kerb's edge (every 2.5), each with its reflection on the water
        if (Bu && i % 3 === 0) { const bp = R.local(s, side * (w + 0.25), top - wy + 0.12, f); const col = (Math.floor(s / 3) % 3 === 0) ? '#ff9ad0' : '#ffe08a'; Bu.add(bp[0], bp[1], bp[2], col, { size: 0.07, speed: 1.6, phase: s * 0.4 }); if (W) { const rp = R.local(s, side * (w - 0.35), 0, f); W.reflect(rp[0], wy, rp[2], col, 2.6, 0.32, 0.45); } }
        // fenders at the waterline: tyres, and here and there a lashed log
        if (i % 4 === 2) tyres.push({ p: R.local(s, side * (w + 0.02), -0.02, f), yaw: f.yaw, side });
        if (i % 11 === 6) logs.push({ p: R.local(s, side * (w + 0.12), 0.1, f), yaw: f.yaw });
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const wall = new T.Mesh(g, stone); wall.receiveShadow = true; wall.userData.big = true; K.add(wall);
      const cg = new T.BufferGeometry(); cg.setAttribute('position', new T.Float32BufferAttribute(cpos, 3)); cg.setIndex(cidx); cg.computeVertexNormals();
      const cm = new T.Mesh(cg, cap); cm.receiveShadow = true; cm.userData.big = true; K.add(cm);
    }
    // the fenders: tyres hung on the wall (one instanced family), lashed logs
    const tg = K3D.geo('pf-tyre', () => new T.TorusGeometry(0.3, 0.12, 8, 18));
    const tim = new T.InstancedMesh(tg, K3D.toon('#2a2632'), tyres.length);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(1, 1, 1), p = new T.Vector3(), e = new T.Euler();
    tyres.forEach((ty, k) => { e.set(0, ty.yaw + Math.PI / 2, 0); q.setFromEuler(e); m4.compose(p.set(...ty.p), q, sc); tim.setMatrixAt(k, m4); });
    K3D.ink(tim, INK, 0.5); K.add(tim);
    const lg = K3D.geo('pf-fenderLog', () => new T.CylinderGeometry(0.18, 0.18, 2.6, 10).rotateX(Math.PI / 2));
    const lim = new T.InstancedMesh(lg, K3D.toon('#6a4a30', { map: PARK.wood('#6a4a30') }), logs.length);
    logs.forEach((l, k) => { e.set(0, l.yaw, 0); q.setFromEuler(e); m4.compose(p.set(...l.p), q, sc); lim.setMatrixAt(k, m4); });
    K3D.ink(lim, INK, 0.5); K.add(lim);
  }

  /* ---------- a weeping willow hung with fairy lights ---------- */
  const strands = []; // gathered, then one instanced family for every willow's hanging fronds
  function willow(K, Bu, x, z, s = 1, W) {
    const g = new T.Group(), gy = groundAt(x, z);
    const trunk = K3D.mesh(K3D.geo('pf-willowTrunk', () => new T.CylinderGeometry(0.25, 0.42, 3.4, 9).translate(0, 1.7, 0)), K3D.toon('#3a2a24'), { ink: INK, inkW: 0.8 });
    trunk.rotation.z = (rnd() - 0.5) * 0.25; g.add(trunk);
    const leaf = K3D.toon(['#3f7a4a', '#4a8a52', '#356a48'][Math.floor(rnd() * 3)]);
    for (let i = 0; i < 5; i++) { const b = K3D.mesh(K3D.geo('pf-willowCrown', () => new T.IcosahedronGeometry(1.3, 1).scale(1, 0.6, 1)), leaf, { ink: '#0e2420', inkW: 0.8 }); const a = i / 5 * 6.28; b.position.set(Math.cos(a) * 1.1, 3.6 + (i % 2) * 0.4, Math.sin(a) * 1.1); g.add(b); }
    g.position.set(x, gy, z); g.scale.setScalar(s); K.add(g);
    const lights = rnd() < 0.8, col = ['#ffe0a0', '#ff9ad6', '#9ae0ff', '#c8ff9a'][Math.floor(rnd() * 4)];
    for (let i = 0; i < 46; i++) {
      const a = i / 46 * 6.28 + rnd() * 0.1, r = (1.9 + rnd() * 0.7) * s, len = (2.2 + rnd() * 1.2) * s, top = gy + (3.6 + rnd() * 0.4) * s;
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      strands.push({ x: px, y: top, z: pz, len, a });
      if (Bu && lights && i % 2 === 0) { Bu.add(px, top - len + 0.1, pz, i % 6 === 0 ? '#ffffff' : col, { size: 0.06, speed: 1.4, phase: i * 0.7 }); }
    }
    if (W && lights) { const n = R.toLocal(x, gy, z, 0, S1_END); if (n && Math.abs(n.ox) < PR.w(n.s) + 4) { const rp = R.local(n.s, Math.sign(n.ox) * Math.max(0, PR.w(n.s) - 1.0), 0); W.reflect(rp[0], rp[1], rp[2], col, 5, 1.6, 0.3); } }
    return g;
  }
  function strandsDone(K) {
    const geo = K3D.geo('pf-strand', () => new T.CylinderGeometry(0.06, 0.18, 1, 4, 1).translate(0, -0.5, 0));
    const mat = K3D.toon('#5a9a5a');
    // the fronds sway in the shader
    const u = { uT: { value: 0 } };
    mat.onBeforeCompile = sh => { sh.uniforms.uT = u.uT; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>', '#include <begin_vertex>\n{ float d = -position.y; vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); transformed.x += sin(uT * 1.3 + wp.x * 0.7 + wp.z) * d * 0.12; transformed.z += cos(uT * 1.1 + wp.z * 0.6) * d * 0.08; }'); };
    const im = new T.InstancedMesh(geo, mat, strands.length);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), p = new T.Vector3(), e = new T.Euler();
    strands.forEach((st, k) => { e.set(0.06 * Math.cos(st.a), 0, -0.06 * Math.sin(st.a)); q.setFromEuler(e); m4.compose(p.set(st.x, st.y, st.z), q, sc.set(1, st.len, 1)); im.setMatrixAt(k, m4); });
    im.castShadow = false; K3D.ink(im, '#123020', 0.4); K.add(im);
    K.tick(dt => { u.uT.value += dt; });
    strands.length = 0;
  }

  /* ---------- the dock ---------- */
  function dock(K, Bu, W, s, outHome) {
    const f = R.at(s), g = new T.Group(), p = R.local(s, 0, 0, f);
    g.position.set(p[0], 0, p[2]); g.rotation.y = f.yaw + Math.PI; K.add(g); // local -Z downstream
    const wood = K3D.toon('#ffffff', { map: PARK.wood('#7a5032') });
    const w = PR.w(s);
    // the jetty along Pip's side (left, -x): planks on posts, a step down to the water
    const deck = K3D.mesh(new T.BoxGeometry(3.2, 0.25, 16), wood, { ink: INK }); deck.position.set(-(w + 1.4), 0.05, 0); g.add(deck);
    for (let z = -7.5; z <= 7.5; z += 2.5) for (const x of [-(w + 0.0), -(w + 2.8)]) { const post = K3D.mesh(K3D.geo('pf-dockPost', () => new T.CylinderGeometry(0.14, 0.16, 2.2, 8)), wood, { ink: INK, inkW: 0.7 }); post.position.set(x, -0.6, z); g.add(post); }
    const step = K3D.mesh(new T.BoxGeometry(1.0, 0.2, 5), wood, { ink: INK }); step.position.set(-(w - 0.2), -0.25, 0); g.add(step);
    // a narrow walkway on the right, the gate across the channel's mouth at the downstream end
    const deck2 = K3D.mesh(new T.BoxGeometry(1.4, 0.25, 16), wood, { ink: INK }); deck2.position.set(w + 0.5, 0.05, 0); g.add(deck2);
    // the station roof: a long shingled roof on log posts with a big sign
    for (const z of [-7, -1.5, 4]) for (const x of [-(w + 2.8), w + 1.0]) { const pl = K3D.mesh(K3D.geo('pf-roofPost', () => new T.CylinderGeometry(0.22, 0.26, 4.6, 9).translate(0, 2.3, 0)), K3D.toon('#ffffff', { map: PARK.wood('#5a3a24') }), { ink: INK, inkW: 0.8 }); pl.position.set(x, 0, z); g.add(pl); }
    const roofTex = K3D.paint('pf-shingle', 256, 256, (c, ww, hh) => { c.fillStyle = '#5a2f3a'; c.fillRect(0, 0, ww, hh); for (let y = 0; y < hh; y += 22) for (let x = (y / 22 % 2) * 16; x < ww; x += 32) { c.fillStyle = `hsl(${345 + Math.random() * 15}, 35%, ${22 + Math.random() * 10}%)`; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30, y); c.lineTo(x + 30, y + 18); c.quadraticCurveTo(x + 15, y + 26, x, y + 18); c.closePath(); c.fill(); } }, { repeat: true });
    for (const sx of [-1, 1]) { const rf = K3D.mesh(new T.BoxGeometry((w * 2 + 5) / 2 + 0.6, 0.2, 13.5), K3D.toon('#ffffff', { map: roofTex }), { ink: INK }); rf.position.set(sx * ((w * 2 + 5) / 4) - 0.9, 5.3 - 0.0, -1.5); rf.rotation.z = -sx * 0.32; g.add(rf); }
    // the neon sign: TIMBER FALLS, with the beaver mascot's face beside it
    const sg = PARK.neon(K, 'TIMBER FALLS', { w: 9, h: 2.0, col: '#ffcf4a', col2: '#7affb0', k: 2.6 }); sg.position.set(-0.9, 7.6, -8.2); sg.rotation.y = Math.PI; g.add(sg);
    const sg2 = PARK.neon(K, 'TIMBER FALLS', { w: 9, h: 2.0, col: '#ffcf4a', col2: '#7affb0', k: 2.6 }); sg2.position.set(-0.9, 7.6, 5.2); g.add(sg2);
    const bvTex = K3D.paint('pf-beaverSign', 256, 256, (c, ww, hh) => {
      c.fillStyle = '#7a4a2a'; c.beginPath(); c.arc(128, 128, 110, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#ffcf4a'; c.lineWidth = 10; c.stroke();
      c.fillStyle = '#a87048'; c.beginPath(); c.ellipse(128, 160, 60, 44, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(92, 104, 22, 0, Math.PI * 2); c.arc(164, 104, 22, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1a1210'; c.beginPath(); c.arc(96, 108, 11, 0, Math.PI * 2); c.arc(160, 108, 11, 0, Math.PI * 2); c.arc(128, 142, 16, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff6e0'; c.fillRect(110, 168, 16, 30); c.fillRect(130, 168, 16, 30); c.strokeStyle = '#1a1210'; c.lineWidth = 3; c.strokeRect(110, 168, 16, 30); c.strokeRect(130, 168, 16, 30);
    });
    const bvs = new T.Mesh(new T.CircleGeometry(1.5, 32), K3D.flat(hot('#ffffff', 1.25), { map: bvTex })); bvs.position.set(4.6, 7.6, -8.25); bvs.rotation.y = Math.PI; g.add(bvs);
    // the gate: two wooden leaves across the water at the downstream end, swung open (the scenery swings them)
    const gate = [];
    for (const sx of [-1, 1]) { const hinge = new T.Group(); hinge.position.set(sx * w, 0, -8.6); g.add(hinge); const leaf = K3D.mesh(new T.BoxGeometry(w, 1.4, 0.18), K3D.toon('#ffffff', { map: PARK.stripes('#e8483a', '#f4ecd8', 8) }), { ink: INK }); leaf.position.set(-sx * w / 2, 0.4, 0); hinge.add(leaf); hinge.userData.live = true; hinge.userData.sx = sx; gate.push(hinge); }
    // spare logs waiting at the jetty upstream of ours, bobbing (empty)
    const spares = [];
    // queue rails with bulbs and a ticket booth, a photo board
    for (let z = -6; z <= 6; z += 3) { const qp = K3D.mesh(K3D.geo('pf-qPost', () => new T.CylinderGeometry(0.06, 0.06, 1.1, 8).translate(0, 0.55, 0)), K3D.toon('#e8c060'), { ink: INK, inkW: 0.5 }); qp.position.set(-(w + 2.4), 0.15, z); g.add(qp); }
    const rope = K3D.mesh(new T.CylinderGeometry(0.04, 0.04, 12, 6).rotateX(Math.PI / 2), K3D.toon('#c83a4a'), { ink: false }); rope.position.set(-(w + 2.4), 1.05, 0); g.add(rope);
    const board = K3D.mesh(new T.BoxGeometry(3.4, 2.2, 0.15), K3D.toon('#2a2438'), { ink: INK }); board.position.set(-(w + 4.6), 2.2, 2.0); board.rotation.y = Math.PI / 2; g.add(board);
    const photo = new T.Mesh(new T.PlaneGeometry(3.0, 1.8), K3D.flat(hot('#ffffff', 0.9), { map: K3D.paint('pf-photoBoard', 256, 160, (c, ww, hh) => { c.fillStyle = '#1a1a30'; c.fillRect(0, 0, ww, hh); c.fillStyle = '#ffcf4a'; c.font = '900 26px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.fillText('YOUR RIDE PHOTO', ww / 2, 34); c.strokeStyle = '#fff'; c.lineWidth = 4; c.strokeRect(30, 50, ww - 60, hh - 66); c.fillStyle = '#5a6a9a'; c.fillRect(32, 52, ww - 64, hh - 70); c.fillStyle = '#e8f4ff'; for (let i = 0; i < 30; i++) { c.beginPath(); c.arc(40 + Math.random() * (ww - 80), 70 + Math.random() * 70, 3 + Math.random() * 8, 0, 6.28); c.fill(); } }) }));
    photo.position.set(-(w + 4.5), 2.2, 2.0); photo.rotation.y = Math.PI / 2; g.add(photo);
    PARK.booth(K, Bu, { x: p[0] - (w + 7) * Math.cos(f.yaw) , z: p[2] + (w + 7) * Math.sin(f.yaw) + 4, yaw: f.yaw - Math.PI / 2 });
    K.add(g); g.updateMatrixWorld(true);
    const w2 = (x, y, z) => { const q = new T.Vector3(x, y, z).applyMatrix4(g.matrixWorld); return [q.x, q.y, q.z]; };
    if (Bu) {
      // bulbs along the roof's eaves and the jetty's edge
      for (const x of [-(w + 3.2), w + 1.4]) Bu.line(w2(x, 4.3, -8.2), w2(x, 4.3, 5.2), 0.5, ['#ffe07a', '#ff8ab0', '#ffffff'], { speed: 4, size: 0.1 });
      Bu.line(w2(-(w + 0.0), 0.32, -8), w2(-(w + 0.0), 0.32, 8), 0.6, ['#ffe07a', '#7affb0'], { speed: 3, size: 0.07 });
      for (let z = -7; z <= 4; z += 3.5) { const lp = w2(-0.9, 4.2, z); Bu.add(lp[0], lp[1], lp[2], '#fff0c0', { size: 0.25 }); PARK.halo(K, lp[0], lp[1], lp[2], 3, '#ffe0a0', 0.4); if (W) W.reflect(lp[0], -0.45, lp[2], '#ffe0a0', 6, 1.4, 0.4); }
    }
    for (const z of [-8.2, 5.2]) { const q = w2(-0.9, 6.0, z); if (W) W.reflect(q[0], -0.45, q[2] + (z < 0 ? -3 : 3), '#ffcf4a', 8, 3, 0.35); }
    return { g, gate, spares };
  }

  /* ---------- lifebuoy arches ---------- */
  function arch(K, Bu, W, s) {
    const f = R.at(s), g = new T.Group(), p = R.local(s, 0, 0, f), w = PR.w(s) + 0.6;
    g.position.set(...p); g.lookAt(p[0] - f.t[0], p[1], p[2] - f.t[2]);
    const pts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24; pts.push(new T.Vector3(Math.cos(a) * w, Math.sin(a) * 1.8 + 3.0, 0)); }
    const stripe = K3D.toon('#ffffff', { map: PARK.stripes('#e8483a', '#f4ecd8', 10) });
    g.add(K3D.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 48, 0.22, 8), stripe, { ink: INK }));
    for (const sx of [-1, 1]) { const po = K3D.mesh(new T.CylinderGeometry(0.2, 0.26, 3.6, 10), stripe, { ink: INK }); po.position.set(sx * w, 1.3, 0); g.add(po); }
    // lifebuoys hung along it
    const lbTex = K3D.paint('pf-lifebuoy', 256, 32, (c, ww, hh) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f4f0e8' : '#e8483a'; c.fillRect(i * ww / 8, 0, ww / 8, hh); } });
    for (let i = 1; i < 8; i++) { if (i === 4) continue; const q = pts[Math.round(i / 8 * 24)]; const lb = K3D.mesh(K3D.geo('pf-buoy', () => new T.TorusGeometry(0.34, 0.12, 10, 22)), K3D.toon('#ffffff', { map: lbTex }), { ink: INK, inkW: 0.6 }); lb.position.set(q.x, q.y - 0.55, 0.15); lb.rotation.z = i * 0.4; g.add(lb); }
    // the bucket robot on top, with a big bucket ready to tip
    const rb = PARK.robot(K, { col: '#3f9a8a' }); K.root.remove(rb); rb.position.set(0, 4.85, 0); rb.rotation.y = 0; g.add(rb);
    const bucket = new T.Group(); bucket.position.set(0.9, 6.0, 0.2); g.add(bucket); bucket.userData.live = true;
    const bk = K3D.mesh(new T.CylinderGeometry(0.42, 0.32, 0.6, 14, 1, true), K3D.toon('#9aa8c8', { side: T.DoubleSide }), { ink: INK, inkW: 0.7 }); bucket.add(bk);
    const bw = new T.Mesh(new T.CircleGeometry(0.38, 14).rotateX(-Math.PI / 2), K3D.flat(hot('#7ad0ff', 1.1))); bw.position.y = 0.22; bucket.add(bw);
    const sg = PARK.neon(K, 'DRY OFF!', { w: 2.6, h: 0.6, col: '#7ad0ff', k: 2.3, board: false }); sg.position.set(0, 2.55 + 1.8 - 0.2, 0.25); g.add(sg);
    K.add(g); g.updateMatrixWorld(true);
    if (Bu) for (let i = 0; i <= 30; i++) { const q = pts[Math.round(i / 30 * 24)].clone(); q.z = 0.25; q.applyMatrix4(g.matrixWorld); Bu.add(q.x, q.y, q.z, i % 2 ? '#ffffff' : '#ff9a6a', { size: 0.1, speed: 5, phase: i * 0.6 }); }
    if (W) for (const sx of [-0.6, 0, 0.6]) { const q = R.local(s, sx * w, 0, f); W.reflect(q[0], q[1], q[2] + 0.01, '#ffd0a0', 6, 1.2, 0.3); }
    return { g, robot: rb, bucket, s };
  }

  /* ---------- "Hold on!" hand signs, the drag sign ---------- */
  const signTex = (kind) => K3D.paint('pf-sign|' + kind, 256, 256, (c, w, h) => {
    if (kind === 'brace') {
      c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(128, 6); c.lineTo(250, 128); c.lineTo(128, 250); c.lineTo(6, 128); c.closePath(); c.fill();
      c.strokeStyle = '#1a1626'; c.lineWidth = 10; c.stroke();
      // two hands gripping a bar
      c.fillStyle = '#1a1626'; c.fillRect(56, 136, 144, 14);
      for (const x of [92, 164]) { c.beginPath(); c.ellipse(x, 122, 24, 28, 0, 0, Math.PI * 2); c.fill(); for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(x - 15 + k * 10, 150, 5, 10, 0, 0, Math.PI * 2); c.fill(); } }
      c.font = '900 30px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.fillText('HOLD ON!', 128, 208);
    } else if (kind === 'drag') {
      c.fillStyle = '#2f6fc0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ffffff'; c.lineWidth = 12; c.strokeRect(8, 8, w - 16, h - 16);
      // a paddle held upright in wavy water, and a curved arrow
      c.fillStyle = '#ffffff'; c.fillRect(120, 40, 16, 110); c.beginPath(); c.ellipse(128, 160, 26, 40, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#9ad8ff'; c.lineWidth = 8; for (let k = 0; k < 2; k++) { c.beginPath(); for (let x = 24; x <= 232; x += 8) c.lineTo(x, 172 + k * 22 + Math.sin(x * 0.12) * 6); c.stroke(); }
      c.strokeStyle = '#ffd23a'; c.lineWidth = 12; c.beginPath(); c.arc(128, 110, 80, -2.6, -0.5); c.stroke();
      c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(196, 50); c.lineTo(218, 82); c.lineTo(182, 86); c.closePath(); c.fill();
    }
  });
  function sign(K, Bu, s, side, kind) {
    const f = R.at(s), w = PR.w(s), p = R.local(s, side * (w + 1.2), 0, f), gy = groundAt(p[0], p[2]);
    const g = new T.Group(); g.position.set(p[0], gy, p[2]); g.lookAt(p[0] - f.t[0], gy, p[2] - f.t[2]);
    const post = K3D.mesh(K3D.geo('pf-signPost', () => new T.CylinderGeometry(0.07, 0.09, 2.6, 8).translate(0, 1.3, 0)), PARK.toonM('#2a2438'), { ink: INK, inkW: 0.6 }); g.add(post);
    const bd = K3D.mesh(new T.BoxGeometry(1.5, 1.5, 0.08), K3D.toon('#ffffff', { map: signTex(kind), emissive: '#ffffff', emissiveIntensity: 0.2 }), { ink: INK, inkW: 0.9 });
    bd.position.y = 2.4; g.add(bd);
    if (kind === 'brace') bd.rotation.z = 0; // (a diamond already)
    K.add(g); g.updateMatrixWorld(true);
    if (Bu) for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, q = new T.Vector3(Math.cos(a) * 0.95, 2.4 + Math.sin(a) * 0.95, 0.06).applyMatrix4(g.matrixWorld); Bu.add(q.x, q.y, q.z, kind === 'brace' ? '#ffd24a' : '#ffffff', { size: 0.07, blink: true, phase: i }); }
    return g;
  }

  /* ---------- swan boats, the fountain, the footbridge, the weir, the island, the water wheel ---------- */
  function swanBoat(K, Bu) {
    const g = new T.Group(), white = K3D.toon('#fbf8f2', { emissive: '#fff4e8', emissiveIntensity: 0.12 }), ink = { ink: INK, inkW: 0.9 };
    const hull = K3D.mesh(K3D.roundBox(1.6, 0.8, 2.4, 0.7, 24), white, ink); hull.position.y = 0.2; g.add(hull);
    const seat = K3D.mesh(new T.BoxGeometry(1.1, 0.12, 0.6), K3D.toon('#c83a6a'), { ink: INK, inkW: 0.5 }); seat.position.set(0, 0.55, 0.3); g.add(seat);
    // a painted band round the hull and a little canopy over the seat (a pedal boat)
    const band = K3D.mesh(new T.TorusGeometry(1, 0.07, 6, 32).rotateX(Math.PI / 2).scale(0.82, 1, 1.22), K3D.toon('#3fb8b0', { emissive: '#3fb8b0', emissiveIntensity: 0.15 }), { ink: false }); band.position.y = 0.42; g.add(band);
    const can = K3D.mesh(new T.ConeGeometry(0.75, 0.35, 12, 1, true), K3D.toon('#ff7ab0', { side: T.DoubleSide }), { ink: INK, inkW: 0.5 }); can.position.set(0, 1.55, 0.35); g.add(can);
    const pole = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1.0, 6), K3D.toon('#e8c060')); pole.position.set(0, 1.05, 0.35); g.add(pole);
    const neckC = new T.CatmullRomCurve3([new T.Vector3(0, 0.5, -0.9), new T.Vector3(0, 1.3, -1.25), new T.Vector3(0, 2.0, -1.0), new T.Vector3(0, 2.2, -1.35)]);
    g.add(K3D.mesh(new T.TubeGeometry(neckC, 20, 0.16, 10), white, ink));
    const head = K3D.mesh(new T.SphereGeometry(0.24, 14, 10), white, ink); head.position.set(0, 2.25, -1.4); g.add(head);
    const beak = K3D.mesh(new T.ConeGeometry(0.1, 0.36, 10).rotateX(-Math.PI / 2), K3D.toon('#f08a3c'), { ink: INK, inkW: 0.5 }); beak.position.set(0, 2.2, -1.72); g.add(beak);
    for (const sx of [-1, 1]) { const eye = new T.Mesh(new T.SphereGeometry(0.04, 8, 6), K3D.flat('#1a1210')); eye.position.set(sx * 0.17, 2.32, -1.5); g.add(eye); }
    // wings: two scalloped fins on the sides, a crown of bulbs round the rim
    for (const sx of [-1, 1]) { const wing = K3D.mesh(K3D.roundBox(0.12, 0.7, 1.5, 0.9, 16), white, { ink: INK, inkW: 0.7 }); wing.position.set(sx * 0.82, 0.72, 0.3); wing.rotation.x = -0.35; g.add(wing); }
    const bl = PARK.bulbs(K, 24); g.add(bl.mesh);
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; bl.add(Math.sin(a) * 0.82, 0.62, Math.cos(a) * 1.2, i % 2 ? '#ff9ad0' : '#ffffff', { size: 0.045, speed: 3, phase: i * 0.6 }); }
    bl.done();
    g.userData.live = true; K.add(g);
    return g;
  }
  function fountain(K, Bu, W) {
    const o = L.obs.find(q => q.kind === 'fountain'), p = CW(o.s, o.x), g = new T.Group(); g.position.set(...p); K.add(g);
    const stoneM = K3D.toon('#ffffff', { map: stoneTex() });
    const rim = K3D.mesh(new T.CylinderGeometry(o.r + 0.2, o.r + 0.35, 0.8, 28), stoneM, { ink: INK }); rim.position.y = 0.0; g.add(rim);
    const basinW = new T.Mesh(new T.CircleGeometry(o.r, 28).rotateX(-Math.PI / 2), K3D.flat(hot('#5ab0ff', 0.7))); basinW.position.y = 0.38; g.add(basinW);
    const col = K3D.mesh(new T.CylinderGeometry(0.25, 0.4, 2.4, 12), stoneM, { ink: INK }); col.position.y = 1.4; g.add(col);
    const dish = K3D.mesh(new T.CylinderGeometry(1.2, 0.3, 0.4, 20), stoneM, { ink: INK }); dish.position.y = 2.6; g.add(dish);
    const dish2 = K3D.mesh(new T.CylinderGeometry(0.6, 0.2, 0.3, 16), stoneM, { ink: INK }); dish2.position.y = 3.5; g.add(dish2);
    // a fish statue spouting at the top
    const fish = K3D.mesh(new T.SphereGeometry(0.32, 14, 10).scale(1, 1.4, 1), K3D.toon('#e8c060'), { ink: INK }); fish.position.y = 4.0; g.add(fish);
    // jets: glowing water arcs (planes of foam that ripple) and a curtain off each dish
    const jm = new T.MeshBasicMaterial({ map: PARK.foamTex(), color: hot('#cfe8ff', 1.2), transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false });
    const jets = [];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, pts = []; for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push(new T.Vector3(Math.cos(a) * u * 1.6, 4.3 + u * 1.2 - u * u * 4.6, Math.sin(a) * u * 1.6)); }
      const jt = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.07, 6), jm); g.add(jt); jets.push(jt);
    }
    const cur = new T.Mesh(new T.CylinderGeometry(1.2, 1.5, 1.2, 24, 1, true), jm); cur.position.y = 2.0; g.add(cur);
    const cur2 = new T.Mesh(new T.CylinderGeometry(0.6, 0.85, 0.9, 20, 1, true), jm); cur2.position.y = 3.0; g.add(cur2);
    jets.forEach(j => { j.userData.live = true; }); cur.userData.live = cur2.userData.live = true;
    K.tick(dt => { jm.map.offset.y -= dt * 0.8; });
    g.updateMatrixWorld(true);
    if (Bu) { Bu.ring([p[0], p[1] + 0.5, p[2]], o.r + 0.3, 28, ['#ff6ab0', '#7ad0ff', '#ffd24a', '#9aff8a'], { speed: 4, size: 0.1 }); Bu.ring([p[0], p[1] + 2.8, p[2]], 1.2, 16, ['#7ad0ff', '#ffffff'], { speed: 6, size: 0.07 }); }
    if (W) { for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28; W.reflect(p[0] + Math.cos(a) * 2.6, p[1], p[2] + Math.sin(a) * 2.6, ['#ff6ab0', '#7ad0ff', '#ffd24a', '#9aff8a'][i], 4, 1.2, 0.4); } }
    return { g };
  }
  function footbridge(K, Bu, W) {
    const s = A.bridge, f = R.at(s), p = R.local(s, 0, 0, f), w = PR.w(s) + 1.4, g = new T.Group();
    g.position.set(p[0], 0, p[2]); g.rotation.y = f.yaw + Math.PI / 2; K.add(g); // local X along the channel, Z across
    const wood = K3D.toon('#ffffff', { map: PARK.wood('#8a5a3a') });
    const arc = z => 1.65 + 0.6 * Math.cos(z / (w + 1) * Math.PI / 2);
    // the deck: an arched walk across (planks), railings with bulbs
    const n = 16, pts = []; for (let i = 0; i <= n; i++) { const z = -w - 1 + (2 * w + 2) * i / n; pts.push([z, arc(z)]); }
    for (let i = 0; i < n; i++) { const [z0, y0] = pts[i], [z1, y1] = pts[i + 1]; const pl = K3D.mesh(new T.BoxGeometry(2.2, 0.16, Math.hypot(z1 - z0, y1 - y0) + 0.02), wood, { ink: INK, inkW: 0.6 }); pl.position.set(0, (y0 + y1) / 2, (z0 + z1) / 2); pl.rotation.x = -Math.atan2(y1 - y0, z1 - z0); g.add(pl); }
    for (const sx of [-1, 1]) {
      const rail = new T.CatmullRomCurve3(pts.map(([z, y]) => new T.Vector3(sx * 1.05, y + 0.9, z)));
      g.add(K3D.mesh(new T.TubeGeometry(rail, 40, 0.05, 6), K3D.toon('#f4ecd8'), { ink: INK, inkW: 0.6 }));
      for (let i = 0; i <= n; i += 2) { const [z, y] = pts[i]; const bal = K3D.mesh(K3D.geo('pf-baluster', () => new T.CylinderGeometry(0.04, 0.04, 0.9, 6).translate(0, 0.45, 0)), K3D.toon('#f4ecd8'), { ink: false }); bal.position.set(sx * 1.05, y, z); g.add(bal); }
    }
    // the abutments on the banks
    for (const sz of [-1, 1]) { const ab = K3D.mesh(new T.BoxGeometry(2.6, 1.8, 1.4), K3D.toon('#ffffff', { map: stoneTex() }), { ink: INK }); ab.position.set(0, 0.5, sz * (w + 1.2)); g.add(ab); }
    // three wind-up robots fishing off it (one has hooked a rubber duck)
    const robots = [];
    for (const [z, col, hooked] of [[-2.2, '#f2c14e', false], [0.2, '#e85a4a', true], [2.6, '#7a6ad0', false]]) {
      const rb = PARK.robot(K, { col }); K.root.remove(rb); rb.position.set(-0.5, arc(z) + 0.08, z); rb.rotation.y = -Math.PI / 2; rb.userData.broom.visible = false; g.add(rb);
      const rod = new T.Group(); rod.position.set(-0.95, arc(z) + 1.2, z); g.add(rod); rod.userData.live = true;
      rod.add(K3D.mesh(new T.CylinderGeometry(0.025, 0.035, 2.2, 6).translate(0, 1.1, 0).rotateZ(1.0), K3D.toon('#3a2f3f'), { ink: false }));
      const tipX = -1.9, tipY = 1.2;
      const lineM = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, tipY + arc(z) + 1.2, 3).translate(0, -(tipY + arc(z) + 1.2) / 2, 0), K3D.flat('#e8e8f0')); lineM.position.set(tipX, tipY, 0); rod.add(lineM);
      if (hooked) { const dk = duckMesh(); dk.scale.setScalar(0.8); dk.position.set(tipX, 0.2, 0); rod.add(dk); rod.userData.duck = dk; }
      robots.push({ rb, rod, z });
    }
    g.updateMatrixWorld(true);
    if (Bu) for (const sx of [-1, 1]) for (let i = 0; i <= n; i++) { const [z, y] = pts[i]; const q = new T.Vector3(sx * 1.05, y + 0.98, z).applyMatrix4(g.matrixWorld); Bu.add(q.x, q.y, q.z, i % 2 ? '#ffe07a' : '#ff9ad0', { size: 0.07, speed: 3, phase: i * 0.5 }); if (W && i % 3 === 0) W.reflect(q.x, p[1], q.z + (sx * 0.2), i % 2 ? '#ffe07a' : '#ff9ad0', 3, 0.5, 0.35); }
    return { g, robots };
  }
  // a golden rubber duck (for the fishing robot; the ducks on the water are one instanced family)
  function duckMesh() {
    const g = new T.Group(), yel = K3D.toon('#ffd23a', { emissive: '#ffb020', emissiveIntensity: 0.3 });
    const b = K3D.mesh(new T.SphereGeometry(0.28, 14, 10).scale(1.25, 0.85, 1), yel, { ink: INK, inkW: 0.7 }); b.position.y = 0.1; g.add(b);
    const h = K3D.mesh(new T.SphereGeometry(0.17, 12, 8), yel, { ink: INK, inkW: 0.7 }); h.position.set(-0.2, 0.38, 0); g.add(h);
    const bk = K3D.mesh(new T.ConeGeometry(0.07, 0.15, 8).rotateZ(Math.PI / 2), K3D.toon('#ff8a2a'), { ink: false }); bk.position.set(-0.4, 0.36, 0); g.add(bk);
    return g;
  }
  function weir(K, Bu, W, d) {
    const s = A.weir0, f = R.at(s), w = PR.w(s), g = new T.Group(), p = R.local(s, 0, 0, f);
    g.position.set(...p); g.lookAt(p[0] - f.t[0], p[1], p[2] - f.t[2]); K.add(g);
    // the stone sill across the channel (the water pours over it) and two stone piers with lamps
    const sill = K3D.mesh(new T.BoxGeometry(w * 2 + 0.6, 0.5, 0.8), K3D.toon('#ffffff', { map: stoneTex() }), { ink: INK }); sill.position.set(0, -0.4, 0.1); g.add(sill);
    for (const sx of [-1, 1]) { const pier = K3D.mesh(new T.BoxGeometry(1.0, 2.6, 1.6), K3D.toon('#ffffff', { map: stoneTex() }), { ink: INK }); pier.position.set(sx * (w + 0.5), 0.6, 0.3); g.add(pier); const cap = K3D.mesh(new T.ConeGeometry(0.75, 0.6, 4).rotateY(Math.PI / 4), K3D.toon('#7a6a8a'), { ink: INK }); cap.position.set(sx * (w + 0.5), 2.2, 0.3); g.add(cap); }
    g.updateMatrixWorld(true);
    if (Bu) for (const sx of [-1, 1]) { const q = new T.Vector3(sx * (w + 0.5), 2.7, 0.3).applyMatrix4(g.matrixWorld); Bu.add(q.x, q.y, q.z, '#ffd24a', { size: 0.22, blink: true }); PARK.halo(K, q.x, q.y, q.z, 2.4, '#ffd24a', 0.4); if (W) W.reflect(q.x - f.t[0] * 2 - f.r[0] * sx * 1.4, f.p[1], q.z - f.t[2] * 2 - f.r[2] * sx * 1.4, '#ffd24a', 4, 1.0, 0.4); }
    return g;
  }
  function island(K, Bu, W, I) {
    // a lens of grass edged with rocks, a willow, a little bandstand hung with bulbs
    const n = 24, side = [[], []];
    for (let i = 0; i <= n; i++) { const s = I.s0 + (I.s1 - I.s0) * i / n, hw = I.hw * Math.sin(Math.PI * i / n); for (const k of [0, 1]) side[k].push({ s, x: I.x + (k ? hw : -hw) }); }
    const ring = side[1].concat(side[0].slice().reverse());
    const wy = R.at((I.s0 + I.s1) / 2).p[1];
    const shape = new T.Shape(); ring.forEach((q, i) => { const p = CW(q.s, q.x); if (i) shape.lineTo(p[0], -p[2]); else shape.moveTo(p[0], -p[2]); });
    const top = new T.Mesh(new T.ExtrudeGeometry(shape, { depth: 1.4, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.3, bevelSegments: 2 }).rotateX(-Math.PI / 2), K3D.toon('#5f9e6c'));
    top.position.y = wy - 1.0; top.receiveShadow = true; K3D.ink(top, INK, 0.8); K.add(top);
    // rocks round its edge
    const rg = K3D.geo('pf-rock', () => { const g = new T.IcosahedronGeometry(0.5, 1); const a = g.attributes.position; for (let i = 0; i < a.count; i++) { const k = 0.8 + Math.sin(a.getX(i) * 7 + a.getZ(i) * 5) * 0.2; a.setXYZ(i, a.getX(i) * k, a.getY(i) * k * 0.7, a.getZ(i) * k); } g.computeVertexNormals(); return g; });
    const rocks = ring.filter((_, i) => i % 2 === 0);
    const im = new T.InstancedMesh(rg, K3D.toon('#6a6478'), rocks.length);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), pv = new T.Vector3();
    const foam = [];
    rocks.forEach((r, k) => { const p = CW(r.s, r.x); const s = 0.8 + rnd() * 0.8; q.setFromAxisAngle(new T.Vector3(0, 1, 0), rnd() * 6); m4.compose(pv.set(p[0], wy + 0.05, p[2]), q, sc.set(s, s, s)); im.setMatrixAt(k, m4); foam.push({ x: p[0], y: wy, z: p[2], r: s * 0.9 }); });
    K3D.ink(im, INK, 0.6); K.add(im);
    if (W) W.foamAt(foam);
    const mid = CW((I.s0 + I.s1) / 2 - 6, I.x);
    willow(K, Bu, mid[0], mid[2], 1.0, W);
    // the bandstand
    const bs = CW((I.s0 + I.s1) / 2 + 8, I.x), g = new T.Group(); g.position.set(bs[0], wy + 0.45, bs[2]); K.add(g);
    const fl = K3D.mesh(new T.CylinderGeometry(2.0, 2.1, 0.4, 8), K3D.toon('#e8e0d0'), { ink: INK }); g.add(fl);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; const po = K3D.mesh(K3D.geo('pf-bandPost', () => new T.CylinderGeometry(0.07, 0.07, 2.4, 6)), K3D.toon('#f4ecd8'), { ink: INK, inkW: 0.5 }); po.position.set(Math.cos(a) * 1.8, 1.4, Math.sin(a) * 1.8); g.add(po); }
    const rf = K3D.mesh(new T.ConeGeometry(2.5, 1.4, 8), K3D.toon('#ffffff', { map: PARK.stripes('#3f8f6a', '#f4ecd8', 8) }), { ink: INK }); rf.position.y = 3.3; g.add(rf);
    // a wind-up drummer robot playing in it
    const drummer = PARK.robot(K, { col: '#e85a4a' }); K.root.remove(drummer); drummer.position.set(0, 0.2, 0); drummer.userData.broom.visible = false; g.add(drummer);
    const drum = K3D.mesh(new T.CylinderGeometry(0.4, 0.4, 0.45, 16), K3D.toon('#f4ecd8'), { ink: INK }); drum.position.set(0, 0.6, -0.7); g.add(drum);
    g.updateMatrixWorld(true);
    if (Bu) { const c = new T.Vector3(0, 2.6, 0).applyMatrix4(g.matrixWorld); Bu.ring([c.x, c.y, c.z], 2.5, 24, ['#ffe07a', '#ff9ad0', '#9ae0ff'], { speed: 4, size: 0.09 }); }
    return { drummer };
  }
  function waterWheel(K, Bu, W) {
    const o = L.obs.find(q => q.kind === 'wheel'), f = R.at(o.s), p = CW(o.s, o.x), g = new T.Group();
    g.position.set(p[0], p[1], p[2]); g.rotation.y = f.yaw; K.add(g); // the axle lies across the channel (local X)
    const wood = K3D.toon('#ffffff', { map: PARK.wood('#6a4428') }), r = 3.0;
    const wheel = new T.Group(); wheel.position.y = r - 0.6; g.add(wheel); wheel.userData.live = true;
    for (const sx of [-0.55, 0.55]) { const rim = K3D.mesh(new T.TorusGeometry(r, 0.12, 8, 40).rotateY(Math.PI / 2), wood, { ink: INK, inkW: 0.7 }); rim.position.x = sx; wheel.add(rim); }
    for (let i = 0; i < 6; i++) { const sp = K3D.mesh(new T.BoxGeometry(0.12, r * 2, 0.12), wood, { ink: INK, inkW: 0.5 }); sp.rotation.x = i / 6 * Math.PI; wheel.add(sp); }
    // three big paddles (orange tips so they read against the water)
    const pads = [];
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, pd = K3D.mesh(new T.BoxGeometry(2.2, 1.5, 0.14), K3D.toon('#ffffff', { map: PARK.stripes('#ff8a2a', '#f4ecd8', 4, { v: true }) }), { ink: INK, inkW: 0.8 }); pd.position.set(0, -Math.cos(a) * (r - 0.4), Math.sin(a) * (r - 0.4)); pd.rotation.x = a; wheel.add(pd); pads.push(pd); }
    const hub = K3D.mesh(new T.CylinderGeometry(0.35, 0.35, 1.6, 12).rotateZ(Math.PI / 2), K3D.toon('#3a2f3f'), { ink: INK }); wheel.add(hub);
    // the frame on the bank and a little wheelhouse
    const frame = K3D.mesh(new T.BoxGeometry(0.4, r + 0.6, 0.4), wood, { ink: INK }); frame.position.set(1.5, (r - 0.6) / 2, 0); g.add(frame);
    const axle = K3D.mesh(new T.CylinderGeometry(0.12, 0.12, 2.2, 8).rotateZ(Math.PI / 2), K3D.toon('#3a2f3f'), { ink: INK }); axle.position.set(0.8, r - 0.6, 0); g.add(axle);
    const house = K3D.mesh(new T.BoxGeometry(3, 2.6, 3.4), wood, { ink: INK }); house.position.set(3.6, 1.6 - p[1], 0); g.add(house);
    const hr = K3D.mesh(new T.ConeGeometry(2.7, 1.6, 4).rotateY(Math.PI / 4), K3D.toon('#7a2f3a'), { ink: INK }); hr.position.set(3.6, 3.7 - p[1], 0); g.add(hr);
    const win = new T.Mesh(new T.PlaneGeometry(1, 0.8), PARK.flatM('#ffd89a', 1.2)); win.position.set(2.08, 1.8 - p[1], 0); win.rotation.y = -Math.PI / 2; g.add(win);
    g.updateMatrixWorld(true);
    if (Bu) { for (const sx of [-0.55, 0.55]) for (let i = 0; i < 20; i++) { const a = i / 20 * 6.28; const q = new T.Vector3(sx, r - 0.6 + Math.cos(a) * r, Math.sin(a) * r).applyMatrix4(g.matrixWorld); void q; } }
    // the wheel's own bulbs ride on it (an instanced family parented to the wheel)
    const wb = PARK.bulbs(K, 60); wheel.add(wb.mesh); for (const sx of [-0.62, 0.62]) for (let i = 0; i < 24; i++) { const a = i / 24 * 6.28; wb.add(sx, Math.cos(a) * r, Math.sin(a) * r, i % 2 ? '#ffd24a' : '#ff8a5a', { size: 0.07, speed: 3, phase: i * 0.4 }); } wb.done();
    if (W) W.reflect(p[0], p[1], p[2], '#ffb060', 6, 2.0, 0.3);
    return { wheel, o };
  }
  // the water wheel's angle at time t: a paddle passes slowly through the water for o.down seconds of every o.per
  // (when the rules say it is in the water), then the wheel swings on quickly to the next paddle
  function wheelAngle(o, t) {
    const per = o.per, down = o.down, n = Math.floor(t / per), u = t - n * per, third = Math.PI * 2 / 3;
    const slow = 0.6; // radians passed while a paddle is in the water
    const a = u < down ? -slow / 2 + slow * (u / down) : slow / 2 + (third - slow) * sm(0, 1, (u - down) / (per - down));
    return n * third + a;
  }

  /* ---------- the coaster's trestle, with the Comet going over now and then ---------- */
  function trestle(K, Bu, W) {
    const s = PR.art.trestle.s, f = R.at(s), c = R.local(s, 0, 0, f), h = PR.art.trestle.h;
    // the track crosses the river square, running far out across the gardens both ways (a gentle curve)
    const pts = [];
    for (let i = -10; i <= 10; i++) { const d = i * 7; const p = [c[0] + f.r[0] * d + f.t[0] * (d * d * 0.004), h + Math.abs(d) * 0.04 + Math.sin(i * 0.6) * 0.4, c[2] + f.r[2] * d + f.t[2] * (d * d * 0.004)]; pts.push(new T.Vector3(...p)); }
    const curve = new T.CatmullRomCurve3(pts);
    const steel = K3D.toon('#d8d0e8'), wood = K3D.toon('#ffffff', { map: PARK.wood('#7a5a44') });
    for (let i = 0; i <= 140; i++) { const q = curve.getPointAt(i / 140); mark(q.x, q.z, 2.4, true); } // (nothing tall under the track)
    // rails and sleepers
    const N = 240, up = new T.Vector3(0, 1, 0);
    const rails = [[], []];
    for (let i = 0; i <= N; i++) { const u = i / N, p = curve.getPointAt(u), t = curve.getTangentAt(u), r = new T.Vector3().crossVectors(t, up).normalize(); for (const k of [0, 1]) rails[k].push(p.clone().addScaledVector(r, k ? 0.6 : -0.6)); }
    for (const k of [0, 1]) K.add(K3D.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(rails[k]), N, 0.08, 6), steel, { ink: INK, inkW: 0.6 }));
    const sl = new T.InstancedMesh(K3D.geo('pf-sleeper', () => new T.BoxGeometry(1.6, 0.12, 0.26)), K3D.toon('#5a4a6a'), N);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(1, 1, 1);
    for (let i = 0; i < N; i++) { const u = (i + 0.5) / N, p = curve.getPointAt(u), t = curve.getTangentAt(u); q.setFromUnitVectors(new T.Vector3(0, 0, 1), t); m4.compose(p.clone().add(new T.Vector3(0, -0.12, 0)), q, sc); sl.setMatrixAt(i, m4); }
    K3D.ink(sl, INK, 0.5); K.add(sl);
    // the wooden bents: two legs and cross braces every 3.5 units (one instanced family), none in the water
    const legs = [], braces = [];
    for (let i = 0; i <= 40; i++) {
      const u = i / 40, p = curve.getPointAt(u), t = curve.getTangentAt(u), r = new T.Vector3().crossVectors(t, up).normalize();
      const nl = R.toLocal(p.x, 0, p.z, Math.max(0, s - 30), s + 30);
      if (nl && Math.abs(nl.ox) < PR.w(nl.s) + 0.8) continue;
      if (kindAt(p.x, p.z) === 'pave' || kindAt(p.x + r.x * 1.6, p.z + r.z * 1.6) === 'pave' || kindAt(p.x - r.x * 1.6, p.z - r.z * 1.6) === 'pave') continue; // (nor across a walk)
      const gy = groundAt(p.x, p.z);
      for (const sx of [-1, 1]) legs.push({ a: new T.Vector3(p.x + r.x * sx * 1.6, gy, p.z + r.z * sx * 1.6), b: new T.Vector3(p.x + r.x * sx * 0.7, p.y - 0.2, p.z + r.z * sx * 0.7) });
      for (let k = 1; k < 3; k++) braces.push({ a: new T.Vector3(p.x - r.x * 1.4, gy + (p.y - gy) * k / 3, p.z - r.z * 1.4), b: new T.Vector3(p.x + r.x * 1.4, gy + (p.y - gy) * (k + 0.6) / 3, p.z + r.z * 1.4) });
    }
    const all = legs.concat(braces);
    const lim = new T.InstancedMesh(K3D.geo('pf-beam', () => new T.BoxGeometry(0.22, 1, 0.22).translate(0, 0.5, 0)), wood, all.length);
    all.forEach((l, k) => { const d = l.b.clone().sub(l.a), len = d.length(); q.setFromUnitVectors(up, d.normalize()); m4.compose(l.a, q, new T.Vector3(1, len, 1)); lim.setMatrixAt(k, m4); });
    K3D.ink(lim, INK, 0.5); K.add(lim);
    // bulbs along both sides of the track (and their reflections where it crosses the water)
    if (Bu) for (let i = 0; i <= 160; i++) { const u = i / 160, p = curve.getPointAt(u), t = curve.getTangentAt(u), r = new T.Vector3().crossVectors(t, up).normalize(); for (const sx of [-1, 1]) { const b = p.clone().addScaledVector(r, sx * 0.85); Bu.add(b.x, b.y - 0.05, b.z, i % 4 === 0 ? '#ff8ab0' : '#ffe07a', { size: 0.075, speed: 3.5, phase: -i * 0.35 }); } }
    if (W) for (let d = -5; d <= 5; d += 2.5) { const p = R.local(s + d * 0.3, d, 0, f); W.reflect(p[0], p[1], p[2], '#ffe07a', 7, 1.5, 0.25); }
    // the Comet: three empty cars (cream and gold, a star on the nose, bulbs) that roar over every so often
    const train = new T.Group(); train.userData.live = true; K.add(train);
    const cars = [];
    for (let i = 0; i < 3; i++) {
      const car = new T.Group(); train.add(car);
      const tub = K3D.mesh(K3D.roundBox(1.6, 0.6, 2.2, 0.5, 24), K3D.toon('#efe4c8'), { ink: INK, inkW: 1.0 }); tub.position.y = 0.35; car.add(tub);
      const rim = K3D.mesh(new T.BoxGeometry(1.64, 0.1, 2.24), K3D.toon('#e2b04a'), { ink: false }); rim.position.y = 0.66; car.add(rim);
      const seat = K3D.mesh(new T.BoxGeometry(1.3, 0.5, 0.2), K3D.toon('#8a2a4a'), { ink: INK, inkW: 0.5 }); seat.position.set(0, 0.85, 0.6); car.add(seat);
      if (i === 0) { const star = K3D.mesh(new T.OctahedronGeometry(0.45, 0).scale(1, 1, 0.4), K3D.toon('#f2c95a', { emissive: '#7a5410', emissiveIntensity: 0.4 }), { ink: INK }); star.position.set(0, 0.75, -1.25); car.add(star); }
      const bl = PARK.bulbs(K, 16); car.add(bl.mesh); for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) bl.add(sx * 0.82, 0.68, -0.9 + k * 0.45, k % 2 ? '#ff8ab0' : '#ffe07a', { size: 0.05, speed: 5, phase: k }); bl.done();
      cars.push(car);
    }
    return { curve, train, cars };
  }

  /* ---------- the ducks on the water (one instanced family) ---------- */
  function ducks(K) {
    const n = L.ducks.length;
    const body = new T.SphereGeometry(0.3, 12, 8).scale(1.2, 0.8, 1.0).translate(0.05, 0.12, 0);
    const head = new T.SphereGeometry(0.18, 10, 8).translate(-0.24, 0.42, 0);
    const tail = new T.ConeGeometry(0.1, 0.22, 6).rotateZ(-1.0).translate(0.38, 0.25, 0);
    const merged = mergeGeos([body, head, tail]);
    const yel = K3D.toon('#ffd23a', { emissive: '#ffb020', emissiveIntensity: 0.35 });
    const im = new T.InstancedMesh(merged, yel, n); im.frustumCulled = false; K3D.ink(im, '#7a4a10', 0.7); K.add(im);
    const bk = new T.InstancedMesh(new T.ConeGeometry(0.08, 0.18, 6).rotateZ(Math.PI / 2).translate(-0.46, 0.4, 0), K3D.toon('#ff8a2a'), n); bk.frustumCulled = false; K.add(bk);
    const eye = new T.InstancedMesh(new T.SphereGeometry(0.035, 6, 4).translate(-0.33, 0.5, 0.11), K3D.flat('#1a1210'), n * 1); eye.frustumCulled = false; K.add(eye);
    // (a lift's ducks sit up on the trough's rim, to hook with a stroke on that side)
    const pos = L.ducks.map(dk => { const f = R.at(dk.s); return { p: v3(dk.hook ? R.local(dk.s, dk.hook * (PR.w(dk.s) + 0.16), 0.95, f) : R.local(dk.s, dk.x, 0, f)), yaw: f.yaw + Math.PI / 2, big: dk.big }; });
    // a soft gold glow under each (so they read at phone size, and on dark water)
    const halo = new T.InstancedMesh(new T.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: PARK.glowTex(), color: hot('#ffc040', 0.5), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }), n);
    halo.frustumCulled = false; halo.renderOrder = 2; K.add(halo);
    return { im, bk, eye, halo, pos };
  }
  function mergeGeos(list) {
    // merge non-indexed copies of simple geometries (position + normal) into one
    const pos = [], nor = [];
    for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; g.computeVertexNormals(); pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); return g;
  }

  /* ---------- on the water: floating paper lanterns, lily pads; fireflies over the banks ---------- */
  function floaters(K, s0, s1) {
    // lily pads near the banks (flat, notched), some with a pink flower; paper lanterns drifting down the middle
    const pads = [], flowers = [];
    for (let s = s0; s < s1; s += 1.1) {
      if (L.arches.some(a => Math.abs(a - s) < 6) || Math.abs(s - A.weir0) < 8 || L.obs.some(o => Math.abs(o.s - s) < 4 && !o.move)) continue;
      const w = PR.w(s);
      for (const side of [-1, 1]) { if (rnd() < 0.55) continue; const x = side * (w - 0.4 - rnd() * 1.4), sp = s + rnd(); const p = CW(sp, x); pads.push({ p, s: sp, r: 0.35 + rnd() * 0.35, a: rnd() * 6 }); if (rnd() < 0.3) flowers.push({ p, s: sp, a: rnd() * 6 }); }
    }
    const pg = new T.CircleGeometry(1, 16, 0.3, Math.PI * 2 - 0.6).rotateX(-Math.PI / 2);
    const pim = new T.InstancedMesh(pg, K3D.toon('#3f8a4a'), pads.length);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), pv = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    pads.forEach((pd, k) => { q.setFromAxisAngle(up, pd.a); m4.compose(pv.set(pd.p[0], pd.p[1] + 0.03, pd.p[2]), q, sc.set(pd.r, 1, pd.r)); pim.setMatrixAt(k, m4); });
    pim.castShadow = false; K3D.ink(pim, '#123020', 0.4); K.add(pim);
    const fg = new T.ConeGeometry(0.16, 0.2, 7, 1, true).rotateX(Math.PI).translate(0, 0.12, 0);
    const fim = new T.InstancedMesh(fg, K3D.toon('#ff9ad0', { emissive: '#ff6ab0', emissiveIntensity: 0.5, side: T.DoubleSide }), Math.max(1, flowers.length));
    flowers.forEach((fl, k) => { q.setFromAxisAngle(up, fl.a); m4.compose(pv.set(fl.p[0], fl.p[1] + 0.05, fl.p[2]), q, sc.set(1, 1, 1)); fim.setMatrixAt(k, m4); });
    fim.count = flowers.length; K.add(fim);
    // floating paper lanterns: glowing, drifting downstream with the current, bobbing (wrap round within s0..s1)
    const nL = 70, lan = [];
    for (let i = 0; i < nL; i++) lan.push({ s: s0 + rnd() * (s1 - s0), x: (rnd() - 0.5) * 1.6, col: ['#ff7a5a', '#ffd24a', '#ff9ad6', '#9affc0', '#ffb050'][i % 5], ph: rnd() * 6 });
    const lg = new T.CylinderGeometry(0.16, 0.2, 0.32, 8).translate(0, 0.22, 0);
    const lmat = new T.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
    const lim = new T.InstancedMesh(lg, lmat, nL); lim.frustumCulled = false;
    const col = new T.Color(); lan.forEach((l, k) => lim.setColorAt(k, col.set(l.col).multiplyScalar(2.2)));
    K.add(lim);
    const base = new T.InstancedMesh(new T.CylinderGeometry(0.24, 0.24, 0.05, 8), K3D.toon('#3a2a24'), nL); base.frustumCulled = false; K.add(base);
    // fireflies: little green-gold points over the banks that drift and blink
    const nF = 500, fpos = new Float32Array(nF * 3), fph = new Float32Array(nF);
    for (let i = 0; i < nF; i++) { const s = s0 + rnd() * (s1 - s0), side = rnd() < 0.5 ? -1 : 1, x = side * (PR.w(s) + rnd() * 9 - 2); const p = CW(s, x, 0.5 + rnd() * 2.2); fpos[i * 3] = p[0]; fpos[i * 3 + 1] = Math.max(p[1], groundAt(p[0], p[2]) + 0.4); fpos[i * 3 + 2] = p[2]; fph[i] = rnd() * 6.28; }
    const fgg = new T.BufferGeometry(); fgg.setAttribute('position', new T.BufferAttribute(fpos, 3)); fgg.setAttribute('aPh', new T.BufferAttribute(fph, 1));
    const fmat = new T.ShaderMaterial({ uniforms: { uT: { value: 0 }, uPx: { value: 1 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'attribute float aPh; uniform float uT, uPx; varying float vA; void main() { vec3 p = position + vec3(sin(uT * 0.7 + aPh * 3.0), sin(uT * 0.9 + aPh) * 0.4, cos(uT * 0.6 + aPh * 2.0)) * 0.6; vA = smoothstep(0.2, 1.0, sin(uT * (1.2 + fract(aPh) ) + aPh * 5.0)); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = max(1.5, 26.0 * uPx / -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.4, 1.8, 0.6) * smoothstep(0.5, 0.0, d) * vA, 1.0); }' });
    const ff = new T.Points(fgg, fmat); ff.frustumCulled = false; K.add(ff);
    K.tick(dt => { fmat.uniforms.uT.value += dt; fmat.uniforms.uPx.value = K3D.R.domElement.height / 720; });
    return { lan, lim, base, s0, s1, pads, flowers, pim, fim };
  }

  /* ---------- the park round the river ---------- */
  function park(K, Bu, W) {
    const rides = PR.art.rides.map(r => { const o = Object.assign({}, r); const rd = PARK.ride(K, Bu, r.k, o); return rd; });
    // the big wheel's sweep is taken air (nothing tall under it)
    for (const r of PR.art.rides) if (r.k === 'wheel') { const c = Math.cos(r.yaw || 0), sn = Math.sin(r.yaw || 0); for (let d = -r.r; d <= r.r; d += 2) { mark(r.x + c * d, r.z - sn * d, 3.4, true); mark(r.x + c * d, r.z - sn * d, 2.6); } }
    // lamps along both banks on the towpath (each reflected), with strings of paper lanterns across the water from
    // lamp top to lamp top; a lamp steps along a little if something already stands on its spot
    const lamps = [];
    for (let s = A.start + 4, k = 0; s < S1_END; s += 9, k++) {
      if (L.arches.some(a => Math.abs(a - s) < 5) || Math.abs(s - A.bridge) < 5 || Math.abs(s - A.weir0) < 4 || Math.abs(s - PR.art.trestle.s) < 6) continue;
      const isl = PARKFLUME.islandAt(s), pair = [];
      for (const side of [-1, 1]) {
        for (const ds of [0, 1.5, -1.5, 3, -3]) {
          const sl = s + (side > 0 ? 4.5 : 0) + ds, w = PR.w(sl), p = R.local(sl, side * (w + 1.9), 0), gy = groundAt(p[0], p[2]);
          if (!claim(p[0], p[2], 0.7)) continue;
          PARK.lamp(K, Bu, { x: p[0], z: p[2], h: 8.5, moths: k % 3 === 0 });
          const rp = R.local(sl, side * (w - 0.6), 0);
          if (W) W.reflect(rp[0], rp[1], rp[2], '#fff0c0', 5.5, 1.2, 0.45);
          lamps.push({ s: sl, side, p: [p[0], gy, p[2]] }); pair.push([p[0], gy + 8.2, p[2], sl, side * (w + 1.9)]);
          break;
        }
      }
      // a string of lanterns across (every other pair), sagging over the water
      if (k % 2 === 0 && !isl && pair.length === 2) {
        const [a, b] = pair;
        PARK.lanterns(K, Bu, a.slice(0, 3), b.slice(0, 3), { sag: 1.0, c: k });
        if (W) for (let i = 1; i < 6; i++) { const u = i / 6, rp = R.local(a[3] + (b[3] - a[3]) * u, a[4] + (b[4] - a[4]) * u, 0); W.reflect(rp[0], rp[1], rp[2], ['#ff6a5a', '#ffd24a', '#7ae0a0', '#ff9ad6', '#ffb050'][(i + k) % 5], 3.5, 0.6, 0.35); }
      }
    }
    // willows on both banks, leaning over the water: each in a kerbed bed of its own at the towpath's edge, clear of
    // the lamps and everything else
    for (let s = A.start + 10; s < S1_END; s += 13 + rnd() * 6) {
      if (L.arches.some(a => Math.abs(a - s) < 6) || Math.abs(s - A.bridge) < 6 || Math.abs(s - PR.art.trestle.s) < 7) continue;
      const first = rnd() < 0.5 ? -1 : 1, sc = 0.9 + rnd() * 0.35;
      done: for (const side of [first, -first]) for (const ds of [0, 2.5, -2.5]) {
        const w = PR.w(s + ds), p = R.local(s + ds, side * (w + 4.7 + rnd() * 1.2), 0);
        if (!claim(p[0], p[2], 2.0 * sc, true)) continue;
        planter(K, p[0], groundAt(p[0], p[2]), p[2], 1.75 * sc);
        willow(K, Bu, p[0], p[2], sc, W);
        break done;
      }
    }
    return { rides, lamps };
  }
  /* ---------- the gardens beyond ----------
     Laid out on purpose, in this order:
       1. each ride's plaza gets a ring of lamps and benches facing the ride;
       2. the cobbled walks get lamps at even steps, and along their edges rows of game stalls, ticket booths, carts
          (with balloons), and benches with bins, all facing the walk;
       3. the towpath beside the water gets the same, facing the water;
       4. the lawns between get trees (each group inside its own flower-bordered lawn), flower beds, hedge animals
          and tents, only where the patch is lawn all over.
     Everything asks for its patch first (claim), so nothing overlaps; nothing tall goes under the coaster. */
  function gardens(K, Bu) {
    const FL = PARK.flowers(K, 16000);
    // the channel (and its kerbs, walls and trestles) is taken; the towpath's outer edge is left for the furniture
    for (let s = 0; s < R.len; s += 1) { const p = R.at(s).p, k = PR.kind(s); mark(p[0], p[2], k === 'mill' ? Math.max(PR.w(s) + 3.2, 7.2) + 2.5 : k === 'tower' ? PR.w(s) + 5.5 : k === 'garden' ? PR.w(s) + 2.6 : PR.w(s) + 3.3); }
    for (const q of PLAZAS) if (q[3]) mark(q[0], q[1], q[2] - 2.2);
    scan(K);
    const flat = (x, z) => Math.abs(groundAt(x, z)) <= 0.05 && x >= -112;
    const face = (fx, fz) => Math.atan2(fx, fz);
    // 1. the plazas
    for (const q of PLAZAS) {
      if (!q[3]) continue;
      const n = Math.max(6, Math.round(q[2] / 1.6)), rr = q[2] - 0.9;
      for (let i = 0; i < n * 2; i++) {
        const a = i / (n * 2) * 6.283 + 0.26, x = q[0] + Math.cos(a) * rr, z = q[1] + Math.sin(a) * rr;
        // (not where a walk comes in)
        if (kindAt(q[0] + Math.cos(a) * (q[2] + 1.6), q[1] + Math.sin(a) * (q[2] + 1.6)) === 'pave' || !flat(x, z)) continue;
        if (i % 2 === 0) { if (claim(x, z, 0.6, true)) PARK.lamp(K, Bu, { x, z, moths: i % 4 === 0 }); }
        else if (claim(x, z, 1.25)) PARK.bench(K, x, z, face(-Math.cos(a), -Math.sin(a)));
      }
    }
    // furniture along one edge of a way: at(u) gives the way's middle and direction there (or null where it is not
    // there), edge the distance from the middle to its edge; things stand just off the edge and face the way
    const furnish = (U, at, edge, o) => {
      for (const side of [-1, 1]) {
        const spot = (u, d) => { const c = at(u); if (!c) return null; const e = edge(u) + d, nx = c[3] * side, nz = -c[2] * side; return { x: c[0] + nx * e, z: c[1] + nz * e, yaw: face(-nx, -nz), tx: c[2], tz: c[3] }; };
        if (o.lamps) for (let u = side > 0 ? o.lamps / 2 : 0; u < U; u += o.lamps) { const q = spot(u + 1, 0.45); if (q && flat(q.x, q.z) && kindAt(q.x, q.z) === 'grass' && claim(q.x, q.z, 0.6, true)) PARK.lamp(K, Bu, { x: q.x, z: q.z, moths: rnd() < 0.3 }); }
        let u = 2 + rnd() * 5;
        while (u < U) {
          const r = rnd();
          let adv = 3;
          if (r < 0.16) adv = 5 + rnd() * 8; // a stretch of open lawn
          else if (r < 0.42) {
            // a row of one to three game stalls, shoulder to shoulder
            const n = 1 + Math.floor(rnd() * 3); let k = 0;
            for (; k < n; k++) {
              const q = spot(u + 3.3 + k * 6.7, 3.25), fr = spot(u + 3.3 + k * 6.7, 2.6);
              if (!q || !flat(q.x, q.z) || !grassy(q.x, q.z, 1.9) || !claim(fr.x, fr.z, 3.15, true)) break;
              PARK.stall(K, Bu, { x: q.x, z: q.z, yaw: q.yaw, c: Math.floor(rnd() * 9) });
            }
            adv = k ? k * 6.7 + 1.5 : 3;
          } else if (r < 0.72) {
            // a bench, often with a bin at its end
            const q = spot(u + 1.3, 0.75);
            if (q && flat(q.x, q.z) && kindAt(q.x, q.z) === 'grass' && claim(q.x, q.z, 1.25)) {
              PARK.bench(K, q.x, q.z, q.yaw);
              if (rnd() < 0.6) { const bx = q.x + q.tx * 2.1, bz = q.z + q.tz * 2.1; if (claim(bx, bz, 0.45)) PARK.bin(K, bx, bz); }
              adv = 5;
            }
          } else if (r < 0.90) {
            // a popcorn or candy-floss cart, often with a bunch of balloons tied beside it
            const q = spot(u + 1.3, 0.95);
            if (q && flat(q.x, q.z) && kindAt(q.x, q.z) === 'grass' && claim(q.x, q.z, 1.3)) {
              PARK.cart(K, Bu, rnd() < 0.5 ? 'popcorn' : 'floss', { x: q.x, z: q.z, yaw: q.yaw });
              if (rnd() < 0.7) { const bx = q.x + q.tx * 2.3, bz = q.z + q.tz * 2.3; if (claim(bx, bz, 0.6, true)) PARK.balloons(K, bx, 0, bz, 4 + Math.floor(rnd() * 4)); }
              adv = 5.5;
            }
          } else {
            // a ticket booth
            const q = spot(u + 1.8, 1.75);
            if (q && flat(q.x, q.z) && grassy(q.x, q.z, 1.3) && claim(q.x, q.z, 1.75, true)) { PARK.booth(K, Bu, { x: q.x, z: q.z, yaw: q.yaw }); adv = 5; }
          }
          u += adv;
        }
      }
    };
    // 2. the cobbled walks
    for (const line of lay().lines) furnish(line.length - 1, u => { const c = line[Math.max(0, Math.min(line.length - 1, Math.round(u)))]; return kindAt(c[0], c[1]) === 'pave' ? c : null; }, () => HW, { lamps: 13 });
    // 3. the towpath (the garden stretch: the bank's own lamps already stand along it)
    furnish(A.jungle, s => { if (PR.kind(s) !== 'garden' || PARKFLUME.islandAt(s)) return null; const f = R.at(s), h = Math.hypot(f.t[0], f.t[2]) || 1; return [f.p[0], f.p[2], f.t[0] / h, f.t[2] / h]; }, s => PR.w(s) + 3.2, {});
    // 4. the lawns
    const kinds = [['trees', 64], ['bed', 13], ['hedge', 5], ['tent', 7], ['lamp', 6]];
    const tot = kinds.reduce((a, k) => a + k[1], 0);
    const pick = () => { let x = rnd() * tot; for (const [k, w] of kinds) { x -= w; if (x < 0) return k; } return 'trees'; };
    const place = (k, x, z, yaw, small) => {
      if (!flat(x, z)) return false;
      if (k === 'trees') {
        // one to three trees inside a flower-bordered lawn of their own
        const n = small ? 1 : 1 + Math.floor(rnd() * 3), rx = (small ? 2.2 : 3.0) + n * 0.7 + rnd() * 1.4, rz = 2.6 + rnd() * 1.6, a = rnd() * 3, r = (rx + rz) / 2;
        if (!grassy(x, z, rx + 0.4) || !claim(x, z, r, true)) return false;
        FL.lawn(x, z, rx, rz, a);
        const ca = Math.cos(a), sa = Math.sin(a);
        for (let i = 0; i < n; i++) { const lx = n === 1 ? 0 : (i - (n - 1) / 2) * rx * 0.62, lz = n === 3 && i === 1 ? rz * 0.3 : n === 3 ? -rz * 0.15 : 0; PARK.tree(K, x + lx * ca + lz * sa, z - lx * sa + lz * ca, 1.0 + rnd() * 0.7, Bu); }
      } else if (k === 'bed') {
        // a round flower bed, a bench beside it looking at the flowers
        const r = 1.2 + rnd() * 1.0; if (!grassy(x, z, r + 0.5) || !clear(x, z, r + 2.2)) return false; mark(x, z, r + 0.4); // (beds keep apart)
        FL.bed(x, z, r);
        const bx = x + Math.sin(yaw) * (r + 1.6), bz = z + Math.cos(yaw) * (r + 1.6);
        if (kindAt(bx, bz) === 'grass' && claim(bx, bz, 1.25)) PARK.bench(K, bx, bz, yaw + Math.PI);
      } else if (k === 'hedge') {
        // a clipped hedge animal with a small flower bed at its feet
        if (!grassy(x, z, 2.6) || !claim(x, z, 2.4, true)) return false;
        PARK.hedgeAnimal(K, x, z, ['rabbit', 'elephant', 'other'][Math.floor(rnd() * 3)], yaw);
        const bx = x + Math.sin(yaw) * 3.6, bz = z + Math.cos(yaw) * 3.6;
        if (grassy(bx, bz, 1.4) && claim(bx, bz, 1.3)) FL.bed(bx, bz, 1.0);
      } else if (k === 'tent') {
        const r = 4 + rnd() * 2.5; if (!grassy(x, z, r + 1.5) || !claim(x, z, r + 1.5, true)) return false;
        PARK.tent(K, Bu, { x, z, r, h: 5 + rnd() * 2, cols: [['#c83a4a', '#f4e8d0'], ['#3f8f6a', '#f4e8d0'], ['#5d4bb0', '#f2d06a'], ['#d860a8', '#f4e8d0']][Math.floor(rnd() * 4)], yaw });
      } else {
        // a lamp out on the lawn (beyond the height field, where no walks run)
        if (x >= FX0 && x <= FX1 && z >= FZ0 && z <= FZ1) return false;
        if (!claim(x, z, 0.8, true)) return false; PARK.lamp(K, Bu, { x, z, moths: rnd() < 0.3 });
      }
      return true;
    };
    for (const [d0, d1, st] of [[4.5, 9, 2.4], [9, 14, 2.8], [14, 22, 3.2], [22, 34, 3.6], [34, 50, 4.2], [50, 75, 5.5], [75, 115, 7.5]]) {
      for (let s = 0; s < R.len; s += st * (0.7 + rnd() * 0.6)) {
        const f = R.at(s), w = PR.w(s);
        for (const side of [-1, 1]) {
          const h = Math.hypot(f.t[0], f.t[2]) || 1, rx = -f.t[2] / h * side, rz = f.t[0] / h * side, d = w + d0 + rnd() * (d1 - d0);
          const x = f.p[0] + rx * d, z = f.p[2] + rz * d;
          for (let t = 0; t < 4 && !place(t < 2 ? pick() : 'trees', x, z, Math.atan2(-rx, -rz), t === 3); t++);
        }
      }
    }
    FL.done();
  }

  /* ---------- loudspeakers ---------- */
  function horns(K) {
    return L.says.map(sy => {
      // (on its own clear spot at the towpath's edge: it steps along if something stands there)
      let p = null;
      for (const ds of [0, 2, -2, 4, -4, 6]) { const s = Math.min(R.len - 1, sy.s + 8 + ds), q = R.local(s, -(PR.w(s) + 2.6), 0); p = q; if (claim(q[0], q[2], 0.5)) break; }
      const gy = groundAt(p[0], p[2]), g = new T.Group(); g.position.set(p[0], gy, p[2]);
      const pole = K3D.mesh(new T.CylinderGeometry(0.08, 0.1, 5.5, 8), PARK.toonM('#2a2438')); pole.position.y = 2.75; g.add(pole);
      for (const a of [0, 2.1, 4.2]) { const horn = K3D.mesh(K3D.geo('pf-horn', () => new T.ConeGeometry(0.4, 0.9, 12, 1, true).rotateX(-Math.PI / 2)), PARK.toonM('#d8d0e8', { side: T.DoubleSide })); horn.position.set(Math.sin(a) * 0.3, 5.2, Math.cos(a) * 0.3); horn.rotation.y = a; horn.rotation.x = 0.25; g.add(horn); }
      K.add(g); return [p[0], gy + 5.9, p[2]];
    });
  }

  /* ---------- every still glow sprite (lamp halos, bulbs' glows) drawn as one batch, looking exactly the same ---------- */
  function batchHalos(K) {
    const glow = PARK.glowTex(), list = [];
    const liveUnder = o => { for (let q = o; q; q = q.parent) if (q.userData.live) return true; return false; };
    K.root.traverse(o => { if (o.isSprite && o.material.map === glow && o.material.blending === T.AdditiveBlending && !liveUnder(o)) list.push(o); });
    if (!list.length) return;
    const n = list.length, im = new T.InstancedMesh(new T.PlaneGeometry(1, 1), null, n), aCol = new Float32Array(n * 4), m4 = new T.Matrix4(), p = new T.Vector3(), q = new T.Quaternion(), sc = new T.Vector3();
    list.forEach((o, k) => {
      o.updateWorldMatrix(true, false); o.matrixWorld.decompose(p, q, sc);
      m4.compose(p, new T.Quaternion(), sc.set(sc.x, sc.y, 1)); im.setMatrixAt(k, m4);
      const c = o.material.color; aCol[k * 4] = c.r; aCol[k * 4 + 1] = c.g; aCol[k * 4 + 2] = c.b; aCol[k * 4 + 3] = o.material.opacity;
      o.parent.remove(o);
    });
    im.geometry.setAttribute('aCol', new T.InstancedBufferAttribute(aCol, 4));
    const fog = K.scene.fog;
    im.material = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
      uniforms: { map: { value: glow }, uFog: { value: fog ? fog.color : new T.Color(0) }, uFogD: { value: fog && fog.density ? fog.density : 0 } },
      vertexShader: `attribute vec4 aCol; varying vec4 vC; varying vec2 vUv; varying float vF; uniform float uFogD;
        void main() { vC = aCol; vUv = uv; vec3 c = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; vec2 sz = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
          vec4 mv = modelViewMatrix * vec4(c, 1.0); mv.xy += position.xy * sz; float d = -mv.z; vF = 1.0 - exp(-uFogD * uFogD * d * d); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; uniform vec3 uFog; varying vec4 vC; varying vec2 vUv; varying float vF;
        void main() { vec4 t = texture2D(map, vUv); vec3 col = mix(vC.rgb * t.rgb, uFog, vF); gl_FragColor = vec4(col, t.a * vC.a); }` });
    im.frustumCulled = false; im.userData.live = true; K.add(im);
  }

  /* ---------- many small moving things of one shape (moths round the lamps, balloons on their strings) drawn as one
     batch each: the kit's own tickers still move each one; every frame their places are copied into the batch ---------- */
  function batchMovers(K) {
    const groups = new Map();
    for (const o of K.root.children) {
      if (!o.isMesh || o.isInstancedMesh || !o.userData.live || o.children.some(c => !c.userData.ink)) continue;
      const m = o.material; if (!m || Array.isArray(m) || !(m.isMeshToonMaterial || m.isMeshBasicMaterial) || m.transparent || m.map) continue;
      const key = o.geometry.uuid + '|' + m.type + '|' + m.side + '|' + (o.children.length ? 'ink' : '');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(o);
    }
    const batches = [];
    for (const list of groups.values()) {
      if (list.length < 6) continue;
      const m0 = list[0].material, mat = m0.clone(); mat.color = new T.Color('#ffffff');
      if (mat.emissive) { mat.emissive = new T.Color('#000000'); mat.emissiveIntensity = 0; }
      const im = new T.InstancedMesh(list[0].geometry, mat, list.length), c = new T.Color();
      list.forEach((o, k) => { const em = o.material.emissive && o.material.emissiveIntensity ? 1 + o.material.emissiveIntensity * 0.8 : 1; im.setColorAt(k, c.copy(o.material.color).multiplyScalar(em)); K.root.remove(o); });
      im.instanceColor.needsUpdate = true; im.frustumCulled = false; im.castShadow = list[0].castShadow; im.userData.live = true;
      if (list[0].children.length) K3D.ink(im, INK, 0.7);
      K.add(im); batches.push({ im, list });
    }
    const zero = new T.Matrix4().makeScale(0, 0, 0);
    K.tick(() => { for (const b of batches) { b.list.forEach((o, k) => { if (o.visible) { o.updateMatrix(); b.im.setMatrixAt(k, o.matrix); } else b.im.setMatrixAt(k, zero); }); b.im.instanceMatrix.needsUpdate = true; } });
  }

  // the park's wind-up robots (dozens of them, each a dozen parts that turn: key, head, broom) drawn part by part as
  // one batch per part: the robots stay in the scene as they are, only hidden, and each frame every part's place is
  // copied into its batch
  function batchRobots(K) {
    const robots = []; K.root.traverse(o => { if (o.userData.key && o.userData.broom && o.userData.head) robots.push(o); });
    const groups = new Map();
    for (const r of robots) r.traverse(o => {
      if (!o.isMesh || o.userData.ink || o.isInstancedMesh) return;
      const m = o.material; if (Array.isArray(m) || m.transparent || m.map || !(m.isMeshToonMaterial || m.isMeshBasicMaterial)) return;
      const key = o.geometry.uuid + '|' + m.type + '|' + (o.children.length ? 'ink' : '');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ o, r });
    });
    const batches = [];
    for (const list of groups.values()) {
      const m0 = list[0].o.material, mat = m0.clone(); mat.color = new T.Color('#ffffff');
      const im = new T.InstancedMesh(list[0].o.geometry, mat, list.length), c = new T.Color();
      list.forEach((it, k) => { im.setColorAt(k, c.copy(it.o.material.color)); it.o.visible = false; });
      im.instanceColor.needsUpdate = true; im.frustumCulled = false; im.castShadow = true; im.userData.live = true;
      if (list[0].o.children.length) K3D.ink(im, INK, 0.7);
      K.add(im); batches.push({ im, list });
    }
    const zero = new T.Matrix4().makeScale(0, 0, 0);
    // (shown when the part, its robot and everything above them are shown; a part's own flag is ours now)
    const shown = it => { if (!it.r.parent) return false; for (let q = it.o.parent; q; q = q.parent) if (!q.visible) return false; return true; };
    K.tick(() => {
      for (const r of robots) r.updateMatrixWorld(true);
      for (const b of batches) { b.list.forEach((it, k) => b.im.setMatrixAt(k, shown(it) ? it.o.matrixWorld : zero)); b.im.instanceMatrix.needsUpdate = true; }
    });
  }

  /* ---------- build ---------- */
  function build(K, st) {
    PARK.seed(); rnd = PARK.rnd; PARK.resetGlints(); OCC = { lo: new Set(), hi: new Set(), seen: new WeakSet() };
    const night = PARK.night(K, { moon: PR.art.moon, fogD: 0.0042, bloom: 0.95 });
    if (K.hemi) K.hemi.intensity *= 1.25; // moonlit lawns: the banks read beyond the lamp pools
    const B = PARK.bulbs(K, 20000);
    const sc = { K, B, night };
    sc.ground = ground(K);
    // (the same questions the park kit's own ground answers, for this level's ground)
    K.groundAt = kindAt; K.groundAll = (x, z, r, kind) => { if (kindAt(x, z) !== kind) return false; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; if (kindAt(x + Math.cos(a) * r, z + Math.sin(a) * r) !== kind) return false; } return true; };
    // the water: the whole channel; garden stretch calm and deep blue
    const rapids = L.drops.filter(d => d.kind === 'rapid');
    sc.water = PARK.water(K, { R, w: PR.w, over: 0.7,
      // (still on the lifts' belts and round the whirlpool's painted funnel)
      calm: s => (PARKFLUME.liftAt(s) || PARKFLUME.liftAt(s + 1.5) ? 0.12 : L.whirls.some(wl => Math.abs(s - wl.s) < wl.r + 2.5) ? 0.2 : 1),
      steep: s => (Math.abs(s - A.weir0 - 1) < 2.5 || Math.abs(s - A.weirJump - 1) < 2.5 ? 1 : 0) + (s > A.brink && s < A.splash + 6 ? 0.8 : 0) + (s > A.brink1 && s < A.splash1 + 4 ? 0.8 : 0)
      + (rapids.some(d => s > d.s0 - 0.5 && s < d.s1 + 1.5) ? 0.7 : 0) + (s > A.rapids0 && s < A.rapids1 + 6 ? 0.25 : 0) + (Math.abs(s - A.whirl) < 6 ? 0.2 : 0) });
    const W = sc.water;
    // the stone kerbs of the gardens, the mill pond and the lagoon (the jungle's rock, the troughs and the mill's
    // walkways are the stretches 2 to 4 scenery's own)
    for (let i = 0; i < PR.kinds.length; i++) { const [a, k] = PR.kinds[i], b = i + 1 < PR.kinds.length ? PR.kinds[i + 1][0] : R.len; if (k === 'garden' || k === 'pond' || k === 'lagoon') banks(K, B, W, a, b); }
    sc.dock = dock(K, B, W, 2.5);
    sc.arches = L.arches.map(s => arch(K, B, W, s));
    for (const sg of L.signs) sign(K, B, sg.s, sg.side, sg.kind);
    sc.swans = L.obs.filter(o => o.kind === 'swan').map(o => ({ o, g: swanBoat(K, B) }));
    sc.fountain = fountain(K, B, W);
    sc.bridge = footbridge(K, B, W);
    sc.weir = weir(K, B, W);
    sc.island = island(K, B, W, L.islands[0]);
    sc.wheel = waterWheel(K, B, W);
    sc.trestle = trestle(K, B, W);
    scan(K); // (everything built so far is taken ground; from here on, what is scattered asks first)
    sc.park = park(K, B, W);
    sc.horns = horns(K);
    sc.s2 = PARKFLUME_SCENE2.build(K, sc, { groundAt, stoneTex, nearest: sc.ground.nearest, INK, claim, clear, mark, kindAt, scan: () => scan(K) });
    gardens(K, B);
    strandsDone(K);
    sc.fl = [floaters(K, 0, S1_END), floaters(K, A.jungle - 6, A.lift1Foot - 4), floaters(K, A.splash + 10, A.ring - 2)];
    sc.dk = ducks(K);
    sc.log = PARKFLUME_LOG.build(K, W);
    sc.fw = PARK.fireworks(K);
    // gulls asleep on the dock's roof
    const dp = R.local(2.5, 0, 0);
    sc.gulls = PARK.gulls(K, [[dp[0] - 3, 6.4, dp[2] - 2], [dp[0] + 2, 6.4, dp[2] + 1], [dp[0] - 6, 6.0, dp[2] + 3]]);
    batchHalos(K);
    // batch everything that never moves (the moving parts are marked live)
    K3D.bake(K.root);
    batchMovers(K);
    batchRobots(K);
    K.pf = sc;
    sc.cam = K3D.cams.ride({ fov: 54, k: 4 });
    sc.cam.snap();
    return sc;
  }

  /* ---------- every frame ---------- */
  const RM = () => !!(typeof reduceMotion !== 'undefined' && reduceMotion) || !!K3D.reduce;
  // the play camera: behind and above the log, looking down the channel's middle (it turns with the channel, never
  // with the log's nose); it leans a little toward the log's side so the whole log stays framed
  function shotFor(st) {
    const s = Math.max(1, st.s), w = PR.w(s), f = R.at(s);
    const wide = sm(5.5, 10, w);
    const o = { back: 8.4 + wide * 3, height: 4.6 + wide * 2.2, ahead: 13 + wide * 4, roll: 0 };
    // ducking under the arches and the footbridge: the eye drops as it passes beneath them
    let duck = 0; for (const a of [...L.arches, A.bridge]) duck = Math.max(duck, 1 - sm(3, 8, Math.abs(s - o.back - a)));
    o.height -= duck * 2.1;
    // and rising over the mill's water wheel as it goes by
    for (const ob of L.obs) if (ob.kind === 'wheel') o.height += 2.4 * (1 - sm(3, 8, Math.abs(s - o.back - ob.s)));
    // up a lift: the eye stays level behind the log (not down the slope below it), a little higher; over the top it
    // rises to show the drop below, then tips over with the log and follows it down
    const tops = [[A.lift1Foot, A.lift1Top0, A.brink1, 0.6], [A.liftFoot, A.top0, A.brink, 1]];
    for (const [f0, t0, br, big] of tops) {
      // (not while the eye is ducking under an arch: it must go under it, not through the robot on top)
      const on = sm(f0 - 4, f0 + 2, s) * (1 - sm(br + 1, br + 8, s)) * (1 - duck);
      if (on <= 0) continue;
      o.level = on; o.height += on * (1.4 + big * 1.2); o.back += on * 1.5;
      const crest = sm(t0 - 6, t0, s) * (1 - sm(br - 1, br + 4, s));
      o.height += crest * (2.5 + big * 3); o.back += crest * 2; o.ahead += crest * 10;
    }
    const sh = RAIL3.shot(R, s, o);
    // round an island the camera follows the log down its own arm of the fork
    // round an island the camera goes down the log's own arm of the fork (the middle of that arm where it is over it)
    let lean = st.x * 0.55;
    const isl = PARKFLUME.islandAt(s - o.back) || PARKFLUME.islandAt(s);
    if (isl) { const es = Math.max(1, s - o.back), ih = (PARKFLUME.islandAt(es) || { hw: 0 }).hw, side = st.x < 0 ? -1 : 1; lean = side * Math.max(Math.abs(st.x), ih > 0 ? (ih + PR.w(es)) / 2 : 0); }
    const fe = R.at(Math.max(0, s - o.back));
    for (const k of [0, 2]) { sh.eye[k] += fe.r[k] * lean; sh.at[k] += f.r[k] * st.x * (isl ? 0.8 : 0.3); }
    sh.at[1] = Math.min(sh.at[1], f.p[1] + 0.3);
    sh.fov = 54 + wide * 4;
    return sh;
  }
  function update(K, st, dt) {
    const sc = K.pf; if (!sc) return;
    const t = (sc.t = (sc.t || 0) + dt);
    PARKFLUME_LOG.pose(K, sc.log, st, dt);
    // the dock gate swings open as the boarding ends
    const open = st.phase === 'board' ? sm(PARKFLUME.S.BOARD_T - 2.8, PARKFLUME.S.BOARD_T - 1.4, st.phaseT) : 1;
    for (const h of sc.dock.gate) h.rotation.y = h.userData.sx * open * 1.5;
    // ducks bob and turn; taken ones are gone (a big one is bigger)
    const Wv = sc.water;
    const D = sc.dk, m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sz = new T.Vector3(), pv = new T.Vector3();
    for (let i = 0; i < D.pos.length; i++) {
      const d = D.pos[i], k = st.got[i] ? 0 : d.big ? 2.2 : 1;
      // (each floats on the water under it: lifted by the swell and the rings, tipped by its slopes)
      const dk = L.ducks[i], fl = !dk.hook && k > 0, h = fl ? Wv.hAt(dk.s, d.p.x, d.p.z) : 0;
      const tx = fl ? (Wv.hAt(dk.s, d.p.x + 0.35, d.p.z) - h) / 0.35 : 0, tz = fl ? (Wv.hAt(dk.s, d.p.x, d.p.z + 0.35) - h) / 0.35 : 0;
      e.set(tz * 1.6 + Math.sin(t * 2 + i) * 0.04, d.yaw + Math.sin(t * 0.7 + i) * 0.5, -tx * 1.6 + Math.sin(t * 1.6 + i * 1.3) * 0.04, 'YXZ'); q.setFromEuler(e);
      pv.set(d.p.x, d.p.y + h - 0.04, d.p.z); sz.set(k, k, k);
      m4.compose(pv, q, sz); D.im.setMatrixAt(i, m4); D.bk.setMatrixAt(i, m4); D.eye.setMatrixAt(i, m4);
      q.identity(); pv.y = d.p.y + h + 0.03; sz.set(k * 1.2, 1, k * 1.2); m4.compose(pv, q, sz); D.halo.setMatrixAt(i, m4);
    }
    D.im.instanceMatrix.needsUpdate = D.bk.instanceMatrix.needsUpdate = D.eye.instanceMatrix.needsUpdate = D.halo.instanceMatrix.needsUpdate = true;
    // swans drift (where the rules have them), the water wheel turns, the fishing robots jig their rods
    for (const sw of sc.swans) { const p = PARKFLUME.obsAt(sw.o, st.t), f = R.at(p.s), w = CW(p.s, p.x); const h = Wv.hAt(p.s, w[0], w[2]); sw.g.position.set(w[0], w[1] + h - 0.1, w[2]); sw.g.rotation.set((Wv.hAt(p.s, w[0], w[2] + 0.6) - h) * 0.8, f.yaw + Math.PI + Math.sin(st.t * 0.3 + p.x) * 0.5, -(Wv.hAt(p.s, w[0] + 0.6, w[2]) - h) * 0.8, 'YXZ'); }
    sc.wheel.wheel.rotation.x = -wheelAngle(sc.wheel.o, st.t);
    for (const r of sc.bridge.robots) { r.rod.rotation.z = Math.sin(t * 1.3 + r.z) * 0.08; r.rb.userData.key.rotation.z += dt * 3; if (r.rod.userData.duck) r.rod.userData.duck.position.y = 0.2 + Math.sin(t * 2) * 0.15; }
    sc.island.drummer.userData.head.rotation.x = Math.sin(t * 8) * 0.12; sc.island.drummer.userData.key.rotation.z += dt * 4;
    // the arches' bucket robots tip their bucket over the log as it passes
    for (const a of sc.arches) { const d = st.s - a.s; a.bucket.rotation.z = d > -3 && d < 2 ? -sm(-3, -0.5, d) * 2.0 : 0; a.robot.userData.key.rotation.z += dt * 3; }
    // floating lanterns drift down the river
    for (const F of sc.fl) {
    for (let i = 0; i < F.lan.length; i++) {
      const l = F.lan[i]; l.s += R.at(l.s).v * 0.55 * dt; if (l.s > F.s1) l.s = F.s0 + 2;
      const w = PR.w(l.s), x = Math.max(-w + 0.8, Math.min(w - 0.8, l.x * w));
      const p = CW(l.s, x);
      pv.set(p[0], p[1] + Wv.hAt(l.s, p[0], p[2]), p[2]); q.setFromAxisAngle(new T.Vector3(0, 1, 0), l.ph + t * 0.2); m4.compose(pv, q, sz.set(1, 1, 1));
      F.lim.setMatrixAt(i, m4); F.base.setMatrixAt(i, m4);
    }
    F.lim.instanceMatrix.needsUpdate = F.base.instanceMatrix.needsUpdate = true;
    // the lily pads and their flowers ride the water (only the ones near the log: the rest are too far to tell)
    const up = new T.Vector3(0, 1, 0);
    F.pads.forEach((pd, k) => { if (Math.abs(pd.s - st.s) > 45) return; q.setFromAxisAngle(up, pd.a); m4.compose(pv.set(pd.p[0], pd.p[1] + 0.03 + Wv.hAt(pd.s, pd.p[0], pd.p[2]), pd.p[2]), q, sz.set(pd.r, 1, pd.r)); F.pim.setMatrixAt(k, m4); });
    F.flowers.forEach((fw, k) => { if (Math.abs(fw.s - st.s) > 45) return; q.setFromAxisAngle(up, fw.a); m4.compose(pv.set(fw.p[0], fw.p[1] + 0.05 + Wv.hAt(fw.s, fw.p[0], fw.p[2]), fw.p[2]), q, sz.set(1, 1, 1)); F.fim.setMatrixAt(k, m4); });
    F.pim.instanceMatrix.needsUpdate = F.fim.instanceMatrix.needsUpdate = true;
    }
    PARKFLUME_SCENE2.update(K, sc, st, dt, t);
    // the Comet roars over the trestle every 14 s
    const Tr = sc.trestle, per = 14, u = ((t + 4) % per) / 5.5;
    Tr.train.visible = u < 1;
    if (u < 1) Tr.cars.forEach((c, i) => { const uu = Math.min(0.999, Math.max(0.001, u - i * 0.018)); const p = Tr.curve.getPointAt(uu), tg = Tr.curve.getTangentAt(uu); c.position.copy(p).add(new T.Vector3(0, 0.0, 0)); c.lookAt(p.clone().sub(tg)); });
    // gulls take off when the log comes by the dock
    sc.gulls.scare(sc.log.g.position.x, sc.log.g.position.z, 6);
    // fireworks on the falls (later) and at the dock at the finish
    sc.fw.auto(st.s > A.lift && st.phase !== 'board');
    if ((st.phase === 'dock' || st.phase === 'done') && !sc.finale) { sc.finale = true; const dp = R.local(A.ring, 0, 0); for (let i = 0; i < 6; i++) setTimeout(() => sc.fw.burst(dp[0] - 10 + i * 4, 26 + (i % 3) * 6, dp[2] - 30, ['#ff5a7a', '#ffd24a', '#7ae8ff', '#9aff8a', '#ff9ad6', '#ffffff'][i]), i * 380); }
    // the camera
    let sh;
    if (PARKFLUME_SCENE.camOverride) sh = Object.assign({ up: [0, 1, 0] }, PARKFLUME_SCENE.camOverride);
    else if (st.phase === 'board') {
      // the boarding: from the jetty beside the log, easing round to the play view as it drifts out
      const base = shotFor(st), lp = sc.log.g.position;
      const be = R.local(Math.max(0, st.s - 4.2), 2.8, 1.9), bd = { eye: be, at: [lp.x, lp.y + 0.7, lp.z] };
      const uu = sm(PARKFLUME.S.BOARD_T - 2.6, PARKFLUME.S.BOARD_T, st.phaseT);
      sh = { eye: bd.eye.map((x, k) => x + (base.eye[k] - x) * uu), at: bd.at.map((x, k) => x + (base.at[k] - x) * uu), up: [0, 1, 0], fov: 48 + 6 * uu };
    } else if (st.phase === 'dock' || st.phase === 'done') { const lp = sc.log.g.position; sh = { eye: [lp.x + 7, lp.y + 4, lp.z + 6], at: [lp.x, lp.y + 0.8, lp.z], up: [0, 1, 0], fov: 46 }; }
    else sh = shotFor(st);
    sc.cam.update(K, dt, null, sh);
    K.focus.copy(sc.log.g.position);
    K.focusRange = 70;
  }

  /* ---------- flat things over the picture ---------- */
  function bubble(txt, x, y, a) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
    const words = txt.split(' '), lines = []; let ln = '';
    for (const w of words) { const t2 = ln ? ln + ' ' + w : w; if (ctx.measureText(t2).width > 270 && ln) { lines.push(ln); ln = w; } else ln = t2; }
    lines.push(ln);
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 34, h = lines.length * 19 + 16;
    x = Math.max(w / 2 + 8, Math.min(W - w / 2 - 60, x)); y = Math.max(h + 50, Math.min(H - 90, y));
    ctx.fillStyle = 'rgba(255,246,220,0.96)'; rr(x - w / 2, y - h, w, h, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(26,21,48,0.6)'; ctx.lineWidth = 1.5; rr(x - w / 2, y - h, w, h, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x, y + 10); ctx.lineTo(x + 8, y); ctx.fill();
    ctx.fillStyle = '#5a4f86'; ctx.beginPath(); ctx.moveTo(x - w / 2 + 9, y - h / 2 - 4); ctx.lineTo(x - w / 2 + 17, y - h / 2 - 9); ctx.lineTo(x - w / 2 + 17, y - h / 2 + 5); ctx.lineTo(x - w / 2 + 9, y - h / 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a2235'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, x - w / 2 + 22, y - h + 16 + i * 19));
    ctx.restore();
  }
  function drawTop(st) {
    const sc = K3D.K && K3D.K.pf;
    if (!sc) return;
    const say = st.says.length && st.says[st.says.length - 1];
    if (say && st.t - say.t < 4.4) {
      const a = Math.min(1, (4.4 - (st.t - say.t)) * 3, (st.t - say.t) * 6);
      let x = W / 2, y = 150;
      const hi = L.says.findIndex(s2 => s2.s === say.s);
      if (hi >= 0 && sc.horns[hi]) { const q = K3D.toScreen(...sc.horns[hi]); if (q.z < 1 && q.x > 0 && q.x < W && q.y > 0 && q.y < H) { x = q.x; y = q.y - 8; } }
      bubble(say.text, x, y, a);
    }
    const last = st.fx.length && st.fx[st.fx.length - 1];
    const word = (txt, col, age, size = 34) => { ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, (1.2 - age) * 3)); text(txt, W / 2, 150 - Math.min(0.3, age) * 30, size, col, 'center'); ctx.restore(); };
    if (last) {
      const age = st.t - last.t;
      if (last.k === 'soak' && age < 1.2) word({ weir: 'Splosh! Soaked!', plunge: 'SPLOOSH! Soaked!', wheel: 'Whack! Soaked!' }[last.why] || 'Soaked!', '#9ae6ff', age);
      if (last.k === 'arch' && age < 1.4) word('Bailed out!', '#ffd24a', age, 28);
      if (last.k === 'pair' && age < 0.6 && st.speed > 0.6) word('Full speed!', '#ffffff', age * 2, 22);
    }
    if (st.phase === 'sink') { ctx.save(); ctx.globalAlpha = Math.min(1, st.phaseT * 3); text(st.phaseT < 2.6 ? 'Glug glug... the log sank!' : 'Here comes the tugboat with a fresh log!', W / 2, 150, 26, '#fff6dc', 'center'); ctx.restore(); }
    // duck sparkles
    for (const fx of st.fx) if (fx.k === 'duck' && st.t - fx.t < 0.6) {
      const p = sc.dk.pos[fx.i].p, q = K3D.toScreen(p.x, p.y + 0.4, p.z); if (q.z > 1) continue;
      const u = (st.t - fx.t) / 0.6;
      ctx.save(); ctx.globalAlpha = 1 - u; ctx.fillStyle = '#ffe27a';
      for (let k = 0; k < 7; k++) { const an = k / 7 * Math.PI * 2 + fx.i; circle(q.x + Math.cos(an) * u * 26, q.y + Math.sin(an) * u * 26 - u * 10, 3 * (1 - u) + 1); ctx.fill(); }
      if (fx.big) text('+5', q.x, q.y - 20 - u * 20, 18, '#ffe27a', 'center');
      ctx.restore();
    }
    // prompts: "Hold on together!" before a drop (and the jump button by each person who is not holding on yet)
    if (st.phase === 'ride') {
      for (const d of L.drops) if (st.s > d.lead - 2 && st.s < d.s1) {
        const a = 0.75 + Math.sin(G.clock * 8) * 0.25; ctx.save(); ctx.globalAlpha = a; text('Hold on together!', W / 2, H - 92, 22, '#ffd24a', 'center'); ctx.restore();
        for (const k of [0, 1]) if (!st.brace[k] && !isCpuPlayer(k)) drawBtn(k, 'hop', k === 0 ? W * 0.3 : W * 0.7, H - 120, { label: 'hold!', alpha: a }); // (3D: jump is Space / Right Shift, 'hop')
        break;
      }
    }
    if (st.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.7, st.flash * 0.7)})`; ctx.fillRect(0, 0, W, H); }
    if (st.phase === 'board' && st.phaseT > 1.2 && st.phaseT < 4.2) { ctx.save(); ctx.globalAlpha = Math.min(1, (st.phaseT - 1.2) * 2, (4.2 - st.phaseT) * 2); text('The gate swings open all by itself...', W / 2, 120, 24, '#fff6dc', 'center'); ctx.restore(); }
  }

  return { build: (K, st) => build(K, st), update, drawTop, camOverride: null, wheelAngle, kindAt };
})();
