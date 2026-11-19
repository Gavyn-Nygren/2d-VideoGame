/* Pip & Bo - 42-1 Runaway Coaster: the set pieces of stretches 2 to 4 (and every low thing, leaning thing, lever and
   gap on the track). Loaded on demand with the 3D kit after parkcoaster-scenery.js, which calls
     PARKCOASTER_SET.build(K, B, sc)      once, after the track is built
     PARKCOASTER_SET.update(K, st, dt, sc) every drawn frame (display only: it reads G.mst and never changes it)
   Everything stands where the route's lists say (parkcoaster-route.js), so what you see is what counts:
     DUCKS  bunting across the midway, stall awnings over one rider's side, the ferris wheel's spokes, the clockwork
            pendulum, the cuckoo, the crane's hook (the "Mind your head" and "Closed" boards are the scenery file's)
     TIPS   a giant plush prize, a gondola hoisted off the wheel, gear teeth, leaning scaffolding (each with a tip sign)
     GAPS   the sweeper's broom on the rails, three trapdoors that drop as the train comes, gaps in the old trestle
     LEVERS track switches (a tall lever and a lamp: red with a cross, green with an arrow), the duck targets, the
            strongman's bell, the rocket's points and siding, the brake house's two big red levers
   and the places: the ring-toss stall, the fountain, the wheel (turned so a spoke crosses as the train passes), the
   sweepers' crossing, the Funhouse inside (the spinning barrel, the hall of mirrors, the clockwork room, the
   trapdoors, the ball pit, the climb to the eye, black light), the second lift's scaffolding and tarpaulins, the
   wooden trestle over the lake with planks falling away, the runaway rocket, the bulb-wrapped loop, the tower crane,
   the brake house and the ride-photo board. */
'use strict';

