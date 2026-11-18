/* Pip & Bo - 42-2 Log Flume Plunge: the scenery of stretches 2 to 4 (built by parkflume-scenery.js, which owns the
   ground, the water, the stretch 1 gardens, the log and the camera).
     Jungle Bend: a gorge of mossy rock under giant leaves, palms and jungle trees, vines and lanterns across the water,
       tiki torches, mist, temple ruins; the clockwork animals (hippos, the elephant and its jet, crocodiles, monkeys with
       coconuts), the rapids, the whirlpool, the snake arched over the river, the waterfall curtain and its hidden temple.
     The lifts: painted wooden troughs on timber trestles, the belt's cleats hauling the log up, bulbs chasing up the
       rails, the gears at the top; the chute down; the big one's "SMILE!" camera.
     The Sawmill: the mill pond (floating logs, log-rolling robots), the mill (plank walls with lit windows, a shingle
       roof, a chimney), and inside it: lamps on the beams, conveyors, saw blades rising, chutes tipping logs, the band
       saw, the grabber crane, the steam room and the great paddle wheel.
     Splashdown Lagoon: fountains, fireworks barges, the cable-ski robot, the lighthouse, the sparkler ring.
   Display only: it reads the rules' state and never changes it. Every moving thing here follows the same move(t) and
   cyc timings in parkflume-route.js that the rules use, so what you see is exactly what counts.

   PARKFLUME_SCENE2.build(K, sc, H)        H: helpers from the main scenery ({ groundAt, stoneTex, nearest, INK })
   PARKFLUME_SCENE2.update(K, sc, st, dt, t) */
'use strict';

