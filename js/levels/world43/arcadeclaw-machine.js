/* Pip & Bo - 43-3 Claw Machine Rescue: the machine itself. Loaded on demand with the 3D kit (after the arcade kit and
   the prizes). Scenery only: never read by the rules.

   ARCADECLAW_MACHINE.hall(K, o)     the glass hall of Prize Palace: the glass front (behind the camera) with nose and
                                     finger prints and stickers, the side glass with chrome posts, the dark arcade beyond
                                     it, chasing bulbs round every edge (some dead, one flickering), prize shelves of dusty
                                     boxed "big" prizes up the sides, the ceiling with its gantry, the mirrored back wall
   ARCADECLAW_MACHINE.rail(K, st)    the claw's rail: twin beams along the climb in lit sections (green and gold when lit,
                                     dark with a red end lamp when not), hangers and chains to the roof
   ARCADECLAW_MACHINE.claw(K)        the bridge, the trolley, the round glass cab (Pip inside, at his joystick), the claw
                                     (chrome fingers with rubber tips), the aim ring and its beam, the ghost
   ARCADECLAW_MACHINE.snatcher(K)    the machine's own old claw: chipped red enamel, a bent finger, a chain, a red lamp
                                     behind cracked glass, a maintenance sticker, cobwebs
   ARCADECLAW_MACHINE.outside(K)     the arcade beyond the glass: cabinets with made-up games, the pinball table with its
                                     lights still running, a reversed neon OPEN sign, rain on a far window, a great soft
                                     shadow that passes now and then; through the front glass the giant joystick, buttons
                                     and coin door of Prize Palace itself
   Every name, game and toy here is made up. */
'use strict';

