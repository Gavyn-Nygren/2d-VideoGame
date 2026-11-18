/* Pip & Bo - 42-4 Go-Kart Grand Prix: the circuit as a place. Starlight Park at midnight (the shared park kit, PARK),
   the road itself (patched tarmac, painted edges, kerbs on the bends, the start line and grid, boost pads), the walls
   (tyre stacks, hay bales on the Midway, the pier's railings), and each part's own set dressing:
     0 The Kart Track   the gantry with its lights, the grandstand of plush toys, the pit garages, hoardings,
                        floodlights, the old kart fence with the broken gap
     1 The Midway       stalls both sides, strings of bulbs and lanterns across, the ring-toss stall over the shortcut
     2 Under the Comet  the coaster's trestle legs and its rails overhead
     3 The Funhouse     the laughing moon's face over the way in
     4 The Pier         a ramp up onto the boards, railings of bulbs, the ferris wheel and the helter-skelter
     5 Spook Manor Lane headstones, bare trees, the manor on its hill, green lamps
   and the rides and gardens of the park round it (a fill walks the circuit and sets down a bit of park wherever the
   ground is still empty: Gavyn's rule, never barren). Loaded on demand with the 3D kit. Display only.

   PARKKARTS_WORLD.build(K) -> w   once per scene: { B (bulbs), Y(s) (the road's height), gantry, crowd, ... }
   PARKKARTS_WORLD.Y(s)            the road's height at s (the pier is up on its boards; the rules are flat) */
'use strict';

