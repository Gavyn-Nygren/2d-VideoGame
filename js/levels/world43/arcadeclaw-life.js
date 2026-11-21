/* Pip & Bo - 43-3 Claw Machine Rescue: the life on the mountain. Loaded on demand with the 3D kit (before the scene).
   Scenery only: never read by the rules.

   Not every pixel creature got caught: the ones who hid have made the claw machine their home while they wait for help,
   and each corner of The Foothills has a little story going on (all off the route, on heap tops and ledges Bo passes):
     the base camp by the start (a handkerchief tent, a glow-stick campfire, a sock sleeping bag, a creature toasting a
     sweet), two map readers pointing up the mountain, the lookout with a crayon telescope on the giant plush whale, a
     creature asleep in a sweet-wrapper hammock, peekers in the corridor's walls, a fisher dangling a line into the gap,
     builders stacking a HELP tower of letter blocks, a dance party round a glowing snow globe, a creature waving a HELP
     ticket, a tea party on a dice table, window washers polishing the side glass, a creature taping a note to the glass
     front, and lost things at hero size (a foreign coin, a paper clip, a hair clip).
   ARCADECLAW_LIFE.build(K, SC, st) -> { crit, update(st, dt, t) } */
'use strict';

const ARCADECLAW_LIFE = (function () {
  const T = K3D.T, A = ARCADE, TY = ARCADECLAW_TOYS, MP = ARCADECLAW_MAP, P = Math.PI;
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const M = (k, make) => K3D.mat('acl|' + k, make);
  const V = (x, y, z) => new T.Vector3(x, y, z);

  // one prize as a prop: kind, where, how big, which way
  function prop(K, kind, x, y, z, s = 1, o = {}) {
    const g = TY.build(kind, { pal: o.pal || 0, inkW: o.inkW || 1 });
    g.scale.setScalar(s); if (o.sx) g.scale.x *= o.sx; if (o.sy) g.scale.y *= o.sy; if (o.sz) g.scale.z *= o.sz;
    g.position.set(x, y, z); g.rotation.set(o.tilt || 0, o.yaw || 0, o.roll || 0, 'YXZ');
    if (o.live) g.userData.live = true;
    (o.parent || K.root).add(g);
    return g;
  }
  const letterTex = (ch, col) => K3D.paint('acl-letter|' + ch + col, 128, 128, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.strokeStyle = col; c.lineWidth = 10; c.strokeRect(8, 8, w - 16, h - 16); c.fillStyle = col; c.font = 'bold 84px sans-serif'; c.textAlign = 'center'; c.fillText(ch, w / 2, h / 2 + 30); });
  function letterBlock(K, ch, col, x, y, z, s, yaw) {
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = yaw;
    const b = K3D.mesh(K3D.geo('acl-block', () => K3D.roundBox(1, 1, 1, 0.25, 14)), M('blockSide|' + col, () => K3D.toon(col)), { ink: A.INK, inkW: 0.8 }); b.scale.setScalar(s); g.add(b);
    for (const [px, pz, ry] of [[0, 0.505, 0], [0.505, 0, P / 2], [0, -0.505, P], [-0.505, 0, -P / 2]]) { const f = new T.Mesh(K3D.geo('acl-plane', () => new T.PlaneGeometry(1, 1)), M('letter|' + ch + col, () => K3D.toon('#ffffff', { map: letterTex(ch, col) }))); f.scale.setScalar(s * 0.78); f.position.set(px * s, s * 0.5, pz * s); f.rotation.y = ry; g.add(f); }
    K.add(g); return g;
  }
  const signTex = (text, bg, fg) => K3D.paint('acl-sign|' + text + bg, 256, 128, (c, w, h) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); for (let y = 8; y < h; y += 16) { c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(5, y, 4, 0, P * 2); c.fill(); c.beginPath(); c.arc(w - 5, y, 4, 0, P * 2); c.fill(); } c.fillStyle = fg; c.font = 'bold 60px "Comic Sans MS", cursive, sans-serif'; c.textAlign = 'center'; c.save(); c.translate(w / 2, h / 2 + 20); c.rotate(-0.06); c.fillText(text, 0, 0); c.restore(); });
  const mapTex = () => K3D.paint('acl-map', 256, 192, (c, w, h) => {
    c.fillStyle = '#f2e2b8'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(120,80,40,0.4)'; c.lineWidth = 2; c.strokeRect(6, 6, w - 12, h - 12);
    // a hand-drawn map of the mountain: a dotted path up to an X at the chute
    c.strokeStyle = '#6a4a2a'; c.lineWidth = 3; c.beginPath(); c.moveTo(20, h - 20); c.lineTo(w / 2 - 30, h / 2 + 30); c.lineTo(w / 2 + 50, h / 2); c.lineTo(w - 40, 34); c.stroke();
    c.fillStyle = '#6a4a2a'; for (let i = 0; i < 14; i++) { c.beginPath(); c.arc(30 + i * 15, h - 30 - i * 10 + Math.sin(i) * 6, 2.5, 0, P * 2); c.fill(); }
    c.strokeStyle = '#c8322a'; c.lineWidth = 6; c.beginPath(); c.moveTo(w - 50, 22); c.lineTo(w - 26, 46); c.moveTo(w - 26, 22); c.lineTo(w - 50, 46); c.stroke();
    c.fillStyle = '#3a2a1a'; c.font = 'bold 16px cursive, serif'; c.fillText('WAY OUT?', w - 110, 70); c.fillText('snatcher!!', 40, 40);
    c.beginPath(); c.arc(70, 52, 12, 0, P * 2); c.fillStyle = '#c8322a'; c.fill();
  });
  const noteTex = () => K3D.paint('acl-note', 256, 256, (c, w, h) => { c.fillStyle = '#fff4a8'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a3a8a'; c.font = 'bold 54px "Comic Sans MS", cursive, sans-serif'; c.textAlign = 'center'; c.fillText('HELP!', w / 2, 100); c.font = 'bold 30px cursive, sans-serif'; c.fillText('we are', w / 2, 150); c.fillText('in here', w / 2, 190); c.fillStyle = 'rgba(200,190,170,0.7)'; c.fillRect(w / 2 - 50, -6, 100, 26); });

  function build(K, SC, st) {
    const crit = A.critters(K, 160), G2 = SC.glows;
    const live = [];
    const C = (x, y, z, o) => crit.add(x, y, z, Object.assign({ s: 1.15 }, o));

    /* 1. the base camp on the left heap by the start */
    {
      const cx = -10.4, cy = 1.0, cz = 3.2;
      // a handkerchief tent over a crayon ridge pole
      const tent = new T.Group(); tent.position.set(cx - 1.6, cy, cz + 1.8); tent.rotation.y = 0.5; K.add(tent);
      const cloth = M('tentCloth', () => K3D.toon('#ffffff', { side: T.DoubleSide, map: K3D.paint('acl-hanky', 128, 128, (c, w, h) => { c.fillStyle = '#e84a6a'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; for (let i = 0; i < w; i += 32) { c.fillRect(i, 0, 12, h); c.fillRect(0, i, w, 12); } c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(0, 0, w, 6); }) }));
      for (const sd of [-1, 1]) { const pl = K3D.mesh(new T.PlaneGeometry(2.6, 1.7), cloth, { ink: A.INK, inkW: 0.7 }); pl.position.set(0, 0.62, sd * 0.55); pl.rotation.x = sd * 0.72; tent.add(pl); }
      prop(K, 'crayon', 0, 1.25, -1.5, 1.0, { tilt: P / 2, parent: tent, pal: 2 });
      // the glow-stick campfire: three sticks crossed, flickering glows, a ring of sweets for stones
      const fire = new T.Group(); fire.position.set(cx, cy + 0.05, cz); K.add(fire);
      const stickCols = ['#5aff8a', '#ff5ad6', '#ffe24a'];
      stickCols.forEach((sc, i) => { const s = new T.Mesh(new T.CapsuleGeometry(0.06, 0.6, 4, 8), K3D.flat(hot(sc, 1.5))); s.position.y = 0.2; s.rotation.set(0.9, i * P * 2 / 3, 0); fire.add(s); });
      for (let i = 0; i < 7; i++) { const a = i / 7 * P * 2; prop(K, 'sweet', cx + Math.cos(a) * 0.55, cy, cz + Math.sin(a) * 0.55, 0.32, { yaw: a, pal: i, parent: K.root }); }
      const fg = [G2.add(cx, cy + 0.5, cz, 1.2, '#ffb060', 0.3, 0.9), G2.add(cx, cy + 0.35, cz, 0.7, '#5aff8a', 0.45, 0.7), G2.add(cx, cy + 0.4, cz, 0.6, '#ff5ad6', 0.45, 0.6)];
      live.push((st2, dt, t) => { G2.set(fg[0], cx, cy + 0.5, cz, 1.1 + Math.sin(t * 7) * 0.12 + Math.sin(t * 13) * 0.07); });
      // the campers: three sitting round the fire, one toasting a sweet on a pin
      for (let i = 0; i < 3; i++) { const a = 0.6 + i * 1.6; C(cx + Math.cos(a) * 1.15, cy, cz + Math.sin(a) * 1.15, { act: 'sit', yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) + P, kind: [0, 5, 2][i] }); }
      C(cx + 1.1, cy, cz - 0.6, { act: 'work', yaw: -2.1, kind: 4, col: '#ffe24a' });
      const toast = new T.Group(); toast.position.set(cx + 0.75, cy + 0.42, cz - 0.4); toast.rotation.set(0, -0.6, 0.9); K.add(toast);
      toast.add(K3D.mesh(new T.CylinderGeometry(0.02, 0.02, 0.8, 5).translate(0, 0.4, 0), ARCADECLAW_MACHINE.chrome(), { ink: false }));
      prop(K, 'sweet', 0, 0.8, 0, 0.3, { parent: toast, pal: 3, roll: P / 2 });
      // a sock sleeping bag with a sleeper, a stack of postage-stamp blankets, a teacup of a bucket
      const sock = new T.Group(); sock.position.set(cx - 0.4, cy, cz - 1.7); sock.rotation.y = 1.2; K.add(sock);
      const sockM = M('sock', () => TY.rimify(K3D.toon('#ffffff', { map: K3D.paint('acl-sock', 128, 64, (c, w, h) => { for (let y = 0; y < h; y += 16) { c.fillStyle = (y / 16) % 2 ? '#5ad8ff' : '#fff4e0'; c.fillRect(0, y, w, 16); } }, { repeat: true }) }), '1.0, 0.95, 0.9', 0.35, 2.2, 'plush-sock'));
      const sk = K3D.mesh(new T.CapsuleGeometry(0.36, 1.3, 6, 12).rotateZ(P / 2), sockM, { ink: A.INK, inkW: 0.8 }); sk.scale.set(1, 0.6, 1); sk.position.y = 0.22; sock.add(sk);
      C(cx - 0.4 + Math.cos(1.2) * 0.75, cy + 0.12, cz - 1.7 - Math.sin(1.2) * 0.75, { act: 'sleep', yaw: 1.2 + P / 2, kind: 3, s: 0.9 });
      const zg = [0, 1].map(() => G2.add(cx, cy + 1, cz - 1.7, 0.3, '#bfe8ff', 0.8, 0));
      live.push((st2, dt, t) => zg.forEach((gi, k) => { const u = (t * 0.3 + k * 0.5) % 1; G2.set(gi, cx - 0.1 + u * 0.4, cy + 0.6 + u * 1.2, cz - 2.2, 0.35 * (1 - u)); }));
      // a pennant on a lolly stick: the camp's flag
      const pole = K3D.mesh(new T.CylinderGeometry(0.04, 0.04, 2.2, 6), M('stick', () => K3D.toon('#f6efe0')), { ink: A.INK, inkW: 0.4 }); pole.position.set(cx - 2.6, cy + 1.1, cz + 0.4); K.add(pole);
      const pen = new T.Mesh(new T.PlaneGeometry(0.9, 0.45), M('pennant', () => K3D.toon('#ffffff', { side: T.DoubleSide, map: signTex('CAMP', '#5aff8a', '#1a3a1a') }))); pen.position.set(cx - 2.15, cy + 1.95, cz + 0.4); pen.userData.live = true; K.add(pen);
      live.push((st2, dt, t) => { pen.rotation.y = Math.sin(t * 2.2) * 0.25; });
    }
    /* 2. the map readers on the right heap */
    {
      const x = 9.6, y = 1.0, z = -3.0;
      C(x, y, z, { act: 'idle', yaw: P + 0.3, kind: 0, col: '#ff8a4a' });
      C(x + 0.9, y, z + 0.2, { act: 'wave', yaw: P - 0.4, kind: 1, col: '#4ae8ff' });
      const mp = new T.Mesh(new T.PlaneGeometry(0.9, 0.68), M('map', () => K3D.toon('#ffffff', { map: mapTex(), side: T.DoubleSide }))); mp.position.set(x + 0.35, y + 0.75, z - 0.35); mp.rotation.set(-0.5, P + 0.1, 0.05); mp.userData.live = true; K.add(mp);
      live.push((st2, dt, t) => { mp.rotation.z = 0.05 + Math.sin(t * 3.1) * 0.04; });
      prop(K, 'trophy', x + 1.6, y, z - 1.1, 0.9, { yaw: 0.4 });
    }
    /* 3. the giant plush whale on the right, a lookout on its head with a crayon telescope */
    {
      const wx = 11.4, wy = 3.6, wz = -27.6;
      prop(K, 'whale', wx, wy, wz, 6.0, { yaw: P / 2, pal: 1, inkW: 1.8 });
      const lx = wx, ly = wy + 4.65, lz = wz + 2.4;
      C(lx, ly, lz, { act: 'idle', yaw: 0, kind: 1, col: '#ffe24a', s: 1.3 });
      const scope = new T.Group(); scope.position.set(lx + 0.25, ly + 0.55, lz + 0.25); scope.userData.live = true; K.add(scope);
      prop(K, 'crayon', 0, 0, 0, 0.8, { tilt: P / 2 - 0.2, parent: scope, pal: 1 });
      live.push((st2, dt, t) => { const b = G.players[1].b3; scope.rotation.y = Math.atan2(b.x - lx, b.z - lz) + P; });
      // a little flag planted in its back and a ladder of lolly sticks up its side
      const lad = new T.Group(); lad.position.set(wx - 2.5, wy + 0.6, wz + 1.0); lad.rotation.z = -0.35; K.add(lad);
      for (const sd of [-0.3, 0.3]) { const r = K3D.mesh(new T.BoxGeometry(0.1, 3.6, 0.1), M('stick', () => K3D.toon('#f6efe0')), { ink: A.INK, inkW: 0.4 }); r.position.set(0, 1.8, sd); lad.add(r); }
      for (let i = 0; i < 7; i++) { const r = new T.Mesh(new T.BoxGeometry(0.08, 0.08, 0.7), M('stick', () => K3D.toon('#f6efe0'))); r.position.y = 0.3 + i * 0.5; lad.add(r); }
    }
    /* 4. a creature asleep in a sweet-wrapper hammock on the corridor's left wall */
    {
      const ax = -6.6, ay = 4.2, z0 = -12.4, z1 = -16.2;
      prop(K, 'pin', ax, ay - 0.2, z0, 1.7, { pal: 0 }); prop(K, 'pin', ax, ay - 0.2, z1, 1.7, { pal: 1 });
      const ham = new T.Group(); ham.position.set(ax, ay + 1.35, (z0 + z1) / 2); ham.userData.live = true; K.add(ham);
      const geo = new T.PlaneGeometry(0.9, z0 - z1 - 0.4, 6, 12); const pa = geo.attributes.position;
      for (let i = 0; i < pa.count; i++) { const v = pa.getY(i) / ((z0 - z1 - 0.4) / 2); pa.setZ(i, -(1 - v * v) * 0.55); } geo.computeVertexNormals();
      const wrap = new T.Mesh(geo, M('hammock', () => K3D.toon('#ffffff', { side: T.DoubleSide, map: A.decalTex('wrapper', 5) }))); wrap.rotation.x = -P / 2; ham.add(wrap);
      const sleeper = C(ax, ay + 0.85, (z0 + z1) / 2, { act: 'sleep', yaw: P / 2, kind: 5, s: 1.0 });
      live.push((st2, dt, t) => { ham.rotation.z = Math.sin(t * 0.9) * 0.12; });
    }
    /* 5. peekers in the corridor walls: heads poking out between the prizes */
    for (const [x, y, z, yaw, k] of [[-3.75, 2.6, -12.2, P / 2, 0], [3.75, 3.1, -15.8, -P / 2, 2], [-3.75, 1.4, -17.6, P / 2, 3], [7.2, 0.4, -27.5, -P / 2, 6]]) C(x, y, z, { act: 'idle', yaw, kind: k, s: 1.0 });
    /* 6. the fisher by the gap */
    {
      const fx = 6.1, fy = 0, fz = -20.75;
      C(fx, fy, fz, { act: 'sit', yaw: P, kind: 0, col: '#7affd8' });
      const rod = new T.Group(); rod.position.set(fx - 0.15, fy + 0.45, fz - 0.15); K.add(rod);
      const r = K3D.mesh(new T.CylinderGeometry(0.025, 0.035, 2.0, 6).translate(0, 1.0, 0), M('rod', () => K3D.toon('#c89a6a')), { ink: A.INK, inkW: 0.4 }); r.rotation.x = -0.95; rod.add(r);
      const tipW = V(fx - 0.15, fy + 0.45 + Math.cos(0.95) * 2.0, fz - 0.15 - Math.sin(0.95) * 2.0), bob = V(fx - 0.2, -2.6 + 0.55, fz - 1.8);
      const line = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 1, 4).translate(0, -0.5, 0), K3D.flat('#e8e8f0')); line.position.copy(tipW); line.scale.y = tipW.distanceTo(bob); line.quaternion.setFromUnitVectors(V(0, -1, 0), bob.clone().sub(tipW).normalize()); K.add(line);
      const bb = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), K3D.toon('#ff3a2a')); bb.position.copy(bob); bb.userData.live = true; K.add(bb);
      live.push((st2, dt, t) => { bb.position.y = bob.y + Math.sin(t * 2.5) * 0.04 + (t % 6 < 0.4 ? -0.12 : 0); });
      prop(K, 'drum', fx + 0.7, fy, fz + 0.3, 0.6, { pal: 1 }); // a bucket for the catch (empty)
    }
    /* 7. builders stacking a HELP tower of letter blocks on the right wall, one on a crayon ladder */
    {
      const bx = 9.2, by = 4.2, bz = -33.6;
      ['H', 'E', 'L', 'P'].forEach((ch, i) => letterBlock(K, ch, ['#e8322a', '#3a8ae8', '#3ac87a', '#ffb02a'][i], bx + (i % 2) * 0.06, by + i * 0.82, bz, 0.8, i * 0.2 - 0.3));
      letterBlock(K, '!', '#b86ae8', bx + 1.1, by, bz + 0.7, 0.8, 0.5);
      C(bx + 1.0, by, bz - 0.6, { act: 'work', yaw: -P / 2 - 0.3, kind: 4, col: '#ff9a4a' });
      C(bx - 0.9, by + 0.82 * 2, bz + 0.2, { act: 'work', yaw: P / 2, kind: 4, col: '#5aff8a' });
      const lad = new T.Group(); lad.position.set(bx - 1.1, by, bz + 0.2); lad.rotation.z = 0.25; K.add(lad);
      for (const sd of [-0.28, 0.28]) prop(K, 'crayon', 0, 0, sd, 1.9, { parent: lad, pal: sd > 0 ? 0 : 3 });
      for (let i = 0; i < 4; i++) { const r = new T.Mesh(new T.BoxGeometry(0.07, 0.07, 0.6), M('stick', () => K3D.toon('#f6efe0'))); r.position.y = 0.35 + i * 0.4; lad.add(r); }
    }
    /* 8. the dance party round a glowing snow globe on the left ledge */
    {
      const dx = -11.0, dy = 7.2, dz = -42.5;
      const globe = prop(K, 'globe', dx, dy, dz, 1.3, { pal: 0 });
      for (let i = 0; i < 4; i++) { const a = i / 4 * P * 2 + 0.3; C(dx + Math.cos(a) * 1.25, dy, dz + Math.sin(a) * 1.25, { act: 'dance', yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), kind: [0, 2, 5, 1][i], ph: i * 0.4 }); }
      const dg = [0, 1, 2, 3].map(i => G2.add(dx, dy + 1.2, dz, 0.9, A.NEON[i * 2], 0.35, 0));
      live.push((st2, dt, t) => dg.forEach((gi, k) => { const a = t * 1.6 + k * P / 2; G2.set(gi, dx + Math.cos(a) * 1.0, dy + 0.9 + Math.sin(t * 3 + k) * 0.2, dz + Math.sin(a) * 1.0, 0.8); }));
      prop(K, 'drum', dx + 1.9, dy, dz - 0.6, 0.75, { pal: 2 }); // the band's drum
    }
    /* 9. a creature waving a HELP ticket at the edge of the right ledge */
    {
      const hx = 8.7, hy = 7.2, hz = -46.0;
      const w = C(hx, hy, hz, { act: 'wave', yaw: -P / 2 - 0.4, kind: 0, col: '#ff5ad6', s: 1.25 });
      const sign = new T.Group(); sign.position.set(hx - 0.2, hy + 0.3, hz + 0.35); sign.userData.live = true; K.add(sign);
      const st0 = K3D.mesh(new T.CylinderGeometry(0.03, 0.03, 1.3, 6).translate(0, 0.65, 0), M('stick', () => K3D.toon('#f6efe0')), { ink: A.INK, inkW: 0.4 }); sign.add(st0);
      const card = new T.Mesh(new T.PlaneGeometry(1.0, 0.5), M('helpCard', () => K3D.toon('#ffffff', { side: T.DoubleSide, map: signTex('HELP!', '#ff9ab8', '#7a1030') }))); card.position.y = 1.35; card.rotation.y = -P / 2 - 0.4; sign.add(card);
      live.push((st2, dt, t) => { sign.rotation.z = Math.sin(t * 6) * 0.25; });
    }
    /* 10. the tea party on a dice table */
    {
      const tx = -10.6, ty = 7.2, tz = -58.4;
      prop(K, 'dice', tx, ty - 0.1, tz, 1.25, { yaw: 0.3 });
      const top = ty - 0.1 + 0.75;
      for (let i = 0; i < 3; i++) { const a = i / 3 * P * 2; const cup = K3D.mesh(K3D.geo('acl-cup', () => new T.CylinderGeometry(0.1, 0.08, 0.14, 12)), M('cup' + i, () => K3D.toon(['#ffffff', '#ff9ab8', '#7ad8ff'][i])), { ink: A.INK, inkW: 0.4 }); cup.position.set(tx + Math.cos(a) * 0.25, top + 0.07, tz + Math.sin(a) * 0.25); K.add(cup); C(tx + Math.cos(a) * 1.15, ty, tz + Math.sin(a) * 1.15, { act: 'sit', yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), kind: [3, 1, 6][i] }); }
      const pot = prop(K, 'drum', tx, top, tz, 0.35, { pal: 0 });
      const steam = G2.add(tx, top + 0.5, tz, 0.6, '#ffffff', 0.4, 0.3);
      live.push((st2, dt, t) => G2.set(steam, tx + Math.sin(t) * 0.1, top + 0.45 + (t * 0.4 % 1) * 0.5, tz, 0.5));
    }
    /* 11. window washers polishing the side glass from the tops of the piles */
    for (const [x, z, side] of [[15.4, -8.5, 1], [-15.4, -39, -1]]) {
      const y = 9.0;
      C(x - side * 0.5, y, z, { act: 'work', yaw: side * P / 2, kind: 4, col: '#4ae8ff' });
      const sq = new T.Group(); sq.position.set(side * 16.35, y + 1.0, z); sq.userData.live = true; K.add(sq);
      const blade = K3D.mesh(new T.BoxGeometry(0.06, 0.12, 0.9), M('squeegee', () => K3D.toon('#2a2a30')), { ink: A.INK, inkW: 0.4 }); sq.add(blade);
      const handle = K3D.mesh(new T.CylinderGeometry(0.03, 0.03, 0.8, 6).rotateZ(P / 2), M('squeegeeH', () => K3D.toon('#ffd23a')), { ink: A.INK, inkW: 0.4 }); handle.position.x = -side * 0.4; sq.add(handle);
      prop(K, 'drum', x - side * 1.1, y, z + 0.8, 0.55, { pal: 1 });
      // the clean patch they have done so far (the glass is a little grubby: here it shines)
      const clean = new T.Mesh(new T.PlaneGeometry(3.2, 2.2), K3D.flat(hot('#ffffff', 1.0), { transparent: true, opacity: 0.08, depthWrite: false })); clean.position.set(side * 16.42, y + 1.3, z); clean.rotation.y = -side * P / 2; K.add(clean);
      live.push((st2, dt, t) => { sq.position.y = y + 1.1 + Math.sin(t * 2.4 + z) * 0.6; sq.position.z = z + Math.cos(t * 1.2 + z) * 0.9; });
    }
    /* 12. a creature taping a HELP note to the inside of the glass front, on a stack of blocks */
    {
      const nx = 4.6, nz = 19.3;
      letterBlock(K, 'A', '#3a8ae8', nx, 0, nz, 0.9, 0.2); letterBlock(K, 'B', '#e8322a', nx + 0.1, 0.9, nz, 0.8, -0.3);
      C(nx, 1.7, nz, { act: 'work', yaw: 0, kind: 0, col: '#ffe24a' });
      const note = new T.Mesh(new T.PlaneGeometry(1.4, 1.4), M('note', () => K3D.toon('#ffffff', { map: noteTex(), side: T.DoubleSide }))); note.position.set(nx, 3.2, 20.92); note.rotation.set(0, P, 0.08); K.add(note);
    }
    /* 13. lost things at hero size */
    { const c = A.lost(K, 'coin', { s: 1.6 }); c.position.set(-10.5, 4.25, -24); c.rotation.set(0.35, 0.4, 0.2); K.add(c); }
    { const c = A.lost(K, 'clip', { s: 5 }); c.position.set(11.5, 7.3, -52); c.rotation.y = 0.7; K.add(c); }
    { const c = A.lost(K, 'hairclip', { s: 1.4, col: '#7ad8ff' }); c.position.set(-9.8, 1.05, -6); c.rotation.y = 1.1; K.add(c); }
    { const c = A.lost(K, 'button', { s: 0.6, col: '#5ad86a' }); c.position.set(10.2, 4.3, -15.2); c.rotation.set(0.25, 0, 0.2); K.add(c); }

    crit.done();
    return { crit, update(st2, dt, t) { for (const f of live) f(st2, dt, t); } };
  }

  // where the stories stand: the heaps keep these spots flat (only small prizes lying about), so nothing buries them
  const SPOTS = [
    { x: -10.4, y: 1.0, z: 3.2, r: 2.6 }, { x: -12.0, y: 1.0, z: 5.0, r: 1.6 }, // the camp and its tent
    { x: 9.6, y: 1.0, z: -3.0, r: 1.9 },                                         // the map readers
    { x: 6.1, y: 0, z: -20.75, r: 1.0 },                                         // the fisher
    { x: 9.2, y: 4.2, z: -33.6, r: 1.8 },                                        // the HELP tower
    { x: -11.0, y: 7.2, z: -42.5, r: 2.2 },                                      // the dance party
    { x: 8.7, y: 7.2, z: -46.0, r: 1.0 },                                        // the HELP waver
    { x: -10.6, y: 7.2, z: -58.4, r: 1.9 },                                      // the tea party
  ];
  return { build, SPOTS };
})();
