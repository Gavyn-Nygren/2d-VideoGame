/* Pip & Bo - World 41, 41-4 Paper Alien Invasion: the 3D outfit 'popaliens' and the two card ray guns. Loaded on demand
   with the 3D kit. Home-made space rangers from the craft drawer: paper, card, tinfoil and cellophane, with visible
   folds and white cut edges. Seen mostly from behind and above, so backs and tops carry a lot.
     Pip: a clear cellophane fishbowl helmet (the sprout curled inside), a crinkled tinfoil chest plate with a red paper
          star, tinfoil boots, and a backpack of two cardboard tubes with red tissue flames.
     Bo:  a card helmet with an open face, two bendy-straw antennae beside the ears, a green cellophane visor pushed up,
          a white paper space suit wrap with a green stripe, tinfoil boots, a round paper satellite dish on the back.
   Pip wears no blue, Bo no orange or red; eyes, sprout and ears stay in sight.
   PAGEAR.gun(id) builds a ray gun (yellow bulb for Pip, green for Bo): .userData.set(charge 0..1, reloading 0..1, fire)
   lights the ring of 24 little charge lights, turns the paper crank and flashes the muzzle. The 2D outfit for the
   previews is defineOutfit('popaliens') in the rules file, js/levels/world41/paper-alien-invasion.js.
*/
'use strict';

