/* Pip & Bo - World 41 Pop-Up Storybook, 41-1 Carry It Together: the 3D scenery of the four pages (K3D.popscene).
   Loaded on demand with the 3D kit (K3D.files), after popup-kit.js. Drawing only: it reads the level's state
   (G.mst, MODES.popcarry) and never changes it, so the level plays the same with drawing off (K3D.noRender).

   K3D.popscene.build(K, st)     the page st.k: the open book with that spread painted, its pop-ups (batched with
                                 K3D.bake), the moving parts, the pencil, Pip and Bo, the dotted lines, the bookmarks
                                 and the camera rig. MODES.popcarry.scene3d calls it once per page.
   K3D.popscene.update(K, st, dt)  every drawn frame: heroes and pencil from the rules' state, doors, the train, the
                                 seesaw, popping planks and stairs, the ink, the camera, the page turn, the finish
   K3D.popscene.dressPage(K, k)  just the scenery of page k (the look-proof page uses page 1)
   Shared with the other World 41 levels (popup-kit.js style, on POPUP):
     POPUP.pageTurn(K, { dir, dur, onHalf, pw, pd })   a page leaf turning over the gutter (dir 1: right to left).
         Runs itself over dur seconds (K.tick) and calls onHalf once halfway; .set(f) drives it by hand instead
         ({ manual: true }); .done when finished (it removes itself).
     POPUP.bookworm({ len, col, hat })   the Bookworm: a green paper worm in round glasses (hat: 'mortar' | 'none');
         .userData.tick(t) wiggles him, .userData.cheer(k) bounces him (0..1)
   Pages (plans in popup-pages.js): 1 The Hedge Garden (the look proof's garden), 2 The Folded Bridges (card cliffs over
   a tissue river, accordion bridges, a watermill, paper boats, the seesaw), 3 Clockwork Town (shop fronts, pull-tab
   doors, the paper train and its crossing, the clock tower and its spiral ramp), 4 The Last Page (a blank page, card
   rises, the torn hole, stairs, bridge and ramp drawn by lines, the spilt ink, the Bookworm's desk and pencil pot).
*/
'use strict';

