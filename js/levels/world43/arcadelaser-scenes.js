/* Pip & Bo - 43-4 Laser Tag Arena: the scenes (ARCADELASER_SCENES). Display only, like the show: every scene is worked
   out from the rules' clock (st.phaseT, or the ending's own clock), so a moment always looks the same.

   ARCADELASER_SCENES.build(K, sc)         once per scene: the referee who suits them up, the blasters it hands over, the
                                           light over the winner's half, the ticket trophy, the machine's insides and the
                                           dusty arcade at dawn for the world's ending
   ARCADELASER_SCENES.heroes(sc, st, t)    [pose, pose] for the heroes while a scene has them (else null): { x, y, z,
                                           face, speed, hands: [p, p] | null (world points), blaster: 0..1 (in hand),
                                           vest: 0..1 (lights on), clap }
   ARCADELASER_SCENES.camera(sc, st, rest) { eye, at, fov } while a scene holds the camera (else null)
   ARCADELASER_SCENES.update(sc, st, dt)   the scene's own things each drawn frame

   OPENING (st.phase 'open', S.OPEN_T = 12 s, no control; jump skips it after the first play)
     0.0  in the vesting room, lit warm: racks of vests charging, lockers, the rules board; the referee holds out two
          blasters; Pip and Bo face the referee, vests still dark
     1.1  Pip gets the first: it sails over into Pip's hands and the vest lights come on (chime); 2.1 the same for Bo
     3.1  they turn to each other, step in and shake on it (three pumps)
     4.9  they turn to the door; the doors slide open (5.0) and Bo is out first, "race you", Pip right behind
     6.6  out in the hall the camera rises and swings round to the play view while Bo runs the far walkway and Pip the
          near-left one; each hops the padded barrier into their base, and turns to face the middle as the count starts
   FINAL (st.phase 'final', S.FINAL_T = 5.5 s)
     The winner's half of the hall lights up in their colour; the referee climbs down from the high chair with the trophy
     (a cup folded out of prize tickets, streamers of tickets spilling from it) and hops the barrier to the winner, who
     lifts it over their head; the loser's vest plays a sad little tune (once) and they clap anyway.
   THE WORLD'S ENDING (after the results card, the first time a player leaves the level: MODES.arcadelaser.outro, about
     12 s, any button skips after a moment)
     0.0  THANK YOU FOR PLAYING prints across the hall in neon, letter by letter; every creature waves
     3.2  a beam of light comes down on Pip and Bo in the middle of the floor and lifts them up through the ceiling
     5.0  up the machine's insides: the gear works (great gears turning), then the coin box (heaps of coins), circuit light
     8.0  a soft white (no flash) and they pop out of the coin slot, full size again, in the dusty arcade at dawn: sun through
          the blinds, dust in the beams, rows of old cabinets; the machine's screen shows the high score table with two sets
          of initials, PIP and BO, and then it winks out (a line, a dot, dark). */
'use strict';

