/* Pip & Bo - 43-1 Coin Drop: the chute itself and everything on it that the rules count. Loaded on demand with the 3D
   kit. Display only: built from ARCADECOIN_ROUTE's lists (so what you see is exactly what counts) and moved each
   frame from the rules' state (G.mst); it never changes the state.

   THE TRACK, swept along the rail (banked with it) from a cross-section for each kind:
     brass   the polished coin chute: a deep U of scratched brass with rolled lips, bolted flanges every few metres
             (rivets round them), lamps along both lips that chase toward the machine, brackets and struts below
     gear    the gear works' trough: darker, oilier brass with teeth cut into its lips, amber lamps
     trace   a glowing copper trace on the circuit board: low raised edges, data pulses running along it, LEDs
     heap    the coin box: a slope of piled coins with heaped coin banks either side
   ON THE TRACK: pickups (spinning coins, pink tickets, star chips; a faint bar of light under each sweep row), wires
   (between two ceramic insulators, crawling with sparks), the edges of gaps (hazard plates), gear teeth (rise from
   slots in the floor, a red glow just before), giant rolling coins (the coin box's teeth), coin-return levers (a long
   pendulum from the dark above), glitch bugs (jittering pixel crawlers), arc gates (two contact posts, a shutter that
   drops into the floor), splits (a glass divider, arcade buttons on the floor, half-gates that lift), springboards
   (two lit halves, coiled springs, a ring of lights that fills while the first coin waits), pillars, squeezes,
   checkpoint arches, the Sweeper's lit strips, gear faces turning under the floor, fans, solder blobs.

   ARCADECOIN_CHUTE.build(K, sc)            -> CH
   ARCADECOIN_CHUTE.update(K, CH, st, dt)
   ARCADECOIN_CHUTE.Geo()                   a geometry builder the scenery files share: g.sweep(s0, s1, step, prof, o),
                                            g.mesh(mat) */
'use strict';

