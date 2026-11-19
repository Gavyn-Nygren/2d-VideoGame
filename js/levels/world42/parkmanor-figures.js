/* Pip & Bo - 42-3 Spook Manor: the figures (PARKMANOR_FIG). Loaded on demand with the 3D kit (three.js is here).
   Fairground figures: tin, wood, cloth and springs, every one with a brass key turning in its back. A bit funny in the
   light, nasty in the dark (their painted eyes light up and their keys tick round when they can move).
     FIG.lantern()            Pip's brass lantern (glass panes, a flame, a shutter that closes when hiding)
     FIG.key()                Bo's big brass winding key, carried over a shoulder
     FIG.sheet()              a bedsheet ghost on a wheeled stand, arms out, painted eyes
     FIG.armour(o)            a suit of armour on a plinth (o.live: a spook, with a key and eyes that light)
     FIG.butler()             Grimsby: very tall and thin, tailcoat, porcelain face with a fixed smile, white gloves, a
                              silver tray, a huge key in his back
     FIG.clock()              a grandfather clock (pendulum, a face that lights when it becomes the restart point)
     FIG.wardrobe()           a big dark wardrobe whose doors open (a hiding place)
     FIG.cook(), FIG.doll(k), FIG.dancer(k), FIG.portraitSpook(k, tex), FIG.chair()   the spooks of stretches 2 to 4
     FIG.wisp()               a small friendly blue-green flame
   Each returns a Group with .userData.set(state, t, dt) (or similar) that poses it for the level's state. */
'use strict';

