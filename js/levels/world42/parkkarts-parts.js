/* Pip & Bo - 42-4 Go-Kart Grand Prix: the four set-piece parts of the circuit out in the park, each with its own
   moving things. Loaded on demand with the 3D kit, built by PARKKARTS_WORLD.build (display only: the rules for the
   ford, the ramp, the pier's gaps, the headstones and the fork are in parkkarts-track.js and parkkarts-kart.js).

     Under the Comet    the Comet's track weaving over the road on its trestle bents, the train thundering round it
                        (empty, as every ride tonight), the log flume's channel with log boats and rubber ducks, the
                        wooden ramp that jumps it (prize boxes in the air over the gap), the ford (the low line)
     The Funhouse       the laughing moon's face with its mouth for a door, the spinning barrel, the black-light floor
                        up to the top storey, the hall of mirrors (one false turning ending at a padded wall), the
                        slide out and down onto the pier; the roof lifts away while a kart is inside
     The Pier           wet boards, broken railing over the sea, stalls both sides, the big wheel over the loop,
                        lifebuoys, a fishing robot
     Spook Manor Lane   ground fog, plywood headstones standing in the road, the neon ghost over it, the coffin with
                        the jack-o-spring skeleton, jack-o-lanterns, the iron fence, the fountain the road forks round

   PARKKARTS_PARTS.comet / funhouse / pier / spook (K, B, ctx)   ctx: the scenery's helpers ({ W, strip, decal,
   clear, room, take, rnd, mesh, toonM, INK, PIER, boardTex, chequer, ... }) */
'use strict';

