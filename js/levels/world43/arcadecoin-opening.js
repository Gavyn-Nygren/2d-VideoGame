/* Pip & Bo - 43-1 Coin Drop: the opening (about 12.5 s; jump skips it after the first play).

   1  THE ARCADE AT NIGHT (0 - 3.2 s): a closed arcade, rows of sleeping cabinets with dark screens, the street lamp's
      orange light falling through the high windows, the shop's neon sign backwards in the glass, a green EXIT. One
      machine still glows: COIN DROP, a hand-written PLAY ME taped to it. Pip and Bo wander up to it.
   2  INSERT COIN (3.2 - 5.0 s): close on the coin door: Pip flicks a coin in, then Bo; the machine wakes, the screen
      flashes 2 PLAYERS!
   3  SUCKED IN (5.0 - 6.4 s): the screen flares, pixels whirl, and the two of them shrink, spinning, into the coin slots.
   4  INSIDE (6.7 - 12.5 s): out through the slot from the other side, a blaze of light, tumbling down through the dark
      of the machine on two coins as big as they are, righting themselves, the controls showing, and down onto the
      brass chute.
   The arcade room is a set of its own far above the inside of the machine (out of sight of it), built at the heroes'
   normal size. Display only.

   ARCADECOIN_OPENING.build(K, sc) -> op;  .update(K, op, st, dt);  .shot(K, op, st) -> { eye, at, up, fov };
   .drawTop(op, st).  op.snapNext asks the camera to cut instead of glide; op.focus is where the lamps gather.
   Every name and title in the arcade is made up. */
'use strict';

