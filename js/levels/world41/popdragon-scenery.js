/* Pip & Bo - 41-3 Paper Dragon Flight: the scenery along the flight. Drawing only, built from the same lists the rules
   use (POPDRAGON_ROUTE in popdragon-route.js), so a thing you can hit is drawn exactly where it stands.
   Uses three.js through K3D.T, but only inside the functions below, which run after the 3D kit has loaded.

   POPDRAGON_ART.build(K) fills the scene once: the attic room (floor, walls, the sloping roof, the night window), the
   writer's desk with the open storybook, the brass lamp, the teacup and its steam rings, the pencil pot's forest, the
   stack of books, the ink bottle and quill, the ruler, the jam jar and the paper cobweb, the desk clutter; then the
   paper stars (one batched family), the bookmark hoops, the gold signs and the runaway page.
   Returns { tick(st, t, dt) } which moves the live things to match the game state (stars collected, the web burnt,
   the page, the steam) every drawn frame.
   Stretches 2 to 4 (the bookshelf, the bedroom, the window) are only blocked in for now: the look gate comes first.
*/
'use strict';

const POPDRAGON_ART = (function () {
  const A = {};
  const INK = '#2b2130';

  A.build = function (K) {
    const T = K3D.T, P = POPUP, K3 = K3D, R = POPDRAGON_ROUTE, art = R.art;
    const still = new T.Group(); K.add(still);   // baked once built
    const live = new T.Group(); K.add(live);
    const v3 = (a) => new T.Vector3(a[0], a[1], a[2]);
    // turn a thing to face along the rail at frame fr (its +Z along the rail, +Y the window's up)
    const faceRail = (obj, fr, back) => { const t = new T.Vector3(...fr.t).multiplyScalar(back ? -1 : 1), u = new T.Vector3(...fr.u), x = new T.Vector3().crossVectors(u, t).normalize(); obj.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, new T.Vector3().crossVectors(t, x), t)); };
    const F = R.FLOOR;

    /* ---------- the attic room ---------- */
    const planks = K3.paint('pdFloor', 1024, 1024, (c, w, h) => {
      const r = P.rng(501);
      for (let i = 0; i < 8; i++) {
        c.fillStyle = mixHex('#5a3c26', '#6e4a30', r()); c.fillRect(0, i * h / 8, w, h / 8);
        for (let k = 0; k < 70; k++) { c.strokeStyle = r() < 0.5 ? 'rgba(30,15,5,0.2)' : 'rgba(255,220,170,0.06)'; c.lineWidth = 1 + r() * 2; const y = i * h / 8 + r() * h / 8; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= w; x += 40) c.lineTo(x, y + Math.sin(x * 0.012 + k) * 2.5); c.stroke(); }
        c.fillStyle = 'rgba(15,8,2,0.6)'; c.fillRect(0, i * h / 8, w, 4);
        for (let k = 0; k < 3; k++) { const x = r() * w; c.fillRect(x, i * h / 8, 3, h / 8); c.fillStyle = 'rgba(200,170,120,0.5)'; c.beginPath(); c.arc(x + 20, i * h / 8 + 10, 3, 0, Math.PI * 2); c.arc(x + 20, i * h / 8 + h / 8 - 10, 3, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(15,8,2,0.6)'; }
      }
    }, { repeat: true });
    planks.repeat.set(9, 9);
    const floor = K3.mesh(new T.PlaneGeometry(520, 300).rotateX(-Math.PI / 2), K3.toon('#ffffff', { map: planks }), { ink: false, cast: false });
    floor.position.set(110, F, 80); still.add(floor);
    // a round braided rug under the desk chair
    const rugTex = K3.paint('pdRug', 512, 512, (c, w, h) => {
      const cols = ['#7a3a4a', '#c9a24a', '#3f6b5a', '#e8d8b8', '#8a5a3a'];
      for (let i = 30; i > 0; i--) { c.fillStyle = cols[i % 5]; c.beginPath(); c.arc(w / 2, h / 2, i * 8.4, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1.5; c.stroke(); }
    });
    const rug = new T.Mesh(new T.CircleGeometry(40, 64).rotateX(-Math.PI / 2), K3.toon('#ffffff', { map: rugTex }));
    rug.position.set(10, F + 0.05, 52); rug.receiveShadow = true; still.add(rug);
    // walls: old boards, a skirting board; the roof slopes down over them (an attic)
    const boards = K3.paint('pdWall', 1024, 1024, (c, w, h) => {
      const r = P.rng(511);
      for (let i = 0; i < 10; i++) { c.fillStyle = mixHex('#3e2c22', '#4c382a', r()); c.fillRect(i * w / 10, 0, w / 10, h); c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(i * w / 10, 0, 4, h); for (let k = 0; k < 30; k++) { c.strokeStyle = 'rgba(20,10,5,0.22)'; const x = i * w / 10 + r() * w / 10; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + (r() - 0.5) * 8, h); c.stroke(); } }
    }, { repeat: true });
    boards.repeat.set(8, 2);
    const wallM = K3.toon('#ffffff', { map: boards });
    const backWall = new T.Mesh(new T.PlaneGeometry(520, 140), wallM); backWall.position.set(110, F + 70, -44); backWall.receiveShadow = true; still.add(backWall);
    const leftWall = new T.Mesh(new T.PlaneGeometry(300, 140), wallM); leftWall.rotation.y = Math.PI / 2; leftWall.position.set(-150, F + 70, 80); still.add(leftWall);
    // the sloping roof: rafters and boards from the top of the back wall up to the ridge
    const roofM = K3.toon('#ffffff', { map: boards });
    const roof = new T.Mesh(new T.PlaneGeometry(520, 190), roofM); roof.position.set(110, F + 175, 40); roof.rotation.x = Math.PI / 2 + 0.62; still.add(roof);
    for (let x = -140; x < 370; x += 26) {
      const raf = K3.mesh(new T.BoxGeometry(3, 3, 190), K3.mat('pdRafter', () => K3.toon('#3a281c')), { ink: '#120a06', cast: false });
      raf.position.set(x, F + 170, 38); raf.rotation.x = 0.95; still.add(raf);
    }
    const beam = K3.mesh(new T.BoxGeometry(520, 5, 5), K3.mat('pdRafter', () => K3.toon('#3a281c')), { ink: '#120a06', cast: false }); beam.position.set(110, F + 136, -40); still.add(beam);
    // the round attic window on the back wall: night sky, rain, the moon
    const nightTex = K3.paint('pdNight', 512, 512, (c, w, h) => {
      const r = P.rng(521);
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1a2440'); g.addColorStop(1, '#34466a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 6; i++) P.wash(c, r() * w, r() * h * 0.7, 60 + r() * 80, '#5a6a8a', 0.25, r, { noEdge: true });
      const mg = c.createRadialGradient(w * 0.68, h * 0.3, 10, w * 0.68, h * 0.3, 120); mg.addColorStop(0, 'rgba(255,250,220,1)'); mg.addColorStop(0.25, 'rgba(255,245,210,0.95)'); mg.addColorStop(0.3, 'rgba(220,225,240,0.35)'); mg.addColorStop(1, 'rgba(200,210,240,0)'); c.fillStyle = mg; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) { const x = r() * w, y = r() * h, s = 1 + r() * 3.5; c.fillStyle = 'rgba(220,235,250,0.5)'; c.beginPath(); c.ellipse(x, y, s * 0.7, s, 0, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#141a2a'; c.beginPath(); c.moveTo(0, h); c.lineTo(0, h * 0.8); for (let x = 0; x <= w; x += 40) c.lineTo(x, h * 0.8 - Math.abs(Math.sin(x * 0.03)) * 30 - (x > w * 0.4 && x < w * 0.5 ? 50 : 0)); c.lineTo(w, h); c.closePath(); c.fill();
    });
    const winG = new T.Group(); winG.position.set(300, F + 64, -43); still.add(winG);
    winG.add(new T.Mesh(new T.CircleGeometry(24, 48), K3.flat('#ffffff', { map: nightTex })));
    const frameM = K3.mat('pdWinFrame', () => K3.toon('#d9d0bd'));
    winG.add(K3.mesh(new T.TorusGeometry(24.5, 1.6, 10, 64), frameM, { ink: '#3a3028' }));
    for (const a of [0, Math.PI / 2]) { const bar = K3.mesh(new T.BoxGeometry(48, 1.2, 1), frameM, { ink: '#3a3028' }); bar.rotation.z = a; bar.position.z = 0.5; winG.add(bar); }
    // moonlight falling in: a soft see-through shaft
    const shaft = new T.Mesh(new T.CylinderGeometry(22, 34, 110, 32, 1, true).rotateX(Math.PI / 2 + 0.5), K3.flat('#a8b8e0', { transparent: true, opacity: 0.05, depthWrite: false, add: true, side: T.DoubleSide }));
    shaft.position.set(300, F + 34, 6); live.add(shaft);
    // the far stretches, blocked in for now (they get their scenery after the look gate): the bookcase, the bed
    const caseM = K3.mat('pdCase', () => K3.toon('#5a3a24'));
    const bc = new T.Group(); bc.position.set(118, F, -32); still.add(bc);
    bc.add(K3.mesh(new T.BoxGeometry(56, 4, 22).translate(0, 98, 0), caseM, { ink: '#1a0e06' }));
    for (const x of [-27, 27]) bc.add(K3.mesh(new T.BoxGeometry(3, 100, 22).translate(x, 50, 0), caseM, { ink: '#1a0e06' }));
    for (let y = 0; y < 100; y += 24) bc.add(K3.mesh(new T.BoxGeometry(54, 2, 22).translate(0, y + 1, 0), caseM, { ink: '#1a0e06' }));
    {
      const r = P.rng(531), cols = ['#7a2f2f', '#2f4f7a', '#6b5a2a', '#3f6b4a', '#8a4a6a', '#c9973a', '#4a3a6a', '#a8443a', '#2f6a6a'];
      for (let sh = 0; sh < 4; sh++) { let x = -25; while (x < 24) { const bw = 1.6 + r() * 2.2, bh = 12 + r() * 9; if (x + bw > 25) break; const b = K3.mesh(new T.BoxGeometry(bw, bh, 15), K3.mat('pdSpine' + (Math.floor(r() * 9)), () => K3.toon(cols[Math.floor(r() * 9)])), { ink: '#14100a', inkW: 0.8 }); b.position.set(x + bw / 2, sh * 24 + 2 + bh / 2, 2); if (r() < 0.12) b.rotation.z = 0.2; bc.add(b); x += bw + 0.15; } }
    }
    const bedM = K3.mat('pdBed', () => K3.toon('#6a4a8a')), quiltTex = K3.paint('pdQuilt', 512, 512, (c, w, h) => { const cols = ['#c46a7a', '#e8c46a', '#6aa48a', '#8aa4d4', '#d4a07a']; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.fillStyle = cols[(x * 3 + y * 2) % 5]; c.fillRect(x * 64, y * 64, 64, 64); c.strokeStyle = 'rgba(255,255,255,0.6)'; c.setLineDash([4, 4]); c.lineWidth = 2; c.strokeRect(x * 64 + 4, y * 64 + 4, 56, 56); } });
    const bed = new T.Group(); bed.position.set(215, F, 40); still.add(bed);
    bed.add(K3.mesh(new T.BoxGeometry(80, 16, 110).translate(0, 8, 0), K3.mat('pdBedFrame', () => K3.toon('#6a4a30')), { ink: '#1a0e06' }));
    bed.add(K3.mesh(K3.roundBox(78, 12, 106, 0.4, 32).translate(0, 15, 0), K3.toon('#ffffff', { map: quiltTex }), { ink: '#3a2030' }));
    bed.add(K3.mesh(new T.BoxGeometry(80, 40, 4).translate(0, 20, -56), K3.mat('pdBedFrame', () => K3.toon('#6a4a30')), { ink: '#1a0e06' }));
    void bedM;

    /* ---------- the desk ---------- */
    const DB = R.DESKBOX;
    const wood = K3.paint('pdDesk', 1024, 1024, (c, w, h) => {
      const r = P.rng(81);
      for (let i = 0; i < 6; i++) {
        const y = i * h / 6, base = mixHex('#7a4f2e', '#8f6038', r());
        c.fillStyle = base; c.fillRect(0, y, w, h / 6);
        for (let k = 0; k < 90; k++) { c.strokeStyle = r() < 0.5 ? 'rgba(40,20,8,0.18)' : 'rgba(255,220,170,0.08)'; c.lineWidth = 1 + r() * 2; const yy = y + r() * h / 6; c.beginPath(); c.moveTo(0, yy); for (let x = 0; x <= w; x += 32) c.lineTo(x, yy + Math.sin(x * 0.01 + k) * 3); c.stroke(); }
        for (let k = 0; k < 2; k++) { const kx = r() * w, ky = y + h / 12; c.strokeStyle = 'rgba(40,20,8,0.3)'; for (let rr2 = 4; rr2 < 26; rr2 += 4) { c.beginPath(); c.ellipse(kx, ky, rr2 * 2, rr2 * 0.6, 0, 0, Math.PI * 2); c.stroke(); } }
        c.fillStyle = 'rgba(20,10,4,0.55)'; c.fillRect(0, y, w, 3);
      }
      // an old ink ring and a scorch from a candle, long ago
      c.strokeStyle = 'rgba(30,20,40,0.25)'; c.lineWidth = 10; c.beginPath(); c.arc(w * 0.72, h * 0.3, 40, 0.3, 5.6); c.stroke();
    }, { repeat: true });
    wood.repeat.set(4, 2);
    const deskW = DB.x1 - DB.x0, deskD = DB.z1 - DB.z0;
    const top = K3.mesh(new T.BoxGeometry(deskW, 2.6, deskD).translate(0, -1.3, 0), [K3.toon('#6a4428'), K3.toon('#6a4428'), K3.toon('#ffffff', { map: wood }), K3.toon('#5a3a22'), K3.toon('#6a4428'), K3.toon('#6a4428')], { ink: '#1a0e06', cast: false });
    top.position.set((DB.x0 + DB.x1) / 2, 0, (DB.z0 + DB.z1) / 2); still.add(top);
    const legM = K3.mat('pdLeg', () => K3.toon('#5a3a22'));
    for (const [x, z] of [[DB.x0 + 4, DB.z0 + 4], [DB.x1 - 4, DB.z0 + 4], [DB.x0 + 4, DB.z1 - 4], [DB.x1 - 4, DB.z1 - 4]]) { const leg = K3.mesh(new T.CylinderGeometry(2.4, 1.8, -F - 2.6, 12).translate(0, F / 2 - 1.3, 0), legM, { ink: '#1a0e06' }); leg.position.set(x, 0, z); still.add(leg); }
    // a drawer front with a brass knob, under the desk's front edge
    const drawer = K3.mesh(new T.BoxGeometry(44, 8, 1.2), K3.toon('#6e4a2c'), { ink: '#1a0e06' }); drawer.position.set(0, -7, DB.z1 + 0.3); still.add(drawer);
    const knob = K3.mesh(new T.SphereGeometry(1.1, 16, 12), K3.mat('brassLamp', () => K3.toon('#c9973a')), { ink: '#4a3410' }); knob.position.set(0, -7, DB.z1 + 1.4); still.add(knob);
    // a blotter pad under the book (green leather with a cream paper sheet)
    const blot = K3.mesh(new T.BoxGeometry(44, 0.3, 30).translate(0, 0.15, 0), [K3.toon('#2f5a48'), K3.toon('#2f5a48'), K3.toon('#e9e0c6'), K3.toon('#2f5a48'), K3.toon('#2f5a48'), K3.toon('#2f5a48')], { ink: '#14241c', cast: false });
    blot.position.set(R.BOOK.x, 0, R.BOOK.z); still.add(blot);

    /* ---------- the book: open at the dragon story ---------- */
    const B = R.BOOK;
    const leftTex = P.pageTex('pdLeft', B.pw, B.pd, (c, S, r, w, h) => {
      // the Hedge Garden, printed small (the first page of the adventure)
      for (let i = 0; i < 220; i++) P.wash(c, r() * w, r() * h * 0.55 + h * 0.1, S * (0.4 + r()), r() < 0.5 ? '#9cc77a' : '#b6d68c', 0.24, r, { noEdge: r() < 0.6 });
      c.strokeStyle = 'rgba(60,100,50,0.8)'; c.lineWidth = S * 0.35; c.lineCap = 'round';
      c.beginPath(); [[2, 3], [2, 6], [6, 6], [6, 2.5], [10, 2.5], [10, 8], [12, 8]].forEach(([x, y], i) => i ? c.lineTo(x * S, y * S) : c.moveTo(x * S, y * S)); c.stroke();
      c.strokeStyle = '#e8d6a8'; c.lineWidth = S * 0.18; c.stroke();
      c.fillStyle = 'rgba(59,48,64,0.75)'; c.font = 'italic ' + Math.round(S * 0.7) + 'px Georgia, "DejaVu Serif", serif'; c.textAlign = 'center'; c.fillText('The Hedge Garden', w / 2, S * 1.4);
      c.font = 'bold ' + Math.round(S * 0.9) + 'px Georgia, "DejaVu Serif", serif'; c.fillText('The End', w / 2, h - S * 2.4);
    }, { gutter: 'right', num: '38', textBlocks: [[1.2, 10.3, 11.6, 4]] });
    const rightTex = P.pageTex('pdRight', B.pw, B.pd, (c, S, r, w, h) => {
      // the dragon story: a night sky wash, a moon, and the empty outline where the paper dragon was printed
      for (let i = 0; i < 160; i++) P.wash(c, r() * w, r() * h * 0.6 + h * 0.05, S * (0.5 + r()), r() < 0.5 ? '#5a6a9a' : '#7a8ab8', 0.22, r, { noEdge: r() < 0.6 });
      c.fillStyle = 'rgba(255,240,190,0.9)'; c.beginPath(); c.arc(w * 0.78, S * 2.4, S * 1.1, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(59,48,64,0.75)'; c.font = 'italic ' + Math.round(S * 0.7) + 'px Georgia, "DejaVu Serif", serif'; c.textAlign = 'center'; c.fillText('The Paper Dragon', w / 2, S * 1.4);
      c.setLineDash([S * 0.25, S * 0.2]); c.strokeStyle = 'rgba(43,33,48,0.65)'; c.lineWidth = 3;
      c.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40, x = (0.15 + t * 0.7) * w, y = h * 0.36 + Math.sin(t * 9) * S * 0.8; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      c.setLineDash([]);
      for (let i = 0; i < 28; i++) { c.fillStyle = 'rgba(232,184,74,0.7)'; const x = r() * w, y = r() * h * 0.6; c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill(); }
    }, { gutter: 'left', num: '39', textBlocks: [[1.2, 10.3, 11.6, 5]] });
    const book = P.book({ pw: B.pw, pd: B.pd, tex: [leftTex, rightTex] });
    book.position.set(B.x, 1.46 + 0.3, B.z); still.add(book);
    R.art.pageY = 1.76;

    /* ---------- the brass lamp ---------- */
    const L = art.lamp, brassM = K3.mat('brassLamp', () => K3.toon('#c9973a'));
    const lamp = new T.Group(); lamp.position.set(L.x, 0, L.z); still.add(lamp);
    lamp.add(K3.mesh(new T.LatheGeometry([[0, 0], [6, 0], [6.2, 0.7], [4.6, 1.6], [1.2, 2.4], [0.8, 3.2], [0, 3.2]].map(p => new T.Vector2(p[0], p[1])), 48), brassM, { ink: '#4a3410' }));
    lamp.add(K3.mesh(new T.CylinderGeometry(0.62, 0.62, 26, 16).translate(0, 13 + 2.4, 0), brassM, { ink: '#4a3410' }));
    const elbow = new T.Group(); elbow.position.set(0, 28.4, 0); lamp.add(elbow);
    elbow.add(K3.mesh(new T.SphereGeometry(1.1, 16, 12), brassM, { ink: '#4a3410' }));
    const arm = K3.mesh(new T.CylinderGeometry(0.5, 0.5, L.arm, 16).translate(0, L.arm / 2, 0), brassM, { ink: '#4a3410' }); arm.rotation.z = -1.25; arm.rotation.y = -0.6; elbow.add(arm);
    const headP = new T.Vector3(0, L.arm, 0).applyEuler(arm.rotation);
    const shadeG = new T.Group(); shadeG.position.copy(headP); elbow.add(shadeG);
    shadeG.add(K3.mesh(new T.CylinderGeometry(2.4, 7.2, 6.5, 32, 1, true).translate(0, -3.2, 0), K3.toon('#3f6b4a', { side: T.DoubleSide }), { ink: '#16261b' }));
    const bulb = new T.Mesh(new T.SphereGeometry(1.8, 24, 16), K3.flat('#fff3c8')); bulb.position.set(0, -5.2, 0); shadeG.add(bulb);
    const glowTex = K3.paint('glow', 256, 256, (c) => { const gg = c.createRadialGradient(128, 128, 0, 128, 128, 128); gg.addColorStop(0, 'rgba(255,240,200,0.9)'); gg.addColorStop(0.3, 'rgba(255,220,150,0.35)'); gg.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = gg; c.fillRect(0, 0, 256, 256); });
    const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); glow.scale.set(34, 34, 1); bulb.add(glow);
    // a pool of warm lamplight on the desk
    const poolTex = K3.paint('pdPool', 256, 256, (c) => { const gg = c.createRadialGradient(128, 128, 0, 128, 128, 128); gg.addColorStop(0, 'rgba(255,214,140,0.38)'); gg.addColorStop(0.6, 'rgba(255,190,110,0.12)'); gg.addColorStop(1, 'rgba(255,180,100,0)'); c.fillStyle = gg; c.fillRect(0, 0, 256, 256); });
    lamp.updateMatrixWorld(true);
    const bulbW = new T.Vector3(); bulb.getWorldPosition(bulbW); R.art.bulb = [bulbW.x, bulbW.y, bulbW.z];
    const pool = new T.Mesh(new T.PlaneGeometry(90, 90).rotateX(-Math.PI / 2), K3.flat('#ffffff', { map: poolTex, transparent: true, depthWrite: false, add: true }));
    pool.position.set(bulbW.x, 0.08, bulbW.z + 6); live.add(pool);

    /* ---------- the teacup and its steam rings ---------- */
    const CU = art.cup;
    const porcelain = K3.paint('porcelain', 1024, 256, (c, w, h) => {
      c.fillStyle = '#f7f4ee'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#3b63a8'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 30); c.lineTo(w, 30); c.stroke(); c.lineWidth = 2; c.beginPath(); c.moveTo(0, 42); c.lineTo(w, 42); c.stroke();
      c.fillStyle = 'rgba(59,99,168,0.8)';
      for (let i = 0; i < 18; i++) { const x = i * w / 18 + 20, y = 120 + Math.sin(i) * 20; c.beginPath(); c.arc(x, y, 14, 0, Math.PI * 2); c.fill(); for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(x + Math.cos(k * 1.25) * 24, y + Math.sin(k * 1.25) * 24, 10, 5, k * 1.25, 0, Math.PI * 2); c.fill(); } }
    });
    const cupM = K3.toon('#ffffff', { map: porcelain, side: T.DoubleSide });
    const cup = new T.Group(); cup.position.set(CU.x, 0, CU.z); still.add(cup);
    cup.add(K3.mesh(new T.LatheGeometry([[0, 0], [4.5, 0.1], [6.8, 0.6], [7, 0.8], [6.6, 0.75], [3.4, 0.35], [0, 0.35]].map(p => new T.Vector2(p[0], p[1])), 64), cupM, { ink: '#2a3550' }));
    cup.add(K3.mesh(new T.LatheGeometry([[0, 0.3], [2.4, 0.4], [3.6, 2.0], [4.6, 4.4], [5.0, 5.4], [4.8, 5.45], [4.5, 4.6], [3.4, 2.2], [0, 1.0]].map(p => new T.Vector2(p[0], p[1])), 64), cupM, { ink: '#2a3550' }));
    const tea = new T.Mesh(new T.CircleGeometry(4.6, 48).rotateX(-Math.PI / 2), K3.toon('#8a4a1c')); tea.position.y = 4.7; cup.add(tea);
    const handle = K3.mesh(new T.TorusGeometry(1.3, 0.34, 10, 24, Math.PI * 1.3).rotateZ(-Math.PI * 0.65), cupM, { ink: '#2a3550' }); handle.position.set(5.0, 3.3, 0); cup.add(handle);
    // a teaspoon on the saucer
    const spoon = K3.mesh(new T.CapsuleGeometry(0.2, 6, 4, 8).rotateZ(Math.PI / 2), K3.mat('pdSteel', () => K3.toon('#c8ccd4')), { ink: '#3a3e48' }); spoon.position.set(1.2, 0.9, 5.6); spoon.rotation.y = 0.4; cup.add(spoon);
    // the steam: a column of soft wisps from the tea, and three rings on the flight line
    const steamTex = K3.paint('pdSteam', 128, 128, (c) => { const g = c.createRadialGradient(64, 64, 10, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,0.0)'); g.addColorStop(0.55, 'rgba(255,255,255,0.55)'); g.addColorStop(0.75, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
    const steamM = K3.flat('#ffffff', { transparent: true, opacity: 0.6, depthWrite: false, map: steamTex });
    const rings = [];
    for (const sr of art.steam) {
      const fr = R.at(sr.s), at = R.local(sr.s, sr.ox, sr.oy, fr);
      const ring = new T.Mesh(new T.TorusGeometry(2.7, 0.5, 12, 40), K3.toon('#ffffff', { transparent: true, opacity: 0.55, depthWrite: false }));
      ring.position.set(...at); faceRail(ring, fr);
      live.add(ring); rings.push({ m: ring, base: at.slice() });
    }
    const wisps = [];
    for (let i = 0; i < 16; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0.5 })); live.add(sp); wisps.push(sp); }

    /* ---------- the pencil pot's forest ---------- */
    const PT = art.pot;
    const potTex = K3.paint('pdPotTex', 1024, 256, (c, w, h) => {
      c.fillStyle = '#2f5a48'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#c9a24a'; for (let x = 0; x < w; x += 48) { c.beginPath(); c.arc(x + 24, h / 2, 12, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = '#c9a24a'; c.lineWidth = 6; for (const y of [18, h - 18]) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      const r = P.rng(551); for (let i = 0; i < 900; i++) { c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)'; c.fillRect(r() * w, r() * h, 2, 2); }
    }, { repeat: true });
    const pot = new T.Group(); pot.position.set(PT.x, 0, PT.z); still.add(pot);
    pot.add(K3.mesh(new T.CylinderGeometry(PT.r, PT.r * 0.92, PT.h, 48, 1, true).translate(0, PT.h / 2, 0), K3.toon('#ffffff', { map: potTex, side: T.DoubleSide }), { ink: '#14241c' }));
    pot.add(K3.mesh(new T.TorusGeometry(PT.r, 0.28, 8, 48).rotateX(Math.PI / 2).translate(0, PT.h, 0), K3.toon('#c9a24a'), { ink: '#4a3410' }));
    pot.add(new T.Mesh(new T.CircleGeometry(PT.r - 0.2, 32).rotateX(-Math.PI / 2).translate(0, PT.h - 1.2, 0), K3.toon('#1a2a22')));
    const pencil = (col, len, r0 = 0.42) => {
      const p = new T.Group();
      if (col === 'brush') {
        p.add(K3.mesh(new T.CylinderGeometry(r0 * 0.8, r0 * 1.1, len, 12).translate(0, len / 2, 0), K3.mat('pdBrushH', () => K3.toon('#c8403a')), { ink: '#4a1410' }));
        p.add(K3.mesh(new T.CylinderGeometry(r0 * 0.9, r0 * 0.8, 2, 12).translate(0, len + 1, 0), K3.mat('pdFerrule', () => K3.toon('#c8ccd4')), { ink: '#3a3e48' }));
        p.add(K3.mesh(new T.ConeGeometry(r0 * 0.9, 2.6, 12).rotateX(Math.PI).translate(0, len + 2 + 1.3, 0).rotateX(Math.PI).translate(0, 2 * (len + 3.3), 0), K3.mat('pdBristle', () => K3.toon('#3a2a1a')), { ink: '#120a06' }));
        return p;
      }
      p.add(K3.mesh(new T.CylinderGeometry(r0, r0, len, 6).translate(0, len / 2, 0), K3.mat('cp|' + col, () => K3.toon(col)), { ink: mixHex(col, '#141428', 0.6) }));
      p.add(K3.mesh(new T.ConeGeometry(r0, 1.4, 6).translate(0, len + 0.7, 0), K3.mat('cpWood', () => K3.toon('#e2b47c')), { ink: '#6b4a24' }));
      p.add(K3.mesh(new T.ConeGeometry(0.14, 0.46, 6).translate(0, len + 1.17, 0), K3.mat('cpTip|' + col, () => K3.toon(mixHex(col, '#141428', 0.25))), { ink: false }));
      // a gold printed band and the maker's stamp
      p.add(K3.mesh(new T.CylinderGeometry(r0 + 0.01, r0 + 0.01, 0.3, 6).translate(0, len * 0.2, 0), K3.mat('pdBand', () => K3.toon('#e2c05a')), { ink: false, cast: false }));
      return p;
    };
    for (const st of art.potSticks) { const p = pencil(st.col, st.h, st.r); p.position.set(st.x, 0, st.z); still.add(p); }

    /* ---------- the stack of books ---------- */
    for (const b of art.stack) {
      const titleTex = K3.paint('pdSpineT|' + b.title, 256, 64, (c, w, h) => { c.fillStyle = b.col; c.fillRect(0, 0, w, h); c.strokeStyle = '#d9b450'; c.lineWidth = 3; c.strokeRect(8, 6, w - 16, h - 12); c.fillStyle = '#e8c86a'; c.font = 'bold 30px Georgia, "DejaVu Serif", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.title, w / 2, h / 2 + 2); });
      const pages = K3.mat('pdPageEdge', () => K3.toon('#efe4c8'));
      const coverM = K3.mat('pdCover|' + b.col, () => K3.toon(b.col)), spineM = K3.toon('#ffffff', { map: titleTex });
      const m = K3.mesh(new T.BoxGeometry(b.w, b.h, b.d), [pages, spineM, coverM, coverM, pages, pages], { ink: '#1b1410' });
      m.position.set(b.x, b.y + b.h / 2, b.z); m.rotation.y = b.yaw; still.add(m);
    }
    // a sleepy reading cat ornament? No: a pair of spectacles folded on top of the stack
    /* ---------- the ink bottle and quill ---------- */
    const IN = art.ink;
    const inkG = new T.Group(); inkG.position.set(IN.x, 0, IN.z); still.add(inkG);
    inkG.add(K3.mesh(new T.LatheGeometry([[0, 0], [3.0, 0], [3.2, 0.3], [3.2, 3.6], [2.6, 4.4], [1.5, 4.6], [1.4, 6.0], [1.7, 6.2], [1.7, 6.6], [0, 6.6]].map(p => new T.Vector2(p[0], p[1])), 40), K3.toon('#26324a'), { ink: '#0c0f18' }));
    const labelTex = K3.paint('pdInkLabel', 512, 128, (c, w, h) => { c.fillStyle = '#efe4c8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2b2130'; c.lineWidth = 4; c.strokeRect(6, 6, w - 12, h - 12); c.fillStyle = '#2b2130'; c.font = 'bold 54px Georgia, "DejaVu Serif", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('INDIA INK', w / 2, h / 2); });
    inkG.add(K3.mesh(new T.CylinderGeometry(3.25, 3.25, 1.8, 40, 1, true, -0.8, 1.6).translate(0, 1.9, 0), K3.toon('#ffffff', { map: labelTex, side: T.DoubleSide }), { ink: false }));
    const quill = new T.Group(); still.add(quill);
    {
      const a = v3([IN.x, 5.5, IN.z]), b = v3([IN.x + 5.5, 16, IN.z + 2.2]), dir = b.clone().sub(a), len = dir.length();
      quill.position.copy(a); quill.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
      quill.add(K3.mesh(new T.CylinderGeometry(0.12, 0.2, len, 8).translate(0, len / 2, 0), K3.toon('#e8e0d0'), { ink: '#4a4030' }));
      const vane = new T.Shape(); vane.moveTo(0, 2); vane.quadraticCurveTo(1.6, len * 0.5, 0.2, len + 0.6); vane.quadraticCurveTo(-1.2, len * 0.6, 0, 2);
      const v = P.card(vane, { col: '#f2ede2', depth: 0.04, ink: '#6a6050' }); quill.add(v);
    }
    /* ---------- the ruler, the jam jar, the cobweb ---------- */
    const RU = art.ruler, JA = art.jar;
    const rulerTex = K3.paint('pdRuler', 64, 1024, (c, w, h) => { c.fillStyle = '#e8c88a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3a2a18'; c.fillStyle = '#3a2a18'; c.font = '14px Georgia, serif'; for (let i = 0; i <= 60; i++) { const y = 6 + i * (h - 12) / 60, l = i % 10 ? (i % 5 ? 10 : 18) : 26; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, y); c.lineTo(l, y); c.stroke(); if (i % 10 === 0 && i < 60) c.fillText(String(i / 10), 30, y + 5); } });
    const ruler = K3.mesh(new T.BoxGeometry(2.8, RU.h, 0.4), [K3.toon('#d4b070'), K3.toon('#d4b070'), K3.toon('#d4b070'), K3.toon('#d4b070'), K3.toon('#ffffff', { map: rulerTex }), K3.toon('#ffffff', { map: rulerTex })], { ink: '#5a4020' });
    ruler.position.set(RU.x, RU.h / 2, RU.z); ruler.rotation.y = RU.yaw; still.add(ruler);
    // the jam jar: see-through glass with buttons inside and a gingham lid
    const jar = new T.Group(); jar.position.set(JA.x, 0, JA.z); still.add(jar);
    const glass = new T.Mesh(new T.CylinderGeometry(JA.r, JA.r, JA.h - 1, 32, 1, true).translate(0, (JA.h - 1) / 2, 0), K3.toon('#cfe6ee', { transparent: true, opacity: 0.35, side: T.DoubleSide, depthWrite: false }));
    jar.add(glass); K3.ink(glass, '#5a7480', 0.8);
    const ging = K3.paint('pdGingham', 128, 128, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(200,52,62,0.55)'; for (let i = 0; i < w; i += 32) { c.fillRect(i, 0, 16, h); c.fillRect(0, i, w, 16); } });
    jar.add(K3.mesh(new T.CylinderGeometry(JA.r + 0.25, JA.r + 0.25, 1.2, 32).translate(0, JA.h - 0.4, 0), K3.toon('#ffffff', { map: ging }), { ink: '#5a1418' }));
    { const r = P.rng(561), cols = ['#e86a6a', '#f2c14e', '#6ac48a', '#8a6ad4', '#f6f0e0']; for (let i = 0; i < 26; i++) { const bt = K3.mesh(K3.geo('pdButton', () => new T.CylinderGeometry(0.7, 0.7, 0.3, 16)), K3.mat('pdBtn' + (i % 5), () => K3.toon(cols[i % 5])), { ink: '#2b2130', inkW: 0.6 }); const a = r() * Math.PI * 2, rr = r() * (JA.r - 0.8); bt.position.set(Math.cos(a) * rr, 0.2 + i * 0.12, Math.sin(a) * rr); bt.rotation.set(r() * 3, r() * 3, 0); jar.add(bt); } }
    // the cobweb: a cut-paper web, white strands with a hole pattern, across the flight line
    const webTex = K3.paint('pdWebTex', 512, 512, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(252,248,236,1)'; c.lineCap = 'round';
      const cx = w / 2, cy = h / 2, spokes = 12;
      c.lineWidth = 7; for (let i = 0; i < spokes; i++) { const a = i / spokes * Math.PI * 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * 250, cy + Math.sin(a) * 250); c.stroke(); }
      c.lineWidth = 5; for (let rr = 30; rr < 250; rr += 26) { c.beginPath(); for (let i = 0; i <= spokes; i++) { const a = i / spokes * Math.PI * 2, rb = rr - 6 * Math.sin(i * 2.1); const x = cx + Math.cos(a) * rb, y = cy + Math.sin(a) * rb; if (!i) c.moveTo(x, y); else { const am = (i - 0.5) / spokes * Math.PI * 2; c.quadraticCurveTo(cx + Math.cos(am) * (rb - 8), cy + Math.sin(am) * (rb - 8), x, y); } } c.stroke(); }
      c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(160,150,140,0.35)'; c.fillRect(0, h / 2, w, h / 2); c.globalCompositeOperation = 'source-over';
    });
    const webM = K3.toon('#ffffff', { map: webTex, transparent: true, alphaTest: 0.3, side: T.DoubleSide });
    const webFr = R.at(art.web.s), webAt = R.local(art.web.s, 0, 0.4, webFr);
    const web = new T.Mesh(new T.CircleGeometry(7.6, 48), webM);
    web.position.set(...webAt); faceRail(web, webFr); web.castShadow = true;
    live.add(web); K3.ink(web, '#8a8070', 0.5);
    // strands anchoring the web to the ruler's top and the jar's lid
    const strandM = K3.mat('pdStrand', () => K3.toon('#f6f2e6'));
    const strands = [];
    for (const to of [[RU.x, RU.h - 0.5, RU.z], [JA.x, JA.h, JA.z], [RU.x, 2, RU.z], [JA.x + 1, 0.2, JA.z - 2]]) {
      const a = v3(webAt), b = v3(to), dv = b.clone().sub(a), len = dv.length();
      const m = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, len, 4).translate(0, len / 2, 0), strandM); m.position.copy(a); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dv.normalize()); live.add(m); strands.push(m);
    }
    /* ---------- desk clutter (the kit's desk) ---------- */
    const clutter = P.desk({ dy: 0, at: { pencils: [26, -22, 0.4], eraser: [44, -26, -0.3], scissors: [-58, 22, 0.8], clips: [56, 24, 0.2], glasses: [12, 30, 0.3], ball1: [-62, -22, 0], ball2: [58, -26, 0], fern: [64, -24, 0] } });
    still.add(clutter);

    /* ---------- stars: one batched family, gold foil folded points ---------- */
    const starShape = new T.Shape();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? 0.26 : 0.6; i ? starShape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : starShape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    starShape.closePath();
    const starGeo = K3.geo('pdStarGeo', () => { const g = new T.ExtrudeGeometry(starShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.08, bevelSegments: 1 }); g.translate(0, 0, -0.04); return g; });
    const foil = K3.paint('pdFoil', 128, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#fff1a0'); g.addColorStop(0.5, '#f2c440'); g.addColorStop(1, '#d99a1a'); c.fillStyle = g; c.fillRect(0, 0, w, h); const r = P.rng(571); for (let i = 0; i < 200; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,230,0.4)' : 'rgba(160,100,0,0.2)'; c.fillRect(r() * w, r() * h, 2, 2); } });
    const starM = K3.toon('#ffffff', { map: foil, emissive: '#6a4a00', emissiveIntensity: 0.55 });
    const starInkM = new T.MeshBasicMaterial({ color: new T.Color('#5a3a08'), side: T.BackSide });
    const NST = R.stars.length;
    const starsI = new T.InstancedMesh(starGeo, starM, NST), starsInk = new T.InstancedMesh(starGeo, starInkM, NST);
    starsI.castShadow = true; starsI.frustumCulled = false; starsInk.frustumCulled = false;
    live.add(starsInk); live.add(starsI);
    const starPos = R.stars.map(s => R.local(s.s, s.ox, s.oy));
    // a soft gold glow sprite behind every star (they must read in the dark stretches)
    const sparkTex = K3.paint('pdSpark', 128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,230,140,0.45)'); g.addColorStop(0.4, 'rgba(255,200,80,0.14)'); g.addColorStop(1, 'rgba(255,190,60,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
    const glows = new T.Group(); live.add(glows);
    const glowSprites = starPos.map(p => { const sp = new T.Sprite(new T.SpriteMaterial({ map: sparkTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.8 })); sp.position.set(...p); sp.scale.set(1.7, 1.7, 1); glows.add(sp); return sp; });

    /* ---------- bookmark hoops: red silk ribbon rings with a tasselled tail ---------- */
    const silk = K3.paint('pdHoopSilk', 256, 32, (c, w, h) => { c.fillStyle = '#c8243a'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 3) { c.fillStyle = x % 6 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'; c.fillRect(x, 0, 1.5, h); } c.fillStyle = '#e8c45a'; c.fillRect(0, 0, w, 3); c.fillRect(0, h - 3, w, 3); }, { repeat: true });
    silk.repeat.set(12, 1);
    const hoopM = K3.toon('#ffffff', { map: silk });
    const hoops = R.hoops.map((h, i) => {
      const fr = R.at(h.s), at = R.local(h.s, 0, 0, fr);
      const g = new T.Group(); g.position.set(...at); faceRail(g, fr); live.add(g);
      const ring = K3.mesh(new T.TorusGeometry(4.2, 0.26, 10, 64).scale(1, 0.8, 0.45), hoopM, { ink: '#4a0a14', inkW: 1 }); g.add(ring);
      for (const sx of [-1, 1]) {
        const tail = P.card(P.shapeFrom([[-0.22, 0], [0.22, 0], [0.22, -4.2], [0, -3.7], [-0.22, -4.2]]), { mat: hoopM, depth: 0.02, ink: '#4a0a14', inkW: 0.8 });
        tail.position.set(sx * 0.35, -3.36, 0); tail.rotation.z = sx * 0.12; g.add(tail);
      }
      const ts = K3.mesh(new T.ConeGeometry(0.35, 1.0, 10), K3.mat('pdGold', () => K3.toon('#e8b84a')), { ink: '#5a3d14' }); ts.position.set(0, 3.36 + 0.2, 0); g.add(ts);
      return { g, ring, s: h.s };
    });

    /* ---------- gold signs on sticks ---------- */
    const signTex = (kind, dir) => K3.paint('pdSign|' + kind + dir, 256, 256, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffe27a'); g.addColorStop(1, '#e8a82a'); c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, 124, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#2b2130'; c.lineWidth = 10; c.stroke(); c.strokeStyle = '#fffbe8'; c.lineWidth = 5; c.beginPath(); c.arc(w / 2, h / 2, 108, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#2b2130'; c.save(); c.translate(w / 2, h / 2);
      if (kind === 'swoop') {
        c.rotate({ left: Math.PI, right: 0, up: -Math.PI / 2, down: Math.PI / 2 }[dir] || 0);
        for (const x of [-34, 22]) { c.beginPath(); c.moveTo(x - 26, -50); c.lineTo(x + 30, 0); c.lineTo(x - 26, 50); c.lineTo(x - 26, 22); c.lineTo(x + 2, 0); c.lineTo(x - 26, -22); c.closePath(); c.fill(); }
      } else if (kind === 'tuck') {
        for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 8, -50); c.lineTo(sx * 60, 30); c.lineTo(sx * 40, 34); c.lineTo(sx * 8, 50); c.closePath(); c.fill(); }
      } else {
        // fire: a confetti flame
        c.beginPath(); c.moveTo(0, -70); c.bezierCurveTo(50, -20, 50, 40, 0, 62); c.bezierCurveTo(-50, 40, -46, -10, -10, -28); c.bezierCurveTo(-8, -6, 4, -2, 0, -70); c.fill();
        c.fillStyle = '#ff7a4a'; c.beginPath(); c.arc(0, 30, 18, 0, Math.PI * 2); c.fill();
        const cols = ['#f25a8a', '#4ac4e8', '#8ad45a', '#fff']; for (let i = 0; i < 12; i++) { c.fillStyle = cols[i % 4]; c.fillRect(-80 + (i * 37) % 160, -80 + (i * 53) % 160, 10, 6); }
      }
      c.restore();
    });
    const stickM = K3.mat('pdStick', () => K3.toon('#c89a5a'));
    const signs = R.signs.map(sg => {
      const fr = R.at(sg.s), at = R.local(sg.s, sg.ox, sg.oy, fr);
      const g = new T.Group(); g.position.set(...at); faceRail(g, { t: [-fr.t[0], 0, -fr.t[2]].map((v, i, a) => v / (Math.hypot(a[0], a[2]) || 1)), u: [0, 1, 0] }); live.add(g);
      const face = K3.mesh(new T.CylinderGeometry(1.25, 1.25, 0.12, 40).rotateX(Math.PI / 2), [K3.toon(P.EDGE), K3.toon('#ffffff', { map: signTex(sg.kind, sg.dir) }), K3.toon('#e8b84a')], { ink: INK, inkW: 1 });
      g.add(face);
      const down = at[1] - (R.DESK + 0.1) > 0 && at[1] < 30 ? at[1] - R.DESK : 10;
      g.add(K3.mesh(new T.CylinderGeometry(0.09, 0.09, down, 8).translate(0, -down / 2 - 1.2, -0.1), stickM, { ink: '#4a3010', inkW: 0.6 }));
      return { g, s: sg.s };
    });

    /* ---------- the runaway page ---------- */
    const pageTex2 = K3.paint('pdLoosePage', 256, 340, (c, w, h) => {
      P.paper(c, w, h, P.CREAM, 581);
      c.fillStyle = 'rgba(59,48,64,0.7)'; c.font = 'italic 22px Georgia, "DejaVu Serif", serif'; c.textAlign = 'center'; c.fillText('Chapter Twelve', w / 2, 40);
      c.fillStyle = 'rgba(59,48,64,0.3)'; for (let y = 64; y < h - 50; y += 12) c.fillRect(24, y, w - 48 - (y % 72 === 64 ? 60 : 0), 5);
      c.fillStyle = 'rgba(59,48,64,0.55)'; c.font = 'italic 18px Georgia, serif'; c.fillText('40', w / 2, h - 20);
    });
    const pageGeo = new T.PlaneGeometry(2.6, 3.4, 10, 12);
    const page = new T.Mesh(pageGeo, K3.toon('#ffffff', { map: pageTex2, side: T.DoubleSide })); page.castShadow = true; live.add(page);
    K3.ink(page, '#8a7550', 0.6);
    const pageBase = pageGeo.attributes.position.array.slice();

    /* ---------- bake what never moves ---------- */
    const bakeInfo = K3.bake(still);

    /* ---------- every drawn frame ---------- */
    const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3(), eul = new T.Euler();
    function tick(st, t, dt) {
      // stars spin slowly and bob; collected ones are gone (they burst into sparkles in the 2D layer)
      for (let i = 0; i < NST; i++) {
        const got = st.got && st.got[i], p = starPos[i];
        ps.set(p[0], p[1] + Math.sin(t * 2.2 + i) * 0.12, p[2]);
        eul.set(0, t * 1.6 + i * 0.7, Math.sin(t + i) * 0.15); q.setFromEuler(eul);
        sc.setScalar(got ? 0 : 1); m4.compose(ps, q, sc); starsI.setMatrixAt(i, m4);
        sc.setScalar(got ? 0 : 1.13); m4.compose(ps, q, sc); starsInk.setMatrixAt(i, m4);
        glowSprites[i].visible = !got;
      }
      starsI.instanceMatrix.needsUpdate = true; starsInk.instanceMatrix.needsUpdate = true;
      // steam rings breathe and drift; wisps rise off the tea
      rings.forEach((r, i) => { r.m.position.set(r.base[0] + Math.sin(t * 0.8 + i) * 0.25, r.base[1] + Math.sin(t * 1.1 + i * 2) * 0.2, r.base[2]); const k = 1 + Math.sin(t * 1.7 + i) * 0.05; r.m.scale.set(k, k, k); });
      wisps.forEach((w, i) => { const ph = (t * 0.22 + i / wisps.length) % 1; w.position.set(CU.x + Math.sin(i * 2.3 + t * 0.7) * 1.6 * (0.4 + ph), 5 + ph * 14, CU.z + Math.cos(i * 1.7 + t * 0.6) * 1.6 * (0.4 + ph)); const s2 = 2 + ph * 5; w.scale.set(s2, s2, 1); w.material.opacity = 0.42 * Math.sin(ph * Math.PI); });
      // the web: whole, or burning away (shrivels, browns, drops)
      const bt = st.burnt && st.burnt.web1;
      if (bt != null) {
        const u = clamp((st.clock - bt) / 0.8, 0, 1);
        web.scale.setScalar(Math.max(0.001, 1 - u)); web.material.color.setRGB(1 - u * 0.5, 1 - u * 0.65, 1 - u * 0.8); web.visible = u < 1;
        strands.forEach(m => { m.visible = u < 0.5; });
      } else { web.scale.setScalar(1); web.visible = true; web.material.color.setRGB(1, 1, 1); strands.forEach(m => { m.visible = true; }); }
      // hoops ripple after the dragon flies through
      hoops.forEach(h => { const pass = st.s - h.s; h.ring.scale.setScalar(pass > 0 && pass < 6 ? 1 + Math.sin(pass * 3) * 0.08 * (1 - pass / 6) : 1); h.ring.rotation.z = Math.sin(t * 0.9 + h.s) * 0.04; });
      signs.forEach((sg, i) => { sg.g.children[0].rotation.z = Math.sin(t * 2 + i) * 0.06; });
      // the page tumbles and glides ahead of the dragon on the draught
      const pg = st.page;
      if (pg) {
        page.position.set(...pg.pos);
        page.rotation.set(pg.rx, pg.ry, pg.rz);
        const a = pageGeo.attributes.position;
        for (let i = 0; i < a.count; i++) { const x = pageBase[i * 3], y = pageBase[i * 3 + 1]; a.setZ(i, Math.sin(x * 1.4 + t * 5) * 0.18 + Math.sin(y * 1.1 + t * 3.4) * 0.14 + x * x * 0.05); }
        a.needsUpdate = true; pageGeo.computeVertexNormals();
        page.visible = true;
      } else page.visible = false;
    }
    return { tick, bakeInfo, still, live };
  };
  return A;
})();
