/* Pip & Bo - 43-3 Claw Machine Rescue: the scenery that ties it together. Loaded on demand with the 3D kit (last of the
   level's files). Scenery only: never read by the rules (K3D.noRender plays the same).

   ARCADECLAW_SCENE.build(K, st)       once per scene: the hall, the outside, the rail, the mountain of prizes, the claw
                                       and its cab with Pip in it, Bo, the toys the claw moves, the capsules with their
                                       creatures, the levers and their cables, the floor button and the toy box, the part
                                       gate, the checkpoint flags, the bean pit, the creatures' camps (arcadeclaw-life.js),
                                       the Snatcher asleep in the rafters, the light
   ARCADECLAW_SCENE.update(K, st, dt)  every drawn frame: the claw (bridge, trolley, swing, cable, fingers), the aim ring
                                       and beam, the ghost (green or grey), the orange outline on the toy under the ring
                                       (gold with gold help), the blue glow on handles, Pip at the stick, Bo's pose (running,
                                       hanging on, twisting a capsule, pulling a lever), capsules opening, freed creatures
                                       hopping out and following Bo in a line (dangling below Bo when Pip carries Bo), the
                                       levers' light running up their cables, the rail lighting section by section, the lid,
                                       the gate, the flags, the beans giving underfoot, the camera
   ARCADECLAW_SCENE.camOverride = { eye, at, fov }   the look-shot tools hold the camera still with this */
'use strict';

