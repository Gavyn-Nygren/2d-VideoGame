/* Pip & Bo - 43-3 Claw Machine Rescue: the mountain of prizes. Loaded on demand with the 3D kit (after the prizes and
   the machine). Scenery only: never read by the rules.

   ARCADECLAW_HEAPS.build(K, o) dresses every solid of the map as a heap of prizes:
     - a lumpy MASS under it all (one mesh): soft patches of plush colour with a fuzzy nap, so nothing between the prizes
       ever shows bare metal
     - walkable tops get prizes lying flat and sunk in (faces up, heads and paws poking out a little: never higher than
       Bo's ankles), wall tops get prizes piled up on each other, the faces of heaps get prizes pressed into them
       looking out (sticking out at most a quarter of a unit), the gap's trench is full of loose small prizes, the
       piles against the side glass squash prizes flat on the glass
     - the parts still to come (Plush Mountain, the Capsule Wall, the Prize Chute) as the far view: the mountain rising
       to the chute at the top, so the climb's goal is always in sight
   Prizes go in chunks along the climb (one set of instanced meshes per chunk), so the chunks behind the camera are
   skipped when drawing. Returns { fields, mass, sink, clear }. */
'use strict';

const ARCADECLAW_HEAPS = (function () {
  const T = K3D.T, A = ARCADE, MP = ARCADECLAW_MAP, TY = ARCADECLAW_TOYS, P = Math.PI;
  const rnd = () => A.rnd();
  const pick = a => a[Math.floor(rnd() * a.length) % a.length];

  /* ---------- noise (fixed: the mountain is the same every time) ---------- */
  const hash = (x, y, z) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const sm = t => t * t * (3 - 2 * t);
  function noise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
    const l = (a, b, t) => a + (b - a) * t, c = (i, j, k) => hash(xi + i, yi + j, zi + k);
    return l(l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf), l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf), zf);
  }
  const fbm = (x, y, z) => noise(x, y, z) * 0.55 + noise(x * 2.03 + 7.1, y * 2.03, z * 2.03) * 0.3 + noise(x * 4.1, y * 4.1 + 3.3, z * 4.1) * 0.15;

  /* ---------- which prizes go where ---------- */
  const SOFT = ['bear', 'bearWink', 'bearPatch', 'bunny', 'cat', 'dog', 'octopus', 'penguin', 'frog', 'elephant', 'lion', 'owl', 'pig', 'monkey', 'dino', 'star', 'heart', 'mushroom', 'cloud', 'fish', 'carrot', 'chick', 'turtle', 'whale', 'dice'];
  const HARD = ['duck', 'robot', 'sball', 'gball', 'block', 'teeth', 'car', 'yoyo', 'ring', 'whistle', 'keyring', 'sticker', 'sweet', 'bracelet', 'globe', 'top', 'rocket', 'train', 'pin', 'trophy', 'spring', 'crayon', 'lolly', 'capsule', 'noodle', 'drum'];
  const SMALL = ['sball', 'gball', 'block', 'sweet', 'yoyo', 'ring', 'whistle', 'keyring', 'bracelet', 'car', 'capsule', 'dice', 'chick', 'teeth', 'top', 'lolly', 'sticker', 'noodle', 'spring'];
  const kindFor = (soft = 0.72) => rnd() < soft ? pick(SOFT) : pick(HARD);
  const SZ = k => TY.KINDS[k].size;

  // the mass's plush colours: soft and a little dark (it is the shade between the prizes), so it never shouts
  const NEUTRAL = new T.Color('#b8a4ac');
  const MASS_COLS = ['#e898bc', '#8ccc9c', '#a892dc', '#f2c46e', '#80bce6', '#ece2cc', '#f28e80', '#bc8e60', '#98dcc8', '#f2d640', '#ffb0a0', '#c8b0f0'].map(c => new T.Color(c).lerp(NEUTRAL, 0.35).multiplyScalar(0.42));
  const WHITE = new T.Color('#c8bcc4');
  // the pile between the prizes: a tile of packed little prizes (balls, beans, stars, blocks, sweets) with dark gaps, wrapping at the edges
  const packedTex = () => K3D.paint('acp-packed', 512, 512, (c, w, h) => {
    c.fillStyle = '#3e3046'; c.fillRect(0, 0, w, h);
    const cols = ['#ff8ab8', '#7ad89a', '#a88aff', '#ffd25a', '#6ac0ff', '#fff2dc', '#ff7a6a', '#d0a070', '#7ae8d0', '#ffe84a', '#ffb0a0', '#d0b8ff', '#ffffff', '#5aa8ff'];
    const R = (a, b) => a + A.rnd() * (b - a);
    const items = [];
    for (let i = 0; i < 150; i++) items.push({ x: R(0, w), y: R(0, h), r: R(22, 42), k: Math.floor(A.rnd() * 5), col: cols[Math.floor(A.rnd() * cols.length)], a: R(0, 6.28) });
    items.sort((p, q) => p.r - q.r);
    const draw = (it, ox, oy) => {
      c.save(); c.translate(it.x + ox, it.y + oy); c.rotate(it.a);
      const r = it.r, g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, it.col); g.addColorStop(1, '#7a6a80');
      c.fillStyle = g; c.strokeStyle = 'rgba(40,28,48,0.6)'; c.lineWidth = 2.5;
      c.beginPath();
      if (it.k === 0) c.arc(0, 0, r, 0, 6.28);                                   // a ball
      else if (it.k === 1) c.ellipse(0, 0, r * 1.25, r * 0.6, 0, 0, 6.28);         // a bean
      else if (it.k === 2) { for (let j = 0; j < 10; j++) { const rr = j % 2 ? r * 0.5 : r * 1.1, an = j / 10 * 6.28; c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } c.closePath(); } // a star
      else if (it.k === 3) { const q = r * 0.85; c.moveTo(-q + 6, -q); c.arcTo(q, -q, q, q, 8); c.arcTo(q, q, -q, q, 8); c.arcTo(-q, q, -q, -q, 8); c.arcTo(-q, -q, q, -q, 8); c.closePath(); } // a block
      else { c.ellipse(0, 0, r * 0.95, r * 0.75, 0, 0, 6.28); }                     // a sweet
      c.fill(); c.stroke();
      if (it.k === 4) { c.fillStyle = it.col; c.beginPath(); c.moveTo(r * 0.9, 0); c.lineTo(r * 1.5, -r * 0.45); c.lineTo(r * 1.5, r * 0.45); c.fill(); c.beginPath(); c.moveTo(-r * 0.9, 0); c.lineTo(-r * 1.5, -r * 0.45); c.lineTo(-r * 1.5, r * 0.45); c.fill(); }
      if (it.k === 0 && A.rnd() < 0.5) { c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = r * 0.25; c.beginPath(); c.arc(0, 0, r * 0.62, 0.4, 2.2); c.stroke(); }
      if ((it.k === 1 || it.k === 3) && A.rnd() < 0.45) { c.fillStyle = '#1c1420'; c.beginPath(); c.arc(-r * 0.25, -r * 0.05, r * 0.1, 0, 6.28); c.arc(r * 0.25, -r * 0.05, r * 0.1, 0, 6.28); c.fill(); }
      c.restore();
    };
    for (const it of items) for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) draw(it, ox, oy);
    // fluff over it all
    for (let i = 0; i < 5000; i++) { c.fillStyle = `rgba(255,255,255,${R(0.03, 0.1)})`; c.fillRect(R(0, w), R(0, h), 1, R(1, 3)); }
  }, { repeat: true });
  // the far climb's prizes: kinds with few parts (seen small and through the haze)
  const FAR = ['sball', 'gball', 'block', 'capsule', 'star', 'heart', 'cloud', 'fish', 'sweet', 'yoyo', 'drum', 'dice', 'top', 'globe', 'chick', 'mushroom', 'pig', 'carrot'];

  // the tone the next prizes get (set per part of a heap): bright underfoot, darker and calmer on walls, faces and far piles
  const TONE = { k: 1, g: 0 };
  const tone = (k, g) => { TONE.k = k; TONE.g = g; };

  /* ---------- the prize fields, in chunks along the climb ---------- */
  // two fields: the climb so far (every kind, outlined) and the far climb (fewer parts each, no outlines: it is hazy)
  function Fields(K) {
    // (the climb so far is one field: the camera looks down the machine and sees most of it at once, so slabs would only add draws)
    const near = TY.field(K, 6000, { lo: 'mid' }), far = TY.field(K, 6000, { ink: false });
    return {
      add(kind, x, y, z, o) { o.k = TONE.k; o.g = TONE.g; (z < -88 ? far : near).add(kind, x, y, z, o); this.n++; },
      n: 0,
      done() { return [near.done(), far.done()]; },
    };
  }
  // a prize lying on its back on a top at height y (its face to the ceiling), centred on (x, z), sunk in
  function lying(F, kind, x, y, z, s, up = 0.2) {
    const [, h, d] = SZ(kind), yaw = rnd() * P * 2;
    F.add(kind, x + Math.sin(yaw) * h * s * 0.5, y + up - d * s * 0.5, z + Math.cos(yaw) * h * s * 0.5, { yaw, tilt: -P / 2 + (rnd() - 0.5) * 0.5, roll: (rnd() - 0.5) * 0.7, s });
  }
  // a prize sitting sunk to its chin (only its head and ears show)
  function sunk(F, kind, x, y, z, s, up = 0.3) {
    const h = SZ(kind)[1];
    F.add(kind, x, y + up - h * s, z, { yaw: rnd() * P * 2, tilt: (rnd() - 0.5) * 0.4, roll: (rnd() - 0.5) * 0.4, s });
  }
  // a prize tipped over and half buried (its top pokes out about `up`)
  function tipped(F, kind, x, y, z, s, up = 0.32) {
    const h = SZ(kind)[1], tl = (0.5 + rnd() * 0.65) * (rnd() < 0.5 ? -1 : 1);
    F.add(kind, x, y + up - h * s * Math.cos(tl), z, { yaw: rnd() * P * 2, tilt: tl, roll: (rnd() - 0.5) * 0.6, s });
  }
  // a prize sitting on a pile (wall tops): leaning every way
  function piled(F, kind, x, y, z, s) {
    const h = SZ(kind)[1];
    F.add(kind, x, y - h * s * (0.15 + rnd() * 0.3), z, { yaw: rnd() * P * 2, tilt: (rnd() - 0.5) * 1.1, roll: (rnd() - 0.5) * 1.1, s });
  }
  // a prize pressed into a face (normal n = [nx, nz]) looking out; out: how far its front sticks out
  function pressed(F, kind, x, y, z, n, s, out = 0.22, flat = 1) {
    const [, h, d] = SZ(kind), yaw = Math.atan2(n[0], n[1]) + (rnd() - 0.5) * 0.7;
    const back = out - d * s * 0.5 * flat;
    F.add(kind, x + n[0] * back, y - h * s * 0.5, z + n[1] * back, { yaw, tilt: (rnd() - 0.5) * 0.7, roll: rnd() < 0.25 ? (rnd() - 0.5) * 3 : (rnd() - 0.5) * 0.8, s, sz: flat });
  }

  /* ---------- where nothing may stand up (things Bo uses, toys' homes, where toys get put) ---------- */
  function clearList() {
    const L = [];
    for (const c of MP.caps) L.push({ x: c.x, z: c.z, y: c.y, r: 1.35 });
    for (const l of MP.levers) L.push({ x: l.x, z: l.z, y: l.y, r: 1.4 });
    for (const k of MP.checks) L.push({ x: k.x, z: k.z, y: k.y, r: 1.7 });
    for (const b of MP.buttons) L.push({ x: b.x, z: b.z, y: b.y, r: 1.5 });
    for (const t of MP.toys) L.push({ x: t.x, z: t.z, y: t.y, r: Math.max(t.w, t.d) * 0.55 + 0.4, box: t });
    for (const o of MP.obstacles) {
      if (o.put) { const t = MP.toys.find(q => q.id === o.toy); L.push({ x: o.put[0], z: o.put[1], y: null, r: t ? Math.max(t.w, t.d) * 0.55 + 0.3 : 1.5 }); }
      if (o.puts) for (const pp of o.puts) L.push({ x: pp[0], z: pp[1], y: null, r: 1.2 });
    }
    for (const sk of MP.sinks) L.push({ rect: sk });
    return L;
  }
  const isClear = (L, x, z, y) => {
    for (const c of L) {
      if (c.rect) { if (x > c.rect.x0 - 0.3 && x < c.rect.x1 + 0.3 && z < c.rect.z0 + 0.3 && z > c.rect.z1 - 0.3 && Math.abs(y - c.rect.y) < 0.6) return false; continue; }
      if (c.y != null && Math.abs(c.y - y) > 1.2) continue;
      if (Math.hypot(x - c.x, z - c.z) < c.r) return false;
    }
    return true;
  };

  /* ---------- the mass ---------- */
  const dressed = s => s.look === 'heap' || s.look === 'wall' || s.look === 'trench' || s.look === 'step';
  // the top of any map solid (other than s) covering the point, or -Infinity
  function topAt(x, z, not, extra) {
    let y = -Infinity;
    for (const s of extra ? MP.solids.concat(extra) : MP.solids) {
      if (s === not || s.look === 'glass' || s.look === 'lid' || s.look === 'box' || s.look === 'ball') continue;
      if (Math.abs(x - s.x) <= s.w / 2 && Math.abs(z - s.z) <= s.d / 2) y = Math.max(y, s.y1);
    }
    return y;
  }
  function Mass() {
    const pos = [], col = [], uv = [], idx = [];
    const c = new T.Color();
    return {
      // a grid from origin o along edge vectors ua (nu steps) and va (nv steps); the outward normal is va x ua
      grid(o, ua, va, nu, nv, disp) {
        const base = pos.length / 3;
        // the texture is laid on from the side the grid faces (tops from above, faces from the front), so it never stretches
        const nx = va[1] * ua[2] - va[2] * ua[1], ny = va[2] * ua[0] - va[0] * ua[2], nz = va[0] * ua[1] - va[1] * ua[0];
        const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz), face = ay >= ax && ay >= az ? 'y' : az >= ax ? 'z' : 'x';
        for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
          const x = o[0] + ua[0] * i / nu + va[0] * j / nv, y = o[1] + ua[1] * i / nu + va[1] * j / nv, z = o[2] + ua[2] * i / nu + va[2] * j / nv;
          const p = disp(x, y, z, i / nu, j / nv);
          pos.push(p[0], p[1], p[2]);
          const TS = 0.36; // (one tile of packed little prizes per 2.8 units)
          if (face === 'y') uv.push(p[0] * TS, p[2] * TS); else if (face === 'z') uv.push(p[0] * TS, p[1] * TS); else uv.push(p[2] * TS, p[1] * TS);
          // patches of plush colour, each a toy-sized cell, softly blended at the vertices
          const cx = Math.floor(p[0] / 0.85), cy = Math.floor(p[1] / 0.85), cz = Math.floor(p[2] / 0.85);
          c.copy(MASS_COLS[Math.floor(hash(cx, cy, cz) * MASS_COLS.length)]).lerp(WHITE, 0.55);
          const sh = 0.8 + fbm(p[0] * 0.7, p[1] * 0.7, p[2] * 0.7) * 0.35; c.multiplyScalar(sh);
          // deep down (the trench floor, the feet of faces) the pile is in shadow
          c.multiplyScalar(Math.max(0.45, Math.min(1, 0.55 + (p[1] + 2.6) * 0.25)));
          col.push(c.r, c.g, c.b);
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
          const a = base + j * (nu + 1) + i, b = a + 1, cc = a + nu + 1, d = cc + 1;
          idx.push(a, cc, b, b, cc, d);
        }
      },
      mesh() {
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
        g.setIndex(idx); g.computeVertexNormals();
        const m = K3D.mat('acp-mass', () => { const mm = TY.rimify(K3D.toon('#ffffff', { map: packedTex() }), '1.0, 0.9, 0.85', 0.3, 2.4, 'mass'); mm.vertexColors = true; return mm; });
        const mesh = new T.Mesh(g, m); mesh.receiveShadow = true; mesh.castShadow = false;
        mesh.userData.live = true; // (its vertex colours would be lost in the batching)
        return mesh;
      },
    };
  }
  // one solid as a lumpy heap: the top, and every face that shows (not buried in a neighbour)
  function massSolid(M, s, extra) {
    const x0 = s.x - s.w / 2, x1 = s.x + s.w / 2, z0 = s.z - s.d / 2, z1 = s.z + s.d / 2, y1 = s.y1;
    const wall = s.look === 'wall', amp = wall ? 0.42 : s.look === 'trench' ? 0.2 : 0.1;
    const st = 0.5, nu = Math.max(1, Math.round((x1 - x0) / st)), nv = Math.max(1, Math.round((z1 - z0) / st));
    // the top: soft lumps (a walls' top domes up and rolls off at its edges)
    M.grid([x0, y1, z0], [x1 - x0, 0, 0], [0, 0, z1 - z0], nu, nv, (x, y, z, u, v) => {
      let dy = (fbm(x * 0.55, 1.7, z * 0.55) - 0.5) * 2 * amp - 0.06;
      if (wall) { const e = Math.min(u * (x1 - x0), (1 - u) * (x1 - x0), v * (z1 - z0), (1 - v) * (z1 - z0)); dy += Math.min(1, e / 1.6) * 0.35 - 0.25; }
      return [x, y + dy, z];
    });
    // the faces: [origin, ua, va, normal, length, the outside point at parameter t]
    const faces = [
      [[x1, s.y0, z0], [0, 0, z1 - z0], [0, y1 - s.y0, 0], [1, 0], t => [x1 + 0.3, z0 + (z1 - z0) * t], z1 - z0],
      [[x0, s.y0, z0], [0, y1 - s.y0, 0], [0, 0, z1 - z0], [-1, 0], t => [x0 - 0.3, z0 + (z1 - z0) * t], z1 - z0],
      [[x0, s.y0, z1], [0, y1 - s.y0, 0], [x1 - x0, 0, 0], [0, 1], t => [x0 + (x1 - x0) * t, z1 + 0.3], x1 - x0],
      [[x0, s.y0, z0], [x1 - x0, 0, 0], [0, y1 - s.y0, 0], [0, -1], t => [x0 + (x1 - x0) * t, z0 - 0.3], x1 - x0],
    ];
    const shown = [];
    for (const f of faces) {
      // how high the ground outside comes (lowest along the face): the face shows above that
      let lo = Infinity, glass = false;
      for (let k = 0; k <= 8; k++) { const [ox, oz] = f[4](k / 8); lo = Math.min(lo, topAt(ox, oz, s, extra)); if (Math.abs(ox) > 16.45 || oz > 20.1) glass = true; }
      const yb = Math.max(s.y0, lo === -Infinity ? s.y0 : lo - 0.4);
      if (yb >= y1 - 0.05) continue;
      const len = f[5], hgt = y1 - yb;
      const n = f[3], nn = [n[0], 0, n[1]];
      const o = f[0].slice(); o[1] = yb;
      const ua = f[1].slice(), va = f[2].slice();
      if (ua[1]) ua[1] = hgt; if (va[1]) va[1] = hgt;
      const nU = Math.max(1, Math.round((ua[1] ? hgt : len) / st)), nV = Math.max(1, Math.round((va[1] ? hgt : len) / st));
      M.grid(o, ua, va, nU, nV, (x, y, z) => {
        const k = glass ? 0.04 : (fbm(x * 0.6 + 3, y * 0.6, z * 0.6) - 0.35) * 0.5 * (wall ? 1.4 : 1);
        // the top edge rolls over (a heap, not a box)
        const e = Math.max(0, 1 - (y1 - y) / 0.6);
        return [x + nn[0] * (k - e * e * 0.25), y - e * e * 0.12, z + nn[2] * (k - e * e * 0.25)];
      });
      shown.push({ n, yb, y1, len, at: f[4], glass, o: f[0], s, extra });
    }
    return shown;
  }

  /* ---------- dressing one solid with prizes ---------- */
  function dressSolid(F, L, s, faces) {
    const x0 = s.x - s.w / 2, x1 = s.x + s.w / 2, z0 = s.z - s.d / 2, z1 = s.z + s.d / 2, y1 = s.y1;
    const wall = s.look === 'wall', trench = s.look === 'trench';
    const sp = trench ? 0.62 : wall ? 1.1 : 0.92;
    for (let x = x0 + sp * 0.5; x < x1; x += sp) for (let z = z0 + sp * 0.5; z < z1; z += sp) {
      const jx = x + (rnd() - 0.5) * sp * 0.8, jz = z + (rnd() - 0.5) * sp * 0.8;
      if (jx < x0 + 0.1 || jx > x1 - 0.1 || jz < z0 + 0.1 || jz > z1 - 0.1) continue;
      // (a spot inside a taller neighbour is buried: skip it)
      if (topAt(jx, jz, s, faces.extra) > y1 + 0.2) continue;
      tone(trench ? 0.5 : wall ? 0.78 : 1, trench ? 0.35 : wall ? 0.3 : 0.12); // (a trench reads as a dark drop)
      if (trench) { const k = pick(SMALL); piled(F, k, jx, y1, jz, 0.9 + rnd() * 0.6); continue; }
      if (wall) {
        const k = kindFor(0.75), s1 = 1.3 + rnd() * 0.8;
        if (!isClear(L, jx, jz, y1)) { lying(F, k, jx, y1, jz, s1, 0.15); continue; }
        piled(F, k, jx, y1 + 0.1, jz, s1);
        if (rnd() < 0.35) piled(F, kindFor(0.8), jx + (rnd() - 0.5) * 0.5, y1 + 0.6 + rnd() * 0.4, jz + (rnd() - 0.5) * 0.5, 1.0 + rnd() * 0.6);
        continue;
      }
      if (!isClear(L, jx, jz, y1)) { if (rnd() < 0.85) lying(F, pick(['sticker', 'sweet', 'ring', 'bracelet', 'star', 'heart', 'fish']), jx, y1, jz, 0.9 + rnd() * 0.4, 0.06); continue; }
      // underfoot: big plush lying every which way, tipped over, or sunk to the chin, all overlapping (Bo wades over them)
      const k = kindFor(0.8), s1 = 1.25 + rnd() * 0.65, r = rnd();
      if (r < 0.5) lying(F, k, jx, y1, jz, s1, 0.2); else if (r < 0.85) tipped(F, k, jx, y1, jz, s1, 0.3); else sunk(F, k, jx, y1, jz, s1, 0.32);
    }
    // the faces: prizes pressed in, looking out (flat against the glass where the heap meets it)
    for (const f of faces) {
      const hgt = f.y1 - f.yb, fsp = f.glass ? 1.45 : 0.78;
      for (let a = fsp * 0.5; a < f.len; a += fsp) for (let y = Math.max(f.yb, f.glass ? -1.2 : -9) + fsp * 0.45; y < f.y1 - 0.1; y += fsp) {
        const [ox, oz] = f.at(Math.min(1, Math.max(0, (a + (rnd() - 0.5) * 0.5) / f.len)));
        if (f.glass && oz < -45 && oz < 20) continue; // (the side glass far up is only ever seen from inside)
        const px = ox - f.n[0] * 0.3, pz = oz - f.n[1] * 0.3, py = y + (rnd() - 0.5) * 0.4;
        if (topAt(ox, oz, s, f.extra) > py + 0.3) continue; // (buried in the neighbour there)
        if (!f.glass && !isClear(L, px, pz, py)) continue;
        const k = f.glass ? pick(SOFT) : kindFor(0.75);
        tone(f.glass ? 0.85 : 0.62, f.glass ? 0.2 : 0.35);
        pressed(F, k, px, py, pz, f.n, (1.25 + rnd() * 0.6) * (hgt < 1.2 ? 0.75 : 1), f.glass ? 0.0 : 0.22, f.glass ? 0.55 : 1);
      }
    }
  }

  /* ---------- the bean pit (a sink spot): loose foam beans that give underfoot ---------- */
  function sinkBeans(K, sk) {
    const beans = [];
    for (let x = sk.x0 + 0.15; x < sk.x1; x += 0.3) for (let z = sk.z1 + 0.15; z < sk.z0; z += 0.3) beans.push([x + (rnd() - 0.5) * 0.2, z + (rnd() - 0.5) * 0.2, rnd() * 6.28, rnd() * 6.28]);
    const im = new T.InstancedMesh(K3D.geo('acp-bean', () => new T.CapsuleGeometry(0.11, 0.12, 3, 8)), K3D.mat('acp-beanM', () => TY.rimify(K3D.toon('#ffffff'), '1.0, 1.0, 1.0', 0.35, 3.0, 'bean')), beans.length);
    const cols = ['#fbf6ea', '#f6eedc', '#ffe8f0', '#e8f6ff', '#fff4c8', '#eafff0'], c = new T.Color(), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), s = new T.Vector3(1, 1, 1);
    beans.forEach((b, i) => { e.set(b[2], b[3], 0); q.setFromEuler(e); m4.compose(v.set(b[0], sk.y + 0.04 + rnd() * 0.08, b[1]), q, s); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(cols[i % cols.length])); });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.receiveShadow = true; im.userData.live = true;
    // the pit's rim: a soft roll of plush round the edge, and a little printed sign (made-up)
    K.add(im);
    return { im, beans, sk, base: sk.y + 0.06 };
  }

  /* ---------- the far climb: Plush Mountain, the Capsule Wall and the Prize Chute (seen from below) ---------- */
  function farClimb(K, F, M, bulbs, glows) {
    const g = new T.Group(); g.name = 'farClimb';
    const step = 6, far = [];
    for (let s = 84; s < 300; s += step) {
      const y = MP.groundRef(s + step / 2), z0 = -s, z1 = -(s + step);
      const sideY = y + 4 + Math.min(8, (s - 84) * 0.04);
      // the climb's middle, and the piles either side rising toward the glass
      for (const [xa, xb, yt] of [[-8, 8, y], [-14, -8, sideY], [8, 14, sideY], [-16.5, -14, sideY + 3], [14, 16.5, sideY + 3]])
        far.push({ x: (xa + xb) / 2, z: (z0 + z1) / 2, w: xb - xa, d: step, y0: -4, y1: yt, look: Math.abs(xa) > 9 ? 'wall' : 'heap', s, xa, xb, z0, z1, yt });
    }
    for (const S of far) {
      {
        const { s, xa, xb, z0, z1, yt } = S;
        const faces = massSolid(M, S, far);
        // sparse big prizes (the far view needs them big and few)
        const sp = 2.3; tone(0.78, 0.25);
        for (let x = xa + sp / 2; x < xb; x += sp) for (let z = z1 + sp / 2; z < z0; z += sp) {
          const k = s > 160 && s < 240 && Math.abs(x) < 9 ? 'capsule' : pick(FAR);
          piled(F, k, x + (rnd() - 0.5) * sp * 0.7, yt + 0.1, z + (rnd() - 0.5) * sp * 0.7, k === 'capsule' ? 1.8 + rnd() * 0.8 : 2.0 + rnd() * 1.2);
        }
        for (const f of faces) { if (f.glass || f.n[1] === 0) continue; for (let a = 1.2; a < f.len; a += 2.4) for (let yy = f.yb + 1.2; yy < f.y1; yy += 2.4) { const [ox, oz] = f.at(a / f.len); if (topAt(ox, oz, S, far) > yy + 0.3) continue; pressed(F, pick(FAR), ox - f.n[0] * 0.3, yy, oz - f.n[1] * 0.3, f.n, 2.0 + rnd() * 0.8, 0.3); } }
      }
    }
    // the Capsule Wall: hundreds of capsules stacked up the steep part, lit from inside here and there
    const capM = K3D.mat('acp-farcap', () => TY.rimify(K3D.toon('#ffffff'), '1.0, 1.0, 1.0', 0.6, 3.0, 'farcap'));
    const caps = [];
    for (let s = 162; s < 238; s += 1.6) for (let x = -7.5; x <= 7.5; x += 1.5) { if (rnd() < 0.4) continue; caps.push([x + (rnd() - 0.5) * 0.6, MP.groundRef(s) + 0.2 + rnd() * 0.6, -s + (rnd() - 0.5) * 0.6]); }
    const cim = new T.InstancedMesh(K3D.geo('acp-capg', () => new T.SphereGeometry(0.62, 12, 9)), capM, caps.length);
    const m4 = new T.Matrix4(), c = new T.Color();
    caps.forEach((p, i) => { m4.makeScale(1, 1.1, 1).setPosition(p[0], p[1] + 0.6, p[2]); cim.setMatrixAt(i, m4); cim.setColorAt(i, c.set(pick(['#ff7ab0', '#5ad8ff', '#ffd23a', '#7aff9a', '#b88aff', '#ff9a5a']))); if (i % 7 === 0 && glows) glows.add(p[0], p[1] + 0.7, p[2], 1.4, pick(A.NEON), 0.5, 0.3); });
    cim.instanceMatrix.needsUpdate = true; cim.instanceColor.needsUpdate = true; g.add(cim);
    // the Prize Chute at the top: a funnel of chrome into the floor of the machine, a striped lip, chasing bulbs round it
    const topY = MP.groundRef(270), cz = -282;
    const chrome = ARCADECLAW_MACHINE.chrome();
    const fun = K3D.mesh(new T.CylinderGeometry(6.5, 3.2, 5, 32, 1, true), chrome, { ink: A.INK, inkW: 1 }); fun.position.set(0, topY - 2.2, cz); g.add(fun);
    const lip = K3D.mesh(new T.TorusGeometry(6.5, 0.45, 10, 40).rotateX(P / 2), K3D.toon('#ffffff', { map: K3D.paint('acp-lip', 256, 16, (cc, w, h) => { for (let x = 0; x < w; x += 16) { cc.fillStyle = (x / 16) % 2 ? '#e8322a' : '#fff4e0'; cc.fillRect(x, 0, 16, h); } }, { repeat: true }) }), { ink: A.INK }); lip.position.set(0, topY + 0.3, cz); g.add(lip);
    const hole = new T.Mesh(new T.CircleGeometry(3.2, 32).rotateX(-P / 2), K3D.flat('#050308')); hole.position.set(0, topY - 4.6, cz); g.add(hole);
    if (bulbs) bulbs.ring([0, topY + 0.85, cz], 6.5, 46, ['#ffe2a0', '#ff5ad6', '#5aff8a', '#4ae8ff'], { size: 0.2, speed: 4, step: 0.5 }, 'y');
    // the WINNER sign over it, on two chrome posts: big bulb letters (dark until the machine pays out)
    const sign = new T.Group(); sign.position.set(0, topY + 12, cz - 9); g.add(sign);
    const board = K3D.mesh(new T.BoxGeometry(17, 4.4, 0.6), K3D.toon('#c8322a', { map: A.grimeTex() }), { ink: A.INK, inkW: 1.2 }); sign.add(board);
    const face = new T.Mesh(new T.PlaneGeometry(16.2, 3.7), K3D.toon('#ffffff', { map: K3D.paint('acp-winner', 512, 128, (cc, w, h) => { cc.fillStyle = '#1a0e14'; cc.fillRect(0, 0, w, h); cc.fillStyle = '#ffd23a'; cc.font = 'bold 104px sans-serif'; cc.textAlign = 'center'; cc.textBaseline = 'middle'; cc.fillText('WINNER', w / 2, h / 2 + 6); }) })); face.position.z = 0.31; sign.add(face);
    if (bulbs) { bulbs.line([-8.3, topY + 14.3, cz - 8.6], [8.3, topY + 14.3, cz - 8.6], 0.7, '#ffe2a0', { size: 0.17, speed: 3, step: 0.4 }); bulbs.line([-8.3, topY + 9.7, cz - 8.6], [8.3, topY + 9.7, cz - 8.6], 0.7, '#ffe2a0', { size: 0.17, speed: 3, step: 0.4 }); }
    for (const sx of [-1, 1]) { const pst = K3D.mesh(new T.CylinderGeometry(0.3, 0.3, 12, 10), chrome, { ink: A.INK }); pst.position.set(sx * 7.5, topY + 6, cz - 9.2); g.add(pst); }
    K.add(g);
    return { g, winner: face, sign };
  }

  /* ---------- everything ---------- */
  function build(K, o = {}) {
    const F = Fields(K), M = Mass(), L = clearList();
    for (const s of MP.solids) {
      if (!dressed(s)) continue;
      const faces = massSolid(M, s);
      dressSolid(F, L, s, faces);
    }
    const far = o.far !== false ? farClimb(K, F, M, o.bulbs, o.glows) : null;
    tone(1, 0);
    const mass = M.mesh(); K.add(mass);
    const fields = F.done();
    const sink = MP.sinks.map(sk => sinkBeans(K, sk));
    return { fields, mass, sink, far, count: F.n, clear: L, isClear: (x, z, y) => isClear(L, x, z, y), topAt };
  }

  return { build, fbm, noise, hash, SOFT, HARD, SMALL, kindFor, lying, sunk, piled, pressed, Fields };
})();
