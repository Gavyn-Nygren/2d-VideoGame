/* Pip & Bo - 43-2 Pinball Panic: the Chrome Rails, part 3 of the table (PINBALL_RAILS). Scenery only. Loaded on demand
   with the 3D kit after pinball-life.js, which calls PINBALL_RAILS.build(K, SC, kit, H) and .update(...) (see
   pinball-town.js for the hand-off).

   THE CHROME RAILS (d 191 to 284), high above the table: the upper playfield is a sheet of clear printed plastic held
   up on acrylic columns 7.5 above the main table, which carries on, lit, underneath. Its gaps (the spinner bridges' and
   the rail edges') are real holes you can see down through; a ball that drops falls into a catch net on the table
   below and the lift tube on the right sends it back up.
     the rocket        (landmark) a rocket ship on a long swinging arm from a mast at the top of the rails: it swings
                       over the upper playfield and back, and the moment it crosses the lanes is the rules' wash (the
                       wind), pushing the way it flies; it turns round at each end of its swing. An astronaut waves
     the ringed planet on the left below the rails: its ring is a spinning disc that creatures ride
     the moon          on the right below the rails, with a hole in it, a ladder up, a flag, a creature fishing in it
     the Ferris spinner a Ferris wheel made from a spinner's flags, gondolas on the ends (the couple on a date)
     the ring bumper   the one bumper up here is a little planet with a ring of neon that flashes when it kicks
   Little stories (part 3):
     1. the couple on a date on the Ferris spinner (a heart over their gondola); the wheel speeds up when a spinner turns
     2. the ring riders on the planet: one keeps falling off the low edge and climbing back on
     3. the moon fisher: now and then a star bites; held up proudly, thrown back
     4. the astronaut in the rocket's bubble, waving, then holding on for dear life over the lanes
     5. two window cleaners in a cradle hanging from the glass sky, squeegees going
     6. the handcar crew pumping along a track on the left rim of the plastic
     7. the rail polisher: a gleam runs off along the chrome where they have rubbed
     8. the parachuters: creatures stepping off the rim under umbrellas, floating down, climbing back up a column
     9. the catch-net brigade under each gap: when a ball drops, they bounce it in the net and cheer
    10. the kite flyer on the shoulder below, the kite tugged sideways when the rocket goes by
    11. the stargazer with a brass telescope, following the heroes */
'use strict';

