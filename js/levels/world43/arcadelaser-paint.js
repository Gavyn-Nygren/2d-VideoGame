/* Pip & Bo - 43-4 Laser Tag Arena: the painted textures of the hall (ARCADELASER_PAINT). Loaded on demand with the 3D
   kit. Canvas painting only, seeded (ARCADE.rnd after ARCADE.seed), so the hall looks the same on every open.
     mural(seg, w, h)       the glow-paint mural that runs right round the hall: an alien jungle under three moons, with
                            creatures, ruins and comets, painted by hand: visible brushwork, drips, a signature. seg picks
                            the stretch (0 back left, 1 back right, 2 left wall, 3 right wall, 4 high band)
     floor(w, h)            the arena floor: black rubber tiles with scuffs, glow-tape arrows and lane numbers, painted base
                            circles, cable covers, drain grilles, footprints in spilled glow paint, confetti
     floorGlow(w, h)        the same floor's fluorescent layer (what glows under the black light), drawn additive on top
     hallFloor()            the hall floor outside the arena (worn dark concrete with painted walkways)
     haze(seed)             a soft wisp texture for the drifting fog sheets
     glass()                streaks and smudges on the gallery glass
   Everything is original: the arena's name ZAP MAZE and every creature and picture are made up. */
'use strict';

