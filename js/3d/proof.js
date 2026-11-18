/* Pip & Bo - the 3D look proof (Gate 1 of World 41). Reachable only with the URL flag ?k3dproof, never from a menu.

   A still life: 41-1's Page 1 (The Hedge Garden), fully dressed: one hedge path from the start plaza across the fold
   to the locked gate, with Pip and Bo in their 'popbook' outfits carrying the pencil at the start. Keys:
     W A S D / arrows   walk Pip / Bo (screen-based: up walks away), the pencil stays between them
     1 2 3 4            camera rig: follow, diorama, rail, chase      (rail: hold Q / E to travel it)
     5 6 7 8            toggle ink outlines, shadows, see-through silhouettes, the photo pass (depth of field)
     9                  toggle the outfits
   The shot tool (tools/k3d/shot.js) drives it through K3D.proof.set({ cam, preset, dress, ... }).
*/
'use strict';

(function () {
  const T = K3D.T;
  const PW2 = 34, PD2 = 42; // each page, units (round 2: bigger, so the whole hedge path fits)
  const proof = K3D.proof = { on: false };

  /* ---------- the page's plan ----------
     One hedge-lined route (a gravel path 2.8 wide) from the round start plaza on the left page to the locked gate at the
     far right of the right page. It crosses the book's fold at z = 8, where the hedges stop and a dotted line waits to
     draw a bridge over the gutter. Hedges stand 1.71 either side of the route's middle line; a hedge on the camera's
     side of a crosswise run is low (0.62), so the path is always in view. */
  const PLAZA = { x: -27, z: 14.5, r: 3.75 };
  const ROUTE = [
    [[-27, 11.1], [-27, 2], [-20, 2], [-20, -6], [-29, -6], [-29, -14], [-12, -14], [-12, -4], [-6, -4], [-6, 8], [-1.2, 8]],
    [[1.2, 8], [6, 8], [6, -2], [14, -2], [14, 10], [24, 10], [24, -8], [14, -8], [14, -15], [27.1, -15]],
  ];
  const GATE = { x: 27.4, z: -15 }, FOUNTAIN = { x: -14, z: 11 }, SUNDIAL = { x: 19, z: 1 }, POND = { x0: 16.5, z0: 14.6, x1: 30.5, z1: 19.8 };
  const HALF = 1.71, TALL = 1.15, LOW = 0.62;
  // a polyline moved sideways by d (left of travel for d > 0), with mitred corners
  function offset(pts, d) {
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const n1 = i > 0 ? norm(pts[i - 1], p) : norm(p, b), n2 = i < pts.length - 1 ? norm(p, pts[i + 1]) : norm(a, p);
      let mx = n1[0] + n2[0], mz = n1[1] + n2[1]; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
      const k = d / Math.max(0.3, mx * n1[0] + mz * n1[1]);
      return [p[0] + mx * k, p[1] + mz * k];
    });
  }
  function norm(a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [-dz / l, dx / l]; }
  // the hedge runs of one route part: both walls, split where the height changes
  function hedgeRuns(pts) {
    const runs = [];
    for (const d of [HALF, -HALF]) {
      const w = offset(pts, d);
      let cur = null;
      for (let i = 0; i < w.length - 1; i++) {
        const horiz = Math.abs(pts[i + 1][1] - pts[i][1]) < 0.01, sideZ = w[i][1] - pts[i][1];
        const h = horiz && sideZ > 0 ? LOW : TALL;
        if (!cur || cur.h !== h) { cur = { h, pts: [w[i]] }; runs.push(cur); }
        cur.pts.push(w[i + 1]);
      }
    }
    return runs;
  }
  function segDist(x, z, a, b) {
    const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1);
    return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
  }
  function routeDist(x, z) {
    let d = 1e9;
    const all = ROUTE[0].concat(ROUTE[1]);
    for (let i = 0; i < all.length - 1; i++) d = Math.min(d, segDist(x, z, all[i], all[i + 1]));
    return d;
  }
  const FULL = ROUTE[0].concat(ROUTE[1]); // (crosses the gutter)

  /* ---------- printing the pages ---------- */
  // both pages share one painter; ox is the page's left edge in world x (-PW2 for the left page, 0 for the right)
  function paintPage(left) {
    return function (c, S, r, w, h) {
      const ox = left ? -PW2 : 0, X = x => (x - ox) * S, Z = z => (z + PD2 / 2) * S;
      // lawns: soft green watercolour washes over most of the page
      for (let i = 0; i < 640; i++) POPUP.wash(c, r() * w, r() * h, S * (0.6 + r() * 1.6), r() < 0.5 ? '#9cc77a' : '#b6d68c', 0.22, r, { noEdge: r() < 0.6 });
      // mown stripes, faint
      c.fillStyle = 'rgba(255,255,240,0.06)'; for (let y = 0; y < h; y += S * 1.2) c.fillRect(0, y, w, S * 0.6);
      // a printed vine border round the page
      c.strokeStyle = 'rgba(70,110,60,0.55)'; c.lineWidth = 3; const m = 0.75 * S;
      c.strokeRect(m, m, w - m * 2, h - m * 2); c.strokeStyle = 'rgba(70,110,60,0.3)'; c.lineWidth = 1.5; c.strokeRect(m + 10, m + 10, w - m * 2 - 20, h - m * 2 - 20);
      const leafAt = (x, y, a) => { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = r() < 0.5 ? '#6f9a52' : '#86b062'; c.beginPath(); c.ellipse(0, -9, 5, 10, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(43,33,48,0.35)'; c.lineWidth = 1.2; c.stroke(); c.restore(); };
      for (let x = m + 30; x < w - m; x += 46) { leafAt(x, m + 5, 0.6 + r() * 0.5); leafAt(x + 20, h - m - 5, Math.PI - 0.6 - r() * 0.5); }
      for (let y = m + 30; y < h - m; y += 46) { leafAt(m + 5, y, -0.9 - r() * 0.4); leafAt(w - m - 5, y + 20, 0.9 + r() * 0.4); }
      for (const [x, y] of [[m, m], [w - m, m], [m, h - m], [w - m, h - m]]) { c.fillStyle = '#e0607a'; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos(k * 1.26) * 9, y + Math.sin(k * 1.26) * 9, 7, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#f2c14e'; c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill(); }
      // the hedges' damp shady foot: a darker band where every hedge stands
      for (const part of ROUTE) for (const run of hedgeRuns(part)) {
        c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = 'rgba(60,80,40,0.28)'; c.lineWidth = 1.5 * S;
        c.beginPath(); run.pts.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z + 0.15)) : c.moveTo(X(x), Z(z + 0.15))); c.stroke();
        c.strokeStyle = 'rgba(120,90,50,0.3)'; c.lineWidth = 0.95 * S; c.stroke();
      }
      // the gravel path, one line through both pages (it runs under the gutter too)
      const path = (pts, wd) => {
        c.lineCap = 'round'; c.lineJoin = 'round';
        c.strokeStyle = '#e8d6a8'; c.lineWidth = wd * S; c.beginPath(); pts.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); c.stroke();
        for (let i = 0; i < pts.length - 1; i++) {
          const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], n = Math.hypot(x1 - x0, z1 - z0) * 260;
          for (let k = 0; k < n; k++) { const t = r(), ox2 = (r() - 0.5) * wd * 0.92, nx = -(z1 - z0), nz = x1 - x0, l = Math.hypot(nx, nz); c.fillStyle = r() < 0.5 ? 'rgba(150,120,70,0.35)' : 'rgba(255,250,230,0.5)'; c.fillRect(X(x0 + (x1 - x0) * t + nx / l * ox2), Z(z0 + (z1 - z0) * t + nz / l * ox2), 2 + r() * 3, 2 + r() * 2); }
        }
        c.strokeStyle = 'rgba(43,33,48,0.5)'; c.lineWidth = 2.4;
        for (const sd of [-1, 1]) { c.beginPath(); offset(pts, sd * wd / 2).forEach(([x, z], i) => { const px = X(x) + (r() - 0.5) * 2, pz = Z(z) + (r() - 0.5) * 2; i ? c.lineTo(px, pz) : c.moveTo(px, pz); }); c.stroke(); }
      };
      path(FULL, 2.8);
      // the start plaza: a round of gravel with a printed compass rose
      c.fillStyle = '#e8d6a8'; c.beginPath(); c.arc(X(PLAZA.x), Z(PLAZA.z), 3.3 * S, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(43,33,48,0.55)'; c.lineWidth = 2.4; c.beginPath(); c.arc(X(PLAZA.x), Z(PLAZA.z), 3.3 * S, 0, Math.PI * 2); c.stroke();
      c.save(); c.translate(X(PLAZA.x), Z(PLAZA.z)); c.strokeStyle = 'rgba(160,110,60,0.5)'; c.fillStyle = 'rgba(200,150,80,0.35)';
      for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(0, 0); c.lineTo(S * 0.3, -S * (i % 2 ? 0.9 : 1.6)); c.lineTo(-S * 0.3, -S * (i % 2 ? 0.9 : 1.6)); c.closePath(); c.fill(); c.stroke(); }
      c.restore();
      // round gravel courts: under the fountain and round the sundial, with stepping stones out to them
      for (const [q, rad] of [[FOUNTAIN, 3.1], [SUNDIAL, 2.6]]) {
        c.fillStyle = '#eadcb4'; c.beginPath(); c.arc(X(q.x), Z(q.z), rad * S, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(43,33,48,0.45)'; c.lineWidth = 2; c.stroke();
      }
      const stones = (a, b, n) => { for (let k = 1; k < n; k++) { const t = k / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; c.fillStyle = '#d8ccb4'; c.beginPath(); c.ellipse(X(x), Z(z), S * 0.42, S * 0.3, r(), 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(43,33,48,0.45)'; c.lineWidth = 2; c.stroke(); } };
      stones([-6 - HALF, 9.2], [FOUNTAIN.x + 3, FOUNTAIN.z], 5);
      // the pond (right page) with lily pads
      if (!left) {
        const px = X(POND.x0), pz = Z(POND.z0), pw = (POND.x1 - POND.x0) * S, pd = (POND.z1 - POND.z0) * S;
        c.fillStyle = '#7fb6c8'; c.beginPath(); c.ellipse(px + pw / 2, pz + pd / 2, pw / 2, pd / 2, 0, 0, Math.PI * 2); c.fill();
        for (let i = 0; i < 30; i++) POPUP.wash(c, px + r() * pw, pz + r() * pd, S * (0.5 + r()), r() < 0.5 ? '#5f9cb4' : '#a6d0dc', 0.3, r, { noEdge: true });
        c.save(); c.beginPath(); c.ellipse(px + pw / 2, pz + pd / 2, pw / 2, pd / 2, 0, 0, Math.PI * 2); c.clip();
        c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2; for (let i = 0; i < 26; i++) { const x = px + r() * pw, y = pz + r() * pd; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 20 + r() * 30, y); c.stroke(); }
        for (let i = 0; i < 14; i++) { const x = px + pw * (0.1 + r() * 0.8), y = pz + pd * (0.15 + r() * 0.7), rr = S * (0.3 + r() * 0.25); c.fillStyle = r() < 0.5 ? '#5d9a4d' : '#73ad5c'; c.beginPath(); c.moveTo(x, y); c.arc(x, y, rr, 0.3, Math.PI * 2 - 0.1); c.closePath(); c.fill(); c.strokeStyle = 'rgba(43,33,48,0.5)'; c.stroke(); if (r() < 0.4) { c.fillStyle = '#f6c8d4'; c.beginPath(); c.arc(x + rr * 0.3, y - rr * 0.2, rr * 0.35, 0, Math.PI * 2); c.fill(); } }
        c.restore();
        c.strokeStyle = 'rgba(43,33,48,0.6)'; c.lineWidth = 3; c.beginPath(); c.ellipse(px + pw / 2, pz + pd / 2, pw / 2, pd / 2, 0, 0, Math.PI * 2); c.stroke();
        // reeds round the rim
        for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, x = px + pw / 2 + Math.cos(a) * pw / 2, y = pz + pd / 2 + Math.sin(a) * pd / 2; c.strokeStyle = 'rgba(70,110,50,0.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 8, y - 14 - r() * 10); c.stroke(); }
      }
      // printed flower clusters and little ink tufts of grass across the lawns
      for (let i = 0; i < 1600; i++) {
        const x = r() * w, y = r() * h;
        c.strokeStyle = 'rgba(60,100,50,0.45)'; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x - 2, y - 7); c.moveTo(x, y); c.lineTo(x + 1, y - 9); c.moveTo(x + 4, y); c.lineTo(x + 5, y - 6); c.stroke();
      }
      for (let i = 0; i < 260; i++) {
        const x = r() * w, y = r() * h, col = ['#e0607a', '#f2c14e', '#ffffff', '#f08aa4', '#a98ad8'][Math.floor(r() * 5)];
        if (routeDist(x / S + ox, y / S - PD2 / 2) < 1.6) continue;
        for (let j = 0; j < 3; j++) { const fx = x + (r() - 0.5) * 18, fy = y + (r() - 0.5) * 12; c.fillStyle = col; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(fx + Math.cos(k * 1.26) * 3.5, fy + Math.sin(k * 1.26) * 3.5, 2.8, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#e8b33a'; c.beginPath(); c.arc(fx, fy, 1.8, 0, Math.PI * 2); c.fill(); }
      }
      // the page title, printed in the top margin
      if (left) { c.fillStyle = 'rgba(59,48,64,0.62)'; c.font = 'italic ' + Math.round(S * 0.85) + 'px Georgia, "DejaVu Serif", serif'; c.textAlign = 'left'; c.fillText('Chapter One: The Hedge Garden', X(-31.6), Z(-18.6)); }
      else { c.fillStyle = 'rgba(59,48,64,0.5)'; c.font = 'italic ' + Math.round(S * 0.55) + 'px Georgia, "DejaVu Serif", serif'; c.textAlign = 'right'; c.fillText('...and the gate was locked, of course.', X(31.5), Z(-18.8)); }
    };
  }

  proof.build = function () {
    const K = K3D.scene({ bg: '#2e2228', fov: 24, far: 600 });
    K.maxBlur = 8;
    const texL = POPUP.pageTex('hedgeL', PW2, PD2, paintPage(true), { num: '1', numAt: [2.4, PD2 - 0.9], gutter: 'right', textBlocks: [[14.4, 37.4, 16, 3.2, 3]] });
    const texR = POPUP.pageTex('hedgeR', PW2, PD2, paintPage(false), { num: '2', numAt: [PW2 - 2.4, PD2 - 0.9], gutter: 'left', textBlocks: [[2.4, 37.2, 12, 3.2, 20]] });
    const scen = K.add(new T.Group()); // still scenery, batched below
    const book = POPUP.book({ pw: PW2, pd: PD2, tex: [texL, texR] }); scen.add(book);
    const room = POPUP.room({ cup: [-52, 10], lamp: [62, -50], window: [-24, 0], books: [-62, -36], ink: [48, -34] }); scen.add(room); K.tick(t => room.userData.tick(G.clock));
    scen.add(POPUP.desk({ route: { lines: ROUTE, bounds: [-34, -21, 34, 21], start: [PLAZA.x, PLAZA.z], end: [GATE.x, GATE.z] },
      at: { pencils: [26, 33, -0.3, 2], eraser: [-40, 31, 0.4, 1.6], ruler: [-10, 31, 0.04], scissors: [52, 2, 2.3, 1.8], clips: [44, 14, 0, 2], ball1: [-50, -14], ball2: [58, -20],
        glasses: [-47, 22, 0.5, 2.2], pot: [-46, -30, 0, 1.5], fern: [66, -34, 0, 1.3], sketch: [54, 26, -0.22, 1.5] } }));
    // the sun comes from the lamp
    K.sunDir.set(0.62, 1, -0.5).normalize();
    // the hedge route (posts with topiary balls at every corner, some runs in flower)
    let seed = 2;
    for (const part of ROUTE) for (const run of hedgeRuns(part)) scen.add(POPUP.hedge(run.pts, { h: run.h, seed: seed++ }));
    // round the plaza: a low clipped hedge ring, open to the north where the path leaves
    const gap = Math.asin((HALF + 0.31) / PLAZA.r) + 0.02, ring = [];
    for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + gap + i / 16 * (Math.PI * 2 - gap * 2); ring.push([PLAZA.x + Math.cos(a) * PLAZA.r, PLAZA.z + Math.sin(a) * PLAZA.r]); }
    scen.add(POPUP.hedge(ring.slice(0, 9), { h: 0.45, t: 0.4, seed: 40, posts: false }));
    scen.add(POPUP.hedge(ring.slice(8), { h: 0.45, t: 0.4, seed: 41, posts: false }));
    // set pieces: the fountain court, the sundial and its bench, a bench by the plaza, the pond's fence, the peacock
    const ftn = POPUP.fountain(FOUNTAIN.x, FOUNTAIN.z, 1.15); scen.add(ftn); K.tick(() => ftn.userData.tick(G.clock));
    scen.add(POPUP.sundial(SUNDIAL.x, SUNDIAL.z, 1.1));
    scen.add(POPUP.bench(SUNDIAL.x, SUNDIAL.z + 3.6, Math.PI));
    scen.add(POPUP.bench(-21.6, 15.4, -Math.PI / 2));
    scen.add(POPUP.fence([[POND.x0 - 0.4, 13.4], [POND.x1 + 0.2, 13.4], [POND.x1 + 0.2, 20.2]]));
    scen.add(POPUP.peacock(-31.8, 8.6, 0.7, 1.15));
    scen.add(POPUP.bookmark(PLAZA.x, PLAZA.z + 3.9, 0));
    scen.add(POPUP.gate(GATE.x, GATE.z, Math.PI / 2, 2.8));
    // the dotted lines: a bridge over the gutter (half drawn) and the arch that unlocks the gate
    const dl = POPUP.dotted([[-1.7, 8], [-0.8, 8.25], [0, 8.3], [0.8, 8.25], [1.7, 8]]); dl.userData.set(6); dl.userData.live = true; scen.add(dl);
    const arch = POPUP.dotted([[25.9, -16.4], [25.2, -15.7], [25, -15], [25.2, -14.3], [25.9, -13.6]]); arch.userData.live = true; scen.add(arch);
    // the lawns: trees, roses, tulip beds, toadstools and bunnies, scattered where they keep clear of the path (and a
    // tree never stands just in front of it, where it would hide the path from the camera)
    const r = POPUP.rng(77), placed = [[PLAZA.x, PLAZA.z, PLAZA.r + 1], [FOUNTAIN.x, FOUNTAIN.z, 3.6], [SUNDIAL.x, SUNDIAL.z + 1.5, 4], [-21.6, 15.4, 1.6], [-31.8, 8.6, 1.4], [GATE.x, GATE.z, 2.6]];
    const free = (x, z, rad, pad) => {
      if (Math.abs(x) < 1.8 + rad || Math.abs(x) > PW2 - 1.3 - rad || Math.abs(z) > PD2 / 2 - 1.3 - rad) return false;
      if (routeDist(x, z) < HALF + 0.35 + pad + rad) return false;
      if (x > POND.x0 - 0.6 && x < POND.x1 + 0.6 && z > 13 && z < POND.z1 + 0.6) return false;
      if ((z > 15.8 && x > -20.5 && x < -3.6) || (z > 15.8 && x > 1.8 && x < 14.8)) return false; // the printed text
      return placed.every(([px, pz, pr]) => Math.hypot(x - px, z - pz) > pr + rad);
    };
    const scatter = (n, rad, pad, make, front) => {
      for (let k = 0, tries = 0; k < n && tries < 4000; tries++) {
        const x = (r() * 2 - 1) * PW2, z = (r() - 0.5) * PD2;
        if (!free(x, z, rad, pad) || (front && routeDist(x, z - 2.4) < 2.6)) continue;
        placed.push([x, z, rad]); scen.add(make(x, z)); k++;
      }
    };
    scatter(22, 0.9, 1.0, (x, z) => POPUP.tree(x, z, 0.9 + r() * 0.45, Math.round(x * 3 + z)), true);
    const rc = ['#e0507a', '#f2c14e', '#f08aa4', '#ffffff', '#d8486a'];
    scatter(18, 0.6, 0.15, (x, z) => POPUP.roseBush(x, z, (r() - 0.5) * 0.8, 0.75 + r() * 0.25, rc[Math.floor(r() * rc.length)], Math.round(x * 7 + z)));
    scatter(9, 1.3, 0.2, (x, z) => POPUP.tulips(x, z, 1.0 + r() * 0.4, 0.6 + r() * 0.2, Math.round(x * 5 - z)));
    scatter(8, 0.5, 0.1, (x, z) => POPUP.mushrooms(x, z, Math.round(x * 11 + z)));
    scatter(3, 0.5, 0.3, (x, z) => POPUP.bunny(x, z, (r() - 0.5) * 1.2, 1 + r() * 0.3));
    for (const [x, z, rt] of [[-34.1, -8, Math.PI], [34.1, 6, 0]]) scen.add(POPUP.pullTab(x, z, rt, 'Pull'));
    // paper butterflies on springs (they flap, so they stay out of the batching)
    const flies = [];
    scatter(5, 0.3, 0.2, (x, z) => { const b = POPUP.butterfly(x, z, ['#f2c14e', '#7fb6e0', '#f08aa4', '#ffffff', '#f08a3c'][flies.length % 5], flies.length + 3); flies.push(b); return b; });
    K.tick(() => flies.forEach(b => b.userData.tick(G.clock)));
    proof.baked = K3D.bake(scen);
    // the pencil and the heroes
    const pencil = POPUP.pencil(); K.add(pencil);
    const pBlob = K3D.blob(null, 0.5); pBlob.scale.set(5.4, 1, 0.9); pBlob.userData.r = 0; K.add(pBlob);
    const heroes = [0, 1].map(id => { const h = K3D.hero(id); K.add(h); K3D.seeThrough(h, PCOL[id]); return h; });
    K3D.seeThrough(pencil, '#f6c21c');
    const blobs = [0, 1].map(id => { const b = K3D.blob(PCOL[id]); K.add(b); return b; });
    proof.st = { K, pencil, pBlob, heroes, blobs, dl,
      pos: [{ x: PLAZA.x - 2.9, z: PLAZA.z + 0.3 }, { x: PLAZA.x + 2.9, z: PLAZA.z - 0.3 }], head: [0.9, -0.5], dress: true, speed: [0, 0] };
    heroes.forEach(h => K3D.dress(h, 'popbook'));
    proof.rigs = {
      follow: K3D.cams.follow({ pitch: 50, heading: 0, fov: 24, min: 13, max: 24 }),
      diorama: K3D.cams.diorama({ pos: [-40, 9, 31], at: [-26, 0, 12], fov: 26 }),
      rail: K3D.cams.rail({ path: [{ pos: [-40, 10, 30], at: [-27, 0.5, 14] }, { pos: [-36, 13, 20], at: [-25, 0.5, 5] }, { pos: [-24, 14, 16], at: [-18, 0.5, -3] }, { pos: [-8, 15, 14], at: [-9, 0.5, -6] }] }),
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
    const a = s.pos[0], b = s.pos[1], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1, want = 6.35, fix = s.noPencil ? 0 : (L - want) / 2;
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
    K3D.heading = proof.rig.viewHeading || 0; // (the proof page has no game rules: up walks the way the picture looks)
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
    if (o.compare != null) { proof.compare = o.compare; s.noPencil = o.compare; if (o.compare) { s.pos = [{ x: PLAZA.x - 0.6, z: PLAZA.z }, { x: PLAZA.x + 0.6, z: PLAZA.z }]; s.head = [0, 0]; } }
    if (o.preset) {
      // fixed views for reviews: a diorama rig aimed from a preset spot round the middle of the action
      const s2 = proof.st, mx = (s2.pos[0].x + s2.pos[1].x) / 2, mz = (s2.pos[0].z + s2.pos[1].z) / 2;
      const P = { top: [[mx, 28, mz + 0.01], [mx, 0, mz]], front: [[mx, 6, mz + 16], [mx, 0.5, mz]], left: [[mx - 16, 6, mz], [mx, 0.5, mz]], right: [[mx + 16, 6, mz], [mx, 0.5, mz]],
        pip: [[s2.pos[0].x + 1.2, 1.3, s2.pos[0].z + 3.2], [s2.pos[0].x, 0.55, s2.pos[0].z]], bo: [[s2.pos[1].x - 0.6, 1.3, s2.pos[1].z + 3.3], [s2.pos[1].x, 0.55, s2.pos[1].z]],
        pair: [[mx, 1.4, mz + 7.5], [mx, 0.5, mz]], compare: [[mx + 1.3, 1.4, mz + 7], [mx + 1.3, 0.45, mz]], wide: [[mx + 4, 24, mz + 30], [mx + 14, 0, mz - 9]],
        book: [[0, 64, 60], [0, 0, -2.5]], room: [[-74, 70, 100], [6, -2, -12]] }[o.preset];
      if (P) {
        proof.rig = K3D.cams.diorama({ pos: P[0], at: P[1], fov: o.fov || (o.preset === 'pip' || o.preset === 'bo' ? 30 : o.preset === 'book' ? 30 : 26) });
        proof.rig.shadowReach = { wide: 30, book: 44, room: 60 }[o.preset] || 16;
      }
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