(function () {
  const T = K3D.T, P = POPUP, PC = POPCARRY, PW = PC.PW, PD = PC.PD, U = PC.U, INK = P.INK, EDGE = P.EDGE;
  const dk = (c, t) => mixHex(c, '#141428', t), lt = (c, t) => mixHex(c, '#ffffff', t);
  const rgba = P.rgba;
  const V = (x, y, z) => new T.Vector3(x, y, z);

  /* ---------- small building helpers ---------- */
  // a box whose faces' texture coordinates run in world units / s (so a repeating texture never stretches)
  function boxGeo(w, h, d, s = 1, sTop = s) {
    const g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv;
    const dims = [[d, h, s], [d, h, s], [w, d, sTop], [w, d, sTop], [w, h, s], [w, h, s]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / dims[f][2], uv.getY(i) * dims[f][1] / dims[f][2]); }
    return g;
  }
  const mat = (key, col, o) => K3D.mat(key, () => K3D.toon(col || '#ffffff', o || {}));
  const tmat = (key, tex, o) => K3D.mat(key + '|' + tex.uuid, () => K3D.toon('#ffffff', Object.assign({ map: tex }, o || {})));
  // a solid from a page plan drawn as a box (x, z centre, w along its rot, d across, y0..y1)
  function solidBox(s, mats, o = {}) {
    const h = s.y1 - s.y0, m = K3D.mesh(boxGeo(s.w, h, s.d, o.s || 1, o.sTop || o.s || 1), mats, { ink: o.ink === undefined ? INK : o.ink, inkW: o.inkW || 0.9 });
    m.position.set(s.x, s.y0 + h / 2, s.z); m.rotation.y = s.rot || 0;
    return m;
  }
  // a sloped card (a ramp solid's top): thickness th under the slope, the solid's rot
  function rampCard(s, mats, th = 0.22) {
    const h0 = s.y0 + s.ramp.h0, h1 = s.y0 + s.ramp.h1, len = Math.hypot(s.w, h1 - h0);
    const m = K3D.mesh(boxGeo(len, th, s.d, 1), mats, { ink: INK, inkW: 0.8 });
    const g = new T.Group(); g.position.set(s.x, (h0 + h1) / 2 - th / 2, s.z); g.rotation.y = s.rot || 0;
    m.rotation.z = Math.atan2(h1 - h0, s.w); g.add(m);
    return g;
  }
  const rnd = P.rng;
  // a pop-up that springs up when it appears: scale y from 0 with a little overshoot
  const springK = t => t <= 0 ? 0 : t >= 1 ? 1 : 1 + Math.sin(t * Math.PI * 1.5) * (1 - t) * 0.35 - Math.pow(1 - t, 3) * 1.0;

  /* ---------- POPUP.pageTurn: a leaf turning over the gutter ---------- */
  P.pageTurn = function (K, o = {}) {
    const pw = o.pw || PW, pd = o.pd || PD, dir = o.dir || 1, dur = o.dur || 1.2;
    const tex = K3D.paint('turnLeaf', 512, 640, (c, w, h) => {
      P.paper(c, w, h, P.CREAM, 211);
      c.fillStyle = rgba('#3b3040', 0.12);
      for (let y = 60; y < h - 60; y += 14) { const l = 0.6 + ((y * 7) % 13) / 30; c.fillRect(40, y, (w - 80) * l, 5); }
      const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(80,55,30,0.3)'); g.addColorStop(0.15, 'rgba(80,55,30,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    const N = 40, geo = new T.PlaneGeometry(pw, pd, N, 1).rotateX(-Math.PI / 2).translate(pw / 2, 0, 0);
    const base = Float32Array.from(geo.attributes.position.array);
    const leaf = new T.Mesh(geo, K3D.toon('#ffffff', { map: tex, side: T.DoubleSide }));
    leaf.castShadow = true; leaf.renderOrder = 12; leaf.userData.live = true;
    const root = new T.Group(); root.add(leaf); K.add(root);
    if (dir < 0) root.scale.x = -1;
    const h = { f: 0, done: false, half: false,
      set(f) {
        this.f = f = clamp(f, 0, 1);
        // the leaf lifts from the right page and lies down on the left: an angle about the gutter, bent in a soft curl
        const ang = f * Math.PI, pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x0 = base[i * 3], z0 = base[i * 3 + 2], u = x0 / pw;
          const a = ang + Math.sin(f * Math.PI) * 0.55 * u * u;
          const r = x0;
          pos.setXYZ(i, Math.cos(a) * r, Math.sin(a) * r + 0.02 + Math.sin(f * Math.PI) * 0.3 * u, z0);
        }
        pos.needsUpdate = true; geo.computeVertexNormals();
        if (!this.half && f >= 0.5) { this.half = true; if (o.onHalf) o.onHalf(); }
        if (f >= 1 && !o.keep) { this.done = true; root.visible = false; }
      } };
    h.set(0);
    if (!o.manual) { let t = 0; K.tick(dt => { if (h.done) return; t += dt; h.set(t / dur); }); }
    return h;
  };

  /* ---------- POPUP.bookworm ---------- */
  P.bookworm = function (o = {}) {
    const len = o.len || 6, col = o.col || '#7cc46a', g = new T.Group();
    const skin = mat('worm|' + col, col), belly = mat('wormB|' + col, lt(col, 0.45)), segs = [];
    for (let i = 0; i < len; i++) {
      const r = 0.34 - i * 0.025;
      const m = K3D.mesh(K3D.geo('wormSeg' + i, () => new T.SphereGeometry(r, 20, 14)), i % 2 ? belly : skin, { ink: dk(col, 0.55), inkW: 1 });
      m.position.set(-0.36 - i * 0.42, r, 0); g.add(m); segs.push(m);
    }
    const head = new T.Group(); head.position.set(0.1, 0.62, 0); g.add(head);
    const hm = K3D.mesh(K3D.geo('wormHead', () => new T.SphereGeometry(0.5, 24, 18)), skin, { ink: dk(col, 0.55), inkW: 1.1 }); head.add(hm);
    // round spectacles: two brass rings with glass, eyes behind
    const brass = mat('brass', '#d9a640');
    for (const s of [-1, 1]) {
      const ring = K3D.mesh(K3D.geo('wormGlassRing', () => new T.TorusGeometry(0.17, 0.035, 8, 24)), brass, { ink: '#5a3d14', inkW: 0.6 });
      ring.position.set(0.42, 0.08, s * 0.2); ring.rotation.y = Math.PI / 2; head.add(ring);
      const eye = K3D.mesh(K3D.geo('wormEye', () => new T.SphereGeometry(0.12, 14, 10)), mat('wormEyeW', '#ffffff'), { ink: INK, inkW: 0.6 });
      eye.position.set(0.36, 0.08, s * 0.2); head.add(eye);
      const pupil = new T.Mesh(K3D.geo('wormPupil', () => new T.SphereGeometry(0.055, 10, 8)), mat('ink', INK)); pupil.position.set(0.47, 0.08, s * 0.19); head.add(pupil);
    }
    const bridge = K3D.mesh(K3D.geo('wormBridge', () => new T.CylinderGeometry(0.025, 0.025, 0.08, 6).rotateX(Math.PI / 2)), brass, { ink: false }); bridge.position.set(0.44, 0.12, 0); head.add(bridge);
    // a smile
    const smile = new T.Mesh(K3D.geo('wormSmile', () => new T.TorusGeometry(0.14, 0.022, 6, 16, Math.PI).rotateZ(Math.PI).rotateY(Math.PI / 2)), mat('ink', INK)); smile.position.set(0.45, -0.14, 0); head.add(smile);
    if (o.hat !== 'none') {
      const cap = K3D.mesh(K3D.geo('mortarTop', () => new T.BoxGeometry(0.72, 0.06, 0.72)), mat('mortar', '#2f3442'), { ink: '#14141c', inkW: 0.8 });
      cap.position.set(-0.05, 0.52, 0); cap.rotation.y = 0.5; head.add(cap);
      const band = K3D.mesh(K3D.geo('mortarBand', () => new T.CylinderGeometry(0.26, 0.28, 0.18, 16)), mat('mortar', '#2f3442'), { ink: '#14141c', inkW: 0.8 });
      band.position.set(-0.05, 0.43, 0); head.add(band);
      const tassel = K3D.mesh(K3D.geo('tassel', () => new T.CylinderGeometry(0.02, 0.05, 0.3, 6)), mat('tassel', '#f2c14e'), { ink: '#6b4a10', inkW: 0.5 });
      tassel.position.set(0.22, 0.38, 0.22); head.add(tassel);
    }
    g.userData = { live: true, head, segs, cheerK: 0,
      tick(t) {
        const ch = this.cheerK;
        segs.forEach((m, i) => { m.position.y = (0.34 - i * 0.025) + Math.max(0, Math.sin(t * 4 - i * 0.8)) * 0.12 + ch * Math.max(0, Math.sin(t * 9 - i * 0.7)) * 0.25; m.position.z = Math.sin(t * 2 - i * 0.6) * 0.06; });
        head.position.y = 0.62 + Math.sin(t * 2) * 0.04 + ch * Math.abs(Math.sin(t * 9)) * 0.45;
        head.rotation.z = Math.sin(t * 1.3) * 0.08 + ch * 0.3; head.rotation.x = Math.sin(t * 0.9) * 0.1;
      },
      cheer(k) { this.cheerK = k; } };
    return g;
  };

  /* ---------- the room and the desk (round every spread) ---------- */
  function surroundings(K, flat, pg, k) {
    const room = P.room({ cup: [-52, 10], lamp: [62, -50], window: [-24, 0], books: [-62, -36], ink: [48, -34] }); flat.add(room); K.tick(() => room.userData.tick(G.clock));
    const lines = pg.art && pg.art.ROUTE ? pg.art.ROUTE : [pg.route];
    flat.add(P.desk({ route: { lines, bounds: [-34, -21, 34, 21], start: pg.route[0], end: pg.route[pg.route.length - 1] },
      at: { pencils: [26, 33, -0.3, 2], eraser: [-40, 31, 0.4, 1.6], ruler: [-10, 31, 0.04], scissors: [52, 2, 2.3, 1.8], clips: [44, 14, 0, 2], ball1: [-50, -14], ball2: [58, -20],
        glasses: [-47, 22, 0.5, 2.2], pot: [-46, -30, 0, 1.5], fern: [66, -34, 0, 1.3], sketch: [54, 26, -0.22 + k * 0.1, 1.5] } }));
    K.sunDir.set(0.62, 1, -0.5).normalize();
  }
  // the gutter's paper hinge on pages without a hedge fold: just the book; the Bookworm reads from the head of the book
  function wormOnBook(K, flat) {
    const w = P.bookworm({ len: 6 }); w.position.set(-2.6, 0.02, -PD / 2 - 0.9); w.rotation.y = -0.25; w.scale.setScalar(1.25);
    K.add(w); K.tick(() => w.userData.tick(G.clock)); void flat;
    return w;
  }

  /* ======================= PAGE 1: THE HEDGE GARDEN ======================= */
  function dress1(K, flat, pops, live, o = {}) {
    const A = PC.pages[0].art, { PLAZA, ROUTE, HALF, GATE, FOUNTAIN, SUNDIAL, POND, hedgeRuns } = A;
    const FULL = ROUTE[0].concat(ROUTE[1]);
    const routeDist = (x, z) => { let d = 1e9; for (let i = 0; i < FULL.length - 1; i++) d = Math.min(d, U.segDist(x, z, FULL[i], FULL[i + 1])); return d; };
    function paintPage(left) {
      return function (c, S, r, w, h) {
        const ox = left ? -PW : 0, X = x => (x - ox) * S, Z = z => (z + PD / 2) * S;
        for (let i = 0; i < 640; i++) P.wash(c, r() * w, r() * h, S * (0.6 + r() * 1.6), r() < 0.5 ? '#9cc77a' : '#b6d68c', 0.22, r, { noEdge: r() < 0.6 });
        c.fillStyle = 'rgba(255,255,240,0.06)'; for (let y = 0; y < h; y += S * 1.2) c.fillRect(0, y, w, S * 0.6);
        c.strokeStyle = 'rgba(70,110,60,0.55)'; c.lineWidth = 3; const m = 0.75 * S;
        c.strokeRect(m, m, w - m * 2, h - m * 2); c.strokeStyle = 'rgba(70,110,60,0.3)'; c.lineWidth = 1.5; c.strokeRect(m + 10, m + 10, w - m * 2 - 20, h - m * 2 - 20);
        const leafAt = (x, y, a) => { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = r() < 0.5 ? '#6f9a52' : '#86b062'; c.beginPath(); c.ellipse(0, -9, 5, 10, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(43,33,48,0.35)'; c.lineWidth = 1.2; c.stroke(); c.restore(); };
        for (let x = m + 30; x < w - m; x += 46) { leafAt(x, m + 5, 0.6 + r() * 0.5); leafAt(x + 20, h - m - 5, Math.PI - 0.6 - r() * 0.5); }
        for (let y = m + 30; y < h - m; y += 46) { leafAt(m + 5, y, -0.9 - r() * 0.4); leafAt(w - m - 5, y + 20, 0.9 + r() * 0.4); }
        for (const [x, y] of [[m, m], [w - m, m], [m, h - m], [w - m, h - m]]) { c.fillStyle = '#e0607a'; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos(k * 1.26) * 9, y + Math.sin(k * 1.26) * 9, 7, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#f2c14e'; c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill(); }
        for (const part of ROUTE) for (const run of hedgeRuns(part)) {
          c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = 'rgba(60,80,40,0.28)'; c.lineWidth = 1.5 * S;
          c.beginPath(); run.pts.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z + 0.15)) : c.moveTo(X(x), Z(z + 0.15))); c.stroke();
          c.strokeStyle = 'rgba(120,90,50,0.3)'; c.lineWidth = 0.95 * S; c.stroke();
        }
        const path = (pts, wd) => {
          c.lineCap = 'round'; c.lineJoin = 'round';
          c.strokeStyle = '#e8d6a8'; c.lineWidth = wd * S; c.beginPath(); pts.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); c.stroke();
          for (let i = 0; i < pts.length - 1; i++) {
            const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], n = Math.hypot(x1 - x0, z1 - z0) * 260;
            for (let k = 0; k < n; k++) { const t = r(), ox2 = (r() - 0.5) * wd * 0.92, nx = -(z1 - z0), nz = x1 - x0, l = Math.hypot(nx, nz); c.fillStyle = r() < 0.5 ? 'rgba(150,120,70,0.35)' : 'rgba(255,250,230,0.5)'; c.fillRect(X(x0 + (x1 - x0) * t + nx / l * ox2), Z(z0 + (z1 - z0) * t + nz / l * ox2), 2 + r() * 3, 2 + r() * 2); }
          }
          c.strokeStyle = 'rgba(43,33,48,0.5)'; c.lineWidth = 2.4;
          for (const sd of [-1, 1]) { c.beginPath(); U.offset(pts, sd * wd / 2).forEach(([x, z], i) => { const px = X(x) + (r() - 0.5) * 2, pz = Z(z) + (r() - 0.5) * 2; i ? c.lineTo(px, pz) : c.moveTo(px, pz); }); c.stroke(); }
        };
        path(FULL, 2.8);
        c.fillStyle = '#e8d6a8'; c.beginPath(); c.arc(X(PLAZA.x), Z(PLAZA.z), 3.3 * S, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(43,33,48,0.55)'; c.lineWidth = 2.4; c.beginPath(); c.arc(X(PLAZA.x), Z(PLAZA.z), 3.3 * S, 0, Math.PI * 2); c.stroke();
        c.save(); c.translate(X(PLAZA.x), Z(PLAZA.z)); c.strokeStyle = 'rgba(160,110,60,0.5)'; c.fillStyle = 'rgba(200,150,80,0.35)';
        for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(0, 0); c.lineTo(S * 0.3, -S * (i % 2 ? 0.9 : 1.6)); c.lineTo(-S * 0.3, -S * (i % 2 ? 0.9 : 1.6)); c.closePath(); c.fill(); c.stroke(); }
        c.restore();
        for (const [q, rad] of [[FOUNTAIN, 3.1], [SUNDIAL, 2.6]]) {
          c.fillStyle = '#eadcb4'; c.beginPath(); c.arc(X(q.x), Z(q.z), rad * S, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(43,33,48,0.45)'; c.lineWidth = 2; c.stroke();
        }
        const stones = (a, b, n) => { for (let k = 1; k < n; k++) { const t = k / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; c.fillStyle = '#d8ccb4'; c.beginPath(); c.ellipse(X(x), Z(z), S * 0.42, S * 0.3, r(), 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(43,33,48,0.45)'; c.lineWidth = 2; c.stroke(); } };
        // stepping stones from the path's fold leg (x = -9) out to the fountain court
        stones([-9 - HALF, 9.6], [FOUNTAIN.x + 3, FOUNTAIN.z], 4);
        if (!left) {
          const px = X(POND.x0), pz = Z(POND.z0), pw = (POND.x1 - POND.x0) * S, pd = (POND.z1 - POND.z0) * S;
          c.fillStyle = '#7fb6c8'; c.beginPath(); c.ellipse(px + pw / 2, pz + pd / 2, pw / 2, pd / 2, 0, 0, Math.PI * 2); c.fill();
          for (let i = 0; i < 30; i++) P.wash(c, px + r() * pw, pz + r() * pd, S * (0.5 + r()), r() < 0.5 ? '#5f9cb4' : '#a6d0dc', 0.3, r, { noEdge: true });
          c.save(); c.beginPath(); c.ellipse(px + pw / 2, pz + pd / 2, pw / 2, pd / 2, 0, 0, Math.PI * 2); c.clip();
          c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2; for (let i = 0; i < 26; i++) { const x = px + r() * pw, y = pz + r() * pd; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 20 + r() * 30, y); c.stroke(); }
          for (let i = 0; i < 14; i++) { const x = px + pw * (0.1 + r() * 0.8), y = pz + pd * (0.15 + r() * 0.7), rr2 = S * (0.3 + r() * 0.25); c.fillStyle = r() < 0.5 ? '#5d9a4d' : '#73ad5c'; c.beginPath(); c.moveTo(x, y); c.arc(x, y, rr2, 0.3, Math.PI * 2 - 0.1); c.closePath(); c.fill(); c.strokeStyle = 'rgba(43,33,48,0.5)'; c.stroke(); if (r() < 0.4) { c.fillStyle = '#f6c8d4'; c.beginPath(); c.arc(x + rr2 * 0.3, y - rr2 * 0.2, rr2 * 0.35, 0, Math.PI * 2); c.fill(); } }
          c.restore();
          c.strokeStyle = 'rgba(43,33,48,0.6)'; c.lineWidth = 3; c.beginPath(); c.ellipse(px + pw / 2, pz + pd / 2, pw / 2, pd / 2, 0, 0, Math.PI * 2); c.stroke();
          for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, x = px + pw / 2 + Math.cos(a) * pw / 2, y = pz + pd / 2 + Math.sin(a) * pd / 2; c.strokeStyle = 'rgba(70,110,50,0.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 8, y - 14 - r() * 10); c.stroke(); }
        }
        for (let i = 0; i < 1600; i++) {
          const x = r() * w, y = r() * h;
          c.strokeStyle = 'rgba(60,100,50,0.45)'; c.lineWidth = 1.4;
          c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x - 2, y - 7); c.moveTo(x, y); c.lineTo(x + 1, y - 9); c.moveTo(x + 4, y); c.lineTo(x + 5, y - 6); c.stroke();
        }
        for (let i = 0; i < 260; i++) {
          const x = r() * w, y = r() * h, col = ['#e0607a', '#f2c14e', '#ffffff', '#f08aa4', '#a98ad8'][Math.floor(r() * 5)];
          if (routeDist(x / S + ox, y / S - PD / 2) < 1.6) continue;
          for (let j = 0; j < 3; j++) { const fx = x + (r() - 0.5) * 18, fy = y + (r() - 0.5) * 12; c.fillStyle = col; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(fx + Math.cos(k * 1.26) * 3.5, fy + Math.sin(k * 1.26) * 3.5, 2.8, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#e8b33a'; c.beginPath(); c.arc(fx, fy, 1.8, 0, Math.PI * 2); c.fill(); }
        }
        if (left) { c.fillStyle = 'rgba(59,48,64,0.62)'; c.font = 'italic ' + Math.round(S * 0.85) + 'px Georgia, "DejaVu Serif", serif'; c.textAlign = 'left'; c.fillText('Chapter One: The Hedge Garden', X(-31.6), Z(-18.6)); }
        else { c.fillStyle = 'rgba(59,48,64,0.5)'; c.font = 'italic ' + Math.round(S * 0.55) + 'px Georgia, "DejaVu Serif", serif'; c.textAlign = 'right'; c.fillText('...and the gate was locked, of course.', X(31.5), Z(-18.8)); }
      };
    }
    const texL = P.pageTex('hedgeL2', PW, PD, paintPage(true), { num: '1', numAt: [2.4, PD - 0.9], gutter: 'right', textBlocks: [[14.4, 37.4, 16, 3.2, 3]] });
    const texR = P.pageTex('hedgeR2', PW, PD, paintPage(false), { num: '2', numAt: [PW - 2.4, PD - 0.9], gutter: 'left', textBlocks: [[2.4, 37.2, 12, 3.2, 20]] });
    flat.add(P.book({ pw: PW, pd: PD, tex: [texL, texR] }));
    let seed = 2;
    for (const part of ROUTE) for (const run of hedgeRuns(part)) pops.add(P.hedge(run.pts, { h: run.h, seed: seed++ }));
    const ring = A.ring;
    pops.add(P.hedge(ring.slice(0, 9), { h: 0.45, t: 0.4, seed: 40, posts: false }));
    pops.add(P.hedge(ring.slice(8), { h: 0.45, t: 0.4, seed: 41, posts: false }));
    const ftn = P.fountain(FOUNTAIN.x, FOUNTAIN.z, 1.15); pops.add(ftn); K.tick(() => ftn.userData.tick(G.clock));
    pops.add(P.sundial(SUNDIAL.x, SUNDIAL.z, 1.1));
    pops.add(P.bench(SUNDIAL.x, SUNDIAL.z + 3.6, Math.PI));
    pops.add(P.bench(-21.6, 15.4, -Math.PI / 2));
    pops.add(P.fence([[POND.x0 - 0.4, 13.4], [POND.x1 + 0.2, 13.4], [POND.x1 + 0.2, 20.2]]));
    pops.add(P.peacock(-31.8, 8.6, 0.7, 1.15));
    const gate = P.gate(GATE.x, GATE.z, Math.PI / 2, 2.8); gate.userData.live = true; live.add(gate);
    // the fold: a paper ridge across the path (the stile's line takes it away) and the card flaps either side
    const ridge = K3D.mesh(boxGeo(0.5, 0.75, 3.4, 0.75), [mat('ridgeS', '#efe2c0'), mat('ridgeS', '#efe2c0'), mat('ridgeT', '#f7eedb'), mat('ridgeS', '#efe2c0'), mat('ridgeS', '#efe2c0'), mat('ridgeS', '#efe2c0')], { ink: INK, inkW: 0.9 });
    ridge.position.set(0, 0.375, 8); ridge.userData.live = true; live.add(ridge);
    for (const s of [-1, 1]) { const fl = K3D.mesh(boxGeo(2.6, 0.75, 0.12, 0.75), mat('flap', '#e9dcb8'), { ink: INK, inkW: 0.8 }); fl.position.set(0, 0.375, 8 + s * (HALF + 0.05)); pops.add(fl); }
    // the stile (drawn): two little card ramps and a top step, in white card with printed wood
    const wood = K3D.paint('stileWood', 256, 256, (c, w, h) => { P.paper(c, w, h, '#d8b27c', 221); const r = rnd(222); for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(80,50,20,0.25)'; c.fillRect(0, i * h / 6, w, 3); } for (let i = 0; i < 80; i++) { c.strokeStyle = 'rgba(90,60,30,0.2)'; c.beginPath(); const y = r() * h; c.moveTo(0, y); c.bezierCurveTo(w / 3, y + 6, w * 2 / 3, y - 6, w, y); c.stroke(); } }, { repeat: true });
    const stile = new T.Group(); stile.userData.live = true; live.add(stile);
    for (const s of PC.pages[0].solids.filter(q => q.kind === 'stile')) stile.add(s.ramp ? rampCard(s, tmat('stileM', wood), 0.18) : solidBox(s, tmat('stileM', wood), { s: 1 }));
    const art = { gate, ridge, stile };
    // the lawns
    const r = rnd(77), placed = [[PLAZA.x, PLAZA.z, PLAZA.r + 1], [FOUNTAIN.x, FOUNTAIN.z, 3.6], [SUNDIAL.x, SUNDIAL.z + 1.5, 4], [-21.6, 15.4, 1.6], [-31.8, 8.6, 1.4], [GATE.x, GATE.z, 2.6]];
    const free = (x, z, rad, pad) => {
      if (Math.abs(x) < 1.8 + rad || Math.abs(x) > PW - 1.3 - rad || Math.abs(z) > PD / 2 - 1.3 - rad) return false;
      if (routeDist(x, z) < HALF + 0.35 + pad + rad) return false;
      if (x > POND.x0 - 0.6 && x < POND.x1 + 0.6 && z > 13 && z < POND.z1 + 0.6) return false;
      if ((z > 15.8 && x > -20.5 && x < -3.6) || (z > 15.8 && x > 1.8 && x < 14.8)) return false;
      return placed.every(([px, pz, pr]) => Math.hypot(x - px, z - pz) > pr + rad);
    };
    const scatter = (n, rad, pad, make, front) => {
      for (let k = 0, tries = 0; k < n && tries < 4000; tries++) {
        const x = (r() * 2 - 1) * PW, z = (r() - 0.5) * PD;
        if (!free(x, z, rad, pad) || (front && routeDist(x, z - 2.4) < 2.6)) continue;
        placed.push([x, z, rad]); pops.add(make(x, z)); k++;
      }
    };
    scatter(22, 0.9, 1.0, (x, z) => P.tree(x, z, 0.9 + r() * 0.45, Math.round(x * 3 + z)), true);
    const rc = ['#e0507a', '#f2c14e', '#f08aa4', '#ffffff', '#d8486a'];
    scatter(18, 0.6, 0.15, (x, z) => P.roseBush(x, z, (r() - 0.5) * 0.8, 0.75 + r() * 0.25, rc[Math.floor(r() * rc.length)], Math.round(x * 7 + z)));
    scatter(9, 1.3, 0.2, (x, z) => P.tulips(x, z, 1.0 + r() * 0.4, 0.6 + r() * 0.2, Math.round(x * 5 - z)));
    scatter(8, 0.5, 0.1, (x, z) => P.mushrooms(x, z, Math.round(x * 11 + z)));
    scatter(3, 0.5, 0.3, (x, z) => P.bunny(x, z, (r() - 0.5) * 1.2, 1 + r() * 0.3));
    for (const [x, z, rt] of [[-34.1, -8, Math.PI], [34.1, 6, 0]]) flat.add(P.pullTab(x, z, rt, 'Pull'));
    const flies = [];
    scatter(5, 0.3, 0.2, (x, z) => { const b = P.butterfly(x, z, ['#f2c14e', '#7fb6e0', '#f08aa4', '#ffffff', '#f08a3c'][flies.length % 5], flies.length + 3); b.userData.live = true; flies.push(b); return b; });
    K.tick(() => flies.forEach(b => b.userData.tick(G.clock)));
    art.update = (st, dt) => {
      const gl = st.lines && st.lines.find(l => l.id === 'arch');
      art.gateF = clamp((art.gateF || 0) + (gl && gl.done ? dt * 1.6 : -dt * 3), 0, 1);
      gate.userData.open(art.gateF);
      const sl = st.lines && st.lines.find(l => l.id === 'stile');
      const sf = sl && sl.done ? springK(Math.min(1, (sl.popT || 0) / 0.6)) : 0;
      stile.visible = sf > 0.01; stile.scale.y = Math.max(0.01, sf);
      ridge.scale.y = Math.max(0.01, 1 - (sl && sl.done ? Math.min(1, (sl.popT || 0) / 0.3) : 0)); ridge.visible = ridge.scale.y > 0.02;
      ridge.position.y = 0.375 * ridge.scale.y;
    };
    // (the look proof: a still life, the stile half drawn, the gate shut)
    if (o.still) { stile.visible = false; }
    return art;
  }

  /* ======================= PAGE 2: THE FOLDED BRIDGES ======================= */
  function dress2(K, flat, pops, live) {
    const pg = PC.pages[1], A = pg.art, B = A.B;
    const banks = pg.solids.filter(s => s.kind === 'bank' || s.kind === 'island');
    const inBank = (x, z, pad = 0) => banks.some(s => Math.abs(x - s.x) < s.w / 2 + pad && Math.abs(z - s.z) < s.d / 2 + pad);
    // the river, printed on the page under the tissue: watercolour blues, current lines, reeds at the cliffs' feet
    function paintRiver(left) {
      return function (c, S, r, w, h) {
        const ox = left ? -PW : 0, X = x => (x - ox) * S, Z = z => (z + PD / 2) * S;
        c.fillStyle = '#a9d6ea'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 520; i++) P.wash(c, r() * w, r() * h, S * (0.7 + r() * 2), r() < 0.5 ? '#7fbcdc' : '#c4e6f2', 0.25, r, { noEdge: r() < 0.7 });
        // the current: long soft strokes
        c.lineCap = 'round';
        for (let i = 0; i < 420; i++) { const x = r() * w, y = r() * h, l = S * (0.8 + r() * 2.4); c.strokeStyle = r() < 0.6 ? 'rgba(255,255,255,0.45)' : 'rgba(40,110,170,0.25)'; c.lineWidth = 1.5 + r() * 2; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y - 6 + r() * 12, x + l, y + (r() - 0.5) * 8); c.stroke(); }
        // rocks and reeds round each cliff's foot, and a darker shade where the cliffs throw shadow
        for (const s of banks) {
          const x0 = X(s.x - s.w / 2), z0 = Z(s.z - s.d / 2), ww = s.w * S, dd = s.d * S;
          c.fillStyle = 'rgba(30,70,110,0.22)'; c.fillRect(x0 - S * 0.4, z0 + dd, ww + S * 0.8, S * 1.1);
          c.fillStyle = 'rgba(30,70,110,0.12)'; c.fillRect(x0 - S * 0.7, z0 - S * 0.4, ww + S * 1.4, dd + S * 2);
          for (let k = 0; k < (s.w + s.d) * 5; k++) {
            const side = r() * 4 | 0, t = r(), px = side < 2 ? x0 + t * ww : (side === 2 ? x0 - S * 0.25 : x0 + ww + S * 0.25), pz = side < 2 ? (side ? z0 - S * 0.25 : z0 + dd + S * 0.25) : z0 + t * dd;
            if (r() < 0.5) { c.fillStyle = r() < 0.5 ? '#9a9084' : '#b4aa9a'; c.beginPath(); c.ellipse(px, pz, S * (0.12 + r() * 0.2), S * (0.08 + r() * 0.14), r() * 3, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(43,33,48,0.5)'; c.lineWidth = 1.5; c.stroke(); }
            else { c.strokeStyle = r() < 0.5 ? 'rgba(70,120,60,0.8)' : 'rgba(110,150,70,0.8)'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(px, pz); c.quadraticCurveTo(px + (r() - 0.5) * 10, pz - 12, px + (r() - 0.5) * 14, pz - 20 - r() * 14); c.stroke(); }
          }
        }
        // lily pads and printed fish
        for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h; if (inBank(x / S + ox, y / S - PD / 2, 0.6)) continue; const rr2 = S * (0.22 + r() * 0.2); c.fillStyle = r() < 0.5 ? '#5d9a4d' : '#73ad5c'; c.beginPath(); c.moveTo(x, y); c.arc(x, y, rr2, 0.3, Math.PI * 2 - 0.1); c.closePath(); c.fill(); c.strokeStyle = 'rgba(43,33,48,0.5)'; c.lineWidth = 1.5; c.stroke(); if (r() < 0.3) { c.fillStyle = '#f6c8d4'; c.beginPath(); c.arc(x, y - rr2 * 0.3, rr2 * 0.4, 0, Math.PI * 2); c.fill(); } }
        for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h; if (inBank(x / S + ox, y / S - PD / 2, 0.4)) continue; c.save(); c.translate(x, y); c.rotate(r() * 0.6 - 0.3); c.fillStyle = r() < 0.5 ? 'rgba(240,138,60,0.7)' : 'rgba(250,200,90,0.7)'; c.beginPath(); c.ellipse(0, 0, S * 0.3, S * 0.12, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(-S * 0.28, 0); c.lineTo(-S * 0.45, -S * 0.12); c.lineTo(-S * 0.45, S * 0.12); c.fill(); c.strokeStyle = 'rgba(43,33,48,0.45)'; c.lineWidth = 1.5; c.stroke(); c.restore(); }
        if (left) { c.fillStyle = 'rgba(30,50,80,0.6)'; c.font = 'italic ' + Math.round(S * 0.85) + 'px Georgia, "DejaVu Serif", serif'; c.textAlign = 'left'; c.fillText('Chapter Two: The Folded Bridges', X(-31.6), Z(-19.6)); }
        else { c.fillStyle = 'rgba(30,50,80,0.5)'; c.font = 'italic ' + Math.round(S * 0.55) + 'px Georgia, "DejaVu Serif", serif'; c.textAlign = 'right'; c.fillText('Single file, and mind the gaps.', X(31.5), Z(19.4)); }
      };
    }
    const texL = P.pageTex('riverL', PW, PD, paintRiver(true), { num: '3', numAt: [2.4, PD - 0.9], gutter: 'right', text: false });
    const texR = P.pageTex('riverR', PW, PD, paintRiver(false), { num: '4', numAt: [PW - 2.4, PD - 0.9], gutter: 'left', text: false });
    flat.add(P.book({ pw: PW, pd: PD, tex: [texL, texR] }));
    // blue tissue over the river, crinkled and drifting
    // (its own soft tissue: wide ripples and a few folds, nothing sharp, so the water reads as water from up high)
    const rivTex = K3D.paint('riverTissue', 512, 512, (c, w, h) => {
      c.fillStyle = 'rgba(190,226,244,1)'; c.fillRect(0, 0, w, h);
      const r = rnd(251);
      for (let i = 0; i < 60; i++) P.wash(c, r() * w, r() * h, 30 + r() * 60, r() < 0.5 ? '#9fd0ea' : '#d6eef8', 0.3, r, { noEdge: true });
      c.lineCap = 'round';
      for (let i = 0; i < 90; i++) {
        const x = r() * w, y = r() * h, l = 40 + r() * 90, a = r() < 0.5;
        c.strokeStyle = a ? 'rgba(255,255,255,0.55)' : 'rgba(60,130,180,0.22)'; c.lineWidth = a ? 2.5 + r() * 2 : 2;
        c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + l * 0.3, y - 7, x + l * 0.6, y + 7, x + l, y); c.stroke();
        if (a) { c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 8, y + 6); c.bezierCurveTo(x + l * 0.35, y, x + l * 0.6, y + 12, x + l - 10, y + 6); c.stroke(); }
      }
    }, { repeat: true });
    const tis = new T.Mesh(new T.PlaneGeometry(PW * 2 - 0.4, PD - 0.4).rotateX(-Math.PI / 2),
      K3D.mat('riverTissueM', () => K3D.toon('#ffffff', { map: rivTex, transparent: true, opacity: 0.55, depthWrite: false })));
    tis.position.y = 0.05; tis.renderOrder = 2; tis.userData.live = true; live.add(tis);
    const tisMap = tis.material.map; if (tisMap) tisMap.repeat.set(5, 4);
    K.tick(() => { if (tisMap) { tisMap.offset.x = G.clock * 0.02; tisMap.offset.y = Math.sin(G.clock * 0.3) * 0.01; } });
    // card cliffs: layered paper strata with a grassy top
    const cliff = K3D.paint('cliffSide', 256, 256, (c, w, h) => {
      const r = rnd(231), cols = ['#c9a77a', '#b48c62', '#d8bd8e', '#a77e58', '#c39a6c'];
      let y = 0; while (y < h) { const t = 14 + r() * 30; c.fillStyle = cols[(r() * cols.length) | 0]; c.fillRect(0, y, w, t + 1); c.strokeStyle = 'rgba(43,33,48,0.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= w; x += 16) c.lineTo(x, y + (r() - 0.5) * 3); c.stroke(); y += t; }
      for (let i = 0; i < 40; i++) P.wash(c, r() * w, r() * h, 10 + r() * 20, r() < 0.5 ? '#8f6a46' : '#e2c89a', 0.2, r, { noEdge: true });
      // grass fringe at the top (v = 1 is the top of the cliff)
      c.fillStyle = '#6fa44e'; c.fillRect(0, 0, w, 18);
      for (let x = 0; x < w; x += 6) { c.fillStyle = r() < 0.5 ? '#5d9440' : '#83b85e'; c.beginPath(); c.moveTo(x, 16); c.lineTo(x + 3, 18 + 10 + r() * 14); c.lineTo(x + 6, 16); c.fill(); }
      c.strokeStyle = 'rgba(43,33,48,0.4)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 18); c.lineTo(w, 18); c.stroke();
    }, { repeat: true });
    cliff.flipY = true; // (v up the cliff: the grass at the top)
    const meadow = K3D.paint('bankTop', 512, 512, (c, w, h) => {
      const r = rnd(241); c.fillStyle = '#93c46c'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 120; i++) P.wash(c, r() * w, r() * h, 20 + r() * 50, r() < 0.5 ? '#7fb35c' : '#a9d27e', 0.25, r, { noEdge: true });
      for (let i = 0; i < 900; i++) { const x = r() * w, y = r() * h; c.strokeStyle = 'rgba(60,100,40,0.45)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 1, y - 7); c.stroke(); }
      for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h, col = ['#ffffff', '#f2c14e', '#f08aa4'][(r() * 3) | 0]; c.fillStyle = col; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos(k * 1.26) * 3, y + Math.sin(k * 1.26) * 3, 2.4, 0, Math.PI * 2); c.fill(); } }
    }, { repeat: true });
    const cm = tmat('cliffM', cliff), tm = tmat('meadowM', meadow);
    for (const s of banks) pops.add(solidBox(s, [cm, cm, tm, cm, cm, cm], { s: B, sTop: 6, inkW: 1.1 }));
    // the accordion bridges: a printed plank deck on zig-zag folded paper skirts
    const planks = K3D.paint('deckPlanks', 256, 256, (c, w, h) => {
      P.paper(c, w, h, '#e9d6a6', 251); const r = rnd(252);
      for (let i = 0; i < 8; i++) { const y = i * h / 8; c.fillStyle = mixHex('#e2c48e', '#f0dcb0', r()); c.fillRect(0, y + 2, w, h / 8 - 4); c.strokeStyle = 'rgba(43,33,48,0.5)'; c.lineWidth = 2; c.strokeRect(-2, y + 2, w + 4, h / 8 - 4); c.fillStyle = 'rgba(43,33,48,0.6)'; c.beginPath(); c.arc(12, y + h / 16, 2.5, 0, Math.PI * 2); c.arc(w - 12, y + h / 16, 2.5, 0, Math.PI * 2); c.fill(); }
    }, { repeat: true });
    const deckM = tmat('deckM', planks), skirtM = mat('skirt', '#f3e6c8', { side: T.DoubleSide });
    function zigzag(len, hgt, n) {
      const pos = [], idx = [];
      for (let i = 0; i <= n; i++) { const x = -len / 2 + i / n * len, zz = (i % 2 ? 0.12 : -0.12); pos.push(x, 0, zz, x, -hgt, zz); if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
    }
    function bridge(s, still) {
      const g = new T.Group(); g.position.set(s.x, B, s.z);
      const along = s.w >= s.d, L = along ? s.w : s.d, Wd = along ? s.d : s.w;
      g.rotation.y = along ? 0 : Math.PI / 2;
      const deck = K3D.mesh(boxGeo(L, 0.14, Wd, 1.6), deckM, { ink: INK, inkW: 0.8 }); deck.position.y = -0.07; g.add(deck);
      for (const sd of [-1, 1]) { const zz = K3D.mesh(zigzag(L - 0.2, 0.9, Math.round(L / 0.35)), skirtM, { ink: '#8a7550', inkW: 0.5 }); zz.position.set(0, -0.14, sd * (Wd / 2 - 0.12)); g.add(zz); }
      // folded card piers at each end and every 4 units
      for (let x = -L / 2 + 0.3; x <= L / 2 - 0.2; x += Math.max(2.2, (L - 0.6) / Math.max(1, Math.round((L - 0.6) / 4)))) { const pr = K3D.mesh(boxGeo(0.22, B - 0.14, Wd * 0.9, 1), mat('pier', '#d9c49a'), { ink: INK, inkW: 0.7 }); pr.position.set(x, -0.14 - (B - 0.14) / 2, 0); g.add(pr); }
      if (still) pops.add(g);
      return g;
    }
    for (const s of pg.solids.filter(q => q.kind === 'bridge')) bridge(s, true);
    // the broken bridge's planks: drawn by the line, one by one
    const plankArt = pg.solids.filter(q => q.kind === 'plank').map(s => { const g = new T.Group(); g.position.set(s.x, B, s.z); const m = K3D.mesh(boxGeo(s.w, 0.14, s.d, 1.6), deckM, { ink: INK, inkW: 0.8 }); m.position.y = -0.07; g.add(m); const sk = K3D.mesh(zigzag(s.d - 0.1, 0.7, 4), skirtM, { ink: '#8a7550', inkW: 0.5 }); sk.rotation.y = Math.PI / 2; sk.position.y = -0.14; g.add(sk); g.userData.live = true; g.visible = false; live.add(g); return { s, g, t: -1 }; });
    // the broken stumps at each side of the gap
    for (const x of [3.6, 10.4]) { const st2 = K3D.mesh(boxGeo(0.8, 0.14, 1.6, 1.6), deckM, { ink: INK, inkW: 0.8 }); st2.position.set(x, B - 0.07, -15.5); st2.rotation.z = x < 5 ? -0.2 : 0.2; pops.add(st2); }
    // the seesaw: a long plank on a folded card fulcrum
    const SS = pg.seesaw, see = new T.Group(); see.position.set(SS.x, B, SS.z); see.userData.live = true; live.add(see);
    const seePlank = K3D.mesh(boxGeo(1.6, 0.18, SS.half * 2, 1.6), deckM, { ink: INK, inkW: 0.9 }); seePlank.position.y = -0.09; see.add(seePlank);
    const tipM = mat('seeTip', '#d86a5a');
    for (const s of [-1, 1]) { const end = K3D.mesh(boxGeo(1.6, 0.05, 0.5, 1), tipM, { ink: false }); end.position.set(0, 0.005, s * (SS.half - 0.3)); see.add(end); }
    const fulc = new T.Shape(); fulc.moveTo(-1.1, 0); fulc.lineTo(1.1, 0); fulc.lineTo(0, B - 0.2); fulc.closePath();
    const fu = P.card(fulc, { col: '#c9563f', depth: 1.4, edge: '#f3dcc8' }); fu.rotation.y = Math.PI / 2; fu.position.set(SS.x, 0, SS.z); pops.add(fu);
    const fast = P.fastener(0.12); fast.position.set(SS.x + 0.75, B - 0.3, SS.z); fast.rotation.y = Math.PI / 2; pops.add(fast);
    // the watermill on stilts in the river, its wheel turning
    const [mx, mz] = A.mill;
    const mill = new T.Group(); mill.position.set(mx, 0, mz); pops.add(mill);
    const millWall = K3D.paint('millWall', 256, 256, (c, w, h) => { P.paper(c, w, h, '#f0e2c4', 261); const r = rnd(262); for (let y = 0; y < h; y += 22) for (let x = (y / 22 % 2) * -18; x < w; x += 36) { c.strokeStyle = 'rgba(43,33,48,0.3)'; c.lineWidth = 1.5; c.strokeRect(x, y, 36, 22); } c.fillStyle = '#5a7fa6'; c.fillRect(90, 80, 70, 60); c.strokeStyle = INK; c.lineWidth = 4; c.strokeRect(90, 80, 70, 60); c.beginPath(); c.moveTo(125, 80); c.lineTo(125, 140); c.moveTo(90, 110); c.lineTo(160, 110); c.stroke(); for (let i = 0; i < 20; i++) P.wash(c, r() * w, h * 0.7 + r() * h * 0.3, 14, '#7fa060', 0.25, r, { noEdge: true }); });
    const mw = tmat('millW', millWall);
    const house = K3D.mesh(boxGeo(2.6, 2.2, 2.2, 2.2), mw, { ink: INK }); house.position.set(0, B + 1.1 - 0.6, 0); mill.add(house);
    const roofS = new T.Shape(); roofS.moveTo(-1.6, 0); roofS.lineTo(1.6, 0); roofS.lineTo(0, 1.4); roofS.closePath();
    const roof = P.card(roofS, { col: '#b8544a', depth: 2.6, edge: '#f3dcc8' }); roof.position.set(0, B + 2.2 - 0.6, 0); mill.add(roof);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = K3D.mesh(boxGeo(0.2, B - 0.6, 0.2, 1), mat('pier', '#d9c49a'), { ink: INK, inkW: 0.7 }); leg.position.set(sx * 1.1, (B - 0.6) / 2, sz * 0.9); mill.add(leg); }
    const wheel = new T.Group(); wheel.position.set(mx + 1.75, 1.4, mz); wheel.userData.live = true; live.add(wheel);
    const rim = K3D.mesh(K3D.geo('millRim', () => new T.TorusGeometry(1.25, 0.08, 8, 28)), mat('millWood', '#a9784a'), { ink: INK, inkW: 0.7 }); rim.rotation.y = Math.PI / 2; wheel.add(rim);
    for (let i = 0; i < 10; i++) { const pd2 = K3D.mesh(boxGeo(0.06, 0.5, 0.7, 1), mat('millWood', '#a9784a'), { ink: INK, inkW: 0.6 }); const a = i / 10 * Math.PI * 2; pd2.position.set(0, Math.sin(a) * 1.2, Math.cos(a) * 1.2); pd2.rotation.x = -a; wheel.add(pd2); }
    const hub = K3D.mesh(K3D.geo('millHub', () => new T.CylinderGeometry(0.16, 0.16, 0.5, 12).rotateZ(Math.PI / 2)), mat('brass', '#d9a640'), { ink: '#5a3d14', inkW: 0.6 }); wheel.add(hub);
    K.tick(dt => { wheel.rotation.x -= dt * 0.9; });
    // paper boats bobbing on the current
    const boats = [];
    const boatTex = K3D.paint('boatPaper', 256, 128, (c, w, h) => { P.paper(c, w, h, '#fbf4e0', 271); c.fillStyle = rgba('#3b3040', 0.18); for (let y = 16; y < h - 10; y += 10) c.fillRect(14, y, w - 28, 3); });
    for (const [bx, bz] of A.boats) {
      const b = new T.Group(); b.position.set(bx, 0.1, bz); b.userData.live = true;
      const hull = new T.Shape(); hull.moveTo(-0.9, 0.35); hull.lineTo(0.9, 0.35); hull.lineTo(0.55, 0); hull.lineTo(-0.55, 0); hull.closePath();
      for (const s of [-1, 1]) { const side = P.card(hull, { tex: boatTex, depth: 0.02 }); side.position.z = s * 0.22; side.rotation.x = s * 0.18; b.add(side); }
      const sail = P.card(P.shapeFrom([[-0.55, 0.35], [0.55, 0.35], [0, 1.1]]), { tex: boatTex, depth: 0.02 }); b.add(sail);
      live.add(b); boats.push({ b, x: bx, z: bz, ph: bx * 0.7 });
    }
    // trees, cottages, a signpost on the banks
    const r = rnd(281);
    const onBankFree = [];
    const tryPlace = (s, rad, n, make) => { for (let k = 0, tries = 0; k < n && tries < 400; tries++) {
      const x = s.x + (r() - 0.5) * (s.w - 1.4), z = s.z + (r() - 0.5) * (s.d - 1.4);
      if (U.lineDist(x, z, pg.route) < 2.3 + rad || onBankFree.some(([px, pz, pr]) => Math.hypot(x - px, z - pz) < pr + rad)) continue;
      if (Math.abs(x) < 1 + rad || Math.abs(z) > PD / 2 - 1 - rad) continue;
      onBankFree.push([x, z, rad]); const m = make(x, z); m.position.y += B; pops.add(m); k++;
    } };
    function cottage(x, z, rot, col) {
      const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
      const wallT = K3D.paint('cottage|' + col, 256, 256, (c, w, h) => { P.paper(c, w, h, col, 291); c.fillStyle = '#6aa0c8'; c.fillRect(40, 70, 56, 50); c.fillRect(160, 70, 56, 50); c.strokeStyle = INK; c.lineWidth = 4; c.strokeRect(40, 70, 56, 50); c.strokeRect(160, 70, 56, 50); c.fillStyle = '#8a5a34'; c.fillRect(104, 140, 48, 116); c.strokeRect(104, 140, 48, 116); c.fillStyle = '#e0607a'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(44 + i * 10, 124, 5, 0, Math.PI * 2); c.arc(164 + i * 10, 124, 5, 0, Math.PI * 2); c.fill(); } });
      const body = K3D.mesh(boxGeo(1.8, 1.3, 1.4, 1.4), tmat('cottW', wallT), { ink: INK }); body.position.y = 0.65; g.add(body);
      const rs = new T.Shape(); rs.moveTo(-1.15, 0); rs.lineTo(1.15, 0); rs.lineTo(0, 0.9); rs.closePath();
      const rf = P.card(rs, { col: '#6c8fb8', depth: 1.6, edge: '#e8eef6' }); rf.position.y = 1.3; rf.rotation.y = Math.PI / 2; g.add(rf);
      const ch = K3D.mesh(boxGeo(0.25, 0.5, 0.25, 1), mat('chim', '#b8544a'), { ink: INK }); ch.position.set(0.4, 1.9, 0.3); g.add(ch);
      return g;
    }
    for (const s of banks) {
      const n = Math.round(s.w * s.d / 40);
      tryPlace(s, 0.9, Math.max(1, Math.round(n * 0.6)), (x, z) => P.tree(x, z, 0.9 + r() * 0.4, Math.round(x * 3 - z)));
      tryPlace(s, 1.3, s.w * s.d > 120 ? 1 : 0, (x, z) => cottage(x, z, (r() - 0.5) * 0.6, ['#f3d9b0', '#e8c8c8', '#d8e4c0'][(r() * 3) | 0]));
      tryPlace(s, 0.5, Math.max(1, Math.round(n * 0.8)), (x, z) => P.roseBush(x, z, r(), 0.7 + r() * 0.2, ['#e0507a', '#f2c14e', '#ffffff'][(r() * 3) | 0], Math.round(x * 5 + z)));
      tryPlace(s, 0.4, Math.max(1, Math.round(n * 0.5)), (x, z) => P.mushrooms(x, z, Math.round(x * 9 - z)));
    }
    // a signpost at the start
    const sign = new T.Group(); sign.position.set(-30.8, B, -2.6);
    const post = K3D.mesh(boxGeo(0.14, 1.5, 0.14, 1), mat('pier', '#d9c49a'), { ink: INK, inkW: 0.7 }); post.position.y = 0.75; sign.add(post);
    const signT = K3D.paint('signRiver', 256, 96, (c, w, h) => { P.paper(c, w, h, '#f6e7c4', 301); c.fillStyle = INK; c.font = 'italic bold 40px Georgia, "DejaVu Serif", serif'; c.textBaseline = 'middle'; c.fillText('To the Mill', 24, h / 2 + 2); c.strokeStyle = INK; c.lineWidth = 4; c.strokeRect(3, 3, w - 6, h - 6); });
    const board = P.card(P.shapeFrom([[0, -0.22], [1.3, -0.22], [1.55, 0], [1.3, 0.22], [0, 0.22]]), { tex: signT, depth: 0.04 }); board.position.set(0, 1.25, 0); sign.add(board); pops.add(sign);
    // splashes: rings that spread and fade, and droplets
    const rings = [];
    const ringGeo = K3D.geo('splashRing', () => new T.RingGeometry(0.7, 1, 32).rotateX(-Math.PI / 2));
    let lastSplash = null;
    const art = {
      update(st, dt) {
        for (const q of boats) { q.b.position.y = 0.1 + Math.sin(G.clock * 1.6 + q.ph) * 0.05; q.b.rotation.z = Math.sin(G.clock * 1.3 + q.ph) * 0.08; q.b.rotation.y = q.ph + Math.sin(G.clock * 0.4 + q.ph) * 0.3; q.b.position.x = q.x + Math.sin(G.clock * 0.25 + q.ph) * 0.8; }
        // planks: each springs up as it appears
        for (const q of plankArt) {
          const on = !st.solids || !st.byId || !st.byId[q.s.id] ? false : !st.byId[q.s.id][0].ghost;
          if (on && q.t < 0) q.t = 0;
          if (!on) q.t = -1;
          if (q.t >= 0) q.t += dt;
          q.g.visible = q.t >= 0; q.g.scale.set(1, Math.max(0.01, springK(Math.min(1, q.t / 0.45))), 1);
          q.g.position.y = B + (1 - Math.min(1, q.t / 0.3)) * 0.6;
        }
        // the seesaw's tilt (rules: the ends' heights; north end up for a positive tilt)
        if (st.see) see.rotation.x = Math.asin(clamp(2 * st.see.tilt / (SS.half * 2), -1, 1));
        if (st.splashAt && st.splashAt !== lastSplash) {
          lastSplash = st.splashAt;
          for (let k = 0; k < 3; k++) { const m = new T.Mesh(ringGeo, K3D.flat('#ffffff', { transparent: true, opacity: 0.8, depthWrite: false })); m.position.set(st.splashAt.x, 0.08, st.splashAt.z); m.renderOrder = 3; live.add(m); rings.push({ m, t: -k * 0.18 }); }
        }
        for (let i = rings.length - 1; i >= 0; i--) { const q = rings[i]; q.t += dt; const f = Math.max(0, q.t); q.m.scale.setScalar(0.3 + f * 2.4); q.m.material.opacity = Math.max(0, 0.8 - f * 0.9); q.m.visible = q.t >= 0; if (q.t > 1) { live.remove(q.m); rings.splice(i, 1); } }
      },
    };
    return art;
  }

  /* ======================= PAGE 3: CLOCKWORK TOWN ======================= */
  function dress3(K, flat, pops, live) {
    const pg = PC.pages[2], A = pg.art, { STREET, HALF3, SH, walls } = A, TW = pg.tower, TR = pg.train;
    function paintTown(left) {
      return function (c, S, r, w, h) {
        const ox = left ? -PW : 0, X = x => (x - ox) * S, Z = z => (z + PD / 2) * S;
        // printed gardens and lanes round the town: pale greens and warm paper
        for (let i = 0; i < 380; i++) P.wash(c, r() * w, r() * h, S * (0.6 + r() * 1.6), r() < 0.5 ? '#cfdcae' : '#e6dcb8', 0.25, r, { noEdge: r() < 0.6 });
        // the cobbled street
        const st = (pts, wd) => {
          c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#c9bca4'; c.lineWidth = wd * S; c.beginPath(); pts.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); c.stroke();
          for (let i = 0; i < pts.length - 1; i++) {
            const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], L = Math.hypot(x1 - x0, z1 - z0), tx = (x1 - x0) / L, tz = (z1 - z0) / L;
            for (let a = 0; a < L; a += 0.32) for (let b = -wd / 2 + 0.16; b < wd / 2; b += 0.3) {
              const px = x0 + tx * a - tz * b + (r() - 0.5) * 0.06, pz = z0 + tz * a + tx * b + (r() - 0.5) * 0.06;
              c.fillStyle = mixHex('#b8aa92', '#d8ccb4', r()); c.beginPath(); c.ellipse(X(px), Z(pz), S * 0.13, S * 0.11, r(), 0, Math.PI * 2); c.fill();
              c.strokeStyle = 'rgba(43,33,48,0.28)'; c.lineWidth = 1.2; c.stroke();
            }
          }
        };
        st(STREET.concat([[TW.x - 1.5, 6.6]]), 2.9);
        // the railway: sleepers and rails along z = TR.z
        for (let x = -18; x < 7; x += 0.5) { c.fillStyle = '#8a6440'; c.fillRect(X(x), Z(TR.z - 0.6), S * 0.22, S * 1.2); }
        c.strokeStyle = '#6a6a78'; c.lineWidth = S * 0.08; for (const dz of [-0.4, 0.4]) { c.beginPath(); c.moveTo(X(-18), Z(TR.z + dz)); c.lineTo(X(7), Z(TR.z + dz)); c.stroke(); }
        // the tower's square: flagstones in a ring
        c.fillStyle = '#d6ccb6'; c.beginPath(); c.arc(X(TW.x), Z(TW.z), (TW.rOut + 1.2) * S, 0, Math.PI * 2); c.fill();
        for (let k = 0; k < 120; k++) { const a = k / 120 * Math.PI * 2, rr2 = TW.rOut + 0.6; c.strokeStyle = 'rgba(43,33,48,0.25)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(X(TW.x + Math.cos(a) * (TW.rIn)), Z(TW.z + Math.sin(a) * TW.rIn)); c.lineTo(X(TW.x + Math.cos(a) * rr2), Z(TW.z + Math.sin(a) * rr2)); c.stroke(); }
        // printed hedges, gardens and lanes between the houses
        for (let i = 0; i < 160; i++) { const x = r() * w, y = r() * h; c.fillStyle = r() < 0.5 ? 'rgba(110,150,80,0.5)' : 'rgba(150,180,100,0.45)'; c.beginPath(); c.ellipse(x, y, S * (0.3 + r() * 0.4), S * (0.2 + r() * 0.2), r() * 3, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(43,33,48,0.3)'; c.lineWidth = 1.2; c.stroke(); }
        if (left) { c.fillStyle = 'rgba(59,48,64,0.62)'; c.font = 'italic ' + Math.round(S * 0.85) + 'px Georgia, "DejaVu Serif", serif'; c.textAlign = 'left'; c.fillText('Chapter Three: Clockwork Town', X(-31.6), Z(-18.6)); }
        else { c.fillStyle = 'rgba(59,48,64,0.5)'; c.font = 'italic ' + Math.round(S * 0.55) + 'px Georgia, "DejaVu Serif", serif'; c.textAlign = 'right'; c.fillText('Tick, tock. Up the tower they went.', X(31.5), Z(19.4)); }
      };
    }
    const texL = P.pageTex('townL', PW, PD, paintTown(true), { num: '5', numAt: [2.4, PD - 0.9], gutter: 'right', textBlocks: [[-4 + PW, 37.4, 3, 3, 9]] });
    const texR = P.pageTex('townR', PW, PD, paintTown(false), { num: '6', numAt: [PW - 2.4, PD - 0.9], gutter: 'left', textBlocks: [[2.4, 37.2, 10, 3.2, 31]] });
    flat.add(P.book({ pw: PW, pd: PD, tex: [texL, texR] }));
    // shop fronts: a printed facade card with a rooftop outline, a box behind it and a roof
    const SHOPS = [
      { name: 'Bakery', wall: '#f3d9b0', trim: '#b8544a', awn: ['#e86a5a', '#fbeee0'], goods: 'bread' },
      { name: 'Clocks', wall: '#d8e4c0', trim: '#4a6a4a', awn: ['#5a8a5a', '#eef4e0'], goods: 'clock' },
      { name: 'Toys', wall: '#e8c8d8', trim: '#8a4a6a', awn: ['#d86aa0', '#fbe8f0'], goods: 'toy' },
      { name: 'Books', wall: '#d8d0e8', trim: '#4a4a7a', awn: ['#6a6ab8', '#eeeef8'], goods: 'book' },
      { name: 'Hats', wall: '#f0e0b8', trim: '#8a6a2a', awn: ['#e8b84a', '#fbf4e0'], goods: 'hat' },
      { name: 'Sweets', wall: '#f8d0c0', trim: '#a04a3a', awn: ['#f08a8a', '#ffffff'], goods: 'sweet' },
      { name: 'Tea', wall: '#e0ecd8', trim: '#3a6a5a', awn: ['#4a9a8a', '#eef8f4'], goods: 'tea' },
    ];
    function shopTex(sp, wide) {
      return K3D.paint('shop|' + sp.name + '|' + wide, 512, 384, (c, w, h) => {
        P.paper(c, w, h, sp.wall, 311 + sp.name.length);
        const r = rnd(sp.name.length * 13);
        // timber, bricks or plaster lines
        c.strokeStyle = rgba(sp.trim, 0.25); c.lineWidth = 2; for (let y = 20; y < h * 0.62; y += 26) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
        // upstairs windows with shutters and flower boxes
        const nw = wide ? 3 : 2;
        for (let i = 0; i < nw; i++) {
          const x = w * (i + 0.5) / nw - 34, y = 40;
          c.fillStyle = '#8fc0e0'; c.fillRect(x, y, 68, 70); c.strokeStyle = INK; c.lineWidth = 4; c.strokeRect(x, y, 68, 70); c.beginPath(); c.moveTo(x + 34, y); c.lineTo(x + 34, y + 70); c.moveTo(x, y + 35); c.lineTo(x + 68, y + 35); c.stroke();
          c.fillStyle = sp.trim; c.fillRect(x - 16, y, 14, 70); c.fillRect(x + 70, y, 14, 70); c.strokeRect(x - 16, y, 14, 70); c.strokeRect(x + 70, y, 14, 70);
          c.fillStyle = '#8a5a34'; c.fillRect(x - 4, y + 72, 76, 12); for (let k = 0; k < 7; k++) { c.fillStyle = ['#e0607a', '#f2c14e', '#ffffff'][k % 3]; c.beginPath(); c.arc(x + 4 + k * 10, y + 70, 6, 0, Math.PI * 2); c.fill(); }
        }
        // the shop window and door at street level
        c.fillStyle = sp.trim; c.fillRect(0, h * 0.6, w, h * 0.4);
        c.fillStyle = '#b8dcef'; c.fillRect(24, h * 0.66, w * 0.55, h * 0.28); c.strokeStyle = INK; c.lineWidth = 4; c.strokeRect(24, h * 0.66, w * 0.55, h * 0.28);
        // the goods in the window
        for (let k = 0; k < 5; k++) {
          const gx = 44 + k * w * 0.1, gy = h * 0.86;
          c.fillStyle = { bread: '#d8a05a', clock: '#f6efdf', toy: '#e86a5a', book: ['#6a6ab8', '#b8544a', '#5a8a5a'][k % 3], hat: '#3a3a4a', sweet: ['#f08aa4', '#f2c14e', '#7fc4ea'][k % 3], tea: '#ffffff' }[sp.goods];
          c.beginPath();
          if (sp.goods === 'clock') { c.arc(gx, gy - 10, 14, 0, Math.PI * 2); c.fill(); c.stroke(); c.beginPath(); c.moveTo(gx, gy - 10); c.lineTo(gx, gy - 20); c.moveTo(gx, gy - 10); c.lineTo(gx + 7, gy - 10); c.stroke(); }
          else if (sp.goods === 'book') { c.fillRect(gx - 8, gy - 28, 16, 30); c.strokeRect(gx - 8, gy - 28, 16, 30); }
          else if (sp.goods === 'hat') { c.fillRect(gx - 12, gy - 4, 24, 5); c.fillRect(gx - 7, gy - 22, 14, 18); c.strokeRect(gx - 7, gy - 22, 14, 18); }
          else { c.ellipse(gx, gy - 8, 13, 9, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
        }
        c.fillStyle = '#6a4a2e'; c.fillRect(w * 0.68, h * 0.64, w * 0.2, h * 0.36); c.strokeRect(w * 0.68, h * 0.64, w * 0.2, h * 0.36);
        c.fillStyle = '#d9a640'; c.beginPath(); c.arc(w * 0.84, h * 0.83, 5, 0, Math.PI * 2); c.fill();
        // the sign board
        c.fillStyle = '#fbf4e0'; c.fillRect(w * 0.12, h * 0.5, w * 0.76, h * 0.09); c.strokeRect(w * 0.12, h * 0.5, w * 0.76, h * 0.09);
        c.fillStyle = INK; c.font = 'italic bold 30px Georgia, "DejaVu Serif", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sp.name, w / 2, h * 0.547);
        for (let i = 0; i < 18; i++) P.wash(c, r() * w, r() * h * 0.6, 12 + r() * 20, sp.wall, 0.25, r, { noEdge: true });
      });
    }
    const roofCols = ['#b8544a', '#6c8fb8', '#8a6a4a', '#5a7a5a', '#9a5a7a'];
    // clay or slate tiles: rows of round-bottomed tiles, each row offset by half a tile, with a little wash
    const roofTex = col => K3D.paint('roofTiles|' + col, 256, 256, (c, w, h) => {
      c.fillStyle = dk(col, 0.3); c.fillRect(0, 0, w, h);
      const r = rnd(col.length * 31 + col.charCodeAt(1)), tw = 32, th = 28;
      for (let row = 0; row * th < h + th; row++) for (let i = -1; i * tw < w + tw; i++) {
        const x = i * tw + (row % 2) * tw / 2, y = row * th;
        c.fillStyle = mixHex(col, r() < 0.5 ? '#ffffff' : '#1a1420', r() * 0.18);
        c.beginPath(); c.moveTo(x + 1, y); c.lineTo(x + tw - 1, y); c.lineTo(x + tw - 1, y + th - 8); c.quadraticCurveTo(x + tw / 2, y + th + 6, x + 1, y + th - 8); c.closePath(); c.fill();
        c.strokeStyle = rgba(dk(col, 0.55), 0.7); c.lineWidth = 2; c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x + 4, y + 3, tw - 10, 3);
      }
    }, { repeat: true });
    // a pitched tiled roof on a group: ridge along local x at z = zc, eaves overhanging a little, gable ends in the wall colour
    function addRoof(g, wdt, depth, hgt, rc, wall, zc, rise = 0.8) {
      const run = depth / 2 + 0.15, sl = Math.hypot(run, rise), ang = Math.atan2(rise, run), em = mat('roofEdge|' + rc, dk(rc, 0.25)), rm = tmat('roofM', roofTex(rc));
      for (const sd of [1, -1]) {
        const slope = K3D.mesh(boxGeo(wdt + 0.08, 0.07, sl + 0.06, 0.9), [em, em, rm, em, em, em], { ink: INK, inkW: 0.7 });
        slope.position.set(0, hgt + rise / 2 + 0.03, zc + sd * run / 2); slope.rotation.x = sd * ang; g.add(slope);
      }
      const rs = new T.Shape(); rs.moveTo(-run + 0.05, 0); rs.lineTo(run - 0.05, 0); rs.lineTo(0, rise - 0.04); rs.closePath();
      for (const ex of [-wdt / 2 + 0.03, wdt / 2 - 0.08]) { const gab = P.card(rs, { col: wall, depth: 0.05 }); gab.position.set(ex, hgt, zc); gab.rotation.y = Math.PI / 2; g.add(gab); }
      const ridge = K3D.mesh(boxGeo(wdt + 0.12, 0.1, 0.12, 1), em, { ink: INK, inkW: 0.6 }); ridge.position.set(0, hgt + rise + 0.04, zc); g.add(ridge);
    }
    // a little house's wall: one printed window to a unit (the box's faces repeat it)
    const houseTex = col => K3D.paint('houseWall|' + col, 128, 128, (c, w, h) => {
      c.fillStyle = col; c.fillRect(0, 0, w, h);
      const r = rnd(col.charCodeAt(1) * 7 + col.charCodeAt(3)); for (let i = 0; i < 6; i++) P.wash(c, r() * w, r() * h, 20 + r() * 30, dk(col, 0.15), 0.2, r, { noEdge: true });
      c.fillStyle = r() < 0.5 ? '#b8dcef' : '#f6e6a8'; c.fillRect(38, 30, 52, 56); c.strokeStyle = INK; c.lineWidth = 5; c.strokeRect(38, 30, 52, 56);
      c.lineWidth = 3; c.beginPath(); c.moveTo(64, 30); c.lineTo(64, 86); c.moveTo(38, 58); c.lineTo(90, 58); c.stroke();
      c.fillStyle = '#fbf4e0'; c.fillRect(32, 86, 64, 8); c.strokeRect(32, 86, 64, 8);
    }, { repeat: true });
    const awnTex = sp => K3D.paint('awn|' + sp.name, 128, 64, (c, w, h) => { for (let x = 0; x < w; x += 16) { c.fillStyle = (x / 16) % 2 ? sp.awn[1] : sp.awn[0]; c.fillRect(x, 0, 16, h); } c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, h - 8, w, 8); });
    // the gap the railway passes through, on the second street (x = -6): no shops between z -2.4 and 0.4
    const rail0 = TR.z - 1.4, rail1 = TR.z + 1.4;
    let shopN = 0;
    for (const wl of walls) {
      const ax = wl.a[0], az = wl.a[1], bx = wl.b[0], bz = wl.b[1], L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / L, tz = (bz - az) / L;
      // which side is the street: the normal pointing to the street's middle line
      const mxp = (ax + bx) / 2, mzp = (az + bz) / 2;
      let nx = -tz, nz = tx;
      const dd = U.lineDist(mxp + nx * 0.5, mzp + nz * 0.5, STREET), d0 = U.lineDist(mxp, mzp, STREET);
      if (dd > d0) { nx = -nx; nz = -nz; }
      const face = Math.atan2(nx, nz); // rotation.y that turns +Z to the street
      if (wl.near) {
        // the viewer's side: low garden fronts (railings and flower boxes), so the street stays in view
        const fence = P.fence([[ax + nx * 0.25, az + nz * 0.25], [bx + nx * 0.25, bz + nz * 0.25]], { h: 0.8 });
        pops.add(fence);
        for (let a = 1; a < L - 0.5; a += 2.2) { const fb = K3D.mesh(boxGeo(0.9, 0.3, 0.32, 1), mat('flowerBox', '#8a5a34'), { ink: INK, inkW: 0.7 }); fb.position.set(ax + tx * a - nx * 0.15, 0.95, az + tz * a - nz * 0.15); fb.rotation.y = face; pops.add(fb); const fl = P.roseBush(ax + tx * a - nx * 0.15, az + tz * a - nz * 0.15, face, 0.45, ['#e0507a', '#f2c14e', '#ffffff'][shopN++ % 3], shopN); fl.position.y = 1.0; pops.add(fl); }
        continue;
      }
      for (let a = 0; a < L - 0.6;) {
        let wdt = 2.6 + ((shopN * 7) % 5) * 0.25; if (a + wdt > L) wdt = L - a; if (wdt < 1.2) break;
        const cx = ax + tx * (a + wdt / 2), cz = az + tz * (a + wdt / 2);
        // leave the railway's arch open
        if (Math.abs(cx + 6) < 2.5 && cz > rail0 - wdt / 2 && cz < rail1 + wdt / 2 && Math.abs(ax - bx) < 0.01) {
          const gapA = (rail0 - az) / tz, gapB = (rail1 - az) / tz, g0 = Math.min(gapA, gapB), g1 = Math.max(gapA, gapB);
          if (a < g1 && a + wdt > g0) { if (a < g0 - 1.2) wdt = g0 - a; else { a = g1; continue; } }
        }
        const sp = SHOPS[shopN++ % SHOPS.length], hgt = SH + 0.2 + ((shopN * 3) % 4) * 0.25, depth = 2.0;
        const fx = ax + tx * (a + wdt / 2) + nx * 0.26, fz = az + tz * (a + wdt / 2) + nz * 0.26;
        const g = new T.Group(); g.position.set(fx, 0, fz); g.rotation.y = face;
        // the roofline: a gable, a step or a flat cornice
        const kind = shopN % 3, shp = [[-wdt / 2, 0], [wdt / 2, 0], [wdt / 2, hgt]];
        if (kind === 0) shp.push([0, hgt + 0.9], [-wdt / 2, hgt]);
        else if (kind === 1) shp.push([wdt / 2 - 0.4, hgt], [wdt / 2 - 0.4, hgt + 0.4], [-wdt / 2 + 0.4, hgt + 0.4], [-wdt / 2 + 0.4, hgt], [-wdt / 2, hgt]);
        else shp.push([wdt / 2 + 0.1, hgt + 0.2], [-wdt / 2 - 0.1, hgt + 0.2], [-wdt / 2, hgt]);
        const front = P.card(P.shapeFrom(shp), { tex: shopTex(sp, wdt > 3), depth: 0.05 });
        // (the card's printed face spans its outline: the texture is laid over the box 0..wdt, 0..hgt)
        g.add(front);
        const body = K3D.mesh(boxGeo(wdt - 0.06, hgt, depth, 1.5), mat('shopBack|' + sp.name, lt(sp.wall, 0.1)), { ink: INK, inkW: 0.8 }); body.position.set(0, hgt / 2, -depth / 2 - 0.03); g.add(body);
        // the roof: two tiled slopes over gable ends in the shop's own wall colour
        addRoof(g, wdt, depth, hgt, roofCols[shopN % roofCols.length], lt(sp.wall, 0.1), -depth / 2 - 0.03);
        const chim = K3D.mesh(boxGeo(0.3, 0.7, 0.3, 1), mat('chim', '#b8544a'), { ink: INK }); chim.position.set(wdt * 0.25, hgt + 0.6, -depth * 0.7); g.add(chim);
        // a striped awning over the shop window
        const awn = K3D.mesh(new T.PlaneGeometry(wdt * 0.62, 0.7), K3D.mat('awnM|' + sp.name, () => K3D.toon('#ffffff', { map: awnTex(sp), side: T.DoubleSide })), { ink: dk(sp.awn[0], 0.5), inkW: 0.6 });
        awn.position.set(-wdt * 0.08, hgt * 0.62, 0.3); awn.rotation.x = -0.9; g.add(awn);
        pops.add(g);
        a += wdt;
      }
    }
    // the railway arch openings and crossing barriers by the second street
    for (const sx of [-6 - HALF3 - 0.05, -6 + HALF3 + 0.05]) {
      const arch = K3D.mesh(boxGeo(0.5, 0.6, 3.2, 1), mat('archStone', '#cfc2a8'), { ink: INK }); arch.position.set(sx + (sx < -6 ? -0.2 : 0.2), SH - 0.3, TR.z); pops.add(arch);
      for (const dz of [-1.45, 1.45]) { const pil = K3D.mesh(boxGeo(0.5, SH - 0.6, 0.3, 1), mat('archStone', '#cfc2a8'), { ink: INK }); pil.position.set(sx + (sx < -6 ? -0.2 : 0.2), (SH - 0.6) / 2, TR.z + dz); pops.add(pil); }
    }
    const arms = [];
    for (const [px, pz, side] of [[-6 - HALF3 + 0.4, TR.z - 1.05, 1], [-6 + HALF3 - 0.4, TR.z + 1.05, -1]]) {
      const post = K3D.mesh(boxGeo(0.14, 1.3, 0.14, 1), mat('armPost', '#f6efdf'), { ink: INK, inkW: 0.7 }); post.position.set(px, 0.65, pz); pops.add(post);
      const arm = new T.Group(); arm.position.set(px, 1.2, pz); arm.userData.live = true; live.add(arm);
      const armT = K3D.paint('armStripes', 256, 32, (c, w, h) => { for (let x = 0; x < w; x += 32) { c.fillStyle = (x / 32) % 2 ? '#ffffff' : '#d8483a'; c.fillRect(x, 0, 32, h); } });
      const bar = K3D.mesh(boxGeo(2.4, 0.12, 0.06, 1), tmat('armM', armT), { ink: INK, inkW: 0.6 }); bar.position.set(side * 1.2, 0, 0); arm.add(bar);
      const lamp = new T.Mesh(K3D.geo('xingLamp', () => new T.SphereGeometry(0.1, 10, 8)), K3D.flat('#ff5040')); lamp.position.set(0, 0.25, 0); arm.add(lamp);
      arms.push({ arm, side, lamp });
    }
    // the paper train: an engine and two carriages, printed card on wheels
    const train = new T.Group(); train.userData.live = true; live.add(train);
    const coachT = K3D.paint('coach', 512, 128, (c, w, h) => { P.paper(c, w, h, '#4a7ab8', 321); c.fillStyle = '#f6efdf'; for (let x = 30; x < w - 40; x += 70) { c.fillRect(x, 26, 46, 46); c.strokeStyle = INK; c.lineWidth = 4; c.strokeRect(x, 26, 46, 46); } c.fillStyle = '#f2c14e'; c.fillRect(0, 90, w, 10); });
    const engT = K3D.paint('engine', 256, 128, (c, w, h) => { P.paper(c, w, h, '#d8483a', 322); c.fillStyle = '#2f3442'; c.fillRect(0, 96, w, 32); c.fillStyle = '#f2c14e'; c.fillRect(0, 86, w, 8); c.fillStyle = '#f6efdf'; c.beginPath(); c.arc(w * 0.75, 50, 22, 0, Math.PI * 2); c.fill(); c.strokeStyle = INK; c.lineWidth = 4; c.stroke(); });
    const parts = [[1.6, engT, 1.5, -1.5], [1.4, coachT, 1.3, 0.05], [1.4, coachT, 1.3, 1.55]];
    for (const [len, tex, hgt, off] of parts) {
      const car = K3D.mesh(boxGeo(len, hgt - 0.3, 1.1, 1.2), [tmat('car', tex), tmat('car', tex), mat('carTop', '#2f3442'), mat('carTop', '#2f3442'), tmat('car', tex), tmat('car', tex)], { ink: INK });
      car.position.set(-off, 0.3 + (hgt - 0.3) / 2, 0); train.add(car);
      for (const dx of [-len * 0.3, len * 0.3]) for (const dz of [-0.56, 0.56]) { const wh = K3D.mesh(K3D.geo('wheel', () => new T.CylinderGeometry(0.2, 0.2, 0.06, 16).rotateX(Math.PI / 2)), mat('wheelM', '#2f3442'), { ink: '#14141c', inkW: 0.6 }); wh.position.set(-off + dx, 0.2, dz); train.add(wh); }
    }
    const funnel = K3D.mesh(K3D.geo('funnel', () => new T.CylinderGeometry(0.2, 0.14, 0.6, 12)), mat('carTop', '#2f3442'), { ink: INK }); funnel.position.set(1.9, 1.7, 0); train.add(funnel);
    const puffs = [];
    for (let k = 0; k < 4; k++) { const pf = K3D.mesh(K3D.geo('puff', () => new T.SphereGeometry(0.28, 12, 10)), mat('puffM', '#ffffff'), { ink: '#b8b0c0', inkW: 0.6 }); train.add(pf); puffs.push(pf); }
    // the pull-tab doors: a planked card door hinged at the north side of the street, a printed tab beside it
    const doorT = K3D.paint('townDoor', 256, 256, (c, w, h) => { P.paper(c, w, h, '#a8743e', 331); for (let x = 0; x < w; x += 32) { c.strokeStyle = 'rgba(43,33,48,0.5)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } c.fillStyle = '#d9a640'; c.beginPath(); c.arc(w * 0.82, h * 0.55, 12, 0, Math.PI * 2); c.fill(); c.strokeStyle = INK; c.stroke(); c.fillStyle = '#2f3442'; c.fillRect(0, h * 0.2, w, 14); c.fillRect(0, h * 0.75, w, 14); });
    const doors = [];
    for (const d of pg.doors) {
      const hinge = new T.Group(); hinge.position.set(d.x, 0, d.z - HALF3 + 0.25); hinge.userData.live = true; live.add(hinge);
      const leaf = K3D.mesh(boxGeo(0.12, 2.2, HALF3 * 2 - 0.5, 2.2), [tmat('doorM', doorT), tmat('doorM', doorT), mat('doorEdge', '#f3e6c8'), mat('doorEdge', '#f3e6c8'), tmat('doorM', doorT), tmat('doorM', doorT)], { ink: INK });
      leaf.position.set(0, 1.1, (HALF3 * 2 - 0.5) / 2); hinge.add(leaf);
      // the lintel arch over the street at the door
      const lin = K3D.mesh(boxGeo(0.5, 0.4, HALF3 * 2 + 0.6, 1), mat('archStone', '#cfc2a8'), { ink: INK }); lin.position.set(d.x, 2.55, d.z); pops.add(lin);
      const tabT = K3D.paint('doorTab', 128, 64, (c, w, h) => { P.paper(c, w, h, '#f0e2b8', 341); c.fillStyle = '#c0504a'; c.beginPath(); c.moveTo(14, h / 2); c.lineTo(44, 12); c.lineTo(44, h - 12); c.closePath(); c.fill(); c.fillStyle = INK; c.font = 'italic bold 22px Georgia, serif'; c.textBaseline = 'middle'; c.fillText('Pull', 52, h / 2); });
      const tab = P.card(P.shapeFrom([[0, -0.2], [0.9, -0.2], [1.0, 0], [0.9, 0.2], [0, 0.2]]), { tex: tabT, depth: 0.02 }); tab.position.set(d.x - 0.5, 1.8, d.z - HALF3 - 0.05); tab.userData.live = true; live.add(tab);
      doors.push({ d, hinge, tab });
    }
    // the clock tower: an octagon of printed stone with clock faces at the top and a pointed roof
    const stone = K3D.paint('towerStone', 256, 256, (c, w, h) => { P.paper(c, w, h, '#e2d6bc', 351); const r = rnd(352); for (let y = 0; y < h; y += 32) for (let x = (y / 32 % 2) * -24; x < w; x += 48) { c.fillStyle = mixHex('#d8caa8', '#ece0c6', r()); c.fillRect(x + 2, y + 2, 44, 28); c.strokeStyle = 'rgba(43,33,48,0.35)'; c.lineWidth = 2; c.strokeRect(x + 2, y + 2, 44, 28); } }, { repeat: true });
    const towerH = TW.rise + 3.2;
    const tg = K3D.mesh(new T.CylinderGeometry(TW.rIn, TW.rIn, towerH, 8, 1).rotateY(Math.PI / 8).translate(0, towerH / 2, 0), tmat('towerM', stone), { ink: INK, inkW: 1.1 });
    { const uv = tg.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 8, uv.getY(i) * towerH / 2.2); }
    tg.position.set(TW.x, 0, TW.z); pops.add(tg);
    const cornice = K3D.mesh(new T.CylinderGeometry(TW.rIn + 0.35, TW.rIn + 0.35, 0.35, 8).rotateY(Math.PI / 8), mat('cornice', '#cfc2a8'), { ink: INK }); cornice.position.set(TW.x, towerH, TW.z); pops.add(cornice);
    const spire = K3D.mesh(new T.ConeGeometry(TW.rIn + 0.4, 3.4, 8).rotateY(Math.PI / 8), mat('spire', '#5a7aa8'), { ink: INK, inkW: 1.1 }); spire.position.set(TW.x, towerH + 1.85, TW.z); pops.add(spire);
    const vane = K3D.mesh(K3D.geo('vane', () => new T.ConeGeometry(0.12, 0.7, 6)), mat('brass', '#d9a640'), { ink: '#5a3d14', inkW: 0.6 }); vane.position.set(TW.x, towerH + 3.9, TW.z); pops.add(vane);
    const clockT = K3D.paint('clockFace', 256, 256, (c, w, h) => { c.fillStyle = '#fbf4e0'; c.beginPath(); c.arc(128, 128, 120, 0, Math.PI * 2); c.fill(); c.strokeStyle = INK; c.lineWidth = 8; c.stroke(); c.fillStyle = INK; c.font = 'bold 30px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let k = 1; k <= 12; k++) { const a = k / 12 * Math.PI * 2; c.fillText(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][k - 1], 128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); } });
    const hands = [];
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 8 * 0, ap = TW.rIn * Math.cos(Math.PI / 8) + 0.03;
      const g = new T.Group(); g.position.set(TW.x + Math.sin(a) * ap, towerH - 1.4, TW.z + Math.cos(a) * ap); g.rotation.y = a; pops.add(g);
      const face = new T.Mesh(K3D.geo('clockGeo', () => new T.CircleGeometry(1.0, 32)), K3D.mat('clockM', () => K3D.toon('#ffffff', { map: clockT }))); g.add(face);
      const hh = new T.Group(); hh.position.z = 0.04; hh.userData.live = true;
      const hour = K3D.mesh(boxGeo(0.08, 0.55, 0.03, 1).translate(0, 0.25, 0), mat('ink', INK), { ink: false }); const minute = K3D.mesh(boxGeo(0.05, 0.8, 0.03, 1).translate(0, 0.38, 0), mat('ink', INK), { ink: false });
      const hg = new T.Group(); hg.add(hour); const mg = new T.Group(); mg.add(minute); hh.add(hg); hh.add(mg);
      const hp = g.localToWorld ? null : null; void hp;
      live.add(hh); hh.position.copy(g.position).add(V(Math.sin(a) * 0.05, 0, Math.cos(a) * 0.05)); hh.rotation.y = a;
      hands.push({ hg, mg });
    }
    // the spiral ramp: card planks on each ramp piece, the railing with its two torn gaps
    const rampT = K3D.paint('rampPlanks', 256, 256, (c, w, h) => { P.paper(c, w, h, '#c9a06a', 361); for (let x = 0; x < w; x += 32) { c.strokeStyle = 'rgba(43,33,48,0.45)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } }, { repeat: true });
    const rm = tmat('rampM', rampT), rimM = mat('rampEdge', '#efe2c0');
    for (const s of pg.solids.filter(q => q.kind === 'ramp')) pops.add(rampCard(s, [rm, rm, rm, rimM, rimM, rimM], 0.3));
    const railT = K3D.paint('railing', 256, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#f6efdf'; c.fillRect(0, 0, w, 18); c.fillRect(0, h - 14, w, 14); for (let x = 8; x < w; x += 28) c.fillRect(x, 0, 10, h); c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(0, 0, w, 18); for (let x = 8; x < w; x += 28) c.strokeRect(x, 18, 10, h - 32); });
    const railM = K3D.mat('railM', () => K3D.toon('#ffffff', { map: railT, transparent: true, alphaTest: 0.5, side: T.DoubleSide }));
    for (const s of pg.solids.filter(q => q.kind === 'rail')) {
      const m = new T.Mesh(new T.PlaneGeometry(s.w, s.y1 - s.y0), railM); m.castShadow = true;
      m.position.set(s.x, (s.y0 + s.y1) / 2, s.z); m.rotation.y = -(s.rot || 0) * 0 + (s.rot || 0); pops.add(m);
    }
    // torn card flaps at the railing's two gaps
    for (const [g0, g1] of TW.gaps) for (const u of [g0, g1]) { const [x, z] = TW.at(u, TW.rOut + 0.1), fl = P.card(P.shapeFrom([[0, 0], [0.35, 0], [0.2, 0.5], [0.05, 0.35]]), { col: '#f6efdf', depth: 0.02 }); fl.position.set(x, Math.min(1, u) * TW.rise, z); fl.rotation.y = -TW.angAt(u); pops.add(fl); }
    // the bell at the top landing
    const [bx, bz] = TW.at(1.06, TW.rMid);
    const bellG = new T.Group(); bellG.position.set(bx, TW.rise, bz); pops.add(bellG);
    for (const s of [-1, 1]) { const po = K3D.mesh(boxGeo(0.16, 2.4, 0.16, 1), mat('pier', '#d9c49a'), { ink: INK, inkW: 0.7 }); po.position.set(s * 1.0, 1.2, 0); bellG.add(po); }
    const beam = K3D.mesh(boxGeo(2.3, 0.18, 0.2, 1), mat('pier', '#d9c49a'), { ink: INK, inkW: 0.7 }); beam.position.y = 2.4; bellG.add(beam);
    const bell = new T.Group(); bell.position.y = 2.3; bell.userData.live = true; live.add(bell); bell.position.add(bellG.position);
    const bm = K3D.mesh(K3D.geo('bellGeo', () => new T.CylinderGeometry(0.18, 0.5, 0.7, 20, 1, true).translate(0, -0.35, 0)), mat('brassD', '#d9a640', { side: T.DoubleSide }), { ink: '#5a3d14', inkW: 0.8 }); bell.add(bm);
    // lamp posts and flower tubs along the street
    for (let i = 0; i < STREET.length - 1; i++) {
      const [x0, z0] = STREET[i], [x1, z1] = STREET[i + 1], L = Math.hypot(x1 - x0, z1 - z0), tx = (x1 - x0) / L, tz = (z1 - z0) / L;
      for (let a = 3; a < L - 2; a += 6.5) {
        const px = x0 + tx * a + tz * (HALF3 - 0.45), pz = z0 + tz * a - tx * (HALF3 - 0.45);
        if (pg.doors.some(d => Math.abs(d.x - px) < 1.2 && Math.abs(d.z - pz) < 3)) continue;
        if (Math.abs(pz - TR.z) < 1.8 && Math.abs(px + 6) < 3) continue;
        const lp = new T.Group(); lp.position.set(px, 0, pz);
        const pole = K3D.mesh(K3D.geo('lampPole', () => new T.CylinderGeometry(0.05, 0.07, 2.3, 8).translate(0, 1.15, 0)), mat('lampIron', '#3a3f4a'), { ink: '#14141c', inkW: 0.6 }); lp.add(pole);
        const head = K3D.mesh(K3D.geo('lampHead', () => new T.CylinderGeometry(0.12, 0.2, 0.35, 6).translate(0, 2.45, 0)), mat('lampGlass', '#fbe6a0', { emissive: '#f2c14e', emissiveIntensity: 0.35 }), { ink: '#14141c', inkW: 0.6 }); lp.add(head);
        pops.add(lp);
      }
    }
    // background houses beyond the shops (rows of little card houses)
    const r = rnd(371), houseCols = ['#f3d9b0', '#e8c8c8', '#d8e4c0', '#d8d0e8', '#f0e0b8'];
    for (let k = 0, tries = 0; k < 30 && tries < 900; tries++) {
      const x = (r() * 2 - 1) * (PW - 2), z = (r() - 0.5) * (PD - 4);
      if (U.lineDist(x, z, STREET.concat([[TW.x - 1.5, 6.6]])) < 5.2 || Math.hypot(x - TW.x, z - TW.z) < TW.rOut + 2.5 || Math.abs(x) < 1.5) continue;
      if (Math.abs(z - TR.z) < 1.4 && x > -18 && x < 7) continue;
      const col = houseCols[k % houseCols.length], wdt = 1.6 + r() * 1.2, hgt = 1.4 + r() * 1.2;
      const hg = new T.Group(); hg.position.set(x, 0, z); hg.rotation.y = (r() - 0.5) * 0.3; pops.add(hg);
      const hm = tmat('bgHouse', houseTex(col)), hb = K3D.mesh(boxGeo(wdt, hgt, 1.6, 1), [hm, hm, mat('bgHouseTop|' + col, col), hm, hm, hm], { ink: INK, inkW: 0.8 }); hb.position.y = hgt / 2; hg.add(hb);
      addRoof(hg, wdt, 1.6, hgt, roofCols[k % roofCols.length], lt(col, 0.1), 0, 0.7);
      if (r() < 0.6) { const ch = K3D.mesh(boxGeo(0.25, 0.6, 0.25, 1), mat('chim', '#b8544a'), { ink: INK }); ch.position.set(wdt * (r() - 0.5) * 0.6, hgt + 0.55, -0.35); hg.add(ch); }
      k++;
    }
    const art = {
      update(st, dt) {
        for (const q of doors) {
          const D = st.doors && st.doors[q.d.id], f = D ? (D.f != null ? D.f : D.open ? 1 : 0) : 1;
          q.hinge.rotation.y = -f * Math.PI / 2 * 0.98 + (D && D.tick ? Math.sin(G.clock * 40) * 0.05 : 0);
          q.tab.position.x = q.d.x - 0.5 - f * 0.4;
        }
        const Tr = st.train;
        if (Tr) {
          train.visible = !!Tr.on; train.position.set(Tr.x, 0, TR.z);
          puffs.forEach((pf, k) => { const t = (G.clock * 1.4 + k / 4) % 1; pf.position.set(1.9 - t * 2.2, 2.0 + t * 1.2, Math.sin(k * 2 + G.clock) * 0.2); pf.scale.setScalar(0.5 + t * 0.9); });
          const down = Tr.warn || Tr.on;
          for (const a of arms) { a.arm.rotation.z = a.side * (down ? 0 : 1.35) * 1 + 0; a.armF = clamp((a.armF || 0) + (down ? dt * 3 : -dt * 2), 0, 1); a.arm.rotation.z = a.side * (1 - a.armF) * 1.35; a.lamp.material.color.set(down && Math.sin(G.clock * 12 + a.side) > 0 ? '#ff5040' : '#5a2a2a'); }
        }
        const tm = st.t || 0;
        for (const h of hands) { h.mg.rotation.z = -tm * 0.6; h.hg.rotation.z = -tm * 0.05; }
        if (st.turn >= 0 || st.clockT != null) bell.rotation.z = Math.sin(G.clock * 10) * 0.4 * (st.turn >= 0 ? 1 : 0);
      },
    };
    return art;
  }

  /* ======================= PAGE 4: THE LAST PAGE ======================= */
  function dress4(K, flat, pops, live) {
    const pg = PC.pages[3], A = pg.art, { HOLE, R1, R3 } = A, I = pg.ink, POT = pg.pot;
    function paintBlank(left) {
      return function (c, S, r, w, h) {
        const ox = left ? -PW : 0, X = x => (x - ox) * S, Z = z => (z + PD / 2) * S;
        // the page is nearly blank: the faintest printed border, a few pencil doodles in the margins
        c.strokeStyle = 'rgba(59,48,64,0.22)'; c.lineWidth = 2; const m = 0.75 * S; c.strokeRect(m, m, w - m * 2, h - m * 2);
        c.strokeStyle = 'rgba(59,48,64,0.18)'; c.lineWidth = 1.5;
        for (let i = 0; i < 14; i++) { const x = m + r() * (w - m * 2), y = r() < 0.5 ? m + r() * S * 1.5 : h - m - r() * S * 1.5; c.beginPath(); c.arc(x, y, S * (0.15 + r() * 0.3), 0, Math.PI * 2 * (0.5 + r() * 0.5)); c.stroke(); }
        // the torn hole: a dark ragged opening, torn fibres and the next page's printed lines far below
        if (!left) {
          const x0 = X(HOLE.x0), z0 = Z(HOLE.z0), x1 = X(HOLE.x1), z1 = Z(HOLE.z1);
          c.fillStyle = '#3b3040'; c.beginPath();
          const pts = []; const N = 40;
          for (let i = 0; i < N; i++) { const t = i / N; pts.push([x0 + (x1 - x0) * t, z0 + (r() - 0.5) * S * 0.25]); }
          for (let i = 0; i < N; i++) { const t = i / N; pts.push([x1 + (r() - 0.5) * S * 0.25, z0 + (z1 - z0) * t]); }
          for (let i = 0; i < N; i++) { const t = i / N; pts.push([x1 - (x1 - x0) * t, z1 + (r() - 0.5) * S * 0.25]); }
          for (let i = 0; i < N; i++) { const t = i / N; pts.push([x0 + (r() - 0.5) * S * 0.25, z1 - (z1 - z0) * t]); }
          pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill();
          const g = c.createRadialGradient((x0 + x1) / 2, (z0 + z1) / 2, 10, (x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) * 0.7);
          g.addColorStop(0, 'rgba(200,190,170,0.28)'); g.addColorStop(1, 'rgba(20,14,24,0)'); c.fillStyle = g; c.fill();
          c.fillStyle = 'rgba(240,230,210,0.12)'; for (let y = z0 + S * 0.8; y < z1 - S * 0.6; y += S * 0.4) c.fillRect(x0 + S * 0.8, y, (x1 - x0) - S * 1.6, S * 0.08);
          c.strokeStyle = 'rgba(255,250,235,0.9)'; c.lineWidth = 5; c.stroke();
          for (const [x, y] of pts) if (r() < 0.6) { c.strokeStyle = 'rgba(250,244,228,0.8)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 12, y + (r() - 0.5) * 12); c.stroke(); }
        }
        // the route, faintly ruled in the Bookworm's pencil, as if he had planned it
        c.strokeStyle = 'rgba(80,80,96,0.16)'; c.lineWidth = 2.5; c.setLineDash([12, 10]); c.beginPath(); pg.route.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); c.stroke(); c.setLineDash([]);
        if (left) { c.fillStyle = 'rgba(59,48,64,0.62)'; c.font = 'italic ' + Math.round(S * 0.85) + 'px Georgia, "DejaVu Serif", serif'; c.textAlign = 'left'; c.fillText('The Last Page', X(-31.6), Z(-18.6)); }
        else { c.fillStyle = 'rgba(59,48,64,0.45)'; c.font = 'italic ' + Math.round(S * 0.7) + 'px Georgia, "DejaVu Serif", serif'; c.textAlign = 'right'; c.fillText('The End (nearly)', X(31.5), Z(19.4)); }
      };
    }
    const texL = P.pageTex('blankL', PW, PD, paintBlank(true), { num: '7', numAt: [2.4, PD - 0.9], gutter: 'right', text: false });
    const texR = P.pageTex('blankR', PW, PD, paintBlank(false), { num: '8', numAt: [PW - 2.4, PD - 0.9], gutter: 'left', text: false });
    flat.add(P.book({ pw: PW, pd: PD, tex: [texL, texR] }));
    // torn paper curls standing at the hole's edges
    const r = rnd(401);
    for (let k = 0; k < 16; k++) {
      const side = k % 4, t = (k / 4 | 0) / 4 + r() * 0.2, x = side < 2 ? HOLE.x0 + (HOLE.x1 - HOLE.x0) * t : side === 2 ? HOLE.x0 : HOLE.x1, z = side < 2 ? (side ? HOLE.z1 : HOLE.z0) : HOLE.z0 + (HOLE.z1 - HOLE.z0) * t;
      const fl = P.card(P.shapeFrom([[0, 0], [0.5 + r() * 0.4, 0], [0.3, 0.3 + r() * 0.3], [0.1, 0.25]]), { col: '#fbf7ec', depth: 0.015 });
      fl.position.set(x, 0.01, z); fl.rotation.y = side < 2 ? 0 : Math.PI / 2; fl.rotation.x = (side === 0 || side === 3 ? 1 : -1) * 0.6; pops.add(fl);
    }
    // the rises: white card blocks with pencil-sketched sides
    const sketch = K3D.paint('sketchCard', 256, 256, (c, w, h) => { P.paper(c, w, h, '#fbf7ec', 411); const r2 = rnd(412); c.strokeStyle = 'rgba(80,80,96,0.25)'; c.lineWidth = 1.5; for (let i = 0; i < 60; i++) { const x = r2() * w; c.beginPath(); c.moveTo(x, h); c.lineTo(x + 30, h - 30 - r2() * 40); c.stroke(); } c.strokeStyle = 'rgba(80,80,96,0.5)'; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, h - 4); }, { repeat: true });
    const topT = K3D.paint('sketchTop', 256, 256, (c, w, h) => { P.paper(c, w, h, '#fdfaf0', 413); c.strokeStyle = 'rgba(80,80,96,0.12)'; c.lineWidth = 1; for (let y = 16; y < h; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } }, { repeat: true });
    const sm = tmat('sketchM', sketch), stm = tmat('sketchTopM', topT);
    for (const s of pg.solids.filter(q => q.kind === 'rise')) pops.add(solidBox(s, [sm, sm, stm, sm, sm, sm], { s: 1.2, sTop: 4, inkW: 1 }));
    // what the lines draw: stairs (steps), the bridge (planks), the desk ramp
    const stairsS = pg.solids.find(q => q.id === 'stairs'), stairs = new T.Group(); stairs.userData.live = true; live.add(stairs);
    { const n = 6, hgt = stairsS.ramp.h1 - stairsS.ramp.h0, step = stairsS.w / n; for (let i = 0; i < n; i++) { const hh = hgt * (i + 1) / n, m = K3D.mesh(boxGeo(step, hh, stairsS.d, 1), [sm, sm, stm, sm, sm, sm], { ink: INK, inkW: 0.8 }); m.position.set(stairsS.x - stairsS.w / 2 + step * (i + 0.5), hh / 2, stairsS.z); stairs.add(m); } }
    const plankArt = pg.solids.filter(q => q.kind === 'plank').map(s => { const g = new T.Group(); g.position.set(s.x, R1, s.z); const m = K3D.mesh(boxGeo(s.w, 0.14, s.d, 1), [sm, sm, stm, sm, sm, sm], { ink: INK, inkW: 0.8 }); m.position.y = -0.07; g.add(m); g.visible = false; g.userData.live = true; live.add(g); return { s, g, t: -1 }; });
    const rampS = pg.solids.find(q => q.id === 'ramp'), ramp = rampCard(rampS, [sm, sm, stm, sm, sm, sm], 0.3); ramp.userData.live = true; live.add(ramp);
    const pops2 = [{ id: 'stairs', g: stairs, t: -1 }, { id: 'ramp', g: ramp, t: -1 }];
    // the Bookworm's desk on the high rise: a little card desk, a lamp, books, and the giant pencil pot
    const deskG = new T.Group(); deskG.position.set(30.5, R3, -11); pops.add(deskG);
    const top = K3D.mesh(boxGeo(3, 0.15, 1.6, 1), mat('wormDesk', '#a9784a'), { ink: INK }); top.position.y = 1.1; deskG.add(top);
    for (const [sx, sz] of [[-1.3, -0.65], [1.3, -0.65], [-1.3, 0.65], [1.3, 0.65]]) { const leg = K3D.mesh(boxGeo(0.14, 1.05, 0.14, 1), mat('wormDesk', '#a9784a'), { ink: INK, inkW: 0.7 }); leg.position.set(sx, 0.52, sz); deskG.add(leg); }
    for (let k = 0; k < 4; k++) { const bk = K3D.mesh(boxGeo(0.22, 0.6 + k * 0.05, 0.8, 1), mat('wormBook' + k, ['#6a6ab8', '#b8544a', '#5a8a5a', '#e8b84a'][k]), { ink: INK, inkW: 0.7 }); bk.position.set(-1.1 + k * 0.24, 1.48 + k * 0.025, -0.2); deskG.add(bk); }
    const potG = new T.Group(); potG.position.set(POT.x, R3, POT.z); pops.add(potG);
    const potT = K3D.paint('pencilPot', 512, 256, (c, w, h) => { P.paper(c, w, h, '#4a7ab8', 421); c.fillStyle = '#f2c14e'; for (let x = 0; x < w; x += 64) { c.beginPath(); c.arc(x + 32, h / 2, 18, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#f6efdf'; c.fillRect(0, 10, w, 14); c.fillRect(0, h - 24, w, 14); c.fillStyle = INK; c.font = 'italic bold 40px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Home', w / 2, h / 2 + 50); });
    const potM = K3D.mesh(new T.CylinderGeometry(1.05, 0.95, 2.4, 24, 1, true).translate(0, 1.2, 0), K3D.mat('potM', () => K3D.toon('#ffffff', { map: potT, side: T.DoubleSide })), { ink: INK, inkW: 1.1 }); potG.add(potM);
    const potIn = new T.Mesh(new T.CircleGeometry(1.0, 24).rotateX(-Math.PI / 2), mat('potIn', '#2a2a3a')); potIn.position.y = 0.3; potG.add(potIn);
    const others = [['#d8483a', -0.4, 0.3, 0.12], ['#5aa04a', 0.35, -0.3, -0.1], ['#7a4fa8', 0.1, 0.45, 0.2], ['#3b7fc4', -0.3, -0.4, -0.16]];
    for (const [col, ox2, oz2, tilt] of others) { const p2 = K3D.mesh(K3D.geo('potPencil', () => new T.CylinderGeometry(0.15, 0.15, 3.2, 6).translate(0, 1.6, 0)), mat('potP|' + col, col), { ink: dk(col, 0.5) }); p2.position.set(ox2, 0.3, oz2); p2.rotation.z = tilt; p2.rotation.x = -tilt * 0.6; potG.add(p2); const tip = K3D.mesh(K3D.geo('potTip', () => new T.ConeGeometry(0.15, 0.4, 6).translate(0, 3.4, 0)), mat('cpWood', '#e2b47c'), { ink: '#6b4a24' }); tip.position.copy(p2.position); tip.rotation.copy(p2.rotation); potG.add(tip); }
    // a gold glow on the page by the pot: the pencil's mark
    const mark = new T.Mesh(K3D.geo('potMark', () => new T.RingGeometry(0.7, 1.0, 32).rotateX(-Math.PI / 2)), K3D.flat('#ffd77a', { transparent: true, opacity: 0.6, depthWrite: false })); mark.position.set(POT.mark[0], R3 + 0.02, POT.mark[1]); mark.userData.live = true; live.add(mark);
    const worm = P.bookworm({ len: 7 }); worm.position.set(POT.x + 2.2, R3, POT.z + 0.6); worm.rotation.y = Math.PI * 0.85; worm.scale.setScalar(1.5); K.add(worm); K.tick(() => worm.userData.tick(G.clock));
    // the ink bottle, tipped over at the start, and the ink spreading along the route
    const bottle = new T.Group(); bottle.position.set(I.bottle[0], 0, I.bottle[1]); pops.add(bottle);
    const glass = K3D.mesh(new T.CylinderGeometry(0.7, 0.8, 1.8, 20).rotateZ(Math.PI / 2).translate(0, 0.8, 0), mat('inkGlass', '#2a3a6a'), { ink: '#0a0a18', inkW: 1.1 }); bottle.add(glass);
    const neck = K3D.mesh(new T.CylinderGeometry(0.32, 0.32, 0.5, 14).rotateZ(Math.PI / 2).translate(1.1, 0.8, 0), mat('inkGlass', '#2a3a6a'), { ink: '#0a0a18', inkW: 0.9 }); bottle.add(neck);
    const labelT = K3D.paint('inkLabel', 256, 128, (c, w, h) => { P.paper(c, w, h, '#f6efdf', 431); c.fillStyle = INK; c.font = 'bold 50px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('INK', w / 2, h / 2); c.strokeStyle = INK; c.lineWidth = 5; c.strokeRect(6, 6, w - 12, h - 12); });
    const label = new T.Mesh(new T.CylinderGeometry(0.72, 0.82, 0.9, 20, 1, true).rotateZ(Math.PI / 2).translate(-0.1, 0.8, 0), K3D.mat('inkLabelM', () => K3D.toon('#ffffff', { map: labelT }))); bottle.add(label);
    bottle.rotation.y = -0.4;
    // the ink: a ribbon along the route up to the ink's front, with a wobbly edge and a round front
    const R = U.route(pg.route), N = Math.ceil(R.len / 0.4) + 1, pos = new Float32Array(N * 2 * 3), idx = [];
    const sw = new T.Vector3();
    for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const ig = new T.BufferGeometry(); ig.setAttribute('position', new T.BufferAttribute(pos, 3)); ig.setIndex(idx);
    const inkM = K3D.toon('#20203a', { polygonOffset: -2 }); inkM.transparent = false;
    const inkMesh = new T.Mesh(ig, inkM); inkMesh.userData.live = true; inkMesh.receiveShadow = true; live.add(inkMesh);
    const floorH = (x, z) => { let best = 0; for (const s of pg.solids) { if (s.ghost && !['stairs', 'ramp'].includes(s.id) && s.kind !== 'plank') continue; const lx = x - s.x, lz = z - s.z; if (Math.abs(lx) < s.w / 2 && Math.abs(lz) < s.d / 2 && !s.ramp) best = Math.max(best, s.y1); else if (s.ramp && Math.abs(lx) < s.w / 2 && Math.abs(lz) < s.d / 2) best = Math.max(best, s.y0 + s.ramp.h0 + (s.ramp.h1 - s.ramp.h0) * (lx / s.w + 0.5)); } return best; };
    for (let i = 0; i < N; i++) {
      const s = i * 0.4, q = R.at(s), wob = 1 + Math.sin(i * 1.7) * 0.08 + Math.sin(i * 0.53) * 0.1, wd = I.width * wob, nx = -q.tz, nz = q.tx;
      for (const k of [0, 1]) { const sd = k ? -1 : 1, x = q.x + nx * wd * sd, z = q.z + nz * wd * sd; pos.set([x, floorH(x, z) + 0.03, z], (i * 2 + k) * 3); }
    }
    void sw;
    ig.attributes.position.needsUpdate = true; ig.computeVertexNormals(); ig.setDrawRange(0, 0);
    const front = new T.Mesh(new T.CircleGeometry(1, 28).rotateX(-Math.PI / 2), inkM); front.userData.live = true; live.add(front);
    const glossM = K3D.flat('#8a8ab8', { transparent: true, opacity: 0.35, depthWrite: false });
    const gloss = new T.Mesh(new T.CircleGeometry(1, 20).rotateX(-Math.PI / 2), glossM); gloss.userData.live = true; live.add(gloss);
    // the finish: the pencil drops into the pot
    const art = { worm, pot: potG,
      update(st, dt) {
        for (const q of pops2) {
          const on = st.byId && st.byId[q.id] && !st.byId[q.id][0].ghost;
          if (on && q.t < 0) q.t = 0; if (!on) q.t = -1; if (q.t >= 0) q.t += dt;
          q.g.visible = q.t >= 0; q.g.scale.y = Math.max(0.01, springK(Math.min(1, q.t / 0.55)));
        }
        for (const q of plankArt) {
          const on = st.byId && st.byId[q.s.id] && !st.byId[q.s.id][0].ghost;
          if (on && q.t < 0) q.t = 0; if (!on) q.t = -1; if (q.t >= 0) q.t += dt;
          q.g.visible = q.t >= 0; q.g.scale.set(1, Math.max(0.01, springK(Math.min(1, q.t / 0.45))), 1); q.g.position.y = R1 + (1 - Math.min(1, q.t / 0.3)) * 0.5;
        }
        if (st.ink) {
          const s = Math.max(0, st.ink.s - I.from >= 0 ? st.ink.s : -1), n = Math.max(0, Math.min(N - 1, Math.floor(s / 0.4)));
          ig.setDrawRange(0, s > 0 ? n * 6 : 0);
          const q = R.at(Math.max(0, st.ink.s)), on = st.ink.s > 0;
          front.visible = gloss.visible = on; front.position.set(q.x, floorH(q.x, q.z) + 0.031, q.z); front.scale.setScalar(I.width * (1 + Math.sin(G.clock * 3) * 0.04));
          gloss.position.set(q.x - 0.6, floorH(q.x, q.z) + 0.04, q.z - 0.6); gloss.scale.setScalar(I.width * 0.25);
        }
        mark.material.opacity = 0.35 + Math.sin(G.clock * 3) * 0.25;
        worm.userData.cheer(st.fin >= 0 ? 1 : 0);
      },
    };
    return art;
  }

  const DRESS = [dress1, dress2, dress3, dress4];
  // just the scenery of a page into K (the look-proof page uses page 1); returns { art, flat, pops, live }
  function dressPage(K, k, o) {
    const flat = K.add(new T.Group()), pops = K.add(new T.Group()), live = K.add(new T.Group());
    surroundings(K, flat, PC.pages[k], k);
    const art = DRESS[k](K, flat, pops, live, o || {});
    K3D.bake(flat); K3D.bake(pops);
    return { art, flat, pops, live };
  }

  /* ---------- the level's scene ---------- */
  const S0 = () => MODES.popcarry.S;
  function build(K, st) {
    if (!st || !st.pg) return;
    const k = st.k, pg = st.pg;
    K.maxBlur = 8; K.focusRange = 4.5;
    const d = dressPage(K, k);
    const worm = k < 3 ? wormOnBook(K, d.flat) : null;
    // the dotted lines, from the rules' own dots
    const lines = st.lines.map(L => { const m = P.dotted(L.def.pts, { dots: L.dots, y: L.def.y || 0 }); m.userData.live = true; K.add(m); return m; });
    // bookmarks: one at each mark, beside the route
    const marks = st.marks.map((s, i) => { const q = st.R.at(s), side = pg.single ? 0 : 0.95, b = P.bookmark(q.x + q.tz * side, q.z - q.tx * side, Math.atan2(q.tx, q.tz) + Math.PI, ['#b8324a', '#3a7a4a', '#c9a24a'][i % 3]); b.position.y = MOVER3.floorAt(st.w, q.x, q.z, 40, 0); b.userData.live = true; K.add(b); return b; });
    // the pencil, its shadow, the heroes and their rings
    const pencil = P.pencil(); pencil.rotation.order = 'YZX'; K.add(pencil);
    const pBlob = K3D.blob(null, 0.5); pBlob.userData.r = 0; K.add(pBlob);
    const heroes = [0, 1].map(id => { const h = K3D.hero(id); K.add(h); K3D.seeThrough(h, PCOL[id]); K3D.dress(h, 'popbook'); return h; });
    K3D.seeThrough(pencil, '#f6c21c');
    const blobs = [0, 1].map(id => { const b = K3D.blob(PCOL[id]); K.add(b); return b; });
    const rig = K3D.cams.follow({ pitch: (pg.cam && pg.cam.pitch) || 50, heading: K3D.heading || 0, fov: 24, min: 14, max: 26 });
    const lips = guardLips(K, st);
    st.view = { K, d, worm, lines, marks, pencil, pBlob, heroes, blobs, rig, lips, t: 0, turn: null, dip: 0, finT: 0 };
    rig.snap();
    update(K, st, 0);
    rig.snap();
  }

  // the gold help's paper lips: a low gold-edged card fence round every ledge the heroes walk on (banks, bridges,
  // planks, rises, the tower ramp), folded flat and hidden until the rules turn st.guard on
  function guardLips(K, st) {
    const g = new T.Group(); g.visible = false; g.userData.live = true; K.add(g);
    const lipT = K3D.paint('guardLip', 256, 32, (c, w, h) => { c.fillStyle = '#fbf4e0'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2c14e'; c.fillRect(0, 0, w, 7); for (let x = 8; x < w; x += 24) { c.fillStyle = 'rgba(242,193,78,0.5)'; c.beginPath(); c.arc(x, h * 0.6, 3, 0, Math.PI * 2); c.fill(); } }, { repeat: true });
    const lm = K3D.mat('guardLipM', () => K3D.toon('#ffffff', { map: lipT, side: T.DoubleSide })), H = 0.22, items = [];
    for (const sd of st.solids) {
      if (!['bank', 'island', 'bridge', 'plank', 'rise', 'ramp', 'seesaw'].includes(sd.kind)) continue;
      const one = new T.Group(); g.add(one); items.push({ s: sd, g: one });
      if (sd.kind === 'ramp') {
        // both long edges of a ramp piece, on its slope
        const h0 = sd.y0 + sd.ramp.h0, h1 = sd.y0 + sd.ramp.h1, len = Math.hypot(sd.w, h1 - h0);
        for (const e of [-1, 1]) {
          const m = K3D.mesh(boxGeo(len, H, 0.05, 1), lm, { ink: INK, inkW: 0.6 });
          const q = new T.Group(); q.position.set(sd.x, (h0 + h1) / 2 + H / 2, sd.z); q.rotation.y = sd.rot || 0; q.translateZ(e * (sd.d / 2 - 0.03));
          m.rotation.z = Math.atan2(h1 - h0, sd.w); q.add(m); one.add(q);
        }
        continue;
      }
      if (sd.kind === 'seesaw') continue; // (tilts: drawn by the seesaw's own group, see dress2)
      const y = sd.y1 + H / 2;
      for (const [w, d, x, z] of [[sd.w, 0.05, 0, -sd.d / 2], [sd.w, 0.05, 0, sd.d / 2], [0.05, sd.d, -sd.w / 2, 0], [0.05, sd.d, sd.w / 2, 0]]) {
        const m = K3D.mesh(boxGeo(w, H, d, 1), lm, { ink: INK, inkW: 0.6 }); m.position.set(x, 0, z);
        const q = new T.Group(); q.position.set(sd.x, y, sd.z); q.rotation.y = sd.rot || 0; q.add(m); one.add(q);
      }
    }
    g.userData.items = items;
    return g;
  }

  const tmpA = new T.Vector3(), tmpB = new T.Vector3();
  function update(K, st, dt) {
    const v = st && st.view;
    if (!v || v.K !== K) return;
    const S = S0(), M = MODES.popcarry, ps = G.players, pg = st.pg;
    v.t += dt;
    // the page's pop-ups spring up when it opens, and fold flat as it turns
    const rise = springK(Math.min(1, v.t / 0.8));
    const turnF = st.turn >= 0 ? Math.min(1, st.turn / S.turnT) : 0;
    v.d.pops.scale.y = Math.max(0.02, rise * (1 - Math.min(1, turnF * 1.8)));
    v.d.live.scale.y = v.d.pops.scale.y;
    if (v.d.art.update) v.d.art.update(st, dt);
    if (v.worm) v.worm.visible = turnF < 0.3;
    // the gold help's paper lips spring up once
    if (st.guard) {
      v.lipT = (v.lipT || 0) + dt; v.lips.visible = turnF < 0.55;
      const ky = Math.max(0.02, springK(Math.min(1, v.lipT / 0.6)) * v.d.pops.scale.y);
      for (const it of v.lips.userData.items) { it.g.visible = !it.s.ghost; it.g.traverse(o => { if (o.isMesh) o.scale.y = ky; }); }
    }
    // dotted lines and bookmarks
    st.lines.forEach((L, i) => { const m = v.lines[i]; m.userData.set(L.n); m.visible = !L.done || (L.popT >= 0 && L.popT < 0.5); m.scale.y = v.d.pops.scale.y; });
    v.marks.forEach((b, i) => { b.userData.lit(st.lit[i] ? (i === st.mark ? 0.7 + Math.sin(G.clock * 3) * 0.3 : 0.35) : 0); b.scale.y = v.d.pops.scale.y; });
    // the pencil
    const E = M.ends(st.pen), pen = v.pencil;
    let ye = E[0].y, yp = E[1].y;
    v.dip += ((st.pen.dip ? 1 : 0) - v.dip) * Math.min(1, dt * 10);
    const L = st.lines.find(l => l.near && !l.done); if (L && v.dip > 0.01) yp = yp + ((L.def.y || 0) + 0.15 - yp) * v.dip;
    const len = 2 * S.half;
    pen.visible = !!st.pen.vis && turnF < 0.55;
    if (st.fin >= 0 && v.d.art.pot) {
      // the finish: up, over and down into the pot, point first
      v.finT += dt;
      const f = clamp(v.finT / 1.3, 0, 1), e = f * f * (3 - 2 * f), pot = v.d.art.pot.position;
      const sx = st.pen.x + (pot.x - st.pen.x) * e, sz = st.pen.z + (pot.z - st.pen.z) * e, sy = (ye + yp) / 2 + Math.sin(e * Math.PI) * 2.2 + (pot.y + 1.9 - (ye + yp) / 2) * e;
      pen.position.set(sx, sy, sz); pen.rotation.set(0, -st.pen.a, -e * Math.PI / 2);
    } else {
      pen.position.set(st.pen.x, (ye + yp) / 2, st.pen.z);
      let wob = 0; if (st.penLeaf) wob = Math.sin(G.clock * 9) * 0.25 * (1 - Math.min(1, st.penLeaf.t / 0.9));
      pen.rotation.set(wob, -st.pen.a, Math.atan2(yp - ye, len));
    }
    const fy = MOVER3.floorAt(st.w, st.pen.x, st.pen.z, Math.max(ye, yp) + 0.2, 0);
    K3D.placeBlob(v.pBlob, st.pen.x, fy > -5 ? fy : 0, st.pen.z, Math.max(0, (ye + yp) / 2 - (fy > -5 ? fy : 0)));
    v.pBlob.rotation.y = -st.pen.a; v.pBlob.scale.set(5.3, 1, 0.75); v.pBlob.visible = pen.visible && st.fin < 0;
    // the heroes: poses from the rules' bodies; hands on the pencil's ends
    pen.updateMatrixWorld(true);
    for (const k of [0, 1]) {
      const p = ps[k], b = p.b3, h = v.heroes[k];
      if (!b) continue;
      const e = st.hold[k];
      let hands = null;
      if (e >= 0 && pen.visible) {
        const end = pen.localToWorld(tmpA.set(e === 0 ? -len / 2 + 0.05 : len / 2 - 0.25, 0, 0)).clone();
        hands = [end.clone().add(tmpB.set(0, 0.04, 0.12)), end.clone().add(tmpB.set(0, 0.04, -0.12))];
      }
      const sp = Math.hypot(b.vx, b.vz) / (PHYS.maxRun / K3D.U);
      const mood = st.sit[k] > 0 ? 'sit' : b.teeter > 0 ? 'whoa' : null;
      K3D.heroPose(h, { x: b.x, y: b.y, z: b.z, heading: b.heading, speed: Math.min(1, sp), vy: b.vy, land: b.land, hands, mood }, dt);
      if (st.leaf[k]) { h.rotation.z = Math.sin(G.clock * 8 + k) * 0.25 * (1 - Math.min(1, st.leaf[k].t / S.leafT)); }
      else h.rotation.z = 0;
      // under the river or into the hole: gone from sight a moment after the splash
      h.visible = !(st.fallT[k] >= 0 && st.fallT[k] < S.flutT * 0.55) && turnF < 0.55;
      const gy = MOVER3.floorAt(st.w, b.x, b.z, b.y + 0.3, 0);
      K3D.placeBlob(v.blobs[k], b.x, gy > -5 ? gy : 0, b.z, Math.max(0, b.y - (gy > -5 ? gy : 0)));
      v.blobs[k].visible = h.visible && gy > -5;
      // name tags and bubbles land on the 3D characters
      const sc = K3D.toScreen(b.x, b.y + K3D.HERO.h + 0.25, b.z);
      p.x = sc.x - p.w / 2; p.y = sc.y;
    }
    // the camera: both players and the pencil's ends in frame, looking a little along the way; the tower turns it
    const tg = [];
    for (const k of [0, 1]) { const b = ps[k].b3; if (b && !(st.fallT[k] >= 0) && !st.leaf[k]) tg.push(V(b.x, b.y + 0.5, b.z)); }
    if (st.pen.vis) { tg.push(V(E[0].x, E[0].y, E[0].z)); tg.push(V(E[1].x, E[1].y, E[1].z)); }
    if (!tg.length) { const q = st.R.at(st.s); tg.push(V(q.x, 0.5, q.z)); }
    const q = st.R.at(st.s + 2);
    const rig = v.rig;
    rig.heading = K3D.heading || 0;
    if (st.camMode === 'tower') { rig.pitch = 34; rig.min = 15; rig.max = 22; rig.ahead.set(0, 0, 0); }
    else { rig.pitch = (pg.cam && pg.cam.pitch) || 50; rig.min = 14; rig.max = 26; rig.ahead.set(q.tx * 1.6, 0, q.tz * 1.6); }
    if (st.fin >= 0 && v.d.art.pot) { const pot = v.d.art.pot.position; tg.push(V(pot.x, pot.y + 1, pot.z)); }
    rig.update(K, dt, tg);
    // the page turn: the right page lifts and turns over to the left
    if (st.turn >= 0) {
      if (!v.turn) v.turn = P.pageTurn(K, { manual: true, keep: true, pw: PW, pd: PD });
      v.turn.set(turnF);
    }
  }

  K3D.popscene = { build, update, dressPage };
})();
