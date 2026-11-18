/* Pip & Bo - 41-3 Paper Dragon Flight: the riders' outfit 'popdragon', in 3D and as a matching 2D outfit (previews,
   world page, title run). Dragon riders kitted out from the desk drawer: all cut and folded paper with visible folds and
   a white cut edge. They are seen mostly from behind, so the backs matter.
   Pip: a folded newspaper helmet (the classic paper-hat fold, tiny printed columns) with the sprout through the peak,
   round card goggles with yellow cellophane lenses pushed up on the hat, a long red crepe-paper scarf, and a paper star
   badge on the back. Bo: a brown card flying cap between the ears with a strap under the chin, green cellophane goggles
   on the forehead, a long green crepe-paper scarf, and a pair of tiny folded paper wings on the back.
   Pip wears no blue (the newsprint is grey and black), Bo no orange or red (brown card, green).
   The 3D parts are defined by POPDRAGON_OUTFITS.define3() once the 3D kit is in (the level's scene3d calls it). The
   scarves' long tails are chains of joints the level bends in the wind each frame (POPDRAGON_OUTFITS.wind).
*/
'use strict';

/* ---------- 2D (previews, the world page, the title run) ---------- */
defineOutfitPart('pdNewsHat', { layer: 'head', lift: 9, draw(c, o, k) {
  // a folded newspaper hat: a triangle with a folded-up brim band, printed columns, yellow card goggles on the front
  const g = c.g, ink = OF_INK, f = c.face >= 0 ? 1 : -1;
  g.save(); g.translate(0, -24.5);
  g.beginPath(); g.moveTo(-12.5, 1); g.lineTo(f * 1.5, -12.5); g.lineTo(12.5, 1); g.closePath(); ofFillStroke(g, '#ecebe4', ink, 1.3);
  g.save(); g.clip(); g.fillStyle = 'rgba(40,40,46,0.45)';
  for (let y = -9; y < 0; y += 2.2) for (let x = -10; x < 10; x += 5) g.fillRect(x, y, 3.6, 0.9);
  g.fillStyle = 'rgba(30,30,36,0.7)'; g.fillRect(-7, -7.5, 9, 1.6);
  g.restore();
  g.strokeStyle = 'rgba(40,40,46,0.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(f * 1.5, -12.5); g.lineTo(f * 0.5, 0); g.stroke(); // the fold
  ofRR(g, -13, -1.5, 26, 4, 1); ofFillStroke(g, '#dcdbd2', ink, 1.1);
  g.restore();
  // round card goggles, yellow cellophane, pushed up on the hat
  for (const x of [-4.6, 4.6]) { ofCircle(g, x + f, -27.6, 3); ofFillStroke(g, 'rgba(255,214,60,0.8)', '#5a4630', 1.4); }
  g.strokeStyle = '#5a4630'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-1.6 + f, -27.6); g.lineTo(1.6 + f, -27.6); g.stroke();
} });
defineOutfitPart('pdStarBadge', { layer: 'back', draw(c, o, k) {
  // the paper star on Pip's back peeks out on the side away from the face
  const g = c.g, b = c.face >= 0 ? -1 : 1;
  g.fillStyle = '#ffd23f'; ofStar(g, b * 10, -11, 3.6); g.fill(); g.strokeStyle = OF_INK; g.lineWidth = 1; g.stroke();
} });
defineOutfit('popdragon', {
  pip: [['pdStarBadge', {}], ['scarf', { col: '#d63a3a', stripe: '#f08080' }], ['pdNewsHat', {}]],
  bo: [['wings', { col: 'rgba(250,247,236,0.95)' }], ['scarf', { col: '#3f9a57', stripe: '#7cc48a' }], ['pilotcap', { col: '#8a6a42', lens: 'rgba(110,210,120,0.8)' }]],
});