const PAGEAR = (function () {
  const T = K3D.T, P = POPUP;
  const BW = K3D.HERO.w, BH = K3D.HERO.h, BD = K3D.HERO.d;
  const ringPt = (a, k) => { const c = Math.cos(a), s = Math.sin(a), q = 2 / 0.42; const f = v => Math.sign(v) * Math.pow(Math.abs(v), 2 / q); return [f(c) * BW / 2 * k, f(s) * BD / 2 * k]; };
  const G2 = {};

  /* ---------- shared surfaces ---------- */
  // crinkled kitchen foil: silver with bright creases, dark folds and a soft sheen
  const foilTex = () => K3D.paint('paFoil', 256, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#e9edf2'); g.addColorStop(0.45, '#b9c0ca'); g.addColorStop(0.7, '#f4f6f8'); g.addColorStop(1, '#a8afba');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const r = P.rng(901);
    for (let i = 0; i < 70; i++) {
      // facets: little flat polygons a shade lighter or darker, as crumpled foil catches the light
      const x = r() * w, y = r() * h, s = 10 + r() * 30;
      c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(70,80,96,0.22)';
      c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) c.lineTo(x + (r() - 0.5) * s * 2, y + (r() - 0.5) * s * 2); c.closePath(); c.fill();
    }
    c.lineWidth = 1.2;
    for (let i = 0; i < 90; i++) {
      const x = r() * w, y = r() * h, a = r() * Math.PI, l = 8 + r() * 40;
      c.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.75)' : 'rgba(60,66,80,0.4)';
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
  }, { repeat: true });
  const foilMat = () => K3D.mat('paFoilM', () => K3D.toon('#ffffff', { map: foilTex() }));
  const cellophane = col => K3D.mat('paCello|' + col, () => {
    const m = K3D.toon(col, { transparent: true, opacity: 0.28, side: T.DoubleSide, depthWrite: false });
    return m;
  });
  const cardTex = (key, base, stripe) => K3D.paint('paCard|' + key, 256, 128, (c, w, h) => {
    P.paper(c, w, h, base, key.length * 13 + 5);
    // corrugated card: faint ribs, and a printed stripe if asked
    for (let x = 0; x < w; x += 6) { c.fillStyle = 'rgba(90,70,40,0.06)'; c.fillRect(x, 0, 2, h); }
    if (stripe) { c.fillStyle = stripe; c.fillRect(0, h * 0.42, w, h * 0.18); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, h * 0.42, w, 2); }
  }, { repeat: true });
  // a glint on cellophane (a flat white streak that always faces the light side)
  function glint(r, w = 0.05) {
    const m = new T.Mesh(K3D.geo('paGlint', () => new T.PlaneGeometry(1, 1)), K3D.mat('paGlintM', () => K3D.flat('#ffffff', { transparent: true, opacity: 0.75, depthWrite: false, side: T.DoubleSide })));
    m.scale.set(w, r, 1); m.userData.noSee = true; m.castShadow = false;
    return m;
  }

  /* ---------- Pip ---------- */
  // the fishbowl helmet: a clear cellophane globe over the top of the body, a foil collar and a curled sprout inside
  K3D.definePart3('paFishbowl', (o, x) => {
    const g = new T.Group();
    const R = 0.5;
    const bowl = new T.Mesh(K3D.geo('paBowl', () => new T.SphereGeometry(R, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.78)), cellophane('#e8f6ff'));
    bowl.position.y = -0.2; bowl.renderOrder = 20; bowl.userData.noSee = true; bowl.castShadow = false;
    g.add(bowl);
    // a soft rim line round the globe so it reads as glass from above (a thin ink ring)
    const rim = K3D.mesh(K3D.geo('paBowlRim', () => new T.TorusGeometry(R * Math.sin(Math.PI * 0.78) + 0.005, 0.016, 8, 48).rotateX(Math.PI / 2)), K3D.toon('#dfe9f2'), { ink: '#6a7484', inkW: 0.7 });
    rim.position.y = -0.2 + R * Math.cos(Math.PI * 0.78); g.add(rim);
    // two glints, a long one and a dot
    const gl = glint(0.28, 0.045); gl.position.set(-0.24, 0.02, 0.33); gl.rotation.set(-0.4, -0.6, 0.5); gl.renderOrder = 21; g.add(gl);
    const gl2 = glint(0.06, 0.06); gl2.position.set(-0.08, 0.2, 0.38); gl2.rotation.set(-0.7, -0.2, 0); gl2.renderOrder = 21; g.add(gl2);
    // the foil collar where the globe meets the suit
    const col = K3D.mesh(K3D.geo('paBowlCollar', () => new T.TorusGeometry(0.43, 0.05, 10, 40).rotateX(Math.PI / 2)), foilMat(), { ink: '#5a6070', inkW: 0.8 });
    col.position.y = -0.5; col.scale.set(1, 1, 0.82); g.add(col);
    // the sprout curls a little to fit inside
    const u = x.hero.userData;
    if (u.sprout) { u.sprout.rotation.set(0, 0, 0.35); u.sprout.scale.setScalar(0.85); }
    u.sproutLift = -0.05;
    return g;
  });
  // the tinfoil chest plate with a red paper star
  K3D.definePart3('paChestPlate', (o, x) => {
    const g = new T.Group();
    const w = 0.42, h = 0.24, N = 16, pos = [], uv = [], idx = [];
    // a curved strip that follows the front of the body
    for (let i = 0; i <= N; i++) for (let j = 0; j <= 4; j++) {
      const t = i / N, a = Math.PI / 2 + (t - 0.5) * 1.3, [px, pz] = ringPt(a, 1.04), yy = (j / 4 - 0.5) * h;
      pos.push(px * (w / (BW * 0.7)), yy, pz); uv.push(t, j / 4);
      if (i < N && j < 4) { const k = i * 5 + j; idx.push(k, k + 5, k + 1, k + 1, k + 5, k + 6); }
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const plate = K3D.mesh(geo, foilMat(), { ink: '#5a6070', inkW: 0.8 });
    g.add(plate);
    // the red paper star, cut with scissors (a little uneven), white edge
    const st = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.035 : 0.08; st.push([Math.cos(a) * r + (i === 3 ? 0.004 : 0), Math.sin(a) * r]); }
    const star = P.card(P.shapeFrom(st), { col: '#e0393e', depth: 0.012, ink: '#7a1a1e', inkW: 0.7 });
    const [sx, sz] = ringPt(Math.PI / 2, 1.08);
    star.position.set(sx, 0.01, sz + 0.008); g.add(star);
    g.position.set(0, -0.08, 0);
    return g;
  }, { at: 'body' });
  K3D.PARTS3.paChestPlate.at = 'body';
  // tinfoil boots: a crinkled band round the foot of the body and two rounded toes at the front
  K3D.definePart3('paBoots', (o, x) => {
    const g = new T.Group();
    const pts = []; for (let i = 0; i < 40; i++) { const [px, pz] = ringPt(i / 40 * Math.PI * 2, 1.05); pts.push(new T.Vector3(px, 0, pz)); }
    const band = K3D.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 64, 0.06, 8, true), foilMat(), { ink: '#5a6070', inkW: 0.8 });
    band.scale.set(1, 1.3, 1); g.add(band);
    for (const sx of [-1, 1]) {
      const toe = K3D.mesh(K3D.geo('paToe', () => new T.SphereGeometry(0.11, 16, 10)), foilMat(), { ink: '#5a6070', inkW: 0.8 });
      toe.scale.set(1, 0.6, 1.25); toe.position.set(sx * 0.15, 0.02, BD / 2 - 0.02); g.add(toe);
    }
    g.position.y = 0.05 - BH * 0.17;
    return g;
  }, { at: 'body' });
  K3D.PARTS3.paBoots.at = 'body';
  // the rocket pack: two cardboard tubes, a card strap plate, red and orange tissue flames
  K3D.definePart3('paRocketPack', (o, x) => {
    const g = new T.Group();
    const tube = cardTex('tube', '#c9a26a', null);
    const plate = P.card(P.shapeFrom([[-0.2, -0.16], [0.2, -0.16], [0.2, 0.16], [-0.2, 0.16]]), { col: '#d8b47c', depth: 0.02, ink: '#6a4a20', inkW: 0.8 });
    plate.position.z = -0.01; g.add(plate);
    for (const sx of [-1, 1]) {
      const t = K3D.mesh(K3D.geo('paTube', () => new T.CylinderGeometry(0.075, 0.075, 0.36, 20, 1)), K3D.mat('paTubeM', () => K3D.toon('#ffffff', { map: tube })), { ink: '#5a3a14', inkW: 0.8 });
      t.position.set(sx * 0.1, 0, -0.08); g.add(t);
      // the cut ends: a white ring
      const cap = K3D.mesh(K3D.geo('paTubeCap', () => new T.TorusGeometry(0.066, 0.012, 6, 20).rotateX(Math.PI / 2)), K3D.toon(P.EDGE), { ink: false });
      cap.position.set(sx * 0.1, -0.18, -0.08); g.add(cap);
      // the tissue flames: three crumpled cones, red outside, orange and yellow inside
      for (const [k, col, s] of [[0, '#e0393e', 1], [1, '#f08a3c', 0.72], [2, '#ffd24a', 0.45]]) {
        const f = K3D.mesh(K3D.geo('paFlame' + k, () => {
          const cg = new T.ConeGeometry(0.075, 0.3, 9, 3, true); const a = cg.attributes.position;
          for (let i = 0; i < a.count; i++) { const n = Math.sin(i * 12.9898) * 0.012; a.setX(i, a.getX(i) + n); a.setZ(i, a.getZ(i) - n); }
          cg.computeVertexNormals(); return cg.rotateX(Math.PI).translate(0, -0.15, 0);
        }), K3D.mat('paFlameM' + k, () => K3D.toon(col, { side: T.DoubleSide, emissive: col, emissiveIntensity: 0.35 })), { ink: k ? false : '#7a1a1e', inkW: 0.6 });
        f.scale.set(s, s, s); f.position.set(sx * 0.1, -0.19, -0.08); f.userData.flame = true; g.add(f);
      }
    }
    g.userData.live = true;
    return g;
  }, { at: 'back' });
  K3D.PARTS3.paRocketPack.at = 'back';

  /* ---------- Bo ---------- */
  // the open-faced card helmet between the ears, rivets of paper dots, the green visor pushed up, bendy-straw antennae
  K3D.definePart3('paCardHelmet', (o, x) => {
    const g = new T.Group();
    const tex = cardTex('boHelm', '#f4f2ea', '#4fbf6a');
    const dome = K3D.mesh(K3D.geo('paHelmDome', () => new T.SphereGeometry(0.25, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)), K3D.mat('paHelmM', () => K3D.toon('#ffffff', { map: tex })), { ink: '#3a5a44', inkW: 0.9 });
    dome.scale.set(1, 0.72, 1.05); dome.position.y = -0.03; g.add(dome);
    // the rim: a card band with paper-dot rivets
    const band = K3D.mesh(K3D.geo('paHelmBand', () => new T.CylinderGeometry(0.262, 0.262, 0.05, 32, 1, true)), K3D.mat('paHelmBandM', () => K3D.toon('#d9d6cc', { side: T.DoubleSide })), { ink: '#3a5a44', inkW: 0.8 });
    band.position.y = -0.03; band.scale.set(1, 1, 1.05); g.add(band);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2; if (Math.abs(Math.sin(a)) > 0.92) continue;
      const rv = new T.Mesh(K3D.geo('paRivet', () => new T.SphereGeometry(0.014, 8, 6)), K3D.mat('paRivetM', () => K3D.toon('#9aa3ad')));
      rv.position.set(Math.sin(a) * 0.266, -0.03, Math.cos(a) * 0.276); g.add(rv);
    }
    // the visor, pushed up onto the top of the helmet: green cellophane in a card frame
    const visor = new T.Group(); visor.position.set(0, 0.14, 0.08); visor.rotation.x = -0.95; g.add(visor);
    const frame = K3D.mesh(K3D.geo('paVisorFrame', () => new T.TorusGeometry(0.2, 0.018, 6, 30, Math.PI).rotateZ(0)), K3D.toon('#e9e6dc'), { ink: '#3a5a44', inkW: 0.7 });
    frame.scale.set(1, 0.55, 1); visor.add(frame);
    const film = new T.Mesh(K3D.geo('paVisorFilm', () => new T.CircleGeometry(0.2, 30, 0, Math.PI)), cellophane('#3fd06a'));
    film.scale.set(1, 0.55, 1); film.renderOrder = 20; film.userData.noSee = true; visor.add(film);
    // bendy-straw antennae beside the ears: striped white and green, bent near the top, a pom-pom ball on the end
    const straw = K3D.paint('paStraw', 32, 128, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#3fae5e'; for (let y = 0; y < h; y += 16) c.fillRect(0, y, w, 7); }, { repeat: true });
    for (const sx of [-1, 1]) {
      const curve = new T.CatmullRomCurve3([new T.Vector3(sx * 0.2, -0.02, -0.04), new T.Vector3(sx * 0.27, 0.22, -0.06), new T.Vector3(sx * 0.31, 0.36, -0.05), new T.Vector3(sx * 0.42, 0.44, -0.02)]);
      const s = K3D.mesh(new T.TubeGeometry(curve, 24, 0.017, 8, false), K3D.mat('paStrawM', () => K3D.toon('#ffffff', { map: straw })), { ink: '#2f6a40', inkW: 0.7 });
      g.add(s);
      // the bendy bit: little ridges
      for (let k = 0; k < 4; k++) {
        const p = curve.getPoint(0.62 + k * 0.04);
        const rr = new T.Mesh(K3D.geo('paStrawRib', () => new T.TorusGeometry(0.019, 0.005, 5, 12)), K3D.mat('paStrawRibM', () => K3D.toon('#e8f4ea')));
        rr.position.copy(p); rr.lookAt(curve.getPoint(0.7 + k * 0.04)); g.add(rr);
      }
      const ball = K3D.mesh(K3D.geo('paPom', () => new T.SphereGeometry(0.045, 14, 10)), K3D.mat('paPomM', () => K3D.toon('#8ff0a0', { emissive: '#3fd06a', emissiveIntensity: 0.25 })), { ink: '#2f6a40', inkW: 0.7 });
      ball.position.copy(curve.getPoint(1)); ball.userData.antenna = sx; g.add(ball);
    }
    return g;
  });
  // the white paper space suit wrap with a green stripe, folded at the front with a fastener
  K3D.definePart3('paSuitWrap', (o, x) => {
    const g = new T.Group();
    const tex = K3D.paint('paSuit', 512, 64, (c, w, h) => {
      P.paper(c, w, h, '#fbfaf4', 777);
      c.fillStyle = '#3fae5e'; c.fillRect(0, h * 0.38, w, h * 0.24);
      c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(0, h * 0.38, w, 2);
      // fold creases every so often
      c.strokeStyle = 'rgba(120,110,90,0.25)'; c.lineWidth = 2; for (let x2 = 40; x2 < w; x2 += 64) { c.beginPath(); c.moveTo(x2, 0); c.lineTo(x2 + 4, h); c.stroke(); }
    }, { repeat: true });
    const N = 48, pos = [], uv = [], idx = [], hh = 0.2;
    for (let i = 0; i <= N; i++) for (let j = 0; j <= 1; j++) {
      const t = i / N, a = t * Math.PI * 2, [px, pz] = ringPt(a, 1.05);
      pos.push(px, (j - 0.5) * hh, pz); uv.push(t * 3, j);
      if (i < N && j < 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const wrap = K3D.mesh(geo, K3D.toon('#ffffff', { map: tex, side: T.DoubleSide }), { ink: '#8a8a80', inkW: 0.7 });
    g.add(wrap);
    // a round mission badge: a paper circle with a green planet
    const badge = K3D.paint('paBadge', 64, 64, (c, w, h) => {
      c.fillStyle = '#fbfaf4'; c.beginPath(); c.arc(32, 32, 30, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3fae5e'; c.beginPath(); c.arc(32, 34, 14, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#2b2130'; c.lineWidth = 3; c.beginPath(); c.ellipse(32, 34, 24, 7, -0.3, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 2.5; c.beginPath(); c.arc(32, 32, 29, 0, Math.PI * 2); c.stroke();
    });
    const bd = new T.Mesh(K3D.geo('paBadgeGeo', () => new T.CircleGeometry(0.075, 20)), K3D.mat('paBadgeM', () => K3D.toon('#ffffff', { map: badge, transparent: true, alphaTest: 0.5 })));
    const [bx, bz] = ringPt(Math.PI / 2 - 0.45, 1.09); bd.position.set(bx, 0.1, bz); bd.rotation.y = 0.5; g.add(bd);
    g.position.y = 0.06;
    return g;
  }, { at: 'body' });
  K3D.PARTS3.paSuitWrap.at = 'body';
  // the satellite dish on the back: a paper cone dish, a straw stalk and a foil ball, on a card mount
  K3D.definePart3('paDish', (o, x) => {
    const g = new T.Group();
    const mount = P.card(P.shapeFrom([[-0.12, -0.12], [0.12, -0.12], [0.1, 0.12], [-0.1, 0.12]]), { col: '#e6e2d6', depth: 0.02, ink: '#3a5a44', inkW: 0.8 });
    g.add(mount);
    const arm = K3D.mesh(K3D.geo('paDishArm', () => new T.CylinderGeometry(0.018, 0.018, 0.2, 8).rotateX(Math.PI / 2).translate(0, 0, -0.1)), K3D.toon('#3fae5e'), { ink: '#2f6a40', inkW: 0.6 });
    arm.position.y = 0.05; g.add(arm);
    const dishTex = K3D.paint('paDishTex', 128, 128, (c, w, h) => {
      P.paper(c, w, h, '#f7f5ee', 515);
      c.strokeStyle = 'rgba(60,120,80,0.45)'; c.lineWidth = 2; for (let r = 10; r < 64; r += 12) { c.beginPath(); c.arc(64, 64, r, 0, Math.PI * 2); c.stroke(); }
      for (let a = 0; a < 8; a++) { c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.cos(a * Math.PI / 4) * 64, 64 + Math.sin(a * Math.PI / 4) * 64); c.stroke(); }
    });
    const dish = K3D.mesh(K3D.geo('paDishGeo', () => new T.ConeGeometry(0.26, 0.09, 28, 1, true).rotateX(-Math.PI / 2)), K3D.toon('#ffffff', { map: dishTex, side: T.DoubleSide }), { ink: '#3a5a44', inkW: 0.8 });
    dish.position.set(0, 0.12, -0.22); dish.rotation.x = 0.55; dish.userData.dish = true; g.add(dish);
    const feed = K3D.mesh(K3D.geo('paDishFeed', () => new T.SphereGeometry(0.035, 12, 8)), foilMat(), { ink: '#5a6070', inkW: 0.6 });
    feed.position.set(0, 0.17, -0.31); g.add(feed);
    g.userData.live = true;
    return g;
  }, { at: 'back' });
  K3D.PARTS3.paDish.at = 'back';

  K3D.defineOutfit3('popaliens', {
    pip: [['paFishbowl', {}], ['paChestPlate', {}], ['paBoots', {}], ['paRocketPack', {}]],
    bo: [['paCardHelmet', {}], ['paSuitWrap', {}], ['paBoots', {}], ['paDish', {}]],
  });

  /* ---------- the ray guns ---------- */
  // a small card ray gun: a rounded card body with a white cut edge, a rolled-paper barrel with foil rings, a cellophane
  // bulb on top in the hero's colour, a ring of 24 charge lights round the bulb's base, and a little paper crank
  G2.gun = function (id) {
    const g = new T.Group();
    const bulbCol = id ? '#5cff7a' : '#ffe14a', cardCol = id ? '#e7efe4' : '#f6e2b6', inkCol = id ? '#2f6a40' : '#7a5a10';
    const body = P.card((() => { const s = new T.Shape(); s.moveTo(-0.12, -0.06); s.lineTo(0.1, -0.06); s.quadraticCurveTo(0.16, -0.06, 0.16, 0); s.lineTo(0.16, 0.05); s.quadraticCurveTo(0.16, 0.08, 0.12, 0.08); s.lineTo(-0.1, 0.08); s.quadraticCurveTo(-0.14, 0.08, -0.14, 0.03); s.lineTo(-0.14, -0.02); s.closePath(); return s; })(),
      { col: cardCol, depth: 0.07, ink: inkCol, inkW: 0.8 });
    body.rotation.y = -Math.PI / 2; g.add(body);
    // the grip, angled down
    const grip = P.card(P.shapeFrom([[-0.035, 0], [0.035, 0], [0.05, -0.12], [-0.02, -0.12]]), { col: mixHex(cardCol, '#000000', 0.15), depth: 0.06, ink: inkCol, inkW: 0.8 });
    grip.rotation.y = -Math.PI / 2; grip.position.set(0, -0.05, -0.06); grip.rotation.x = 0.25; g.add(grip);
    // the barrel: rolled paper with two foil rings, flaring to a cone
    const barrel = K3D.mesh(K3D.geo('paBarrel', () => new T.CylinderGeometry(0.03, 0.035, 0.18, 14).rotateX(Math.PI / 2)), K3D.toon(cardCol), { ink: inkCol, inkW: 0.8 });
    barrel.position.set(0, 0.01, 0.22); g.add(barrel);
    for (const z of [0.17, 0.26]) {
      const ring = K3D.mesh(K3D.geo('paBarrelRing', () => new T.TorusGeometry(0.036, 0.011, 6, 16)), foilMat(), { ink: '#5a6070', inkW: 0.5 });
      ring.position.set(0, 0.01, z); g.add(ring);
    }
    const cone = K3D.mesh(K3D.geo('paMuzzle', () => new T.CylinderGeometry(0.06, 0.035, 0.05, 16, 1, true).rotateX(Math.PI / 2)), K3D.toon(mixHex(bulbCol, '#ffffff', 0.4), { side: T.DoubleSide }), { ink: inkCol, inkW: 0.7 });
    cone.position.set(0, 0.01, 0.33); g.add(cone);
    // the bulb: cellophane, glowing
    const bulb = new T.Mesh(K3D.geo('paBulb', () => new T.SphereGeometry(0.065, 20, 14)), K3D.flat(bulbCol, { transparent: true, opacity: 0.85 }));
    bulb.position.set(0, 0.13, -0.02); bulb.userData.noSee = true; g.add(bulb);
    const bulbIn = new T.Mesh(K3D.geo('paBulbIn', () => new T.SphereGeometry(0.032, 12, 8)), K3D.flat('#ffffff'));
    bulbIn.position.copy(bulb.position); g.add(bulbIn);
    const halo = new T.Mesh(K3D.geo('paHalo', () => new T.PlaneGeometry(1, 1)), K3D.flat(bulbCol, { transparent: true, opacity: 0.35, add: true, depthWrite: false, map: glowTex() }));
    halo.scale.setScalar(0.34); halo.position.copy(bulb.position); halo.userData.halo = true; halo.userData.noSee = true; g.add(halo);
    // the ring of 24 charge lights round the bulb's foot
    const lights = new T.InstancedMesh(K3D.geo('paLight', () => new T.SphereGeometry(0.009, 6, 4)), K3D.flat('#ffffff'), 24);
    const m4 = new T.Matrix4();
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; m4.makeTranslation(Math.cos(a) * 0.085, 0.085, -0.02 + Math.sin(a) * 0.085); lights.setMatrixAt(i, m4); lights.setColorAt(i, new T.Color(bulbCol)); }
    g.add(lights);
    // the paper crank on the left side: a card disc and a little handle
    const crank = new T.Group(); crank.position.set(-0.045, 0.01, -0.06); g.add(crank);
    const disc = K3D.mesh(K3D.geo('paCrank', () => new T.CylinderGeometry(0.045, 0.045, 0.012, 16).rotateZ(Math.PI / 2)), K3D.toon('#d9b46a'), { ink: inkCol, inkW: 0.6 });
    crank.add(disc);
    const handle = K3D.mesh(K3D.geo('paCrankH', () => new T.CylinderGeometry(0.008, 0.008, 0.05, 6).rotateZ(Math.PI / 2).translate(-0.03, 0.03, 0)), K3D.toon('#b8324a'), { ink: false });
    crank.add(handle);
    // the muzzle flash: a star that pops for a moment on each shot
    const flash = new T.Mesh(K3D.geo('paFlash', () => new T.PlaneGeometry(1, 1)), K3D.flat(bulbCol, { transparent: true, opacity: 0, add: true, depthWrite: false, map: starTex() }));
    flash.position.set(0, 0.01, 0.37); flash.scale.setScalar(0.4); flash.userData.noSee = true; g.add(flash);
    const lc = new T.Color(bulbCol), off = new T.Color('#3a3440'), white = new T.Color('#ffffff');
    g.userData.set = function (charge, rel, fire, cam) {
      const lit = Math.round(rel > 0 ? 24 * (1 - rel) : charge * 24);
      for (let i = 0; i < 24; i++) lights.setColorAt(i, i < lit ? (rel > 0 ? white : lc) : off);
      lights.instanceColor.needsUpdate = true;
      bulb.material.opacity = rel > 0 || charge <= 0 ? 0.3 : 0.85;
      halo.material.opacity = rel > 0 || charge <= 0 ? 0.05 : 0.35 + fire * 0.5;
      crank.rotation.x = rel > 0 ? -rel * Math.PI * 8 : crank.rotation.x;
      flash.material.opacity = fire;
      flash.rotation.z = fire * 3;
      if (cam) { halo.quaternion.copy(cam.quaternion); flash.quaternion.copy(cam.quaternion); halo.parent.updateMatrixWorld(); }
    };
    g.scale.setScalar(1.25);
    return g;
  };
  // soft round glow, and a four-point star (shared by the effects in popaliens-aliens.js)
  function glowTex() {
    return K3D.paint('paGlowTex', 64, 64, (c, w, h) => {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
  }
  function starTex() {
    return K3D.paint('paStarTex', 64, 64, (c, w, h) => {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(32, 0); c.quadraticCurveTo(36, 28, 64, 32); c.quadraticCurveTo(36, 36, 32, 64); c.quadraticCurveTo(28, 36, 0, 32); c.quadraticCurveTo(28, 28, 32, 0); c.fill();
    });
  }
  G2.glowTex = glowTex; G2.starTex = starTex; G2.foilMat = foilMat; G2.cellophane = cellophane;
  return G2;
})();
