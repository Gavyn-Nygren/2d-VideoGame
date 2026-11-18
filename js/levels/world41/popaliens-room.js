/* Pip & Bo - World 41, 41-4 Paper Alien Invasion: the room round the page, and everything that keeps the page alive.
   Loaded on demand with the 3D kit, before popaliens-scene.js. Drawing only: nothing here feeds back into the rules.

   The heroes are ant-sized, so the reader's desk at night is a whole world: the open book's facing page rises like a
   hill on the left, and on the desk to the right stand a cocoa mug as big as a gasworks (steam rolling off it), a tin
   of pencils like a forest of towers, and a desk lamp so tall its warm shade hangs in the sky; far ahead a wall with a
   night window (moon and stars) closes the view. A stack of books looms to the left. All of it sits in warm haze.
   The page itself is alive: dust motes drift and glint in the lamplight, scraps of paper and eraser crumbs tumble
   past in a draft, pencil doodle-bugs scuttle about the margins (and run from the heroes), the fibres sway, the
   saucer's searchlight sweeps the page ahead, and now and then the shadow of the reader's hand drifts over everything.

   PAROOM.build(K, st)            adds it all (called from PASCENE.build)
   PAROOM.update(K, st, dt, t)    every drawn frame (called from PASCENE.draw)
*/
'use strict';

