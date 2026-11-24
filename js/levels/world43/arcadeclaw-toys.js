/* Pip & Bo - 43-3 Claw Machine Rescue: the prizes. Loaded on demand with the 3D kit (after the arcade kit).

   Every prize is made up (no real toy, brand or character). Each KIND is a list of parts built from a few shared shapes,
   in a 1-unit-tall frame (feet at y = 0, facing +z), with colour SLOTS so one kind comes in many colourways:
     0, 1, 2  the kind's own colours (plush with a fuzzy nap and a soft rim of light, or shiny plastic)
     3 button eyes and noses (dark gloss)   4 white   5 pink   6 the printed tag   7 chrome / metal   8 a stitched seam
     (the main colour, darker)   9 gold or clear plastic   10 clear glass   11 the white catchlight in an eye
   Plush is detailed like the real thing: shiny safety eyes with catchlights, stitched noses and smiles, rosy cheeks, toe
   beans, bows, collars, tags, and seams with a running stitch down every body and head (the plush shader, seamOf).
   ARCADECLAW_TOYS.field(K, cap)   the scenery's heaps: thousands of prizes drawn as one instanced mesh per kind and slot
       f.add(kind, x, y, z, { yaw, tilt, roll, s, pal })   then f.done()
   ARCADECLAW_TOYS.build(kind, o)  one prize as its own group (o = { pal, ink }), e.g. for a creature's camp
   ARCADECLAW_TOYS.big(K, toy)     the toys the claw picks up, modelled at their full size from the map's toy entry, with
       an orange outline (g.userData.hi(on, gold)), and for carriers a ribbon or rim that glows blue (g.userData.handle)
   ARCADECLAW_TOYS.KINDS / .NAMES  the kinds (more than forty).  Scenery only: never read by the rules. */
'use strict';

