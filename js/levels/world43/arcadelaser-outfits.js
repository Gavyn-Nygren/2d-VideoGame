/* Pip & Bo - 43-4 Laser Tag Arena: the 3D outfit 'arcadelaser' (padded tag vests, glow paint, chunky toy blasters).
   Loaded on demand with the 3D kit. The matching 2D outfit (previews, world page, title run) is
   defineOutfit('arcadelaser') in laser-tag-arena.js.
   Seen small, from above and behind, in the dark: each reads by shape and by light. The vest lights are the players' own
   colours and are what gets tagged, so they are the brightest thing on each hero. Glow paint and white trim fluoresce
   under the black light.
   Pip: a padded black and yellow tag vest (quilted, stitched) with glowing orange light panels on the chest, the back
   and both shoulders and a light strip round its hem; a yellow sweatband with the sprout standing above it; two stripes
   of green glow paint on each cheek; yellow knee pads. A chunky rounded white and orange toy blaster on a coiled cable.
   Bo: a padded white and teal vest with glowing blue panels and strip; a teal cap worn backwards between the ears; dots
   of white glow paint under the eyes; purple elbow pads. A chunky rounded white and blue toy blaster on a coiled cable.
   ARCADELASER_GEAR.blaster(id) builds a blaster (the show holds it in the hero's hands); hero.userData.vest = { lights:
   [materials], base: Color } so the show can flash a vest white, switch it off when tagged and back on. */
'use strict';

