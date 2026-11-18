/* Pip & Bo - Level 41-2 Page Turner Chase: the 3D outfit 'popchase' (storybook characters on the run, cut and folded
   from paper with visible folds and a white cut edge). Loaded on demand with the 3D kit. The matching 2D outfit
   (previews, world page, title run) is defineOutfit('popchase') in page-turner-chase.js.
   Pip: a red riding hood: a short red paper cape, a pointed hood worn back off the face with the sprout poking out of a
     slit in its top, tied with a cream ribbon bow, and a tiny wicker basket on the back.
   Bo: a woodcutter: a green felt-paper cap with a yellow feather between the ears, a green jerkin with a brown belt,
     and a small paper axe strapped to the back (decoration only).
   Pip wears no blue, Bo no orange or red; different headgear; eyes, sprout and ears stay visible. The cape, hood tip
   and feather flutter while running: a part with .userData.flutter(speed, t) is moved by the level each frame.
*/
'use strict';

(function () {
  const T = K3D.T, P = POPUP;
  const BW = K3D.HERO.w, BH = K3D.HERO.h, BD = K3D.HERO.d;
  // the body's cross-section (a superellipse) at a scale, for things that wrap round it
  const ringPt = (a, k) => { const c = Math.cos(a), s = Math.sin(a), e = 0.42; const f = v => Math.sign(v) * Math.pow(Math.abs(v), e); return [f(c) * BW / 2 * k, f(s) * BD / 2 * k]; };
  // a band wrapped round the body from y0 to y1 (relative to the body point), scale k, optional angle range
  function wrap(y0, y1, k0, k1, a0 = 0, a1 = Math.PI * 2, seg = 64) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (a1 - a0) * i / seg;
      for (let j = 0; j <= 1; j++) { const [x, z] = ringPt(a, j ? k1 : k0); pos.push(x, j ? y1 : y0, z); uv.push(i / seg, j); }
      if (i < seg) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const feltTex = (key, base, seed) => K3D.paint(key, 256, 256, (c, w, h) => {
    P.paper(c, w, h, base, seed); const r = P.rng(seed + 1);
    for (let i = 0; i < 900; i++) { c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)'; c.fillRect(r() * w, r() * h, 1 + r() * 2, 1); }
    // a fold crease or two
    c.strokeStyle = 'rgba(0,0,0,0.16)'; c.lineWidth = 2; c.beginPath(); c.moveTo(w * 0.5, 0); c.lineTo(w * 0.46, h); c.stroke();
  }, { repeat: true });

  // a sheet that follows the hero's rounded body (the same superellipsoid as K3D.roundBox): over the shoulders it hugs
  // the curve, below the widest point it hangs straight down and flares a little, like cloth. Heights from the feet.
  // aTop/aBot: the angle ranges [from, to] at the top and the hem (pi/2 is the face, so the back is pi..2pi).
  const BP = 0.6;
  function drape(yTop, yBot, aTop, aBot, gap, flare, rows = 18, seg = 40) {
    const f = v => Math.sign(v) * Math.pow(Math.abs(v), BP);
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= rows; j++) {
      const t = j / rows, y = yTop + (yBot - yTop) * t;
      const v = Math.max(-1, Math.min(1, (y - BH / 2) / (BH / 2)));
      const cth = Math.pow(Math.abs(v), 1 / BP), sc = y > BH / 2 ? Math.pow(Math.sqrt(Math.max(0, 1 - cth * cth)), BP) : 1;
      const a0 = aTop[0] + (aBot[0] - aTop[0]) * t, a1 = aTop[1] + (aBot[1] - aTop[1]) * t, k = sc + gap + flare * t * t;
      for (let i = 0; i <= seg; i++) {
        const a = a0 + (a1 - a0) * i / seg;
        // a soft fold every so often, so it reads as cloth and not a shell
        const fold = 1 + Math.sin(i / seg * Math.PI * 6) * 0.025 * t;
        pos.push(f(Math.cos(a)) * BW / 2 * k * fold + Math.cos(a) * 0.012, y, f(Math.sin(a)) * BD / 2 * k * fold + Math.sin(a) * 0.012);
        uv.push(i / seg, 1 - t);
        if (i < seg && j < rows) { const b = j * (seg + 1) + i; idx.push(b, b + 1, b + seg + 1, b + 1, b + seg + 2, b + seg + 1); }
      }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  /* ---------- Pip: Little Red Riding Hood ---------- */
  K3D.definePart3('pcCape', (o, x) => {
    const g = new T.Group();
    const red = K3D.toon('#ffffff', { map: feltTex('pcRedFelt', '#c8302e', 701), side: T.FrontSide });
    const lining = K3D.toon('#8e1f22', { side: T.BackSide });
    // the cape hangs from just under the hood's rim, over the shoulders, down the back to just above the feet.
    // At the top it wraps a little round the front (to the tie at the chin); lower down it opens to the back.
    const yTop = BH * 0.86, yBot = BH * 0.1, body = BH * 0.17;
    const cape = new T.Group(); cape.position.set(0, yTop - body, 0); g.add(cape);
    const geo = drape(yTop, yBot, [Math.PI * 0.74, Math.PI * 2.26], [Math.PI * 0.93, Math.PI * 2.07], 0.035, 0.12).translate(0, -yTop, 0);
    cape.add(K3D.mesh(geo, red, { ink: '#6a1a18', inkW: 0.9 }));
    cape.add(K3D.mesh(geo, lining, { ink: false, cast: false }));
    // a white cut edge along the hem
    const hem = drape(yBot + 0.035, yBot, [Math.PI * 0.925, Math.PI * 2.075], [Math.PI * 0.93, Math.PI * 2.07], 0.04, 0.125, 1).translate(0, -yTop, 0);
    cape.add(K3D.mesh(hem, K3D.toon(P.EDGE, { side: T.DoubleSide }), { ink: false, cast: false }));
    g.userData.flutter = (sp, t) => { cape.rotation.x = -Math.min(0.32, sp * 0.3) - Math.sin(t * 14) * 0.035 * sp; };
    void x; void o;
    return g;
  });
  K3D.PARTS3.pcCape.at = 'body';
  K3D.definePart3('pcHood', (o, x) => {
    const g = new T.Group();
    const red = K3D.toon('#ffffff', { map: feltTex('pcRedFelt', '#c8302e', 701), side: T.DoubleSide });
    // a soft shell over the top and back of the head, pushed back off the face, gathered into a point behind
    // (three's sphere puts phi = pi/2 at +z, the face: leave a wide opening there)
    const shell = new T.SphereGeometry(0.5, 32, 16, Math.PI * 0.86, Math.PI * 1.28, 0, Math.PI * 0.62);
    const hood = K3D.mesh(shell, red, { ink: '#6a1a18', inkW: 0.9 });
    hood.scale.set(0.82, 0.55, 0.86); hood.position.set(0, -0.06, -0.08); g.add(hood);
    const tip = new T.Group(); tip.position.set(0, 0.06, -0.48); g.add(tip);
    const cone = K3D.mesh(new T.ConeGeometry(0.13, 0.34, 12).rotateX(-Math.PI / 2 - 0.5).translate(0, 0.02, -0.12), red, { ink: '#6a1a18', inkW: 0.9 });
    tip.add(cone);
    // the cream ribbon bow under the chin (at the front of the shell's rim)
    const ribbon = K3D.toon('#f3e6c4', { side: T.DoubleSide });
    const bow = new T.Group(); bow.position.set(0.0, -BH * 0.76, 0.335); g.add(bow);
    for (const s of [-1, 1]) {
      const loop = P.card(P.shapeFrom([[0, 0], [s * 0.13, 0.07], [s * 0.15, -0.05]]), { mat: ribbon, depth: 0.015, ink: '#8a7040', inkW: 0.6 });
      bow.add(loop);
      const tail = P.card(P.shapeFrom([[0, 0], [s * 0.035, -0.14], [s * 0.075, -0.12], [s * 0.025, 0]]), { mat: ribbon, depth: 0.012, ink: '#8a7040', inkW: 0.6 });
      bow.add(tail);
    }
    const knot = K3D.mesh(new T.SphereGeometry(0.03, 10, 8), ribbon, { ink: '#8a7040', inkW: 0.6 }); bow.add(knot);
    x.hero.userData.sproutLift = 0.07;
    g.userData.flutter = (sp, t) => { tip.rotation.x = -Math.min(0.6, sp * 0.5) + Math.sin(t * 13) * 0.08 * sp; };
    return g;
  });
  K3D.definePart3('pcBasket', (o, x) => {
    const g = new T.Group();
    const wicker = K3D.paint('pcWicker', 128, 64, (c, w, h) => { c.fillStyle = '#c89a5a'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(90,60,25,0.6)'; c.lineWidth = 2; for (let y = 4; y < h; y += 8) { c.beginPath(); for (let xx = 0; xx <= w; xx += 8) c.lineTo(xx, y + ((xx / 8) % 2 ? 2 : -2)); c.stroke(); } for (let xx = 0; xx < w; xx += 10) { c.beginPath(); c.moveTo(xx, 0); c.lineTo(xx, h); c.stroke(); } }, { repeat: true });
    const bk = K3D.mesh(new T.CylinderGeometry(0.14, 0.11, 0.14, 14, 1, true), K3D.toon('#ffffff', { map: wicker, side: T.DoubleSide }), { ink: '#5a3a14', inkW: 0.7 });
    g.add(bk);
    const bottom = new T.Mesh(new T.CircleGeometry(0.11, 14).rotateX(Math.PI / 2), K3D.toon('#a07a40')); bottom.position.y = -0.07; g.add(bottom);
    const handle = K3D.mesh(new T.TorusGeometry(0.12, 0.012, 6, 16, Math.PI), K3D.toon('#a07a40'), { ink: '#5a3a14', inkW: 0.6 }); handle.position.y = 0.07; g.add(handle);
    // a checked cloth and a loaf peeking out
    const cloth = K3D.mesh(new T.SphereGeometry(0.12, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), K3D.toon('#f3ead2'), { ink: '#8a7040', inkW: 0.5 }); cloth.scale.y = 0.4; cloth.position.y = 0.05; g.add(cloth);
    g.position.set(0, -0.02, -0.12); g.rotation.x = 0.15;
    void x;
    return g;
  });
  K3D.PARTS3.pcBasket.at = 'back';

  /* ---------- Bo: the woodcutter ---------- */
  K3D.definePart3('pcCap', (o, x) => {
    const g = new T.Group();
    const green = K3D.toon('#ffffff', { map: feltTex('pcGreenFelt', '#3f7a3a', 711), side: T.DoubleSide });
    // a soft dome sitting between the ears, a short brim at the front, a white cut edge round its rim
    const dome = K3D.mesh(new T.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), green, { ink: '#1f3a1c', inkW: 0.9 });
    dome.scale.set(1, 0.72, 1.05); g.add(dome);
    const rim = K3D.mesh(new T.TorusGeometry(0.2, 0.018, 6, 28).rotateX(Math.PI / 2), K3D.toon(P.EDGE), { ink: '#1f3a1c', inkW: 0.6 }); rim.scale.z = 1.05; g.add(rim);
    const brim = P.card(P.shapeFrom([[-0.17, 0], [0.17, 0], [0.12, 0.13], [-0.12, 0.13]]), { mat: green, depth: 0.02, ink: '#1f3a1c', inkW: 0.7 });
    brim.rotation.x = -Math.PI / 2 + 0.15; brim.position.set(0, 0.01, 0.18); g.add(brim);
    // the yellow feather, tucked into the band on the left, sweeping back
    const quill = new T.Group(); quill.position.set(-0.14, 0.06, -0.02); g.add(quill);
    const ftex = K3D.paint('pcFeather', 64, 256, (c, w, h) => { c.fillStyle = '#f2c14e'; c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.45, h * 0.48, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#b8862a'; c.lineWidth = 3; c.beginPath(); c.moveTo(w / 2, h); c.lineTo(w / 2, 0); c.stroke(); c.lineWidth = 1; for (let y = 20; y < h; y += 12) { c.beginPath(); c.moveTo(w / 2, y); c.lineTo(4, y - 10); c.moveTo(w / 2, y); c.lineTo(w - 4, y - 10); c.stroke(); } });
    const fs = new T.Shape(); fs.moveTo(0, 0); fs.quadraticCurveTo(0.06, 0.16, 0.0, 0.34); fs.quadraticCurveTo(-0.06, 0.16, 0, 0);
    const feather = P.card(fs, { tex: ftex, depth: 0.012, ink: '#8a6a1a', inkW: 0.6 });
    feather.rotation.set(-0.8, 0.3, 0.35); quill.add(feather);
    g.position.set(0, -0.02, 0.02);
    x.hero.userData.earsOut = true;
    g.userData.flutter = (sp, t) => { quill.rotation.x = -Math.min(0.35, sp * 0.3) + Math.sin(t * 15) * 0.07 * sp; };
    return g;
  });
  K3D.definePart3('pcJerkin', (o, x) => {
    const g = new T.Group();
    const green = K3D.toon('#ffffff', { map: feltTex('pcJerkinFelt', '#4a8a3e', 721), side: T.DoubleSide });
    const j = K3D.mesh(wrap(-0.13, 0.15, 1.06, 1.045), green, { ink: '#1f3a1c', inkW: 0.8 }); g.add(j);
    // a V at the front collar (a card notch) and lacing
    const lace = new T.Group(); g.add(lace);
    const [fx, fz] = ringPt(Math.PI / 2, 1.07);
    for (let k = 0; k < 3; k++) { const l = K3D.mesh(K3D.geo('pcLace', () => new T.BoxGeometry(0.09, 0.012, 0.01)), K3D.mat('pcLaceM', () => K3D.toon('#e8d8a8')), { ink: false, cast: false }); l.position.set(fx, 0.11 - k * 0.05, fz + 0.005); l.rotation.z = k % 2 ? 0.5 : -0.5; lace.add(l); }
    // the brown belt with a brass buckle
    const belt = K3D.mesh(wrap(-0.13, -0.06, 1.075, 1.075), K3D.toon('#6a4426', { side: T.DoubleSide }), { ink: '#2e1c10', inkW: 0.7 }); g.add(belt);
    const buckle = K3D.mesh(new T.BoxGeometry(0.1, 0.08, 0.02), K3D.mat('brass', () => K3D.toon('#d9a640')), { ink: '#5a3d14', inkW: 0.6 }); buckle.position.set(fx, -0.095, fz + 0.02); g.add(buckle);
    g.position.y = 0.0;
    void x;
    return g;
  });
  K3D.PARTS3.pcJerkin.at = 'body';
  K3D.definePart3('pcAxe', (o, x) => {
    const g = new T.Group();
    const handle = K3D.mesh(new T.CylinderGeometry(0.018, 0.022, 0.5, 8), K3D.toon('#9a6a3e'), { ink: '#3e2410', inkW: 0.6 }); g.add(handle);
    const bladeTex = K3D.paint('pcAxeBlade', 128, 128, (c, w, h) => { c.fillStyle = '#b8bcc8'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(w * 0.7, 0, w * 0.3, h); c.strokeStyle = 'rgba(40,40,60,0.4)'; c.lineWidth = 2; c.strokeRect(4, 4, w - 8, h - 8); });
    const blade = P.card(P.shapeFrom([[0, -0.07], [0.12, -0.11], [0.15, 0], [0.12, 0.11], [0, 0.07]]), { tex: bladeTex, depth: 0.02, ink: '#3a3a48', inkW: 0.7 });
    blade.position.set(0.015, 0.2, 0); g.add(blade);
    // two short dark leather straps across the handle, each with a brass buckle (they hold it on the back)
    for (const y of [0.03, -0.15]) {
      const strap = K3D.mesh(K3D.geo('pcAxeStrap', () => new T.BoxGeometry(0.2, 0.045, 0.014)), K3D.mat('pcAxeStrapM', () => K3D.toon('#3e2414')), { ink: false, cast: false }); strap.position.set(0, y, 0.022); g.add(strap);
      const buckle = K3D.mesh(K3D.geo('pcAxeBuckle', () => new T.BoxGeometry(0.035, 0.055, 0.016)), K3D.mat('pcAxeBuckleM', () => K3D.toon('#d8b050')), { ink: false, cast: false }); buckle.position.set(0.06, y, 0.03); g.add(buckle);
    }
    g.rotation.z = 0.75; g.position.set(0, 0.0, -0.04);
    void x;
    return g;
  });
  K3D.PARTS3.pcAxe.at = 'back';

  K3D.defineOutfit3('popchase', {
    pip: [['pcCape', {}], ['pcHood', {}], ['pcBasket', {}]],
    bo: [['pcCap', {}], ['pcJerkin', {}], ['pcAxe', {}]],
  });
})();