const ARCADECLAW_TOYS = (function () {
  const T = K3D.T;
  const A = ARCADE;
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const P = Math.PI;

  /* ---------- shapes ---------- */
  const geo = (k, make) => K3D.geo('act|' + k, make);
  const heartGeo = (cs, bs) => { const s = new T.Shape(); s.moveTo(0, -0.9); s.bezierCurveTo(-0.9, -0.2, -1.1, 0.6, -0.5, 0.85); s.bezierCurveTo(-0.2, 0.98, 0, 0.75, 0, 0.55); s.bezierCurveTo(0, 0.75, 0.2, 0.98, 0.5, 0.85); s.bezierCurveTo(1.1, 0.6, 0.9, -0.2, 0, -0.9); return new T.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelSize: 0.16, bevelThickness: 0.16, bevelSegments: bs, curveSegments: cs }).translate(0, 0, -0.25); };
  const SH = {
    S: () => geo('S', () => new T.SphereGeometry(1, 18, 12)),
    H: () => geo('H', () => new T.SphereGeometry(1, 18, 8, 0, P * 2, 0, P / 2)),
    B: () => geo('B', () => new T.BoxGeometry(1, 1, 1)),
    R: () => geo('R', () => K3D.roundBox(1, 1, 1, 0.42, 22).translate(0, -0.5, 0)),
    C: () => geo('C', () => new T.CylinderGeometry(1, 1, 1, 16)),
    K: () => geo('K', () => new T.ConeGeometry(1, 1, 14)),
    T: () => geo('T', () => new T.TorusGeometry(1, 0.28, 8, 22)),
    t: () => geo('t', () => new T.TorusGeometry(1, 0.06, 4, 26)),
    Q: () => geo('Q', () => new T.CapsuleGeometry(0.5, 1, 4, 10)),
    D: () => geo('D', () => new T.CylinderGeometry(1, 1, 1, 20)),
    X: () => geo('X', () => { const s = new T.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.45 : 1, a = P / 2 + i * P / 5; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); return new T.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelSize: 0.14, bevelThickness: 0.14, bevelSegments: 2 }).translate(0, 0, -0.25); }),
    Y: () => geo('Y', () => heartGeo(12, 3)),
    A: () => geo('A', () => new T.TorusGeometry(1, 0.16, 6, 14, P).rotateZ(P)),            // a stitched smile: an arc hanging under its centre
    U: () => geo('U', () => new T.TorusGeometry(1, 0.3, 8, 14, P * 0.7).rotateZ(P * 1.15)),  // a thick curve (a banana)
  };

  /* ---------- materials ---------- */
  // plush: a fuzzy nap texture and a soft rim of light round the edges (so it reads soft); plastic: smooth with a
  // brighter, tighter rim (a sheen)
  const rimify = (m, col, k, pw, key) => {
    m.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
        { float rimA = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
          gl_FragColor.rgb += vec3(${col}) * pow(rimA, ${pw.toFixed(2)}) * ${k.toFixed(2)}; }`);
    };
    m.customProgramCacheKey = () => 'rim|' + key;
    return m;
  };
  // the plush nap: soft patches where the pile lies a different way, thousands of short fibres mostly lying one way, and
  // fibre tips catching the light (it tiles, and the prizes lay it at one size whatever their size: FUZZ_D)
  const fuzzTex = () => K3D.paint('act-fuzz', 256, 256, (c, w, h) => {
    c.fillStyle = '#ececec'; c.fillRect(0, 0, w, h);
    // (its own random numbers: the shared ones lay out the heaps, so it takes just as many of those as the first nap did,
    // and the mountain stays the one in the look shots)
    for (let i = 0; i < 11700; i++) A.rnd();
    let sd = 90731; const rnd = () => { sd = (sd + 0x6D2B79F5) | 0; let t = Math.imul(sd ^ (sd >>> 15), 1 | sd); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const R = (a, b) => a + rnd() * (b - a);
    const wrap = (x, y, r, f) => { for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) if (x + ox > -r && x + ox < w + r && y + oy > -r && y + oy < h + r) f(x + ox, y + oy); };
    for (let i = 0; i < 30; i++) {
      const x = R(0, w), y = R(0, h), r = R(18, 56), lt = rnd() < 0.5;
      wrap(x, y, r, (px, py) => { const g = c.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, lt ? 'rgba(255,255,255,0.16)' : 'rgba(120,120,120,0.09)'); g.addColorStop(1, 'rgba(128,128,128,0)'); c.fillStyle = g; c.fillRect(px - r, py - r, r * 2, r * 2); });
    }
    for (let i = 0; i < 9000; i++) {
      const x = R(0, w), y = R(0, h), a = 1.25 + R(-0.45, 0.45), l = R(2.5, 6.5), v = Math.floor(R(196, 255));
      c.strokeStyle = `rgba(${v},${v},${v},${R(0.3, 0.6).toFixed(2)})`; c.lineWidth = R(0.7, 1.3);
      wrap(x, y, 8, (px, py) => { c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); c.stroke(); });
    }
    for (let i = 0; i < 1800; i++) { c.fillStyle = `rgba(255,255,255,${R(0.35, 0.8).toFixed(2)})`; c.fillRect(R(0, w), R(0, h), 1, 1); }
  }, { repeat: true });
  // the plush fabric's seams: the fabric puckers in along each seam (a soft crease) and close up a running stitch of
  // darker thread shows along it. The seam attribute (seamOf) gives the distance from the seam and along it, in the
  // kind's units; a mesh without one has no seam. The stitches fade out before they are too small to draw cleanly.
  const seamed = (m, key) => {
    const rim = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      rim(sh, r);
      sh.vertexShader = 'attribute vec3 seam;\nvarying vec3 vSeam;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vSeam = seam;');
      sh.fragmentShader = 'varying vec3 vSeam;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        if (vSeam.z > 0.5) {
          float sd = abs(vSeam.x), fw = max(fwidth(vSeam.x), 1e-5);
          diffuseColor.rgb *= mix(0.7, 1.0, smoothstep(0.0, 0.055, sd));
          float q = vSeam.y / 0.05, fq = fwidth(q);
          float dash = 1.0 - smoothstep(0.27 - fq, 0.27 + fq, abs(fract(q) - 0.5));
          float line = 1.0 - smoothstep(0.006 - fw * 0.6, 0.006 + fw * 0.6, sd);
          float vis = (1.0 - smoothstep(0.004, 0.011, fw)) * (1.0 - smoothstep(0.3, 0.55, fq));
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.42, line * dash * vis);
        }`);
    };
    m.customProgramCacheKey = () => 'seam|' + key;
    return m;
  };
  const tagTex = () => K3D.paint('act-tag', 128, 192, (c, w, h) => {
    c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e8483a'; c.fillRect(0, 0, w, 34);
    c.fillStyle = '#fff'; c.font = 'bold 19px sans-serif'; c.textAlign = 'center'; c.fillText('SOFTLY & CO', w / 2, 24);
    c.fillStyle = '#3a3040'; c.font = 'bold 15px sans-serif'; c.fillText('PRIZE PALACE', w / 2, 62);
    c.font = '12px sans-serif'; c.fillText('Made with care', w / 2, 84); c.fillText('in the back room', w / 2, 100);
    c.fillStyle = '#2a7a5a'; c.font = 'bold 26px sans-serif'; c.fillText('40', w / 2, 142); c.font = 'bold 13px sans-serif'; c.fillText('TICKETS', w / 2, 160);
    c.beginPath(); c.arc(w / 2, 178, 6, 0, P * 2); c.fillStyle = '#c8c0b0'; c.fill();
  });
  const mats = {};
  const mat = kind => mats[kind] || (mats[kind] = K3D.mat('act-m|' + kind, () => {
    switch (kind) {
      case 'plush': return seamed(rimify(K3D.toon('#ffffff', { map: fuzzTex() }), '1.0, 0.92, 0.85', 0.26, 2.4, 'plush'), 'plush');
      case 'shine': return K3D.flat('#ffffff');
      case 'plastic': return rimify(K3D.toon('#ffffff'), '1.0, 1.0, 1.0', 0.55, 4.0, 'plastic');
      case 'eye': return rimify(K3D.toon('#ffffff'), '0.9, 0.9, 1.0', 0.8, 3.0, 'eye');
      case 'tag': return K3D.toon('#ffffff', { map: tagTex() });
      case 'metal': return rimify(K3D.toon('#ffffff'), '1.0, 1.0, 1.0', 0.9, 2.0, 'metal');
      case 'glass': return rimify(K3D.toon('#ffffff', { transparent: true, opacity: 0.5, depthWrite: false }), '0.9, 0.95, 1.0', 0.9, 2.0, 'glass');
    }
  }));
  const slotMat = (slot, soft) => slot === 3 ? 'eye' : slot === 6 ? 'tag' : slot === 7 ? 'metal' : slot === 9 ? 'plastic' : slot === 10 ? 'glass' : slot === 11 ? 'shine' : soft ? 'plush' : 'plastic';
  const SLOT_FIX = { 3: '#17121a', 4: '#f6f2ea', 5: '#ff9ab8', 6: '#ffffff', 7: '#c8ccd6', 9: '#ffd23a', 10: '#cfe8ff', 11: '#ffffff' };
  const slotCol = (slot, pal) => slot <= 2 ? pal[slot] : slot === 8 ? mixHex(pal[0], '#1a1018', 0.35) : SLOT_FIX[slot];

  /* ---------- the kinds ----------
     part: [shape, slot, x, y, z, sx, sy, sz, rx, ry, rz, fine, seam]  (sizes are the shape's scale: a sphere's radii)
       fine: 1 for the small face and fabric details (on the near heaps and every toy; left off the hazy far piles)
       seam: which way a plush part's stitched seam runs: down its middle (the default), 'z' along its length, '-' none */
  const K = {};
  // every plastic eye and nose (a dark gloss sphere) gets a white catchlight, high on the side the light comes from
  const shine = parts => {
    const out = [];
    for (const p of parts) {
      if (p[0] !== 'S' || p[1] !== 3) continue;
      const r = Math.min(p[5], p[6]);
      if (r < 0.02 || Math.max(p[5], p[6], p[7]) > 0.08) continue;
      let ox = p[2], oz = p[4]; const l = Math.hypot(ox, oz);
      if (l < 0.02) { ox = 0; oz = 1; } else { ox /= l; oz /= l; }
      let dx = ox - oz * 0.35, dy = 0.55, dz = oz + ox * 0.35; const m = Math.hypot(dx, dy, dz); dx /= m; dy /= m; dz /= m;
      out.push(['S', 11, p[2] + p[5] * dx, p[3] + p[6] * dy, p[4] + p[7] * dz, r * 0.34, r * 0.34, r * 0.24, 0, 0, 0, 1]);
    }
    return parts.concat(out);
  };
  // a rounded part with an eye or nose on it is a head (or muzzle): its seam goes over the top and down the back, never
  // across the face
  const heads = parts => {
    for (const p of parts) {
      if (p[0] !== 'S' || p[1] > 2 || p[12] || Math.max(p[5], p[6], p[7]) < 0.09) continue;
      if (parts.some(q => q[1] === 3 && q[0] === 'S' && ((q[2] - p[2]) / p[5]) ** 2 + ((q[3] - p[3]) / p[6]) ** 2 + ((q[4] - p[4]) / p[7]) ** 2 < 1.3)) p[12] = 'h';
    }
    return parts;
  };
  // (size: the room the heaps make for a prize; kept as first laid out, so the heaps stay put: a hat or a mane may poke above)
  const def = (name, soft, size, pals, parts) => { K[name] = { name, soft, size, pals, parts: shine(heads(parts)) }; };
  const eyes = (y, z, x = 0.1, r = 0.04) => { r *= 1.15; return [['S', 3, -x, y, z, r, r, r * 0.7], ['S', 3, x, y, z, r, r, r * 0.7]]; };
  const mirror = p => [p, p.map((v, i) => (i === 2 ? -v : i === 10 ? -(v || 0) : i === 9 ? -(v || 0) : v))];
  const tag = (x, y, z, ry = 0) => ['B', 6, x, y, z, 0.07, 0.11, 0.008, 0, ry, 0.15];

  // features set on a rounded part's surface: E = [centre, radii] of the ellipsoid they sit on
  const _q = new T.Quaternion(), _q2 = new T.Quaternion(), _e = new T.Euler(), _n = new T.Vector3(), _Z = new T.Vector3(0, 0, 1);
  // the point of E's front (back) at an offset from its middle, as a direction from its centre
  const dirAt = (E, ox, oy, back) => { const a = ox / E[1][0], b = oy / E[1][1]; return [a, b, (back ? -1 : 1) * Math.sqrt(Math.max(0.02, 1 - a * a - b * b))]; };
  // a part on E where direction d meets it, facing out (spin turns it about that), sunk a little into the fabric
  const onE = (sh, slot, E, d, size, spin = 0, sink = 0.3) => {
    const [c, r] = E, l = Math.hypot(d[0], d[1], d[2]), u = [d[0] / l, d[1] / l, d[2] / l];
    _n.set(u[0] / r[0], u[1] / r[1], u[2] / r[2]).normalize();
    _q.setFromUnitVectors(_Z, _n); if (spin) _q.multiply(_q2.setFromAxisAngle(_Z, spin));
    _e.setFromQuaternion(_q, 'XYZ');
    const k = size[2] * sink;
    return [sh, slot, c[0] + r[0] * u[0] - _n.x * k, c[1] + r[1] * u[1] - _n.y * k, c[2] + r[2] * u[2] - _n.z * k, size[0], size[1], size[2], _e.x, _e.y, _e.z, 1];
  };
  const onF = (sh, slot, E, ox, oy, size, spin = 0, sink = 0.3) => onE(sh, slot, E, dirAt(E, ox, oy), size, spin, sink);
  const body = p => { p[11] = 0; return p; };                                    // (a felt part that is part of the shape, not a fine detail)
  const cheeks = (E, ox, oy, s = 0.045) => mirror(onF('S', 5, E, ox, oy, [s, s * 0.62, s * 0.22], 0, 0));
  const smile = (E, oy, w, h = w * 0.7, slot = 3) => onF('A', slot, E, 0, oy, [w, h, w], 0, 0);   // a stitched smile
  const wMouth = (E, oy, w, slot = 3) => [onF('A', slot, E, -w, oy, [w, w * 0.8, w], 0, 0), onF('A', slot, E, w, oy, [w, w * 0.8, w], 0, 0)];
  // a ribbon bow: two loops, a knot and two tails (rx, ry turn it)
  const bow = (x, y, z, s, slot, rx = 0, ry = 0) => {
    const ox = Math.cos(ry) * s * 0.62, oz = -Math.sin(ry) * s * 0.62;
    return [['S', slot, x - ox, y, z - oz, s * 0.62, s * 0.42, s * 0.26, rx, ry, -0.3, 1], ['S', slot, x + ox, y, z + oz, s * 0.62, s * 0.42, s * 0.26, rx, ry, 0.3, 1], ['S', slot, x, y, z + 0.004, s * 0.26, s * 0.26, s * 0.24, rx, ry, 0, 1],
      ['B', slot, x - ox * 0.35, y - s * 0.5, z - oz * 0.35, s * 0.2, s * 0.6, s * 0.06, rx, ry, -0.35, 1], ['B', slot, x + ox * 0.35, y - s * 0.5, z + oz * 0.35, s * 0.2, s * 0.6, s * 0.06, rx, ry, 0.35, 1]];
  };
  // three toe beans along the top of a foot pad that faces forward
  const beans = (x, y, z, s, slot = 5) => [-1, 0, 1].map(i => ['S', slot, x + i * s * 1.9, y + (i ? 0 : s * 0.45), z, s, s * 0.85, s * 0.45, 0, 0, 0, 1]);

  // the teddy (and its wink and mended cousins): stitched nose line and smile, cheeks, toe beans, a tail
  const BH = [[0, 0.76, 0.02], [0.29, 0.26, 0.25]], BM = [[0, 0.7, 0.22], [0.12, 0.09, 0.08]];
  const bearBody = (eyeParts, extra = []) => [
    ['S', 0, 0, 0.32, 0, 0.36, 0.33, 0.31], ['S', 1, 0, 0.3, 0.17, 0.22, 0.2, 0.15],
    ['S', 0, 0, 0.76, 0.02, 0.29, 0.26, 0.25], ...mirror(['S', 0, 0.2, 0.98, -0.02, 0.1, 0.1, 0.06]), ...mirror(['S', 1, 0.2, 0.98, 0.02, 0.06, 0.06, 0.03]),
    ['S', 1, 0, 0.7, 0.22, 0.12, 0.09, 0.08], ['S', 3, 0, 0.74, 0.29, 0.04, 0.03, 0.03],
    onF('B', 3, BM, 0, -0.004, [0.008, 0.03, 0.006], 0, 0.1), ...wMouth(BM, -0.02, 0.022),
    ...cheeks(BH, 0.17, -0.06, 0.05),
    ...eyeParts,
    ...mirror(['S', 0, 0.33, 0.42, 0.06, 0.09, 0.17, 0.09, 0, 0, 0.5]), ...mirror(['S', 0, 0.17, 0.11, 0.17, 0.11, 0.09, 0.15]), ...mirror(['S', 1, 0.17, 0.1, 0.3, 0.07, 0.06, 0.02]),
    ...beans(0.17, 0.135, 0.314, 0.017), ...beans(-0.17, 0.135, 0.314, 0.017),
    ['S', 0, 0, 0.22, -0.3, 0.08, 0.08, 0.07],
    tag(0.25, 0.18, 0.2, 0.6),
    ...extra,
  ];
  const PL = ['#c89a6a', '#e8d0b0', '#8a5a3a'], PLs = [['#c89a6a', '#e8d0b0', '#e8484a'], ['#f0a8c8', '#fff0f6', '#7ac8ff'], ['#9ad8a8', '#eafff0', '#ff7aa8'], ['#b8a0e8', '#f2ecff', '#ffd23a'], ['#e8e0d0', '#ffffff', '#5a8aff'], ['#ffd27a', '#fff3d0', '#e8484a'], ['#8ac8f0', '#e8f6ff', '#ff9a3a']];
  const pals = (list, extra = '#ffd23a') => list.map(p => [p[0], p[1], p[2] || extra]);
  def('bear', true, [0.75, 1.08, 0.7], pals(PLs), bearBody(eyes(0.82, 0.24), bow(0, 0.545, 0.235, 0.075, 2, -0.35)));            // with a bow tie
  def('bearWink', true, [0.75, 1.08, 0.7], pals(PLs.slice(1)), bearBody([['S', 3, -0.1, 0.82, 0.24, 0.046, 0.046, 0.032], ['A', 3, 0.1, 0.835, 0.25, 0.042, 0.03, 0.042, 0.15, 0, 0, 1], ['B', 3, 0.142, 0.84, 0.248, 0.022, 0.006, 0.006, 0, 0, -0.5, 1]],
    [['Y', 5, 0, 0.37, 0.305, 0.065, 0.065, 0.034, -0.3, 0, 0, 1]]));                                                          // a sewn-on heart
  def('bearPatch', true, [0.75, 1.08, 0.7], pals([['#c89a6a', '#e8d0b0', '#5ad8ff'], ['#e8e0d0', '#ffffff', '#ff6ab0'], ['#9ad8a8', '#eafff0', '#ffd23a']]),
    bearBody([['S', 3, -0.1, 0.82, 0.24, 0.046, 0.046, 0.032], ['S', 3, 0.12, 0.79, 0.26, 0.035, 0.035, 0.025]], [['B', 2, -0.14, 0.38, 0.27, 0.14, 0.12, 0.03, 0, 0.3, 0.2], ['t', 8, 0.12, 0.79, 0.26, 0.04, 0.04, 0.04],
      // a mended tear on its head: a line of cross stitches
      onF('B', 3, BH, -0.13, 0.15, [0.1, 0.006, 0.005], 0.5, 0), ...[-1, 0, 1].map(i => onF('B', 3, BH, -0.13 + i * 0.03 * Math.cos(0.5), 0.15 + i * 0.03 * Math.sin(0.5), [0.006, 0.032, 0.005], 0.5, 0))]));
  const NH = [[0, 0.7, 0.02], [0.24, 0.23, 0.22]];
  def('bunny', true, [0.7, 1.4, 0.6], [['#f6f0ff', '#ffc8dc', '#7ac8ff'], ['#d8c8b8', '#fff0e0', '#ff7a9a'], ['#a8e8d8', '#ffffff', '#ffd23a'], ['#ffd8e8', '#ffffff', '#b88aff']],
    [['S', 0, 0, 0.3, 0, 0.32, 0.3, 0.28], ['S', 1, 0, 0.28, 0.16, 0.18, 0.18, 0.12], ['S', 0, 0, 0.7, 0.02, 0.24, 0.23, 0.22], ...mirror(['S', 0, 0.09, 1.1, -0.02, 0.07, 0.24, 0.045, 0, 0, 0.12]), ...mirror(['S', 1, 0.09, 1.1, 0.01, 0.045, 0.19, 0.02, 0, 0, 0.12]),
      ...eyes(0.75, 0.2, 0.09), ['S', 5, 0, 0.68, 0.235, 0.035, 0.025, 0.025],
      ...mirror(onF('S', 1, NH, 0.032, -0.045, [0.042, 0.034, 0.026], 0, 0.4)), onF('B', 4, NH, 0, -0.086, [0.042, 0.034, 0.012], 0, 0.3), onF('B', 3, NH, 0, -0.088, [0.004, 0.032, 0.004], 0, -0.6),
      ...cheeks(NH, 0.14, -0.04, 0.04),
      ...mirror(['S', 0, 0.21, 0.38, 0.08, 0.07, 0.13, 0.07, 0, 0, 0.5]),
      ...mirror(['S', 0, 0.15, 0.08, 0.16, 0.1, 0.08, 0.15]), ...mirror(['S', 1, 0.15, 0.08, 0.305, 0.06, 0.05, 0.014, 0, 0, 0, 1]),
      ...bow(0.09, 0.91, 0.04, 0.065, 2, -0.2), ['S', 4, 0, 0.22, -0.28, 0.1, 0.1, 0.1], tag(-0.24, 0.16, 0.18, -0.6)]);
  const CH = [[0, 0.72, 0.03], [0.27, 0.23, 0.23]];
  def('cat', true, [0.7, 1.0, 0.7], [['#f0c060', '#fff4d8', '#ff5a7a'], ['#6a6a78', '#e8e8f0', '#5ad8ff'], ['#f6f6f6', '#ffc8d8', '#b88aff'], ['#c87a4a', '#ffe8d0', '#5aff8a']],
    [['S', 0, 0, 0.3, 0, 0.32, 0.3, 0.3], ['S', 0, 0, 0.72, 0.03, 0.27, 0.23, 0.23], ...mirror(['K', 0, 0.15, 0.95, 0.02, 0.08, 0.14, 0.06, 0, 0, -0.25]), ...mirror(['K', 1, 0.15, 0.94, 0.05, 0.05, 0.09, 0.02, 0, 0, -0.25]),
      ...eyes(0.75, 0.22, 0.1), ['S', 5, 0, 0.68, 0.25, 0.03, 0.02, 0.02], ...mirror(['B', 3, 0.16, 0.66, 0.22, 0.12, 0.006, 0.006, 0, 0.3, 0.1]),
      ...mirror(onF('S', 1, CH, 0.03, -0.06, [0.038, 0.03, 0.024], 0, 0.4)), ...wMouth(CH, -0.094, 0.017), ...cheeks(CH, 0.16, -0.03, 0.04),
      onF('B', 8, CH, 0, 0.17, [0.02, 0.06, 0.012], 0, 0.2), ...mirror(onF('B', 8, CH, 0.06, 0.155, [0.016, 0.05, 0.01], -0.25, 0.2)),                 // tabby stripes
      ['T', 2, 0, 0.53, 0.02, 0.2, 0.2, 0.14, P / 2, 0, 0, 0, '-'], ['S', 9, 0, 0.48, 0.225, 0.042, 0.042, 0.042], ['B', 3, 0, 0.466, 0.262, 0.032, 0.007, 0.008, 0, 0, 0, 1],   // collar and bell
      ['Q', 0, 0, 0.3, -0.36, 0.12, 0.6, 0.12, 0.9, 0, 0], ...mirror(['S', 0, 0.15, 0.08, 0.2, 0.09, 0.07, 0.12]), ...mirror(['S', 5, 0.15, 0.08, 0.315, 0.05, 0.04, 0.012, 0, 0, 0, 1]),
      ['S', 1, 0, 0.26, 0.2, 0.17, 0.17, 0.12], tag(0.24, 0.16, 0.18, 0.6)]);
  const DH = [[0, 0.72, 0.04], [0.27, 0.24, 0.25]], DM = [[0, 0.66, 0.24], [0.15, 0.11, 0.1]];
  def('dog', true, [0.75, 1.0, 0.75], pals([['#e8c89a', '#fff4e0', '#3a2a24'], ['#ffffff', '#3a3440', '#ff6a6a'], ['#b8845a', '#f0dcc0', '#3a2a24']]),
    [['S', 0, 0, 0.3, 0, 0.34, 0.3, 0.33], ['S', 0, 0, 0.72, 0.04, 0.27, 0.24, 0.25], ['S', 1, 0, 0.66, 0.24, 0.15, 0.11, 0.1], ['S', 3, 0, 0.7, 0.33, 0.05, 0.04, 0.04],
      ...mirror(['S', 2, 0.27, 0.66, 0.0, 0.07, 0.18, 0.11, 0, 0, 0.3]), ...eyes(0.8, 0.24, 0.1), ['S', 1, 0.1, 0.8, 0.21, 0.08, 0.07, 0.04], ['C', 9, 0, 0.5, 0.04, 0.24, 0.04, 0.24], ['S', 9, 0, 0.47, 0.27, 0.04, 0.04, 0.03],
      ...wMouth(DM, -0.035, 0.024), onF('S', 5, DM, 0.012, -0.075, [0.032, 0.042, 0.014], 0.15, 0), ...cheeks(DH, 0.18, -0.06, 0.042), ...mirror(onF('S', 8, DH, 0.1, 0.15, [0.04, 0.016, 0.01], -0.2, 0)),
      ...mirror(['S', 0, 0.18, 0.08, 0.2, 0.1, 0.08, 0.14]), ...mirror(['S', 1, 0.18, 0.08, 0.335, 0.06, 0.05, 0.015, 0, 0, 0, 1]), ...beans(0.18, 0.115, 0.343, 0.015, 1), ...beans(-0.18, 0.115, 0.343, 0.015, 1),
      ['Q', 0, 0, 0.42, -0.34, 0.09, 0.3, 0.09, -0.6, 0, 0], tag(-0.27, 0.18, 0.15, -0.6)]);
  const WB = [[0, 0.36, 0], [0.62, 0.36, 0.4]];
  def('whale', true, [1.3, 0.8, 0.8], pals([['#7ab8e8', '#e8f6ff'], ['#9a8ae8', '#f0ecff'], ['#6ad8c8', '#e8fff8'], ['#f0a0c0', '#fff0f6']]),
    [['S', 0, 0, 0.36, 0, 0.62, 0.36, 0.4, 0, 0, 0, 0, 'z'], ['S', 1, 0, 0.24, 0.08, 0.5, 0.2, 0.34, 0, 0, 0, 0, '-'], ['K', 0, -0.7, 0.42, 0, 0.12, 0.3, 0.08, 0, 0, P / 2], ['S', 0, -0.86, 0.5, 0.14, 0.08, 0.04, 0.18, 0, 0.5, 0], ['S', 0, -0.86, 0.5, -0.14, 0.08, 0.04, 0.18, 0, -0.5, 0],
      ['S', 0, 0.1, 0.2, 0.36, 0.14, 0.04, 0.1, 0.3, 0.4, 0], ['S', 0, 0.1, 0.2, -0.36, 0.14, 0.04, 0.1, -0.3, -0.4, 0], ['S', 3, 0.42, 0.42, 0.33, 0.04, 0.04, 0.03], ['S', 3, 0.42, 0.42, -0.33, 0.04, 0.04, 0.03],
      ['B', 3, 0.52, 0.3, 0.2, 0.12, 0.012, 0.02, 0, -0.6, 0.1], ['B', 3, 0.52, 0.3, -0.2, 0.12, 0.012, 0.02, 0, 0.6, 0.1],
      onE('S', 5, WB, [0.62, -0.12, 0.75], [0.055, 0.034, 0.012], 0, 0), onE('S', 5, WB, [0.62, -0.12, -0.75], [0.055, 0.034, 0.012], 0, 0),
      // a felt water spout on top
      ['C', 4, 0.22, 0.75, 0, 0.02, 0.1, 0.02, 0, 0, 0, 1], ['S', 4, 0.22, 0.83, 0, 0.042, 0.036, 0.042, 0, 0, 0, 1], ['S', 4, 0.16, 0.8, 0.03, 0.032, 0.03, 0.032, 0, 0, 0, 1], ['S', 4, 0.28, 0.8, -0.03, 0.032, 0.03, 0.032, 0, 0, 0, 1]]);
  const OH = [[0, 0.55, 0], [0.34, 0.36, 0.33]];
  def('octopus', true, [0.9, 0.9, 0.9], pals([['#ff7ab0', '#ffd0e4'], ['#a87af0', '#ead8ff'], ['#5ad8c8', '#d8fff8'], ['#ffb84a', '#fff0d0']]),
    [['S', 0, 0, 0.55, 0, 0.34, 0.36, 0.33], ...eyes(0.56, 0.3, 0.12, 0.05), ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => ['Q', 0, Math.sin(i * P / 4) * 0.3, 0.16, Math.cos(i * P / 4) * 0.3, 0.12, 0.3, 0.12, P / 2 - 0.4, i * P / 4, 0]), ['S', 5, 0, 0.47, 0.32, 0.05, 0.02, 0.02],
      ...cheeks(OH, 0.19, -0.07, 0.05),
      ...[[-0.17, 0.24], [0.14, 0.28], [0.25, 0.13], [-0.04, 0.33]].map(([x, y]) => onF('S', 1, OH, x, y, [0.045, 0.045, 0.012], 0, 0)),
      ...[[0.2, 0.2], [-0.22, 0.15], [0, 0.28], [0.05, -0.05]].map(([x, y]) => onE('S', 1, OH, dirAt(OH, x, y, true), [0.05, 0.05, 0.012], 0, 0)),
      // a little sailor's hat
      ['C', 4, 0.1, 0.9, 0.0, 0.13, 0.07, 0.13, 0, 0, 0.25, 0, '-'], ['C', 4, 0.1, 0.87, 0, 0.16, 0.02, 0.16, 0, 0, 0.25, 0, '-'], ['C', 5, 0.115, 0.905, 0, 0.133, 0.02, 0.133, 0, 0, 0.25, 1, '-']]);
  const PF = [[0, 0.86, 0.1], [0.15, 0.12, 0.12]];
  def('penguin', true, [0.6, 1.0, 0.6], pals([['#2a2a3a', '#ffffff', '#ffb02a'], ['#3a4a6a', '#f6f6ff', '#ffd02a']]),
    [['S', 0, 0, 0.45, 0, 0.3, 0.45, 0.28], ['S', 1, 0, 0.42, 0.12, 0.22, 0.36, 0.18], ['S', 0, 0, 0.88, 0, 0.22, 0.2, 0.2], ['S', 1, 0, 0.86, 0.1, 0.15, 0.12, 0.12], ...eyes(0.9, 0.19, 0.07, 0.03), ['K', 2, 0, 0.84, 0.25, 0.04, 0.09, 0.04, P / 2, 0, 0],
      ...mirror(['S', 0, 0.3, 0.5, 0, 0.06, 0.24, 0.12, 0, 0, 0.3]), ...mirror(['S', 2, 0.1, 0.03, 0.12, 0.08, 0.03, 0.12]), ['C', 2, 0, 0.7, 0.01, 0.262, 0.06, 0.252],
      ...cheeks(PF, 0.095, -0.045, 0.032),
      ['t', 4, 0, 0.7, 0.01, 0.262, 0.252, 0.28, P / 2, 0, 0, 1],
      ['B', 2, 0.09, 0.56, 0.3, 0.07, 0.2, 0.025, -0.2, 0, 0.15], ...[0.49, 0.53].map(y => ['B', 4, 0.093, y, 0.314, 0.072, 0.012, 0.012, -0.2, 0, 0.15, 1]), ...[-0.02, 0.01, 0.04].map(o => ['B', 2, 0.075 + o * 1.1, 0.445, 0.322, 0.008, 0.04, 0.01, -0.2, 0, 0.15, 1]),
      ['H', 5, 0, 0.99, 0, 0.19, 0.13, 0.19, 0, 0, 0, 0, '-'], ['C', 4, 0, 1.0, 0, 0.2, 0.035, 0.2], ['S', 4, 0, 1.15, 0, 0.055, 0.055, 0.055], tag(0.2, 0.2, 0.18, 0.7)]);
  const FB = [[0, 0.3, 0], [0.4, 0.3, 0.34]];
  def('frog', true, [0.8, 0.7, 0.7], pals([['#6ad86a', '#e8ffd0', '#ff6a8a'], ['#3ab89a', '#d8fff0', '#ffd23a'], ['#a8d84a', '#f8ffd8', '#ff8ad8']]),
    [['S', 0, 0, 0.3, 0, 0.4, 0.3, 0.34], ['S', 1, 0, 0.24, 0.14, 0.3, 0.2, 0.22], ...mirror(['S', 0, 0.18, 0.56, 0.12, 0.13, 0.13, 0.12]), ...mirror(['S', 4, 0.18, 0.58, 0.2, 0.08, 0.08, 0.06]), ...mirror(['S', 3, 0.18, 0.58, 0.25, 0.04, 0.04, 0.03]),
      onF('A', 3, FB, 0, 0.07, [0.13, 0.055, 0.13], 0, 0), ...cheeks(FB, 0.23, 0.05, 0.045), ...mirror(['S', 0, 0.32, 0.06, 0.2, 0.16, 0.05, 0.14]),
      ...[[-0.45, 0.85, 0.25], [0.3, 0.9, -0.3], [-0.2, 0.9, -0.55], [0.55, 0.75, -0.2], [0.05, 0.95, -0.1]].map(d => onE('S', 2, FB, d, [0.055, 0.045, 0.014], 0, 0)),
      ...mirror(['S', 0, 0.3, 0.2, 0.18, 0.06, 0.1, 0.06, 0, 0, 0.6]), tag(0.3, 0.16, 0.2, 0.7)]);
  const EH = [[0, 0.72, 0.1], [0.28, 0.26, 0.26]];
  def('elephant', true, [0.9, 0.9, 0.8], pals([['#a8b0c8', '#ffc8dc', '#ff7ab0'], ['#c8b8e8', '#fff0f8', '#5ad8ff'], ['#9ad8e8', '#ffe8f0', '#ffd23a']]),
    [['S', 0, 0, 0.36, 0, 0.36, 0.34, 0.33], ['S', 0, 0, 0.72, 0.1, 0.28, 0.26, 0.26], ...mirror(['D', 0, 0.3, 0.72, 0.04, 0.22, 0.03, 0.2, 0, 0, P / 2 - 0.2]), ...mirror(['D', 1, 0.31, 0.72, 0.06, 0.15, 0.03, 0.14, 0, 0, P / 2 - 0.2]),
      ['Q', 0, 0, 0.5, 0.38, 0.09, 0.32, 0.09, 0.5, 0, 0], ...eyes(0.8, 0.32, 0.12, 0.035), ...mirror(['C', 0, 0.18, 0.1, 0.16, 0.1, 0.2, 0.1]), ...mirror(['C', 4, 0.18, 0.0, 0.16, 0.1, 0.02, 0.1]), tag(0.3, 0.22, 0.15, 0.7),
      ...cheeks(EH, 0.17, -0.07, 0.045), ...[-1, 0, 1].map(i => ['K', 0, i * 0.03, 1.0, 0.1 - Math.abs(i) * 0.01, 0.022, 0.07, 0.022, 0.1, 0, -i * 0.5, 1]),
      ...bow(0.09, 0.94, 0.2, 0.06, 2, -0.8, 0.3),
      ...[-0.05, 0, 0.05].flatMap(o => mirror(['S', 4, 0.18 + o, 0.045, 0.256, 0.024, 0.024, 0.012, 0, 0, 0, 1])),
      ['Q', 0, 0, 0.26, -0.375, 0.03, 0.09, 0.03, 0.51, 0, 0, 1, '-'], ['S', 1, 0, 0.17, -0.43, 0.036, 0.036, 0.036, 0, 0, 0, 1]]);
  const LH = [[0, 0.74, 0.06], [0.24, 0.23, 0.22]], LM = [[0, 0.68, 0.24], [0.12, 0.08, 0.08]];
  def('lion', true, [0.8, 1.0, 0.8], pals([['#f0c050', '#c8742a', '#fff0c0'], ['#f8d8a0', '#e88a3a', '#ffffff']]),
    [['S', 0, 0, 0.32, 0, 0.34, 0.3, 0.32], ['T', 1, 0, 0.74, 0.04, 0.27, 0.27, 0.5], ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => ['S', 1, Math.sin(i * P / 6) * 0.3, 0.74 + Math.cos(i * P / 6) * 0.29, -0.02, 0.1, 0.1, 0.08, 0, 0, -i * P / 6, 0, '-']),
      ['S', 0, 0, 0.74, 0.06, 0.24, 0.23, 0.22], ['S', 2, 0, 0.68, 0.24, 0.12, 0.08, 0.08], ['S', 3, 0, 0.71, 0.31, 0.04, 0.03, 0.03], ...eyes(0.8, 0.24, 0.09),
      ...mirror(['S', 0, 0.17, 0.95, 0.07, 0.06, 0.06, 0.04]), ...mirror(['S', 2, 0.17, 0.95, 0.095, 0.035, 0.035, 0.015, 0, 0, 0, 1]),
      ...wMouth(LM, -0.026, 0.02), ...[[0.06, 0.0], [0.08, -0.025], [0.05, -0.04]].flatMap(([x, y]) => mirror(onF('S', 3, LM, x, y, [0.012, 0.012, 0.006], 0, 0))), ...cheeks(LH, 0.15, -0.05, 0.035),
      ['Q', 0, 0, 0.26, -0.38, 0.06, 0.4, 0.06, 1.2, 0, 0], ['S', 1, 0, 0.36, -0.58, 0.07, 0.08, 0.07], ...mirror(['S', 0, 0.18, 0.08, 0.2, 0.1, 0.08, 0.13]), ...mirror(['S', 2, 0.18, 0.08, 0.325, 0.06, 0.05, 0.014, 0, 0, 0, 1]),
      ...mirror(['S', 0, 0.3, 0.38, 0.08, 0.08, 0.15, 0.08, 0, 0, 0.5]), ['S', 2, 0, 0.3, 0.17, 0.18, 0.18, 0.13], tag(-0.27, 0.18, 0.15, -0.6)]);
  const OB = [[0, 0.36, 0.15], [0.22, 0.28, 0.16]], OWB = [[0, 0.42, 0], [0.32, 0.42, 0.3]];
  def('owl', true, [0.6, 0.9, 0.6], pals([['#a8805a', '#f0e0c8', '#ffd23a'], ['#8a8ab8', '#ecebff', '#ffb84a'], ['#c8a8e0', '#fff4ff', '#ffd23a']]),
    [['S', 0, 0, 0.42, 0, 0.32, 0.42, 0.3], ['S', 1, 0, 0.36, 0.15, 0.22, 0.28, 0.16], ...mirror(['D', 4, 0.12, 0.66, 0.24, 0.11, 0.02, 0.11, P / 2, 0, 0]), ...mirror(['S', 3, 0.12, 0.66, 0.26, 0.05, 0.05, 0.02]), ['K', 2, 0, 0.58, 0.28, 0.04, 0.08, 0.04, P, 0, 0],
      ...mirror(['K', 0, 0.2, 0.86, 0, 0.06, 0.14, 0.05, 0, 0, -0.4]), ...mirror(['S', 0, 0.3, 0.42, -0.02, 0.06, 0.26, 0.16, 0, 0, 0.2]),
      ...mirror(['t', 8, 0.12, 0.66, 0.255, 0.112, 0.112, 0.3, 0, 0, 0, 1]),
      ...[[0.055, 0.1], [-0.055, 0.1], [0.1, 0.02], [0, 0.02], [-0.1, 0.02], [0.055, -0.06], [-0.055, -0.06]].map(([x, y]) => onF('A', 8, OB, x, y, [0.032, 0.024, 0.032], 0, 0)),
      ...[-0.035, 0, 0.035].flatMap(o => mirror(['S', 2, 0.1 + o, 0.025, 0.25, 0.018, 0.016, 0.035, 0, 0, 0, 1])), ...cheeks(OWB, 0.2, 0.14, 0.035), tag(0.27, 0.2, 0.15, 0.7)]);
  const PG = [[0, 0.36, 0], [0.4, 0.34, 0.37]];
  def('pig', true, [0.8, 0.75, 0.8], pals([['#ffb8c8', '#ff8aa8', '#ffd23a'], ['#f8d0d8', '#e88aa0', '#7ac8ff']]),
    [['S', 0, 0, 0.36, 0, 0.4, 0.34, 0.37], ['C', 1, 0, 0.42, 0.38, 0.11, 0.08, 0.11, P / 2, 0, 0], ...mirror(['S', 3, 0.04, 0.42, 0.42, 0.018, 0.025, 0.01]), ...eyes(0.55, 0.3, 0.13, 0.035), ...mirror(['K', 0, 0.2, 0.7, 0.12, 0.07, 0.12, 0.04, 0.4, 0, -0.4]),
      ...mirror(['K', 1, 0.2, 0.695, 0.142, 0.045, 0.08, 0.02, 0.4, 0, -0.4, 1]),
      ...mirror(['C', 0, 0.2, 0.08, 0.2, 0.08, 0.16, 0.08]), ...mirror(['C', 0, 0.2, 0.08, -0.2, 0.08, 0.16, 0.08]), ...mirror(['C', 8, 0.2, 0.015, 0.2, 0.083, 0.03, 0.083]), ...mirror(['C', 8, 0.2, 0.015, -0.2, 0.083, 0.03, 0.083]),
      ['T', 0, 0, 0.42, -0.38, 0.06, 0.06, 0.06, 0, P / 2, 0], smile(PG, -0.075, 0.05, 0.035), ...cheeks(PG, 0.23, 0.04, 0.05),
      onE('S', 1, PG, [-0.4, 0.8, -0.4], [0.075, 0.055, 0.015], 0.3, 0), onE('S', 1, PG, [0.5, 0.6, -0.6], [0.06, 0.045, 0.015], -0.5, 0), onE('S', 1, PG, [0.75, 0.3, 0.2], [0.05, 0.04, 0.015], 0.2, 0),
      ...bow(-0.17, 0.74, 0.16, 0.055, 2, -0.3, -0.4)]);
  const MF = [[0, 0.68, 0.18], [0.18, 0.16, 0.1]];
  def('monkey', true, [0.8, 1.0, 0.7], pals([['#8a5a3a', '#f0d0a8'], ['#a86a4a', '#ffe0c0'], ['#6a6a7a', '#f0e8e0']]),
    [['S', 0, 0, 0.32, 0, 0.3, 0.3, 0.27], ['S', 0, 0, 0.72, 0.02, 0.26, 0.25, 0.24], ['S', 1, 0, 0.68, 0.18, 0.18, 0.16, 0.1], ...mirror(['D', 0, 0.27, 0.74, 0, 0.09, 0.03, 0.09, 0, 0, P / 2]), ...mirror(['D', 1, 0.28, 0.74, 0, 0.06, 0.03, 0.06, 0, 0, P / 2]), ...eyes(0.77, 0.24, 0.08),
      smile(MF, -0.05, 0.055, 0.035), ...mirror(onF('S', 3, MF, 0.022, 0.0, [0.013, 0.015, 0.006], 0, 0)), ...cheeks(MF, 0.11, -0.025, 0.03),
      ...[-1, 0, 1].map(i => ['K', 0, i * 0.04, 0.98, 0.02, 0.025, 0.07, 0.025, 0, 0, -i * 0.3, 1]), ['S', 1, 0, 0.3, 0.16, 0.17, 0.18, 0.12],
      ...mirror(['Q', 0, 0.3, 0.38, 0.1, 0.075, 0.2, 0.075, 0, 0, 0.6]), ...mirror(['S', 1, 0.43, 0.2, 0.12, 0.06, 0.055, 0.05]), ['Q', 0, 0, 0.3, -0.36, 0.05, 0.5, 0.05, 1.3, 0, 0], ...mirror(['S', 0, 0.16, 0.08, 0.18, 0.09, 0.07, 0.12]), ...mirror(['S', 1, 0.16, 0.08, 0.295, 0.055, 0.045, 0.012, 0, 0, 0, 1]),
      // a plush banana in its lap
      ['U', 2, 0.1, 0.24, 0.29, 0.1, 0.1, 0.1, 0.4, 0.2, 0.5], ['S', 8, 0.17, 0.27, 0.32, 0.018, 0.018, 0.018, 0, 0, 0, 1], tag(0.25, 0.16, 0.16, 0.6)]);
  const DN = [[0, 0.78, 0.16], [0.22, 0.2, 0.26]], DB = [[0, 0.32, 0.14], [0.2, 0.24, 0.16]], DBd = [[0, 0.36, 0], [0.32, 0.32, 0.3]];
  def('dino', true, [1.1, 1.0, 0.7], pals([['#6ad86a', '#ffd23a', '#e8ffd0'], ['#8a7af0', '#ff8ad8', '#ece8ff'], ['#4ac8e8', '#ffe24a', '#e0f8ff'], ['#f0a04a', '#5ad8ff', '#fff0d8']]),
    [['S', 0, 0, 0.36, 0, 0.32, 0.32, 0.3], ['S', 2, 0, 0.32, 0.14, 0.2, 0.24, 0.16], ['S', 0, 0, 0.78, 0.16, 0.22, 0.2, 0.26], ['K', 0, 0, 0.32, -0.48, 0.16, 0.6, 0.14, -P / 2 + 0.3, 0, 0], ...eyes(0.86, 0.32, 0.1, 0.035),
      smile(DN, -0.065, 0.07, 0.045), ...mirror(onF('S', 3, DN, 0.05, 0.02, [0.014, 0.012, 0.006], 0, 0)), ...cheeks(DN, 0.13, -0.04, 0.035),
      ...[0, 1, 2, 3].map(i => ['K', 1, 0, 1.0 - i * 0.16, -0.02 - i * 0.16, 0.06, 0.12, 0.03, -0.3 - i * 0.2, 0, 0]), ...mirror(['S', 0, 0.22, 0.48, 0.18, 0.05, 0.1, 0.05, 0.8, 0, 0]), ...mirror(['S', 0, 0.17, 0.08, 0.1, 0.11, 0.1, 0.15]),
      ...[-0.07, 0.01, 0.09].map(y => onF('B', 1, DB, 0, y, [0.15 - Math.abs(y) * 0.4, 0.016, 0.012], 0, 0.3)),
      ...[-0.05, 0, 0.05].flatMap(o => mirror(['K', 4, 0.17 + o, 0.045, 0.245, 0.018, 0.04, 0.018, P / 2, 0, 0, 1])),
      ...[[0.7, 0.5, -0.4], [-0.7, 0.45, -0.3], [0.5, 0.75, -0.2], [-0.45, 0.6, -0.6], [0.8, 0.1, -0.5]].map(d => onE('S', 1, DBd, d, [0.06, 0.05, 0.014], 0, 0)), tag(-0.25, 0.25, 0.1, -0.8)]);
  def('star', true, [0.9, 0.9, 0.4], pals([['#ffd23a', '#ff9ab8'], ['#ff8ad8', '#ffffff'], ['#5ad8ff', '#ffffff'], ['#9aff8a', '#ffffff']]),
    [['X', 0, 0, 0.45, 0, 0.42, 0.42, 0.42], ...eyes(0.5, 0.18, 0.09, 0.035), ...mirror(['S', 5, 0.16, 0.42, 0.17, 0.045, 0.03, 0.01]), ['A', 3, 0, 0.432, 0.17, 0.042, 0.03, 0.042, 0, 0, 0, 1]]);
  def('heart', true, [0.9, 0.85, 0.4], pals([['#ff5a8a', '#ffffff'], ['#ff9ad0', '#ffffff'], ['#b88aff', '#ffffff']]),
    [['Y', 0, 0, 0.42, 0, 0.42, 0.42, 0.45], ...eyes(0.5, 0.2, 0.1, 0.035), ['A', 3, 0, 0.42, 0.188, 0.045, 0.032, 0.045, 0, 0, 0, 1], ...mirror(['S', 5, 0.18, 0.43, 0.186, 0.042, 0.026, 0.01, 0, 0, 0, 1])]);
  def('mushroom', true, [0.8, 0.9, 0.8], pals([['#ff5a5a', '#fff4e8'], ['#b88aff', '#fff4ff'], ['#ffd23a', '#fffbe8'], ['#5ad8a8', '#f0fff8']]),
    [['C', 1, 0, 0.22, 0, 0.2, 0.44, 0.2], ['H', 0, 0, 0.42, 0, 0.42, 0.34, 0.42], ['D', 1, 0, 0.425, 0, 0.405, 0.012, 0.405, 0, 0, 0, 0, '-'], ...[0, 1, 2, 3, 4].map(i => ['S', 4, Math.sin(i * 1.3) * 0.26, 0.62 + (i % 2) * 0.06, Math.cos(i * 1.3) * 0.26, 0.07, 0.03, 0.07, Math.cos(i * 1.3) * 0.6, 0, -Math.sin(i * 1.3) * 0.6]),
      ...eyes(0.3, 0.19, 0.07, 0.03), ...mirror(['S', 5, 0.13, 0.26, 0.16, 0.03, 0.02, 0.01, 0, 0.7, 0, 1]), ['A', 3, 0, 0.262, 0.196, 0.03, 0.022, 0.03, 0, 0, 0, 1]]);
  def('cloud', true, [1.0, 0.6, 0.6], pals([['#f6f6ff', '#c8d8ff'], ['#fff0f8', '#ffc8e0']]),
    [['S', 0, 0, 0.3, 0, 0.3, 0.26, 0.26], ...mirror(['S', 0, 0.28, 0.24, 0, 0.22, 0.2, 0.22]), ['S', 0, 0.1, 0.46, -0.04, 0.2, 0.18, 0.2], ...eyes(0.32, 0.26, 0.08, 0.03), ...mirror(['S', 1, 0.17, 0.27, 0.24, 0.04, 0.025, 0.01]),
      ['A', 3, 0, 0.28, 0.258, 0.034, 0.024, 0.034, 0, 0, 0, 1]]);
  def('fish', true, [1.0, 0.6, 0.5], pals([['#ffb02a', '#ffffff', '#3a3a3a'], ['#5ad8ff', '#ffd23a', '#3a3a3a'], ['#ff6ab0', '#ffffff', '#3a3a3a']]),
    [['S', 0, 0.05, 0.3, 0, 0.4, 0.26, 0.2, 0, 0, 0, 0, 'z'], ['T', 1, 0.05, 0.3, 0, 0.18, 0.24, 0.6, 0, P / 2, 0], ['K', 0, -0.42, 0.3, 0, 0.18, 0.24, 0.06, 0, 0, P / 2], ['S', 3, 0.3, 0.36, 0.15, 0.04, 0.04, 0.03], ['S', 3, 0.3, 0.36, -0.15, 0.04, 0.04, 0.03], ['K', 0, 0.02, 0.56, 0, 0.12, 0.14, 0.03],
      ['T', 5, 0.44, 0.27, 0, 0.035, 0.028, 0.05, 0, P / 2, 0, 1], ['S', 5, 0.32, 0.28, 0.145, 0.034, 0.022, 0.01, 0, 0, 0, 1], ['S', 5, 0.32, 0.28, -0.145, 0.034, 0.022, 0.01, 0, 0, 0, 1],
      ['S', 0, 0.1, 0.22, 0.2, 0.08, 0.03, 0.05, 0.3, 0, 0.3], ['S', 0, 0.1, 0.22, -0.2, 0.08, 0.03, 0.05, -0.3, 0, 0.3]]);
  def('carrot', true, [0.4, 1.0, 0.4], pals([['#ff9a3a', '#5ad85a'], ['#ffb04a', '#3ab85a']]),
    [['K', 0, 0, 0.42, 0, 0.18, 0.84, 0.18, P, 0, 0], ...[0, 1, 2].map(i => ['K', 1, (i - 1) * 0.05, 0.92, 0, 0.05, 0.22, 0.05, 0, 0, (i - 1) * 0.4]), ...eyes(0.7, 0.13, 0.05, 0.025), ...[0, 1, 2].map(i => { const y = 0.3 + i * 0.16, r = 0.18 * y / 0.84 + 0.004; return ['t', 8, 0, y, 0, r, r, r * 0.8, P / 2, 0, 0]; }),
      ['A', 3, 0, 0.648, 0.127, 0.024, 0.017, 0.024, 0, 0, 0, 1], ...mirror(['S', 5, 0.075, 0.665, 0.112, 0.022, 0.014, 0.008, 0, 0.55, 0, 1])]);
  const CK = [[0, 0.47, 0.03], [0.15, 0.14, 0.14]];
  def('chick', true, [0.5, 0.55, 0.5], pals([['#ffe24a', '#ff9a3a'], ['#fff07a', '#ffb04a']]),
    [['S', 0, 0, 0.25, 0, 0.24, 0.24, 0.24], ['S', 0, 0, 0.47, 0.03, 0.15, 0.14, 0.14], ['K', 1, 0, 0.46, 0.18, 0.03, 0.06, 0.03, P / 2, 0, 0], ...eyes(0.5, 0.14, 0.05, 0.022), ...mirror(['S', 0, 0.23, 0.27, 0, 0.04, 0.12, 0.08, 0, 0, 0.4]), ['K', 0, 0, 0.62, 0.02, 0.03, 0.06, 0.02],
      ...cheeks(CK, 0.08, -0.03, 0.026),
      // sitting in its eggshell
      ['H', 4, 0, 0.2, 0, 0.27, 0.2, 0.27, P, 0, 0, 0, '-'], ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => ['K', 4, Math.sin(i * P * 2 / 9) * 0.262, 0.225, Math.cos(i * P * 2 / 9) * 0.262, 0.055, 0.06, 0.02, 0, i * P * 2 / 9, 0])]);
  const TH = [[0, 0.18, 0.38], [0.13, 0.12, 0.13]], TS = [[0, 0.12, 0], [0.36, 0.26, 0.32]];
  def('turtle', true, [0.9, 0.5, 0.8], pals([['#6ad86a', '#3a8a4a', '#d8ff9a'], ['#5ac8c8', '#2a7a8a', '#d8fff8']]),
    [['H', 1, 0, 0.12, 0, 0.36, 0.26, 0.32], ['C', 2, 0, 0.12, 0, 0.37, 0.04, 0.33], ['S', 0, 0, 0.18, 0.38, 0.13, 0.12, 0.13], ...eyes(0.23, 0.48, 0.06, 0.025), ...mirror(['S', 0, 0.28, 0.06, 0.2, 0.09, 0.05, 0.08]), ...mirror(['S', 0, 0.28, 0.06, -0.2, 0.09, 0.05, 0.08]), ...[0, 1, 2].map(i => ['D', 0, (i - 1) * 0.16, 0.3, 0.05, 0.07, 0.01, 0.07]),
      smile(TH, -0.04, 0.032, 0.022), ...cheeks(TH, 0.075, -0.012, 0.022),
      ...[0, 1, 2, 3, 4, 5].map(i => body(onE('S', 0, TS, [Math.sin(i * P / 3 + P / 6) * 0.85, 0.5, Math.cos(i * P / 3 + P / 6) * 0.85], [0.085, 0.07, 0.016], 0, 0))), ['K', 0, 0, 0.08, -0.36, 0.04, 0.1, 0.03, -P / 2, 0, 0]]);

  // new friends
  const PH = [[0, 0.76, 0.02], [0.29, 0.26, 0.25]], PM = [[0, 0.69, 0.22], [0.11, 0.08, 0.07]];
  def('panda', true, [0.75, 1.08, 0.7], [['#f6f6f2', '#2a2a32', '#7ad86a'], ['#fff0f4', '#3a3040', '#5ac87a'], ['#f2f6ff', '#2a3048', '#9ae86a']], [
    ['S', 0, 0, 0.32, 0, 0.36, 0.33, 0.31], ['S', 1, 0, 0.53, 0, 0.37, 0.1, 0.32, 0, 0, 0, 0, '-'], ['S', 0, 0, 0.76, 0.02, 0.29, 0.26, 0.25], ...mirror(['S', 1, 0.2, 0.98, -0.02, 0.1, 0.1, 0.06]),
    ...mirror(body(onF('S', 1, PH, 0.1, 0.05, [0.075, 0.095, 0.03], -0.5, 0.2))), ...mirror(onF('S', 3, PH, 0.1, 0.055, [0.036, 0.04, 0.02], 0, -0.6)),
    ['S', 0, 0, 0.69, 0.22, 0.11, 0.08, 0.07], ['S', 3, 0, 0.72, 0.285, 0.035, 0.025, 0.025], onF('B', 3, PM, 0, 0.0, [0.008, 0.026, 0.006], 0, 0.1), ...wMouth(PM, -0.022, 0.018), ...cheeks(PH, 0.18, -0.075, 0.045),
    ...mirror(['S', 1, 0.33, 0.42, 0.06, 0.09, 0.17, 0.09, 0, 0, 0.5]), ...mirror(['S', 1, 0.17, 0.11, 0.17, 0.11, 0.09, 0.15]), ...mirror(['S', 5, 0.17, 0.1, 0.3, 0.06, 0.05, 0.015, 0, 0, 0, 1]), ...beans(0.17, 0.132, 0.312, 0.015, 5), ...beans(-0.17, 0.132, 0.312, 0.015, 5),
    ['S', 1, 0, 0.22, -0.3, 0.07, 0.07, 0.06],
    // a bamboo shoot held in its arms
    ['C', 2, 0.12, 0.38, 0.27, 0.03, 0.42, 0.03, 0.15, 0, -0.5], ...[-0.1, 0.1].map(k => ['C', 2, 0.12 + 0.479 * k, 0.38 + 0.868 * k, 0.27 + 0.131 * k, 0.036, 0.018, 0.036, 0.15, 0, -0.5, 1]),
    ['S', 2, 0.25, 0.58, 0.3, 0.07, 0.024, 0.02, 0, 0, 0.6], ['S', 2, 0.19, 0.6, 0.31, 0.06, 0.02, 0.02, 0, 0, -0.5], tag(0.25, 0.18, 0.2, 0.6)]);
  const FH = [[0, 0.72, 0.04], [0.26, 0.22, 0.22]];
  def('fox', true, [0.7, 1.05, 1.1], [['#ff8a3a', '#fff4e8', '#3a2a2a'], ['#e8e8f0', '#ffffff', '#5a5a6a'], ['#ffb04a', '#fff4e0', '#6a3a2a']], [
    ['S', 0, 0, 0.3, 0, 0.3, 0.3, 0.28], ['S', 1, 0, 0.3, 0.15, 0.18, 0.2, 0.14], ['S', 0, 0, 0.72, 0.04, 0.26, 0.22, 0.22], ...mirror(['S', 1, 0.11, 0.64, 0.17, 0.11, 0.08, 0.08]),
    ['K', 0, 0, 0.665, 0.3, 0.1, 0.18, 0.08, P / 2, 0, 0], ['S', 3, 0, 0.67, 0.385, 0.03, 0.025, 0.025], ...[-1, 1].map(s => ['A', 3, s * 0.016, 0.615, 0.288, 0.016, 0.013, 0.016, 0.5, 0, 0, 1]), ...eyes(0.77, 0.22, 0.1, 0.038),
    ...mirror(['K', 0, 0.15, 0.96, 0.02, 0.085, 0.2, 0.05, 0, 0, -0.3]), ...mirror(['K', 1, 0.15, 0.95, 0.045, 0.05, 0.13, 0.02, 0, 0, -0.3]), ...mirror(['K', 2, 0.183, 1.05, 0.02, 0.035, 0.06, 0.03, 0, 0, -0.3, 1]),
    ...mirror(['S', 2, 0.27, 0.36, 0.08, 0.07, 0.14, 0.07, 0, 0, 0.5]), ...mirror(['S', 2, 0.15, 0.08, 0.18, 0.09, 0.07, 0.12]), ...mirror(['S', 1, 0.15, 0.08, 0.295, 0.05, 0.04, 0.012, 0, 0, 0, 1]),
    ['Q', 0, 0, 0.4, -0.45, 0.3, 0.32, 0.3, -1.0, 0, 0], ['S', 1, 0, 0.6, -0.76, 0.11, 0.11, 0.11], tag(0.22, 0.16, 0.18, 0.6)]);
  const UH = [[0, 0.74, 0.06], [0.24, 0.24, 0.22]], UM = [[0, 0.66, 0.24], [0.14, 0.1, 0.1]];
  def('unicorn', true, [0.75, 1.18, 0.8], [['#fff8ff', '#ffd8f0', '#b88aff'], ['#f0f8ff', '#d8ecff', '#ff8ad8'], ['#fffbe8', '#ffe8f8', '#5ad8ff']], [
    ['S', 0, 0, 0.32, 0, 0.34, 0.3, 0.3], ['S', 0, 0, 0.74, 0.06, 0.24, 0.24, 0.22], ['S', 1, 0, 0.66, 0.24, 0.14, 0.1, 0.1],
    ...mirror(onF('S', 3, UM, 0.05, 0.01, [0.014, 0.01, 0.006], 0, 0)), smile(UM, -0.045, 0.035, 0.022),
    ...mirror(onF('A', 3, UH, 0.1, 0.075, [0.04, 0.028, 0.04], 0, 0)), ...mirror(onF('B', 3, UH, 0.147, 0.068, [0.026, 0.007, 0.007], -0.6, 0)), ...mirror(onF('B', 3, UH, 0.135, 0.05, [0.024, 0.007, 0.007], -1.0, 0)),
    ...cheeks(UH, 0.15, -0.02, 0.04),
    ['K', 9, 0, 1.03, 0.12, 0.05, 0.26, 0.05, 0.35, 0, 0], ...[0.25, 0.5, 0.75].map(k => ['t', 4, 0, 0.908 + k * 0.244, 0.076 + k * 0.088, 0.052 * (1 - k) + 0.005, 0.052 * (1 - k) + 0.005, 0.35, 0.35 - P / 2, 0, 0, 1]),
    ...mirror(['K', 0, 0.14, 0.95, 0.0, 0.05, 0.13, 0.035, 0, 0, -0.35]), ...mirror(['K', 5, 0.14, 0.945, 0.02, 0.03, 0.08, 0.015, 0, 0, -0.35, 1]),
    ...[[0, 0.97, 0.16, 0.06, 2], [0, 0.99, -0.04, 0.085, 5], [0, 0.9, -0.15, 0.085, 2], [0, 0.78, -0.2, 0.085, 5], [0, 0.65, -0.2, 0.08, 2], [0, 0.55, -0.16, 0.07, 5]].map(([x, y, z, r, sl]) => ['S', sl, x, y, z, r, r, r, 0, 0, 0, 0, '-']),
    ...[[0, 0.34, -0.33, 0.09, 2], [0, 0.26, -0.41, 0.085, 5], [0, 0.17, -0.45, 0.075, 2]].map(([x, y, z, r, sl]) => ['S', sl, x, y, z, r, r, r, 0, 0, 0, 0, '-']),
    ...mirror(['S', 0, 0.28, 0.38, 0.08, 0.075, 0.14, 0.075, 0, 0, 0.5]), ...mirror(['S', 0, 0.16, 0.08, 0.16, 0.09, 0.08, 0.12]), ...mirror(['S', 9, 0.16, 0.08, 0.275, 0.055, 0.045, 0.014, 0, 0, 0, 1]), tag(0.24, 0.17, 0.17, 0.6)]);
  const SB = [[0, 0.38, 0], [0.34, 0.3, 0.32]], SF = [[0, 0.6, 0.3], [0.15, 0.17, 0.13]];
  def('sheep', true, [0.85, 0.9, 0.85], [['#fff8f0', '#3a3030', '#ff7a9a'], ['#ffe8f4', '#f0d8c8', '#5ad8ff'], ['#e8f0ff', '#4a3a3a', '#ffd23a']], [
    ['S', 0, 0, 0.38, 0, 0.34, 0.3, 0.32, 0, 0, 0, 0, '-'],
    ...[[0.9, 0.3, 0.35], [-0.9, 0.3, 0.35], [0.8, 0.4, -0.5], [-0.8, 0.4, -0.5], [0.35, 0.9, 0.2], [-0.35, 0.9, 0.2], [0.3, 0.85, -0.45], [-0.3, 0.85, -0.45], [0, 0.6, -0.85], [0.6, -0.25, 0.5], [-0.6, -0.25, 0.5], [0, 0.95, -0.1], [0.95, -0.1, -0.1], [-0.95, -0.1, -0.1]]
      .map(d => { const p = body(onE('S', 0, SB, d, [0.15, 0.13, 0.14], 0, 0.6)); p[12] = '-'; return p; }),
    ['S', 1, 0, 0.6, 0.3, 0.15, 0.17, 0.13, -0.3, 0, 0], ['S', 0, 0, 0.77, 0.28, 0.1, 0.08, 0.09], ...mirror(['S', 0, 0.07, 0.75, 0.25, 0.07, 0.07, 0.07]),
    ...mirror(['S', 1, 0.17, 0.66, 0.24, 0.08, 0.035, 0.045, 0, 0.3, -0.5]),
    ...mirror(onF('S', 4, SF, 0.06, 0.03, [0.044, 0.048, 0.014], 0, 0)), ...mirror(onF('S', 3, SF, 0.062, 0.028, [0.03, 0.034, 0.02], 0, -0.5)),
    smile(SF, -0.09, 0.03, 0.02, 5), ...cheeks(SF, 0.095, -0.05, 0.03),
    ...mirror(['C', 1, 0.15, 0.07, 0.15, 0.05, 0.14, 0.05]), ...mirror(['C', 1, 0.15, 0.07, -0.15, 0.05, 0.14, 0.05]),
    ...bow(0, 0.47, 0.33, 0.06, 2, -0.2), ['S', 9, 0, 0.405, 0.33, 0.04, 0.04, 0.04], ['B', 3, 0, 0.39, 0.366, 0.03, 0.007, 0.008, 0, 0, 0, 1]]);
  const AH = [[0, 0.32, 0.3], [0.26, 0.2, 0.2]];
  def('axolotl', true, [0.75, 0.62, 1.15], [['#ffc8e0', '#ff9ac0', '#ff4a8a'], ['#c8e8ff', '#a8c8ff', '#5a8aff'], ['#f8f0e8', '#ffd8e0', '#ff6a8a'], ['#d8c8ff', '#ffc8f0', '#b85aff']], [
    ['Q', 0, 0, 0.22, -0.08, 0.38, 0.36, 0.34, P / 2, 0, 0], ['S', 0, 0, 0.32, 0.3, 0.26, 0.2, 0.2], ['S', 1, 0, 0.15, 0.0, 0.15, 0.07, 0.3, 0, 0, 0, 0, '-'],
    ...mirror(onF('S', 3, AH, 0.15, 0.05, [0.032, 0.032, 0.024], 0, 0.2)), smile(AH, -0.05, 0.08, 0.035), ...cheeks(AH, 0.18, -0.04, 0.035),
    ...[0, 1, 2].flatMap(i => { const a = 0.35 + i * 0.6, ax = Math.sin(a), ay = Math.cos(a); return mirror(['Q', 2, 0.22 + ax * 0.11, 0.38 + ay * 0.11, 0.26, 0.035, 0.1, 0.035, 0, 0, -a]); }),
    ...[0, 1, 2].flatMap(i => { const a = 0.35 + i * 0.6, ax = Math.sin(a), ay = Math.cos(a); return mirror(['S', 2, 0.22 + ax * 0.23, 0.38 + ay * 0.23, 0.26, 0.04, 0.04, 0.03, 0, 0, 0, 1]); }),
    ...mirror(['S', 0, 0.17, 0.08, 0.12, 0.07, 0.05, 0.09, 0, 0, 0.3]), ...mirror(['S', 0, 0.16, 0.08, -0.3, 0.07, 0.05, 0.09, 0, 0, 0.3]),
    ['S', 1, 0, 0.3, -0.48, 0.03, 0.14, 0.22, 0, 0, 0, 0, '-'], ['S', 1, 0, 0.42, -0.12, 0.025, 0.06, 0.25, 0, 0, 0, 0, '-'], tag(0.2, 0.12, 0.05, 0.9)]);
  // plastic and hard prizes
  def('duck', false, [0.8, 0.85, 0.7], pals([['#ffd84a', '#ff9a2a'], ['#ff8ad8', '#ffd23a'], ['#5ad8ff', '#ffd23a'], ['#f6f6f6', '#ff9a2a']]),
    [['S', 0, 0, 0.3, -0.03, 0.36, 0.28, 0.32], ['S', 0, 0, 0.66, 0.12, 0.2, 0.2, 0.2], ['S', 1, 0, 0.6, 0.32, 0.1, 0.04, 0.12], ...eyes(0.72, 0.28, 0.09, 0.03), ['K', 0, 0, 0.42, -0.38, 0.1, 0.18, 0.08, -P / 2 - 0.5, 0, 0], ...mirror(['S', 0, 0.3, 0.34, -0.04, 0.06, 0.15, 0.2])]);
  def('robot', false, [0.6, 1.0, 0.5], pals([['#9aa4b8', '#5ad8ff', '#ff5a5a'], ['#e8d84a', '#3a3a44', '#5aff8a'], ['#e86a6a', '#f0f0f0', '#5ad8ff']]),
    [['B', 0, 0, 0.36, 0, 0.42, 0.36, 0.3], ['B', 0, 0, 0.74, 0, 0.32, 0.26, 0.26], ['B', 1, 0, 0.38, 0.155, 0.22, 0.14, 0.01], ...mirror(['D', 4, 0.07, 0.76, 0.135, 0.05, 0.01, 0.05, P / 2, 0, 0]), ...mirror(['S', 3, 0.07, 0.76, 0.14, 0.025, 0.025, 0.01]),
      ['C', 7, 0, 0.93, 0, 0.012, 0.12, 0.012], ['S', 2, 0, 1.0, 0, 0.035, 0.035, 0.035], ...mirror(['C', 7, 0.26, 0.4, 0, 0.04, 0.3, 0.04, 0, 0, 0.3]), ...mirror(['B', 0, 0.1, 0.08, 0, 0.12, 0.16, 0.16]), ...[0, 1, 2].map(i => ['S', 2, -0.1 + i * 0.1, 0.48, 0.16, 0.02, 0.02, 0.01])]);
  def('sball', false, [0.6, 0.6, 0.6], pals([['#ff5a8a', '#ffffff'], ['#5ad8ff', '#ffffff'], ['#ffd23a', '#ffffff'], ['#5aff8a', '#2a2a3a']]),
    [['S', 0, 0, 0.3, 0, 0.3, 0.3, 0.3], ['t', 1, 0, 0.3, 0, 0.305, 0.305, 1.6, 0.4, 0, 0], ['t', 1, 0, 0.3, 0, 0.305, 0.305, 1.6, 0.4 + P / 2, 0, 0]]);
  def('gball', false, [0.6, 0.6, 0.6], pals([['#ff6ab0', '#ffe24a'], ['#9a8aff', '#5aff8a'], ['#4ae8ff', '#ff8ad8']]),
    [['S', 10, 0, 0.3, 0, 0.3, 0.3, 0.3], ['S', 0, 0, 0.3, 0, 0.2, 0.2, 0.2], ...[0, 1, 2, 3, 4, 5].map(i => ['S', 1, Math.sin(i * 2.1) * 0.12, 0.3 + Math.cos(i * 1.7) * 0.1, Math.cos(i * 2.1) * 0.12, 0.03, 0.03, 0.03])]);
  def('block', false, [0.6, 0.6, 0.6], pals([['#ff5a5a', '#ffffff'], ['#5ad8ff', '#ffffff'], ['#ffd23a', '#3a3a44'], ['#5aff8a', '#ffffff'], ['#b88aff', '#ffffff']]),
    [['R', 0, 0, 0.6, 0, 0.6, 0.6, 0.6], ['B', 1, 0, 0.3, 0.305, 0.32, 0.32, 0.01], ['B', 1, 0.305, 0.3, 0, 0.01, 0.32, 0.32], ['B', 0, 0, 0.3, 0.31, 0.2, 0.06, 0.01, 0, 0, 0.6], ['B', 0, 0.31, 0.3, 0, 0.01, 0.2, 0.06]]);
  def('teeth', false, [0.6, 0.5, 0.5], pals([['#ff8ab0', '#f0f0f0', '#ffb04a']]),
    [['H', 0, 0, 0.12, 0, 0.26, 0.12, 0.22], ['H', 0, 0, 0.36, 0, 0.26, 0.12, 0.22, P, 0, 0], ...[0, 1, 2, 3].map(i => ['B', 1, -0.15 + i * 0.1, 0.2, 0.18, 0.08, 0.08, 0.04]), ...[0, 1, 2, 3].map(i => ['B', 1, -0.15 + i * 0.1, 0.29, 0.18, 0.08, 0.08, 0.04]),
      ...mirror(['B', 2, 0.1, 0.03, 0.06, 0.08, 0.06, 0.16]), ['C', 7, 0, 0.24, -0.26, 0.02, 0.12, 0.02, P / 2, 0, 0], ['B', 7, 0, 0.24, -0.34, 0.16, 0.06, 0.02]]);
  def('car', false, [0.9, 0.5, 0.5], pals([['#ff5a5a', '#cfe8ff'], ['#5ad8ff', '#e8f8ff'], ['#ffd23a', '#e8f8ff'], ['#5aff8a', '#e8f8ff'], ['#b88aff', '#e8f8ff']]),
    [['R', 0, 0, 0.3, 0, 0.9, 0.22, 0.44], ['R', 0, -0.05, 0.46, 0, 0.5, 0.18, 0.38], ['B', 1, -0.05, 0.38, 0.19, 0.38, 0.1, 0.01], ['B', 1, -0.05, 0.38, -0.19, 0.38, 0.1, 0.01],
      ...[[0.28, 0.21], [-0.28, 0.21], [0.28, -0.21], [-0.28, -0.21]].map(([x, z]) => ['D', 3, x, 0.1, z, 0.1, 0.06, 0.1, P / 2, 0, 0]), ...[[0.28, 0.25], [-0.28, 0.25], [0.28, -0.25], [-0.28, -0.25]].map(([x, z]) => ['D', 7, x, 0.1, z, 0.05, 0.01, 0.05, P / 2, 0, 0]), ...mirror(['S', 9, 0.45, 0.2, 0.13, 0.03, 0.03, 0.03])]);
  def('yoyo', false, [0.5, 0.5, 0.3], pals([['#ff5a5a', '#ffd23a'], ['#5ad8ff', '#ffffff'], ['#b88aff', '#5aff8a']]),
    [['D', 0, 0, 0.25, 0.07, 0.25, 0.08, 0.25, P / 2, 0, 0], ['D', 0, 0, 0.25, -0.07, 0.25, 0.08, 0.25, P / 2, 0, 0], ['D', 1, 0, 0.25, 0.115, 0.15, 0.01, 0.15, P / 2, 0, 0], ['C', 4, 0, 0.25, 0, 0.04, 0.08, 0.04, P / 2, 0, 0], ['Q', 4, 0.1, 0.5, 0, 0.012, 0.4, 0.012, 0, 0, 0.3]]);
  def('ring', false, [0.6, 0.15, 0.6], pals([['#ff8ad8', '#ffffff'], ['#5ad8ff', '#ffffff'], ['#ffd23a', '#ff5a5a'], ['#5aff8a', '#ffffff']]),
    [['T', 0, 0, 0.08, 0, 0.3, 0.3, 0.3, P / 2, 0, 0], ['t', 1, 0, 0.08, 0, 0.3, 0.3, 1.4, P / 2, 0, 0]]);
  def('whistle', false, [0.6, 0.35, 0.3], pals([['#ff5a5a', '#c8ccd6'], ['#5ad8ff', '#c8ccd6'], ['#ffd23a', '#c8ccd6']]),
    [['C', 0, 0.06, 0.15, 0, 0.15, 0.22, 0.15, P / 2, 0, 0], ['B', 0, -0.16, 0.2, 0, 0.26, 0.08, 0.14], ['B', 3, 0.02, 0.24, 0, 0.06, 0.02, 0.1], ['T', 7, 0.24, 0.24, 0, 0.05, 0.05, 0.05, 0, P / 2, 0]]);
  def('keyring', false, [0.4, 0.5, 0.2], pals([['#ff8ad8', '#c8ccd6'], ['#5aff8a', '#c8ccd6'], ['#ffd23a', '#c8ccd6']]),
    [['T', 7, 0, 0.42, 0, 0.08, 0.08, 0.08], ['C', 7, 0, 0.3, 0, 0.008, 0.08, 0.008], ['S', 0, 0, 0.16, 0, 0.12, 0.12, 0.1], ...eyes(0.18, 0.09, 0.04, 0.018), ['S', 0, -0.07, 0.25, 0, 0.04, 0.04, 0.03], ['S', 0, 0.07, 0.25, 0, 0.04, 0.04, 0.03]]);
  def('sticker', false, [0.6, 0.05, 0.8], pals([['#ff8ad8', '#5ad8ff', '#ffd23a'], ['#5aff8a', '#b88aff', '#ff5a5a']]),
    [['B', 4, 0, 0.012, 0, 0.6, 0.02, 0.8], ...[0, 1, 2, 3, 4, 5].map(i => ['D', i % 3, -0.15 + (i % 2) * 0.3, 0.03, -0.25 + Math.floor(i / 2) * 0.25, 0.09, 0.01, 0.09]), ['X', 2, 0.0, 0.03, 0.0, 0.06, 0.06, 0.02, -P / 2, 0, 0]]);
  def('sweet', false, [0.8, 0.3, 0.3], pals([['#ff5a8a', '#ffd23a'], ['#5ad8ff', '#ffffff'], ['#5aff8a', '#ff8ad8'], ['#b88aff', '#ffd23a']]),
    [['C', 0, 0, 0.14, 0, 0.13, 0.36, 0.13, 0, 0, P / 2], ['K', 1, 0.28, 0.14, 0, 0.12, 0.2, 0.12, 0, 0, P / 2], ['K', 1, -0.28, 0.14, 0, 0.12, 0.2, 0.12, 0, 0, -P / 2], ['t', 1, 0, 0.14, 0, 0.135, 0.135, 0.135, 0, P / 2, 0]]);
  def('bracelet', false, [0.5, 0.15, 0.5], pals([['#ff8ad8', '#ffd23a', '#5ad8ff'], ['#5aff8a', '#b88aff', '#ffffff']]),
    [['t', 0, 0, 0.05, 0, 0.22, 0.22, 0.22, P / 2, 0, 0], ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => ['S', i % 2 ? 1 : 2, Math.sin(i * P / 4) * 0.22, 0.05, Math.cos(i * P / 4) * 0.22, 0.045, 0.045, 0.045])]);
  def('globe', false, [0.5, 0.7, 0.5], pals([['#e86a8a', '#3a8a4a', '#ffffff'], ['#5a7ae8', '#3a8a4a', '#ffffff']]),
    [['C', 0, 0, 0.08, 0, 0.22, 0.16, 0.22], ['C', 9, 0, 0.17, 0, 0.18, 0.03, 0.18], ['K', 1, 0, 0.34, 0, 0.08, 0.2, 0.08], ['C', 2, 0, 0.18, 0, 0.12, 0.03, 0.12], ['S', 4, 0.06, 0.5, 0.02, 0.012, 0.012, 0.012], ['S', 4, -0.07, 0.42, -0.03, 0.012, 0.012, 0.012], ['S', 10, 0, 0.42, 0, 0.22, 0.22, 0.22]]);
  def('top', false, [0.5, 0.6, 0.5], pals([['#ff5a5a', '#ffd23a'], ['#5ad8ff', '#ffffff'], ['#5aff8a', '#b88aff']]),
    [['K', 0, 0, 0.16, 0, 0.24, 0.3, 0.24, P, 0, 0], ['D', 1, 0, 0.33, 0, 0.26, 0.06, 0.26], ['K', 0, 0, 0.42, 0, 0.2, 0.12, 0.2], ['C', 7, 0, 0.54, 0, 0.03, 0.14, 0.03], ['S', 1, 0, 0.62, 0, 0.04, 0.04, 0.04]]);
  def('rocket', false, [0.4, 1.0, 0.4], pals([['#f6f6f6', '#ff5a5a', '#5ad8ff'], ['#5ad8ff', '#ffd23a', '#ffffff'], ['#ffd23a', '#b88aff', '#ffffff']]),
    [['C', 0, 0, 0.5, 0, 0.14, 0.56, 0.14], ['K', 1, 0, 0.9, 0, 0.14, 0.24, 0.14], ...[0, 1, 2].map(i => ['B', 1, Math.sin(i * 2.09) * 0.16, 0.2, Math.cos(i * 2.09) * 0.16, 0.02, 0.24, 0.14, 0, i * 2.09, 0]), ['D', 2, 0, 0.6, 0.13, 0.07, 0.02, 0.07, P / 2, 0, 0], ['t', 7, 0, 0.6, 0.135, 0.07, 0.07, 0.07], ['K', 9, 0, 0.12, 0, 0.08, 0.12, 0.08, P, 0, 0]]);
  def('train', false, [0.9, 0.6, 0.5], pals([['#ff5a5a', '#2a2a3a', '#ffd23a'], ['#5aff8a', '#2a2a3a', '#ffd23a'], ['#5ad8ff', '#2a2a3a', '#ff8ad8']]),
    [['C', 0, 0.12, 0.28, 0, 0.18, 0.5, 0.18, 0, 0, P / 2], ['B', 0, -0.25, 0.36, 0, 0.3, 0.42, 0.38], ['B', 1, -0.25, 0.6, 0, 0.36, 0.05, 0.44], ['C', 1, 0.28, 0.52, 0, 0.06, 0.16, 0.06], ['B', 4, -0.25, 0.44, 0.195, 0.18, 0.14, 0.01],
      ...[-0.3, 0, 0.28].map(x => ['D', 2, x, 0.1, 0.2, 0.1, 0.04, 0.1, P / 2, 0, 0]), ...[-0.3, 0, 0.28].map(x => ['D', 2, x, 0.1, -0.2, 0.1, 0.04, 0.1, P / 2, 0, 0]), ['K', 1, 0.4, 0.12, 0, 0.14, 0.12, 0.2, 0, 0, -P / 2]]);
  def('pin', false, [0.4, 1.0, 0.4], pals([['#f6f6f6', '#ff5a5a'], ['#f6f6f6', '#5ad8ff']]),
    [['S', 0, 0, 0.28, 0, 0.19, 0.28, 0.19], ['C', 0, 0, 0.6, 0, 0.08, 0.24, 0.08], ['S', 0, 0, 0.84, 0, 0.11, 0.14, 0.11], ['t', 1, 0, 0.6, 0, 0.09, 0.09, 0.4, P / 2, 0, 0], ['t', 1, 0, 0.66, 0, 0.085, 0.085, 0.4, P / 2, 0, 0]]);
  def('trophy', false, [0.5, 0.8, 0.4], pals([['#ffd23a', '#3a3a44'], ['#c8ccd6', '#3a3a44']]),
    [['B', 1, 0, 0.06, 0, 0.3, 0.12, 0.3], ['C', 0, 0, 0.22, 0, 0.04, 0.2, 0.04], ['K', 0, 0, 0.5, 0, 0.2, 0.36, 0.2, P, 0, 0], ...mirror(['T', 0, 0.2, 0.52, 0, 0.07, 0.07, 0.07, 0, P / 2, 0]), ['X', 4, 0, 0.5, 0.15, 0.05, 0.05, 0.02]]);
  def('spring', false, [0.5, 0.6, 0.5], pals([['#ff8ad8'], ['#5aff8a'], ['#ffd23a'], ['#c8ccd6']]),
    [...[0, 1, 2, 3, 4, 5, 6].map(i => ['T', 0, 0, 0.05 + i * 0.08, 0, 0.22, 0.22, 0.22, P / 2 + 0.06, 0, 0])]);
  def('crayon', false, [0.3, 1.0, 0.3], pals([['#ff5a5a', '#f6f0e0'], ['#5ad8ff', '#f6f0e0'], ['#5aff8a', '#f6f0e0'], ['#b88aff', '#f6f0e0'], ['#ffd23a', '#f6f0e0']]),
    [['C', 0, 0, 0.38, 0, 0.12, 0.76, 0.12], ['K', 0, 0, 0.86, 0, 0.12, 0.2, 0.12], ['C', 1, 0, 0.42, 0, 0.122, 0.46, 0.122], ['t', 0, 0, 0.2, 0, 0.122, 0.122, 0.4, P / 2, 0, 0], ['t', 0, 0, 0.64, 0, 0.122, 0.122, 0.4, P / 2, 0, 0]]);
  def('dice', true, [0.6, 0.6, 0.6], pals([['#ffffff', '#ff5a8a'], ['#ffd8f0', '#3a3a44'], ['#d8f8ff', '#3a3a44']]),
    [['R', 0, 0, 0.6, 0, 0.6, 0.6, 0.6], ['S', 1, 0, 0.3, 0.3, 0.06, 0.06, 0.02], ['S', 1, 0.14, 0.44, 0.3, 0.05, 0.05, 0.02], ['S', 1, -0.14, 0.16, 0.3, 0.05, 0.05, 0.02], ['S', 1, 0.3, 0.3, 0, 0.02, 0.06, 0.06], ['S', 1, 0.3, 0.42, 0.12, 0.02, 0.05, 0.05], ['S', 1, 0.3, 0.18, -0.12, 0.02, 0.05, 0.05]]);
  def('lolly', false, [0.5, 1.0, 0.2], pals([['#ff5a8a', '#ffffff'], ['#5ad8ff', '#ffffff'], ['#5aff8a', '#ffd23a']]),
    [['C', 4, 0, 0.3, 0, 0.02, 0.6, 0.02], ['D', 0, 0, 0.78, 0, 0.22, 0.08, 0.22, P / 2, 0, 0], ['t', 1, 0, 0.78, 0.045, 0.15, 0.15, 0.6], ['t', 1, 0, 0.78, 0.045, 0.08, 0.08, 0.6], ['t', 1, 0, 0.78, -0.045, 0.15, 0.15, 0.6]]);
  def('capsule', false, [0.6, 0.6, 0.6], pals([['#ff5a8a', '#cfe8ff'], ['#5ad8ff', '#cfe8ff'], ['#ffd23a', '#cfe8ff'], ['#5aff8a', '#cfe8ff'], ['#b88aff', '#cfe8ff']]),
    [['H', 0, 0, 0.3, 0, 0.3, 0.3, 0.3, P, 0, 0], ['H', 10, 0, 0.3, 0, 0.3, 0.3, 0.3], ['t', 0, 0, 0.3, 0, 0.3, 0.3, 0.5, P / 2, 0, 0]]);
  def('noodle', false, [0.5, 0.6, 0.5], pals([['#f6f0e0', '#ff5a5a', '#ffd23a']]),
    [['C', 0, 0, 0.25, 0, 0.2, 0.5, 0.2], ['D', 1, 0, 0.5, 0, 0.22, 0.02, 0.22], ['t', 1, 0, 0.18, 0, 0.2, 0.2, 0.6, P / 2, 0, 0], ['X', 2, 0, 0.32, 0.2, 0.06, 0.06, 0.02]]);
  def('drum', false, [0.6, 0.45, 0.6], pals([['#ff5a5a', '#f6f0e0', '#ffd23a'], ['#5ad8ff', '#f6f0e0', '#ffd23a']]),
    [['C', 0, 0, 0.2, 0, 0.28, 0.36, 0.28], ['D', 1, 0, 0.39, 0, 0.29, 0.02, 0.29], ['t', 2, 0, 0.38, 0, 0.29, 0.29, 0.6, P / 2, 0, 0], ['t', 2, 0, 0.03, 0, 0.29, 0.29, 0.6, P / 2, 0, 0], ['C', 4, 0.12, 0.55, 0.05, 0.015, 0.4, 0.015, 0.5, 0, 0.6], ['S', 2, 0.24, 0.72, 0.15, 0.03, 0.03, 0.03]]);

  const NAMES = Object.keys(K);

  /* ---------- building ---------- */
  // one kind's parts merged per material and slot: [{ mat, slot, geo }]
  // the heaps use a lighter version of every shape (thousands of prizes at once; the big toys use the full ones)
  const SHL = {
    S: () => geo('lS', () => new T.SphereGeometry(1, 8, 5)),
    H: () => geo('lH', () => new T.SphereGeometry(1, 9, 4, 0, P * 2, 0, P / 2)),
    B: SH.B,
    R: () => geo('lR', () => K3D.roundBox(1, 1, 1, 0.42, 9).translate(0, -0.5, 0)),
    C: () => geo('lC', () => new T.CylinderGeometry(1, 1, 1, 9)),
    K: () => geo('lK', () => new T.ConeGeometry(1, 1, 8)),
    T: () => geo('lT', () => new T.TorusGeometry(1, 0.28, 5, 12)),
    t: () => geo('lt', () => new T.TorusGeometry(1, 0.06, 3, 14)),
    Q: () => geo('lQ', () => new T.CapsuleGeometry(0.5, 1, 2, 7)),
    D: () => geo('lD', () => new T.CylinderGeometry(1, 1, 1, 11)),
    X: SH.X, Y: () => geo('lY', () => heartGeo(5, 1)),
    A: () => geo('lA', () => new T.TorusGeometry(1, 0.16, 4, 9, P).rotateZ(P)),
    U: () => geo('lU', () => new T.TorusGeometry(1, 0.3, 5, 9, P * 0.7).rotateZ(P * 1.15)),
  };
  // the in-between shapes: the big round parts of prizes near the camera (their outlines are what the eye reads)
  const SHM = {
    S: () => geo('mS', () => new T.SphereGeometry(1, 13, 8)),
    H: () => geo('mH', () => new T.SphereGeometry(1, 13, 5, 0, P * 2, 0, P / 2)),
    B: SH.B,
    R: () => geo('mR', () => K3D.roundBox(1, 1, 1, 0.42, 13).translate(0, -0.5, 0)),
    C: () => geo('mC', () => new T.CylinderGeometry(1, 1, 1, 14)),
    K: () => geo('mK', () => new T.ConeGeometry(1, 1, 12)),
    T: () => geo('mT', () => new T.TorusGeometry(1, 0.28, 7, 18)),
    t: SHL.t,
    Q: () => geo('mQ', () => new T.CapsuleGeometry(0.5, 1, 3, 11)),
    D: () => geo('mD', () => new T.CylinderGeometry(1, 1, 1, 15)),
    X: SH.X, Y: () => geo('mY', () => heartGeo(8, 2)),
    A: () => geo('mA', () => new T.TorusGeometry(1, 0.16, 5, 12, P).rotateZ(P)),
    U: () => geo('mU', () => new T.TorusGeometry(1, 0.3, 6, 11, P * 0.7).rotateZ(P * 1.15)),
  };
  // the tiny bits on the heaps (catchlights, toe beans, nostrils): a few faces are plenty at that size
  const SHT = { S: () => geo('tS', () => new T.SphereGeometry(1, 7, 4)) };
  // a plush part's seam, worked out on the unit shape before it is placed: (distance from the seam, distance along it, 1)
  // in the kind's own units, so the stitches keep one size whatever the part's size
  const SEAMED = 'SHQXY';
  function seamOf(p, g, soft) {
    const pos = g.attributes.position, n = pos.count, a = new Float32Array(n * 3), sh = p[0];
    const ax = p[12] || (sh === 'X' || sh === 'Y' ? 'z' : 'x'), head = ax === 'h';
    if (soft && p[1] <= 2 && p[11] !== 1 && ax !== '-' && SEAMED.includes(sh) && Math.max(p[5], p[6], p[7]) >= 0.09) {
      for (let i = 0; i < n; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        // (the distance along wraps round underneath, where nobody looks)
        if (ax === 'x' || head) { a[i * 3] = x * p[5]; a[i * 3 + 1] = sh === 'Q' ? y * p[6] : Math.atan2(z, y) * (p[6] + p[7]) / 2; }
        else { a[i * 3] = z * p[7]; a[i * 3 + 1] = sh === 'Q' ? y * p[6] : Math.atan2(x, y) * (p[5] + p[6]) / 2; }
        a[i * 3 + 2] = head && z > 0.3 && y < 0.85 ? 0 : 1;
      }
    }
    g.setAttribute('seam', new T.BufferAttribute(a, 3));
  }
  const FUZZ_D = 2.2; // the fuzz texture's tiles per unit: the same fine nap on a big tummy and a little paw
  function partGeo(p, lo, soft) {
    const mx = Math.max(p[5], p[6], p[7]);
    const set = !lo ? SH : mx < 0.035 ? SHT : lo === 'mid' && mx >= 0.2 ? SHM : SHL;
    const g = (set[p[0]] || SHL[p[0]])().clone();
    seamOf(p, g, soft);
    if (soft && g.attributes.uv && p[1] !== 3 && p[1] !== 6 && p[1] < 9) {
      const R = (p[5] + p[6] + p[7]) / 3, nu = Math.max(1, Math.round(2 * P * R * FUZZ_D)), nv = Math.max(1, Math.round(P * R * FUZZ_D)), uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * nu, uv.getY(i) * nv);
    }
    const m = new T.Matrix4().compose(new T.Vector3(p[2], p[3], p[4]), new T.Quaternion().setFromEuler(new T.Euler(p[8] || 0, p[9] || 0, p[10] || 0)), new T.Vector3(p[5], p[6], p[7]));
    g.applyMatrix4(m);
    return g.index ? g.toNonIndexed() : g;
  }
  function merge(list) {
    let n = 0; for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), seam = new Float32Array(n * 3);
    let k = 0;
    for (const g of list) {
      const a = g.attributes;
      pos.set(a.position.array, k * 3); nor.set(a.normal.array, k * 3);
      if (a.uv) uv.set(a.uv.array, k * 2);
      if (a.seam) seam.set(a.seam.array, k * 3);
      k += a.position.count; g.dispose();
    }
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); out.setAttribute('uv', new T.BufferAttribute(uv, 2));
    out.setAttribute('seam', new T.BufferAttribute(seam, 3));
    out.computeBoundingSphere();
    return out;
  }
  // (cached per scene by K3D.geo, so a new scene builds them again; lo: the heaps' lighter shapes: 'mid' the near heaps,
  // which keep the fine details down to the catchlights; true the far piles, which drop them and every tiny part)
  const keep = (p, lo) => { if (!lo) return true; const mx = Math.max(p[5], p[6], p[7]); return lo === 'mid' ? mx >= 0.012 : mx >= 0.035 && p[11] !== 1; };
  const merged = (name, lo) => {
    const kd = K[name];
    const slots = kd._slots || (kd._slots = [...new Set(kd.parts.map(p => p[1]))]);
    const out = [];
    for (const slot of slots) {
      const parts = kd.parts.filter(p => p[1] === slot && keep(p, lo));
      if (!parts.length) continue;
      out.push({ slot, mat: slotMat(slot, kd.soft), geo: geo('k|' + name + '|' + slot + (lo ? '|' + lo : ''), () => merge(parts.map(p => partGeo(p, lo, kd.soft)))) });
    }
    return out;
  };
  // one prize as its own group (palette index or colours)
  function build(name, o = {}) {
    const kd = K[name], g = new T.Group();
    const pal = Array.isArray(o.pal) ? o.pal : kd.pals[(o.pal || 0) % kd.pals.length];
    for (const m of merged(name)) {
      const mt = K3D.mat('act-one|' + m.mat + '|' + slotCol(m.slot, pal), () => { const base = mat(m.mat), c = base.clone(); c.color = new T.Color(slotCol(m.slot, pal)); c.onBeforeCompile = base.onBeforeCompile; c.customProgramCacheKey = base.customProgramCacheKey; return c; });
      const big = m.slot <= 2 || m.slot === 4 || m.slot === 7 || m.slot === 9;
      const mesh = K3D.mesh(m.geo, mt, { ink: o.ink === false || !big ? false : A.INK, inkW: o.inkW || 0.9 });
      g.add(mesh);
    }
    g.userData.kind = name;
    return g;
  }

  /* ---------- the heaps: one instanced mesh per kind and slot ---------- */
  function field(K3, cap = 6000, fo = {}) {
    const items = [];
    const f = {
      add(kind, x, y, z, o = {}) { if (!K[kind]) return; items.push({ kind, x, y, z, o }); return items.length - 1; },
      count: () => items.length,
      done() {
        const byKind = new Map();
        for (const it of items) { if (!byKind.has(it.kind)) byKind.set(it.kind, []); byKind.get(it.kind).push(it); }
        const group = new T.Group(); group.name = 'prizeField';
        const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), s = new T.Vector3(), col = new T.Color();
        for (const [kind, list] of byKind) {
          const kd = K[kind];
          for (const part of merged(kind, fo.lo || true)) {
            const im = new T.InstancedMesh(part.geo, mat(part.mat), list.length);
            list.forEach((it, i) => {
              const o = it.o, sc = o.s || 1;
              e.set(o.tilt || 0, o.yaw || 0, o.roll || 0, 'YXZ'); q.setFromEuler(e);
              v.set(it.x, it.y, it.z); s.set(sc * (o.sx || 1), sc * (o.sy || 1), sc * (o.sz || 1));
              m4.compose(v, q, s); im.setMatrixAt(i, m4);
              const pal = Array.isArray(o.pal) ? o.pal : kd.pals[(o.pal != null ? o.pal : i) % kd.pals.length];
              col.set(slotCol(part.slot, pal));
              // tone: o.g greys it toward its own lightness, o.k darkens it (walls and far piles sit back; what Bo walks on stays bright)
              const tg = o.g != null ? o.g : fo.g, tk = o.k != null ? o.k : fo.k;
              if (tg) { const l = col.r * 0.3 + col.g * 0.59 + col.b * 0.11; col.r += (l - col.r) * tg; col.g += (l - col.g) * tg; col.b += (l - col.b) * tg; }
              if (tk != null && part.slot !== 3) col.multiplyScalar(tk);
              im.setColorAt(i, col);
            });
            im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
            im.castShadow = false; im.receiveShadow = true;
            im.computeBoundingSphere();
            // (its outline is culled with it: off screen, neither is drawn)
            if (part.slot <= 2 && fo.ink !== false) { const o = K3D.ink(im, A.INK, 0.8); o.frustumCulled = true; o.boundingSphere = im.boundingSphere.clone(); o.boundingSphere.radius += 0.3; }
            group.add(im);
          }
        }
        K3.add(group);
        return group;
      },
    };
    return f;
  }

  /* ---------- the toys the claw picks up (full size, from the map) ---------- */
  const hiMat = (col) => K3D.mat('act-hi|' + col, () => new T.ShaderMaterial({
    uniforms: { uPx: K3D.inkU.uPx, uScale: K3D.inkU.uScale, uCol: { value: hot(col, 1.6) }, uT: { value: 0 } },
    vertexShader: `attribute vec3 inkNormal; uniform float uPx, uScale;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * inkNormal);
        mv.xyz += n * 4.2 * uScale * uPx * max(0.5, -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, 1.0); }',
    side: T.BackSide, depthWrite: false,
  }));
  // a label on a box: a printed price tag hanging by a string
  const bigTag = (w) => {
    const g = new T.Group();
    const card = new T.Mesh(new T.PlaneGeometry(0.34 * w, 0.5 * w), K3D.toon('#ffffff', { map: tagTex(), side: T.DoubleSide }));
    card.position.y = -0.28 * w; g.add(card);
    const str = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.1 * w, 4), K3D.toon('#e8e0d0')); str.position.y = -0.0; g.add(str);
    return g;
  };
  function big(K3, t) {
    const g = new T.Group(); g.name = 'toy:' + t.id;
    const body = new T.Group(); g.add(body);
    const kindMap = { whale: 'whale', duck: 'duck', bear: 'bear', gball: 'gball', block: 'block', ring: 'ring', robot: 'robot', snake: null };
    const add = (name, pal, sx, sy, sz, x = 0, y = 0, z = 0, ry = 0) => {
      const m = build(name, { pal, inkW: 1.2 }); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.y = ry; body.add(m); return m;
    };
    let handle = null;
    const pal = (k, c) => [c || t.col, K[k].pals[0][1], K[k].pals[0][2]];
    if (t.kind === 'whale') {
      // the giant plush whale: its long axis along local x, a ribbon of stitching, a printed tag on its fin, a smile
      add('whale', pal('whale'), t.w / 1.3, t.h / 0.78, t.d / 0.8, 0, 0, 0, 0);
      const tg = bigTag(2.2); tg.position.set(-1.6, t.h * 0.42, t.d * 0.5); tg.rotation.set(0, 0, 0.3); body.add(tg);
      // a patch and its stitches on the flank (a mended seam)
      const patch = new T.Mesh(new T.CircleGeometry(0.42, 12), K3D.toon('#ffe24a', { map: fuzzTex() })); patch.position.set(1.2, t.h * 0.66, t.d * 0.47); patch.rotation.set(-0.3, 0.2, 0); body.add(patch);
      for (let i = 0; i < 10; i++) { const a = i / 10 * P * 2; const st = new T.Mesh(new T.BoxGeometry(0.12, 0.025, 0.02), K3D.toon('#3a2a44')); st.position.set(1.2 + Math.cos(a) * 0.44, t.h * 0.66 + Math.sin(a) * 0.44, t.d * 0.48); st.rotation.set(-0.3, 0.2, a); body.add(st); }
    } else if (t.kind === 'snake') {
      // the plush snake: a coil until first lifted, then a long soft body (built both ways, one shown)
      const straight = new T.Group(), coil = new T.Group(); straight.name = 'snakeStraight'; coil.name = 'snakeCoil';
      const n = 14, fz = fuzzTex();
      const mA = K3D.mat('act-snake|' + t.col, () => seamed(rimify(K3D.toon(t.col, { map: fz }), '1.0, 0.95, 0.8', 0.4, 2.2, 'plush-snake'), 'plush-snake'));
      const mB = K3D.mat('act-snakeB', () => seamed(rimify(K3D.toon('#ffe24a', { map: fz }), '1.0, 0.95, 0.8', 0.4, 2.2, 'plush-snakeB'), 'plush-snakeB'));
      // (each ball of it seamed along its top and belly, so one long seam runs nose to tail)
      const sph = () => K3D.geo('act-sph-seam', () => { const gg = new T.SphereGeometry(1, 16, 12); seamOf(['S', 0, 0, 0, 0, 0.4, 0.4, 0.4, 0, 0, 0, 0, 'z'], gg, true); return gg; });
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), r = 0.32 + Math.sin(u * P) * 0.14 - (u > 0.9 ? (u - 0.9) * 2 : 0);
        const s = K3D.mesh(sph(), i % 3 === 1 ? mB : mA, { ink: A.INK, inkW: 1 });
        s.scale.set(t.w / n * 0.8, r * 0.75, r); s.position.set(-t.w / 2 + (i + 0.5) * t.w / n, r * 0.62, Math.sin(u * P * 3) * 0.06); straight.add(s);
      }
      const head = K3D.mesh(sph(), mA, { ink: A.INK, inkW: 1 }); head.scale.set(0.5, 0.36, 0.44); head.position.set(t.w / 2 + 0.1, 0.38, 0); straight.add(head);
      // its face: catchlights, rosy cheeks and a stitched smile
      const shineM = mat('shine'), cheekM = K3D.mat('act-snakeCheek', () => K3D.toon('#ff9ab8', { map: fz }));
      const smileM = K3D.mat('act-smile', () => K3D.toon('#17121a'));
      for (const z of [-1, 1]) {
        const cl = new T.Mesh(K3D.geo('act-cl', () => new T.SphereGeometry(1, 10, 8)), shineM); cl.scale.setScalar(0.032); cl.position.set(t.w / 2 + 0.45, 0.6, z * 0.2 - 0.03); straight.add(cl);
        const ck = new T.Mesh(K3D.geo('act-cl', () => new T.SphereGeometry(1, 10, 8)), cheekM); ck.scale.set(0.09, 0.06, 0.025); ck.position.set(t.w / 2 + 0.36, 0.42, z * 0.37); ck.rotation.y = z * 0.5; straight.add(ck);
      }
      const sm = new T.Mesh(K3D.geo('act-smileArc', () => new T.TorusGeometry(1, 0.16, 6, 14, P).rotateZ(P)), smileM); sm.scale.setScalar(0.11); sm.position.set(t.w / 2 + 0.6, 0.4, 0); sm.rotation.y = P / 2; straight.add(sm);
      for (const s of [-1, 1]) { const e = K3D.mesh(new T.SphereGeometry(0.09, 10, 8), mat('eye'), { ink: false }); e.material = K3D.mat('act-eyeblk', () => { const c = mat('eye').clone(); c.color = new T.Color('#17121a'); c.onBeforeCompile = mat('eye').onBeforeCompile; c.customProgramCacheKey = mat('eye').customProgramCacheKey; return c; }); e.position.set(t.w / 2 + 0.38, 0.55, s * 0.2); straight.add(e); }
      const tongue = new T.Mesh(new T.BoxGeometry(0.4, 0.03, 0.08), K3D.toon('#ff5a7a')); tongue.position.set(t.w / 2 + 0.75, 0.3, 0); straight.add(tongue);
      const tg = bigTag(1.4); tg.position.set(-t.w / 2 + 0.6, 0.6, 0.4); straight.add(tg);
      for (let i = 0; i < 26; i++) {
        const a = i * 0.55, r = 0.75 - i * 0.022, y = 0.22 + i * 0.022;
        const s = K3D.mesh(sph(), i % 3 === 1 ? mB : mA, { ink: A.INK, inkW: 1 }); s.scale.setScalar(0.24); s.position.set(Math.cos(a) * r, y, Math.sin(a) * r); coil.add(s);
      }
      const ch = head.clone(); ch.position.set(0, 0.95, 0.1); ch.scale.set(0.36, 0.28, 0.32); coil.add(ch);
      for (const s of [-1, 1]) {
        const e = new T.Mesh(new T.SphereGeometry(0.065, 8, 6), K3D.toon('#17121a')); e.position.set(s * 0.13, 1.04, 0.36); coil.add(e);
        const cl = new T.Mesh(K3D.geo('act-cl', () => new T.SphereGeometry(1, 10, 8)), shineM); cl.scale.setScalar(0.022); cl.position.set(s * 0.13 - 0.025, 1.07, 0.41); coil.add(cl);
        const ck = new T.Mesh(K3D.geo('act-cl', () => new T.SphereGeometry(1, 10, 8)), cheekM); ck.scale.set(0.06, 0.04, 0.02); ck.position.set(s * 0.21, 0.98, 0.33); ck.rotation.y = s * 0.5; coil.add(ck);
      }
      const csm = new T.Mesh(K3D.geo('act-smileArc', () => new T.TorusGeometry(1, 0.16, 6, 14, P).rotateZ(P)), smileM); csm.scale.setScalar(0.07); csm.position.set(0, 0.99, 0.41); coil.add(csm);
      body.add(straight, coil);
      g.userData.snake = { straight, coil };
    } else if (t.kind === 'duck') {
      add('duck', pal('duck'), t.w / 0.8, t.h / 0.88, t.d / 0.72, 0, 0, 0, P / 2);
      // the ribbon handle: a loop of red-and-white ribbon tied round its neck, the loop hanging at the side Bo reaches
      handle = new T.Group(); handle.position.set(t.handle[0], t.handle[1], t.handle[2]); body.add(handle);
    } else if (t.kind === 'ring') {
      add('ring', pal('ring'), t.w / 0.6, t.h / 0.16, t.d / 0.6);
      handle = new T.Group(); handle.position.set(t.handle[0], t.handle[1], t.handle[2]); body.add(handle);
    } else if (t.kind === 'robot') {
      add('robot', ['#9aa4b8', '#5ad8ff', '#ff5a5a'], t.w / 0.6, t.h / 1.02, t.d / 0.5);
      // a printed HEAVY plate on its chest and a wind-up key in its back
      const plate = new T.Mesh(new T.PlaneGeometry(0.9, 0.3), K3D.toon('#ffffff', { map: K3D.paint('act-heavy', 128, 48, (c, w, h) => { c.fillStyle = '#ffd23a'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1a1a'; for (let x = -h; x < w; x += 18) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 9, h); c.lineTo(x + 9 + h, 0); c.lineTo(x + h, 0); c.fill(); } c.fillStyle = '#ffd23a'; c.fillRect(18, 10, w - 36, h - 20); c.fillStyle = '#1a1a1a'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.fillText('HEAVY', w / 2, h / 2 + 8); }) }));
      plate.position.set(0, t.h * 0.22, t.d * 0.52); body.add(plate);
      const key = new T.Group(); key.position.set(0, t.h * 0.42, -t.d * 0.5); body.add(key);
      key.add(K3D.mesh(new T.CylinderGeometry(0.06, 0.06, 0.4, 8).rotateX(P / 2).translate(0, 0, -0.2), mat('metal'), { ink: A.INK }));
      for (const s of [-1, 1]) { const b = K3D.mesh(new T.TorusGeometry(0.18, 0.05, 6, 14), K3D.toon('#c8ccd6'), { ink: A.INK, inkW: 0.8 }); b.position.set(s * 0.22, 0, -0.42); b.rotation.y = P / 2; key.add(b); }
      key.userData.live = true; g.userData.key = key;
    } else if (kindMap[t.kind]) {
      const k = kindMap[t.kind], kd = K[k];
      add(k, [t.col, kd.pals[0][1], kd.pals[0][2]], t.w / kd.size[0], t.h / kd.size[1], t.d / kd.size[2]);
      if (t.letter) {
        const lt = K3D.paint('act-letter|' + t.letter, 128, 128, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.strokeStyle = t.col; c.lineWidth = 10; c.strokeRect(8, 8, w - 16, h - 16); c.fillStyle = t.col; c.font = 'bold 86px sans-serif'; c.textAlign = 'center'; c.fillText(t.letter, w / 2, h / 2 + 30); });
        for (const [x, z, ry] of [[0, t.d / 2 + 0.012, 0], [t.w / 2 + 0.012, 0, P / 2], [0, -t.d / 2 - 0.012, P], [-t.w / 2 - 0.012, 0, -P / 2]]) { const f = new T.Mesh(new T.PlaneGeometry(t.w * 0.72, t.h * 0.72), K3D.toon('#ffffff', { map: lt })); f.position.set(x, t.h / 2, z); f.rotation.y = ry; body.add(f); }
      }
      if (t.loseEye) { const e = new T.Mesh(new T.SphereGeometry(0.055, 8, 6), K3D.toon('#17121a')); e.position.set(0.13 * t.w / 0.75, 0.82 * t.h / 1.08, 0.26 * t.d / 0.7); body.add(e); g.userData.eye = e; }
    }
    // a carrier's handle: a loop of ribbon (it glows blue when Bo is near)
    if (handle) {
      const rib = K3D.mesh(new T.TorusGeometry(0.34, 0.06, 8, 24).scale(1, 1.4, 0.4), K3D.toon('#ffffff', { map: K3D.paint('act-rib', 64, 16, (c, w, h) => { for (let x = 0; x < w; x += 8) { c.fillStyle = (x / 8) % 2 ? '#ff5a7a' : '#ffffff'; c.fillRect(x, 0, 8, h); } }, { repeat: true }) }), { ink: A.INK, inkW: 0.8 });
      rib.position.y = -0.4; handle.add(rib);
      const bow = K3D.mesh(new T.SphereGeometry(0.12, 10, 8), K3D.toon('#ff5a7a'), { ink: A.INK, inkW: 0.6 }); bow.scale.set(1.6, 0.8, 0.6); bow.position.y = 0.05; handle.add(bow);
      const glow = new T.Mesh(new T.TorusGeometry(0.36, 0.11, 8, 24).scale(1, 1.4, 0.45), K3D.flat(hot('#4ab8ff', 2.4), { transparent: true, opacity: 0.0, depthWrite: false, add: true }));
      glow.position.y = -0.4; handle.add(glow);
      handle.userData.live = true;
      g.userData.handle = handle; g.userData.handleGlow = glow;
    }
    // the orange outline (the ring is on it) or gold (gold help): an inverted hull on every mesh of the body
    const his = [];
    body.traverse(o => {
      if (!o.isMesh || o.userData.ink || o.userData.hiHull || o.material.transparent) return;
      if (!o.geometry.attributes.inkNormal) return;
      const h = new T.Mesh(o.geometry, hiMat('#ff8a1a')); h.visible = false; h.userData.hiHull = true; h.userData.noSee = true; h.castShadow = false; h.receiveShadow = false; h.renderOrder = 2; o.add(h); his.push(h);
    });
    g.userData.hi = (on, gold) => { const m = gold ? hiMat('#ffd23a') : hiMat('#ff8a1a'); for (const h of his) { h.visible = on; h.material = m; } };
    g.userData.body = body;
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    g.userData.live = true;
    K3.add(g);
    return g;
  }

  return { KINDS: K, NAMES, build, field, big, mat, fuzzTex, rimify, tagTex, merged };
})();