const PARKKARTS_PARTS = (function () {
  const T = K3D.T, TR = PARKKARTS_TRACK, V = (x, y, z) => new T.Vector3(x, y, z);
  const P = {};
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const sm = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  let C = null;
  const mesh = (g, m, o) => K3D.mesh(g, m, o), toonM = (c, o) => PARK.toonM(c, o);

  /* ---------- shared helpers ---------- */
  // a wall along the road at lat (a number or f => lat), from yb(s) up to yt(s)
  function curtain(K, mat, s0, s1, lat, yb, yt, o = {}) {
    const st = o.step || 1, n = Math.max(1, Math.ceil((s1 - s0) / st)), pos = [], uv = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const s = s0 + (s1 - s0) * i / n, f = TR.at(s), la = typeof lat === 'function' ? lat(f) : lat, x = f.x + f.rx * la, z = f.z + f.rz * la;
      const b = typeof yb === 'function' ? yb(s) : yb, t = typeof yt === 'function' ? yt(s) : yt, u = (s - s0) / (o.uLen || 4);
      pos.push(x, b, z, x, t, z); uv.push(u, o.vLen ? b / o.vLen : 0, u, o.vLen ? t / o.vLen : 1);
      if (i) { const j = i * 2; idx.push(j - 2, j - 1, j, j - 1, j + 1, j); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new T.Mesh(g, mat); m.receiveShadow = true; (o.into || K).add(m); return m;
  }
  // things that hide while the camera is close to them (low things over the road: spec, "fade near the camera")
  const near = [];
  function hideNear(K, obj, pts, r) {
    obj.userData.live = true; near.push({ obj, pts, r });
    if (near.length === 1) K.tick(() => { const c = K.camera.position; for (const n of near) { let d = 1e9; for (const p of n.pts) d = Math.min(d, c.distanceToSquared(p)); n.obj.visible = d > n.r * n.r; } });
  }
  // a stick from a to b (instanced: collected, then made in one go)
  function sticks(K, list, r, mat, o = {}) {
    if (!list.length) return null;
    const im = new T.InstancedMesh(K3D.geo('pkp-stick|' + r, () => new T.CylinderGeometry(r * 0.8, r, 1, 8).translate(0, 0.5, 0)), mat, list.length);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), Y = V(0, 1, 0);
    list.forEach(([a, b], i) => { const d = b.clone().sub(a), l = d.length(); q.setFromUnitVectors(Y, d.normalize()); m4.compose(a, q, V(1, l, 1)); im.setMatrixAt(i, m4); });
    K3D.ink(im, C.INK, o.inkW || 0.6); K.add(im); return im;
  }
  const sign = (K, text, a, b, sub, o) => {
    const g = new T.Group(), w = o.w || 3.2, h = w * 0.31;
    const bd = mesh(new T.BoxGeometry(w, h, 0.1), K3D.toon('#ffffff', { map: C.boardTex(text, a, b, sub) }), { inkW: 0.6 }); bd.position.y = o.h || 2.2; g.add(bd);
    for (const sx of [-1, 1]) { const p = mesh(K3D.geo('pkp-signPost', () => new T.BoxGeometry(0.12, 1, 0.12).translate(0, 0.5, 0)), toonM('#4a3a3a')); p.scale.y = (o.h || 2.2); p.position.x = sx * w * 0.4; g.add(p); }
    g.position.set(o.x, o.y || 0, o.z); g.rotation.y = o.yaw || 0; K.add(g); return g;
  };
  const facing = (s, side) => { const f = TR.at(s); return Math.atan2(-f.rx * side, -f.rz * side); }; // a thing beside the road, its front to the road

  /* ================= Under the Comet ================= */
  P.comet = function (K, B, ctx) {
    C = ctx; const W = C.W, RP = W.RAMP, s0 = TR.partS[2], s1 = TR.partS[3], WALL = f => f.hw + TR.VERGE;
    const steel = toonM('#5a4f86'), railM = toonM('#e8e0f4'), dark = toonM('#2e2848');
    // the Comet's circuit: a run that weaves over the road three times, round the far turn, back high on the side away
    // from the flume ride, up the lift hill and the drop into the run again
    const lat = s => 9.5 * Math.sin((s - s0 + 8) / (s1 - s0 + 10) * Math.PI * 3), hgt = s => 9.2 + 1.4 * Math.cos((s - s0) * 0.12);
    const mid = (s0 + s1) / 2, pa = TR.pos(mid, 34), pb = TR.pos(mid, -34);
    const sd = Math.hypot(pa[0] - 252, pa[1] + 126) > Math.hypot(pb[0] - 252, pb[1] + 126) ? 1 : -1;
    const Q = (s, l, y) => { const p = TR.pos(s, l); return V(p[0], y, p[1]); };
    const pts = [];
    for (let s = s0 - 12; s <= s1 + 6; s += 6) pts.push(Q(s, lat(s), hgt(s)));
    pts.push(Q(s1 + 16, sd * 12, 12), Q(s1 + 8, sd * 28, 15), Q(mid + 22, sd * 40, 17), Q(mid - 18, sd * 40, 23), Q(s0 - 2, sd * 32, 28), Q(s0 - 20, sd * 18, 23), Q(s0 - 24, sd * 5, 14));
    const curve = new T.CatmullRomCurve3(pts, true, 'centripetal'), len = curve.getLength();
    // frames along it (right, up, forward) every half unit
    const NF = Math.ceil(len / 0.5), fr = [];
    for (let i = 0; i <= NF; i++) { const u = i / NF, p = curve.getPointAt(u), t = curve.getTangentAt(u), r = new T.Vector3().crossVectors(t, V(0, 1, 0)).normalize(), up = new T.Vector3().crossVectors(r, t).normalize(); fr.push({ p, t, r, up }); }
    // the track, cut into pieces (each hides when the camera comes close)
    const SEG = 24, tieG = K3D.geo('pkp-tie', () => new T.BoxGeometry(1.5, 0.12, 0.26)), m4 = new T.Matrix4();
    for (let a = 0; a < NF; a += SEG) {
      const g = new T.Group(); K.add(g);
      const part = fr.slice(a, Math.min(NF, a + SEG) + 1);
      for (const [o, rr, m] of [[[0.55, 0], 0.09, railM], [[-0.55, 0], 0.09, railM], [[0, -0.42], 0.2, steel]]) {
        const cp = part.map(f => f.p.clone().addScaledVector(f.r, o[0]).addScaledVector(f.up, o[1]));
        g.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(cp), cp.length * 2, rr, 6), m, { inkW: 0.6 }));
      }
      const ties = new T.InstancedMesh(tieG, dark, Math.ceil(part.length / 2.4));
      let n = 0; for (let i = 0; i < part.length; i += 2.4) { const f = part[Math.floor(i)]; m4.makeBasis(f.r, f.up, f.t); m4.setPosition(f.p.clone().addScaledVector(f.up, -0.12)); ties.setMatrixAt(n++, m4); }
      ties.count = n; g.add(ties);
      hideNear(K, g, part.filter((_, i) => i % 4 === 0).map(f => f.p), 6.5);
    }
    for (let i = 0; i < NF; i += 3) { const f = fr[i]; for (const sx of [-1, 1]) { const q = f.p.clone().addScaledVector(f.r, sx * 0.8); B.add(q.x, q.y + 0.05, q.z, (Math.floor(i / 3) % 5 === 0) ? '#ff8ab0' : '#ffe07a', { size: 0.09, speed: 6, phase: -i * 0.05 }); } }
    // the trestle: legs where the ground is free (an A-frame), bents over the road (a leg each side, a beam across)
    const legs = [];
    for (let i = 0; i < NF; i += 16) {
      const f = fr[i], top = f.p.clone().addScaledVector(f.up, -0.5);
      if (top.y < 2.5) continue;
      const nr = TR.near(top.x, top.z, null), rf = TR.at(nr.s);
      if (Math.abs(nr.lat) > rf.hw + TR.VERGE + 1.6 && C.clear(top.x, top.z, 1.2)) {
        for (const sx of [-1, 1]) legs.push([V(top.x + f.r.x * sx * 1.8, 0, top.z + f.r.z * sx * 1.8), top]);
        if (i % 32 === 0) { const a2 = V(top.x + f.r.x * 1.8, 0, top.z + f.r.z * 1.8).lerp(top, 0.45), b2 = V(top.x - f.r.x * 1.8, 0, top.z - f.r.z * 1.8).lerp(top, 0.45); legs.push([a2, b2]); }
      } else if (Math.abs(nr.lat) < rf.hw + TR.VERGE + 1) {
        // over the road: a bent (the legs stand just outside the walls; the beam hides near the camera)
        const w = rf.hw + TR.VERGE + 1.1, p1 = TR.pos(nr.s, -w), p2 = TR.pos(nr.s, w), y = top.y - 0.2;
        if (!C.clear(p1[0], p1[1], 0.3) && !C.clear(p2[0], p2[1], 0.3)) { /* the legs must stand clear of the walls */ }
        legs.push([V(p1[0], 0, p1[1]), V(p1[0], y, p1[1])], [V(p2[0], 0, p2[1]), V(p2[0], y, p2[1])]);
        const beam = new T.Group(); K.add(beam);
        const bm = mesh(new T.BoxGeometry(0.34, 0.34, 2 * w), steel, { inkW: 0.6 }); bm.position.set((p1[0] + p2[0]) / 2, y, (p1[1] + p2[1]) / 2); bm.lookAt(p2[0], y, p2[1]); beam.add(bm);
        for (const sx of [-1, 1]) { const kn = mesh(new T.BoxGeometry(0.2, 0.2, 2.6), steel, { inkW: 0.5 }); const pp = sx < 0 ? p1 : p2; kn.position.set(pp[0] + (TR.at(nr.s).rx * -sx) * 0.9, y - 0.9, pp[1] + (TR.at(nr.s).rz * -sx) * 0.9); kn.lookAt(pp[0], y - 1.9, pp[1]); beam.add(kn); }
        hideNear(K, beam, [V(p1[0], y, p1[1]), V((p1[0] + p2[0]) / 2, y, (p1[1] + p2[1]) / 2), V(p2[0], y, p2[1])], 9);
        // a ring of bulbs round each bent (they chase as the train goes by)
        for (let k = 0; k <= 10; k++) { const q = [p1[0] + (p2[0] - p1[0]) * k / 10, p1[1] + (p2[1] - p1[1]) * k / 10]; B.add(q[0], y - 0.25, q[1], '#ffe07a', { size: 0.08, speed: 7, phase: k * 0.6 }); }
      }
    }
    sticks(K, legs, 0.24, steel);
    // footings (concrete pads) under every leg on the ground
    { const fm = new T.InstancedMesh(K3D.geo('pkp-footing', () => new T.CylinderGeometry(0.5, 0.6, 0.3, 10).translate(0, 0.15, 0)), toonM('#6a6488'), legs.length); let n = 0; for (const [a] of legs) if (a.y === 0) { m4.makeTranslation(a.x, 0, a.z); fm.setMatrixAt(n++, m4); } fm.count = n; K3D.ink(fm, C.INK, 0.5); K.add(fm); }
    // the train: five empty cars, cream with gold streaks, a lamp on the front; faster down the drops
    const paint = K3D.paint('pkp-cometCar', 256, 128, (c, w, h) => { c.fillStyle = '#efe4c8'; c.fillRect(0, 0, w, h); for (let i = 0; i < 3; i++) { c.fillStyle = ['#d8a63a', '#f2c95a', '#b8862a'][i]; c.fillRect(0, h * (0.5 + i * 0.1), w, h * 0.06); } c.fillStyle = '#7a2f5a'; c.fillRect(0, h * 0.86, w, h * 0.14); });
    const carM = K3D.toon('#ffffff', { map: paint }), seatM = toonM('#7a2f5a'), cars = [];
    for (let i = 0; i < 5; i++) {
      const g = new T.Group(); g.userData.live = true; K.add(g);
      const body = mesh(K3D.geo('pkp-carBody', () => K3D.roundBox(1.4, 0.8, 2.0, 0.3, 12).translate(0, 0.45, 0)), carM, { inkW: 0.7 }); g.add(body);
      const seat = mesh(K3D.geo('pkp-carSeat', () => K3D.roundBox(1.1, 0.7, 0.35, 0.15, 8).translate(0, 1.0, -0.5)), seatM, { inkW: 0.5 }); g.add(seat);
      const bar = mesh(K3D.geo('pkp-carBar', () => new T.TorusGeometry(0.42, 0.05, 6, 14, Math.PI).translate(0, 0.95, 0.25)), toonM('#d8d0e8'), { inkW: 0.4 }); g.add(bar);
      for (const sx of [-1, 1]) for (const sz of [-0.6, 0.6]) { const wh = mesh(K3D.geo('pkp-carWheel', () => new T.CylinderGeometry(0.16, 0.16, 0.12, 10).rotateZ(Math.PI / 2)), dark); wh.position.set(sx * 0.62, 0.0, sz); g.add(wh); }
      if (i === 0) {
        const nose = mesh(K3D.geo('pkp-carNose', () => new T.ConeGeometry(0.5, 1.0, 5).rotateX(Math.PI / 2).translate(0, 0.5, 1.4)), toonM('#f2c95a'), { inkW: 0.6 }); g.add(nose);
        const lamp = new T.Mesh(K3D.geo('pkp-carLamp', () => new T.SphereGeometry(0.16, 10, 8)), PARK.flatM('#fff6d0', 3)); lamp.position.set(0, 0.55, 1.9); g.add(lamp);
        const hl = new T.Sprite(new T.SpriteMaterial({ map: PARK.glowTex(), color: hot('#fff0c0', 0.7), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false })); hl.scale.set(3.4, 3.4, 1); hl.position.copy(lamp.position); g.add(hl);
      }
      cars.push(g);
    }
    let yMax = 0; for (const f of fr) yMax = Math.max(yMax, f.p.y);
    const tr = W.comet = { u: 0.1, v: 8, cars, len, near: 0 };
    K.tick(dt => {
      const f0 = fr[Math.floor(tr.u * NF) % NF];
      tr.v = Math.max(5, Math.sqrt(2 * 9.8 * Math.max(0, yMax + 1.5 - f0.p.y)));
      tr.u = (tr.u + tr.v * dt / len) % 1;
      cars.forEach((g, i) => { let u = tr.u - i * 2.3 / len; u -= Math.floor(u); const f = fr[Math.floor(u * NF)]; m4.makeBasis(f.r, f.up, f.t); g.quaternion.setFromRotationMatrix(m4); g.position.copy(f.p); });
      tr.near = K.camera.position.distanceTo(cars[2].position);
    });
    // the Comet's name on an arch over the way in
    { const s = s0 + 6, f = TR.at(s), w = WALL(f) + 1.2, p1 = TR.pos(s, -w), p2 = TR.pos(s, w), arch = new T.Group(); K.add(arch);
      for (const p of [p1, p2]) { const post = mesh(new T.CylinderGeometry(0.3, 0.38, 12, 10), steel, { inkW: 0.7 }); post.position.set(p[0], 6, p[1]); arch.add(post); for (let y = 0.4; y < 11.8; y += 0.5) B.add(p[0], y, p[1], y % 1 < 0.5 ? '#ffe07a' : '#ff8ab0', { size: 0.1, speed: 6, phase: -y }); }
      const bar = mesh(new T.BoxGeometry(0.5, 0.5, 2 * w), steel, { inkW: 0.7 }); bar.position.set(f.x, 11.8, f.z); bar.lookAt(p2[0], 11.8, p2[1]); arch.add(bar);
      const sg = PARK.neon(K, 'THE COMET', { w: 9, h: 2.1, col: '#ffcf4a', col2: '#ff6ab0', k: 2.6 }); sg.position.set(f.x, 13.4, f.z); sg.rotation.y = Math.atan2(-f.tx, -f.tz); arch.add(sg);
      const star = mesh(new T.CylinderGeometry(1.1, 1.1, 0.2, 5).rotateX(Math.PI / 2), PARK.flatM('#ffd24a', 1.8)); star.position.set(f.x, 15.6, f.z); star.rotation.y = Math.atan2(-f.tx, -f.tz); arch.add(star); star.userData.live = true; K.tick(dt => { star.rotation.z += dt * 1.5; });
      hideNear(K, arch, [V(f.x, 11.8, f.z), V(p1[0], 11.8, p1[1]), V(p2[0], 11.8, p2[1])], 5);
      sign(K, 'LOW FLYING COMETS', '#2f2a6a', '#ffd24a', 'MIND YOUR HEADS', { x: TR.pos(s0 - 6, -(WALL(f) + 3))[0], z: TR.pos(s0 - 6, -(WALL(f) + 3))[1], yaw: Math.atan2(-f.tx, -f.tz), w: 3.6 });
    }
    flume(K, B);
    ramp(K, B);
  };

  // the log flume's channel: running water between stone kerbs, log boats riding it into a tunnel, ducks in the ford
  function flume(K, B) {
    const W = C.W, pts2 = TR.FLUME.map(p => V(p[0], 0.1, p[1])), cv = new T.CatmullRomCurve3(pts2, false, 'centripetal'), L = cv.getLength(), n = Math.ceil(L / 1);
    const pos = [], uv = [], idx = [], WD = 2.1, kerbs = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, p = cv.getPointAt(u), t = cv.getTangentAt(u), rx = -t.z, rz = t.x;
      pos.push(p.x - rx * WD, 0.1, p.z - rz * WD, p.x + rx * WD, 0.1, p.z + rz * WD); uv.push(0, u * L / 6, 1, u * L / 6);
      if (i) { const j = i * 2; idx.push(j - 2, j, j - 1, j - 1, j, j + 1); }
      if (i % 1 === 0) for (const sx of [-1, 1]) { const x = p.x + rx * sx * (WD + 0.35), z = p.z + rz * sx * (WD + 0.35); if (C.clear(x, z, 0.1)) kerbs.push([x, z, Math.atan2(t.x, t.z)]); }
    }
    const water = K3D.paint('pkp-flumeWater', 128, 256, (c, w, h) => {
      c.fillStyle = '#1e3a7a'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) { c.strokeStyle = `rgba(${150 + Math.random() * 100},${200 + Math.random() * 55},255,${0.25 + Math.random() * 0.4})`; c.lineWidth = 1 + Math.random() * 2.5; const x = Math.random() * w, y = Math.random() * h; c.beginPath(); c.moveTo(x - 8, y); c.quadraticCurveTo(x, y - 6, x + 8, y); c.stroke(); }
    }, { repeat: true });
    const wm = K3D.flat('#9ab8ff', { map: water }); wm.polygonOffset = true; wm.polygonOffsetFactor = -2; wm.polygonOffsetUnits = -2;
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const wmesh = new T.Mesh(g, wm); wmesh.renderOrder = 1; wmesh.userData.live = true; K.add(wmesh);
    K.tick(dt => { water.offset.y -= dt * 0.35; });
    const km = new T.InstancedMesh(K3D.geo('pkp-kerbStone', () => K3D.roundBox(0.6, 0.45, 1.05, 0.12, 6).translate(0, 0.2, 0)), toonM('#7a7690'), kerbs.length);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), Y = V(0, 1, 0);
    kerbs.forEach((k, i) => { m4.compose(V(k[0], 0, k[1]), q.setFromAxisAngle(Y, k[2]), V(1, 0.85 + (i % 3) * 0.1, 1)); km.setMatrixAt(i, m4); });
    K3D.ink(km, C.INK, 0.5); K.add(km);
    // the ford: where the low line crosses, a wider shallow pool over the road (the karts' wheels go under)
    const Fd = TR.ford; let bf = 0, bd = 1e9; for (let bs = 0; bs < Fd.len; bs += 0.5) { const p = Fd.at(bs); for (let i = 0; i <= 40; i++) { const c2 = cv.getPointAt(i / 40); const d = Math.hypot(c2.x - p.x, c2.z - p.z); if (d < bd) { bd = d; bf = bs; } } }
    W.fordAt = bf;
    { const p = Fd.at(bf), pool = new T.Mesh(new T.CircleGeometry(4.6, 32).rotateX(-Math.PI / 2), K3D.flat('#9ab8ff', { map: water, transparent: true, opacity: 0.82, depthWrite: false })); pool.position.set(p.x, 0.16, p.z); pool.scale.set(1, 1, 1.5); pool.rotation.y = p.yaw; pool.renderOrder = 2; pool.userData.live = true; K.add(pool); W.fordPool = [p.x, p.z];
      // stepping stones either side and a sign
      sign(K, 'FORD', '#2f6a5a', '#ffd24a', 'SLOW - DUCKS', { x: TR.ford.at(4).x + TR.ford.at(4).rx * -3.6, z: TR.ford.at(4).z + TR.ford.at(4).rz * -3.6, yaw: Math.atan2(-TR.ford.at(4).tx, -TR.ford.at(4).tz), w: 2.6, h: 1.8 });
    }
    // rubber ducks bobbing in the channel by the ford, log boats riding the current into the tunnel
    const duckM = toonM('#ffd23a'), beakM = toonM('#ff8a2a'), ducks = [];
    for (let i = 0; i < 5; i++) {
      const u = 0.3 + i * 0.07, p = cv.getPointAt(u), t = cv.getTangentAt(u), d = new T.Group(); d.userData.live = true;
      const body = mesh(K3D.geo('pkp-duckB', () => new T.SphereGeometry(0.55, 14, 10).scale(1.2, 0.8, 1)), duckM, { inkW: 0.6 }); d.add(body);
      const head = mesh(K3D.geo('pkp-duckH', () => new T.SphereGeometry(0.34, 12, 10)), duckM, { inkW: 0.6 }); head.position.set(0.45, 0.55, 0); d.add(head);
      const bk = mesh(K3D.geo('pkp-duckK', () => new T.ConeGeometry(0.12, 0.3, 8).rotateZ(-Math.PI / 2)), beakM, { inkW: 0.4 }); bk.position.set(0.82, 0.52, 0); d.add(bk);
      for (const sz of [-1, 1]) { const e = new T.Mesh(K3D.geo('pkp-duckE', () => new T.SphereGeometry(0.06, 8, 6)), toonM('#1a1530')); e.position.set(0.66, 0.66, sz * 0.18); d.add(e); }
      d.position.set(p.x + (i % 2 ? 0.9 : -0.9) * -t.z, 0.25, p.z + (i % 2 ? 0.9 : -0.9) * t.x); d.rotation.y = Math.atan2(t.x, t.z) - Math.PI / 2 + i; K.add(d); ducks.push({ d, ph: i * 1.7, y: 0.25 });
    }
    const barkM = K3D.toon('#ffffff', { map: PARK.wood('#7a4a2a') }), logs = [];
    for (let i = 0; i < 3; i++) {
      const g = new T.Group(); g.userData.live = true; K.add(g);
      const hull = mesh(K3D.geo('pkp-logHull', () => new T.CylinderGeometry(0.75, 0.75, 3.6, 14, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI)), barkM, { inkW: 0.7 }); hull.material.side = T.DoubleSide; hull.position.y = 0.55; g.add(hull);
      const seat = mesh(K3D.geo('pkp-logSeat', () => new T.BoxGeometry(1.2, 0.12, 0.5)), toonM('#c9a06a')); seat.position.y = 0.3; g.add(seat);
      const end = mesh(K3D.geo('pkp-logEnd', () => new T.CircleGeometry(0.75, 14, 0, Math.PI).rotateZ(Math.PI)), toonM('#c9905a')); end.position.set(0, 0.55, 1.8); g.add(end);
      logs.push({ g, u: i / 3 });
    }
    // the tunnel the logs go into (at the channel's far end), stone with bulbs round its mouth
    { const e = cv.getPointAt(1), t = cv.getTangentAt(1), tg = new T.Group(); tg.position.set(e.x, 0, e.z); tg.rotation.y = Math.atan2(t.x, t.z); K.add(tg);
      const arch = mesh(new T.TorusGeometry(2.8, 0.6, 8, 20, Math.PI), toonM('#6a6488'), { inkW: 0.8 }); tg.add(arch);
      const back = mesh(new T.BoxGeometry(8, 5, 6), toonM('#4a4566'), { inkW: 0.8 }); back.position.set(0, 2.2, 3.4); tg.add(back);
      const dk = new T.Mesh(new T.CircleGeometry(2.3, 20, 0, Math.PI), PARK.flatM('#05030a', 1)); dk.position.z = 0.4; tg.add(dk);
      tg.updateMatrixWorld(true); for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI, p = V(Math.cos(a) * 3.5, Math.sin(a) * 3.5, -0.3).applyMatrix4(tg.matrixWorld); B.add(p.x, p.y, p.z, i % 2 ? '#7ae8ff' : '#ffe07a', { size: 0.14, speed: 3, phase: i }); }
    }
    let t = 0;
    K.tick(dt => {
      t += dt;
      for (const d of ducks) { d.d.position.y = d.y + Math.sin(t * 2 + d.ph) * 0.06; d.d.rotation.z = Math.sin(t * 1.6 + d.ph) * 0.08; }
      for (const l of logs) { l.u = (l.u + dt * 3.2 / L) % 1; const p = cv.getPointAt(l.u), tg = cv.getTangentAt(l.u); l.g.position.set(p.x, 0.05 + Math.sin(t * 2.4 + l.u * 30) * 0.05, p.z); l.g.rotation.set(0, Math.atan2(tg.x, tg.z), Math.sin(t * 1.7 + l.u * 20) * 0.05); l.g.visible = l.u > 0.01 && l.u < 0.985; }
    });
  }

  // the wooden ramp over the channel: plank run-up with chevrons, the lip, the open gap, the landing; hazard rails
  function ramp(K, B) {
    const W = C.W, RP = W.RAMP, Wd = f => f.hw + TR.VERGE;
    const planks = K3D.paint('pkp-rampPlanks', 256, 256, (c, w, h) => {
      c.fillStyle = '#8a6040'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) { c.fillStyle = y % 32 ? '#7a5236' : '#94684a'; c.fillRect(0, y, w, 14); c.fillStyle = '#4a3020'; c.fillRect(0, y + 14, w, 2); for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(40,24,16,0.5)'; c.fillRect(Math.random() * w, y + 4, 2, 6); } }
      c.fillStyle = '#ffd24a'; for (const cx of [w * 0.25, w * 0.75]) { c.beginPath(); c.moveTo(cx - 40, 210); c.lineTo(cx, 130); c.lineTo(cx + 40, 210); c.lineTo(cx + 26, 210); c.lineTo(cx, 158); c.lineTo(cx - 26, 210); c.closePath(); c.fill(); }
    }, { repeat: true });
    const hazard = K3D.paint('pkp-hazard', 256, 64, (c, w, h) => { c.fillStyle = '#1a1626'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd24a'; for (let x = -h; x < w + h; x += 48) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 24, h); c.lineTo(x + 24 + h, 0); c.lineTo(x + h, 0); c.closePath(); c.fill(); } }, { repeat: true });
    const pm = K3D.toon('#ffffff', { map: planks, side: T.DoubleSide }), side = K3D.toon('#ffffff', { map: PARK.wood('#5a3a2a'), side: T.DoubleSide }), hz = K3D.toon('#ffffff', { map: hazard, side: T.DoubleSide });
    for (const [a, b] of [[RP.s0, RP.lip], [RP.land, RP.s1]]) {
      C.strip(K, pm, null, a, b, f => -Wd(f) - 0.1, f => Wd(f) + 0.1, { vLen: 5, y: 0.06 });
      for (const sx of [-1, 1]) {
        curtain(K, side, a, b, f => sx * (Wd(f) + 0.1), 0, s => W.Y(s) + 0.06, { uLen: 3, vLen: 3 });
        curtain(K, hz, a, b, f => sx * (Wd(f) + 0.15), s => W.Y(s) + 0.06, s => W.Y(s) + 0.7, { uLen: 2.5 });
      }
      // the faces at the gap: the lip (a hazard-striped edge) and the landing's front
      const s = a === RP.s0 ? b : a, f = TR.at(s), y = W.Y(s), wd = Wd(f) + 0.15;
      const face = mesh(new T.BoxGeometry(2 * wd, y + 0.06, 0.25), side, { inkW: 0.7 }); face.position.set(f.x, (y + 0.06) / 2, f.z); face.rotation.y = f.yaw + Math.PI / 2 * 0; face.lookAt(f.x + f.rx, (y + 0.06) / 2, f.z + f.rz); face.rotateY(Math.PI / 2); K.add(face);
      const edge = mesh(new T.BoxGeometry(2 * wd, 0.2, 0.3), K3D.toon('#ffffff', { map: hazard }), { inkW: 0.5 }); edge.position.set(f.x, y, f.z); edge.lookAt(f.x + f.rx, y, f.z + f.rz); edge.rotateY(Math.PI / 2); K.add(edge);
      for (let k = 0; k <= 12; k++) { const p = TR.pos(s, -wd + 2 * wd * k / 12); B.add(p[0], y + 0.2, p[1], k % 2 ? '#ffd24a' : '#ff6a4a', { size: 0.1, speed: 8, phase: k * 0.5 }); }
      // trestle posts under the slope
      for (let q = a + 2; q < b; q += 3) for (const sx of [-1, 1]) { const p = TR.pos(q, sx * (Wd(TR.at(q)) - 0.6)); const pst = mesh(K3D.geo('pkp-rampPost', () => new T.BoxGeometry(0.25, 1, 0.25).translate(0, 0.5, 0)), toonM('#4a3020')); pst.scale.y = Math.max(0.1, W.Y(q)); pst.position.set(p[0], 0, p[1]); K.add(pst); }
    }
    // JUMP! in neon beside the lip, and a robot with a chequered flag at the landing
    const f = TR.at(RP.lip - 2), w = Wd(f) + 2.4, p = TR.pos(RP.lip - 2, w);
    const sg = PARK.neon(K, 'JUMP!', { w: 4, h: 1.6, col: '#ffd24a', col2: '#ff4a6a', k: 2.8 }); sg.position.set(p[0], 4.8, p[1]); sg.rotation.y = Math.atan2(-f.tx, -f.tz) + 0.5; K.add(sg);
    const post = mesh(new T.CylinderGeometry(0.14, 0.18, 4, 8), toonM('#3b3456')); post.position.set(p[0], 2, p[1]); K.add(post);
    const f2 = TR.at(RP.s1 + 2), p2 = TR.pos(RP.s1 + 2, -(Wd(f2) + 1.6)), rb = PARK.robot(K, { col: '#3a8fd8' }); rb.position.set(p2[0], 0, p2[1]); rb.rotation.y = Math.atan2(f2.rx, f2.rz);
    const flag = mesh(new T.PlaneGeometry(0.9, 0.6), K3D.toon('#ffffff', { map: C.chequer(4, 3), side: T.DoubleSide }), { inkW: 0.4 }); flag.position.set(0.45, -0.95, 0); rb.userData.broom.add(flag); rb.userData.broom.children.forEach(c => { if (c !== flag) c.visible = false; });
    K.tick(dt => { rb.userData.broom.rotation.z = Math.sin(performance.now() * 0.008) * 0.8; rb.userData.key.rotation.z += dt * 4; });
  }

  /* ================= The Funhouse ================= */
  P.funhouse = function (K, B, ctx) {
    C = ctx; const W = C.W, FH = W.FUN, Wd = f => f.hw + TR.VERGE, WALL = f => Wd(f) + 0.35, TOP = s => W.Y(s) + 7.6;
    // the outside: tall panels, purple and teal with painted stars and moons (the walls and roof are one building)
    const outTex = K3D.paint('pkp-funWall', 256, 256, (c, w, h) => {
      c.fillStyle = '#4a2f8a'; c.fillRect(0, 0, w, h); c.fillStyle = '#2f6a7a'; c.fillRect(0, 0, w / 2, h);
      c.fillStyle = '#1a1530'; c.fillRect(w / 2 - 3, 0, 6, h); c.fillRect(0, h - 8, w, 8);
      c.fillStyle = '#ffd24a'; for (const [x, y, r] of [[60, 70, 16], [190, 150, 20], [70, 200, 10], [200, 50, 9]]) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); }
      c.fillStyle = '#f4ecd8'; c.beginPath(); c.arc(140, 110, 22, 0, 7); c.fill(); c.fillStyle = '#4a2f8a'; c.beginPath(); c.arc(150, 104, 20, 0, 7); c.fill();
    }, { repeat: true });
    const outM = K3D.toon('#ffffff', { map: outTex, side: T.DoubleSide });
    // inside, by room: the barrel (hidden by its rings), the black-light walls (dark with glowing splashes), mirrors
    const uvTex = K3D.paint('pkp-uvWall', 256, 256, (c, w, h) => {
      c.fillStyle = '#0c0818'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) { c.fillStyle = ['#7affd4', '#ff4ad8', '#d8ff4a', '#4ad8ff'][i % 4]; c.globalAlpha = 0.85; const x = Math.random() * w, y = Math.random() * h, r = 4 + Math.random() * 14; c.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, rr = r * (0.6 + Math.random() * 0.6); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); }
      c.globalAlpha = 1; c.strokeStyle = '#7affd4'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, 40 + i * 60); for (let x = 0; x < w; x += 16) c.lineTo(x, 40 + i * 60 + Math.sin(x * 0.05 + i) * 10); c.stroke(); }
    }, { repeat: true });
    const mirTex = K3D.paint('pkp-mirror', 128, 256, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#b8c8f0'); g.addColorStop(0.45, '#e8f0ff'); g.addColorStop(0.55, '#8a9ad8'); g.addColorStop(1, '#c8d4f8'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      // a smeared reflection of bulbs and the far end of the hall
      for (let i = 0; i < 18; i++) { c.fillStyle = ['rgba(255,220,120,0.6)', 'rgba(255,120,200,0.5)', 'rgba(120,255,220,0.5)'][i % 3]; c.beginPath(); c.arc(Math.random() * w, 20 + Math.random() * 60, 3 + Math.random() * 4, 0, 7); c.fill(); }
      c.fillStyle = 'rgba(60,50,110,0.45)'; c.fillRect(w * 0.3, h * 0.45, w * 0.4, h * 0.4);
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 6; c.beginPath(); c.moveTo(w * 0.15, h); c.lineTo(w * 0.55, 0); c.stroke(); c.lineWidth = 2; c.beginPath(); c.moveTo(w * 0.3, h); c.lineTo(w * 0.7, 0); c.stroke();
      c.strokeStyle = '#d8a63a'; c.lineWidth = 10; c.strokeRect(0, 0, w, h);
    });
    const s0 = FH.mouth, s1 = FH.door;
    for (const sx of [-1, 1]) {
      curtain(K, outM, s0, s1, f => sx * WALL(f), -0.1, TOP, { uLen: 6, vLen: 6 });
      curtain(K, K3D.flat('#ffffff', { map: uvTex, side: T.DoubleSide }), FH.barrel1, FH.up1 + 1, f => sx * (WALL(f) - 0.08), s => W.Y(s), TOP, { uLen: 5, vLen: 5 });
    }
    // floors from wall to wall (the top storey is high above the ground: nothing to see down through)
    const floorBarrel = K3D.toon('#ffffff', { map: PARK.stripes('#d8483a', '#f4ecd8', 8), side: T.DoubleSide });
    const cheq = K3D.paint('pkp-uvCheq', 256, 256, (c, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#0a0614' : '#1c1238'; c.fillRect(i * 32, j * 32, 32, 32); } c.strokeStyle = '#7affd4'; c.lineWidth = 2; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 32); c.lineTo(w, i * 32); c.stroke(); } }, { repeat: true });
    const boards = K3D.toon('#ffffff', { map: PARK.wood('#a07a5a'), side: T.DoubleSide });
    C.strip(K, floorBarrel, null, s0, FH.barrel1, f => -WALL(f), f => WALL(f), { vLen: 8, y: 0.07, offset: 2 });
    C.strip(K, K3D.flat('#ffffff', { map: cheq, side: T.DoubleSide }), null, FH.barrel1, FH.up1 + 1, f => -WALL(f), f => WALL(f), { vLen: 9, y: 0.07, offset: 2 });
    C.strip(K, boards, null, FH.up1 + 1, s1, f => -WALL(f), f => WALL(f), { vLen: 5, y: 0.07, offset: 2 });
    // glowing arrows on the black-light floor (the only things that show in the dark, with the karts and boxes)
    const arrow = K3D.paint('pkp-uvArrow', 128, 128, (c, w, h) => { c.fillStyle = '#7affd4'; c.beginPath(); c.moveTo(20, 110); c.lineTo(64, 20); c.lineTo(108, 110); c.lineTo(84, 110); c.lineTo(64, 66); c.lineTo(44, 110); c.closePath(); c.fill(); });
    for (let s = FH.barrel1 + 4; s < FH.up1; s += 6) for (const lat of [-2.2, 2.2]) {
      const f = TR.at(s), p = TR.pos(s, lat), y = W.Y(s), dy = W.Y(s + 1) - W.Y(s - 1);
      const m = new T.Mesh(K3D.geo('pkp-arrowQ', () => new T.PlaneGeometry(1.6, 1.6).rotateX(-Math.PI / 2)), K3D.flat(hot('#ffffff', 2.2), { map: arrow, transparent: true, depthWrite: false }));
      m.position.set(p[0], y + 0.12, p[1]); m.rotation.order = 'YXZ'; m.rotation.y = Math.atan2(f.tx, f.tz) + Math.PI; m.rotation.x = Math.atan2(dy, 2); m.renderOrder = 2; K.add(m);
    }
    // ultraviolet stars hanging in the dark, glowing tubes along the walls
    for (let s = FH.barrel1 + 2; s < FH.up1; s += 2.4) for (const sx of [-1, 1]) { const f = TR.at(s), p = TR.pos(s, sx * (WALL(f) - 0.3)); B.add(p[0], W.Y(s) + 5.2 + Math.sin(s) * 0.8, p[1], ['#b48aff', '#7affd4', '#ff4ad8'][Math.floor(s) % 3], { size: 0.12, speed: 1.5, phase: s }); }
    // the spinning barrel: rings round the road (the floor stays level, the walls turn)
    const barrelTex = K3D.paint('pkp-barrel', 256, 256, (c, w, h) => { c.fillStyle = '#f4ecd8'; c.fillRect(0, 0, w, h); c.fillStyle = '#d8483a'; for (let i = -4; i < 8; i++) { c.beginPath(); c.moveTo(i * 48, 0); c.lineTo(i * 48 + 24, 0); c.lineTo(i * 48 + 24 + 96, h); c.lineTo(i * 48 + 96, h); c.closePath(); c.fill(); } c.fillStyle = '#ffd24a'; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(16 + i * 32, 128 + Math.sin(i) * 60, 6, 0, 7); c.fill(); } });
    const bm = K3D.toon('#ffffff', { map: barrelTex, side: T.DoubleSide }), rings = [];
    for (let s = FH.barrel0; s < FH.barrel1; s += 2.4) {
      const f = TR.at(s), R = WALL(f) - 0.25, g = new T.Group(); g.position.set(f.x, W.Y(s) + R * 0.62, f.z); g.rotation.y = Math.atan2(f.tx, f.tz); g.userData.live = true; K.add(g);
      const r = new T.Mesh(K3D.geo('pkp-ring|' + R.toFixed(1), () => new T.CylinderGeometry(R, R, 2.3, 40, 1, true).rotateX(Math.PI / 2)), bm); g.add(r);
      const rim = mesh(K3D.geo('pkp-rim|' + R.toFixed(1), () => new T.TorusGeometry(R, 0.12, 6, 40)), toonM('#ffd24a'), { inkW: 0.4 }); rim.position.z = 1.15; g.add(rim);
      rings.push(r, rim);
    }
    K.tick(dt => { for (const r of rings) r.rotation.z += dt * 1.1; });
    // the hall of mirrors: panels set in a saw-tooth down both sides; one false turning (a mirror that shows the way
    // on, painted arrows into it) ending at a padded wall
    const mirM = K3D.toon('#ffffff', { map: mirTex, emissive: '#6a78c8', emissiveIntensity: 0.35 });
    const falseS = (FH.mirror0 + FH.mirror1) / 2, falseSide = TR.at(falseS).turn >= 0 ? 1 : -1;
    W.falseTurn = { s0: falseS - 3, s1: falseS + 3, side: falseSide };
    for (let s = FH.mirror0; s < FH.mirror1; s += 2.6) for (const sx of [-1, 1]) {
      if (sx === falseSide && Math.abs(s - falseS) < 3.2) continue;
      const f = TR.at(s), la = sx * (WALL(f) - 0.25), p = TR.pos(s, la), y = W.Y(s);
      const m = mesh(K3D.geo('pkp-mirP', () => new T.BoxGeometry(2.5, 4.6, 0.12)), [toonM('#d8a63a'), toonM('#d8a63a'), toonM('#d8a63a'), toonM('#d8a63a'), mirM, toonM('#3a2f4a')], { inkW: 0.5 });
      m.position.set(p[0], y + 2.5, p[1]); m.rotation.y = Math.atan2(-f.rx * sx, -f.rz * sx) + (Math.floor(s / 2.6) % 2 ? 0.18 : -0.18); K.add(m);
      B.add(p[0], y + 4.95, p[1], '#ffe07a', { size: 0.1, speed: 2, phase: s });
    }
    { const f = TR.at(falseS), la = falseSide * WALL(f), p = TR.pos(falseS, la), y = W.Y(falseS), yaw = Math.atan2(-f.rx * falseSide, -f.rz * falseSide);
      // the alcove: two mirrors angled in, a pink padded wall at the back, arrows saying this way
      const g = new T.Group(); g.position.set(p[0], y, p[1]); g.rotation.y = yaw; K.add(g);
      const pad = mesh(K3D.roundBox(5.4, 3.4, 0.9, 0.4, 12), toonM('#ff8ab0'), { inkW: 0.8 }); pad.position.set(0, 1.9, -0.6); g.add(pad);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const bt = mesh(K3D.geo('pkp-button', () => new T.SphereGeometry(0.1, 8, 6)), toonM('#c84a7a')); bt.position.set(-1.6 + i * 1.6, 1.2 + j * 1.4, -0.12); g.add(bt); }
      for (const sx of [-1, 1]) { const m = mesh(K3D.geo('pkp-mirP2', () => new T.BoxGeometry(2.8, 4.6, 0.12)), [toonM('#d8a63a'), toonM('#d8a63a'), toonM('#d8a63a'), toonM('#d8a63a'), mirM, toonM('#3a2f4a')], { inkW: 0.5 }); m.position.set(sx * 3.4, 2.5, 0.2); m.rotation.y = -sx * 0.55; g.add(m); }
      const oops = PARK.neon(K, 'THIS WAY!', { w: 3.2, h: 0.8, col: '#7affd4', col2: '#ff4ad8', k: 2.4 }); oops.position.set(0, 4.3, -0.1); g.add(oops);
      const sg = PARK.neon(K, 'OOPS', { w: 1.8, h: 0.7, col: '#ff4ad8', col2: '#ffd24a', k: 1.8, board: false }); sg.position.set(0, 2.0, -0.12); g.add(sg);
      for (let k = 0; k < 2; k++) C.decal(K, arrow, falseS - 1.5 + k * 1.8, falseSide * 2.9, 1.3, 1.3, { rot: Math.PI - falseSide * 0.9, k: 1.4, y: 0.1 });
    }
    // the roof: one sheet with a ridge of bulbs and onion domes along the eaves; it lifts away while a kart is inside
    const roof = new T.Group(); K.add(roof);
    C.strip({ add: o => roof.add(o) }, K3D.toon('#ffffff', { map: PARK.stripes('#2f6a7a', '#4a2f8a', 10), side: T.DoubleSide }), null, s0, s1, f => -WALL(f) - 0.6, f => WALL(f) + 0.6, { vLen: 6, y: 7.62 });
    const domeM = toonM('#ffd24a'), domeR = toonM('#d8483a');
    for (let s = s0 + 2; s < s1; s += 10) for (const sx of [-1, 1]) {
      const f = TR.at(s), p = TR.pos(s, sx * (WALL(f) + 0.2)), y = TOP(s);
      const tw = mesh(K3D.geo('pkp-turret', () => new T.CylinderGeometry(0.9, 1.0, 2.2, 12)), domeR, { inkW: 0.6 }); tw.position.set(p[0], y + 1.1, p[1]); roof.add(tw);
      const dm = mesh(K3D.geo('pkp-dome', () => new T.SphereGeometry(1.1, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.5, 1)), domeM, { inkW: 0.6 }); dm.position.set(p[0], y + 2.2, p[1]); roof.add(dm);
      const sp = mesh(K3D.geo('pkp-spire', () => new T.ConeGeometry(0.12, 1.2, 6)), domeM); sp.position.set(p[0], y + 4.3, p[1]); roof.add(sp);
    }
    roof.userData.live = true;
    const roofBulbs = [];
    for (let s = s0; s < s1; s += 1.2) for (const sx of [-1, 1]) { const f = TR.at(s), p = TR.pos(s, sx * (WALL(f) + 0.6)); roofBulbs.push([p[0], TOP(s) + 0.1, p[1]]); }
    for (const b of roofBulbs) B.add(b[0], b[1], b[2], '#ffe07a', { size: 0.12, speed: 4, phase: b[0] * 0.3 });
    let rk = 1;
    K.tick(dt => { const st = G.mst; let inside = false; if (st && st.karts) for (const k of st.karts) if (k.on < 0 && k.s > s0 - 4 && k.s < s1 + 2) inside = true; const cam = K.camera.position, cn = TR.near(cam.x, cam.z, (s0 + s1) / 2); if (cn.s > s0 - 2 && cn.s < s1 + 2 && Math.abs(cn.lat) < 9) inside = true; rk += ((inside ? 0 : 1) - rk) * Math.min(1, dt * 4); roof.visible = rk > 0.05; roof.position.y = (1 - rk) * 9; });
    W.funRoof = roof;
    // the facade: the laughing moon over the way in, its open mouth the door (teeth above, the tongue a red carpet)
    facade(K, B);
    // the exit at the top and the slide down onto the pier
    slide(K, B);
  };
  function facade(K, B) {
    const W = C.W, FH = W.FUN, s = FH.mouth, f = TR.at(s), Wd = f.hw + TR.VERGE + 0.35, g = new T.Group();
    g.position.set(f.x, 0, f.z); g.rotation.y = Math.atan2(-f.tx, -f.tz); K.add(g);
    const wallM = K3D.toon('#ffffff', { map: PARK.stripes('#5d3a9a', '#2f2a6a', 12, { v: true }) });
    const span = 34, hh = 19, door = 7.2;
    for (const sx of [-1, 1]) { const w = span / 2 - Wd; const blk = mesh(new T.BoxGeometry(w, hh, 1.4), wallM, { inkW: 1 }); blk.position.set(sx * (Wd + w / 2), hh / 2, 0); g.add(blk); }
    const lintel = mesh(new T.BoxGeometry(2 * Wd + 0.1, hh - door, 1.4), wallM, { inkW: 1 }); lintel.position.set(0, door + (hh - door) / 2, 0); g.add(lintel);
    // the moon's face
    const face = new T.Group(); face.position.set(0, 12.2, 0.8); g.add(face);
    const disc = mesh(new T.CylinderGeometry(9, 9, 1.2, 48).rotateX(Math.PI / 2), K3D.toon('#ffe27a', { emissive: '#8a6a10', emissiveIntensity: 0.45 }), { inkW: 1.4 }); face.add(disc);
    const pupils = [];
    for (const sx of [-1, 1]) {
      const eye = mesh(new T.SphereGeometry(1.7, 20, 14), toonM('#ffffff'), { inkW: 0.8 }); eye.scale.z = 0.4; eye.position.set(sx * 3.4, 2.6, 0.7); face.add(eye);
      const pu = new T.Mesh(new T.SphereGeometry(0.8, 14, 10), toonM('#2a2235')); pu.scale.z = 0.4; pu.position.set(sx * 3.4, 2.4, 1.3); face.add(pu); pupils.push({ pu, x: sx * 3.4 });
      const brow = mesh(new T.TorusGeometry(1.9, 0.18, 6, 16, Math.PI * 0.7), toonM('#8a5a10'), { inkW: 0.5 }); brow.position.set(sx * 3.4, 3.6, 0.8); brow.rotation.z = Math.PI * 0.15; face.add(brow);
      const cheek = new T.Mesh(new T.CircleGeometry(1.1, 16), PARK.flatM('#ff8ab0', 0.9)); cheek.position.set(sx * 5.4, -0.4, 0.65); face.add(cheek);
    }
    // the grin: a wide red lip curving down round the door, big teeth hanging over the road
    const lip = mesh(new T.TorusGeometry(Wd + 0.6, 0.6, 10, 40, Math.PI), toonM('#c83a4a'), { inkW: 0.9 }); lip.rotation.z = Math.PI; lip.position.set(0, door + 0.2, 1.0); lip.scale.set(1, 0.32, 1); g.add(lip);
    for (const sx of [-1, 1]) { const tooth = mesh(K3D.roundBox(1.6, 1.4, 0.5, 0.25, 8), toonM('#fbf7ec'), { inkW: 0.7 }); tooth.position.set(sx * 1.0, door - 0.3, 0.9); g.add(tooth); }
    g.updateMatrixWorld(true);
    // the tongue: a red carpet into the dark
    C.strip(K, K3D.toon('#ffffff', { map: PARK.stripes('#c83a4a', '#a82a3a', 4), side: T.DoubleSide }), null, s - 1, s + 6, -2.4, 2.4, { y: 0.09, offset: 3, vLen: 3 });
    const ha = PARK.neon(K, 'HA HA HA!', { w: 7, h: 1.6, col: '#ff4ad8', col2: '#ffd24a', k: 2.6, board: false }); ha.position.set(0, 4.2 + 12.2, 1.6); ha.rotation.z = 0.08; g.add(ha);
    const sg = PARK.neon(K, 'FUNHOUSE', { w: 14, h: 3, col: '#7affd4', col2: '#ff6ab0', k: 2.6 }); sg.position.set(0, hh + 2.2, 0.8); g.add(sg);
    const w2 = (x, y, z, o = face) => { const q = V(x, y, z).applyMatrix4(o.matrixWorld); return [q.x, q.y, q.z]; };
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; B.add(...w2(Math.cos(a) * 9.6, Math.sin(a) * 9.6, 0.8), i % 2 ? '#ffffff' : '#ffd24a', { size: 0.26, speed: 4, phase: i * 0.5 }); }
    for (let i = 0; i <= 16; i++) { const x = -span / 2 + span * i / 16; B.add(...w2(x, hh + 0.2, 0.8, g), ['#ff4ad8', '#7affd4', '#ffd24a'][i % 3], { size: 0.2, speed: 5, phase: i }); }
    // it laughs: the face rocks, the HA HA HA blinks, the eyes follow the leader
    let t = 0; face.userData.live = true; ha.userData.live = true;
    K.tick(dt => { t += dt; face.rotation.z = Math.sin(t * 3.2) * 0.05; face.position.y = 12.2 + Math.abs(Math.sin(t * 6.4)) * 0.18; ha.visible = Math.floor(t * 2.5) % 3 !== 0; const st = G.mst; if (st && st.karts) { const k = st.karts[st.lead || 0], lp = face.worldToLocal(V(k.x, 1, k.z)); for (const p of pupils) { const dx = lp.x - p.x, dy = lp.y - 2.4, l = Math.hypot(dx, dy, lp.z) || 1; p.pu.position.x = p.x + dx / l * 0.7; p.pu.position.y = 2.4 + dy / l * 0.7; } } });
    hideNear(K, lintel, [V(f.x, door + 1, f.z)], 3.5);
  }
  function slide(K, B) {
    const W = C.W, FH = W.FUN, Wd = f => f.hw + TR.VERGE;
    // the door at the top (EXIT, and the way down)
    { const f = TR.at(FH.door), g = new T.Group(); g.position.set(f.x, W.Y(FH.door), f.z); g.rotation.y = Math.atan2(-f.tx, -f.tz); K.add(g);
      const fr = mesh(new T.TorusGeometry(Wd(f) + 0.4, 0.45, 8, 28, Math.PI), toonM('#ffd24a'), { inkW: 0.8 }); fr.scale.set(1, 0.85, 1); g.add(fr);
      const ex = PARK.neon(K, 'WHEEE!', { w: 5, h: 1.3, col: '#ffd24a', col2: '#ff4ad8', k: 1.6 }); ex.position.set(0, (Wd(f) + 0.4) * 0.85 + 1.2, 0.4); g.add(ex);
    }
    // the chute: shiny yellow with red sides, standing on posts down to the pier and the sand
    const chute = K3D.toon('#ffffff', { side: T.DoubleSide, map: K3D.paint('pkp-chute2', 128, 128, (c, w, h) => { c.fillStyle = '#ffd84a'; c.fillRect(0, 0, w, h); const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(200,110,20,0.55)'); g.addColorStop(0.25, 'rgba(255,255,255,0)'); g.addColorStop(0.45, 'rgba(255,252,230,0.6)'); g.addColorStop(0.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(200,110,20,0.55)'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#e8483a'; c.beginPath(); c.moveTo(w / 2 - 24, 100); c.lineTo(w / 2, 40); c.lineTo(w / 2 + 24, 100); c.lineTo(w / 2 + 12, 100); c.lineTo(w / 2, 72); c.lineTo(w / 2 - 12, 100); c.fill(); }, { repeat: true }) });
    C.strip(K, chute, null, FH.door, FH.slide1, f => -Wd(f) - 0.2, f => Wd(f) + 0.2, { y: 0.06, offset: 2, vLen: 3 });
    const sideM = K3D.toon('#ffffff', { map: PARK.stripes('#d8483a', '#f4ecd8', 6), side: T.DoubleSide });
    for (const sx of [-1, 1]) {
      curtain(K, sideM, FH.door - 1, FH.slide1 + 2, f => sx * (Wd(f) + 0.25), s => W.Y(s) - 0.5, s => W.Y(s) + 1.3, { uLen: 3 });
      for (let s = FH.door + 2; s < FH.slide1; s += 1.4) { const p = TR.pos(s, sx * (Wd(TR.at(s)) + 0.3)); B.add(p[0], W.Y(s) + 1.35, p[1], ['#ffd24a', '#ff4ad8', '#7ae8ff'][Math.floor(s) % 3], { size: 0.11, speed: 9, phase: -s * 0.6 }); }
      for (let s = FH.door + 3; s < FH.slide1 - 2; s += 4) { const p = TR.pos(s, sx * (Wd(TR.at(s)) + 0.1)); const pst = mesh(K3D.geo('pkp-slidePost', () => new T.CylinderGeometry(0.16, 0.2, 1, 8).translate(0, 0.5, 0)), toonM('#3b3456')); pst.scale.y = W.Y(s) - 0.45; pst.position.set(p[0], 0, p[1]); K.add(pst); }
    }
  }

  /* ================= The Pier ================= */
  P.pier = function (K, B, ctx) {
    C = ctx; const W = C.W, PIER = C.PIER, Wd = f => f.hw + TR.VERGE, s0 = TR.partS[4], s1 = TR.partS[5];
    // the wheel at the pier head: bigger, so it turns high over the loop round it
    if (W.pierWheel) W.pierWheel.g.scale.setScalar(1.5);
    // wet boards: a sheen down the road, puddles that hold the bulbs' light
    const sheen = K3D.paint('pkp-wetSheen', 128, 256, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { const g = c.createLinearGradient(0, 0, 0, 30); g.addColorStop(0, 'rgba(200,220,255,0)'); g.addColorStop(0.5, 'rgba(200,220,255,0.35)'); g.addColorStop(1, 'rgba(200,220,255,0)'); c.fillStyle = g; c.save(); c.translate(Math.random() * w, Math.random() * h); c.fillRect(-20, 0, 40 + Math.random() * 60, 30); c.restore(); } c.filter = 'blur(6px)'; c.drawImage(c.canvas, 0, 0); }, { repeat: true });
    let pa = null;
    for (let s = s0; s < s1; s += 1) { const on = W.Y(s) > PIER.y - 0.05; if (on && pa == null) pa = s; if ((!on || s >= s1 - 1) && pa != null) { C.strip(K, K3D.flat(hot('#ffffff', 0.3), { map: sheen, transparent: true, depthWrite: false, add: true, side: T.DoubleSide }), null, pa, s, f => -f.hw, f => f.hw, { y: 0.09, vLen: 10 }); pa = null; } }
    // the kit builds at ground level: its bulbs for things standing on the deck go up with them
    const BP = { add: (x, y, z, ...r) => B.add(x, y + PIER.y, z, ...r), line: (a, b, ...r) => B.line([a[0], a[1] + PIER.y, a[2]], [b[0], b[1] + PIER.y, b[2]], ...r) };
    // the broken railing at each gap: splintered ends, a DANGER board and a lifebuoy each side
    for (const gp of TR.gaps) for (const [s, end] of [[gp.s0, -1], [gp.s1, 1]]) {
      const f = TR.at(s), p = TR.pos(s, gp.side * (Wd(f) + 0.5)), y = W.Y(s);
      const sp = mesh(K3D.geo('pkp-splinter', () => new T.ConeGeometry(0.12, 0.9, 5)), toonM('#f4ecd8'), { inkW: 0.4 }); sp.position.set(p[0], y + 0.9, p[1]); sp.rotation.set(0.6 * end, f.yaw, 1.2); K.add(sp);
      const buoy = mesh(K3D.geo('pkp-buoy', () => new T.TorusGeometry(0.45, 0.16, 8, 16)), K3D.toon('#ffffff', { map: PARK.stripes('#e0403a', '#f4f0e8', 4) }), { inkW: 0.5 }); buoy.position.set(p[0], y + 1.6, p[1]); buoy.rotation.y = f.yaw + Math.PI / 2; K.add(buoy);
      const post = mesh(K3D.geo('pkp-buoyPost', () => new T.BoxGeometry(0.18, 2.2, 0.18).translate(0, 1.1, 0)), toonM('#f4ecd8'), { inkW: 0.5 }); post.position.set(p[0], y, p[1]); K.add(post);
      if (end < 0) { const bd = mesh(new T.BoxGeometry(1.6, 0.6, 0.06), K3D.toon('#ffffff', { map: C.boardTex('DANGER', '#c83a3a', '#2a1a1a', 'DEEP WATER') }), { inkW: 0.4 }); bd.position.set(p[0], y + 2.5, p[1]); bd.rotation.y = Math.atan2(-f.rx * gp.side, -f.rz * gp.side); K.add(bd); }
    }
    // stalls both sides: between the two runs down the pier (back to back) and along the outer edges
    const names = [['HOOK-A-DUCK', 0], ['FISH & CHIPS', 4], ['ROCK CANDY', 5], ['COCONUT SHY', 2], ['SEA SHELLS', 1], ['TOFFEE APPLES', 3], ['WHELKS', 4], ['BUCKET & SPADE', 0]];
    let ni = 0;
    for (let s = s0 + 12; s < s1 - 10; s += 9) {
      const f = TR.at(s); if (W.Y(s) < PIER.y - 0.05) continue;
      for (const sx of [-1, 1]) {
        const d = Wd(f) + 4.0, p = TR.pos(s, sx * d);
        if (Math.abs(p[0] - PIER.x) > PIER.w / 2 - 2.5 || p[1] < PIER.z1 + 3 || p[1] > PIER.z0 - 3) continue;
        if (!C.room(p[0], p[1], 2.4)) continue;
        if (Math.hypot(p[0] - PIER.x, p[1] + 299) < 15 || Math.hypot(p[0] - PIER.x - 1, p[1] + 258) < 6) continue; // the wheel's legs, the helter-skelter
        C.take(p[0], p[1], 2.6);
        const nm = names[ni++ % names.length], yaw = Math.atan2(-f.rx * sx, -f.rz * sx);
        const g = PARK.stall(K, BP, { x: p[0], z: p[1], yaw, c: nm[1], w: 4.4, d: 3 }); g.position.y = PIER.y;
        const ns = PARK.neon(K, nm[0], { w: 3.6, h: 0.75, col: ['#ffd24a', '#7ae8ff', '#ff8ab0'][ni % 3], col2: '#ffffff', k: 2.2, board: false }); ns.position.set(0, 4.15, 0.2); g.add(ns);
      }
    }
    // lamps along the pier, bulbs across the road, lifebuoys, crates and pots, a robot fishing off the end
    for (let s = s0 + 6; s < s1 - 6; s += 14) { const f = TR.at(s); if (W.Y(s) < PIER.y - 0.05) continue; const p1 = TR.pos(s, -(Wd(f) + 1.1)), p2 = TR.pos(s, Wd(f) + 1.1); for (const p of [p1, p2]) { const lp = PARK.lamp(K, BP, { x: p[0], z: p[1], moths: false, yaw: f.yaw }); lp.position.y = PIER.y; PARK.halo(K, p[0], PIER.y + 4.0, p[1], 3.2, '#ffe2a0', 0.35); } B.line([p1[0], PIER.y + 7.2, p1[1]], [p2[0], PIER.y + 7.2, p2[1]], 1.0, ['#ffe07a', '#ff8ab0', '#7ae8ff'], { speed: 4, step: 0.7, size: 0.12 }); }
    const crate = K3D.toon('#ffffff', { map: PARK.wood('#8a6a4a') });
    for (let i = 0; i < 16; i++) { const x = PIER.x + (i % 2 ? 1 : -1) * (PIER.w / 2 - 1.2 - (i % 3) * 0.6), z = PIER.z0 - 8 - i * 5.7; if (!C.room(x, z, 0.9)) continue; C.take(x, z, 0.9); const c2 = mesh(K3D.geo('pkp-crate', () => new T.BoxGeometry(1, 0.9, 1).translate(0, 0.45, 0)), crate, { inkW: 0.5 }); c2.position.set(x, PIER.y, z); c2.rotation.y = i; K.add(c2); if (i % 3 === 0) { const c3 = c2.clone(); c3.position.y += 0.9; c3.rotation.y += 0.4; K.add(c3); } }
    { const x = PIER.x + 6, z = PIER.z1 + 1.2, rb = PARK.robot(K, { col: '#e8a64a' }); rb.position.set(x, PIER.y, z); rb.rotation.y = Math.PI; const rod = rb.userData.broom; rod.rotation.x = -1.0; rod.children.forEach(c => { c.visible = false; }); const pole = mesh(new T.CylinderGeometry(0.03, 0.04, 3.2, 6).translate(0, 1.6, 0), toonM('#b88a4a')); pole.rotation.x = -0.4; rod.add(pole); const line = new T.Mesh(new T.CylinderGeometry(0.01, 0.01, 4, 4).translate(0, -2, 0), K3D.flat('#e8e0f4')); line.position.set(0, 3.0, -1.3); rod.add(line); K.tick(dt => { rod.rotation.x = -1.0 + Math.sin(performance.now() * 0.0012) * 0.08; rb.userData.key.rotation.z += dt * 2; }); }
    // gulls on the stall roofs and the lamp posts (they scatter as karts go by)
    if (PARK.gulls) { const list = []; for (let s = s0 + 10; s < s1 - 10; s += 23) { const f = TR.at(s); if (W.Y(s) < PIER.y - 0.05) continue; const p = TR.pos(s, (s % 2 ? 1 : -1) * (Wd(f) + 0.6)); list.push([p[0], PIER.y + 1.3, p[1]]); } W.gulls2 = PARK.gulls(K, list); }
  };

  /* ================= Spook Manor Lane ================= */
  P.spook = function (K, B, ctx) {
    C = ctx; const W = C.W, Wd = f => f.hw + TR.VERGE, s0 = TR.partS[5], s1 = TR.L - 75;
    // the plywood headstones in the road: cut-out boards painted grey, with a wooden prop behind each
    const ply = K3D.paint('pkp-plyStone', 128, 160, (c, w, h) => {
      c.fillStyle = '#8a8698'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(${60 + Math.random() * 60},${60 + Math.random() * 60},${80 + Math.random() * 60},0.25)`; c.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
      c.fillStyle = '#3a3448'; c.font = '900 40px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.fillText('R.I.P', w / 2, 70); c.font = '700 14px "DejaVu Sans", sans-serif'; c.fillText('BAD DRIVER', w / 2, 100);
      c.strokeStyle = '#3a3448'; c.lineWidth = 3; c.beginPath(); c.moveTo(20, 120); c.lineTo(50, 132); c.lineTo(40, 145); c.stroke();
    });
    const hsG = K3D.geo('pkp-plyHS', () => { const sh = new T.Shape(); sh.moveTo(-0.8, 0); sh.lineTo(-0.8, 1.2); sh.absarc(0, 1.2, 0.8, Math.PI, 0, true); sh.lineTo(0.8, 0); const g = new T.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false }); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 0.8) / 1.6, p.getY(i) / 2); return g; });
    for (const h of TR.stones) {
      const y = W.Y(h.s), g = new T.Group(); g.position.set(h.x, y, h.z); g.rotation.y = h.yaw + Math.PI; K.add(g);
      const b = mesh(hsG, K3D.toon('#ffffff', { map: ply }), { inkW: 0.8 }); b.position.z = -0.05; b.rotation.x = -0.08; g.add(b);
      const prop = mesh(K3D.geo('pkp-prop', () => new T.BoxGeometry(0.1, 1.6, 0.1)), toonM('#7a5236')); prop.position.set(0, 0.7, -0.55); prop.rotation.x = 0.55; g.add(prop);
      const sb = mesh(K3D.geo('pkp-sandbag', () => K3D.roundBox(0.7, 0.3, 0.45, 0.14, 6)), toonM('#8a7a5a')); sb.position.set(0, 0.15, -0.9); g.add(sb);
      PARK.halo(K, h.x, y + 0.6, h.z, 2.2, '#9affb0', 0.18);
    }
    // the neon ghost over the road on an iron gallows arch
    { const s = TR.ghost.s, f = TR.at(s), w = Wd(f) + 1.0, p1 = TR.pos(s, -w), p2 = TR.pos(s, w), arch = new T.Group(); K.add(arch);
      const iron = toonM('#1e1a2a');
      for (const p of [p1, p2]) { const post = mesh(new T.CylinderGeometry(0.22, 0.3, 11, 8), iron, { inkW: 0.7 }); post.position.set(p[0], 5.5, p[1]); arch.add(post); const cap = mesh(new T.SphereGeometry(0.4, 10, 8), iron); cap.position.set(p[0], 11.2, p[1]); arch.add(cap); }
      const bar = mesh(new T.BoxGeometry(0.3, 0.3, 2 * w), iron, { inkW: 0.6 }); bar.position.set(f.x, 10.8, f.z); bar.lookAt(p2[0], 10.8, p2[1]); arch.add(bar);
      const ghostTex = K3D.paint('pkp-ghostNeon', 256, 256, (c, w2, h2) => {
        c.clearRect(0, 0, w2, h2); c.lineCap = 'round'; c.lineJoin = 'round';
        const path = () => { c.beginPath(); c.moveTo(60, 200); c.lineTo(60, 110); c.bezierCurveTo(60, 30, 196, 30, 196, 110); c.lineTo(196, 200); for (let i = 0; i < 4; i++) c.quadraticCurveTo(196 - 17 - i * 34, 230 - (i % 2) * 40, 196 - 34 - i * 34, 200); };
        c.strokeStyle = 'rgba(154,255,176,0.35)'; c.lineWidth = 22; path(); c.stroke(); c.strokeStyle = '#eafff0'; c.lineWidth = 7; path(); c.stroke();
        c.fillStyle = '#eafff0'; c.beginPath(); c.ellipse(100, 110, 10, 16, 0, 0, 7); c.ellipse(156, 110, 10, 16, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(128, 152, 14, 18, 0, 0, 7); c.lineWidth = 6; c.stroke();
      });
      const gm = new T.Mesh(new T.PlaneGeometry(6, 6), new T.MeshBasicMaterial({ map: ghostTex, color: hot('#9affb0', 2.6), transparent: true, depthWrite: false, toneMapped: false, side: T.DoubleSide }));
      const gg = new T.Group(); gg.position.set(f.x, 7.2, f.z); gg.rotation.y = Math.atan2(-f.tx, -f.tz); gg.add(gm); gg.userData.live = true; arch.add(gg);
      const boo = PARK.neon(K, 'BOO!', { w: 2.6, h: 1, col: '#b48aff', col2: '#9affb0', k: 2.4, board: false }); boo.position.set(3.4, 1.6, 0.1); gg.add(boo);
      PARK.halo(K, f.x, 7.2, f.z, 12, '#9affb0', 0.22);
      for (const p of [p1, p2]) for (let k = 0; k < 3; k++) { const c2 = mesh(K3D.geo('pkp-chain', () => new T.TorusGeometry(0.12, 0.03, 4, 8)), iron); c2.position.set(f.x + (p[0] - f.x) * 0.45, 10.4 - k * 0.22, f.z + (p[1] - f.z) * 0.45); c2.rotation.y = k * 1.57; arch.add(c2); }
      let t = 0; K.tick(dt => { t += dt; gg.position.y = 7.2 + Math.sin(t * 1.4) * 0.35; gm.rotation.z = Math.sin(t * 0.9) * 0.12; boo.visible = Math.sin(t * 2.2) > -0.2; });
      hideNear(K, arch, [V(f.x, 10.8, f.z), V(f.x, 7.2, f.z)], 4.5);
    }
    // the coffin on the verge, its jack-o-spring skeleton popping out when a kart comes (startling, harmless)
    { const s = TR.coffin.s, sd = TR.coffin.side, f = TR.at(s), p = TR.pos(s, sd * (Wd(f) + 1.5)), g = new T.Group(); g.position.set(p[0], 0, p[1]); g.rotation.y = Math.atan2(f.tx, f.tz); K.add(g);
      const wood = K3D.toon('#ffffff', { map: PARK.wood('#4a2a2a') });
      const shape = new T.Shape([[-0.55, 0], [-0.75, 1.3], [-0.45, 2.1], [0.45, 2.1], [0.75, 1.3], [0.55, 0]].map(q => new T.Vector2(q[0], q[1])));
      const box = mesh(new T.ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: false }).rotateX(-Math.PI / 2), wood, { inkW: 0.8 }); g.add(box);
      const lid = new T.Group(); lid.position.set(sd * 0.75, 0.72, 0); g.add(lid); lid.userData.live = true;
      const lm = mesh(new T.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(-sd * 0.75, 0, 0), wood, { inkW: 0.7 }); lid.add(lm);
      const cross = mesh(new T.BoxGeometry(0.1, 0.03, 0.9), toonM('#d8a63a')); cross.position.set(-sd * 0.75, 0.14, -1.2); lid.add(cross);
      const cross2 = mesh(new T.BoxGeometry(0.5, 0.03, 0.1), toonM('#d8a63a')); cross2.position.set(-sd * 0.75, 0.14, -1.35); lid.add(cross2);
      const sk = new T.Group(); sk.position.set(0, 0.2, -1.0); g.add(sk); sk.userData.live = true;
      const bone = toonM('#f4f0e0');
      const spring = []; for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 12; spring.push(V(Math.cos(a) * 0.3, i / 60, Math.sin(a) * 0.3)); }
      const spr = mesh(new T.TubeGeometry(new T.CatmullRomCurve3(spring), 120, 0.04, 5), toonM('#c8c8d8'), { inkW: 0.3 }); sk.add(spr);
      const body = new T.Group(); sk.add(body);
      const skull = mesh(new T.SphereGeometry(0.45, 16, 12), bone, { inkW: 0.7 }); skull.scale.set(1, 1.05, 0.95); skull.position.y = 1.0; body.add(skull);
      for (const sx of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.12, 8, 6), PARK.flatM('#9affb0', 2)); e.position.set(sx * 0.16, 1.05, 0.38); body.add(e); }
      const jaw = mesh(new T.BoxGeometry(0.42, 0.14, 0.3), bone, { inkW: 0.5 }); jaw.position.set(0, 0.62, 0.15); body.add(jaw);
      for (let i = 0; i < 4; i++) { const rib = mesh(K3D.geo('pkp-rib', () => new T.TorusGeometry(0.3, 0.04, 5, 14, Math.PI * 1.4).rotateX(Math.PI / 2).rotateY(-Math.PI * 0.2)), bone, { inkW: 0.3 }); rib.position.y = 0.4 - i * 0.16; rib.scale.setScalar(1 - i * 0.08); body.add(rib); }
      const arms = []; for (const sx of [-1, 1]) { const a = new T.Group(); a.position.set(sx * 0.36, 0.38, 0); body.add(a); const ar = mesh(K3D.geo('pkp-arm', () => new T.CylinderGeometry(0.04, 0.04, 0.8, 5).translate(0, -0.4, 0)), bone, { inkW: 0.3 }); a.add(ar); const hand = mesh(K3D.geo('pkp-hand', () => new T.SphereGeometry(0.09, 6, 5)), bone); hand.position.y = -0.82; a.add(hand); arms.push({ a, sx }); }
      W.coffin = { g, pop: 0 };
      let t = 0, up = 0, hold = 0;
      K.tick(dt => {
        t += dt; const st = G.mst; let trig = false;
        if (st && st.karts) for (const k of st.karts) { let d = s - k.s; d -= Math.round(d / TR.L) * TR.L; if (d > 0 && d < 16 && k.on < 0) trig = true; }
        if (trig && up < 0.05) { hold = 2.6; W.coffin.pop = (W.coffin.pop || 0) + 1; }
        hold -= dt; const want = hold > 0 ? 1 : 0;
        up += (want - up) * Math.min(1, dt * (want ? 9 : 2.5));
        const bounce = up * (1 + Math.sin(t * 14) * 0.12 * Math.exp(-(2.6 - Math.max(0, hold)) * 2));
        lid.rotation.z = -sd * up * 1.9;
        sk.scale.set(1, Math.max(0.05, bounce * 2.2), 1); body.scale.set(1, 1 / Math.max(0.05, bounce * 2.2), 1); body.position.y = 0;
        body.rotation.z = Math.sin(t * 7) * 0.25 * up; jaw.position.y = 0.62 - Math.abs(Math.sin(t * 12)) * 0.1 * up;
        for (const a of arms) a.a.rotation.z = a.sx * (0.5 + Math.sin(t * 9 + a.sx) * 0.7 * up);
        sk.visible = up > 0.02;
      });
      PARK.halo(K, p[0], 1.2, p[1], 4, '#9affb0', 0.16);
    }
    // the fountain the road forks round: three stone tiers, the water lit green, bubbling
    { const F = TR.FORK.C, g = new T.Group(); g.position.set(F[0], 0, F[1]); K.add(g);
      const stone = toonM('#6a6680'), waterM = PARK.flatM('#4affa0', 0.55);
      const basin = mesh(new T.CylinderGeometry(TR.FORK.r, TR.FORK.r + 0.2, 0.8, 32), stone, { inkW: 0.8 }); basin.position.y = 0.4; g.add(basin);
      const pool = new T.Mesh(new T.CircleGeometry(TR.FORK.r - 0.3, 32).rotateX(-Math.PI / 2), waterM); pool.position.y = 0.72; g.add(pool);
      const stem = mesh(new T.CylinderGeometry(0.4, 0.6, 2.6, 12), stone, { inkW: 0.6 }); stem.position.y = 1.6; g.add(stem);
      const bowl = mesh(new T.CylinderGeometry(1.7, 0.6, 0.6, 20), stone, { inkW: 0.6 }); bowl.position.y = 2.9; g.add(bowl);
      const w2 = new T.Mesh(new T.CircleGeometry(1.5, 20).rotateX(-Math.PI / 2), waterM); w2.position.y = 3.18; g.add(w2);
      const top = mesh(new T.CylinderGeometry(0.25, 0.35, 1.2, 10), stone); top.position.y = 3.7; g.add(top);
      const urn = mesh(new T.SphereGeometry(0.55, 14, 10), stone, { inkW: 0.6 }); urn.position.y = 4.5; g.add(urn);
      // a stone gargoyle on top, looking down the lane
      const garg = mesh(new T.SphereGeometry(0.45, 12, 10), toonM('#4a4660'), { inkW: 0.6 }); garg.position.y = 5.2; garg.scale.set(1, 0.8, 1.2); g.add(garg);
      for (const sx of [-1, 1]) { const wing = mesh(new T.ConeGeometry(0.3, 0.9, 4).rotateZ(sx * 1.2), toonM('#4a4660'), { inkW: 0.5 }); wing.position.set(sx * 0.45, 5.4, -0.1); g.add(wing); const e = new T.Mesh(new T.SphereGeometry(0.07, 6, 5), PARK.flatM('#ff5a3a', 2.5)); e.position.set(sx * 0.15, 5.3, 0.48); g.add(e); }
      PARK.halo(K, F[0], 1.4, F[1], 9, '#4affa0', 0.25);
      g.updateMatrixWorld(true);
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; B.add(F[0] + Math.cos(a) * (TR.FORK.r + 0.05), 0.85, F[1] + Math.sin(a) * (TR.FORK.r + 0.05), i % 2 ? '#9affb0' : '#b48aff', { size: 0.12, speed: 2, phase: i }); }
      // the falling water: sheets from the bowl's lip (a ring of thin streaks that ripple)
      const fall = new T.Mesh(new T.CylinderGeometry(1.62, 2.4, 2.3, 24, 1, true), new T.MeshBasicMaterial({ map: PARK.streakTex(), color: hot('#9affd0', 0.6), transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false }));
      fall.position.y = 1.85; fall.userData.live = true; g.add(fall);
      K.tick(dt => { fall.rotation.y += dt * 0.3; fall.material.map.offset.y -= dt * 0.8; });
      W.fountain = g;
    }
    // jack-o-lanterns along the verges (glowing, a few in heaps), an iron fence behind the headstones, crows
    const pumpTex = K3D.paint('pkp-pumpkin', 128, 64, (c, w, h) => { c.fillStyle = '#e8721a'; c.fillRect(0, 0, w, h); c.fillStyle = '#b8500a'; for (let x = 8; x < w; x += 16) c.fillRect(x, 0, 3, h); c.fillStyle = '#ffe07a'; c.beginPath(); c.moveTo(36, 20); c.lineTo(46, 32); c.lineTo(26, 32); c.fill(); c.beginPath(); c.moveTo(92, 20); c.lineTo(102, 32); c.lineTo(82, 32); c.fill(); c.beginPath(); c.moveTo(34, 42); for (let i = 0; i <= 6; i++) c.lineTo(34 + i * 10, 42 + (i % 2) * 8); c.lineTo(94, 52); c.lineTo(34, 52); c.fill(); });
    const pumpM = K3D.toon('#ffffff', { map: pumpTex, emissive: '#ffffff', emissiveMap: pumpTex, emissiveIntensity: 0.35 });
    const pumps = [];
    for (let s = s0 + 8; s < s1; s += 9 + C.rnd() * 7) for (const sd of [-1, 1]) {
      if (C.rnd() < 0.45) continue;
      const f = TR.at(s), p = TR.pos(s, sd * (Wd(f) + 1.2 + C.rnd() * 1.2));
      if (!C.room(p[0], p[1], 0.5)) continue; C.take(p[0], p[1], 0.5);
      pumps.push([p[0], p[1], Math.atan2(-f.rx * sd, -f.rz * sd), 0.7 + C.rnd() * 0.5]);
      PARK.halo(K, p[0], 0.5, p[1], 2.2, '#ffa040', 0.35);
    }
    { const im = new T.InstancedMesh(K3D.geo('pkp-pumpG', () => { const g = new T.SphereGeometry(0.5, 16, 12); g.scale(1.15, 0.85, 1.15); g.translate(0, 0.42, 0); return g; }), pumpM, pumps.length); const m4 = new T.Matrix4(), q = new T.Quaternion(), Y = V(0, 1, 0); pumps.forEach((p, i) => { m4.compose(V(p[0], 0, p[1]), q.setFromAxisAngle(Y, p[2] - Math.PI / 2), V(p[3], p[3], p[3])); im.setMatrixAt(i, m4); }); K3D.ink(im, C.INK, 0.5); K.add(im);
      const stalks = new T.InstancedMesh(K3D.geo('pkp-pumpS', () => new T.CylinderGeometry(0.05, 0.08, 0.3, 5).translate(0, 0.92, 0)), toonM('#4a6a2a'), pumps.length); pumps.forEach((p, i) => { m4.compose(V(p[0], 0, p[1]), q.setFromAxisAngle(Y, 0), V(p[3], p[3], p[3])); stalks.setMatrixAt(i, m4); }); K.add(stalks); }
    // the iron graveyard fence: spiked railings a little back from the road, with gaps for the gate posts
    const rails = [];
    for (let s = s0 + 4; s < s0 + 120; s += 0.9) { const f = TR.at(s), sd = -1, p = TR.pos(s, sd * (Wd(f) + 9.5)); if (!C.clear(p[0], p[1], 0.3) || C.paved(p[0], p[1], 0.2) && false) continue; if (Math.floor(s / 12) % 5 === 4) continue; rails.push([V(p[0], 0, p[1]), V(p[0], 1.8, p[1])]); }
    sticks(K, rails, 0.05, toonM('#1e1a2a'), { inkW: 0.3 });
    { const cones = new T.InstancedMesh(K3D.geo('pkp-spike', () => new T.ConeGeometry(0.09, 0.3, 4).translate(0, 1.95, 0)), toonM('#1e1a2a'), rails.length); const m4 = new T.Matrix4(); rails.forEach(([a], i) => { m4.makeTranslation(a.x, 0, a.z); cones.setMatrixAt(i, m4); }); K.add(cones); }
    // ground fog: soft low banks lying over the lane, drifting
    const fogTex = K3D.paint('pkp-fog', 128, 128, (c, w, h) => { for (let i = 0; i < 9; i++) { const x = 30 + Math.random() * 68, y = 30 + Math.random() * 68, r = 20 + Math.random() * 30; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,0.32)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); } });
    const fogs = [];
    for (let s = s0 + 6; s < s1 + 30; s += 7) for (let k = 0; k < 2; k++) { const f = TR.at(s), lat = (C.rnd() - 0.5) * 2 * (Wd(f) + 6); fogs.push({ s, lat, y: 0.3 + C.rnd() * 0.9, r: 3 + C.rnd() * 4, ph: C.rnd() * 6, sp: 0.2 + C.rnd() * 0.3 }); }
    const fim = new T.InstancedMesh(K3D.geo('pkp-fogQ', () => new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), new T.MeshBasicMaterial({ map: fogTex, color: hot('#b8d8c8', 0.3), transparent: true, depthWrite: false, toneMapped: false, fog: false }), fogs.length);
    fim.renderOrder = 4; fim.frustumCulled = false; fim.userData.live = true; K.add(fim);
    { const m4 = new T.Matrix4(), q = new T.Quaternion(), Y = V(0, 1, 0); let t = 0;
      const pose = () => { fogs.forEach((o, i) => { const p = TR.pos(o.s + Math.sin(t * o.sp + o.ph) * 2, o.lat + Math.cos(t * o.sp * 0.7 + o.ph) * 1.5); m4.compose(V(p[0], W.Y(o.s) + o.y, p[1]), q.setFromAxisAngle(Y, t * 0.05 + o.ph), V(o.r * 2, 1, o.r * 1.4)); fim.setMatrixAt(i, m4); }); fim.instanceMatrix.needsUpdate = true; };
      pose(); K.tick(dt => { t += dt; pose(); }); }
    // bats round the manor
    { const batG = K3D.geo('pkp-bat', () => { const sh = new T.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.4, 0.3, 0.9, 0.1); sh.lineTo(0.7, -0.05); sh.lineTo(0.55, 0.05); sh.lineTo(0.4, -0.1); sh.lineTo(0.2, 0); sh.lineTo(0, -0.12); sh.lineTo(-0.2, 0); sh.lineTo(-0.4, -0.1); sh.lineTo(-0.55, 0.05); sh.lineTo(-0.7, -0.05); sh.lineTo(-0.9, 0.1); sh.quadraticCurveTo(-0.4, 0.3, 0, 0); return new T.ShapeGeometry(sh).rotateX(-Math.PI / 2); });
      const bats = []; for (let i = 0; i < 12; i++) { const b = new T.Mesh(batG, K3D.flat('#0a0612', { side: T.DoubleSide })); b.userData.live = true; K.add(b); bats.push({ b, a: i / 12 * 6.28, r: 14 + (i % 4) * 5, h: 30 + (i % 5) * 3, sp: 0.4 + (i % 3) * 0.15 }); }
      let t = 0; K.tick(dt => { t += dt; for (const o of bats) { o.a += dt * o.sp; o.b.position.set(-46 + Math.cos(o.a) * o.r, o.h + Math.sin(t * 3 + o.a * 3) * 1.2, -150 + Math.sin(o.a) * o.r); o.b.rotation.y = -o.a; o.b.scale.set(1.4, 1, 1.4 * (0.6 + Math.abs(Math.sin(t * 14 + o.a * 5)) * 0.6)); } }); }
    // the lane's name on a crooked signpost at the way in
    { const f = TR.at(s0 + 4), p = TR.pos(s0 + 4, -(Wd(f) + 2.4)); const g = sign(K, 'SPOOK MANOR LANE', '#2a3a2a', '#9affb0', 'NO TURNING BACK', { x: p[0], z: p[1], yaw: Math.atan2(-f.tx, -f.tz) + 0.3, w: 4.2 }); g.rotation.z = 0.08; }
  };

  return P;
})();
