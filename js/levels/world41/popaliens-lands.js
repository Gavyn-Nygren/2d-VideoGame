/* Pip & Bo - World 41, 41-4 Paper Alien Invasion: the scenery of stretches 2-4 (Letter City, the Ink Crater and
   Bunker Hill), the Scribble Walker and the bunker hatch. Loaded on demand with the 3D kit, before popaliens-scene.js.

   PALANDS.build(K, st)       fills in the later stretches (called from PASCENE.build)
   PALANDS.update(K, st, dt, t) every drawn frame, last thing in PASCENE.draw (it may move the saucer and the heroes)
   PALANDS.free(x, z, pad)    is this spot open paper (not a letter, the ink, a fold of the hill or the bunker)? The
                              paper folk use it so they never stand inside things.

   Letter City: every letter of the printed lines is a building of black ink (the strokes the rules use as walls and
   cover), with cut-paper windows lit warm, glossy wet tops, ink bleeding into the page round their feet, lamp posts
   at the gaps, bunting across the streets and pencil zebra crossings. The capital T is a tower; the "!" is a card
   cut-out standing on its dot that topples into a bridge over a perforated "cut here" line of holes.
   The Ink Crater: a glossy blot of wet ink with a scorched rim and singed curls, bubbles, wisps of smoke, a dry
   winding path, islands and pink blotting-paper strips; the lamp dims and the saucer's searchlight hunts.
   Bunker Hill: the page turns into a pop-up hill of green card, layered terraces, accordion-folded walls, a zigzag
   crayon path up to the bunker dome and its hatch. The Scribble Walker is a crayon scribble on a flat sheet, standing
   on three accordion-folded legs; rubbing it out shows the paper underneath.
   Drawing only: nothing here changes the rules.
*/
'use strict';

