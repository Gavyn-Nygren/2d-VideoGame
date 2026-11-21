/* Pip & Bo - 43-3 Claw Machine Rescue: the prizes. Loaded on demand with the 3D kit (after the arcade kit).

   Every prize is made up (no real toy, brand or character). Each KIND is a list of parts built from a few shared shapes,
   in a 1-unit-tall frame (feet at y = 0, facing +z), with colour SLOTS so one kind comes in many colourways:
     0, 1, 2  the kind's own colours (plush with a fuzzy nap and a soft rim of light, or shiny plastic)
     3 button eyes and noses (dark gloss)   4 white   5 pink   6 the printed tag   7 chrome / metal   8 a stitched seam
     (the main colour, darker)   9 gold or clear plastic
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
    Y: () => geo('Y', () => { const s = new T.Shape(); s.moveTo(0, -0.9); s.bezierCurveTo(-0.9, -0.2, -1.1, 0.6, -0.5, 0.85); s.bezierCurveTo(-0.2, 0.98, 0, 0.75, 0, 0.55); s.bezierCurveTo(0, 0.75, 0.2, 0.98, 0.5, 0.85); s.bezierCurveTo(1.1, 0.6, 0.9, -0.2, 0, -0.9); return new T.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelSize: 0.16, bevelThickness: 0.16, bevelSegments: 3, curveSegments: 12 }).translate(0, 0, -0.25); }),
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
  const fuzzTex = () => K3D.paint('act-fuzz', 128, 128, (c, w, h) => {
    c.fillStyle = '#ececec'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = 200 + Math.floor(A.rnd() * 55); c.fillStyle = `rgb(${v},${v},${v})`; const x = A.rnd() * w, y = A.rnd() * h; c.fillRect(x, y, 1, 1 + A.rnd() * 2.5); }
    for (let i = 0; i < 260; i++) { c.strokeStyle = `rgba(255,255,255,${0.15 + A.rnd() * 0.25})`; c.lineWidth = 0.6; c.beginPath(); const x = A.rnd() * w, y = A.rnd() * h; c.moveTo(x, y); c.lineTo(x + (A.rnd() - 0.5) * 4, y + 2 + A.rnd() * 3); c.stroke(); }
  }, { repeat: true });
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
      case 'plush': return rimify(K3D.toon('#ffffff', { map: fuzzTex() }), '1.0, 0.92, 0.85', 0.26, 2.4, 'plush');
      case 'plastic': return rimify(K3D.toon('#ffffff'), '1.0, 1.0, 1.0', 0.55, 4.0, 'plastic');
      case 'eye': return rimify(K3D.toon('#ffffff'), '0.9, 0.9, 1.0', 0.8, 3.0, 'eye');
      case 'tag': return K3D.toon('#ffffff', { map: tagTex() });
      case 'metal': return rimify(K3D.toon('#ffffff'), '1.0, 1.0, 1.0', 0.9, 2.0, 'metal');
      case 'glass': return rimify(K3D.toon('#ffffff', { transparent: true, opacity: 0.5, depthWrite: false }), '0.9, 0.95, 1.0', 0.9, 2.0, 'glass');
    }
  }));
  const slotMat = (slot, soft) => slot === 3 ? 'eye' : slot === 6 ? 'tag' : slot === 7 ? 'metal' : slot === 9 ? 'plastic' : slot === 10 ? 'glass' : soft ? 'plush' : 'plastic';
  const SLOT_FIX = { 3: '#17121a', 4: '#f6f2ea', 5: '#ff9ab8', 6: '#ffffff', 7: '#c8ccd6', 9: '#ffd23a', 10: '#cfe8ff' };
  const slotCol = (slot, pal) => slot <= 2 ? pal[slot] : slot === 8 ? mixHex(pal[0], '#1a1018', 0.35) : SLOT_FIX[slot];

  /* ---------- the kinds ----------
     part: [shape, slot, x, y, z, sx, sy, sz, rx, ry, rz] (sizes are the shape's scale: a sphere's radii) */
  const K = {};
  const def = (name, soft, size, pals, parts) => { K[name] = { name, soft, size, pals, parts }; };
  const eyes = (y, z, x = 0.1, r = 0.04) => [['S', 3, -x, y, z, r, r, r * 0.7], ['S', 3, x, y, z, r, r, r * 0.7]];
  const mirror = p => [p, p.map((v, i) => (i === 2 ? -v : i === 10 ? -(v || 0) : i === 9 ? -(v || 0) : v))];
  const tag = (x, y, z, ry = 0) => ['B', 6, x, y, z, 0.07, 0.11, 0.008, 0, ry, 0.15];
  const bearBody = (eyeParts) => [
    ['S', 0, 0, 0.32, 0, 0.36, 0.33, 0.31], ['S', 1, 0, 0.3, 0.17, 0.22, 0.2, 0.15],
    ['S', 0, 0, 0.76, 0.02, 0.29, 0.26, 0.25], ...mirror(['S', 0, 0.2, 0.98, -0.02, 0.1, 0.1, 0.06]), ...mirror(['S', 1, 0.2, 0.98, 0.02, 0.06, 0.06, 0.03]),
    ['S', 1, 0, 0.7, 0.22, 0.12, 0.09, 0.08], ['S', 3, 0, 0.74, 0.29, 0.04, 0.03, 0.03],
    ...eyeParts,
    ...mirror(['S', 0, 0.33, 0.42, 0.06, 0.09, 0.17, 0.09, 0, 0, 0.5]), ...mirror(['S', 0, 0.17, 0.11, 0.17, 0.11, 0.09, 0.15]), ...mirror(['S', 1, 0.17, 0.1, 0.3, 0.07, 0.06, 0.02]),
    ['t', 8, 0, 0.76, 0.02, 0.29, 0.29, 0.29, P / 2, 0, 0], tag(0.25, 0.18, 0.2, 0.6),
  ];
  const PL = ['#c89a6a', '#e8d0b0', '#8a5a3a'], PLs = [['#c89a6a', '#e8d0b0'], ['#f0a8c8', '#fff0f6'], ['#9ad8a8', '#eafff0'], ['#b8a0e8', '#f2ecff'], ['#e8e0d0', '#ffffff'], ['#ffd27a', '#fff3d0'], ['#8ac8f0', '#e8f6ff']];
  const pals = (list, extra = '#ffd23a') => list.map(p => [p[0], p[1], p[2] || extra]);
  def('bear', true, [0.75, 1.08, 0.7], pals(PLs), bearBody(eyes(0.82, 0.24)));
  def('bearWink', true, [0.75, 1.08, 0.7], pals(PLs.slice(1)), bearBody([['S', 3, -0.1, 0.82, 0.24, 0.04, 0.04, 0.03], ['B', 3, 0.1, 0.82, 0.25, 0.08, 0.016, 0.02, 0, 0, 0.2]]));
  def('bearPatch', true, [0.75, 1.08, 0.7], pals([['#c89a6a', '#e8d0b0', '#5ad8ff'], ['#e8e0d0', '#ffffff', '#ff6ab0'], ['#9ad8a8', '#eafff0', '#ffd23a']]),
    [...bearBody([['S', 3, -0.1, 0.82, 0.24, 0.04, 0.04, 0.03], ['S', 3, 0.12, 0.79, 0.26, 0.035, 0.035, 0.025]]), ['B', 2, -0.14, 0.38, 0.27, 0.14, 0.12, 0.03, 0, 0.3, 0.2], ['t', 8, 0.12, 0.79, 0.26, 0.04, 0.04, 0.04]]);
  def('bunny', true, [0.7, 1.4, 0.6], pals([['#f6f0ff', '#ffc8dc'], ['#d8c8b8', '#fff0e0'], ['#a8e8d8', '#ffffff'], ['#ffd8e8', '#ffffff']]),
    [['S', 0, 0, 0.3, 0, 0.32, 0.3, 0.28], ['S', 1, 0, 0.28, 0.16, 0.18, 0.18, 0.12], ['S', 0, 0, 0.7, 0.02, 0.24, 0.23, 0.22], ...mirror(['S', 0, 0.09, 1.1, -0.02, 0.07, 0.24, 0.045, 0, 0, 0.12]), ...mirror(['S', 1, 0.09, 1.1, 0.01, 0.045, 0.19, 0.02, 0, 0, 0.12]),
      ...eyes(0.75, 0.2, 0.09), ['S', 5, 0, 0.68, 0.23, 0.035, 0.025, 0.025], ...mirror(['S', 0, 0.15, 0.08, 0.16, 0.1, 0.08, 0.15]), ['S', 4, 0, 0.22, -0.28, 0.1, 0.1, 0.1], tag(-0.24, 0.16, 0.18, -0.6)]);
  def('cat', true, [0.7, 1.0, 0.7], pals([['#f0c060', '#fff4d8'], ['#6a6a78', '#e8e8f0'], ['#f6f6f6', '#ffc8d8'], ['#c87a4a', '#ffe8d0']]),
    [['S', 0, 0, 0.3, 0, 0.32, 0.3, 0.3], ['S', 0, 0, 0.72, 0.03, 0.27, 0.23, 0.23], ...mirror(['K', 0, 0.15, 0.95, 0.02, 0.08, 0.14, 0.06, 0, 0, -0.25]), ...mirror(['K', 1, 0.15, 0.94, 0.05, 0.05, 0.09, 0.02, 0, 0, -0.25]),
      ...eyes(0.75, 0.22, 0.1), ['S', 5, 0, 0.68, 0.25, 0.03, 0.02, 0.02], ...mirror(['B', 3, 0.16, 0.66, 0.22, 0.12, 0.006, 0.006, 0, 0.3, 0.1]),
      ['Q', 0, 0, 0.3, -0.36, 0.12, 0.6, 0.12, 0.9, 0, 0], ...mirror(['S', 0, 0.15, 0.08, 0.2, 0.09, 0.07, 0.12]), ['S', 1, 0, 0.26, 0.2, 0.17, 0.17, 0.12]]);
  def('dog', true, [0.75, 1.0, 0.75], pals([['#e8c89a', '#fff4e0', '#3a2a24'], ['#ffffff', '#3a3440', '#ff6a6a'], ['#b8845a', '#f0dcc0', '#3a2a24']]),
    [['S', 0, 0, 0.3, 0, 0.34, 0.3, 0.33], ['S', 0, 0, 0.72, 0.04, 0.27, 0.24, 0.25], ['S', 1, 0, 0.66, 0.24, 0.15, 0.11, 0.1], ['S', 3, 0, 0.7, 0.33, 0.05, 0.04, 0.04],
      ...mirror(['S', 2, 0.27, 0.66, 0.0, 0.07, 0.18, 0.11, 0, 0, 0.3]), ...eyes(0.8, 0.24, 0.1), ['S', 1, 0.1, 0.8, 0.21, 0.08, 0.07, 0.04], ['C', 9, 0, 0.5, 0.04, 0.24, 0.04, 0.24], ['S', 9, 0, 0.47, 0.27, 0.04, 0.04, 0.03],
      ...mirror(['S', 0, 0.18, 0.08, 0.2, 0.1, 0.08, 0.14]), ['Q', 0, 0, 0.42, -0.34, 0.09, 0.3, 0.09, -0.6, 0, 0]]);
  def('whale', true, [1.3, 0.8, 0.8], pals([['#7ab8e8', '#e8f6ff'], ['#9a8ae8', '#f0ecff'], ['#6ad8c8', '#e8fff8'], ['#f0a0c0', '#fff0f6']]),
    [['S', 0, 0, 0.36, 0, 0.62, 0.36, 0.4], ['S', 1, 0, 0.24, 0.08, 0.5, 0.2, 0.34], ['K', 0, -0.7, 0.42, 0, 0.12, 0.3, 0.08, 0, 0, P / 2], ['S', 0, -0.86, 0.5, 0.14, 0.08, 0.04, 0.18, 0, 0.5, 0], ['S', 0, -0.86, 0.5, -0.14, 0.08, 0.04, 0.18, 0, -0.5, 0],
      ['S', 0, 0.1, 0.2, 0.36, 0.14, 0.04, 0.1, 0.3, 0.4, 0], ['S', 0, 0.1, 0.2, -0.36, 0.14, 0.04, 0.1, -0.3, -0.4, 0], ['S', 3, 0.42, 0.42, 0.33, 0.04, 0.04, 0.03], ['S', 3, 0.42, 0.42, -0.33, 0.04, 0.04, 0.03], ['B', 3, 0.52, 0.3, 0.2, 0.12, 0.012, 0.02, 0, -0.6, 0.1], ['t', 8, 0, 0.36, 0, 0.36, 0.36, 0.36, 0, P / 2, 0]]);
  def('octopus', true, [0.9, 0.9, 0.9], pals([['#ff7ab0', '#ffd0e4'], ['#a87af0', '#ead8ff'], ['#5ad8c8', '#d8fff8'], ['#ffb84a', '#fff0d0']]),
    [['S', 0, 0, 0.55, 0, 0.34, 0.36, 0.33], ...eyes(0.56, 0.3, 0.12, 0.05), ['S', 4, -0.12, 0.58, 0.31, 0.015, 0.015, 0.01], ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => ['Q', 0, Math.sin(i * P / 4) * 0.3, 0.16, Math.cos(i * P / 4) * 0.3, 0.12, 0.3, 0.12, P / 2 - 0.4, i * P / 4, 0]), ['S', 5, 0, 0.47, 0.32, 0.05, 0.02, 0.02]]);
  def('penguin', true, [0.6, 1.0, 0.6], pals([['#2a2a3a', '#ffffff', '#ffb02a'], ['#3a4a6a', '#f6f6ff', '#ffd02a']]),
    [['S', 0, 0, 0.45, 0, 0.3, 0.45, 0.28], ['S', 1, 0, 0.42, 0.12, 0.22, 0.36, 0.18], ['S', 0, 0, 0.88, 0, 0.22, 0.2, 0.2], ['S', 1, 0, 0.86, 0.1, 0.15, 0.12, 0.12], ...eyes(0.9, 0.19, 0.07, 0.03), ['K', 2, 0, 0.84, 0.25, 0.04, 0.09, 0.04, P / 2, 0, 0],
      ...mirror(['S', 0, 0.3, 0.5, 0, 0.06, 0.24, 0.12, 0, 0, 0.3]), ...mirror(['S', 2, 0.1, 0.03, 0.12, 0.08, 0.03, 0.12]), ['C', 2, 0, 0.7, 0, 0.23, 0.05, 0.23]]);
  def('frog', true, [0.8, 0.7, 0.7], pals([['#6ad86a', '#e8ffd0', '#ff6a8a'], ['#3ab89a', '#d8fff0', '#ffd23a'], ['#a8d84a', '#f8ffd8', '#ff8ad8']]),
    [['S', 0, 0, 0.3, 0, 0.4, 0.3, 0.34], ['S', 1, 0, 0.24, 0.14, 0.3, 0.2, 0.22], ...mirror(['S', 0, 0.18, 0.56, 0.12, 0.13, 0.13, 0.12]), ...mirror(['S', 4, 0.18, 0.58, 0.2, 0.08, 0.08, 0.06]), ...mirror(['S', 3, 0.18, 0.58, 0.25, 0.04, 0.04, 0.03]),
      ['B', 2, 0, 0.36, 0.32, 0.22, 0.02, 0.02, 0, 0, 0], ...mirror(['S', 0, 0.32, 0.06, 0.2, 0.16, 0.05, 0.14]), ['S', 5, 0.24, 0.38, 0.28, 0.05, 0.03, 0.02]]);
  def('elephant', true, [0.9, 0.9, 0.8], pals([['#a8b0c8', '#ffc8dc'], ['#c8b8e8', '#fff0f8'], ['#9ad8e8', '#ffe8f0']]),
    [['S', 0, 0, 0.36, 0, 0.36, 0.34, 0.33], ['S', 0, 0, 0.72, 0.1, 0.28, 0.26, 0.26], ...mirror(['D', 0, 0.3, 0.72, 0.04, 0.22, 0.03, 0.2, 0, 0, P / 2 - 0.2]), ...mirror(['D', 1, 0.31, 0.72, 0.06, 0.15, 0.03, 0.14, 0, 0, P / 2 - 0.2]),
      ['Q', 0, 0, 0.5, 0.38, 0.09, 0.32, 0.09, 0.5, 0, 0], ...eyes(0.8, 0.32, 0.12, 0.035), ...mirror(['C', 0, 0.18, 0.1, 0.16, 0.1, 0.2, 0.1]), ...mirror(['C', 4, 0.18, 0.0, 0.16, 0.1, 0.02, 0.1]), tag(0.3, 0.22, 0.15, 0.7)]);
  def('lion', true, [0.8, 1.0, 0.8], pals([['#f0c050', '#c8742a', '#fff0c0'], ['#f8d8a0', '#e8a04a', '#ffffff']]),
    [['S', 0, 0, 0.32, 0, 0.34, 0.3, 0.32], ['T', 1, 0, 0.74, 0.04, 0.27, 0.27, 0.5], ['S', 0, 0, 0.74, 0.06, 0.24, 0.23, 0.22], ['S', 2, 0, 0.68, 0.24, 0.12, 0.08, 0.08], ['S', 3, 0, 0.71, 0.31, 0.04, 0.03, 0.03], ...eyes(0.8, 0.24, 0.09),
      ...mirror(['S', 0, 0.17, 0.95, 0.04, 0.06, 0.06, 0.04]), ['Q', 0, 0, 0.26, -0.38, 0.06, 0.4, 0.06, 1.2, 0, 0], ['S', 1, 0, 0.36, -0.58, 0.07, 0.08, 0.07], ...mirror(['S', 0, 0.18, 0.08, 0.2, 0.1, 0.08, 0.13])]);
  def('owl', true, [0.6, 0.9, 0.6], pals([['#a8805a', '#f0e0c8', '#ffd23a'], ['#8a8ab8', '#ecebff', '#ffb84a'], ['#c8a8e0', '#fff4ff', '#ffd23a']]),
    [['S', 0, 0, 0.42, 0, 0.32, 0.42, 0.3], ['S', 1, 0, 0.36, 0.15, 0.22, 0.28, 0.16], ...mirror(['D', 4, 0.12, 0.66, 0.24, 0.11, 0.02, 0.11, P / 2, 0, 0]), ...mirror(['S', 3, 0.12, 0.66, 0.26, 0.05, 0.05, 0.02]), ['K', 2, 0, 0.58, 0.28, 0.04, 0.08, 0.04, P, 0, 0],
      ...mirror(['K', 0, 0.2, 0.86, 0, 0.06, 0.14, 0.05, 0, 0, -0.4]), ...mirror(['S', 0, 0.3, 0.42, -0.02, 0.06, 0.26, 0.16, 0, 0, 0.2]), ['t', 8, 0, 0.42, 0, 0.31, 0.31, 0.31, P / 2, 0, 0]]);
  def('pig', true, [0.8, 0.75, 0.8], pals([['#ffb8c8', '#ff8aa8'], ['#f8d0d8', '#e88aa0']]),
    [['S', 0, 0, 0.36, 0, 0.4, 0.34, 0.37], ['C', 1, 0, 0.42, 0.38, 0.11, 0.08, 0.11, P / 2, 0, 0], ...mirror(['S', 3, 0.04, 0.42, 0.42, 0.018, 0.025, 0.01]), ...eyes(0.55, 0.3, 0.13, 0.035), ...mirror(['K', 0, 0.2, 0.7, 0.12, 0.07, 0.12, 0.04, 0.4, 0, -0.4]),
      ...mirror(['C', 0, 0.2, 0.08, 0.2, 0.08, 0.16, 0.08]), ...mirror(['C', 0, 0.2, 0.08, -0.2, 0.08, 0.16, 0.08]), ['T', 0, 0, 0.42, -0.38, 0.06, 0.06, 0.06, 0, P / 2, 0]]);
  def('monkey', true, [0.8, 1.0, 0.7], pals([['#8a5a3a', '#f0d0a8'], ['#a86a4a', '#ffe0c0'], ['#6a6a7a', '#f0e8e0']]),
    [['S', 0, 0, 0.32, 0, 0.3, 0.3, 0.27], ['S', 0, 0, 0.72, 0.02, 0.26, 0.25, 0.24], ['S', 1, 0, 0.68, 0.18, 0.18, 0.16, 0.1], ...mirror(['D', 0, 0.27, 0.74, 0, 0.09, 0.03, 0.09, 0, 0, P / 2]), ...mirror(['D', 1, 0.28, 0.74, 0, 0.06, 0.03, 0.06, 0, 0, P / 2]), ...eyes(0.77, 0.24, 0.08),
      ['B', 3, 0, 0.62, 0.27, 0.1, 0.012, 0.012], ...mirror(['Q', 0, 0.32, 0.36, 0.08, 0.07, 0.4, 0.07, 0, 0, 0.6]), ['Q', 0, 0, 0.3, -0.36, 0.05, 0.5, 0.05, 1.3, 0, 0], ...mirror(['S', 0, 0.16, 0.08, 0.18, 0.09, 0.07, 0.12])]);
  def('dino', true, [1.1, 1.0, 0.7], pals([['#6ad86a', '#ffd23a', '#e8ffd0'], ['#8a7af0', '#ff8ad8', '#ece8ff'], ['#4ac8e8', '#ffe24a', '#e0f8ff'], ['#f0a04a', '#5ad8ff', '#fff0d8']]),
    [['S', 0, 0, 0.36, 0, 0.32, 0.32, 0.3], ['S', 2, 0, 0.32, 0.14, 0.2, 0.24, 0.16], ['S', 0, 0, 0.78, 0.16, 0.22, 0.2, 0.26], ['K', 0, 0, 0.32, -0.48, 0.16, 0.6, 0.14, -P / 2 + 0.3, 0, 0], ...eyes(0.86, 0.32, 0.1, 0.035),
      ['B', 3, 0, 0.7, 0.4, 0.14, 0.012, 0.02], ...[0, 1, 2, 3].map(i => ['K', 1, 0, 1.0 - i * 0.16, -0.02 - i * 0.16, 0.06, 0.12, 0.03, -0.3 - i * 0.2, 0, 0]), ...mirror(['S', 0, 0.22, 0.48, 0.18, 0.05, 0.1, 0.05, 0.8, 0, 0]), ...mirror(['S', 0, 0.17, 0.08, 0.1, 0.11, 0.1, 0.15]), tag(-0.25, 0.25, 0.1, -0.8)]);
  def('star', true, [0.9, 0.9, 0.4], pals([['#ffd23a', '#ff9ab8'], ['#ff8ad8', '#ffffff'], ['#5ad8ff', '#ffffff'], ['#9aff8a', '#ffffff']]),
    [['X', 0, 0, 0.45, 0, 0.42, 0.42, 0.42], ...eyes(0.5, 0.18, 0.09, 0.035), ...mirror(['S', 5, 0.16, 0.42, 0.17, 0.045, 0.03, 0.01]), ['B', 3, 0, 0.42, 0.19, 0.06, 0.012, 0.01]]);
  def('heart', true, [0.9, 0.85, 0.4], pals([['#ff5a8a', '#ffffff'], ['#ff9ad0', '#ffffff'], ['#b88aff', '#ffffff']]),
    [['Y', 0, 0, 0.42, 0, 0.42, 0.42, 0.45], ...eyes(0.5, 0.2, 0.1, 0.035), ['B', 3, 0, 0.4, 0.21, 0.07, 0.014, 0.01], ['t', 8, 0, 0.42, 0, 0.36, 0.36, 0.36]]);
  def('mushroom', true, [0.8, 0.9, 0.8], pals([['#ff5a5a', '#fff4e8'], ['#b88aff', '#fff4ff'], ['#ffd23a', '#fffbe8'], ['#5ad8a8', '#f0fff8']]),
    [['C', 1, 0, 0.22, 0, 0.2, 0.44, 0.2], ['H', 0, 0, 0.42, 0, 0.42, 0.34, 0.42], ...[0, 1, 2, 3, 4].map(i => ['S', 4, Math.sin(i * 1.3) * 0.26, 0.62 + (i % 2) * 0.06, Math.cos(i * 1.3) * 0.26, 0.07, 0.03, 0.07, Math.cos(i * 1.3) * 0.6, 0, -Math.sin(i * 1.3) * 0.6]), ...eyes(0.3, 0.19, 0.07, 0.03), ['S', 5, 0.13, 0.26, 0.18, 0.03, 0.02, 0.01]]);
  def('cloud', true, [1.0, 0.6, 0.6], pals([['#f6f6ff', '#c8d8ff'], ['#fff0f8', '#ffc8e0']]),
    [['S', 0, 0, 0.3, 0, 0.3, 0.26, 0.26], ...mirror(['S', 0, 0.28, 0.24, 0, 0.22, 0.2, 0.22]), ['S', 0, 0.1, 0.46, -0.04, 0.2, 0.18, 0.2], ...eyes(0.32, 0.26, 0.08, 0.03), ...mirror(['S', 1, 0.17, 0.27, 0.24, 0.04, 0.025, 0.01])]);
  def('fish', true, [1.0, 0.6, 0.5], pals([['#ffb02a', '#ffffff', '#3a3a3a'], ['#5ad8ff', '#ffd23a', '#3a3a3a'], ['#ff6ab0', '#ffffff', '#3a3a3a']]),
    [['S', 0, 0.05, 0.3, 0, 0.4, 0.26, 0.2], ['T', 1, 0.05, 0.3, 0, 0.18, 0.24, 0.6, 0, P / 2, 0], ['K', 0, -0.42, 0.3, 0, 0.18, 0.24, 0.06, 0, 0, P / 2], ...mirror(['S', 3, 0.3, 0.36, 0.15, 0.04, 0.04, 0.03]), ['K', 0, 0.02, 0.56, 0, 0.12, 0.14, 0.03]]);
  def('carrot', true, [0.4, 1.0, 0.4], pals([['#ff9a3a', '#5ad85a'], ['#ffb04a', '#3ab85a']]),
    [['K', 0, 0, 0.42, 0, 0.18, 0.84, 0.18, P, 0, 0], ...[0, 1, 2].map(i => ['K', 1, (i - 1) * 0.05, 0.92, 0, 0.05, 0.22, 0.05, 0, 0, (i - 1) * 0.4]), ...eyes(0.7, 0.13, 0.05, 0.025), ...[0, 1, 2].map(i => ['t', 8, 0, 0.3 + i * 0.16, 0, 0.13 - i * 0.03, 0.13 - i * 0.03, 0.13 - i * 0.03, P / 2, 0, 0])]);
  def('chick', true, [0.5, 0.55, 0.5], pals([['#ffe24a', '#ff9a3a'], ['#fff07a', '#ffb04a']]),
    [['S', 0, 0, 0.25, 0, 0.24, 0.24, 0.24], ['S', 0, 0, 0.47, 0.03, 0.15, 0.14, 0.14], ['K', 1, 0, 0.46, 0.18, 0.03, 0.06, 0.03, P / 2, 0, 0], ...eyes(0.5, 0.14, 0.05, 0.022), ...mirror(['S', 0, 0.23, 0.27, 0, 0.04, 0.12, 0.08, 0, 0, 0.4]), ['K', 0, 0, 0.62, 0.02, 0.03, 0.06, 0.02]]);
  def('turtle', true, [0.9, 0.5, 0.8], pals([['#6ad86a', '#3a8a4a', '#d8ff9a'], ['#5ac8c8', '#2a7a8a', '#d8fff8']]),
    [['H', 1, 0, 0.12, 0, 0.36, 0.26, 0.32], ['C', 2, 0, 0.12, 0, 0.37, 0.04, 0.33], ['S', 0, 0, 0.18, 0.38, 0.13, 0.12, 0.13], ...eyes(0.23, 0.48, 0.06, 0.025), ...mirror(['S', 0, 0.28, 0.06, 0.2, 0.09, 0.05, 0.08]), ...mirror(['S', 0, 0.28, 0.06, -0.2, 0.09, 0.05, 0.08]), ...[0, 1, 2].map(i => ['D', 0, (i - 1) * 0.16, 0.3, 0.05, 0.07, 0.01, 0.07])]);
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
    X: SH.X, Y: SH.Y,
  };
  function partGeo(p, lo) {
    const g = (lo ? SHL : SH)[p[0]]().clone();
    const m = new T.Matrix4().compose(new T.Vector3(p[2], p[3], p[4]), new T.Quaternion().setFromEuler(new T.Euler(p[8] || 0, p[9] || 0, p[10] || 0)), new T.Vector3(p[5], p[6], p[7]));
    g.applyMatrix4(m);
    return g.index ? g.toNonIndexed() : g;
  }
  function merge(list) {
    let n = 0; for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let k = 0;
    for (const g of list) {
      const a = g.attributes;
      pos.set(a.position.array, k * 3); nor.set(a.normal.array, k * 3);
      if (a.uv) uv.set(a.uv.array, k * 2);
      k += a.position.count; g.dispose();
    }
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); out.setAttribute('uv', new T.BufferAttribute(uv, 2));
    out.computeBoundingSphere();
    return out;
  }
  // (cached per scene by K3D.geo, so a new scene builds them again; lo: the heaps' lighter shapes, tiny parts dropped)
  const merged = (name, lo) => {
    const kd = K[name];
    const slots = kd._slots || (kd._slots = [...new Set(kd.parts.map(p => p[1]))]);
    const out = [];
    for (const slot of slots) {
      const parts = kd.parts.filter(p => p[1] === slot && !(lo && Math.max(p[5], p[6], p[7]) < 0.035));
      if (!parts.length) continue;
      out.push({ slot, mat: slotMat(slot, kd.soft), geo: geo('k|' + name + '|' + slot + (lo ? '|lo' : ''), () => merge(parts.map(p => partGeo(p, lo)))) });
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
          for (const part of merged(kind, true)) {
            const im = new T.InstancedMesh(part.geo, mat(part.mat), list.length);
            list.forEach((it, i) => {
              const o = it.o, sc = o.s || 1;
              e.set(o.tilt || 0, o.yaw || 0, o.roll || 0, 'YXZ'); q.setFromEuler(e);
              v.set(it.x, it.y, it.z); s.set(sc * (o.sx || 1), sc * (o.sy || 1), sc * (o.sz || 1));
              m4.compose(v, q, s); im.setMatrixAt(i, m4);
              const pal = Array.isArray(o.pal) ? o.pal : kd.pals[(o.pal != null ? o.pal : i) % kd.pals.length];
              col.set(slotCol(part.slot, pal)); im.setColorAt(i, col);
            });
            im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
            im.castShadow = false; im.receiveShadow = true;
            im.computeBoundingSphere();
            if (part.slot <= 2 && fo.ink !== false) K3D.ink(im, A.INK, 0.8);
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
      const straight = new T.Group(), coil = new T.Group();
      const n = 14, fz = fuzzTex();
      const mA = K3D.mat('act-snake|' + t.col, () => rimify(K3D.toon(t.col, { map: fz }), '1.0, 0.95, 0.8', 0.4, 2.2, 'plush-snake'));
      const mB = K3D.mat('act-snakeB', () => rimify(K3D.toon('#ffe24a', { map: fz }), '1.0, 0.95, 0.8', 0.4, 2.2, 'plush-snakeB'));
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), r = 0.32 + Math.sin(u * P) * 0.14 - (u > 0.9 ? (u - 0.9) * 2 : 0);
        const s = K3D.mesh(K3D.geo('act-sph', () => new T.SphereGeometry(1, 16, 12)), i % 3 === 1 ? mB : mA, { ink: A.INK, inkW: 1 });
        s.scale.set(t.w / n * 0.8, r * 0.75, r); s.position.set(-t.w / 2 + (i + 0.5) * t.w / n, r * 0.62, Math.sin(u * P * 3) * 0.06); straight.add(s);
      }
      const head = K3D.mesh(K3D.geo('act-sph', () => new T.SphereGeometry(1, 16, 12)), mA, { ink: A.INK, inkW: 1 }); head.scale.set(0.5, 0.36, 0.44); head.position.set(t.w / 2 + 0.1, 0.38, 0); straight.add(head);
      for (const s of [-1, 1]) { const e = K3D.mesh(new T.SphereGeometry(0.09, 10, 8), mat('eye'), { ink: false }); e.material = K3D.mat('act-eyeblk', () => { const c = mat('eye').clone(); c.color = new T.Color('#17121a'); c.onBeforeCompile = mat('eye').onBeforeCompile; c.customProgramCacheKey = mat('eye').customProgramCacheKey; return c; }); e.position.set(t.w / 2 + 0.38, 0.55, s * 0.2); straight.add(e); }
      const tongue = new T.Mesh(new T.BoxGeometry(0.4, 0.03, 0.08), K3D.toon('#ff5a7a')); tongue.position.set(t.w / 2 + 0.75, 0.3, 0); straight.add(tongue);
      const tg = bigTag(1.4); tg.position.set(-t.w / 2 + 0.6, 0.6, 0.4); straight.add(tg);
      for (let i = 0; i < 26; i++) {
        const a = i * 0.55, r = 0.75 - i * 0.022, y = 0.22 + i * 0.022;
        const s = K3D.mesh(K3D.geo('act-sph', () => new T.SphereGeometry(1, 16, 12)), i % 3 === 1 ? mB : mA, { ink: A.INK, inkW: 1 }); s.scale.setScalar(0.24); s.position.set(Math.cos(a) * r, y, Math.sin(a) * r); coil.add(s);
      }
      const ch = head.clone(); ch.position.set(0, 0.95, 0.1); ch.scale.set(0.36, 0.28, 0.32); coil.add(ch);
      for (const s of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.065, 8, 6), K3D.toon('#17121a')); e.position.set(s * 0.13, 1.04, 0.36); coil.add(e); }
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