const ARCADELASER_PAINT = (function () {
  const P = {}, R = () => ARCADE.rnd(), pick = a => ARCADE.pick(a);
  const AR = ARCADELASER_ARENA;
  const GLOW = ['#5aff8a', '#ff5ad6', '#4ae8ff', '#ffe24a', '#b48aff', '#7affd8', '#fff0b0'];
  // a brushy stroke: several thin offset strokes, a little ragged, with an occasional drip
  function brush(c, pts, col, wdt, o = {}) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    const n = o.hairs || 5;
    for (let k = 0; k < n; k++) {
      c.strokeStyle = col; c.globalAlpha = (o.a || 0.85) * (0.45 + R() * 0.55); c.lineWidth = wdt * (0.35 + R() * 0.5);
      const ox = (R() - 0.5) * wdt * 0.6, oy = (R() - 0.5) * wdt * 0.6;
      c.beginPath(); c.moveTo(pts[0][0] + ox, pts[0][1] + oy);
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        c.quadraticCurveTo(x0 + ox, y0 + oy, (x0 + x1) / 2 + ox, (y0 + y1) / 2 + oy);
      }
      const L = pts[pts.length - 1]; c.lineTo(L[0] + ox, L[1] + oy); c.stroke();
    }
    if (o.drip !== false && R() < (o.drip || 0.25)) {
      const L = pts[Math.floor(R() * pts.length)], dl = 8 + R() * 40;
      c.globalAlpha = 0.7; c.lineWidth = Math.max(1.5, wdt * 0.18); c.beginPath(); c.moveTo(L[0], L[1]); c.lineTo(L[0] + (R() - 0.5) * 2, L[1] + dl); c.stroke();
      c.beginPath(); c.arc(L[0], L[1] + dl, c.lineWidth * 0.9, 0, Math.PI * 2); c.fillStyle = col; c.fill();
    }
    c.restore();
  }
  P.brush = brush;
  const blob = (c, x, y, r, col, a = 0.9) => { c.save(); c.globalAlpha = a; c.fillStyle = col; c.beginPath(); for (let i = 0; i <= 14; i++) { const t = i / 14 * Math.PI * 2, rr = r * (0.82 + R() * 0.3); c.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); } c.closePath(); c.fill(); c.restore(); };

  /* ---------- the mural ---------- */
  P.mural = function (seg, w, h) {
    return K3D.paint('al-mural|' + seg, w, h, (c) => {
      ARCADE.seed(900 + seg * 37);
      // the wall: a deep violet-black, rollered on, with the primer showing through in streaks
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0c0816'); g.addColorStop(0.6, '#140c22'); g.addColorStop(1, '#0a0610');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 120; i++) { c.fillStyle = `rgba(${40 + R() * 30},${20 + R() * 20},${60 + R() * 40},${0.05 + R() * 0.06})`; c.fillRect(R() * w, 0, 8 + R() * 30, h); }
      // the sky: a glowing nebula wash in magenta and violet, stars, comets
      for (let i = 0; i < 9; i++) { const x = R() * w, y = R() * h * 0.45, r = 60 + R() * 160; const gg = c.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, `rgba(${R() < 0.5 ? '255,90,214' : '154,138,255'},0.22)`); gg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gg; c.fillRect(x - r, y - r, r * 2, r * 2); }
      for (let i = 0; i < 260; i++) { c.fillStyle = R() < 0.2 ? pick(GLOW) : '#fff6e0'; c.globalAlpha = 0.4 + R() * 0.6; const s = R() < 0.08 ? 3 : 1.4; c.fillRect(R() * w, R() * h * 0.55, s, s); }
      c.globalAlpha = 1;
      // the three moons (one big ringed one, two small), only on the stretches that show the sky high enough
      if (seg !== 4) {
        const moons = [[w * (0.2 + R() * 0.15), h * 0.2, h * 0.13, '#7affd8'], [w * (0.55 + R() * 0.1), h * 0.12, h * 0.06, '#ffe24a'], [w * (0.8 + R() * 0.1), h * 0.26, h * 0.045, '#ff5ad6']];
        for (const [x, y, r, col] of moons) {
          const mg = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r * 1.8); mg.addColorStop(0, col); mg.addColorStop(0.55, col); mg.addColorStop(0.56, 'rgba(255,255,255,0.12)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = mg; c.beginPath(); c.arc(x, y, r * 1.8, 0, Math.PI * 2); c.fill();
          c.fillStyle = 'rgba(10,6,20,0.35)'; for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(x + (R() - 0.5) * r, y + (R() - 0.5) * r, r * (0.08 + R() * 0.15), 0, Math.PI * 2); c.fill(); }
          if (r > h * 0.1) { c.save(); c.strokeStyle = '#fff0b0'; c.globalAlpha = 0.7; c.lineWidth = 4; c.beginPath(); c.ellipse(x, y, r * 1.9, r * 0.35, -0.25, 0, Math.PI * 2); c.stroke(); c.restore(); }
        }
        // comets with long brushy tails
        for (let k = 0; k < 3; k++) {
          const x = R() * w, y = R() * h * 0.35, L = 80 + R() * 160, a = 0.3 + R() * 0.5, col = pick(GLOW);
          brush(c, [[x, y], [x - L * 0.5, y - L * a * 0.3], [x - L, y - L * a * 0.6]], col, 10, { hairs: 7, a: 0.7, drip: false });
          blob(c, x, y, 6, '#ffffff', 1);
        }
      }
      // far ruins: stepped temples and broken arches in cyan line-work on the horizon
      const hz = h * (seg === 4 ? 0.7 : 0.56);
      for (let k = 0; k < 4; k++) {
        const x = R() * w, bw = 60 + R() * 120, bh = 40 + R() * 90, col = pick(['#4ae8ff', '#b48aff', '#7affd8']);
        c.save(); c.strokeStyle = col; c.globalAlpha = 0.55; c.lineWidth = 3;
        for (let s = 0; s < 4; s++) { const ww = bw * (1 - s * 0.22), hh = bh * 0.25; c.strokeRect(x - ww / 2, hz - hh * (s + 1), ww, hh); }
        c.beginPath(); c.arc(x + bw * 0.8, hz, bw * 0.3, Math.PI, Math.PI * 1.7); c.stroke();
        c.restore();
      }
      // rolling hills of glowing moss, layered
      for (let L = 0; L < 3; L++) {
        const y0 = hz + L * h * 0.08, col = ['#1e3a2e', '#24503a', '#2a6a40'][L];
        c.fillStyle = col; c.beginPath(); c.moveTo(0, h);
        for (let x = 0; x <= w; x += 20) c.lineTo(x, y0 + Math.sin(x * 0.01 + L * 2 + seg) * 18 + Math.sin(x * 0.033 + L) * 8);
        c.lineTo(w, h); c.closePath(); c.fill();
        // the glowing rim of each hill, painted with a loaded brush
        const pts = []; for (let x = 0; x <= w; x += 30) pts.push([x, y0 + Math.sin(x * 0.01 + L * 2 + seg) * 18 + Math.sin(x * 0.033 + L) * 8]);
        brush(c, pts, ['#5aff8a', '#7affd8', '#b4ff5a'][L], 5, { hairs: 4, a: 0.6, drip: 0.6 });
      }
      // the jungle: great curling fern trees and bulb plants, glowing
      const trees = 5 + Math.floor(R() * 4);
      for (let k = 0; k < trees; k++) {
        const x = (k + 0.3 + R() * 0.4) / trees * w, base = h * (0.82 + R() * 0.12), th = h * (0.35 + R() * 0.3), col = pick(['#5aff8a', '#7affd8', '#ff5ad6', '#b48aff']);
        const lean = (R() - 0.5) * 60, top = [x + lean, base - th];
        brush(c, [[x, base], [x + lean * 0.3, base - th * 0.4], [x + lean * 0.8, base - th * 0.8], top], '#3a2a50', 16, { hairs: 6, a: 0.9, drip: 0.3 });
        brush(c, [[x, base], [x + lean * 0.3, base - th * 0.4], [x + lean * 0.8, base - th * 0.8], top], col, 4, { hairs: 3, a: 0.6, drip: 0.4 });
        // fronds: spirals unrolling from the top
        for (let f = 0; f < 6; f++) {
          const a0 = -Math.PI / 2 + (f - 2.5) * 0.5, L = th * (0.25 + R() * 0.2), pts = [];
          for (let s = 0; s <= 10; s++) { const t = s / 10, aa = a0 + t * t * 2.2 * (f < 3 ? -1 : 1); pts.push([top[0] + Math.cos(aa) * L * t, top[1] + Math.sin(aa) * L * t + t * t * L * 0.5]); }
          brush(c, pts, col, 7, { hairs: 4, a: 0.75, drip: 0.35 });
        }
      }
      // bulb plants and spotted mushrooms along the bottom
      for (let k = 0; k < 18; k++) {
        const x = R() * w, y = h * (0.86 + R() * 0.12), col = pick(GLOW), s = 8 + R() * 18;
        brush(c, [[x, h], [x + (R() - 0.5) * 10, y + s]], '#2a6a40', 4, { hairs: 2, drip: false });
        blob(c, x, y, s, col, 0.8); blob(c, x - s * 0.3, y - s * 0.3, s * 0.3, '#ffffff', 0.5);
      }
      // the creatures of the mural: a long-necked grazer, a flock of six-winged gliders, a big-eyed tree-climber,
      // a herd of round hoppers, each painted in a few loose strokes
      for (let k = 0; k < 3; k++) {
        const x = R() * w, y = h * (0.7 + R() * 0.12), s = 30 + R() * 30, col = pick(['#ffe24a', '#ff5ad6', '#7affd8']);
        blob(c, x, y, s * 0.6, col, 0.85);
        brush(c, [[x + s * 0.3, y - s * 0.2], [x + s * 0.7, y - s * 1.0], [x + s * 1.0, y - s * 1.4]], col, 10, { hairs: 4, drip: 0.3 });
        blob(c, x + s * 1.05, y - s * 1.45, s * 0.22, col, 0.9);
        c.fillStyle = '#0a0610'; c.beginPath(); c.arc(x + s * 1.12, y - s * 1.5, 3, 0, Math.PI * 2); c.fill();
        for (const lx of [-0.4, -0.1, 0.2, 0.45]) brush(c, [[x + s * lx, y + s * 0.3], [x + s * lx, y + s * 0.85]], col, 5, { hairs: 2, drip: false });
      }
      for (let k = 0; k < 7; k++) {
        const x = R() * w, y = h * (0.15 + R() * 0.3), s = 8 + R() * 10, col = pick(GLOW);
        for (const sd of [-1, 1]) for (const a of [0.3, 0.7, 1.1]) brush(c, [[x, y], [x + sd * s * Math.cos(a) * 1.6, y - s * Math.sin(a) * 0.9]], col, 3, { hairs: 2, drip: false });
        blob(c, x, y, 3.5, '#ffffff', 0.9);
      }
      for (let k = 0; k < 6; k++) {
        const x = R() * w, y = h * (0.88 + R() * 0.08), s = 9 + R() * 6, col = pick(['#4ae8ff', '#5aff8a', '#ffe24a']);
        blob(c, x, y, s, col, 0.85); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x + s * 0.3, y - s * 0.2, s * 0.32, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#0a0610'; c.beginPath(); c.arc(x + s * 0.36, y - s * 0.2, s * 0.15, 0, Math.PI * 2); c.fill();
      }
      // splatters and handprints left by the painters, and the signature in the corner
      for (let k = 0; k < 22; k++) { const col = pick(GLOW); blob(c, R() * w, R() * h, 2 + R() * 6, col, 0.6); }
      if (seg === 1 || seg === 3) {
        c.save(); c.translate(w - 150, h - 30); c.rotate(-0.08); c.fillStyle = '#fff0b0'; c.globalAlpha = 0.85; c.font = 'italic bold 26px "DejaVu Serif", serif';
        c.fillText('~ Neon Nell ' + (seg === 1 ? "'87" : "'88"), 0, 0); c.restore();
      }
      if (seg === 2) { c.save(); c.fillStyle = '#ff5ad6'; c.globalAlpha = 0.7; c.font = 'bold 22px monospace'; c.fillText('WET PAINT  (since 1987)', 40, h - 24); c.restore(); }
      // a scuffed band along the bottom where people lean (and a strip of glow tape someone stuck over a tear)
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, h - 26, w, 26);
      for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(R() * w, h - 24 + R() * 20, 10 + R() * 40, 1.5); }
    });
  };

  /* ---------- the arena floor (28 x 15 units) ---------- */
  const FX = (x, w) => (x + AR.HX) / (AR.HX * 2) * w, FZ = (z, h) => (z + AR.HZ) / (AR.HZ * 2) * h;
  P.FX = FX; P.FZ = FZ;
  P.floor = function (w, h) {
    return K3D.paint('al-floor', w, h, (c) => {
      ARCADE.seed(4401);
      c.fillStyle = '#16141a'; c.fillRect(0, 0, w, h);
      // rubber tiles: 1 unit squares with bevelled seams and a fine stipple, each a touch different
      const ts = w / (AR.HX * 2);
      for (let ty = 0; ty < h / ts; ty++) for (let tx = 0; tx < w / ts; tx++) {
        const v = 18 + Math.floor(R() * 10);
        c.fillStyle = `rgb(${v},${v - 2},${v + 4})`; c.fillRect(tx * ts + 1, ty * ts + 1, ts - 2, ts - 2);
        for (let k = 0; k < 14; k++) { c.fillStyle = `rgba(255,255,255,${0.02 + R() * 0.03})`; c.fillRect(tx * ts + R() * ts, ty * ts + R() * ts, 1.5, 1.5); }
        c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(tx * ts, ty * ts, ts, 1); c.fillRect(tx * ts, ty * ts, 1, ts);
        c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(tx * ts + 1, ty * ts + 1, ts - 2, 1);
      }
      // scuffs and skid marks, heavier in the lanes people run
      for (let i = 0; i < 520; i++) {
        const x = R() * w, y = R() * h, L = 6 + R() * 40, a = R() * Math.PI;
        c.strokeStyle = R() < 0.6 ? `rgba(0,0,0,${0.15 + R() * 0.25})` : `rgba(200,190,220,${0.04 + R() * 0.06})`; c.lineWidth = 1 + R() * 3;
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + (R() - 0.5) * 8, y + Math.sin(a) * L * 0.5, x + Math.cos(a) * L, y + Math.sin(a) * L); c.stroke();
      }
      // cable covers (yellow-black ramps) and drain grilles
      const cover = (x0, z0, x1, z1) => { [x0, z0, x1, z1] = [x0, z0, x1, z1].map(v => v * AR.SC); c.save(); c.strokeStyle = '#2a2830'; c.lineWidth = ts * 0.32; c.beginPath(); c.moveTo(FX(x0, w), FZ(z0, h)); c.lineTo(FX(x1, w), FZ(z1, h)); c.stroke();
        c.setLineDash([ts * 0.25, ts * 0.25]); c.strokeStyle = '#8a7a2a'; c.lineWidth = ts * 0.08; c.stroke(); c.restore(); };
      cover(-14, -1.5, -10.8, -1.5); cover(14, 1.5, 10.8, 1.5); cover(-6, 7.5, -6, 6.2); cover(6, -7.5, 6, -6.2);
      const grille = (x, z) => { const px = FX(x * AR.SC, w), pz = FZ(z * AR.SC, h), s = ts * 0.55; c.fillStyle = '#0c0b0e'; c.fillRect(px - s, pz - s * 0.6, s * 2, s * 1.2); c.strokeStyle = '#4a4650'; c.lineWidth = 2; c.strokeRect(px - s, pz - s * 0.6, s * 2, s * 1.2); for (let k = -3; k <= 3; k++) { c.fillStyle = '#3a3640'; c.fillRect(px + k * s * 0.28 - 1.5, pz - s * 0.5, 3, s); } };
      grille(-8.0, 6.8); grille(8.0, -6.8); grille(-0.5, -3.2); grille(0.5, 3.2);
      // the centre platform's ring and the base circles, painted (the glow layer brightens them)
      c.strokeStyle = 'rgba(255,240,176,0.35)'; c.lineWidth = 6; c.beginPath(); c.arc(FX(0, w), FZ(0, h), AR.PLAT_R * ts + 8, 0, Math.PI * 2); c.stroke();
      for (const [id, [bx, bz]] of AR.BASE.entries()) {
        c.fillStyle = id ? 'rgba(80,140,220,0.18)' : 'rgba(230,140,60,0.18)'; c.beginPath(); c.arc(FX(bx, w), FZ(bz, h), ts * 1.3, 0, Math.PI * 2); c.fill();
        c.strokeStyle = id ? 'rgba(120,170,240,0.5)' : 'rgba(240,170,100,0.5)'; c.lineWidth = 5; c.stroke();
        c.save(); c.translate(FX(bx, w), FZ(bz, h)); c.fillStyle = 'rgba(255,255,255,0.35)'; c.font = `900 ${Math.round(ts * 0.9)}px "DejaVu Sans", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(id ? 'P2' : 'P1', 0, 0); c.restore();
      }
      // worn patches where the paint has gone and old tape marks
      for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(40,36,44,${0.2 + R() * 0.3})`; c.fillRect(R() * w, R() * h, 10 + R() * 50, 4 + R() * 10); }
      // chewing gum, a dropped ticket, a straw (little stories at foot level)
      for (let i = 0; i < 26; i++) { c.fillStyle = pick(['#d8b0c8', '#a8d0b0', '#e0d0a0']); c.beginPath(); c.arc(R() * w, R() * h, 2 + R() * 2, 0, Math.PI * 2); c.fill(); }
      for (let i = 0; i < 6; i++) { c.save(); c.translate(R() * w, R() * h); c.rotate(R() * 6); c.fillStyle = '#f0c8d0'; c.fillRect(-10, -5, 20, 10); c.fillStyle = 'rgba(60,30,40,0.6)'; c.fillRect(-7, -1, 14, 2); c.restore(); }
    });
  };
  P.floorGlow = function (w, h) {
    return K3D.paint('al-floorglow', w, h, (c) => {
      ARCADE.seed(4402);
      c.fillStyle = '#000000'; c.fillRect(0, 0, w, h);
      const ts = w / (AR.HX * 2);
      // glow-tape lanes: dashed lines and chevron arrows pointing to the middle, lane numbers
      c.lineCap = 'butt';
      const lane = (x0, z0, x1, z1, col) => { [x0, z0, x1, z1] = [x0, z0, x1, z1].map(v => v * AR.SC); c.save(); c.strokeStyle = col; c.globalAlpha = 0.75; c.lineWidth = ts * 0.07; c.setLineDash([ts * 0.5, ts * 0.35]); c.beginPath(); c.moveTo(FX(x0, w), FZ(z0, h)); c.lineTo(FX(x1, w), FZ(z1, h)); c.stroke(); c.restore(); };
      lane(-13.6, -0.2, -3, -0.2, '#5aff8a'); lane(13.6, 0.2, 3, 0.2, '#5aff8a');
      lane(-11, -7.1, 11, -7.1, '#ff5ad6'); lane(-11, 7.1, 11, 7.1, '#ff5ad6');
      lane(-13.6, -7.1, -13.6, 7.1, '#4ae8ff'); lane(13.6, -7.1, 13.6, 7.1, '#4ae8ff');
      const chev = (x, z, a, col) => { c.save(); c.translate(FX(x * AR.SC, w), FZ(z * AR.SC, h)); c.rotate(a); c.strokeStyle = col; c.globalAlpha = 0.8; c.lineWidth = ts * 0.09; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-ts * 0.25 + k * ts * 0.28, -ts * 0.28); c.lineTo(k * ts * 0.28, 0); c.lineTo(-ts * 0.25 + k * ts * 0.28, ts * 0.28); c.stroke(); } c.restore(); };
      chev(-9.5, -0.2, 0, '#5aff8a'); chev(9.5, 0.2, Math.PI, '#5aff8a'); chev(-4.5, -0.2, 0, '#5aff8a'); chev(4.5, 0.2, Math.PI, '#5aff8a');
      chev(0, -7.1, 0, '#ff5ad6'); chev(0, 7.1, Math.PI, '#ff5ad6');
      c.font = `900 ${Math.round(ts * 0.6)}px "DejaVu Sans Mono", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
      [[-12, -1.0, '1'], [12, 1.0, '1'], [-7.5, -6.5, '2'], [7.5, 6.5, '2'], [-3.5, 6.6, '3'], [3.5, -6.6, '3']].forEach(([x, z, s]) => { c.fillStyle = 'rgba(255,240,176,0.8)'; c.fillText('LANE ' + s, FX(x * AR.SC, w), FZ(z * AR.SC, h)); });
      // the centre ring and the base rings glow (the bases a dim wash of each player's colour)
      c.strokeStyle = '#fff0b0'; c.globalAlpha = 0.9; c.lineWidth = ts * 0.06; c.beginPath(); c.arc(FX(0, w), FZ(0, h), AR.PLAT_R * ts + 8, 0, Math.PI * 2); c.stroke();
      c.setLineDash([ts * 0.2, ts * 0.2]); c.beginPath(); c.arc(FX(0, w), FZ(0, h), AR.PLAT_R * ts + 22, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      for (const [id, [bx, bz]] of AR.BASE.entries()) { c.strokeStyle = id ? '#3a6ab8' : '#b8682a'; c.globalAlpha = 0.9; c.lineWidth = ts * 0.08; c.beginPath(); c.arc(FX(bx, w), FZ(bz, h), ts * 1.3, 0, Math.PI * 2); c.stroke(); }
      c.globalAlpha = 1;
      // footprints through a spill of glow paint by the far-left corner, fading as they go
      const spill = [FX(-11.6 * AR.SC, w), FZ(-5.4 * AR.SC, h)];
      c.fillStyle = '#ff5ad6'; c.globalAlpha = 0.85; c.beginPath(); for (let i = 0; i <= 20; i++) { const t = i / 20 * Math.PI * 2, r = ts * (0.5 + R() * 0.35); c.lineTo(spill[0] + Math.cos(t) * r, spill[1] + Math.sin(t) * r * 0.7); } c.fill();
      for (let k = 0; k < 14; k++) {
        const x = spill[0] + ts * (0.8 + k * 0.42), y = spill[1] + ts * (Math.sin(k * 0.6) * 0.4 + (k % 2 ? 0.18 : -0.18));
        c.globalAlpha = Math.max(0, 0.8 - k * 0.055); c.save(); c.translate(x, y); c.rotate(0.15); c.beginPath(); c.ellipse(0, 0, ts * 0.12, ts * 0.07, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(ts * 0.13, 0, ts * 0.05, ts * 0.05, 0, 0, Math.PI * 2); c.fill(); c.restore();
      }
      // a smaller green spill on the other side (and somebody's handprint in it)
      const sp2 = [FX(11.0 * AR.SC, w), FZ(5.8 * AR.SC, h)]; c.fillStyle = '#5aff8a'; c.globalAlpha = 0.8; c.beginPath(); for (let i = 0; i <= 18; i++) { const t = i / 18 * Math.PI * 2, r = ts * (0.35 + R() * 0.25); c.lineTo(sp2[0] + Math.cos(t) * r, sp2[1] + Math.sin(t) * r * 0.7); } c.fill();
      // confetti from an earlier party, in glow colours
      for (let i = 0; i < 900; i++) { c.globalAlpha = 0.5 + R() * 0.5; c.fillStyle = pick(GLOW); c.save(); c.translate(R() * w, R() * h); c.rotate(R() * 6); c.fillRect(-2.5, -1.2, 5, 2.4); c.restore(); }
      // glow-paint scuffs and smears
      for (let i = 0; i < 60; i++) { c.globalAlpha = 0.25 + R() * 0.3; c.strokeStyle = pick(GLOW); c.lineWidth = 1 + R() * 2; const x = R() * w, y = R() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (R() - 0.5) * 30, y + (R() - 0.5) * 12); c.stroke(); }
      c.globalAlpha = 1;
    });
  };
  P.hallFloor = function () {
    return K3D.paint('al-hallfloor', 512, 512, (c, w, h) => {
      ARCADE.seed(4403);
      c.fillStyle = '#1c1a20'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${R() < 0.5 ? '255,250,240' : '0,0,0'},${R() * 0.07})`; c.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2); }
      for (let i = 0; i < 14; i++) { c.fillStyle = `rgba(0,0,0,${0.08 + R() * 0.12})`; c.beginPath(); c.arc(R() * w, R() * h, 10 + R() * 40, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 2; for (let x = 0; x <= w; x += 128) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); c.beginPath(); c.moveTo(0, x); c.lineTo(w, x); c.stroke(); }
    }, { repeat: true });
  };
  P.haze = function (seed) {
    return K3D.paint('al-haze|' + seed, 256, 256, (c, w, h) => {
      ARCADE.seed(4500 + seed);
      c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) {
        const x = R() * w, y = R() * h, r = 20 + R() * 70;
        for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
          const g = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); g.addColorStop(0, `rgba(255,255,255,${0.05 + R() * 0.08})`); g.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = g; c.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        }
      }
    }, { repeat: true });
  };
  P.glass = function () {
    return K3D.paint('al-glass', 512, 128, (c, w, h) => {
      ARCADE.seed(4404);
      c.clearRect(0, 0, w, h);
      for (let i = 0; i < 18; i++) { const x = R() * w, g = c.createLinearGradient(x, 0, x + 40, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.09)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 30 + R() * 30, 0); c.lineTo(x + 70 + R() * 30, h); c.lineTo(x + 40, h); c.closePath(); c.fill(); }
      // nose and hand prints on the low part of the glass (the crowd presses against it)
      for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,0.06)'; c.beginPath(); c.ellipse(R() * w, h * (0.55 + R() * 0.4), 4 + R() * 6, 3 + R() * 5, 0, 0, Math.PI * 2); c.fill(); }
    });
  };
  return P;
})();
