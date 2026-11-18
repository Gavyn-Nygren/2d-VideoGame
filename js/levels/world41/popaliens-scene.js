/* Pip & Bo - World 41, 41-4 Paper Alien Invasion: the page landscape, the heroes, the camera and draw3d. Loaded on
   demand with the 3D kit, after popaliens-aliens.js.

   Scale is everything here: Pip and Bo are the size of ants on an open page that reaches to the horizon. The page has
   visible fibres and a weave underfoot (fibres stand up like grass), pencil notes are as tall as fences, eraser crumbs
   are boulders, a doodled flower is as tall as a tree, a pencil lying on the page is a fallen redwood, and far off in
   the haze the Reader's sleeping hand is a mountain range. Depth haze and the photo pass's depth of field sell the size.

   PASCENE.build(K, st)   fills the scene (once per G.level; again after a lost context)
   PASCENE.draw(K, st, dt) every drawn frame: heroes, guns, aliens, effects, saucer, camera
   The camera only moves forward (it follows st.cz, which the rules only ever move forward) and gently side to side.
   It looks forward and down at about 40 degrees, wide enough for both heroes and 20 units ahead; at a few wide moments
   (st.wideT) it eases back while play goes on.
   Only Stretch 1, the Margin Fields, is dressed until Gavyn has seen the look (the spec's look gate).
*/
'use strict';

