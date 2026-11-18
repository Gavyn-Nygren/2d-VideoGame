/* Pip & Bo - 41-3 Paper Dragon Flight: stretch 2, the bookshelf. Drawing only (three.js through K3D.T, inside build()).
   Everything stands where POPDRAGON_ROUTE says (popdragon-stretches.js): the open shelving unit with its rows of books,
   the three books that tip out on the beat, the fat volumes and their slot, the open atlas and its paper moths, the
   wind-up train on its track, the bent paperback tunnel, the candle on the dark shelf, the snow globe, the ship in a
   bottle, the chess pieces, the eyes in the dark, and the clutter on top.
   POPDRAGON_SHELF.build(K, still, live) adds them; returns { tick(st, t, dt) }.
*/
'use strict';

const POPDRAGON_SHELF = (function () {
  const A = {};
  A.build = function (K, still, live) {
    const T = K3D.T, K3 = K3D, P = POPUP, R = POPDRAGON_ROUTE, art = R.art, CS = art.case, F = R.FLOOR, PI = Math.PI;
    const rng = P.rng(7301);
    const INKW = '#1a0e06';

    /* ---------- the shelving unit ---------- */
    const shelfWood = K3.paint('pdShelfWood', 1024, 256, (c, w, h) => {
      const r = P.rng(7311);
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8a5a34'); g.addColorStop(1, '#6e4426'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 120; k++) { c.strokeStyle = r() < 0.5 ? 'rgba(40,20,8,0.2)' : 'rgba(255,220,170,0.08)'; c.lineWidth = 1 + r() * 2; const y = r() * h; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= w; x += 32) c.lineTo(x, y + Math.sin(x * 0.012 + k) * 3); c.stroke(); }
      for (let k = 0; k < 3; k++) { const kx = r() * w, ky = r() * h; c.strokeStyle = 'rgba(40,20,8,0.3)'; for (let rr = 3; rr < 20; rr += 4) { c.beginPath(); c.ellipse(kx, ky, rr * 2.2, rr * 0.7, 0, 0, PI * 2); c.stroke(); } }
      c.fillStyle = 'rgba(255,230,190,0.18)'; c.fillRect(0, 0, w, 6);
    }, { repeat: true });
    shelfWood.repeat.set(3, 1);
    const woodM = K3.toon('#ffffff', { map: shelfWood }), woodDark = K3.mat('pdShelfDark', () => K3.toon('#5a3820'));
    const W = CS.x1 - CS.x0, D = CS.z1 - CS.z0, cx = (CS.x0 + CS.x1) / 2, cz = (CS.z0 + CS.z1) / 2;
    for (const y of CS.tops) {
      const b = K3.mesh(new T.BoxGeometry(W + 2, CS.th, D), [woodDark, woodDark, woodM, woodDark, woodM, woodDark], { ink: INKW });
      b.position.set(cx, y - CS.th / 2, cz); still.add(b);
      // a moulded lip along each board's front edge
      const lip = K3.mesh(new T.CylinderGeometry(0.5, 0.5, W + 2, 8).rotateZ(PI / 2), woodDark, { ink: INKW, inkW: 0.7 }); lip.position.set(cx, y - 0.4, CS.z1 + 0.1); still.add(lip);
    }
    // corner posts (square, with a turned knob on top) and a plinth
    for (const [x, z] of [[CS.x0, CS.z1], [CS.x1, CS.z1], [CS.x0, CS.z0 + 1.4], [CS.x1, CS.z0 + 1.4]]) {
      const post = K3.mesh(new T.BoxGeometry(2.8, CS.tops[4] + 2 - F, 2.8).translate(0, (CS.tops[4] + 2 + F) / 2, 0), woodDark, { ink: INKW }); post.position.set(x, 0, z); still.add(post);
      const knob = K3.mesh(K3.geo('pdPostKnob', () => new T.SphereGeometry(1.8, 16, 12)), woodM, { ink: INKW }); knob.position.set(x, CS.tops[4] + 3.4, z); still.add(knob);
    }
    const plinth = K3.mesh(new T.BoxGeometry(W + 3, 3, D).translate(0, F + 1.5, 0), woodDark, { ink: INKW, cast: false }); plinth.position.set(cx, 0, cz); still.add(plinth);
    // the back panel (dark, so the books stand out), and a scalloped paper trim along each shelf's edge
    const back = new T.Mesh(new T.PlaneGeometry(W, CS.tops[4] - F), K3.toon('#2a1c14')); back.position.set(cx, (CS.tops[4] + F) / 2, CS.z0 + 0.3); still.add(back);
    const trimTex = K3.paint('pdShelfTrim', 512, 64, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      for (let x = 0; x < w; x += 32) { c.fillStyle = (x / 32) % 2 ? '#e8615e' : '#f2c14e'; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 32, 0); c.lineTo(x + 32, 24); c.arc(x + 16, 24, 16, 0, PI); c.closePath(); c.fill(); }
      c.strokeStyle = 'rgba(40,20,20,0.5)'; c.lineWidth = 2; for (let x = 0; x < w; x += 32) { c.beginPath(); c.arc(x + 16, 24, 16, 0, PI); c.stroke(); }
      for (let x = 8; x < w; x += 32) { c.fillStyle = '#fff6e0'; c.beginPath(); c.arc(x + 8, 18, 3, 0, PI * 2); c.fill(); }
    }, { repeat: true });
    trimTex.repeat.set(10, 1);
    const trimM = K3.toon('#ffffff', { map: trimTex, transparent: true, alphaTest: 0.4, side: T.DoubleSide });
    for (const y of CS.tops.slice(1)) { const tr = new T.Mesh(new T.PlaneGeometry(W, 3.2), trimM); tr.position.set(cx, y - CS.th - 1.5, CS.z1 + 0.65); still.add(tr); }

    /* ---------- the books along the back of each shelf ---------- */
    // four spine designs (bands, a title plate, a stamped emblem, plain cloth) printed white so each book's colour tints it;
    // the top of the box is the cream page block between the boards
    const spineTex = K3.paint('pdSpines', 1024, 512, (c, w, h) => {
      const cw = w / 4;
      for (let k = 0; k < 4; k++) {
        const x0 = k * cw;
        c.fillStyle = '#ffffff'; c.fillRect(x0, 0, cw, h * 0.75);
        const r = P.rng(7321 + k);
        for (let i = 0; i < 2600; i++) { c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)'; c.fillRect(x0 + r() * cw, r() * h * 0.75, 2, 1); }
        c.fillStyle = 'rgba(232,196,96,0.95)'; c.strokeStyle = 'rgba(232,196,96,0.95)';
        if (k === 0) { for (const y of [30, 46, 300, 316]) c.fillRect(x0 + 10, y, cw - 20, 7); }
        if (k === 1) { c.fillStyle = 'rgba(30,20,10,0.55)'; c.fillRect(x0 + 24, 110, cw - 48, 120); c.strokeStyle = 'rgba(232,196,96,0.95)'; c.lineWidth = 4; c.strokeRect(x0 + 24, 110, cw - 48, 120); c.fillStyle = 'rgba(232,196,96,0.9)'; for (let y = 140; y < 220; y += 22) c.fillRect(x0 + 40, y, cw - 80, 8); }
        if (k === 2) { c.lineWidth = 5; c.beginPath(); c.arc(x0 + cw / 2, 170, 34, 0, PI * 2); c.stroke(); for (let a = 0; a < 6.28; a += 0.785) { c.beginPath(); c.moveTo(x0 + cw / 2, 170); c.lineTo(x0 + cw / 2 + Math.cos(a) * 26, 170 + Math.sin(a) * 26); c.stroke(); } c.fillRect(x0 + 12, 24, cw - 24, 5); c.fillRect(x0 + 12, 330, cw - 24, 5); }
        if (k === 3) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x0, 0, 10, h * 0.75); c.fillRect(x0 + cw - 10, 0, 10, h * 0.75); c.fillStyle = 'rgba(232,196,96,0.9)'; c.fillRect(x0 + 20, 260, cw - 40, 4); }
        // the page block (cream with lines) in the bottom quarter
        c.fillStyle = '#efe4c8'; c.fillRect(x0, h * 0.75, cw, h * 0.25);
        c.strokeStyle = 'rgba(120,100,60,0.35)'; c.lineWidth = 1; for (let y = h * 0.75 + 4; y < h; y += 3) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + cw, y); c.stroke(); }
      }
    });
    const bookGeo = (k) => {
      // a unit box; the spine (+z) and the sides show the design, the top and the back show the page block
      const g = new T.BoxGeometry(1, 1, 1), uv = g.attributes.uv, u0 = k / 4, u1 = (k + 1) / 4;
      for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
        const i = f * 4 + v, u = uv.getX(i), vv = uv.getY(i);
        if (f === 2 || f === 5) uv.setXY(i, u0 + u * 0.25, vv * 0.25);         // top and back: pages
        else if (f === 3) uv.setXY(i, u0 + 0.01, 0.3);                          // bottom: plain cover
        else uv.setXY(i, u0 + u * 0.25, 0.25 + vv * 0.75);                     // spine, front, sides: the design
      }
      return g;
    };
    const bookCols = ['#7a2f2f', '#2f4f7a', '#6b5a2a', '#3f6b4a', '#8a4a6a', '#c9973a', '#4a3a6a', '#a8443a', '#2f6a6a', '#5a3a2a', '#d8c8a8', '#3a3a4a', '#9a6a3a', '#6a7a3a'].map(c => new T.Color(c));
    const books = [[], [], [], []];   // per design: [x, y, z, w, h, d, lean, col]
    const tipperXs = art.tippers.map(b => b.x);
    for (let sh = 0; sh < 5; sh++) {
      const base = CS.tops[sh], room = sh < 4 ? CS.tops[sh + 1] - CS.th - base : 14;
      let x = CS.x0 + 1.6;
      while (x < CS.x1 - 2) {
        const bw = 1.8 + rng() * 2.8, bh = sh < 4 ? room * (0.6 + rng() * 0.32) : 6 + rng() * 6, d = 11 + rng() * 4;
        if (x + bw > CS.x1 - 1.6) break;
        // leave room for the tipping books and the fat volumes (they are their own meshes)
        if (sh === 0 && (tipperXs.some(tx => Math.abs(x + bw / 2 - tx) < 3.6) || (x + bw > art.fat[0].x - art.fat[0].hx - 0.3 && x < art.fat[0].x + art.fat[0].hx + 0.3))) { x += 0.8; continue; }
        // the top of the unit only has a few short stacks
        if (sh === 4 && (x > CS.x0 + 30 && x < CS.x1 - 24)) { x += 6; continue; }
        const lean = rng() < 0.08 && sh < 4 ? (rng() < 0.5 ? -1 : 1) * (0.12 + rng() * 0.12) : 0;
        books[Math.floor(rng() * 4)].push([x + bw / 2, base, CS.z0 + 1.4 + d / 2, bw, bh, d, lean, bookCols[Math.floor(rng() * bookCols.length)]]);
        x += bw + 0.12 + (lean ? 1.2 : 0) + (rng() < 0.06 ? 3 + rng() * 4 : 0);
      }
    }
    const bm4 = new T.Matrix4(), bq = new T.Quaternion(), bs = new T.Vector3(), bp = new T.Vector3(), be = new T.Euler();
    books.forEach((list, k) => {
      if (!list.length) return;
      const im = new T.InstancedMesh(K3.geo('pdBookG' + k, () => bookGeo(k)), K3.toon('#ffffff', { map: spineTex }), list.length);
      list.forEach(([x, y, z, w, h, d, lean, col], i) => {
        be.set(0, 0, lean); bq.setFromEuler(be); bs.set(w, h, d);
        bp.set(x - Math.sin(lean) * h / 2, y + Math.cos(lean) * h / 2, z); bm4.compose(bp, bq, bs); im.setMatrixAt(i, bm4); im.setColorAt(i, col);
      });
      im.castShadow = true; im.receiveShadow = true; still.add(im); K3.ink(im, '#140c08', 0.7);
    });
    // a few bookends and a lying stack on the top
    const brassM = K3.mat('brassLamp', () => K3.toon('#c9973a'));
    for (const [x, y] of [[CS.x0 + 1.2, CS.tops[1]], [CS.x1 - 1.4, CS.tops[3]]]) { const be2 = K3.mesh(K3.geo('pdBookend', () => new T.BoxGeometry(0.6, 9, 8).translate(0, 4.5, 0)), brassM, { ink: '#4a3410' }); be2.position.set(x, y, CS.z0 + 6); still.add(be2); }

    // a book with its title on the spine (the tipping books and the fat volumes are drawn one by one)
    const titledBook = (key, w, h, d, col, title, stripes = true) => {
      const tex = K3.paint('pdTitled|' + key, 128, 512, (c, cw, ch) => {
        c.fillStyle = col; c.fillRect(0, 0, cw, ch);
        const r = P.rng(title.length * 31); for (let i = 0; i < 1400; i++) { c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'; c.fillRect(r() * cw, r() * ch, 2, 1); }
        c.fillStyle = '#e8c86a'; if (stripes) for (const y of [26, 40, ch - 52, ch - 38]) c.fillRect(8, y, cw - 16, 6);
        c.save(); c.translate(cw / 2, ch / 2); c.rotate(-PI / 2); c.font = 'bold ' + Math.min(52, Math.floor(820 / title.length)) + 'px Georgia, "DejaVu Serif", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(title, 0, 2); c.restore();
      });
      const cover = K3.mat('pdCov|' + col, () => K3.toon(col)), pages = K3.mat('pdPageEdge', () => K3.toon('#efe4c8'));
      return K3.mesh(new T.BoxGeometry(w, h, d), [cover, cover, pages, cover, K3.toon('#ffffff', { map: tex }), pages], { ink: '#140c08', inkW: 0.9 });
    };
    // the tipping books (live): each turns about its bottom front edge
    const tippers = art.tippers.map((b, i) => {
      const pivot = new T.Group(); pivot.position.set(b.x, b.y, b.z); live.add(pivot);
      const m = titledBook('tip' + i, b.th, b.h, b.d, b.col, b.title); m.position.set(0, b.h / 2, -b.d / 2); pivot.add(m);
      return { pivot, b };
    });
    // the fat volumes and the slot between them
    art.fat.forEach((v, i) => {
      const h = CS.tops[1] - CS.th - CS.tops[0] - 0.2, d = v.z1 - v.z0;
      const m = titledBook('fat' + i, v.hx * 2, h, d, v.col, v.title);
      if (i === 1) m.rotation.y = PI;          // the front one shows its spine to the room
      m.position.set(v.x, CS.tops[0] + h / 2, (v.z0 + v.z1) / 2); still.add(m);
    });

    /* ---------- shelf 2: the atlas, its paper moths, the train, the paperback tunnel ---------- */
    const atlasTex = K3.paint('pdAtlasMap', 1024, 640, (c, w, h) => {
      P.paper(c, w, h, '#efe2c0', 7331);
      c.fillStyle = 'rgba(110,160,200,0.55)'; c.fillRect(0, 0, w, h);
      const r = P.rng(7332);
      for (let i = 0; i < 7; i++) { c.fillStyle = 'rgba(214,190,120,0.95)'; c.beginPath(); const x = r() * w, y = r() * h, rr = 60 + r() * 110; for (let k = 0; k <= 24; k++) { const a = k / 24 * PI * 2, q = rr * (0.7 + 0.3 * Math.sin(k * 2.7 + i)); c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q * 0.7); } c.fill(); c.strokeStyle = 'rgba(90,60,30,0.7)'; c.lineWidth = 2; c.stroke(); }
      c.strokeStyle = 'rgba(60,60,90,0.25)'; c.lineWidth = 1.5; for (let x = 0; x < w; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y < h; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      // holes where the moths were cut out of the map
      c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(40,30,20,0.85)';
      for (let i = 0; i < 6; i++) { const x = 120 + i * 140, y = 200 + (i % 2) * 220; c.save(); c.translate(x, y); for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 26, -8, 28, 20, s * 0.4, 0, PI * 2); c.fill(); c.beginPath(); c.ellipse(s * 20, 18, 18, 14, -s * 0.4, 0, PI * 2); c.fill(); } c.restore(); }
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = 'rgba(59,48,64,0.8)'; c.font = 'italic 40px Georgia, serif'; c.textAlign = 'center'; c.fillText('ATLAS OF THE WORLD', w / 2, 52);
    });
    {
      const AT = art.atlas, g = new T.Group(); g.position.set(AT.x, AT.y, AT.z); g.rotation.y = -0.25; still.add(g);
      // an open book laid face up, its covers a little raised (a shallow V)
      const pageM = K3.toon('#ffffff', { map: atlasTex, side: T.DoubleSide });
      for (const sd of [-1, 1]) {
        const pg = K3.mesh(new T.BoxGeometry(8, 0.5, 10.4).translate(sd * 4, 0.25, 0), [K3.mat('pdPageEdge', () => K3.toon('#efe4c8')), K3.mat('pdPageEdge', () => K3.toon('#efe4c8')), pageM, K3.mat('pdAtlasCov', () => K3.toon('#2f4f6a')), K3.mat('pdPageEdge', () => K3.toon('#efe4c8')), K3.mat('pdPageEdge', () => K3.toon('#efe4c8'))], { ink: '#2b2130', inkW: 0.8 });
        pg.rotation.z = sd * -0.12; pg.position.y = 0.6; g.add(pg);
        const cov = K3.mesh(new T.BoxGeometry(8.4, 0.3, 11).translate(sd * 4.2, 0, 0), K3.mat('pdAtlasCov', () => K3.toon('#2f4f6a')), { ink: '#14202a', inkW: 0.8 }); cov.rotation.z = sd * -0.12; cov.position.y = 0.3; g.add(cov);
      }
      // a fold-up strip of the map rising off the page (the moths' launch)
      for (let i = 0; i < 3; i++) { const t2 = P.card(P.shapeFrom([[-0.6, 0], [0.6, 0], [0.4, 3 + i], [-0.4, 3 + i]]), { tex: atlasTex, depth: 0.03, inkW: 0.6 }); t2.position.set(-2 + i * 2.4, 0.9, -1 + i); t2.rotation.set(-0.3, i, 0.1); g.add(t2); }
    }
    // the paper moths: cut from the atlas map, two pairs of wings on a little body
    const mothShape = new T.Shape(); mothShape.moveTo(0, 0); mothShape.bezierCurveTo(0.5, 0.9, 1.9, 1.3, 2.0, 0.4); mothShape.bezierCurveTo(2.1, -0.3, 1.2, -0.4, 0, 0);
    const hindShape = new T.Shape(); hindShape.moveTo(0, 0); hindShape.bezierCurveTo(0.6, -0.2, 1.5, -0.5, 1.3, -1.2); hindShape.bezierCurveTo(0.9, -1.5, 0.3, -0.8, 0, 0);
    const mothWingM = K3.mat('pdMothWing', () => K3.toon('#ffffff', { map: atlasTex, side: T.DoubleSide }));
    const makeMoth = (bunny) => {
      const g = new T.Group();
      if (bunny) {
        // a dust bunny: a grey fluff ball with glowing eyes
        const fluff = K3.mesh(K3.geo('pdBunnyBall', () => { const gg = new T.IcosahedronGeometry(1, 2), a = gg.attributes.position; const r2 = P.rng(7341); for (let i = 0; i < a.count; i++) { const k = 1 + (r2() - 0.5) * 0.35; a.setXYZ(i, a.getX(i) * k, a.getY(i) * k, a.getZ(i) * k); } gg.computeVertexNormals(); return gg; }), K3.mat('pdDust', () => K3.toon('#8a8a96')), { ink: '#3a3a44', inkW: 0.7 });
        fluff.scale.setScalar(1.3); g.add(fluff);
        for (let i = 0; i < 7; i++) { const tuft = new T.Mesh(K3.geo('pdTuftDust', () => new T.ConeGeometry(0.3, 1.1, 5)), K3.mat('pdDust', () => K3.toon('#8a8a96'))); const a = i / 7 * PI * 2; tuft.position.set(Math.cos(a) * 1.2, Math.sin(a * 1.7) * 0.5, Math.sin(a) * 1.2); tuft.lookAt(Math.cos(a) * 3, Math.sin(a * 1.7) * 1.5, Math.sin(a) * 3); tuft.rotateX(PI / 2); g.add(tuft); }
        for (const s of [-1, 1]) { const eye = new T.Mesh(K3.geo('pdBunnyEye', () => new T.SphereGeometry(0.26, 10, 8)), K3.mat('pdBunnyEyeM', () => K3.flat('#ffe46a'))); eye.position.set(s * 0.45, 0.35, 1.18); g.add(eye); }
        const glow = new T.Sprite(K3.mat('pdBunnyGlow', () => new T.SpriteMaterial({ map: K3.paint('pdSoft', 64, 64, () => {}), color: '#ffe06a', transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.6 })));
        glow.scale.set(2.2, 1.2, 1); glow.position.set(0, 0.35, 1.2); g.add(glow);
        g.userData.wings = [];
        return g;
      }
      const body = K3.mesh(K3.geo('pdMothBody', () => new T.CapsuleGeometry(0.16, 1.2, 4, 8).rotateX(PI / 2)), K3.mat('pdMothBodyM', () => K3.toon('#5a4a3a')), { ink: '#2b2130', inkW: 0.6 }); g.add(body);
      const wings = [];
      for (const s of [-1, 1]) {
        const wg = new T.Group(); wg.scale.x = s; g.add(wg);
        const fw = new T.Mesh(K3.geo('pdMothFore', () => new T.ShapeGeometry(mothShape).rotateX(-PI / 2)), mothWingM); K3.ink(fw, '#3a2a20', 0.6); wg.add(fw);
        const hw = new T.Mesh(K3.geo('pdMothHind', () => new T.ShapeGeometry(hindShape).rotateX(-PI / 2)), mothWingM); K3.ink(hw, '#3a2a20', 0.6); hw.position.z = 0.2; wg.add(hw);
        wings.push(wg);
      }
      for (const s of [-1, 1]) { const ant = new T.Mesh(K3.geo('pdMothAnt', () => new T.CylinderGeometry(0.03, 0.03, 0.9, 4).translate(0, 0.45, 0)), K3.mat('pdMothBodyM', () => K3.toon('#5a4a3a'))); ant.position.set(s * 0.08, 0.05, 0.6); ant.rotation.set(1.0, 0, -s * 0.4); g.add(ant); }
      g.userData.wings = wings;
      return g;
    };
    const clingers = R.clingers.map((c) => { const m = makeMoth(c.kind === 'bunny'); m.visible = false; live.add(m); return { c, m, ph: rng() * 6 }; });

    // the wind-up train and its track
    const TR = art.train, trackY = TR.y;
    {
      const sleeperM = K3.mat('pdSleeper', () => K3.toon('#6a4a30')), railM = K3.mat('pdRail', () => K3.toon('#9aa0aa'));
      for (let x = CS.x0 + 6; x < CS.x1 - 4; x += 2.2) { const sl = K3.mesh(K3.geo('pdSleeperG', () => new T.BoxGeometry(0.9, 0.4, 5.6)), sleeperM, { ink: '#2a1a0e', inkW: 0.5, cast: false }); sl.position.set(x, trackY + 0.2, TR.z); still.add(sl); }
      for (const s of [-1, 1]) { const rl = K3.mesh(new T.BoxGeometry(CS.x1 - CS.x0 - 10, 0.35, 0.35), railM, { ink: '#3a3e48', inkW: 0.5, cast: false }); rl.position.set(cx + 1, trackY + 0.55, TR.z + s * 1.6); still.add(rl); }
      const buf = K3.mesh(new T.BoxGeometry(1.2, 2.6, 5).translate(0, 1.3, 0), K3.toon('#c8403a'), { ink: '#4a1410' }); buf.position.set(CS.x1 - 5, trackY, TR.z); still.add(buf);
    }
    const train = new T.Group(); live.add(train);
    const wheels = [];
    {
      const red = K3.mat('pdTrainRed', () => K3.toon('#d8403a')), green = K3.mat('pdTrainGreen', () => K3.toon('#2f7a4a')), blk = K3.mat('pdTrainBlk', () => K3.toon('#2a2a30')), gold = K3.mat('pdGold', () => K3.toon('#e8b84a'));
      const L0 = TR.len[0];
      // the loco: its front at x = 0 (+x forward)
      const boiler = K3.mesh(new T.CylinderGeometry(2.0, 2.0, L0 - 3.2, 24).rotateZ(PI / 2).translate(-(L0 - 3.2) / 2, 3.6, 0), green, { ink: '#14301e' }); train.add(boiler);
      for (const x of [-1.2, -3.6]) { const band = K3.mesh(new T.CylinderGeometry(2.08, 2.08, 0.35, 24).rotateZ(PI / 2).translate(x, 3.6, 0), gold, { ink: false }); train.add(band); }
      const smokebox = K3.mesh(new T.CylinderGeometry(2.1, 2.1, 0.8, 24).rotateZ(PI / 2).translate(-0.2, 3.6, 0), blk, { ink: '#000' }); train.add(smokebox);
      const cab = K3.mesh(new T.BoxGeometry(4.2, TR.hCab - 1.4, 4.6).translate(-L0 + 2.2, 1.4 + (TR.hCab - 1.4) / 2, 0), red, { ink: '#4a1410' }); train.add(cab);
      const roof = K3.mesh(new T.BoxGeometry(5, 0.5, 5.2).translate(-L0 + 2.2, TR.hCab + 0.1, 0), blk, { ink: '#000' }); train.add(roof);
      for (const s of [-1, 1]) { const win = new T.Mesh(K3.geo('pdCabWin', () => new T.PlaneGeometry(2, 1.8)), K3.mat('pdCabWinM', () => K3.flat('#ffe8a8'))); win.position.set(-L0 + 2.2, TR.hCab - 2.6, s * 2.32); win.rotation.y = s > 0 ? 0 : PI; train.add(win); }
      const base = K3.mesh(new T.BoxGeometry(L0, 1.4, 4.4).translate(-L0 / 2, 1.4, 0), red, { ink: '#4a1410' }); train.add(base);
      const funnel = K3.mesh(new T.CylinderGeometry(1.15, 0.8, TR.funnel[1] - 5.2, 16).translate(-TR.funnel[0], 5.2 + (TR.funnel[1] - 5.2) / 2, 0), blk, { ink: '#000' }); train.add(funnel);
      const dome = K3.mesh(new T.SphereGeometry(0.9, 14, 10).translate(-4.6, 5.6, 0), gold, { ink: '#5a3d14' }); train.add(dome);
      const lampT = new T.Mesh(new T.SphereGeometry(0.5, 12, 8).translate(0.3, 4.6, 0), K3.flat('#fff2b0')); train.add(lampT);
      const catcher = K3.mesh(new T.ConeGeometry(2.0, 1.6, 4, 1).rotateZ(-PI / 2).rotateX(PI / 4).scale(1, 0.7, 1).translate(0.6, 1.0, 0), red, { ink: '#4a1410' }); train.add(catcher);
      // the wind-up key on the cab's back
      const key = new T.Group(); key.position.set(-L0 - 0.4, 4.4, 0); train.add(key);
      key.add(K3.mesh(new T.CylinderGeometry(0.2, 0.2, 1.2, 8).rotateZ(PI / 2).translate(-0.6, 0, 0), gold, { ink: '#5a3d14', inkW: 0.6 }));
      for (const s of [-1, 1]) { const loop = K3.mesh(new T.TorusGeometry(0.8, 0.22, 8, 16), gold, { ink: '#5a3d14', inkW: 0.6 }); loop.rotation.y = PI / 2; loop.position.set(-1.3, s * 0.8, 0); key.add(loop); }
      train.userData.key = key;
      const wheelG = K3.geo('pdWheel', () => new T.CylinderGeometry(1.0, 1.0, 0.5, 18).rotateX(PI / 2));
      for (const x of [-1.4, -4.2, -7.2]) for (const s of [-1, 1]) { const wh = K3.mesh(wheelG, K3.mat('pdTrainRed', () => K3.toon('#d8403a')), { ink: '#2a0a0a', inkW: 0.7 }); wh.position.set(x, 1.0, s * 2.35); train.add(wh); wheels.push(wh); }
      // two cars: a wagon of wooden letter blocks and a little tanker
      let x = -L0 - TR.gap;
      for (let i = 1; i < 3; i++) {
        const L = TR.len[i], car = new T.Group(); car.position.x = x; train.add(car);
        car.add(K3.mesh(new T.BoxGeometry(L, 1.2, 4.4).translate(-L / 2, 1.4, 0), blk, { ink: '#000' }));
        if (i === 1) {
          car.add(K3.mesh(new T.BoxGeometry(L, 3.4, 4.4).translate(-L / 2, 3.6, 0), K3.mat('pdWagon', () => K3.toon('#3a6ad8')), { ink: '#12204a' }));
          const blockTex = (ch, col) => K3.paint('pdBlock|' + ch, 64, 64, (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 4; c.strokeRect(4, 4, w - 8, h - 8); c.fillStyle = '#fff'; c.font = 'bold 44px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, w / 2, h / 2 + 2); });
          [['A', '#e8615e'], ['B', '#f2c14e'], ['C', '#5fbfa0']].forEach(([ch, col], k) => { const bl = K3.mesh(K3.geo('pdBlockG', () => new T.BoxGeometry(1.8, 1.8, 1.8)), K3.toon('#ffffff', { map: blockTex(ch, col) }), { ink: '#2b2130', inkW: 0.6 }); bl.position.set(-1.4 - k * 2.1, 5.8 + (k % 2) * 0.3, (k - 1) * 0.6); bl.rotation.y = k * 0.4; car.add(bl); });
        } else {
          car.add(K3.mesh(new T.CapsuleGeometry(1.9, L - 4.2, 6, 18).rotateZ(PI / 2).translate(-L / 2, 4.2, 0), K3.mat('pdTanker', () => K3.toon('#f2c14e')), { ink: '#5a3d14' }));
        }
        for (const wx of [-1.4, -L + 1.4]) for (const s of [-1, 1]) { const wh = K3.mesh(wheelG, K3.mat('pdTrainRed', () => K3.toon('#d8403a')), { ink: '#2a0a0a', inkW: 0.7 }); wh.position.set(x + wx, 1.0, s * 2.35); train.add(wh); wheels.push(wh); }
        x -= L + TR.gap;
      }
      train.position.set(0, trackY + 0.6, TR.z);
    }
    // puffs of steam from the funnel
    const softTex = K3.paint('pdSoft', 64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
    const puffs = []; for (let i = 0; i < 8; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: softTex, color: '#e8eaf0', transparent: true, depthWrite: false, opacity: 0 })); live.add(sp); puffs.push(sp); }

    // the bent paperback tunnel: two covers leaning into an A, joined by the curved spine at the ridge
    {
      const TU = art.tunnel, hgt = TU.ridge - TU.base, L = Math.hypot(TU.feet, hgt), lean = Math.atan2(TU.feet, hgt);
      const coverTex = K3.paint('pdJokes', 512, 512, (c, w, h) => {
        c.fillStyle = TU.col; c.fillRect(0, 0, w, h);
        c.fillStyle = '#ffe27a'; c.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * PI * 2, rr = i % 2 ? 120 : 200; c.lineTo(w / 2 + Math.cos(a) * rr, h * 0.55 + Math.sin(a) * rr); } c.fill();
        c.fillStyle = '#2b2130'; c.font = 'bold 60px "Comic Sans MS", "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.fillText('THE BIG', w / 2, 90); c.fillText('BOOK OF', w / 2, 160); c.font = 'bold 110px "Comic Sans MS", "DejaVu Sans", sans-serif'; c.fillText('JOKES', w / 2, h * 0.6);
        c.font = 'bold 40px "Comic Sans MS", sans-serif'; c.fillText('HA! HA! HA!', w / 2, h - 50);
      });
      const pagesM = K3.mat('pdPageEdge', () => K3.toon('#efe4c8')), covM = K3.toon('#ffffff', { map: coverTex });
      for (const side of [-1, 1]) {
        const footZ = TU.z + side * TU.feet, czz = (footZ + TU.z) / 2 + side * TU.th / 2 / Math.cos(lean), cy = (TU.base + TU.ridge) / 2;
        const slab = K3.mesh(new T.BoxGeometry(TU.hx * 2, L, TU.th), [pagesM, pagesM, pagesM, pagesM, side > 0 ? covM : pagesM, side > 0 ? pagesM : covM], { ink: '#2b2130' });
        slab.position.set(TU.x, cy, czz); slab.rotation.x = -side * lean; still.add(slab);
      }
      const spine = K3.mesh(new T.CylinderGeometry(2.2, 2.2, TU.hx * 2, 20, 1, false, -PI / 2, PI).rotateZ(PI / 2), K3.mat('pdJokesSpine', () => K3.toon(TU.col)), { ink: '#2b2130' });
      spine.position.set(TU.x, TU.ridge + 0.6, TU.z); still.add(spine);
      // either side: a tall stack of comics (behind) and a tin of crayons (at the front edge)
      const comicCols = ['#e8615e', '#3a8ad8', '#f2c14e', '#5fbf6a', '#9a6ad8', '#f29a4e'];
      const SB = art.tunnelSides[0], h = CS.tops[2] - CS.th - CS.tops[1];
      for (let i = 0, y = CS.tops[1]; y < CS.tops[1] + h - 0.6; i++) { const th2 = 0.5 + (i % 3) * 0.15; const cm = K3.mesh(K3.geo('pdComic', () => new T.BoxGeometry(1, 1, 1)), K3.mat('pdComic' + (i % 6), () => K3.toon(comicCols[i % 6])), { ink: '#2b2130', inkW: 0.5 }); cm.scale.set(TU.hx * 2 + 1 + (i % 2) * 0.6, th2, SB.z1 - SB.z0 - (i % 3) * 0.4); cm.position.set(TU.x + ((i * 7) % 5 - 2) * 0.12, y + th2 / 2, (SB.z0 + SB.z1) / 2); cm.rotation.y = ((i * 13) % 7 - 3) * 0.012; still.add(cm); y += th2; }
      const CT = art.tunnelSides[1];
      const tinTex = K3.paint('pdCrayonTin', 512, 256, (c, w, hh) => { c.fillStyle = '#3a6ad8'; c.fillRect(0, 0, w, hh); const cc = ['#e8615e', '#f2c14e', '#5fbf6a', '#f29a4e', '#9a6ad8', '#fff']; for (let i = 0; i < 14; i++) { c.fillStyle = cc[i % 6]; c.fillRect(20 + i * 34, 40, 22, 120); c.beginPath(); c.moveTo(20 + i * 34, 40); c.lineTo(31 + i * 34, 14); c.lineTo(42 + i * 34, 40); c.fill(); } c.fillStyle = '#fff'; c.font = 'bold 54px Georgia, serif'; c.textAlign = 'center'; c.fillText('CRAYONS', w / 2, 220); });
      const tin = K3.mesh(new T.BoxGeometry(TU.hx * 2 + 1.2, h, CT.z1 - CT.z0), [K3.toon('#3a6ad8'), K3.toon('#3a6ad8'), K3.mat('pdTinLid', () => K3.toon('#c8ccd4')), K3.toon('#3a6ad8'), K3.toon('#ffffff', { map: tinTex }), K3.toon('#3a6ad8')], { ink: '#12204a' });
      tin.position.set(TU.x, CS.tops[1] + h / 2, (CT.z0 + CT.z1) / 2); still.add(tin);
    }

    /* ---------- shelf 3: the candle, the snow globe, the ship in a bottle, the chess pieces, the eyes ---------- */
    const CA = art.candle;
    const candleG = new T.Group(); candleG.position.set(CA.x, CA.y, CA.z); still.add(candleG);
    candleG.add(K3.mesh(new T.LatheGeometry([[0, 0], [3, 0], [3.1, 0.5], [2.6, 0.9], [1.6, 0.8], [1.5, 1.4], [0, 1.4]].map(p => new T.Vector2(p[0], p[1])), 32), brassM, { ink: '#4a3410' }));
    candleG.add(K3.mesh(new T.TorusGeometry(0.9, 0.25, 8, 16, PI).translate(3.4, 0.6, 0), brassM, { ink: '#4a3410', inkW: 0.6 }));
    const waxM = K3.mat('pdWax', () => K3.toon('#f4ead6'));
    candleG.add(K3.mesh(new T.CylinderGeometry(CA.r, CA.r * 1.04, CA.h - 1.2, 20).translate(0, 1.2 + (CA.h - 1.2) / 2, 0), waxM, { ink: '#6a5a40' }));
    for (let i = 0; i < 5; i++) { const a = i * 1.3; const drip = K3.mesh(K3.geo('pdDrip', () => new T.CapsuleGeometry(0.22, 1.4, 4, 8)), waxM, { ink: '#6a5a40', inkW: 0.5 }); drip.position.set(Math.cos(a) * CA.r, CA.h - 1.2 - i * 0.5, Math.sin(a) * CA.r); candleG.add(drip); }
    candleG.add(new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.8, 4).translate(0, CA.h + 0.4, 0), K3.toon('#2b2130')));
    const flame = new T.Group(); flame.position.set(CA.x, CA.y + CA.h + 0.9, CA.z); live.add(flame);
    const flameOut = new T.Mesh(new T.SphereGeometry(0.55, 14, 10).scale(1, 2.2, 1).translate(0, 0.7, 0), K3.flat('#ffb84a', { transparent: true, opacity: 0.9 }));
    const flameIn = new T.Mesh(new T.SphereGeometry(0.3, 12, 8).scale(1, 1.8, 1).translate(0, 0.45, 0), K3.flat('#fff6d0'));
    flame.add(flameOut); flame.add(flameIn);
    const flameGlow = new T.Sprite(new T.SpriteMaterial({ map: softTex, color: '#ffb060', transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.8 })); flameGlow.scale.set(16, 16, 1); flameGlow.position.y = 0.8; flame.add(flameGlow);
    const candleL = new T.PointLight('#ffb466', 0, 60, 1.2); candleL.position.set(CA.x, CA.y + CA.h + 2, CA.z + 2); live.add(candleL);
    flame.visible = false;
    // a wisp of smoke from the cold wick before it is lit
    const wickSmoke = new T.Sprite(new T.SpriteMaterial({ map: softTex, color: '#9aa0b0', transparent: true, depthWrite: false, opacity: 0.25 })); wickSmoke.scale.set(1.6, 3, 1); wickSmoke.position.set(CA.x, CA.y + CA.h + 2.2, CA.z); live.add(wickSmoke);

    // the snow globe: a little snowy house and fir tree under glass, snow swirling
    const GL = art.globe;
    {
      const g = new T.Group(); g.position.set(GL.x, GL.y, GL.z); still.add(g);
      g.add(K3.mesh(new T.LatheGeometry([[0, 0], [GL.base, 0], [GL.base + 0.2, 0.6], [GL.base - 0.4, 3], [GL.r * 0.75, 3.2], [0, 3.2]].map(p => new T.Vector2(p[0], p[1])), 40), K3.mat('pdGlobeBase', () => K3.toon('#6a3a22')), { ink: INKW }));
      g.add(K3.mesh(new T.TorusGeometry(GL.base - 0.1, 0.2, 8, 32).rotateX(PI / 2).translate(0, 1.4, 0), K3.mat('pdGold', () => K3.toon('#e8b84a')), { ink: '#5a3d14', inkW: 0.5 }));
      const cyG = GL.r - 0.4 + 3;
      g.add(new T.Mesh(new T.CircleGeometry(GL.r * 0.85, 32).rotateX(-PI / 2).translate(0, 3.25, 0), K3.toon('#f4f8ff')));
      const house = new T.Group(); house.position.set(-0.8, 3.2, 0.3); g.add(house);
      house.add(K3.mesh(new T.BoxGeometry(2.2, 1.8, 1.8).translate(0, 0.9, 0), K3.toon('#d8603a'), { ink: '#4a1a10', inkW: 0.6 }));
      house.add(K3.mesh(new T.ConeGeometry(1.8, 1.3, 4).rotateY(PI / 4).translate(0, 2.4, 0), K3.toon('#f4f8ff'), { ink: '#4a4a5a', inkW: 0.6 }));
      house.add(new T.Mesh(new T.PlaneGeometry(0.6, 0.6).translate(0, 0.9, 0.91), K3.flat('#ffd870')));
      for (let i = 0; i < 3; i++) { const fir = K3.mesh(new T.ConeGeometry(1.0 - i * 0.25, 1.2, 8).translate(0, 1.0 + i * 0.7, 0), K3.mat('pdFir', () => K3.toon('#2f6a4a')), { ink: '#10301e', inkW: 0.6 }); fir.position.set(1.7, 3.2, -0.6); g.add(fir); }
      const glass = new T.Mesh(new T.SphereGeometry(GL.r, 32, 24), K3.toon('#dcefff', { transparent: true, opacity: 0.22, depthWrite: false, side: T.DoubleSide }));
      glass.position.y = cyG; g.add(glass); K3.ink(glass, '#6a8aa0', 0.7);
      const shine = new T.Mesh(new T.SphereGeometry(GL.r * 0.98, 16, 12, 0.6, 0.7, 0.5, 0.6), K3.flat('#ffffff', { transparent: true, opacity: 0.35, depthWrite: false })); shine.position.y = cyG; g.add(shine);
      void cyG;
    }
    const snowN = 90, snowPos = new Float32Array(snowN * 3), snowPh = Array.from({ length: snowN }, () => [rng() * 6.28, rng(), 0.4 + rng() * 0.6, rng()]);
    const snowGeo = new T.BufferGeometry(); snowGeo.setAttribute('position', new T.BufferAttribute(snowPos, 3));
    const snow = new T.Points(snowGeo, new T.PointsMaterial({ map: softTex, color: '#ffffff', size: 0.45, transparent: true, depthWrite: false })); snow.position.set(GL.x, GL.y + GL.r - 0.4 + 3, GL.z); live.add(snow);

    // the ship in a bottle on its stand
    const BT = art.bottle;
    {
      const g = new T.Group(); g.position.set(BT.x0, BT.y, BT.z); still.add(g);
      const L = BT.x1 - BT.x0;
      const stand = K3.mat('pdStand', () => K3.toon('#7a4a2a'));
      for (const x of [2, L - 2]) { const cr2 = K3.mesh(new T.BoxGeometry(1.2, 2.6, 6).translate(0, -BT.r + 0.4, 0), stand, { ink: INKW }); cr2.position.x = x; g.add(cr2); }
      g.add(K3.mesh(new T.BoxGeometry(L + 2, 0.8, 6.4).translate(L / 2, -BT.r - 1.2, 0), stand, { ink: INKW }));
      // the ship: a hull, three masts, square sails, a pennant
      const ship = new T.Group(); ship.position.set(L / 2, -BT.r * 0.55, 0); g.add(ship);
      ship.add(K3.mesh(new T.CylinderGeometry(1.1, 0.6, 7, 12, 1, false, 0, PI).rotateZ(PI / 2).rotateX(PI).translate(0, 0.6, 0), K3.toon('#7a3a1a'), { ink: '#2a1008', inkW: 0.6 }));
      ship.add(new T.Mesh(new T.PlaneGeometry(9, 3).rotateX(-PI / 2).translate(0, -0.1, 0), K3.toon('#3a6aa8')));
      for (const [mx, mh] of [[-2.4, 3.6], [0, 4.6], [2.4, 3.2]]) {
        ship.add(new T.Mesh(new T.CylinderGeometry(0.07, 0.07, mh, 5).translate(mx, 0.6 + mh / 2, 0), K3.toon('#4a2a14')));
        for (let k = 0; k < 2; k++) { const sail = new T.Mesh(K3.geo('pdSail', () => { const gg = new T.PlaneGeometry(1.6, 1.2, 4, 1), a = gg.attributes.position; for (let i = 0; i < a.count; i++) a.setZ(i, Math.cos(a.getX(i) * 1.6) * 0.18); gg.computeVertexNormals(); return gg; }), K3.mat('pdSailM', () => K3.toon('#f4ecd8', { side: T.DoubleSide }))); sail.rotation.y = PI / 2; sail.position.set(mx, 1.6 + k * 1.4, 0); sail.scale.setScalar(1 - k * 0.2); ship.add(sail); }
      }
      // the bottle: clear glass round the ship, the neck and a cork
      const bottle = new T.Mesh(new T.CapsuleGeometry(BT.r, L, 8, 24).rotateZ(PI / 2).translate(L / 2, 0, 0), K3.toon('#cfe8d8', { transparent: true, opacity: 0.25, depthWrite: false, side: T.DoubleSide }));
      g.add(bottle); K3.ink(bottle, '#5a8070', 0.7);
      const neck = new T.Mesh(new T.CylinderGeometry(1.4, BT.r * 0.9, BT.neck, 16, 1, true).rotateZ(PI / 2).translate(L + BT.neck / 2, 0, 0), K3.toon('#cfe8d8', { transparent: true, opacity: 0.25, depthWrite: false, side: T.DoubleSide }));
      g.add(neck); K3.ink(neck, '#5a8070', 0.7);
      g.add(K3.mesh(new T.CylinderGeometry(1.3, 1.2, 1.6, 12).rotateZ(PI / 2).translate(L + BT.neck + 0.4, 0, 0), K3.toon('#b8844a'), { ink: '#4a2a10', inkW: 0.6 }));
    }

    // the chess pieces (a giant wooden set: white, black, white)
    const chessW = K3.mat('pdChessW', () => K3.toon('#efe4cc')), chessB = K3.mat('pdChessB', () => K3.toon('#3a2a24'));
    art.chess.forEach((c, i) => {
      const g = new T.Group(); g.position.set(c.x, CS.tops[2], c.z); still.add(g);
      const m = i % 2 ? chessB : chessW, inkC = i % 2 ? '#0a0604' : '#5a4a30', H = c.h;
      const lathe = (pts) => K3.mesh(new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y * H)), 36), m, { ink: inkC });
      g.add(lathe([[0, 0], [3.0, 0], [3.0, 0.03], [2.6, 0.06], [2.7, 0.09], [2.0, 0.12], [1.6, 0.2], [1.3, 0.45], [1.6, 0.5], [1.6, 0.53], [1.2, 0.56], [0, 0.56]]));
      if (c.kind === 'knight') {
        const head = new T.Shape(); [[-1.6, 0], [1.8, 0], [1.6, 2.4], [2.2, 4.2], [2.6, 5.6], [1.2, 7.2], [0.2, 7.6], [-0.4, 8.4], [-0.9, 7.4], [-2.2, 5.6], [-3.4, 4.8], [-3.6, 3.8], [-2.4, 3.6], [-1.2, 3.8], [-1.8, 2.0]].forEach((p, k) => k ? head.lineTo(p[0], p[1]) : head.moveTo(p[0], p[1])); head.closePath();
        const hg = new T.ExtrudeGeometry(head, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.3, bevelSegments: 2 }).translate(0, 0, -1.2);
        const hm = K3.mesh(hg, m, { ink: inkC }); hm.position.y = 0.56 * H; hm.rotation.y = PI / 2 + 0.3; hm.scale.setScalar(H / 18.5); g.add(hm);
        const eye = new T.Mesh(new T.SphereGeometry(0.3, 8, 6), K3.toon('#2b2130')); eye.position.set(-0.9, 0.56 * H + 6 * H / 18.5, 1.3); g.add(eye);
      } else if (c.kind === 'bishop') {
        g.add(lathe([[1.2, 0.56], [1.0, 0.62], [1.5, 0.78], [1.6, 0.86], [1.2, 0.94], [0.5, 0.98], [0.6, 1.0], [0, 1.0]]));
        const slit = new T.Mesh(new T.BoxGeometry(0.3, 2.2, 3.4), chessW === m ? chessB : chessW); slit.position.set(0, 0.86 * H, 0); slit.rotation.z = 0.6; g.add(slit);
      } else {
        g.add(lathe([[1.2, 0.56], [1.0, 0.7], [1.6, 0.86], [2.2, 0.9], [1.8, 0.94], [0, 0.94]]));
        for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2, b = K3.mesh(K3.geo('pdCrownBall', () => new T.SphereGeometry(0.45, 10, 8)), m, { ink: inkC, inkW: 0.6 }); b.position.set(Math.cos(a) * 1.9, 0.92 * H, Math.sin(a) * 1.9); g.add(b); }
        const top = K3.mesh(new T.SphereGeometry(0.8, 14, 10), m, { ink: inkC }); top.position.y = 0.97 * H; g.add(top);
      }
    });
    // the king, knocked over and lying at the back
    { const kg = K3.mesh(new T.LatheGeometry([[0, 0], [2.6, 0], [2.2, 1], [1.2, 3], [1.0, 12], [1.8, 13.5], [1.4, 15], [0, 15]].map(([r, y]) => new T.Vector2(r, y)), 28), chessB, { ink: '#0a0604' }); kg.rotation.z = PI / 2 - 0.05; kg.position.set(160, CS.tops[2] + 2.4, -33); still.add(kg); }

    // the eyes in the dark at the back of the shelf above: two green glints that blink (gone once the candle is lit)
    const eyesG = new T.Group(); eyesG.position.set(art.shelfEyes.x, art.shelfEyes.y, art.shelfEyes.z); live.add(eyesG);
    const eyeM = new T.MeshBasicMaterial({ color: '#7dff6a', transparent: true }), eyes = [];
    for (const s of [-1, 1]) {
      const e = new T.Mesh(K3.geo('pdCatEyeG', () => new T.SphereGeometry(1, 16, 12).scale(1, 0.62, 0.4)), eyeM); e.position.x = s * 2.4; eyesG.add(e); eyes.push(e);
      const pupil = new T.Mesh(K3.geo('pdCatPupil', () => new T.SphereGeometry(1, 10, 8).scale(0.18, 0.55, 0.3)), K3.mat('pdPupilM', () => K3.flat('#0a140a'))); pupil.position.z = 0.25; e.add(pupil);
      const gl = new T.Sprite(new T.SpriteMaterial({ map: softTex, color: '#7dff6a', transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.6 })); gl.scale.set(5, 3.4, 1); e.add(gl);
    }

    /* ---------- on top of the unit: a stack of games, a toy rocket, a jar of marbles ---------- */
    {
      const top = CS.tops[4];
      const gameTex = (title, col, col2) => K3.paint('pdGame|' + title, 256, 128, (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h); c.fillStyle = col2; for (let i = 0; i < 8; i++) c.fillRect(i * 32, 0, 16, 18); c.fillStyle = '#fff'; c.font = 'bold 34px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(title, w / 2, h / 2 + 10); });
      [['SNAKES & LADDERS', '#3a8a4a', '#f2c14e', 26, 2.6], ['MARBLE RUN', '#c8403a', '#fff', 24, 3.2], ['PUZZLE 500', '#3a5aa8', '#e8615e', 22, 2.4]].forEach(([t2, a, b, w, h], i) => {
        const y = top + [0, 2.6, 5.8][i] + h / 2;
        const box = K3.mesh(new T.BoxGeometry(w, h, 16), [K3.toon(a), K3.toon(a), K3.toon('#ffffff', { map: gameTex(t2, a, b) }), K3.toon(a), K3.toon('#ffffff', { map: gameTex(t2, a, b) }), K3.toon(a)], { ink: '#2b2130' });
        box.position.set(150 + i * 1.5, y, -30); box.rotation.y = (i - 1) * 0.08; still.add(box);
      });
      const rocket = new T.Group(); rocket.position.set(CS.x1 - 12, top, -22); still.add(rocket);
      rocket.add(K3.mesh(new T.LatheGeometry([[0, 0], [2.2, 0], [2.6, 3], [2.4, 9], [1.6, 12], [0, 14]].map(p => new T.Vector2(p[0], p[1])), 24), K3.toon('#e8e4ec'), { ink: '#3a3a4a' }));
      rocket.add(new T.Mesh(new T.CircleGeometry(1, 16).translate(0, 7, 2.55), K3.toon('#6ac4f0')));
      for (let k = 0; k < 3; k++) { const fin = P.card(P.shapeFrom([[0, 0], [2.6, -1], [2.6, -3], [0, 4]]), { col: '#e8615e', depth: 0.3 }); fin.rotation.y = k * PI * 2 / 3; fin.position.y = 3.4; rocket.add(fin); }
    }

    /* ---------- every drawn frame ---------- */
    const v3 = new T.Vector3();
    return {
      tick(st, t, dt) {
        const clock = st.clock || 0, s = st.s || 0;
        // the tipping books (the same angle the rules use)
        for (const tp of tippers) tp.pivot.rotation.x = R.tipAngle(((clock / tp.b.per + tp.b.ph) % 1 + 1) % 1, tp.b.max);
        // the train: where the rules put it; wheels turn with the distance, the key unwinds, steam puffs
        const fx = art.trainX(s);
        train.position.x = fx;
        const moving = s > R.place.shelf2 && fx < 186;
        for (const wh of wheels) wh.rotation.z = -fx / 1.0;
        train.userData.key.rotation.x = moving ? t * 4 : 0;
        puffs.forEach((p, i) => { const ph = (t * 0.9 + i / puffs.length) % 1; p.position.set(fx - art.train.funnel[0] - ph * 5, trackY + art.train.funnel[1] + 1 + ph * 7, art.train.z + Math.sin(i * 2.1 + t) * ph); const sc = 1 + ph * 3; p.scale.set(sc, sc, 1); p.material.opacity = moving ? 0.5 * (1 - ph) : 0.12 * (1 - ph); });
        // the candle
        const lit = st.burnt && st.burnt.candle != null;
        flame.visible = lit; wickSmoke.visible = !lit;
        if (lit) {
          const fl = 1 + Math.sin(t * 13) * 0.06 + Math.sin(t * 7.3) * 0.05, u = clamp((clock - st.burnt.candle) / 0.4, 0, 1);
          flame.scale.set(fl * u, (1 + Math.sin(t * 9) * 0.1) * u, fl * u); flame.rotation.z = Math.sin(t * 3) * 0.08;
          candleL.intensity = 260 * u * fl; flameGlow.material.opacity = 0.75 * fl;
        } else { candleL.intensity = 0; wickSmoke.material.opacity = 0.18 + Math.sin(t * 2) * 0.06; wickSmoke.position.y = art.candle.y + art.candle.h + 2.2 + Math.sin(t) * 0.3; }
        // the eyes blink, and slip away once the candle is lit
        const gone = lit ? clamp((clock - st.burnt.candle) / 0.6, 0, 1) : 0, blink = (t % 3.7) < 0.14 ? 0.1 : 1;
        eyesG.visible = gone < 1; eyes.forEach(e => { e.scale.y = blink * (1 - gone); });
        eyeM.opacity = 0.55 + 0.45 * Math.sin(t * 1.3) ** 2;
        // snow swirls in the globe
        for (let i = 0; i < snowN; i++) { const [a, h0, sp, r0] = snowPh[i], ph = (h0 + t * 0.06 * sp) % 1, ang = a + t * 0.5 * sp, rr = r0 * 4.0 * Math.sqrt(1 - Math.pow(ph * 2 - 1, 2) * 0.6); snowPos[i * 3] = Math.cos(ang) * rr; snowPos[i * 3 + 1] = 3.6 - ph * 6.6; snowPos[i * 3 + 2] = Math.sin(ang) * rr; }
        snowGeo.attributes.position.needsUpdate = true;
        // moths and dust bunnies: out of their spot, at the dragon, riding a wing, knocked off
        const cl = st.cling || [], kn = st.knocked || [];
        for (const q of clingers) {
          const c = q.c, m = q.m, on = cl.find(x => x.id === c.id), off = kn.find(x => x.id === c.id);
          const v = R.at(c.s).v || 7, lead = (c.s - s) / v;          // seconds until it meets the dragon's path
          if (on) {
            // riding a wing (pinned near its tip, fluttering)
            const k = cl.indexOf(on), p = R.local(s - 1.6 - k * 0.5, st.ox + on.side * (1.1 + k * 0.3), st.oy + 0.35);
            m.position.set(p[0], p[1], p[2]); m.visible = true; m.rotation.set(0.3, R.at(s).yaw, on.side * 0.5);
          } else if (off) {
            const u = (clock - off.t) / 1.2, p = R.local(s - 2 - u * 6, st.ox + (c.ox > 0 ? 1 : -1) * (2 + u * 8), st.oy + 1 - u * u * 10);
            m.position.set(p[0], p[1], p[2]); m.rotation.set(u * 9, u * 7, u * 5); m.visible = u < 1;
          } else if (lead > -1.5 && lead < 3.2) {
            // flying from its spot to meet the path (then on past it, if it missed)
            const meet = R.local(c.s, c.ox, c.oy), u = clamp(1 - lead / 3.2, 0, 1), e = u * u * (3 - 2 * u);
            if (lead >= 0) { v3.set(c.from[0] + (meet[0] - c.from[0]) * e, c.from[1] + (meet[1] - c.from[1]) * e + Math.sin(u * PI) * 4, c.from[2] + (meet[2] - c.from[2]) * e); }
            else { const p2 = R.local(c.s + 4 * -lead, c.ox * (1 - lead), c.oy + 2 * -lead); v3.set(p2[0], p2[1], p2[2]); }
            m.position.copy(v3); m.visible = true; m.rotation.set(0, R.at(c.s).yaw + PI + Math.sin(t * 3 + q.ph) * 0.4, Math.sin(t * 5 + q.ph) * 0.2);
          } else m.visible = false;
          // the wings flap (fast while flying, slower while clinging)
          const fl = Math.sin(t * (on ? 9 : 22) + q.ph) * (on ? 0.4 : 0.8);
          m.userData.wings.forEach((w, k) => { w.rotation.z = (k ? -1 : 1) * fl; });
          if (c.kind === 'bunny' && m.visible) m.scale.setScalar(1 + Math.sin(t * 6 + q.ph) * 0.06);
        }
      },
    };
  };
  return A;
})();
