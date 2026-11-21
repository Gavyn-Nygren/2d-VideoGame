/* Pip & Bo - 43-1 Coin Drop: CIRCUIT CITY (stretch 3), the world round the glowing trace.

   The trace runs as a raised highway on brass standoffs over a vast circuit board where the game's pixel creatures
   live: chips are their buildings (lit windows, printed names on the roofs), capacitors their water towers and silos,
   resistors their long low halls, a crystal the station. The trace loops right round THE PROCESSOR, the city's
   skyscraper: a black glass tower on its package, a crown of heat-sink fins with a fan turning in it, warning lamps
   blinking, searchlights sweeping the dark. Data runs along the board's own traces like traffic.
   Three layers: near (the trace's lamps and standoffs, the creatures on the nearest roofs), middle (the blocks, the
   tram, the stories), far (the processor, the city's edge, the far boards on the cabinet walls, the screen's blue).

   Stories (more after the look check): the rooftop party with a DJ, the window washer on the processor, the tram
   with its passengers, the BYTE BURGER queue, the crane building a new chip, the searchlights, Nib hiding behind a
   capacitor by the trace.

   ARCADECOIN_CITY.build(K, sc) -> CC;  ARCADECOIN_CITY.update(K, CC, st, dt). Display only. All names made up. */
'use strict';