const PASCENE = (function () {
  const T = K3D.T, P = POPUP;
  const S = { wind: { value: 0 } };
  const PAPER = '#f4ecd8';
  const v = (x, y, z) => new T.Vector3(x, y, z);

  /* ---------- the page ---------- */
  // the paper close up: a cream ground, a weave of fibres, grain and soft mottling (it repeats every 6 units)
  function pageTex() {
    return K3D.paint('paPage', 1024, 1024, (c, w, h) => {
      P.paper(c, w, h, PAPER, 4141);
      const r = P.rng(77);
      // the weave: long soft fibres crossing at all angles, like the felt of a sheet seen under a lens
      for (let i = 0; i < 2600; i++) {
        const x = r() * w, y = r() * h, a = r() * Math.PI, l = 20 + r() * 90, bend = (r() - 0.5) * 30;
        c.strokeStyle = r() < 0.5 ? 'rgba(170,140,95,0.10)' : 'rgba(255,255,255,0.32)';
        c.lineWidth = 1 + r() * 2.2;
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * l * 0.5 - Math.sin(a) * bend, y + Math.sin(a) * l * 0.5 + Math.cos(a) * bend, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
      }
      // pores and pits
      for (let i = 0; i < 900; i++) { c.fillStyle = 'rgba(140,110,70,' + (0.05 + r() * 0.08) + ')'; c.beginPath(); c.ellipse(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2, r() * 3, 0, Math.PI * 2); c.fill(); }
      // soft ridges of the pressed sheet
      for (let i = 0; i < 40; i++) { const y = r() * h; const g = c.createLinearGradient(0, y - 30, 0, y + 30); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(120,90,50,0)'); c.fillStyle = g; c.fillRect(0, y - 30, w, 60); }
    }, { repeat: true });
  }
  // the large-scale page: the ruled margin line, printed text far to the left (Letter City ahead), page number,
  // pencil scrawls and a soft coffee ring, painted at a coarse scale over the whole margin stretch
  const BIG = { x0: -70, x1: 30, z0: 20, z1: -170 }, BIGPPU = 16;
  function bigTex() {
    const w = (BIG.x1 - BIG.x0) * BIGPPU, h = (BIG.z0 - BIG.z1) * BIGPPU;
    return K3D.paint('paPageBig', w, h, (c) => {
      c.clearRect(0, 0, w, h);
      // (the canvas top is the far end of the plane: z1)
      const X = x => (x - BIG.x0) * BIGPPU, Z = z => (z - BIG.z1) * BIGPPU, r = P.rng(12);
      // the colour first (meadows, highlighter, the ink stream's wet edge, doodles), under the printed words
      PALIFE.paintBig(c, X, Z, BIGPPU);
      // the margin rule: a double pink line, slightly uneven like a printed rule seen huge
      c.fillStyle = 'rgba(226,96,120,0.75)'; c.fillRect(X(-16.6), 0, 0.5 * BIGPPU, h);
      c.fillStyle = 'rgba(226,96,120,0.45)'; c.fillRect(X(-17.6), 0, 0.22 * BIGPPU, h);
      // the printed column of text to the left: rows of huge black letters, lying flat on the page
      c.fillStyle = 'rgba(30,24,36,0.92)';
      c.font = 'bold ' + Math.round(4.2 * BIGPPU) + 'px Georgia, "DejaVu Serif", serif'; c.textBaseline = 'alphabetic';
      const words = 'the saucer came down over the hills of the page and all the little paper people ran to see it land'.split(' ');
      let wi = 0;
      for (let zz = BIG.z0 - 4; zz > BIG.z1; zz -= 6.4) {
        let x = X(-69);
        while (x < X(-21)) { const wd = words[wi++ % words.length]; const ww = c.measureText(wd + ' ').width; if (x + ww > X(-20.5)) break; c.fillText(wd, x, Z(zz)); x += ww; }
      }
      // pencil scrawls in the margin: grey graphite loops and arrows (huge, flat)
      c.strokeStyle = 'rgba(80,80,90,0.32)'; c.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const x0 = X(-15 + r() * 40), y0 = Z(BIG.z0 - 10 - r() * (BIG.z0 - BIG.z1 - 20));
        c.lineWidth = 0.18 * BIGPPU;
        c.beginPath(); c.moveTo(x0, y0);
        for (let k = 0; k < 6; k++) c.quadraticCurveTo(x0 + (k + 0.5) * 1.4 * BIGPPU, y0 - (r() * 2 + 1) * BIGPPU * (k % 2 ? -1 : 1), x0 + (k + 1) * 1.4 * BIGPPU, y0 + (r() - 0.5) * BIGPPU);
        c.stroke();
      }
      // the reader's own pencil notes in the margin: handwriting, underlines, arrows, ticks, a star, a little rocket
      // and tally marks, each letter several hero-heights tall (the heroes walk over them; they scroll past)
      const gr = a => 'rgba(64,64,76,' + a + ')';
      const hand = (txt, x, z, size, rot, a = 0.42) => { c.save(); c.translate(X(x), Z(z)); c.rotate(rot); c.fillStyle = gr(a); c.font = 'italic ' + Math.round(size * BIGPPU) + 'px "Comic Sans MS", "Segoe Print", cursive'; c.fillText(txt, 0, 0); c.restore(); };
      const line = (pts, wdt, a = 0.4) => { c.strokeStyle = gr(a); c.lineWidth = wdt * BIGPPU; c.lineJoin = 'round'; c.beginPath(); pts.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); c.stroke(); };
      hand('ask Mum?', -12, -6, 4.2, -0.08);
      line([[-12, -7], [-1, -7.6]], 0.35, 0.35);
      hand('p. 112 !!', 3, -22, 3.6, 0.06);
      line([[1, -18], [-3, -15], [-1.8, -18.6], [-3, -15], [-6.6, -16]], 0.3);
      hand('ALIENS', -9, -40, 5.2, -0.04, 0.5);
      line([[-9.5, -41.6], [9, -42.6]], 0.3); line([[-9.2, -42.4], [8.6, -43.2]], 0.22, 0.3);
      // a star doodle, gone over twice
      for (const o of [0, 0.25]) { const cx = 8 + o, cz = -55, R = 3.2; line(Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI * 4 / 5 - Math.PI / 2 + o * 0.2; return [cx + Math.cos(a) * R, cz - Math.sin(a) * R]; }), 0.28, 0.36); }
      // tally marks
      for (let i = 0; i < 4; i++) line([[-10 + i * 1.1, -66], [-10.3 + i * 1.1, -70.5]], 0.32);
      line([[-10.8, -69.6], [-6, -66.6]], 0.32);
      hand('remember!', 1, -76, 3.8, -0.1);
      // a circled number and a tick
      c.strokeStyle = gr(0.38); c.lineWidth = 0.3 * BIGPPU; c.beginPath(); c.ellipse(X(-6), Z(-92), 3 * BIGPPU, 2.4 * BIGPPU, 0.2, 0, Math.PI * 2); c.stroke();
      hand('3', -7.3, -93.3, 4, 0);
      line([[5, -96], [6.6, -98.4], [10.5, -92]], 0.4, 0.45);
      // a little rocket doodle with its smoke
      line([[-2, -110], [0, -114], [2, -110], [2, -106], [-2, -106], [-2, -110], [2, -110]], 0.3);
      line([[-2, -106], [-3.2, -104.6], [-2, -107.2]], 0.26); line([[2, -106], [3.2, -104.6], [2, -107.2]], 0.26);
      for (let i = 0; i < 5; i++) { c.strokeStyle = gr(0.25); c.lineWidth = 0.22 * BIGPPU; c.beginPath(); c.arc(X(-0.5 + Math.sin(i) * 0.6), Z(-103 + i * 1.6), (0.6 + i * 0.25) * BIGPPU, 0, Math.PI * 2); c.stroke(); }
      hand('why??', 6, -126, 3.4, 0.12);
      // graphite smudges where a hand has rested
      for (let i = 0; i < 9; i++) {
        const x = X(-13 + r() * 30), y = Z(5 - r() * 160), R = (2 + r() * 5) * BIGPPU;
        const g = c.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, 'rgba(90,90,100,0.12)'); g.addColorStop(1, 'rgba(90,90,100,0)');
        c.fillStyle = g; c.beginPath(); c.ellipse(x, y, R * 1.6, R, r() * 3, 0, Math.PI * 2); c.fill();
      }
      // an old fold in the page: a long soft crease from corner to corner
      c.strokeStyle = 'rgba(150,130,100,0.22)'; c.lineWidth = 0.25 * BIGPPU; c.beginPath(); c.moveTo(X(-40), Z(12)); c.lineTo(X(30), Z(-150)); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 0.18 * BIGPPU; c.beginPath(); c.moveTo(X(-39.7), Z(12)); c.lineTo(X(30.3), Z(-150)); c.stroke();
      // a page number in the corner far ahead
      c.fillStyle = 'rgba(40,30,40,0.6)'; c.font = 'italic ' + Math.round(6 * BIGPPU) + 'px Georgia, serif'; c.fillText('41', X(14), Z(-160));
      // a faint coffee ring far to the right (a canyon wall later on)
      c.strokeStyle = 'rgba(150,100,50,0.28)'; c.lineWidth = 1.4 * BIGPPU; c.beginPath(); c.ellipse(X(24), Z(-30), 9 * BIGPPU, 8 * BIGPPU, 0.3, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = 'rgba(120,70,30,0.22)'; c.lineWidth = 0.4 * BIGPPU; c.beginPath(); c.ellipse(X(24), Z(-30), 9.6 * BIGPPU, 8.6 * BIGPPU, 0.3, 0, Math.PI * 2); c.stroke();
    });
  }

  /* ---------- the Margin Fields ---------- */
  // fibres that stand up like grass: thin curved paper strands, cream and white, in their thousands (one batch)
  function fibres(K, z0, z1) {
    const N = 36000, r = P.rng(9);
    const geo = K3D.geo('paFibre', () => {
      // a narrow ribbon bending over toward its tip
      const g = new T.PlaneGeometry(0.05, 1, 1, 4).translate(0, 0.5, 0), a = g.attributes.position;
      for (let i = 0; i < a.count; i++) { const y = a.getY(i); a.setZ(i, y * y * 0.35); a.setX(i, a.getX(i) * (1 - y * 0.7)); }
      g.computeVertexNormals(); return g;
    });
    const mat = K3D.toon('#fbf6ea', { side: T.DoubleSide });
    // they sway in the draft (a gentle wave rolling across the page; the tips move, the roots stay)
    mat.onBeforeCompile = sh => {
      sh.uniforms.uWind = S.wind;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWind;').replace('#include <begin_vertex>',
        '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.22;\ntransformed.z += (sin(uWind * 1.6 + ph) * 0.5 + sin(uWind * 2.9 + ph * 1.7) * 0.25) * 0.35 * position.y * position.y;\n#endif');
    };
    const m = new T.InstancedMesh(geo, mat, N);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), col = new T.Color();
    // they grow in tufts (where the sheet's felt has lifted), thinner on the walked path so feet read cleanly
    let i = 0;
    while (i < N) {
      const cx = -36 + r() * 66, cz = z0 - r() * (z0 - z1);
      const onPath = Math.abs(cx) < 12, n = onPath ? 2 + Math.floor(r() * 4) : 4 + Math.floor(r() * 9), spread = 0.25 + r() * 0.5;
      if (onPath && r() < 0.45) continue;
      const tall = onPath ? 0.6 : 1;
      for (let k = 0; k < n && i < N; k++, i++) {
        const x = cx + (r() - 0.5) * spread * 2, z = cz + (r() - 0.5) * spread * 2;
        const h = (0.15 + r() * r() * 0.75) * tall;
        e.set((r() - 0.5) * 0.7, r() * Math.PI * 2, (r() - 0.5) * 0.5); q.setFromEuler(e);
        m4.compose(v(x, 0, z), q, v(0.8 + r() * 1.2, h, 1)); m.setMatrixAt(i, m4);
        const p = r();
        m.setColorAt(i, col.set(p < 0.25 ? '#fffaf0' : p < 0.4 ? '#f2ead8' : p < 0.5 ? '#dfeecf' : p < 0.58 ? '#f6dde4' : p < 0.66 ? '#dde8f4' : p < 0.74 ? '#f4ecc4' : '#efe6d2'));
      }
    }
    m.castShadow = false; m.receiveShadow = true;
    K.add(m);
  }
  // an eraser crumb: a rubbery rolled lump, pink-grey with a dusty top
  function crumb(x, z, w, d, h, rot, seed) {
    const r = P.rng(seed);
    const g = new T.IcosahedronGeometry(0.5, 3), a = g.attributes.position, seen = new Map();
    for (let i = 0; i < a.count; i++) {
      const key = Math.round(a.getX(i) * 1e3) + ',' + Math.round(a.getY(i) * 1e3) + ',' + Math.round(a.getZ(i) * 1e3);
      let k = seen.get(key); if (k == null) { k = 0.86 + r() * 0.22 + Math.sin(a.getX(i) * 9 + a.getZ(i) * 7) * 0.05; seen.set(key, k); }
      a.setXYZ(i, a.getX(i) * k, a.getY(i) * k, a.getZ(i) * k);
    }
    g.computeVertexNormals();
    const m = K3D.mesh(g, K3D.mat('paCrumbM', () => K3D.toon('#e7a9ae', { map: crumbTex() })), { ink: '#7a4a52', inkW: 1 });
    m.scale.set(w * 1.15, h * 1.15, d * 1.15); m.position.set(x, h * 0.42, z); m.rotation.set(0.2, rot, 0.1);
    return m;
  }
  const crumbTex = () => K3D.paint('paCrumbTex', 256, 256, (c, w, h) => {
    c.fillStyle = '#e7a9ae'; c.fillRect(0, 0, w, h); const r = P.rng(5);
    for (let i = 0; i < 600; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(90,60,70,0.14)'; c.beginPath(); c.arc(r() * w, r() * h, 1 + r() * 4, 0, Math.PI * 2); c.fill(); }
    // rolled-up graphite dust streaks
    for (let i = 0; i < 30; i++) { c.strokeStyle = 'rgba(70,70,80,0.3)'; c.lineWidth = 2 + r() * 3; c.beginPath(); const x = r() * w, y = r() * h; c.arc(x, y, 8 + r() * 30, r() * 3, r() * 3 + 1.5); c.stroke(); }
  }, { repeat: true });
  // a pencil note in the margin: a graphite stroke as tall as a fence, written in loops (one long tube of grey lead)
  function note(x, z, len, rot, seed) {
    const r = P.rng(seed), pts = [];
    const n = Math.round(len * 3);
    for (let i = 0; i <= n; i++) {
      const t = i / n, along = (t - 0.5) * len;
      // cursive loops: the line climbs and falls and crosses back on itself a little
      const loop = Math.sin(t * Math.PI * len * 0.9) * 0.35, up = 0.22 + Math.abs(Math.sin(t * Math.PI * len * 0.45 + 0.4)) * 0.38;
      pts.push(v(loop * 0.6 + (r() - 0.5) * 0.04, up, along));
    }
    const curve = new T.CatmullRomCurve3(pts);
    const m = K3D.mesh(new T.TubeGeometry(curve, n * 8, 0.07, 8, false), K3D.mat('paGraphite', () => K3D.toon('#5a5a66', { emissive: '#30303a', emissiveIntensity: 0.15 })), { ink: '#25252c', inkW: 1 });
    const g = new T.Group(); g.add(m);
    // the flat smear of graphite on the page under it
    const smear = new T.Mesh(new T.PlaneGeometry(1.1, len + 0.4).rotateX(-Math.PI / 2), K3D.mat('paSmearM', () => { const mm = K3D.flat('#6a6a78', { transparent: true, opacity: 0.25, depthWrite: false }); mm.polygonOffset = true; mm.polygonOffsetFactor = -1; mm.polygonOffsetUnits = -1; mm.userData.flatDecal = true; return mm; }));
    smear.position.y = 0.006; g.add(smear);
    g.position.set(x, 0, z); g.rotation.y = rot;
    return g;
  }
  // the doodled flower: a ballpoint doodle cut out and standing on a folded tab, as tall as a tree
  function doodleFlower(x, z, h, rot) {
    const tex = K3D.paint('paDoodle', 512, 1024, (c, w, hh) => {
      c.clearRect(0, 0, w, hh);
      const r = P.rng(31), INK = '#2a3a8a';
      const draw = () => {
        // stalk with leaves, petals round a spiral middle, in biro blue with hatching
        c.lineCap = 'round'; c.lineJoin = 'round';
        c.strokeStyle = INK; c.lineWidth = 10; c.beginPath(); c.moveTo(w / 2, hh * 0.98); c.bezierCurveTo(w * 0.42, hh * 0.7, w * 0.6, hh * 0.5, w / 2, hh * 0.32); c.stroke();
        for (const [yy, sx] of [[0.72, -1], [0.56, 1]]) { c.beginPath(); c.moveTo(w / 2, hh * yy); c.quadraticCurveTo(w / 2 + sx * w * 0.36, hh * (yy - 0.1), w / 2 + sx * w * 0.42, hh * (yy - 0.02)); c.quadraticCurveTo(w / 2 + sx * w * 0.2, hh * (yy + 0.03), w / 2, hh * yy); c.fillStyle = '#9fd37a'; c.fill(); c.lineWidth = 7; c.stroke(); }
        for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; c.beginPath(); c.ellipse(w / 2 + Math.cos(a) * w * 0.2, hh * 0.25 + Math.sin(a) * w * 0.2, w * 0.16, w * 0.09, a, 0, Math.PI * 2); c.fillStyle = i % 2 ? '#ff9ac0' : '#ffd36a'; c.fill(); c.lineWidth = 7; c.stroke(); }
        c.beginPath(); c.arc(w / 2, hh * 0.25, w * 0.11, 0, Math.PI * 2); c.fillStyle = '#ffb347'; c.fill(); c.stroke();
        c.lineWidth = 4; c.beginPath(); for (let a = 0; a < 14; a += 0.2) c.lineTo(w / 2 + Math.cos(a) * a * 2.6, hh * 0.25 + Math.sin(a) * a * 2.6); c.stroke();
        // hatching on the petals
        c.lineWidth = 2; c.strokeStyle = 'rgba(42,58,138,0.6)';
        for (let i = 0; i < 60; i++) { const a = r() * Math.PI * 2, d = w * (0.15 + r() * 0.15), px = w / 2 + Math.cos(a) * d, py = hh * 0.25 + Math.sin(a) * d; c.beginPath(); c.moveTo(px, py); c.lineTo(px + 10, py - 10); c.stroke(); }
      };
      draw();
      // the white cut edge round it all
      const cut = document.createElement('canvas'); cut.width = w; cut.height = hh; const cc = cut.getContext('2d'); cc.drawImage(c.canvas, 0, 0);
      c.clearRect(0, 0, w, hh);
      for (let a = 0; a < 16; a++) c.drawImage(cut, Math.cos(a / 16 * Math.PI * 2) * 12, Math.sin(a / 16 * Math.PI * 2) * 12);
      c.globalCompositeOperation = 'source-in'; c.fillStyle = '#fbf7ec'; c.fillRect(0, 0, w, hh); c.globalCompositeOperation = 'source-over';
      c.drawImage(cut, 0, 0);
    });
    const g = new T.Group();
    const m = new T.Mesh(new T.PlaneGeometry(h * 0.5, h).translate(0, h / 2, 0), K3D.toon('#ffffff', { map: tex, alphaTest: 0.5, side: T.DoubleSide }));
    m.castShadow = true; m.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: tex, alphaTest: 0.5 });
    g.add(m);
    const tab = P.tab(h * 0.3, h * 0.1); tab.position.set(0, 0.01, -h * 0.05); g.add(tab);
    g.position.set(x, 0, z); g.rotation.y = rot;
    return g;
  }
  // the staple wall of a blockade: strips of staples stacked three high, silver, glued in rows
  function stapleWall(s) {
    const g = new T.Group();
    const strip = K3D.paint('paStaples', 512, 64, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f4f6fa'); gr.addColorStop(0.5, '#a9b0bc'); gr.addColorStop(1, '#d8dce4');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 6) { c.fillStyle = 'rgba(60,66,80,0.35)'; c.fillRect(x, 0, 1, h); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x + 1, 0, 1, h); }
    }, { repeat: true });
    const mat = K3D.mat('paStapleM', () => { const m = K3D.toon('#ffffff', { map: strip }); strip.repeat.set(s.w / 4, 1); return m; });
    const legGeo = new T.BoxGeometry(s.w, 0.2, 0.06);
    for (let row = 0; row < 3; row++) {
      // a staple strip is a long bent bar: a top and two legs
      const top = K3D.mesh(new T.BoxGeometry(s.w, 0.06, s.d * 0.7), mat, { ink: '#3a3f4a', inkW: 0.9 });
      top.position.set(0, 0.2 + row * 0.2, (row % 2 ? 0.06 : -0.06)); g.add(top);
      for (const sz of [-1, 1]) { const leg = K3D.mesh(legGeo, mat, { ink: '#3a3f4a', inkW: 0.9 }); leg.position.set(0, 0.1 + row * 0.2, sz * s.d * 0.32 + (row % 2 ? 0.06 : -0.06)); g.add(leg); }
    }
    g.position.set(s.x, 0, s.z);
    g.userData.live = true;
    return g;
  }
  // a bookmark ribbon laid across the path: red silk with a forked end and a gold edge; it shines once saved
  function ribbon(z) {
    const tex = K3D.paint('paRibbon', 1024, 64, (c, w, h) => {
      c.fillStyle = '#a3263a'; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 3) { c.fillStyle = x % 6 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'; c.fillRect(x, 0, 1, h); }
      c.fillStyle = '#e8c45a'; c.fillRect(0, 2, w, 4); c.fillRect(0, h - 6, w, 4);
      c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.moveTo(w, 0); c.lineTo(w - 40, h / 2); c.lineTo(w, h); c.fill();
    });
    const m = new T.Mesh(new T.PlaneGeometry(36, 0.6, 36, 1).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: tex, transparent: true, alphaTest: 0.5, polygonOffset: -2 }));
    // a gentle ripple, as silk lies on paper
    const a = m.geometry.attributes.position; for (let i = 0; i < a.count; i++) a.setY(i, 0.02 + Math.sin(a.getX(i) * 0.9) * 0.015);
    m.geometry.computeVertexNormals();
    m.position.set(2, 0, z); m.rotation.y = 0.04; m.receiveShadow = true;
    m.userData.live = true;
    return m;
  }
  // far away in the haze: the Reader's sleeping hand, a range of mountains (four fingers and a thumb, knuckles up)
  function hand(x, z, s) {
    const g = new T.Group(), skin = K3D.toon('#e8b89a'), nail = K3D.toon('#f2d2c6');
    for (let i = 0; i < 4; i++) {
      const f = K3D.mesh(new T.CapsuleGeometry(1, 7 + i * 0.6, 8, 20).rotateX(Math.PI / 2), skin, { ink: '#8a5a48', inkW: 2 });
      f.position.set((i - 1.5) * 2.3, 0.6, -2 - Math.abs(i - 1.2) * 0.8); f.scale.set(1, 0.85, 1); g.add(f);
      const n = new T.Mesh(new T.SphereGeometry(0.75, 12, 8), nail); n.scale.set(1, 0.4, 1.2); n.position.set((i - 1.5) * 2.3, 1.3, -2 - (7 + i * 0.6) / 2 - 1 - Math.abs(i - 1.2) * 0.8); g.add(n);
    }
    const palm = K3D.mesh(K3D.roundBox(10, 3.4, 8, 0.6, 30), skin, { ink: '#8a5a48', inkW: 2 }); palm.position.set(0, -0.8, 5); g.add(palm);
    const th = K3D.mesh(new T.CapsuleGeometry(1.2, 5, 8, 16).rotateX(Math.PI / 2), skin, { ink: '#8a5a48', inkW: 2 }); th.position.set(6.2, 0.2, 3); th.rotation.y = -0.6; g.add(th);
    g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = -0.5;
    return g;
  }
  // a sky dome: the reader's room at night seen from the page, all soft and huge: a warm lamp glowing to one side, the
  // dark ceiling far above, and round the horizon a row of giant book spines on the desk, blurred by distance
  function sky(K) {
    const tex = K3D.paint('paSky', 2048, 512, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2e2a3c'); g.addColorStop(0.3, '#5a4c56'); g.addColorStop(0.46, '#b49a82'); g.addColorStop(0.5, '#e6d4b4'); g.addColorStop(1, '#e8d8bc');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      // the lamp: a big warm glow (about 40 degrees right of straight ahead) with a soft halo
      const lx = w * 0.62, ly = h * 0.24;
      for (const [r, a] of [[h * 0.5, 0.35], [h * 0.22, 0.6], [h * 0.07, 0.95]]) { const gg = c.createRadialGradient(lx, ly, 0, lx, ly, r); gg.addColorStop(0, 'rgba(255,236,180,' + a + ')'); gg.addColorStop(1, 'rgba(255,220,160,0)'); c.fillStyle = gg; c.fillRect(lx - r, ly - r, r * 2, r * 2); }
      // the lamp's shade, a dark trapezoid round the bulb
      c.fillStyle = 'rgba(60,40,40,0.55)'; c.beginPath(); c.moveTo(lx - 50, ly - 62); c.lineTo(lx + 50, ly - 62); c.lineTo(lx + 82, ly + 6); c.lineTo(lx - 82, ly + 6); c.closePath(); c.fill();
      // book spines standing along the far edge of the desk, blurred
      const r = P.rng(31), cols = ['#7b3b3b', '#2f5a6e', '#a07a2e', '#3f6a3a', '#6a4a7a', '#8a5a3a', '#c9b48a', '#355070'];
      c.filter = 'blur(3px)';
      let x = 0;
      while (x < w) {
        const bw = 10 + r() * 22, bh = h * (0.035 + r() * 0.05), top = h * 0.5 - bh;
        if (r() < 0.12) { x += 30 + r() * 120; continue; }
        c.fillStyle = cols[Math.floor(r() * cols.length)]; c.globalAlpha = 0.55; c.fillRect(x, top, bw - 2, bh);
        c.fillStyle = 'rgba(255,230,180,0.35)'; c.fillRect(x + 3, top + bh * 0.2, bw - 8, 3); c.fillRect(x + 3, top + bh * 0.7, bw - 8, 3);
        x += bw;
      }
      c.globalAlpha = 1; c.filter = 'none';
      // the haze along the horizon over everything
      const hz = c.createLinearGradient(0, h * 0.4, 0, h * 0.5); hz.addColorStop(0, 'rgba(230,214,186,0)'); hz.addColorStop(1, 'rgba(230,214,186,0.7)');
      c.fillStyle = hz; c.fillRect(0, h * 0.4, w, h * 0.1);
    });
    const m = new T.Mesh(new T.SphereGeometry(480, 32, 16), new T.MeshBasicMaterial({ map: tex, side: T.BackSide, fog: false, depthWrite: false }));
    m.renderOrder = -10; m.userData.live = true;
    K.add(m); return m;
  }

  // a pencil shaving: a frilly wooden cone curl, pale wood inside, a band of yellow paint and a dark graphite tip
  function shaving(x, z, sz, rot, seed) {
    const r = P.rng(300 + seed), segs = 60, turns = 1.6;
    const pos = [], col = [], idx = [];
    const wood = new T.Color('#e8c99a'), paint = new T.Color(['#f2c23a', '#d24a4a', '#3b7bd0'][seed % 3]), dark = new T.Color('#3a3236');
    for (let i = 0; i <= segs; i++) {
      const u = i / segs, a = u * turns * Math.PI * 2, rad = 0.15 + u * 0.85, frill = 1 + Math.sin(u * 40) * 0.05;
      for (let j = 0; j <= 1; j++) {
        const h = j ? 0.5 + r() * 0.04 : 0;
        pos.push(Math.cos(a) * rad * frill * (j ? 1 : 0.35), h + u * 0.1, Math.sin(a) * rad * frill * (j ? 1 : 0.35));
        const c = j ? paint.clone().lerp(wood, u < 0.1 ? 1 : 0.15) : (u < 0.15 ? dark : wood); col.push(c.r, c.g, c.b);
      }
      if (i < segs) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const mat = K3D.toon('#ffffff', { side: T.DoubleSide }); mat.vertexColors = true;
    const m = K3D.mesh(g, mat, { ink: '#5a4030', inkW: 0.8 });
    m.position.set(x, 0.02, z); m.rotation.set(-1.2 + r() * 0.3, rot, 0.2); m.scale.setScalar(sz);
    return m;
  }
  // long soft shadows cast across the page by the giant things on the desk (the lamp is ahead and to the right)
  function bigShadows(K) {
    const tex = K3D.paint('paLongShadow', 256, 64, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.15, 'rgba(0,0,0,1)'); g.addColorStop(0.75, 'rgba(0,0,0,0.8)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      const gv = c.createLinearGradient(0, 0, 0, h); gv.addColorStop(0, 'rgba(255,255,255,1)'); gv.addColorStop(0.3, 'rgba(255,255,255,0)'); gv.addColorStop(0.7, 'rgba(255,255,255,0)'); gv.addColorStop(1, 'rgba(255,255,255,1)');
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = gv; c.fillRect(0, 0, w, h);
    });
    const mat = new T.MeshBasicMaterial({ map: tex, color: '#3a2418', transparent: true, opacity: 0.2, depthWrite: false });
    mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -1;
    // [x, z, length, width, angle]: the mug's, the pencil tin's and two pencils' shadows reach over the margin
    for (const [x, z, l, w, a] of [[8, -30, 70, 16, 0.5], [6, -98, 90, 10, 0.45], [4, -132, 70, 4, 0.52], [10, -60, 60, 3, 0.42]]) {
      const m = new T.Mesh(K3D.geo('paShadowQ', () => new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), mat);
      m.scale.set(l, 1, w); m.position.set(x, 0.01, z); m.rotation.y = a; m.renderOrder = 1; m.receiveShadow = false; K.add(m);
    }
  }

  /* ---------- the heroes ---------- */
  // a flattened hero: a sticker of themselves pressed into the page, surprised
  function stickerTex(id) {
    return K3D.paint('paSticker' + id, 128, 128, (c, w, h) => {
      c.fillStyle = '#ffffff'; P.inkLine; c.beginPath(); c.roundRect(6, 10, 116, 108, 24); c.fill();
      c.fillStyle = PCOL[id]; c.beginPath(); c.roundRect(16, 20, 96, 88, 18); c.fill();
      c.strokeStyle = PDARK[id]; c.lineWidth = 4; c.stroke();
      for (const dx of [-18, 18]) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(64 + dx, 56, 11, 14, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#1c1a36'; c.beginPath(); c.arc(64 + dx, 58, 5, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#1c1a36'; c.beginPath(); c.ellipse(64, 86, 8, 10, 0, 0, Math.PI * 2); c.fill();
      // outfit hints: Pip's fishbowl rim and sprout, Bo's antennae
      if (id === 0) { c.strokeStyle = 'rgba(180,220,240,0.9)'; c.lineWidth = 5; c.beginPath(); c.arc(64, 62, 52, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); c.fillStyle = '#5cc27f'; c.beginPath(); c.ellipse(76, 14, 12, 6, -0.4, 0, Math.PI * 2); c.fill(); }
      else { c.strokeStyle = '#3fae5e'; c.lineWidth = 5; c.beginPath(); c.moveTo(34, 22); c.lineTo(22, 4); c.moveTo(94, 22); c.lineTo(106, 4); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(40, 30, 14, 6, -0.5, 0, Math.PI * 2); c.fill();
    });
  }
  function heroes(K, st) {
    st.v3 = st.v3 || {};
    const H = [0, 1].map(id => {
      const h = K3D.hero(id); K3D.dress(h, 'popaliens');
      const gun = PAGEAR.gun(id); gun.position.set(0.24, 0.2, 0.36); h.add(gun);
      K.add(h); K3D.seeThrough(h, id ? '#4a8fe0' : '#f08a3c');
      const blob = K.add(K3D.blob(id ? '#4a8fe0' : '#f08a3c'));
      const sticker = new T.Mesh(new T.PlaneGeometry(0.95, 0.95).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: stickerTex(id), transparent: true, alphaTest: 0.3, polygonOffset: -3 }));
      sticker.visible = false; sticker.receiveShadow = true; K.add(sticker);
      // the Bookworm's thimble shield (gold help): a little silver thimble hovering over the head
      const thimble = K3D.mesh(new T.CylinderGeometry(0.16, 0.2, 0.26, 16, 1).translate(0, 0.13, 0), PAGEAR.foilMat(), { ink: '#5a6070', inkW: 0.7 });
      thimble.visible = false; K.add(thimble);
      return { h, gun, blob, sticker, thimble, fire: 0, wasFlat: false, scale: 1 };
    });
    return H;
  }

  /* ---------- building the scene ---------- */
  S.build = function (K, st) {
    const scene = K.scene;
    st.v3 = {};
    scene.fog = new T.Fog('#c9ab86', 24, 360);   // the page fades into warm lamplit haze ahead (the room beyond keeps its own)
    scene.background = new T.Color('#c9ab86');
    // lamplight: warm from ahead and to the right (long shadows toward the viewer), a cooler fill from the night window
    K.sunDir.set(0.55, 1, -0.5).normalize(); K.sun.color.set('#fff0d6'); K.amb.color.set('#eceeff');
    K.maxBlur = 6;
    sky(K);
    // the page: a vast sheet; the close-up weave repeats every 6 units
    const tex = pageTex(); tex.repeat.set(140 / 6, 760 / 6);
    const page = new T.Mesh(new T.PlaneGeometry(140, 760).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: tex }));
    page.position.set(-40, 0, -300); page.receiveShadow = true; page.userData.live = true; K.add(page);
    // the margin stretch's big print over it
    const big = new T.Mesh(new T.PlaneGeometry(BIG.x1 - BIG.x0, BIG.z0 - BIG.z1).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: bigTex(), transparent: true, polygonOffset: -1, depthWrite: false }));
    big.position.set((BIG.x0 + BIG.x1) / 2, 0.003, (BIG.z0 + BIG.z1) / 2); big.receiveShadow = true; big.renderOrder = 1; big.userData.live = true; K.add(big);
    // the page edge on the right: the cut side of the sheet and the stack of pages under it, then a drop to the desk
    const edgeTex = K3D.paint('paEdge', 64, 512, (c, w, h) => { c.fillStyle = '#efe5cc'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) { c.fillStyle = y % 8 ? 'rgba(120,100,70,0.18)' : 'rgba(255,255,255,0.3)'; c.fillRect(0, y, w, 1); } }, { repeat: true });
    edgeTex.repeat.set(60, 1);
    const edge = new T.Mesh(new T.PlaneGeometry(760, 14).rotateY(-Math.PI / 2), K3D.toon('#ffffff', { map: edgeTex }));
    edge.position.set(30, -7, -300); edge.userData.live = true; K.add(edge);
    const desk = new T.Mesh(new T.PlaneGeometry(600, 900).rotateX(-Math.PI / 2), K3D.toon('#7a5236', { map: deskTex() }));
    desk.position.set(300, -14, -300); desk.userData.live = true; K.add(desk);
    const deco = new T.Group(); K.add(deco);
    // the Margin Fields' pieces
    fibres(K, 20, -170);
    for (const [i, s] of PA_ROUTE.solids.entries()) {
      if (s.kind === 'crumb') deco.add(crumb(s.x, s.z, s.w, s.d, s.h, s.rot, 40 + i));
      if (s.kind === 'note') deco.add(note(s.x, s.z, s.d, s.rot, 60 + i));
      if (s.kind === 'flower') deco.add(doodleFlower(s.x, s.z, s.h, -0.3));
    }
    // more crumbs and notes off the path, for depth
    const r = P.rng(21);
    for (let i = 0; i < 26; i++) { const sd = r() < 0.5 ? -1 : 1, x = sd * (17 + r() * 16), z = 10 - r() * 170, sz = 0.6 + r() * 2.6; deco.add(crumb(x, z, sz, sz * 0.9, sz * 0.7, r() * 6, 100 + i)); }
    for (let i = 0; i < 5; i++) { let x = 18 + r() * 6; const z = -10 - i * 32 - r() * 10; if (PALIFE.nearStream(x, z) < 5) x = x > 0 ? -x - 4 : x; deco.add(note(x, z, 6 + r() * 6, (r() - 0.5) * 0.4, 200 + i)); }
    deco.add(doodleFlower(-24, -18, 11, 0.4)); deco.add(doodleFlower(21, -128, 8, -0.6));
    // the fallen redwood: a pencil lying across the page to the left
    const pencil = P.pencil(); pencil.scale.setScalar(13); pencil.position.set(-27, 2.3, -88); pencil.rotation.y = 1.25; deco.add(pencil);
    // pencil shavings curled beside it and here and there off the path: wooden spirals with a painted rim
    for (let i = 0; i < 14; i++) {
      const sd = i % 2 ? 1 : -1, x = i < 4 ? -22 + i * 1.5 : sd * (14.5 + r() * 9), z = i < 4 ? -82 - i * 3 : 6 - r() * 160;
      K.add(shaving(x, z, 0.8 + r() * 1.2, r() * 6, i));
    }
    K3D.bake(deco);
    // the blockade walls
    st.v3.walls = {};
    PA_ROUTE.events.forEach((ev, i) => { if (ev.block) { const w = stapleWall(ev.block.solid); K.add(w); st.v3.walls[i] = w; } });
    // the bookmarks
    st.v3.ribbons = PA_ROUTE.checks.slice(1).map(c => K.add(ribbon(c.z)));
    // far off: the Reader's sleeping hand in the haze
    K.add(hand(120, -200, 9));
    K.add(hand(-160, -320, 7));
    // the saucer
    st.v3.saucer = K.add(PASAUCER.make());
    st.v3.H = heroes(K, st);
    st.v3.aliens = PAALIEN.make(K);
    st.v3.fx = PAFX.make(K);
    st.v3.cam = { pos: null, at: null };
    PAROOM.build(K, st);
    PALIFE.build(K, st);
    bigShadows(K);
    K.focusRange = 9;
  };
  const deskTex = () => K3D.paint('paDesk', 512, 512, (c, w, h) => {
    c.fillStyle = '#7a5236'; c.fillRect(0, 0, w, h); const r = P.rng(8);
    for (let y = 0; y < h; y += 3) { c.fillStyle = 'rgba(40,20,10,' + (0.05 + r() * 0.1) + ')'; c.fillRect(0, y, w, 1 + r() * 2); }
  }, { repeat: true });

  /* ---------- every drawn frame ---------- */
  const tmp = new T.Vector3(), tmp2 = new T.Vector3();
  S.draw = function (K, st, dt) {
    const V = st.v3; if (!V || !V.H) return;
    const t = G.clock;
    S.wind.value = t;
    // heroes
    const guns = [];
    G.players.forEach((p, k) => {
      const b = p.b3, h = st.h[k], R = V.H[k];
      const flat = !!h.flat;
      R.h.visible = !flat; R.gun.visible = !flat; R.sticker.visible = flat;
      if (flat) { R.sticker.position.set(b.x, 0.012, b.z); R.sticker.rotation.y = h.aim + Math.PI; }
      // the shrink at the start: giant to tiny
      let sc = 1;
      if (st.phase === 'shrink' && G.introT <= 0) { const kk = clamp((st.shrinkT || 0) / (PA.shrinkT * 0.8), 0, 1); sc = 1 + 7 * Math.pow(1 - kk, 2); }
      else if (G.introT > 0 && st.phase === 'shrink') sc = 8;
      // peeling up after a restart: a sticker lifting off the page
      const unp = h.unpeel > 0 ? clamp(1 - h.unpeel / 0.5, 0.05, 1) : 1;
      R.h.scale.set(sc, sc * (h.unpeel > 0 && st.phase === 'march' ? Math.max(0.1, unp) : 1), sc);
      const sp = Math.hypot(b.vx, b.vz) / (PHYS.maxRun / K3D.U);
      R.gun.updateMatrixWorld(true);
      const grip = R.gun.localToWorld(tmp.set(0, -0.06, -0.02)).clone(), front = R.gun.localToWorld(tmp2.set(0.05, 0.0, 0.08)).clone();
      K3D.heroPose(R.h, { x: b.x, y: b.y, z: b.z, heading: h.aim, speed: sp, vy: b.vy, land: b.land || (R.wasFlat && !flat), hands: flat ? null : [grip, front] }, dt);
      R.wasFlat = flat;
      K3D.placeBlob(R.blob, b.x, 0, b.z, b.y);
      R.blob.visible = !flat;
      // the gun: charge lights, the crank while reloading, a flash on each shot
      if (h.sinceShot < 0.06) R.fire = 1; else R.fire = Math.max(0, R.fire - dt * 14);
      R.gun.userData.set(h.charge / PA.charge, h.reload > 0 ? h.reload / (h.reloadDur || 1) : 0, R.fire, K.camera);
      guns.push(R.gun.localToWorld(new T.Vector3(0, 0.01, 0.37)));
      // rocket-pack flames flicker, Bo's antenna balls bob
      R.h.traverse(o => { if (o.userData.flame) o.scale.y = 0.8 + Math.sin(t * 30 + o.id) * 0.25; if (o.userData.antenna) o.position.y = 0.44 + Math.sin(t * 6 + o.userData.antenna) * 0.02; });
      R.thimble.visible = h.shield > 0 && !flat; if (R.thimble.visible) R.thimble.position.set(b.x, b.y + 1.25 + Math.sin(t * 3) * 0.05, b.z);
    });
    // the room and the living page
    PAROOM.update(K, st, dt, t);
    PALIFE.update(K, st, dt, t);
    // aliens and effects
    // beaten aliens crumple for a quarter of a second before the paper ball takes over (drawing only)
    V.crum = V.crum || []; V.crumN = V.crumN == null ? -1 : V.crumN;
    for (const f of st.fx) if (f.n > V.crumN) { V.crumN = f.n; if (f.kind === 'crumple') V.crum.push({ a: f.a, t: 0 }); else if (f.kind === 'restart') V.crum.length = 0; }
    if (!V.holdFx) for (const c of V.crum) c.t += dt;
    V.crum = V.crum.filter(c => c.t < 0.24);
    const shown = V.crum.length ? st.aliens.concat(V.crum.map(c => Object.assign({ st: 'crumple', seed: 0, crumple: Math.max(0.02, c.t / 0.24) }, c.a))) : st.aliens;
    V.aliens.update(st, shown, dt, K.camera);
    V.fx.update(st, dt, K.camera, guns);
    // walls fall when a blockade is beaten
    for (const [i, w] of Object.entries(V.walls)) {
      const down = !!st.wallDown[i];
      w.userData.k = approach(w.userData.k || 0, down ? 1 : 0, dt * 2.5);
      const k = w.userData.k; w.visible = k < 1;
      w.position.y = -k * 0.8; w.scale.set(1, 1 - k * 0.9, 1);
    }
    V.ribbons.forEach((m, i) => { const saved = st.ck >= i + 1; m.material.emissive = m.material.emissive || new T.Color(); m.material.emissive.set(saved ? '#ff6a6a' : '#000000'); m.material.emissiveIntensity = saved ? 0.2 + Math.sin(t * 3) * 0.05 : 0; });
    // the saucer hangs ahead, getting bigger the further the march goes
    const prog = clamp(-st.cz / -PA_ROUTE.stretches[3].z1, 0, 1);
    const sau = V.saucer;
    sau.position.set(4 + Math.sin(t * 0.3) * 3, 30 - prog * 6 + Math.sin(t * 0.8) * 0.6, st.cz - 95 + prog * 30);
    sau.scale.setScalar(1 + prog * 0.6);
    sau.userData.update(t);
    // the camera: above and behind the pair, looking forward and down; eases back at the wide moments
    const ws = st.wideT > 0 ? clamp(Math.min(st.wideT, 1), 0, 1) : 0;
    V.wide = approach(V.wide || 0, ws, dt * 0.8);
    let dist = 15.5 + V.wide * 9, pitch = 33 * Math.PI / 180;
    let fx = st.cx, fz = st.cz - 2.5;
    if (st.phase === 'shrink' || G.introT > 0) {
      // the shrink: close on the heroes, pulling back as they shrink
      const kk = G.introT > 0 ? 0 : clamp((st.shrinkT || 0) / PA.shrinkT, 0, 1);
      dist = 34 - 13 * Math.pow(kk, 1.5); pitch = (28 + kk * 12) * Math.PI / 180; fz = st.cz - 1 + kk * -1.5;
    }
    const want = v(fx, Math.sin(pitch) * dist, fz + Math.cos(pitch) * dist), at = v(fx, 0.4, fz);
    const C = V.cam;
    if (!C.pos || V.snap) { C.pos = want.clone(); C.at = at.clone(); V.snap = false; }
    else { C.pos.lerp(want, 1 - Math.exp(-4 * dt)); C.at.lerp(at, 1 - Math.exp(-4 * dt)); }
    // (screenshot tools may hold the camera at a spot: V.camOverride = { pos: [x, y, z], at: [x, y, z] })
    const O = V.camOverride; if (O) { C.pos.set(...O.pos); C.at.set(...O.at); }
    const focusAt = O && O.focus;
    K.camera.position.copy(C.pos);
    if (st.shake > 0 && !reduceMotion) K.camera.position.add(v((Math.random() - 0.5) * st.shake * 0.5, (Math.random() - 0.5) * st.shake * 0.3, 0));
    K.camera.lookAt(C.at);
    // keep sharp what the players look at: the pair
    const mz = (G.players[0].b3.z + G.players[1].b3.z) / 2, mx = (G.players[0].b3.x + G.players[1].b3.x) / 2;
    if (focusAt) K.focus.set(...focusAt); else if (O) K.focus.set(...O.at); else K.focus.set(mx, 0.4, mz);
    K.sunAt(v(C.at.x, 0, C.at.z - 3), 24);
    // after a restart, jump the camera straight to its place
    if (V.lastCk !== st.fxN && st.fx.length && st.fx[st.fx.length - 1].kind === 'restart' && st.fx[st.fx.length - 1].n !== V.restartN) { V.restartN = st.fx[st.fx.length - 1].n; V.snap = true; }
  };
  return S;
})();
