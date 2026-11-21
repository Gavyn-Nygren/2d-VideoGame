/* Pip & Bo - 43-2 Pinball Panic: the life of the table (PINBALL_LIFE). Loaded on demand with the 3D kit, after
   pinball-scene.js, which calls PINBALL_LIFE.build(K, SC, kit) at the end of its build and PINBALL_LIFE.update(K, SC,
   st, dt, ballPositions) every drawn frame. Scenery only.

   Comet Carnival's town: the pixel creatures (ARCADE.critters) run the table as a fairground. They turn to watch the
   heroes, cheer when a gate opens, duck when a bumper or flipper fires, and run from loose silver balls.

   PART 1, THE FLIPPER FIELD (finished for the look gate):
     the painted apron     the rules card, the price card, and under it a service card with a pencilled high score
     the ticket stall      against the left slingshot: striped awning, a roller shutter its creature raises at the
                           start, a roll of tickets, a till, bulbs round the awning, a queue
     the popcorn stall     against the right slingshot: a popcorn machine popping, paper cones, a shutter going up
     the ticket booth      on the left shoulder: a round window with a creature inside, a queue held by a rope
     the chair ride        on the right shoulder: a ride made from a spinning post (chairs on chains), its queue
     the dark alleys       the outlanes: brick walls, warning beacons, DRAIN signs, a creature fishing at the edge
     bunting and balloons  strung between the posts along the shoulders; balloons tied to the rail posts
     the comet slide       on the right shoulder by the twin flippers: a striped tower with a slide spiralling round
                           it, creatures riding mats down and running back to the door
     planet toss           on the left shoulder: a game stall, rings thrown over planets on pegs, prizes on the wall
     lost things           things that fell through the glass: a giant paper clip, a ticket stub, a gum wrapper, a
                           foreign coin, a moth, a hair clip
   Little stories (part 1): the creature whose hat is knocked off by every passing ball; the sweeper who dives for
   cover when a great flipper fires; the painter touching up a star who gets rolled over and leaves footprints; the
   couple on a date on the chair ride; the small one who follows the heroes up the whole table (and is in the crowd at
   the end); the bulb that pops and the creature who comes with a ladder to change it; a school trip pointing at the
   heroes; the creature fishing in the alley; the stall keepers raising their shutters.
   PARTS 2 to 4: their creatures and stories come after the look gate (Gavyn's okay); the backboard's crowd is here. */
'use strict';

