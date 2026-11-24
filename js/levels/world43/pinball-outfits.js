/* Pip & Bo - 43-2 Pinball Panic: the 3D outfit 'arcadepinball' (Comet Carnival space-fair costumes). Loaded on demand
   with the 3D kit. The matching 2D outfit (previews, world page, title run) is defineOutfit('arcadepinball') in
   pinball-panic.js. The heroes are seen through the glass of their balls, mostly from behind and above, so the shapes
   are bold, the headgear reads from above and each costume carries a light of its own.
   Pip: a silver and green retro spaceman suit on the lower body (ribbed collar, a round green chest light that pulses),
   a clear bubble visor pushed up on the head like a headband with the sprout standing through it, little rocket fins on
   the boots.
   Bo: a short carnival ringmaster's tailcoat in star-spangled midnight teal with gold piping, two comet-tail coat tails
   (they swing as Bo runs), a gold star bow tie that lights up, a small tilted top hat perched between the ears with a
   planet bobbing on a spring.
   Pip wears no blue, Bo no orange or red. Moving bits are listed in userData.swing (the scene swings them). */
'use strict';

(function () {
  const T = K3D.T;
  const BW = K3D.HERO.w, BH = K3D.HERO.h, BD = K3D.HERO.d;
  const INK = '#151020';
  const mk = (geo, mat, o) => K3D.mesh(geo, mat, o);
  const def3 = (n, fn, o) => K3D.definePart3(n, Object.assign({ build: fn }, o || {}));
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  // brushed silver with panel lines and rivets
  const silverTex = () => K3D.paint('ap-silver', 256, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e6ecea'); g.addColorStop(0.5, '#c4cdca'); g.addColorStop(1, '#9fa9a6');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 180; i++) { c.strokeStyle = `rgba(255,255,255,${Math.random() * 0.18})`; c.lineWidth = 0.6; const y = Math.random() * h; c.beginPath(); c.moveTo(Math.random() * w, y); c.lineTo(Math.random() * w, y); c.stroke(); }
    c.strokeStyle = 'rgba(60,70,68,0.55)'; c.lineWidth = 1.5;
    for (let x = 0; x < w; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    // green racing stripes and a panel badge
    c.fillStyle = '#3fbf5a'; c.fillRect(0, h * 0.18, w, 7); c.fillRect(0, h * 0.18 + 11, w, 3);
    c.fillStyle = 'rgba(40,50,48,0.5)'; for (let x = 8; x < w; x += 32) for (const y of [8, h - 10]) { c.beginPath(); c.arc(x, y, 2, 0, Math.PI * 2); c.fill(); }
  }, { repeat: true });
  // midnight teal with little gold stars (star-spangled)
  const tealTex = () => K3D.paint('ap-teal', 256, 256, (c, w, h) => {
    c.fillStyle = '#123d48'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    const star = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); };
    for (let i = 0; i < 26; i++) star(Math.random() * w, Math.random() * h, 4 + Math.random() * 6, i % 5 ? '#f2c94a' : '#fff1b8');
  }, { repeat: true });
  const gold = () => K3D.toon('#f0c24a', { emissive: '#6a4a08', emissiveIntensity: 0.35 });

  /* ---------- Pip: the spaceman ---------- */
  def3('apSuit3', (o, x) => {
    const g = new T.Group(), sil = K3D.toon('#ffffff', { map: silverTex() });
    // the suit: a shell round the lower body (the orange body shows above it)
    const shell = mk(K3D.roundBox(BW * 1.06, BH * 0.36, BD * 1.08, 0.62, 40), sil, { ink: INK, inkW: 0.9 }); shell.position.y = -0.02; g.add(shell);
    // ribbed collar: three stacked rings at the top of the suit
    for (let i = 0; i < 3; i++) {
      const r = mk(new T.TorusGeometry(BW * 0.52, 0.024, 6, 36).rotateX(Math.PI / 2).scale(1, 1, BD / BW * 1.06), K3D.toon(i % 2 ? '#8e9a96' : '#d6dedb'), { ink: i === 2 ? INK : false, inkW: 0.5 });
      r.position.y = BH * 0.32 + i * 0.03; g.add(r);
    }
    // the round green chest light (pulses: the scene drives userData.lamp)
    const housing = mk(new T.CylinderGeometry(0.1, 0.11, 0.05, 20).rotateX(Math.PI / 2), K3D.toon('#7d8a86'), { ink: INK, inkW: 0.6 }); housing.position.set(0, BH * 0.22, BD * 0.55); g.add(housing);
    const lampMat = new T.MeshBasicMaterial({ color: hot('#58ff7a', 1.6), toneMapped: false });
    const lamp = new T.Mesh(new T.SphereGeometry(0.075, 16, 10), lampMat); lamp.scale.z = 0.5; lamp.position.set(0, BH * 0.22, BD * 0.575); g.add(lamp);
    const glint = new T.Mesh(new T.CircleGeometry(0.02, 8), K3D.flat('#ffffff')); glint.position.set(-0.025, BH * 0.22 + 0.03, BD * 0.6); g.add(glint);
    // little dials either side of the light
    for (const sx of [-1, 1]) { const d = mk(new T.CylinderGeometry(0.035, 0.035, 0.02, 12).rotateX(Math.PI / 2), K3D.toon(sx < 0 ? '#e8d24a' : '#3fbf5a'), { ink: INK, inkW: 0.4 }); d.position.set(sx * 0.2, BH * 0.24, BD * 0.53); g.add(d); }
    // boots with rocket fins
    for (const sx of [-1, 1]) {
      const boot = mk(K3D.roundBox(0.24, 0.13, 0.3, 0.55, 20), K3D.toon('#3fbf5a'), { ink: INK, inkW: 0.7 }); boot.position.set(sx * 0.19, -0.04, 0.02); g.add(boot);
      const fin = mk(new T.ConeGeometry(0.08, 0.2, 3).rotateX(-Math.PI / 2 - 0.4), K3D.toon('#e8ecea'), { ink: INK, inkW: 0.6 }); fin.position.set(sx * 0.28, 0.05, -0.16); fin.rotation.z = sx * 0.5; g.add(fin);
      const tip = mk(new T.ConeGeometry(0.04, 0.08, 6).rotateX(Math.PI), K3D.toon('#e84a3a'), { ink: false }); tip.position.set(sx * 0.19, -0.02, -0.17); tip.rotation.x = -1.3; g.add(tip);
    }
    // a backpack: a little oxygen tank with a dial
    const tank = mk(new T.CapsuleGeometry(0.1, 0.16, 6, 14), sil, { ink: INK, inkW: 0.7 }); tank.position.set(0, BH * 0.26, -BD * 0.58); g.add(tank);
    const knob = mk(new T.CylinderGeometry(0.03, 0.03, 0.05, 10), K3D.toon('#3fbf5a'), { ink: INK, inkW: 0.4 }); knob.position.set(0, BH * 0.26 + 0.2, -BD * 0.58); g.add(knob);
    g.userData.lamp = lampMat;
    return g;
  }, { at: 'body', opts: {} });
  // the bubble visor pushed up on the head like a headband (the sprout stands through it)
  def3('apVisor3', (o, x) => {
    const g = new T.Group();
    const band = mk(new T.TorusGeometry(BW * 0.47, 0.035, 8, 40).rotateX(Math.PI / 2).scale(1, 1, BD / BW * 1.05), K3D.toon('#3fbf5a'), { ink: INK, inkW: 0.7 }); band.position.y = -0.1; g.add(band);
    // the clear bubble, tipped back over the top of the head
    const bub = new T.Mesh(new T.SphereGeometry(0.4, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), new T.MeshBasicMaterial({ color: '#dffff2', transparent: true, opacity: 0.12, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
    bub.scale.set(1.05, 0.7, 1.0); bub.position.set(0, -0.12, -0.05); bub.rotation.x = -0.5; g.add(bub);
    const rim = mk(new T.TorusGeometry(0.4, 0.022, 6, 40).rotateX(Math.PI / 2), K3D.toon('#d6dedb'), { ink: INK, inkW: 0.5 }); rim.scale.set(1.05, 1, 1); rim.position.set(0, -0.12, -0.05); rim.rotation.x = -0.5; g.add(rim);
    const shine = new T.Mesh(new T.SphereGeometry(0.06, 10, 8), K3D.flat('#ffffff', { transparent: true, opacity: 0.55, depthWrite: false })); shine.scale.set(1.6, 0.5, 0.4); shine.position.set(-0.15, 0.08, 0.12); g.add(shine);
    // two little antenna nubs on the band
    for (const sx of [-1, 1]) { const a = mk(new T.CylinderGeometry(0.012, 0.012, 0.14, 6), K3D.toon('#d6dedb'), { ink: false }); a.position.set(sx * 0.3, -0.03, 0); a.rotation.z = -sx * 0.4; g.add(a); const b = new T.Mesh(new T.SphereGeometry(0.03, 8, 6), K3D.flat(hot('#58ff7a', 1.4))); b.position.set(sx * 0.33, 0.04, 0); g.add(b); }
    x.hero.userData.sproutLift = 0.03;
    return g;
  }, { at: 'head' });

  /* ---------- Bo: the ringmaster ---------- */
  def3('apCoat3', (o, x) => {
    const g = new T.Group(), teal = K3D.toon('#ffffff', { map: tealTex() }), gd = gold();
    // the coat: two side panels and the back (the blue body shows down the front)
    const panel = (sx) => {
      const p = mk(K3D.roundBox(BW * 0.36, BH * 0.6, BD * 1.08, 0.6, 28), teal, { ink: INK, inkW: 0.8 });
      p.position.set(sx * BW * 0.36, -0.02, 0); g.add(p);
      const pipe = mk(new T.BoxGeometry(0.03, BH * 0.52, 0.02), gd, { ink: false }); pipe.position.set(sx * BW * 0.19, BH * 0.28, BD * 0.53); g.add(pipe);
      const lapel = mk(new T.BoxGeometry(0.1, 0.16, 0.03), gd, { ink: INK, inkW: 0.4 }); lapel.position.set(sx * BW * 0.22, BH * 0.5, BD * 0.52); lapel.rotation.z = sx * 0.5; g.add(lapel);
      for (let k = 0; k < 2; k++) { const btn = mk(new T.SphereGeometry(0.025, 8, 6), gd, { ink: false }); btn.position.set(sx * BW * 0.25, BH * (0.2 + k * 0.14), BD * 0.55); g.add(btn); }
      // gold epaulette
      const ep = mk(K3D.roundBox(0.2, 0.06, 0.24, 0.6, 14), gd, { ink: INK, inkW: 0.5 }); ep.position.set(sx * BW * 0.42, BH * 0.56, 0); g.add(ep);
      for (let k = 0; k < 4; k++) { const fr = mk(new T.CylinderGeometry(0.008, 0.008, 0.07, 4), gd, { ink: false }); fr.position.set(sx * BW * 0.52, BH * 0.53, -0.08 + k * 0.055); g.add(fr); }
    };
    panel(-1); panel(1);
    const back = mk(K3D.roundBox(BW * 0.98, BH * 0.6, 0.12, 0.6, 28), teal, { ink: INK, inkW: 0.8 }); back.position.set(0, -0.02, -BD * 0.48); g.add(back);
    // the comet-tail coat tails: two long tapering tails with a gold edge and a gradient to a glowing tip
    const tailTex = K3D.paint('ap-tail', 64, 256, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#123d48'); gr.addColorStop(0.6, '#1d6a7a'); gr.addColorStop(1, '#8af0ff');
      c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#f2c94a'; c.fillRect(0, 0, 5, h); c.fillRect(w - 5, 0, 5, h);
      for (let i = 0; i < 10; i++) { c.fillStyle = '#fff1b8'; c.fillRect(10 + Math.random() * 40, Math.random() * h, 3, 3); }
    });
    const swing = [];
    for (const sx of [-1, 1]) {
      const piv = new T.Group(); piv.position.set(sx * 0.13, BH * 0.18, -BD * 0.54); g.add(piv);
      const shape = new T.Shape(); shape.moveTo(-0.11, 0); shape.lineTo(0.11, 0); shape.quadraticCurveTo(0.06, -0.3, sx * 0.03, -0.46); shape.quadraticCurveTo(-0.08, -0.25, -0.11, 0);
      const geo = new T.ShapeGeometry(shape, 10); const uv = geo.attributes.uv, pos = geo.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 0.11) / 0.22, 1 + pos.getY(i) / 0.46);
      const tail = mk(geo, K3D.toon('#ffffff', { map: tailTex, side: T.DoubleSide }), { ink: INK, inkW: 0.6 }); tail.rotation.x = 0.35; piv.add(tail);
      const spark = new T.Mesh(new T.SphereGeometry(0.03, 8, 6), K3D.flat(hot('#9af4ff', 2.0))); spark.position.set(sx * 0.03, -0.45, 0.0); tail.add(spark);
      swing.push({ o: piv, ax: 'x', base: 0, amt: 0.25, ph: sx });
    }
    g.userData.swing = swing;
    return g;
  }, { at: 'body' });
  // the gold star bow tie that lights up
  def3('apBowTie3', (o, x) => {
    const g = new T.Group();
    const mat = new T.MeshBasicMaterial({ color: hot('#ffd84a', 1.5), toneMapped: false });
    const s = new T.Shape(); for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 0.045 : 0.1; if (k) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const star = mk(new T.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: false }), mat, { ink: INK, inkW: 0.5 }); g.add(star);
    for (const sx of [-1, 1]) { const wing = mk(new T.ConeGeometry(0.06, 0.13, 4).rotateZ(sx * Math.PI / 2), K3D.toon('#d8a838'), { ink: INK, inkW: 0.5 }); wing.position.set(sx * 0.11, 0, -0.01); g.add(wing); }
    g.position.set(0, -0.2, 0.02);
    g.userData.lamp = mat;
    return g;
  }, { at: 'face' });
  // the little tilted top hat between the ears, a planet bobbing on a spring
  def3('apTopHat3', (o, x) => {
    const g = new T.Group(), felt = K3D.toon('#1c2a35'), band = K3D.toon('#f0c24a', { emissive: '#6a4a08', emissiveIntensity: 0.35 });
    const brim = mk(new T.CylinderGeometry(0.2, 0.2, 0.025, 28), felt, { ink: INK, inkW: 0.7 }); g.add(brim);
    const crown = mk(new T.CylinderGeometry(0.12, 0.13, 0.24, 24), felt, { ink: INK, inkW: 0.7 }); crown.position.y = 0.13; g.add(crown);
    const b = mk(new T.CylinderGeometry(0.133, 0.133, 0.045, 24), band, { ink: false }); b.position.y = 0.045; g.add(b);
    // the spring and the ringed planet
    const pts = []; for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 10; pts.push(new T.Vector3(Math.cos(a) * 0.025, i / 60 * 0.2, Math.sin(a) * 0.025)); }
    const spring = mk(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 80, 0.006, 4), K3D.toon('#d0d4dc'), { ink: false }); spring.position.y = 0.25; g.add(spring);
    const bob = new T.Group(); bob.position.y = 0.47; g.add(bob);
    const planet = mk(new T.SphereGeometry(0.065, 16, 12), K3D.toon('#9ae86a', { emissive: '#2a6a1a', emissiveIntensity: 0.5 }), { ink: INK, inkW: 0.6 }); bob.add(planet);
    const ring = mk(new T.TorusGeometry(0.1, 0.01, 4, 28).rotateX(Math.PI / 2 - 0.4), K3D.toon('#f0c24a'), { ink: false }); bob.add(ring);
    g.position.set(0.04, 0.0, -0.02); g.rotation.z = -0.25;
    x.hero.userData.earsOut = true;
    g.userData.swing = [{ o: bob, ax: 'z', base: 0, amt: 0.35, ph: 0.5, bob: true }];
    return g;
  }, { at: 'head' });

  K3D.defineOutfit3('arcadepinball', {
    pip: [['apSuit3', {}], ['apVisor3', {}]],
    bo: [['apCoat3', {}], ['apBowTie3', {}], ['apTopHat3', {}]],
  });
})();
