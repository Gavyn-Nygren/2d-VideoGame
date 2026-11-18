/* Pip & Bo - 41-3 Paper Dragon Flight: the paper dragon (model and animation). Drawing only: nothing here is read by
   the rules. Uses three.js through K3D.T, but only inside POPDRAGON_DRAGON.build / .pose, which run after the 3D kit
   has loaded (the file itself loads with the game and touches nothing at load time).

   A festival dragon folded from paper: a boxy folded head with a hinged jaw, printed round eyes, curled gold horns,
   paper-curl whiskers and a red-and-gold fringe; a concertina body of 12 pleated segments (printed green scales over a
   gold belly, a gold crest card on every fold) that follows the head like a ribbon; two pleated paper-fan wings on
   brass fasteners; four small folded legs tucked up; a fan tail. Two red silk ribbon saddles: the front seat just
   behind the head (Pip, who steers) and the back seat between the wings (Bo, who works the wings).

   const D = POPDRAGON_DRAGON.build(K)    a Group with .userData { heroes: [pip, bo], ... }; add it to the scene
   POPDRAGON_DRAGON.pose(D, s, dt)        every drawn frame. s = {
       pos: [x, y, z], fwd: [x, y, z]     the head's place and the way it flies (unit)
       bank                               radians, + rolls to the right (a right turn)
       climb                              -1..1 (wings beat faster climbing, fold half in diving)
       tuck                               0..1 (wings folded flat), shake (0..1, the "need both" head shake)
       fire                               0..1 of the confetti puff (jaw open), ready (cheeks puffed, 0..1)
       swish                              -1..1 the tail fan's sweep, crumple (0..1 the nose dent and wobble)
       ball                               0..1 scrunched into a ball (a Refold), flat (0..1 lying flat on the page)
       steer, fly                         -1..1 what each rider is pushing (they lean with it)
       time                               seconds (for the ripple and wing beat) }
   The body's trail is kept inside D (positions the head passed through), so the tail reaches a place a moment after
   the head did. POPDRAGON_DRAGON.reset(D) clears the trail (a restart at a bookmark).
*/
'use strict';

