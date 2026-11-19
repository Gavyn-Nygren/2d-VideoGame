/* Pip & Bo - 42-3 Spook Manor: the far rooms in 3D (PARKMANOR_ROOMS), stretches 2 to 4. Loaded on demand with the 3D
   kit, after parkmanor-scenery.js, whose helpers it borrows (SC.LIB). Each floor is its own group (SC.regions: S2
   behind the manor, S3 upstairs, S4a the attic stairs and the attic, S4b the ballroom and the way out), drawn only while
   the zone lists it; the still parts are baked.
     PARKMANOR_ROOMS.build(K, B, SC, st)          the rooms, their furniture, and the moving parts (kept in SC.R)
     PARKMANOR_ROOMS.update(K, st, dt, SC, o)    poses the moving parts for the rules' state (o: shown(), lan, on, t)
   It reads the house (PARKMANOR_HOUSE) for every size and place; nothing here changes the rules. */
'use strict';

const PARKMANOR_ROOMS = (function () {
  const H = PARKMANOR_HOUSE;
  let L, T, R;
  // a stand-in for K whose add() puts things in a group (the park kit's builders add to K themselves)
  const into = (K, g) => Object.assign(Object.create(K), { add: o => { g.add(o); return o; } });

  /* ---------- small helpers ---------- */
  const box = (g, w, h, d, x, y, z, mat, o = {}) => { const m = L.mk(o.round ? K3D.roundBox(w, h, d, o.round, 12) : new T.BoxGeometry(w, h, d), mat, o.ink === false ? { ink: false } : { ink: L.INK, inkW: o.inkW || 0.5 }); m.position.set(x, y, z); if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; g.add(m); return m; };
  const cyl = (g, r0, r1, h, x, y, z, mat, o = {}) => { const m = L.mk(new T.CylinderGeometry(r0, r1, h, o.seg || 12, 1, !!o.open), mat, o.ink === false ? { ink: false } : { ink: L.INK, inkW: o.inkW || 0.5 }); m.position.set(x, y, z); if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; if (o.ry) m.rotation.y = o.ry; g.add(m); return m; };
  const ball = (g, r, x, y, z, mat, o = {}) => { const m = L.mk(new T.SphereGeometry(r, o.seg || 12, o.seg2 || 10), mat, o.ink === false ? { ink: false } : { ink: L.INK, inkW: o.inkW || 0.4 }); m.position.set(x, y, z); if (o.sc) m.scale.set(...o.sc); g.add(m); return m; };
  const tc = (col, o) => L.M('r|' + col + (o ? JSON.stringify(o) : ''), () => K3D.toon(col, o));
  const fl = (col, k = 1, o) => L.M('rf|' + col + k + (o ? JSON.stringify(o) : ''), () => K3D.flat(L.hot(col, k), o));
  const tex = (key, w, h, fn, o) => K3D.paint('pmr-' + key, w, h, fn, o);
  // a floor of a room: a textured plane (rep: texture units)
  function floor(g, x0, x1, z0, z1, y, map, rep = 4, col = '#ffffff') {
    const w = x1 - x0, d = z1 - z0;
    const geo = new T.PlaneGeometry(w, d).rotateX(-Math.PI / 2), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / rep, uv.getY(i) * d / rep);
    const m = new T.Mesh(geo, L.M('rFloor|' + map.uuid + col, () => K3D.toon(col, { map }))); m.receiveShadow = true;
    m.position.set((x0 + x1) / 2, y + 0.012, (z0 + z1) / 2); g.add(m); return m;
  }
  const rugM = (key, draw) => L.M('rug|' + key, () => K3D.toon('#ffffff', { map: tex('rug' + key, 256, 256, draw) }));
  function rug(g, x, z, w, d, y, key, draw) { const m = new T.Mesh(new T.PlaneGeometry(w, d).rotateX(-Math.PI / 2), rugM(key, draw)); m.position.set(x, y + 0.022, z); m.receiveShadow = true; g.add(m); return m; }
  const persian = (base, edge, mid) => (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h); c.strokeStyle = edge; c.lineWidth = 14; c.strokeRect(10, 10, w - 20, h - 20); c.lineWidth = 3; c.strokeRect(26, 26, w - 52, h - 52);
    c.fillStyle = mid; c.beginPath(); c.moveTo(w / 2, 50); c.lineTo(w - 60, h / 2); c.lineTo(w / 2, h - 50); c.lineTo(60, h / 2); c.closePath(); c.fill();
    c.fillStyle = edge; c.beginPath(); c.arc(w / 2, h / 2, 26, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,230,180,0.12)'; c.fillRect(30 + (i * 37) % (w - 60), 30 + (i * 71) % (h - 60), 6, 6); }
    for (let i = 0; i < 5; i++) { c.fillStyle = 'rgba(20,10,10,0.25)'; c.beginPath(); c.ellipse(L.rnd() * w, L.rnd() * h, 20 + L.rnd() * 30, 14, 0, 0, Math.PI * 2); c.fill(); }
  };
  // book spines on a shelf front (rows of coloured spines with gilt bands, gaps, a fallen one)
  const bookTex = () => tex('books', 256, 256, (c, w, h) => {
    c.fillStyle = '#1e120c'; c.fillRect(0, 0, w, h);
    for (let row = 0; row < 4; row++) {
      const y0 = row * 64 + 6, y1 = row * 64 + 58;
      let x = 4;
      while (x < w - 6) {
        const bw = 6 + Math.floor(L.rnd() * 10), bh = 32 + L.rnd() * 18;
        if (L.rnd() < 0.06) { x += 10; continue; }
        c.fillStyle = ['#6a1a1a', '#1a3a5a', '#2a4a2a', '#5a3a1a', '#3a1a4a', '#7a5a2a', '#1a1a1a', '#4a2a1a'][Math.floor(L.rnd() * 8)];
        c.fillRect(x, y1 - bh, bw, bh);
        c.fillStyle = 'rgba(220,180,90,0.7)'; c.fillRect(x, y1 - bh + 5, bw, 2); c.fillRect(x, y1 - 8, bw, 2);
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x + bw - 1, y1 - bh, 1, bh);
        x += bw + 1;
      }
      c.fillStyle = '#3a2214'; c.fillRect(0, y1, w, 6);
    }
  }, { repeat: true });
  // a bookcase: a dark frame with spines on its front (and back, when free-standing)
  function bookcase(g, x, z, w, h, d, yaw, two = false) {
    const bg = new T.Group(); bg.position.set(x, 0, z); bg.rotation.y = yaw; g.add(bg);
    const frM = L.wood('#2e1a10');
    box(bg, w, h, d, 0, h / 2, 0, frM, { inkW: 0.6 });
    const spM = L.M('spines|' + (w * 10 | 0) + (h * 10 | 0), () => { const t2 = bookTex().clone(); t2.needsUpdate = true; t2.wrapS = t2.wrapT = T.RepeatWrapping; t2.repeat.set(w / 2.2, h / 2.6); return K3D.toon('#ffffff', { map: t2 }); });
    for (const sz of two ? [1, -1] : [1]) { const f = new T.Mesh(new T.PlaneGeometry(w - 0.16, h - 0.3), spM); f.position.set(0, h / 2, sz * (d / 2 + 0.005)); if (sz < 0) f.rotation.y = Math.PI; bg.add(f); }
    box(bg, w + 0.16, 0.16, d + 0.12, 0, h + 0.08, 0, frM, { inkW: 0.5 });
    return bg;
  }
  // a hanging bulb on a cord, with a faint halo (light faked)
  function bulb(K, g, x, y, z, len = 1.2, col = '#ffd08a') {
    cyl(g, 0.01, 0.01, len, x, y + len / 2, z, tc('#14121a'), { ink: false, seg: 4 });
    ball(g, 0.08, x, y, z, fl(col, 1.8), { ink: false });
    L.sprite(K, g, x, y, z, 1.4, col, 0.35);
  }
  // a winder box on a wall or stand: a brass case, a dial, a crank, a label (Bo winds it)
  function winder(K, g, w, label, y = 1.3) {
    const wg = new T.Group(); wg.position.set(w.x - Math.sin(w.face) * 0.18, y + (w.y || 0), w.z - Math.cos(w.face) * 0.18); wg.rotation.y = w.face; g.add(wg);
    box(wg, 0.6, 0.8, 0.22, 0, 0, 0.11, L.FIG.brass(), { inkW: 0.6 });
    const dial = new T.Mesh(new T.CircleGeometry(0.2, 24), tc('#f2e6c8')); dial.position.set(0, 0.15, 0.225); wg.add(dial);
    const needle = new T.Mesh(new T.BoxGeometry(0.02, 0.17, 0.01).translate(0, 0.085, 0), K3D.flat('#8a1a1a')); needle.position.set(0, 0.15, 0.235); wg.add(needle); needle.userData.live = true;
    const crank = new T.Group(); crank.position.set(0, -0.2, 0.24); wg.add(crank); crank.userData.live = true;
    crank.add(L.mk(new T.BoxGeometry(0.04, 0.26, 0.04).translate(0, 0.13, 0), L.iron(), { ink: L.INK, inkW: 0.3 }));
    crank.add(L.mk(new T.CylinderGeometry(0.035, 0.035, 0.1, 8).rotateX(Math.PI / 2).translate(0, 0.26, 0.05), L.wood('#2a160e'), { ink: L.INK, inkW: 0.3 }));
    const lbl = new T.Mesh(new T.PlaneGeometry(0.56, 0.13), K3D.toon('#ffffff', { map: tex('windLbl|' + label, 128, 32, (c, w2, h2) => { c.fillStyle = '#2a1a0a'; c.fillRect(0, 0, w2, h2); c.fillStyle = '#e8c870'; c.font = '700 17px "DejaVu Serif", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, w2 / 2, h2 / 2 + 1); }) }));
    lbl.position.set(0, 0.5, 0.12); wg.add(lbl);
    const gl = L.sprite(K, wg, 0, 0, 0.3, 1.2, '#ffd27a', 0);
    R.winders.push({ w, needle, crank, gl, spin: 0 });
    return wg;
  }
  // a tall gilt-framed mirror (hazy; a pale figure shows in some of them now and then)
  function bigMirror(K, g, x, y, z, yaw, w, h) {
    const mg = new T.Group(); mg.position.set(x, y, z); mg.rotation.y = yaw; g.add(mg);
    box(mg, w + 0.3, h + 0.3, 0.1, 0, 0, 0, L.FIG.brass(), { inkW: 0.6 });
    const gl = new T.Mesh(new T.PlaneGeometry(w, h), L.M('hazeMirror', () => K3D.toon('#7a80a8', { emissive: '#22264a', emissiveIntensity: 0.9 }))); gl.position.z = 0.06; mg.add(gl);
    const crown = L.mk(new T.CylinderGeometry(w * 0.4, w * 0.4, 0.08, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), L.FIG.brass(), { ink: L.INK, inkW: 0.4 }); crown.position.y = h / 2 + 0.1; crown.scale.y = 0.5; mg.add(crown);
    const ghost = new T.Mesh(new T.PlaneGeometry(w * 0.45, h * 0.6), new T.MeshBasicMaterial({ map: tex('mirrorFig', 64, 128, (c, w2, h2) => { const gr = c.createLinearGradient(0, 0, 0, h2); gr.addColorStop(0, 'rgba(240,240,255,0.9)'); gr.addColorStop(1, 'rgba(200,210,255,0)'); c.fillStyle = gr; c.beginPath(); c.arc(32, 24, 14, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(12, 44); c.quadraticCurveTo(32, 34, 52, 44); c.lineTo(58, 128); c.lineTo(6, 128); c.closePath(); c.fill(); }), transparent: true, opacity: 0, depthWrite: false }));
    ghost.position.set(w * 0.15, -h * 0.1, 0.07); mg.add(ghost); ghost.userData.live = true;
    R.mirrors.push({ ghost, ph: L.rnd() * 30 });
    return mg;
  }
  // a dust sheet over furniture: a box shape with a draped, wrinkled cloth
  function dustSheet(g, x, y, z, w, h, d) {
    const geo = new T.BoxGeometry(w, h, d, 6, 3, 6), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const yy = p.getY(i); const k = yy < 0 ? 1 + (-yy / h) * 0.25 : 1; p.setX(i, p.getX(i) * k + Math.sin(p.getZ(i) * 9 + yy * 5) * 0.03); p.setZ(i, p.getZ(i) * k + Math.cos(p.getX(i) * 8) * 0.03); if (yy > 0) p.setY(i, yy + Math.sin(p.getX(i) * 6) * Math.cos(p.getZ(i) * 5) * 0.05); }
    geo.computeVertexNormals();
    const m = L.mk(geo, L.M('dustSheet', () => K3D.toon('#d8d4cc', { emissive: '#2a2a34', emissiveIntensity: 0.4 })), { ink: L.INK, inkW: 0.6 });
    m.position.set(x, y + h / 2, z); g.add(m); return m;
  }
  // a cobweb between two points (a sagging sheet of threads)
  function strand(g, a, b, sag = 0.3) {
    const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(L.V(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t)); }
    const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 8, 0.006, 3), L.M('thread', () => K3D.flat('#c8c8d8', { transparent: true, opacity: 0.55 }))); g.add(m);
  }
  // a dark backstage floor under a whole floor of the house (the dark ride's black void, with tape marks and cables)
  function backstage(g, x0, x1, z0, z1, y) {
    const t2 = tex('backstage', 256, 256, (c, w, h) => {
      c.fillStyle = '#0c0b12'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(60,56,80,0.18)'; c.fillRect(L.rnd() * w, L.rnd() * h, 40 + L.rnd() * 80, 2); }
      c.strokeStyle = 'rgba(220,200,90,0.35)'; c.lineWidth = 4; c.setLineDash([16, 10]); c.beginPath(); c.moveTo(0, 60); c.lineTo(w, 60); c.stroke();
      c.setLineDash([]); c.strokeStyle = 'rgba(10,10,14,1)'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 200); c.bezierCurveTo(80, 160, 160, 240, 256, 190); c.stroke();
    }, { repeat: true });
    floor(g, x0, x1, z0, z1, y - 0.03, t2, 8);
  }

  /* =============================== stretch 2: behind the manor =============================== */
  function passage(K, g, W) {
    const P = H.art.passage;
    floor(g, P.x0, P.x1, -6.6, -2.4, 0, L.checker(), 2.5);
    floor(g, P.x0, P.x1, P.z0, -6.6, 0, L.boards(), 3);
    // a bell board for the servants (a row of bells on springs, room names under them)
    const bb = new T.Group(); bb.position.set(33.18, 2.5, -10.2); bb.rotation.y = -Math.PI / 2; W('vesEnd').add(bb);
    box(bb, 2.4, 0.9, 0.06, 0, 0, 0, L.wood('#3a2418'), { inkW: 0.5 });
    const bellLbl = tex('bellLbl', 256, 64, (c, w, h) => { c.fillStyle = '#2a1a10'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8d8a8'; c.font = '700 13px "DejaVu Serif", serif'; c.textAlign = 'center'; ['HALL', 'DINING', 'LIBRARY', 'NURSERY', 'ATTIC'].forEach((n, i) => c.fillText(n, 26 + i * 51, 50)); });
    const lb = new T.Mesh(new T.PlaneGeometry(2.3, 0.56), K3D.toon('#ffffff', { map: bellLbl })); lb.position.set(0, -0.12, 0.04); bb.add(lb);
    for (let i = 0; i < 5; i++) { const bl = L.mk(new T.SphereGeometry(0.09, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), L.FIG.brass(), { ink: L.INK, inkW: 0.4 }); bl.position.set(-0.94 + i * 0.47, 0.22, 0.12); bl.rotation.x = Math.PI; bb.add(bl); bl.userData.live = true; R.bells.push({ m: bl, ph: i * 1.3 }); }
    // pegs with aprons and a coat; a mop in a bucket; crates; a shelf with a jar (a wisp hides in it); pipes
    for (let i = 0; i < 4; i++) { const ap = box(g, 0.42, 0.8, 0.05, 30.48, 1.5, -8.2 - i * 0.7, tc(i % 2 ? '#d8d0c0' : '#3a3448'), { ry: Math.PI / 2, inkW: 0.4 }); ap.rotation.z = (i % 2 ? 0.05 : -0.04); cyl(g, 0.02, 0.02, 0.18, 30.42, 1.95, -8.2 - i * 0.7, L.FIG.brass(), { rz: Math.PI / 2, ink: false }); }
    cyl(g, 0.22, 0.18, 0.4, 32.8, 0.2, -12.4, tc('#5a6070'), { inkW: 0.5 });
    cyl(g, 0.02, 0.02, 1.4, 32.7, 0.8, -12.3, L.wood('#8a6a44'), { rz: 0.25, ink: false });
    for (let i = 0; i < 9; i++) cyl(g, 0.01, 0.01, 0.3, 32.55 + (i % 3) * 0.04, 0.1, -12.3 + (i - 4) * 0.03, tc('#c8c0a8'), { ink: false });
    box(g, 0.8, 0.8, 0.8, 32.9, 0.4, -15.2, L.wood('#7a5a34'), { ry: 0.2, inkW: 0.5 }); box(g, 0.6, 0.6, 0.6, 32.95, 1.1, -15.1, L.wood('#6a4a2a'), { ry: -0.3, inkW: 0.5 });
    box(g, 0.3, 0.05, 1.0, 30.4, 1.05, -14.8, L.wood('#4a2e1e'), { inkW: 0.4 });
    cyl(g, 0.11, 0.1, 0.26, 30.42, 1.21, -14.8, L.M('jarGlass', () => K3D.toon('#8ab0a0', { transparent: true, opacity: 0.7 })), { inkW: 0.3 });
    cyl(g, 0.05, 0.05, 13.2, 30.46, 3.1, -9.4, tc('#4a4a5a'), { rx: Math.PI / 2, inkW: 0.3 }); cyl(g, 0.035, 0.035, 13.2, 30.46, 3.3, -9.4, tc('#6a4a3a'), { rx: Math.PI / 2, inkW: 0.3 });
    bulb(K, g, 31.8, 2.7, -9.6, 0.8); bulb(K, g, 31.8, 2.7, -14.2, 0.8, '#ffb070');
    // a sign: TOUR CONTINUES, and a painted hand pointing on (and the footprints)
    L.signBoard(K, W('pasW'), 30.42, -12.0, Math.PI / 2, 'tour', 0.95, 2.2, true);
    L.web(K, g, 33.15, 3.4, -15.8, -1, 1, 1.0); L.web(K, g, 30.45, 3.4, -6.8, 1, -1, 0.9);
  }

  function dining(K, g, W) {
    const D = H.art.dining, tb = H.art.table;
    floor(g, D.x0, D.x1, D.z0, D.z1, 0, L.boards(), 3);
    rug(g, 27, -23, 22, 7.4, 0, 'dining', persian('#5a1420', '#c8a050', '#3a0a14'));
    // the long table: a cloth to the floor's middle, twenty places, candelabras, covered dishes, a feast gone bad
    const cloth = tc('#e8e2d8', { emissive: '#2a2620', emissiveIntensity: 0.3 });
    box(g, tb.x1 - tb.x0, 0.1, tb.z1 - tb.z0, (tb.x0 + tb.x1) / 2, 0.98, (tb.z0 + tb.z1) / 2, L.wood('#3a2218'), { inkW: 0.7 });
    box(g, tb.x1 - tb.x0 + 0.1, 0.28, tb.z1 - tb.z0 + 0.1, (tb.x0 + tb.x1) / 2, 0.92, (tb.z0 + tb.z1) / 2, cloth, { inkW: 0.5 });
    for (const x of [tb.x0 + 0.4, (tb.x0 + tb.x1) / 2, tb.x1 - 0.4]) for (const z of [tb.z0 + 0.3, tb.z1 - 0.3]) box(g, 0.18, 0.8, 0.18, x, 0.4, z, L.wood('#2a160e'), { inkW: 0.4 });
    const plate = tc('#f2eee6'), silver = tc('#c9d0e0', { emissive: '#2a3040', emissiveIntensity: 0.4 }), glass = L.M('goblet', () => K3D.toon('#b8c8e0', { transparent: true, opacity: 0.6 }));
    for (let x = tb.x0 + 1.0; x < tb.x1 - 0.5; x += 1.9) for (const sz of [-1, 1]) {
      const z = (tb.z0 + tb.z1) / 2 + sz * 1.25;
      cyl(g, 0.24, 0.2, 0.03, x, 1.08, z, plate, { inkW: 0.3, seg: 16 });
      if (L.rnd() < 0.6) ball(g, 0.1, x + (L.rnd() - 0.5) * 0.1, 1.12, z, tc(['#5a3a1a', '#3a4a1a', '#6a2a2a'][Math.floor(L.rnd() * 3)]), { sc: [1, 0.5, 1], ink: false });
      cyl(g, 0.05, 0.03, 0.22, x + 0.32, 1.15, z - sz * 0.1, glass, { ink: false, seg: 8 });
      box(g, 0.03, 0.01, 0.3, x - 0.3, 1.07, z, silver, { ink: false }); box(g, 0.03, 0.01, 0.3, x + 0.3, 1.07, z + sz * 0.1, silver, { ink: false });
    }
    for (const x of [19.6, 24.6, 29.4, 34.4]) L.candelabra(K, g, x, 1.03, -23, null);
    // the covered dishes (wisps hide in some; one is the jack-o-spring)
    for (const x of [19.2, 25.6, 34.6]) { cyl(g, 0.34, 0.34, 0.03, x, 1.06, -24.15, silver, { inkW: 0.3, seg: 18 }); ball(g, 0.3, x, 1.07, -24.15, silver, { sc: [1, 0.75, 1], seg: 14, seg2: 6 }); }
    { const dg = new T.Group(); dg.position.set(27.6, 1.04, -24.1); g.add(dg); cyl(dg, 0.36, 0.36, 0.03, 0, 0.02, 0, silver, { inkW: 0.3, seg: 18 });
      const lid = new T.Group(); lid.userData.live = true; dg.add(lid); ball(lid, 0.32, 0, 0, 0, silver, { sc: [1, 0.75, 1], seg: 14, seg2: 6 }); ball(lid, 0.04, 0, 0.25, 0, silver);
      const jack = new T.Group(); jack.userData.live = true; jack.visible = false; dg.add(jack);
      const sp = L.mk(new T.CylinderGeometry(0.06, 0.06, 0.5, 8, 6, true), tc('#9a9aa8'), { ink: false }); sp.position.y = 0.25; jack.add(sp);
      const hd = ball(jack, 0.17, 0, 0.6, 0, tc('#e8d8c0', { emissive: '#3a2a1a', emissiveIntensity: 0.4 })); const grin = new T.Mesh(new T.TorusGeometry(0.08, 0.015, 4, 10, Math.PI), K3D.flat('#2a1010')); grin.position.set(0, -0.04, 0.15); grin.rotation.z = Math.PI; hd.add(grin);
      for (const sx of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.025, 6, 4), K3D.flat(L.hot('#ff5a3a', 2.5))); e.position.set(sx * 0.06, 0.05, 0.15); hd.add(e); }
      R.springs.dish = (u) => { lid.position.set(-u * 0.3, u * 0.9, 0); lid.rotation.z = u * 1.6; jack.visible = u > 0.05; jack.scale.y = Math.min(1, u * 1.5); jack.rotation.z = Math.sin(u * 30) * 0.2 * u; };
    }
    // the feast: a roast pig gone grey, a collapsed cake under cobwebs, fruit gone black
    { const pg = new T.Group(); pg.position.set(23.2, 1.1, -22.4); g.add(pg); cyl(pg, 0.5, 0.45, 0.04, 0, 0, 0, silver, { seg: 18 }); ball(pg, 0.32, 0, 0.18, 0, tc('#8a6a5a'), { sc: [1.5, 0.8, 0.9] }); ball(pg, 0.15, 0.48, 0.24, 0, tc('#8a6a5a')); ball(pg, 0.06, 0.62, 0.24, 0, tc('#d84a3a')); }
    { const cg = new T.Group(); cg.position.set(31.8, 1.08, -22.6); g.add(cg); cyl(cg, 0.4, 0.42, 0.3, 0, 0.15, 0, tc('#e8d8e0'), { inkW: 0.4 }); cyl(cg, 0.3, 0.32, 0.25, 0.04, 0.38, 0, tc('#e0c8d0'), { inkW: 0.4, rz: 0.15 }); cyl(cg, 0.18, 0.2, 0.2, 0.1, 0.56, 0, tc('#d8c0c8'), { inkW: 0.4, rz: 0.3 }); strand(cg, [-0.4, 0.3, 0], [0.2, 0.7, 0], 0.05); }
    for (const x of [21.4, 28.6, 33.6]) for (let i = 0; i < 4; i++) ball(g, 0.07, x + (i % 2) * 0.12, 1.1 + (i > 1 ? 0.1 : 0), -22.0 + (i % 3) * 0.08, tc(i % 2 ? '#2a1a2a' : '#3a2a14'), { ink: false });
    for (let i = 0; i < 4; i++) strand(g, [19.6 + i * 4.9, 1.6, -23], [24.6 + i * 4.9 - (i === 3 ? 5 : 0), 1.6, -23], 0.25);
    // the chandelier overhead: unlit, swaying, hung with webs
    { const ch = L.chandelier(K, g, 27, 3.7, -23, null); for (const f of ch.flames) f.visible = false; for (const h of ch.halos) h.visible = false; ch.cg.scale.setScalar(1.1); R.swing.push({ g: ch.cg, ph: 1 }); }
    // the sideboard (tureen, bottles, a candelabra), the fireplace with embers and a portrait over it
    box(g, 1.2, 1.0, 4.2, 39.2, 0.5, -20.5, L.wood('#3a2218'), { inkW: 0.6 });
    for (let i = 0; i < 3; i++) box(g, 0.04, 0.7, 1.2, 38.58, 0.5, -21.9 + i * 1.4, L.wood('#2a160e'), { inkW: 0.3 });
    cyl(g, 0.3, 0.24, 0.32, 39.2, 1.16, -18.9, silver, { inkW: 0.4 }); ball(g, 0.24, 39.2, 1.33, -18.9, silver, { sc: [1, 0.5, 1] });
    for (let i = 0; i < 4; i++) cyl(g, 0.06, 0.07, 0.4, 39.4 - (i % 2) * 0.3, 1.2, -19.9 - i * 0.25, tc(['#2a4a2a', '#4a1a1a', '#2a2a4a', '#3a3a1a'][i]), { inkW: 0.3, seg: 8 });
    cyl(g, 0.12, 0.1, 0.24, 38.85, 1.12, -20.6, L.M('jarGlass', () => K3D.toon('#8ab0a0', { transparent: true, opacity: 0.7 })), { inkW: 0.3 });
    L.candelabra(K, g, 39.2, 1.0, -22.0, null);
    const fpg = new T.Group(); fpg.position.set(14.6, 0, -22); g.add(fpg);
    box(fpg, 0.8, 1.4, 2.4, 0, 0.7, 0, tc('#4a4458'), { inkW: 0.7 });
    box(fpg, 0.6, 0.9, 1.4, 0.12, 0.45, 0, K3D.flat('#0a0606'), { ink: false });
    box(fpg, 1.0, 0.12, 2.8, 0.1, 1.46, 0, tc('#5a5468'), { inkW: 0.5 });
    const ember = new T.Mesh(new T.PlaneGeometry(1.0, 0.3), fl('#ff5a1a', 1.6, { transparent: true, opacity: 0.85 })); ember.rotation.x = -Math.PI / 2; ember.position.set(0.25, 0.08, 0); fpg.add(ember);
    L.sprite(K, fpg, 0.4, 0.3, 0, 2.2, '#ff6a2a', 0.35);
    cyl(fpg, 0.12, 0.1, 0.3, 0.15, 1.67, 0.9, tc('#3a5a6a'), { inkW: 0.3 });
    L.portrait(K, W('dinKit'), 14.24, 2.7, -22, Math.PI / 2, 2, 1.0);
    // the north wall: the three portraits that reach (spooks, placed by the rules) between still ones and sconces
    for (const [x, k] of [[33.2, 1], [26.2, 0], [19.0, 3]]) L.portrait(K, W('dinN'), x, 2.5, -29.78, 0, k, 0.8);
    for (const x of [38.4, 31.6, 24.4, 17.4]) L.sconce(K, W('dinN'), x, 2.0, -29.78, 0, null);
    // a heavy drape by the north wall (a wisp hides behind it), velvet curtains in the two servants' arches
    const vel = L.M('drapeVel', () => K3D.toon('#ffffff', { map: L.velvet('#3a0a1a'), side: T.DoubleSide }));
    { const geo = new T.PlaneGeometry(1.2, 3.6, 8, 4), p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 12) * 0.08); geo.computeVertexNormals(); const d = L.mk(geo, vel, { ink: L.INK, inkW: 0.4 }); d.position.set(23.8, 1.8, -29.55); g.add(d); }
    for (const [x, z, yaw] of [[15.6, -30.05, 0], [40.05, -27.4, -Math.PI / 2]]) { for (const sx of [-1, 1]) { const geo = new T.PlaneGeometry(1.05, 3.8, 6, 4), p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 14) * 0.07); geo.computeVertexNormals(); const d = L.mk(geo, vel, { ink: L.INK, inkW: 0.4 }); const dg = new T.Group(); dg.position.set(x, 1.9, z); dg.rotation.y = yaw; g.add(dg); d.position.x = sx * 0.5; dg.add(d); } }
    // a tall window in the east wall (rain, the moon), more sconces, a dropped napkin under the table
    L.tallWindow(K, W('dinE'), 39.78, -20.4, -Math.PI / 2, 1.3, 2.4, 1.0, null);
    for (const z of [-24.6, -17.4]) L.sconce(K, W('dinE'), 39.78, 2.0, z, -Math.PI / 2, null);
    box(g, 0.5, 0.02, 0.5, 20.6, 0.03, -23, tc('#e8e2d8'), { ry: 0.5, ink: false });
    // webs in the corners, a rat's nest of bones under the sideboard, footprints in the dust
    for (const [x, z, dx, dz] of [[14.2, -16.2, 1, -1], [39.8, -16.2, -1, -1], [14.2, -29.8, 1, 1], [39.8, -29.8, -1, 1]]) L.web(K, g, x, 4.0, z, dx, dz, 1.3);
    for (let i = 0; i < 5; i++) cyl(g, 0.02, 0.02, 0.3, 38.4 + L.rnd() * 0.4, 0.03, -17.3 - L.rnd() * 0.4, tc('#e8e2d0'), { rz: Math.PI / 2, ry: L.rnd() * 3, ink: false });
  }

  function kitchen(K, g, W) {
    const Kt = H.art.kitchen;
    const flag = tex('flags', 256, 256, (c, w, h) => { c.fillStyle = '#2a2622'; c.fillRect(0, 0, w, h); for (let y = 0, r = 0; y < h; y += 64, r++) for (let x = (r % 2) * 40 - 40; x < w; x += 80) { c.fillStyle = ['#5a5248', '#4e463e', '#625a4e'][Math.floor(L.rnd() * 3)]; c.fillRect(x + 3, y + 3, 74, 58); c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x + 3, y + 50, 74, 11); } L.stains(c, w, h * 2, 6, 'rgba(30,20,10,0.35)'); }, { repeat: true });
    floor(g, Kt.x0, Kt.x1, Kt.z0, Kt.z1, 0, flag, 3);
    const ironM = tc('#24222c', { emissive: '#0a0a10', emissiveIntensity: 0.6 }), copper = tc('#c87a4a', { emissive: '#3a1a0a', emissiveIntensity: 0.4 }), steelM = tc('#8a90a6');
    // the range along the north wall: iron, two oven doors, a firebox glowing, pots on the hob, a hood and a flue
    box(g, 10, 1.3, 1.6, 4.5, 0.65, -29.2, ironM, { inkW: 0.8 });
    for (const x of [1.0, 4.4]) { box(g, 1.4, 0.8, 0.06, x, 0.6, -28.38, tc('#34323e'), { inkW: 0.5 }); box(g, 0.5, 0.06, 0.06, x, 0.85, -28.32, L.FIG.brass(), { ink: false }); }
    { const og = new T.Group(); og.position.set(2.4 - 0.7, 0.2, -28.36); g.add(og); og.userData.live = true; const door = box(og, 1.4, 0.8, 0.06, 0.7, 0.4, 0, tc('#34323e'), { inkW: 0.5 }); void door;
      const pie = new T.Group(); pie.position.set(0.7, 0.35, -0.3); og.add(pie); pie.visible = false; cyl(pie, 0.28, 0.24, 0.12, 0, 0, 0, tc('#c89a5a'), { inkW: 0.4 }); for (const sx of [-1, 1]) ball(pie, 0.04, sx * 0.08, 0.08, 0.2, fl('#ff5a2a', 2.4), { ink: false }); const grin = new T.Mesh(new T.TorusGeometry(0.1, 0.015, 4, 10, Math.PI), K3D.flat('#2a1010')); grin.rotation.set(-Math.PI / 2, 0, Math.PI); grin.position.set(0, 0.07, 0.08); pie.add(grin);
      R.springs.oven = (u) => { og.rotation.x = u * 1.4; pie.visible = u > 0.1; pie.position.z = -0.3 + u * 0.6; pie.rotation.y = Math.sin(u * 20) * 0.3 * u; }; }
    { const fb = new T.Mesh(new T.PlaneGeometry(1.0, 0.4), fl('#ff6a1a', 1.8)); fb.position.set(7.8, 0.5, -28.37); g.add(fb); L.sprite(K, g, 7.8, 0.6, -28.1, 1.8, '#ff6a2a', 0.4); }
    for (const [x, r] of [[1.6, 0.32], [3.6, 0.26], [6.0, 0.36], [9.4, 0.28]]) { cyl(g, r, r * 0.9, r * 1.1, x, 1.3 + r * 0.55, -29.0, copper, { inkW: 0.5, seg: 14 }); cyl(g, r * 1.02, r * 1.02, 0.04, x, 1.32 + r * 1.1, -29.0, copper, { inkW: 0.3, seg: 14 }); }
    box(g, 10.4, 0.8, 1.4, 4.5, 3.4, -29.3, ironM, { inkW: 0.6, rx: -0.2 }); cyl(g, 0.3, 0.3, 1.0, 4.5, 4.0, -29.5, ironM, { inkW: 0.4 });
    for (let i = 0; i < 6; i++) { const st2 = new T.Mesh(new T.PlaneGeometry(0.4, 1.4), L.M('steam', () => K3D.flat('#ffffff', { map: PARK.glowTex(), transparent: true, opacity: 0.12, depthWrite: false }))); st2.position.set(1.6 + (i % 4) * 2.4, 2.3, -29); st2.userData.live = true; g.add(st2); R.steam.push({ m: st2, ph: i * 1.7, x: st2.position.x }); }
    // the island: a butcher block top, drawers; the pan rack over it (the jack-o-spring rattles it); the cleaver
    box(g, 8, 1.0, 4, 5, 0.5, -23, L.wood('#4a2e1e'), { inkW: 0.7 });
    box(g, 8.1, 0.16, 4.1, 5, 1.08, -23, L.wood('#a07a4a'), { inkW: 0.5 });
    for (let i = 0; i < 4; i++) box(g, 1.6, 0.3, 0.04, 2 + i * 2, 0.7, -20.98, L.wood('#3a2418'), { inkW: 0.3 });
    { const rack = new T.Group(); rack.position.set(5, 3.3, -23); rack.userData.live = true; g.add(rack); box(rack, 6, 0.06, 1.6, 0, 0, 0, ironM, { inkW: 0.4 }); for (const sx of [-1, 1]) cyl(rack, 0.015, 0.015, 1.0, sx * 2.8, 0.5, 0, ironM, { ink: false, seg: 4 });
      const pans = []; for (let i = 0; i < 6; i++) { const pg = new T.Group(); pg.position.set(-2.5 + i, -0.05, (i % 2) * 0.6 - 0.3); rack.add(pg); cyl(pg, 0.01, 0.01, 0.3, 0, -0.15, 0, ironM, { ink: false, seg: 4 }); cyl(pg, 0.2 + (i % 3) * 0.04, 0.18, 0.08, 0, -0.42, 0, i % 2 ? copper : ironM, { rx: Math.PI / 2, inkW: 0.4, seg: 14 }); pans.push(pg); }
      R.springs.pans = (u, tt) => { for (const [i, pg] of pans.entries()) { pg.rotation.x = Math.sin(tt * 9 + i) * 0.5 * u; pg.rotation.z = Math.cos(tt * 7 + i * 2) * 0.4 * u; } }; }
    box(g, 1.2, 1.0, 0.8, 5, 0.5, -25.4, L.wood('#7a5a34'), { inkW: 0.6 });
    { const C = H.cleaver, cg = new T.Group(); cg.position.set(C.x, 1.02, C.z1 + 0.3); cg.userData.live = true; g.add(cg);
      const bl = new T.Group(); cg.add(bl);
      box(bl, 0.12, 0.5, 0.12, 0, 0.2, 0, L.wood('#3a2214'), { inkW: 0.4 });
      box(bl, 0.06, 1.0, 2.7, 0, 0.5, -1.4, L.M('cleaverSteel', () => K3D.toon('#c8cedc', { emissive: '#2a3040', emissiveIntensity: 0.6 })), { inkW: 0.7 });
      box(bl, 0.07, 0.1, 2.7, 0, 0.02, -1.4, tc('#e8eef8', { emissive: '#4a5060', emissiveIntensity: 0.8 }), { ink: false });
      const glint = L.sprite(K, bl, 0, 0.6, -2.4, 0.8, '#ffffff', 0.0);
      R.cleaver = { bl, glint, a: -1.5 }; }
    // the counter under the south wall: a sink with a dripping tap, chopping boards, jars (wisps hide in two)
    box(g, 15.5, 1.1, 1.4, 1.75, 0.55, -16.7, L.wood('#5a3a28'), { inkW: 0.6 });
    box(g, 15.6, 0.1, 1.5, 1.75, 1.12, -16.7, tc('#8a8478'), { inkW: 0.4 });
    box(g, 1.4, 0.3, 0.9, -2.4, 1.05, -16.7, tc('#c8c4b8'), { inkW: 0.5 }); cyl(g, 0.03, 0.03, 0.4, -2.4, 1.4, -16.25, steelM, { ink: false, rx: 0.4 });
    for (const [x, c2] of [[2.6, '#8ab0a0'], [4.0, '#c8a060'], [5.2, '#a0c0d0'], [7.8, '#8ab0a0'], [8.8, '#d0a0a0']]) cyl(g, 0.13, 0.12, 0.3, x, 1.32, -16.9, L.M('jar|' + c2, () => K3D.toon(c2, { transparent: true, opacity: 0.75 })), { inkW: 0.3 });
    box(g, 0.8, 0.04, 0.5, 0.6, 1.19, -16.6, L.wood('#c8a070'), { inkW: 0.3, ry: 0.2 });
    // shelves on the north wall above the range hood ends, on the west wall by the hatch: jars, crocks, garlic, sausages
    for (const [x, z, yaw] of [[11.6, -29.78, 0], [-2.0, -29.78, 0]]) for (let r = 0; r < 2; r++) { const sg = new T.Group(); sg.position.set(x, 2.0 + r * 0.7, z + 0.2); sg.rotation.y = yaw; g.add(sg); box(sg, 2.6, 0.06, 0.4, 0, 0, 0, L.wood('#4a2e1e'), { inkW: 0.3 }); for (let i = 0; i < 5; i++) cyl(sg, 0.1, 0.1, 0.24 + (i % 2) * 0.1, -1.0 + i * 0.5, 0.15, 0, tc(['#6a4a2a', '#8ab0a0', '#c8c0a8', '#5a2a2a', '#3a4a3a'][(i + r) % 5]), { inkW: 0.3, seg: 8 }); }
    for (const x of [-5.6]) for (let r = 0; r < 3; r++) { box(g, 0.4, 0.06, 2.4, x, 1.6 + r * 0.6, -19.4, L.wood('#4a2e1e'), { inkW: 0.3 }); for (let i = 0; i < 4; i++) cyl(g, 0.1, 0.1, 0.24, x, 1.75 + r * 0.6, -20.3 + i * 0.6, tc(['#6a4a2a', '#8ab0a0', '#c8c0a8', '#5a2a2a'][(i + r) % 4]), { inkW: 0.3, seg: 8 }); }
    for (let k = 0; k < 2; k++) { for (let i = 0; i < 6; i++) ball(g, 0.08, 10.4 + k * 1.6, 3.4 - i * 0.16, -29.6, tc(k ? '#8a3a2a' : '#e8e0c8'), { sc: [1, 1.3, 1], ink: false }); cyl(g, 0.008, 0.008, 1.0, 10.4 + k * 1.6, 3.2, -29.6, tc('#2a2a1a'), { ink: false, seg: 4 }); }
    // sacks of flour, barrels, a bread bin, a mousetrap; the icebox (the fridge's winder: its door opens on light)
    for (const [x, z] of [[12.6, -17.2], [13.1, -18.2], [12.4, -18.9]]) ball(g, 0.38, x, 0.38, z, tc('#d8ccb0'), { sc: [1, 1.15, 0.9], inkW: 0.6 });
    for (const [x, z] of [[12.8, -21.0], [12.8, -22.2]]) cyl(g, 0.4, 0.36, 1.0, x, 0.5, z, L.wood('#6a4a2a'), { inkW: 0.6 });
    { const ig = new T.Group(); ig.position.set(-5.35, 0, -27.6); g.add(ig); box(ig, 1.2, 2.2, 1.4, 0, 1.1, 0, tc('#d8d4c8'), { inkW: 0.7 }); for (let i = 0; i < 3; i++) box(ig, 0.06, 0.06, 0.3, 0.62, 0.6 + i * 0.6, -0.5, L.FIG.brass(), { ink: false });
      const door = new T.Group(); door.position.set(0.62, 0, 0.68); door.userData.live = true; ig.add(door); box(door, 0.06, 2.0, 1.32, 0, 1.1, -0.66, tc('#e8e4d8'), { inkW: 0.5 });
      const glow = new T.Mesh(new T.PlaneGeometry(1.1, 1.8), fl('#d8f0ff', 1.2, { transparent: true, opacity: 0, depthWrite: false, add: true })); glow.position.set(0.61, 1.1, 0); glow.rotation.y = Math.PI / 2; ig.add(glow); glow.userData.live = true;
      const pool = new T.Mesh(new T.PlaneGeometry(6, 8).rotateX(-Math.PI / 2), fl('#c8e8ff', 0.5, { map: L.poolTex(), transparent: true, opacity: 0, depthWrite: false, add: true })); pool.position.set(3.4, 0.03, 0); ig.add(pool); pool.userData.live = true;
      R.fridge = { door, glow, pool }; }
    winder(K, g, H.winders.find(w => w.id === 'fridge'), 'ICEBOX');
    // the dumbwaiter: a hatch in the west wall, a cage on ropes, its crank
    dumbCage(K, g, H.art.dumb.x, 0, H.art.dumb.z, 'dumbDown');
    winder(K, g, H.winders.find(w => w.id === 'dumbCrank'), 'LIFT UP');
    // a chopping block with a fish, a mouse in the bread bin, cobwebs
    box(g, 0.9, 0.5, 0.6, 9.6, 1.42, -16.8, L.wood('#8a5a34'), { inkW: 0.4 });
    for (const [x, z, dx, dz] of [[-5.8, -16.2, 1, -1], [13.8, -16.2, -1, -1], [-5.8, -29.8, 1, 1]]) L.web(K, g, x, 4.0, z, dx, dz, 1.2);
    bulb(K, g, 5, 3.4, -19, 0.9, '#ffc070');
  }
  // the dumbwaiter: an open cage with ropes up into a dark shaft (down: in the kitchen, up: in the gallery)
  function dumbCage(K, g, x, y, z, key) {
    const cg = new T.Group(); cg.position.set(x, y, z); cg.userData.live = true; g.add(cg);
    const ir = L.iron(), wd = L.wood('#3a2418');
    box(cg, 1.0, 0.12, 1.9, -0.2, 0.06, 0, wd, { inkW: 0.5 });
    box(cg, 1.0, 0.12, 1.9, -0.2, 2.6, 0, wd, { inkW: 0.5 });
    for (const sz of [-1, 1]) { box(cg, 1.0, 2.6, 0.06, -0.2, 1.3, sz * 0.92, wd, { inkW: 0.4 }); }
    for (let i = 0; i < 5; i++) cyl(cg, 0.015, 0.015, 2.5, 0.3, 1.3, -0.8 + i * 0.4, ir, { ink: false, seg: 4 });
    const gate = new T.Group(); gate.position.set(0.34, 0, 0); cg.add(gate); gate.userData.live = true;
    for (let i = 0; i < 6; i++) cyl(gate, 0.012, 0.012, 2.4, 0, 1.3, -0.8 + i * 0.32, L.FIG.brass(), { ink: false, seg: 4 });
    for (const yy of [0.4, 1.3, 2.2]) box(gate, 0.03, 0.04, 1.8, 0, yy, 0, L.FIG.brass(), { ink: false });
    for (const sz of [-0.6, 0.6]) cyl(cg, 0.02, 0.02, 4, -0.2, 4.6, sz, tc('#8a7a5a'), { ink: false, seg: 4 });
    const sign = new T.Mesh(new T.PlaneGeometry(1.1, 0.3), K3D.toon('#ffffff', { map: tex('liftSign', 128, 32, (c, w, h) => { c.fillStyle = '#1a1210'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8c870'; c.font = '700 15px "DejaVu Serif", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('DUMBWAITER', w / 2, h / 2 + 1); }) }));
    sign.position.set(0.38, 2.95, 0); sign.rotation.y = Math.PI / 2; cg.add(sign);
    R.cages[key] = { cg, gate };
  }

  /* =============================== stretch 3: upstairs =============================== */
  function gallery(K, g, W) {
    const Gl = H.art.gallery;
    floor(g, Gl.x0, Gl.x1, Gl.z0, Gl.z1, 0, L.boards(), 3);
    { const rn = new T.Mesh(new T.PlaneGeometry(1.5, 19).rotateX(-Math.PI / 2), L.M('rugCor2', () => { const t2 = L.runner().clone(); t2.needsUpdate = true; t2.wrapS = t2.wrapT = T.RepeatWrapping; t2.repeat.set(1, 4.5); return K3D.toon('#ffffff', { map: t2 }); })); rn.rotation.y = Math.PI / 2; rn.position.set(5.5, 0.022, -45); g.add(rn); }
    // the alcoves: floors, red velvet curtains drawn back (they fall shut while the pair hide)
    for (const ax of [4, 10]) {
      floor(g, ax - 0.8, ax + 0.8, -48.9, -47.9, 0, L.boards(), 2);
      const vel = L.M('alcVel', () => K3D.toon('#ffffff', { map: L.velvet('#5a0a1a'), side: T.DoubleSide }));
      const cur = [];
      for (const sx of [-1, 1]) { const geo = new T.PlaneGeometry(0.9, 3.4, 6, 4), p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 14) * 0.07); geo.translate(-sx * 0.45, -1.7, 0); geo.computeVertexNormals(); const cg = new T.Group(); cg.position.set(ax + sx * 0.8, 3.5, -47.85); cg.userData.live = true; g.add(cg); cg.add(L.mk(geo, vel, { ink: L.INK, inkW: 0.4 })); cur.push({ cg, sx }); }
      box(g, 1.9, 0.2, 0.2, ax, 3.55, -47.85, L.FIG.brass(), { inkW: 0.3 });
      R.curtains.push({ id: ax === 4 ? 'alc1' : 'alc2', cur });
    }
    // still portraits and sconces between the reaching ones; busts on plinths; a vase (wisps); lamps over the alcoves
    L.portrait(K, W('galN'), -3.2, 2.5, -47.78, 0, 2, 0.8);
    for (const x of [-4.6, 2.4, 8.4, 14.8]) L.sconce(K, W('galN'), x, 2.0, -47.78, 0, null);
    for (const [x, z] of [[-0.8, -47.3], [12.8, -43.0]]) { box(g, 0.5, 1.0, 0.5, x, 0.5, z, tc('#d8d0c8'), { inkW: 0.5 }); cyl(g, 0.16, 0.12, 0.4, x, 1.2, z, tc('#3a5a7a'), { inkW: 0.4 }); }
    for (const [x, z] of [[-4.6, -43.2], [15.2, -47.2]]) { box(g, 0.5, 1.2, 0.5, x, 0.6, z, tc('#d8d0c8'), { inkW: 0.5 }); ball(g, 0.2, x, 1.45, z, tc('#e0d8d0'), { sc: [0.9, 1.15, 0.95] }); box(g, 0.4, 0.2, 0.25, x, 1.25, z, tc('#e0d8d0'), { inkW: 0.3 }); }
    for (const w of H.winders.filter(q => q.id === 'plamp1' || q.id === 'plamp2')) { winder(K, g, w, 'LAMP'); galleryLamp(K, g, w); }
    // the stairwell: steps going down into the dark, banisters, a rope; the Butler comes up them
    for (let i = 0; i < 6; i++) box(g, 2.8, 0.2, 0.4, -1.2, -0.1 - i * 0.22, -41.8 + i * 0.4, L.wood('#3a2418'), { inkW: 0.4 });
    box(g, 2.8, 0.05, 2.4, -1.2, -1.6, -40.8, K3D.flat('#050408'), { ink: false });
    for (const sx of [-2.7, 0.3]) { box(g, 0.1, 1.0, 2.4, sx, 0.5, -40.8, L.wood('#2a160e'), { inkW: 0.4 }); box(g, 0.14, 0.08, 2.5, sx, 1.02, -40.8, L.wood('#4a2e1e'), { inkW: 0.3 }); }
    // the dumbwaiter's top (arriving from the kitchen), the gallery's window, webs
    dumbCage(K, g, -5.6, 0, -45, 'dumbUp');
    L.tallWindow(K, W('galW'), -5.78, -46.2, Math.PI / 2, 0.9, 2.0, 1.1, null);
    for (const [x, z, dx, dz] of [[-5.8, -47.8, 1, 1], [15.8, -47.8, -1, 1]]) L.web(K, g, x, 3.8, z, dx, dz, 1.1);
    bulb(K, g, 1, 3.2, -45, 0.7, '#ffb070');
  }
  function galleryLamp(K, g, w) {
    const lg = new T.Group(); lg.position.set(w.at[0], w.at[1], w.at[2]); g.add(lg);
    cyl(lg, 0.02, 0.02, 0.5, 0, 0.3, 0, L.FIG.brass(), { ink: false, seg: 6 });
    const shade = cyl(lg, 0.16, 0.28, 0.3, 0, 0, 0, tc('#e8d0a0', { emissive: '#000000' }), { inkW: 0.4, open: true, seg: 14 }); shade.userData.live = true;
    const glow = L.sprite(K, lg, 0, -0.1, 0, 2.6, '#ffd08a', 0);
    const pool = new T.Mesh(new T.PlaneGeometry(w.light.r * 2.2, w.light.r * 2.2).rotateX(-Math.PI / 2), fl('#ffd08a', 0.55, { map: L.poolTex(), transparent: true, opacity: 0, depthWrite: false, add: true })); pool.position.set(w.light.x - w.at[0], -w.at[1] + 0.03, w.light.z - w.at[2]); lg.add(pool); pool.userData.live = true;
    R.lamps.push({ w, shade, glow, pool });
  }

  function library(K, g, W, KG) {
    const Lb = H.art.library;
    floor(g, Lb.x0, Lb.x1, Lb.z0, Lb.z1, 0, L.boards(), 3);
    rug(g, 25, -45, 12, 7, 0, 'library', persian('#2a3a5a', '#c8a050', '#5a1420'));
    rug(g, 25, -55, 10, 6, 0, 'library2', persian('#4a1a14', '#c8a050', '#1a2a3a'));
    // tall shelves round the walls (the north one is solid), the free-standing double case across the middle
    bookcase(g, 25, -59.4, 17.6, 4.6, 0.8, 0);
    for (const [z0, z1] of [[-59, -56.1], [-53.9, -46.1], [-43.9, -36.4]]) bookcase(g, 16.45, (z0 + z1) / 2, z1 - z0, 4.2, 0.5, Math.PI / 2);
    for (const [z0, z1] of [[-59, -56.1], [-53.9, -48.2]]) bookcase(g, 33.55, (z0 + z1) / 2, z1 - z0, 4.2, 0.5, -Math.PI / 2);
    bookcase(g, 21.8, -50, 11.2, 3.4, 1.2, 0, true);
    // a ladder on a brass rail along the north shelves
    box(g, 17, 0.05, 0.05, 25, 4.0, -58.9, L.FIG.brass(), { ink: false });
    { const ld = new T.Group(); ld.position.set(21.6, 0, -58.5); ld.rotation.x = -0.18; g.add(ld); for (const sx of [-1, 1]) box(ld, 0.06, 4.1, 0.06, sx * 0.3, 2.05, 0, L.wood('#5a3a22'), { inkW: 0.3 }); for (let i = 0; i < 9; i++) box(ld, 0.6, 0.04, 0.05, 0, 0.3 + i * 0.44, 0, L.wood('#5a3a22'), { ink: false }); }
    // the reading corner: a wing chair, a side table with an open book and a candle, the reading lamp (Bo winds it)
    { const cg = new T.Group(); cg.position.set(19.2, 0, -38.6); cg.rotation.y = 2.4; g.add(cg); const vel = tc('#3a5a3a'); box(cg, 0.9, 0.45, 0.8, 0, 0.35, 0, vel, { round: 0.3 }); box(cg, 0.9, 1.0, 0.2, 0, 0.9, -0.35, vel, { round: 0.3 }); for (const sx of [-1, 1]) box(cg, 0.18, 0.5, 0.8, sx * 0.5, 0.65, 0, vel, { round: 0.3 }); }
    { cyl(g, 0.3, 0.3, 0.05, 20.8, 0.7, -37.6, L.wood('#4a2e1e'), { seg: 14 }); cyl(g, 0.04, 0.05, 0.7, 20.8, 0.35, -37.6, L.wood('#3a2214'), { seg: 6 }); box(g, 0.36, 0.03, 0.26, 20.8, 0.74, -37.6, tc('#efe6d0'), { ry: 0.4, inkW: 0.3 }); L.candle(K, g, 20.65, 0.73, -37.5, 0.14, null); }
    const rl = H.winders.find(w => w.id === 'rlamp');
    { const lg = new T.Group(); lg.position.set(rl.at[0], 0, rl.at[2]); g.add(lg); cyl(lg, 0.2, 0.24, 0.06, 0, 0.03, 0, L.FIG.brass(), { seg: 12 }); cyl(lg, 0.025, 0.025, 1.8, 0, 0.9, 0, L.FIG.brass(), { ink: false, seg: 6 });
      const shade = cyl(lg, 0.2, 0.36, 0.36, 0, 1.9, 0, tc('#d8b070'), { inkW: 0.4, open: true, seg: 14 }); shade.userData.live = true;
      const glow = L.sprite(K, lg, 0, 1.75, 0, 3, '#ffd08a', 0);
      const pool = new T.Mesh(new T.PlaneGeometry(rl.light.r * 2.2, rl.light.r * 2.2).rotateX(-Math.PI / 2), fl('#ffd08a', 0.55, { map: L.poolTex(), transparent: true, opacity: 0, depthWrite: false, add: true })); pool.position.set(rl.light.x - rl.at[0], 0.03, rl.light.z - rl.at[2]); lg.add(pool); pool.userData.live = true;
      R.lamps.push({ w: rl, shade, glow, pool }); }
    { const wg = Object.assign({}, rl, { x: rl.x, z: rl.z }); const st2 = new T.Group(); g.add(st2); box(st2, 0.12, 1.2, 0.12, rl.x, 0.6, rl.z - 0.2, L.wood('#3a2214'), { inkW: 0.3 }); winder(K, st2, Object.assign(wg, { z: rl.z }), 'LAMP', 1.3); }
    // the globe on its stand (a wisp inside), a writing desk with papers and a quill, a skull, a fireplace in the east wall
    { const gg = new T.Group(); gg.position.set(31.8, 0, -38.0); g.add(gg); cyl(gg, 0.3, 0.36, 0.06, 0, 0.03, 0, L.wood('#3a2214')); for (let i = 0; i < 3; i++) cyl(gg, 0.03, 0.03, 0.8, Math.cos(i * 2.1) * 0.2, 0.42, Math.sin(i * 2.1) * 0.2, L.wood('#3a2214'), { ink: false, seg: 5 });
      const globe = ball(gg, 0.42, 0, 1.25, 0, L.M('globeM', () => K3D.toon('#ffffff', { map: tex('globe', 256, 128, (c, w, h) => { c.fillStyle = '#c8b888'; c.fillRect(0, 0, w, h); c.fillStyle = '#8a6a3a'; for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(L.rnd() * w, 20 + L.rnd() * 88, 14 + L.rnd() * 26, 8 + L.rnd() * 16, L.rnd(), 0, Math.PI * 2); c.fill(); } c.strokeStyle = 'rgba(60,40,20,0.4)'; for (let x = 0; x < w; x += 21) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } }) })), { seg: 20, seg2: 14, inkW: 0.5 });
      globe.rotation.z = 0.4; globe.userData.live = true; R.globe = globe;
      const mer = L.mk(new T.TorusGeometry(0.47, 0.02, 4, 24, Math.PI * 1.4), L.FIG.brass(), { ink: false }); mer.position.y = 1.25; mer.rotation.set(0, Math.PI / 2, 0.4); gg.add(mer); }
    { const dg = new T.Group(); dg.position.set(30.4, 0, -57.6); g.add(dg); box(dg, 2.0, 0.08, 1.0, 0, 0.92, 0, L.wood('#4a2a1a'), { inkW: 0.5 }); for (const sx of [-1, 1]) box(dg, 0.5, 0.88, 0.9, sx * 0.72, 0.44, 0, L.wood('#3a2214'), { inkW: 0.4 });
      for (let i = 0; i < 4; i++) box(dg, 0.3, 0.01, 0.4, -0.4 + i * 0.25, 0.97 + i * 0.005, (L.rnd() - 0.5) * 0.3, tc('#e8dcc0'), { ry: L.rnd(), ink: false });
      ball(dg, 0.12, 0.6, 1.06, -0.2, tc('#e8e0c8'), { sc: [0.9, 1, 1.1] }); L.candle(K, dg, -0.7, 0.96, -0.25, 0.22, null); }
    { const fp = new T.Group(); fp.position.set(33.6, 0, -41.6); fp.rotation.y = -Math.PI / 2; g.add(fp); box(fp, 2.6, 1.6, 0.6, 0, 0.8, 0, tc('#4a4458'), { inkW: 0.7 }); box(fp, 1.6, 1.0, 0.62, 0, 0.5, 0.05, K3D.flat('#0a0606'), { ink: false }); box(fp, 3.0, 0.14, 0.8, 0, 1.66, 0.05, tc('#5a5468'), { inkW: 0.5 }); const e = new T.Mesh(new T.PlaneGeometry(1.2, 0.4), fl('#ff4a1a', 1.4, { transparent: true, opacity: 0.8 })); e.rotation.x = -Math.PI / 2; e.position.set(0, 0.06, 0.2); fp.add(e); L.sprite(K, fp, 0, 0.3, 0.5, 2.2, '#ff6a2a', 0.3); L.candelabra(K, fp, -1.0, 1.73, 0.1, null); L.candelabra(K, fp, 1.0, 1.73, 0.1, null); }
    // the books that fall (the jack-o-spring): six on the top shelf
    { const bs = []; for (let i = 0; i < 6; i++) { const b = box(g, 0.14, 0.42, 0.32, 23.6 + i * 0.3, 4.4, -59.1, tc(['#6a1a1a', '#1a3a5a', '#2a4a2a', '#5a3a1a', '#3a1a4a', '#7a5a2a'][i]), { inkW: 0.3 }); b.userData.live = true; bs.push({ b, x: b.position.x, vx: (L.rnd() - 0.5) * 0.8, vz: 1.2 + L.rnd() * 1.4, spin: (L.rnd() - 0.5) * 9 }); }
      R.springs.books = (u, tt, s) => { for (const q of bs) { const t2 = Math.min(s, 0.9); q.b.position.set(q.x + q.vx * t2, Math.max(0.08, 4.4 + 1.0 * t2 - 6 * t2 * t2), -59.1 + q.vz * t2); q.b.rotation.set(q.spin * t2, 0, q.spin * 0.7 * t2); } }; }
    // the organ nook: its own floor, the organ and its pipes, a bench; the bookcase door into it
    const Og = H.art.organ;
    floor(g, Og.x0, Og.x1, Og.z0, Og.z1, 0, L.boards(), 3);
    { const og = new T.Group(); og.position.set(12.9, 0, -55); g.add(og); box(og, 1.4, 1.4, 4.8, 0, 0.7, 0, L.wood('#3a1e14'), { inkW: 0.7 }); box(og, 0.5, 0.12, 4.0, 0.6, 1.1, 0, tc('#f2eee6'), { inkW: 0.3 }); for (let i = 0; i < 20; i++) box(og, 0.3, 0.06, 0.08, 0.65, 1.18, -1.9 + i * 0.2, K3D.flat('#141018'), { ink: false });
      for (let i = 0; i < 11; i++) { const h2 = 2.4 + Math.sin(i / 10 * Math.PI) * 1.6; cyl(og, 0.13, 0.13, h2, -0.5, 1.4 + h2 / 2, -2.2 + i * 0.44, L.FIG.brass(), { inkW: 0.4, seg: 10 }); }
      box(og, 0.5, 0.5, 2.0, 1.4, 0.25, 0, L.wood('#2a160e'), { inkW: 0.4 }); L.candelabra(K, og, 0.5, 1.4, -2.2, null); L.candelabra(K, og, 0.5, 1.4, 2.2, null); }
    const od = SC_.doors.find(d => d.d.id === 'organDoor');
    if (od) { const leaf = od.leaves[0].hinge; const bc = new T.Group(); leaf.add(bc); for (const sz of [-1, 1]) { const f = new T.Mesh(new T.PlaneGeometry(1.9, 3.0), L.M('doorBooks', () => { const t2 = bookTex().clone(); t2.needsUpdate = true; t2.wrapS = t2.wrapT = T.RepeatWrapping; t2.repeat.set(0.9, 1.2); return K3D.toon('#ffffff', { map: t2 }); })); f.position.set(1.0, 1.6, sz * 0.06); if (sz < 0) f.rotation.y = Math.PI; bc.add(f); } }
    // armour plinths for the two spooks; webs; a bulb
    for (const s of H.spooks.filter(q => q.id === 'libArm1' || q.id === 'libArm2')) box(g, 0.8, 0.06, 0.7, s.x, 0.03, s.z, tc('#3a3440'), { ink: false });
    for (const [x, z, dx, dz] of [[16.2, -59.8, 1, 1], [33.8, -59.8, -1, 1], [33.8, -36.2, -1, -1]]) L.web(K, g, x, 4.8, z, dx, dz, 1.3);
    bulb(K, g, 29, 3.8, -46, 1.2, '#ffb070');
    void KG;
  }

  function nursery(K, g, W) {
    const N = H.art.nursery;
    floor(g, N.x0, N.x1, N.z0, N.z1, 0, L.boards(), 3);
    rug(g, 41, -54, 6, 6, 0, 'nursery', (c, w, h) => { for (let r = 8; r > 0; r--) { c.fillStyle = r % 2 ? '#c8a0b8' : '#8ab0c8'; c.beginPath(); c.arc(w / 2, h / 2, r * 16, 0, Math.PI * 2); c.fill(); } L.stains(c, w, h * 2, 3, 'rgba(40,20,20,0.3)'); });
    // the rocking horse (it rocks by itself), the toy shelf with the music box, the cot, the dolls' house, the toy chest
    { const hg = new T.Group(); hg.position.set(37, 0, -58.1); hg.userData.live = true; g.add(hg); const body = new T.Group(); hg.add(body);
      const rk = L.mk(new T.TorusGeometry(1.0, 0.05, 4, 20, Math.PI * 0.6), L.wood('#7a3a2a'), { ink: L.INK, inkW: 0.4 }); for (const sz of [-0.2, 0.2]) { const r2 = rk.clone(); r2.position.set(0, 1.0, sz); r2.rotation.set(0, Math.PI / 2, Math.PI * 1.2); body.add(r2); }
      ball(body, 0.3, 0, 0.75, 0, tc('#f2eee6'), { sc: [0.8, 0.75, 1.5] }); for (let i = 0; i < 6; i++) ball(body, 0.06, 0.1 * (i % 2 ? 1 : -1), 0.85, -0.3 + i * 0.12, tc('#2a1a1a'), { ink: false });
      const nk = cyl(body, 0.1, 0.14, 0.5, 0, 1.05, 0.38, tc('#f2eee6'), { rx: -0.5 }); void nk; ball(body, 0.15, 0, 1.3, 0.55, tc('#f2eee6'), { sc: [0.8, 0.9, 1.5] });
      for (const sx of [-1, 1]) ball(body, 0.03, sx * 0.09, 1.36, 0.68, fl('#ff4a4a', 2), { ink: false });
      for (const [x, z] of [[-0.15, -0.3], [0.15, -0.3], [-0.15, 0.3], [0.15, 0.3]]) cyl(body, 0.04, 0.04, 0.55, x, 0.42, z, tc('#f2eee6'), { ink: false, seg: 6 });
      box(body, 0.4, 0.06, 0.3, 0, 1.06, -0.05, tc('#8a1a2a'), { inkW: 0.3 });
      R.horse = body; }
    box(g, 4.8, 1.2, 0.8, 42, 0.6, -59.4, L.wood('#d8c8b0'), { inkW: 0.6 });
    for (const [x, c2, s] of [[40.0, '#c84a4a', 0.2], [40.6, '#4a8ac8', 0.16], [43.2, '#e8c84a', 0.2], [43.9, '#5ab06a', 0.18]]) box(g, s, s, s, x, 1.2 + s / 2, -59.3, tc(c2), { inkW: 0.3, ry: L.rnd() });
    { const sl = new T.Group(); sl.position.set(42.8, 1.2, -59.3); g.add(sl); for (let i = 0; i < 3; i++) { cyl(sl, 0.06, 0.06, 0.22, i * 0.15, 0.11, 0, tc('#3a3ab0'), { ink: false, seg: 8 }); ball(sl, 0.05, i * 0.15, 0.27, 0, tc('#f2d0b0'), { ink: false }); cyl(sl, 0.06, 0.06, 0.1, i * 0.15, 0.34, 0, tc('#1a1a1a'), { ink: false, seg: 8 }); } }
    { const mb = new T.Group(); mb.position.set(41.6, 1.2, -59.3); g.add(mb); box(mb, 0.6, 0.3, 0.42, 0, 0.15, 0, L.wood('#8a2a3a'), { inkW: 0.4 }); for (const sx of [-1, 1]) box(mb, 0.05, 0.05, 0.44, sx * 0.25, 0.25, 0, L.FIG.brass(), { ink: false });
      const lid = new T.Group(); lid.position.set(0, 0.3, -0.21); lid.userData.live = true; mb.add(lid); box(lid, 0.6, 0.06, 0.42, 0, 0.03, 0.21, L.wood('#8a2a3a'), { inkW: 0.4 });
      const mir = new T.Mesh(new T.PlaneGeometry(0.5, 0.34), tc('#a8b0d8', { emissive: '#3a3a5a', emissiveIntensity: 0.6 })); mir.position.set(0, 0.07, 0.21); mir.rotation.x = -Math.PI / 2; lid.add(mir);
      const bal = new T.Group(); bal.position.set(0, 0.3, 0); bal.userData.live = true; mb.add(bal); cyl(bal, 0.01, 0.01, 0.1, 0, 0.05, 0, L.FIG.brass(), { ink: false, seg: 4 }); { const sk = L.mk(new T.ConeGeometry(0.07, 0.07, 10), tc('#f2c0d0'), { ink: false }); sk.position.set(0, 0.13, 0); bal.add(sk); } { const tu = L.mk(new T.ConeGeometry(0.07, 0.06, 10).rotateX(Math.PI), tc('#f2c0d0'), { ink: false }); tu.position.y = 0.14; bal.add(tu); const bd = ball(bal, 0.03, 0, 0.2, 0, tc('#f8e8e0'), { ink: false }); void bd; }
      const key = L.FIG.windKey(0.5); key.position.set(0.32, 0.15, 0); key.rotation.y = Math.PI / 2; mb.add(key); key.userData.live = true;
      R.musicBox = { lid, bal, key }; }
    { const cg = new T.Group(); cg.position.set(46.6, 0, -57.8); g.add(cg); box(cg, 2.4, 0.1, 2.0, 0, 0.5, 0, L.wood('#e8e0d0'), { inkW: 0.4 }); for (let i = 0; i < 9; i++) for (const sz of [-1, 1]) cyl(cg, 0.025, 0.025, 0.7, -1.1 + i * 0.275, 0.85, sz * 0.98, L.wood('#e8e0d0'), { ink: false, seg: 5 }); for (const sx of [-1, 1]) box(cg, 0.08, 1.3, 2.0, sx * 1.2, 0.65, 0, L.wood('#e8e0d0'), { inkW: 0.4 });
      box(cg, 2.2, 0.16, 1.8, 0, 0.62, 0, tc('#c8d8e8'), { round: 0.4 }); ball(cg, 0.3, -0.7, 0.75, 0, tc('#c8a070'), { sc: [1, 0.9, 0.8] }); for (const sx of [-1, 1]) ball(cg, 0.09, -0.7 + sx * 0.18, 1.0, 0, tc('#c8a070')); ball(cg, 0.035, -0.62, 0.8, 0.22, tc('#1a1010'), { ink: false });
      const mob = new T.Group(); mob.position.set(0, 2.6, 0); mob.userData.live = true; cg.add(mob); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; cyl(mob, 0.005, 0.005, 0.5, Math.cos(a) * 0.4, -0.25, Math.sin(a) * 0.4, tc('#c8c8c8'), { ink: false, seg: 3 }); const st2 = L.mk(new T.OctahedronGeometry(0.09, 0), tc(['#f2d04a', '#c8d8f8'][i % 2], { emissive: '#3a3420', emissiveIntensity: 0.5 }), { ink: false }); st2.position.set(Math.cos(a) * 0.4, -0.55, Math.sin(a) * 0.4); mob.add(st2); }
      R.mobile = mob; }
    { const dh = new T.Group(); dh.position.set(34.7, 0, -51.5); dh.rotation.y = Math.PI / 2; g.add(dh); box(dh, 2.2, 1.3, 1.0, 0, 0.65, 0, tc('#d8b8a0'), { inkW: 0.6 }); const roof = L.mk(new T.ConeGeometry(1.6, 0.8, 4), tc('#6a3a3a'), { ink: L.INK, inkW: 0.5 }); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.5); roof.position.y = 1.7; dh.add(roof);
      for (let i = 0; i < 3; i++) for (let r = 0; r < 2; r++) { const w2 = new T.Mesh(new T.PlaneGeometry(0.3, 0.3), fl(i === 1 && r === 0 ? '#ffd08a' : '#2a2a3a', i === 1 && r === 0 ? 1.4 : 1)); w2.position.set(-0.7 + i * 0.7, 0.4 + r * 0.55, 0.51); dh.add(w2); } }
    { const cg = new T.Group(); cg.position.set(47.0, 0, -52.4); cg.rotation.y = -Math.PI / 2; g.add(cg); box(cg, 2.0, 0.9, 1.0, 0, 0.45, 0, L.wood('#5a6aa0'), { inkW: 0.7 }); for (const sx of [-1, 1]) box(cg, 0.06, 0.92, 1.02, sx * 0.6, 0.45, 0, L.FIG.brass(), { ink: false });
      const lt = tex('chestLbl', 128, 32, (c, w, h) => { c.fillStyle = '#5a6aa0'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2e0a0'; c.font = '700 20px "DejaVu Serif", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TOYS', w / 2, h / 2 + 1); });
      const lb = new T.Mesh(new T.PlaneGeometry(0.7, 0.18), K3D.toon('#ffffff', { map: lt })); lb.position.set(0, 0.55, 0.51); cg.add(lb);
      const lid = new T.Group(); lid.position.set(0, 0.9, -0.5); lid.userData.live = true; cg.add(lid); box(lid, 2.04, 0.1, 1.04, 0, 0.05, 0.5, L.wood('#4a5a90'), { inkW: 0.5 });
      R.chest = lid; }
    // blocks, a teddy with one eye, toy soldiers in a line, a spinning top, a window with the moon, webs
    for (let i = 0; i < 9; i++) box(g, 0.24, 0.24, 0.24, 38 + L.rnd() * 6, 0.12 + (i === 8 ? 0.24 : 0), -50 - L.rnd() * 2.6, tc(['#c84a4a', '#4a8ac8', '#e8c84a', '#5ab06a'][i % 4]), { ry: L.rnd() * 2, inkW: 0.3 });
    { const tg = new T.Group(); tg.position.set(44.8, 0, -49.4); tg.rotation.y = -2.6; g.add(tg); const fur = tc('#a07040'); ball(tg, 0.28, 0, 0.3, 0, fur, { sc: [1, 1.1, 0.9] }); ball(tg, 0.2, 0, 0.72, 0, fur); for (const sx of [-1, 1]) { ball(tg, 0.08, sx * 0.15, 0.88, 0, fur); ball(tg, 0.1, sx * 0.28, 0.32, 0.08, fur); ball(tg, 0.11, sx * 0.15, 0.08, 0.18, fur); } ball(tg, 0.03, 0.07, 0.76, 0.18, tc('#1a1010'), { ink: false }); box(tg, 0.05, 0.005, 0.02, -0.07, 0.76, 0.19, tc('#1a1010'), { ink: false, rz: 0.8 }); }
    L.tallWindow(K, W('nurN'), 39.2, -59.78, 0, 1.0, 1.8, 1.4, null);
    L.portrait(K, W('nurE'), 47.78, 2.6, -55.6, -Math.PI / 2, 0, 0.7);
    for (const [x, z, dx, dz] of [[34.2, -59.8, 1, 1], [47.8, -59.8, -1, 1]]) L.web(K, g, x, 3.8, z, dx, dz, 1.0);
    bulb(K, g, 41, 3.2, -54, 0.8, '#ffc0d0');
  }

  function bedroom(K, g, W) {
    const Bd = H.art.bedroom;
    floor(g, Bd.x0, Bd.x1, Bd.z0, Bd.z1, 0, L.boards(), 3);
    rug(g, 41.6, -41, 6, 5, 0, 'bed', persian('#1a2a4a', '#a08a50', '#3a1a2a'));
    // the four-poster: posts, a canopy with drapes, a quilt, pillows; the lump under the covers sits up (a spring)
    { const bg = new T.Group(); bg.position.set(37.3, 0, -41.6); g.add(bg); const wd = L.wood('#2e1a10');
      box(bg, 4.2, 0.5, 6.0, 0, 0.35, 0, wd, { inkW: 0.7 }); box(bg, 4.0, 0.3, 5.8, 0, 0.72, 0, tc('#e8e4dc'), { round: 0.5 });
      box(bg, 4.1, 0.16, 4.2, 0, 0.9, 0.8, tc('#2a3a6a', { emissive: '#0a0a20', emissiveIntensity: 0.4 }), { round: 0.4 });
      for (const sz of [-1, 1]) box(bg, 1.4, 0.3, 0.9, sz * 0.9, 0.98, -2.3, tc('#f2eee6'), { round: 0.6 });
      for (const [x, z] of [[-2, -2.9], [2, -2.9], [-2, 2.9], [2, 2.9]]) cyl(bg, 0.09, 0.1, 3.3, x, 1.65, z, wd, { seg: 10 });
      box(bg, 4.3, 0.2, 6.1, 0, 3.3, 0, wd, { inkW: 0.5 }); box(bg, 4.2, 1.2, 0.12, 0, 1.5, -2.95, wd, { inkW: 0.5 });
      const vel = L.M('bedVel', () => K3D.toon('#ffffff', { map: L.velvet('#2a1a4a'), side: T.DoubleSide }));
      for (const [x, z, yaw] of [[-2.05, -2.0, Math.PI / 2], [-2.05, 2.0, Math.PI / 2], [2.05, 2.4, -Math.PI / 2]]) { const geo = new T.PlaneGeometry(1.4, 3.0, 6, 4), p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 14) * 0.06); geo.computeVertexNormals(); const d = L.mk(geo, vel, { ink: L.INK, inkW: 0.4 }); d.position.set(x, 1.7, z); d.rotation.y = yaw; bg.add(d); }
      const lump = new T.Group(); lump.position.set(0, 0.95, 0.2); lump.userData.live = true; bg.add(lump); const lb = L.mk(new T.SphereGeometry(0.5, 16, 12).scale(1, 0.6, 1.6), tc('#2a3a6a', { emissive: '#0a0a20', emissiveIntensity: 0.4 }), { ink: L.INK, inkW: 0.5 }); lump.add(lb);
      const eyes = []; for (const sx of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.035, 6, 4), K3D.flat(L.hot('#ffd24a', 3))); e.position.set(sx * 0.1, 0.25, 0.55); e.visible = false; lump.add(e); eyes.push(e); }
      R.springs.lump = (u) => { lump.rotation.x = -u * 1.2; lump.position.z = 0.2 - u * 0.6; lb.scale.set(1, 1 + u * 0.3, 1); for (const e of eyes) e.visible = u > 0.5; }; }
    for (const z of [-45.4, -37.8]) { box(g, 0.7, 0.7, 0.6, 35.5, 0.35, z, L.wood('#3a2214'), { inkW: 0.5 }); L.candle(K, g, 35.5, 0.7, z, 0.2, null); }
    // the dresser with a mirror against the nursery wall, a chest of drawers (a wisp in a jar), slippers, a chamber pot
    { const dg = new T.Group(); dg.position.set(40.4, 0, -47.5); g.add(dg); box(dg, 2.0, 1.0, 0.7, 0, 0.5, 0, L.wood('#3a2214'), { inkW: 0.6 }); for (let i = 0; i < 3; i++) box(dg, 1.8, 0.24, 0.04, 0, 0.2 + i * 0.3, 0.36, L.wood('#2a160e'), { inkW: 0.3 }); bigMirror(K, dg, 0, 1.9, 0.0, 0, 1.0, 1.4); cyl(dg, 0.08, 0.06, 0.2, -0.7, 1.1, 0.1, tc('#a8c8d8'), { ink: false }); L.candle(K, dg, 0.7, 1.0, 0.1, 0.2, null); }
    { box(g, 1.6, 1.2, 0.7, 44.6, 0.6, -36.75, L.wood('#3a2214'), { inkW: 0.6 }); cyl(g, 0.12, 0.1, 0.28, 44.4, 1.34, -36.9, L.M('jarGlass', () => K3D.toon('#8ab0a0', { transparent: true, opacity: 0.7 })), { inkW: 0.3 }); L.portrait(K, W('bedS'), 44.6, 2.7, -36.22, Math.PI, 3, 0.7); }
    for (const sx of [-1, 1]) box(g, 0.14, 0.08, 0.3, 39.9 + sx * 0.12, 0.04, -40.2, tc('#7a2a3a'), { round: 0.6, ry: 0.3 });
    // the wardrobe built round the door to the attic stairs
    { const wg = new T.Group(); wg.position.set(47.4, 0, -41); g.add(wg); const wd = L.wood('#3a2218'); for (const sz of [-1, 1]) box(wg, 1.0, 3.2, 0.3, 0, 1.6, sz * 1.15, wd, { inkW: 0.6 }); box(wg, 1.1, 0.4, 2.7, 0, 3.4, 0, wd, { inkW: 0.6 }); const cr = L.mk(new T.CylinderGeometry(0.6, 0.6, 0.08, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateY(-Math.PI / 2), wd, { ink: L.INK, inkW: 0.5 }); cr.position.set(-0.5, 3.6, 0); cr.scale.set(1, 0.6, 1.4); wg.add(cr); }
    L.tallWindow(K, W('nurBed'), 36.6, -47.78, Math.PI, 1.0, 1.8, 1.3, null);
    L.web(K, g, 34.2, 3.8, -47.8, 1, 1, 1.0); L.web(K, g, 47.8, 3.8, -36.2, -1, -1, 1.0);
  }

  /* =============================== stretch 4: the attic and the ballroom =============================== */
  function stairsUp(K, g) {
    const S = H.art.stairs;
    floor(g, 48, 54, -43, -39, 0, L.boards(), 2);
    for (let i = 0; i < 12; i++) box(g, 0.5, 0.25 * (i + 1), 4, 48.25 + i * 0.5, 0.125 * (i + 1), -41, L.wood(i % 2 ? '#4a3020' : '#3a2418'), { inkW: 0.4 });
    for (const sz of [-1, 1]) { const pts = [L.V(48.2, 1.0, -41 + sz * 1.8), L.V(54, 4.0, -41 + sz * 1.8)]; const rail = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 4, 0.04, 6), L.wood('#2a160e')); g.add(rail); }
    bulb(K, g, 51.2, 4.8, -41, 1.4, '#ffd08a');
    L.signBoard(K, g, 49.5, -42.75, 0, 'tour', 0.8, 1.4, false);
    void S;
  }
  // the attic's clutter: everything the manor ever put away, stacked along the walls (each piece has a solid box in the house)
  function atticClutter(K, g, y) {
    const wd = c => L.wood(c), pap = tc('#d8ccb0');
    // crates stacked against the south wall, stencilled, one lid off with straw and a sheet-ghost's face peeping out
    const crate = (x, yy, z, w, h, d, ry = 0, c = '#7a5a34') => { const cg = new T.Group(); cg.position.set(x, yy, z); cg.rotation.y = ry; g.add(cg);
      box(cg, w, h, d, 0, h / 2, 0, wd(c), { inkW: 0.5 });
      for (const sy of [0.08, h - 0.08]) for (const sz of [-1, 1]) box(cg, w + 0.02, 0.1, 0.04, 0, sy, sz * (d / 2 + 0.01), wd('#4a3020'), { ink: false });
      const st2 = new T.Mesh(new T.PlaneGeometry(w * 0.6, h * 0.4), K3D.flat('#ffffff', { map: tex('crateSt', 128, 64, (c2, w2, h2) => { c2.clearRect(0, 0, w2, h2); c2.fillStyle = 'rgba(30,18,10,0.75)'; c2.font = '700 22px "DejaVu Sans", sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('SPOOKS', w2 / 2, 20); c2.font = '700 14px "DejaVu Sans", sans-serif'; c2.fillText('THIS WAY UP', w2 / 2, 46); }), transparent: true }));
      st2.position.set(0, h / 2, d / 2 + 0.03); cg.add(st2); return cg; };
    crate(64.6, y, -37.0, 1.4, 1.0, 1.1, 0.05); crate(64.7, y + 1.0, -37.1, 1.2, 0.8, 1.0, -0.12, '#8a6a40'); crate(66.3, y, -36.9, 1.2, 1.2, 1.0, -0.08, '#6a4a2a');
    crate(67.8, y, -37.0, 1.0, 0.8, 0.9, 0.2); crate(66.2, y + 1.2, -37.0, 0.9, 0.6, 0.8, 0.3, '#8a6a40');
    { const op = crate(68.0, y + 0.8, -37.0, 0.9, 0.5, 0.8, -0.2, '#9a7a4a'); for (let i = 0; i < 12; i++) { const sw = cyl(op, 0.01, 0.01, 0.4, (L.rnd() - 0.5) * 0.7, 0.55, (L.rnd() - 0.5) * 0.6, tc('#d8b860'), { ink: false, seg: 3 }); sw.rotation.set(L.rnd() * 2, 0, L.rnd() * 2); }
      ball(op, 0.2, 0.1, 0.62, 0, tc('#ece8f2'), { sc: [1, 1.1, 1] }); for (const sx of [-1, 1]) ball(op, 0.04, 0.1 + sx * 0.07, 0.68, 0.17, K3D.flat('#1a1420'), { ink: false }); }
    // hat boxes in striped paper, piled by the west wall; a birdcage on top with a clockwork bird
    for (const [x, z, n] of [[55.0, -53.8, 3], [55.1, -55.4, 2]]) for (let i = 0; i < n; i++) { const r = 0.42 - i * 0.07; cyl(g, r, r, 0.38, x + (L.rnd() - 0.5) * 0.1, y + 0.19 + i * 0.4, z, tc(['#c86a8a', '#6a9ac8', '#d8b860'][i % 3]), { seg: 16, inkW: 0.4 }); cyl(g, r + 0.02, r + 0.02, 0.07, x, y + 0.36 + i * 0.4, z, tc('#f2e8d8'), { seg: 16, ink: false }); }
    { const bc = new T.Group(); bc.position.set(55.0, y + 1.22, -53.8); g.add(bc); const br = L.FIG.brass();
      cyl(bc, 0.3, 0.3, 0.04, 0, 0, 0, br, { seg: 14 }); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; cyl(bc, 0.008, 0.008, 0.62, Math.cos(a) * 0.28, 0.31, Math.sin(a) * 0.28, br, { ink: false, seg: 3 }); }
            const bird = new T.Group(); bird.position.set(0, 0.24, 0); bird.userData.live = true; bc.add(bird); ball(bird, 0.08, 0, 0, 0, tc('#4ac8a0'), { sc: [1.3, 1, 1] }); ball(bird, 0.05, 0.09, 0.05, 0, tc('#4ac8a0')); { const bk = L.mk(new T.ConeGeometry(0.02, 0.06, 6).rotateZ(-Math.PI / 2), tc('#e8b040'), { ink: false }); bk.position.set(0.15, 0.05, 0); bird.add(bk); }
      R.bird = bird; }
    // leaning picture frames and rolled carpets along the west wall
    for (const [z, w, h, c] of [[-58.6, 1.4, 1.9, '#8a6a2a'], [-59.2, 1.1, 1.4, '#6a4a2a'], [-59.8, 1.6, 1.1, '#b8903a']]) { const fr = new T.Group(); fr.position.set(54.55, y + h / 2, z); fr.rotation.set(0, Math.PI / 2, 0); fr.rotation.x = 0; g.add(fr);
      const tilt = new T.Group(); tilt.rotation.x = -0.14; fr.add(tilt); box(tilt, w, h, 0.08, 0, 0, 0, tc(c), { inkW: 0.5 }); box(tilt, w - 0.2, h - 0.2, 0.09, 0, 0, 0.01, tc('#2a2232'), { ink: false }); }
    for (const [z, c, r] of [[-47.0, '#8a2a2a', 0.22], [-46.4, '#2a4a7a', 0.18], [-45.9, '#6a5a2a', 0.2]]) { cyl(g, r, r, 2.2, 55.4, y + r, z, tc(c), { rz: Math.PI / 2, seg: 12, inkW: 0.4 }); cyl(g, r * 0.4, r * 0.4, 2.22, 55.4, y + r, z, tc('#2a1a12'), { rz: Math.PI / 2, seg: 8, ink: false }); }
    // a rocking chair with a moth-eaten shawl; a gramophone with a great horn; a stack of books and a skull of a lamp
    { const rc = new T.Group(); rc.position.set(60.2, y, -53.4); rc.rotation.y = 0.6; rc.userData.live = true; g.add(rc); const w2 = wd('#4a2e1e');
      for (const sx of [-1, 1]) { const run = L.mk(new T.TorusGeometry(0.9, 0.04, 6, 16, 1.1).rotateY(Math.PI / 2), w2, { ink: L.INK, inkW: 0.4 }); run.position.set(sx * 0.3, 0.92, 0); run.rotation.x = Math.PI + 0.55 + 0.4; rc.add(run); }
      box(rc, 0.7, 0.06, 0.6, 0, 0.5, 0, w2, { inkW: 0.4 }); for (let i = 0; i < 5; i++) box(rc, 0.05, 0.9, 0.04, -0.28 + i * 0.14, 0.98, -0.3, w2, { ink: false }); box(rc, 0.76, 0.08, 0.06, 0, 1.44, -0.3, w2, { inkW: 0.4 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(rc, 0.05, 0.42, 0.05, sx * 0.3, 0.28, sz * 0.26, w2, { ink: false });
      box(rc, 0.72, 0.5, 0.04, 0, 1.1, -0.27, tc('#5a3a6a'), { ink: false, rx: 0.05 }); R.rocker = rc; }
    { const gp = new T.Group(); gp.position.set(72.6, y, -56.6); gp.rotation.y = -2.2; g.add(gp); box(gp, 0.7, 0.7, 0.7, 0, 0.35, 0, wd('#6a3a1e'), { inkW: 0.5 }); box(gp, 0.6, 0.3, 0.6, 0, 0.85, 0, wd('#4a2a14'), { inkW: 0.5 });
      cyl(gp, 0.25, 0.25, 0.02, 0, 1.01, 0, K3D.flat('#141018'), { ink: false, seg: 20 }); cyl(gp, 0.02, 0.03, 0.6, 0.1, 1.25, 0.1, L.FIG.brass(), { ink: false, seg: 6, rz: 0.4 });
      const horn = L.mk(new T.CylinderGeometry(0.5, 0.04, 0.9, 20, 1, true), L.M('hornM', () => K3D.toon('#c8903a', { side: T.DoubleSide, emissive: '#3a2410', emissiveIntensity: 0.4 })), { ink: L.INK, inkW: 0.5 }); horn.position.set(0.25, 1.8, 0.25); horn.rotation.set(0.7, 0, -0.5); gp.add(horn); }
    for (const [x, z, n] of [[58.7, -36.9, 7], [59.5, -37.0, 4], [66.8, -59.0, 6]]) for (let i = 0; i < n; i++) box(g, 0.5 + L.rnd() * 0.12, 0.09, 0.38, x + (L.rnd() - 0.5) * 0.08, y + 0.05 + i * 0.09, z, tc(['#7a2a2a', '#2a4a6a', '#5a6a2a', '#6a4a7a', '#8a6a3a'][i % 5]), { ry: (L.rnd() - 0.5) * 0.5, ink: i === n - 1 ? L.INK : false, inkW: 0.3 });
    // a costume rail along the east wall: spare sheets, a butler's tailcoat, a skeleton suit
    { const cr = new T.Group(); cr.position.set(73.0, y, -54.2); cr.rotation.y = Math.PI / 2; g.add(cr); const ir = L.iron();
      for (const sx of [-1.4, 1.4]) cyl(cr, 0.03, 0.03, 1.9, sx, 0.95, 0, ir, { ink: false, seg: 6 }); cyl(cr, 0.025, 0.025, 2.9, 0, 1.88, 0, ir, { rz: Math.PI / 2, ink: false, seg: 6 });
      for (let i = 0; i < 6; i++) { const hx = -1.15 + i * 0.46; const hang = new T.Group(); hang.position.set(hx, 1.82, 0); hang.userData.live = true; cr.add(hang);
        const kind = i % 3; if (kind === 0) { const sh = L.mk(new T.ConeGeometry(0.26, 1.2, 10, 1, true), L.M('sheetCos', () => K3D.toon('#ece8f2', { side: T.DoubleSide })), { ink: L.INK, inkW: 0.4 }); sh.position.y = -0.6; hang.add(sh); for (const ex of [-1, 1]) { const e = ball(hang, 0.035, ex * 0.08, -0.32, 0.2, K3D.flat('#1a1420'), { ink: false }); void e; } }
        else if (kind === 1) { box(hang, 0.5, 0.9, 0.14, 0, -0.5, 0, tc('#1a1820'), { inkW: 0.4 }); box(hang, 0.16, 0.5, 0.15, 0, -0.32, 0.005, tc('#f0ece4'), { ink: false }); }
        else { box(hang, 0.46, 1.1, 0.1, 0, -0.6, 0, tc('#14121a'), { inkW: 0.4 }); for (let k = 0; k < 4; k++) box(hang, 0.3, 0.03, 0.11, 0, -0.3 - k * 0.1, 0.005, tc('#ece8dc'), { ink: false }); }
        R.swing.push({ g: hang, ph: i * 1.7, amp: 0.05 }); } }
    // roof posts and braces against the walls; webs in the corners; dust on the boards
    for (const [x, z, ry] of [[54.4, -61.6, 0], [73.6, -61.6, 0], [54.4, -36.4, 0], [73.6, -36.4, 0], [60.6, -36.35, 0], [67.4, -36.35, 0], [73.65, -42.6, Math.PI / 2], [73.65, -49.0, Math.PI / 2]]) {
      box(g, 0.32, 4.6, 0.32, x, y + 2.3, z, wd('#3a2418'), { inkW: 0.5 });
      if (ry === 0 && z > -40 && x > 55 && x < 73) { for (const sx of [-1, 1]) box(g, 0.16, 1.6, 0.16, x + sx * 0.6, y + 3.8, z, wd('#3a2418'), { rz: sx * 0.75, ink: false }); }
      if (ry !== 0) { for (const sz of [-1, 1]) box(g, 0.16, 1.6, 0.16, x, y + 3.8, z + sz * 0.6, wd('#3a2418'), { rx: -sz * 0.75, ink: false }); } }
    for (const [x, z, dx, dz, s] of [[54.3, -61.7, 1, 1, 1.8], [73.7, -61.7, -1, 1, 1.6], [73.7, -36.3, -1, -1, 2.0], [54.3, -36.3, 1, -1, 1.4], [60.6, -36.5, 1, -1, 1.1]]) L.web(K, g, x, y + 4.4, z, dx, dz, s);
    for (const [a, b] of [[[56.0, y + 1.5, -48.8], [57.6, y + 3.9, -50.6]], [[66.4, y + 1.7, -44.6], [68.2, y + 4.2, -44.0]], [[72.4, y + 1.2, -39.4], [73.8, y + 3.6, -38.0]]]) strand(g, a, b, 0.2);
    { const dm = tex('atticDust', 256, 256, (c, w, h) => { c.clearRect(0, 0, w, h); for (let i = 0; i < 26; i++) { const cx = L.rnd() * w, cy = L.rnd() * h, r = 14 + L.rnd() * 26; const gr = c.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, 'rgba(150,140,130,0.14)'); gr.addColorStop(1, 'rgba(150,140,130,0)'); c.fillStyle = gr; c.fillRect(cx - r, cy - r, r * 2, r * 2); } for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(170,160,140,0.16)'; c.fillRect(L.rnd() * w, L.rnd() * h, 3 + L.rnd() * 6, 1); } });
      const d = new T.Mesh(new T.PlaneGeometry(20, 26).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: dm, transparent: true, depthWrite: false })); d.position.set(64, y + 0.012, -49); g.add(d); }
    // a moth-eaten rug under the middle (the stain where something stood), a toy train's oval of track with its little engine, spilled keys
    { const rgm = rug(g, 63.6, -48.2, 7.6, 5.4, y, 'atticRug', persian('#3a2a4a', '#a88a50', '#5a2a2a')); rgm.rotation.y = 0.08;
      const hole = tex('rugHoles', 128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); for (let i = 0; i < 9; i++) { c.fillStyle = 'rgba(12,8,6,0.85)'; c.beginPath(); c.ellipse(L.rnd() * w, L.rnd() * h, 2 + L.rnd() * 6, 2 + L.rnd() * 4, L.rnd() * 3, 0, Math.PI * 2); c.fill(); } });
      const hm = new T.Mesh(new T.PlaneGeometry(7.6, 5.4).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: hole, transparent: true, depthWrite: false })); hm.position.set(63.6, y + 0.03, -48.2); hm.rotation.y = 0.08; g.add(hm);
      const tr = new T.Group(); tr.position.set(63.2, y + 0.04, -48.6); g.add(tr); const rail = L.mk(new T.TorusGeometry(1.4, 0.025, 4, 40).rotateX(Math.PI / 2), L.iron(), { ink: false }); rail.scale.set(1.3, 1, 0.8); tr.add(rail); const rail2 = rail.clone(); rail2.scale.set(1.3 * 1.08, 1, 0.8 * 1.1); tr.add(rail2);
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; const sl = box(tr, 0.06, 0.02, 0.22, Math.cos(a) * 1.4 * 1.34, 0, Math.sin(a) * 1.4 * 0.84, L.wood('#3a2418'), { ink: false }); sl.rotation.y = -a; }
      const eng = new T.Group(); eng.userData.live = true; tr.add(eng); box(eng, 0.36, 0.2, 0.18, 0, 0.14, 0, tc('#c83a3a'), { inkW: 0.3 }); cyl(eng, 0.05, 0.05, 0.14, 0.12, 0.3, 0, tc('#2a2a2a'), { ink: false }); box(eng, 0.14, 0.14, 0.18, -0.12, 0.3, 0, tc('#2a4a8a'), { ink: false });
      R.train = eng; }
    // scattered on the floor: a wind-up mouse, a dropped key, a sheet's broken face mask, papers
    for (let i = 0; i < 14; i++) { const pp = new T.Mesh(new T.PlaneGeometry(0.28, 0.36).rotateX(-Math.PI / 2), pap); pp.position.set(56 + L.rnd() * 16, y + 0.015 + i * 0.0005, -38 - L.rnd() * 20); pp.rotation.y = L.rnd() * 3; g.add(pp); }
    void pap;
  }
  function attic(K, g, W, KG) {
    const A = H.art.attic, y = A.y;
    floor(g, A.x0, A.x1, A.z0, A.z1, y, L.boards(), 2.5);
    // the trapdoor (opens when the great clock is wound); the slide's dark mouth under it
    { const T0 = H.art.trap; const hole = new T.Mesh(new T.PlaneGeometry(2.0, 2.0).rotateX(-Math.PI / 2), K3D.flat('#030206')); hole.position.set(T0.x, y + 0.016, T0.z); g.add(hole);
      const fr = box(g, 2.3, 0.08, 2.3, T0.x, y + 0.04, T0.z, L.wood('#2a160e'), { inkW: 0.4 }); void fr;
      const tg = new T.Group(); tg.position.set(T0.x - 1.0, y + 0.08, T0.z); tg.userData.live = true; g.add(tg); box(tg, 2.0, 0.08, 2.0, 1.0, 0, 0, L.wood('#4a3020'), { inkW: 0.5 }); box(tg, 0.2, 0.04, 0.4, 1.7, 0.06, 0, L.FIG.brass(), { ink: false });
      const glow = new T.Mesh(new T.PlaneGeometry(1.9, 1.9).rotateX(-Math.PI / 2), fl('#b070ff', 0.9, { map: L.poolTex(), transparent: true, opacity: 0, depthWrite: false, add: true })); glow.position.set(T0.x, y + 0.03, T0.z); glow.userData.live = true; g.add(glow);
      R.trap = { tg, glow }; }
    // the dust-sheeted furniture (some of the attic's Sheets are among them), trunks, a dressmaker's dummy
    for (const s of H.solids.filter(q => q.id === 'dust')) dustSheet(g, s.x, y, s.z, s.w, s.y1 - s.y0, s.d);
    for (const [x, z, r] of [[56.4, -60.0 + 2.2, 0.1], [72.4, -45, 0.3], [62.4, -37.2, -0.2]]) { box(g, 1.3, 0.7, 0.8, x, y + 0.35, z, L.wood('#5a3a22'), { ry: r, inkW: 0.6 }); box(g, 1.34, 0.08, 0.84, x, y + 0.72, z, L.FIG.brass(), { ry: r, ink: false }); }
    { const dm = new T.Group(); dm.position.set(72.6, y, -52.2); g.add(dm); cyl(dm, 0.02, 0.02, 1.1, 0, 0.55, 0, tc('#2a2a2a'), { ink: false }); ball(dm, 0.3, 0, 1.4, 0, tc('#c8b8a0'), { sc: [1, 1.4, 0.8] }); cyl(dm, 0.25, 0.4, 0.2, 0, 0.1, 0, tc('#2a2a2a')); }
    // spare spook parts on a shelf: sheet-ghost heads, a helmet, a box of keys
    { box(g, 0.5, 0.06, 4, 73.6, y + 1.6, -41, L.wood('#4a2e1e'), { inkW: 0.3 }); for (let i = 0; i < 4; i++) ball(g, 0.2, 73.6, y + 1.85, -42.6 + i * 1.0, i === 2 ? L.M('steel2', () => K3D.toon('#a7afc4')) : tc('#ece8f2'), { sc: [1, 1.2, 1] });
      box(g, 0.6, 0.3, 0.5, 72.9, y + 0.15, -38.6, L.wood('#7a5a34'), { inkW: 0.4 }); for (let i = 0; i < 5; i++) { const k = L.FIG.windKey(0.5); k.position.set(72.7 + i * 0.1, y + 0.35, -38.6); k.rotation.set(L.rnd() * 3, L.rnd() * 3, 0); g.add(k); } }
    atticClutter(K, g, y);
    // the machinery along the north wall: the whole attraction runs from here (gears turn, belts run, the great clock)
    { const mg = new T.Group(); mg.position.set(64, y, -61.1); g.add(mg); const ir = L.iron(), br = L.FIG.brass();
      box(mg, 18, 3.6, 1.4, 0, 1.8, 0, tc('#2a2832', { emissive: '#0a0a10', emissiveIntensity: 0.5 }), { inkW: 0.8 });
      for (let i = 0; i < 12; i++) box(mg, 0.06, 3.4, 0.06, -8.4 + i * 1.5, 1.8, 0.72, br, { ink: false });
      for (const [x, yy, r, sp] of [[-6.5, 2.4, 0.9, 0.6], [-4.6, 1.4, 0.55, -1.0], [-2.0, 2.6, 0.7, 0.8], [2.4, 2.2, 1.0, -0.5], [4.6, 1.2, 0.5, 1.1], [7.2, 2.6, 0.75, -0.7]]) {
        const gg = new T.Group(); gg.position.set(x, yy, 0.78); gg.userData.live = true; mg.add(gg);
        const gear = L.mk(new T.CylinderGeometry(r, r, 0.12, 20).rotateX(Math.PI / 2), br, { ink: L.INK, inkW: 0.5 }); gg.add(gear);
        for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; const tooth = L.mk(new T.BoxGeometry(0.14, 0.18, 0.12), br, { ink: false }); tooth.position.set(Math.cos(a) * (r + 0.06), Math.sin(a) * (r + 0.06), 0); tooth.rotation.z = a; gg.add(tooth); }
        for (let k = 0; k < 4; k++) { const sp2 = L.mk(new T.BoxGeometry(r * 1.8, 0.08, 0.14), ir, { ink: false }); sp2.rotation.z = k * Math.PI / 4; gg.add(sp2); }
        R.gears.push({ g: gg, sp });
      }
      for (const [x0, x1, yy] of [[-6.5, -2.0, 3.3], [2.4, 7.2, 3.2]]) { const belt = box(mg, x1 - x0, 0.08, 0.1, (x0 + x1) / 2, yy, 0.86, tc('#3a2a1a'), { ink: false }); void belt; }
      for (let i = 0; i < 6; i++) { cyl(mg, 0.03, 0.03, 1.4, -1 + i * 0.6, 0.6, 0.9, ir, { ink: false, seg: 6, rz: (i % 2 ? 0.4 : -0.3) }); ball(mg, 0.07, -1 + i * 0.6 + (i % 2 ? -0.27 : 0.2), 1.25, 0.9, tc(['#c83a3a', '#3a3ac8'][i % 2]), { ink: false }); }
      for (let i = 0; i < 10; i++) { const l = ball(mg, 0.05, -8 + i * 0.3, 0.6, 0.74, fl(['#ff4a4a', '#4aff8a', '#ffd24a'][i % 3], 2.2), { ink: false }); l.userData.live = true; R.blinks.push({ m: l, ph: i * 0.7 }); }
      const lbl = new T.Mesh(new T.PlaneGeometry(3.4, 0.5), K3D.toon('#ffffff', { map: tex('machLbl', 256, 40, (c, w, h) => { c.fillStyle = '#1a1612'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8c870'; c.font = '700 20px "DejaVu Serif", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SPOOK MANOR  -  MAIN WORKS', w / 2, h / 2 + 1); }) })); lbl.position.set(-1.8, 3.4, 0.72); mg.add(lbl);
      // cables up into the dark roof
      for (let i = 0; i < 7; i++) cyl(mg, 0.03, 0.03, 3.4, -7 + i * 2.3, 5.2, 0.4, tc('#14121a'), { ink: false, seg: 4 });
    }
    // the great clock: a big face on the works, its key (Bo winds it: the trapdoor opens)
    { const gc = H.winders.find(w => w.id === 'greatClock'); const cg = new T.Group(); cg.position.set(gc.at[0], gc.at[1], gc.at[2] + 0.75); g.add(cg);
      const face = new T.Mesh(new T.CircleGeometry(1.1, 40), L.M('greatFace', () => K3D.toon('#ffffff', { map: tex('greatFace', 256, 256, (c, w, h) => { c.fillStyle = '#f0e2b8'; c.beginPath(); c.arc(128, 128, 126, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#3a2a1a'; c.lineWidth = 8; c.stroke(); c.fillStyle = '#2a1e12'; c.font = '700 26px "DejaVu Serif", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; ['XII', 'III', 'VI', 'IX'].forEach((r, i) => { const a = i / 4 * Math.PI * 2 - Math.PI / 2; c.fillText(r, 128 + Math.cos(a) * 94, 128 + Math.sin(a) * 94); }); c.fillStyle = 'rgba(60,40,20,0.2)'; c.beginPath(); c.arc(150, 110, 70, 0, Math.PI * 2); c.fill(); }), emissive: '#2a2010', emissiveIntensity: 0.6 }))); cg.add(face);
      const rim = L.mk(new T.TorusGeometry(1.12, 0.08, 8, 40), L.FIG.brass(), { ink: L.INK, inkW: 0.6 }); cg.add(rim);
      const hands = []; for (const [l, w2] of [[0.6, 0.06], [0.9, 0.04]]) { const hnd = new T.Mesh(new T.BoxGeometry(w2, l, 0.02).translate(0, l / 2, 0), K3D.flat('#1a120a')); hnd.position.z = 0.03; hnd.userData.live = true; cg.add(hnd); hands.push(hnd); }
      const glow = L.sprite(K, cg, 0, 0, 0.2, 3.2, '#ffd27a', 0);
      R.great = { hands, glow }; winder(K, g, Object.assign({}, gc, { y: y }), 'GREAT CLOCK', 1.0); }
    // a round window in the east wall (the moon, the park's lights far off), hanging bulbs, webs, the roof's struts
    { const wg = new T.Group(); wg.position.set(73.78, y + 2.8, -48); wg.rotation.y = -Math.PI / 2; W('attE').add(wg); const gl = new T.Mesh(new T.CircleGeometry(0.9, 24), K3D.flat('#ffffff', { map: tex('roundWin', 128, 128, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a3070'); gr.addColorStop(1, '#5a4a8a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(240,240,255,0.95)'; c.beginPath(); c.arc(84, 40, 14, 0, Math.PI * 2); c.fill(); for (let i = 0; i < 14; i++) { c.fillStyle = ['#ff6a5a', '#ffd24a', '#7ae0a0', '#ff9ad6'][i % 4]; c.fillRect(8 + i * 8, 100 + Math.sin(i) * 4, 3, 3); } }) })); gl.position.z = 0.02; wg.add(gl); const rim = L.mk(new T.TorusGeometry(0.92, 0.1, 6, 24), L.wood('#2a160e'), { ink: L.INK, inkW: 0.5 }); wg.add(rim); for (const r of [0, Math.PI / 2]) { const bar = box(wg, 1.8, 0.06, 0.04, 0, 0, 0.04, L.wood('#2a160e'), { ink: false }); bar.rotation.z = r; } }
    for (const [x, z] of [[60, -44], [66, -54], [70, -42]]) bulb(K, g, x, y + 3.4, z, 1.0, '#ffd08a');
    for (let x = 56; x < 74; x += 4) for (const sz of [-1, 1]) box(g, 0.2, 2.6, 0.2, x, y + 3.6, -49 + sz * 12.6, L.wood('#3a2418'), { inkW: 0.4, rx: sz * 0.5 });
    for (const [x, z, dx, dz] of [[54.2, -61.8, 1, 1], [73.8, -36.2, -1, -1], [73.8, -61.8, -1, 1]]) L.web(K, g, x, y + 4.2, z, dx, dz, 1.6);
    void KG;
  }

  function ballroom(K, g, W, KG, B) {
    const Ba = H.art.ballroom;
    const star = tex('parquetStar', 512, 512, (c, w, h) => {
      for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { c.fillStyle = (i + j) % 2 ? '#6a4228' : '#8a5a34'; c.save(); c.translate(i * 32 + 16, j * 32 + 16); c.rotate((i + j) % 2 ? 0 : Math.PI / 2); for (let k = 0; k < 4; k++) c.fillRect(-16, -16 + k * 8, 32, 7); c.restore(); }
      c.save(); c.translate(w / 2, h / 2); for (let k = 0; k < 8; k++) { c.rotate(Math.PI / 4); c.fillStyle = k % 2 ? 'rgba(220,190,120,0.8)' : 'rgba(60,30,20,0.8)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(30, 200); c.lineTo(-30, 200); c.closePath(); c.fill(); } c.restore();
      c.strokeStyle = 'rgba(220,190,120,0.8)'; c.lineWidth = 6; c.beginPath(); c.arc(w / 2, h / 2, 220, 0, Math.PI * 2); c.stroke();
      L.stains(c, w, h * 2, 6, 'rgba(20,10,5,0.3)');
    });
    floor(g, Ba.x0, Ba.x1, Ba.z0, Ba.z1, 0, star, 36);
    { const gl = new T.Mesh(new T.PlaneGeometry(36, 32).rotateX(-Math.PI / 2), fl('#ffe0b0', 0.12, { map: L.poolTex(), transparent: true, depthWrite: false, add: true })); gl.position.set(12, 0.03, -88); g.add(gl); }
    // tall mirrors along both long walls, pilasters, sconces; the chute the slide drops into
    for (let z = -100; z < -75; z += 5) { bigMirror(K, W('balE'), 29.75, 3.0, z, -Math.PI / 2, 1.8, 3.6); bigMirror(K, W('balW'), -5.75, 3.0, z - 2.5, Math.PI / 2, 1.8, 3.6); }
    for (let z = -102.5; z < -73; z += 5) for (const [x, id, yaw] of [[29.75, 'balE', -Math.PI / 2], [-5.75, 'balW', Math.PI / 2]]) { const pg = new T.Group(); pg.position.set(x, 0, z + (x < 0 ? 2.5 : 0)); pg.rotation.y = yaw; W(id).add(pg); box(pg, 0.6, 6.8, 0.25, 0, 3.4, 0.1, tc('#e8dcc0'), { inkW: 0.5 }); box(pg, 0.8, 0.3, 0.35, 0, 6.6, 0.12, L.FIG.brass(), { inkW: 0.4 }); L.sconce(K, pg, 0, 2.4, 0.25, 0, null); }
    for (let x = -2; x < 29; x += 5) L.sconce(K, W('balN'), x, 2.6, -103.78, 0, null);
    { const ch = new T.Group(); ch.position.set(-5.2, 0.9, -75.2); g.add(ch); const tube = L.mk(new T.CylinderGeometry(0.9, 0.9, 2.2, 20, 1, true, -Math.PI * 0.5, Math.PI).rotateZ(Math.PI / 2), L.M('chuteM', () => K3D.toon('#7a3a8a', { side: T.DoubleSide, emissive: '#1a0a20', emissiveIntensity: 0.5 })), { ink: L.INK, inkW: 0.6 }); tube.rotation.x = Math.PI / 2; tube.position.y = 0.4; ch.add(tube); box(ch, 1.2, 0.06, 2.0, 0.5, -0.86, 0, L.M('chuteM', () => K3D.toon('#7a3a8a', { side: T.DoubleSide })), { ink: false, rz: -0.25 }); L.sprite(K, ch, 0.4, 0.3, 0, 2.4, '#b070ff', 0.25); }
    // the bandstand: a low stage with the clockwork orchestra, music stands, a gramophone horn
    { const bs = new T.Group(); bs.position.set(-3.3, 0, -101.3); g.add(bs); box(bs, 5.4, 0.6, 5.4, 0, 0.3, 0, L.wood('#4a2a1a'), { inkW: 0.6 }); for (let i = 0; i < 8; i++) box(bs, 0.08, 0.5, 0.08, -2.6 + i * 0.74, 0.85, 2.65, L.FIG.brass(), { ink: false }); box(bs, 5.4, 0.06, 0.08, 0, 1.1, 2.65, L.FIG.brass(), { ink: false });
      for (const [x, z, k] of [[-1.4, -1, 0], [0.4, -1.6, 1], [1.6, 0.2, 0], [-0.8, 0.8, 1]]) { const m2 = L.FIG.dancer(k); m2.position.set(x, 0.6, z); m2.rotation.y = 0.7; m2.scale.setScalar(0.9); bs.add(m2); m2.userData.set({ state: 'done' }, 0, 0); cyl(bs, 0.02, 0.02, 1.0, x + 0.3, 1.1, z + 0.4, L.FIG.brass(), { ink: false, seg: 4 }); box(bs, 0.4, 0.3, 0.02, x + 0.3, 1.6, z + 0.4, tc('#efe6d0'), { ink: false, rx: -0.4 }); }
      const horn = L.mk(new T.ConeGeometry(0.5, 0.9, 16, 1, true).rotateZ(-Math.PI / 2), L.FIG.brass(), { ink: L.INK, inkW: 0.5 }); horn.position.set(1.8, 1.4, -1.8); horn.rotation.y = 0.6; bs.add(horn); box(bs, 0.5, 0.4, 0.5, 1.4, 0.8, -1.6, L.wood('#3a2214'), { inkW: 0.4 }); }
    // the great chandelier, down on the floor in a heap of crystals (it fell); its chain hanging
    { const ch = L.chandelier(K, g, 14, 0.45, -88.6, null); for (const f of ch.flames) f.visible = false; for (const h of ch.halos) h.visible = false; ch.cg.scale.setScalar(1.6); ch.cg.rotation.z = 0.25; ch.cg.children[0].visible = false;
      for (let i = 0; i < 22; i++) { const a = L.rnd() * Math.PI * 2, r = 1 + L.rnd() * 2.6; const cr = new T.Mesh(K3D.geo('pm-drop', () => new T.OctahedronGeometry(0.05, 0).scale(1, 2, 1)), L.M('crystal', () => K3D.toon('#d8e8ff', { emissive: '#3a4a6a', emissiveIntensity: 0.6 }))); cr.position.set(14 + Math.cos(a) * r, 0.05, -88.6 + Math.sin(a) * r); cr.rotation.set(Math.PI / 2, L.rnd() * 3, 0); g.add(cr); }
      cyl(g, 0.04, 0.04, 6.6, 14, 4.0, -88.6, L.FIG.brass(), { ink: false, seg: 5 }); }
    // the exit: grand double doors (the rules' exitDoor), EXIT in neon over them, Grimsby's place before them
    { const ex = PARK.neon(KG, 'EXIT', { w: 3.2, h: 0.9, col: '#5affb0', x: 12, y: 5.4, z: -103.7, k: 1.4, fs: 48 }); void ex; R.exitSign = ex; }
    // garlands of black streamers and dead balloons along the walls; a tea table of cups; a clock in each corner
    for (const z of [-96, -84]) PARK.lanterns(KG, B, [-5.6, 6.2, z], [29.6, 6.2, z], { sag: 1.6, n: 14 });
    for (let i = 0; i < 6; i++) { const bl = ball(g, 0.3, 26 + (i % 3) * 0.6, 0.3 + (i > 2 ? 0.1 : 0), -101.6 + (i % 2) * 0.7, tc(['#5a2a3a', '#3a2a5a', '#2a3a3a'][i % 3]), { sc: [1, 0.7, 1] }); void bl; }
    { const tt = new T.Group(); tt.position.set(26.6, 0, -76.4); g.add(tt); cyl(tt, 1.0, 1.0, 0.06, 0, 0.9, 0, tc('#e8e2d8'), { seg: 20 }); cyl(tt, 0.08, 0.2, 0.9, 0, 0.45, 0, L.wood('#3a2214'), { seg: 8 }); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; cyl(tt, 0.08, 0.06, 0.1, Math.cos(a) * 0.6, 0.98, Math.sin(a) * 0.6, tc('#f2eee6'), { seg: 10, inkW: 0.3 }); } L.candelabra(K, tt, 0, 0.93, 0, null); }
    for (const [x, z, dx, dz] of [[-5.8, -103.8, 1, 1], [29.8, -103.8, -1, 1], [-5.8, -72.2, 1, -1], [29.8, -72.2, -1, -1]]) L.web(K, g, x, 6.6, z, dx, dz, 2.0);
    // out through the doors: the park, bright and cheerful at last (paving, bulbs, lamps, a THANK YOU arch, balloons)
    { const pv = PARK.paving(); const pf = floor(g, -6, 30, -118, -104.2, 0, pv, 6); void pf;
      for (const x of [2, 22]) { const lp = PARK.lamp(KG, B, { h: 3.6 }); lp.position.set(x, 0, -110); }
      B.line([-5, 3.4, -106], [29, 3.4, -106], 0.6, '#ffd24a', { sag: 0.4, speed: 2 }); B.line([-5, 3.8, -112], [29, 3.8, -112], 0.6, '#ff6a8a', { sag: 0.5, speed: 2.5 });
      const arch = PARK.neon(KG, 'THANK YOU FOR VISITING', { w: 9, h: 1.2, col: '#ffd24a', x: 12, y: 4.6, z: -114, k: 1.6, fs: 40 }); void arch;
      for (const sx of [-1, 1]) cyl(g, 0.18, 0.2, 4.4, 12 + sx * 4.7, 2.2, -114, tc('#d8d0e8'), { seg: 10 });
      PARK.balloons(KG, 4, 1.6, -109, 6); PARK.balloons(KG, 20, 1.6, -111, 5);
      PARK.bench(KG, 6, -116.6, 0); PARK.bench(KG, 18, -116.6, 0);
      R.parkGlow = L.sprite(K, g, 12, 2.4, -110, 20, '#ffe0a0', 0.0); }
  }

  /* =============================== build =============================== */
  let SC_ = null;
  function build(K, B, SC, st) {
    L = SC.LIB; T = L.T; SC_ = SC;
    R = SC.R = { winders: [], springs: {}, bells: [], swing: [], steam: [], curtains: [], lamps: [], gears: [], blinks: [], mirrors: [], cages: {}, cleaver: null, fridge: null };
    const W = id => SC.walls[id].full;
    const groups = {};
    for (const id of ['S2', 'S3', 'S4a', 'S4b']) { const g = new T.Group(); g.userData.live = true; K.add(g); groups[id] = g; SC.regions[id] = g; }
    // the dark backstage round each floor (the dark ride's black void: the rooms stand on it)
    backstage(groups.S2, -16, 44, -34, -9, 0);
    backstage(groups.S3, -10, 52, -64, -34, 0);
    backstage(groups.S4a, 46, 78, -66, -32, 0); floor(groups.S4a, 46, 78, -66, -32, 2.97, K3D.paint('pmr-void', 4, 4, c => { c.fillStyle = '#08070c'; c.fillRect(0, 0, 4, 4); }), 4);
    backstage(groups.S4b, -10, 34, -122, -68, 0);
    // past the backstage: one great dark floor under each floor's group, so no sky shows past the outer walls
    for (const [id, cx, cz] of [['S2', 14, -22], ['S3', 22, -50], ['S4a', 62, -50], ['S4b', 12, -96]]) {
      const v = new T.Mesh(new T.PlaneGeometry(260, 260).rotateX(-Math.PI / 2), L.M('voidM', () => K3D.flat('#07060b'))); v.position.set(cx, -0.08, cz); groups[id].add(v); }
    passage(K, groups.S2, W); dining(K, groups.S2, W); kitchen(K, groups.S2, W);
    gallery(K, groups.S3, W); library(K, groups.S3, W, into(K, groups.S3)); nursery(K, groups.S3, W); bedroom(K, groups.S3, W);
    stairsUp(K, groups.S4a); attic(K, groups.S4a, W, into(K, groups.S4a));
    ballroom(K, groups.S4b, W, into(K, groups.S4b), B);
    // more eyes in the dark and rats in the far rooms
    void st;
  }

  /* =============================== every frame =============================== */
  function update(K, st, dt, SC, o) {
    if (!R) return;
    const t = o.t, shown = o.shown;
    // winders: needles count down, cranks turn while Bo winds, a glow while wound
    for (const wd of R.winders) {
      const wn = st.wound.find(w => w.def === wd.w), winding = st.keyHold > 0 && st.keyTgt === wd.w;
      if (winding) wd.spin += dt * 8;
      wd.crank.rotation.z = -wd.spin;
      const ready = wd.w.ride && st.rideReady[wd.w.ride];
      wd.needle.rotation.z = wn && wd.w.dur < 999 ? -(wn.t / wn.def.dur) * Math.PI * 1.8 : ready ? -Math.PI * 1.8 : 0;
      wd.gl.material.color.copy(L.hot('#ffd27a', winding ? 0.6 : wn || ready ? 0.25 : 0.08 + 0.06 * Math.sin(t * 3)));
    }
    // the jack-o-springs: up with a jolt, then a wobble, then they settle part way
    for (const id in R.springs) {
      const s = st.sprung[id] != null ? st.t - st.sprung[id] : -1;
      const u = s < 0 ? 0 : s < 0.25 ? s / 0.25 : Math.max(0.55, 1 - (s - 0.25) * 0.15) + Math.sin(s * 14) * Math.exp(-s * 2) * 0.25;
      R.springs[id](id === 'pans' ? (s < 0 ? 0 : Math.exp(-s * 0.8)) : u, t, Math.max(0, s));
    }
    // the cleaver: raised, a warning lift and shake, then down across the lane
    if (R.cleaver && st.cleaver) {
      const cv = st.cleaver, C = H.cleaver, per = C.up + C.warn + C.down, u = (cv.t % per);
      let a = -1.45;
      if (cv.st === 'warn') a = -1.45 - 0.25 * Math.min(1, (u - C.up) / 0.15) + Math.sin(t * 50) * 0.03;
      else if (cv.st === 'down') { const k = Math.min(1, (u - C.up - C.warn) / 0.08); a = -1.7 + k * 1.72; }
      if (!st.fired.kitIn) a = -1.45;
      R.cleaver.bl.rotation.x = -a;   // positive x-rotation lifts the blade's far (-z) end
      R.cleaver.glint.material.opacity = cv.st === 'warn' ? 0.8 : 0;
    }
    // the fridge (icebox): its door swings open and a cold light spills while wound
    if (R.fridge) { const w = st.wound.find(x => x.def.id === 'fridge'), k = w ? Math.min(1, w.t / 0.6, (H.winders.find(x => x.id === 'fridge').dur - w.t) / 0.4 + 0.0001) : 0; R.fridge.door.rotation.y = -k * 1.6; R.fridge.glow.material.opacity = k * 0.7; R.fridge.pool.material.opacity = k * 0.9; }
    // lamps: wound, the shade glows and a pool of light lies under it (a flicker as they run down)
    for (const lp of R.lamps) { const w = st.wound.find(x => x.def === lp.w), k = w ? (w.t < 3 ? (Math.sin(t * 20) > 0 ? 0.6 : 1) : 1) : 0; lp.glow.material.opacity = k * 0.8; lp.pool.material.opacity = k; lp.shade.material = k ? L.M('shadeOn', () => K3D.flat(L.hot('#ffe0a0', 1.6))) : L.M('shadeOff', () => K3D.toon('#d8b070')); }
    // the music box: lid open and the dancer turning while wound; the key unwinds
    if (R.musicBox) { const w = st.wound.find(x => x.def.id === 'musicbox'), k = w ? 1 : 0; R.musicBox.lid.rotation.x = -k * 1.6; R.musicBox.bal.visible = k > 0; R.musicBox.bal.rotation.y += dt * 3 * k; R.musicBox.key.rotation.x += dt * 2 * k; }
    // hiding places: the curtains fall shut, the chest lid down to a crack
    for (const c of R.curtains) { const shut = st.hidden === c.id ? 1 : 0; for (const q of c.cur) { q.cg.rotation.y = q.sx * (1 - shut) * 0.9; q.cg.scale.x = 1; } }
    if (R.chest) R.chest.rotation.x = st.hidden === 'chest' ? -0.12 : -(PARKMANOR_SPOOKS.butlerNear(st) ? 0.9 + Math.sin(t * 5) * 0.1 : 0);
    // the dumbwaiter cages: the gate shuts and the cage rises during the ride; the top one waits with its gate open
    { const rd = st.ride && st.ride.id === 'dumb' ? Math.min(1, st.ride.t / H.rides.dumb.dur) : 0, rdy = st.rideReady.dumb ? 1 : 0;
      if (R.cages.dumbDown) { R.cages.dumbDown.gate.rotation.y = rd > 0.15 ? 0 : -rdy * 1.4; R.cages.dumbDown.cg.position.y = Math.max(0, rd - 0.25) / 0.75 * 3.4; }
      if (R.cages.dumbUp) R.cages.dumbUp.gate.rotation.y = -1.4; }
    // the trapdoor: opens on the great clock, a purple glow from the slide below
    if (R.trap) { const op = st.rideReady.slide ? 1 : 0; R.trap.tg.rotation.z = op * 1.9; R.trap.glow.material.opacity = op * (0.7 + Math.sin(t * 3) * 0.2); }
    if (R.great) { R.great.hands[0].rotation.z = -t * (st.rideReady.slide ? 2 : 0.05); R.great.hands[1].rotation.z = -t * (st.rideReady.slide ? 9 : 0.4); R.great.glow.material.opacity = st.rideReady.slide ? 0.5 : 0; }
    for (const gg of R.gears) gg.g.rotation.z += dt * gg.sp * (st.rideReady.slide ? 3 : 1);
    for (const b of R.blinks) b.m.visible = Math.sin(t * 2.5 + b.ph) > -0.2;
    // the bells jingle as the pair pass the bell board; the chandelier sways; steam rises; the horse rocks; the mobile turns
    for (const b of R.bells) b.m.rotation.z = Math.sin(t * 9 + b.ph) * 0.25 * (st.zone === 'passage' ? 1 : 0.1);
    for (const s of R.swing) s.g.rotation.z = Math.sin(t * 0.6 + s.ph) * (s.amp || 0.03);
    if (R.train) { const a = st.zone === 'attic' ? t * 0.7 : 0; R.train.position.set(Math.cos(a) * 1.4 * 1.34, 0, Math.sin(a) * 1.4 * 0.84); R.train.rotation.y = -a - Math.PI / 2; }
    if (R.rocker) R.rocker.rotation.x = Math.sin(t * 1.3) * 0.12 * (st.zone === 'attic' ? 1 : 0);
    if (R.bird) { R.bird.rotation.y = Math.sin(t * 0.8) * 0.8; R.bird.position.y = 0.24 + Math.abs(Math.sin(t * 6)) * 0.03; }
    for (const s of R.steam) { const k = ((t * 0.25 + s.ph) % 1); s.m.position.y = 1.8 + k * 1.4; s.m.material.opacity = 0.12 * Math.sin(k * Math.PI); s.m.position.x = s.x + Math.sin(t + s.ph) * 0.1; }
    if (R.horse) R.horse.rotation.x = Math.sin(t * 1.7) * 0.18 * (st.zone === 'nursery' ? 1 : 0.4);
    if (R.mobile) R.mobile.rotation.y += dt * 0.4;
    if (R.globe) R.globe.rotation.y += dt * 0.15;
    for (const m of R.mirrors) m.ghost.material.opacity = Math.max(0, Math.sin(t * 0.21 + m.ph) - 0.85) * 4;
    // after Grimsby bows, the park outside glows through the open doors
    if (R.parkGlow) R.parkGlow.material.opacity = st.fired.bossDone ? 0.35 : 0;
    // the stage lights per room (two coloured spots), and the wound light's real lamp
    const ZL = { dining: [[39, 3.8, -16.6], [27, 0, -26], [14.6, 3.8, -16.6], [24, 0, -20]], kitchen: [[-5.5, 3.8, -16.6], [3, 0, -23], [13.4, 3.8, -16.6], [6, 0, -27]],
      gallery: [[15.4, 3.6, -42.4], [6, 0, -46], [-5.4, 3.6, -42.4], [4, 0, -47]], library: [[33.4, 4.6, -36.6], [24, 0, -52], [16.6, 4.6, -36.6], [26, 0, -44]], organ: [[15.6, 4.6, -52.4], [13, 0, -56], [15.6, 4.6, -57.6], [13, 1, -53]],
      nursery: [[47.4, 3.6, -48.6], [40, 0, -56], [34.6, 3.6, -48.6], [44, 0, -58]], bedroom: [[47.4, 3.6, -36.6], [37, 0, -42], [34.6, 3.6, -36.6], [44, 0, -44]],
      attic: [[73.4, 7.0, -36.6], [64, 3, -52], [54.6, 7.0, -36.6], [66, 3, -58]], ballroom: [[29.4, 6.6, -72.6], [14, 0, -90], [-5.4, 6.6, -72.6], [10, 0, -96]], passage: [[33, 3.4, -15.6], [31.8, 0, -8], [30.6, 3.4, -3], [31.8, 0, -12]] };
    const LL = SC.L, zl = ZL[st.zone];
    if (zl) {
      LL.green.position.set(...zl[0]); LL.green.target.position.set(...zl[1]); LL.purple.position.set(...zl[2]); LL.purple.target.position.set(...zl[3]);
      LL.green.intensity = 7 * (0.8 + 0.2 * Math.sin(t * 2.3)); LL.purple.intensity = 7 * (0.8 + 0.2 * Math.sin(t * 1.9 + 2));
      LL.green.color.set(st.zone === 'nursery' ? '#ff7ab0' : st.zone === 'kitchen' ? '#ff6a3a' : '#3aff9a'); LL.purple.color.set(st.zone === 'attic' ? '#5a8aff' : '#b070ff');
    } else { LL.green.color.set('#3aff9a'); LL.purple.color.set('#b070ff'); LL.green.position.set(7.0, 1.9, 5.0); LL.green.target.position.set(0, 0, -5); LL.purple.position.set(29.2, 1.9, -2.9); LL.purple.target.position.set(18, 0, -4.8); }
    // (the chandelier light follows the wound light in this zone: a lamp's pool, the fridge's cold, the ballroom's glow)
    const zn = H.zones.find(z => z.id === st.zone);
    let wl = null; for (const w of st.wound) if (w.def.light && w.def.id !== 'chand' && zn && shown(o.regAt ? o.regAt(w.def.x, w.def.z) : 'S1')) { const lx = w.def.light.rect ? (w.def.light.rect[0] + w.def.light.rect[1]) / 2 : w.def.light.x, lz = w.def.light.rect ? (w.def.light.rect[2] + w.def.light.rect[3]) / 2 : w.def.light.z; if (H.zoneAt(lx, lz) === zn) wl = { w, lx, lz }; }
    if (wl && !st.wound.some(w => w.def.id === 'chand')) { LL.chand.position.set(wl.lx, (wl.w.def.at ? wl.w.def.at[1] : 2.6) + 0.2, wl.lz); LL.chand.color.set(wl.w.def.id === 'fridge' ? '#c8e8ff' : '#ffc070'); LL.chand.intensity = 8 * (wl.w.t < 3 && Math.sin(t * 20) > 0 ? 0.5 : 1); LL.chand.distance = 9; }
    else if (!st.wound.some(w => w.def.id === 'chand')) { LL.chand.position.set(...H.winders[0].at); LL.chand.color.set('#ffc070'); LL.chand.distance = 22; }
    if (st.fired.bossDone && (st.zone === 'exit' || st.zone === 'ballroom')) { LL.chand.position.set(12, 4, -110); LL.chand.color.set('#ffe0a0'); LL.chand.intensity = 18; LL.chand.distance = 26; }
  }

  return { build, update };
})();