const ARCADELASER_GEAR = (function () {
  const T = K3D.T, G3 = {};
  const BW = K3D.HERO.w, BH = K3D.HERO.h, BD = K3D.HERO.d;
  const INK = '#120d14';
  const mk = (geo, mat, o) => K3D.mesh(geo, mat, o);
  const def3 = (n, fn, o) => K3D.definePart3(n, Object.assign({ build: fn }, o || {}));
  // the half width and half depth of the body at a height (the body is a superellipsoid, roundness 0.6)
  const bodyHalf = y => { const v = Math.min(0.999, Math.abs(y - BH / 2) / (BH / 2)); const u = Math.pow(1 - Math.pow(v, 1 / 0.3), 0.3); return [BW / 2 * u, BD / 2 * u]; };
  G3.bodyHalf = bodyHalf;
  // quilted padding with stitched seams
  const quilt = (col, line, key) => K3D.paint('al-quilt|' + key, 256, 128, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) for (let y = 0; y < h; y += 32) {
      const g = c.createRadialGradient(x + 16, y + 14, 2, x + 16, y + 16, 22);
      g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0.22)');
      c.fillStyle = g; c.fillRect(x, y, 32, 32);
    }
    c.strokeStyle = line; c.lineWidth = 1.2; c.setLineDash([3, 3]);
    for (let x = 0; x <= w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y <= h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.setLineDash([]);
  }, { repeat: true });
  // a light panel: a frosted lens with a bright core, so it reads as a lamp, not a sticker
  const lens = () => K3D.paint('al-lens', 128, 64, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#f0f0f0'); g.addColorStop(1, '#8a8a8a');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2;
    for (let x = 10; x < w; x += 12) { c.beginPath(); c.moveTo(x, 4); c.lineTo(x, h - 4); c.stroke(); }
  });
  function vestLights(hero) {
    const u = hero.userData;
    if (!u.vest) {
      const base = new T.Color(PCOL[u.id]).multiplyScalar(2.6);
      u.vest = { base, lights: [] };
    }
    return u.vest;
  }
  function lightMat(hero, k = 1) {
    const v = vestLights(hero);
    const m = new T.MeshBasicMaterial({ color: v.base.clone().multiplyScalar(k), map: lens(), toneMapped: false });
    m.userData.k = k; v.lights.push(m);
    return m;
  }

  /* ---------- the vest ---------- */
  function vest(o, x) {
    const g = new T.Group();
    const pad = K3D.toon('#ffffff', { map: quilt(o.pad, o.seam, o.key) });
    const trim = K3D.toon(o.trim);
    const y0 = 0.035, h = 0.27, [hw, hd] = bodyHalf(y0 + h / 2);
    // the padded band round the body (a little proud of it)
    const band = mk(K3D.roundBox(hw * 2 + 0.07, h, hd * 2 + 0.07, 0.42, 36), pad, { ink: INK, inkW: 1 });
    band.position.y = y0; g.add(band);
    // the trim stripes (yellow on Pip's, teal on Bo's) and the glowing hem strip
    for (const [yy, th] of [[0.2, 0.035], [0.11, 0.025]]) {
      const [a, b] = bodyHalf(y0 + yy);
      const s = new T.Mesh(new T.CylinderGeometry(1, 1, th, 40, 1, true), trim); s.scale.set(a + 0.043, 1, b + 0.043); s.position.y = y0 + yy; g.add(s);
    }
    const [ha, hb] = bodyHalf(y0 + 0.02);
    const hem = new T.Mesh(new T.TorusGeometry(1, 0.012, 6, 48), lightMat(x.hero, 0.9)); hem.rotation.x = Math.PI / 2; hem.scale.set(ha + 0.045, hb + 0.045, 1); hem.position.y = y0 + 0.02; g.add(hem);
    // the chest panel and the big back panel (the targets)
    const fz = hd + 0.04;
    const chest = mk(K3D.roundBox(0.3, 0.13, 0.05, 0.5, 20).translate(0, -0.065, 0), lightMat(x.hero, 1.1), { ink: INK, inkW: 0.8, cast: false });
    chest.position.set(0, y0 + h * 0.55, fz); g.add(chest);
    const housing = mk(K3D.roundBox(0.36, 0.17, 0.04, 0.5, 20).translate(0, -0.085, 0), K3D.toon('#2a2630'), { ink: false });
    housing.position.set(0, y0 + h * 0.55, fz - 0.02); g.add(housing);
    const back = mk(K3D.roundBox(0.42, 0.16, 0.05, 0.5, 20).translate(0, -0.08, 0), lightMat(x.hero, 1.1), { ink: INK, inkW: 0.8, cast: false });
    back.position.set(0, y0 + h * 0.58, -fz); g.add(back);
    const bh = mk(K3D.roundBox(0.48, 0.2, 0.04, 0.5, 20).translate(0, -0.1, 0), K3D.toon('#2a2630'), { ink: false });
    bh.position.set(0, y0 + h * 0.58, -fz + 0.02); g.add(bh);
    // a little sensor dome on the chest panel (blinks: the show flashes the lights)
    const dome = new T.Mesh(new T.SphereGeometry(0.03, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), K3D.flat('#ffffff')); dome.rotation.x = Math.PI / 2; dome.position.set(0.11, y0 + h * 0.55 - 0.03, fz + 0.025); g.add(dome);
    // the shoulder pads on the top corners, joined to the band by straps front and back, each with its own light
    for (const sx of [-1, 1]) {
      const sy = BH - 0.16, [shw] = bodyHalf(sy);
      const sp = mk(K3D.roundBox(0.2, 0.08, 0.3, 0.5, 20), pad, { ink: INK, inkW: 0.9 });
      sp.position.set(sx * (shw - 0.04), sy, 0); sp.rotation.z = -sx * 0.55; g.add(sp);
      const sl = mk(K3D.roundBox(0.1, 0.03, 0.16, 0.5, 12), lightMat(x.hero, 1), { ink: INK, inkW: 0.6, cast: false });
      sl.position.set(sx * (shw - 0.02), sy + 0.065, 0); sl.rotation.z = -sx * 0.55; g.add(sl);
      for (const sz of [-1, 1]) {
        // the strap runs up the body's side from the band to the pad (clear of the face and the back panel)
        const pts = [];
        for (let k = 0; k <= 6; k++) { const yy = y0 + h - 0.02 + (sy - (y0 + h)) * k / 6, [a, b] = bodyHalf(yy); pts.push(new T.Vector3(sx * (a + 0.012), yy, sz * b * 0.32)); }
        const st = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 10, 0.022, 6, false), trim); st.scale.set(1, 1, 1); g.add(st);
      }
    }
    // a stencilled number on the back pad under the panel (P1 / P2) and a small "ZAP MAZE" tag on the front
    const tag = K3D.paint('al-vtag|' + o.key, 128, 48, (c, w, hh) => {
      c.clearRect(0, 0, w, hh); c.fillStyle = o.ink2; c.font = '900 30px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(o.num, w / 2, hh / 2 + 2);
    });
    const tg = new T.Mesh(new T.PlaneGeometry(0.2, 0.075), K3D.flat('#ffffff', { map: tag, transparent: true, depthWrite: false }));
    tg.rotation.y = Math.PI; tg.position.set(0, y0 + 0.07, -hd - 0.042); g.add(tg);
    g.position.y = -BH * 0.17; // (built in the hero's own heights; the body point sits 17% up)
    return g;
  }
  def3('alVest', vest, { at: 'body' });

  /* ---------- Pip: the sweatband, the green glow paint, yellow knee pads ---------- */
  def3('alBand', (o, x) => {
    const g = new T.Group(), y = BH - 0.1, [a, b] = bodyHalf(y);
    const band = mk(new T.CylinderGeometry(1, 1.02, 0.075, 40, 1, true), K3D.toon('#f2c83a', { side: T.DoubleSide }), { ink: INK, inkW: 0.8 });
    band.scale.set(a + 0.02, 1, b + 0.02); band.position.y = y - BH; g.add(band);
    // a terry-cloth rib (thin darker lines) and a little logo patch
    for (let k = 0; k < 10; k++) { const t = k / 10 * Math.PI * 2, r = new T.Mesh(new T.BoxGeometry(0.008, 0.07, 0.01), K3D.toon('#c8a028')); r.position.set(Math.sin(t) * (a + 0.026), y - BH, Math.cos(t) * (b + 0.026)); r.rotation.y = t; g.add(r); }
    x.hero.userData.sproutLift = 0.02;
    return g;
  }, { at: 'head' });
  def3('alPaintPip', () => {
    // two stripes on each cheek, green, fluorescing
    const g = new T.Group(), m = K3D.flat(K3D.hot('#5aff8a', 1.7));
    for (const sx of [-1, 1]) for (const k of [0, 1]) {
      const yy = -0.14 - k * 0.05, xx = sx * 0.22, z = K3D.roundBoxFront(BW, BH, BD, 0.6, xx, K3D.HERO.h * 0.6 + yy) - BD / 2;
      const s = new T.Mesh(new T.PlaneGeometry(0.1, 0.022), m); s.position.set(xx, yy, z + 0.006); s.rotation.y = sx * 0.45; s.rotation.z = sx * 0.12; s.userData.noSee = true; g.add(s);
    }
    return g;
  }, { at: 'face' });
  def3('alKnees', (o) => {
    const g = new T.Group();
    for (const sx of [-1, 1]) {
      const yy = 0.06, [, b] = bodyHalf(yy);
      const p = mk(K3D.roundBox(0.14, 0.1, 0.06, 0.5, 16), K3D.toon(o.col), { ink: INK, inkW: 0.7 }); p.position.set(sx * 0.17, yy - 0.04, b + 0.0); g.add(p);
    }
    g.position.y = -BH * 0.17;
    return g;
  }, { at: 'body' });

  /* ---------- Bo: the backwards cap, the white glow dots, purple elbow pads ---------- */
  def3('alCap', (o, x) => {
    const g = new T.Group(), teal = K3D.toon('#1aa89a'), dark = K3D.toon('#138a7e');
    const dome = mk(new T.SphereGeometry(0.21, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), teal, { ink: INK, inkW: 0.9 }); dome.scale.set(1, 0.72, 1.08); dome.position.y = -0.06; g.add(dome);
    // panel seams and the button on top
    for (let k = 0; k < 6; k++) { const t = k / 6 * Math.PI * 2, s = new T.Mesh(new T.TorusGeometry(0.205, 0.004, 4, 24, Math.PI / 2), dark); s.rotation.set(0, t, Math.PI / 2); s.scale.set(0.72, 1, 1.08); s.position.y = -0.06; g.add(s); }
    const btn = mk(new T.SphereGeometry(0.026, 10, 8), dark, { ink: INK, inkW: 0.5 }); btn.position.y = 0.09; g.add(btn);
    // the peak, worn at the back
    const peak = mk(new T.CylinderGeometry(0.2, 0.2, 0.02, 24, 1, false, -Math.PI * 0.42, Math.PI * 0.84), dark, { ink: INK, inkW: 0.7 });
    peak.scale.set(1, 1, 1.25); peak.position.set(0, -0.06, -0.06); peak.rotation.y = Math.PI; peak.rotation.x = 0.1; g.add(peak);
    // the strap's snap-back hole at the front (it is on backwards)
    const snap = new T.Mesh(new T.TorusGeometry(0.035, 0.008, 6, 14, Math.PI), K3D.toon('#f2f4f2')); snap.position.set(0, -0.055, 0.215); g.add(snap);
    x.hero.userData.earsOut = true;
    return g;
  }, { at: 'head' });
  def3('alPaintBo', () => {
    const g = new T.Group(), m = K3D.flat(K3D.hot('#ffffff', 1.5));
    for (const sx of [-1, 1]) for (const k of [0, 1, 2]) {
      const xx = sx * (0.12 + k * 0.045), yy = -0.1 - (k === 1 ? 0.012 : 0), z = K3D.roundBoxFront(BW, BH, BD, 0.6, xx, K3D.HERO.h * 0.6 + yy) - BD / 2;
      const d = new T.Mesh(new T.CircleGeometry(0.014, 10), m); d.position.set(xx, yy, z + 0.006); d.rotation.y = sx * 0.3; d.userData.noSee = true; g.add(d);
    }
    return g;
  }, { at: 'face' });
  def3('alElbows', (o, x) => {
    // purple pads on the little arms (so they swing with them)
    const g = new T.Group();
    for (const a of x.hero.userData.arms) {
      const p = mk(new T.SphereGeometry(0.075, 14, 10), K3D.toon('#8a5ad8'), { ink: INK, inkW: 0.6 }); p.scale.set(1, 0.8, 1); p.position.set(0, -0.12, 0); a.arm.add(p);
    }
    return g;
  }, { at: 'body' });

  K3D.defineOutfit3('arcadelaser', {
    pip: [['alVest', { pad: '#1e1a22', seam: 'rgba(242,200,58,0.7)', trim: '#f2c83a', key: 'pip', num: 'P1', ink2: '#f2c83a' }], ['alBand', {}], ['alPaintPip', {}], ['alKnees', { col: '#f2c83a' }]],
    bo: [['alVest', { pad: '#eef0ee', seam: 'rgba(26,168,154,0.7)', trim: '#1aa89a', key: 'bo', num: 'P2', ink2: '#1aa89a' }], ['alCap', {}], ['alPaintBo', {}], ['alElbows', {}]],
  });

  /* ---------- the blaster: chunky, rounded, plainly a toy ---------- */
  G3.blaster = function (id) {
    const g = new T.Group(), col = PCOL[id];
    const white = K3D.toon('#f4f2ec'), colM = K3D.toon(col), grey = K3D.toon('#4a4652');
    // the body: a fat rounded shell, a carry handle on top, a pistol grip, a trigger guard
    const body = mk(K3D.roundBox(0.15, 0.12, 0.3, 0.55, 28).translate(0, -0.06, 0), white, { ink: INK, inkW: 0.9 }); g.add(body);
    const stripe = mk(K3D.roundBox(0.155, 0.035, 0.24, 0.6, 16).translate(0, -0.0175, 0), colM, { ink: false }); stripe.position.y = 0.005; g.add(stripe);
    const handle = mk(new T.TorusGeometry(0.06, 0.016, 8, 16, Math.PI), grey, { ink: INK, inkW: 0.6 }); handle.rotation.y = Math.PI / 2; handle.position.set(0, 0.06, -0.02); g.add(handle);
    const grip = mk(K3D.roundBox(0.07, 0.13, 0.07, 0.6, 14).translate(0, -0.13, 0), colM, { ink: INK, inkW: 0.7 }); grip.position.set(0, -0.06, -0.06); grip.rotation.x = -0.25; g.add(grip);
    // the barrel: a stubby tube in the player's colour, a flared emitter with a glowing lens, four charge lights on top
    const barrel = mk(new T.CylinderGeometry(0.04, 0.045, 0.16, 16).rotateX(Math.PI / 2), colM, { ink: INK, inkW: 0.7 }); barrel.position.set(0, -0.005, 0.2); g.add(barrel);
    const flare = mk(new T.CylinderGeometry(0.065, 0.045, 0.06, 18).rotateX(Math.PI / 2), white, { ink: INK, inkW: 0.7 }); flare.position.set(0, -0.005, 0.29); g.add(flare);
    const emitM = new T.MeshBasicMaterial({ color: new T.Color(col).multiplyScalar(2.2), toneMapped: false });
    const emit = new T.Mesh(new T.CircleGeometry(0.05, 18), emitM); emit.position.set(0, -0.005, 0.321); g.add(emit);
    const charge = [];
    for (let k = 0; k < 4; k++) {
      const m = new T.MeshBasicMaterial({ color: new T.Color('#fff4d0').multiplyScalar(1.6), toneMapped: false });
      const l = new T.Mesh(new T.SphereGeometry(0.014, 8, 6), m); l.position.set(0, 0.006, -0.08 + k * 0.05); g.add(l); charge.push(m);
    }
    // a sight ring and a speaker grille on the side (where the whine comes from)
    const sight = mk(new T.TorusGeometry(0.022, 0.006, 6, 12), grey, { ink: false }); sight.position.set(0, 0.035, 0.11); g.add(sight);
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { const s = new T.Mesh(new T.BoxGeometry(0.004, 0.006, 0.06), grey); s.position.set(sx * 0.076, -0.03 - k * 0.014, -0.02); g.add(s); }
    // the coiled cable from the back of the blaster (the show bends its free end to the vest)
    const coil = [];
    for (let k = 0; k <= 60; k++) { const t = k / 60, a = t * Math.PI * 2 * 9; coil.push(new T.Vector3(-0.04 - t * 0.12 + Math.cos(a) * 0.018, -0.08 - t * 0.1 + Math.sin(a) * 0.018, -0.15 - t * 0.06)); }
    const cable = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(coil), 180, 0.006, 5, false), K3D.toon('#2a2630')); g.add(cable);
    g.userData = { emitM, charge, col };
    return g;
  };
  return G3;
})();