const PINBALL_RAILS = (function () {
  const T = K3D.T, TB = PINBALL_TABLE, A = ARCADE;
  const W = {};
  let kit = null, H = null;
  const DA = 190.8, DB = 283.4, XL = -8.8, XR = 9.9; // the plastic sheet
  const add = (par, geo, mat, x, y, z, o = {}) => { const m = o.ink ? K3D.mesh(geo, mat, { ink: o.ink, inkW: o.inkW || 0.4 }) : new T.Mesh(geo, mat); m.position.set(x, y, z); if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; par.add(m); return m; };
  const cyl = (r0, r1, h, n = 20, open = false) => new T.CylinderGeometry(r0, r1, h, n, 1, open);
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);

  /* ---------- the printed plastic ---------- */
  const deckTex = () => K3D.paint('rl-deck', 512, 2048, (c, w, h) => {
    const X = x => (x - XL) / (XR - XL) * w, Y = d => (1 - (d - DA) / (DB - DA)) * h;
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(150,210,255,0.10)'; c.fillRect(0, 0, w, h);
    // thicker-looking edges (light caught in the acrylic)
    for (const [x0, x1] of [[0, 18], [w - 18, w]]) { const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(x0 ? 0 : 1, 'rgba(140,230,255,0)'); g.addColorStop(x0 ? 1 : 0, 'rgba(140,230,255,0.45)'); c.fillStyle = g; c.fillRect(x0, 0, x1 - x0, h); }
    // a starfield printed in white ink, orbits in dashed gold, planets in soft colours
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(255,255,240,${0.15 + A.rnd() * 0.45})`; c.fillRect(A.rnd() * w, A.rnd() * h, 1.5 + A.rnd() * 1.5, 1.5 + A.rnd() * 1.5); }
    c.setLineDash([10, 8]); c.lineWidth = 3;
    for (const [x, d, rx, ry] of [[-3, 200, 4, 3], [3.5, 224, 3.5, 2.6], [-2, 246, 4.5, 3.4], [2.5, 270, 4, 3]]) { c.strokeStyle = 'rgba(255,210,74,0.38)'; c.beginPath(); c.ellipse(X(x), Y(d), rx / (XR - XL) * w, ry / (DB - DA) * h, 0.3, 0, Math.PI * 2); c.stroke(); }
    c.setLineDash([]);
    for (const [x, d, r, col] of [[-6, 230, 1.2, '255,120,170'], [6.6, 212, 0.9, '120,220,255'], [6.2, 258, 1.4, '170,140,255'], [-6.4, 276, 0.8, '255,200,90']]) { const g = c.createRadialGradient(X(x), Y(d), 2, X(x), Y(d), r / (XR - XL) * w); g.addColorStop(0, `rgba(${col},0.55)`); g.addColorStop(1, `rgba(${col},0.05)`); c.fillStyle = g; c.beginPath(); c.ellipse(X(x), Y(d), r / (XR - XL) * w, r / (DB - DA) * h, 0, 0, Math.PI * 2); c.fill(); }
    // the title, printed big and faint (reads from the bottom)
    c.save(); c.fillStyle = 'rgba(200,240,255,0.22)'; c.font = '900 60px "DejaVu Sans", sans-serif'; c.textAlign = 'center';
    c.translate(w / 2, Y(193.5)); c.scale(1, 3.6); c.fillText('CHROME RAILS', 0, 0); c.restore();
    // scratches and smears, a ball-worn line down each lane
    for (let i = 0; i < 160; i++) { const x = A.rnd() * w, y = A.rnd() * h; c.strokeStyle = `rgba(255,255,255,${0.05 + A.rnd() * 0.12})`; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + A.rnd() * 40 - 20, y + A.rnd() * 60 - 30); c.stroke(); }
    for (const x of [-4, 4]) { const g = c.createLinearGradient(X(x - 1.2), 0, X(x + 1.2), 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.07)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(X(x - 1.2), 0, X(x + 1.2) - X(x - 1.2), h); }
  });
  const netTex = () => K3D.paint('rl-net', 128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(240,240,250,0.85)'; c.lineWidth = 2; for (let k = 0; k <= w; k += 12) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, h); c.stroke(); c.beginPath(); c.moveTo(0, k); c.lineTo(w, k); c.stroke(); } }, { repeat: true });
  const planetTex = () => K3D.paint('rl-planet', 256, 128, (c, w, h) => { const bands = ['#e86a3a', '#f2b05a', '#c84a5a', '#f2d08a', '#e87a4a', '#b8405a', '#f2c070']; let y = 0; while (y < h) { const bh = 6 + A.rnd() * 18; c.fillStyle = A.pick(bands); c.fillRect(0, y, w, bh); y += bh; } for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(A.rnd() * w, A.rnd() * h, 30 + A.rnd() * 60, 2); } c.fillStyle = 'rgba(120,30,40,0.5)'; c.beginPath(); c.ellipse(w * 0.3, h * 0.6, 18, 9, 0, 0, 7); c.fill(); });
  const moonTex = () => K3D.paint('rl-moon', 256, 128, (c, w, h) => { c.fillStyle = '#e8e0c8'; c.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { const x = A.rnd() * w, y = A.rnd() * h, r = 2 + A.rnd() * 10; c.fillStyle = 'rgba(150,140,120,0.45)'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,240,0.35)'; c.beginPath(); c.arc(x - r * 0.25, y - r * 0.25, r * 0.6, 0, 7); c.fill(); } });
  const ringTex = () => K3D.paint('rl-ring', 256, 16, (c, w, h) => { for (let x = 0; x < w; x++) { const v = 0.6 + 0.4 * Math.sin(x * 0.35) * Math.sin(x * 0.07); c.fillStyle = `rgba(${Math.round(240 * v)},${Math.round(200 * v)},${Math.round(140 * v)},1)`; c.fillRect(x, 0, 1, h); } }, { repeat: true });
  const rocketTex = () => K3D.paint('rl-rocket', 256, 64, (c, w, h) => { c.fillStyle = '#f2e6c8'; c.fillRect(0, 0, w, h); c.fillStyle = '#c0182a'; for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 28, h); c.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = 6; x < w; x += 16) for (const y of [6, h - 8]) c.fillRect(x, y, 3, 3); }, { repeat: true });

  /* ---------- the ring bumper: a little planet ---------- */
  function ringBumper(K, B) {
    B.tall = true; B.col = '#4ae8ff'; B.body.material.color.set('#2a3a8a');
    const live = new T.Group(); live.userData.live = true; B.g.add(live);
    const pl = add(live, new T.SphereGeometry(0.6, 24, 16), K3D.toon('#ffffff', { map: planetTex() }), 0, 1.75, 0, { ink: kit.INK });
    const ring = new T.Mesh(new T.RingGeometry(0.85, 1.25, 40).rotateX(-Math.PI / 2), B.capMat); ring.material.side = T.DoubleSide; ring.position.y = 1.85; ring.rotation.z = 0.35; live.add(ring);
    B.cap.visible = false;
    const moonlet = add(live, new T.SphereGeometry(0.14, 12, 10), A.toonM('#e8e0c8'), 1.0, 1.9, 0);
    kit.lamps.bulb.add(B.q.x, B.q.y + 2.45, B.q.z, 0.08, '#ffffff', 2.4, { mode: 2, sp: 2 });
    W.ringB = { pl, ring, moonlet };
  }

  /* ====================================================================================================
     Build
     ==================================================================================================== */
  function build(K, SC, k, h) {
    kit = k; H = h; H.towns.ring = ringBumper;
    const { V, lamps, glows, chrome, INK, SH, yb } = kit, still = H.still, crit = H.crit, yA = TB.yAt;
    A.seed(4323);
    const gaps = TB.holes.filter(q => q.kind === 'gap' && q.d0 > DA && q.d1 < DB);
    /* ---------- the clear plastic upper playfield ---------- */
    {
      const xs = new Set([XL, XR, -7.75, 7.75]); for (let x = XL; x < XR; x += 1.1) xs.add(+x.toFixed(2));
      const ds = new Set([DA, DB, 191.2, 191.6, 192.0]); for (let d = 192; d < DB; d += 2) ds.add(d);
      for (const g of gaps) { xs.add(g.x0); xs.add(g.x1); ds.add(g.d0); ds.add(g.d1); }
      const X = [...xs].sort((a, b) => a - b), D = [...ds].sort((a, b) => a - b);
      const pos = [], uv = [], idx = [];
      const inGap = (x, d) => gaps.some(g => x > g.x0 && x < g.x1 && d > g.d0 && d < g.d1);
      for (let j = 0; j < D.length - 1; j++) for (let i = 0; i < X.length - 1; i++) {
        const x0 = X[i], x1 = X[i + 1], d0 = D[j], d1 = D[j + 1]; if (inGap((x0 + x1) / 2, (d0 + d1) / 2)) continue;
        const n = pos.length / 3;
        for (const [x, d] of [[x0, d0], [x1, d0], [x1, d1], [x0, d1]]) { pos.push(x, yA(d) - 0.03, -d); uv.push((x - XL) / (XR - XL), (d - DA) / (DB - DA)); }
        idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
      }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
      const deck = new T.Mesh(geo, new T.MeshBasicMaterial({ map: deckTex(), transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false })); deck.renderOrder = 2; deck.userData.live = true; K.add(deck);
      // its glowing edges (the outside, the ends and round every hole), the plastic's thickness
      const edge = A.flatM('#8af0ff', 1.6), edgeLine = (pts) => K.add(kit.wire(pts, 0.035, edge, { seg: Math.max(8, pts.length * 2), rs: 5 }));
      for (const x of [XL, XR]) { const pts = []; for (let d = DA; d <= DB + 0.01; d += 1.5) pts.push(V(x, yA(Math.min(d, DB)) - 0.03, -Math.min(d, DB))); edgeLine(pts); }
      for (const d of [DA, DB]) edgeLine([V(XL, yA(d) - 0.03, -d), V(XR, yA(d) - 0.03, -d)]);
      for (const g of gaps) edgeLine([V(g.x0, yA(g.d0), -g.d0), V(g.x1, yA(g.d0), -g.d0), V(g.x1, yA(g.d1), -g.d1), V(g.x0, yA(g.d1), -g.d1), V(g.x0, yA(g.d0), -g.d0)]);
      // under the sheet: acrylic columns with chrome caps down to the table, a ladder on one
      const acr = new T.MeshBasicMaterial({ color: A.hot('#a8e8ff', 0.5), transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false });
      W.cols = [];
      for (const [x, dStep, d0] of [[-8.3, 12, 196], [9.4, 12, 202], [0, 24, 204]]) for (let d = d0; d < DB - 2; d += dStep) {
        if (gaps.some(g => x > g.x0 - 0.5 && x < g.x1 + 0.5 && d > g.d0 - 0.6 && d < g.d1 + 0.6)) continue;
        const y0 = yb(d), y1 = yA(d) - 0.05, L = y1 - y0;
        const c = add(K, cyl(0.24, 0.24, L, 16, true), acr, x, y0 + L / 2, -d); c.renderOrder = 1;
        add(still, cyl(0.34, 0.38, 0.22, 16), chrome, x, y0 + 0.11, -d, { ink: INK });
        add(still, cyl(0.38, 0.3, 0.2, 16), chrome, x, y1 - 0.1, -d, { ink: INK });
        for (let yy = y0 + 1.6; yy < y1 - 0.5; yy += 1.8) add(still, new T.TorusGeometry(0.25, 0.035, 6, 16).rotateX(Math.PI / 2), chrome, x, yy, -d);
        lamps.bulb.add(x, y0 + 0.3, -d + 0.36, 0.07, '#8af0ff', 1.8, { mode: 1, sp: 0.6, ph: d * 0.03 });
        W.cols.push({ x, d, y0, y1 });
      }
      // the lift tubes on the right (a dropped ball is shot back up one)
      for (const s of TB.sections.filter(q => q.part === 2)) {
        const d = s.spawn[0][1] - 9; if (d < 192) continue;
        const x = TB.T.RAIL3 + 1.6, y0 = yb(d), y1 = yA(d) + 0.6, L = y1 - y0;
        const tube = add(K, cyl(1.0, 1.0, L, 24, true), new T.MeshBasicMaterial({ color: A.hot('#bff0ff', 0.45), transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide, toneMapped: false }), x, y0 + L / 2, -d); tube.renderOrder = 1;
        for (let yy = y0 + 0.4; yy < y1; yy += 1.2) add(still, new T.TorusGeometry(1.02, 0.05, 6, 24).rotateX(Math.PI / 2), chrome, x, yy, -d);
        lamps.bulb.line(V(x - 1.05, y0 + 0.3, -d), V(x - 1.05, y1, -d), 0.5, 0.06, ['#8af0ff', '#ffffff'], 2, { mode: 1, sp: 1.6, step: -0.12 });
        const sg = H.sign('LIFT\n↑', 0.8, 0.8, { fg: '#1a6ac0', k: 0.34 }); sg.position.set(x, y0 + 2.2, -d + 1.05); still.add(sg);
      }
      // the plunger lane along the right rim, where the lift sends a ball back in
      for (const x of [8.55, 9.75]) { const pts = []; for (let d = 193; d <= DB - 1; d += 3) pts.push(V(x, yA(d) + 0.3, -d)); still.add(kit.wire(pts, 0.05, chrome, { seg: 90 })); }
    }
    /* ---------- the table below: lit orbits and arrows, a crowd looking up ---------- */
    for (const [x, d, r, col] of [[-3.5, 204, 4.2, '#ff5ad6'], [4, 228, 4.6, '#4ae8ff'], [-3, 252, 5, '#ffd24a'], [3.5, 272, 4, '#5aff8a']]) {
      const n = Math.round(r * 7); for (let j = 0; j < n; j++) { const a = j / n * Math.PI * 2, q = V(x + Math.cos(a) * r, yb(d - Math.sin(a) * r) + 0.03, -d + Math.sin(a) * r); lamps.disc.add(q.x, q.y, q.z, 0.18, col, 1.3, { mode: 1, sp: 0.5, ph: j / n }); }
      glows.add(x, yb(d) + 0.6, -d, r * 1.6, col, 0.06, 0.1);
    }
    for (const x of [-6, 6]) for (let d = 194; d < 282; d += 1.2) { const q = V(x, yb(d) + 0.03, -d); lamps.arrow.add(q.x, q.y, q.z, 0.26, '#ffd890', 1.0, { mode: 1, sp: 0.4, ph: -d * 0.05 }); }
    for (let i = 0; i < 70; i++) {
      const d = 193 + A.rnd() * 90, x = (A.rnd() - 0.5) * 16;
      if (W.cols.some(c => Math.abs(c.x - x) < 0.8 && Math.abs(c.d - d) < 0.8)) continue;
      crit.add(x, yb(d), -d, { act: A.pick(['idle', 'wave', 'cheer', 'wave', 'sit', 'walk']), yaw: A.rnd() * 6.28, s: 0.9 + A.rnd() * 0.4 });
    }
    // the shoulders down there: a crowd along the walls under the rails
    for (const s of [-1, 1]) for (let d = 193; d < 284; d += 1.3) { if (A.rnd() < 0.45) continue; if (Math.abs(d - (s < 0 ? 215 : 245)) < 5 || (s > 0 && Math.abs(d - 203) < 4.5)) continue; const q = V(s * (9.6 + A.rnd() * 5), yb(d) + SH, -d); crit.add(q.x, q.y, q.z, { act: A.pick(['idle', 'wave', 'cheer', 'sit']), yaw: s > 0 ? -Math.PI / 2 : Math.PI / 2, s: 0.9 + A.rnd() * 0.4 }); }
    /* ---------- 9. the catch nets under the holes, each held by a brigade ---------- */
    W.nets = [];
    for (const g of gaps) {
      const x = (g.x0 + g.x1) / 2, d = (g.d0 + g.d1) / 2, r = Math.max(0.9, Math.min(1.8, Math.min(g.x1 - g.x0, g.d1 - g.d0) / 2 + 0.3)), y0 = yb(d);
      const grp = new T.Group(); grp.position.set(x, y0 + 0.55, -d); grp.userData.live = true; K.add(grp);
      add(grp, new T.TorusGeometry(r, 0.07, 8, 32).rotateX(Math.PI / 2), A.toonM('#e8302a'), 0, 0, 0, { ink: INK });
      const net = new T.Mesh(new T.CircleGeometry(r, 32).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: netTex(), transparent: true, depthWrite: false, side: T.DoubleSide, color: A.hot('#ffffff', 0.9) })); grp.add(net);
      const holders = [];
      for (let k2 = 0; k2 < 4; k2++) { const a = k2 / 4 * Math.PI * 2 + Math.PI / 4, gy = H.guy(A.pick(['#ffd24a', '#ff8a4a', '#e8302a']), { s: 1.0 }); gy.position.set(x + Math.cos(a) * (r + 0.25), y0, -d + Math.sin(a) * (r + 0.25)); gy.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a)); K.add(gy); const helm = H.hat('#c0182a', 0.8); helm.position.y = 0.45; gy.userData.body.add(helm); holders.push(gy); }
      W.nets.push({ g, grp, net, holders, x, d, t: 9 });
    }
    /* ---------- the rocket on its swinging arm (the landmark; its pass over the lanes is the rules' wash) ---------- */
    {
      const d = 262, y0 = yb(d), yDeck = yA(d), yHub = yDeck + 5.3;
      add(still, cyl(0.22, 0.26, yHub - y0, 16), chrome, 0, (y0 + yHub) / 2, -d, { ink: INK });
      add(still, cyl(0.42, 0.42, 0.18, 20), chrome, 0, yDeck + 0.09, -d, { ink: INK });
      add(still, cyl(0.6, 0.7, 0.3, 20), A.toonM('#2a2a36'), 0, y0 + 0.15, -d, { ink: INK });
      const hub = new T.Group(); hub.position.set(0, yHub, -d); hub.userData.live = true; K.add(hub);
      add(hub, cyl(0.5, 0.5, 0.6, 24), A.toonM('#c0182a'), 0, 0, 0, { ink: INK });
      add(hub, new T.SphereGeometry(0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), A.toonM('#ffd24a'), 0, 0.3, 0, { ink: INK });
      const arm = new T.Group(); hub.add(arm);
      const R = 10;
      for (const yy of [0.12, -0.18]) add(arm, cyl(0.06, 0.06, R, 8).rotateX(Math.PI / 2), chrome, 0, yy, -R / 2);
      for (let z = 0.6; z < R; z += 0.7) add(arm, cyl(0.025, 0.025, 0.45, 5), chrome, 0, -0.03, -z, { rx: (Math.round(z / 0.7) % 2 ? 0.8 : -0.8) });
      add(arm, cyl(0.06, 0.06, 3.2, 8).rotateX(Math.PI / 2), chrome, 0, 0, 1.6);
      add(arm, new T.SphereGeometry(0.55, 20, 14), K3D.toon('#ffffff', { map: planetTex() }), 0, 0, 3.3, { ink: INK });
      add(arm, new T.TorusGeometry(0.85, 0.05, 6, 28).rotateX(Math.PI / 2 - 0.3), A.toonM('#ffd24a'), 0, 0, 3.3);
      add(arm, cyl(0.05, 0.05, 0.9, 8), chrome, 0, -0.45, -R);
      // the rocket (it turns round on its strut at each end of the swing)
      const rk = new T.Group(); rk.position.set(0, -1.1, -R); arm.add(rk);
      const body = new T.Group(); rk.add(body);
      const skin = K3D.toon('#ffffff', { map: rocketTex() });
      add(body, cyl(0.55, 0.55, 2.4, 24).rotateZ(Math.PI / 2), skin, 0, 0, 0, { ink: INK });
      add(body, new T.ConeGeometry(0.55, 1.1, 24).rotateZ(-Math.PI / 2), A.toonM('#c0182a'), 1.75, 0, 0, { ink: INK });
      add(body, cyl(0.42, 0.55, 0.5, 24).rotateZ(Math.PI / 2), A.toonM('#3a3a44'), -1.45, 0, 0, { ink: INK });
      for (let k2 = 0; k2 < 3; k2++) { const a = k2 / 3 * Math.PI * 2; const fin = add(body, box(0.7, 0.06, 0.6), A.toonM('#c0182a'), -1.0, Math.cos(a) * 0.62, Math.sin(a) * 0.62, { ink: INK }); fin.rotation.x = -a; }
      add(body, new T.TorusGeometry(0.56, 0.04, 6, 24).rotateY(Math.PI / 2), chrome, 0.9, 0, 0);
      add(body, new T.TorusGeometry(0.56, 0.04, 6, 24).rotateY(Math.PI / 2), chrome, -0.9, 0, 0);
      for (const zz of [-1, 1]) add(body, new T.CircleGeometry(0.16, 16), A.flatM('#ffe8a0', 1.6), 0.2, 0.05, zz * 0.56, { ry: zz > 0 ? 0 : Math.PI });
      // the astronaut in a bubble on top
      const astro = H.guy('#f2f2f8', { s: 0.8 }); astro.position.set(0.25, 0.5, 0); body.add(astro);
      const visor = new T.Mesh(box(0.3, 0.12, 0.02), A.flatM('#4ae8ff', 1.5)); visor.position.set(0, 0.34, 0.17); astro.userData.body.add(visor);
      const bub = new T.Mesh(new T.SphereGeometry(0.42, 20, 14), new T.MeshBasicMaterial({ color: A.hot('#bfe8ff', 0.5), transparent: true, opacity: 0.25, depthWrite: false })); bub.position.set(0.25, 0.62, 0); body.add(bub);
      // the exhaust: a flame and a glow (bigger as it crosses the lanes)
      const flame = add(body, new T.ConeGeometry(0.34, 1.2, 16).rotateZ(Math.PI / 2), new T.MeshBasicMaterial({ color: A.hot('#ffb84a', 1.8), transparent: true, opacity: 0.85, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }), -2.25, 0, 0);
      const flame2 = add(body, new T.ConeGeometry(0.2, 0.8, 12).rotateZ(Math.PI / 2), new T.MeshBasicMaterial({ color: A.hot('#fff4d0', 2.2), transparent: true, opacity: 0.9, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }), -2.0, 0, 0);
      const gi = glows.add(0, 0, 0, 2.2, '#ffb84a', 0.35, 0.3);
      const bi = []; for (let k2 = 0; k2 < 10; k2++) bi.push(lamps.bulb.add(0, -1e4, 0, 0.12, k2 % 2 ? '#ff5ad6' : '#fff4d8', 2.2, { mode: 1, sp: 1.6, ph: k2 / 10 }));
      W.rocket = { hub, arm, rk, body, flame, flame2, gi, astro, R, d, yHub, face: 0, bi };
      const sg = H.sign('ROCKET RIDE', 2.2, 0.6, { fg: '#c0182a', k: 0.46 }); sg.position.set(0, yDeck + 2.2, -d + 0.3); still.add(sg);
      for (let k2 = 0; k2 < 14; k2++) { const yy = yDeck + 0.4 + k2 * 0.35; lamps.bulb.add(0.27, yy, -d + 0.05, 0.05, k2 % 2 ? '#ffd24a' : '#ff5ad6', 2, { mode: 1, sp: 1.4, ph: -k2 / 14 }); }
    }
    /* ---------- the ringed planet below the rails (left); creatures ride its spinning ring ---------- */
    {
      const d = 215, x = -11.6, y = yb(d) + SH + 3.0;
      add(still, cyl(0.16, 0.3, y - yb(d) - SH, 12), chrome, x, (y + yb(d) + SH) / 2 - 1, -d, { ink: INK });
      add(still, cyl(0.9, 1.1, 0.3, 20), A.toonM('#2a2a36'), x, yb(d) + SH + 0.15, -d, { ink: INK });
      const pl = add(K, new T.SphereGeometry(2.1, 40, 28), K3D.toon('#ffffff', { map: planetTex(), emissive: '#3a1010', emissiveIntensity: 0.5 }), x, y, -d, { ink: INK }); pl.userData.live = true;
      const tilt = new T.Group(); tilt.position.set(x, y, -d); tilt.rotation.z = -0.28; tilt.rotation.x = 0.12; K.add(tilt); tilt.userData.live = true;
      const spin = new T.Group(); tilt.add(spin);
      const rt = ringTex(); const ring = new T.Mesh(new T.RingGeometry(2.65, 3.65, 64, 1).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: rt, side: T.DoubleSide })); spin.add(ring);
      add(spin, new T.TorusGeometry(3.65, 0.05, 6, 64).rotateX(Math.PI / 2), A.toonM('#ffd24a'), 0, 0, 0);
      const riders = [];
      for (let k2 = 0; k2 < 8; k2++) { const a = k2 / 8 * Math.PI * 2, seat = add(spin, box(0.36, 0.12, 0.3), A.toonM(A.pick(['#e8302a', '#2a8ae8', '#ffd24a', '#3ac86a'])), Math.cos(a) * 3.15, 0.07, Math.sin(a) * 3.15, { ink: INK, ry: -a }); void seat; if (k2 % 2) continue; const g = H.guy(A.pick(A.NEON), { s: 0.85 }); g.position.set(Math.cos(a) * 3.15, 0.12, Math.sin(a) * 3.15); g.rotation.y = -a; spin.add(g); riders.push({ g, a, home: g.position.clone() }); }
      // ring lights (in the spinning group: small lit beads)
      for (let k2 = 0; k2 < 32; k2++) { const a = k2 / 32 * Math.PI * 2; add(spin, new T.SphereGeometry(0.06, 6, 5), A.flatM(k2 % 2 ? '#ffd24a' : '#ffffff', 2.2), Math.cos(a) * 3.72, 0.03, Math.sin(a) * 3.72); }
      glows.add(x, y, -d, 6, '#ff9a6a', 0.08, 0.05);
      const sg = H.sign('PLANET SPIN', 1.8, 0.5, { fg: '#c0182a', k: 0.5 }); sg.position.set(x + 1.6, yb(d) + SH + 1.0, -d + 2.4); still.add(sg);
      for (let i = 0; i < 6; i++) crit.add(x + 2.6 + (i % 2) * 0.4, yb(d + 3 + i * 0.8) + SH, -(d + 3 + i * 0.8), { act: i % 2 ? 'idle' : 'wave', yaw: Math.PI, s: 1.0 });
      W.planet = { spin, pl, riders, tilt, x, y, d, fall: { k: 0, t: 0 } };
    }
    /* ---------- the moon (right), its hole, a ladder up, a flag, the fisher; the stargazer below ---------- */
    {
      const d = 245, x = 11.8, y = yb(d) + SH + 3.4;
      add(still, cyl(0.14, 0.26, 2.0, 10), chrome, x, yb(d) + SH + 1.0, -d, { ink: INK });
      const moon = add(K, new T.SphereGeometry(2.0, 40, 28), K3D.toon('#ffffff', { map: moonTex(), emissive: '#4a4430', emissiveIntensity: 0.7 }), x, y, -d, { ink: INK }); moon.userData.live = true;
      const nrm = new T.Vector3(-0.72, 0.42, 0.55).normalize(), hp = new T.Vector3(x, y, -d).addScaledVector(nrm, 1.97);
      const hole = new T.Mesh(new T.CircleGeometry(0.7, 24), A.flatM('#0a0610', 1)); hole.position.copy(hp); hole.lookAt(hp.clone().add(nrm)); K.add(hole); hole.userData.live = true;
      const rim = new T.Mesh(new T.TorusGeometry(0.72, 0.08, 8, 24), A.toonM('#c8c0a8')); rim.position.copy(hp); rim.lookAt(hp.clone().add(nrm)); K.add(rim); rim.userData.live = true;
      glows.add(x, y, -d, 6, '#fff4c8', 0.05, 0.05);
      // the flag on top and the ladder up its side
      add(still, cyl(0.02, 0.02, 1.0, 5), chrome, x + 0.3, y + 2.45, -d);
      const flag = add(K, new T.PlaneGeometry(0.5, 0.32), A.toonM('#e8302a', { side: T.DoubleSide }), x + 0.55, y + 2.8, -d); flag.userData.live = true;
      const lad = new T.Group(); lad.position.set(x - 1.2, yb(d + 1.4) + SH, -(d + 1.4)); lad.rotation.z = -0.3; still.add(lad);
      for (const dz of [-0.2, 0.2]) add(lad, box(0.05, 3.2, 0.05), A.toonM('#c8ccd8'), 0, 1.6, dz);
      for (let k2 = 0; k2 < 8; k2++) add(lad, box(0.04, 0.04, 0.4), A.toonM('#c8ccd8'), 0, 0.3 + k2 * 0.38, 0);
      // the fisher on the hole's rim
      const fp = hp.clone().addScaledVector(new T.Vector3(0, 1, 0), 0.62).addScaledVector(nrm, 0.1);
      const fisher = H.guy('#7affd8', { s: 0.9 }); fisher.position.copy(fp); fisher.rotation.y = Math.atan2(nrm.x, nrm.z); K.add(fisher);
      const rod = new T.Group(); const rd = new T.Mesh(cyl(0.015, 0.02, 1.2, 5), A.toonM('#8a5a2a')); rd.position.y = -0.55; rod.add(rd); rod.rotation.x = 0.9; fisher.userData.armR.add(rod);
      const line = new T.Mesh(cyl(0.006, 0.006, 1, 4), A.flatM('#ffffff', 1)); K.add(line);
      const catchStar = new T.Mesh(new T.OctahedronGeometry(0.16, 0), A.flatM('#ffd24a', 2.2)); catchStar.visible = false; K.add(catchStar);
      W.moon = { moon, flag, fisher, rod, line, star: catchStar, hp, nrm, t: 0 };
      // the stargazer on the shoulder with a brass telescope following the heroes
      const gq = V(10.4, yb(d - 5) + SH, -(d - 5));
      const tri = new T.Group(); tri.position.copy(gq); still.add(tri);
      for (let k2 = 0; k2 < 3; k2++) { const a = k2 / 3 * Math.PI * 2; add(tri, cyl(0.02, 0.02, 1.1, 5), A.toonM('#4a3a2a'), Math.cos(a) * 0.22, 0.5, Math.sin(a) * 0.22, { rz: Math.cos(a) * 0.2, rx: -Math.sin(a) * 0.2 }); }
      const scope = new T.Group(); scope.position.set(gq.x, gq.y + 1.05, gq.z); K.add(scope); scope.userData.live = true;
      add(scope, cyl(0.07, 0.11, 1.1, 12).rotateX(Math.PI / 2), A.toonM('#c8a040', { emissive: '#3a2a08', emissiveIntensity: 0.5 }), 0, 0, -0.2, { ink: INK });
      const gazer = H.guy('#9a8aff', { s: 1.0 }); gazer.position.set(gq.x + 0.35, gq.y, gq.z + 0.45); K.add(gazer);
      W.scope = { scope, gazer };
    }
    /* ---------- 1. the Ferris spinner (right, below the rails): a wheel made of spinner flags; the couple on a date ---------- */
    {
      const d = 203, x = 12.0, yA0 = yb(d) + SH, yAx = yA0 + 3.5;
      for (const dz of [-0.5, 0.5]) { add(still, cyl(0.08, 0.12, 3.7, 8), chrome, x - 0.9, yA0 + 1.75, -d + dz, { rz: -0.25 }); add(still, cyl(0.08, 0.12, 3.7, 8), chrome, x + 0.9, yA0 + 1.75, -d + dz, { rz: 0.25 }); }
      add(still, cyl(0.06, 0.06, 1.2, 8).rotateX(Math.PI / 2), chrome, x, yAx, -d);
      const wheel = new T.Group(); wheel.position.set(x, yAx, -d); wheel.userData.live = true; K.add(wheel);
      const flagM = K3D.toon('#ffffff', { map: K3D.paint('rl-spinflag', 256, 64, (c, w, h) => { c.fillStyle = '#c0182a'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8b030'; c.font = '900 40px sans-serif'; c.textAlign = 'center'; c.fillText('SPIN', w / 2, 46); c.strokeStyle = '#e8b030'; c.lineWidth = 4; c.strokeRect(4, 4, w - 8, h - 8); }), side: T.DoubleSide });
      for (let k2 = 0; k2 < 3; k2++) { const f = add(wheel, box(5.0, 0.6, 0.05), flagM, 0, 0, 0, { ink: INK }); f.rotation.z = k2 / 3 * Math.PI; }
      add(wheel, new T.TorusGeometry(2.5, 0.05, 6, 48), chrome, 0, 0, 0.06);
      add(wheel, new T.TorusGeometry(2.5, 0.05, 6, 48), chrome, 0, 0, -0.06);
      for (let k2 = 0; k2 < 36; k2++) { const a = k2 / 36 * Math.PI * 2; add(wheel, new T.SphereGeometry(0.05, 6, 5), A.flatM(k2 % 3 ? '#fff4d8' : '#ff5ad6', 2.4), Math.cos(a) * 2.5, Math.sin(a) * 2.5, 0.1); }
      add(wheel, cyl(0.3, 0.3, 0.3, 16).rotateX(Math.PI / 2), A.toonM('#ffd24a'), 0, 0, 0, { ink: INK });
      const gond = [];
      for (let k2 = 0; k2 < 6; k2++) {
        const a = k2 / 6 * Math.PI * 2, pv2 = new T.Group(); pv2.position.set(Math.cos(a) * 2.5, Math.sin(a) * 2.5, 0); wheel.add(pv2);
        const car = new T.Group(); pv2.add(car);
        add(car, cyl(0.015, 0.015, 0.5, 4), chrome, 0, -0.25, 0);
        add(car, box(0.62, 0.32, 0.42), A.toonM(['#2a8ae8', '#ffd24a', '#3ac86a', '#e84ab0', '#ff8a4a', '#9a8aff'][k2]), 0, -0.62, 0, { ink: INK, inkW: 0.3 });
        if (k2 === 0) { // the couple, side by side, a heart above
          for (const dx of [-0.14, 0.14]) { const g = H.guy(dx < 0 ? '#ff7ab8' : '#7affd8', { s: 0.6 }); g.position.set(dx, -0.48, 0.02); car.add(g); g.userData.armL.rotation.z = dx < 0 ? 0 : 0.6; g.userData.armR.rotation.z = dx < 0 ? -0.6 : 0; }
          const heart = new T.Mesh(new T.CircleGeometry(0.14, 14), A.flatM('#ff5a8a', 2.0)); heart.position.set(0, 0.15, 0.1); car.add(heart); W.heart = heart;
        } else if (k2 % 2) { const g = H.guy(A.pick(A.NEON), { s: 0.6 }); g.position.set(0, -0.48, 0.02); car.add(g); }
        gond.push(car);
      }
      const sg = H.sign('FERRIS SPINNER', 2.2, 0.5, { fg: '#c0182a', k: 0.46 }); sg.position.set(x, yA0 + 0.5, -d + 1.0); still.add(sg);
      for (let i = 0; i < 7; i++) crit.add(x - 2.2 + (i % 2) * 0.35, yb(d - 2 - i * 0.85) + SH, -(d - 2 - i * 0.85), { act: i % 3 ? 'idle' : 'wave', yaw: 0, s: 0.95 });
      W.ferris = { wheel, gond, a: 0, v: 0.35 };
    }
    /* ---------- 5. window cleaners hanging from the glass sky ---------- */
    W.cleaners = [];
    for (const [x, d, ph] of [[-8.0, 232, 0], [8.6, 268, 3]]) {
      const yG = yb(d) + 13.5, yc = yG - 1.6;
      const g = new T.Group(); g.position.set(x, yc, -d); g.userData.live = true; K.add(g);
      add(g, box(0.5, 0.06, 1.8), A.toonM('#8a5a2a'), 0, 0, 0, { ink: INK, inkW: 0.3 });
      add(g, box(0.02, 0.02, 1.7), chrome, 0.2, 0.45, 0); add(g, box(0.02, 0.02, 1.7), chrome, -0.2, 0.45, 0);
      for (const dz of [-0.85, 0.85]) add(g, cyl(0.01, 0.01, 1.6, 4), A.toonM('#f2e6c8'), 0, 0.8, dz);
      const bucket = add(g, cyl(0.1, 0.08, 0.16, 10), A.toonM('#2a8ae8'), 0.1, 0.11, 0.6); void bucket;
      const ws = [0, 1].map(i => { const c = H.guy(i ? '#ffd24a' : '#ff8a4a', { s: 0.85 }); c.position.set(0, 0.03, i ? -0.4 : 0.15); c.rotation.y = i ? Math.PI : 0; g.add(c); const sq = new T.Mesh(box(0.3, 0.04, 0.04), A.toonM('#2a2a32')); sq.position.set(0, -0.22, 0); c.userData.armR.add(sq); return c; });
      W.cleaners.push({ g, ws, ph, yc });
    }
    /* ---------- 6. the handcar on the left rim ---------- */
    {
      for (const x of [-8.15, -8.55]) { const pts = []; for (let d = 194; d <= 281; d += 3) pts.push(V(x, yA(d) + 0.02, -d)); still.add(kit.wire(pts, 0.025, chrome, { seg: 90 })); }
      const car = new T.Group(); car.userData.live = true; K.add(car);
      add(car, box(0.62, 0.1, 0.9), A.toonM('#c0182a'), 0, 0.14, 0, { ink: INK, inkW: 0.3 });
      for (const dz of [-0.32, 0.32]) for (const dx of [-0.2, 0.2]) add(car, cyl(0.09, 0.09, 0.05, 10).rotateZ(Math.PI / 2), A.toonM('#2a2a32'), dx, 0.09, dz);
      add(car, cyl(0.025, 0.025, 0.45, 5), chrome, 0, 0.42, 0);
      const beam = new T.Group(); beam.position.y = 0.65; car.add(beam); add(beam, box(0.04, 0.04, 0.8), chrome, 0, 0, 0);
      const crew = [0, 1].map(i => { const g = H.guy(i ? '#4ae8ff' : '#5aff8a', { s: 0.8 }); g.position.set(0, 0.19, i ? 0.3 : -0.3); g.rotation.y = i ? Math.PI : 0; car.add(g); return g; });
      W.handcar = { car, beam, crew, d: 200 };
    }
    /* ---------- 7. the rail polisher on the right rail and the gleam that runs off along it ---------- */
    {
      const d = 226.5, q = V(TB.T.RAIL3 + 0.45, yA(d), -d);
      const g = H.guy('#ff5ad6', { s: 0.85 }); g.position.copy(q); g.rotation.y = -Math.PI / 2; K.add(g);
      const rag = new T.Mesh(box(0.14, 0.1, 0.05), A.toonM('#ffd24a')); rag.position.set(0, -0.22, 0.06); g.userData.armR.add(rag);
      const gi = glows.add(q.x, q.y, q.z, 0.8, '#ffffff', 0, 0);
      W.polish = { g, gi, d, t: 0 };
    }
    /* ---------- 8. the parachuters off the left rim, the ladder up a column ---------- */
    {
      const col = W.cols.filter(c => c.x < 0 && c.d > 240 && c.d < 262)[0] || W.cols.filter(c => c.x < 0)[0];
      const lad = new T.Group(); lad.position.set(col.x + 0.3, col.y0, -col.d); still.add(lad);
      for (const dz of [-0.18, 0.18]) add(lad, box(0.04, col.y1 - col.y0, 0.04), A.toonM('#c8ccd8'), 0, (col.y1 - col.y0) / 2, dz);
      for (let yy = 0.3; yy < col.y1 - col.y0; yy += 0.38) add(lad, box(0.035, 0.035, 0.36), A.toonM('#c8ccd8'), 0, yy, 0);
      W.chutes = [0, 1, 2].map(i => {
        const g = H.guy(['#ffd24a', '#7affd8', '#ff8a4a'][i], { s: 0.85 }); K.add(g);
        const um = new T.Group(); um.position.y = 0.95; g.add(um);
        add(um, new T.ConeGeometry(0.55, 0.3, 12, 1, true), K3D.toon('#ffffff', { map: H.stripes('#f2e6c8', ['#e8302a', '#2a8ae8', '#3ac86a'][i], 'umb' + i), side: T.DoubleSide }), 0, 0, 0);
        add(um, cyl(0.012, 0.012, 0.7, 4), A.toonM('#2a2a32'), 0, -0.33, 0);
        return { g, um, ph: i / 3, col };
      });
    }
    /* ---------- 10. the kite flyer on the left shoulder below ---------- */
    {
      const d = 226, q = V(-12.4, yb(d) + SH, -d);
      const g = H.guy('#e84ab0', { s: 1.0 }); g.position.copy(q); g.rotation.y = Math.PI * 0.8; K.add(g);
      const kite = new T.Group(); kite.userData.live = true; K.add(kite);
      const kg = new T.BufferGeometry(); kg.setAttribute('position', new T.Float32BufferAttribute([0, 0.6, 0, 0.42, 0, 0, 0, -0.8, 0, -0.42, 0, 0], 3)); kg.setIndex([0, 1, 2, 0, 2, 3]); kg.computeVertexNormals();
      const km = new T.Mesh(kg, K3D.toon('#ffffff', { map: H.stripes('#ffd24a', '#e8302a', 'kite'), side: T.DoubleSide })); kite.add(km);
      const tail = []; for (let k2 = 0; k2 < 6; k2++) { const b = new T.Mesh(box(0.14, 0.06, 0.02), A.flatM(k2 % 2 ? '#4ae8ff' : '#ff5ad6', 1.3)); K.add(b); tail.push(b); }
      const str = new T.Mesh(cyl(0.006, 0.006, 1, 4), A.flatM('#f2e6c8', 1)); K.add(str);
      W.kite = { g, kite, tail, str, base: q.clone().add(V(0, 0.4, 0)), home: V(-11.8, yb(d + 6) + 11.0, -(d + 6)) };
    }
    W.t = 0; W.fxN = 0;
  }

  /* ====================================================================================================
     Update
     ==================================================================================================== */
  const tmp = new T.Vector3(), tmp2 = new T.Vector3();
  function update(K, SC, st, dt, pos, L) {
    if (!kit) return;
    W.t += dt; const t = W.t, yA = TB.yAt, { yb, SH, glows, lamps } = kit;
    const lead = Math.max(...pos.map(p => -p.z));
    for (const f of st.fx) if (f.n > W.fxN) { W.fxN = f.n; if (f.k === 'drop' && W.nets) { let best = null, bd = 99; for (const n of W.nets) { const dd = Math.hypot(n.x - f.x, n.d - f.d); if (dd < bd) { bd = dd; best = n; } } if (best && bd < 6) best.t = 0; } }
    // the rocket: a pendulum swing timed to the rules' wash (it crosses the lanes mid-gust, the way the gust pushes)
    if (W.rocket) {
      const Rk = W.rocket, w = TB.winds[0], s = (st.t || t) + w.ph - w.on / 2, TH = 1.95;
      const th = TH * Math.sin(Math.PI * s / w.per), thv = TH * Math.PI / w.per * Math.cos(Math.PI * s / w.per);
      Rk.arm.rotation.y = -th;
      Rk.face += ((thv >= 0 ? 0 : Math.PI) - Rk.face) * Math.min(1, dt * 2.5);
      Rk.rk.rotation.y = Rk.face; Rk.rk.rotation.x = Math.sin(t * 2.3) * 0.05; Rk.body.rotation.z = -Math.abs(thv) * 0.12 + Math.sin(t * 1.7) * 0.03;
      const over = Math.max(0, 1 - Math.abs(th) / 0.45), fl = 1 + over * 1.6 + Math.sin(t * 40) * 0.12;
      Rk.flame.scale.set(fl, 1, 1); Rk.flame2.scale.set(fl * 0.9, 1, 1);
      Rk.flame.position.x = -2.25 - (fl - 1) * 0.55; Rk.flame2.position.x = -2.0 - (fl - 1) * 0.4;
      Rk.flame.getWorldPosition(tmp); kit.glows.set(Rk.gi, tmp.x, tmp.y, tmp.z, 1.8 + over * 2.6); kit.glows.color(Rk.gi, '#ffb84a', 0.3 + over * 0.4);
      const au = Rk.astro.userData; au.armR.rotation.x = over > 0.1 ? -2.6 : -2.4 + Math.sin(t * 8) * 0.5; au.armL.rotation.x = over > 0.1 ? -2.6 : -0.3; au.body.rotation.z = over * Math.sin(t * 20) * 0.12;
      L.duckT = over > 0.6 && lead > 250 && lead < 285 ? 0 : L.duckT;
      Rk.body.getWorldPosition(tmp); Rk.bi.forEach((bi, k2) => { const a = k2 / Rk.bi.length * Math.PI * 2; kit.lamps.bulb.setP(bi, tmp.x + Math.cos(a) * 0.62 * Math.cos(Rk.arm.rotation.y), tmp.y + Math.sin(a) * 0.62, tmp.z - Math.cos(a) * 0.62 * Math.sin(Rk.arm.rotation.y)); });
      W.wind = over;
    }
    // the ring bumper's planet turns, its moonlet orbits
    if (W.ringB) { W.ringB.pl.rotation.y = t * 0.6; W.ringB.moonlet.position.set(Math.cos(t * 1.4) * 1.05, 1.9 + Math.sin(t * 1.4) * 0.3, Math.sin(t * 1.4) * 1.05); }
    // 2. the planet's ring spins with its riders; one falls off the low edge now and then and climbs back
    if (W.planet) {
      const Pl = W.planet; Pl.spin.rotation.y = t * 0.45; Pl.pl.rotation.y = t * 0.12;
      const cyc = (t % 16) / 16, R0 = Pl.riders[1];
      for (const r of Pl.riders) { const u = r.g.userData; u.armL.rotation.x = u.armR.rotation.x = -2.6 + Math.sin(t * 3 + r.a) * 0.3; u.body.position.y = Math.abs(Math.sin(t * 4 + r.a)) * 0.04; if (r !== R0) r.g.position.copy(r.home); }
      if (R0) { // slips at the low edge, slides off the rim, tumbles, then is back on at the start of the next loop
        if (cyc < 0.7) { R0.g.position.copy(R0.home); R0.g.rotation.z = 0; R0.g.visible = true; }
        else if (cyc < 0.85) { const u = (cyc - 0.7) / 0.15; R0.g.position.set(R0.home.x * (1 + u * 0.25), R0.home.y - u * u * 2.6, R0.home.z * (1 + u * 0.25)); R0.g.rotation.z = u * 3; R0.g.visible = true; }
        else R0.g.visible = false;
      }
    }
    // 3. the moon fisher: a star bites every so often; held up, thrown back
    if (W.moon) {
      const M = W.moon, c = (t % 12) / 12, fu = M.fisher.userData; M.flag.rotation.y = Math.sin(t * 2.2) * 0.4;
      M.rod.getWorldPosition(tmp); const tip = tmp.clone().add(V3(0, 0.25, 0)).addScaledVector(M.nrm, 0.9);
      const bob = M.hp.clone().addScaledVector(M.nrm, 0.02); bob.y -= 0.1;
      let end = bob;
      if (c > 0.6 && c < 0.75) { const u = (c - 0.6) / 0.15; end = bob.clone().lerp(tip.clone().add(V3(0, 0.3, 0)), u); M.star.visible = true; M.star.position.copy(end); fu.armR.rotation.x = -1.2 - u * 1.4; }
      else if (c >= 0.75 && c < 0.9) { end = tip.clone().add(V3(0, 0.3, 0)); M.star.visible = true; M.star.position.copy(end); M.star.rotation.y = t * 4; fu.armR.rotation.x = -2.6; fu.armL.rotation.x = -2.6 + Math.sin(t * 10) * 0.3; fu.body.position.y = Math.abs(Math.sin(t * 9)) * 0.06; }
      else { M.star.visible = false; fu.armR.rotation.x = -1.2 + Math.sin(t * 1.5) * 0.08; fu.armL.rotation.x = 0; fu.body.position.y = 0; if (c >= 0.9) { const u = (c - 0.9) / 0.1; M.star.visible = u < 0.6; M.star.position.copy(tip).lerp(bob, u); } }
      const L2 = tip.distanceTo(end); M.line.scale.y = L2; M.line.position.copy(tip).lerp(end, 0.5); M.line.lookAt(end); M.line.rotateX(Math.PI / 2);
    }
    // 11. the stargazer's telescope follows the heroes
    if (W.scope) { const mid = pos[0].clone().add(pos[1]).multiplyScalar(0.5); W.scope.scope.lookAt(mid); const gu = W.scope.gazer.userData; gu.armL.rotation.x = -1.4; gu.armR.rotation.x = -1.2 + Math.sin(t * 0.7) * 0.1; W.scope.gazer.lookAt(mid.x, W.scope.gazer.position.y, mid.z); }
    // 1. the Ferris spinner turns (faster when a real spinner is spun up on the rails)
    if (W.ferris) {
      const F = W.ferris; let spun = 0; for (const s of (SC.live.spinners || [])) if (s.c.d > 190 && s.c.d < 285) spun = Math.max(spun, s.v);
      F.v += ((0.3 + Math.min(2.2, spun * 0.12)) - F.v) * Math.min(1, dt * 1.2); F.a += F.v * dt; F.wheel.rotation.z = F.a;
      for (const g of F.gond) g.rotation.z = -F.a + Math.sin(t * 1.3 + g.id) * 0.06 * F.v;
      if (W.heart) { const s = 1 + Math.abs(Math.sin(t * 3)) * 0.25; W.heart.scale.setScalar(s); }
    }
    // 5. the window cleaners: squeegees on the glass; the cradle sways
    for (const C of W.cleaners || []) { C.g.rotation.z = Math.sin(t * 0.8 + C.ph) * 0.04 + L.tilt * 0.15; C.g.position.y = C.yc + Math.sin(t * 0.5 + C.ph) * 0.05; C.ws.forEach((c, i) => { const u = c.userData; u.armR.rotation.x = -2.9; u.armR.rotation.z = Math.sin(t * 3 + i * 2 + C.ph) * 0.6; u.armL.rotation.x = -0.5; u.body.rotation.y = Math.sin(t * 3 + i + C.ph) * 0.2; }); }
    // 6. the handcar: pumped up and down the rim
    if (W.handcar) {
      const Hc = W.handcar, c = (t / 30) % 1, u = c < 0.5 ? c * 2 : 2 - c * 2, e = u * u * (3 - 2 * u), d = 198 + e * 80, dir = c < 0.5 ? 1 : -1;
      Hc.car.position.set(-8.35, yA(d) + 0.02, -d); Hc.car.rotation.x = Math.atan(TB.T.SLOPE);
      const pump = Math.sin(t * 7) * 0.35; Hc.beam.rotation.x = pump;
      Hc.crew.forEach((g, i) => { const gu = g.userData; gu.armL.rotation.x = gu.armR.rotation.x = -1.6 + (i ? -pump : pump) * 1.6; gu.body.position.y = (i ? -pump : pump) * 0.1 + 0.02; });
      void dir;
    }
    // 7. the polisher rubs; every few seconds a gleam runs off up the rail
    if (W.polish) {
      const Po = W.polish, u = Po.g.userData; u.armR.rotation.x = -1.3 + Math.sin(t * 10) * 0.35; u.armL.rotation.x = -0.5;
      const c = (t % 4) / 4, dd = Po.d + c * 26; kit.glows.set(Po.gi, TB.T.RAIL3, yA(dd) + 1.05, -dd, 0.9); kit.glows.color(Po.gi, '#ffffff', c < 0.85 ? 0.7 * Math.sin(c / 0.85 * Math.PI) : 0);
    }
    // 8. the parachuters: step off the rim, float down swaying, land, walk to the column, climb the ladder, again
    for (const Ch of W.chutes || []) {
      const c = (t / 22 + Ch.ph) % 1, col = Ch.col, g = Ch.g, u = g.userData, topY = yA(col.d + 3) + 0.0, x0 = -8.6, xl = -11.2;
      if (c < 0.08) { const v = c / 0.08; g.position.set(x0 + 0.2, topY, -(col.d + 3 - v * 0.4)); Ch.um.visible = v > 0.6; u.armL.rotation.x = u.armR.rotation.x = -2.8; g.rotation.y = Math.PI / 2 + Math.PI; g.rotation.z = 0; }
      else if (c < 0.55) { const v = (c - 0.08) / 0.47, dd = col.d + 2.6 - v * 1.5; g.position.set(x0 + (xl - x0) * v + Math.sin(v * 9) * 0.3, topY + (yb(dd) + 0.55 - topY) * v, -dd); Ch.um.visible = true; g.rotation.z = Math.sin(v * 9) * 0.25; u.armL.rotation.x = u.armR.rotation.x = -2.9; u.legL.rotation.x = Math.sin(t * 5) * 0.4; }
      else if (c < 0.72) { const v = (c - 0.55) / 0.17, dd = col.d + 1.1 - v * 1.1; g.position.set(xl + (col.x - 0.1 - xl) * v, yb(dd) + (v < 0.5 ? 0.55 * (1 - v * 2) : 0) + Math.abs(Math.sin(t * 8)) * 0.05, -dd); Ch.um.visible = false; g.rotation.z = 0; g.rotation.y = -Math.PI / 2 + 0.6; u.armL.rotation.x = Math.sin(t * 8) * 0.6; u.armR.rotation.x = -Math.sin(t * 8) * 0.6; }
      else { const v = (c - 0.72) / 0.28; g.position.set(col.x + 0.55, col.y0 + v * (col.y1 - col.y0 - 0.1), -col.d); Ch.um.visible = false; g.rotation.y = -Math.PI / 2; u.armL.rotation.x = -2.6 + Math.sin(t * 7) * 0.4; u.armR.rotation.x = -2.6 - Math.sin(t * 7) * 0.4; }
    }
    // 9. the catch nets: bounce when a ball drops in; the brigade cheers
    for (const N of W.nets || []) {
      N.t += dt; const k2 = N.t < 1.6 ? Math.sin(N.t * 12) * Math.exp(-N.t * 2.5) : 0;
      N.net.position.y = -Math.abs(k2) * 0.45; N.net.scale.set(1, 1, 1);
      N.holders.forEach((g, i) => { const u = g.userData; u.armL.rotation.x = u.armR.rotation.x = N.t < 2.5 ? -2.4 + Math.sin(t * 12 + i) * 0.4 : -1.0 + Math.sin(t * 2 + i) * 0.1; u.body.position.y = N.t < 2.5 ? Math.abs(Math.sin(t * 10 + i)) * 0.1 : 0; });
    }
    // 10. the kite: dances on the draught, pulled hard sideways when the rocket passes
    if (W.kite) {
      const Kt = W.kite, wind = W.wind || 0, home = Kt.home;
      Kt.kite.position.set(home.x + Math.sin(t * 0.7) * 0.6 + wind * 1.2, home.y + Math.sin(t * 1.1) * 0.4, home.z + Math.cos(t * 0.5) * 0.5);
      Kt.kite.rotation.set(0, 0.4, Math.sin(t * 1.3) * 0.3 + wind * 0.6);
      let prev = Kt.kite.position.clone().add(V3(0, -0.8, 0)); Kt.tail.forEach((b, i) => { const p = prev.clone().add(V3(Math.sin(t * 3 + i) * 0.12, -0.3, 0)); b.position.copy(p); b.rotation.z = Math.sin(t * 4 + i); prev = p; });
      const a = Kt.base, b = Kt.kite.position; Kt.str.scale.y = a.distanceTo(b); Kt.str.position.copy(a).lerp(b, 0.5); Kt.str.lookAt(b); Kt.str.rotateX(Math.PI / 2);
      const gu = Kt.g.userData; gu.armR.rotation.x = -2.0 + wind * 0.5 + Math.sin(t * 1.1) * 0.15; gu.armL.rotation.x = -1.6; Kt.g.rotation.z = wind * 0.15;
    }
    void tmp2;
  }
  const V3 = (x, y, z) => new T.Vector3(x, y, z);

  return { build, update, W };
})();
