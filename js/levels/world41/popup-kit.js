/* Pip & Bo - World 41 Pop-Up Storybook: the paper-and-card building kit (global POPUP). Loaded on demand with the
   3D kit (K3D.files in js/3d/k3d.js), so it may use three.js (K3D.T) at load time.

   Everything is paper and card and looks it: cut-out shapes with a white cut edge, printed storybook illustration on
   their faces (ink line and soft watercolour, painted with 2D canvas code into textures), fold lines, glue tabs, brass
   paper fasteners. Units are K3D units (1 = one 2D tile), Y up, the open page is y = 0.

   Painting (2D canvas helpers, all seeded so every run paints the same):
     POPUP.rng(seed)                    a seeded random 0..1
     POPUP.paper(c, w, h, col, seed)    paper with fibres and grain
     POPUP.wash(c, x, y, r, col, a, rnd)   a watercolour blot with a darker drying edge
     POPUP.leaves(c, w, h, base, seed)  printed foliage (hedges, bushes)
   Building (each returns an Object3D; the caller adds it to the scene):
     POPUP.card(shape, { tex, depth, edge, ink, back })        an extruded card with a printed face and a white cut edge
     POPUP.book({ pw, pd })            the open book: covers, page block, two pages; .pages[0|1] are the page meshes
     POPUP.pageTex(key, pw, pd, paint)   a page's texture: cream paper, faint printed text, page number, + paint(c, s)
     POPUP.hedge(points, { h, t, flowers, posts, tufts })   a box-fold paper hedge along a line: leafy print (some
                                       runs in flower), posts with topiary balls at corners and ends, grass tufts
     POPUP.roseBush(x, z, rot, s)      a V-fold rose bush with layered paper roses
     POPUP.fountain(x, z, s)           tiered card fountain with blue tissue water
     POPUP.peacock(x, z, rot, s)       a cut-out paper peacock on a V-fold stand
     POPUP.bookmark(x, z, rot, col)    a silk ribbon bookmark stuck in the page (.userData.lit(t) lights it)
     POPUP.dotted(points, done)        a dotted pencil line with a pencil icon at its start; .userData.set(n) inks dots
     POPUP.pencil()                    the giant yellow pencil, 5 long, along +X (eraser at -X, point at +X)
     POPUP.tuft(rnd)                   a grass tuft card (hedges put them along their foot)
     POPUP.bench / sundial / fence / tulips / tulip / mushrooms / bunny / butterfly   the lawns' pop-ups
     POPUP.room(o)                     beyond the book: the desk, teacup, brass lamp, rainy window, attic, dust motes
     POPUP.desk(o)                     the desk's clutter: coloured pencils, eraser, ruler, scissors, clips, crumpled
                                       paper, spectacles, a pencil pot, a fern and the Bookworm's sketch of the page
*/
'use strict';

