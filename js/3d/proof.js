/* Pip & Bo - the 3D look proof (Gate 1 of World 41). Reachable only with the URL flag ?k3dproof, never from a menu.

   A still life: the first corner of 41-1's Page 1 (The Hedge Garden), fully dressed, with Pip and Bo in their
   'popbook' outfits carrying the pencil. Keys:
     W A S D / arrows   walk Pip / Bo (screen-based: up walks away), the pencil stays between them
     1 2 3 4            camera rig: follow, diorama, rail, chase      (rail: hold Q / E to travel it)
     5 6 7 8            toggle ink outlines, shadows, see-through silhouettes, the photo pass (depth of field)
     9                  toggle the outfits
   The shot tool (tools/k3d/shot.js) drives it through K3D.proof.set({ cam, preset, dress, ... }).
*/
'use strict';

(function () {
  const T = K3D.T;
  const PW2 = 24, PD2 = 32; // each page, units
  const proof = K3D.proof = { on: false };

  // the Hedge Garden's printed picture under the pop-ups (left page; page coords: x 0..24 from the outer edge, z 0..32 from the far edge)
  function paintGarden(c, S, r, w, h) {
    const X = x => (x + PW2) * S, Z = z => (z + PD2 / 2) * S; // world (x, z) on the left page -> texture px
    // lawns: soft green watercolour washes over most of the page
    for (let i = 0; i < 420; i++) POPUP.wash(c, r() * w, r() * h, S * (0.6 + r() * 1.6), r() < 0.5 ? '#9cc77a' : '#b6d68c', 0.22, r, { noEdge: r() < 0.6 });
    // mown stripes, faint
    c.fillStyle = 'rgba(255,255,240,0.06)'; for (let y = 0; y < h; y += S * 1.2) c.fillRect(0, y, w, S * 0.6);
    // the gravel path the pencil travels: the plaza, the run north and the turn east
    const path = (pts, wd) => {
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = '#e8d6a8'; c.lineWidth = wd * S; c.beginPath(); pts.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); c.stroke();
      // gravel speckles
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], n = Math.hypot(x1 - x0, z1 - z0) * 260;
        for (let k = 0; k < n; k++) { const t = r(), ox = (r() - 0.5) * wd * 0.92, nx = -(z1 - z0), nz = x1 - x0, l = Math.hypot(nx, nz); c.fillStyle = r() < 0.5 ? 'rgba(150,120,70,0.35)' : 'rgba(255,250,230,0.5)'; c.fillRect(X(x0 + (x1 - x0) * t + nx / l * ox), Z(z0 + (z1 - z0) * t + nz / l * ox), 2 + r() * 3, 2 + r() * 2); }
      }
      // inked edges
      c.strokeStyle = 'rgba(43,33,48,0.55)'; c.lineWidth = 2.4;
      for (const sd of [-1, 1]) {
        c.beginPath();
        pts.forEach(([x, z], i) => {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], nx = -(b[1] - a[1]), nz = b[0] - a[0], l = Math.hypot(nx, nz) || 1;
          const px = X(x + nx / l * sd * wd / 2) + (r() - 0.5) * 2, pz = Z(z + nz / l * sd * wd / 2) + (r() - 0.5) * 2;
          i ? c.lineTo(px, pz) : c.moveTo(px, pz);
        });
        c.stroke();
      }
    };
    path([[-18, 12.5], [-18, 1.2], [-4.3, 1.2], [-4.3, -7.8], [0.5, -7.8]], 2.8);
    // the start plaza: a round of gravel with a printed compass rose
    c.fillStyle = '#e8d6a8'; c.beginPath(); c.arc(X(-18), Z(10.6), 3.1 * S, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(43,33,48,0.55)'; c.lineWidth = 2.4; c.beginPath(); c.arc(X(-18), Z(10.6), 3.1 * S, 0, Math.PI * 2); c.stroke();
    c.save(); c.translate(X(-18), Z(10.6)); c.strokeStyle = 'rgba(160,110,60,0.5)'; c.fillStyle = 'rgba(200,150,80,0.35)';
    for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(0, 0); c.lineTo(S * 0.3, -S * (i % 2 ? 0.9 : 1.6)); c.lineTo(-S * 0.3, -S * (i % 2 ? 0.9 : 1.6)); c.closePath(); c.fill(); c.stroke(); }
    c.restore();
    // printed flower beds and little ink tufts of grass across the lawns
    for (let i = 0; i < 900; i++) {
      const x = r() * w, y = r() * h;
      c.strokeStyle = 'rgba(60,100,50,0.45)'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x - 2, y - 7); c.moveTo(x, y); c.lineTo(x + 1, y - 9); c.moveTo(x + 4, y); c.lineTo(x + 5, y - 6); c.stroke();
    }
    for (let i = 0; i < 260; i++) {
      const x = r() * w, y = r() * h, col = ['#e0607a', '#f2c14e', '#ffffff', '#f08aa4'][Math.floor(r() * 4)];
      c.fillStyle = col; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos(k * 1.26) * 4, y + Math.sin(k * 1.26) * 4, 3, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#e8b33a'; c.beginPath(); c.arc(x, y, 2, 0, Math.PI * 2); c.fill();
    }
    // the page title, printed in the top margin
    c.fillStyle = 'rgba(59,48,64,0.6)'; c.font = 'italic ' + Math.round(S * 0.7) + 'px Georgia, "DejaVu Serif", serif'; c.textAlign = 'left';
    c.fillText('Chapter One: The Hedge Garden', X(-22.5), Z(-15));
  }
  function paintRight(c, S, r, w, h) {
    for (let i = 0; i < 380; i++) POPUP.wash(c, r() * w, r() * h, S * (0.6 + r() * 1.6), r() < 0.5 ? '#9cc77a' : '#b6d68c', 0.2, r, { noEdge: r() < 0.6 });
    const X = x => x * S, Z = z => (z + PD2 / 2) * S;
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#e8d6a8'; c.lineWidth = 2.8 * S; c.beginPath(); c.moveTo(X(-0.5), Z(-7.8)); c.lineTo(X(4.7), Z(-7.8)); c.lineTo(X(4.7), Z(-2.3)); c.lineTo(X(12), Z(-2.3)); c.stroke();
    c.strokeStyle = 'rgba(43,33,48,0.4)'; c.lineWidth = 2; for (let i = 0; i < 1200; i++) { c.fillStyle = r() < 0.5 ? 'rgba(150,120,70,0.3)' : 'rgba(255,250,230,0.5)'; c.fillRect(X(-0.5 + r() * 13), Z(-9 + r() * 8), 3, 2); }
    for (let i = 0; i < 700; i++) { const x = r() * w, y = r() * h; c.strokeStyle = 'rgba(60,100,50,0.45)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x - 2, y - 7); c.moveTo(x, y); c.lineTo(x + 1, y - 9); c.moveTo(x + 4, y); c.lineTo(x + 5, y - 6); c.stroke(); }
    for (let i = 0; i < 200; i++) { const x = r() * w, y = r() * h, col = ['#e0607a', '#f2c14e', '#ffffff', '#f08aa4'][Math.floor(r() * 4)]; c.fillStyle = col; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos(k * 1.26) * 4, y + Math.sin(k * 1.26) * 4, 3, 0, Math.PI * 2); c.fill(); } }
  }

  proof.build = function () {
    const K = K3D.scene({ bg: '#2e2228', fov: 24, far: 500 });
    K.maxBlur = 8;
    const texL = POPUP.pageTex('hedgeL', PW2, PD2, paintGarden, { num: '1', numAt: [2, PD2 - 0.7], gutter: 'right', textBlocks: [[1.2, 2.2, 9, 1.6], [13, 30.2, 9, 1.2, 8]] });
    const texR = POPUP.pageTex('hedgeR', PW2, PD2, paintRight, { num: '2', numAt: [PW2 - 2, PD2 - 0.7], gutter: 'left', textBlocks: [[13, 1.6, 9, 2.2, 14]] });
    const scen = K.add(new T.Group()); // still scenery, batched below
    const book = POPUP.book({ pw: PW2, pd: PD2, tex: [texL, texR] }); scen.add(book);
    const room = POPUP.room({ cup: [-35, 9], lamp: [40, -34], window: [-20, 0], books: [-40, -22] }); scen.add(room); K.tick(t => room.userData.tick(G.clock));
    // the sun comes from the lamp
    K.sunDir.set(0.62, 1, -0.5).normalize();
    // hedges: the run north from the plaza and the wide corner east (corridor 2.8); low on the camera side
    scen.add(POPUP.hedge([[-19.71, 7.2], [-19.71, -0.51], [-6, -0.51]], { h: 1.15, seed: 2 }));
    scen.add(POPUP.hedge([[-16.29, 7.2], [-16.29, 2.91], [-6, 2.91]], { h: 0.62, seed: 3 }));
    // round the plaza: a low clipped hedge ring with gaps (low enough for the pencil to pass over)
    const ring = []; for (let i = 0; i <= 10; i++) { const a = Math.PI * 0.62 + i / 10 * Math.PI * 1.76; ring.push([-18 + Math.cos(a) * 3.75, 10.6 + Math.sin(a) * 3.75]); }
    scen.add(POPUP.hedge(ring.slice(0, 6), { h: 0.45, t: 0.4, seed: 4 }));
    scen.add(POPUP.hedge(ring.slice(6), { h: 0.45, t: 0.4, seed: 5 }));
    // roses, the peacock, the fountain beyond the corner
    for (const [x, z, rt, s, col] of [[-21.6, 5.6, 0.5, 0.9, '#e0507a'], [-21.8, 2.2, 0.4, 0.8, '#f2c14e'], [-14.2, 6.0, -0.5, 0.85, '#e0507a'], [-13.4, 4.5, -0.2, 0.7, '#ffffff'], [-22.3, 13.6, 0.3, 0.8, '#f08aa4'], [-13.8, 13.8, -0.4, 0.85, '#e0507a']]) scen.add(POPUP.roseBush(x, z, rt, s, col, Math.round(x * z)));
    scen.add(POPUP.peacock(-22.6, 9.4, 0.7, 1.15));
    const ftn = POPUP.fountain(-10.5, -4.6, 1.15); scen.add(ftn); K.tick(() => ftn.userData.tick(G.clock));
    scen.add(POPUP.bookmark(-18, 14.2, 0));
    // the rest of the garden, beyond the corner: the fountain bay, the zig-zag and the locked gate on the right page
    const bay = []; for (let i = 0; i <= 12; i++) { const a = -Math.PI * 0.05 - i / 12 * Math.PI * 1.1; bay.push([-10.5 + Math.cos(a) * 3.6, -4.6 + Math.sin(a) * 3.6]); }
    scen.add(POPUP.hedge(bay, { h: 1.15, seed: 6 }));
    scen.add(POPUP.hedge([[-6, -0.51], [-6, -9.5], [3, -9.5], [3, -4], [9, -4]], { h: 1.15, seed: 7 }));
    scen.add(POPUP.hedge([[-6, 2.91], [-2.6, 2.91], [-2.6, -6.1], [6.4, -6.1], [6.4, -0.6], [9, -0.6]], { h: 0.62, seed: 8 }));
    scen.add(POPUP.gate(10.6, -2.3, Math.PI / 2, 2.8));
    const arch = POPUP.dotted([[9.4, -0.9], [8.6, -1.7], [8.4, -2.3], [8.6, -2.9], [9.4, -3.7]]); arch.userData.live = true; scen.add(arch);
    for (const [x, z, sc] of [[-23, -12, 1.2], [-21, -8, 0.9], [-13, -13, 1.1], [-3, 12, 1.2], [4, 9, 1], [12, 6, 1.3], [18, -10, 1.2], [15, -13, 0.9], [21, 4, 1.1], [-8, 10, 0.9], [-10, 13.5, 1.1]]) scen.add(POPUP.tree(x, z, sc, Math.round(x * 3 + z)));
    for (const [x, z, rt, sc, col] of [[1, 3, 0.2, 0.9, '#e0507a'], [8, 3, -0.3, 0.8, '#f2c14e'], [14, -2, 0.1, 0.9, '#f08aa4'], [-4, -12, 0.3, 0.9, '#ffffff']]) scen.add(POPUP.roseBush(x, z, rt, sc, col, Math.round(x * 7 + z)));
    scen.add(POPUP.pullTab(24.1, 6, 0, 'Pull'));
    scen.add(POPUP.pullTab(-24.1, -8, Math.PI, 'Pull'));
    const dl = POPUP.dotted([[-14.5, 1.2], [-13.2, 0.6], [-11.6, 0.4], [-10, 0.6], [-8.8, 1.2]]); dl.userData.set(9); dl.userData.live = true; scen.add(dl);
    proof.baked = K3D.bake(scen);
    // the pencil and the heroes
    const pencil = POPUP.pencil(); K.add(pencil);
    const pBlob = K3D.blob(null, 0.5); pBlob.scale.set(5.4, 1, 0.9); pBlob.userData.r = 0; K.add(pBlob);
    const heroes = [0, 1].map(id => { const h = K3D.hero(id); K.add(h); K3D.seeThrough(h, PCOL[id]); return h; });
    K3D.seeThrough(pencil, '#f6c21c');
    const blobs = [0, 1].map(id => { const b = K3D.blob(PCOL[id]); K.add(b); return b; });
    proof.st = { K, pencil, pBlob, heroes, blobs, dl,
      pos: [{ x: -20.9, z: 10.9 }, { x: -15.1, z: 10.3 }], head: [0.9, -0.5], dress: true, speed: [0, 0] };
    heroes.forEach(h => K3D.dress(h, 'popbook'));
    proof.rigs = {
      follow: K3D.cams.follow({ pitch: 50, heading: 0, fov: 24, min: 13, max: 24 }),
      diorama: K3D.cams.diorama({ pos: [-31, 9, 24], at: [-17, 0, 6], fov: 26 }),
      rail: K3D.cams.rail({ path: [{ pos: [-30, 7, 18], at: [-18, 0.5, 10] }, { pos: [-26, 9, 2], at: [-17, 0.5, 4] }, { pos: [-12, 10, -6], at: [-15, 0.5, 2] }, { pos: [-4, 9, 8], at: [-12, 0.5, 2] }] }),
      chase: K3D.cams.chase({ dist: 8, height: 4.5, fov: 34 }),
    };
    proof.rig = proof.rigs.follow; proof.rig.snap();
    K.focusRange = 4.5;
    return K;
  };

  const v = new T.Vector3();
  proof.update = function (dt) {
    const s = proof.st; if (!s) return;
    const ps = G.players;
    // walk: screen-based movement, a simple rigid pencil between them (the real pencil rules are the level's)
    for (const k of [0, 1]) {
      const d = K3D.moveDir(ps[k]), sp = 5.9 * 0.8 * d.s;
      s.pos[k].x += d.x * sp * dt; s.pos[k].z += d.z * sp * dt; s.speed[k] = d.s * 0.8;
      if (d.s > 0.1) s.head[k] = Math.atan2(d.x, d.z);
    }
    const a = s.pos[0], b = s.pos[1], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1, want = 5.8, fix = s.noPencil ? 0 : (L - want) / 2;
    s.pencil.visible = s.pBlob.visible = !s.noPencil;
    a.x += dx / L * fix; a.z += dz / L * fix; b.x -= dx / L * fix; b.z -= dz / L * fix;
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, ang = Math.atan2(-(b.z - a.z), b.x - a.x);
    s.pencil.position.set(mx, 0.44, mz); s.pencil.rotation.y = ang;
    K3D.placeBlob(s.pBlob, mx, 0, mz, 0.4); s.pBlob.rotation.y = ang; s.pBlob.scale.set(5.3, 1, 0.75); s.pBlob.material.opacity = 0.7;
    s.pencil.updateMatrixWorld(true);
    const ends = [s.pencil.localToWorld(new T.Vector3(-2.55, 0, 0)), s.pencil.localToWorld(new T.Vector3(2.55, 0, 0))];
    for (const k of [0, 1]) {
      const h = s.heroes[k], e = ends[k], side = new T.Vector3(-Math.sin(ang + Math.PI / 2), 0, -Math.cos(ang + Math.PI / 2)).multiplyScalar(0.0);
      const hands = s.noPencil ? null : [e.clone().add(new T.Vector3(0, 0, 0.12)).add(side), e.clone().add(new T.Vector3(0, 0, -0.12))];
      K3D.heroPose(h, { x: s.pos[k].x, y: 0, z: s.pos[k].z, heading: s.head[k], speed: s.speed[k], vy: 0, hands }, dt);
      K3D.placeBlob(s.blobs[k], s.pos[k].x, 0, s.pos[k].z, 0);
      // name tags and bubbles land on the 3D characters through p.x / p.y (as in a level)
      const sc = K3D.toScreen(s.pos[k].x, K3D.HERO.h + 0.2, s.pos[k].z), base = K3D.toScreen(s.pos[k].x, 0, s.pos[k].z);
      ps[k].x = sc.x - ps[k].w / 2; ps[k].y = sc.y; void base;
    }
    // camera
    const tg = [v.set(a.x, 0.5, a.z).clone(), new T.Vector3(b.x, 0.5, b.z), ends[0], ends[1]];
    if (proof.rig.kind === 'chase') { const fx = (b.x - a.x) / L, fz = (b.z - a.z) / L; proof.rig.dir = { x: -fz, z: fx }; }
    if (proof.rig.kind === 'rail') { if (keys.has('KeyQ')) proof.rig.progress -= dt * 0.15; if (keys.has('KeyE')) proof.rig.progress += dt * 0.15; proof.rig.progress = clamp(proof.rig.progress, 0, 1); }
    proof.rig.update(s.K, dt, tg);
  };
  // the shot tool: K3D.proof.set({ cam: 'follow'|'diorama'|'rail'|'chase', preset, progress, dress, pos, head, opt })
  proof.set = function (o) {
    const s = proof.st;
    if (o.cam) { proof.rig = proof.rigs[o.cam]; }
    if (o.progress != null) proof.rigs.rail.progress = o.progress;
    if (o.pos) s.pos = o.pos.map(p => ({ x: p[0], z: p[1] }));
    if (o.head) s.head = o.head.slice();
    if (o.dress != null) { s.dress = o.dress; s.heroes.forEach(h => K3D.dress(h, o.dress ? 'popbook' : '')); }
    if (o.opt) Object.assign(K3D.opt, o.opt);
    if (o.compare != null) { proof.compare = o.compare; s.noPencil = o.compare; if (o.compare) { s.pos = [{ x: -18.6, z: 10.6 }, { x: -17.4, z: 10.6 }]; s.head = [0, 0]; } }
    if (o.preset) {
      // fixed views for reviews: a diorama rig aimed from a preset spot round the middle of the action
      const s2 = proof.st, mx = (s2.pos[0].x + s2.pos[1].x) / 2, mz = (s2.pos[0].z + s2.pos[1].z) / 2;
      const P = { top: [[mx, 28, mz + 0.01], [mx, 0, mz]], front: [[mx, 6, mz + 16], [mx, 0.5, mz]], left: [[mx - 16, 6, mz], [mx, 0.5, mz]], right: [[mx + 16, 6, mz], [mx, 0.5, mz]],
        pip: [[s2.pos[0].x + 1.2, 1.3, s2.pos[0].z + 3.2], [s2.pos[0].x, 0.55, s2.pos[0].z]], bo: [[s2.pos[1].x - 0.6, 1.3, s2.pos[1].z + 3.3], [s2.pos[1].x, 0.55, s2.pos[1].z]],
        pair: [[mx, 1.4, mz + 7.5], [mx, 0.5, mz]], compare: [[mx + 1.3, 1.4, mz + 7], [mx + 1.3, 0.45, mz]], wide: [[mx - 22, 17, mz + 26], [mx + 2, 0, mz - 4]], room: [[mx - 46, 40, mz + 50], [mx + 14, -2, mz - 18]] }[o.preset];
      if (P) { proof.rig = K3D.cams.diorama({ pos: P[0], at: P[1], fov: o.fov || (o.preset === 'pip' || o.preset === 'bo' ? 30 : 26) }); }
    }
    if (proof.rig) proof.rig.snap();
  };
  // keys on the proof page
  addEventListener('keydown', e => {
    if (!proof.on) return;
    const m = { Digit1: 'follow', Digit2: 'diorama', Digit3: 'rail', Digit4: 'chase' }[e.code];
    if (m) { proof.rig = proof.rigs[m]; proof.rig.snap(); }
    const t = { Digit5: 'ink', Digit6: 'shadows', Digit7: 'seeThrough', Digit8: 'dof' }[e.code];
    if (t) K3D.opt[t] = !K3D.opt[t];
    if (e.code === 'Digit9') proof.set({ dress: !proof.st.dress });
  });
  proof.start = async function () {
    proof.on = true;
    proof.build();
    K3D.show(true);
    K3D.fit();
  };
  // the side-by-side: the 2D Pip and Bo (drawPlayer, the game's own drawing) on a card on the right half
  function drawCompare() {
    ctx.fillStyle = 'rgba(246,239,223,0.97)'; rr(W / 2 + 10, 20, W / 2 - 30, H - 40, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(43,33,48,0.25)'; ctx.lineWidth = 2; ctx.stroke();
    text('2D (the game today)', W * 0.75, 50, 22, '#2b2130', 'center');
    text('3D', W * 0.25, 50, 22, '#ffffff', 'center');
    for (const id of [0, 1]) {
      const p = makePlayer(id); p.face = 1; p.x = 0; p.y = 0; p.alive = true;
      ctx.save(); ctx.translate(W * 0.75 + (id ? 95 : -95) - 5.2 * p.w / 2, H * 0.73 - 5.2 * p.h); ctx.scale(5.2, 5.2);
      drawPlayer(p); ctx.restore();
    }
  }
  // the 2D overlay on the proof page: name tags (from p.x / p.y) and the keys
  proof.draw2d = function () {
    ctx.clearRect(0, 0, W, H);
    if (proof.compare) drawCompare();
    if (proof.hideText) return;
    G.players.forEach((p, k) => {
      const x = p.x + p.w / 2, y = p.y - 18;
      ctx.font = '15px "Lilita One", "Arial Rounded MT Bold", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w2 = ctx.measureText(NAMES[k]).width + 16;
      ctx.fillStyle = 'rgba(23,25,29,0.78)'; rr(x - w2 / 2, y - 11, w2, 22, 11); ctx.fill();
      ctx.fillStyle = PCOL[k]; ctx.fillText(NAMES[k], x, y + 1);
    });
    ctx.font = '700 12px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('3D look proof · 1-4 camera (' + proof.rig.kind + ') · 5 ink · 6 shadows · 7 see-through · 8 depth of field · 9 outfits', 12, H - 14);
  };
})();
