/* Pip & Bo - 42-1 Runaway Coaster: the 3D outfit 'parkcoaster' (a day out at the fair). Loaded on demand with the 3D
   kit. The matching 2D outfit (previews, world page, title run) is defineOutfit('parkcoaster') in runaway-coaster.js.
   They are seen mostly from behind and above, so the backs and hats matter, and things flap in the wind (the car file
   moves the parts named in userData.wind each frame).
   Pip: a red-and-white striped paper popcorn box for a hat, popcorn spilling over its top and the sprout through it; a
   green glow-stick necklace; a paper wristband; a yellow foam "No. 1" finger strapped to the back like a banner.
   Bo: a teal and yellow propeller beanie between the ears (the propeller spins with the car's speed); purple star
   glasses pushed up on the forehead; glow bracelets; a purple balloon tied to the back that streams behind and bobs.
   Pip wears no blue, Bo no orange or red. The glow pieces are bright enough to bloom (and glow under black light). */
'use strict';

(function () {
  const T = K3D.T;
  const BW = K3D.HERO.w, BH = K3D.HERO.h, BD = K3D.HERO.d;
  const INK = '#1a1530';
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const mk = (geo, mat, o) => K3D.mesh(geo, mat, o);
  const def3 = (n, fn, o) => K3D.definePart3(n, Object.assign({ build: fn }, o || {}));

  // a paper popcorn box: wider at the top, red and white stripes, a scalloped rim, popcorn heaped over it
  def3('pcPopcornHat', (o, x) => {
    const g = new T.Group();
    const tex = K3D.paint('pc-popbox', 256, 128, (c, w, h) => {
      for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f8f2e4' : '#e0403a'; c.fillRect(i * w / 8, 0, w / 8, h); }
      c.fillStyle = 'rgba(0,0,0,0.08)'; for (let i = 0; i < 40; i++) c.fillRect(Math.random() * w, Math.random() * h, 3, 1);
      // a little printed label: a ticket and "POP!"
      c.fillStyle = '#f2c14e'; c.beginPath(); c.arc(w * 0.25, h * 0.55, 18, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#7a1f1a'; c.font = '900 16px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('POP!', w * 0.25, h * 0.56);
    }, { repeat: true });
    const box = mk(new T.CylinderGeometry(0.3, 0.23, 0.42, 4, 1, true).rotateY(Math.PI / 4), K3D.toon('#ffffff', { map: tex, side: T.DoubleSide }), { ink: INK, inkW: 0.9 });
    box.position.y = 0.2; g.add(box);
    const bottom = mk(new T.BoxGeometry(0.32, 0.02, 0.32), K3D.toon('#f8f2e4'), { ink: false }); bottom.position.y = 0.0; g.add(bottom);
    // popcorn: white and buttery puffs heaped over the rim
    const pop = K3D.geo('pc-kernel', () => { const s = new T.IcosahedronGeometry(0.055, 0); return s; });
    const popM = [K3D.toon('#fffbea'), K3D.toon('#ffe9a0')];
    for (let i = 0; i < 26; i++) {
      const a = i * 2.4, r = 0.05 + (i % 7) * 0.032, k = mk(pop, popM[i % 2], { ink: '#8a6a2a', inkW: 0.5 });
      k.position.set(Math.cos(a) * r, 0.43 + (1 - r / 0.25) * 0.06 + (i % 3) * 0.02, Math.sin(a) * r); k.rotation.set(i, i * 2, i * 3);
      k.scale.setScalar(0.8 + (i % 4) * 0.15); g.add(k);
    }
    g.position.set(0, -0.05, -0.02);
    x.hero.userData.sproutLift = 0.5;
    g.userData.wind = { kind: 'tilt', amt: 0.18 };
    return g;
  }, { at: 'head' });
  // a glow-stick necklace (bright green, bright enough to bloom)
  def3('pcGlowNecklace', (o) => {
    const g = new T.Group();
    const pts = []; for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; pts.push(new T.Vector3(Math.cos(a) * BW * 0.53, -Math.max(0, Math.sin(a)) * 0.08, Math.sin(a) * BD * 0.55)); }
    const ring = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 72, 0.028, 6, true), K3D.flat(hot(o.col || '#5dff7a', 2.4)));
    g.add(ring);
    const clip = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.06, 8).rotateX(Math.PI / 2), K3D.toon('#2a2235')); clip.position.set(0, -0.08, BD * 0.55); g.add(clip);
    g.position.y = 0.2;
    return g;
  }, { at: 'body' });
  // a band round one arm (a paper wristband, or a glow bracelet)
  def3('pcWristband', (o, x) => {
    const g = new T.Group();
    const arm = x.hero.userData.arms[o.arm != null ? o.arm : 1];
    const mat = o.glow ? K3D.flat(hot(o.col, 2.2)) : K3D.toon(o.col || '#f2c14e');
    for (let i = 0; i < (o.n || 1); i++) {
      const b = o.glow ? new T.Mesh(new T.TorusGeometry(0.075, 0.016, 6, 16).rotateX(Math.PI / 2), i % 2 && o.col2 ? K3D.flat(hot(o.col2, 2.2)) : mat) : mk(new T.CylinderGeometry(0.078, 0.078, 0.05, 14, 1, true), K3D.toon(o.col || '#f2c14e', { side: T.DoubleSide }), { ink: INK, inkW: 0.5 });
      b.position.y = -0.22 + i * 0.035; arm.arm.add(b);
    }
    return g; // (the band rides on the arm itself)
  }, { at: 'body' });
  // the yellow foam "No. 1" finger strapped to the back on a short pole, like a banner
  def3('pcFoamFinger', (o, x) => {
    const g = new T.Group();
    const foam = K3D.toon('#ffd23a');
    const tex = K3D.paint('pc-no1', 128, 128, (c, w, h) => { c.fillStyle = '#ffd23a'; c.fillRect(0, 0, w, h); c.fillStyle = '#b8282a'; c.font = '900 46px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('No.1', w / 2, h / 2 + 4); });
    const pole = mk(new T.CylinderGeometry(0.02, 0.02, 0.7, 6).translate(0, 0.35, 0), K3D.toon('#3a2f3f'), { ink: INK, inkW: 0.5 }); g.add(pole);
    const strap = mk(new T.TorusGeometry(BW * 0.52, 0.02, 6, 24).rotateX(Math.PI / 2).scale(1, 1, BD / BW), K3D.toon('#3a2f3f'), { ink: false }); strap.position.set(0, -0.04, BD / 2); g.add(strap);
    const hand = new T.Group(); hand.position.y = 0.72; g.add(hand);
    const palm = mk(K3D.roundBox(0.34, 0.26, 0.12, 0.6, 20).translate(0, -0.13, 0), K3D.toon('#ffffff', { map: tex }), { ink: INK, inkW: 0.8 }); hand.add(palm);
    const finger = mk(K3D.roundBox(0.1, 0.34, 0.1, 0.7, 14), foam, { ink: INK, inkW: 0.8 }); finger.position.set(-0.08, 0.08, 0); hand.add(finger);
    const thumb = mk(K3D.roundBox(0.09, 0.16, 0.09, 0.7, 12), foam, { ink: INK, inkW: 0.7 }); thumb.position.set(0.17, -0.12, 0.02); thumb.rotation.z = -0.9; hand.add(thumb);
    g.position.set(0.12, 0.05, -0.02);
    g.rotation.set(-0.15, Math.PI, -0.12);
    g.userData.wind = { kind: 'flap', node: hand, amt: 0.35 };
    return g;
  }, { at: 'back' });

  // Bo's propeller beanie: teal and yellow segments, a little brim, a red-free yellow propeller on a stalk
  def3('pcPropBeanie', (o, x) => {
    const g = new T.Group();
    const tex = K3D.paint('pc-beanie', 256, 64, (c, w, h) => { for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#f2d03a' : '#25a8a0'; c.fillRect(i * w / 6, 0, w / 6, h); } });
    const cap = mk(new T.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), K3D.toon('#ffffff', { map: tex }), { ink: INK, inkW: 0.8 }); cap.scale.set(1, 0.85, 1.05); g.add(cap);
    const band = mk(new T.CylinderGeometry(0.205, 0.205, 0.05, 24, 1, true), K3D.toon('#1f7f7a', { side: T.DoubleSide }), { ink: INK, inkW: 0.6 }); band.position.y = 0.02; g.add(band);
    const brim = mk(new T.CylinderGeometry(0.15, 0.15, 0.02, 16, 1, false, -Math.PI * 0.4, Math.PI * 0.8), K3D.toon('#f2d03a'), { ink: INK, inkW: 0.6 }); brim.position.set(0, 0.01, 0.13); brim.scale.set(1, 1, 0.7); g.add(brim);
    const stalk = mk(new T.CylinderGeometry(0.015, 0.015, 0.12, 6), K3D.toon('#dcd8e8'), { ink: INK, inkW: 0.5 }); stalk.position.y = 0.22; g.add(stalk);
    const prop = new T.Group(); prop.position.y = 0.29; g.add(prop);
    for (const s of [-1, 1]) { const bl = mk(new T.BoxGeometry(0.2, 0.012, 0.055).translate(s * 0.1, 0, 0), K3D.toon(s > 0 ? '#f2d03a' : '#25a8a0'), { ink: INK, inkW: 0.5 }); bl.rotation.x = s * 0.25; prop.add(bl); }
    const nub = mk(new T.SphereGeometry(0.025, 8, 6), K3D.toon('#f2d03a'), { ink: INK, inkW: 0.4 }); prop.add(nub);
    g.position.set(0, -0.02, 0.0);
    g.userData.wind = { kind: 'prop', node: prop };
    return g;
  }, { at: 'head' });
  // purple star glasses pushed up on the forehead
  def3('pcStarGlasses', (o) => {
    const g = new T.Group();
    const star = new T.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.05 : 0.11; if (i) star.lineTo(Math.cos(a) * r, Math.sin(a) * r); else star.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const geo = new T.ExtrudeGeometry(star, { depth: 0.025, bevelEnabled: false });
    const frame = K3D.toon('#9a4ae0'), lens = K3D.toon('#e0c8ff', { emissive: '#8a4ad0', emissiveIntensity: 0.4 });
    for (const sx of [-1, 1]) {
      const f = mk(geo, frame, { ink: INK, inkW: 0.6 }); f.position.set(sx * 0.13, 0, 0); g.add(f);
      const l = new T.Mesh(new T.CircleGeometry(0.055, 12), lens); l.position.set(sx * 0.13, 0, 0.027); g.add(l);
    }
    const bridge = mk(new T.BoxGeometry(0.06, 0.02, 0.02), frame, { ink: false }); bridge.position.z = 0.012; g.add(bridge);
    g.position.set(0, 0.2, -0.05); g.rotation.x = -0.75;
    return g;
  }, { at: 'face' });
  // a purple balloon tied to the back: it streams behind and bobs (the car file swings it)
  def3('pcBalloon', (o) => {
    const g = new T.Group();
    const bob = new T.Group(); g.add(bob);
    const ball = mk(new T.SphereGeometry(0.26, 20, 14).scale(1, 1.2, 1), K3D.toon('#9a4ae0', { emissive: '#5a2a90', emissiveIntensity: 0.35 }), { ink: INK, inkW: 0.9 });
    ball.position.y = 0.95; bob.add(ball);
    const knot = mk(new T.ConeGeometry(0.04, 0.06, 8).rotateX(Math.PI), K3D.toon('#9a4ae0'), { ink: INK, inkW: 0.5 }); knot.position.y = 0.62; bob.add(knot);
    const shine = new T.Mesh(new T.SphereGeometry(0.06, 8, 6), K3D.flat('#f0e0ff', { transparent: true, opacity: 0.6 })); shine.position.set(-0.1, 1.1, 0.18); bob.add(shine);
    const str = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 0.62, 4).translate(0, 0.31, 0), K3D.toon('#f4f0ff')); bob.add(str);
    g.position.set(-0.12, 0.05, -0.02);
    g.userData.wind = { kind: 'balloon', node: bob };
    return g;
  }, { at: 'back' });

  K3D.defineOutfit3('parkcoaster', {
    pip: [['pcPopcornHat', {}], ['pcGlowNecklace', { col: '#5dff7a' }], ['pcWristband', { arm: 1, col: '#f2c14e', n: 1 }], ['pcFoamFinger', {}]],
    bo: [['pcPropBeanie', {}], ['pcStarGlasses', {}], ['pcWristband', { arm: 0, glow: true, col: '#e85aff', col2: '#5affd8', n: 2 }], ['pcWristband', { arm: 1, glow: true, col: '#5affd8', col2: '#e85aff', n: 2 }], ['pcBalloon', {}]],
  });
})();
