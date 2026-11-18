/* Pip & Bo - Level 41-2 Page Turner Chase: the pictures (POPCHASE.art). Loaded on demand with the 3D kit (K3D.files,
   added by page-turner-chase.js), so it may use three.js (K3D.T) and the paper kit (POPUP) at load time.

   Nothing here changes the game: it only reads G.mst (st) and the players, so a run with K3D.noRender plays the same.
     POPCHASE.art.scene(K, st)    builds a spread: the book with the spread's printed pages, the room round it, the
                                  pop-ups (folded flat until their strip of page is reached), the machinery, the Roll
                                  (the curl of paper, the Reader's hand in its striped sleeve) and Pip and Bo
     POPCHASE.art.draw(K, st, dt) moves it all to match the game state, every drawn frame
     POPCHASE.art.drawTop(st)     the flat bits over the picture: button prompts at tabs, name tags, "Flat!"
     POPCHASE.art.hud(st)         the Roll's arrow and distance at the left edge when it is off screen
   Pop-ups that come in numbers (trees, ferns, toadstools, bushes) are instanced card families: one draw for each
   family's printed faces, one for the white cut edges, one for the ink outline (an instanced version of the kit's
   inverted hull), however many stand on the spread. A card unfolds by turning about its foot (a hinge on the page):
   only its instance matrix changes. The page itself is rolled up behind the Roll by a cut in its shader (uRoll), and
   gaps (the stream, the moat, the sea) are cut out of the page and the page block the same way.
*/
'use strict';

