/* Pip & Bo - 43-1 Coin Drop: the 3D outfit 'arcadecoin' (dressed for a coin ride inside an old arcade machine).
   Loaded on demand with the 3D kit. The matching 2D outfit (previews, world page, title run) is defineOutfit('arcadecoin')
   in coin-drop.js. They are seen mostly from behind and a little above, standing on their coins, so the backs matter.
   Pip: a cream retro racing jacket with a glowing green circuit pattern that pulses faster the faster the coins go,
     green racing stripes down the arms and a "P1" patch on the back; a green see-through visor cap (the sprout pokes
     through the top); fingerless gloves.
   Bo: a teal quilted bomber vest with a row of light-up arcade buttons down the back that blink in turn (and all
     together on a sweep); chunky yellow headphones round the neck (the ears stay free); striped wristbands.
   Pip wears no blue, Bo no orange or red; different headgear; the eyes, sprout and ears stay clear.
   The coins file drives the glowing parts each frame through userData.glow ({ kind, mats, ... }). */
'use strict';

(function () {
  const T = K3D.T;
  const BW = K3D.HERO.w, BH = K3D.HERO.h, BD = K3D.HERO.d;
  const INK = '#1a1530';
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const mk = (geo, mat, o) => K3D.mesh(geo, mat, o);
  const def3 = (n, fn, o) => K3D.definePart3(n, Object.assign({ build: fn }, o || {}));

  // a shell round the lower body (jacket, vest): a rounded box a little bigger than the body, from the hem up to
  // just under the eyes, so the face stays clear
  const shell = (key, top, grow = 1.06) => K3D.geo('ac-shell|' + key, () => K3D.roundBox(BW * grow, BH * top, BD * (grow + 0.03), 0.62, 40));

  /* ---------- Pip ---------- */
  // the racing jacket: cream, a glowing circuit pattern (an emissive map: the traces glow, the cloth does not), a
  // stand-up collar, green stripes down the sleeves, a P1 patch on the back, a zip down the front
  def3('acRacerJacket3', (o, x) => {
    const g = new T.Group();
    const tex = K3D.paint('ac-jacket', 512, 256, (c, w, h) => {
      c.fillStyle = '#f2ead2'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(120,100,60,${Math.random() * 0.05})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      // panels: a darker yoke at the top and a band at the hem
      c.fillStyle = '#e2d6b4'; c.fillRect(0, 0, w, h * 0.16); c.fillStyle = '#2f9a5a'; c.fillRect(0, h * 0.88, w, h * 0.12);
      c.fillStyle = '#3fbf6a'; c.fillRect(0, h * 0.16, w, 5);
      // the zip (the front is the middle of the map)
      c.fillStyle = '#8a8478'; c.fillRect(w * 0.5 - 3, 0, 6, h);
      c.fillStyle = '#c8c0a8'; for (let y = 4; y < h; y += 8) c.fillRect(w * 0.5 - 5, y, 10, 3);
      // the P1 patch on the back (a quarter of the way round each side is the back's middle)
      for (const bx of [0, w]) { c.fillStyle = '#2f9a5a'; c.beginPath(); c.arc(bx, h * 0.45, 30, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f2ead2'; c.font = 'bold 30px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('P1', bx, h * 0.46); }
    }, { repeat: true });
    // the circuit pattern as light: traces with pads, on black (it adds to the cloth's colour)
    const glow = K3D.paint('ac-jacket-glow', 512, 256, (c, w, h) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#5aff8a'; c.fillStyle = '#9affb8'; c.lineWidth = 3; c.lineCap = 'round';
      const rr = (() => { let s = 43; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
      for (let i = 0; i < 26; i++) {
        let px = rr() * w, py = h * 0.22 + rr() * h * 0.6; c.beginPath(); c.moveTo(px, py);
        for (let k = 0; k < 3; k++) { if (k % 2) px += (rr() - 0.5) * 120; else py += (rr() - 0.5) * 80; py = Math.max(h * 0.2, Math.min(h * 0.86, py)); c.lineTo(px, py); }
        c.stroke(); c.beginPath(); c.arc(px, py, 5, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = '#000'; c.fillRect(w * 0.5 - 8, 0, 16, h); // (not over the zip)
    }, { repeat: true });
    const cloth = K3D.toon('#ffffff', { map: tex, emissive: '#ffffff', emissiveIntensity: 1 });
    cloth.emissiveMap = glow; cloth.emissive = hot('#5aff8a', 1.0);
    const body = mk(shell('jacket', 0.56), cloth, { ink: INK, inkW: 0.9 });
    body.rotation.y = Math.PI / 2; // (the map's middle, the zip, faces the front)
    body.position.y = -BH * 0.17 - 0.01; g.add(body);
    // the stand-up collar
    const collar = mk(new T.CylinderGeometry(BW * 0.48, BW * 0.52, 0.09, 28, 1, true, Math.PI * 0.2, Math.PI * 1.6).scale(1, 1, BD / BW * 1.05), K3D.toon('#2f9a5a', { side: T.DoubleSide }), { ink: INK, inkW: 0.6 });
    collar.rotation.y = Math.PI / 2 + Math.PI * 0.0; collar.position.y = BH * 0.56 - BH * 0.17 - 0.02; g.add(collar);
    // the sleeves: a cream cuff and green stripe on each arm
    for (const a of x.hero.userData.arms) {
      const sl = mk(K3D.geo('ac-sleeve', () => new T.CapsuleGeometry(0.078, 0.13, 6, 12).translate(0, -0.1, 0)), K3D.toon('#f2ead2'), { ink: INK, inkW: 0.6 });
      a.arm.add(sl);
      const st = new T.Mesh(K3D.geo('ac-stripe', () => new T.CylinderGeometry(0.081, 0.081, 0.03, 12, 1, true)), K3D.toon('#3fbf6a', { side: T.DoubleSide })); st.position.y = -0.08; a.arm.add(st);
    }
    g.userData.glow = { kind: 'circuit', mat: cloth };
    return g;
  }, { at: 'body' });
  // the visor cap: a green dome, a see-through green visor in front (the eyes show through it), a button on top with
  // a hole beside it for the sprout
  def3('acVisorCap3', (o, x) => {
    const g = new T.Group(), grn = K3D.toon('#2f9a5a');
    const dome = mk(new T.SphereGeometry(0.33, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), grn, { ink: INK, inkW: 0.9 });
    dome.scale.set(1.08, 0.62, 1.02); g.add(dome);
    // panel seams and a white racing band round it
    for (let i = 0; i < 6; i++) { const sm = new T.Mesh(new T.TorusGeometry(0.332, 0.006, 4, 20, Math.PI * 0.5), K3D.toon('#24763f')); sm.rotation.set(0, i * Math.PI / 6, Math.PI / 2); sm.scale.set(0.62, 1.08, 1.02); g.add(sm); }
    const band = mk(new T.CylinderGeometry(0.358, 0.358, 0.05, 32, 1, true).scale(1, 1, 1.02 / 1.08), K3D.toon('#f2ead2', { side: T.DoubleSide }), { ink: false }); band.position.y = 0.03; g.add(band);
    const btn = mk(new T.SphereGeometry(0.04, 10, 6), grn, { ink: INK, inkW: 0.5 }); btn.position.y = 0.2; g.add(btn);
    // the visor: a curved see-through peak
    const vis = new T.Mesh(new T.CylinderGeometry(0.46, 0.4, 0.02, 32, 1, false, -Math.PI * 0.32, Math.PI * 0.64), K3D.toon('#6af09a', { transparent: true, opacity: 0.5, emissive: '#3aff7a', emissiveIntensity: 0.35, side: T.DoubleSide, depthWrite: false }));
    vis.position.set(0, 0.0, 0.04); vis.rotation.x = 0.12; g.add(vis);
    const rim = new T.Mesh(new T.TorusGeometry(0.46, 0.012, 4, 30, Math.PI * 0.64), K3D.flat(hot('#7affa8', 1.6))); rim.rotation.set(Math.PI / 2 + 0.12, 0, Math.PI * 0.18); rim.position.set(0, 0.0, 0.04); g.add(rim);
    g.position.set(0, 0.02, -0.03); g.rotation.x = -0.1;
    x.hero.userData.sproutLift = 0.18;
    return g;
  }, { at: 'head' });
  // fingerless gloves: dark padded mitts on the arm ends with green knuckle pads
  def3('acGloves3', (o, x) => {
    const g = new T.Group();
    for (const a of x.hero.userData.arms) {
      const m = mk(K3D.geo('ac-glove', () => new T.SphereGeometry(0.085, 14, 10).scale(1, 1.15, 0.9)), K3D.toon('#2c2a30'), { ink: INK, inkW: 0.6 }); m.position.y = -0.24; a.arm.add(m);
      const pad = new T.Mesh(K3D.geo('ac-knuckle', () => new T.BoxGeometry(0.1, 0.03, 0.03)), K3D.toon('#3fbf6a')); pad.position.set(0, -0.27, 0.07); a.arm.add(pad);
    }
    return g;
  }, { at: 'body' });

  /* ---------- Bo ---------- */
  // the quilted bomber vest: teal with quilting, a ribbed hem and collar, and four arcade buttons down the back
  def3('acBomberVest3', (o, x) => {
    const g = new T.Group();
    const tex = K3D.paint('ac-vest', 512, 256, (c, w, h) => {
      c.fillStyle = '#2aa89a'; c.fillRect(0, 0, w, h);
      // quilting: diamond stitching with soft puffs
      for (let y = 0; y < h; y += 28) for (let xx = 0; xx < w; xx += 28) { const g2 = c.createRadialGradient(xx + 14, y + 14, 2, xx + 14, y + 14, 18); g2.addColorStop(0, 'rgba(255,255,255,0.12)'); g2.addColorStop(1, 'rgba(0,40,40,0.18)'); c.fillStyle = g2; c.fillRect(xx, y, 28, 28); }
      c.strokeStyle = 'rgba(10,60,55,0.6)'; c.lineWidth = 1.5; c.setLineDash([4, 3]);
      for (let k = -h; k < w; k += 28) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + h, h); c.stroke(); c.beginPath(); c.moveTo(k + h, 0); c.lineTo(k, h); c.stroke(); }
      c.setLineDash([]);
      // the ribbed hem
      c.fillStyle = '#1f7c72'; c.fillRect(0, h * 0.86, w, h * 0.14); c.fillStyle = 'rgba(0,0,0,0.18)'; for (let xx = 0; xx < w; xx += 6) c.fillRect(xx, h * 0.86, 2, h * 0.14);
      // the snaps down the front
      c.fillStyle = '#d8d4c8'; for (let y = h * 0.25; y < h * 0.85; y += 34) { c.beginPath(); c.arc(w * 0.5, y, 5, 0, Math.PI * 2); c.fill(); }
    }, { repeat: true });
    const body = mk(shell('vest', 0.56, 1.07), K3D.toon('#ffffff', { map: tex }), { ink: INK, inkW: 0.9 });
    body.rotation.y = Math.PI / 2; body.position.y = -BH * 0.17 - 0.01; g.add(body);
    const collar = mk(new T.TorusGeometry(BW * 0.5, 0.04, 6, 28).rotateX(Math.PI / 2).scale(1, 1, BD / BW * 1.08), K3D.toon('#1f7c72'), { ink: INK, inkW: 0.6 });
    collar.position.y = BH * 0.56 - BH * 0.17 - 0.02; g.add(collar);
    // the light-up arcade buttons down the back: chrome rims, domed caps in four colours (none orange or red)
    const cols = ['#ffd84a', '#9aff6a', '#ff7ad6', '#ffffff'], mats = [];
    for (let i = 0; i < 4; i++) {
      const y = BH * 0.48 - i * 0.085 - BH * 0.17, z = -BD * 0.53 - 0.012;
      const rim = mk(K3D.geo('ac-btnrim', () => new T.CylinderGeometry(0.038, 0.04, 0.02, 16).rotateX(Math.PI / 2)), K3D.toon('#c8ccd4'), { ink: INK, inkW: 0.4 });
      rim.position.set(0, y, z); g.add(rim);
      const m = K3D.flat(hot(cols[i], 0.6));
      const cap = new T.Mesh(K3D.geo('ac-btncap', () => new T.SphereGeometry(0.03, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2)), m);
      cap.position.set(0, y, z - 0.008); g.add(cap);
      mats.push({ m, col: cols[i] });
    }
    g.userData.glow = { kind: 'buttons', mats };
    return g;
  }, { at: 'body' });
  // chunky yellow headphones round the neck: the cups resting on the shoulders in front, the band behind the neck
  def3('acHeadphones3', (o, x) => {
    const g = new T.Group(), yel = K3D.toon('#ffd23a'), dk = K3D.toon('#3a3a40');
    const bandC = new T.CatmullRomCurve3([new T.Vector3(-BW * 0.46, 0.02, 0.06), new T.Vector3(-BW * 0.4, 0.08, -BD * 0.45), new T.Vector3(0, 0.12, -BD * 0.6), new T.Vector3(BW * 0.4, 0.08, -BD * 0.45), new T.Vector3(BW * 0.46, 0.02, 0.06)]);
    g.add(mk(new T.TubeGeometry(bandC, 30, 0.03, 8), dk, { ink: INK, inkW: 0.6 }));
    for (const sx of [-1, 1]) {
      const cup = mk(K3D.geo('ac-cup', () => new T.CylinderGeometry(0.11, 0.11, 0.08, 20).rotateZ(Math.PI / 2)), yel, { ink: INK, inkW: 0.8 });
      cup.position.set(sx * BW * 0.47, 0.0, 0.12); cup.rotation.y = sx * 0.5; g.add(cup);
      const pad = new T.Mesh(K3D.geo('ac-cuppad', () => new T.TorusGeometry(0.075, 0.03, 6, 16).rotateY(Math.PI / 2)), dk); pad.position.set(sx * (BW * 0.47 - 0.045), 0.0, 0.12); pad.rotation.y = sx * 0.5; g.add(pad);
      const dot = new T.Mesh(K3D.geo('ac-cupdot', () => new T.CircleGeometry(0.04, 12).rotateY(Math.PI / 2)), K3D.flat(hot('#9aff6a', 1.4))); dot.position.set(sx * (BW * 0.47 + 0.042), 0.0, 0.12); dot.rotation.y = sx * 0.5 + (sx < 0 ? Math.PI : 0); g.add(dot);
    }
    g.position.y = BH * 0.53 - BH * 0.17;
    return g;
  }, { at: 'body' });
  // striped wristbands (white and purple) on both arms
  def3('acWristbands3', (o, x) => {
    const g = new T.Group();
    const tex = K3D.paint('ac-wband', 64, 64, (c, w, h) => { c.fillStyle = '#f4f0e8'; c.fillRect(0, 0, w, h); c.fillStyle = '#7a5cd6'; c.fillRect(0, h * 0.38, w, h * 0.24); c.fillStyle = 'rgba(0,0,0,0.12)'; for (let xx = 0; xx < w; xx += 4) c.fillRect(xx, 0, 1, h); });
    for (const a of x.hero.userData.arms) {
      const b = mk(K3D.geo('ac-wristband', () => new T.CylinderGeometry(0.082, 0.082, 0.08, 14)), K3D.toon('#ffffff', { map: tex }), { ink: INK, inkW: 0.5 });
      b.position.y = -0.2; a.arm.add(b);
    }
    return g;
  }, { at: 'body' });

  K3D.defineOutfit3('arcadecoin', {
    pip: [['acRacerJacket3', {}], ['acGloves3', {}], ['acVisorCap3', {}]],
    bo: [['acBomberVest3', {}], ['acHeadphones3', {}], ['acWristbands3', {}]],
  });
})();
