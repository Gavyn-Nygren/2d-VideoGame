/* Pip & Bo - 42-4 Go-Kart Grand Prix: the 3D outfit 'parkkarts' (racing drivers, fairground style). Loaded on demand
   with the 3D kit. The matching 2D outfit (previews, world page, title run) is defineOutfit('parkkarts') in
   go-kart-grand-prix.js. They are seen from behind most of the time, so the backs and the headgear matter; the scarf and
   the cape stream in the wind (parkkarts-kart3d.js moves the parts named in userData.wind each frame).
   Pip: a tan leather racing cap with ear flaps and stitched panels (the sprout through the top), round brass goggles
   with green lenses pushed up on the brow (eyes clear), a long yellow and white chequered scarf that streams behind, a
   big number 1 on the back.
   Bo: a shiny purple open-face crash helmet with a white stripe and holes for the ears, a clear visor flipped up, green
   driving gloves, a short green cape-scarf, a big number 2 on the back.
   Pip wears no blue, Bo no orange or red (the karts carry the orange and the blue). */
'use strict';

(function () {
  const T = K3D.T;
  const BW = K3D.HERO.w, BH = K3D.HERO.h, BD = K3D.HERO.d;
  const INK = '#1a1530';
  const mk = (geo, mat, o) => K3D.mesh(geo, mat, o);
  const def3 = (n, fn, o) => K3D.definePart3(n, Object.assign({ build: fn }, o || {}));
  const leather = () => K3D.paint('pk-leather', 256, 128, (c, w, h) => {
    c.fillStyle = '#b8854e'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(${90 + Math.random() * 40},${50 + Math.random() * 30},20,${0.08 + Math.random() * 0.1})`; c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 5, 1 + Math.random() * 2); }
    // panel seams with stitches
    c.strokeStyle = 'rgba(70,40,15,0.75)'; c.lineWidth = 3;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(i * w / 4, 0); c.lineTo(i * w / 4, h); c.stroke(); }
    c.strokeStyle = 'rgba(255,230,180,0.6)'; c.lineWidth = 1.2; c.setLineDash([4, 4]);
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(i * w / 4 + 5, 0); c.lineTo(i * w / 4 + 5, h); c.stroke(); }
    c.setLineDash([]);
  }, { repeat: true });
  // a big racing number in a white roundel (on the back)
  const numTex = (n, ring) => K3D.paint('pk-num|' + n + ring, 128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#fbf7ec'; c.beginPath(); c.arc(64, 64, 60, 0, Math.PI * 2); c.fill();
    c.strokeStyle = ring; c.lineWidth = 8; c.stroke();
    c.fillStyle = '#1a1530'; c.font = '900 84px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), 64, 70);
  });

  // Pip's cap: a leather dome with ear flaps and a little peak at the back; the sprout comes out of the top
  def3('pkCap', (o, x) => {
    const g = new T.Group(), m = K3D.toon('#ffffff', { map: leather() });
    const dome = mk(new T.SphereGeometry(0.36, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), m, { ink: INK, inkW: 0.9 }); dome.scale.set(1.05, 0.62, 0.92); g.add(dome);
    const band = mk(new T.CylinderGeometry(0.37, 0.38, 0.06, 28, 1, true), K3D.toon('#8a5a2c', { side: T.DoubleSide }), { ink: INK, inkW: 0.6 }); band.position.y = -0.02; band.scale.set(1.04, 1, 0.92); g.add(band);
    for (const sx of [-1, 1]) {
      const flap = mk(K3D.roundBox(0.06, 0.22, 0.16, 0.6, 16), K3D.toon('#a4743f'), { ink: INK, inkW: 0.6 }); flap.position.set(sx * 0.37, -0.22, 0.0); g.add(flap);
      const strap = mk(new T.BoxGeometry(0.02, 0.12, 0.03), K3D.toon('#6a4220'), { ink: false }); strap.position.set(sx * 0.37, -0.28, 0.06); g.add(strap);
    }
    const button = mk(new T.SphereGeometry(0.035, 8, 6), K3D.toon('#6a4220'), { ink: INK, inkW: 0.4 }); button.position.y = 0.215; g.add(button);
    g.position.set(0, -0.06, -0.01);
    x.hero.userData.sproutLift = 0.14;
    return g;
  }, { at: 'head' });
  // brass goggles with green lenses, pushed up on the brow (the eyes stay clear)
  def3('pkGoggles', () => {
    const g = new T.Group(), brass = K3D.toon('#d9a94a', { emissive: '#5a3a08', emissiveIntensity: 0.3 });
    const lens = new T.MeshBasicMaterial({ color: new T.Color('#5fd07a').multiplyScalar(1.15), toneMapped: false });
    for (const sx of [-1, 1]) {
      const rim = mk(new T.TorusGeometry(0.085, 0.022, 8, 20), brass, { ink: INK, inkW: 0.6 }); rim.position.set(sx * 0.11, 0, 0); g.add(rim);
      const cup = mk(new T.CylinderGeometry(0.08, 0.09, 0.05, 16).rotateX(Math.PI / 2), K3D.toon('#3a2a1a'), { ink: false }); cup.position.set(sx * 0.11, 0, -0.025); g.add(cup);
      const l = new T.Mesh(new T.CircleGeometry(0.07, 16), lens); l.position.set(sx * 0.11, 0, 0.012); g.add(l);
      const gl = new T.Mesh(new T.CircleGeometry(0.018, 8), K3D.flat('#ffffff')); gl.position.set(sx * 0.11 - 0.025, 0.025, 0.014); g.add(gl);
    }
    const strap = mk(new T.TorusGeometry(BW * 0.53, 0.018, 6, 32, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI).scale(1, 1, 0.85), K3D.toon('#5a3a1a'), { ink: false }); strap.position.z = -0.02; g.add(strap);
    g.position.set(0, 0.2, -0.04); g.rotation.x = -0.45;
    return g;
  }, { at: 'face' });
  // the long chequered scarf: a loop round the neck and a tail of segments that streams back (the kart file waves it)
  def3('pkScarf', () => {
    const g = new T.Group();
    const cheq = K3D.paint('pk-cheq', 64, 256, (c, w, h) => { const s = 16; for (let y = 0; y < h / s; y++) for (let x = 0; x < w / s; x++) { c.fillStyle = (x + y) % 2 ? '#fff6dc' : '#f2c83a'; c.fillRect(x * s, y * s, s, s); } }, { repeat: true });
    const m = K3D.toon('#ffffff', { map: cheq, side: T.DoubleSide });
    const ring = mk(new T.TorusGeometry(BW * 0.5, 0.06, 8, 32).rotateX(Math.PI / 2).scale(1, 1, BD / BW * 1.02), m, { ink: INK, inkW: 0.6 }); g.add(ring);
    const knot = mk(new T.SphereGeometry(0.08, 10, 8), m, { ink: INK, inkW: 0.6 }); knot.position.set(0.12, -0.02, -BD * 0.5); g.add(knot);
    // the tail: a chain of short pieces, each hung from the last
    let parent = g; const segs = [];
    for (let i = 0; i < 7; i++) {
      const seg = new T.Group(); seg.position.set(i === 0 ? 0.12 : 0, i === 0 ? -0.04 : 0, i === 0 ? -BD * 0.52 : -0.27); parent.add(seg);
      const piece = mk(new T.BoxGeometry(0.16, 0.02, 0.28).translate(0, 0, -0.135), m, { ink: INK, inkW: 0.5 }); seg.add(piece);
      segs.push(seg); parent = seg;
    }
    g.position.y = 0.04;
    g.userData.wind = { kind: 'tail', segs, amt: 1 };
    return g;
  }, { at: 'body' });
  // a big number on the back (a roundel stitched to the back)
  def3('pkBackNum', (o, x) => {
    const g = new T.Group();
    const m = new T.Mesh(new T.CircleGeometry(0.19, 24), K3D.toon('#ffffff', { map: numTex(o.n, PCOL[x.id]), transparent: true }));
    m.rotation.y = Math.PI; m.position.z = -0.012; g.add(m);
    g.position.y = 0.0;
    return g;
  }, { at: 'back' });

  // Bo's helmet: a shiny purple shell open at the face, a white stripe over the top, holes for the ears, the visor up
  def3('pkHelmet', (o, x) => {
    const g = new T.Group();
    const shell = K3D.toon('#8a4ad8', { emissive: '#3a1a6a', emissiveIntensity: 0.25 });
    const dome = mk(new T.SphereGeometry(0.42, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), shell, { ink: INK, inkW: 1 }); dome.scale.set(1, 0.78, 0.98); g.add(dome);
    // the cheek guards come down the sides and the back (the face stays open)
    const back = mk(new T.CylinderGeometry(0.42, 0.42, 0.3, 32, 1, true, Math.PI * 0.62, Math.PI * 1.76), K3D.toon('#8a4ad8', { side: T.DoubleSide, emissive: '#3a1a6a', emissiveIntensity: 0.25 }), { ink: INK, inkW: 0.8 }); back.position.y = -0.14; back.scale.set(1, 1, 0.98); g.add(back);
    const stripe = mk(new T.TorusGeometry(0.425, 0.04, 6, 40, Math.PI * 0.95).rotateY(Math.PI / 2).rotateX(0.0), K3D.toon('#ffffff'), { ink: false }); stripe.scale.set(1, 0.79, 1); stripe.rotation.z = Math.PI * 0.02; g.add(stripe);
    // the shine (shiny!)
    const shine = new T.Mesh(new T.SphereGeometry(0.1, 12, 8), K3D.flat('#f0e0ff', { transparent: true, opacity: 0.55, depthWrite: false })); shine.scale.set(1.2, 0.5, 0.4); shine.position.set(-0.17, 0.24, 0.18); shine.rotation.set(-0.6, -0.4, 0.4); g.add(shine);
    // ear holes: dark rings where the ears come through
    for (const sx of [-1, 1]) { const ring = mk(new T.TorusGeometry(0.11, 0.025, 6, 18).rotateX(Math.PI / 2), K3D.toon('#4a2a8a'), { ink: false }); ring.position.set(sx * 0.27, 0.19, -0.04); g.add(ring); }
    // the clear visor, flipped up over the brow
    const visor = new T.Mesh(new T.SphereGeometry(0.45, 24, 8, -Math.PI * 0.35, Math.PI * 0.7, Math.PI * 0.18, Math.PI * 0.2), new T.MeshBasicMaterial({ color: '#cfefff', transparent: true, opacity: 0.38, side: T.DoubleSide, depthWrite: false, toneMapped: false }));
    visor.scale.set(1, 0.85, 1); visor.rotation.y = 0; g.add(visor);
    const vrim = mk(new T.TorusGeometry(0.44, 0.012, 4, 28, Math.PI * 0.7).rotateZ(Math.PI * 0.15), K3D.toon('#d8d0f0'), { ink: false }); vrim.rotation.x = -1.2; vrim.position.set(0, 0.16, 0.06); vrim.scale.set(1, 0.85, 1); g.add(vrim);
    g.position.set(0, -0.12, -0.02);
    x.hero.userData.earsOut = true;
    return g;
  }, { at: 'head' });
  // green driving gloves (on the ends of the arms)
  def3('pkGloves', (o, x) => {
    const g = new T.Group();
    for (const arm of x.hero.userData.arms) {
      const gl = mk(new T.SphereGeometry(0.085, 12, 10), K3D.toon('#3faa5a'), { ink: INK, inkW: 0.6 }); gl.scale.set(1, 1.1, 1); gl.position.y = -0.27; arm.arm.add(gl);
      const cuff = mk(new T.CylinderGeometry(0.08, 0.09, 0.06, 12), K3D.toon('#2f8a46'), { ink: INK, inkW: 0.5 }); cuff.position.y = -0.2; arm.arm.add(cuff);
    }
    return g;
  }, { at: 'body' });
  // the short green cape-scarf: a collar and a little cape that flaps (the kart file waves it)
  def3('pkCape', () => {
    const g = new T.Group();
    const m = K3D.toon('#3faa5a', { side: T.DoubleSide });
    const collar = mk(new T.TorusGeometry(BW * 0.5, 0.05, 8, 32).rotateX(Math.PI / 2).scale(1, 1, BD / BW * 1.02), K3D.toon('#2f8a46'), { ink: INK, inkW: 0.6 }); g.add(collar);
    const capeGeo = new T.PlaneGeometry(0.62, 0.42, 6, 4).translate(0, -0.21, 0);
    const cape = mk(capeGeo, m, { ink: INK, inkW: 0.6 }); cape.position.set(0, 0.02, -BD * 0.52); cape.rotation.x = 0.15;
    g.add(cape);
    const fp = capeGeo.attributes.position; cape.userData.base = Float32Array.from(fp.array);
    g.userData.wind = { kind: 'cape', mesh: cape };
    g.position.y = 0.05;
    return g;
  }, { at: 'body' });

  K3D.defineOutfit3('parkkarts', {
    pip: [['pkCap', {}], ['pkGoggles', {}], ['pkScarf', {}], ['pkBackNum', { n: 1 }]],
    bo: [['pkHelmet', {}], ['pkGloves', {}], ['pkCape', {}], ['pkBackNum', { n: 2 }]],
  });
})();