const PALANDS = (function () {
  const T = K3D.T, P = POPUP, R = PA_ROUTE;
  const L = {};
  const TAU = Math.PI * 2;
  const v = (x, y, z) => new T.Vector3(x, y, z);
  const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

  /* ---------- where things are (for placing scenery and the paper folk) ---------- */
  const rects = [];   // { x, z, hw, hd } axis-aligned blocks the scenery keeps out of
  let extraWords = []; // scenery-only words out past the sides of the path: { x0, x1, z, hd }
  function layoutExtras() {
    if (extraWords.length) return;
    const F = R.font, adv = 4 * F.LS + 0.2, gapW = 3.6;
    // the rest of each printed line, out to the left (the paragraph goes on) and a short word to the right
    const more = { '-161': [['ON', 'THAT', 'DAY'], ['OF']], '-183': [['AND', 'THE'], ['GO']], '-205': [['OUT', 'TO'], ['NEW']],
      '-226': [['THE', 'BIG'], ['IN']], '-299': [['UP', 'RAN'], ['OF']], '-314': [['AND'], ['TO']] };
    for (const Ln of R.lines) {
      if (Ln.kind !== 'print') continue;
      const m = more[String(Ln.z)]; if (!m) continue;
      const hd = Ln.hd;
      // to the left, read backwards from the start of the line
      let x1 = Ln.x0 - gapW;
      for (const wd of m[0].slice().reverse()) {
        const w = wd.length * adv - 0.2, x0 = x1 - w;
        if (x0 < -48) break;
        extraWords.push({ wd, x0, x1, z: Ln.z, hd });
        x1 = x0 - gapW;
      }
      let x0 = Ln.x1 + gapW;
      for (const wd of m[1]) {
        const w = wd.length * adv - 0.2;
        if (x0 + w > 29.4) break;
        extraWords.push({ wd, x0, x1: x0 + w, z: Ln.z, hd });
        x0 += w + gapW;
      }
    }
  }
  function layoutRects() {
    if (rects.length) return;
    layoutExtras();
    for (const s of R.solids) {
      if (s.kind === 'word' || s.kind === 'fold' || s.kind === 'bunker') rects.push({ x: s.x, z: s.z, hw: s.w / 2, hd: s.d / 2 });
    }
    for (const w of extraWords) rects.push({ x: (w.x0 + w.x1) / 2, z: w.z, hw: (w.x1 - w.x0) / 2 + 0.5, hd: w.hd });
  }
  L.free = function (x, z, pad = 0.4) {
    if (z > -150) return true;
    layoutRects();
    for (const r of rects) if (Math.abs(x - r.x) < r.hw + pad && Math.abs(z - r.z) < r.hd + pad) return false;
    if (Math.abs(z - R.bang.holesZ) < 1.4 && Math.abs(x) < 18) return false;
    if (Math.abs(x - R.bang.x) < 1.6 && Math.abs(z - R.bang.z) < 1.6) return false;
    if (inkish(x, z, pad)) return false;
    if (Math.hypot(x - R.walker.hatch.x, z - R.walker.hatch.z) < R.walker.hatch.r + 0.6) return false;
    return true;
  };
  // in the blot or its scorched rim (the scenery keeps off it; the rules only care about the wet part)
  function inkish(x, z, pad = 0) {
    const I = R.ink, ex = (x - I.cx) / (I.rx + 2 + pad), ez = (z - I.cz) / (I.rz + 2 + pad);
    if (ex * ex + ez * ez > 1) return false;
    if (Math.abs(x - I.pathX(z)) < I.pathHw - 0.3) return false;
    for (const [ix, iz, ir] of I.islands) if (Math.hypot(x - ix, z - iz) < ir - 0.4) return false;
    return true;
  }
  const inEllipse = (x, z, k = 1) => { const I = R.ink, ex = (x - I.cx) / (I.rx * k), ez = (z - I.cz) / (I.rz * k); return ex * ex + ez * ez < 1; };

  /* ---------- the ground of the later stretches: painted in three big sheets ---------- */
  const SEC = [{ key: 'A', z0: -168, z1: -320 }, { key: 'B', z0: -320, z1: -480 }, { key: 'C', z0: -480, z1: -612 }];
  const GX0 = -70, GX1 = 30, PPU = 16;
  const gr = a => 'rgba(64,64,76,' + a + ')';
  function groundTex(S) {
    const w = (GX1 - GX0) * PPU, h = (S.z0 - S.z1) * PPU;
    return K3D.paint('paLand' + S.key, w, h, (c) => {
      c.clearRect(0, 0, w, h);
      const X = x => (x - GX0) * PPU, Z = z => (z - S.z1) * PPU, r = P.rng(500 + S.key.charCodeAt(0));
      const hand = (txt, x, z, size, rot, a = 0.42, font = 'italic') => { c.save(); c.translate(X(x), Z(z)); c.rotate(rot); c.fillStyle = gr(a); c.font = font + ' ' + Math.round(size * PPU) + 'px "Comic Sans MS", "Segoe Print", cursive'; c.fillText(txt, 0, 0); c.restore(); };
      const pline = (pts, wdt, a = 0.4, col) => { c.strokeStyle = col || gr(a); c.lineWidth = wdt * PPU; c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath(); pts.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); c.stroke(); };
      if (S.key === 'A') paintCity(c, X, Z, r, hand, pline);
      if (S.key === 'B') paintCrater(c, X, Z, r, hand, pline, w, h);
      if (S.key === 'C') paintHill(c, X, Z, r, hand, pline, w, h);
    });
  }
  function paintCity(c, X, Z, r, hand, pline) {
    const boxesOf = [];
    for (const Lt of R.letters) for (const b of Lt.boxes) boxesOf.push(b);
    for (const w of extraWords) for (const b of wordBoxes(w)) boxesOf.push(b);
    // the highlighter someone dragged across a line, and a pink one half over another
    const hl = (z, x0, x1, col, dz = 3.4) => {
      c.save(); c.globalCompositeOperation = 'multiply';
      c.fillStyle = col; c.beginPath();
      c.moveTo(X(x0), Z(z - dz)); for (let x = x0; x <= x1; x += 2) c.lineTo(X(x), Z(z - dz + Math.sin(x * 0.3) * 0.15));
      c.lineTo(X(x1 + 0.6), Z(z)); c.lineTo(X(x1), Z(z + dz));
      for (let x = x1; x >= x0; x -= 2) c.lineTo(X(x), Z(z + dz + Math.sin(x * 0.4) * 0.15));
      c.lineTo(X(x0 - 0.5), Z(z)); c.closePath(); c.fill();
      // the streaks of the felt tip
      for (let i = 0; i < 6; i++) { c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 0.15 * PPU; c.beginPath(); c.moveTo(X(x0), Z(z - dz + 0.5 + i * dz * 0.33)); c.lineTo(X(x1), Z(z - dz + 0.6 + i * dz * 0.33)); c.stroke(); }
      c.restore();
    };
    hl(-205, -36, 22, 'rgba(250,236,90,0.55)');
    hl(-299, -2, 24, 'rgba(255,150,200,0.45)', 3.2);
    // ink bleeding into the page round the foot of every letter (a soft dark halo, then a crisper wet edge)
    c.save(); c.filter = 'blur(' + Math.round(0.35 * PPU) + 'px)'; c.fillStyle = 'rgba(30,24,44,0.30)';
    for (const b of boxesOf) { c.save(); c.translate(X(b.x), Z(b.z)); c.rotate(-b.rot); c.fillRect(-(b.w / 2 + 0.45) * PPU, -(b.d / 2 + 0.45) * PPU, (b.w + 0.9) * PPU, (b.d + 0.9) * PPU); c.restore(); }
    c.restore();
    c.fillStyle = 'rgba(24,18,36,0.55)';
    for (const b of boxesOf) {
      c.save(); c.translate(X(b.x), Z(b.z)); c.rotate(-b.rot);
      c.beginPath(); const hw = b.w / 2 + 0.12, hd = b.d / 2 + 0.12;
      for (let i = 0; i <= 16; i++) { const x = -hw + 2 * hw * i / 16; c.lineTo(x * PPU, (-hd - r() * 0.1) * PPU); }
      for (let i = 0; i <= 16; i++) { const x = hw - 2 * hw * i / 16; c.lineTo(x * PPU, (hd + r() * 0.1) * PPU); }
      c.closePath(); c.fill(); c.restore();
    }
    // feathered ink run-off: little rivulets into the paper fibres
    for (const b of boxesOf) {
      if (r() < 0.6) continue;
      const a = r() * TAU, l = 0.6 + r() * 1.4;
      pline([[b.x, b.z], [b.x + Math.cos(a) * (b.w / 2 + l), b.z + Math.sin(a) * (b.d / 2 + l)]], 0.06, 0, 'rgba(30,24,44,0.35)');
    }
    // the rest of the paragraph far to the left: flat print too far off to stand up
    c.fillStyle = 'rgba(30,24,36,0.85)'; c.font = 'bold ' + Math.round(4.2 * PPU) + 'px Georgia, "DejaVu Serif", serif';
    const words = 'and the little paper people waved at the sky while the saucer hummed over the roofs of letter city'.split(' ');
    let wi = 0;
    for (let zz = -172; zz > -320; zz -= 6.4) { let x = X(-69.5); while (x < X(-50)) { const wd = words[wi++ % words.length]; const ww = c.measureText(wd + ' ').width; if (x + ww > X(-49.5)) break; c.fillText(wd, x, Z(zz)); x += ww; } }
    // zebra crossings in pencil through every gap, and street names in the reader's handwriting
    const names = ['Print St.', 'Serif Rd.', 'Bold Ave.', 'Inky Lane', 'Comma Close', 'Full Stop'];
    let ni = 0;
    for (const Ln of R.lines) {
      if (Ln.kind !== 'print') continue;
      for (const [g0, g1] of Ln.gaps) {
        const zf = Ln.z + Ln.hd + 0.5;
        for (let x = g0 + 0.35; x < g1 - 0.3; x += 0.7) { c.fillStyle = 'rgba(70,70,84,0.30)'; c.save(); c.translate(X(x), Z(zf + 1.4)); c.rotate((r() - 0.5) * 0.06); c.fillRect(-0.16 * PPU, -1.3 * PPU, 0.32 * PPU, 2.6 * PPU); c.restore(); }
        // and the same on the far side
        const zb = Ln.z - Ln.hd - 0.5;
        for (let x = g0 + 0.35; x < g1 - 0.3; x += 0.7) { c.fillStyle = 'rgba(70,70,84,0.22)'; c.fillRect(X(x) - 0.15 * PPU, Z(zb - 2.4), 0.3 * PPU, 2.2 * PPU); }
      }
      hand(names[ni++ % names.length], -14 + (ni % 3) * 5, Ln.z + Ln.hd + 6.5, 1.6, (r() - 0.5) * 0.08, 0.35);
    }
    // a big circle round "WILD" and an arrow, an underline under "SHIP LANDED"
    const wild = R.solids.filter(s => s.kind === 'word' && s.z === -205).sort((a, b) => b.x - a.x)[0];
    if (wild) { c.strokeStyle = gr(0.45); c.lineWidth = 0.3 * PPU; for (const o of [0, 0.4]) { c.beginPath(); c.ellipse(X(wild.x + o), Z(-205 + o * 0.3), (wild.w / 2 + 2.4) * PPU, 4.6 * PPU, 0.05, 0, TAU); c.stroke(); } hand('!!', wild.x + wild.w / 2 + 3, -201, 3, 0.1, 0.5); }
    const pts = []; for (let x = -18; x <= 18; x += 1) pts.push([x, -226 + 3.6 + Math.sin(x * 0.9) * 0.35]);
    pline(pts, 0.28, 0.42);
    // the "cut here" perforation the holes are punched along, with a little pair of scissors
    for (let x = -60; x < 28; x += 1.2) { if (Math.abs(x) < 17.4) continue; c.fillStyle = gr(0.5); c.beginPath(); c.ellipse(X(x), Z(R.bang.holesZ), 0.35 * PPU, 0.2 * PPU, 0, 0, TAU); c.fill(); }
    hand('cut here', -32, R.bang.holesZ - 1.2, 2.2, 0, 0.45);
    c.save(); c.translate(X(-21), Z(R.bang.holesZ)); c.strokeStyle = gr(0.55); c.lineWidth = 0.22 * PPU;
    for (const s of [-1, 1]) { c.beginPath(); c.arc(-1.4 * PPU, s * 0.7 * PPU, 0.55 * PPU, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(-0.9 * PPU, s * 0.5 * PPU); c.lineTo(1.6 * PPU, -s * 0.35 * PPU); c.stroke(); }
    c.restore();
    // tears and creases round the holes (the page pulls a little where it's punched)
    for (let i = 0; i < 40; i++) { const x = -17 + r() * 34, s = r() < 0.5 ? -1 : 1; pline([[x, R.bang.holesZ + s * 0.8], [x + (r() - 0.5) * 0.6, R.bang.holesZ + s * (1.2 + r() * 1.2)]], 0.05, 0.3); }
    // a giant smudged fingerprint where the reader held the page
    c.save(); c.translate(X(15), Z(-272)); c.rotate(0.4);
    for (let i = 0; i < 22; i++) { c.strokeStyle = 'rgba(80,70,80,' + (0.10 + r() * 0.05) + ')'; c.lineWidth = 0.32 * PPU; c.beginPath(); c.ellipse(0, i * 0.08 * PPU, (0.6 + i * 0.42) * PPU, (0.9 + i * 0.55) * PPU, 0, Math.PI * 0.05 + r() * 0.2, Math.PI * 1.95 - r() * 0.2); c.stroke(); }
    c.restore();
    // street litter: dropped full stops, commas and the odd apostrophe lying flat
    for (let i = 0; i < 40; i++) {
      const x = -30 + r() * 56, z = -172 - r() * 145;
      if (!L.free(x, z, 0.5)) continue;
      c.fillStyle = 'rgba(28,22,38,0.82)'; c.save(); c.translate(X(x), Z(z)); c.rotate(r() * TAU);
      if (r() < 0.5) { c.beginPath(); c.arc(0, 0, 0.42 * PPU, 0, TAU); c.fill(); }
      else { c.beginPath(); c.arc(0, 0, 0.38 * PPU, 0, TAU); c.fill(); c.beginPath(); c.moveTo(0.2 * PPU, 0.1 * PPU); c.quadraticCurveTo(0.4 * PPU, 1.0 * PPU, -0.3 * PPU, 1.3 * PPU); c.lineTo(-0.1 * PPU, 0.9 * PPU); c.closePath(); c.fill(); }
      c.restore();
    }
    // chalk-bright pencil arrows toward the bunker and a few doodles in the streets
    hand('this way to the bunker ->', -12, -236, 1.5, -0.04, 0.4);
    hand('mind the gap!', 9, -170, 1.4, 0.06, 0.35);
    hand('no aliens', -6, -280, 1.6, 0.03, 0.4);
    pline([[-26, -278], [-22, -283], [-24, -284], [-22, -283], [-21.4, -280]], 0.2, 0.4);
    // graphite smudges
    for (let i = 0; i < 12; i++) { const x = X(-30 + r() * 56), y = Z(-172 - r() * 145), Rr = (2 + r() * 5) * PPU; const g = c.createRadialGradient(x, y, 0, x, y, Rr); g.addColorStop(0, 'rgba(90,90,100,0.10)'); g.addColorStop(1, 'rgba(90,90,100,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(x, y, Rr * 1.6, Rr, r() * 3, 0, TAU); c.fill(); }
  }
  function paintCrater(c, X, Z, r, hand, pline, w, h) {
    const I = R.ink;
    // scorch: the page browned and blistered round the blot (where the saucer's landing burnt it)
    c.save();
    for (let k = 1.32; k > 1.0; k -= 0.02) {
      const a = 0.05 + (1.32 - k) * 0.5;
      c.fillStyle = 'rgba(' + Math.round(120 - (1.32 - k) * 160) + ',' + Math.round(76 - (1.32 - k) * 110) + ',' + Math.round(40 - (1.32 - k) * 60) + ',' + a.toFixed(3) + ')';
      c.beginPath(); for (let i = 0; i <= 90; i++) { const an = i / 90 * TAU, wob = 1 + Math.sin(an * 7 + k * 9) * 0.02 + Math.sin(an * 13) * 0.012; c.lineTo(X(I.cx + Math.cos(an) * I.rx * k * wob), Z(I.cz + Math.sin(an) * I.rz * k * wob)); } c.closePath(); c.fill();
    }
    c.restore();
    // blisters and char flecks in the scorch
    for (let i = 0; i < 700; i++) {
      const an = r() * TAU, k = 1.0 + r() * r() * 0.3, x = I.cx + Math.cos(an) * I.rx * k, z = I.cz + Math.sin(an) * I.rz * k;
      c.fillStyle = r() < 0.6 ? 'rgba(40,24,16,' + (0.2 + r() * 0.4) + ')' : 'rgba(255,230,190,' + (0.15 + r() * 0.2) + ')';
      c.beginPath(); c.ellipse(X(x), Z(z), (0.05 + r() * 0.25) * PPU, (0.05 + r() * 0.18) * PPU, r() * 3, 0, TAU); c.fill();
    }
    // splashes thrown out when it landed: drops with tails pointing away from the middle
    for (let i = 0; i < 160; i++) {
      const an = r() * TAU, k = 1.03 + r() * 0.35, x = I.cx + Math.cos(an) * I.rx * k, z = I.cz + Math.sin(an) * I.rz * k, s = 0.12 + r() * r() * 0.8;
      c.fillStyle = 'rgba(22,20,48,0.9)'; c.beginPath(); c.arc(X(x), Z(z), s * PPU, 0, TAU); c.fill();
      const tl = s * (2 + r() * 4); c.strokeStyle = 'rgba(22,20,48,0.8)'; c.lineWidth = s * 0.9 * PPU; c.lineCap = 'round';
      c.beginPath(); c.moveTo(X(x), Z(z)); c.lineTo(X(x - Math.cos(an) * tl), Z(z - Math.sin(an) * tl * I.rz / I.rx)); c.stroke();
    }
    // the dry path and islands: tide marks where the ink lapped (seen at the edges, under the wet blot)
    const pts = []; for (let z = -318; z >= -482; z -= 1) pts.push([I.pathX(z), z]);
    for (const [wd, a] of [[I.pathHw * 2 + 0.6, 0.35], [I.pathHw * 2 + 0.2, 0.25]]) pline(pts, wd, 0, 'rgba(70,60,110,' + a + ')');
    pline(pts, I.pathHw * 2 - 0.3, 0, 'rgba(250,244,228,1)');
    // footprints of the paper folk who crossed before (little pairs along the dry path)
    for (let z = -322; z > -478; z -= 1.6) { const x = I.pathX(z) + Math.sin(z * 0.7) * 0.6; c.fillStyle = 'rgba(30,26,60,0.28)'; for (const s of [-0.25, 0.25]) { c.beginPath(); c.ellipse(X(x + s), Z(z + (s > 0 ? 0.4 : 0)), 0.12 * PPU, 0.22 * PPU, 0, 0, TAU); c.fill(); } }
    for (const [ix, iz, ir] of I.islands) {
      c.strokeStyle = 'rgba(70,60,110,0.35)'; c.lineWidth = 0.6 * PPU; c.beginPath(); c.ellipse(X(ix), Z(iz), (ir + 0.2) * PPU, (ir + 0.2) * PPU, 0, 0, TAU); c.stroke();
    }
    hand('DANGER: wet ink', -30, -330, 2.2, -0.05, 0.45);
    hand('do not touch!!', 22, -350, 1.8, 0.1, 0.4);
    hand('help', -38, -420, 2.6, 0.2, 0.3);
  }
  // the zigzag crayon path up the hill, through the gaps in the folded walls
  const HILLPATH = [[0, -476], [11, -488], [11, -497], [-11, -503], [-11, -512], [11, -518], [11, -527], [-11, -533], [-11, -542], [0, -552], [0, -585]];
  function paintHill(c, X, Z, r, hand, pline, w, h) {
    // the green card the hill is made of, laid over the page (it fades in where the crater's scorch ends)
    const g = c.createLinearGradient(0, h, 0, h - 10 * PPU); g.addColorStop(0, 'rgba(126,190,96,0)'); g.addColorStop(1, 'rgba(126,190,96,0.92)');
    c.fillStyle = g; c.fillRect(0, h - 10 * PPU, w, 10 * PPU);
    c.fillStyle = 'rgba(126,190,96,0.92)'; c.fillRect(0, 0, w, h - 10 * PPU);
    // crayon hatching: short strokes in three greens, every which way, thicker in patches
    for (let i = 0; i < 26000; i++) {
      const x = r() * w, y = r() * h, a = -0.7 + (r() - 0.5) * 0.8, l = (0.4 + r() * 0.9) * PPU;
      if (y > h - 8 * PPU && r() < (y - (h - 8 * PPU)) / (8 * PPU)) continue;
      c.strokeStyle = ['rgba(80,150,70,0.30)', 'rgba(160,214,110,0.32)', 'rgba(60,120,80,0.22)', 'rgba(200,230,140,0.25)'][i % 4];
      c.lineWidth = 1.2 + r() * 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
    // the path: a crayon-brown track, gone over a few times
    for (const [wd, col] of [[3.6, 'rgba(196,156,96,0.55)'], [2.8, 'rgba(214,180,120,0.65)'], [0.2, 'rgba(120,90,50,0.4)']]) pline(HILLPATH, wd, 0, col);
    for (let i = 0; i < 1400; i++) { const s = HILLPATH[Math.floor(r() * (HILLPATH.length - 1))], t2 = HILLPATH[HILLPATH.indexOf(s) + 1], k = r(); const x = s[0] + (t2[0] - s[0]) * k + (r() - 0.5) * 3, z = s[1] + (t2[1] - s[1]) * k + (r() - 0.5) * 2; c.fillStyle = r() < 0.5 ? 'rgba(150,110,60,0.35)' : 'rgba(250,236,200,0.4)'; c.fillRect(X(x), Z(z), 2 + r() * 3, 1 + r() * 2); }
    // little crayon flowers dotted over the grass
    for (let i = 0; i < 520; i++) {
      const x = -40 + r() * 68, z = -482 - r() * 128; const cx = X(x), cy = Z(z), s = (0.12 + r() * 0.14) * PPU;
      const col = ['#f7d64a', '#ff8fb4', '#ffffff', '#9fc8ff', '#ff7a5a'][i % 5];
      for (let p = 0; p < 5; p++) { const a = p / 5 * TAU; c.fillStyle = col; c.beginPath(); c.arc(cx + Math.cos(a) * s, cy + Math.sin(a) * s, s * 0.8, 0, TAU); c.fill(); }
      c.fillStyle = '#e8a030'; c.beginPath(); c.arc(cx, cy, s * 0.6, 0, TAU); c.fill();
    }
    // the arena: scuffed and trampled, crayon worn off in big round prints
    for (let i = 0; i < 14; i++) { const x = -10 + r() * 20, z = -562 - r() * 16, Rr = (0.9 + r() * 0.6) * PPU; c.save(); c.translate(X(x), Z(z)); c.rotate(r() * 3); c.strokeStyle = 'rgba(110,150,70,0.35)'; c.lineWidth = 2; for (let k = -Rr; k < Rr; k += 5) { c.beginPath(); c.moveTo(k, -Rr * 0.7); c.lineTo(k + 6, Rr * 0.7); c.stroke(); } c.restore(); }
    // a hazard ring painted round the hatch
    const hx = X(R.walker.hatch.x), hz = Z(R.walker.hatch.z);
    c.save(); c.translate(hx, hz);
    for (let i = 0; i < 24; i++) { c.fillStyle = i % 2 ? '#2a2630' : '#f2c63a'; c.beginPath(); c.arc(0, 0, 3.1 * PPU, i / 24 * TAU, (i + 1) / 24 * TAU); c.arc(0, 0, 2.5 * PPU, (i + 1) / 24 * TAU, i / 24 * TAU, true); c.closePath(); c.fill(); }
    c.restore();
    hand('BUNKER HILL', -36, -488, 3.6, -0.06, 0.5, 'bold');
    hand('keep going!', 16, -506, 1.8, 0.08, 0.4);
    hand('almost there', -24, -540, 1.8, -0.05, 0.4);
  }

  /* ---------- Letter City ---------- */
  function wordBoxes(wd) {
    const F = R.font, adv = 4 * F.LS + 0.2, out = [];
    let x = wd.x0 + 2 * F.LS + F.THICK * F.LS / 2 - 0.0;
    for (const ch of wd.wd) { for (const b of F.glyphBoxes(ch, x, wd.z, F.LS)) { b.h = F.TALL.includes(ch) ? 6.2 : 4.4; out.push(b); } x += adv; }
    return out;
  }
  function inkTex() {
    return K3D.paint('paLetterInk', 256, 256, (c, w, h) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); const r = P.rng(91);
      // printed ink close up: a soft grain, darker pools, and paper fibres catching the light at the edges
      for (let i = 0; i < 2600; i++) { c.fillStyle = r() < 0.7 ? 'rgba(0,0,0,' + (0.04 + r() * 0.08) + ')' : 'rgba(255,255,255,' + (0.06 + r() * 0.1) + ')'; c.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
      for (let i = 0; i < 40; i++) { c.strokeStyle = 'rgba(160,170,220,0.10)'; c.lineWidth = 1 + r() * 2; c.beginPath(); const x = r() * w; c.moveTo(x, 0); c.bezierCurveTo(x + (r() - 0.5) * 30, h * 0.3, x + (r() - 0.5) * 30, h * 0.7, x + (r() - 0.5) * 20, h); c.stroke(); }
    }, { repeat: true });
  }
  function letterBoxGeo() {
    return K3D.geo('paLetterBox', () => {
      const g = new T.BoxGeometry(1, 1, 1, 1, 4, 1).translate(0, 0.5, 0), p = g.attributes.position, n = g.attributes.normal, col = [];
      const lo = new T.Color('#120e1a'), hi = new T.Color('#2c2740'), top = new T.Color('#4a4466'), c = new T.Color();
      for (let i = 0; i < p.count; i++) {
        if (n.getY(i) > 0.5) c.copy(top); else c.copy(lo).lerp(hi, Math.pow(p.getY(i), 1.4));
        col.push(c.r, c.g, c.b);
      }
      g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      return g;
    });
  }
  function windowTex() {
    return K3D.paint('paWindow', 64, 96, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      // a cut-paper window: a cream frame, the pane, cross bars, a sill and a scrap of curtain
      c.fillStyle = '#f6efdc'; c.fillRect(4, 4, w - 8, h - 14);
      c.fillStyle = '#ffffff'; c.fillRect(10, 10, w - 20, h - 26);
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.moveTo(12, 12); c.lineTo(30, 12); c.lineTo(12, 40); c.fill();
      c.fillStyle = '#efe4c8'; c.fillRect(w / 2 - 2, 10, 4, h - 26); c.fillRect(10, h / 2 - 8, w - 20, 4);
      c.fillStyle = 'rgba(230,110,120,0.55)'; c.beginPath(); c.moveTo(10, 10); c.quadraticCurveTo(22, 30, 14, h - 18); c.lineTo(10, h - 18); c.fill();
      c.fillStyle = '#e8dcc0'; c.fillRect(0, h - 12, w, 6);
      c.strokeStyle = 'rgba(40,30,40,0.6)'; c.lineWidth = 2; c.strokeRect(4, 4, w - 8, h - 14);
    });
  }
  function letters(K, st) {
    const r = P.rng(4141);
    const all = [];
    for (const Lt of R.letters) for (const b of Lt.boxes) all.push({ x: b.x, z: b.z, w: b.w, d: b.d, h: Lt.h, rot: b.rot, gz: Lt.z });
    for (const w of extraWords) for (const b of wordBoxes(w)) all.push({ x: b.x, z: b.z, w: b.w, d: b.d, h: b.h, rot: b.rot, gz: w.z });
    const mat = K3D.toon('#ffffff', { map: inkTex() }); mat.vertexColors = true;
    const m = new T.InstancedMesh(letterBoxGeo(), mat, all.length);
    const gloss = new T.InstancedMesh(K3D.geo('paGlossQ', () => new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), K3D.flat('#b8c0ff', { map: glossTex(), transparent: true, opacity: 0.55, add: true, depthWrite: false }), all.length);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
    all.forEach((b, i) => {
      e.set(0, b.rot, 0); q.setFromEuler(e);
      m4.compose(v(b.x, 0, b.z), q, v(b.w, b.h, b.d)); m.setMatrixAt(i, m4);
      m4.compose(v(b.x, b.h + 0.01, b.z), q, v(b.w * 0.94, 1, b.d * 0.9)); gloss.setMatrixAt(i, m4);
    });
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    K3D.ink(m, '#07050c', 1);
    gloss.frustumCulled = false; gloss.renderOrder = 2;
    K.add(m); K.add(gloss);
    // windows and doors on the faces that look toward the camera (lit warm, a few dark, a door at the foot)
    const wins = [];
    for (const b of all) {
      const c = Math.cos(b.rot), s = Math.sin(b.rot);
      // the four faces: local +z / -z (length w) and +x / -x (length d); world normal of local (nx, nz)
      for (const [nx, nz, len, off] of [[0, 1, b.w, b.d / 2], [0, -1, b.w, b.d / 2], [1, 0, b.d, b.w / 2], [-1, 0, b.d, b.w / 2]]) {
        const wx = nx * c + nz * s, wz = -nx * s + nz * c;
        if (wz < 0.4 || len < 1.1) continue;
        const cols = Math.floor((len - 0.5) / 0.95), rows = Math.floor((b.h - 1.2) / 1.25);
        for (let ci = 0; ci < cols; ci++) for (let ri = 0; ri < rows; ri++) {
          const u = (ci - (cols - 1) / 2) * 0.95, y = 1.25 + ri * 1.25;
          // the face's own across direction: local x for the z faces, local z for the x faces
          const ax = nz ? 1 : 0, az = nz ? 0 : 1;
          const lx = nx * off * 1.0 + ax * u, lz = nz * off + az * u;
          const px = b.x + lx * c + lz * s + wx * 0.02, pz = b.z - lx * s + lz * c + wz * 0.02;
          const door = ri === 0 && ci === Math.floor(cols / 2) && r() < 0.35;
          if (!door && r() < 0.42) continue;
          wins.push({ x: px, y: door ? 0.55 : y, z: pz, yaw: Math.atan2(wx, wz), door, lit: r() < 0.7, gz: b.gz });
        }
      }
    }
    const wm = new T.InstancedMesh(K3D.geo('paWinQ', () => new T.PlaneGeometry(0.46, 0.68)), K3D.flat('#ffffff', { map: windowTex(), transparent: true, alphaTest: 0.4 }), wins.length);
    const col = new T.Color();
    wins.forEach((wn, i) => {
      e.set(0, wn.yaw, 0); q.setFromEuler(e);
      m4.compose(v(wn.x, wn.y, wn.z), q, wn.door ? v(1.2, 1.5, 1) : v(1, 1, 1)); wm.setMatrixAt(i, m4);
      wm.setColorAt(i, col.set(wn.door ? '#d8784a' : wn.lit ? ['#ffd988', '#ffe7a8', '#ffc870'][i % 3] : '#6878a8'));
    });
    wm.frustumCulled = false; K.add(wm);
    st.v3.lands.wins = { m: wm, list: wins };
    // flags on the tallest letter of every word, bunting over the gaps, lamp posts at the gaps
    const flags = [];
    const words = R.solids.filter(s => s.kind === 'word' && s.z > -320).map(s => ({ x0: s.x - s.w / 2, x1: s.x + s.w / 2, z: s.z }))
      .concat(extraWords.map(w => ({ x0: w.x0, x1: w.x1, z: w.z })));
    for (const wd of words) {
      const tall = all.filter(b => Math.abs(b.z - wd.z) < 4.5 && b.x > wd.x0 - 0.5 && b.x < wd.x1 + 0.5).sort((a, b) => b.h - a.h)[0];
      if (!tall) continue;
      flags.push({ gz: tall.gz, x: tall.x + (r() - 0.5) * 0.4, y: tall.h, z: tall.z, col: ['#e2484e', '#3f7fd0', '#f2c33c', '#5cc27f', '#f07aa0'][flags.length % 5], ph: r() * TAU });
    }
    const fg = new T.Group(); K.add(fg);
    const pole = K3D.toon('#d8d0c0'), flagMats = {};
    for (const f of flags) {
      const g = new T.Group(); g.position.set(f.x, f.y, f.z);
      const p = new T.Mesh(K3D.geo('paFlagPole', () => new T.CylinderGeometry(0.035, 0.035, 1.6, 6).translate(0, 0.8, 0)), pole); p.castShadow = true; g.add(p);
      const fm = flagMats[f.col] || (flagMats[f.col] = K3D.toon(f.col, { side: T.DoubleSide }));
      const fl = new T.Mesh(K3D.geo('paFlagTri', () => { const s = new T.Shape(); s.moveTo(0, 0); s.lineTo(0.9, -0.25); s.lineTo(0, -0.5); s.closePath(); return new T.ShapeGeometry(s).translate(0, 1.6, 0); }), fm);
      fl.castShadow = true; g.add(fl); g.userData.flag = fl; g.userData.ph = f.ph; g.userData.gz = f.gz; g.userData.y = f.y;
      fg.add(g);
    }
    st.v3.lands.flags = fg;
    // bunting: a string of triangle flags over each gap, sagging a little
    const bunt = [];
    for (const Ln of R.lines) {
      if (Ln.kind !== 'print') continue;
      for (const [g0, g1] of Ln.gaps) {
        const top = 4.1, n = 7;
        for (let i = 0; i < n; i++) {
          const k = (i + 0.5) / n, x = g0 - 0.2 + (g1 - g0 + 0.4) * k, y = top - Math.sin(k * Math.PI) * 0.7;
          bunt.push({ gz: Ln.z, x, y, z: Ln.z + Ln.hd * 0.6, col: ['#e2484e', '#f2c33c', '#3f7fd0', '#5cc27f', '#f07aa0', '#ff9a3a'][(i + bunt.length) % 6] });
        }
        bunt.push({ line: true, gz: Ln.z, x0: g0 - 0.2, x1: g1 + 0.2, y: top, z: Ln.z + Ln.hd * 0.6 });
      }
    }
    const tris = bunt.filter(b => !b.line);
    const bm = new T.InstancedMesh(K3D.geo('paBuntTri', () => { const s = new T.Shape(); s.moveTo(-0.22, 0); s.lineTo(0.22, 0); s.lineTo(0, -0.42); s.closePath(); return new T.ShapeGeometry(s); }), K3D.toon('#ffffff', { side: T.DoubleSide }), tris.length);
    tris.forEach((b, i) => { m4.compose(v(b.x, b.y, b.z), q.identity(), v(1, 1, 1)); bm.setMatrixAt(i, m4); bm.setColorAt(i, col.set(b.col)); });
    bm.castShadow = true; bm.frustumCulled = false; K.add(bm);
    const strMat = K3D.toon('#f4ecd8'), strings = [];
    for (const b of bunt.filter(b => b.line)) {
      const pts = []; for (let i = 0; i <= 12; i++) { const k = i / 12; pts.push(v(b.x0 + (b.x1 - b.x0) * k, b.y - Math.sin(k * Math.PI) * 0.7 + 0.02, b.z)); }
      const s = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.02, 4), strMat); K.add(s); strings.push({ m: s, gz: b.gz });
    }
    // lamp posts flanking every gap, on the near side of the line (they show the way through)
    const lamps = [];
    for (const Ln of R.lines) {
      if (Ln.kind !== 'print') continue;
      for (const [g0, g1] of Ln.gaps) for (const x of [g0 - 0.15, g1 + 0.15]) lamps.push({ x, z: Ln.z + Ln.hd + 0.35 });
    }
    const postM = new T.InstancedMesh(K3D.geo('paLampPost', () => {
      const a = new T.CylinderGeometry(0.06, 0.09, 2.6, 8).translate(0, 1.3, 0), b = new T.CylinderGeometry(0.16, 0.2, 0.12, 10).translate(0, 0.06, 0), c = new T.TorusGeometry(0.22, 0.03, 6, 12, Math.PI).rotateZ(Math.PI / 2).translate(0.0, 2.6, 0);
      return mergeGeos([a, b, c]);
    }), K3D.toon('#3a3448'), lamps.length);
    const bulbM = new T.InstancedMesh(K3D.geo('paLampBulb', () => new T.SphereGeometry(0.2, 12, 8)), K3D.flat('#ffe4a0'), lamps.length);
    lamps.forEach((l, i) => { m4.compose(v(l.x, 0, l.z), q.identity(), v(1, 1, 1)); postM.setMatrixAt(i, m4); m4.compose(v(l.x, 2.62, l.z), q, v(1, 1.25, 1)); bulbM.setMatrixAt(i, m4); });
    postM.castShadow = true; postM.frustumCulled = bulbM.frustumCulled = false; K3D.ink(postM, '#1a1622', 0.8);
    K.add(postM); K.add(bulbM);
    // their glow: a halo round the bulb and a warm pool on the page
    const halo = new T.InstancedMesh(K3D.geo('paHaloQ', () => new T.PlaneGeometry(1, 1)), K3D.flat('#ffd890', { map: softTex(), transparent: true, opacity: 0.55, add: true, depthWrite: false }), lamps.length);
    const pool = new T.InstancedMesh(K3D.geo('paGlossQ', () => new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), K3D.flat('#ffcc80', { map: softTex(), transparent: true, opacity: 0.3, add: true, depthWrite: false }), lamps.length);
    lamps.forEach((l, i) => { m4.compose(v(l.x, 0.02, l.z + 0.4), q.identity(), v(4, 1, 3.4)); pool.setMatrixAt(i, m4); });
    halo.frustumCulled = pool.frustumCulled = false; halo.renderOrder = 7; pool.renderOrder = 2; halo.count = 0;
    K.add(halo); K.add(pool);
    st.v3.lands.lamps = { list: lamps, halo };
    // once the pair is past a line, its letters press down flat into the page (a pop-up folding away), so the
    // buildings between the camera and the heroes never hide them; they stand up again if the heroes go back
    const groups = new Map();
    const G2 = gz => { if (!groups.has(gz)) { const Ln = R.lines.find(l => l.z === gz); groups.set(gz, { gz, hd: Ln ? Ln.hd : 3.9, k: 0, shown: 0, boxes: [], wins: [], tris: [], strings: [], flags: [] }); } return groups.get(gz); };
    all.forEach((b, i) => G2(b.gz).boxes.push(i));
    wins.forEach((w, i) => G2(w.gz).wins.push(i));
    tris.forEach((b, i) => G2(b.gz).tris.push(i));
    strings.forEach(sg => G2(sg.gz).strings.push(sg.m));
    for (const f of fg.children) G2(f.userData.gz).flags.push(f);
    st.v3.lands.city = { m, gloss, all, wm, wins, bm, tris, groups: [...groups.values()] };
  }
  function mergeGeos(gs) {
    // a small merge (positions, normals, uvs) for a handful of non-indexed or indexed geometries
    const pos = [], nor = [], uv = [];
    for (const g0 of gs) {
      const g = g0.index ? g0.toNonIndexed() : g0;
      pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); uv.push(...(g.attributes.uv ? g.attributes.uv.array : new Float32Array(g.attributes.position.count * 2)));
    }
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); out.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    return out;
  }
  const softTex = () => K3D.paint('paSoftDot', 128, 128, (c, w, h) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const glossTex = () => K3D.paint('paInkGloss', 128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    // a wet shine: a soft streak along the top and a bright edge where the light catches the lip
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.45, 'rgba(255,255,255,0.35)'); g.addColorStop(0.55, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(0, 0, w, 6); c.fillRect(0, 0, 5, h);
  });

  /* ---------- the "!" and its line of holes ---------- */
  function bang(K, st) {
    const B = R.bang, g = new T.Group();
    g.position.set(B.x, 0, B.z);
    const ink = K3D.toon('#1d1828', { map: inkTex() }), edge = K3D.toon('#f4ecd8');
    // a thick card cut-out: a bar wider at the top, the dot below (the bar lies over the holes as a bridge)
    const bar = new T.Shape(); bar.moveTo(-0.55, 1.7); bar.lineTo(0.55, 1.7); bar.lineTo(0.9, B.h - 0.5); bar.quadraticCurveTo(0.9, B.h, 0, B.h); bar.quadraticCurveTo(-0.9, B.h, -0.9, B.h - 0.5); bar.closePath();
    const ex = { depth: 0.28, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 10 };
    const barM = K3D.mesh(new T.ExtrudeGeometry(bar, ex).translate(0, 0, -0.14), [ink, edge], { ink: '#06040a', inkW: 1.1 });
    const dot = new T.Shape(); dot.absarc(0, 0.78, 0.72, 0, TAU, false);
    const dotM = K3D.mesh(new T.ExtrudeGeometry(dot, ex).translate(0, 0, -0.14), [ink, edge], { ink: '#06040a', inkW: 1.1 });
    g.add(barM); g.add(dotM);
    // a gloss on its face and little paper props: a ladder leaning on it and a doodled "!!" sign
    const sh = new T.Mesh(K3D.geo('paBangGloss', () => new T.PlaneGeometry(0.5, B.h - 3).translate(-0.3, B.h / 2 + 0.6, 0.16)), K3D.flat('#c0c8ff', { map: glossTex(), transparent: true, opacity: 0.4, add: true, depthWrite: false }));
    g.add(sh);
    const tab = P.tab(1.8, 0.5); tab.position.set(0, 0.005, 0.4); g.add(tab);
    K.add(g);
    // the perforated trench: a dark slot with torn paper lips curling up on both sides
    const H = R.bang, len = 34.4;
    const slotTex = K3D.paint('paTrench', 512, 64, (c, w, h) => {
      const gg = c.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, '#f2e8d2'); gg.addColorStop(0.18, '#3a2a30'); gg.addColorStop(0.5, '#08060c'); gg.addColorStop(0.82, '#3a2a30'); gg.addColorStop(1, '#f2e8d2');
      c.fillStyle = gg; c.fillRect(0, 0, w, h);
      const r = P.rng(13);
      for (let x = 0; x < w; x += 3) { c.fillStyle = '#f4ecd8'; c.fillRect(x, 0, 3, 4 + r() * 8); c.fillRect(x, h - 4 - r() * 8, 3, 12); }
    });
    const slot = new T.Mesh(new T.PlaneGeometry(len, H.holesHw * 2 + 0.5).rotateX(-Math.PI / 2), K3D.flat('#ffffff', { map: slotTex, transparent: true, depthWrite: false }));
    slot.material.polygonOffset = true; slot.material.polygonOffsetFactor = -3; slot.material.polygonOffsetUnits = -3;
    slot.position.set(0, 0.012, H.holesZ); slot.renderOrder = 2; K.add(slot);
    const lips = []; const r = P.rng(17);
    for (let x = -len / 2; x < len / 2; x += 0.32) for (const s of [-1, 1]) lips.push({ x: x + r() * 0.2, z: H.holesZ + s * (H.holesHw + 0.05), s, tilt: 0.4 + r() * 0.7, w: 0.3 + r() * 0.25 });
    const lm = new T.InstancedMesh(K3D.geo('paLipQ', () => new T.PlaneGeometry(1, 0.28).translate(0, 0.14, 0)), K3D.toon('#f4ecd8', { side: T.DoubleSide }), lips.length);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
    lips.forEach((l, i) => { e.set(-l.s * (Math.PI / 2 - l.tilt), 0, 0); q.setFromEuler(e); m4.compose(v(l.x, 0, l.z), q, v(l.w, 1, 1)); lm.setMatrixAt(i, m4); });
    lm.castShadow = true; lm.receiveShadow = true; lm.frustumCulled = false; K.add(lm);
    st.v3.lands.bang = { g, hits: 0, wob: 0 };
  }

  /* ---------- the Ink Crater ---------- */
  const IPPU = 10;
  function inkMask(c, w, h, fill) {
    const I = R.ink, X = x => (x - (I.cx - I.rx - 2)) * IPPU, Z = z => (z - (I.cz - I.rz - 2)) * IPPU, r = P.rng(64);
    c.clearRect(0, 0, w, h);
    c.fillStyle = fill;
    c.beginPath();
    for (let i = 0; i <= 160; i++) { const a = i / 160 * TAU, wob = 1 + Math.sin(a * 9) * 0.006 + Math.sin(a * 23 + 1) * 0.004; c.lineTo(X(I.cx + Math.cos(a) * I.rx * wob), Z(I.cz + Math.sin(a) * I.rz * wob)); }
    c.closePath(); c.fill();
    // the dry parts cut out: the winding path, the islands and the blotter strips at the bookmarks
    c.globalCompositeOperation = 'destination-out';
    c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = I.pathHw * 2 * IPPU; c.strokeStyle = '#000';
    c.beginPath(); for (let z = -316; z >= -484; z -= 0.5) { const x = I.pathX(z); if (z === -316) c.moveTo(X(x), Z(z)); else c.lineTo(X(x), Z(z)); } c.stroke();
    for (const [ix, iz, ir] of I.islands) { c.beginPath(); c.arc(X(ix), Z(iz), ir * IPPU, 0, TAU); c.fill(); }
    for (const ck of R.checks) if (ck.z < -320 && ck.z > -480) c.fillRect(0, Z(ck.z - 2.5), w, 5 * IPPU);
    c.globalCompositeOperation = 'source-over';
  }
  function inkMesh(K, st) {
    const I = R.ink, w = Math.round((I.rx + 2) * 2 * IPPU), h = Math.round((I.rz + 2) * 2 * IPPU);
    const colTex = K3D.paint('paInkBlot', w, h, (c) => {
      inkMask(c, w, h, '#161432');
      // marbled swirls in the ink, deeper pools, and a lighter wet rim along every edge
      c.globalCompositeOperation = 'source-atop';
      const r = P.rng(65);
      for (let i = 0; i < 260; i++) { c.strokeStyle = r() < 0.5 ? 'rgba(60,56,120,0.22)' : 'rgba(10,8,24,0.35)'; c.lineWidth = 2 + r() * 10; c.beginPath(); const x = r() * w, y = r() * h; c.moveTo(x, y); for (let k = 0; k < 4; k++) c.quadraticCurveTo(x + (r() - 0.5) * 300, y + (r() - 0.5) * 300, x + (r() - 0.5) * 260, y + (r() - 0.5) * 260); c.stroke(); }
      c.filter = 'blur(6px)';
      const I2 = R.ink, X = x => (x - (I2.cx - I2.rx - 2)) * IPPU, Z = z => (z - (I2.cz - I2.rz - 2)) * IPPU;
      c.strokeStyle = 'rgba(120,120,200,0.55)'; c.lineWidth = (I2.pathHw * 2 + 0.8) * IPPU; c.lineCap = 'round';
      c.beginPath(); for (let z = -316; z >= -484; z -= 0.5) c.lineTo(X(I2.pathX(z)), Z(z)); c.stroke();
      for (const [ix, iz, ir] of I2.islands) { c.beginPath(); c.arc(X(ix), Z(iz), (ir + 0.4) * IPPU, 0, TAU); c.stroke(); }
      c.lineWidth = 1.2 * IPPU; c.beginPath(); c.ellipse(X(I2.cx), Z(I2.cz), I2.rx * IPPU, I2.rz * IPPU, 0, 0, TAU); c.stroke();
      c.filter = 'none'; c.globalCompositeOperation = 'source-over';
    });
    const maskTex = K3D.paint('paInkMask', w, h, (c) => inkMask(c, w, h, '#ffffff'));
    const geo = new T.PlaneGeometry(w / IPPU, h / IPPU).rotateX(-Math.PI / 2);
    const ink = new T.Mesh(geo, K3D.toon('#ffffff', { map: colTex, transparent: true, alphaTest: 0.5, polygonOffset: -2 }));
    ink.position.set(I.cx, 0.02, I.cz); ink.receiveShadow = true; ink.renderOrder = 2; K.add(ink);
    // the wet shine: ripples sliding slowly over it, and the lamp's reflection
    const rip = K3D.paint('paInkRipple', 256, 256, (c, ww, hh) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, ww, hh); const r = P.rng(66);
      for (let i = 0; i < 70; i++) { c.strokeStyle = 'rgba(255,255,255,' + (0.1 + r() * 0.35) + ')'; c.lineWidth = 1 + r() * 2.5; c.beginPath(); const y = r() * hh, x = r() * ww, l = 20 + r() * 80; c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y + (r() - 0.5) * 12, x + l, y); c.stroke(); }
    }, { repeat: true });
    rip.repeat.set(10, 16);
    const sheenMat = K3D.flat('#8a9cff', { map: rip, transparent: true, opacity: 0.5, add: true, depthWrite: false });
    sheenMat.alphaMap = maskTex; sheenMat.polygonOffset = true; sheenMat.polygonOffsetFactor = -4; sheenMat.polygonOffsetUnits = -4;
    const sheen = new T.Mesh(geo, sheenMat); sheen.position.set(I.cx, 0.025, I.cz); sheen.renderOrder = 3; K.add(sheen);
    const refl = new T.Mesh(K3D.geo('paGlossQ', () => new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), K3D.flat('#ffe8b0', { map: softTex(), transparent: true, opacity: 0.0, add: true, depthWrite: false }));
    refl.material.alphaMap = null; refl.scale.set(14, 1, 26); refl.renderOrder = 4; K.add(refl);
    // pink blotting paper laid across at the bookmarks (dry ground to restart on), soaking the ink up at its edges
    const blotTex = K3D.paint('paBlotter', 512, 64, (c, ww, hh) => {
      c.fillStyle = '#f2b8c6'; c.fillRect(0, 0, ww, hh); const r = P.rng(67);
      for (let i = 0; i < 900; i++) { c.fillStyle = 'rgba(255,255,255,' + r() * 0.2 + ')'; c.fillRect(r() * ww, r() * hh, 1 + r() * 2, 1); }
      for (let i = 0; i < 60; i++) { const x = r() * ww, y = r() < 0.5 ? r() * 10 : hh - r() * 10; const g = c.createRadialGradient(x, y, 0, x, y, 6 + r() * 14); g.addColorStop(0, 'rgba(40,40,110,0.75)'); g.addColorStop(1, 'rgba(40,40,110,0)'); c.fillStyle = g; c.fillRect(x - 20, y - 20, 40, 40); }
    });
    for (const ck of R.checks) {
      if (!(ck.z < -320 && ck.z > -480)) continue;
      const ez = (ck.z - I.cz) / I.rz, half = I.rx * Math.sqrt(Math.max(0, 1 - ez * ez)) + 1.5;
      const b = K3D.mesh(new T.BoxGeometry(half * 2, 0.06, 5.2), K3D.toon('#ffffff', { map: blotTex }), { ink: '#8a4a5a', inkW: 0.8 });
      b.position.set(I.cx, 0.04, ck.z); b.receiveShadow = true; K.add(b);
    }
    // singed curls standing round the rim
    const curls = [], r = P.rng(68);
    for (let i = 0; i < 240; i++) { const a = r() * TAU, k = 1.01 + r() * r() * 0.22; const x = I.cx + Math.cos(a) * I.rx * k, z = I.cz + Math.sin(a) * I.rz * k; if (z > -318 || z < -482) continue; if (Math.abs(x - I.pathX(z)) < I.pathHw + 1) continue; curls.push({ x, z, s: 0.3 + r() * 0.8, yaw: r() * TAU, tilt: 0.2 + r() * 0.6 }); }
    const cg = K3D.geo('paCurl', () => { const g = new T.PlaneGeometry(1, 0.7, 6, 1).translate(0, 0.35, 0), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin(x * 2.5) * 0.18 + y * y * 0.6); } g.computeVertexNormals(); return g; });
    const cm = new T.InstancedMesh(cg, K3D.toon('#ffffff', { side: T.DoubleSide, map: curlTex() }), curls.length);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), col = new T.Color();
    curls.forEach((cu, i) => { e.set(cu.tilt, cu.yaw, 0); q.setFromEuler(e); m4.compose(v(cu.x, 0, cu.z), q, v(cu.s, cu.s, cu.s)); cm.setMatrixAt(i, m4); cm.setColorAt(i, col.setScalar(0.75 + r() * 0.3)); });
    cm.castShadow = true; cm.frustumCulled = false; K.add(cm);
    // bubbles that swell up out of the ink and pop; wisps of smoke curling off the scorched rim
    const NB = 26;
    const bub = new T.InstancedMesh(K3D.geo('paBubble', () => new T.SphereGeometry(1, 16, 10, 0, TAU, 0, Math.PI / 2)), K3D.toon('#2a2658', { emissive: '#14123a', emissiveIntensity: 0.4 }), NB);
    bub.frustumCulled = false; bub.count = 0; K.add(bub);
    const glint = new T.InstancedMesh(K3D.geo('paHaloQ', () => new T.PlaneGeometry(1, 1)), K3D.flat('#c8d0ff', { map: softTex(), transparent: true, opacity: 0.8, add: true, depthWrite: false }), NB);
    glint.frustumCulled = false; glint.count = 0; glint.renderOrder = 6; K.add(glint);
    const NS = 16;
    const smoke = new T.InstancedMesh(K3D.geo('paHaloQ', () => new T.PlaneGeometry(1, 1)), K3D.flat('#8a7a70', { map: softTex(), transparent: true, opacity: 0.22, depthWrite: false }), NS);
    smoke.frustumCulled = false; smoke.count = 0; smoke.renderOrder = 6; K.add(smoke);
    st.v3.lands.ink = { sheen, rip, refl, bub, glint, smoke, bubP: [], smokeP: Array.from({ length: NS }, (_, i) => ({ t: i / NS * 6, life: 6 })) };
  }
  const curlTex = () => K3D.paint('paCurlTex', 128, 96, (c, w, h) => {
    const g = c.createLinearGradient(0, h, 0, 0); g.addColorStop(0, '#5a3a24'); g.addColorStop(0.55, '#b88a56'); g.addColorStop(0.85, '#2a1a12'); g.addColorStop(1, '#120a08');
    c.fillStyle = g; c.fillRect(0, 0, w, h); const r = P.rng(3);
    for (let i = 0; i < 200; i++) { c.fillStyle = 'rgba(20,10,6,' + r() * 0.5 + ')'; c.fillRect(r() * w, r() * h * 0.5, 2 + r() * 4, 1 + r() * 3); }
    c.fillStyle = 'rgba(255,140,40,0.7)'; for (let x = 0; x < w; x += 4) c.fillRect(x, 0, 3, 1 + r() * 3);
  });

  /* ---------- Bunker Hill ---------- */
  const cardTex = (key, base, seed) => K3D.paint(key, 256, 256, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h); const r = P.rng(seed);
    for (let i = 0; i < 1600; i++) { const x = r() * w, y = r() * h, a = -0.7 + (r() - 0.5) * 0.6, l = 6 + r() * 14; c.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(0,40,20,0.12)'; c.lineWidth = 1 + r() * 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  }, { repeat: true });
  // an accordion-folded wall of card: pleats along its length, a white cut edge on top
  function foldWall(s, colr, seed) {
    const x0 = s.x - s.w / 2, x1 = s.x + s.w / 2, n = Math.max(2, Math.round((x1 - x0) / 0.9)), H = s.h, D = s.d * 0.42;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, z = (i % 2 ? D : -D);
      pos.push(x, 0, z, x, H, z); uv.push(x * 0.25, 0, x * 0.25, H * 0.25);
      if (i < n) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const tex = cardTex('paFoldCard' + seed, colr, 300 + seed);
    const m = K3D.mesh(g.toNonIndexed(), K3D.toon('#ffffff', { map: tex, side: T.DoubleSide }), { ink: '#2a4a30', inkW: 1 });
    m.geometry.computeVertexNormals();
    m.position.set(0, 0, s.z);
    // a white top edge and paper fasteners where it is glued to the page
    const grp = new T.Group(); grp.add(m);
    const tpts = []; for (let i = 0; i <= n; i++) tpts.push(v(x0 + (x1 - x0) * i / n, H, s.z + (i % 2 ? D : -D)));
    grp.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(tpts, false, 'catmullrom', 0), n * 4, 0.05, 4), K3D.toon('#f8f2e2')));
    for (let i = 1; i < n; i += 3) { const f = P.fastener(0.08); f.position.set(x0 + (x1 - x0) * i / n, 0.2, s.z + (i % 2 ? D : -D) + 0.05); grp.add(f); }
    return grp;
  }
  // a pop-up terrace: a layer of green card with a wavy edge, the cut edge cream
  function terrace(pts, y, hgt, colr, seed) {
    const sh = new T.Shape(); pts.forEach(([x, z], i) => i ? sh.lineTo(x, -z) : sh.moveTo(x, -z));
    const g = new T.ExtrudeGeometry(sh, { depth: hgt, bevelEnabled: false, curveSegments: 4 });
    g.rotateX(-Math.PI / 2); // shape x/y -> world x/-z; depth -> +y
    const top = K3D.toon('#ffffff', { map: cardTex('paTerr' + seed, colr, 400 + seed) });
    const m = K3D.mesh(g, [top, K3D.mat('paTerrEdge', () => K3D.toon('#d6e4b4', { map: cardTex('paTerrEdgeT', '#d6e4b4', 7) }))], { ink: '#2f5a34', inkW: 1 });
    m.position.y = y; m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function hill(K, st) {
    const deco = new T.Group(); K.add(deco);
    const greens = ['#86c46a', '#6cb47a', '#9ed06a', '#5aa880', '#b4da7a', '#78bc66'];
    R.solids.filter(s => s.kind === 'fold').forEach((s, i) => deco.add(foldWall(s, greens[i % greens.length], i)));
    // the terraces beside the path, stepping up toward the hilltop; and the hilltop itself behind the bunker
    const r = P.rng(71);
    const wavy = (x0, x1, z, amp, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const x = x0 + (x1 - x0) * i / n; return [x, z + Math.sin(x * 0.45 + z) * amp + (r() - 0.5) * amp * 0.4]; });
    for (const sd of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const xin = sd * (21 + i * 2.4), xout = sd * 75, zf = -478 - i * 14;
        const pts = [];
        // the front edge (wavy), then round the outside and back along the path side (wavy too)
        wavy(xin, xout, zf, 1.2, 10).forEach(p => pts.push(p));
        pts.push([xout, -640]); pts.push([xin, -640]);
        for (let k = 0; k <= 20; k++) { const z = zf - (640 + zf) * (1 - k / 20); pts.push([xin + sd * Math.sin(z * 0.3) * 0.8, z]); }
        const m = terrace(sd > 0 ? pts : pts.slice().reverse(), i * 1.05, 1.05, greens[(i + (sd > 0 ? 1 : 3)) % greens.length], i + (sd > 0 ? 10 : 20));
        deco.add(m);
      }
    }
    for (let i = 0; i < 5; i++) {
      const zf = -603 - i * 3.2, pts = wavy(-75, 75, zf, 0.9, 30);
      pts.push([75, -660]); pts.push([-75, -660]);
      deco.add(terrace(pts, i * 1.2, 1.2, greens[(i + 2) % greens.length], 30 + i));
    }
    // card trees and bushes popping up on the terraces (big doodles on folded tabs)
    for (let i = 0; i < 26; i++) {
      const sd = i % 2 ? 1 : -1, x = sd * (23 + r() * 30), z = -490 - r() * 110;
      let n = 0; for (let k = 0; k < 6; k++) if (Math.abs(x) > 21 + k * 2.4 + 1 && z < -478 - k * 14 - 1.5) n = k + 1;
      const tr = P.tree(x, z, 1.2 + r() * 1.3, 50 + i); tr.position.y = n * 1.05; deco.add(tr);
    }
    // the bunker: a domed shelter of folded card, painted in camouflage, dug into the hilltop
    const B = R.bunker, bk = new T.Group(); bk.position.set(B.x, 0, B.z);
    const camo = K3D.paint('paCamo', 512, 256, (c, w, h) => {
      c.fillStyle = '#7a8a4a'; c.fillRect(0, 0, w, h); const rr = P.rng(72);
      for (let i = 0; i < 70; i++) { c.fillStyle = ['#5a6a38', '#9aa060', '#4a4a2a', '#8a9a58'][i % 4]; c.beginPath(); const x = rr() * w, y = rr() * h; for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, d = 14 + rr() * 26; c.lineTo(x + Math.cos(a) * d * 1.6, y + Math.sin(a) * d); } c.fill(); }
      // panel seams of the folded card
      for (let x = 0; x < w; x += w / 12) { c.fillStyle = 'rgba(40,40,20,0.35)'; c.fillRect(x, 0, 2, h); }
      for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(220,220,200,0.6)'; c.beginPath(); c.arc(rr() * w, rr() * h, 2, 0, TAU); c.fill(); }
    }, { repeat: true });
    const dome = K3D.mesh(new T.SphereGeometry(B.r, 12, 6, 0, TAU, 0, Math.PI / 2), K3D.toon('#ffffff', { map: camo, flat: true }), { ink: '#2a3018', inkW: 1.2 });
    dome.material.flatShading = true; dome.scale.set(1, 0.95, 0.78); bk.add(dome);
    // the doorway: a short tunnel with a riveted foil door and a round window lit from inside
    const tunnel = K3D.mesh(K3D.roundBox(3.2, 3, 2.2, 0.3, 20), K3D.toon('#6a7a42', { map: camo }), { ink: '#2a3018', inkW: 1.1 });
    tunnel.position.set(0, 1.5, B.r * 0.78 - 0.6); bk.add(tunnel);
    const doorTex = K3D.paint('paBunkerDoor', 256, 256, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#d8dde6'); g.addColorStop(0.5, '#8a909c'); g.addColorStop(1, '#c4c9d4');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let x = 16; x < w; x += 32) for (const y of [14, h - 14]) { c.fillStyle = '#5a606c'; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill(); }
      c.fillStyle = '#ffd56a'; c.beginPath(); c.arc(w / 2, h * 0.36, 40, 0, TAU); c.fill();
      c.strokeStyle = '#4a505c'; c.lineWidth = 8; c.stroke();
      c.fillStyle = '#2a2a30'; c.font = 'bold 34px "Comic Sans MS", cursive'; c.textAlign = 'center'; c.fillText('KEEP OUT', w / 2, h * 0.78);
      c.fillStyle = '#e2484e'; c.font = 'bold 22px "Comic Sans MS", cursive'; c.fillText('(aliens)', w / 2, h * 0.9);
    });
    const door = new T.Mesh(new T.PlaneGeometry(2.3, 2.5), K3D.toon('#ffffff', { map: doorTex })); door.position.set(0, 1.35, B.r * 0.78 + 0.52); bk.add(door);
    // sandbags (stuffed paper bags) round the front
    const bagM = K3D.toon('#d8c49a', { map: cardTex('paBag', '#d8c49a', 9) });
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * (0.12 + i / 15 * 0.76), row = i % 2, rr2 = B.r + 0.9;
      const bag = K3D.mesh(K3D.geo('paBagGeo', () => new T.CapsuleGeometry(0.42, 0.9, 6, 12).rotateZ(Math.PI / 2)), bagM, { ink: '#6a5a3a', inkW: 0.8 });
      bag.position.set(Math.cos(a) * rr2, 0.3 + row * 0.5, Math.sin(a) * rr2 * 0.82); bag.rotation.y = -a + Math.PI / 2; bag.scale.set(1, 0.7, 0.9);
      if (Math.abs(bag.position.x) < 2.2) continue;
      bk.add(bag);
    }
    // a periscope on top, an aerial with a blinking light, a flag
    const peri = new T.Group(); peri.position.set(1.2, B.r * 0.95 - 0.2, -0.6);
    const tube = K3D.mesh(new T.CylinderGeometry(0.16, 0.16, 2.2, 10).translate(0, 1.1, 0), PAGEAR.foilMat(), { ink: '#3a404c', inkW: 0.8 }); peri.add(tube);
    const head = K3D.mesh(new T.BoxGeometry(0.36, 0.36, 0.8).translate(0, 2.3, 0.2), PAGEAR.foilMat(), { ink: '#3a404c', inkW: 0.8 }); peri.add(head);
    const lens = new T.Mesh(new T.CircleGeometry(0.13, 16), K3D.flat('#9fd8ff')); lens.position.set(0, 2.3, 0.61); peri.add(lens);
    bk.add(peri);
    const aerial = K3D.mesh(new T.CylinderGeometry(0.03, 0.05, 3.2, 6).translate(0, 1.6, 0), K3D.toon('#4a4a52'), { ink: '#22222a', inkW: 0.6 }); aerial.position.set(-1.8, B.r * 0.9 - 0.4, -0.5); bk.add(aerial);
    const blink = new T.Mesh(new T.SphereGeometry(0.14, 10, 8), K3D.flat('#ff4a3a')); blink.position.set(-1.8, B.r * 0.9 + 2.85, -0.5); bk.add(blink);
    // the sign on a post
    const signTex = K3D.paint('paBunkerSign', 256, 160, (c, w, h) => {
      c.fillStyle = '#f2e6c4'; c.fillRect(0, 0, w, h); c.strokeStyle = '#7a5a36'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
      c.fillStyle = '#2a2630'; c.font = 'bold 50px "Comic Sans MS", cursive'; c.textAlign = 'center'; c.fillText('BUNKER', w / 2, 66);
      c.font = '26px "Comic Sans MS", cursive'; c.fillText('safe from aliens', w / 2, 106); c.fillText('(we hope!)', w / 2, 138);
    });
    const sign = new T.Group(); sign.position.set(-5.6, 0, B.r * 0.78 + 2.2);
    sign.add(K3D.mesh(new T.BoxGeometry(0.18, 2.6, 0.18).translate(0, 1.3, 0), K3D.toon('#9a6a3e'), { ink: '#4a3020', inkW: 0.8 }));
    const board = K3D.mesh(new T.BoxGeometry(2.6, 1.6, 0.1), [K3D.toon('#e8dcc0'), K3D.toon('#e8dcc0'), K3D.toon('#e8dcc0'), K3D.toon('#e8dcc0'), K3D.toon('#ffffff', { map: signTex }), K3D.toon('#e8dcc0')], { ink: '#4a3020', inkW: 0.9 });
    board.position.set(0, 2.4, 0.1); board.rotation.y = 0.25; sign.add(board);
    bk.add(sign);
    K.add(bk);
    // the hatch: a round foil lid with a red wheel, on a hinge at the back; light spills out when it opens
    const Hh = R.walker.hatch, hatch = new T.Group(); hatch.position.set(Hh.x, 0, Hh.z);
    const pit = new T.Mesh(new T.CircleGeometry(2.1, 40).rotateX(-Math.PI / 2), K3D.flat('#ffcf7a')); pit.position.y = 0.015; pit.visible = false; hatch.add(pit);
    const rungs = new T.Group(); for (let i = 0; i < 4; i++) { const rg = new T.Mesh(new T.BoxGeometry(1.4, 0.06, 0.1), K3D.flat('#8a5a2a')); rg.position.set(0, 0.02, -1.2 + i * 0.35); rungs.add(rg); } rungs.visible = false; hatch.add(rungs);
    const hinge = new T.Group(); hinge.position.set(0, 0.05, -2.05); hatch.add(hinge);
    const lid = K3D.mesh(new T.CylinderGeometry(2.05, 2.1, 0.14, 40).translate(0, 0.07, 2.05), PAGEAR.foilMat(), { ink: '#3a404c', inkW: 1 }); hinge.add(lid);
    const rivets = new T.InstancedMesh(K3D.geo('paRivet', () => new T.SphereGeometry(0.07, 8, 6)), K3D.toon('#9aa0ac'), 20);
    for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; rivets.setMatrixAt(i, new T.Matrix4().makeTranslation(Math.cos(a) * 1.85, 0.15, 2.05 + Math.sin(a) * 1.85)); }
    hinge.add(rivets);
    const wheel = new T.Group(); wheel.position.set(0, 0.2, 2.05); hinge.add(wheel);
    const red = K3D.toon('#d83a3a');
    wheel.add(K3D.mesh(new T.TorusGeometry(0.85, 0.08, 8, 30).rotateX(Math.PI / 2), red, { ink: '#5a1414', inkW: 0.8 }));
    for (let i = 0; i < 3; i++) { const sp = K3D.mesh(new T.BoxGeometry(1.7, 0.08, 0.1), red, { ink: '#5a1414', inkW: 0.6 }); sp.rotation.y = i * Math.PI / 3; wheel.add(sp); }
    wheel.add(K3D.mesh(new T.CylinderGeometry(0.2, 0.2, 0.16, 12), red, { ink: '#5a1414', inkW: 0.6 }));
    const ring = new T.Mesh(new T.RingGeometry(2.2, 2.9, 48).rotateX(-Math.PI / 2), K3D.flat('#ffe08a', { transparent: true, opacity: 0, add: true, depthWrite: false })); ring.position.y = 0.03; ring.renderOrder = 4; hatch.add(ring);
    const shaft = new T.Mesh(new T.CylinderGeometry(3.2, 2.0, 6, 32, 1, true).translate(0, 3, 0), K3D.flat('#ffd890', { map: shaftTex(), transparent: true, opacity: 0, add: true, depthWrite: false, side: T.DoubleSide })); shaft.renderOrder = 5; hatch.add(shaft);
    K.add(hatch);
    st.v3.lands.hill = { peri, blink, hatch: { g: hatch, hinge, wheel, ring, pit, rungs, shaft, open: 0, spin: 0 } };
  }
  const shaftTex = () => K3D.paint('paShaft', 64, 128, (c, w, h) => { const g = c.createLinearGradient(0, h, 0, 0); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });

  /* ---------- the Scribble Walker ---------- */
  const WW = 6.8, WH = 4.4;   // the sheet (PA_WALK.half is half its width)
  function walkerTex() {
    return K3D.paint('paWalkerSheet', 512, 384, () => {});
  }
  // repaint the sheet: the scribble, the face, rubbed-out patches (by how much has been rubbed) and torn notches
  function paintWalker(tex, rubK, phase, seedSpots) {
    const c = tex.image.getContext('2d'), w = 512, h = 384, r = P.rng(81);
    c.clearRect(0, 0, w, h);
    // the sheet itself: off-white paper with a deckled edge
    c.fillStyle = '#f8f2e2'; c.beginPath(); for (let i = 0; i <= 40; i++) c.lineTo(i / 40 * w, 3 + r() * 5); for (let i = 0; i <= 30; i++) c.lineTo(w - 3 - r() * 5, i / 30 * h); for (let i = 40; i >= 0; i--) c.lineTo(i / 40 * w, h - 3 - r() * 5); for (let i = 30; i >= 0; i--) c.lineTo(3 + r() * 5, i / 30 * h); c.closePath(); c.fill();
    // the scribble: crayon loops in three colours, thick and waxy, piled up into a furious tangle
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [col, n, wd] of [['#6a3fa0', 70, 9], ['#3f9a5a', 50, 7], ['#e0503a', 40, 6], ['#2a2440', 30, 4]]) {
      for (let i = 0; i < n; i++) {
        c.strokeStyle = col; c.globalAlpha = 0.8; c.lineWidth = wd * (0.7 + r() * 0.6);
        let x = 40 + r() * (w - 80), y = 30 + r() * (h - 60);
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 6; k++) { const a = r() * TAU, d = 30 + r() * 70; const nx = clamp(x + Math.cos(a) * d, 20, w - 20), ny = clamp(y + Math.sin(a) * d, 20, h - 20); c.quadraticCurveTo(x + (r() - 0.5) * 120, y + (r() - 0.5) * 120, nx, ny); x = nx; y = ny; }
        c.stroke();
      }
    }
    c.globalAlpha = 1;
    // waxy crayon texture: little gaps where the crayon skipped over the paper grain
    for (let i = 0; i < 3000; i++) { c.fillStyle = 'rgba(248,242,226,0.55)'; c.fillRect(r() * w, r() * h, 1 + r() * 2, 1); }
    // rubbed out: patches where the bolts have worn the crayon back to paper (pink eraser smears at the edges)
    const n = Math.floor(rubK * seedSpots.length);
    for (let i = 0; i < n; i++) {
      const s = seedSpots[i];
      const g = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
      g.addColorStop(0, 'rgba(250,246,234,1)'); g.addColorStop(0.7, 'rgba(250,240,230,0.92)'); g.addColorStop(1, 'rgba(240,190,200,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(s.x, s.y, s.r * 1.3, s.r, s.a, 0, TAU); c.fill();
      for (let k = 0; k < 8; k++) { c.strokeStyle = 'rgba(200,160,170,0.35)'; c.lineWidth = 1.5; c.beginPath(); const a = s.a + (r() - 0.5) * 0.6, d = s.r * (0.3 + r() * 0.6); c.moveTo(s.x - Math.cos(a) * d, s.y - Math.sin(a) * d); c.lineTo(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d); c.stroke(); }
    }
    // the face: furious eyes with heavy brows, a zig-zag mouth (drawn last: it never rubs off)
    const ex = [w * 0.36, w * 0.64], ey = h * 0.36;
    for (const x of ex) { c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(x, ey, 38, 30, 0, 0, TAU); c.fill(); c.strokeStyle = '#2a2440'; c.lineWidth = 7; c.stroke(); c.fillStyle = '#1a1424'; c.beginPath(); c.arc(x + (x < w / 2 ? 8 : -8), ey + 4, 13, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + (x < w / 2 ? 4 : -12), ey - 2, 4, 0, TAU); c.fill(); }
    c.strokeStyle = '#2a2440'; c.lineWidth = 14;
    c.beginPath(); c.moveTo(ex[0] - 46, ey - 52); c.lineTo(ex[0] + 34, ey - 30); c.stroke();
    c.beginPath(); c.moveTo(ex[1] + 46, ey - 52); c.lineTo(ex[1] - 34, ey - 30); c.stroke();
    c.fillStyle = '#2a1424'; c.beginPath(); c.moveTo(w * 0.3, h * 0.64); for (let i = 0; i <= 10; i++) c.lineTo(w * 0.3 + i * w * 0.04, h * 0.64 + (i % 2 ? 26 : 0)); c.lineTo(w * 0.7, h * 0.74); c.quadraticCurveTo(w * 0.5, h * 0.86, w * 0.3, h * 0.74); c.closePath(); c.fill();
    c.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(w * 0.32 + i * w * 0.08, h * 0.655); c.lineTo(w * 0.36 + i * w * 0.08, h * 0.655); c.lineTo(w * 0.34 + i * w * 0.08, h * 0.7); c.fill(); }
    // torn: strips ripped off its edges (from phase 2)
    if (phase >= 2) {
      c.globalCompositeOperation = 'destination-out';
      const tears = phase >= 3 ? 9 : 5, rr = P.rng(82);
      for (let i = 0; i < tears; i++) {
        const side = i % 4, k = 0.15 + rr() * 0.7, d = 30 + rr() * 40, wd2 = 20 + rr() * 30;
        c.beginPath();
        if (side === 0) { c.moveTo(k * w - wd2, 0); c.lineTo(k * w, d); c.lineTo(k * w + wd2, 0); }
        else if (side === 1) { c.moveTo(w, k * h - wd2); c.lineTo(w - d, k * h); c.lineTo(w, k * h + wd2); }
        else if (side === 2) { c.moveTo(k * w - wd2, h); c.lineTo(k * w + 6, h - d); c.lineTo(k * w + wd2, h); }
        else { c.moveTo(0, k * h - wd2); c.lineTo(d, k * h); c.lineTo(0, k * h + wd2); }
        c.closePath(); c.fill();
      }
      c.globalCompositeOperation = 'source-over';
    }
    tex.needsUpdate = true;
  }
  function accordionGeo() {
    // a strip of paper folded concertina-fashion, running from z = 0 to z = 1 (scaled to each leg segment's length)
    return K3D.geo('paAccordion', () => {
      const n = 10, pos = [], idx = [];
      for (let i = 0; i <= n; i++) { const z = i / n, y = i % 2 ? 0.14 : -0.14; pos.push(-0.3, y, z, 0.3, y, z); if (i < n) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;
    });
  }
  function walker(K, st) {
    const g = new T.Group(); g.visible = false; K.add(g);
    const body = new T.Group(); g.add(body);
    const tex = walkerTex();
    const mat = K3D.toon('#ffffff', { map: tex, side: T.DoubleSide, alphaTest: 0.5 });
    // four quarters, so it can fold up like a fortune-teller at the end
    const quads = [];
    const cols = [];
    for (const qx of [0, 1]) {
      const colP = new T.Group(); body.add(colP); cols.push(colP);
      for (const qy of [0, 1]) {
        const rowP = new T.Group(); colP.add(rowP);
        const pg = new T.PlaneGeometry(WW / 2, WH / 2), uv = pg.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, (qx + uv.getX(i)) / 2, (qy + uv.getY(i)) / 2);
        pg.translate((qx ? 1 : -1) * WW / 4, (qy ? 1 : -1) * WH / 4, 0);
        const m = K3D.mesh(pg, mat, { ink: '#2a2440', inkW: 1.4 });
        m.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: tex, alphaTest: 0.5 });
        rowP.add(m); quads.push({ qx, qy, rowP, m });
      }
    }
    // the soft middle it hides: a crumpled pink ball under the sheet, shown when it rears up
    const softG = new T.IcosahedronGeometry(0.9, 2), sp = softG.attributes.position, rr = P.rng(83);
    for (let i = 0; i < sp.count; i++) { const k = 0.8 + rr() * 0.35; sp.setXYZ(i, sp.getX(i) * k, sp.getY(i) * k, sp.getZ(i) * k); }
    softG.computeVertexNormals();
    const soft = K3D.mesh(softG, K3D.toon('#ff9ac0', { emissive: '#ff4a8a', emissiveIntensity: 0.3, flat: true }), { ink: '#8a2a4a', inkW: 1 });
    soft.visible = false; g.add(soft);
    // three concertina legs (thigh and shin each) with folded paper feet
    const legMat = K3D.toon('#b49ad8', { side: T.DoubleSide });
    const legs = [[-2.6, -4.8, 1.4], [2.6, 4.8, 1.4], [0, 0, -3.4]].map(([hx, fx, fz]) => {
      const a = K3D.mesh(accordionGeo(), legMat, { ink: '#3a2a5a', inkW: 1 }), b = K3D.mesh(accordionGeo(), legMat, { ink: '#3a2a5a', inkW: 1 });
      const foot = K3D.mesh(K3D.geo('paWalkerFoot', () => new T.CylinderGeometry(0.35, 0.6, 0.3, 8)), K3D.toon('#6a3fa0'), { ink: '#2a1a3a', inkW: 1 });
      K.add(a); K.add(b); K.add(foot);
      return { hx, fx, fz, a, b, foot, x: 0, z: 0, y: 0, step: null, set: false };
    });
    // its stamp shadow (where a foot will come down), the crayon line, flutter strips, eraser crumbs and confetti
    const shadow = new T.Mesh(K3D.geo('paGlossQ', () => new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), K3D.flat('#ffffff', { map: stampShadowTex(), transparent: true, depthWrite: false }));
    shadow.material.polygonOffset = true; shadow.material.polygonOffsetFactor = -5; shadow.material.polygonOffsetUnits = -5; shadow.renderOrder = 3; shadow.visible = false; K.add(shadow);
    const lineTex = K3D.paint('paCrayonLine', 1024, 64, (c, w, h) => {
      c.clearRect(0, 0, w, h); const r = P.rng(84);
      for (let i = 0; i < 90; i++) { c.strokeStyle = r() < 0.7 ? 'rgba(224,60,50,0.85)' : 'rgba(255,120,90,0.8)'; c.lineWidth = 6 + r() * 10; c.lineCap = 'round'; c.beginPath(); const x = r() * w; c.moveTo(x, 14 + r() * 36); c.lineTo(x + 40 + r() * 120, 14 + r() * 36); c.stroke(); }
      for (let i = 0; i < 2000; i++) { c.clearRect(r() * w, r() * h, 1 + r() * 2, 1); }
    });
    const line = new T.Mesh(new T.BoxGeometry(34, 0.12, 0.6).translate(17, 0.06, 0), K3D.toon('#ffffff', { map: lineTex, transparent: true, alphaTest: 0.3, emissive: '#801010', emissiveIntensity: 0.3 }));
    line.visible = false; line.castShadow = true; K.add(line);
    const lineGlow = new T.Mesh(K3D.geo('paGlossQ', () => new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), K3D.flat('#ff5040', { map: softTex(), transparent: true, opacity: 0.5, add: true, depthWrite: false }));
    lineGlow.visible = false; lineGlow.renderOrder = 3; K.add(lineGlow);
    const NP = 260;
    const parts = new T.InstancedMesh(K3D.geo('paScrapQ', () => new T.PlaneGeometry(1, 1)), K3D.toon('#ffffff', { side: T.DoubleSide }), NP);
    parts.frustumCulled = false; parts.count = 0; K.add(parts);
    const strips = [0, 1, 2, 3].map(() => { const m = new T.Mesh(K3D.geo('paStripQ', () => new T.PlaneGeometry(0.5, 1.6)), mat); m.visible = false; K.add(m); return m; });
    // the rubbed patches, laid out once (the eyes and mouth are left alone)
    const spots = [], r = P.rng(85);
    while (spots.length < 34) { const x = 30 + r() * 452, y = 20 + r() * 344; if (y > 90 && y < 300 && x > 120 && x < 392) { if (r() < 0.85) continue; } spots.push({ x, y, r: 26 + r() * 30, a: r() * 3 }); }
    st.v3.lands.walker = { g, body, cols, quads, soft, legs, shadow, line, lineGlow, parts, P: [], strips, stripP: [], tex, spots, painted: -1, w: null, pop: 0, flash: 0, fn: -1 };
  }
  const stampShadowTex = () => K3D.paint('paWalkStamp', 128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const g = c.createRadialGradient(64, 64, 10, 64, 64, 62); g.addColorStop(0, 'rgba(40,20,70,0.75)'); g.addColorStop(0.8, 'rgba(40,20,70,0.55)'); g.addColorStop(1, 'rgba(40,20,70,0)');
    c.fillStyle = g; c.beginPath(); c.arc(64, 64, 62, 0, TAU); c.fill();
    // crayon hatching across the shadow
    c.strokeStyle = 'rgba(120,60,180,0.55)'; c.lineWidth = 3; c.save(); c.beginPath(); c.arc(64, 64, 54, 0, TAU); c.clip();
    for (let x = -64; x < 192; x += 10) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x - 64, 128); c.stroke(); }
    c.restore();
    c.strokeStyle = 'rgba(255,90,80,0.9)'; c.lineWidth = 5; c.setLineDash([12, 8]); c.beginPath(); c.arc(64, 64, 56, 0, TAU); c.stroke();
  });

  /* ---------- build ---------- */
  L.build = function (K, st) {
    st.v3.lands = {};
    layoutRects();
    // the painted ground of each stretch
    for (const S of SEC) {
      const m = new T.Mesh(new T.PlaneGeometry(GX1 - GX0, S.z0 - S.z1).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: groundTex(S), transparent: true, polygonOffset: -1, depthWrite: false }));
      m.position.set((GX0 + GX1) / 2, 0.004, (S.z0 + S.z1) / 2); m.receiveShadow = true; m.renderOrder = 1; m.userData.live = true; K.add(m);
    }
    letters(K, st);
    bang(K, st);
    inkMesh(K, st);
    hill(K, st);
    walker(K, st);
    // the doodled garden carries on through the later stretches: street gardens in Letter City, reeds on the islands,
    // grass and flowers all over the hill (never in a letter, the ink, a fold or on the bunker)
    const zone = (x, z) => {
      const ax = Math.abs(x);
      if (z > -320) return ax < 9 ? 'path' : ax < 17 ? 'side' : 'far';
      if (z > -482) { if (inEllipse(x, z, 1.18)) return inkish(x, z, 0) ? null : 'path'; return 'far'; }
      return ax < 9 ? 'path' : ax < 17 ? 'side' : 'far';
    };
    const ok = (x, z, big) => L.free(x, z, big ? 1.4 : 0.3) && !(z < -478 && Math.hypot(x, z - R.bunker.z) < R.bunker.r + 2.5) && !(big && Math.abs(x) < 15 && z < -555);
    st.v3.lands.meadow = PALIFE.meadow(K, { z0: -170, z1: -606, n: 7600, seed: 909, zone, ok });
    // the lamp's light and the room's haze as they were (the crater darkens them)
    st.v3.lands.base = { fog: K.scene.fog.color.clone(), bg: K.scene.background.clone(), amb: K.amb.intensity, sun: K.sun.intensity, sky: null };
    K.scene.traverse(o => { if (o.geometry && o.geometry.parameters && o.geometry.parameters.radius === 480 && o.material && o.material.map) st.v3.lands.base.sky = o; });
    st.v3.lands.spot = (() => {
      const tex = K3D.paint('paConeSpot', 256, 256, (c, w, h) => {
        const g = c.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,0.75)'); g.addColorStop(0.85, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 6; c.setLineDash([18, 12]); c.beginPath(); c.arc(128, 128, 104, 0, TAU); c.stroke();
      });
      const m = new T.Mesh(K3D.geo('paGlossQ', () => new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), K3D.flat('#fff0b0', { map: tex, transparent: true, opacity: 0, add: true, depthWrite: false }));
      m.material.polygonOffset = true; m.material.polygonOffsetFactor = -6; m.material.polygonOffsetUnits = -6; m.renderOrder = 5; m.visible = false; K.add(m); return m;
    })();
    st.v3.lands.beam = (() => {
      // a cone of light, narrow at the saucer, soft where it reaches the page
      const tex = K3D.paint('paBeam', 64, 128, (c, w, h) => { const g = c.createLinearGradient(0, h, 0, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.12, 'rgba(255,255,255,0.8)'); g.addColorStop(0.7, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0.15)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
      const m = new T.Mesh(new T.CylinderGeometry(0.22, 1, 1, 32, 1, true).translate(0, 0.5, 0), K3D.flat('#fff2b0', { map: tex, transparent: true, opacity: 0, add: true, depthWrite: false, side: T.DoubleSide }));
      m.renderOrder = 5; m.frustumCulled = false; K.add(m); return m;
    })();
  };

  /* ---------- every frame ---------- */
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), pv = new T.Vector3(), sv = new T.Vector3(), col = new T.Color(), tA = new T.Vector3(), tB = new T.Vector3();
  const darkFog = new T.Color('#2e2a42'), darkSky = new T.Color('#4a4458');
  L.update = function (K, st, dt, t) {
    const V = st.v3, D = V && V.lands; if (!D) return;
    const cz = st.cz, cam = K.camera;
    // the crater: the lamp dims and the room's haze darkens while the march is inside it
    const dark = smooth(-316, -334, cz) * (1 - smooth(-462, -480, cz));
    const B0 = D.base;
    K.scene.fog.color.copy(B0.fog).lerp(darkFog, dark * 0.85);
    K.scene.background.copy(B0.bg).lerp(darkFog, dark * 0.85);
    K.amb.intensity = B0.amb * (1 - dark * 0.42); K.sun.intensity = B0.sun * (1 - dark * 0.55);
    if (B0.sky) B0.sky.material.color.setRGB(1, 1, 1).lerp(darkSky, dark * 0.8);
    // flags flutter, lamp halos face the camera and flicker a little (only those near the camera)
    D.lamps.halo.count = 0;
    if (cz < -140 && cz > -340) {
      for (const f of D.flags.children) { f.userData.flag.rotation.y = Math.sin(t * 3 + f.userData.ph) * 0.35; f.userData.flag.scale.x = 0.85 + Math.sin(t * 7 + f.userData.ph) * 0.15; }
      const H = D.lamps.halo; let k = 0;
      for (const l of D.lamps.list) { const s = 1.3 + Math.sin(t * 9 + l.x * 3) * 0.05; pv.set(l.x, 2.62, l.z); sv.set(s, s, s); m4.compose(pv, cam.quaternion, sv); H.setMatrixAt(k++, m4); }
      H.count = k; H.instanceMatrix.needsUpdate = true;
    }
    // the letters fold flat once both heroes are past them
    const Cy = D.city;
    if (cz < -140 && cz > -345) {
      const front = Math.max(G.players[0].b3.z, G.players[1].b3.z);
      for (const g of Cy.groups) {
        const want = st.phase === 'march' && front < g.gz - g.hd - 1.2 ? 1 : 0;
        g.k = approach(g.k, want, dt * 1.6);
        if (Math.abs(g.k - g.shown) < 0.003) continue;
        g.shown = g.k;
        const e3 = g.k * g.k * (3 - 2 * g.k), sc = 1 - 0.86 * e3;
        for (const i of g.boxes) { const b = Cy.all[i]; e.set(0, b.rot, 0); q.setFromEuler(e); m4.compose(pv.set(b.x, 0, b.z), q, sv.set(b.w, b.h * sc, b.d)); Cy.m.setMatrixAt(i, m4); m4.compose(pv.set(b.x, b.h * sc + 0.01, b.z), q, sv.set(b.w * 0.94, 1, b.d * 0.9)); Cy.gloss.setMatrixAt(i, m4); }
        for (const i of g.wins) { const wn = Cy.wins[i]; e.set(0, wn.yaw, 0); q.setFromEuler(e); const ws = (wn.door ? 1.2 : 1) * (1 - e3); m4.compose(pv.set(wn.x, wn.y * sc, wn.z), q, sv.set(ws, (wn.door ? 1.5 : 1) * (1 - e3), 1)); Cy.wm.setMatrixAt(i, m4); }
        for (const i of g.tris) { const b = Cy.tris[i]; m4.compose(pv.set(b.x, b.y * sc, b.z), q.identity(), sv.set(1, 1 - e3, 1)); Cy.bm.setMatrixAt(i, m4); }
        for (const m of g.strings) { m.scale.y = sc; m.visible = e3 < 0.9; }
        for (const f of g.flags) { f.position.y = f.userData.y * sc; f.scale.y = 1 - e3 * 0.9; }
        Cy.m.instanceMatrix.needsUpdate = Cy.gloss.instanceMatrix.needsUpdate = Cy.wm.instanceMatrix.needsUpdate = Cy.bm.instanceMatrix.needsUpdate = true;
      }
    }
    // the "!": wobbles when shot, topples when its dot gives way
    const Bg = D.bang, Bs = st.bang;
    if (Bs) {
      if (Bs.hits !== Bg.hits) { if (Bs.hits > Bg.hits) Bg.wob = 1; Bg.hits = Bs.hits; }
      Bg.wob = Math.max(0, Bg.wob - dt * 1.6);
      const f = Bs.up ? 0 : (Bs.fall || 0);
      const ang = Math.PI / 2 * Math.min(1, f * f * 1.06) - (f >= 1 ? 0 : 0);
      Bg.g.rotation.set(-ang + (f >= 0.95 ? Math.sin(Math.min(1, (f - 0.95) * 20) * Math.PI) * 0.04 : 0), 0, Math.sin(t * 30) * Bg.wob * 0.06);
      Bg.g.position.y = f >= 1 ? 0.01 : 0;
    }
    // the ink: the shine slides, the lamp's reflection sits where the lamp would show in it, bubbles swell and pop
    const I = D.ink;
    if (cz < -300 && cz > -500) {
      I.rip.offset.set(t * 0.012, t * 0.02);
      I.sheen.material.opacity = 0.32 + Math.sin(t * 0.8) * 0.06 + dark * 0.15;
      I.refl.position.set(st.cx + 9, 0.03, cz - 24); I.refl.material.opacity = 0.35 * (1 - dark * 0.6) * (inEllipse(st.cx + 9, cz - 24) ? 1 : 0);
      if (I.bubP.length < 26 && Math.random() < dt * 6) {
        const x = st.cx + (Math.random() - 0.5) * 40, z = cz + 6 - Math.random() * 36;
        if (R.inkAt(x, z) && Math.abs(x - R.ink.pathX(z)) > R.ink.pathHw + 0.8) I.bubP.push({ x, z, t: 0, life: 1.2 + Math.random() * 1.6, s: 0.15 + Math.random() * 0.45 });
      }
      let k = 0;
      for (const b of I.bubP) {
        b.t += dt; const u = b.t / b.life, s = b.s * Math.pow(Math.min(1, u * 1.1), 0.6);
        pv.set(b.x, 0.02, b.z); sv.set(s, s * 0.8, s); m4.compose(pv, q.identity(), sv); I.bub.setMatrixAt(k, m4);
        pv.set(b.x - s * 0.3, s * 0.65, b.z + s * 0.3); sv.setScalar(s * 0.7); m4.compose(pv, cam.quaternion, sv); I.glint.setMatrixAt(k, m4); k++;
      }
      I.bubP = I.bubP.filter(b => b.t < b.life);
      I.bub.count = I.glint.count = k; I.bub.instanceMatrix.needsUpdate = I.glint.instanceMatrix.needsUpdate = true;
      k = 0;
      for (const s of I.smokeP) {
        s.t += dt;
        if (s.t >= s.life || s.x == null) { s.t = 0; s.life = 4 + Math.random() * 4; const a = Math.random() * TAU, kk = 1.02 + Math.random() * 0.1; s.x = R.ink.cx + Math.cos(a) * R.ink.rx * kk; s.z = R.ink.cz + Math.sin(a) * R.ink.rz * kk; if (s.z > cz + 10 || s.z < cz - 60) s.z = cz - 10 - Math.random() * 40, s.x = (Math.random() < 0.5 ? -1 : 1) * (R.ink.rx * Math.sqrt(Math.max(0, 1 - Math.pow((s.z - R.ink.cz) / R.ink.rz, 2))) + 1); }
        const u = s.t / s.life;
        pv.set(s.x + Math.sin(t * 0.7 + s.life) * u * 1.5, 0.4 + u * 6, s.z); sv.setScalar(1.2 + u * 3.5); m4.compose(pv, cam.quaternion, sv); I.smoke.setMatrixAt(k, m4);
        I.smoke.setColorAt(k, col.setRGB(0.55, 0.5, 0.48).multiplyScalar(Math.sin(u * Math.PI))); k++;
      }
      I.smoke.count = k; I.smoke.instanceMatrix.needsUpdate = true; if (I.smoke.instanceColor) I.smoke.instanceColor.needsUpdate = true;
    }
    // the saucer's searchlight: a beam from the saucer to the spot it rests on (it sweeps to a new spot, rests, and
    // grunts drop out of it)
    const beam = D.beam, C = st.cone;
    if (C && V.spot && V.saucer) {
      const sau = V.saucer;
      sau.position.x += (C.x - sau.position.x) * Math.min(1, dt * 1.5);
      V.spot.visible = false;
      const rest = C.mode === 'rest', pulse = rest && !C.popped ? 0.15 * Math.sin(t * 18) : 0;
      const sp = D.spot; sp.visible = true; sp.position.set(C.x, 0.04, C.z); sp.scale.set(5.2, 1, 5.2); sp.rotation.y = t * 0.6;
      sp.material.opacity = approach(sp.material.opacity, (rest ? 0.9 : 0.55) + pulse, dt * 4);
      const top = tA.set(sau.position.x, sau.position.y - 1.5, sau.position.z), bot = tB.set(C.x, 0, C.z);
      const L2 = top.distanceTo(bot);
      beam.position.copy(bot); beam.lookAt(top); beam.rotateX(Math.PI / 2);
      beam.scale.set(2.2, L2, 2.2);
      beam.material.opacity = approach(beam.material.opacity, rest ? 0.22 : 0.12, dt * 2);
      beam.visible = true;
    } else {
      beam.material.opacity = approach(beam.material.opacity, 0, dt * 2); beam.visible = beam.material.opacity > 0.01;
      D.spot.material.opacity = approach(D.spot.material.opacity, 0, dt * 3); D.spot.visible = D.spot.material.opacity > 0.01;
      if (V.spot) V.spot.visible = true;
    }
    // the bunker: the periscope looks round, the light blinks; the hatch
    const Hl = D.hill;
    if (cz < -470) {
      const W = st.walker;
      const look = W && W.state !== 'gone' ? Math.atan2(W.x - R.bunker.x, W.z - R.bunker.z) : Math.sin(t * 0.4) * 1.2;
      Hl.peri.rotation.y += (look - Hl.peri.rotation.y) * Math.min(1, dt * 2);
      Hl.blink.visible = (t % 1.2) < 0.5;
      const Hh = Hl.hatch, hs = st.hatch;
      const fill = hs ? hs.fill : 0;
      Hh.spin += (fill * 6 - Hh.spin) * Math.min(1, dt * 6);
      Hh.wheel.rotation.y = Hh.spin + (hs ? Math.sin(t * 2) * 0.05 : 0);
      Hh.ring.material.opacity = hs && st.phase === 'march' ? 0.25 + Math.sin(t * 4) * 0.12 + fill * 0.4 : 0;
      const opening = st.phase === 'done' ? 1 : 0;
      Hh.open = approach(Hh.open, opening, dt * 2.4);
      Hh.hinge.rotation.x = -Hh.open * 1.9;
      Hh.pit.visible = Hh.rungs.visible = Hh.open > 0.02;
      Hh.shaft.material.opacity = Hh.open * 0.22;
    }
    walkerUpdate(K, st, dt, t);
    // the finish: the heroes drop into the hatch; the saucer comes down on the hill a moment too late
    if (st.phase === 'done') {
      const dT = st.doneT || 0, Hh = R.walker.hatch;
      V.H.forEach((Rh, k) => {
        const h = Rh.h, k2 = clamp((dT - 0.15 - k * 0.12) / 0.6, 0, 1);
        h.position.x += (Hh.x + (k ? 0.5 : -0.5) - h.position.x) * k2; h.position.z += (Hh.z - h.position.z) * k2;
        h.position.y -= Math.pow(k2, 2) * 3.5;
        h.visible = h.visible && k2 < 0.5; Rh.blob.visible = Rh.blob.visible && k2 < 0.2;
      });
      if (V.saucer) {
        const s = V.saucer, k = clamp((dT - 0.2) / 0.7, 0, 1), e2 = k * k;
        s.position.x += (Hh.x - s.position.x) * e2; s.position.z += (Hh.z - 4.5 - s.position.z) * e2; s.position.y += (1.2 - s.position.y) * e2;
        s.scale.multiplyScalar(1 - 0.72 * e2);
        if (dT > 0.9) { const b = clamp((dT - 0.9) / 0.5, 0, 1); s.scale.set(s.scale.x * (1 + 0.25 * (1 - b)), s.scale.y * (0.55 + 0.2 * b), s.scale.z * (1 + 0.25 * (1 - b))); s.rotation.z = Math.sin(dT * 9) * 0.15 * (1 - b * 0.5); }
      }
    }
  };
  function walkerUpdate(K, st, dt, t) {
    const D = st.v3.lands.walker, W = st.walker, g = D.g;
    // new fx: crumbs where it is rubbed, strips torn off, a flash when it loses a layer, confetti when it folds away
    for (const f of st.fx) {
      if (f.n <= D.fn) continue;
      D.fn = f.n;
      if (f.kind === 'rub') spawnParts(D, f.x, W ? bodyY(W) + (Math.random() - 0.3) * 2 : 3, f.z, f.big ? 22 : 6, 'crumb');
      if (f.kind === 'strip') D.stripP.push({ x: f.x, z: f.z, t: 0 }, { x: f.x, z: f.z, t: 0, s: 1 });
      if (f.kind === 'walkerPhase') D.flash = 1;
      if (f.kind === 'walker') D.pop = 0;
      if (f.kind === 'restart') { D.P.length = 0; D.stripP.length = 0; }
    }
    if (!W || W.state === 'gone') {
      if (D.w && D.w.state !== 'gone' && W && W.state === 'gone') spawnParts(D, W.x, 3, W.z, 90, 'confetti');
      g.visible = false; D.shadow.visible = false; D.line.visible = D.lineGlow.visible = false;
      for (const L2 of D.legs) L2.a.visible = L2.b.visible = L2.foot.visible = false;
      D.w = W ? { state: W.state } : null;
      partsUpdate(D, dt, t, K.camera);
      return;
    }
    if (!D.w || D.wRef !== W) { D.wRef = W; D.pop = 0; for (const L2 of D.legs) L2.set = false; }
    D.w = { state: W.state };
    g.visible = true;
    D.pop = Math.min(1, D.pop + dt / 1.1);
    D.flash = Math.max(0, D.flash - dt * 2);
    // repaint the sheet as it is rubbed away (a quarter of a rub at a time)
    const need = Math.floor(W.total * 4) + W.phase * 1000;
    if (need !== D.painted) { D.painted = need; paintWalker(D.tex, Math.min(1, W.total / (PA_WALK.rubPhase * 2 + PA_WALK.rubLast)), W.phase, D.spots); }
    // where the body is: up on its legs, crouched over the hatch, reared up; popping up out of the page at first
    const pop = D.pop < 1 ? 1 - Math.pow(1 - D.pop, 3) * Math.cos(D.pop * 6) : 1;
    let by = bodyY(W), tilt = 0;
    if (W.state === 'rear') tilt = -0.55 + Math.sin(t * 6) * 0.04;
    if (W.state === 'crouch') tilt = 0.25;
    const stamping = !!W.stamp;
    if (stamping) by += Math.sin(Math.min(1, W.stamp.t / PA_WALK.stampWind) * Math.PI) * 0.6;
    by += Math.sin(t * 2.2) * 0.12;
    g.position.set(W.x, 0, W.z); g.rotation.y = W.face;
    D.body.position.set(0, by * pop, 0);
    D.body.rotation.set(tilt, 0, Math.sin(t * 1.7) * 0.03);
    D.body.scale.set(1, Math.max(0.02, pop), 1);
    // folding away (the end): top half over, then side over, then it spins small and pops into confetti
    if (W.state === 'fold') {
      const k = clamp(W.foldT / PA_WALK.foldT, 0, 1), s1 = smooth(0, 0.35, k), s2 = smooth(0.35, 0.7, k), s3 = smooth(0.7, 1, k);
      for (const qd of D.quads) qd.rowP.rotation.x = qd.qy ? s1 * Math.PI * 0.98 : 0;
      D.cols[1].rotation.y = -s2 * Math.PI * 0.98;
      D.body.scale.multiplyScalar(1 - s3 * 0.9); D.body.rotation.y = s3 * 8;
    } else { for (const qd of D.quads) qd.rowP.rotation.x = 0; D.cols[1].rotation.y = 0; }
    // flash red when it loses a layer
    for (const qd of D.quads) { const m = qd.m.material; m.emissive = m.emissive || new T.Color(); m.emissive.setRGB(D.flash * 0.6, 0, 0); m.emissiveIntensity = 1; }
    // the soft middle: shown while it rears up
    D.soft.visible = W.state === 'rear';
    if (D.soft.visible) { D.soft.position.set(0, by - WH / 2 - 0.3, -0.3); const s = 1 + Math.sin(t * 8) * 0.08; D.soft.scale.setScalar(s); D.soft.rotation.y = t; D.soft.material.emissiveIntensity = 0.3 + Math.sin(t * 10) * 0.2; }
    // legs: each foot has a home under the body; a foot that is left behind steps (one at a time, in an arc).
    // A stamping foot lifts high over its target and comes down hard.
    const cf = Math.cos(W.face), sf = Math.sin(W.face);
    const spread = W.state === 'crouch' ? 1.5 : W.state === 'rear' ? 1.15 : 1;
    const stepping = D.legs.some(L2 => L2.step);
    let stampLeg = null;
    if (stamping) { let bd = 1e9; for (const L2 of D.legs) { const d = Math.hypot(L2.x - W.stamp.x, L2.z - W.stamp.z); if (d < bd) { bd = d; stampLeg = L2; } } }
    if (D.lastStamp && !stamping) { const Lg = D.lastStamp.leg; Lg.x = D.lastStamp.x; Lg.z = D.lastStamp.z; Lg.y = 0; Lg.step = null; }
    D.lastStamp = stamping ? { leg: stampLeg, x: W.stamp.x, z: W.stamp.z } : null;
    for (const L2 of D.legs) {
      const lx = L2.fx * spread, lz = L2.fz * spread;
      const hx = W.x + lx * cf + lz * sf, hz = W.z - lx * sf + lz * cf;
      if (!L2.set) { L2.x = hx; L2.z = hz; L2.y = 0; L2.set = true; }
      if (L2 === stampLeg) {
        const k = W.stamp.t / PA_WALK.stampWind, S = W.stamp;
        if (k < 0.85) { const kk = smooth(0, 0.5, k); L2.x += (S.x - L2.x) * Math.min(1, dt * 6); L2.z += (S.z - L2.z) * Math.min(1, dt * 6); L2.y = 3.2 * kk + Math.sin(t * 30) * 0.08 * kk; }
        else L2.y = 3.2 * (1 - (k - 0.85) / 0.15);
        L2.step = null;
      } else if (L2.step) {
        const s = L2.step; s.t += dt / 0.32;
        const k = Math.min(1, s.t);
        L2.x = s.fx + (hx - s.fx) * k; L2.z = s.fz + (hz - s.fz) * k; L2.y = Math.sin(k * Math.PI) * 1.2;
        if (k >= 1) { L2.step = null; L2.y = 0; }
      } else if (!stepping && Math.hypot(hx - L2.x, hz - L2.z) > 1.3) { L2.step = { fx: L2.x, fz: L2.z, t: 0 }; }
      // hip on the bottom edge of the sheet (in the body's frame, following its tilt), knee bent up and out
      const hipLy = by - (WH / 2 - 0.6) * Math.cos(tilt), hipLz = -(WH / 2 - 0.6) * Math.sin(tilt);
      const hipX = W.x + L2.hx * cf + hipLz * sf, hipZ = W.z - L2.hx * sf + hipLz * cf;
      const hip = tA.set(hipX, Math.max(0.3, hipLy * pop), hipZ), foot = tB.set(L2.x, L2.y + 0.15, L2.z);
      const ox = foot.x - W.x, oz = foot.z - W.z, od = Math.hypot(ox, oz) || 1;
      const knee = new T.Vector3((hip.x + foot.x) / 2 + ox / od * 0.9, Math.max(hip.y, foot.y) + 1.6, (hip.z + foot.z) / 2 + oz / od * 0.9);
      seg(L2.a, hip, knee); seg(L2.b, knee, foot);
      L2.a.visible = L2.b.visible = L2.foot.visible = !(W.state === 'fold' && W.foldT > PA_WALK.foldT * 0.75);
      L2.foot.position.set(L2.x, L2.y + 0.15, L2.z); L2.foot.rotation.y = W.face;
      const sq = L2.y < 0.05 ? 1.1 : 1; L2.foot.scale.set(sq, 1 / sq, sq);
    }
    // the stamp shadow: grows and darkens as the foot winds up
    if (stamping) {
      const k = clamp(W.stamp.t / PA_WALK.stampWind, 0, 1), r2 = PA_WALK.stampR * 2 * (0.6 + 0.4 * k);
      D.shadow.visible = true; D.shadow.position.set(W.stamp.x, 0.03, W.stamp.z); D.shadow.scale.set(r2, 1, r2); D.shadow.material.opacity = 0.5 + k * 0.5;
    } else D.shadow.visible = false;
    // the crayon line: drawn across in front of it, then swept toward the heroes
    const Ln = W.line;
    if (Ln) {
      const k = clamp(Ln.t / PA_WALK.lineWind, 0, 1);
      D.line.visible = D.lineGlow.visible = true;
      D.line.position.set(-17, 0, Ln.z); D.line.scale.set(Math.max(0.01, k), 1, 1);
      D.lineGlow.position.set(-17 + 17 * k, 0.03, Ln.z); D.lineGlow.scale.set(34 * k + 1, 1, 2.4); D.lineGlow.material.opacity = 0.35 + Math.sin(t * 12) * 0.1 + (k < 1 ? 0.2 : 0);
    } else D.line.visible = D.lineGlow.visible = false;
    // torn strips flutter down to where the Grunts appear
    let si = 0;
    for (const sp of D.stripP) {
      sp.t += dt; const k = Math.min(1, sp.t / 0.8), m = D.strips[si++]; if (!m) break;
      const dx = sp.s ? 2 : -2;
      m.visible = k < 1; m.position.set(sp.x + dx * k + Math.sin(sp.t * 9) * 0.4, 6.5 * (1 - k) + 0.2, sp.z + k);
      m.rotation.set(sp.t * 5, sp.t * 3, Math.sin(sp.t * 7) * 0.8);
    }
    D.stripP = D.stripP.filter(sp => sp.t < 0.8);
    for (; si < D.strips.length; si++) D.strips[si].visible = false;
    partsUpdate(D, dt, t, K.camera);
  }
  function bodyY(W) { return W.state === 'crouch' ? 0.15 + WH / 2 : W.state === 'rear' ? 2.3 + WH / 2 : 0.6 + WH / 2; }   // low: bolts fly at the heroes' height
  function seg(m, a, b) {
    m.position.copy(a); m.lookAt(b); m.scale.set(1, 1, Math.max(0.01, a.distanceTo(b)));
  }
  function spawnParts(D, x, y, z, n, kind) {
    for (let i = 0; i < n && D.P.length < 260; i++) {
      const a = Math.random() * TAU, sp = kind === 'confetti' ? 2 + Math.random() * 5 : 1 + Math.random() * 2.5;
      D.P.push({ x, y, z, vx: Math.cos(a) * sp, vy: 1 + Math.random() * (kind === 'confetti' ? 6 : 2.5), vz: Math.sin(a) * sp, t: 0, life: kind === 'confetti' ? 3 + Math.random() * 2 : 2.5 + Math.random(), rx: Math.random() * 6, ry: Math.random() * 6, kind,
        col: kind === 'confetti' ? ['#e2484e', '#f2c33c', '#3f7fd0', '#5cc27f', '#f07aa0', '#6a3fa0'][i % 6] : (Math.random() < 0.7 ? '#e8a9b4' : '#c8b8d8'), s: kind === 'confetti' ? 0.18 + Math.random() * 0.14 : 0.08 + Math.random() * 0.1 });
    }
  }
  function partsUpdate(D, dt, t, cam) {
    const pm = D.parts; let k = 0;
    for (const p of D.P) {
      p.t += dt;
      if (p.y > 0.02) { p.vy -= (p.kind === 'confetti' ? 4 : 12) * dt; p.x += p.vx * dt; p.y = Math.max(0.02, p.y + p.vy * dt); p.z += p.vz * dt; p.rx += dt * 6; p.ry += dt * 4; if (p.kind === 'confetti') { p.vx *= 1 - dt * 1.5; p.vz *= 1 - dt * 1.5; } }
      const fade = clamp((p.life - p.t) / 0.6, 0, 1);
      e.set(p.y > 0.03 ? p.rx : -Math.PI / 2, p.ry, 0); q.setFromEuler(e); pv.set(p.x, p.y, p.z); sv.set(p.s * fade, p.s * fade * (p.kind === 'crumb' ? 0.6 : 1), 1);
      m4.compose(pv, q, sv); pm.setMatrixAt(k, m4); pm.setColorAt(k, col.set(p.col)); k++;
    }
    D.P = D.P.filter(p => p.t < p.life);
    pm.count = k; pm.instanceMatrix.needsUpdate = true; if (pm.instanceColor) pm.instanceColor.needsUpdate = true;
  }
  return L;
})();