const PINBALL_LIFE = (function () {
  const T = K3D.T, TB = PINBALL_TABLE, A = ARCADE;
  const L = {};
  let kit = null;

  // a blocky creature as a little group of cubes (for the story creatures that need their own animation)
  function guy(col, o = {}) {
    const g = new T.Group(), s = o.s || 1;
    const bodyM = A.flatM(col, 1.15), darkM = A.flatM(col, 0.55), eyeM = A.flatM('#f8f4ea', 1.1), pupM = A.flatM('#16121a', 1);
    const box = (w, h, d, x, y, z, m, par = g) => { const b = new T.Mesh(K3D.geo('pl-box', () => new T.BoxGeometry(1, 1, 1)), m); b.scale.set(w * s, h * s, d * s); b.position.set(x * s, y * s, z * s); par.add(b); return b; };
    const body = new T.Group(); g.add(body);
    box(0.42, 0.36, 0.34, 0, 0.3, 0, bodyM, body);
    box(0.11, 0.12, 0.02, -0.09, 0.34, 0.175, eyeM, body); box(0.11, 0.12, 0.02, 0.09, 0.34, 0.175, eyeM, body);
    box(0.05, 0.06, 0.02, -0.09, 0.33, 0.19, pupM, body); box(0.05, 0.06, 0.02, 0.09, 0.33, 0.19, pupM, body);
    const legL = box(0.09, 0.12, 0.1, -0.1, 0.06, 0, darkM), legR = box(0.09, 0.12, 0.1, 0.1, 0.06, 0, darkM);
    const armL = new T.Group(); armL.position.set(-0.25 * s, 0.38 * s, 0); body.add(armL); box(0.07, 0.18, 0.07, 0, -0.09, 0, darkM, armL);
    const armR = new T.Group(); armR.position.set(0.25 * s, 0.38 * s, 0); body.add(armR); box(0.07, 0.18, 0.07, 0, -0.09, 0, darkM, armR);
    g.userData = { body, armL, armR, legL, legR, s };
    return g;
  }
  const hat = (col, s = 1) => { const g = new T.Group(); const m = A.toonM(col); const brim = K3D.mesh(new T.CylinderGeometry(0.16 * s, 0.16 * s, 0.02 * s, 12), m, { ink: A.INK, inkW: 0.4 }); g.add(brim); const top = K3D.mesh(new T.CylinderGeometry(0.1 * s, 0.11 * s, 0.14 * s, 12), m, { ink: A.INK, inkW: 0.4 }); top.position.y = 0.07 * s; g.add(top); const band = new T.Mesh(new T.CylinderGeometry(0.112 * s, 0.112 * s, 0.03 * s, 12), A.flatM('#ffd24a', 1.3)); band.position.y = 0.02 * s; g.add(band); return g; };
  const stripes = (a, b, key) => K3D.paint('pl-str|' + key, 128, 64, (c, w, h) => { for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? a : b; c.fillRect(k * 16, 0, 16, h); } c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, h - 8, w, 8); for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? a : b; c.beginPath(); c.moveTo(k * 16, h - 8); c.lineTo(k * 16 + 8, h); c.lineTo(k * 16 + 16, h - 8); c.fill(); } }, { repeat: true });
  const sign = (text, w, h, o = {}) => {
    const tex = K3D.paint('pl-sign|' + text + w + h + (o.bg || ''), 256, Math.round(256 * h / w), (c, cw, ch) => {
      c.fillStyle = o.bg || '#f2e6c8'; c.fillRect(0, 0, cw, ch); c.strokeStyle = o.fg || '#b0182a'; c.lineWidth = 6; c.strokeRect(5, 5, cw - 10, ch - 10);
      c.fillStyle = o.fg || '#b0182a'; c.font = `900 ${Math.round(ch * (o.k || 0.48))}px "DejaVu Sans", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const lines = text.split('\n'); lines.forEach((ln, i) => c.fillText(ln, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * ch * (o.k || 0.48) * 1.1));
      for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(80,50,20,${A.rnd() * 0.12})`; c.fillRect(A.rnd() * cw, A.rnd() * ch, 3, 2); }
    });
    const m = new T.Mesh(new T.PlaneGeometry(w, h), K3D.toon('#ffffff', { map: tex, side: T.DoubleSide }));
    return m;
  };

  /* ---------- a fairground stall against a slingshot ---------- */
  function stall(K, x, d, face, kind) {
    const { P, lamps, glows, woodTex, INK, SH } = kit;
    const g = new T.Group(), q = P(x, d); g.position.set(q.x, q.y - (TB.yAt(d) - kit.yb(d)) + SH, q.z); g.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2; K.add(g);
    const col = kind === 'tickets' ? '#c0182a' : '#1a6ac0';
    // the counter and the booth
    const wood = K3D.toon('#ffffff', { map: woodTex('#8a4a22', 'st' + kind) });
    const back = K3D.mesh(new T.BoxGeometry(4.6, 3.4, 0.3), wood, { ink: INK }); back.position.set(0, 1.7, -1.4); g.add(back);
    for (const sx of [-1, 1]) { const side = K3D.mesh(new T.BoxGeometry(0.25, 3.4, 2.9), wood, { ink: INK }); side.position.set(sx * 2.2, 1.7, 0); g.add(side); }
    const counter = K3D.mesh(new T.BoxGeometry(4.6, 1.1, 0.9), K3D.toon('#ffffff', { map: stripes('#f2e6c8', col, 'c' + kind) }), { ink: INK }); counter.position.set(0, 0.55, 1.1); g.add(counter);
    const top = K3D.mesh(new T.BoxGeometry(4.8, 0.12, 1.1), K3D.toon('#d8a838'), { ink: INK }); top.position.set(0, 1.16, 1.1); g.add(top);
    // the striped awning, scalloped, sloping out
    const aw = K3D.mesh(new T.BoxGeometry(5.2, 0.08, 2.4), K3D.toon('#ffffff', { map: stripes('#f2e6c8', col, 'a' + kind), side: T.DoubleSide }), { ink: INK, inkW: 0.5 });
    aw.position.set(0, 3.5, 0.7); aw.rotation.x = 0.28; g.add(aw);
    for (let k = 0; k < 10; k++) { const fl = new T.Mesh(new T.ConeGeometry(0.26, 0.4, 3), A.toonM(k % 2 ? '#f2e6c8' : col)); fl.rotation.x = Math.PI; fl.position.set(-2.34 + k * 0.52, 3.05, 1.86); g.add(fl); }
    // bulbs along the awning's edge (world positions)
    g.updateMatrixWorld(true);
    for (let k = 0; k <= 12; k++) { const v = new T.Vector3(-2.5 + k * 5 / 12, 3.25, 1.9).applyMatrix4(g.matrixWorld); lamps.bulb.add(v.x, v.y, v.z, 0.08, k % 2 ? '#fff4d8' : '#ffd24a', 2.0, { mode: 1, sp: 0.8, ph: k / 12 }); }
    // the sign on top
    const sg = sign(kind === 'tickets' ? 'TICKETS' : 'POPCORN', 3.6, 0.9, { fg: col }); sg.position.set(0, 4.3, 1.0); sg.rotation.x = -0.15; g.add(sg);
    const v = new T.Vector3(0, 4.3, 1.4).applyMatrix4(g.matrixWorld); glows.add(v.x, v.y, v.z, 4, '#ffe0a0', 0.18, 0.1);
    // the roller shutter (its keeper raises it at the start)
    const sh = K3D.mesh(new T.BoxGeometry(4.2, 1.9, 0.08), K3D.toon('#ffffff', { map: K3D.paint('pl-shut', 64, 128, (c, w, h) => { c.fillStyle = '#8a8c98'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, y, w, 2); c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(0, y + 2, w, 1); } }, { repeat: true }) }), { ink: INK, inkW: 0.5 });
    sh.position.set(0, 2.2, 1.55); g.add(sh);
    // the stock
    if (kind === 'tickets') {
      const roll = K3D.mesh(new T.CylinderGeometry(0.45, 0.45, 0.5, 20), A.toonM('#ff9a4a'), { ink: INK }); roll.rotation.z = Math.PI / 2; roll.position.set(-1.2, 1.65, 1.0); g.add(roll);
      const strip = sign('ADMIT ONE', 0.5, 1.4, { bg: '#ffd08a', fg: '#7a2a0a', k: 0.18 }); strip.position.set(-1.2, 1.2, 1.5); strip.rotation.x = -0.4; g.add(strip);
      const till = K3D.mesh(new T.BoxGeometry(0.9, 0.6, 0.6), A.toonM('#3a3a44'), { ink: INK }); till.position.set(1.0, 1.5, 0.9); g.add(till);
      const keys = new T.Mesh(new T.PlaneGeometry(0.7, 0.3), A.flatM('#5aff8a', 1.3)); keys.position.set(1.0, 1.82, 1.21); g.add(keys);
    } else {
      const mach = new T.Group(); mach.position.set(-0.8, 1.2, 0.6); g.add(mach);
      const glass = new T.Mesh(new T.BoxGeometry(1.4, 1.5, 1.0), new T.MeshBasicMaterial({ color: '#ffe8b0', transparent: true, opacity: 0.25, depthWrite: false })); glass.position.y = 0.95; mach.add(glass);
      const frame = K3D.mesh(new T.BoxGeometry(1.5, 0.12, 1.1), A.toonM('#c0182a'), { ink: INK }); frame.position.y = 1.75; mach.add(frame);
      const base = K3D.mesh(new T.BoxGeometry(1.5, 0.2, 1.1), A.toonM('#c0182a'), { ink: INK }); base.position.y = 0.1; mach.add(base);
      const kernels = new T.InstancedMesh(K3D.geo('pl-pop', () => new T.IcosahedronGeometry(0.07, 0)), A.flatM('#fff6d8', 1.2), 80);
      const m4 = new T.Matrix4(); for (let i = 0; i < 80; i++) { m4.makeTranslation((A.rnd() - 0.5) * 1.2, 0.25 + A.rnd() * 0.5, (A.rnd() - 0.5) * 0.8); kernels.setMatrixAt(i, m4); }
      mach.add(kernels); L.pop = { kernels, t: 0 };
      for (let k = 0; k < 4; k++) { const cone = K3D.mesh(new T.ConeGeometry(0.2, 0.55, 10, 1, true), K3D.toon('#ffffff', { map: stripes('#f2e6c8', '#c0182a', 'cone'), side: T.DoubleSide }), { ink: INK, inkW: 0.4 }); cone.rotation.x = Math.PI; cone.position.set(0.6 + k * 0.4, 1.55, 1.2); g.add(cone); }
    }
    return { g, sh };
  }

  /* ---------- build ---------- */
  function build(K, SC, k) {
    kit = k; L.SC = SC;
    const { P, V, lamps, glows, chrome, woodTex, INK, WALL, RAIL, SH, yb, tube } = kit;
    const S = (x, d) => V(x, yb(d) + SH, -d); // a spot on the shoulders
    const crit = L.crit = A.critters(K, 2400);
    const story = L.story = {};
    const live = new T.Group(); K.add(live); live.userData.live = true;
    /* the apron: rules card, price card, a service card with a pencilled high score */
    {
      const rules = sign('COMET CARNIVAL\nROLL YOUR BALL\nOPEN YOUR FRIEND\'S GATES\nBOTH TO THE JACKPOT', 6, 2.6, { bg: '#fff4dc', fg: '#1a2a6a', k: 0.13 });
      // the apron is a plane tipped a little flatter than the table (pinball-scene.js): cards sit just on top of it
      const apY = d => yb(-4.8) + 0.9 + (d + 4.8) * Math.tan(Math.atan(TB.T.SLOPE) - 0.12) + 0.035;
      rules.rotation.x = -Math.PI / 2 + Math.atan(TB.T.SLOPE) - 0.12; rules.position.set(-5.4, apY(-7.6), 7.6); K.add(rules);
      const price = sign('1 COIN\n1 CLIMB', 3.2, 2.2, { bg: '#fff4dc', fg: '#b0182a', k: 0.3 });
      price.rotation.copy(rules.rotation); price.position.set(5.6, apY(-7.4), 7.4); K.add(price);
      // the service card: a lined card with a pencilled high score and initials, taped on, a coffee ring
      const svcTex = K3D.paint('pl-hiscore', 256, 180, (c, w, h) => {
        c.fillStyle = '#f2e6b8'; c.fillRect(0, 0, w, h);
        for (let y = 36; y < h; y += 24) { c.fillStyle = 'rgba(80,120,180,0.28)'; c.fillRect(0, y, w, 1.5); }
        c.fillStyle = 'rgba(200,80,80,0.32)'; c.fillRect(26, 0, 1.5, h);
        c.fillStyle = 'rgba(60,56,64,0.88)'; c.font = 'italic bold 22px cursive, serif'; c.fillText('HIGH SCORE', 36, 30);
        c.font = 'italic bold 30px cursive, serif'; c.fillText('4,816,250', 44, 84); c.font = 'italic 22px cursive, serif'; c.fillText('- T.M.  beat it!', 70, 128);
        c.strokeStyle = 'rgba(60,56,64,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(40, 92); c.lineTo(200, 90); c.stroke();
        c.strokeStyle = 'rgba(120,90,40,0.25)'; c.lineWidth = 5; c.beginPath(); c.arc(210, 140, 26, 0, Math.PI * 2); c.stroke();
        c.fillStyle = 'rgba(200,190,170,0.65)'; c.fillRect(w / 2 - 30, -4, 60, 16);
      });
      const svc = new T.Mesh(new T.PlaneGeometry(2.0, 1.4), K3D.toon('#ffffff', { map: svcTex })); svc.rotation.copy(rules.rotation); svc.rotation.z = 0.12; svc.position.set(1.4, apY(-8.2) + 0.01, 8.2); K.add(svc);
      const stk = A.decal(K, 'sticker', 1.1, 1.1, { seed: 7 }); stk.rotation.copy(rules.rotation); stk.rotation.z = -0.3; stk.position.set(8.2, apY(-4.6), 4.6); K.add(stk);
      // creatures sitting on the apron's edge with their legs over, watching the start
      for (let i = 0; i < 9; i++) { const x = -8 + i * 2 + (A.rnd() - 0.5); crit.add(x, yb(-1.2) + 0.95, 1.2, { kind: [0, 1, 5, 3][i % 4], act: i % 3 ? 'sit' : 'cheer', yaw: Math.PI, s: 1.1 }); }
    }
    /* the stalls against the slingshots */
    L.stalls = [];
    for (const dc of TB.decor) if (dc.kind === 'stall') {
      const st = stall(K, dc.x, dc.d, dc.face, dc.name); L.stalls.push(st);
      // the keeper behind the counter and a queue in front
      // (the keeper stands on a crate so they can see over the counter)
      const crate = K3D.mesh(new T.BoxGeometry(1.0, 0.7, 0.8), K3D.toon('#ffffff', { map: woodTex('#9a6a32', 'crate') }), { ink: INK, inkW: 0.4 }); crate.position.set(0.4, 0.35, -0.6); st.g.add(crate);
      const kq = S(dc.x - dc.face * 0.6, dc.d - 0.4); crit.add(kq.x, kq.y + 0.7, kq.z, { kind: 4, act: 'work', yaw: dc.face > 0 ? Math.PI / 2 : -Math.PI / 2, s: 1.7, col: dc.name === 'tickets' ? '#ffd24a' : '#7affd8' });
      for (let i = 0; i < 6; i++) { const qq = S(dc.x + dc.face * 1.9, dc.d - 3 - i * 1.1); crit.add(qq.x + (A.rnd() - 0.5) * 0.4, qq.y, qq.z, { act: i % 2 ? 'idle' : 'wave', yaw: Math.PI, s: 1.1 + A.rnd() * 0.3 }); }
    }
    /* the ticket booth on the left shoulder, its queue held by a rope */
    {
      const dc = TB.decor.find(q => q.kind === 'booth'), q = S(dc.x, dc.d);
      const g = new T.Group(); g.position.copy(q); g.rotation.y = Math.PI / 2; K.add(g);
      const body = K3D.mesh(new T.CylinderGeometry(1.4, 1.5, 3.2, 20), K3D.toon('#ffffff', { map: stripes('#f2e6c8', '#c0182a', 'booth') }), { ink: INK }); body.position.y = 1.6; g.add(body);
      const roof = K3D.mesh(new T.ConeGeometry(1.8, 1.4, 20), A.toonM('#c0182a'), { ink: INK }); roof.position.y = 3.9; g.add(roof);
      const flag = sign('★', 0.4, 0.3, { fg: '#ffd24a', bg: '#c0182a' }); flag.position.set(0, 4.9, 0); g.add(flag);
      const win = new T.Mesh(new T.CircleGeometry(0.6, 20), A.flatM('#ffe0a0', 1.4)); win.position.set(0, 2.0, 1.47); g.add(win);
      const inside = guy('#9a8aff', { s: 1.4 }); inside.position.set(0, 1.4, 1.0); g.add(inside); story.booth = inside;
      const sg = sign('TICKETS\n1 COIN', 1.8, 0.9, { k: 0.34 }); sg.position.set(0, 3.2, 1.55); g.add(sg);
      g.updateMatrixWorld(true);
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, v = new T.Vector3(Math.cos(a) * 1.55, 3.25, Math.sin(a) * 1.55).applyMatrix4(g.matrixWorld); lamps.bulb.add(v.x, v.y, v.z, 0.08, k % 2 ? '#ffd24a' : '#fff4d8', 2, { mode: 1, sp: 1, ph: k / 16 }); }
      for (let i = 0; i < 7; i++) { const qq = S(dc.x + 0.6, dc.d + 2 + i * 1.0); crit.add(qq.x, qq.y, qq.z, { act: i === 3 ? 'sleep' : 'idle', yaw: Math.PI * 0.5 + Math.PI, s: 1.0 + A.rnd() * 0.4 }); }
      for (let i = 0; i < 5; i++) { const a = S(dc.x + 1.4, dc.d + 1.5 + i * 1.6); const pst = K3D.mesh(new T.CylinderGeometry(0.06, 0.08, 0.9, 8), chrome, { ink: false }); pst.position.set(a.x, a.y + 0.45, a.z); K.add(pst); }
      const r0 = S(dc.x + 1.4, dc.d + 1.5), r1 = S(dc.x + 1.4, dc.d + 7.9); K.add(kit.wire([V(r0.x, r0.y + 0.8, r0.z), V(r0.x, r0.y + 0.62, (r0.z + r1.z) / 2), V(r1.x, r1.y + 0.8, r1.z)], 0.04, A.toonM('#c0182a')));
    }
    /* the chair ride made from a spinning post, its queue (the couple on a date rides it) */
    {
      const dc = TB.decor.find(q => q.kind === 'queue'), q = S(dc.x, dc.d);
      const g = new T.Group(); g.position.copy(q); K.add(g); g.userData.live = true;
      const mast = K3D.mesh(new T.CylinderGeometry(0.3, 0.45, 5.4, 16), chrome, { ink: INK }); mast.position.y = 2.7; g.add(mast);
      const ringR = K3D.mesh(new T.TorusGeometry(0.5, 0.18, 8, 20).rotateX(Math.PI / 2), A.toonM('#4a4a4e'), { ink: INK }); ringR.position.y = 0.9; g.add(ringR);
      const spin = new T.Group(); spin.position.y = 5.2; g.add(spin);
      const top = K3D.mesh(new T.ConeGeometry(2.2, 1.1, 24), K3D.toon('#ffffff', { map: stripes('#f2e6c8', '#e84ab0', 'ride') }), { ink: INK }); top.position.y = 0.5; spin.add(top);
      const chairs = [];
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2, arm = new T.Group(); arm.rotation.y = a; spin.add(arm);
        const hang = new T.Group(); hang.position.set(1.9, 0, 0); arm.add(hang);
        const chain = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 2.2, 4), A.toonM('#c8ccd8')); chain.position.y = -1.1; hang.add(chain);
        const seat = K3D.mesh(new T.BoxGeometry(0.5, 0.12, 0.45), A.toonM(A.pick(['#ffd24a', '#5aff8a', '#4ae8ff', '#ff5ad6'])), { ink: INK, inkW: 0.4 }); seat.position.y = -2.2; hang.add(seat);
        if (i === 0 || i === 4) { // the couple on their date (two chairs side by side would be 0 and 1; they share chair 0 here, holding hands)
          const a1 = guy(i ? '#ff7ab8' : '#7affd8', { s: 0.9 }); a1.position.set(0, -2.15, 0); hang.add(a1);
        } else if (i % 2) { const a1 = guy(A.pick(A.NEON), { s: 0.9 }); a1.position.set(0, -2.15, 0); hang.add(a1); }
        chairs.push(hang);
      }
      // the couple: a twin creature (two holding hands) in one chair with a heart over them
      const heart = new T.Mesh(new T.CircleGeometry(0.18, 12), A.flatM('#ff5a8a', 1.8)); heart.position.set(1.9, -1.2, 0); spin.children[1] && spin.children[1].add(heart);
      g.updateMatrixWorld(true);
      L.ride = { spin, chairs, g };
      const sg = sign('STAR SWING', 2.4, 0.7, { fg: '#e84ab0' }); sg.position.set(-2.6, 2.4, 0); sg.rotation.y = -Math.PI / 2; g.add(sg);
      for (let i = 0; i < 8; i++) { const qq = S(dc.x - 2.6, dc.d - 3 + i * 0.95); crit.add(qq.x + (i % 2) * 0.4, qq.y, qq.z, { act: i % 3 ? 'idle' : 'wave', yaw: Math.PI, s: 1.0 + A.rnd() * 0.4 }); }
      for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; lamps.bulb.add(q.x + Math.cos(a) * 2.25, q.y + 5.75, q.z + Math.sin(a) * 2.25, 0.07, k % 2 ? '#ff5ad6' : '#fff4d8', 2, { mode: 1, sp: 1.6, ph: k / 24 }); }
    }
    /* the dark alleys (outlanes): brick walls on the shoulder, warning beacons, DRAIN signs, a creature fishing */
    const brick = K3D.toon('#ffffff', { map: K3D.paint('pl-brick', 128, 128, (c, w, h) => { c.fillStyle = '#2a1a1e'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < w; x += 32) { c.fillStyle = `rgb(${70 + A.rnd() * 30},${30 + A.rnd() * 14},${34 + A.rnd() * 10})`; c.fillRect(x + 1, y + 1, 30, 14); } c.fillStyle = 'rgba(255,255,255,0.08)'; c.font = 'bold 20px monospace'; c.fillText('ZAP', 40, 70); }, { repeat: true }) });
    L.beacons = [];
    for (const dc of TB.decor) if (dc.kind === 'alley') {
      const s = Math.sign(dc.x);
      for (const dd of [-3, 3]) { const w = K3D.mesh(new T.BoxGeometry(2.4, 2.6, 0.4), brick, { ink: INK, inkW: 0.5 }); const q = S(RAIL + 1.6 * 1 * 1, dc.d + dd); w.position.set(s * (RAIL + 1.5), q.y + 1.3, q.z); K.add(w); }
      const sg = sign('DRAIN!', 1.6, 0.6, { fg: '#ff3a2a', bg: '#1a1214' }); const q = S(dc.x, dc.d - 3); sg.position.set(s * (RAIL + 1.5), q.y + 2.9, q.z + 0.21); K.add(sg);
      for (const dd of [-3, 3]) { const bq = S(s * (RAIL + 1.5), dc.d + dd); const bi = lamps.bulb.add(bq.x, bq.y + 2.75, bq.z, 0.2, '#ff3a2a', 2.6, { mode: 2, sp: 2.5 }); L.beacons.push(bi); glows.add(bq.x, bq.y + 2.75, bq.z, 2.2, '#ff3a2a', 0.25, 0.9); }
      // the fisher: a creature sitting at the alley's edge with a rod over the drain
      const fq = S(s * (RAIL + 0.9), dc.d + 0.6); crit.add(fq.x, fq.y, fq.z, { kind: 0, act: 'fish', yaw: s > 0 ? -Math.PI / 2 : Math.PI / 2, s: 1.3, col: '#7affd8' });
      const rod = kit.wire([V(fq.x, fq.y + 0.5, fq.z), V(fq.x - s * 1.2, fq.y + 1.5, fq.z), V(fq.x - s * 2.0, fq.y + 1.3, fq.z)], 0.025, A.toonM('#8a5a2a')); K.add(rod);
      const line = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 1.6, 4), A.flatM('#ffffff', 1)); line.position.set(fq.x - s * 2.0, fq.y + 0.5, fq.z); K.add(line);
      const bob = new T.Mesh(new T.SphereGeometry(0.08, 8, 6), A.flatM('#ff3a2a', 1.5)); bob.position.set(fq.x - s * 2.0, fq.y - 0.3, fq.z); K.add(bob); L.bobber = L.bobber || []; L.bobber.push(bob);
    }
    /* bunting along the shoulders and balloons tied to the rail posts */
    {
      const flags = [], strings = [];
      for (const s of [-1, 1]) for (let d = -2; d < 80; d += 5) {
        const a = V(s * (RAIL + 0.4), yb(d) + 2.6, -d), b = V(s * (RAIL + 0.4), yb(d + 5) + 2.6, -(d + 5));
        for (let k = 0; k < 7; k++) { const u = (k + 0.5) / 7, sag = Math.sin(u * Math.PI) * 0.5; flags.push([a.x, a.y + (b.y - a.y) * u - sag, a.z + (b.z - a.z) * u, s]); }
        strings.push([a, b]);
      }
      const fm = new T.InstancedMesh(K3D.geo('pl-flag', () => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([-0.22, 0, 0, 0.22, 0, 0, 0, -0.42, 0], 3)); g.computeVertexNormals(); return g; }), new T.MeshBasicMaterial({ side: T.DoubleSide, toneMapped: false }), flags.length);
      const m4 = new T.Matrix4(), c = new T.Color(), cols = ['#e8302a', '#ffd24a', '#2a8ae8', '#f2e6c8', '#3ac86a', '#e84ab0'];
      flags.forEach((f, i) => { m4.makeRotationY(Math.PI / 2).setPosition(f[0], f[1], f[2]); fm.setMatrixAt(i, m4); fm.setColorAt(i, c.set(cols[i % cols.length]).multiplyScalar(1.05)); });
      K.add(fm); L.flags = { fm, flags };
      for (const [a, b] of strings) { const mid = a.clone().add(b).multiplyScalar(0.5); mid.y -= 0.5; K.add(kit.wire([a, mid, b], 0.015, A.toonM('#f2e6c8'))); }
      // balloons
      L.balloons = [];
      const bm = new T.InstancedMesh(K3D.geo('pl-ball', () => new T.SphereGeometry(0.4, 16, 12).scale(1, 1.2, 1)), K3D.toon('#ffffff', { emissive: '#222222', emissiveIntensity: 0.6 }), 24);
      let n = 0;
      for (const s of [-1, 1]) for (const d of [10, 26, 44, 58, 71]) for (let k = 0; k < 2; k++) {
        if (n >= 24) break;
        const base = V(s * (RAIL + 0.1), yb(d) + 1.1, -d - k * 0.3), col = A.pick(['#e8302a', '#ffd24a', '#2a8ae8', '#e84ab0', '#3ac86a', '#ff8a4a']);
        bm.setColorAt(n, c.set(col)); L.balloons.push({ base, i: n, ph: A.rnd() * 6, h: 2.2 + k * 0.5 + A.rnd() * 0.4 });
        const str = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, L.balloons[n].h, 4), A.flatM('#f2e6c8', 0.9)); str.position.set(base.x, base.y + L.balloons[n].h / 2, base.z); K.add(str); L.balloons[n].str = str;
        n++;
      }
      bm.count = n; K.add(bm); L.bm = bm; bm.userData.live = true;
    }
    /* lost things that fell through the glass, on the shoulders */
    {
      const put = (o, x, d, rot = 0, lift = 0) => { const q = S(x, d); o.position.set(q.x, q.y + lift, q.z); o.rotation.y = rot; K.add(o); return o; };
      put(A.lost(K, 'clip', { s: 5 }), -12.6, 46, 0.4, 0.05);
      put(A.lost(K, 'coin', { s: 1.3 }), 12.8, 50, 0, 0.08);
      put(A.lost(K, 'moth', { s: 1.4 }), -12.2, 6, 1.0, 0.1);
      put(A.lost(K, 'hairclip', { s: 1.4 }), 12.4, 12, 0.6, 0.15);
      const tk = A.decal(K, 'ticket', 2.2, 1.1, { seed: 3 }); tk.rotation.x = -Math.PI / 2; tk.rotation.z = 0.5; put(tk, -12.4, 36, 0, 0.03).rotation.x = -Math.PI / 2;
      const gw = A.decal(K, 'wrapper', 1.8, 0.9, { seed: 5 }); put(gw, 12.6, 58, 0, 0.03).rotation.x = -Math.PI / 2;
      // creatures living with them: one asleep in the coin's hole, two pulling the moth on a rope
      const cq = S(12.8, 50); crit.add(cq.x, cq.y + 0.2, cq.z, { kind: 3, act: 'sleep', s: 0.9 });
      const mq = S(-12.2, 7.6); crit.add(mq.x, mq.y, mq.z, { kind: 4, act: 'work', yaw: Math.PI, s: 1.1 }); crit.add(mq.x + 0.6, mq.y, mq.z - 0.4, { kind: 4, act: 'work', yaw: Math.PI, s: 1.1 });
    }
    /* a crowd along the shoulders (spectators, workers, a school trip pointing at the heroes) */
    for (const s of [-1, 1]) for (let d = -2; d < 80; d += 1.4) {
      if (A.rnd() < 0.35) continue;
      const x = s * (RAIL + 1.0 + A.rnd() * (WALL - RAIL - 1.6)), q = S(x, d);
      if (TB.decor.some(dc => (dc.kind === 'stall' || dc.kind === 'booth' || dc.kind === 'queue') && Math.abs(dc.d - d) < 5 && Math.sign(dc.x) === s)) continue;
      if (TB.decor.some(dc => dc.kind === 'alley' && Math.abs(dc.d - d) < 4 && Math.sign(dc.x) === s)) continue;
      if (Math.abs(d - 77.5) < 3.2) continue; // the comet slide and planet toss
      crit.add(q.x, q.y, q.z, { act: A.pick(['idle', 'idle', 'wave', 'cheer', 'dance', 'sit', 'walk']), yaw: s > 0 ? -Math.PI / 2 + (A.rnd() - 0.5) : Math.PI / 2 + (A.rnd() - 0.5), s: 0.9 + A.rnd() * 0.6 });
    }
    // the school trip: a teacher and a line of little ones, all pointing (waving) at the heroes
    for (let i = 0; i < 8; i++) { const q = S(-10.4 - (i % 2) * 0.7, 50 + i * 0.8); crit.add(q.x, q.y, q.z, { kind: i ? 5 : 1, act: 'wave', yaw: Math.PI / 2, s: i ? 0.8 : 1.4, col: i ? '#ffd24a' : '#4ae8ff' }); }
    // creatures inside the slingshot tents' doorways and on the posts' caps
    for (const p of TB.posts) if (p.kind === 'post' && p.d < 80 && A.rnd() < 0.5) { const q = P(p.x, p.d, 1.36); crit.add(q.x, q.y, q.z, { kind: A.pick([0, 3, 5]), act: A.pick(['sit', 'wave', 'idle']), yaw: Math.PI, s: 0.7 }); }
    /* the comet slide on the right shoulder by the twin flippers: a striped tower with a slide spiralling down round it,
       creatures riding mats down and running round to climb up again */
    {
      const q = S(12.2, 77.5), g = new T.Group(); g.position.copy(q); K.add(g);
      const tower = K3D.mesh(new T.CylinderGeometry(0.85, 1.1, 6.4, 20), K3D.toon('#ffffff', { map: stripes('#f2e6c8', '#c0182a', 'slide') }), { ink: INK }); tower.position.y = 3.2; g.add(tower);
      const rim = K3D.mesh(new T.CylinderGeometry(1.05, 1.05, 0.18, 20), A.toonM('#ffd24a'), { ink: INK, inkW: 0.4 }); rim.position.y = 6.45; g.add(rim);
      const cap = K3D.mesh(new T.ConeGeometry(1.35, 1.7, 20), A.toonM('#c0182a'), { ink: INK }); cap.position.y = 7.4; g.add(cap);
      const pole = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.9, 6), A.toonM('#c8ccd8')); pole.position.y = 8.6; g.add(pole);
      const pen = new T.Mesh(new T.ConeGeometry(0.22, 0.7, 3).rotateZ(-Math.PI / 2), A.flatM('#ffd24a', 1.3)); pen.position.set(0.35, 8.85, 0); g.add(pen); L.pennant = pen;
      const door = new T.Mesh(new T.PlaneGeometry(0.7, 1.1), A.flatM('#1a1214', 1)); door.position.set(-0.95, 0.6, 0.25); door.rotation.y = -Math.PI / 2 + 0.25; g.add(door);
      const top = new T.Mesh(new T.PlaneGeometry(0.7, 0.8), A.flatM('#ffe0a0', 1.4)); top.position.set(-0.9, 5.75, -0.35); top.rotation.y = -Math.PI / 2 - 0.35; g.add(top);
      const R0 = 1.75, yTop = 5.6, yBot = 0.35, turns = 2.25, a0 = Math.PI + 0.5;
      const helix = (u, r = R0, lift = 0) => V(Math.cos(a0 + u * turns * Math.PI * 2) * r, yTop - u * (yTop - yBot) + lift, Math.sin(a0 + u * turns * Math.PI * 2) * r);
      const pts = [], outer = [], inner = []; for (let k = 0; k <= 48; k++) { const u = k / 48; pts.push(helix(u)); outer.push(helix(u, R0 + 0.42, 0.22)); inner.push(helix(u, R0 - 0.42, 0.1)); }
      const bed = kit.wire(pts, 0.34, A.toonM('#ffd24a'), { seg: 160, rs: 10, ink: INK }); bed.scale.y = 0.6; bed.position.y = 0.12; g.add(bed);
      g.add(kit.wire(outer, 0.07, A.toonM('#c0182a'), { seg: 160 }), kit.wire(inner, 0.05, A.toonM('#c0182a'), { seg: 160 }));
      for (let k = 0; k <= 9; k++) { const u = k / 9, a = helix(u, 0.9), b = helix(u, R0 - 0.2); g.add(tube(V(a.x, a.y - 0.1, a.z), V(b.x, b.y - 0.1, b.z), 0.05, A.toonM('#8a8c98'), { ink: false })); }
      const run = kit.wire([helix(1, R0, 0), helix(1.06, R0 + 0.5, -0.25), helix(1.1, R0 + 1.1, -0.3)], 0.3, A.toonM('#ffd24a'), { ink: INK }); run.scale.y = 0.6; g.add(run);
      g.updateMatrixWorld(true);
      for (let k = 0; k <= 30; k++) { const v = helix(k / 30, R0 + 0.44, 0.32).applyMatrix4(g.matrixWorld); lamps.bulb.add(v.x, v.y, v.z, 0.06, k % 2 ? '#fff4d8' : '#ff5a5a', 2, { mode: 1, sp: 1.2, ph: k / 30 }); }
      const sg = sign('COMET\nSLIDE', 1.3, 0.9, { fg: '#c0182a', k: 0.34 }); sg.position.set(-1.15, 3.6, 0); sg.rotation.y = -Math.PI / 2; g.add(sg);
      const gv = V(-1.2, 3.6, 0).applyMatrix4(g.matrixWorld); glows.add(gv.x, gv.y, gv.z, 3, '#ffe0a0', 0.14, 0.1);
      // three riders on mats, each going down, running round and climbing again
      const riders = [];
      for (let i = 0; i < 3; i++) {
        const r = new T.Group(); g.add(r);
        const mat = K3D.mesh(new T.BoxGeometry(0.62, 0.06, 0.5), A.toonM(['#2a8ae8', '#3ac86a', '#e84ab0'][i]), { ink: INK, inkW: 0.3 }); mat.position.y = 0.03; r.add(mat);
        const who = guy(['#ffd24a', '#7affd8', '#ff8a4a'][i], { s: 0.95 }); r.add(who);
        riders.push({ r, who, mat, ph: i / 3 });
      }
      L.slide = { g, riders, helix };
      // the queue at the door, out along the shoulder
      for (let i = 0; i < 6; i++) { const qq = S(12.6 + (i % 2) * 0.4, 75.2 - i * 0.95); crit.add(qq.x, qq.y, qq.z, { act: i % 3 ? 'idle' : 'wave', yaw: Math.PI, s: 0.9 + A.rnd() * 0.4 }); }
    }
    /* planet toss on the left shoulder: a game stall where you throw rings over little planets on pegs */
    {
      const q = S(-12.8, 77.5), g = new T.Group(); g.position.copy(q); g.rotation.y = Math.PI / 2; K.add(g);
      const night = K3D.paint('pl-toss', 256, 128, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0e1a4a'); gr.addColorStop(1, '#2a1a5a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(255,255,230,${0.3 + A.rnd() * 0.7})`; c.fillRect(A.rnd() * w, A.rnd() * h, 1.5, 1.5); } c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(200, 30, 14, 0, 7); c.fill(); c.fillStyle = '#0e1a4a'; c.beginPath(); c.arc(207, 26, 13, 0, 7); c.fill(); });
      const back = K3D.mesh(new T.BoxGeometry(4.4, 3.1, 0.25), K3D.toon('#ffffff', { map: night }), { ink: INK }); back.position.set(0, 1.55, -1.3); g.add(back);
      for (const sx of [-1, 1]) { const post = K3D.mesh(new T.BoxGeometry(0.22, 3.6, 0.22), A.toonM('#ffd24a'), { ink: INK, inkW: 0.4 }); post.position.set(sx * 2.15, 1.8, 1.2); g.add(post); }
      const roof = K3D.mesh(new T.BoxGeometry(4.8, 0.08, 2.9), K3D.toon('#ffffff', { map: stripes('#f2e6c8', '#2a8ae8', 'toss'), side: T.DoubleSide }), { ink: INK, inkW: 0.5 }); roof.position.set(0, 3.55, 0); roof.rotation.x = 0.16; g.add(roof);
      for (let k = 0; k < 9; k++) { const fl = new T.Mesh(new T.ConeGeometry(0.27, 0.4, 3), A.toonM(k % 2 ? '#f2e6c8' : '#2a8ae8')); fl.rotation.x = Math.PI; fl.position.set(-2.1 + k * 0.525, 3.12, 1.42); g.add(fl); }
      const counter = K3D.mesh(new T.BoxGeometry(4.4, 1.0, 0.7), K3D.toon('#ffffff', { map: stripes('#f2e6c8', '#2a8ae8', 'tossc') }), { ink: INK }); counter.position.set(0, 0.5, 1.1); g.add(counter);
      const ctop = K3D.mesh(new T.BoxGeometry(4.6, 0.1, 0.9), A.toonM('#d8a838'), { ink: INK, inkW: 0.4 }); ctop.position.set(0, 1.05, 1.1); g.add(ctop);
      // the stepped shelf with planets on pegs, some ringed
      const pm = A.toonM('#ffffff');
      for (let row = 0; row < 3; row++) {
        const step = K3D.mesh(new T.BoxGeometry(3.8, 0.5 + row * 0.45, 0.5), A.toonM('#3a2a5a'), { ink: INK, inkW: 0.4 }); step.position.set(0, (0.5 + row * 0.45) / 2, 0.1 - row * 0.5); g.add(step);
        for (let k = 0; k < 5 - row; k++) {
          const x = -1.5 + k * (3 / (4 - row)) + row * 0.0, y = 0.5 + row * 0.45, z = 0.1 - row * 0.5;
          const peg = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.3, 6), A.toonM('#c8ccd8')); peg.position.set(x, y + 0.15, z); g.add(peg);
          const pl = K3D.mesh(new T.SphereGeometry(0.2 + A.rnd() * 0.08, 14, 10), A.toonM(A.pick(['#ff8a4a', '#4ae8ff', '#ffd24a', '#7affd8', '#e84ab0', '#9a8aff'])), { ink: INK, inkW: 0.35 }); pl.position.set(x, y + 0.48, z); g.add(pl);
          if ((k + row) % 2 === 0) { const rg = new T.Mesh(new T.TorusGeometry(0.34, 0.03, 6, 20), A.toonM('#f2e6c8')); rg.rotation.x = Math.PI / 2 - 0.3; rg.position.copy(pl.position); g.add(rg); }
        }
      }
      // prizes hanging on the back wall, a pile of rings on the counter
      for (let k = 0; k < 6; k++) { const pz = guy(A.pick(A.NEON), { s: 0.7 }); pz.position.set(-1.9 + k * 0.76, 2.15 + (k % 2) * 0.35, -1.12); g.add(pz); const hk = new T.Mesh(new T.CylinderGeometry(0.01, 0.01, 0.5, 4), A.toonM('#c8ccd8')); hk.position.set(-1.9 + k * 0.76, 2.75 + (k % 2) * 0.35, -1.15); g.add(hk); }
      for (let k = 0; k < 6; k++) { const rg = new T.Mesh(new T.TorusGeometry(0.16, 0.035, 6, 16), A.toonM(['#ff5a5a', '#ffd24a', '#3ac86a'][k % 3])); rg.rotation.x = Math.PI / 2; rg.position.set(1.4 + (k % 3) * 0.06, 1.12 + k * 0.05, 1.1); g.add(rg); }
      const sg = sign('PLANET TOSS\n3 RINGS 1 COIN', 3.2, 0.9, { fg: '#1a4ac0', k: 0.3 }); sg.position.set(0, 4.05, 1.25); sg.rotation.x = -0.12; g.add(sg);
      g.updateMatrixWorld(true);
      { const v = V(0, 4.05, 1.5).applyMatrix4(g.matrixWorld); glows.add(v.x, v.y, v.z, 4, '#bfe0ff', 0.14, 0.1); }
      for (let k = 0; k <= 12; k++) { const v = V(-2.4 + k * 0.4, 3.3, 1.45).applyMatrix4(g.matrixWorld); lamps.bulb.add(v.x, v.y, v.z, 0.07, k % 2 ? '#fff4d8' : '#4ae8ff', 2, { mode: 1, sp: 0.9, ph: k / 12 }); }
      // the player throwing rings (one ring always in the air), the keeper behind the counter, the friends watching
      const thrower = guy('#ff8a4a', { s: 1.25 }); thrower.position.set(0.4, 0, 2.3); thrower.rotation.y = Math.PI; g.add(thrower);
      const ring = new T.Mesh(new T.TorusGeometry(0.17, 0.035, 6, 16), A.flatM('#ffd24a', 1.4)); g.add(ring);
      L.toss = { g, thrower, ring, n: 0 };
      const kq = V(-0.9, 0, -0.75).applyMatrix4(g.matrixWorld); crit.add(kq.x, kq.y + 0.5, kq.z, { kind: 4, act: 'work', yaw: Math.PI / 2, s: 1.3, col: '#9a8aff' });
      for (let i = 0; i < 4; i++) { const v = V(-1.6 + i * 0.7, 0, 2.6 + (i % 2) * 0.3).applyMatrix4(g.matrixWorld); crit.add(v.x, v.y, v.z, { act: i % 2 ? 'cheer' : 'idle', yaw: -Math.PI / 2, s: 0.9 + A.rnd() * 0.3 }); }
    }
    /* story creatures with their own animation */
    // 1. the creature whose hat is knocked off by every passing ball (by the kerb at the start, left lane)
    { const g = guy('#ffd24a', { s: 1.3 }); const q = P(-8.4, 9.6); g.position.copy(q); g.rotation.y = Math.PI / 2; K.add(g); const h = hat('#2a2a36', 1.3); h.position.set(0, 0.62, 0); g.add(h); story.hat = { g, h, q, t: 99, vy: 0, y: 0.62 }; }
    // 2. the sweeper pushing a broom by the great flippers (dives for cover when one fires)
    { const g = guy('#7affd8', { s: 1.2 }); K.add(g); const broom = new T.Group(); const st2 = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1.1, 6), A.toonM('#8a5a2a')); st2.rotation.z = 1.0; st2.position.set(0.35, 0.45, 0.2); broom.add(st2); const head = K3D.mesh(new T.BoxGeometry(0.5, 0.12, 0.16), A.toonM('#e8b030'), { ink: INK, inkW: 0.4 }); head.position.set(0.8, 0.06, 0.2); broom.add(head); g.add(broom); story.sweep = { g, x: 0, dir: 1, dive: 0 }; }
    // 3. the painter touching up a star (gets rolled over, leaves footprints)
    { const g = guy('#ff8a4a', { s: 1.1 }); const q = P(-7.2, 33.2); g.position.copy(q); K.add(g); const brush = new T.Mesh(new T.BoxGeometry(0.05, 0.3, 0.05), A.toonM('#8a5a2a')); brush.position.set(0, -0.15, 0.06); g.userData.armR.add(brush); const pot = K3D.mesh(new T.CylinderGeometry(0.12, 0.1, 0.18, 10), A.toonM('#ffd24a'), { ink: INK, inkW: 0.3 }); pot.position.set(q.x + 0.4, q.y + 0.09, q.z + 0.2); K.add(pot);
      const prints = new T.InstancedMesh(K3D.geo('pl-print', () => new T.CircleGeometry(0.07, 8).rotateX(-Math.PI / 2)), A.flatM('#ffd24a', 1.0), 30); prints.count = 0; K.add(prints); story.paint = { g, q, flat: 0, prints, n: 0, walkT: 0 }; }
    // 4. the small one who follows the heroes up the whole table, hopping along the left shoulder
    { const g = guy('#ff5ad6', { s: 0.8 }); K.add(g); const scarf = new T.Mesh(new T.BoxGeometry(0.3, 0.05, 0.05), A.flatM('#ffd24a', 1.2)); scarf.position.set(0, 0.24, 0.1); g.add(scarf); story.follow = { g, d: 2, hop: 0 }; }
    // 5. the bulb that pops and the creature who comes with a ladder to change it (left wall, d 44)
    { const d = 44, q = V(-(WALL - 0.35), yb(d) + 3.2, -d); const bulb = new T.Mesh(new T.SphereGeometry(0.17, 10, 8), new T.MeshBasicMaterial({ color: kit.hot('#ffe4b0', 2.2), toneMapped: false })); bulb.position.copy(q); K.add(bulb);
      const lad = new T.Group(); const rail = A.toonM('#c8ccd8'); for (const z of [-0.2, 0.2]) { const r = new T.Mesh(new T.BoxGeometry(0.05, 2.8, 0.05), rail); r.position.set(0, 1.4, z); lad.add(r); } for (let k = 0; k < 7; k++) { const r = new T.Mesh(new T.BoxGeometry(0.04, 0.04, 0.4), rail); r.position.set(0, 0.3 + k * 0.38, 0); lad.add(r); } lad.rotation.z = -0.25; K.add(lad);
      const g = guy('#4ae8ff', { s: 1.1 }); K.add(g); story.bulb = { bulb, lad, g, q, t: 0 }; }
    crit.done();
    L.t = 0; L.fxN = 0; L.cheerT = 99; L.duckT = 99; L.flipT = 99;
  }

  /* ---------- update ---------- */
  function update(K, SC, st, dt, pos) {
    if (!L.crit) return;
    L.t += dt; const t = L.t, story = L.story;
    // what just happened: a gate opening (cheer), a bumper or flipper firing (duck), a great flipper (the sweeper dives)
    L.cheerT += dt; L.duckT += dt; L.flipT += dt;
    for (const f of st.fx) if (f.n > L.fxN) {
      L.fxN = f.n;
      if (['gateUp', 'latch', 'stairsDone', 'bridgeLatch', 'twinFire', 'saved', 'multiball', 'finish', 'flip'].includes(f.k)) L.cheerT = 0;
      if (['bump', 'bumper', 'sling', 'kick', 'great'].includes(f.k)) L.duckT = 0;
      if (f.k === 'great' || f.k === 'kick') L.flipT = 0;
    }
    for (const id in st.kick) if (st.kick[id].cool > 0 && TB.byId[id] && TB.byId[id].great) L.flipT = Math.min(L.flipT, 0);
    const lead = pos[0].z < pos[1].z ? pos[0] : pos[1], mid = pos[0].clone().add(pos[1]).multiplyScalar(0.5);
    const loose = (st.loose && st.loose[0]) || (st.flood && st.flood[0]);
    L.crit.react({ hero: [mid.x, mid.y, mid.z], cheer: L.cheerT, duck: L.duckT, flee: loose ? [loose.x, TB.yAt(loose.d), -loose.d, 1] : null });
    // the stall shutters go up at the start
    const up = Math.min(1, Math.max(0, (st.phase === 'open' ? st.phaseT - 2 : 99) / 3));
    for (const s of L.stalls) { s.sh.position.y = 2.2 + up * 1.2; s.sh.scale.y = 1 - up * 0.85; }
    // popcorn pops
    if (L.pop) { const m4 = new T.Matrix4(); for (let i = 0; i < 80; i += 7) { const ph = (t * 1.7 + i * 0.37) % 1; m4.makeTranslation(Math.sin(i * 3.1) * 0.5, 0.25 + Math.abs(Math.sin(ph * Math.PI)) * 0.9, Math.cos(i * 1.7) * 0.35); L.pop.kernels.setMatrixAt(i, m4); } L.pop.kernels.instanceMatrix.needsUpdate = true; }
    // the chair ride spins; chairs swing out
    if (L.ride) { L.ride.spin.rotation.y = t * 1.1; for (const c of L.ride.chairs) c.rotation.z = -0.45 - Math.sin(t * 0.8) * 0.05; }
    // balloons bob and sway
    if (L.bm) { const m4 = new T.Matrix4(); for (const b of L.balloons) { const sx = Math.sin(t * 0.9 + b.ph) * 0.25, sz = Math.cos(t * 0.7 + b.ph) * 0.2; m4.makeTranslation(b.base.x + sx, b.base.y + b.h + 0.4 + Math.sin(t * 1.3 + b.ph) * 0.08, b.base.z + sz); L.bm.setMatrixAt(b.i, m4); b.str.position.x = b.base.x + sx / 2; b.str.position.z = b.base.z + sz / 2; b.str.rotation.z = -sx / b.h; b.str.rotation.x = sz / b.h; } L.bm.instanceMatrix.needsUpdate = true; }
    if (L.flags) { const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(1, 1, 1), p = new T.Vector3(); L.flags.flags.forEach((f, i) => { e.set(Math.sin(t * 2.2 + i * 0.7) * 0.35, Math.PI / 2, 0); q.setFromEuler(e); p.set(f[0], f[1], f[2]); m4.compose(p, q, s); L.flags.fm.setMatrixAt(i, m4); }); L.flags.fm.instanceMatrix.needsUpdate = true; }
    if (L.bobber) for (const [i, b] of L.bobber.entries()) b.position.y += Math.sin(t * 2 + i) * 0.002;
    // the comet slide: riders whizz down the spiral on their mats, run back round to the door and climb up inside
    if (L.slide) {
      const Sl = L.slide; L.pennant.rotation.y = Math.sin(t * 3) * 0.4;
      for (const r of Sl.riders) {
        const c = (t / 7 + r.ph) % 1;
        if (c < 0.42) { const u = c / 0.42, p = Sl.helix(u, 1.75, 0.22), p2 = Sl.helix(Math.min(1, u + 0.01), 1.75, 0.22); r.r.visible = true; r.r.position.copy(p); r.r.lookAt(p2.x, p.y, p2.z); r.r.rotation.z = 0.35; r.who.userData.armL.rotation.x = r.who.userData.armR.rotation.x = -2.8; r.mat.visible = true; }
        else if (c < 0.5) { const u = (c - 0.42) / 0.08, a = Sl.helix(1, 1.75, 0.1), b = Sl.helix(1.1, 2.85, -0.2); r.r.position.lerpVectors(a, b, u); r.r.rotation.set(0, 0, 0); r.who.userData.armL.rotation.x = r.who.userData.armR.rotation.x = -2.8 * (1 - u); }
        else if (c < 0.7) { const u = (c - 0.5) / 0.2, a = Sl.helix(1.1, 2.85, -0.2), b = kit.V(-1.3, 0.05, 0.3); r.r.position.lerpVectors(a, b, u); r.r.position.y = Math.abs(Math.sin(u * 18)) * 0.12; r.r.rotation.set(0, Math.atan2(b.x - a.x, b.z - a.z), 0); r.who.userData.armL.rotation.x = Math.sin(t * 12) * 0.8; r.who.userData.armR.rotation.x = -Math.sin(t * 12) * 0.8; }
        else r.r.visible = false; // inside the tower, climbing the stairs
      }
    }
    // planet toss: a ring in a high arc every 2.4 s; every third one lands on a planet (the thrower cheers)
    if (L.toss) {
      const To = L.toss, c = (t % 2.4) / 2.4, n = Math.floor(t / 2.4), win = n % 3 === 2;
      const a = kit.V(0.55, 1.6, 1.9), b = win ? kit.V(-0.75, 1.35, -0.4) : kit.V(-0.4 + (n % 2) * 0.9, 0.85, -0.1);
      const u = Math.min(1, c / 0.45);
      To.ring.position.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u + Math.sin(u * Math.PI) * 1.0, a.z + (b.z - a.z) * u); To.ring.rotation.set(Math.PI / 2 + u * 6, 0, u * 3);
      if (u >= 1) To.ring.rotation.set(Math.PI / 2, 0, 0);
      To.ring.visible = c < 0.9;
      const tu = To.thrower.userData; tu.armR.rotation.x = c < 0.08 ? -2.2 * c / 0.08 : c < 0.15 ? -2.2 + (c - 0.08) / 0.07 * 2.6 : (win && c > 0.45 ? -2.8 + Math.sin(t * 10) * 0.3 : 0.2);
      tu.armL.rotation.x = win && c > 0.45 ? -2.8 - Math.sin(t * 10) * 0.3 : 0; tu.body.position.y = win && c > 0.45 ? Math.abs(Math.sin(t * 9)) * 0.12 : 0;
    }
    // 1. the hat: knocked off when a ball passes close; it falls, the creature picks it up and puts it back on
    if (story.hat) {
      const H = story.hat; H.t += dt;
      const near = pos.some(p => Math.hypot(p.x - H.q.x, p.z - H.q.z) < 2.3);
      if (near && H.t > 2.5) { H.t = 0; H.vy = 4.2; }
      if (H.t < 2.2) { H.vy -= 12 * dt; H.y = Math.max(-0.0, H.y + H.vy * dt); H.h.position.set(-0.3 - H.t * 0.2, H.y, 0.1); H.h.rotation.z = H.t * 4; H.g.userData.armL.rotation.x = -1.2; H.g.userData.armR.rotation.x = -1.2; H.g.userData.body.rotation.z = Math.sin(t * 14) * 0.1; }
      else { H.y = 0.62; H.h.position.set(0, 0.62 * 1.3 / 1.3, 0); H.h.rotation.z = 0; H.g.userData.armL.rotation.x = 0; H.g.userData.armR.rotation.x = Math.sin(t * 2) * 0.2; H.g.userData.body.rotation.z = 0; }
    }
    // 2. the sweeper: sweeps back and forth below the flippers; dives flat when a great flipper fires
    if (story.sweep) {
      const S2 = story.sweep; S2.x += S2.dir * dt * 0.7; if (Math.abs(S2.x) > 2.6) S2.dir *= -1;
      const q = kitP(S2.x, -0.6); S2.g.position.copy(q); S2.g.rotation.y = S2.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      S2.dive = L.flipT < 1.2 ? Math.min(1, S2.dive + dt * 8) : Math.max(0, S2.dive - dt * 2);
      const u = S2.g.userData; u.body.rotation.x = S2.dive * 1.3; u.body.position.y = -S2.dive * 0.15; u.armL.rotation.x = -S2.dive * 2.6; u.armR.rotation.x = -S2.dive * 2.6 + Math.sin(t * 6) * 0.4 * (1 - S2.dive);
    }
    // 3. the painter: dabs at the star; a ball rolling over squashes them flat; they pop up and walk off a few steps, leaving footprints
    if (story.paint) {
      const Pn = story.paint; const hit = pos.some(p => Math.hypot(p.x - Pn.q.x, p.z - Pn.q.z) < 1.2);
      if (hit) Pn.flat = 1;
      Pn.flat = Math.max(0, Pn.flat - dt * 0.6);
      Pn.g.scale.set(1 + Pn.flat * 0.6, 1 - Pn.flat * 0.85, 1 + Pn.flat * 0.6);
      Pn.g.userData.armR.rotation.x = -0.8 + Math.sin(t * 5) * 0.3;
      if (Pn.flat > 0 && Pn.flat < 0.5 && Pn.n < 30 && (Pn.walkT += dt) > 0.25) { Pn.walkT = 0; const m4 = new T.Matrix4().makeTranslation(Pn.q.x + (Pn.n % 2 ? 0.1 : -0.1), Pn.q.y + 0.03, Pn.q.z + 0.3 + Pn.n * 0.25); Pn.prints.setMatrixAt(Pn.n, m4); Pn.n++; Pn.prints.count = Pn.n; Pn.prints.instanceMatrix.needsUpdate = true; }
    }
    // 4. the follower keeps pace with the lead ball along the left shoulder, hopping
    if (story.follow) {
      const F = story.follow, want = Math.max(2, -lead.z - 2);
      F.d += Math.max(-4, Math.min(5, (want - F.d))) * dt * 0.9; const hop = Math.abs(Math.sin(t * 9)) * 0.25 * Math.min(1, Math.abs(want - F.d));
      const x = -(kit.RAIL + 0.9), q = kit.V(x, kit.yb(F.d) + kit.SH + hop, -F.d); F.g.position.copy(q); F.g.rotation.y = Math.PI;
      F.g.userData.armL.rotation.x = -0.3 + Math.sin(t * 9) * 0.6; F.g.userData.armR.rotation.x = -0.3 - Math.sin(t * 9) * 0.6;
    }
    // 5. the bulb: pops now and then; a creature carries a ladder over, climbs, changes it
    if (story.bulb) {
      const Bb = story.bulb, cyc = (t % 26) / 26; Bb.t = cyc;
      const off = cyc > 0.25 && cyc < 0.82;
      Bb.bulb.material.color.copy(kit.hot(off ? '#3a3028' : '#ffe4b0', off ? 1 : 2.2 + (cyc > 0.82 && cyc < 0.85 ? 2 : 0)));
      const at = Bb.q, walkIn = cyc < 0.35 ? 0 : cyc < 0.48 ? (cyc - 0.35) / 0.13 : cyc < 0.82 ? 1 : cyc < 0.95 ? 1 - (cyc - 0.82) / 0.13 : 0;
      const gx = at.x + 2.2, gz = at.z - 8 + walkIn * 8;
      Bb.lad.visible = Bb.g.visible = walkIn > 0;
      const climb = cyc > 0.5 && cyc < 0.8 ? Math.sin((cyc - 0.5) / 0.3 * Math.PI) : 0;
      Bb.lad.position.set(gx - 0.4, kit.yb(-gz) + kit.SH, gz + 0.3);
      Bb.g.position.set(gx - 0.2 - climb * 0.6, kit.yb(-gz) + kit.SH + climb * 2.1, gz); Bb.g.rotation.y = walkIn < 1 ? (cyc < 0.6 ? Math.PI : 0) : -Math.PI / 2;
      Bb.g.userData.armR.rotation.x = climb > 0.8 ? -2.6 + Math.sin(t * 8) * 0.3 : -0.4;
    }
  }
  const kitP = (x, d, h = 0) => kit.P(x, d, h);

  return { build, update, L };
})();
