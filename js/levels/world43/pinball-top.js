/* Pip & Bo - 43-2 Pinball Panic: the Backboard, part 4 of the table (PINBALL_TOP). Scenery only. Loaded on demand with
   the 3D kit after pinball-life.js; PINBALL_LIFE.build calls PINBALL_TOP.build(K, SC, kit, H) before the creatures are
   finished (and builds the 'reel' bumper with H.towns.reel, registered here); PINBALL_LIFE.update calls
   PINBALL_TOP.update(K, SC, st, dt, ballPositions, L) every drawn frame.

   THE BACKBOARD (d 293 to 412). The last part is the carnival's stadium: the whole town has come to watch the finish.
     the grandstands   four steps of seats on both shoulders from the plaza to the backboard, packed with creatures
                       (instanced: about 1,300 of them), red risers with a row of stars, gold trims, aisles with steps,
                       painted boards along the back (COMET POPS, STAR FLOSS ...), flag poles with pennants and bunting
     the crowd         turns to watch the heroes go by, bounces when they are close, cheers a gate opening near it,
                       goes quiet at the Jackpot hush and goes wild at the multiball and the finish; leans in a TILT
     the floodlights   two lattice towers each side with banks of lamps aimed at the table
     the comet         THE LANDMARK: a big friendly comet of ice resting against the cabinet behind its mouth, eyes
                       following the heroes, a smile, crystals, its tail of ribbons and bulbs sweeping up the cabinet
     the score reel    the 'reel' bumper is a score-reel drum on a yoke, its digits rolling, a hamster running inside
     the plaza         where the part starts: the balloon seller, the grandstand turnstile with a queue
     the Jackpot       fireworks under the glass from the crews' racks, confetti cannons on the stands, confetti rain
   Little stories (part 4):
     1. the wave: it runs up the left stand and down the right, round and round, all the way up to the finish
     2. GO PIP! / GO BO! cards: fans hold up their hero's card as that hero goes by (the lanes cross, so do the cards)
     3. the hamster in the score reel: runs the drum round; a kick spins it right over the top, and it comes out dizzy
     4. the parade round the final ramp: the drum major throws the baton up and catches it, except every fourth time,
        when it bonks the first drummer on the head and bounces back to the hand
     5. the comet-pop seller working the right stand's walkway: stops, a fan's hand goes up, a pop is thrown up to them
     6. the sleeper in the front row with a nightcap, asleep through everything, until the multiball (then never again)
     7. the photographer on the right walkway: the flash goes when a hero passes, prints flutter down round the tripod
     8. the balloon seller: every crossing kicker's bang lets one balloon go; it rises to the glass and drifts up
        under it to the backboard, where the escaped ones collect
     9. the fireworks crews on the top corners: a dud now and then (a pop, a shrug); the real show at the Jackpot
    10. the comet polisher up a ladder against the comet, rubbing in circles; holds on tight when the comet laughs
    11. the small one who followed the heroes up the whole table ends at the front of the walkway, cheering (in
        pinball-life.js: the follower story) */
'use strict';