const ARCADECLAW_SCENE = (function () {
  const T = K3D.T, A = ARCADE, MP = ARCADECLAW_MAP, MACH = ARCADECLAW_MACHINE, TY = ARCADECLAW_TOYS;
  const P = Math.PI, V = (x, y, z) => new T.Vector3(x, y, z);
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const M = (k, make) => K3D.mat('acs|' + k, make);
  const SC = {};
  const plastic = col => M('plastic|' + col, () => TY.rimify(K3D.toon(col, { side: T.DoubleSide }), '1.0, 1.0, 1.0', 0.5, 3.5, 'acs-plastic'));
  const ACTS = { idle: 0, wave: 1, cheer: 2, work: 3, walk: 4, sleep: 5, dance: 6, fish: 7, sit: 8 };
  const CAP_ACT = { wave: 'wave', knock: 'work', asleep: 'sleep', sulk: 'sit', cards: 'sit' };
  const ease = (cur, want, dt, k) => cur.lerp(want, 1 - Math.exp(-k * dt));
  const sm = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* =============================== the capsules =============================== */
  function capsule(K, c) {
    const g = new T.Group(); g.position.set(c.x, c.y, c.z); g.userData.live = true;
    const R = 0.56;
    const lowM = c.gold ? M('capGold', () => TY.rimify(K3D.toon('#ffcc33', { emissive: '#6a4400', emissiveIntensity: 0.55, side: T.DoubleSide }), '1.0, 0.95, 0.6', 1.0, 2.2, 'acs-gold')) : plastic(c.col);
    const low = K3D.mesh(K3D.geo('acs-capLow', () => new T.SphereGeometry(R, 28, 10, 0, P * 2, P / 2, P / 2)), lowM, { ink: A.INK, inkW: 0.8 });
    low.scale.y = 1.07; low.position.y = 0.6; g.add(low);
    const band = K3D.mesh(K3D.geo('acs-capBand', () => new T.TorusGeometry(R + 0.005, 0.045, 6, 32).rotateX(P / 2)), M('capBand', () => K3D.toon('#f6f2ea')), { ink: false }); band.position.y = 0.6; g.add(band);
    // the clear top: twists off when Bo opens it
    const top = new T.Group(); top.position.y = 0.6; g.add(top);
    const dome = new T.Mesh(K3D.geo('acs-capTop', () => new T.SphereGeometry(R, 28, 10, 0, P * 2, 0, P / 2)), M('capGlass', () => TY.rimify(K3D.toon('#e8f6ff', { transparent: true, opacity: 0.26, depthWrite: false }), '0.85, 0.95, 1.0', 0.9, 2.0, 'acs-capglass')));
    dome.scale.y = 1.07; dome.renderOrder = 11; top.add(dome);
    const glint = new T.Mesh(K3D.geo('acs-capGlint', () => new T.SphereGeometry(R * 1.01, 12, 6, 0.4, 0.7, 0.35, 0.55)), K3D.flat(hot('#ffffff', 1.2), { transparent: true, opacity: 0.55, depthWrite: false })); glint.scale.y = 1.07; glint.renderOrder = 12; top.add(glint);
    const nub = K3D.mesh(K3D.geo('acs-capNub', () => new T.CylinderGeometry(0.1, 0.12, 0.08, 12)), M('capNub', () => K3D.toon('#e8f0f8', { transparent: true, opacity: 0.55 })), { ink: false }); nub.position.y = R * 1.07; top.add(nub);
    // a folded prize slip tucked in by the creature, and the creature's little bed of shredded paper
    const slip = new T.Mesh(K3D.geo('acs-slip', () => new T.PlaneGeometry(0.22, 0.14)), M('slip', () => K3D.toon('#fff4c8', { side: T.DoubleSide }))); slip.position.set(-0.24, 0.24, 0.12); slip.rotation.set(-0.9, 0.4, 0.2); g.add(slip);
    // gold: a key on a ribbon round the creature's neck shows through, and sparkles
    if (c.gold) {
      const key = new T.Group(); key.position.set(0.16, 0.42, 0.18); g.add(key);
      key.add(K3D.mesh(new T.TorusGeometry(0.06, 0.02, 6, 12), M('key', () => K3D.toon('#ffe070', { emissive: '#6a4a00', emissiveIntensity: 0.6 })), { ink: false }));
      const shaft = new T.Mesh(new T.BoxGeometry(0.03, 0.14, 0.02), M('key', () => K3D.toon('#ffe070'))); shaft.position.y = -0.1; key.add(shaft);
      g.userData.key = key;
    }
    K.add(g);
    return { g, top, low, band };
  }

  /* =============================== the levers, the button, the toy box, the gate, the flags =============================== */
  function lever(K, lv) {
    const g = new T.Group(); g.position.set(lv.x, lv.y, lv.z); g.userData.live = true;
    const hz = M('hazard', () => K3D.toon('#ffffff', { map: A.decalTex('warn', 3, 'POWER') }));
    const base = K3D.mesh(new T.BoxGeometry(1.2, 0.7, 0.8), [M('leverSide', () => K3D.toon('#3a3640', { map: A.grimeTex() })), M('leverSide', () => K3D.toon('#3a3640')), M('leverTop', () => K3D.toon('#4a4650')), M('leverSide', () => K3D.toon('#3a3640')), hz, hz], { ink: A.INK, inkW: 0.8 });
    base.position.y = 0.35; g.add(base);
    const slot = new T.Mesh(new T.BoxGeometry(0.16, 0.02, 0.62), K3D.flat('#0a0810')); slot.position.y = 0.71; g.add(slot);
    const lamp = new T.Mesh(new T.SphereGeometry(0.1, 12, 8), K3D.flat(hot('#ff3a2a', 2))); lamp.position.set(0.45, 0.76, 0.25); g.add(lamp);
    const piv = new T.Group(); piv.position.y = 0.7; g.add(piv);
    const arm = K3D.mesh(new T.CylinderGeometry(0.06, 0.06, 1.3, 10).translate(0, 0.65, 0), ARCADECLAW_MACHINE.chrome(), { ink: A.INK, inkW: 0.6 }); piv.add(arm);
    const knob = K3D.mesh(new T.SphereGeometry(0.2, 16, 12), M('leverKnob', () => TY.rimify(K3D.toon('#e8322a'), '1.0, 0.9, 0.9', 0.6, 3.0, 'acs-knob')), { ink: A.INK, inkW: 0.7 }); knob.position.y = 1.35; piv.add(knob);
    piv.rotation.x = 0.7; // leaning back toward the climb's start: pulled, it swings forward
    // the cable from the lever to the rail, with a paper tag and the light that runs up it
    const pts = lv.cable;
    const cab = A.cable(K, pts, { col: '#2a2a30', r: 0.1, clips: 4, labels: 'POWER' }); cab.userData.live = true; K.add(cab);
    const curve = new T.CatmullRomCurve3(pts.map(p => V(...p)));
    const pulse = [0, 1, 2, 3].map(() => SC.glows.add(0, -999, 0, 0.0, '#ffe890', 1.6, 0));
    K.add(g);
    return { g, piv, lamp, curve, pulse, knob };
  }
  function button(K, bt) {
    const g = new T.Group(); g.position.set(bt.x, bt.y, bt.z); g.userData.live = true;
    const rim = K3D.mesh(new T.CylinderGeometry(bt.r + 0.12, bt.r + 0.22, 0.24, 32), ARCADECLAW_MACHINE.chrome(), { ink: A.INK, inkW: 0.8 }); rim.position.y = 0.12; g.add(rim);
    const ring = new T.Mesh(new T.RingGeometry(bt.r - 0.02, bt.r + 0.1, 32).rotateX(-P / 2), K3D.toon('#ffffff', { map: K3D.paint('acs-push', 256, 256, (c, w, h) => { c.fillStyle = '#1a1a1a'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd23a'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; for (let i = 0; i < 4; i++) { c.save(); c.translate(w / 2, h / 2); c.rotate(i * P / 2); c.fillText('PUSH', 0, -h / 2 + 22); c.restore(); } }) })); ring.position.y = 0.245; g.add(ring);
    const cap = K3D.mesh(new T.SphereGeometry(bt.r, 28, 12, 0, P * 2, 0, P / 2), M('btnCap', () => TY.rimify(K3D.toon('#e8322a', { emissive: '#4a0a06', emissiveIntensity: 0.6 }), '1.0, 0.85, 0.8', 0.7, 2.5, 'acs-btn')), { ink: A.INK, inkW: 0.8 });
    cap.scale.y = 0.45; cap.position.y = 0.2; g.add(cap);
    // the striped cable to the toy box's lid, and the lid's lamp
    const cab = A.cable(K, bt.cable, { col: '#e8c040', r: 0.08, clips: 3 }); cab.userData.live = true; K.add(cab);
    K.add(g);
    return { g, cap };
  }
  const cartonTex = () => K3D.paint('acs-carton', 512, 256, (c, w, h) => {
    c.fillStyle = '#e8b45a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(120,70,20,${0.04 + A.rnd() * 0.06})`; c.fillRect(A.rnd() * w, 0, 1 + A.rnd() * 2, h); }
    c.fillStyle = '#c8322a'; c.fillRect(0, 0, w, 46); c.fillRect(0, h - 30, w, 30);
    c.fillStyle = '#fff4e0'; c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.fillText('JUMBO TOY CHEST', w / 2, 34);
    for (let i = 0; i < 14; i++) { c.fillStyle = A.NEON[i % 8]; c.save(); c.translate(30 + A.rnd() * (w - 60), 70 + A.rnd() * (h - 120)); c.rotate(A.rnd() * 3); c.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 6 : 15, a = k * P / 5; k ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(r, 0); } c.fill(); c.restore(); }
    c.fillStyle = '#3a2410'; c.font = 'bold 18px sans-serif'; c.fillText('THIS WAY UP  ↑   FRAGILE  ·  PRIZE PALACE', w / 2, h - 10);
    c.strokeStyle = 'rgba(80,40,10,0.5)'; c.lineWidth = 3; c.strokeRect(6, 6, w - 12, h - 12);
  });
  function toyBox(K) {
    const g = new T.Group(); g.userData.live = true;
    const card = M('carton', () => K3D.toon('#ffffff', { map: cartonTex() }));
    for (const id of ['tb-back', 'tb-left', 'tb-right', 'tb-top']) {
      const s = MP.solids.find(q => q.id === id);
      const b = K3D.mesh(new T.BoxGeometry(s.w, s.y1 - s.y0, s.d), card, { ink: A.INK, inkW: 0.9 }); b.position.set(s.x, (s.y0 + s.y1) / 2, s.z); g.add(b);
    }
    const ls = MP.solids.find(q => q.id === 'tb-lid');
    const lid = new T.Group(); g.add(lid);
    const lp = K3D.mesh(new T.BoxGeometry(ls.w, ls.y1 - ls.y0, ls.d), M('lid', () => K3D.toon('#c8322a', { map: A.grimeTex() })), { ink: A.INK, inkW: 0.9 }); lp.position.set(ls.x, (ls.y0 + ls.y1) / 2, ls.z); lid.add(lp);
    const star = new T.Mesh(new T.CircleGeometry(0.6, 5), M('lidStar', () => K3D.toon('#ffd23a'))); star.position.set(ls.x, (ls.y0 + ls.y1) / 2 + 0.2, ls.z + ls.d / 2 + 0.01); lid.add(star);
    const lamp = new T.Mesh(new T.SphereGeometry(0.16, 12, 8), K3D.flat(hot('#ff3a2a', 2))); lamp.position.set(ls.x + 1.15, 6.6, ls.z + 0.1); g.add(lamp);
    K.add(g);
    return { g, lid, lamp, y0: 0 };
  }
  const gateTex = () => K3D.paint('acs-gate', 1024, 384, (c, w, h) => {
    c.fillStyle = '#b8282a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,255,${0.03 + A.rnd() * 0.04})`; c.fillRect(A.rnd() * w, A.rnd() * h, 2 + A.rnd() * 30, 2); }
    c.strokeStyle = '#ffd23a'; c.lineWidth = 14; c.strokeRect(14, 14, w - 28, h - 28);
    c.fillStyle = '#ffd23a'; for (let i = 0; i < 26; i++) { c.save(); c.translate(40 + (i % 13) * 78, i < 13 ? 50 : h - 50); c.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 8 : 20, a = k * P / 5 - P / 2; k ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.fill(); c.restore(); }
    c.fillStyle = '#fff4e0'; c.font = 'bold 66px sans-serif'; c.textAlign = 'center'; c.fillText('PRIZE PALACE', w / 2, h / 2 - 30);
    c.font = 'bold 30px sans-serif'; c.fillText('★  STAFF ONLY BEYOND THIS LID  ★', w / 2, h / 2 + 22);
    c.fillStyle = '#3a1010'; c.beginPath(); c.arc(w / 2, h / 2 + 88, 34, 0, P * 2); c.fill(); c.fillRect(w / 2 - 12, h / 2 + 88, 24, 52);
  });
  function gate(K, gs) {
    const s = MP.solids.find(q => q.id === gs.solid);
    const piv = new T.Group(); piv.position.set(s.x, s.y1, s.z); piv.userData.live = true;
    const hgt = s.y1 - s.y0;
    const panel = K3D.mesh(new T.BoxGeometry(s.w, hgt, s.d), [M('gateSide', () => K3D.toon('#8a1a1a')), M('gateSide', () => K3D.toon('#8a1a1a')), M('gateSide', () => K3D.toon('#8a1a1a')), M('gateSide', () => K3D.toon('#8a1a1a')), M('gateFace', () => K3D.toon('#ffffff', { map: gateTex() })), M('gateFace', () => K3D.toon('#ffffff', { map: gateTex() }))], { ink: A.INK, inkW: 1.2 });
    panel.position.y = -hgt / 2; piv.add(panel);
    // the golden padlock on the front (it glows when the gold capsule's creature brings the key)
    const lock = new T.Group(); lock.position.set(0, -hgt / 2 - 1.2, s.d / 2 + 0.2); piv.add(lock);
    const body = K3D.mesh(K3D.roundBox(1.4, 1.2, 0.4, 0.4, 16), M('lock', () => TY.rimify(K3D.toon('#ffcc33', { emissive: '#5a3a00', emissiveIntensity: 0.5 }), '1.0, 0.95, 0.6', 1.0, 2.2, 'acs-gold2')), { ink: A.INK, inkW: 0.9 }); body.position.y = -0.6; lock.add(body);
    const shackle = K3D.mesh(new T.TorusGeometry(0.45, 0.1, 8, 20, P), ARCADECLAW_MACHINE.chrome(), { ink: A.INK, inkW: 0.7 }); shackle.position.y = 0.55; lock.add(shackle);
    const hole = new T.Mesh(new T.CircleGeometry(0.14, 12), K3D.flat('#1a0e06')); hole.position.set(0, 0.0, 0.21); lock.add(hole);
    // big hinges along its top, and bulbs along its edge
    for (let x = -s.w / 2 + 1.5; x < s.w / 2; x += 4.3) { const h = K3D.mesh(new T.CylinderGeometry(0.22, 0.22, 1.2, 12).rotateZ(P / 2), ARCADECLAW_MACHINE.chrome(), { ink: A.INK, inkW: 0.7 }); h.position.set(x, 0, 0); piv.add(h); }
    K.add(piv);
    for (let x = s.x0 || -s.w / 2 + 0.4; x < s.w / 2; x += 0.8) SC.bulbs.add(s.x + x, s.y0 + 0.15, s.z + s.d / 2 + 0.12, ['#ffe2a0', '#ff5ad6', '#5aff8a'][Math.round(x / 0.8 + 20) % 3], { size: 0.12, speed: 3.5, phase: x });
    return { piv, lock, shackle, s };
  }
  const flagTex = on => K3D.paint('acs-flag' + (on ? 1 : 0), 256, 128, (c, w, h) => {
    c.fillStyle = on ? '#ffd23a' : '#9a96a8'; c.fillRect(0, 0, w, h);
    c.fillStyle = on ? '#c8322a' : '#6a6676'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.fillText(on ? '★ SAVED ★' : 'TICKET', w / 2, h / 2 + 14);
    for (let y = 8; y < h; y += 16) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.arc(6, y, 4, 0, P * 2); c.fill(); c.beginPath(); c.arc(w - 6, y, 4, 0, P * 2); c.fill(); }
  });
  function checkFlag(K, k, i) {
    const g = new T.Group(); g.position.set(k.x + 1.3, k.y, k.z - 0.3); g.userData.live = true;
    // a beanbag to sit on, a lolly-stick pole, a ticket for a flag
    const bag = K3D.mesh(K3D.geo('acs-bag', () => { const gg = K3D.roundBox(1.5, 0.75, 1.3, 0.62, 24); const pa = gg.attributes.position; for (let k = 0; k < pa.count; k++) { const x = pa.getX(k), y = pa.getY(k), z = pa.getZ(k); pa.setY(k, y * (1 - 0.18 * Math.cos(x * 3.1) * Math.cos(z * 2.7)) + (y > 0.5 ? -0.12 * Math.exp(-(x * x + z * z) * 3) : 0)); } gg.computeVertexNormals(); return gg; }), M('bag' + i % 3, () => TY.rimify(K3D.toon(['#ff9ab8', '#7ad8ff', '#9aff9a'][i % 3], { map: TY.fuzzTex() }), '1.0, 0.95, 0.9', 0.35, 2.2, 'plush-bag')), { ink: A.INK, inkW: 0.9 });
    bag.position.set(0.45, -0.05, 0.35); bag.rotation.y = i * 0.7; g.add(bag);
    const pole = K3D.mesh(new T.CylinderGeometry(0.06, 0.06, 2.4, 8), M('stick', () => K3D.toon('#f6efe0')), { ink: A.INK, inkW: 0.5 }); pole.position.y = 1.2; g.add(pole);
    const fl = new T.Mesh(new T.PlaneGeometry(1.2, 0.6, 8, 1), M('flag0', () => K3D.toon('#ffffff', { map: flagTex(false), side: T.DoubleSide }))); fl.position.set(0.62, 2.1, 0); g.add(fl);
    const base = fl.geometry.attributes.position.array.slice();
    K.add(g);
    return { g, fl, base, on: false };
  }

  /* =============================== the heroes =============================== */
  function heroes(K) {
    const C = SC.claw;
    const pip = K3D.hero(0); K3D.dress(pip, 'arcadeclaw'); pip.userData.live = true; C.pipSeat.add(pip);
    const bo = K3D.hero(1); K3D.dress(bo, 'arcadeclaw'); bo.userData.live = true; K.add(bo);
    K3D.seeThrough(bo, PCOL[1]);
    const blob = K3D.blob(PCOL[1]); K.add(blob);
    // a soft pool of light that follows Bo, so Bo always stands out from the busiest heap
    const pool = new T.Mesh(new T.PlaneGeometry(3.4, 3.4).rotateX(-P / 2), K3D.flat(hot('#fff0d8', 0.55), { map: A.glowTex(), transparent: true, depthWrite: false, add: true }));
    pool.renderOrder = 3; pool.userData.live = true; K.add(pool);
    let keyring = null; for (const o of bo.userData.worn || []) o.traverse(q => { if (q.userData && q.userData.keyring) keyring = q.userData.keyring; });
    return { pip, bo, blob, keyring, pool };
  }

  /* =============================== the freed creatures (and the ones still in capsules) =============================== */
  function Crowd(K) {
    const cr = A.critters(K, 40);
    let k = 0; const list = [];
    const add = (x, y, z, o) => { const c = cr.add(x, y, z, o); const n = A.KINDS[c.kind].length; const it = { start: k, n, x, y, z, yaw: o.yaw || 0, act: ACTS[o.act] || 0, s: (o.s || 1) * 0.42 }; k += n; list.push(it); return it; };
    const geo = () => cr.mesh.geometry;
    const set = (it) => {
      const B = geo().attributes.aBase, An = geo().attributes.aAnim;
      for (let j = it.start; j < it.start + it.n; j++) { B.array[j * 4] = it.x; B.array[j * 4 + 1] = it.y; B.array[j * 4 + 2] = it.z; An.array[j * 4 + 1] = it.act; An.array[j * 4 + 2] = it.yaw; }
      B.needsUpdate = true; An.needsUpdate = true;
    };
    return { cr, add, set, list };
  }

  /* =============================== build =============================== */
  function build(K, st) {
    for (const k of Object.keys(SC)) delete SC[k];
    A.seed(4303);
    A.dark(K, { bg: '#0b0812', fog: '#1c1426', fogD: 0.006, amb: '#a898c0', ambK: 0.5, key: '#fff0d8', keyK: 0.62, fill: '#7ae0ff', under: '#ffb07a', hemiK: 0.26, bloom: 0.95 });
    K.bloom = { strength: 0.95, threshold: 1.0, radius: 1.1 };
    K.maxBlur = 1.1; K.focusRange = 34;
    SC.bulbs = A.lights(K, 16000); SC.glows = A.glows(K, 3000);
    SC.hall = MACH.hall(K, { bulbs: SC.bulbs });
    SC.out = MACH.outside(K, { bulbs: SC.bulbs, glows: SC.glows });
    SC.rail = MACH.rail(K, st);
    SC.heaps = ARCADECLAW_HEAPS.build(K, { bulbs: SC.bulbs, glows: SC.glows });
    // the claw, the cab and the two heroes
    SC.claw = MACH.claw(K); SC.claw.g.userData.live = true;
    SC.H = heroes(K);
    // the toys the claw moves (with a ghost each, shown at the ring while carried)
    const ghostFill = K3D.flat(hot('#5aff8a', 1.2), { transparent: true, opacity: 0.32, depthWrite: false });
    SC.ghostFill = ghostFill; SC.ghostInk = null;
    SC.toys = st.toys.map(t => {
      const g = TY.big(K, t);
      const gh = g.userData.body.clone(true); gh.userData.live = true;
      gh.traverse(o => {
        if (!o.isMesh) return;
        if (o.userData.hiHull) { o.visible = false; o.userData.ink = false; return; }
        if (o.userData.ink) {
          if (!o.visible) return;
          if (!SC.ghostInk) { const m = o.material.clone(); m.uniforms.uPx = o.material.uniforms.uPx; m.uniforms.uScale = o.material.uniforms.uScale; m.uniforms.uCol.value = new T.Color('#5aff8a').multiplyScalar(1.6); m.uniforms.uW = { value: 2.2 }; SC.ghostInk = m; }
          o.material = SC.ghostInk; return;
        }
        o.material = ghostFill; o.castShadow = false; o.receiveShadow = false; o.renderOrder = 14;
      });
      const ghost = new T.Group(); ghost.add(gh); ghost.visible = false; ghost.userData.live = true; K.add(ghost);
      return { t, g, ghost, setT: -9 };
    });
    SC.toyBy = {}; for (const q of SC.toys) SC.toyBy[q.t.id] = q;
    // the capsules and the creatures in them
    SC.crowd = Crowd(K);
    SC.caps = st.caps.map(c => {
      const v = capsule(K, c.def);
      const it = SC.crowd.add(c.x, c.y + 0.14, c.z, { kind: c.def.kind, col: c.def.col, act: CAP_ACT[c.def.act] || 'idle', s: 1.2, yaw: Math.atan2(-c.x, 10) });
      const glow = SC.glows.add(c.x, c.y + 0.7, c.z, c.def.gold ? 3.0 : 2.2, c.def.gold ? '#ffd23a' : c.def.col, c.def.buried ? 0.7 : 0.35, 0.15);
      const spark = c.def.gold ? [0, 1, 2].map(() => SC.glows.add(c.x, c.y + 1, c.z, 0.5, '#fff0b0', 1.6, 0.8)) : [];
      return Object.assign(v, { c, it, glow, spark, freeT: -1, topFly: null, state: 'in' });
    });
    // the levers (cables up to the rail), the floor button and the toy box, the gate, the checkpoint flags
    MP.levers.forEach(lv => {
      if (lv.cable) return;
      const side = lv.x < 0 ? -1 : 1, wallX = side * (lv.y > 1 ? 8 : 7), top = lv.y > 1 ? 7.2 : 4.2, ry = MP.railY(-lv.z) + 0.6;
      lv.cable = [[lv.x + side * 0.4, lv.y + 0.12, lv.z + 0.2], [(lv.x + wallX) / 2, lv.y + 0.18, lv.z + 0.4], [wallX - side * 0.25, lv.y + 0.3, lv.z + 0.5], [wallX + side * 0.1, top + 0.2, lv.z + 0.6], [side * 10.3, top + 0.4, lv.z + 0.6], [side * 10.6, (top + ry) / 2, lv.z + 0.6], [side * 10.6, ry, lv.z + 0.6]];
    });
    SC.levers = MP.levers.map(lv => lever(K, lv));
    const tbLid = MP.solids.find(q => q.id === 'tb-lid');
    SC.buttons = MP.buttons.map(bt => { bt.cable = bt.cable || [[bt.x + 0.9, bt.y + 0.06, bt.z], [bt.x + 2.5, bt.y + 0.08, bt.z + 0.5], [tbLid.x - 1.6, bt.y + 0.08, tbLid.z + 0.8], [tbLid.x - 1.55, bt.y + 1.6, tbLid.z + 0.05]]; return button(K, bt); });
    SC.box = toyBox(K);
    SC.gates = MP.gates.map(gs => gate(K, gs));
    SC.flags = MP.checks.map((k, i) => (i ? checkFlag(K, k, i) : null));
    // the striped bouncy balls and the soft bumps (a plush lying on each)
    SC.balls = MP.solids.filter(s => s.look === 'ball').map(s => { const g = TY.build('sball', { pal: 1, inkW: 1.1 }); g.scale.setScalar(s.w / 0.6); g.position.set(s.x, s.y0, s.z); g.userData.live = true; K.add(g); return { s, g, sq: 0 }; });
    SC.bumps = MP.solids.filter(s => s.soft).map((s, i) => { const k = ['whale', 'cloud', 'fish'][i % 3], kd = TY.KINDS[k]; const g = TY.build(k, { pal: i, inkW: 1.0 }); g.scale.set(s.w / kd.size[0] * 1.05, (s.y1 - s.y0) / kd.size[1] * 1.15, s.d / kd.size[2] * 1.05); g.position.set(s.x, s.y0 - 0.02, s.z); g.rotation.y = i * 1.3; g.userData.live = true; K.add(g); return { s, g, sq: 0, sy: g.scale.y }; });
    // the Snatcher, asleep in the rafters far up the mountain (its own story starts in Plush Mountain)
    const sn = MACH.snatcher(K); sn.userData.live = true; sn.position.set(-8.5, MP.groundRef(104) + 31, -104); sn.rotation.y = 0.5; SC.snatch = sn;
    const chainUp = K3D.mesh(new T.CylinderGeometry(0.08, 0.08, 1, 6).translate(0, 0.5, 0), MACH.steel(), { ink: false }); chainUp.position.set(-8.5, sn.position.y + 0.9, -104); chainUp.scale.y = 64 - sn.position.y; K.add(chainUp);
    const beam = K3D.mesh(new T.BoxGeometry(33, 0.8, 0.9), MACH.steel(), { ink: A.INK }); beam.position.set(0, 63, -104); K.add(beam);
    SC.zzz = [0, 1, 2].map(i => SC.glows.add(-8.5, sn.position.y + 2, -104, 0.5, '#ff6a5a', 0.5, 0));
    // the creatures' camps and stories (arcadeclaw-life.js)
    if (typeof ARCADECLAW_LIFE !== 'undefined') SC.life = ARCADECLAW_LIFE.build(K, SC, st);
    // light: soft warm shafts from the work lamps under the roof, dust and floating pixels
    for (const [x, z] of [[-5, -6], [6, -26], [-3, -50], [4, -68]]) {
      const lampY = 62;
      A.shaft(K, [x * 0.6, lampY, z + 6], [x, MP.groundRef(-z), z], 5.5, '#ffe2b0', 0.12);
      const lamp = K3D.mesh(new T.ConeGeometry(1.4, 1.2, 16, 1, true), M('worklamp', () => K3D.toon('#3a3a44', { side: T.DoubleSide })), { ink: A.INK }); lamp.position.set(x * 0.6, lampY, z + 6); K.add(lamp);
      const bulb = new T.Mesh(new T.SphereGeometry(0.5, 12, 8), K3D.flat(hot('#fff0c8', 3))); bulb.position.set(x * 0.6, lampY - 0.4, z + 6); K.add(bulb);
    }
    A.motes(K, { n: 2400, box: 50, pixels: 0.22, k: 0.9 });
    SC.crowd.cr.done();
    SC.glows.done(); SC.bulbs.done();
    // batch the still scenery
    K3D.bake(K.root);
    SC.t = 0; SC.fxSeen = 0; SC.trail = []; SC.cheerT = 99; SC.cam = null; SC.stick = { x: 0, z: 0 };
    update(K, st, 0);
    return SC;
  }

  /* =============================== every frame =============================== */
  const tA = V(0, 0, 0), tB = V(0, 0, 0), tC = V(0, 0, 0);
  function update(K, st, dt) {
    if (!SC.claw || !st.claw) return;
    SC.t += dt; const t = SC.t;
    const ps = G.players, b = ps[1].b3, C = st.claw, CO = ARCADECLAW;
    // ---- what just happened ----
    if ((st.fxN || 0) < SC.fxSeen) SC.fxSeen = 0; // (a new climb)
    for (const f of st.fx) {
      if (f.n <= SC.fxSeen) continue;
      SC.fxSeen = f.n;
      if (f.k === 'freed') { const cv = SC.caps.find(q => q.c.id === f.cap); if (cv) { cv.freeT = t; cv.state = 'hop'; } SC.cheerT = 0; }
      if (f.k === 'set') { const q = SC.toyBy[f.toy]; if (q) q.setT = t; }
      if (f.k === 'lever') { const i = MP.levers.findIndex(l => l.id === f.id); if (i >= 0) SC.levers[i].pullT = t; SC.cheerT = 0; }
      if (f.k === 'gate') SC.cheerT = 0;
      if (f.k === 'bounce') { let best = null, bd = 3; for (const bl of SC.balls) { const d = Math.hypot(bl.s.x - b.x, bl.s.z - b.z); if (d < bd) { bd = d; best = bl; } } if (best) best.sq = 1; }
      if (f.k === 'restock') { const q = SC.toyBy[f.toy]; if (q) q.dropT = t; }
      if (f.k === 'restart') SC.trail.length = 0;
    }
    SC.cheerT += dt;
    // ---- the claw ----
    const CL = SC.claw, ry = MP.railY(C.s), [cx, cz] = CO.clawXZ(st);
    CL.bridge.position.set(0, ry + 1.15, cz);
    CL.trolley.position.x = cx;
    CL.hang.rotation.set(C.swingZ * 0.6, 0, C.swingX * 0.6);
    const hangY = ry + 0.15;
    CL.head.position.y = C.tip + 2.1 - hangY;
    CL.cable.scale.y = Math.max(0.05, -(CL.head.position.y + 1.0));
    // fingers: open while dropping or empty, closed round the held toy
    const held = C.toy && st.toyById[C.toy];
    let fa;
    if (held) { const D = CO.dims(held); fa = clamp((Math.min(D.w, D.d) * 0.36 - 0.48) / 2, -0.22, 0.4); }
    else if (C.mode === 'close') fa = 0.4 - Math.min(1, C.t / CO.S.CLOSE) * 0.62;
    else if (C.mode === 'down' || C.mode === 'open') fa = 0.42;
    else fa = C.mode === 'up' ? -0.2 : 0.1;
    SC.fing = SC.fing == null ? fa : SC.fing + (fa - SC.fing) * Math.min(1, dt * 14);
    for (const f of CL.fingers) f.rotation.z = SC.fing;
    CL.beacon.material.color.copy(hot('#ffb02a', C.mode === 'free' ? 1.4 : 1.4 + Math.abs(Math.sin(t * 10)) * 2));
    // the stick in the cab leans the way the claw goes
    SC.stick.x += (C.vu * 0.07 - SC.stick.x) * Math.min(1, dt * 10); SC.stick.z += (-C.vs * 0.07 - SC.stick.z) * Math.min(1, dt * 10);
    CL.stick.rotation.set(SC.stick.z * Math.cos(P / 4) - SC.stick.x * Math.sin(P / 4), 0, -(SC.stick.x * Math.cos(P / 4) + SC.stick.z * Math.sin(P / 4)));
    // the aim ring (at the ghost while carrying) and its beam
    const ring = CO.ringAt(st);
    const g = st.ghost;
    let rX = ring.x, rY = ring.y, rZ = ring.z;
    if (g) { rX = g.x; rZ = g.z; rY = g.y; }
    CL.aim.position.set(rX, rY + 0.05, rZ);
    CL.aim.rotation.y = t * 0.6;
    const ringCol = g ? (g.ok ? '#5aff8a' : '#a8a8b8') : '#ff8a1a';
    CL.ringM.color.copy(hot(ringCol, 2.2));
    CL.aim.visible = st.phase !== 'intro';
    CL.beam.position.set(rX, rY + 0.05, rZ);
    CL.beam.scale.y = Math.max(0.05, C.tip - rY - 0.1);
    CL.beam.visible = CL.aim.visible && C.mode === 'free';
    SC.ringPos = V(rX, rY, rZ);
    // ---- the toys ----
    const target = C.mode === 'free' && !C.toy ? CO.toyAtRing(st, ring) : null;
    const nob = st.gold ? CO.nextOb(st) : null, goldToy = nob && (nob.toy || (nob.toys && nob.toys.find(id => { const q = st.toyById[id]; return q && !q.held && CO.inFoot(q, q.home.x, q.home.z, 0.1); })));
    for (const q of SC.toys) {
      const tt = q.t, gg = q.g, D = CO.dims(tt);
      let y = tt.y;
      if (q.dropT != null && t - q.dropT < 0.9) { const u = (t - q.dropT) / 0.9; y += (1 - u) * (1 - u) * 14; }
      gg.position.set(tt.x, y, tt.z);
      gg.rotation.set(tt.held ? C.swingZ * 0.5 : 0, tt.rot, tt.held ? C.swingX * 0.5 : 0);
      // a little squash when set down
      const su = t - q.setT; const sq = su < 0.4 ? Math.sin(su / 0.4 * P) * 0.12 : 0;
      gg.userData.body.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
      if (gg.userData.snake) { gg.userData.snake.coil.visible = !tt.uncoiled; gg.userData.snake.straight.visible = !!tt.uncoiled; }
      const gold = st.gold && goldToy === tt.id;
      gg.userData.hi(target === tt || gold, gold && target !== tt);
      if (gg.userData.handleGlow) {
        const h = CO.handleAt(tt), near = Math.hypot(h.x - b.x, h.z - b.z) < 2.5;
        const want = st.hang === tt.id ? 0.85 : (C.toy === tt.id && C.mode === 'offer') ? 0.75 : near ? 0.6 : 0.28;
        gg.userData.handleGlow.material.opacity = want * (0.75 + 0.25 * Math.sin(t * 5));
      }
      if (gg.userData.eye) gg.userData.eye.visible = !(tt.held && t % 3 < 0.05);
      // the ghost: where it will sit, the right way up
      const show = g && g.toy === tt.id;
      q.ghost.visible = !!show;
      if (show) { q.ghost.position.set(g.x, g.y, g.z); q.ghost.rotation.y = g.rot; }
    }
    if (g) { const c = g.ok ? '#5aff8a' : '#a8a8b8'; SC.ghostFill.color.copy(hot(c, g.ok ? 1.2 : 0.9)); if (SC.ghostInk) SC.ghostInk.uniforms.uCol.value.copy(hot(c, 1.6)); }
    // ---- Pip at the stick, Bo ----
    const HS = SC.H;
    CL.g.updateMatrixWorld(true);
    const knob = CL.stick.localToWorld(tA.set(0, 0.32, 0)).clone();
    const press = (C.mode === 'down' || C.mode === 'lower' || C.mode === 'offer') && C.t < 0.3;
    const btn = CL.cab.localToWorld(tB.set(press ? 0.02 : -0.1, press ? -0.3 : -0.26, 0.5)).clone();
    K3D.heroPose(HS.pip, { x: 0, y: 0, z: 0, heading: 0, speed: 0, vy: 0, hands: [btn, knob], mood: 'sit', lookX: clamp(C.vu * 0.2, -1, 1) }, dt);
    const cabW = CL.cab.localToWorld(tC.set(0, 0.2, 0)).clone();
    SC.cabPos = cabW;
    let hands = null, mood = b.teeter > 0 ? 'whoa' : null;
    if (st.hang) { const h = CO.handleAt(st.toyById[st.hang]); hands = [V(h.x - 0.06, h.y - 0.35, h.z), V(h.x + 0.06, h.y - 0.35, h.z)]; mood = null; }
    else if (st.capTgt) { const cp = st.caps.find(q => q.id === st.capTgt); if (cp) hands = [V(cp.x - 0.22, cp.y + 1.05, cp.z), V(cp.x + 0.22, cp.y + 1.05, cp.z)]; }
    else { for (const lv of MP.levers) { const pt = st.levers[lv.id]; if (pt != null && st.t - pt < 0.6) { const i = MP.levers.indexOf(lv); SC.levers[i].knob.updateMatrixWorld(true); const kp = SC.levers[i].knob.getWorldPosition(V(0, 0, 0)); hands = [kp, kp.clone().add(V(0.08, 0, 0))]; } } }
    const sp = Math.hypot(b.vx, b.vz) / (PHYS.maxRun / K3D.U);
    K3D.heroPose(HS.bo, { x: b.x, y: b.y, z: b.z, heading: b.heading, speed: st.hang ? 0 : Math.min(1.2, sp), vy: st.hang ? 0 : b.vy, land: b.land, hands, mood }, dt);
    const gy = MOVER3.floorAt(st.w, b.x, b.z, b.y + 0.3, 0);
    K3D.placeBlob(HS.blob, b.x, gy > -5 ? gy : b.y, b.z, Math.max(0, b.y - (gy > -5 ? gy : b.y)));
    HS.pool.position.set(b.x, (gy > -5 ? gy : b.y) + 0.22, b.z);
    if (HS.keyring) HS.keyring.rotation.z = Math.sin(t * 7 + b.x) * 0.25 * Math.min(1, sp + (st.hang ? 1 : 0)) + (st.hang ? Math.sin(t * 3) * 0.3 : 0);
    // name tags and bubbles: by each hero on screen
    const s0 = K3D.toScreen(cabW.x, cabW.y + 1.1, cabW.z); ps[0].x = s0.x - ps[0].w / 2; ps[0].y = s0.y;
    const s1 = K3D.toScreen(b.x, b.y + K3D.HERO.h + 0.3, b.z); ps[1].x = s1.x - ps[1].w / 2; ps[1].y = s1.y;
    // ---- capsules, freed creatures ----
    capsUpdate(st, dt, t);
    crowdUpdate(st, dt, t);
    // ---- the machine's things ----
    propsUpdate(st, dt, t);
    MACH.railUpdate(SC.rail, st, t, dt);
    if (SC.life) SC.life.update(st, dt, t);
    // the Snatcher snores (its lamp breathes, a few red sparks rise)
    const sn = SC.snatch.userData;
    sn.lamp.material.color.copy(hot('#ff2a1a', 0.2 + 0.25 * (0.5 + 0.5 * Math.sin(t * 0.9))));
    SC.snatch.rotation.z = Math.sin(t * 0.4) * 0.02;
    SC.zzz.forEach((i, k) => { const u = ((t * 0.25 + k / 3) % 1); SC.glows.set(i, -8.5 + Math.sin(u * 6 + k) * 0.6 + u * 1.5, SC.snatch.position.y + 1.5 + u * 4, -104 + 1, 0.5 * (1 - u) + 0.1); });
    // the creatures everywhere watch Bo and cheer
    const react = { hero: [b.x, b.y, b.z], cheer: SC.cheerT };
    SC.crowd.cr.react(react);
    if (SC.life && SC.life.crit) SC.life.crit.react(react);
    // ---- the camera ----
    camera(K, st, dt);
  }

  function capsUpdate(st, dt, t) {
    for (const cv of SC.caps) {
      const c = st.caps.find(q => q.id === cv.c.id);
      cv.top.rotation.y = (c.open || 0) * 2.4;
      cv.top.position.y = 0.6 + (c.open || 0) * 0.1;
      if (c.freed && cv.freeT < 0) { cv.freeT = t - 5; cv.state = 'follow'; } // (already free when the scene was built)
      if (cv.freeT >= 0) {
        // the top pops off and tumbles to the side; the glow goes out
        const u = t - cv.freeT;
        if (!cv.topFly) cv.topFly = { vx: (Math.random() - 0.5) * 2.4, vz: 1.2 + Math.random(), r: (Math.random() - 0.5) * 8 };
        const fu = Math.min(u, 0.7), f = cv.topFly;
        const floor = 0.05 - 0.6;
        cv.top.position.set(f.vx * fu, Math.max(floor, 0.7 + 4.4 * fu - 9 * fu * fu), f.vz * fu);
        cv.top.rotation.set(f.r * fu, 2.4 + fu * 6, u > 0.7 ? P * 0.55 : f.r * fu * 0.5);
        SC.glows.set(cv.glow, c.x, c.y + 0.7, c.z, Math.max(0, (c.def.gold ? 3 : 2.2) * (1 - u * 2)));
        for (const sI of cv.spark) SC.glows.set(sI, c.x, -999, c.z, 0);
      } else {
        for (const [k, sI] of cv.spark.entries()) { const a = t * 1.3 + k * 2.1; SC.glows.set(sI, c.x + Math.cos(a) * 0.75, c.y + 0.7 + Math.sin(t * 2 + k) * 0.35, c.z + Math.sin(a) * 0.75, 0.25 + 0.25 * Math.abs(Math.sin(t * 3 + k))); }
        // knocking on the glass: the capsule rocks a little
        if (c.def.act === 'knock') cv.g.rotation.z = Math.sin(t * 9) * 0.03 * (Math.sin(t * 0.7) > 0.3 ? 1 : 0);
      }
      if (cv.g.userData.key) cv.g.userData.key.visible = !c.freed;
    }
  }

  // the freed creatures hop out, cheer, and follow Bo up the mountain in a line (a chain under Bo when Pip carries Bo)
  function crowdUpdate(st, dt, t) {
    const b = G.players[1].b3, CR = SC.crowd;
    // Bo's trail on the ground
    const tr = SC.trail;
    if (b.ground && !st.hang) { const l = tr[tr.length - 1]; if (!l || Math.hypot(l[0] - b.x, l[2] - b.z) > 0.35 || Math.abs(l[1] - b.y) > 0.5) { tr.push([b.x, b.y, b.z]); if (tr.length > 600) tr.shift(); } }
    const followers = SC.caps.filter(cv => cv.state === 'follow').sort((a, b2) => a.freeT - b2.freeT);
    let rank = 0;
    for (const cv of SC.caps) {
      const it = cv.it, c = cv.c;
      if (cv.state === 'in') { it.x = c.x; it.y = c.y + 0.14 + (c.def.act === 'wave' ? 0 : 0); it.z = c.z; CR.set(it); continue; }
      const u = t - cv.freeT;
      if (cv.state === 'hop') {
        // out over the rim and down beside the capsule, facing Bo
        const k = Math.min(1, u / 0.55), ox = (b.x - c.x), oz = (b.z - c.z), ol = Math.hypot(ox, oz) || 1;
        it.x = c.x + ox / ol * 1.0 * k; it.z = c.z + oz / ol * 1.0 * k; it.y = c.y + 0.14 + Math.sin(k * P) * 1.1;
        it.act = ACTS.cheer; it.yaw = Math.atan2(ox, oz);
        if (u > 1.6) { cv.state = 'follow'; cv.fx = it.x; cv.fz = it.z; cv.fy = it.y; }
        CR.set(it); continue;
      }
      // following: a place on Bo's trail, one creature length apart; or dangling in a chain while Bo is carried
      const i = followers.indexOf(cv); rank = i;
      let tx, ty, tz;
      if (st.hang && i < 5) {
        const sw = Math.sin(t * 3 + i) * 0.12 * (i + 1);
        tx = b.x + sw; ty = b.y - 0.42 * (i + 1) - 0.3; tz = b.z + Math.cos(t * 2.6 + i) * 0.08 * (i + 1);
        it.x += (tx - it.x) * Math.min(1, dt * 12); it.y += (ty - it.y) * Math.min(1, dt * 12); it.z += (tz - it.z) * Math.min(1, dt * 12);
        it.act = ACTS.cheer; it.yaw = b.heading + P;
        CR.set(it); continue;
      }
      const back = 1.1 * (i + 1) + 0.4;
      // walk back along the trail by `back` units
      let d = 0, p = null;
      for (let j = tr.length - 1; j > 0; j--) { const a = tr[j], a2 = tr[j - 1], l = Math.hypot(a[0] - a2[0], a[2] - a2[2]) + Math.abs(a[1] - a2[1]) * 0.5; if (d + l >= back) { const f = (back - d) / (l || 1); p = [a[0] + (a2[0] - a[0]) * f, a[1] + (a2[1] - a[1]) * f, a[2] + (a2[2] - a[2]) * f]; break; } d += l; }
      if (!p) p = tr.length ? tr[0] : [b.x, b.y, b.z];
      tx = p[0] + Math.sin(i * 2.3) * 0.3; tz = p[2] + Math.cos(i * 1.7) * 0.25; ty = p[1];
      const dx = tx - it.x, dz = tz - it.z, dl = Math.hypot(dx, dz), stepL = Math.min(dl, 7.2 * dt);
      const moving = dl > 0.12;
      if (dl > 0.001) { it.x += dx / dl * stepL; it.z += dz / dl * stepL; }
      // up and down: a hop when the ground changes a lot (scrambling up a ledge), else a little bounce
      const far = Math.abs(ty - it.y) > 0.6;
      it.y += (ty - it.y) * Math.min(1, dt * (far ? 4 : 12));
      const hop = moving ? Math.abs(Math.sin(t * 11 + i)) * 0.12 + (far ? 0.6 : 0) : 0;
      it.act = SC.cheerT < 1.5 ? ACTS.cheer : moving ? ACTS.idle : (i % 3 === 0 ? ACTS.wave : ACTS.idle);
      if (moving) it.yaw = Math.atan2(dx, dz);
      const ry0 = it.y; it.y += hop; CR.set(it); it.y = ry0;
    }
  }

  function propsUpdate(st, dt, t) {
    const b = G.players[1].b3;
    // levers: the arm swings forward when pulled, the lamp turns green, light runs up the cable to the rail
    MP.levers.forEach((lv, i) => {
      const L = SC.levers[i], pulled = st.levers[lv.id] != null;
      const want = pulled ? -0.75 : 0.7 + Math.sin(t * 2 + i) * 0.03;
      L.piv.rotation.x += (want - L.piv.rotation.x) * Math.min(1, dt * 14);
      L.lamp.material.color.copy(hot(pulled ? '#5aff8a' : '#ff3a2a', pulled ? 2.2 : 1.2 + Math.abs(Math.sin(t * 4)) * 1.2));
      const u = L.pullT != null ? (t - L.pullT) / 1.1 : 9;
      L.pulse.forEach((gi, k) => { const v = u - k * 0.06; if (v > 0 && v < 1) { const p = L.curve.getPointAt(v); SC.glows.set(gi, p.x, p.y + 0.1, p.z, 1.3 - k * 0.25); } else SC.glows.set(gi, 0, -999, 0, 0); });
    });
    // the floor button and the toy box's lid (it slides up while the button is held down)
    MP.buttons.forEach((bt, i) => {
      const B = st.btn[bt.id], bv = SC.buttons[i];
      bv.cap.position.y += ((B.down ? 0.06 : 0.2) - bv.cap.position.y) * Math.min(1, dt * 16);
      if (bt.opens === 'tb-lid') {
        SC.box.y0 += ((B.down ? 2.75 : 0) - SC.box.y0) * Math.min(1, dt * 7);
        SC.box.lid.position.y = SC.box.y0;
        SC.box.lamp.material.color.copy(hot(B.down ? '#5aff8a' : '#ff3a2a', 2));
      }
    });
    // the part gates swing up and back on their hinges
    MP.gates.forEach((gs, i) => {
      const Gt = st.gate[gs.id], gv = SC.gates[i];
      const u = Gt.open ? clamp((st.t - Gt.t) / 1.4, 0, 1) : 0;
      gv.piv.rotation.x = sm(u) * 1.5;
      const ready = Gt.pending && !Gt.open;
      gv.lock.children[0].material.emissiveIntensity = ready ? 1.5 + Math.sin(t * 12) : 0.5;
      gv.shackle.position.y = 0.55 + (ready || Gt.open ? 0.35 : 0);
    });
    // checkpoint flags flap; reached ones turn gold
    SC.flags.forEach((f, i) => {
      if (!f) return;
      if (!f.on && st.check >= i) { f.on = true; f.fl.material = M('flag1', () => K3D.toon('#ffffff', { map: flagTex(true), side: T.DoubleSide })); }
      const a = f.fl.geometry.attributes.position;
      for (let k = 0; k < a.count; k++) { const x = f.base[k * 3]; const u = (x + 0.6) / 1.2; a.setZ(k, Math.sin(t * 5 + u * 4 + i) * 0.12 * u); }
      a.needsUpdate = true;
    });
    // bouncy balls squash, soft bumps give underfoot
    for (const bl of SC.balls) { bl.sq = Math.max(0, bl.sq - dt * 4); const s = bl.s.w / 0.6, q = Math.sin(bl.sq * P) * 0.25; bl.g.scale.set(s * (1 + q * 0.6), s * (1 - q), s * (1 + q * 0.6)); }
    for (const bm of SC.bumps) { const on = b.ground && b.on && b.on.id === bm.s.id; bm.sq += ((on ? 1 : 0) - bm.sq) * Math.min(1, dt * 10); bm.g.scale.y = bm.sy * (1 - bm.sq * 0.25); }
    // the bean pit: beans give way round Bo's feet
    for (const pit of SC.heaps.sink) {
      const sk = pit.sk, inPit = b.x > sk.x0 - 0.5 && b.x < sk.x1 + 0.5 && b.z < sk.z0 + 0.5 && b.z > sk.z1 - 0.5 && Math.abs(b.y - sk.y) < 1.2;
      if (!inPit && !pit.dirty) continue;
      pit.dirty = inPit;
      const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = V(0, 0, 0), s = V(1, 1, 1);
      pit.beans.forEach((bn, k) => {
        const d = Math.hypot(bn[0] - b.x, bn[1] - b.z);
        const dip = inPit ? (d < 0.7 ? -0.22 * (1 - d / 0.7) * (0.5 + st.sink * 0.8) : d < 1.3 ? 0.07 * Math.sin((d - 0.7) / 0.6 * P) : 0) : 0;
        e.set(bn[2] + (inPit && d < 1.2 ? Math.sin(t * 9 + k) * 0.2 : 0), bn[3], 0); q.setFromEuler(e);
        m4.compose(v.set(bn[0], pit.base + dip, bn[1]), q, s); pit.im.setMatrixAt(k, m4);
      });
      pit.im.instanceMatrix.needsUpdate = true;
    }
  }

  /* =============================== the camera =============================== */
  // behind Bo and up, looking across the mountain: as close as it can be while Bo (low in the picture) and the claw
  // (near the top) both fit; Pip's cab shows whenever that does not mean pulling back far. Never outside the glass front.
  const PITCH = 0.42, FOV = 54;
  function playShot(st) {
    const b = G.players[1].b3, C = st.claw, [cx, cz] = ARCADECLAW.clawXZ(st);
    const head = V(cx, C.tip + 0.6, cz), bo = V(b.x, b.y, b.z), cab = SC.cabPos || head;
    const at = V(bo.x * 0.6 + head.x * 0.4, (bo.y + 0.45) * 0.52 + head.y * 0.48, bo.z * 0.55 + head.z * 0.45);
    const f = V(0, -Math.sin(PITCH), -Math.cos(PITCH)), u = V(0, Math.cos(PITCH), -Math.sin(PITCH)), r = V(1, 0, 0);
    const tv = Math.tan(FOV * P / 360), th = tv * (K3D.K ? K3D.K.camera.aspect : 16 / 9);
    const need = (q, m) => { const v = q.clone().sub(at), along = f.dot(v); return Math.max(Math.abs(u.dot(v)) / (tv * m), Math.abs(r.dot(v)) / (th * m)) - along; };
    let D = Math.max(9.5, need(bo, 0.74), need(V(bo.x, bo.y + 0.95, bo.z), 0.74), need(head, 0.86), need(SC.ringPos || bo, 0.8));
    const withCab = Math.max(D, need(cab, 0.95));
    if (withCab < 12) D = withCab;
    SC.camD = D;
    D = Math.min(D, 22);
    const eye = at.clone().addScaledVector(f, -D);
    if (eye.z > 19.3) { const k = (eye.z - 19.3); eye.z = 19.3; eye.y += k * 0.4; }
    eye.x = clamp(eye.x, -12, 12);
    return { eye, at, fov: FOV };
  }
  // the opening: outside the glass, the joystick and coin door; in through the glass; down to the pair
  const INTRO = [
    { t: 0, eye: [9, 15, 60], at: [0, 7, -8] },
    { t: 4.5, eye: [3, 12, 42], at: [0, 6, -14] },
    { t: 8.5, eye: [0.5, 10.5, 18.5], at: [-2.2, 7.5, -4] },
  ];
  function introShot(st) {
    const u = st.phaseT, play = playShot(st);
    let a = INTRO[0], b = INTRO[1];
    for (let i = 0; i < INTRO.length - 1; i++) if (u >= INTRO[i].t) { a = INTRO[i]; b = INTRO[i + 1]; }
    const k = sm(clamp((u - a.t) / (b.t - a.t), 0, 1));
    const eye = V(...a.eye).lerp(V(...b.eye), k), at = V(...a.at).lerp(V(...b.at), k);
    const blend = sm(clamp((u - 9) / 3, 0, 1));
    return { eye: eye.lerp(play.eye, blend), at: at.lerp(play.at, blend), fov: FOV };
  }
  function camera(K, st, dt) {
    const cam = K.camera, o = ARCADECLAW_SCENE.camOverride;
    let shot;
    if (o) shot = { eye: V(...o.eye), at: V(...o.at), fov: o.fov || FOV };
    else shot = st.phase === 'intro' ? introShot(st) : playShot(st);
    if (!SC.cam || o || st.phase === 'intro' || dt === 0) SC.cam = { eye: shot.eye.clone(), at: shot.at.clone() };
    else { ease(SC.cam.eye, shot.eye, dt, 3.2); ease(SC.cam.at, shot.at, dt, 3.8); }
    cam.position.copy(SC.cam.eye); cam.lookAt(SC.cam.at);
    if (Math.abs(cam.fov - shot.fov) > 0.01) { cam.fov = shot.fov; cam.updateProjectionMatrix(); }
    const b = G.players[1].b3;
    K.focus.set(b.x, b.y + 0.5, b.z);
    K.sunAt(V((b.x + SC.ringPos.x) / 2, b.y, (b.z + SC.ringPos.z) / 2), 20);
  }

  return { build, update, camOverride: null, SC };
})();