(function () {
  const T = K3D.T, P = POPUP, PC = POPCHASE;
  const INK = P.INK, EDGE = P.EDGE, CREAM = P.CREAM;
  const art = PC.art = {};
  window.__pcArt = art; // (the review shot tool reaches it by name)
  const R = 1.5;                       // the curl's radius (it stands 3 high)
  const v3 = new T.Vector3(), q4 = new T.Quaternion(), s3 = new T.Vector3(), m4 = new T.Matrix4(), e3 = new T.Euler();
  const smooth = k => k * k * (3 - 2 * k);
  const backOut = k => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

  /* ---------- the cut: the page rolled up behind the Roll, and gaps through the page ---------- */
  const CUT = { uRoll: { value: -1e9 }, uGaps: { value: [new T.Vector2(1e9, 1e9), new T.Vector2(1e9, 1e9), new T.Vector2(1e9, 1e9), new T.Vector2(1e9, 1e9)] }, uPd: { value: 12 } };
  function cut(mat, roll) {
    mat.onBeforeCompile = sh => {
      sh.uniforms.uRoll = CUT.uRoll; sh.uniforms.uGaps = CUT.uGaps; sh.uniforms.uPd = CUT.uPd;
      sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec3 vCutW;\nvoid main() {')
        .replace('#include <project_vertex>', '#include <project_vertex>\n  vCutW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', `varying vec3 vCutW; uniform float uRoll, uPd; uniform vec2 uGaps[4];
void main() {
  ${roll ? 'if (vCutW.x < uRoll) discard;' : ''}
  if (vCutW.y > -1.4 && abs(vCutW.z) < uPd + 0.01) for (int i = 0; i < 4; i++) if (vCutW.x > uGaps[i].x && vCutW.x < uGaps[i].y) discard;`);
    };
    mat.customProgramCacheKey = () => 'popchaseCut' + (roll ? 1 : 0);
    mat.needsUpdate = true;
  }

  /* ---------- instanced card families ---------- */
  // the ink outline for instanced cards: the kit's inverted hull, with the instance's matrix
  function inkInst(color, w) {
    return K3D.mat('inkInst|' + color + '|' + w, () => new T.ShaderMaterial({
      uniforms: { uPx: K3D.inkU.uPx, uScale: K3D.inkU.uScale, uW: { value: w }, uCol: { value: new T.Color(color) } },
      vertexShader: `attribute vec3 inkNormal; uniform float uPx, uScale, uW;
        void main() {
          vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          vec3 n = normalize(mat3(modelViewMatrix) * mat3(instanceMatrix) * inkNormal);
          mv.xyz += n * uW * uScale * uPx * max(0.5, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, 1.0);
        #include <colorspace_fragment>
      }`,
      side: T.BackSide,
    }));
  }
  // a family: one card shape and print, many cards. add(x, z, rotY, scale, chunk, delay) -> index
  function family(K, key, shape, tex, o = {}) {
    const geo = K3D.geo('fam|' + key, () => P.cardGeo(shape, o.depth || 0.04, o.seg || 14));
    K3D.ink(new T.Mesh(geo)); // (adds the smoothed normals the outline needs)
    const fam = { key, geo, list: [], o };
    fam.face = K3D.mat('famFace|' + key, () => K3D.toon('#ffffff', { map: tex, side: T.DoubleSide, alphaTest: o.alphaTest || 0 }));
    fam.edge = K3D.mat('edge|' + EDGE, () => K3D.toon(EDGE));
    fam.add = (x, z, rot, sc, ch, delay, extra) => { fam.list.push(Object.assign({ x, z, rot, sc, ch, delay, lie: o.lie || 1, st: -1 }, extra)); return fam.list.length - 1; };
    fam.done = () => {
      const n = Math.max(1, fam.list.length);
      const m = new T.InstancedMesh(geo, [fam.face, fam.edge], n);
      m.castShadow = o.cast !== false; m.receiveShadow = true; m.frustumCulled = false;
      const ink = new T.InstancedMesh(geo, inkInst(o.ink || INK, o.inkW || 0.9), n);
      ink.instanceMatrix = m.instanceMatrix; ink.userData.ink = true; ink.castShadow = false; ink.frustumCulled = false;
      m.add(ink);
      for (let i = 0; i < n; i++) m.setMatrixAt(i, ZERO);
      m.count = fam.list.length;
      fam.mesh = m; K.add(m);
      return fam;
    };
    return fam;
  }
  const ZERO = new T.Matrix4().makeScale(0, 0, 0);
  // how far up a card stands (0 flat, 1 up; a little overshoot as it springs open), from the strip's times
  function upOf(st, c, delay, lie) {
    const t0 = st.chunkT[c], f0 = st.foldT[c];
    if (t0 < 0) return -1;
    let u = (st.T - t0 - delay) / PC.S.unfold;
    if (u <= 0) return 0;
    u = u >= 1 ? 1 : backOut(u);
    if (f0 >= 0) { const f = (st.T - f0) / 0.28; if (f >= 1) return -2; u = Math.min(u, 1 - smooth(Math.max(0, f))); }
    return u * lie;
  }
  // a family's instance matrices for this frame (only the cards whose state changed)
  function famDraw(fam, st) {
    let dirty = false;
    fam.list.forEach((c, i) => {
      const u = upOf(st, c.ch, c.delay, 1);
      const key = u < -1.5 ? -2 : u < 0 ? -1 : Math.round(u * 400);
      if (key === c.st) return;
      c.st = key; dirty = true;
      if (u < 0) { fam.mesh.setMatrixAt(i, ZERO); return; }
      // a card lies back on the page (rotated -90 degrees about its foot) and turns up to stand
      e3.set(-(1 - u) * Math.PI / 2 * (c.fall || 1), c.rot, 0, 'YXZ');
      q4.setFromEuler(e3);
      const sq = Math.max(0.02, Math.min(1, u * 1.4));
      s3.set(c.sc, c.sc, c.sc * sq);
      m4.compose(v3.set(c.x, c.y || 0, c.z), q4, s3);
      fam.mesh.setMatrixAt(i, m4);
    });
    if (dirty) fam.mesh.instanceMatrix.needsUpdate = true;
  }

  /* ---------- printing: shared helpers ---------- */
  const rgba = P.rgba;
  function inkOutline(c, path, w = 3, col = 'rgba(43,33,48,0.85)') { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; path(); c.stroke(); }

  /* ---------- the Deep Dark Wood: prints ---------- */
  const WOOD = {};
  WOOD.pine = () => K3D.paint('pcPine', 384, 640, (c, w, h) => {
    const r = P.rng(401);
    c.clearRect(0, 0, w, h);
    // trunk
    c.fillStyle = '#5a3a26'; c.fillRect(w / 2 - 16, h * 0.78, 32, h * 0.22);
    // three tiers of dark needles, each a watercolour wash with a lit left flank and ink scallops
    for (let k = 0; k < 4; k++) {
      const y0 = h * (0.06 + k * 0.2), y1 = y0 + h * 0.3, hw = w * (0.2 + k * 0.1);
      c.save(); c.beginPath(); c.moveTo(w / 2, y0); c.lineTo(w / 2 + hw, y1); c.lineTo(w / 2 - hw, y1); c.closePath(); c.clip();
      c.fillStyle = mixHex('#1f4a3e', '#2a5c48', k / 4); c.fillRect(0, y0, w, y1 - y0);
      for (let i = 0; i < 30; i++) P.wash(c, w / 2 + (r() - 0.6) * hw * 1.6, y0 + r() * (y1 - y0), 18 + r() * 30, r() < 0.5 ? '#3d7a5a' : '#173a32', 0.35, r, { noEdge: true });
      c.strokeStyle = 'rgba(160,210,170,0.35)'; c.lineWidth = 2;
      for (let i = 0; i < 26; i++) { const x = w / 2 - hw * 0.8 + r() * hw * 0.8, y = y0 + 20 + r() * (y1 - y0 - 24); c.beginPath(); c.moveTo(x, y); c.lineTo(x - 10, y + 8); c.stroke(); }
      c.restore();
    }
    // a dusting of moonlight on the tips
    c.fillStyle = 'rgba(220,235,255,0.35)';
    for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(w / 2 + (r() - 0.5) * w * 0.7, h * (0.1 + r() * 0.65), 2 + r() * 2, 0, Math.PI * 2); c.fill(); }
  });
  WOOD.pineShape = (() => { const s = new T.Shape(); s.moveTo(-0.13, 0); s.lineTo(-0.13, 0.34); s.lineTo(-0.88, 0.34); s.lineTo(-0.42, 0.95); s.lineTo(-0.72, 0.95); s.lineTo(-0.3, 1.6); s.lineTo(-0.52, 1.6); s.lineTo(-0.2, 2.2); s.lineTo(-0.36, 2.2); s.lineTo(0, 2.9);
    s.lineTo(0.36, 2.2); s.lineTo(0.2, 2.2); s.lineTo(0.52, 1.6); s.lineTo(0.3, 1.6); s.lineTo(0.72, 0.95); s.lineTo(0.42, 0.95); s.lineTo(0.88, 0.34); s.lineTo(0.13, 0.34); s.lineTo(0.13, 0); s.closePath(); return s; })();
  WOOD.birch = () => K3D.paint('pcBirch', 384, 640, (c, w, h) => {
    const r = P.rng(411);
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#f2eee2'; c.fillRect(w / 2 - 18, h * 0.38, 36, h * 0.62);
    c.fillStyle = '#2b2130'; for (let i = 0; i < 14; i++) { const y = h * 0.4 + r() * h * 0.58; c.fillRect(w / 2 - 18 + (r() < 0.5 ? 0 : 18), y, 10 + r() * 8, 3 + r() * 3); }
    c.save(); c.beginPath(); c.ellipse(w / 2, h * 0.3, w * 0.46, h * 0.28, 0, 0, Math.PI * 2); c.clip();
    P.leaves(c, w, h * 0.6, '#5a8a4a', 412, { clump: 26 });
    for (let i = 0; i < 40; i++) P.wash(c, r() * w, r() * h * 0.6, 14 + r() * 18, r() < 0.5 ? '#c9a83a' : '#7a9a4a', 0.35, r, { noEdge: true });
    c.restore();
  });
  WOOD.birchShape = (() => { const s = new T.Shape(); s.moveTo(-0.11, 0); s.lineTo(-0.11, 1.45); s.absarc(0, 2.05, 0.82, -Math.PI / 2 - 0.13, Math.PI * 1.5 + 0.13, true); s.lineTo(0.11, 1.45); s.lineTo(0.11, 0); s.closePath(); return s; })();
  WOOD.spruce = () => K3D.paint('pcSpruce', 320, 768, (c, w, h) => {
    const r = P.rng(421);
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#132c30'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) P.wash(c, r() * w, r() * h, 16 + r() * 34, r() < 0.5 ? '#21484a' : '#0e2226', 0.4, r, { noEdge: true });
    c.strokeStyle = 'rgba(150,200,190,0.28)'; c.lineWidth = 2;
    for (let y = 30; y < h - 60; y += 26) { const hw = (y / h) * w * 0.45; c.beginPath(); c.moveTo(w / 2 - hw, y + 16); c.quadraticCurveTo(w / 2, y, w / 2 + hw, y + 16); c.stroke(); }
    c.fillStyle = '#3a2618'; c.fillRect(w / 2 - 12, h - 70, 24, 70);
  });
  WOOD.spruceShape = (() => { const s = new T.Shape(); s.moveTo(-0.1, 0); s.lineTo(-0.1, 0.35); s.lineTo(-0.7, 0.35); const n = 7; for (let i = 0; i < n; i++) { const y = 0.35 + (i + 1) * 3.3 / n, x = 0.7 * (1 - (i + 1) / n); s.lineTo(-x - 0.12, y - 0.18); s.lineTo(-x, y); } s.lineTo(0, 3.95); for (let i = n - 1; i >= 0; i--) { const y = 0.35 + (i + 1) * 3.3 / n, x = 0.7 * (1 - (i + 1) / n); s.lineTo(x, y); s.lineTo(x + 0.12, y - 0.18); } s.lineTo(0.7, 0.35); s.lineTo(0.1, 0.35); s.lineTo(0.1, 0); s.closePath(); return s; })();
  WOOD.fern = () => K3D.paint('pcFern', 256, 160, (c, w, h) => {
    const r = P.rng(431);
    c.fillStyle = '#244a36'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) P.wash(c, r() * w, r() * h, 30, r() < 0.5 ? '#2f5e44' : '#1a3a2a', 0.5, r, { noEdge: true });
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI / 2 + (k - 4) * 0.27, x0 = w / 2, y0 = h, L = h * (0.85 + r() * 0.2);
      c.strokeStyle = '#3f8a5a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x0 + Math.cos(a) * L * 0.5, y0 + Math.sin(a) * L * 0.6, x0 + Math.cos(a) * L, y0 + Math.sin(a) * L * 0.9); c.stroke();
      for (let j = 1; j < 10; j++) { const t = j / 10, x = x0 + Math.cos(a) * L * t, y = y0 + Math.sin(a) * L * 0.9 * t; c.fillStyle = j % 2 ? '#5aa070' : '#77b884'; c.beginPath(); c.ellipse(x - 7, y, 9 * (1 - t * 0.6), 3, a + 0.6, 0, Math.PI * 2); c.ellipse(x + 7, y, 9 * (1 - t * 0.6), 3, a - 0.6, 0, Math.PI * 2); c.fill(); }
    }
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(220,235,255,0.12)'); g.addColorStop(1, 'rgba(0,10,5,0.35)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  WOOD.fernShape = P.scallopShape(0.9, 0.55, 5, 0.5, P.rng(432));
  WOOD.stool = () => K3D.paint('pcStool', 256, 256, (c, w, h) => {
    const r = P.rng(441);
    c.fillStyle = '#efe2c4'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(150,120,80,0.5)'; c.lineWidth = 2; for (let x = w * 0.4; x < w * 0.6; x += 8) { c.beginPath(); c.moveTo(x, h * 0.55); c.lineTo(x, h); c.stroke(); }
    c.fillStyle = '#c8402e'; c.fillRect(0, 0, w, h * 0.56);
    for (let i = 0; i < 6; i++) P.wash(c, w * 0.1 + r() * w * 0.8, h * 0.1 + r() * h * 0.35, 26, '#8a2418', 0.3, r, { noEdge: true });
    c.fillStyle = 'rgba(255,200,180,0.3)'; c.beginPath(); c.ellipse(w * 0.3, h * 0.12, w * 0.2, h * 0.06, -0.3, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 10; i++) { c.fillStyle = '#fbf3e0'; c.beginPath(); c.arc(w * 0.1 + r() * w * 0.8, h * 0.06 + r() * h * 0.4, 6 + r() * 9, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = 'rgba(120,30,20,0.6)'; c.fillRect(0, h * 0.53, w, h * 0.04);
  });
  WOOD.stoolShape = (() => { const s = new T.Shape(); s.moveTo(-0.09, 0); s.lineTo(-0.09, 0.27); s.lineTo(-0.3, 0.27); s.quadraticCurveTo(-0.3, 0.6, 0, 0.6); s.quadraticCurveTo(0.3, 0.6, 0.3, 0.27); s.lineTo(0.09, 0.27); s.lineTo(0.09, 0); s.closePath(); return s; })();
  WOOD.bush = () => K3D.paint('pcBush', 384, 192, (c, w, h) => { c.clearRect(0, 0, w, h); P.leaves(c, w, h, '#2f5e46', 451, { clump: 22 }); const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,220,0.1)'); g.addColorStop(1, 'rgba(0,20,10,0.4)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  WOOD.reed = () => K3D.paint('pcReed', 128, 320, (c, w, h) => {
    const r = P.rng(455);
    c.fillStyle = '#3a6a3a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { c.strokeStyle = r() < 0.5 ? '#5a9a4a' : '#2a5030'; c.lineWidth = 4; const x = 10 + r() * (w - 20); c.beginPath(); c.moveTo(x, h); c.quadraticCurveTo(x + (r() - 0.5) * 20, h * 0.5, x + (r() - 0.5) * 30, h * 0.1); c.stroke(); }
    for (let i = 0; i < 3; i++) { c.fillStyle = '#6a4226'; const x = 20 + i * 40; c.beginPath(); c.ellipse(x, h * 0.18 + i * 10, 8, 26, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(43,33,48,0.6)'; c.lineWidth = 2; c.stroke(); }
  });
  WOOD.reedShape = (() => { const s = new T.Shape(); s.moveTo(-0.22, 0); s.lineTo(0.22, 0); s.lineTo(0.26, 0.9); s.lineTo(0.18, 1.3); s.lineTo(0.06, 1.1); s.lineTo(0, 1.45); s.lineTo(-0.08, 1.15); s.lineTo(-0.2, 1.35); s.lineTo(-0.26, 0.9); s.closePath(); return s; })();
  WOOD.bushShape = P.scallopShape(1.5, 0.75, 4, 0.3, P.rng(452));

  // the wood's page: dark forest-floor washes, moss, leaf litter, a pale earth path along the route, printed text
  /* ---------- printed details (shared by the page painters) ---------- */
  // a fallen leaf: a pointed oval with a midrib, a darker rim
  function leafAt(c, x, y, len, wid, ang, col) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.beginPath(); c.moveTo(-len / 2, 0); c.quadraticCurveTo(0, -wid, len / 2, 0); c.quadraticCurveTo(0, wid, -len / 2, 0);
    c.fillStyle = col; c.fill(); c.strokeStyle = 'rgba(40,25,15,0.35)'; c.lineWidth = 0.8; c.stroke();
    c.beginPath(); c.moveTo(-len / 2 - len * 0.12, 0); c.lineTo(len * 0.4, 0); c.strokeStyle = 'rgba(40,25,15,0.4)'; c.stroke();
    c.restore();
  }
  // a pebble: a rounded stone lit from the top left (the moon), shadowed below
  function stoneAt(c, x, y, rx, ry, col) {
    c.fillStyle = 'rgba(15,20,15,0.35)'; c.beginPath(); c.ellipse(x + rx * 0.25, y + ry * 0.35, rx, ry, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(x - rx * 0.3, y - ry * 0.35, rx * 0.45, ry * 0.3, -0.4, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(30,25,30,0.45)'; c.lineWidth = 0.9; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.stroke();
  }
  // an ink-printed fern frond lying flat: a curved stem with paired leaflets
  function frondAt(c, x, y, len, ang, col, r) {
    c.save(); c.translate(x, y); c.rotate(ang); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.2;
    const bend = (r() - 0.5) * 0.5;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, len * bend, len, len * bend * 0.4); c.stroke();
    for (let k = 1; k < 9; k++) {
      const t = k / 9, px = len * t, py = len * bend * (2 * t * (1 - t)) + len * bend * 0.4 * t * t, l = len * 0.22 * (1 - t * 0.7);
      for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(px + l * 0.35, py + sd * l * 0.45, l * 0.5, l * 0.16, sd * 0.9, 0, Math.PI * 2); c.fill(); }
    }
    c.restore();
  }
  // a paw print (the wolves came this way)
  function pawAt(c, x, y, ang, sz, col) {
    c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = col;
    c.beginPath(); c.ellipse(0, sz * 0.25, sz * 0.42, sz * 0.34, 0, 0, Math.PI * 2); c.fill();
    for (const [tx, ty] of [[-0.42, -0.25], [-0.15, -0.5], [0.15, -0.5], [0.42, -0.25]]) { c.beginPath(); c.ellipse(tx * sz, ty * sz, sz * 0.14, sz * 0.18, tx, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
  // a little flower: white wood anemones and blue bells
  function flowerAt(c, x, y, sz, r) {
    if (r() < 0.6) {
      c.fillStyle = 'rgba(244,244,255,0.9)';
      for (let k = 0; k < 5; k++) { const a = k * 1.2566 + r() * 0.2; c.beginPath(); c.ellipse(x + Math.cos(a) * sz * 0.55, y + Math.sin(a) * sz * 0.55, sz * 0.42, sz * 0.28, a, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#f2c94c'; c.beginPath(); c.arc(x, y, sz * 0.25, 0, Math.PI * 2); c.fill();
    } else {
      c.strokeStyle = 'rgba(40,90,50,0.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y + sz * 1.6); c.quadraticCurveTo(x + sz * 0.6, y, x + sz * 1.2, y - sz * 0.2); c.stroke();
      c.fillStyle = r() < 0.5 ? '#7d8fe0' : '#9a86d8';
      for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(x + sz * (0.3 + k * 0.4), y + sz * (0.1 + k * 0.25), sz * 0.22, sz * 0.32, 0.3, 0, Math.PI * 2); c.fill(); }
    }
  }

  // the wood's printed page: a deep forest floor (moss, leaf litter, needles, ferns, clover, stones, flowers), a worn
  // earth path along the route (soft worn middle, pebbles, grit, cracks, wolf tracks, grass spilling over its edges),
  // muddy banks with reeds where the streams cut through, and the chapter's title in the margin
  function paintWood(L3, left) {
    return function (c, S, r, w, h) {
      const ox = left ? -L3.pw : 0, X = x => (x - ox) * S, Z = z => (z + L3.pd / 2) * S;
      const pts = L3.route, W = PC.HALF * 2 * S;
      // the ground: night greens, darker toward the far edge
      const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#26463c'); bg.addColorStop(0.5, '#335a48'); bg.addColorStop(1, '#3c644c');
      c.fillStyle = bg; c.fillRect(0, 0, w, h);
      // soft value changes, big and then smaller, so it never reads as one flat colour
      for (let i = 0; i < 120; i++) P.wash(c, r() * w, r() * h, S * (2.5 + r() * 3.5), ['#1d3a32', '#3a6250', '#2a4a3e', '#47684a'][Math.floor(r() * 4)], 0.16, r, { noEdge: true });
      for (let i = 0; i < 520; i++) P.wash(c, r() * w, r() * h, S * (0.35 + r() * 0.9), ['#2f5444', '#3d6650', '#24443c', '#55784e', '#4a5e3a'][Math.floor(r() * 5)], 0.2, r, { noEdge: r() < 0.7 });
      // moss: sponge-printed clumps of tiny dots
      for (let i = 0; i < 300; i++) {
        const cx = r() * w, cy = r() * h, rad = S * (0.4 + r() * 1.1), n = 90 + Math.floor(r() * 160);
        const pal = r() < 0.5 ? ['#7aa65a', '#5c8a48', '#94bb68'] : ['#55834c', '#46744a', '#71985c'];
        // a soft cushion under the dots, then the dots, lit from the top left
        c.globalAlpha = 0.35; P.wash(c, cx, cy, rad * 0.9, pal[1], 0.5, r, { noEdge: true });
        for (let k = 0; k < n; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * 0.8, up = (px - cx) + (py - cy) < 0; c.fillStyle = up ? pal[2] : pal[k % 2]; c.globalAlpha = 0.45 + r() * 0.4; c.beginPath(); c.arc(px, py, 1.2 + r() * 2.4, 0, Math.PI * 2); c.fill(); }
      }
      c.globalAlpha = 1;
      // moonlight dappling through the canopy (soft and few)
      for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h, rad = S * (1 + r() * 2), g = c.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, 'rgba(200,220,255,0.09)'); g.addColorStop(1, 'rgba(200,220,255,0)'); c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
      // pine needles
      c.lineWidth = 1.1;
      for (let i = 0; i < 2600; i++) { const x = r() * w, y = r() * h, a = r() * Math.PI, l = 5 + r() * 8; c.strokeStyle = r() < 0.6 ? 'rgba(120,85,45,0.45)' : 'rgba(170,135,70,0.4)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
      // printed ferns lying in the shade, clover patches
      for (let i = 0; i < 90; i++) frondAt(c, r() * w, r() * h, S * (0.8 + r() * 0.8), r() * Math.PI * 2, r() < 0.5 ? 'rgba(25,55,35,0.6)' : 'rgba(96,146,80,0.6)', r);
      for (let i = 0; i < 140; i++) { const cx = r() * w, cy = r() * h; for (let k = 0; k < 8; k++) { const x = cx + (r() - 0.5) * S * 0.8, y = cy + (r() - 0.5) * S * 0.5, sz = 3.5 + r() * 3; c.fillStyle = r() < 0.5 ? 'rgba(110,160,90,0.7)' : 'rgba(90,140,80,0.7)'; for (let q = 0; q < 3; q++) { const a = q * 2.09 + r() * 0.3; c.beginPath(); c.arc(x + Math.cos(a) * sz, y + Math.sin(a) * sz, sz, 0, Math.PI * 2); c.fill(); } } }
      // fallen leaves: oak browns, birch yellows, a few red
      for (let i = 0; i < 1100; i++) { const l = S * (0.16 + r() * 0.18); leafAt(c, r() * w, r() * h, l, l * 0.35, r() * Math.PI * 2, ['rgba(176,120,52,0.75)', 'rgba(140,90,40,0.7)', 'rgba(210,170,70,0.7)', 'rgba(170,70,45,0.7)', 'rgba(110,120,55,0.7)'][Math.floor(r() * 5)]); }
      // stones, flowers
      for (let i = 0; i < 160; i++) { const rx = 3 + r() * 6; stoneAt(c, r() * w, r() * h, rx, rx * (0.6 + r() * 0.3), ['#8a8f8c', '#9a958a', '#7a7f80', '#a8a296'][Math.floor(r() * 4)]); }
      for (let i = 0; i < 320; i++) flowerAt(c, r() * w, r() * h, 4 + r() * 4, r);
      // muddy banks with printed reeds where a stream cuts the page
      for (const [g0, g1] of L3.def.gaps) for (const [bx, sd] of [[g0, -1], [g1, 1]]) {
        const px = X(bx); if (px < -S * 2 || px > w + S * 2) continue;
        const gr = c.createLinearGradient(px, 0, px + sd * S * 1.4, 0); gr.addColorStop(0, 'rgba(62,48,32,0.85)'); gr.addColorStop(0.45, 'rgba(70,62,40,0.5)'); gr.addColorStop(1, 'rgba(70,62,40,0)');
        c.fillStyle = gr; c.fillRect(Math.min(px, px + sd * S * 1.4), 0, S * 1.4, h);
        for (let i = 0; i < 160; i++) { const rx = 2 + r() * 5; stoneAt(c, px + sd * r() * S * 0.7, r() * h, rx, rx * 0.7, ['#8a8f8c', '#a8a296', '#6f6a60'][Math.floor(r() * 3)]); }
        c.lineWidth = 1.6;
        for (let i = 0; i < 260; i++) { const x = px + sd * (0.2 + r() * 1.1) * S, y = r() * h, l = 8 + r() * 14; c.strokeStyle = r() < 0.5 ? 'rgba(60,100,50,0.7)' : 'rgba(100,130,60,0.6)'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + sd * 2, y - l * 0.6, x + sd * (1 + r() * 4), y - l); c.stroke(); }
      }
      // the path: sunk a touch into the ground, a worn darker border, a lighter trodden middle
      const route = () => { c.beginPath(); pts.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); };
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (const [wd, col] of [[1.12, 'rgba(15,25,18,0.3)'], [1.07, 'rgba(15,25,18,0.3)'], [1.0, '#86704a'], [0.95, '#9a8054']]) { c.strokeStyle = col; c.lineWidth = W * wd; route(); c.stroke(); }
      // the trodden middle: many thin layers, so it grades smoothly from the worn edges to the pale centre
      for (let k = 0; k < 16; k++) { const t = k / 15; c.strokeStyle = 'rgba(' + Math.round(176 + 50 * t) + ',' + Math.round(150 + 54 * t) + ',' + Math.round(104 + 54 * t) + ',0.16)'; c.lineWidth = W * (0.92 - 0.72 * t); route(); c.stroke(); }
      // the path's own texture, clipped to it: grit, pebbles, cracks, twigs, a few leaves, wolf tracks
      c.save();
      const inner = PC.offset(pts, PC.HALF * 0.9).concat(PC.offset(pts, -PC.HALF * 0.9).reverse());
      c.beginPath(); inner.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); c.closePath(); c.clip();
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], len = Math.hypot(x1 - x0, z1 - z0), nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
        const at = (t, o) => [X(x0 + (x1 - x0) * t + nx * o), Z(z0 + (z1 - z0) * t + nz * o)];
        for (let k = 0; k < len * 420; k++) { const [x, y] = at(r(), (r() - 0.5) * PC.HALF * 2); c.fillStyle = r() < 0.5 ? 'rgba(96,74,44,0.35)' : 'rgba(245,232,200,0.4)'; c.beginPath(); c.arc(x, y, 0.7 + r() * 1.3, 0, Math.PI * 2); c.fill(); }
        for (let k = 0; k < len * 22; k++) { const [x, y] = at(r(), (r() - 0.5) * PC.HALF * 2 * (r() < 0.6 ? 1 : 0.5)), rx = 1.8 + r() * 4.5; stoneAt(c, x, y, rx, rx * (0.6 + r() * 0.35), ['#b7aa92', '#9d9384', '#c9bca0', '#8c8478', '#a89a80'][Math.floor(r() * 5)]); }
        c.lineWidth = 1;
        for (let k = 0; k < len * 1.2; k++) { let [x, y] = at(r(), (r() - 0.5) * PC.HALF * 1.6); c.strokeStyle = 'rgba(70,52,30,0.35)'; c.beginPath(); c.moveTo(x, y); for (let q = 0; q < 3; q++) { x += (r() - 0.5) * 14; y += (r() - 0.5) * 14; c.lineTo(x, y); } c.stroke(); }
        c.lineWidth = 2;
        for (let k = 0; k < len * 0.8; k++) { const [x, y] = at(r(), (r() - 0.5) * PC.HALF * 1.6), a = r() * Math.PI, l = 10 + r() * 16; c.strokeStyle = 'rgba(92,62,36,0.6)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.lineTo(x + Math.cos(a) * l + 4, y + Math.sin(a) * l - 3); c.stroke(); }
        for (let k = 0; k < len * 1.6; k++) { const [x, y] = at(r(), (r() - 0.5) * PC.HALF * 1.8), l = S * (0.1 + r() * 0.1); leafAt(c, x, y, l, l * 0.35, r() * Math.PI * 2, ['rgba(176,120,52,0.8)', 'rgba(210,170,70,0.75)', 'rgba(170,70,45,0.75)'][Math.floor(r() * 3)]); }
        // a wolf's trail, trotting the way the chase goes
        const ang = Math.atan2(Z(z1) - Z(z0), X(x1) - X(x0)) + Math.PI / 2;
        for (let d = 0.5; d < len - 0.5; d += 0.75) { const sd = (Math.round(d / 0.75) % 2) ? 1 : -1, [x, y] = at(d / len, sd * 0.28 + 0.5); pawAt(c, x, y, ang, S * 0.16, 'rgba(70,50,32,0.45)'); }
      }
      c.restore();
      // grass spilling over the path's edges, and a broken printed outline
      c.lineWidth = 1.5;
      for (const sd of [-1, 1]) {
        const edge = PC.offset(pts, sd * PC.HALF * 0.93);
        for (let i = 0; i < edge.length - 1; i++) {
          const [ax, az] = edge[i], [bx, bz] = edge[i + 1], len = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / len * sd, nz = (bx - ax) / len * sd;
          for (let d = 0; d < len; d += 0.09) {
            const t = d / len, x = X(ax + (bx - ax) * t + nx * 0.08), y = Z(az + (bz - az) * t + nz * 0.08), n = 2 + Math.floor(r() * 3);
            for (let q = 0; q < n; q++) { const l = 6 + r() * 11, lean = (r() - 0.5) * 0.9; c.strokeStyle = ['rgba(60,110,55,0.85)', 'rgba(95,140,70,0.8)', 'rgba(40,80,45,0.85)'][Math.floor(r() * 3)]; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - nx * l * 0.5 * S / S + lean * 4, y - nz * l * 0.5, x - nx * l + lean * l * 0.6, y - nz * l - l * 0.4); c.stroke(); }
          }
          c.strokeStyle = 'rgba(43,33,48,0.4)'; c.lineWidth = 1.8;
          for (let d = 0; d < len; d += 0.6) { if (r() < 0.25) continue; const t0 = d / len, t1 = Math.min(1, (d + 0.4 + r() * 0.2) / len); c.beginPath(); c.moveTo(X(ax + (bx - ax) * t0) + (r() - 0.5) * 2, Z(az + (bz - az) * t0) + (r() - 0.5) * 2); c.lineTo(X(ax + (bx - ax) * t1) + (r() - 0.5) * 2, Z(az + (bz - az) * t1) + (r() - 0.5) * 2); c.stroke(); }
          c.lineWidth = 1.5;
        }
      }
      // fold lines printed where the pop-ups stand (a dashed valley fold beside the path)
      c.setLineDash([10, 8]); c.strokeStyle = 'rgba(240,230,200,0.22)'; c.lineWidth = 2;
      for (const sd of [-1, 1]) { c.beginPath(); PC.offset(pts, sd * (PC.HALF + 0.7)).forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); c.stroke(); }
      c.setLineDash([]);
      // paper grain over everything, and a printed shadow round the page's outer edges
      for (let i = 0; i < 5000; i++) { const x = r() * w, y = r() * h, a = r() * Math.PI, l = 3 + r() * 6; c.strokeStyle = r() < 0.5 ? 'rgba(255,250,235,0.06)' : 'rgba(0,0,0,0.06)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
      const vg = (x0, y0, x1, y1) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(10,15,20,0.35)'); g.addColorStop(1, 'rgba(10,15,20,0)'); c.fillStyle = g; };
      vg(0, 0, 0, S * 2.5); c.fillRect(0, 0, w, S * 2.5);
      vg(0, h, 0, h - S * 1.5); c.fillRect(0, h - S * 1.5, w, S * 1.5);
      if (left) { vg(0, 0, S * 2, 0); c.fillRect(0, 0, S * 2, h); } else { vg(w, 0, w - S * 2, 0); c.fillRect(w - S * 2, 0, S * 2, h); }
      // the page's title and a printed line of the story, in the margins
      c.fillStyle = 'rgba(240,232,210,0.85)'; c.font = 'italic ' + Math.round(S * 0.9) + 'px Georgia, "DejaVu Serif", serif';
      if (left) { c.textAlign = 'left'; c.fillText('Chapter Two: The Deep Dark Wood', X(-L3.pw + 1.6), Z(-L3.pd / 2 + 1.5)); }
      else { c.textAlign = 'right'; c.font = 'italic ' + Math.round(S * 0.6) + 'px Georgia, "DejaVu Serif", serif'; c.fillText('...and the wolves were not asleep at all.', X(L3.pw - 1.4), Z(L3.pd / 2 - 0.7)); }
    };
  }

  /* ---------- the spread's printed pages ---------- */
  function pageTex(L3, left) {
    const paint = { wood: paintWood }[L3.def.decor] || paintWood;
    return P.pageTex('pc' + L3.k + (left ? 'L' : 'R'), L3.pw, L3.pd, paint(L3, left), { ppu: 88, text: false, num: String(L3.k * 2 + 3 + (left ? 0 : 1)), numAt: left ? [2, L3.pd - 0.6] : [L3.pw - 2, L3.pd - 0.6], gutter: left ? 'right' : 'left' });
  }

  /* ---------- machinery and set pieces ---------- */
  const STRIPES = () => K3D.paint('pcTabStripes', 256, 128, (c, w, h) => {
    c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d4343a'; for (let x = -h; x < w; x += 36) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 18, h); c.lineTo(x + 18 + h, 0); c.lineTo(x + h, 0); c.closePath(); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.92)'; c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.34, h * 0.32, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#2b2130'; c.lineWidth = 3; c.stroke();
    // a printed arrow and PULL
    c.fillStyle = '#2b2130'; c.font = 'bold 34px Georgia, "DejaVu Serif", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PULL', w / 2 + 14, h / 2 + 2);
    c.beginPath(); c.moveTo(w / 2 - 70, h / 2); c.lineTo(w / 2 - 50, h / 2 - 14); c.lineTo(w / 2 - 50, h / 2 + 14); c.closePath(); c.fill();
  });
  // a pull-tab: a striped card lying in a slot, with a raised tongue to grab and a brass fastener
  function tab(x, z, rot = 0) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    const tex = STRIPES();
    const base = P.card(P.shapeFrom([[-0.75, -0.4], [0.6, -0.4], [0.8, -0.2], [0.8, 0.2], [0.6, 0.4], [-0.75, 0.4]]), { tex, depth: 0.03 });
    base.rotation.x = -Math.PI / 2; base.position.y = 0.02; g.add(base);
    const slot = new T.Mesh(K3D.geo('pcSlot', () => new T.PlaneGeometry(0.1, 0.9).rotateX(-Math.PI / 2)), K3D.mat('pcSlotM', () => K3D.flat('#2a1d18'))); slot.position.set(-0.85, 0.006, 0); g.add(slot);
    const tongue = new T.Group(); tongue.position.set(0.8, 0.03, 0); g.add(tongue);
    const tg = P.card(P.shapeFrom([[0, -0.32], [0.38, -0.26], [0.46, 0], [0.38, 0.26], [0, 0.32]]), { tex, depth: 0.03 });
    tg.rotation.x = -Math.PI / 2; tongue.add(tg); tongue.rotation.z = 0.5;
    const f = P.fastener(0.08); f.position.set(-0.55, 0.05, 0); f.rotation.x = -Math.PI / 2; g.add(f);
    // a glow ring when somebody can work it
    const glow = new T.Mesh(K3D.geo('pcTabGlow', () => new T.RingGeometry(0.95, 1.12, 40).rotateX(-Math.PI / 2)), K3D.flat('#ffd76a', { transparent: true, opacity: 0, depthWrite: false, add: true }));
    glow.position.y = 0.02; g.add(glow);
    g.userData = { tongue, glow, base };
    return g;
  }
  // a fallen log, box-folded: a six-sided card prism with bark print and ringed ends
  function log(x, z, len) {
    const g = new T.Group(); g.position.set(x, 0, z);
    const bark = K3D.paint('pcBark', 512, 128, (c, w, h) => { const r = P.rng(461); c.fillStyle = '#6a4a30'; c.fillRect(0, 0, w, h); for (let i = 0; i < 120; i++) { c.strokeStyle = r() < 0.5 ? 'rgba(30,18,10,0.5)' : 'rgba(170,130,90,0.4)'; c.lineWidth = 1 + r() * 2; const y = r() * h; c.beginPath(); c.moveTo(r() * w, y); c.lineTo(r() * w, y + (r() - 0.5) * 6); c.stroke(); } for (let i = 0; i < 10; i++) P.wash(c, r() * w, r() * h, 18, '#4a7a3a', 0.4, r); }, { repeat: true });
    const ends = K3D.paint('pcLogEnd', 128, 128, (c, w, h) => { c.fillStyle = '#d9b98a'; c.beginPath(); c.arc(64, 64, 62, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(120,80,40,0.55)'; c.lineWidth = 2; for (let rr2 = 10; rr2 < 60; rr2 += 9) { c.beginPath(); c.arc(64, 64, rr2, 0, Math.PI * 2); c.stroke(); } });
    const m = K3D.mesh(new T.CylinderGeometry(0.3, 0.3, len, 6).rotateX(Math.PI / 2).translate(0, 0.27, 0), [K3D.toon('#ffffff', { map: bark }), K3D.toon('#ffffff', { map: ends }), K3D.toon('#ffffff', { map: ends })], { ink: INK });
    g.add(m);
    // a toadstool on top and a tuft of moss
    const st0 = K3D.mesh(new T.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), K3D.toon('#c8402e'), { ink: INK }); st0.position.set(0.05, 0.62, len * 0.25); g.add(st0);
    const stem = K3D.mesh(new T.CylinderGeometry(0.05, 0.06, 0.1, 8), K3D.toon('#efe2c4'), { ink: INK }); stem.position.set(0.05, 0.58, len * 0.25); g.add(stem);
    return g;
  }
  // the card bridge: planks printed on a strip that slides out of a slot, rope rails on card posts
  function bridge(pc) {
    const g = new T.Group(); g.position.set(pc.x0 - 0.4, 0, pc.z);
    const planks = K3D.paint('pcPlanks', 512, 256, (c, w, h) => { const r = P.rng(471); for (let x = 0; x < w; x += 32) { c.fillStyle = mixHex('#b88a58', '#9a6a3e', r()); c.fillRect(x + 1, 0, 30, h); c.strokeStyle = 'rgba(43,33,48,0.6)'; c.lineWidth = 2; c.strokeRect(x + 1, 0, 30, h); c.fillStyle = 'rgba(43,33,48,0.6)'; c.beginPath(); c.arc(x + 8, 20, 2.5, 0, 7); c.arc(x + 8, h - 20, 2.5, 0, 7); c.fill(); } }, { repeat: true });
    const inner = new T.Group(); g.add(inner);
    const deck = K3D.mesh(new T.BoxGeometry(1, 0.12, PC.HALF * 2 - 0.15).translate(0.5, -0.06, 0), [K3D.toon(EDGE), K3D.toon(EDGE), K3D.toon('#ffffff', { map: planks }), K3D.toon('#9a6a3e'), K3D.toon(EDGE), K3D.toon(EDGE)], { ink: INK });
    inner.add(deck);
    const rails = [];
    for (const s of [-1, 1]) {
      const rope = K3D.mesh(new T.CylinderGeometry(0.03, 0.03, 1, 6).rotateZ(Math.PI / 2).translate(0.5, 0.55, 0), K3D.toon('#d8c08a'), { ink: '#5a4020', inkW: 0.6 });
      rope.position.z = s * (PC.HALF - 0.15); inner.add(rope); rails.push(rope);
    }
    const posts = [];
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const p = K3D.mesh(K3D.geo('pcPost', () => new T.BoxGeometry(0.08, 0.6, 0.08).translate(0, 0.3, 0)), K3D.mat('pcPostM', () => K3D.toon('#8a5a34')), { ink: INK, inkW: 0.6 }); p.position.z = s * (PC.HALF - 0.15); inner.add(p); posts.push(p); }
    // the slot it lives in, printed dark on the near bank
    const slot = new T.Mesh(new T.PlaneGeometry(0.18, PC.HALF * 2 - 0.1).rotateX(-Math.PI / 2), K3D.flat('#20160f')); slot.position.set(0.32, 0.005, 0); g.add(slot);
    g.userData = { inner, deck, rails, posts, set(e) {
      const L = pc.len * e + 0.4;
      deck.scale.x = L; for (const r of rails) r.scale.x = L;
      posts.forEach((p, i) => { p.position.x = ((i >> 1) / 5) * L; p.visible = L > 0.45; });
      inner.visible = e > 0.01;
    } };
    return g;
  }
  // a stream cut through the page: the page block's cut walls, blue tissue water, paper ripples
  function trench(K, L3, x0, x1, kind) {
    const g = new T.Group(), w = x1 - x0, pd = L3.pd;
    const edge = K3D.paint('pcCutEdge', 256, 128, (c, ww, h) => { const r = P.rng(481); c.fillStyle = '#efe4c8'; c.fillRect(0, 0, ww, h); for (let y = 0; y < h; y += 2) { c.fillStyle = r() < 0.5 ? 'rgba(120,95,60,0.2)' : 'rgba(255,255,255,0.25)'; c.fillRect(0, y, ww, 1); } }, { repeat: true });
    const wm = K3D.toon('#ffffff', { map: edge, side: T.DoubleSide });
    for (const sx of [x0, x1]) { const m = K3D.mesh(new T.PlaneGeometry(pd, 1.3).rotateY(Math.PI / 2), wm, { ink: false, cast: false }); m.position.set(sx, -0.65, 0); g.add(m); }
    // a texture painted so it tiles: everything is drawn nine times, shifted by the tile's size
    const tiled = (key, size, paint) => K3D.paint(key, size, size, (c, ww, hh) => {
      const r = P.rng(key.length * 13 + 5), ops = [];
      paint((fn) => ops.push(fn), c, ww, hh, r);
      for (const fn of ops) for (const dx of [-ww, 0, ww]) for (const dy of [-hh, 0, hh]) { c.save(); c.translate(dx, dy); fn(c); c.restore(); }
    }, { repeat: true });
    const scaleUV = (geo, su, sv) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return geo; };
    // the stream bed: dark blue-green sand in ripples, pebbles, a little weed
    const bedTex = tiled('pcBed', 512, (add, c, ww, hh, r) => {
      c.fillStyle = '#2c5566'; c.fillRect(0, 0, ww, hh);
      for (let i = 0; i < 40; i++) { const x = r() * ww, y = r() * hh, rad = 30 + r() * 70, col = ['#244a5a', '#386878', '#2f5a52'][Math.floor(r() * 3)]; add(c => P.wash(c, x, y, rad, col, 0.35, P.rng(i + 7), { noEdge: true })); }
      for (let i = 0; i < 26; i++) { const y = r() * hh, a = r() * 6; add(c => { c.strokeStyle = 'rgba(150,190,190,0.18)'; c.lineWidth = 3; c.beginPath(); for (let x = -10; x <= ww + 10; x += 8) c.lineTo(x, y + Math.sin(x * 0.03 + a) * 6); c.stroke(); }); }
      for (let i = 0; i < 140; i++) { const x = r() * ww, y = r() * hh, rx = 3 + r() * 9, ry = rx * (0.6 + r() * 0.3), col = ['#5f7a80', '#7a8a84', '#4a6670', '#8a8a78'][Math.floor(r() * 4)]; add(c => stoneAt(c, x, y, rx, ry, col)); }
      for (let i = 0; i < 18; i++) { const x = r() * ww, y = r() * hh, l = 20 + r() * 30, b = (r() - 0.5) * 20; add(c => { c.strokeStyle = 'rgba(70,120,70,0.7)'; c.lineWidth = 2.5; for (let q = 0; q < 3; q++) { c.beginPath(); c.moveTo(x + q * 4, y); c.quadraticCurveTo(x + q * 4 + b, y - l * 0.5, x + q * 4 + b * 0.4, y - l); c.stroke(); } }); }
    });
    const fl = K3D.mesh(scaleUV(new T.PlaneGeometry(w, pd).rotateX(-Math.PI / 2), w / 3, pd / 3), K3D.mat('pcBedM', () => K3D.toon('#ffffff', { map: bedTex })), { ink: false, cast: false });
    fl.position.set((x0 + x1) / 2, -1.28, 0); g.add(fl);
    // the water: layered blue tissue with flowing highlight lines, see-through to the bed
    const waterTex = tiled('pcWater', 512, (add, c, ww, hh, r) => {
      c.fillStyle = '#4a96c8'; c.fillRect(0, 0, ww, hh);
      for (let i = 0; i < 50; i++) { const x = r() * ww, y = r() * hh, rad = 30 + r() * 80, col = ['#3a80b8', '#5aa6d6', '#7cc0e6', '#2f70a8'][Math.floor(r() * 4)]; add(c => P.wash(c, x, y, rad, col, 0.28, P.rng(i + 31), { noEdge: true })); }
      // flowing lines (the stream runs along the tile's height)
      for (let i = 0; i < 90; i++) {
        const x = r() * ww, y = r() * hh, l = 40 + r() * 120, ph = r() * 6, amp = 2 + r() * 5, light = r() < 0.7, lw = light ? 1.2 + r() * 2 : 2 + r() * 2, al = light ? 0.35 + r() * 0.35 : 0.25;
        add(c => { c.strokeStyle = light ? 'rgba(235,248,255,' + al + ')' : 'rgba(30,85,140,' + al + ')'; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); for (let k = 0; k <= l; k += 6) c.lineTo(x + Math.sin(k * 0.05 + ph) * amp, y + k); c.stroke(); });
      }
      // glints
      for (let i = 0; i < 40; i++) { const x = r() * ww, y = r() * hh, l = 4 + r() * 8; add(c => { c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + l); c.stroke(); }); }
    });
    const waterM = K3D.mat('pcWaterM', () => K3D.toon('#ffffff', { map: waterTex, transparent: true, opacity: 0.74, side: T.DoubleSide, depthWrite: false }));
    const water = new T.Mesh(scaleUV(new T.PlaneGeometry(w, pd, 1, 1).rotateX(-Math.PI / 2), w / 4, pd / 4), waterM);
    water.position.set((x0 + x1) / 2, -0.5, 0); water.renderOrder = 2; g.add(water);
    // white paper foam frilled along both banks
    const foamTex = tiled('pcFoam', 256, (add, c, ww, hh, r) => {
      c.clearRect(0, 0, ww, hh);
      for (let i = 0; i < 70; i++) { const y = r() * hh, x = r() * ww * 0.35, rad = 8 + r() * 18 * (1 - x / (ww * 0.35)); add(c => { c.fillStyle = 'rgba(250,252,255,0.92)'; c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fill(); }); }
      for (let i = 0; i < 60; i++) { const y = r() * hh, x = ww * 0.3 + r() * ww * 0.5, rad = 1.5 + r() * 4; add(c => { c.strokeStyle = 'rgba(250,252,255,0.8)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.stroke(); }); }
      c.globalCompositeOperation = 'source-over';
    });
    const foamM = K3D.mat('pcFoamM', () => { const m = K3D.toon('#ffffff', { map: foamTex, transparent: true, side: T.DoubleSide, depthWrite: false }); return m; });
    const foams = [];
    for (const [bx, sd] of [[x0, 1], [x1, -1]]) {
      const geo = scaleUV(new T.PlaneGeometry(0.9, pd).rotateX(-Math.PI / 2), 1, pd / 2.2);
      if (sd < 0) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)); }
      const f = new T.Mesh(geo, foamM); f.position.set(bx + sd * 0.45, -0.48, 0); f.renderOrder = 3; g.add(f); foams.push(f);
    }
    // paper ripples standing on the water: little scalloped wave cards
    const r = P.rng(Math.round(x0 * 7));
    const wave = K3D.paint('pcRipple2', 256, 96, (c, ww, h) => { const g2 = c.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, '#f4fbff'); g2.addColorStop(0.35, '#bfe4f6'); g2.addColorStop(1, '#5aa6d6'); c.fillStyle = g2; c.fillRect(0, 0, ww, h); c.strokeStyle = 'rgba(60,130,190,0.6)'; c.lineWidth = 2; for (let k = 0; k < 3; k++) { c.beginPath(); for (let x = 0; x <= ww; x += 8) c.lineTo(x, 34 + k * 18 + Math.sin(x * 0.06 + k) * 4); c.stroke(); } });
    const ripples = [];
    for (let i = 0; i < 6; i++) {
      const m = P.card(P.scallopShape(1.4, 0.3, 4, 0.4, r), { tex: wave, depth: 0.02, inkW: 0.7, cast: false });
      m.position.set(x0 + 0.8 + r() * (w - 1.6), -0.5, -pd / 2 + 1 + r() * (pd - 2)); m.rotation.y = (r() - 0.5) * 0.4;
      g.add(m); ripples.push({ m, ph: r() * 6 });
    }
    const padTex = K3D.paint('pcLily', 128, 128, (c, ww, h) => { c.clearRect(0, 0, ww, h); c.fillStyle = '#4f8a46'; c.beginPath(); c.moveTo(64, 64); c.arc(64, 64, 60, 0.35, Math.PI * 2 - 0.1); c.closePath(); c.fill(); c.strokeStyle = 'rgba(30,60,30,0.7)'; c.lineWidth = 3; c.stroke(); c.strokeStyle = 'rgba(200,240,180,0.4)'; c.lineWidth = 2; for (let a = 0.6; a < 6; a += 0.7) { c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50); c.stroke(); } });
    for (let i = 0; i < 7; i++) { const lp = new T.Mesh(K3D.geo('pcLilyG', () => new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), K3D.mat('pcLilyM', () => K3D.toon('#ffffff', { map: padTex, transparent: true, alphaTest: 0.5 }))); const sz = 0.5 + r() * 0.5; lp.scale.set(sz, 1, sz); lp.position.set(x0 + 0.5 + r() * (w - 1), -0.48, -pd / 2 + 1 + r() * (pd - 2)); lp.rotation.y = r() * 6; g.add(lp); ripples.push({ m: lp, ph: r() * 6 }); }
    g.userData.tick = t => { waterTex.offset.set(0, -t * 0.07); foamTex.offset.set(0, -t * 0.05); for (const q of ripples) q.m.position.y = -0.52 + Math.sin(t * 1.6 + q.ph) * 0.04; };
    void kind; void K;
    return g;
  }
  // a wolf on a stick: a flat paper cut-out sliding in a slot across the path
  function slider(sl) {
    const g = new T.Group(); g.position.set(sl.x, 0, 0);
    const tex = K3D.paint('pcWolf', 384, 256, (c, w, h) => {
      const r = P.rng(491); c.clearRect(0, 0, w, h);
      c.save(); c.beginPath();
      c.moveTo(30, 200); c.lineTo(60, 120); c.lineTo(110, 95); c.lineTo(200, 100); c.lineTo(260, 70); c.lineTo(280, 30); c.lineTo(300, 70); c.lineTo(320, 55); c.lineTo(325, 85); c.lineTo(370, 115); c.lineTo(345, 135); c.lineTo(300, 135);
      c.lineTo(280, 205); c.lineTo(260, 205); c.lineTo(255, 160); c.lineTo(150, 165); c.lineTo(130, 210); c.lineTo(110, 210); c.lineTo(108, 160); c.lineTo(70, 150); c.lineTo(45, 210); c.closePath(); c.clip();
      c.fillStyle = '#7a849a'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) P.wash(c, r() * w, r() * h, 20 + r() * 20, r() < 0.5 ? '#5a6478' : '#9aa4b8', 0.4, r, { noEdge: true });
      // a pale belly and muzzle so the cut-out reads against the dark wood
      c.fillStyle = 'rgba(235,232,225,0.75)'; c.beginPath(); c.ellipse(190, 160, 70, 14, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(345, 120, 22, 12, 0.3, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(220,225,240,0.4)'; c.lineWidth = 2; for (let i = 0; i < 60; i++) { const x = 70 + r() * 230, y = 100 + r() * 60; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 8, y + 6); c.stroke(); }
      c.restore();
      c.fillStyle = '#ffd34a'; c.beginPath(); c.arc(315, 88, 7, 0, Math.PI * 2); c.fill(); c.fillStyle = '#2b2130'; c.beginPath(); c.arc(316, 88, 3, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fbf3e0'; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(335 + k * 7, 122); c.lineTo(339 + k * 7, 132); c.lineTo(343 + k * 7, 122); c.fill(); }
    });
    const shape = P.shapeFrom([[-0.85, 0.05], [-0.55, 0.36], [-0.3, 0.45], [0.2, 0.44], [0.45, 0.6], [0.52, 0.76], [0.62, 0.62], [0.88, 0.48], [0.78, 0.38], [0.5, 0.37], [0.42, 0.05], [0.3, 0.05], [0.28, 0.24], [-0.25, 0.22], [-0.33, 0.05], [-0.45, 0.05], [-0.48, 0.26], [-0.62, 0.3], [-0.72, 0.05]]);
    const card = P.card(shape, { tex, depth: 0.04, inkW: 1 });
    const fig = new T.Group(); fig.add(card); card.position.y = 0.3; card.scale.setScalar(1.6);
    const stick = K3D.mesh(K3D.geo('pcStick', () => new T.CylinderGeometry(0.035, 0.035, 0.4, 6).translate(0, 0.2, 0)), K3D.mat('pcStickM', () => K3D.toon('#c8a46a')), { ink: INK, inkW: 0.6 }); fig.add(stick);
    g.add(fig);
    const slot = new T.Mesh(new T.PlaneGeometry(0.16, sl.z1 - sl.z0 + 0.5).rotateX(-Math.PI / 2), K3D.flat('#1a1210')); slot.position.set(0, 0.008, (sl.z0 + sl.z1) / 2); g.add(slot);
    const glow = new T.Mesh(new T.PlaneGeometry(0.5, sl.z1 - sl.z0 + 0.9).rotateX(-Math.PI / 2), K3D.flat('#ff8a5a', { transparent: true, opacity: 0, depthWrite: false, add: true })); glow.position.set(0, 0.012, (sl.z0 + sl.z1) / 2); g.add(glow);
    g.userData = { fig, glow };
    return g;
  }
  // the dog-ear: the right page's near outer corner folded in, with a glowing rim
  function dogEarMesh(L3) {
    const g = new T.Group(), pw = L3.pw, pd = L3.pd, a = 7;
    const tex = K3D.paint('pcDogEar', 256, 256, (c, w, h) => { P.paper(c, w, h, '#f6eed8', 501); c.fillStyle = 'rgba(59,48,64,0.18)'; c.font = '22px Georgia, serif'; for (let y = 40; y < h; y += 30) c.fillText('and so they ran and ran and ran', 10, y); });
    const flap = P.card(P.shapeFrom([[0, 0], [a, 0], [0, a]]), { tex, depth: 0.02, inkW: 0.8 });
    // the flap lies over the page, its fold along the diagonal from (pw - a, pd/2) to (pw, pd/2 - a)
    flap.rotation.x = -Math.PI / 2; flap.position.set(pw - a, 0.03, pd / 2); g.add(flap);
    const glowGeo = new T.BufferGeometry().setFromPoints([new T.Vector3(pw - a, 0.06, pd / 2), new T.Vector3(pw, 0.06, pd / 2 - a), new T.Vector3(pw - a, 0.06, pd / 2 - a), new T.Vector3(pw - a, 0.06, pd / 2)]);
    const rim = new T.Line(glowGeo, new T.LineBasicMaterial({ color: '#ffd76a', transparent: true, opacity: 0.9 }));
    g.add(rim);
    const halo = new T.Mesh(K3D.geo('pcDogHalo', () => new T.CircleGeometry(1, 40).rotateX(-Math.PI / 2)), K3D.flat('#ffd76a', { transparent: true, opacity: 0.25, depthWrite: false, add: true }));
    halo.position.set(L3.dogEar.x, 0.07, L3.dogEar.z); halo.scale.setScalar(PC.S.dogR); g.add(halo);
    g.userData = { rim, halo, flap };
    return g;
  }
  // the backdrop along the far edge: night-sky panels cut with a moon and stars (they fold up like the rest)
  function skyTex(i) {
    return K3D.paint('pcSky' + i, 512, 384, (c, w, h) => {
      const r = P.rng(511 + i);
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1a2448'); g.addColorStop(1, '#3a4a78'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 40; k++) P.wash(c, r() * w, r() * h, 30 + r() * 40, r() < 0.5 ? '#2a3a68' : '#141c3a', 0.35, r, { noEdge: true });
      for (let k = 0; k < 70; k++) { c.fillStyle = 'rgba(255,248,220,' + (0.4 + r() * 0.6) + ')'; const x = r() * w, y = r() * h * 0.7, s2 = 1 + r() * 2.5; c.beginPath(); for (let j = 0; j < 10; j++) { const a2 = j * Math.PI / 5, rr2 = j % 2 ? s2 * 0.45 : s2 * 1.4; c.lineTo(x + Math.cos(a2) * rr2, y + Math.sin(a2) * rr2); } c.fill(); }
      // far hills of trees along the bottom
      c.fillStyle = '#0f1a2a'; c.beginPath(); c.moveTo(0, h);
      for (let x = 0; x <= w; x += 14) { const th = 50 + Math.sin(x * 0.03 + i) * 14 + r() * 26; c.lineTo(x, h - th); c.lineTo(x + 7, h - th - 18); }
      c.lineTo(w, h); c.closePath(); c.fill();
      c.fillStyle = 'rgba(240,230,190,0.7)'; c.font = 'italic 20px Georgia, serif'; if (i === 2) c.fillText('Once upon a time...', 20, 40);
    });
  }

  /* ---------- the Roll: the curl of paper, the Reader's hand, its sleeve ---------- */
  function roll(K, L3) {
    const g = new T.Group();
    const back = K3D.paint('pcCurlBack', 1024, 256, (c, w, h) => {
      P.paper(c, w, h, '#f3ead2', 521); const r = P.rng(522);
      c.fillStyle = 'rgba(59,48,64,0.32)'; c.font = '18px Georgia, "DejaVu Serif", serif';
      for (let y = 24; y < h; y += 24) { let x = 10; while (x < w - 60) { const wd = ['the', 'wolf', 'and', 'once', 'upon', 'a', 'time', 'castle', 'sea', 'ran', 'very', 'fast', 'far', 'away'][Math.floor(r() * 14)]; c.fillText(wd, x, y); x += c.measureText(wd + ' ').width; } }
      for (let i = 0; i < 6; i++) { const x = r() * w, y = r() * h; c.strokeStyle = 'rgba(59,48,64,0.35)'; c.lineWidth = 2; c.strokeRect(x, y, 70, 50); P.wash(c, x + 35, y + 25, 22, ['#7aa0c8', '#c8786a', '#7ab07a'][i % 3], 0.35, r); }
    }, { repeat: true });
    back.repeat.set(1, 7);
    const curlGeo = new T.CylinderGeometry(R, R, L3.pd + 0.4, 48, 1, true).rotateX(Math.PI / 2);
    const curl = K3D.mesh(curlGeo, K3D.toon('#ffffff', { map: back, side: T.DoubleSide }), { ink: '#5a4630', inkW: 1.1 });
    const spin = new T.Group(); spin.add(curl); spin.position.y = R; g.add(spin);
    // the spiral ends of the roll
    const spiral = K3D.paint('pcSpiral', 256, 256, (c, w, h) => {
      c.fillStyle = '#efe4c8'; c.beginPath(); c.arc(128, 128, 126, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(110,85,50,0.75)'; c.lineWidth = 3; c.beginPath();
      for (let a = 0; a < Math.PI * 16; a += 0.05) { const rr2 = 4 + a * 2.4; c.lineTo(128 + Math.cos(a) * rr2, 128 + Math.sin(a) * rr2); }
      c.stroke(); c.strokeStyle = '#2b2130'; c.lineWidth = 4; c.beginPath(); c.arc(128, 128, 125, 0, Math.PI * 2); c.stroke();
    });
    for (const s of [-1, 1]) {
      const cap = new T.Mesh(K3D.geo('pcCap', () => new T.CircleGeometry(R, 48)), K3D.toon('#ffffff', { map: spiral, side: T.DoubleSide }));
      cap.position.z = s * (L3.pd / 2 + 0.2); spin.add(cap);
    }
    // the shadow it throws ahead: a soft dark band on the page (the warning)
    const shTex = K3D.paint('pcRollShadow', 256, 16, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(20,10,30,0.62)'); gr.addColorStop(0.35, 'rgba(20,10,30,0.3)'); gr.addColorStop(1, 'rgba(20,10,30,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    const shadow = new T.Mesh(new T.PlaneGeometry(9, L3.pd).rotateX(-Math.PI / 2).translate(4.5, 0, 0), K3D.flat('#ffffff', { map: shTex, transparent: true, depthWrite: false }));
    shadow.material.polygonOffset = true; shadow.material.polygonOffsetFactor = -3; shadow.renderOrder = 1; g.add(shadow);
    const hand = readerHand(); g.add(hand);
    K.add(g);
    return { g, spin, shadow, hand };
  }
  // the Reader's hand: a child's hand at bedtime, huge and unhurried, in a teal-and-cream striped pyjama sleeve
  function readerHand() {
    const g = new T.Group();
    const skin = K3D.toon('#f4c6a2'), skinInk = '#8a5040', nail = K3D.toon('#fbe0dc');
    const palm = K3D.mesh(K3D.roundBox(2.4, 0.95, 3.6, 0.55, 40), skin, { ink: skinInk, inkW: 1.2 });
    const wrist = new T.Group(); g.add(wrist);
    palm.position.set(-1.2, -0.45, 0); wrist.add(palm);
    // four fingers, three joints each, hooked forward over the top of the curl
    const fingers = [];
    const lens = [[1.15, 0.95, 0.75], [1.3, 1.05, 0.8], [1.25, 1.0, 0.78], [1.0, 0.8, 0.62]];
    const rad = [0.36, 0.38, 0.37, 0.32];
    for (let k = 0; k < 4; k++) {
      const base = new T.Group(); base.position.set(-0.05, -0.1, -1.35 + k * 0.9); wrist.add(base);
      let parent = base; const joints = [];
      for (let j = 0; j < 3; j++) {
        const jt = new T.Group(); parent.add(jt);
        if (j) jt.position.x = lens[k][j - 1];
        const seg = K3D.mesh(K3D.geo('pcFing' + k + j, () => new T.CapsuleGeometry(rad[k] * (1 - j * 0.08), lens[k][j], 6, 14).rotateZ(-Math.PI / 2).translate(lens[k][j] / 2, 0, 0)), skin, { ink: skinInk, inkW: 1.1 });
        jt.add(seg); joints.push(jt);
        if (j === 2) { const nl = new T.Mesh(K3D.geo('pcNail', () => new T.SphereGeometry(0.22, 12, 8)), nail); nl.scale.set(0.9, 0.3, 0.75); nl.position.set(lens[k][j] - 0.1, rad[k] * 0.78, 0); jt.add(nl); }
        parent = jt;
      }
      fingers.push(joints);
    }
    // the thumb, on the near side, tucked down the curl's flank
    const th = new T.Group(); th.position.set(-1.3, -0.5, 1.9); wrist.add(th);
    const t1 = K3D.mesh(new T.CapsuleGeometry(0.42, 1.0, 6, 14).rotateZ(-Math.PI / 2).translate(0.5, 0, 0), skin, { ink: skinInk, inkW: 1.1 });
    th.add(t1); th.rotation.set(0.6, -0.5, -0.9);
    const t2 = new T.Group(); t2.position.x = 1.0; th.add(t2);
    t2.add(K3D.mesh(new T.CapsuleGeometry(0.4, 0.7, 6, 14).rotateZ(-Math.PI / 2).translate(0.35, 0, 0), skin, { ink: skinInk, inkW: 1.1 })); t2.rotation.z = -0.5;
    // the sleeve: wide teal and cream stripes, a soft cuff, reaching up and back out of the picture
    const stripes = K3D.paint('pcPyjama', 256, 512, (c, w, h) => {
      for (let y = 0; y < h; y += 64) { c.fillStyle = '#2f8a8a'; c.fillRect(0, y, w, 32); c.fillStyle = '#f3ead2'; c.fillRect(0, y + 32, w, 32); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(0, y + 4, w, 4); }
      const r = P.rng(531); for (let i = 0; i < 400; i++) { c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'; c.fillRect(r() * w, r() * h, 2, 1); }
      // a few little stars on the cream stripes
      c.fillStyle = '#e8b84a'; for (let y = 48; y < h; y += 64) for (let x = 20; x < w; x += 60) { c.beginPath(); for (let j = 0; j < 10; j++) { const a2 = j * Math.PI / 5, rr2 = j % 2 ? 3 : 7; c.lineTo(x + Math.cos(a2) * rr2, y + Math.sin(a2) * rr2); } c.fill(); }
    }, { repeat: true });
    stripes.repeat.set(2, 3);
    const sleeve = K3D.mesh(new T.CylinderGeometry(1.75, 2.1, 14, 32, 1, true).translate(0, -7, 0), K3D.toon('#ffffff', { map: stripes, side: T.DoubleSide }), { ink: '#1f4a4a', inkW: 1.2 });
    const arm = new T.Group(); arm.position.set(-2.1, 0.1, 0); g.add(arm);
    arm.add(sleeve); arm.rotation.z = -(Math.PI * 0.5 + 0.5); // reaching back (-x) and up
    const cuff = K3D.mesh(new T.TorusGeometry(1.72, 0.3, 12, 40).rotateX(Math.PI / 2), K3D.toon('#2f8a8a'), { ink: '#1f4a4a', inkW: 1.1 }); arm.add(cuff);
    g.userData = { wrist, fingers, th, arm };
    return g;
  }
  // pose the hand on the curl: fingertips over the top, gripping a little tighter when it pulls, re-gripping at the gutter
  function poseHand(h, x, flex, lift) {
    // the knuckles sit over the back of the curl; the fingers follow its round top and hook over the front
    const u = h.userData;
    h.position.set(x - 2.2 * 0 - 0.0, 0, 0);
    u.wrist.position.set(-0.8, R + 1.75 + lift, -0.9);
    u.wrist.rotation.z = -0.35 + lift * 0.15;
    u.fingers.forEach((js, k) => { js[0].rotation.z = 0.46 + flex * 0.1 - lift * 0.3 + (k === 3 ? -0.08 : 0); js[1].rotation.z = -0.58 - flex * 0.25; js[2].rotation.z = -0.46 - flex * 0.2; });
    u.arm.position.set(-0.8 - 2.1, R + 1.75 + lift + 0.75, -0.9);
  }

  /* ---------- the flat paper cut-out of a hero (a Flat) ---------- */
  function flatTex(id) {
    return K3D.paint('pcFlat' + id, 128, 160, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      const col = PCOL[id], dark = PDARK[id];
      c.fillStyle = '#fbf7ec'; rrPath(c, 8, 22, w - 16, h - 30, 26); c.fill();
      c.fillStyle = col; rrPath(c, 16, 30, w - 32, h - 46, 20); c.fill(); c.strokeStyle = dark; c.lineWidth = 4; c.stroke();
      if (id === 0) { c.fillStyle = '#c8302e'; c.beginPath(); c.moveTo(16, 70); c.quadraticCurveTo(w / 2, 4, w - 16, 70); c.lineTo(w - 22, 40); c.quadraticCurveTo(w / 2, 10, 22, 40); c.fill(); c.strokeStyle = '#3f8f5c'; c.lineWidth = 4; c.beginPath(); c.moveTo(w / 2, 22); c.lineTo(w / 2, 6); c.stroke(); }
      else { c.fillStyle = col; c.beginPath(); c.arc(28, 32, 12, 0, 7); c.arc(w - 28, 32, 12, 0, 7); c.fill(); c.fillStyle = '#3f7a3a'; c.beginPath(); c.ellipse(w / 2, 30, 30, 12, 0, Math.PI, 0); c.fill(); c.fillStyle = '#f2c14e'; c.fillRect(w / 2 + 14, 8, 6, 22); }
      for (const sx of [-1, 1]) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(w / 2 + sx * 16, 82, 9, 11, 0, 0, 7); c.fill(); c.fillStyle = '#1c1a36'; c.beginPath(); c.arc(w / 2 + sx * 16, 86, 5, 0, 7); c.fill(); }
      c.strokeStyle = '#1c1a36'; c.lineWidth = 3; c.beginPath(); c.arc(w / 2, 108, 8, 0.2, Math.PI - 0.2); c.stroke();
    });
  }
  function rrPath(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  /* ---------- the scenery along the corridor (the wood) ---------- */
  function woodScenery(K, st, L3, sc) {
    const fam = {
      pine: family(K, 'pine', WOOD.pineShape, WOOD.pine(), { ink: '#10241e' }),
      birch: family(K, 'birch', WOOD.birchShape, WOOD.birch(), { ink: '#26302a' }),
      spruce: family(K, 'spruce', WOOD.spruceShape, WOOD.spruce(), { ink: '#0a1416' }),
      fern: family(K, 'fern', WOOD.fernShape, WOOD.fern(), { ink: '#163a26', inkW: 0.7 }),
      stool: family(K, 'stool', WOOD.stoolShape, WOOD.stool(), { inkW: 0.7 }),
      bush: family(K, 'bush', WOOD.bushShape, WOOD.bush(), { ink: '#10241e', inkW: 0.8 }),
      reed: family(K, 'reed', WOOD.reedShape, WOOD.reed(), { ink: '#1a3020', inkW: 0.7 }),
    };
    const r = P.rng(600 + L3.k), pw = L3.pw, pd = L3.pd, H = PC.HALF;
    const ch = x => clamp(PC.chunkOf(st, x), 0, st.chunkT.length - 1);
    // a V-fold: two crossing cards (one family, two instances)
    const vfold = (f, x, z, s, extra) => { const rot = r() * Math.PI, d = 0.05 + r() * 0.2 + (extra && extra.d || 0); f.add(x, z, rot, s, ch(x), d); f.add(x, z, rot + Math.PI / 2, s, ch(x), d + 0.06); };
    const routeD = (x, z) => { let d = 1e9; for (const g of L3.segs) { const t = clamp((x - g.ax) * g.dx + (z - g.az) * g.dz, 0, g.len); d = Math.min(d, Math.hypot(x - g.ax - g.dx * t, z - g.az - g.dz * t)); } return d; };
    const inGap = x => L3.def.gaps.some(([a, b]) => x > a - 0.6 && x < b + 0.6);
    const near = (x, z) => { for (const p of L3.pieces) for (const t of p.tabs) if (Math.hypot(x - t.x, z - t.z) < 1.6) return true; return false; };
    // the camera looks from the near edge (+z), turned a little to look along the route: anything nearer the camera
    // than the corridor (larger z) stays low, so the path is always in view
    const nearSide = (x, z) => { const s = PC.progress(L3, x, z), p = PC.pointAt(L3, s); return z > p.z + 0.5 && Math.abs(p.dx) > 0.5; };
    for (let n = 0, tries = 0; n < 520 && tries < 9000; tries++) {
      const x = (r() * 2 - 1) * (pw - 0.8), z = (r() - 0.5) * (pd - 1.2), d = routeD(x, z);
      if (d < H + 0.45 || inGap(x) || Math.abs(x) < 0.9 || near(x, z)) continue;
      if (L3.dogEar && x > pw - 7.5 && z > pd / 2 - 7.5) continue;
      const front = nearSide(x, z) || z > pd / 2 - 3;
      if (front) {
        // low: ferns, toadstools, little bushes (and nothing tall between the camera and the path)
        const k = r();
        if (k < 0.45) vfold(fam.fern, x, z, 0.9 + r() * 0.5);
        else if (k < 0.7) vfold(fam.stool, x, z, 0.8 + r() * 0.6);
        else vfold(fam.bush, x, z, 0.7 + r() * 0.3);
      } else {
        const k = r(), far = d > 5;
        if (d < H + 1.3) { if (k < 0.5) vfold(fam.fern, x, z, 1 + r() * 0.4); else vfold(fam.stool, x, z, 0.9 + r() * 0.5); }
        else if (k < 0.42) vfold(fam.pine, x, z, (far ? 1.1 : 0.9) + r() * 0.35);
        else if (k < 0.7) vfold(fam.birch, x, z, 0.95 + r() * 0.3);
        else if (k < 0.88 || !far) vfold(fam.spruce, x, z, 0.9 + r() * 0.3);
        else vfold(fam.bush, x, z, 0.9);
      }
      n++;
    }
    // reeds and bulrushes along the stream banks (outside the corridor)
    for (const [a, b] of L3.def.gaps) for (const bx of [a - 0.35, b + 0.35]) {
      const zc = PC.pointAt(L3, PC.progress(L3, (a + b) / 2, 0)).z;
      for (let z = -pd / 2 + 1; z < pd / 2 - 0.6; z += 0.7 + r() * 0.5) if (Math.abs(z - zc) > H + 0.4) vfold(fam.reed, bx + (r() - 0.5) * 0.3, z, 0.8 + r() * 0.5);
    }
    // the avenue on the dash: trees in neat rows both sides (the camera swings behind the pair here)
    // (each row follows the dash's own line, found from where the dash starts, never a later bend of the route;
    // and no tree is ever planted on the path, e.g. where the dash turns at its end)
    if (L3.swing) {
      const zDash = PC.pointAt(L3, PC.progress(L3, L3.swing[0], 0)).z;
      for (let x = L3.swing[0]; x < L3.swing[1]; x += 2.4) {
        const p = PC.pointAt(L3, PC.progress(L3, x, zDash));
        for (const [f, tx, tz, sz, d] of [[fam.birch, x, p.z - H - 1.0, 1.1, 0.05], [fam.pine, x + 1.2, p.z + H + 1.0, 0.75, 0.12]])
          if (routeD(tx, tz) > H + 0.6) vfold(f, tx, tz, sz, { d });
      }
    }
    for (const f of Object.values(fam)) f.done();
    sc.fams.push(...Object.values(fam));
    // lantern-eyed owls on stumps beside the path, the backdrop of night sky with the moon cut out
    const owlTex = K3D.paint('pcOwl', 256, 320, (c, w, h) => {
      const r2 = P.rng(541); c.clearRect(0, 0, w, h);
      c.fillStyle = '#7a5a3a'; c.beginPath(); c.ellipse(w / 2, h * 0.58, w * 0.4, h * 0.4, 0, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 30; i++) P.wash(c, w * 0.2 + r2() * w * 0.6, h * 0.3 + r2() * h * 0.6, 18, r2() < 0.5 ? '#5a4028' : '#a07a50', 0.4, r2, { noEdge: true });
      c.fillStyle = '#efe0c0'; c.beginPath(); c.ellipse(w / 2, h * 0.68, w * 0.24, h * 0.24, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(90,60,30,0.6)'; c.lineWidth = 2; for (let y = h * 0.52; y < h * 0.88; y += 12) for (let x = w * 0.32; x < w * 0.7; x += 14) { c.beginPath(); c.arc(x, y, 5, 0.2, Math.PI - 0.2); c.stroke(); }
      c.fillStyle = '#7a5a3a'; c.beginPath(); c.moveTo(w * 0.18, h * 0.25); c.lineTo(w * 0.3, h * 0.05); c.lineTo(w * 0.4, h * 0.22); c.lineTo(w * 0.6, h * 0.22); c.lineTo(w * 0.7, h * 0.05); c.lineTo(w * 0.82, h * 0.25); c.closePath(); c.fill();
      for (const sx of [-1, 1]) { c.fillStyle = '#fbf0c8'; c.beginPath(); c.arc(w / 2 + sx * 42, h * 0.33, 34, 0, 7); c.fill(); c.strokeStyle = '#2b2130'; c.lineWidth = 3; c.stroke(); }
      c.fillStyle = '#e8a83a'; c.beginPath(); c.moveTo(w / 2 - 10, h * 0.4); c.lineTo(w / 2 + 10, h * 0.4); c.lineTo(w / 2, h * 0.5); c.fill();
    });
    const eyeM = K3D.flat('#ffe27a');
    for (let i = 0; i < 6; i++) {
      const s = L3.len * (0.08 + i * 0.15) + r() * 2, p = PC.pointAt(L3, s), side = r() < 0.5 ? -1 : 1;
      const x = p.x - p.dz * side * (H + 1.4), z = p.z + p.dx * side * (H + 1.4);
      // not near a wolf's slot (it would read as standing in its way) and well clear of every part of the path
      if (z > p.z + 0.5 || inGap(x) || L3.sliders.some(q => Math.abs(q.x - x) < 2.6)) continue;
      { const q = PC.pointAt(L3, PC.progress(L3, x, z)); if (Math.hypot(q.x - x, q.z - z) < H + 1.0) continue; }
      const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = (r() - 0.5) * 0.6;
      const stump = K3D.mesh(new T.CylinderGeometry(0.38, 0.45, 1.3, 7).translate(0, 0.65, 0), K3D.mat('pcStumpM', () => K3D.toon('#6a4a30')), { ink: INK }); g.add(stump);
      const owl = P.card(P.shapeFrom([[-0.45, 0], [0.45, 0], [0.5, 0.5], [0.4, 0.9], [0.35, 1.1], [0.15, 0.95], [-0.15, 0.95], [-0.35, 1.1], [-0.4, 0.9], [-0.5, 0.5]]), { tex: owlTex, depth: 0.04 });
      owl.position.y = 1.3; owl.position.z = 0.05; g.add(owl);
      for (const sx of [-1, 1]) { const eye = new T.Mesh(K3D.geo('pcOwlEye', () => new T.CircleGeometry(0.1, 16)), eyeM); eye.position.set(sx * 0.16, 1.3 + 0.67, 0.08); g.add(eye); const halo = new T.Mesh(K3D.geo('pcOwlHalo', () => new T.CircleGeometry(0.24, 20)), K3D.flat('#ffd76a', { transparent: true, opacity: 0.35, depthWrite: false, add: true })); halo.position.set(sx * 0.16, 1.97, 0.07); g.add(halo); }
      sc.pops.push({ obj: g, x, ch: ch(x), delay: 0.15 });
      K.add(g);
    }
    // the night-sky backdrop panels standing along the far edge
    const panels = Math.round(pw * 2 / 8.8);
    for (let i = 0; i < panels; i++) {
      const x0 = -pw + i * (pw * 2 / panels), w = pw * 2 / panels - 0.05, xm = x0 + w / 2;
      const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, 4.4 + (i % 2) * 0.5); s.quadraticCurveTo(0, 6 + (i % 3) * 0.4, -w / 2, 4.4 + ((i + 1) % 2) * 0.5); s.closePath();
      if (i === Math.floor(panels * 0.62)) { const hole = new T.Path(); hole.absarc(0.6, 3.6, 1.15, 0, Math.PI * 2, true); s.holes.push(hole); }
      const card = P.card(s, { tex: skyTex(i % 4), depth: 0.05, inkW: 1 });
      const g = new T.Group(); g.position.set(xm, 0, -pd / 2 + 0.35); g.add(card);
      if (i === Math.floor(panels * 0.62)) {
        // the moon behind its cut-out: yellow tissue, glowing
        const moon = new T.Mesh(new T.CircleGeometry(1.2, 40), K3D.flat('#ffe9a0')); moon.position.set(0.6, 3.6, -0.08); g.add(moon);
        const glow = new T.Mesh(new T.CircleGeometry(2.4, 40), K3D.flat('#ffe9a0', { transparent: true, opacity: 0.25, depthWrite: false, add: true })); glow.position.set(0.6, 3.6, 0.06); g.add(glow);
      }
      sc.pops.push({ obj: g, x: xm, ch: ch(xm), delay: 0.1, back: true });
      K.add(g);
    }
  }

  /* ---------- build ---------- */
  art.scene = function (K, st) {
    if (!st || !st.L3) return;
    const L3 = st.L3, pw = L3.pw, pd = L3.pd;
    K.maxBlur = 7; K.focusRange = 6;
    K.sunDir.set(-0.75, 1, 0.45).normalize(); // the lamp is behind and above the Roll's side: its shadow falls ahead
    const sc = art.sc = { K, L3, fams: [], pops: [], live: [] };
    const still = new T.Group(); K.add(still);
    const book = POPUP.book({ pw, pd, tex: [pageTex(L3, true), pageTex(L3, false)] }); still.add(book);
    // the page is rolled up behind the Roll and cut at the gaps; the page block is cut at the gaps
    book.traverse(o => { if (!o.isMesh || o.userData.ink) return; [].concat(o.material).forEach(m => { if (m.isMeshToonMaterial) cut(m, book.userData.pages.includes(o)); }); });
    for (const pg of book.userData.pages) { pg.userData.live = true; }
    CUT.uPd.value = pd / 2;
    L3.def.gaps.forEach((gp, i) => CUT.uGaps.value[i].set(gp[0], gp[1]));
    for (let i = L3.def.gaps.length; i < 4; i++) CUT.uGaps.value[i].set(1e9, 1e9);
    const room = POPUP.room({ cup: [-pw - 18, 8], lamp: [-pw - 14, -pd / 2 - 16], window: [-20, 0], books: [pw + 14, -pd / 2 - 4], ink: [pw + 10, pd / 2 + 6] }); still.add(room); K.tick(() => room.userData.tick(G.clock));
    still.add(POPUP.desk({ at: { pencils: [pw - 6, pd / 2 + 9, -0.3, 2], eraser: [-pw + 4, pd / 2 + 8, 0.4, 1.6], ruler: [-6, pd / 2 + 8.5, 0.04], scissors: [pw + 16, 2, 2.3, 1.8], clips: [pw + 10, 12, 0, 2],
      ball1: [-pw - 8, -10], ball2: [pw + 18, -14], glasses: [-pw - 10, 16, 0.5, 2.2], pot: [-pw - 6, -pd / 2 - 6, 0, 1.5], fern: [pw + 20, -pd / 2 - 10, 0, 1.3] } }));
    // gaps: the cut walls and the water
    for (const [a, b] of L3.def.gaps) { const t = trench(K, L3, a, b, L3.def.decor); still.add(t); sc.live.push(t); }
    // the scenery
    if (L3.def.decor === 'wood') woodScenery(K, st, L3, sc);
    // logs
    for (const lg of L3.logs) { const m = log(lg.x, lg.z, PC.HALF * 2); K.add(m); sc.pops.push({ obj: m, x: lg.x, ch: PC.chunkOf(st, lg.x), delay: 0, fall: 1 }); }
    // the machinery
    sc.tabs = []; sc.bridges = [];
    for (const pc of L3.pieces) {
      for (const t of pc.tabs) { const m = tab(t.x, t.z, 0); K.add(m); sc.tabs.push({ m, t, pc }); }
      if (pc.kind === 'bridge') { const b = bridge(pc); K.add(b); sc.bridges.push({ b, pc }); }
    }
    sc.sliders = L3.sliders.map(sl => { const m = slider(sl); K.add(m); return { m, sl }; });
    sc.marks = L3.marks.map((m, i) => { const b = POPUP.bookmark(m.x, m.z - 1.5, 0, ['#b8324a', '#2f6a9a', '#d8a030'][i % 3]); K.add(b); return b; });
    sc.dog = L3.dogEar ? dogEarMesh(L3) : null; if (sc.dog) K.add(sc.dog);
    K3D.bake(still);
    // the Roll
    sc.roll = roll(K, L3);
    // the heroes
    sc.heroes = [0, 1].map(id => { const h = K3D.hero(id); K.add(h); K3D.seeThrough(h, PCOL[id]); K3D.dress(h, 'popchase'); return h; });
    sc.blobs = [0, 1].map(id => K.add(K3D.blob(PCOL[id])));
    sc.flats = [0, 1].map(id => {
      const m = new T.Mesh(K3D.geo('pcFlatGeo', () => new T.PlaneGeometry(0.85, 1.06).translate(0, 0.53, 0)), K3D.toon('#ffffff', { map: flatTex(id), transparent: true, alphaTest: 0.4, side: T.DoubleSide }));
      m.visible = false; K.add(m); return m;
    });
    sc.camPos = null;
  };

  /* ---------- per frame ---------- */
  const cam = { pos: new T.Vector3(), at: new T.Vector3(), want: new T.Vector3(), wantAt: new T.Vector3() };
  art.draw = function (K, st, dt) {
    const sc = art.sc;
    if (!sc || !st.L3 || sc.L3 !== st.L3) return;
    const L3 = st.L3, t = st.T;
    CUT.uRoll.value = st.rollX - 0.02;
    for (const f of sc.fams) famDraw(f, st);
    for (const p of sc.pops) {
      const u = upOf(st, clamp(p.ch, 0, st.chunkT.length - 1), p.delay, 1);
      if (u < 0) { p.obj.visible = false; continue; }
      p.obj.visible = true;
      p.obj.rotation.x = -(1 - u) * Math.PI / 2 * (p.back ? -1 : 1);
      p.obj.scale.z = Math.max(0.02, Math.min(1, u * 1.4));
    }
    for (const l of sc.live) if (l.userData.tick) l.userData.tick(G.clock);
    // tabs: the tongue lifts when pulled, a glow ring when somebody can work it
    for (const tb of sc.tabs) {
      const held = G.players.some(p => p.pc && p.pc.hold && p.pc.hold.t === tb.t);
      const near = G.players.some(p => p.pc && p.pc.mode === 'run' && p.b3 && Math.hypot(p.b3.x - tb.t.x, p.b3.z - tb.t.z) < PC.TAB_R);
      const u = tb.m.userData;
      u.tongue.rotation.z = approach(u.tongue.rotation.z, held ? 1.1 : 0.5, dt * 6);
      u.tongue.position.x = approach(u.tongue.position.x, held ? 0.6 : 0.8, dt * 3);
      u.glow.material.opacity = near && !held ? 0.45 + Math.sin(G.clock * 6) * 0.2 : held ? 0.7 : 0;
      tb.m.visible = tb.t.x > st.rollX;
    }
    for (const b of sc.bridges) { b.b.userData.set(b.pc.e); b.b.visible = b.pc.x0 > st.rollX - 1; }
    for (const s of sc.sliders) {
      const sl = s.sl, a = PC.sliderAt(sl, t), z = sl.z0 + (sl.z1 - sl.z0) * a.pos;
      s.m.userData.fig.position.z = z;
      // the cut-out turns to the camera (so it never shows its edge), angled a little the way it runs
      const cp = K.camera.position, yaw = Math.atan2(cp.x - sl.x, cp.z - z);
      s.m.userData.fig.rotation.y = yaw + (a.dir > 0 ? -0.35 : 0.35);
      s.m.userData.fig.position.y = a.moving ? Math.abs(Math.sin(G.clock * 18)) * 0.08 : 0;
      s.m.userData.glow.material.opacity = a.tell * 0.6 + (a.moving ? 0.25 : 0);
      s.m.visible = st.chunkT[clamp(PC.chunkOf(st, sl.x), 0, st.chunkT.length - 1)] >= 0 && sl.x > st.rollX;
    }
    sc.marks.forEach((b, i) => { b.userData.lit(L3.marks[i].on ? 0.6 + Math.sin(G.clock * 3) * 0.3 : 0); b.visible = L3.marks[i].x > st.rollX; });
    if (sc.dog) { const k = 0.5 + Math.sin(G.clock * 4) * 0.35; sc.dog.userData.rim.material.opacity = k; sc.dog.userData.halo.material.opacity = 0.18 + k * 0.2 + (st.dogOn && (st.dogOn[0] || st.dogOn[1]) ? 0.25 : 0); }
    // the Roll
    const ro = sc.roll;
    ro.g.position.x = st.rollX - R;
    ro.spin.rotation.z = -(st.rollX + L3.pw) / R;
    ro.shadow.position.x = R;
    const grip = st.gutterT > 0 ? Math.sin((1 - st.gutterT / PC.S.gutterStop) * Math.PI) : 0;
    poseHand(ro.hand, 0, 0.4 + Math.sin(G.clock * 1.3) * 0.08 - grip * 0.5, grip * 1.4 + Math.sin(G.clock * 0.9) * 0.05);
    ro.hand.position.x += 0;
    // the heroes
    G.players.forEach((p, k) => {
      const h = sc.heroes[k], b = p.b3, pc = p.pc, fm = sc.flats[k];
      if (!b || !pc) return;
      if (pc.mode === 'run') {
        h.visible = true; fm.visible = false;
        const hold = pc.hold && pc.hold.t;
        K3D.heroPose(h, { x: b.x, y: b.y, z: b.z, heading: hold ? Math.atan2(hold.x + 0.8 - b.x, hold.z - b.z) : b.heading, speed: Math.hypot(b.vx, b.vz) / PC.RUN, vy: b.vy, land: b.land,
          hands: hold ? [new T.Vector3(hold.x + 0.95, 0.12, hold.z - 0.12), new T.Vector3(hold.x + 0.95, 0.12, hold.z + 0.12)] : null,
          mood: pc.sitT > 0 ? 'sit' : b.teeter > 0 ? 'whoa' : null, stun: pc.sitT > 0 }, dt);
        for (const o of h.userData.worn || []) if (o.userData.flutter) o.userData.flutter(Math.hypot(b.vx, b.vz) / PC.RUN, G.clock);
        K3D.placeBlob(sc.blobs[k], b.x, Math.max(0, MOVER3.floorAt(L3.world, b.x, b.z, b.y + 0.1)), b.z, Math.max(0, b.y));
        sc.blobs[k].visible = b.y > -0.6;
        const sp = K3D.toScreen(b.x, b.y + MOVER3.h + 0.15, b.z); p.x = sp.x - p.w / 2; p.y = sp.y - p.h;
      } else {
        h.visible = false; sc.blobs[k].visible = false;
        const f = PC.flatPose(st, p);
        fm.visible = true;
        if (f.flat && pc.mode === 'flat') {
          // pressed onto the curl's face
          fm.position.set(st.rollX + 0.02, 0.6 + Math.min(1, pc.t * 3) * 1.4, f.z); fm.rotation.set(0, Math.PI / 2, 0.2);
        } else {
          fm.position.set(f.x, f.y, f.z); fm.rotation.set(Math.sin(f.k * 9) * 0.9, f.k * 6, Math.cos(f.k * 7) * 0.5);
        }
        const sp = K3D.toScreen(fm.position.x, fm.position.y + 1.2, fm.position.z); p.x = sp.x - p.w / 2; p.y = sp.y - p.h;
      }
    });
    camera(K, st, dt);
  };

  /* ---------- the camera: a rail along the pair ---------- */
  function camera(K, st, dt) {
    const L3 = st.L3, ps = G.players;
    const pts = ps.map(p => (p.pc && p.pc.mode === 'run' ? p.b3 : (() => { const f = PC.flatPose(st, p); return { x: f.x, y: Math.min(f.y, 1), z: f.z }; })()));
    const rear = pts[0].x < pts[1].x ? 0 : 1;
    // aim between them, biased to the rear one, looking a little ahead along the route
    const cx = pts[rear].x * 0.6 + pts[1 - rear].x * 0.4, cz = pts[rear].z * 0.6 + pts[1 - rear].z * 0.4;
    const hd = st.camH, sw = clamp((hd - PC.H34) / (PC.HCHASE - PC.H34), 0, 1);
    const pitch = (40 - sw * 16) * Math.PI / 180;
    // how far back: enough for both (and the Roll's edge when it is near the rear player)
    const c = Math.cos(hd), s = Math.sin(hd);
    let ext = 0;
    const span = (x, z) => { const dx = x - cx, dz = z - cz; return { a: Math.abs(dx * c - dz * s), b: Math.abs(dx * s + dz * c) }; };
    for (const q of pts) { const e = span(q.x, q.z); ext = Math.max(ext, e.a, e.b * 1.6); }
    const rollNear = pts[rear].x - st.rollX < 16;
    if (rollNear && sw < 0.5) { const e = span(st.rollX - 1, cz); ext = Math.max(ext, e.a * 0.92); }
    const fov = K.camera.fov, asp = K.camera.aspect || 16 / 9, tf = Math.tan(fov * Math.PI / 360);
    const dist = clamp((ext / (tf * asp)) * 1.25 + 9 - sw * 2, 13, 26 - sw * 8);
    const aheadX = -s * (2.4 + sw * 2), aheadZ = -c * (2.4 + sw * 2);
    const at = cam.wantAt.set(cx + aheadX * (1 - sw) + (sw ? -s * 3 * sw : 0), 0.4, cz + aheadZ * (1 - sw) * 0.4);
    const back = v3.set(s, 0, c).multiplyScalar(Math.cos(pitch) * dist);
    const pos = cam.want.copy(at).add(back); pos.y = Math.sin(pitch) * dist + (rollNear ? 0 : 0);
    // the near edge of the page: never go below the desk or inside scenery (the camera stays high over the book)
    pos.y = Math.max(pos.y, 3.5);
    const k = st.T < 0.05 || !art._snapped ? 1 : 1 - Math.exp(-3.2 * dt);
    if (!art._snapped) { cam.pos.copy(pos); cam.at.copy(at); art._snapped = true; }
    cam.pos.lerp(pos, k); cam.at.lerp(at, k);
    // review shots (tools/w41/chase-shot.js --preset) aim from a fixed spot
    const pr = art.preset && art.preset(cx, cz, st);
    if (pr) { cam.pos.copy(pr[0]); cam.at.copy(pr[1]); }
    K.camera.position.copy(cam.pos); K.camera.lookAt(cam.at);
    K.focus.copy(cam.at);
    K.sunAt(cam.at, 22);
  }
  art.preset = null; // (cx, cz, st) -> [pos, at] or null
  const PRESETS = {
    top: (x, z) => [[x, 40, z + 0.01], [x, 0, z]], wide: (x, z) => [[x - 6, 26, z + 30], [x + 6, 0, z - 4]], front: (x, z) => [[x, 5, z + 15], [x, 0.6, z]],
    pip: (x, z) => { const b = G.players[0].b3; return [[b.x + 1.2, 1.3, b.z + 3.2], [b.x, 0.55, b.z]]; }, bo: (x, z) => { const b = G.players[1].b3; return [[b.x - 0.6, 1.3, b.z + 3.3], [b.x, 0.55, b.z]]; },
    pipSide: (x, z) => { const b = G.players[0].b3; return [[b.x + 3.2, 1.3, b.z + 0.3], [b.x, 0.55, b.z]]; }, boBack: (x, z) => { const b = G.players[1].b3; return [[b.x - 2.6, 1.6, b.z - 2.2], [b.x, 0.55, b.z]]; },
    pair: (x, z) => [[x, 1.6, z + 7.5], [x, 0.5, z]], hand: (x, z, st) => [[st.rollX + 9, 6, 9], [st.rollX - 1, 2.6, 0]], book: () => [[0, 70, 62], [0, 0, -2]],
  };
  art.usePreset = name => { const f = PRESETS[name]; art.preset = f ? (x, z, st) => f(x, z, st).map(a => new T.Vector3(...a)) : null; };
  art.snap = () => { art._snapped = false; };
  // a new scene always starts its camera on the shot
  const scene0 = art.scene;
  art.scene = function (K, st) { art._snapped = false; scene0(K, st); };

  /* ---------- flat bits over the picture ---------- */
  art.drawTop = function (st) {
    const sc = art.sc;
    if (!sc || !st.L3 || G.introT > 0) return;
    // button prompts: a free player standing at a tab
    for (const p of G.players) {
      if (!p.pc || p.pc.mode !== 'run' || p.pc.hold) continue;
      const tn = PC.tabNear(st, p);
      if (!tn) continue;
      if (cpuOn(p.id) && cpuSolo()) continue;
      const sp = K3D.toScreen(tn.t.x, 0.4, tn.t.z);
      if (sp.z < 1) drawBtn(p.id, 'act', sp.x, sp.y + 26, { label: 'pull', size: 20 });
    }
    // the dog-ear: one alone waits for the other
    if (st.dogOn && (st.dogOn[0] !== st.dogOn[1]) && st.L3.dogEar) {
      const d = st.L3.dogEar, sp = K3D.toScreen(d.x, 1.6, d.z);
      if (sp.z < 1) { ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif'; const w = ctx.measureText('Both on the corner to turn the page').width + 24; ctx.fillStyle = 'rgba(23,25,29,0.8)'; rr(sp.x - w / 2, sp.y - 14, w, 26, 13); ctx.fill(); text('Both on the corner to turn the page', sp.x, sp.y, 14, C.gold, 'center', 'body'); }
    }
    // "Flat!" and other pops
    for (const f of st.fx || []) {
      const sp = K3D.toScreen(f.x, f.y + f.t * 0.8, f.z);
      if (sp.z > 1) continue;
      ctx.save(); ctx.globalAlpha = clamp(1.2 - f.t, 0, 1);
      if (f.kind === 'flat') text('Flat!', sp.x, sp.y, 26, '#fff4d8', 'center');
      else if (f.kind === 'bump') text('Bump!', sp.x, sp.y, 18, '#ffd0b0', 'center');
      ctx.restore();
    }
    // the page turn (a stand-in until 41-1's POPUP.pageTurn lands: a sweep of paper across the screen)
    if (st.turn) {
      const k = clamp(st.turn.t / st.turn.dur, 0, 1);
      if (reduceMotion) { ctx.fillStyle = 'rgba(246,239,223,' + Math.sin(k * Math.PI) + ')'; ctx.fillRect(0, 0, W, H); }
      else {
        const x = W * (1 - smooth(k) * 2) + W * 0.0;
        ctx.save(); ctx.fillStyle = '#f3ead2'; ctx.beginPath(); ctx.moveTo(x + W, 0); ctx.lineTo(x + W * 1.15, 0); ctx.lineTo(x + W * 0.95, H); ctx.lineTo(x + W * 0.8, H); ctx.closePath();
        ctx.moveTo(x + W, 0); ctx.lineTo(W * 2, 0); ctx.lineTo(W * 2, H); ctx.lineTo(x + W * 0.95, H); ctx.fill(); ctx.restore();
      }
    }
  };
  // the Roll's arrow at the left edge when its edge is off screen
  art.hud = function (st) {
    if (!st.L3 || G.introT > 0) return;
    const ps = G.players.filter(p => p.b3), cz = ps.reduce((a, p) => a + p.b3.z, 0) / Math.max(1, ps.length);
    const sp = K3D.toScreen(st.rollX, 1.5, cz);
    if (sp.z < 1 && sp.x > 8 && sp.x < W - 8 && sp.y > 0 && sp.y < H) return;
    const rear = Math.min(...ps.map(p => p.b3.x)), d = Math.max(0, rear - st.rollX);
    const y = H / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(23,25,29,0.82)'; rr(8, y - 30, 64, 60, 14); ctx.fill();
    ctx.fillStyle = d < 6 ? '#ff8a6a' : '#f3ead2'; ctx.beginPath(); ctx.moveTo(18, y - 6); ctx.lineTo(32, y - 18); ctx.lineTo(32, y + 6); ctx.closePath(); ctx.fill();
    text(Math.round(d) + '', 50, y - 6, 18, ctx.fillStyle, 'center');
    text('steps', 40, y + 16, 11, '#f3ead2', 'center', 'body');
    ctx.restore();
  };
})();