/* ---------- 3D ---------- */
const POPDRAGON_OUTFITS = {
  done: false,
  define3() {
    if (this.done) return;
    this.done = true;
    const T = K3D.T, P = POPUP, K3 = K3D;
    const BW = K3.HERO.w, BD = K3.HERO.d;
    const ringPt = (a, k) => { const c = Math.cos(a), s = Math.sin(a), q = 2 / 0.42; const f = v => Math.sign(v) * Math.pow(Math.abs(v), 2 / q); return [f(c) * BW / 2 * k, f(s) * BD / 2 * k]; };
    // a crepe-paper scarf: a crinkled band round the neck, a knot at the back and a long tail (a chain of joints)
    const scarf = (col, dark, key) => (o, x) => {
      const g = new T.Group();
      const crepe = K3.paint('pdCrepe|' + key, 64, 256, (c, w, h) => {
        c.fillStyle = col; c.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 3) { c.fillStyle = y % 6 ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.12)'; c.fillRect(0, y, w, 1.5); }
        c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(0, 0, w, 3); c.fillRect(0, h - 3, w, 3);
      }, { repeat: true });
      const m = K3.mat('pdCrepeM|' + key, () => K3.toon('#ffffff', { map: crepe, side: T.DoubleSide }));
      const pts = []; for (let i = 0; i < 40; i++) { const [px, pz] = ringPt(i / 40 * Math.PI * 2, 1.07); pts.push(new T.Vector3(px, Math.sin(i * 1.7) * 0.008, pz)); }
      const band = K3.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 64, 0.05, 8, true), m, { ink: dark, inkW: 0.8 });
      band.scale.set(1, 1.4, 1); g.add(band);
      const knot = K3.mesh(new T.SphereGeometry(0.075, 12, 8), m, { ink: dark, inkW: 0.8 }); knot.position.set(0.05, 0, -BD / 2 - 0.04); knot.scale.set(1, 0.8, 0.7); g.add(knot);
      // the tail: 7 joints of crinkled strip, each hanging off the last, so the wind can bend it
      const joints = [];
      let parent = new T.Group(); parent.position.copy(knot.position); g.add(parent);
      const segG = K3.geo('pdScarfSeg', () => new T.PlaneGeometry(0.11, 0.17).translate(0, -0.085, 0));
      for (let i = 0; i < 7; i++) {
        const j = new T.Group(); parent.add(j);
        const strip = K3.mesh(segG, m, { ink: dark, inkW: 0.6, cast: i < 3 }); j.add(strip);
        if (i === 6) { const fr = K3.mesh(new T.PlaneGeometry(0.13, 0.06).translate(0, -0.2, 0), K3.mat('edge|' + P.EDGE, () => K3.toon(P.EDGE, { side: T.DoubleSide })), { ink: false }); j.add(fr); }
        joints.push(j);
        const nx = new T.Group(); nx.position.y = -0.165; j.add(nx); parent = nx;
      }
      x.hero.userData.scarf = joints;
      g.position.y = 0.0;
      return g;
    };
    K3.definePart3('pdScarfRed', { at: 'body', build: scarf('#d63a3a', '#6a1418', 'red') });
    K3.definePart3('pdScarfGreen', { at: 'body', build: scarf('#3f9a57', '#1f5a34', 'green') });
    // Pip's newspaper hat
    K3.definePart3('pdNewsHat', (o, x) => {
      const g = new T.Group();
      const news = K3.paint('pdNews', 512, 512, (c, w, h) => {
        P.paper(c, w, h, '#efeee6', 401); const r = P.rng(402);
        c.fillStyle = 'rgba(30,30,36,0.85)'; c.font = 'bold 54px Georgia, "DejaVu Serif", serif'; c.textAlign = 'center'; c.fillText('THE ATTIC TIMES', w / 2, 70);
        c.fillRect(20, 84, w - 40, 4);
        c.font = 'bold 30px Georgia, "DejaVu Serif", serif'; c.fillText('DRAGON SEEN OVER DESK', w / 2, 130);
        // columns of tiny type and a little picture
        for (let col = 0; col < 4; col++) for (let y = 150; y < h - 20; y += 11) {
          if (col === 1 && y > 180 && y < 300) continue;
          const x0 = 24 + col * (w - 48) / 4, len = (w - 48) / 4 - 14;
          c.fillStyle = 'rgba(40,40,46,' + (0.35 + r() * 0.2) + ')'; c.fillRect(x0, y, len * (y % 77 < 11 ? 0.6 : 1), 5);
        }
        c.fillStyle = 'rgba(40,40,46,0.4)'; c.fillRect(24 + (w - 48) / 4, 186, (w - 48) / 4 - 14, 110);
        c.strokeStyle = 'rgba(40,40,46,0.4)'; c.lineWidth = 2; for (let col = 1; col < 4; col++) { const xx = 24 + col * (w - 48) / 4 - 7; c.beginPath(); c.moveTo(xx, 150); c.lineTo(xx, h - 20); c.stroke(); }
        // a fold crease down the middle
        c.strokeStyle = 'rgba(90,80,60,0.35)'; c.lineWidth = 3; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke();
      });
      const face = K3.mat('pdNewsM', () => K3.toon('#ffffff', { map: news, side: T.DoubleSide }));
      const hw = 0.5, hh = 0.5, lean = 0.3;
      for (const s of [-1, 1]) {
        const tri = P.card(P.shapeFrom([[-hw, 0], [hw, 0], [0.02, hh]]), { mat: face, depth: 0.016, ink: '#3a3a40', inkW: 0.8 });
        tri.position.z = s * 0.15; tri.rotation.x = -s * lean; g.add(tri);
        const band = P.card(P.shapeFrom([[-hw - 0.03, 0], [hw + 0.03, 0], [hw - 0.04, 0.13], [-hw + 0.04, 0.13]]), { mat: face, depth: 0.02, ink: '#3a3a40', inkW: 0.8 });
        band.position.set(0, -0.02, s * 0.19); band.rotation.x = -s * (lean - 0.14); g.add(band);
      }
      // the round card goggles with yellow cellophane, pushed up on the front of the hat
      const goggle = new T.Group(); goggle.position.set(0, 0.2, 0.2); goggle.rotation.x = -0.32; g.add(goggle);
      const rimM = K3.mat('pdGogRimY', () => K3.toon('#7a5a36')), lensM = K3.mat('pdLensY', () => K3.toon('#ffd23c', { transparent: true, opacity: 0.78, emissive: '#5a4000', emissiveIntensity: 0.35 }));
      for (const sx of [-1, 1]) {
        const rim = K3.mesh(K3.geo('pdGogRim', () => new T.TorusGeometry(0.085, 0.024, 8, 20)), rimM, { ink: '#2b2130', inkW: 0.6 }); rim.position.x = sx * 0.12; goggle.add(rim);
        const lens = new T.Mesh(K3.geo('pdGogLens', () => new T.CircleGeometry(0.08, 20)), lensM); lens.position.set(sx * 0.12, 0, 0.005); goggle.add(lens);
      }
      const bridge = K3.mesh(new T.BoxGeometry(0.08, 0.02, 0.02), rimM, { ink: false }); goggle.add(bridge);
      g.position.set(0, -0.06, 0); g.rotation.z = -0.05;
      x.hero.userData.sproutLift = 0.42;
      return g;
    });
    // Pip's paper star badge on the back
    K3.definePart3('pdStarBack', { at: 'back', build: (o, x) => {
      const sh = new T.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 0.07 : 0.16; i ? sh.lineTo(Math.cos(a) * rr, -Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr, -Math.sin(a) * rr); }
      sh.closePath();
      const st = P.card(sh, { col: '#ffd23f', depth: 0.02, ink: '#7a5a10', inkW: 0.8 });
      st.rotation.y = Math.PI; st.position.set(0, 0.06, -0.02);
      return st;
    } });
    // Bo's brown card flying cap: a dome between the ears, ear flaps, a strap under the chin, green goggles on the forehead
    K3.definePart3('pdFlyCap', (o, x) => {
      const g = new T.Group();
      const cardTex = K3.paint('pdBrownCard', 256, 256, (c, w, h) => {
        P.paper(c, w, h, '#8a6a42', 411); const r = P.rng(412);
        for (let i = 0; i < 40; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,230,190,0.12)' : 'rgba(60,40,20,0.15)'; c.fillRect(r() * w, r() * h, 2 + r() * 12, 1); }
        c.strokeStyle = 'rgba(60,40,20,0.5)'; c.lineWidth = 2; c.setLineDash([6, 5]);
        for (const xx of [w * 0.33, w * 0.66]) { c.beginPath(); c.moveTo(xx, 0); c.lineTo(xx, h); c.stroke(); }
      });
      const capM = K3.mat('pdCapM', () => K3.toon('#ffffff', { map: cardTex, side: T.DoubleSide }));
      const dome = K3.mesh(new T.SphereGeometry(0.29, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), capM, { ink: '#3a2614', inkW: 0.9 });
      dome.scale.set(1, 0.62, 1.05); g.add(dome);
      // a peaked fold at the front (card is folded, not stitched)
      const peak = P.card(P.shapeFrom([[-0.22, 0], [0.22, 0], [0.16, 0.1], [-0.16, 0.1]]), { mat: capM, depth: 0.018, ink: '#3a2614', inkW: 0.8 });
      peak.rotation.x = -1.2; peak.position.set(0, 0.01, 0.27); g.add(peak);
      // ear flaps hanging down past the cheeks, joined by a strap under the chin
      for (const sx of [-1, 1]) {
        const flap = P.card(P.shapeFrom([[-0.07, 0], [0.07, 0], [0.06, -0.3], [0, -0.34], [-0.06, -0.3]]), { mat: capM, depth: 0.018, ink: '#3a2614', inkW: 0.8 });
        flap.position.set(sx * 0.34, 0.02, 0.04); flap.rotation.set(0, sx * Math.PI / 2, sx * 0.06); g.add(flap);
      }
      const strapPts = []; for (let i = 0; i <= 12; i++) { const a = Math.PI * (i / 12); strapPts.push(new T.Vector3(Math.cos(a) * 0.36, -0.34 - Math.sin(a) * 0.1, 0.06 + Math.sin(a) * 0.32)); }
      const strap = K3.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(strapPts), 16, 0.014, 5), K3.mat('pdStrap', () => K3.toon('#5a4028')), { ink: false });
      g.add(strap);
      // green cellophane goggles on the forehead
      const goggle = new T.Group(); goggle.position.set(0, 0.06, 0.3); goggle.rotation.x = -0.45; g.add(goggle);
      const rimM = K3.mat('pdGogRimG', () => K3.toon('#4a3420')), lensM = K3.mat('pdLensG', () => K3.toon('#6ed27a', { transparent: true, opacity: 0.78, emissive: '#0a4010', emissiveIntensity: 0.35 }));
      for (const sx of [-1, 1]) {
        const rim = K3.mesh(K3.geo('pdGogRim', () => new T.TorusGeometry(0.085, 0.024, 8, 20)), rimM, { ink: '#2b2130', inkW: 0.6 }); rim.position.x = sx * 0.12; goggle.add(rim);
        const lens = new T.Mesh(K3.geo('pdGogLens', () => new T.CircleGeometry(0.08, 20)), lensM); lens.position.set(sx * 0.12, 0, 0.005); goggle.add(lens);
      }
      g.position.set(0, -0.07, -0.02);
      x.hero.userData.earsOut = true;
      return g;
    });
    // Bo's tiny folded paper wings on the back
    K3.definePart3('pdBackWings', { at: 'back', build: (o, x) => {
      const g = new T.Group();
      for (const sx of [-1, 1]) {
        const w = P.card(P.shapeFrom([[0, 0], [0.26, 0.12], [0.3, 0.02], [0.22, -0.02], [0.24, -0.08], [0.12, -0.06]]), { col: '#faf6ea', depth: 0.012, ink: '#7a7488', inkW: 0.7 });
        const piv = new T.Group(); piv.add(w); w.scale.x = sx; piv.rotation.y = -sx * 0.5; piv.position.set(sx * 0.04, 0.04, -0.03); g.add(piv);
      }
      x.hero.userData.backWings = g;
      return g;
    } });
    K3.defineOutfit3('popdragon', {
      pip: [['pdNewsHat', {}], ['pdScarfRed', {}], ['pdStarBack', {}]],
      bo: [['pdFlyCap', {}], ['pdScarfGreen', {}], ['pdBackWings', {}]],
    });
  },
  // bend a rider's scarf tail in the wind: it streams back (local -Z of the hero) and snaps in turns
  wind(hero, t, speed, turn) {
    const js = hero.userData.scarf; if (!js) return;
    const k = Math.min(1, speed / 6);
    js.forEach((j, i) => {
      const flut = Math.sin(t * 13 + i * 0.9) * (0.12 + 0.18 * k) + Math.sin(t * 7.3 + i * 1.7) * 0.06;
      j.rotation.set(i === 0 ? (0.5 + 0.95 * k) : 0.1 * k + flut, i === 0 ? 0 : turn * 0.25, Math.sin(t * 9 + i) * 0.14 * k + turn * 0.1);
    });
    if (hero.userData.backWings) hero.userData.backWings.children.forEach((p, i) => { p.rotation.z = Math.sin(t * 14 + i * Math.PI) * 0.12; });
  },
};
