/* Pip & Bo - 42-1 Runaway Coaster: the 3D scene. Starlight Park at midnight (built with the shared park kit, PARK), the
   Comet's track (steel rails, sleepers, supports and thousands of bulbs, the chain on the lift hills), the station and
   its clock tower, everything on the track that the rules count (arrow boards, low boards, spring signs and gaps, camera
   signs, photo arches, switches, tickets, loudspeakers), the camera, and the flat things drawn over the picture.
   Loaded on demand with the 3D kit. Display only: it reads the rules' state (G.mst) and never changes it.

   PARKCOASTER_SCENE.build(K, st)   once per scene
   PARKCOASTER_SCENE.update(K, st, dt)   every drawn frame: the train, riders, tickets, camera, the park's lights
   PARKCOASTER_SCENE.drawTop(st)    the loudspeaker's bubbles, ticket sparkles, "Rattle!", prompts, the photo flash
   PARKCOASTER_SCENE.camOverride = { eye, at, fov }   the look-shot tools hold the camera still with this */
'use strict';

const PARKCOASTER_SCENE = (function () {
  const T = K3D.T, INK = '#1a1530';
  const PR = PARKCOASTER_ROUTE, R = PR.R, L = PR.lists;
  const v3 = (a) => new T.Vector3(a[0], a[1], a[2]);
  const SC = { scr: [null, null] };
  let rnd = PARK.rnd;

  /* ---------- the track ---------- */
  // a piece of track along rail D from s0 to s1: two running rails, a box spine under them, sleepers, bulbs both sides
  function trackPiece(K, B, D, s0, s1, o = {}) {
    const g = new T.Group();
    const step = 1.0, n = Math.max(2, Math.ceil((s1 - s0) / step));
    const railPts = [[], []], spinePts = [];
    for (let i = 0; i <= n; i++) {
      const s = s0 + (s1 - s0) * i / n, f = D.at(s);
      for (const k of [0, 1]) railPts[k].push(v3(D.bankLocal(s, k ? 0.6 : -0.6, 0.0, f)));
      spinePts.push(v3(D.bankLocal(s, 0, -0.32, f)));
    }
    const railM = PARK.toonM(o.rail || '#d8d0e8'), spineM = PARK.toonM(o.spine || '#5a4f86');
    for (const k of [0, 1]) g.add(K3D.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(railPts[k]), n * 2, 0.075, 6), railM, { ink: INK, inkW: 0.6 }));
    g.add(K3D.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(spinePts), n * 2, 0.16, 6), spineM, { ink: INK, inkW: 0.8 }));
    K.add(g);
    // sleepers (instanced) every 0.8; yellow-striped ones before a gap
    const sl = [];
    for (let s = s0 + 0.4; s < s1; s += 0.8) sl.push(s);
    const im = new T.InstancedMesh(K3D.geo('pc-sleeper', () => new T.BoxGeometry(1.56, 0.1, 0.24)), PARK.toonM(o.sleeper || '#6a5a8a'), sl.length);
    const yel = sl.filter(s => o.warn && o.warn.some(([a, b]) => s > a && s < b));
    const imY = yel.length ? new T.InstancedMesh(K3D.geo('pc-sleeper', () => new T.BoxGeometry(1.56, 0.1, 0.24)), K3D.toon('#ffffff', { map: PARK.stripes('#ffd23a', '#2a2235', 8) }), yel.length) : null;
    const m4 = new T.Matrix4(), bx = new T.Vector3(), by = new T.Vector3(), bz = new T.Vector3();
    let ni = 0, yi = 0;
    for (const s of sl) {
      const f = D.at(s), p = v3(D.bankLocal(s, 0, -0.1, f));
      bx.set(...f.br); by.set(...f.bu); bz.set(-f.t[0], -f.t[1], -f.t[2]);
      m4.makeBasis(bx, by, bz).setPosition(p);
      if (imY && o.warn.some(([a, b]) => s > a && s < b)) imY.setMatrixAt(yi++, m4); else im.setMatrixAt(ni++, m4);
    }
    im.count = ni; K3D.ink(im, INK, 0.5); K.add(im);
    if (imY) { imY.count = yi; K3D.ink(imY, INK, 0.5); K.add(imY); }
    // bulbs both sides (a slow chase that runs the way the train goes)
    if (B && o.bulbs !== false) for (let s = s0 + 0.7; s < s1; s += o.bulbGap || 1.5) {
      const f = D.at(s);
      for (const k of [0, 1]) { const p = D.bankLocal(s, k ? 0.86 : -0.86, -0.05, f); B.add(p[0], p[1], p[2], o.bulbCols ? o.bulbCols[Math.floor(s / 1.5) % o.bulbCols.length] : (Math.floor(s / 1.5) % 4 === 0 ? '#ff8ab0' : '#ffe07a'), { size: 0.075, speed: 3.5, phase: -s * 0.35 }); }
    }
    return g;
  }
  // the steel supports under the track: a column (two legs where it is tall) to the ground every few units
  function supports(K, D, s0, s1, o = {}) {
    const cols = [];
    for (let s = s0 + 2; s < s1; s += o.gap || 5) {
      const f = D.at(s), p = D.bankLocal(s, 0, -0.45, f);
      if (p[1] < 1.6 || f.loop) continue;
      if (o.skip && o.skip(p, s)) continue;
      cols.push({ p, f });
    }
    const geo = K3D.geo('pc-col', () => new T.CylinderGeometry(0.16, 0.2, 1, 8).translate(0, 0.5, 0));
    const im = new T.InstancedMesh(geo, PARK.toonM(o.col || '#5a4f86'), cols.length * 2);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3();
    let k = 0;
    for (const c of cols) {
      const h = c.p[1];
      if (h > 9) {
        // an A of two legs across the track
        for (const sx of [-1, 1]) {
          const foot = new T.Vector3(c.p[0] + c.f.r[0] * sx * h * 0.18, 0, c.p[2] + c.f.r[2] * sx * h * 0.18), top = v3(c.p);
          const d = top.clone().sub(foot), len = d.length();
          q.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
          m4.compose(foot, q, sc.set(1, len, 1)); im.setMatrixAt(k++, m4);
        }
      } else { m4.compose(ps.set(c.p[0], 0, c.p[2]), q.identity(), sc.set(1, h, 1)); im.setMatrixAt(k++, m4); }
    }
    im.count = k; K3D.ink(im, INK, 0.6); K.add(im);
    return im;
  }
  // the lift hill's chain: a dark strip between the rails whose links scroll up
  function chain(K, a, b) {
    const n = Math.ceil((b - a) / 1), pos = [], uv = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const s = a + (b - a) * i / n, f = R.at(s);
      for (const k of [0, 1]) { const p = R.bankLocal(s, k ? 0.16 : -0.16, 0.01, f); pos.push(...p); uv.push(k, s / 0.5); }
      if (i) { const j = i * 2; idx.push(j - 2, j - 1, j, j - 1, j + 1, j); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const tex = K3D.paint('pc-chain', 32, 64, (c, w, h) => { c.fillStyle = '#1a1626'; c.fillRect(0, 0, w, h); c.strokeStyle = '#8a86a0'; c.lineWidth = 4; c.strokeRect(6, 4, w - 12, h / 2 - 6); c.strokeStyle = '#6a6680'; c.strokeRect(10, h / 2 + 2, w - 20, h / 2 - 6); }, { repeat: true });
    const m = new T.Mesh(g, K3D.toon('#ffffff', { map: tex, side: T.DoubleSide }));
    m.userData.live = true; K.add(m);
    return tex;
  }

  /* ---------- signs, boards and arches ---------- */
  const signTex = (kind) => K3D.paint('pc-sign|' + kind, 256, 256, (c, w, h) => {
    const chev = (n, col, x0) => { c.fillStyle = col; for (let i = 0; i < n; i++) { const x = x0 + i * 62; c.beginPath(); c.moveTo(x, 40); c.lineTo(x + 50, 128); c.lineTo(x, 216); c.lineTo(x + 28, 216); c.lineTo(x + 78, 128); c.lineTo(x + 28, 40); c.closePath(); c.fill(); } };
    if (kind === 'bend1') { c.fillStyle = '#2f6fc0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ffffff'; c.lineWidth = 12; c.strokeRect(8, 8, w - 16, h - 16); chev(1, '#ffffff', 90); }
    else if (kind === 'bend2') { c.fillStyle = '#ffc93a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a2235'; c.lineWidth = 12; c.strokeRect(8, 8, w - 16, h - 16); chev(2, '#2a2235', 58); }
    else if (kind === 'hazard') { for (let i = -8; i < 16; i++) { c.fillStyle = i % 2 ? '#ffd23a' : '#1a1626'; c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 32, 0); c.lineTo(i * 32 + 32 + h, h); c.lineTo(i * 32 + h, h); c.fill(); } }
    else if (kind === 'spring') {
      c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(128, 8); c.lineTo(248, 128); c.lineTo(128, 248); c.lineTo(8, 128); c.closePath(); c.fill();
      c.strokeStyle = '#1a1626'; c.lineWidth = 10; c.stroke();
      c.strokeStyle = '#1a1626'; c.lineWidth = 9; c.beginPath(); for (let i = 0; i <= 6; i++) { const y = 168 - i * 14; c.lineTo(i % 2 ? 150 : 106, y); } c.stroke();
      c.fillStyle = '#1a1626'; c.fillRect(96, 172, 64, 12); c.beginPath(); c.moveTo(128, 46); c.lineTo(156, 80); c.lineTo(100, 80); c.closePath(); c.fill();
    }
    else if (kind === 'camera') {
      c.fillStyle = '#ff5aa0'; c.beginPath(); c.arc(128, 128, 120, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 10; c.stroke();
      c.fillStyle = '#ffffff'; c.fillRect(56, 92, 144, 92); c.fillRect(96, 74, 50, 22); c.fillStyle = '#ff5aa0'; c.beginPath(); c.arc(128, 138, 30, 0, Math.PI * 2); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(128, 138, 16, 0, Math.PI * 2); c.fill();
      c.font = '900 26px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ffffff'; c.fillText('SMILE!', 128, 222);
    }
    else if (kind === 'mindhead') { for (let i = -8; i < 16; i++) { c.fillStyle = i % 2 ? '#ffd23a' : '#1a1626'; c.fillRect(i * 32, 0, 32, h); } c.fillStyle = '#ffffff'; c.fillRect(20, 70, w - 40, 116); c.fillStyle = '#1a1626'; c.font = '900 38px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('MIND YOUR', w / 2, 104); c.fillText('HEAD!', w / 2, 152); }
    else if (kind === 'repairs') { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); for (let i = -8; i < 16; i++) { c.fillStyle = i % 2 ? '#e8483a' : '#ffffff'; c.beginPath(); c.moveTo(i * 40, 0); c.lineTo(i * 40 + 40, 0); c.lineTo(i * 40 + 40 + 80, 80); c.lineTo(i * 40 + 80, 80); c.fill(); } c.fillStyle = '#1a1626'; c.font = '900 40px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TRACK', w / 2, 140); c.fillText('REPAIRS', w / 2, 190); }
  });
  // a board on a post beside the track at s, on side (-1 left, 1 right), facing the oncoming train
  function board(K, B, s, side, kind, o = {}) {
    const f = R.at(s), out = o.out || 2.4, p = R.local(s, side * out, 0, f);
    const g = new T.Group(); g.position.set(p[0], p[1], p[2]);
    // face back down the track toward the train
    g.lookAt(p[0] - f.t[0], p[1], p[2] - f.t[2]);
    const sz = o.size || 1.5, ht = o.h || 2.2;
    const post = K3D.mesh(K3D.geo('pc-signPost', () => new T.CylinderGeometry(0.06, 0.08, 1, 8).translate(0, 0.5, 0)), PARK.toonM('#2a2438'), { ink: INK, inkW: 0.6 });
    post.scale.y = ht + p[1] - 0.1; post.position.y = -p[1]; g.add(post);
    const bd = K3D.mesh(new T.BoxGeometry(sz, sz, 0.08), K3D.toon('#ffffff', { map: signTex(kind), emissive: '#ffffff', emissiveIntensity: 0.18 }), { ink: INK, inkW: 0.9 });
    bd.position.y = ht; g.add(bd);
    // arrows point the bend's way: the board is mirrored for a left bend
    if (o.flip) bd.scale.x = -1;
    K.add(g); g.updateMatrixWorld(true);
    if (B) { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, q = new T.Vector3(Math.cos(a) * sz * 0.62, ht + Math.sin(a) * sz * 0.62, 0.06).applyMatrix4(g.matrixWorld); B.add(q.x, q.y, q.z, o.bulb || '#ffffff', { size: 0.07, blink: true, phase: i }); } }
    return g;
  }
  // a low board right across the track (a rider who isn't ducking is bonked): two posts and the striped board
  function lowBoard(K, B, s, kind, h) {
    const f = R.at(s), g = new T.Group(), p = R.bankLocal(s, 0, 0, f);
    g.position.set(...p); g.lookAt(p[0] - f.t[0], p[1] - f.t[1], p[2] - f.t[2]);
    const tex = signTex(kind === 'mindhead' ? 'mindhead' : 'hazard');
    const bd = K3D.mesh(new T.BoxGeometry(3.4, 0.62, 0.12), K3D.toon('#ffffff', { map: tex, emissive: '#ffffff', emissiveIntensity: 0.15 }), { ink: INK }); bd.position.y = h + 0.31; g.add(bd);
    for (const sx of [-1, 1]) { const po = K3D.mesh(new T.BoxGeometry(0.18, h + 3, 0.18), PARK.toonM('#2a2438'), { ink: INK, inkW: 0.6 }); po.position.set(sx * 1.75, (h + 3) / 2 - 2.4, 0); g.add(po); }
    // tassels hanging just before it that brush the riders' heads
    const tas = new T.Group(); tas.position.set(0, 0, 2.6); g.add(tas);
    const bar = K3D.mesh(new T.CylinderGeometry(0.04, 0.04, 3.4, 6).rotateZ(Math.PI / 2), PARK.toonM('#2a2438'), { ink: INK, inkW: 0.5 }); bar.position.y = h + 0.65; tas.add(bar);
    for (let i = 0; i < 16; i++) { const t = K3D.mesh(K3D.geo('pc-tassel', () => new T.CylinderGeometry(0.03, 0.05, 0.6, 5).translate(0, -0.3, 0)), PARK.toonM(i % 2 ? '#ffd23a' : '#e8483a'), { ink: false }); t.position.set(-1.6 + i * 0.213, h + 0.62, 0); tas.add(t); }
    tas.userData.live = true;
    K.add(g); g.updateMatrixWorld(true);
    if (B) for (let i = 0; i <= 8; i++) { const q = new T.Vector3(-1.6 + i * 0.4, h + 0.68, 0.08).applyMatrix4(g.matrixWorld); B.add(q.x, q.y, q.z, '#fff0b0', { size: 0.06, blink: true, phase: i }); }
    return { g, tas };
  }
  // a photo arch over the track: two posts and an arc wrapped in bulbs, a big box camera on top with its flash
  function arch(K, B, s) {
    const f = R.at(s), g = new T.Group(), p = R.bankLocal(s, 0, 0, f);
    g.position.set(...p); g.lookAt(p[0] - f.t[0], p[1], p[2] - f.t[2]);
    const pts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24; pts.push(new T.Vector3(Math.cos(a) * 2.5, Math.sin(a) * 1.4 + 2.6, 0)); }
    const top = K3D.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 48, 0.18, 8), PARK.toonM('#c83a6a'), { ink: INK }); g.add(top);
    for (const sx of [-1, 1]) { const po = K3D.mesh(new T.CylinderGeometry(0.16, 0.2, 2.6 + p[1], 10), PARK.toonM('#c83a6a'), { ink: INK }); po.position.set(sx * 2.5, (2.6 - p[1]) / 2, 0); g.add(po); }
    const cam = new T.Group(); cam.position.set(0, 4.3, 0); g.add(cam);
    const body = K3D.mesh(K3D.roundBox(1.1, 0.7, 0.7, 0.5, 18), PARK.toonM('#2a2438'), { ink: INK }); cam.add(body);
    const lens = K3D.mesh(new T.CylinderGeometry(0.22, 0.26, 0.3, 14).rotateX(Math.PI / 2), PARK.toonM('#5a5470'), { ink: INK }); lens.position.set(0, 0.35, 0.45); cam.add(lens);
    const flash = new T.Mesh(new T.BoxGeometry(0.5, 0.25, 0.08), K3D.flat(new T.Color('#ffffff').multiplyScalar(0.6))); flash.position.set(0.25, 0.85, 0.2); cam.add(flash);
    const sg = PARK.neon(K, 'SMILE!', { w: 2.4, h: 0.6, col: '#ff7ad0', k: 2.4, board: false }); sg.position.set(0, 2.3, 0.1); g.add(sg);
    K.add(g); g.updateMatrixWorld(true);
    if (B) for (let i = 0; i <= 30; i++) { const q = pts[Math.round(i / 30 * 24)].clone(); q.z = 0.2; q.applyMatrix4(g.matrixWorld); B.add(q.x, q.y, q.z, i % 2 ? '#ffffff' : '#ff8ad8', { size: 0.12, speed: 6, phase: i * 0.6 }); }
    return { g, flash, s };
  }

  /* ---------- the station and its clock tower ---------- */
  function station(K, B) {
    const A = PR.art.station, g = new T.Group(); g.position.set(A.x, 0, A.z); K.add(g);
    const wood = K3D.toon('#ffffff', { map: PARK.wood('#7a4d30') }), roofM = K3D.toon('#ffffff', { map: PARK.stripes('#7a2f5a', '#f2c14e', 12) });
    // the platform on the left (Pip's side) and a narrow one on the right
    const plat = K3D.mesh(new T.BoxGeometry(5, 2.6, A.d), K3D.toon('#ffffff', { map: PARK.paving() })); plat.position.set(-3.6, 1.3, 0); g.add(plat);
    const plat2 = K3D.mesh(new T.BoxGeometry(1.6, 2.6, A.d), K3D.toon('#ffffff', { map: PARK.paving() })); plat2.position.set(2.0, 1.3, 0); g.add(plat2);
    const edge = K3D.mesh(new T.BoxGeometry(0.2, 0.06, A.d), K3D.toon('#ffd23a')); edge.position.set(-1.15, 2.63, 0); g.add(edge);
    // pillars and the roof
    for (let z = -A.d / 2 + 1; z <= A.d / 2 - 1; z += 4) for (const x of [-5.6, 2.6]) { const pl = K3D.mesh(new T.CylinderGeometry(0.22, 0.26, 5.4, 10), wood); pl.position.set(x, 5.3, z); g.add(pl); }
    const roof = K3D.mesh(new T.BoxGeometry(10.4, 0.4, A.d + 1.5), roofM); roof.position.set(-1.5, 8.2, 0); g.add(roof);
    const ridge = K3D.mesh(new T.CylinderGeometry(0.01, 6.4, 2.6, 4, 1).rotateY(Math.PI / 4), PARK.toonM('#3b2e44')); ridge.scale.set(1.2, 1, (A.d + 1.5) / 9); ridge.position.set(-1.5, 9.7, 0); g.add(ridge);
    // the buffers at the platform's end (open for the start, the train stops a hand short of them at the finish)
    const buf = K3D.mesh(new T.BoxGeometry(2.0, 0.6, 0.4), K3D.toon('#ffffff', { map: PARK.stripes('#e8483a', '#ffffff', 6) })); buf.position.set(0, 3.3, A.d / 2 + 1.5); g.add(buf);
    // the control booth (empty, its lever left alone)
    const booth = K3D.mesh(new T.BoxGeometry(2.4, 2.6, 2.4), wood); booth.position.set(-4.6, 3.9, -6); g.add(booth);
    const win = new T.Mesh(new T.PlaneGeometry(1.8, 1.0), PARK.flatM('#ffe0a0', 1.1)); win.position.set(-3.38, 4.3, -6); win.rotation.y = Math.PI / 2; g.add(win);
    // the sign over the exit, facing the train as it rolls out
    const sg = PARK.neon(K, 'THE COMET', { w: 8, h: 2, col: '#ffcf4a', col2: '#ff6ab0', k: 2.6 }); sg.position.set(-1.5, 9.6, -A.d / 2 - 0.9); sg.rotation.y = Math.PI; g.add(sg);
    const sg2 = PARK.neon(K, 'THE COMET', { w: 8, h: 2, col: '#ffcf4a', col2: '#ff6ab0', k: 2.6 }); sg2.position.set(-1.5, 9.6, A.d / 2 + 0.9); g.add(sg2);
    const star = K3D.mesh(new T.ExtrudeGeometry(PARKCOASTER_CAR.starShape(1.4, 0.65), { depth: 0.3, bevelEnabled: false }), K3D.toon('#f2c95a', { emissive: '#a06a10', emissiveIntensity: 0.6 })); star.position.set(-1.5, 12.2, -A.d / 2 - 0.9); g.add(star);
    K.add(g); g.updateMatrixWorld(true);
    const w2 = (x, y, z) => { const q = new T.Vector3(x, y, z).applyMatrix4(g.matrixWorld); return [q.x, q.y, q.z]; };
    if (B) {
      for (const z of [-A.d / 2 - 0.75, A.d / 2 + 0.75]) B.line(w2(-6.7, 8.0, z), w2(3.7, 8.0, z), 0.45, ['#ffe07a', '#ff8ab0', '#ffffff'], { speed: 4, size: 0.1 });
      for (const x of [-6.7, 3.7]) B.line(w2(x, 8.0, -A.d / 2 - 0.75), w2(x, 8.0, A.d / 2 + 0.75), 0.45, ['#ffe07a', '#ff8ab0', '#ffffff'], { speed: 4, size: 0.1 });
      // lamps hanging under the roof over the platform
      for (let z = -A.d / 2 + 2; z < A.d / 2; z += 4) { const p = w2(-3.6, 7.3, z); B.add(p[0], p[1], p[2], '#fff0c0', { size: 0.26 }); PARK.halo(K, p[0], p[1], p[2], 3, '#ffe0a0', 0.35); }
    }
    // the clock tower beside the station: four faces, the hands at twelve, a spire of bulbs
    const C2 = PR.art.clock, tw = new T.Group(); tw.position.set(C2.x, 0, C2.z); K.add(tw);
    const body = K3D.mesh(new T.BoxGeometry(4, C2.h, 4), K3D.toon('#ffffff', { map: PARK.stripes('#e8dcc0', '#d6c8a8', 4, { v: true }) })); body.position.y = C2.h / 2; tw.add(body);
    const cap = K3D.mesh(new T.BoxGeometry(4.8, 0.6, 4.8), PARK.toonM('#7a2f5a')); cap.position.y = C2.h + 0.3; tw.add(cap);
    const spire = K3D.mesh(new T.ConeGeometry(3.2, 6, 4).rotateY(Math.PI / 4), K3D.toon('#ffffff', { map: PARK.stripes('#7a2f5a', '#f2c14e', 8) })); spire.position.y = C2.h + 3.6; tw.add(spire);
    const faceTex = K3D.paint('pc-clock', 256, 256, (c, w, h) => { c.fillStyle = '#fff6d8'; c.beginPath(); c.arc(128, 128, 120, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#3a2a2a'; c.lineWidth = 8; c.stroke(); c.fillStyle = '#3a2a2a'; c.font = '700 26px "DejaVu Serif", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2; c.fillText(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][i - 1], 128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); } });
    const hands = [];
    for (let k = 0; k < 4; k++) {
      const fg = new T.Group(); fg.rotation.y = k * Math.PI / 2; tw.add(fg);
      const face = new T.Mesh(new T.CircleGeometry(1.6, 32), K3D.flat(new T.Color('#ffffff').multiplyScalar(1.0), { map: faceTex })); face.position.set(0, C2.h - 3, 2.02); fg.add(face);
      const hm = K3D.toon('#2a1a1a');
      const hh = new T.Mesh(new T.BoxGeometry(0.12, 0.9, 0.04).translate(0, 0.45, 0), hm); hh.position.set(0, C2.h - 3, 2.06); fg.add(hh);
      const mh = new T.Mesh(new T.BoxGeometry(0.08, 1.35, 0.04).translate(0, 0.67, 0), hm); mh.position.set(0, C2.h - 3, 2.07); fg.add(mh);
      hh.userData.live = mh.userData.live = true; hands.push({ hh, mh, face });
    }
    tw.updateMatrixWorld(true);
    if (B) { const w3 = (x, y, z) => { const q = new T.Vector3(x, y, z).applyMatrix4(tw.matrixWorld); return [q.x, q.y, q.z]; }; for (const [x, z] of [[2.4, 2.4], [-2.4, 2.4], [-2.4, -2.4], [2.4, -2.4]]) B.line(w3(x, C2.h + 0.7, z), w3(0, C2.h + 6.8, 0), 0.5, ['#ffe07a', '#ffffff'], { speed: 5, step: -0.5, size: 0.14 }); B.add(...w3(0, C2.h + 7.1, 0), '#ff6a8a', { size: 0.35, blink: true }); }
    PARK.glint(K, A.x - 2, A.z - A.d / 2 - 4, '#ffcf4a', 12, 6, 0.4);
    return { g, tower: tw, hands };
  }

  /* ---------- the park around the ride ---------- */
  function park(K, B) {
    const A = PR.art;
    PARK.ground(K, { x: 120, z: 20, size: 1500 });
    PARK.sea(K, B, { z: A.sea.z, pier: A.pier });
    PARK.lake(K, B, A.lake);
    const rides = A.rides.map(r => PARK.ride(K, B, r.k, r));
    // the midway along the seafront: stalls both sides of the low track, lanterns across, tents behind
    for (let x = A.midway.x0; x < A.midway.x1; x += 7.5) {
      const zN = A.midway.z - 9 - (Math.floor(x / 7.5) % 2) * 0.6, zS = A.midway.z + 9 + (Math.floor(x / 7.5) % 3) * 0.5;
      PARK.stall(K, B, { x, z: zN, yaw: 0, c: Math.floor(x / 7.5) });
      PARK.stall(K, B, { x: x + 3.6, z: zS, yaw: Math.PI, c: Math.floor(x / 7.5) + 3 });
      if (Math.floor(x / 7.5) % 2) PARK.lanterns(K, B, [x, 6.2, zN + 2], [x + 3.6, 6.2, zS - 2], { sag: 1.0, c: Math.floor(x) });
    }
    for (let x = A.midway.x0 + 4; x < A.midway.x1; x += 22) PARK.tent(K, B, { x, z: A.midway.z - 24, r: 5 + (x % 3), h: 6 + (x % 4), cols: [['#c83a4a', '#f4e8d0'], ['#3f8f6a', '#f4e8d0'], ['#5d4bb0', '#f2d06a']][Math.floor(x / 22) % 3] });
    // the promenade between the midway and the sea wall: lamps, benches, bins, balloons, carts
    for (let x = -160; x < 380; x += 12) { PARK.lamp(K, B, { x, z: A.sea.z + 9, moths: x % 36 === 0 }); if (x % 24 === 0) PARK.bench(K, x + 4, A.sea.z + 9.5, Math.PI); if (x % 36 === 12) PARK.bin(K, x + 6, A.sea.z + 10); }
    for (let x = -150; x < 360; x += 4.5) PARK.flags(K, [x, 4.6, A.sea.z + 9], [x + 4.5, 4.6, A.sea.z + 9], { sag: 0.4, n: 6 });
    PARK.cart(K, B, 'popcorn', { x: 96, z: -118, yaw: 0.3 }); PARK.cart(K, B, 'floss', { x: 214, z: -116, yaw: -0.4 });
    PARK.balloons(K, 104, 0, -96); PARK.balloons(K, 180, 0, -116); PARK.balloons(K, 30, 0, 30); PARK.balloons(K, -8, 0, 64);
    // gardens and paths in the middle of the park: lamps along walks, hedge animals, trees, more stalls and booths
    const walks = [[[-30, 60], [-30, -100]], [[60, 30], [180, 30]], [[-100, 0], [30, 0]], [[60, -60], [180, -60]], [[100, -30], [100, 60]], [[-60, 100], [60, 100]]];
    for (const [a, b] of walks) {
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.round(d / 11);
      for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, nx = -(b[1] - a[1]) / d, nz = (b[0] - a[0]) / d; PARK.lamp(K, B, { x: x + nx * 3, z: z + nz * 3, moths: i % 4 === 0 }); if (i % 3 === 1) PARK.bench(K, x - nx * 3, z - nz * 3, Math.atan2(nx, nz)); if (i % 2) PARK.lanterns(K, B, [x + nx * 3, 3.8, z + nz * 3], [x + nx * 3 + (b[0] - a[0]) / n, 3.8, z + nz * 3 + (b[1] - a[1]) / n], { sag: 0.7, n: 5, c: i }); }
    }
    const hedges = [[-24, 40, 'rabbit'], [-36, 10, 'elephant'], [70, 42, 'rabbit'], [130, 24, 'other'], [86, -40, 'elephant'], [-60, -36, 'rabbit'], [20, -40, 'other'], [-10, 110, 'elephant'], [56, 108, 'rabbit']];
    hedges.forEach(([x, z, k], i) => PARK.hedgeAnimal(K, x, z, k, i * 1.3));
    for (let i = 0; i < 70; i++) { const x = -150 + rnd() * 520, z = -130 + rnd() * 290; if (Math.abs(x - 42) < 9 && z < 30 && z > -110) continue; if (Math.hypot(x - A.lake.x, z - A.lake.z) < 80) continue; if (x > 236 && x < 312 && z > 40 && z < 166) continue; PARK.tree(K, x, z, 0.9 + rnd() * 0.6); }
    const tents = [[-70, 20, 7, ['#c83a4a', '#f4e8d0']], [-120, 60, 9, ['#5d4bb0', '#f2d06a']], [150, -36, 7, ['#3f8f6a', '#f4e8d0']], [60, 0, 6, ['#d860a8', '#f4e8d0']], [-40, -110, 6, ['#2f7fa8', '#f4e8d0']], [340, 120, 9, ['#c83a4a', '#f2d06a']]];
    for (const [x, z, r, cols] of tents) PARK.tent(K, B, { x, z, r, h: r * 1.1, cols, yaw: x * 0.1 });
    const booths = [[-8, 50], [56, 20], [120, 0], [-50, -10], [24, -70]];
    for (const [x, z] of booths) PARK.booth(K, B, { x, z, yaw: x * 0.05 });
    for (const [x, z, yaw] of [[14, 30, 0.4], [-22, -4, -1.2], [70, -20, 2.4], [-60, 72, 0.9], [140, 54, -0.6], [30, 120, 3.1]]) PARK.stall(K, B, { x, z, yaw, c: Math.floor(Math.abs(x)) });
    for (const [x, z, w] of [[-20, 46, ['Comet', 'Sea Front']], [64, 12, ['Big Wheel', 'Funhouse']], [-48, 4, ['Teacups', 'Log Flume']], [100, -48, ['Pier', 'Carousel']]]) PARK.signpost(K, x, z, w, x * 0.07);
    PARK.cart(K, B, 'floss', { x: -16, z: 20, yaw: 1 }); PARK.cart(K, B, 'popcorn', { x: 48, z: -10, yaw: -0.7 }); PARK.cart(K, B, 'popcorn', { x: -40, z: 54 });
    // the fence round the park (with the gap they slipped through by the station)
    PARK.fence(K, B, [-170, 170], [370, 170], { bulbs: true }); PARK.fence(K, B, [-170, -140], [-170, 170], { bulbs: true }); PARK.fence(K, B, [370, -140], [370, 170], { bulbs: true });
    // the funhouse: a giant laughing moon face (its inside comes later; the track goes in at the mouth)
    funhouse(K, B);
    return rides;
  }
  function funhouse(K, B) {
    const F = PR.art.funhouse, g = new T.Group(); g.position.set(F.x, 0, F.z); K.add(g);
    const wall = K3D.mesh(new T.BoxGeometry(F.w, F.h, F.d), K3D.toon('#ffffff', { map: PARK.stripes('#5d3a9a', '#2f2a6a', 12, { v: true }) })); wall.position.y = F.h / 2; g.add(wall);
    const roof = K3D.mesh(new T.BoxGeometry(F.w + 2, 1.2, F.d + 2), PARK.toonM('#f2c14e')); roof.position.y = F.h + 0.6; g.add(roof);
    // the moon face on the front (toward the midway, -x): a huge round yellow face with a grin the track enters
    const face = new T.Group(); face.position.set(-F.w / 2 - 0.5, F.h * 0.55, -F.d / 2 + 20); face.rotation.y = -Math.PI / 2; g.add(face);
    const disc = K3D.mesh(new T.CylinderGeometry(15, 15, 1.4, 48).rotateX(Math.PI / 2), K3D.toon('#ffe27a', { emissive: '#8a6a10', emissiveIntensity: 0.45 }), { inkW: 1.4 }); face.add(disc);
    for (const sx of [-1, 1]) { const eye = K3D.mesh(new T.SphereGeometry(2.4, 20, 14), PARK.toonM('#ffffff')); eye.scale.z = 0.4; eye.position.set(sx * 5, 4, 0.8); face.add(eye); const pu = new T.Mesh(new T.SphereGeometry(1.2, 14, 10), PARK.toonM('#2a2235')); pu.scale.z = 0.4; pu.position.set(sx * 5 + 0.4, 3.6, 1.6); face.add(pu); }
    const mouth = K3D.mesh(new T.CylinderGeometry(8, 8, 1.6, 32, 1, false, Math.PI * 0.08, Math.PI * 0.84).rotateX(Math.PI / 2).rotateZ(Math.PI), PARK.toonM('#3a1a3a')); mouth.position.set(0, -2, 0.4); face.add(mouth);
    const sg = PARK.neon(K, 'FUNHOUSE', { w: 16, h: 3.6, col: '#7affd4', col2: '#ff6ab0', k: 2.6 }); sg.position.set(-F.w / 2 - 1.2, F.h + 3, -F.d / 2 + 20); sg.rotation.y = -Math.PI / 2; g.add(sg);
    g.updateMatrixWorld(true);
    if (B) { const w2 = (x, y, z) => { const q = new T.Vector3(x, y, z).applyMatrix4(face.matrixWorld); return [q.x, q.y, q.z]; }; for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; B.add(...w2(Math.cos(a) * 15.6, Math.sin(a) * 15.6, 0.9), i % 2 ? '#ffffff' : '#ffd24a', { size: 0.35, speed: 4, phase: i * 0.5 }); }
      for (const x of [-F.w / 2, F.w / 2]) for (const z of [-F.d / 2, F.d / 2]) { const q = new T.Vector3(x, 0, z).applyMatrix4(g.matrixWorld); B.line([q.x, 0.5, q.z], [q.x, F.h, q.z], 1.2, ['#ff6ab0', '#7affd4'], { speed: 5, step: -0.6, size: 0.3 }); } }
  }

  /* ---------- tickets ---------- */
  function tickets(K) {
    const n = L.tickets.length;
    const tex = K3D.paint('pc-ticket', 128, 64, (c, w, h) => {
      c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(8, 4); c.lineTo(w - 8, 4); c.arc(w - 4, h / 2, 8, -Math.PI / 2, Math.PI / 2, true); c.lineTo(w - 8, h - 4); c.lineTo(8, h - 4); c.arc(4, h / 2, 8, Math.PI / 2, -Math.PI / 2, true); c.closePath(); c.fill();
      c.strokeStyle = '#a0700a'; c.lineWidth = 3; c.stroke(); c.setLineDash([4, 4]); c.beginPath(); c.moveTo(w - 34, 8); c.lineTo(w - 34, h - 8); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#7a4a0a'; c.font = '900 17px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ADMIT', 46, 24); c.fillText('ONE', 46, 42); c.font = '900 22px "DejaVu Sans", sans-serif'; c.fillText('★', w - 18, h / 2);
    });
    const mat = new T.MeshBasicMaterial({ map: tex, color: new T.Color('#ffffff').multiplyScalar(1.6), side: T.DoubleSide, transparent: true, alphaTest: 0.3, toneMapped: false });
    const im = new T.InstancedMesh(new T.PlaneGeometry(0.9, 0.45), mat, n); im.frustumCulled = false; K.add(im);
    const pos = L.tickets.map(tk => { const ox = tk.lat === 0 ? 0 : Math.sign(tk.lat) * (Math.abs(tk.lat) >= 2 ? 2.05 : 1.15); const oy = tk.air ? 2.9 : 1.5; return v3(R.bankLocal(tk.s, ox, oy)); });
    return { im, pos };
  }

  /* ---------- filling the gaps beside the track (Gavyn: never barren) ----------
     Walks the whole circuit and, wherever the ground beside it is still empty, sets down a little bit of park: lawns
     with trees, flower beds and benches, lamps with lantern strings, game stalls, booths, carts, balloons, hedge
     animals, tents further out. A coarse grid keeps them off the track, the lake, the sea, the funhouse and each other. */
  function fill(K, B, keep) {
    const A = PR.art, cell = 3, occ = new Set(), key = (a, b) => a + ',' + b;
    const each = (x, z, r, f) => { for (let a = Math.floor((x - r) / cell); a <= Math.floor((x + r) / cell); a++) for (let b = Math.floor((z - r) / cell); b <= Math.floor((z + r) / cell); b++) if (f(key(a, b))) return true; return false; };
    const mark = (x, z, r) => each(x, z, r, k => { occ.add(k); });
    const free = (x, z, r) => {
      if (x < -165 || x > 365 || z < A.sea.z + 14 || z > 165) return false;
      if (((x - A.lake.x) / (A.lake.rx + r + 3)) ** 2 + ((z - A.lake.z) / (A.lake.rz + r + 3)) ** 2 < 1) return false;
      const F = A.funhouse; if (Math.abs(x - F.x) < F.w / 2 + r + 2 && Math.abs(z - F.z) < F.d / 2 + r + 2) return false;
      return !each(x, z, r, k => occ.has(k));
    };
    for (let s = 0; s < R.len; s += 1.5) { const p = R.at(s).p; mark(p[0], p[2], 3.2); }
    for (const D of PR.dets) for (let s = 0; s < D.len; s += 1.5) { const p = D.at(s).p; mark(p[0], p[2], 3.2); }
    for (const [x, z, r] of keep) mark(x, z, r);
    const box = new T.Box3(), c = new T.Vector3(), sz = new T.Vector3();
    for (const o of K.root.children) {
      if (o.isInstancedMesh || o.isPoints || o.userData.big) continue;
      box.setFromObject(o); if (box.isEmpty()) continue; box.getSize(sz); if (sz.x > 90 || sz.z > 90) continue;
      box.getCenter(c); mark(c.x, c.z, Math.max(sz.x, sz.z) / 2 + 0.5);
    }
    const FL = PARK.flowers(K, 20000);
    const lampAt = [];
    const kinds = [['trees', 30], ['bed', 12], ['lamp', 8], ['stall', 12], ['booth', 5], ['hedge', 5], ['cart', 5], ['balloons', 6], ['bench', 7], ['games', 6]];
    const tot = kinds.reduce((a, k) => a + k[1], 0);
    const pick = () => { let x = rnd() * tot; for (const [k, w] of kinds) { x -= w; if (x < 0) return k; } return 'trees'; };
    const place = (k, x, z, yaw) => {
      if (k === 'trees') { if (!free(x, z, 3.5)) return false; FL.lawn(x, z, 3.5 + rnd() * 2.5, 2.8 + rnd() * 2, rnd() * 3); const n = 1 + Math.floor(rnd() * 3); for (let i = 0; i < n; i++) PARK.tree(K, x + (rnd() - 0.5) * 4, z + (rnd() - 0.5) * 3, 1.0 + rnd() * 0.7, B); mark(x, z, 4); }
      else if (k === 'bed') { if (!free(x, z, 2.4)) return false; FL.bed(x, z, 1.2 + rnd() * 1.0); PARK.bench(K, x + Math.sin(yaw) * 3.2, z + Math.cos(yaw) * 3.2, yaw + Math.PI); mark(x, z, 3.5); }
      else if (k === 'lamp') { if (!free(x, z, 1.5)) return false; PARK.lamp(K, B, { x, z, moths: rnd() < 0.3 }); PARK.bin(K, x + 1, z + 0.6); const near = lampAt.find(l => Math.hypot(l[0] - x, l[1] - z) < 14 && Math.hypot(l[0] - x, l[1] - z) > 5); if (near) PARK.lanterns(K, B, [x, 3.9, z], [near[0], 3.9, near[1]], { sag: 0.8, c: Math.floor(x) }); lampAt.push([x, z]); mark(x, z, 1.8); }
      else if (k === 'stall') { if (!free(x, z, 4.5)) return false; PARK.stall(K, B, { x, z, yaw, c: Math.floor(rnd() * 9) }); mark(x, z, 4.5); }
      else if (k === 'booth') { if (!free(x, z, 2.5)) return false; PARK.booth(K, B, { x, z, yaw }); mark(x, z, 2.5); }
      else if (k === 'hedge') { if (!free(x, z, 3)) return false; PARK.hedgeAnimal(K, x, z, ['rabbit', 'elephant', 'other'][Math.floor(rnd() * 3)], yaw); FL.bed(x + 2.6, z + 1.2, 1.0); mark(x, z, 3.5); }
      else if (k === 'cart') { if (!free(x, z, 2)) return false; PARK.cart(K, B, rnd() < 0.5 ? 'popcorn' : 'floss', { x, z, yaw }); mark(x, z, 2.2); }
      else if (k === 'balloons') { if (!free(x, z, 1.8)) return false; PARK.balloons(K, x, 0, z, 4 + Math.floor(rnd() * 4)); mark(x, z, 2); }
      else if (k === 'bench') { if (!free(x, z, 2)) return false; PARK.bench(K, x, z, yaw); PARK.lamp(K, B, { x: x + 1.8, z: z + 0.4 }); mark(x, z, 2.4); }
      else if (k === 'games') { if (!free(x, z, 7)) return false; PARK.tent(K, B, { x, z, r: 4 + rnd() * 2.5, h: 5 + rnd() * 2, cols: [['#c83a4a', '#f4e8d0'], ['#3f8f6a', '#f4e8d0'], ['#5d4bb0', '#f2d06a'], ['#d860a8', '#f4e8d0']][Math.floor(rnd() * 4)], yaw }); mark(x, z, 9); }
      return true;
    };
    // near the track (seen up close), then a band further out (seen across the park)
    for (const [d0, d1, step] of [[6, 11, 2.6], [11, 19, 3.2], [19, 30, 4], [30, 46, 5.5], [46, 70, 8]]) {
      for (let s = 0; s < R.len; s += step * (0.7 + rnd() * 0.6)) {
        const f = R.at(s);
        for (const side of [-1, 1]) {
          const h = Math.hypot(f.t[0], f.t[2]) || 1, rx = -f.t[2] / h * side, rz = f.t[0] / h * side, d = d0 + rnd() * (d1 - d0);
          const x = f.p[0] + rx * d, z = f.p[2] + rz * d;
          for (let t = 0; t < 4 && !place(t < 2 ? pick() : t === 2 ? 'trees' : rnd() < 0.5 ? 'bed' : 'bench', x, z, Math.atan2(-rx, -rz)); t++);
        }
      }
    }
    FL.done();
  }

  /* ---------- build ---------- */
  function build(K, st) {
    rnd = PARK.rnd; PARK.resetGlints();
    const night = PARK.night(K, { moon: PR.art.moon });
    const B = PARK.bulbs(K, 16000);
    const sc = { K, B, night };
    sc.rides = park(K, B);
    sc.station = station(K, B);
    // the track: the main circuit (broken at the gaps), the detours and the station loop
    const gaps = L.hops.map(h => [h.s0, h.s1]);
    const warn = L.hops.map(h => [h.s0 - 7, h.s0]);
    let a = 0;
    for (const [g0, g1] of gaps.concat([[R.len, R.len]])) { if (g0 - a > 0.5) trackPiece(K, B, R, a, g0, { warn }); a = g1; }
    supports(K, R, 0, R.len, { skip: (p) => Math.hypot(p[0] - PR.art.station.x, p[2] - PR.art.station.z) < 12 });
    for (const D of PR.dets) { trackPiece(K, B, D, 0, D.len, { rail: '#b8a8b8', spine: '#6a5a6a', sleeper: '#5a4a4a', bulbGap: 3, bulbCols: ['#ff7a5a', '#ffd27a'] }); supports(K, D, 0, D.len, { gap: 7 }); }
    sc.chainTex = PR.lifts.map(([s0, s1]) => chain(K, s0, s1));
    // on the track: arrow boards, low boards, hops, cameras, arches, switches, loudspeakers
    for (const bd of L.bends) board(K, B, bd.lead, -bd.dir, bd.need === 2 ? 'bend2' : 'bend1', { flip: bd.dir < 0, bulb: bd.need === 2 ? '#ffd24a' : '#ffffff' });
    sc.lows = L.ducks.map(d => lowBoard(K, B, d.s, d.kind, d.h + 0.25));
    for (const h of L.hops) {
      for (const side of [-1, 1]) board(K, B, h.lead, side, 'spring', { size: 1.3, h: 2.0, bulb: '#ffd24a' });
      // the barrier and cones at the gap, and a work lamp blinking
      const f = R.at((h.s0 + h.s1) / 2);
      for (const side of [-1, 1]) {
        const p = R.local((h.s0 + h.s1) / 2, side * 2.4, -0.1, f), bar = new T.Group(); bar.position.set(...p); bar.lookAt(p[0] - f.t[0], p[1], p[2] - f.t[2]);
        const bd = K3D.mesh(new T.BoxGeometry(2.2, 1.1, 0.1), K3D.toon('#ffffff', { map: signTex('repairs'), emissive: '#ffffff', emissiveIntensity: 0.15 })); bd.position.y = 1.3; bar.add(bd);
        for (const lx of [-0.9, 0.9]) { const lg = K3D.mesh(new T.BoxGeometry(0.1, 1.8, 0.1), PARK.toonM('#2a2438')); lg.position.set(lx, 0.6, 0); bar.add(lg); }
        K.add(bar); B.add(p[0], p[1] + 2.1, p[2], '#ff8a3a', { size: 0.16, blink: true });
      }
    }
    for (const cm of L.cams) board(K, B, cm.lead, 1, 'camera', { size: 1.1, h: 2.2, out: 3.6, bulb: '#ff8ad8' });
    sc.arches = L.arches.map(s => arch(K, B, s));
    // loudspeakers on poles by the track (the announcer's lines come from the nearest)
    sc.horns = L.says.map(sy => {
      const f = R.at(sy.s + 10), p = R.local(sy.s + 10, 3.2, 0, f), g = new T.Group(); g.position.set(p[0], 0, p[2]);
      const pole = K3D.mesh(new T.CylinderGeometry(0.08, 0.1, p[1] + 5.5, 8), PARK.toonM('#2a2438')); pole.position.y = (p[1] + 5.5) / 2; g.add(pole);
      for (const a of [0, 2.1, 4.2]) { const horn = K3D.mesh(K3D.geo('pc-horn', () => new T.ConeGeometry(0.4, 0.9, 12, 1, true).rotateX(-Math.PI / 2)), PARK.toonM('#d8d0e8', { side: T.DoubleSide })); horn.position.set(Math.sin(a) * 0.3, p[1] + 5.2, Math.cos(a) * 0.3); horn.rotation.y = a; horn.rotation.x = 0.25; g.add(horn); }
      K.add(g); return [p[0], p[1] + 5.9, p[2]];
    });
    // fill the empty ground beside the track (the robots' sweeping circles kept clear)
    fill(K, B, [[22, 58, 4], [30, 34, 5], [-8, 40, 6], [54, 6, 7]]);
    // the train and riders
    sc.car = PARKCOASTER_CAR.build(K);
    sc.car.train.userData.live = true;
    sc.tk = tickets(K);
    // wind-up sweeper robots by the station yard; gulls on the station roof and one on the crest's rail
    sc.robots = [];
    for (let i = 0; i < 4; i++) { const r = PARK.robot(K, { col: ['#e85a4a', '#3f9a8a', '#f2c14e', '#7a6ad0'][i] }); sc.robots.push({ r, c: [[22, 58], [30, 34], [-8, 40], [54, 6]][i], ph: i * 1.7, rr: 3 + i }); }
    sc.mechanic = PARK.robot(K, { col: '#f2c14e' }); sc.mechanic.visible = false;
    const crest = R.at(PR.at.crest);
    sc.gulls = PARK.gulls(K, [[-3, 8.6, 78], [-1, 8.6, 88], [-5, 8.6, 84], [crest.p[0] - 2.6, crest.p[1] - 0.3, crest.p[2] - 3], [136, 3.6, -150], [150, 3.6, -150]]);
    sc.fw = PARK.fireworks(K);
    // batch everything that never moves (the moving parts are marked live)
    K3D.bake(K.root);
    K.pc = sc;
    sc.cam = K3D.cams.ride({ fov: 56, k: 5 });
    sc.cam.snap();
    sc.lastS = st.s;
    return sc;
  }

  /* ---------- every frame ---------- */
  const RM = () => !!(typeof reduceMotion !== 'undefined' && reduceMotion) || !!K3D.reduce;
  const smooth = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  function shotFor(sc, st) {
    const s = st.s, f = PARKCOASTER.frame(st);
    // the lift hills: ease back and wide to show the park (the postcard), while play goes on
    let wide = 0;
    for (const [a, b] of PR.lifts) wide = Math.max(wide, smooth(a - 4, a + 10, s) * (1 - smooth(b - 6, b + 2, s)));
    const nearCrest = Math.max(...[PR.at.crest, PR.at.crest2].map(c => 1 - smooth(4, 12, Math.abs(s - c))));
    const o = { back: 7.2 + wide * 8, height: 4.6 + wide * 5 + nearCrest * 1.2, ahead: 10 + wide * 10, side: wide * 4.5, tipAhead: nearCrest * 6, roll: RM() ? 0.33 : 0.8, rollMax: RM() ? 5 : 15 };
    if (st.det >= 0) {
      const D = PR.dets[st.det]; const sh = RAIL3.shot(D, Math.max(0, st.ds), { back: 7.2, height: 4.6, ahead: 10 });
      return Object.assign(sh, { fov: 58 });
    }
    // the loop: follow round (upside down at the top), or with reduced motion watch from the side, level
    if (f.loop && RM()) { const c = R.at(PR.at.loop); return { eye: [c.p[0] + 28, c.p[1] - 6, c.p[2]], at: [c.p[0], c.p[1] - 7, c.p[2]], up: [0, 1, 0], fov: 50 }; }
    const sh = RAIL3.shot(R, Math.max(0.5, s), o);
    // on a steep drop, look out across the park as well as down the track (not straight at the ground)
    if (f.pitch < -0.15) sh.at[1] += (sh.eye[1] - 3 - sh.at[1]) * smooth(0.15, 0.5, -f.pitch) * 0.45;
    sh.fov = 56 + wide * 8;
    return sh;
  }
  function update(K, st, dt) {
    const sc = K.pc; if (!sc) return;
    const car = sc.car;
    // the boarding: the park is dark until the clock strikes twelve, then lights up in a wave from the tower
    const T0 = 2.2;
    if (st.phase === 'board') {
      const r = st.phaseT < T0 ? -20 : (st.phaseT - T0) * 120;
      PARK.wave(K, PR.art.clock.x, PR.art.clock.z, r);
      if (st.phaseT >= T0 && !sc.bonged) { sc.bonged = true; for (let i = 0; i < 4; i++) setTimeout(() => Sfx.play('parkcoasterBong'), i * 280); }
    } else if (!sc.lit) { sc.lit = true; PARK.wave(K, 0, 0, 1e5); }
    for (const h of sc.station.hands) { h.hh.rotation.z = 0; h.mh.rotation.z = st.phase === 'board' ? Math.max(0, (T0 - st.phaseT) / T0) * 0.4 : 0; }
    PARKCOASTER_CAR.pose(K, car, st, dt);
    for (const tx of sc.chainTex) tx.offset.y = -(sc.chainT = (sc.chainT || 0) + dt * 2.8 / 0.5 * 0.5) % 1;
    // tickets flutter; taken ones are gone
    const im = sc.tk.im, m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sz = new T.Vector3(), t = (sc.t = (sc.t || 0) + dt);
    for (let i = 0; i < sc.tk.pos.length; i++) {
      const p = sc.tk.pos[i];
      if (st.got[i]) sz.set(0, 0, 0); else sz.set(1, 1, 1);
      e.set(Math.sin(t * 3 + i) * 0.3, t * 1.6 + i * 0.7, Math.sin(t * 2.2 + i * 1.3) * 0.25); q.setFromEuler(e);
      m4.compose(new T.Vector3(p.x, p.y + Math.sin(t * 2.5 + i) * 0.08, p.z), q, sz); im.setMatrixAt(i, m4);
    }
    im.instanceMatrix.needsUpdate = true;
    // the arches flash as the train passes
    for (const a of sc.arches) { const d = st.s - a.s; a.flash.material.color.setScalar(d > 0 && d < 3 ? 8 : 0.6); }
    // robots sweep in little circles; the mechanic comes for a Breakdown
    for (const rb of sc.robots) { rb.ph += dt * 0.35; const r = rb.r; r.position.set(rb.c[0] + Math.cos(rb.ph) * rb.rr, 0, rb.c[1] + Math.sin(rb.ph) * rb.rr); r.rotation.y = -rb.ph; r.userData.key.rotation.z += dt * 4; r.userData.broom.rotation.x = Math.sin(rb.ph * 14) * 0.4; }
    const mech = sc.mechanic;
    mech.visible = st.phase === 'breakdown' && st.phaseT > 0.6;
    if (mech.visible) { const f = car.frames[0], p = R.local(st.s, 1.9, -0.4, f); mech.position.set(p[0], Math.max(0, p[1] - 0.2), p[2]); mech.lookAt(f.p[0], mech.position.y, f.p[2]); mech.userData.key.rotation.z += dt * 9; mech.userData.broom.rotation.x = Math.sin(t * 16) * 0.8; }
    // gulls take off when the train roars past
    const fp = car.frames[0].p; sc.gulls.scare(fp[0], fp[2], 7);
    // the fireworks: over the station at the stop, and all round on the Thunderbolt
    sc.fw.auto(st.s > PR.at.lift2 && st.phase !== 'board');
    if (st.phase === 'stop' && !sc.finale) { sc.finale = true; for (let i = 0; i < 6; i++) setTimeout(() => sc.fw.burst(-10 + i * 6, 30 + (i % 3) * 8, 60 + (i % 2) * 10, ['#ff5a7a', '#ffd24a', '#7ae8ff', '#9aff8a', '#ff9ad6', '#ffffff'][i]), i * 380); }
    // the camera
    let sh;
    if (PARKCOASTER_SCENE.camOverride) sh = Object.assign({ up: [0, 1, 0] }, PARKCOASTER_SCENE.camOverride);
    else if (st.phase === 'board') {
      const base = RAIL3.shot(R, Math.max(0.5, st.s), { back: 7.2, height: 4.6, ahead: 10 });
      const u = smooth(4.5, 7.4, st.phaseT), board = { eye: [-2.6, 4.7, 82.4], at: [0.1, 4.0, 88.8], up: [0, 1, 0] };
      sh = { eye: board.eye.map((x, k) => x + (base.eye[k] - x) * u), at: board.at.map((x, k) => x + (base.at[k] - x) * u), up: [0, 1, 0], fov: 50 + 6 * u };
    } else if (st.phase === 'stop' || st.phase === 'done') sh = { eye: [-9, 6.5, 96], at: [0, 4, 86], up: [0, 1, 0], fov: 46 };
    else sh = shotFor(sc, st);
    sc.cam.update(K, dt, null, sh);
    K.focus.copy(car.front.g.position);
    // the photo flash
    sc.flash = st.flash;
  }

  /* ---------- flat things over the picture ---------- */
  function bubble(txt, x, y, a, col) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
    const words = txt.split(' '), lines = []; let ln = '';
    for (const w of words) { const t2 = ln ? ln + ' ' + w : w; if (ctx.measureText(t2).width > 270 && ln) { lines.push(ln); ln = w; } else ln = t2; }
    lines.push(ln);
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 34, h = lines.length * 19 + 16;
    x = Math.max(w / 2 + 8, Math.min(W - w / 2 - 60, x)); y = Math.max(h + 50, Math.min(H - 90, y));
    ctx.fillStyle = col || 'rgba(255,246,220,0.96)'; rr(x - w / 2, y - h, w, h, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(26,21,48,0.6)'; ctx.lineWidth = 1.5; rr(x - w / 2, y - h, w, h, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x, y + 10); ctx.lineTo(x + 8, y); ctx.fill();
    // a little horn icon (the loudspeaker)
    ctx.fillStyle = '#5a4f86'; ctx.beginPath(); ctx.moveTo(x - w / 2 + 9, y - h / 2 - 4); ctx.lineTo(x - w / 2 + 17, y - h / 2 - 9); ctx.lineTo(x - w / 2 + 17, y - h / 2 + 5); ctx.lineTo(x - w / 2 + 9, y - h / 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a2235'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, x - w / 2 + 22, y - h + 16 + i * 19));
    ctx.restore();
  }
  function drawTop(st) {
    const sc = K3D.K && K3D.K.pc;
    if (!sc) return;
    // the loudspeaker's lines (from the nearest horn on screen, else the top of the screen)
    const say = st.says.length && st.says[st.says.length - 1];
    if (say && st.t - say.t < 4.2) {
      const a = Math.min(1, (4.2 - (st.t - say.t)) * 3, (st.t - say.t) * 6);
      let x = W / 2, y = 150;
      const hi = L.says.findIndex(s2 => s2.s === say.s);
      if (hi >= 0 && sc.horns[hi]) { const q = K3D.toScreen(...sc.horns[hi]); if (q.z < 1 && q.x > 0 && q.x < W && q.y > 0 && q.y < H) { x = q.x; y = q.y - 8; } }
      bubble(say.text, x, y, a);
    }
    // the moment's words: Rattle!, the bend, the photo, a breakdown
    const last = st.fx.length && st.fx[st.fx.length - 1];
    const word = (txt, col, age, size = 34) => { ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, (1.2 - age) * 3)); text(txt, W / 2, 150 - Math.min(0.3, age) * 30, size, col, 'center'); ctx.restore(); };
    if (last) {
      const age = st.t - last.t;
      if (last.k === 'rattle' && age < 1.2) word({ bend: 'Two wheels! Rattle!', bonk: 'Bonk! Rattle!', gap: 'Clunk! Rattle!', tip: 'Scrape! Rattle!', detour: 'Bumpy! Rattle!' }[last.why] || 'Rattle!', '#ffb36a', age);
      if (last.k === 'photo' && age < 1.4) word('Say cheese! +' + PARKCOASTER.S.PHOTO_TICKETS, '#ffd24a', age);
      if (last.k === 'bell' && age < 1.2) word('Ding! +' + PARKCOASTER.S.BELL_TICKETS, '#ffd24a', age, 26);
      if (last.k === 'detour' && age < 1.6) word('Wrong way!', '#ffb36a', age);
    }
    if (st.phase === 'breakdown') { ctx.save(); ctx.globalAlpha = Math.min(1, st.phaseT * 3); text('Breakdown! The mechanic is on the way...', W / 2, 150, 26, '#fff6dc', 'center'); ctx.restore(); }
    if (st.hug > 0.5) word('Hug the rail!', '#9affd4', 0.8 - st.hug + 0.2, 24);
    // ticket sparkles where a ticket was taken
    for (const fx of st.fx) if (fx.k === 'ticket' && st.t - fx.t < 0.6) {
      const p = sc.tk.pos[fx.i], q = K3D.toScreen(p.x, p.y, p.z); if (q.z > 1) continue;
      const u = (st.t - fx.t) / 0.6;
      ctx.save(); ctx.globalAlpha = 1 - u; ctx.fillStyle = '#ffe27a';
      for (let k = 0; k < 6; k++) { const an = k / 6 * Math.PI * 2 + fx.i; circle(q.x + Math.cos(an) * u * 24, q.y + Math.sin(an) * u * 24, 3 * (1 - u) + 1); ctx.fill(); }
      ctx.restore();
    }
    // prompts: "Jump together!" at the spring signs, a lever button by the rider whose lever it is, the brakes
    if (st.phase === 'ride') {
      for (const h of L.hops) if (st.s > h.lead && st.s < h.s0) { const a = 0.75 + Math.sin(G.clock * 8) * 0.25; ctx.save(); ctx.globalAlpha = a; text('Jump together!', W / 2, H - 92, 22, '#ffd24a', 'center'); ctx.restore(); break; }
      for (const lv of L.levers) {
        const pre = Math.max(PARKCOASTER.S.LEVER_MIN, st.v * PARKCOASTER.S.LEVER_PRE);
        if (st.s < lv.s - pre - 6 || st.s > lv.s + 0.6) continue;
        if (lv.kind !== 'brake' && st.thrown[L.levers.indexOf(lv)]) continue;
        if (lv.kind === 'brake' && st.brake[lv.side]) continue;
        if (isCpuPlayer(lv.side)) continue;
        const x = lv.side === 0 ? W * 0.28 : W * 0.72;
        drawBtn(lv.side, 'act', x, H - 120, { label: lv.kind === 'brake' ? 'brake!' : lv.kind === 'switch' ? 'lever!' : 'ding!', alpha: 0.75 + Math.sin(G.clock * 9) * 0.25 });
      }
    }
    // the photo flash
    if (st.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.7, st.flash * 0.7)})`; ctx.fillRect(0, 0, W, H); }
    // the boarding: a line of text while the park wakes up
    if (st.phase === 'board' && st.phaseT > 2.2 && st.phaseT < 5) { ctx.save(); ctx.globalAlpha = Math.min(1, (st.phaseT - 2.2) * 2, (5 - st.phaseT) * 2); text('Bong... bong... midnight!', W / 2, 120, 26, '#fff6dc', 'center'); ctx.restore(); }
  }

  return { build: (K, st) => build(K, st), update, drawTop, camOverride: null, SC };
})();