const ARCADECOIN_OPENING = (function () {
  const T = K3D.T, PR = ARCADECOIN_ROUTE, R = PR.R;
  const INK = '#120d14';
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const vv = a => new T.Vector3(a[0], a[1], a[2]);
  const sm = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  const lerp = (a, b, u) => a + (b - a) * u;
  const rnd = () => ARCADE.rnd(), pick = a => ARCADE.pick(a);
  // (one material per look, shared: the static scenery then bakes into few draws)
  const toon = (c, o = {}) => K3D.mat('w43t|' + c + '|' + Object.keys(o).sort().map(k => k + ':' + (o[k] && o[k].uuid ? o[k].uuid : String(o[k]))).join(','), () => { const m = K3D.toon(c, o); if (o.emissiveMap) m.emissiveMap = o.emissiveMap; return m; });
  const mk = (geo, mat, ink = 0.6) => K3D.mesh(geo, mat, { ink: INK, inkW: ink });
  const O = new T.Vector3(0, 900, 0); // the arcade room's floor centre (far above the machine's insides)
  const TM = { walk: 3.2, ins: 5.0, white: 6.4, inside: 6.7, end: ARCADECOIN.S.INTRO_T };
  const TITLES = ['ROCKET RALLY', 'MOON MOLE', 'GHOST GARDEN', 'DINO DASH', 'STAR SPARK', 'SUB SURGE', 'BLOB BUSTERS', 'TURBO TOAD', 'LASER LLAMA', 'CAVE QUEST', 'SNACK ATTACK', 'COMET CATS'];

  /* ---------- painted things ---------- */
  const carpetTex = () => K3D.paint('op-carpet', 512, 512, (c, w, h) => {
    // the arcade carpet: deep navy, neon confetti (zigzags, rings, triangles, squiggles, stars), worn paths
    c.fillStyle = '#141432'; c.fillRect(0, 0, w, h);
    let s = 5; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const cols = ['#ff5ad6', '#4ae8ff', '#ffe24a', '#5aff8a', '#ff8a4a', '#9a8aff'];
    for (let i = 0; i < 170; i++) {
      const x = r() * w, y = r() * h, col = cols[Math.floor(r() * cols.length)], k = Math.floor(r() * 5), a = r() * 6.28;
      c.save(); c.translate(x, y); c.rotate(a); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 3; c.globalAlpha = 0.55;
      if (k === 0) { c.beginPath(); c.moveTo(-14, 0); for (let j = 0; j < 4; j++) c.lineTo(-14 + j * 8 + 4, j % 2 ? 6 : -6); c.stroke(); }
      else if (k === 1) { c.beginPath(); c.arc(0, 0, 7, 0, 6.28); c.stroke(); }
      else if (k === 2) { c.beginPath(); c.moveTo(0, -8); c.lineTo(7, 6); c.lineTo(-7, 6); c.closePath(); c.fill(); }
      else if (k === 3) { c.beginPath(); c.moveTo(-12, 0); c.bezierCurveTo(-6, -10, 0, 10, 6, 0); c.bezierCurveTo(9, -5, 12, 0, 14, 2); c.stroke(); }
      else { c.beginPath(); for (let j = 0; j < 10; j++) { const rr = j % 2 ? 3 : 8, aa = j / 10 * 6.28; c.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } c.closePath(); c.fill(); }
      c.restore();
    }
    c.globalAlpha = 1;
    for (let i = 0; i < 3000; i++) { c.fillStyle = `rgba(0,0,0,${r() * 0.2})`; c.fillRect(r() * w, r() * h, 2, 2); }
  }, { repeat: true });
  const tileTex = () => K3D.paint('op-ceil', 128, 128, (c, w, h) => { c.fillStyle = '#2a2830'; c.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } c.strokeStyle = '#4a4650'; c.lineWidth = 4; c.strokeRect(0, 0, w, h); c.fillStyle = 'rgba(120,90,40,0.25)'; c.beginPath(); c.ellipse(w * 0.7, h * 0.3, 18, 12, 0.3, 0, 7); c.fill(); }, { repeat: true });
  const wallTex = () => K3D.paint('op-wall', 256, 256, (c, w, h) => {
    // dark painted wall with a band of neon-stripe wallpaper at hand height
    c.fillStyle = '#1e1a2a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '80,70,110' : '0,0,0'},${Math.random() * 0.15})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    const y0 = h * 0.62; c.fillStyle = '#2a1640'; c.fillRect(0, y0, w, h * 0.16);
    for (let x = -40; x < w + 40; x += 24) { c.strokeStyle = ['#a03a8a', '#2a8aa8', '#a89a3a'][(x / 24 + 2) % 3 | 0]; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y0 + h * 0.16); c.lineTo(x + 20, y0); c.stroke(); }
    c.fillStyle = '#0e0c14'; c.fillRect(0, h * 0.94, w, h * 0.06);
  }, { repeat: true });
  const marqueeTex = (title, col, lit) => K3D.paint('op-marq|' + title + lit, 512, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, lit ? '#2a1450' : '#120a1e'); g.addColorStop(1, lit ? '#140a30' : '#08060e'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    // little made-up artwork: stars and a planet, a pair of chasing dots
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * (lit ? 0.8 : 0.25)})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    c.fillStyle = col; c.globalAlpha = lit ? 0.9 : 0.35; c.beginPath(); c.arc(w * 0.88, h * 0.5, 26, 0, 6.28); c.fill();
    c.globalAlpha = lit ? 1 : 0.45;
    c.font = 'bold 64px "Lilita One", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 8; c.strokeStyle = '#0a0612'; c.strokeText(title, w * 0.46, h * 0.54);
    c.fillStyle = col; c.fillText(title, w * 0.46, h * 0.54);
    c.globalAlpha = lit ? 0.5 : 0.15; c.fillStyle = '#fff'; c.fillText(title, w * 0.46, h * 0.5);
  });
  const sideArtTex = (col, k) => K3D.paint('op-side|' + col + k, 256, 512, (c, w, h) => {
    c.fillStyle = '#16121e'; c.fillRect(0, 0, w, h);
    c.save(); c.translate(w / 2, h / 2); c.rotate(-0.5);
    for (let i = -6; i < 6; i++) { c.fillStyle = i % 2 ? col : '#2a2438'; c.globalAlpha = i % 2 ? 0.75 : 1; c.fillRect(-w, i * 46 + k * 7, w * 2, i % 2 ? 14 : 30); }
    c.restore(); c.globalAlpha = 1;
    for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.3})`; c.fillRect(Math.random() * w, Math.random() * h, 3, 2); }
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(w * 0.1, h * 0.4, 6, 40); // a scuff
  });

  /* ---------- a cabinet (a classic upright, made up) ---------- */
  // side profile (z forward, y up), extruded across x
  const prof = () => { const s = new T.Shape(); [[-0.42, 0], [0.38, 0], [0.38, 0.86], [0.5, 0.9], [0.5, 0.98], [0.28, 1.04], [0.14, 1.58], [0.22, 1.62], [0.22, 1.94], [-0.42, 1.94]].forEach(([z, y], i) => i ? s.lineTo(z, y) : s.moveTo(z, y)); s.closePath(); return s; };
  function cabinet(K, op, o) {
    const W = 0.86, g = new T.Group();
    const col = o.col, body = K3D.mat('op-cabbody|' + (o.hero ? 'h' : ''), () => toon(o.hero ? '#1a1a2a' : '#1c1826', { emissive: '#1a1430', emissiveIntensity: 0.3 }));
    const geo = K3D.geo('op-cab', () => { const ge = new T.ExtrudeGeometry(prof(), { depth: W, bevelEnabled: false }); ge.rotateY(-Math.PI / 2); ge.translate(W / 2, 0, 0); return ge; });
    g.add(mk(geo, body, 0.8));
    // side art on both sides
    const sideGeo = K3D.geo('op-cabside', () => { const ge = new T.ShapeGeometry(prof()); const uv = ge.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 0.42) / 0.92, uv.getY(i) / 1.94); ge.rotateY(-Math.PI / 2); return ge; });
    const sm1 = K3D.mat('op-side|' + col + (o.k || 0), () => toon('#ffffff', { map: sideArtTex(col, o.k || 0), side: T.DoubleSide, emissive: '#ffffff', emissiveMap: sideArtTex(col, o.k || 0), emissiveIntensity: 0.08 }));
    for (const sx of [-1, 1]) { const sd = new T.Mesh(sideGeo, sm1); sd.position.x = sx * (W / 2 + 0.003); g.add(sd); }
    // the screen in its bezel, sloped
    const scrAng = Math.atan2(0.54, 0.14);
    const bez = new T.Mesh(K3D.geo('op-bez', () => new T.PlaneGeometry(0.78, 0.6)), K3D.mat('op-bezM', () => toon('#0a0a10'))); bez.position.set(0, 1.31, 0.212); bez.rotation.x = -(Math.PI / 2 - scrAng); g.add(bez);
    const scrM = o.screenMat || K3D.mat('op-scr|' + col, () => K3D.flat(hot(col, 0.08)));
    const scr = new T.Mesh(K3D.geo('op-scr', () => new T.PlaneGeometry(0.64, 0.48)), scrM); scr.position.set(0, 1.31, 0.218); scr.rotation.x = bez.rotation.x; g.add(scr);
    // a dim reflection across the glass
    const refl = new T.Mesh(K3D.geo('op-refl', () => new T.PlaneGeometry(0.2, 0.5)), K3D.mat('op-reflM', () => K3D.flat(hot('#8890c0', 0.25), { transparent: true, add: true, depthWrite: false }))); refl.position.set(-0.12, 1.31, 0.222); refl.rotation.set(bez.rotation.x, 0, 0.4); g.add(refl);
    // the marquee
    const mq = new T.Mesh(K3D.geo('op-mq', () => new T.PlaneGeometry(0.8, 0.26)), o.hero ? K3D.flat(hot('#ffffff', 1.3), { map: marqueeTex(o.title, col, true) }) : K3D.flat(hot('#ffffff', o.lit ? 0.9 : 0.35), { map: marqueeTex(o.title, col, !!o.lit) }));
    mq.position.set(0, 1.79, 0.225); g.add(mq);
    // the control panel: a stick, buttons
    const panel = mk(K3D.geo('op-panel', () => new T.BoxGeometry(W + 0.04, 0.05, 0.26).rotateX(0.27)), K3D.mat('op-panelM', () => toon('#2a2438')), 0.5); panel.position.set(0, 0.99, 0.39); g.add(panel);
    for (const sx of [-1, 1]) {
      const st2 = new T.Mesh(K3D.geo('op-stick', () => new T.CylinderGeometry(0.012, 0.012, 0.1, 6).translate(0, 0.05, 0)), K3D.mat('op-stickM', () => toon('#b8b8c0'))); st2.position.set(sx * 0.22 - 0.06, 1.01, 0.4); g.add(st2);
      const ball = new T.Mesh(K3D.geo('op-ball', () => new T.SphereGeometry(0.03, 10, 8)), K3D.mat('op-ball|' + (sx < 0 ? 'r' : 'b'), () => toon(sx < 0 ? '#ff5a4a' : '#4a8aff'))); ball.position.set(sx * 0.22 - 0.06, 1.12, 0.4); g.add(ball);
      for (let b = 0; b < 2; b++) { const bt = new T.Mesh(K3D.geo('op-btn', () => new T.CylinderGeometry(0.022, 0.022, 0.02, 12)), K3D.mat('op-btn|' + b, () => K3D.toon(['#ffe24a', '#5aff8a'][b], { emissive: ['#ffe24a', '#5aff8a'][b], emissiveIntensity: o.hero ? 0.8 : 0.15 }))); bt.position.set(sx * 0.22 + 0.04 + b * 0.06, 1.02, 0.38 + b * 0.02); bt.rotation.x = 0.27; g.add(bt); }
    }
    // the coin door: a steel plate, two slots with red-lit 25c lamps
    const door = mk(K3D.geo('op-cdoor', () => new T.BoxGeometry(0.36, 0.3, 0.02)), K3D.mat('op-cdoorM', () => toon('#6a6a78', { map: ARCADE.grimeTex() })), 0.4); door.position.set(0, 0.6, 0.39); g.add(door);
    const slotM = o.hero ? K3D.flat(hot('#ff4a3a', 2.2)) : K3D.mat('op-slotM', () => K3D.flat(hot('#ff4a3a', 0.7)));
    for (const sx of [-1, 1]) {
      const lamp = new T.Mesh(K3D.geo('op-slotl', () => new T.PlaneGeometry(0.08, 0.1)), slotM); lamp.position.set(sx * 0.09, 0.64, 0.401); g.add(lamp);
      const sl = new T.Mesh(K3D.geo('op-slotk', () => new T.PlaneGeometry(0.008, 0.05)), K3D.mat('op-slotkM', () => K3D.flat('#000000'))); sl.position.set(sx * 0.09, 0.64, 0.402); g.add(sl);
      const ret = new T.Mesh(K3D.geo('op-ret', () => new T.PlaneGeometry(0.06, 0.03)), K3D.mat('op-retM', () => K3D.flat('#0a0a0e'))); ret.position.set(sx * 0.09, 0.5, 0.401); g.add(ret);
    }
    // a kick plate, levelling feet
    const kick = new T.Mesh(K3D.geo('op-kick', () => new T.PlaneGeometry(W, 0.12)), K3D.mat('op-kickM', () => toon('#0e0c12'))); kick.position.set(0, 0.06, 0.382); g.add(kick);
    // the glow its screen throws on the carpet in front
    if (o.glow !== false) { const p = new T.Vector3(0, 0.05, 0.9); g.updateMatrixWorld(true); op.later.push(() => { const w = g.localToWorld(p.clone()); op.sc.G.add(w.x, w.y, w.z, o.hero ? 1.4 : 0.9, col, o.hero ? 0.18 : 0.05, 0); }); }
    g.position.set(O.x + o.x, O.y, O.z + o.z); g.rotation.y = o.yaw || 0;
    K.add(g);
    return g;
  }

  /* ---------- the hero machine's screen (an animated picture) ---------- */
  function heroScreen(op) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 192;
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.magFilter = T.NearestFilter;
    const mat = new T.MeshBasicMaterial({ map: tex, toneMapped: false, color: new T.Color(1.6, 1.6, 1.6) });
    op.scr = { cv, c: cv.getContext('2d'), tex, mat, last: -1 };
    return mat;
  }
  function drawScreen(op, t) {
    const S = op.scr, c = S.c, w = 256, h = 192;
    const f = Math.floor(t * 12); if (f === S.last) return; S.last = f;
    c.fillStyle = '#06041a'; c.fillRect(0, 0, w, h);
    // the stars drifting down
    for (let i = 0; i < 40; i++) { const x = (i * 53) % w, y = ((i * 37) + t * (12 + i % 3 * 10)) % h; c.fillStyle = i % 5 ? '#6a6aa8' : '#ffffff'; c.fillRect(x, y, 2, 2); }
    if (t < TM.walk + 0.3) {
      // attract mode: a pixel coin bouncing down a chute, the title, INSERT COIN blinking
      c.fillStyle = '#c89a48'; for (let k = 0; k < 6; k++) c.fillRect(20 + k * 36, 120 + k * 8, 36, 4);
      const u = (t * 0.6) % 1, x = 20 + u * 216, y = 112 + u * 48 - Math.abs(Math.sin(u * 18)) * 10;
      c.fillStyle = '#ffd24a'; c.fillRect(x - 6, y - 6, 12, 12); c.fillStyle = '#fff6c8'; c.fillRect(x - 3, y - 4, 3, 3);
      c.font = 'bold 30px monospace'; c.textAlign = 'center'; c.fillStyle = '#ffd24a'; c.fillText('COIN DROP', w / 2, 52);
      if (Math.floor(t * 2) % 2 === 0) { c.font = 'bold 18px monospace'; c.fillStyle = '#ffffff'; c.fillText('INSERT COIN', w / 2, 92); }
    } else if (t < TM.ins) {
      const cr = t > 4.05 ? 2 : t > 3.55 ? 1 : 0;
      c.font = 'bold 22px monospace'; c.textAlign = 'center'; c.fillStyle = '#ffffff'; c.fillText('CREDITS ' + cr, w / 2, 70);
      if (cr === 2) { c.font = 'bold 34px monospace'; c.fillStyle = Math.floor(t * 8) % 2 ? '#5aff8a' : '#ffe24a'; c.fillText('2 PLAYERS!', w / 2, 120); }
      c.fillStyle = '#ff7a3a'; c.fillRect(40, 150, 30, 30); c.fillStyle = '#5aa8ff'; c.fillRect(w - 70, 150, 30, 30);
    } else {
      // the flare: rings of pixels spiralling in
      const u = (t - TM.ins) / (TM.white - TM.ins);
      for (let i = 0; i < 160; i++) { const a = i * 0.7 + t * 6, r = (1 - ((i / 160 + u * 2) % 1)) * 160; c.fillStyle = ['#ff5ad6', '#4ae8ff', '#ffe24a', '#5aff8a', '#ffffff'][i % 5]; c.fillRect(w / 2 + Math.cos(a) * r - 3, h / 2 + Math.sin(a) * r * 0.75 - 3, 6, 6); }
      c.fillStyle = `rgba(255,255,255,${Math.min(1, u * 1.4)})`; c.fillRect(0, 0, w, h);
    }
    // scanlines
    c.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < h; y += 3) c.fillRect(0, y, w, 1);
    S.tex.needsUpdate = true;
  }

  /* ---------- the room ---------- */
  function room(K, op) {
    const sc = op.sc, at = (x, y, z) => new T.Vector3(O.x + x, O.y + y, O.z + z);
    // carpet, walls, ceiling
    const floor = new T.Mesh(new T.PlaneGeometry(26, 20).rotateX(-Math.PI / 2), toon('#ffffff', { map: carpetTex() }));
    const uv = floor.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 9, uv.getY(i) * 7);
    floor.position.copy(at(0, 0, -1)); K.add(floor);
    const wm = toon('#ffffff', { map: wallTex() });
    const wall = (x, z, w, yaw) => { const m = new T.Mesh(new T.PlaneGeometry(w, 3.6), wm); const u2 = m.geometry.attributes.uv; for (let i = 0; i < u2.count; i++) u2.setXY(i, u2.getX(i) * w / 3.6, u2.getY(i)); m.position.copy(at(x, 1.8, z)); m.rotation.y = yaw; K.add(m); return m; };
    wall(0, -5.2, 26, 0); wall(-12.4, -1, 20, Math.PI / 2); wall(12.4, -1, 20, -Math.PI / 2); wall(0, 8.8, 26, Math.PI);
    const ceil = new T.Mesh(new T.PlaneGeometry(26, 20).rotateX(Math.PI / 2), toon('#ffffff', { map: tileTex() }));
    const cu = ceil.geometry.attributes.uv; for (let i = 0; i < cu.count; i++) cu.setXY(i, cu.getX(i) * 22, cu.getY(i) * 17);
    ceil.position.copy(at(0, 3.6, -1)); K.add(ceil);
    // high windows on the back wall: the night street outside, the street lamp, the shop's neon sign backwards
    const winTex = K3D.paint('op-win', 512, 128, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0a1030'); g.addColorStop(1, '#2a2a4a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`; c.fillRect(Math.random() * w, Math.random() * h * 0.5, 1.5, 1.5); }
      c.fillStyle = '#05060e'; c.fillRect(0, h * 0.62, w, h); for (let x = 0; x < w; x += 46) c.fillRect(x, h * (0.3 + Math.random() * 0.3), 30 + Math.random() * 14, h); // roofs across the road
      for (let i = 0; i < 18; i++) { c.fillStyle = Math.random() < 0.5 ? '#ffd27a' : '#2a2a3a'; c.fillRect(Math.random() * w, h * (0.55 + Math.random() * 0.35), 5, 6); }
      // the street lamp
      c.fillStyle = '#05060e'; c.fillRect(w * 0.7, h * 0.25, 4, h); c.fillRect(w * 0.7 - 14, h * 0.25, 18, 3);
      const lg = c.createRadialGradient(w * 0.7 - 12, h * 0.3, 1, w * 0.7 - 12, h * 0.3, 60); lg.addColorStop(0, 'rgba(255,200,120,1)'); lg.addColorStop(0.2, 'rgba(255,160,70,0.5)'); lg.addColorStop(1, 'rgba(255,140,60,0)'); c.fillStyle = lg; c.fillRect(0, 0, w, h);
      // rain streaks on the glass
      c.strokeStyle = 'rgba(200,210,255,0.25)'; c.lineWidth = 1; for (let i = 0; i < 60; i++) { const x = Math.random() * w, y = Math.random() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y + 8 + Math.random() * 14); c.stroke(); }
      // window bars
      c.fillStyle = '#16121e'; for (let x = 0; x <= w; x += 128) c.fillRect(x - 4, 0, 8, h); c.fillRect(0, 0, w, 6); c.fillRect(0, h - 6, w, 6);
    });
    for (const x of [-7, 5]) {
      const win = new T.Mesh(new T.PlaneGeometry(7, 1.4), K3D.flat(hot('#ffffff', 1.1), { map: winTex })); win.position.copy(at(x, 2.75, -5.18)); K.add(win);
      // the orange light falling in, across the cabinets onto the carpet
      ARCADE.shaft(K, at(x + 1.5, 2.9, -5.1).toArray(), at(x - 0.5, 0, 0.5).toArray(), 1.0, '#ff9a50', 0.14);
      sc.lamps.add(at(x + 1, 2.4, -3.8), '#ff9a50', 1.6, 9);
    }
    // the shop's own sign, seen backwards through the glass from inside
    const ns = ARCADE.neon(K, 'ARCADE', { w: 2.4, h: 0.7, col: '#ff5ad6', col2: '#4ae8ff' }); ns.position.copy(at(-5.4, 2.75, -5.12)); ns.scale.x = -1; ns.rotation.y = 0; K.add(ns);
    sc.G.add(...at(-5.4, 2.75, -5).toArray(), 1.4, '#ff5ad6', 0.2, 0);
    // EXIT over the side door, glowing green; the door with its bar
    const exitT = K3D.paint('op-exit', 128, 48, (c, w, h) => { c.fillStyle = '#0a2a14'; c.fillRect(0, 0, w, h); c.fillStyle = '#5aff8a'; c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('EXIT', w / 2, h / 2 + 2); });
    const ex = new T.Mesh(new T.PlaneGeometry(0.6, 0.22), K3D.flat(hot('#ffffff', 1.6), { map: exitT })); ex.position.copy(at(12.35, 2.5, 2)); ex.rotation.y = -Math.PI / 2; K.add(ex);
    sc.G.add(...at(12.2, 2.5, 2).toArray(), 1.4, '#5aff8a', 0.35, 0); sc.lamps.add(at(11.6, 2.3, 2), '#5aff8a', 1.0, 6);
    const sdoor = mk(new T.BoxGeometry(0.08, 2.1, 1.0), toon('#3a3a48'), 0.5); sdoor.position.copy(at(12.36, 1.05, 2)); K.add(sdoor);
    const bar = mk(new T.BoxGeometry(0.06, 0.06, 0.8), toon('#b8b8c0'), 0.3); bar.position.copy(at(12.28, 1.0, 2)); K.add(bar);
    // ceiling lights (off for the night), one tube still flickering faintly
    for (const [x, z] of [[-6, -2], [0, -2], [6, -2], [-6, 3], [0, 3], [6, 3]]) {
      const fx = mk(K3D.geo('op-fix', () => new T.BoxGeometry(1.4, 0.08, 0.36)), K3D.mat('op-fixM', () => toon('#8a8a98')), 0.4); fx.position.copy(at(x, 3.56, z)); K.add(fx);
      const tb = new T.Mesh(K3D.geo('op-tube', () => new T.PlaneGeometry(1.3, 0.26).rotateX(Math.PI / 2)), K3D.flat(hot('#c8d8ff', x === 6 && z === 3 ? 0.6 : 0.12))); tb.position.copy(at(x, 3.51, z)); K.add(tb);
      if (x === 6 && z === 3) op.tube = tb;
    }

    // the sleeping cabinets: a row along the back, rows along both sides
    let k = 0;
    const cabs = [];
    for (const x of [-9.5, -7.8, -6.1, -4.4, -2.7, 2.7, 4.4, 6.1, 7.8]) cabs.push({ x, z: -4.6, yaw: 0 });
    for (const z of [-2.5, -0.8, 0.9, 2.6, 4.3]) cabs.push({ x: -11.8, z, yaw: Math.PI / 2 });
    for (const z of [-3.2, -1.5]) cabs.push({ x: 11.8, z, yaw: -Math.PI / 2 });
    for (const c of cabs) { const col = ARCADE.NEON[k % 8], lit = k % 4 === 1; cabinet(K, op, Object.assign({ col, title: TITLES[k % TITLES.length], lit, k, glow: lit }, c)); k++; }
    // THE machine: COIN DROP, pulled out a little from the row, glowing, PLAY ME taped to it
    const hm = cabinet(K, op, { x: 0, z: -3.0, yaw: 0, col: '#ffd24a', title: 'COIN DROP', hero: true, screenMat: heroScreen(op) });
    op.hero = hm;
    // its T-molding glows yellow round the side edges
    for (const sx of [-1, 1]) {
      const pts = [[-0.42, 0], [0.38, 0], [0.38, 0.86], [0.5, 0.9], [0.5, 0.98], [0.28, 1.04], [0.14, 1.58], [0.22, 1.62], [0.22, 1.94], [-0.42, 1.94]].map(([z, y]) => new T.Vector3(sx * 0.435, y, z));
      const tm = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.05), 80, 0.012, 5), K3D.flat(hot('#ffd24a', 2.0))); hm.add(tm);
    }
    const note = ARCADE.decal(K, 'note', 0.32, 0.22, { seed: 3, text: 'PLAY ME!' }); note.position.set(0.24, 1.68, 0.235); note.rotation.z = -0.18; hm.add(note);
    const tape = new T.Mesh(new T.PlaneGeometry(0.1, 0.03), toon('#f0e8c8', { transparent: true, opacity: 0.8 })); tape.position.set(0.3, 1.78, 0.237); tape.rotation.z = 0.3; hm.add(tape);
    hm.updateMatrixWorld(true);
    op.slotW = [hm.localToWorld(new T.Vector3(-0.09, 0.64, 0.41)), hm.localToWorld(new T.Vector3(0.09, 0.64, 0.41))];
    op.scrW = hm.localToWorld(new T.Vector3(0, 1.31, 0.3));
    sc.lamps.add(hm.localToWorld(new T.Vector3(0, 1.3, 0.9)), '#ffe2a0', 2.2, 7, { fn: t => op.scrK || 1 });
    sc.lamps.add(hm.localToWorld(new T.Vector3(0, 0.7, 0.8)), '#ff4a3a', 0.6, 3);
    sc.G.add(op.scrW.x, op.scrW.y, op.scrW.z, 0.9, '#fff0c0', 0.2, 0.1);

    // the rest of the arcade: a claw machine full of plush, a pinball table, the prize counter, a change machine,
    // a high score board, a bin and a mop bucket, a bench, a lost cup, tickets on the floor
    {
      const g = new T.Group(); g.position.copy(at(10.6, 0, 4.6)); g.rotation.y = -Math.PI / 2; K.add(g);
      const base = mk(new T.BoxGeometry(1.2, 0.9, 1.2), toon('#ff5ad6', { emissive: '#ff5ad6', emissiveIntensity: 0.2 }), 0.7); base.position.y = 0.45; g.add(base);
      const glass = new T.Mesh(new T.BoxGeometry(1.14, 1.1, 1.14), toon('#a8c8ff', { transparent: true, opacity: 0.18, depthWrite: false })); glass.position.y = 1.45; g.add(glass);
      const top = mk(new T.BoxGeometry(1.24, 0.3, 1.24), toon('#ff5ad6', { emissive: '#ff5ad6', emissiveIntensity: 0.4 }), 0.7); top.position.y = 2.15; g.add(top);
      for (let i = 0; i < 22; i++) { const p = new T.Mesh(K3D.geo('op-plush', () => new T.SphereGeometry(0.12, 10, 8)), K3D.mat('op-plush|' + i % 6, () => toon(['#ffb0c8', '#a8e8ff', '#ffe8a0', '#b8ffb8', '#d8c0ff', '#ffc890'][i % 6]))); p.position.set((rnd() - 0.5) * 0.9, 0.98 + rnd() * 0.22, (rnd() - 0.5) * 0.9); g.add(p); }
      const claw = mk(new T.ConeGeometry(0.08, 0.16, 6), toon('#d8d8e0'), 0.3); claw.position.set(0.2, 1.75, 0.1); claw.rotation.x = Math.PI; g.add(claw);
      sc.G.add(...g.localToWorld(new T.Vector3(0, 1.4, 0)).toArray(), 1.2, '#ff5ad6', 0.14, 0);
    }
    {
      const g = new T.Group(); g.position.copy(at(10.6, 0, -0.2)); g.rotation.y = -Math.PI / 2; K.add(g);
      const tbl = mk(new T.BoxGeometry(0.75, 0.24, 1.5).rotateX(-0.12), toon('#2a3a8a', { emissive: '#4a8aff', emissiveIntensity: 0.25 }), 0.6); tbl.position.set(0, 0.95, 0); g.add(tbl);
      for (const [x, z] of [[-0.3, -0.65], [0.3, -0.65], [-0.3, 0.65], [0.3, 0.65]]) { const l = mk(K3D.geo('op-pleg', () => new T.BoxGeometry(0.06, 0.9, 0.06)), K3D.mat('op-plegM', () => toon('#b8b8c0')), 0.3); l.position.set(x, 0.45, z); g.add(l); }
      const back = mk(new T.BoxGeometry(0.75, 0.8, 0.12), toon('#1a1a3a'), 0.6); back.position.set(0, 1.5, -0.78); g.add(back);
      const bb = new T.Mesh(new T.PlaneGeometry(0.66, 0.6), K3D.flat(hot('#ffffff', 0.7), { map: marqueeTex('BUMPER BAY', '#4ae8ff', true) })); bb.position.set(0, 1.5, -0.715); g.add(bb);
      sc.G.add(...g.localToWorld(new T.Vector3(0, 1.1, 0)).toArray(), 1.0, '#4a8aff', 0.12, 0);
    }
    {
      // the prize counter along the right of the back wall
      const g = new T.Group(); g.position.copy(at(10.3, 0, -4.6)); K.add(g);
      const ctr = mk(new T.BoxGeometry(3.4, 1.0, 0.7), toon('#3a2a4a'), 0.7); ctr.position.y = 0.5; ctr.position.x = -1.0; g.add(ctr);
      const gl = new T.Mesh(new T.BoxGeometry(3.3, 0.5, 0.6), toon('#c8e0ff', { transparent: true, opacity: 0.2, depthWrite: false })); gl.position.set(-1.0, 1.25, 0); g.add(gl);
      for (let i = 0; i < 14; i++) { const p = new T.Mesh(K3D.geo('op-prize', () => new T.BoxGeometry(0.14, 0.14, 0.14)), K3D.mat('op-prize|' + i % 5, () => toon(ARCADE.NEON[i % 5]))); p.position.set(-2.5 + i * 0.22, 1.08, (rnd() - 0.5) * 0.3); p.rotation.y = rnd() * 3; g.add(p); }
      const sh = mk(new T.BoxGeometry(3.4, 0.05, 0.4), toon('#5a4a6a'), 0.4); sh.position.set(-1.0, 2.2, -0.35); g.add(sh);
      for (let i = 0; i < 9; i++) { const p = new T.Mesh(K3D.geo('op-bear', () => new T.SphereGeometry(0.16, 10, 8)), K3D.mat('op-plush|' + i % 6, () => toon(['#ffb0c8', '#a8e8ff', '#ffe8a0', '#b8ffb8', '#d8c0ff', '#ffc890'][i % 6]))); p.position.set(-2.4 + i * 0.36, 2.38, -0.35); g.add(p); }
      const sign = ARCADE.neon(K, 'PRIZES', { w: 1.4, h: 0.4, col: '#ffe24a', col2: '#ff5ad6' }); sign.position.set(-1.0, 2.9, -0.5); g.add(sign);
    }
    {
      // the change machine by the side door, its lit panel
      const g = mk(new T.BoxGeometry(0.7, 1.7, 0.5), toon('#8a8a98', { map: ARCADE.grimeTex() }), 0.7); g.position.copy(at(11.95, 0.85, 3.6)); g.rotation.y = -Math.PI / 2; K.add(g);
      const pt = K3D.paint('op-change', 128, 64, (c, w, h) => { c.fillStyle = '#ffe24a'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a1a10'; c.font = 'bold 26px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CHANGE', w / 2, h / 2); });
      const pn = new T.Mesh(new T.PlaneGeometry(0.5, 0.25), K3D.flat(hot('#ffffff', 1.3), { map: pt })); pn.position.set(0, 0.55, 0.26); g.add(pn);
    }
    {
      // the high score board on the left wall: made-up initials
      const t2 = K3D.paint('op-scores', 256, 320, (c, w, h) => {
        c.fillStyle = '#0a0a18'; c.fillRect(0, 0, w, h); c.strokeStyle = '#4ae8ff'; c.lineWidth = 4; c.strokeRect(4, 4, w - 8, h - 8);
        c.font = 'bold 26px monospace'; c.textAlign = 'center'; c.fillStyle = '#ffe24a'; c.fillText('HIGH SCORES', w / 2, 40);
        c.font = 'bold 22px monospace'; c.textAlign = 'left';
        [['ZAP', 98760], ['MOM', 87110], ['ACE', 76500], ['DAD', 64200], ['???', 50000], ['LOL', 42420], ['GUS', 31000], ['YAY', 12345]].forEach(([n, s], i) => { c.fillStyle = ['#ff5ad6', '#4ae8ff', '#5aff8a', '#ffe24a'][i % 4]; c.fillText((i + 1) + '. ' + n + '  ' + String(s).padStart(6, '0'), 22, 82 + i * 28); });
      });
      const b = new T.Mesh(new T.PlaneGeometry(1.0, 1.25), K3D.flat(hot('#ffffff', 0.9), { map: t2 })); b.position.copy(at(-12.35, 2.2, 1.8)); b.rotation.y = Math.PI / 2; K.add(b);
    }
    {
      // a bin with a cup, a mop and bucket, a bench, a forgotten soda on a cabinet, tickets trailing over the carpet
      const bin = mk(new T.CylinderGeometry(0.22, 0.18, 0.6, 14, 1, true), toon('#3a3a48', { side: T.DoubleSide }), 0.5); bin.position.copy(at(1.6, 0.3, -3.8)); K.add(bin);
      const cup = mk(new T.CylinderGeometry(0.05, 0.04, 0.14, 10), toon('#ff5a4a'), 0.3); cup.position.copy(at(1.62, 0.66, -3.8)); cup.rotation.z = 0.5; K.add(cup);
      const bk = mk(new T.CylinderGeometry(0.2, 0.16, 0.32, 14), toon('#ffd23a'), 0.5); bk.position.copy(at(-10.6, 0.16, 6.2)); K.add(bk);
      const mop = mk(new T.CylinderGeometry(0.02, 0.02, 1.5, 6), toon('#c8a878'), 0.3); mop.position.copy(at(-10.5, 0.8, 6.1)); mop.rotation.z = 0.3; K.add(mop);
      const bench = mk(new T.BoxGeometry(1.6, 0.08, 0.45), toon('#6a4a3a'), 0.5); bench.position.copy(at(-3, 0.45, 5.5)); K.add(bench);
      for (const x of [-3.7, -2.3]) { const l = mk(new T.BoxGeometry(0.06, 0.45, 0.4), toon('#3a3a48'), 0.3); l.position.copy(at(x, 0.22, 5.5)); K.add(l); }
      const soda = mk(new T.CylinderGeometry(0.04, 0.04, 0.12, 10), toon('#4ae8ff'), 0.3); soda.position.copy(at(-4.25, 1.95 + 0.06, -4.7)); K.add(soda);
      const tk = K3D.paint('op-tickets', 64, 256, (c, w, h) => { c.fillStyle = '#ff8ac0'; c.fillRect(0, 0, w, h); c.fillStyle = '#c8406a'; for (let y = 0; y < h; y += 32) { c.fillRect(0, y, w, 2); c.font = 'bold 14px monospace'; c.fillText('ADMIT', 8, y + 20); } });
      const tks = new T.Mesh(new T.PlaneGeometry(0.12, 1.6).rotateX(-Math.PI / 2), toon('#ffffff', { map: tk })); tks.position.copy(at(2.2, 0.006, 0.8)); tks.rotation.y = 0.7; K.add(tks);
      const gum = mk(new T.SphereGeometry(0.04, 8, 6).scale(1, 0.3, 1), toon('#ff8ab8'), 0.2); gum.position.copy(at(-1.2, 0.005, 1.6)); K.add(gum);
    }
    // dust in the street lamp's light
    for (let i = 0; i < 40; i++) sc.G.add(...at(-8 + rnd() * 16, 0.5 + rnd() * 2.6, -4 + rnd() * 5).toArray(), 0.04 + rnd() * 0.04, '#ffc890', 0.5, 0.6);
  }

  /* ---------- Pip and Bo in the arcade, and on their coins inside ---------- */
  function heroes(K, op) {
    const C = ARCADECOIN_COINS;
    op.out = [0, 1].map(k => {
      const w = new T.Group(); w.userData.live = true; K.add(w);
      const h = K3D.hero(k); w.add(h); K3D.dress(h, 'arcadecoin'); C.faces(h);
      const coin = C.coinMesh(k); coin.scale.setScalar(0.06 / C.RAD); coin.rotation.x = Math.PI / 2; coin.userData.live = true; coin.visible = false; K.add(coin);
      return { w, h, coin };
    });
    op.inn = [0, 1].map(k => {
      const g = new T.Group(); g.userData.live = true; K.add(g);
      const spin = new T.Group(); g.add(spin);
      const token = C.coinMesh(k); spin.add(token);
      const h = K3D.hero(k); spin.add(h); K3D.dress(h, 'arcadecoin'); C.faces(h);
      const m = h.userData.body.material; m.emissive = new T.Color(PCOL[k]); m.emissiveIntensity = 0.18;
      const light = new T.PointLight(C.LOOK[k].edge, 1.6, 9, 1.6); g.add(light);
      return { g, spin, token, h, light };
    });
    // the whirl of pixels round them as they are sucked in (soft glows, moved each frame)
    op.whirl = []; for (let i = 0; i < 70; i++) op.whirl.push(op.sc.G.add(0, -9999, 0, 0.06, ARCADE.NEON[i % 8], 1.2, 0));
    // the trail of light behind each coin as it falls
    op.trail = []; for (let i = 0; i < 40; i++) op.trail.push(op.sc.G.add(0, -9999, 0, 0.14, i % 2 ? '#7ab8ff' : '#ffb070', 0.5, 0));
  }

  function build(K, sc) {
    const op = { K, sc, t: 0, later: [], snapNext: true, focus: O.clone(), cut: -1 };
    room(K, op);
    op.later.forEach(f => f()); op.later = null;
    heroes(K, op);
    // the inside: the slot on the coin door, and where the coins come down on the chute
    op.slotIn = sc.s1 && sc.s1.slot ? sc.s1.slot.sp.clone() : new T.Vector3(6, 42, 54.5);
    return op;
  }

  /* ---------- the timeline ---------- */
  const STAND = [new T.Vector3(-0.56, 0, -1.95), new T.Vector3(0.56, 0, -1.95)], START = [new T.Vector3(-2.6, 0, 3.6), new T.Vector3(2.2, 0, 4.4)];
  const INS_T = [3.5, 4.0];
  const tmp = new T.Vector3(), tmp2 = new T.Vector3(), qq = new T.Quaternion(), m4 = new T.Matrix4();
  // the inside fall: from the slot to the chute's start (a curve out and down, faster and faster)
  function fallPos(op, st, k, u) {
    const p0 = op.slotIn.clone().add(new T.Vector3(k ? -1.8 : 1.8, 0, -0.8));
    const p2 = vv(R.bankLocal(0, st.c[k].x, 1.0));
    const p1 = p2.clone().add(new T.Vector3(0, 16, 10));
    const a = p0.clone().lerp(p1, u), b = p1.clone().lerp(p2, u);
    return a.lerp(b, u);
  }
  const fallU = t => { const x = Math.max(0, Math.min(1, (t - TM.inside) / (TM.end - TM.inside))); return 0.45 * x + 0.55 * x * x; };

  function update(K, op, st, dt) {
    const t = st.phaseT, intro = st.phase === 'intro';
    op.t += dt;
    const inRoom = intro && t < TM.white + 0.15, inside = intro && t >= TM.inside - 0.05;
    // which shot are we in (a cut tells the camera to jump)
    const cut = !intro ? -1 : t < TM.walk ? 0 : t < TM.ins ? 1 : t < TM.white ? 2 : t < TM.inside + 1.7 ? 3 : 4;
    if (cut !== op.cut) { if (cut >= 0 && cut !== 4) op.snapNext = true; op.cut = cut; }
    // the room's heroes
    op.out.forEach((H, k) => {
      H.w.visible = inRoom; H.coin.visible = false;
      if (!inRoom) return;
      const wu = sm(0.2 + k * 0.25, TM.walk - 0.3 + k * 0.1, t), p = START[k].clone().lerp(STAND[k], wu);
      let sc = 1, vy = 0, mood = null, hands = null, look = 0;
      // walking up, then a coin each
      const ti = INS_T[k];
      if (t > ti - 0.5 && t < ti + 0.15) {
        const hw = op.slotW[k];
        hands = k ? [null, hw] : [hw, null];
        if (t < ti) { const u = (t - (ti - 0.5)) / 0.5; H.coin.visible = true; const from = O.clone().add(p).add(new T.Vector3(k ? 0.3 : -0.3, 0.55, 0.15)); H.coin.position.copy(from.lerp(hw, sm(0, 1, u))); H.coin.position.y += Math.sin(u * Math.PI) * 0.15; H.coin.rotation.z = u * 9; }
      }
      // the flash: they're sucked in, shrinking and spinning, into the slots
      let spin = 0;
      if (t > TM.ins) {
        const u = sm(TM.ins + 0.2, TM.white - 0.1, t);
        mood = 'whoa';
        tmp.copy(O).add(p).lerp(op.slotW[k], u * u);
        H.w.position.copy(tmp); sc = Math.max(0.02, 1 - u * 1.1); spin = u * u * 18 * (k ? -1 : 1);
        vy = 2;
      } else H.w.position.copy(O).add(p);
      H.w.scale.setScalar(sc);
      H.w.rotation.set(0, spin, 0);
      const walking = wu > 0 && wu < 1 && t < TM.walk;
      K3D.heroPose(H.h, { x: 0, y: 0, z: 0, heading: walking ? Math.atan2(STAND[k].x - START[k].x, STAND[k].z - START[k].z) : Math.PI, speed: walking ? 0.6 : 0, vy, hands, mood, lookX: look }, dt);
      const mo = H.h.userData.mouth; if (mo) { const oh = t > TM.ins - 0.4; mo.grin.visible = !oh; mo.oh.visible = oh; mo.flat.visible = false; }
    });
    // the machine's picture and its light
    if (inRoom) { drawScreen(op, t); op.scrK = t > TM.ins ? 1 + sm(TM.ins, TM.white, t) * 4 : t > 4.05 ? 1.6 : 1; }
    if (op.tube) op.tube.material.color.copy(hot('#c8d8ff', Math.sin(op.t * 31) > 0.7 ? 0.15 : 0.6));
    // the whirl of pixels
    op.whirl.forEach((gi, i) => {
      if (!inRoom || t < TM.ins) { op.sc.G.set(gi, 0, -9999, 0, 0); return; }
      const u = sm(TM.ins, TM.white, t), a = i * 0.9 + t * (4 + i % 5), r = (0.9 - u * 0.7) * (0.4 + (i % 7) * 0.12), c = op.slotW[i % 2].clone().lerp(op.scrW, 0.4 - u * 0.4);
      op.sc.G.set(gi, c.x + Math.cos(a) * r, c.y + Math.sin(a * 1.3) * r * 0.6, c.z + Math.sin(a) * r * 0.5 + 0.2, 0.018 + (i % 3) * 0.008);
    });
    // inside: the two coins come out of the slot and fall to the chute
    op.inn.forEach((I, k) => {
      I.g.visible = inside;
      if (!inside) { I.light.intensity = 0; return; }
      const u = fallU(t), p = fallPos(op, st, k, u);
      I.g.position.copy(p);
      // tumbling at first, then righting themselves (lined up with the chute) for the landing
      const settle = sm(TM.inside + 1.6, TM.inside + 3.6, t), tum = (1 - settle);
      m4.makeBasis(vv(R.at(0).br), vv(R.at(0).bu), vv(R.at(0).t).negate()); qq.setFromRotationMatrix(m4);
      I.g.quaternion.copy(qq);
      I.spin.rotation.set(tum * (t * 5 + k), tum * t * 2, tum * Math.sin(t * 3 + k) * 1.2);
      I.h.position.y = ARCADECOIN_COINS.TH / 2;
      K3D.heroPose(I.h, { x: 0, y: ARCADECOIN_COINS.TH / 2 + (settle > 0.5 ? 0 : 0.15), z: 0, heading: k ? -0.6 : 0.6, speed: 0, vy: -3, mood: settle < 0.6 ? 'whoa' : null, hands: null }, dt);
      const mo = I.h.userData.mouth; if (mo) { mo.oh.visible = settle < 0.7; mo.grin.visible = settle >= 0.7; mo.flat.visible = false; }
      I.token.rotation.y += dt * 2;
      I.light.intensity = 1.6;
    });
    // the trail of sparkles behind the falling coins
    op.trail.forEach((gi, i) => {
      if (!inside) { op.sc.G.set(gi, 0, -9999, 0, 0); return; }
      const k = i % 2, back = (i >> 1) * 0.012, u = Math.max(0, fallU(t) - back), p = fallPos(op, st, k, u);
      op.sc.G.set(gi, p.x + Math.sin(i * 7.1 + t * 9) * 0.25, p.y + Math.cos(i * 3.3 + t * 7) * 0.25, p.z, 0.14 * (1 - (i >> 1) / 20));
    });
    // where the lamps gather
    if (inRoom) op.focus.copy(O).add(new T.Vector3(0, 1, -2)); else if (inside) op.focus.copy(op.inn[0].g.position).lerp(op.inn[1].g.position, 0.5);
  }

  /* ---------- the camera ---------- */
  function shot(K, op, st) {
    const t = st.phaseT, at = (x, y, z) => [O.x + x, O.y + y, O.z + z];
    if (t < TM.walk) {
      // a slow push across the sleeping arcade toward the one glowing machine
      const u = sm(0, TM.walk, t);
      return { eye: at(lerp(4.2, 1.6, u), lerp(2.6, 1.7, u), lerp(7.5, 2.4, u)), at: at(lerp(0.6, 0, u), lerp(1.4, 1.1, u), -3), up: [0, 1, 0], fov: 52 };
    }
    if (t < TM.ins) {
      // close on the coin door from low at the side: the coins go in, the screen wakes above
      const u = sm(TM.walk, TM.ins, t);
      return { eye: at(lerp(0.05, 0, u), lerp(0.6, 0.72, u), lerp(-1.0, -0.9, u)), at: at(0, lerp(0.75, 1.05, u), -2.6), up: [0, 1, 0], fov: 58 };
    }
    if (t < TM.white + 0.3) {
      // behind them as they're pulled in, then diving into the slot
      const u = sm(TM.ins, TM.white + 0.2, t);
      const s = op.slotW[0].clone().lerp(op.slotW[1], 0.5);
      const e = new T.Vector3(O.x, O.y + 0.9, O.z - 0.7).lerp(s.clone().add(new T.Vector3(0, 0, 0.05)), u * u);
      return { eye: e.toArray(), at: s.toArray(), up: [0, 1, 0], fov: lerp(54, 30, u) };
    }
    const ip = op.inn[0].g.position.clone().lerp(op.inn[1].g.position, 0.5), sp = op.slotIn;
    if (t < TM.inside + 1.7) {
      // just below the slot looking up at it: the blaze, and the coins bursting out toward us
      return { eye: [ip.x - 7, ip.y - 3, ip.z - 11], at: [lerp(sp.x, ip.x, 0.75), lerp(sp.y, ip.y, 0.75), lerp(sp.z, ip.z, 0.75)], up: [0, 1, 0], fov: 52 };
    }
    // chase them down, easing into the play camera for the landing
    const s0 = R.at(0), back = vv(s0.t).negate();
    const chase = { eye: ip.clone().addScaledVector(back, 5.5).add(new T.Vector3(0, 2.6, 0)).toArray(), at: ip.clone().addScaledVector(vv(s0.t), 10).add(new T.Vector3(0, -2, 0)).toArray() };
    const play = ARCADECOIN_SCENE.shotFor(st), u = sm(TM.end - 2.4, TM.end - 0.2, t);
    const mix = (a, b) => a.map((v, i) => lerp(v, b[i], u));
    return { eye: mix(chase.eye, play.eye), at: mix(chase.at, play.at), up: [0, 1, 0], fov: lerp(58, play.fov || 56, u) };
  }

  /* ---------- flat things over the picture ---------- */
  function drawTop(op, st) {
    const t = st.phaseT;
    // the white flash as they go through the slot
    const wf = Math.max(0, 1 - Math.abs(t - (TM.white + 0.1)) / 0.45);
    if (wf > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, wf * 1.4); ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    // the controls while they fall
    const ca = Math.min(sm(TM.inside + 0.6, TM.inside + 1.2, t), 1 - sm(TM.end - 0.5, TM.end - 0.05, t));
    if (ca > 0.01) {
      ctx.save(); ctx.globalAlpha = ca;
      text('Ride your own coin!', W / 2, 62, 30, '#fff6dc', 'center');
      text('Stay close: the spark between you scoops up coins.', W / 2, 94, 18, '#ffe08a', 'center');
      for (const k of [0, 1]) {
        if (typeof isCpuPlayer === 'function' && isCpuPlayer(k)) continue;
        const x = k ? W - 190 : 40, y = H - 118;
        ctx.fillStyle = 'rgba(12,10,20,0.72)'; rr(x, y, 150, 86, 12); ctx.fill();
        ctx.strokeStyle = k ? '#5aa8ff' : '#ff8a4a'; ctx.lineWidth = 2; rr(x, y, 150, 86, 12); ctx.stroke();
        text(NAMES[k], x + 75, y + 18, 20, k ? '#8ac0ff' : '#ffb08a', 'center');
        const bw = drawBtn(k, 'left', x + 14, y + 46, { size: 22, align: 'left' });
        drawBtn(k, 'right', x + 18 + bw, y + 46, { size: 22, align: 'left', label: 'steer' });
        drawBtn(k, 'hop', x + 14, y + 72, { size: 22, align: 'left', label: 'jump' });
      }
      ctx.restore();
    }
    if (st.seen && t > 0.6 && t < TM.end - 1) { ctx.save(); ctx.globalAlpha = 0.6; text('Jump to skip', W - 16, H - 14, 14, '#ffffff', 'right'); ctx.restore(); }
  }

  return { build, update, shot, drawTop, O, TM };
})();