const PINBALL_TOP = (function () {
  const T = K3D.T, TB = PINBALL_TABLE, A = ARCADE;
  const W = {};
  let kit = null, H = null;
  const DS = 298.5, DE = 410.6;                               // the grandstands
  const SEGS = [[298.5, 332.5], [334.5, 374.8], [377.2, 410.6]]; // between the aisles
  const TIER = 1.0, RISE = 0.38, NT = 4;                      // four steps, each this deep and this high
  const PX = 7.8, PD0 = 376, PD1 = 412.8;                     // the parade's loop round the final ramp
  const add = (par, geo, mat, x, y, z, o = {}) => { const m = o.ink ? K3D.mesh(geo, mat, { ink: o.ink, inkW: o.inkW || 0.4 }) : new T.Mesh(geo, mat); m.position.set(x, y, z); if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; par.add(m); return m; };
  const cyl = (r0, r1, h, n = 20, open = false) => new T.CylinderGeometry(r0, r1, h, n, 1, open);
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const ys = d => kit.yb(d) + kit.SH; // the shoulder's top
  const fract = v => v - Math.floor(v);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- painted textures ---------- */
  const riserTex = () => K3D.paint('tp-riser', 256, 64, (c, w, h) => {
    c.fillStyle = '#8a1226'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d8a838'; c.fillRect(0, 0, w, 5); c.fillRect(0, h - 4, w, 4);
    c.fillStyle = '#f2e6c8'; c.fillRect(0, 22, w, 20);
    c.fillStyle = '#c0182a';
    for (let k = 0; k < 4; k++) { const cx = 32 + k * 64, cy = 32; c.beginPath(); for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, r = j % 2 ? 4 : 9; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } c.fill(); }
    for (let i = 0; i < 120; i++) { c.fillStyle = `rgba(0,0,0,${A.rnd() * 0.12})`; c.fillRect(A.rnd() * w, A.rnd() * h, 2 + A.rnd() * 5, 1 + A.rnd() * 2); }
  }, { repeat: true });
  const boardTex = (text, bg, fg) => K3D.paint('tp-board|' + text, 512, 96, (c, w, h) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h); c.strokeStyle = fg; c.lineWidth = 6; c.strokeRect(6, 6, w - 12, h - 12);
    c.fillStyle = fg; c.font = '900 52px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2 + 2);
    for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(0,0,0,${A.rnd() * 0.1})`; c.fillRect(A.rnd() * w, A.rnd() * h, 3, 2); }
  });
  const cardTex = (text, bg, fg) => K3D.paint('tp-card|' + text + bg, 256, 128, (c, w, h) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, 0, w, 10);
    c.fillStyle = fg; c.font = '900 64px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2 + 4);
  });
  const reelTex = () => K3D.paint('tp-reel', 512, 64, (c, w, h) => {
    c.fillStyle = '#f2e6c8'; c.fillRect(0, 0, w, h); c.fillStyle = '#c0182a'; c.fillRect(0, 0, w, 6); c.fillRect(0, h - 6, w, 6);
    c.fillStyle = '#1a1020'; c.font = 'bold 40px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let k = 0; k < 10; k++) { c.save(); c.translate((k + 0.5) * w / 10, h / 2); c.rotate(Math.PI / 2); c.fillText(String(k), 0, 2); c.restore(); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(k * w / 10, 6, 2, h - 12); c.fillStyle = '#1a1020'; }
  }, { repeat: true });
  const zTex = () => K3D.paint('tp-z', 64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.font = '900 52px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Z', w / 2, h / 2); });
  const photoTex = () => K3D.paint('tp-photo', 64, 80, (c, w, h) => {
    c.fillStyle = '#f8f4ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a1a3a'; c.fillRect(5, 5, w - 10, h - 24);
    for (const [x, col] of [[22, '#ff8a2a'], [42, '#3a8aff']]) { c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.arc(x, 30, 9, 0, 7); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.arc(x - 3, 27, 3, 0, 7); c.fill(); }
  });

  /* ---------- the score-reel bumper: a drum of digits on a yoke, a hamster running inside ---------- */
  function reelBumper(K, B) {
    B.tall = true; B.col = '#ffd24a'; B.body.material.color.set('#2a1a30'); B.cap.visible = false;
    const live = new T.Group(); live.userData.live = true; B.g.add(live);
    const INK = kit.INK, ay = 2.05;
    // the yoke: two gold uprights from the body's top to the axle, a cross bar under the drum
    for (const sx of [-1, 1]) { add(live, box(0.1, ay - 1.0, 0.16), A.toonM('#d8a838'), sx * 0.66, (ay + 1.0) / 2, 0, { ink: INK, inkW: 0.3 }); add(live, cyl(0.1, 0.1, 0.1, 12).rotateZ(Math.PI / 2), kit.chrome, sx * 0.66, ay, 0); }
    add(live, box(1.42, 0.1, 0.2), A.toonM('#d8a838'), 0, 1.06, 0, { ink: INK, inkW: 0.3 });
    // the drum: digits outside, dark inside, lit rings at its ends (they flash with the bumper)
    const drum = new T.Group(); drum.position.y = ay; live.add(drum);
    add(drum, cyl(0.62, 0.62, 1.1, 32, true).rotateZ(Math.PI / 2), K3D.toon('#ffffff', { map: reelTex() }), 0, 0, 0, { ink: INK, inkW: 0.4 });
    add(drum, cyl(0.6, 0.6, 1.08, 32, true).rotateZ(Math.PI / 2), new T.MeshBasicMaterial({ color: '#1a1020', side: T.BackSide }), 0, 0, 0);
    for (let k = 0; k < 6; k++) add(drum, box(1.08, 0.03, 0.06), A.toonM('#3a2a40'), 0, Math.cos(k / 6 * Math.PI * 2) * 0.585, Math.sin(k / 6 * Math.PI * 2) * 0.585, { rx: -k / 6 * Math.PI * 2 });
    for (const sx of [-1, 1]) { const rg = new T.Mesh(new T.TorusGeometry(0.62, 0.05, 8, 32).rotateY(Math.PI / 2), B.capMat); rg.position.set(sx * 0.57, ay, 0); live.add(rg); }
    // the hamster (in a pivot at the axle, so a fast spin carries it over the top)
    const piv = new T.Group(); piv.position.y = ay; live.add(piv);
    const ham = H.guy('#c8884a', { s: 0.5 }); ham.position.y = -0.6; piv.add(ham);
    const belly = new T.Mesh(box(0.14, 0.1, 0.02), A.flatM('#f2e6c8', 1.1)); belly.position.set(0, 0.12, 0.18); ham.userData.body.add(belly);
    for (const sx of [-1, 1]) { const ear = new T.Mesh(box(0.06, 0.06, 0.04), A.flatM('#a86a3a', 1.1)); ear.position.set(sx * 0.12, 0.5, 0); ham.userData.body.add(ear); }
    const stars = []; for (let k = 0; k < 3; k++) { const s2 = new T.Mesh(new T.OctahedronGeometry(0.05, 0), A.flatM('#ffd24a', 2)); s2.visible = false; live.add(s2); stars.push(s2); }
    kit.lamps.bulb.add(B.q.x, B.q.y + ay + 0.85, B.q.z, 0.07, '#ffffff', 2.2, { mode: 2, sp: 1.6 });
    const sg = H.sign('SCORE', 0.9, 0.3, { fg: '#1a1020', k: 0.6 }); sg.position.set(0, 1.25, 0.12); live.add(sg);
    W.reel = { B, drum, piv, ham, stars, a: 0, v: 2.2, ha: 0.25, hv: 0, over: 0, dizzy: 0, cool: 0 };
  }

  /* ====================================================================================================
     Build
     ==================================================================================================== */
  function build(K, SC, k, h) {
    kit = k; H = h; H.towns.reel = reelBumper;
    const { V, lamps, glows, chrome, INK, RAIL, WALL, SH, yb } = kit, still = H.still, crit = H.crit;
    A.seed(4324);
    const quad = (par, a, b, c, d4, mat, uw = 1, vh = 1) => {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d4.x, d4.y, d4.z], 3));
      g.setAttribute('uv', new T.Float32BufferAttribute([0, 0, uw, 0, uw, vh, 0, vh], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
      const m = new T.Mesh(g, mat); par.add(m); return m;
    };
    const SL = Math.atan(TB.T.SLOPE);
    const xk = k2 => RAIL + 1.2 + k2 * TIER;    // the front of step k2
    const hk = k2 => RISE * (k2 + 1);          // its height above the shoulder
    /* ---------- the grandstands ---------- */
    const riserM = K3D.toon('#ffffff', { map: riserTex(), side: T.DoubleSide });
    const seatM = K3D.toon('#ffffff', { map: kit.woodTex('#6a3a1e', 'tp'), side: T.DoubleSide });
    const endM = K3D.toon('#4a1a2a', { side: T.DoubleSide });
    const trimM = A.toonM('#d8a838');
    for (const s of [-1, 1]) for (const [d0, d1] of SEGS) {
      const L = d1 - d0, P3 = (x, d, y) => V(s * x, ys(d) + y, -d);
      for (let k2 = 0; k2 < NT; k2++) {
        const x0 = xk(k2), x1 = k2 < NT - 1 ? xk(k2 + 1) : WALL - 0.05, y0 = k2 ? hk(k2 - 1) : 0, y1 = hk(k2);
        quad(still, P3(x0, d0, y0), P3(x0, d1, y0), P3(x0, d1, y1), P3(x0, d0, y1), riserM, L / 4, 1);   // the riser (faces the table)
        quad(still, P3(x0, d0, y1), P3(x0, d1, y1), P3(x1, d1, y1), P3(x1, d0, y1), seatM, L / 3, 0.4); // the step's top
        for (const dd of [d0, d1]) quad(still, P3(x0, dd, 0), P3(x1, dd, 0), P3(x1, dd, y1), P3(x0, dd, y1), endM);        // the ends
        // a gold trim along each step's edge
        const tr = K3D.mesh(box(0.07, 0.07, L), trimM, { ink: INK, inkW: 0.25 }); tr.rotation.x = SL; tr.position.set(s * (x0 + 0.03), ys((d0 + d1) / 2) + y1 + 0.02, -(d0 + d1) / 2); still.add(tr);
      }
      // the front rail along the walkway
      const rp = []; for (let d = d0; d <= d1 + 0.01; d += 2) rp.push(V(s * (xk(0) - 0.12), ys(Math.min(d, d1)) + 0.62, -Math.min(d, d1)));
      still.add(kit.wire(rp, 0.04, chrome, { seg: Math.max(8, rp.length * 3) }));
      for (let d = d0 + 0.3; d < d1; d += 2.6) add(still, cyl(0.035, 0.035, 0.62, 6), chrome, s * (xk(0) - 0.12), ys(d) + 0.31, -d);
    }
    // the aisles: steps up between the stands with a hand rail
    for (const s of [-1, 1]) for (const da of [333.5, 376]) for (let k2 = 0; k2 < NT; k2++) {
      const st2 = K3D.mesh(box(TIER, hk(k2), 1.6), A.toonM('#3a2a36'), { ink: INK, inkW: 0.3 }); st2.position.set(s * (xk(k2) + TIER / 2), ys(da) + hk(k2) / 2, -da); still.add(st2);
      const nose = K3D.mesh(box(0.06, 0.05, 1.6), trimM, { ink: false }); nose.position.set(s * (xk(k2) + 0.03), ys(da) + hk(k2) + 0.02, -da); still.add(nose);
    }
    // painted boards along the back of the top step, flag poles with pennants, bunting between them
    const BOARDS = [['COMET POPS', '#1a4ac0', '#ffd24a'], ['STAR FLOSS', '#e84ab0', '#ffffff'], ['ORBIT ICE', '#2a8a8a', '#f2e6c8'], ['GO PIP!', '#ff8a2a', '#ffffff'], ['GO BO!', '#2a6ae8', '#ffffff'],
      ['SPIN SODA', '#c0182a', '#f2e6c8'], ['FIZZ POP', '#3ac86a', '#1a1020'], ['RING TOSS', '#9a5ad8', '#ffd24a'], ['COMET CARNIVAL', '#1a1020', '#ffd24a'], ['TICKETS ↓', '#d8a838', '#1a1020']];
    const boardM = BOARDS.map(b => K3D.toon('#ffffff', { map: boardTex(...b), side: T.DoubleSide }));
    W.flags = [];
    for (const s of [-1, 1]) {
      let bi = s < 0 ? 0 : 4;
      for (const [d0, d1] of SEGS) for (let d = d0 + 0.3; d + 4.6 < d1; d += 5.2) {
        const x = s * (WALL - 0.22), y0 = hk(NT - 1) + 0.05, m = boardM[bi++ % boardM.length];
        const da = s < 0 ? d : d + 4.6, db = s < 0 ? d + 4.6 : d; // (so the words read the right way round on both sides)
        quad(still, V(x, ys(da) + y0, -da), V(x, ys(db) + y0, -db), V(x, ys(db) + y0 + 0.82, -db), V(x, ys(da) + y0 + 0.82, -da), m);
      }
      const poleTop = [];
      for (let d = DS + 1; d < DE; d += 9.4) {
        const x = s * (WALL - 0.55), y0 = ys(d) + hk(NT - 1), hp = 3.0;
        add(still, cyl(0.04, 0.05, hp, 8), chrome, x, y0 + hp / 2, -d, { ink: INK, inkW: 0.25 });
        add(still, new T.SphereGeometry(0.08, 10, 8), A.toonM('#ffd24a'), x, y0 + hp + 0.05, -d);
        const fl = new T.Mesh(K3D.geo('tp-pennant', () => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([0, 0.22, 0, 0, -0.22, 0, 0, 0, 1.1], 3)); g.setIndex([0, 1, 2]); g.computeVertexNormals(); return g; }), A.toonM(A.pick(['#c0182a', '#ffd24a', '#2a8ae8', '#3ac86a', '#e84ab0']), { side: T.DoubleSide }));
        fl.position.set(x, y0 + hp - 0.26, -d); fl.userData.live = true; K.add(fl); W.flags.push({ fl, ph: A.rnd() * 6, s });
        poleTop.push(V(x, y0 + hp - 0.05, -d));
      }
      // bunting: little triangles hanging on a sagging line from pole to pole
      const triG = K3D.geo('tp-bunt', () => new T.ConeGeometry(0.13, 0.26, 3).rotateX(Math.PI));
      for (let i = 0; i + 1 < poleTop.length; i++) {
        const a = poleTop[i], b = poleTop[i + 1], pts = [];
        for (let u = 0; u <= 1.001; u += 0.1) pts.push(a.clone().lerp(b, u).add(V(0, -Math.sin(u * Math.PI) * 0.6, 0)));
        still.add(kit.wire(pts, 0.012, A.toonM('#f2e6c8'), { seg: 24 }));
        for (let u = 0.06; u < 0.97; u += 0.09) { const q = a.clone().lerp(b, u).add(V(0, -Math.sin(u * Math.PI) * 0.6 - 0.14, 0)); add(still, triG, A.toonM(A.pick(['#c0182a', '#f2e6c8', '#ffd24a', '#2a8ae8'])), q.x, q.y, q.z); }
      }
    }
    /* ---------- the crowd (instanced creatures; the same build as the life's creatures, so they match) ---------- */
    {
      const F = W.fans = { x: [], y: [], z: [], s: [], base: [], yaw: [], arm: [], u: [], ph: [], side: [], tier: [], boost: [], col: [] };
      const COLS = ['#ff8a4a', '#4ae8ff', '#ffd24a', '#7affd8', '#e84ab0', '#9a8aff', '#5aff8a', '#ff5a6a', '#f2e6c8', '#ff9adf', '#8ab0ff', '#c8ff6a'];
      for (const s of [-1, 1]) for (const [d0, d1] of SEGS) for (let k2 = 0; k2 < NT; k2++) for (let d = d0 + 0.35; d < d1 - 0.2; d += 0.6) {
        if (A.rnd() < 0.1) continue;
        if (s > 0 && k2 === 0 && d > 387.6 && d < 389.8) continue; // the sleeper's seat
        const dd = d + (A.rnd() - 0.5) * 0.14, x = s * (xk(k2) + 0.42 + A.rnd() * 0.1);
        F.x.push(x); F.y.push(ys(dd) + hk(k2)); F.z.push(-dd); F.s.push(0.95 + A.rnd() * 0.3);
        const b = s < 0 ? Math.PI / 2 : -Math.PI / 2; F.base.push(b); F.yaw.push(b); F.arm.push(0);
        F.u.push((s < 0 ? (dd - DS) / (DE - DS) * 0.5 : 0.5 + (DE - dd) / (DE - DS) * 0.5) + k2 * 0.004);
        F.ph.push(A.rnd() * 20); F.side.push(s); F.tier.push(k2); F.boost.push(0); F.col.push(A.pick(COLS));
      }
      const N = F.n = F.x.length;
      // geometry: a merged box model with vertex colours (body bright, legs and arms dark, eyes white, pupils dark)
      const merge = (parts) => {
        const pos = [], nrm = [], col = [];
        for (const [w, hh, d, x, y, z, c] of parts) { const g = new T.BoxGeometry(w, hh, d).toNonIndexed(); g.translate(x, y, z); pos.push(...g.attributes.position.array); nrm.push(...g.attributes.normal.array); for (let i = 0; i < g.attributes.position.count; i++) col.push(c.r, c.g, c.b); }
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); return g;
      };
      const C = (hex, k3 = 1) => new T.Color(hex).multiplyScalar(k3), lite = C('#ffffff'), dark = C('#ffffff', 0.48);
      const bodyG = merge([[0.42, 0.36, 0.34, 0, 0.3, 0, lite], [0.09, 0.12, 0.1, -0.1, 0.06, 0, dark], [0.09, 0.12, 0.1, 0.1, 0.06, 0, dark]]);
      const faceG = merge([[0.11, 0.12, 0.02, -0.09, 0.34, 0.175, C('#f8f4ea', 1.1)], [0.11, 0.12, 0.02, 0.09, 0.34, 0.175, C('#f8f4ea', 1.1)], [0.05, 0.06, 0.02, -0.09, 0.33, 0.19, C('#16121a')], [0.05, 0.06, 0.02, 0.09, 0.33, 0.19, C('#16121a')]]);
      const armG = merge([[0.07, 0.18, 0.07, -0.25, -0.09, 0, dark], [0.07, 0.18, 0.07, 0.25, -0.09, 0, dark]]);
      const mk = (g, k3, tint) => { const m = new T.InstancedMesh(g, new T.MeshBasicMaterial({ vertexColors: true, color: A.hot('#ffffff', k3), toneMapped: false }), N); m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.frustumCulled = false; if (tint) for (let i = 0; i < N; i++) m.setColorAt(i, new T.Color(F.col[i])); return m; };
      const crowd = W.crowd = new T.Group(); crowd.userData.live = true; K.add(crowd);
      W.body = mk(bodyG, 1.0, true); W.face = mk(faceG, 1, false); W.arms = mk(armG, 1.0, true);
      crowd.add(W.body, W.face, W.arms);
      // GO PIP! / GO BO! cards held by fans in the lower three rows
      W.cards = [];
      const CARDS = [['GO PIP!', '#ff8a2a', '#ffffff', 0], ['GO BO!', '#2a6ae8', '#ffffff', 1], ['PIP ★', '#ffd24a', '#c0182a', 0], ['BO ★', '#7affd8', '#1a4ac0', 1], ['WE ♥ PIP', '#f2e6c8', '#ff6a1a', 0], ['WE ♥ BO', '#f2e6c8', '#1a5ad8', 1]];
      const cardG = new T.PlaneGeometry(0.9, 0.45), stickG = cyl(0.015, 0.015, 0.5, 5);
      for (const s of [-1, 1]) for (let d = DS + 2.5, n = 0; d < DE - 1; d += 6.4, n++) {
        let best = -1, bd = 9; for (let i = 0; i < N; i++) if (F.side[i] === s && F.tier[i] === n % 3) { const e = Math.abs(-F.z[i] - d); if (e < bd) { bd = e; best = i; } }
        if (best < 0) continue;
        const cd = CARDS[(n + (s > 0 ? 1 : 0)) % CARDS.length];
        const g = new T.Group(); g.visible = false; crowd.add(g);
        add(g, cardG, K3D.toon('#ffffff', { map: cardTex(cd[0], cd[1], cd[2]), side: T.DoubleSide }), 0, 0.3, 0, { ink: INK, inkW: 0.25 });
        add(g, stickG, A.toonM('#8a5a2a'), 0, -0.1, -0.01);
        F.boost[best] = 0; W.cards.push({ g, i: best, hero: cd[3], up: 0 });
      }
      W.cardOf = new Map(W.cards.map(c => [c.i, c]));
      W.wave = 0; W.party = 0; W.hush = 0; W.cheers = [];
    }
    // the back walkways: a few creatures leaning on the wall, waving (static, the life's critters)
    for (const s of [-1, 1]) for (let d = DS + 2; d < DE; d += 2.2 + A.rnd() * 2) { if (A.rnd() < 0.4) continue; const q = V(s * (WALL - 0.55 + (A.rnd() - 0.5) * 0.2), ys(d) + hk(NT - 1), -d); crit.add(q.x, q.y, q.z, { act: A.pick(['wave', 'cheer', 'idle', 'dance']), yaw: s < 0 ? Math.PI / 2 : -Math.PI / 2, s: 1.0 + A.rnd() * 0.3 }); }
    /* ---------- the floodlight towers ---------- */
    W.towers = [];
    for (const s of [-1, 1]) for (const d of [336, 404.5]) {
      const x = s * (WALL - 1.0), y0 = ys(d) + hk(NT - 1), ht = 8.2;
      const tw = new T.Group(); tw.position.set(x, y0, -d); still.add(tw);
      for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]]) add(tw, cyl(0.04, 0.05, ht, 6), chrome, dx, ht / 2, dz, { ink: INK, inkW: 0.2 });
      for (let yy = 0.6; yy < ht; yy += 0.9) { add(tw, box(0.62, 0.03, 0.03), chrome, 0, yy, 0.3); add(tw, box(0.62, 0.03, 0.03), chrome, 0, yy, -0.3); add(tw, box(0.03, 0.03, 0.62), chrome, 0.3, yy, 0); add(tw, box(0.03, 0.03, 0.62), chrome, -0.3, yy, 0); }
      // the lamp bank, tipped down toward the table
      const head = new T.Group(); head.position.set(-s * 0.2, ht + 0.4, 0); head.rotation.z = s * 0.55; tw.add(head);
      add(head, box(0.25, 1.0, 1.6), A.toonM('#2a2a36'), 0, 0, 0, { ink: INK, inkW: 0.3 });
      tw.updateMatrixWorld(true);
      for (let r = 0; r < 2; r++) for (let c2 = 0; c2 < 3; c2++) { const v = V(-s * 0.14, -0.24 + r * 0.48, -0.5 + c2 * 0.5).applyMatrix4(head.matrixWorld); lamps.bulb.add(v.x, v.y, v.z, 0.18, '#fff4d8', 2.0, { mode: 0 }); }
      const gv = V(-s * 0.3, 0, 0).applyMatrix4(head.matrixWorld); glows.add(gv.x, gv.y, gv.z, 2.4, '#fff0d0', 0.12, 0.05);
      lamps.bulb.add(x, y0 + ht + 1.1, -d, 0.08, '#ff3a2a', 2.2, { mode: 2, sp: 0.8 }); // the red light on top
    }
    /* ---------- the comet (the landmark): ice, a face that follows the heroes, a tail up the cabinet ---------- */
    {
      const d = 416.4, y = yb(d) + 2.5, cg = new T.Group(); cg.position.set(0, y, -d); cg.userData.live = true; K.add(cg);
      const ice = new T.IcosahedronGeometry(2.4, 3), pa = ice.attributes.position;
      for (let i = 0; i < pa.count; i++) { const v = V(pa.getX(i), pa.getY(i), pa.getZ(i)), n = v.clone().normalize(); const f = 1 + 0.05 * Math.sin(n.x * 5.1 + n.y * 3.3) * Math.cos(n.z * 4.2 - n.y * 2) + 0.03 * Math.sin(n.x * 11 + n.z * 9); v.copy(n.multiplyScalar(2.4 * f)); pa.setXYZ(i, v.x, v.y, v.z); }
      ice.computeVertexNormals();
      const head = add(cg, ice, K3D.toon('#d8eeff', { emissive: '#2a4a6a', emissiveIntensity: 0.55 }), 0, 0, 0, { ink: INK, inkW: 0.9 });
      // crystals and frost freckles
      for (let i = 0; i < 9; i++) { const n = V(A.rnd() * 2 - 1, 0.2 + A.rnd() * 0.8, -0.2 - A.rnd() * 0.8).normalize(); const cr = add(cg, new T.OctahedronGeometry(0.28 + A.rnd() * 0.22, 0), A.toonM('#8af0ff', { emissive: '#2a8aa8', emissiveIntensity: 0.6 }), n.x * 2.35, n.y * 2.35, n.z * 2.35, { ink: INK, inkW: 0.3 }); cr.scale.set(0.6, 1.6, 0.6); cr.quaternion.setFromUnitVectors(V(0, 1, 0), n); }
      for (let i = 0; i < 14; i++) { const n = V(A.rnd() * 2 - 1, A.rnd() * 2 - 1, 0.3 + A.rnd() * 0.7).normalize(); if (Math.abs(n.x) < 0.5 && n.y > -0.5) continue; const fr = new T.Mesh(new T.CircleGeometry(0.08 + A.rnd() * 0.1, 10), A.flatM('#ffffff', 1.4)); fr.position.copy(n.clone().multiplyScalar(2.42)); fr.quaternion.setFromUnitVectors(V(0, 0, 1), n); cg.add(fr); }
      // the face: two big eyes (pupils follow the lead ball), lids that blink, a smile, rosy cheeks
      const eyes = [];
      for (const sx of [-1, 1]) {
        const e = new T.Group(); e.position.set(sx * 0.78, 0.5, 2.05); cg.add(e);
        const white = add(e, new T.SphereGeometry(0.55, 24, 16), A.toonM('#ffffff'), 0, 0, 0, { ink: INK, inkW: 0.5 }); white.scale.set(1, 1.15, 0.55);
        const pup = new T.Group(); e.add(pup);
        add(pup, new T.SphereGeometry(0.27, 16, 12), A.flatM('#16121a', 1), 0, 0, 0.2).scale.set(1, 1.1, 0.5);
        add(pup, new T.SphereGeometry(0.08, 8, 6), A.flatM('#ffffff', 1.6), 0.08, 0.1, 0.35);
        eyes.push({ e, pup });
      }
      const smile = add(cg, new T.TorusGeometry(0.7, 0.09, 8, 24, Math.PI), A.flatM('#3a1a3a', 1), 0, -0.55, 2.22); smile.rotation.z = Math.PI; smile.scale.set(1, 0.7, 1);
      for (const sx of [-1, 1]) { const ck = new T.Mesh(new T.CircleGeometry(0.3, 16), new T.MeshBasicMaterial({ color: A.hot('#ff7aa8', 0.9), transparent: true, opacity: 0.55, depthWrite: false })); ck.position.set(sx * 1.35, -0.25, 1.98); ck.rotation.y = sx * 0.55; cg.add(ck); }
      glows.add(0, y + 0.4, -d + 1.5, 6, '#bfe8ff', 0.1, 0.1);
      // the tail: three ribbons sweeping up and to the left along the cabinet, lines of bulbs along them
      const RIB = [[[0.6, 1.6, -1.2], [-3.5, 4.4, -1.85], [-8.0, 6.8, -1.85], [-12.5, 7.4, -1.85], [-14.4, 6.2, -1.85]], [[0.2, 0.8, -1.6], [-4.0, 2.8, -1.9], [-9.0, 4.4, -1.9], [-13.0, 4.0, -1.9]], [[0.9, 2.1, -0.6], [-3.0, 5.4, -1.8], [-7.0, 7.6, -1.8], [-10.6, 8.6, -1.8]]];
      const RC = [['#fffbe8', '#ffd24a', '#ff8a3a', '#ff4a8a'], ['#e8f8ff', '#8af0ff', '#4a8aff', '#9a5ad8'], ['#ffd24a', '#ff9a3a', '#ff5a3a', '#e8304a']];
      RIB.forEach((pts, ri) => {
        const cv = new T.CatmullRomCurve3(pts.map(p => V(p[0], p[1], p[2]))), n = 64, pos = [], col = [], idx = [];
        for (let i = 0; i <= n; i++) {
          const u = i / n, p = cv.getPoint(u), tg = cv.getTangent(u), side = V(-tg.y, tg.x, 0).normalize(), w = (1 - u) * [0.8, 1.1, 0.42][ri] + 0.06;
          pos.push(p.x + side.x * w, p.y + side.y * w, p.z, p.x - side.x * w, p.y - side.y * w, p.z);
          const cs = RC[ri], f = u * (cs.length - 1), k3 = Math.min(cs.length - 2, Math.floor(f)), c = new T.Color(cs[k3]).lerp(new T.Color(cs[k3 + 1]), f - k3).multiplyScalar(1.05);
          col.push(c.r, c.g, c.b, c.r, c.g, c.b);
          if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
        }
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx);
        const rib = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.62, depthWrite: false, side: T.DoubleSide, toneMapped: false })); rib.renderOrder = 3; cg.add(rib);
        for (let u = 0.08; u < 1; u += 0.045) { const p = cv.getPoint(u); lamps.bulb.add(p.x, y + p.y, -d + p.z + 0.05, 0.1 - u * 0.04, RC[ri][Math.min(3, Math.floor(u * 4))], 2.0, { mode: 1, sp: 1.3, ph: -u * 2 + ri }); }
      });
      // the comet polisher up a ladder on its right side
      const lad = new T.Group(); lad.position.set(3.4, yb(d - 1.2), -(d - 1.2)); lad.rotation.z = 0.32; still.add(lad);
      for (const dz of [-0.2, 0.2]) add(lad, box(0.06, 3.6, 0.06), A.toonM('#c8ccd8'), 0, 1.8, dz, { ink: INK, inkW: 0.2 });
      for (let k3 = 0; k3 < 9; k3++) add(lad, box(0.05, 0.05, 0.4), A.toonM('#c8ccd8'), 0, 0.3 + k3 * 0.38, 0);
      const pol = H.guy('#7affd8', { s: 0.9 }); K.add(pol); pol.position.set(3.4 - Math.sin(0.32) * 2.9 - 0.15, yb(d - 1.2) + Math.cos(0.32) * 2.9, -(d - 1.2) + 0.05); pol.rotation.y = -Math.PI / 2 - 0.2;
      const rag = new T.Mesh(box(0.14, 0.12, 0.05), A.toonM('#ffd24a')); rag.position.set(0, -0.22, 0.06); pol.userData.armR.add(rag);
      add(still, cyl(0.16, 0.13, 0.26, 12), A.toonM('#2a8ae8'), 3.9, yb(d - 1.6) + 0.13, -(d - 1.6), { ink: INK, inkW: 0.3 });
      W.comet = { cg, head, eyes, smile, pol, y, d, blink: 3, gulp: 0, happy: 0 };
    }
    /* ---------- the parade round the final ramp ---------- */
    {
      const mem = [];
      const walker = (col, o = {}) => { const g = H.guy(col, { s: o.s || 1 }); K.add(g); return g; };
      // the drum major: tall hat, a baton
      const dm = walker('#f2e6c8', { s: 1.15 }); const hat = H.hat('#c0182a', 1.3); hat.position.y = 0.48; hat.scale.y = 2.2; dm.userData.body.add(hat);
      const plume = new T.Mesh(new T.ConeGeometry(0.06, 0.3, 8), A.toonM('#ffd24a')); plume.position.y = 0.95; dm.userData.body.add(plume);
      const baton = new T.Group(); K.add(baton); add(baton, cyl(0.02, 0.02, 0.8, 6), chrome, 0, 0, 0); add(baton, new T.SphereGeometry(0.05, 8, 6), A.toonM('#ffd24a'), 0, 0.42, 0); add(baton, new T.SphereGeometry(0.04, 8, 6), A.toonM('#ffd24a'), 0, -0.42, 0);
      mem.push({ g: dm, kind: 'dm' });
      // the banner carried by two
      const b1 = walker('#ff5a6a'), b2 = walker('#ff5a6a');
      for (const b of [b1, b2]) { const pl = new T.Mesh(cyl(0.02, 0.02, 1.3, 6), A.toonM('#8a5a2a')); pl.position.set(0.22, 0.45, 0.05); b.userData.body.add(pl); }
      const banner = new T.Mesh(new T.PlaneGeometry(1, 0.45), K3D.toon('#ffffff', { map: boardTex('COMET CARNIVAL', '#c0182a', '#ffd24a'), side: T.DoubleSide })); K.add(banner);
      mem.push({ g: b1, kind: 'pole' }, { g: b2, kind: 'pole' });
      // three drummers, two horns
      for (let i = 0; i < 3; i++) { const g = walker(['#4ae8ff', '#5aff8a', '#ffd24a'][i]); const dr = new T.Mesh(cyl(0.16, 0.16, 0.18, 16).rotateX(Math.PI / 2), K3D.toon('#ffffff', { map: H.stripes('#f2e6c8', '#c0182a', 'drum') })); dr.position.set(0, 0.2, 0.26); g.userData.body.add(dr); const sk = H.hat('#1a1a2a', 0.8); sk.position.y = 0.48; g.userData.body.add(sk); mem.push({ g, kind: 'drum' }); }
      for (let i = 0; i < 2; i++) { const g = walker(['#e84ab0', '#9a8aff'][i]); const hn = new T.Mesh(new T.ConeGeometry(0.1, 0.36, 12, 1, true).rotateX(-Math.PI / 2), A.toonM('#e8b030', { side: T.DoubleSide })); hn.position.set(0, 0.36, 0.34); g.userData.body.add(hn); mem.push({ g, kind: 'horn' }); }
      // the float: a little cart with a comet balloon above it and a creature waving from it
      const fl = new T.Group(); K.add(fl);
      add(fl, box(0.9, 0.36, 1.3), K3D.toon('#ffffff', { map: H.stripes('#2a4ac0', '#ffd24a', 'float') }), 0, 0.3, 0, { ink: INK, inkW: 0.3 });
      for (const [dx, dz] of [[-0.48, -0.42], [0.48, -0.42], [-0.48, 0.42], [0.48, 0.42]]) add(fl, cyl(0.13, 0.13, 0.06, 12).rotateZ(Math.PI / 2), A.toonM('#2a2a32'), dx, 0.13, dz);
      const rider = H.guy('#ff8a4a', { s: 0.9 }); rider.position.y = 0.48; fl.add(rider);
      const bal = new T.Group(); bal.position.y = 2.2; fl.add(bal);
      add(bal, new T.SphereGeometry(0.4, 18, 12), A.toonM('#fff4c0', { emissive: '#4a3a10', emissiveIntensity: 0.4 }), 0, 0, 0, { ink: INK, inkW: 0.3 });
      for (let k3 = 0; k3 < 3; k3++) add(bal, new T.ConeGeometry(0.16 - k3 * 0.03, 1.0, 8).rotateX(-Math.PI / 2), A.toonM(['#ffd24a', '#ff8a3a', '#ff4a8a'][k3]), (k3 - 1) * 0.16, 0, -0.65 - k3 * 0.1);
      add(fl, cyl(0.006, 0.006, 1.8, 4), A.toonM('#f2e6c8'), 0, 1.3, 0);
      mem.push({ g: fl, kind: 'float', len: 1.6 });
      // three dancers with ribbon sticks
      for (let i = 0; i < 3; i++) { const g = walker(['#7affd8', '#ff9adf', '#c8ff6a'][i]); const rb = new T.Mesh(new T.PlaneGeometry(0.06, 0.9), A.flatM(['#ff5ad6', '#4ae8ff', '#ffd24a'][i], 1.3, { side: T.DoubleSide })); rb.position.set(0, -0.6, 0); const st2 = new T.Group(); st2.position.set(0, -0.2, 0); st2.add(rb); g.userData.armR.add(st2); mem.push({ g, kind: 'dance', rb }); }
      let at = 0; for (const m of mem) { m.off = at; at += m.len || 1.15; }
      W.parade = { mem, baton, banner, bal, rider, u: 0, n: 0, L: 2 * (PD1 - PD0) + 4 * PX };
    }
    /* ---------- the plaza: the balloon seller (left), the turnstile and its queue (right) ---------- */
    {
      const q = V(-11.6, ys(296.4), -296.4);
      const seller = H.guy('#ffd24a', { s: 1.2 }); seller.position.copy(q); seller.rotation.y = Math.PI / 2 + 0.4; K.add(seller);
      const cap = H.hat('#2a8ae8', 1.1); cap.position.y = 0.55; seller.userData.body.add(cap);
      const hand = V(q.x + 0.3, q.y + 0.55, q.z + 0.1);
      const bals = [];
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2, top = V(hand.x + Math.cos(a) * 0.35 * (i % 2 ? 1 : 0.6), hand.y + 1.7 + (i % 3) * 0.28, hand.z + Math.sin(a) * 0.35 * (i % 2 ? 1 : 0.6));
        const g = new T.Group(); g.position.copy(top); K.add(g);
        add(g, new T.SphereGeometry(0.22, 16, 12), A.toonM(A.pick(['#ff5a6a', '#ffd24a', '#4ae8ff', '#5aff8a', '#e84ab0', '#9a8aff'])), 0, 0, 0, { ink: INK, inkW: 0.25 }).scale.set(1, 1.15, 1);
        add(g, new T.ConeGeometry(0.04, 0.06, 6).rotateX(Math.PI), A.toonM('#f2e6c8'), 0, -0.26, 0);
        const str = new T.Mesh(cyl(0.005, 0.005, 1, 4), A.flatM('#f2e6c8', 1)); K.add(str);
        bals.push({ g, str, home: top, st: 0, t: 0, d: 0, x: 0 });
      }
      W.balloons = { seller, hand, bals, free: 0 };
      // the turnstile on the right with an arch over it
      const tq = V(11.8, ys(296.2), -296.2);
      for (const sx of [-1, 1]) add(still, cyl(0.07, 0.07, 2.6, 8), A.toonM('#d8a838'), tq.x + sx * 0.9, tq.y + 1.3, tq.z, { ink: INK, inkW: 0.25 });
      const arch = H.sign('GRANDSTAND', 2.2, 0.45, { fg: '#c0182a', k: 0.56 }); arch.position.set(tq.x, tq.y + 2.75, tq.z); arch.rotation.y = 0; still.add(arch);
      for (let k3 = 0; k3 < 9; k3++) lamps.bulb.add(tq.x - 1.0 + k3 * 0.25, tq.y + 3.05, tq.z + 0.05, 0.05, k3 % 2 ? '#fff4d8' : '#ff5ad6', 2, { mode: 1, sp: 1, ph: k3 / 9 });
      add(still, cyl(0.12, 0.12, 0.9, 10), chrome, tq.x, tq.y + 0.45, tq.z, { ink: INK, inkW: 0.25 });
      const ts = new T.Group(); ts.position.set(tq.x, tq.y + 0.8, tq.z); ts.userData.live = true; K.add(ts);
      for (let k3 = 0; k3 < 3; k3++) { const arm = add(ts, cyl(0.03, 0.03, 0.7, 6).rotateZ(Math.PI / 2), chrome, 0, 0, 0); arm.geometry.translate(0.35, 0, 0); arm.rotation.y = k3 / 3 * Math.PI * 2; }
      W.turn = { ts, a: 0 };
      for (let i = 0; i < 6; i++) { const dd = 295.2 - i * 0.7, qq = V(12.0 + (i % 2) * 0.4, ys(dd), -dd); crit.add(qq.x, qq.y, qq.z, { act: i % 3 ? 'idle' : 'wave', yaw: Math.PI, s: 0.9 + A.rnd() * 0.3 }); }
      // things that fell through the glass long ago
      const pen = A.lost(K, 'pencil', { s: 2.4 }); pen.position.set(-13.6, ys(294.2) + 0.06, -294.2); pen.rotation.y = 0.3; still.add(pen);
      const btn = A.lost(K, 'button', { s: 1.6, col: '#3a8ad8' }); btn.position.set(13.8, ys(298.0) + 0.05, -298.0); still.add(btn);
    }
    /* ---------- the comet-pop seller on the right walkway ---------- */
    {
      const g = H.guy('#ff9adf', { s: 1.05 }); K.add(g);
      const tray = new T.Group(); tray.position.set(0, 0.62, 0.12); g.userData.body.add(tray);
      add(tray, box(0.5, 0.04, 0.3), A.toonM('#d8a838'), 0, 0, 0, { ink: INK, inkW: 0.2 });
      const pops = []; for (let k3 = 0; k3 < 5; k3++) { const p = new T.Group(); p.position.set(-0.18 + k3 * 0.09, 0.1, (k3 % 2) * 0.08 - 0.04); tray.add(p); add(p, cyl(0.006, 0.006, 0.16, 4), A.toonM('#f2e6c8'), 0, 0, 0); add(p, new T.SphereGeometry(0.045, 8, 6), A.flatM(A.pick(['#ff5a6a', '#ffd24a', '#4ae8ff', '#5aff8a']), 1.3), 0, 0.09, 0); pops.push(p); }
      const fly = new T.Group(); fly.visible = false; K.add(fly); add(fly, cyl(0.006, 0.006, 0.16, 4), A.toonM('#f2e6c8'), 0, 0, 0); add(fly, new T.SphereGeometry(0.05, 8, 6), A.flatM('#ffd24a', 1.4), 0, 0.09, 0);
      W.seller = { g, tray, pops, fly, d: 304, want: 308, st: 'walk', t: 0, fan: -1, from: null }; g.position.set(RAIL + 0.75, ys(304), -304);
    }
    /* ---------- the sleeper in the front row (right) ---------- */
    {
      const d = 388.7, q = V(xk(0) + 0.45, ys(d) + hk(0), -d);
      const g = H.guy('#9a8aff', { s: 1.1 }); g.position.copy(q); g.rotation.y = -Math.PI / 2; K.add(g);
      const cap = new T.Group(); cap.position.set(0, 0.52, -0.03); g.userData.body.add(cap);
      add(cap, new T.ConeGeometry(0.17, 0.45, 12), K3D.toon('#ffffff', { map: H.stripes('#2a4ac0', '#f2e6c8', 'nightcap') }), 0, 0.18, 0, { ink: INK, inkW: 0.25 }).rotation.z = 0.6;
      add(cap, new T.SphereGeometry(0.06, 8, 6), A.toonM('#f2e6c8'), 0.22, 0.32, 0);
      const zm = new T.MeshBasicMaterial({ map: zTex(), transparent: true, depthWrite: false, toneMapped: false, color: A.hot('#bfe0ff', 1.2) });
      const zs = []; for (let k3 = 0; k3 < 3; k3++) { const z = new T.Mesh(new T.PlaneGeometry(0.22, 0.22), zm.clone()); K.add(z); zs.push(z); }
      W.sleeper = { g, cap, zs, q, awake: 0, t: 0, capV: null };
    }
    /* ---------- the photographer on the right walkway ---------- */
    {
      const d = 398, q = V(RAIL + 0.75, ys(d), -d);
      const tri = new T.Group(); tri.position.set(q.x - 0.25, q.y, q.z); still.add(tri);
      for (let k3 = 0; k3 < 3; k3++) { const a = k3 / 3 * Math.PI * 2; add(tri, cyl(0.015, 0.015, 0.95, 5), A.toonM('#2a2a32'), Math.cos(a) * 0.14, 0.45, Math.sin(a) * 0.14, { rz: Math.cos(a) * 0.18, rx: -Math.sin(a) * 0.18 }); }
      add(tri, box(0.3, 0.22, 0.22), A.toonM('#2a2a32'), 0, 1.0, 0, { ink: INK, inkW: 0.25 });
      add(tri, cyl(0.07, 0.08, 0.2, 12).rotateZ(Math.PI / 2), A.toonM('#4a4a5a'), -0.24, 1.0, 0, { ink: INK, inkW: 0.2 });
      add(tri, box(0.12, 0.08, 0.14), A.flatM('#e8e8f0', 1.2), 0.02, 1.16, 0);
      const flashM = new T.MeshBasicMaterial({ color: A.hot('#ffffff', 3), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: T.AdditiveBlending });
      const flash = new T.Mesh(new T.CircleGeometry(0.35, 16), flashM); flash.position.set(q.x - 0.25, q.y + 1.16, q.z); flash.rotation.y = -Math.PI / 2; K.add(flash);
      const gi = glows.add(q.x - 0.4, q.y + 1.16, q.z, 2.4, '#ffffff', 0, 0);
      const g = H.guy('#f2e6c8', { s: 1.05 }); g.position.set(q.x + 0.22, q.y, q.z + 0.2); g.rotation.y = -Math.PI / 2 + 0.3; K.add(g);
      const beret = H.hat('#1a1a2a', 0.9); beret.position.y = 0.5; beret.scale.y = 0.4; g.userData.body.add(beret);
      const pm = K3D.toon('#ffffff', { map: photoTex(), side: T.DoubleSide });
      const prints = []; for (let k3 = 0; k3 < 6; k3++) { const p = new T.Mesh(new T.PlaneGeometry(0.2, 0.25), pm); p.visible = false; K.add(p); prints.push({ m: p, t: 99, x: 0, z: 0, y0: 0 }); }
      W.photo = { g, flash, gi, q, cool: 0, f: 0, prints, n: 0, jump: 0 };
    }
    /* ---------- the fireworks crews on the top corners ---------- */
    {
      W.racks = [];
      for (const s of [-1, 1]) {
        const d = 409.2, x = s * (WALL - 0.9), y0 = ys(d) + hk(NT - 1);
        const rk = new T.Group(); rk.position.set(x, y0, -d); still.add(rk);
        add(rk, box(0.7, 0.3, 0.9), A.toonM('#3a2a1a'), 0, 0.15, 0, { ink: INK, inkW: 0.25 });
        for (let k3 = 0; k3 < 5; k3++) add(rk, cyl(0.07, 0.07, 0.6, 8), A.toonM(['#c0182a', '#ffd24a', '#2a8ae8', '#3ac86a', '#e84ab0'][k3]), (k3 % 2 - 0.5) * 0.25, 0.55, -0.32 + k3 * 0.16, { rz: -s * 0.25, ink: INK, inkW: 0.2 });
        const crew = H.guy(s < 0 ? '#ff8a4a' : '#4ae8ff', { s: 1.0 }); crew.position.set(x + s * 0.0, y0, -d + 0.8); crew.rotation.y = Math.PI; K.add(crew);
        const match = new T.Group(); match.position.set(0, -0.18, 0.05); crew.userData.armR.add(match); add(match, cyl(0.01, 0.01, 0.5, 4), A.toonM('#8a5a2a'), 0, -0.2, 0); const tip = add(match, new T.SphereGeometry(0.03, 6, 5), A.flatM('#ffb84a', 2.5), 0, -0.45, 0);
        W.racks.push({ s, x, y0, d, crew, tip, shrug: 0 });
      }
      // sparks and rockets (instanced, additive)
      const SP = 900, spM = new T.MeshBasicMaterial({ color: A.hot('#ffffff', 2.2), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
      const sp = new T.InstancedMesh(new T.OctahedronGeometry(0.12, 0), spM, SP); sp.frustumCulled = false; sp.instanceMatrix.setUsage(T.DynamicDrawUsage); sp.userData.live = true; K.add(sp);
      for (let i = 0; i < SP; i++) { sp.setColorAt(i, new T.Color('#ffffff')); sp.setMatrixAt(i, new T.Matrix4().makeScale(0, 0, 0)); }
      W.sparks = { m: sp, n: SP, p: new Float32Array(SP * 3), v: new Float32Array(SP * 3), life: new Float32Array(SP), max: new Float32Array(SP), next: 0 };
      W.rockets = []; W.show = 0; W.showT = 0; W.dud = 30;
      // confetti (instanced little papers)
      const CN = 900, cm = new T.MeshBasicMaterial({ color: A.hot('#ffffff', 1.1), side: T.DoubleSide, toneMapped: false });
      const cf = new T.InstancedMesh(new T.PlaneGeometry(0.24, 0.14), cm, CN); cf.frustumCulled = false; cf.instanceMatrix.setUsage(T.DynamicDrawUsage); cf.userData.live = true; K.add(cf);
      const CC = ['#ff5a6a', '#ffd24a', '#4ae8ff', '#5aff8a', '#e84ab0', '#ffffff', '#ff8a2a', '#9a8aff'];
      for (let i = 0; i < CN; i++) { cf.setColorAt(i, new T.Color(CC[i % CC.length])); cf.setMatrixAt(i, new T.Matrix4().makeScale(0, 0, 0)); }
      W.conf = { m: cf, n: CN, p: new Float32Array(CN * 3), v: new Float32Array(CN * 3), r: new Float32Array(CN * 3), life: new Float32Array(CN), rest: new Uint8Array(CN), next: 0, rain: 0 };
      // the confetti cannons on the stands' fronts
      W.cannons = [];
      for (const s of [-1, 1]) for (const d of [384.5, 403.5]) {
        const q = V(s * (xk(0) - 0.35), ys(d), -d);
        add(still, cyl(0.16, 0.22, 0.7, 14), A.toonM('#c0182a'), q.x, q.y + 0.4, q.z, { ink: INK, inkW: 0.3, rz: s * 0.6 });
        add(still, cyl(0.24, 0.24, 0.1, 14), A.toonM('#d8a838'), q.x, q.y + 0.05, q.z, { ink: INK, inkW: 0.2 });
        W.cannons.push({ s, q: V(q.x - s * 0.25, q.y + 0.75, q.z) });
      }
    }
    W.t = 0; W.fxN = 0;
  }

  /* ====================================================================================================
     Update
     ==================================================================================================== */
  const tmp = new T.Vector3(), COLS = new Map();
  function spark(x, y, z, vx, vy, vz, col, life) {
    const S = W.sparks, i = S.next; S.next = (i + 1) % S.n;
    S.p[i * 3] = x; S.p[i * 3 + 1] = y; S.p[i * 3 + 2] = z; S.v[i * 3] = vx; S.v[i * 3 + 1] = vy; S.v[i * 3 + 2] = vz; S.life[i] = life; S.max[i] = life;
    if (!COLS.has(col)) COLS.set(col, new T.Color(col)); S.m.setColorAt(i, COLS.get(col)); S.m.instanceColor.needsUpdate = true;
  }
  function burst(x, y, z, n, cols, sp = 3.2) {
    for (let k = 0; k < n; k++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), v = sp * (0.75 + Math.random() * 0.25); spark(x, y, z, Math.cos(a) * r * v, u * v, Math.sin(a) * r * v, cols[k % cols.length], 1.1 + Math.random() * 0.6); }
  }
  function launch(rk, big) {
    const d = rk.d - 2 - Math.random() * 14, x = rk.s * (4 + Math.random() * 6);
    W.rockets.push({ x: rk.x, y: rk.y0 + 0.8, z: -rk.d, tx: x, ty: kit.yb(d) + 5.6 + Math.random() * 2.4, tz: -d, t: 0, dur: 1.0 + Math.random() * 0.3, big, cols: A.pick([['#ff5a6a', '#ffd24a'], ['#4ae8ff', '#ffffff'], ['#5aff8a', '#ffd24a'], ['#e84ab0', '#9a8aff'], ['#ffd24a', '#ff8a2a']]) });
  }
  function confetti(x, y, z, vx, vy, vz, spread) {
    const C = W.conf, i = C.next; C.next = (i + 1) % C.n;
    C.p[i * 3] = x; C.p[i * 3 + 1] = y; C.p[i * 3 + 2] = z;
    C.v[i * 3] = vx + (Math.random() - 0.5) * spread; C.v[i * 3 + 1] = vy + (Math.random() - 0.5) * spread; C.v[i * 3 + 2] = vz + (Math.random() - 0.5) * spread;
    C.r[i * 3] = Math.random() * 6; C.r[i * 3 + 1] = Math.random() * 6; C.r[i * 3 + 2] = Math.random() * 6; C.life[i] = 14; C.rest[i] = 0;
  }
  function cannons() { for (const c of W.cannons) for (let k = 0; k < 130; k++) confetti(c.q.x, c.q.y, c.q.z, -c.s * 3.2, 5.2, 0, 2.4); }

  function update(K, SC, st, dt, pos, L) {
    if (!kit) return;
    W.t += dt; const t = W.t, B = st.balls, yb = kit.yb;
    const lead = Math.max(B[0].d, B[1].d), near4 = lead > 270;
    // what just happened
    for (const f of st.fx) if (f.n > W.fxN) {
      W.fxN = f.n;
      if (['gateUp', 'latch', 'stairsDone', 'bridgeLatch'].includes(f.k)) { const o = TB.byId[f.id]; const d = o ? (o.d != null ? o.d : o.d0) : lead; if (d > 290) W.cheers.push({ d, t: 0 }); }
      if (f.k === 'kicker' && /^cross/.test(f.id || '')) W.balloons.free++;
      if (f.k === 'jackpotHush') W.hush = 1.3;
      if (f.k === 'multiball') { W.hush = 0; W.party = 7; W.show = 6.5; cannons(); if (W.sleeper.awake === 0) W.sleeper.awake = 0.001; }
      if (f.k === 'finish') { W.party = 30; W.show = 9; cannons(); W.conf.rain = 8; W.comet.happy = 1; if (W.sleeper.awake === 0) W.sleeper.awake = 0.001; }
      if (f.k === 'seat' && f.id === 'mouth') W.comet.gulp = 1;
    }
    W.cheers = W.cheers.filter(c => (c.t += dt) < 1.8);
    W.party = Math.max(0, W.party - dt); W.hush = Math.max(0, W.hush - dt);
    const party = Math.min(1, W.party), hush = W.hush > 0;
    /* ---------- the crowd ---------- */
    if (W.fans && (near4 || !W.crowdInit)) {
      W.crowdInit = true;
      const F = W.fans, N = F.n, bA = W.body.instanceMatrix.array, fA = W.face.instanceMatrix.array, aA = W.arms.instanceMatrix.array;
      const wave = t / 16, k1 = Math.min(1, dt * 4), k2 = Math.min(1, dt * 8);
      const p0 = pos[0], p1 = pos[1];
      // cards up for the hero going by
      for (const c of W.cards) { const want = Math.abs(B[c.hero].d - -F.z[c.i]) < 9 && !hush ? 1 : 0; c.up += (want - c.up) * Math.min(1, dt * 5); }
      for (let i = 0; i < N; i++) {
        const x = F.x[i], z = F.z[i], s = F.s[i], ph = F.ph[i];
        const e0 = Math.abs(p0.z - z), e1 = Math.abs(p1.z - z), e = Math.min(e0, e1), hp = e0 < e1 ? p0 : p1;
        const near = e < 7 ? 1 - e / 7 : 0;
        // the wave
        const w = fract(wave - F.u[i]), wv = w < 0.07 ? Math.sin(w / 0.07 * Math.PI) : 0;
        let gc = 0; for (const c of W.cheers) if (Math.abs(c.d + z) < 10) gc = Math.max(gc, 1 - c.t / 1.8);
        const card = W.cardOf.get(i), cu = card ? card.up : 0;
        let hop, arm;
        if (hush) { hop = 0; arm = -0.9; }
        else {
          hop = Math.max(wv * 0.34, near * Math.abs(Math.sin(t * 6.5 + ph)) * 0.16, party * Math.abs(Math.sin(t * 7.5 + ph)) * 0.38, gc * Math.abs(Math.sin(t * 8 + ph)) * 0.3, cu * 0.04);
          const up = Math.max(wv, near * (0.5 + 0.3 * Math.sin(t * 6.5 + ph)), party * (0.75 + 0.25 * Math.sin(t * 9 + ph)), gc, F.boost[i] > 0 ? 1 : 0, cu * 0.95);
          arm = -0.12 + Math.sin(t * 1.3 + ph) * 0.08 - up * 2.9;
        }
        if (F.boost[i] > 0) F.boost[i] -= dt;
        F.arm[i] += (arm - F.arm[i]) * k2;
        // watch the heroes go by
        let ty = F.base[i];
        if (e < 26) { const a = Math.atan2(hp.x - x, hp.z - z); let da = a - F.base[i]; da = Math.atan2(Math.sin(da), Math.cos(da)); ty = F.base[i] + clamp(da, -1.25, 1.25); }
        F.yaw[i] += (ty - F.yaw[i]) * k1;
        const yw = F.yaw[i], c = Math.cos(yw), sn = Math.sin(yw), sq = 1 + hop * 0.3, y = F.y[i] + hop, o = i * 16;
        bA[o] = c * s; bA[o + 1] = 0; bA[o + 2] = -sn * s; bA[o + 3] = 0; bA[o + 4] = 0; bA[o + 5] = s * sq; bA[o + 6] = 0; bA[o + 7] = 0;
        bA[o + 8] = sn * s; bA[o + 9] = 0; bA[o + 10] = c * s; bA[o + 11] = 0; bA[o + 12] = x; bA[o + 13] = y; bA[o + 14] = z; bA[o + 15] = 1;
        for (let j = 0; j < 16; j++) fA[o + j] = bA[o + j];
        const ar = F.arm[i], ca = Math.cos(ar), sa = Math.sin(ar);
        aA[o] = c * s; aA[o + 1] = 0; aA[o + 2] = -sn * s; aA[o + 3] = 0;
        aA[o + 4] = sa * sn * s; aA[o + 5] = ca * s * sq; aA[o + 6] = sa * c * s; aA[o + 7] = 0;
        aA[o + 8] = ca * sn * s; aA[o + 9] = -sa * s * sq; aA[o + 10] = ca * c * s; aA[o + 11] = 0;
        aA[o + 12] = x; aA[o + 13] = y + s * sq * 0.38; aA[o + 14] = z; aA[o + 15] = 1;
        if (card) { const g = card.g; g.visible = card.up > 0.03; if (g.visible) { g.position.set(x + sn * 0.12 * s, y + (0.55 + 0.5 * card.up) * s, z + c * 0.12 * s); g.rotation.set(0, yw, Math.sin(t * 5 + ph) * 0.12 * card.up); g.scale.setScalar(0.4 + 0.6 * card.up); } }
      }
      W.body.instanceMatrix.needsUpdate = W.face.instanceMatrix.needsUpdate = W.arms.instanceMatrix.needsUpdate = true;
      W.crowd.position.x = (L && L.lean) || 0;
    }
    for (const f of W.flags) f.fl.rotation.y = -f.s * Math.PI / 2 + Math.sin(t * 2.6 + f.ph) * 0.35;
    /* ---------- the score reel and its hamster ---------- */
    if (W.reel) {
      const R = W.reel, sb = st.bump[R.B.i], cool = sb ? sb.cool : 0;
      if (cool > R.cool + 0.2) { R.v = 15; R.over = 1; R.hv = 0; }
      R.cool = cool;
      R.v += ((R.dizzy > 0 ? 0.6 : 2.4) - R.v) * Math.min(1, dt * 0.9); R.a += R.v * dt; R.drum.rotation.x = -R.a;
      if (R.over) { R.ha += R.v * dt; if (R.ha >= Math.PI * 2 + 0.25) { R.ha -= Math.PI * 2; R.over = 0; R.dizzy = 2.4; R.hv = -1.6; } }
      else { R.hv += (-(R.ha - 0.25) * 30 - R.hv * 3.5) * dt; R.ha += R.hv * dt; }
      R.piv.rotation.x = -R.ha;
      const u = R.ham.userData, run = R.dizzy > 0 ? 3 : 14;
      u.legL.rotation.x = Math.sin(t * run) * 0.8; u.legR.rotation.x = -Math.sin(t * run) * 0.8; u.armL.rotation.x = -Math.sin(t * run) * 0.6; u.armR.rotation.x = Math.sin(t * run) * 0.6;
      R.ham.rotation.z = R.dizzy > 0 ? Math.sin(t * 9) * 0.25 : 0;
      R.dizzy = Math.max(0, R.dizzy - dt);
      R.piv.updateMatrixWorld(true);
      R.stars.forEach((s2, k3) => { s2.visible = R.dizzy > 0; if (s2.visible) { tmp.set(Math.cos(t * 6 + k3 * 2.1) * 0.16, 0.36, Math.sin(t * 6 + k3 * 2.1) * 0.16); R.ham.localToWorld(tmp); s2.parent.worldToLocal(tmp); s2.position.copy(tmp); s2.rotation.y = t * 5; } });
    }
    /* ---------- the comet ---------- */
    if (W.comet) {
      const C = W.comet, lp = pos[B[0].d > B[1].d ? 0 : 1];
      C.blink -= dt; if (C.blink < -0.14) C.blink = 2.5 + Math.random() * 3;
      const shut = C.happy > 0 ? 0.25 : C.blink < 0 ? 0.08 : 1;
      C.gulp = Math.max(0, C.gulp - dt * 1.5);
      for (const e of C.eyes) {
        e.e.scale.y += (shut - e.e.scale.y) * Math.min(1, dt * 18);
        tmp.copy(lp); e.e.worldToLocal(tmp); const dx = clamp(tmp.x * 0.03, -0.18, 0.18), dy = clamp(tmp.y * 0.03, -0.16, 0.12);
        e.pup.position.x += (dx - e.pup.position.x) * Math.min(1, dt * 6); e.pup.position.y += (dy - e.pup.position.y) * Math.min(1, dt * 6);
      }
      const laugh = C.happy > 0 ? Math.sin(t * 14) * 0.04 : 0, g = C.gulp;
      C.cg.scale.set(1 + g * 0.08 + laugh, 1 - g * 0.1 - laugh, 1 + g * 0.08);
      C.cg.rotation.z = Math.sin(t * 0.7) * 0.03 + laugh * 0.6;
      C.smile.scale.set(1 + g * 0.4 + C.happy * 0.25, 0.7 + g * 0.5 + C.happy * 0.5, 1);
      // the polisher: circles with the rag; holds on tight when the comet laughs
      const u = C.pol.userData;
      if (C.happy > 0 || g > 0.2) { u.armL.rotation.x = u.armR.rotation.x = -2.6; u.body.rotation.z = Math.sin(t * 16) * 0.12; }
      else { u.armR.rotation.x = -1.6 + Math.sin(t * 6) * 0.4; u.armR.rotation.z = Math.cos(t * 6) * 0.3; u.armL.rotation.x = -0.3; u.body.rotation.z = Math.sin(t * 3) * 0.05; }
    }
    /* ---------- the parade ---------- */
    if (W.parade) {
      const Pd = W.parade, Lp = Pd.L;
      Pd.u = (Pd.u + dt * 1.3) % Lp;
      const at = (u) => {
        u = ((u % Lp) + Lp) % Lp; const a = PD1 - PD0, b = 2 * PX;
        if (u < a) return [-PX, PD0 + u, 0, 1];
        if ((u -= a) < b) return [-PX + u, PD1, 1, 0];
        if ((u -= b) < a) return [PX, PD1 - u, 0, -1];
        u -= a; return [PX - u, PD0, -1, 0];
      };
      const P3 = (x, d) => kit.V(x, yb(d), -d);
      for (const m of Pd.mem) {
        const [x, d, dx, dd] = at(Pd.u - m.off), q = P3(x, d), yaw = Math.atan2(dx, -dd);
        let cur = m.g.rotation.y, da = Math.atan2(Math.sin(yaw - cur), Math.cos(yaw - cur)); m.g.rotation.y = cur + da * Math.min(1, dt * 5);
        const step = Math.abs(Math.sin(t * 6 + m.off * 2));
        m.g.position.set(q.x, q.y + (m.kind === 'float' ? 0 : step * 0.06), q.z);
        const u = m.g.userData;
        if (u && u.legL) { u.legL.rotation.x = Math.sin(t * 6 + m.off * 2) * 0.6; u.legR.rotation.x = -Math.sin(t * 6 + m.off * 2) * 0.6; }
        if (m.kind === 'drum') { u.armL.rotation.x = -1.2 + Math.max(0, Math.sin(t * 12 + m.off)) * 0.7; u.armR.rotation.x = -1.2 + Math.max(0, -Math.sin(t * 12 + m.off)) * 0.7; }
        if (m.kind === 'horn') { u.armL.rotation.x = u.armR.rotation.x = -1.4; u.body.rotation.x = -0.15 + Math.sin(t * 3 + m.off) * 0.08; }
        if (m.kind === 'pole') { u.armR.rotation.x = -1.0; u.armL.rotation.x = -0.6; }
        if (m.kind === 'dance') { u.armR.rotation.x = -2.6 + Math.sin(t * 4 + m.off) * 0.8; u.armR.rotation.z = Math.cos(t * 4 + m.off) * 0.6; m.rb.rotation.z = Math.sin(t * 7 + m.off) * 0.8; m.g.rotation.y += Math.sin(t * 2 + m.off) * 0.3; }
        if (m.kind === 'float') { Pd.bal.position.x = Math.sin(t * 1.1) * 0.25; Pd.bal.rotation.y = Math.sin(t * 0.7) * 0.4; const r = Pd.rider.userData; r.armR.rotation.x = -2.6 + Math.sin(t * 7) * 0.4; }
      }
      // the banner between the two pole carriers
      const pa = Pd.mem[1].g.position, pb = Pd.mem[2].g.position;
      Pd.banner.position.set((pa.x + pb.x) / 2, (pa.y + pb.y) / 2 + 0.95, (pa.z + pb.z) / 2);
      Pd.banner.rotation.set(0, Math.atan2(pb.z - pa.z, pa.x - pb.x), 0); Pd.banner.scale.x = Math.max(0.4, Math.hypot(pb.x - pa.x, pb.z - pa.z) - 0.1);
      // the drum major's baton: twirl, throw, catch; every fourth throw bonks the first drummer and bounces back
      const dm = Pd.mem[0].g, dr = Pd.mem[3].g, cyc = (t % 7) / 7, n = Math.floor(t / 7), miss = n % 4 === 3;
      const hand = kit.V(0.32, 0.62, 0.2).applyMatrix4(dm.matrixWorld), head = kit.V(0, 0.62, 0).applyMatrix4(dr.matrixWorld);
      const du = dm.userData; du.armR.rotation.x = -2.2; du.armL.rotation.x = -0.4;
      let bp, spin = t * 3;
      if (cyc < 0.25) { bp = hand; spin = t * 16; }
      else if (cyc < 0.45) { const v = (cyc - 0.25) / 0.2, to = miss ? head : hand; bp = hand.clone().lerp(to, v); bp.y += Math.sin(v * Math.PI) * 2.4; spin = t * 14; du.armR.rotation.x = -2.9; if (miss && v > 0.9) dr.userData.body.rotation.z = 0.3; }
      else if (miss && cyc < 0.6) { const v = (cyc - 0.45) / 0.15; bp = head.clone().lerp(hand, v); bp.y += Math.sin(v * Math.PI) * 0.9; spin = t * 10; dr.userData.body.rotation.z = Math.sin(t * 22) * 0.25 * (1 - v); }
      else { bp = hand; dr.userData.body.rotation.z *= 0.9; }
      Pd.baton.position.copy(bp); Pd.baton.rotation.set(0, dm.rotation.y, spin);
    }
    /* ---------- the balloon seller: the crossing kickers' bangs let a balloon go ---------- */
    if (W.balloons) {
      const Bl = W.balloons;
      if (Bl.free > 0) { const b = Bl.bals.find(q => q.st === 0); if (b && Bl.bals.filter(q => q.st === 0).length > 3) { b.st = 1; b.t = 0; b.d = -b.home.z; b.x = b.home.x; } Bl.free = 0; Bl.seller.userData.armL.rotation.x = -2.6; }
      Bl.seller.userData.armR.rotation.x = -1.4; Bl.seller.userData.armL.rotation.x *= 0.97;
      let parked = 0;
      for (const b of Bl.bals) {
        if (b.st === 0) { b.g.position.set(b.home.x + Math.sin(t * 1.3 + b.home.y) * 0.08, b.home.y + Math.sin(t * 1.7 + b.home.x) * 0.05, b.home.z); }
        else if (b.st === 1) { // rising to the glass
          b.t += dt; const v = Math.min(1, b.t / 5), top = yb(b.d) + 12.9; b.g.position.set(b.x + Math.sin(b.t * 2) * 0.4 * v, b.home.y + (top - b.home.y) * (1 - Math.pow(1 - v, 2)), -b.d);
          if (v >= 1) b.st = 2;
        } else { // drifting up under the glass to the backboard, where the escaped ones collect
          const stop = 414.2 - parked * 0.5; parked++;
          b.d = Math.min(stop, b.d + dt * 0.9); b.x += (-6 + parked * 1.6 - b.x) * dt * 0.1;
          b.g.position.set(b.x + Math.sin(t * 1.4 + b.home.x * 3) * 0.2, yb(b.d) + 12.9 + Math.sin(t * 2.1 + b.home.y) * 0.08, -b.d);
        }
        // its string down to the hand (or trailing)
        const top = b.g.position, bot = b.st === 0 ? Bl.hand : tmp.set(top.x + 0.05, top.y - 1.1, top.z + 0.1);
        b.str.position.set((top.x + bot.x) / 2, (top.y - 0.26 + bot.y) / 2, (top.z + bot.z) / 2);
        const len = Math.max(0.01, top.distanceTo(bot)); b.str.scale.set(1, len, 1); b.str.lookAt(bot); b.str.rotateX(Math.PI / 2);
      }
    }
    if (W.turn) { W.turn.a += dt * (Math.sin(t * 1.3) > 0.6 ? 2.4 : 0); W.turn.ts.rotation.y = W.turn.a; }
    /* ---------- the comet-pop seller ---------- */
    if (W.seller && near4) {
      const S2 = W.seller, g = S2.g, u = g.userData;
      if (S2.st === 'walk') {
        const dir = Math.sign(S2.want - S2.d); S2.d += dir * dt * 1.1; u.legL.rotation.x = Math.sin(t * 7) * 0.5; u.legR.rotation.x = -Math.sin(t * 7) * 0.5;
        g.rotation.y = dir > 0 ? Math.PI : 0; u.armL.rotation.x = u.armR.rotation.x = -2.5;
        if (Math.abs(S2.want - S2.d) < 0.05) {
          S2.st = 'sell'; S2.t = 0;
          const F = W.fans; let best = -1, bd = 3; for (let i = 0; i < F.n; i++) if (F.side[i] > 0 && F.tier[i] <= 1) { const e = Math.abs(-F.z[i] - S2.d); if (e < bd) { bd = e; best = i; } }
          S2.fan = best; if (best >= 0) F.boost[best] = 2.2;
        }
      } else {
        S2.t += dt; g.rotation.y = Math.PI / 2; u.legL.rotation.x = u.legR.rotation.x = 0;
        const F = W.fans;
        if (S2.fan >= 0 && S2.t > 0.6 && S2.t < 1.3) { const v = (S2.t - 0.6) / 0.7, from = kit.V(0, 0.75, 0.12).applyMatrix4(g.matrixWorld), to = kit.V(F.x[S2.fan], F.y[S2.fan] + 0.7, F.z[S2.fan]); S2.fly.visible = true; S2.fly.position.copy(from.lerp(to, v)); S2.fly.position.y += Math.sin(v * Math.PI) * 0.8; S2.fly.rotation.z = t * 12; u.armR.rotation.x = -2.9; }
        else S2.fly.visible = false;
        if (S2.t > 2.4) { S2.st = 'walk'; S2.want = clamp(S2.d + (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 6), 300, 372); }
      }
      g.position.set(kit.RAIL + 0.75, yb(S2.d) + kit.SH, -S2.d);
    }
    /* ---------- the sleeper ---------- */
    if (W.sleeper) {
      const Z = W.sleeper, g = Z.g, u = g.userData;
      if (Z.awake === 0) {
        u.body.rotation.x = -0.32 + Math.sin(t * 1.2) * 0.03; u.armL.rotation.x = u.armR.rotation.x = 0.2;
        Z.zs.forEach((z, k3) => { const c = fract(t * 0.35 + k3 / 3); z.visible = true; z.position.set(Z.q.x - 0.1 - c * 0.3, Z.q.y + 0.7 + c * 0.9, Z.q.z + Math.sin(c * 6) * 0.1); z.scale.setScalar(0.6 + c * 0.8); z.material.opacity = Math.sin(c * Math.PI); z.lookAt(kit.V(0, Z.q.y + 3, Z.q.z + 8)); });
      } else {
        Z.awake += dt; for (const z of Z.zs) z.visible = false;
        const a = Z.awake;
        if (!Z.capV) { Z.capV = { p: kit.V(0, 0, 0), v: kit.V(-1.2, 3.2, 0.4) }; Z.cap.getWorldPosition(Z.capV.p); K.root.attach(Z.cap); }
        if (Z.capV.p.y > yb(-Z.q.z) + 0.08) { Z.capV.v.y -= 9 * dt; Z.capV.p.addScaledVector(Z.capV.v, dt); Z.cap.position.copy(Z.capV.p); Z.cap.rotation.z += dt * 6; }
        u.body.rotation.x *= 0.85;
        const jump = a < 0.5 ? Math.sin(a / 0.5 * Math.PI) * 0.7 : (W.party > 0 ? Math.abs(Math.sin(t * 7.5)) * 0.35 : 0);
        g.position.y = Z.q.y + jump; u.armL.rotation.x = u.armR.rotation.x = W.party > 0 || a < 1 ? -2.8 + Math.sin(t * 9) * 0.2 : -0.3;
      }
    }
    /* ---------- the photographer ---------- */
    if (W.photo) {
      const Ph = W.photo; Ph.cool -= dt; Ph.f = Math.max(0, Ph.f - dt * 6); Ph.jump = Math.max(0, Ph.jump - dt * 2.5);
      const passing = B.some(b => Math.abs(b.d - Ph.q.z * -1) < 2.6);
      if (passing && Ph.cool <= 0) { Ph.cool = 2.2; Ph.f = 1; Ph.jump = 1; const pr = Ph.prints[Ph.n++ % Ph.prints.length]; pr.t = 0; pr.x = Ph.q.x - 0.15 + (Math.random() - 0.5) * 0.6; pr.z = Ph.q.z + (Math.random() - 0.5) * 0.9; pr.y0 = Ph.q.y + 1.25; pr.m.visible = true; }
      Ph.flash.material.opacity = Ph.f; kit.glows.color(Ph.gi, '#ffffff', Ph.f * 0.6);
      const u = Ph.g.userData; Ph.g.position.y = Ph.q.y + Math.sin(Ph.jump * Math.PI) * 0.3; u.armL.rotation.x = u.armR.rotation.x = Ph.jump > 0 ? -2.7 : -1.2;
      for (const pr of Ph.prints) if (pr.m.visible) { pr.t += dt; const v = Math.min(1, pr.t / 1.6), floor = Ph.q.y + 0.01; pr.m.position.set(pr.x + Math.sin(pr.t * 5) * 0.12 * (1 - v), Math.max(floor, pr.y0 + 0.3 * Math.sin(Math.min(1, pr.t * 3) * Math.PI) - v * (pr.y0 - floor)), pr.z); pr.m.rotation.set(v >= 1 ? -Math.PI / 2 : Math.sin(pr.t * 6) * 0.6, pr.t * 2, 0); }
    }
    /* ---------- fireworks: the show at the Jackpot, a dud now and then ---------- */
    if (W.racks) {
      W.show = Math.max(0, W.show - dt);
      if (W.show > 0) { W.showT -= dt; if (W.showT <= 0) { W.showT = 0.32 + Math.random() * 0.15; launch(W.racks[Math.random() < 0.5 ? 0 : 1], true); } }
      else if (near4 && (W.dud -= dt) <= 0) { W.dud = 35 + Math.random() * 20; const rk = A.pick(W.racks); W.rockets.push({ x: rk.x, y: rk.y0 + 0.8, z: -rk.d, tx: rk.x - rk.s * 0.6, ty: rk.y0 + 2.2, tz: -rk.d + 0.4, t: 0, dur: 0.6, big: false, cols: ['#ffd24a', '#aaaaaa'] }); rk.shrug = 2.6; }
      for (const rk of W.racks) { const u = rk.crew.userData; rk.shrug = Math.max(0, rk.shrug - dt); if (W.show > 0) { u.armR.rotation.x = -2.0 + Math.sin(t * 10) * 0.3; u.armL.rotation.x = -2.6; rk.crew.position.y = rk.y0 + Math.abs(Math.sin(t * 8)) * 0.12; } else if (rk.shrug > 0 && rk.shrug < 1.6) { u.armL.rotation.x = u.armR.rotation.x = -1.6; u.armL.rotation.z = 0.8; u.armR.rotation.z = -0.8; } else { u.armR.rotation.x = -0.9 + Math.sin(t * 0.8) * 0.1; u.armL.rotation.x = 0; u.armL.rotation.z = u.armR.rotation.z = 0; rk.crew.position.y = rk.y0; } rk.tip.material.color.copy(A.hot('#ffb84a', 1.6 + Math.sin(t * 20) * 0.8)); }
      W.rockets = W.rockets.filter(r => {
        r.t += dt; const v = Math.min(1, r.t / r.dur), x = r.x + (r.tx - r.x) * v, y = r.y + (r.ty - r.y) * (1 - Math.pow(1 - v, 2)), z = r.z + (r.tz - r.z) * v;
        if (Math.random() < dt * 40) spark(x, y, z, (Math.random() - 0.5) * 0.4, -0.8, (Math.random() - 0.5) * 0.4, '#ffb84a', 0.4);
        if (v >= 1) { if (r.big) burst(x, y, z, 64, r.cols, 3.2); else burst(x, y, z, 8, r.cols, 1.2); return false; }
        return true;
      });
      const S = W.sparks, a = S.m.instanceMatrix.array; let live = false;
      for (let i = 0; i < S.n; i++) {
        const o = i * 16;
        if (S.life[i] <= 0) { if (a[o] !== 0) { a[o] = a[o + 5] = a[o + 10] = 0; live = true; } continue; }
        live = true; S.life[i] -= dt; const j = i * 3;
        S.v[j + 1] -= 2.2 * dt; S.v[j] *= 1 - dt * 0.8; S.v[j + 1] *= 1 - dt * 0.8; S.v[j + 2] *= 1 - dt * 0.8;
        S.p[j] += S.v[j] * dt; S.p[j + 1] += S.v[j + 1] * dt; S.p[j + 2] += S.v[j + 2] * dt;
        const sc = Math.max(0, S.life[i] / S.max[i]) * (Math.random() < 0.15 ? 0.4 : 1);
        a[o] = a[o + 5] = a[o + 10] = sc; a[o + 1] = a[o + 2] = a[o + 3] = a[o + 4] = a[o + 6] = a[o + 7] = a[o + 8] = a[o + 9] = a[o + 11] = 0; a[o + 12] = S.p[j]; a[o + 13] = S.p[j + 1]; a[o + 14] = S.p[j + 2]; a[o + 15] = 1;
      }
      if (live) S.m.instanceMatrix.needsUpdate = true;
    }
    /* ---------- confetti ---------- */
    if (W.conf) {
      const C = W.conf, a = C.m.instanceMatrix.array; let live = false;
      if (C.rain > 0) { C.rain -= dt; for (let k = 0; k < Math.round(dt * 220); k++) { const d = 380 + Math.random() * 34; confetti((Math.random() - 0.5) * 22, yb(d) + 7 + Math.random() * 4, -d, 0, -0.8, 0, 0.6); } }
      for (let i = 0; i < C.n; i++) {
        const o = i * 16;
        if (C.life[i] <= 0) { if (a[o] !== 0 || a[o + 5] !== 0) { for (let j = 0; j < 15; j++) a[o + j] = 0; live = true; } continue; }
        live = true; C.life[i] -= dt; const j = i * 3, floor = yb(-C.p[j + 2]) + 0.02;
        if (!C.rest[i]) {
          C.v[j + 1] -= 2.6 * dt; const dr = 1 - dt * 1.6; C.v[j] *= dr; C.v[j + 2] *= dr; if (C.v[j + 1] < -1.6) C.v[j + 1] = -1.6;
          C.p[j] += (C.v[j] + Math.sin(C.life[i] * 3 + i) * 0.4) * dt; C.p[j + 1] += C.v[j + 1] * dt; C.p[j + 2] += C.v[j + 2] * dt;
          C.r[j] += dt * 5; C.r[j + 1] += dt * 3; if (C.p[j + 1] <= floor) { C.p[j + 1] = floor; C.rest[i] = 1; C.r[j] = -Math.PI / 2; C.r[j + 2] = 0; }
        }
        const sc = C.life[i] < 1 ? C.life[i] : 1;
        tmp.set(C.r[j], C.r[j + 1], C.r[j + 2]);
        const cx = Math.cos(tmp.x), sx = Math.sin(tmp.x), cy = Math.cos(tmp.y), sy = Math.sin(tmp.y);
        // R = Ry * Rx (enough tumble for a scrap of paper)
        a[o] = cy * sc; a[o + 1] = 0; a[o + 2] = -sy * sc; a[o + 3] = 0;
        a[o + 4] = sy * sx * sc; a[o + 5] = cx * sc; a[o + 6] = cy * sx * sc; a[o + 7] = 0;
        a[o + 8] = sy * cx * sc; a[o + 9] = -sx * sc; a[o + 10] = cy * cx * sc; a[o + 11] = 0;
        a[o + 12] = C.p[j]; a[o + 13] = C.p[j + 1]; a[o + 14] = C.p[j + 2]; a[o + 15] = 1;
      }
      if (live) C.m.instanceMatrix.needsUpdate = true;
    }
  }

  return { build, update, W };
})();
