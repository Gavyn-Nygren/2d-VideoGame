/* Pip & Bo - 43-1 Coin Drop: the world round stretch 1, THE COIN CHUTE. Loaded on demand with the 3D kit. Display only.

   Inside the coin mechanism, at hero size, in the dark of the cabinet. The chute twists down past little islands of
   circuit board on brass standoffs where the pixel creatures live. THREE LAYERS in every shot:
     NEAR   on and beside the chute: creatures sitting on the lips to watch, one fishing off the edge into the dark,
            stencilled lane numbers and scratches inside the walls, cables clipped along the outside, dust bunnies and
            a lost penny in the corners, cobwebs under the brackets, hanging cage lamps that throw real pools of light
     MIDDLE the islands and their stories (see below), cable looms hanging between them, a shaft of light from the slot
     FAR    the cabinet's inside: the back of the coin door with THE COIN SLOT high above (a blazing rectangle, the
            stretch's landmark, its beam falling across the chute ahead), light leaking round the door's frame, the
            stencilled walls, vents with the street lamp's orange through the slats, the power supply's glow, and far
            below, the warm shine of the gear works and the master gear turning in the dark
   THE STORIES (each its own little scene, each reacting to the heroes):
     1  the coin validator: a brass box beside the landing with a great glass eye that turns to follow each coin and
        flashes COIN OK; NIB, the nervous one, peeks round it and bolts when the coins land
     2  washing day: lines strung between three capacitors, pixel laundry flapping; one creature up a ladder pegging
        out a shirt, another chasing a runaway sock round the board
     3  the fin market: stalls between the fins of a heat sink, striped awnings, glowing goods, string lights, shoppers
     4  the graffiti artist: spraying GO PIP GO on a panel at the first bend (and the creatures' GO BO GO beside it)
     5  the tea party: three creatures round a foreign coin for a table, a teapot, a candle
     6  the picture house: an open-air cinema showing a pixel cartoon, a projector beam, rows of creatures watching
     7  the band on the speaker cone: drums, a guitarist, a singer; the cone pumps to the beat, dancers in the bowl
     8  the lamp repair crew: a flickering lamp over the chute, one creature up a ladder with a spanner, one holding it
     9  the queue at the battery: dim creatures queueing up the steps, the one on the terminal lit up bright, sliding
        off the far side all charged
     10 the paper-clip bridge: a lost paper clip as a bridge between two capacitors, creatures crossing it
     11 the hairclip slide: a pink hairclip leaning on a chip, creatures climbing up and sliding down into a dust bunny
     12 the sleeping moth: a huge moth asleep on a cable loom, Zs rising; a creature tiptoeing past with a duster
     13 the lucky coin: the engineer's board by the brink, notes and a lucky coin taped up in 1987, a gum blob
     14 the fisher: a creature sitting on the chute's lip with a rod, its line down into the dark
   ARCADECOIN_STRETCH1.build(K, sc) -> S1; ARCADECOIN_STRETCH1.update(K, S1, st, dt) */
'use strict';