const PARKCOASTER_SET = (function () {
  const T = K3D.T, INK = '#1a1530';
  const PR = PARKCOASTER_ROUTE, R = PR.R, L = PR.lists, at = PR.at;
  const mesh = (g, m, o) => K3D.mesh(g, m, o), toonM = (c, o) => PARK.toonM(c, o), flatM = (c, k, o) => PARK.flatM(c, k, o);
  const v3 = a => new T.Vector3(a[0], a[1], a[2]);
  const rnd = () => PARK.rnd();
  const smooth = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  const HB = d => d.h + 0.25;   // the underside of a low thing above the rail (a rider's head that isn't ducking)

  /* ---------- placing things on the track ---------- */
  // a group at s (lat across, + right; up above the rail), facing back down the track: local +x is the train's right,
  // +z points back toward the oncoming train, -z the way it goes. Unbanked (things hang straight)
  function onTrack(K, s, lat = 0, up = 0) {
    const f = R.at(s), p = R.local(s, lat, up, f), g = new T.Group();
    g.position.set(p[0], p[1], p[2]); g.lookAt(p[0] - f.t[0], p[1], p[2] - f.t[2]);
    K.add(g); return g;
  }
  // the same, tilted with the track's bank and pitch
  function onRail(K, s, lat = 0, up = 0, D = R) {
    const f = D.at(s), p = D.bankLocal(s, lat, up, f), g = new T.Group();
    g.position.set(p[0], p[1], p[2]);
    g.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(v3(f.br), v3(f.bu), new T.Vector3(-f.t[0], -f.t[1], -f.t[2])));
    K.add(g); return g;
  }
  const world = (g, x, y, z) => { g.updateMatrixWorld(true); const q = new T.Vector3(x, y, z).applyMatrix4(g.matrixWorld); return [q.x, q.y, q.z]; };
  const hazTex = () => PARK.stripes('#ffd23a', '#1a1626', 10);
  const hazM = () => K3D.mat('pcs-haz', () => K3D.toon('#ffffff', { map: hazTex(), emissive: '#ffffff', emissiveIntensity: 0.12 }));
  // a post from the ground up to y (in the group's frame, whose origin is at height h0 above the ground)
  function post(g, x, z, y, h0, m, r = 0.09) {
    const p = mesh(K3D.geo('pcs-post', () => new T.CylinderGeometry(1, 1.15, 1, 8).translate(0, 0.5, 0)), m || toonM('#2a2438'), { inkW: 0.6 });
    p.scale.set(r, y + h0, r); p.position.set(x, -h0, z); g.add(p); return p;
  }
  // the warning before a low thing: a striped bar with a row of tassels that brush the riders' heads, across both
  // seats or one (who 0 Pip's left half, 1 Bo's right half), held up on striped posts
  function tassels(K, B, s, hb, who) {
    const g = onTrack(K, s, 0, 0), h0 = g.position.y;
    const x0 = who === 1 ? 0.05 : -1.7, x1 = who === 0 ? -0.05 : 1.7, y = hb + 0.62;
    const bar = mesh(new T.BoxGeometry(x1 - x0 + 0.5, 0.12, 0.12), hazM(), { inkW: 0.6 }); bar.position.set((x0 + x1) / 2, y, 0); g.add(bar);
    for (const x of who === 'both' ? [-1.95, 1.95] : [who === 0 ? -1.95 : 1.95]) post(g, x, 0, y + 0.06, h0, hazM(), 0.08);
    const n = Math.round((x1 - x0) / 0.2);
    const tm = new T.InstancedMesh(K3D.geo('pc-tassel2', () => new T.CylinderGeometry(0.03, 0.05, 0.55, 5).translate(0, -0.27, 0)), toonM('#e8483a'), n + 1);
    const tm2 = new T.InstancedMesh(K3D.geo('pc-tassel2', () => new T.CylinderGeometry(0.03, 0.05, 0.55, 5).translate(0, -0.27, 0)), toonM('#ffd23a'), n + 1);
    let a = 0, b2 = 0; const m4 = new T.Matrix4();
    for (let i = 0; i <= n; i++) { m4.makeTranslation(x0 + (x1 - x0) * i / n, y - 0.05, 0); (i % 2 ? tm : tm2).setMatrixAt(i % 2 ? a++ : b2++, m4); }
    tm.count = a; tm2.count = b2; g.add(tm); g.add(tm2);
    g.updateMatrixWorld(true);
    if (B) for (let i = 0; i <= 6; i++) B.add(...world(g, x0 + (x1 - x0) * i / 6, y + 0.1, 0.07), '#fff0b0', { size: 0.06, blink: true, phase: i });
    return g;
  }
  // a sign on a post beside the track at s, side -1 left / 1 right, facing the train, with a ring of bulbs
  function sign(K, B, s, side, tex, o = {}) {
    const f = R.at(s), out = o.out || 2.6, p = R.local(s, side * out, 0, f), g = new T.Group();
    g.position.set(p[0], p[1], p[2]); g.lookAt(p[0] - f.t[0], p[1], p[2] - f.t[2]); K.add(g);
    const sz = o.size || 1.3, ht = o.h || 2.2;
    post(g, 0, 0, ht, p[1], toonM('#2a2438'), 0.06);
    const bd = mesh(new T.BoxGeometry(sz, sz, 0.08), K3D.toon('#ffffff', { map: tex, emissive: '#ffffff', emissiveIntensity: 0.2 }), { inkW: 0.9 });
    bd.position.y = ht; if (o.flip) bd.scale.x = -1; g.add(bd);
    g.updateMatrixWorld(true);
    if (B) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; B.add(...world(g, Math.cos(a) * sz * 0.62, ht + Math.sin(a) * sz * 0.62, 0.06), o.bulb || '#c9a3ff', { size: 0.07, blink: true, phase: i }); }
    return g;
  }
  const signTex = kind => K3D.paint('pcs-sign|' + kind, 256, 256, (c, w, h) => {
    const car = (cx, cy, rot, col) => { c.save(); c.translate(cx, cy); c.rotate(rot); c.fillStyle = col; c.beginPath(); c.roundRect(-62, -26, 124, 44, 14); c.fill(); c.beginPath(); c.arc(-28, -34, 15, 0, 7); c.arc(28, -34, 15, 0, 7); c.fill(); c.fillStyle = '#1a1626'; c.beginPath(); c.arc(-40, 22, 12, 0, 7); c.arc(40, 22, 12, 0, 7); c.fill(); c.restore(); };
    if (kind === 'tip') {
      // lean the car up onto one side: a purple board, a tipped car and a curved arrow (drawn for a right tip; mirrored)
      c.fillStyle = '#6a3fc0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ffffff'; c.lineWidth = 12; c.strokeRect(8, 8, w - 16, h - 16);
      car(128, 150, 0.42, '#ffffff');
      c.strokeStyle = '#ffd23a'; c.lineWidth = 14; c.beginPath(); c.arc(128, 160, 92, -2.4, -0.75); c.stroke();
      c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(214, 88); c.lineTo(196, 128); c.lineTo(168, 92); c.closePath(); c.fill();
    } else if (kind === 'duck') {
      c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(128, 8); c.lineTo(248, 128); c.lineTo(128, 248); c.lineTo(8, 128); c.closePath(); c.fill();
      c.strokeStyle = '#1a1626'; c.lineWidth = 10; c.stroke();
      c.fillStyle = '#1a1626'; c.fillRect(64, 88, 128, 16); c.beginPath(); c.arc(128, 150, 26, 0, 7); c.fill();
      c.beginPath(); c.moveTo(128, 200); c.lineTo(104, 176); c.lineTo(152, 176); c.closePath(); c.fill();
    } else if (kind === 'closed') {
      for (let i = -8; i < 16; i++) { c.fillStyle = i % 2 ? '#e8483a' : '#ffffff'; c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 32, 0); c.lineTo(i * 32 + 32 + h, h); c.lineTo(i * 32 + h, h); c.fill(); }
      c.fillStyle = '#ffffff'; c.fillRect(14, 60, w - 28, 136); c.fillStyle = '#1a1626'; c.font = '900 64px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CLOSED', w / 2, 130);
    }
  });

  /* ---------- the track's gaps ----------
     broom: the rails are whole; a broom lies across them. trapdoor: a section of track that drops on a hinge as the
     train comes (it is a gap in the rules all along). trestle: the deck is broken off both sides; planks below. */
  function gaps(K, B, sc, makePiece) {
    sc.traps = [];
    for (const h of L.hops) {
      const mid = (h.s0 + h.s1) / 2;
      if (h.kind === 'broom') {
        const g = onRail(K, mid, 0, 0.05);
        const stick = mesh(new T.CylinderGeometry(0.05, 0.05, 2.6, 8).rotateZ(Math.PI / 2), toonM('#b88a4a'), { inkW: 0.6 }); stick.position.set(-0.2, 0.08, 0); g.add(stick);
        const brush = mesh(new T.ConeGeometry(0.3, 0.7, 12).rotateZ(-Math.PI / 2), toonM('#d8b04a'), { inkW: 0.7 }); brush.position.set(1.3, 0.12, 0.1); g.add(brush);
        const pan = mesh(new T.BoxGeometry(0.7, 0.05, 0.5), toonM('#e85a4a'), { inkW: 0.6 }); pan.position.set(-1.0, 0.04, 0.6); pan.rotation.y = 0.5; g.add(pan);
      } else if (h.kind === 'trapdoor') {
        // the hinged piece: its own rails and sleepers, a hazard-painted floor plate under it
        const piece = makePiece(h.s0, h.s1), hinge = onRail(K, h.s1, 0, -0.3);
        hinge.updateMatrixWorld(true);
        const inv = new T.Matrix4().copy(hinge.matrixWorld).invert();
        piece.applyMatrix4(inv); hinge.add(piece); piece.userData.live = true; hinge.userData.live = true;
        const plate = mesh(new T.BoxGeometry(2.6, 0.1, h.s1 - h.s0), hazM(), { inkW: 0.6 }); plate.position.set(0, -0.05, (h.s1 - h.s0) / 2); hinge.add(plate);
        sc.traps.push({ h, hinge, a: 0, q0: hinge.quaternion.clone() });
      } else if (h.kind === 'trestle') {
        // broken planks sticking out, a hazard rope, the lake far below
        for (const [s, dz] of [[h.s0, -1], [h.s1, 1]]) {
          const g = onRail(K, s, 0, -0.32);
          for (let k = 0; k < 5; k++) { const pl = mesh(K3D.geo('pcs-plank', () => new T.BoxGeometry(0.28, 0.08, 1.2)), toonM('#8a6440', { map: PARK.wood('#8a6440') }), { inkW: 0.5 }); pl.position.set(-0.6 + k * 0.3, 0, dz * 0.4 + (k % 2) * 0.2 * dz); pl.rotation.x = dz * (0.15 + (k % 3) * 0.12); g.add(pl); }
        }
        if (B) { const f = R.at(mid); for (const sx of [-1, 1]) B.add(...R.local(mid, sx * 1.4, 0.6, f), '#ff8a3a', { size: 0.14, blink: true }); }
      }
    }
  }

  /* ---------- low things across the track (ducks) ---------- */
  function bunting(K, B, d) {
    const hb = HB(d), g = onTrack(K, d.s, 0, 0), h0 = g.position.y, y = hb + 0.6;
    for (const x of [-2.7, 2.7]) post(g, x, 0, y + 0.2, h0, hazM(), 0.1);
    const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push(new T.Vector3(-2.7 + 5.4 * u, y - Math.sin(u * Math.PI) * 0.12, 0)); }
    g.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.03, 5), toonM('#f4ecd8'), { ink: false }));
    const cols = ['#e8483a', '#ffd23a', '#3f9a8a', '#ff8ab0', '#4a7fd0', '#f4ecd8'];
    for (let i = 0; i < 15; i++) {
      const x = -2.5 + i * 0.36, yy = y - Math.sin((x + 2.7) / 5.4 * Math.PI) * 0.12;
      const fl = new T.Mesh(K3D.geo('pcs-pennant', () => { const s = new T.Shape(); s.moveTo(-0.16, 0); s.lineTo(0.16, 0); s.lineTo(0, -0.5); s.closePath(); return new T.ShapeGeometry(s); }), toonM(cols[i % cols.length], { side: T.DoubleSide }));
      fl.position.set(x, yy, 0); g.add(fl);
    }
    g.updateMatrixWorld(true);
    if (B) for (let i = 0; i <= 12; i++) { const x = -2.6 + i * 0.43; B.add(...world(g, x, y + 0.05 - Math.sin((x + 2.7) / 5.4 * Math.PI) * 0.12, 0), i % 2 ? '#ffe07a' : '#ffffff', { size: 0.07, speed: 4, phase: i }); }
    tassels(K, B, d.s - 2.4, hb, 'both');
  }
  // a stall's striped awning reaching over one rider's half of the track from its side
  function awning(K, B, d) {
    const hb = HB(d), side = d.who === 0 ? -1 : 1, g = onTrack(K, d.s, 0, 0), h0 = g.position.y;
    const cols = side < 0 ? ['#e8483a', '#f4ecd8'] : ['#3f8f6a', '#f4ecd8'];
    for (const z of [-0.9, 0.9]) post(g, side * 2.6, z, hb + 1.0, h0, toonM('#7a4d30', { map: PARK.wood('#7a4d30') }), 0.1);
    const aw = mesh(new T.BoxGeometry(2.8, 0.06, 2.2), K3D.toon('#ffffff', { map: PARK.stripes(cols[0], cols[1], 8, { v: true }) }), { inkW: 0.9 });
    aw.position.set(side * 1.3, hb + 0.42, 0); aw.rotation.z = -side * 0.26; g.add(aw);
    const edge = mesh(new T.BoxGeometry(0.12, 0.26, 2.2), hazM(), { inkW: 0.6 }); edge.position.set(side * 0.02, hb + 0.13, 0); g.add(edge);
    for (let i = 0; i < 7; i++) { const sc = mesh(K3D.geo('pk-scallop', () => new T.CylinderGeometry(0.33, 0.33, 0.07, 14, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI)), toonM(i % 2 ? cols[1] : cols[0]), { inkW: 0.6 }); sc.position.set(side * 0.0, hb - 0.02, -0.95 + i * 0.32); sc.rotation.y = Math.PI / 2; sc.scale.setScalar(0.5); g.add(sc); }
    // the stall under it, set back on its side: its counter faces the track
    PARK.stall(K, B, { x: g.position.x + R.at(d.s).r[0] * side * 5.0, z: g.position.z + R.at(d.s).r[2] * side * 5.0, yaw: Math.atan2(-R.at(d.s).r[0] * side, -R.at(d.s).r[2] * side), c: side < 0 ? 0 : 3, w: 4.4 });
    g.updateMatrixWorld(true);
    if (B) for (let i = 0; i <= 8; i++) B.add(...world(g, side * 0.05, hb + 0.3, -1.05 + i * 0.26), i % 2 ? '#ffd27a' : '#ff7a6a', { size: 0.07, speed: 4, phase: i });
    tassels(K, B, d.s - 2.4, hb, d.who);
  }

  /* ---------- things leaning in from one side (tips) ---------- */
  // every tip gets a purple tip sign on the side to lean to, about 1.6 s ahead
  function tipSign(K, B, tp) { sign(K, B, tp.lead, tp.dir, signTex('tip'), { flip: tp.dir < 0, bulb: '#c9a3ff', size: 1.25 }); }
  // a giant plush bear hanging from a prize gantry, its belly over the near rail at the riders' height
  function plush(K, B, tp) {
    const side = -tp.dir, g = onTrack(K, tp.s, 0, 0), h0 = g.position.y;
    const fr = new T.Group(); g.add(fr);
    for (const z of [-0.8, 0.8]) post(fr, side * 3.4, z, 4.6, h0, toonM('#c9a06a'), 0.12);
    const beam = mesh(new T.BoxGeometry(2.4, 0.18, 0.2), toonM('#c9a06a'), { inkW: 0.6 }); beam.position.set(side * 2.3, 4.6, 0); fr.add(beam);
    const hang = new T.Group(); hang.position.set(side * 1.15, 4.5, 0); g.add(hang); hang.userData.live = true;
    const rope = mesh(new T.CylinderGeometry(0.03, 0.03, 1.8, 6).translate(0, -0.9, 0), toonM('#f4ecd8'), { ink: false }); hang.add(rope);
    const bear = new T.Group(); bear.position.y = -2.9; hang.add(bear);
    const col = '#ff8fb3', bm = toonM(col);
    const body = mesh(K3D.geo('pcs-bearB', () => new T.SphereGeometry(0.85, 20, 14)), bm, { inkW: 1 }); body.scale.set(1, 1.1, 0.9); bear.add(body);
    const head = mesh(K3D.geo('pcs-bearH', () => new T.SphereGeometry(0.62, 20, 14)), bm, { inkW: 1 }); head.position.y = 1.2; bear.add(head);
    for (const ex of [-1, 1]) { const ear = mesh(K3D.geo('pcs-bearE', () => new T.SphereGeometry(0.24, 12, 10)), bm, { inkW: 0.8 }); ear.position.set(ex * 0.45, 1.7, 0); bear.add(ear); const eye = new T.Mesh(K3D.geo('pcs-bearEye', () => new T.SphereGeometry(0.07, 8, 6)), toonM('#1a1626')); eye.position.set(ex * 0.2, 1.3, 0.55); bear.add(eye); }
    const snout = mesh(K3D.geo('pcs-bearS', () => new T.SphereGeometry(0.24, 12, 10)), toonM('#ffe0ea'), { inkW: 0.6 }); snout.position.set(0, 1.12, 0.56); bear.add(snout);
    const bow = mesh(new T.TorusGeometry(0.2, 0.08, 8, 12), toonM('#3f9a8a'), { inkW: 0.6 }); bow.position.set(0, 0.62, 0.7); bear.add(bow);
    for (const ax of [-1, 1]) { const arm = mesh(K3D.geo('pcs-bearA', () => new T.CapsuleGeometry(0.22, 0.6, 6, 10)), bm, { inkW: 0.8 }); arm.position.set(ax * 0.85, 0.2, 0.1); arm.rotation.z = ax * 0.6; bear.add(arm); }
    const tag = mesh(new T.BoxGeometry(0.5, 0.3, 0.04), toonM('#ffd23a', { emissive: '#a07010', emissiveIntensity: 0.3 }), { inkW: 0.5 }); tag.position.set(0, -0.6, 0.78); bear.add(tag);
    g.updateMatrixWorld(true);
    if (B) B.line(world(g, side * 3.4, 4.75, 0), world(g, side * 1.1, 4.75, 0), 0.3, ['#ffe07a', '#ff8ab0'], { speed: 5, size: 0.08 });
    tipSign(K, B, tp);
    return { hang, ph: rnd() * 6 };
  }
  // a gondola taken off the wheel for repairs, hanging from a chain hoist on a frame, swinging in over the near rail
  function gondola(K, B, tp) {
    const side = -tp.dir, g = onTrack(K, tp.s, 0, 0), h0 = g.position.y;
    for (const z of [-1.4, 1.4]) post(g, side * 4.2, z, 5.6, h0, toonM('#3b3456'), 0.16);
    const beam = mesh(new T.BoxGeometry(3.8, 0.3, 0.3), hazM(), { inkW: 0.7 }); beam.position.set(side * 2.5, 5.6, 0); g.add(beam);
    const beam2 = mesh(new T.BoxGeometry(0.3, 0.3, 3.1), toonM('#3b3456'), { inkW: 0.7 }); beam2.position.set(side * 4.2, 5.6, 0); g.add(beam2);
    const hoist = mesh(K3D.roundBox(0.5, 0.5, 0.4, 0.4, 12), toonM('#ffd23a'), { inkW: 0.7 }); hoist.position.set(side * 1.0, 5.3, 0); g.add(hoist);
    const hang = new T.Group(); hang.position.set(side * 1.0, 5.05, 0); g.add(hang); hang.userData.live = true;
    const ch = mesh(new T.CylinderGeometry(0.04, 0.04, 1.6, 6).translate(0, -0.8, 0), toonM('#cfc8e0'), { ink: false }); hang.add(ch);
    const cab = new T.Group(); cab.position.y = -1.5; hang.add(cab);
    cab.add(mesh(K3D.geo('pk-gon', () => K3D.roundBox(1.8, 1.3, 1.6, 0.4, 20).translate(0, -1.9, 0)), toonM('#4a7fd0'), { inkW: 0.8 }));
    cab.add(mesh(K3D.geo('pk-gonRoof', () => new T.ConeGeometry(1.3, 0.6, 6).translate(0, -0.4, 0)), toonM('#f4ecd8'), { inkW: 0.8 }));
    cab.add(new T.Mesh(K3D.geo('pk-gonWin', () => new T.BoxGeometry(1.84, 0.4, 1.64).translate(0, -1.0, 0)), flatM('#ffe2a8', 1.15)));
    const tape = mesh(new T.BoxGeometry(1.86, 0.12, 1.66), hazM(), { ink: false }); tape.position.y = -2.5; cab.add(tape);
    g.updateMatrixWorld(true);
    if (B) { B.line(world(g, side * 4.2, 5.8, -1.4), world(g, side * 4.2, 5.8, 1.4), 0.35, '#ff8a3a', { blink: true, size: 0.1 }); B.add(...world(g, side * 1.0, 5.65, 0), '#ff5a3a', { size: 0.14, blink: true }); }
    tipSign(K, B, tp);
    return { hang, ph: rnd() * 6 };
  }
  // scaffolding beside the track with one pole leaning in over the near rail, tarpaulin flapping
  function scaffold(K, B, tp, wood) {
    const side = -tp.dir, g = onTrack(K, tp.s, 0, 0), h0 = g.position.y, pm = toonM('#b8b0c8');
    const top = Math.max(4, h0 + 3);
    for (const x of [3.0, 4.6]) for (const z of [-1.6, 1.6]) post(g, side * x, z, top - h0, h0, pm, 0.07);
    for (let y = -h0 + 1.6; y < top - h0; y += 1.8) for (const z of [-1.6, 1.6]) { const r = mesh(new T.CylinderGeometry(0.06, 0.06, 1.6, 6).rotateZ(Math.PI / 2), pm, { inkW: 0.4 }); r.position.set(side * 3.8, y, z); g.add(r); }
    for (let y = -h0 + 1.6; y < top - h0; y += 1.8) { const plank = mesh(new T.BoxGeometry(1.6, 0.08, 3.4), toonM('#8a6440', { map: PARK.wood('#8a6440') }), { inkW: 0.5 }); plank.position.set(side * 3.8, y + 0.05, 0); g.add(plank); }
    // the leaning pole: from the scaffold's foot by the track up over the rail at the riders' height
    const lp = new T.Vector3(side * 3.0, 0.3, 0.6), tp2 = new T.Vector3(side * 0.35, 1.7, -0.3);
    const len = lp.distanceTo(tp2) + 1.2, pole = mesh(new T.CylinderGeometry(0.08, 0.08, len, 8), hazM(), { inkW: 0.7 });
    pole.position.copy(lp).add(tp2).multiplyScalar(0.5); pole.lookAt(tp2.clone().applyMatrix4(g.matrixWorld)); g.updateMatrixWorld(true);
    pole.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), tp2.clone().sub(lp).normalize()); g.add(pole);
    const clamp = mesh(new T.SphereGeometry(0.16, 10, 8), toonM('#e8483a'), { inkW: 0.5 }); clamp.position.copy(tp2); g.add(clamp);
    // a tarpaulin on the outside face
    const tarp = mesh(new T.PlaneGeometry(3.2, Math.max(2, top - 1), 6, 4), K3D.toon('#3a6fb8', { side: T.DoubleSide, emissive: '#1a2f58', emissiveIntensity: 0.3 }), { inkW: 0.6 });
    tarp.position.set(side * 4.75, (top - h0) / 2 - h0 + 0.5, 0); tarp.rotation.y = Math.PI / 2; g.add(tarp); tarp.userData.live = true;
    void wood;
    g.updateMatrixWorld(true);
    if (B) B.add(...world(g, side * 0.35, 1.95, -0.3), '#ff5a3a', { size: 0.12, blink: true });
    tipSign(K, B, tp);
    return { tarp };
  }

  /* ---------- levers beside the track ---------- */
  // a track switch: a tall lever by the rider's side at s and a signal lamp ahead of it (red with a cross while the
  // points lead to the rough detour, green with an arrow once thrown); the points blades at the fork
  const lampTex = ok => K3D.paint('pcs-lamp|' + ok, 128, 128, (c, w, h) => {
    c.fillStyle = ok ? '#2ad87a' : '#ff3a3a'; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill();
    c.strokeStyle = '#ffffff'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath();
    if (ok) { c.moveTo(34, 70); c.lineTo(58, 94); c.lineTo(98, 42); } else { c.moveTo(38, 38); c.lineTo(90, 90); c.moveTo(90, 38); c.lineTo(38, 90); }
    c.stroke();
  });
  function switchLever(K, B, lv) {
    const side = lv.side === 0 ? -1 : 1, g = onTrack(K, lv.s, side * 2.15, 0), h0 = g.position.y;
    const base = mesh(new T.BoxGeometry(0.8, 0.5, 1.0), toonM('#3b3456'), { inkW: 0.7 }); base.position.y = -0.25; g.add(base);
    post(g, 0, 0, -0.5, h0, toonM('#3b3456'), 0.25);
    const arm = new T.Group(); arm.position.y = 0; g.add(arm); arm.userData.live = true;
    const rod = mesh(new T.CylinderGeometry(0.07, 0.07, 2.0, 8).translate(0, 1.0, 0), toonM('#d8d0e8'), { inkW: 0.6 }); arm.add(rod);
    const knob = mesh(new T.SphereGeometry(0.22, 12, 10), toonM(lv.kind === 'rocket' ? '#ff9a3a' : '#e8483a'), { inkW: 0.7 }); knob.position.y = 2.05; arm.add(knob);
    arm.rotation.x = -0.5;
    // the lamp: on a tall post at the lever, big enough to read from the lead
    const lamp = new T.Group(); lamp.position.set(side * 0.9, 0, 0); g.add(lamp);
    post(lamp, 0, 0, 3.6, h0, toonM('#2a2438'), 0.08);
    const red = new T.Mesh(new T.CircleGeometry(0.55, 24), K3D.flat(new T.Color('#ffffff').multiplyScalar(1.6), { map: lampTex(false) })), green = new T.Mesh(new T.CircleGeometry(0.55, 24), K3D.flat(new T.Color('#ffffff').multiplyScalar(1.6), { map: lampTex(true) }));
    for (const m of [red, green]) { m.position.set(0, 3.6, 0.08); lamp.add(m); m.userData.live = true; }
    green.visible = false;
    const hood = mesh(new T.CylinderGeometry(0.66, 0.66, 0.3, 20, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), toonM('#2a2438', { side: T.DoubleSide }), { inkW: 0.6 }); hood.position.set(0, 3.75, 0.2); lamp.add(hood);
    const halo = PARK.halo(K, ...world(lamp, 0, 3.6, 0.3), 3.2, '#ff3a3a', 0.6);
    // the points at the fork: two short blades that swing
    const pts = onRail(K, lv.fork != null ? lv.fork : lv.s + 2.5, 0, 0.02);
    const blades = new T.Group(); pts.add(blades); blades.userData.live = true; pts.userData.live = true;
    for (const x of [-0.45, 0.45]) { const bl = mesh(new T.BoxGeometry(0.08, 0.12, 2.4), toonM('#e8e0f0'), { inkW: 0.4 }); bl.position.set(x, 0.04, 0.6); blades.add(bl); }
    return { lv, arm, red, green, halo, blades, side, i: L.levers.indexOf(lv) };
  }
  // a duck target on Pip's side: a tin duck on a post that flips back when smacked
  function target(K, B, lv) {
    const side = lv.side === 0 ? -1 : 1, g = onTrack(K, lv.s, side * 1.9, 0), h0 = g.position.y;
    post(g, 0, 0, 1.0, h0, toonM('#c9a06a'), 0.06);
    const flip = new T.Group(); flip.position.y = 1.0; g.add(flip); flip.userData.live = true;
    const duck = new T.Mesh(K3D.geo('pcs-duck', () => { const s = new T.Shape(); s.moveTo(-0.5, 0); s.quadraticCurveTo(-0.55, 0.45, -0.1, 0.45); s.quadraticCurveTo(-0.15, 0.95, 0.2, 0.9); s.quadraticCurveTo(0.45, 0.85, 0.35, 0.6); s.lineTo(0.65, 0.55); s.lineTo(0.35, 0.45); s.quadraticCurveTo(0.6, 0.2, 0.45, 0); s.closePath(); return new T.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false }); }), K3D.toon('#ffd23a', { emissive: '#a07010', emissiveIntensity: 0.35 }));
    duck.position.set(0, 0, -0.04); flip.add(duck); K3D.ink(duck, INK, 0.8);
    const bull = new T.Mesh(new T.CircleGeometry(0.14, 16), flatM('#ff3a3a', 1.3)); bull.position.set(0.08, 0.66, 0.06); flip.add(bull);
    g.updateMatrixWorld(true);
    if (B) B.add(...world(g, 0, 2.0, 0), '#ffd23a', { size: 0.1, blink: true });
    return { lv, flip, i: L.levers.indexOf(lv) };
  }
  // the strongman bell on Bo's side: a striped tower with a scale, a puck on a wire, a big brass bell at the top and a
  // pad beside the track at arm's reach
  function bell(K, B, lv) {
    const side = lv.side === 0 ? -1 : 1, g = onTrack(K, lv.s, side * 2.6, 0), h0 = g.position.y, H = 7.5;
    const tower = mesh(new T.BoxGeometry(0.7, H, 0.4), K3D.toon('#ffffff', { map: PARK.stripes('#e8483a', '#f4ecd8', 12) }), { inkW: 0.8 }); tower.position.y = H / 2 - h0; g.add(tower);
    const scale = mesh(new T.PlaneGeometry(0.5, H - 1), K3D.toon('#ffffff', { map: K3D.paint('pcs-scale', 64, 512, (c, w, h) => { const cs = ['#3f9a8a', '#7ac04a', '#ffd23a', '#ff9a3a', '#e8483a']; for (let i = 0; i < 10; i++) { c.fillStyle = cs[Math.floor(i / 2)]; c.fillRect(0, h - (i + 1) * h / 10, w, h / 10 - 4); } c.fillStyle = '#ffffff'; c.font = '900 20px "DejaVu Sans"'; c.textAlign = 'center'; ['WEAK', '', 'OK', '', 'STRONG', '', 'MIGHTY', '', 'HERO!', ''].forEach((t, i) => { if (t) c.fillText(t, w / 2, h - i * h / 10 - 18); }); }), emissive: '#ffffff', emissiveIntensity: 0.25 }));
    scale.position.set(0, H / 2 - h0, 0.21); g.add(scale);
    const puck = mesh(new T.CylinderGeometry(0.22, 0.22, 0.2, 14), toonM('#d8d0e8'), { inkW: 0.6 }); puck.position.set(0, 0.6 - h0, 0.35); g.add(puck); puck.userData.live = true;
    const bl = mesh(new T.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toonM('#e8c46a', { side: T.DoubleSide, emissive: '#6a4a10', emissiveIntensity: 0.3 }), { inkW: 0.8 }); bl.position.y = H + 0.1 - h0; bl.rotation.x = Math.PI; g.add(bl);
    const pad = mesh(new T.CylinderGeometry(0.4, 0.4, 0.2, 16).rotateZ(Math.PI / 2), toonM('#e8483a'), { inkW: 0.7 }); pad.position.set(-side * 0.6, 1.0, 0); g.add(pad);
    post(g, -side * 0.4, 0, 0.9, h0, toonM('#2a2438'), 0.06);
    g.updateMatrixWorld(true);
    if (B) { for (let i = 0; i < 10; i++) B.add(...world(g, 0.38, 0.6 + i * 0.7 - h0, 0.22), '#ffe07a', { size: 0.08, speed: 6, phase: -i * 0.7 }); }
    return { lv, puck, h0, H, i: L.levers.indexOf(lv) };
  }

  /* ---------- the Midway ---------- */
  // the ring-toss stall on Bo's side: pegs and hoops (the tickets fly where the hoops are)
  function ringToss(K, B) {
    const s = at.ringToss + 2, f = R.at(s), p = R.local(s, 6.6, 0, f);
    const st = PARK.stall(K, B, { x: p[0], z: p[2], yaw: Math.atan2(-f.r[0], -f.r[2]), c: 4, w: 6 });
    const sg = PARK.neon(K, 'RING TOSS', { w: 3.4, h: 0.8, col: '#7affd4', col2: '#ffd24a', k: 2.6 }); sg.position.set(p[0] + f.r[0] * 0.4, 5.0, p[2] + f.r[2] * 0.4); sg.lookAt(sg.position.x - f.r[0], 4.9, sg.position.z - f.r[2]);
    for (let i = 0; i < 9; i++) {
      const q = R.local(s - 4 + i, 3.4, 0);
      const peg = mesh(K3D.geo('pcs-peg', () => new T.CylinderGeometry(0.06, 0.08, 1.1, 8).translate(0, 0.55, 0)), toonM('#f4ecd8'), { inkW: 0.5 }); peg.position.set(q[0], 0, q[2]); K.add(peg);
      const hoop = mesh(K3D.geo('pcs-hoop', () => new T.TorusGeometry(0.22, 0.04, 6, 18).rotateX(Math.PI / 2)), toonM(['#ff6ab0', '#ffd24a', '#7ae8ff'][i % 3]), { inkW: 0.5 }); hoop.position.set(q[0], 0.3 + (i % 3) * 0.2, q[2]); K.add(hoop);
    }
    void st;
  }
  // more stalls hard by the low track all along the midway's run, their backs to the stalls behind (busy both sides)
  function midwayLine(K, B, sc) {
    // lantern strings across the low track, high enough to clear the riders (the bunting is the low one)
    void K; void B;
    void sc;
  }
  // the fountain: a round basin, a tiered spout, jets arching over the track (the train runs through the spray)
  function fountain(K, B, sc) {
    const F = PR.art.fountain, g = new T.Group(); g.position.set(F.x, 0, F.z); K.add(g);
    const rim = mesh(new T.TorusGeometry(F.r, 0.35, 10, 48).rotateX(Math.PI / 2), toonM('#d8d0e8', { map: PARK.paving() }), { inkW: 0.8 }); rim.position.y = 0.55; g.add(rim);
    const wall = mesh(new T.CylinderGeometry(F.r, F.r, 0.6, 48, 1, true), toonM('#cfc6dc', { side: T.DoubleSide }), { inkW: 0.6 }); wall.position.y = 0.3; g.add(wall);
    const water = new T.Mesh(new T.CircleGeometry(F.r - 0.1, 48).rotateX(-Math.PI / 2), K3D.toon('#3a8fd0', { emissive: '#1a5fa0', emissiveIntensity: 0.7 })); water.position.y = 0.45; g.add(water);
    for (const [r, y, h] of [[1.6, 0.4, 1.4], [1.0, 1.9, 1.1], [0.55, 3.1, 0.9]]) {
      const col = mesh(new T.CylinderGeometry(0.22, 0.3, h, 12), toonM('#d8d0e8'), { inkW: 0.6 }); col.position.y = y + h / 2; g.add(col);
      const bowl = mesh(new T.CylinderGeometry(r, r * 0.6, 0.35, 24), toonM('#e0d8ec'), { inkW: 0.7 }); bowl.position.y = y + h; g.add(bowl);
    }
    const fb = PARK.bulbs(K, 200); g.add(fb.mesh); fb.ring([0, 0.6, 0], F.r + 0.15, 48, ['#7ae8ff', '#ffffff', '#ff8ad8'], { speed: 3, size: 0.1 }); fb.done();
    // the jets: drops (sprites) along arcs from the rim, some over the track
    const drops = [], mat = new T.SpriteMaterial({ map: PARK.glowTex(), color: new T.Color('#bfe6ff').multiplyScalar(1.1), transparent: true, depthWrite: false, blending: T.AdditiveBlending });
    const tr = R.at(at.fountain).p, toTrack = Math.atan2(tr[2] - F.z, tr[0] - F.x);
    const jets = [];
    for (let k = 0; k < 12; k++) jets.push({ a: toTrack + (k - 5.5) * 0.11, reach: 9 + (k % 3), up: 7 + (k % 2) * 1.5 });
    for (let k = 0; k < 8; k++) jets.push({ a: toTrack + Math.PI * (0.4 + k * 0.17), reach: 3.2, up: 2.6 });
    for (const j of jets) for (let i = 0; i < 10; i++) { const sp = new T.Sprite(mat); sp.scale.setScalar(0.35); g.add(sp); drops.push({ sp, j, u: i / 10 }); }
    const mist = []; for (let i = 0; i < 10; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: PARK.glowTex(), color: new T.Color('#9ac8ff').multiplyScalar(0.35), transparent: true, depthWrite: false, blending: T.AdditiveBlending })); g.add(sp); mist.push({ sp, ph: i / 10 }); }
    PARK.halo(K, F.x, 1.5, F.z, 10, '#5ab8ff', 0.4);
    sc.fountain = { drops, mist, F };
  }
  // the ferris wheel: its clock is steered so a spoke points straight down as the train crosses its plane
  function wheelClock() {
    const W = PR.art.rides[0], sp = W.speed || 0.08, step = Math.PI / 8;
    return (t, dt) => {
      let nt = t + dt; const st = G.mst;
      if (st && st.phase === 'ride' && st.det < 0) {
        const d = at.spoke1 - st.s;
        if (d > 0 && d < 70) {
          const eta = d / Math.max(1, st.v), th = (nt + eta) * sp, want = Math.round(th / step) * step;
          nt += (want - th) / sp * Math.min(1, dt * 2.5);
        }
      }
      return nt;
    };
  }
  // a tassel bar between the wheel's front legs (the spokes are the low things here)
  function wheelBar(K, B) { const d = L.ducks.find(x => x.kind === 'spoke'); if (d) tassels(K, B, d.s - 1.6, HB(d), 'both'); }
  // the sweepers' service crossing: flashing crossing lights, striped boards, three wind-up sweepers who trundle off
  // the rails just in time (one leaves his broom behind)
  function crossing(K, B, sc) {
    const s = at.crossing, f = R.at(s), out = [];
    for (const side of [-1, 1]) {
      const g = onTrack(K, s - 6, side * 2.8, 0), h0 = g.position.y;
      post(g, 0, 0, 2.6, h0, hazM(), 0.08);
      const xb = mesh(new T.BoxGeometry(1.4, 0.18, 0.06), K3D.toon('#ffffff', { map: PARK.stripes('#e8483a', '#ffffff', 6) }), { inkW: 0.6 }); xb.position.y = 2.3; xb.rotation.z = 0.5; g.add(xb);
      const xb2 = xb.clone(); xb2.rotation.z = -0.5; g.add(xb2);
      for (const lx of [-0.35, 0.35]) out.push(new T.Vector3(...world(g, lx, 1.8, 0.1)));
    }
    // the crossing's boards, level with the rails
    { const g = onTrack(K, s, 0, -0.12); const bd = mesh(new T.BoxGeometry(6, 0.12, 5.4), toonM('#8a6440', { map: PARK.wood('#8a6440') }), { inkW: 0.6 }); g.add(bd); for (const x of [-3.1, 3.1]) { const e2 = mesh(new T.BoxGeometry(0.2, 0.14, 5.4), hazM(), { ink: false }); e2.position.x = x; g.add(e2); } }
    sc.crossLights = out.map((p, i) => B ? B.add(p.x, p.y, p.z, '#ff3a2a', { size: 0.18, blink: true, phase: i % 2 }) : -1);
    const bots = [];
    for (let i = 0; i < 3; i++) { const r = PARK.robot(K, { col: ['#3f9a8a', '#e85a4a', '#7a6ad0'][i] }); bots.push({ r, lane: -1.4 + i * 1.4, from: -1 + 2 * (i % 2) }); }
    sc.sweepers = { bots, f, s };
  }

  /* ---------- the Funhouse ---------- */
  function funhouse(K, B, sc) {
    const F = PR.art.funhouse, x0 = F.x - F.w / 2, x1 = F.x + F.w / 2, z0 = F.z - F.d / 2, z1 = F.z + F.d / 2, H = F.h;
    const face = { z: z0 + 20, y: H * 0.55 };
    const mouth = { z: face.z, y: face.y - 2, r: 8 }, eye = { z: face.z + 5, y: face.y + 5.5, r: 5.2 }, eyeL = { z: face.z - 5.5, y: face.y + 5.5 };   // (the right eye is the way out: big enough for the train and the camera behind it)
    const g = new T.Group(); K.add(g); g.name = 'funhouse';
    // the walls: the front (west) wall has the mouth and the right eye cut through; the rest are plain boxes. Inside
    // faces are painted for black light
    const out = K3D.toon('#ffffff', { map: PARK.stripes('#5d3a9a', '#2f2a6a', 12, { v: true }) });
    const inTex = K3D.paint('pcs-funIn', 512, 512, (c, w, h) => {
      c.fillStyle = '#120a2a'; c.fillRect(0, 0, w, h);
      const cs = ['#ff3ad8', '#3affe0', '#fff23a', '#7a5aff'];
      for (let i = 0; i < 38; i++) { c.strokeStyle = cs[i % 4]; c.lineWidth = 6; c.globalAlpha = 0.9; c.beginPath(); const x = (i * 97) % w, y = (i * 61) % h, r = 14 + (i % 5) * 9; if (i % 3 === 0) c.arc(x, y, r, 0, 7); else if (i % 3 === 1) { for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, rr = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); } else { c.moveTo(x - r, y); for (let k = 0; k < 6; k++) c.lineTo(x - r + k * r * 0.4, y + (k % 2 ? -r * 0.4 : r * 0.4)); } c.stroke(); }
      c.globalAlpha = 1;
    }, { repeat: true });
    inTex.repeat.set(6, 3);
    const inM = K3D.toon('#ffffff', { map: inTex, side: T.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.85 }); inM.emissiveMap = inTex;   // (the painted lines glow under the black light)
    const panel = (w, h, m) => new T.Mesh(new T.PlaneGeometry(w, h), m);
    // outer boxes for the north/south/east walls and roof (double skins so neither side shows through)
    const addWall = (w, h, x, y, z, ry) => { const o = panel(w, h, out); o.position.set(x, y, z); o.rotation.y = ry; g.add(o); const i = panel(w, h, inM); i.position.set(x, y, z); i.rotation.y = ry + Math.PI; i.position.add(new T.Vector3(Math.sin(ry + Math.PI), 0, Math.cos(ry + Math.PI)).multiplyScalar(0.3)); g.add(i); };
    addWall(F.w, H, F.x, H / 2, z0, Math.PI); addWall(F.w, H, F.x, H / 2, z1, 0); addWall(F.d, H, x1, H / 2, F.z, Math.PI / 2);
    const roof = mesh(new T.BoxGeometry(F.w + 2, 1.2, F.d + 2), toonM('#f2c14e')); roof.position.set(F.x, H + 0.6, F.z); g.add(roof);
    const ceil = panel(F.w, F.d, K3D.flat('#140c2c', { side: T.DoubleSide })); ceil.rotation.x = Math.PI / 2; ceil.position.set(F.x, H - 0.4, F.z); g.add(ceil);
    const floor = new T.Mesh(new T.PlaneGeometry(F.w, F.d), K3D.toon('#ffffff', { map: K3D.paint('pcs-funFloor', 256, 256, (c, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#1a1238' : '#ece4ff'; c.fillRect(i * 32, j * 32, 32, 32); } }, { repeat: true }) }));
    floor.material.map.repeat.set(F.w / 4, F.d / 4); floor.rotation.x = -Math.PI / 2; floor.position.set(F.x, 0.05, F.z); g.add(floor);
    // the front wall with holes, outside face and inside face
    const front = new T.Shape(); front.moveTo(z0, 0); front.lineTo(z1, 0); front.lineTo(z1, H); front.lineTo(z0, H); front.closePath();
    const mh = new T.Path(); mh.absarc(mouth.z, mouth.y, mouth.r, Math.PI * 1.04, Math.PI * 1.96, false); mh.closePath(); front.holes.push(mh);
    const eh = new T.Path(); eh.absarc(eye.z, eye.y, eye.r, 0, Math.PI * 2, true); front.holes.push(eh);
    const fg = new T.ShapeGeometry(front, 48);
    for (const [m, dx, flip] of [[out, -0.15, false], [inM, 0.25, true]]) { const fw = new T.Mesh(fg, m); fw.rotation.y = flip ? Math.PI / 2 : -Math.PI / 2; fw.position.set(x0 + dx, 0, 0); if (flip) { fw.scale.x = -1; } g.add(fw); fw.material.side = T.DoubleSide; }
    // the laughing moon face: a disc with the same holes, the mouth's lips and teeth, the left eye with its pupil
    const fs = new T.Shape(); fs.absarc(0, 0, 15, 0, Math.PI * 2, false);
    const fmh = new T.Path(); fmh.absarc(mouth.z - face.z, mouth.y - face.y, mouth.r, Math.PI * 1.04, Math.PI * 1.96, false); fmh.closePath(); fs.holes.push(fmh);
    const feh = new T.Path(); feh.absarc(eye.z - face.z, eye.y - face.y, eye.r, 0, Math.PI * 2, true); fs.holes.push(feh);
    const disc = mesh(new T.ExtrudeGeometry(fs, { depth: 1.2, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.3, curveSegments: 48 }), K3D.toon('#ffe27a', { emissive: '#8a6a10', emissiveIntensity: 0.45 }), { inkW: 1.4 });
    disc.rotation.y = -Math.PI / 2; disc.position.set(x0 - 0.4, face.y, face.z); g.add(disc);
    const lip = mesh(new T.TorusGeometry(mouth.r, 0.45, 10, 40, Math.PI * 0.92), toonM('#d8483a'), { inkW: 0.8 }); lip.rotation.set(0, -Math.PI / 2, Math.PI * 1.04); lip.position.set(x0 - 1.7, mouth.y, mouth.z); g.add(lip);
    for (let i = 0; i < 6; i++) { const tooth = mesh(K3D.roundBox(1.0, 1.1, 0.5, 0.4, 10), toonM('#ffffff'), { inkW: 0.6 }); tooth.position.set(x0 - 1.7, mouth.y - 0.6, mouth.z - 5.5 + i * 2.2); tooth.rotation.y = Math.PI / 2; g.add(tooth); }
    const eyeW = mesh(new T.SphereGeometry(3.4, 20, 14), toonM('#ffffff')); eyeW.scale.x = 0.4; eyeW.position.set(x0 - 1.6, eyeL.y, eyeL.z); g.add(eyeW);
    const pu = new T.Mesh(new T.SphereGeometry(1.6, 14, 10), toonM('#2a2235')); pu.scale.x = 0.4; pu.position.set(x0 - 2.4, eyeL.y - 0.3, eyeL.z + 0.5); g.add(pu);
    const lid = mesh(new T.TorusGeometry(eye.r + 0.2, 0.4, 10, 40), toonM('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.3 }), { inkW: 0.8 }); lid.rotation.y = Math.PI / 2; lid.position.set(x0 - 1.7, eye.y, eye.z); g.add(lid);
    const brow = mesh(new T.TorusGeometry(5.0, 0.4, 8, 24, Math.PI * 0.7), toonM('#c9973a'), { inkW: 0.7 }); brow.rotation.set(0, -Math.PI / 2, Math.PI * 0.15); brow.position.set(x0 - 1.7, eye.y + 1.6, eye.z); g.add(brow);
    const brow2 = brow.clone(); brow2.position.z = eyeL.z; g.add(brow2);
    const sg = PARK.neon(K, 'FUNHOUSE', { w: 18, h: 4, col: '#7affd4', col2: '#ff6ab0', k: 2.6 }); sg.position.set(x0 - 1.4, H + 3.4, face.z); sg.rotation.y = -Math.PI / 2;
    g.updateMatrixWorld(true);
    if (B) {
      for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; B.add(x0 - 1.8, face.y + Math.sin(a) * 15.8, face.z + Math.cos(a) * 15.8, i % 2 ? '#ffffff' : '#ffd24a', { size: 0.35, speed: 4, phase: i * 0.5 }); }
      for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; B.add(x0 - 2.2, eye.y + Math.sin(a) * (eye.r + 0.7), eye.z + Math.cos(a) * (eye.r + 0.7), '#7affd4', { size: 0.22, speed: 6, phase: i }); }
      for (const x of [x0, x1]) for (const z of [z0, z1]) B.line([x, 0.5, z], [x, H, z], 1.2, ['#ff6ab0', '#7affd4'], { speed: 5, step: -0.6, size: 0.3 });
      for (let x = x0 + 4; x < x1; x += 4) { B.add(x, H + 1.4, z0 - 0.4, x % 8 ? '#ffd24a' : '#ff6ab0', { size: 0.3, speed: 3, phase: x * 0.3 }); B.add(x, H + 1.4, z1 + 0.4, x % 8 ? '#ffd24a' : '#ff6ab0', { size: 0.3, speed: 3, phase: x * 0.3 }); }
    }
    // inside: black-light stars and neon squiggles on the dark, a few glowing posters
    const inB = PARK.bulbs(K, 1600); sc.funB = inB;
    for (let i = 0; i < 260; i++) { const wsel = i % 4, u = rnd(), y = 2 + rnd() * (H - 4); let p; if (wsel === 0) p = [x0 + 0.6, y, z0 + u * F.d]; else if (wsel === 1) p = [x1 - 0.6, y, z0 + u * F.d]; else if (wsel === 2) p = [x0 + u * F.w, y, z0 + 0.6]; else p = [x0 + u * F.w, y, z1 - 0.6]; inB.add(p[0], p[1], p[2], ['#ff3ad8', '#3affe0', '#fff23a', '#9a7aff'][i % 4], { size: 0.12 + rnd() * 0.12, blink: i % 7 === 0, speed: i % 7 ? 0 : 2, phase: i }); }
    inB.done();
    sc.fun = { F, x0, x1, z0, z1, H, eye, mouth };
    barrel(K, B, sc); mirrors(K, B, sc); clockwork(K, B, sc); ballPit(K, B, sc); climb(K, B, sc);
  }
  // the spinning barrel: a tube round the track, painted in a spiral that turns (the arrows are the only thing true)
  function barrel(K, B, sc) {
    const a = at.barrel - 2, b = at.barrelEnd + 2, pts = [];
    for (let s = a; s <= b; s += 2) pts.push(v3(R.local(s, 0, 2.2)));
    const tex = K3D.paint('pcs-barrel', 256, 256, (c, w, h) => {
      const cs = ['#ff3ad8', '#120a2a', '#3affe0', '#120a2a', '#fff23a', '#120a2a'];
      for (let i = -8; i < 16; i++) { c.fillStyle = cs[((i % 6) + 6) % 6]; c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 32, 0); c.lineTo(i * 32 + 32 + 128, h); c.lineTo(i * 32 + 128, h); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 30; i++) { c.beginPath(); c.arc((i * 47) % w, (i * 83) % h, 3, 0, 7); c.fill(); }
    }, { repeat: true });
    tex.repeat.set(2, (b - a) / 6);
    const tm = K3D.toon('#9a8ab8', { map: tex, side: T.BackSide, emissive: '#ffffff', emissiveIntensity: 0.75 }); tm.emissiveMap = tex;
    const tube = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 80, 5.4, 36, false), tm);
    tube.userData.live = true; K.add(tube);
    // the barrel's outside: dark wooden staves with brass hoops
    const outT = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 80, 5.6, 36, false), K3D.toon('#ffffff', { map: PARK.stripes('#5a3a2a', '#3a2418', 24, { v: true }) })); K.add(outT);
    for (let k = 0; k <= 4; k++) { const sk = a + (b - a) * k / 4, f = R.at(sk), hp = R.local(sk, 0, 2.2, f), hoop = mesh(new T.TorusGeometry(5.7, 0.18, 8, 40), toonM('#e8b84a'), { inkW: 0.6 }); hoop.position.set(...hp); hoop.lookAt(hp[0] + f.t[0], hp[1] + f.t[1], hp[2] + f.t[2]); K.add(hoop); }
    // rings of bulbs at each end and a band every 8
    if (B) for (let s = a; s <= b; s += 8) { const f = R.at(s); for (let k = 0; k < 24; k++) { const an = k / 24 * Math.PI * 2; B.add(...R.local(s, Math.cos(an) * 5.2, 2.2 + Math.sin(an) * 5.2, f), k % 2 ? '#ff3ad8' : '#3affe0', { size: 0.1, speed: 5, phase: k * 0.5 + s }); } }
    sc.barrel = { tex };
  }
  // the hall of mirrors: tall silver panels both sides along the run and round the turn; the switch's lamp is seen in
  // them (bright copies of it) before the lever itself comes round the corner
  function mirrors(K, B, sc) {
    const mTex = K3D.paint('pcs-mirror', 128, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#5a6aa8'); gr.addColorStop(0.45, '#c8d8ff'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(0.56, '#b8c8f8'); gr.addColorStop(1, '#3a4a88'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3; for (const x of [20, 34, 90]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 60, h); c.stroke(); } c.fillStyle = 'rgba(255,58,216,0.35)'; c.beginPath(); c.ellipse(64, 150, 40, 70, 0, 0, 7); c.fill(); });
    const mm = K3D.toon('#ffffff', { map: mTex, emissive: '#ffffff', emissiveIntensity: 0.55 }), frameM = toonM('#e8c46a'); mm.emissiveMap = mTex;
    const lamps = [];
    for (let s = at.goldFOut - 6; s < at.sw5 + 10; s += 3.2) {
      const f = R.at(s);
      for (const side of [-1, 1]) {
        const g = onTrack(K, s, side * 3.6, 0), h0 = g.position.y;
        const pane = mesh(new T.BoxGeometry(2.8, 5.2, 0.12), mm, { inkW: 0.7 }); pane.position.set(0, 1.6, 0); pane.rotation.y = side * Math.PI / 2; g.add(pane);
        const fr = mesh(new T.BoxGeometry(3.0, 0.2, 0.2), frameM, { inkW: 0.5 }); fr.position.set(0, 4.3, 0); fr.rotation.y = side * Math.PI / 2; g.add(fr);
        post(g, 0, 0, -0.9, h0, frameM, 0.12);
        // a reflection of the switch's lamp in panels that face the turn
        if (s < at.sw5 - 4 && (Math.round(s) % 2 === 0)) { const r = new T.Mesh(new T.CircleGeometry(0.3, 16), K3D.flat(new T.Color('#ffffff').multiplyScalar(1.4), { map: null })); r.position.set(-side * 0.08, 2.4, 0); r.rotation.y = -side * Math.PI / 2; g.add(r); r.userData.live = true; lamps.push(r); }
        void f;
      }
    }
    sc.mirrorLamps = lamps;
  }
  // the clockwork room: giant gears turning on the walls (one's teeth come in over the left rail), a pendulum that
  // swings low across the track, a cuckoo clock whose bird pops out over Bo's head
  function clockwork(K, B, sc) {
    const gearGeo = (r, n, th) => { const s = new T.Shape(); for (let i = 0; i < n * 2; i++) { const a0 = i / (n * 2) * Math.PI * 2, a1 = (i + 1) / (n * 2) * Math.PI * 2, rr = i % 2 ? r : r + th; s.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr); s.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr); } s.closePath(); const hole = new T.Path(); hole.absarc(0, 0, r * 0.3, 0, Math.PI * 2, true); s.holes.push(hole); return new T.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false }); };
    const brass = K3D.toon('#e8b84a', { emissive: '#6a4a10', emissiveIntensity: 0.4 }), copper = K3D.toon('#d8804a', { emissive: '#5a2a10', emissiveIntensity: 0.4 });
    const gears = [];
    // the tip gear: on the left, its teeth reach over the left rail at the riders' height
    const tp = L.tips.find(x => x.kind === 'gear');
    if (tp) {
      const side = -tp.dir, g = onTrack(K, tp.s, side * 4.05, 1.5);
      const gm = mesh(gearGeo(3.2, 14, 0.7), brass, { inkW: 1 }); gm.rotation.y = Math.PI / 2; gm.position.x = -0.25; g.add(gm); gm.userData.live = true;
      const ax = mesh(new T.CylinderGeometry(0.4, 0.4, 1.2, 12).rotateZ(Math.PI / 2), copper, { inkW: 0.7 }); g.add(ax);
      const stripe = mesh(new T.TorusGeometry(3.9, 0.12, 6, 48), hazM(), { ink: false }); stripe.rotation.y = Math.PI / 2; stripe.position.x = 0.05; g.add(stripe);
      post(g, side * 0.6, 0, -1.5, g.position.y + 1.5, copper, 0.3);
      gears.push({ m: gm, sp: 0.9 });
      tipSign(K, B, tp);
    }
    // wall gears round the room (the room is the straight before the U-turn and the turn itself)
    const F = sc.fun;
    for (let i = 0; i < 9; i++) {
      const r = 2 + (i % 3) * 1.6, x = 258 + i * 4.2, z = i % 2 ? 106 : 124 + (i % 3) * 2, y = 6 + (i % 4) * 4;
      const gm = mesh(gearGeo(r, 8 + (i % 4) * 3, 0.5), i % 2 ? brass : copper, { inkW: 0.8 }); gm.position.set(x, y, z); K.add(gm); gm.userData.live = true;
      gears.push({ m: gm, sp: (i % 2 ? 1 : -1) * (0.6 / r) });
    }
    for (let i = 0; i < 6; i++) { const r = 3 + (i % 2) * 2; const gm = mesh(gearGeo(r, 12, 0.6), i % 2 ? copper : brass, { inkW: 0.8 }); gm.position.set(F.x0 + 0.8, 8 + (i % 3) * 7, 108 + i * 5); gm.rotation.y = Math.PI / 2; K.add(gm); gm.userData.live = true; gears.push({ m: gm, sp: (i % 2 ? -1 : 1) * 0.3, y: true }); }
    sc.gears = gears;
    // the pendulum: from high up, swinging across the track; its bob passes low (duck)
    const dp = L.ducks.find(x => x.kind === 'pendulum');
    if (dp) {
      const f = R.at(dp.s), p = R.local(dp.s, 0, HB(dp) + 1.1, f), top = F.H - 1.5, len = top - p[1];
      const piv = new T.Group(); piv.position.set(p[0], top, p[2]); piv.lookAt(p[0] - f.t[0], top, p[2] - f.t[2]); K.add(piv); piv.userData.live = true;
      const rod = mesh(new T.CylinderGeometry(0.14, 0.14, len, 8).translate(0, -len / 2, 0), brass, { inkW: 0.7 }); piv.add(rod);
      const bob = mesh(new T.CylinderGeometry(1.1, 1.1, 0.5, 28).rotateX(Math.PI / 2), K3D.toon('#ffffff', { map: hazTex(), emissive: '#ffffff', emissiveIntensity: 0.2 }), { inkW: 1 }); bob.position.y = -len; piv.add(bob);
      const bobC = mesh(new T.CylinderGeometry(0.7, 0.7, 0.56, 24).rotateX(Math.PI / 2), brass, { inkW: 0.6 }); bobC.position.y = -len; piv.add(bobC);
      const box = mesh(K3D.roundBox(3, 2.4, 2, 0.4, 12), toonM('#5a3a2a'), { inkW: 0.8 }); box.position.set(p[0], top + 0.6, p[2]); K.add(box);
      sc.pendulum = { piv, d: dp, len };
      tassels(K, B, dp.s - 2.6, HB(dp), 'both');
    }
    // the cuckoo clock on a post on Bo's side; the bird shoots out on a spring over Bo's head as the train comes
    const dc = L.ducks.find(x => x.kind === 'cuckoo');
    if (dc) {
      const side = dc.who === 0 ? -1 : 1, g = onTrack(K, dc.s, side * 2.9, 0), h0 = g.position.y;
      post(g, 0, 0, HB(dc) - 0.4, h0, toonM('#5a3a2a'), 0.15);
      const house = mesh(K3D.roundBox(1.6, 2.0, 1.2, 0.3, 10), toonM('#7a4d30', { map: PARK.wood('#7a4d30') }), { inkW: 0.8 }); house.position.y = HB(dc) + 0.6; g.add(house);
      const roof = mesh(new T.ConeGeometry(1.3, 0.9, 4).rotateY(Math.PI / 4), toonM('#3b2e44'), { inkW: 0.8 }); roof.position.y = HB(dc) + 2.0; roof.scale.z = 0.8; g.add(roof);
      const face = new T.Mesh(new T.CircleGeometry(0.5, 24), flatM('#fff2c0', 1.2)); face.position.set(-side * 0.82, HB(dc) + 0.3, 0); face.rotation.y = -side * Math.PI / 2; g.add(face);
      const arm = new T.Group(); arm.position.set(-side * 0.7, HB(dc) + 0.35, 0); g.add(arm); arm.userData.live = true;
      const spring = mesh(new T.CylinderGeometry(0.06, 0.06, 1, 6).rotateZ(Math.PI / 2).translate(-side * 0.5, 0, 0), toonM('#d8d0e8'), { ink: false }); arm.add(spring);
      const bird = new T.Group(); arm.add(bird);
      const bb = mesh(K3D.geo('pcs-bird', () => new T.SphereGeometry(0.35, 14, 10)), toonM('#ffd23a'), { inkW: 0.7 }); bb.scale.set(1.2, 1, 1); bird.add(bb);
      const beak = mesh(new T.ConeGeometry(0.12, 0.35, 8).rotateZ(side * Math.PI / 2), toonM('#ff8a3a'), { inkW: 0.5 }); beak.position.x = -side * 0.45; bird.add(beak);
      sc.cuckoo = { arm, spring, bird, side, d: dc };
      tassels(K, B, dc.s - 2.4, HB(dc), dc.who);
    }
  }
  // the ball pit: a big tub of balls the track ploughs through, balls thrown up as the train passes
  function ballPit(K, B, sc) {
    const a = at.pit - 8, b = at.pitOut + 6, f0 = R.at(a), f1 = R.at(b);
    const cx = (f0.p[0] + f1.p[0]) / 2, cz = (f0.p[2] + f1.p[2]) / 2, len = Math.hypot(f1.p[0] - f0.p[0], f1.p[2] - f0.p[2]) + 6, wid = 7.6;
    const yaw = Math.atan2(f1.p[0] - f0.p[0], f1.p[2] - f0.p[2]);
    const tub = new T.Group(); tub.position.set(cx, 0, cz); tub.rotation.y = yaw; K.add(tub);
    const surf = f0.p[1] + 0.15;
    for (const sx of [-1, 1]) { const w = mesh(new T.BoxGeometry(0.5, surf + 0.6, len), K3D.toon('#ffffff', { map: PARK.stripes('#ff3ad8', '#3affe0', 10, { v: true }) }), { inkW: 0.8 }); w.position.set(sx * wid / 2, (surf + 0.6) / 2, 0); tub.add(w); }
    for (const sz of [-1, 1]) { const w = mesh(new T.BoxGeometry(wid, surf + 0.6, 0.5), K3D.toon('#ffffff', { map: PARK.stripes('#fff23a', '#9a7aff', 10, { v: true }) }), { inkW: 0.8 }); w.position.set(0, (surf + 0.6) / 2, sz * len / 2); tub.add(w); }
    const under = new T.Mesh(new T.PlaneGeometry(wid, len).rotateX(-Math.PI / 2), toonM('#1a1238')); under.position.y = surf - 0.38; tub.add(under);
    const n = 2400, cols = ['#ff3a6a', '#ffd23a', '#3ad8ff', '#7aff6a', '#c96aff', '#ff8a3a'];
    const im = new T.InstancedMesh(K3D.geo('pcs-ball', () => new T.SphereGeometry(0.2, 8, 6)), K3D.toon('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.25 }), n);
    const m4 = new T.Matrix4(), col = new T.Color();
    for (let i = 0; i < n; i++) { const x = (rnd() - 0.5) * (wid - 0.8), z = (rnd() - 0.5) * (len - 0.8), y = surf - 0.35 + rnd() * 0.42; m4.makeTranslation(x, y, z); im.setMatrixAt(i, m4); im.setColorAt(i, col.set(cols[i % cols.length])); }
    tub.add(im);
    // the balls the train throws (live)
    const fly = new T.InstancedMesh(K3D.geo('pcs-ball', () => new T.SphereGeometry(0.2, 8, 6)), K3D.toon('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.25 }), 120);
    for (let i = 0; i < 120; i++) fly.setColorAt(i, col.set(cols[i % cols.length]));
    fly.frustumCulled = false; fly.userData.live = true; K.add(fly);
    sc.pit = { fly, parts: [], surf, a, b };
    if (B) { tub.updateMatrixWorld(true); for (let i = 0; i < 40; i++) { const u = i / 40; B.add(...world(tub, -wid / 2 - 0.2, surf + 0.7, -len / 2 + u * len), cols[i % 6], { size: 0.12, speed: 4, phase: i }); B.add(...world(tub, wid / 2 + 0.2, surf + 0.7, -len / 2 + u * len), cols[(i + 3) % 6], { size: 0.12, speed: 4, phase: i }); } }
  }
  // the climb to the eye: a starry ramp, the moon's eye opening onto the night
  function climb(K, B, sc) {
    if (!B) return;
    for (let s = at.ramp - 6; s < at.eye; s += 2.2) { const f = R.at(s); for (const side of [-1, 1]) B.add(...R.local(s, side * 2.6, 2.4 + Math.sin(s) * 0.4, f), side < 0 ? '#3affe0' : '#ff3ad8', { size: 0.12, speed: 4, phase: s * 0.5 }); }
    void sc;
  }

  /* ---------- the Thunderbolt ---------- */
  // the second lift: scaffolding and tarpaulins down one side, work lamps
  function lift2(K, B, sc) {
    const [a, b] = PR.lifts[1], tarps = [];
    for (let s = a + 4; s < b - 2; s += 7) {
      const f = R.at(s), side = -1, base = R.local(s, side * 3.4, 0, f), top = f.p[1] + 1;
      const g = new T.Group(); g.position.set(base[0], 0, base[2]); g.lookAt(base[0] - f.t[0], 0, base[2] - f.t[2]); K.add(g);
      const pm = toonM('#b8b0c8');
      for (const x of [-0.8, 0.8]) for (const z of [-1.6, 1.6]) { const p = mesh(K3D.geo('pcs-scafP', () => new T.CylinderGeometry(0.07, 0.07, 1, 6).translate(0, 0.5, 0)), pm, { inkW: 0.4 }); p.scale.y = top; p.position.set(x, 0, z); g.add(p); }
      for (let y = 2; y < top; y += 2.2) { const pl = mesh(K3D.geo('pcs-scafPl', () => new T.BoxGeometry(1.8, 0.08, 3.4)), toonM('#8a6440', { map: PARK.wood('#8a6440') }), { inkW: 0.4 }); pl.position.set(0, y, 0); g.add(pl); const br = mesh(K3D.geo('pcs-scafBr', () => new T.CylinderGeometry(0.05, 0.05, 3.9, 5).rotateX(0.95)), pm, { inkW: 0.3 }); br.position.set(-0.8, y - 1.1, 0); g.add(br); }
      if (Math.floor(s / 7) % 2) { const tarp = mesh(new T.PlaneGeometry(3.4, Math.min(top, 8), 6, 4), K3D.toon(['#3a6fb8', '#3f8f6a'][Math.floor(s / 14) % 2], { side: T.DoubleSide, emissive: '#1a2f58', emissiveIntensity: 0.25 }), { inkW: 0.6 }); tarp.position.set(-0.95, top - Math.min(top, 8) / 2, 0); tarp.rotation.y = Math.PI / 2; g.add(tarp); tarp.userData.live = true; tarps.push({ m: tarp, ph: s }); }
      g.updateMatrixWorld(true);
      if (B) B.add(...world(g, 0, top + 0.3, 0), '#ffd27a', { size: 0.16, blink: s % 2 > 1 });
    }
    sc.tarps = tarps;
  }
  // the old wooden trestle under the track from the second lift to the loop: timber bents with cross braces
  function trestle(K, sc) {
    const bents = [];
    for (let s = PR.lifts[1][0] + 2; s < at.cork + 2; s += 3.5) { const f = R.at(s); if (f.p[1] < 1.6) continue; bents.push({ f, p: R.bankLocal(s, 0, -0.45, f) }); }
    const wood = toonM('#7a5838', { map: PARK.wood('#7a5838') });
    const legs = new T.InstancedMesh(K3D.geo('pcs-tLeg', () => new T.BoxGeometry(0.3, 1, 0.3).translate(0, 0.5, 0)), wood, bents.length * 2);
    const xs = new T.InstancedMesh(K3D.geo('pcs-tX', () => new T.BoxGeometry(0.16, 1, 0.16)), wood, bents.length * 6);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc3 = new T.Vector3(), ps = new T.Vector3();
    let li = 0, xi = 0;
    for (const b of bents) {
      const h = b.p[1], yaw = Math.atan2(b.f.t[0], b.f.t[2]), w = 1.1 + h * 0.08;
      for (const sx of [-1, 1]) { e.set(0, yaw, -sx * 0.06); q.setFromEuler(e); m4.compose(ps.set(b.p[0] + b.f.r[0] * sx * w, 0, b.p[2] + b.f.r[2] * sx * w), q, sc3.set(1, h + 0.2, 1)); legs.setMatrixAt(li++, m4); }
      for (let y = 1.5; y < h - 0.5; y += 3) for (const sx of [-1, 1]) { const len = Math.hypot(w * 2, 3); e.set(0, yaw, sx * Math.atan2(w * 2, 3)); q.setFromEuler(e); m4.compose(ps.set(b.p[0], y + 1.5, b.p[2]), q, sc3.set(1, len, 1)); if (xi < bents.length * 6) xs.setMatrixAt(xi++, m4); }
    }
    legs.count = li; xs.count = xi; K3D.ink(legs, INK, 0.5); K3D.ink(xs, INK, 0.4); K.add(legs); K.add(xs);
    // planks that fall away behind the train (a pool)
    const pl = new T.InstancedMesh(K3D.geo('pcs-plank', () => new T.BoxGeometry(0.28, 0.08, 1.2)), toonM('#8a6440', { map: PARK.wood('#8a6440') }), 40);
    pl.frustumCulled = false; pl.userData.live = true; pl.count = 40; K.add(pl);
    const hide = new T.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < 40; i++) pl.setMatrixAt(i, hide);
    sc.planks = { im: pl, list: [], next: at.trestle, head: 0 };
  }
  // the runaway rocket and its siding (the siding leaves to Bo's side at the fork and curls up into the sky)
  function rocket(K, B, sc) {
    const lv = L.levers.find(x => x.kind === 'rocket'); if (!lv) return;
    // the siding: off to Bo's side at the fork, curling up at the end like a ramp into the sky, with a buffer
    const D = RAIL3.build(Array.from({ length: 13 }, (_, i) => ({ p: R.local(lv.fork + i * 1.3, 4.2 * Math.pow(i / 12, 1.5), Math.pow(i / 12, 2.2) * 6), v: 6 })));
    sc.siding = D;
    { const rp = [[], []], sp2 = [], n = 40; for (let i = 0; i <= n; i++) { const q = i / n * D.len, f2 = D.at(q); for (const k of [0, 1]) rp[k].push(v3(D.bankLocal(q, k ? 0.6 : -0.6, 0, f2))); sp2.push(v3(D.bankLocal(q, 0, -0.32, f2))); }
      for (const k of [0, 1]) K.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(rp[k]), 60, 0.075, 6), toonM('#b8a8b8'), { inkW: 0.6 }));
      K.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(sp2), 60, 0.16, 6), toonM('#6a4a30'), { inkW: 0.8 }));
      const end = D.at(D.len), bp = D.bankLocal(D.len, 0, 0.3, end), buf = mesh(new T.BoxGeometry(1.8, 0.6, 0.4), K3D.toon('#ffffff', { map: hazTex() }), { inkW: 0.7 }); buf.position.set(...bp); buf.lookAt(bp[0] + end.t[0], bp[1] + end.t[1], bp[2] + end.t[2]); K.add(buf);
      for (let q = 1; q < D.len; q += 3) { const f2 = D.at(q), p2 = D.bankLocal(q, 0, -0.45, f2); if (p2[1] > 1) { const col = mesh(K3D.geo('pcs-sidCol', () => new T.BoxGeometry(0.28, 1, 0.28).translate(0, 0.5, 0)), toonM('#7a5838', { map: PARK.wood('#7a5838') }), { inkW: 0.4 }); col.position.set(p2[0], 0, p2[2]); col.scale.y = p2[1]; K.add(col); } } }
    const g = new T.Group(); K.add(g); g.userData.live = true; g.visible = false;
    const body = mesh(new T.CylinderGeometry(0.28, 0.28, 1.6, 14).rotateX(Math.PI / 2), K3D.toon('#ffffff', { map: PARK.stripes('#e8483a', '#f4ecd8', 6) }), { inkW: 0.8 }); g.add(body);
    const nose = mesh(new T.ConeGeometry(0.28, 0.6, 14).rotateX(-Math.PI / 2), toonM('#ffd23a'), { inkW: 0.7 }); nose.position.z = -1.1; g.add(nose);
    for (let k = 0; k < 3; k++) { const fin = mesh(new T.BoxGeometry(0.05, 0.5, 0.5), toonM('#3f9a8a'), { inkW: 0.5 }); fin.position.set(Math.cos(k * 2.1) * 0.3, Math.sin(k * 2.1) * 0.3, 0.6); fin.rotation.z = k * 2.1; g.add(fin); }
    const sparks = []; for (let i = 0; i < 18; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: PARK.glowTex(), color: new T.Color(i % 2 ? '#ffd27a' : '#ff6a3a').multiplyScalar(1.6), transparent: true, depthWrite: false, blending: T.AdditiveBlending })); sp.scale.setScalar(0.4); K.add(sp); sp.visible = false; sparks.push({ sp, u: i / 18 }); }
    const light = new T.PointLight('#ff8a4a', 0, 12, 2); g.add(light);
    sc.rocket = { g, lv, sparks, light, burst: false, sideT: 0 };
  }
  // the loop wrapped in bulbs (two more rows round the rails' sides)
  function loopBulbs(B) {
    if (!B) return;
    for (let s = at.loopIn - 2; s < at.loopOut + 2; s += 0.7) { const f = R.at(s); for (const k of [-1, 1]) B.add(...R.bankLocal(s, k * 1.05, 0.25, f), Math.floor(s / 0.7) % 3 ? '#ffe07a' : '#ff6ab0', { size: 0.09, speed: 7, phase: -s * 0.6 }); }
  }
  // the tower crane: asleep on the lift (lights off), then it wakes and swings its hook across the track twice
  function crane(K, B, sc) {
    const C = PR.art.crane, g = new T.Group(); g.position.set(C.x, 0, C.z); K.add(g);
    const yel = toonM('#f2c14e'), dark = toonM('#3b3456');
    const mast = new T.Group(); g.add(mast);
    for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]]) { const p = mesh(new T.BoxGeometry(0.22, C.h, 0.22), yel, { inkW: 0.5 }); p.position.set(x, C.h / 2, z); mast.add(p); }
    for (let y = 1; y < C.h; y += 2) for (let k = 0; k < 4; k++) { const br = mesh(K3D.geo('pcs-craneBr', () => new T.BoxGeometry(0.1, 2.6, 0.1)), yel, { inkW: 0.3 }); const a = k * Math.PI / 2; br.position.set(Math.cos(a) * 0.9, y + 1, Math.sin(a) * 0.9); br.rotation.set(0, -a, 0.75 * (k % 2 ? 1 : -1)); mast.add(br); }
    const base = mesh(new T.BoxGeometry(4, 1, 4), K3D.toon('#ffffff', { map: hazTex() }), { inkW: 0.8 }); base.position.y = 0.5; g.add(base);
    const top = new T.Group(); top.position.y = C.h; g.add(top); top.userData.live = true;
    const jib = mesh(new T.BoxGeometry(0.9, 0.9, 34), yel, { inkW: 0.7 }); jib.position.z = -12; top.add(jib);
    const cj = mesh(new T.BoxGeometry(0.9, 0.9, 10), yel, { inkW: 0.7 }); cj.position.z = 6; top.add(cj);
    const cw = mesh(new T.BoxGeometry(2.4, 2, 2.4), toonM('#8a8296'), { inkW: 0.8 }); cw.position.set(0, -0.8, 10); top.add(cw);
    const cab = mesh(K3D.roundBox(1.8, 1.8, 1.8, 0.3, 10), yel, { inkW: 0.8 }); cab.position.set(1.4, -1.2, 0); top.add(cab);
    const cabWin = new T.Mesh(new T.PlaneGeometry(1.3, 0.8), flatM('#ffe0a0', 1.2)); cabWin.position.set(1.4, -1.0, -0.92); cabWin.rotation.y = Math.PI; top.add(cabWin);
    const peak = mesh(new T.ConeGeometry(0.8, 4, 4), yel, { inkW: 0.6 }); peak.position.y = 2.2; top.add(peak);
    const trolley = new T.Group(); top.add(trolley);
    const tb = mesh(new T.BoxGeometry(1.2, 0.5, 1.2), dark, { inkW: 0.6 }); tb.position.y = -0.7; trolley.add(tb);
    const cable = mesh(new T.CylinderGeometry(0.04, 0.04, 1, 6).translate(0, -0.5, 0), toonM('#cfc8e0'), { ink: false }); cable.position.y = -0.9; trolley.add(cable);
    const hook = new T.Group(); trolley.add(hook);
    const block = mesh(K3D.roundBox(0.9, 0.7, 0.6, 0.3, 10), K3D.toon('#ffffff', { map: hazTex() }), { inkW: 0.8 }); hook.add(block);
    const hk = mesh(new T.TorusGeometry(0.35, 0.1, 8, 16, Math.PI * 1.4), toonM('#d8d0e8'), { inkW: 0.6 }); hk.position.y = -0.7; hk.rotation.z = Math.PI * 0.8; hook.add(hk);
    const jb = PARK.bulbs(K, 160); top.add(jb.mesh); jb.line([0, 0.55, 4], [0, 0.55, -28], 0.8, ['#ff6a3a', '#ffd27a'], { speed: 6, step: 0.6, size: 0.12 }); jb.add(0, 2.6, 0, '#ff3a3a', { size: 0.25, blink: true }); jb.done();
    sc.crane = { g, top, trolley, cable, hook, jb, C };
  }
  // the brake house: a hut by the track, two giant red levers either side, a ring of bulbs over the track (the place to
  // pull), and the ride-photo board by the exit
  function brakeHouse(K, B, sc) {
    const s = at.brake, out = [];
    for (const side of [-1, 1]) {
      const g = onTrack(K, s, side * 2.3, 0), h0 = g.position.y;
      const base = mesh(new T.BoxGeometry(0.9, 0.8, 1.6), toonM('#3b3456'), { inkW: 0.7 }); base.position.y = -0.2; g.add(base);
      post(g, 0, 0, -0.6, h0, toonM('#3b3456'), 0.3);
      const arm = new T.Group(); g.add(arm); arm.userData.live = true;
      const rod = mesh(new T.CylinderGeometry(0.11, 0.11, 2.6, 10).translate(0, 1.3, 0), toonM('#d8d0e8'), { inkW: 0.7 }); arm.add(rod);
      const knob = mesh(new T.SphereGeometry(0.4, 16, 12), K3D.toon('#e8202a', { emissive: '#6a0a0a', emissiveIntensity: 0.5 }), { inkW: 0.9 }); knob.position.y = 2.7; arm.add(knob);
      arm.rotation.x = -0.55;
      out.push({ arm, side: side < 0 ? 0 : 1 });
    }
    const hut = new T.Group(); const f = R.at(s), hp = R.local(s + 1, -7.5, 0, f); hut.position.set(hp[0], 0, hp[2]); hut.lookAt(hp[0] + f.r[0], 0, hp[2] + f.r[2]); K.add(hut);
    const walls = mesh(new T.BoxGeometry(4, 3, 3.4), toonM('#7a4d30', { map: PARK.wood('#7a4d30') }), { inkW: 0.8 }); walls.position.y = 1.5 + hp[1] * 0; hut.add(walls);
    const roof = mesh(new T.ConeGeometry(3.2, 1.4, 4).rotateY(Math.PI / 4), toonM('#c83a4a'), { inkW: 0.8 }); roof.position.y = 3.7; roof.scale.z = 0.85; hut.add(roof);
    const sg = PARK.neon(K, 'BRAKES', { w: 3.2, h: 0.8, col: '#ff5a5a', k: 2.6 }); hut.updateMatrixWorld(true); sg.position.copy(hut.localToWorld(new T.Vector3(0, 2.3, 1.75))); sg.quaternion.copy(hut.quaternion);
    // the ring over the track
    if (B) { const g = onTrack(K, s, 0, 0); for (let k = 0; k <= 28; k++) { const a = Math.PI * k / 28; B.add(...world(g, Math.cos(a) * 2.4, Math.sin(a) * 2.6 + 0.2, 0), k % 2 ? '#ff3a3a' : '#ffffff', { size: 0.12, speed: 8, phase: k * 0.5 }); } }
    // the ride-photo board at the exit: two frames that show the photos taken on the drops
    const SA = PR.art.station, pb = new T.Group(); pb.position.set(SA.x - 5.6, 2.6, SA.z - 5); pb.lookAt(SA.x, 2.6, SA.z - 5); K.add(pb);
    for (const x of [-1.4, 1.4]) post(pb, x, 0, 3.6, 0, toonM('#2a2438'), 0.08);
    const board = mesh(new T.BoxGeometry(3.6, 2.2, 0.15), toonM('#2a2438'), { inkW: 0.8 }); board.position.y = 2.6; pb.add(board);
    const photo = K3D.paint('pcs-photo', 256, 128, (c, w, h) => {
      c.fillStyle = '#1a1626'; c.fillRect(0, 0, w, h);
      for (const [x, n] of [[8, 1], [132, 2]]) { const g2 = c.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, '#2a2a6a'); g2.addColorStop(1, '#8a4a7a'); c.fillStyle = g2; c.fillRect(x, 10, 116, 96); c.fillStyle = '#f4ecd8'; c.beginPath(); c.roundRect(x + 14, 70, 88, 26, 8); c.fill(); for (const [cx, col] of [[x + 40, '#ff8fb3'], [x + 76, '#8fd7ff']]) { c.fillStyle = col; c.beginPath(); c.arc(cx, 62, 13, 0, 7); c.fill(); c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.moveTo(cx - 8, 56); c.lineTo(cx - 14, 30); c.moveTo(cx + 8, 56); c.lineTo(cx + 14, 30); c.stroke(); } c.fillStyle = '#ffd24a'; c.font = '900 13px "DejaVu Sans"'; c.fillText('DROP ' + n, x + 6, 122); }
    });
    const pic = new T.Mesh(new T.PlaneGeometry(3.3, 1.65), K3D.flat(new T.Color('#ffffff').multiplyScalar(1.0), { map: photo })); pic.position.set(0, 2.6, 0.09); pb.add(pic);
    const ps = PARK.neon(K, 'YOUR RIDE PHOTO', { w: 3.4, h: 0.5, col: '#ffd24a', k: 2.4, board: false }); pb.updateMatrixWorld(true); ps.position.copy(pb.localToWorld(new T.Vector3(0, 4.0, 0.1))); ps.quaternion.copy(pb.quaternion);
    sc.brakes = out;
  }

  /* ---------- build ---------- */
  function build(K, B, sc, makePiece) {
    gaps(K, B, sc, makePiece);
    sc.plush = []; sc.hoist = []; sc.scaf = [];
    for (const d of L.ducks) { if (d.kind === 'bunting') bunting(K, B, d); else if (d.kind === 'awning') awning(K, B, d); }
    for (const tp of L.tips) { if (tp.kind === 'plush') sc.plush.push(plush(K, B, tp)); else if (tp.kind === 'gondola') sc.hoist.push(gondola(K, B, tp)); else if (tp.kind === 'scaffold') sc.scaf.push(scaffold(K, B, tp)); }
    for (const d of L.ducks) if (d.kind === 'spoke' || d.kind === 'hook') sign(K, B, d.lead, 1, signTex('duck'), { size: 1.2, bulb: '#ffd23a' });
    sc.switches = []; sc.targets = []; sc.bells = [];
    for (const lv of L.levers) { if (lv.kind === 'switch' || lv.kind === 'rocket') sc.switches.push(switchLever(K, B, lv)); else if (lv.kind === 'target') sc.targets.push(target(K, B, lv)); else if (lv.kind === 'bell') sc.bells.push(bell(K, B, lv)); }
    ringToss(K, B); midwayLine(K, B, sc); fountain(K, B, sc); wheelBar(K, B); crossing(K, B, sc);
    funhouse(K, B, sc);
    lift2(K, B, sc); trestle(K, sc); rocket(K, B, sc); loopBulbs(B); crane(K, B, sc); brakeHouse(K, B, sc);
  }

  /* ---------- every frame ---------- */
  const m4 = new T.Matrix4(), qq = new T.Quaternion(), ee = new T.Euler(), sv = new T.Vector3(), pv = new T.Vector3();
  function update(K, st, dt, sc) {
    const t = (sc.setT = (sc.setT || 0) + dt), s = st.s;
    // switches: lamps red until thrown, the lever swings over, the points' blades shift; the mirror copies of the lamp
    for (const w of sc.switches) {
      const on = !!st.thrown[w.i];
      w.red.visible = !on; w.green.visible = on;
      if (w.halo && w.halo.material) w.halo.material.color.set(on ? '#2ad87a' : '#ff3a3a');
      w.arm.rotation.x += ((on ? 0.5 : -0.5) - w.arm.rotation.x) * Math.min(1, dt * 10);
      w.blades.position.x += ((on ? 0 : (w.side < 0 ? -0.35 : 0.35)) - w.blades.position.x) * Math.min(1, dt * 8);
    }
    const sw5 = sc.switches.find(w => w.lv.s === at.sw5);
    for (const r of sc.mirrorLamps || []) r.material.color.set(sw5 && st.thrown[sw5.i] ? '#2ad87a' : '#ff3a3a').multiplyScalar(1.6);
    for (const tg of sc.targets) { const hit = !!st.thrown[tg.i]; tg.flip.rotation.x += ((hit ? -1.45 : 0) - tg.flip.rotation.x) * Math.min(1, dt * 12); }
    for (const bl of sc.bells) { const hit = st.thrown[bl.i]; bl.hitT = hit ? (bl.hitT || 0) + dt : 0; const u = Math.min(1, bl.hitT / 0.45); bl.puck.position.y = 0.6 - bl.h0 + (bl.H - 1.0) * (hit ? (bl.hitT < 0.45 ? Math.sin(u * Math.PI / 2) : 1 - Math.min(1, (bl.hitT - 0.45) / 1.5) * 0.9) : 0); }
    // things that sway
    for (const p of sc.plush) p.hang.rotation.z = Math.sin(t * 1.3 + p.ph) * 0.08;
    for (const h of sc.hoist) h.hang.rotation.z = Math.sin(t * 1.1 + h.ph) * 0.1;
    for (const tp of sc.tarps || []) tp.m.rotation.x = Math.sin(t * 2.2 + tp.ph) * 0.12;
    for (const tp of sc.scaf) tp.tarp.rotation.x = Math.sin(t * 2.4) * 0.1;
    // the fountain's jets
    if (sc.fountain) {
      for (const d of sc.fountain.drops) { const u = (d.u + t * 0.6) % 1, j = d.j; d.sp.position.set(Math.cos(j.a) * j.reach * u, 1.2 + j.up * 4 * u * (1 - u), Math.sin(j.a) * j.reach * u); }
      for (const m of sc.fountain.mist) { const u = (t * 0.25 + m.ph) % 1; m.sp.position.set(Math.cos(m.ph * 40) * 3, 1 + u * 4, Math.sin(m.ph * 40) * 3); m.sp.scale.setScalar(2 + u * 4); m.sp.material.opacity = (1 - u) * 0.6; }
    }
    // the sweepers: on the rails until the train is about 2.5 s off, then off to the sides (one leaves his broom)
    if (sc.sweepers) {
      const S2 = sc.sweepers, f = S2.f, eta = (S2.s - s) / Math.max(1, st.v), u = smooth(2.6, 1.2, eta);
      S2.bots.forEach((b, i) => {
        const across = b.lane * (1 - u) + (b.from < 0 ? -1 : 1) * (4 + i * 1.2) * u, along = (i - 1) * 1.6;
        const p = R.local(S2.s + along, across, 0); b.r.position.set(p[0], Math.abs(across) < 2.2 ? Math.max(0, p[1] - 0.1) : 0, p[2]);
        b.r.lookAt(p[0] + f.r[0] * b.from, b.r.position.y, p[2] + f.r[2] * b.from);
        b.r.userData.key.rotation.z += dt * 6; b.r.userData.broom.visible = !(i === 1 && u > 0.3); b.r.userData.broom.rotation.x = Math.sin(t * 12 + i) * 0.4;
      });
    }
    // the funhouse: the barrel's spiral turns; gears; the pendulum swings across (low over the track as the train passes)
    if (sc.barrel) sc.barrel.tex.offset.x = (t * 0.35) % 1;
    for (const gr of sc.gears || []) gr.m.rotation[gr.y ? 'x' : 'z'] += dt * gr.sp;
    if (sc.pendulum) { const P2 = sc.pendulum, eta = (P2.d.s - s) / Math.max(1, st.v); const ph = st.phase === 'ride' && Math.abs(eta) < 4 ? eta * 1.9 : t * 1.9; P2.piv.rotation.z = Math.sin(ph) * 0.42; }
    if (sc.cuckoo) { const c = sc.cuckoo, eta = (c.d.s - s) / Math.max(1, st.v), out = st.phase === 'ride' ? smooth(1.4, 0.6, eta) * smooth(-1.0, -0.2, eta) : 0; c.bird.position.x = -c.side * (0.2 + out * 1.8); c.spring.scale.x = 0.2 + out * 1.8; }
    // black light inside the funhouse: the moon and the park's light fade; the painted glow and the bulbs carry it
    if (sc.fun) {
      const fin = s > at.funhouse - 2 && s < at.eye + 1 && st.det < 0 ? 1 : 0;
      sc.blk = (sc.blk || 0) + (fin - (sc.blk || 0)) * Math.min(1, dt * 3);
      const k = sc.blk;
      if (!sc.base) sc.base = { sun: K.sun.intensity, amb: K.amb.intensity, hemi: K.hemi ? K.hemi.intensity : 0, ambC: K.amb.color.clone(), bloom: K.bloom ? K.bloom.strength : 0 };
      K.sun.intensity = sc.base.sun * (1 - k * 0.92); K.amb.intensity = sc.base.amb * (1 - k * 0.35); if (K.hemi) K.hemi.intensity = sc.base.hemi * (1 - k * 0.8);
      K.amb.color.copy(sc.base.ambC).lerp(new T.Color('#6a3aff'), k * 0.8);
      if (K.bloom) K.bloom.strength = sc.base.bloom + k * 0.5;
    }
    // trapdoors: each drops on its hinge as the train comes (and is back for a restart)
    for (const tr of sc.traps || []) { const eta = (tr.h.s0 - s) / Math.max(1, st.v), want = st.phase === 'ride' && eta < 0.75 && s < tr.h.s1 + 30 ? 1 : 0; if (want && tr.a < 0.05) Sfx.play('parkcoasterTrapdoor'); tr.a += (want - tr.a) * Math.min(1, dt * 6); tr.hinge.quaternion.copy(tr.q0); tr.hinge.rotateX(tr.a * 1.4); }
    // the ball pit: balls thrown up round the front of the train
    if (sc.pit) {
      const P3 = sc.pit;
      if (st.phase === 'ride' && s > P3.a && s < P3.b) for (let k = 0; k < 3; k++) { const f = R.at(s + 1.2), p = R.local(s + 1.2, (rnd() - 0.5) * 2.4, 0.2, f); P3.parts.push({ x: p[0], y: P3.surf, z: p[2], vx: f.r[0] * (rnd() - 0.5) * 8 + f.t[0] * 4, vy: 4 + rnd() * 5, vz: f.r[2] * (rnd() - 0.5) * 8 + f.t[2] * 4, life: 1.4 }); }
      while (P3.parts.length > 120) P3.parts.shift();
      for (let i = 0; i < 120; i++) { const q = P3.parts[i]; if (q) { q.vy -= 14 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.life -= dt; if (q.y < P3.surf - 0.1) { q.y = P3.surf - 0.1; q.vy = 0; q.vx *= 0.5; q.vz *= 0.5; } m4.makeTranslation(q.x, q.y, q.z); if (q.life <= 0) m4.makeScale(0, 0, 0); } else m4.makeScale(0, 0, 0); P3.fly.setMatrixAt(i, m4); }
      P3.fly.instanceMatrix.needsUpdate = true;
    }
    // planks falling from the trestle behind the train
    if (sc.planks) {
      const PL = sc.planks;
      if (st.phase === 'ride' && s > at.trestle && s < at.cork && s > PL.next) { PL.next = s + 5 + rnd() * 4; const f = R.at(s - 6), p = R.bankLocal(s - 6, (rnd() - 0.5) * 1.2, -0.3, f); PL.list.push({ i: PL.head, x: p[0], y: p[1], z: p[2], vy: 0, rx: 0, rz: 0, wx: (rnd() - 0.5) * 6, wz: (rnd() - 0.5) * 6, yaw: Math.atan2(f.t[0], f.t[2]) }); PL.head = (PL.head + 1) % 40; if (rnd() < 0.5) Sfx.play('parkcoasterCreak'); }
      if (s < at.trestle - 20) PL.next = at.trestle;
      while (PL.list.length > 40) PL.list.shift();
      for (const q of PL.list) { q.vy -= 12 * dt; q.y = Math.max(0.2, q.y + q.vy * dt); q.rx += q.wx * dt; q.rz += q.wz * dt; ee.set(q.rx, q.yaw, q.rz); qq.setFromEuler(ee); m4.compose(pv.set(q.x, q.y, q.z), qq, sv.set(1, 1, 1)); if (q.y <= 0.2) m4.makeScale(0, 0, 0); PL.im.setMatrixAt(q.i, m4); }
      PL.im.instanceMatrix.needsUpdate = true;
    }
    // the runaway rocket: lands behind the train at the trestle, chases along the rails, then the siding or the car
    if (sc.rocket) {
      const RK = sc.rocket, lv = RK.lv, i = L.levers.indexOf(lv), thrown = !!st.thrown[i];
      const on = st.phase === 'ride' && st.det < 0 && s > at.trestle + 2 && s < lv.fork + 4;
      const done = (st.fx || []).find(x => (x.k === 'rocketOff' || x.k === 'rocketHit') && x.i === i && st.t - x.t < 2.5);
      if (on && !done) {
        const gap = 9 - 6.5 * smooth(at.trestle, lv.fork, s), rs = s - gap, f = R.at(rs), p = R.bankLocal(rs, 0, 0.45, f);
        RK.g.visible = true; RK.g.position.set(...p); RK.g.lookAt(p[0] + f.t[0], p[1] + f.t[1], p[2] + f.t[2]); RK.g.rotateY(Math.PI); RK.g.rotation.z += Math.sin(t * 30) * 0.05;
        RK.light.intensity = 3; RK.burst = false;
        if (!RK.fizz || t - RK.fizz > 0.5) { RK.fizz = t; Sfx.play('parkcoasterFizz'); }
        RK.sparks.forEach(sp => { sp.sp.visible = true; const u = (sp.u + t * 3) % 1, q = R.bankLocal(rs - 0.8 - u * 2.5, (Math.sin(sp.u * 40) * u) * 0.5, 0.45 + u * 0.4, f); sp.sp.position.set(...q); sp.sp.scale.setScalar(0.5 * (1 - u) + 0.1); });
      } else if (done && !RK.burst) {
        RK.burst = true;
        if (done.k === 'rocketOff' && sc.siding) { const q = sc.siding.at(sc.siding.len).p; sc.fw && sc.fw.burst(q[0], q[1] + 14, q[2], '#ffd24a'); }
        else { const q = RK.g.position; sc.fw && sc.fw.burst(q.x, q.y + 2, q.z, '#ff5a7a'); }
        RK.g.visible = false; RK.light.intensity = 0; RK.sparks.forEach(sp => { sp.sp.visible = false; });
      } else if (!on) { RK.g.visible = false; RK.light.intensity = 0; RK.sparks.forEach(sp => { sp.sp.visible = false; }); }
      void thrown;
    }
    // the crane: asleep (still, dark) until the train reaches the loop, then it swings the hook across the track at
    // the first hook place (low, duck) and round to the second (in from the left, tip right)
    if (sc.crane) {
      const Cn = sc.crane, C = Cn.C, d1 = L.ducks.find(x => x.kind === 'hook'), t2 = L.tips.find(x => x.kind === 'hook');
      const awake = s > at.loopIn - 10 && st.phase !== 'board';
      Cn.jb.u.uK.value = awake ? 1 : 0.15;
      const ang = q => Math.atan2(-(q[0] - C.x), -(q[2] - C.z));
      const p1 = d1 ? R.local(d1.s, 0, HB(d1) + 1.2) : [C.x, 8, C.z - 26], p2 = t2 ? R.local(t2.s, -1.15 * t2.dir, 1.0) : p1;
      const a1 = ang(p1), a2 = ang(p2), r1 = Math.hypot(p1[0] - C.x, p1[2] - C.z), r2 = Math.hypot(p2[0] - C.x, p2[2] - C.z);
      let a = a1 + 0.9, r = r1, hy = p1[1];
      if (awake && d1 && t2) {
        const e1 = (d1.s - s) / Math.max(1, st.v), e2 = (t2.s - s) / Math.max(1, st.v);
        if (s < d1.s + 2) { a = a1 + Math.max(-0.5, Math.min(0.9, e1 * 0.45)); r = r1; hy = p1[1]; }
        else { const u = smooth(d1.s + 2, t2.s, s); let da = a2 - a1; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; a = a1 + da * Math.min(1, u * 1.0 + Math.max(0, -e2) * 0.1); r = r1 + (r2 - r1) * u; hy = p1[1] + (p2[1] - p1[1]) * u; }
      }
      let dA = a - Cn.top.rotation.y; while (dA > Math.PI) dA -= Math.PI * 2; while (dA < -Math.PI) dA += Math.PI * 2;
      Cn.top.rotation.y += dA * Math.min(1, dt * (awake ? 6 : 1));
      Cn.trolley.position.set(0, 0, -r);
      const drop = Math.max(0.5, C.h - 1.25 - hy); Cn.cable.scale.y = drop + 0.35; Cn.hook.position.y = -1.25 - drop;
      Cn.hook.rotation.x = Math.sin(t * 1.6) * 0.06;
    }
    // the brake levers pulled
    for (const bk of sc.brakes || []) bk.arm.rotation.x += ((st.brake && st.brake[bk.side] || st.phase === 'stop' || st.phase === 'done' ? 0.75 : -0.55) - bk.arm.rotation.x) * Math.min(1, dt * 10);
  }

  return { build, update, wheelClock };
})();