const POPUP = (function () {
  const T = K3D.T;
  const P = {};
  const INK = '#2b2130', EDGE = '#fbf7ec', CREAM = '#f3ead2';
  // hex in, hex out (the 2D shade / tint return rgb() strings, which can't be mixed again)
  const dk = (c, t) => mixHex(c, '#141428', t), lt = (c, t) => mixHex(c, '#ffffff', t);
  P.INK = INK; P.EDGE = EDGE; P.CREAM = CREAM;

  /* ---------- painting ---------- */
  P.rng = function (seed) {
    let a = (seed * 2654435761) >>> 0 || 1;
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  };
  const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; };
  P.rgba = rgba;
  P.paper = function (c, w, h, col, seed = 1) {
    const r = P.rng(seed);
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    // soft mottling
    for (let i = 0; i < w * h / 9000; i++) {
      const x = r() * w, y = r() * h, rad = 20 + r() * 90;
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      const dk = r() < 0.5;
      g.addColorStop(0, dk ? 'rgba(120,90,50,0.035)' : 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // fibres
    c.lineWidth = 0.6;
    for (let i = 0; i < w * h / 700; i++) {
      const x = r() * w, y = r() * h, a = r() * Math.PI * 2, l = 2 + r() * 7;
      c.strokeStyle = r() < 0.5 ? 'rgba(110,80,40,0.07)' : 'rgba(255,255,255,0.18)';
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
    // grain specks
    for (let i = 0; i < w * h / 260; i++) {
      c.fillStyle = r() < 0.6 ? 'rgba(90,70,40,0.06)' : 'rgba(255,255,255,0.12)';
      c.fillRect(r() * w, r() * h, 1, 1);
    }
  };
  // a watercolour blot: a soft irregular wash, a little pooling at its rim, as paint dries on paper
  P.wash = function (c, x, y, rad, col, a, r, o = {}) {
    const n = 18, pts = [];
    for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2, k = 0.72 + r() * 0.42; pts.push([x + Math.cos(t) * rad * k * (o.sx || 1), y + Math.sin(t) * rad * k * (o.sy || 1)]); }
    const path = () => { c.beginPath(); for (let i = 0; i <= n; i++) { const p0 = pts[i % n], p1 = pts[(i + 1) % n]; const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2; if (!i) c.moveTo(mx, my); else c.quadraticCurveTo(p0[0], p0[1], mx, my); } c.closePath(); };
    path();
    const g = c.createRadialGradient(x, y, 0, x, y, rad * 1.1);
    g.addColorStop(0, rgba(col, a * 0.75)); g.addColorStop(0.85, rgba(col, a)); g.addColorStop(1, rgba(col, a * 0.9));
    c.fillStyle = g; c.fill();
    if (!o.noEdge) { c.strokeStyle = rgba(dk(col, 0.25), a * 0.55); c.lineWidth = Math.max(1, rad * 0.04); path(); c.stroke(); }
  };
  // ink line with a slight wobble (a pen, not a ruler)
  P.inkLine = function (c, pts, wdt, col = INK, r = Math.random) {
    c.strokeStyle = col; c.lineWidth = wdt; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    pts.forEach((p, i) => { const jx = (r() - 0.5) * wdt * 0.6, jy = (r() - 0.5) * wdt * 0.6; if (!i) c.moveTo(p[0] + jx, p[1] + jy); else c.lineTo(p[0] + jx, p[1] + jy); });
    c.stroke();
  };
  // printed foliage, as a storybook illustrator draws it: a soft wash, then rows of rounded leaf clumps, each with a
  // lit top, a shaded underside, an ink line along its lower edge and a few leaf ticks
  P.leaves = function (c, w, h, base, seed, o = {}) {
    const r = P.rng(seed), cl = o.clump || 26;
    c.fillStyle = dk(base, 0.18); c.fillRect(0, 0, w, h);
    for (let i = 0; i < w * h / 4000; i++) P.wash(c, r() * w, r() * h, 30 + r() * 50, r() < 0.5 ? dk(base, 0.25) : base, 0.4, r, { noEdge: true });
    const rows = Math.ceil(h / (cl * 0.75)) + 1;
    for (let row = 0; row < rows; row++) {
      const y = row * cl * 0.75 + (r() - 0.5) * 4;
      for (let x = -cl + (row % 2) * cl * 0.5; x < w + cl; x += cl * (0.8 + r() * 0.3)) {
        const rad = cl * (0.55 + r() * 0.2), cx = x + (r() - 0.5) * 6, cy = y + (r() - 0.5) * 6;
        // the clump: base colour, a lit cap toward the top left, a shade at the bottom
        c.fillStyle = mixHex(base, r() < 0.5 ? '#7fb85a' : '#3f7a3a', r() * 0.35);
        c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,250,200,0.22)'; c.beginPath(); c.arc(cx - rad * 0.25, cy - rad * 0.3, rad * 0.62, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(10,40,20,0.18)'; c.beginPath(); c.arc(cx + rad * 0.1, cy + rad * 0.35, rad * 0.7, 0.1, Math.PI - 0.1); c.fill();
        // leaf ticks
        c.strokeStyle = rgba(dk(base, 0.5), 0.55); c.lineWidth = 1.3; c.lineCap = 'round';
        for (let k = 0; k < 4; k++) { const a = r() * Math.PI * 2, d = r() * rad * 0.6, lx = cx + Math.cos(a) * d, ly = cy + Math.sin(a) * d; c.beginPath(); c.moveTo(lx, ly); c.quadraticCurveTo(lx + 3, ly - 4, lx + 6, ly - 2); c.stroke(); }
        // the ink line along the lower edge of the clump
        c.strokeStyle = rgba(INK, 0.6); c.lineWidth = 1.8;
        c.beginPath(); c.arc(cx, cy, rad, Math.PI * (0.15 + r() * 0.1), Math.PI * (0.85 - r() * 0.1)); c.stroke();
      }
    }
    // a little sparkle of lighter leaves
    for (let i = 0; i < w * h / 900; i++) { c.fillStyle = rgba(lt(base, 0.45), 0.6); c.beginPath(); c.ellipse(r() * w, r() * h, 3, 1.6, r() * 3, 0, Math.PI * 2); c.fill(); }
  };

  /* ---------- cards ---------- */
  // UVs on a card's faces span the shape's bounding box (0..1), so a texture covers the shape exactly
  function boxUV(shape) {
    const pts = shape.getPoints(24); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    const sw = x1 - x0 || 1, sh = y1 - y0 || 1;
    return {
      generateTopUV(g, v, a, b, c2) { return [a, b, c2].map(i => new T.Vector2((v[i * 3] - x0) / sw, (v[i * 3 + 1] - y0) / sh)); },
      generateSideWallUV(g, v, a, b, c2, d) { return [new T.Vector2(0, 0), new T.Vector2(1, 0), new T.Vector2(1, 1), new T.Vector2(0, 1)]; },
    };
  }
  P.cardGeo = function (shape, depth = 0.035, seg = 12) {
    return new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: seg, UVGenerator: boxUV(shape) }).translate(0, 0, -depth / 2);
  };
  // a card: printed faces (tex or colour), a white cut edge, an ink outline
  P.card = function (shape, o = {}) {
    const geo = o.geo || P.cardGeo(shape, o.depth || 0.035, o.seg || 12);
    // (one material per colour and print, shared, so K3D.bake can merge every card that looks alike)
    const face = o.mat || K3D.mat('card|' + (o.col || '#ffffff') + '|' + (o.tex ? o.tex.uuid : ''), () => K3D.toon(o.col || '#ffffff', { map: o.tex || null, side: T.DoubleSide }));
    const edge = K3D.mat('edge|' + (o.edge || EDGE), () => K3D.toon(o.edge || EDGE));
    const m = K3D.mesh(geo, [face, edge], { ink: o.ink === false ? false : (o.ink || INK), inkW: o.inkW || 0.9, cast: o.cast !== false });
    return m;
  };
  P.shapeFrom = function (pts) { const s = new T.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); s.closePath(); return s; };
  // a scalloped top edge from x0 to x1 at height h (hedge tops, bushes)
  P.scallopShape = function (w, h, bumps, depthK = 0.18, r = Math.random) {
    const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h * 0.86);
    const bw = w / bumps;
    for (let i = 0; i < bumps; i++) {
      const x0 = -w / 2 + i * bw, x1 = x0 + bw, top = h * (1 - r() * 0.06);
      s.bezierCurveTo(x0 + bw * 0.05, top + bw * depthK, x1 - bw * 0.05, top + bw * depthK, x1, h * 0.86 + (r() - 0.5) * 0.02);
    }
    s.lineTo(w / 2, 0); s.closePath();
    return s;
  };
  // a brass paper fastener (split pin head): a domed disc
  P.fastener = function (r = 0.07) {
    const m = new T.Mesh(K3D.geo('fast|' + r, () => new T.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2)),
      K3D.mat('brass', () => K3D.toon('#d9a640')));
    K3D.ink(m, '#5a3d14', 0.6);
    return m;
  };
  // glue tabs and fold lines printed on the page under a standing piece (decals lying on the page)
  P.tab = function (w, d, col = '#efe3c4') {
    const tex = K3D.paint('tab|' + col, 128, 64, (c, W2, H2) => {
      c.fillStyle = col; c.beginPath(); c.moveTo(10, H2); c.lineTo(22, 4); c.lineTo(W2 - 22, 4); c.lineTo(W2 - 10, H2); c.closePath(); c.fill();
      c.strokeStyle = rgba(INK, 0.35); c.lineWidth = 2; c.stroke();
      c.setLineDash([6, 5]); c.strokeStyle = rgba(INK, 0.4); c.beginPath(); c.moveTo(10, H2 - 2); c.lineTo(W2 - 10, H2 - 2); c.stroke();
    });
    const m = new T.Mesh(K3D.geo('tabGeo', () => new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), K3D.mat('tabM|' + col, () => { const m = K3D.toon('#ffffff', { map: tex, transparent: true, polygonOffset: -1, depthWrite: false }); m.userData.flatDecal = true; return m; }));
    m.scale.set(w, 1, d); m.receiveShadow = true;
    return m;
  };

  /* ---------- the book ---------- */
  // a page's texture: cream paper, faint printed text in the margins, a page number, then the page's own picture
  P.pageTex = function (key, pw, pd, paint, o = {}) {
    const S = o.ppu || 96, w = Math.round(pw * S), h = Math.round(pd * S);
    return K3D.paint('page|' + key, w, h, (c) => {
      P.paper(c, w, h, CREAM, key.length * 31 + 7);
      const r = P.rng(key.length * 7 + 3);
      paint(c, S, r, w, h);
      // faint printed text: a storybook's lines of type, under the picture's wash
      if (o.text !== false) {
        c.fillStyle = rgba('#3b3040', 0.16);
        c.font = Math.round(S * 0.22) + 'px Georgia, "DejaVu Serif", serif';
        const words = 'Once upon a time in the attic there was a very large and very old storybook and the Bookworm lived in its spine drawing every page with his giant yellow pencil'.split(' ');
        for (const blk of o.textBlocks || []) {
          let y = blk[1] * S, wi = blk.length > 4 ? blk[4] : 0;
          while (y < (blk[1] + blk[3]) * S) {
            let x = blk[0] * S;
            while (x < (blk[0] + blk[2]) * S - S * 0.6) {
              const wd = words[wi++ % words.length];
              const ww = c.measureText(wd + ' ').width;
              if (x + ww > (blk[0] + blk[2]) * S) break;
              c.fillText(wd, x, y); x += ww;
            }
            y += S * 0.34;
          }
        }
      }
      // the page number, in a little printed flourish
      if (o.num) {
        const [nx, nz] = o.numAt || [pw / 2, pd - 0.6];
        c.fillStyle = rgba('#3b3040', 0.55); c.font = 'italic ' + Math.round(S * 0.42) + 'px Georgia, "DejaVu Serif", serif';
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.num, nx * S, nz * S);
        c.strokeStyle = rgba('#3b3040', 0.35); c.lineWidth = 2;
        for (const s of [-1, 1]) { c.beginPath(); c.moveTo(nx * S + s * S * 0.4, nz * S); c.quadraticCurveTo(nx * S + s * S * 0.8, nz * S - S * 0.15, nx * S + s * S * 1.2, nz * S); c.stroke(); }
      }
      // the gutter's shadow on the inner edge
      const gx = o.gutter === 'left' ? 0 : w, g = c.createLinearGradient(gx, 0, o.gutter === 'left' ? S * 1.4 : w - S * 1.4, 0);
      g.addColorStop(0, 'rgba(80,55,30,0.32)'); g.addColorStop(1, 'rgba(80,55,30,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
  };
  // the open book. Pages are pw x pd each, left page x in [-pw, 0], right page [0, pw], z in [-pd/2, pd/2]
  P.book = function (o) {
    const pw = o.pw, pd = o.pd, g = new T.Group();
    const thick = 1.3, cov = 0.16, over = 0.45;
    // cloth-bound covers with gold tooling
    const cloth = K3D.paint('cloth', 1024, 1024, (c, w, h) => {
      const r = P.rng(5);
      c.fillStyle = '#2f5a48'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 26000; i++) { c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)'; c.fillRect(r() * w, r() * h, 1 + r() * 2, 1); }
      for (let y = 0; y < h; y += 3) { c.fillStyle = 'rgba(0,0,0,0.04)'; c.fillRect(0, y, w, 1); }
      c.strokeStyle = '#c9a24a'; c.lineWidth = 6; c.strokeRect(40, 40, w - 80, h - 80);
      c.lineWidth = 2; c.strokeRect(58, 58, w - 116, h - 116);
      for (const [x, y] of [[58, 58], [w - 58, 58], [58, h - 58], [w - 58, h - 58]]) { c.beginPath(); c.arc(x, y, 18, 0, Math.PI * 2); c.stroke(); }
      // wear on the corners
      for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) { const gg = c.createRadialGradient(x, y, 0, x, y, 160); gg.addColorStop(0, 'rgba(210,190,150,0.35)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gg; c.fillRect(x - 160, y - 160, 320, 320); }
    });
    const coverM = K3D.toon('#ffffff', { map: cloth });
    for (const s of [-1, 1]) {
      const cv = K3D.mesh(new T.BoxGeometry(pw + over, cov, pd + over * 2), coverM, { ink: '#14241c', inkW: 1 });
      cv.position.set(s * (pw + over) / 2, -thick - cov / 2, 0); g.add(cv);
    }
    // the spine under the gutter
    const sp = K3D.mesh(new T.CylinderGeometry(0.5, 0.5, pd + over * 2, 24, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2), coverM, { ink: '#14241c' });
    sp.position.set(0, -thick - cov, 0); g.add(sp);
    // the page block: stacked page edges
    const edges = K3D.paint('pageEdges', 512, 256, (c, w, h) => {
      const r = P.rng(9);
      c.fillStyle = '#efe4c8'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 2) { c.fillStyle = r() < 0.5 ? 'rgba(120,95,60,0.18)' : 'rgba(255,255,255,0.25)'; c.fillRect(0, y, w, 1); }
      const gg = c.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(1, 'rgba(110,80,40,0.25)'); c.fillStyle = gg; c.fillRect(0, 0, w, h);
    }, { repeat: true });
    edges.repeat.set(4, 1);
    const blockM = [K3D.toon('#ffffff', { map: edges }), K3D.toon('#ffffff', { map: edges }), K3D.toon(CREAM), K3D.toon(CREAM), K3D.toon('#ffffff', { map: edges }), K3D.toon('#ffffff', { map: edges })];
    for (const s of [-1, 1]) {
      const blk = K3D.mesh(new T.BoxGeometry(pw - 0.05, thick - 0.06, pd), blockM, { ink: '#6b5536', inkW: 0.8 });
      blk.position.set(s * (pw / 2 + 0.025), -thick / 2 - 0.03, 0); g.add(blk);
    }
    // the two top pages: bowed into the gutter and curling a little at the far edge
    g.userData.pages = [];
    for (const s of [-1, 1]) {
      const geo = new T.PlaneGeometry(pw, pd, 64, 64).rotateX(-Math.PI / 2);
      const a = geo.attributes.position;
      for (let i = 0; i < a.count; i++) {
        const x = a.getX(i) + s * pw / 2, z = a.getZ(i);
        let y = 0;
        const gd = Math.abs(x); if (gd < 1.1) y -= 0.16 * Math.pow(1 - gd / 1.1, 2);
        const far = -pd / 2 + 1.6; if (z < far) y += 0.5 * Math.pow((far - z) / 1.6, 2.2);
        const outer = pw - 0.9; if (gd > outer) y += 0.08 * Math.pow((gd - outer) / 0.9, 2);
        a.setY(i, y);
      }
      geo.computeVertexNormals();
      const page = K3D.mesh(geo, K3D.toon('#ffffff', { map: o.tex[s < 0 ? 0 : 1] }), { ink: false, cast: false });
      page.position.x = s * pw / 2; page.receiveShadow = true;
      g.add(page); g.userData.pages.push(page);
      // the thin white edge of the top page all round
      const rim = K3D.mesh(new T.BoxGeometry(pw, 0.02, 0.02), K3D.toon(EDGE), { ink: '#8a7550', inkW: 0.5 });
      rim.position.set(s * pw / 2, -0.01, pd / 2); g.add(rim);
    }
    return g;
  };

  /* ---------- standing pieces ---------- */
  // a box-fold paper hedge along a polyline: two printed walls with scalloped tops, a leafy top card, end caps,
  // glue tabs on the page
  P.hedge = function (pts, o = {}) {
    const h = o.h || 1.1, t = o.t || 0.62, g = new T.Group(), seed = o.seed || 1;
    const shade = (c, w, hh) => {
      // the shaded foot of the hedge and a lit top band
      const gg = c.createLinearGradient(0, 0, 0, hh); gg.addColorStop(0, 'rgba(255,250,200,0.18)'); gg.addColorStop(0.25, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(10,30,10,0.35)');
      c.fillStyle = gg; c.fillRect(0, 0, w, hh);
    };
    const tex = K3D.paint('hedgeLeaves', 1024, 512, (c, w, hh) => { P.leaves(c, w, hh, '#4f8a43', 11, { clump: 30 }); shade(c, w, hh); }, { repeat: true });
    // a second print: a little lighter, in flower (white and pink blossom), so long runs never repeat one look
    const texB = K3D.paint('hedgeLeavesB', 1024, 512, (c, w, hh) => {
      P.leaves(c, w, hh, '#5a9448', 13, { clump: 28 });
      const r = P.rng(14);
      for (let i = 0; i < 70; i++) {
        const x = r() * w, y = 30 + r() * (hh - 90), col = r() < 0.55 ? '#fbf3f0' : r() < 0.6 ? '#f2a6bc' : '#f6d36a', rad = 5 + r() * 3;
        for (let k = 0; k < 5; k++) { c.fillStyle = col; c.beginPath(); c.ellipse(x + Math.cos(k * 1.257) * rad, y + Math.sin(k * 1.257) * rad, rad * 0.75, rad * 0.5, k * 1.257, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = '#e8a83a'; c.beginPath(); c.arc(x, y, rad * 0.45, 0, Math.PI * 2); c.fill();
        c.strokeStyle = rgba(INK, 0.45); c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, rad * 1.5, 0.3, 2.6); c.stroke();
      }
      shade(c, w, hh);
    }, { repeat: true });
    const topTex = K3D.paint('hedgeTop', 512, 512, (c, w, hh) => P.leaves(c, w, hh, '#5d9a4d', 12, { clump: 28 }), { repeat: true });
    const wallM = K3D.mat('hedgeWall', () => K3D.toon('#ffffff', { map: tex, side: T.DoubleSide }));
    const wallMB = K3D.mat('hedgeWallB', () => K3D.toon('#ffffff', { map: texB, side: T.DoubleSide }));
    const topM = K3D.mat('hedgeTopM', () => K3D.toon('#ffffff', { map: topTex, side: T.DoubleSide }));
    const edgeM = K3D.mat('edge|' + EDGE, () => K3D.toon(EDGE));
    // topiary: clipped leafy balls and square posts at the corners and ends
    const ballTex = K3D.paint('topiaryBall', 512, 256, (c, w, hh) => { P.leaves(c, w, hh, '#4a8640', 15, { clump: 22 }); }, { repeat: true });
    const ballM = K3D.mat('topiaryBallM', () => K3D.toon('#ffffff', { map: ballTex }));
    const r = P.rng(seed);
    const flowers = o.flowers == null ? 0.4 : o.flowers;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
      const seg = new T.Group(); seg.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); seg.rotation.y = -ang; g.add(seg);
      const bumps = Math.max(2, Math.round(len / 0.55)), wm = r() < flowers ? wallMB : wallM;
      for (const s of [-1, 1]) {
        const shape = P.scallopShape(len, h, bumps, 0.2, r);
        const geo = P.cardGeo(shape, 0.03, 8);
        // texture repeats along the hedge: UVs are 0..1 over the bounding box, so scale u by length
        const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * len / 2.2 + r() * 0);
        const wall = K3D.mesh(geo, [wm, edgeM], { ink: INK, inkW: 0.9 });
        wall.position.z = s * t / 2; seg.add(wall);
      }
      const top = K3D.mesh(new T.BoxGeometry(len, 0.02, t).translate(0, h * 0.84, 0), topM, { ink: INK, inkW: 0.7 });
      const tuv = top.geometry.attributes.uv; for (let k = 0; k < tuv.count; k++) tuv.setX(k, tuv.getX(k) * len / 2);
      seg.add(top);
      for (const s of [-1, 1]) { const tb = P.tab(len, 0.2); tb.position.set(0, 0.004, s * (t / 2 + 0.1)); seg.add(tb); }
      // grass tufts along the foot, both sides
      if (o.tufts !== false) for (const s of [-1, 1]) for (let d = -len / 2 + 0.3 + r() * 0.5; d < len / 2 - 0.3; d += 0.7 + r() * 0.9) {
        const tf = P.tuft(r); tf.position.set(d, 0, s * (t / 2 + 0.05)); tf.rotation.y = s > 0 ? 0 : Math.PI; seg.add(tf);
      }
      // end caps on the first and last segment
      for (const e of [i === 0 ? -1 : 0, i === pts.length - 2 ? 1 : 0]) if (e) {
        const cap = K3D.mesh(P.cardGeo(P.scallopShape(t, h, 1, 0.25, r), 0.03, 8), [wm, edgeM], { ink: INK, inkW: 0.9 });
        cap.rotation.y = Math.PI / 2; cap.position.x = e * len / 2; seg.add(cap);
      }
    }
    // posts with a ball on top at every corner and both ends of a tall hedge; a small ball on the ends of a low one
    if (o.posts !== false) pts.forEach(([x, z], i) => {
      const end = i === 0 || i === pts.length - 1;
      if (h < 0.8 && !end) return;
      const pw = t + 0.16, ph = h < 0.8 ? h + 0.1 : h * 1.14, br = h < 0.8 ? t * 0.42 : t * 0.56;
      const post = K3D.mesh(K3D.geo('hedgePost|' + pw + '|' + ph, () => new T.BoxGeometry(pw, ph, pw).translate(0, ph / 2, 0)), wallM, { ink: INK, inkW: 0.9 });
      post.position.set(x, 0, z); g.add(post);
      const ball = K3D.mesh(K3D.geo('topiary|' + br, () => new T.SphereGeometry(br, 20, 14)), ballM, { ink: INK, inkW: 0.8 });
      ball.position.set(x, ph + br * 0.85, z); ball.rotation.y = r() * 6; g.add(ball);
    });
    return g;
  };
  // a little grass tuft card (pointed blades), standing at the foot of hedges and things
  P.tuft = function (r = Math.random) {
    const v = Math.floor(r() * 3);
    const geo = K3D.geo('tuft|' + v, () => {
      const rr = P.rng(171 + v), pts = [[-0.16, 0]];
      const n = 4 + v;
      for (let k = 0; k < n; k++) { const x = -0.16 + (k + 0.5) * 0.32 / n; pts.push([x - 0.02, 0.05], [x + (rr() - 0.5) * 0.06, 0.16 + rr() * 0.14]); }
      pts.push([0.16, 0]);
      return P.cardGeo(P.shapeFrom(pts), 0.012, 4);
    });
    const m = K3D.mesh(geo, [K3D.mat('tuftM', () => K3D.toon('#6aa54f', { side: T.DoubleSide })), K3D.mat('tuftE', () => K3D.toon('#9ccc78'))], { ink: INK, inkW: 0.6, cast: false });
    m.scale.setScalar(0.8 + r() * 0.5);
    return m;
  };

  // a layered paper rose: three scalloped discs and a curl, tilted to face out
  function rose(col) {
    const g = new T.Group();
    const flower = (n, rad) => { const s = new T.Shape(); for (let i = 0; i <= n * 8; i++) { const a = i / (n * 8) * Math.PI * 2, rr = rad * (0.82 + 0.18 * Math.abs(Math.cos(a * n / 2))); const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? s.lineTo(x, y) : s.moveTo(x, y); } return s; };
    const layers = [[5, 0.15, 0], [5, 0.11, 0.6], [4, 0.07, 1.1]];
    layers.forEach(([n, rad, rot], i) => {
      const m = K3D.mesh(K3D.geo('roseL' + i, () => P.cardGeo(flower(n, rad), 0.012, 4)), [K3D.mat('rose|' + col + i, () => K3D.toon(i ? dk(col, i * 0.12) : col)), K3D.mat('edge|' + EDGE, () => K3D.toon(EDGE))], { ink: dk(col, 0.55), inkW: 0.55, cast: i === 0 });
      m.position.z = i * 0.03; m.rotation.z = rot; g.add(m);
    });
    const curl = K3D.mesh(K3D.geo('roseCurl', () => new T.TorusGeometry(0.025, 0.012, 6, 12, Math.PI * 1.5)), K3D.mat('roseC|' + col, () => K3D.toon(dk(col, 0.35))), { ink: false, cast: false });
    curl.position.z = 0.1; g.add(curl);
    return g;
  }
  P.roseBush = function (x, z, rot = 0, s = 1, col = '#e0507a', seed = 3) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot; g.scale.setScalar(s);
    const r = P.rng(seed);
    const tex = K3D.paint('bush', 512, 512, (c, w, h) => P.leaves(c, w, h, '#3f7f45', 21, { clump: 36 }));
    // the bush: a round-topped card on a V-fold, two halves meeting at the fold
    const shape = new T.Shape(); shape.moveTo(-0.55, 0); shape.lineTo(-0.6, 0.45);
    shape.bezierCurveTo(-0.75, 0.95, -0.25, 1.15, 0, 1.0); shape.bezierCurveTo(0.25, 1.18, 0.78, 0.95, 0.6, 0.45); shape.lineTo(0.55, 0); shape.closePath();
    const bush = P.card(shape, { tex, depth: 0.03, inkW: 0.9 });
    g.add(bush);
    // the V-fold behind it holding it up
    for (const sd of [-1, 1]) {
      const vf = P.card(P.shapeFrom([[0, 0], [0.42, 0], [0, 0.55]]), { col: '#e9dfc4', depth: 0.02, inkW: 0.6 });
      vf.position.set(0, 0, -0.02); vf.rotation.y = sd > 0 ? -Math.PI / 2 - 0.5 : Math.PI / 2 + 0.5; vf.scale.x = 1;
      g.add(vf);
    }
    const tb = P.tab(1.2, 0.18); tb.position.set(0, 0.004, 0.1); g.add(tb);
    // roses pinned on the front
    const spots = [[-0.3, 0.72], [0.05, 0.86], [0.36, 0.66], [-0.08, 0.52], [0.28, 0.36], [-0.38, 0.34]];
    for (const [rx, ry] of spots) {
      const ro = rose(r() < 0.3 ? '#f08aa4' : col); ro.position.set(rx + (r() - 0.5) * 0.06, ry, 0.03); ro.rotation.z = r() * 6;
      ro.scale.setScalar(0.85 + r() * 0.4); g.add(ro);
    }
    return g;
  };

  // a pop-up topiary tree: a lollipop card (trunk and round crown) crossed with a second card, so it stands on its own
  P.tree = function (x, z, s = 1, seed = 7) {
    const g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
    const tex = K3D.paint('treeCard', 512, 768, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      // trunk
      c.fillStyle = '#8a5a34'; c.fillRect(w / 2 - 22, h * 0.55, 44, h * 0.45);
      c.strokeStyle = 'rgba(43,33,48,0.6)'; c.lineWidth = 3; c.strokeRect(w / 2 - 22, h * 0.55, 44, h * 0.45);
      for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(w / 2 - 14 + i * 3, h * 0.6 + i * 20); c.lineTo(w / 2 - 6 + i * 2, h * 0.64 + i * 20); c.stroke(); }
      // crown: a clipped leafy ball
      c.save(); c.beginPath(); c.arc(w / 2, h * 0.34, w * 0.46, 0, Math.PI * 2); c.clip();
      P.leaves(c, w, h * 0.7, '#4c8a46', seed, { clump: 40 });
      c.restore();
      c.strokeStyle = 'rgba(43,33,48,0.75)'; c.lineWidth = 4; c.beginPath(); c.arc(w / 2, h * 0.34, w * 0.46, 0, Math.PI * 2); c.stroke();
    });
    const shape = new T.Shape(); shape.moveTo(-0.1, 0); shape.lineTo(-0.1, 0.9); shape.absarc(0, 1.42, 0.62, -Math.PI / 2 - 0.16, Math.PI * 1.5 + 0.16, true); shape.lineTo(0.1, 0.9); shape.lineTo(0.1, 0); shape.closePath();
    const geo = P.cardGeo(shape, 0.03, 24);
    for (const r of [0, Math.PI / 2]) { const card = P.card(null, { geo, tex, depth: 0.03 }); card.rotation.y = r + 0.3; g.add(card); }
    for (const r of [0, Math.PI / 2]) { const tb = P.tab(0.5, 0.14); tb.position.set(0, 0.004, 0); tb.rotation.y = r + 0.3; g.add(tb); }
    return g;
  };
  // a locked garden gate between two box-folded card pillars (the gate's own pop-up arch comes from its dotted line)
  P.gate = function (x, z, rot = 0, w = 2.8) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    const brick = K3D.paint('pillarBrick', 256, 512, (c, W2, H2) => {
      P.paper(c, W2, H2, '#d9c7a6', 151); const r = P.rng(152);
      for (let y = 0; y < H2; y += 32) for (let x2 = (y / 32 % 2) * -24; x2 < W2; x2 += 48) { c.fillStyle = mixHex('#c79a72', '#b07a56', r()); c.fillRect(x2 + 2, y + 2, 44, 28); c.strokeStyle = 'rgba(43,33,48,0.45)'; c.lineWidth = 2; c.strokeRect(x2 + 2, y + 2, 44, 28); }
      for (let i = 0; i < 10; i++) P.wash(c, r() * W2, H2 * 0.8 + r() * H2 * 0.2, 20 + r() * 20, '#6f9a52', 0.35, r, { noEdge: true });
    });
    const pm = K3D.toon('#ffffff', { map: brick });
    for (const s2 of [-1, 1]) {
      const pil = K3D.mesh(new T.BoxGeometry(0.6, 1.9, 0.6).translate(0, 0.95, 0), pm, { ink: P.INK });
      pil.position.x = s2 * (w / 2 + 0.3); g.add(pil);
      const cap = K3D.mesh(new T.ConeGeometry(0.42, 0.4, 4).rotateY(Math.PI / 4).translate(0, 2.1, 0), K3D.toon('#b9b0a0'), { ink: P.INK });
      cap.position.x = s2 * (w / 2 + 0.3); g.add(cap);
      const ball = K3D.mesh(K3D.geo('gateBall', () => new T.SphereGeometry(0.12, 12, 8)), K3D.mat('brass', () => K3D.toon('#d9a640')), { ink: '#5a3d14', inkW: 0.6 });
      ball.position.set(s2 * (w / 2 + 0.3), 2.38, 0); g.add(ball);
    }
    // the gate: two leaves of wrought-iron card (cut-out bars) with a big padlock
    const iron = new T.Shape(); iron.moveTo(0, 0); iron.lineTo(w / 2, 0); iron.lineTo(w / 2, 1.3); iron.quadraticCurveTo(w / 4, 1.55, 0, 1.45); iron.closePath();
    for (let i = 0; i < 6; i++) { const hx = 0.12 + i * (w / 2 - 0.2) / 6, hole = new T.Path(); hole.moveTo(hx, 0.15); hole.lineTo(hx + 0.13, 0.15); hole.lineTo(hx + 0.13, 1.15); hole.lineTo(hx, 1.15); hole.closePath(); iron.holes.push(hole); }
    for (const s2 of [-1, 1]) {
      const leaf = P.card(iron, { col: '#3a3f4a', depth: 0.04, edge: '#5a606c', inkW: 0.8 });
      leaf.position.set(0, 0.05, 0); leaf.scale.x = -s2; leaf.position.x = 0; leaf.rotation.y = 0; leaf.position.x = s2 > 0 ? 0 : 0;
      if (s2 < 0) leaf.rotation.y = Math.PI;
      g.add(leaf);
    }
    const lock = K3D.mesh(K3D.roundBox(0.26, 0.24, 0.1, 0.6, 16).translate(0, 0.55, 0.05), K3D.mat('brass', () => K3D.toon('#d9a640')), { ink: '#5a3d14' });
    g.add(lock);
    const shack = K3D.mesh(new T.TorusGeometry(0.08, 0.02, 6, 16, Math.PI).translate(0, 0.79, 0.05), K3D.toon('#9a9aa8'), { ink: '#3a3a48', inkW: 0.6 }); g.add(shack);
    return g;
  };
  // a pull-tab sticking out of the page edge, printed with an arrow (paper engineering you can see)
  P.pullTab = function (x, z, rot = 0, word = 'Pull') {
    const tex = K3D.paint('pullTab|' + word, 256, 128, (c, w, h) => {
      P.paper(c, w, h, '#f0e2b8', 161);
      c.fillStyle = '#c0504a'; c.beginPath(); c.moveTo(30, h / 2); c.lineTo(80, h / 2 - 30); c.lineTo(80, h / 2 - 12); c.lineTo(150, h / 2 - 12); c.lineTo(150, h / 2 + 12); c.lineTo(80, h / 2 + 12); c.lineTo(80, h / 2 + 30); c.closePath(); c.fill();
      c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
      c.fillStyle = INK; c.font = 'italic bold 34px Georgia, "DejaVu Serif", serif'; c.textBaseline = 'middle'; c.fillText(word, 160, h / 2 + 2);
    });
    const shape = P.shapeFrom([[0, -0.35], [1.4, -0.35], [1.6, -0.2], [1.6, 0.2], [1.4, 0.35], [0, 0.35]]);
    const m = P.card(shape, { tex, depth: 0.02 }); m.rotation.x = -Math.PI / 2; m.position.set(x, -0.04, z); m.rotation.z = rot;
    return m;
  };

  // blue tissue paper (crinkled, see-through)
  function tissueTex() {
    return K3D.paint('tissue', 512, 512, (c, w, h) => {
      const r = P.rng(31);
      c.fillStyle = '#7ec4e8'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        const x = r() * w, y = r() * h, a = r() * Math.PI, l = 30 + r() * 120;
        c.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.45)' : 'rgba(40,110,170,0.35)'; c.lineWidth = 1 + r() * 2;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
      }
      for (let i = 0; i < 40; i++) P.wash(c, r() * w, r() * h, 20 + r() * 50, r() < 0.5 ? '#4f9fd6' : '#bfe6f7', 0.25, r, { noEdge: true });
    }, { repeat: true });
  }
  P.tissueMat = () => K3D.mat('tissueM', () => K3D.toon('#ffffff', { map: tissueTex(), transparent: true, opacity: 0.78, side: T.DoubleSide, depthWrite: false }));
  P.fountain = function (x, z, s = 1) {
    const g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
    const stoneTex = K3D.paint('fountainStone', 1024, 256, (c, w, h) => {
      P.paper(c, w, h, '#e6ddc8', 41);
      const r = P.rng(42);
      c.strokeStyle = rgba(INK, 0.55); c.lineWidth = 2;
      for (let row = 0; row < 3; row++) for (let i = 0; i < 14; i++) {
        const bx = (i + (row % 2) * 0.5) * w / 14, by = row * h / 3;
        c.fillStyle = mixHex('#d8ccb0', '#c8b894', r()); c.fillRect(bx + 3, by + 3, w / 14 - 6, h / 3 - 6);
        c.strokeRect(bx + 3, by + 3, w / 14 - 6, h / 3 - 6);
      }
      for (let i = 0; i < 40; i++) P.wash(c, r() * w, r() * h, 10 + r() * 30, '#9fb58a', 0.25, r, { noEdge: true }); // moss
    }, { repeat: true });
    const stoneM = K3D.toon('#ffffff', { map: stoneTex, side: T.DoubleSide });
    // the pool: an open card ring, a printed water floor, two layers of tissue water
    const pool = K3D.mesh(new T.CylinderGeometry(1.5, 1.55, 0.42, 48, 1, true).translate(0, 0.21, 0), stoneM, { ink: INK });
    g.add(pool);
    const lip = K3D.mesh(new T.TorusGeometry(1.52, 0.05, 6, 48).rotateX(Math.PI / 2).translate(0, 0.42, 0), K3D.toon(EDGE), { ink: INK, inkW: 0.7 });
    g.add(lip);
    for (let i = 0; i < 3; i++) {
      const w = new T.Mesh(new T.CircleGeometry(1.48 - i * 0.02, 40).rotateX(-Math.PI / 2), P.tissueMat());
      w.position.y = 0.16 + i * 0.07; w.rotation.y = i * 1.3; w.userData.noSee = true; w.renderOrder = 2;
      g.add(w); g.userData['w' + i] = w;
    }
    // the column and the top bowl
    const col = K3D.mesh(new T.LatheGeometry([[0.0, 0], [0.22, 0], [0.18, 0.15], [0.12, 0.3], [0.12, 0.9], [0.16, 1.0], [0.0, 1.0]].map(p => new T.Vector2(p[0], p[1])), 24), stoneM, { ink: INK });
    col.position.y = 0.16; g.add(col);
    const bowl = K3D.mesh(new T.LatheGeometry([[0.0, 0], [0.12, 0], [0.55, 0.15], [0.62, 0.3], [0.58, 0.3], [0.1, 0.1]].map(p => new T.Vector2(p[0], p[1])), 32), stoneM, { ink: INK });
    bowl.position.y = 1.12; g.add(bowl);
    const bw = new T.Mesh(new T.CircleGeometry(0.56, 32).rotateX(-Math.PI / 2), P.tissueMat()); bw.position.y = 1.4; bw.userData.noSee = true; g.add(bw);
    // the spout: tissue streamers arcing out and down into the pool
    const sm = P.tissueMat();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const curve = new T.QuadraticBezierCurve3(new T.Vector3(0, 1.55, 0), new T.Vector3(Math.cos(a) * 0.55, 1.95, Math.sin(a) * 0.55), new T.Vector3(Math.cos(a) * 1.0, 0.4, Math.sin(a) * 1.0));
      const strip = new T.Mesh(new T.TubeGeometry(curve, 16, 0.05, 4, false), sm);
      strip.scale.set(1, 1, 1); strip.userData.noSee = true; strip.renderOrder = 3; g.add(strip);
    }
    const tip = K3D.mesh(new T.ConeGeometry(0.1, 0.3, 12).translate(0, 1.5, 0), K3D.toon('#9fd3ef'), { ink: '#2c5f84', inkW: 0.6 });
    g.add(tip);
    const tb = P.tab(1.2, 0.2); tb.position.set(0, 0.004, 1.7); g.add(tb);
    g.userData.tick = (t) => { for (let i = 0; i < 3; i++) g.userData['w' + i].rotation.y = i * 1.3 + Math.sin(t * 0.7 + i) * 0.08; };
    return g;
  };

  P.peacock = function (x, z, rot = 0, s = 1) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot; g.scale.setScalar(s);
    const fanTex = K3D.paint('peacockFan', 512, 512, (c, w, h) => {
      P.paper(c, w, h, '#2f8f7c', 51);
      const r = P.rng(52), cx = w / 2, cy = h * 0.95;
      for (let ring = 0; ring < 4; ring++) {
        const rad = h * (0.3 + ring * 0.18), n = 7 + ring * 3;
        for (let i = 0; i < n; i++) {
          const a = Math.PI + (i + 0.5) / n * Math.PI, x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
          c.strokeStyle = rgba('#1b5e52', 0.6); c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke();
          P.wash(c, x, y, 26, '#d7b84a', 0.75, r, { noEdge: true });
          c.fillStyle = '#2a8a6e'; c.beginPath(); c.ellipse(x, y, 17, 20, a + Math.PI / 2, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#1f3f8f'; c.beginPath(); c.ellipse(x, y, 10, 12, a + Math.PI / 2, 0, Math.PI * 2); c.fill();
          c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, y, 17, 20, a + Math.PI / 2, 0, Math.PI * 2); c.stroke();
        }
      }
    });
    const fan = new T.Shape(); fan.moveTo(0, 0); fan.absarc(0, 0, 1.0, 0.12, Math.PI - 0.12, false); fan.lineTo(0, 0);
    const fanCard = P.card(fan, { tex: fanTex, depth: 0.03 }); fanCard.position.set(0, 0.15, -0.12); fanCard.scale.set(1, 0.95, 1); g.add(fanCard);
    const bodyTex = K3D.paint('peacockBody', 256, 512, (c, w, h) => {
      P.paper(c, w, h, '#2b6fb3', 53);
      const r = P.rng(54);
      for (let i = 0; i < 60; i++) { c.strokeStyle = rgba('#163f75', 0.6); c.lineWidth = 2; const x = r() * w, y = h * 0.3 + r() * h * 0.6; c.beginPath(); c.arc(x, y, 8, 0.2, Math.PI - 0.2); c.stroke(); }
      c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(w * 0.62, h * 0.12, 16, 10, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = INK; c.beginPath(); c.arc(w * 0.64, h * 0.12, 6, 0, Math.PI * 2); c.fill();
    });
    const body = new T.Shape();
    body.moveTo(-0.16, 0.0); body.bezierCurveTo(-0.3, 0.3, -0.15, 0.55, -0.05, 0.75); body.bezierCurveTo(-0.08, 0.95, 0.0, 1.05, 0.08, 1.06);
    body.lineTo(0.2, 1.0); body.lineTo(0.1, 0.96); body.bezierCurveTo(0.06, 0.8, 0.2, 0.55, 0.24, 0.3); body.bezierCurveTo(0.25, 0.1, 0.1, 0.0, -0.16, 0.0);
    const bodyCard = P.card(body, { tex: bodyTex, depth: 0.03 }); bodyCard.position.set(0, 0.1, 0.02); g.add(bodyCard);
    // crest
    for (let i = 0; i < 3; i++) {
      const st = K3D.mesh(new T.CylinderGeometry(0.008, 0.008, 0.14, 4).translate(0, 0.07, 0), K3D.toon(INK), { ink: false });
      st.position.set(0.03 + i * 0.03, 1.15, 0.03); st.rotation.z = -0.3 + i * 0.3; g.add(st);
      const dot = K3D.mesh(K3D.geo('crestDot', () => new T.SphereGeometry(0.025, 8, 6)), K3D.toon('#2a8a6e'), { ink: INK, inkW: 0.5 });
      dot.position.set(0.03 + i * 0.03 + Math.sin(-(-0.3 + i * 0.3)) * 0.14, 1.15 + 0.13, 0.03); g.add(dot);
    }
    for (const sd of [-1, 1]) { const vf = P.card(P.shapeFrom([[0, 0], [0.35, 0], [0, 0.6]]), { col: '#e9dfc4', depth: 0.02, inkW: 0.6 }); vf.position.set(0, 0, -0.05); vf.rotation.y = sd > 0 ? -Math.PI / 2 - 0.6 : Math.PI / 2 + 0.6; g.add(vf); }
    const tb = P.tab(1.0, 0.18); tb.position.set(0, 0.004, 0.12); g.add(tb);
    return g;
  };

  // a silk ribbon bookmark rising out of the page and curling over onto it, with a forked tail
  P.bookmark = function (x, z, rot = 0, col = '#b8324a') {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    const silk = K3D.paint('silk|' + col, 64, 512, (c, w, h) => {
      c.fillStyle = col; c.fillRect(0, 0, w, h);
      for (let x2 = 0; x2 < w; x2 += 2) { c.fillStyle = x2 % 4 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'; c.fillRect(x2, 0, 1, h); }
      const gg = c.createLinearGradient(0, 0, w, 0); gg.addColorStop(0, 'rgba(0,0,0,0.25)'); gg.addColorStop(0.4, 'rgba(255,255,255,0.25)'); gg.addColorStop(0.6, 'rgba(255,255,255,0.05)'); gg.addColorStop(1, 'rgba(0,0,0,0.25)');
      c.fillStyle = gg; c.fillRect(0, 0, w, h);
      c.fillStyle = '#e8c35a'; c.fillRect(0, 0, 3, h); c.fillRect(w - 3, 0, 3, h);
    }, { repeat: true });
    // a ribbon strip along a curve: up out of a slot, over, down onto the page and lying flat to a fork
    const pts = [[0, 0, 0], [0, 0.55, -0.05], [0, 0.95, 0.15], [0, 0.9, 0.55], [0, 0.45, 0.85], [0, 0.05, 1.05], [0, 0.01, 1.6]];
    const curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p)));
    const N = 40, wdt = 0.26, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = curve.getPoint(t);
      const tw = Math.sin(t * Math.PI) * 0.25;
      for (const s of [-1, 1]) {
        let px = s * wdt / 2 * Math.cos(tw), py = p.y + s * wdt / 2 * Math.sin(tw) * 0.2;
        if (i === N && s) {} // fork below
        pos.push(px, py, p.z); uv.push(s < 0 ? 0 : 1, t * 3);
      }
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    // the forked tail: a notch cut into the last piece
    const n = pos.length / 3; pos.push(0, 0.01, 1.48); uv.push(0.5, 2.9); idx.push(n - 2, n, n - 1);
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = K3D.toon('#ffffff', { map: silk, side: T.DoubleSide });
    const rib = K3D.mesh(geo, m, { ink: dk(col, 0.55), inkW: 0.7 });
    g.add(rib);
    // the slot it comes out of
    const slot = new T.Mesh(K3D.geo('slotGeo', () => new T.PlaneGeometry(0.36, 0.06).rotateX(-Math.PI / 2)), K3D.flat('#3a2a20')); slot.position.set(0, 0.006, -0.01); g.add(slot);
    // lit: a gold glow on the page round it
    const glow = new T.Mesh(K3D.geo('bmGlow', () => new T.CircleGeometry(1, 32).rotateX(-Math.PI / 2)), K3D.flat('#ffd77a', { transparent: true, opacity: 0, depthWrite: false, add: true }));
    glow.scale.setScalar(0.9); glow.position.set(0, 0.01, 0.5); g.add(glow);
    g.userData.lit = (k) => { glow.material.opacity = k * 0.45; m.emissive = new T.Color('#ffcf5a'); m.emissiveIntensity = k * 0.35; };
    return g;
  };

  // a dotted pencil line on the page, with a little pencil icon at its start. .userData.set(n) turns the first n dots
  // into a solid graphite stroke.
  P.dotted = function (pts, o = {}) {
    const g = new T.Group();
    const curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p[0], 0.008, p[1])));
    const len = curve.getLength(), n = Math.max(2, Math.round(len / (o.gap || 0.32)));
    const dots = curve.getSpacedPoints(n);
    const dotGeo = K3D.geo('dotGeo', () => new T.CircleGeometry(0.07, 12).rotateX(-Math.PI / 2));
    const dotM = K3D.mat('dotM', () => K3D.flat('#5a5560')), doneM = K3D.mat('dotDone', () => K3D.flat('#2f2c35'));
    const dm = new T.InstancedMesh(dotGeo, dotM, dots.length);
    const mx = new T.Matrix4();
    dots.forEach((p, i) => { mx.makeTranslation(p.x, 0.008, p.z); dm.setMatrixAt(i, mx); });
    dm.instanceMatrix.needsUpdate = true; g.add(dm);
    // the drawn stroke: a ribbon of graphite that grows along the curve
    const strokeGeo = new T.BufferGeometry(), N = dots.length, pos = new Float32Array(N * 2 * 3), idx = [];
    for (let i = 0; i < N; i++) {
      const t = curve.getTangentAt(i / (N - 1)), nx = -t.z, nz = t.x, p = dots[i];
      pos.set([p.x + nx * 0.06, 0.012, p.z + nz * 0.06, p.x - nx * 0.06, 0.012, p.z - nz * 0.06], i * 6);
      if (i < N - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    strokeGeo.setAttribute('position', new T.BufferAttribute(pos, 3)); strokeGeo.setIndex(idx); strokeGeo.computeVertexNormals();
    const graphite = K3D.paint('graphite', 256, 32, (c, w, h) => { c.fillStyle = '#3a3742'; c.fillRect(0, 0, w, h); const r = P.rng(61); for (let i = 0; i < 400; i++) { c.fillStyle = r() < 0.5 ? 'rgba(160,160,180,0.35)' : 'rgba(10,10,20,0.3)'; c.fillRect(r() * w, r() * h, 2 + r() * 6, 1); } });
    const stroke = new T.Mesh(strokeGeo, K3D.flat('#ffffff', { map: graphite, side: T.DoubleSide }));
    stroke.geometry.setDrawRange(0, 0); g.add(stroke);
    // the pencil icon at the start: a tiny printed pencil
    const icoTex = K3D.paint('pencilIcon', 128, 128, (c) => {
      c.translate(64, 64); c.rotate(-0.7);
      c.fillStyle = '#f5c518'; c.fillRect(-36, -9, 56, 18); c.fillStyle = '#e8a4b0'; c.fillRect(-48, -9, 12, 18);
      c.fillStyle = '#c99a5a'; c.beginPath(); c.moveTo(20, -9); c.lineTo(40, 0); c.lineTo(20, 9); c.fill();
      c.fillStyle = '#3a3742'; c.beginPath(); c.moveTo(33, -3); c.lineTo(40, 0); c.lineTo(33, 3); c.fill();
      c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(-48, -9, 68, 18); c.beginPath(); c.moveTo(20, -9); c.lineTo(40, 0); c.lineTo(20, 9); c.stroke();
    });
    const ico = new T.Mesh(K3D.geo('icoGeo', () => new T.PlaneGeometry(0.62, 0.62).rotateX(-Math.PI / 2)), K3D.flat('#ffffff', { map: icoTex, transparent: true, depthWrite: false }));
    const t0 = curve.getTangentAt(0); ico.position.set(dots[0].x - t0.x * 0.45, 0.013, dots[0].z - t0.z * 0.45); g.add(ico);
    g.userData = { curve, dots, n: N,
      set(k) { k = clamp(Math.round(k), 0, N); stroke.geometry.setDrawRange(0, Math.max(0, (k - 1) * 6)); for (let i = 0; i < N; i++) { mx.makeTranslation(dots[i].x, 0.008, dots[i].z); if (i < k) mx.scale(new T.Vector3(1.25, 1, 1.25)); dm.setMatrixAt(i, mx); } dm.instanceMatrix.needsUpdate = true; } };
    if (o.done) g.userData.set(o.done);
    return g;
  };

  /* ---------- the pencil ---------- */
  // 5 long, 0.35 thick, along +X: pink eraser in a brass band at -X, sharpened point at +X. Its middle is the origin.
  P.pencil = function () {
    const g = new T.Group(), L = 5, R = 0.175;
    const bodyL = L - 0.55 - 0.42, x0 = -L / 2 + 0.42; // eraser + ferrule take 0.42 at the back, the cone 0.55 at the front
    const paintTex = K3D.paint('pencilPaint', 1024, 128, (c, w, h) => {
      c.fillStyle = '#f6c21c'; c.fillRect(0, 0, w, h);
      // six faces: a lit edge and a shaded edge on each
      for (let i = 0; i < 6; i++) { const y = i * h / 6; c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(0, y, w, 3); c.fillStyle = 'rgba(150,90,0,0.22)'; c.fillRect(0, y + h / 6 - 3, w, 3); }
      const r = P.rng(71); for (let i = 0; i < 600; i++) { c.fillStyle = 'rgba(160,100,0,0.08)'; c.fillRect(r() * w, r() * h, 3 + r() * 8, 1); }
      // printed words on one face, in gold leaf with an ink edge
      c.save(); c.font = 'bold 15px Georgia, "DejaVu Serif", serif'; c.textBaseline = 'middle';
      c.fillStyle = '#8a5a00'; c.fillText('THE BOOKWORM  •  STORYBOOK HB  •  No. 2', 160, h / 12 + 1);
      c.fillStyle = '#2f6f3f'; c.fillRect(120, 0, 10, h); c.fillRect(136, 0, 4, h);
      c.restore();
    });
    const body = K3D.mesh(new T.CylinderGeometry(R, R, bodyL, 6, 1).rotateZ(-Math.PI / 2).rotateX(Math.PI / 6), K3D.toon('#ffffff', { map: paintTex }), { ink: '#5a3a08', inkW: 1.1 });
    body.position.x = x0 + bodyL / 2; g.add(body);
    // sharpened wood cone with scalloped paint edge, then the graphite point
    const cone = K3D.mesh(new T.CylinderGeometry(0.055, R, 0.45, 6, 1).rotateZ(-Math.PI / 2).rotateX(Math.PI / 6), K3D.toon('#e2b07a'), { ink: '#5a3a08', inkW: 1 });
    cone.position.x = x0 + bodyL + 0.225; g.add(cone);
    const lead = K3D.mesh(new T.ConeGeometry(0.055, 0.12, 12).rotateZ(-Math.PI / 2), K3D.toon('#3a3742'), { ink: '#141218', inkW: 0.8 });
    lead.position.x = x0 + bodyL + 0.45 + 0.06; g.add(lead);
    // brass ferrule with ridges, and the eraser
    const fer = K3D.mesh(new T.CylinderGeometry(R * 1.04, R * 1.04, 0.26, 24).rotateZ(-Math.PI / 2), K3D.mat('brass', () => K3D.toon('#d9a640')), { ink: '#5a3d14', inkW: 0.9 });
    fer.position.x = x0 - 0.13; g.add(fer);
    for (const dx of [-0.07, 0, 0.07]) { const rg = K3D.mesh(new T.TorusGeometry(R * 1.05, 0.012, 6, 24).rotateY(Math.PI / 2), K3D.toon('#b9852a'), { ink: false, cast: false }); rg.position.x = x0 - 0.13 + dx; g.add(rg); }
    const er = K3D.mesh(K3D.roundBox(0.2, R * 2, R * 2, 0.55, 24).translate(0, -R, 0).rotateZ(Math.PI / 2), K3D.toon('#ef8fa0'), { ink: '#8a3a4a', inkW: 1 });
    er.position.x = x0 - 0.26 - 0.0; g.add(er);
    g.userData = { len: L, eraser: new T.Vector3(-L / 2, 0, 0), point: new T.Vector3(L / 2, 0, 0) };
    return g;
  };

  /* ---------- beyond the book ---------- */
  /* ---------- garden pieces (the lawns between the hedges) ---------- */
  // a garden bench: card slats on box-folded card legs, with a curly cut-out back
  P.bench = function (x, z, rot = 0) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    const wood = K3D.paint('benchWood', 256, 64, (c, w, h) => { c.fillStyle = '#b7834f'; c.fillRect(0, 0, w, h); const r = P.rng(181); for (let i = 0; i < 30; i++) { c.strokeStyle = 'rgba(70,40,15,0.3)'; c.lineWidth = 1 + r(); const y = r() * h; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + 4, w * 0.6, y - 4, w, y); c.stroke(); } c.strokeStyle = rgba(INK, 0.6); c.lineWidth = 3; c.strokeRect(1, 1, w - 2, h - 2); });
    const wm = K3D.mat('benchM', () => K3D.toon('#ffffff', { map: wood })), iron = K3D.mat('benchIron', () => K3D.toon('#3d4a3f'));
    for (let k = 0; k < 3; k++) { const sl = K3D.mesh(new T.BoxGeometry(1.8, 0.05, 0.16), wm, { ink: INK, inkW: 0.7 }); sl.position.set(0, 0.42, -0.2 + k * 0.2); g.add(sl); }
    for (let k = 0; k < 2; k++) { const sl = K3D.mesh(new T.BoxGeometry(1.8, 0.16, 0.05), wm, { ink: INK, inkW: 0.7 }); sl.position.set(0, 0.62 + k * 0.22, -0.34); sl.rotation.x = -0.12; g.add(sl); }
    const leg = new T.Shape(); leg.moveTo(-0.28, 0); leg.quadraticCurveTo(-0.2, 0.2, -0.24, 0.42); leg.lineTo(-0.3, 0.98); leg.lineTo(-0.22, 0.98); leg.lineTo(-0.16, 0.44); leg.lineTo(0.22, 0.44); leg.quadraticCurveTo(0.18, 0.2, 0.28, 0); leg.lineTo(0.2, 0); leg.quadraticCurveTo(0.1, 0.2, 0.14, 0.38); leg.lineTo(-0.14, 0.38); leg.quadraticCurveTo(-0.1, 0.2, -0.2, 0); leg.closePath();
    for (const sx of [-0.78, 0.78]) { const l = P.card(leg, { mat: iron, depth: 0.04, inkW: 0.7 }); l.rotation.y = Math.PI / 2; l.position.set(sx, 0, 0); g.add(l); }
    return g;
  };
  // a stone sundial on a turned pedestal, with a brass dial and a card gnomon
  P.sundial = function (x, z, s = 1) {
    const g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
    const stone = K3D.mat('stoneM', () => K3D.toon('#cfc6b4'));
    const ped = K3D.mesh(new T.LatheGeometry([[0, 0], [0.5, 0], [0.5, 0.12], [0.36, 0.2], [0.22, 0.3], [0.2, 0.8], [0.32, 0.9], [0.46, 0.96], [0.46, 1.02], [0, 1.02]].map(p => new T.Vector2(p[0], p[1])), 24), stone, { ink: INK });
    g.add(ped);
    const face = K3D.paint('sundialFace', 256, 256, (c, w, h) => {
      c.fillStyle = '#d9a640'; c.beginPath(); c.arc(128, 128, 126, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#6b4a14'; c.lineWidth = 3; c.beginPath(); c.arc(128, 128, 110, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#5a3d10'; c.font = 'bold 22px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      ['XII', 'III', 'VI', 'IX'].forEach((t, i) => { const a = -Math.PI / 2 + i * Math.PI / 2; c.fillText(t, 128 + Math.cos(a) * 90, 128 + Math.sin(a) * 90); });
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100); c.lineTo(128 + Math.cos(a) * 110, 128 + Math.sin(a) * 110); c.stroke(); }
    });
    const disc = K3D.mesh(new T.CylinderGeometry(0.42, 0.42, 0.04, 32), [K3D.toon('#c9973a'), K3D.toon('#ffffff', { map: face }), K3D.toon('#c9973a')], { ink: '#4a3410' });
    disc.position.y = 1.04; g.add(disc);
    const gn = P.card(P.shapeFrom([[-0.3, 0], [0.3, 0], [-0.3, 0.34]]), { col: '#8a6a2a', depth: 0.03, inkW: 0.7 }); gn.position.y = 1.06; g.add(gn);
    return g;
  };
  // a white picket fence along a polyline (one cut card per run)
  P.fence = function (pts, o = {}) {
    const g = new T.Group(), h = o.h || 0.7;
    const paint = K3D.mat('fenceM', () => K3D.toon('#f4efe2', { side: T.DoubleSide }));
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 0.32));
      const sh = new T.Shape(); sh.moveTo(-len / 2, 0);
      for (let k = 0; k < n; k++) {
        const a = -len / 2 + k * len / n, b = a + len / n * 0.62, m = (a + b) / 2;
        sh.lineTo(a, h * 0.86); sh.lineTo(m, h); sh.lineTo(b, h * 0.86); sh.lineTo(b, h * 0.62); sh.lineTo(a + len / n, h * 0.62);
      }
      sh.lineTo(len / 2, 0); sh.closePath();
      // the gap under the top rail: cut between the pickets
      for (let k = 0; k < n; k++) { const a = -len / 2 + k * len / n + len / n * 0.62, b = -len / 2 + (k + 1) * len / n; if (b - a < 0.02) continue; const hole = new T.Path(); hole.moveTo(a, 0.12); hole.lineTo(b, 0.12); hole.lineTo(b, h * 0.5); hole.lineTo(a, h * 0.5); hole.closePath(); sh.holes.push(hole); }
      const c = P.card(sh, { mat: paint, depth: 0.03, inkW: 0.7 });
      c.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); c.rotation.y = -Math.atan2(z1 - z0, x1 - x0); g.add(c);
    }
    return g;
  };
  // a tulip bed: a low scalloped card border round an oval, tulip cards inside
  P.tulips = function (x, z, rx = 1.2, rz = 0.7, seed = 5) {
    const g = new T.Group(); g.position.set(x, 0, z);
    const r = P.rng(seed), cols = ['#e0507a', '#f2c14e', '#f08a3c', '#ffffff', '#d8486a'];
    const n = Math.round(rx * rz * 9);
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.85, col = cols[Math.floor(r() * cols.length)];
      const tl = P.tulip(col); tl.position.set(Math.cos(a) * rx * d, 0, Math.sin(a) * rz * d); tl.rotation.y = r() * 6; tl.scale.setScalar(0.8 + r() * 0.4); g.add(tl);
    }
    const ring = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2; ring.push([Math.cos(a) * (rx + 0.15), Math.sin(a) * (rz + 0.15)]); }
    const bm = K3D.mat('bedEdge', () => K3D.toon('#c98a5a', { side: T.DoubleSide }));
    for (let i = 0; i < ring.length - 1; i++) {
      const [x0, z0] = ring[i], [x1, z1] = ring[i + 1], len = Math.hypot(x1 - x0, z1 - z0);
      const e = K3D.mesh(K3D.geo('bedSeg|' + len.toFixed(2), () => P.cardGeo(P.scallopShape(len + 0.02, 0.14, 1, 0.3, () => 0.5), 0.02, 4)), bm, { ink: INK, inkW: 0.6, cast: false });
      e.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); e.rotation.y = -Math.atan2(z1 - z0, x1 - x0); g.add(e);
    }
    return g;
  };
  // one tulip: two crossed cards (stem, two leaves, a cup head), printed
  P.tulip = function (col) {
    const g = new T.Group();
    const geo = K3D.geo('tulipCard', () => {
      const s = new T.Shape(); s.moveTo(-0.02, 0); s.lineTo(-0.02, 0.2); s.quadraticCurveTo(-0.16, 0.12, -0.14, 0.02); s.quadraticCurveTo(-0.08, 0.16, -0.02, 0.28); s.lineTo(-0.02, 0.4);
      s.lineTo(-0.09, 0.42); s.lineTo(-0.1, 0.56); s.lineTo(-0.05, 0.5); s.lineTo(0, 0.58); s.lineTo(0.05, 0.5); s.lineTo(0.1, 0.56); s.lineTo(0.09, 0.42); s.lineTo(0.02, 0.4);
      s.lineTo(0.02, 0.26); s.quadraticCurveTo(0.12, 0.2, 0.15, 0.08); s.quadraticCurveTo(0.08, 0.14, 0.02, 0.18); s.lineTo(0.02, 0); s.closePath();
      return P.cardGeo(s, 0.012, 6);
    });
    const tex = K3D.paint('tulip|' + col, 64, 128, (c, w, h) => { c.fillStyle = '#4f8a43'; c.fillRect(0, 0, w, h); c.fillStyle = col; c.fillRect(0, 0, w, h * 0.32); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(w * 0.3, h * 0.03, w * 0.12, h * 0.22); });
    const m = K3D.mat('tulipM|' + col, () => K3D.toon('#ffffff', { map: tex, side: T.DoubleSide }));
    for (const ry of [0, Math.PI / 2]) { const c = K3D.mesh(geo, [m, K3D.mat('edge|' + EDGE, () => K3D.toon(EDGE))], { ink: INK, inkW: 0.5, cast: false }); c.rotation.y = ry; g.add(c); }
    return g;
  };
  // a ring of toadstools: red caps with white spots
  P.mushrooms = function (x, z, seed = 9) {
    const g = new T.Group(); g.position.set(x, 0, z);
    const r = P.rng(seed);
    const capTex = K3D.paint('toadCap', 256, 128, (c, w, h) => { c.fillStyle = '#d6453a'; c.fillRect(0, 0, w, h); const rr = P.rng(191); c.fillStyle = '#fff6e6'; for (let i = 0; i < 22; i++) { c.beginPath(); c.arc(rr() * w, rr() * h * 0.8, 5 + rr() * 7, 0, Math.PI * 2); c.fill(); } });
    const capM = K3D.mat('toadCapM', () => K3D.toon('#ffffff', { map: capTex })), stemM = K3D.mat('toadStem', () => K3D.toon('#f3ead2'));
    const capG = K3D.geo('toadCapG', () => new T.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)), stemG = K3D.geo('toadStemG', () => new T.CylinderGeometry(0.06, 0.08, 0.24, 10).translate(0, 0.12, 0));
    const n = 3 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2 + r(), d = 0.15 + r() * 0.3, sc = 0.6 + r() * 0.7;
      const st = K3D.mesh(stemG, stemM, { ink: INK, inkW: 0.5 }); st.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); st.scale.setScalar(sc); g.add(st);
      const cp = K3D.mesh(capG, capM, { ink: INK, inkW: 0.6 }); cp.position.set(Math.cos(a) * d, 0.22 * sc, Math.sin(a) * d); cp.scale.set(sc, sc * 0.8, sc); g.add(cp);
    }
    return g;
  };
  // a cut-out paper bunny on a V-fold, sitting up
  P.bunny = function (x, z, rot = 0, s = 1) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot; g.scale.setScalar(s);
    const tex = K3D.paint('bunnyCard', 256, 256, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.fillStyle = '#e9e1d4'; c.strokeStyle = INK; c.lineWidth = 5;
      const body = () => { c.beginPath(); c.ellipse(118, 180, 62, 58, 0, 0, Math.PI * 2); c.ellipse(170, 116, 40, 34, 0.2, 0, Math.PI * 2); c.ellipse(152, 50, 13, 44, -0.15, 0, Math.PI * 2); c.ellipse(184, 52, 13, 44, 0.25, 0, Math.PI * 2); c.ellipse(58, 196, 18, 16, 0, 0, Math.PI * 2); };
      body(); c.fill(); body(); c.stroke(); body(); c.fill();
      c.fillStyle = '#f2b3c0'; c.beginPath(); c.ellipse(152, 52, 6, 30, -0.15, 0, Math.PI * 2); c.ellipse(184, 54, 6, 30, 0.25, 0, Math.PI * 2); c.fill();
      c.fillStyle = INK; c.beginPath(); c.arc(184, 110, 6, 0, Math.PI * 2); c.fill(); c.fillStyle = '#e88a9a'; c.beginPath(); c.arc(207, 122, 5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(43,33,48,0.4)'; c.lineWidth = 2; c.beginPath(); c.moveTo(100, 160); c.quadraticCurveTo(120, 200, 150, 210); c.stroke();
    });
    const card = new T.Mesh(K3D.geo('bunnyG', () => new T.PlaneGeometry(0.9, 0.9).translate(0, 0.45, 0)), K3D.mat('bunnyM', () => K3D.toon('#ffffff', { map: tex, side: T.DoubleSide, alphaTest: 0.5 })));
    card.castShadow = true; g.add(card);
    const vf = P.card(P.shapeFrom([[0, 0], [0.3, 0], [0, 0.4]]), { col: '#e9dfc4', depth: 0.02, inkW: 0.5 }); vf.rotation.y = -Math.PI / 2; vf.position.z = -0.02; g.add(vf);
    return g;
  };
  // a paper butterfly on a coiled wire spring: flaps and bobs (keep it out of K3D.bake: .userData.live)
  P.butterfly = function (x, z, col = '#f2c14e', seed = 3) {
    const g = new T.Group(); g.position.set(x, 0, z); g.userData.live = true;
    const r = P.rng(seed), hgt = 1.4 + r() * 0.8, ph = r() * 6;
    const wire = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => new T.Vector3(Math.cos(i * 0.9) * 0.04, i / 39 * hgt, Math.sin(i * 0.9) * 0.04))), 80, 0.008, 4), K3D.mat('wireM', () => K3D.toon('#6a6a74')));
    g.add(wire);
    const tex = K3D.paint('wing|' + col, 128, 128, (c, w, h) => { c.fillStyle = col; c.beginPath(); c.ellipse(64, 50, 56, 44, -0.3, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(52, 98, 34, 26, 0.4, 0, Math.PI * 2); c.fill(); c.fillStyle = '#2b2130'; for (const [a, b, rr] of [[86, 30, 9], [60, 60, 6], [40, 100, 5]]) { c.beginPath(); c.arc(a, b, rr, 0, Math.PI * 2); c.fill(); } c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(86, 30, 4, 0, Math.PI * 2); c.fill(); });
    const wm = K3D.toon('#ffffff', { map: tex, side: T.DoubleSide, transparent: true, alphaTest: 0.4 });
    const body = new T.Group(); body.position.y = hgt; g.add(body);
    const wings = [];
    for (const s of [-1, 1]) {
      const piv = new T.Group(); body.add(piv);
      const wg = new T.Mesh(K3D.geo('wingG', () => new T.PlaneGeometry(0.34, 0.34).translate(0.17, 0, 0).rotateX(-Math.PI / 2)), wm);
      wg.scale.x = s; piv.add(wg); wings.push(piv);
    }
    const tor = K3D.mesh(K3D.geo('bflyBody', () => new T.CapsuleGeometry(0.025, 0.2, 4, 8).rotateX(Math.PI / 2)), K3D.mat('bflyBodyM', () => K3D.toon('#2b2130')), { ink: false }); body.add(tor);
    g.userData.tick = t => { const f = Math.sin(t * 9 + ph) * 0.7; wings[0].rotation.z = -f; wings[1].rotation.z = f; body.position.y = hgt + Math.sin(t * 1.3 + ph) * 0.08; body.rotation.y = Math.sin(t * 0.4 + ph) * 0.6; };
    return g;
  };

  /* ---------- the writer's desk (beyond the book) ---------- */
  // coloured pencils, an eraser, a ruler, scissors, paper clips, crumpled paper, spectacles, a pencil pot, a fern,
  // and the Bookworm's own sketch of the page. o: { dy, route (polylines for the sketch), at: { name: [x, z, rot] } }
  P.desk = function (o = {}) {
    const g = new T.Group(), dy = o.dy != null ? o.dy : -1.62, at = o.at || {};
    const put = (m, k, y = 0) => { const a = at[k] || [0, 0, 0], sc = a[3] || 1; m.position.set(a[0], dy + y * sc, a[1]); m.rotation.y = a[2] || 0; m.scale.multiplyScalar(sc); g.add(m); return m; };
    const pencil = (col, len = 9, sharp = true) => {
      const p = new T.Group();
      const body = K3D.mesh(new T.CylinderGeometry(0.42, 0.42, len, 6).rotateZ(Math.PI / 2), K3D.mat('cp|' + col, () => K3D.toon(col)), { ink: dk(col, 0.6) }); p.add(body);
      const wood = K3D.mesh(new T.ConeGeometry(0.42, 1.4, 6).rotateZ(-Math.PI / 2).translate(len / 2 + 0.7, 0, 0), K3D.mat('cpWood', () => K3D.toon('#e2b47c')), { ink: '#6b4a24' }); p.add(wood);
      if (sharp) { const tip = K3D.mesh(new T.ConeGeometry(0.14, 0.46, 6).rotateZ(-Math.PI / 2).translate(len / 2 + 1.17, 0, 0), K3D.mat('cpTip|' + col, () => K3D.toon(dk(col, 0.25))), { ink: false }); p.add(tip); }
      p.position.y = 0.42; return p;
    };
    // a fan of coloured pencils
    const cols = ['#d8483a', '#f08a3c', '#f2c14e', '#5aa04a', '#3b7fc4', '#7a4fa8'];
    const fan = new T.Group(); cols.forEach((c, i) => { const pc = pencil(c, 8 + (i % 3)); pc.position.set(i * 0.95, 0.42, i * 0.35); pc.rotation.y = 0.05 * i; fan.add(pc); }); put(fan, 'pencils');
    // a pink eraser in a paper sleeve
    const er = new T.Group();
    er.add(K3D.mesh(K3D.roundBox(4, 1.3, 2.2, 0.35, 20), K3D.toon('#f2a6b4'), { ink: '#7a3a48' }));
    const sleeveTex = K3D.paint('eraserSleeve', 256, 128, (c, w, h) => { c.fillStyle = '#3b6fb4'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 44px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('RUB', w / 2, h / 2); c.strokeStyle = '#f2c14e'; c.lineWidth = 6; c.strokeRect(8, 8, w - 16, h - 16); });
    const sl = K3D.mesh(new T.BoxGeometry(2.2, 1.36, 2.26).translate(0.6, 0.66, 0), K3D.toon('#ffffff', { map: sleeveTex }), { ink: '#1c2a44' }); er.add(sl);
    put(er, 'eraser');
    // a wooden ruler with printed marks
    const rulerTex = K3D.paint('ruler', 1024, 64, (c, w, h) => { c.fillStyle = '#e8c88a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3a2a18'; c.fillStyle = '#3a2a18'; c.font = '14px Georgia, serif'; for (let i = 0; i <= 100; i++) { const x = 6 + i * (w - 12) / 100, l = i % 10 ? (i % 5 ? 10 : 18) : 26; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, l); c.stroke(); if (i % 10 === 0 && i < 100) c.fillText(String(i / 10), x + 2, 44); } });
    put(K3D.mesh(new T.BoxGeometry(30, 0.3, 2.6).translate(0, 0.15, 0), [K3D.toon('#d4b070'), K3D.toon('#d4b070'), K3D.toon('#ffffff', { map: rulerTex }), K3D.toon('#d4b070'), K3D.toon('#d4b070'), K3D.toon('#d4b070')], { ink: '#5a4020' }), 'ruler');
    // scissors: two steel blades and red loop handles
    const sc = new T.Group(), steel = K3D.toon('#c8ccd4'), red = K3D.toon('#d8483a');
    for (const s of [-1, 1]) {
      const bl = P.card(P.shapeFrom([[0, -0.3], [7, -0.05], [7.2, 0.05], [0, 0.3]]), { mat: steel, depth: 0.12, edge: '#e8ecf2', ink: '#3a3e48' });
      bl.rotation.x = -Math.PI / 2; bl.rotation.z = s * 0.12; bl.position.y = 0.1 + (s > 0 ? 0.12 : 0); sc.add(bl);
      const hd = K3D.mesh(new T.TorusGeometry(1.1, 0.28, 8, 20).scale(1.3, 1, 1).rotateX(Math.PI / 2), red, { ink: '#5a1a14' }); hd.position.set(-1.5, 0.28, s * 1.3); sc.add(hd);
    }
    const pin = K3D.mesh(new T.CylinderGeometry(0.22, 0.22, 0.5, 12), steel, { ink: '#3a3e48' }); pin.position.y = 0.25; sc.add(pin);
    put(sc, 'scissors');
    // paper clips
    const clipPath = new T.CatmullRomCurve3([[0, 0, 0], [3, 0, 0], [3.4, 0, 0.45], [3, 0, 0.9], [0.3, 0, 0.9], [-0.1, 0, 0.6], [0.3, 0, 0.3], [2.6, 0, 0.3], [2.8, 0, 0.6]].map(p => new T.Vector3(...p)));
    const clipG = K3D.geo('clipG', () => new T.TubeGeometry(clipPath, 60, 0.07, 6));
    const clips = new T.Group();
    for (let k = 0; k < 3; k++) { const cl = K3D.mesh(clipG, K3D.mat('clipM', () => K3D.toon('#b8c0cc')), { ink: '#4a505c', inkW: 0.6 }); cl.position.set(k * 1.6, 0.08, k * 1.1); cl.rotation.y = k * 0.7; clips.add(cl); }
    if (at.clips) put(clips, 'clips');
    // crumpled paper balls (a draft that went wrong)
    const crumple = seed => { const geo = new T.IcosahedronGeometry(2, 2), a = geo.attributes.position, rr = P.rng(seed); for (let i = 0; i < a.count; i++) { const v = new T.Vector3().fromBufferAttribute(a, i), k = 0.75 + rr() * 0.4; a.setXYZ(i, v.x * k, v.y * k * 0.9, v.z * k); } geo.computeVertexNormals(); return geo; };
    for (const [k, seed] of [['ball1', 201], ['ball2', 202]]) if (at[k]) put(K3D.mesh(crumple(seed), K3D.mat('crumpleM', () => K3D.toon('#f3ead2')), { ink: '#6b5536', inkW: 0.8 }), k, 1.7);
    // spectacles
    const sp = new T.Group(), rim = K3D.mat('specRim', () => K3D.toon('#3a2a20'));
    for (const s of [-1, 1]) { const lens = K3D.mesh(new T.TorusGeometry(1.1, 0.12, 8, 28).rotateX(Math.PI / 2), rim, { ink: false }); lens.position.set(s * 1.35, 0.15, 0); sp.add(lens); const arm = K3D.mesh(new T.BoxGeometry(0.12, 0.12, 4.4).translate(0, 0, -2.2), rim, { ink: false }); arm.position.set(s * 2.4, 0.15, 0); arm.rotation.y = -s * 0.15; sp.add(arm); }
    const br = K3D.mesh(new T.TorusGeometry(0.35, 0.1, 6, 12, Math.PI), rim, { ink: false }); br.position.set(0, 0.2, 0); sp.add(br);
    if (at.glasses) put(sp, 'glasses');
    // a pencil pot full of pencils and a paintbrush
    if (at.pot) {
      const pot = new T.Group();
      const potTex = K3D.paint('potLabel', 512, 128, (c, w, h) => { c.fillStyle = '#2f5a48'; c.fillRect(0, 0, w, h); c.fillStyle = '#c9a24a'; for (let x = 0; x < w; x += 32) { c.beginPath(); c.arc(x + 16, h / 2, 8, 0, Math.PI * 2); c.fill(); } });
      pot.add(K3D.mesh(new T.CylinderGeometry(2.6, 2.4, 6, 32, 1, true).translate(0, 3, 0), K3D.toon('#ffffff', { map: potTex, side: T.DoubleSide }), { ink: '#14241c' }));
      pot.add(new T.Mesh(new T.CircleGeometry(2.5, 24).rotateX(-Math.PI / 2).translate(0, 4.6, 0), K3D.toon('#1a2a22')));
      ['#d8483a', '#3b7fc4', '#f2c14e', '#5aa04a', '#f08a3c'].forEach((c, i) => { const pc = pencil(c, 10); pc.rotation.z = Math.PI / 2 - 0.12 + (i - 2) * 0.08; pc.rotation.y = i * 1.3; pc.position.set(Math.cos(i * 1.3) * 1.1, 5.5, Math.sin(i * 1.3) * 1.1); pot.add(pc); });
      put(pot, 'pot');
    }
    // a fern in a terracotta pot
    if (at.fern) {
      const fern = new T.Group();
      fern.add(K3D.mesh(new T.LatheGeometry([[0, 0], [2.4, 0], [3, 4], [3.4, 4.2], [3.4, 5], [0, 5]].map(p => new T.Vector2(p[0], p[1])), 32), K3D.toon('#c8693e'), { ink: '#5a2a14' }));
      const frondTex = K3D.paint('frond', 128, 512, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#2f6a30'; c.lineWidth = 6; c.beginPath(); c.moveTo(w / 2, h); c.lineTo(w / 2, 6); c.stroke(); c.fillStyle = '#4f9a44'; for (let y = 20; y < h - 10; y += 22) { const l = (1 - y / h) * 0.3 + 0.2 + (y / h) * 0.25; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(w / 2 + s * w * l * 0.5, y, w * l * 0.5, 7, s * 0.3, 0, Math.PI * 2); c.fill(); } } });
      const fm = K3D.mat('frondM', () => K3D.toon('#ffffff', { map: frondTex, side: T.DoubleSide, alphaTest: 0.5 }));
      for (let k = 0; k < 9; k++) { const fr = new T.Mesh(K3D.geo('frondG', () => new T.PlaneGeometry(3, 12, 1, 6).translate(0, 6, 0)), fm); const a = k / 9 * Math.PI * 2; fr.position.set(Math.cos(a) * 0.8, 4.6, Math.sin(a) * 0.8); fr.rotation.set(0, -a + Math.PI / 2, 0); fr.rotateX(0.6 + (k % 3) * 0.2); fern.add(fr); }
      put(fern, 'fern');
    }
    // the Bookworm's pencil sketch of this page's maze on a loose sheet
    if (at.sketch && o.route) {
      const tex = K3D.paint('sketchSheet', 768, 1024, (c, w, h) => {
        P.paper(c, w, h, '#f6f0e0', 211);
        c.strokeStyle = 'rgba(120,150,190,0.35)'; c.lineWidth = 1.5; for (let y = 60; y < h; y += 34) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
        c.strokeStyle = 'rgba(200,90,100,0.4)'; c.beginPath(); c.moveTo(70, 0); c.lineTo(70, h); c.stroke();
        const rr = P.rng(212), b = o.route.bounds, sx = (w - 160) / (b[2] - b[0]), sz = (h - 260) / (b[3] - b[1]), k = Math.min(sx, sz);
        const X = x => 110 + (x - b[0]) * k, Z = z => 200 + (z - b[1]) * k;
        c.strokeStyle = 'rgba(58,55,66,0.75)'; c.lineCap = 'round'; c.lineJoin = 'round';
        for (const line of o.route.lines) for (let pass = 0; pass < 2; pass++) { c.lineWidth = 2 + rr(); c.beginPath(); line.forEach(([x, z], i) => { const px = X(x) + (rr() - 0.5) * 3, pz = Z(z) + (rr() - 0.5) * 3; i ? c.lineTo(px, pz) : c.moveTo(px, pz); }); c.stroke(); }
        c.fillStyle = 'rgba(58,55,66,0.8)'; c.font = 'italic 34px Georgia, serif'; c.fillText('Hedge Garden: try 3', 100, 110);
        c.font = 'italic 24px Georgia, serif'; c.fillText('start', X(o.route.start[0]) - 30, Z(o.route.start[1]) + 40); c.fillText('gate!', X(o.route.end[0]) - 20, Z(o.route.end[1]) - 20);
        c.strokeStyle = 'rgba(200,60,60,0.6)'; c.lineWidth = 3; c.beginPath(); c.arc(X(o.route.end[0]), Z(o.route.end[1]), 26, 0, Math.PI * 2); c.stroke();
      });
      const sheet = K3D.mesh(new T.BoxGeometry(16, 0.04, 21).translate(0, 0.02, 0), [K3D.toon(EDGE), K3D.toon(EDGE), K3D.toon('#ffffff', { map: tex }), K3D.toon(EDGE), K3D.toon(EDGE), K3D.toon(EDGE)], { ink: '#8a7550', inkW: 0.6, cast: false });
      put(sheet, 'sketch');
    }
    return g;
  };

  P.room = function (o = {}) {
    const g = new T.Group(), dy = o.deskY != null ? o.deskY : -1.62;
    // the desk: old waxed planks
    const wood = K3D.paint('deskWood', 1024, 1024, (c, w, h) => {
      const r = P.rng(81);
      for (let i = 0; i < 6; i++) {
        const y = i * h / 6, base = mixHex('#7a4f2e', '#8f6038', r());
        c.fillStyle = base; c.fillRect(0, y, w, h / 6);
        for (let k = 0; k < 90; k++) { c.strokeStyle = r() < 0.5 ? 'rgba(40,20,8,0.18)' : 'rgba(255,220,170,0.08)'; c.lineWidth = 1 + r() * 2; const yy = y + r() * h / 6; c.beginPath(); c.moveTo(0, yy); for (let x = 0; x <= w; x += 32) c.lineTo(x, yy + Math.sin(x * 0.01 + k) * 3); c.stroke(); }
        for (let k = 0; k < 2; k++) { const kx = r() * w, ky = y + h / 12; c.strokeStyle = 'rgba(40,20,8,0.3)'; for (let rr2 = 4; rr2 < 26; rr2 += 4) { c.beginPath(); c.ellipse(kx, ky, rr2 * 2, rr2 * 0.6, 0, 0, Math.PI * 2); c.stroke(); } }
        c.fillStyle = 'rgba(20,10,4,0.55)'; c.fillRect(0, y, w, 3);
      }
    }, { repeat: true });
    wood.repeat.set(10, 10);
    const desk = K3D.mesh(new T.PlaneGeometry(240, 240).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: wood }), { ink: false, cast: false });
    desk.position.y = dy; g.add(desk);
    // the teacup and saucer (blue-printed porcelain), a little steam
    const porcelain = K3D.paint('porcelain', 1024, 256, (c, w, h) => {
      c.fillStyle = '#f7f4ee'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#3b63a8'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 30); c.lineTo(w, 30); c.stroke(); c.lineWidth = 2; c.beginPath(); c.moveTo(0, 42); c.lineTo(w, 42); c.stroke();
      const r = P.rng(91); c.fillStyle = 'rgba(59,99,168,0.8)';
      for (let i = 0; i < 18; i++) { const x = i * w / 18 + 20, y = 120 + Math.sin(i) * 20; c.beginPath(); c.arc(x, y, 14, 0, Math.PI * 2); c.fill(); for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(x + Math.cos(k * 1.25) * 24, y + Math.sin(k * 1.25) * 24, 10, 5, k * 1.25, 0, Math.PI * 2); c.fill(); } }
    });
    const cupM = K3D.toon('#ffffff', { map: porcelain, side: T.DoubleSide });
    const cup = new T.Group(); cup.position.set(o.cup ? o.cup[0] : -34, dy, o.cup ? o.cup[1] : 6); g.add(cup);
    const sauc = K3D.mesh(new T.LatheGeometry([[0, 0], [4.5, 0.1], [6.2, 0.6], [6.4, 0.75], [6.0, 0.7], [3.4, 0.35], [0, 0.35]].map(p => new T.Vector2(p[0], p[1])), 64), cupM, { ink: '#2a3550' });
    cup.add(sauc);
    const body = K3D.mesh(new T.LatheGeometry([[0, 0.3], [2.4, 0.4], [3.6, 2.0], [4.4, 4.4], [4.6, 5.2], [4.4, 5.25], [4.2, 4.5], [3.4, 2.2], [0, 1.0]].map(p => new T.Vector2(p[0], p[1])), 64), cupM, { ink: '#2a3550' });
    cup.add(body);
    const tea = new T.Mesh(new T.CircleGeometry(4.25, 48).rotateX(-Math.PI / 2), K3D.toon('#8a4a1c')); tea.position.y = 4.4; cup.add(tea);
    const handle = K3D.mesh(new T.TorusGeometry(1.2, 0.32, 10, 24, Math.PI * 1.3).rotateZ(-Math.PI * 0.65), cupM, { ink: '#2a3550' });
    handle.position.set(4.6, 3.2, 0); cup.add(handle);
    // the brass lamp: the sun of this world
    const lamp = new T.Group(); lamp.position.set(o.lamp ? o.lamp[0] : -30, dy, o.lamp ? o.lamp[1] : -34); g.add(lamp);
    if (o.lamp && o.lamp[0] > 0) lamp.rotation.y = Math.PI * 0.85; // the arm reaches in over the book
    const brassM = K3D.mat('brassLamp', () => K3D.toon('#c9973a'));
    const base = K3D.mesh(new T.LatheGeometry([[0, 0], [5, 0], [5.2, 0.6], [3.8, 1.2], [1, 1.6], [0.7, 2.4], [0, 2.4]].map(p => new T.Vector2(p[0], p[1])), 48), brassM, { ink: '#4a3410' });
    lamp.add(base);
    const arm1 = K3D.mesh(new T.CylinderGeometry(0.45, 0.45, 20, 16).translate(0, 10, 0), brassM, { ink: '#4a3410' }); arm1.position.y = 2.2; arm1.rotation.z = -0.25; lamp.add(arm1);
    const elbow = new T.Group(); elbow.position.set(Math.sin(0.25) * 20, 2.2 + Math.cos(0.25) * 20, 0); lamp.add(elbow);
    const arm2 = K3D.mesh(new T.CylinderGeometry(0.4, 0.4, 14, 16).translate(0, 7, 0), brassM, { ink: '#4a3410' }); arm2.rotation.z = -1.7; elbow.add(arm2);
    const head = new T.Group(); head.position.set(Math.sin(1.7) * 14, Math.cos(1.7) * 14, 0); elbow.add(head);
    const shadeM = K3D.toon('#3f6b4a', { side: T.DoubleSide });
    const shadeMesh = K3D.mesh(new T.CylinderGeometry(2.2, 6.5, 6, 32, 1, true).translate(0, -3, 0), shadeM, { ink: '#16261b' });
    shadeMesh.rotation.z = 0.5; head.add(shadeMesh);
    const bulb = new T.Mesh(new T.SphereGeometry(1.6, 24, 16), K3D.flat('#fff3c8')); bulb.position.set(1.0, -4.4, 0); head.add(bulb);
    const glow = new T.Sprite(new T.SpriteMaterial({ map: K3D.paint('glow', 256, 256, (c) => { const gg = c.createRadialGradient(128, 128, 0, 128, 128, 128); gg.addColorStop(0, 'rgba(255,240,200,0.9)'); gg.addColorStop(0.3, 'rgba(255,220,150,0.35)'); gg.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = gg; c.fillRect(0, 0, 256, 256); }), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    glow.scale.set(26, 26, 1); bulb.add(glow);
    g.userData.lampHead = bulb;
    // a stack of old books, an inkwell and quill, spectacles: the clutter of a writer's desk
    const books = [['#7a2f2f', 9, 2.0, 13], ['#2f4f7a', 8.4, 1.7, 12], ['#6b5a2a', 9.6, 2.2, 13.5]];
    let by = dy;
    books.forEach(([col, w, hh, d], i) => {
      const b = K3D.mesh(new T.BoxGeometry(w, hh, d), [K3D.toon('#efe4c8'), K3D.toon('#efe4c8'), K3D.toon(col), K3D.toon(col), K3D.toon(col), K3D.toon('#efe4c8')], { ink: '#1b1410' });
      b.position.set((o.books ? o.books[0] : 36) + i * 0.6, by + hh / 2, (o.books ? o.books[1] : -8) + i * 0.8); b.rotation.y = 0.15 * (i - 1); g.add(b); by += hh;
    });
    const ink = K3D.mesh(new T.LatheGeometry([[0, 0], [2.4, 0], [2.6, 0.3], [2.4, 2.2], [1.0, 2.8], [0.9, 3.6], [1.2, 3.8], [0, 3.8]].map(p => new T.Vector2(p[0], p[1])), 32), K3D.toon('#26324a'), { ink: '#0c0f18' });
    const ip = o.ink || [26, -26]; ink.position.set(ip[0], dy, ip[1]); g.add(ink);
    const quill = K3D.mesh(new T.ConeGeometry(0.7, 14, 8).translate(0, 7, 0), K3D.toon('#f2ede2'), { ink: '#4a4030' }); quill.position.set(ip[0], dy + 3.4, ip[1]); quill.rotation.set(0.2, 0, -0.5); g.add(quill);
    // the attic: a sloping plank wall, a rainy window glowing grey-blue, rafters
    const wallTex = K3D.paint('atticWall', 1024, 1024, (c, w, h) => {
      const r = P.rng(101);
      for (let i = 0; i < 8; i++) { c.fillStyle = mixHex('#4a3426', '#5a4030', r()); c.fillRect(i * w / 8, 0, w / 8, h); c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(i * w / 8, 0, 4, h); for (let k = 0; k < 40; k++) { c.strokeStyle = 'rgba(20,10,5,0.2)'; c.beginPath(); const x = i * w / 8 + r() * w / 8; c.moveTo(x, 0); c.lineTo(x + (r() - 0.5) * 10, h); c.stroke(); } }
    }, { repeat: true });
    wallTex.repeat.set(6, 2);
    const wall = new T.Mesh(new T.PlaneGeometry(320, 120), K3D.toon('#ffffff', { map: wallTex })); wall.position.set(0, dy + 50, -80); g.add(wall);
    const win = new T.Group(); win.position.set(o.window ? o.window[0] : 22, dy + 30, -79); g.add(win);
    const glassTex = K3D.paint('rainGlass', 512, 512, (c, w, h) => {
      const r = P.rng(111);
      const gg = c.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, '#9fb3c4'); gg.addColorStop(1, '#5d7286'); c.fillStyle = gg; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 8; i++) P.wash(c, r() * w, r() * h * 0.6, 60 + r() * 80, '#c8d6e0', 0.25, r, { noEdge: true }); // clouds
      for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h, s = 1 + r() * 4; c.fillStyle = 'rgba(230,240,250,0.5)'; c.beginPath(); c.ellipse(x, y, s * 0.8, s, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(40,60,80,0.35)'; c.beginPath(); c.arc(x + s * 0.3, y + s * 0.4, s * 0.5, 0, Math.PI * 2); c.fill(); }
      for (let i = 0; i < 40; i++) { const x = r() * w; c.strokeStyle = 'rgba(220,235,245,0.35)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, r() * h * 0.5); let y = 0; for (let k = 0; k < 20; k++) { y += 12; c.lineTo(x + Math.sin(k + i) * 3, r() * h * 0.5 + y); } c.stroke(); }
    });
    const glass = new T.Mesh(new T.PlaneGeometry(30, 22), K3D.flat('#ffffff', { map: glassTex })); win.add(glass);
    const frameM = K3D.toon('#d9d0bd');
    for (const [w, h, x, y] of [[32, 1.4, 0, 11], [32, 1.4, 0, -11], [1.4, 23, -15.5, 0], [1.4, 23, 15.5, 0], [30, 0.8, 0, 0], [0.8, 22, 0, 0]]) {
      const f = K3D.mesh(new T.BoxGeometry(w, h, 1), frameM, { ink: '#3a3028' }); f.position.set(x, y, 0.5); win.add(f);
    }
    // dust motes drifting in the lamplight
    const N = 220, mp = new Float32Array(N * 3), mr = P.rng(121);
    for (let i = 0; i < N; i++) { mp[i * 3] = (mr() - 0.5) * 40; mp[i * 3 + 1] = mr() * 9 + 0.3; mp[i * 3 + 2] = (mr() - 0.5) * 34; }
    const mg = new T.BufferGeometry(); mg.setAttribute('position', new T.BufferAttribute(mp, 3));
    const motes = new T.Points(mg, new T.PointsMaterial({ size: 0.09, map: K3D.paint('mote', 64, 64, (c) => { const gg = c.createRadialGradient(32, 32, 0, 32, 32, 32); gg.addColorStop(0, 'rgba(255,245,215,1)'); gg.addColorStop(1, 'rgba(255,245,215,0)'); c.fillStyle = gg; c.fillRect(0, 0, 64, 64); }),
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.7 }));
    g.add(motes); g.userData.motes = motes; g.userData.moteBase = mp.slice();
    g.userData.tick = (t) => {
      const a = motes.geometry.attributes.position;
      for (let i = 0; i < N; i++) { const b = g.userData.moteBase; a.setXYZ(i, b[i * 3] + Math.sin(t * 0.13 + i) * 0.8, b[i * 3 + 1] + Math.sin(t * 0.21 + i * 1.7) * 0.4, b[i * 3 + 2] + Math.cos(t * 0.11 + i * 0.7) * 0.8); }
      a.needsUpdate = true;
    };
    return g;
  };

  return P;
})();