const ARCADECOIN_STRETCH1 = (function () {
  const T = K3D.T, PR = ARCADECOIN_ROUTE, R = PR.R, L = PR.lists, A = PR.at, LIFE = ARCADECOIN_LIFE;
  const INK = '#120d14';
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const vv = a => new T.Vector3(a[0], a[1], a[2]);
  const W = PR.w;
  let rnd = ARCADE.rnd;
  // a level place beside the chute (not banked): s along, x right of the middle, y up from its floor
  const at = (s, x, y = 0) => vv(R.local(s, x, y));
  // turn an object to face the oncoming riders and the chute (a mix of the two)
  const face = (o, s, k = 0.5) => { const f = R.at(s), c = vv(f.p), d = c.sub(o.position).setY(0).normalize().multiplyScalar(1 - k).addScaledVector(vv(f.t).setY(0).normalize(), -k); o.rotation.y = Math.atan2(d.x, d.z); return o; };
  const toon = (col, o) => ARCADE.toonM(col, o);
  const mk = (geo, mat, inkW = 0.6) => K3D.mesh(geo, mat, { ink: INK, inkW });

  /* ---------- an island: a slab of circuit board on brass standoffs, LEDs round its edge ---------- */
  function island(K, sc, p, w, d, o = {}) {
    const g = new T.Group(); g.position.copy(p); if (o.yaw != null) g.rotation.y = o.yaw;
    const top = K3D.mat('s1-pcbTop|' + (o.col || '') + (o.seed || 0), () => K3D.toon('#ffffff', { map: ARCADE.pcbTex({ col: o.col || '#1f6a3c', seed: o.seed || 0 }) }));
    const side = K3D.mat('s1-pcbSide', () => K3D.toon('#14402a'));
    const slab = mk(new T.BoxGeometry(w, 0.36, d), [side, side, top, side, side, side], 0.8); slab.position.y = -0.18; g.add(slab);
    // the board's texture would repeat across a big slab: scale its uvs to the slab's size
    const uv = slab.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 14, uv.getY(i) * d / 14);
    const legH = o.legs || 9;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = mk(K3D.geo('s1-standoff', () => new T.CylinderGeometry(0.28, 0.28, 1, 6).translate(0, -0.5, 0)), K3D.mat('s1-brassD', () => K3D.toon('#a07a3a', { map: ARCADE.brassTex('#a07a3a') })), 0.5);
      leg.scale.y = legH; leg.position.set(sx * (w / 2 - 0.7), -0.36, sz * (d / 2 - 0.7)); g.add(leg);
      const nut = new T.Mesh(K3D.geo('s1-nut', () => new T.CylinderGeometry(0.42, 0.42, 0.18, 6)), K3D.mat('s1-nutM', () => K3D.toon('#c8ccd4'))); nut.position.set(sx * (w / 2 - 0.7), 0.06, sz * (d / 2 - 0.7)); g.add(nut);
    }
    K.add(g); g.updateMatrixWorld(true);
    // LEDs along the edges (in the world, so they join the one instanced family)
    const edge = [[-w / 2, -d / 2, w / 2, -d / 2], [w / 2, -d / 2, w / 2, d / 2], [w / 2, d / 2, -w / 2, d / 2], [-w / 2, d / 2, -w / 2, -d / 2]];
    const ledCol = o.led || ARCADE.pick(['#5aff8a', '#4ae8ff', '#ffe24a', '#ff5ad6']);
    for (const [x0, z0, x1, z1] of edge) { const a = g.localToWorld(new T.Vector3(x0, 0.06, z0)), b = g.localToWorld(new T.Vector3(x1, 0.06, z1)); sc.B.line(a.toArray(), b.toArray(), 1.1, [ledCol, '#ffffff'], { size: 0.06, speed: 2, step: 0.4 }); }
    g.userData.w = w; g.userData.d = d;
    return g;
  }
  // a world point from an island's own coordinates
  const on = (g, x, y, z) => { g.updateMatrixWorld(true); return g.localToWorld(new T.Vector3(x, y, z)); };
  // add creatures standing about on an island (instanced crowd)
  function crowd(sc, g, list) { for (const [x, z, o] of list) { const p = on(g, x, 0, z); sc.crit.add(p.x, p.y, p.z, Object.assign({ yaw: g.rotation.y + (o && o.yaw || 0) }, o || {})); } }

  /* ---------- the hanging cage lamps over the chute ---------- */
  function cageLamp(K, sc, p, o = {}) {
    const g = new T.Group(); g.position.copy(p); g.userData.live = true;
    const cord = new T.Mesh(K3D.geo('s1-cord', () => new T.CylinderGeometry(0.03, 0.03, 30, 5).translate(0, 15, 0)), K3D.mat('s1-cordM', () => K3D.toon('#2a2630'))); g.add(cord);
    const shade = mk(K3D.geo('s1-shade', () => new T.CylinderGeometry(0.22, 1.0, 0.8, 20, 1, true).translate(0, 0.1, 0)), K3D.mat('s1-shadeM', () => K3D.toon(o.col || '#2f6a4a', { side: T.DoubleSide })), 0.7); g.add(shade);
    const inner = new T.Mesh(K3D.geo('s1-shadeIn', () => new T.CylinderGeometry(0.2, 0.96, 0.76, 20, 1, true).translate(0, 0.1, 0)), K3D.mat('s1-shadeInM', () => K3D.flat(hot('#ffe8c0', 0.9), { side: T.BackSide }))); g.add(inner);
    const bulb = new T.Mesh(K3D.geo('s1-bulb', () => new T.SphereGeometry(0.26, 14, 10)), K3D.mat('s1-bulbM', () => K3D.flat(hot('#fff0d0', 3)))); bulb.position.y = -0.25; g.add(bulb);
    for (let k = 0; k < 6; k++) { const w = new T.Mesh(K3D.geo('s1-cage', () => new T.TorusGeometry(0.42, 0.015, 4, 12, Math.PI).rotateZ(Math.PI / 2)), K3D.mat('s1-cordM', () => K3D.toon('#2a2630'))); w.position.y = -0.3; w.rotation.y = k / 6 * Math.PI; g.add(w); }
    K.add(g);
    sc.G.add(p.x, p.y - 0.3, p.z, 1.3, '#ffe0b0', 0.4, o.flick ? 1 : 0);
    const li = sc.lamps.add(new T.Vector3(p.x, p.y - 0.8, p.z), '#ffd8a8', o.k || 2.4, o.dist || 15, { flick: o.flick || 0 });
    return { g, li, ph: rnd() * 10, flick: o.flick };
  }

  /* ---------- far layer: the cabinet's inside ---------- */
  function cabinet(K, sc, S1) {
    // the walls: huge dark panels (painted chipboard) with stencilled words, vents and wiring looms
    const wallTex = K3D.paint('s1-wall', 512, 512, (c, w, h) => {
      c.fillStyle = '#1c181e'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${rnd() < 0.5 ? '120,100,80' : '0,0,0'},${rnd() * 0.12})`; c.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 2 + rnd() * 3); }
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, h - 4);
    }, { repeat: true });
    const wallM = K3D.toon('#ffffff', { map: wallTex, emissive: '#2a2028', emissiveIntensity: 0.6 });
    const wall = (cx, cy, cz, w, h, yaw) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), wallM); m.position.set(cx, cy, cz); m.rotation.y = yaw; const uv = m.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 60, uv.getY(i) * h / 60); K.add(m); return m; };
    wall(40, -60, 60, 360, 300, Math.PI);        // the front (the coin door's side), behind the landing
    wall(-120, -120, -180, 520, 420, Math.PI / 2); // the left side
    wall(200, -120, -180, 520, 420, -Math.PI / 2); // the right side
    // stencilled words on the walls (lit faintly by the spill of the lamps)
    const sten = (txt, p, yaw, w, col = '#d8d0c0') => { const tx = K3D.paint('s1-sten|' + txt, 1024, 160, (c, cw, ch) => { c.clearRect(0, 0, cw, ch); c.font = 'bold 110px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.globalAlpha = 0.55; c.fillText(txt, cw / 2, ch / 2); c.globalAlpha = 1; c.fillStyle = '#1c181e'; for (let i = 0; i < 300; i++) c.fillRect(Math.random() * cw, Math.random() * ch, 3 + Math.random() * 8, 2); }); const m = new T.Mesh(new T.PlaneGeometry(w, w * 0.156), K3D.toon('#ffffff', { map: tx, transparent: true, emissive: '#ffffff', emissiveIntensity: 0.25, depthWrite: false })); m.position.copy(p); m.rotation.y = yaw; K.add(m); };
    sten('MODEL 43  ·  SERIAL 004317', new T.Vector3(-119, 10, -120), Math.PI / 2, 120);
    sten('THIS SIDE UP  ↑', new T.Vector3(199, -10, -60), -Math.PI / 2, 90);
    sten('DANGER  ·  HIGH VOLTAGE INSIDE', new T.Vector3(-119, -70, -260), Math.PI / 2, 140, '#ffd23a');
    sten('KEEP DRY', new T.Vector3(199, 30, -230), -Math.PI / 2, 60);
    wall(40, -160, -440, 360, 420, 0);           // the back, far beyond the gear works
    // boards bolted to the walls: big green and blue circuit boards, chips and capacitors on them, rows of LEDs
    // ticking over (the game's own brain, half awake), so every distance has something alive in it
    const board = (p, yaw, w, h, seed) => {
      const g = new T.Group(); g.position.copy(p); g.rotation.y = yaw; K.add(g);
      const col = ARCADE.pick(['#1f6a3c', '#1a4a6a', '#22603a', '#3a2a5a']);
      const pm = K3D.toon('#ffffff', { map: ARCADE.pcbTex({ col, seed }), emissive: '#ffffff', emissiveIntensity: 0.35 }); pm.emissiveMap = pm.map;
      const slab = new T.Mesh(new T.BoxGeometry(w, h, 0.8), pm); slab.position.z = 0.5; g.add(slab);
      for (const [x, y] of [[-w / 2 + 1.5, -h / 2 + 1.5], [w / 2 - 1.5, -h / 2 + 1.5], [-w / 2 + 1.5, h / 2 - 1.5], [w / 2 - 1.5, h / 2 - 1.5]]) { const so = new T.Mesh(K3D.geo('s1-wstand', () => new T.CylinderGeometry(0.7, 0.7, 1, 8).rotateX(Math.PI / 2)), K3D.mat('s1-wstandM', () => K3D.toon('#d8b060'))); so.position.set(x, y, 0.2); g.add(so); }
      const nChip = 2 + Math.floor(rnd() * 4);
      for (let k = 0; k < nChip; k++) { const cw = 3 + rnd() * 6, ch = ARCADE.chip(K, { w: cw, d: cw * (0.4 + rnd() * 0.5), h: 0.8, col: '#1a1a20' }); ch.rotation.x = Math.PI / 2; ch.position.set((rnd() - 0.5) * (w - cw - 2), (rnd() - 0.5) * (h - 6), 1.2); g.add(ch); }
      for (let k = 0; k < 3 + rnd() * 4; k++) { const c = ARCADE.cap(K, { r: 0.8 + rnd() * 1.2, h: 2 + rnd() * 3, col: ARCADE.pick(['#2a4a9a', '#1a1a22', '#3a6a3a']) }); c.rotation.x = Math.PI / 2; c.position.set((rnd() - 0.5) * (w - 4), (rnd() - 0.5) * (h - 4), 0.9); g.add(c); }
      g.updateMatrixWorld(true);
      // LED rows: some steady, some ticking, some chasing
      for (let r = 0; r < 2 + rnd() * 3; r++) {
        const y = (rnd() - 0.5) * (h - 3), x0 = -w / 2 + 2 + rnd() * 3, n = 6 + Math.floor(rnd() * 12), col2 = ARCADE.pick(ARCADE.NEON), mode = rnd();
        for (let k = 0; k < n; k++) { const q = g.localToWorld(new T.Vector3(x0 + k * 0.9, y, 1.1)); sc.B.add(q.x, q.y, q.z, col2, { size: 0.32, speed: mode < 0.4 ? 0 : 1.5 + rnd() * 3, phase: mode < 0.7 ? rnd() * 9 : -k * 0.5, blink: mode > 0.4 && mode < 0.7 }); }
      }
      const c0 = g.localToWorld(new T.Vector3(0, 0, 3));
      sc.G.add(c0.x, c0.y, c0.z, Math.max(w, h) * 0.9, col === '#1a4a6a' ? '#4ae8ff' : '#5aff8a', 0.07, 0);
      return g;
    };
    for (const [z, y, w, h] of [[20, 0, 30, 22], [-30, -34, 40, 26], [-80, 10, 26, 34], [-140, -40, 44, 30], [-200, 0, 30, 24], [-260, -60, 40, 36], [-320, -20, 28, 22]]) board(new T.Vector3(-119, y, z), Math.PI / 2, w, h, Math.floor(rnd() * 9));
    for (const [z, y, w, h] of [[10, -30, 34, 24], [-70, 18, 28, 20], [-190, -10, 36, 28], [-250, -70, 30, 40], [-330, 10, 40, 26]]) board(new T.Vector3(199, y, z), -Math.PI / 2, w, h, Math.floor(rnd() * 9));
    for (const [x, y, w, h] of [[-80, -60, 50, 34], [-10, 0, 36, 26], [70, -90, 60, 40], [140, -30, 40, 30], [20, -180, 70, 44]]) board(new T.Vector3(x, y, -439), 0, w, h, Math.floor(rnd() * 9));
    // cables dropping out of the dark above, in bundles, some with a tag, some with a creature riding a clip
    for (let k = 0; k < 26; k++) {
      const x = -100 + rnd() * 280, z = 40 - rnd() * 440, top = 90, bot = -20 - rnd() * 80, sway = (rnd() - 0.5) * 16;
      { let hit = false; for (let s2 = -10; s2 < A.gears; s2 += 5) { const f2 = R.at(Math.max(0, s2)); if (Math.hypot(f2.p[0] - x, f2.p[2] - z) < 16 && bot < f2.p[1] + 12) { hit = true; break; } } if (hit) continue; } // keep the chute's own sky clear
      K.add(ARCADE.cable(K, [[x, top, z], [x + sway * 0.4, (top + bot) / 2, z + sway * 0.2], [x + sway, bot, z + sway * 0.5]], { r: 0.3 + rnd() * 0.3, clips: 0, labels: k % 4 === 0 }));
      if (k % 3 === 0) { const c = sc.crit; c.add(x + sway, bot - 0.3, z + sway * 0.5, { kind: ARCADE.pick([3, 3, 0]), act: 'idle', s: 1.6 }); }
    }
    // vents: slats with the street lamp's orange light coming through in shafts
    for (const [p, yaw, n] of [[new T.Vector3(-119, -20, -40), Math.PI / 2, 9], [new T.Vector3(199, -40, -150), -Math.PI / 2, 9]]) {
      const g = new T.Group(); g.position.copy(p); g.rotation.y = yaw;
      for (let i = 0; i < n; i++) { const sl = new T.Mesh(new T.PlaneGeometry(26, 0.9), K3D.flat(hot('#ff9a40', 1.6))); sl.position.set(0, i * 2.2 - n, 0.2); g.add(sl); const bar = new T.Mesh(new T.BoxGeometry(27, 1.1, 0.6), K3D.toon('#2a2428')); bar.position.set(0, i * 2.2 - n + 1.1, 0.4); g.add(bar); }
      K.add(g); g.updateMatrixWorld(true);
      const from = g.localToWorld(new T.Vector3(0, 0, 0.5)), to = g.localToWorld(new T.Vector3(-12, -30, 70));
      ARCADE.shaft(K, from.toArray(), to.toArray(), 9, '#ff9a40', 0.12);
      sc.G.add(from.x, from.y, from.z, 40, '#ff8a3a', 0.18, 0);
    }

    // THE COIN SLOT: the back of the coin door on the front wall, a blazing rectangle high above the landing, light
    // round the door's frame, the lock's great cam, the coin-return chute; its beam falls across the chute ahead
    {
      const door = new T.Group(); door.position.set(6, 30, 58); door.rotation.y = Math.PI; K.add(door);
      const steel = K3D.toon('#3a3a44', { map: ARCADE.grimeTex(), emissive: '#202028', emissiveIntensity: 0.5 });
      const panel = mk(new T.BoxGeometry(70, 54, 1.4), steel, 1); door.add(panel);
      // ribs and bolts
      for (const x of [-30, -10, 10, 30]) { const rb = mk(new T.BoxGeometry(1.6, 52, 1.4), steel, 0.6); rb.position.set(x, 0, 1.2); door.add(rb); }
      // the frame's leak of light (the arcade's lamps behind the door)
      for (const [x, y, w, h] of [[0, 27.4, 72, 0.5], [0, -27.4, 72, 0.5], [-35.4, 0, 0.5, 55], [35.4, 0, 0.5, 55]]) { const lk = new T.Mesh(new T.PlaneGeometry(w, h), K3D.flat(hot('#ffb870', 2.2))); lk.position.set(x, y, 0.9); door.add(lk); }
      // the slot: a deep chrome bezel, the rectangle blazing white-gold
      const bez = mk(new T.BoxGeometry(16, 5, 3), K3D.toon('#c8ccd8', { emissive: '#8890a0', emissiveIntensity: 0.4 }), 1); bez.position.set(0, 12, 1.6); door.add(bez);
      const slot = new T.Mesh(new T.PlaneGeometry(12, 1.8), K3D.flat(hot('#fff4d8', 6))); slot.position.set(0, 12, 3.15); door.add(slot);
      const label = new T.Mesh(new T.PlaneGeometry(10, 2.4), K3D.toon('#ffffff', { map: K3D.paint('s1-slotlabel', 512, 128, (c, w, h) => { c.fillStyle = '#d8d0b8'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a2428'; c.font = 'bold 54px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('25¢  ·  INSERT', w / 2, h / 2 + 4); }), emissive: '#ffffff', emissiveIntensity: 0.3 })); label.position.set(0, 7.6, 2.3); door.add(label);
      // the lock: a great cylinder and its cam bar
      const lock = mk(new T.CylinderGeometry(3, 3, 2.4, 24).rotateX(Math.PI / 2), K3D.toon('#b8bcc8'), 0.8); lock.position.set(22, -6, 1.8); door.add(lock);
      const cam = mk(new T.BoxGeometry(11, 1.6, 0.8), K3D.toon('#8a8e98'), 0.6); cam.position.set(18, -6, 3.2); cam.rotation.z = 0.4; door.add(cam);
      // the coin return: a chute bending down and away into the dark
      const ret = new T.CatmullRomCurve3([new T.Vector3(-14, 9, 2), new T.Vector3(-18, 0, 6), new T.Vector3(-20, -14, 8), new T.Vector3(-22, -30, 6)]);
      door.add(mk(new T.TubeGeometry(ret, 40, 1.4, 10, false), K3D.toon('#c89a48', { map: ARCADE.brassTex('#c89a48') }), 0.7));
      // a service tag hanging off the lock
      const tag = ARCADE.decal(K, 'tag', 3, 1.2, { text: 'KEY #43', seed: 2 }); tag.position.set(22, -10.5, 3.2); door.add(tag);
      door.updateMatrixWorld(true);
      const sp = door.localToWorld(new T.Vector3(0, 12, 3.5));
      sc.G.add(sp.x, sp.y, sp.z - 1, 13, '#fff0c8', 0.3, 0); sc.G.add(sp.x, sp.y, sp.z - 0.5, 7, '#ffffff', 0.8, 0);
      // the beam: from the slot down across the chute ahead (the riders ride through it near the first wire)
      const hit = at(A.wire1 - 8, 0, 0);
      ARCADE.shaft(K, sp.toArray(), [hit.x, hit.y - 4, hit.z], 2.2, '#fff0d0', 0.16);
      ARCADE.shaft(K, sp.toArray(), [hit.x + 10, hit.y - 30, hit.z - 20], 3.6, '#ffe8c0', 0.07);
      sc.lamps.add(at(A.wire1 - 8, 0, 3), '#fff0d0', 3.2, 18);
      S1.slot = { sp };
    }

    // the power supply far off on the right: a transformer humming in its own glow, a fuse block, a fat cable away
    {
      const g = new T.Group(); g.position.set(170, -60, -120); K.add(g);
      const core = mk(new T.BoxGeometry(20, 22, 14), K3D.toon('#3a3640', { map: ARCADE.grimeTex() }), 1); g.add(core);
      for (const sx of [-1, 1]) { const coil = mk(new T.CylinderGeometry(6, 6, 18, 28), K3D.toon('#c86a30', { map: ARCADE.copperTex(), emissive: '#ff7a30', emissiveIntensity: 0.25 }), 1); coil.position.set(sx * 7, 0, 9); g.add(coil); }
      sc.G.add(170, -60, -105, 50, '#ff8a3a', 0.25, 0.1);
      const lbl = ARCADE.decal(K, 'warn', 12, 6, { text: 'MAINS', seed: 9 }); lbl.position.set(0, 14, 7.2); g.add(lbl);
    }
    // far below: the gear works' warm shine, and the master gear turning slowly in the dark (the next stretch)
    {
      const mg = ARCADE.gear(K, { r: 46, teeth: 96, th: 5, spokes: 7, col: '#b8863a' });
      mg.position.set(-10, -150, -300); mg.rotation.y = 0.3; mg.userData.live = true; K.add(mg); S1.master = mg;
      for (let i = 0; i < 40; i++) { const a = rnd() * 6.28, r = 20 + rnd() * 90; sc.G.add(-10 + Math.cos(a) * r, -130 - rnd() * 60, -280 + Math.sin(a) * r * 0.6, 8 + rnd() * 14, ARCADE.pick(['#ffb050', '#ff8a3a', '#ffd27a']), 0.22, 0.2); }
      const g2 = ARCADE.gear(K, { r: 18, teeth: 40, th: 3, col: '#9a7034' }); g2.position.set(44, -125, -320); g2.rotation.y = -0.5; g2.userData.live = true; K.add(g2); S1.g2 = g2;
    }
    // the screen, very far below: a cold blue-violet glow where the coin box lies under the picture tube
    sc.G.add(40, -340, 380, 260, '#5a6aff', 0.18, 0);
    // wiring looms: fat bundles hanging in long curves across the dark between the walls and the islands
    const loom = (pts, n = 5) => { for (let k = 0; k < n; k++) { const off = new T.Vector3((rnd() - 0.5) * 0.8, (rnd() - 0.5) * 0.8, (rnd() - 0.5) * 0.8); K.add(ARCADE.cable(K, pts.map(p => p.clone().add(off).toArray()), { r: 0.22 + rnd() * 0.12, clips: 0, labels: k === 0 })); } };
    loom([new T.Vector3(-119, 20, -20), new T.Vector3(-70, -2, -20), new T.Vector3(-30, 6, -40)]);
    loom([new T.Vector3(-119, -10, -90), new T.Vector3(-60, -30, -100), new T.Vector3(10, -18, -110)]);
    loom([new T.Vector3(199, 0, -40), new T.Vector3(140, -26, -60), new T.Vector3(100, -14, -70)]);
    loom([new T.Vector3(199, -30, -200), new T.Vector3(140, -50, -210), new T.Vector3(100, -36, -220)]);
    loom([new T.Vector3(40, 50, 57), new T.Vector3(48, 10, 20), new T.Vector3(40, -20, -20), new T.Vector3(20, -10, -50)], 6);
    loom([new T.Vector3(-40, 40, 57), new T.Vector3(-30, 0, 30), new T.Vector3(-26, -12, 10)], 4);
  }

  /* ---------- the near layer along the chute ---------- */
  function near(K, sc, S1) {
    const s0 = 0, s1 = A.brink;
    // creatures on the lips, watching (some wave, some cheer, one asleep)
    for (let s = 14; s < s1 - 6; s += 9 + rnd() * 7) {
      if (L.springs.some(sp => s > sp.s0 - 3 && s < sp.s1 + 3) || L.wires.some(w => Math.abs(w.s - s) < 3)) continue;
      const sx = rnd() < 0.5 ? -1 : 1, p = vv(R.bankLocal(s, sx * (W(s) + 0.42), 1.28));
      const f = R.at(s);
      sc.crit.add(p.x, p.y, p.z, { kind: ARCADE.pick([0, 0, 1, 4, 5, 3]), act: ARCADE.pick(['sit', 'sit', 'wave', 'cheer', 'idle', 'sleep']), yaw: f.yaw + Math.PI + sx * 0.6, s: 0.9 + rnd() * 0.3 });
    }
    // stencilled lane numbers inside the walls, a scratch here and there
    const stenTex = n => K3D.paint('s1-lane|' + n, 256, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.font = 'bold 84px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(40,24,10,0.6)'; c.fillText('C-' + String(n).padStart(2, '0'), w / 2, h / 2); c.fillStyle = 'rgba(200,160,90,0.8)'; for (let i = 0; i < 60; i++) c.fillRect(Math.random() * w, Math.random() * h, 4, 2); });
    let n = 1;
    for (let s = 8; s < s1; s += 24, n++) for (const sx of [-1, 1]) {
      if (L.splits.some(sp => s > sp.s0 && s < sp.s1)) continue;
      const m = new T.Mesh(K3D.geo('s1-laneG', () => new T.PlaneGeometry(1.4, 0.7)), K3D.toon('#ffffff', { map: stenTex(n), transparent: true, depthWrite: false, polygonOffset: -2 }));
      const f = R.at(s); m.position.copy(vv(R.bankLocal(s, sx * (W(s) + 0.1), 0.45, f)));
      const nrm = vv(f.br).multiplyScalar(-sx).add(vv(f.bu).multiplyScalar(0.35)).normalize();
      m.lookAt(m.position.clone().add(nrm)); K.add(m);
    }
    // a few service notes taped inside the walls (the engineer's), a gum blob on a lip, a lost penny in a corner
    for (const [s, sx, seed] of [[46, -1, 0], [128, 1, 2], [205, -1, 6], [270, 1, 10]]) {
      const f = R.at(s), d = ARCADE.decal(K, 'note', 0.8, 0.8, { seed }); d.position.copy(vv(R.bankLocal(s, sx * (W(s) + 0.14), 0.62, f)));
      d.lookAt(d.position.clone().add(vv(f.br).multiplyScalar(-sx).add(vv(f.bu).multiplyScalar(0.3)))); d.rotateZ((rnd() - 0.5) * 0.3); K.add(d);
    }
    for (const s of [58, 176, 240]) { const f = R.at(s), sx = s % 2 ? 1 : -1, g = new T.Mesh(K3D.geo('s1-gum', () => new T.SphereGeometry(0.18, 12, 8).scale(1, 0.45, 1)), toon('#ff8ab8')); g.position.copy(vv(R.bankLocal(s, sx * (W(s) + 0.42), 1.28, f))); K.add(g); }
    for (const s of [36, 150, 226]) { const f = R.at(s), sx = s % 3 ? 1 : -1, c = mk(K3D.geo('s1-penny', () => new T.CylinderGeometry(0.3, 0.3, 0.06, 18)), toon('#c87a48', { emissive: '#c87a48', emissiveIntensity: 0.2 }), 0.5); c.position.copy(vv(R.bankLocal(s, sx * (W(s) - 0.1), 0.2, f))); c.rotation.set(0.6, rnd() * 3, 0.9 * sx); K.add(c); }
    // dust bunnies against the walls: grey fluff, one instanced family
    {
      const geo = new T.IcosahedronGeometry(0.3, 1); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.75 + Math.sin(i * 12.9898) * 0.25; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k); } geo.computeVertexNormals();
      const list = []; for (let s = 3; s < s1; s += 2.5 + rnd() * 5) list.push([s, (rnd() < 0.5 ? -1 : 1), 0.6 + rnd() * 0.9]);
      const im = new T.InstancedMesh(geo, toon('#8a8490'), list.length), m4 = new T.Matrix4(), q = new T.Quaternion(), sc3 = new T.Vector3();
      list.forEach(([s, sx, k], i) => { const f = R.at(s); m4.compose(vv(R.bankLocal(s, sx * (W(s) + 0.05), 0.12, f)), q.setFromAxisAngle(new T.Vector3(0, 1, 0), rnd() * 6), sc3.set(k, k, k)); im.setMatrixAt(i, m4); });
      K.add(im);
    }
    // cables clipped along the outside of the chute, in runs, in different colours
    for (let s = 2; s < s1 - 10; s += 34) {
      const e = Math.min(s1 - 2, s + 30);
      for (const [sx, y, col] of [[-1, 0.15, '#3a6ad8'], [-1, -0.25, '#e8c040'], [1, 0.0, '#d84a3a'], [1, -0.35, '#2a2a30']]) {
        const pts = []; for (let q = s; q <= e; q += 3) pts.push(R.bankLocal(q, sx * (W(q) + 0.82), y));
        K.add(ARCADE.cable(K, pts, { r: 0.08, col, clips: Math.round((e - s) / 5), labels: rnd() < 0.3 }));
      }
    }
    // cobwebs under the brackets (dew of solder)
    for (const s of [30, 90, 138, 198, 258]) { const p = vv(R.local(s, (s % 2 ? 1 : -1) * 2.5, -1.6)); K.add(ARCADE.web(K, p.toArray(), 1.6, { yaw: R.at(s).yaw })); }
    // the hanging cage lamps, every 18 m, alternating a little side to side (one of them flickers)
    S1.lamps = [];
    for (let s = 6; s < s1; s += 18) { if (Math.abs(s - 168) < 6) continue; const sx = (s / 18) % 2 ? 1 : -1, p = vv(R.local(s, sx * (W(s) + 2.4), 7.2)); S1.lamps.push(cageLamp(K, sc, p, { flick: Math.abs(s - 222) < 9 ? 0.3 : 0 })); }
  }

  /* ---------- the stories ---------- */
  function stories(K, sc, S1) {
    const U = S1.ups = [];
    const lampAt = (p, col, k = 2.2, dist = 12, o) => sc.lamps.add(p, col, k, dist, o);

    // 1 THE COIN VALIDATOR (left of the landing) and NIB
    {
      const p = at(6, -11, -1.2), g = new T.Group(); g.position.copy(p); face(g, 10, 0.2); K.add(g);
      const brass = toon('#c89a48', { map: ARCADE.brassTex('#c89a48') });
      const body = mk(new T.BoxGeometry(6, 5, 4.5), brass, 1); body.position.y = 2.5; g.add(body);
      const coilM = toon('#c86a30', { map: ARCADE.copperTex() });
      for (let i = 0; i < 5; i++) { const c = mk(K3D.geo('s1-coil', () => new T.TorusGeometry(1.1, 0.22, 8, 24).rotateX(Math.PI / 2)), coilM, 0.4); c.position.set(-1.4, 5.2 + i * 0.36, -0.6); g.add(c); }
      const plate = ARCADE.decal(K, 'tag', 2.6, 0.8, { text: 'VALIDATOR II', seed: 4 }); plate.position.set(1.2, 4.3, 2.27); g.add(plate);
      // the eye: a glass dome in a chrome ring; the iris turns to follow the coins
      const ring = mk(new T.TorusGeometry(1.2, 0.2, 10, 32), toon('#d8dce8'), 0.7); ring.position.set(0, 2.4, 2.3); g.add(ring);
      const eye = new T.Group(); eye.position.set(0, 2.4, 2.1); g.add(eye); eye.userData.live = true;
      const ball = mk(new T.SphereGeometry(1.1, 24, 16), toon('#f2ece0'), 0.6); eye.add(ball);
      const iris = new T.Mesh(new T.CircleGeometry(0.55, 24), K3D.flat(hot('#ff4a3a', 1.4))); iris.position.z = 1.08; eye.add(iris);
      const pup = new T.Mesh(new T.CircleGeometry(0.24, 16), K3D.flat('#16121a')); pup.position.z = 1.1; eye.add(pup);
      const ok = new T.Mesh(new T.PlaneGeometry(1.8, 0.6), K3D.flat(hot('#ff4a3a', 1.6), { map: K3D.paint('s1-coinok', 256, 96, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#000'; c.font = 'bold 56px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('COIN OK', w / 2, h / 2 + 4); }) }));
      ok.position.set(0, 0.7, 2.27); g.add(ok); ok.userData.live = true;
      // a gauge with a needle that wobbles
      const gauge = mk(new T.CylinderGeometry(0.6, 0.6, 0.2, 24).rotateX(Math.PI / 2), toon('#e8e4d4'), 0.5); gauge.position.set(2.2, 3.6, 2.3); g.add(gauge);
      const needle = new T.Mesh(new T.BoxGeometry(0.05, 0.5, 0.03).translate(0, 0.22, 0), K3D.flat('#d83a2a')); needle.position.set(2.2, 3.6, 2.42); g.add(needle); needle.userData.live = true;
      // a ladder up its side and a worker creature asleep on top (it's night)
      const lad = ladder(K, 5.4); lad.position.set(3.2, 0, 1); g.add(lad);
      g.updateMatrixWorld(true);
      { const q = g.localToWorld(new T.Vector3(1.4, 5.0, -0.6)); sc.crit.add(q.x, q.y, q.z, { kind: 4, act: 'sleep', yaw: g.rotation.y, col: '#ffb050' }); }
      // its stand: a brass bracket down into the dark
      const leg = mk(new T.CylinderGeometry(0.5, 0.5, 14, 8).translate(0, -7, 0), toon('#7a6040'), 0.5); g.add(leg);
      lampAt(g.localToWorld(new T.Vector3(0, 3, 4)), '#ff7a5a', 1.6, 9);
      // Nib, behind the validator: peeking round its corner, hiding as the coins land, bolting off along the bracket
      const nib = LIFE.nib(); nib.position.set(-3.4, 0, 1.6); g.add(nib);
      U.push((t, st) => {
        const cps = st.phase === 'intro' ? -9 : st.s;
        // the eye follows the nearer coin
        const c = sc.coins.coins[0].g.position, ep = g.localToWorld(new T.Vector3(0, 2.4, 2.1)), d = c.clone().sub(ep);
        const local = g.worldToLocal(c.clone()).sub(new T.Vector3(0, 2.4, 2.1));
        eye.rotation.set(-Math.atan2(local.y, Math.hypot(local.x, local.z)) * 0.6, Math.atan2(local.x, local.z) * 0.6, 0);
        if (st.phase === 'intro') eye.rotation.set(Math.sin(t * 0.5) * 0.2, Math.sin(t * 0.7) * 0.5, 0);
        const good = cps >= 0 && cps < 16;
        ok.material.color.copy(hot(good ? '#5aff8a' : '#ff4a3a', good ? 2.2 : 1.0 + 0.4 * Math.sin(t * 3)));
        iris.material.color.copy(hot(good ? '#5aff8a' : '#ff4a3a', 1.4));
        needle.rotation.z = Math.sin(t * 1.7) * 0.4 + Math.sin(t * 13) * 0.05 + (good ? -0.8 : 0);
        // Nib: peeks, hides when the coins land, bolts down the bracket, peeks again later
        const ph = st.phase === 'intro' ? 'peek' : cps < 1.5 ? 'hide' : cps < 30 ? 'flee' : 'peek';
        if (ph === 'flee') { const u = Math.min(1, (cps - 1.5) / 10); nib.position.set(-3.4 - u * 2.5, -u * 3, 1.6 - u * 3.5); nib.rotation.y = -2.4; }
        else if (ph === 'peek' && cps > 30) { nib.position.set(-5.6, -3, -1.6); nib.rotation.y = 0.5; }
        else { nib.position.set(-3.4, 0, 1.6); nib.rotation.y = 0.7; }
        LIFE.nibPose(nib, ph, t);
      });
      S1.nib = nib;
    }

    // 14 THE FISHER on the right lip near the landing
    {
      const s = 13, f = R.at(s), p = vv(R.bankLocal(s, W(s) + 0.42, 1.3, f));
      const a = LIFE.actor({ kind: 'blip', col: '#4ae8ff', col2: '#ffe24a', hat: 'cap', s: 0.95 }); a.position.copy(p); a.rotation.y = f.yaw + Math.PI / 2 + 0.3; K.add(a);
      const rod = new T.Group(); rod.position.copy(p).add(new T.Vector3(0, 0.3, 0)); K.add(rod); rod.userData.live = true;
      const out = vv(f.br);
      const tip = p.clone().addScaledVector(out, 2.4).add(new T.Vector3(0, 1.4, 0));
      const pole = new T.Mesh(new T.CylinderGeometry(0.02, 0.035, 1, 6).translate(0, 0.5, 0), toon('#c8a060')); pole.scale.y = tip.distanceTo(rod.position); pole.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), tip.clone().sub(rod.position).normalize()); rod.add(pole);
      const lineG = new T.BufferGeometry().setFromPoints([tip, tip.clone().add(new T.Vector3(0, -6, 0))]); const line = new T.Line(lineG, K3D.flat('#e8e4d8')); line.userData.live = true; K.add(line);
      const bob = sc.G.add(tip.x, tip.y - 6, tip.z, 0.5, '#ff5a4a', 1.2, 0);
      U.push((t, st) => { LIFE.pose(a, 'sit', t); const y = -6 + Math.sin(t * 1.3) * 0.3 + (Math.sin(t * 0.37) > 0.97 ? -0.6 : 0); const pa = lineG.attributes.position; pa.setXYZ(1, tip.x, tip.y + y, tip.z); pa.needsUpdate = true; sc.G.set(bob, tip.x, tip.y + y, tip.z); });
    }

    // 2 WASHING DAY (left, s 22-40)
    {
      const g = island(K, sc, at(30, -14, -2.2), 12, 9, { seed: 1, led: '#4ae8ff' }); face(g, 30, 0.3);
      const caps = [[-4, -2.5, 6.5], [0.5, 2.5, 7.5], [4.2, -2, 6]].map(([x, z, h], i) => { const c = ARCADE.cap(K, { r: 1.2, h, col: ['#2a4ab8', '#3a2a6a', '#1e5a3a'][i] }); c.position.set(x, 0, z); g.add(c); return { x, z, h }; });
      g.updateMatrixWorld(true);
      const lines = [];
      for (let i = 0; i < caps.length; i++) {
        const a2 = caps[i], b2 = caps[(i + 1) % caps.length];
        const pa = on(g, a2.x, a2.h - 0.5, a2.z), pb = on(g, b2.x, b2.h - 0.5, b2.z), mid = pa.clone().lerp(pb, 0.5).add(new T.Vector3(0, -1.2, 0));
        const cv = new T.QuadraticBezierCurve3(pa, mid, pb);
        K.add(new T.Mesh(new T.TubeGeometry(cv, 24, 0.025, 4), toon('#e8e4d8')));
        lines.push(cv);
      }
      // the laundry: little shirts, socks and towels in pixel colours, each swinging on its own
      const laundry = [];
      const cloth = (kind, col) => { const m = toon(col, { side: T.DoubleSide }); const gg = new T.Group(); if (kind === 'shirt') { const b = new T.Mesh(new T.PlaneGeometry(0.7, 0.8), m); b.position.y = -0.4; gg.add(b); for (const sx of [-1, 1]) { const sl = new T.Mesh(new T.PlaneGeometry(0.3, 0.3), m); sl.position.set(sx * 0.45, -0.18, 0); gg.add(sl); } } else if (kind === 'sock') { const a2 = new T.Mesh(new T.PlaneGeometry(0.22, 0.6), m); a2.position.y = -0.3; gg.add(a2); const f2 = new T.Mesh(new T.PlaneGeometry(0.34, 0.2), m); f2.position.set(0.08, -0.62, 0); gg.add(f2); } else { const b = new T.Mesh(new T.PlaneGeometry(0.8, 0.6), toon(col, { side: T.DoubleSide, map: K3D.paint('s1-towel|' + col, 32, 32, (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.5)'; for (let y = 4; y < h; y += 8) c.fillRect(0, y, w, 3); }) })); b.position.y = -0.3; gg.add(b); } const peg = new T.Mesh(K3D.geo('s1-peg', () => new T.BoxGeometry(0.06, 0.16, 0.06)), toon('#d8b070')); gg.add(peg); gg.userData.live = true; return gg; };
      lines.forEach((cv, li) => { for (let k = 1; k <= 5; k++) { const u = k / 6, it = cloth(['shirt', 'sock', 'towel', 'shirt', 'sock'][(k + li) % 5], ARCADE.pick(['#ff5ad6', '#ffe24a', '#5aff8a', '#4ae8ff', '#ffffff', '#ff8a4a'])); it.position.copy(cv.getPoint(u)); it.rotation.y = g.rotation.y + li; K.add(it); laundry.push({ it, ph: rnd() * 6 }); } });
      // a creature up a ladder pegging out a shirt; another chasing the sock that got away
      const lad = ladder(K, 3.2); lad.position.set(-1.8, 0, 0.2); lad.rotation.y = 0.4; g.add(lad);
      const pegger = LIFE.actor({ kind: 'blip', col: '#ff5ad6', col2: '#ffe24a', hat: 'bow' }); pegger.position.set(-1.8, 2.6, 0.6); g.add(pegger);
      const chaser = LIFE.actor({ kind: 'blip', col: '#ffe24a', col2: '#4ae8ff' }); g.add(chaser);
      const sock = cloth('sock', '#5aff8a'); g.add(sock); sock.position.set(0, 0.5, 0);
      crowd(sc, g, [[3.2, 2.6, { kind: 5, act: 'idle' }], [-4.5, 2.5, { kind: 3, act: 'wave', yaw: 0.6 }]]);
      const basket = mk(new T.CylinderGeometry(0.5, 0.4, 0.5, 14, 1, true), toon('#c8a060', { side: T.DoubleSide }), 0.5); basket.position.set(-2.6, 0.25, 1.2); g.add(basket);
      lampAt(on(g, 0, 4, 0), '#ffd8a8', 1.8, 12);
      U.push((t, st) => {
        const near2 = Math.max(0, 1 - Math.abs(st.s - 30) / 20) * (st.phase === 'intro' ? 0 : 1);
        for (const l of laundry) { l.it.rotation.x = Math.sin(t * 2.2 + l.ph) * (0.15 + near2 * 0.5); l.it.rotation.z = Math.sin(t * 1.3 + l.ph) * 0.1; }
        LIFE.pose(pegger, 'work', t);
        // the sock runs round the board in the wind, the chaser after it
        const a2 = t * 0.6, r2 = 3.4;
        sock.position.set(Math.cos(a2) * r2, 0.4 + Math.abs(Math.sin(t * 3)) * 0.6, Math.sin(a2) * r2 * 0.6); sock.rotation.set(t * 3, t * 2, 0);
        const b2 = a2 - 0.55; chaser.position.set(Math.cos(b2) * r2, 0, Math.sin(b2) * r2 * 0.6); chaser.rotation.y = -b2 + Math.PI;
        LIFE.pose(chaser, 'run', t);
      });
    }

    // 3 THE FIN MARKET on a heat sink (left/outside of the first bend, s 50-66)
    {
      const g = new T.Group(); g.position.copy(at(58, -15, -3.2)); face(g, 62, 0.3); K.add(g);
      const alu = toon('#ffffff', { map: K3D.paint('s1-alu', 128, 128, (c, w, h) => { c.fillStyle = '#3e4658'; c.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(${Math.random() < 0.6 ? '170,185,215' : '10,12,20'},${0.05 + Math.random() * 0.12})`; c.fillRect(0, Math.random() * h, w, 1); } for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(20,16,10,0.25)'; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 0, 7); c.fill(); } c.fillStyle = 'rgba(200,215,240,0.35)'; c.fillRect(0, 0, w, 2); }, { repeat: true }), emissive: '#28304a', emissiveIntensity: 0.2 });
      const base = mk(new T.BoxGeometry(16, 1.6, 10), alu, 1); base.position.y = -0.8; g.add(base);
      for (let k = 0; k < 9; k++) { const fin = mk(new T.BoxGeometry(0.3, 6, 10), alu, 0.5); fin.position.set(-8 + k * 2, 3, 0); g.add(fin); }
      const leg = mk(new T.CylinderGeometry(0.6, 0.6, 16, 8).translate(0, -8, 0), toon('#7a6040'), 0.5); leg.position.y = -1.6; g.add(leg);
      const sign = ARCADE.neon(K, 'FIN MARKET', { w: 7, h: 1.4, col: '#ffe24a', col2: '#ff5ad6' }); sign.position.set(0, 6.9, 5.2); g.add(sign);
      // stalls between the fins: an awning, a counter of glowing goods, a vendor
      const awnTex = c => K3D.paint('s1-awn|' + c, 64, 32, (cc, w, h) => { for (let i = 0; i < 8; i++) { cc.fillStyle = i % 2 ? '#f4eee0' : c; cc.fillRect(i * w / 8, 0, w / 8, h); } });
      const vendors = [];
      for (let k = 0; k < 8; k++) {
        const x = -7 + k * 2, col = ARCADE.pick(['#ff5ad6', '#4ae8ff', '#ffe24a', '#5aff8a', '#ff8a4a']);
        const counter = mk(new T.BoxGeometry(1.5, 0.6, 0.7), toon('#6a4a3a'), 0.5); counter.position.set(x, 0.3, 3.6); g.add(counter);
        const awn = new T.Mesh(new T.PlaneGeometry(1.7, 1.0), toon('#ffffff', { map: awnTex(col), side: T.DoubleSide })); awn.position.set(x, 1.7, 3.9); awn.rotation.x = -0.6; g.add(awn);
        for (let n = 0; n < 4; n++) { const gd = new T.Mesh(K3D.geo('s1-good', () => new T.BoxGeometry(0.22, 0.22, 0.22)), F2(ARCADE.pick(ARCADE.NEON), 1.5)); gd.position.set(x - 0.5 + n * 0.33, 0.72, 3.6 + (n % 2) * 0.15); gd.rotation.y = n; g.add(gd); }
        const v = LIFE.actor({ kind: k % 3 ? 'blip' : 'stack', col: ARCADE.pick(ARCADE.NEON), col2: '#ffffff', hat: k % 2 ? 'cap' : null, s: 0.9 }); v.position.set(x, 0, 2.9); g.add(v); vendors.push(v);
      }
      // string lights across the fin tops
      g.updateMatrixWorld(true);
      for (let k = 0; k < 3; k++) { const a2 = on(g, -8, 6, -3 + k * 3), b2 = on(g, 8, 6, -3 + k * 3); sc.B.line(a2.toArray(), b2.toArray(), 0.6, ['#ffe24a', '#ff5ad6', '#4ae8ff', '#5aff8a'], { size: 0.08, sag: 1.2, speed: 2 }); }
      // shoppers strolling the aisle in front of the stalls
      const shoppers = []; for (let k = 0; k < 6; k++) { const a2 = LIFE.actor({ kind: ARCADE.pick(['blip', 'stack', 'blip']), col: ARCADE.pick(ARCADE.NEON), col2: ARCADE.pick(ARCADE.NEON), hat: ARCADE.pick([null, 'bow', 'antenna', null]), s: 0.85 }); g.add(a2); shoppers.push({ a: a2, ph: k * 2.7, sp: 0.5 + rnd() * 0.5 }); }
      lampAt(on(g, 0, 4, 5), '#ffb070', 2.6, 16);
      U.push((t, st) => {
        vendors.forEach((v, k) => LIFE.pose(v, (k + Math.floor(t * 0.3)) % 3 ? 'idle' : 'wave', t));
        for (const sh of shoppers) { const u = ((t * sh.sp * 0.08 + sh.ph) % 2), x = u < 1 ? -7.5 + u * 15 : 7.5 - (u - 1) * 15, dir = u < 1 ? 1 : -1; sh.a.position.set(x, 0, 4.9 + Math.sin(sh.ph) * 0.4); sh.a.rotation.y = dir * Math.PI / 2; LIFE.pose(sh.a, 'walk', t); }
      });
    }

    // 4 THE GRAFFITI ARTIST at the first bend (right, inside of the turn): GO PIP GO on one panel, GO BO GO on another
    {
      const g = new T.Group(); g.position.copy(at(80, 9.5, -1.0)); face(g, 74, 0.2); K.add(g);
      const pan = mk(new T.BoxGeometry(9, 5, 0.4), toon('#3a3440', { map: ARCADE.grimeTex() }), 0.8); pan.position.y = 2.5; g.add(pan);
      const t1 = ARCADE.decal(K, 'graffiti', 4.4, 4.4, { text: 'GO PIP GO', seed: 1 }); t1.position.set(-2.1, 2.2, 0.22); g.add(t1);
      const t2 = ARCADE.decal(K, 'graffiti', 4.4, 4.4, { text: 'GO BO GO', seed: 2 }); t2.position.set(2.3, 2.2, 0.22); g.add(t2);
      const leg = mk(new T.CylinderGeometry(0.4, 0.4, 14, 8).translate(0, -7, 0), toon('#7a6040'), 0.5); g.add(leg);
      const shelf = mk(new T.BoxGeometry(9, 0.3, 2), toon('#5a4a3a'), 0.6); shelf.position.set(0, -0.15, 1); g.add(shelf);
      const artist = LIFE.actor({ kind: 'blip', col: '#9a8aff', col2: '#5aff8a', hat: 'cap' }); artist.position.set(1, 0, 1.2); g.add(artist);
      const can = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.22, 8), toon('#ff5ad6')); can.position.set(0.2, -0.5, 0.1); artist.userData.arms[1].add(can);
      for (let k = 0; k < 4; k++) { const c2 = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.3, 8), toon(ARCADE.NEON[k])); c2.position.set(-3.6 + k * 0.3, 0.15, 1.4); g.add(c2); }
      g.updateMatrixWorld(true);
      const mist = []; for (let k = 0; k < 10; k++) mist.push(sc.G.add(0, -9999, 0, 0.3, '#9aff6a', 0.8, 0));
      lampAt(on(g, 0, 3, 3), '#c8a0ff', 1.6, 10);
      U.push((t, st) => {
        const close = st.phase !== 'intro' && Math.abs(st.s - 78) < 14;
        LIFE.pose(artist, close ? 'wave' : 'spray', t);
        artist.rotation.y = close ? 0.4 : Math.PI;
        mist.forEach((gi, k) => { if (close) { sc.G.set(gi, 0, -9999, 0, 0); return; } const u = ((t * 1.5 + k / 10) % 1), q = on(g, 0.6 + u * 0.8 + Math.sin(k) * 0.2, 1.2 + Math.cos(k * 2) * 0.3, 0.9 - u * 0.6); sc.G.set(gi, q.x, q.y, q.z, 0.25 + u * 0.4); });
      });
    }

    // 5 THE TEA PARTY round a foreign coin (right, s 92)
    {
      const g = island(K, sc, at(94, 12.5, -2.4), 8, 7, { seed: 3, led: '#ffe24a' }); face(g, 94, 0.3);
      const table = ARCADE.lost(K, 'coin', { s: 1.9 }); table.position.set(0, 0.7, 0); g.add(table);
      const tstand = mk(new T.CylinderGeometry(0.3, 0.5, 0.7, 10).translate(0, 0.35, 0), toon('#8a6a4a'), 0.5); g.add(tstand);
      const pot = mk(new T.SphereGeometry(0.32, 14, 10), toon('#f4eee0'), 0.5); pot.position.set(0.4, 1.1, -0.3); g.add(pot);
      const spout = mk(new T.CylinderGeometry(0.05, 0.08, 0.35, 8), toon('#f4eee0'), 0.4); spout.position.set(0.72, 1.18, -0.3); spout.rotation.z = -0.9; g.add(spout);
      for (let k = 0; k < 3; k++) { const a2 = k / 3 * Math.PI * 2 + 0.5, cup = mk(K3D.geo('s1-cup', () => new T.CylinderGeometry(0.12, 0.09, 0.16, 12)), toon('#ffffff'), 0.4); cup.position.set(Math.cos(a2) * 1.2, 0.85, Math.sin(a2) * 1.2); g.add(cup); }
      const candle = mk(new T.CylinderGeometry(0.08, 0.08, 0.4, 8), toon('#f4e8c8'), 0.4); candle.position.set(-0.4, 1.0, 0.2); g.add(candle);
      g.updateMatrixWorld(true);
      { const q = on(g, -0.4, 1.32, 0.2); sc.G.add(q.x, q.y, q.z, 0.9, '#ffb050', 1.2, 1); lampAt(q, '#ffb050', 1.4, 7, { flick: 0.1 }); }
      crowd(sc, g, [[1.9, -0.3, { kind: 0, act: 'sit', col: '#ff8a4a', yaw: -1.6 }], [-1.6, -1.2, { kind: 1, act: 'sit', col: '#4ae8ff', yaw: 1.0 }], [-0.8, 1.9, { kind: 5, act: 'sit', col: '#ff5ad6', yaw: 3.0 }]]);
      const pencil = ARCADE.lost(K, 'pencil', { s: 5 }); pencil.position.set(0, 0.25, 2.6); g.add(pencil);
      const steam = []; for (let k = 0; k < 5; k++) steam.push(sc.G.add(0, -9999, 0, 0.3, '#ffffff', 0.25, 0));
      U.push((t) => { steam.forEach((gi, k) => { const u = (t * 0.5 + k / 5) % 1, q = on(g, 0.75 + u * 0.3, 1.4 + u * 1.2, -0.3 + Math.sin(u * 6 + k) * 0.15); sc.G.set(gi, q.x, q.y, q.z, 0.2 + u * 0.4); }); });
    }

    // 6 THE PICTURE HOUSE: an open-air cinema (left, s 112): a screen showing a pixel cartoon, rows of watchers
    {
      const g = island(K, sc, at(114, -15, -3.0), 14, 10, { seed: 5, led: '#ff5ad6' }); face(g, 108, 0.8);
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = 96; const cx = cv.getContext('2d');
      const tex = new T.CanvasTexture(cv); tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = T.SRGBColorSpace;
      const scr = new T.Mesh(new T.PlaneGeometry(8, 4.8), new T.MeshBasicMaterial({ map: tex, toneMapped: false, color: new T.Color(1.4, 1.4, 1.4) })); scr.position.set(0, 4.2, -3.8); g.add(scr); scr.userData.live = true;
      const frame = mk(new T.BoxGeometry(8.6, 5.4, 0.3), toon('#2a2230'), 0.8); frame.position.set(0, 4.2, -4.0); g.add(frame);
      for (const sx of [-1, 1]) { const cur = mk(new T.BoxGeometry(0.8, 5.6, 0.3), toon('#a82a4a', { map: K3D.paint('s1-curtain', 32, 128, (c, w, h) => { c.fillStyle = '#a82a4a'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 6) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x, 0, 2, h); } }) }), 0.6); cur.position.set(sx * 4.5, 4.2, -3.7); g.add(cur); const post = mk(new T.CylinderGeometry(0.15, 0.15, 7, 8).translate(0, 3.5, 0), toon('#4a3a40'), 0.5); post.position.set(sx * 4.7, 0, -4.0); g.add(post); }
      const marquee = ARCADE.neon(K, 'PICTURE HOUSE', { w: 6, h: 1.2, col: '#ff5ad6', col2: '#ffe24a' }); marquee.position.set(0, 7.5, -3.9); g.add(marquee);
      // rows of watchers on little benches (made of resistors laid down)
      for (let r = 0; r < 3; r++) { const z = -0.6 + r * 1.6; const bench = ARCADE.resistor(K, { l: 7, r: 0.22 }); bench.position.set(0, 0.3, z); g.add(bench); const list = []; for (let k = 0; k < 6; k++) list.push([-3 + k * 1.2 + (r % 2) * 0.4, z + 0.1, { kind: ARCADE.pick([0, 1, 5, 3, 0]), act: 'sit', yaw: Math.PI, col: ARCADE.pick(ARCADE.NEON) }]); crowd(sc, g, list); }
      // the projector at the back, its beam to the screen
      const proj = mk(new T.BoxGeometry(1.2, 0.9, 1.4), toon('#3a3a44'), 0.6); proj.position.set(0, 1.9, 4.0); g.add(proj);
      for (const sx of [-1, 1]) { const reel = mk(new T.CylinderGeometry(0.5, 0.5, 0.12, 18).rotateZ(Math.PI / 2), toon('#8a8a94'), 0.5); reel.position.set(0, 2.7, 4.0 + sx * 0.45); g.add(reel); reel.userData.live = true; reel.userData.reel = true; }
      const ptStand = mk(new T.CylinderGeometry(0.12, 0.12, 1.5, 6).translate(0, 0.75, 0), toon('#3a3a44'), 0.4); ptStand.position.set(0, 0, 4.0); g.add(ptStand);
      g.updateMatrixWorld(true);
      const a2 = on(g, 0, 1.95, 3.3), b2 = on(g, 0, 4.2, -3.6); ARCADE.shaft(K, a2.toArray(), b2.toArray(), 0.25, '#bfd8ff', 0.22);
      const scrLight = lampAt(on(g, 0, 3.4, -1.5), '#8ab8ff', 2.0, 12, { fn: tt => 0.6 + 0.4 * Math.abs(Math.sin(tt * 3.1)) });
      // the cartoon (original): a little pixel coin hops over hills under a moon, a pixel bat flaps by, THE END
      let frameT = 0;
      U.push((t, st, dt) => {
        frameT += dt; if (frameT < 0.08) return; frameT = 0;
        const c = cx, w = 160, h = 96, k = Math.floor(t * 10) % 240;
        c.fillStyle = '#10142a'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#e8e4ff'; c.fillRect(120, 10, 12, 12); c.fillStyle = '#10142a'; c.fillRect(124, 10, 8, 8);
        for (let i = 0; i < 20; i++) { c.fillStyle = (i + k) % 7 ? '#5a6aa8' : '#ffffff'; c.fillRect((i * 37) % w, (i * 13) % 40, 1, 1); }
        c.fillStyle = '#2a5a3a'; for (let x = 0; x < w; x += 4) { const y = 70 + Math.round(Math.sin((x + k * 2) * 0.05) * 8); c.fillRect(x, y, 4, h - y); }
        if (k < 200) { const x = 30 + (k % 100) * 0.9, y = 60 - Math.abs(Math.sin(k * 0.25)) * 22; c.fillStyle = '#ffd23a'; c.fillRect(x, y, 10, 10); c.fillStyle = '#a87818'; c.fillRect(x + 2, y + 2, 6, 6); c.fillStyle = '#fff'; c.fillRect(x + 3, y + 3, 1, 2); c.fillRect(x + 6, y + 3, 1, 2); }
        if (k > 60 && k < 160) { const bx = w - (k - 60) * 1.8, by = 30 + Math.sin(k * 0.6) * 4; c.fillStyle = '#9a5aff'; c.fillRect(bx, by, 6, 4); c.fillRect(bx - (k % 4 < 2 ? 4 : 3), by - (k % 4 < 2 ? 2 : -1), 4, 2); c.fillRect(bx + 6, by - (k % 4 < 2 ? 2 : -1), 4, 2); }
        if (k >= 200) { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 16px monospace'; c.textAlign = 'center'; c.fillText('THE END', w / 2, h / 2 + 5); }
        c.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = 0; y < h; y += 2) c.fillRect(0, y, w, 1);
        tex.needsUpdate = true;
        g.traverse(o => { if (o.userData.reel) o.rotation.x += 0.3; });
      });
    }

    // 7 THE BAND ON THE SPEAKER CONE (right, s 138)
    {
      const g = new T.Group(); g.position.copy(at(140, 14, -2.6)); face(g, 134, 0.4); K.add(g);
      const box2 = mk(new T.BoxGeometry(10, 3, 10), toon('#2a2428', { map: ARCADE.grimeTex() }), 1); box2.position.y = -1.5; g.add(box2);
      const surround = mk(new T.TorusGeometry(4.2, 0.4, 10, 40).rotateX(Math.PI / 2), toon('#3a3640'), 0.6); surround.position.y = 0.05; g.add(surround);
      const cone = new T.Mesh(new T.CylinderGeometry(4.0, 1.2, 1.6, 40, 1, true).translate(0, -0.8, 0), toon('#1e1c22', { side: T.DoubleSide, map: K3D.paint('s1-cone', 256, 64, (c, w, h) => { c.fillStyle = '#26222a'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(x, 0, 3, h); } }) })); cone.userData.live = true; g.add(cone);
      const cap = mk(new T.SphereGeometry(1.25, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), toon('#3a3640'), 0.5); cap.scale.y = 0.5; cap.position.y = -1.6; cap.userData.live = true; g.add(cap);
      const leg = mk(new T.CylinderGeometry(0.7, 0.7, 16, 8).translate(0, -8, 0), toon('#7a6040'), 0.5); leg.position.y = -3; g.add(leg);
      // the band on the rim: drums at the back, guitarist, singer at a mic stand
      const drummer = LIFE.actor({ kind: 'stack', col: '#ff5ad6', col2: '#ffe24a' }); drummer.position.set(0, 0.4, -3.6); g.add(drummer);
      for (const [x, z, r, h] of [[-0.8, -3.0, 0.4, 0.5], [0.8, -3.0, 0.4, 0.5], [0, -2.6, 0.6, 0.6]]) { const d = mk(new T.CylinderGeometry(r, r, h, 16), toon('#e8e4f0'), 0.4); d.position.set(x, 0.45 + h / 2, z); g.add(d); }
      const cym = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.03, 16), toon('#e8c040', { emissive: '#e8c040', emissiveIntensity: 0.3 })); cym.position.set(1.4, 1.6, -3.2); g.add(cym); cym.userData.live = true;
      const guit = LIFE.actor({ kind: 'blip', col: '#4ae8ff', col2: '#ff5ad6', hat: 'antenna' }); guit.position.set(-3.2, 0.4, -1); guit.rotation.y = 0.8; g.add(guit);
      const gbody = mk(new T.BoxGeometry(0.5, 0.36, 0.1), toon('#ffe24a'), 0.4); gbody.position.set(0, 0.45, 0.45); guit.add(gbody); const neck = new T.Mesh(new T.BoxGeometry(0.7, 0.06, 0.06), toon('#6a4a3a')); neck.position.set(0.55, 0.55, 0.45); guit.add(neck);
      const singer = LIFE.actor({ kind: 'blip', col: '#ffe24a', col2: '#ffffff', hat: 'bow' }); singer.position.set(3.2, 0.4, -1); singer.rotation.y = -0.8; g.add(singer);
      const mic = mk(new T.CylinderGeometry(0.03, 0.03, 1.2, 6).translate(0, 0.6, 0), toon('#8a8a94'), 0.3); mic.position.set(2.6, 0.4, -0.4); g.add(mic);
      // dancers down in the bowl
      g.updateMatrixWorld(true);
      for (let k = 0; k < 9; k++) { const a2 = k / 9 * 6.28, r = 1.6 + (k % 2) * 0.9, q = on(g, Math.cos(a2) * r, -1.0 + r * 0.38, Math.sin(a2) * r); sc.crit.add(q.x, q.y, q.z, { kind: ARCADE.pick([0, 1, 3, 5, 6]), act: 'dance', col: ARCADE.NEON[k % 8] }); }
      const disco = []; for (let k = 0; k < 8; k++) disco.push(sc.G.add(...on(g, Math.cos(k) * 3.6, 0.3, Math.sin(k) * 3.6).toArray(), 1.2, ARCADE.NEON[k], 0.9, 0));
      lampAt(on(g, 0, 3, 0), '#ff5ad6', 2.4, 14, { fn: tt => 0.5 + 0.5 * Math.abs(Math.sin(tt * Math.PI * 148 / 60)) });
      U.push((t, st) => {
        const beat = Math.pow(Math.abs(Math.sin(t * Math.PI * 148 / 60)), 6), loud = 1 + Math.max(0, 1 - Math.abs(st.s - 140) / 25);
        cone.position.y = beat * 0.22 * loud; cap.position.y = -1.6 + beat * 0.3 * loud;
        LIFE.pose(drummer, 'work', t * 2); LIFE.pose(guit, 'cheer', t * 0.6); guit.userData.body.position.y = beat * 0.2;
        LIFE.pose(singer, 'wave', t); cym.rotation.z = beat * 0.3;
        disco.forEach((gi, k) => sc.G.color(gi, ARCADE.NEON[(k + Math.floor(t * 4)) % 8], 0.4 + beat * 0.8));
      });
    }

    // 8 THE LAMP REPAIR CREW over the chute at the first checkpoint (the lamp flickers; a creature up a ladder)
    {
      const s = 168, p = vv(R.local(s, -(W(s) + 2.2), 7)), lamp = cageLamp(K, sc, p, { flick: 0.6, k: 2.6 }); S1.lamps.push(lamp);
      const g = island(K, sc, at(s - 1, -9.5, -0.6), 5, 4, { seed: 7, led: '#ffe24a', legs: 12 }); face(g, s, 0.1);
      const lad = ladder(K, 6.4); lad.position.set(1.6, 0, 0); lad.rotation.z = 0.35; g.add(lad);
      const up = LIFE.actor({ kind: 'worker', col: '#ffb050', col2: '#ffffff' }); up.position.set(2.7, 5.1, 0.25); g.add(up);
      const hold = LIFE.actor({ kind: 'worker', col: '#5aff8a', col2: '#ffffff' }); hold.position.set(0.8, 0, 0.4); g.add(hold);
      const box3 = mk(new T.BoxGeometry(1, 0.5, 0.6), toon('#d83a2a'), 0.5); box3.position.set(-1.4, 0.25, 0.6); g.add(box3);
      for (let k = 0; k < 3; k++) { const b = new T.Mesh(K3D.geo('s1-spare', () => new T.SphereGeometry(0.18, 10, 8)), toon('#f8f0e0', { transparent: true, opacity: 0.8 })); b.position.set(-1.8 + k * 0.4, 0.2, -0.8); g.add(b); }
      U.push((t) => { LIFE.pose(up, 'work', t); LIFE.pose(hold, Math.sin(t * 0.4) > 0.6 ? 'wave' : 'idle', t); });
    }

    // 9 THE QUEUE AT THE BATTERY (left, by the first split, s 192)
    {
      const g = island(K, sc, at(194, -15, -2.0), 12, 9, { seed: 9, led: '#5aff8a' }); face(g, 190, 0.3);
      const cell = new T.Group(); cell.position.set(0, 0, -1); g.add(cell);
      const lab = K3D.paint('s1-cell', 512, 256, (c, w, h) => { const gg = c.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, '#3ac86a'); gg.addColorStop(1, '#1a6a3a'); c.fillStyle = gg; c.fillRect(0, 0, w, h); c.fillStyle = '#ffe24a'; c.fillRect(0, h * 0.62, w, h * 0.12); c.fillStyle = '#0a2a14'; c.font = 'bold 90px monospace'; c.textAlign = 'center'; c.fillText('VOLTO', w / 4, h * 0.45); c.fillText('VOLTO', w * 3 / 4, h * 0.45); c.font = 'bold 40px monospace'; c.fillText('1.5 V  ·  SUPER CELL', w / 2, h * 0.9); });
      const can = mk(new T.CylinderGeometry(2.4, 2.4, 7, 32), [toon('#ffffff', { map: lab }), toon('#c8ccd4'), toon('#c8ccd4')], 1); can.position.y = 3.5; cell.add(can);
      const term = mk(new T.CylinderGeometry(0.8, 0.8, 0.5, 20), toon('#d8dce8', { emissive: '#ffffff', emissiveIntensity: 0.2 }), 0.6); term.position.y = 7.25; cell.add(term);
      const plus = new T.Mesh(new T.PlaneGeometry(0.9, 0.9), K3D.flat(hot('#ffffff', 1.4), { map: K3D.paint('s1-plus', 64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(26, 8, 12, 48); c.fillRect(8, 26, 48, 12); }), transparent: true })); plus.rotation.x = -Math.PI / 2; plus.position.y = 7.51; cell.add(plus);
      // steps up one side (the queue), a slide down the other
      for (let k = 0; k < 8; k++) { const st2 = mk(K3D.geo('s1-step', () => new T.BoxGeometry(1.2, 0.3, 1.0)), toon('#8a6a4a'), 0.5); st2.position.set(-2.9 - (7 - k) * 0.45, (k + 1) * 0.86, 0.2 + 0.0); g.add(st2); }
      const slideC = new T.CatmullRomCurve3([new T.Vector3(1.2, 7.2, -1), new T.Vector3(3.4, 5, 0.2), new T.Vector3(4.4, 2, 1.4), new T.Vector3(5.2, 0.4, 2.6)]);
      g.add(mk(new T.TubeGeometry(slideC, 30, 0.45, 8, false), toon('#ffe24a', { side: T.DoubleSide }), 0.6));
      // the queuers: dim until charged, then bright as they slide off
      const queue = [];
      for (let k = 0; k < 7; k++) { const col = ARCADE.NEON[k % 8], a2 = LIFE.actor({ kind: k % 3 ? 'blip' : 'stack', col, col2: '#ffffff', s: 0.85 }); g.add(a2); const mats = []; a2.traverse(o => { if (o.isMesh && o.material && o.material.isMeshToonMaterial) { o.material = o.material.clone(); mats.push(o.material); } }); queue.push({ a: a2, ph: k / 7, mats }); }
      const spark = sc.G.add(...on(g, 0, 7.8, -1).toArray(), 3, '#9aff6a', 0.5, 0.6);
      lampAt(on(g, 0, 8, 1), '#7aff9a', 2.2, 14);
      U.push((t, st) => {
        const cyc = 9;
        for (const q of queue) {
          const u = ((t / cyc + q.ph) % 1); let x, y, z = 0.2, act = 'idle', glow = 0.15;
          if (u < 0.7) { const step = Math.min(7, Math.floor(u / 0.7 * 8)); x = -2.9 - (7 - step) * 0.45; y = (step + 1) * 0.86 + 0.15; act = step < 7 && (u / 0.7 * 8) % 1 < 0.25 ? 'walk' : 'idle'; }
          else if (u < 0.82) { x = -0.6 + (u - 0.7) / 0.12 * 0.6; y = 7.5; z = -1; act = 'cheer'; glow = 0.2 + (u - 0.7) / 0.12 * 2.0; }
          else { const v = (u - 0.82) / 0.18, p = slideC.getPoint(v); x = p.x; y = p.y + 0.3; z = p.z; act = v < 0.95 ? 'slide' : 'cheer'; glow = 2.0 - v * 1.2; }
          q.a.position.set(x, y, z); q.a.rotation.y = u < 0.7 ? Math.PI / 2 : u < 0.82 ? Math.PI / 2 : 0.6;
          LIFE.pose(q.a, act, t);
          for (const m of q.mats) m.emissiveIntensity = glow;
        }
        sc.G.set(spark, ...on(g, 0, 7.8 + Math.sin(t * 9) * 0.1, -1).toArray(), 2 + Math.abs(Math.sin(t * 17)) * 1.5);
      });
    }

    // 10 THE PAPER-CLIP BRIDGE between two capacitors (right, s 220)
    {
      const g = new T.Group(); g.position.copy(at(222, 13, -2.4)); face(g, 216, 0.5); K.add(g);
      for (const sx of [-1, 1]) { const c = ARCADE.cap(K, { r: 2.2, h: 6, col: sx < 0 ? '#3a2a6a' : '#1e5a3a', label: sx < 0 ? '2200uF 16V' : '1000uF 35V' }); c.position.set(sx * 6, -6, 0); g.add(c); const leg = mk(new T.CylinderGeometry(0.4, 0.4, 14, 8).translate(0, -7, 0), toon('#7a6040'), 0.5); leg.position.set(sx * 6, -6, 0); g.add(leg); }
      const clip = ARCADE.lost(K, 'clip', { s: 6.5 }); clip.rotation.set(0, Math.PI / 2, 0); clip.position.set(5.2, 0.12, 0); g.add(clip);
      const walkers = []; for (let k = 0; k < 4; k++) { const a2 = LIFE.actor({ kind: ARCADE.pick(['blip', 'stack', 'crab']), col: ARCADE.pick(ARCADE.NEON), col2: '#ffffff', s: 0.8 }); g.add(a2); walkers.push({ a: a2, ph: k * 0.25, dir: k % 2 }); }
      lampAt(on(g, 0, 3, 2), '#9ad8ff', 1.6, 12);
      U.push((t) => { for (const w of walkers) { const u = (t * 0.06 + w.ph) % 1, x = (w.dir ? 1 - u : u) * 11 - 5.5; w.a.position.set(x, 0.32 + Math.abs(Math.sin(t * 8 + w.ph * 10)) * 0.04, Math.sin(x * 0.6) * 0.15); w.a.rotation.y = w.dir ? -Math.PI / 2 : Math.PI / 2; LIFE.pose(w.a, 'walk', t); } });
    }

    // 11 THE HAIRCLIP SLIDE (left, s 252): up the ladder, down the clip, into a dust bunny
    {
      const g = island(K, sc, at(254, -13.5, -2.6), 10, 7, { seed: 11, led: '#ff5ad6' }); face(g, 248, 0.4);
      const chip = ARCADE.chip(K, { w: 4, d: 2.4, h: 2.2, label: 'MB-4316' }); chip.position.set(-2.5, 0, -1); g.add(chip);
      const clip = ARCADE.lost(K, 'hairclip', { s: 3.4, col: '#ff7ab8' }); clip.position.set(0.6, 1.4, -1); clip.rotation.set(0, 0, -0.6); g.add(clip);
      const slideC = new T.CatmullRomCurve3([new T.Vector3(-1.6, 2.6, -1), new T.Vector3(0.4, 1.8, -1), new T.Vector3(2.2, 0.8, -0.6), new T.Vector3(3.4, 0.3, 0.4)]);
      g.add(mk(new T.TubeGeometry(slideC, 24, 0.32, 8, false), toon('#ff8ac0'), 0.5));
      const fluff = mk(new T.IcosahedronGeometry(1.0, 2), toon('#8a8490'), 0.5); fluff.scale.set(1.2, 0.6, 1.2); fluff.position.set(3.8, 0.3, 0.8); g.add(fluff);
      const lad = ladder(K, 2.6); lad.position.set(-4.6, 0, -1); g.add(lad);
      const sliders = []; for (let k = 0; k < 3; k++) { const a2 = LIFE.actor({ kind: 'blip', col: ARCADE.NEON[(k * 3) % 8], col2: '#ffffff', hat: k === 1 ? 'bow' : null, s: 0.8 }); g.add(a2); sliders.push({ a: a2, ph: k / 3 }); }
      lampAt(on(g, 0, 3, 2), '#ff9ad0', 1.6, 10);
      U.push((t) => {
        for (const sl of sliders) {
          const u = (t * 0.12 + sl.ph) % 1;
          if (u < 0.35) { const v = u / 0.35; sl.a.position.set(-4.6 + Math.min(1, v * 3) * 0.1, v * 2.6, -0.6); sl.a.rotation.y = Math.PI; LIFE.pose(sl.a, 'walk', t); }
          else if (u < 0.45) { sl.a.position.set(-4.4 + (u - 0.35) * 28, 2.75, -1); sl.a.rotation.y = Math.PI / 2; LIFE.pose(sl.a, 'walk', t); }
          else if (u < 0.65) { const p = slideC.getPoint((u - 0.45) / 0.2); sl.a.position.set(p.x, p.y + 0.3, p.z); sl.a.rotation.y = Math.PI / 2; LIFE.pose(sl.a, 'slide', t); }
          else { sl.a.position.set(3.4 - (u - 0.65) * 20, 0, 0.8 + (u - 0.65) * 4); sl.a.rotation.y = -Math.PI / 2 - 0.4; LIFE.pose(sl.a, u < 0.72 ? 'cheer' : 'walk', t); }
        }
      });
    }

    // 12 THE SLEEPING MOTH on a cable loom (right, s 272), Zs rising; a creature tiptoeing past with a duster
    {
      const base = at(272, 10.5, 0.8);
      const pts = [base.clone().add(new T.Vector3(-8, 4, 6)), base.clone(), base.clone().add(new T.Vector3(8, 3, -6))];
      for (let k = 0; k < 5; k++) K.add(ARCADE.cable(K, pts.map(p => p.clone().add(new T.Vector3(0, k * 0.28 - 0.6, k * 0.15)).toArray()), { r: 0.16, col: ['#3a6ad8', '#d84a3a', '#e8c040', '#2a2a30', '#e8e0d0'][k], clips: 0 }));
      const moth = ARCADE.lost(K, 'moth', { s: 3.2 }); moth.position.copy(base).add(new T.Vector3(0, 0.9, 0)); moth.rotation.y = R.at(272).yaw + 1.2; moth.userData.live = true; K.add(moth);
      const zs = []; for (let k = 0; k < 4; k++) zs.push(sc.G.add(0, -9999, 0, 0.4, '#e8e4ff', 0.6, 0));
      const duster = LIFE.actor({ kind: 'blip', col: '#ffe24a', col2: '#ff5ad6', s: 0.75 }); K.add(duster);
      const feather = new T.Mesh(new T.ConeGeometry(0.2, 0.6, 8), toon('#ff8ac0')); feather.position.set(0, -0.55, 0.15); duster.userData.arms[1].add(feather);
      U.push((t, st) => {
        moth.children.forEach((c, i) => { if (i > 0) c.rotation.z = (i === 1 ? 0.3 : -0.3) + Math.sin(t * 0.8) * 0.08; });
        zs.forEach((gi, k) => { const u = (t * 0.25 + k / 4) % 1; sc.G.set(gi, base.x + u * 1.5, base.y + 2 + u * 3, base.z + Math.sin(u * 5) * 0.4, 0.3 + u * 0.6); });
        const u = (t * 0.05) % 1, p = new T.Vector3().lerpVectors(pts[0], pts[2], u); p.y = base.y + 0.05 - Math.sin(u * Math.PI) * 0.8 + 0.9 * (1 - Math.sin(u * Math.PI)) * 0;
        duster.position.copy(p).add(new T.Vector3(0, 0.3, 0)); duster.rotation.y = Math.atan2(pts[2].x - pts[0].x, pts[2].z - pts[0].z);
        LIFE.pose(duster, Math.abs(u - 0.5) < 0.08 ? 'work' : 'walk', t * 0.5);
      });
    }

    // 13 THE LUCKY COIN board by the brink (left, s 288): notes, a coin taped up in 1987, a gum blob
    {
      const g = new T.Group(); g.position.copy(at(286, -8.6, -0.5)); face(g, 280, 0.2); K.add(g);
      const board = mk(new T.BoxGeometry(6, 4.2, 0.3), toon('#c8a878', { map: K3D.paint('s1-cork', 256, 256, (c, w, h) => { c.fillStyle = '#b8905a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '90,60,30' : '230,200,150'},0.3)`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }) }), 0.8); board.position.y = 2.6; g.add(board);
      const frameM = toon('#5a3a2a');
      for (const [x, y, w2, h2] of [[0, 4.75, 6.3, 0.2], [0, 0.45, 6.3, 0.2], [-3.1, 2.6, 0.2, 4.4], [3.1, 2.6, 0.2, 4.4]]) { const f2 = mk(new T.BoxGeometry(w2, h2, 0.36), frameM, 0.5); f2.position.set(x, y, 0); g.add(f2); }
      const lucky = ARCADE.decal(K, 'note', 1.8, 1.8, { seed: 13 }); lucky.position.set(-1.4, 3.2, 0.17); lucky.rotation.z = 0.06; g.add(lucky);
      const coin2 = mk(new T.CylinderGeometry(0.5, 0.5, 0.08, 24).rotateX(Math.PI / 2), toon('#d8b060', { emissive: '#ffd070', emissiveIntensity: 0.3 }), 0.5); coin2.position.set(-1.4, 1.9, 0.22); g.add(coin2);
      for (const r of [-0.5, 0.6]) { const tp = new T.Mesh(new T.PlaneGeometry(1.4, 0.28), toon('#f0ecd8', { transparent: true, opacity: 0.7 })); tp.position.set(-1.4, 1.9, 0.27); tp.rotation.z = r; g.add(tp); }
      const gum = ARCADE.decal(K, 'note', 1.4, 1.4, { seed: 4 }); gum.position.set(1.2, 3.4, 0.17); gum.rotation.z = -0.1; g.add(gum);
      const blob = new T.Mesh(new T.SphereGeometry(0.22, 12, 8).scale(1, 1, 0.5), toon('#ff8ab8')); blob.position.set(2.3, 2.6, 0.2); g.add(blob);
      const dia = ARCADE.decal(K, 'diagram', 1.8, 1.4, { seed: 5 }); dia.position.set(1.4, 1.5, 0.17); dia.rotation.z = 0.04; g.add(dia);
      const stk = ARCADE.decal(K, 'sticker', 0.9, 0.9, { seed: 6 }); stk.position.set(-2.4, 1.0, 0.17); g.add(stk);
      for (const [x, y] of [[-1.4, 4.05], [1.2, 4.05], [1.4, 2.25]]) { const pin = new T.Mesh(K3D.geo('s1-pin', () => new T.SphereGeometry(0.08, 8, 6)), toon('#d83a2a')); pin.position.set(x, y, 0.25); g.add(pin); }
      const leg = mk(new T.CylinderGeometry(0.35, 0.35, 14, 8).translate(0, -7, 0), toon('#7a6040'), 0.5); leg.position.y = 0.4; g.add(leg);
      // its own little lamp (a clip-on with a bent neck)
      const neck = new T.CatmullRomCurve3([new T.Vector3(2.9, 4.8, 0), new T.Vector3(3.2, 5.8, 0.4), new T.Vector3(2.4, 6.0, 1.2)]); g.add(mk(new T.TubeGeometry(neck, 12, 0.05, 5), toon('#2a2630'), 0.4));
      const shade = mk(new T.ConeGeometry(0.4, 0.5, 14, 1, true), toon('#d83a2a', { side: T.DoubleSide }), 0.5); shade.position.set(2.2, 5.8, 1.4); shade.rotation.x = 0.9; g.add(shade);
      g.updateMatrixWorld(true);
      const lp = on(g, 2.0, 5.5, 1.6); sc.G.add(lp.x, lp.y, lp.z, 1.4, '#ffe0b0', 1.0, 0);
      lampAt(on(g, 0.5, 4, 2.5), '#ffd8a0', 2.0, 9);
    }

    // a few more creatures here and there on the islands' edges and the struts (the busy crowd)
    for (let s = 20; s < A.brink; s += 7) {
      const sx = rnd() < 0.5 ? -1 : 1, x = sx * (W(s) + 4 + rnd() * 8), p = at(s, x, -1.5 - rnd() * 3);
      if (rnd() < 0.5) continue;
      sc.crit.add(p.x, p.y, p.z, { kind: ARCADE.pick([3, 3, 1]), act: 'idle', s: 0.9 + rnd() * 0.4 });
    }
  }
  // a small ladder (two rails and rungs) standing up its height
  function ladder(K, h) {
    const g = new T.Group(), m = toon('#c8a060');
    for (const sx of [-1, 1]) { const r = mk(K3D.geo('s1-lrail|' + h, () => new T.BoxGeometry(0.08, h, 0.08).translate(0, h / 2, 0)), m, 0.4); r.position.x = sx * 0.3; g.add(r); }
    for (let y = 0.4; y < h; y += 0.45) { const r = new T.Mesh(K3D.geo('s1-rung', () => new T.BoxGeometry(0.6, 0.06, 0.06)), m); r.position.y = y; g.add(r); }
    return g;
  }
  const F2 = (col, k) => K3D.mat('s1-f|' + col + k, () => K3D.flat(hot(col, k)));

  /* ---------- build and update ---------- */
  function build(K, sc) {
    rnd = ARCADE.rnd;
    const S1 = { t: 0 };
    cabinet(K, sc, S1);
    near(K, sc, S1);
    stories(K, sc, S1);
    return S1;
  }
  function update(K, S1, st, dt) {
    S1.t += dt;
    const t = S1.t, show = st.phase === 'intro' || st.s < A.gears + 40;
    if (!show) return;
    for (const fn of S1.ups) fn(t, st, dt);
    // the cage lamps sway a little, more when the coins rush under them
    for (const l of S1.lamps) { const d = Math.abs(l.g.position.distanceTo(K.camera.position)); l.g.rotation.z = Math.sin(t * 1.1 + l.ph) * 0.04 + (d < 10 ? Math.sin(t * 6) * 0.06 : 0); l.g.rotation.x = Math.sin(t * 0.8 + l.ph) * 0.03; }
    if (S1.master) S1.master.rotation.z += dt * 0.08;
    if (S1.g2) S1.g2.rotation.z -= dt * 0.2;
  }

  return { build, update };
})();
