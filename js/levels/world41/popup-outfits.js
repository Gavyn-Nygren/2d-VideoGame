/* Pip & Bo - World 41 Pop-Up Storybook: the 3D outfit 'popbook' (cut and folded from paper, with visible folds and a
   white cut edge). Loaded on demand with the 3D kit. The matching 2D outfit (previews, world page, title run) is
   defined with defineOutfit('popbook') in the level's own file.
   Pip: a folded paper hat from a page of lined yellow notepaper, the sprout growing out of the top fold, and a green
   ribbon scarf like a bookmark. Bo: a gold card crown held with a brass paper fastener, between the ears, and a white
   paper ruff collar. Pip wears no blue (the ruling is grey with a pink margin line), Bo no orange or red.
*/
'use strict';

(function () {
  const T = K3D.T, P = POPUP;
  const BW = K3D.HERO.w, BD = K3D.HERO.d;
  // the body's cross-section (a superellipse) at a scale, for things that wrap round it
  const ringPt = (a, k) => { const c = Math.cos(a), s = Math.sin(a), q = 2 / 0.42; const f = v => Math.sign(v) * Math.pow(Math.abs(v), 2 / q); return [f(c) * BW / 2 * k, f(s) * BD / 2 * k]; };

  // Pip's folded notepaper hat: two triangles meeting in a ridge over the head, a folded-up brim band on each side
  K3D.definePart3('popPaperHat', (o, x) => {
    const g = new T.Group();
    const tex = K3D.paint('notepaper', 256, 256, (c, w, h) => {
      P.paper(c, w, h, '#f7e27a', 131);
      c.strokeStyle = 'rgba(120,120,110,0.45)'; c.lineWidth = 2;
      for (let y = 22; y < h; y += 22) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      c.strokeStyle = 'rgba(225,90,110,0.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(40, 0); c.lineTo(40, h); c.stroke();
      // the fold creases
      c.strokeStyle = 'rgba(150,110,20,0.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke();
    });
    const face = K3D.toon('#ffffff', { map: tex, side: T.DoubleSide });
    const edge = K3D.toon(P.EDGE);
    const hw = 0.47, hh = 0.44, lean = 0.32;
    for (const s of [-1, 1]) {
      const tri = P.shapeFrom([[-hw, 0], [hw, 0], [0.02, hh]]);
      const m = P.card(tri, { mat: face, depth: 0.018, ink: '#7a5a10', inkW: 0.8 });
      m.position.z = s * 0.11; m.rotation.x = -s * lean; g.add(m);
      // the brim: a band folded up along the bottom of each side
      const band = P.card(P.shapeFrom([[-hw - 0.02, 0], [hw + 0.02, 0], [hw - 0.05, 0.12], [-hw + 0.05, 0.12]]), { mat: K3D.toon('#efd368', { map: tex, side: T.DoubleSide }), depth: 0.02, ink: '#7a5a10', inkW: 0.8 });
      band.position.set(0, -0.01, s * 0.15); band.rotation.x = -s * (lean - 0.12); g.add(band);
    }
    void edge;
    g.position.set(0, -0.05, 0.0); g.rotation.z = -0.06;
    x.hero.userData.sproutLift = 0.36;
    return g;
  });
  // Pip's green ribbon scarf, like a bookmark: a band round the body and two forked tails
  K3D.definePart3('popRibbonScarf', (o, x) => {
    const g = new T.Group();
    const silk = K3D.paint('silkGreen', 64, 256, (c, w, h) => {
      c.fillStyle = '#3f9a5a'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < w; i += 2) { c.fillStyle = i % 4 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'; c.fillRect(i, 0, 1, h); }
      c.fillStyle = '#e8d06a'; c.fillRect(0, 0, 3, h); c.fillRect(w - 3, 0, 3, h);
    }, { repeat: true });
    const m = K3D.toon('#ffffff', { map: silk, side: T.DoubleSide });
    const pts = []; for (let i = 0; i < 40; i++) { const [px, pz] = ringPt(i / 40 * Math.PI * 2, 1.06); pts.push(new T.Vector3(px, 0, pz)); }
    const band = K3D.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 64, 0.038, 8, true), m, { ink: '#1f5a34', inkW: 0.8 });
    band.scale.set(1, 1.5, 1); g.add(band);
    // the knot and two tails at the front right
    const [kx, kz] = ringPt(Math.PI * 0.32, 1.1);
    const knot = K3D.mesh(new T.SphereGeometry(0.07, 12, 8), m, { ink: '#1f5a34', inkW: 0.8 }); knot.position.set(kx, 0, kz); knot.scale.set(1, 0.8, 0.7); g.add(knot);
    for (const [k, rot] of [[0, 0.25], [1, -0.15]]) {
      const tail = P.card(P.shapeFrom([[-0.05, 0], [0.05, 0], [0.05, -0.26], [0, -0.21], [-0.05, -0.26]]), { mat: m, depth: 0.012, ink: '#1f5a34', inkW: 0.7 });
      tail.position.set(kx + k * 0.05, -0.02, kz + 0.03); tail.rotation.set(0.3, Math.PI * 0.18, rot); g.add(tail);
    }
    g.position.y = 0.02;
    return g;
  }, { at: 'body' });
  K3D.PARTS3.popRibbonScarf.at = 'body';

  // Bo's gold card crown with a brass paper fastener at the front, sitting between the ears
  K3D.definePart3('popCardCrown', (o, x) => {
    const g = new T.Group();
    const gold = K3D.paint('goldCard', 256, 128, (c, w, h) => {
      const gg = c.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, '#f6d35a'); gg.addColorStop(1, '#d9a92a'); c.fillStyle = gg; c.fillRect(0, 0, w, h);
      const r = P.rng(141); for (let i = 0; i < 300; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,220,0.35)' : 'rgba(140,90,0,0.2)'; c.fillRect(r() * w, r() * h, 1 + r() * 2, 1); }
      c.fillStyle = 'rgba(140,90,0,0.4)'; for (let x2 = 12; x2 < w; x2 += 24) { c.beginPath(); c.arc(x2, h * 0.78, 4, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = 'rgba(120,80,0,0.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, h * 0.62); c.lineTo(w, h * 0.62); c.stroke();
    });
    // a strip with five points, bent round into a ring
    const N = 5, R = 0.17, H0 = 0.12, H1 = 0.24, seg = N * 8, pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, a = t * Math.PI * 2, ph = (t * N) % 1, top = H0 + (H1 - H0) * (1 - Math.abs(ph - 0.5) * 2);
      const cx = Math.sin(a) * R, cz = Math.cos(a) * R * 0.92;
      pos.push(cx, 0, cz, cx * 1.05, top, cz * 1.05); uv.push(t * 2, 0, t * 2, top / H1);
      if (i < seg) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const crown = K3D.mesh(geo, K3D.toon('#ffffff', { map: gold, side: T.DoubleSide }), { ink: '#6a4a08', inkW: 0.9 });
    g.add(crown);
    // the white cut edge along the points
    const f = P.fastener(0.04); f.position.set(0, 0.07, R * 0.92 + 0.012); g.add(f);
    // little card jewels on the points
    for (let i = 0; i < N; i++) {
      const a = (i + 0.5) / N * Math.PI * 2;
      const j = K3D.mesh(K3D.geo('crownJewel', () => new T.SphereGeometry(0.022, 10, 8)), K3D.mat('jewel' + (i % 2), () => K3D.toon(i % 2 ? '#3fb07a' : '#ffffff')), { ink: '#2b2130', inkW: 0.5, cast: false });
      j.position.set(Math.sin(a) * R * 1.07, H1 - 0.01, Math.cos(a) * R * 1.0); g.add(j);
    }
    g.position.set(0, -0.03, 0.06); g.rotation.set(-0.08, 0, 0.08);
    return g;
  });
  // Bo's white paper ruff collar: an accordion-pleated ring round the body
  K3D.definePart3('popRuff', (o, x) => {
    // one ring of even accordion pleats: each pleat is two faces, up and down, so the folds catch the light
    const N = 60, pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const a = i / N * Math.PI * 2, [ix, iz] = ringPt(a, 1.02), [ox, oz] = ringPt(a, 1.34), up = i % 2 ? 0.045 : -0.005;
      pos.push(ix, 0.02, iz, ox, up, oz);
      if (i < N) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
    const g2 = geo.toNonIndexed(); g2.computeVertexNormals(); // non-indexed: every pleat face keeps its own flat normal
    const ruff = K3D.mesh(g2, K3D.toon('#fbf8f0', { side: T.DoubleSide }), { ink: '#6a6478', inkW: 0.7 });
    const g = new T.Group(); g.add(ruff);
    // the white cut edge: a thin band at the outer rim, and a fastener holding it at the back
    const f = P.fastener(0.03); const [bx, bz] = ringPt(-Math.PI / 2, 1.04); f.position.set(bx, 0.03, bz); f.rotation.y = Math.PI; g.add(f);
    return g;
  });
  K3D.PARTS3.popRuff.at = 'body';

  K3D.defineOutfit3('popbook', {
    pip: [['popPaperHat', {}], ['popRibbonScarf', {}]],
    bo: [['popCardCrown', {}], ['popRuff', {}]],
  });
})();
