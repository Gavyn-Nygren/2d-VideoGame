/* Pip & Bo - 41-3 Paper Dragon Flight: stretch 4, the window. Drawing only (three.js through K3D.T, inside build()).
   Inside: the round window as two casement halves (the right one stuck a crack open on its latch), a deep sill where
   the cat sits, rain on the glass and a drip through the crack; the heavy red curtains on their brass rod with a gold
   tie-back; the old tasselled bell-pull cords hanging from the rafters across the climb; the two tissue-paper sheers
   that Pip's fire burns away. Outside: the house wall in wet clapboard round the window, the lower roof in slates, the
   turret with the weather vane (its cockerel swings in the gusts), the brick chimney with its smoke, a stormy sky,
   the sleeping town far below, rain streaks round the dragon, gust ribbons and lightning bolts.
   POPDRAGON_WINDOW.build(K, groups, mood) with groups { always, window, outside } (each { still, live }) adds them and
   returns { tick(st, t, dt) }. Places come from POPDRAGON_ROUTE (popdragon-stretches.js).
*/
'use strict';

const POPDRAGON_WINDOW = (function () {
  const A = {};
  A.build = function (K, groups, mood) {
    const T = K3D.T, K3 = K3D, P = POPUP, R = POPDRAGON_ROUTE, art = R.art, F = R.FLOOR, PI = Math.PI, WN = art.win;
    const rng = P.rng(8701);
    const AL = groups.always, WI = groups.window, OU = groups.outside;
    const ROOF = { z0: -44, y0: F + 236, z1: 200, y1: F + 61 }, roofY = z => ROOF.y0 + (z - ROOF.z0) * (ROOF.y1 - ROOF.y0) / (ROOF.z1 - ROOF.z0);
    const WALL_OUT = -47;   // the outside face of the back wall (the inside face is z -44)
    const softTex = mood.softTex;
    const v3 = (a) => new T.Vector3(a[0], a[1], a[2]);
    const faceRail = (obj, fr) => { const t = v3(fr.t), u = v3(fr.u), x = new T.Vector3().crossVectors(u, t).normalize(); obj.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, new T.Vector3().crossVectors(t, x), t)); };
    const rod = (a, b, r, mat, o = {}) => { const A0 = v3(a), B0 = v3(b), d = B0.clone().sub(A0), len = d.length(); const m = K3.mesh(new T.CylinderGeometry(r, o.r1 != null ? o.r1 : r, len, o.seg || 10).translate(0, len / 2, 0), mat, { ink: o.ink != null ? o.ink : '#2b2130', inkW: o.inkW || 0.7, cast: o.cast }); m.position.copy(A0); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); return m; };

    /* ================= the window itself (always drawn: it is seen from all over the room) ================= */
    const frameM = K3.mat('pdWinFrame', () => K3.toon('#d9d0bd'));
    const brass = K3.mat('pdBrass', () => K3.toon('#d0a44a', { emissive: '#3a2a08', emissiveIntensity: 0.25 }));
    // the reveal (the wall's thickness round the hole) and the frame ring, inside and out
    const reveal = new T.Mesh(new T.CylinderGeometry(WN.r + 0.2, WN.r + 0.2, -WALL_OUT + WN.z + 0.2, 72, 1, true).rotateX(PI / 2), K3.toon('#bfb3a0', { side: T.DoubleSide }));
    reveal.position.set(WN.x, WN.y, (WN.z + WALL_OUT) / 2); reveal.receiveShadow = true; AL.still.add(reveal);
    for (const [z, tube] of [[WN.z + 0.4, 1.6], [WALL_OUT - 0.3, 1.9]]) { const ring = K3.mesh(new T.TorusGeometry(WN.r + 0.6, tube, 12, 80), frameM, { ink: '#3a3028' }); ring.position.set(WN.x, WN.y, z); AL.still.add(ring); }
    // a keystone and four small stones round the outside of the ring
    { const stoneM = K3.mat('pdWStone', () => K3.toon('#b8ae9c'));
      for (let i = 0; i < 4; i++) { const a = PI / 2 + i * PI / 2, k = K3.mesh(K3.geo('pdWKey', () => new T.BoxGeometry(4.2, 5.6, 1.6)), stoneM, { ink: '#3a3028' }); k.position.set(WN.x + Math.cos(a) * (WN.r + 2.6), WN.y + Math.sin(a) * (WN.r + 2.6), WALL_OUT - 0.6); k.rotation.z = a - PI / 2; AL.still.add(k); } }
    // the two casement halves: a half disc each side of the crack (frame, glazing bars, glass with rain running down it)
    const gap = WN.gap, Rr = WN.r, yC = Math.sqrt(Rr * Rr - gap * gap);
    const halfShape = (inset) => {
      const r = Rr - inset, g = gap + inset, h = Math.sqrt(r * r - g * g), s = new T.Shape();
      s.moveTo(-g, -h); s.lineTo(-g, h); s.absarc(0, 0, r, Math.atan2(h, -g), Math.atan2(-h, -g) + PI * 2, false); s.closePath();
      return s;
    };
    const frameShape = halfShape(0); frameShape.holes.push((() => { const hs = halfShape(1.5), p = new T.Path(); p.setFromPoints(hs.getPoints(48).reverse()); return p; })());
    const paneFrameGeo = new T.ExtrudeGeometry(frameShape, { depth: 1.1, bevelEnabled: false, curveSegments: 48 }).translate(0, 0, -0.55);
    const glassGeo = new T.ShapeGeometry(halfShape(1.3), 48);
    { const uv = glassGeo.attributes.uv, pa = glassGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pa.getX(i) + Rr) / (2 * Rr), (pa.getY(i) + Rr) / (2 * Rr)); }
    const rainTex = mood.rainTex.clone(), rainOut = mood.rainTex.clone(); rainTex.needsUpdate = true; rainOut.needsUpdate = true; rainTex.repeat.set(3.2, 1.8); rainOut.repeat.set(4.2, 2.4);
    const glassM = K3.flat('#a8bede', { map: rainTex, transparent: true, opacity: 0.32, depthWrite: false, side: T.DoubleSide });
    const glassM2 = K3.flat('#c8d6f0', { map: rainOut, transparent: true, opacity: 0.32, depthWrite: false, side: T.DoubleSide, add: true });
    const panes = [];
    for (const sd of [-1, 1]) {
      // each half hangs on hinges at its outer edge; the right one stands open a little (outward), stuck on the latch
      const hinge = new T.Group(); hinge.position.set(WN.x + sd * Rr, WN.y, WN.z - 0.7); AL.live.add(hinge);
      const pane = new T.Group(); pane.position.x = -sd * Rr; pane.scale.x = -sd; hinge.add(pane);   // (built as the left half, mirrored for the right)
      hinge.rotation.y = sd > 0 ? -0.07 : 0;
      pane.add(K3.mesh(paneFrameGeo, frameM, { ink: '#3a3028', inkW: 0.8 }));
      for (const y of [0]) { const bar = K3.mesh(new T.BoxGeometry(Rr - gap - 1.2, 0.8, 0.7), frameM, { ink: '#3a3028', inkW: 0.6 }); bar.position.set(-(Rr + gap) / 2, y, 0); pane.add(bar); }
      { const bar = K3.mesh(new T.BoxGeometry(0.8, 2 * Math.sqrt(Rr * Rr - 144) - 2, 0.7), frameM, { ink: '#3a3028', inkW: 0.6 }); bar.position.set(-12, 0, 0); pane.add(bar); }
      const gl = new T.Mesh(glassGeo, glassM); gl.position.z = 0.05; gl.renderOrder = 3; pane.add(gl);
      const gl2 = new T.Mesh(glassGeo, glassM2); gl2.position.z = -0.1; gl2.renderOrder = 3; pane.add(gl2);
      // two hinges on the outer edge, a knob on the inner edge
      for (const y of [-14, 14]) { const hg = K3.mesh(K3.geo('pdWHinge', () => new T.CylinderGeometry(0.5, 0.5, 3.2, 10)), brass, { ink: '#3a2a10', inkW: 0.6 }); hg.position.set(-Math.sqrt(Rr * Rr - y * y) + 0.4, y, 0.7); pane.add(hg); }
      const knob = K3.mesh(K3.geo('pdWKnob', () => new T.SphereGeometry(0.7, 14, 10)), brass, { ink: '#3a2a10', inkW: 0.6 }); knob.position.set(-gap - 1.6, -6, 1.0); pane.add(knob);
      panes.push({ hinge, sd });
    }
    // the latch: a brass catch on the right half's edge with its hook stuck up on the stay (the page snagged on it)
    { const L = art.latch, g = new T.Group(); g.position.set(L[0], L[1], L[2] + 0.4); AL.still.add(g);
      g.add(K3.mesh(new T.BoxGeometry(1.3, 3.2, 0.4), brass, { ink: '#3a2a10', inkW: 0.6 }));
      const hook = K3.mesh(new T.TorusGeometry(0.9, 0.22, 8, 16, PI * 1.3), brass, { ink: '#3a2a10', inkW: 0.6 }); hook.position.set(0.6, 1.6, 0.5); hook.rotation.set(0, PI / 2, 0.4); g.add(hook);
      const stay = K3.mesh(new T.BoxGeometry(0.5, 0.5, 6), brass, { ink: '#3a2a10', inkW: 0.6 }); stay.position.set(1.8, -9, 3); stay.rotation.x = 0.1; g.add(stay);
      for (const z of [0.6, 2, 3.4, 4.8]) { const hole = new T.Mesh(K3.geo('pdWStayHole', () => new T.CylinderGeometry(0.15, 0.15, 0.6, 8).rotateZ(PI / 2)), K3.toon('#2b2130')); hole.position.set(1.8, -8.7, z); g.add(hole); } }
    // the deep sill under the window, where the cat ends up sitting (worn paint, a little puddle from the drip)
    const SILL = { x0: WN.x - 17, x1: WN.x + 17, y: WN.y - WN.r + 0.5, z0: WN.z, z1: WN.z + 8 };
    { const s = K3.mesh(K3.roundBox(SILL.x1 - SILL.x0, 1.6, SILL.z1 - SILL.z0, 0.3, 24).translate(0, -0.8, 0), frameM, { ink: '#3a3028' }); s.position.set(WN.x, SILL.y, (SILL.z0 + SILL.z1) / 2); AL.still.add(s);
      for (const sx of [-1, 1]) { const br = K3.mesh(new T.ExtrudeGeometry(P.shapeFrom([[0, 0], [5.5, 0], [0.5, -6.5], [0, -6.5]]), { depth: 1.2, bevelEnabled: false }).rotateY(-PI / 2).translate(0.6, 0, 0), frameM, { ink: '#3a3028', inkW: 0.7 }); br.position.set(WN.x + sx * 11, SILL.y - 1.6, WN.z + 0.2); AL.still.add(br); }
      const pud = new T.Mesh(new T.CircleGeometry(2.4, 24).rotateX(-PI / 2), K3.flat('#9ab4e0', { transparent: true, opacity: 0.35, depthWrite: false, add: true })); pud.scale.set(1.5, 1, 0.8); pud.position.set(WN.x + 0.6, SILL.y + 0.05, WN.z + 3.2); AL.live.add(pud); }
    // drips falling through the crack onto the sill
    const drips = [];
    for (let i = 0; i < 4; i++) { const d = new T.Mesh(K3.geo('pdWDrip', () => new T.SphereGeometry(0.22, 8, 6).scale(1, 1.8, 1)), K3.flat('#cfe0ff', { transparent: true, opacity: 0.8 })); AL.live.add(d); drips.push({ m: d, ph: i / 4 }); }

    /* ---------- the curtains: heavy red velvet on a brass rod, gathered open either side ---------- */
    const velvet = K3.paint('pdWVelvet', 512, 512, (c, w, h) => {
      const r = P.rng(8711);
      c.fillStyle = '#7a1e2c'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) { const x = r() * w; const g = c.createLinearGradient(x - 20, 0, x + 20, 0); g.addColorStop(0, 'rgba(255,120,130,0)'); g.addColorStop(0.5, 'rgba(255,140,150,0.12)'); g.addColorStop(1, 'rgba(255,120,130,0)'); c.fillStyle = g; c.fillRect(x - 20, 0, 40, h); }
      // a gold damask lily, repeated
      c.strokeStyle = 'rgba(230,180,90,0.55)'; c.fillStyle = 'rgba(230,180,90,0.32)'; c.lineWidth = 3;
      for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) {
        const x = gx * 128 + (gy % 2) * 64 + 64, y = gy * 128 + 64;
        c.save(); c.translate(x, y);
        for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(0, 30); c.bezierCurveTo(sx * 34, 10, sx * 26, -30, 0, -40); c.stroke(); c.beginPath(); c.moveTo(0, 8); c.quadraticCurveTo(sx * 18, -6, sx * 12, -22); c.quadraticCurveTo(sx * 4, -10, 0, 8); c.fill(); }
        c.beginPath(); c.arc(0, -44, 6, 0, PI * 2); c.fill(); c.beginPath(); c.moveTo(0, 30); c.lineTo(0, 46); c.stroke();
        c.restore();
      }
      for (let i = 0; i < 3000; i++) { c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,200,200,0.04)'; c.fillRect(r() * w, r() * h, 2, 3); }
    }, { repeat: true });
    const CU = art.curtain, rodY = CU.rod + 1, tieY = -2;
    const curtains = [];
    for (const [x0, x1, outer] of [[CU.x0, CU.x1, 1], [2 * WN.x - CU.x1, 2 * WN.x - CU.x0, -1]]) {
      const W = x1 - x0, H = rodY - F - 0.4, nx = 72, ny = 30, geo = new T.PlaneGeometry(W, H, nx, ny), pa = geo.attributes.position;
      const tex = velvet.clone(); tex.needsUpdate = true; tex.repeat.set(W / 30, H / 32);
      for (let i = 0; i < pa.count; i++) {
        const lx = pa.getX(i), ly = pa.getY(i), yw = ly + (rodY + F) / 2, f = (lx + W / 2) / W;
        // gathered toward the outer side at the tie-back (a waist), full above and below; pleats all the way down
        const waist = Math.exp(-Math.pow((yw - tieY) / 18, 2)), pinch = 0.42 * waist;
        const fo = outer > 0 ? f : 1 - f, fx = outer > 0 ? f * (1 - pinch) + pinch : f * (1 - pinch);
        const pleat = Math.sin(f * 11 * PI * 2) * (0.85 + 0.6 * waist) + Math.sin(f * 4.3 * PI + yw * 0.03) * 0.5;
        const hem = yw < F + 4 ? (F + 4 - yw) * 0.7 : 0;   // the hem pooling on the floor
        pa.setXYZ(i, -W / 2 + fx * W, ly, pleat + hem + (1 - fo) * waist * 1.6);
      }
      geo.computeVertexNormals();
      const m = K3.mesh(geo, K3.toon('#ffffff', { map: tex, side: T.DoubleSide }), { ink: false });
      m.position.set((x0 + x1) / 2, (rodY + F) / 2 + 0.2, CU.z); AL.still.add(m);
      // the gold rope tie-back round the waist, and its tassel
      const tx = outer > 0 ? x0 + W * (0.42 + 0.58 * 0.5) : x0 + W * 0.29;
      const tie = K3.mesh(new T.TorusGeometry(W * 0.3, 0.55, 8, 32), K3.mat('pdWGold', () => K3.toon('#d8a840')), { ink: '#4a3010', inkW: 0.7 }); tie.scale.set(1, 0.35, 0.5); tie.position.set(tx, tieY, CU.z + 0.6); AL.still.add(tie);
      const hook = K3.mesh(K3.geo('pdWTieHook', () => new T.SphereGeometry(0.9, 12, 8)), brass, { ink: '#3a2a10', inkW: 0.6 }); hook.position.set(outer > 0 ? x1 + 1.2 : x0 - 1.2, tieY, WN.z + 0.6); AL.still.add(hook);
      // brass rings along the top
      for (let x = x0 + 1; x <= x1 - 1; x += 2.6) { const rg = K3.mesh(K3.geo('pdWRing', () => new T.TorusGeometry(0.95, 0.2, 6, 16)), brass, { ink: false }); rg.position.set(x, rodY, CU.z); AL.still.add(rg); }
      curtains.push(m);
    }
    // the rod with its finials and brackets
    { const x0 = 2 * WN.x - CU.x1 - 6, x1 = CU.x1 + 6;
      AL.still.add(rod([x0, rodY, CU.z], [x1, rodY, CU.z], 0.75, brass, { ink: '#3a2a10', seg: 14 }));
      for (const [x, s] of [[x0, -1], [x1, 1]]) { const f = K3.mesh(new T.LatheGeometry([[0, 0], [1.4, 0.3], [1.6, 1.2], [1.0, 2.2], [0.5, 3.2], [0, 3.6]].map(p => new T.Vector2(p[0], p[1])), 18), brass, { ink: '#3a2a10', inkW: 0.6 }); f.rotation.z = -s * PI / 2; f.position.set(x, rodY, CU.z); AL.still.add(f); }
      for (const x of [x0 + 4, x1 - 4, WN.x]) { AL.still.add(rod([x, rodY, WN.z], [x, rodY, CU.z], 0.4, brass, { ink: '#3a2a10' })); const pl = K3.mesh(K3.geo('pdWBracket', () => new T.CylinderGeometry(1.1, 1.1, 0.4, 14).rotateX(PI / 2)), brass, { ink: '#3a2a10', inkW: 0.6 }); pl.position.set(x, rodY, WN.z + 0.2); AL.still.add(pl); } }

    /* ================= the climb (drawn near the window) ================= */
    // the bell-pull cords: twisted gold rope hanging from the rafters, a fat tassel at the end of each
    const ropeTex = K3.paint('pdWRope', 64, 128, (c, w, h) => { c.fillStyle = '#c8963a'; c.fillRect(0, 0, w, h); for (let i = -4; i < 12; i++) { c.fillStyle = i % 2 ? 'rgba(255,230,160,0.55)' : 'rgba(90,50,10,0.45)'; c.beginPath(); c.moveTo(0, i * 16); c.lineTo(w, i * 16 + 26); c.lineTo(w, i * 16 + 34); c.lineTo(0, i * 16 + 8); c.closePath(); c.fill(); } }, { repeat: true });
    const fringeTex = K3.paint('pdWFringe', 128, 64, (c, w, h) => { c.clearRect(0, 0, w, h); const r = P.rng(8721); for (let x = 0; x < w; x += 2.2) { c.strokeStyle = r() < 0.5 ? '#d8a43e' : '#a8742a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + (r() - 0.5) * 2, h * (0.86 + r() * 0.14)); c.stroke(); } }, { repeat: true });
    const tasselM = K3.mat('pdWGold', () => K3.toon('#d8a840'));
    for (const cd of art.cords) {
      const top = roofY(cd.z) - 3, len = top - cd.y0;
      const tx = ropeTex.clone(); tx.needsUpdate = true; tx.repeat.set(1, len / 2.2);
      const cord = K3.mesh(new T.CylinderGeometry(0.42, 0.42, len, 10).translate(0, len / 2, 0), K3.toon('#ffffff', { map: tx }), { ink: '#4a3010', inkW: 0.6 });
      cord.position.set(cd.x, cd.y0, cd.z); WI.still.add(cord);
      const head = K3.mesh(K3.geo('pdWTasHead', () => new T.SphereGeometry(1.05, 18, 12).scale(1, 1.25, 1)), tasselM, { ink: '#4a3010', inkW: 0.7 }); head.position.set(cd.x, cd.y0 - 0.5, cd.z); WI.still.add(head);
      const collar = K3.mesh(K3.geo('pdWTasCol', () => new T.TorusGeometry(0.95, 0.28, 8, 18).rotateX(PI / 2)), K3.mat('pdWRed', () => K3.toon('#9a2a34')), { ink: '#3a0a10', inkW: 0.6 }); collar.position.set(cd.x, cd.y0 - 1.5, cd.z); WI.still.add(collar);
      const fr = new T.Mesh(K3.geo('pdWTasFr', () => new T.CylinderGeometry(0.9, 1.9, 2.6, 28, 1, true).translate(0, -1.3, 0)), K3.mat('pdWFrM', () => K3.toon('#ffffff', { map: fringeTex, transparent: true, alphaTest: 0.4, side: T.DoubleSide }))); fr.position.set(cd.x, cd.y0 - 1.6, cd.z); WI.still.add(fr);
      const fr2 = new T.Mesh(K3.geo('pdWTasFr2', () => new T.CylinderGeometry(0.5, 1.4, 2.5, 22, 1, true).translate(0, -1.25, 0)), K3.mat('pdWFrM', () => K3.toon('#ffffff', { map: fringeTex, transparent: true, alphaTest: 0.4, side: T.DoubleSide }))); fr2.position.set(cd.x, cd.y0 - 1.6, cd.z); fr2.rotation.y = 0.7; WI.still.add(fr2);
    }
    // the tissue-paper sheers across the climb: crinkled see-through paper on two threads (fire burns them away)
    const tissueTex = K3.paint('pdWTissue', 256, 256, (c, w, h) => {
      const r = P.rng(8731); c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { c.strokeStyle = r() < 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.8)'; c.lineWidth = 0.8 + r() * 1.4; c.beginPath(); let x = r() * w, y = r() * h; c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; c.lineTo(x, y); } c.stroke(); }
      for (let i = 0; i < 18; i++) P.wash(c, r() * w, r() * h, 18 + r() * 30, '#e8e0e0', 0.25, r, { noEdge: true });
    });
    const threadM = K3.mat('pdWThread', () => K3.toon('#f2ece0'));
    const sheers = [];
    for (const w of R.webs.filter(q => q.kind === 'tissue')) {
      const fr = R.at(w.s), at = R.local(w.s, 0, w.oy || 0, fr), rr = w.r + 0.4;
      const geo = new T.RingGeometry(0.01, rr, 72, 10), pa = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < pa.count; i++) {
        const x = pa.getX(i), y = pa.getY(i), d = Math.hypot(x, y), a = Math.atan2(y, x), k = d / rr;
        const edge = 1 + (Math.sin(a * 9) * 0.05 + Math.sin(a * 23 + 1) * 0.03) * k;
        pa.setXYZ(i, x * edge, y * edge, (Math.sin(x * 1.3 + y * 0.7) * 0.25 + Math.sin(a * 6) * 0.35 * k) * k);
        uv.setXY(i, 0.5 + x / (2 * rr), 0.5 + y / (2 * rr));
      }
      geo.computeVertexNormals();
      const mat = K3.toon(w.col || '#f4a6b8', { map: tissueTex, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false, emissive: w.col || '#f4a6b8', emissiveIntensity: 0.3 });
      const m = new T.Mesh(geo, mat); m.position.set(...at); faceRail(m, fr); m.renderOrder = 4; WI.live.add(m);
      // two threads up to the rafters
      const threads = [];
      for (const sx of [-0.55, 0.55]) {
        const p0 = v3(R.local(w.s, sx * rr, (w.oy || 0) + rr * 0.86, fr)), top = [p0.x + sx * 6, roofY(p0.z) - 3, p0.z];
        const th = rod(p0.toArray(), top, 0.06, threadM, { ink: false, seg: 4, cast: false }); WI.live.add(th); threads.push(th);
      }
      sheers.push({ w, m, mat, threads, col: new T.Color(w.col || '#f4a6b8') });
    }

    /* ================= outside ================= */
    // the house wall: wet blue-grey clapboard with a hole for the window
    const clapTex = K3.paint('pdWClap', 256, 256, (c, w, h) => {
      const r = P.rng(8741);
      for (let i = 0; i < 4; i++) {
        const y = i * 64, g = c.createLinearGradient(0, y, 0, y + 64); g.addColorStop(0, '#5a6c82'); g.addColorStop(0.85, '#4a5a70'); g.addColorStop(1, '#2a3444'); c.fillStyle = g; c.fillRect(0, y, w, 64);
        c.fillStyle = 'rgba(10,14,24,0.7)'; c.fillRect(0, y + 60, w, 4);
        for (let k = 0; k < 14; k++) { c.strokeStyle = 'rgba(20,26,40,0.25)'; c.lineWidth = 1; const yy = y + 4 + r() * 54; c.beginPath(); c.moveTo(0, yy); c.lineTo(w, yy + (r() - 0.5) * 3); c.stroke(); }
      }
      // rain streaks running down it
      for (let k = 0; k < 40; k++) { c.strokeStyle = 'rgba(160,190,230,' + (0.06 + r() * 0.1).toFixed(2) + ')'; c.lineWidth = 1 + r() * 2; const x = r() * w; c.beginPath(); c.moveTo(x, r() * h); c.lineTo(x + (r() - 0.5) * 4, h); c.stroke(); }
    }, { repeat: true });
    {
      const x0 = -152, x1 = 374, y0 = -190, y1 = ROOF.y0 + 2, sh = new T.Shape();
      // (built facing +z, then turned to face out of the house, -z: local x is minus world x)
      sh.moveTo(-x1, y0); sh.lineTo(-x0, y0); sh.lineTo(-x0, y1); sh.lineTo(-x1, y1); sh.closePath();
      const hole = new T.Path(); hole.absarc(-WN.x, WN.y, WN.r + 0.2, 0, PI * 2, true); sh.holes.push(hole);
      const geo = new T.ShapeGeometry(sh, 72), uv = geo.attributes.uv, pa = geo.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, pa.getX(i) / 24, pa.getY(i) / 14);
      const wall = new T.Mesh(geo, K3.toon('#ffffff', { map: clapTex })); wall.rotation.y = PI; wall.position.z = WALL_OUT; wall.receiveShadow = true; OU.still.add(wall);
      // the side of the house round the corner, the corner boards, the eaves board along the top
      const side = new T.Mesh(new T.PlaneGeometry(250, y1 - y0), K3.toon('#ffffff', { map: (() => { const t = clapTex.clone(); t.needsUpdate = true; t.repeat.set(250 / 24, (y1 - y0) / 14); return t; })() }));
      side.rotation.y = PI / 2; side.position.set(x1, (y0 + y1) / 2, WALL_OUT + 125); OU.still.add(side);
      const trimM = K3.mat('pdWTrim', () => K3.toon('#e8e2d4'));
      const corner = K3.mesh(new T.BoxGeometry(3, y1 - y0, 3), trimM, { ink: '#2b2130' }); corner.position.set(x1 - 0.5, (y0 + y1) / 2, WALL_OUT - 0.5); OU.still.add(corner);
      const eave = K3.mesh(new T.BoxGeometry(x1 - x0 + 8, 4, 7), trimM, { ink: '#2b2130' }); eave.position.set((x0 + x1) / 2, y1 + 1, WALL_OUT - 2.5); OU.still.add(eave);
      // a gutter along the eave and a downpipe, spouting where it ends on the lower roof
      const zinc = K3.mat('pdWZinc', () => K3.toon('#7a8494'));
      OU.still.add(rod([x0, y1 - 1.5, WALL_OUT - 6.5], [x1, y1 - 1.5, WALL_OUT - 6.5], 1.3, zinc, { seg: 12 }));
      OU.still.add(rod([262, y1 - 1.5, WALL_OUT - 6.5], [262, y1 - 8, WALL_OUT - 2.2], 0.9, zinc, { seg: 10 }));
      OU.still.add(rod([262, y1 - 8, WALL_OUT - 2.2], [262, -12, WALL_OUT - 2.2], 0.9, zinc, { seg: 10 }));
      for (let y = 0; y < y1; y += 34) { const cl = K3.mesh(K3.geo('pdWClip', () => new T.BoxGeometry(2.6, 0.8, 1.2)), zinc, { ink: '#2b2130', inkW: 0.6 }); cl.position.set(262, y, WALL_OUT - 1.4); OU.still.add(cl); }
      // a second, dark little attic window further along (not ours), and one lit window lower down
      const darkWin = K3.mesh(new T.BoxGeometry(16, 20, 1), K3.mat('pdWDarkWin', () => K3.toon('#1a2232')), { ink: '#2b2130' }); darkWin.position.set(196, 40, WALL_OUT - 0.4); OU.still.add(darkWin);
      for (const sx of [-1, 1]) { const sh2 = K3.mesh(new T.BoxGeometry(7, 22, 0.8), K3.mat('pdWShutter', () => K3.toon('#2f4a3a')), { ink: '#10180f' }); sh2.position.set(196 + sx * 12, 40, WALL_OUT - 0.8); OU.still.add(sh2); }
    }
    // the lower roof: slates sloping down away from the wall
    const slateTex = K3.paint('pdWSlate', 256, 256, (c, w, h) => {
      const r = P.rng(8751); c.fillStyle = '#1e2430'; c.fillRect(0, 0, w, h);
      for (let row = 0; row < 8; row++) for (let k = -1; k < 9; k++) {
        const x = k * 32 + (row % 2) * 16, y = row * 32, col = mixHex('#34404f', '#4a5466', r());
        c.fillStyle = col; c.beginPath(); c.moveTo(x + 1, y); c.lineTo(x + 31, y); c.lineTo(x + 31, y + 26); c.quadraticCurveTo(x + 16, y + 33, x + 1, y + 26); c.closePath(); c.fill();
        c.fillStyle = 'rgba(170,200,240,' + (0.06 + r() * 0.12).toFixed(2) + ')'; c.fillRect(x + 3, y + 2, 26, 4);
      }
    }, { repeat: true });
    const RF = { x0: 170, x1: 420, zTop: WALL_OUT, yTop: -14, zLow: -200, yLow: -82 };
    {
      const run = RF.zTop - RF.zLow, drop = RF.yTop - RF.yLow, len = Math.hypot(run, drop), a = Math.atan2(drop, run);
      const tex = slateTex.clone(); tex.needsUpdate = true; tex.repeat.set((RF.x1 - RF.x0) / 14, len / 14);
      const roof = new T.Mesh(new T.PlaneGeometry(RF.x1 - RF.x0, len), K3.toon('#ffffff', { map: tex }));
      roof.rotation.x = -PI / 2 - a; roof.position.set((RF.x0 + RF.x1) / 2, (RF.yTop + RF.yLow) / 2, (RF.zTop + RF.zLow) / 2); roof.receiveShadow = true; OU.still.add(roof);
      const flash = K3.mesh(new T.BoxGeometry(RF.x1 - RF.x0, 1.2, 4), K3.mat('pdWLead', () => K3.toon('#5a6270')), { ink: '#2b2130' }); flash.position.set((RF.x0 + RF.x1) / 2, RF.yTop + 0.4, RF.zTop - 1.6); flash.rotation.x = a * 0.5; OU.still.add(flash);
    }
    const roofAt = (z) => RF.yTop - (RF.zTop - z) * (RF.yTop - RF.yLow) / (RF.zTop - RF.zLow);
    // the turret: white boards, a lit arched window, a pointed roof of fish-scale shingles, the weather vane on top
    const VA = art.vane;
    const scaleTex = K3.paint('pdWScale', 256, 256, (c, w, h) => {
      const r = P.rng(8761); c.fillStyle = '#18302c'; c.fillRect(0, 0, w, h);
      for (let row = 0; row < 10; row++) for (let k = -1; k < 11; k++) { const x = k * 26 + (row % 2) * 13, y = row * 26; c.fillStyle = mixHex('#2a5a4e', '#3e7466', r()); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 26, y); c.lineTo(x + 26, y + 12); c.arc(x + 13, y + 12, 13, 0, PI); c.closePath(); c.fill(); c.strokeStyle = 'rgba(10,20,18,0.6)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x + 13, y + 12, 13, 0, PI); c.stroke(); c.fillStyle = 'rgba(180,230,220,0.12)'; c.fillRect(x + 4, y + 2, 18, 3); }
    }, { repeat: true });
    {
      const g = new T.Group(); g.position.set(VA.x, 0, VA.z); OU.still.add(g);
      const base = roofAt(VA.z) - 6, H = 12 - base;
      const boardTex = (() => { const t = K3.paint('pdWTurretB', 256, 128, (c, w, h) => { c.fillStyle = '#c9c4b4'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { c.fillStyle = 'rgba(40,40,50,0.35)'; c.fillRect(x, 0, 2, h); } const r = P.rng(8763); for (let k = 0; k < 30; k++) { c.fillStyle = 'rgba(90,110,140,0.12)'; c.fillRect(r() * w, r() * h, 2, 30); } }, { repeat: true }).clone(); t.needsUpdate = true; t.repeat.set(4, H / 20); return t; })();
      g.add(K3.mesh(new T.CylinderGeometry(10, 10, H, 40).translate(0, base + H / 2, 0), K3.toon('#ffffff', { map: boardTex }), { ink: '#2b2130' }));
      g.add(K3.mesh(new T.TorusGeometry(10.4, 0.8, 8, 40).rotateX(PI / 2).translate(0, 11.4, 0), K3.mat('pdWTrim', () => K3.toon('#e8e2d4')), { ink: '#2b2130' }));
      const coneTex = scaleTex.clone(); coneTex.needsUpdate = true; coneTex.repeat.set(5, 3);
      g.add(K3.mesh(new T.ConeGeometry(12, 13.5, 40, 4).translate(0, 12 + 6.75, 0), K3.toon('#ffffff', { map: coneTex }), { ink: '#0e1c18' }));
      g.add(K3.mesh(new T.SphereGeometry(1.0, 14, 10).translate(0, 25.6, 0), K3.mat('pdWCopper', () => K3.toon('#c8803a')), { ink: '#3a1a08', inkW: 0.7 }));
      // the arched window, lit warm from inside (someone's still up with a book)
      for (const [a, lit] of [[PI * 0.62, true], [PI * 1.35, false]]) {
        const wg = new T.Group(); wg.position.set(Math.sin(a) * 10.05, base + H * 0.62, Math.cos(a) * 10.05); wg.rotation.y = a; g.add(wg);
        const sh = new T.Shape(); sh.moveTo(-2.4, -3.5); sh.lineTo(2.4, -3.5); sh.lineTo(2.4, 1.5); sh.absarc(0, 1.5, 2.4, 0, PI, false); sh.closePath();
        wg.add(new T.Mesh(new T.ShapeGeometry(sh, 16), K3.flat(lit ? '#ffc870' : '#1a2232')));
        wg.add(K3.mesh(new T.BoxGeometry(0.4, 7.6, 0.4).translate(0, -0.2, 0.15), K3.mat('pdWTrim', () => K3.toon('#e8e2d4')), { ink: false }));
        wg.add(K3.mesh(new T.BoxGeometry(5, 0.4, 0.4).translate(0, -0.2, 0.15), K3.mat('pdWTrim', () => K3.toon('#e8e2d4')), { ink: false }));
        if (lit) { const glow = new T.Sprite(new T.SpriteMaterial({ map: softTex, color: '#ffb860', transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.55 })); glow.scale.set(14, 14, 1); glow.position.z = 0.8; wg.add(glow); }
      }
    }
    // the vane: an iron pole, the N E S W arms, a copper ball, and the cockerel on its arrow (live: it swings)
    const iron = K3.mat('pdWIron', () => K3.toon('#2a2a30'));
    OU.still.add(rod([VA.x, 24.5, VA.z], [VA.x, VA.y1, VA.z], 0.4, iron, { ink: '#0a0a0e' }));
    OU.still.add(rod([VA.x - VA.armLen, VA.arms, VA.z], [VA.x + VA.armLen, VA.arms, VA.z], 0.25, iron, { ink: '#0a0a0e' }));
    OU.still.add(rod([VA.x, VA.arms, VA.z - VA.armLen], [VA.x, VA.arms, VA.z + VA.armLen], 0.25, iron, { ink: '#0a0a0e' }));
    { const letterTex = K3.paint('pdWLetters', 256, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#2a2a30'; c.font = 'bold 54px Georgia, "DejaVu Serif", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; ['N', 'E', 'S', 'W'].forEach((L, i) => c.fillText(L, i * 64 + 32, 34)); });
      [[0, -1, 0], [1, 0, 1], [0, 1, 2], [-1, 0, 3]].forEach(([dx, dz, i]) => {
        const g = new T.PlaneGeometry(2.2, 2.2), uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / 4);
        const m = new T.Mesh(g, K3.mat('pdWLetM', () => K3.toon('#ffffff', { map: letterTex, transparent: true, alphaTest: 0.5, side: T.DoubleSide })));
        m.position.set(VA.x + dx * (VA.armLen + 0.6), VA.arms + 0.2, VA.z + dz * (VA.armLen + 0.6)); m.rotation.y = Math.atan2(dx, dz); OU.still.add(m);
      }); }
    OU.still.add((() => { const b = K3.mesh(new T.SphereGeometry(0.8, 14, 10), K3.mat('pdWCopper', () => K3.toon('#c8803a')), { ink: '#3a1a08', inkW: 0.7 }); b.position.set(VA.x, VA.arms + 2.2, VA.z); return b; })());
    const cock = new T.Group(); cock.position.set(VA.x, VA.y1 - 1.6, VA.z); OU.live.add(cock);
    { const sh = P.shapeFrom([[-4.6, -0.3], [-1.2, -0.3], [-0.6, 0.4], [1.4, 0.4], [2.2, 1.6], [2.6, 2.9], [2.2, 3.4], [2.9, 3.6], [2.4, 3.9], [1.7, 3.7], [1.4, 2.6], [0.2, 2.0], [-1.0, 2.3], [-2.0, 3.6], [-2.6, 2.4], [-2.2, 1.4], [-2.8, 0.6], [-4.6, 0.4]]);
      const m = K3.mesh(new T.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: false }).translate(0, 0, -0.11), K3.mat('pdWCockM', () => K3.toon('#d89a3a', { emissive: '#3a2208', emissiveIntensity: 0.3 })), { ink: '#3a1a08', inkW: 0.8 });
      cock.add(m);
      cock.add(rod([-5.2, -0.6, 0], [4.6, -0.6, 0], 0.16, iron, { ink: false, seg: 6 }));
      const tip = K3.mesh(new T.ConeGeometry(0.6, 1.4, 4).rotateZ(-PI / 2), iron, { ink: false }); tip.position.set(5.2, -0.6, 0); cock.add(tip);
      const tail = K3.mesh(new T.BoxGeometry(0.1, 1.6, 1.4), iron, { ink: false }); tail.position.set(-5.2, -0.6, 0); cock.add(tail); }
    // the chimney: bricks, a stone cap, two clay pots, smoke torn by the wind
    const CH = art.chimney;
    const brickTex = K3.paint('pdWBrick', 256, 256, (c, w, h) => {
      const r = P.rng(8771); c.fillStyle = '#3a2a26'; c.fillRect(0, 0, w, h);
      for (let row = 0; row < 16; row++) for (let k = -1; k < 5; k++) { const x = k * 64 + (row % 2) * 32, y = row * 16; c.fillStyle = mixHex('#7a3a2a', '#9a5236', r()); c.fillRect(x + 2, y + 2, 60, 12); c.fillStyle = 'rgba(160,190,230,0.08)'; c.fillRect(x + 2, y + 2, 60, 3); }
    }, { repeat: true });
    {
      const g = new T.Group(); g.position.set(CH.x, 0, CH.z); g.rotation.y = CH.yaw; OU.still.add(g);
      const y0 = roofAt(CH.z) - 4, H = CH.y1 - y0, tex = brickTex.clone(); tex.needsUpdate = true; tex.repeat.set(1.2, H / 12);
      g.add(K3.mesh(new T.BoxGeometry(CH.h * 2, H, CH.h * 2).translate(0, y0 + H / 2, 0), K3.toon('#ffffff', { map: tex }), { ink: '#1a0e0a' }));
      g.add(K3.mesh(new T.BoxGeometry(CH.h * 2 + 1.8, 1.6, CH.h * 2 + 1.8).translate(0, CH.y1 + 0.6, 0), K3.mat('pdWStone', () => K3.toon('#b8ae9c')), { ink: '#2b2130' }));
      for (const px of [-2.1, 2.1]) g.add(K3.mesh(K3.geo('pdWPot', () => new T.LatheGeometry([[0, 0], [1.6, 0], [1.3, 1], [1.1, 3.4], [1.5, 3.8], [1.4, 4.2], [0.9, 4.2], [0.9, 1]].map(p => new T.Vector2(p[0], p[1])), 16)), K3.mat('pdWClay', () => K3.toon('#b0603a')), { ink: '#3a1a0a', inkW: 0.7 }).translateX(px).translateY(CH.y1 + 1.4));
      const flash2 = K3.mesh(new T.BoxGeometry(CH.h * 2 + 1.2, 1.4, CH.h * 2 + 1.2).translate(0, y0 + 4.5, 0), K3.mat('pdWLead', () => K3.toon('#5a6270')), { ink: '#2b2130' }); g.add(flash2);
    }
    const smoke = [];
    for (let i = 0; i < 18; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: softTex, color: '#8a90a0', transparent: true, depthWrite: false, opacity: 0 })); OU.live.add(sp); smoke.push({ sp, ph: i / 18, pot: i % 2 }); }
    const potAt = [-2.1, 2.1].map(px => [CH.x + Math.cos(CH.yaw) * px, CH.y1 + 5.8, CH.z - Math.sin(CH.yaw) * px]);

    // the sky: a storm over the town (always drawn: it is what the window shows from inside)
    const skyTex = K3.paint('pdWSky', 1024, 512, (c, w, h) => {
      const r = P.rng(8781);
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#05070e'); g.addColorStop(0.32, '#121a2e'); g.addColorStop(0.5, '#2c3a58'); g.addColorStop(0.56, '#1c2438'); g.addColorStop(1, '#07090e');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      // the moon low in the -z sky (u about 0.75), mostly behind cloud
      const mx = w * 0.75, my = h * 0.33, mg = c.createRadialGradient(mx, my, 4, mx, my, 120); mg.addColorStop(0, 'rgba(235,240,255,0.95)'); mg.addColorStop(0.12, 'rgba(210,220,250,0.6)'); mg.addColorStop(1, 'rgba(150,170,220,0)'); c.fillStyle = mg; c.fillRect(0, 0, w, h);
      // heavy cloud banks with lighter edges where the moon catches them (drawn twice across the seam)
      for (let i = 0; i < 150; i++) {
        const x = r() * w, y = h * (0.14 + r() * 0.4), rad = 30 + r() * 90, lit = Math.max(0, 1 - Math.hypot(x - mx, y - my) / 300);
        for (const ox of [0, -w, w]) { if (x + ox < -rad || x + ox > w + rad) continue; P.wash(c, x + ox, y, rad, lit > 0.2 && r() < 0.6 ? '#6a7898' : r() < 0.5 ? '#1a2034' : '#283250', 0.35 + lit * 0.3, r, { noEdge: true, sy: 0.45 }); }
      }
      for (let i = 0; i < 30; i++) { const x = r() * w, y = h * (0.05 + r() * 0.2); c.fillStyle = 'rgba(220,230,255,0.25)'; c.fillRect(x, y, 1.5, 1.5); }
    });
    const sky = new T.Mesh(new T.SphereGeometry(560, 48, 24), new T.MeshBasicMaterial({ map: skyTex, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false }));
    sky.position.set(WN.x, 0, -60); sky.renderOrder = -10; AL.live.add(sky);
    // the town far below: roofs, a church spire, lit windows, street lamps in the rain
    const townTex = K3.paint('pdWTown', 2048, 256, (c, w, h) => {
      const r = P.rng(8791); c.clearRect(0, 0, w, h);
      const lamp = (x, y) => { const g = c.createRadialGradient(x, y, 0, x, y, 14); g.addColorStop(0, 'rgba(255,210,140,0.9)'); g.addColorStop(1, 'rgba(255,190,110,0)'); c.fillStyle = g; c.fillRect(x - 14, y - 14, 28, 28); };
      for (let layer = 0; layer < 2; layer++) {
        let x = 0; const base = layer ? 150 : 120, col = layer ? '#0c1018' : '#161c2a';
        while (x < w) {
          const bw = 30 + r() * 70, bh = 30 + r() * 70 - layer * 20, top = base - bh, peak = r() < 0.7;
          c.fillStyle = col; c.beginPath(); c.moveTo(x, h); c.lineTo(x, top); if (peak) c.lineTo(x + bw / 2, top - bw * 0.4); c.lineTo(x + bw, top); c.lineTo(x + bw, h); c.closePath(); c.fill();
          if (r() < 0.5) c.fillRect(x + bw * 0.7, top - bw * 0.4 - 10, 6, 22);
          if (x > w * 0.42 && x < w * 0.42 + 100 && !layer) { c.beginPath(); c.moveTo(x + 10, top); c.lineTo(x + 30, top - 140); c.lineTo(x + 50, top); c.fill(); }
          for (let k = 0; k < bw * bh / 500; k++) if (r() < 0.45) { c.fillStyle = r() < 0.75 ? 'rgba(255,200,110,0.85)' : 'rgba(190,210,255,0.6)'; c.fillRect(x + 4 + r() * (bw - 10), top + 6 + r() * (h - top - 14), 4, 5); }
          x += bw + r() * 6;
        }
      }
      for (let i = 0; i < 40; i++) lamp(r() * w, 200 + r() * 50);
    }, { repeat: true });
    townTex.repeat.set(2, 1);
    const town = new T.Mesh(new T.CylinderGeometry(520, 520, 240, 96, 1, true), new T.MeshBasicMaterial({ map: townTex, transparent: true, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false }));
    town.position.set(WN.x, -170, -60); town.renderOrder = -9; AL.live.add(town);
    // lightning bolts in the sky (two, one shown in each flash)
    const boltTex = K3.paint('pdWBolt', 128, 512, (c, w, h) => {
      c.clearRect(0, 0, w, h); const r = P.rng(8801);
      const path = (x, y, len, wdt, depth) => { let px = x, py = y; c.lineWidth = wdt; c.strokeStyle = 'rgba(235,240,255,0.95)'; c.shadowColor = 'rgba(160,190,255,1)'; c.shadowBlur = 16; c.beginPath(); c.moveTo(px, py); for (let i = 0; i < 12; i++) { px += (r() - 0.5) * 34; py += len / 12; c.lineTo(px, py); if (depth < 2 && r() < 0.22) { c.stroke(); path(px, py, len * 0.4, wdt * 0.55, depth + 1); c.beginPath(); c.moveTo(px, py); c.lineWidth = wdt; c.strokeStyle = 'rgba(235,240,255,0.95)'; } } c.stroke(); };
      path(w / 2, 0, h * 0.95, 5, 0);
    });
    const bolts = [[-140, 120, -470, 1], [180, 110, -430, -1]].map(([dx, y, z, s]) => { const m = new T.Mesh(new T.PlaneGeometry(90, 360), new T.MeshBasicMaterial({ map: boltTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, toneMapped: false, opacity: 0 })); m.position.set(WN.x + dx, y - 120, z); m.scale.x = s; m.renderOrder = -8; AL.live.add(m); return m; });

    // rain round the dragon (outside only): streaks falling at a slant, pushed sideways in the gusts
    const NR = 1400, rainPos = new Float32Array(NR * 6), rainBase = new Float32Array(NR * 3);
    for (let i = 0; i < NR; i++) { rainBase[i * 3] = (rng() - 0.5) * 100; rainBase[i * 3 + 1] = (rng() - 0.5) * 70; rainBase[i * 3 + 2] = (rng() - 0.5) * 100; }
    const rainGeo = new T.BufferGeometry(); rainGeo.setAttribute('position', new T.BufferAttribute(rainPos, 3));
    const rainLines = new T.LineSegments(rainGeo, new T.LineBasicMaterial({ color: '#9ab4dc', transparent: true, opacity: 0.55, depthWrite: false }));
    rainLines.frustumCulled = false; OU.live.add(rainLines);
    // gust ribbons: pale curls of wind blowing across the way
    const gustM = K3.flat('#dfe8ff', { transparent: true, opacity: 0, depthWrite: false, add: true, side: T.DoubleSide });
    const gusts = (R.gusts || []).map((g, gi) => {
      const grp = new T.Group(), fr = R.at(g.s); grp.position.set(...R.local(g.s, 0, 0, fr)); faceRail(grp, fr); OU.live.add(grp);
      const ribbons = [];
      for (let k = 0; k < 6; k++) {
        const y = -3 + (k % 3) * 2.6 + (rng() - 0.5), z = (k - 2.5) * 3.2, pts = [];
        for (let i = 0; i <= 16; i++) { const f = i / 16; pts.push(new T.Vector3((f - 0.5) * 12, y + Math.sin(f * PI * 2 + k) * 0.6 + (f > 0.8 ? (f - 0.8) * 8 : 0), z + Math.sin(f * PI * 3 + k) * 0.5)); }
        const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 32, 0.07, 4, false), gustM); grp.add(m); ribbons.push({ m, ph: rng() });
      }
      return { g, grp, ribbons, dir: Math.sign(g.dx) || 1 };
    });

    /* ---------- every drawn frame ---------- */
    const camP = new T.Vector3();
    return {
      tick(st, t, dt) {
        const fl = mood.fl || 0, s = st.s || 0;
        // rain runs down the glass (faster on the outside); the open half creaks a hair in the wind
        rainOut.offset.y = (rainOut.offset.y + dt * 0.24) % 1; rainOut.offset.x = Math.sin(t * 0.4) * 0.03;
        panes[1].hinge.rotation.y = -0.07 - Math.sin(t * 1.3) * 0.006 - (R.gustAt && R.gustAt(s) ? 0.01 : 0);
        rainTex.offset.y = (rainTex.offset.y + dt * 0.11) % 1;
        glassM.opacity = 0.32 + fl * 0.3;
        // drips
        for (const d of drips) { const u = ((t * 0.55 + d.ph) % 1); d.m.position.set(WN.x + 0.4 + d.ph, WN.y - 6 - u * (WN.y - 6 - SILL.y), WN.z + 0.3 + u * 2); d.m.visible = u < 0.96; }
        // the sheers: whole, or burning away (they brown, shrink to the threads and drop)
        for (const sh of sheers) {
          const bt = st.burnt && st.burnt[sh.w.burn];
          if (bt != null) {
            const u = clamp(((st.clock || 0) - bt) / 0.7, 0, 1);
            sh.m.scale.setScalar(Math.max(0.001, 1 - u * u)); sh.mat.color.copy(sh.col).lerp(new T.Color('#5a3a20'), u); sh.mat.opacity = 0.8 * (1 - u * 0.6);
            sh.m.visible = u < 1; sh.threads.forEach(m => { m.visible = u < 0.6; });
          } else { sh.m.scale.setScalar(1); sh.m.visible = true; sh.mat.color.copy(sh.col); sh.mat.opacity = 0.8; sh.threads.forEach(m => { m.visible = true; }); sh.m.rotation.z = Math.sin(t * 0.9 + sh.w.s) * 0.03; }
        }
        // the sky and the bolts light up in a flash
        sky.material.color.setScalar(1 + fl * 1.6); town.material.color.setScalar(1 + fl * 0.6);
        const pick = Math.floor((mood.flashT || 0) * 7.3) % 2;
        bolts.forEach((b, i) => { b.material.opacity = i === pick ? clamp(fl * 1.6 - 0.2, 0, 1) : 0; });
        if (!OU.live.visible) return;
        // the cockerel swings with the wind, hard in a gust
        const gu = R.gustAt ? R.gustAt(s) : null;
        cock.rotation.y = 0.6 + Math.sin(t * 0.7) * 0.25 + Math.sin(t * 2.3) * 0.08 + (gu ? Math.sign(gu.dx) * 0.8 + Math.sin(t * 9) * 0.15 : 0);
        // smoke off the pots, torn sideways
        for (const sm of smoke) {
          const u = (t * 0.22 + sm.ph) % 1, p = potAt[sm.pot];
          sm.sp.position.set(p[0] - u * 26 + Math.sin(t + sm.ph * 9) * 1.2, p[1] + u * 10 + Math.sin(u * 5) * 1.5, p[2] - u * 6);
          const k = 2 + u * 9; sm.sp.scale.set(k, k, 1); sm.sp.material.opacity = 0.42 * Math.sin(u * PI) * (1 - u * 0.4);
        }
        // the rain: a box of streaks that travels with the dragon (none inside the house)
        camP.set(...R.local(s, st.ox || 0, st.oy || 0));
        const wind = (gu ? gu.dx * 4 : 0) + 6, fall = 72, len = 0.05;
        for (let i = 0; i < NR; i++) {
          const i3 = i * 3;
          let x = rainBase[i3] + wind * t, y = rainBase[i3 + 1] - fall * t, z = rainBase[i3 + 2];
          x = ((x - camP.x + 50) % 100 + 100) % 100 - 50 + camP.x; y = ((y - camP.y + 35) % 70 + 70) % 70 - 35 + camP.y; z = ((z - camP.z + 50) % 100 + 100) % 100 - 50 + camP.z;
          const o = i * 6;
          if (z > WALL_OUT - 0.5) { rainPos[o] = rainPos[o + 3] = x; rainPos[o + 1] = rainPos[o + 4] = y; rainPos[o + 2] = rainPos[o + 5] = z; continue; }
          rainPos[o] = x; rainPos[o + 1] = y; rainPos[o + 2] = z; rainPos[o + 3] = x - wind * len; rainPos[o + 4] = y + fall * len; rainPos[o + 5] = z;
        }
        rainGeo.attributes.position.needsUpdate = true;
        rainLines.material.opacity = 0.5 + fl * 0.4;
        // gust ribbons sweep across while the dragon is near
        for (const G2 of gusts) {
          const near = clamp(1 - (Math.abs(s - G2.g.s) - G2.g.w) / 16, 0, 1);
          G2.grp.visible = near > 0;
          if (!near) continue;
          for (const rb of G2.ribbons) { const u = (t * 0.9 + rb.ph) % 1; rb.m.position.x = G2.dir * (u - 0.5) * 18; rb.m.scale.x = 0.6 + Math.sin(u * PI) * 0.6; }
          gustM.opacity = 0.32 * near * (0.7 + 0.3 * Math.sin(t * 5));
        }
      },
    };
  };
  return A;
})();