const ARCADECOIN_CHUTE = (function () {
  const T = K3D.T, PR = ARCADECOIN_ROUTE, R = PR.R, L = PR.lists, A = PR.at;
  const INK = '#120d14';
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const vv = a => new T.Vector3(a[0], a[1], a[2]);
  const sm = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  const W = PR.w;
  // a place from chute terms (banked): s along, x right, y up off the floor
  const CW = (s, x, y = 0) => vv(R.bankLocal(s, x, y));
  // a frame's rotation (forward along the chute, up off its floor) as a quaternion
  const m4 = new T.Matrix4();
  const quatAt = (s) => { const f = R.at(s); m4.makeBasis(vv(f.br), vv(f.bu), vv(f.t).negate()); return new T.Quaternion().setFromRotationMatrix(m4); };
  const placeAt = (o, s, x, y = 0) => { o.position.copy(CW(s, x, y)); o.quaternion.copy(quatAt(s)); return o; };

  /* ---------- a geometry builder: strips swept along the rail ---------- */
  function Geo() {
    const pos = [], uv = [], idx = [];
    const g = {
      // sweep a cross-section along the chute from s0 to s1: prof(s, w) -> [[x, y], ...] (left to right over the top,
      // clockwise seen from behind, so the faces point out); each edge is its own strip (sharp across, smooth along)
      sweep(s0, s1, step, prof, o = {}) {
        const n = Math.max(1, Math.ceil((s1 - s0) / step)), rows = [];
        for (let j = 0; j <= n; j++) { const s = s0 + (s1 - s0) * j / n, f = R.at(s), w = W(s); rows.push({ s, f, pts: prof(s, w) }); }
        const ne = rows[0].pts.length - 1, uS = o.u || 0.25, vS = o.v || 0.5, lift = o.lift || 0;
        for (let e = 0; e < ne; e++) {
          if (o.only && !o.only(e)) continue;
          const base = pos.length / 3;
          let vacc = 0; for (let k = 0; k < e; k++) { const a = rows[0].pts[k], b = rows[0].pts[k + 1]; vacc += Math.hypot(b[0] - a[0], b[1] - a[1]); }
          for (let j = 0; j <= n; j++) {
            const r = rows[j], a = r.pts[e], b = r.pts[e + 1], la = Math.hypot(b[0] - a[0], b[1] - a[1]);
            for (const [q, vq] of [[a, vacc], [b, vacc + la]]) {
              const p = R.bankLocal(r.s, q[0], q[1] + lift, r.f); pos.push(p[0], p[1], p[2]);
              uv.push(o.uAcross ? vq * vS : r.s * uS, o.uAcross ? r.s * uS : vq * vS);
            }
          }
          for (let j = 0; j < n; j++) { const a = base + j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        }
        return g;
      },
      // a flat quad strip on the floor from x0 to x1 (decals, lit strips)
      strip(s0, s1, x0, x1, y = 0.02, step = 0.5) { return g.sweep(s0, s1, step, () => [[x0, y], [x1, y]], { uAcross: true, u: 1 / Math.max(0.1, s1 - s0), v: 1 / Math.max(0.1, x1 - x0) }); },
      count: () => pos.length / 3,
      geo() { const b = new T.BufferGeometry(); b.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); b.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); b.setIndex(idx); b.computeVertexNormals(); return b; },
      mesh(mat, o = {}) { const m = new T.Mesh(g.geo(), mat); m.castShadow = o.cast === true; m.receiveShadow = o.receive !== false; return m; },
    };
    return g;
  }

  /* ---------- the track's pieces between gaps ---------- */
  const holes = () => [...L.gaps.map(gp => [gp.s0, gp.s1]), ...PR.air].sort((a, b) => a[0] - b[0]);
  // the runs of solid track of one kind: [[a, b], ...]
  function runs(kind) {
    const out = [], H = holes();
    for (let i = 0; i < PR.kinds.length; i++) {
      const [a, k] = PR.kinds[i], b = i + 1 < PR.kinds.length ? PR.kinds[i + 1][0] : R.len;
      if (k !== kind) continue;
      let cur = a;
      for (const [h0, h1] of H) { if (h1 <= cur || h0 >= b) continue; if (h0 > cur) out.push([cur, Math.min(h0, b)]); cur = Math.max(cur, h1); }
      if (cur < b) out.push([cur, b]);
    }
    return out.filter(([a, b]) => b - a > 0.3);
  }

  /* ---------- textures ---------- */
  const floorTex = () => K3D.paint('ac-chutefloor', 256, 512, (c, w, h) => {
    // polished brass worn smooth by coins: long streaks down the middle, dull grime toward the walls
    c.fillStyle = '#b8823a'; c.fillRect(0, 0, w, h);
    const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(40,18,0,0.6)'); g.addColorStop(0.2, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(255,230,170,0.16)'); g.addColorStop(0.8, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(40,18,0,0.6)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { c.fillStyle = Math.random() < 0.6 ? `rgba(255,236,190,${0.05 + Math.random() * 0.16})` : `rgba(70,40,10,${0.08 + Math.random() * 0.16})`; c.fillRect(Math.random() * w, Math.random() * h, 0.6 + Math.random() * 1.2, 10 + Math.random() * 80); }
    // the plates' seams (two plates per tile) with a row of countersunk screws, and fine cross-scratches
    for (const y of [0, h / 2]) { c.fillStyle = 'rgba(30,14,0,0.55)'; c.fillRect(0, y, w, 3); c.fillStyle = 'rgba(255,230,170,0.25)'; c.fillRect(0, y + 3, w, 1); for (let x = 14; x < w; x += 38) { c.fillStyle = 'rgba(40,20,0,0.5)'; c.beginPath(); c.arc(x, y + 10, 3.5, 0, 7); c.fill(); c.fillStyle = 'rgba(255,230,170,0.35)'; c.fillRect(x - 3, y + 9, 6, 1); } }
    for (let i = 0; i < 60; i++) { c.strokeStyle = `rgba(255,240,200,${0.05 + Math.random() * 0.1})`; c.lineWidth = 0.7; const x = Math.random() * w, y = Math.random() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 14); c.stroke(); }
    // rub rings where coins spun out, and oil smears
    for (let i = 0; i < 6; i++) { c.strokeStyle = 'rgba(90,50,10,0.22)'; c.lineWidth = 2; c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 14 + Math.random() * 10, 14 + Math.random() * 10, 0, 0, 7); c.stroke(); }
    for (let i = 0; i < 4; i++) { const gg = c.createRadialGradient(0, 0, 0, 0, 0, 30); gg.addColorStop(0, 'rgba(30,20,30,0.3)'); gg.addColorStop(1, 'rgba(30,20,30,0)'); c.save(); c.translate(Math.random() * w, Math.random() * h); c.scale(0.6, 1.8); c.fillStyle = gg; c.fillRect(-30, -30, 60, 60); c.restore(); }
    // two worn coin tracks
    for (const x of [w * 0.3, w * 0.7]) { c.fillStyle = 'rgba(255,240,210,0.1)'; c.fillRect(x - 18, 0, 36, h); }
    // a few dents and an old ink stamp
    for (let i = 0; i < 5; i++) { c.fillStyle = 'rgba(40,20,0,0.12)'; c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 6, 3, 0, 0, Math.PI * 2); c.fill(); }
    c.save(); c.translate(w * 0.5, h * 0.4); c.rotate(-0.2); c.strokeStyle = 'rgba(120,40,40,0.18)'; c.lineWidth = 3; c.strokeRect(-40, -14, 80, 28); c.fillStyle = 'rgba(120,40,40,0.2)'; c.font = 'bold 16px monospace'; c.textAlign = 'center'; c.fillText('LANE 2', 0, 6); c.restore();
  }, { repeat: true });
  const traceTex = () => K3D.paint('ac-trace', 128, 256, (c, w, h) => {
    c.fillStyle = '#c87a3a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '255,220,170' : '80,30,0'},${Math.random() * 0.12})`; c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 4 + Math.random() * 20); }
    c.fillStyle = 'rgba(255,230,180,0.18)'; c.fillRect(w * 0.45, 0, w * 0.1, h);
    for (let y = 0; y < h; y += 64) { c.fillStyle = '#e8b070'; c.beginPath(); c.arc(w * 0.15, y + 20, 6, 0, Math.PI * 2); c.arc(w * 0.85, y + 52, 6, 0, Math.PI * 2); c.fill(); c.fillStyle = '#2a1a10'; c.beginPath(); c.arc(w * 0.15, y + 20, 2.5, 0, Math.PI * 2); c.arc(w * 0.85, y + 52, 2.5, 0, Math.PI * 2); c.fill(); }
  }, { repeat: true });
  const pulseTex = () => K3D.paint('ac-pulse', 32, 256, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); for (const [y, l] of [[20, 30], [90, 12], [130, 50], [210, 16]]) { const g = c.createLinearGradient(0, y, 0, y + l); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.8, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, y, w, l); } }, { repeat: true });
  const heapTex = () => K3D.paint('ac-heap', 512, 512, (c, w, h) => {
    c.fillStyle = '#8a6a2a'; c.fillRect(0, 0, w, h);
    let s = 91; const rr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 520; i++) {
      const x = rr() * w, y = rr() * h, r = 12 + rr() * 16, a = rr() * Math.PI, sq = 0.35 + rr() * 0.65;
      const col = rr() < 0.75 ? ['#e8c060', '#d8a848', '#f0d080', '#c89838'][Math.floor(rr() * 4)] : ['#c8ccd8', '#b87a48', '#d8d0c0'][Math.floor(rr() * 3)];
      for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
        c.save(); c.translate(x + ox, y + oy); c.rotate(a); c.scale(1, sq);
        c.fillStyle = 'rgba(30,20,0,0.45)'; c.beginPath(); c.arc(1.5, 2.5, r, 0, Math.PI * 2); c.fill();
        c.fillStyle = col; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(255,250,220,0.5)'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, r * 0.78, 0, Math.PI * 2); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(-r * 0.3, -r * 0.3, r * 0.25, 0, Math.PI * 2); c.fill();
        c.restore();
      }
    }
  }, { repeat: true });
  const chevTex = () => K3D.paint('ac-chev', 128, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 14; for (let y = 30; y < h; y += 70) { c.beginPath(); c.moveTo(14, y + 34); c.lineTo(w / 2, y); c.lineTo(w - 14, y + 34); c.stroke(); } });
  const hazardTex = () => K3D.paint('ac-hazard', 256, 64, (c, w, h) => { c.fillStyle = '#ffd23a'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1418'; for (let x = -h; x < w; x += 32) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 16, h); c.lineTo(x + 16 + h, 0); c.lineTo(x + h, 0); c.closePath(); c.fill(); } c.fillStyle = 'rgba(0,0,0,0.2)'; for (let i = 0; i < 80; i++) c.fillRect(Math.random() * w, Math.random() * h, 3, 2); }, { repeat: true });

  /* ---------- cross-sections ---------- */
  // brass: walls up to the rolled lip (the lip itself is a tube), a floor that flattens to the walls, an outer skin
  const brassProf = (s, w) => [[-(w + 0.6), -0.7], [-(w + 0.62), 0.95], [-(w + 0.42), 1.12], [-(w + 0.16), 0.62], [-w, 0.14], [-w + 0.3, 0], [w - 0.3, 0], [w, 0.14], [w + 0.16, 0.62], [w + 0.42, 1.12], [w + 0.62, 0.95], [w + 0.6, -0.7], [-(w + 0.6), -0.7]];
  const BRASS_FLOOR = 5;
  const gearProf = (s, w) => [[-(w + 0.7), -0.9], [-(w + 0.72), 1.0], [-(w + 0.46), 1.2], [-(w + 0.18), 0.7], [-w, 0.16], [-w + 0.3, 0], [w - 0.3, 0], [w, 0.16], [w + 0.18, 0.7], [w + 0.46, 1.2], [w + 0.72, 1.0], [w + 0.7, -0.9], [-(w + 0.7), -0.9]];
  const traceProf = (s, w) => [[-(w + 0.5), -0.5], [-(w + 0.5), 0.28], [-(w + 0.15), 0.32], [-w, 0.05], [-w + 0.1, 0], [w - 0.1, 0], [w, 0.05], [w + 0.15, 0.32], [w + 0.5, 0.28], [w + 0.5, -0.5], [-(w + 0.5), -0.5]];
  const TRACE_FLOOR = 4;
  const heapProf = (s, w) => { const b = (k) => 0.25 * Math.sin(s * 0.7 + k) + 0.15 * Math.sin(s * 1.9 + k * 3); return [[-(w + 4.5), 0.6 + b(1)], [-(w + 3), 1.5 + b(2)], [-(w + 1.6), 1.2 + b(3)], [-(w + 0.5), 0.45 + b(4) * 0.4], [-w + 0.2, 0], [w - 0.2, 0], [w + 0.5, 0.45 + b(5) * 0.4], [w + 1.6, 1.2 + b(6)], [w + 3, 1.5 + b(7)], [w + 4.5, 0.6 + b(8)]]; };

  /* ---------- build ---------- */
  function build(K, sc) {
    const CH = { K, t: 0 };
    const root = new T.Group(); K.add(root); CH.root = root;
    const B = sc.B; // the lamps (one instanced family for the whole level)
    const Gl = sc.G; // the soft glows

    // --- the brass chute (stretch 1)
    {
      const wallM = K3D.toon('#ffffff', { map: (() => { const t = ARCADE.brassTex('#c89a48').clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; return t; })(), emissive: '#ffb050', emissiveIntensity: 0.05 });
      const floorM = K3D.toon('#ffffff', { map: floorTex(), emissive: '#ffd090', emissiveIntensity: 0.04 });
      const lipM = K3D.toon('#f0c870', { emissive: '#ffd890', emissiveIntensity: 0.18 });
      const walls = Geo(), floor = Geo(), flanges = Geo();
      const rivets = [];
      for (const [a, b] of runs('brass')) {
        walls.sweep(a, b, 0.5, brassProf, { only: e => e !== BRASS_FLOOR, u: 0.18, v: 0.5 });
        floor.sweep(a, b, 0.5, brassProf, { only: e => e === BRASS_FLOOR, uAcross: true, u: 1 / 12, v: 1 / 10.4 });
        // the rolled lips: a fat brass tube along each wall's top, a bright line of polish on top of it
        for (const sx of [-1, 1]) {
          const pts = []; for (let s = a; s <= b + 0.01; s += 1.5) pts.push(CW(Math.min(s, b), sx * (W(s) + 0.42), 1.14));
          if (pts.length < 2) continue;
          const cv = new T.CatmullRomCurve3(pts);
          root.add(K3D.mesh(new T.TubeGeometry(cv, pts.length * 3, 0.13, 8, false), lipM, { ink: INK, inkW: 0.7 }));
          const pts2 = pts.map((p, i) => { const s = Math.min(a + i * 1.5, b); return CW(s, sx * (W(s) + 0.42), 1.28); });
          const hl = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts2), pts2.length * 3, 0.022, 4, false), K3D.flat(hot('#fff0c8', 0.9)));
          root.add(hl);
        }
        // bolted flanges every 6 m (a band a little proud of the skin, rivets round it), lamps between them
        for (let s = a + 3; s < b - 0.5; s += 6) {
          const off = (s2, w) => brassProf(s2, w).map(([x, y]) => [x * 1.0 + Math.sign(x) * 0.06, y < 0 ? y - 0.06 : y + (Math.abs(x) > w + 0.3 ? 0.04 : 0)]);
          flanges.sweep(s, s + 0.32, 0.16, off, { only: e => e === 0 || e === 1 || e === 9 || e === 10 || e === 11, u: 0.5, v: 0.5 });
          const w = W(s), f = R.at(s);
          for (const sx of [-1, 1]) for (const y of [-0.4, 0.1, 0.6]) { const p = R.bankLocal(s + 0.16, sx * (w + 0.7), y, f), n = vv(f.br).multiplyScalar(sx); rivets.push([p[0], p[1], p[2], [n.x, n.y, n.z]]); }
          for (const x of [-w * 0.6, 0, w * 0.6]) { const p = R.bankLocal(s + 0.16, x, -0.78, f), n = vv(f.bu).negate(); rivets.push([p[0], p[1], p[2], [n.x, n.y, n.z]]); }
        }
        // the lamps along both lips: warm bulbs chasing down toward the machine, a coloured one every fifth
        for (let s = a + 0.8; s < b; s += 2) {
          const w = W(s), f = R.at(s), k = Math.round(s / 2);
          for (const sx of [-1, 1]) { const p = R.bankLocal(s, sx * (w + 0.42), 1.33, f); B.add(p[0], p[1], p[2], k % 5 ? '#ffe6b0' : ARCADE.NEON[(k / 5 | 0) % 8], { size: 0.075, speed: 4, phase: -s * 0.45 }); }
        }
        // brackets under the chute every 12 m: a saddle, a strut down into the dark, a brace
        for (let s = a + 6; s < b - 2; s += 12) {
          const g = new T.Group(); placeAt(g, s, 0, -0.75);
          const w = W(s);
          const sad = K3D.mesh(new T.BoxGeometry(w * 2 + 1.0, 0.18, 0.5), K3D.mat('ac-strutM', () => K3D.toon('#7a6040', { map: ARCADE.brassTex('#8a6a3a', { dark: true }) })), { ink: INK, inkW: 0.6 }); g.add(sad);
          const strut = K3D.mesh(K3D.geo('ac-strut', () => new T.CylinderGeometry(0.16, 0.2, 14, 8).translate(0, -7, 0)), K3D.mat('ac-strutM', () => K3D.toon('#7a6040')), { ink: INK, inkW: 0.6 });
          g.add(strut);
          for (const sx of [-1, 1]) { const br = K3D.mesh(K3D.geo('ac-brace', () => new T.CylinderGeometry(0.07, 0.07, 3.4, 6).translate(0, -1.7, 0)), K3D.mat('ac-strutM', () => K3D.toon('#7a6040')), { ink: INK, inkW: 0.5 }); br.position.set(sx * w * 0.8, 0, 0); br.rotation.z = -sx * 0.62; g.add(br); }
          root.add(g);
        }
      }
      root.add(walls.mesh(wallM)); root.add(floor.mesh(floorM)); root.add(flanges.mesh(K3D.toon('#a07a3a', { map: ARCADE.brassTex('#a07a3a') })));
      ARCADE.rivets(K, rivets, { r: 0.07 });
      // the end of the chute at the brink: a flared, bent lip and a ring of lamps (the coins fly off it)
      const bf = R.at(A.brink - 0.3);
      for (let x = -W(A.brink); x <= W(A.brink) + 0.01; x += 0.7) { const p = R.bankLocal(A.brink - 0.25, x, 0.08, bf); B.add(p[0], p[1], p[2], '#ffd27a', { size: 0.08, speed: 6, phase: Math.abs(x) }); }
    }

    // --- the gear works' trough (stretch 2): darker brass, teeth in the lips, amber lamps
    {
      const wallM = K3D.toon('#ffffff', { map: ARCADE.brassTex('#9a7034', { dark: true }), emissive: '#ff9040', emissiveIntensity: 0.04 });
      const floorM = K3D.toon('#ffffff', { map: floorTex(), emissive: '#ffb070', emissiveIntensity: 0.06 });
      floorM.color = new T.Color('#c09060');
      const walls = Geo(), floor = Geo(), teeth = [];
      for (const [a, b] of runs('gear')) {
        walls.sweep(a, b, 0.5, gearProf, { only: e => e !== BRASS_FLOOR, u: 0.18, v: 0.5 });
        floor.sweep(a, b, 0.5, gearProf, { only: e => e === BRASS_FLOOR, uAcross: true, u: 1 / 12, v: 1 / 10.4 });
        for (let s = a + 0.5; s < b; s += 1.1) for (const sx of [-1, 1]) teeth.push([s, sx]);
        for (let s = a + 1; s < b; s += 2.4) { const w = W(s), f = R.at(s); for (const sx of [-1, 1]) { const p = R.bankLocal(s, sx * (w + 0.46), 1.42, f); B.add(p[0], p[1], p[2], '#ffb050', { size: 0.07, speed: 3, phase: -s * 0.3 }); } }
      }
      root.add(walls.mesh(wallM)); root.add(floor.mesh(floorM));
      const im = new T.InstancedMesh(K3D.geo('ac-lipTooth', () => new T.BoxGeometry(0.34, 0.26, 0.5)), K3D.toon('#b08440', { map: ARCADE.brassTex('#b08440') }), teeth.length);
      const q = new T.Quaternion(), sc3 = new T.Vector3(1, 1, 1);
      teeth.forEach(([s, sx], i) => { m4.compose(CW(s, sx * (W(s) + 0.46), 1.3), quatAt(s), sc3); im.setMatrixAt(i, m4); });
      root.add(im);
    }

    // --- the circuit board's trace (stretch 3): copper floor with data pulses running down it, LEDs on its edges
    {
      const edgeM = K3D.toon('#d08848', { map: traceTex(), emissive: '#ff9a40', emissiveIntensity: 0.12 });
      const floorM = K3D.toon('#ffffff', { map: traceTex(), emissive: '#ffb060', emissiveIntensity: 0.14 });
      const edge = Geo(), floor = Geo(), pulse = Geo();
      for (const [a, b] of runs('trace')) {
        edge.sweep(a, b, 0.5, traceProf, { only: e => e !== TRACE_FLOOR, u: 0.2, v: 0.5 });
        floor.sweep(a, b, 0.5, traceProf, { only: e => e === TRACE_FLOOR, uAcross: true, u: 1 / 16, v: 1 / 11 });
        for (const x of [-0.62, -0.2, 0.2, 0.62]) pulse.sweep(a, b, 0.5, (s, w) => [[x * w - 0.12, 0.03], [x * w + 0.12, 0.03]], { uAcross: true, u: 1 / 22, v: 4 });
        for (let s = a + 0.5; s < b; s += 1.6) { const w = W(s), f = R.at(s), k = Math.round(s / 1.6); for (const sx of [-1, 1]) { const p = R.bankLocal(s, sx * (w + 0.32), 0.36, f); B.add(p[0], p[1], p[2], k % 3 ? '#7aff9a' : '#7ae8ff', { size: 0.05, speed: 7, phase: -s * 0.8 }); } }
        // the copper legs that hold the trace up over the board, every 9 m
        for (let s = a + 4; s < b - 1; s += 9) for (const sx of [-1, 1]) { const g = new T.Group(); placeAt(g, s, sx * (W(s) * 0.7), -0.5); const leg = K3D.mesh(K3D.geo('ac-traceLeg', () => new T.CylinderGeometry(0.22, 0.32, 40, 8).translate(0, -20, 0)), K3D.mat('ac-traceLegM', () => K3D.toon('#a86a38', { map: ARCADE.copperTex() })), { ink: INK, inkW: 0.5 }); g.add(leg); root.add(g); }
      }
      root.add(edge.mesh(edgeM)); root.add(floor.mesh(floorM));
      const pt = pulseTex(); pt.repeat.set(1, 1);
      const pm = K3D.flat(hot('#9affc8', 1.5), { map: pt, transparent: true, depthWrite: false, add: true });
      const pmesh = pulse.mesh(pm); pmesh.renderOrder = 2; pmesh.userData.live = true; root.add(pmesh);
      CH.pulse = pt;
    }

    // --- the coin heap (stretch 4): a slope of coins, heaped banks, a scatter of loose coins on the banks
    {
      const heapM = K3D.toon('#ffffff', { map: heapTex(), emissive: '#ffd070', emissiveIntensity: 0.1 });
      const g = Geo();
      for (const [a, b] of runs('heap')) g.sweep(a, b, 0.5, heapProf, { uAcross: true, u: 1 / 9, v: 1 / 9 });
      root.add(g.mesh(heapM));
      const loose = [];
      for (const [a, b] of runs('heap')) for (let s = a; s < b; s += 0.9) for (const sx of [-1, 1]) for (let n = 0; n < 2; n++) loose.push([s + Math.random() * 0.9, sx * (W(s) + 0.6 + Math.random() * 3.8), Math.random()]);
      const im = new T.InstancedMesh(K3D.geo('ac-looseCoin', () => new T.CylinderGeometry(0.42, 0.42, 0.08, 18)), K3D.toon('#e8c060', { emissive: '#ffd070', emissiveIntensity: 0.15 }), loose.length);
      const e = new T.Euler(), q = new T.Quaternion(), s3 = new T.Vector3(1, 1, 1);
      loose.forEach(([s, x, r], i) => { const w = W(s), ax = Math.abs(x) - w, y = ax < 0.5 ? 0.45 * ax : ax < 1.6 ? 0.45 + (ax - 0.5) * 0.7 : ax < 3 ? 1.2 + (ax - 1.6) * 0.2 : 1.5 - (ax - 3) * 0.6; const qq = quatAt(s); e.set((r - 0.5) * 1.4, r * 6, (r - 0.3) * 1.2); q.setFromEuler(e); qq.multiply(q); s3.setScalar(0.7 + r * 0.8); m4.compose(CW(s, x, y + 0.04), qq, s3); im.setMatrixAt(i, m4); });
      root.add(im);
    }

    // --- the START button (the end of the ride): a huge round arcade button in a chrome bezel, lit from inside
    {
      const g = new T.Group(); placeAt(g, A.start + 6, 0, -0.4); g.userData.live = true;
      const bez = K3D.mesh(new T.CylinderGeometry(8.4, 8.8, 1.2, 64), K3D.toon('#c8ccd8', { emissive: '#8a90a0', emissiveIntensity: 0.2 }), { ink: INK, inkW: 1 }); g.add(bez);
      const capM = K3D.toon('#3aff7a', { emissive: '#3aff7a', emissiveIntensity: 0.45 });
      const cap = K3D.mesh(new T.SphereGeometry(7.6, 64, 16, 0, Math.PI * 2, 0, Math.PI * 0.18), capM, { ink: INK, inkW: 1 });
      cap.scale.set(1, 0.9, 1); cap.position.y = -6.6; g.add(cap);
      const word = new T.Mesh(new T.PlaneGeometry(9, 3), K3D.flat(hot('#ffffff', 1.4), { map: K3D.paint('ac-startword', 512, 170, (c, w, h) => { c.clearRect(0, 0, w, h); c.font = 'bold 130px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#0a3a1a'; c.fillText('START', w / 2 + 6, h / 2 + 8); c.fillStyle = '#ffffff'; c.fillText('START', w / 2, h / 2); }), transparent: true, depthWrite: false }));
      word.rotation.x = -Math.PI / 2; word.position.y = 0.95; g.add(word);
      B.ring([0, 0, 0], 8.6, 64, ['#ffffff', '#ffe24a'], { size: 0.14, speed: 5, step: 0.4 });
      CH.start = { g, cap, capM };
      root.add(g);
    }

    /* ---------- the things on the track ---------- */
    pickups(K, CH, root);
    hazards(K, CH, root, B, Gl);
    K3D.bake(root);
    return CH;
  }

  /* ---------- pickups: one instanced family per kind ---------- */
  function pickups(K, CH, root) {
    const coinTex = K3D.paint('ac-smallcoin', 128, 128, (c, w, h) => { const g = c.createRadialGradient(44, 40, 4, 64, 64, 64); g.addColorStop(0, '#fff8d8'); g.addColorStop(0.5, '#f0c858'); g.addColorStop(1, '#a87818'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(120,80,10,0.7)'; c.lineWidth = 6; c.beginPath(); c.arc(64, 64, 50, 0, Math.PI * 2); c.stroke(); c.fillStyle = 'rgba(120,80,10,0.7)'; c.font = 'bold 50px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('1', 64, 68); });
    const ticketTex = K3D.paint('ac-ticketP', 256, 128, (c, w, h) => { c.fillStyle = '#ff8ac0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c83a80'; c.lineWidth = 4; c.setLineDash([8, 6]); c.strokeRect(10, 10, w - 20, h - 20); c.setLineDash([]); c.fillStyle = '#7a1a4a'; c.font = 'bold 44px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TICKET', w / 2, h / 2 - 8); c.font = 'bold 22px monospace'; c.fillText('★ 3 ★', w / 2, h / 2 + 30); for (let y = 8; y < h; y += 16) { c.fillStyle = '#fff0f8'; c.beginPath(); c.arc(0, y, 5, 0, Math.PI * 2); c.arc(w, y, 5, 0, Math.PI * 2); c.fill(); } });
    const starShape = (() => { const s = new T.Shape(); for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.22 : 0.5; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) s.lineTo(x, y); else s.moveTo(x, y); } return s; })();
    const kinds = {
      coin: { geo: new T.CylinderGeometry(0.34, 0.34, 0.09, 24).rotateX(Math.PI / 2), mat: [K3D.toon('#e8b040', { emissive: '#ffc860', emissiveIntensity: 0.35 }), K3D.toon('#ffffff', { map: coinTex, emissive: '#ffd070', emissiveIntensity: 0.35 }), K3D.toon('#ffffff', { map: coinTex, emissive: '#ffd070', emissiveIntensity: 0.35 })], y: 0.6 },
      ticket: { geo: new T.BoxGeometry(0.9, 0.45, 0.03), mat: K3D.toon('#ffffff', { map: ticketTex, emissive: '#ff8ac0', emissiveIntensity: 0.3 }), y: 0.7 },
      star: { geo: new T.ExtrudeGeometry(starShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1 }).translate(0, 0, -0.05), mat: K3D.toon('#7affea', { emissive: '#5affe0', emissiveIntensity: 0.7 }), y: 0.8 },
    };
    CH.pk = {};
    for (const [kind, d] of Object.entries(kinds)) {
      const list = L.pickups.filter(p => p.kind === kind);
      const im = new T.InstancedMesh(d.geo, d.mat, list.length); im.userData.live = true; im.frustumCulled = false; im.castShadow = false;
      K3D.ink(im, INK, 0.6);
      root.add(im);
      const items = list.map(p => ({ p, base: CW(p.s, p.x, d.y), q: quatAt(p.s), ph: p.s * 0.7 + p.x }));
      CH.pk[kind] = { im, items, y: d.y };
    }
    // the glow round each pickup (so they sparkle in the dark) and a faint bar of light under every sweep row
    const G = CH.K.arcSc.G;
    CH.pkShown = L.pickups.map(() => true);
    CH.pkGlow = L.pickups.map(p => G.add(...CW(p.s, p.x, p.kind === 'coin' ? 0.6 : 0.75).toArray(), p.kind === 'coin' ? 0.6 : 1.0, p.kind === 'star' ? '#7affea' : p.kind === 'ticket' ? '#ff8ac0' : '#ffd060', p.kind === 'coin' ? 0.16 : 0.3, 0.2));
    const bars = Geo();
    for (const r of L.rows) bars.strip(r.s - 0.1, r.s + 0.1, r.x0 - 0.5, r.x1 + 0.5, 0.025, 0.2);
    const bm = bars.mesh(K3D.flat(hot('#ffe08a', 0.6), { map: K3D.paint('ac-rowbar', 128, 32, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#fff'; for (let x = 2; x < w; x += 10) c.fillRect(x, 0, 6, h); }, { repeat: true }), transparent: true, depthWrite: false, add: true })); bm.renderOrder = 2; root.add(bm);
  }

  /* ---------- hazards and two-coin pieces ---------- */
  function hazards(K, CH, root, B, Gl) {
    const brass = K3D.mat('ac-hzBrass', () => K3D.toon('#d0a050', { map: ARCADE.brassTex('#d0a050') }));
    const dark = K3D.mat('ac-hzDark', () => K3D.toon('#2a2630'));
    const ceramic = K3D.mat('ac-ceramic', () => K3D.toon('#efe8dc', { emissive: '#ffffff', emissiveIntensity: 0.05 }));
    const haz = K3D.toon('#ffffff', { map: hazardTex() });
    const live = o => { o.userData.live = true; root.add(o); return o; };

    // wires: two ceramic insulators on the lips and a bare copper wire sagging low across, crawling with sparks
    CH.wires = L.wires.map(wr => {
      const w = W(wr.s), g = new T.Group();
      for (const sx of [-1, 1]) {
        const post = new T.Group(); post.position.copy(CW(wr.s, sx * (w + 0.42), 1.1)); post.quaternion.copy(quatAt(wr.s));
        for (let i = 0; i < 4; i++) { const d = K3D.mesh(K3D.geo('ac-insul', () => new T.CylinderGeometry(0.22, 0.22, 0.09, 16)), ceramic, { ink: INK, inkW: 0.5 }); d.position.y = 0.1 + i * 0.14; post.add(d); const nk = new T.Mesh(K3D.geo('ac-insulN', () => new T.CylinderGeometry(0.12, 0.12, 0.06, 10)), ceramic); nk.position.y = 0.17 + i * 0.14; post.add(nk); }
        const cap = K3D.mesh(K3D.geo('ac-insulC', () => new T.SphereGeometry(0.13, 10, 8)), brass, { ink: INK, inkW: 0.5 }); cap.position.y = 0.7; post.add(cap);
        const sign = ARCADE.decal(K, 'warn', 0.6, 0.6, { text: 'ZAP!', seed: 3 }); sign.position.set(0, 0.45, 0.24); post.add(sign);
        root.add(post);
      }
      const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16, x = -(w + 0.42) + u * 2 * (w + 0.42); pts.push(CW(wr.s, x, 1.8 - (1.8 - 0.32) * Math.sin(u * Math.PI) ** 0.35)); }
      const cv = new T.CatmullRomCurve3(pts);
      const wire = new T.Mesh(new T.TubeGeometry(cv, 48, 0.05, 6, false), K3D.toon('#e8904a', { emissive: '#ffb070', emissiveIntensity: 0.4 })); root.add(wire);
      const glow = new T.Mesh(new T.TubeGeometry(cv, 48, 0.14, 6, false), K3D.flat(hot('#9adfff', 0.5), { transparent: true, depthWrite: false, add: true })); live(glow);
      const gi = []; for (let i = 0; i < 8; i++) gi.push(Gl.add(0, -9999, 0, 0.5, i % 2 ? '#bfefff' : '#ffffff', 1.4, 0));
      return { wr, cv, glow, gi };
    });

    // the edges of every gap: a hazard plate with lamps on the lip, and a dark void with a dim glow far below
    for (const gp of L.gaps) {
      const isSpring = L.springs.some(sp => Math.abs(sp.sh - gp.s0) < 0.5);
      for (const [s, dir] of [[gp.s0, -1], [gp.s1, 1]]) {
        const w = W(s), p2 = Geo();
        if (dir < 0) p2.strip(s - 0.9, s, -w, w, 0.025, 0.3); else p2.strip(s, s + 0.9, -w, w, 0.025, 0.3);
        root.add(p2.mesh(haz));
        for (let x = -w; x <= w + 0.01; x += 0.8) { const p = CW(s, x, 0.12); B.add(p.x, p.y, p.z, isSpring ? '#ffe24a' : '#ff5a4a', { size: 0.07, blink: true, phase: x }); }
      }
    }

    // gear teeth: big brass teeth that rise out of slots in the floor; a red glow in the slot just before
    CH.teeth = L.teeth.map((tt, i) => {
      const g = new T.Group(); placeAt(g, tt.s, 0, 0); g.userData.live = true;
      const w = W(tt.s), x0 = Math.max(tt.x0, -w - 0.3), x1 = Math.min(tt.x1, w + 0.3);
      const slot = new T.Mesh(new T.PlaneGeometry(x1 - x0, tt.len + 0.2).rotateX(-Math.PI / 2), K3D.flat('#0a0608')); slot.position.set((x0 + x1) / 2, 0.015, 0); g.add(slot);
      const warn = new T.Mesh(new T.PlaneGeometry(x1 - x0, tt.len + 0.2).rotateX(-Math.PI / 2), K3D.flat(hot('#ff3a2a', 1.4), { transparent: true, depthWrite: false, add: true })); warn.position.set((x0 + x1) / 2, 0.03, 0); g.add(warn);
      const body = new T.Group(); g.add(body);
      if (tt.roll) {
        // the coin box: a giant coin rolling across the slope on its edge
        // the coin box: giant coins on their edges, rolling down the heap, rising out of the pile while closed
        const n = Math.max(1, Math.round((x1 - x0) / 1.7)), bigs = [];
        const bm = [K3D.mat('ac-bigEdge', () => K3D.toon('#d8a848', { map: ARCADE.brassTex('#d8a848') })), K3D.mat('ac-bigFace', () => K3D.toon('#f0c860', { emissive: '#ffd070', emissiveIntensity: 0.2 }))];
        for (let k = 0; k < n; k++) {
          const big = K3D.mesh(K3D.geo('ac-bigCoin', () => new T.CylinderGeometry(1.5, 1.5, 0.45, 40).rotateZ(Math.PI / 2)), [bm[0], bm[1], bm[1]], { ink: INK, inkW: 0.9 });
          big.position.x = x0 + (k + 0.5) * (x1 - x0) / n; big.userData.ph = k * 1.3; body.add(big); bigs.push(big);
        }
        body.userData.bigs = bigs;
      } else {
        const n = Math.max(1, Math.round((x1 - x0) / 1.1));
        for (let k = 0; k < n; k++) {
          const tooth = K3D.mesh(K3D.geo('ac-tooth', () => { const s = new T.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0.32, 1.6); s.lineTo(-0.32, 1.6); s.closePath(); return new T.ExtrudeGeometry(s, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 1 }).translate(0, 0, -0.8); }), brass, { ink: INK, inkW: 0.8 });
          tooth.scale.set((x1 - x0) / n / 1.05, 1, tt.len / 1.6); tooth.position.x = x0 + (k + 0.5) * (x1 - x0) / n; body.add(tooth);
        }
      }
      root.add(g);
      return { tt, g, body, warn, x0, x1, h: 0 };
    });

    // coin-return levers: a long pendulum from the dark above; its low bar sweeps across the chute
    CH.levers = L.levers.map(lv => {
      const piv = new T.Group(); placeAt(piv, lv.s, lv.cx, 14.4); piv.userData.live = true;
      const arm = new T.Group(); piv.add(arm);
      const rod = K3D.mesh(K3D.geo('ac-leverRod', () => new T.CylinderGeometry(0.12, 0.12, 14, 8).translate(0, -7, 0)), brass, { ink: INK, inkW: 0.6 }); arm.add(rod);
      const bar = K3D.mesh(new T.BoxGeometry(lv.hw * 2, 0.36, 0.5), K3D.toon('#d84a3a', { emissive: '#ff5a3a', emissiveIntensity: 0.15 }), { ink: INK, inkW: 0.8 }); bar.position.y = -14 + 0.04; arm.add(bar);
      const stripe = new T.Mesh(new T.PlaneGeometry(lv.hw * 2 - 0.1, 0.2), K3D.toon('#ffffff', { map: hazardTex() })); stripe.position.set(0, -14 + 0.04, 0.26); arm.add(stripe);
      const label = ARCADE.decal(K, 'tag', 0.9, 0.3, { text: 'RETURN', seed: 7 }); label.position.set(0, -12.6, 0.14); arm.add(label);
      const hub = K3D.mesh(new T.CylinderGeometry(0.5, 0.5, 0.5, 16).rotateX(Math.PI / 2), brass, { ink: INK, inkW: 0.7 }); piv.add(hub);
      root.add(piv);
      return { lv, piv, arm };
    });

    // glitch bugs: little pixel crawlers that jitter and tear; gone in a burst when zapped
    CH.bugs = L.bugs.map((b, i) => {
      const g = new T.Group(); placeAt(g, b.s, b.x, 0); g.userData.live = true;
      const mats = [K3D.flat(hot('#ff3ad6', 1.2)), K3D.flat(hot('#3affb8', 1.2)), K3D.flat('#1a0a20')];
      const px = [[0, 0.35, 0, 0.7, 0.4, 0.6, 0], [-0.18, 0.62, 0.12, 0.16, 0.16, 0.06, 2], [0.18, 0.62, 0.12, 0.16, 0.16, 0.06, 2], [-0.4, 0.15, 0.2, 0.12, 0.12, 0.12, 0], [0.4, 0.15, 0.2, 0.12, 0.12, 0.12, 0], [-0.4, 0.15, -0.2, 0.12, 0.12, 0.12, 0], [0.4, 0.15, -0.2, 0.12, 0.12, 0.12, 0], [0, 0.72, -0.1, 0.5, 0.1, 0.3, 1]];
      const body = new T.Group(); g.add(body);
      for (const [x, y, z, sx, sy, sz, m] of px) { const c = new T.Mesh(K3D.geo('ac-px', () => new T.BoxGeometry(1, 1, 1)), mats[m]); c.position.set(x, y, z); c.scale.set(sx, sy, sz); body.add(c); }
      const ghost = body.clone(); ghost.traverse(o => { if (o.isMesh) o.material = K3D.flat(hot('#3ad8ff', 0.8), { transparent: true, opacity: 0.5, depthWrite: false, add: true }); }); g.add(ghost);
      const gi = Gl.add(...CW(b.s, b.x, 0.5).toArray(), 1.6, '#ff3ad6', 0.6, 0.6);
      root.add(g);
      return { b, g, body, ghost, gi, i };
    });

    // arc gates: two brass contact posts at the sides with copper balls, a shutter of bars across the chute between
    // them that drops into the floor when the spark touches both posts; the zone before it is marked on the floor
    CH.gates = L.gates.map((gt, i) => {
      const w = W(gt.s), g = new T.Group(); placeAt(g, gt.s, 0, 0); g.userData.live = true;
      const shutter = new T.Group(); g.add(shutter);
      for (let x = -w; x <= w + 0.01; x += 0.55) { const bar = K3D.mesh(K3D.geo('ac-gateBar', () => new T.CylinderGeometry(0.07, 0.07, 1.8, 8).translate(0, 0.9, 0)), brass, { ink: INK, inkW: 0.5 }); bar.position.x = x; shutter.add(bar); }
      for (const y of [0.3, 1.0, 1.7]) { const rail = K3D.mesh(new T.BoxGeometry(w * 2, 0.1, 0.1), brass, { ink: INK, inkW: 0.5 }); rail.position.y = y; shutter.add(rail); }
      const lamp = new T.Mesh(new T.BoxGeometry(w * 2, 0.08, 0.14), K3D.flat(hot('#ff5a4a', 1.5))); lamp.position.y = 1.85; shutter.add(lamp);
      root.add(g);
      // the posts and their zone (a lit band where the coins must spread)
      const posts = [];
      for (const sx of [-1, 1]) {
        const pg = new T.Group(); placeAt(pg, gt.s - ARCADECOIN.S.GATE_ZONE * 0.5, sx * gt.gx, 0);
        const p = K3D.mesh(new T.CylinderGeometry(0.16, 0.22, 2.6, 10).translate(0, 1.3, 0), brass, { ink: INK, inkW: 0.6 }); pg.add(p);
        const ball = new T.Mesh(K3D.geo('ac-ball', () => new T.SphereGeometry(0.3, 16, 12)), K3D.toon('#e8904a', { emissive: '#ffb070', emissiveIntensity: 0.5 })); ball.position.y = 2.75; pg.add(ball);
        root.add(pg); pg.userData.live = true;
        posts.push({ pg, ball, gi: Gl.add(...CW(gt.s - ARCADECOIN.S.GATE_ZONE * 0.5, sx * gt.gx, 2.75).toArray(), 2.2, '#ffd27a', 0.5, 0) });
      }
      const zone = Geo(); for (const sx of [-1, 1]) zone.strip(gt.s - ARCADECOIN.S.GATE_ZONE, gt.s - 1, sx * gt.gx - 0.55, sx * gt.gx + 0.55, 0.03, 0.5);
      const zm = zone.mesh(K3D.flat(hot('#ffd27a', 0.6), { transparent: true, depthWrite: false, add: true })); zm.renderOrder = 2; live(zm);
      return { gt, g, shutter, lamp, posts, zm, y: 0 };
    });

    // splits: a low glass divider with a brass top rail and lamps; arcade buttons on the floor; half-gates that lift
    const PAIRC = ['#5aff8a', '#ffe24a'];
    CH.splits = L.splits.map((sp, i) => {
      const div = Geo();
      div.sweep(sp.s0 + 1, sp.s1 - 0.5, 0.5, () => [[-0.22, 0], [-0.22, 0.95], [0.22, 0.95], [0.22, 0]], { u: 0.2, v: 1 });
      const glass = div.mesh(K3D.toon('#bfe8ff', { transparent: true, opacity: 0.35, emissive: '#7ad8ff', emissiveIntensity: 0.2, depthWrite: false })); glass.userData.live = true; root.add(glass);
      const rail = Geo(); rail.sweep(sp.s0 + 1, sp.s1 - 0.5, 0.5, () => [[-0.26, 0.95], [-0.26, 1.08], [0.26, 1.08], [0.26, 0.95]], { u: 0.2, v: 1 }); root.add(rail.mesh(brass));
      for (let s = sp.s0 + 1.5; s < sp.s1 - 0.5; s += 1.5) { const p = CW(s, 0, 1.14); B.add(p.x, p.y, p.z, '#7ae8ff', { size: 0.06, speed: 5, phase: -s * 0.6 }); }
      // the nose of the divider: a rounded brass bumper with a warning stripe
      const nose = new T.Group(); placeAt(nose, sp.s0 + 1, 0, 0); const nb = K3D.mesh(new T.CylinderGeometry(0.3, 0.3, 1.1, 16).translate(0, 0.55, 0), haz, { ink: INK, inkW: 0.6 }); nose.add(nb); root.add(nose);
      const pairs = sp.pairs.map((pr, j) => {
        const col = PAIRC[j];
        const bx = pr.btn.side * (W(pr.btn.s) * 0.55 + 0.2), gside = pr.gate.side;
        const btn = new T.Group(); placeAt(btn, pr.btn.s, bx, 0); btn.userData.live = true;
        const ring = K3D.mesh(new T.CylinderGeometry(1.15, 1.25, 0.18, 32), K3D.toon('#c8ccd8'), { ink: INK, inkW: 0.6 }); btn.add(ring);
        const capM = K3D.toon(col, { emissive: col, emissiveIntensity: 0.4 });
        const cap = K3D.mesh(new T.SphereGeometry(1.0, 32, 10, 0, Math.PI * 2, 0, Math.PI * 0.35), capM, { ink: INK, inkW: 0.7 }); cap.scale.set(1, 0.55, 1); cap.position.y = -0.3; btn.add(cap);
        root.add(btn);
        // the half-gate on the other side: a coloured bar gate that lifts away up the wall
        const w = W(pr.gate.s), gx0 = gside < 0 ? -w - 0.2 : 0.22, gx1 = gside < 0 ? -0.22 : w + 0.2;
        const gate = new T.Group(); placeAt(gate, pr.gate.s, (gx0 + gx1) / 2, 0); gate.userData.live = true;
        const leaf = new T.Group(); gate.add(leaf);
        const panel = K3D.mesh(new T.BoxGeometry(gx1 - gx0, 1.5, 0.2), K3D.toon(col, { emissive: col, emissiveIntensity: 0.25 }), { ink: INK, inkW: 0.7 }); panel.position.y = 0.75; leaf.add(panel);
        const st = new T.Mesh(new T.PlaneGeometry(gx1 - gx0 - 0.1, 0.3), haz); st.position.set(0, 1.25, 0.11); leaf.add(st);
        const icon = new T.Mesh(new T.CircleGeometry(0.32, 20), K3D.flat(hot(col, 1.6))); icon.position.set(0, 0.6, 0.11); leaf.add(icon);
        root.add(gate);
        const gi = Gl.add(...CW(pr.btn.s, bx, 0.18).toArray(), 1.9, col, 0.4, 0);
        return { pr, btn, cap, capM, gate, leaf, col, gi, press: 0, lift: 0 };
      });
      return { sp, pairs };
    });

    // springboards: two lit halves on coiled springs, a ring of lamps round the pad that fills while the first coin
    // waits, chevrons on the landing
    CH.springs = L.springs.map((sp, i) => {
      const len = sp.sh - sp.s0, g = new T.Group(); placeAt(g, sp.sh, 0, 0); g.userData.live = true;
      const pad = new T.Group(); g.add(pad);
      const halves = [];
      for (const [k, x0, x1] of [[0, sp.x0, -0.05], [1, 0.05, sp.x1]]) {
        const col = PCOL[k];
        const m = K3D.toon(col, { emissive: col, emissiveIntensity: 0.35 });
        const half = K3D.mesh(new T.BoxGeometry(x1 - x0, 0.22, len), m, { ink: INK, inkW: 0.7 }); half.position.set((x0 + x1) / 2, 0.11, len / 2); pad.add(half);
        const ch = new T.Mesh(new T.PlaneGeometry(x1 - x0 - 0.3, len - 0.4).rotateX(-Math.PI / 2), K3D.flat(hot('#ffffff', 1.0), { map: chevTex(), transparent: true, depthWrite: false, add: true }));
        ch.position.set((x0 + x1) / 2, 0.23, len / 2); pad.add(ch);
        halves.push({ m, col, ch });
      }
      for (let k = 0; k < 6; k++) { const sx = sp.x0 + (k + 0.5) * (sp.x1 - sp.x0) / 6; const coil = K3D.mesh(K3D.geo('ac-coil', () => { const pts = []; for (let a = 0; a < Math.PI * 10; a += 0.3) pts.push(new T.Vector3(Math.cos(a) * 0.22, -a * 0.03, Math.sin(a) * 0.22)); return new T.TubeGeometry(new T.CatmullRomCurve3(pts), 120, 0.035, 5); }), K3D.toon('#c8ccd8'), { ink: INK, inkW: 0.4 }); coil.position.set(sx, 0, len * 0.3); pad.add(coil); }
      root.add(g);
      // the ring of lamps round the pad (fills while waiting): own glows so they can be lit one by one
      const ring = [];
      const N = 24;
      for (let n = 0; n < N; n++) {
        const u = n / N, per = 2 * (sp.x1 - sp.x0) + 2 * len; let d = u * per, x, s;
        if (d < sp.x1 - sp.x0) { x = sp.x0 + d; s = sp.sh; } else if ((d -= sp.x1 - sp.x0) < len) { x = sp.x1; s = sp.sh - d; } else if ((d -= len) < sp.x1 - sp.x0) { x = sp.x1 - d; s = sp.s0; } else { d -= sp.x1 - sp.x0; x = sp.x0; s = sp.s0 + d; }
        ring.push(Gl.add(...CW(s, x, 0.32).toArray(), 0.7, '#ffe24a', 0.25, 0));
      }
      // the landing: a pad with chevrons
      const land = Geo(); land.strip(sp.s1, sp.s1 + 4, -W(sp.s1) + 0.4, W(sp.s1) - 0.4, 0.03, 0.5);
      const lm = land.mesh(K3D.flat(hot('#ffe24a', 0.5), { map: chevTex(), transparent: true, depthWrite: false, add: true })); lm.renderOrder = 2; root.add(lm);
      return { sp, g, pad, halves, ring, kick: 0 };
    });

    // pillars: tall banded columns (resistor towers) that the spark cannot pass through
    for (const pl of L.pillars) {
      const g = new T.Group(); placeAt(g, pl.s, pl.x, 0);
      const col = K3D.mesh(new T.CylinderGeometry(pl.r, pl.r, 9, 20).translate(0, 4.5, 0), K3D.toon('#d8c08a'), { ink: INK, inkW: 0.8 }); g.add(col);
      ['#8a4a1a', '#1a1a1a', '#3a6ad8', '#d8b040'].forEach((bc, k) => { const b = new T.Mesh(new T.CylinderGeometry(pl.r * 1.03, pl.r * 1.03, 0.5, 20), K3D.toon(bc)); b.position.y = 1.4 + k * 1.1 + (k === 3 ? 1.6 : 0); g.add(b); });
      root.add(g);
    }

    // squeezes: chevrons on the walls where they close in
    for (const q of L.squeeze) for (const sx of [-1, 1]) for (let s = q.s0 - 6; s < q.s0; s += 1.5) { const p = CW(s, sx * (W(s) + 0.2), 0.9); B.add(p.x, p.y, p.z, '#ff9ad6', { size: 0.08, speed: 8, phase: -s }); }

    // checkpoint arches: a ring of lamps over the chute; green once passed
    CH.checks = L.checks.slice(1).map(ck => {
      const w = W(ck), g = new T.Group(); placeAt(g, ck, 0, 0);
      const arch = K3D.mesh(new T.TorusGeometry(w + 0.9, 0.16, 8, 48, Math.PI), brass, { ink: INK, inkW: 0.7 }); g.add(arch);
      root.add(g);
      const gi = []; for (let n = 0; n <= 14; n++) { const a = n / 14 * Math.PI; gi.push(Gl.add(...CW(ck, Math.cos(a) * (w + 0.9), Math.sin(a) * (w + 0.9)).toArray(), 0.55, '#ffffff', 0.5, 0)); }
      return { ck, gi, lit: false };
    });

    // the Sweeper's strikes: a red strip that lights on the floor before the brush slams down
    CH.brush = L.brush.map(b => { const z = Geo(); z.strip(b.s - 1.2, b.s + 1.2, Math.max(b.x0, -W(b.s)), Math.min(b.x1, W(b.s)), 0.04, 0.4); const m = z.mesh(K3D.flat(hot('#ff3a2a', 1.2), { transparent: true, depthWrite: false, add: true })); m.renderOrder = 2; m.visible = false; live(m); return { b, m }; });

    // gear faces turning under the floor: a giant gear flush with the floor, its face showing through a grate
    CH.carry = L.carry.map(cq => {
      const s = (cq.s0 + cq.s1) / 2, r = (cq.s1 - cq.s0) / 2 + 1.2;
      const g = new T.Group(); placeAt(g, s, 0, -0.06); g.userData.live = true;
      const gear = ARCADE.gear(K, { r, teeth: Math.round(r * 5), th: 0.3, spokes: 0, solid: true }); gear.rotation.x = -Math.PI / 2; g.add(gear);
      const arrows = new T.Mesh(new T.RingGeometry(r * 0.45, r * 0.6, 48, 1, 0, Math.PI * 1.6).rotateX(-Math.PI / 2), K3D.flat(hot('#ffb050', 0.8), { transparent: true, depthWrite: false, add: true })); arrows.position.y = 0.2; g.add(arrows);
      root.add(g);
      return { cq, g, gear, arrows };
    });

    // fans: a big fan in the wall, blowing across the chute (streaks fly in its wind)
    CH.fans = L.fans.map(fn => {
      const s = (fn.s0 + fn.s1) / 2, side = fn.push > 0 ? -1 : 1, w = W(s);
      const g = new T.Group(); placeAt(g, s, side * (w + 1.6), 1.5); g.userData.live = true;
      const housing = K3D.mesh(new T.CylinderGeometry(3.2, 3.2, 1.2, 40, 1, true).rotateZ(Math.PI / 2), K3D.toon('#3a3640', { side: T.DoubleSide }), { ink: INK, inkW: 0.8 }); g.add(housing);
      const blades = new T.Group(); g.add(blades);
      for (let k = 0; k < 7; k++) { const b = K3D.mesh(K3D.geo('ac-blade', () => new T.BoxGeometry(0.06, 2.9, 0.8).translate(0, 1.5, 0)), K3D.toon('#2a2830'), { ink: INK, inkW: 0.5 }); b.rotation.x = k / 7 * Math.PI * 2; b.rotation.y = 0.4; blades.add(b); }
      for (let k = 1; k <= 5; k++) { const ring = K3D.mesh(new T.TorusGeometry(k * 0.6, 0.04, 4, 40).rotateY(Math.PI / 2), K3D.mat('ac-grill', () => K3D.toon('#8a8a94')), { ink: false }); ring.position.x = -side * 0.62; g.add(ring); }
      for (let k = 0; k < 6; k++) { const sp = new T.Mesh(new T.BoxGeometry(0.05, 6.2, 0.05), K3D.mat('ac-grill', () => K3D.toon('#8a8a94'))); sp.position.x = -side * 0.62; sp.rotation.x = k / 6 * Math.PI; g.add(sp); }
      root.add(g);
      const streaks = []; for (let k = 0; k < 20; k++) streaks.push({ gi: Gl.add(0, -9999, 0, 0.3, '#cfe8ff', 0.5, 0), s: fn.s0 + Math.random() * (fn.s1 - fn.s0), x: Math.random(), y: 0.4 + Math.random() * 2 });
      return { fn, g, blades, side, streaks };
    });

    // solder blobs: a shiny silver puddle across the trace
    for (const q of L.slick) { const z = Geo(); z.strip(q.s0, q.s1, -W(q.s0) + 0.2, W(q.s0) - 0.2, 0.035, 0.5); root.add(z.mesh(K3D.toon('#d8dce8', { emissive: '#ffffff', emissiveIntensity: 0.25 }))); }
  }

  /* ---------- every frame ---------- */
  const tmp = new T.Vector3(), q0 = new T.Quaternion(), s3 = new T.Vector3(), up = new T.Vector3(0, 1, 0), e3 = new T.Euler();
  function update(K, CH, st, dt) {
    CH.t += dt;
    const t = CH.t, near = s => Math.abs(s - st.s) < 140;
    const G = K.arcSc.G;
    // pickups: spin and bob; taken ones are gone
    for (const kind in CH.pk) {
      const P = CH.pk[kind];
      P.items.forEach((it, n) => {
        if (!near(it.p.s) && P.done) return;
        const got = st.got[it.p.i];
        e3.set(kind === 'ticket' ? Math.sin(t * 2 + it.ph) * 0.3 : 0, t * (kind === 'star' ? 2.5 : 3) + it.ph, kind === 'star' ? Math.sin(t * 3 + it.ph) * 0.2 : 0);
        q0.copy(it.q).multiply(new T.Quaternion().setFromEuler(e3));
        tmp.copy(it.base); tmp.y += Math.sin(t * 2.4 + it.ph) * 0.08;
        s3.setScalar(got ? 0 : 1);
        m4.compose(tmp, q0, s3); P.im.setMatrixAt(n, m4);
      });
      P.im.instanceMatrix.needsUpdate = true; P.done = true;
    }
    // (a pickup's glow goes with it, and comes back if a restart brings it back)
    L.pickups.forEach((p, i) => { const show = !st.got[i]; if (show !== CH.pkShown[i] && CH.pkGlow[i] >= 0) { CH.pkShown[i] = show; G.set(CH.pkGlow[i], ...CW(p.s, p.x, p.kind === 'coin' ? 0.6 : 0.75).toArray(), show ? (p.kind === 'coin' ? 0.6 : 1.0) : 0); } });
    // wires: sparks crawl along them
    for (const W2 of CH.wires) {
      if (!near(W2.wr.s)) continue;
      W2.glow.material.color.copy(hot('#9adfff', 0.35 + 0.35 * Math.abs(Math.sin(t * 13 + W2.wr.s))));
      W2.gi.forEach((gi, k) => { const u = ((t * (0.6 + k * 0.13) + k * 0.37) % 1); const p = W2.cv.getPointAt(u); G.set(gi, p.x, p.y, p.z, 0.25 + Math.abs(Math.sin(t * 30 + k)) * 0.5); });
    }
    // teeth: up while the rules have them closed (a quick rise), a red glow in the slot just before
    for (const th of CH.teeth) {
      if (!near(th.tt.s)) { th.g.visible = false; continue; }
      th.g.visible = true;
      const tt = th.tt, on = ARCADECOIN.teethOn(tt, st.ht), ph = (((st.ht - tt.ph) % tt.per) + tt.per) % tt.per, soon = !on && ph > tt.per - 0.5;
      th.h += ((on ? 1 : 0) - th.h) * Math.min(1, dt * 22);
      th.warn.material.color.copy(hot('#ff3a2a', soon ? 1.2 + Math.sin(t * 40) * 0.5 : on ? 0.25 : 0));
      if (tt.roll) {
        // giant coins roll up out of the heap while closed, spinning down the slope, and sink back
        th.body.position.y = -1.7 + 3.2 * th.h;
        for (const b of th.body.userData.bigs) { b.rotation.x = -t * 4 - b.userData.ph; b.position.y = Math.abs(Math.sin(t * 5 + b.userData.ph)) * 0.15 * th.h; }
      } else th.body.position.y = -1.65 + 1.65 * th.h;
    }
    // levers
    for (const lv of CH.levers) { if (!near(lv.lv.s)) continue; const bx = ARCADECOIN.leverX(lv.lv, st.ht) - lv.lv.cx; lv.arm.rotation.z = Math.asin(Math.max(-1, Math.min(1, bx / 14))); }
    // bugs: jitter and tear; gone when zapped
    for (const bg of CH.bugs) {
      const gone = st.bugGone[bg.i];
      bg.g.visible = !gone && near(bg.b.s);
      if (gone && !bg.goneSeen) { bg.goneSeen = true; G.set(bg.gi, 0, -9999, 0, 0); }
      if (!gone && bg.goneSeen) { bg.goneSeen = false; G.set(bg.gi, ...CW(bg.b.s, bg.b.x, 0.5).toArray(), 1.6); }
      if (!bg.g.visible) continue;
      const tear = Math.sin(t * 23 + bg.i) > 0.7;
      bg.body.position.set(tear ? (Math.random() - 0.5) * 0.3 : 0, Math.abs(Math.sin(t * 12 + bg.i)) * 0.08, 0);
      bg.body.rotation.y = Math.sin(t * 2 + bg.i) * 0.6;
      bg.ghost.visible = tear; bg.ghost.position.set(0.12, 0, 0); bg.ghost.rotation.y = bg.body.rotation.y;
    }
    // gates: the shutter drops into the floor once open; the posts flare when the spark touches them
    CH.gates.forEach((gt, i) => {
      const open = st.gateOpen[i];
      gt.y += ((open ? -1.95 : 0) - gt.y) * Math.min(1, dt * 8);
      gt.shutter.position.y = gt.y;
      gt.lamp.material.color.copy(hot(open ? '#5aff8a' : '#ff5a4a', 1.5));
      const lo = Math.min(st.c[0].x, st.c[1].x), hi = Math.max(st.c[0].x, st.c[1].x), inZone = st.s > gt.gt.s - ARCADECOIN.S.GATE_ZONE && st.s < gt.gt.s;
      gt.posts.forEach((p, k) => { const touch = open || (inZone && ARCADECOIN.arcOn(st) && (k ? hi >= gt.gt.gx - 0.7 : lo <= -gt.gt.gx + 0.7)); G.color(p.gi, touch ? '#ffffff' : '#ffd27a', touch ? 1.4 + Math.sin(t * 30) * 0.3 : 0.4); p.ball.material.emissiveIntensity = touch ? 1.4 : 0.5; });
      gt.zm.material.color.copy(hot('#ffd27a', open ? 0.1 : 0.4 + 0.25 * Math.sin(t * 6)));
    });
    // split buttons sink and light; their half-gates lift away
    CH.splits.forEach((S2, i) => S2.pairs.forEach((P, j) => {
      const on = st.btn[i][j] || ARCADECOIN.gold(st);
      P.press += ((on ? 1 : 0) - P.press) * Math.min(1, dt * 12); P.lift += ((on ? 1 : 0) - P.lift) * Math.min(1, dt * 5);
      P.cap.position.y = -0.3 - 0.18 * P.press; P.capM.emissiveIntensity = on ? 1.3 : 0.35 + 0.25 * Math.sin(t * 6 + j);
      P.leaf.position.y = P.lift * 2.4; P.leaf.rotation.x = -P.lift * 0.3;
      G.color(P.gi, P.col, on ? 0.8 : 0.35);
    }));
    // springboards: the ring of lamps fills while the first coin waits; the pad kicks up as it fires
    CH.springs.forEach((SP, i) => {
      const h = st.hold && st.hold.i === i ? st.hold.t / ARCADECOIN.S.HOLD : 0, done = st.springDone[i];
      SP.ring.forEach((gi, n) => { const lit = h > 0 ? n / SP.ring.length < h : !done && Math.floor(t * 6 - n * 0.5) % 6 === 0; G.color(gi, h > 0 ? '#fff6c8' : '#ffe24a', lit ? 0.7 : 0.12); });
      if (st.fly && st.fly.i === i) SP.kick = Math.min(1, SP.kick + dt * 10); else SP.kick = Math.max(0, SP.kick - dt * 2);
      SP.pad.rotation.x = -SP.kick * 0.35;
      // the halves light up when their coin is on the pad
      SP.halves.forEach((hf, k) => { const c = st.c[k], on = st.s > SP.sp.s0 - 1 && st.s <= SP.sp.sh + 0.1 && c.state === 'ride' && c.x > SP.sp.x0 - 0.3 && c.x < SP.sp.x1 + 0.3 && !done; hf.m.emissiveIntensity = on ? 0.7 + Math.sin(t * 20) * 0.15 : 0.3; hf.ch.material.color.copy(hot('#ffffff', on ? 0.75 : 0.35)); });
    });
    // checkpoint arches turn green once passed
    for (const c of CH.checks) { const lit = st.restart >= c.ck - 0.01; if (lit !== c.lit) { c.lit = lit; c.gi.forEach(gi => G.color(gi, lit ? '#5aff8a' : '#ffffff', lit ? 0.65 : 0.5)); } }
    // the Sweeper's strips light 1.2 s before the brush comes down (only while it is awake)
    for (const br of CH.brush) { const a = ARCADECOIN.awake(st), eta = PR.eta(st.s, br.b.s); br.m.visible = a && eta < 1.4 && eta > -0.4; if (br.m.visible) br.m.material.color.copy(hot('#ff3a2a', 0.8 + Math.abs(Math.sin(t * 25)) * 0.8)); }
    // gear faces turn (the way they carry the coins)
    for (const cq of CH.carry) { if (!near(cq.cq.s0)) continue; cq.gear.rotation.z += dt * Math.sign(cq.cq.v) * 0.5 * (ARCADECOIN.gold(st) ? 0.75 : 1); cq.arrows.rotation.y = -Math.sign(cq.cq.v) * t * 0.5; }
    // fans spin; streaks fly across in their wind
    for (const fn of CH.fans) {
      if (!near(fn.fn.s0)) continue;
      fn.blades.rotation.x += dt * 14;
      for (const k of fn.streaks) { k.x += dt * 1.2; if (k.x > 1) { k.x = 0; k.s = fn.fn.s0 + Math.random() * (fn.fn.s1 - fn.fn.s0); } const w = W(k.s), x = fn.side * (w - k.x * 2 * w); G.set(k.gi, ...CW(k.s, x, k.y).toArray(), 0.25 + 0.2 * Math.sin(k.x * Math.PI)); }
    }
    if (CH.pulse) CH.pulse.offset.y = -t * 0.6;
    // the START button glows brighter as the coins come; pressed by the landing
    if (CH.start) { const d = Math.max(0, 1 - (A.start - st.s) / 60); CH.start.capM.emissiveIntensity = 0.45 + d * 0.8 + (st.phase === 'start' || st.phase === 'done' ? 0.8 + Math.sin(t * 10) * 0.3 : 0); CH.start.cap.position.y = -6.6 - (st.phase === 'start' || st.phase === 'done' ? 0.35 : 0); }
  }

  return { build, update, Geo, CW, quatAt, placeAt, runs };
})();