const PARKKARTS_WORLD = (function () {
  const T = K3D.T, INK = '#1a1530', TR = PARKKARTS_TRACK;
  let rnd = PARK.rnd;
  const mesh = (g, m, o) => K3D.mesh(g, m, o);
  const toonM = (c, o) => PARK.toonM(c, o);
  const SEA = { z: -236 }, PIER = { x: 131, z0: -236, z1: -334, w: 58, y: 3.12 };
  const W = {};

  /* ---------- the road's height (the pier, and the ramps up to it) ---------- */
  const N = TR.tab.length, yRow = new Float32Array(N);
  (function () {
    const on = TR.tab.map(r => r.z < PIER.z0 + 0.5 && r.x > PIER.x - PIER.w / 2 - 6 && r.x < PIER.x + PIER.w / 2 + 6);
    const RAMP = 16, steps = Math.round(RAMP / TR.STEP);
    for (let i = 0; i < N; i++) {
      if (on[i]) { yRow[i] = PIER.y; continue; }
      let best = 0;
      for (let d = 1; d <= steps; d++) if (on[(i + d) % N] || on[(i - d + N) % N]) { best = 1 - d / steps; break; }
      const u = best; yRow[i] = PIER.y * u * u * (3 - 2 * u);
    }
    // the ramp under the Comet (a jump over the flume's channel) and the funhouse (up the black-light floor to the
    // top floor, the mirror hall, then the slide down onto the pier)
    const sm = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
    const RP = TR.ramp, g2 = RP.gap / 2, F0 = TR.partS[3];
    let pier0 = F0; while (!on[Math.round(pier0 / TR.st) % N]) pier0 += TR.st;
    const FH = W.FUN = { s0: F0, mouth: F0 + 3, barrel0: F0 + 8, barrel1: F0 + 30, up0: F0 + 34, up1: F0 + 60, mirror0: F0 + 62, mirror1: F0 + 84, door: F0 + 86, slide0: F0 + 87, slide1: pier0, h: 6.4 };
    W.RAMP = Object.assign({ s0: RP.s - g2 - RP.up, lip: RP.s - g2, land: RP.s + g2, s1: RP.s + g2 + RP.down }, RP);
    for (let i = 0; i < N; i++) {
      const s = i * TR.st;
      let d = s - RP.s; d -= Math.round(d / TR.L) * TR.L;
      let y = 0;
      if (d > -g2 - RP.up && d <= -g2) { const u = (d + g2 + RP.up) / RP.up; y = RP.h * (0.6 * u + 0.4 * u * u); }
      else if (d > -g2 && d < g2) { const u = (d + g2) / RP.gap; y = RP.h + 4 * u * (1 - u) * 1.1 - 0.5 * u; }
      else if (d >= g2 && d < g2 + RP.down) y = (RP.h - 0.5) * (1 - sm((d - g2) / RP.down));
      if (s > FH.up0 && s <= FH.slide1) y = Math.max(y, s < FH.up1 ? FH.h * sm((s - FH.up0) / (FH.up1 - FH.up0)) : s < FH.slide0 ? FH.h : FH.h + (PIER.y - FH.h) * ((s - FH.slide0) / (FH.slide1 - FH.slide0)) ** 0.85);
      yRow[i] = Math.max(yRow[i], y);
    }
  })();
  // a branch's height (all at ground level)
  W.YB = () => 0;
  // the height under a kart (on a branch or the main road)
  W.Yk = k => (k.on >= 0 ? 0 : W.Y(k.s));
  W.Y = function (s) {
    s = TR.wrap(s); const f = s / TR.STEP, i = Math.floor(f) % N, u = f - Math.floor(f);
    return yRow[i] + (yRow[(i + 1) % N] - yRow[i]) * u;
  };
  W.SEA = SEA; W.PIER = PIER;

  /* ---------- textures ---------- */
  const tarmacTex = () => K3D.paint('pkw-tarmac', 512, 1024, (c, w, h) => {
    c.fillStyle = '#45455c'; c.fillRect(0, 0, w, h);
    // the stone in it, patches of newer and older tarmac, the rubbered racing line, cracks, oil
    for (let i = 0; i < 9000; i++) { const g = 50 + Math.random() * 60; c.fillStyle = `rgba(${g},${g},${g + 18},${0.25 + Math.random() * 0.3})`; c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    for (let i = 0; i < 7; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(20,20,34,0.32)' : 'rgba(120,120,150,0.12)'; const x = 40 + Math.random() * (w - 160), y = Math.random() * h; c.fillRect(x, y, 50 + Math.random() * 110, 40 + Math.random() * 120); }
    const band = c.createLinearGradient(0, 0, w, 0); band.addColorStop(0.25, 'rgba(10,10,20,0)'); band.addColorStop(0.45, 'rgba(10,10,20,0.22)'); band.addColorStop(0.62, 'rgba(10,10,20,0.18)'); band.addColorStop(0.8, 'rgba(10,10,20,0)');
    c.fillStyle = band; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(16,14,26,0.7)'; c.lineWidth = 1.6;
    for (let i = 0; i < 14; i++) { let x = Math.random() * w, y = Math.random() * h; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (Math.random() - 0.5) * 30; y += 6 + Math.random() * 16; c.lineTo(x, y); } c.stroke(); }
    for (let i = 0; i < 5; i++) { const x = 60 + Math.random() * (w - 120), y = Math.random() * h, r = 8 + Math.random() * 18; const g = c.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, 'rgba(10,8,20,0.5)'); g.addColorStop(1, 'rgba(10,8,20,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r * 1.4, r, 0, 0, Math.PI * 2); c.fill(); }
    // the painted edges (white, a little worn)
    for (const x of [10, w - 26]) { c.fillStyle = '#e8e4f0'; c.fillRect(x, 0, 16, h); c.fillStyle = 'rgba(69,69,92,0.6)'; for (let i = 0; i < 40; i++) c.fillRect(x + Math.random() * 16, Math.random() * h, 2 + Math.random() * 5, 2 + Math.random() * 8); }
  }, { repeat: true });
  const kerbTex = () => K3D.paint('pkw-kerb', 64, 256, (c, w, h) => {
    for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#f4f0e8' : '#e0403a'; c.fillRect(0, i * h / 4, w, h / 4); }
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, 0, 6, h); c.fillRect(w - 6, 0, 6, h);
  }, { repeat: true });
  const tyreTex = () => K3D.paint('pkw-tyre', 256, 192, (c, w, h) => {
    // three tyres stacked (the instance colour tints them: black, red, white, yellow), tread and the gaps between
    for (let k = 0; k < 3; k++) {
      const y0 = k * h / 3;
      c.fillStyle = '#d8d8e0'; c.fillRect(0, y0, w, h / 3);
      c.fillStyle = '#a8a8b8'; for (let x = 0; x < w; x += 10) { c.fillRect(x, y0 + 12, 5, h / 3 - 24); }
      c.fillStyle = '#bcbccc'; c.fillRect(0, y0 + 6, w, 4); c.fillRect(0, y0 + h / 3 - 10, w, 4);
      c.fillStyle = '#26222e'; c.fillRect(0, y0, w, 3); c.fillRect(0, y0 + h / 3 - 3, w, 3);
    }
    for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(40,30,30,0.18)'; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 0, 7); c.fill(); }
  });
  const strawTex = () => K3D.paint('pkw-straw', 128, 128, (c, w, h) => {
    c.fillStyle = '#d8b25a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { c.strokeStyle = Math.random() < 0.5 ? 'rgba(150,110,40,0.6)' : 'rgba(250,220,140,0.6)'; c.lineWidth = 1; const x = Math.random() * w, y = Math.random() * h, a = (Math.random() - 0.5) * 0.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); c.stroke(); }
    c.fillStyle = '#8a3a2a'; c.fillRect(0, h * 0.28, w, 5); c.fillRect(0, h * 0.68, w, 5);
  });
  const chequer = (n = 8, m = 2) => K3D.paint('pkw-cheq|' + n + 'x' + m, 256, 64, (c, w, h) => { for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { c.fillStyle = (i + j) % 2 ? '#1a1626' : '#f4f0e8'; c.fillRect(i * w / n, j * h / m, w / n + 1, h / m + 1); } });
  const boardTex = (txt, a, b, sub) => K3D.paint('pkw-board|' + txt, 512, 160, (c, w, h) => {
    c.fillStyle = a; c.fillRect(0, 0, w, h); c.fillStyle = b; c.fillRect(0, h - 26, w, 26); c.fillRect(0, 0, w, 10);
    c.font = '900 64px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = b; c.fillText(txt, w / 2 + 3, h / 2 - 5 + 3); c.fillStyle = '#fbf7ec'; c.fillText(txt, w / 2, h / 2 - 5);
    if (sub) { c.font = '700 18px "DejaVu Sans", sans-serif'; c.fillStyle = a; c.fillText(sub, w / 2, h - 13); }
    for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(30,20,30,0.15)'; c.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 20, 1 + Math.random() * 3); }
  });

  /* ---------- ribbons along the road ---------- */
  // a strip from lat a to lat b (functions of the row, or numbers) along the main road (or a branch's road R) from s0 to s1
  function strip(K, mat, R, s0, s1, a, b, o = {}) {
    const st = o.step || 1, n = Math.max(1, Math.ceil((s1 - s0) / st)), pos = [], uv = [], idx = [];
    const at = R ? R.at : TR.at, Yf = R ? (() => 0) : W.Y;
    for (let i = 0; i <= n; i++) {
      const s = s0 + (s1 - s0) * i / n, f = at(s), la = typeof a === 'function' ? a(f) : a, lb = typeof b === 'function' ? b(f) : b, y = Yf(s) + (o.y || 0.03);
      pos.push(f.x + f.rx * la, y + (o.ya || 0), f.z + f.rz * la, f.x + f.rx * lb, y + (o.yb || 0), f.z + f.rz * lb);
      const v = (o.v0 || 0) + (s - s0) / (o.vLen || 12);
      uv.push(0, v, 1, v);
      if (i) { const j = i * 2; idx.push(j - 2, j, j - 1, j - 1, j, j + 1); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new T.Mesh(g, mat); m.receiveShadow = true; m.castShadow = false;
    if (o.offset) { m.material.polygonOffset = true; m.material.polygonOffsetFactor = -o.offset; m.material.polygonOffsetUnits = -o.offset; }
    K.add(m); return m;
  }
  // a flat painted thing lying on the road at (s, lat), along the road (w across, l along)
  function decal(K, tex, s, lat, w, l, o = {}) {
    const f = TR.at(s), y = W.Y(s) + (o.y || 0.05);
    const m = new T.Mesh(K3D.geo('pkw-decal', () => new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), K3D.flat(o.col || '#ffffff', { map: tex, transparent: true, depthWrite: false }));
    m.material.color.multiplyScalar(o.k || 0.85); m.material.polygonOffset = true; m.material.polygonOffsetFactor = -3; m.material.polygonOffsetUnits = -3;
    m.scale.set(w, 1, l); m.position.set(f.x + f.rx * lat, y, f.z + f.rz * lat); m.rotation.y = Math.atan2(f.tx, f.tz) + (o.rot || 0); m.renderOrder = 1;
    K.add(m); return m;
  }

  // is (x, z) at least r clear of every road's wall (the main road and the shortcut)?
  const hint = { s: 0 };
  function clear(x, z, r) {
    const n = TR.near(x, z, null), f = TR.at(n.s);
    if (Math.abs(n.lat) < f.hw + TR.VERGE + 0.6 + r) return false;
    for (const B of TR.branches) for (let bs = 0; bs <= B.len; bs += 2) { const g = B.at(bs); if (Math.hypot(g.x - x, g.z - z) < B.hw + 1 + r) return false; }
    return true;
  }
  W.clear = clear;
  // the set pieces placed so far (circles): nothing is set down on top of another
  const taken = [];
  const room = (x, z, r) => clear(x, z, r) && !taken.some(t => Math.hypot(t[0] - x, t[1] - z) < t[2] + r);
  const take = (x, z, r) => { taken.push([x, z, r]); return true; };

  /* ---------- the road ---------- */
  function road(K, B) {
    const tar = K3D.toon('#ffffff', { map: tarmacTex(), side: T.DoubleSide });
    // (the ramp's gap over the flume is open: nothing under the karts in the air)
    strip(K, tar, null, 0, W.RAMP.lip, f => -f.hw, f => f.hw, { vLen: 24 }); strip(K, tar, null, W.RAMP.land, TR.L, f => -f.hw, f => f.hw, { vLen: 24, v0: W.RAMP.land / 24 });
    for (const Br of TR.branches) strip(K, tar, Br, 0, Br.len, -Br.hw - 0.2, Br.hw + 0.2, { vLen: 24, y: 0.035 });
    // kerbs (red and white) on both sides of every real bend
    const km = K3D.toon('#ffffff', { map: kerbTex(), side: T.DoubleSide });
    let run = null;
    const flush = (e) => { if (run && e - run > 3) { strip(K, km, null, run - 1, e + 1, f => f.hw - 0.15, f => f.hw + 0.75, { vLen: 2, y: 0.05, offset: 1 }); strip(K, km, null, run - 1, e + 1, f => -f.hw - 0.75, f => -f.hw + 0.15, { vLen: 2, y: 0.05, offset: 1 }); } run = null; };
    for (let s = 0; s < TR.L; s += 1) { const tight = Math.abs(TR.at(s).turn) > 1 / 26 && TR.at(s).part !== 4 && !(s > W.RAMP.s0 - 3 && s < W.RAMP.s1 + 3) && !(s > W.FUN.s0 && s < W.FUN.slide1 + 2); if (tight && run == null) run = s; if (!tight) flush(s); }
    flush(TR.L);
    // the start line (chequered) and the grid boxes, the Midway's boost pads, chalk arrows before the hairpin
    const f0 = TR.at(0); decal(K, chequer(16, 2), 0, 0, f0.hw * 2, 1.2, { k: 0.9 });
    const box = K3D.paint('pkw-grid', 128, 128, (c, w, h) => { c.strokeStyle = '#f4f0e8'; c.lineWidth = 9; c.beginPath(); c.moveTo(6, h - 6); c.lineTo(6, 20); c.lineTo(w - 6, 20); c.lineTo(w - 6, h - 6); c.stroke(); });
    for (const lat of [-1.5, 1.5]) { decal(K, box, TR.GRID + 1.2, lat, 2.2, 2.6); decal(K, box, TR.GRID + 7, lat, 2.2, 2.6); }
    const num = n => K3D.paint('pkw-gridn|' + n, 64, 64, (c, w, h) => { c.font = '900 50px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#f4f0e8'; c.fillText(String(n), w / 2, h / 2); });
    decal(K, num(1), TR.GRID + 3.4, -1.5, 1.2, 1.2, { rot: Math.PI }); decal(K, num(2), TR.GRID + 3.4, 1.5, 1.2, 1.2, { rot: Math.PI });
    const padTex = K3D.paint('pkw-pad', 128, 256, (c, w, h) => {
      c.fillStyle = 'rgba(40,20,60,0.9)'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ffd24a'; c.lineWidth = 6; c.strokeRect(5, 5, w - 10, h - 10);
      c.fillStyle = '#ffe07a'; for (let i = 0; i < 3; i++) { const y = 200 - i * 70; c.beginPath(); c.moveTo(20, y); c.lineTo(w / 2, y - 50); c.lineTo(w - 20, y); c.lineTo(w - 20, y + 18); c.lineTo(w / 2, y - 30); c.lineTo(20, y + 18); c.closePath(); c.fill(); }
    });
    for (const pd of TR.pads) {
      const s = (pd.s0 + pd.s1) / 2;
      decal(K, padTex, s, pd.lat, pd.w * 1.6, pd.s1 - pd.s0, { rot: Math.PI, k: 1.6 });
      for (let k = 0; k <= 6; k++) for (const sx of [-1, 1]) { const q = TR.pos(pd.s0 + (pd.s1 - pd.s0) * k / 6, pd.lat + sx * pd.w * 0.85); B.add(q[0], W.Y(s) + 0.12, q[1], '#ffd24a', { size: 0.09, speed: 9, phase: -k * 0.9 }); }
    }
    const chalk = K3D.paint('pkw-chalk', 128, 128, (c, w, h) => { c.strokeStyle = 'rgba(244,240,232,0.75)'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.moveTo(30, 110); c.lineTo(64, 30); c.lineTo(98, 110); c.stroke(); });
    for (let i = 0; i < 4; i++) decal(K, chalk, 100 + i * 4, 0, 1.6, 1.6, { rot: Math.PI, k: 0.7 });
    // drains and puddles (they catch the moon and the bulbs)
    const puddle = K3D.paint('pkw-puddle', 128, 128, (c, w, h) => { const g = c.createRadialGradient(64, 64, 10, 64, 64, 60); g.addColorStop(0, 'rgba(120,130,200,0.55)'); g.addColorStop(0.7, 'rgba(80,90,170,0.3)'); g.addColorStop(1, 'rgba(60,60,120,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(64, 64, 60, 44, 0.3, 0, 7); c.fill(); });
    for (let s = 20; s < TR.L; s += 37 + rnd() * 30) if (TR.at(s).part !== 3 && Math.abs(W.Y(s + 3) - W.Y(s - 3)) < 0.02) decal(K, puddle, s, (rnd() - 0.5) * 5, 2 + rnd() * 2, 2.5 + rnd() * 3, { k: 1.1 });
  }

  /* ---------- the walls: tyre stacks, hay bales, the pier's railings ---------- */
  function walls(K, B) {
    const tyres = [], bales = [], rails = [];
    const add = (x, z, yaw, y, part) => { if (part === 1) bales.push([x, z, yaw, y]); else if (part === 4 && y > PIER.y - 0.2) rails.push([x, z, yaw, y]); else tyres.push([x, z, yaw, y]); };
    for (let s = 0; s < TR.L; s += 0.95) {
      const f = TR.at(s), w = f.hw + TR.VERGE + 0.5;
      for (const sx of [-1, 1]) {
        const x = f.x + f.rx * w * sx, z = f.z + f.rz * w * sx;
        let skip = false;
        for (const Br of TR.branches) for (let bs = 0; bs <= Br.len && !skip; bs += 0.5) { const g = Br.at(bs); if (Math.hypot(g.x - x, g.z - z) < Br.hw + 1.4) skip = true; }
        if (s > W.RAMP.s0 - 1 && s < W.RAMP.s1 + 1) skip = true;                    // the ramp has its own sides
        if (s > W.FUN.s0 + 1 && s < W.FUN.slide1 + 1) skip = true;                  // the funhouse's walls, the slide's
        if (TR.gaps.some(g => g.side === sx && s > g.s0 && s < g.s1)) skip = true;   // the pier's broken railing
        if (!skip) add(x, z, f.yaw, W.Y(s), f.part);
      }
    }
    for (const Br of TR.branches) for (let bs = 1.5; bs < Br.len - 1.5; bs += 0.95) {
      const g = Br.at(bs), w = Br.hw + 0.9;
      for (const sx of [-1, 1]) { const x = g.x + g.rx * w * sx, z = g.z + g.rz * w * sx, n = TR.near(x, z, null), f = TR.at(n.s); if (Math.abs(n.lat) > f.hw + TR.VERGE + 0.6) bales.push([x, z, g.yaw, 0]); }
    }
    W.wallPts = tyres.concat(bales, rails);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), v = new T.Vector3(), one = new T.Vector3(1, 1, 1), col = new T.Color();
    // tyre stacks: blocks of red, white, black (and now and then yellow)
    const tm = new T.InstancedMesh(K3D.geo('pkw-stack', () => new T.CylinderGeometry(0.46, 0.46, 0.9, 12).translate(0, 0.45, 0)), [K3D.toon('#ffffff', { map: tyreTex() }), K3D.toon('#2a2632'), K3D.toon('#2a2632')], tyres.length);
    const pal = ['#e0403a', '#f4f0e8', '#3a3644', '#3a3644', '#e0403a', '#f4f0e8', '#ffd24a', '#3a3644'];
    tyres.forEach((t, i) => { m4.compose(v.set(t[0], t[3], t[1]), q.setFromAxisAngle(up, t[2] + i), one); tm.setMatrixAt(i, m4); tm.setColorAt(i, col.set(pal[Math.floor(i / 6) % pal.length])); });
    K3D.ink(tm, INK, 0.6); K.add(tm);
    // hay bales on the Midway (two high now and then)
    const bm = new T.InstancedMesh(K3D.geo('pkw-bale', () => K3D.roundBox(1.15, 0.72, 0.78, 0.25, 12).translate(0, 0.36, 0)), K3D.toon('#ffffff', { map: strawTex() }), bales.length * 2);
    let nb = 0;
    bales.forEach((t, i) => { const sc = new T.Vector3(1, 1, 1); m4.compose(v.set(t[0], t[3], t[1]), q.setFromAxisAngle(up, t[2] + Math.PI / 2 + (rnd() - 0.5) * 0.15), sc); bm.setMatrixAt(nb++, m4); if (i % 5 === 2) { m4.compose(v.set(t[0], t[3] + 0.72, t[1]), q.setFromAxisAngle(up, t[2] + Math.PI / 2 + (rnd() - 0.5) * 0.4), sc); bm.setMatrixAt(nb++, m4); } });
    bm.count = nb; K3D.ink(bm, INK, 0.6); K.add(bm);
    // the pier's railing: white posts with a bulb on every other one, and a rail along the top
    if (rails.length) {
      const pm = new T.InstancedMesh(K3D.geo('pkw-post', () => new T.BoxGeometry(0.16, 1.1, 0.16).translate(0, 0.55, 0)), toonM('#f4ecd8'), rails.length);
      rails.forEach((t, i) => { m4.compose(v.set(t[0], t[3], t[1]), q.setFromAxisAngle(up, t[2]), one); pm.setMatrixAt(i, m4); if (i % 2 === 0) B.add(t[0], t[3] + 1.2, t[1], ['#ffe07a', '#ff8ab0', '#7ae8ff'][i % 3], { size: 0.1, speed: 3, phase: i * 0.3 }); });
      K3D.ink(pm, INK, 0.5); K.add(pm);
      const rm = new T.InstancedMesh(K3D.geo('pkw-rail', () => new T.BoxGeometry(0.12, 0.12, 1).translate(0, 1.05, 0)), toonM('#f4ecd8'), rails.length);
      let nr = 0;
      for (let i = 1; i < rails.length; i++) { const a = rails[i - 1], b = rails[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d > 1.6) continue; m4.compose(v.set((a[0] + b[0]) / 2, (a[3] + b[3]) / 2, (a[1] + b[1]) / 2), q.setFromAxisAngle(up, Math.atan2(b[0] - a[0], b[1] - a[1])), new T.Vector3(1, 1, d)); rm.setMatrixAt(nr++, m4); }
      rm.count = nr; K.add(rm);
    }
    // the ramps up to the pier: wooden sides down to the ground
    const wood = K3D.toon('#ffffff', { map: PARK.wood('#6a4a3a') });
    let r0 = null;
    for (let s = 0; s <= TR.L; s += 1) {
      const up2 = s < TR.L && W.Y(s) > 0.05 && W.Y(s) < PIER.y - 0.02;
      if (up2 && r0 == null) r0 = s;
      if (!up2 && r0 != null) {
        for (const sx of [-1, 1]) {
          const a = f => sx * (f.hw + TR.VERGE + 0.2);
          strip(K, wood, null, r0 - 1, s + 1, a, a, { y: 0.05, ya: 0, yb: 0, vLen: 4 });
          // the side: from the road edge down to the ground
          const pos = [], idx = [], uv = []; let k = 0;
          for (let u = r0 - 1; u <= s + 1; u += 1, k++) { const f = TR.at(u), la = sx * (f.hw + TR.VERGE + 0.2), x = f.x + f.rx * la, z = f.z + f.rz * la; pos.push(x, W.Y(u) + 0.05, z, x, -0.4, z); uv.push(u / 4, 1, u / 4, 0); if (k) { const j = k * 2; idx.push(j - 2, j - 1, j, j - 1, j + 1, j); } }
          const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
          const m = new T.Mesh(g, K3D.toon('#ffffff', { map: PARK.wood('#6a4a3a'), side: T.DoubleSide })); K.add(m);
        }
        // the road's underside fill under the ramp (a deck of boards)
        strip(K, wood, null, r0 - 1, s + 1, f => -f.hw - TR.VERGE - 0.2, f => f.hw + TR.VERGE + 0.2, { y: 0.0, vLen: 4 });
        r0 = null;
      }
    }
  }

  /* ---------- part 0: the kart track ---------- */
  function gantry(K, B) {
    const f = TR.at(TR.GANTRY), w = f.hw + TR.VERGE + 1.2, g = new T.Group();
    g.position.set(f.x, 0, f.z); g.rotation.y = Math.atan2(f.tx, f.tz); K.add(g);
    const steel = toonM('#3b3456'), red = toonM('#c83a4a');
    for (const sx of [-1, 1]) {
      const leg = mesh(new T.BoxGeometry(0.7, 7.4, 0.7), steel, { inkW: 0.8 }); leg.position.set(sx * w, 3.7, 0); g.add(leg);
      const foot = mesh(new T.BoxGeometry(1.3, 0.5, 1.3), red, { inkW: 0.7 }); foot.position.set(sx * w, 0.25, 0); g.add(foot);
      const brace = mesh(new T.BoxGeometry(0.2, 2.6, 0.2), steel, { inkW: 0.5 }); brace.position.set(sx * (w - 0.9), 6.4, 0); brace.rotation.z = sx * 0.6; g.add(brace);
    }
    const beam = mesh(new T.BoxGeometry(w * 2 + 1.2, 1.3, 0.9), K3D.toon('#ffffff', { map: chequer(24, 3) }), { inkW: 1 }); beam.position.y = 7.6; g.add(beam);
    for (const z of [-0.5, 0.5]) { const sg = PARK.neon(K, 'STARLIGHT GRAND PRIX', { w: w * 1.7, h: 1.5, col: '#ffcf4a', col2: '#ff5a9a', k: 2.6 }); sg.position.set(0, 9.2, z); if (z < 0) sg.rotation.y = Math.PI; g.add(sg); }
    // the start lights: a bar of five pairs hanging from the beam, both ways
    const lights = [];
    const bar = mesh(new T.BoxGeometry(4.6, 0.9, 0.6), toonM('#1a1626'), { inkW: 0.7 }); bar.position.set(0, 6.4, 0); g.add(bar);
    for (let i = 0; i < 5; i++) for (const z of [-0.32, 0.32]) {
      const m = new T.Mesh(K3D.geo('pkw-light', () => new T.CircleGeometry(0.28, 16)), K3D.flat('#401010')); m.position.set(-1.8 + i * 0.9, 6.4, z); if (z < 0) m.rotation.y = Math.PI; m.userData.live = true; g.add(m); lights.push({ m, i });
    }
    const flagT = new T.Mesh(new T.PlaneGeometry(w * 1.6, 0.9, 16, 1), K3D.toon('#ffffff', { map: chequer(20, 2), side: T.DoubleSide })); flagT.position.set(0, 6.6, 0.55); g.add(flagT);
    K.add(g); g.updateMatrixWorld(true);
    const w2 = (x, y, z) => { const q = new T.Vector3(x, y, z).applyMatrix4(g.matrixWorld); return [q.x, q.y, q.z]; };
    for (const z of [-0.48, 0.48]) B.line(w2(-w - 0.6, 8.3, z), w2(w + 0.6, 8.3, z), 0.45, ['#ffe07a', '#ffffff', '#ff8ab0'], { speed: 5, size: 0.1 });
    for (const sx of [-1, 1]) B.line(w2(sx * w, 0.6, 0.4), w2(sx * w, 7, 0.4), 0.5, ['#ffe07a', '#ffffff'], { speed: 4, step: -0.6, size: 0.09 });
    for (const sx of [-1, 1]) { const p = w2(sx * w * 0.8, 9, 0); PARK.halo(K, p[0], p[1], p[2], 8, '#ffcf4a', 0.25); }
    // a robot marshal on a box by the left leg with a chequered flag
    const mar = PARK.robot(K, { col: '#f4f0e8' }); mar.position.set(...w2(-w - 2.2, 0.8, 1.4)); mar.rotation.y = g.rotation.y + 0.6;
    const stand = mesh(new T.BoxGeometry(1.4, 0.8, 1.4), K3D.toon('#ffffff', { map: PARK.stripes('#e0403a', '#f4f0e8', 6) }), { inkW: 0.6 }); stand.position.set(...w2(-w - 2.2, 0.4, 1.4)); K.add(stand);
    mar.userData.broom.visible = false;
    const fl = new T.Group(); fl.position.set(0.5, 1.0, 0.2); mar.add(fl);
    const pole = mesh(new T.CylinderGeometry(0.03, 0.03, 1.4, 6).translate(0, 0.7, 0), toonM('#2a2438'), { inkW: 0.4 }); fl.add(pole);
    const cloth = new T.Mesh(new T.PlaneGeometry(0.9, 0.6, 8, 1).translate(0.45, 1.1, 0), K3D.toon('#ffffff', { map: chequer(6, 4), side: T.DoubleSide })); fl.add(cloth);
    return { g, lights, marshal: mar, flag: fl, cloth, clothBase: Float32Array.from(cloth.geometry.attributes.position.array), banner: flagT };
  }
  function grandstand(K, B) {
    // south of the start straight, facing it: four rising rows of benches under a striped roof, full of plush toys
    const f = TR.at(14), off = f.hw + TR.VERGE + 4.5, cx = f.x + f.rx * off, cz = f.z + f.rz * off;
    const g = new T.Group(); g.position.set(cx, 0, cz); g.rotation.y = Math.atan2(-f.rx, -f.rz); K.add(g);
    const len = 30, wood = K3D.toon('#ffffff', { map: PARK.wood('#7a4d30') }), steel = toonM('#3b3456');
    for (let r = 0; r < 4; r++) {
      const step = mesh(new T.BoxGeometry(len, 0.6 + r * 0.9, 1.6), toonM(['#5a4f86', '#4f4678', '#463e6c', '#3e3760'][r]), { inkW: 0.7 }); step.position.set(0, (0.6 + r * 0.9) / 2, -r * 1.6); g.add(step);
      const bench = mesh(new T.BoxGeometry(len, 0.18, 0.7), wood, { inkW: 0.5 }); bench.position.set(0, 0.6 + r * 0.9 + 0.5, -r * 1.6 + 0.2); g.add(bench);
    }
    for (const x of [-len / 2, -len / 6, len / 6, len / 2]) { const p = mesh(new T.CylinderGeometry(0.16, 0.18, 7.4, 8), steel, { inkW: 0.5 }); p.position.set(x, 3.7, -6); g.add(p); const p2 = mesh(new T.CylinderGeometry(0.12, 0.14, 5.8, 8), steel, { inkW: 0.5 }); p2.position.set(x, 2.9, 0.6); g.add(p2); }
    const roof = mesh(new T.BoxGeometry(len + 2, 0.3, 8.4), K3D.toon('#ffffff', { map: PARK.stripes('#c83a4a', '#f4e8d0', 16) }), { inkW: 0.9 }); roof.position.set(0, 6.5, -2.6); roof.rotation.x = -0.18; g.add(roof);
    const sg = PARK.neon(K, 'GRANDSTAND', { w: 9, h: 1.8, col: '#7affd4', col2: '#ff6ab0', k: 2.4 }); sg.position.set(0, 7.9, 1.0); g.add(sg);
    const rail = mesh(new T.BoxGeometry(len, 0.1, 0.1), toonM('#f4ecd8'), { inkW: 0.4 }); rail.position.set(0, 1.4, 0.75); g.add(rail);
    g.updateMatrixWorld(true);
    const w2 = (x, y, z) => { const q = new T.Vector3(x, y, z).applyMatrix4(g.matrixWorld); return [q.x, q.y, q.z]; };
    B.line(w2(-len / 2 - 1, 6.95, 1.4), w2(len / 2 + 1, 6.95, 1.4), 0.5, ['#ffe07a', '#ff8ab0', '#ffffff', '#7ae8ff'], { speed: 3, size: 0.12, sag: 0.25 });
    for (let x = -len / 2 + 2; x < len / 2; x += 5) { const p = w2(x, 5.8, -2); B.add(p[0], p[1], p[2], '#fff0c0', { size: 0.22 }); PARK.halo(K, p[0], p[1], p[2], 3, '#ffe0a0', 0.3); }
    PARK.glint(K, cx, cz, '#ffe0a0', 10, 6, 0.3);
    // the crowd: plush toys (bears, rabbits, cats, frogs) in many colours, turning to watch the karts go by
    const cols = ['#e8a05a', '#f4d0e0', '#9ad0f0', '#f2c14e', '#a8e08a', '#d8a0f0', '#f08a7a', '#f4f0e8', '#c8905a', '#7ad0c0'];
    const seats = [];
    for (let r = 0; r < 4; r++) for (let x = -len / 2 + 0.9; x < len / 2 - 0.5; x += 0.95 + rnd() * 0.5) if (rnd() < 0.86) seats.push({ p: w2(x, 0.6 + r * 0.9 + 0.6, -r * 1.6 + 0.2), c: cols[Math.floor(rnd() * cols.length)], k: Math.floor(rnd() * 4), s: 0.85 + rnd() * 0.35, ph: rnd() * 6 });
    const n = seats.length, mk = (key, geo, m) => { const im = new T.InstancedMesh(K3D.geo(key, geo), m, n); im.userData.live = true; im.frustumCulled = false; K3D.ink(im, INK, 0.5); K.add(im); return im; };
    const body = mk('pkw-plBody', () => new T.SphereGeometry(0.34, 12, 9).scale(1, 1.1, 0.9).translate(0, 0.32, 0), K3D.toon('#ffffff'));
    const head = mk('pkw-plHead', () => { const h = new T.SphereGeometry(0.3, 12, 9).translate(0, 0.92, 0); return h; }, K3D.toon('#ffffff'));
    const ears = mk('pkw-plEars', () => { const a = new T.SphereGeometry(0.11, 8, 6).translate(-0.19, 1.18, 0), b = new T.SphereGeometry(0.11, 8, 6).translate(0.19, 1.18, 0); const m = new T.BufferGeometry(); const pa = [...a.toNonIndexed().attributes.position.array, ...b.toNonIndexed().attributes.position.array]; m.setAttribute('position', new T.Float32BufferAttribute(pa, 3)); m.computeVertexNormals(); return m; }, K3D.toon('#ffffff'));
    const snout = mk('pkw-plSnout', () => new T.SphereGeometry(0.12, 8, 6).scale(1, 0.8, 0.7).translate(0, 0.86, 0.26), K3D.toon('#f4ecd8'));
    const col = new T.Color();
    seats.forEach((s, i) => { col.set(s.c); body.setColorAt(i, col); head.setColorAt(i, col); ears.setColorAt(i, col.clone().multiplyScalar(0.85)); });
    for (const im of [body, head, ears]) im.instanceColor.needsUpdate = true;
    return { g, seats, parts: [body, head, ears, snout], yaw0: g.rotation.y };
  }
  function pits(K, B) {
    // the pit garages in the infield, facing the start straight: open doors with work lights, robots at work,
    // tyres and drums, spanners on the wall, a striped pit wall
    const g = new T.Group(); g.position.set(26, 0, -24); g.rotation.y = Math.atan2(0.1, 1); K.add(g);
    const brick = K3D.toon('#ffffff', { map: PARK.stripes('#4a4566', '#544e72', 8, { v: true }) });
    for (let i = 0; i < 5; i++) {
      const x = -16 + i * 8;
      const back = mesh(new T.BoxGeometry(7.6, 4.2, 0.4), brick, { inkW: 0.8 }); back.position.set(x, 2.1, -3); g.add(back);
      const sd = mesh(new T.BoxGeometry(0.4, 4.2, 6), brick, { inkW: 0.8 }); sd.position.set(x - 3.8, 2.1, 0); g.add(sd);
      const roof = mesh(new T.BoxGeometry(8.2, 0.4, 6.8), toonM(['#c83a4a', '#3f8f6a', '#e9b23c', '#2f7fa8', '#c4386e'][i]), { inkW: 0.8 }); roof.position.set(x, 4.4, 0.2); g.add(roof);
      const inner = new T.Mesh(new T.PlaneGeometry(7, 3.6), PARK.flatM('#ffd89a', 0.55)); inner.position.set(x, 1.9, -2.75); g.add(inner);
      const shut = mesh(new T.BoxGeometry(7.4, 0.9, 0.2), K3D.toon('#ffffff', { map: PARK.stripes('#d8d0e8', '#a8a0c0', 10) }), { inkW: 0.5 }); shut.position.set(x, 3.75, 2.9); g.add(shut);
      const no = PARK.neon(K, 'PIT ' + (i + 1), { w: 2.6, h: 0.8, col: '#7ae8ff', k: 2 }); no.position.set(x, 4.9, 3.6); g.add(no);
      // tyres stacked inside, a drum, a toolbox, a spare kart chassis on stands
      for (let k = 0; k < 3; k++) { const t = mesh(K3D.geo('pkw-tyre1', () => new T.TorusGeometry(0.32, 0.16, 8, 16).rotateX(Math.PI / 2)), toonM('#26222e'), { inkW: 0.5 }); t.position.set(x + 2.6, 0.16 + k * 0.32, -1.8); g.add(t); }
      const drum = mesh(K3D.geo('pkw-drum', () => new T.CylinderGeometry(0.4, 0.4, 1.1, 14)), toonM(['#3f8f6a', '#e0403a', '#2f7fa8'][i % 3]), { inkW: 0.6 }); drum.position.set(x - 2.8, 0.55, -2); g.add(drum);
      const tb = mesh(new T.BoxGeometry(1.0, 0.6, 0.5), toonM('#e0403a'), { inkW: 0.5 }); tb.position.set(x - 1.2, 0.3, -2.4); g.add(tb);
      if (i % 2 === 0) { const ch = mesh(K3D.roundBox(1.4, 0.3, 2.1, 0.4, 14), toonM('#8a86a0'), { inkW: 0.6 }); ch.position.set(x, 0.8, -0.6); g.add(ch); for (const sx of [-1, 1]) { const sd2 = mesh(new T.BoxGeometry(0.3, 0.65, 0.3), toonM('#ffd24a'), { inkW: 0.4 }); sd2.position.set(x + sx * 0.5, 0.33, -0.6); g.add(sd2); } }
      for (let k = 0; k < 5; k++) { const sp = mesh(K3D.geo('pkw-spanner', () => new T.BoxGeometry(0.08, 0.6, 0.04)), toonM('#c8c8d8'), { ink: false }); sp.position.set(x - 2 + k * 0.3, 2.6, -2.75); sp.rotation.z = 0.2; g.add(sp); }
    }
    const wall = mesh(new T.BoxGeometry(42, 0.9, 0.5), K3D.toon('#ffffff', { map: PARK.stripes('#f4f0e8', '#e0403a', 24) }), { inkW: 0.7 }); wall.position.set(4, 0.45, 6); g.add(wall);
    g.updateMatrixWorld(true);
    const w2 = (x, y, z) => { const q = new T.Vector3(x, y, z).applyMatrix4(g.matrixWorld); return [q.x, q.y, q.z]; };
    B.line(w2(-20, 4.65, 3.6), w2(20, 4.65, 3.6), 0.5, ['#ffe07a', '#ffffff'], { speed: 2.5, size: 0.1 });
    for (let i = 0; i < 5; i++) { const p = w2(-16 + i * 8, 3.6, -0.5); B.add(p[0], p[1], p[2], '#fff6d8', { size: 0.25 }); PARK.halo(K, p[0], p[1], p[2], 4, '#ffe0a0', 0.4); PARK.glint(K, p[0], p[2] + 4, '#ffe0a0', 6, 2, 0.35); }
    // the robots at work in the pits
    const bots = [];
    for (let i = 0; i < 3; i++) { const r = PARK.robot(K, { col: ['#3f9a8a', '#f2c14e', '#7a6ad0'][i] }); const p = w2(-12 + i * 12, 0, 0.8); r.position.set(p[0], 0, p[2]); r.rotation.y = g.rotation.y + Math.PI + (i - 1) * 0.5; bots.push({ r, ph: i * 2 }); }
    return { g, bots };
  }
  function floodlight(K, B, x, z, aim) {
    const g = new T.Group(); g.position.set(x, 0, z); K.add(g);
    const mast = mesh(new T.CylinderGeometry(0.22, 0.36, 16, 10), toonM('#3b3456'), { inkW: 0.7 }); mast.position.y = 8; g.add(mast);
    const head = new T.Group(); head.position.y = 16.2; head.rotation.y = Math.atan2(aim[0] - x, aim[1] - z); g.add(head);
    const frame = mesh(new T.BoxGeometry(3.4, 2.0, 0.4), toonM('#2a2438'), { inkW: 0.8 }); frame.rotation.x = 0.5; head.add(frame);
    g.updateMatrixWorld(true);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const q = new T.Vector3(-1.1 + i * 1.1, -0.45 + j * 0.9, 0.3).applyMatrix4(frame.matrixWorld); B.add(q.x, q.y, q.z, '#f4f8ff', { size: 0.32 }); }
    const c = new T.Vector3(0, 0, 0.6).applyMatrix4(frame.matrixWorld); PARK.halo(K, c.x, c.y, c.z, 5, '#e8f0ff', 0.3);
    PARK.glint(K, aim[0], aim[1], '#e8f0ff', 14, 6, 0.25);
  }
  function hoarding(K, B, x, z, yaw, txt, a, b, sub) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; K.add(g);
    const bd = mesh(new T.BoxGeometry(7, 2.2, 0.2), K3D.toon('#ffffff', { map: boardTex(txt, a, b, sub), emissive: '#ffffff', emissiveIntensity: 0.12 }), { inkW: 0.8 }); bd.position.y = 2.2; g.add(bd);
    for (const sx of [-1, 1]) { const p = mesh(new T.BoxGeometry(0.2, 3.3, 0.2), toonM('#2a2438'), { inkW: 0.5 }); p.position.set(sx * 3, 1.6, -0.2); g.add(p); }
    g.updateMatrixWorld(true);
    const q1 = new T.Vector3(-3.4, 3.45, 0.15).applyMatrix4(g.matrixWorld), q2 = new T.Vector3(3.4, 3.45, 0.15).applyMatrix4(g.matrixWorld);
    B.line([q1.x, q1.y, q1.z], [q2.x, q2.y, q2.z], 0.45, ['#ffe07a', '#ffffff'], { speed: 3, size: 0.08 });
    const q3 = new T.Vector3(0, 4.0, 1.4).applyMatrix4(g.matrixWorld); PARK.halo(K, q3.x, q3.y, q3.z, 3, '#ffe0a0', 0.25);
  }
  function kartFence(K, B) {
    // the old kart fence (chain link on posts) round the kart track, broken where the karts burst out onto the Midway
    const pts = [[-36, 26], [86, 26], [86, -96], [-36, -96], [-36, 26]];
    const linkTex = K3D.paint('pkw-link', 128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#b8b4c8'; c.lineWidth = 3; for (let i = -8; i < 16; i++) { c.beginPath(); c.moveTo(i * 16, 0); c.lineTo(i * 16 + h, h); c.stroke(); c.beginPath(); c.moveTo(i * 16 + h, 0); c.lineTo(i * 16, h); c.stroke(); } }, { repeat: true });
    const linkM = K3D.toon('#ffffff', { map: linkTex, alphaTest: 0.4, side: T.DoubleSide });
    const postG = K3D.geo('pkw-fpost', () => new T.CylinderGeometry(0.07, 0.07, 2.4, 6).translate(0, 1.2, 0)), postM = toonM('#6a6680');
    const brk = [];
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.round(d / 3);
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n, x0 = a[0] + (b[0] - a[0]) * t0, z0 = a[1] + (b[1] - a[1]) * t0, x1 = a[0] + (b[0] - a[0]) * t1, z1 = a[1] + (b[1] - a[1]) * t1;
        if (!clear((x0 + x1) / 2, (z0 + z1) / 2, 1.5)) { brk.push([(x0 + x1) / 2, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0)]); continue; }
        const p = mesh(postG, postM, { inkW: 0.4 }); p.position.set(x0, 0, z0); K.add(p); take((x0 + x1) / 2, (z0 + z1) / 2, 1.6);
        const panel = new T.Mesh(K3D.geo('pkw-panel', () => new T.PlaneGeometry(3, 2.2).translate(0, 1.15, 0)), linkM); panel.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); panel.rotation.y = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2; panel.rotation.z = (rnd() - 0.5) * 0.04; K.add(panel);
        if (i % 4 === 0) B.add(x0, 2.45, z0, '#ffe0a0', { size: 0.07 });
      }
    }
    // where it is broken: a panel lying flat, bent posts, cones and a hazard light
    for (const [x, z, yaw] of brk.filter((_, i) => i % 3 === 0).slice(0, 6)) {
      if (!clear(x + 3, z, 1)) continue;
      const panel = new T.Mesh(K3D.geo('pkw-panel', () => new T.PlaneGeometry(3, 2.2).translate(0, 1.15, 0)), linkM); panel.position.set(x + 3.5, 0.1, z + 1); panel.rotation.set(-Math.PI / 2 + 0.1, 0, yaw); K.add(panel);
      const cone = mesh(K3D.geo('pkw-cone', () => new T.ConeGeometry(0.28, 0.75, 12).translate(0, 0.375, 0)), K3D.toon('#ffffff', { map: PARK.stripes('#ff7a2a', '#f4f0e8', 4, { v: false }) }), { inkW: 0.5 }); cone.position.set(x + 2.4, 0, z - 1); K.add(cone);
      B.add(x + 2.4, 0.9, z - 1, '#ff8a3a', { size: 0.12, blink: true });
    }
  }
  function kartTrack(K, B) {
    W.gantry = gantry(K, B);
    W.crowd = grandstand(K, B);
    W.pits = pits(K, B);
    kartFence(K, B);
    for (const [x, z, a] of [[-26, 18, [10, -10]], [76, 16, [50, -10]], [78, -60, [56, -40]], [-28, -88, [10, -70]], [36, -36, [30, -52]]]) floodlight(K, B, x, z, a);
    // hoardings round the outside of the bends (invented brands)
    const hd = [[78, -26, -Math.PI / 2, 'MOONPOP FIZZ', '#2f7fa8', '#ffd24a', 'THE MIDNIGHT DRINK'], [-2, -72, Math.PI / 2, 'COMET CRISPS', '#c83a4a', '#ffd24a', 'CRUNCH AT LIGHT SPEED'],
      [44, 14, Math.PI, 'STARLIGHT TYRES', '#1a1626', '#ff5a9a', 'GRIP ALL NIGHT'], [24, -64, 0, 'BUMPER BURGERS', '#3f8f6a', '#f2c14e', 'OPEN TILL 1'], [62, 16, Math.PI, 'ZOOM OIL', '#5d4bb0', '#7ae8ff', '']];
    for (const h of hd) if (room(h[0], h[1], 3.6) && take(h[0], h[1], 3.6)) hoarding(K, B, ...h);
  }

  /* ---------- part 1: the Midway ---------- */
  function midway(K, B) {
    const s0 = TR.partS[1], s1 = TR.partS[2];
    // a neon arch at the way in
    {
      const f = TR.at(s0 + 3), w = f.hw + TR.VERGE + 1.6, g = new T.Group(); g.position.set(f.x, 0, f.z); g.rotation.y = Math.atan2(f.tx, f.tz); K.add(g);
      for (const sx of [-1, 1]) { const p = mesh(new T.CylinderGeometry(0.35, 0.45, 8, 12), K3D.toon('#ffffff', { map: PARK.stripes('#c83a6a', '#f4e8d0', 8, { v: false }) }), { inkW: 0.8 }); p.position.set(sx * w, 4, 0); g.add(p); const ball = mesh(new T.SphereGeometry(0.6, 14, 10), toonM('#f2c14e'), { inkW: 0.6 }); ball.position.set(sx * w, 8.4, 0); g.add(ball); }
      const pts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24; pts.push(new T.Vector3(Math.cos(a) * w, 7.6 + Math.sin(a) * 2.4, 0)); }
      g.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 48, 0.22, 8), toonM('#c83a6a'), { inkW: 0.8 }));
      const sg = PARK.neon(K, 'THE MIDWAY', { w: w * 1.3, h: 1.8, col: '#ffcf4a', col2: '#ff5a9a', k: 2.6 }); sg.position.set(0, 8.4, 0.3); sg.rotation.y = Math.PI; g.add(sg);
      g.updateMatrixWorld(true);
      for (let i = 0; i <= 36; i++) { const q = pts[Math.round(i / 36 * 24)].clone(); q.z = -0.3; q.applyMatrix4(g.matrixWorld); B.add(q.x, q.y, q.z, i % 2 ? '#ffffff' : '#ff8ad8', { size: 0.13, speed: 6, phase: i * 0.6 }); }
    }
    // stalls both sides, facing the road; lamps between them; strings of bulbs and lanterns across
    let c = 0;
    for (let s = s0 + 8; s < s1 - 6; s += 7.5) {
      const f = TR.at(s);
      for (const sx of [-1, 1]) {
        const d = f.hw + TR.VERGE + 3.6, x = f.x + f.rx * d * sx, z = f.z + f.rz * d * sx;
        if (!room(x, z, 2.8)) continue;
        take(x, z, 2.8);
        PARK.stall(K, B, { x, z, yaw: Math.atan2(-f.rx * sx, -f.rz * sx), c: c++ });
        const lx = x - f.tx * 3.8, lz = z - f.tz * 3.8; if (room(lx, lz, 0.6) && take(lx, lz, 0.6)) PARK.lamp(K, B, { x: lx, z: lz, moths: c % 3 === 0 });
      }
    }
    for (let s = s0 + 12; s < s1 - 6; s += 11) {
      const f = TR.at(s), w = f.hw + TR.VERGE + 1.3, a = [f.x - f.rx * w, 9.2, f.z - f.rz * w], b = [f.x + f.rx * w, 9.2, f.z + f.rz * w];
      if (!clear(a[0], a[2], 0.3) || !clear(b[0], b[2], 0.3)) continue;
      for (const p of [a, b]) { const pole = mesh(K3D.geo('pkw-mpole', () => new T.CylinderGeometry(0.1, 0.13, 9.6, 8).translate(0, 4.8, 0)), toonM('#2a2438'), { inkW: 0.5 }); pole.position.set(p[0], 0, p[2]); K.add(pole); B.add(p[0], 9.7, p[2], '#ff6a8a', { size: 0.16 }); }
      if (Math.round(s / 11) % 2) B.line(a, b, 0.55, ['#ffe07a', '#ff8ab0', '#7ae8ff', '#ffffff', '#9aff8a'], { speed: 4, size: 0.11, sag: 1.0 });
      else PARK.lanterns(K, B, a, b, { sag: 1.1, c: Math.round(s) });
    }
    // popcorn carts, floss carts and balloons beside the road; tents behind the stalls
    for (let s = s0 + 15; s < s1 - 6; s += 23) for (const sx of [-1, 1]) { const f = TR.at(s), d = f.hw + TR.VERGE + 2.3, x = f.x + f.rx * d * sx, z = f.z + f.rz * d * sx; if (room(x, z, 1.4) && take(x, z, 1.4)) PARK.cart(K, B, sx < 0 ? 'popcorn' : 'floss', { x, z, yaw: Math.atan2(-f.rx * sx, -f.rz * sx) }); }
    for (let s = s0 + 20; s < s1 - 10; s += 26) for (const sx of [-1, 1]) { const f = TR.at(s), d = f.hw + TR.VERGE + 14, x = f.x + f.rx * d * sx, z = f.z + f.rz * d * sx; if (room(x, z, 7) && take(x, z, 7)) PARK.tent(K, B, { x, z, r: 4.5 + rnd() * 2, h: 5.5 + rnd() * 2, cols: [['#c83a4a', '#f4e8d0'], ['#3f8f6a', '#f4e8d0'], ['#5d4bb0', '#f2d06a'], ['#d860a8', '#f4e8d0']][Math.floor(rnd() * 4)], yaw: rnd() * 6 }); }
    W.ringToss = ringToss(K, B);
  }
  function ringToss(K, B) {
    // the ring-toss stall over the shortcut: a long striped canopy the karts drive through, prize shelves both sides,
    // pegs and hoops, big hoops hung from the roof, the sign
    const Br = TR.ringToss, mid = Br.len / 2, len = 16, out = [];
    const f = Br.at(mid), g = new T.Group(); g.position.set(f.x, 0, f.z); g.rotation.y = Math.atan2(f.tx, f.tz); K.add(g);
    const w = Br.hw + 1.6, cols = ['#e9b23c', '#7a2f5a'];
    const wood = K3D.toon('#ffffff', { map: PARK.wood('#7a4d30') });
    for (const sx of [-1, 1]) {
      const cnt = mesh(new T.BoxGeometry(0.9, 1.1, len), K3D.toon('#ffffff', { map: PARK.stripes(cols[0], cols[1], 10) }), { inkW: 0.7 }); cnt.position.set(sx * (w + 0.45), 0.55, 0); g.add(cnt);
      const shelf = mesh(new T.BoxGeometry(1.4, 3.2, len), wood, { inkW: 0.7 }); shelf.position.set(sx * (w + 1.6), 1.6, 0); g.add(shelf);
      for (let i = 0; i < 6; i++) for (let r = 0; r < 2; r++) {
        // plush prizes on the shelves
        const pz = new T.Group(); pz.position.set(sx * (w + 1.05), 1.55 + r * 1.0, -len / 2 + 1.4 + i * 2.6); pz.rotation.y = -sx * Math.PI / 2; g.add(pz);
        const c = ['#e8a05a', '#f4d0e0', '#9ad0f0', '#a8e08a', '#d8a0f0', '#f08a7a'][(i + r * 2) % 6];
        const b = mesh(K3D.geo('pkw-prB', () => new T.SphereGeometry(0.28, 10, 8).scale(1, 1.1, 0.9)), toonM(c), { inkW: 0.5 }); b.position.y = 0.28; pz.add(b);
        const h = mesh(K3D.geo('pkw-prH', () => new T.SphereGeometry(0.22, 10, 8)), toonM(c), { inkW: 0.5 }); h.position.y = 0.7; pz.add(h);
        for (const ex of [-0.14, 0.14]) { const e = mesh(K3D.geo('pkw-prE', () => new T.SphereGeometry(0.08, 8, 6)), toonM(c), { inkW: 0.4 }); e.position.set(ex, 0.9, 0); pz.add(e); }
      }
      for (const z of [-len / 2, 0, len / 2]) { const p = mesh(new T.CylinderGeometry(0.14, 0.16, 5.2, 8), toonM('#7a2f5a'), { inkW: 0.5 }); p.position.set(sx * (w + 0.1), 2.6, z); g.add(p); }
    }
    const roof = mesh(new T.CylinderGeometry(w + 2.4, w + 2.4, len + 1, 24, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).scale(1, 0.45, 1), K3D.toon('#ffffff', { map: PARK.stripes(cols[0], '#f4e8d0', 16, { v: true }), side: T.DoubleSide }), { inkW: 0.9 });
    roof.rotation.z = 0; roof.position.y = 5.0; g.add(roof);
    // the pegs: a field of them on the counters, hoops hanging from the roof that swing when a kart goes through
    const hoops = [];
    for (let i = 0; i < 5; i++) {
      const h = mesh(K3D.geo('pkw-hoop', () => new T.TorusGeometry(0.9, 0.09, 8, 28)), toonM(['#ff5a7a', '#ffd24a', '#7ae8ff', '#9aff8a', '#ff9ad6'][i]), { inkW: 0.5 });
      const piv = new T.Group(); piv.position.set(0, 5.0, -len / 2 + 2 + i * 3); piv.userData.live = true; g.add(piv);
      h.position.y = -1.6; piv.add(h); hoops.push({ piv, z: -len / 2 + 2 + i * 3, sw: 0, v: 0 });
    }
    for (const sx of [-1, 1]) for (let i = 0; i < 8; i++) { const pg = mesh(K3D.geo('pkw-peg', () => new T.CylinderGeometry(0.05, 0.05, 0.5, 6).translate(0, 0.25, 0)), toonM('#f4f0e8'), { ink: false }); pg.position.set(sx * (w + 0.45), 1.1, -len / 2 + 1 + i * 2); g.add(pg); if (i % 3 === 0) { const r = mesh(K3D.geo('pkw-ringS', () => new T.TorusGeometry(0.22, 0.04, 6, 14).rotateX(Math.PI / 2)), toonM('#ffd24a'), { ink: false }); r.position.set(sx * (w + 0.45), 1.2, -len / 2 + 1 + i * 2); g.add(r); } }
    for (const z of [-len / 2 - 0.6, len / 2 + 0.6]) { const sg = PARK.neon(K, 'RING TOSS', { w: 6, h: 1.4, col: '#ffcf4a', col2: '#ff5a9a', k: 1.7 }); sg.position.set(0, 6.8, z); if (z < 0) sg.rotation.y = Math.PI; g.add(sg); }
    g.updateMatrixWorld(true);
    const w2 = (x, y, z) => { const q = new T.Vector3(x, y, z).applyMatrix4(g.matrixWorld); return [q.x, q.y, q.z]; };
    for (const sx of [-1, 1]) B.line(w2(sx * (w + 0.1), 5.0, -len / 2), w2(sx * (w + 0.1), 5.0, len / 2), 0.45, ['#ffe07a', '#ffffff', '#ff8ab0'], { speed: 5, size: 0.1 });
    for (let i = 0; i < 4; i++) { const p = w2(0, 4.4, -len / 2 + 2 + i * 4); B.add(p[0], p[1], p[2], '#fff0c0', { size: 0.22 }); PARK.halo(K, p[0], p[1], p[2], 3, '#ffe0a0', 0.3); }
    out.push({ g, hoops });
    return { g, hoops };
  }

  /* ---------- part 4: the pier ---------- */
  function pier(K, B) {
    const sea = PARK.sea(K, B, { z: SEA.z, pier: PIER });
    // the kit's wheel sits at the pier's end: move it to the middle of the loop, the helter-skelter to the land end
    sea.pierWheel.g.position.z = -299; sea.pierWheel.g.position.x = PIER.x + 0.5;
    for (const o of K.root.children) if (o.isGroup && Math.abs(o.position.x - (PIER.x + 2)) < 0.01 && Math.abs(o.position.z - (PIER.z1 + 40)) < 0.01) o.position.set(PIER.x + 1, PIER.y - 0.02, -258);
    W.pierWheel = sea.pierWheel;
    const sg = PARK.neon(K, 'THE PIER', { w: 10, h: 2.4, col: '#7ae8ff', col2: '#ff6ab0', k: 2.6 }); sg.position.set(PIER.x, 9, PIER.z0 + 2); K.add(sg);
    for (const sx of [-1, 1]) { const p = mesh(new T.CylinderGeometry(0.3, 0.4, 9, 10), toonM('#3b3456'), { inkW: 0.6 }); p.position.set(PIER.x + sx * 5.5, 4.5, PIER.z0 + 2); K.add(p); }
    // gulls on the railings
    W.gulls = PARK.gulls(K, [[PIER.x - 2, PIER.y + 1.2, -265], [PIER.x + 3, PIER.y + 1.2, -275], [PIER.x - 27, PIER.y + 1.2, -300], [PIER.x + 27, PIER.y + 1.2, -290], [PIER.x + 1, PIER.y + 1.2, -242]]);
  }

  /* ---------- part 5: Spook Manor Lane ---------- */
  function spook(K, B) {
    const s0 = TR.partS[5], s1 = TR.L - 40;
    const stone = toonM('#7a7690'), dark = toonM('#2a2438');
    const hs = K3D.geo('pkw-headstone', () => { const sh = new T.Shape(); sh.moveTo(-0.4, 0); sh.lineTo(-0.4, 0.8); sh.absarc(0, 0.8, 0.4, Math.PI, 0, true); sh.lineTo(0.4, 0); return new T.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: false }); });
    for (let s = s0 + 10; s < s1; s += 5 + rnd() * 6) {
      const f = TR.at(s), side = rnd() < 0.7 ? -1 : 1, d = f.hw + TR.VERGE + 2 + rnd() * 7, x = f.x + f.rx * d * side, z = f.z + f.rz * d * side;
      if (!clear(x, z, 0.8)) continue;
      const m = mesh(hs, stone, { inkW: 0.6 }); m.position.set(x, 0, z); m.rotation.set((rnd() - 0.5) * 0.2, Math.atan2(-f.rx * side, -f.rz * side) + (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.25); m.scale.setScalar(0.9 + rnd() * 0.6); K.add(m);
    }
    // bare trees (black, twisty)
    for (let s = s0 + 6; s < s1; s += 14 + rnd() * 8) for (const side of [-1, 1]) {
      const f = TR.at(s), d = f.hw + TR.VERGE + 4 + rnd() * 6, x = f.x + f.rx * d * side, z = f.z + f.rz * d * side;
      if (!clear(x, z, 2)) continue;
      const g = new T.Group(); g.position.set(x, 0, z); K.add(g);
      const trunk = mesh(new T.CylinderGeometry(0.2, 0.4, 5, 7).translate(0, 2.5, 0), dark, { inkW: 0.7 }); trunk.rotation.z = (rnd() - 0.5) * 0.3; g.add(trunk);
      for (let i = 0; i < 4; i++) { const br = mesh(new T.CylinderGeometry(0.05, 0.14, 2.6, 5).translate(0, 1.3, 0), dark, { inkW: 0.5 }); br.position.y = 3 + i * 0.5; br.rotation.set((rnd() - 0.5) * 1.6, rnd() * 6, (rnd() - 0.5) * 1.8); g.add(br); }
    }
    // green gas lamps
    for (let s = s0 + 4; s < s1; s += 22) { const f = TR.at(s), d = f.hw + TR.VERGE + 1.6, x = f.x - f.rx * d, z = f.z - f.rz * d; if (clear(x, z, 0.5)) PARK.lamp(K, B, { x, z, col: '#9affb0', moths: false, yaw: Math.atan2(f.tx, f.tz) }); }
    // the manor on its hill, off to the west
    const g = new T.Group(); g.position.set(-46, 0, -150); g.rotation.y = 0.9; K.add(g);
    const hill = mesh(new T.SphereGeometry(30, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.32, 1), toonM('#1f2b33'), { inkW: 0.8 }); g.add(hill);
    const house = mesh(new T.BoxGeometry(18, 12, 12), toonM('#3a3456'), { inkW: 1 }); house.position.set(0, 15, 0); g.add(house);
    const roof = mesh(new T.ConeGeometry(14, 8, 4).rotateY(Math.PI / 4).scale(1, 1, 0.75), toonM('#1e1a30'), { inkW: 1 }); roof.position.set(0, 25, 0); g.add(roof);
    for (const sx of [-1, 1]) { const tw = mesh(new T.CylinderGeometry(2.6, 2.8, 18, 10), toonM('#3a3456'), { inkW: 0.9 }); tw.position.set(sx * 10, 18, 2); g.add(tw); const tr = mesh(new T.ConeGeometry(3.4, 7, 10), toonM('#1e1a30'), { inkW: 0.8 }); tr.position.set(sx * 10, 30.5, 2); g.add(tr); }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const w = new T.Mesh(new T.PlaneGeometry(1.6, 2.2), PARK.flatM(i === 1 && j === 0 ? '#9affb0' : '#ffd27a', 1.3)); w.position.set(-6 + i * 4, 12 + j * 4.5, 6.05); g.add(w); }
    const sg = PARK.neon(K, 'SPOOK MANOR', { w: 14, h: 2.6, col: '#9affb0', col2: '#b48aff', k: 2.4 }); sg.position.set(0, 23, 6.6); g.add(sg);
    g.updateMatrixWorld(true);
    const p = new T.Vector3(0, 30, 0).applyMatrix4(g.matrixWorld); PARK.halo(K, p.x, p.y, p.z, 30, '#9affb0', 0.12);
    W.fogAt = []; for (let s = s0 + 20; s < s1; s += 18) W.fogAt.push(s);
  }

  /* ---------- the park round it ---------- */
  function park(K, B) {
    // the ground: cobbled plazas round the rides and the grandstand, paved avenue on the Midway, gravel under every
    // road and its verge; grass everywhere else
    const lay = { paths: [], discs: [], rects: [] };
    const run = []; for (let s = 0; s <= TR.L; s += 3) { const f = TR.at(s); run.push([f.x, f.z]); }
    lay.paths.push({ pts: run, w: 2 * (4.6 + TR.VERGE) + 2.6, kind: 'gravel' });
    { const pts = []; for (let bs = 0; bs <= TR.ringToss.len; bs += 3) { const g = TR.ringToss.at(bs); pts.push([g.x, g.z]); } lay.paths.push({ pts, w: 6, kind: 'gravel' }); }
    { const pts = []; for (let s = TR.partS[1]; s <= TR.partS[2]; s += 4) { const f = TR.at(s); pts.push([f.x, f.z]); } lay.paths.push({ pts, w: 34 }); }
    lay.rects.push({ x: 18, z: 18, w: 40, d: 14 });
    lay.rects.push({ x: 26, z: -24, w: 46, d: 16 });
    W.rideAt = [{ k: 'wheel', x: 120, z: -158, r: 22, hub: 25, yaw: 0.5 }, { k: 'carousel', x: 72, z: -136, r: 8 }, { k: 'swings', x: 168, z: -140, r: 8, h: 16 },
      { k: 'drop', x: 142, z: -196, h: 52 }, { k: 'teacups', x: 40, z: -118, r: 9 }, { k: 'flume', x: 252, z: -126, h: 20, yaw: Math.PI / 2 }];
    for (const r of W.rideAt) lay.discs.push({ x: r.x, z: r.z, r: (r.r || 8) + 7 });
    for (const [a, b] of [[[72, -136], [120, -158]], [[120, -158], [168, -140]], [[40, -118], [72, -136]], [[120, -158], [142, -196]]]) lay.paths.push({ pts: [a, b], w: 7 });
    PARK.ground(K, { x: 110, z: -120, size: 1500, layout: lay });
    W.lay = lay; W.groundAll = K.groundAll;   // the kit's ground mask: is a whole circle grass?
    W.rides = W.rideAt.map(r => PARK.ride(K, B, r.k, r));
    // the lamps along the walks between the rides
    for (const [a, b] of [[[72, -136], [120, -158]], [[120, -158], [168, -140]], [[40, -118], [72, -136]], [[120, -158], [142, -196]]]) {
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.round(d / 11);
      for (let i = 1; i < n; i++) { const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, nx = -(b[1] - a[1]) / d, nz = (b[0] - a[0]) / d; PARK.lamp(K, B, { x: x + nx * 3, z: z + nz * 3, moths: i % 3 === 0 }); if (i % 2) PARK.bench(K, x - nx * 3, z - nz * 3, Math.atan2(nx, nz)); }
    }
    PARK.fence(K, B, [-150, 120], [330, 120], { bulbs: true }); PARK.fence(K, B, [-150, SEA.z + 8], [-150, 120], { bulbs: true }); PARK.fence(K, B, [330, SEA.z + 8], [330, 120], { bulbs: true });
    // the promenade along the sea wall
    for (let x = -140; x < 320; x += 12) { if (Math.abs(x - PIER.x) < PIER.w / 2 + 4 || !clear(x, SEA.z + 9, 1.5)) continue; PARK.lamp(K, B, { x, z: SEA.z + 9, moths: x % 36 === 0 }); }
    for (let x = -140; x < 320; x += 4.5) { if (Math.abs(x - PIER.x) < PIER.w / 2 + 6 || !clear(x, SEA.z + 9, 2) || !clear(x + 4.5, SEA.z + 9, 2)) continue; PARK.flags(K, [x, 4.6, SEA.z + 9], [x + 4.5, 4.6, SEA.z + 9], { sag: 0.4, n: 6 }); }
  }
  // filling the gaps beside the road (Gavyn: never barren): lawns with trees, flower beds and benches, lamps with
  // lanterns, stalls, booths, carts, balloons, hedge animals, tents further out
  // is a circle at (x, z) of radius r on any paving or gravel of the ground's layout? (gardens need grass)
  function paved(x, z, r) {
    const L = W.lay; if (!L) return false;
    if (W.groundAll && !W.groundAll(x, z, r, 'grass')) return true;   // the mask itself (paths, plazas, gravel)
    const segD = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
    for (const p of L.paths) for (let i = 1; i < p.pts.length; i++) if (segD(p.pts[i - 1], p.pts[i]) < p.w / 2 + r) return true;
    for (const d of L.discs) if (Math.hypot(x - d.x, z - d.z) < d.r + r) return true;
    for (const q of L.rects) if (Math.abs(x - q.x) < q.w / 2 + r && Math.abs(z - q.z) < q.d / 2 + r) return true;
    return false;
  }
  function fill(K, B) {
    const cell = 3, occ = new Set(), key = (a, b) => a + ',' + b;
    const each = (x, z, r, f) => { for (let a = Math.floor((x - r) / cell); a <= Math.floor((x + r) / cell); a++) for (let b = Math.floor((z - r) / cell); b <= Math.floor((z + r) / cell); b++) if (f(key(a, b))) return true; return false; };
    const mark = (x, z, r) => each(x, z, r, k => { occ.add(k); });
    const free = (x, z, r) => {
      if (x < -140 || x > 320 || z < SEA.z + 12 || z > 112) return false;
      if (!clear(x, z, r)) return false;
      return !each(x, z, r, k => occ.has(k));
    };
    for (const r of W.rideAt) mark(r.x, r.z, (r.r || 8) + 9);
    mark(-46, -150, 30);
    const box = new T.Box3(), c = new T.Vector3(), sz = new T.Vector3();
    for (const o of K.root.children) {
      if (o.isInstancedMesh || o.isPoints || o.isSprite) continue;
      box.setFromObject(o); if (box.isEmpty()) continue; box.getSize(sz); if (sz.x > 70 || sz.z > 70) continue;
      box.getCenter(c); mark(c.x, c.z, Math.max(sz.x, sz.z) / 2 + 0.5);
    }
    const FL = PARK.flowers(K, 20000), lampAt = [];
    const kinds = [['trees', 30], ['bed', 12], ['lamp', 8], ['stall', 10], ['booth', 5], ['hedge', 5], ['cart', 5], ['balloons', 6], ['bench', 7], ['games', 6]];
    const tot = kinds.reduce((a, k) => a + k[1], 0);
    const pick = () => { let x = rnd() * tot; for (const [k, w] of kinds) { x -= w; if (x < 0) return k; } return 'trees'; };
    const place = (k, x, z, yaw) => {
      if (k === 'trees') { if (!free(x, z, 3.5) || paved(x, z, 4.5)) return false; FL.lawn(x, z, 3.5 + rnd() * 2.5, 2.8 + rnd() * 2, rnd() * 3); const n = 1 + Math.floor(rnd() * 3); for (let i = 0; i < n; i++) PARK.tree(K, x + (rnd() - 0.5) * 4, z + (rnd() - 0.5) * 3, 1.0 + rnd() * 0.7, B); mark(x, z, 4); }
      else if (k === 'bed') { if (!free(x, z, 2.4) || paved(x, z, 2)) return false; FL.bed(x, z, 1.2 + rnd() * 1.0); PARK.bench(K, x + Math.sin(yaw) * 3.2, z + Math.cos(yaw) * 3.2, yaw + Math.PI); mark(x, z, 3.5); }
      else if (k === 'lamp') { if (!free(x, z, 1.5)) return false; PARK.lamp(K, B, { x, z, moths: rnd() < 0.3 }); PARK.bin(K, x + 1, z + 0.6); const near = lampAt.find(l => Math.hypot(l[0] - x, l[1] - z) < 14 && Math.hypot(l[0] - x, l[1] - z) > 5); if (near) PARK.lanterns(K, B, [x, 3.9, z], [near[0], 3.9, near[1]], { sag: 0.8, c: Math.floor(x) }); lampAt.push([x, z]); mark(x, z, 1.8); }
      else if (k === 'stall') { if (!free(x, z, 4.5)) return false; PARK.stall(K, B, { x, z, yaw, c: Math.floor(rnd() * 9) }); mark(x, z, 4.5); }
      else if (k === 'booth') { if (!free(x, z, 2.5)) return false; PARK.booth(K, B, { x, z, yaw }); mark(x, z, 2.5); }
      else if (k === 'hedge') { if (!free(x, z, 3) || paved(x, z, 3)) return false; PARK.hedgeAnimal(K, x, z, ['rabbit', 'elephant', 'other'][Math.floor(rnd() * 3)], yaw); FL.bed(x + 2.6, z + 1.2, 1.0); mark(x, z, 3.5); }
      else if (k === 'cart') { if (!free(x, z, 2)) return false; PARK.cart(K, B, rnd() < 0.5 ? 'popcorn' : 'floss', { x, z, yaw }); mark(x, z, 2.2); }
      else if (k === 'balloons') { if (!free(x, z, 1.8) || paved(x, z, 0.5)) return false; PARK.balloons(K, x, 0, z, 4 + Math.floor(rnd() * 4)); mark(x, z, 2); }
      else if (k === 'bench') { if (!free(x, z, 2)) return false; PARK.bench(K, x, z, yaw); PARK.lamp(K, B, { x: x + 1.8, z: z + 0.4 }); mark(x, z, 2.4); }
      else if (k === 'games') { if (!free(x, z, 7)) return false; PARK.tent(K, B, { x, z, r: 4 + rnd() * 2.5, h: 5 + rnd() * 2, cols: [['#c83a4a', '#f4e8d0'], ['#3f8f6a', '#f4e8d0'], ['#5d4bb0', '#f2d06a'], ['#d860a8', '#f4e8d0']][Math.floor(rnd() * 4)], yaw }); mark(x, z, 9); }
      return true;
    };
    for (const [d0, d1, step] of [[3, 7, 2.6], [7, 13, 3.2], [13, 22, 4], [22, 36, 5.5], [36, 60, 8], [60, 90, 11]]) {
      for (let s = 0; s < TR.L; s += step * (0.7 + rnd() * 0.6)) {
        const f = TR.at(s);
        if (f.part === 4 || f.part === 3) continue;
        for (const side of [-1, 1]) {
          const d = f.hw + TR.VERGE + d0 + rnd() * (d1 - d0), x = f.x + f.rx * d * side, z = f.z + f.rz * d * side;
          // Spook Manor Lane keeps to its own dark things close in
          if (f.part === 5 && d0 < 13) continue;
          for (let t = 0; t < 4 && !place(t < 2 ? pick() : t === 2 ? 'trees' : rnd() < 0.5 ? 'bed' : 'bench', x, z, Math.atan2(-f.rx * side, -f.rz * side)); t++);
        }
      }
    }
    // then the rest of the park, wherever it is still empty (a jittered grid)
    for (let x = -136; x < 318; x += 11) for (let z = SEA.z + 14; z < 110; z += 11) {
      const px = x + (rnd() - 0.5) * 6, pz = z + (rnd() - 0.5) * 6;
      const n = TR.near(px, pz, null); if (TR.at(n.s).part === 5 && Math.abs(n.lat) < 24) continue;
      // face the nearest bit of road (stalls, booths and benches look toward where people walk)
      const rp = TR.pos(n.s, 0), yaw = Math.atan2(rp[0] - px, rp[1] - pz);
      for (let t = 0; t < 3 && !place(t < 2 ? pick() : 'trees', px, pz, yaw); t++);
    }
    FL.done();
  }

  W.build = function (K) {
    PARK.seed();   // the scenery's dice start again, so the park is the same on every build and replay
    rnd = PARK.rnd; PARK.resetGlints();
    W.night = PARK.night(K, { moon: { x: -60, y: 200, z: -520, r: 46 } });
    const B = PARK.bulbs(K, 22000);
    W.B = B;
    park(K, B);
    road(K, B);
    walls(K, B);
    kartTrack(K, B);
    midway(K, B);
    const ctx = { W, strip, decal, clear, room, take, paved, rnd, mesh, toonM, INK, PIER, SEA, boardTex, chequer, tarmacTex, kerbTex, strawTex, tyreTex };
    PARKKARTS_PARTS.comet(K, B, ctx);
    PARKKARTS_PARTS.funhouse(K, B, ctx);
    pier(K, B);
    PARKKARTS_PARTS.pier(K, B, ctx);
    spook(K, B);
    PARKKARTS_PARTS.spook(K, B, ctx);
    fill(K, B);
    W.fw = PARK.fireworks(K);
    return W;
  };
  return W;
})();
