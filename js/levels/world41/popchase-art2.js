/* Pip & Bo - Level 41-2 Page Turner Chase: the pictures of spreads 2 to 4 and of the machinery they add (loaded after
   popchase-art.js, which keeps the book, the wood, the Roll and the heroes). Like that file it only reads the game
   state, so a run with K3D.noRender plays the same.
     art.decor.castle / .sea / .end   each spread's printed pages (paint) and its pop-up scenery (scenery)
     art.pieces.flap / twin / wheel / ship   the machinery (bridges are drawn by popchase-art.js)
     art.sliders.guard / .shark        the sliding paper figures of spreads 2 and 3
     art.extras                        the wave crests, the reading finger, the storm (rain and lightning)
   Every piece is a group that folds up off the page with its strip (sc.pops) and moves to match its state in
   update(st, dt, K) each drawn frame.
*/
'use strict';

(function () {
  const T = K3D.T, P = POPUP, PC = POPCHASE, art = PC.art, kit = art.kit;
  const INK = P.INK, EDGE = P.EDGE, HALF = PC.HALF; // (H is the screen's height)
  const { family, famDraw, upOf, stoneAt, leafAt, flowerAt, hash, smooth } = kit;
  const v3 = new T.Vector3();
  const chunk = (st, x) => clamp(PC.chunkOf(st, x), 0, st.chunkT.length - 1);
  const pop = (sc, st, obj, x, delay = 0.1, back = false) => { sc.pops.push({ obj, x, ch: chunk(st, x), delay, back }); };
  const toon = (c, o) => K3D.toon(c, o);
  const mat = (key, c, o) => K3D.mat(key, () => K3D.toon(c, o));

  /* ================= shared printing ================= */
  // the corridor, as a canvas path
  function routePath(c, pts, X, Z) { c.beginPath(); pts.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); }
  function clipCorridor(c, pts, X, Z, k = 0.9) {
    const inner = PC.offset(pts, HALF * k).concat(PC.offset(pts, -HALF * k).reverse());
    c.beginPath(); inner.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); c.closePath(); c.clip();
  }
  // walk each straight run of the route: fn(at(t, offset) -> [px, py], len, angle across the run)
  function eachRun(pts, X, Z, fn) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], len = Math.hypot(x1 - x0, z1 - z0), nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
      fn((t, o) => [X(x0 + (x1 - x0) * t + nx * o), Z(z0 + (z1 - z0) * t + nz * o)], len, Math.atan2(Z(z1) - Z(z0), X(x1) - X(x0)), i);
    }
  }
  // the printed words the reading finger follows: darker blocks of real text on the path where it may land
  const STORY = ['and the reader read on, faster and faster', 'turn the page, turn the page, said the reader', 'once upon a time there were two friends',
    'who ran and ran and never looked back', 'the end was nearer than they thought', 'and every word was a step closer to bed'];
  function fingerText(c, L3, X, Z, S, r, col) {
    for (const q of L3.def.fingers || []) {
      const px = X(q.x), py = Z(q.z);
      c.save(); c.translate(px, py); c.rotate((r() - 0.5) * 0.12);
      // a faint ruled panel under the words, so a finger spot reads from a distance
      c.fillStyle = 'rgba(250,244,226,0.5)'; kit.rrPath(c, -S * 1.45, -S * 1.2, S * 2.9, S * 2.4, S * 0.3); c.fill();
      c.strokeStyle = 'rgba(43,33,48,0.35)'; c.lineWidth = 2; c.stroke();
      c.fillStyle = col; c.font = 'italic ' + Math.round(S * 0.27) + 'px Georgia, "DejaVu Serif", serif'; c.textAlign = 'left';
      for (let k = 0; k < 6; k++) c.fillText(STORY[(k + Math.floor(r() * 6)) % 6], -S * 1.3, -S * 0.85 + k * S * 0.38, S * 2.6);
      c.restore();
    }
  }
  // paper grain, a printed shadow round the page's outer edges, the page's title and a line of the story
  function finish(c, L3, S, w, h, left, X, Z, r, title, line, col = 'rgba(240,232,210,0.85)', vg = '10,15,20') {
    for (let i = 0; i < 4200; i++) { const x = r() * w, y = r() * h, a = r() * Math.PI, l = 3 + r() * 6; c.strokeStyle = r() < 0.5 ? 'rgba(255,250,235,0.06)' : 'rgba(0,0,0,0.05)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
    const g = (x0, y0, x1, y1) => { const q = c.createLinearGradient(x0, y0, x1, y1); q.addColorStop(0, 'rgba(' + vg + ',0.3)'); q.addColorStop(1, 'rgba(' + vg + ',0)'); c.fillStyle = q; };
    g(0, 0, 0, S * 2.5); c.fillRect(0, 0, w, S * 2.5);
    g(0, h, 0, h - S * 1.5); c.fillRect(0, h - S * 1.5, w, S * 1.5);
    if (left) { g(0, 0, S * 2, 0); c.fillRect(0, 0, S * 2, h); } else { g(w, 0, w - S * 2, 0); c.fillRect(w - S * 2, 0, S * 2, h); }
    c.fillStyle = col;
    if (left) { c.textAlign = 'left'; c.font = 'italic ' + Math.round(S * 0.9) + 'px Georgia, "DejaVu Serif", serif'; c.fillText(title, X(-L3.pw + 1.6), Z(-L3.pd / 2 + 1.5)); }
    else if (line) { c.textAlign = 'right'; c.font = 'italic ' + Math.round(S * 0.6) + 'px Georgia, "DejaVu Serif", serif'; c.fillText(line, X(L3.pw - 1.4), Z(L3.pd / 2 - 0.7)); }
  }
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  /* ================= the Castle ================= */
  // a sunny meadow round a castle: grass, buttercups and daisies, clover; a cobbled road with worn stones and a gutter
  // of moss; the moat's stone banks; heraldic shields printed in the margins
  function paintCastle(L3, left) {
    return function (c, S, r, w, h) {
      const ox = left ? -L3.pw : 0, X = x => (x - ox) * S, Z = z => (z + L3.pd / 2) * S, pts = L3.route, W = HALF * 2 * S;
      const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#5f8a48'); bg.addColorStop(0.55, '#76a052'); bg.addColorStop(1, '#86ad5c');
      c.fillStyle = bg; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 110; i++) P.wash(c, r() * w, r() * h, S * (2.5 + r() * 3.5), pick(r, ['#5a8442', '#88b062', '#6e9a4c', '#93b86a']), 0.16, r, { noEdge: true });
      for (let i = 0; i < 480; i++) P.wash(c, r() * w, r() * h, S * (0.3 + r() * 0.8), pick(r, ['#6a9a4a', '#82ac58', '#5c8a44', '#9cc070', '#7a9a48']), 0.2, r, { noEdge: r() < 0.7 });
      // mown stripes, very faint
      for (let x = 0; x < w; x += S * 3) { c.fillStyle = (Math.round(x / (S * 3)) % 2) ? 'rgba(255,255,220,0.035)' : 'rgba(0,30,0,0.03)'; c.fillRect(x, 0, S * 3, h); }
      // blades of grass
      c.lineWidth = 1.2;
      for (let i = 0; i < 9000; i++) { const x = r() * w, y = r() * h, l = 4 + r() * 8, lean = (r() - 0.5) * 5; c.strokeStyle = pick(r, ['rgba(60,100,40,0.5)', 'rgba(150,190,90,0.45)', 'rgba(90,130,55,0.5)']); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * 0.3, y - l * 0.6, x + lean, y - l); c.stroke(); }
      // clover patches, buttercups, daisies
      for (let i = 0; i < 160; i++) { const cx = r() * w, cy = r() * h; for (let k = 0; k < 8; k++) { const x = cx + (r() - 0.5) * S * 0.9, y = cy + (r() - 0.5) * S * 0.6, sz = 3.5 + r() * 3; c.fillStyle = r() < 0.5 ? 'rgba(80,140,70,0.75)' : 'rgba(110,165,85,0.7)'; for (let q = 0; q < 3; q++) { const a = q * 2.09 + r() * 0.3; c.beginPath(); c.arc(x + Math.cos(a) * sz, y + Math.sin(a) * sz, sz, 0, Math.PI * 2); c.fill(); } } }
      for (let i = 0; i < 700; i++) { const x = r() * w, y = r() * h, sz = 3 + r() * 3.5;
        if (r() < 0.55) { c.fillStyle = 'rgba(255,255,250,0.95)'; for (let k = 0; k < 8; k++) { const a = k * 0.785; c.beginPath(); c.ellipse(x + Math.cos(a) * sz * 0.7, y + Math.sin(a) * sz * 0.7, sz * 0.45, sz * 0.2, a, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#f2c43c'; c.beginPath(); c.arc(x, y, sz * 0.32, 0, Math.PI * 2); c.fill(); }
        else { c.fillStyle = '#f4cc2a'; for (let k = 0; k < 5; k++) { const a = k * 1.2566; c.beginPath(); c.arc(x + Math.cos(a) * sz * 0.45, y + Math.sin(a) * sz * 0.45, sz * 0.42, 0, Math.PI * 2); c.fill(); } c.fillStyle = 'rgba(160,110,20,0.8)'; c.beginPath(); c.arc(x, y, sz * 0.2, 0, Math.PI * 2); c.fill(); } }
      for (let i = 0; i < 90; i++) { const rx = 3 + r() * 5; stoneAt(c, r() * w, r() * h, rx, rx * (0.6 + r() * 0.3), pick(r, ['#9a9a90', '#aaa69a', '#8a8c88'])); }
      // the moat's banks: dressed stone blocks along each cut, with moss in the joints
      for (const [g0, g1] of L3.def.gaps) for (const [bx, sd] of [[g0, -1], [g1, 1]]) {
        const px = X(bx); if (px < -S * 2 || px > w + S * 2) continue;
        const bw = S * 0.75;
        c.fillStyle = 'rgba(40,50,30,0.35)'; c.fillRect(sd < 0 ? px - bw - 6 : px, 0, bw + 6, h);
        for (let y = 0; y < h; ) { const bh = S * (0.45 + r() * 0.35); const x0 = sd < 0 ? px - bw : px; c.fillStyle = pick(r, ['#a8a294', '#9a9486', '#b4ae9e', '#908a7e']); c.fillRect(x0 + 1, y + 1, bw - 2, bh - 2);
          c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x0 + 2, y + 2, bw - 4, 4); c.strokeStyle = 'rgba(43,33,48,0.45)'; c.lineWidth = 1.5; c.strokeRect(x0 + 1, y + 1, bw - 2, bh - 2);
          if (r() < 0.5) { c.fillStyle = 'rgba(90,130,60,0.6)'; c.beginPath(); c.ellipse(x0 + r() * bw, y + bh, 6 + r() * 8, 3, 0, 0, Math.PI * 2); c.fill(); }
          y += bh; }
      }
      // the cobbled road: a kerb, then rounded cobbles laid in courses across the way, worn paler in the middle
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (const [wd, col] of [[1.14, 'rgba(30,40,20,0.3)'], [1.06, '#6e6658'], [1.0, '#5f584c']]) { c.strokeStyle = col; c.lineWidth = W * wd; routePath(c, pts, X, Z); c.stroke(); }
      c.save(); clipCorridor(c, pts, X, Z, 0.98);
      eachRun(pts, X, Z, (at, len) => {
        for (let d = 0; d < len; d += 0.42) {
          const course = Math.round(d / 0.42), shift = (course % 2) * 0.22;
          for (let o = -HALF + shift; o < HALF; o += 0.44) {
            const [x, y] = at((d + 0.21) / len, o + 0.22), mid = 1 - Math.abs(o) / HALF;
            const base = mixHex(pick(r, ['#8e8576', '#9c9384', '#a49a88', '#857d70', '#b0a690']), '#cfc4ae', mid * 0.35 + r() * 0.1);
            const rx = S * (0.18 + r() * 0.03), ry = S * (0.17 + r() * 0.03);
            c.fillStyle = 'rgba(30,26,20,0.35)'; c.beginPath(); c.ellipse(x + 2, y + 3, rx, ry, 0, 0, Math.PI * 2); c.fill();
            c.fillStyle = base; c.beginPath(); c.ellipse(x, y, rx, ry, r() * 0.6, 0, Math.PI * 2); c.fill();
            c.fillStyle = 'rgba(255,250,235,0.28)'; c.beginPath(); c.ellipse(x - rx * 0.25, y - ry * 0.3, rx * 0.5, ry * 0.32, -0.4, 0, Math.PI * 2); c.fill();
            if (r() < 0.12) { c.fillStyle = 'rgba(90,130,60,0.55)'; c.beginPath(); c.arc(x + rx, y + ry * 0.6, 3 + r() * 3, 0, Math.PI * 2); c.fill(); }
          }
        }
        // a few cracks and wheel ruts
        for (const o of [-HALF * 0.45, HALF * 0.45]) { c.strokeStyle = 'rgba(60,50,40,0.18)'; c.lineWidth = S * 0.22; c.beginPath(); const a = at(0, o), b = at(1, o); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
      });
      c.restore();
      // kerb stones along both edges
      for (const sd of [-1, 1]) {
        const edge = PC.offset(pts, sd * HALF * 0.99);
        for (let i = 0; i < edge.length - 1; i++) {
          const [ax, az] = edge[i], [bx, bz] = edge[i + 1], len = Math.hypot(bx - ax, bz - az);
          for (let d = 0; d < len; d += 0.6) { const t = d / len, x = X(ax + (bx - ax) * t), y = Z(az + (bz - az) * t); c.fillStyle = pick(r, ['#c4bba6', '#b5ad9a', '#cbc3ae']); c.beginPath(); c.arc(x, y, S * 0.13, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(43,33,48,0.4)'; c.lineWidth = 1.2; c.stroke(); }
        }
      }
      fingerText(c, L3, X, Z, S, r, 'rgba(36,26,40,0.92)');
      // heraldic shields printed in the meadow, far from the road
      for (let i = 0; i < 7; i++) {
        const x = r() * w, y = r() * h * 0.3 + h * 0.03; c.save(); c.translate(x, y); c.scale(S / 90, S / 90);
        c.fillStyle = pick(r, ['#b8324a', '#2f6a9a', '#d8a030', '#3f7a3a']); c.beginPath(); c.moveTo(-30, -36); c.lineTo(30, -36); c.lineTo(30, 0); c.quadraticCurveTo(30, 30, 0, 44); c.quadraticCurveTo(-30, 30, -30, 0); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(43,33,48,0.7)'; c.lineWidth = 4; c.stroke(); c.fillStyle = 'rgba(255,240,200,0.8)'; c.fillRect(-6, -30, 12, 64); c.fillRect(-26, -6, 52, 12);
        c.restore();
      }
      finish(c, L3, S, w, h, left, X, Z, r, 'Chapter Three: The Castle', '...and the guards marched up and down, up and down.', 'rgba(255,250,232,0.9)', '20,30,10');
    };
  }
  const CASTLE = {};
  // a round tower: stone courses, an arrow slit, a pointed roof and a pennant
  CASTLE.tower = () => K3D.paint('pcTower', 320, 768, (c, w, h) => {
    const r = P.rng(701); c.clearRect(0, 0, w, h);
    const bodyTop = h * 0.36;
    c.fillStyle = '#b9b3a4'; c.fillRect(w * 0.18, bodyTop, w * 0.64, h - bodyTop);
    for (let y = bodyTop; y < h; y += 26) for (let x = w * 0.18 + ((y / 26) % 2) * 18; x < w * 0.82; x += 36) { c.fillStyle = pick(r, ['#c4beae', '#aca696', '#b8b2a2', '#9e9888']); c.fillRect(x + 1, y + 1, 34, 24); c.strokeStyle = 'rgba(70,60,50,0.4)'; c.lineWidth = 1.5; c.strokeRect(x + 1, y + 1, 34, 24); }
    const sh = c.createLinearGradient(w * 0.18, 0, w * 0.82, 0); sh.addColorStop(0, 'rgba(255,250,230,0.25)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(40,30,50,0.3)'); c.fillStyle = sh; c.fillRect(w * 0.18, bodyTop, w * 0.64, h - bodyTop);
    // crenels
    c.fillStyle = '#b0aa9a'; for (let x = w * 0.14; x < w * 0.86; x += 44) c.fillRect(x, bodyTop - 26, 28, 30);
    // the roof
    c.fillStyle = '#c0453c'; c.beginPath(); c.moveTo(w * 0.1, bodyTop - 22); c.lineTo(w / 2, h * 0.04); c.lineTo(w * 0.9, bodyTop - 22); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(110,30,25,0.6)'; c.lineWidth = 2; for (let y = h * 0.1; y < bodyTop - 22; y += 18) { const k = (y - h * 0.04) / (bodyTop - 22 - h * 0.04); c.beginPath(); c.moveTo(w / 2 - k * w * 0.4, y); c.lineTo(w / 2 + k * w * 0.4, y); c.stroke(); }
    c.fillStyle = 'rgba(255,220,200,0.25)'; c.beginPath(); c.moveTo(w * 0.1, bodyTop - 22); c.lineTo(w / 2, h * 0.04); c.lineTo(w * 0.38, bodyTop - 22); c.closePath(); c.fill();
    // windows: an arrow slit and a lit arched window
    c.fillStyle = '#2b2130'; c.fillRect(w / 2 - 6, h * 0.55, 12, 60);
    c.fillStyle = '#ffd77a'; c.beginPath(); c.moveTo(w / 2 - 22, h * 0.82); c.lineTo(w / 2 - 22, h * 0.76); c.arc(w / 2, h * 0.76, 22, Math.PI, 0); c.lineTo(w / 2 + 22, h * 0.82); c.closePath(); c.fill(); c.strokeStyle = '#2b2130'; c.lineWidth = 4; c.stroke();
    // a pennant
    c.strokeStyle = '#3a2a20'; c.lineWidth = 4; c.beginPath(); c.moveTo(w / 2, h * 0.045); c.lineTo(w / 2, 4); c.stroke();
    c.fillStyle = '#2f6a9a'; c.beginPath(); c.moveTo(w / 2, 6); c.lineTo(w / 2 + 70, 18); c.lineTo(w / 2, 32); c.closePath(); c.fill();
  });
  CASTLE.towerShape = (() => { const s = new T.Shape(); s.moveTo(-0.62, 0); s.lineTo(-0.62, 2.95); s.lineTo(-0.82, 3.05); s.lineTo(0, 4.42); s.lineTo(0.82, 3.05); s.lineTo(0.62, 2.95); s.lineTo(0.62, 0); s.closePath(); return s; })();
  // a stretch of curtain wall with crenels
  CASTLE.wall = () => K3D.paint('pcCWall', 512, 384, (c, w, h) => {
    const r = P.rng(711); c.clearRect(0, 0, w, h);
    for (let y = 40; y < h; y += 28) for (let x = ((y / 28) % 2) * 20 - 20; x < w; x += 40) { c.fillStyle = pick(r, ['#bdb7a8', '#aea898', '#c6c0b0', '#a29c8c']); c.fillRect(x + 1, y + 1, 38, 26); c.strokeStyle = 'rgba(70,60,50,0.4)'; c.lineWidth = 1.5; c.strokeRect(x + 1, y + 1, 38, 26); }
    for (let x = 0; x < w; x += 64) { c.fillStyle = '#b4ae9e'; c.fillRect(x + 8, 0, 40, 44); c.strokeStyle = 'rgba(70,60,50,0.4)'; c.strokeRect(x + 8, 0, 40, 44); }
    for (let i = 0; i < 14; i++) P.wash(c, r() * w, 40 + r() * (h - 40), 20, r() < 0.5 ? '#7a9a5a' : '#8a8478', 0.3, r, { noEdge: true });
    c.fillStyle = 'rgba(40,30,50,0.18)'; c.fillRect(0, h * 0.8, w, h * 0.2);
  });
  CASTLE.wallShape = (() => { const s = new T.Shape(); s.moveTo(-1.5, 0); s.lineTo(-1.5, 2.05); for (let k = 0; k < 6; k++) { const x = -1.5 + k * 0.5; s.lineTo(x + 0.06, 2.05); s.lineTo(x + 0.06, 2.3); s.lineTo(x + 0.38, 2.3); s.lineTo(x + 0.38, 2.05); } s.lineTo(1.5, 2.05); s.lineTo(1.5, 0); s.closePath(); return s; })();
  // a paper knight standing guard: helmet with a plume, tabard with a lion, a long spear
  CASTLE.knight = () => K3D.paint('pcKnight', 256, 448, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#6a4a2a'; c.lineWidth = 8; c.beginPath(); c.moveTo(w * 0.82, h * 0.02); c.lineTo(w * 0.82, h); c.stroke();
    c.fillStyle = '#d8d8e0'; c.beginPath(); c.moveTo(w * 0.82, 0); c.lineTo(w * 0.86, h * 0.07); c.lineTo(w * 0.78, h * 0.07); c.closePath(); c.fill();
    c.fillStyle = '#9aa0ac'; c.fillRect(w * 0.3, h * 0.8, w * 0.14, h * 0.2); c.fillRect(w * 0.52, h * 0.8, w * 0.14, h * 0.2);
    c.fillStyle = '#b8324a'; c.beginPath(); c.moveTo(w * 0.24, h * 0.34); c.lineTo(w * 0.72, h * 0.34); c.lineTo(w * 0.76, h * 0.82); c.lineTo(w * 0.2, h * 0.82); c.closePath(); c.fill();
    c.fillStyle = '#f2c14e'; c.beginPath(); c.arc(w * 0.48, h * 0.55, w * 0.12, 0, Math.PI * 2); c.fill(); c.fillStyle = '#b8324a'; c.beginPath(); c.arc(w * 0.48, h * 0.55, w * 0.06, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c4c8d2'; c.beginPath(); c.arc(w * 0.48, h * 0.22, w * 0.2, Math.PI, 0); c.lineTo(w * 0.68, h * 0.32); c.lineTo(w * 0.28, h * 0.32); c.closePath(); c.fill();
    c.fillStyle = '#2b2130'; c.fillRect(w * 0.32, h * 0.22, w * 0.32, h * 0.025);
    c.fillStyle = '#d8403a'; c.beginPath(); c.ellipse(w * 0.44, h * 0.06, w * 0.06, h * 0.07, -0.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7a849a'; c.fillRect(w * 0.7, h * 0.34, w * 0.12, h * 0.05);
    c.strokeStyle = 'rgba(43,33,48,0.8)'; c.lineWidth = 3; c.strokeRect(w * 0.24, h * 0.34, w * 0.48, h * 0.48);
  });
  CASTLE.knightShape = P.shapeFrom([[-0.32, 0], [0.42, 0], [0.42, 1.7], [0.3, 1.72], [0.3, 1.24], [0.16, 1.24], [0.1, 1.45], [-0.02, 1.62], [-0.18, 1.45], [-0.24, 1.24], [-0.36, 1.24], [-0.34, 0.5]]);
  // a lollipop tree, round and storybook
  CASTLE.tree = () => K3D.paint('pcCTree', 320, 448, (c, w, h) => {
    const r = P.rng(721); c.clearRect(0, 0, w, h);
    c.fillStyle = '#7a5434'; c.fillRect(w / 2 - 14, h * 0.55, 28, h * 0.45);
    c.save(); c.beginPath(); c.arc(w / 2, h * 0.36, w * 0.46, 0, Math.PI * 2); c.clip();
    P.leaves(c, w, h * 0.75, '#4f8a3e', 722, { clump: 26 });
    for (let i = 0; i < 30; i++) P.wash(c, r() * w, r() * h * 0.7, 20, r() < 0.5 ? '#7ab45a' : '#3a6e30', 0.35, r, { noEdge: true });
    for (let i = 0; i < 9; i++) { c.fillStyle = '#d84a3a'; c.beginPath(); c.arc(w * 0.15 + r() * w * 0.7, h * 0.12 + r() * h * 0.45, 7, 0, Math.PI * 2); c.fill(); }
    c.restore();
  });
  CASTLE.treeShape = (() => { const s = new T.Shape(); s.moveTo(-0.11, 0); s.lineTo(-0.11, 1.4); s.absarc(0, 2.05, 0.9, -Math.PI / 2 - 0.12, Math.PI * 1.5 + 0.12, true); s.lineTo(0.11, 1.4); s.lineTo(0.11, 0); s.closePath(); return s; })();
  CASTLE.hedge = () => K3D.paint('pcCHedge', 384, 160, (c, w, h) => { c.clearRect(0, 0, w, h); P.leaves(c, w, h, '#4a8040', 731, { clump: 22 }); const r = P.rng(732); for (let i = 0; i < 16; i++) { c.fillStyle = pick(r, ['#f4f0f0', '#e45a7a', '#f2c43c']); c.beginPath(); c.arc(r() * w, h * 0.2 + r() * h * 0.6, 5, 0, Math.PI * 2); c.fill(); } });
  CASTLE.hedgeShape = P.scallopShape(1.6, 0.7, 4, 0.3, P.rng(733));
  // a banner on a pole, pinned with a brass fastener
  CASTLE.banner = () => K3D.paint('pcBanner', 192, 448, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#5a3a24'; c.fillRect(w / 2 - 6, 0, 12, h);
    const r = P.rng(741), col = '#2f6a9a';
    c.fillStyle = col; c.beginPath(); c.moveTo(w * 0.12, h * 0.08); c.lineTo(w * 0.88, h * 0.08); c.lineTo(w * 0.88, h * 0.5); c.lineTo(w / 2, h * 0.42); c.lineTo(w * 0.12, h * 0.5); c.closePath(); c.fill();
    c.fillStyle = '#f2c14e'; for (let k = 0; k < 3; k++) { const y = h * (0.15 + k * 0.08); c.beginPath(); for (let j = 0; j < 10; j++) { const a = j * Math.PI / 5 - Math.PI / 2, rr = j % 2 ? 7 : 16; c.lineTo(w / 2 + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); }
    c.strokeStyle = 'rgba(43,33,48,0.7)'; c.lineWidth = 3; c.strokeRect(w * 0.12, h * 0.08, w * 0.76, 2); void r;
    c.fillStyle = '#d9a640'; c.beginPath(); c.arc(w / 2, h * 0.06, 10, 0, Math.PI * 2); c.fill();
  });
  CASTLE.bannerShape = P.shapeFrom([[-0.05, 0], [0.05, 0], [0.05, 1.5], [0.4, 1.5], [0.4, 2.55], [0.05, 2.75], [-0.05, 2.75], [-0.4, 2.55], [-0.4, 1.5], [-0.05, 1.5]]);
  // the sky behind the castle: a warm evening, the keep's towers and flags in silhouette
  function castleSky(i) {
    return K3D.paint('pcCSky' + i, 512, 384, (c, w, h) => {
      const r = P.rng(751 + i);
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5a7ec0'); g.addColorStop(0.6, '#9ab8d8'); g.addColorStop(1, '#f2d8a8'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 7; k++) { const x = r() * w, y = 40 + r() * h * 0.4; c.fillStyle = 'rgba(255,250,240,0.85)'; for (let q = 0; q < 5; q++) { c.beginPath(); c.arc(x + q * 22 - 44, y + Math.sin(q * 1.7) * 6, 20 + r() * 10, 0, Math.PI * 2); c.fill(); } }
      // the keep: a row of towers and a wall
      c.fillStyle = '#8a8fa8'; c.fillRect(0, h * 0.68, w, h * 0.32);
      for (let x = 0; x < w; x += 22) c.fillRect(x, h * 0.64, 12, h * 0.05);
      for (let k = 0; k < 3; k++) { const tx = w * (0.18 + k * 0.32) + (r() - 0.5) * 40, tw = 50 + r() * 30, th = h * (0.32 + r() * 0.18);
        c.fillStyle = '#7a80a0'; c.fillRect(tx - tw / 2, h - th - h * 0.1, tw, th + h * 0.1);
        c.fillStyle = '#5a6088'; c.beginPath(); c.moveTo(tx - tw / 2 - 8, h - th - h * 0.1); c.lineTo(tx, h - th - h * 0.1 - 60); c.lineTo(tx + tw / 2 + 8, h - th - h * 0.1); c.fill();
        c.fillStyle = '#ffd77a'; c.fillRect(tx - 6, h - th, 12, 18);
        c.strokeStyle = '#3a3050'; c.lineWidth = 2; c.beginPath(); c.moveTo(tx, h - th - h * 0.1 - 60); c.lineTo(tx, h - th - h * 0.1 - 90); c.stroke(); c.fillStyle = pick(r, ['#b8324a', '#d8a030']); c.beginPath(); c.moveTo(tx, h - th - h * 0.1 - 90); c.lineTo(tx + 30, h - th - h * 0.1 - 82); c.lineTo(tx, h - th - h * 0.1 - 74); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, h * 0.68, w, 4);
    });
  }
  // scatter pop-ups beside the corridor (the shared rules: nothing tall between the camera and the path)
  function scatter(st, L3, r, n, place) {
    const pw = L3.pw, pd = L3.pd;
    const routeD = (x, z) => { let d = 1e9; for (const g of L3.segs) { const t = clamp((x - g.ax) * g.dx + (z - g.az) * g.dz, 0, g.len); d = Math.min(d, Math.hypot(x - g.ax - g.dx * t, z - g.az - g.dz * t)); } return d; };
    const inGap = x => L3.def.gaps.some(([a, b]) => x > a - 0.6 && x < b + 0.6);
    const near = (x, z) => L3.pieces.some(p => p.tabs.some(t => Math.hypot(x - t.x, z - t.z) < 1.8)) || L3.marks.some(m => Math.hypot(x - m.x, z - m.z) < 1.6);
    const nearSide = (x, z) => { const s = PC.progress(L3, x, z), p = PC.pointAt(L3, s); return z > p.z + 0.5 && Math.abs(p.dx) > 0.5; };
    for (let k = 0, tries = 0; k < n && tries < n * 18; tries++) {
      const x = (r() * 2 - 1) * (pw - 0.8), z = (r() - 0.5) * (pd - 1.2), d = routeD(x, z);
      if (d < HALF + 0.45 || inGap(x) || Math.abs(x) < 0.9 || near(x, z)) continue;
      if (L3.dogEar && x > pw - 7.5 && z > pd / 2 - 7.5) continue;
      if (place(x, z, d, nearSide(x, z) || z > pd / 2 - 3) !== false) k++;
    }
    return routeD;
  }
  function backdrop(K, st, L3, sc, tex, n = 4, o = {}) {
    const pw = L3.pw, pd = L3.pd, panels = Math.round(pw * 2 / 8.8);
    for (let i = 0; i < panels; i++) {
      const x0 = -pw + i * (pw * 2 / panels), w = pw * 2 / panels - 0.05, xm = x0 + w / 2, ht = (o.h || 4.4);
      const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, ht + (i % 2) * 0.5); s.quadraticCurveTo(0, ht + 1.6 + (i % 3) * 0.4, -w / 2, ht + ((i + 1) % 2) * 0.5); s.closePath();
      const card = P.card(s, { tex: tex(i % n), depth: 0.05, inkW: 1 });
      const g = new T.Group(); g.position.set(xm, 0, -pd / 2 + 0.35); g.add(card);
      if (o.each) o.each(g, i, panels, w);
      sc.pops.push({ obj: g, x: xm, ch: chunk(st, xm), delay: 0.1, back: true });
      K.add(g);
    }
  }
  function castleScenery(K, st, L3, sc) {
    const fam = {
      tower: family(K, 'ctower', CASTLE.towerShape, CASTLE.tower(), { ink: '#3a3040' }),
      wall: family(K, 'cwall', CASTLE.wallShape, CASTLE.wall(), { ink: '#3a3040' }),
      knight: family(K, 'cknight', CASTLE.knightShape, CASTLE.knight(), { inkW: 0.8 }),
      tree: family(K, 'ctree', CASTLE.treeShape, CASTLE.tree(), { ink: '#1f3a1a' }),
      hedge: family(K, 'chedge', CASTLE.hedgeShape, CASTLE.hedge(), { ink: '#1f3a1a', inkW: 0.8 }),
      banner: family(K, 'cbanner', CASTLE.bannerShape, CASTLE.banner(), { inkW: 0.8 }),
    };
    const r = P.rng(800 + L3.k);
    const vfold = (f, x, z, s, d = 0) => { const rot = r() * Math.PI; f.add(x, z, rot, s, chunk(st, x), 0.05 + r() * 0.2 + d); f.add(x, z, rot + Math.PI / 2, s, chunk(st, x), 0.11 + r() * 0.2 + d); };
    const face = (f, x, z, s, d = 0) => f.add(x, z, (r() - 0.5) * 0.5, s, chunk(st, x), 0.05 + r() * 0.15 + d);
    const routeD = scatter(st, L3, r, 240, (x, z, d, front) => {
      const k = r();
      if (front) { if (k < 0.6) vfold(fam.hedge, x, z, 0.7 + r() * 0.3); else if (k < 0.85) face(fam.knight, x, z, 0.8); else return false; return; }
      if (d < HALF + 1.4) { if (k < 0.45) face(fam.banner, x, z, 0.9 + r() * 0.2); else if (k < 0.75) face(fam.knight, x, z, 0.95); else vfold(fam.hedge, x, z, 0.8); return; }
      // beside the dash the camera runs low behind the pair: only low hedges there, so no tower stands between it and them
      if (L3.swing && x > L3.swing[0] - 2 && x < L3.swing[1] + 1 && d < HALF + 4.5) { vfold(fam.hedge, x, z, 0.8 + r() * 0.2); return; }
      if (k < 0.2) vfold(fam.tree, x, z, 0.8 + r() * 0.25);
      else if (k < 0.5) face(fam.tower, x, z, 0.9 + r() * 0.35);
      else if (k < 0.75) face(fam.wall, x, z, 0.85 + r() * 0.2);
      else vfold(fam.hedge, x, z, 0.9);
    });
    // the curtain wall along the far edge: a line of walls and towers (behind the corridor everywhere)
    for (let x = -L3.pw + 1.5; x < L3.pw - 1; x += 3.1) {
      const z = -L3.pd / 2 + 1.6;
      if (routeD(x, z) < HALF + 1) continue;
      if (Math.round(x / 3.1) % 3 === 0) fam.tower.add(x, z, 0, 1.25, chunk(st, x), 0.08); else fam.wall.add(x, z, 0, 1.05, chunk(st, x), 0.05);
    }
    for (const f of Object.values(fam)) f.done();
    sc.fams.push(...Object.values(fam));
    backdrop(K, st, L3, sc, castleSky);
  }

  /* ================= the Stormy Sea ================= */
  // a stormy sea printed all over the spread (deep teal, rows of curling white crests, spray), with a wooden
  // boardwalk along the route: planks across the way, nail heads, tar, sea-wet patches
  function paintSea(L3, left) {
    return function (c, S, r, w, h) {
      const ox = left ? -L3.pw : 0, X = x => (x - ox) * S, Z = z => (z + L3.pd / 2) * S, pts = L3.route, W = HALF * 2 * S;
      const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#1a3a4c'); bg.addColorStop(0.5, '#22506a'); bg.addColorStop(1, '#2c6478');
      c.fillStyle = bg; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 140; i++) P.wash(c, r() * w, r() * h, S * (2 + r() * 4), pick(r, ['#163446', '#2c6680', '#1e4a5e', '#3a7488']), 0.18, r, { noEdge: true });
      // rows of curling crests (printed), denser toward the near edge
      for (let y = S * 0.6; y < h; y += S * (0.5 + r() * 0.25)) {
        let x = -r() * S * 2; const a = 0.35 + (y / h) * 0.4;
        while (x < w) { const l = S * (0.8 + r() * 1.4); c.strokeStyle = 'rgba(230,245,250,' + a * (0.5 + r() * 0.5) + ')'; c.lineWidth = 2 + r() * 2; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l * 0.5, y - S * 0.22, x + l, y); c.stroke();
          c.fillStyle = 'rgba(240,250,255,' + a * 0.6 + ')'; c.beginPath(); c.arc(x + l, y - 2, 3 + r() * 3, 0, Math.PI * 2); c.fill();
          c.strokeStyle = 'rgba(10,30,40,0.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 4, y + 5); c.quadraticCurveTo(x + l * 0.5, y - S * 0.12, x + l - 4, y + 5); c.stroke();
          x += l + S * (0.3 + r() * 1.2); }
      }
      for (let i = 0; i < 2600; i++) { c.fillStyle = 'rgba(230,245,255,' + (0.15 + r() * 0.35) + ')'; c.beginPath(); c.arc(r() * w, r() * h, 0.8 + r() * 1.8, 0, Math.PI * 2); c.fill(); }
      // faint printed fish under the waves
      for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h, s = S * (0.25 + r() * 0.2); c.fillStyle = 'rgba(120,180,190,0.2)'; c.beginPath(); c.ellipse(x, y, s, s * 0.4, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(x - s, y); c.lineTo(x - s * 1.5, y - s * 0.4); c.lineTo(x - s * 1.5, y + s * 0.4); c.fill(); }
      // the boardwalk: posts and shadow, then planks across the way
      c.lineCap = 'butt'; c.lineJoin = 'round';
      for (const [wd, col] of [[1.16, 'rgba(5,20,30,0.45)'], [1.04, '#4a3424']]) { c.strokeStyle = col; c.lineWidth = W * wd; routePath(c, pts, X, Z); c.stroke(); }
      c.save(); clipCorridor(c, pts, X, Z, 1.0);
      eachRun(pts, X, Z, (at, len, ang) => {
        for (let d = 0; d < len; d += 0.46) {
          const [x, y] = at((d + 0.23) / len, 0), base = pick(r, ['#a07a52', '#8e6a46', '#b08a5e', '#9a7650', '#86643e']);
          c.save(); c.translate(x, y); c.rotate(ang);
          c.fillStyle = base; c.fillRect(-S * 0.21, -W / 2, S * 0.42, W);
          c.fillStyle = 'rgba(255,240,210,0.14)'; c.fillRect(-S * 0.21, -W / 2, S * 0.07, W);
          c.strokeStyle = 'rgba(60,40,24,0.35)'; c.lineWidth = 1.2; for (let q = 0; q < 4; q++) { const yy = -W / 2 + r() * W; c.beginPath(); c.moveTo(-S * 0.18, yy); c.lineTo(S * 0.18, yy + (r() - 0.5) * 8); c.stroke(); }
          if (r() < 0.3) { c.fillStyle = 'rgba(40,70,90,0.25)'; c.beginPath(); c.ellipse((r() - 0.5) * S * 0.2, (r() - 0.5) * W * 0.6, S * 0.18, S * 0.4, 0, 0, Math.PI * 2); c.fill(); }
          c.fillStyle = 'rgba(40,30,30,0.8)'; for (const sy of [-W * 0.42, W * 0.42]) { c.beginPath(); c.arc(0, sy, 2.6, 0, Math.PI * 2); c.fill(); }
          c.strokeStyle = 'rgba(25,18,12,0.85)'; c.lineWidth = 3; c.beginPath(); c.moveTo(S * 0.21, -W / 2); c.lineTo(S * 0.21, W / 2); c.stroke();
          c.restore();
        }
        // a coil of rope, a bucket here and there (printed)
        if (len > 6 && r() < 0.6) { const [x, y] = at(0.3 + r() * 0.4, (r() < 0.5 ? -1 : 1) * HALF * 0.62); c.strokeStyle = '#d8c08a'; c.lineWidth = 4; for (let q = 0; q < 4; q++) { c.beginPath(); c.arc(x, y, S * (0.08 + q * 0.06), 0, Math.PI * 2); c.stroke(); } }
      });
      c.restore();
      // the boardwalk's edge beams
      for (const sd of [-1, 1]) { c.strokeStyle = '#5a4030'; c.lineWidth = S * 0.16; routePath(c, PC.offset(pts, sd * HALF * 0.98), X, Z); c.stroke(); c.strokeStyle = 'rgba(255,240,210,0.15)'; c.lineWidth = 3; routePath(c, PC.offset(pts, sd * HALF * 0.94), X, Z); c.stroke(); }
      fingerText(c, L3, X, Z, S, r, 'rgba(28,18,12,0.95)');
      finish(c, L3, S, w, h, left, X, Z, r, 'Chapter Four: The Stormy Sea', '...and the waves were as tall as houses.', 'rgba(236,246,250,0.9)', '0,10,20');
    };
  }
  const SEA = {};
  // a paper wave: a deep blue body curling into a white crest
  SEA.wave = () => K3D.paint('pcSeaWave', 512, 256, (c, w, h) => {
    const r = P.rng(901); c.clearRect(0, 0, w, h);
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5aa0c8'); g.addColorStop(0.5, '#2e6e98'); g.addColorStop(1, '#1d4c6c'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) P.wash(c, r() * w, r() * h, 30, r() < 0.5 ? '#3a86b0' : '#1a4466', 0.3, r, { noEdge: true });
    c.strokeStyle = 'rgba(230,248,255,0.55)'; c.lineWidth = 3; for (let k = 0; k < 6; k++) { c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, 60 + k * 30 + Math.sin(x * 0.04 + k) * 6); c.stroke(); }
    c.fillStyle = '#f4fbff'; c.fillRect(0, 0, w, 26); for (let x = 0; x < w; x += 18) { c.beginPath(); c.arc(x + 9, 26, 10, 0, Math.PI); c.fill(); }
  });
  SEA.waveShape = (n = 4, wdt = 5) => { const s = new T.Shape(), bw = wdt / n; s.moveTo(-wdt / 2, 0); for (let k = 0; k < n; k++) { const x0 = -wdt / 2 + k * bw; s.lineTo(x0, 0.7); s.bezierCurveTo(x0 + bw * 0.2, 1.5, x0 + bw * 0.8, 1.5, x0 + bw * 0.95, 1.05); s.quadraticCurveTo(x0 + bw * 0.75, 0.95, x0 + bw * 0.8, 1.2); } s.lineTo(wdt / 2, 0); s.closePath(); return s; };
  SEA.rock = () => K3D.paint('pcRock', 256, 192, (c, w, h) => { const r = P.rng(911); c.clearRect(0, 0, w, h); c.fillStyle = '#5a5e66'; c.fillRect(0, 0, w, h); for (let i = 0; i < 30; i++) P.wash(c, r() * w, r() * h, 24, r() < 0.5 ? '#7a7e86' : '#3a3e46', 0.35, r, { noEdge: true }); c.fillStyle = 'rgba(240,250,255,0.9)'; for (let x = 0; x < w; x += 14) { c.beginPath(); c.arc(x, h - 8 - r() * 10, 8 + r() * 6, 0, Math.PI * 2); c.fill(); } });
  SEA.rockShape = P.shapeFrom([[-0.8, 0], [0.85, 0], [0.7, 0.5], [0.4, 0.85], [0.05, 0.95], [-0.35, 0.75], [-0.65, 0.45]]);
  SEA.gull = () => K3D.paint('pcGull', 256, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#f4f4f0'; c.beginPath(); c.moveTo(10, 60); c.quadraticCurveTo(70, 10, 128, 64); c.quadraticCurveTo(186, 10, 246, 60); c.quadraticCurveTo(186, 40, 128, 84); c.quadraticCurveTo(70, 40, 10, 60); c.fill(); c.fillStyle = '#2b2130'; c.fillRect(124, 60, 8, 8); c.fillStyle = '#e8a83a'; c.beginPath(); c.moveTo(132, 68); c.lineTo(146, 72); c.lineTo(132, 76); c.fill(); });
  SEA.gullShape = P.shapeFrom([[-0.6, 0.15], [-0.3, 0.38], [0, 0.18], [0.3, 0.38], [0.6, 0.15], [0.3, 0.26], [0, 0.04], [-0.3, 0.26]]);
  SEA.buoy = () => K3D.paint('pcBuoy', 128, 256, (c, w, h) => { c.clearRect(0, 0, w, h); for (let y = 0; y < h; y += 48) { c.fillStyle = '#d4343a'; c.fillRect(0, y, w, 24); c.fillStyle = '#fbf6ea'; c.fillRect(0, y + 24, w, 24); } c.fillStyle = '#ffd77a'; c.beginPath(); c.arc(w / 2, 16, 14, 0, Math.PI * 2); c.fill(); });
  SEA.buoyShape = P.shapeFrom([[-0.3, 0], [0.3, 0], [0.22, 0.9], [0.08, 1.0], [0.08, 1.2], [-0.08, 1.2], [-0.08, 1.0], [-0.22, 0.9]]);
  function stormSky(i) {
    return K3D.paint('pcStorm' + i, 512, 384, (c, w, h) => {
      const r = P.rng(931 + i);
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1e2434'); g.addColorStop(0.7, '#3a4660'); g.addColorStop(1, '#58708a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 14; k++) { const x = r() * w, y = r() * h * 0.6; c.fillStyle = pick(r, ['rgba(70,80,100,0.8)', 'rgba(40,46,62,0.85)', 'rgba(90,100,120,0.6)']); for (let q = 0; q < 6; q++) { c.beginPath(); c.arc(x + q * 26 - 70, y + Math.sin(q * 1.3) * 10, 26 + r() * 16, 0, Math.PI * 2); c.fill(); } }
      c.strokeStyle = 'rgba(200,215,235,0.35)'; c.lineWidth = 1.5; for (let k = 0; k < 120; k++) { const x = r() * w, y = r() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 8, y + 26); c.stroke(); }
      // the far sea along the bottom, a ship on the horizon on one panel
      c.fillStyle = '#2a4a5e'; c.fillRect(0, h * 0.78, w, h * 0.22); c.strokeStyle = 'rgba(230,245,250,0.6)'; c.lineWidth = 2; for (let x = 0; x < w; x += 30) { c.beginPath(); c.arc(x, h * 0.8, 12, Math.PI, 0); c.stroke(); }
      if (i === 1) { c.fillStyle = '#1a2430'; c.beginPath(); c.moveTo(w * 0.6, h * 0.78); c.lineTo(w * 0.72, h * 0.78); c.lineTo(w * 0.7, h * 0.74); c.lineTo(w * 0.62, h * 0.74); c.fill(); c.fillRect(w * 0.66, h * 0.6, 3, h * 0.14); c.beginPath(); c.moveTo(w * 0.665, h * 0.6); c.lineTo(w * 0.7, h * 0.7); c.lineTo(w * 0.665, h * 0.7); c.fill(); }
    });
  }
  function seaScenery(K, st, L3, sc) {
    const fam = {
      wave: family(K, 'swave', SEA.waveShape(3, 3), SEA.wave(), { ink: '#0e2a3a' }),
      rock: family(K, 'srock', SEA.rockShape, SEA.rock(), { ink: '#1a1e26' }),
      buoy: family(K, 'sbuoy', SEA.buoyShape, SEA.buoy(), { inkW: 0.8 }),
    };
    const r = P.rng(950 + L3.k);
    const face = (f, x, z, s, d = 0) => f.add(x, z, (r() - 0.5) * 0.4, s, chunk(st, x), 0.05 + r() * 0.15 + d);
    scatter(st, L3, r, 170, (x, z, d, front) => {
      const k = r();
      if (front) { if (k < 0.5) face(fam.rock, x, z, 0.6 + r() * 0.4); else if (k < 0.62) face(fam.buoy, x, z, 0.8); else return false; return; }
      if (k < 0.55) face(fam.wave, x, z, 0.8 + r() * 0.5); else if (k < 0.85) face(fam.rock, x, z, 0.8 + r() * 0.6); else face(fam.buoy, x, z, 0.9);
    });
    for (const f of Object.values(fam)) f.done();
    sc.fams.push(...Object.values(fam));
    // rows of big waves on slots along the far edge, sliding against each other
    const rows = [];
    const wtex = SEA.wave();
    for (let k = 0; k < 3; k++) {
      const z = -L3.pd / 2 + 1.2 + k * 0.9;
      for (let x = -L3.pw + 3; x < L3.pw - 2; x += 7.5) {
        const m = P.card(SEA.waveShape(5, 7.2), { tex: wtex, depth: 0.04, inkW: 0.9, ink: '#0e2a3a' });
        const g = new T.Group(); g.position.set(x + k * 2.4, 0, z); g.add(m); m.scale.setScalar(0.75 + k * 0.12);
        K.add(g); pop(sc, st, g, x, 0.1 + k * 0.05, true); rows.push({ m, k, ph: x * 0.3 });
      }
    }
    // the lighthouse by the beam's gap: red and white stripes, a lamp room, a turning light
    const wh = L3.pieces.find(p => p.kind === 'wheel');
    const lh = new T.Group(), lx = wh ? (wh.x0 + wh.x1) / 2 : 22, lz = -L3.pd / 2 + 2.6;
    lh.position.set(lx, 0, lz);
    const stripes = K3D.paint('pcLHStripes', 128, 512, (c, w, h) => { for (let y = 0; y < h; y += 128) { c.fillStyle = '#e8eef0'; c.fillRect(0, y, w, 64); c.fillStyle = '#c83a3a'; c.fillRect(0, y + 64, w, 64); } c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(w * 0.6, 0, w * 0.4, h); }, { repeat: true });
    const tower = K3D.mesh(new T.CylinderGeometry(0.9, 1.35, 6.5, 20).translate(0, 3.25, 0), toon('#ffffff', { map: stripes }), { ink: INK });
    lh.add(tower);
    const gallery = K3D.mesh(new T.CylinderGeometry(1.25, 1.25, 0.25, 20).translate(0, 6.6, 0), toon('#3a3a44'), { ink: INK }); lh.add(gallery);
    const lampM = K3D.flat('#ffe9a0'); const lamp = new T.Mesh(new T.CylinderGeometry(0.62, 0.62, 1.0, 16).translate(0, 7.25, 0), lampM); lh.add(lamp);
    const cap = K3D.mesh(new T.ConeGeometry(0.95, 0.9, 20).translate(0, 8.2, 0), toon('#c83a3a'), { ink: INK }); lh.add(cap);
    const beamTex = K3D.paint('pcBeamCone', 256, 64, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,240,170,0.9)'); g.addColorStop(1, 'rgba(255,240,170,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    const sweep = new T.Mesh(new T.PlaneGeometry(14, 2.2).translate(7, 0, 0), K3D.flat('#ffffff', { map: beamTex, transparent: true, depthWrite: false, add: true, side: T.DoubleSide }));
    sweep.position.y = 7.25; lh.add(sweep);
    const rocks = K3D.mesh(new T.DodecahedronGeometry(1.7, 0).scale(1.2, 0.45, 1).translate(0, 0.1, 0), toon('#5a5e66'), { ink: INK }); lh.add(rocks);
    K.add(lh); pop(sc, st, lh, lx, 0.12, true);
    // gulls wheeling over the sea
    const gtex = SEA.gull(), gulls = [];
    for (let i = 0; i < 6; i++) { const m = P.card(SEA.gullShape, { tex: gtex, depth: 0.02, inkW: 0.6, cast: false }); m.scale.setScalar(1.3); K.add(m); gulls.push({ m, x: -36 + i * 14 + r() * 4, z: -8 + r() * 4, ph: r() * 6 }); }
    sc.upd.push({ update(st2) {
      const t = G.clock;
      for (const q of rows) q.m.position.x = Math.sin(t * 0.9 + q.ph + q.k * 1.7) * 0.55 * (q.k % 2 ? -1 : 1);
      sweep.rotation.y = t * 0.8; lampM.color.setScalar(1); lampM.color.set(wh && wh.e > 0.05 ? '#fff6c0' : '#ffe9a0');
      for (const q of gulls) { q.m.position.set(q.x + Math.sin(t * 0.3 + q.ph) * 3, 6 + Math.sin(t * 0.7 + q.ph) * 0.8, q.z + Math.cos(t * 0.3 + q.ph) * 1.5); q.m.rotation.set(0, Math.sin(t * 0.3 + q.ph) * 0.5, Math.sin(t * 2.2 + q.ph) * 0.25); q.m.visible = q.x > st2.rollX; }
    } });
    backdrop(K, st, L3, sc, stormSky, 4, { h: 4.8 });
  }

  /* ================= The End ================= */
  // marbled endpapers (combed swirls of blue, red and gold on cream), a ruled border, a golden ribbon path, and a huge
  // printed "The End" on the far half of the right-hand page
  function paintEnd(L3, left) {
    return function (c, S, r, w, h) {
      const ox = left ? -L3.pw : 0, X = x => (x - ox) * S, Z = z => (z + L3.pd / 2) * S, pts = L3.route, W = HALF * 2 * S;
      c.fillStyle = '#efe4cc'; c.fillRect(0, 0, w, h);
      // marbling: drops of colour combed into waves
      const cols = ['rgba(46,86,140,0.55)', 'rgba(170,52,60,0.5)', 'rgba(214,162,62,0.55)', 'rgba(40,110,110,0.45)', 'rgba(250,244,230,0.7)'];
      for (let y = -S; y < h + S; y += S * 0.2) {
        const col = cols[Math.floor(r() * cols.length)], wv = S * (0.25 + r() * 0.3), f = 0.004 + r() * 0.004, ph = r() * 6;
        c.strokeStyle = col; c.lineWidth = S * (0.06 + r() * 0.12); c.beginPath();
        for (let x = 0; x <= w; x += 10) c.lineTo(x, y + Math.sin(x * f + ph) * wv + Math.sin(x * f * 3.1 + ph * 2) * wv * 0.3);
        c.stroke();
      }
      // a comb pulled through: little peacock eyes
      for (let i = 0; i < 300; i++) { const x = r() * w, y = r() * h, s = S * (0.08 + r() * 0.12); c.strokeStyle = cols[Math.floor(r() * 4)]; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, s, s * 0.55, 0, 0, Math.PI * 2); c.stroke(); c.fillStyle = cols[Math.floor(r() * 4)]; c.beginPath(); c.arc(x, y, s * 0.3, 0, Math.PI * 2); c.fill(); }
      // a soft paper wash over the marbling so the path and the words stand out
      c.fillStyle = 'rgba(244,236,218,0.35)'; c.fillRect(0, 0, w, h);
      // the ruled border
      c.strokeStyle = 'rgba(120,80,40,0.7)'; c.lineWidth = 6; c.strokeRect(S * 1, S * 1, w - S * 2, h - S * 2); c.lineWidth = 2; c.strokeRect(S * 1.3, S * 1.3, w - S * 2.6, h - S * 2.6);
      for (const [x, y] of [[S * 1.15, S * 1.15], [w - S * 1.15, S * 1.15], [S * 1.15, h - S * 1.15], [w - S * 1.15, h - S * 1.15]]) { c.fillStyle = '#c8962e'; c.beginPath(); c.arc(x, y, S * 0.3, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(80,50,20,0.8)'; c.lineWidth = 2; c.stroke(); }
      // the ribbon path: cream with gold edges and printed stars, a stitched middle line
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (const [wd, col] of [[1.12, 'rgba(60,40,20,0.3)'], [1.04, '#c8962e'], [0.94, '#f6eedb']]) { c.strokeStyle = col; c.lineWidth = W * wd; routePath(c, pts, X, Z); c.stroke(); }
      c.save(); clipCorridor(c, pts, X, Z, 0.94);
      for (let i = 0; i < 3000; i++) { c.fillStyle = r() < 0.5 ? 'rgba(200,170,120,0.25)' : 'rgba(255,255,255,0.35)'; c.fillRect(r() * w, r() * h, 2, 2); }
      eachRun(pts, X, Z, (at, len) => {
        for (let d = 0.6; d < len; d += 1.1) { const [x, y] = at(d / len, (Math.round(d) % 2 ? 1 : -1) * HALF * 0.55), s = S * 0.14; c.fillStyle = 'rgba(200,150,46,0.6)'; c.beginPath(); for (let j = 0; j < 10; j++) { const a = j * Math.PI / 5 - Math.PI / 2, rr = j % 2 ? s * 0.45 : s; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); }
      });
      c.restore();
      c.setLineDash([S * 0.25, S * 0.18]); c.strokeStyle = 'rgba(160,110,40,0.55)'; c.lineWidth = 3; routePath(c, pts, X, Z); c.stroke(); c.setLineDash([]);
      for (const sd of [-1, 1]) { c.strokeStyle = 'rgba(80,50,20,0.55)'; c.lineWidth = 2; routePath(c, PC.offset(pts, sd * HALF * 0.97), X, Z); c.stroke(); }
      // "The End", huge, under its twin tabs
      if (!left) {
        c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = 'italic bold ' + Math.round(S * 3.6) + 'px Georgia, "DejaVu Serif", serif';
        c.fillStyle = 'rgba(60,40,30,0.18)'; c.fillText('The End', X(28) + 8, Z(-8.2) + 10);
        c.fillStyle = '#3b2a30'; c.fillText('The End', X(28), Z(-8.2));
        c.strokeStyle = '#c8962e'; c.lineWidth = 4; c.beginPath(); c.moveTo(X(18), Z(-6)); c.quadraticCurveTo(X(28), Z(-5.2), X(38), Z(-6)); c.stroke();
        c.restore();
      }
      finish(c, L3, S, w, h, left, X, Z, r, 'The Last Page', '...and they all lived happily ever after.', 'rgba(70,46,30,0.85)', '60,40,20');
    };
  }
  function endScenery(K, st, L3, sc) {
    // nearly bare: a few cut-out stars on wires along the far edge, waiting for the night sky
    const r = P.rng(1001);
    const starShape = (() => { const s = new T.Shape(); for (let j = 0; j < 10; j++) { const a = j * Math.PI / 5 + Math.PI / 2, rr = j % 2 ? 0.2 : 0.48; j ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } s.closePath(); return s; })();
    const starTex = K3D.paint('pcStarCard', 128, 128, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); g.addColorStop(0, '#fff6c8'); g.addColorStop(1, '#e8b84a'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    const finale = { stars: [], sky: [], village: [], moon: null };
    // the night sky: tall panels that rise along the far edge when The End is pulled
    const nightTex = i => K3D.paint('pcNight' + i, 512, 512, (c, w, h) => {
      const rr = P.rng(1011 + i);
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0f1638'); g.addColorStop(1, '#2a3a70'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 30; k++) P.wash(c, rr() * w, rr() * h, 40, rr() < 0.5 ? '#1a2450' : '#34447a', 0.3, rr, { noEdge: true });
      for (let k = 0; k < 120; k++) { c.fillStyle = 'rgba(255,248,220,' + (0.4 + rr() * 0.6) + ')'; c.beginPath(); c.arc(rr() * w, rr() * h * 0.8, 1 + rr() * 2.2, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = 'rgba(255,240,200,0.35)'; c.font = 'italic 26px Georgia, serif'; if (i === 1) c.fillText('Goodnight, Pip. Goodnight, Bo.', 30, 60);
    });
    for (let i = 0; i < 8; i++) {
      const w = 11, x = -L3.pw + 5.5 + i * 11, s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, 8.5 + (i % 2)); s.quadraticCurveTo(0, 10.5, -w / 2, 8.5 + ((i + 1) % 2)); s.closePath();
      const card = P.card(s, { tex: nightTex(i % 3), depth: 0.05, inkW: 1 });
      const g = new T.Group(); g.position.set(x, 0, -L3.pd / 2 + 0.4); g.add(card); g.visible = false; K.add(g); finale.sky.push({ g, d: Math.abs(x - 28) * 0.02 });
    }
    // the moon
    { const g = new T.Group(); const moon = new T.Mesh(new T.CircleGeometry(2.2, 48), K3D.flat('#fff2b8')); const glow = new T.Mesh(new T.CircleGeometry(4.2, 48), K3D.flat('#fff2b8', { transparent: true, opacity: 0.22, depthWrite: false, add: true }));
      const bite = new T.Mesh(new T.CircleGeometry(2.0, 48), K3D.flat('#16204a')); bite.position.set(0.9, 0.5, 0.01);
      g.add(glow); g.add(moon); g.add(bite); g.position.set(30, 7.6, -L3.pd / 2 + 0.6); g.visible = false; K.add(g); finale.moon = g; }
    // stars on threads, dropping from above
    for (let i = 0; i < 22; i++) {
      const m = P.card(starShape, { tex: starTex, depth: 0.03, inkW: 0.7, ink: '#6a4a14', cast: false });
      const x = 4 + r() * 38, z = -10 + r() * 7, y = 4 + r() * 4.5, sz = 0.7 + r() * 0.7;
      const thread = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 12, 4).translate(0, 6, 0), K3D.flat('#e8e0c8'));
      const g = new T.Group(); g.add(m); g.add(thread); m.scale.setScalar(sz); g.position.set(x, y + 12, z); g.visible = false; K.add(g); finale.stars.push({ g, y, d: r() * 0.8, ph: r() * 6 });
    }
    // a sleeping village: little houses with lit windows
    const houseTex = K3D.paint('pcHouse', 256, 256, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.fillStyle = '#3a3460'; c.fillRect(30, 110, 196, 146); c.fillStyle = '#5a3a5a'; c.beginPath(); c.moveTo(14, 116); c.lineTo(128, 20); c.lineTo(242, 116); c.fill();
      c.fillStyle = '#ffd77a'; c.fillRect(60, 140, 40, 40); c.fillRect(156, 140, 40, 40); c.fillStyle = '#2b2130'; c.fillRect(110, 190, 36, 66); c.strokeStyle = '#2b2130'; c.lineWidth = 4; c.strokeRect(60, 140, 40, 40); c.strokeRect(156, 140, 40, 40);
      c.fillStyle = '#2a2448'; c.fillRect(180, 40, 22, 50);
    });
    const houseShape = P.shapeFrom([[-0.9, 0], [0.9, 0], [0.9, 1.0], [1.0, 1.0], [0, 1.85], [-1.0, 1.0], [-0.9, 1.0]]);
    for (let i = 0; i < 9; i++) { const m = P.card(houseShape, { tex: houseTex, depth: 0.04, inkW: 0.8 }); const x = 6 + i * 4.2 + r(), z = -10.7 + (i % 2) * 0.4, sz = 0.8 + r() * 0.5; m.scale.setScalar(sz); m.position.set(x, 0, z); m.visible = false; K.add(m); finale.village.push({ m, d: 0.4 + i * 0.06 }); }
    // the finale's timing: the sky rises, the stars drop on their threads, the village pops up, the lamp dims,
    // the hand lets go and slides away
    const sun0 = K.sun.intensity, amb0 = K.amb.intensity;
    sc.upd.push({ update(st2, dt, K2) {
      const e = st2.ending, t = e ? e.t : -1;
      for (const s of finale.sky) { const k = clamp((t - s.d) / 0.6, 0, 1); s.g.visible = k > 0; s.g.rotation.x = (1 - kit.backOut(Math.max(0.001, k))) * Math.PI / 2; s.g.scale.z = Math.max(0.02, k); }
      if (finale.moon) { const k = clamp((t - 0.5) / 0.8, 0, 1); finale.moon.visible = k > 0; finale.moon.position.y = 4 + smooth(k) * 3.6; }
      for (const s of finale.stars) { const k = clamp((t - 0.6 - s.d) / 0.7, 0, 1); s.g.visible = k > 0; s.g.position.y = s.y + 12 * (1 - kit.backOut(Math.max(0.001, k))); s.g.rotation.y = Math.sin(G.clock * 1.4 + s.ph) * 0.5; }
      for (const s of finale.village) { const k = clamp((t - s.d) / 0.4, 0, 1); s.m.visible = k > 0; s.m.rotation.x = -(1 - kit.backOut(Math.max(0.001, k))) * Math.PI / 2; }
      const dim = e ? smooth(clamp((t - 0.8) / 1.6, 0, 1)) : 0;
      K2.sun.intensity = sun0 * (1 - dim * 0.7); K2.amb.intensity = amb0 * (1 - dim * 0.45);
      const ro = sc.roll; if (ro && e) { const k = smooth(clamp((t - 1.0) / 1.6, 0, 1)); ro.hand.position.y = k * 9; ro.hand.position.x = -k * 6; }
    } });
  }

  /* ================= the machinery ================= */
  const iron = () => mat('pcIron', '#4a4e58');
  // a flap across the corridor: a portcullis in a gatehouse, a great wave, a storybook door
  art.pieces.flap = (K, st, pc, sc) => {
    const g = new T.Group(); g.position.set(pc.x, 0, pc.z); K.add(g); pop(sc, st, g, pc.x, 0.05);
    const D = HALF * 2 + 0.3, side = (z, wdt, hgt, m) => { const b = K3D.mesh(new T.BoxGeometry(0.9, hgt, wdt).translate(0, hgt / 2, 0), m, { ink: INK }); b.position.z = z; g.add(b); return b; };
    let move;
    if (pc.look === 'portcullis') {
      const stone = K3D.mat('pcGateStone', () => toon('#ffffff', { map: CASTLE.wall() }));
      side(-D / 2 - 0.55, 1.1, 5.2, stone); side(D / 2 + 0.55, 1.1, 5.2, stone);
      const lintel = K3D.mesh(new T.BoxGeometry(1.0, 1.0, D + 2.2).translate(0, 5.0, 0), stone, { ink: INK }); g.add(lintel);
      for (let k = 0; k < 7; k++) { const cr = K3D.mesh(K3D.geo('pcCrenel', () => new T.BoxGeometry(1.0, 0.45, 0.45)), stone, { ink: INK }); cr.position.set(0, 5.72, -D / 2 - 0.8 + k * (D + 1.6) / 6); g.add(cr); }
      const grate = new T.Group(); g.add(grate);
      for (let k = 0; k < 9; k++) { const bar = K3D.mesh(K3D.geo('pcBarV', () => new T.BoxGeometry(0.12, 4.6, 0.12).translate(0, 2.3, 0)), iron(), { ink: INK, inkW: 0.6 }); bar.position.z = -D / 2 + 0.25 + k * (D - 0.5) / 8; grate.add(bar); const sp = K3D.mesh(K3D.geo('pcSpike', () => new T.ConeGeometry(0.1, 0.3, 6).rotateX(Math.PI)), iron(), { ink: INK, inkW: 0.5 }); sp.position.set(0, -0.12, bar.position.z); grate.add(sp); }
      for (let k = 0; k < 5; k++) { const bar = K3D.mesh(K3D.geo('pcBarH', () => new T.BoxGeometry(0.14, 0.12, D)), iron(), { ink: INK, inkW: 0.6 }); bar.position.y = 0.5 + k * 0.95; grate.add(bar); }
      move = e => { grate.position.y = smooth(e) * 4.1; };
    } else if (pc.look === 'wave') {
      const rockM = K3D.mat('pcRockM', () => toon('#ffffff', { map: SEA.rock() }));
      // a tall rock on the far side carries the wave's hinge; the near side (the camera's) keeps low
      side(-D / 2 - 0.55, 1.1, 4.8, rockM); side(D / 2 + 0.55, 1.1, 1.1, rockM);
      const beam = K3D.mesh(new T.CylinderGeometry(0.14, 0.14, D + 1.2, 10).rotateX(Math.PI / 2).translate(0, 4.6, -0.6), mat('pcPost', '#8a5a34'), { ink: INK, inkW: 0.7 }); g.add(beam);
      const hinge = new T.Group(); hinge.position.y = 4.6; g.add(hinge);
      const wave = P.card(SEA.waveShape(3, D + 0.3), { tex: SEA.wave(), depth: 0.06, inkW: 1, ink: '#0e2a3a' });
      wave.rotation.y = Math.PI / 2; wave.scale.y = 3.0; wave.position.y = -4.6; hinge.add(wave);
      move = e => { hinge.rotation.z = smooth(e) * 1.5; };
    } else {
      // a door in a little wall: posts, a lintel, a round-topped plank door with a brass knob
      const wood = mat('pcPost', '#8a5a34');
      side(-D / 2 - 0.4, 0.8, 4.6, wood); side(D / 2 + 0.4, 0.8, 4.6, wood);
      const lintel = K3D.mesh(new T.BoxGeometry(0.9, 0.7, D + 1.6).translate(0, 4.6, 0), wood, { ink: INK }); g.add(lintel);
      const doorTex = K3D.paint('pcDoor', 256, 512, (c, w, h) => { for (let x = 0; x < w; x += 42) { c.fillStyle = mixHex('#6a3a5a', '#7a4a6a', (x / w)); c.fillRect(x, 0, 40, h); c.strokeStyle = 'rgba(30,15,25,0.6)'; c.lineWidth = 3; c.strokeRect(x, 0, 40, h); } c.fillStyle = '#d9a640'; c.beginPath(); c.arc(w * 0.82, h * 0.55, 14, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#3a2a20'; c.lineWidth = 8; c.strokeRect(10, h * 0.2, w - 20, 10); c.strokeRect(10, h * 0.8, w - 20, 10); });
      const hinge = new T.Group(); hinge.position.z = -D / 2; g.add(hinge);
      const ds = new T.Shape(); ds.moveTo(0, 0); ds.lineTo(D, 0); ds.lineTo(D, 3.2); ds.quadraticCurveTo(D / 2, 4.5, 0, 3.2); ds.closePath();
      const door = P.card(ds, { tex: doorTex, depth: 0.12, inkW: 1 }); door.rotation.y = -Math.PI / 2; hinge.add(door);
      move = e => { hinge.rotation.y = -smooth(e) * 1.75; };
    }
    return { update(st2) { move(pc.e); g.visible = g.visible && pc.x > st2.rollX - 1; } };
  };
  // twin tabs: a drawbridge (lowered from the castle gate), a paper stair (over a wall), The End (the finale)
  art.pieces.twin = (K, st, pc, sc) => {
    const g = new T.Group(); K.add(g);
    if (pc.does === 'drawbridge') {
      g.position.set(pc.x1 + 0.4, 0, pc.z); pop(sc, st, g, pc.x1, 0.05);
      const L = pc.x1 - pc.x0 + 0.8, D = HALF * 2 - 0.1;
      const planks = K3D.paint('pcDBPlanks', 512, 256, (c, w, h) => { const r = P.rng(1101); for (let y = 0; y < h; y += 32) { c.fillStyle = mixHex('#9a6a3e', '#b88a58', r()); c.fillRect(0, y + 1, w, 30); c.strokeStyle = 'rgba(43,33,48,0.6)'; c.lineWidth = 2; c.strokeRect(0, y + 1, w, 30); } c.fillStyle = '#4a4e58'; c.fillRect(40, 0, 18, h); c.fillRect(w - 58, 0, 18, h); });
      const pivot = new T.Group(); g.add(pivot);
      const pm = toon('#ffffff', { map: planks });
      const deck = K3D.mesh(new T.BoxGeometry(L, 0.18, D).translate(-L / 2, -0.09, 0), [toon(EDGE), toon(EDGE), pm, pm, toon(EDGE), toon(EDGE)], { ink: INK });
      pivot.add(deck);
      // the gate tower it hangs from, on the far bank's far side (nothing tall on the camera's side of the road),
      // and a low stone post with a lantern on the near side
      const stone = K3D.mat('pcGateStone', () => toon('#ffffff', { map: CASTLE.wall() }));
      { const t = K3D.mesh(new T.CylinderGeometry(1.0, 1.1, 7.6, 14).translate(0, 3.8, 0), stone, { ink: INK }); t.position.set(1.0, 0, -(D / 2 + 1.0)); g.add(t); const roof = K3D.mesh(new T.ConeGeometry(1.3, 2.0, 14).translate(0, 8.6, 0), mat('pcRoofRed', '#c0453c'), { ink: INK }); roof.position.copy(t.position); g.add(roof); }
      { const p = K3D.mesh(new T.BoxGeometry(0.7, 1.3, 0.7).translate(0, 0.65, 0), stone, { ink: INK }); p.position.set(0.6, 0, D / 2 + 0.6); g.add(p); const lamp = new T.Mesh(new T.SphereGeometry(0.22, 12, 8), K3D.flat('#ffd77a')); lamp.position.set(0.6, 1.55, D / 2 + 0.6); g.add(lamp); }
      const chains = [-1].map(sz => { const c = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1, 6).translate(0, 0.5, 0), iron()); c.position.set(0.6, 6.6, sz * (D / 2 - 0.2)); g.add(c); return c; });
      return { update(st2) {
        const e = pc.e, a = -(1 - smooth(e)) * Math.PI / 2;
        pivot.rotation.z = a;
        // chains from the arch to the deck's free end
        const ex = -L * Math.cos(a), ey = -L * Math.sin(a);
        for (const c of chains) { const dx = ex - 0.6, dy = ey - 6.6, l = Math.hypot(dx, dy); c.scale.y = l; c.rotation.z = Math.atan2(-dx, dy); }
        g.visible = g.visible && pc.x1 > st2.rollX - 1;
      } };
    }
    if (pc.does === 'stair') {
      g.position.set(pc.x, 0, pc.z); pop(sc, st, g, pc.x, 0.05);
      const D = HALF * 2 + 0.4;
      const wallTex = K3D.paint('pcEndWall', 512, 512, (c, w, h) => { const r = P.rng(1111); c.fillStyle = '#efe4cc'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 10) { c.strokeStyle = pick(r, ['rgba(46,86,140,0.4)', 'rgba(170,52,60,0.35)', 'rgba(214,162,62,0.4)']); c.lineWidth = 5; c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, y + Math.sin(x * 0.03 + y) * 6); c.stroke(); } c.strokeStyle = '#8a5a2a'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10); });
      const wall = K3D.mesh(new T.BoxGeometry(0.5, 4.2, D).translate(0, 2.1, 0), toon('#ffffff', { map: wallTex }), { ink: INK }); g.add(wall);
      const steps = new T.Group(); g.add(steps);
      const stepM = mat('pcStep', '#f3ead2'), riseM = mat('pcRise', '#c8962e');
      const n = 7, run = 4.2, top = 4.35;
      for (let k = 0; k < n; k++) for (const sd of [-1, 1]) {
        const hgt = top * (k + 1) / n, x = sd * (0.6 + run - (k + 0.5) * run / n);
        const b = K3D.mesh(K3D.geo('pcStepG' + k, () => new T.BoxGeometry(run / n, top * (k + 1) / n, D - 0.4).translate(0, top * (k + 1) / n / 2, 0)), [stepM, stepM, riseM, stepM, stepM, stepM], { ink: INK, inkW: 0.7 });
        b.position.x = x; steps.add(b); void hgt;
      }
      const landing = K3D.mesh(new T.BoxGeometry(1.2, 4.2, D - 0.4).translate(0, 2.1, 0), stepM, { ink: INK, inkW: 0.7 }); steps.add(landing);
      return { update(st2) { const k = pc.popped ? kit.backOut(Math.max(0.001, pc.e)) : pc.e * 0.15; steps.visible = k > 0.01; steps.scale.set(1, Math.max(0.01, k), 1); g.visible = g.visible && pc.x + 6 > st2.rollX; } };
    }
    // The End: two big gold tabs (the tabs themselves are drawn like every other); a glowing frame round them
    const t0 = pc.tabs[0], t1 = pc.tabs[1], cx = (t0.x + t1.x) / 2, cz = (t0.z + t1.z) / 2;
    g.position.set(cx, 0.02, cz);
    const frame = new T.Mesh(new T.RingGeometry(2.4, 2.7, 48).rotateX(-Math.PI / 2), K3D.flat('#ffd76a', { transparent: true, opacity: 0.5, depthWrite: false, add: true }));
    frame.scale.set(1, 1, 1.25); g.add(frame);
    return { update() { frame.material.opacity = pc.popped ? 0.9 : 0.35 + Math.sin(G.clock * 3) * 0.15; } };
  };
  // a crank wheel beside a wheel tab: a spoked ship's wheel standing at the corridor's edge, turning with the piece
  function crank(K, sc, st, t, L3) {
    const g = new T.Group(), q = PC.runAt(L3, t.x), sd = Math.sign(t.z - q.z) || 1;
    g.position.set(t.x + 0.9, 0, t.z + sd * 0.95);
    const post = K3D.mesh(K3D.geo('pcCrankPost', () => new T.BoxGeometry(0.22, 1.35, 0.22).translate(0, 0.67, 0)), mat('pcPost', '#8a5a34'), { ink: INK, inkW: 0.7 }); g.add(post);
    const wheel = new T.Group(); wheel.position.y = 1.35; g.add(wheel);
    const rim = K3D.mesh(K3D.geo('pcRim', () => new T.TorusGeometry(0.62, 0.07, 8, 28)), mat('pcRimM', '#a86a3a'), { ink: INK, inkW: 0.7 }); wheel.add(rim);
    for (let k = 0; k < 8; k++) { const sp = K3D.mesh(K3D.geo('pcSpokeG', () => new T.CylinderGeometry(0.04, 0.04, 1.5, 6)), mat('pcRimM', '#a86a3a'), { ink: INK, inkW: 0.5 }); sp.rotation.z = k * Math.PI / 8; wheel.add(sp); }
    const hub = new T.Mesh(K3D.geo('pcHub', () => new T.CylinderGeometry(0.13, 0.13, 0.2, 12).rotateX(Math.PI / 2)), K3D.mat('brass', () => K3D.toon('#d9a640'))); wheel.add(hub);
    K.add(g); pop(sc, st, g, t.x, 0.08);
    return { g, wheel };
  }
  // the wheel: a winch bridge (castle: a plank lowered on ropes as the wheel turns) or the lighthouse's beam of light
  art.pieces.wheel = (K, st, pc, sc) => {
    const L3 = st.L3, g = new T.Group(); g.position.set(pc.x0 - 0.4, 0, pc.z); K.add(g); pop(sc, st, g, pc.x0, 0.05);
    const L = pc.len + 0.8, D = HALF * 2 - 0.1;
    const cranks = pc.tabs.filter(t => t.wheel).map(t => crank(K, sc, st, t, L3));
    let move;
    if (pc.look === 'beam') {
      const beamTex = K3D.paint('pcBeam', 512, 128, (c, w, h) => { const g2 = c.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, 'rgba(255,236,150,0.95)'); g2.addColorStop(0.5, 'rgba(255,250,210,1)'); g2.addColorStop(1, 'rgba(255,236,150,0.95)'); c.fillStyle = g2; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(200,150,40,0.8)'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); c.fillStyle = 'rgba(255,255,255,0.6)'; for (let x = 20; x < w; x += 46) c.fillRect(x, 10, 18, h - 20); });
      const bm = K3D.flat('#ffffff', { map: beamTex, transparent: true, opacity: 0.9, depthWrite: false });
      const beam = new T.Mesh(new T.BoxGeometry(1, 0.14, D).translate(0.5, -0.07, 0), bm); g.add(beam);
      const glow = new T.Mesh(new T.PlaneGeometry(1, D + 1.2).rotateX(-Math.PI / 2).translate(0.5, -0.4, 0), K3D.flat('#ffe9a0', { transparent: true, opacity: 0.3, depthWrite: false, add: true })); g.add(glow);
      move = e => { const k = Math.max(0.001, e); beam.scale.x = L * k; glow.scale.x = L * k; bm.opacity = e >= 0.999 ? 0.95 : 0.45 + e * 0.3; beam.visible = glow.visible = e > 0.01; };
    } else {
      const planks = K3D.paint('pcPlanks', 512, 256, (c, w, h) => { const r = P.rng(471); for (let x = 0; x < w; x += 32) { c.fillStyle = mixHex('#b88a58', '#9a6a3e', r()); c.fillRect(x + 1, 0, 30, h); c.strokeStyle = 'rgba(43,33,48,0.6)'; c.lineWidth = 2; c.strokeRect(x + 1, 0, 30, h); } }, { repeat: true });
      const pivot = new T.Group(); g.add(pivot);
      const deck = K3D.mesh(new T.BoxGeometry(L, 0.16, D).translate(L / 2, -0.08, 0), [toon(EDGE), toon(EDGE), toon('#ffffff', { map: planks }), toon('#7a5434'), toon(EDGE), toon(EDGE)], { ink: INK });
      pivot.add(deck);
      // the winch frame on the near bank and its ropes to the plank's end
      for (const sz of [-1, 1]) { const p = K3D.mesh(new T.BoxGeometry(0.3, 4.2, 0.3).translate(0, 2.1, 0), mat('pcPost', '#8a5a34'), { ink: INK, inkW: 0.7 }); p.position.set(-0.3, 0, sz * (D / 2 + 0.25)); g.add(p); }
      const bar = K3D.mesh(new T.CylinderGeometry(0.12, 0.12, D + 0.8, 10).rotateX(Math.PI / 2).translate(-0.3, 4.1, 0), mat('pcPost', '#8a5a34'), { ink: INK, inkW: 0.7 }); g.add(bar);
      const ropes = [-1, 1].map(sz => { const c = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 1, 6).translate(0, 0.5, 0), mat('pcRope', '#d8c08a')); c.position.set(-0.3, 4.1, sz * (D / 2 - 0.2)); g.add(c); return c; });
      move = e => {
        const a = (1 - smooth(e)) * Math.PI / 2 * 0.92;
        pivot.rotation.z = a;
        const ex = L * Math.cos(a) + 0.3, ey = L * Math.sin(a) - 4.1;
        for (const c of ropes) { const l = Math.hypot(ex, ey); c.scale.y = l; c.rotation.z = Math.atan2(-ex, ey); }
      };
    }
    return { update(st2) {
      move(pc.e);
      for (const c of cranks) c.wheel.rotation.z = -pc.e * Math.PI * 4;
      g.visible = g.visible && pc.x1 > st2.rollX - 1;
    } };
  };
  // the ship: a paper galleon on a slot across the gap (bow toward the far bank), its long striped tab on the near bank
  art.pieces.ship = (K, st, pc, sc) => {
    const g = new T.Group(); K.add(g);
    const len = pc.half * 2, beam = pc.sol.d;
    const hull = K3D.paint('pcHull', 512, 128, (c, w, h) => { const r = P.rng(1201); for (let y = 0; y < h; y += 22) { c.fillStyle = mixHex('#7a4a2a', '#9a6a3e', r()); c.fillRect(0, y, w, 21); } c.fillStyle = '#f2c14e'; c.fillRect(0, 8, w, 8); for (let x = 40; x < w; x += 80) { c.fillStyle = '#2b2130'; c.beginPath(); c.arc(x, h * 0.6, 10, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#d9a640'; c.lineWidth = 4; c.stroke(); } }, { repeat: true });
    const deckTex = K3D.paint('pcShipDeck', 256, 256, (c, w, h) => { const r = P.rng(1202); for (let x = 0; x < w; x += 24) { c.fillStyle = mixHex('#c49a68', '#a8804e', r()); c.fillRect(x, 0, 23, h); c.fillStyle = 'rgba(40,25,15,0.5)'; c.fillRect(x + 23, 0, 1, h); } });
    // the hull: the deck outline (pointed at the bow) extruded down
    const s = new T.Shape(); s.moveTo(-len / 2, -beam / 2); s.lineTo(len / 2 - 0.5, -beam / 2); s.quadraticCurveTo(len / 2 + 0.6, 0, len / 2 - 0.5, beam / 2); s.lineTo(-len / 2, beam / 2); s.closePath();
    const hg = new T.ExtrudeGeometry(s, { depth: 0.75, bevelEnabled: false }).rotateX(Math.PI / 2);
    const hm = K3D.mesh(hg, [toon('#ffffff', { map: deckTex }), toon('#ffffff', { map: hull })], { ink: INK });
    hm.position.y = 0.0; g.add(hm);
    // rails along both sides (the ends are open: that is where you step on and off)
    for (const sd of [-1, 1]) { const rl = K3D.mesh(new T.BoxGeometry(len - 0.6, 0.38, 0.1).translate(-0.2, 0.19, 0), mat('pcRail', '#7a4a2a'), { ink: INK, inkW: 0.7 }); rl.position.z = sd * (beam / 2 - 0.05); g.add(rl); }
    // the mast at the far side, with two sails facing the camera and a pennant
    const mast = K3D.mesh(new T.CylinderGeometry(0.08, 0.1, 5.2, 8).translate(0, 2.6, 0), mat('pcMast', '#6a4426'), { ink: INK, inkW: 0.7 }); mast.position.set(-0.2, 0, -beam / 2 + 0.35); g.add(mast);
    const sailTex = K3D.paint('pcSail', 256, 256, (c, w, h) => { c.fillStyle = '#f6efdc'; c.fillRect(0, 0, w, h); c.fillStyle = '#c83a3a'; for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 32, h); c.strokeStyle = 'rgba(80,60,40,0.4)'; c.lineWidth = 2; for (let y = 20; y < h; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } });
    for (const [y, sw, sh] of [[1.4, 2.6, 1.7], [3.3, 2.0, 1.4]]) {
      const ss = new T.Shape(); ss.moveTo(-sw / 2, 0); ss.quadraticCurveTo(0, -0.25, sw / 2, 0); ss.lineTo(sw / 2 + 0.1, sh); ss.quadraticCurveTo(0, sh + 0.25, -sw / 2 - 0.1, sh); ss.closePath();
      const sail = P.card(ss, { tex: sailTex, depth: 0.04, inkW: 0.8 }); sail.position.set(-0.2, y, -beam / 2 + 0.5); g.add(sail);
    }
    const flag = P.card(P.shapeFrom([[0, 0], [0.9, -0.2], [0, -0.42]]), { col: '#2f6a9a', depth: 0.02, inkW: 0.6 }); flag.position.set(-0.2, 5.3, -beam / 2 + 0.35); g.add(flag);
    // the long tab's strip on the near bank, from its slot to the tab
    const stripTex = K3D.paint('pcStripTab', 256, 64, (c, w, h) => { c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#d4343a'; for (let x = -h; x < w; x += 36) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 18, h); c.lineTo(x + 18 + h, 0); c.lineTo(x + h, 0); c.closePath(); c.fill(); } }, { repeat: true });
    const strip = new T.Mesh(new T.PlaneGeometry(1, 0.7).rotateX(-Math.PI / 2).translate(-0.5, 0.012, 0), toon('#ffffff', { map: stripTex }));
    strip.position.set(pc.sx0 + 0.4, 0, pc.sz); K.add(strip);
    const slot = new T.Mesh(new T.PlaneGeometry(0.16, 0.85).rotateX(-Math.PI / 2), K3D.flat('#1a1210')); slot.position.set(pc.sx0 + 0.45, 0.008, pc.sz); K.add(slot);
    const t0 = pc.tabs[0];
    return { update(st2) {
      g.position.set(pc.sol.x, 0, pc.z);
      g.rotation.z = Math.sin(G.clock * 1.6) * 0.02; g.rotation.x = Math.sin(G.clock * 1.1) * 0.015;
      const l = Math.max(0.05, pc.sx0 + 0.4 - (t0.x + 0.75)); strip.scale.x = l; stripTex.repeat.set(l / 2, 1);
      flag.rotation.y = Math.sin(G.clock * 4) * 0.3;
      g.visible = pc.x1 > st2.rollX - 1; strip.visible = slot.visible = pc.sx0 > st2.rollX;
    } };
  };

  /* ================= the sliding figures ================= */
  art.sliders.guard = () => ({ tex: CASTLE.knight(), shape: CASTLE.knightShape, scale: 1.0 });
  art.sliders.shark = () => ({ scale: 1.25,
    tex: K3D.paint('pcShark', 384, 256, (c, w, h) => {
      const r = P.rng(1301); c.clearRect(0, 0, w, h);
      c.fillStyle = '#6a7a8a'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 30; i++) P.wash(c, r() * w, r() * h, 24, r() < 0.5 ? '#5a6878' : '#8a9aaa', 0.4, r, { noEdge: true });
      c.fillStyle = '#e8eef0'; c.beginPath(); c.ellipse(w * 0.55, h * 0.72, w * 0.32, h * 0.1, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2b2130'; c.beginPath(); c.arc(w * 0.8, h * 0.52, 6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fbf3e0'; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(w * 0.74 + k * 9, h * 0.7); c.lineTo(w * 0.74 + k * 9 + 4, h * 0.78); c.lineTo(w * 0.74 + k * 9 + 8, h * 0.7); c.fill(); }
      c.fillStyle = 'rgba(230,248,255,0.9)'; c.fillRect(0, h * 0.86, w, h * 0.14); for (let x = 0; x < w; x += 22) { c.beginPath(); c.arc(x + 11, h * 0.86, 11, Math.PI, 0); c.fill(); }
    }),
    shape: P.shapeFrom([[-0.85, 0.05], [-0.95, 0.5], [-0.62, 0.32], [-0.3, 0.42], [-0.1, 0.9], [0.12, 0.44], [0.5, 0.42], [0.9, 0.28], [0.62, 0.18], [0.85, 0.05]]),
  });

  /* ================= extras: wave crests, the reading finger, the storm ================= */
  art.extras.push((K, st, L3, sc) => {
    if (!L3.crests || !L3.crests.length) return null;
    const topTex = K3D.paint('pcCrestTop', 128, 128, (c, w, h) => { c.fillStyle = '#e8f6fc'; c.fillRect(0, 0, w, h); const r = P.rng(1401); for (let i = 0; i < 40; i++) { c.strokeStyle = 'rgba(90,160,200,0.6)'; c.lineWidth = 2; c.beginPath(); c.arc(r() * w, r() * h, 4 + r() * 8, 0, Math.PI); c.stroke(); } c.strokeStyle = '#5aa0c8'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); });
    const sideTex = SEA.wave();
    const ms = [toon('#ffffff', { map: sideTex }), toon('#ffffff', { map: sideTex }), toon('#ffffff', { map: topTex }), toon('#1d4c6c'), toon('#ffffff', { map: sideTex }), toon('#ffffff', { map: sideTex })];
    const list = L3.crests.map(cr => {
      const g = new T.Group();
      const block = K3D.mesh(K3D.geo('pcCrestG', () => new T.BoxGeometry(1.4, 0.65, 1.4).translate(0, -0.325, 0)), ms, { ink: '#0e2a3a', inkW: 0.8 }); g.add(block);
      const curl = P.card(SEA.waveShape(2, 1.5), { tex: sideTex, depth: 0.04, inkW: 0.7, ink: '#0e2a3a', cast: false }); curl.position.set(0, -0.1, -0.72); curl.scale.set(1, 0.55, 1); g.add(curl);
      const rail = new T.Mesh(new T.PlaneGeometry(0.18, cr.amp * 2 + 1.6).rotateX(-Math.PI / 2), K3D.flat('#0e2030')); rail.position.set(cr.sol.x, -0.48, cr.zc); K.add(rail);
      K.add(g); return { g, cr };
    });
    return { update(st2) { for (const q of list) { q.g.position.set(q.cr.sol.x, Math.sin(G.clock * 3 + q.cr.x) * 0.02, q.cr.sol.z); q.g.visible = q.cr.sol.x > st2.rollX; } } };
  });
  // the reading finger: the Reader's other hand comes down from above to follow the words; its shadow is the warning
  art.extras.push((K, st, L3, sc) => {
    if (!L3.def.fingers || !L3.def.fingers.length) return null;
    const skin = K3D.toon('#f4c6a2'), skinInk = '#8a5040';
    const hand = new T.Group(); K.add(hand); hand.visible = false;
    const palm = K3D.mesh(K3D.roundBox(1.9, 2.2, 0.9, 0.55, 40), skin, { ink: skinInk, inkW: 1.2 }); palm.position.y = 3.2; hand.add(palm);
    const index = K3D.mesh(new T.CapsuleGeometry(0.34, 1.9, 6, 14).translate(0, 1.0, 0), skin, { ink: skinInk, inkW: 1.1 }); index.rotation.x = Math.PI; index.position.set(-0.45, 2.15, 0); hand.add(index);
    const nail = new T.Mesh(new T.SphereGeometry(0.24, 12, 8), K3D.toon('#fbe0dc')); nail.scale.set(0.9, 0.5, 0.35); nail.position.set(-0.45, 0.35, 0.28); hand.add(nail);
    for (let k = 0; k < 3; k++) { const f = K3D.mesh(K3D.geo('pcCurl' + k, () => new T.SphereGeometry(0.36, 14, 10)), skin, { ink: skinInk, inkW: 1 }); f.position.set(0.05 + k * 0.5, 1.9, 0.45); f.scale.set(1, 1.15, 1); hand.add(f); }
    const thumb = K3D.mesh(new T.CapsuleGeometry(0.33, 0.9, 6, 12), skin, { ink: skinInk, inkW: 1 }); thumb.position.set(-0.95, 2.9, 0.5); thumb.rotation.z = 0.7; hand.add(thumb);
    const stripes = K3D.paint('pcPyjama', 256, 512, (c, w, h) => { for (let y = 0; y < h; y += 64) { c.fillStyle = '#2f8a8a'; c.fillRect(0, y, w, 32); c.fillStyle = '#f3ead2'; c.fillRect(0, y + 32, w, 32); } }, { repeat: true });
    const sleeve = K3D.mesh(new T.CylinderGeometry(1.35, 1.6, 12, 24, 1, true).translate(0, 6 + 4.2, 0), K3D.toon('#ffffff', { map: stripes, side: T.DoubleSide }), { ink: '#1f4a4a', inkW: 1.2 });
    hand.add(sleeve);
    const shadowTex = K3D.paint('pcFingerShadow', 128, 128, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(20,10,30,0.85)'); g.addColorStop(0.7, 'rgba(20,10,30,0.5)'); g.addColorStop(1, 'rgba(20,10,30,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    const shadow = new T.Mesh(new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), K3D.flat('#ffffff', { map: shadowTex, transparent: true, depthWrite: false }));
    shadow.material.polygonOffset = true; shadow.material.polygonOffsetFactor = -4; shadow.renderOrder = 2; K.add(shadow); shadow.visible = false;
    const ring = new T.Mesh(new T.RingGeometry(0.92, 1.0, 48).rotateX(-Math.PI / 2), K3D.flat('#ff8a6a', { transparent: true, opacity: 0.8, depthWrite: false })); ring.position.y = 0.03; K.add(ring); ring.visible = false;
    const S = PC.S, R = S.fingerR;
    return { update(st2) {
      const f = st2.finger;
      if (!f) { hand.visible = shadow.visible = ring.visible = false; return; }
      hand.visible = shadow.visible = ring.visible = true;
      let y, sk, op;
      if (f.ph === 'shadow') { const k = clamp(f.t / S.fingerShadow, 0, 1); y = 13 - 11.6 * smooth(k); sk = 1.9 - 0.9 * k; op = 0.25 + 0.55 * k; }
      else if (f.ph === 'press') { y = 0; sk = 1; op = 0.9; }
      else { const k = clamp(f.t / S.fingerLift, 0, 1); y = 9 * smooth(k); sk = 1 + k * 0.6; op = 0.8 * (1 - k); }
      // the hand leans in from the far side, its fingertip over the spot
      hand.position.set(f.x + 0.45, y, f.z); hand.rotation.set(-0.35, 0, 0.1);
      shadow.position.set(f.x, 0.02, f.z); shadow.scale.setScalar(R * sk); shadow.material.opacity = op;
      ring.position.set(f.x, 0.03, f.z); ring.scale.setScalar(R); ring.material.opacity = f.ph === 'shadow' ? 0.4 + 0.4 * Math.abs(Math.sin(G.clock * 10)) : 0.3;
    } };
  });
  // the storm on the sea spread: tissue rain and the lightning (a jagged cut-out in the sky; the page flashes white)
  art.extras.push((K, st, L3, sc) => {
    if (L3.def.decor !== 'sea') return null;
    const N = 420, geo = new T.PlaneGeometry(0.035, 0.9);
    const rain = new T.InstancedMesh(geo, K3D.flat('#c8dcf0', { transparent: true, opacity: 0.55, depthWrite: false, side: T.DoubleSide }), N);
    rain.frustumCulled = false; K.add(rain);
    const drops = []; const r = P.rng(1501); const m4 = new T.Matrix4(), q = new T.Quaternion().setFromEuler(new T.Euler(0, 0, 0.18)), sv = new T.Vector3(1, 1, 1);
    for (let i = 0; i < N; i++) drops.push({ x: (r() - 0.5) * 40, y: r() * 12, z: (r() - 0.5) * 24, v: 14 + r() * 6 });
    const boltShape = P.shapeFrom([[0, 0], [0.5, 1.6], [0.1, 1.6], [0.9, 3.6], [0.3, 3.6], [1.1, 6], [-0.2, 3.1], [0.3, 3.1], [-0.4, 1.4], [0.1, 1.4]]);
    const bolt = P.card(boltShape, { col: '#fff6b0', depth: 0.05, inkW: 1, ink: '#6a5a10', cast: false });
    bolt.scale.setScalar(1.3); K.add(bolt); bolt.visible = false;
    return { update(st2, dt, K2) {
      const at = K2.focus || v3.set(0, 0, 0);
      for (let i = 0; i < N; i++) { const d = drops[i]; d.y -= d.v * dt; if (d.y < 0) { d.y += 12; d.x = (r() - 0.5) * 40; d.z = (r() - 0.5) * 24; } m4.compose(v3.set(at.x + d.x, d.y, clamp(d.z, -L3.pd / 2, L3.pd / 2)), q, sv); rain.setMatrixAt(i, m4); }
      rain.instanceMatrix.needsUpdate = true;
      const b = st2.bolt; bolt.visible = !!(b && b.t < 0.35);
      if (bolt.visible) bolt.position.set(b.x, 3.5, -L3.pd / 2 + 0.8);
    } };
  });
  // the page flashes white with the lightning (not with reduced motion)
  const drawTop0 = art.drawTop;
  art.drawTop = function (st) {
    drawTop0(st);
    const b = st.bolt;
    if (b && b.t < 0.18 && !reduceMotion) { ctx.fillStyle = 'rgba(255,255,250,' + (0.35 * (1 - b.t / 0.18)) + ')'; ctx.fillRect(0, 0, W, H); }
  };

  art.decor.castle = { paint: paintCastle, scenery: castleScenery, water: { bed: '#2a4a32', beds: ['#21402a', '#355a3c', '#2e4a2a'], water: '#4e8a5c', waters: ['#3e7a4c', '#5a9a68', '#78b080', '#2f6a40'], dark: '20,70,40', opacity: 0.8, lily: true } };
  art.decor.sea = { paint: paintSea, scenery: seaScenery, water: { bed: '#14303e', beds: ['#102836', '#1e4050', '#183848'], water: '#2a6488', waters: ['#1e5474', '#3a7aa0', '#5a98b8', '#164462'], dark: '10,40,70', opacity: 0.82, lily: false } };
  art.decor.end = { paint: paintEnd, scenery: endScenery, water: { bed: '#2c3a66', beds: ['#24305a', '#38487a', '#2a3a60'], water: '#4a6ab0', waters: ['#3a5aa0', '#5a7ac0', '#7a9ad0', '#2f4a90'], dark: '30,50,110', opacity: 0.78, lily: false } };
})();
