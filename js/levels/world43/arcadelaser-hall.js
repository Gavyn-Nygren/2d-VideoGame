/* Pip & Bo - 43-4 Laser Tag Arena: the hall round the arena (ARCADELASER_HALL). Loaded on demand with the 3D kit.
   Everything here is scenery: it never feeds the rules.

   ZAP MAZE is a dark hall hung with haze, built close round the floor so the camera can sit near the play. The floor
   sits in the middle inside a padded barrier with neon on top and a hazard-striped walkway round it. Round that:
     the back, middle (GZ): the GALLERY behind glass: four tiered rows of pixel creatures (orange and blue scarves, foam
       fingers, home-made signs) under the ZAP MAZE neon, with the bulb SCOREBOARD set low in its front wall.
     the back walls either side (BACK_Z): the glow-paint murals; on the left the VESTING ROOM door (racks of vests
       charging and blinking, lockers, a bench, the rules board), on the right the PARTY ROOM window (a birthday: cake,
       balloons, paper hats) and the SNACK BAR.
     the side walls (SIDE_X): murals, the emergency exit and extinguishers on the left, the PRIZE COUNTER on the right.
     the walkways: the REFEREE's high chair on the right, the mopping creature on the left.
     the near side (under the camera): a rail with spectators' heads and foam fingers.
     the ceiling: trusses with moving lamps that sweep beams through the haze, the MIRROR BALL throwing slow dots of light
       over everything, smoke machines in the corners that puff on the beat.
   ARCADELASER_HALL.build(K, st) -> hall; hall.update(K, st, dt, mood) moves it: mood = { dark (0..1, Blackout), gold,
   cheer (secs since a tag), bank, round, beat (0..1 in the bar), hero: [x, y, z] (the action) }.
   Little stories (at least ten): the mopping creature on the left walkway who keeps getting caught in the crossfire;
   the creature sneaking along the far walkway with a tray of drinks between rounds; the birthday in the party room that
   reaches its cake by round three; the referee who falls asleep in Blackout; two rival fans who end up sharing popcorn;
   a school trip in matching caps pointing at the heroes; a creature with a camera on a stick; a toddler creature asleep
   on a parent's shoulder; a snack-bar cook flipping something; a creature trying to win a giant plush at the prize
   counter; a creature stuck in the vesting room fighting a vest on backwards; a lost balloon drifting up to the trusses. */
'use strict';