const ARCADECOIN_CITY = (function () {
  const T = K3D.T, PR = ARCADECOIN_ROUTE, R = PR.R, L = PR.lists, A = PR.at, LIFE = ARCADECOIN_LIFE;
  const INK = '#120d14';
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const vv = a => new T.Vector3(a[0], a[1], a[2]);
  const rnd = () => ARCADE.rnd(), pick = a => ARCADE.pick(a);
  // (one material per look, shared: the static scenery then bakes into few draws)
  const toon = (c, o = {}) => K3D.mat('w43t|' + c + '|' + Object.keys(o).sort().map(k => k + ':' + (o[k] && o[k].uuid ? o[k].uuid : String(o[k]))).join(','), () => { const m = K3D.toon(c, o); if (o.emissiveMap) m.emissiveMap = o.emissiveMap; return m; });
  const mk = (geo, mat, ink = 0.6) => K3D.mesh(geo, mat, { ink: INK, inkW: ink });
  const W = PR.w;
  const BY = -226; // the board's surface
  const C0 = new T.Vector3(8, BY, -66); // the processor's centre (inside the trace's loop)
  const S0 = () => A.city - 14, S1 = () => A.box + 4;
  const BZ1 = 52; // the board's near edge (the coin box lies beyond it, lower down)

  /* ---------- painted things ---------- */
  const boardTex = () => K3D.paint('cc-board', 512, 512, (c, w, h) => {
    c.fillStyle = '#0f3a24'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; c.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    // traces: right angles and 45s, pads and vias
    c.lineCap = 'round';
    let s = 17; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 60; i++) {
      let x = Math.floor(r() * 16) * 32 + 16, y = Math.floor(r() * 16) * 32 + 16;
      c.strokeStyle = '#2f8a52'; c.lineWidth = 3 + Math.floor(r() * 3) * 2; c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 4; k++) { const d = Math.floor(r() * 4), l = 32 + Math.floor(r() * 4) * 32; x += [l, 0, -l, 0][d]; y += [0, l, 0, -l][d]; if (r() < 0.3) { x += 16; y += 16; } c.lineTo(x, y); }
      c.stroke();
      c.fillStyle = '#c8a050'; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); c.fillStyle = '#0a2a18'; c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill();
    }
    // silkscreen marks
    c.fillStyle = 'rgba(230,240,220,0.55)'; c.font = 'bold 14px monospace';
    for (let i = 0; i < 14; i++) c.fillText(['R', 'C', 'U', 'Q', 'TP', 'J'][i % 6] + (10 + Math.floor(r() * 90)), r() * w, r() * h);
    for (let i = 0; i < 8; i++) { c.strokeStyle = 'rgba(230,240,220,0.4)'; c.lineWidth = 2; c.strokeRect(r() * w, r() * h, 30 + r() * 40, 16 + r() * 20); }
  }, { repeat: true });
  const boardGlow = () => K3D.paint('cc-boardglow', 512, 512, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    let s = 17; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    c.lineCap = 'round';
    for (let i = 0; i < 60; i++) {
      let x = Math.floor(r() * 16) * 32 + 16, y = Math.floor(r() * 16) * 32 + 16;
      c.strokeStyle = i % 3 ? '#1a6a3a' : '#3affa0'; c.lineWidth = 3 + Math.floor(r() * 3) * 2; c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 4; k++) { const d = Math.floor(r() * 4), l = 32 + Math.floor(r() * 4) * 32; x += [l, 0, -l, 0][d]; y += [0, l, 0, -l][d]; if (r() < 0.3) { x += 16; y += 16; } c.lineTo(x, y); }
      c.stroke();
    }
  }, { repeat: true });
  // a chip building's walls: dark glass in a grid, windows lit here and there (emissive)
  const facade = (lit) => K3D.paint('cc-facade|' + lit, 128, 128, (c, w, h) => {
    // (the lit pattern and the wall pattern come from the same dice, so the glow sits in the windows)
    let sd = 4301; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    c.fillStyle = lit ? '#000' : '#1e1c26'; c.fillRect(0, 0, w, h);
    if (!lit) { c.fillStyle = '#2a2834'; for (let y = 0; y < h; y += 32) c.fillRect(0, y + 28, w, 4); }
    for (let y = 6; y < h; y += 32) for (let x = 6; x < w; x += 32) {
      const on = r() < 0.45, col = ['#ffe2a0', '#9ae8ff', '#ffb0e0', '#b8ffb8', '#fff6dc'][Math.floor(r() * 5)], blind = r();
      if (lit) { if (on) { c.fillStyle = col; c.fillRect(x, y, 20, 18); if (blind < 0.3) { c.fillStyle = '#000'; c.fillRect(x, y, 20, 7); } if (blind > 0.85) { c.fillStyle = '#000'; c.fillRect(x + 6, y + 8, 5, 10); } } }
      else { c.fillStyle = on ? '#4a4652' : '#121018'; c.fillRect(x, y, 20, 18); c.fillStyle = '#3a3844'; c.fillRect(x - 2, y + 18, 24, 3); if (!on) { c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(x, y, 5, 18); } }
    }
  }, { repeat: true });
  const roofTex = (label) => K3D.paint('cc-roof|' + label, 256, 256, (c, w, h) => {
    c.fillStyle = '#26242e'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    c.fillStyle = '#d8d4c8'; c.font = 'bold 34px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, w / 2, h / 2);
    c.font = '18px monospace'; c.fillText('ARCADEMADE 1987', w / 2, h / 2 + 34);
    c.beginPath(); c.arc(26, 26, 9, 0, 7); c.fillStyle = '#4a4852'; c.fill();
  });

  /* ---------- the parts ---------- */
  // is a point far enough from the trace (a building's radius r)?
  let tracePts = null;
  function clear(x, z, r) { for (const p of tracePts) { const dx = p.x - x, dz = p.z - z; if (dx * dx + dz * dz < (r + p.w + 4) * (r + p.w + 4)) return false; } return true; }
  // the nearest bit of trace: how far it is, and how high the trace runs above the board there
  function nearT(x, z) { let best = 1e9, h = 0; for (const p of tracePts) { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < best) { best = d; h = p.y - BY; } } return { d: Math.sqrt(best), h }; }

  function building(K, sc, CC, x, z, w, d, h, o = {}) {
    const g = new T.Group(); g.position.set(x, BY, z); g.rotation.y = o.yaw || 0;
    const label = o.label || pick(['PX-7741', 'MB-4316', 'QZ80-C', 'SND-02', 'VDP-11', 'RAM 4K', 'TMR-55', 'LOG-138', 'CPU-B6', 'ROM 3', 'IO-21', 'CLK-8', 'GFX-9', 'BUS-16']);
    // (walls share a few materials by size, so the city bakes into few draws)
    const rw = Math.max(1, Math.round(w / 3)), rh0 = Math.max(1, Math.round(h / 3)), rh = rh0 > 8 ? Math.round(rh0 / 2) * 2 : rh0;
    const side = K3D.mat('cc-side|' + rw + '|' + rh, () => { const fa = facade(false).clone(), fe = facade(true).clone(); for (const t of [fa, fe]) { t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rw, rh); } return toon('#ffffff', { map: fa, emissive: '#ffffff', emissiveMap: fe, emissiveIntensity: 0.9 }); });
    const top = K3D.mat('cc-top|' + label, () => toon('#ffffff', { map: roofTex(label) }));
    const body = mk(new T.BoxGeometry(w, h, d), [side, side, top, side, side, side], 0.8); body.position.y = h / 2 + 0.6; g.add(body);
    // legs along the long sides (the chip's pins) and a little parapet
    const nL = Math.max(3, Math.round(w / 1.6));
    for (let i = 0; i < nL; i++) for (const sd of [-1, 1]) CC.legs.push(new T.Matrix4().compose(g.position.clone().add(new T.Vector3(-w / 2 + (i + 0.5) * w / nL, 0.5, sd * (d / 2 + 0.35)).applyAxisAngle(new T.Vector3(0, 1, 0), g.rotation.y)), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), g.rotation.y), new T.Vector3(0.5, 1.2, 0.9)));
    const par = mk(new T.BoxGeometry(w + 0.2, 0.35, d + 0.2), K3D.mat('cc-par', () => toon('#3a3844')), 0.4); par.position.y = h + 0.6 + 0.1; g.add(par);
    // rooftop odds and ends: vents, an aerial, a water tank
    if (rnd() < 0.6) { const v = mk(K3D.geo('cc-vent', () => new T.BoxGeometry(1, 0.7, 1)), K3D.mat('cc-ventM', () => toon('#6a6a78')), 0.4); v.position.set((rnd() - 0.5) * w * 0.6, h + 0.95, (rnd() - 0.5) * d * 0.5); g.add(v); }
    if (rnd() < 0.5) { const a = new T.Mesh(K3D.geo('cc-aer', () => new T.CylinderGeometry(0.06, 0.06, 4, 5).translate(0, 2, 0)), K3D.mat('cc-aerM', () => toon('#9a9aa8'))); a.position.set(w * 0.35, h + 0.6, d * 0.3); g.add(a); g.updateMatrixWorld(true); const tp = g.localToWorld(new T.Vector3(w * 0.35, h + 4.7, d * 0.3)); sc.B.add(tp.x, tp.y, tp.z, '#ff3a2a', { size: 0.25, speed: 1.2, phase: rnd() * 6, blink: true }); }
    K.add(g);
    g.updateMatrixWorld(true);
    // creatures on the roof
    if (o.crowd !== false && rnd() < 0.55) for (let k = 0; k < 2 + rnd() * 4; k++) { const p = g.localToWorld(new T.Vector3((rnd() - 0.5) * w * 0.7, h + 0.6 + 0.2, (rnd() - 0.5) * d * 0.6)); sc.crit.add(p.x, p.y, p.z, { kind: Math.floor(rnd() * 7), act: pick(['cheer', 'wave', 'idle', 'dance', 'sit', 'cheer']), yaw: rnd() * 6.28, s: 2.2 }); }
    // the light it spills on the board
    const bp = g.localToWorld(new T.Vector3(0, 0.3, d / 2 + 2));
    sc.G.add(bp.x, bp.y, bp.z, Math.max(w, d) * 0.9, pick(['#ffe2a0', '#9ae8ff', '#ffb0e0']), 0.06, 0);
    return g;
  }

  function processor(K, sc, CC) {
    const g = new T.Group(); g.position.copy(C0); K.add(g);
    // the package on the board: a black square with gold pads round its edge, a lid with its (made-up) name
    const pk = mk(new T.BoxGeometry(36, 3, 36), toon('#1a1a22', { map: ARCADE.grimeTex() }), 1); pk.position.y = 1.5; g.add(pk);
    for (let i = 0; i < 24; i++) for (const [sx, sz, rot] of [[1, 0, 0], [-1, 0, 0], [0, 1, 1], [0, -1, 1]]) {
      const p = new T.Vector3(sx ? sx * 18.6 : -16.5 + i * 1.43, 0.3, sz ? sz * 18.6 : -16.5 + i * 1.43);
      CC.pads.push(new T.Matrix4().compose(g.position.clone().add(p), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), rot ? Math.PI / 2 : 0), new T.Vector3(1, 1, 1)));
    }
    const lid = mk(new T.BoxGeometry(30, 1.6, 30), toon('#b8bcc8', { map: ARCADE.brassTex('#b8bcc8') }), 0.8); lid.position.y = 3.8; g.add(lid);
    const lab = new T.Mesh(new T.PlaneGeometry(14, 4).rotateX(-Math.PI / 2), toon('#ffffff', { map: K3D.paint('cc-cpulab', 512, 160, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#2a2a34'; c.font = 'bold 70px monospace'; c.textAlign = 'center'; c.fillText('PX-4300', w / 2, 70); c.font = 'bold 34px monospace'; c.fillText('43 MHz  ·  CITY CORE', w / 2, 130); }), transparent: true }));
    lab.position.set(-6, 4.62, 12); g.add(lab);
    // the tower: black glass, windows lit in bands, a seam of light up each corner
    const TH = 56, TW = 22;
    const fa = facade(false).clone(), fe = facade(true).clone(); for (const t of [fa, fe]) { t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(7, 18); }
    const tw = mk(new T.BoxGeometry(TW, TH, TW), toon('#ffffff', { map: fa, emissive: '#ffffff', emissiveMap: fe, emissiveIntensity: 1.1 }), 1.2); tw.position.y = 4.6 + TH / 2; g.add(tw);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const sm2 = new T.Mesh(new T.BoxGeometry(0.4, TH, 0.4), K3D.flat(hot('#4ae8ff', 1.6))); sm2.position.set(sx * (TW / 2 + 0.1), 4.6 + TH / 2, sz * (TW / 2 + 0.1)); g.add(sm2); }
    // setbacks with ledges every 14 m
    for (let y = 14; y < TH; y += 14) { const lg = mk(new T.BoxGeometry(TW + 1.4, 0.6, TW + 1.4), K3D.mat('cc-ledge', () => toon('#3a3844')), 0.5); lg.position.y = 4.6 + y; g.add(lg); }
    // the crown: a heat sink (a base plate, rows of tall fins), the fan in the middle turning, warning lamps
    const top = 4.6 + TH;
    const plate = mk(new T.BoxGeometry(TW + 2, 1.4, TW + 2), toon('#9aa0b0', { map: ARCADE.brassTex('#9aa0b0') }), 0.8); plate.position.y = top + 0.7; g.add(plate);
    const finM = toon('#c8ccd8', { map: ARCADE.brassTex('#c8ccd8'), emissive: '#4a5878', emissiveIntensity: 0.3 });
    for (let i = 0; i < 13; i++) { if (i >= 5 && i <= 7) continue; const fin = mk(K3D.geo('cc-fin', () => new T.BoxGeometry(0.5, 14, TW + 2)), finM, 0.4); fin.position.set(-TW / 2 - 0.5 + i * (TW + 1) / 12, top + 1.4 + 7, 0); g.add(fin); }
    for (const sz of [-1, 1]) for (let i = 5; i <= 7; i++) { const fin = mk(K3D.geo('cc-fin2', () => new T.BoxGeometry(0.5, 14, 6)), finM, 0.4); fin.position.set(-TW / 2 - 0.5 + i * (TW + 1) / 12, top + 1.4 + 7, sz * (TW / 2 - 2)); g.add(fin); }
    const fan = ARCADE.gear(K, { r: 4.6, teeth: 7, th: 0.5, spokes: 7, col: '#2a2a34' }); fan.rotation.x = -Math.PI / 2; fan.position.set(0, top + 4, 0); fan.userData.live = true; g.add(fan); CC.fan = fan;
    const ring = mk(new T.TorusGeometry(5.2, 0.4, 8, 40).rotateX(Math.PI / 2), toon('#3a3844'), 0.5); ring.position.set(0, top + 4, 0); g.add(ring);
    g.updateMatrixWorld(true);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const p = g.localToWorld(new T.Vector3(sx * (TW / 2 + 1), top + 15.6, sz * (TW / 2 + 1))); sc.B.add(p.x, p.y, p.z, '#ff3a2a', { size: 0.6, speed: 0.9, phase: 0, blink: true }); sc.G.add(p.x, p.y, p.z, 3, '#ff3a2a', 0.35, 0); }
    // a ring of lamps round the crown's top, chasing
    const cr = g.localToWorld(new T.Vector3(0, top + 15.4, 0)); sc.B.ring([cr.x, cr.y, cr.z], TW / 2 + 1.6, 44, ['#4ae8ff', '#fff6dc'], { size: 0.35, speed: 3 });
    // the searchlights: two beams sweeping the dark above the city
    CC.beams = [0, 1].map(k => { const p = g.localToWorld(new T.Vector3(k ? 6 : -6, top + 15, k ? -6 : 6)); const b = ARCADE.shaft(K, p.toArray(), [p.x, p.y + 120, p.z], 3.2, '#cfe8ff', 0.1); return { b, p, ph: k * Math.PI }; });
    // the glow round the tower, its light on the board
    const mid = g.localToWorld(new T.Vector3(0, 30, 0)); sc.G.add(mid.x, mid.y, mid.z, 34, '#4ae8ff', 0.04, 0);
    sc.G.add(C0.x, BY + 4, C0.z, 60, '#4ae8ff', 0.08, 0);
    sc.lamps.add(g.localToWorld(new T.Vector3(0, 12, TW)), '#9ae8ff', 2.4, 40);
    // the window washer: a cradle that goes up and down the front, a creature with a squeegee
    const cradle = new T.Group(); g.add(cradle);
    const cb = mk(new T.BoxGeometry(5, 0.4, 1.2), toon('#ffe24a'), 0.5); cradle.add(cb);
    for (const sx of [-1, 1]) { const rail = mk(new T.BoxGeometry(0.15, 1.2, 0.15), toon('#ffe24a'), 0.3); rail.position.set(sx * 2.4, 0.6, 0.5); cradle.add(rail); const rope = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, TH, 4).translate(0, TH / 2, 0), toon('#d8d4c8')); rope.position.set(sx * 2.4, 0, 0); cradle.add(rope); }
    const wsh = LIFE.actor({ kind: 'worker', col: '#5aff8a', col2: '#ffffff', hat: 'hard', s: 2.2 }); wsh.position.set(0.5, 0.2, 0); wsh.rotation.y = Math.PI; cradle.add(wsh);
    cradle.position.set(0, 20, TW / 2 + 0.7); CC.washer = { cradle, wsh, TH };
    return g;
  }

  // a blimp: a striped envelope, fins, a lit gondola with passengers, propellers, an LED sign scrolling down each side,
  // nav lights blinking; it goes round the city on a slow circle, bobbing
  function blimp(K, sc, o) {
    const g = new T.Group(); g.userData.live = true; K.add(g);
    const env = K3D.paint('cc-blimp|' + o.col, 64, 256, (c, w, h) => {
      c.fillStyle = o.col; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 32) { c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(0, y, w, 12); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, y + 28, w, 4); }
      c.fillStyle = '#f4efe4'; c.fillRect(0, h / 2 - 22, w, 44); c.fillStyle = '#2a2430'; c.fillRect(0, h / 2 - 24, w, 3); c.fillRect(0, h / 2 + 21, w, 3);
    });
    const body = mk(K3D.geo('cc-blimp', () => new T.SphereGeometry(1, 40, 20).scale(3.6, 10, 3.6).rotateZ(Math.PI / 2)), toon('#ffffff', { map: env }), 1.1); g.add(body);
    const finM = toon('#3a3442');
    for (let k = 0; k < 4; k++) { const fin = mk(K3D.geo('cc-fin', () => new T.BoxGeometry(2.8, 2.3, 0.22).translate(0, 2.25, 0)), finM, 0.6); fin.position.x = -7.9; fin.rotation.x = k * Math.PI / 2 + Math.PI / 4; g.add(fin); }
    const gon = mk(K3D.geo('cc-gon', () => new T.BoxGeometry(4.4, 1.5, 1.8)), toon('#2a2430'), 0.6); gon.position.y = -4.1; g.add(gon);
    for (const sz of [-1, 1]) { const wn = new T.Mesh(K3D.geo('cc-gonw', () => new T.PlaneGeometry(3.6, 0.6)), K3D.mat('cc-gonwM', () => K3D.flat(hot('#fff0c8', 1.5)))); wn.position.set(0, -4.0, sz * 0.91); if (sz < 0) wn.rotation.y = Math.PI; g.add(wn); }
    for (let n = 0; n < 3; n++) { const ps = LIFE.actor({ kind: pick(['blip', 'floaty', 'stack']), col: pick(ARCADE.NEON), col2: '#ffffff', s: 0.8 }); ps.position.set(-1.2 + n * 1.2, -3.35, 0); g.add(ps); }
    const props = []; for (const sz of [-1, 1]) { const pr = new T.Group(); pr.position.set(-2.6, -4.1, sz * 1.3); const bl = mk(K3D.geo('cc-prop', () => new T.BoxGeometry(0.12, 1.8, 0.24)), toon('#d8d4c8'), 0.3); pr.add(bl); g.add(pr); props.push(pr); }
    // the sign: an LED board on each side, the message scrolling along it
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 64; const cx = cv.getContext('2d');
    cx.fillStyle = '#0a0808'; cx.fillRect(0, 0, 1024, 64); cx.font = 'bold 44px monospace'; cx.textBaseline = 'middle'; cx.fillStyle = o.sign;
    const tw = cx.measureText(o.text).width; for (let x = 0; x < 1024; x += tw) cx.fillText(o.text, x, 34);
    cx.fillStyle = 'rgba(0,0,0,0.55)'; for (let x = 0; x < 1024; x += 4) cx.fillRect(x, 0, 1, 64); for (let y = 0; y < 64; y += 4) cx.fillRect(0, y, 1024, 1);
    const tex = new T.CanvasTexture(cv); tex.wrapS = T.RepeatWrapping; tex.repeat.set(0.4, 1); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
    const sm = new T.MeshBasicMaterial({ map: tex, toneMapped: false, color: new T.Color(1.6, 1.6, 1.6), side: T.DoubleSide });
    for (const sz of [-1, 1]) { const sg = new T.Mesh(new T.PlaneGeometry(11, 1.6), sm); sg.position.set(0.4, 0, sz * 3.62); if (sz < 0) sg.rotation.y = Math.PI; g.add(sg); }
    const nav = [sc.G.add(0, -9999, 0, 1.2, '#ff3a2a', 1.0, 0), sc.G.add(0, -9999, 0, 1.2, '#5aff8a', 1.0, 0), sc.G.add(0, -9999, 0, 2.6, '#fff0c8', 0.35, 0)];
    const b = { g, props, tex, nav, o, a: o.ph };
    b.place = (t, dt) => {
      b.a += o.sp * dt; tex.offset.x = (tex.offset.x + dt * 0.05) % 1;
      const x = C0.x + Math.cos(b.a) * o.r, z = C0.z + Math.sin(b.a) * o.r, y = BY + o.h + Math.sin(t * 0.4 + o.ph) * 1.2;
      g.position.set(x, y, z); const sg = Math.sign(o.sp), dx = -Math.sin(b.a) * sg, dz = Math.cos(b.a) * sg; g.rotation.set(0, Math.atan2(-dz, dx), Math.sin(t * 0.3 + o.ph) * 0.04);
      for (const pr of props) pr.rotation.x += dt * 22;
      g.updateMatrixWorld(true);
      const blink = Math.floor(t * 1.4 + o.ph) % 2 === 0;
      const p1 = g.localToWorld(new T.Vector3(-9.6, 3.2, 0)), p2 = g.localToWorld(new T.Vector3(-9.6, -3.2, 0)), p3 = g.localToWorld(new T.Vector3(0, -4.9, 0));
      sc.G.set(nav[0], p1.x, p1.y, p1.z, blink ? 1.2 : 0.01); sc.G.set(nav[1], p2.x, p2.y, p2.z, blink ? 0.01 : 1.2); sc.G.set(nav[2], p3.x, p3.y, p3.z, 2.6);
    };
    b.place(0, 0);
    return b;
  }

  // ribbon cables: wide flat grey cables (one red edge, the rest grey stripes) slung across the dark over the city from
  // far wall to far wall, clips and little work lamps along them, creatures walking the top
  function ribbons(K, sc, CC) {
    const rt = K3D.paint('cc-ribbon', 64, 16, (c, w, h) => {
      c.fillStyle = '#9a98a4'; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 4) { c.fillStyle = x === 0 ? '#c83a2a' : x % 8 ? '#a8a6b2' : '#8a8894'; c.fillRect(x, 0, 3, h); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 3, 0, 1, h); }
    }, { repeat: true });
    const mat = toon('#ffffff', { map: rt, side: T.DoubleSide });
    for (const [a0, off, low, wdt] of [[0.3, 140, 54, 7], [2.2, 150, 60, 6], [4.4, 132, 50, 8]]) {
      // a chord across the city, offset from the processor so it never meets the tower; anchored high at both ends
      const n = new T.Vector3(Math.cos(a0), 0, Math.sin(a0)), t = new T.Vector3(-n.z, 0, n.x), mid = C0.clone().addScaledVector(n, off);
      const pts = []; for (let k = 0; k <= 8; k++) { const u = k / 8 * 2 - 1; pts.push(mid.clone().addScaledVector(t, u * 230).setY(BY + low + (u * u) * 120)); }
      const cv = new T.CatmullRomCurve3(pts), N = 160, pos = [], uv = [], idx = [];
      for (let i = 0; i <= N; i++) { const p = cv.getPointAt(i / N); for (const sd of [-1, 1]) { pos.push(p.x + n.x * sd * wdt / 2, p.y, p.z + n.z * sd * wdt / 2); uv.push(sd < 0 ? 0 : wdt / 4, i / N * 460 / 6); } if (i) { const b = (i - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
      K.add(mk(geo, mat, 0.9));
      // clips every so often, each with a little lamp under it, and creatures out on the low part of the span
      for (let k = 1; k < 14; k++) {
        const u = k / 14, p = cv.getPointAt(u);
        const clip = mk(K3D.geo('cc-clip', () => new T.BoxGeometry(1.0, 0.6, 1)), K3D.mat('cc-clipM', () => toon('#3a3844')), 0.4); clip.scale.z = wdt + 0.6; clip.position.copy(p); clip.rotation.y = Math.atan2(n.x, n.z); K.add(clip);
        sc.G.add(p.x, p.y - 0.8, p.z, 2.2, pick(['#ffd27a', '#ffd27a', '#4ae8ff']), 0.5, rnd() < 0.2 ? 0.4 : 0);
        if (u > 0.3 && u < 0.7 && rnd() < 0.6) sc.crit.add(p.x + n.x * (rnd() - 0.5) * wdt * 0.6, p.y + 0.15, p.z + n.z * (rnd() - 0.5) * wdt * 0.6, { kind: pick([0, 4, 6, 1]), act: pick(['walk', 'sit', 'wave', 'fish', 'work']), yaw: Math.atan2(t.x, t.z) + (rnd() < 0.5 ? Math.PI : 0), s: 2.0 });
      }
    }
  }

  function build(K, sc) {
    const CC = { t: 0, legs: [], pads: [], ups: [] };
    // the trace's path in plan (so nothing is built on it)
    tracePts = []; for (let s = S0(); s < S1(); s += 3) { const f = R.at(s); tracePts.push({ x: f.p[0], z: f.p[2], w: W(s), y: f.p[1] }); }
    // the board: a vast circuit board under the whole city, its traces faintly glowing
    const bt = boardTex().clone(), bg = boardGlow().clone(); for (const t of [bt, bg]) { t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(10, 10); }
    // (it ends in a thick edge just before the coin box: gold edge-connector fingers along it, the drop beyond)
    const board = new T.Mesh(new T.PlaneGeometry(600, 410).rotateX(-Math.PI / 2), toon('#ffffff', { map: bt, emissive: '#ffffff', emissiveMap: bg, emissiveIntensity: 0.55 }));
    board.position.set(C0.x, BY, BZ1 - 205); K.add(board);
    const edge = mk(new T.BoxGeometry(600, 3, 1), toon('#0c2a1a'), 1); edge.position.set(C0.x, BY - 1.5, BZ1 + 0.5); K.add(edge);
    { const n = 240, im = new T.InstancedMesh(K3D.geo('cc-finger', () => new T.BoxGeometry(1.4, 0.12, 5)), toon('#e8c060', { emissive: '#ffb040', emissiveIntensity: 0.3 }), n), m = new T.Matrix4();
      for (let i = 0; i < n; i++) { m.makeTranslation(C0.x - 290 + i * 2.42, BY + 0.06, BZ1 - 2.5); im.setMatrixAt(i, m); } K.add(im); }
    // the trace on its standoffs: a brass post every 9 m from its underside down to the board, a collar, a nut
    for (let s = A.city - 6; s < A.land3 - 4; s += 13) {
      if (L.springs.some(sp => s > sp.s0 - 4 && s < sp.s1 + 4)) continue;
      const f = R.at(s), top = vv(R.bankLocal(s, 0, -0.5, f)), h = top.y - BY;
      if (h < 1) continue;
      const post = mk(K3D.geo('cc-post', () => new T.CylinderGeometry(0.7, 0.9, 1, 10).translate(0, 0.5, 0)), K3D.mat('cc-postM', () => toon('#c89a48', { map: ARCADE.brassTex('#c89a48') })), 0.6); post.position.set(top.x, BY, top.z); post.scale.y = h; K.add(post);
      const nut = mk(K3D.geo('cc-nut', () => new T.CylinderGeometry(1.4, 1.4, 0.6, 6)), K3D.mat('cc-nutM', () => toon('#d8b060')), 0.5); nut.position.set(top.x, BY + 0.3, top.z); K.add(nut);
      sc.G.add(top.x, BY + 0.4, top.z, 3.5, '#ffd27a', 0.08, 0);
    }
    processor(K, sc, CC);
    // the blocks: chip buildings, rings of them out from the processor (inside the loop and beyond). Beside the trace they
    // stand about as tall as it runs (so the ride weaves between lit towers); further out the skyline climbs above it.
    let placed = 0;
    for (let i = 0; i < 1600 && placed < 200; i++) {
      const a = rnd() * 6.28, r = 26 + Math.pow(rnd(), 1.25) * 170, x = C0.x + Math.cos(a) * r, z = C0.z + Math.sin(a) * r;
      const nt = nearT(x, z);
      let w = 4 + rnd() * 9, d = 3 + rnd() * 5, h;
      if (nt.d < 48) { h = Math.max(4, nt.h * (0.35 + rnd() * 1.0)); if (h > 16) { w = 4.5 + rnd() * 5.5; d = 4 + rnd() * 4.5; } }
      else h = r < 60 ? 4 + rnd() * 14 : 6 + rnd() * 24 + (rnd() < 0.35 ? 14 + rnd() * 26 : 0);
      if (!clear(x, z, Math.max(w, d) * 0.6 + (h > nt.h - 8 ? 5 : 0)) || z > BZ1 - 12) continue;
      if (Math.abs(x - C0.x) < 22 && Math.abs(z - C0.z) < 22) continue;
      building(K, sc, CC, x, z, w, d, h, { yaw: Math.round(rnd() * 4) * Math.PI / 2 + (rnd() < 0.2 ? 0.3 : 0) });
      placed++;
    }
    // capacitor towers (the city's water towers) and resistor halls, a crystal station
    for (let i = 0, n = 0; i < 200 && n < 18; i++) {
      const a = rnd() * 6.28, r = 30 + rnd() * 140, x = C0.x + Math.cos(a) * r, z = C0.z + Math.sin(a) * r, rr = 1.6 + rnd() * 2.4;
      if (!clear(x, z, rr + 1) || z > BZ1 - 6) continue;
      const c = ARCADE.cap(K, { r: rr, h: 6 + rnd() * 12 }); c.position.set(x, BY, z); K.add(c); n++;
      if (n === 3) CC.nibCap = { x, z, r: rr };
    }
    for (let i = 0, n = 0; i < 200 && n < 9; i++) {
      const a = rnd() * 6.28, r = 34 + rnd() * 120, x = C0.x + Math.cos(a) * r, z = C0.z + Math.sin(a) * r;
      if (!clear(x, z, 7) || z > BZ1 - 8) continue;
      const rs = ARCADE.resistor(K, { l: 12, r: 1.6 }); rs.position.set(x, BY + 1.7, z); rs.rotation.y = rnd() * 3; K.add(rs); n++;
    }
    {
      // the crystal: the city's station, a silver capsule on its side with 16.000 printed on it
      for (let i = 0; i < 100; i++) {
        const a = rnd() * 6.28, r = 50 + rnd() * 60, x = C0.x + Math.cos(a) * r, z = C0.z + Math.sin(a) * r;
        if (!clear(x, z, 9) || z > BZ1 - 10) continue;
        const xt = mk(new T.CapsuleGeometry(3, 10, 8, 20).rotateZ(Math.PI / 2), toon('#d8dce8', { map: ARCADE.brassTex('#d8dce8'), emissive: '#8890a8', emissiveIntensity: 0.25 }), 1); xt.position.set(x, BY + 3.1, z); xt.rotation.y = a; K.add(xt);
        const lb = ARCADE.neon(K, '16.000', { w: 6, h: 1.4, col: '#4ae8ff', col2: '#ffffff' }); lb.position.set(x, BY + 8, z); lb.rotation.y = a + Math.PI / 2; K.add(lb);
        CC.station = new T.Vector3(x, BY, z); break;
      }
    }
    // the pins under every chip and the processor's pads (two instanced families)
    {
      const lm = new T.InstancedMesh(K3D.geo('cc-leg', () => new T.BoxGeometry(1, 1, 1)), toon('#d8d0c0', { map: ARCADE.brassTex('#d8d0c0') }), CC.legs.length);
      CC.legs.forEach((m, i) => lm.setMatrixAt(i, m)); K.add(lm);
      const pm = new T.InstancedMesh(K3D.geo('cc-pad', () => new T.BoxGeometry(0.9, 0.6, 2.4)), toon('#e8c060', { emissive: '#ffb040', emissiveIntensity: 0.2 }), CC.pads.length);
      CC.pads.forEach((m, i) => pm.setMatrixAt(i, m)); K.add(pm);
    }
    // traffic: data running along straight board lanes (soft glows moving, in both directions)
    CC.cars = [];
    for (let k = 0; k < 22; k++) {
      const horiz = k % 2, off = horiz ? -260 + rnd() * 370 : -200 + rnd() * 400, a = horiz ? [C0.x - 280, BY + 0.5, C0.z + off] : [C0.x + off, BY + 0.5, -350], len = horiz ? 560 : 350 + BZ1, col = pick(['#5aff8a', '#4ae8ff', '#ffe24a', '#ff5ad6']);
      for (let n = 0; n < 5; n++) CC.cars.push({ gi: sc.G.add(0, -9999, 0, 1.4, col, 0.8, 0), a, horiz, len, u: rnd(), sp: (0.03 + rnd() * 0.03) * (n % 2 ? 1 : -1) });
    }
    stories(K, sc, CC);
    // the city's sky: cables hanging from the dark, signs of the walls far off
    for (let k = 0; k < 16; k++) { const x = C0.x - 150 + rnd() * 300, z = C0.z - 150 + rnd() * 300; if (!clear(x, z, 4) || z > BZ1) continue; K.add(ARCADE.cable(K, [[x, -60, z], [x + 4, -140, z + 3], [x + 6, BY + 30 + rnd() * 40, z + 6]], { r: 0.5 + rnd() * 0.4, clips: 0, labels: k % 3 === 0 })); }
    // the city's glow on the dark all round (light from blocks beyond the edge) and the gear works far above
    for (let k = 0; k < 28; k++) { const a = k / 28 * 6.283, r = 190 + rnd() * 40; if (C0.z + Math.sin(a) * r > BZ1) continue; sc.G.add(C0.x + Math.cos(a) * r, BY + 8 + rnd() * 20, C0.z + Math.sin(a) * r, 50 + rnd() * 40, pick(['#4ae8ff', '#ffe2a0', '#5aff8a', '#ff8ad6']), 0.06, 0); }
    for (let k = 0; k < 64; k++) { const a = rnd() * 6.283, r = 185 + rnd() * 55, x = C0.x + Math.cos(a) * r, z = C0.z + Math.sin(a) * r, h = 18 + rnd() * 56; if (z > BZ1 - 12) continue; building(K, sc, CC, x, z, 7 + rnd() * 9, 6 + rnd() * 6, h, { crowd: false }); }
    // the sky over the city: ribbon cables slung across the dark, blimps with signs going round
    ribbons(K, sc, CC);
    CC.blimps = [
      blimp(K, sc, { text: '  BYTE BURGER  \u2605  TRY THE DOUBLE BYTE  \u2605  OPEN ALL NIGHT  ', col: '#ff8a4a', sign: '#ffe24a', r: 104, h: 50, ph: 0.6, sp: 0.035 }),
      blimp(K, sc, { text: '  \u2605 GO PIP! \u2605 GO BO! \u2605  THE BIG COIN DROP IS ON!  ', col: '#4ae8ff', sign: '#5aff8a', r: 126, h: 58, ph: 3.4, sp: -0.028 }),
    ];
    return CC;
  }

  /* ---------- stories ---------- */
  function stories(K, sc, CC) {
    const U = CC.ups;
    const near = (s0, x, z) => { let best = 1e9, bs = 0; for (let s = S0(); s < S1(); s += 4) { const f = R.at(s), d = (f.p[0] - x) ** 2 + (f.p[2] - z) ** 2; if (d < best) { best = d; bs = s; } } return bs; };
    // THE ROOFTOP PARTY: a wide low chip right by the trace's first bend in the city, string lights, a DJ, dancers
    {
      const f = R.at(A.ck5 - 6), x = f.p[0] + f.br[0] * -22, z = f.p[2] + f.br[2] * -22;
      const g = building(K, sc, CC, x, z, 14, 9, 6, { label: 'SND-02', crowd: false, yaw: f.yaw });
      const roof = 6.6 + 0.2;
      const dj = LIFE.actor({ kind: 'stack', col: '#ff5ad6', col2: '#ffe24a', hat: 'cap', s: 2.4 }); dj.position.set(0, roof, -2.6); g.add(dj);
      const desk = mk(new T.BoxGeometry(3.4, 1.2, 1.2), toon('#2a2438'), 0.5); desk.position.set(0, roof + 0.6, -1.6); g.add(desk);
      for (const sx of [-1, 1]) { const sp2 = mk(new T.BoxGeometry(1.4, 2.4, 1.2), toon('#1a1a22'), 0.5); sp2.position.set(sx * 3.4, roof + 1.2, -2.4); g.add(sp2); const cone = new T.Mesh(new T.CircleGeometry(0.5, 16), toon('#4a4a58')); cone.position.set(sx * 3.4, roof + 1.5, -1.79); g.add(cone); }
      const dancers = []; for (let k = 0; k < 9; k++) { const a2 = LIFE.actor({ kind: pick(['blip', 'blip', 'stack', 'floaty']), col: pick(ARCADE.NEON), col2: pick(ARCADE.NEON), hat: pick([null, 'bow', 'antenna', 'cap']), s: 2 }); a2.position.set(-5 + (k % 5) * 2.4, roof, 0.6 + Math.floor(k / 5) * 2.2); g.add(a2); dancers.push(a2); }
      g.updateMatrixWorld(true);
      for (let k = 0; k < 3; k++) { const a2 = g.localToWorld(new T.Vector3(-7, roof + 4, -3 + k * 3)), b2 = g.localToWorld(new T.Vector3(7, roof + 4, -3 + k * 3)); sc.B.line(a2.toArray(), b2.toArray(), 0.8, ['#ff5ad6', '#4ae8ff', '#ffe24a', '#5aff8a'], { size: 0.22, sag: 1.4, speed: 3 }); }
      const dl = g.localToWorld(new T.Vector3(0, roof + 3, 0)); sc.lamps.add(dl, '#ff5ad6', 2.2, 18, { fn: t => 0.7 + 0.3 * Math.sin(t * 8) });
      U.push(t => { const beat = Math.abs(Math.sin(t * Math.PI * 148 / 60)); LIFE.pose(dj, 'work', t * 1.5); dancers.forEach((d2, k) => { LIFE.pose(d2, k % 3 ? 'cheer' : 'wave', t + k); d2.userData.body.position.y = beat * 0.4; }); });
    }
    // BYTE BURGER: a diner on a low chip with a neon sign and a queue out of the door
    {
      const f = R.at(A.split3b + 4), x = f.p[0] + f.br[0] * 24, z = f.p[2] + f.br[2] * 24;
      const g = building(K, sc, CC, x, z, 10, 7, 5, { label: 'IO-21', crowd: false, yaw: f.yaw + Math.PI });
      const sign = ARCADE.neon(K, 'BYTE BURGER', { w: 9, h: 2, col: '#ffe24a', col2: '#ff5a4a' }); sign.position.set(0, 8.2, 0); g.add(sign);
      g.updateMatrixWorld(true);
      const q = []; for (let k = 0; k < 7; k++) { const a2 = LIFE.actor({ kind: pick(['blip', 'stack', 'blip', 'crab']), col: pick(ARCADE.NEON), col2: '#ffffff', s: 2 }); a2.position.set(-3 + k * 1.6, 0.6, 5.2); a2.rotation.y = -Math.PI / 2; g.add(a2); q.push(a2); }
      sc.lamps.add(g.localToWorld(new T.Vector3(0, 6, 4)), '#ffb040', 2.0, 16);
      U.push(t => q.forEach((a2, k) => { LIFE.pose(a2, k === 0 ? 'work' : 'idle', t + k * 0.7); a2.position.x = -3 + k * 1.6 + Math.max(0, Math.sin(t * 0.5 - k * 0.4)) * 0.6; }));
    }
    // THE CRANE: a lattice crane lifting a new chip into place, workers waiting below
    {
      const f = R.at(A.bugs2 + 10), x = f.p[0] + f.br[0] * -30, z = f.p[2] + f.br[2] * -30;
      const g = new T.Group(); g.position.set(x, BY, z); K.add(g);
      const mastM = toon('#ffd23a', { emissive: '#ffb020', emissiveIntensity: 0.15 });
      for (let y = 0; y < 34; y += 2) { const seg = mk(K3D.geo('cc-mast', () => new T.BoxGeometry(1.6, 2, 1.6)), mastM, 0.4); seg.position.y = y + 1; g.add(seg); }
      const jib = new T.Group(); jib.position.y = 34; g.add(jib);
      const arm = mk(new T.BoxGeometry(28, 1, 1), mastM, 0.4); arm.position.x = 9; jib.add(arm);
      const cw = mk(new T.BoxGeometry(3, 2, 2), toon('#5a5a68'), 0.4); cw.position.x = -5; jib.add(cw);
      const cab = mk(new T.BoxGeometry(2, 2, 2), toon('#e8e8f0'), 0.4); cab.position.set(0, -1.6, 1.4); jib.add(cab);
      const hook = new T.Group(); hook.position.x = 18; jib.add(hook);
      const cable = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1, 4).translate(0, -0.5, 0), toon('#2a2a30')); hook.add(cable);
      const load = ARCADE.chip(K, { w: 8, d: 4, h: 3, label: 'GFX-9' }); hook.add(load);
      const site = mk(new T.BoxGeometry(10, 0.6, 6), toon('#3a3844'), 0.4); site.position.set(18, 0.3, 0); g.add(site);
      const workers = []; for (let k = 0; k < 4; k++) { const a2 = LIFE.actor({ kind: 'worker', col: pick(['#ffb050', '#5aff8a', '#4ae8ff']), col2: '#ffffff', hat: 'hard', s: 2 }); a2.position.set(14 + k * 2.4, 0.6, 3.6); g.add(a2); workers.push(a2); }
      g.updateMatrixWorld(true); const tp = g.localToWorld(new T.Vector3(0, 35, 0)); sc.B.add(tp.x, tp.y, tp.z, '#ff3a2a', { size: 0.4, speed: 1, blink: true });
      U.push(t => { const u = (Math.sin(t * 0.25) + 1) / 2; jib.rotation.y = Math.sin(t * 0.12) * 0.25; const drop = 8 + u * 20; cable.scale.y = drop; load.position.y = -drop - 3.2; workers.forEach((w2, k) => LIFE.pose(w2, u > 0.85 ? 'wave' : k % 2 ? 'work' : 'idle', t + k)); });
    }
    // THE TRAM: a little data-bus train of three cars running round a loop on the board, passengers waving
    {
      const loop = []; const cx = C0.x, cz = C0.z; for (let k = 0; k <= 64; k++) { const a = k / 64 * 6.283; loop.push(new T.Vector3(cx + Math.cos(a) * 34, BY + 0.6, cz + Math.sin(a) * 30)); }
      const curve = new T.CatmullRomCurve3(loop, true);
      // the rail
      K.add(mk(new T.TubeGeometry(curve, 200, 0.25, 5, true), toon('#c8ccd8'), 0.4));
      const cars = [];
      for (let k = 0; k < 3; k++) {
        const car = new T.Group(); car.userData.live = true; K.add(car);
        const b = mk(new T.BoxGeometry(2.4, 2, 5), toon(k ? '#4ae8ff' : '#ffe24a', { emissive: k ? '#4ae8ff' : '#ffe24a', emissiveIntensity: 0.25 }), 0.6); b.position.y = 1.4; car.add(b);
        const wnd = new T.Mesh(new T.PlaneGeometry(4.2, 0.8), K3D.flat(hot('#fff6dc', 1.4))); wnd.position.set(1.22, 1.8, 0); wnd.rotation.y = Math.PI / 2; car.add(wnd);
        const wnd2 = wnd.clone(); wnd2.position.x = -1.22; wnd2.rotation.y = -Math.PI / 2; car.add(wnd2);
        for (let n = 0; n < 3; n++) { const ps = LIFE.actor({ kind: pick(['blip', 'floaty']), col: pick(ARCADE.NEON), col2: '#ffffff', s: 1.1 }); ps.position.set(0, 2.4, -1.6 + n * 1.6); car.add(ps); cars.push({ ps }); }
        cars[k * 3].car = car; car.position.copy(curve.getPointAt((1 - k * 0.03 + 1) % 1));
      }
      U.push(t => { for (let k = 0; k < 3; k++) { const u = ((t * 0.018) - k * 0.03 + 10) % 1, p = curve.getPointAt(u), q = curve.getTangentAt(u); const car = cars[k * 3].car; car.position.copy(p); car.rotation.y = Math.atan2(q.x, q.z); } cars.forEach((c, i) => LIFE.pose(c.ps, i % 2 ? 'wave' : 'idle', t + i)); });
    }
    // NIB in the city: hiding behind a capacitor tower nearest the trace, peeks as the heroes come, hides again
    {
      const n = LIFE.nib(); n.scale.setScalar(2.2);
      const cp = CC.nibCap || { x: C0.x + 40, z: C0.z, r: 2 };
      const s = near(0, cp.x, cp.z), f = R.at(s), dir = new T.Vector3(f.p[0] - cp.x, 0, f.p[2] - cp.z).normalize();
      n.position.set(cp.x - dir.z * (cp.r + 0.8), BY, cp.z + dir.x * (cp.r + 0.8)); n.rotation.y = Math.atan2(dir.x, dir.z); n.userData.live = true; K.add(n);
      CC.nib = { n, s };
      U.push((t, st) => { const d = st.s - s; LIFE.nibPose(n, d < -30 ? 'hide' : d < -4 ? 'peek' : d < 20 ? 'wave' : 'relief', t, 0); });
    }
  }

  /* ---------- every frame ---------- */
  function update(K, CC, st, dt) {
    CC.t += dt; const t = CC.t;
    const on = st.phase !== 'intro' && st.s > A.city - 160 && st.s < A.box + 60;
    if (!on && !ARCADECOIN_SCENE.camOverride) return;
    if (CC.fan) CC.fan.rotation.z += dt * 3;
    if (CC.washer) { const w = CC.washer; w.cradle.position.y = 10 + (Math.sin(t * 0.15) + 1) * 0.5 * (w.TH - 16); LIFE.pose(w.wsh, 'work', t * 1.5); }
    for (const b of CC.beams) { const a = t * 0.3 + b.ph; b.b.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), new T.Vector3(Math.cos(a) * 0.55, 1, Math.sin(a) * 0.55).normalize()); }
    for (const c of CC.cars) { c.u = (c.u + c.sp * dt + 1) % 1; const d = c.u * c.len; if (c.horiz) ARCADE_G(K).set(c.gi, c.a[0] + d, c.a[1], c.a[2], 1.4); else ARCADE_G(K).set(c.gi, c.a[0], c.a[1], c.a[2] + d, 1.4); }
    for (const u of CC.ups) u(t, st);
    for (const b of CC.blimps) b.place(t, dt);
  }
  const ARCADE_G = K => K.arcSc.G;

  return { build, update };
})();