const ARCADECLAW_MACHINE = (function () {
  const T = K3D.T, A = ARCADE, MP = ARCADECLAW_MAP;
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const P = Math.PI;
  const M = (k, make) => K3D.mat('acm|' + k, make);
  const chrome = () => M('chrome', () => ARCADECLAW_TOYS.rimify(K3D.toon('#d4d8e2', { emissive: '#3a3e4a', emissiveIntensity: 0.35 }), '1.0, 1.0, 1.0', 0.9, 2.0, 'chrome'));
  const steel = () => M('steel', () => K3D.toon('#6a6e7a', { map: A.grimeTex() }));
  const red = () => M('redEnamel', () => K3D.toon('#c8322a', { map: K3D.paint('acm-chipped', 256, 256, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { c.fillStyle = A.rnd() < 0.6 ? '#7a7880' : '#5a3a2a'; c.beginPath(); const x = A.rnd() * w, y = A.rnd() * h, r = 2 + A.rnd() * 9; for (let k = 0; k < 7; k++) { const a = k / 7 * P * 2; const rr = r * (0.6 + A.rnd() * 0.6); k ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + rr, y); } c.fill(); } for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(80,40,20,0.25)'; c.fillRect(A.rnd() * w, A.rnd() * h, 1 + A.rnd() * 2, 6 + A.rnd() * 20); } }, { repeat: true }) }));
  const glassM = (op = 0.12, tint = '#cfe8ff') => M('glass|' + op + tint, () => K3D.toon(tint, { transparent: true, opacity: op, depthWrite: false, side: T.DoubleSide }));

  // prints on the glass: nose and finger smudges, from the outside (very faint), a sticker or two
  const printsTex = () => K3D.paint('acm-prints', 512, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const x = A.rnd() * w, y = h * 0.35 + A.rnd() * h * 0.6, r = 8 + A.rnd() * 14;
      for (let k = 0; k < 7; k++) { c.strokeStyle = `rgba(255,255,255,${0.02 + A.rnd() * 0.025})`; c.lineWidth = 1.2; c.beginPath(); c.ellipse(x, y, r * (0.3 + k * 0.12), r * (0.42 + k * 0.15), A.rnd(), 0, P * 2); c.stroke(); }
    }
    // a nose print and the fog of a breath
    for (let i = 0; i < 4; i++) { const x = 60 + A.rnd() * (w - 120), y = h * 0.55 + A.rnd() * 80; const g = c.createRadialGradient(x, y, 0, x, y, 46); g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 46, 0, P * 2); c.fill(); c.fillStyle = 'rgba(255,255,255,0.1)'; c.beginPath(); c.ellipse(x, y - 8, 10, 7, 0, 0, P * 2); c.fill(); }
    // long wipe streaks
    for (let i = 0; i < 6; i++) { c.strokeStyle = 'rgba(255,255,255,0.018)'; c.lineWidth = 18; c.beginPath(); const y = A.rnd() * h; c.moveTo(0, y); c.quadraticCurveTo(w / 2, y + (A.rnd() - 0.5) * 80, w, y + (A.rnd() - 0.5) * 60); c.stroke(); }
  });
  const stickerTex = (text, col, col2) => K3D.paint('acm-stk|' + text, 256, 128, (c, w, h) => {
    c.fillStyle = col; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 4, 0, 0, P * 2); c.fill();
    c.strokeStyle = col2; c.lineWidth = 6; c.stroke();
    c.fillStyle = col2; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const lines = text.split('|'); lines.forEach((l, i) => c.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 32));
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, 0, w, h * 0.25);
  });

  /* ---------- the hall ---------- */
  function hall(K, o = {}) {
    const g = new T.Group(); g.name = 'hall';
    const X = 16.5, ZF = 21, ZB = -330, Y0 = -4, YT = 64;
    const bulbs = o.bulbs;
    // the floor of the machine under the prizes: a dark ribbed metal tray
    const floor = K3D.mesh(new T.BoxGeometry(X * 2 + 2, 1, ZF - ZB), steel(), { ink: false }); floor.position.set(0, Y0 - 0.5, (ZF + ZB) / 2); g.add(floor);
    // the glass front (behind the camera): a big pane, chrome frame, prints, stickers on the inside
    const front = new T.Group(); front.position.z = ZF; g.add(front);
    const pane = new T.Mesh(new T.PlaneGeometry(X * 2, 40), glassM(0.08)); pane.position.y = 16; pane.rotation.y = P; front.add(pane);
    const prints = new T.Mesh(new T.PlaneGeometry(X * 2, 40), K3D.flat('#ffffff', { map: printsTex(), transparent: true, depthWrite: false })); prints.position.set(0, 16, -0.05); prints.rotation.y = P; front.add(prints);
    for (const [txt, c1, c2, x, y] of [['PLAY TILL|YOU WIN!', '#ffd23a', '#c8322a', -9, 9], ['OUT OF|ORDER', '#f6f0e0', '#5a5a64', 10, 5.5], ['GRAB A|FRIEND', '#5ad8ff', '#1a3a6a', 4, 14]]) {
      const s = new T.Mesh(new T.PlaneGeometry(3.6, 1.8), K3D.toon('#ffffff', { map: stickerTex(txt, c1, c2), transparent: true, alphaTest: 0.4 })); s.position.set(x, y, -0.1); s.rotation.set(0, P, (A.rnd() - 0.5) * 0.3);
      if (txt === 'OUT OF|ORDER') { s.material.opacity = 0.55; s.rotation.z = 0.5; }
      front.add(s);
    }
    // chrome frame posts and rails round every pane (side glass every 12 units), bulbs chasing along the edges
    const post = (x, z, h = YT - Y0) => { const p = K3D.mesh(K3D.geo('acm-post', () => new T.BoxGeometry(0.55, 1, 0.55)), chrome(), { ink: A.INK, inkW: 0.6 }); p.scale.y = h; p.position.set(x, Y0 + h / 2, z); g.add(p); return p; };
    for (const sx of [-1, 1]) {
      // side glass (one long pane per side, with prints) and the posts
      const sp = new T.Mesh(new T.PlaneGeometry(ZF - ZB, YT - Y0), glassM(0.1)); sp.position.set(sx * X, (YT + Y0) / 2, (ZF + ZB) / 2); sp.rotation.y = -sx * P / 2; g.add(sp);
      const spr = new T.Mesh(new T.PlaneGeometry(60, 30), K3D.flat('#ffffff', { map: printsTex(), transparent: true, depthWrite: false })); spr.position.set(sx * (X - 0.04), 10, -20); spr.rotation.y = -sx * P / 2; g.add(spr);
      for (let z = ZF; z > ZB; z -= 12) post(sx * X, z);
      // the rails along the bottom and top of the side glass, bulbs chasing along them (every 9th dead, one flickers)
      for (const y of [Y0 + 0.6, 2.6, 20, YT - 1]) {
        const rl = K3D.mesh(new T.BoxGeometry(0.4, 0.4, ZF - ZB), chrome(), { ink: false }); rl.position.set(sx * (X - 0.1), y, (ZF + ZB) / 2); g.add(rl);
        if (bulbs && y > 0) for (let z = ZF - 0.5, k = 0; z > ZB; z -= 1.1, k++) {
          const dead = k % 9 === 4;
          bulbs.add(sx * (X - 0.45), y - 0.32, z, dead ? '#3a3030' : ['#ffe2a0', '#ff8ad8', '#5ad8ff', '#ffe2a0'][k % 4], { size: 0.13, speed: dead ? 0 : 3.2, phase: k * 0.55 + (y > 10 ? 1 : 0), blink: !dead && k === 37 });
        }
      }
    }
    // the front frame's bulbs (seen in the wide shot)
    if (bulbs) { bulbs.line([-X, 0.6, ZF - 0.4], [X, 0.6, ZF - 0.4], 1.1, ['#ffe2a0', '#ff5ad6', '#5aff8a'], { size: 0.14, speed: 3, step: 0.5 }); bulbs.line([-X, 35.6, ZF - 0.4], [X, 35.6, ZF - 0.4], 1.1, ['#ffe2a0', '#ff5ad6', '#5aff8a'], { size: 0.14, speed: 3, step: 0.5 }); }
    for (const sx of [-1, 1]) post(sx * X, ZF);
    const lintel = K3D.mesh(new T.BoxGeometry(X * 2 + 1, 1.2, 0.8), red(), { ink: A.INK }); lintel.position.set(0, 36.2, ZF); g.add(lintel);
    // the ceiling: dark panels, a grid of struts, a few work lamps hanging (warm pools of light)
    const ceil = K3D.mesh(new T.BoxGeometry(X * 2, 1, ZF - ZB), M('ceil', () => K3D.toon('#1e1a22', { map: A.grimeTex() })), { ink: false }); ceil.position.set(0, YT + 0.5, (ZF + ZB) / 2); g.add(ceil);
    for (let z = ZF - 6; z > ZB; z -= 14) {
      const strut = K3D.mesh(K3D.geo('acm-strut', () => new T.BoxGeometry(X * 2, 0.6, 0.9)), steel(), { ink: false }); strut.position.set(0, YT - 0.4, z); g.add(strut);
    }
    // the back wall: a tall mirror panel (it doubles the bulbs and the glow of the mountain), with a frame of bulbs
    const back = new T.Group(); back.position.z = ZB; g.add(back);
    const mirror = new T.Mesh(new T.PlaneGeometry(X * 2, YT - Y0), M('mirror', () => K3D.toon('#2a3040', { emissive: '#18202c', emissiveIntensity: 1 }))); mirror.position.y = (YT + Y0) / 2; back.add(mirror);
    if (bulbs) { bulbs.line([-X + 1, 1, ZB + 0.3], [X - 1, 1, ZB + 0.3], 1.4, '#ffe2a0', { size: 0.2, speed: 2 }); bulbs.line([-X + 1, YT - 2, ZB + 0.3], [X - 1, YT - 2, ZB + 0.3], 1.4, '#ffe2a0', { size: 0.2, speed: 2 }); }
    // prize shelves up the side walls: brackets, planks, boxed "big" prizes going dusty, price cards
    shelves(K, g, X, o);
    K.add(g);
    return g;
  }
  const BOX_NAMES = ['MEGA PLUSH', 'GIANT BEAR', 'DELUXE', 'TOP PRIZE', 'SUPER SIZE', 'GRAND', 'JUMBO', 'BIG WIN'];
  const boxTex = (i) => K3D.paint('acm-box' + i, 256, 256, (c, w, h) => {
    const cols = ['#ff7ab0', '#5ad8ff', '#ffd23a', '#7aff9a', '#b88aff', '#ff9a5a'];
    c.fillStyle = cols[i % cols.length]; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(20, 40, w - 40, h - 90);
    c.fillStyle = cols[(i + 2) % cols.length]; c.beginPath(); c.arc(w / 2, h / 2, 60, 0, P * 2); c.fill();
    c.fillStyle = '#17121a'; c.beginPath(); c.arc(w / 2 - 22, h / 2 - 10, 9, 0, P * 2); c.arc(w / 2 + 22, h / 2 - 10, 9, 0, P * 2); c.fill();
    c.strokeStyle = '#17121a'; c.lineWidth = 5; c.beginPath(); c.arc(w / 2, h / 2 + 8, 24, 0.2, P - 0.2); c.stroke();
    c.fillStyle = '#ffffff'; c.font = 'bold 26px sans-serif'; c.textAlign = 'center'; c.fillText(BOX_NAMES[i % BOX_NAMES.length], w / 2, 30);
    c.fillStyle = '#17121a'; c.font = 'bold 20px sans-serif'; c.fillText((500 + i * 250) + ' TICKETS', w / 2, h - 18);
    // dust on the top edge
    const g = c.createLinearGradient(0, 0, 0, 40); g.addColorStop(0, 'rgba(200,190,170,0.55)'); g.addColorStop(1, 'rgba(200,190,170,0)'); c.fillStyle = g; c.fillRect(0, 0, w, 40);
  });
  function shelves(K, g, X, o) {
    const plankM = M('plank', () => K3D.toon('#8a6a4a', { map: A.brassTex('#8a6a4a', { dark: true }) }));
    for (const sx of [-1, 1]) for (let z = 14; z > -320; z -= 18) {
      const y0 = MP.groundRef(-z) + 7 + ((z / 18) % 2 ? 0 : 5);
      for (let r = 0; r < 3; r++) {
        const y = y0 + r * 6.5;
        const pl = K3D.mesh(K3D.geo('acm-plank', () => new T.BoxGeometry(2.6, 0.3, 14)), plankM, { ink: A.INK, inkW: 0.6 }); pl.position.set(sx * (X - 1.4), y, z - 7); g.add(pl);
        for (const bz of [-2, -12]) { const br = K3D.mesh(K3D.geo('acm-bracket', () => new T.BoxGeometry(2.2, 1.2, 0.25)), steel(), { ink: A.INK, inkW: 0.5 }); br.position.set(sx * (X - 1.3), y - 0.7, z + bz); g.add(br); }
        // boxed prizes on it: dusty boxes with a window showing the plush inside, a price card, cobwebs between them
        let bz = z - 1.4;
        while (bz > z - 13) {
          const w = 1.6 + A.rnd() * 1.4, h = 2.2 + A.rnd() * 2.6, d = 1.8 + A.rnd() * 1.2, i = Math.floor(A.rnd() * 8);
          const bx = K3D.mesh(K3D.geo('acm-boxg', () => new T.BoxGeometry(1, 1, 1)), M('box' + i, () => K3D.toon('#ffffff', { map: boxTex(i) })), { ink: A.INK, inkW: 0.6 });
          bx.scale.set(d, h, w); bx.position.set(sx * (X - 1.4), y + 0.15 + h / 2, bz - w / 2); bx.rotation.y = (A.rnd() - 0.5) * 0.2; g.add(bx);
          bz -= w + 0.2 + A.rnd() * 0.5;
        }
      }
    }
  }

  /* ---------- the rail ---------- */
  function rail(K, st) {
    const g = new T.Group(); g.name = 'rail';
    const secs = [];
    const beamM = M('beam', () => K3D.toon('#3a3640', { map: A.grimeTex() }));
    const sMax = 300;
    // the two beams follow the rail's height along s, in pieces (each piece a box between two s values)
    const piece = (s0, s1, x) => {
      const [, z0] = MP.at(s0, 0), [, z1] = MP.at(s1, 0), y0 = MP.railY(s0) + 1.15, y1 = MP.railY(s1) + 1.15;
      const len = Math.hypot(z1 - z0, y1 - y0);
      const b = K3D.mesh(K3D.geo('acm-ibeam', () => { const sh = new T.Shape(); sh.moveTo(-0.35, -0.45); sh.lineTo(0.35, -0.45); sh.lineTo(0.35, -0.35); sh.lineTo(0.08, -0.35); sh.lineTo(0.08, 0.35); sh.lineTo(0.35, 0.35); sh.lineTo(0.35, 0.45); sh.lineTo(-0.35, 0.45); sh.lineTo(-0.35, 0.35); sh.lineTo(-0.08, 0.35); sh.lineTo(-0.08, -0.35); sh.lineTo(-0.35, -0.35); sh.closePath(); return new T.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5); }), beamM, { ink: A.INK, inkW: 0.6 });
      b.scale.z = len + 0.02; b.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2); b.rotation.x = Math.atan2(y1 - y0, -(z1 - z0)); g.add(b);
    };
    for (const sx of [-1, 1]) for (let s = MP.rail.s0 - 4; s < sMax; s += 2) piece(s, s + 2, sx * 10.6);
    // LED strips under the beams per section: one instanced row of small lights per section that the scenery turns
    // on in a wave when the section lights (green-gold), and a red lamp at each dark section's start
    const secList = MP.rail.sections.concat([[82, 120], [120, 160], [160, 200], [200, 240], [240, 300]]);
    for (const [s0, s1] of secList) {
      const n = Math.round((s1 - s0) / 0.9);
      const im = new T.InstancedMesh(K3D.geo('acm-led', () => new T.BoxGeometry(0.22, 0.12, 0.5)), K3D.flat('#ffffff'), n * 2);
      const m4 = new T.Matrix4(), c = new T.Color('#3a2a2a');
      let k = 0;
      for (const sx of [-1, 1]) for (let i = 0; i < n; i++) { const s = s0 + (i + 0.5) * (s1 - s0) / n, [, z] = MP.at(s, 0); m4.makeTranslation(sx * 10.6 + sx * -0.42, MP.railY(s) + 0.62, z); im.setMatrixAt(k, m4); im.setColorAt(k, c); k++; }
      im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.userData.live = true; g.add(im);
      // the end lamp of the section (red while the next one is dark)
      const [, ze] = MP.at(s1, 0);
      const lamps = [];
      for (const sx of [-1, 1]) { const l = new T.Mesh(K3D.geo('acm-lamp', () => new T.SphereGeometry(0.28, 12, 8)), K3D.flat(hot('#ff3a2a', 2))); l.position.set(sx * 10.0, MP.railY(s1) + 0.4, ze); g.add(l); lamps.push(l); }
      const stop = K3D.mesh(new T.BoxGeometry(22, 0.3, 0.5), M('stopbar', () => K3D.toon('#ffd23a', { map: K3D.paint('acm-hazard', 128, 16, (cc, w, h) => { for (let x = -h; x < w; x += 16) { cc.fillStyle = '#ffd23a'; cc.fillRect(x, 0, 8, h); cc.fillStyle = '#1a1a1a'; cc.beginPath(); cc.moveTo(x + 8, 0); cc.lineTo(x + 16, 0); cc.lineTo(x + 8 + h, h); cc.lineTo(x + h, h); cc.fill(); } }, { repeat: true }) })), { ink: A.INK, inkW: 0.5 });
      stop.position.set(0, MP.railY(s1) + 1.8, ze); g.add(stop);
      secs.push({ s0, s1, im, n, lamps, stop, on: 0 });
    }
    // hangers from the roof every 14 units: a strut down to the beam with a chain beside it
    for (let s = MP.rail.s0; s < sMax; s += 14) {
      const [, z] = MP.at(s, 0), y = MP.railY(s) + 1.6;
      for (const sx of [-1, 1]) {
        const h = 64 - y;
        const hg = K3D.mesh(K3D.geo('acm-hanger', () => new T.CylinderGeometry(0.12, 0.12, 1, 6)), steel(), { ink: false }); hg.scale.y = h; hg.position.set(sx * 10.6, y + h / 2, z); g.add(hg);
      }
    }
    K.add(g);
    return { g, secs };
  }
  // the scenery turns sections on as st.lit grows (a wave of lights running up the beams)
  function railUpdate(R, st, t, dt = 1 / 60) {
    const c = new T.Color();
    for (const sc of R.secs) {
      const target = st.lit >= sc.s1 - 0.5 ? 1 : 0;
      if (target && sc.on < 1) { sc.on = Math.min(1, sc.on + dt * 0.75); }
      else if (!target) sc.on = 0;
      const k2 = sc.n * 2;
      for (let i = 0; i < k2; i++) {
        const u = (i % sc.n) / sc.n;
        const lit = sc.on > u ? 1 : 0;
        if (lit) c.setRGB(1.6, 1.35 + 0.25 * Math.sin(t * 4 - u * 30), 0.5); else c.setRGB(0.18, 0.1, 0.1);
        sc.im.setColorAt(i, c);
      }
      sc.im.instanceColor.needsUpdate = true;
      // the end lamp: red while the next section is dark, off once it lights
      const nextDark = st.lit <= sc.s1 + 0.5;
      for (const l of sc.lamps) { l.visible = nextDark && st.lit >= sc.s1 - 0.5; l.material.color.copy(hot('#ff3a2a', 1.2 + Math.abs(Math.sin(t * 3)) * 1.6)); }
    }
  }

  /* ---------- the claw, the cab and Pip ---------- */
  function claw(K) {
    const g = new T.Group(); g.name = 'claw';
    // the bridge across the beams (moves along s) and the trolley on it (moves across)
    const bridge = new T.Group(); g.add(bridge);
    const bb = K3D.mesh(new T.BoxGeometry(21.2, 0.6, 0.9), M('bridge', () => K3D.toon('#d8b040', { map: A.brassTex('#d8b040') })), { ink: A.INK, inkW: 0.7 }); bridge.add(bb);
    for (const sx of [-1, 1]) {
      const end = K3D.mesh(new T.BoxGeometry(1.1, 1.0, 1.6), red(), { ink: A.INK, inkW: 0.7 }); end.position.set(sx * 10.6, 0.2, 0); bridge.add(end);
      for (const sz of [-1, 1]) { const wh = K3D.mesh(new T.CylinderGeometry(0.3, 0.3, 0.25, 14).rotateZ(P / 2), steel(), { ink: A.INK, inkW: 0.5 }); wh.position.set(sx * 10.6, 0.75, sz * 0.5); bridge.add(wh); }
    }
    // stencilled name on the bridge
    const plate = new T.Mesh(new T.PlaneGeometry(4, 0.45), K3D.toon('#ffffff', { map: K3D.paint('acm-bridgeName', 256, 32, (c, w, h) => { c.fillStyle = '#d8b040'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a2410'; c.font = 'bold 22px monospace'; c.textAlign = 'center'; c.fillText('PRIZE PALACE  MK II', w / 2, 23); }) }));
    plate.position.set(-5, 0, 0.46); bridge.add(plate);
    const trolley = new T.Group(); bridge.add(trolley);
    const tb = K3D.mesh(K3D.roundBox(1.6, 0.9, 1.5, 0.5, 20), red(), { ink: A.INK, inkW: 0.8 }); tb.position.y = -0.55; trolley.add(tb);
    const motor = K3D.mesh(new T.CylinderGeometry(0.32, 0.32, 0.9, 14).rotateZ(P / 2), steel(), { ink: A.INK, inkW: 0.6 }); motor.position.set(0, 0.2, -0.3); trolley.add(motor);
    for (let i = 0; i < 4; i++) { const fin = new T.Mesh(new T.TorusGeometry(0.34, 0.03, 4, 14).rotateY(P / 2), steel()); fin.position.set(-0.3 + i * 0.2, 0.2, -0.3); trolley.add(fin); }
    for (const sx of [-1, 1]) { const wh = K3D.mesh(new T.CylinderGeometry(0.18, 0.18, 0.2, 12).rotateX(P / 2), chrome(), { ink: A.INK, inkW: 0.5 }); wh.position.set(sx * 0.5, 0.3, 0.55); trolley.add(wh); }
    // grease marks and a little warning light on the trolley
    const grease = new T.Mesh(new T.CircleGeometry(0.25, 10), K3D.toon('#201810', { transparent: true, opacity: 0.6 })); grease.position.set(0.4, -0.5, 0.76); trolley.add(grease);
    const beacon = new T.Mesh(new T.SphereGeometry(0.12, 10, 8), K3D.flat(hot('#ffb02a', 2.2))); beacon.position.set(-0.55, 0.0, 0.7); trolley.add(beacon);
    // the hanging part (cab and claw) swings under the trolley
    const hang = new T.Group(); hang.position.y = -1.0; trolley.add(hang);
    // the cab hangs beside the claw on a bent chrome arm (the claw's cable runs straight down from the trolley's winch),
    // turned so Pip faces the claw and, three-quarters on, the camera
    const CAB = { x: -1.45, y: -1.5, z: 0.15, yaw: P / 4 };
    const armL = Math.hypot(CAB.x, CAB.z);
    const arm1 = K3D.mesh(new T.CylinderGeometry(0.08, 0.08, armL, 8).rotateZ(P / 2), chrome(), { ink: A.INK, inkW: 0.5 }); arm1.position.set(CAB.x / 2, -0.1, CAB.z / 2); arm1.rotation.y = Math.atan2(-CAB.z, CAB.x); hang.add(arm1);
    const pole = K3D.mesh(new T.CylinderGeometry(0.07, 0.07, 1, 8), chrome(), { ink: A.INK, inkW: 0.5 }); pole.scale.y = -0.1 - (CAB.y + 0.84); pole.position.set(CAB.x, (-0.1 + CAB.y + 0.84) / 2, CAB.z); hang.add(pole);
    const elbow = K3D.mesh(new T.SphereGeometry(0.13, 10, 8), red(), { ink: A.INK, inkW: 0.5 }); elbow.position.set(CAB.x, -0.1, CAB.z); hang.add(elbow);
    // the round glass cab
    const cab = new T.Group(); cab.position.set(CAB.x, CAB.y, CAB.z); cab.rotation.y = CAB.yaw; hang.add(cab);
    const R = 0.86;
    const shell = new T.Mesh(new T.SphereGeometry(R, 32, 20), M('cabGlass', () => K3D.toon('#d8f0ff', { transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide })));
    shell.renderOrder = 12; shell.position.y = 0; cab.add(shell);
    const glint = new T.Mesh(new T.SphereGeometry(R * 1.005, 20, 12, P * 0.15, P * 0.25, P * 0.2, P * 0.25), K3D.flat(hot('#ffffff', 1.1), { transparent: true, opacity: 0.35, depthWrite: false })); glint.renderOrder = 13; cab.add(glint);
    const ringC = K3D.mesh(new T.TorusGeometry(R, 0.07, 8, 32).rotateX(P / 2), chrome(), { ink: A.INK, inkW: 0.7 }); ringC.position.y = -0.18; cab.add(ringC);
    const crown = K3D.mesh(new T.CylinderGeometry(0.3, 0.42, 0.22, 16), red(), { ink: A.INK, inkW: 0.6 }); crown.position.y = R - 0.02; cab.add(crown);
    const base = K3D.mesh(new T.SphereGeometry(R * 1.01, 24, 10, 0, P * 2, P * 0.6, P * 0.4), red(), { ink: A.INK, inkW: 0.7 }); cab.add(base);
    // inside: a seat, a little console with buttons and the joystick Pip leans on
    const seat = K3D.mesh(K3D.roundBox(0.7, 0.18, 0.5, 0.5, 12), M('seat', () => K3D.toon('#5fd6a0')), { ink: A.INK, inkW: 0.5 }); seat.position.set(0, -0.62, -0.18); cab.add(seat);
    const console_ = K3D.mesh(new T.BoxGeometry(0.75, 0.22, 0.26), M('console', () => K3D.toon('#2a2630')), { ink: A.INK, inkW: 0.5 }); console_.position.set(0, -0.42, 0.5); console_.rotation.x = -0.4; cab.add(console_);
    const btnCols = ['#ff5a5a', '#ffd23a', '#5aff8a'];
    btnCols.forEach((bc, i) => { const b = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 0.04, 10), K3D.flat(hot(bc, 1.5))); b.position.set(-0.22 + i * 0.12, -0.3, 0.52); b.rotation.x = -0.4; cab.add(b); });
    const stick = new T.Group(); stick.position.set(0.22, -0.32, 0.46); cab.add(stick);
    stick.add(new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.3, 6).translate(0, 0.15, 0), chrome()));
    const knob = K3D.mesh(new T.SphereGeometry(0.075, 12, 10), M('knob', () => K3D.toon('#ff3a2a')), { ink: A.INK, inkW: 0.5 }); knob.position.y = 0.32; stick.add(knob);
    // Pip, sitting in the cab (scaled a little to fit, dressed by the scene)
    const pipSeat = new T.Group(); pipSeat.position.set(0, -0.6, -0.08); cab.add(pipSeat);
    // the winch drum under the cab and the claw's cable
    const drum = K3D.mesh(new T.CylinderGeometry(0.22, 0.22, 0.5, 14).rotateZ(P / 2), steel(), { ink: A.INK, inkW: 0.5 }); drum.position.y = -0.05; hang.add(drum);
    const under = K3D.mesh(new T.CylinderGeometry(0.2, 0.16, 0.14, 12), red(), { ink: A.INK, inkW: 0.5 }); under.position.y = -R - 0.02; cab.add(under);
    const cable = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 1, 6).translate(0, -0.5, 0), M('cable', () => K3D.toon('#2a2a30'))); hang.add(cable);
    // the claw: a chrome hub with a motor cap, three long curved fingers with rubber tips (they open and close)
    const head = new T.Group(); hang.add(head);
    const hub = K3D.mesh(new T.CylinderGeometry(0.42, 0.5, 0.55, 18), chrome(), { ink: A.INK, inkW: 0.8 }); hub.position.y = 0.32; head.add(hub);
    const cap = K3D.mesh(new T.SphereGeometry(0.42, 16, 10, 0, P * 2, 0, P / 2), red(), { ink: A.INK, inkW: 0.7 }); cap.position.y = 0.58; head.add(cap);
    const bolt = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.16, 6), steel()); bolt.position.y = 0.98; head.add(bolt);
    const fingers = [];
    const fingerGeo = K3D.geo('acm-finger', () => {
      const c = new T.CatmullRomCurve3([new T.Vector3(0, 0, 0), new T.Vector3(0.35, -0.45, 0), new T.Vector3(0.55, -1.15, 0), new T.Vector3(0.38, -1.75, 0), new T.Vector3(0.12, -2.0, 0)]);
      return new T.TubeGeometry(c, 20, 0.09, 8, false);
    });
    for (let i = 0; i < 3; i++) {
      const piv = new T.Group(); piv.rotation.y = i * P * 2 / 3; piv.position.y = 0.1; head.add(piv);
      const fing = new T.Group(); fing.position.x = 0.36; piv.add(fing);
      fing.add(K3D.mesh(fingerGeo, chrome(), { ink: A.INK, inkW: 0.8 }));
      const knuckle = K3D.mesh(new T.SphereGeometry(0.14, 10, 8), steel(), { ink: A.INK, inkW: 0.5 }); fing.add(knuckle);
      const tip = K3D.mesh(new T.CapsuleGeometry(0.13, 0.18, 4, 8), M('rubber', () => K3D.toon('#2a2a34')), { ink: A.INK, inkW: 0.6 }); tip.position.set(0.1, -2.05, 0); tip.rotation.z = 0.6; fing.add(tip);
      fingers.push(fing);
    }
    // the aim ring on the ground and the thin beam to it: orange, drawn through everything
    const ringM = K3D.flat(hot('#ff8a1a', 2.2), { transparent: true, opacity: 0.95, depthWrite: false });
    ringM.depthTest = false;
    const aim = new T.Group(); aim.renderOrder = 30;
    const ar = new T.Mesh(new T.RingGeometry(0.62, 0.82, 40).rotateX(-P / 2), ringM); ar.renderOrder = 30; aim.add(ar);
    const ar2 = new T.Mesh(new T.RingGeometry(0.2, 0.28, 24).rotateX(-P / 2), ringM); ar2.renderOrder = 30; aim.add(ar2);
    for (let i = 0; i < 4; i++) { const tk = new T.Mesh(new T.PlaneGeometry(0.1, 0.32).rotateX(-P / 2), ringM); tk.position.set(Math.sin(i * P / 2) * 1.0, 0, Math.cos(i * P / 2) * 1.0); tk.rotation.y = i * P / 2; tk.renderOrder = 30; aim.add(tk); }
    const halo = new T.Mesh(new T.CircleGeometry(1.25, 32).rotateX(-P / 2), K3D.flat(hot('#ff8a1a', 0.7), { transparent: true, opacity: 0.35, depthWrite: false, add: true })); halo.material.depthTest = false; halo.renderOrder = 29; aim.add(halo);
    g.add(aim);
    const beamM = K3D.flat(hot('#ff9a3a', 1.6), { transparent: true, opacity: 0.55, depthWrite: false, add: true }); beamM.depthTest = false;
    const beam = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 1, 6).translate(0, 0.5, 0), beamM); beam.renderOrder = 30; g.add(beam);
    K.add(g);
    return { g, bridge, trolley, hang, cab, pole, cable, head, fingers, aim, beam, ringM, stick, pipSeat, beacon, glint, CAB, btns: cab.children.filter(o => o.geometry && o.geometry.type === 'CylinderGeometry' && o.position.y > -0.31 && o.position.y < -0.29) };
  }

  /* ---------- the Snatcher ---------- */
  function snatcher(K) {
    const g = new T.Group(); g.name = 'snatcher';
    const body = new T.Group(); g.add(body);
    // its carriage: an old red box with rust, a maintenance sticker and a cracked red lamp like one eye
    const box = K3D.mesh(K3D.roundBox(2.6, 1.6, 2.2, 0.35, 20), red(), { ink: A.INK, inkW: 1 }); box.position.y = 0.2; body.add(box);
    const stk = new T.Mesh(new T.PlaneGeometry(0.9, 0.6), K3D.toon('#ffffff', { map: K3D.paint('acm-maint', 128, 96, (c, w, h) => { c.fillStyle = '#f2ecd0'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a3a3a'; c.font = 'bold 13px monospace'; c.fillText('SERVICED', 10, 20); c.font = '11px monospace'; c.fillText('03/71  ok', 10, 40); c.fillText('09/74  ok', 10, 56); c.fillText('??/??  ', 10, 72); c.strokeStyle = '#a03030'; c.lineWidth = 3; c.beginPath(); c.moveTo(60, 64); c.lineTo(110, 80); c.stroke(); }) }));
    stk.position.set(-0.6, 0.6, 1.11); stk.rotation.z = 0.08; body.add(stk);
    const lampBox = K3D.mesh(new T.CylinderGeometry(0.5, 0.55, 0.4, 18).rotateX(P / 2), steel(), { ink: A.INK, inkW: 0.8 }); lampBox.position.set(0.55, 0.65, 1.1); body.add(lampBox);
    const lamp = new T.Mesh(new T.SphereGeometry(0.42, 18, 12, 0, P * 2, 0, P / 2).rotateX(P / 2), K3D.flat(hot('#ff2a1a', 0.25))); lamp.position.set(0.55, 0.65, 1.3); body.add(lamp);
    const crack = new T.Mesh(new T.PlaneGeometry(0.7, 0.7), K3D.flat('#ffffff', { map: K3D.paint('acm-crack', 64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(20, 10); c.lineTo(30, 28); c.lineTo(26, 40); c.lineTo(38, 56); c.moveTo(30, 28); c.lineTo(46, 24); c.stroke(); }), transparent: true, depthWrite: false })); crack.position.set(0.55, 0.65, 1.73); body.add(crack);
    // the chain it hangs by, rattling, and a coil of cable
    const chain = new T.Group(); body.add(chain);
    for (let i = 0; i < 9; i++) { const l = K3D.mesh(K3D.geo('acm-link', () => new T.TorusGeometry(0.16, 0.05, 5, 10).scale(1, 1.5, 1)), steel(), { ink: false }); l.position.y = -0.7 - i * 0.36; l.rotation.y = i % 2 ? P / 2 : 0; chain.add(l); }
    // the claw: a big four-fingered head, one finger bent out of true
    const head = new T.Group(); head.position.y = -4.2; body.add(head);
    const hub = K3D.mesh(new T.CylinderGeometry(0.7, 0.85, 0.9, 18), red(), { ink: A.INK, inkW: 1 }); head.add(hub);
    const fingers = [];
    const fgeo = K3D.geo('acm-sfinger', () => new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 0, 0), new T.Vector3(0.6, -0.7, 0), new T.Vector3(0.9, -1.8, 0), new T.Vector3(0.55, -2.8, 0), new T.Vector3(0.15, -3.1, 0)]), 20, 0.16, 8, false));
    for (let i = 0; i < 4; i++) {
      const piv = new T.Group(); piv.rotation.y = i * P / 2 + 0.3; head.add(piv);
      const f = new T.Group(); f.position.x = 0.6; piv.add(f);
      f.add(K3D.mesh(fgeo, steel(), { ink: A.INK, inkW: 1 }));
      const claw2 = K3D.mesh(new T.ConeGeometry(0.2, 0.5, 8), red(), { ink: A.INK, inkW: 0.8 }); claw2.position.set(0.12, -3.2, 0); claw2.rotation.z = P + 0.5; f.add(claw2);
      if (i === 2) { f.rotation.z = 0.35; f.rotation.x = 0.25; }
      fingers.push(f);
    }
    // cobwebs between its fingers (it has hung asleep for years)
    const web = A.web(K, [0, -1.6, 0], 1.3); web.rotation.x = P / 2; head.add(web);
    const web2 = A.web(K, [1.1, 0.1, 0.6], 0.8); body.add(web2);
    // its own rail: a rusty beam across the hall
    const railG = new T.Group(); g.add(railG);
    g.userData = { body, head, fingers, lamp, chain, railG };
    K.add(g);
    return g;
  }

  /* ---------- outside the glass ---------- */
  const GAMES = ['ROCKET RODEO', 'BEEP BOOP', 'NEON NIBBLERS', 'STAR DOUGH', 'GLITCH GARDEN', 'MOON MOPPER', 'TURBO TOAST', 'BLIP BLAST', 'COIN COMET', 'PIXEL PUDDLE'];
  const screenTex = i => K3D.paint('acm-scr' + i, 128, 96, (c, w, h) => {
    const bg = ['#0a1a3a', '#1a0a2a', '#0a2a1a', '#2a1a0a'][i % 4]; c.fillStyle = bg; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 40; k++) { c.fillStyle = A.NEON[(k + i) % A.NEON.length]; c.fillRect(Math.floor(A.rnd() * 16) * 8, Math.floor(A.rnd() * 12) * 8, 8, 8); }
    c.fillStyle = '#ffffff'; c.font = 'bold 10px monospace'; c.fillText('HI ' + (1000 + i * 4321), 6, 12);
    for (let y = 0; y < h; y += 3) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, y, w, 1); }
  });
  function outside(K, o = {}) {
    const g = new T.Group(); g.name = 'outside';
    const bulbs = o.bulbs;
    const cabM = M('cabinet', () => K3D.toon('#24202a', { map: A.grimeTex() }));
    // rows of cabinets either side, beyond the side glass, facing the machine (dim, out of focus, glowing screens)
    for (const sx of [-1, 1]) for (let z = 30, i = 0; z > -300; z -= 7.5, i++) {
      const x = sx * (34 + (i % 3) * 2), h = 18 + (i % 2) * 3;
      const cb = K3D.mesh(K3D.geo('acm-cab', () => new T.BoxGeometry(6, 1, 6)), cabM, { ink: false }); cb.scale.y = h; cb.position.set(x, -4 + h / 2, z); g.add(cb);
      const scr = new T.Mesh(new T.PlaneGeometry(4.4, 3.4), K3D.flat(hot('#ffffff', 1.25), { map: screenTex(i) })); scr.position.set(x - sx * 3.05, h * 0.62 - 4, z); scr.rotation.y = -sx * P / 2; g.add(scr);
      const mq = A.neon(K, GAMES[i % GAMES.length], { w: 5.2, h: 1.3, col: A.NEON[i % 8], col2: A.NEON[(i + 3) % 8], flicker: i % 5 === 0 }); mq.position.set(x - sx * 3.05, h - 4 - 1.2, z); mq.rotation.y = -sx * P / 2; g.add(mq);
      if (o.glows) o.glows.add(x - sx * 3.6, h * 0.62 - 4, z, 4.2, A.NEON[i % 8], 0.22, 0.2);
    }
    // the pinball table of 43-2 on the left, its lights still running (seen through the side glass)
    const pin = new T.Group(); pin.position.set(-28, -4, -60); g.add(pin);
    const tbl = K3D.mesh(new T.BoxGeometry(7, 3, 14), cabM, { ink: false }); tbl.position.y = 9; tbl.rotation.x = -0.12; pin.add(tbl);
    const legs = [[-3, -6], [3, -6], [-3, 6], [3, 6]]; for (const [lx, lz] of legs) { const l = new T.Mesh(new T.BoxGeometry(0.5, 8, 0.5), cabM); l.position.set(lx, 4, lz); pin.add(l); }
    const back = K3D.mesh(new T.BoxGeometry(7, 7, 1.2), cabM, { ink: false }); back.position.set(0, 14, -7.4); pin.add(back);
    const bglass = new T.Mesh(new T.PlaneGeometry(6, 5), K3D.flat(hot('#ffffff', 1.3), { map: K3D.paint('acm-pinback', 256, 200, (c, w, h) => { const g2 = c.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, '#2a0a4a'); g2.addColorStop(1, '#0a1a4a'); c.fillStyle = g2; c.fillRect(0, 0, w, h); for (let i = 0; i < 30; i++) { c.fillStyle = '#ffe24a'; c.beginPath(); c.arc(A.rnd() * w, A.rnd() * h, 2, 0, P * 2); c.fill(); } c.fillStyle = '#ff5ad6'; c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.fillText('COMET', w / 2, 80); c.fillStyle = '#4ae8ff'; c.fillText('CARNIVAL', w / 2, 120); }) }));
    bglass.position.set(0, 14, -6.75); pin.add(bglass);
    if (bulbs) for (let i = 0; i < 40; i++) bulbs.add(-28 + (A.rnd() - 0.5) * 6, 10.6 + A.rnd() * 0.4, -60 + (A.rnd() - 0.5) * 12, A.NEON[i % 8], { size: 0.22, speed: 2 + A.rnd() * 3, phase: i });
    // a neon OPEN sign seen from behind (reversed), on the arcade's far window, rain running down the glass
    const open = A.neon(K, 'OPEN', { w: 7, h: 2.6, col: '#ff3a5a', col2: '#ffd23a' }); open.position.set(46, 18, -140); open.rotation.y = P / 2; open.scale.x = -1; g.add(open);
    const win = new T.Mesh(new T.PlaneGeometry(30, 18), K3D.flat(hot('#ffffff', 0.7), { map: K3D.paint('acm-rain', 256, 160, (c, w, h) => { c.fillStyle = '#0a1420'; c.fillRect(0, 0, w, h); for (let i = 0; i < 18; i++) { c.fillStyle = 'rgba(255,220,150,0.5)'; c.beginPath(); c.arc(A.rnd() * w, A.rnd() * h * 0.6, 3 + A.rnd() * 6, 0, P * 2); c.fill(); } for (let i = 0; i < 120; i++) { c.strokeStyle = 'rgba(180,200,230,0.35)'; c.lineWidth = 1; c.beginPath(); const x = A.rnd() * w, y = A.rnd() * h; c.moveTo(x, y); c.lineTo(x + 1, y + 6 + A.rnd() * 14); c.stroke(); } }) }));
    win.position.set(48, 20, -150); win.rotation.y = -P / 2; g.add(win);
    const rainU = { t: 0 }; K.tick(dt => { rainU.t += dt; win.material.map.offset.y = -rainU.t * 0.08; });
    win.material.map.wrapT = T.RepeatWrapping;
    // through the front glass (behind the start): the giant joystick, the buttons and the coin door of Prize Palace
    const ctl = new T.Group(); ctl.position.set(0, -4, 34); g.add(ctl);
    const deck = K3D.mesh(new T.BoxGeometry(40, 4, 14), red(), { ink: A.INK }); deck.position.y = 0; deck.rotation.x = 0.15; ctl.add(deck);
    const jsBase = K3D.mesh(new T.CylinderGeometry(2.4, 3, 1, 24), K3D.toon('#1a1a20'), { ink: A.INK }); jsBase.position.set(-8, 2.4, -2); ctl.add(jsBase);
    const jsShaft = K3D.mesh(new T.CylinderGeometry(0.5, 0.5, 9, 12), chrome(), { ink: A.INK }); jsShaft.position.set(-8, 7, -2); jsShaft.rotation.z = 0.15; ctl.add(jsShaft);
    const jsKnob = K3D.mesh(new T.SphereGeometry(2.6, 24, 18), K3D.toon('#ff3a2a'), { ink: A.INK }); jsKnob.position.set(-8.7, 11.6, -2); ctl.add(jsKnob);
    for (const [bx, bc] of [[4, '#5aff8a'], [9, '#ffd23a']]) { const b = K3D.mesh(new T.CylinderGeometry(2.2, 2.2, 1.2, 24), K3D.toon(bc, { emissive: bc, emissiveIntensity: 0.5 }), { ink: A.INK }); b.position.set(bx, 2.4, -1); ctl.add(b); }
    const coin = K3D.mesh(new T.BoxGeometry(8, 9, 0.8), steel(), { ink: A.INK }); coin.position.set(14, -4, 7); ctl.add(coin);
    const slot = new T.Mesh(new T.PlaneGeometry(0.5, 2.6), K3D.flat(hot('#ff8a3a', 1.6))); slot.position.set(14, -3, 7.45); ctl.add(slot);
    const insert = new T.Mesh(new T.PlaneGeometry(5, 1.1), K3D.toon('#ffffff', { map: K3D.paint('acm-insert', 256, 56, (c, w, h) => { c.fillStyle = '#1a1a1a'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd23a'; c.font = 'bold 28px sans-serif'; c.textAlign = 'center'; c.fillText('1 COIN  1 PLAY', w / 2, 38); }) }));
    insert.position.set(14, -0.5, 7.45); ctl.add(insert);
    // the great soft shadow of something passing (a cleaner? a cat?): a dark blur that drifts across the far arcade
    const shadowM = K3D.flat('#000000', { transparent: true, opacity: 0.0, depthWrite: false });
    const shadow = new T.Mesh(new T.PlaneGeometry(60, 40), shadowM); shadow.position.set(40, 14, -80); shadow.rotation.y = -P / 2; g.add(shadow);
    let st = 0; K.tick(dt => { st += dt; const u = (st % 47) / 9; shadowM.opacity = u < 1 ? Math.sin(u * P) * 0.55 : 0; shadow.position.z = -40 - u * 80; });
    K.add(g);
    return g;
  }

  return { hall, rail, railUpdate, claw, snatcher, outside, chrome, steel, red };
})();
