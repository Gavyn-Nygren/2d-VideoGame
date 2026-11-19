/* Pip & Bo - 42-3 Spook Manor: the 3D outfit 'parkmanor' (gift-shop costumes). Loaded on demand with the 3D kit. The
   matching 2D outfit (previews, world page, title run) is defineOutfit('parkmanor') in spook-manor.js.
   Pip: glow-in-the-dark skeleton pyjamas, black with pale green printed bones that glow outside the light (their own
   light: an emissive map, bright enough to bloom a little), and a long purple-and-white striped nightcap with a pom-pom
   that flops over one side, the sprout poking out beside it.
   Bo: a little vampire cape (black outside, purple lining) with a high stand-up collar, plastic fangs, and a headband of
   two small bat wings between the ears (the wings twitch).
   Pip wears no blue, Bo no orange or red. The lantern and the key are the level's props (parkmanor-figures.js). */
'use strict';

(function () {
  const T = K3D.T;
  const BW = K3D.HERO.w, BH = K3D.HERO.h, BD = K3D.HERO.d;
  const INK = '#1a1530';
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const mk = (geo, mat, o) => K3D.mesh(geo, mat, o);
  const def3 = (n, fn, o) => K3D.definePart3(n, Object.assign({ build: fn }, o || {}));

  // the bones, printed round the lower body (u 0.25 is the front, 0.75 the back; v 1 is the top)
  const boneTex = (glow) => K3D.paint('pm-bones' + (glow ? 'G' : ''), 512, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const top = h * 0.46;
    if (!glow) { c.fillStyle = '#1b1822'; c.fillRect(0, top, w, h - top); c.fillStyle = '#26222e'; for (let x = 0; x < w; x += 14) c.fillRect(x, top, 6, h - top); }
    else { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); }
    const bone = glow ? '#b8ffb0' : '#d6f2cc';
    c.strokeStyle = bone; c.fillStyle = bone; c.lineCap = 'round'; c.lineWidth = 7;
    const fx = w * 0.25, bx = w * 0.75;
    // front: a ribcage and a sternum
    c.beginPath(); c.moveTo(fx, top + 10); c.lineTo(fx, top + 70); c.stroke();
    for (let i = 0; i < 4; i++) { const y = top + 16 + i * 16; c.beginPath(); c.moveTo(fx - 6, y); c.quadraticCurveTo(fx - 50, y - 6, fx - 70, y + 14); c.moveTo(fx + 6, y); c.quadraticCurveTo(fx + 50, y - 6, fx + 70, y + 14); c.stroke(); }
    // the hips
    c.lineWidth = 6; c.beginPath(); c.ellipse(fx, top + 96, 34, 12, 0, 0, Math.PI * 2); c.stroke();
    // back: a spine of little knobs
    for (let i = 0; i < 8; i++) { c.beginPath(); c.ellipse(bx, top + 10 + i * 13, 9, 5, 0, 0, Math.PI * 2); c.fill(); }
    // the arms' bones down each side
    c.lineWidth = 5; for (const sx of [0, 0.5]) { c.beginPath(); c.moveTo(w * sx, top + 12); c.lineTo(w * sx, top + 80); c.stroke(); c.beginPath(); c.arc(w * sx, top + 84, 6, 0, Math.PI * 2); c.fill(); }
    // a waistband
    if (!glow) { c.fillStyle = '#3a3444'; c.fillRect(0, h - 22, w, 6); c.fillRect(0, top, w, 5); }
  });
  def3('pmPyjamas', () => {
    const g = new T.Group();
    const geo = K3D.roundBox(BW * 1.035, BH * 1.01, BD * 1.05, 0.6, 40);
    const m = K3D.toon('#ffffff', { map: boneTex(false), alphaTest: 0.5 });
    m.emissiveMap = boneTex(true); m.emissive = hot('#9dff8a', 1.25); m.emissiveIntensity = 1;
    const pj = mk(geo, m, { ink: false }); pj.position.y = -BH * 0.17 - 0.004; g.add(pj);
    // a collar line where the pyjamas end (round the middle)
    const band = mk(new T.TorusGeometry(BW * 0.52, 0.025, 6, 32).rotateX(Math.PI / 2).scale(1, 1, BD / BW * 1.02), K3D.toon('#2a2632'), { ink: INK, inkW: 0.5 });
    band.position.y = BH * 0.46 - BH * 0.17; g.add(band);
    // pyjama buttons (pale, glowing a touch)
    for (let i = 0; i < 2; i++) { const b = new T.Mesh(new T.SphereGeometry(0.022, 8, 6), K3D.flat(hot('#d6ffd0', 1.3))); b.position.set(0.11, BH * 0.36 - BH * 0.17 - i * 0.11, BD * 0.53); g.add(b); }
    return g;
  }, { at: 'body' });
  // the long nightcap: a bent cone in purple and white stripes, flopping to Pip's left, a pom-pom at its tip
  def3('pmNightcap', (o, x) => {
    const g = new T.Group();
    const tex = K3D.paint('pm-capStripes', 64, 256, (c, w, h) => { for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#f4f0fa' : '#8a4fd0'; c.fillRect(0, i * h / 10, w, h / 10); } });
    const mat = K3D.toon('#ffffff', { map: tex });
    // a cone bent along a curve: rings of a tube that narrow toward the tip
    const pts = [], n = 10;
    for (let i = 0; i <= n; i++) { const u = i / n; pts.push(new T.Vector3(-0.07 - u * u * 0.42, u * 0.42 - u * u * 0.3, -0.04 - u * 0.05)); }
    const curve = new T.CatmullRomCurve3(pts);
    const geo = new T.TubeGeometry(curve, 24, 1, 12, false);
    const pos = geo.attributes.position, tmp = new T.Vector3();
    for (let i = 0; i < pos.count; i++) {
      // narrow each ring by how far along the curve it is (tube rings go in order: 13 points a ring)
      const ring = Math.floor(i / 13), u = ring / 24, c = curve.getPoint(u);
      tmp.fromBufferAttribute(pos, i).sub(c).multiplyScalar(1); const r = 0.19 * (1 - u * 0.86);
      tmp.normalize().multiplyScalar(r).add(c); pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
    }
    geo.computeVertexNormals();
    const cap = mk(geo, mat, { ink: INK, inkW: 0.8 }); g.add(cap);
    const cuff = mk(new T.TorusGeometry(0.19, 0.045, 8, 28).rotateX(Math.PI / 2), K3D.toon('#f4f0fa'), { ink: INK, inkW: 0.7 }); cuff.position.set(-0.07, 0.0, -0.04); g.add(cuff);
    const tip = curve.getPoint(1);
    const pom = mk(new T.IcosahedronGeometry(0.075, 1), K3D.toon('#ffffff'), { ink: INK, inkW: 0.7 }); pom.position.copy(tip).add(new T.Vector3(-0.02, -0.05, 0)); g.add(pom);
    g.position.set(0, -0.06, 0.02);
    g.userData.flop = cap;
    x.hero.userData.sproutLift = 0; x.hero.userData.sproutX = 0.22;
    return g;
  }, { at: 'head' });

  // Bo's cape: a curved panel down the back, black outside, purple lining inside, flaring at the bottom
  def3('pmCape', () => {
    const g = new T.Group();
    const geo = new T.CylinderGeometry(BW * 0.56, BW * 0.78, BH * 0.78, 20, 4, true, Math.PI * 0.62, Math.PI * 0.76);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < 0) pos.setX(i, pos.getX(i) * (1 + Math.sin(i * 1.7) * 0.04)); }
    geo.computeVertexNormals();
    const out = mk(geo, K3D.toon('#24202e', { side: T.FrontSide }), { ink: INK, inkW: 0.9 });
    const lin = new T.Mesh(geo, K3D.toon('#7a3fc0', { side: T.BackSide }));
    const cape = new T.Group(); cape.add(out); cape.add(lin);
    cape.position.set(0, BH * 0.36 - BH * 0.5, 0.02); g.add(cape);
    g.userData.cape = cape;
    return g;
  }, { at: 'back' });
  // the high stand-up collar (two purple-lined wings either side of the head) with a gold clasp
  def3('pmCollar', () => {
    const g = new T.Group();
    const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(0.3, 0.02); sh.quadraticCurveTo(0.34, 0.2, 0.26, 0.36); sh.quadraticCurveTo(0.12, 0.2, 0, 0.12); sh.closePath();
    const geo = new T.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false });
    for (const sx of [-1, 1]) {
      const w = new T.Group(); w.position.set(sx * 0.1, BH * 0.4 - BH * 0.17, -0.06); w.rotation.set(0, sx > 0 ? -0.5 : Math.PI + 0.5, 0); g.add(w);
      const a = mk(geo, K3D.toon('#24202e'), { ink: INK, inkW: 0.6 }); w.add(a);
      const b = new T.Mesh(geo, K3D.toon('#8a4ad8')); b.scale.set(0.86, 0.86, 1); b.position.set(0.02, 0.02, 0.012); w.add(b);
    }
    const ring = mk(new T.TorusGeometry(BW * 0.5, 0.04, 6, 28).rotateX(Math.PI / 2).scale(1, 1, BD / BW), K3D.toon('#24202e'), { ink: INK, inkW: 0.6 });
    ring.position.y = BH * 0.4 - BH * 0.17; g.add(ring);
    const clasp = mk(new T.SphereGeometry(0.045, 10, 8), K3D.toon('#e2b84a', { emissive: '#7a5410', emissiveIntensity: 0.3 }), { ink: INK, inkW: 0.5 });
    clasp.position.set(0, BH * 0.38 - BH * 0.17, BD * 0.5); g.add(clasp);
    return g;
  }, { at: 'body' });
  // plastic fangs under the eyes (white, a little shine)
  def3('pmFangs', () => {
    const g = new T.Group();
    for (const sx of [-1, 1]) { const f = mk(new T.ConeGeometry(0.026, 0.075, 8).rotateX(Math.PI), K3D.toon('#ffffff'), { ink: INK, inkW: 0.45 }); f.position.set(sx * 0.07, -0.16, 0.01); g.add(f); }
    return g;
  }, { at: 'face' });
  // a black headband between the ears with two small bat wings
  def3('pmBatBand', () => {
    const g = new T.Group();
    const band = mk(new T.TorusGeometry(0.27, 0.02, 6, 24, Math.PI), K3D.toon('#24202e'), { ink: INK, inkW: 0.5 });
    band.rotation.set(0, 0, 0); band.position.set(0, -0.12, 0.02); g.add(band);
    const sh = new T.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.08, 0.14, 0.24, 0.12); sh.quadraticCurveTo(0.2, 0.06, 0.24, 0.0); sh.quadraticCurveTo(0.17, 0.02, 0.15, -0.04); sh.quadraticCurveTo(0.11, 0.0, 0.07, -0.05); sh.closePath();
    const geo = new T.ExtrudeGeometry(sh, { depth: 0.015, bevelEnabled: false });
    const wings = [];
    for (const sx of [-1, 1]) {
      const w = new T.Group(); w.position.set(sx * 0.05, 0.14, 0.02); w.scale.set(sx, 1, 1); g.add(w);
      const m = mk(geo, K3D.toon('#2e2638'), { ink: INK, inkW: 0.6 }); w.add(m); wings.push(w);
    }
    const body = mk(new T.SphereGeometry(0.05, 10, 8), K3D.toon('#2e2638'), { ink: INK, inkW: 0.6 }); body.position.set(0, 0.15, 0.02); g.add(body);
    for (const sx of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.01, 6, 4), K3D.flat(hot('#ff9df2', 1.6))); e.position.set(sx * 0.02, 0.16, 0.065); g.add(e); }
    g.userData.wings = wings;
    return g;
  }, { at: 'head' });

  K3D.defineOutfit3('parkmanor', {
    pip: [['pmPyjamas', {}], ['pmNightcap', {}]],
    bo: [['pmCape', {}], ['pmCollar', {}], ['pmFangs', {}], ['pmBatBand', {}]],
  });
})();