const ARCADELASER_HALL = (function () {
  const T = K3D.T, AR = ARCADELASER_ARENA, PT = ARCADELASER_PAINT;
  const H = {};
  const INK = ARCADE.INK, R = () => ARCADE.rnd(), pick = a => ARCADE.pick(a);
  const toon = (c, o) => ARCADE.toonM(c, o), flat = (c, k, o) => ARCADE.flatM(c, k, o);
  const mk = (geo, mat, o) => K3D.mesh(geo, mat, o);
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const dum = new T.Object3D();
  // a material of its own (for anything whose colour the update changes: the kit's materials are shared)
  const own = (c, k) => new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k), toneMapped: false });
  // the plan: gallery glass front GZ (|x| < GX), gallery back wall GB, back walls BACK_Z (GX < |x| < SIDE_X), side walls SIDE_X
  H.GZ = -7.0; H.GX = 8.4; H.GB = -10.4; H.BACK_Z = -8.6; H.SIDE_X = 16.5; H.CEIL = 11;

  /* ---------- a blocky creature as real meshes (for the story actors that move about) ---------- */
  H.actor = function (K, o = {}) {
    const g = new T.Group(), s = o.s || 0.5, col = o.col || pick(ARCADE.NEON);
    const bodyM = o.stripes ? toon('#ffffff', { map: stripes() }) : flat(col, 1.15);
    const body = mk(box(1 * s, 0.9 * s, 0.8 * s), bodyM, { ink: INK, inkW: 0.8 }); body.position.y = 0.62 * s; g.add(body);
    const eyes = [];
    for (const sx of [-1, 1]) {
      const e = new T.Mesh(box(0.24 * s, 0.26 * s, 0.04 * s), flat('#f8f4ea', 1.1)); e.position.set(sx * 0.22 * s, 0.72 * s, 0.41 * s); g.add(e);
      const p = new T.Mesh(box(0.11 * s, 0.13 * s, 0.03 * s), flat('#16121a', 1)); p.position.set(sx * 0.22 * s, 0.7 * s, 0.44 * s); g.add(p); eyes.push(e);
    }
    const arms = [], legs = [];
    for (const sx of [-1, 1]) {
      const a = new T.Group(); a.position.set(sx * 0.58 * s, 0.82 * s, 0); g.add(a);
      const am = mk(box(0.18 * s, 0.42 * s, 0.18 * s).translate(0, -0.21 * s, 0), o.stripes ? toon('#f8f8f8') : flat(col, 0.7), { ink: INK, inkW: 0.6 }); a.add(am); arms.push(a);
      const l = new T.Group(); l.position.set(sx * 0.25 * s, 0.22 * s, 0); g.add(l);
      const lm = mk(box(0.22 * s, 0.24 * s, 0.24 * s).translate(0, -0.12 * s, 0), flat(col, 0.55), { ink: INK, inkW: 0.6 }); l.add(lm); legs.push(l);
    }
    if (o.hat) { const hat = mk(new T.ConeGeometry(0.22 * s, 0.4 * s, 10), flat(o.hat, 1.2), { ink: INK, inkW: 0.6 }); hat.position.y = 1.27 * s; g.add(hat); }
    if (o.cap) { const cap = mk(box(0.8 * s, 0.18 * s, 0.7 * s), flat(o.cap, 1.1), { ink: INK, inkW: 0.6 }); cap.position.y = 1.15 * s; g.add(cap); const pk = new T.Mesh(box(0.6 * s, 0.05 * s, 0.35 * s), flat(o.cap, 0.8)); pk.position.set(0, 1.08 * s, 0.5 * s); g.add(pk); }
    g.userData = { arms, legs, eyes, body, s, t: R() * 10 };
    return g;
  };
  // walk/idle/wave/cheer for an actor (dt-driven)
  H.pose = function (a, act, dt, k = 1) {
    const u = a.userData; u.t += dt * k;
    const t = u.t, s = u.s;
    const sw = act === 'walk' ? Math.sin(t * 9) * 0.7 : 0;
    u.legs[0].rotation.x = sw; u.legs[1].rotation.x = -sw;
    u.arms[0].rotation.x = act === 'walk' ? -sw * 0.6 : 0; u.arms[1].rotation.x = act === 'walk' ? sw * 0.6 : 0;
    u.arms[0].rotation.z = 0; u.arms[1].rotation.z = 0;
    if (act === 'wave') u.arms[1].rotation.z = 2.4 + Math.sin(t * 9) * 0.4;
    if (act === 'cheer') { u.arms[0].rotation.z = -2.6; u.arms[1].rotation.z = 2.6; }
    if (act === 'shake') { u.arms[1].rotation.z = 2.2; u.arms[1].rotation.x = Math.sin(t * 22) * 0.5; }
    if (act === 'mop') { u.arms[0].rotation.x = -0.9 + Math.sin(t * 3) * 0.5; u.arms[1].rotation.x = -0.9 + Math.sin(t * 3) * 0.5; }
    if (act === 'sleep') { u.body.scale.y = 0.94 + 0.04 * Math.sin(t * 1.3); for (const e of u.eyes) e.scale.y = 0.15; } else { u.body.scale.y = 1; for (const e of u.eyes) e.scale.y = 1; }
    u.body.position.y = 0.62 * s + (act === 'walk' ? Math.abs(Math.sin(t * 9)) * 0.06 * s : act === 'cheer' ? Math.abs(Math.sin(t * 8)) * 0.3 * s : 0);
  };
  const stripes = () => K3D.paint('al-ref-stripes', 64, 64, (c, w, h) => { for (let x = 0; x < w; x += 16) { c.fillStyle = '#f8f8f8'; c.fillRect(x, 0, 8, h); c.fillStyle = '#1a1a1e'; c.fillRect(x + 8, 0, 8, h); } });

  /* ---------- text on a board (signs, menus, the rules) ---------- */
  function board(text, w, h, o = {}) {
    const tex = K3D.paint('al-board|' + text + '|' + w + h, Math.round(256 * w / h), 256, (c, cw, ch) => {
      c.fillStyle = o.bg || '#141018'; c.fillRect(0, 0, cw, ch);
      if (o.frame !== false) { c.strokeStyle = o.fc || '#fff0b0'; c.lineWidth = 8; c.strokeRect(6, 6, cw - 12, ch - 12); }
      const lines = text.split('\n'), fs = Math.min(ch / (lines.length + 0.6) * 0.8, cw / Math.max(...lines.map(l => l.length)) * 1.7);
      c.font = `900 ${fs}px "DejaVu Sans", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      lines.forEach((l, i) => { c.fillStyle = (o.cols && o.cols[i]) || o.col || '#fff6dc'; c.fillText(l, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * fs * 1.15); });
    });
    return new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, toneMapped: false, color: new T.Color(1, 1, 1).multiplyScalar(o.k || 1.1) }));
  }
  H.board = board;

  /* ---------- the build ---------- */
  // the hall's plan, round the floor (21 x 11.2): the barrier just outside it, a walkway, then the gallery's glass front
  // (GZ) across the middle of the back and the back walls (BW) either side of it, the side walls at SIDE_X
  const bt = 0.32, EX = AR.HX + bt / 2, EZ = AR.HZ + bt / 2;
  const GZ = H.GZ, GX = H.GX, GB = H.GB, BW = H.BACK_Z, SX = H.SIDE_X;
  const VEST = { xc: -(GX + 4.0), dw: 3.0, dh: 3.0 }, PARTY = { xc: GX + 2.9, ww: 3.6, wh: 1.9, wy: 0.9 };
  H.build = function (K, st) {
    const hall = { tick: [], crowd: null, stories: {}, murals: [], tubes: [], barrierNeon: [] };
    const root = new T.Group(); K.add(root);
    const still = new T.Group(); root.add(still); // baked at the end
    const L = ARCADE.lights(K, 9000), Gw = ARCADE.glows(K, 2600);
    hall.L = L; hall.G = Gw;

    /* ----- floors ----- */
    const hf = PT.hallFloor(); hf.repeat.set(12, 9);
    const hallFloor = new T.Mesh(new T.PlaneGeometry(48, 36).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: hf }));
    hallFloor.position.set(0, -0.02, -1); hallFloor.receiveShadow = true; root.add(hallFloor);
    const af = new T.Mesh(new T.PlaneGeometry(AR.HX * 2, AR.HZ * 2).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: PT.floor(2048, 1092) }));
    af.receiveShadow = true; root.add(af);
    const glowM = new T.MeshBasicMaterial({ map: PT.floorGlow(2048, 1092), transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, color: new T.Color(1, 1, 1) });
    const ag = new T.Mesh(new T.PlaneGeometry(AR.HX * 2, AR.HZ * 2).rotateX(-Math.PI / 2), glowM); ag.position.y = 0.006; ag.renderOrder = 2; root.add(ag);
    hall.floorGlow = glowM;
    // hazard edging round the walkway outside the barrier
    const walk = K3D.paint('al-walk', 512, 64, (c, w, h) => { c.fillStyle = '#e8c83a'; c.fillRect(0, 0, w, h); for (let x = -h; x < w; x += 48) { c.fillStyle = '#1a1820'; c.beginPath(); c.moveTo(x, h); c.lineTo(x + 24, h); c.lineTo(x + 24 + h, 0); c.lineTo(x + h, 0); c.closePath(); c.fill(); } c.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 200; i++) c.fillRect(Math.random() * w, Math.random() * h, 3, 2); }, { repeat: true });
    const wz = EZ + 0.55, wx = EX + 0.75;
    for (const [x, z, w, rot] of [[0, -wz, wx * 2, 0], [0, wz, wx * 2, 0], [-wx, 0, wz * 2, Math.PI / 2], [wx, 0, wz * 2, Math.PI / 2]]) {
      const t2 = walk.clone(); t2.needsUpdate = true; t2.repeat.set(w / 4, 1);
      const m = new T.Mesh(new T.PlaneGeometry(w, 0.22).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: t2 })); m.rotation.y = rot; m.position.set(x, 0.004, z); root.add(m);
    }

    /* ----- the barrier round the play floor: padded, stitched, a neon strip on top, corner posts with lamps ----- */
    const padTex = K3D.paint('al-pad', 256, 128, (c, w, h) => { c.fillStyle = '#26202c'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 64) { const g = c.createLinearGradient(x, 0, x + 64, 0); g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.5, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0.35)'); c.fillStyle = g; c.fillRect(x, 0, 64, h); c.strokeStyle = 'rgba(255,240,200,0.35)'; c.setLineDash([4, 4]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 3, 0); c.lineTo(x + 3, h); c.stroke(); c.setLineDash([]); } c.fillStyle = 'rgba(255,90,214,0.15)'; c.fillRect(0, h * 0.7, w, 6); }, { repeat: true });
    const bh = 0.62;
    const neonM = own('#ff5ad6', 2.4);
    const barrier = (x, z, len, rot) => {
      const tx = padTex.clone(); tx.needsUpdate = true; tx.repeat.set(len / 1.6, 1);
      const m = mk(box(len, bh, bt), K3D.toon('#ffffff', { map: tx }), { ink: INK, inkW: 0.9 }); m.position.set(x, bh / 2, z); m.rotation.y = rot; still.add(m);
      const cap = new T.Mesh(box(len, 0.05, bt + 0.04), K3D.toon('#3a3240')); cap.position.set(x, bh + 0.02, z); cap.rotation.y = rot; still.add(cap);
      const neon = new T.Mesh(box(len, 0.035, 0.05), neonM); neon.position.set(x, bh + 0.06, z); neon.rotation.y = rot; root.add(neon);
    };
    hall.barrierNeon.push(neonM);
    barrier(0, -EZ, AR.HX * 2 + bt * 2, 0); barrier(0, EZ, AR.HX * 2 + bt * 2, 0);
    barrier(-EX, 0, AR.HZ * 2, Math.PI / 2); barrier(EX, 0, AR.HZ * 2, Math.PI / 2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const post = mk(new T.CylinderGeometry(0.24, 0.28, 1.2, 16), K3D.toon('#2e2836'), { ink: INK }); post.position.set(sx * EX, 0.6, sz * EZ); still.add(post);
      for (let k = 0; k < 3; k++) { const band = new T.Mesh(new T.CylinderGeometry(0.25, 0.25, 0.045, 16), flat(['#4ae8ff', '#5aff8a', '#ff5ad6'][k], 2.2)); band.position.set(sx * EX, 0.4 + k * 0.3, sz * EZ); root.add(band); }
      const lamp = new T.Mesh(new T.SphereGeometry(0.16, 14, 10), flat('#fff0b0', 1.7)); lamp.position.set(sx * EX, 1.3, sz * EZ); root.add(lamp);
      Gw.add(sx * EX, 1.3, sz * EZ, 0.8, '#fff0b0', 0.28);
    }
    // stencilled zone numbers and KEEP OFF THE BARRIER along the outside faces
    for (let k = 0; k < 5; k++) { const s = board(k % 2 ? 'KEEP OFF\nTHE BARRIER' : 'ZONE ' + (k + 1), 1.0, 0.3, { bg: '#26202c', col: '#ffe24a', frame: false, k: 0.9 }); s.position.set(-8 + k * 4, 0.3, -EZ - bt / 2 - 0.01); s.rotation.y = Math.PI; root.add(s); }

    /* ----- the gallery: a long window of tiered stands across the middle of the back, the scoreboard in its front ----- */
    const wallM = K3D.toon('#1a1420', { map: ARCADE.grimeTex() });
    const GH = 1.1, GT = 3.5, GC = 4.6; // the front wall's top (the glass starts), the glass top, the gallery's ceiling
    const dash = mk(box(GX * 2, GH, 0.3), K3D.toon('#2a2232', { map: ARCADE.grimeTex() }), { ink: INK }); dash.position.set(0, GH / 2, GZ - 0.15); still.add(dash);
    const header = mk(box(GX * 2 + 0.6, 2.2, 0.4), wallM, { ink: INK }); header.position.set(0, GT + 1.1, GZ - 0.2); still.add(header);
    for (const sx of [-1, 1]) {
      // the gallery's end walls (between its front and the back walls), a stair up into it on each end
      const endW = mk(box(0.3, GT + 2.2, BW - GZ < 0 ? GZ - BW + 0.1 : 0.1), wallM, { ink: INK }); endW.position.set(sx * (GX + 0.15), (GT + 2.2) / 2, (GZ + BW) / 2); still.add(endW);
      for (let k = 0; k < 5; k++) { const stp = mk(box(0.9, 0.2 + k * 0.2, 0.32), K3D.toon('#3a3044'), { ink: INK, inkW: 0.6 }); stp.position.set(sx * (GX + 0.75), (0.2 + k * 0.2) / 2, GZ - 0.05 - k * 0.32); still.add(stp); }
      const sgn = board('GALLERY\nUP HERE', 0.9, 0.5, { bg: '#0a0810', col: '#fff0b0', fc: '#ff5ad6', k: 1.3 }); sgn.position.set(sx * (GX + 0.75), 2.4, GZ - 0.6); root.add(sgn);
      L.line([sx * (GX + 0.32), 0.15, GZ + 0.02], [sx * (GX + 0.32), GT + 2.1, GZ + 0.02], 0.22, '#ffe24a', { size: 0.045, speed: 3, blink: 0.4 });
    }
    // tiered steps inside, the back wall with posters, a warm light row so the crowd is lit
    const NROW = 4, rowZ = k => GZ - 0.55 - k * 0.8, rowY = k => 0.7 + k * 0.42;
    for (let k = 0; k < NROW; k++) { const stp = mk(box(GX * 2, rowY(k), 0.8), K3D.toon(['#3a3044', '#342a3e', '#2e2438', '#2a2034'][k]), { ink: INK }); stp.position.set(0, rowY(k) / 2, rowZ(k)); still.add(stp); }
    const galBack = mk(box(GX * 2, GC, 0.2), K3D.toon('#2a2030'), { ink: false }); galBack.position.set(0, GC / 2, GB); still.add(galBack);
    const galCeil = mk(box(GX * 2, 0.2, GZ - GB), K3D.toon('#1a141e'), { ink: false }); galCeil.position.set(0, GC, (GZ + GB) / 2); still.add(galCeil);
    const posters = ['COIN DROP', 'PINBALL\nPANIC', 'CLAW\nRESCUE', 'ZAP MAZE', 'HIGH\nSCORES', 'BIRTHDAYS\nWELCOME'];
    for (let i = 0; i < 7; i++) { const p = board(posters[i % posters.length], 0.9, 1.1, { bg: pick(['#2a1440', '#14304a', '#3a1a2a', '#1a3a2a']), col: pick(['#ffe24a', '#7affd8', '#ff5ad6']), k: 0.8 }); p.position.set(-GX + 1.2 + i * 2.35, 3.0, GB + 0.12); root.add(p); }
    for (let x = -GX + 0.8; x < GX; x += 1.6) { L.add(x, GC - 0.12, GZ - 0.5, '#ffe2b0', { size: 0.06 }); Gw.add(x, GC - 0.25, GZ - 0.6, 1.0, '#ffd890', 0.3); }
    const galLight = new T.PointLight('#ffd8a0', 14, 14, 1.6); galLight.position.set(0, GC - 0.4, GZ - 1.4); root.add(galLight); hall.galLight = galLight;
    // the glass (streaks and nose prints), the posts with chase bulbs, bulbs along the top and the sill
    const glass = new T.Mesh(new T.PlaneGeometry(GX * 2, GT - GH), new T.MeshBasicMaterial({ map: PT.glass(), transparent: true, depthWrite: false, toneMapped: false, color: new T.Color(1, 1, 1) }));
    glass.position.set(0, (GH + GT) / 2, GZ + 0.02); glass.renderOrder = 3; root.add(glass);
    for (let x = -GX; x <= GX + 0.01; x += GX / 3) {
      const post = mk(box(0.2, GT - GH + 0.1, 0.24), K3D.toon('#3a3044'), { ink: INK }); post.position.set(x, (GH + GT) / 2, GZ + 0.04); still.add(post);
      L.line([x, GH + 0.1, GZ + 0.18], [x, GT - 0.1, GZ + 0.18], 0.25, '#ffe24a', { size: 0.04, speed: 3, blink: 0.4 });
    }
    L.line([-GX, GT + 0.06, GZ + 0.05], [GX, GT + 0.06, GZ + 0.05], 0.26, '#ffe24a', { size: 0.045, speed: 4, blink: 0.5 });
    L.line([-GX, GH + 0.02, GZ + 0.05], [GX, GH + 0.02, GZ + 0.05], 0.26, '#ff5ad6', { size: 0.04, speed: -4, blink: 0.5 });
    const rail = mk(new T.CylinderGeometry(0.04, 0.04, GX * 2, 8).rotateZ(Math.PI / 2), K3D.toon('#c8c0d0'), { ink: INK, inkW: 0.6 }); rail.position.set(0, GH + 0.55, GZ - 0.25); still.add(rail);
    // the crowd: four rows of pixel creatures (orange and blue scarves for the fans of each), foam fingers, signs
    const crowd = ARCADE.critters(K, 420);
    hall.crowd = crowd; hall.crowdList = [];
    const fanCols = [['#ff9a3a', '#ffd23a'], ['#4aa8ff', '#7affd8']];
    for (let k = 0; k < NROW; k++) for (let x = -GX + 0.5; x < GX - 0.4; x += 0.56 + R() * 0.26) {
      if (k === 0 && Math.abs(x + 2.2) < 0.9) continue; // (the rival fans sit here)
      const side = x < 0 ? 0 : 1, mixed = R() < 0.2 ? 1 - side : side;
      const cr = crowd.add(x + (R() - 0.5) * 0.15, rowY(k), rowZ(k) + (R() - 0.5) * 0.15, { kind: Math.floor(R() * 7), col: pick(['#5aff8a', '#ff5ad6', '#4ae8ff', '#ffe24a', '#b48aff', '#7affd8', '#fff0b0']), col2: fanCols[mixed][R() < 0.5 ? 0 : 1], act: pick(['idle', 'idle', 'wave', 'cheer', 'dance']), yaw: 0, s: 0.95 + R() * 0.3, glow: 1.15 });
      if (cr) hall.crowdList.push(Object.assign(cr, { side: mixed }));
    }
    crowd.done();
    const signs = ['GO PIP!', 'BO BO BO', 'ZAP!', 'PIP #1', 'TEAM BO', 'BANK IT!', 'HI MUM', 'WOO!'];
    hall.signs = [];
    for (let i = 0; i < 11; i++) {
      const txt = signs[i % signs.length], col = /PIP/.test(txt) ? '#ff9a3a' : /BO/.test(txt) ? '#4aa8ff' : pick(['#5aff8a', '#ff5ad6', '#ffe24a']);
      const sg = board(txt, 0.8, 0.36, { bg: '#f8f2e4', col, fc: col, k: 0.95 });
      const k = 1 + Math.floor(R() * 3), x = -GX + 1.0 + i * 1.5 + (R() - 0.5) * 0.4, y = rowY(k) + 1.05 + R() * 0.2, z = rowZ(k) + 0.1;
      sg.position.set(x, y, z); root.add(sg);
      const stick = new T.Mesh(box(0.03, 0.45, 0.03), toon('#c89a58')); stick.position.set(x, y - 0.38, z - 0.02); root.add(stick);
      hall.signs.push({ m: sg, s: stick, y, ph: R() * 6 });
    }
    for (let i = 0; i < 10; i++) {
      const col = i % 2 ? '#ff9a3a' : '#4aa8ff', k = Math.floor(R() * 3), x = -GX + 0.9 + i * 1.65 + R() * 0.5, z = rowZ(k) + 0.1, y = rowY(k) + 0.85 + R() * 0.2;
      const f = new T.Group(); const hand = mk(K3D.roundBox(0.28, 0.32, 0.12, 0.6, 12), toon(col), { ink: INK, inkW: 0.6 }); f.add(hand);
      const fing = mk(K3D.roundBox(0.09, 0.32, 0.09, 0.6, 10), toon(col), { ink: INK, inkW: 0.6 }); fing.position.set(-0.05, 0.27, 0); f.add(fing);
      f.position.set(x, y, z); root.add(f); hall.signs.push({ m: f, y, ph: R() * 6, finger: true });
    }

    /* ----- the ZAP MAZE neon over the gallery, TAG! and ZAP!, the black-light tubes ----- */
    const logo = ARCADE.neon(K, 'ZAP MAZE', { w: 5.6, h: 1.2, col: '#ff5ad6', col2: '#4ae8ff', font: '"DejaVu Serif", serif', flicker: false });
    logo.position.set(0, GT + 0.95, GZ + 0.06); root.add(logo);
    for (const sx of [-1, 1]) { const tag = ARCADE.neon(K, sx < 0 ? 'TAG!' : 'ZAP!', { w: 1.8, h: 0.8, col: '#5aff8a', col2: '#ffe24a', flicker: false }); tag.position.set(sx * 5.4, GT + 0.9, GZ + 0.06); tag.rotation.z = sx * 0.08; root.add(tag); }
    const tubeM = own('#9a5aff', 2.2); hall.tubes.push(tubeM);
    // each tube lights the wall behind it with a soft wash painted on the wall itself (a big glow sprite this close to a
    // wall would be cut by it); n = the wall's normal, off = how far the tube stands out from it
    const washTex = K3D.paint('al-wash', 16, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    const washM = new T.MeshBasicMaterial({ map: washTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, color: new T.Color('#7a3aff').multiplyScalar(0.55) });
    hall.washM = washM;
    const tube = (a, b, n, off) => {
      const va = new T.Vector3(...a), vb = new T.Vector3(...b), len = va.distanceTo(vb);
      const m = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, len, 8), tubeM); m.position.copy(va).add(vb).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), vb.clone().sub(va).normalize()); root.add(m);
      const wash = new T.Mesh(new T.PlaneGeometry(len + 0.6, 1.8), washM); wash.position.copy(m.position).addScaledVector(new T.Vector3(n[0], 0, n[1]), -(off - 0.03));
      wash.rotation.y = Math.atan2(n[0], n[1]); wash.renderOrder = 3; root.add(wash);
      const k = Math.max(2, Math.round(len / 1.5)); for (let i = 0; i <= k; i++) { const p = va.clone().lerp(vb, i / k); Gw.add(p.x, p.y, p.z, 0.6, '#9a6aff', 0.35); }
    };
    tube([-GX + 0.3, GT + 0.25, GZ + 0.1], [-3.2, GT + 0.25, GZ + 0.1], [0, 1], 0.1); tube([3.2, GT + 0.25, GZ + 0.1], [GX - 0.3, GT + 0.25, GZ + 0.1], [0, 1], 0.1);
    tube([-SX + 0.3, 3.6, BW + 0.5], [-SX + 0.3, 3.6, 5], [1, 0], 0.3); tube([SX - 0.3, 3.6, BW + 0.5], [SX - 0.3, 3.6, 5], [-1, 0], 0.3);
    tube([-SX + 0.5, 4.4, BW + 0.3], [-GX - 0.6, 4.4, BW + 0.3], [0, 1], 0.3); tube([GX + 0.6, 4.4, BW + 0.3], [SX - 0.5, 4.4, BW + 0.3], [0, 1], 0.3);

    /* ----- the back walls either side of the gallery, and the side walls: dark walls, the glow-paint murals ----- */
    const bwW = SX - GX;
    // each back wall (and its mural) is cut round its opening: the vesting room's doorway on the left, the party
    // room's window on the right (the openings' sizes match buildVesting and buildParty)
    const cut = (sx, top) => {
      const x0 = sx < 0 ? -SX : GX, x1 = sx < 0 ? -GX : SX, sh = new T.Shape();
      if (sx < 0) { const d0 = VEST.xc - VEST.dw / 2, d1 = VEST.xc + VEST.dw / 2; sh.moveTo(x0, 0); sh.lineTo(d0, 0); sh.lineTo(d0, VEST.dh); sh.lineTo(d1, VEST.dh); sh.lineTo(d1, 0); sh.lineTo(x1, 0); sh.lineTo(x1, top); sh.lineTo(x0, top); sh.closePath(); }
      else {
        sh.moveTo(x0, 0); sh.lineTo(x1, 0); sh.lineTo(x1, top); sh.lineTo(x0, top); sh.closePath();
        const w0 = PARTY.xc - PARTY.ww / 2, w1 = PARTY.xc + PARTY.ww / 2, hole = new T.Path(); hole.moveTo(w0, PARTY.wy); hole.lineTo(w0, PARTY.wy + PARTY.wh); hole.lineTo(w1, PARTY.wy + PARTY.wh); hole.lineTo(w1, PARTY.wy); hole.closePath(); sh.holes.push(hole);
      }
      return { sh, x0, x1 };
    };
    for (const sx of [-1, 1]) {
      const cw = cut(sx, H.CEIL), wg = new T.ExtrudeGeometry(cw.sh, { depth: 0.4, bevelEnabled: false });
      const wall = mk(wg, wallM, { ink: false }); wall.position.set(0, 0, BW - 0.4); still.add(wall);
      const cm = cut(sx, 4.0), mg = new T.ShapeGeometry(cm.sh), uv = mg.attributes.uv, pa = mg.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (pa.getX(i) - cm.x0) / (cm.x1 - cm.x0), pa.getY(i) / 4.0);
      const mur = new T.Mesh(mg, new T.MeshBasicMaterial({ map: PT.mural(sx < 0 ? 0 : 1, 1024, 512), toneMapped: false, color: new T.Color(1.1, 1.1, 1.1) }));
      mur.position.set(0, 0, BW + 0.01); root.add(mur); hall.murals.push(mur.material);
      const side = new T.Mesh(new T.PlaneGeometry(BW * -1 + 6, 4.0), new T.MeshBasicMaterial({ map: PT.mural(sx < 0 ? 2 : 3, 1536, 400), toneMapped: false, color: new T.Color(1.1, 1.1, 1.1) }));
      side.rotation.y = -sx * Math.PI / 2; side.position.set(sx * (SX - 0.01), 2.0, (BW + 6) / 2); root.add(side); hall.murals.push(side.material);
      const sw = mk(box(0.4, H.CEIL, -BW + 8), wallM, { ink: false }); sw.position.set(sx * (SX + 0.2), H.CEIL / 2, (BW + 8) / 2 - 0.4); still.add(sw);
      // a dado rail of chase bulbs above the murals
      L.line([sx * (GX + 0.4), 4.15, BW + 0.08], [sx * (SX - 0.2), 4.15, BW + 0.08], 0.3, '#ff5ad6', { size: 0.04, speed: sx * 3, blink: 0.5 });
    }
    buildVesting(K, root, still, hall, L, Gw);
    buildParty(K, root, still, hall, L, Gw);
    buildSnacks(K, root, still, hall, L, Gw);
    buildReferee(K, root, hall, L, Gw);
    buildNear(K, root, hall, L, Gw);
    buildCeiling(K, root, still, hall, L, Gw);
    buildScoreboard(K, root, still, hall, L, Gw);
    buildHaze(K, root, hall);
    buildStories(K, root, hall);

    L.done(); Gw.done();
    K3D.bake(still);
    hall.root = root;
    hall.update = (K2, st2, dt, mood) => update(hall, K2, st2, dt, mood);
    return hall;
  };

  /* ---------- the vesting room (the left back wall, through open double doors) ---------- */
  function buildVesting(K, root, still, hall, L, Gw) {
    const { xc, dw, dh } = VEST;
    // the doorway: a frame cut in the mural, the doors slid open, chase bulbs up each side, the sign over it
    const frameM = K3D.toon('#2a2232');
    // (the doors slide: shut at the start of the opening, open when Pip and Bo come out; a round porthole in each)
    hall.stories.vestDoors = [];
    for (const sx of [-1, 1]) {
      const jamb = mk(box(0.3, dh + 0.3, 0.5), frameM, { ink: INK }); jamb.position.set(xc + sx * (dw / 2 + 0.15), (dh + 0.3) / 2, BW + 0.05); still.add(jamb);
      const door = mk(box(1.5, dh - 0.1, 0.1), toon('#4a4256'), { ink: INK }); door.position.set(xc + sx * (dw / 2 + 0.9), (dh - 0.1) / 2, BW + 0.12); root.add(door);
      const port = new T.Mesh(new T.CircleGeometry(0.22, 20), flat('#ffe8c0', 1.3)); port.position.set(0, 0.55, 0.055); door.add(port);
      const portB = new T.Mesh(new T.CircleGeometry(0.22, 20), flat('#ffe8c0', 1.3)); portB.position.set(0, 0.55, -0.055); portB.rotation.y = Math.PI; door.add(portB);
      const rim = mk(new T.TorusGeometry(0.23, 0.035, 6, 20), toon('#c8c0d0'), { ink: false }); rim.position.set(0, 0.55, 0.06); door.add(rim);
      const plate = new T.Mesh(box(0.08, 0.5, 0.03), toon('#c8c0d0')); plate.position.set(-sx * 0.6, -0.1, 0.06); door.add(plate);
      const stripe = new T.Mesh(box(1.5, 0.12, 0.11), flat('#7affd8', 1.4)); stripe.position.set(0, -(dh - 0.1) / 2 + 0.3, 0); door.add(stripe);
      hall.stories.vestDoors.push({ m: door, open: xc + sx * (dw / 2 + 0.9), closed: xc + sx * 0.75 });
    }
    const lintel = mk(box(dw + 0.6, 0.35, 0.5), frameM, { ink: INK }); lintel.position.set(xc, dh + 0.17, BW + 0.05); still.add(lintel);
    const dark = new T.Mesh(new T.PlaneGeometry(dw, dh), toon('#0e0a12')); dark.position.set(xc, dh / 2, BW + 0.02); dark.visible = false; root.add(dark);
    const sign = board('VESTING ROOM', 2.4, 0.42, { bg: '#0a0810', col: '#7affd8', fc: '#7affd8', k: 1.6 }); sign.position.set(xc, dh + 0.62, BW + 0.32); root.add(sign);
    for (const sx of [-1, 1]) L.line([xc + sx * (dw / 2 + 0.32), 0.1, BW + 0.32], [xc + sx * (dw / 2 + 0.32), dh + 0.3, BW + 0.32], 0.22, '#7affd8', { size: 0.045, speed: 2 });
    // the room behind (lit warm white): floor, walls, lockers, racks of vests charging with blinking lights, a bench
    const room = new T.Group(); room.position.set(xc, 0, BW - 2.8); root.add(room);
    const rf = mk(box(6, 0.05, 5.4), K3D.toon('#3a3442'), { ink: false }); rf.position.y = -0.01; room.add(rf);
    const rw = mk(box(6, 4, 0.2), K3D.toon('#4a3e58'), { ink: false }); rw.position.set(0, 2, -2.7); room.add(rw);
    for (const sx of [-1, 1]) { const sw = mk(box(0.2, 4, 5.4), K3D.toon('#443a52'), { ink: false }); sw.position.set(sx * 3, 2, 0); room.add(sw); }
    const lamp = new T.PointLight('#fff0d8', 9, 11, 1.4); lamp.position.set(0, 3.0, 0.4); room.add(lamp);
    const lamp2 = new T.PointLight('#ffd8a8', 5, 8, 1.4); lamp2.position.set(-1.2, 2.2, 1.6); room.add(lamp2);
    // a ceiling with two strip lights (it is seen from inside in the opening)
    const ceil = mk(box(6, 0.15, 5.4), K3D.toon('#2a2432'), { ink: false }); ceil.position.set(0, 4.0, 0); room.add(ceil);
    for (const sx of [-1.2, 1.2]) { const strip = new T.Mesh(box(0.25, 0.05, 3.6), flat('#fff0d8', 1.6)); strip.position.set(sx, 3.9, -0.2); room.add(strip); }
    for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) {
      const vx = -2.4 + k * 0.95, vz = -2.2 + r * 1.2;
      const hook2 = new T.Mesh(box(0.05, 0.3, 0.05), toon('#9a96a2')); hook2.position.set(vx, 2.6, vz); room.add(hook2);
      const v = mk(K3D.roundBox(0.55, 0.6, 0.3, 0.5, 16), toon(k % 2 ? '#1e1a22' : '#eef0ee'), { ink: INK, inkW: 0.7 }); v.position.set(vx, 1.8, vz); room.add(v);
      const col = pick(['#5aff8a', '#ff5ad6', '#ffe24a', '#7affd8']);
      L.add(room.position.x + vx, 2.1, room.position.z + vz + 0.16, col, { size: 0.06, blink: 0.5 + R() * 0.5, speed: 1 + R() * 2 });
      L.add(room.position.x + vx + 0.1, 1.9, room.position.z + vz + 0.16, col, { size: 0.05, blink: 0.5 + R() * 0.5, speed: 1 + R() * 2 });
    }
    for (const rz of [-2.2, -1.0]) { const rl = mk(new T.CylinderGeometry(0.04, 0.04, 6, 8).rotateZ(Math.PI / 2), toon('#c8c0d0'), { ink: INK, inkW: 0.5 }); rl.position.set(0, 2.75, rz); room.add(rl); }
    for (let k = 0; k < 4; k++) { const lk = mk(box(0.6, 2.4, 0.6), toon(pick(['#3a6a8a', '#6a3a8a', '#3a8a6a'])), { ink: INK, inkW: 0.7 }); lk.position.set(2.6, 1.2, -1.6 + k * 0.64); room.add(lk); const vent = new T.Mesh(box(0.02, 0.2, 0.4), toon('#1a1820')); vent.position.set(2.29, 2.0, -1.6 + k * 0.64); room.add(vent); }
    // the bench along the left wall, a kit bag and a spare vest on it
    const bench = mk(box(0.5, 0.12, 2.6), toon('#a87a4a'), { ink: INK }); bench.position.set(-2.45, 0.5, 0.7); room.add(bench);
    for (const bz of [-0.4, 1.8]) { const leg = new T.Mesh(box(0.4, 0.45, 0.1), toon('#5a5462')); leg.position.set(-2.45, 0.24, bz); room.add(leg); }
    const bag = mk(K3D.roundBox(0.32, 0.26, 0.6, 0.5, 12), toon('#3a6a8a'), { ink: INK, inkW: 0.6 }); bag.position.set(-2.45, 0.69, 1.4); room.add(bag);
    const spare = mk(K3D.roundBox(0.45, 0.12, 0.5, 0.5, 12), toon('#eef0ee'), { ink: INK, inkW: 0.6 }); spare.position.set(-2.45, 0.62, 0.1); spare.rotation.y = 0.3; room.add(spare);
    const rules = board('HOUSE RULES\n1 NO RUNNING... OK, RUN\n2 BEAMS BOUNCE\n3 BE A GOOD SPORT', 1.6, 1.15, { bg: '#1a1420', col: '#fff6dc', k: 1.2 }); rules.position.set(-1.4, 2.0, -2.58); room.add(rules);
    // creatures suiting up (and one fighting a vest on backwards)
    const a1 = H.actor(K, { col: '#ffe24a', s: 0.55 }); a1.position.set(xc + 0.85, 0, BW - 4.75); a1.rotation.y = 0.2; root.add(a1);
    const a2 = H.actor(K, { col: '#7affd8', s: 0.5 }); a2.position.set(xc + 1.85, 0, BW - 3.9); a2.rotation.y = -0.7; root.add(a2);
    const backV = mk(K3D.roundBox(0.6, 0.4, 0.5, 0.5, 12), toon('#eef0ee'), { ink: INK, inkW: 0.6 }); backV.position.set(0, 0.55 * 0.5, 0); backV.rotation.x = 0.4; a2.add(backV);
    hall.stories.vesters = [a1, a2];
    // the emergency exit and the equipment hatch on the left side wall, extinguishers by the door
    const exitZ = BW + 2.0;
    const exit = board('EXIT', 1.0, 0.38, { bg: '#0a3a1a', col: '#7aff9a', fc: '#7aff9a', k: 1.6 }); exit.rotation.y = Math.PI / 2; exit.position.set(-SX + 0.05, 2.75, exitZ); root.add(exit);
    const door = mk(box(0.12, 2.3, 1.4), toon('#4a4256'), { ink: INK }); door.position.set(-SX + 0.05, 1.15, exitZ); still.add(door);
    const bar = new T.Mesh(box(0.08, 0.07, 1.1), toon('#c8c0d0')); bar.position.set(-SX + 0.16, 1.05, exitZ); root.add(bar);
    for (const ex of [xc - dw / 2 - 0.8, xc + dw / 2 + 0.8]) {
      const ext = new T.Group(); ext.position.set(ex, 0, BW + 0.25); root.add(ext);
      const body = mk(new T.CylinderGeometry(0.14, 0.14, 0.7, 14), toon('#d83a3a'), { ink: INK, inkW: 0.7 }); body.position.y = 0.95; ext.add(body);
      const top = mk(new T.CylinderGeometry(0.05, 0.09, 0.14, 10), toon('#2a2630'), { ink: INK, inkW: 0.5 }); top.position.y = 1.37; ext.add(top);
      const hose = new T.Mesh(new T.TorusGeometry(0.13, 0.022, 6, 12, Math.PI), toon('#1a1820')); hose.position.set(0.1, 1.2, 0.05); hose.rotation.z = -1.2; ext.add(hose);
      const plate = board('FIRE', 0.34, 0.22, { bg: '#d83a3a', col: '#fff', frame: false }); plate.position.set(0, 1.72, 0); ext.add(plate);
    }
    const hatch = mk(box(0.12, 1.1, 1.4), toon('#5a5a42'), { ink: INK }); hatch.position.set(-SX + 0.06, 0.6, BW + 4.6); still.add(hatch);
    const hs = board('EQUIPMENT\nSTAFF ONLY', 1.1, 0.48, { bg: '#e8c83a', col: '#1a1820', frame: false }); hs.rotation.y = Math.PI / 2; hs.position.set(-SX + 0.14, 1.45, BW + 4.6); root.add(hs);
  }

  /* ---------- the party room (the right back wall, through a window) ---------- */
  function buildParty(K, root, still, hall, L, Gw) {
    const { xc, ww, wh, wy } = PARTY;
    const frameM = K3D.toon('#3a2a40');
    const sill = mk(box(ww + 0.4, 0.15, 0.5), frameM, { ink: INK }); sill.position.set(xc, wy, BW + 0.1); still.add(sill);
    const head = mk(box(ww + 0.4, 0.2, 0.5), frameM, { ink: INK }); head.position.set(xc, wy + wh, BW + 0.1); still.add(head);
    for (const sx of [-1, 1]) { const j = mk(box(0.2, wh, 0.5), frameM, { ink: INK }); j.position.set(xc + sx * ww / 2, wy + wh / 2, BW + 0.1); still.add(j); }
    const sign = board('PARTY ROOM', 2.2, 0.42, { bg: '#2a0a20', col: '#ff9ad6', fc: '#ffe24a', k: 1.5 }); sign.position.set(xc, wy + wh + 0.45, BW + 0.32); root.add(sign);
    L.line([xc - ww / 2, wy + wh + 0.12, BW + 0.36], [xc + ww / 2, wy + wh + 0.12, BW + 0.36], 0.2, '#ffe24a', { size: 0.045, speed: 3 });
    const room = new T.Group(); room.position.set(xc, 0, BW - 2.6); root.add(room);
    const rf = mk(box(5, 0.05, 5), K3D.toon('#5a3a5a'), { ink: false }); room.add(rf);
    const rw = mk(box(5, 4, 0.2), K3D.toon('#8a5a8a', { map: K3D.paint('al-partywall', 128, 128, (c, w, h) => { c.fillStyle = '#8a5a8a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { c.fillStyle = pick(['#ffe24a', '#7affd8', '#ff9ad6', '#fff']); c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 3 + Math.random() * 4, 0, Math.PI * 2); c.fill(); } }, { repeat: true }) }), { ink: false }); rw.position.set(0, 2, -2.5); room.add(rw);
    for (const sx of [-1, 1]) { const sw = mk(box(0.2, 4, 5), K3D.toon('#7a4a7a'), { ink: false }); sw.position.set(sx * 2.5, 2, 0); room.add(sw); }
    const lamp = new T.PointLight('#ffd8e8', 12, 10, 1.5); lamp.position.set(0, 3, 0.6); room.add(lamp);
    const table = mk(new T.CylinderGeometry(1.0, 1.0, 0.08, 24), toon('#f8f2e4'), { ink: INK }); table.position.set(0, 0.85, 0); room.add(table);
    const tleg = new T.Mesh(new T.CylinderGeometry(0.12, 0.2, 0.85, 10), toon('#c8a8c8')); tleg.position.y = 0.42; room.add(tleg);
    const cake = new T.Group(); cake.position.set(0, 0.89, 0); room.add(cake);
    const c1 = mk(new T.CylinderGeometry(0.4, 0.4, 0.28, 24), toon('#ff9ad6'), { ink: INK, inkW: 0.7 }); c1.position.y = 0.14; cake.add(c1);
    const c2 = mk(new T.CylinderGeometry(0.27, 0.27, 0.22, 24), toon('#fff6dc'), { ink: INK, inkW: 0.7 }); c2.position.y = 0.39; cake.add(c2);
    const flames = [];
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, cd = new T.Mesh(box(0.03, 0.14, 0.03), toon(pick(['#7affd8', '#ffe24a', '#ff5ad6']))); cd.position.set(Math.cos(a) * 0.18, 0.57, Math.sin(a) * 0.18); cake.add(cd); const f = new T.Mesh(new T.SphereGeometry(0.035, 8, 6), flat('#ffd890', 3)); f.scale.y = 1.6; f.position.set(Math.cos(a) * 0.18, 0.68, Math.sin(a) * 0.18); f.visible = false; cake.add(f); flames.push(f); }
    hall.stories.cake = { flames, cake };
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + 0.3, pr = mk(box(0.3, 0.24, 0.3), toon(pick(['#5aff8a', '#ffe24a', '#7affd8', '#ff9ad6'])), { ink: INK, inkW: 0.6 }); pr.position.set(Math.cos(a) * 1.7, 0.12, Math.sin(a) * 1.7); pr.rotation.y = a; room.add(pr); const rib = new T.Mesh(box(0.32, 0.04, 0.06), toon('#fff')); rib.position.set(Math.cos(a) * 1.7, 0.25, Math.sin(a) * 1.7); rib.rotation.y = a; room.add(rib); }
    const balloons = [];
    for (let k = 0; k < 8; k++) { const col = pick(['#ffe24a', '#7affd8', '#ff9ad6', '#5aff8a', '#b48aff']), b = mk(new T.SphereGeometry(0.2, 14, 10), toon(col), { ink: INK, inkW: 0.6 }); b.scale.y = 1.2; b.position.set(-1.8 + R() * 3.6, 2.2 + R() * 0.8, -1.8 + R() * 2.6); room.add(b); const str = new T.Mesh(box(0.008, 1, 0.008), toon('#fff')); str.position.set(b.position.x, b.position.y - 0.72, b.position.z); room.add(str); balloons.push({ b, str, y: b.position.y, ph: R() * 6 }); }
    hall.stories.balloons = balloons;
    const guests = [];
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, g = H.actor(K, { col: pick(['#5aff8a', '#ffe24a', '#7affd8', '#ff9ad6', '#b48aff']), s: 0.4, hat: pick(['#ffe24a', '#ff5ad6', '#5aff8a']) }); g.position.set(xc + Math.cos(a) * 1.35, 0, room.position.z + Math.sin(a) * 1.35); g.rotation.y = -a - Math.PI / 2; root.add(g); guests.push(g); }
    hall.stories.guests = guests;
    const glass = new T.Mesh(new T.PlaneGeometry(ww, wh), new T.MeshBasicMaterial({ map: PT.glass(), transparent: true, depthWrite: false, toneMapped: false })); glass.position.set(xc, wy + wh / 2, BW + 0.04); glass.renderOrder = 3; root.add(glass);
    const ban = board('HAPPY BIRTHDAY BLIP!', 3.4, 0.46, { bg: '#ffe24a', col: '#ff3a9a', frame: false }); ban.position.set(0, 2.9, -2.38); room.add(ban);
  }

  /* ---------- the snack bar (the right back wall, by the corner) and the prize counter (the right side wall) ---------- */
  function buildSnacks(K, root, still, hall, L, Gw) {
    const xc = SX - 1.6, zc = BW + 0.7;
    const counter = mk(box(2.8, 1.05, 0.8), toon('#3a2a4a', { map: ARCADE.grimeTex() }), { ink: INK }); counter.position.set(xc, 0.52, zc + 0.25); still.add(counter);
    const top = mk(box(3.0, 0.08, 1.0), toon('#c8c0d0'), { ink: INK, inkW: 0.6 }); top.position.set(xc, 1.09, zc + 0.25); still.add(top);
    L.line([xc - 1.4, 0.95, zc + 0.67], [xc + 1.4, 0.95, zc + 0.67], 0.2, '#ff5ad6', { size: 0.04, speed: 3 });
    const menu = board('SNACKS\nPOPCORN 2 TICKETS\nFIZZ 1 TICKET\nPIXEL POPS 3', 2.6, 1.3, { bg: '#1a1020', cols: ['#ffe24a', '#fff6dc', '#fff6dc', '#fff6dc'], k: 1.5 }); menu.position.set(xc, 2.55, BW + 0.04); root.add(menu);
    const pm = new T.Group(); pm.position.set(xc - 0.9, 1.13, zc + 0.2); root.add(pm);
    const pmb = mk(box(0.6, 0.8, 0.5), new T.MeshBasicMaterial({ color: new T.Color('#fff2c8').multiplyScalar(1.3), transparent: true, opacity: 0.35, toneMapped: false }), { ink: '#c83a3a' }); pmb.position.y = 0.4; pm.add(pmb);
    const pmt = mk(box(0.66, 0.16, 0.56), toon('#d83a3a'), { ink: INK }); pmt.position.y = 0.88; pm.add(pmt);
    const pops = []; for (let k = 0; k < 22; k++) { const p = new T.Mesh(new T.SphereGeometry(0.028, 6, 4), flat('#fff6dc', 1.4)); p.position.set((R() - 0.5) * 0.48, 0.05 + R() * 0.22, (R() - 0.5) * 0.38); pm.add(p); pops.push({ p, ph: R() * 6, y: p.position.y }); }
    hall.stories.pops = pops;
    Gw.add(xc - 0.9, 1.6, zc + 0.2, 1.2, '#ffd890', 0.4);
    const drinks = mk(box(0.5, 0.7, 0.45), toon('#2a4a6a'), { ink: INK }); drinks.position.set(xc + 0.2, 1.48, zc + 0.15); root.add(drinks);
    for (let k = 0; k < 3; k++) { const n = new T.Mesh(box(0.07, 0.05, 0.07), flat(['#5aff8a', '#ff5ad6', '#ffe24a'][k], 2)); n.position.set(xc + 0.05 + k * 0.15, 1.6, zc + 0.4); root.add(n); }
    for (let k = 0; k < 5; k++) { const cup = mk(new T.CylinderGeometry(0.06, 0.045, 0.14, 10), toon('#f8f2e4'), { ink: INK, inkW: 0.4 }); cup.position.set(xc + 0.9, 1.2 + k * 0.09, zc + 0.4); root.add(cup); }
    const cook = H.actor(K, { col: '#fff0b0', s: 0.55, cap: '#f8f8f8' }); cook.position.set(xc + 0.5, 0.0, zc - 0.35); root.add(cook);
    const pan = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 0.03, 12), toon('#2a2630')); pan.position.set(xc + 0.55, 1.16, zc + 0.3); root.add(pan);
    const cakeP = new T.Mesh(new T.BoxGeometry(0.16, 0.04, 0.16), flat('#ffd23a', 1.2)); cakeP.position.set(xc + 0.55, 1.19, zc + 0.3); root.add(cakeP);
    hall.stories.cook = { cook, cakeP, pan };
    // the prize counter on the right side wall: shelves of plush and toys, a giant plush on top
    const pc = new T.Group(); pc.position.set(SX - 0.9, 0, BW + 3.3); pc.rotation.y = -Math.PI / 2; root.add(pc);
    const pcb = mk(box(3.0, 1.0, 1.0), toon('#2a3a4a'), { ink: INK }); pcb.position.set(0, 0.5, 0.2); pc.add(pcb);
    const glassT = mk(box(2.8, 0.45, 0.9), new T.MeshBasicMaterial({ color: new T.Color('#c8f0ff'), transparent: true, opacity: 0.18, toneMapped: false }), { ink: '#8ac8e8' }); glassT.position.set(0, 1.22, 0.2); pc.add(glassT);
    for (let k = 0; k < 12; k++) { const t2 = mk(R() < 0.5 ? new T.SphereGeometry(0.09, 8, 6) : box(0.14, 0.14, 0.14), toon(pick(['#ff9ad6', '#7affd8', '#ffe24a', '#5aff8a', '#b48aff'])), { ink: INK, inkW: 0.5 }); t2.position.set(-1.2 + R() * 2.4, 1.1, -0.1 + R() * 0.6); pc.add(t2); }
    const shelf = mk(box(3.0, 2.4, 0.45), toon('#1e2a36'), { ink: INK }); shelf.position.set(0, 1.2, -0.6); pc.add(shelf);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) { const pl = mk(new T.SphereGeometry(0.15, 10, 8), toon(pick(['#ff9ad6', '#7affd8', '#ffe24a', '#5aff8a', '#b48aff', '#f8f2e4'])), { ink: INK, inkW: 0.5 }); pl.position.set(-1.25 + k * 0.5, 0.5 + r * 0.72, -0.3); pc.add(pl); const ear = new T.Mesh(new T.SphereGeometry(0.055, 6, 4), pl.material); ear.position.set(pl.position.x - 0.09, pl.position.y + 0.14, -0.3); pc.add(ear); }
    const giant = mk(new T.SphereGeometry(0.5, 18, 14), toon('#7affd8'), { ink: INK }); giant.position.set(0.3, 2.95, -0.5); giant.scale.y = 1.1; pc.add(giant);
    for (const sx of [-1, 1]) { const e = mk(new T.SphereGeometry(0.18, 10, 8), toon('#7affd8'), { ink: INK, inkW: 0.6 }); e.position.set(0.3 + sx * 0.34, 3.45, -0.5); pc.add(e); const eye = new T.Mesh(new T.SphereGeometry(0.06, 8, 6), toon('#16121a')); eye.position.set(0.3 + sx * 0.16, 3.05, -0.05); pc.add(eye); }
    const ps = board('PRIZES', 1.8, 0.45, { bg: '#0a1830', col: '#ffe24a', fc: '#ffe24a', k: 1.5 }); ps.position.set(0, 2.55, -0.36); pc.add(ps);
    const wisher = H.actor(K, { col: '#ff9ad6', s: 0.48 }); wisher.position.set(SX - 2.2, 0, BW + 3.0); wisher.rotation.y = Math.PI / 2; root.add(wisher);
    hall.stories.wisher = wisher;
  }

  /* ---------- the referee's high chair (outside the barrier on the right, by the far corner) ---------- */
  function buildReferee(K, root, hall, L, Gw) {
    const rx = EX + 1.35, rz = -2.4;
    const g = new T.Group(); g.position.set(rx, 0, rz); g.rotation.y = -Math.PI / 2 + 0.35; root.add(g);
    const legM = toon('#e8e4ec');
    for (const [x, z] of [[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.4], [0.5, 0.4]]) { const l = mk(new T.CylinderGeometry(0.05, 0.06, 2.1, 8), legM, { ink: INK, inkW: 0.5 }); l.position.set(x * 0.8, 1.05, z * 0.8); l.rotation.z = -x * 0.12; l.rotation.x = z * 0.12; g.add(l); }
    for (let k = 0; k < 4; k++) { const rung = new T.Mesh(box(0.8, 0.04, 0.04), legM); rung.position.set(0, 0.4 + k * 0.4, 0.38 - k * 0.02); g.add(rung); }
    const seat = mk(box(0.8, 0.1, 0.7), toon('#d83a8a'), { ink: INK }); seat.position.y = 2.12; g.add(seat);
    const back = mk(box(0.8, 0.6, 0.08), toon('#d83a8a'), { ink: INK }); back.position.set(0, 2.45, -0.33); g.add(back);
    const umb = mk(new T.ConeGeometry(0.8, 0.3, 12, 1, true), toon('#ffe24a', { side: T.DoubleSide }), { ink: INK }); umb.position.y = 3.45; g.add(umb);
    const pole = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 1.1, 6), legM); pole.position.set(0, 2.9, -0.3); g.add(pole);
    const ref = H.actor(K, { col: '#ffffff', s: 0.6, stripes: true }); ref.position.y = 2.17; g.add(ref);
    const whistle = new T.Mesh(box(0.1, 0.06, 0.06), flat('#ffe24a', 1.3)); whistle.position.set(0.05, 0.42, 0.3); ref.add(whistle);
    const cap = mk(box(0.5, 0.12, 0.45), toon('#1a1a1e'), { ink: INK, inkW: 0.5 }); cap.position.y = 0.66; ref.add(cap);
    const zz = board('Z z z', 0.6, 0.3, { bg: '#000000', col: '#c8d0ff', frame: false, k: 1.4 }); zz.material.transparent = true; zz.material.blending = T.AdditiveBlending; zz.position.set(0.1, 1.05, 0); zz.visible = false; ref.add(zz);
    // the box of spare whistles, the trophy waiting on a stool for the winner
    const stool = mk(new T.CylinderGeometry(0.22, 0.25, 0.6, 12), toon('#5a5462'), { ink: INK, inkW: 0.6 }); stool.position.set(rx + 0.2, 0.3, rz + 1.2); root.add(stool);
    const trophy = new T.Group(); trophy.position.set(rx + 0.2, 0.6, rz + 1.2); root.add(trophy);
    const cupT = mk(new T.CylinderGeometry(0.16, 0.08, 0.26, 16, 1, true), K3D.toon('#ffd24a', { side: T.DoubleSide, emissive: '#5a3a08', emissiveIntensity: 0.5 }), { ink: INK, inkW: 0.6 }); cupT.position.y = 0.3; trophy.add(cupT);
    const foot = mk(new T.CylinderGeometry(0.1, 0.12, 0.14, 12), toon('#2a2630'), { ink: INK, inkW: 0.5 }); foot.position.y = 0.07; trophy.add(foot);
    const stem = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.12, 8), toon('#ffd24a')); stem.position.y = 0.18; trophy.add(stem);
    for (const sx of [-1, 1]) { const hnd = new T.Mesh(new T.TorusGeometry(0.06, 0.015, 6, 10, Math.PI), toon('#ffd24a')); hnd.position.set(sx * 0.17, 0.32, 0); hnd.rotation.z = sx * -Math.PI / 2; trophy.add(hnd); }
    Gw.add(rx + 0.2, 1.0, rz + 1.2, 0.9, '#ffd24a', 0.3);
    hall.stories.ref = { g, ref, zz, chairY: 2.17, trophy };
    Gw.add(rx, 3.7, rz, 1.6, '#ffe24a', 0.2);
  }

  /* ---------- the near side: a rail with spectators' heads and foam fingers along the bottom edge ---------- */
  function buildNear(K, root, hall, L, Gw) {
    // the near rail just past the walkway: on a wide screen the camera sees over it into the first rows, so they are a
    // real crowd (dim shapes against the bright floor, scarves, foam fingers, glow sticks and a phone or two held up)
    const nz = EZ + 1.05;
    const rail = mk(box(36, 0.8, 0.25), toon('#26202c', { map: ARCADE.grimeTex() }), { ink: INK }); rail.position.set(0, 0.4, nz); root.add(rail);
    const neon = new T.Mesh(box(36, 0.035, 0.05), flat('#4ae8ff', 2.2)); neon.position.set(0, 0.82, nz - 0.14); root.add(neon);
    const crowd = ARCADE.critters(K, 160);
    for (let row = 0; row < 2; row++) for (let x = -17 + row * 0.45; x < 17; x += 0.85 + R() * 0.35) {
      crowd.add(x, -0.15 - row * 0.05 + R() * 0.1, nz + 0.55 + row * 0.75 + R() * 0.15, { kind: pick([0, 1, 4, 5]), col: pick(['#5a4a72', '#4a5a72', '#724a5e', '#54507a', '#4a6464', '#6a5a4a']), col2: R() < 0.5 ? '#ff9a3a' : '#4aa8ff', act: pick(['idle', 'cheer', 'wave', 'cheer']), yaw: Math.PI + (R() - 0.5) * 0.4, s: 1.05 + R() * 0.25 });
    }
    crowd.done(); hall.nearCrowd = crowd;
    // foam fingers and glow sticks held up over the rail, and the odd phone screen filming
    hall.nearProps = [];
    for (let i = 0; i < 16; i++) {
      const x = -15 + i * 2 + (R() - 0.5) * 0.9, z = nz + 0.6 + R() * 0.7, k = i % 4, g = new T.Group(); g.position.set(x, 1.05 + R() * 0.25, z); root.add(g);
      if (k === 0 || k === 2) {
        const c = R() < 0.5 ? '#ff9a3a' : '#4aa8ff', f = mk(box(0.34, 0.5, 0.08), flat(c, 1.2), { ink: INK, inkW: 0.6 }); g.add(f);
        const up = mk(box(0.1, 0.32, 0.08), flat(c, 1.2), { ink: INK, inkW: 0.6 }); up.position.set(0.05, 0.4, 0); g.add(up);
      } else if (k === 1) {
        const c = pick(['#5aff8a', '#ff5ad6', '#4ae8ff', '#ffe24a']), s2 = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.42, 6), own(c, 2.4)); s2.rotation.z = 0.5; g.add(s2);
        Gw.add(x, g.position.y, z, 0.5, c, 0.35);
      } else {
        const ph = mk(box(0.2, 0.34, 0.03), toon('#1a1820'), { ink: INK, inkW: 0.5 }); g.add(ph);
        const scr = new T.Mesh(new T.PlaneGeometry(0.16, 0.28), own('#c8e8ff', 1.3)); scr.position.z = -0.02; scr.rotation.y = Math.PI; g.add(scr);
        L.add(x - 0.05, g.position.y + 0.12, z + 0.02, '#ffffff', { size: 0.03, blink: 1, speed: 0.7 });
      }
      hall.nearProps.push({ g, y0: g.position.y, ph: R() * 6, k });
    }
  }

  /* ---------- the ceiling: trusses, moving lamps sweeping beams through the haze, the mirror ball, smoke machines ---------- */
  function buildCeiling(K, root, still, hall, L, Gw) {
    const cy = 9.6, trussM = toon('#4a4656');
    const truss = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(z1 - z0, x1 - x0), g = new T.Group(); g.position.set((x0 + x1) / 2, cy, (z0 + z1) / 2); g.rotation.y = -a; still.add(g);
      for (const [y, z] of [[0, -0.25], [0, 0.25], [0.45, 0]]) { const b = mk(new T.CylinderGeometry(0.04, 0.04, len, 6).rotateZ(Math.PI / 2), trussM, { ink: INK, inkW: 0.4 }); b.position.set(0, y, z); g.add(b); }
      for (let k = -len / 2; k < len / 2; k += 0.6) { const d = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.6, 4), trussM); d.position.set(k + 0.3, 0.22, 0); d.rotation.z = 0.8; g.add(d); }
    };
    truss(-15, -5, 15, -5); truss(-15, 2.5, 15, 2.5); truss(-7.5, -8, -7.5, 6); truss(7.5, -8, 7.5, 6);
    const beamGeo = new T.CylinderGeometry(0.05, 1.4, 1, 20, 1, true).translate(0, -0.5, 0);
    hall.heads = [];
    const spots = [[-12, -5], [-6, -5], [0, -5], [6, -5], [12, -5], [-10, 2.5], [-3.5, 2.5], [3.5, 2.5], [10, 2.5]];
    spots.forEach(([x, z], i) => {
      const g = new T.Group(); g.position.set(x, cy - 0.2, z); root.add(g);
      const yoke = mk(new T.TorusGeometry(0.22, 0.04, 6, 12, Math.PI), toon('#2a2630'), { ink: INK, inkW: 0.4 }); yoke.rotation.x = Math.PI; g.add(yoke);
      const head = new T.Group(); head.position.y = -0.2; g.add(head);
      const hb = mk(new T.CylinderGeometry(0.16, 0.2, 0.4, 12), toon('#1a1820'), { ink: INK, inkW: 0.5 }); hb.position.y = -0.1; head.add(hb);
      const col = ARCADE.NEON[i % 6];
      const lens = new T.Mesh(new T.CircleGeometry(0.15, 14), new T.MeshBasicMaterial({ color: new T.Color(col).multiplyScalar(2.6), toneMapped: false })); lens.rotation.x = Math.PI / 2; lens.position.y = -0.31; head.add(lens);
      const bm = new T.ShaderMaterial({ uniforms: { uC: { value: new T.Color(col).multiplyScalar(0.2) }, uK: { value: 1 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
        vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main() { vY = -position.y; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform vec3 uC; uniform float uK; varying float vY; varying vec3 vN; varying vec3 vV; void main() { float e = pow(abs(dot(vN, vV)), 1.4); float f = (1.0 - vY * 0.85) * smoothstep(0.0, 0.05, vY); gl_FragColor = vec4(uC * uK * e * f, 1.0); }' });
      const beam = new T.Mesh(beamGeo, bm); beam.scale.set(1, 11, 1); beam.position.y = -0.3; beam.renderOrder = 4; beam.frustumCulled = false; head.add(beam);
      hall.heads.push({ g, head, bm, lens, col, ph: i * 1.7, x, z });
    });
    // the mirror ball over the middle (its dots of light sweep slowly over everything: the update moves them)
    const facets = K3D.paint('al-ball', 256, 128, (c, w, h) => { for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { const v = 120 + Math.random() * 135; c.fillStyle = `rgb(${v},${v},${v + 10})`; c.fillRect(x, y, 7, 7); } });
    const ball = new T.Mesh(new T.SphereGeometry(0.5, 32, 20), new T.MeshBasicMaterial({ map: facets, toneMapped: false, color: new T.Color(1.3, 1.3, 1.4) }));
    ball.position.set(0, 7.6, -3.4); root.add(ball); hall.ball = ball;
    const chain = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, cy - 8.1, 4), toon('#9a96a2')); chain.position.set(0, (cy + 8.1) / 2, -3.4); root.add(chain);
    Gw.add(0, 7.6, -3.4, 2.2, '#ffffff', 0.3);
    // the dots are soft flat spots laid on whatever they land on (the floor, the gallery glass, the walls)
    hall.dots = []; const NDOT = 150;
    const spotTex = K3D.paint('al-spot', 64, 64, (c, w, h) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    const spotM = new T.MeshBasicMaterial({ map: spotTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, color: new T.Color(0.9, 0.9, 0.9) });
    const spotMesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), spotM, NDOT); spotMesh.frustumCulled = false; spotMesh.renderOrder = 3; root.add(spotMesh);
    for (let i = 0; i < NDOT; i++) { const th = Math.acos(1 - 2 * (i + 0.5) / NDOT), ph = i * 2.39996; hall.dots.push({ v: [Math.sin(th) * Math.cos(ph), -Math.abs(Math.cos(th)) * 0.9 - 0.1, Math.sin(th) * Math.sin(ph)] }); spotMesh.setColorAt(i, new T.Color(pick(['#ffffff', '#fff0b0', '#c8f0ff']))); }
    hall.spots = spotMesh; hall.spotM = spotM;
    // smoke machines in the far corners of the walkway
    hall.smokers = [];
    for (const sx of [-1, 1]) {
      const x = sx * (EX + 1.0), z = -EZ - 0.5;
      const m = mk(box(0.8, 0.45, 0.55), toon('#3a3a42'), { ink: INK }); m.position.set(x, 0.23, z); still.add(m);
      const noz = mk(new T.CylinderGeometry(0.07, 0.09, 0.2, 10).rotateZ(Math.PI / 2), toon('#1a1820'), { ink: INK, inkW: 0.4 }); noz.position.set(x - sx * 0.48, 0.28, z); still.add(noz);
      L.add(x + 0.25, 0.42, z + 0.28, '#ff3a3a', { size: 0.035, blink: 1, speed: 1 });
      const lbl = board('FOG 3000', 0.5, 0.16, { bg: '#1a1820', col: '#c8c0d0', frame: false }); lbl.position.set(x, 0.25, z + 0.28); root.add(lbl);
      hall.smokers.push({ x: x - sx * 0.6, z, dir: -sx });
    }
  }

  /* ---------- the scoreboard: an old dot-matrix and bulb board set in the gallery's front wall ---------- */
  function buildScoreboard(K, root, still, hall, L, Gw) {
    const W2 = 8.0, H2 = 1.3;
    const g = new T.Group(); g.position.set(0, 0.78, GZ + 0.5); g.rotation.x = -0.5; root.add(g);
    const shell = mk(box(W2 + 0.4, H2 + 0.36, 0.45), toon('#2a2430', { map: ARCADE.grimeTex() }), { ink: INK }); shell.position.z = -0.24; g.add(shell);
    // a stand under it (the board leans back on two struts against the gallery wall)
    for (const sx of [-1, 1]) { const s = mk(box(0.14, 0.9, 0.14), toon('#3a3442'), { ink: INK, inkW: 0.5 }); s.position.set(sx * (W2 / 2 - 0.4), 0.45, GZ + 0.35); still.add(s); }
    const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 260;
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
    const face = new T.Mesh(new T.PlaneGeometry(W2, H2), new T.MeshBasicMaterial({ map: tex, toneMapped: false, color: new T.Color(1.9, 1.9, 1.9) })); face.position.z = 0.01; g.add(face);
    // bulbs round the frame (a few dead ones), a cable sagging off to a junction box on the wall
    const per = [];
    for (let k = 0; k <= 36; k++) { per.push([-W2 / 2 - 0.1 + (W2 + 0.2) * k / 36, H2 / 2 + 0.1]); per.push([-W2 / 2 - 0.1 + (W2 + 0.2) * k / 36, -H2 / 2 - 0.1]); }
    for (let k = 1; k < 5; k++) { per.push([-W2 / 2 - 0.1, -H2 / 2 - 0.1 + (H2 + 0.2) * k / 5]); per.push([W2 / 2 + 0.1, -H2 / 2 - 0.1 + (H2 + 0.2) * k / 5]); }
    const v = new T.Vector3();
    g.updateMatrixWorld(true);
    per.forEach(([x, y], i) => { const dead = i % 17 === 5 || i === 40; v.set(x, y, 0.06).applyMatrix4(g.matrixWorld); L.add(v.x, v.y, v.z, dead ? '#3a3030' : '#ffe2a0', { size: 0.065, speed: dead ? 0 : 6, blink: dead ? 0 : 0.35, phase: i * 0.4 }); });
    const sag = []; for (let k = 0; k <= 14; k++) { const t = k / 14; sag.push(new T.Vector3(W2 / 2 + 0.2 + t * 3.4, 0.9 - Math.sin(t * Math.PI) * 0.65 + t * 0.6, GZ + 0.35 - t * 0.2)); }
    root.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(sag), 30, 0.035, 5), toon('#1a1820')));
    const jb = mk(box(0.4, 0.5, 0.15), toon('#5a5662'), { ink: INK, inkW: 0.5 }); jb.position.set(W2 / 2 + 3.7, 1.55, GZ + 0.08); still.add(jb);
    const tape = new T.Mesh(box(0.5, 0.06, 0.02), toon('#e8c83a')); tape.position.set(W2 / 2 + 3.7, 1.62, GZ + 0.17); tape.rotation.z = 0.3; root.add(tape);
    // the flip-number round counter on the left end
    const flip = new T.Group(); flip.position.set(-W2 / 2 - 0.75, 0, -0.1); g.add(flip);
    const fb = mk(box(0.95, 1.2, 0.4), toon('#1a1820'), { ink: INK }); flip.add(fb);
    const fcv = document.createElement('canvas'); fcv.width = 128; fcv.height = 160; const ftex = new T.CanvasTexture(fcv); ftex.colorSpace = T.SRGBColorSpace;
    const ff = new T.Mesh(new T.PlaneGeometry(0.78, 0.96), new T.MeshBasicMaterial({ map: ftex, toneMapped: false, color: new T.Color(1.2, 1.2, 1.2) })); ff.position.z = 0.21; flip.add(ff);
    const rl = board('ROUND', 0.8, 0.2, { bg: '#1a1820', col: '#fff0b0', frame: false, k: 1.2 }); rl.position.set(0, 0.72, 0.21); flip.add(rl);
    hall.sb = { g, cv, tex, fcv, ftex, key: '', fkey: '', W2, H2, msg: '', msgT: -9 };
  }
  // the board's face: each player's name, five tag lamps and three round stars, the clock and a message in the middle
  // the scoreboard's 5 x 7 bulb font (each glyph: seven rows, five bits each, as hex pairs)
  const DOTS = (() => { const src = { 'A': '0E11111F111111', 'B': '1E11111E11111E', 'C': '0E11101010110E', 'D': '1E11111111111E', 'E': '1F10101E10101F', 'F': '1F10101E101010', 'G': '0E11101711110F', 'H': '1111111F111111', 'I': '0E04040404040E', 'J': '0702020202120C', 'K': '11121418141211', 'L': '1010101010101F', 'M': '111B1515111111', 'N': '11111915131111', 'O': '0E11111111110E', 'P': '1E11111E101010', 'Q': '0E11111115120D', 'R': '1E11111E141211', 'S': '0F10100E01011E', 'T': '1F040404040404', 'U': '1111111111110E', 'V': '11111111110A04', 'W': '1111111515150A', 'X': '11110A040A1111', 'Y': '1111110A040404', 'Z': '1F01020408101F', '0': '0E11131519110E', '1': '040C040404040E', '2': '0E11010204081F', '3': '1F02040201110E', '4': '02060A121F0202', '5': '1F101E0101110E', '6': '0608101E11110E', '7': '1F010204080808', '8': '0E11110E11110E', '9': '0E11110F01020C', ':': '000C0C000C0C00', '!': '04040404040004', '-': '0000001F000000', '\'': '04040800000000', '.': '00000000000C0C', ' ': '00000000000000' }, o = {}; for (const k in src) o[k] = src[k].match(/../g).map(h => parseInt(h, 16)); return o; })();
  function drawBoard(sb, st, mood) {
    const hs = st.heroes, secs = Math.max(0, Math.ceil(75 - st.rt)), ph = st.phase;
    let msg = '';
    if (ph === 'open') msg = 'WELCOME TO ZAP MAZE'; else if (ph === 'count') msg = st.count >= 1 ? 'GET READY' : 'ZAP!';
    else if (ph === 'gold') msg = 'NEXT TAG WINS'; else if (ph === 'between') msg = 'ROUND ' + st.roundNo + ' ' + ARCADELASER_ARENA.ROUND_NAMES[st.round].toUpperCase();
    else if (ph === 'won' || ph === 'final') msg = st.roundWinner >= 0 ? NAMES[st.roundWinner].toUpperCase() + ' WINS' : 'NO TAG';
    else msg = ARCADELASER_ARENA.ROUND_NAMES[st.round].toUpperCase();
    if (sb.msgT > st.t - 1.6 && sb.msg) msg = sb.msg.toUpperCase();
    const blink = Math.floor((mood.clock || 0) * 3) % 2;
    const key = [hs[0].tags, hs[1].tags, st.wins[0], st.wins[1], ph === 'live' ? secs : ph === 'count' ? st.count : '-', msg, ph === 'gold' ? blink : 0, st.round].join('|');
    if (key === sb.key) return;
    sb.key = key;
    const c = sb.cv.getContext('2d'), w = sb.cv.width, h = sb.cv.height;
    c.fillStyle = '#0c0a10'; c.fillRect(0, 0, w, h);
    for (let y = 5; y < h; y += 10) for (let x = 5; x < w; x += 10) { c.fillStyle = '#1e1a24'; c.beginPath(); c.arc(x, y, 3.4, 0, Math.PI * 2); c.fill(); }
    // bulb lettering from a 5 x 7 dot font, size = the height in bulbs' worth (the pitch grows with it)
    const lit = (txt, cx, cy, size, col, maxW = 1e9) => {
      let pp = size / 7 * 10; pp = Math.min(pp, maxW / (txt.length * 6));
      const x0 = cx - txt.length * 6 * pp / 2 + pp / 2, y0 = cy - 3 * pp;
      c.fillStyle = col;
      for (let n = 0; n < txt.length; n++) { const gl = DOTS[txt[n]] || DOTS[' ']; for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (gl[y] & (16 >> x)) { c.beginPath(); c.arc(x0 + (n * 6 + x) * pp, y0 + y * pp, pp * 0.42, 0, Math.PI * 2); c.fill(); } }
    };
    for (const k of [0, 1]) {
      const left = k === 0, col = k ? '#7ac8ff' : '#ffb070';
      lit(NAMES[k].toUpperCase(), left ? 110 : w - 110, 66, 9, col);
      for (let i = 0; i < 5; i++) {
        const lx = left ? 230 + i * 64 : w - 230 - i * 64, on = i < hs[k].tags;
        const gr = c.createRadialGradient(lx, 70, 2, lx, 70, 28); gr.addColorStop(0, on ? '#ffffff' : '#2a2430'); gr.addColorStop(0.4, on ? col : '#221e28'); gr.addColorStop(1, on ? 'rgba(0,0,0,0)' : '#18141c');
        c.fillStyle = gr; c.beginPath(); c.arc(lx, 70, 27, 0, Math.PI * 2); c.fill();
      }
      for (let i = 0; i < 3; i++) {
        const sx = left ? 70 + i * 52 : w - 70 - i * 52, on = i < st.wins[k];
        c.fillStyle = on ? '#ffe24a' : '#2a2430'; c.beginPath(); for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, r = j % 2 ? 9 : 22; c.lineTo(sx + Math.cos(a) * r, 180 + Math.sin(a) * r); } c.closePath(); c.fill();
      }
      lit(left ? 'P1' : 'P2', left ? 380 : w - 380, 186, 5, col);
    }
    lit(ph === 'live' ? (Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0')) : ph === 'gold' ? '0:00' : '1:15', w / 2, 66, 10, ph === 'gold' && blink ? '#ffe24a' : '#7affd8');
    if (msg) lit(msg.slice(0, 22), w / 2, 186, 7, ph === 'gold' ? '#ffe24a' : '#ff8ad6', 620);
    sb.tex.needsUpdate = true;
    const fk = String(st.roundNo);
    if (fk !== sb.fkey) {
      sb.fkey = fk; const f = sb.fcv.getContext('2d');
      f.fillStyle = '#e8e2d4'; f.fillRect(0, 0, 128, 160); f.fillStyle = '#1a1820'; f.fillRect(0, 78, 128, 4);
      f.font = '900 120px "DejaVu Sans", sans-serif'; f.textAlign = 'center'; f.textBaseline = 'middle'; f.fillStyle = '#1a1820'; f.fillText(fk, 64, 86);
      sb.ftex.needsUpdate = true;
    }
  }

  /* ---------- haze: layers of drifting fog (the beams light it) ---------- */
  function buildHaze(K, root, hall) {
    hall.haze = [];
    const mk2 = (y, sc, col, k, seed, sz) => {
      const tex = PT.haze(seed); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(sc, sc * 0.6);
      const m = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, color: new T.Color(col).multiplyScalar(k) });
      const p = new T.Mesh(new T.PlaneGeometry(sz[0], sz[1]).rotateX(-Math.PI / 2), m); p.position.set(0, y, -1.5); p.renderOrder = 6; root.add(p);
      hall.haze.push({ m, tex, base: k, col: new T.Color(col), sp: [0.004 + R() * 0.006, 0.002 + R() * 0.004] });
    };
    mk2(0.15, 2.4, '#9a7aff', 0.24, 1, [36, 24]); mk2(0.7, 2, '#7affd8', 0.1, 2, [36, 24]); mk2(1.6, 1.6, '#ff8ad6', 0.08, 3, [36, 24]); mk2(3.0, 1.3, '#b48aff', 0.06, 4, [36, 24]);
    hall.puffs = [];
    const pt = PT.haze(9);
    for (let i = 0; i < 16; i++) { const m = new T.Sprite(new T.SpriteMaterial({ map: pt, transparent: true, depthWrite: false, blending: T.AdditiveBlending, color: new T.Color('#c8b0ff').multiplyScalar(0.4), opacity: 0 })); m.renderOrder = 6; root.add(m); hall.puffs.push({ m, t: 99, sm: 0 }); }
  }

  /* ---------- the story actors ---------- */
  function buildStories(K, root, hall) {
    // the mopper on the left walkway (bucket, mop, a WET FLOOR sign) who keeps getting caught in the crossfire
    const mx = -EX - 0.95, mz = -1.0;
    const mop = H.actor(K, { col: '#7affd8', s: 0.5 }); mop.position.set(mx, 0, mz); root.add(mop);
    const stick = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 1.1, 6), toon('#c8a060')); stick.position.set(0.32, 0.5, 0.25); stick.rotation.x = 0.6; mop.add(stick);
    const head = new T.Mesh(new T.CylinderGeometry(0.11, 0.15, 0.11, 10), toon('#e8e2d4')); head.position.set(0.32, 0.05, 0.56); mop.add(head);
    const bucket = mk(new T.CylinderGeometry(0.2, 0.16, 0.32, 14), toon('#e8c83a'), { ink: INK, inkW: 0.6 }); bucket.position.set(mx - 0.4, 0.16, mz + 1.6); root.add(bucket);
    const wf = new T.Group(); wf.position.set(mx - 0.3, 0, mz - 1.5); wf.rotation.y = 0.6; root.add(wf);
    for (const s of [-1, 1]) { const pl = mk(box(0.42, 0.65, 0.03), toon('#ffe24a'), { ink: INK, inkW: 0.5 }); pl.position.set(0, 0.31, s * 0.1); pl.rotation.x = s * 0.3; wf.add(pl); }
    const wft = board('WET\nFLOOR', 0.34, 0.34, { bg: '#ffe24a', col: '#1a1820', frame: false }); wft.position.set(0, 0.36, 0.21); wft.rotation.x = 0.3; wf.add(wft);
    hall.stories.mop = { a: mop, x0: mx, z0: mz, shake: 0 };
    // the tray carrier: sneaks along the far walkway between rounds with a tray of drinks
    const tray = H.actor(K, { col: '#ffe24a', s: 0.45 }); root.add(tray);
    const tr = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 0.03, 14), toon('#c8c0d0')); tr.position.set(0, 0.58, 0.24); tray.add(tr);
    for (let k = 0; k < 3; k++) { const cup = new T.Mesh(new T.CylinderGeometry(0.045, 0.035, 0.11, 8), flat(['#5aff8a', '#ff5ad6', '#4ae8ff'][k], 1.3)); cup.position.set(-0.11 + k * 0.11, 0.65, 0.24); tray.add(cup); }
    hall.stories.tray = { a: tray, t: 0 };
    // two rival fans in the front row (an orange scarf, a blue one) who end up sharing popcorn
    const f1 = H.actor(K, { col: '#ffe24a', s: 0.42 }), f2 = H.actor(K, { col: '#b48aff', s: 0.42 });
    const r0z = GZ - 0.55, r0y = 0.7;
    for (const [f, x, col] of [[f1, -2.6, '#ff9a3a'], [f2, -1.8, '#4aa8ff']]) { f.position.set(x, r0y, r0z); root.add(f); const sc = new T.Mesh(box(0.46, 0.08, 0.38), toon(col)); sc.position.y = 0.3; f.add(sc); }
    const pop = mk(new T.CylinderGeometry(0.1, 0.075, 0.19, 10), toon('#f8f2e4'), { ink: INK, inkW: 0.5 }); pop.position.set(-2.2, r0y + 0.25, r0z + 0.15); root.add(pop);
    hall.stories.rivals = { f1, f2, pop, x0: -2.2 };
    // the lost balloon from the party, drifting up past the gallery
    const lb = mk(new T.SphereGeometry(0.2, 14, 10), toon('#ff9ad6'), { ink: INK, inkW: 0.6 }); lb.scale.y = 1.2; root.add(lb);
    const ls = new T.Mesh(box(0.008, 0.8, 0.008), toon('#ffffff')); root.add(ls);
    hall.stories.lost = { b: lb, s: ls };
    // a creature with a camera on a stick, a school trip in matching caps, a toddler asleep on a parent's shoulder
    const cam = H.actor(K, { col: '#5aff8a', s: 0.42 }); cam.position.set(4.6, 0.7 + 0.42, GZ - 1.35); root.add(cam);
    const cs = new T.Mesh(box(0.03, 0.8, 0.03), toon('#2a2630')); cs.position.set(0.25, 0.7, 0.2); cs.rotation.z = -0.4; cam.add(cs);
    const cb = new T.Mesh(box(0.15, 0.11, 0.08), toon('#1a1820')); cb.position.set(0.41, 1.07, 0.2); cam.add(cb);
    const lensL = new T.Mesh(new T.SphereGeometry(0.03, 6, 4), flat('#ff3a3a', 2)); lensL.position.set(0.41, 1.07, 0.25); cam.add(lensL);
    hall.stories.camera = cam;
    hall.stories.trip = [];
    for (let k = 0; k < 6; k++) { const t2 = H.actor(K, { col: pick(['#7affd8', '#ffe24a', '#ff9ad6']), s: 0.34, cap: '#ff5ad6' }); t2.position.set(-7.6 + k * 0.42, 0.7, GZ - 0.55); root.add(t2); hall.stories.trip.push(t2); }
    const teacher = H.actor(K, { col: '#b48aff', s: 0.46, hat: '#ff5ad6' }); teacher.position.set(-5.0, 0.7, GZ - 0.6); root.add(teacher); hall.stories.trip.push(teacher);
    const parent = H.actor(K, { col: '#ffe24a', s: 0.48 }); parent.position.set(6.6, 0.7 + 0.84, GZ - 2.15); root.add(parent);
    const tot = H.actor(K, { col: '#ff9ad6', s: 0.26 }); tot.position.set(0.18, 0.78 * 0.48, 0.05); tot.rotation.z = -0.5; parent.add(tot);
    hall.stories.tot = { parent, tot };
  }

  /* ---------- each drawn frame ---------- */
  function update(hall, K, st, dt, mood) {
    const t = (hall.t = (hall.t || 0) + dt), dark = mood.dark || 0, gold = mood.gold || 0;
    hall.crowd.react({ hero: mood.hero, cheer: mood.cheer, duck: 99 });
    hall.nearCrowd.react({ hero: mood.hero, cheer: mood.cheer });
    for (const p of hall.nearProps) { const up = mood.cheer < 1.5 ? 0.25 * (1 - mood.cheer / 1.5) : 0; p.g.position.y = p.y0 + Math.sin(t * 2.2 + p.ph) * 0.06 + up; p.g.rotation.z = Math.sin(t * (p.k === 1 ? 3 : 1.6) + p.ph) * (p.k === 1 ? 0.6 : 0.15); }
    for (const s of hall.signs) {
      const up = Math.max(0, 1 - mood.cheer / 1.5) * 0.22;
      s.m.position.y = s.y + Math.sin(t * 2 + s.ph) * 0.05 + up * Math.abs(Math.sin(t * 9 + s.ph)); s.m.rotation.z = Math.sin(t * 1.3 + s.ph) * 0.1;
      if (s.s) { s.s.position.y = s.m.position.y - 0.38; s.s.rotation.z = s.m.rotation.z; }
    }
    // the moving lamps sweep (Blackout: almost nothing; next tag wins: gold)
    for (const h of hall.heads) {
      const a = t * 0.35 + h.ph, b = t * 0.27 + h.ph * 1.3;
      h.head.rotation.set(Math.sin(a) * 0.5, 0, Math.cos(b) * 0.42);
      h.bm.uniforms.uK.value = (1 - dark * 0.92) * (mood.round >= 5 ? 1.25 : 1);
      h.bm.uniforms.uC.value.set(gold ? '#ffd23a' : h.col).multiplyScalar(0.13);
    }
    // the mirror ball turns; its dots sweep over the floor, the gallery and the walls
    hall.ball.rotation.y = t * 0.3;
    const bp = hall.ball.position, ca = Math.cos(t * 0.3), sa = Math.sin(t * 0.3);
    hall.dots.forEach((d, i) => {
      const vx = d.v[0] * ca - d.v[2] * sa, vz = d.v[0] * sa + d.v[2] * ca, vy = d.v[1];
      let tt = (0.012 - bp.y) / vy, face = 0;
      const tx = vx > 0 ? (SX - 0.12 - bp.x) / vx : vx < 0 ? (-SX + 0.12 - bp.x) / vx : 1e9;
      let tz = 1e9; if (vz < 0) { const t1 = (GZ + 0.08 - bp.z) / vz, x1 = bp.x + vx * t1; tz = Math.abs(x1) < GX ? t1 : (BW + 0.08 - bp.z) / vz; }
      if (tx < tt) { tt = tx; face = 1; } if (tz < tt) { tt = tz; face = 2; }
      // a spot lands stretched along the way the light comes in, more so the flatter it strikes
      const n = face === 0 ? -vy : face === 1 ? Math.abs(vx) : -vz, st = Math.min(2.2, 1 / Math.max(0.3, n));
      dum.position.set(bp.x + vx * tt, bp.y + vy * tt, bp.z + vz * tt);
      if (face === 0) dum.rotation.set(-Math.PI / 2, 0, -Math.atan2(vz, vx)); else if (face === 1) dum.rotation.set(0, vx > 0 ? -Math.PI / 2 : Math.PI / 2, 0); else dum.rotation.set(0, 0, 0);
      dum.scale.set(0.3 * st, 0.3, 1); dum.updateMatrix(); hall.spots.setMatrixAt(i, dum.matrix);
    });
    hall.spots.instanceMatrix.needsUpdate = true; hall.spotM.color.setScalar(0.9 * (1 - dark * 0.5));
    const mkk = 1.0 + dark * 0.35;
    for (const m of hall.murals) m.color.setScalar(mkk * 1.1);
    for (const tb of hall.tubes) tb.color.set(gold ? '#ffd23a' : '#9a5aff').multiplyScalar(2.2 + Math.sin(t * 2) * 0.2);
    hall.washM.color.set(gold ? '#ffb83a' : '#7a3aff').multiplyScalar((0.55 + Math.sin(t * 2) * 0.05) * (1 + dark * 0.3));
    for (const n of hall.barrierNeon) n.color.set(gold ? '#ffd23a' : mood.round >= 4 ? '#5aff8a' : '#ff5ad6').multiplyScalar(2.4);
    hall.floorGlow.color.setScalar(1 + dark * 0.4);
    hall.galLight.intensity = 14 * (1 - dark * 0.55);
    for (const z of hall.haze) { z.tex.offset.x += z.sp[0] * dt * 10; z.tex.offset.y += z.sp[1] * dt * 10; z.m.color.copy(z.col).multiplyScalar(z.base * (1 + dark * 0.9 + (mood.round >= 5 ? 0.4 : 0))); }
    // the smoke machines puff on the beat (harder in Blackout)
    hall.puffT = (hall.puffT || 0) - dt;
    if (hall.puffT <= 0) {
      hall.puffT = 7.5 / (1 + dark * 2);
      for (const sm of hall.smokers) { const p = hall.puffs.find(q => q.t > 3); if (p) { p.t = 0; p.sm = sm; p.v = 1.2 + R() * 0.5; } }
    }
    for (const p of hall.puffs) {
      if (p.t > 3) { p.m.material.opacity = 0; continue; }
      p.t += dt; const k = p.t / 3, sm = p.sm;
      p.m.position.set(sm.x + sm.dir * p.v * p.t * 1.4, 0.35 + p.t * 0.22, sm.z + p.t * 0.5);
      p.m.scale.setScalar(0.5 + k * 3.0); p.m.material.opacity = Math.sin(Math.min(1, k) * Math.PI) * 0.85;
    }
    if (mood.say) { hall.sb.msg = mood.say; hall.sb.msgT = st.t; }
    drawBoard(hall.sb, st, mood);
    // the little stories
    const S2 = hall.stories;
    const mp = S2.mop; mp.shake = Math.max(0, mp.shake - dt);
    if (mood.nearMop) mp.shake = 1.4;
    mp.a.position.z = mp.z0 + Math.sin(t * 0.4) * 0.9; mp.a.rotation.y = Math.sin(t * 0.4) > 0 ? Math.PI / 2 + 0.6 : Math.PI / 2 - 0.6;
    H.pose(mp.a, mp.shake > 0 ? 'shake' : 'mop', dt);
    // the tray carrier: along the far walkway while the arena rebuilds, then gone
    const tr = S2.tray;
    if (st.phase === 'between') tr.t = Math.min(1, tr.t + dt / 4.8); else if (tr.t > 0 && tr.t < 1) tr.t = Math.min(1, tr.t + dt / 1.0); else if (st.phase === 'live') tr.t = 0;
    const tk = tr.t;
    tr.a.position.set(-EX - 0.4 + tk * (EX * 2 + 0.8), 0, -EZ - 0.62); tr.a.rotation.y = Math.PI / 2; tr.a.visible = tk > 0 && tk < 1;
    H.pose(tr.a, 'walk', dt, 1.3);
    for (const f of S2.cake.flames) { f.visible = mood.round >= 3; f.scale.y = 1.4 + Math.sin(t * 13 + f.position.x * 40) * 0.3; }
    for (const g of S2.guests) H.pose(g, mood.round >= 3 && Math.sin(t * 0.7 + g.position.z) > 0.3 ? 'cheer' : 'idle', dt);
    for (const b of S2.balloons) { b.b.position.y = b.y + Math.sin(t * 1.1 + b.ph) * 0.08; b.str.position.y = b.b.position.y - 0.72; }
    // the referee: waves at a tag, nods off in Blackout; lifts the trophy at the end
    const rf = S2.ref; rf.zz.visible = dark > 0.5;
    H.pose(rf.ref, dark > 0.5 ? 'sleep' : mood.cheer < 0.8 ? 'wave' : 'idle', dt);
    rf.ref.rotation.y = dark > 0.5 ? 0 : Math.sin(t * 0.5) * 0.3;
    rf.zz.position.y = 1.05 + (t * 0.3) % 0.4;
    rf.trophy.rotation.y = t * 0.6;
    for (const v of S2.vesters) H.pose(v, 'shake', dt, 0.6);
    H.pose(S2.wisher, Math.sin(t * 0.6) > 0 ? 'wave' : 'idle', dt);
    H.pose(S2.cook.cook, 'mop', dt, 0.8);
    S2.cook.cakeP.position.y = 1.19 + Math.max(0, Math.sin(t * 2.2)) * 0.45; S2.cook.cakeP.rotation.x = Math.max(0, Math.sin(t * 2.2)) * Math.PI * 2;
    for (const p of S2.pops) p.p.position.y = p.y + Math.abs(Math.sin(t * 6 + p.ph)) * 0.22;
    H.pose(S2.camera, 'idle', dt); S2.camera.rotation.y = Math.sin(t * 0.4) * 0.5;
    for (const c of S2.trip) H.pose(c, mood.cheer < 1.2 ? 'cheer' : 'wave', dt, 0.8);
    H.pose(S2.tot.parent, mood.cheer < 1 ? 'wave' : 'idle', dt); H.pose(S2.tot.tot, 'sleep', dt);
    const rv = S2.rivals, share = mood.round >= 4;
    rv.f1.rotation.y = share ? 0.5 : -0.4; rv.f2.rotation.y = share ? -0.5 : 0.4;
    H.pose(rv.f1, share && Math.sin(t * 1.4) > 0.6 ? 'mop' : mood.cheer < 1 && mood.lastTagger === 0 ? 'cheer' : 'idle', dt);
    H.pose(rv.f2, share && Math.sin(t * 1.4 + 2) > 0.6 ? 'mop' : mood.cheer < 1 && mood.lastTagger === 1 ? 'cheer' : 'idle', dt);
    rv.pop.position.x = share ? rv.x0 : rv.x0 - 0.55;
    const lb = S2.lost, lt = (t * 0.045) % 1;
    lb.b.position.set(GX + 2.9 - lt * 6 + Math.sin(t * 0.7) * 0.8, 1.6 + lt * 8.5, BW + 0.6 + lt * 2); lb.s.position.set(lb.b.position.x, lb.b.position.y - 0.6, lb.b.position.z);
  }
  return H;
})();