const PARKMANOR_FIG = (function () {
  const T = K3D.T;
  const F = {};
  const INK = '#15111f';
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const mk = (geo, mat, o) => K3D.mesh(geo, mat, o);
  const M = (key, make) => K3D.mat('pmf|' + key, make);
  const brass = () => M('brass', () => K3D.toon('#d8a640', { emissive: '#3a2406', emissiveIntensity: 0.4 }));
  const brassDk = () => M('brassDk', () => K3D.toon('#9a6c22'));
  F.brass = brass;

  /* ---------- a brass winding key (the spooks' keys, Bo's key, the Butler's huge one) ---------- */
  F.windKey = function (s = 1) {
    const g = new T.Group();
    const bow = mk(new T.TorusGeometry(0.12 * s, 0.035 * s, 8, 20), brass(), { ink: INK, inkW: 0.7 }); bow.position.y = 0.22 * s; g.add(bow);
    const bow2 = mk(new T.TorusGeometry(0.12 * s, 0.035 * s, 8, 20), brass(), { ink: INK, inkW: 0.7 }); bow2.position.y = 0.22 * s; bow2.rotation.y = 0; bow2.scale.set(1, 1, 1); bow2.position.x = 0; g.add(bow2); bow2.rotation.z = Math.PI / 2; bow2.position.y = 0.22 * s;
    bow.position.x = -0.1 * s; bow2.position.x = 0.1 * s; bow2.rotation.z = 0;
    const hub = mk(new T.CylinderGeometry(0.05 * s, 0.05 * s, 0.1 * s, 10).rotateX(Math.PI / 2), brassDk(), { ink: INK, inkW: 0.6 }); hub.position.y = 0.2 * s; g.add(hub);
    const shaft = mk(new T.CylinderGeometry(0.035 * s, 0.035 * s, 0.28 * s, 8), brass(), { ink: INK, inkW: 0.6 }); shaft.position.y = 0.04 * s; g.add(shaft);
    g.rotation.x = -Math.PI / 2; // (the bow sticks out behind: local -Z after the turn)
    const holder = new T.Group(); holder.add(g);
    return holder;
  };

  /* ---------- Pip's lantern ---------- */
  F.lantern = function () {
    const g = new T.Group();
    const frame = brass();
    const base = mk(new T.CylinderGeometry(0.13, 0.15, 0.06, 12), frame, { ink: INK, inkW: 0.6 }); g.add(base);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; const p = mk(new T.CylinderGeometry(0.014, 0.014, 0.26, 6), frame, { ink: INK, inkW: 0.4 }); p.position.set(Math.cos(a) * 0.11, 0.16, Math.sin(a) * 0.11); g.add(p); }
    const glassM = K3D.flat(hot('#ffcf7a', 1.25), { transparent: true, opacity: 0.55, depthWrite: false });
    const glass = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.24, 4, 1, true).rotateY(Math.PI / 4), glassM); glass.position.y = 0.16; g.add(glass);
    const flame = new T.Mesh(new T.SphereGeometry(0.045, 10, 8).scale(1, 1.7, 1), K3D.flat(hot('#ffe2a0', 4.5))); flame.position.y = 0.15; g.add(flame);
    const cap = mk(new T.ConeGeometry(0.15, 0.1, 12), frame, { ink: INK, inkW: 0.6 }); cap.position.y = 0.33; g.add(cap);
    const ring = mk(new T.TorusGeometry(0.06, 0.014, 6, 14), frame, { ink: INK, inkW: 0.4 }); ring.position.y = 0.43; g.add(ring);
    // the shutter: dark panes that slide over the glass when the pair hide
    const shutter = new T.Mesh(new T.CylinderGeometry(0.105, 0.105, 0.25, 4, 1, true).rotateY(Math.PI / 4), K3D.toon('#3a2a1a', { side: T.DoubleSide }));
    shutter.position.y = 0.16; shutter.visible = false; g.add(shutter);
    g.userData = { flame, glass, shutter, glassM,
      set(on, t) { shutter.visible = !on; flame.visible = on; glassM.opacity = on ? 0.55 : 0.1; flame.scale.set(1 + Math.sin(t * 17) * 0.08, 1 + Math.sin(t * 11.3) * 0.12, 1); } };
    return g;
  };

  /* ---------- Bo's key ---------- */
  F.key = function () {
    const g = new T.Group();
    const s = 1;
    // an ornate bow: a ring with a quatrefoil inside
    const bow = mk(new T.TorusGeometry(0.15, 0.04, 8, 24), brass(), { ink: INK, inkW: 0.8 }); bow.position.y = 0.72; g.add(bow);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; const l = mk(new T.TorusGeometry(0.05, 0.018, 6, 12), brass(), { ink: INK, inkW: 0.4 }); l.position.set(Math.cos(a) * 0.06, 0.72 + Math.sin(a) * 0.06, 0); g.add(l); }
    const collar = mk(new T.CylinderGeometry(0.05, 0.05, 0.06, 10), brassDk(), { ink: INK, inkW: 0.5 }); collar.position.y = 0.55; g.add(collar);
    const shaft = mk(new T.CylinderGeometry(0.03, 0.03, 0.62, 10), brass(), { ink: INK, inkW: 0.6 }); shaft.position.y = 0.22; g.add(shaft);
    // the bit (teeth)
    const bit = mk(new T.BoxGeometry(0.14, 0.12, 0.03), brass(), { ink: INK, inkW: 0.6 }); bit.position.set(0.08, -0.03, 0); g.add(bit);
    const notch = mk(new T.BoxGeometry(0.05, 0.04, 0.035), brassDk(), { ink: false }); notch.position.set(0.12, 0.0, 0); g.add(notch);
    g.scale.setScalar(s);
    return g;
  };

  /* ---------- a Sheet: a bedsheet ghost on a wheeled stand ---------- */
  const sheetTex = () => K3D.paint('pm-sheet', 256, 256, (c, w, h) => {
    c.fillStyle = '#ece8f2'; c.fillRect(0, 0, w, h);
    // folds and old stains
    for (let i = 0; i < 26; i++) { const x = i / 26 * w; c.fillStyle = `rgba(90,80,120,${0.05 + (i % 3) * 0.03})`; c.fillRect(x, 0, 3 + (i % 4), h); }
    for (let i = 0; i < 8; i++) { c.fillStyle = 'rgba(140,120,90,0.12)'; c.beginPath(); c.ellipse((i * 67) % w, 60 + (i * 41) % 180, 10 + i % 3 * 6, 6, 0, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = 'rgba(120,110,150,0.4)'; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(0, h - 18); c.lineTo(w, h - 18); c.stroke();
  }, { repeat: true });
  F.sheet = function () {
    const g = new T.Group(), body = new T.Group(); g.add(body);
    // the stand: a wooden base on three wheels and a pole
    const base = mk(new T.CylinderGeometry(0.32, 0.36, 0.08, 16), M('standWood', () => K3D.toon('#4a3424')), { ink: INK, inkW: 0.6 }); base.position.y = 0.1; g.add(base);
    const wheels = [];
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const wl = mk(new T.CylinderGeometry(0.06, 0.06, 0.04, 10).rotateZ(Math.PI / 2), M('wheel', () => K3D.toon('#2a2430')), { ink: INK, inkW: 0.4 }); wl.position.set(Math.cos(a) * 0.26, 0.06, Math.sin(a) * 0.26); g.add(wl); wheels.push(wl); }
    // the cloth: a lathe with a wavy hem
    const prof = [];
    const hemY = 0.2;
    prof.push(new T.Vector2(0.001, 1.72));
    for (let i = 1; i <= 10; i++) { const a = i / 10 * Math.PI / 2; prof.push(new T.Vector2(Math.sin(a) * 0.3, 1.42 + Math.cos(a) * 0.3)); }
    prof.push(new T.Vector2(0.27, 1.3), new T.Vector2(0.33, 1.05), new T.Vector2(0.42, 0.7), new T.Vector2(0.5, 0.4), new T.Vector2(0.58, hemY));
    const geo = new T.LatheGeometry(prof, 36);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i); if (y > 0.9) continue;
      const x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(z, x), k = (0.9 - y) / 0.7;
      const r = 1 + Math.sin(a * 7) * 0.08 * k;
      pos.setX(i, x * r); pos.setZ(i, z * r); pos.setY(i, y + Math.cos(a * 7) * 0.04 * k);
    }
    geo.computeVertexNormals();
    const clothM = K3D.toon('#ffffff', { map: sheetTex(), side: T.DoubleSide, emissive: '#2a2640', emissiveIntensity: 0.6 });
    const cloth = mk(geo, clothM, { ink: '#3a3450', inkW: 1.0 }); body.add(cloth);
    // the arms: cloth sleeves reaching forward, hanging folds
    const arms = [];
    for (const sx of [-1, 1]) {
      const sh = new T.Group(); sh.position.set(sx * 0.27, 1.15, 0.05); body.add(sh);
      const arm = mk(new T.CylinderGeometry(0.08, 0.14, 0.55, 10, 1, true).translate(0, -0.275, 0).rotateX(-Math.PI / 2 + 0.25), clothM, { ink: '#3a3450', inkW: 0.8 }); sh.add(arm);
      const drape = mk(new T.ConeGeometry(0.11, 0.3, 8, 1, true).translate(0, -0.15, 0), clothM, { ink: '#3a3450', inkW: 0.6 }); drape.position.set(0, -0.15, 0.4); sh.add(drape);
      arms.push(sh);
    }
    // the painted face: two eyes (that light) and a mouth
    const face = new T.Group(); face.position.set(0, 1.45, 0.27); body.add(face);
    const eyeM = K3D.flat('#1a1424'), glowM = K3D.flat(hot('#ffd24a', 3));
    const eyes = [];
    for (const sx of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.065, 12, 10).scale(1, 1.35, 0.4), eyeM); e.position.set(sx * 0.1, 0.03, 0.02); face.add(e); eyes.push(e); }
    const mouth = new T.Mesh(new T.SphereGeometry(0.07, 12, 10).scale(1, 1.4, 0.35), K3D.flat('#1a1424')); mouth.position.set(0, -0.15, 0.0); face.add(mouth);
    // the key in its back
    const key = F.windKey(1); key.position.set(0, 1.08, -0.4); body.add(key);
    const tick = key.children[0];
    g.userData = { body, cloth, arms, eyes, eyeM, glowM, key, tick, wheels, kind: 'sheet', spin: 0,
      set(sp, t, dt) {
        const on = sp.state === 'move' || sp.state === 'back' || (sp.state === 'wake' && Math.sin(t * 20) > -0.2);
        const done = sp.state === 'done', frozen = sp.state === 'frozen';
        for (const e of eyes) e.material = on ? glowM : eyeM;
        if (!frozen && !done && sp.state !== 'dormant' && sp.state !== 'rest') this.spin += dt * (sp.state === 'wake' ? 3 : 6);
        key.rotation.z = this.spin;
        const sag = done ? 1 : 0;
        body.scale.set(1 + sag * 0.12, 1 - sag * 0.32, 1 + sag * 0.12);
        body.rotation.x = done ? 0.28 : sp.state === 'move' ? 0.12 + Math.sin(t * 3) * 0.04 : 0;
        body.position.y = sp.state === 'move' ? Math.sin(t * 2.4) * 0.05 : 0;
        for (const [k, a] of arms.entries()) a.rotation.x = done ? 1.0 : frozen ? -0.05 : sp.state === 'move' ? Math.sin(t * 4 + k) * 0.18 : 0.3;
        for (const w of wheels) w.rotation.x += sp.state === 'move' ? dt * 8 : 0;
      } };
    return g;
  };

  /* ---------- a suit of armour ---------- */
  const steel = () => M('steel', () => K3D.toon('#a7afc4', { emissive: '#1c2030', emissiveIntensity: 0.5 }));
  const steelDk = () => M('steelDk', () => K3D.toon('#6c7290'));
  F.armour = function (o = {}) {
    const g = new T.Group(), suit = new T.Group(); g.add(suit);
    const stone = M('plinth', () => K3D.toon('#4a4458'));
    const plinth = mk(new T.BoxGeometry(0.7, 0.24, 0.6), stone, { ink: INK, inkW: 0.6 }); plinth.position.y = 0.12; g.add(plinth);
    suit.position.y = 0.24;
    const S = steel(), D = steelDk();
    for (const sx of [-1, 1]) {
      const leg = mk(new T.CylinderGeometry(0.075, 0.065, 0.62, 10), S, { ink: INK, inkW: 0.6 }); leg.position.set(sx * 0.12, 0.38, 0); suit.add(leg);
      const knee = mk(new T.SphereGeometry(0.085, 10, 8), D, { ink: INK, inkW: 0.5 }); knee.position.set(sx * 0.12, 0.42, 0.04); suit.add(knee);
      const boot = mk(K3D.roundBox(0.14, 0.09, 0.24, 0.5, 14), D, { ink: INK, inkW: 0.5 }); boot.position.set(sx * 0.12, 0.02, 0.04); suit.add(boot);
    }
    const tasset = mk(new T.CylinderGeometry(0.2, 0.26, 0.2, 12, 1, true), S, { ink: INK, inkW: 0.6 }); tasset.position.y = 0.78; suit.add(tasset);
    const chest = mk(new T.SphereGeometry(0.25, 16, 12).scale(1, 1.2, 0.85), S, { ink: INK, inkW: 0.8 }); chest.position.y = 1.06; suit.add(chest);
    const ridge = mk(new T.BoxGeometry(0.03, 0.4, 0.03), D, { ink: false }); ridge.position.set(0, 1.08, 0.21); suit.add(ridge);
    const arms = [];
    for (const sx of [-1, 1]) {
      const pa = mk(new T.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), D, { ink: INK, inkW: 0.6 }); pa.position.set(sx * 0.27, 1.24, 0); pa.rotation.z = -sx * 0.4; suit.add(pa);
      const sh = new T.Group(); sh.position.set(sx * 0.3, 1.2, 0); suit.add(sh);
      const up = mk(new T.CylinderGeometry(0.06, 0.055, 0.32, 8).translate(0, -0.16, 0), S, { ink: INK, inkW: 0.5 }); sh.add(up);
      const fore = mk(new T.CylinderGeometry(0.055, 0.05, 0.3, 8).translate(0, -0.15, 0), S, { ink: INK, inkW: 0.5 }); fore.position.y = -0.32; sh.add(fore);
      const glove = mk(new T.SphereGeometry(0.07, 8, 6).scale(1, 1.2, 0.8), D, { ink: INK, inkW: 0.5 }); glove.position.y = -0.64; sh.add(glove);
      arms.push(sh);
    }
    // a halberd in the right hand (it swings it)
    const hal = new T.Group(); arms[1].add(hal); hal.position.set(0, -0.64, 0.04);
    const pole = mk(new T.CylinderGeometry(0.022, 0.022, 2.1, 6), M('pole', () => K3D.toon('#5a3a22')), { ink: INK, inkW: 0.5 }); pole.position.y = 0.4; hal.add(pole);
    const blade = mk(new T.CylinderGeometry(0.2, 0.2, 0.02, 12, 1, false, 0, Math.PI), S, { ink: INK, inkW: 0.6 }); blade.rotation.set(Math.PI / 2, 0, Math.PI / 2); blade.position.set(0.0, 1.25, 0.02); hal.add(blade);
    const spike = mk(new T.ConeGeometry(0.03, 0.22, 6), S, { ink: INK, inkW: 0.4 }); spike.position.y = 1.55; hal.add(spike);
    // the helmet: a dome with a visor slit (eyes glow in it when it can move)
    const head = new T.Group(); head.position.y = 1.45; suit.add(head);
    const helm = mk(new T.SphereGeometry(0.17, 16, 12).scale(1, 1.15, 1.05), S, { ink: INK, inkW: 0.8 }); head.add(helm);
    const visor = mk(new T.SphereGeometry(0.175, 16, 6, -Math.PI * 0.35, Math.PI * 0.7, Math.PI * 0.32, Math.PI * 0.3).scale(1, 1.15, 1.08), D, { ink: INK, inkW: 0.5 }); head.add(visor);
    const slit = new T.Mesh(new T.BoxGeometry(0.2, 0.025, 0.02), K3D.flat('#0a0810')); slit.position.set(0, 0.02, 0.175); head.add(slit);
    const eyeM = K3D.flat('#0a0810'), glowM = K3D.flat(hot('#ff5a3a', 3.2));
    const eyes = []; for (const sx of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.022, 8, 6), eyeM); e.position.set(sx * 0.055, 0.02, 0.18); head.add(e); eyes.push(e); }
    const plume = mk(new T.ConeGeometry(0.05, 0.3, 8).rotateX(-0.5), M('plume', () => K3D.toon('#7a2a6a')), { ink: INK, inkW: 0.5 }); plume.position.set(0, 0.22, -0.06); head.add(plume);
    let key = null;
    if (o.live) { key = F.windKey(1); key.position.set(0, 1.1, -0.24); suit.add(key); }
    g.userData = { suit, arms, eyes, eyeM, glowM, key, head, spin: 0,
      set(sp, t, dt) {
        const on = sp.state === 'move' || sp.state === 'back' || (sp.state === 'wake' && Math.sin(t * 20) > -0.2);
        for (const e of eyes) e.material = on ? glowM : eyeM;
        if (key && (sp.state === 'move' || sp.state === 'wake' || sp.state === 'back')) this.spin += dt * 5;
        if (key) key.rotation.z = this.spin;
        const done = sp.state === 'done';
        // the raised halberd before a swing, a clank of the step
        const raise = sp.raise > 0 ? Math.min(1, sp.raise / 0.75) : 0;
        arms[1].rotation.x = -raise * 2.2;
        arms[0].rotation.x = done ? 0.5 : 0;
        suit.rotation.z = done ? 0.18 : 0;
        head.rotation.x = done ? 0.55 : 0;
        suit.position.y = 0.24 + (sp.step > 0 ? Math.sin(Math.min(1, sp.step / 0.45) * Math.PI) * 0.08 : 0);
      } };
    return g;
  };

  /* ---------- Grimsby the Butler ---------- */
  F.butler = function () {
    const g = new T.Group(), body = new T.Group(); g.add(body);
    const black = M('tails', () => K3D.toon('#1d1a26', { emissive: '#0c0a14', emissiveIntensity: 1 })), white = M('shirt', () => K3D.toon('#f2eee6')), glove = M('glove', () => K3D.toon('#fbfaf6'));
    const porcelain = M('porcelain', () => K3D.toon('#f6f2ee', { emissive: '#5a5a70', emissiveIntensity: 0.35 }));
    // legs (thin, long) and shoes
    for (const sx of [-1, 1]) {
      const leg = mk(new T.CylinderGeometry(0.075, 0.065, 1.15, 10), black, { ink: INK, inkW: 0.7 }); leg.position.set(sx * 0.11, 0.62, 0); body.add(leg);
      const shoe = mk(K3D.roundBox(0.13, 0.08, 0.3, 0.45, 14), M('shoe', () => K3D.toon('#0e0c14')), { ink: INK, inkW: 0.5 }); shoe.position.set(sx * 0.11, 0.0, 0.06); body.add(shoe);
    }
    // the tailcoat: a long narrow body, tails hanging behind
    const coat = mk(K3D.roundBox(0.5, 0.95, 0.34, 0.55, 30), black, { ink: INK, inkW: 1 }); coat.position.y = 1.18; body.add(coat);
    const shirt = mk(K3D.roundBox(0.2, 0.6, 0.06, 0.6, 16), white, { ink: INK, inkW: 0.5 }); shirt.position.set(0, 1.45, 0.155); body.add(shirt);
    const tie = new T.Group(); tie.position.set(0, 2.02, 0.19); body.add(tie);
    for (const sx of [-1, 1]) { const b = mk(new T.ConeGeometry(0.06, 0.1, 4).rotateZ(sx * Math.PI / 2), M('tie', () => K3D.toon('#2a2232')), { ink: INK, inkW: 0.4 }); b.position.x = sx * 0.05; tie.add(b); }
    const tails = mk(new T.BoxGeometry(0.42, 0.75, 0.04), black, { ink: INK, inkW: 0.7 }); tails.position.set(0, 0.95, -0.18); tails.rotation.x = 0.12; body.add(tails);
    for (let i = 0; i < 3; i++) { const btn = new T.Mesh(new T.SphereGeometry(0.02, 6, 4), K3D.flat('#c8b070')); btn.position.set(0.17, 1.15 + i * 0.13, 0.17); body.add(btn); }
    // shoulders and very long arms with white gloves; the left carries the silver tray
    const arms = [];
    for (const sx of [-1, 1]) {
      const sh = new T.Group(); sh.position.set(sx * 0.29, 2.0, 0); body.add(sh);
      const up = mk(new T.CylinderGeometry(0.06, 0.055, 0.6, 8).translate(0, -0.3, 0), black, { ink: INK, inkW: 0.6 }); sh.add(up);
      const el = new T.Group(); el.position.y = -0.6; sh.add(el);
      const fore = mk(new T.CylinderGeometry(0.055, 0.05, 0.55, 8).translate(0, -0.275, 0), black, { ink: INK, inkW: 0.6 }); el.add(fore);
      const cuff = mk(new T.CylinderGeometry(0.06, 0.06, 0.06, 8), white, { ink: INK, inkW: 0.4 }); cuff.position.y = -0.55; el.add(cuff);
      const hand = mk(new T.SphereGeometry(0.075, 10, 8).scale(1, 1.3, 0.7), glove, { ink: INK, inkW: 0.6 }); hand.position.y = -0.64; el.add(hand);
      arms.push({ sh, el, hand });
    }
    // the tray (held up flat in front at the left hand) with a cloche
    const tray = new T.Group(); body.add(tray); tray.position.set(-0.36, 1.45, 0.4);
    const silver = M('silver', () => K3D.toon('#c9d0e0', { emissive: '#2a3040', emissiveIntensity: 0.5 }));
    const plate = mk(new T.CylinderGeometry(0.3, 0.3, 0.03, 24), silver, { ink: INK, inkW: 0.6 }); tray.add(plate);
    const cloche = mk(new T.SphereGeometry(0.17, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), silver, { ink: INK, inkW: 0.6 }); cloche.position.y = 0.015; tray.add(cloche);
    const knob = mk(new T.SphereGeometry(0.03, 8, 6), silver, { ink: INK, inkW: 0.4 }); knob.position.y = 0.2; tray.add(knob);
    // the head: a porcelain oval with a fixed polite smile, slicked black hair parted in the middle
    const head = new T.Group(); head.position.y = 2.38; body.add(head);
    const neck = mk(new T.CylinderGeometry(0.06, 0.07, 0.18, 8), white, { ink: INK, inkW: 0.5 }); neck.position.y = -0.16; head.add(neck);
    const faceTex = K3D.paint('pm-butlerFace', 256, 256, (c, w, h) => {
      c.fillStyle = '#f6f2ee'; c.fillRect(0, 0, w, h);
      // (a sphere's front is u 0.25: draw the face there)
      const cx = w * 0.25, cy = h * 0.52;
      c.fillStyle = 'rgba(255,170,190,0.35)'; c.beginPath(); c.arc(cx - 26, cy + 8, 10, 0, Math.PI * 2); c.arc(cx + 26, cy + 8, 10, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#2a2232'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(cx - 34, cy - 22); c.quadraticCurveTo(cx - 22, cy - 30, cx - 10, cy - 22); c.moveTo(cx + 10, cy - 22); c.quadraticCurveTo(cx + 22, cy - 30, cx + 34, cy - 22); c.stroke();
      c.fillStyle = '#16121e'; c.beginPath(); c.ellipse(cx - 20, cy - 10, 8, 6, 0, 0, Math.PI * 2); c.ellipse(cx + 20, cy - 10, 8, 6, 0, 0, Math.PI * 2); c.fill();
      // the fixed polite smile: thin, a little too wide
      c.lineWidth = 3.5; c.beginPath(); c.moveTo(cx - 30, cy + 18); c.quadraticCurveTo(cx, cy + 36, cx + 30, cy + 18); c.stroke();
      c.lineWidth = 1.2; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(cx + i * 7, cy + 22 + (9 - Math.abs(i) * 2.3) - 2); c.lineTo(cx + i * 7, cy + 26 + (9 - Math.abs(i) * 2.3)); c.stroke(); }
      // a hairline crack in the porcelain
      c.strokeStyle = 'rgba(40,30,50,0.6)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx + 40, cy - 40); c.lineTo(cx + 30, cy - 26); c.lineTo(cx + 36, cy - 16); c.lineTo(cx + 28, cy - 4); c.stroke();
    });
    const faceM = K3D.toon('#ffffff', { map: faceTex, emissive: '#4a4a62', emissiveIntensity: 0.4 });
    const skull = mk(new T.SphereGeometry(0.22, 24, 18).scale(0.9, 1.18, 0.95), faceM, { ink: INK, inkW: 0.9 }); head.add(skull);
    const hair = mk(new T.SphereGeometry(0.215, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42).scale(0.93, 1.2, 0.98), M('hair', () => K3D.toon('#14101c')), { ink: INK, inkW: 0.6 });
    hair.position.y = 0.035; hair.rotation.x = -0.18; head.add(hair);
    // the back of the head: slicked hair down to the collar, so from behind he is a dark head, not a blank egg
    const back = mk(new T.SphereGeometry(0.218, 20, 12, Math.PI, Math.PI, 0, Math.PI * 0.78).scale(0.92, 1.19, 0.97), M('hair', () => K3D.toon('#14101c')), { ink: false }); back.position.y = 0.005; head.add(back);
    const part = new T.Mesh(new T.BoxGeometry(0.012, 0.05, 0.36), K3D.flat('#f6f2ee')); part.position.set(0, 0.27, -0.02); head.add(part);
    // tiny glowing pinpoints in the dark eyes
    const pin = [];
    for (const sx of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.012, 6, 4), K3D.flat(hot('#ffe9c0', 3))); e.position.set(sx * 0.078, 0.025, 0.2); head.add(e); pin.push(e); }
    // the huge key in his back, turning slowly
    const key = F.windKey(2.2); key.position.set(0, 1.45, -0.2); body.add(key);
    g.userData = { body, arms, head, tray, key, pin, spin: 0,
      set(B, t, dt) {
        this.spin += dt * (B.state === 'chase' ? 2.5 : 1.0);
        key.rotation.z = this.spin;
        // a glide: no bob, only a slight sway; arms stiff, the tray raised to shade his face in the lantern's light
        body.rotation.z = Math.sin(t * 1.3) * 0.02;
        const shade = B.lit ? 1 : 0;
        arms[0].sh.rotation.x = -1.2 - shade * 0.7; arms[0].el.rotation.x = -0.6 + shade * 0.2;
        tray.position.set(-0.36, 1.45 + shade * 0.75, 0.4 - shade * 0.05); tray.rotation.x = -shade * 1.25;
        const reach = B.state === 'chase' ? 1 : 0;
        arms[1].sh.rotation.x = -reach * 1.25 + (B.what === 'picture' ? -1.6 : 0); arms[1].sh.rotation.z = B.what === 'picture' ? -0.3 : 0;
        head.rotation.y = B.state === 'chase' ? 0 : Math.sin(t * 0.7) * 0.35;
        head.rotation.z = B.what ? Math.sin(t * 0.9) * 0.12 : 0;
      } };
    return g;
  };

  /* ---------- a grandfather clock (a restart point) ---------- */
  const clockFace = () => K3D.paint('pm-clockFace', 256, 256, (c, w, h) => {
    const g = c.createRadialGradient(128, 128, 10, 128, 128, 128); g.addColorStop(0, '#fbf2d8'); g.addColorStop(1, '#d8c69a');
    c.fillStyle = g; c.beginPath(); c.arc(128, 128, 126, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#3a2a1a'; c.lineWidth = 6; c.stroke();
    c.fillStyle = '#2a1e12'; c.font = '700 26px "DejaVu Serif", serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const R = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    R.forEach((r, i) => { const a = i / 12 * Math.PI * 2 - Math.PI / 2; c.save(); c.translate(128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96); c.rotate(a + Math.PI / 2); c.fillText(r, 0, 0); c.restore(); });
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; c.fillRect(128 + Math.cos(a) * 118 - 1, 128 + Math.sin(a) * 118 - 1, 2, 2); }
    c.fillStyle = 'rgba(80,60,40,0.18)'; c.beginPath(); c.arc(150, 150, 60, 0, Math.PI * 2); c.fill();
  });
  F.clock = function () {
    const g = new T.Group();
    const wood = M('clockWood', () => K3D.toon('#5a3622', { map: PARK.wood('#5a3622') }));
    const trim = M('clockTrim', () => K3D.toon('#3a2214'));
    const caseM = mk(new T.BoxGeometry(0.62, 1.55, 0.42), wood, { ink: INK, inkW: 0.7 }); caseM.position.y = 0.95; g.add(caseM);
    const plinth = mk(new T.BoxGeometry(0.76, 0.22, 0.52), trim, { ink: INK, inkW: 0.6 }); plinth.position.y = 0.11; g.add(plinth);
    const hood = mk(new T.BoxGeometry(0.78, 0.74, 0.5), wood, { ink: INK, inkW: 0.7 }); hood.position.y = 2.06; g.add(hood);
    const crown = mk(new T.CylinderGeometry(0.4, 0.4, 0.5, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI / 2), trim, { ink: INK, inkW: 0.6 });
    crown.scale.set(1, 0.42, 1); crown.position.y = 2.42; g.add(crown);
    for (const sx of [-1, 0, 1]) { const f = mk(new T.SphereGeometry(0.055, 8, 6), brass(), { ink: INK, inkW: 0.4 }); f.position.set(sx * 0.32, 2.6 + (sx ? 0 : 0.1), 0); g.add(f); }
    const faceM = K3D.toon('#ffffff', { map: clockFace() });
    const face = new T.Mesh(new T.CircleGeometry(0.26, 32), faceM); face.position.set(0, 2.06, 0.252); g.add(face);
    const bezel = mk(new T.TorusGeometry(0.27, 0.025, 6, 32), brass(), { ink: INK, inkW: 0.5 }); bezel.position.copy(face.position); g.add(bezel);
    const hands = [];
    for (const [l, w] of [[0.15, 0.022], [0.21, 0.014]]) { const hnd = new T.Mesh(new T.BoxGeometry(w, l, 0.01).translate(0, l / 2, 0), K3D.flat('#1a120a')); hnd.position.set(0, 2.06, 0.262); g.add(hnd); hands.push(hnd); }
    // the pendulum window and the pendulum
    const win = new T.Mesh(new T.PlaneGeometry(0.34, 0.9), K3D.toon('#20140c')); win.position.set(0, 1.08, 0.212); g.add(win);
    const glass = new T.Mesh(new T.PlaneGeometry(0.34, 0.9), K3D.flat('#b8b0e0', { transparent: true, opacity: 0.12, depthWrite: false })); glass.position.set(0, 1.08, 0.218); g.add(glass);
    const pend = new T.Group(); pend.position.set(0, 1.5, 0.19); g.add(pend);
    const rod = new T.Mesh(new T.BoxGeometry(0.02, 0.62, 0.01).translate(0, -0.31, 0), brassDk()); pend.add(rod);
    const bob = mk(new T.CylinderGeometry(0.09, 0.09, 0.02, 16).rotateX(Math.PI / 2), brass(), { ink: INK, inkW: 0.4 }); bob.position.y = -0.64; pend.add(bob);
    const glow = new T.Mesh(new T.CircleGeometry(0.42, 24), K3D.flat(hot('#ffe6a8', 1.2), { map: PARK.glowTex(), transparent: true, opacity: 0, depthWrite: false, add: true }));
    glow.position.set(0, 2.06, 0.27); g.add(glow);
    g.userData = { pend, hands, glow, faceM,
      set(t, active, flash) {
        pend.rotation.z = Math.sin(t * Math.PI) * 0.22;
        hands[0].rotation.z = -t * 0.01; hands[1].rotation.z = -t * 0.12;
        glow.material.opacity = active ? 0.55 + 0.45 * flash : 0;
        faceM.emissive = active ? new T.Color('#5a4a20') : new T.Color('#000000');
      } };
    return g;
  };

  /* ---------- a wardrobe (a hiding place) ---------- */
  F.wardrobe = function () {
    const g = new T.Group();
    const wood = M('wardWood', () => K3D.toon('#4a2e22', { map: PARK.wood('#4a2e22') })), dk = M('wardDk', () => K3D.toon('#2e1a12'));
    const back = mk(new T.BoxGeometry(2.0, 2.7, 0.1), wood, { ink: INK, inkW: 0.6 }); back.position.set(0, 1.45, -0.65); g.add(back);
    for (const sx of [-1, 1]) { const side = mk(new T.BoxGeometry(0.1, 2.7, 1.3), wood, { ink: INK, inkW: 0.6 }); side.position.set(sx * 0.95, 1.45, 0); g.add(side); }
    const top = mk(new T.BoxGeometry(2.24, 0.24, 1.44), dk, { ink: INK, inkW: 0.7 }); top.position.y = 2.9; g.add(top);
    const crest = mk(new T.CylinderGeometry(0.5, 0.5, 0.08, 20, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), dk, { ink: INK, inkW: 0.6 }); crest.position.set(0, 3.02, 0.66); crest.scale.set(1.4, 0.6, 1); g.add(crest);
    const floor = mk(new T.BoxGeometry(2.0, 0.12, 1.3), dk, { ink: INK, inkW: 0.5 }); floor.position.y = 0.16; g.add(floor);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const f = mk(new T.SphereGeometry(0.09, 8, 6), dk, { ink: INK, inkW: 0.4 }); f.position.set(sx * 0.9, 0.08, sz * 0.55); g.add(f); }
    // coats hanging inside
    for (let i = 0; i < 4; i++) { const c = mk(K3D.roundBox(0.34, 1.2, 0.22, 0.6, 14), M('coat' + i, () => K3D.toon(['#3a3448', '#4a3a2a', '#2a3a3a', '#4a2a3a'][i])), { ink: INK, inkW: 0.5 }); c.position.set(-0.6 + i * 0.4, 1.3, -0.4); c.rotation.y = 0.4 + i * 0.3; g.add(c); }
    const doors = [];
    for (const sx of [-1, 1]) {
      const hinge = new T.Group(); hinge.position.set(sx * 0.98, 0, 0.66); g.add(hinge);
      const door = mk(new T.BoxGeometry(0.98, 2.56, 0.07).translate(-sx * 0.49, 1.48, 0), wood, { ink: INK, inkW: 0.7 }); hinge.add(door);
      const panel = mk(new T.BoxGeometry(0.68, 1.0, 0.03).translate(-sx * 0.49, 2.0, 0.05), dk, { ink: INK, inkW: 0.4 }); hinge.add(panel);
      const panel2 = mk(new T.BoxGeometry(0.68, 0.8, 0.03).translate(-sx * 0.49, 0.85, 0.05), dk, { ink: INK, inkW: 0.4 }); hinge.add(panel2);
      const knob = mk(new T.SphereGeometry(0.045, 8, 6), brass(), { ink: INK, inkW: 0.4 }); knob.position.set(-sx * 0.9, 1.45, 0.07); hinge.add(knob);
      doors.push({ hinge, sx });
    }
    // the pulsing outline when the Butler is near (a soft glowing frame round the doors)
    const pulseM = K3D.flat(hot('#9fe8ff', 1.6), { transparent: true, opacity: 0, depthWrite: false, add: true });
    const pulse = new T.Mesh(new T.PlaneGeometry(2.6, 3.4), pulseM); pulse.position.set(0, 1.55, 0.72); g.add(pulse);
    pulseM.map = K3D.paint('pm-hideFrame', 128, 160, (c, w, h) => { c.strokeStyle = '#ffffff'; for (let i = 0; i < 6; i++) { c.globalAlpha = 0.16 + i * 0.12; c.lineWidth = 12 - i * 2; c.strokeRect(10, 10, w - 20, h - 20); } });
    g.userData = { doors, pulseM,
      set(open, pulse, t) {
        for (const d of doors) d.hinge.rotation.y = d.sx * (open > 0 ? 1.2 * open : 0); // (outward, into the room)
        pulseM.opacity = pulse ? 0.35 + 0.35 * Math.sin(t * 5) : 0;
      } };
    return g;
  };

  /* ---------- the stretch 2 to 4 spooks ---------- */
  // eyes that light when it can move; a key that ticks round while it is awake (shared by the new figures)
  const awakeOn = (sp, t) => sp.state === 'move' || sp.state === 'back' || (sp.state === 'wake' && Math.sin(t * 20) > -0.2);
  const ticking = sp => sp.state === 'move' || sp.state === 'wake' || sp.state === 'back';
  const glowEyes = (parent, xs, y, z, r, col) => {
    const off = K3D.flat('#16121e'), on = K3D.flat(hot(col, 3));
    const eyes = xs.map(x => { const e = new T.Mesh(new T.SphereGeometry(r, 10, 8).scale(1, 1.25, 0.5), off); e.position.set(x, y, z); parent.add(e); return e; });
    return { eyes, set(lit) { for (const e of eyes) e.material = lit ? on : off; } };
  };
  // Cook: a big clockwork cook in a stained apron and a tall floppy hat, a ladle in one hand, a rolling pin in the other
  F.cook = function () {
    const g = new T.Group(), body = new T.Group(); g.add(body);
    const apron = M('apron', () => K3D.toon('#ece4d4', { map: K3D.paint('pm-apron', 128, 128, (c, w, h) => { c.fillStyle = '#ece4d4'; c.fillRect(0, 0, w, h); for (let i = 0; i < 9; i++) { c.fillStyle = ['rgba(150,30,20,0.55)', 'rgba(120,90,40,0.45)'][i % 2]; c.beginPath(); c.ellipse(20 + (i * 37) % 100, 30 + (i * 53) % 90, 6 + i % 3 * 4, 4 + i % 2 * 5, i, 0, Math.PI * 2); c.fill(); } }) }));
    const coat = M('cookCoat', () => K3D.toon('#d8d2c4')), skin = M('cookTin', () => K3D.toon('#d8b896', { emissive: '#3a2410', emissiveIntensity: 0.3 }));
    const base = mk(new T.CylinderGeometry(0.42, 0.5, 0.12, 18), M('standWood', () => K3D.toon('#4a3424')), { ink: INK, inkW: 0.6 }); base.position.y = 0.1; g.add(base);
    const wheels = [];
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; const wl = mk(new T.CylinderGeometry(0.08, 0.08, 0.05, 10).rotateZ(Math.PI / 2), M('wheel', () => K3D.toon('#2a2430')), { ink: INK, inkW: 0.4 }); wl.position.set(Math.cos(a) * 0.36, 0.08, Math.sin(a) * 0.36); g.add(wl); wheels.push(wl); }
    const belly = mk(new T.SphereGeometry(0.5, 20, 16).scale(1, 1.1, 0.9), coat, { ink: INK, inkW: 1 }); belly.position.y = 0.85; body.add(belly);
    const ap = mk(new T.SphereGeometry(0.51, 20, 16, -Math.PI * 0.32, Math.PI * 0.64, Math.PI * 0.25, Math.PI * 0.55).scale(1, 1.1, 0.9), apron, { ink: INK, inkW: 0.6 }); ap.position.y = 0.85; body.add(ap);
    const chest = mk(new T.SphereGeometry(0.36, 18, 12).scale(1, 0.9, 0.85), coat, { ink: INK, inkW: 0.8 }); chest.position.y = 1.45; body.add(chest);
    for (let i = 0; i < 2; i++) for (const sx of [-1, 1]) { const b = mk(new T.SphereGeometry(0.035, 8, 6), FIG_brassM(), { ink: false }); b.position.set(sx * 0.1, 1.38 + i * 0.16, 0.3); body.add(b); }
    const head = new T.Group(); head.position.y = 1.92; body.add(head);
    const face = mk(new T.SphereGeometry(0.26, 18, 14), skin, { ink: INK, inkW: 0.8 }); head.add(face);
    const nose = mk(new T.SphereGeometry(0.07, 10, 8), M('cookNose', () => K3D.toon('#d0705a')), { ink: INK, inkW: 0.4 }); nose.position.set(0, -0.02, 0.25); head.add(nose);
    const moust = mk(new T.TorusGeometry(0.1, 0.03, 6, 12, Math.PI), M('mous', () => K3D.toon('#2a1a12')), { ink: INK, inkW: 0.4 }); moust.position.set(0, -0.08, 0.23); moust.rotation.z = Math.PI; head.add(moust);
    const ey = glowEyes(head, [-0.09, 0.09], 0.06, 0.22, 0.04, '#ff9a3a');
    const hat = mk(new T.CylinderGeometry(0.3, 0.2, 0.42, 14), M('cookHat', () => K3D.toon('#f4f0e6')), { ink: INK, inkW: 0.6 }); hat.position.y = 0.36; head.add(hat);
    const puff = mk(new T.SphereGeometry(0.34, 14, 10).scale(1, 0.6, 1), M('cookHat', () => K3D.toon('#f4f0e6')), { ink: INK, inkW: 0.6 }); puff.position.set(0.06, 0.6, 0); puff.rotation.z = 0.35; head.add(puff);
    const arms = [];
    for (const sx of [-1, 1]) {
      const sh = new T.Group(); sh.position.set(sx * 0.44, 1.5, 0); body.add(sh);
      const up = mk(new T.CylinderGeometry(0.1, 0.09, 0.55, 10).translate(0, -0.27, 0), coat, { ink: INK, inkW: 0.6 }); sh.add(up);
      const hand = mk(new T.SphereGeometry(0.09, 10, 8), skin, { ink: INK, inkW: 0.5 }); hand.position.y = -0.58; sh.add(hand);
      arms.push(sh);
    }
    const ladle = new T.Group(); ladle.position.y = -0.58; arms[1].add(ladle);
    const lh = mk(new T.CylinderGeometry(0.02, 0.02, 0.8, 6), M('steelDk2', () => K3D.toon('#8a90a6')), { ink: INK, inkW: 0.3 }); lh.position.y = -0.3; ladle.add(lh);
    const bowl = mk(new T.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('steelDk2', () => K3D.toon('#8a90a6')), { ink: INK, inkW: 0.4 }); bowl.position.y = -0.72; ladle.add(bowl);
    const pin = mk(new T.CylinderGeometry(0.06, 0.06, 0.6, 10).rotateZ(Math.PI / 2), M('pinWood', () => K3D.toon('#c89a64')), { ink: INK, inkW: 0.4 }); pin.position.y = -0.6; arms[0].add(pin);
    const key = F.windKey(1.4); key.position.set(0, 1.2, -0.5); body.add(key);
    g.userData = { spin: 0,
      set(sp, t, dt) {
        ey.set(awakeOn(sp, t));
        if (ticking(sp)) this.spin += dt * 5;
        key.rotation.z = this.spin;
        const done = sp.state === 'done', mv = sp.state === 'move';
        body.rotation.x = done ? 0.35 : mv ? 0.1 : 0;
        body.scale.set(1, done ? 0.82 : 1, 1);
        arms[1].rotation.x = done ? 0.8 : mv ? -1.2 + Math.sin(t * 6) * 0.6 : -0.3;
        arms[0].rotation.x = done ? 0.6 : mv ? -0.9 + Math.cos(t * 6) * 0.4 : -0.2;
        head.rotation.z = done ? 0.4 : mv ? Math.sin(t * 3) * 0.08 : 0;
        for (const w of wheels) w.rotation.x += mv ? dt * 7 : 0;
      } };
    return g;
  };
  const FIG_brassM = () => brass();
  // a doll: porcelain head, a lace dress, cracked cheek, glass eyes; it skitters
  F.doll = function (k = 0) {
    const g = new T.Group(), body = new T.Group(); g.add(body);
    const dress = M('dollDress' + k, () => K3D.toon(['#d88aa8', '#8ab0d8', '#e8d48a', '#a8d8a0'][k % 4]));
    const lace = M('lace', () => K3D.toon('#f6f0ea'));
    const por = M('dollPor', () => K3D.toon('#f8eee8', { emissive: '#4a3a3a', emissiveIntensity: 0.3 }));
    const skirt = mk(new T.ConeGeometry(0.28, 0.45, 16, 1, true), dress, { ink: INK, inkW: 0.6 }); skirt.position.y = 0.36; body.add(skirt);
    const frill = mk(new T.TorusGeometry(0.27, 0.035, 6, 20), lace, { ink: false }); frill.rotation.x = Math.PI / 2; frill.position.y = 0.15; body.add(frill);
    for (const sx of [-1, 1]) { const leg = mk(new T.CylinderGeometry(0.035, 0.03, 0.16, 6), por, { ink: INK, inkW: 0.3 }); leg.position.set(sx * 0.08, 0.08, 0); body.add(leg); const shoe = mk(new T.SphereGeometry(0.045, 8, 6).scale(1, 0.7, 1.4), M('dollShoe', () => K3D.toon('#1a1218')), { ink: false }); shoe.position.set(sx * 0.08, 0.02, 0.02); body.add(shoe); }
    const torso = mk(new T.CylinderGeometry(0.1, 0.13, 0.22, 12), dress, { ink: INK, inkW: 0.5 }); torso.position.y = 0.66; body.add(torso);
    const head = new T.Group(); head.position.y = 0.92; body.add(head);
    const hd = mk(new T.SphereGeometry(0.17, 18, 14), M('dollFace', () => K3D.toon('#ffffff', { map: K3D.paint('pm-dollFace', 128, 64, (c, w, h) => { c.fillStyle = '#f8eee8'; c.fillRect(0, 0, w, h); const cx = w * 0.25; c.fillStyle = 'rgba(255,120,140,0.5)'; c.beginPath(); c.arc(cx - 14, 40, 6, 0, Math.PI * 2); c.arc(cx + 14, 40, 6, 0, Math.PI * 2); c.fill(); c.fillStyle = '#b02040'; c.beginPath(); c.ellipse(cx, 46, 4, 3, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#2a1a1a'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx + 18, 12); c.lineTo(cx + 12, 22); c.lineTo(cx + 16, 30); c.lineTo(cx + 9, 40); c.stroke(); }), emissive: '#3a3030', emissiveIntensity: 0.35 })), { ink: INK, inkW: 0.6 }); head.add(hd);
    const hair = mk(new T.SphereGeometry(0.18, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), M('dollHair' + (k % 2), () => K3D.toon(k % 2 ? '#e8c060' : '#5a2a1a')), { ink: INK, inkW: 0.5 }); hair.position.y = 0.02; hair.rotation.x = -0.25; head.add(hair);
    for (const sx of [-1, 1]) { const c = mk(new T.SphereGeometry(0.06, 8, 6), M('dollHair' + (k % 2), () => K3D.toon(k % 2 ? '#e8c060' : '#5a2a1a')), { ink: INK, inkW: 0.3 }); c.position.set(sx * 0.15, -0.08, -0.04); c.scale.set(0.7, 1.6, 0.7); head.add(c); }
    const bow = mk(new T.TorusGeometry(0.05, 0.02, 6, 10), dress, { ink: false }); bow.position.set(0.08, 0.16, 0.04); head.add(bow);
    const ey = glowEyes(head, [-0.06, 0.06], 0.02, 0.155, 0.03, '#7affd8');
    const arms = [];
    for (const sx of [-1, 1]) { const sh = new T.Group(); sh.position.set(sx * 0.12, 0.74, 0); body.add(sh); const a = mk(new T.CylinderGeometry(0.03, 0.025, 0.22, 6).translate(0, -0.11, 0), por, { ink: INK, inkW: 0.3 }); sh.add(a); arms.push(sh); }
    const key = F.windKey(0.6); key.position.set(0, 0.66, -0.14); body.add(key);
    g.userData = { spin: 0,
      set(sp, t, dt) {
        ey.set(awakeOn(sp, t));
        if (ticking(sp)) this.spin += dt * 9;
        key.rotation.z = this.spin;
        const done = sp.state === 'done', mv = sp.state === 'move', fr = sp.state === 'frozen';
        body.position.y = mv ? Math.abs(Math.sin(t * 14)) * 0.06 : 0;
        body.rotation.x = done ? 1.35 : 0; body.position.z = done ? -0.3 : 0;
        head.rotation.z = done ? 0.6 : fr ? 0.25 : mv ? Math.sin(t * 9) * 0.2 : Math.sin(t * 0.6) * 0.1;
        head.rotation.y = mv ? Math.sin(t * 17) * 0.15 : 0;
        for (const [i, a] of arms.entries()) a.rotation.x = done ? 0 : mv ? -1.4 + Math.sin(t * 14 + i * 3) * 0.3 : -0.4;
      } };
    return g;
  };
  // a ballroom dancer: k 0 a gentleman in tails, k 1 a lady in a gown; porcelain faces, a key in the back
  F.dancer = function (k = 0) {
    const g = new T.Group(), body = new T.Group(); g.add(body);
    const por = M('danPor', () => K3D.toon('#f2ece8', { emissive: '#4a4458', emissiveIntensity: 0.35 }));
    const gown = M('gown' + k, () => K3D.toon(k ? '#7a2a5a' : '#1c1a28', { emissive: k ? '#2a0a1a' : '#0a0a14', emissiveIntensity: 0.6 }));
    if (k) {
      const prof = [[0.001, 1.25], [0.15, 1.2], [0.14, 0.95], [0.3, 0.6], [0.5, 0.15], [0.56, 0.02]].map(([x, y]) => new T.Vector2(x, y));
      const skirt = mk(new T.LatheGeometry(prof, 28), gown, { ink: INK, inkW: 0.8 }); body.add(skirt);
      for (let i = 0; i < 3; i++) { const ruf = mk(new T.TorusGeometry(0.28 + i * 0.1, 0.03, 6, 26), M('gownLace', () => K3D.toon('#e8d8e8')), { ink: false }); ruf.rotation.x = Math.PI / 2; ruf.position.y = 0.55 - i * 0.18; body.add(ruf); }
    } else {
      for (const sx of [-1, 1]) { const leg = mk(new T.CylinderGeometry(0.06, 0.05, 0.85, 8), gown, { ink: INK, inkW: 0.6 }); leg.position.set(sx * 0.09, 0.44, 0); body.add(leg); }
      const tails = mk(new T.BoxGeometry(0.34, 0.6, 0.03), gown, { ink: INK, inkW: 0.5 }); tails.position.set(0, 0.75, -0.14); tails.rotation.x = 0.15; body.add(tails);
    }
    const chest = mk(K3D.roundBox(0.36, 0.5, 0.24, 0.5, 18), gown, { ink: INK, inkW: 0.8 }); chest.position.y = 1.2; body.add(chest);
    if (!k) { const sh = mk(new T.BoxGeometry(0.14, 0.32, 0.02), M('shirt2', () => K3D.toon('#f2eee6')), { ink: false }); sh.position.set(0, 1.25, 0.125); body.add(sh); }
    else { const pearls = mk(new T.TorusGeometry(0.1, 0.018, 6, 16), M('pearl', () => K3D.toon('#f8f4f0', { emissive: '#3a3a3a', emissiveIntensity: 0.5 })), { ink: false }); pearls.rotation.x = 1.2; pearls.position.set(0, 1.45, 0.04); body.add(pearls); }
    const head = new T.Group(); head.position.y = 1.62; body.add(head);
    const hd = mk(new T.SphereGeometry(0.15, 16, 12).scale(0.92, 1.15, 0.95), por, { ink: INK, inkW: 0.6 }); head.add(hd);
    const hair = mk(new T.SphereGeometry(0.155, 16, 10, 0, Math.PI * 2, 0, Math.PI * (k ? 0.62 : 0.45)).scale(0.95, 1.2, 1), M('danHair' + k, () => K3D.toon(k ? '#3a1a10' : '#14101a')), { ink: INK, inkW: 0.4 }); head.add(hair);
    if (k) { const bun = mk(new T.SphereGeometry(0.08, 10, 8), M('danHair1', () => K3D.toon('#3a1a10')), { ink: INK, inkW: 0.4 }); bun.position.set(0, 0.14, -0.1); head.add(bun); }
    const mask = mk(new T.TorusGeometry(0.06, 0.02, 4, 12), M('mask' + k, () => K3D.toon(k ? '#e8c050' : '#4a4a6a')), { ink: false }); mask.scale.set(2.2, 0.8, 1); mask.position.set(0, 0.02, 0.135); head.add(mask);
    const ey = glowEyes(head, [-0.05, 0.05], 0.02, 0.14, 0.022, k ? '#ff6ab0' : '#6ab0ff');
    const arms = [];
    for (const sx of [-1, 1]) { const sh = new T.Group(); sh.position.set(sx * 0.2, 1.38, 0); body.add(sh); const a = mk(new T.CylinderGeometry(0.04, 0.035, 0.5, 8).translate(0, -0.25, 0), sx > 0 && k ? por : gown, { ink: INK, inkW: 0.4 }); sh.add(a); const hnd = mk(new T.SphereGeometry(0.045, 8, 6), M('glove2', () => K3D.toon('#fbfaf6')), { ink: false }); hnd.position.y = -0.52; sh.add(hnd); arms.push(sh); }
    const key = F.windKey(0.9); key.position.set(0, 1.25, -0.16); body.add(key);
    g.userData = { spin: 0,
      set(sp, t, dt) {
        ey.set(awakeOn(sp, t));
        if (ticking(sp)) this.spin += dt * 4;
        key.rotation.z = this.spin;
        const done = sp.state === 'done', mv = sp.state === 'move' || sp.state === 'back';
        // the waltz hold: one arm out, one up
        arms[0].rotation.set(done ? 0.2 : -1.3, 0, done ? 0 : -0.5); arms[1].rotation.set(done ? 0.1 : -0.7, 0, done ? 0 : 0.9);
        body.rotation.z = done ? 0.3 : mv ? Math.sin(t * 3) * 0.08 : 0;
        body.rotation.x = done ? 0.5 : 0;
        body.position.y = mv ? Math.abs(Math.sin(t * 4.5)) * 0.05 : 0;
        head.rotation.x = done ? 0.6 : 0;
      } };
    return g;
  };
  // a portrait with arms: a gilt frame on the wall whose sitter leans out and reaches a long painted arm at passers-by
  F.portraitSpook = function (k = 0, tex) {
    const g = new T.Group();
    const frame = new T.Group(); g.add(frame); frame.position.y = 1.75;
    const fr = mk(new T.BoxGeometry(1.3, 1.6, 0.12), brass(), { ink: INK, inkW: 0.7 }); fr.position.z = 0.06; frame.add(fr);
    for (const [x, y] of [[-0.65, 0.8], [0.65, 0.8], [-0.65, -0.8], [0.65, -0.8]]) { const o = mk(new T.SphereGeometry(0.09, 8, 6), brass(), { ink: INK, inkW: 0.4 }); o.position.set(x, y, 0.1); frame.add(o); }
    const pic = new T.Mesh(new T.PlaneGeometry(1.04, 1.34), K3D.toon('#ffffff', { map: tex, emissive: '#1a1420', emissiveIntensity: 0.4 })); pic.position.z = 0.125; frame.add(pic);
    const ey = glowEyes(frame, [-0.11, 0.11], 0.18, 0.13, 0.03, '#ff4a5a');
    // the arm: a painted sleeve that grows out of the canvas, a long pale hand with long fingers
    const arm = new T.Group(); arm.position.set(0.2, -0.15, 0.12); frame.add(arm);
    const sleeve = mk(new T.CylinderGeometry(0.07, 0.11, 1.0, 10).translate(0, 0.5, 0).rotateX(Math.PI / 2), M('pSleeve' + k, () => K3D.toon(['#3a1a4a', '#1a3a2a', '#4a1a1a'][k % 3])), { ink: INK, inkW: 0.6 }); arm.add(sleeve);
    const hand = new T.Group(); hand.position.z = 1.02; arm.add(hand);
    const palm = mk(K3D.roundBox(0.16, 0.05, 0.16, 0.5, 8), M('paleHand2', () => K3D.toon('#d8e0cc', { emissive: '#2a3a2a', emissiveIntensity: 0.5 })), { ink: INK, inkW: 0.4 }); hand.add(palm);
    for (let i = 0; i < 4; i++) { const f = mk(new T.CylinderGeometry(0.014, 0.01, 0.2, 5).translate(0, 0.1, 0).rotateX(Math.PI / 2), M('paleHand2', () => K3D.toon('#d8e0cc', { emissive: '#2a3a2a', emissiveIntensity: 0.5 })), { ink: false }); f.position.set(-0.06 + i * 0.04, 0, 0.07); f.rotation.x = -0.3; hand.add(f); }
    const key = F.windKey(0.7); key.position.set(0.5, 0.85, 0.12); key.rotation.z = 0; frame.add(key);
    g.userData = { spin: 0, frame, arm,
      set(sp, t, dt) {
        ey.set(awakeOn(sp, t));
        if (ticking(sp)) this.spin += dt * 5;
        key.rotation.y = this.spin;
        const done = sp.state === 'done';
        const r = sp.raise > 0 ? Math.min(1, sp.raise / 1.1) : 0;
        arm.scale.z = 0.05 + r * 1.1 + (sp.state === 'move' ? 0.08 + Math.sin(t * 5) * 0.05 : 0);
        arm.visible = !done && (r > 0 || sp.state === 'move' || sp.state === 'back');
        arm.rotation.y = Math.sin(t * 2) * 0.2;
        frame.rotation.z = done ? 0.18 : r * Math.sin(t * 30) * 0.02;
      } };
    return g;
  };
  // a dining chair: tall carved back, a red velvet seat; it shuffles across the lane on its own
  F.chair = function () {
    const g = new T.Group();
    const wd = M('chairWood', () => K3D.toon('#3a1e14', { map: PARK.wood('#3a1e14') })), vel = M('chairSeat', () => K3D.toon('#7a1426'));
    for (const [x, z] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]) { const l = mk(new T.CylinderGeometry(0.035, 0.03, 0.55, 6), wd, { ink: INK, inkW: 0.4 }); l.position.set(x, 0.27, z); g.add(l); }
    const seat = mk(K3D.roundBox(0.58, 0.1, 0.56, 0.4, 10), vel, { ink: INK, inkW: 0.5 }); seat.position.y = 0.58; g.add(seat);
    const back = new T.Group(); back.position.set(0, 0.6, -0.26); g.add(back);
    for (const sx of [-1, 1]) { const p = mk(new T.CylinderGeometry(0.035, 0.035, 0.85, 6), wd, { ink: INK, inkW: 0.4 }); p.position.set(sx * 0.24, 0.42, 0); back.add(p); const fin = mk(new T.SphereGeometry(0.05, 8, 6), wd, { ink: false }); fin.position.set(sx * 0.24, 0.88, 0); back.add(fin); }
    const crest = mk(new T.CylinderGeometry(0.28, 0.28, 0.05, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), wd, { ink: INK, inkW: 0.4 }); crest.scale.set(1, 0.5, 1); crest.position.y = 0.78; back.add(crest);
    const splat = mk(new T.BoxGeometry(0.16, 0.5, 0.03), vel, { ink: INK, inkW: 0.3 }); splat.position.y = 0.48; back.add(splat);
    // its painted eyes on the crest (lit while it creeps)
    const ey = glowEyes(back, [-0.07, 0.07], 0.8, 0.03, 0.025, '#ffd24a');
    g.userData = { set(c, t) { const mv = c.moving && c.u > 0.02; ey.set(mv || c.u > 0.3); g.position.y = mv ? Math.abs(Math.sin(t * 16)) * 0.05 : 0; g.rotation.z = mv ? Math.sin(t * 16) * 0.05 : 0; } };
    return g;
  };

  /* ---------- a wisp ---------- */
  F.wispTex = () => K3D.paint('pm-wisp', 64, 96, (c, w, h) => {
    const g = c.createRadialGradient(32, 62, 2, 32, 58, 34); g.addColorStop(0, 'rgba(230,255,250,1)'); g.addColorStop(0.35, 'rgba(120,255,220,0.85)'); g.addColorStop(1, 'rgba(60,200,220,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(32, 4); c.bezierCurveTo(50, 30, 62, 50, 58, 70); c.arc(32, 66, 26, 0, Math.PI); c.bezierCurveTo(2, 50, 14, 30, 32, 4); c.fill();
  });
  return F;
})();
