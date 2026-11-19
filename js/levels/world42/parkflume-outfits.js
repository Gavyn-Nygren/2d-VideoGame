/* Pip & Bo - 42-2 Log Flume Plunge: the 3D outfit 'parkflume' (dressed for a soaking, from the ride's gift shop).
   Loaded on demand with the 3D kit. The matching 2D outfit (previews, world page, title run) is defineOutfit('parkflume')
   in log-flume-plunge.js. They are seen mostly from behind and above, so the backs and hats matter; the cape flaps and
   the hat's brim drips (the log file moves the parts named in userData.wind each frame).
   Pip: a bright yellow sou'wester rain hat, the sprout poking through a hole in its crown, water running off the brim;
   a yellow rain cape that flaps; a small green rubber-ring life belt over one shoulder.
   Bo: a green snorkel mask pushed up on the forehead with the snorkel standing up by one ear; a purple and white
   striped swim ring round the middle; yellow water wings on both arms.
   Pip wears no blue, Bo no orange or red; different headgear; the eyes, sprout and ears stay clear. */
'use strict';

(function () {
  const T = K3D.T;
  const BW = K3D.HERO.w, BH = K3D.HERO.h, BD = K3D.HERO.d;
  const INK = '#1a1530';
  const mk = (geo, mat, o) => K3D.mesh(geo, mat, o);
  const def3 = (n, fn, o) => K3D.definePart3(n, Object.assign({ build: fn }, o || {}));
  const oil = (c) => K3D.toon(c, { emissive: c, emissiveIntensity: 0.12 }); // oilskin: a little shiny in the lamplight

  // the sou'wester: a deep round crown (a hole for the sprout), a wide brim that dips at the back, a chin strap
  def3('pfSouwester', (o, x) => {
    const g = new T.Group(), yel = oil('#ffd23a'), dk = K3D.toon('#e0a818');
    const crown = mk(new T.SphereGeometry(0.34, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), yel, { ink: INK, inkW: 0.9 });
    crown.scale.set(1.05, 0.95, 1.0); crown.position.y = 0.0; g.add(crown);
    // seams on the crown
    for (let i = 0; i < 4; i++) { const sm = new T.Mesh(new T.TorusGeometry(0.335, 0.007, 4, 24, Math.PI * 0.55), dk); sm.rotation.set(0, i * Math.PI / 4, Math.PI / 2); sm.scale.set(1, 1.05, 1); g.add(sm); }
    // the brim: a wide cone, longer behind
    const bp = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2, back = 0.5 + 0.5 * Math.cos(a); bp.push([a, 0.55 + back * 0.16, -0.05 - back * 0.07]); }
    const brimG = new T.BufferGeometry(), bpos = [], bidx = [];
    for (const [a, r, y] of bp) { bpos.push(Math.sin(a) * 0.3, 0.0, -Math.cos(a) * 0.3, Math.sin(a) * r, y, -Math.cos(a) * r); }
    for (let i = 0; i < 48; i++) { const A = i * 2; bidx.push(A, A + 1, A + 2, A + 1, A + 3, A + 2); }
    brimG.setAttribute('position', new T.Float32BufferAttribute(bpos, 3)); brimG.setIndex(bidx); brimG.computeVertexNormals();
    const brim = mk(brimG, K3D.toon('#ffd23a', { side: T.DoubleSide, emissive: '#ffd23a', emissiveIntensity: 0.1 }), { ink: INK, inkW: 0.8 });
    brim.position.y = 0.02; g.add(brim);
    // the brim's rolled edge
    const edgeCurve = new T.CatmullRomCurve3(bp.slice(0, 48).map(([a, r, y]) => new T.Vector3(Math.sin(a) * r, y + 0.02, -Math.cos(a) * r)), true);
    g.add(mk(new T.TubeGeometry(edgeCurve, 96, 0.018, 5, true), dk, { ink: false }));
    // the chin strap down past the cheeks (behind the face)
    for (const sx of [-1, 1]) { const st = mk(new T.CylinderGeometry(0.012, 0.012, 0.42, 5), K3D.toon('#3a2f3f'), { ink: false }); st.position.set(sx * 0.35, -0.2, -0.08); g.add(st); }
    // drips round the brim (the log file runs them down when wet): little blue drops
    const drips = new T.Group(); g.add(drips);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3, r = 0.55 + (0.5 + 0.5 * Math.cos(a)) * 0.16; const d = new T.Mesh(K3D.geo('pf-drip', () => new T.SphereGeometry(0.025, 8, 6).scale(1, 1.5, 1)), K3D.flat(new T.Color('#9ae6ff').multiplyScalar(1.3))); d.position.set(Math.sin(a) * r, -0.08, -Math.cos(a) * r); d.userData.y0 = -0.08; d.userData.ph = i * 1.7; drips.add(d); }
    g.position.set(0, 0.17, -0.05); g.rotation.x = -0.16; // up and tipped back off the eyes
    x.hero.userData.sproutLift = 0.3;
    g.userData.wind = { kind: 'drips', node: drips };
    return g;
  }, { at: 'head' });
  // the rain cape: a short yellow cone from the shoulders, open at the front, flapping at the hem
  def3('pfRainCape', (o) => {
    const g = new T.Group();
    const hem = new T.Group(); g.add(hem);
    const cape = mk(new T.CylinderGeometry(0.42, 0.56, 0.5, 24, 1, true, Math.PI * 0.32, Math.PI * 1.36), K3D.toon('#ffd23a', { side: T.DoubleSide, emissive: '#ffd23a', emissiveIntensity: 0.1 }), { ink: INK, inkW: 0.8 });
    cape.position.y = -0.25; hem.add(cape);
    const collar = mk(new T.TorusGeometry(0.4, 0.035, 6, 24, Math.PI * 1.36).rotateX(Math.PI / 2).rotateY(Math.PI * 0.32 - Math.PI / 2), K3D.toon('#e0a818'), { ink: INK, inkW: 0.6 });
    g.add(collar);
    for (let i = 0; i < 3; i++) { const b = new T.Mesh(K3D.geo('pf-btn', () => new T.SphereGeometry(0.025, 8, 6)), K3D.toon('#3a2f3f')); b.position.set(0.3, -0.08 - i * 0.12, 0.3); g.add(b); }
    g.position.set(0, BH * 0.62, 0);
    g.userData.wind = { kind: 'cape', node: hem };
    return g;
  }, { at: 'body' });
  // a small green life ring slung over one shoulder (across the body)
  def3('pfLifeRing', () => {
    const g = new T.Group();
    const tex = K3D.paint('pf-lifering', 256, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f4f0e8' : '#3fae5a'; c.fillRect(i * w / 8, 0, w / 8, h); } });
    const ring = mk(new T.TorusGeometry(0.2, 0.065, 10, 28), K3D.toon('#ffffff', { map: tex }), { ink: INK, inkW: 0.7 });
    g.add(ring);
    const rope = mk(new T.TorusGeometry(0.2, 0.012, 4, 28), K3D.toon('#f4e8c8'), { ink: false }); rope.scale.setScalar(1.33); g.add(rope);
    g.position.set(0.3, BH * 0.18, 0.05); g.rotation.set(0.2, Math.PI / 2 - 0.3, -0.5);
    return g;
  }, { at: 'body' });

  // the snorkel mask pushed up on the forehead: a green frame round a pale glass, a strap round the head, the snorkel
  // standing up by the right ear (a yellow tube with a green top)
  def3('pfSnorkelMask', () => {
    const g = new T.Group(), grn = K3D.toon('#3fc06a', { emissive: '#3fc06a', emissiveIntensity: 0.1 });
    const frame = mk(K3D.roundBox(0.5, 0.22, 0.12, 0.7, 20), grn, { ink: INK, inkW: 0.8 }); frame.position.set(0, -0.06, BD * 0.5 - 0.02); frame.rotation.x = -0.5; g.add(frame);
    const glass = new T.Mesh(K3D.roundBox(0.42, 0.15, 0.04, 0.7, 16), K3D.toon('#cdeeff', { emissive: '#9adfff', emissiveIntensity: 0.25 })); glass.position.set(0, -0.06, BD * 0.5 + 0.035); glass.rotation.x = -0.5; g.add(glass);
    const glint = new T.Mesh(new T.PlaneGeometry(0.08, 0.03), K3D.flat('#ffffff')); glint.position.set(-0.12, -0.02, BD * 0.5 + 0.06); glint.rotation.x = -0.5; g.add(glint);
    const strap = mk(new T.TorusGeometry(BW * 0.52, 0.025, 6, 32).rotateX(Math.PI / 2).scale(1, 1, BD / BW * 1.02), K3D.toon('#2f9a5a'), { ink: INK, inkW: 0.5 }); strap.position.set(0, -0.08, 0); g.add(strap);
    const tubeC = new T.CatmullRomCurve3([new T.Vector3(BW * 0.5, -0.28, 0.05), new T.Vector3(BW * 0.56, -0.05, 0.0), new T.Vector3(BW * 0.55, 0.25, -0.03), new T.Vector3(BW * 0.5, 0.42, -0.04)]);
    g.add(mk(new T.TubeGeometry(tubeC, 20, 0.032, 8), K3D.toon('#ffd23a'), { ink: INK, inkW: 0.6 }));
    const top = mk(new T.CylinderGeometry(0.05, 0.04, 0.08, 10), grn, { ink: INK, inkW: 0.5 }); top.position.set(BW * 0.5, 0.45, -0.04); g.add(top);
    g.position.set(0, 0.0, 0);
    return g;
  }, { at: 'head' });
  // the swim ring round the middle: fat, purple and white stripes
  def3('pfSwimRing', () => {
    const g = new T.Group();
    const tex = K3D.paint('pf-swimring', 512, 64, (c, w, h) => { for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#f4f0f8' : '#9a5cf0'; c.fillRect(i * w / 12, 0, w / 12, h); } c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(0, h * 0.25, w, h * 0.12); });
    const ring = mk(new T.TorusGeometry(BW * 0.56, 0.11, 12, 40).rotateX(Math.PI / 2), K3D.toon('#ffffff', { map: tex, emissive: '#6a3ab0', emissiveIntensity: 0.08 }), { ink: INK, inkW: 0.8 });
    ring.scale.set(1, 1, BD / BW * 1.05); g.add(ring);
    const valve = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.05, 8).rotateX(Math.PI / 2), K3D.toon('#f4f0f8')); valve.position.set(0.15, 0.06, BD * 0.6); g.add(valve);
    g.position.set(0, BH * 0.18, 0);
    return g;
  }, { at: 'body' });
  // yellow water wings on both arms
  def3('pfWaterWings', (o, x) => {
    const g = new T.Group();
    for (const a of x.hero.userData.arms) {
      const w = mk(K3D.geo('pf-wing', () => new T.CylinderGeometry(0.11, 0.11, 0.15, 14).scale(1, 1, 0.9)), K3D.toon('#ffd23a', { emissive: '#ffd23a', emissiveIntensity: 0.1 }), { ink: INK, inkW: 0.6 });
      w.position.y = -0.12; a.arm.add(w);
      const band = new T.Mesh(K3D.geo('pf-wingBand', () => new T.TorusGeometry(0.112, 0.012, 4, 18).rotateX(Math.PI / 2)), K3D.toon('#3fc06a')); band.position.y = -0.12; a.arm.add(band);
    }
    return g;
  }, { at: 'body' });

  K3D.defineOutfit3('parkflume', {
    pip: [['pfRainCape', {}], ['pfLifeRing', {}], ['pfSouwester', {}]],
    bo: [['pfSwimRing', {}], ['pfWaterWings', {}], ['pfSnorkelMask', {}]],
  });
})();
