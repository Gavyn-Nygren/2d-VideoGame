/* Pip & Bo - 41-3 Paper Dragon Flight: stretch 3, the bedroom. Drawing only (three.js through K3D.T, inside build()).
   The bed (its head against the right-hand wall) with the sleeping Reader under a breathing quilt, the teddy, the
   striped sleeve hanging over the edge; the planet mobile and the ceiling lamp hanging from the roof; the round rug;
   the dark under the bed (the shoeboxes, a fallen slat, the board games and the toy chest, the lost marble, fluff);
   the toadstool night-light; and the cat, who wakes, swipes, jumps down, pounces, follows the dragon round the room
   and up the curtain, and at the very end peeps over the edge of the desk. Places come from POPDRAGON_ROUTE
   (popdragon-stretches.js); the cat's swipes and pounce are the rules' paws, shown winding up for 1.2 s.
   POPDRAGON_BEDROOM.build(K, still, live, mood) adds them; returns { tick(st, t, dt), cat }.
*/
'use strict';

const POPDRAGON_BEDROOM = (function () {
  const A = {};
  A.build = function (K, still, live, mood) {
    const T = K3D.T, K3 = K3D, P = POPUP, R = POPDRAGON_ROUTE, art = R.art, BD = art.bed, F = R.FLOOR, PI = Math.PI, pl = R.place;
    const rng = P.rng(8101);
    const softTex = K3.paint('pdSoft', 64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
    const INKW = '#1a0e06';

    /* ---------- the bed ---------- */
    const frameM = K3.mat('pdBedFrame', () => K3.toon('#7a4a2c')), frameDark = K3.mat('pdBedDark', () => K3.toon('#5a341c'));
    const L = BD.x1 - BD.x0, Wd = BD.z1 - BD.z0;
    for (const [x, z] of [[BD.x0 + 3, BD.z0 + 3], [BD.x1 - 3, BD.z0 + 3], [BD.x0 + 3, BD.z1 - 3], [BD.x1 - 3, BD.z1 - 3]]) {
      const leg = K3.mesh(new T.LatheGeometry([[0, 0], [2.2, 0], [2.6, 1.5], [1.8, 4], [2.4, 8], [1.8, 12], [2.6, 16], [0, 16]].map(p => new T.Vector2(p[0], p[1])), 20), frameDark, { ink: INKW }); leg.position.set(x, F, z); still.add(leg);
    }
    // the frame's side rails and the slats under the mattress (seen from under the bed)
    for (const z of [BD.z0 + 1, BD.z1 - 1]) { const rail = K3.mesh(new T.BoxGeometry(L, 6, 2).translate(0, -15, 0), frameM, { ink: INKW }); rail.position.set(BD.x, 0, z); still.add(rail); }
    for (const x of [BD.x0 + 1, BD.x1 - 1]) { const rail = K3.mesh(new T.BoxGeometry(2, 6, Wd).translate(0, -15, 0), frameM, { ink: INKW }); rail.position.set(x, 0, BD.z); still.add(rail); }
    for (let x = BD.x0 + 6; x < BD.x1 - 4; x += 7.5) { if (Math.abs(x - 318) < 3) continue; const sl = K3.mesh(K3.geo('pdBedSlat', () => new T.BoxGeometry(5, 1.2, Wd - 4)), frameDark, { ink: INKW, inkW: 0.6, cast: false }); sl.position.set(x, BD.legTop + 0.6 + 0.4, BD.z); still.add(sl); }
    // the mattress (ticking stripes) and the bottom sheet
    const ticking = K3.paint('pdTicking', 512, 128, (c, w, h) => { c.fillStyle = '#f2ece0'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 24) { c.fillStyle = 'rgba(60,90,140,0.55)'; c.fillRect(x, 0, 6, h); c.fillStyle = 'rgba(60,90,140,0.25)'; c.fillRect(x + 10, 0, 2, h); } }, { repeat: true });
    ticking.repeat.set(6, 1);
    const matt = K3.mesh(K3.roundBox(L - 4, BD.top - BD.frame, Wd - 2, 1.2, 24), [K3.toon('#ffffff', { map: ticking })], { ink: '#5a5a6a' });
    matt.position.set(BD.x - 1, (BD.top + BD.frame) / 2 - 0.3, BD.z); still.add(matt);
    // the headboard against the wall, a scalloped top with painted stars; a low footboard
    const hbTex = K3.paint('pdHeadboard', 512, 256, (c, w, h) => {
      c.fillStyle = '#6a8ac0'; c.fillRect(0, 0, w, h);
      const r = P.rng(8111); for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h * 0.8, s = 4 + r() * 8; c.fillStyle = r() < 0.7 ? '#ffe27a' : '#ffffff'; c.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * PI * 2 - PI / 2, rr = k % 2 ? s * 0.45 : s; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); }
      c.fillStyle = '#f2ead6'; c.beginPath(); c.arc(w * 0.5, h * 0.4, 46, 0, PI * 2); c.fill(); c.fillStyle = '#6a8ac0'; c.beginPath(); c.arc(w * 0.5 + 22, h * 0.36, 40, 0, PI * 2); c.fill();
    });
    {
      const hb = new T.Shape(); hb.moveTo(-Wd / 2, 0); hb.lineTo(-Wd / 2, 40); for (let i = 0; i <= 4; i++) { const x0 = -Wd / 2 + i * Wd / 4; if (i < 4) hb.quadraticCurveTo(x0 + Wd / 8, 50, x0 + Wd / 4, 40); } hb.lineTo(Wd / 2, 0); hb.closePath();
      const g = new T.ExtrudeGeometry(hb, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2 });
      { const uv = g.attributes.uv, pa = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pa.getX(i) + Wd / 2) / Wd, pa.getY(i) / 50); }
      const m = K3.mesh(g, [K3.toon('#ffffff', { map: hbTex }), frameM], { ink: INKW }); m.rotation.y = -PI / 2; m.position.set(BD.x1 - 0.2, -14, BD.z); still.add(m);
      const fb = K3.mesh(new T.BoxGeometry(2.4, 22, Wd + 2).translate(0, 11, 0), frameM, { ink: INKW }); fb.position.set(BD.x0 - 0.6, -18, BD.z); still.add(fb);
      for (const z of [BD.z0, BD.z1]) { const knob = K3.mesh(K3.geo('pdBedKnob', () => new T.SphereGeometry(1.8, 14, 10)), frameDark, { ink: INKW }); knob.position.set(BD.x0 - 0.6, 5.6, z); still.add(knob); }
    }

    /* ---------- the Reader, asleep (built in the bed's own frame: its head end is local -z) ---------- */
    const bedG = new T.Group(); bedG.position.set(BD.x, F + 13, BD.z); bedG.rotation.y = -PI / 2; still.add(bedG);
    const sheetM = K3.mat('pdSheet', () => K3.toon('#f2ece0'));
    bedG.add(K3.mesh(K3.roundBox(40, 6, 17, 0.35, 24).translate(0, 25, -44), sheetM, { ink: '#6a6050' }));            // the pillow
    const skinM = K3.mat('pdSkin', () => K3.toon('#f0c4a0')), hairM = K3.mat('pdHair', () => K3.toon('#6a3e22'));
    const head = new T.Group(); head.position.set(-4, 35.5 - 21 + 21, -41); head.rotation.set(-0.15, 0.3, 0.2); bedG.add(head);
    head.add(K3.mesh(new T.SphereGeometry(5.6, 32, 24), skinM, { ink: '#6a3a28' }));
    head.add(K3.mesh(new T.SphereGeometry(5.9, 32, 24, 0, PI * 2, 0, PI * 0.42).rotateX(-0.75), hairM, { ink: '#2a160a' }));
    for (const [x, y, z, s] of [[-4.8, 2.2, -2.2, 1.7], [4.6, 2.6, -1.8, 1.6], [0.4, 5.0, -3.2, 2.0], [-2.4, 5.0, 0.4, 1.4], [2.6, 5.1, 0.8, 1.3]]) { const tuft = K3.mesh(K3.geo('pdTuft', () => new T.SphereGeometry(1, 16, 12)), hairM, { ink: '#2a160a' }); tuft.position.set(x, y, z); tuft.scale.setScalar(s); head.add(tuft); }
    for (const sx of [-1, 1]) { const lid = K3.mesh(K3.geo('pdLid', () => new T.TorusGeometry(0.9, 0.2, 6, 14, PI).rotateZ(PI)), K3.mat('pdLash', () => K3.toon('#3a2218')), { ink: false }); lid.position.set(sx * 2.1, 0.3, 5.3); head.add(lid); }
    { const nose = K3.mesh(new T.SphereGeometry(0.75, 12, 10), skinM, { ink: '#6a3a28', inkW: 0.6 }); nose.position.set(0, -0.8, 5.6); head.add(nose); }
    for (const sx of [-1, 1]) { const ck = new T.Mesh(K3.geo('pdBlushG', () => new T.CircleGeometry(1.1, 16)), K3.mat('pdBlush', () => K3.toon('#f08a8a'))); ck.position.set(sx * 3.2, -1.4, 4.8); ck.rotation.y = sx * 0.55; head.add(ck); }
    // an open mouth, mid-snore
    { const mo = new T.Mesh(new T.SphereGeometry(0.75, 12, 8).scale(1, 0.6, 0.4), K3.toon('#7a3030')); mo.position.set(0.3, -2.6, 5.1); head.add(mo); }
    const stripes = K3.paint('pdPyjama', 128, 64, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f2ead6' : '#2f8a8a'; c.fillRect(i * w / 8, 0, w / 8, h); } }, { repeat: true });
    stripes.repeat.set(1, 3);
    const sleeveM = K3.toon('#ffffff', { map: stripes });
    const limb = (a, b, r0, r1, mat) => { const A2 = new T.Vector3(...a), B2 = new T.Vector3(...b), d = B2.clone().sub(A2), len = d.length(); const m = K3.mesh(new T.CylinderGeometry(r1, r0, len, 20).translate(0, len / 2, 0), mat, { ink: '#1a4a4a' }); m.position.copy(A2); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); bedG.add(m); return m; };
    limb([22, 26, -20], [39, 25.4, -14], 3.2, 2.9, sleeveM);
    limb([39.5, 25.4, -14], [42.5, 9, -12], 2.9, 2.5, sleeveM);
    { const cuff = K3.mesh(new T.TorusGeometry(2.55, 0.5, 8, 20), K3.mat('pdCuff', () => K3.toon('#2f8a8a')), { ink: '#1a4a4a' }); cuff.position.set(42.4, 9.4, -12); cuff.rotation.x = PI / 2 + 0.2; bedG.add(cuff);
      const hand = K3.mesh(K3.roundBox(4.2, 5.4, 2.4, 0.5, 20).translate(0, -5.4, 0), skinM, { ink: '#6a3a28' }); hand.position.set(42.6, 9, -12); hand.rotation.z = 0.12; bedG.add(hand);
      for (let i = 0; i < 4; i++) { const fg2 = K3.mesh(K3.geo('pdFinger', () => new T.CapsuleGeometry(0.5, 2.6, 4, 10)), skinM, { ink: '#6a3a28', inkW: 0.6 }); fg2.position.set(41.2 + i * 0.95, 0.6 - Math.abs(i - 1.5) * 0.3, -12); bedG.add(fg2); } }
    bedG.add(K3.mesh(new T.CapsuleGeometry(2.4, 62, 6, 16).rotateZ(PI / 2).translate(0, 27.5, -31), sheetM, { ink: '#6a6050' }));      // the turned-down sheet
    { const ted = new T.Group(); ted.position.set(-24, 24.5, -37); ted.rotation.set(-0.3, 0.5, 0.15); bedG.add(ted);
      const fur = K3.mat('pdTed', () => K3.toon('#a8784a')), pale = K3.mat('pdTedP', () => K3.toon('#e2c49a'));
      const add = (geo, mat, x, y, z, s = 1) => { const m = K3.mesh(geo, mat, { ink: '#3a2414' }); m.position.set(x, y, z); m.scale.setScalar(s); ted.add(m); };
      const ball = K3.geo('pdTedBall', () => new T.SphereGeometry(1, 20, 14));
      add(ball, fur, 0, 3, 0, 3.6); add(ball, fur, 0, 8.6, 0.4, 2.8); add(ball, fur, -2.3, 10.8, 0, 1.1); add(ball, fur, 2.3, 10.8, 0, 1.1);
      add(ball, pale, 0, 7.8, 2.8, 1.2); add(ball, pale, 0, 3.4, 3, 2); add(ball, K3.mat('pdTedN', () => K3.toon('#2b2130')), 0, 8.3, 3.9, 0.45);
      for (const sx of [-1, 1]) { add(ball, K3.mat('pdTedN', () => K3.toon('#2b2130')), sx * 1.1, 9.4, 2.4, 0.32); add(ball, fur, sx * 3.6, 4, 0.6, 1.4); } }
    // a storybook left open on the quilt by the Reader's hand
    { const sb = K3.mesh(new T.BoxGeometry(9, 0.6, 6), [K3.toon('#efe4c8'), K3.toon('#efe4c8'), K3.toon('#f8f0dc'), K3.toon('#3a6a8a'), K3.toon('#efe4c8'), K3.toon('#efe4c8')], { ink: '#2b2130' }); sb.position.set(300, 9.8, 108); sb.rotation.set(0.1, 0.4, -0.05); still.add(sb); }

    // the quilt: patchwork, draped over the sleeper; the breath lifts the body's hump (live)
    const quiltTex = K3.paint('pdQuilt2', 1024, 1024, (c, w, h) => {
      const cols = ['#c46a7a', '#e8c46a', '#6aa48a', '#8aa4d4', '#d4a07a', '#a88ad4'], r = P.rng(8121), cs = w / 8;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const col = cols[(x * 3 + y * 2) % 6]; c.fillStyle = col; c.fillRect(x * cs, y * cs, cs, cs);
        const k = (x + y * 3) % 4;
        c.fillStyle = 'rgba(255,255,255,0.35)';
        if (k === 0) for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(x * cs + 16 + (i % 3) * 40, y * cs + 16 + Math.floor(i / 3) * 40, 7, 0, PI * 2); c.fill(); }
        if (k === 1) for (let i = 0; i < 6; i++) c.fillRect(x * cs, y * cs + i * 22, cs, 9);
        if (k === 2) { c.beginPath(); c.moveTo(x * cs + cs / 2, y * cs + 14); c.lineTo(x * cs + cs - 14, y * cs + cs / 2); c.lineTo(x * cs + cs / 2, y * cs + cs - 14); c.lineTo(x * cs + 14, y * cs + cs / 2); c.closePath(); c.fill(); }
        if (k === 3) { c.fillStyle = 'rgba(255,240,180,0.55)'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2 - PI / 2, rr = i % 2 ? 14 : 34; c.lineTo(x * cs + cs / 2 + Math.cos(a) * rr, y * cs + cs / 2 + Math.sin(a) * rr); } c.fill(); }
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.setLineDash([6, 6]); c.lineWidth = 3; c.strokeRect(x * cs + 6, y * cs + 6, cs - 12, cs - 12); c.setLineDash([]);
        for (let i = 0; i < 300; i++) { c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'; c.fillRect(x * cs + r() * cs, y * cs + r() * cs, 2, 2); }
      }
    });
    const QW = Wd + 6, QD = L - 18, hump = (x, z) => 9.5 * Math.exp(-Math.pow((x - 2) / 15, 2) - Math.pow((z + 2) / 30, 4)) + 1.6 * Math.exp(-Math.pow((x - 2) / 22, 2));
    const qGeo = new T.PlaneGeometry(QW, QD, 56, 56).rotateX(-PI / 2);
    const qBase = qGeo.attributes.position.array.slice();
    const drape = (k) => { const a = qGeo.attributes.position; for (let i = 0; i < a.count; i++) { const x = qBase[i * 3], z = qBase[i * 3 + 2], edge = Math.max(Math.abs(x) / (QW / 2), Math.abs(z) / (QD / 2)); a.setY(i, hump(x, z) * k - Math.max(0, edge - 0.88) * 60); } a.needsUpdate = true; qGeo.computeVertexNormals(); };
    drape(1);
    const hill = K3.mesh(qGeo, K3.toon('#ffffff', { map: quiltTex, side: T.DoubleSide }), { ink: '#3a2030' });
    hill.position.set(BD.x - 9, BD.top + 0.4, BD.z); hill.rotation.y = -PI / 2; live.add(hill);

    // the toadstool night-light on the floor by the bed's head
    const NL = [362, F, 28];
    { const nl = new T.Group(); nl.position.set(...NL); still.add(nl);
      nl.add(K3.mesh(new T.CylinderGeometry(1.6, 2.2, 4.5, 20).translate(0, 2.25, 0), K3.toon('#f4ead6'), { ink: '#6a5a40' }));
      const cap = new T.Mesh(new T.SphereGeometry(4.2, 28, 14, 0, PI * 2, 0, PI / 2).scale(1, 0.75, 1).translate(0, 4.4, 0), K3.flat('#ffb07a'));
      nl.add(cap); K3.ink(cap, '#7a3a20', 0.8);
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; const dot = new T.Mesh(K3.geo('pdNlDot', () => new T.SphereGeometry(0.55, 10, 8)), K3.flat('#fff6e0')); dot.position.set(Math.cos(a) * 2.8, 6.3, Math.sin(a) * 2.8); nl.add(dot); } }
    const nlGlow = new T.Sprite(new T.SpriteMaterial({ map: softTex, color: '#ffb07a', transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.55 }));
    nlGlow.position.set(NL[0], NL[1] + 6, NL[2]); nlGlow.scale.set(30, 30, 1); live.add(nlGlow);
    const nlPool = new T.Mesh(new T.CircleGeometry(26, 40).rotateX(-PI / 2), K3.flat('#ff9a5a', { map: softTex, transparent: true, opacity: 0.35, depthWrite: false, add: true }));
    nlPool.position.set(NL[0], NL[1] + 0.2, NL[2]); live.add(nlPool);
    const nlLight = new T.PointLight('#ffa060', 40, 70, 1.3); nlLight.position.set(NL[0], NL[1] + 8, NL[2]); live.add(nlLight);

    /* ---------- the round rug where the cat lands ---------- */
    const rugTex = K3.paint('pdRug2', 512, 512, (c, w, h) => {
      const cols = ['#3a5a8a', '#e8c46a', '#c46a5a', '#f2ead6', '#5a8a6a'];
      for (let i = 28; i > 0; i--) { c.fillStyle = cols[i % 5]; c.beginPath(); c.arc(w / 2, h / 2, i * 9, 0, PI * 2); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 1.5; c.stroke(); }
      for (let a = 0; a < PI * 2; a += 0.1) { c.strokeStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + Math.cos(a) * 250, h / 2 + Math.sin(a) * 250); c.stroke(); }
    });
    const rug = new T.Mesh(new T.CircleGeometry(art.rug.r, 64).rotateX(-PI / 2), K3.toon('#ffffff', { map: rugTex })); rug.position.set(art.rug.x, F + 0.06, art.rug.z); rug.receiveShadow = true; still.add(rug);
    // slippers by the bed
    for (const [x, z, ry] of [[256, 126, 0.3], [262, 132, -0.1]]) { const sl = K3.mesh(K3.roundBox(9, 3, 4.4, 0.45, 16).translate(0, 1.5, 0), K3.mat('pdSlipper', () => K3.toon('#c4507a')), { ink: '#4a1428' }); sl.position.set(x, F, z); sl.rotation.y = ry; still.add(sl); const pom = K3.mesh(K3.geo('pdPom', () => new T.SphereGeometry(1.3, 12, 10)), K3.mat('pdPomM', () => K3.toon('#f8e8f0')), { ink: '#6a4a5a', inkW: 0.6 }); pom.position.set(x + Math.cos(ry) * 3.6, F + 3, z - Math.sin(ry) * 3.6); still.add(pom); }

    /* ---------- under the bed ---------- */
    const UB = art.under;
    const boxTex = (key, col, label, lc) => K3.paint('pdUB|' + key, 256, 128, (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h); const r = P.rng(key.length * 7); for (let i = 0; i < 500; i++) { c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'; c.fillRect(r() * w, r() * h, 3, 2); } c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 4; c.strokeRect(6, 6, w - 12, h - 12); c.fillStyle = lc; c.font = 'bold 30px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, w / 2, h / 2 + 2); });
    const ubBox = (b, y0, y1, col, label, lc, side) => { const tx = boxTex(b.kind + label, col, label, lc), cm = K3.toon(col); const m = K3.mesh(new T.BoxGeometry(b.x1 - b.x0, y1 - y0, b.hz * 2), [cm, cm, cm, cm, side ? K3.toon('#ffffff', { map: tx }) : cm, side ? cm : K3.toon('#ffffff', { map: tx })], { ink: '#2b2130' }); m.position.set((b.x0 + b.x1) / 2, (y0 + y1) / 2, b.z); still.add(m); return m; };
    { const [sh, sl] = UB.slot1, top = BD.legTop - 0.2;
      ubBox(sh, F, F + 7.4, '#e8dcc0', 'SHOES', '#7a3a2a', 1); ubBox(sh, F + 7.4, top, '#c8a07a', 'SNEAKERS', '#2b2130', 1).rotation.y = 0.04;
      const slat = K3.mesh(new T.BoxGeometry(sl.x1 - sl.x0, top - F, sl.hz * 2), frameDark, { ink: INKW }); slat.position.set((sl.x0 + sl.x1) / 2, (F + top) / 2, sl.z); still.add(slat);
      for (const x of [sl.x0 + 2, sl.x1 - 2]) { const nail = new T.Mesh(K3.geo('pdNail', () => new T.CylinderGeometry(0.2, 0.2, 1.2, 6).rotateX(PI / 2)), K3.mat('pdSteel', () => K3.toon('#c8ccd4'))); nail.position.set(x, top - 1.5, sl.z + sl.hz); still.add(nail); } }
    { const [gm, tc] = UB.slot2, top = BD.legTop - 0.2;
      [['LUDO', '#c8403a'], ['SNAP', '#3a8a4a'], ['DOMINOES', '#3a5aa8'], ['JIGSAW', '#e8b84a']].forEach(([lab, col], i) => { const h = (top - F) / 4; const m = ubBox({ x0: gm.x0 + (i % 2) * 0.6, x1: gm.x1 - (i % 2) * 0.4, z: gm.z, hz: gm.hz - (i % 2) * 0.3, kind: 'games' + i }, F + i * h, F + (i + 1) * h, col, lab, '#fff', 0); m.rotation.y = (i % 2 ? -1 : 1) * 0.03; });
      const chestTex = K3.paint('pdToyChest', 256, 128, (c, w, h) => { c.fillStyle = '#8a5a2a'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x, 0, 3, h); } c.fillStyle = '#e8b84a'; c.fillRect(0, 10, w, 8); c.fillRect(0, h - 18, w, 8); c.fillStyle = '#fff6e0'; c.font = 'bold 44px "Comic Sans MS", Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TOYS', w / 2, h / 2 + 2); });
      const cm = K3.mat('pdChestWood', () => K3.toon('#8a5a2a')), chest = K3.mesh(new T.BoxGeometry(tc.x1 - tc.x0, top - F, tc.hz * 2), [cm, cm, cm, cm, K3.toon('#ffffff', { map: chestTex }), K3.toon('#ffffff', { map: chestTex })], { ink: INKW });
      chest.position.set((tc.x0 + tc.x1) / 2, (F + top) / 2, tc.z); still.add(chest); }
    // the lost marble (live: it rolls)
    const marbleTex = K3.paint('pdMarble', 256, 128, (c, w, h) => { c.fillStyle = '#8ad0f0'; c.fillRect(0, 0, w, h); for (let i = 0; i < 3; i++) { c.strokeStyle = ['#e8615e', '#f2c14e', '#ffffff'][i]; c.lineWidth = 14; c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, h / 2 + Math.sin(x * 0.05 + i * 2) * 40); c.stroke(); } });
    const marble = K3.mesh(new T.SphereGeometry(art.marble.r, 32, 24), K3.toon('#ffffff', { map: marbleTex, emissive: '#2a5a7a', emissiveIntensity: 0.25 }), { ink: '#1a3a4a' });
    live.add(marble);
    const marbleShine = new T.Mesh(new T.SphereGeometry(art.marble.r * 1.01, 16, 12, 0.3, 0.9, 0.4, 0.7), K3.flat('#ffffff', { transparent: true, opacity: 0.45, depthWrite: false })); live.add(marbleShine);
    // fluff, a lost sock, a coin and a crayon on the floor; cobwebs in the corners
    {
      const fluffM = K3.mat('pdDust', () => K3.toon('#8a8a96')), fl = new T.InstancedMesh(K3.geo('pdFluffG', () => new T.IcosahedronGeometry(1, 1)), fluffM, 70), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
      for (let i = 0; i < 70; i++) { const x = BD.x0 + 4 + rng() * (L - 8), z = BD.z0 + 4 + rng() * (Wd - 8), s = 0.4 + rng() * 1.1; e.set(rng() * 3, rng() * 3, 0); q.setFromEuler(e); m4.compose(new T.Vector3(x, F + s * 0.4, z), q, new T.Vector3(s * 1.4, s * 0.5, s)); fl.setMatrixAt(i, m4); }
      still.add(fl);
      const sock = K3.mesh(new T.CapsuleGeometry(1.6, 8, 6, 12).rotateZ(PI / 2), K3.toon('#e8c84a'), { ink: '#5a4a10' }); sock.position.set(300, F + 1.4, 82); sock.rotation.y = 0.8; still.add(sock);
      const coin = K3.mesh(new T.CylinderGeometry(1.6, 1.6, 0.3, 20), K3.mat('pdGold', () => K3.toon('#e8b84a')), { ink: '#5a3d14', inkW: 0.6 }); coin.position.set(322, F + 0.15, 92); still.add(coin);
      const crayon = K3.mesh(new T.CylinderGeometry(0.6, 0.6, 7, 8).rotateZ(PI / 2), K3.toon('#3a8ad8'), { ink: '#12204a', inkW: 0.6 }); crayon.position.set(306, F + 0.6, 56); crayon.rotation.y = 0.6; still.add(crayon);
      const webTex = K3.paint('pdWebTex', 512, 512, () => {});
      for (const [x, z, ry] of [[BD.x0 + 4, BD.z0 + 4, PI / 4], [BD.x1 - 4, BD.z1 - 4, -3 * PI / 4], [BD.x0 + 4, BD.z1 - 4, 3 * PI / 4]]) { const wb = new T.Mesh(new T.PlaneGeometry(9, 9), K3.toon('#ffffff', { map: webTex, transparent: true, alphaTest: 0.3, side: T.DoubleSide, opacity: 0.7 })); wb.position.set(x, BD.legTop - 4, z); wb.rotation.y = ry; still.add(wb); }
    }

    /* ---------- the planet mobile ---------- */
    const MB = art.mobile, roofY = z => 202 - 0.7172 * (z + 44);
    const wireM = K3.mat('pdMobWire', () => K3.toon('#c8ccd4'));
    const mobile = new T.Group(); mobile.position.set(MB.x, 0, MB.z); live.add(mobile);
    mobile.add(new T.Mesh(new T.CylinderGeometry(0.12, 0.12, roofY(MB.z) - MB.hub, 4).translate(0, (roofY(MB.z) + MB.hub) / 2, 0), wireM));
    const spin = new T.Group(); spin.position.y = MB.hub; mobile.add(spin);
    spin.add(K3.mesh(new T.SphereGeometry(1.4, 16, 12), K3.mat('pdGold', () => K3.toon('#e8b84a')), { ink: '#5a3d14' }));
    // a paper moon and stars hang off the hub too
    { const moonS = new T.Shape(); moonS.absarc(0, 0, 3, PI * 0.35, PI * 1.65, false); moonS.absarc(1.4, 0, 2.4, PI * 1.55, PI * 0.45, true); const mn = P.card(moonS, { col: '#f2e6a0', depth: 0.25 }); mn.position.set(0, -6, 0); spin.add(mn); spin.add(new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 4, 4).translate(0, -2.4, 0), wireM)); }
    const planets = MB.planets.map((p, i) => {
      const tex = K3.paint('pdPlanet|' + p.name, 256, 128, (c, w, h) => {
        c.fillStyle = p.col; c.fillRect(0, 0, w, h); const r = P.rng(8131 + i);
        if (p.name === 'earth') { c.fillStyle = '#5fbf6a'; for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(r() * w, 20 + r() * (h - 40), 20 + r() * 30, 12 + r() * 16, r(), 0, PI * 2); c.fill(); } c.fillStyle = '#fff'; c.fillRect(0, 0, w, 10); c.fillRect(0, h - 10, w, 10); }
        else for (let y = 0; y < h; y += 10) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(80,40,10,0.18)'; c.fillRect(0, y, w, 4 + r() * 6); }
        if (p.name === 'jupiter') { c.fillStyle = '#c8603a'; c.beginPath(); c.ellipse(w * 0.6, h * 0.62, 18, 10, 0, 0, PI * 2); c.fill(); }
      });
      const g = new T.Group(); mobile.add(g);
      g.add(K3.mesh(new T.SphereGeometry(p.size, 28, 20), K3.toon('#ffffff', { map: tex }), { ink: '#2b2130' }));
      if (p.ring) { const ring = K3.mesh(new T.RingGeometry(p.size * 1.25, p.ring, 40).rotateX(-PI / 2), K3.toon('#e8c88a', { side: T.DoubleSide }), { ink: '#5a4a20', inkW: 0.6 }); g.add(ring); }
      const str = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1, 4).translate(0, 0.5, 0), wireM); g.add(str);
      // the arm from the hub out to its string
      const arm = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, p.r, 5).rotateZ(PI / 2).translate(p.r / 2, 0, 0), wireM); spin.add(arm);
      return { g, str, arm, p };
    });

    /* ---------- the ceiling lamp on its long cord (off: the room sleeps) ---------- */
    const CL = art.clamp;
    {
      const g = new T.Group(); g.position.set(CL.x, CL.y, CL.z); still.add(g);
      g.add(new T.Mesh(new T.CylinderGeometry(0.4, 0.4, CL.top - CL.y - 4, 6).translate(0, 4 + (CL.top - CL.y - 4) / 2, 0), K3.toon('#3a3030')));
      g.add(K3.mesh(new T.CylinderGeometry(3.2, 3.2, 1, 20).translate(0, CL.top - CL.y - 0.5, 0), K3.toon('#e8dcc0'), { ink: '#4a4030' }));     // the ceiling rose
      const shadeTex = K3.paint('pdShade', 512, 128, (c, w, h) => { c.fillStyle = '#e8b84a'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 40) { c.fillStyle = '#d8603a'; c.beginPath(); c.arc(x + 20, h / 2, 9, 0, PI * 2); c.fill(); } c.fillStyle = '#7a4a1a'; c.fillRect(0, 0, w, 8); c.fillRect(0, h - 8, w, 8); }, { repeat: true });
      shadeTex.repeat.set(2, 1);
      g.add(K3.mesh(new T.CylinderGeometry(3.4, 5.4, 7.5, 40, 1, true).translate(0, 0.25, 0), K3.toon('#ffffff', { map: shadeTex, side: T.DoubleSide }), { ink: '#4a3010' }));
      g.add(K3.mesh(new T.CylinderGeometry(0.9, 0.9, 2, 12).translate(0, 3, 0), K3.mat('pdSteel', () => K3.toon('#c8ccd4')), { ink: '#3a3e48', inkW: 0.6 }));
      const bulb = new T.Mesh(new T.SphereGeometry(1.6, 16, 12).translate(0, -0.8, 0), K3.toon('#f4f0e6', { emissive: '#8a8070', emissiveIntensity: 0.3 })); g.add(bulb);
      // a pull-chain with a little star on the end
      g.add(new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 6, 4).translate(1.2, -5, 0), K3.toon('#c8ccd4')));
      const ps = P.card(P.shapeFrom(Array.from({ length: 10 }, (_, i) => { const a = i / 10 * PI * 2 + PI / 2, rr = i % 2 ? 0.45 : 1.0; return [Math.cos(a) * rr, Math.sin(a) * rr]; })), { col: '#e8b84a', depth: 0.15 }); ps.position.set(1.2, -8.6, 0); g.add(ps);
    }

    /* ---------- the snore: z's drifting up, and a breath of air that lifts the dragon ---------- */
    const zTex = K3.paint('pdZzz', 128, 128, (c, w, h) => { c.fillStyle = '#e8eeff'; c.strokeStyle = '#3a4a7a'; c.lineWidth = 8; c.lineJoin = 'round'; c.font = 'bold 110px "Comic Sans MS", Georgia, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText('z', w / 2, h / 2); c.fillText('z', w / 2, h / 2); });
    const zs = []; for (let i = 0; i < 5; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: zTex, transparent: true, depthWrite: false })); live.add(sp); zs.push(sp); }
    const breath = []; for (let i = 0; i < 10; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: softTex, color: '#c8d8ff', transparent: true, depthWrite: false, opacity: 0, blending: T.AdditiveBlending })); live.add(sp); breath.push(sp); }

    /* ---------- the cat ---------- */
    const cat = A.makeCat(K);
    live.add(cat.root);
    // a paw's shadow on the window before it strikes (the warning), and a scratch flash when it does
    const pawTex = K3.paint('pdPawShadow', 256, 256, (c, w, h) => { c.fillStyle = 'rgba(20,10,30,0.85)'; c.beginPath(); c.ellipse(w / 2, h * 0.64, 62, 52, 0, 0, PI * 2); c.fill(); for (const [x, y] of [[-70, -18], [-28, -62], [28, -62], [70, -18]]) { c.beginPath(); c.ellipse(w / 2 + x, h * 0.42 + y, 24, 30, x * 0.006, 0, PI * 2); c.fill(); } });
    const pawShadow = new T.Mesh(new T.PlaneGeometry(1, 1), K3.flat('#ffffff', { map: pawTex, transparent: true, depthWrite: false, opacity: 0 })); live.add(pawShadow);
    const scratchTex = K3.paint('pdScratch', 256, 256, (c, w, h) => { c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineCap = 'round'; for (let i = 0; i < 3; i++) { c.lineWidth = 12 - i * 2; c.beginPath(); c.moveTo(40 + i * 60, 30); c.quadraticCurveTo(80 + i * 60, 130, 70 + i * 60, 230); c.stroke(); } });
    const scratch = new T.Mesh(new T.PlaneGeometry(1, 1), K3.flat('#ffe0f0', { map: scratchTex, transparent: true, depthWrite: false, opacity: 0, add: true })); live.add(scratch);

    // where the cat is and what it is doing, from how far the dragon has flown (drawing only)
    const v3 = (a) => new T.Vector3(a[0], a[1], a[2]);
    const bedSpot = v3([art.cat.bed[0], art.cat.bed[1], art.cat.bed[2]]), rugSpot = v3([art.cat.rug[0], art.cat.rug[1], art.cat.rug[2]]);
    const paws = R.paws, sw4 = pl.sw4, pounce = pl.pounce;
    function catAt(st, t) {
      const s = st.s || 0, phase = st.phase;
      const dragon = v3(R.local(s, st.ox || 0, st.oy || 0));
      const o = { pos: bedSpot.clone(), face: dragon, mode: 'lie', eyes: 0, k: 0, reach: null, wiggle: 0, show: true };
      if (phase === 'land' || phase === 'done') { o.mode = 'peek'; o.pos.set(14, R.DESK - 7.5, R.DESKBOX.z1 + 2.2); o.face = v3(R.local(R.len, 0, 0)); o.eyes = 1; return o; }
      if (s < pl.mobile) { o.show = s > pl.top - 20; o.eyes = 0; return o; }
      if (s < paws[0].s - paws[0].tel - 50) { o.mode = 'lie'; o.eyes = s > pl.snore ? 0.35 : 0; o.face = bedSpot.clone().add(new T.Vector3(10, 0, 8)); return o; }
      if (s < sw4 + 4) {
        o.mode = 'sit'; o.eyes = 1; o.k = clamp((s - (paws[0].s - paws[0].tel - 50)) / 25, 0, 1);
        // the paw that is winding up or striking right now
        for (const pw of paws.slice(0, 4)) {
          const u = (s - (pw.s - pw.tel)) / pw.tel;
          if (u > 0 && u < 1.6) {
            const mid = R.local(pw.s, (pw.ox[0] + pw.ox[1]) / 2, (pw.oy[0] + pw.oy[1]) / 2);
            o.reach = { at: v3(mid), u, batted: st.burnt && st.burnt[pw.id] != null };
            o.eyes = u < 1 ? 1 - 0.55 * Math.min(1, u * 2) : 1;
            break;
          }
        }
        return o;
      }
      if (s < sw4 + 26) {
        // the jump down off the bed to the rug
        const u = (s - sw4 - 4) / 22; o.mode = 'leap'; o.eyes = 1;
        o.pos.lerpVectors(bedSpot, rugSpot, u); o.pos.y += Math.sin(u * PI) * 16; o.face = rugSpot.clone().add(rugSpot.clone().sub(bedSpot)); o.k = u;
        return o;
      }
      if (s < pounce + 22) {
        const pw = paws[4], tel0 = pw.s - pw.tel, up = R.local(pw.s, 0, -2.4);
        o.pos.copy(rugSpot); o.mode = 'crouch'; o.eyes = 1; o.face = dragon;
        if (s > tel0 && s < pw.s) { o.wiggle = 1; o.eyes = 0.5; }
        if (s >= pw.s && s < pw.s + 16) { const u = (s - pw.s) / 16; o.mode = 'leap'; o.pos.lerpVectors(rugSpot, v3(up), Math.sin(u * PI)); o.pos.y = rugSpot.y + (up[1] - rugSpot.y) * Math.sin(u * PI); o.face = v3(up).add(new T.Vector3(0, 10, 0)); }
        return o;
      }
      if (s < pl.under) {
        // running round the floor beside the dragon
        const p = R.local(Math.max(0, s - 7), 10, 0); o.pos.set(p[0], F, p[2]); o.mode = 'run'; o.eyes = 1; o.face = v3(R.local(s + 6, 10, 0)); o.face.y = F;
        return o;
      }
      if (s < pl.window) { o.mode = 'peek'; o.pos.set(318, F, BD.z1 + 8); o.face = v3(R.local(s, 0, 0)); o.eyes = 1; o.k = 0; return o; }
      if (s < pl.gap) {
        // climbing the curtain after the dragon
        const p = R.local(Math.max(pl.climb - 10, s - 22), 0, -5.5); o.pos.set(Math.max(328, Math.min(352, p[0])), Math.max(F, p[1] - 12), art.curtain.z + 2.2);
        o.mode = 'climb'; o.eyes = 1; o.face = dragon;
        const pw = paws[5], u = (s - (pw.s - pw.tel)) / pw.tel;
        if (u > 0 && u < 1.6) { o.reach = { at: v3(R.local(pw.s, 0, -2)), u, batted: st.burnt && st.burnt[pw.id] != null }; o.eyes = u < 1 ? 0.5 : 1; }
        return o;
      }
      if (s < pl.gap2 + 30) { o.mode = 'sit'; o.k = 1; o.pos.set(art.win.x + 9, art.win.y - art.win.r + 1.2, art.win.z + 5); o.face = v3(R.local(s, 0, 0)); o.eyes = 1; return o; }
      o.show = false; return o;
    }

    /* ---------- every drawn frame ---------- */
    let dark = 0;
    return {
      cat,
      tick(st, t, dt) {
        const s = st.s || 0, clock = st.clock || 0;
        // the Reader breathes (slow, about one breath every 4.5 s); a big breath out at the snore
        const snoreU = R.snore ? (s - R.snore.s) / R.snore.w : -1;
        const br = Math.sin(t * 1.4);
        drape(1 + br * 0.06 + (snoreU > -0.6 && snoreU < 1 ? 0.12 * Math.sin(clamp(snoreU + 0.6, 0, 1.6) / 1.6 * PI) : 0));
        nlGlow.material.opacity = 0.5 + Math.sin(t * 0.7) * 0.06;
        // z's rise off the sleeper; the snore blows a gust of air up past the dragon
        const hp = art.reader.head;
        zs.forEach((z, i) => { const ph = (t * 0.25 + i / zs.length) % 1; z.position.set(hp[0] - 4 - ph * 6, hp[1] + 6 + ph * 22, hp[2] + Math.sin(ph * 6 + i) * 3); const sc = 2 + ph * 3.5; z.scale.set(sc, sc, 1); z.material.opacity = Math.sin(ph * PI) * 0.9; });
        breath.forEach((b, i) => {
          const u = snoreU * 1.0 + i * 0.05;
          if (u > -0.3 && u < 1.4) { const p = R.local(R.snore.s + (i % 5 - 2) * 3, (i % 3 - 1) * 3.5, -8 + (u + 0.3) * 18); b.position.set(p[0], p[1], p[2]); const sc = 4 + i % 4 * 2; b.scale.set(sc, sc * 2.2, 1); b.material.opacity = 0.32 * Math.sin(clamp((u + 0.3) / 1.7, 0, 1) * PI); }
          else b.material.opacity = 0;
        });
        // the mobile turns (the same angle the rules use), each planet bobbing on its string
        for (const pp of planets) {
          const c = art.planetAt(pp.p, clock);
          pp.g.position.set(c[0] - MB.x, c[1], c[2] - MB.z);
          pp.g.rotation.y = t * 0.6;
          pp.str.scale.y = MB.hub - c[1] - pp.p.size; pp.str.position.y = pp.p.size;
        }
        spin.rotation.y = -(MB.w * clock) - 0;
        for (const pp of planets) pp.arm.rotation.y = -pp.p.ph;
        // the marble rolls back and forth (where the rules put it)
        const mx = art.marbleX(clock); marble.position.set(mx, F + art.marble.r, art.marble.z); marble.rotation.z = -mx / art.marble.r; marbleShine.position.copy(marble.position);
        // under the bed it is dark: the room's light fades while the dragon is down there
        const under = s > pl.under - 14 && s < pl.underEnd + 6 ? 1 : 0;
        dark += (under - dark) * Math.min(1, dt * 2.5);
        if (dark > 0.002) { K.amb.intensity *= 1 - 0.62 * dark; if (mood && mood.moon) mood.moon.intensity *= 1 - 0.8 * dark; }
        // the cat
        const c = catAt(st, t);
        cat.root.visible = c.show;
        if (c.show) cat.pose(c, t, dt);
        // the paw's shadow while one winds up, and the scratch as it strikes
        const pn = R.paws[st.pawI || 0];
        if (pn && s > pn.s - pn.tel && s < pn.s && st.phase === 'fly') {
          const u = (s - (pn.s - pn.tel)) / pn.tel, cx2 = (pn.ox[0] + pn.ox[1]) / 2, cy2 = (pn.oy[0] + pn.oy[1]) / 2, fr = R.at(pn.s);
          const p = R.local(pn.s, cx2, cy2, fr); pawShadow.position.set(p[0], p[1], p[2]);
          pawShadow.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(-fr.t[0], -fr.t[1], -fr.t[2]));
          const sc = Math.min(pn.ox[1] - pn.ox[0], (pn.oy[1] - pn.oy[0]) * 1.6) * (0.6 + 0.4 * u); pawShadow.scale.set(sc, sc, 1);
          pawShadow.material.opacity = 0.18 + 0.4 * u + Math.sin(t * 18) * 0.05; pawShadow.visible = true;
        } else pawShadow.visible = false;
        const ps = st.pawStrike;
        if (ps && clock - ps.t < 0.35) {
          const pw = R.paws.find(q => q.id === ps.id), fr = R.at(pw.s), p = R.local(st.s + 1.5, (pw.ox[0] + pw.ox[1]) / 2, (pw.oy[0] + pw.oy[1]) / 2);
          scratch.position.set(p[0], p[1], p[2]); scratch.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(-fr.t[0], -fr.t[1], -fr.t[2]));
          scratch.scale.setScalar(6); scratch.material.opacity = (1 - (clock - ps.t) / 0.35) * (st.burnt[pw.id] != null ? 0.4 : 0.9); scratch.visible = true;
        } else scratch.visible = false;
      },
    };
  };

  /* ---------- the cat: a big ginger tabby, built from rounded parts and posed by hand ---------- */
  A.makeCat = function (K) {
    const T = K3D.T, K3 = K3D, P = POPUP, PI = Math.PI;
    const furTex = K3.paint('pdCatFur', 512, 512, (c, w, h) => {
      c.fillStyle = '#e8923a'; c.fillRect(0, 0, w, h);
      const r = P.rng(8151);
      for (let i = 0; i < 18; i++) { const y = i * h / 18 + r() * 8; c.fillStyle = 'rgba(150,70,20,0.55)'; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= w; x += 16) c.lineTo(x, y + Math.sin(x * 0.03 + i) * 6 + (r() - 0.5) * 3); for (let x = w; x >= 0; x -= 16) c.lineTo(x, y + 7 + Math.sin(x * 0.03 + i) * 6); c.fill(); }
      for (let i = 0; i < 6000; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,220,170,0.12)' : 'rgba(120,50,10,0.1)'; c.fillRect(r() * w, r() * h, 1, 3); }
    }, { repeat: true });
    const fur = K3.toon('#ffffff', { map: furTex }), cream = K3.mat('pdCatCream', () => K3.toon('#fbe6c8')), pink = K3.mat('pdCatPink', () => K3.toon('#f09aa8'));
    const ink = '#4a2208';
    const ball = (r, mat, sx = 1, sy = 1, sz = 1) => { const m = K3.mesh(new T.SphereGeometry(r, 28, 20).scale(sx, sy, sz), mat, { ink, inkW: 1 }); return m; };
    const root = new T.Group();
    const body = new T.Group(); root.add(body);
    // the torso (local +z is the cat's front)
    const torso = ball(1, fur, 6.2, 6.0, 11); torso.position.set(0, 0, 0); body.add(torso);
    const chest = ball(1, cream, 5.0, 5.4, 4.2); chest.position.set(0, -0.4, 8.2); body.add(chest);
    const haunch = ball(1, fur, 6.6, 6.6, 6.4); haunch.position.set(0, -0.6, -7.4); body.add(haunch);
    // the head
    const headG = new T.Group(); headG.position.set(0, 6, 11); body.add(headG);
    headG.add(ball(1, fur, 5.2, 4.7, 4.9));
    for (const s of [-1, 1]) { const ck = ball(1, cream, 2.4, 2.0, 2.0); ck.position.set(s * 2.4, -1.8, 3.0); headG.add(ck); }
    const muzzle = ball(1, cream, 1.6, 1.2, 1.2); muzzle.position.set(0, -2.6, 4.2); headG.add(muzzle);
    const nose = new T.Mesh(new T.SphereGeometry(0.62, 12, 8).scale(1.2, 0.8, 0.8), pink); nose.position.set(0, -1.4, 4.9); headG.add(nose);
    for (const s of [-1, 1]) {
      const ear = K3.mesh(new T.ConeGeometry(2.2, 4.4, 4).rotateY(PI / 4), fur, { ink }); ear.position.set(s * 3.0, 4.2, -0.4); ear.rotation.set(-0.15, 0, s * -0.32); headG.add(ear);
      const inner = new T.Mesh(new T.ConeGeometry(1.3, 3.0, 4).rotateY(PI / 4), pink); inner.position.set(s * 2.95, 3.9, 0.35); inner.rotation.set(-0.15, 0, s * -0.32); headG.add(inner);
    }
    // the eyes: big and green, glowing a little; slit pupils; lids that narrow
    const eyeM = K3.toon('#7dff6a', { emissive: '#3aff2a', emissiveIntensity: 0.9 });
    const eyes = [], lids = [];
    for (const s of [-1, 1]) {
      const e = new T.Mesh(new T.SphereGeometry(1.5, 20, 14).scale(1, 0.9, 0.6), eyeM); e.position.set(s * 2.1, 0.5, 4.05); e.rotation.y = s * 0.3; headG.add(e); K3.ink(e, '#0a2a08', 0.9);
      const pup = new T.Mesh(new T.SphereGeometry(1, 10, 8).scale(0.22, 1.05, 0.5), K3.mat('pdCatPup', () => K3.flat('#081008'))); pup.position.set(0, 0, 0.62); e.add(pup);
      const glint = new T.Mesh(new T.SphereGeometry(0.28, 8, 6), K3.mat('pdCatGlint', () => K3.flat('#ffffff'))); glint.position.set(0.5, 0.5, 0.7); e.add(glint);
      const lidG = new T.Group(); lidG.position.copy(e.position); lidG.rotation.y = s * 0.3; headG.add(lidG);
      const lid = new T.Mesh(new T.SphereGeometry(1.62, 20, 10, 0, PI * 2, 0, PI / 2).scale(1, 0.95, 0.66), fur); lidG.add(lid);
      const lidLow = new T.Mesh(new T.SphereGeometry(1.62, 20, 10, 0, PI * 2, 0, PI / 2).scale(1, 0.95, 0.66).rotateX(PI), fur); lidG.add(lidLow);
      eyes.push(e); lids.push({ up: lid, low: lidLow });
      const glow = new T.Sprite(new T.SpriteMaterial({ map: K3.paint('pdSoft', 64, 64, () => {}), color: '#7dff6a', transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.5 })); glow.scale.set(5, 4, 1); e.add(glow); e.userData.glow = glow;
    }
    // whiskers
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const wk = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 7, 3).rotateZ(PI / 2).translate(s * 3.5, 0, 0), K3.mat('pdWhisker', () => K3.toon('#fff8ee'))); wk.position.set(s * 1.2, -2.4 + i * 0.4, 4.6); wk.rotation.set(0, s * -0.25, s * (i - 1) * 0.12); headG.add(wk); }
    const mouth = new T.Mesh(new T.SphereGeometry(1, 12, 8).scale(1.1, 0.5, 0.5), K3.toon('#7a2030')); mouth.position.set(0, -3.4, 4.0); mouth.visible = false; headG.add(mouth);
    // legs: a shoulder or hip pivot, the leg hangs down its local -y, a paw at the end
    const legs = {};
    const mkLeg = (name, x, y, z, len, r) => {
      const g = new T.Group(); g.position.set(x, y, z); body.add(g);
      const up = K3.mesh(new T.CapsuleGeometry(r, len, 6, 14).translate(0, -len / 2, 0), fur, { ink }); g.add(up);
      const paw = ball(1, cream, r * 1.3, r * 0.8, r * 1.5); paw.position.set(0, -len - r * 0.4, r * 0.5); g.add(paw);
      for (let k = -1; k <= 1; k++) { const toe = new T.Mesh(K3.geo('pdToe', () => new T.SphereGeometry(0.45, 8, 6)), pink); toe.position.set(k * r * 0.6, -len - r * 0.9, r * 1.2); toe.visible = false; g.add(toe); g.userData.toes = (g.userData.toes || []).concat([toe]); }
      legs[name] = g; return g;
    };
    mkLeg('fl', -2.9, -2.4, 8.2, 7.2, 1.55); mkLeg('fr', 2.9, -2.4, 8.2, 7.2, 1.55);
    mkLeg('bl', -3.6, -3.0, -8.2, 6.2, 1.9); mkLeg('br', 3.6, -3.0, -8.2, 6.2, 1.9);
    // the tail: a chain of segments
    const tail = []; let parent = body;
    for (let i = 0; i < 9; i++) { const g = new T.Group(); g.position.set(0, i ? 0 : 1.2, i ? -2.4 : -12.4); parent.add(g); const seg = K3.mesh(K3.geo('pdTailSeg' + i, () => new T.CapsuleGeometry(1.4 - i * 0.08, 2.2, 4, 10).rotateX(PI / 2).translate(0, 0, -1.2)), i % 2 ? fur : K3.mat('pdCatStripe', () => K3.toon('#c46a24')), { ink }); g.add(seg); tail.push(g); parent = g; }
    root.scale.setScalar(1.05);

    const cur = { y: 0, pitch: 0, lean: 0 }, look = new T.Vector3(), fwd = new T.Vector3();
    function pose(o, t, dt) {
      const m = o.mode, k = o.k || 0;
      root.position.copy(o.pos);
      // turn to face (on the floor plane)
      fwd.copy(o.face).sub(o.pos); fwd.y = 0;
      if (fwd.lengthSq() > 0.01) root.rotation.y = Math.atan2(fwd.x, fwd.z);
      let y = 7.6, pitch = 0, roll = 0, headP = 0, fl = 0, fr = 0, bl = 0, br = 0, tailUp = 0.25, tailSw = Math.sin(t * 1.3) * 0.25;
      if (m === 'lie') { y = 4.4; fl = -1.45; fr = -1.45; bl = 1.3; br = 1.3; headP = 0.35; tailUp = -0.05; tailSw = 0.6 + Math.sin(t * 0.5) * 0.1; body.scale.y = 1 + Math.sin(t * 1.6) * 0.02; }
      else body.scale.y = 1;
      if (m === 'sit' || m === 'peek') { y = 4.4 + 8.4 * k + (1 - k) * 0; pitch = -0.78 * Math.max(k, 0.0001); fl = 0.78 * k - 1.45 * (1 - k); fr = fl; bl = 1.5; br = 1.5; headP = 0.8 * k; tailUp = 0.05; }
      if (m === 'crouch') { y = 5.2; pitch = 0.12; fl = -0.6; fr = -0.6; bl = 1.1; br = 1.1; headP = -0.1; tailUp = 0.35; if (o.wiggle) root.position.x += 0; body.rotation.y = o.wiggle ? Math.sin(t * 16) * 0.12 : 0; tailSw = Math.sin(t * (o.wiggle ? 12 : 3)) * 0.5; }
      else body.rotation.y = 0;
      if (m === 'leap') { y = 7; pitch = -0.35 * Math.cos((k || 0.5) * PI); fl = -1.3; fr = -1.3; bl = 1.0; br = 1.0; headP = 0.25; tailUp = 0.1; tailSw = 0; }
      if (m === 'run') { y = 7.2; const g = t * 11; fl = Math.sin(g) * 0.9; fr = Math.sin(g + 0.4) * 0.9; bl = Math.sin(g + PI) * 0.9; br = Math.sin(g + PI + 0.4) * 0.9; pitch = Math.sin(g) * 0.08; tailUp = 0.3; tailSw = Math.sin(g * 0.5) * 0.3; }
      if (m === 'climb') { y = 8; pitch = -1.35; fl = -0.2 + Math.sin(t * 6) * 0.4; fr = -0.2 - Math.sin(t * 6) * 0.4; bl = 0.6; br = 0.6; headP = 1.0; tailUp = -0.6; }
      if (m === 'peek') { y = -2; pitch = -1.0; fl = -0.4; fr = -0.6; headP = 0.95; }
      // a paw reaching for the dragon: wind up during the warning, strike, then back
      let reachW = 0;
      if (o.reach) {
        const u = o.reach.u;
        reachW = u < 1 ? 0.55 * u : u < 1.15 ? 0.55 + (u - 1) / 0.15 * 0.45 : Math.max(0, 1 - (u - 1.15) / 0.45);
      }
      cur.y += (y - cur.y) * Math.min(1, dt * 8); cur.pitch += (pitch - cur.pitch) * Math.min(1, dt * 8);
      body.position.y = cur.y; body.rotation.x = cur.pitch; body.rotation.z = roll;
      // the head looks at what it faces (the dragon), pitched up for a sitting cat
      headG.rotation.x = -headP * 0.6 + (o.mode === 'lie' ? 0.4 : 0);
      if (o.mode !== 'lie') { look.copy(o.face); headG.parent.worldToLocal(look); headG.rotation.y = clamp(Math.atan2(look.x - headG.position.x, look.z - headG.position.z), -0.9, 0.9); headG.rotation.x = clamp(-Math.atan2(look.y - headG.position.y, Math.hypot(look.x - headG.position.x, look.z - headG.position.z)), -1.2, 0.8); }
      else headG.rotation.y = 0.5;
      legs.fl.rotation.set(fl, 0, 0); legs.br.rotation.set(br, 0, 0); legs.bl.rotation.set(bl, 0, 0);
      if (reachW > 0) {
        // the right front leg swings out toward the target (in the body's frame)
        look.copy(o.reach.at); legs.fr.parent.worldToLocal(look); look.sub(legs.fr.position);
        const tgtX = Math.atan2(-look.z, -look.y), tgtZ = Math.atan2(look.x, Math.hypot(look.y, look.z));
        const wind = reachW < 0.55 ? reachW / 0.55 : 1;
        legs.fr.rotation.set(fr + (tgtX - fr) * wind * (reachW < 0.55 ? 0.7 : 1) - (reachW < 0.55 ? 0.8 * wind : 0), 0, tgtZ * wind);
        const ext = reachW < 0.55 ? 1 : 1 + (reachW - 0.55) * 1.4; legs.fr.scale.set(1, ext, 1);
        legs.fr.userData.toes.forEach(tt => { tt.visible = true; });
        mouth.visible = true;
      } else { legs.fr.rotation.set(fr, 0, 0); legs.fr.scale.set(1, 1, 1); legs.fr.userData.toes.forEach(tt => { tt.visible = false; }); mouth.visible = o.mode === 'leap'; }
      // the tail
      tail.forEach((g, i) => { g.rotation.x = -tailUp * (i < 4 ? 1 : 0.4) - (o.mode === 'lie' ? 0.05 : 0); g.rotation.y = tailSw * (i / tail.length) * 1.4 + Math.sin(t * 2 + i * 0.6) * 0.06; });
      // the eyes: open, narrowed, closed; the glow follows how open they are
      const open = clamp(o.eyes, 0, 1);
      lids.forEach(l => { l.up.rotation.x = -PI / 2 * (1 - open) * 0.95 - 0.12; l.low.rotation.x = PI / 2 * (1 - open) * 0.5 + 0.1; });
      // (the glow is for eyes across the room: right beside the camera, as when the cat peers under the bed after the
      // dragon, it would wash a third of the picture green, so it fades out as the camera comes close)
      eyes.forEach(e => { e.getWorldPosition(look); const near = clamp((look.distanceTo(K.camera.position) - 16) / 22, 0, 1); e.userData.glow.material.opacity = (0.15 + 0.5 * open) * near; e.scale.y = 0.4 + 0.6 * open; });
    }
    return { root, pose };
  };
  return A;
})();