const PARKFLUME_SCENE2 = (function () {
  const T = K3D.T, INK = '#1a1530';
  const PR = PARKFLUME_ROUTE, R = PR.R, L = PR.lists, A = PR.at;
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const sm = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  const CW = (s, x, y = 0) => R.local(s, x, y);
  const UP = new T.Vector3(0, 1, 0);
  let rnd = PARK.rnd, H = null, B = null, W = null;
  const tm = PARK.toonM, fm = PARK.flatM;
  const mesh = (geo, mat, o) => K3D.mesh(geo, mat, o === undefined ? { ink: INK } : o);
  // the place of a group in channel terms: local +X is the channel's right, local -Z downstream
  const place = (g, s, x, y = 0) => { const f = R.at(s); g.position.set(...R.local(s, x, y, f)); g.rotation.y = f.yaw; return g; };
  const onGround = (s, x) => { const p = CW(s, x); return [p[0], H.groundAt(p[0], p[2]), p[2]]; };
  // how far into its cycle a timed thing is (route's cyc: [per, on, ph])
  const cu = (o, t) => { const [per, , ph] = o.cyc; return (((t - ph) % per) + per) % per; };
  const obs = k => L.obs.filter(o => o.kind === k);
  const wyAt = s => R.at(s).p[1];
  // somewhere off the water: not on the channel (any part of it), not on an island
  const dry = (x, z, m = 0.8) => { const n = H.nearest(x, z, 4); if (!n) return true; if (n.d < n.q[3] + m) return false; return true; };

  /* ---------- a strip swept along the channel: prof(s, f) gives [x, y] points across (y up from the water) ---------- */
  function sweep(K, s0, s1, step, prof, mat, o = {}) {
    const n = Math.max(1, Math.ceil((s1 - s0) / step)), pos = [], uv = [], idx = [];
    let m = 0;
    for (let i = 0; i <= n; i++) {
      const s = s0 + (s1 - s0) * i / n, f = R.at(s), P = prof(s, f);
      m = P.length; let acc = 0;
      for (let j = 0; j < m; j++) {
        const q = R.local(s, P[j][0], P[j][1], f); pos.push(q[0], q[1], q[2]);
        if (j) acc += Math.hypot(P[j][0] - P[j - 1][0], P[j][1] - P[j - 1][1]);
        uv.push(o.uAcross ? acc / o.uAcross : j / (m - 1), s / (o.vLen || 3));
      }
      if (i) for (let j = 0; j < m - 1; j++) { const a = (i - 1) * m + j, b = i * m + j; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const me = new T.Mesh(g, mat); me.receiveShadow = true; me.castShadow = !!o.cast; me.userData.big = true;
    if (o.ink) K3D.ink(me, INK, o.ink);
    K.add(me); return me;
  }
  // one instanced family: list of { p:[x,y,z], yaw, pitch, roll, s (number or [x,y,z]), col }
  function inst(K, geo, mat, list, o = {}) {
    if (!list.length) return null;
    const im = new T.InstancedMesh(geo, mat, list.length), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(0, 0, 0, 'YXZ'), sc = new T.Vector3(), pv = new T.Vector3(), c = new T.Color();
    list.forEach((it, k) => {
      e.set(it.pitch || 0, it.yaw || 0, it.roll || 0); q.setFromEuler(e);
      const s = it.s == null ? 1 : it.s; if (Array.isArray(s)) sc.set(s[0], s[1], s[2]); else sc.set(s, s, s);
      m4.compose(pv.set(it.p[0], it.p[1], it.p[2]), q, sc); im.setMatrixAt(k, m4);
      if (it.col) im.setColorAt(k, c.set(it.col));
    });
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = !!o.cast; im.receiveShadow = true;
    if (o.ink !== false) K3D.ink(im, o.inkCol || INK, o.ink || 0.5);
    K.add(im); return im;
  }
  // a beam from a to b (Vector3s) for the timber family
  const beamGeo = () => K3D.geo('pf2-beam', () => new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
  function beams(K, list, mat, thick = 0.24) {
    if (!list.length) return null;
    const im = new T.InstancedMesh(beamGeo(), mat, list.length), m4 = new T.Matrix4(), q = new T.Quaternion();
    list.forEach((l, k) => { const d = l.b.clone().sub(l.a), len = d.length(); q.setFromUnitVectors(UP, d.normalize()); m4.compose(l.a, q, new T.Vector3(l.t || thick, len, l.t || thick)); im.setMatrixAt(k, m4); });
    im.castShadow = true; im.receiveShadow = true; K3D.ink(im, INK, 0.5); K.add(im); return im;
  }

  /* ---------- painted textures ---------- */
  const leafTex = () => K3D.paint('pf2-leaf', 256, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(2, h / 2);
    c.bezierCurveTo(w * 0.25, -h * 0.05, w * 0.8, h * 0.05, w - 2, h / 2); c.bezierCurveTo(w * 0.8, h * 0.95, w * 0.25, h * 1.05, 2, h / 2); c.fill();
    // a pale midrib and veins, a darker edge
    c.strokeStyle = 'rgba(255,255,230,0.9)'; c.lineWidth = 3; c.beginPath(); c.moveTo(4, h / 2); c.lineTo(w - 8, h / 2); c.stroke();
    c.strokeStyle = 'rgba(220,240,200,0.55)'; c.lineWidth = 1.5;
    for (let i = 1; i < 11; i++) { const x = i / 11 * w * 0.92; for (const sy of [-1, 1]) { c.beginPath(); c.moveTo(x, h / 2); c.quadraticCurveTo(x + 14, h / 2 + sy * 20, x + 26, h / 2 + sy * (h * 0.4 - Math.abs(x / w - 0.5) * 30)); c.stroke(); } }
    c.globalCompositeOperation = 'source-atop'; const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,30,10,0.35)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,30,10,0.35)'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    // a few nibbled notches (banana leaves split)
    c.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 5; i++) { const x = 40 + i * 42; c.beginPath(); c.moveTo(x, i % 2 ? 0 : h); c.lineTo(x + 6, h / 2 + (i % 2 ? -12 : 12)); c.lineTo(x + 10, i % 2 ? 0 : h); c.fill(); }
  });
  const frondTex = () => K3D.paint('pf2-frond', 256, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#f0f8e0'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
    c.fillStyle = '#ffffff';
    for (let x = 6; x < w - 6; x += 7) { const l = (h / 2 - 2) * Math.sin(Math.PI * (0.15 + 0.85 * x / w)); for (const sy of [-1, 1]) { c.beginPath(); c.moveTo(x, h / 2); c.lineTo(x + 10, h / 2 + sy * l); c.lineTo(x + 5, h / 2); c.fill(); } }
  });
  const barkTex = () => K3D.paint('pf2-palmBark', 64, 256, (c, w, h) => {
    c.fillStyle = '#6a4a34'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) { c.fillStyle = '#4a3226'; c.fillRect(0, y, w, 4); c.fillStyle = 'rgba(255,220,170,0.15)'; c.fillRect(0, y + 5, w, 3); for (let x = 0; x < w; x += 8) { c.fillStyle = 'rgba(30,20,10,0.25)'; c.fillRect(x, y + 4, 2, 10); } }
  }, { repeat: true });
  const rockTex = () => K3D.paint('pf2-rockWall', 256, 256, (c, w, h) => {
    c.fillStyle = '#4a4656'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const x = Math.random() * w, y = Math.random() * h, r = 10 + Math.random() * 30; c.fillStyle = `hsl(${245 + Math.random() * 30}, ${8 + Math.random() * 8}%, ${26 + Math.random() * 16}%)`; c.beginPath(); c.ellipse(x, y, r * 1.4, r, Math.random(), 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,255,255,0.06)'; c.beginPath(); c.ellipse(x - r * 0.2, y - r * 0.3, r, r * 0.4, 0, 0, Math.PI * 2); c.fill(); }
    // moss creeping down from the top and ferns of wet green near the water
    for (let i = 0; i < 160; i++) { const x = Math.random() * w, y = h * (0.55 + Math.random() * 0.45); c.fillStyle = `rgba(${50 + Math.random() * 40},${110 + Math.random() * 60},${60 + Math.random() * 30},${0.35 + Math.random() * 0.4})`; c.beginPath(); c.arc(x, y, 2 + Math.random() * 7, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = 'rgba(20,30,40,0.35)'; c.fillRect(0, 0, w, h * 0.12);
  }, { repeat: true });
  const plankTex = (col, key) => K3D.paint('pf2-planks|' + col + key, 256, 256, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) { const l = Math.random() * 0.25; c.fillStyle = `rgba(0,0,0,${0.1 + l})`; c.fillRect(0, y, w, 32); c.fillStyle = 'rgba(255,230,190,0.12)'; c.fillRect(0, y + 2, w, 3); c.fillStyle = 'rgba(20,10,5,0.55)'; c.fillRect(0, y + 30, w, 2); for (let k = 0; k < 6; k++) { c.fillStyle = 'rgba(40,20,10,0.25)'; c.fillRect(Math.random() * w, y + 6 + Math.random() * 20, 20 + Math.random() * 60, 1); } }
    for (let x = 0; x < w; x += 128) { c.fillStyle = 'rgba(20,10,5,0.6)'; c.fillRect(x, 0, 3, h); for (let y = 8; y < h; y += 32) { c.fillStyle = '#c8c0b0'; c.fillRect(x + 6, y, 3, 3); } }
  }, { repeat: true });
  // the mill's walls: planks, and lit windows (their own glow map)
  const millWin = (c, w, h, lit) => { for (let i = 0; i < 2; i++) { const x = 34 + i * 128, y = 70; c.fillStyle = lit ? '#ffcf7a' : '#3a2a20'; c.fillRect(x, y, 60, 80); if (lit) { const g = c.createRadialGradient(x + 30, y + 50, 4, x + 30, y + 50, 60); g.addColorStop(0, '#fff2c0'); g.addColorStop(1, '#e88a3a'); c.fillStyle = g; c.fillRect(x, y, 60, 80); } c.fillStyle = lit ? '#1a1010' : '#2a1d17'; c.fillRect(x + 28, y, 4, 80); c.fillRect(x, y + 38, 60, 4); if (!lit) { c.fillStyle = '#5a3a28'; c.fillRect(x - 6, y - 8, 72, 8); c.fillRect(x - 6, y + 80, 72, 8); } } };
  const millWallTex = () => K3D.paint('pf2-millWall', 256, 256, (c, w, h) => { c.drawImage(plankTex('#7a4e34', 'm').image, 0, 0); millWin(c, w, h, false); }, { repeat: true });
  const millGlowTex = () => K3D.paint('pf2-millGlow', 256, 256, (c, w, h) => { c.fillStyle = '#000000'; c.fillRect(0, 0, w, h); millWin(c, w, h, true); }, { repeat: true });
  const roofTex = () => K3D.paint('pf2-shingles', 256, 256, (c, w, h) => {
    c.fillStyle = '#5a2a2e'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 20) for (let x = (y / 20) % 2 ? -16 : 0; x < w; x += 32) { c.fillStyle = `hsl(${352 + Math.random() * 14}, ${30 + Math.random() * 15}%, ${22 + Math.random() * 12}%)`; c.beginPath(); c.moveTo(x + 1, y); c.lineTo(x + 31, y); c.lineTo(x + 31, y + 16); c.quadraticCurveTo(x + 16, y + 23, x + 1, y + 16); c.fill(); }
    for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(80,140,90,0.3)'; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 3 + Math.random() * 6, 0, Math.PI * 2); c.fill(); }
  }, { repeat: true });
  const streamTex = () => K3D.paint('pf2-stream', 64, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const x = Math.random() * w, y = Math.random() * h, l = 20 + Math.random() * 60; const g = c.createLinearGradient(0, y, 0, y + l); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(235,248,255,${0.4 + Math.random() * 0.5})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x, y, 1.5 + Math.random() * 3, l); if (y + l > h) c.fillRect(x, y - h, 2, l); }
  }, { repeat: true });
  const spiralTex = () => K3D.paint('pf2-spiral', 512, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.translate(w / 2, h / 2);
    for (let arm = 0; arm < 5; arm++) for (let k = 0; k < 260; k++) { const u = k / 260, a = arm / 5 * Math.PI * 2 + u * 9, r = 12 + u * 238; c.fillStyle = `rgba(230,246,255,${(1 - u) * 0.15 + u * 0.55 * (0.5 + Math.random() * 0.5)})`; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, 2 + u * 9 * Math.random(), 0, Math.PI * 2); c.fill(); }
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 60); g.addColorStop(0, 'rgba(5,15,30,0.95)'); g.addColorStop(1, 'rgba(5,15,30,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 60, 0, Math.PI * 2); c.fill();
  });
  const ringTex = () => K3D.paint('pf2-warnRing', 128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#ffffff'; c.lineWidth = 10; c.beginPath(); c.arc(64, 64, 52, 0, Math.PI * 2); c.stroke(); c.lineWidth = 4; c.setLineDash([10, 8]); c.beginPath(); c.arc(64, 64, 36, 0, Math.PI * 2); c.stroke(); });
  const hazTex = () => PARK.stripes('#ffd23a', '#2a2235', 8);

  /* ---------- the banks of each stretch ---------- */
  function rockBanks(K, s0, s1) {
    const mat = K3D.toon('#ffffff', { map: rockTex(), side: T.DoubleSide }), moss = K3D.toon('#3f6a3e', { side: T.DoubleSide });
    for (const side of [-1, 1]) {
      // a rough wall of rock (bulging in and out), then a mossy lip back to the ground
      const prof = (s, f) => {
        const w = PR.w(s), out = R.local(s, side * (w + 2.2), 0, f), gy = H.groundAt(out[0], out[2]), wy = f.p[1], top = Math.max(gy - wy, 0.5) + 0.35;
        const b1 = 0.25 * Math.sin(s * 0.9 + side) + 0.18 * Math.sin(s * 2.3), b2 = 0.3 * Math.sin(s * 0.53 + 2 * side);
        return [[side * (w - 0.1), -0.8], [side * (w + 0.05 + b1 * 0.5), top * 0.35], [side * (w + 0.35 + b2), top * 0.75], [side * (w + 0.2 + b1), top]];
      };
      sweep(K, s0, s1, 0.8, prof, mat, { uAcross: 2.5, vLen: 2.5 });
      sweep(K, s0, s1, 0.8, (s, f) => { const p = prof(s, f), t = p[3], w = PR.w(s), out = R.local(s, side * (w + 2.6), 0, f), gy = H.groundAt(out[0], out[2]) - f.p[1]; return [[t[0], t[1]], [side * (w + 1.2), Math.max(t[1] - 0.1, gy + 0.15)], [side * (w + 2.6), gy - 0.05]]; }, moss);
    }
  }
  // painted wooden trough of the lifts and chutes: inside faces, the rim, the outside down to the floor, the floor
  function trough(K, s0, s1) {
    const wood = K3D.toon('#ffffff', { map: plankTex('#a8483a', 't'), side: T.DoubleSide }), rim = K3D.toon('#f2e6c8'), under = K3D.toon('#ffffff', { map: PARK.wood('#5a3a28'), side: T.DoubleSide });
    for (const side of [-1, 1]) {
      sweep(K, s0, s1, 0.5, (s) => { const w = PR.w(s); return [[side * (w - 0.02), -0.9], [side * w, 0.75], [side * (w + 0.32), 0.75], [side * (w + 0.32), -1.1]]; }, wood, { uAcross: 2, vLen: 2, ink: 0.6 });
      sweep(K, s0, s1, 0.5, (s) => { const w = PR.w(s); return [[side * (w - 0.1), 0.75], [side * (w - 0.1), 0.92], [side * (w + 0.42), 0.92], [side * (w + 0.42), 0.75]]; }, rim);
    }
    sweep(K, s0, s1, 0.5, (s) => { const w = PR.w(s); return [[-(w + 0.32), -1.1], [w + 0.32, -1.1]]; }, under, { uAcross: 2 });
    // bulbs along both rims (each lift's chase runs uphill)
    for (let s = s0; s < s1; s += 1.0) { const w = PR.w(s); for (const side of [-1, 1]) { const p = CW(s, side * (w + 0.16), 1.0); B.add(p[0], p[1], p[2], Math.floor(s) % 3 === 0 ? '#ff6a8a' : '#ffe07a', { size: 0.07, speed: 6, phase: -s * 0.9 }); } }
  }
  // timber trestle legs and braces under every raised part of the channel
  function trestles(K, s0, s1) {
    const legs = [];
    let k = 0;
    for (let s = s0; s < s1; s += 2.2, k++) {
      const f = R.at(s), w = PR.w(s), gy = H.groundAt(f.p[0], f.p[2]), fy = f.p[1] - 1.1;
      if (fy < gy + 0.4) continue;
      const a = [], b = [];
      for (const side of [-1, 1]) {
        const top = R.local(s, side * (w + 0.1), -1.1, f), foot = R.local(s, side * (w + 0.6 + (fy - gy) * 0.12), 0, f); foot[1] = H.groundAt(foot[0], foot[2]);
        legs.push({ a: new T.Vector3(...foot), b: new T.Vector3(...top), t: 0.3 });
        a.push(foot); b.push(top);
      }
      // a cap beam under the floor, and braces across (an X every other bent, a rail every 3 units of height)
      legs.push({ a: new T.Vector3(...R.local(s, -(w + 0.7), -1.25, f)), b: new T.Vector3(...R.local(s, w + 0.7, -1.25, f)), t: 0.26 });
      const h = fy - gy;
      for (let y = 3; y < h - 0.5; y += 3) { const l = R.local(s, -(w + 0.6 + (h - y) * 0.12), -1.1 - y, f), r = R.local(s, w + 0.6 + (h - y) * 0.12, -1.1 - y, f); legs.push({ a: new T.Vector3(...l), b: new T.Vector3(...r), t: 0.18 }); }
      if (k % 2 === 0 && h > 1.5) { legs.push({ a: new T.Vector3(...a[0]), b: new T.Vector3(...b[1]), t: 0.16 }); legs.push({ a: new T.Vector3(...a[1]), b: new T.Vector3(...b[0]), t: 0.16 }); }
      // braces along the run, between this bent and the next
      if (k % 2 === 1 && h > 2.5) { const s2 = Math.min(s1, s + 2.2), f2 = R.at(s2); for (const side of [-1, 1]) { const p1 = R.local(s, side * (w + 0.4), -1.1 - h * 0.5, f), p2 = R.local(s2, side * (w + 0.4), -1.2, f2); legs.push({ a: new T.Vector3(...p1), b: new T.Vector3(...p2), t: 0.14 }); } }
    }
    beams(K, legs, K3D.toon('#ffffff', { map: PARK.wood('#7a5a44') }));
  }
  // the belt up a lift: two chains and cleats across the floor (moved every frame)
  function belt(K, lf) {
    const n = Math.floor((lf.s1 - lf.s0) / 0.9);
    const im = new T.InstancedMesh(K3D.geo('pf2-cleat', () => new T.BoxGeometry(1, 0.12, 0.22)), K3D.toon('#3a3448'), n); im.frustumCulled = false; K.add(im);
    const ch = new T.InstancedMesh(K3D.geo('pf2-link', () => new T.TorusGeometry(0.11, 0.035, 6, 10).rotateY(Math.PI / 2)), K3D.toon('#b8b4c8'), n * 4); ch.frustumCulled = false; K.add(ch);
    return { lf, n, im, ch, off: 0 };
  }
  function beltPose(b, dt) {
    b.off = (b.off + dt * 2.0) % 0.9;
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(), pv = new T.Vector3();
    for (let i = 0; i < b.n; i++) {
      const s = b.lf.s0 + i * 0.9 + b.off, f = R.at(s), w = PR.w(s);
      e.set(-f.pitch, f.yaw, 0, 'YXZ'); q.setFromEuler(e);
      pv.set(...R.local(s, 0, -0.02, f)); m4.compose(pv, q, sc.set(w * 1.1, 1, 1)); b.im.setMatrixAt(i, m4); // (the cleats' tops just break the thin sheet of water on the belt, so the belt is seen hauling the log up)
      for (let k = 0; k < 4; k++) { const ss = s + (k % 2) * 0.45, ff = R.at(ss); pv.set(...R.local(ss, (k < 2 ? -1 : 1) * w * 0.55, 0.02, ff)); e.set(-ff.pitch + (k % 2) * Math.PI / 2, ff.yaw, 0, 'YXZ'); q.setFromEuler(e); m4.compose(pv, q, sc.set(1, 1, 1)); b.ch.setMatrixAt(i * 4 + k, m4); }
    }
    b.im.instanceMatrix.needsUpdate = b.ch.instanceMatrix.needsUpdate = true;
  }
  // a big gear wheel (toothed) beside the top of a lift, turning with the belt
  function gear(K, r, col) {
    const sh = new T.Shape(), n = Math.round(r * 9);
    for (let i = 0; i < n * 4; i++) { const a = i / (n * 4) * Math.PI * 2, rr = (i % 4 < 2) ? r : r * 0.86; if (i) sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    const hole = new T.Path(); hole.absarc(0, 0, r * 0.18, 0, Math.PI * 2, true); sh.holes.push(hole);
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + 0.3, hp = new T.Path(); hp.absarc(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52, r * 0.17, 0, Math.PI * 2, true); sh.holes.push(hp); }
    const g = mesh(new T.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1, curveSegments: 6 }).translate(0, 0, -0.1), tm(col));
    g.userData.live = true; return g;
  }
  function liftTop(K, s, big) {
    // the motor house beside the top of the lift: a shed with a lit window, the gears turning on its wall
    const f = R.at(s), w = PR.w(s), g = new T.Group(); place(g, s, -(w + 2.6), 0); K.add(g);
    const wood = K3D.toon('#ffffff', { map: plankTex('#5a7a8a', 'h') });
    const house = mesh(new T.BoxGeometry(3.2, 2.8, 3.6), wood); house.position.set(-0.6, 0.9, 0); g.add(house);
    const roof = mesh(new T.ConeGeometry(2.8, 1.4, 4).rotateY(Math.PI / 4), tm('#3a3448')); roof.position.set(-0.6, 3.0, 0); g.add(roof);
    const win = new T.Mesh(new T.PlaneGeometry(1.0, 0.8), fm('#ffd89a', 1.4)); win.position.set(1.01, 1.1, 0); win.rotation.y = Math.PI / 2; g.add(win);
    // the floor under it on a little deck of the trestle
    const deck = mesh(new T.BoxGeometry(4.4, 0.25, 4.6), K3D.toon('#ffffff', { map: PARK.wood('#7a5a44') })); deck.position.set(-0.4, -0.65, 0); g.add(deck);
    const g1 = gear(K, big ? 1.6 : 1.1, '#c8a050'), g2 = gear(K, big ? 0.9 : 0.7, '#9aa0b8');
    g1.position.set(1.25, 1.2, -0.4); g1.rotation.y = Math.PI / 2; g.add(g1); g2.position.set(1.3, 2.2 + (big ? 0.4 : 0.1), 1.0); g2.rotation.y = Math.PI / 2; g.add(g2);
    const lamp = new T.Mesh(K3D.geo('pf2-beacon', () => new T.SphereGeometry(0.22, 12, 8)), fm('#ff5a3a', 2.2)); lamp.position.set(-0.6, 3.85, 0); g.add(lamp);
    g.updateMatrixWorld(true);
    const lp = new T.Vector3(-0.6, 3.85, 0).applyMatrix4(g.matrixWorld); PARK.halo(K, lp.x, lp.y, lp.z, 2.6, '#ff6a4a', 0.5);
    return { g, g1, g2, lamp };
  }
  function smile(K, s) {
    // the photo camera on a gantry over the brink of the big drop, and its sign
    const f = R.at(s), w = PR.w(s), g = new T.Group(); place(g, s, 0, 0); K.add(g);
    const steel = tm('#d8d0e8');
    for (const sx of [-1, 1]) { const po = mesh(new T.CylinderGeometry(0.12, 0.14, 5.2, 8), steel); po.position.set(sx * (w + 0.6), 1.8, 0); g.add(po); }
    const bar = mesh(new T.BoxGeometry(2 * w + 1.6, 0.3, 0.3), steel); bar.position.set(0, 4.3, 0); g.add(bar);
    const sg = PARK.neon(K, 'SMILE!', { w: 3.2, h: 0.9, col: '#ffd24a', k: 2.6 }); sg.position.set(0, 5.1, 0.1); sg.rotation.y = 0; g.add(sg);
    // facing up the lift: the camera box hangs off the bar looking back at the riders
    const cam = mesh(K3D.roundBox(0.8, 0.55, 0.6, 0.12, 6), tm('#2a2438')); cam.position.set(w * 0.5, 3.75, 0); g.add(cam);
    const lens = mesh(new T.CylinderGeometry(0.18, 0.2, 0.3, 14).rotateX(Math.PI / 2), tm('#1a1a22')); lens.position.set(w * 0.5, 3.75, 0.4); g.add(lens);
    const flash = new T.Mesh(new T.PlaneGeometry(0.5, 0.25), K3D.flat('#ffffff')); flash.userData.live = true; flash.position.set(w * 0.5, 4.15, 0.31); g.add(flash);
    // (place() turns local +Z upstream: the sign and the lens face the riders coming up)
    return { g, flash };
  }

  /* ---------- the jungle ---------- */
  const LEAFG = ['#2f7a3e', '#3e8a3a', '#24683e', '#4a9a44', '#2a6050', '#5aa24a', '#1f5a3a'];
  function leafGeo(len, wid, bend, key) {
    return K3D.geo('pf2-leafG|' + key, () => { const g = new T.PlaneGeometry(1, wid / len, 8, 2).translate(0.5, 0, 0); const a = g.attributes.position; for (let i = 0; i < a.count; i++) { const x = a.getX(i), y = a.getY(i); a.setXYZ(i, x, -x * x * bend + Math.abs(y) * 0.25, -y); } g.rotateX(0); g.computeVertexNormals(); g.scale(len, len, len); return g; });
  }
  function jungle(K, s0, s1) {
    const leaves = [], fronds = [], trunks = [], rocks = [], blooms = [], shrooms = [], torches = [];
    const leafM = K3D.toon('#ffffff', { map: leafTex(), side: T.DoubleSide, alphaTest: 0.4 });
    const frondM = K3D.toon('#ffffff', { map: frondTex(), side: T.DoubleSide, alphaTest: 0.4 });
    const near = s => L.lifts.some(l => s > l.s0 - 4 && s < l.s1 + 4);
    const clump = (x, y, z, n, sz, low) => { const c = LEAFG[Math.floor(rnd() * LEAFG.length)]; for (let i = 0; i < n; i++) leaves.push({ p: [x, y + 0.1, z], yaw: i / n * 6.28 + rnd() * 0.6, pitch: 0, roll: (low ? 0.25 : 0.55) + rnd() * 0.6, s: sz * (0.7 + rnd() * 0.6), col: c }); };
    const palm = (x, y, z, h) => {
      const yaw = rnd() * 6.28, lean = 0.12 + rnd() * 0.2;
      trunks.push({ p: [x, y, z], yaw, s: [h / 8, h / 8, h / 8] });
      // the top of the leaning, curving trunk (its geometry leans along +X)
      const top = new T.Vector3(1.4 * lean / 0.2 * h / 8, h, 0).applyAxisAngle(UP, yaw);
      for (let i = 0; i < 9; i++) fronds.push({ p: [x + top.x, y + top.y, z + top.z], yaw: i / 9 * 6.28 + rnd() * 0.3, roll: -0.15 + rnd() * 0.5, s: 3.2 + rnd() * 1.4, col: LEAFG[(i + 2) % LEAFG.length] });
      blooms.push({ p: [x + top.x, y + top.y - 0.2, z + top.z], s: 0.9, col: '#6a4a24' }); // (coconuts)
    };
    for (let s = s0; s < s1; s += 1.5) {
      if (near(s)) continue;
      const f = R.at(s), w = PR.w(s), isl = PARKFLUME.islandAt(s);
      for (const side of [-1, 1]) {
        for (let k = 0; k < 2; k++) {
          const d = w + 1.0 + Math.pow(rnd(), 1.6) * 18 + (isl ? 0 : 0), p = R.local(s + rnd() * 1.5, side * d, 0, f);
          if (!dry(p[0], p[2], 1.2)) continue;
          const gy = H.groundAt(p[0], p[2]), r = rnd();
          // (each thing asks for its patch: no trunk through a rock, no rock through a ruin; leaves may crowd round)
          if (r < 0.62) { if (!H.clear(p[0], p[2], 0.45)) continue; }
          else if (!H.claim(p[0], p[2], r < 0.71 ? 0.9 : r < 0.79 ? 1.7 : r < 0.88 ? 0.7 : r < 0.95 ? 0.9 : 2.0)) continue;
          if (r < 0.42) clump(p[0], gy, p[2], 5 + Math.floor(rnd() * 4), 1.4 + rnd() * 1.6 + (d > w + 6 ? 0.8 : 0));
          else if (r < 0.62) clump(p[0], gy, p[2], 7, 0.9 + rnd() * 0.4, true);
          else if (r < 0.71) palm(p[0], gy, p[2], 6 + rnd() * 4);
          else if (r < 0.79) rocks.push({ p: [p[0], gy + 0.1, p[2]], yaw: rnd() * 6, s: [1.2 + rnd() * 2, 0.8 + rnd() * 1.4, 1.2 + rnd() * 2], col: ['#5a5868', '#4a5a50', '#62606e'][Math.floor(rnd() * 3)] });
          else if (r < 0.88) { blooms.push({ p: [p[0], gy + 0.5, p[2]], s: 0.8 + rnd() * 0.6, col: ['#ff5a8a', '#ff8a3a', '#ffd23a', '#c85aff'][Math.floor(rnd() * 4)], flower: true }); clump(p[0], gy, p[2], 4, 1.0); }
          else if (r < 0.95) { for (let m = 0; m < 4; m++) shrooms.push({ p: [p[0] + (rnd() - 0.5) * 1.4, gy, p[2] + (rnd() - 0.5) * 1.4], s: 0.5 + rnd() * 0.8, col: ['#7af0ff', '#9aff8a', '#ff9ad6'][Math.floor(rnd() * 3)] }); }
          else if (d > w + 4) jtree(K, p[0], gy, p[2], 1 + rnd() * 0.5);
        }
      }
      // tiki torches along the water's edge, every 11 or so, both sides turn about
      if (Math.floor(s / 1.5) % 7 === 0) { const side = Math.floor(s / 10.5) % 2 ? 1 : -1, p = R.local(s, side * (w + 1.1), 0, f), gy = H.groundAt(p[0], p[2]); if (dry(p[0], p[2], 0.6) && H.claim(p[0], p[2], 0.5)) torches.push([p[0], Math.max(gy, f.p[1] + 0.5), p[2], f.p[1]]); }
    }
    inst(K, leafGeo(1, 0.45, 0.32, 'broad'), leafM, leaves, { ink: false, cast: true });
    inst(K, leafGeo(1, 0.22, 0.42, 'frond'), frondM, fronds, { ink: false, cast: true });
    const trunkGeo = K3D.geo('pf2-palmTrunk', () => { const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(new T.Vector3(1.4 * u * u, u * 8, 0)); } return new T.TubeGeometry(new T.CatmullRomCurve3(pts), 16, 0.22, 8).scale(1, 1, 1); });
    inst(K, trunkGeo, K3D.toon('#ffffff', { map: barkTex() }), trunks, { cast: true });
    inst(K, K3D.geo('pf-rock', () => { const g = new T.IcosahedronGeometry(0.5, 1); const a = g.attributes.position; for (let i = 0; i < a.count; i++) { const k = 0.8 + Math.sin(a.getX(i) * 7 + a.getZ(i) * 5) * 0.2; a.setXYZ(i, a.getX(i) * k, a.getY(i) * k * 0.7, a.getZ(i) * k); } g.computeVertexNormals(); return g; }), K3D.toon('#ffffff', { map: rockTex() }), rocks, { cast: true });
    const coco = blooms.filter(b => !b.flower), fl = blooms.filter(b => b.flower);
    inst(K, K3D.geo('pf2-coconuts', () => new T.SphereGeometry(0.22, 8, 6).translate(0.25, 0, 0)), K3D.toon('#6a4a24'), coco.map(c => ({ p: c.p, yaw: rnd() * 6, s: 1 })), { ink: 0.4 });
    // giant glowing jungle flowers (a ring of petals and a bright heart) and glowing mushrooms
    const petal = K3D.geo('pf2-bloom', () => { const parts = []; for (let i = 0; i < 6; i++) { const g = new T.SphereGeometry(0.35, 8, 6).scale(1, 0.25, 0.55).translate(0.4, 0, 0).rotateZ(0.35).rotateY(i / 6 * 6.28); parts.push(g.toNonIndexed()); } const pos = []; for (const g of parts) pos.push(...g.attributes.position.array); const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; });
    const fim = inst(K, petal, K3D.toon('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.35 }), fl.map(b => ({ p: b.p, yaw: rnd() * 6, s: b.s, col: b.col })), { ink: 0.4 });
    for (const b of fl) { B.add(b.p[0], b.p[1] + 0.12, b.p[2], '#fff2a0', { size: 0.12 * b.s }); }
    void fim;
    const cap = K3D.geo('pf2-shroom', () => { const c = new T.SphereGeometry(0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.42, 0); const st2 = new T.CylinderGeometry(0.07, 0.1, 0.45, 6).translate(0, 0.22, 0); const pos = [...c.toNonIndexed().attributes.position.array, ...st2.toNonIndexed().attributes.position.array]; const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; });
    const sim = new T.InstancedMesh(cap, new T.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), Math.max(1, shrooms.length));
    { const m4 = new T.Matrix4(), c = new T.Color(); shrooms.forEach((m, k) => { m4.makeScale(m.s, m.s, m.s).setPosition(m.p[0], m.p[1], m.p[2]); sim.setMatrixAt(k, m4); sim.setColorAt(k, c.set(m.col).multiplyScalar(1.3)); }); sim.count = shrooms.length; K.add(sim); }
    for (let k = 0; k < shrooms.length; k += 4) PARK.halo(K, shrooms[k].p[0], shrooms[k].p[1] + 0.5, shrooms[k].p[2], 2.6, shrooms[k].col, 0.25);
    // the torches
    const flames = [];
    for (const [x, y, z, wy] of torches) {
      const g = new T.Group(); g.position.set(x, y, z); K.add(g);
      const pole = mesh(K3D.geo('pf2-tikiPole', () => new T.CylinderGeometry(0.08, 0.11, 2.6, 7).translate(0, 1.3, 0)), K3D.toon('#ffffff', { map: barkTex() }), { ink: INK, inkW: 0.5 }); g.add(pole);
      const bowl = mesh(K3D.geo('pf2-tikiBowl', () => new T.CylinderGeometry(0.22, 0.14, 0.4, 8)), tm('#3a2a22'), { ink: INK, inkW: 0.5 }); bowl.position.y = 2.7; g.add(bowl);
      const fl2 = new T.Mesh(K3D.geo('pf2-flame', () => new T.ConeGeometry(0.2, 0.7, 8).translate(0, 0.35, 0)), fm('#ffb040', 2.4)); fl2.position.y = 2.85; fl2.userData.live = true; g.add(fl2);
      const fl3 = new T.Mesh(K3D.geo('pf2-flameIn', () => new T.ConeGeometry(0.11, 0.42, 8).translate(0, 0.21, 0)), fm('#fff0a0', 3)); fl3.position.y = 2.88; fl3.userData.live = true; g.add(fl3);
      flames.push({ a: fl2, b: fl3, ph: rnd() * 6 });
      PARK.halo(K, x, y + 3.1, z, 3.4, '#ff9a3a', 0.5);
      W.reflect(x, wy, z, '#ff9a3a', 5, 0.9, 0.5);
    }
    // vines across the river, with leaves; every other one a string of paper lanterns as well
    const vleaves = [];
    let vk = 0;
    for (let s = s0 + 6; s < s1 - 4; s += 12, vk++) {
      if (near(s) || L.arches.some(a => Math.abs(a - s) < 5)) continue;
      const f = R.at(s), w = PR.w(s), wy = f.p[1];
      // (each end is tied round the trunk of a great tree standing on the bank)
      const a = R.local(s, -(w + 3.6), 0, f), b = R.local(s + 2, w + 3.6, 0, f);
      if (!dry(a[0], a[2], 1.6) || !dry(b[0], b[2], 1.6) || !H.clear(a[0], a[2], 1.2) || !H.clear(b[0], b[2], 1.2)) continue;
      for (const e of [a, b]) { const gy = H.groundAt(e[0], e[2]); H.mark(e[0], e[2], 2.0); jtree(K, e[0], gy, e[2], 1.15 + rnd() * 0.25); e[1] = gy + 9.6 + rnd() * 1.2; }
      const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push(new T.Vector3(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - Math.sin(u * Math.PI) * 2.2, a[2] + (b[2] - a[2]) * u)); }
      const cv = new T.CatmullRomCurve3(pts);
      K.add(mesh(new T.TubeGeometry(cv, 30, 0.07, 5), tm('#3a4a2a'), { ink: INK, inkW: 0.4 }));
      for (let i = 1; i < 26; i++) { const p = cv.getPointAt(i / 26); vleaves.push({ p: [p.x, p.y, p.z], yaw: rnd() * 6.28, roll: -0.9 - rnd() * 0.5, s: 0.5 + rnd() * 0.3, col: LEAFG[i % LEAFG.length] }); if (i % 6 === 3) { const hang = 1 + rnd() * 2.5; K.add(mesh(new T.CylinderGeometry(0.03, 0.03, hang, 4).translate(0, -hang / 2, 0), tm('#3a5a2a'), false)).position.set(p.x, p.y, p.z); } }
      if (vk % 2 === 0) PARK.lanterns(K, B, [a[0], a[1] - 0.6, a[2]], [b[0], b[1] - 0.6, b[2]], { sag: 1.6, c: vk });
      else for (let i = 1; i < 12; i++) { const p = cv.getPointAt(i / 12); B.add(p.x, p.y - 0.1, p.z, i % 2 ? '#b8ff8a' : '#ffe07a', { size: 0.07, speed: 2, phase: i }); }
    }
    inst(K, leafGeo(1, 0.45, 0.32, 'broad'), leafM, vleaves, { ink: false });
    // mist hanging over the water
    for (let s = s0 + 4; s < s1; s += 9) { const f = R.at(s), p = R.local(s, (rnd() - 0.5) * PR.w(s), 0.9, f); PARK.halo(K, p[0], p[1], p[2], 10 + rnd() * 6, '#9ab8d0', 0.07); }
    return { flames };
  }
  function jtree(K, x, y, z, s) {
    const g = new T.Group(); g.position.set(x, y, z); g.scale.setScalar(s); K.add(g);
    const bark = tm('#4a3a32');
    const tr = mesh(K3D.geo('pf2-jTrunk', () => new T.CylinderGeometry(0.45, 0.7, 11, 9).translate(0, 5.5, 0)), bark); g.add(tr);
    for (let i = 0; i < 4; i++) { const r = mesh(K3D.geo('pf2-root', () => new T.ConeGeometry(0.5, 2.4, 4).rotateZ(0.9).translate(0.7, 0.5, 0)), bark); r.rotation.y = i * 1.57 + 0.4; g.add(r); }
    const c = ['#1f5a3a', '#245e30', '#2f6a3a'][Math.floor(rnd() * 3)];
    for (let i = 0; i < 5; i++) { const b = mesh(K3D.geo('pf2-jCrown', () => new T.IcosahedronGeometry(2.4, 1).scale(1, 0.6, 1)), tm(c), { ink: '#0e2420' }); const a = i / 5 * 6.28; b.position.set(Math.cos(a) * 2.2, 10.5 + (i % 2) * 1.2, Math.sin(a) * 2.2); g.add(b); }
    const top = mesh(K3D.geo('pf2-jCrown', () => new T.IcosahedronGeometry(2.4, 1).scale(1, 0.6, 1)), tm(c), { ink: '#0e2420' }); top.position.y = 12.4; g.add(top);
    return g;
  }

  /* ---------- jungle hazards ---------- */
  function hippo(K) {
    const g = new T.Group(); g.userData.live = true; K.add(g);
    const skin = tm('#8a7aa0'), belly = tm('#b8a8c8'), pink = tm('#e87a9a'), white = tm('#f8f4ec');
    const body = mesh(new T.SphereGeometry(1, 18, 12).scale(1.25, 0.8, 1.6), skin); body.position.set(0, 0, -0.9); g.add(body);
    const head = new T.Group(); head.position.set(0, 0.2, 0.7); g.add(head);
    const skull = mesh(new T.SphereGeometry(0.75, 16, 12).scale(1.0, 0.75, 0.9), skin); skull.position.set(0, 0.35, -0.1); head.add(skull);
    for (const sx of [-1, 1]) { const e = mesh(new T.SphereGeometry(0.17, 10, 8), white); e.position.set(sx * 0.32, 0.78, 0.1); head.add(e); const pu = new T.Mesh(new T.SphereGeometry(0.08, 8, 6), fm('#1a1530')); pu.position.set(sx * 0.33, 0.8, 0.25); head.add(pu); const ear = mesh(new T.SphereGeometry(0.14, 8, 6).scale(1, 1.3, 0.5), skin); ear.position.set(sx * 0.48, 0.85, -0.35); head.add(ear); }
    // the upper jaw (snout, nostrils) swings up; the lower stays
    const up = new T.Group(); up.position.set(0, 0.25, 0.35); head.add(up);
    const snout = mesh(new T.SphereGeometry(0.6, 16, 10).scale(1.05, 0.5, 0.95), skin); snout.position.set(0, 0.08, 0.45); up.add(snout);
    for (const sx of [-1, 1]) { const n = new T.Mesh(new T.SphereGeometry(0.07, 8, 6), fm('#2a1a2a')); n.position.set(sx * 0.2, 0.32, 0.8); up.add(n); const tusk = mesh(new T.ConeGeometry(0.07, 0.3, 6).rotateX(Math.PI), white, { ink: INK, inkW: 0.4 }); tusk.position.set(sx * 0.38, -0.12, 0.65); up.add(tusk); }
    const lower = mesh(new T.SphereGeometry(0.58, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.05, 0.55, 0.95), belly); lower.position.set(0, 0.2, 0.75); head.add(lower);
    const mouth = new T.Mesh(new T.CircleGeometry(0.5, 16).rotateX(-Math.PI / 2).scale(1, 1, 0.85), pink); mouth.position.set(0, 0.22, 0.8); head.add(mouth);
    const key = mesh(K3D.geo('pk-robKey', () => new T.TorusGeometry(0.16, 0.05, 8, 16)), tm('#f2c14e')); key.scale.setScalar(2); key.position.set(0, 1.0, -1.4); g.add(key);
    const ring = new T.Mesh(new T.RingGeometry(1.4, 1.75, 32).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: '#cfe8ff', transparent: true, opacity: 0, depthWrite: false })); g.add(ring);
    return { g, up, key, ring };
  }
  function elephant(K, o) {
    // a clockwork elephant on the right bank, its trunk sweeping a jet of water right across the river
    const s = o.s, f = R.at(s), w = PR.w(s), g = new T.Group(); place(g, s, w + 2.6, 0); const gp = onGround(s, w + 2.6); g.position.y = Math.max(gp[1], f.p[1] + 0.4); K.add(g); g.userData.live = true;
    g.rotation.y = f.yaw - Math.PI / 2; // facing the river (local +Z now points to the channel's left)
    const skin = tm('#9a92b8'), dark = tm('#6a6488');
    const body = mesh(new T.SphereGeometry(1.6, 18, 14).scale(1.0, 0.85, 1.3), skin); body.position.set(0, 2.4, -1.4); g.add(body);
    for (const [lx, lz] of [[-0.8, -0.4], [0.8, -0.4], [-0.8, -2.4], [0.8, -2.4]]) { const l = mesh(K3D.geo('pf2-eLeg', () => new T.CylinderGeometry(0.42, 0.5, 1.8, 10).translate(0, 0.9, 0)), skin); l.position.set(lx, 0, lz); g.add(l); const toe = mesh(K3D.geo('pf2-eToe', () => new T.CylinderGeometry(0.52, 0.52, 0.18, 10)), tm('#f4ecd8')); toe.position.set(lx, 0.09, lz); g.add(toe); }
    const head = mesh(new T.SphereGeometry(1.0, 16, 12), skin); head.position.set(0, 3.3, 0.2); g.add(head);
    const ears = [];
    for (const sx of [-1, 1]) { const ear = new T.Group(); ear.position.set(sx * 0.8, 3.4, -0.1); g.add(ear); const e = mesh(new T.CircleGeometry(1.05, 18).scale(0.8, 1, 1), K3D.toon('#b8a8d0', { side: T.DoubleSide })); e.position.set(sx * 0.75, 0, 0); e.rotation.y = sx * 1.2; ear.add(e); ears.push(ear); }
    for (const sx of [-1, 1]) { const ey = new T.Mesh(new T.SphereGeometry(0.11, 8, 6), fm('#1a1530')); ey.position.set(sx * 0.42, 3.6, 0.95); g.add(ey); const tusk = mesh(new T.ConeGeometry(0.1, 0.8, 8).rotateX(Math.PI / 2 + 0.5), tm('#f8f4ec')); tusk.position.set(sx * 0.4, 2.85, 1.0); g.add(tusk); }
    // the howdah: a little striped canopy with bulbs
    const hw = mesh(new T.BoxGeometry(1.8, 0.5, 1.8), tm('#c84a3a')); hw.position.set(0, 3.95, -1.5); g.add(hw);
    const canopy = mesh(new T.ConeGeometry(1.5, 1.0, 4).rotateY(Math.PI / 4), K3D.toon('#ffffff', { map: PARK.stripes('#ffd23a', '#c84a3a', 8) })); canopy.position.set(0, 5.4, -1.5); g.add(canopy);
    for (const [px, pz] of [[-0.8, -0.7], [0.8, -0.7], [-0.8, -2.3], [0.8, -2.3]]) { const p = mesh(K3D.geo('pf2-hPost', () => new T.CylinderGeometry(0.05, 0.05, 1.0, 6)), tm('#f2c14e'), { ink: INK, inkW: 0.3 }); p.position.set(px, 4.7, pz); g.add(p); }
    // the trunk: segments that curl up and forward
    const trunk = new T.Group(); trunk.position.set(0, 3.0, 1.0); g.add(trunk);
    const segs = []; let par = trunk;
    for (let i = 0; i < 7; i++) { const sg = new T.Group(); sg.position.set(0, i ? 0 : 0, i ? 0.42 : 0); par.add(sg); const m = mesh(K3D.geo('pf2-trunkSeg|' + i, () => new T.CylinderGeometry(0.32 - i * 0.03, 0.34 - i * 0.03, 0.46, 10).rotateX(Math.PI / 2).translate(0, 0, 0.21)), i % 2 ? dark : skin, { ink: INK, inkW: 0.4 }); sg.add(m); segs.push(sg); par = sg; }
    const tip = new T.Object3D(); tip.position.set(0, 0, 0.45); par.add(tip);
    // the jet: a falling arc of water across to the far bank (built in the world, along the channel's x)
    const a = R.local(s, w - 0.2, 3.8, f), b = R.local(s, -(w + 0.4), 0.0, f);
    const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push(new T.Vector3(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + Math.sin(u * Math.PI) * 1.4, a[2] + (b[2] - a[2]) * u)); }
    const st = streamTex().clone(); st.needsUpdate = true; st.wrapS = st.wrapT = T.RepeatWrapping; st.repeat.set(3, 2);
    const jet = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, 0.32, 8), new T.MeshBasicMaterial({ map: st, color: hot('#cfeeff', 1.3), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, side: T.DoubleSide }));
    jet.userData.live = true; jet.visible = false; K.add(jet);
    const halo = PARK.halo(K, b[0], b[1] + 0.4, b[2], 4, '#cfeeff', 0); halo.userData.live = true;
    return { o, g, ears, segs, jet, tex: st, halo, foot: b };
  }
  function croc(K) {
    const g = new T.Group(); g.userData.live = true; K.add(g);
    const skin = K3D.toon('#3f7a4a'), belly = tm('#9ac88a');
    const body = mesh(new T.SphereGeometry(1, 16, 10).scale(0.55, 0.32, 1.5), skin); body.position.set(0, 0, -0.2); g.add(body);
    const tail = mesh(new T.ConeGeometry(0.4, 1.8, 10).rotateX(Math.PI / 2).scale(1, 0.6, 1), skin); tail.position.set(0, 0, -2.4); g.add(tail);
    for (let i = 0; i < 7; i++) { const sp = mesh(K3D.geo('pf2-ridge', () => new T.ConeGeometry(0.1, 0.22, 4)), tm('#2a5a36'), { ink: INK, inkW: 0.3 }); sp.position.set(0, 0.3 - i * 0.02, 0.6 - i * 0.45); g.add(sp); }
    const jaw = new T.Group(); jaw.position.set(0, 0.05, 1.2); g.add(jaw);
    const top = mesh(new T.BoxGeometry(0.62, 0.22, 1.3).translate(0, 0.1, 0.62), skin); jaw.add(top);
    const low = mesh(new T.BoxGeometry(0.56, 0.16, 1.2).translate(0, -0.1, 0.58), belly); g.add(low); low.position.set(0, 0.05, 1.2);
    for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) { const tooth = mesh(K3D.geo('pf2-tooth', () => new T.ConeGeometry(0.04, 0.12, 4).rotateX(Math.PI)), tm('#f8f4ec'), false); tooth.position.set(sx * 0.27, -0.02, 0.25 + i * 0.2); jaw.add(tooth); }
    const eyes = [];
    for (const sx of [-1, 1]) { const bump = mesh(new T.SphereGeometry(0.15, 10, 8), skin); bump.position.set(sx * 0.22, 0.3, 1.2); g.add(bump); const e = new T.Mesh(new T.SphereGeometry(0.08, 8, 6), K3D.flat('#ffd23a')); e.position.set(sx * 0.22, 0.38, 1.3); g.add(e); eyes.push(e); }
    const glow = PARK.halo(K, 0, 0, 0, 1.6, '#ffd23a', 0); g.add(glow); glow.position.set(0, 0.45, 1.3);
    return { g, jaw, eyes, glow };
  }
  function monkey(K, o) {
    // a clockwork monkey hanging from a vine over the river, with a coconut ready
    const f = R.at(o.s), w = PR.w(o.s), g = new T.Group(); place(g, o.s, o.x, 6.4); K.add(g); g.userData.live = true;
    const fur = tm('#8a5634'), face = tm('#e8c8a0');
    const a = R.local(o.s, -(w + 3), 8.4, f), b = R.local(o.s, w + 3, 8.4, f);
    K.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(...a), new T.Vector3(...R.local(o.s, o.x, 7.4, f)), new T.Vector3(...b)]), 16, 0.08, 5), tm('#3a4a2a'), { ink: INK, inkW: 0.4 }));
    const body = mesh(new T.SphereGeometry(0.42, 12, 10).scale(1, 1.2, 0.9), fur); g.add(body);
    const head = mesh(new T.SphereGeometry(0.34, 12, 10), fur); head.position.y = 0.66; g.add(head);
    const fc = mesh(new T.SphereGeometry(0.24, 10, 8).scale(1, 0.85, 0.6), face, false); fc.position.set(0, 0.62, 0.2); g.add(fc);
    for (const sx of [-1, 1]) { const ear = mesh(new T.SphereGeometry(0.12, 8, 6), face); ear.position.set(sx * 0.34, 0.72, 0); g.add(ear); const e = new T.Mesh(new T.SphereGeometry(0.05, 6, 4), fm('#1a1530')); e.position.set(sx * 0.1, 0.72, 0.32); g.add(e); }
    const holdArm = mesh(new T.CylinderGeometry(0.07, 0.07, 1.0, 6).translate(0, 0.5, 0), fur); holdArm.position.set(0.25, 0.4, 0); holdArm.rotation.z = -0.2; g.add(holdArm);
    const arm = new T.Group(); arm.position.set(-0.3, 0.3, 0); g.add(arm);
    const am = mesh(new T.CylinderGeometry(0.07, 0.07, 0.8, 6).translate(0, -0.4, 0), fur); arm.add(am);
    const tail = mesh(new T.TorusGeometry(0.3, 0.05, 6, 12, 4.5), fur); tail.position.set(0, -0.4, -0.35); g.add(tail);
    const nut = mesh(K3D.geo('pf2-coconut', () => new T.SphereGeometry(0.26, 12, 10)), tm('#6a4a2a')); nut.userData.live = true; K.add(nut);
    const ring = new T.Mesh(new T.PlaneGeometry(2.4, 2.4).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: ringTex(), color: hot('#ff7a3a', 1.6), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
    ring.userData.live = true; ring.renderOrder = 3; K.add(ring);
    return { o, g, arm, nut, ring };
  }
  function whirl(K, wl) {
    const f = R.at(wl.s), p = R.local(wl.s, wl.x, 0.03, f);
    const disc = new T.Mesh(new T.CircleGeometry(wl.r + 0.6, 48).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: spiralTex(), transparent: true, depthWrite: false, toneMapped: false, opacity: 0.95 }));
    disc.position.set(...p); disc.renderOrder = 2; disc.userData.live = true; K.add(disc);
    const disc2 = disc.clone(); disc2.material = disc.material.clone(); disc2.material.opacity = 0.5; disc2.scale.setScalar(0.6); disc2.position.y += 0.01; K.add(disc2);
    // a ring of glowing buoys round the pool, and a sign
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28, q = R.local(wl.s + Math.sin(a) * (wl.r + 1.6), wl.x + Math.cos(a) * (wl.r + 1.6), 0, f); if (!dry(q[0], q[2], -1.4) && Math.abs(Math.cos(a)) < 0.5) continue; void q; }
    return { disc, disc2, p };
  }
  function snake(K, o) {
    // a giant painted snake arched over the river: its head on the left bank, its body over the water, the tail tip
    // hanging from the top of the arch to flick down into the water
    const s = o.s, f = R.at(s), w = PR.w(s);
    const sc = K3D.paint('pf2-snakeSkin', 256, 64, (c, ww, hh) => { c.fillStyle = '#3a8a4a'; c.fillRect(0, 0, ww, hh); for (let x = 0; x < ww; x += 32) { c.fillStyle = '#ffd23a'; c.fillRect(x, 0, 8, hh); c.fillStyle = '#1a3a2a'; c.fillRect(x + 8, 0, 3, hh); } for (let i = 0; i < 200; i++) { c.fillStyle = 'rgba(20,60,30,0.4)'; c.beginPath(); c.arc(Math.random() * ww, Math.random() * hh, 3, 0, Math.PI); c.fill(); } }, { repeat: true });
    const skin = K3D.toon('#ffffff', { map: sc });
    const pts = [];
    const lp = (x, y, ds = 0) => new T.Vector3(...R.local(s + ds, x, y, f));
    // coils on the right bank, up and over, down to the left bank where the head rears up
    pts.push(lp(w + 4.5, 0.2, -3), lp(w + 3.0, 0.4, -1), lp(w + 1.5, 1.6, 0), lp(w * 0.5, 5.6, 0.3), lp(0, 6.4, 0.5), lp(-w * 0.5, 5.6, 0.3), lp(-(w + 1.2), 1.4, 0), lp(-(w + 2.4), 0.6, 1.5), lp(-(w + 3.2), 1.2, 3), lp(-(w + 3.0), 2.6, 3.6));
    const cv = new T.CatmullRomCurve3(pts);
    const tube = new T.TubeGeometry(cv, 80, 0.55, 10); const sv = tube.attributes.uv; for (let i = 0; i < sv.count; i++) sv.setXY(i, sv.getX(i) * 12, sv.getY(i));
    K.add(mesh(tube, skin, { ink: INK, inkW: 0.8 }));
    // the head
    const hp = cv.getPointAt(1), ht = cv.getTangentAt(1);
    const head = new T.Group(); head.position.copy(hp); head.lookAt(hp.clone().add(ht)); K.add(head); head.userData.live = true;
    const hm = mesh(new T.SphereGeometry(0.85, 16, 12).scale(1, 0.6, 1.3), skin); hm.position.z = 0.6; head.add(hm);
    const eyes = [];
    for (const sx of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.16, 10, 8), fm('#ff3a3a', 2.2)); e.position.set(sx * 0.42, 0.3, 0.95); head.add(e); eyes.push(e); }
    const tongue = mesh(new T.BoxGeometry(0.08, 0.03, 0.9).translate(0, 0, 0.45), fm('#ff4a6a', 1.2), false); tongue.position.set(0, -0.1, 1.6); head.add(tongue);
    head.updateMatrixWorld(true); const ew = new T.Vector3(0, 0.3, 1.0).applyMatrix4(head.matrixWorld); PARK.halo(K, ew.x, ew.y, ew.z, 2.4, '#ff3a3a', 0.45);
    // the tail tip: hangs from the top of the arch over x = o.x, dropping into the water when on
    const tail = new T.Group(); tail.position.set(...R.local(s + 2 - 2, o.x, 6.0, R.at(o.s))); K.add(tail); tail.userData.live = true;
    const tg = new T.ConeGeometry(0.45, 6.2, 10, 6).translate(0, -3.1, 0); const tv = tg.attributes.uv; for (let i = 0; i < tv.count; i++) tv.setXY(i, tv.getX(i) * 4, tv.getY(i) * 3);
    const tm2 = mesh(tg, skin, { ink: INK, inkW: 0.6 }); tail.add(tm2);
    const rattle = mesh(new T.SphereGeometry(0.28, 10, 8).scale(1, 1.4, 1), tm('#ffd23a')); rattle.position.y = -6.1; tail.add(rattle);
    // the bulbs along its back
    for (let i = 4; i < 76; i += 3) { const p = cv.getPointAt(i / 80); B.add(p.x, p.y + 0.55, p.z, i % 2 ? '#ffd23a' : '#7aff9a', { size: 0.08, speed: 3, phase: i * 0.3 }); }
    return { o, head, tongue, eyes, tail, base: tail.position.y };
  }
  function curtain(K, o) {
    // the waterfall pouring off a rock ledge across the left arm of the fork, and the hidden temple behind it
    const s = o.s, f = R.at(s), I = PARKFLUME.islandAt(s), wy = f.p[1];
    const xi = -(I ? I.hw : 4) + 0.2, xo = -(PR.w(s) + 0.3);
    const st = streamTex().clone(); st.needsUpdate = true; st.wrapS = st.wrapT = T.RepeatWrapping; st.repeat.set(4, 1.4);
    const a = R.local(s, xo, 0, f), b = R.local(s, xi, 0, f), h = 6.5;
    const geo = new T.PlaneGeometry(1, 1, 8, 6); const pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const u = pa.getX(i) + 0.5, v = pa.getY(i) + 0.5; const bulge = Math.sin(v * Math.PI) * 0.35 * (1 - v * 0.3); pa.setXYZ(i, a[0] + (b[0] - a[0]) * u - f.t[0] * bulge, wy + v * h, a[2] + (b[2] - a[2]) * u - f.t[2] * bulge); }
    geo.computeVertexNormals();
    const mat = new T.MeshBasicMaterial({ map: st, color: hot('#d8f0ff', 1.1), transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide, toneMapped: false });
    const sheet = new T.Mesh(geo, mat); sheet.userData.live = true; sheet.renderOrder = 3; K.add(sheet);
    const back = new T.Mesh(geo, new T.MeshBasicMaterial({ color: '#8ab8d8', transparent: true, opacity: 0.25, depthWrite: false, side: T.DoubleSide })); back.userData.live = true; K.add(back);
    // the ledge: a slab of mossy rock across the top, resting on the island and the bank
    const ledge = new T.Group(); ledge.position.set((a[0] + b[0]) / 2, wy + h + 0.4, (a[2] + b[2]) / 2); ledge.rotation.y = f.yaw; K.add(ledge);
    const slab = mesh(new T.BoxGeometry(Math.abs(xi - xo) + 3, 1.0, 3.2), K3D.toon('#ffffff', { map: rockTex() })); ledge.add(slab);
    for (let i = 0; i < 6; i++) { const r = mesh(K3D.geo('pf-rock', () => new T.IcosahedronGeometry(0.5, 1)), tm('#5a5868')); r.position.set(-Math.abs(xi - xo) / 2 + i * Math.abs(xi - xo) / 5, 0.5, (rnd() - 0.5) * 2); r.scale.set(1.6, 1, 1.6); ledge.add(r); }
    for (const x of [xo - 0.6, xi + 0.6]) { const pil = mesh(new T.BoxGeometry(1.4, h + 0.5, 1.6), K3D.toon('#ffffff', { map: rockTex() })); pil.position.set(...R.local(s, x, h / 2 - 0.4, f)); pil.rotation.y = f.yaw; K.add(pil); }
    const foam = []; for (let i = 0; i <= 6; i++) { const q = R.local(s + 0.3, xo + (xi - xo) * i / 6, 0, f); foam.push({ x: q[0], y: wy, z: q[2], r: 1.2 }); } W.foamAt(foam);
    for (let i = 0; i < 3; i++) { const q = R.local(s - 0.5, xo + (xi - xo) * (i + 0.5) / 3, 1.2, f); PARK.halo(K, q[0], q[1], q[2], 7, '#cfe8ff', 0.12); }
    // the hidden temple: just past the curtain on the left bank, a stone face with glowing eyes, two idols, gold
    const ts = s + 7, tf = R.at(ts), tp = onGround(ts, -(PR.w(ts) + 3.5)), tg = new T.Group(); tg.position.set(tp[0], Math.max(tp[1], tf.p[1] + 0.5), tp[2]); tg.rotation.y = tf.yaw + Math.PI / 2; K.add(tg);
    templeFace(K, tg, 1.3);
    return { sheet, tex: st };
  }
  function templeFace(K, g, s) {
    const stone = K3D.toon('#ffffff', { map: H.stoneTex() }), moss = tm('#4a7a4a');
    for (let i = 0; i < 3; i++) { const st = mesh(new T.BoxGeometry(6 - i * 1.2, 0.5, 3 - i * 0.6), stone); st.position.set(0, 0.25 + i * 0.5, -i * 0.2); g.add(st); }
    const face = mesh(new T.BoxGeometry(3.2, 3.6, 1.6), stone); face.position.set(0, 3.3, -0.8); g.add(face);
    const brow = mesh(new T.BoxGeometry(3.4, 0.4, 0.5), moss); brow.position.set(0, 4.0, 0.1); g.add(brow);
    const nose = mesh(new T.BoxGeometry(0.5, 1.1, 0.5), stone); nose.position.set(0, 3.2, 0.15); g.add(nose);
    const mouth = mesh(new T.BoxGeometry(1.8, 0.35, 0.3), tm('#2a2232')); mouth.position.set(0, 2.2, 0.0); g.add(mouth);
    const crown = mesh(new T.ConeGeometry(1.9, 1.6, 4).rotateY(Math.PI / 4), stone); crown.position.set(0, 5.9, -0.8); g.add(crown);
    for (const sx of [-1, 1]) {
      const e = new T.Mesh(new T.BoxGeometry(0.55, 0.32, 0.1), fm('#7affd0', 2.4)); e.position.set(sx * 0.75, 3.65, 0.02); g.add(e);
      const col = mesh(new T.CylinderGeometry(0.35, 0.42, 4.2, 10), stone); col.position.set(sx * 2.6, 2.1, 0.2); g.add(col);
      const fl = mesh(new T.CylinderGeometry(0.3, 0.2, 0.4, 8), tm('#3a2a22')); fl.position.set(sx * 2.6, 4.4, 0.2); g.add(fl);
      const fire = new T.Mesh(K3D.geo('pf2-flame', () => new T.ConeGeometry(0.2, 0.7, 8).translate(0, 0.35, 0)), fm('#ffb040', 2.4)); fire.position.set(sx * 2.6, 4.55, 0.2); fire.scale.setScalar(1.4); g.add(fire);
      const gold = mesh(new T.CylinderGeometry(0.5, 0.6, 0.35, 12), K3D.toon('#f2c14e', { emissive: '#7a5410', emissiveIntensity: 0.6 })); gold.position.set(sx * 1.4, 0.95, 0.9); g.add(gold);
    }
    g.scale.setScalar(s); g.updateMatrixWorld(true);
    for (const sx of [-1, 1]) { const q = new T.Vector3(sx * 0.75, 3.65, 0.2).applyMatrix4(g.matrixWorld); PARK.halo(K, q.x, q.y, q.z, 2.2, '#7affd0', 0.5); const f2 = new T.Vector3(sx * 2.6, 5.0, 0.2).applyMatrix4(g.matrixWorld); PARK.halo(K, f2.x, f2.y, f2.z, 3.4, '#ff9a3a', 0.5); }
  }
  // a ruined column (broken), and an idol head on the bank
  function ruins(K, s0, s1) {
    const stone = K3D.toon('#ffffff', { map: H.stoneTex() });
    for (let s = s0 + 5; s < s1; s += 23) {
      const side = Math.floor(s) % 2 ? 1 : -1, f = R.at(s), p = onGround(s, side * (PR.w(s) + 3.5 + rnd() * 3));
      if (!dry(p[0], p[2], 1.5)) continue;
      const g = new T.Group(); g.position.set(...p); g.rotation.y = rnd() * 6; K.add(g);
      const h = 2 + rnd() * 3;
      const c = mesh(new T.CylinderGeometry(0.5, 0.55, h, 10), stone); c.position.y = h / 2; c.rotation.z = (rnd() - 0.5) * 0.2; g.add(c);
      const base = mesh(new T.BoxGeometry(1.5, 0.5, 1.5), stone); base.position.y = 0.25; g.add(base);
      const dr = mesh(new T.CylinderGeometry(0.5, 0.5, 0.8, 10).rotateZ(Math.PI / 2), stone); dr.position.set(1.5, 0.45, 0.4); g.add(dr);
      const vine = mesh(new T.TorusGeometry(0.56, 0.06, 5, 16, 5), tm('#3e7a3a'), false); vine.rotation.x = Math.PI / 2; vine.position.y = h * 0.6; g.add(vine);
      void f;
    }
  }
  // the jungle island (fork 2): rocks, palms, a stone idol, torches
  function jungleIsland(K, I) {
    const n = 24, ring = [];
    for (let i = 0; i <= n; i++) { const s = I.s0 + (I.s1 - I.s0) * i / n, hw = I.hw * Math.sin(Math.PI * i / n); ring.push({ s, x: I.x + hw }); }
    for (let i = n; i >= 0; i--) { const s = I.s0 + (I.s1 - I.s0) * i / n, hw = I.hw * Math.sin(Math.PI * i / n); ring.push({ s, x: I.x - hw }); }
    const wy = R.at((I.s0 + I.s1) / 2).p[1];
    const shape = new T.Shape(); ring.forEach((q, i) => { const p = CW(q.s, q.x); if (i) shape.lineTo(p[0], -p[2]); else shape.moveTo(p[0], -p[2]); });
    const top = new T.Mesh(new T.ExtrudeGeometry(shape, { depth: 1.6, bevelEnabled: true, bevelSize: 0.4, bevelThickness: 0.3, bevelSegments: 2 }).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: rockTex() }));
    top.position.y = wy - 1.0; top.receiveShadow = true; K3D.ink(top, INK, 0.8); K.add(top);
    const foam = [], rocks = [];
    ring.forEach((r, k) => { if (k % 2) return; const p = CW(r.s, r.x); const sc = 0.9 + rnd(); rocks.push({ p: [p[0], wy + 0.05, p[2]], yaw: rnd() * 6, s: [sc * 1.4, sc, sc * 1.4], col: '#5a5868' }); foam.push({ x: p[0], y: wy, z: p[2], r: sc }); });
    inst(K, K3D.geo('pf-rock', () => new T.IcosahedronGeometry(0.5, 1)), K3D.toon('#ffffff', { map: rockTex() }), rocks);
    W.foamAt(foam);
    return { top: wy + 0.9, ring };
  }

  /* ---------- the sawmill ---------- */
  function logGeo() { return K3D.geo('pf2-logBody', () => new T.CylinderGeometry(0.42, 0.42, 3.4, 12).rotateX(Math.PI / 2)); }
  const barkM = () => K3D.mat('pf2-barkM', () => K3D.toon('#ffffff', { map: K3D.paint('pf2-logBark', 128, 64, (c, w, h) => { c.fillStyle = '#6a4630'; c.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(${30 + Math.random() * 40},${20 + Math.random() * 20},10,0.5)`; c.fillRect(0, Math.random() * h, w, 1 + Math.random() * 2); } }, { repeat: true }) }));
  const endM = () => K3D.mat('pf2-logEnd', () => K3D.toon('#ffffff', { map: K3D.paint('pf2-rings', 64, 64, (c) => { c.fillStyle = '#e8c890'; c.fillRect(0, 0, 64, 64); for (let r = 4; r < 32; r += 4) { c.strokeStyle = 'rgba(140,90,50,0.6)'; c.lineWidth = 1.5; c.beginPath(); c.arc(32, 32, r, 0, Math.PI * 2); c.stroke(); } c.strokeStyle = '#6a4630'; c.lineWidth = 4; c.beginPath(); c.arc(32, 32, 30, 0, Math.PI * 2); c.stroke(); }) }));
  function bigLog(len = 3.4) {
    const g = new T.Group();
    const b = mesh(logGeo(), barkM(), { ink: INK, inkW: 0.6 }); b.scale.z = len / 3.4; g.add(b);
    for (const sz of [-1, 1]) { const e = new T.Mesh(K3D.geo('pf2-logCap', () => new T.CircleGeometry(0.42, 12)), endM()); e.position.z = sz * len / 2 + sz * 0.005; e.rotation.y = sz > 0 ? 0 : Math.PI; g.add(e); }
    return g;
  }
  function millPond(K, sc) {
    // the floating logs (and their log-rolling robots)
    sc.flogs = obs('floatlog').map(o => { const g = bigLog(3.2); g.userData.live = true; K.add(g); let rb = null; if (o.roller) { rb = PARK.robot(K, { col: '#3f8fd0' }); K.root.remove(rb); rb.position.y = 0.4; rb.scale.setScalar(0.75); rb.userData.broom.visible = false; g.add(rb); } return { o, g, rb }; });
  }
  // lamps round the pond, then lumber stacks, sawdust heaps and piles of planks in the yard (each on its own patch)
  function millYard(K) {
    const s0 = A.splash1 + 4, s1 = A.millDoor - 2;
    for (let s = s0 + 3, k = 0; s < s1; s += 10, k++) { const side = k % 2 ? 1 : -1; for (const ds of [0, 1.5, -1.5, 3]) { const p = onGround(s + ds, side * (PR.w(s + ds) + 1.8)); if (!H.claim(p[0], p[2], 0.6)) continue; PARK.lamp(K, B, { x: p[0], z: p[2], h: 4.6, moths: k % 2 === 0 }).position.y = p[1]; W.reflect(p[0], wyAt(s + ds), p[2], '#ffe2a0', 6, 1.2, 0.4); break; } }
    for (let s = s0; s < s1; s += 7) for (const side of [-1, 1]) {
      const f = R.at(s), w = PR.w(s), p = onGround(s, side * (w + 3 + rnd() * 3));
      if (!dry(p[0], p[2], 1)) continue;
      const r = rnd();
      if (!H.claim(p[0], p[2], r < 0.5 ? 2.5 : r < 0.75 ? 2.0 : 1.8)) continue;
      if (r < 0.5) { const g = new T.Group(); g.position.set(...p); g.rotation.y = f.yaw + (rnd() - 0.5) * 0.4; K.add(g); for (let row = 0; row < 3; row++) for (let k = 0; k < 4 - row; k++) { const lg = bigLog(3.6); lg.position.set((k - (3 - row) / 2) * 0.86, 0.42 + row * 0.74, 0); g.add(lg); } }
      else if (r < 0.75) { const h = new T.Mesh(K3D.geo('pf2-dust', () => new T.ConeGeometry(1.8, 1.4, 14)), tm('#d8b880')); h.position.set(p[0], p[1] + 0.7, p[2]); K.add(h); }
      else { const pl = new T.Group(); pl.position.set(...p); pl.rotation.y = f.yaw; K.add(pl); for (let k = 0; k < 6; k++) { const bd = mesh(K3D.geo('pf2-plank', () => new T.BoxGeometry(0.9, 0.1, 3.2)), K3D.toon('#ffffff', { map: PARK.wood('#c89a64') })); bd.position.set((k % 2) * 0.1, 0.06 + k * 0.11, 0); bd.rotation.y = (k % 2) * 0.05; pl.add(bd); } }
    }
  }
  // the mill's walls and roof, swept along the channel; the front with its great doors, the back with the lift's door
  const wallX = s => Math.max(PR.w(s) + 3.2, 7.2);
  function millHouse(K, sc) {
    const s0 = A.millDoor - 1, s1 = A.liftFoot + 1.5, wallH = 7.6, ridge = 11.4;
    const wallM = K3D.toon('#ffffff', { map: millWallTex(), side: T.DoubleSide }); wallM.emissive = new T.Color('#ffffff'); wallM.emissiveMap = millGlowTex(); wallM.emissiveIntensity = 0.9;
    const inM = K3D.toon('#ffffff', { map: plankTex('#6a4632', 'in'), side: T.DoubleSide, emissive: '#5a3418', emissiveIntensity: 0.55 });
    const floorM = K3D.toon('#ffffff', { map: plankTex('#9a7a5a', 'f'), side: T.DoubleSide, emissive: '#6a4428', emissiveIntensity: 0.6 });
    const roofM = K3D.toon('#ffffff', { map: roofTex(), side: T.DoubleSide });
    for (const side of [-1, 1]) {
      // the walkway beside the water, its kerb, the wall (outside face with windows; an inside face of dark planks)
      sweep(K, s0, s1, 1, s => { const w = PR.w(s); return [[side * (w - 0.05), -0.9], [side * w, 0.35], [side * wallX(s), 0.35]]; }, floorM, { uAcross: 3, vLen: 3 });
      sweep(K, s0, s1, 1, s => [[side * (wallX(s) + 0.3), -1.0], [side * (wallX(s) + 0.3), wallH]], wallM, { uAcross: 4.2, vLen: 4.2, ink: 0.8 });
      sweep(K, s0, s1, 1, s => [[side * wallX(s), 0.35], [side * wallX(s), wallH - 0.1]], inM, { uAcross: 4, vLen: 4 });
      // the roof: from the eaves (a little out) up to the ridge
      sweep(K, s0 - 0.8, s1 + 0.8, 1, s => [[side * (wallX(s) + 1.2), wallH - 0.5], [0, ridge]], roofM, { uAcross: 4, vLen: 4, ink: 0.8, cast: true });
    }
    // the gable ends: the front (the great doors over the water) and the back
    const gable = (s, door) => {
      const f = R.at(s), wx = wallX(s), sh = new T.Shape();
      sh.moveTo(-wx - 0.3, -1.0); sh.lineTo(wx + 0.3, -1.0); sh.lineTo(wx + 0.3, wallH); sh.lineTo(0, ridge); sh.lineTo(-wx - 0.3, wallH); sh.closePath();
      const hole = new T.Path(), dw = door.w, dh = door.h; hole.moveTo(-dw, -1.0); hole.lineTo(-dw, dh); hole.absarc(0, dh, dw, Math.PI, 0, true); hole.lineTo(dw, -1.0); hole.closePath(); sh.holes.push(hole);
      const geo = new T.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false, curveSegments: 12 }); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4.2, uv.getY(i) / 4.2);
      const m = mesh(geo, wallM, { ink: INK, inkW: 0.8 }); place(m, s, 0, 0); m.rotation.y = f.yaw; K.add(m);
      return m;
    };
    gable(A.millDoor - 1, { w: PR.w(A.millDoor) + 1.4, h: 4.5 });
    gable(s1, { w: PR.w(A.liftFoot) + 1.3, h: 3.6 + (R.at(s1).p[1] - wyAt(A.liftFoot)) });
    // the front: a big sign and lamps over the doors, the chimney and its smoke
    const fs = A.millDoor - 1.4, ff = R.at(fs);
    const sg = PARK.neon(K, 'TIMBER MILL', { w: 6.4, h: 1.2, col: '#ffb04a', k: 2.4 }); place(sg, fs, 0, 8.3); sg.rotation.y = ff.yaw + Math.PI; K.add(sg);
    for (const sx of [-1, 1]) { const p = R.local(fs, sx * (PR.w(fs) + 2.2), 5.8, ff); B.add(p[0], p[1], p[2], '#ffd890', { size: 0.25 }); PARK.halo(K, p[0], p[1], p[2], 3.2, '#ffd890', 0.45); W.reflect(p[0], ff.p[1], p[2], '#ffd890', 7, 1.4, 0.45); }
    const cs = (A.millDoor + A.saws) / 2, cp = R.local(cs, wallX(cs) - 1.5, 0, R.at(cs));
    const chim = mesh(new T.BoxGeometry(1.4, 6, 1.4), K3D.toon('#ffffff', { map: H.stoneTex() })); chim.position.set(cp[0], cp[1] + ridge + 1.2, cp[2]); K.add(chim);
    sc.smoke = { x: cp[0], y: cp[1] + ridge + 4.4, z: cp[2], puffs: [] };
    for (let i = 0; i < 10; i++) { const p = new T.Sprite(new T.SpriteMaterial({ map: PARK.glowTex(), color: '#a8a0b8', transparent: true, opacity: 0, depthWrite: false })); p.userData.live = true; K.add(p); sc.smoke.puffs.push({ m: p, t: i * 0.6 }); }
    // the old water wheel on the outside wall (it turns slowly; the mill is "switched off since 1962")
    const ws = (A.saws + A.chutes) / 2, wf = R.at(ws), ow = new T.Group(); place(ow, ws, -(wallX(ws) + 2.0), 2.4); ow.rotation.y = wf.yaw; K.add(ow);
    const wheel = new T.Group(); wheel.userData.live = true; ow.add(wheel);
    const wood = K3D.toon('#ffffff', { map: PARK.wood('#5a3a28') });
    for (const sx of [-0.6, 0.6]) { const rim = mesh(new T.TorusGeometry(3.6, 0.14, 8, 40).rotateY(Math.PI / 2), wood); rim.position.x = sx; wheel.add(rim); }
    for (let i = 0; i < 12; i++) { const pd = mesh(K3D.geo('pf2-owPad', () => new T.BoxGeometry(1.3, 0.12, 0.9)), wood, { ink: INK, inkW: 0.5 }); const a = i / 12 * 6.28; pd.position.set(0, Math.cos(a) * 3.6, Math.sin(a) * 3.6); pd.rotation.x = -a; wheel.add(pd); }
    sc.oldWheel = wheel;
    // the yard round the mill: lamps along both walls outside
    for (let s = s0 + 4, k = 0; s < s1; s += 12, k++) for (const side of [-1, 1]) { const p = R.local(s, side * (wallX(s) + 0.5), 5.2, R.at(s)); B.add(p[0], p[1], p[2], '#ffd890', { size: 0.16 }); PARK.halo(K, p[0], p[1], p[2], 2.2, '#ffd890', 0.35); }
  }
  function millInside(K, sc) {
    const s0 = A.millDoor + 1, s1 = A.liftFoot;
    const wood = K3D.toon('#ffffff', { map: PARK.wood('#5a3a28') });
    // beams across under the roof, and the lamps hanging from every other one
    const bl = [];
    let k = 0;
    for (let s = s0 + 2; s < s1; s += 5.5, k++) {
      const f = R.at(s), wx = wallX(s);
      bl.push({ a: new T.Vector3(...R.local(s, -wx, 7.2, f)), b: new T.Vector3(...R.local(s, wx, 7.2, f)), t: 0.36 });
      for (const sx of [-1, 1]) bl.push({ a: new T.Vector3(...R.local(s, sx * wx, 0.35, f)), b: new T.Vector3(...R.local(s, sx * wx, 7.2, f)), t: 0.34 });
      if (k % 2 === 0) for (const sx of [-0.45, 0.45]) {
        const p = R.local(s, sx * PR.w(s), 6.0, f);
        const sh = mesh(K3D.geo('pf2-shade', () => new T.ConeGeometry(0.5, 0.45, 12, 1, true)), K3D.toon('#3a5a4a', { side: T.DoubleSide }), { ink: INK, inkW: 0.5 }); sh.position.set(p[0], p[1], p[2]); K.add(sh);
        K.add(mesh(new T.CylinderGeometry(0.02, 0.02, 1.2, 4), tm('#1a1530'), false)).position.set(p[0], p[1] + 0.8, p[2]);
        B.add(p[0], p[1] - 0.2, p[2], '#ffd890', { size: 0.18 }); PARK.halo(K, p[0], p[1] - 0.3, p[2], 3.4, '#ffc070', 0.32); W.reflect(p[0], f.p[1], p[2], '#ffc070', 4, 1.2, 0.55);
        PARK.glint(K, p[0], p[2], '#ffc070', 3, 1.4, 0.0);
      }
    }
    beams(K, bl, wood);
    // conveyors along the walkways with logs riding them; crates, sawdust, stacked planks, the mill's robots
    sc.conv = [];
    for (const side of [-1, 1]) {
      const cs0 = s0 + 3, cs1 = A.chutes - 4;
      sweep(K, cs0, cs1, 1, s => { const w = PR.w(s), x = side * (w + 1.9); return [[x - 0.8, 0.9], [x + 0.8, 0.9]]; }, K3D.toon('#3a3448', { side: T.DoubleSide }));
      sweep(K, cs0, cs1, 1, s => { const w = PR.w(s), x = side * (w + 1.9); return [[x - 0.85, 0.35], [x - 0.85, 0.9]]; }, K3D.toon('#ffffff', { map: hazTex(), side: T.DoubleSide }), { uAcross: 1, vLen: 1 });
      const logs = []; for (let i = 0; i < 5; i++) { const g = bigLog(2.6); g.userData.live = true; K.add(g); logs.push(g); }
      sc.conv.push({ side, s0: cs0, s1: cs1, logs });
    }
    for (let s = A.chutes + 6; s < s1 - 3; s += 6.5) for (const side of [-1, 1]) {
      const f = R.at(s), p = R.local(s, side * (PR.w(s) + 1.5 + rnd() * 1.2), 0.35, f), r = rnd();
      if (PARKFLUME.islandAt(s) && Math.abs(p[0]) < 0) continue;
      if (r < 0.4) { const c = mesh(K3D.geo('pf2-crate', () => K3D.roundBox(1, 1, 1, 0.08, 2)), K3D.toon('#ffffff', { map: PARK.wood('#a87a4a') })); c.position.set(p[0], p[1] + 0.5, p[2]); c.rotation.y = rnd(); K.add(c); }
      else if (r < 0.7) { const h = new T.Mesh(K3D.geo('pf2-dustS', () => new T.ConeGeometry(0.9, 0.7, 12)), tm('#e0c890')); h.position.set(p[0], p[1] + 0.35, p[2]); K.add(h); }
      else { const rb = PARK.robot(K, { col: ['#e85a4a', '#3f9a8a', '#f2c14e'][Math.floor(rnd() * 3)] }); rb.position.set(p[0], p[1], p[2]); rb.rotation.y = f.yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2); (sc.mrobots || (sc.mrobots = [])).push(rb); }
    }
    // shafts of moonlight through the roof's skylights, with sawdust drifting in them
    for (let s = s0 + 8, k = 0; s < s1; s += 17, k++) { const f = R.at(s), p = R.local(s, (k % 2 ? 1 : -1) * (PR.w(s) + 1.6), 0.35, f); const sh = new T.Mesh(K3D.geo('pf2-shaft', () => new T.CylinderGeometry(0.6, 1.3, 7.2, 12, 1, true).translate(0, 3.6, 0)), new T.MeshBasicMaterial({ color: hot('#9ab0e0', 0.09), transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false })); sh.position.set(p[0], p[1], p[2]); sh.rotation.z = 0.12; sh.userData.seeThrough = true; K.add(sh); }
  }
  function sawBlade(K) {
    const sh = new T.Shape(), n = 28, r = 1.2;
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, rr = i % 2 ? r : r * 0.88; if (i) sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    const h = new T.Path(); h.absarc(0, 0, 0.16, 0, Math.PI * 2, true); sh.holes.push(h);
    return K3D.geo('pf2-saw', () => new T.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }).translate(0, 0, -0.02).rotateY(Math.PI / 2));
  }
  function saws(K) {
    const steel = K3D.toon('#dfe4f0', { emissive: '#3a4050', emissiveIntensity: 0.4 });
    return obs('saw').map(o => {
      const g = new T.Group(); place(g, o.s, o.x, 0); K.add(g); g.userData.live = true;
      const blade = mesh(sawBlade(K), steel, { ink: INK, inkW: 0.6 }); g.add(blade);
      const hub = mesh(new T.CylinderGeometry(0.22, 0.22, 0.14, 12).rotateZ(Math.PI / 2), tm('#e8483a')); blade.add(hub);
      // the slot in the floor: a hazard-striped plate, just under the water, and the lamp on its post at the bank
      const plate = new T.Mesh(new T.PlaneGeometry(0.5, 3.2).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: hazTex() })); plate.position.y = -0.05; g.add(plate);
      const side = o.x < 0 ? -1 : 1, lp = new T.Group(); place(lp, o.s, side * (PR.w(o.s) + 0.8), 0.35); K.add(lp);
      const post = mesh(new T.CylinderGeometry(0.06, 0.06, 1.6, 6), tm('#2a2438')); post.position.y = 0.8; lp.add(post);
      const lamp = new T.Mesh(K3D.geo('pf2-beacon', () => new T.SphereGeometry(0.22, 12, 8)), K3D.flat(hot('#ff3a2a', 1))); lamp.position.y = 1.7; lamp.userData.live = true; lp.add(lamp);
      const halo = PARK.halo(K, 0, 0, 0, 2.6, '#ff3a2a', 0); lp.add(halo); halo.position.y = 1.7; halo.userData.live = true;
      return { o, g, blade, lamp, halo };
    });
  }
  function chutes(K) {
    // a sloping wooden chute from a high loading door down to the channel's edge; a log rides down it and hits the water
    return obs('wave').map((o, i) => {
      const side = i % 2 ? 1 : -1, f = R.at(o.s), w = PR.w(o.s);
      const top = new T.Vector3(...R.local(o.s - 1, side * (wallX(o.s) - 0.2), 6.6, f)), bot = new T.Vector3(...R.local(o.s, side * (w - 0.6), 0.6, f));
      const d = bot.clone().sub(top), len = d.length();
      const g = new T.Group(); g.position.copy(top); g.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), d.clone().normalize()); K.add(g);
      const wood = K3D.toon('#ffffff', { map: PARK.wood('#8a5a38'), side: T.DoubleSide });
      const fl = mesh(new T.BoxGeometry(1.4, 0.12, len).translate(0, -0.5, len / 2), wood); g.add(fl);
      for (const sx of [-1, 1]) { const sd = mesh(new T.BoxGeometry(0.1, 0.6, len).translate(sx * 0.7, -0.2, len / 2), wood); g.add(sd); }
      const door = mesh(new T.BoxGeometry(2.2, 2.4, 0.3), tm('#2a1a14')); door.position.copy(top).add(new T.Vector3(0, 0.6, 0)); door.rotation.y = f.yaw + Math.PI / 2; K.add(door);
      const lg = bigLog(2.6); lg.userData.live = true; K.add(lg);
      const shadow = new T.Mesh(new T.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: '#000010', transparent: true, opacity: 0, depthWrite: false })); shadow.userData.live = true; shadow.renderOrder = 2; K.add(shadow);
      const wave = new T.Mesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: PARK.foamTex(), color: hot('#e8f6ff', 1.2), transparent: true, depthWrite: false, toneMapped: false })); wave.userData.live = true; wave.renderOrder = 3; K.add(wave);
      return { o, top, bot, lg, shadow, wave, side };
    });
  }
  function bandSaw(K, I) {
    // the band saw on its deck between the arms: two great wheels, the band running, a log half cut, a lamp
    const ms = (I.s0 + I.s1) / 2, f = R.at(ms), wy = f.p[1];
    const deckM = K3D.toon('#ffffff', { map: plankTex('#9a7a5a', 'd'), side: T.DoubleSide, emissive: '#6a4428', emissiveIntensity: 0.6 });
    sweep(K, I.s0, I.s1, 0.5, s => { const hw = I.hw * Math.sin(Math.PI * (s - I.s0) / (I.s1 - I.s0)); return [[-hw, 0.3], [hw, 0.3]]; }, deckM, { uAcross: 3, vLen: 3 });
    for (const sd of [-1, 1]) sweep(K, I.s0, I.s1, 0.5, s => { const hw = I.hw * Math.sin(Math.PI * (s - I.s0) / (I.s1 - I.s0)); return [[sd * hw, -0.9], [sd * hw, 0.3]]; }, K3D.toon('#ffffff', { map: hazTex(), side: T.DoubleSide }), { uAcross: 1, vLen: 1 });
    const g = new T.Group(); place(g, ms, 0, 0.3); K.add(g);
    const iron = tm('#4a5a7a'), red = tm('#c8483a');
    const frame = mesh(new T.BoxGeometry(0.8, 7.2, 1.2), iron); frame.position.set(0, 3.6, 1.6); g.add(frame);
    const arm = mesh(new T.BoxGeometry(0.8, 0.8, 3.2), iron); arm.position.set(0, 6.8, 0.4); g.add(arm);
    const wheels = [];
    for (const y of [1.1, 6.6]) { const wh = mesh(new T.CylinderGeometry(1.0, 1.0, 0.3, 24).rotateZ(Math.PI / 2), red); wh.position.set(0.5, y, 0); wh.userData.live = true; g.add(wh); wheels.push(wh); }
    const bandTex = K3D.paint('pf2-band', 32, 256, (c, w, h) => { c.fillStyle = '#c8d0e0'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { c.fillStyle = '#6a7088'; c.fillRect(0, y, w, 2); } }, { repeat: true }).clone(); bandTex.needsUpdate = true; bandTex.wrapS = bandTex.wrapT = T.RepeatWrapping; bandTex.repeat.set(1, 3);
    const band = new T.Mesh(new T.BoxGeometry(0.05, 5.5, 0.1), K3D.toon('#ffffff', { map: bandTex, emissive: '#2a3040' })); band.position.set(0.5, 3.85, -1.0); g.add(band);
    const table = mesh(new T.BoxGeometry(2.4, 0.2, 5.6), tm('#7a7a8a')); table.position.set(0, 1.0, 0); g.add(table);
    const lg = bigLog(4.6); lg.position.set(0.2, 1.55, 0.6); g.add(lg);
    const sl = new T.Mesh(new T.CircleGeometry(0.42, 12), endM()); sl.position.set(0.2, 1.55, -1.71); g.add(sl);
    const dust = new T.Mesh(K3D.geo('pf2-dustS', () => new T.ConeGeometry(0.9, 0.7, 12)), tm('#e0c890')); dust.position.set(-0.6, 0.35, -1.6); g.add(dust);
    const sg = PARK.neon(K, 'BAND SAW', { w: 3, h: 0.7, col: '#ff6a4a', k: 2.4 }); sg.position.set(0, 7.7, 0.4); sg.rotation.y = Math.PI; g.add(sg);
    g.updateMatrixWorld(true);
    const lp = new T.Vector3(0, 7.3, 1.6).applyMatrix4(g.matrixWorld); B.add(lp.x, lp.y, lp.z, '#ff5a3a', { size: 0.2, blink: true }); PARK.halo(K, lp.x, lp.y, lp.z, 2.6, '#ff5a3a', 0.45);
    void wy;
    return { wheels, bandTex };
  }
  function crane(K, o) {
    const s = o.s, f = R.at(s), w = PR.w(s), wx = wallX(s);
    const steel = tm('#e8b83a'), dark = tm('#2a2438');
    // the gantry: two girders along the walls, a bridge across them, the trolley on it
    for (const sx of [-1, 1]) { const gd = mesh(new T.BoxGeometry(0.4, 0.5, 9), steel); place(gd, s, sx * (wx - 0.4), 6.6); K.add(gd); }
    const br = mesh(new T.BoxGeometry(2 * wx, 0.55, 0.6), K3D.toon('#ffffff', { map: hazTex() })); place(br, s, 0, 6.3); K.add(br);
    const tro = new T.Group(); tro.userData.live = true; K.add(tro);
    const box = mesh(new T.BoxGeometry(1.0, 0.7, 1.1), dark); box.position.y = 0.2; tro.add(box);
    const cab = new T.Mesh(new T.BoxGeometry(0.5, 0.3, 0.05), fm('#ffd89a', 1.4)); cab.position.set(0, 0.2, 0.56); tro.add(cab);
    const cable = mesh(new T.CylinderGeometry(0.03, 0.03, 1, 4).translate(0, -0.5, 0), dark, false); tro.add(cable);
    const claw = new T.Group(); tro.add(claw);
    const lg = bigLog(3.0); claw.add(lg);
    for (const sz of [-0.9, 0.9]) { const c = mesh(new T.TorusGeometry(0.52, 0.06, 6, 12, Math.PI * 1.4).rotateZ(-0.2 * Math.PI).rotateY(Math.PI / 2), dark); c.position.set(0, 0.05, sz); claw.add(c); }
    const lamp = new T.Mesh(K3D.geo('pf2-beacon', () => new T.SphereGeometry(0.22, 12, 8)), fm('#ffb03a', 2)); lamp.position.y = 0.7; tro.add(lamp);
    return { o, tro, cable, claw, w };
  }
  function steam(K) {
    // pipes along the wall, a valve and gauge at each jet, and puffs of steam that blast across when it fires
    const list = obs('steam'), pipeM = tm('#b87a4a');
    const s0 = A.steam - 2, s1 = A.wheel2 - 1;
    for (const side of [-1, 1]) for (const y of [1.6, 2.4]) sweep(K, s0, s1, 0.5, s => { const x = side * (PR.w(s) + 0.6); return [[x, y - 0.12], [x + side * 0.12, y], [x, y + 0.12], [x - side * 0.12, y], [x, y - 0.12]]; }, pipeM, { ink: 0.4 });
    return list.map((o, i) => {
      const side = i % 2 ? -1 : 1, f = R.at(o.s), w = PR.w(o.s);
      const n = mesh(new T.CylinderGeometry(0.2, 0.3, 0.6, 10).rotateZ(Math.PI / 2), tm('#8a8aa0')); place(n, o.s, side * (w + 0.3), 1.0); K.add(n);
      const valve = mesh(new T.TorusGeometry(0.3, 0.05, 6, 14), tm('#e8483a')); place(valve, o.s + 0.8, side * (w + 0.7), 2.0); valve.rotation.y += Math.PI / 2; valve.userData.live = true; K.add(valve);
      const gauge = new T.Mesh(new T.CircleGeometry(0.25, 16), fm('#f4ecd8', 1.2)); place(gauge, o.s - 0.8, side * (w + 0.55), 2.2); gauge.rotation.y += -side * Math.PI / 2; K.add(gauge);
      const needle = mesh(new T.BoxGeometry(0.03, 0.2, 0.02).translate(0, 0.09, 0), fm('#e8483a'), false); needle.position.z = 0.01; gauge.add(needle); gauge.userData.live = true;
      const puffs = []; for (let k = 0; k < 9; k++) { const p = new T.Sprite(new T.SpriteMaterial({ map: PARK.glowTex(), color: '#eef4ff', transparent: true, opacity: 0, depthWrite: false })); p.userData.live = true; K.add(p); puffs.push(p); }
      const a = R.local(o.s, side * (w + 0.1), 1.0, f), b = R.local(o.s, -side * (w + 0.2), 1.0, f);
      return { o, a, b, puffs, needle, valve };
    });
  }
  function pwheel(K, o) {
    const s = o.s, f = R.at(s), w = PR.w(s), r = 3.2, g = new T.Group(); place(g, s, 0, 0); K.add(g);
    const wood = K3D.toon('#ffffff', { map: PARK.wood('#6a4428') });
    const wheel = new T.Group(); wheel.position.y = r - 0.6; wheel.userData.live = true; g.add(wheel);
    for (const sx of [-1, 1]) { const rim = mesh(new T.TorusGeometry(r, 0.14, 8, 40).rotateY(Math.PI / 2), wood); rim.position.x = sx * (w + 0.3); wheel.add(rim); }
    const ax = mesh(new T.CylinderGeometry(0.3, 0.3, 2 * w + 2.4, 12).rotateZ(Math.PI / 2), tm('#3a2f3f')); wheel.add(ax);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, pd = mesh(new T.BoxGeometry(2 * w + 0.4, 1.4, 0.16), K3D.toon('#ffffff', { map: PARK.stripes('#ff8a2a', '#f4ecd8', 4, { v: true }) }), { ink: INK, inkW: 0.8 }); pd.position.set(0, -Math.cos(a) * (r - 0.5), Math.sin(a) * (r - 0.5)); pd.rotation.x = a; wheel.add(pd); for (const sx of [-1, 1]) { const sp = mesh(new T.BoxGeometry(0.14, r * 2, 0.14), wood); sp.position.x = sx * (w + 0.3); sp.rotation.x = a; wheel.add(sp); } }
    for (const sx of [-1, 1]) { const st = mesh(new T.BoxGeometry(0.5, r + 0.8, 0.6), wood); st.position.set(sx * (w + 0.9), (r - 0.6) / 2 + 0.2, 0); g.add(st); }
    const wb = PARK.bulbs(K, 60); wheel.add(wb.mesh); for (const sx of [-1, 1]) for (let i = 0; i < 20; i++) { const a = i / 20 * 6.28; wb.add(sx * (w + 0.45), Math.cos(a) * r, Math.sin(a) * r, i % 2 ? '#ffd24a' : '#ff8a5a', { size: 0.07, speed: 3, phase: i * 0.4 }); } wb.done();
    return { o, wheel };
  }

  /* ---------- the lagoon ---------- */
  function jetFountains(K) {
    const st = streamTex().clone(); st.needsUpdate = true; st.wrapS = st.wrapT = T.RepeatWrapping; st.repeat.set(2, 1.5);
    const mat = new T.MeshBasicMaterial({ map: st, color: hot('#d8f2ff', 1.3), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, side: T.DoubleSide });
    const list = obs('jetFountain').map((o, i) => {
      const f = R.at(o.s), p = R.local(o.s, o.x, 0, f), g = new T.Group(); g.position.set(...p); K.add(g);
      const ring = mesh(new T.TorusGeometry(1.0, 0.16, 8, 24).rotateX(Math.PI / 2), tm('#d8d0e8')); ring.position.y = 0.05; g.add(ring);
      const col = new T.Mesh(K3D.geo('pf2-jetCol', () => new T.CylinderGeometry(0.35, 0.8, 1, 14, 1, true).translate(0, 0.5, 0)), mat); col.userData.live = true; col.scale.y = 0.01; g.add(col);
      const cap = new T.Mesh(K3D.geo('pf2-jetCap', () => new T.SphereGeometry(0.9, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), mat); cap.userData.live = true; g.add(cap);
      const cc = ['#ff6ab0', '#7ae8ff', '#ffd24a', '#9aff8a'][i % 4];
      const bl = PARK.bulbs(K, 16); g.add(bl.mesh); for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28; bl.add(Math.cos(a) * 1.0, 0.18, Math.sin(a) * 1.0, cc, { size: 0.08, speed: 4, phase: k }); } bl.done();
      const glow = PARK.halo(K, p[0], p[1] + 2, p[2], 4, cc, 0); glow.userData.live = true;
      return { o, col, cap, glow, p };
    });
    return { list, tex: st };
  }
  function barges(K, sc) {
    return obs('barge').map((o, i) => {
      const g = new T.Group(); place(g, o.s, o.x, 0); g.rotation.y += (i % 2 ? 0.3 : -0.3); K.add(g); g.userData.live = true;
      const hull = mesh(K3D.roundBox(2.6, 0.7, 4.0, 0.3, 4), K3D.toon('#ffffff', { map: PARK.stripes('#2a4a8a', '#f4ecd8', 6) })); hull.position.y = 0.05; g.add(hull);
      const deck = mesh(new T.BoxGeometry(2.4, 0.08, 3.8), K3D.toon('#ffffff', { map: PARK.wood('#a87a4a') })); deck.position.y = 0.42; g.add(deck);
      for (let k = 0; k < 4; k++) { const tb = mesh(K3D.geo('pf2-mortar', () => new T.CylinderGeometry(0.16, 0.16, 0.9, 10)), tm(['#e8483a', '#ffd23a', '#3fa0e8', '#9a5ad8'][k])); tb.position.set(-0.6 + (k % 2) * 1.2, 0.9, -0.8 + Math.floor(k / 2) * 1.6); tb.rotation.x = (rnd() - 0.5) * 0.3; g.add(tb); }
      const rb = PARK.robot(K, { col: '#f2c14e' }); K.root.remove(rb); rb.position.set(0, 0.46, 1.3); rb.scale.setScalar(0.7); rb.userData.broom.visible = false; g.add(rb);
      const bl = PARK.bulbs(K, 40); g.add(bl.mesh); for (let k = 0; k < 28; k++) { const a = k / 28 * 6.28; bl.add(Math.cos(a) * 1.35, 0.5, Math.sin(a) * 2.05, k % 2 ? '#ffd24a' : '#ff6ab0', { size: 0.07, speed: 4, phase: k * 0.5 }); } bl.done();
      const p = R.local(o.s, o.x, 0); W.reflect(p[0], p[1], p[2], '#ffd24a', 5, 1.6, 0.35);
      return { o, g, rb, next: 2 + i * 1.7 };
    });
  }
  function skier(K, o) {
    // cable-ski: a cable across the lagoon between two towers; a trolley runs along it towing the robot on skis
    const s = o.s, f = R.at(s), w = PR.w(s), steel = tm('#d8d0e8');
    const a = R.local(s, -(w + 2), 6.4, f), b = R.local(s, w + 2, 6.4, f);
    for (const p of [a, b]) { const tw = mesh(new T.CylinderGeometry(0.18, 0.3, 7, 8), steel); tw.position.set(p[0], H.groundAt(p[0], p[2]) + 3.5, p[2]); K.add(tw); B.add(p[0], p[1] + 0.3, p[2], '#ff5a3a', { size: 0.18, blink: true }); }
    K.add(mesh(new T.CylinderGeometry(0.03, 0.03, 1, 4).rotateZ(Math.PI / 2).scale(Math.hypot(b[0] - a[0], b[2] - a[2]), 1, 1), tm('#1a1530'), false)).position.set((a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2);
    K.root.children[K.root.children.length - 1].rotation.y = f.yaw;
    const g = new T.Group(); g.userData.live = true; K.add(g);
    const rb = PARK.robot(K, { col: '#ff6ab0' }); K.root.remove(rb); rb.userData.broom.visible = false; rb.position.y = 0.15; rb.rotation.x = -0.25; g.add(rb);
    for (const sx of [-0.25, 0.25]) { const sk = mesh(new T.BoxGeometry(0.16, 0.06, 1.8), tm('#ffd23a')); sk.position.set(sx, 0.05, 0.1); g.add(sk); }
    const rope = mesh(new T.CylinderGeometry(0.015, 0.015, 1, 4).translate(0, 0.5, 0), tm('#f4ecd8'), false); rope.userData.live = true; K.add(rope);
    const tro = mesh(new T.BoxGeometry(0.5, 0.3, 0.4), tm('#2a2438')); tro.userData.live = true; K.add(tro);
    return { o, g, rope, tro, y: a[1] };
  }
  function weirJump(K) {
    // the last weir is a jump: a lit ramp edge, and a ring of sparklers over it to sail through
    const s = A.weirJump + 0.6, f = R.at(s), w = PR.w(s), c = R.local(s, 0, 0, f);
    const g = new T.Group(); g.position.set(...c); g.rotation.y = f.yaw; K.add(g);
    const ring = new T.Group(); ring.position.y = 0.2; g.add(ring); ring.userData.live = true;
    const hoop = mesh(new T.TorusGeometry(w + 0.2, 0.16, 8, 48), K3D.toon('#ffffff', { map: PARK.stripes('#ffd23a', '#e8483a', 16) })); ring.add(hoop);
    const bl = PARK.bulbs(K, 80); ring.add(bl.mesh); for (let k = 0; k < 64; k++) { const a = k / 64 * 6.28; bl.add(Math.cos(a) * (w + 0.2), Math.sin(a) * (w + 0.2), 0.18, k % 2 ? '#ffffff' : '#ffd24a', { size: 0.09, speed: 9, phase: k * 0.7 }); } bl.done();
        const sg = PARK.neon(K, 'JUMP!', { w: 2.4, h: 0.8, col: '#ffd24a', k: 2.6 }); sg.position.set(0, w + 1.4, 0); sg.rotation.y = Math.PI; g.add(sg);
    g.updateMatrixWorld(true);
    // sparks thrown off the ring
    const N = 160, pos = new Float32Array(N * 3), life = new Float32Array(N), vel = new Float32Array(N * 3);
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('aL', new T.BufferAttribute(life, 1));
    const mat = new T.ShaderMaterial({ uniforms: { uPx: { value: 1 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, vertexShader: 'attribute float aL; uniform float uPx; varying float vL; void main() { vL = aL; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.0, 30.0 * uPx / -mv.z); gl_Position = projectionMatrix * mv; }', fragmentShader: 'varying float vL; void main() { if (vL <= 0.0) discard; float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.6, 1.3, 0.6) * smoothstep(0.5, 0.0, d) * vL, 1.0); }' });
    const pts = new T.Points(geo, mat); pts.frustumCulled = false; K.add(pts);
    return { ring, g, w, N, pos, life, vel, geo, mat, head: 0 };
  }
  function lighthouse(K) {
    // a little striped lighthouse on a rock beside the lagoon, its beam sweeping round
    const s = A.barges + 6, f = R.at(s), p = onGround(s, PR.w(s) + 8);
    const g = new T.Group(); g.position.set(...p); K.add(g);
    const rock = mesh(K3D.geo('pf-rock', () => new T.IcosahedronGeometry(0.5, 1)), K3D.toon('#ffffff', { map: rockTex() })); rock.scale.set(7, 3, 7); g.add(rock);
    const tower = mesh(new T.CylinderGeometry(1.0, 1.5, 8, 16), K3D.toon('#ffffff', { map: PARK.stripes('#e8483a', '#f4ecd8', 4) })); tower.position.y = 5; g.add(tower);
    const gal = mesh(new T.CylinderGeometry(1.5, 1.5, 0.2, 16), tm('#2a2438')); gal.position.y = 9.1; g.add(gal);
    const lamp = new T.Mesh(new T.CylinderGeometry(0.7, 0.7, 1.2, 12), fm('#fff2c0', 2.4)); lamp.position.y = 9.8; g.add(lamp);
    const cap = mesh(new T.ConeGeometry(1.1, 1.0, 16), tm('#e8483a')); cap.position.y = 10.9; g.add(cap);
    PARK.halo(K, p[0], p[1] + 9.8, p[2], 6, '#fff2c0', 0.6);
    const beam = new T.Group(); beam.position.set(p[0], p[1] + 9.8, p[2]); beam.userData.live = true; K.add(beam);
    const bm = new T.Mesh(new T.ConeGeometry(2.6, 26, 16, 1, true).translate(0, -13, 0).rotateZ(Math.PI / 2), new T.MeshBasicMaterial({ color: hot('#fff2c0', 0.16), transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false }));
    bm.userData.seeThrough = true; beam.add(bm);
    W.reflect(p[0], wyAt(s), p[2] - 2, '#fff2c0', 9, 1.5, 0.4);
    void f;
    return { beam };
  }
  function splashZone(K, s) {
    // a viewing platform beside the splashdown: robots cheering, a sign; they get wet when the log comes down
    const f = R.at(s), w = PR.w(s), p = onGround(s, -(w + 3.2)), g = new T.Group(); g.position.set(...p); g.rotation.y = f.yaw + Math.PI / 2; K.add(g);
    const deck = mesh(new T.BoxGeometry(7, 0.4, 3.4), K3D.toon('#ffffff', { map: PARK.wood('#a87a4a') })); deck.position.y = 0.6; g.add(deck);
    for (const sx of [-3.3, 3.3]) for (const sz of [-1.5, 1.5]) { const l = mesh(new T.CylinderGeometry(0.12, 0.12, 0.8, 6), tm('#5a3a28')); l.position.set(sx, 0.3, sz); g.add(l); }
    const rail = mesh(new T.BoxGeometry(7, 0.08, 0.08), tm('#f4ecd8')); rail.position.set(0, 1.7, 1.6); g.add(rail);
    const sg = PARK.neon(K, 'SPLASH ZONE', { w: 4.2, h: 0.9, col: '#7ae8ff', k: 2.4 }); sg.position.set(0, 3.6, -1.4); g.add(sg);
    for (const sx of [-1, 1]) { const po = mesh(new T.CylinderGeometry(0.08, 0.08, 3.2, 6), tm('#2a2438')); po.position.set(sx * 2, 2.2, -1.4); g.add(po); }
    const fans = [];
    for (let k = 0; k < 4; k++) { const rb = PARK.robot(K, { col: ['#e85a4a', '#3f9a8a', '#f2c14e', '#5d4bb0'][k] }); K.root.remove(rb); rb.position.set(-2.4 + k * 1.6, 0.8, 0.4); rb.scale.setScalar(0.8); rb.userData.broom.visible = false; g.add(rb); fans.push(rb); }
    return { fans, s };
  }
  function lagoonDecor(K, s0, s1) {
    // beach umbrellas folded for the night, deck chairs, lamps with lanterns strung between, palms by the water
    const leafM = K3D.toon('#ffffff', { map: frondTex(), side: T.DoubleSide, alphaTest: 0.4 });
    const fronds = [], trunks = [];
    let last = null;
    for (let s = s0 + 2, k = 0; s < s1; s += 9, k++) {
      const side = 1, p = onGround(s, side * (PR.w(s) + 2)); if (!dry(p[0], p[2], 0.8) || !H.claim(p[0], p[2], 0.6)) continue;
      PARK.lamp(K, B, { x: p[0], z: p[2], h: 4.4, moths: k % 3 === 0 }).position.y = p[1];
      W.reflect(p[0], wyAt(s), p[2], '#ffe2a0', 6, 1.2, 0.4);
      if (last) PARK.lanterns(K, B, [last[0], last[1] + 4.0, last[2]], [p[0], p[1] + 4.0, p[2]], { sag: 0.8, c: k });
      last = p;
      for (let s = s0, k = 0; s < s1; s += 6, k++) for (const side of [-1, 1]) {
      const f = R.at(s), w = PR.w(s), p = onGround(s, side * (w + 3.5 + rnd() * 5));
      if (!dry(p[0], p[2], 1.5)) continue;
      const r = rnd();
      if (r < 0.38) {
        // a palm
        if (!H.claim(p[0], p[2], 0.9)) continue;
        const yaw = rnd() * 6; trunks.push({ p, yaw, s: 0.8 + rnd() * 0.3 }); const top = new T.Vector3(1.4 * (trunks[trunks.length - 1].s), 8 * trunks[trunks.length - 1].s, 0).applyAxisAngle(UP, yaw); for (let i = 0; i < 9; i++) fronds.push({ p: [p[0] + top.x, p[1] + top.y, p[2] + top.z], yaw: i / 9 * 6.28, roll: rnd() * 0.4, s: 3.0 + rnd(), col: LEAFG[i % LEAFG.length] });
      } else if (r < 0.8) {
        // a folded umbrella with a deck chair either side of it, facing the water
        if (!H.claim(p[0], p[2], 1.9)) continue;
        const g = new T.Group(); g.position.set(...p); g.rotation.y = f.yaw + (side > 0 ? Math.PI / 2 : -Math.PI / 2); K.add(g);
        const pole = mesh(K3D.geo('pf2-umPole', () => new T.CylinderGeometry(0.05, 0.05, 2.6, 6)), tm('#f4ecd8')); pole.position.y = 1.3; g.add(pole);
        const um = mesh(K3D.geo('pf2-umCone', () => new T.ConeGeometry(0.35, 1.6, 8)), K3D.toon('#ffffff', { map: PARK.stripes(['#e8483a', '#3fa0e8', '#ffd23a'][k % 3], '#f4ecd8', 8, { v: true }) })); um.position.y = 2.2; g.add(um);
        for (const sx of [-1, 1]) { const ch = mesh(K3D.geo('pf2-deckChair', () => new T.BoxGeometry(0.7, 0.1, 1.6)), K3D.toon('#ffffff', { map: PARK.stripes(['#3fa0e8', '#e8483a', '#3fa06a'][k % 3], '#f4ecd8', 6) })); ch.position.set(sx * 1.0, 0.4, 0); ch.rotation.x = -0.3; g.add(ch); }
      }
    }
    const trunkGeo = K3D.geo('pf2-palmTrunk', () => { const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(new T.Vector3(1.4 * u * u, u * 8, 0)); } return new T.TubeGeometry(new T.CatmullRomCurve3(pts), 16, 0.22, 8); });
    inst(K, trunkGeo, K3D.toon('#ffffff', { map: barkTex() }), trunks, { cast: true });
    inst(K, leafGeo(1, 0.22, 0.42, 'frond'), leafM, fronds, { ink: false, cast: true });
  }
  }

  /* ---------- build ---------- */
  function build(K, sc, helpers) {
    H = helpers; rnd = PARK.rnd; B = PARK.bulbs(K, 14000); W = sc.water;
    const S = {};
    // banks
    const ranges = []; for (let i = 0; i < PR.kinds.length; i++) ranges.push([PR.kinds[i][0], i + 1 < PR.kinds.length ? PR.kinds[i + 1][0] : R.len, PR.kinds[i][1]]);
    for (const [a, b, k] of ranges) {
      if (k === 'rock') rockBanks(K, a, b);
      else if (k === 'tower') { trough(K, a, b); trestles(K, a, b); }
    }
    S.belts = L.lifts.map(lf => belt(K, lf));
    S.tops = [liftTop(K, A.lift1Top0 + 1, false), liftTop(K, A.top0 + 1.5, true)];
    S.smile = smile(K, A.brink - 0.5);
    // the jungle
    ruins(K, A.jungle, A.fork2a);
    S.hippos = obs('hippo').map(o => ({ o, ...hippo(K) }));
    S.elephant = elephant(K, obs('jet')[0]);
    S.crocs = obs('croc').map(o => ({ o, ...croc(K) }));
    S.monkeys = obs('coconut').map(o => monkey(K, o));
    {
      const rocks = [], foam = [];
      for (const o of obs('rock')) { const p = CW(o.s, o.x); rocks.push({ p: [p[0], p[1] - 0.2, p[2]], yaw: rnd() * 6, s: [2.2, 1.8, 2.2], col: '#6a6478' }); foam.push({ x: p[0], y: p[1], z: p[2], r: 1.3 }); }
      // ledges of rock at the edges of each little rapid, foaming
      for (const d of L.drops) if (d.kind === 'rapid') for (const sx of d.side ? [d.side] : [-1, 1]) { const I = PARKFLUME.islandAt(d.s0 + 1); const x = d.side ? d.side * ((I ? I.hw : 0) + PR.w(d.s0) * 0.5 + 1.5) : sx * (PR.w(d.s0) - 0.6); for (const dx of [-0.7, 0, 0.7]) { const p = CW(d.s0 + 1 + dx, x + dx * 0.4); rocks.push({ p: [p[0], p[1] - 0.25, p[2]], yaw: rnd() * 6, s: [1.2, 0.9, 1.2], col: '#5a5868' }); foam.push({ x: p[0], y: p[1], z: p[2], r: 0.8 }); } }
      inst(K, K3D.geo('pf-rock', () => new T.IcosahedronGeometry(0.5, 1)), K3D.toon('#ffffff', { map: rockTex() }), rocks, { cast: true });
      W.foamAt(foam);
    }
    S.whirls = L.whirls.map(wl => whirl(K, wl));
    S.snake = snake(K, obs('tail')[0]);
    S.curtain = curtain(K, obs('curtain')[0]);
    jungleIsland(K, L.islands[1]);
    // the mill
    millPond(K, S);
    millHouse(K, S);
    millInside(K, S);
    S.saws = saws(K);
    S.chutes = chutes(K);
    S.band = bandSaw(K, L.islands[2]);
    S.crane = crane(K, obs('crane')[0]);
    S.steam = steam(K);
    S.pwheel = pwheel(K, obs('pwheel')[0]);
    // the lagoon
    S.ftn = jetFountains(K);
    S.barges = barges(K, sc);
    S.skier = skier(K, obs('skier')[0]);
    S.jump = weirJump(K);
    S.light = lighthouse(K);
    S.zone = splashZone(K, A.splash + 3);
    // the scattered things last, on ground that nothing built stands on
    H.scan();
    S.jungle = jungle(K, A.jungle - 8, A.lift1Foot - 1);
    millYard(K);
    lagoonDecor(K, A.splash + 4, A.ring - 6);
    B.done();
    return S;
  }

  /* ---------- every frame ---------- */
  function update(K, sc, st, dt, t) {
    const S = sc.s2; if (!S) return;
    const T0 = st.t; // the rules' clock: every hazard moves by it
    // the belts and the gears
    for (const b of S.belts) beltPose(b, dt);
    for (const tp of S.tops) { tp.g1.rotation.z -= dt * 1.4; tp.g2.rotation.z += dt * 2.6; }
    S.smile.flash.material.color.copy(hot('#ffffff', st.flash > 0 ? 6 : 0.4 + 0.2 * Math.sin(t * 6)));
    // the jungle
    for (const fl of S.jungle.flames) { const k = 1 + Math.sin(t * 13 + fl.ph) * 0.12 + Math.sin(t * 23 + fl.ph * 2) * 0.08; fl.a.scale.set(1, k, 1); fl.b.scale.set(1, k * 1.1, 1); }
    for (const h of S.hippos) {
      const q = PARKFLUME.obsAt(h.o, T0), u = q.u, f = R.at(q.s), p = R.local(q.s, q.x, 0, f);
      const rise = sm(0, 0.5, u) * (1 - sm(3.1, 3.6, u));
      h.g.position.set(p[0], p[1] - 1.5 + rise * 1.4, p[2]); h.g.rotation.y = f.yaw + Math.PI + Math.sin(T0 * 0.4 + h.o.s) * 0.2;
      h.up.rotation.x = -sm(0.8, 1.1, u) * (1 - sm(2.5, 2.8, u)) * 0.9;
      h.key.rotation.z += dt * 3;
      h.ring.material.opacity = Math.max(0, 0.6 - u * 0.5) * (u < 1.2 ? 1 : 0); h.ring.scale.setScalar(1 + u * 1.2); h.ring.position.y = 1.5 - rise * 1.4 + 0.02;
    }
    {
      const E = S.elephant, u = cu(E.o, T0), on = u < E.o.cyc[1], per = E.o.cyc[0];
      const lift = on ? 1 : sm(per - 0.8, per, u);
      E.segs.forEach((sg, i) => { sg.rotation.x = i ? -(0.12 + lift * 0.14) - Math.sin(t * 2 + i) * 0.03 * (1 - lift) : 0.9 - lift * 1.3; });
      for (const [k, e] of E.ears.entries()) e.rotation.y = (k ? -1 : 1) * (0.2 + Math.sin(t * 3 + k) * 0.25);
      E.jet.visible = on; E.tex.offset.x -= dt * 3;
      E.jet.scale.setScalar(1); E.halo.material.color.copy(hot('#cfeeff', on ? 0.6 : 0));
    }
    for (const c of S.crocs) {
      const q = PARKFLUME.obsAt(c.o, T0), u = q.u, f = R.at(q.s), p = R.local(q.s, q.x, 0, f);
      c.g.position.set(p[0], p[1] - 0.12 + Math.sin(t * 1.3 + c.o.s) * 0.03, p[2]);
      const snap = u > 4.2 ? Math.sin((u - 4.2) / 0.8 * Math.PI) : 0;
      c.g.rotation.y = f.yaw + Math.PI + c.o.dir * snap * 0.7;
      c.jaw.rotation.x = -(snap * 0.7 + Math.max(0, Math.sin(t * 0.8 + c.o.s)) * 0.08);
      const warn = sm(3.3, 3.6, u) * (u < 4.9 ? 1 : 0);
      for (const e of c.eyes) e.material.color.copy(warn > 0 ? hot('#ff3a2a', 1 + warn * 2.5) : new T.Color('#ffd23a'));
      c.glow.material.color.copy(hot('#ff3a2a', warn * 0.8));
    }
    for (const m of S.monkeys) {
      const q = PARKFLUME.obsAt(m.o, T0), u = q.u, f = R.at(m.o.s), wp = R.local(m.o.s, m.o.x, 0, f);
      m.g.rotation.z = Math.sin(t * 1.6 + m.o.s) * 0.12;
      m.arm.rotation.x = u < 1.2 ? -2.6 * sm(0.2, 1.1, u) : -2.6 + sm(1.2, 1.35, u) * 3.4;
      const fall = sm(1.2, 1.5, u), held = u < 1.2 || u > 3.0;
      m.g.updateMatrixWorld(true);
      if (held) { const hp = new T.Vector3(0, -0.8, 0.2).applyMatrix4(m.arm.matrixWorld); m.nut.position.copy(hp); m.nut.visible = u < 1.2 || u > 3.2; }
      else { const y = wp[1] + 5.6 * (1 - fall * fall); m.nut.visible = u < 1.6; m.nut.position.set(wp[0], Math.max(wp[1] - 0.15, y), wp[2]); }
      m.nut.rotation.x += dt * 8;
      const warn = u < 1.5 ? sm(0, 0.3, u) : u < 1.85 ? 1 - sm(1.5, 1.85, u) : 0;
      m.ring.position.set(wp[0], wp[1] + 0.04, wp[2]); m.ring.material.opacity = warn * (0.6 + 0.4 * Math.sin(t * 14)); m.ring.scale.setScalar(1.2 - Math.min(1, u / 1.5) * 0.35);
      if (u > 1.5 && u < 1.5 + dt * 1.5 && sc.log && sc.log.spray) sc.log.spray.emit(new T.Vector3(wp[0], wp[1], wp[2]), new T.Vector3(0, 0, 0), 30, 3, 3.5, 1.0);
    }
    for (const w of S.whirls) { w.disc.rotation.y -= dt * 0.9; w.disc2.rotation.y -= dt * 1.7; }
    {
      const N = S.snake, u = cu(N.o, T0), on = u < N.o.cyc[1];
      const drop = on ? sm(0, 0.3, u) * (1 - sm(N.o.cyc[1] - 0.3, N.o.cyc[1], u)) : 0, warn = !on && u > N.o.cyc[0] - 0.7 ? Math.sin(t * 30) * 0.15 : 0;
      N.tail.position.y = N.base + 2.6 - drop * 2.8; N.tail.rotation.z = warn + Math.sin(t * 2) * 0.05;
      N.tongue.scale.z = (Math.sin(t * 7) > 0.3) ? 1 : 0.2;
      N.head.rotation.z = Math.sin(t * 0.9) * 0.1;
    }
    S.curtain.tex.offset.y += dt * 1.6;
    // the mill
    for (const fl of S.flogs) { const q = PARKFLUME.obsAt(fl.o, T0), f = R.at(q.s), p = R.local(q.s, q.x, 0, f); fl.g.position.set(p[0], p[1] + Math.sin(t * 1.4 + fl.o.s) * 0.04 - 0.1, p[2]); fl.g.rotation.set(0, f.yaw + 1.2 + Math.sin(T0 * 0.2 + fl.o.x) * 0.5, 0, 'YXZ'); fl.g.children[0].rotation.z = 0; if (fl.rb) { fl.rb.rotation.z = Math.sin(t * 5 + fl.o.s) * 0.15; fl.rb.userData.key.rotation.z += dt * 4; fl.rb.position.x = Math.sin(t * 2.5 + fl.o.s) * 0.5; } }
    if (S.smoke) { for (const p of S.smoke.puffs) { p.t += dt; const u = (p.t % 6) / 6; p.m.position.set(S.smoke.x + u * 4 + Math.sin(p.t) * 0.3, S.smoke.y + u * 8, S.smoke.z - u * 2); p.m.scale.setScalar(1.5 + u * 6); p.m.material.opacity = 0.35 * (1 - u) * sm(0, 0.1, u); } }
    S.oldWheel.rotation.x -= dt * 0.25;
    for (const c of S.conv) c.logs.forEach((lg, i) => { const len = c.s1 - c.s0, s = c.s0 + ((i / c.logs.length * len + t * 0.8) % len), f = R.at(s), p = R.local(s, c.side * (PR.w(s) + 1.9), 1.35, f); lg.position.set(...p); lg.rotation.set(0, f.yaw, 0); });
    for (const r of S.mrobots || []) { r.userData.key.rotation.z += dt * 3; r.userData.head.rotation.y = Math.sin(t * 0.7 + r.position.x) * 0.5; }
    for (const sw of S.saws) {
      const u = cu(sw.o, T0), [per, on] = sw.o.cyc, up = u < on ? sm(0, 0.2, u) * (1 - sm(on - 0.2, on, u)) : 0;
      sw.blade.position.y = -1.5 + up * 1.65; sw.blade.rotation.x -= dt * 14;
      const warn = u < on || u > per - 0.8;
      sw.lamp.material.color.copy(hot('#ff3a2a', warn ? (Math.sin(t * 18) > 0 ? 3 : 1.2) : 0.3)); sw.halo.material.color.copy(hot('#ff3a2a', warn ? 0.6 : 0));
    }
    for (const c of S.chutes) {
      const u = cu(c.o, T0), [per, on] = c.o.cyc, pre = per - 1.5;
      // the log rides down the chute from pre to per (hits the water at u = 0), then floats away and sinks out of sight
      if (u >= pre) { const k = sm(pre, per, u); c.lg.visible = true; c.lg.position.lerpVectors(c.top, c.bot, k * k); c.lg.lookAt(c.bot); }
      else if (u < 1.2) { c.lg.visible = true; const p = c.bot.clone(); p.y = wyAt(c.o.s) + 0.1 - u * 0.4; c.lg.position.copy(p); }
      else c.lg.visible = false;
      const sp = R.local(c.o.s, 0, 0.03); c.shadow.position.set(sp[0], sp[1], sp[2]); c.shadow.scale.set(PR.w(c.o.s), 1, 1.4); c.shadow.rotation.y = R.at(c.o.s).yaw;
      c.shadow.material.opacity = u >= pre ? 0.15 + 0.35 * sm(pre, per, u) : 0;
      c.wave.position.set(sp[0], sp[1] + 0.02, sp[2]); c.wave.rotation.y = R.at(c.o.s).yaw; c.wave.scale.set(2 * PR.w(c.o.s), 1, 1.8);
      c.wave.material.opacity = u < on ? 0.9 * (1 - u / on * 0.5) : 0;
      if (u < dt * 1.2 && sc.log && sc.log.spray) sc.log.spray.emit(c.bot, new T.Vector3(0, 0, 0), 60, 4, 5, 1.4);
    }
    for (const wh of S.band.wheels) wh.rotation.x -= dt * 9; S.band.bandTex.offset.y += dt * 6;
    { const C = S.crane, q = PARKFLUME.obsAt(C.o, T0), f = R.at(q.s), top = R.local(q.s, q.x, 6.1, f), sway = Math.cos(T0 * 0.6) * 0.18; C.tro.position.set(...top); C.tro.rotation.y = f.yaw; const len = 6.1 - 0.75; C.cable.scale.y = len; C.claw.position.y = -len; C.claw.rotation.x = sway * 0.4; C.claw.rotation.z = -sway; }
    for (const s of S.steam) {
      const u = cu(s.o, T0), [per, on] = s.o.cyc;
      s.needle.rotation.z = -1.2 + 2.4 * (u < on ? 1 : u / per);
      s.puffs.forEach((p, k) => { const kk = k / s.puffs.length, live = u < on + 0.4; if (!live) { p.material.opacity = 0; return; } const w = Math.min(1, u / on) - kk * 0.25; const x = Math.max(0, Math.min(1, w + kk * 0.3)); p.position.set(s.a[0] + (s.b[0] - s.a[0]) * x, s.a[1] + Math.sin(kk * 9 + t) * 0.3 + x * 0.6, s.a[2] + (s.b[2] - s.a[2]) * x); p.scale.setScalar(1.4 + x * 2.4); p.material.opacity = 0.55 * (u < on ? 1 : 1 - (u - on) / 0.4) * (w > 0 ? 1 : 0); });
      if (u > per - 0.6) s.valve.rotation.z += dt * 6;
    }
    S.pwheel.wheel.rotation.x = -PARKFLUME_SCENE.wheelAngle({ per: S.pwheel.o.cyc[0], down: S.pwheel.o.cyc[1] }, T0 - S.pwheel.o.cyc[2]);
    // the lagoon
    S.ftn.tex.offset.y -= dt * 2.4;
    for (const fo of S.ftn.list) {
      const u = cu(fo.o, T0), [per, on] = fo.o.cyc, h = u < on ? 7 * sm(0, 0.15, u) * (1 - sm(on - 0.1, on + 0.2, u)) : (u > per - 0.6 ? 0.4 * sm(per - 0.6, per, u) : 0);
      fo.col.scale.set(1, Math.max(0.01, h), 1); fo.cap.position.y = h; fo.cap.visible = h > 0.2; fo.glow.material.color.copy(hot('#ffffff', h > 0.2 ? 0.3 : 0)); fo.glow.position.y = fo.p[1] + h * 0.6;
    }
    for (const b of S.barges) { b.g.position.y = wyAt(b.o.s) + Math.sin(t * 1.2 + b.o.s) * 0.05; b.g.rotation.z = Math.sin(t * 0.9 + b.o.s) * 0.04; b.rb.userData.head.rotation.y = Math.sin(t + b.o.s) * 0.6; if (st.s > A.splash - 10 && t > b.next && sc.fw) { b.next = t + 3 + rnd() * 4; const p = b.g.position; sc.fw.burst(p.x + (rnd() - 0.5) * 6, p.y + 22 + rnd() * 10, p.z + (rnd() - 0.5) * 6, ['#ff5a7a', '#ffd24a', '#7ae8ff', '#9aff8a', '#ff9ad6'][Math.floor(rnd() * 5)]); } }
    {
      const K2 = S.skier, q = PARKFLUME.obsAt(K2.o, T0), f = R.at(q.s), p = R.local(q.s, q.x, 0, f), dx = Math.cos(T0 * 0.7) * 0.7 * 5.0;
      K2.g.position.set(p[0], p[1], p[2]); K2.g.rotation.y = f.yaw + Math.PI / 2 * Math.sign(dx || 1) + Math.PI;
      const tp = R.local(q.s - 1.5, q.x + Math.sign(dx) * 1.0, 6.3, f); K2.tro.position.set(...tp);
      const a = new T.Vector3(p[0], p[1] + 1.1, p[2]), b = new T.Vector3(...tp), d = b.clone().sub(a); K2.rope.position.copy(a); K2.rope.scale.y = d.length(); K2.rope.quaternion.setFromUnitVectors(UP, d.normalize());
      if (sc.log && sc.log.spray && Math.random() < 0.5) sc.log.spray.emit(new T.Vector3(p[0], p[1], p[2]), new T.Vector3(-dx * f.r[0] * 0.3, 0, -dx * f.r[2] * 0.3), 2, 1, 1.5, 0.7);
    }
    {
      const J = S.jump; J.ring.rotation.z += dt * 0.6; J.mat.uniforms.uPx.value = K3D.R ? K3D.R.domElement.height / 720 : 1;
      for (let k = 0; k < 3; k++) { const i = J.head = (J.head + 1) % J.N, a = Math.random() * 6.28, r = J.w + 0.2; const p = new T.Vector3(Math.cos(a) * r, Math.abs(Math.sin(a)) * r + 0.2, 0.2).applyMatrix4(J.g.matrixWorld); J.pos[i * 3] = p.x; J.pos[i * 3 + 1] = p.y; J.pos[i * 3 + 2] = p.z; J.vel[i * 3] = (Math.random() - 0.5) * 3; J.vel[i * 3 + 1] = Math.random() * 2; J.vel[i * 3 + 2] = (Math.random() - 0.5) * 3; J.life[i] = 1; }
      for (let i = 0; i < J.N; i++) { if (J.life[i] <= 0) continue; J.vel[i * 3 + 1] -= 6 * dt; J.pos[i * 3] += J.vel[i * 3] * dt; J.pos[i * 3 + 1] += J.vel[i * 3 + 1] * dt; J.pos[i * 3 + 2] += J.vel[i * 3 + 2] * dt; J.life[i] -= dt * 1.8; }
      J.geo.attributes.position.needsUpdate = J.geo.attributes.aL.needsUpdate = true;
    }
    S.light.beam.rotation.y += dt * 0.7;
    for (const [k, r] of S.zone.fans.entries()) { const cheer = st.s > A.brink - 2 && st.s < A.splash + 12; r.position.y = 0.8 + (cheer ? Math.abs(Math.sin(t * 7 + k)) * 0.35 : 0); r.userData.key.rotation.z += dt * 3; }
  }

  return { build, update };
})();