const POPDRAGON_DRAGON = (function () {
  const D = {};
  const SEG = 12, SEGL = 0.46, HEADL = 1.25, SC = 1.4; // SC: the whole dragon is built at SEGL scale and drawn 1.4x (riders stay their size)
  const GREEN = '#3f9a57', GREEN2 = '#2f7d47', GOLD = '#e8b84a', GOLD2 = '#c9922a', CREAM = '#f6ecd0', RED = '#c8343e', INK = '#2b2130';
  D.SEG = SEG; D.SEGL = SEGL * SC; D.SC = SC;

  // the printed paper of the body: green scales in ink line and watercolour, a gold belly band, fold shading
  function scalesTex(K3, P) {
    return K3.paint('pdScales', 512, 256, (c, w, h) => {
      P.paper(c, w, h, '#f2e6c4', 301);
      const r = P.rng(302);
      // u runs round the body: the belly (bottom) is at u = 0.75, the back at u = 0.25
      for (let x = 0; x < w; x++) {
        const u = x / w, back = Math.cos((u - 0.25) * Math.PI * 2); // 1 on the back, -1 on the belly
        if (back > -0.35) { c.fillStyle = P.rgba(back > 0.5 ? GREEN : GREEN2, 0.92); c.fillRect(x, 0, 1, h); }
      }
      for (let i = 0; i < 90; i++) P.wash(c, r() * w, r() * h, 18 + r() * 30, r() < 0.5 ? '#5cb86e' : '#2a6e3e', 0.18, r, { noEdge: r() < 0.5 });
      // scale arcs
      c.lineWidth = 2.2;
      for (let row = 0; row < 9; row++) for (let col = 0; col < 18; col++) {
        const x = col * w / 18 + (row % 2) * w / 36, y = row * h / 8, u = x / w, back = Math.cos((u - 0.25) * Math.PI * 2);
        if (back < -0.3) continue;
        c.strokeStyle = P.rgba(INK, 0.55); c.beginPath(); c.arc(x, y, w / 36, 0.1, Math.PI - 0.1); c.stroke();
        c.strokeStyle = P.rgba('#f2d06a', 0.65); c.lineWidth = 1.4; c.beginPath(); c.arc(x, y - 3, w / 44, 0.3, Math.PI - 0.3); c.stroke(); c.lineWidth = 2.2;
      }
      // the gold belly with printed plates
      for (let x = 0; x < w; x++) {
        const u = x / w, back = Math.cos((u - 0.25) * Math.PI * 2);
        if (back < -0.35) { c.fillStyle = P.rgba(back < -0.8 ? '#f2d27a' : GOLD, 0.95); c.fillRect(x, 0, 1, h); }
      }
      c.strokeStyle = P.rgba('#8a5a14', 0.6); c.lineWidth = 2;
      for (let y = 10; y < h; y += 28) { c.beginPath(); c.moveTo(w * 0.62, y); c.quadraticCurveTo(w * 0.75, y + 10, w * 0.88, y); c.stroke(); }
      // the line between back and belly, inked
      c.strokeStyle = P.rgba(INK, 0.7); c.lineWidth = 3;
      for (const u of [0.25 + 0.31, 0.25 - 0.31 + 1]) { c.beginPath(); c.moveTo(u * w, 0); c.lineTo(u * w, h); c.stroke(); }
    });
  }
  // a pleated drum: one concertina fold, flat-faceted so the folds read as paper
  function segGeo(T, r0, r1, len) {
    const sides = 8, rings = [[0, r0 * 0.84], [len * 0.5, (r0 + r1) / 2], [len, r1 * 0.84]];
    const pos = [], uv = [];
    const ringPt = (a, rr) => { const c = Math.cos(a), s = Math.sin(a), q = 0.7; return [Math.sign(c) * Math.pow(Math.abs(c), q) * rr, Math.sign(s) * Math.pow(Math.abs(s), q) * rr * 0.92]; };
    for (let k = 0; k < 2; k++) {
      const [z0, ra] = rings[k], [z1, rb] = rings[k + 1];
      for (let i = 0; i < sides; i++) {
        const a0 = (i / sides) * Math.PI * 2 + Math.PI / sides, a1 = ((i + 1) / sides) * Math.PI * 2 + Math.PI / sides;
        const p00 = ringPt(a0, ra), p01 = ringPt(a1, ra), p10 = ringPt(a0, rb), p11 = ringPt(a1, rb);
        const u0 = i / sides, u1 = (i + 1) / sides, v0 = k * 0.5, v1 = v0 + 0.5;
        // (x = cos, y = sin: u = 0.25 is the top)
        pos.push(p00[0], p00[1], -z0, p10[0], p10[1], -z1, p11[0], p11[1], -z1, p00[0], p00[1], -z0, p11[0], p11[1], -z1, p01[0], p01[1], -z0);
        uv.push(u0, v0, u0, v1, u1, v1, u0, v0, u1, v1, u1, v0);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }

  D.build = function (K) {
    const T = K3D.T, P = POPUP, K3 = K3D;
    const root = new T.Group(); root.name = 'paperDragon';
    const scales = scalesTex(K3, P);
    const bodyM = K3.mat('pdBodyM', () => K3.toon('#ffffff', { map: scales, side: T.DoubleSide }));
    const goldM = K3.mat('pdGold', () => K3.toon(GOLD)), gold2M = K3.mat('pdGold2', () => K3.toon(GOLD2));
    const greenM = K3.mat('pdGreen', () => K3.toon(GREEN)), creamM = K3.mat('pdCream', () => K3.toon(CREAM)), redM = K3.mat('pdRed', () => K3.toon(RED));
    const edgeM = K3.mat('edge|' + P.EDGE, () => K3.toon(P.EDGE));
    const card = (shape, mat, depth = 0.03, ink = INK, inkW = 0.8) => P.card(shape, { mat, depth, ink, inkW });

    /* ----- the body: 12 pleated segments, each with a gold crest card and white cut edge on its fold ----- */
    const segs = [];
    for (let i = 0; i < SEG; i++) {
      const k = i / (SEG - 1), r0 = 0.44 - k * 0.24, r1 = 0.44 - Math.min(1, (i + 1) / (SEG - 1)) * 0.24;
      const g = new T.Group();
      const m = K3.mesh(K3.geo('pdSeg' + i, () => segGeo(T, r0, Math.max(0.17, r1), SEGL)), bodyM, { ink: '#1f4a2c', inkW: 1.1 });
      g.add(m);
      // the white cut edge on the fold ridge (a thin paper band)
      const rr = (r0 + Math.max(0.17, r1)) / 2;
      const rim = K3.mesh(K3.geo('pdRim' + i, () => new T.TorusGeometry(rr * 0.96, 0.022, 4, 16).scale(1, 0.92, 1)), edgeM, { ink: false, cast: false });
      rim.position.z = -SEGL * 0.5; g.add(rim);
      // the crest: a gold flame-shaped card standing on the back
      const ch = 0.34 - k * 0.18;
      const crest = card(P.shapeFrom([[-0.16, 0], [0.16, 0], [0.05, ch * 0.55], [0.0, ch], [-0.07, ch * 0.5]]), i % 2 ? goldM : redM, 0.025, '#5a3d14', 0.7);
      crest.rotation.y = Math.PI / 2; crest.position.set(0, rr * 0.9, -SEGL * 0.5); crest.rotation.x = -0.35; g.add(crest);
      root.add(g); segs.push({ g, r: rr });
    }
    /* ----- the head ----- */
    const head = new T.Group(); root.add(head);
    const skull = new T.Group(); head.add(skull);
    const headTex = K3.paint('pdHead', 256, 256, (c, w, h) => {
      P.paper(c, w, h, GREEN, 311); const r = P.rng(312);
      for (let i = 0; i < 30; i++) P.wash(c, r() * w, r() * h, 20 + r() * 26, r() < 0.5 ? '#62bd72' : '#2a6e3e', 0.22, r, { noEdge: true });
      c.strokeStyle = P.rgba('#f2d06a', 0.8); c.lineWidth = 4;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(20, 40 + i * 50); c.bezierCurveTo(80, 20 + i * 50, 170, 60 + i * 50, 236, 36 + i * 50); c.stroke(); }
      c.strokeStyle = P.rgba(INK, 0.45); c.lineWidth = 2; c.strokeRect(6, 6, w - 12, h - 12);
    });
    const headM = K3.mat('pdHeadM', () => K3.toon('#ffffff', { map: headTex }));
    // the folded box head: a brow block and a long snout, flat-faceted
    const brow = K3.mesh(K3.geo('pdBrow', () => K3.roundBox(0.98, 0.72, 0.82, 0.28, 20).translate(0, -0.3, 0)), headM, { ink: '#1f4a2c', inkW: 1.2 });
    brow.position.set(0, 0, 0.25); skull.add(brow);
    const snout = K3.mesh(K3.geo('pdSnout', () => K3.roundBox(0.84, 0.42, 0.95, 0.3, 20).translate(0, -0.12, 0)), headM, { ink: '#1f4a2c', inkW: 1.2 });
    snout.position.set(0, -0.02, 0.88); skull.add(snout);
    // a gold nose card with printed nostrils
    const noseTex = K3.paint('pdNose', 128, 64, (c, w, h) => { c.fillStyle = GOLD; c.fillRect(0, 0, w, h); c.fillStyle = INK; for (const x of [40, 88]) { c.beginPath(); c.ellipse(x, 30, 9, 13, 0, 0, Math.PI * 2); c.fill(); } c.strokeStyle = '#8a5a14'; c.lineWidth = 3; c.strokeRect(3, 3, w - 6, h - 6); });
    const nose = K3.mesh(new T.BoxGeometry(0.62, 0.3, 0.04), [edgeM, edgeM, goldM, goldM, K3.toon('#ffffff', { map: noseTex }), goldM], { ink: '#5a3d14', inkW: 0.8 });
    nose.position.set(0, 0.04, 1.37); nose.rotation.x = -0.25; skull.add(nose);
    // round printed eyes on folded card mounts, with a gold ring, a big pupil and a glint
    const eyeTex = K3.paint('pdEye', 128, 128, (c, w, h) => {
      c.fillStyle = GOLD; c.beginPath(); c.arc(64, 64, 63, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(64, 64, 52, 0, Math.PI * 2); c.fill();
      c.fillStyle = INK; c.beginPath(); c.arc(68, 68, 30, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(56, 54, 11, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(80, 80, 5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.arc(64, 64, 61, 0, Math.PI * 2); c.stroke();
    });
    const eyeM = K3.mat('pdEyeM', () => K3.toon('#ffffff', { map: eyeTex }));
    const eyes = [];
    for (const sx of [-1, 1]) {
      const e = K3.mesh(K3.geo('pdEyeG', () => new T.SphereGeometry(0.23, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2)), eyeM, { ink: INK, inkW: 1 });
      e.position.set(sx * 0.4, 0.06, 0.52); e.rotation.y = sx * 0.75; e.scale.set(1, 1, 0.55); skull.add(e); eyes.push(e);
      // a paper brow card over each eye (it tilts with the mood)
      const b = card(P.shapeFrom([[-0.24, 0], [0.24, 0.04], [0.2, 0.12], [-0.22, 0.09]]), goldM, 0.025, '#5a3d14', 0.8);
      b.position.set(sx * 0.36, 0.27, 0.6); b.rotation.set(0, sx * 0.55, -sx * 0.18); skull.add(b);
    }
    // curled gold horns: card ribbons swept back
    for (const sx of [-1, 1]) {
      const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new T.Vector3(sx * (0.22 + t * 0.25), 0.18 + t * 0.55 + Math.sin(t * 3.4) * 0.05, 0.1 - t * 0.7 - Math.sin(t * Math.PI) * 0.1)); }
      const horn = K3.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 20, 0.065, 6).scale(1, 1, 1), goldM, { ink: '#5a3d14', inkW: 0.9 });
      skull.add(horn);
      const tip = K3.mesh(new T.ConeGeometry(0.07, 0.2, 6), goldM, { ink: '#5a3d14', inkW: 0.8 }); tip.position.copy(pts[14]); tip.rotation.x = -1.2; skull.add(tip);
    }
    // the fringe: a ruff of red and gold paper strips behind the head
    const fringe = new T.Group(); fringe.position.set(0, -0.1, -0.12); head.add(fringe);
    for (let i = 0; i < 15; i++) {
      const a = -Math.PI * 0.95 + (i / 14) * Math.PI * 1.9, len = 0.42 + (i % 2) * 0.16;
      const st = card(P.shapeFrom([[-0.06, 0], [0.06, 0], [0.03, len], [0, len + 0.06], [-0.03, len]]), i % 2 ? redM : goldM, 0.02, i % 2 ? '#5a1418' : '#5a3d14', 0.7);
      st.rotation.set(-0.5, 0, a + Math.PI / 2); st.position.set(Math.cos(a) * 0.35, Math.sin(a) * 0.32, 0); fringe.add(st);
    }
    // whiskers: paper curls from the snout, two each side, that stream back
    const whiskers = [];
    for (const sx of [-1, 1]) for (const k of [0, 1]) {
      const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new T.Vector3(sx * (0.1 + t * 0.9), -0.05 - t * 0.25 + Math.sin(t * 9 + k) * 0.06 * t, -t * 0.5 + Math.cos(t * 9 + k) * 0.06 * t)); }
      const wsk = K3.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.028, 5), k ? goldM : creamM, { ink: '#5a3d14', inkW: 0.6 });
      const piv = new T.Group(); piv.position.set(sx * 0.36, -0.06 - k * 0.08, 1.2); piv.add(wsk); skull.add(piv); whiskers.push({ piv, sx, k });
    }
    // the lower jaw, hinged under the brow: a gold-lined card box with a zigzag row of white paper teeth
    const jawPiv = new T.Group(); jawPiv.position.set(0, -0.3, 0.36); head.add(jawPiv);
    const jaw = K3.mesh(K3.geo('pdJaw', () => K3.roundBox(0.74, 0.2, 1.0, 0.3, 16).translate(0, -0.2, 0.5)), headM, { ink: '#1f4a2c', inkW: 1.1 });
    jawPiv.add(jaw);
    const mouthIn = new T.Mesh(new T.PlaneGeometry(0.62, 0.9).rotateX(-Math.PI / 2).translate(0, 0.005, 0.5), K3.toon('#8a2430'));
    jawPiv.add(mouthIn);
    const teethShape = new T.Shape(); teethShape.moveTo(-0.3, 0); for (let i = 0; i <= 8; i++) teethShape.lineTo(-0.3 + i * 0.075, i % 2 ? 0 : 0.09); teethShape.lineTo(0.3, 0); teethShape.closePath();
    for (const [z, y] of [[0.95, 0.0]]) { const t = card(teethShape, edgeM, 0.02, '#8a7550', 0.6); t.position.set(0, y, z); jawPiv.add(t); }
    { const t = card(teethShape, edgeM, 0.02, '#8a7550', 0.6); t.rotation.z = Math.PI; t.position.set(0, -0.34, 1.3); skull.add(t); }
    // the cheeks: gold paper puffs that fill when the fire is ready
    const cheeks = [];
    for (const sx of [-1, 1]) { const ck = K3.mesh(K3.geo('pdCheek', () => new T.SphereGeometry(0.17, 16, 10)), goldM, { ink: '#5a3d14', inkW: 0.8 }); ck.position.set(sx * 0.42, -0.26, 0.8); skull.add(ck); cheeks.push(ck); }
    // the Bookworm, riding in the dragon's mouth like a pilot: a green worm with round glasses and a little paper cap
    const worm = new T.Group(); worm.position.set(0, 0.02, 0.62); jawPiv.add(worm);
    const wormM = K3.mat('pdWormM', () => K3.toon('#9ccf5a'));
    [[0, 0, 0, 0.12], [0, 0.08, 0.12, 0.13], [0, 0.2, 0.2, 0.14]].forEach(([x, y, z, r]) => { const b = K3.mesh(K3.geo('pdWormB' + r, () => new T.SphereGeometry(r, 16, 12)), wormM, { ink: '#3a5a18', inkW: 0.8 }); b.position.set(x, y, z); worm.add(b); });
    for (const sx of [-1, 1]) { const gl = K3.mesh(K3.geo('pdWormGl', () => new T.TorusGeometry(0.05, 0.012, 6, 14)), K3.mat('pdBlack', () => K3.toon('#2b2130')), { ink: false }); gl.position.set(sx * 0.055, 0.24, 0.33); worm.add(gl); const ey = new T.Mesh(K3.geo('pdWormEy', () => new T.SphereGeometry(0.02, 8, 6)), K3.mat('pdBlack', () => K3.toon('#2b2130'))); ey.position.set(sx * 0.055, 0.24, 0.335); worm.add(ey); }
    const cap = K3.mesh(new T.SphereGeometry(0.13, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), K3.mat('pdWormCap', () => K3.toon('#d8483a')), { ink: '#5a1418', inkW: 0.7 }); cap.position.set(0, 0.3, 0.2); worm.add(cap);
    /* ----- wings: pleated paper fans on brass fasteners ----- */
    const wingTex = K3.paint('pdWing', 256, 128, (c, w, h) => {
      P.paper(c, w, h, '#f6efd8', 321); const r = P.rng(322);
      const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, P.rgba(GOLD, 0.9)); g.addColorStop(0.55, P.rgba('#7cc48a', 0.75)); g.addColorStop(1, P.rgba(GREEN, 0.9));
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 12; i++) P.wash(c, r() * w, r() * h, 14 + r() * 20, r() < 0.5 ? '#3f9a57' : '#f2d06a', 0.2, r, { noEdge: true });
      c.strokeStyle = P.rgba(INK, 0.5); c.lineWidth = 2; for (let x = w * 0.3; x < w; x += w * 0.18) { c.beginPath(); c.arc(0, h / 2, x, -0.7, 0.7); c.stroke(); }
      c.fillStyle = P.rgba(RED, 0.8); for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(w * (0.55 + k * 0.15), h / 2, 6 - k, 0, Math.PI * 2); c.fill(); }
    });
    const wingM = K3.mat('pdWingM', () => K3.toon('#ffffff', { map: wingTex, side: T.DoubleSide }));
    const PLEATS = 9, WR = 1.75;
    const wings = [];
    for (const sx of [-1, 1]) {
      const root2 = new T.Group(); root.add(root2);        // placed on segment 3 each frame
      const flap = new T.Group(); root2.add(flap);         // the beat (about the body's long axis)
      const fan = new T.Group(); flap.add(fan); fan.position.x = sx * 0.12;
      const pleats = [];
      for (let i = 0; i < PLEATS; i++) {
        const half = Math.PI / PLEATS * 0.5;
        const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(Math.cos(-half) * WR, Math.sin(-half) * WR); sh.quadraticCurveTo(WR * 1.06, 0, Math.cos(half) * WR, Math.sin(half) * WR); sh.closePath();
        const pl = card(sh, wingM, 0.012, '#2f5a30', 0.6);
        const pv = new T.Group(); pv.add(pl); fan.add(pv);
        pl.rotation.x = (i % 2 ? 1 : -1) * 0.32; // the zigzag of the pleats
        pleats.push(pv);
      }
      const fas = P.fastener(0.1); fas.rotation.y = sx * Math.PI / 2; fas.position.x = sx * 0.13; flap.add(fas);
      wings.push({ root: root2, flap, fan, pleats, sx });
    }
    /* ----- legs: four small folded zigzag legs tucked up ----- */
    const legs = [];
    for (const [segI, sx] of [[2, -1], [2, 1], [8, -1], [8, 1]]) {
      const lg = new T.Group(); root.add(lg);
      const pts = [[0, 0], [0.12, -0.18], [0.0, -0.3], [0.16, -0.44]];
      for (let i = 0; i < 3; i++) {
        const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const bar = card(P.shapeFrom([[-0.045, 0], [0.045, 0], [0.045, len], [-0.045, len]]), i % 2 ? goldM : greenM, 0.04, '#1f4a2c', 0.7);
        bar.position.set(0, a[1], a[0]); bar.rotation.set(Math.atan2(b[0] - a[0], -(b[1] - a[1])) + Math.PI, Math.PI / 2, 0); lg.add(bar);
      }
      // a little three-toed paper foot
      const ft = card(P.shapeFrom([[-0.09, 0], [0.09, 0], [0.12, 0.1], [0.04, 0.06], [0, 0.12], [-0.04, 0.06], [-0.12, 0.1]]), goldM, 0.03, '#5a3d14', 0.7);
      ft.rotation.x = -Math.PI / 2 + 0.6; ft.position.set(0, -0.44, 0.16); lg.add(ft);
      legs.push({ g: lg, seg: segI, sx });
    }
    /* ----- the tail fan ----- */
    const tail = new T.Group(); root.add(tail);
    const tailFan = new T.Group(); tail.add(tailFan);
    for (let i = 0; i < 7; i++) {
      const a = (i - 3) * 0.24, sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(Math.sin(a - 0.12) * 0.95, -Math.cos(a - 0.12) * 0.95); sh.lineTo(Math.sin(a + 0.12) * 0.95, -Math.cos(a + 0.12) * 0.95); sh.closePath();
      const pl = card(sh, i % 2 ? redM : goldM, 0.015, '#5a3d14', 0.6);
      pl.rotation.set(Math.PI / 2, (i % 2 ? 1 : -1) * 0.25, 0); tailFan.add(pl);
    }
    { const fas = P.fastener(0.07); tailFan.add(fas); }
    /* ----- the two ribbon saddles, the reins, the riders ----- */
    const silk = K3.paint('pdSilk', 64, 128, (c, w, h) => { c.fillStyle = RED; c.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 2) { c.fillStyle = i % 4 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'; c.fillRect(i, 0, 1, h); } c.fillStyle = GOLD; c.fillRect(0, 0, w, 5); c.fillRect(0, h - 5, w, 5); }, { repeat: true });
    const silkM = K3.mat('pdSilkM', () => K3.toon('#ffffff', { map: silk, side: T.DoubleSide }));
    const saddles = [];
    for (const segI of [1, 5]) {
      const sg = new T.Group(); root.add(sg);
      const r = segs[segI].r;
      const pad = K3.mesh(new T.CylinderGeometry(r * 1.08, r * 1.08, 0.36, 24, 1, true, -Math.PI * 0.42, Math.PI * 0.84).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), silkM, { ink: '#5a1418', inkW: 0.8 });
      sg.add(pad);
      // a gold tassel each side
      for (const sx of [-1, 1]) {
        const ts = K3.mesh(K3.geo('pdTassel', () => new T.ConeGeometry(0.06, 0.2, 8)), goldM, { ink: '#5a3d14', inkW: 0.6 }); ts.position.set(sx * r * 1.1, -r * 0.55, 0); sg.add(ts);
        const knob = K3.mesh(K3.geo('pdKnob', () => new T.SphereGeometry(0.045, 10, 8)), goldM, { ink: '#5a3d14', inkW: 0.6 }); knob.position.set(sx * r * 1.1, -r * 0.42, 0); sg.add(knob);
      }
      saddles.push({ g: sg, seg: segI, r });
    }
    // the riders: Pip in front (steers), Bo behind (wings)
    const heroes = [K3.hero(0), K3.hero(1)];
    for (const h of heroes) { root.add(h); }
    // reins: red silk ribbons from the head to Pip's hands, and from Pip's saddle to Bo's
    const reinM = K3.mat('pdReinM', () => K3.toon(RED, { side: T.DoubleSide }));
    const reins = [0, 1].map(() => { const m = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 1, 6, 1, true).translate(0, 0.5, 0), reinM); root.add(m); return m; });
    root.userData = { segs, head, skull, jawPiv, cheeks, eyes, whiskers, fringe, wings, legs, tail, tailFan, saddles, heroes, reins, worm, trail: [], t: 0 };
    return root;
  };

  D.reset = function (Dg) { Dg.userData.trail.length = 0; };

  /* ---------- posing, every drawn frame ---------- */
  D.pose = function (Dg, s, dt) {
    const T = K3D.T, u = Dg.userData;
    const fwd = new T.Vector3(...s.fwd).normalize(), pos = new T.Vector3(...s.pos);
    // the trail of head positions, newest first, one point per 0.05 units travelled
    const tr = u.trail;
    if (!tr.length || tr[0].distanceTo(pos) > 0.05 || s.flat) {
      if (s.flat || !tr.length) { tr.length = 0; for (let i = 0; i < 260; i++) tr.push(pos.clone().addScaledVector(fwd, -i * 0.05)); }
      else tr.unshift(pos.clone());
      if (tr.length > 260) tr.length = 260;
    } else tr[0].copy(pos);
    // a point d units back along the trail
    const back = d => {
      let acc = 0;
      for (let i = 1; i < tr.length; i++) {
        const l = tr[i - 1].distanceTo(tr[i]);
        if (acc + l >= d) return tr[i - 1].clone().lerp(tr[i], (d - acc) / (l || 1));
        acc += l;
      }
      const last = tr[tr.length - 1], prev = tr[Math.max(0, tr.length - 2)], dir = last.clone().sub(prev); if (dir.lengthSq() < 1e-9) dir.copy(fwd).negate();
      return last.clone().addScaledVector(dir.normalize(), d - acc);
    };
    const t = s.time || 0, up = new T.Vector3(0, 1, 0), ball = s.ball || 0;
    const ripple = (d) => Math.sin(t * 5.2 - d * 1.5) * 0.11 * (1 - ball) * (1 - (s.flat || 0));
    // the bank rolls everything about the flying direction
    const bankQ = new T.Quaternion().setFromAxisAngle(fwd, -(s.bank || 0));
    const sideOf = (dir) => new T.Vector3().crossVectors(dir, up).normalize();
    // the head
    const hq = new T.Quaternion();
    const look = new T.Matrix4().lookAt(new T.Vector3(0, 0, 0), fwd.clone().negate(), up);
    hq.setFromRotationMatrix(look).premultiply(bankQ);
    const shake = s.shake ? Math.sin(t * 40) * 0.25 * s.shake : 0;
    u.head.position.copy(pos).add(new T.Vector3(0, ripple(0), 0));
    u.head.quaternion.copy(hq).multiply(new T.Quaternion().setFromEuler(new T.Euler(-(s.climb || 0) * 0.25, shake, 0)));
    u.head.scale.setScalar(SC * (1 - ball * 0.7));
    // the crumple: the nose dents in and the head wobbles
    const cr = s.crumple || 0;
    u.skull.scale.set(1 + cr * 0.12, 1 - cr * 0.1, 1 - cr * 0.18);
    u.skull.rotation.z = Math.sin(t * 30) * cr * 0.25;
    // the jaw opens for the fire, a little for a roar of effort
    u.jawPiv.rotation.x = 0.06 + (s.fire || 0) * 0.65 + Math.max(0, s.climb || 0) * 0.08;
    for (const ck of u.cheeks) ck.scale.setScalar(0.7 + (s.ready || 0) * 0.5);
    u.fringe.rotation.z = Math.sin(t * 7) * 0.05;
    u.fringe.scale.set(1, 1, 1 + 0.15 * Math.abs(s.climb || 0));
    for (const w of u.whiskers) { w.piv.rotation.set(Math.sin(t * 6 + w.k * 2 + w.sx) * 0.18, Math.sin(t * 4 + w.k) * 0.2 * w.sx, 0); }
    u.worm.rotation.y = Math.sin(t * 1.3) * 0.3; u.worm.visible = ball < 0.5;
    // the body: each segment sits on the trail behind the head and points along it
    const segPos = [];
    let d = HEADL * 0.3 * SC;
    for (let i = 0; i < SEG; i++) {
      const a = back(d * (1 - ball) + ball * (0.05 + i * 0.02)), b = back((d + SEGL * SC) * (1 - ball) + ball * (0.06 + i * 0.02));
      a.y += ripple(d); b.y += ripple(d + SEGL * SC);
      if (ball) { const ang = i / SEG * Math.PI * 2; a.add(new T.Vector3(Math.cos(ang) * 0.4, Math.sin(ang) * 0.4, 0).multiplyScalar(ball)); }
      const dir = a.clone().sub(b); if (dir.lengthSq() < 1e-8) dir.copy(fwd); dir.normalize();
      const sg = u.segs[i].g;
      sg.position.copy(a);
      const m = new T.Matrix4().lookAt(new T.Vector3(0, 0, 0), dir.clone().negate(), up);
      sg.quaternion.setFromRotationMatrix(m).premultiply(new T.Quaternion().setFromAxisAngle(dir, -(s.bank || 0) * (1 - i / SEG * 0.6)));
      // a concertina breathes: the folds open a little in a climb and squeeze in a dive
      sg.scale.set(SC * (1 - ball * 0.5), SC * (1 - ball * 0.5), SC * (1 + (s.climb || 0) * 0.05));
      segPos.push({ a, dir, q: sg.quaternion.clone() });
      d += SEGL * SC * (1 + (s.climb || 0) * 0.04);
    }
    // the tail fan at the end, swishing
    const last = segPos[SEG - 1];
    u.tail.position.copy(last.a).addScaledVector(last.dir, -SEGL * SC); u.tail.scale.setScalar(SC);
    u.tail.quaternion.copy(last.q);
    u.tailFan.rotation.set(0, (s.swish || 0) * 1.2 + Math.sin(t * 3) * 0.15, (s.swish || 0) * 0.5);
    u.tailFan.scale.setScalar(1 + Math.abs(s.swish || 0) * 0.35);
    // the wings on segment 3: the beat (faster climbing), the fan opens (closes for a tuck, half for a dive)
    const wseg = segPos[3], wc = s.climb || 0;
    const beatF = 2.2 + Math.max(0, wc) * 2.4, beatA = (0.38 + Math.max(0, wc) * 0.2) * (1 - (s.tuck || 0)) * (1 - ball);
    u.beat = (u.beat || 0) + dt * beatF * Math.PI * 2;
    const open = (1 - (s.tuck || 0) * 0.92) * (1 - Math.max(0, -wc) * 0.45) * (1 - ball);
    for (const w of u.wings) {
      w.root.position.copy(wseg.a).add(new T.Vector3(0, u.segs[3].r * 0.55 * SC, 0).applyQuaternion(wseg.q)); w.root.scale.setScalar(SC);
      w.root.quaternion.copy(wseg.q);
      // flap about the body's long axis (z): + lifts the right wing
      w.flap.rotation.set(0, 0, w.sx * (Math.sin(u.beat) * beatA + 0.22 - (s.tuck || 0) * 0.3));
      const spread = 1.6 * open + 0.16, sweep = 0.3 + 0.75 * (1 - open);
      w.pleats.forEach((pv, i) => {
        const a = (i / (w.pleats.length - 1) - 0.5) * spread + sweep;
        pv.rotation.set(0, 0, w.sx > 0 ? a : Math.PI - a);
      });
      w.fan.rotation.set(-Math.PI / 2, 0, 0);
      w.fan.scale.setScalar(1 - ball * 0.8);
    }
    // legs tucked up under their segments
    for (const lg of u.legs) {
      const sp = segPos[lg.seg];
      lg.g.position.copy(sp.a).add(new T.Vector3(lg.sx * u.segs[lg.seg].r * 0.7 * SC, -u.segs[lg.seg].r * 0.5 * SC, 0).applyQuaternion(sp.q)); lg.g.scale.setScalar(SC);
      lg.g.quaternion.copy(sp.q).multiply(new T.Quaternion().setFromEuler(new T.Euler(0.9 + Math.sin(t * 4 + lg.seg) * 0.12 - (s.flat || 0) * 0.9, 0, lg.sx * 0.3)));
      lg.g.visible = ball < 0.6;
    }
    // saddles and riders
    const hp = [];
    u.saddles.forEach((sd, k) => {
      const sp = segPos[sd.seg];
      sd.g.position.copy(sp.a).addScaledVector(sp.dir, -SEGL * 0.5 * SC); sd.g.quaternion.copy(sp.q); sd.g.scale.setScalar(SC);
      sd.g.visible = ball < 0.6;
      const h = u.heroes[k];
      const seatUp = new T.Vector3(0, sd.r * 0.95 * SC, 0).applyQuaternion(sp.q);
      const at = sd.g.position.clone().add(seatUp);
      // the rider leans with what they push (Pip with the steering, Bo with the wings) and is thrown back in climbs
      const lean = k === 0 ? (s.steer || 0) : (s.fly || 0);
      const heading = Math.atan2(sp.dir.x, sp.dir.z);
      h.visible = ball < 0.5;
      K3D.heroPose(h, { x: at.x, y: at.y - 0.1, z: at.z, heading, speed: 0, vy: (s.climb || 0) * -1.5, mood: 'sit', hands: null }, dt);
      // ride: the body rolls with the bank, leans into the push, rocks back in a climb
      const bp = h.userData.bodyPivot;
      bp.rotation.z += -(s.bank || 0) * 0.9 - (k === 0 ? lean * 0.22 : 0);
      bp.rotation.x += -(s.climb || 0) * 0.3 + (k === 1 ? -lean * 0.12 : 0) + 0.05;
      // arms forward on the reins
      for (const arm of h.userData.arms) arm.sh.rotation.set(-1.05 + (k === 1 ? lean * 0.35 : 0), 0, arm.sx * 0.25 + (k === 0 ? lean * 0.3 * arm.sx : 0));
      hp.push({ at, q: sp.q, h });
    });
    // reins: Pip's from his hands to the dragon's horns, Bo's from his hands to Pip's saddle tassel
    const rein = (m, a, b) => { const dv = b.clone().sub(a), l = dv.length(); m.position.copy(a); m.scale.set(1, l, 1); m.quaternion.setFromUnitVectors(up, dv.normalize()); m.visible = ball < 0.5; };
    const handOf = (k) => { const h = hp[k].h; const p = new T.Vector3(); h.userData.arms[0].arm.getWorldPosition(p); const q = new T.Vector3(); h.userData.arms[1].arm.getWorldPosition(q); return p.add(q).multiplyScalar(0.5).add(new T.Vector3(0, -0.06, 0)); };
    Dg.updateMatrixWorld(true);
    const hornAt = new T.Vector3(0, 0.25, 0.2).applyMatrix4(u.head.matrixWorld);
    rein(u.reins[0], handOf(0), hornAt);
    const seat0 = u.saddles[0].g.position.clone().add(new T.Vector3(0, u.saddles[0].r * 0.6 * SC, -0.1).applyQuaternion(segPos[1].q));
    rein(u.reins[1], handOf(1), seat0);
    u.segPos = segPos;
  };
  return D;
})();