const ARCADELASER_SCENES = (function () {
  const T = K3D.T, AR = ARCADELASER_ARENA, CO = ARCADELASER, S = CO.S, HL = ARCADELASER_HALL;
  const SN = {};
  const INK = ARCADE.INK, toon = (c, o) => ARCADE.toonM(c, o), flat = (c, k, o) => ARCADE.flatM(c, k, o);
  const mk = (geo, mat, o) => K3D.mesh(geo, mat, o), box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const own = (c, k) => new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k), toneMapped: false });
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const seg = (t, a, b) => ease((t - a) / (b - a));
  const angTo = (x0, z0, x1, z1) => Math.atan2(x1 - x0, z1 - z0);
  const turn = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * clamp(k, 0, 1);
  const v1 = new T.Vector3(), v2 = new T.Vector3();

  /* ---------- the plan ---------- */
  const XC = -(HL.GX + 4.0), BW = HL.BACK_Z, EX = AR.HX + 0.16, EZ = AR.HZ + 0.16, WALKX = EX + 0.75 + 0.9, WALKZ = EZ + 0.72;
  // the vesting room: the camera stands inside by the door looking in; across its view the referee, Pip and Bo
  const RC = [XC - 0.4, BW - 3.1], RD = [-0.577, -0.817], RR = [0.817, -0.577];   // middle, view, screen right
  const CAM0 = [XC + 1.4, 2.15, BW - 0.55];                                        // just inside the door
  const REF = [RC[0] - RR[0] * 1.5, RC[1] - RR[1] * 1.5];
  const SPOT = [[RC[0] - RR[0] * 0.45, RC[1] - RR[1] * 0.45], [RC[0] + RR[0] * 0.45, RC[1] + RR[1] * 0.45]];
  const DOOR = [XC, BW];
  // the ways to the bases (Bo the far walkway, Pip out round the near-left), each ending with a hop over the barrier
  const WAY = [
    [[DOOR[0] - 0.35, BW + 1.0], [-WALKX + 0.2, -EZ - 1.2], [-WALKX, AR.BASE[0][1]], [-EX - 0.55, AR.BASE[0][1]], 'hop', [-EX + 0.6, AR.BASE[0][1]], AR.BASE[0]],
    [[DOOR[0] + 0.35, BW + 1.0], [-EX - 0.7, -WALKZ], [AR.BASE[1][0], -WALKZ], 'hop', [AR.BASE[1][0], -EZ + 0.6], AR.BASE[1]]];
  const OUT = [[5.75, 6.75], [5.05, 6.05]];       // through the door: start, outside
  const RUN = [[6.75, 11.5], [6.05, 11.3]];       // the way to the base: start, there
  SN.OPEN = { handPip: [1.1, 1.7], handBo: [2.1, 2.7], face: [3.1, 3.5], shake: [3.5, 4.8], door: [4.9, 5.0, 5.8] };

  // a way's length, and the point (and hop height) a part u of the way along it
  function wayLen(w) { let L = 0, p = null; for (const q of w) { if (q === 'hop') continue; if (p) L += Math.hypot(q[0] - p[0], q[1] - p[1]) * (p.hop ? 1.4 : 1); p = q; } return L; }
  function wayAt(w, u) {
    const pts = []; let hopNext = false;
    for (const q of w) { if (q === 'hop') { hopNext = true; continue; } pts.push({ x: q[0], z: q[1], hop: hopNext }); hopNext = false; }
    const lens = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z) * (pts[i].hop ? 1.6 : 1); lens.push(l); L += l; }
    let d = clamp(u, 0, 1) * L;
    for (let i = 1; i < pts.length; i++) {
      const l = lens[i - 1];
      if (d <= l || i === pts.length - 1) {
        const k = clamp(d / l, 0, 1), a = pts[i - 1], b = pts[i];
        return { x: lerp(a.x, b.x, k), z: lerp(a.z, b.z, k), y: b.hop ? Math.sin(k * Math.PI) * 1.05 : 0, face: angTo(a.x, a.z, b.x, b.z), hop: b.hop };
      }
      d -= l;
    }
    const e = pts[pts.length - 1]; return { x: e.x, z: e.z, y: 0, face: 0 };
  }

  /* ---------- build ---------- */
  SN.build = function (K, sc) {
    const g = { K };
    // the referee who suits them up (the one in the high chair, down for the opening), and the two blasters it holds
    const ref = HL.actor(K, { col: '#ffffff', s: 0.6, stripes: true }); ref.position.set(REF[0], 0, REF[1]); ref.rotation.y = angTo(REF[0], REF[1], RC[0], RC[1]);
    const cap = mk(box(0.5, 0.12, 0.45), toon('#1a1a1e'), { ink: INK, inkW: 0.5 }); cap.position.y = 0.66; ref.add(cap);
    const whistle = new T.Mesh(box(0.1, 0.06, 0.06), flat('#ffe24a', 1.3)); whistle.position.set(0.05, 0.42, 0.3); ref.add(whistle);
    ref.userData.live = true; K.add(ref); g.ref = ref;
    g.proxy = [0, 1].map(id => { const b = ARCADELASER_GEAR.blaster(id); b.userData.live = true; K.add(b); return b; });
    // a warm work lamp over the racks (the room's own light is in the hall build) and a "suit up" chalk board
    // the winner's half of the hall: two big lights in their colour (always there, off until the final)
    g.win = [0, 1].map(() => { const l = new T.PointLight('#ffffff', 0, 26, 1.2); l.userData.live = true; K.add(l); return l; });
    g.win2 = [0, 1].map(() => { const l = new T.PointLight('#ffffff', 0, 18, 1.4); l.userData.live = true; K.add(l); return l; });
    // the ticket trophy (the hall's gold cup is swapped for it)
    g.trophy = ticketTrophy(); g.trophy.scale.setScalar(1.4); g.trophy.userData.live = true; K.add(g.trophy); g.trophy.visible = false;
    g.ending = buildEnding(K);
    sc.scn = g;
    return g;
  };

  // a cup folded out of prize tickets: a ring of ticket strips, a stack of folded tickets for the foot, streamers spilling
  function ticketTex(col) {
    return K3D.paint('al-ticket|' + col, 128, 48, (c, w, h) => {
      c.fillStyle = col; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(0, 4, w, 3); c.fillRect(0, h - 7, w, 3);
      c.fillStyle = '#3a1a10'; c.font = '900 20px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TICKET', w / 2, h / 2 + 1);
      c.fillStyle = 'rgba(0,0,0,0.35)'; for (let y = 2; y < h; y += 6) { c.fillRect(1, y, 2, 3); c.fillRect(w - 3, y, 2, 3); }
    });
  }
  function ticketTrophy() {
    const g = new T.Group();
    const cols = ['#ff7aa8', '#ffb84a', '#ffe36a'], mats = cols.map(c => K3D.toon('#ffffff', { map: ticketTex(c) }));
    // the foot: a squat stack of folded tickets
    for (let k = 0; k < 6; k++) { const s = mk(box(0.34 - k * 0.02, 0.035, 0.2), mats[k % 3], { ink: INK, inkW: 0.4 }); s.position.y = 0.02 + k * 0.036; s.rotation.y = k * 0.5; g.add(s); }
    // the stem: a rolled ticket
    const stem = mk(new T.CylinderGeometry(0.035, 0.045, 0.16, 10), mats[1], { ink: INK, inkW: 0.4 }); stem.position.y = 0.3; g.add(stem);
    // the cup: strips round a flared ring, each leaning out
    const n = 14;
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2, piv = new T.Group(); piv.position.set(Math.sin(a) * 0.08, 0.38, Math.cos(a) * 0.08); piv.rotation.y = a; g.add(piv);
      const s = mk(box(0.075, 0.3, 0.008).translate(0, 0.15, 0), mats[k % 3], { ink: INK, inkW: 0.3 }); s.rotation.x = 0.42; piv.add(s);
    }
    const rim = mk(new T.TorusGeometry(0.2, 0.014, 6, 24).rotateX(Math.PI / 2), K3D.toon('#ffd24a', { emissive: '#5a3a08', emissiveIntensity: 0.5 }), { ink: INK, inkW: 0.4 }); rim.position.y = 0.66; g.add(rim);
    // handles: two curled tickets
    for (const sx of [-1, 1]) { const hnd = mk(new T.TorusGeometry(0.07, 0.016, 6, 12, Math.PI * 1.3), mats[2], { ink: INK, inkW: 0.3 }); hnd.position.set(sx * 0.22, 0.52, 0); hnd.rotation.z = sx * -Math.PI / 2; g.add(hnd); }
    // streamers of tickets spilling over the rim and down the sides
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + 0.4, pts = [];
      for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push(new T.Vector3(Math.sin(a) * (0.2 + u * 0.08), 0.68 - u * u * 0.62, Math.cos(a) * (0.2 + u * 0.08))); }
      const curve = new T.CatmullRomCurve3(pts);
      for (let i = 0; i < 7; i++) { const p = curve.getPoint(i / 7), q = curve.getPoint(i / 7 + 0.07); const t2 = mk(box(0.06, 0.09, 0.006), mats[(i + k) % 3], { ink: false }); t2.position.copy(p); t2.lookAt(q); t2.rotateX(Math.PI / 2); g.add(t2); }
    }
    // a gold star on top
    const st = new T.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.045 : 0.1, a = i / 10 * Math.PI * 2; if (i) st.lineTo(Math.sin(a) * r, Math.cos(a) * r); else st.moveTo(0, r); }
    const star = new T.Mesh(new T.ExtrudeGeometry(st, { depth: 0.02, bevelEnabled: false }), own('#ffd24a', 1.8)); star.position.set(0, 0.82, -0.01); g.add(star);
    g.userData.star = star;
    return g;
  }

  /* ---------- the world's ending: the machine's insides, and the dusty arcade at dawn ---------- */
  const SHAFT = { x: 0, z: 0, y0: 12, y1: 46 };
  const DAWN = { x: 220, z: 0 };
  function buildEnding(K) {
    const e = { root: new T.Group() }; e.root.userData.live = true; K.add(e.root); e.root.visible = false;
    // THANK YOU FOR PLAYING, letter by letter in a row high over the gallery (each letter its own plate, lit in turn)
    const words = 'THANK YOU FOR PLAYING', cols = ['#ff5ad6', '#4ae8ff', '#5aff8a', '#ffe24a'];
    e.letters = [];
    const lw = 0.95, row = new T.Group(); row.position.set(0, 5.9, HL.GZ + 0.6); e.root.add(row);
    let x = -(words.length - 1) * lw / 2;
    for (let i = 0; i < words.length; i++, x += lw) {
      const ch = words[i]; if (ch === ' ') continue;
      const col = cols[i % 4];
      const tex = K3D.paint('al-ty|' + ch + col, 128, 160, (c, w, h) => { c.clearRect(0, 0, w, h); c.font = '900 140px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = col; c.shadowBlur = 22; c.strokeStyle = col; c.lineWidth = 10; c.strokeText(ch, w / 2, h / 2 + 6); c.shadowBlur = 0; c.fillStyle = '#fffaf0'; c.globalAlpha = 0.85; c.fillText(ch, w / 2, h / 2 + 6); });
      const m = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, color: new T.Color(0, 0, 0) });
      const p = new T.Mesh(new T.PlaneGeometry(0.9, 1.12), m); p.position.x = x; row.add(p); e.letters.push({ m, i });
    }
    // the print head that writes them: a bright block sliding along under the row
    e.head = new T.Mesh(box(0.3, 0.16, 0.2), own('#fff6dc', 2.2)); e.head.position.set(0, 5.25, HL.GZ + 0.6); e.root.add(e.head);
    // the beam of light that lifts them (a tall soft cylinder, open, additive) and a ring of light on the floor
    const beamM = new T.ShaderMaterial({ uniforms: { uT: { value: 0 }, uK: { value: 0 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform float uT, uK; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main() { float f = 1.0 - pow(abs(dot(vN, vV)), 0.6); float s = 0.7 + 0.3 * sin(vUv.y * 40.0 - uT * 6.0); gl_FragColor = vec4(vec3(1.0, 0.95, 0.8) * (0.25 + 0.75 * (1.0 - f)) * s * uK * 0.26, 1.0); }' });
    e.beam = new T.Mesh(new T.CylinderGeometry(0.95, 1.2, 60, 32, 1, true), beamM); e.beam.position.set(0, 30, 0.4); e.root.add(e.beam); e.beamM = beamM;
    e.ring = new T.Mesh(new T.RingGeometry(0.95, 1.3, 40).rotateX(-Math.PI / 2), own('#fff0c8', 1.4)); e.ring.material.transparent = true; e.ring.position.set(0, 0.03, 0.4); e.root.add(e.ring);
    // the machine's insides above the hall: the gear works, then the coin box, then circuit light, up a dark shaft
    const shaft = new T.Group(); shaft.position.set(SHAFT.x, 0, SHAFT.z); e.root.add(shaft); e.shaft = shaft;
    const wallM = K3D.toon('#1e1a26');
    for (const [sx, sz, w, d] of [[-1, 0, 0.4, 14], [1, 0, 0.4, 14], [0, -1, 14, 0.4]]) { const wl = mk(box(w, SHAFT.y1 - SHAFT.y0, d), wallM, { ink: false }); wl.position.set(sx * 7, (SHAFT.y0 + SHAFT.y1) / 2, sz * 7 + 0.4); shaft.add(wl); }
    // the ceiling the beam opens: a round hatch of light
    const hatch = new T.Mesh(new T.CircleGeometry(1.6, 32).rotateX(Math.PI / 2), own('#fff0c8', 1.2)); hatch.position.set(0, HL.CEIL - 0.05, 0.4); e.root.add(hatch); e.hatch = hatch;
    // seen from above as they rise: the hall's roof, a dark slab of panels with the round hole they come up through and a rim of light
    const roofTex = K3D.paint('al-roof', 256, 256, (c, w, h) => { c.fillStyle = '#221e2a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#141018'; c.lineWidth = 3; for (let k = 0; k <= w; k += 32) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, h); c.stroke(); c.beginPath(); c.moveTo(0, k); c.lineTo(w, k); c.stroke(); } c.fillStyle = '#3a3442'; for (let y = 4; y < h; y += 32) for (let x = 4; x < w; x += 32) { c.fillRect(x, y, 3, 3); c.fillRect(x + 22, y, 3, 3); c.fillRect(x, y + 22, 3, 3); c.fillRect(x + 22, y + 22, 3, 3); } });
    roofTex.wrapS = roofTex.wrapT = T.RepeatWrapping; roofTex.repeat.set(8, 8);
    const roofSh = new T.Shape(); roofSh.moveTo(-30, -30); roofSh.lineTo(30, -30); roofSh.lineTo(30, 30); roofSh.lineTo(-30, 30); roofSh.lineTo(-30, -30);
    const roofHole = new T.Path(); roofHole.absarc(0, -0.4, 1.7, 0, Math.PI * 2, true); roofSh.holes.push(roofHole);
    const slab = mk(new T.ShapeGeometry(roofSh, 40).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: roofTex, side: T.DoubleSide }), { ink: false });
    { const uv = slab.geometry.attributes.uv, pos = slab.geometry.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 30) / 60, (pos.getZ(i) + 30) / 60); }
    slab.position.set(0, HL.CEIL + 0.3, 0); e.root.add(slab); e.slab = slab;
    const rim = new T.Mesh(new T.TorusGeometry(1.72, 0.08, 8, 48).rotateX(Math.PI / 2), own('#fff0c8', 2.2)); rim.position.set(0, HL.CEIL + 0.34, 0.4); e.root.add(rim); e.slab.userData.rim = rim;
    e.gears = [];
    const gearM = [K3D.toon('#b8913a', { emissive: '#3a2a08', emissiveIntensity: 0.4 }), K3D.toon('#8a8a96'), K3D.toon('#c86a3a')];
    const gear = (r, teeth, th) => {
      const sh = new T.Shape();
      for (let i = 0; i < teeth * 2; i++) { const a0 = i / (teeth * 2) * Math.PI * 2, a1 = (i + 1) / (teeth * 2) * Math.PI * 2, rr = i % 2 ? r : r * 1.12; if (!i) sh.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr); else sh.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr); sh.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr); }
      const hole = new T.Path(); hole.absarc(0, 0, r * 0.22, 0, Math.PI * 2, true); sh.holes.push(hole);
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, hp = new T.Path(); hp.absarc(Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58, r * 0.16, 0, Math.PI * 2, true); sh.holes.push(hp); }
      return new T.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 });
    };
    const G2 = [[-3.6, 17, -3.5, 2.6, 20, 1], [2.2, 15.5, -4.5, 1.7, 14, -1.25], [3.8, 19.8, -2.6, 1.2, 10, 1.9], [-2.0, 21.5, -5.2, 2.0, 16, -1.1], [-5.4, 13.6, -2.2, 1.3, 11, 1.7], [4.8, 23, -4.0, 2.2, 18, -0.9]];
    G2.forEach(([x, y, z, r, n, sp], i) => { const m = mk(gear(r, n, 0.35), gearM[i % 3], { ink: INK, inkW: 0.6 }); m.position.set(x, y, z); shaft.add(m); e.gears.push({ m, sp }); const ax = mk(new T.CylinderGeometry(0.12, 0.12, 1.4, 10).rotateX(Math.PI / 2), K3D.toon('#4a4652'), { ink: false }); ax.position.set(x, y, z - 0.4); shaft.add(ax); });
    // the coin box: a great tray of coins on a ledge, and coins tumbling down past them
    const coinG = new T.CylinderGeometry(0.32, 0.32, 0.07, 18);
    const coins = new T.InstancedMesh(coinG, K3D.toon('#ffcf3a', { emissive: '#5a3a08', emissiveIntensity: 0.6 }), 520);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), eu = new T.Euler();
    let ci = 0;
    for (let k = 0; k < 440; k++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 3.2; const x = Math.cos(a) * r * 1.4, z = -4 + Math.sin(a) * r * 0.6, y = 27.2 + (1 - r / 3.2) * 1.1 + Math.random() * 0.3; eu.set((Math.random() - 0.5) * 0.9, Math.random() * 3, (Math.random() - 0.5) * 0.9); q.setFromEuler(eu); m4.compose(v1.set(x, y, z), q, v2.set(1, 1, 1)); coins.setMatrixAt(ci++, m4); }
    e.fall = [];
    for (let k = 0; k < 80; k++) e.fall.push({ i: ci++, x: (Math.random() - 0.5) * 9, z: -2 - Math.random() * 3, y: 24 + Math.random() * 18, v: 2 + Math.random() * 3, s: Math.random() * 6 });
    coins.count = ci; shaft.add(coins); e.coins = coins;
    const tray = mk(new T.CylinderGeometry(5.0, 4.6, 0.7, 28, 1, true), K3D.toon('#6a6472', { side: T.DoubleSide }), { ink: INK, inkW: 0.7 }); tray.scale.set(1, 1, 0.5); tray.position.set(0, 27.3, -4); shaft.add(tray);
    const trayB = mk(new T.CylinderGeometry(4.6, 4.6, 0.12, 28), K3D.toon('#4a4652'), { ink: false }); trayB.scale.set(1, 1, 0.5); trayB.position.set(0, 26.95, -4); shaft.add(trayB);
    const lbl = HL.board('COIN BOX', 2.4, 0.5, { bg: '#1a1420', col: '#ffe24a', fc: '#ffe24a', k: 1.6 }); lbl.position.set(0, 26.4, -1.6); shaft.add(lbl);
    // circuit light: glowing traces up the walls, chips, a few blinking LEDs
    const L = ARCADE.lights(K, 900); e.L = L;
    for (let k = 0; k < 26; k++) { const x = (Math.random() - 0.5) * 12, y0 = SHAFT.y0 + Math.random() * 30, y1 = y0 + 2 + Math.random() * 4, c = ARCADE.pick(['#5aff8a', '#4ae8ff', '#ff5ad6', '#ffe24a']); L.line([x, y0, -6.5], [x, y1, -6.5], 0.25, c, { size: 0.045 }); L.line([x, y1, -6.5], [x + (Math.random() - 0.5) * 3, y1, -6.5], 0.25, c, { size: 0.045 }); }
    for (let k = 0; k < 10; k++) { const ch = mk(box(1.2, 0.8, 0.15), K3D.toon('#16141c'), { ink: INK, inkW: 0.5 }); ch.position.set((Math.random() - 0.5) * 11, 30 + Math.random() * 14, -6.6); shaft.add(ch); }
    L.done();
    const shaftLight = new T.PointLight('#ffd890', 0, 30, 1.2); shaftLight.position.set(0, 22, 2); shaft.add(shaftLight); e.shaftLight = shaftLight;
    const shaftLight2 = new T.PointLight('#7affd8', 0, 24, 1.2); shaftLight2.position.set(0, 34, 0); shaft.add(shaftLight2); e.shaftLight2 = shaftLight2;
    // the soft white at the top
    e.white = new T.Mesh(new T.PlaneGeometry(400, 400), new T.MeshBasicMaterial({ color: '#fff6e6', transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }));
    e.white.renderOrder = 50; e.white.userData.noSee = true; e.root.add(e.white);
    // the dusty arcade at dawn
    e.dawn = buildDawn(K, e.root);
    return e;
  }
  function buildDawn(K, root) {
    const d = { g: new T.Group() }; d.g.position.set(DAWN.x, 0, DAWN.z); root.add(d.g);
    const g = d.g;
    // floor boards, a long room, the back wall with blinds and the low sun through them
    const floorTex = K3D.paint('al-dawn-floor', 256, 256, (c, w, h) => { c.fillStyle = '#5a3e2c'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { c.fillStyle = y % 64 ? '#62452f' : '#523827'; c.fillRect(0, y, w, 30); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, y + 30, w, 2); for (let x = (y * 7) % 90; x < w; x += 90) c.fillRect(x, y, 2, 30); } c.fillStyle = 'rgba(200,180,150,0.12)'; for (let k = 0; k < 400; k++) c.fillRect(Math.random() * w, Math.random() * h, 2, 1); });
    floorTex.wrapS = floorTex.wrapT = T.RepeatWrapping; floorTex.repeat.set(5, 4);
    const fl = mk(new T.PlaneGeometry(24, 18).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: floorTex }), { ink: false }); g.add(fl);
    const wallM = K3D.toon('#6a5a6a');
    const back = mk(box(24, 6, 0.3), wallM, { ink: false }); back.position.set(0, 3, -6); g.add(back);
    for (const sx of [-1, 1]) { const sw = mk(box(0.3, 6, 18), wallM, { ink: false }); sw.position.set(sx * 12, 3, 3); g.add(sw); }
    // windows with blinds on the back wall: bright dawn sky behind slats
    const shaftTex = K3D.paint('al-dawn-shaft', 32, 128, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'destination-in'; const gx = c.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.5, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gx; c.fillRect(0, 0, w, h); });
    const shaftM = new T.MeshBasicMaterial({ map: shaftTex, color: new T.Color('#ffc88a').multiplyScalar(0.32), transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false });
    for (const wx of [-7, 7]) {
      const sky = new T.Mesh(new T.PlaneGeometry(3.2, 2.2), new T.MeshBasicMaterial({ map: K3D.paint('al-dawn-sky', 64, 64, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffcf8a'); gr.addColorStop(0.6, '#ff9a6a'); gr.addColorStop(1, '#ffe2b0'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }), toneMapped: false, color: new T.Color(1.15, 1.15, 1.15) }));
      sky.position.set(wx, 3.2, -5.84); g.add(sky);
      for (let k = 0; k < 10; k++) { const sl = mk(box(3.3, 0.08, 0.05), K3D.toon('#e8dcc8'), { ink: false }); sl.position.set(wx, 2.2 + k * 0.22, -5.8); sl.rotation.x = 0.6; g.add(sl); }
      const fr = mk(box(3.5, 2.5, 0.12), K3D.toon('#3a2a22'), { ink: INK, inkW: 0.5 }); fr.position.set(wx, 3.2, -5.9); g.add(fr);
      // sunbeams through the slats: thin soft shafts from the window down to the floor (two crossed strips each), fading as they fall
      for (let k = 0; k < 6; k++) {
        const A = new T.Vector3(wx - 1.2 + k * 0.48, 2.35 + Math.random() * 1.6, -5.7), B = new T.Vector3(A.x * 0.55 - 0.6 + Math.random() * 0.5, 0.01, -1.4 + Math.random() * 1.2);
        const dir = B.clone().sub(A), len = dir.length(); dir.normalize();
        const sh = new T.Group(); sh.position.copy(A); sh.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), dir); g.add(sh);
        for (const ry of [0, Math.PI / 2]) { const pl = new T.Mesh(new T.PlaneGeometry(0.16 + Math.random() * 0.14, len).translate(0, -len / 2, 0), shaftM); pl.rotation.y = ry; sh.add(pl); }
      }
    }
    // the machine they come out of: an old upright cabinet, the coin door with its slot lit
    const cab = new T.Group(); cab.position.set(0, 0, -2.4); g.add(cab); d.cab = cab;
    const sideTex = K3D.paint('al-dawn-cabside', 128, 256, (c, w, h) => { c.fillStyle = '#2a1e3a'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff5ad6'; c.beginPath(); c.moveTo(0, h * 0.25); c.lineTo(w, h * 0.18); c.lineTo(w, h * 0.3); c.lineTo(0, h * 0.4); c.fill(); c.fillStyle = '#4ae8ff'; c.beginPath(); c.moveTo(0, h * 0.45); c.lineTo(w, h * 0.38); c.lineTo(w, h * 0.44); c.lineTo(0, h * 0.52); c.fill(); c.fillStyle = 'rgba(255,255,255,0.08)'; for (let k = 0; k < 60; k++) c.fillRect(Math.random() * w, Math.random() * h, 3, 1); });
    const cabM = K3D.toon('#ffffff', { map: sideTex });
    const body = mk(box(1.5, 3.4, 1.3), cabM, { ink: INK, inkW: 0.9 }); body.position.y = 1.7; cab.add(body);
    const marquee = HL.board('PLAY!', 1.5, 0.42, { bg: '#1a1020', col: '#ffe24a', fc: '#ff5ad6', k: 1.5 }); marquee.position.set(0, 3.15, 0.66); cab.add(marquee);
    const bezel = mk(box(1.3, 1.1, 0.1), K3D.toon('#141018'), { ink: INK, inkW: 0.6 }); bezel.position.set(0, 2.25, 0.62); bezel.rotation.x = -0.15; cab.add(bezel);
    // the screen: the high score table drawn into a canvas texture, and its wink-out
    const scrTex = K3D.paint('al-dawn-scores', 256, 200, (c, w, h) => {
      c.fillStyle = '#05060a'; c.fillRect(0, 0, w, h);
      c.font = '900 22px "DejaVu Sans Mono", monospace'; c.textAlign = 'center'; c.fillStyle = '#ff5ad6'; c.fillText('HIGH SCORES', w / 2, 34);
      const rows = [['1ST', 'PIP', '99990', '#ffb35a'], ['2ND', 'BO ', '99980', '#6ab8ff'], ['3RD', 'ZAP', '41200', '#9a96a2'], ['4TH', 'ACE', '30050', '#9a96a2'], ['5TH', 'BIT', '12100', '#9a96a2']];
      c.font = '700 19px "DejaVu Sans Mono", monospace'; c.textAlign = 'left';
      rows.forEach(([a, n, s, col], i) => { c.fillStyle = col; c.fillText(a + '  ' + n + '  ' + s, 34, 74 + i * 26); });
      c.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = 0; y < h; y += 3) c.fillRect(0, y, w, 1);
    });
    const scrM = new T.MeshBasicMaterial({ map: scrTex, toneMapped: false, color: new T.Color(1.5, 1.5, 1.5) });
    const scr = new T.Mesh(new T.PlaneGeometry(1.1, 0.86), scrM); scr.position.set(0, 2.25, 0.68); scr.rotation.x = -0.15; cab.add(scr); d.scr = scr; d.scrM = scrM;
    const dot = new T.Mesh(new T.CircleGeometry(0.02, 12), new T.MeshBasicMaterial({ color: new T.Color(3, 3, 3), toneMapped: false })); dot.position.set(0, 2.25, 0.69); dot.rotation.x = -0.15; dot.visible = false; cab.add(dot); d.dot = dot;
    const panel = mk(box(1.4, 0.18, 0.6), K3D.toon('#2a2232'), { ink: INK, inkW: 0.6 }); panel.position.set(0, 1.45, 0.85); panel.rotation.x = 0.25; cab.add(panel);
    for (const [bx, col] of [[-0.35, '#ffb35a'], [0.35, '#6ab8ff']]) { const st = mk(new T.CylinderGeometry(0.02, 0.02, 0.18, 8), K3D.toon('#1a1a1e'), { ink: false }); st.position.set(bx, 1.62, 0.85); cab.add(st); const ball = mk(new T.SphereGeometry(0.06, 12, 8), K3D.toon(col), { ink: INK, inkW: 0.4 }); ball.position.set(bx, 1.72, 0.85); cab.add(ball); for (let k = 0; k < 2; k++) { const bt = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.03, 12), flat(col, 1.2)); bt.position.set(bx + 0.14 + k * 0.1, 1.56, 0.8); cab.add(bt); } }
    const coinDoor = mk(box(0.6, 0.5, 0.06), K3D.toon('#8a8a96'), { ink: INK, inkW: 0.6 }); coinDoor.position.set(0, 0.85, 0.67); cab.add(coinDoor);
    for (const sx of [-0.13, 0.13]) { const slot = new T.Mesh(box(0.035, 0.12, 0.02), own('#ff5a3a', 1.8)); slot.position.set(sx, 0.92, 0.705); cab.add(slot); }
    d.slotPos = [cab.position.x + DAWN.x, 0.92, cab.position.z + 0.75];
    // other old cabinets in rows, dust sheets on two, a broom, a stool, a dusty prize shelf
    const others = [[-3.0, -2.6, 0.1], [-4.8, -2.7, -0.05], [3.0, -2.6, -0.1], [4.8, -2.7, 0.05], [-8.5, -1.0, 1.4], [8.5, -1.0, -1.4], [-8.8, 2.5, 1.5], [8.8, 2.5, -1.5]];
    others.forEach(([x, z, r], i) => {
      const o = mk(box(1.3, 3.0, 1.1), i % 3 === 1 ? K3D.toon('#a89e90') : K3D.toon(['#3a2a4a', '#2a3a4a', '#4a2a2a', '#2a4a3a'][i % 4]), { ink: INK, inkW: 0.7 }); o.position.set(x, 1.5, z); o.rotation.y = r; g.add(o);
      if (i % 3 !== 1) { const s = new T.Mesh(new T.PlaneGeometry(1.0, 0.75), new T.MeshBasicMaterial({ color: new T.Color('#1a2a3a').multiplyScalar(0.6), toneMapped: false })); s.position.set(0, 0.5, 0.56); o.add(s); }
    });
    const stool = mk(new T.CylinderGeometry(0.3, 0.32, 0.7, 14), K3D.toon('#a83a3a'), { ink: INK, inkW: 0.6 }); stool.position.set(1.7, 0.35, -0.6); g.add(stool);
    const broom = mk(new T.CylinderGeometry(0.03, 0.03, 1.8, 6), K3D.toon('#a87a4a'), { ink: false }); broom.position.set(-2.35, 0.9, -1.7); broom.rotation.z = 0.22; g.add(broom);
    const bristle = mk(new T.CylinderGeometry(0.09, 0.16, 0.32, 10), K3D.toon('#c8a860'), { ink: INK, inkW: 0.4 }); bristle.position.set(-2.18, 0.14, -1.7); bristle.rotation.z = 0.22; g.add(bristle);
    // a dust pan and a little heap of sweepings, a coin someone dropped
    const pan = mk(box(0.34, 0.03, 0.28), K3D.toon('#3a6a8a'), { ink: INK, inkW: 0.4 }); pan.position.set(-1.7, 0.02, -1.3); pan.rotation.y = 0.4; g.add(pan);
    const heap = mk(new T.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), K3D.toon('#7a6a5a'), { ink: false }); heap.scale.y = 0.35; heap.position.set(-1.45, 0, -1.0); g.add(heap);
    const lost = mk(new T.CylinderGeometry(0.06, 0.06, 0.015, 14), K3D.toon('#ffcf3a', { emissive: '#5a3a08', emissiveIntensity: 0.5 }), { ink: false }); lost.position.set(0.9, 0.01, 0.4); g.add(lost);
    // posters for the machine's own made-up games on the back wall, a dusty prize shelf, the ceiling with its lamps still off
    const posters = [['COIN DROP', '#ffcf3a', '#2a1e3a'], ['PINBALL PANIC', '#ff5ad6', '#102a3a'], ['CLAW RESCUE', '#5aff8a', '#2a1a1a'], ['ZAP MAZE', '#4ae8ff', '#1a1a2a']];
    posters.forEach(([txt, fc, bg], i) => {
      const tex = K3D.paint('al-dawn-poster' + i, 128, 180, (c, w, h) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fc; c.globalAlpha = 0.25; for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(w * (0.2 + 0.6 * ((k * 37) % 10) / 10), h * (0.35 + 0.08 * k), 10 + k * 3, 0, Math.PI * 2); c.fill(); } c.globalAlpha = 1; c.font = '900 17px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; const ws = txt.split(' '); ws.forEach((wd, j) => c.fillText(wd, w / 2, 30 + j * 20)); c.strokeStyle = fc; c.lineWidth = 4; c.strokeRect(4, 4, w - 8, h - 8); c.fillStyle = 'rgba(255,240,200,0.12)'; c.fillRect(0, h * 0.6, w, h * 0.4); });
      const pp = new T.Mesh(new T.PlaneGeometry(0.95, 1.34), K3D.toon('#ffffff', { map: tex })); pp.position.set([-4.2, -2.2, 2.2, 4.2][i], 3.9 + (i % 2) * 0.12, -5.84); pp.rotation.z = [0.04, -0.03, 0.05, -0.04][i]; g.add(pp);
      const pin = new T.Mesh(new T.SphereGeometry(0.03, 6, 4), K3D.toon('#d83a3a')); pin.position.set(pp.position.x, pp.position.y + 0.6, -5.8); g.add(pin);
    });
    const shelf = mk(box(2.6, 0.08, 0.42), K3D.toon('#6a4a32'), { ink: INK, inkW: 0.5 }); shelf.position.set(-9.6, 2.1, -5.6); g.add(shelf);
    const shelf2 = shelf.clone(); shelf2.position.y = 1.2; g.add(shelf2);
    for (let k = 0; k < 9; k++) { const col = ['#ff9ad6', '#7affd8', '#ffe24a', '#b48aff', '#5aff8a'][k % 5], pl = mk(new T.SphereGeometry(0.15, 10, 8), K3D.toon(col), { ink: INK, inkW: 0.4 }); pl.position.set(-10.7 + (k % 5) * 0.5, (k < 5 ? 2.3 : 1.4), -5.55); g.add(pl); const ear = new T.Mesh(new T.SphereGeometry(0.055, 6, 4), pl.material); ear.position.set(pl.position.x + 0.09, pl.position.y + 0.14, -5.55); g.add(ear); }
    const ceil = mk(box(24, 0.2, 18), K3D.toon('#3a3040'), { ink: false }); ceil.position.set(0, 6.1, 3); g.add(ceil);
    for (const [lx, lz] of [[-5, -2], [0, -2], [5, -2], [-5, 3], [0, 3], [5, 3]]) { const cord = new T.Mesh(box(0.02, 1.3, 0.02), K3D.toon('#1a1a1e')); cord.position.set(lx, 5.35, lz); g.add(cord); const shade = mk(new T.ConeGeometry(0.38, 0.32, 16, 1, true), K3D.toon('#2a5a4a', { side: T.DoubleSide }), { ink: INK, inkW: 0.5 }); shade.position.set(lx, 4.6, lz); g.add(shade); const bulb = new T.Mesh(new T.SphereGeometry(0.08, 8, 6), K3D.toon('#d8d0c0')); bulb.position.set(lx, 4.45, lz); g.add(bulb); }
    // warm low sun and a cool fill (the hall's own lights are far off)
    const sun = new T.SpotLight('#ffc88a', 0, 40, 0.7, 0.6, 1.2); sun.position.set(6, 8, -12); sun.target.position.set(0, 0, 0); g.add(sun, sun.target); d.sun = sun;
    const fill = new T.PointLight('#8a9aff', 0, 30, 1.2); fill.position.set(0, 4, 6); g.add(fill); d.fill = fill;
    const warm = new T.PointLight('#ffb070', 0, 14, 1.4); warm.position.set(0, 2.6, 1.6); g.add(warm); d.warm = warm;
    // dust in the sunbeams
    d.dust = ARCADE.motes(K, { n: 500, box: 14, pixels: 0, k: 1.1 });
    d.dust.userData = d.dust.userData || {};
    return d;
  }

  /* ---------- where the heroes are in a scene ---------- */
  SN.heroes = function (sc, st, t) {
    if (st.phase === 'open') return opening(sc, st);
    if (st.phase === 'final') return finalPoses(sc, st);
    if (st.ending) return endingPoses(sc, st);
    return null;
  };
  function opening(sc, st) {
    const t = st.phaseT, O = SN.OPEN, out = [];
    const mid = [(SPOT[0][0] + SPOT[1][0]) / 2, (SPOT[0][1] + SPOT[1][1]) / 2];
    for (const id of [0, 1]) {
      const [sx, sz] = SPOT[id], hand = id ? O.handBo : O.handPip;
      // (half turned to the referee, half to the camera, so their faces show)
      let x = sx, z = sz, y = 0, face = turn(angTo(sx, sz, CAM0[0], CAM0[2]), angTo(sx, sz, REF[0], REF[1]), 0.55), speed = 0, hands = null;
      const blaster = t >= hand[1] ? 1 : 0, vest = clamp((t - hand[1]) / 0.25, 0, 1);
      // to each other, the handshake
      const other = SPOT[1 - id], toO = angTo(sx, sz, other[0], other[1]);
      face = turn(face, toO, seg(t, O.face[0], O.face[1]));
      const step = seg(t, O.face[1], O.face[1] + 0.3) * (1 - seg(t, O.shake[1] - 0.1, O.shake[1] + 0.2)) * 0.12;
      x += (mid[0] - sx) * step * 2.4; z += (mid[1] - sz) * step * 2.4;
      if (t > O.shake[0] && t < O.shake[1]) {
        const pump = Math.sin((t - O.shake[0]) / (O.shake[1] - O.shake[0]) * Math.PI * 6) * 0.06;
        hands = [v1.set(mid[0], 0.42 + pump, mid[1]).clone(), null];
      }
      // to the door, out, and the way to the base
      const out0 = OUT[id][0], out1 = OUT[id][1];
      if (t >= O.shake[1]) {
        const doorWay = [[x, z], [DOOR[0] + (id ? 0.35 : -0.35), BW - 0.4], WAY[id][0]];
        if (t < out0) face = turn(face, angTo(x, z, doorWay[1][0], doorWay[1][1]), seg(t, O.shake[1], O.shake[1] + 0.35));
        else if (t < out1) { const p = wayAt(doorWay, ease((t - out0) / (out1 - out0) * 0.9 + 0.1 * ((t - out0) / (out1 - out0)))); x = p.x; z = p.z; face = p.face; speed = 0.75; }
        else {
          const r0 = RUN[id][0], r1 = RUN[id][1], u = clamp((t - r0) / (r1 - r0), 0, 1);
          const p = wayAt(WAY[id], u < 1 ? (u * u * 0.15 + u * 0.85) : 1);
          x = p.x; z = p.z; y = p.y; face = p.face; speed = u < 1 ? (id ? 1.1 : 0.85) : 0;
          if (u >= 1) face = turn(p.face, AR.BASE_FACE[id], seg(t, r1, r1 + 0.4));
        }
      }
      out.push({ x, y, z, face, speed, hands, blaster, vest, vy: 0 });
    }
    return out;
  }
  function finalPoses(sc, st) {
    const w = st.winner >= 0 ? st.winner : 0, t = st.phaseT, hs = st.heroes, out = [];
    const g = sc.scn, tp = trophyPos(st, t);
    for (const id of [0, 1]) {
      const h = hs[id], p = { x: h.x, y: 0, z: h.z, face: h.face, speed: 0, hands: null, blaster: 1, vest: 1, vy: 0 };
      if (id === w) {
        // turn to the referee as it comes, take the cup, lift it high
        p.face = turn(h.face, angTo(h.x, h.z, tp.x, tp.z), seg(t, 0.6, 1.4));
        if (t > 2.3) { p.face = turn(p.face, angTo(h.x, h.z, 0, 14), seg(t, 2.3, 2.9)); const up = seg(t, 2.4, 3.0); p.hands = [new T.Vector3(tp.x - 0.12, tp.y + 0.15, tp.z), new T.Vector3(tp.x + 0.12, tp.y + 0.15, tp.z)]; p.y = up * Math.abs(Math.sin((t - 2.4) * 5)) * 0.18; p.blaster = 0; }
      } else {
        // the loser turns to the winner and claps
        const o = hs[w]; p.face = turn(h.face, angTo(h.x, h.z, o.x, o.z), seg(t, 0.8, 1.6)); p.vest = 0.15;
        if (t > 1.8) { const c = Math.abs(Math.sin((t - 1.8) * 9)) * 0.1, fx = Math.sin(p.face), fz = Math.cos(p.face); p.hands = [new T.Vector3(h.x + fx * 0.32 - fz * (0.03 + c), 0.5, h.z + fz * 0.32 + fx * (0.03 + c)), new T.Vector3(h.x + fx * 0.32 + fz * (0.03 + c), 0.5, h.z + fz * 0.32 - fx * (0.03 + c))]; p.blaster = 0; p.clap = true; }
      }
      out.push(p);
    }
    void g;
    return out;
  }
  // the referee's walk with the trophy: down from the chair, over the barrier, to the winner; then the cup goes up
  function refPath(st, t) {
    const w = st.heroes[st.winner >= 0 ? st.winner : 0], rf = { x: EX + 1.35, z: -2.4 };
    const dx = w.x - rf.x, dz = w.z - rf.z, d = Math.hypot(dx, dz) || 1, end = { x: w.x - dx / d * 0.7, z: w.z - dz / d * 0.7 };
    const u = seg(t, 0.5, 2.1);
    return { x: lerp(rf.x, end.x, u), z: lerp(rf.z, end.z, u), y: t < 0.5 ? 2.17 * (1 - seg(t, 0.0, 0.5)) : Math.abs(Math.sin(u * Math.PI * 4)) * 0.25 + (u > 0.08 && u < 0.3 ? Math.sin((u - 0.08) / 0.22 * Math.PI) * 0.8 : 0), face: Math.atan2(dx, dz), u, w };
  }
  function trophyPos(st, t) {
    const r = refPath(st, t), w = r.w;
    if (t < 2.3) return { x: r.x + Math.sin(r.face) * 0.32, y: r.y + 0.55, z: r.z + Math.cos(r.face) * 0.32 };
    const up = seg(t, 2.4, 3.0);
    return { x: lerp(r.x + Math.sin(r.face) * 0.32, w.x, seg(t, 2.3, 2.6)), y: lerp(0.55, 1.35, up), z: lerp(r.z + Math.cos(r.face) * 0.32, w.z, seg(t, 2.3, 2.6)) };
  }

  /* ---------- the camera in a scene ---------- */
  // inside by the door looking in; a slow push in for the handshake; round to the right to look at the doors as they
  // open on the hall; after them out of the door; up over the floor as they run to their bases (then on to the play view)
  const OPEN_CAM = [
    { t: 0, eye: CAM0, at: [RC[0] - 0.1, 0.62, RC[1] + 0.1], fov: 52 },
    { t: 3.4, eye: [CAM0[0] - 0.15, 1.95, CAM0[2] - 0.15], at: [RC[0], 0.55, RC[1]], fov: 47 },
    { t: 4.7, eye: [CAM0[0] - 0.2, 1.9, CAM0[2] - 0.2], at: [RC[0] + 0.05, 0.55, RC[1] + 0.05], fov: 46 },
    { t: 5.5, eye: [XC + 1.75, 1.75, BW - 3.1], at: [XC + 0.6, 1.0, BW + 0.6], fov: 54 },
    { t: 6.5, eye: [XC + 0.6, 2.1, BW - 1.1], at: [XC + 0.4, 0.8, BW + 2.6], fov: 52 },
  ];
  // out in the hall: over the two of them as they run (their middle), then on to the play view
  function followCam(sc, st) {
    const p = opening(sc, st), mx = (p[0].x + p[1].x) / 2, mz = (p[0].z + p[1].z) / 2, sp = Math.hypot(p[0].x - p[1].x, p[0].z - p[1].z);
    const d = 7 + sp * 0.55;
    return { eye: [mx + 0.8, 0.6 + d * 0.75, mz + d * 0.85], at: [mx, 0.3, mz - 0.4], fov: 50 };
  }
  SN.camera = function (sc, st, rest) {
    if (st.phase === 'open') {
      const t = st.phaseT;
      const last = OPEN_CAM[OPEN_CAM.length - 1];
      if (t <= last.t) return keyCam(OPEN_CAM, t);
      const f = followCam(sc, st), k1 = seg(t, last.t, last.t + 1.3), k2 = seg(t, 9.0, S.OPEN_T - 0.3);
      const a = { eye: mix(last.eye, f.eye, k1), at: mix(last.at, f.at, k1), fov: lerp(last.fov, f.fov, k1) };
      return { eye: mix(a.eye, rest.eye, k2), at: mix(a.at, rest.at, k2), fov: lerp(a.fov, rest.fov, k2) };
    }
    if (st.ending) return endingCam(sc, st, rest);
    return null;
  };
  const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  // through a list of keys, each stretch eased, the middle keys passed through without a stop (Catmull-Rom on the eye)
  function keyCam(keys, t) {
    let i = 0; while (i < keys.length - 2 && t > keys[i + 1].t) i++;
    const a = keys[i], b = keys[i + 1], k = clamp((t - a.t) / (b.t - a.t), 0, 1);
    const p0 = keys[Math.max(0, i - 1)], p3 = keys[Math.min(keys.length - 1, i + 2)];
    const cr = (q0, q1, q2, q3, u) => { const u2 = u * u, u3 = u2 * u; return 0.5 * (2 * q1 + (-q0 + q2) * u + (2 * q0 - 5 * q1 + 4 * q2 - q3) * u2 + (-q0 + 3 * q1 - 3 * q2 + q3) * u3); };
    const u = i === 0 || i === keys.length - 2 ? ease(k) * 0.5 + k * 0.5 : k;
    const e = [0, 1, 2].map(j => cr(p0.eye[j], a.eye[j], b.eye[j], p3.eye[j], u)), at = [0, 1, 2].map(j => cr(p0.at[j], a.at[j], b.at[j], p3.at[j], u));
    return { eye: e, at, fov: lerp(a.fov, b.fov, ease(k)) };
  }

  /* ---------- the world's ending ---------- */
  SN.END_T = 12.5;
  function endingPoses(sc, st) {
    const t = st.ending.t, out = [];
    for (const id of [0, 1]) {
      const sx = id ? 0.55 : -0.55;
      let x = sx, y = 0, z = 0.4, face = 0, speed = 0, hands = null, s = 1;
      if (t < 3.2) { const f = seg(t, 0, 0.8); x = sx; face = 0; hands = t > 0.8 ? [null, new T.Vector3(x + (id ? 0.32 : -0.32), 1.0 + Math.sin(t * 9 + id) * 0.08, z + 0.1)] : null; void f; }
      else if (t < 8.0) {
        const u = clamp((t - 3.6) / 4.4, 0, 1); y = u * u * 34; face = (t - 3.2) * 0.6 * (id ? -1 : 1);
        hands = [new T.Vector3(x - 0.3, y + 0.95, z), new T.Vector3(x + 0.3, y + 0.95, z)];
      } else {
        // out of the coin slot: tiny, then full size with a hop, then a look round
        const d = SN.slot(), k = clamp((t - 8.3) / 0.8, 0, 1), fx = d[0] + (id ? 0.55 : -0.55) * ease(k), fz = d[2] + 0.9 * ease(k);
        x = fx; z = fz; y = k < 1 ? Math.sin(k * Math.PI) * 0.9 + (1 - k) * d[1] : 0; s = lerp(0.12, 1, ease(k));
        face = k < 1 ? 0 : turn(0, id ? -0.5 : 0.5, seg(t, 9.6, 10.2)) * (1 - seg(t, 10.8, 11.4));
        if (t < 8.3) { y = d[1]; s = 0.001; }
      }
      out.push({ x, y, z, face, speed, hands, blaster: t < 8 ? 1 : 0, vest: 1, vy: 0, scale: s });
    }
    return out;
  }
  SN.slot = () => { const e = SN._e; return e && e.dawn.slotPos ? e.dawn.slotPos : [DAWN.x, 0.92, DAWN.z - 1.6]; };
  function endingCam(sc, st, rest) {
    const t = st.ending.t;
    if (t < 3.2) { const k = seg(t, 0, 3.0); return { eye: mix(rest.eye, [0, 5.2, 10.5], k), at: mix(rest.at, [0, 3.4, -3], k), fov: lerp(rest.fov, 46, k) }; }
    if (t < 8.0) {
      const u = clamp((t - 3.6) / 4.4, 0, 1), y = u * u * 34, k = seg(t, 3.2, 4.4);
      return { eye: [lerp(0, 0.4, k), lerp(5.2, y + 2.6, k), lerp(10.5, 7.5, k)], at: [0, lerp(3.4, y + 1.3, k), lerp(-3, -1.5, k)], fov: lerp(46, 52, k) };
    }
    const d = SN.slot(), k = seg(t, 8.0, 12.2);
    return { eye: [d[0] + lerp(0.5, 1.1, k), lerp(1.35, 2.3, k), d[2] + lerp(3.6, 6.2, k)], at: [d[0], lerp(1.0, 1.55, k), d[2] - lerp(0, 0.9, k)], fov: lerp(48, 50, k) };
  }

  /* ---------- every frame ---------- */
  SN.update = function (sc, st, dt) {
    const g = sc.scn; if (!g) return;
    const hall = sc.hall, S2 = hall.stories, t = st.phaseT, open = st.phase === 'open';
    // the opening: the room referee and its blasters, the doors
    g.ref.visible = open; if (S2.ref) S2.ref.ref.visible = !open || st.phaseT > 6.6;
    for (const id of [0, 1]) g.proxy[id].visible = false;
    if (open) {
      HL.pose(g.ref, t > 3.2 && t < 4.9 ? 'cheer' : t > 5.2 ? 'wave' : 'idle', dt);
      const u = g.ref.userData;
      for (const id of [0, 1]) {
        const hand = id ? SN.OPEN.handBo : SN.OPEN.handPip, pr = g.proxy[id];
        if (t >= hand[1]) continue;
        pr.visible = true;
        const side = id ? 0.17 : -0.17, fa = g.ref.rotation.y, rx = REF[0] + Math.sin(fa) * 0.38 + Math.cos(fa) * side, rz = REF[1] + Math.cos(fa) * 0.38 - Math.sin(fa) * side;
        const hr = sc.heroes[id], tgt = hr.grips[0].getWorldPosition(v2);
        const k = seg(t, hand[0], hand[1]);
        pr.position.set(lerp(rx, tgt.x, k), lerp(0.42, tgt.y, k) + Math.sin(k * Math.PI) * 0.35, lerp(rz, tgt.z, k));
        pr.rotation.set(0, lerp(fa, hr.h.rotation.y, k), Math.sin(k * Math.PI) * 0.6);
        if (k <= 0) u.arms[id ? 1 : 0].rotation.x = -1.25;
      }
      if (S2.vestDoors) for (const dd of S2.vestDoors) { const k = seg(t, SN.OPEN.door[1], SN.OPEN.door[2]); dd.m.position.x = lerp(dd.closed, dd.open, k); }
      // the chimes as each vest comes on, the doors
      for (const [id, hand] of [[0, SN.OPEN.handPip], [1, SN.OPEN.handBo]]) if (g.lastT != null && g.lastT < hand[1] && t >= hand[1]) Sfx.play('arcadelaserVestOn');
      if (g.lastT != null && g.lastT < SN.OPEN.door[1] && t >= SN.OPEN.door[1]) Sfx.play('arcadelaserDoors');
    } else if (S2.vestDoors) for (const dd of S2.vestDoors) dd.m.position.x = dd.open;
    g.lastT = open ? t : null;
    // the final: the winner's half lit in their colour, the referee with the ticket trophy, the sad vest
    const fin = st.phase === 'final' || (st.phase === 'done' && st.winner >= 0) ? 1 : 0;
    g.finK = (g.finK || 0) + (fin - (g.finK || 0)) * Math.min(1, dt * 2);
    const w = st.winner >= 0 ? st.winner : 0;
    for (const id of [0, 1]) {
      const on = id === w ? g.finK : 0, sx = id ? 1 : -1;
      g.win[id].color.set(PCOL[id]); g.win[id].intensity = on * 70; g.win[id].position.set(sx * 9, 5.5, -6.5);
      g.win2[id].color.set(PCOL[id]); g.win2[id].intensity = on * 40; g.win2[id].position.set(sx * 10, 3, 4);
    }
    if (S2.ref && S2.ref.trophy) S2.ref.trophy.visible = !fin && !st.ending;
    g.trophy.visible = !!fin && !st.ending;
    if (st.phase === 'final' && S2.ref) {
      const r = refPath(st, t), rr = S2.ref;
      rr.ref.visible = false;
      g.ref.visible = true; g.ref.position.set(r.x, r.y, r.z); g.ref.rotation.y = r.face;
      HL.pose(g.ref, t < 2.1 ? 'walk' : t < 2.4 ? 'idle' : 'cheer', dt);
      if (t < 2.3) { g.ref.userData.arms[0].rotation.x = -1.3; g.ref.userData.arms[1].rotation.x = -1.3; }
      const tp = trophyPos(st, t); g.trophy.position.set(tp.x, tp.y - 0.35, tp.z); g.trophy.rotation.y = r.face + t * (t > 2.4 ? 0.8 : 0);
      g.trophy.userData.star.material.color.setScalar(1.6 + Math.sin(t * 6) * 0.4);
      if (g.finLast != null && g.finLast < 1.8 && t >= 1.8) Sfx.play('arcadelaserSadVest');
      if (g.finLast != null && g.finLast < 2.35 && t >= 2.35) Sfx.play('arcadelaserTrophy');
      g.finLast = t;
    } else g.finLast = st.phase === 'final' ? 0 : null;
    if (st.phase === 'done' && st.winner >= 0 && !st.ending) {
      // (the results card is up: the winner keeps the cup aloft)
      const wh = st.heroes[w]; g.trophy.position.set(wh.x, 1.0, wh.z); g.ref.visible = false;
    }
    // the world's ending
    updateEnding(sc, st, dt);
  };
  function updateEnding(sc, st, dt) {
    const e = sc.scn.ending; SN._e = e;
    const on = !!st.ending; e.root.visible = on;
    e.dawn.dust.visible = on && st.ending.t > 7.8;
    if (!on) { e.white.material.opacity = 0; if (sc.hall.ball && sc.hall.ball.userData.y0 != null) sc.hall.ball.position.y = sc.hall.ball.userData.y0; return; }
    const t = st.ending.t;
    // the mirror ball winches up into the trusses, out of the letters' way
    const hb = sc.hall.ball; if (hb) { if (hb.userData.y0 == null) hb.userData.y0 = hb.position.y; hb.position.y = hb.userData.y0 + ease(seg(t, 0, 1.4)) * 2.4; }
    // the letters print in turn, then shimmer
    const n = e.letters.length;
    e.letters.forEach((L, i) => { const k = clamp((t - 0.3 - i * 0.11) / 0.25, 0, 1); L.m.color.setScalar(k * (1.2 + 0.25 * Math.sin(t * 4 + i))); });
    const hk = clamp((t - 0.3) / (n * 0.11 + 0.25), 0, 1); e.head.position.x = lerp(-9, 9, hk); e.head.visible = hk < 1;
    // the beam, the ring, the hatch
    const bk = seg(t, 3.0, 3.6) * (1 - seg(t, 7.6, 8.0));
    e.beamM.uniforms.uK.value = bk; e.beamM.uniforms.uT.value = t; e.ring.material.opacity = bk * 0.9; e.ring.scale.setScalar(1 + Math.sin(t * 5) * 0.06);
    e.hatch.material.color.setScalar(0.4 + bk * 1.4);
    // (the roof only while they rise: the play camera itself sits above the hall's open truss ceiling)
    e.slab.visible = e.slab.userData.rim.visible = t > 3.2 && t < 8 && sc.K.camera.position.y > HL.CEIL + 0.4;
    // the gears turn, coins tumble
    for (const gr of e.gears) gr.m.rotation.z = t * gr.sp * 0.6;
    const m4 = new T.Matrix4(), q = new T.Quaternion(), eu = new T.Euler();
    for (const f of e.fall) { const y = SHAFT.y1 - ((SHAFT.y1 - f.y + t * f.v * 2) % (SHAFT.y1 - SHAFT.y0)); eu.set(t * 3 + f.s, f.s, t * 2); q.setFromEuler(eu); m4.compose(v1.set(f.x, y, f.z), q, v2.set(1, 1, 1)); e.coins.setMatrixAt(f.i, m4); }
    e.coins.instanceMatrix.needsUpdate = true;
    e.shaftLight.intensity = seg(t, 3.6, 4.6) * 40; e.shaftLight2.intensity = seg(t, 5.2, 6.2) * 30;
    // the soft white over the change of place (rises and falls over about a second: no flash)
    const wk = seg(t, 7.3, 7.95) * (1 - seg(t, 8.05, 8.9));
    e.white.material.opacity = wk; e.white.position.copy(sc.K.camera.position).add(v1.set(0, 0, -1).applyQuaternion(sc.K.camera.quaternion).multiplyScalar(0.5)); e.white.quaternion.copy(sc.K.camera.quaternion);
    // the arcade at dawn: lights up when they arrive; the screen shows the scores, then winks out
    const dk = seg(t, 7.9, 8.6), d = e.dawn;
    d.sun.intensity = dk * 125; d.fill.intensity = dk * 6; d.warm.intensity = dk * 8;
    const wink = clamp((t - 11.0) / 0.5, 0, 1);
    d.scr.scale.set(wink < 0.6 ? 1 : lerp(1, 0.02, (wink - 0.6) / 0.4), wink < 0.6 ? lerp(1, 0.02, wink / 0.6) : 0.02, 1);
    d.scr.visible = wink < 1; d.dot.visible = wink >= 1 && t < 11.9; d.dot.scale.setScalar(1 - clamp((t - 11.5) / 0.4, 0, 1));
    d.scrM.color.setScalar(1.5 + wink * 1.5);
    // the hall's lights stay as they are; the crowd cheers and waves the whole first part
    if (t < 3.4) sc.hall.crowd.react({ cheer: 0.2 });
  }

  /* ---------- the ending's clock (the level's outro calls this each drawn frame) ---------- */
  SN.endStep = function (st, dt) {
    if (!st.ending) return false;
    st.ending.t += dt;
    return st.ending.t >= SN.END_T;
  };
  return SN;
})();