const PAROOM = (function () {
  const T = K3D.T, P = POPUP;
  const R = {};
  const DESK = -14;               // the desk top (the page is the top of a stack of pages 14 high)
  const v = (x, y, z) => new T.Vector3(x, y, z);

  /* ---------- textures ---------- */
  const softTex = () => K3D.paint('paRoomSoft', 128, 128, (c, w, h) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  // a soft puff of steam: a few overlapping blobs
  const steamTex = () => K3D.paint('paSteam', 128, 256, (c, w, h) => {
    const r = P.rng(5);
    for (let i = 0; i < 14; i++) {
      const x = w / 2 + (r() - 0.5) * 40, y = h * (0.1 + r() * 0.8), rad = 20 + r() * 26;
      const g = c.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, 'rgba(255,255,255,0.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });
  // the wall: warm striped wallpaper with a small printed sprig, a skirting board
  const wallTex = () => K3D.paint('paWall', 512, 256, (c, w, h) => {
    c.fillStyle = '#8a6a52'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { c.fillStyle = 'rgba(255,240,210,0.16)'; c.fillRect(x, 0, 14, h); c.fillStyle = 'rgba(120,80,50,0.12)'; c.fillRect(x + 14, 0, 2, h); }
    const r = P.rng(3);
    for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h; c.fillStyle = 'rgba(140,90,60,0.22)'; c.beginPath(); c.ellipse(x, y, 3, 6, r() * 3, 0, Math.PI * 2); c.fill(); }
  }, { repeat: true });
  const nightTex = () => K3D.paint('paNight', 256, 320, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0e1530'); g.addColorStop(0.7, '#25305a'); g.addColorStop(1, '#3a3f66');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const r = P.rng(17);
    for (let i = 0; i < 90; i++) { c.fillStyle = 'rgba(255,255,240,' + (0.3 + r() * 0.7) + ')'; c.fillRect(r() * w, r() * h * 0.8, 1 + r() * 1.5, 1 + r() * 1.5); }
    // the moon
    const mg = c.createRadialGradient(178, 80, 0, 178, 80, 60); mg.addColorStop(0, 'rgba(255,250,220,0.6)'); mg.addColorStop(1, 'rgba(255,250,220,0)');
    c.fillStyle = mg; c.fillRect(110, 20, 140, 130);
    c.fillStyle = '#fff6d8'; c.beginPath(); c.arc(178, 80, 24, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(200,190,160,0.5)'; c.beginPath(); c.arc(170, 74, 5, 0, Math.PI * 2); c.arc(186, 90, 4, 0, Math.PI * 2); c.fill();
    // rooftops far below
    c.fillStyle = '#121a33';
    let x = 0; while (x < w) { const bw = 20 + r() * 40, bh = 20 + r() * 50; c.fillRect(x, h - bh, bw, bh); if (r() < 0.6) { c.fillStyle = 'rgba(255,214,120,0.9)'; c.fillRect(x + 6, h - bh + 8, 4, 5); c.fillStyle = '#121a33'; } x += bw; }
  });
  const mugTex = () => K3D.paint('paMugTex', 512, 128, (c, w, h) => {
    c.fillStyle = '#e8e2d6'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d0563e'; c.fillRect(0, 18, w, 10); c.fillRect(0, h - 28, w, 10);
    // a row of little printed rockets round the mug (the reader likes space)
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 82, y = 66;
      c.fillStyle = '#3c5a8a'; c.beginPath(); c.moveTo(x, y - 22); c.quadraticCurveTo(x + 12, y - 4, x + 9, y + 16); c.lineTo(x - 9, y + 16); c.quadraticCurveTo(x - 12, y - 4, x, y - 22); c.fill();
      c.fillStyle = '#f0c040'; c.beginPath(); c.arc(x, y - 4, 4, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#d0563e'; c.beginPath(); c.moveTo(x - 6, y + 16); c.lineTo(x, y + 28); c.lineTo(x + 6, y + 16); c.fill();
    }
  }, { repeat: true });
  const tinTex = () => K3D.paint('paTinTex', 512, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 8; i++) g.addColorStop(i / 8, i % 2 ? '#8fa3b8' : '#d5dee8');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2f6b4a'; c.fillRect(0, 30, w, 68);
    c.fillStyle = '#f2e6c0'; c.font = 'bold 40px Georgia, serif'; c.fillText('PENCILS', 30, 78); c.fillText('PENCILS', 290, 78);
    for (let y = 6; y < h; y += 8) { c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(0, y, w, 1); }
  }, { repeat: true });
  // printed lines of text on the facing page, seen from far off as grey stripes of words
  const facingTex = () => K3D.paint('paFacing', 512, 1024, (c, w, h) => {
    P.paper(c, w, h, '#f1e7cf', 61);
    const r = P.rng(62);
    for (let y = 30; y < h - 20; y += 14) {
      let x = 26;
      while (x < w - 30) { const ww = 10 + r() * 34; c.fillStyle = 'rgba(40,32,40,' + (0.45 + r() * 0.2) + ')'; c.fillRect(x, y, ww, 6); x += ww + 6; }
      if (r() < 0.08) y += 14;
    }
  }, { repeat: true });
  // a pencil doodle-bug (two frames of legs), drawn in soft graphite
  const bugTex = () => K3D.paint('paBug', 256, 128, (c, w, h) => {
    for (let f = 0; f < 2; f++) {
      const ox = f * 128 + 64, oy = 64;
      c.strokeStyle = 'rgba(60,60,72,0.85)'; c.lineWidth = 3.5; c.lineCap = 'round';
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const lx = ox + (i - 1) * 14, sw = (f ? 1 : -1) * (i % 2 ? 1 : -1) * 7;
        c.beginPath(); c.moveTo(lx, oy); c.quadraticCurveTo(lx + sw, oy + s * 18, lx + sw * 1.6, oy + s * 30); c.stroke();
      }
      c.fillStyle = 'rgba(245,240,226,1)'; c.beginPath(); c.ellipse(ox, oy, 30, 18, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.arc(ox + 34, oy, 11, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(ox - 30, oy); c.lineTo(ox + 30, oy); c.stroke();
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(ox + 40, oy + s * 6); c.quadraticCurveTo(ox + 52, oy + s * 16, ox + 58, oy + s * 12); c.stroke(); }
      c.fillStyle = 'rgba(60,60,72,0.85)'; for (const [dx, dy] of [[-12, -7], [8, 6], [-4, 8]]) { c.beginPath(); c.arc(ox + dx, oy + dy, 3.5, 0, Math.PI * 2); c.fill(); }
      c.beginPath(); c.arc(ox + 38, oy - 4, 2.5, 0, Math.PI * 2); c.arc(ox + 38, oy + 4, 2.5, 0, Math.PI * 2); c.fill();
    }
  });
  const scrapTex = () => K3D.paint('paScrap', 256, 64, (c, w, h) => {
    const r = P.rng(8);
    for (let i = 0; i < 4; i++) {
      const ox = i * 64;
      c.fillStyle = ['#f6f0e2', '#fffaf0', '#efe4cc', '#f3e9f0'][i];
      c.beginPath(); c.moveTo(ox + 6, 8); for (let k = 0; k < 7; k++) c.lineTo(ox + 6 + k * 8, 6 + r() * 6); c.lineTo(ox + 58, 54); c.lineTo(ox + 8, 58); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(80,70,60,0.35)'; c.lineWidth = 1; c.stroke();
      if (i % 2 === 0) { c.fillStyle = 'rgba(40,32,40,0.5)'; for (let y = 20; y < 50; y += 8) c.fillRect(ox + 12, y, 20 + r() * 20, 3); }
      if (i === 3) { c.strokeStyle = 'rgba(70,90,160,0.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(ox + 8, 30); c.lineTo(ox + 56, 30); c.stroke(); }
    }
  });

  /* ---------- the room's big things ---------- */
  function mug(x, z) {
    const g = new T.Group(), H = 34, Rr = 13;
    const body = K3D.mesh(new T.CylinderGeometry(Rr, Rr * 0.94, H, 48, 1, true).translate(0, H / 2, 0), K3D.toon('#ffffff', { map: mugTex(), side: T.DoubleSide }), { ink: '#4a3a30', inkW: 2 });
    g.add(body);
    const rim = new T.Mesh(new T.TorusGeometry(Rr, 0.8, 8, 48).rotateX(Math.PI / 2), K3D.toon('#efe9de')); rim.position.y = H; g.add(rim);
    const cocoa = new T.Mesh(new T.CircleGeometry(Rr - 0.6, 40).rotateX(-Math.PI / 2), K3D.toon('#5a3420')); cocoa.position.y = H - 3; g.add(cocoa);
    const handle = K3D.mesh(new T.TorusGeometry(8, 2.2, 12, 32, Math.PI * 1.2).rotateZ(-Math.PI * 0.6), K3D.toon('#e8e2d6'), { ink: '#4a3a30', inkW: 2 });
    handle.position.set(-Rr - 2, H * 0.52, 0); g.add(handle);
    g.position.set(x, DESK, z);
    return g;
  }
  function tin(x, z) {
    const g = new T.Group(), H = 36, Rr = 11;
    g.add(K3D.mesh(new T.CylinderGeometry(Rr, Rr, H, 40, 1, true).translate(0, H / 2, 0), K3D.toon('#ffffff', { map: tinTex(), side: T.DoubleSide }), { ink: '#2a3440', inkW: 2 }));
    const cols = [['#f2c23a', 1.0], ['#d24a4a', 0.95], ['#3b7bd0', 1.1], ['#4fa860', 0.9], ['#f2c23a', 1.15]];
    cols.forEach(([col, s], i) => {
      const pc = P.pencil(); pc.scale.setScalar(9 * s);
      const a = i / cols.length * Math.PI * 2;
      pc.rotation.set(0, a, Math.PI / 2 - 0.12 - (i % 2) * 0.1);
      pc.position.set(Math.cos(a) * 4, 4, Math.sin(a) * 4);
      pc.traverse(o => { if (o.material && o.material.color && i % 5 && o.material.color.getHex() === 0xf2c23a) { o.material = o.material.clone(); o.material.color.set(col); } });
      g.add(pc);
    });
    g.position.set(x, DESK, z);
    return g;
  }
  function lamp(x, z) {
    const g = new T.Group(), metal = K3D.toon('#3c4a5e'), ink = { ink: '#141a24', inkW: 2 };
    g.add(K3D.mesh(new T.CylinderGeometry(22, 26, 6, 40).translate(0, 3, 0), metal, ink));
    const arm1 = K3D.mesh(new T.CylinderGeometry(2.2, 2.2, 110, 16).translate(0, 55, 0), metal, ink); arm1.rotation.z = 0.28; arm1.position.y = 6; g.add(arm1);
    const elbow = v(-Math.sin(0.28) * 110, 6 + Math.cos(0.28) * 110, 0);
    const j = K3D.mesh(new T.SphereGeometry(5, 16, 12), metal, ink); j.position.copy(elbow); g.add(j);
    const arm2 = K3D.mesh(new T.CylinderGeometry(2, 2, 90, 16).translate(0, 45, 0), metal, ink); arm2.position.copy(elbow); arm2.rotation.z = 1.25; g.add(arm2);
    const head = v(elbow.x - Math.sin(1.25) * 90, elbow.y + Math.cos(1.25) * 90, 0);
    const shade = K3D.mesh(new T.ConeGeometry(26, 34, 40, 1, true).translate(0, -17, 0), K3D.toon('#2e6b5a', { side: T.DoubleSide }), ink);
    shade.position.copy(head); shade.rotation.z = 0.55; g.add(shade);
    // the bulb and its glow
    const bulbAt = head.clone().add(v(-Math.sin(0.55) * -28, -Math.cos(0.55) * 28, 0));
    const bulb = new T.Mesh(new T.SphereGeometry(9, 20, 14), K3D.flat('#fff3c8')); bulb.position.copy(bulbAt); g.add(bulb);
    const glow = new T.Sprite(new T.SpriteMaterial({ map: softTex(), color: '#ffd890', transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    glow.scale.set(180, 180, 1); glow.position.copy(bulbAt); g.add(glow);
    // a soft cone of light down onto the page
    const beam = new T.Mesh(new T.ConeGeometry(110, 200, 40, 1, true).translate(0, -100, 0), new T.MeshBasicMaterial({ color: '#ffdca0', transparent: true, opacity: 0.07, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
    beam.position.copy(bulbAt); beam.rotation.z = 0.55; g.add(beam);
    g.position.set(x, DESK, z); g.rotation.y = 0.1;
    g.userData.glow = glow;
    return g;
  }
  function books(x, z) {
    const g = new T.Group(), r = P.rng(44);
    const cols = ['#7b3b3b', '#2f5a6e', '#a07a2e', '#3f6a3a', '#5a4a7a'];
    let y = DESK;
    for (let i = 0; i < 5; i++) {
      const w = 80 + r() * 20, d = 56 + r() * 10, hh = 10 + r() * 6;
      const cover = K3D.mesh(new T.BoxGeometry(w, hh, d), K3D.toon(cols[i]), { ink: '#2a1e1e', inkW: 2 });
      cover.position.set((r() - 0.5) * 8, y + hh / 2, (r() - 0.5) * 8); cover.rotation.y = (r() - 0.5) * 0.3; g.add(cover);
      const pages = new T.Mesh(new T.BoxGeometry(w - 2, hh - 2.4, d + 0.4), K3D.toon('#efe4c8')); pages.position.copy(cover.position); pages.position.x -= 1.2; pages.rotation.y = cover.rotation.y; g.add(pages);
      const band = new T.Mesh(new T.BoxGeometry(1, hh * 0.25, d + 0.6), K3D.toon('#e0b850')); band.position.copy(cover.position); band.position.x += w / 2; band.rotation.y = cover.rotation.y; g.add(band);
      y += hh;
    }
    g.position.set(x, 0, z);
    return g;
  }
  // the book's facing page: down into the gutter past the printed column, then up in a long curve like a hill
  function facingPage() {
    const segX = 40, segZ = 60, W = 170, L = 900;
    const geo = new T.PlaneGeometry(W, L, segX, segZ).rotateX(-Math.PI / 2), a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const u = (a.getX(i) + W / 2) / W;             // 0 at the far left edge, 1 at the gutter
      const y = (1 - u) * (1 - u) * 46 - Math.max(0, u - 0.9) * 40;   // up like a hill on the far side, down into the gutter
      a.setY(i, y);
    }
    geo.computeVertexNormals();
    const tex = facingTex(); tex.repeat.set(1.2, 6);
    const m = new T.Mesh(geo, K3D.toon('#ffffff', { map: tex }));
    m.position.set(-110 - W / 2, 0, -300); m.receiveShadow = true; m.userData.live = true;
    return m;
  }
  function wall() {
    const g = new T.Group();
    const tex = wallTex(); tex.repeat.set(10, 3);
    const w = new T.Mesh(new T.PlaneGeometry(1400, 520), K3D.toon('#ffffff', { map: tex })); w.position.set(80, DESK + 260, -980); g.add(w);
    const sk = new T.Mesh(new T.BoxGeometry(1400, 18, 4), K3D.toon('#8a6648')); sk.position.set(80, DESK + 9, -977); g.add(sk);
    // the window: a frame, the night with the moon, and a cool spill of moonlight
    const win = new T.Mesh(new T.PlaneGeometry(220, 280), K3D.flat('#ffffff', { map: nightTex() })); win.position.set(-150, DESK + 230, -977); g.add(win);
    const fr = K3D.toon('#f2ead8');
    for (const [fx, fy, fw, fh] of [[0, 140, 236, 14], [0, -140, 236, 14], [-112, 0, 14, 290], [112, 0, 14, 290], [0, 0, 8, 280], [0, 0, 220, 8]]) {
      const b = K3D.mesh(new T.BoxGeometry(fw, fh, 6), fr, { ink: '#6a5a48', inkW: 1.5 }); b.position.set(-150 + fx, DESK + 230 + fy, -975); g.add(b);
    }
    for (const s of [-1, 1]) {
      const cur = new T.Mesh(new T.PlaneGeometry(70, 330, 12, 1), K3D.toon('#8a3a46', { side: T.DoubleSide })); const ca = cur.geometry.attributes.position;
      for (let i = 0; i < ca.count; i++) ca.setZ(i, Math.sin(ca.getX(i) * 0.3) * 6);
      cur.geometry.computeVertexNormals(); cur.position.set(-150 + s * 150, DESK + 220, -970); g.add(cur);
    }
    const moon = new T.Sprite(new T.SpriteMaterial({ map: softTex(), color: '#bcc8ff', transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    moon.scale.set(380, 380, 1); moon.position.set(-150, DESK + 230, -960); g.add(moon);
    return g;
  }

  /* ---------- build ---------- */
  R.build = function (K, st) {
    const V = st.v3;
    const room = new T.Group(); K.add(room);
    room.add(facingPage());
    room.add(books(-300, -160));
    room.add(mug(78, -120));
    V.steamAt = v(78, DESK + 34, -120);
    room.add(tin(84, -330));
    const lp = lamp(150, -520); room.add(lp); V.lampGlow = lp.userData.glow;
    room.add(wall());
    // the room keeps its own light: the page's haze would wash it out (depth of field and its own colours carry the distance)
    room.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.fog = false; }); });
    // steam: soft sheets rising off the cocoa, turned to the camera every frame
    V.steam = [];
    for (let i = 0; i < 7; i++) {
      const m = new T.Mesh(K3D.geo('paSteamQ', () => new T.PlaneGeometry(1, 2)), new T.MeshBasicMaterial({ map: steamTex(), color: '#fff8f0', transparent: true, opacity: 0, depthWrite: false, fog: false }));
      K.add(m); V.steam.push({ m, ph: i / 7 });
    }
    // dust motes in the lamplight
    const ND = 520, dust = new T.InstancedMesh(K3D.geo('paDustQ', () => new T.PlaneGeometry(1, 1)), new T.MeshBasicMaterial({ map: softTex(), color: '#ffffff', transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }), ND);
    dust.frustumCulled = false; dust.renderOrder = 5; K.add(dust);
    const r = P.rng(71);
    V.dust = { m: dust, p: Array.from({ length: ND }, () => ({ x: (r() - 0.5) * 50, y: 0.2 + r() * r() * 10, z: -r() * 44 + 8, s: 0.05 + r() * r() * 0.16, ph: r() * 6.3, sp: 0.2 + r() * 0.6 })) };
    // scraps of paper and eraser crumbs blowing across in a draft
    const NS = 26, scraps = new T.InstancedMesh(K3D.geo('paScrapQ', () => {
      const g = new T.PlaneGeometry(0.34, 0.34, 2, 1), a = g.attributes.position; for (let i = 0; i < a.count; i++) a.setZ(i, Math.abs(a.getX(i)) * 0.4); g.computeVertexNormals();
      // pick one of four scraps in the strip texture by instance (uv squeezed to a quarter; offset in the shader below)
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.25); return g;
    }), K3D.toon('#ffffff', { map: scrapTex(), side: T.DoubleSide, transparent: true, alphaTest: 0.4 }), NS);
    const sFrame = new T.InstancedBufferAttribute(new Float32Array(NS), 1);
    for (let i = 0; i < NS; i++) sFrame.setX(i, (i % 4) * 0.25);
    scraps.geometry = scraps.geometry.clone(); scraps.geometry.setAttribute('aOff', sFrame);
    scraps.material.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aOff;').replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv.x += aOff;\n#endif');
    };
    scraps.castShadow = true; scraps.frustumCulled = false; K.add(scraps);
    V.scraps = { m: scraps, p: Array.from({ length: NS }, () => ({ x: (r() - 0.5) * 40, y: 0.1, z: -r() * 40 + 6, vy: 0, rx: r() * 6, ry: r() * 6, rz: r() * 6, w: 0.8 + r() * 1.4, hop: r() * 3 })) };
    // pencil doodle-bugs scuttling about (two frames of legs)
    const NB = 14, bugs = new T.InstancedMesh(K3D.geo('paBugQ', () => { const g = new T.PlaneGeometry(1.4, 0.7).rotateX(-Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.5); return g; }),
      K3D.flat('#ffffff', { map: bugTex(), transparent: true, depthWrite: false }), NB);
    const bFrame = new T.InstancedBufferAttribute(new Float32Array(NB), 1);
    bugs.geometry = bugs.geometry.clone(); bugs.geometry.setAttribute('aOff', bFrame);
    bugs.material.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aOff;').replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv.x += aOff;\n#endif');
    };
    bugs.material.polygonOffset = true; bugs.material.polygonOffsetFactor = -2; bugs.material.polygonOffsetUnits = -2;
    bugs.renderOrder = 2; bugs.frustumCulled = false; K.add(bugs);
    V.bugs = { m: bugs, f: bFrame, p: Array.from({ length: NB }, (_, i) => ({ x: (i % 2 ? 1 : -1) * (6 + r() * 10), z: -r() * 30, a: r() * 6.3, sp: 0.6 + r() * 0.6, turn: 0, t: r() * 5, s: 1.2 + r() * 0.7 })) };
    // the saucer's searchlight sweeping the page ahead, and the reader's hand passing over now and then
    V.spot = new T.Mesh(K3D.geo('paSpotQ', () => new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), K3D.flat('#fff2c0', { map: softTex(), transparent: true, opacity: 0.55, add: true, depthWrite: false }));
    V.spot.renderOrder = 3; V.spot.scale.set(9, 1, 6); K.add(V.spot);
    V.handShadow = new T.Mesh(K3D.geo('paSpotQ'), new T.MeshBasicMaterial({ map: softTex(), color: '#2a1c18', transparent: true, opacity: 0, depthWrite: false }));
    V.handShadow.renderOrder = 3; V.handShadow.scale.set(60, 1, 34); K.add(V.handShadow);
    // warm pools of lamplight lying on the page along the way
    const pool = K3D.flat('#ffcf80', { map: softTex(), transparent: true, opacity: 0.16, add: true, depthWrite: false });
    for (let i = 0; i < 9; i++) { const m = new T.Mesh(K3D.geo('paSpotQ'), pool); m.scale.set(46, 1, 30); m.position.set(14 + Math.sin(i * 2.3) * 10, 0.02, -20 - i * 70); m.renderOrder = 1; K.add(m); }
  };

  /* ---------- every frame ---------- */
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3(), col = new T.Color();
  R.update = function (K, st, dt, t) {
    const V = st.v3, cam = K.camera, cz = st.cz;
    // steam rolls up off the cocoa, swaying, and fades as it climbs
    for (const sp of V.steam) {
      const k = (t * 0.08 + sp.ph) % 1;
      sp.m.position.set(V.steamAt.x + Math.sin(t * 0.7 + sp.ph * 9) * (4 + k * 10), V.steamAt.y + 6 + k * 70, V.steamAt.z + Math.cos(t * 0.5 + sp.ph * 7) * 4);
      sp.m.scale.set(16 + k * 30, 18 + k * 30, 1); sp.m.quaternion.copy(cam.quaternion);
      sp.m.material.opacity = Math.sin(k * Math.PI) * 0.55;
    }
    if (V.lampGlow) V.lampGlow.material.opacity = 0.8 + Math.sin(t * 7.3) * 0.02 + Math.sin(t * 1.1) * 0.03;
    // dust motes: a box round the camera's focus, drifting and glinting; they wrap round as the march moves on
    const D = V.dust, dm = D.m;
    let k = 0;
    for (const d of D.p) {
      d.x += Math.sin(t * 0.3 + d.ph) * 0.3 * dt; d.y += (Math.sin(t * 0.5 + d.ph * 2) * 0.12 - 0.03) * dt * d.sp * 3; d.z += Math.cos(t * 0.27 + d.ph) * 0.25 * dt;
      if (d.y < 0.1) d.y = 9; if (d.y > 10) d.y = 0.2;
      let z = d.z + Math.round((cz - d.z - 18) / 44) * 44;
      p.set(d.x + st.cx, d.y, z); s.setScalar(d.s * (1 + Math.sin(t * 2 + d.ph * 5) * 0.3));
      m4.compose(p, cam.quaternion, s); dm.setMatrixAt(k, m4);
      const b = 0.35 + 0.65 * Math.max(0, Math.sin(t * (0.6 + d.sp) + d.ph * 4)); col.setRGB(1 * b, 0.92 * b, 0.75 * b); dm.setColorAt(k, col); k++;
    }
    dm.count = k; dm.instanceMatrix.needsUpdate = true; if (dm.instanceColor) dm.instanceColor.needsUpdate = true;
    // scraps tumbling across the page in a draft, hopping now and then
    const S = V.scraps, sm = S.m, gust = 1 + Math.sin(t * 0.23) * 0.6;
    k = 0;
    for (const c of S.p) {
      c.x += c.w * gust * dt * 1.6; c.hop -= dt;
      if (c.hop <= 0 && c.y <= 0.1) { c.vy = 1.5 + Math.random() * 2.5 * gust; c.hop = 1 + Math.random() * 3; }
      c.vy -= 6 * dt; c.y = Math.max(0.03, c.y + c.vy * dt); if (c.y <= 0.03) c.vy = 0;
      const air = c.y > 0.05 ? 1 : 0.15;
      c.rx += dt * 4 * air * c.w; c.rz += dt * 3 * air;
      if (c.x > 26) { c.x = -26; c.z = cz + 6 - Math.random() * 40; }
      if (c.z > cz + 8) c.z -= 44;
      e.set(c.y > 0.05 ? c.rx : -Math.PI / 2 + 0.2, c.ry, c.y > 0.05 ? c.rz : 0); q.setFromEuler(e); p.set(c.x, c.y + 0.04, c.z); s.setScalar(1);
      m4.compose(p, q, s); sm.setMatrixAt(k++, m4);
    }
    sm.count = k; sm.instanceMatrix.needsUpdate = true;
    // doodle-bugs wander, and scuttle away from the heroes
    const B = V.bugs, bm = B.m;
    k = 0;
    for (const b of B.p) {
      b.t += dt; b.turn -= dt;
      if (b.turn <= 0) { b.turn = 0.8 + Math.random() * 2; b.da = (Math.random() - 0.5) * 1.6; }
      let fast = 1;
      for (const pl of G.players) { const dx = b.x - pl.b3.x, dz = b.z - pl.b3.z, d = Math.hypot(dx, dz); if (d < 3.5) { b.a = Math.atan2(dz, dx); fast = 3.2; } }
      b.a += (b.da || 0) * dt;
      b.x += Math.cos(b.a) * b.sp * fast * dt; b.z += Math.sin(b.a) * b.sp * fast * dt;
      if (Math.abs(b.x) > 24) b.a = Math.PI - b.a;
      if (b.z > cz + 8 || b.z < cz - 40) { b.z = cz - 14 - Math.random() * 20; b.x = (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 15); }
      e.set(0, -b.a, 0); q.setFromEuler(e); p.set(b.x, 0.015, b.z); s.setScalar(b.s); m4.compose(p, q, s); bm.setMatrixAt(k, m4);
      B.f.setX(k, Math.floor(b.t * 8 * b.sp * fast) % 2 ? 0.5 : 0); k++;
    }
    bm.count = k; bm.instanceMatrix.needsUpdate = true; B.f.needsUpdate = true;
    // the searchlight sweeps ahead of the pair
    V.spot.position.set(st.cx + Math.sin(t * 0.35) * 12, 0.03, cz - 13 + Math.sin(t * 0.21) * 4);
    V.spot.material.opacity = 0.32 + Math.sin(t * 3) * 0.04;
    // the reader's hand passes over the page about every 50 s: a huge soft shadow drifting across
    const ph = (t % 50) / 7;
    if (ph < 1) {
      V.handShadow.visible = true; V.handShadow.material.opacity = Math.sin(ph * Math.PI) * 0.28;
      V.handShadow.position.set(-60 + ph * 120, 0.04, cz - 10);
    } else V.handShadow.visible = false;
  };
  return R;
})();
