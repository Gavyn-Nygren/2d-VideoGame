/* Pip & Bo - World 40 Colossus March: the sketch kit (global SKETCH), the ink-and-watercolour look of the whole world. */
'use strict';

/* ===== THE SKETCH KIT: manual ========================================================================================
   World 40 looks like an illustrator's ink-and-watercolour book come to life (Gavyn, 2026-11-14: "a hyper stylized
   kind of hand drawn look ... very high quality ... multiple rounds of redrawing"). No image files: every drawing is a
   hand-authored list of strokes, drawn by the code below. This header is the kit's manual; GAME_NOTES.md (World 40)
   has the art rules and the art rounds.

   SHEETS (cached drawings). Anything big (a Colossus piece, a backdrop layer, a prop) is a SHEET: drawn once per boil
   version into offscreen canvases, then blitted every frame.
     SKETCH.sheet(key, w, h, draw, o)  -> the cached sheet (made on first use). draw(d, v) draws version v (0..2) with
                                         the drawer d (below), in sheet pixels (0..w, 0..h). o: { ox, oy } the anchor
                                         (blit puts this point at x, y), seed, versions (default 3), res (default
                                         SKETCH.res), flat (true: one canvas, no undo layers; backdrops use it),
                                         paper ('dark' for chalk-on-charcoal drawings: ink and hatching become chalk).
     SKETCH.blit(g, key, x, y, o)      draws the sheet's current boil version. o: { undo 0..3, alpha, sx, sy, rot,
                                         t (time; default SKETCH.t) }. undo: 0 full, 1 no colour, 2 pencil only, 3 gone
                                         (fractions blend between them: rule 9, the undoing).
     SKETCH.forget(prefix)             drops cached sheets (a part's leave hook calls it to free memory).
   LIVE drawing (small moving things, the heroes, effects): SKETCH.live(g, seed, v) returns a drawer that paints
   straight onto g with the same calls (no grain pass). Keep live drawings small: they are stroked every frame.

   THE DRAWER d (sheet or live). Points are [x, y]. Every call takes an options object o (all optional):
     w (line width), p ([start, middle, end] width multipliers, the taper), c (centre: lines are heavier on the side of
     the outline facing away from the light, light comes from the top left), col, alpha, jit (boil wobble in px),
     curve (true: a smooth curve through the points), seed (a fixed seed for this stroke), layer.
     d.stroke(pts, o)          one brush-pen stroke: swells and thins, tapers at both ends, never even.
     d.line(x1,y1,x2,y2,o)     a straight-ish stroke that overshoots its ends a little (o.ov px) and bows slightly.
     d.shape(pts, o)           a closed form: o.fill (a wash colour, laid a little off the line), o.ink (default true)
                               the outline as separate strokes that overshoot at the corners (o.corner: the angle in
                               degrees that counts as a corner), o.hatch ({ a, gap, w, tone, cross }) hatching inside.
     d.ellipse(cx,cy,rx,ry,o)  an ellipse drawn as two overlapping strokes (o.rot, o.fill, o.hatch, o.ink)
     d.hatch(poly, o)          hatching inside a polygon: o.a (angle, degrees), o.gap, o.w, o.tone(x, y) -> 0..1
                               (how dark there: lines break up where it is light), o.cross (a second, darker pass at
                               o.a + o.crossA), o.curve (a bend in px, for contour hatching).
     d.contour(lines, o)       contour hatching: lines is a list of point lists that follow the form.
     d.stipple(poly, o)        ink dots: o.n, o.r, o.tone.
     d.spot(pts, o)            solid black spotting (deep shadow) with a brushed edge.
     d.wash(pts, col, o)       a watercolour wash: a loose, off-register fill (o.off px) with a darker dried edge,
                               o.alpha, o.blooms (count), o.layers (glazes, default 3), o.spread (edge wobble).
     d.pencil(pts, o)          a faint graphite line (construction lines); o.closed.
     d.pcircle(cx, cy, r, o)   a pencil construction circle (one loose loop, overshooting).
     d.word(text, x, y, size, o)  hand-lettered brush capitals (A-Z 0-9 ! ? . , ' - : /). o.rot, o.col, o.w,
                               o.fill (a wash behind the letters), o.bounce (baseline wobble), o.spacing,
                               o.align ('left' 'center' 'right'). Returns the width.
     d.cloud(cx, cy, r, o)     a curly ink dust cloud (scalloped edge, curls inside), o.fill, o.puffs.
     d.speed(x, y, dx, dy, n, o)  speed lines along (dx, dy).
     d.smear(pts, o)           a smear frame: dry-brush streaks between the points.
     d.rivets(x1,y1,x2,y2,n,o) a row of rivets (o.r, o.rust: chance of a drip under each).
     d.r()                     the drawing's own steady random (0..1): the same in every boil version, so layout
                               choices (which rivet rusts) never flicker. Never use Math.random in a drawing.
     d.v, d.round              the boil version being drawn, and SKETCH.round (the art round being drawn: a drawing
                               can skip its round-3 detail when d.round < 3; the proof tool uses it for round sheets).
   PAPER. SKETCH.paper(g, kind, x, y, w, h) fills a rectangle with paper: 'sand' (warm cream), 'dusk' (grey-cream),
     'dark' (charcoal), 'dawn' (cream). Grain, fibres and a soft page edge (SKETCH.edge(g, kind)) are baked once.
   HEROES. SKETCH.hero(g, p, o) draws Pip or Bo in the style (feet at the middle of the body's bottom edge), with the
     outfit layers (outfitBehind / outfitOver), so drawPlayer is never changed. o: { dark (a paper rim for charcoal
     paper), x, y (override), face, sq, mood, s }.
   MISC. SKETCH.t (seconds, set each frame by the level), SKETCH.boil() -> the version to show now (0 under reduced
     motion), SKETCH.res (cache resolution), SKETCH.rng(seed), SKETCH.noise(seed, x), SKETCH.INK / CHALK / PAL (the
     palette: paper, ink, rust, soot, verdigris, core yellow, ochres, grey-blues; no purple).
   Rules: no plain rect/arc/lineTo outline may show in a level frame; shading is drawn (hatch, stipple, spot), never a
   gradient, blur or drop shadow; colour is wash; Pip's orange and Bo's blue are the only saturated colours on screen.
   ===================================================================================================================== */

const SKETCH = (() => {
  const S = {};
  const TAU = Math.PI * 2;
  S.INK = '#2a1c14'; S.CHALK = '#efe8d8';
  S.PAL = {
    paper: '#f2e6cc', sand: '#e9d3a4', ochre: '#d9a75a', ochreDeep: '#b9803e', dust: '#e2c38e',
    rust: '#a7462a', rustDark: '#6e2a18', rustLight: '#c9724c', soot: '#463c37', iron: '#8a5c46', ironLight: '#9a735e',
    verd: '#4f9a86', verdLight: '#86c2ad', verdDark: '#2f6556', core: '#f4c63c', coreHot: '#ffe58a', ember: '#e88a2c',
    greyBlue: '#8fa3ad', greyBlueDark: '#5f7581', sky: '#c9d6d2', dusk: '#b9b4a8', cream: '#f6ecd4', bone: '#efe2c4',
    shadowInk: '#3a2a20', green: '#7d9a4f', greenDark: '#4f6a32',
  };
  S.res = 1; S.round = 6; S.t = 0;
  S.reduce = typeof reduceMotion !== 'undefined' ? reduceMotion : false;
  S.boil = (t = S.t) => (S.reduce ? 0 : Math.floor(t * 8) % 3);

  /* ---------- random and noise (seeded, steady) ---------- */
  function rng(seed) {
    let a = (seed * 2654435761) >>> 0 || 0x9e3779b9;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  S.rng = rng;
  const hh = (i, s) => { let h = (i * 374761393 + s * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const sm = k => k * k * (3 - 2 * k);
  function noise(seed, x) { const i = Math.floor(x), f = x - i; return hh(i, seed) + (hh(i + 1, seed) - hh(i, seed)) * sm(f); }
  S.noise = noise;
  function noise2(seed, x, y) {
    const i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
    const a = hh(i + j * 7919, seed), b = hh(i + 1 + j * 7919, seed), c = hh(i + (j + 1) * 7919, seed), e = hh(i + 1 + (j + 1) * 7919, seed);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + e) * fx * fy;
  }
  S.noise2 = noise2;
  const gauss = r => (r() + r() + r() - 1.5) / 1.5;
  const lerp = (a, b, k) => a + (b - a) * k;

  /* ---------- geometry ---------- */
  // a smooth curve through points (Catmull-Rom), sampled about every `step` px
  function spline(pts, closed, step = 2) {
    const n = pts.length; if (n < 3) return pts.slice();
    const out = [], P = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), k = Math.max(2, Math.ceil(len / step));
      for (let j = 0; j < k; j++) {
        const t = j / k, t2 = t * t, t3 = t2 * t;
        out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    if (!closed) out.push(pts[n - 1].slice());
    return out;
  }
  S.spline = spline;
  function resample(pts, step = 2) {
    const out = [pts[0].slice()];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(len / step));
      for (let j = 1; j <= k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
    }
    return out;
  }
  const centroid = pts => { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; };
  const bbox = pts => { let a = 1e9, b = 1e9, c = -1e9, e = -1e9; for (const p of pts) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); e = Math.max(e, p[1]); } return [a, b, c, e]; };
  S.ell = (cx, cy, rx, ry, n = 28, rot = 0, a0 = 0, a1 = TAU) => {
    const out = [], cr = Math.cos(rot), sr = Math.sin(rot);
    for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / (a1 - a0 >= TAU - 1e-6 ? n : n - 1), x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push([cx + x * cr - y * sr, cy + x * sr + y * cr]); }
    return out;
  };
  // a closed ring (outer circle, then the inner one back) with no seam
  S.ring = (cx, cy, r1, r2, n = 40) => { const o = S.ell(cx, cy, r1, r1, n), i = S.ell(cx, cy, r2, r2, n); return o.concat([o[0], i[0]], i.slice().reverse()); };
  S.box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  S.centroid = centroid; S.bbox = bbox;
  // keep the part of a polygon where x * nx + y * ny >= c (one half-plane; Sutherland-Hodgman)
  S.clipHalf = (pts, nx, ny, c) => {
    const out = [], f = p => p[0] * nx + p[1] * ny - c;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], fa = f(a), fb = f(b);
      if (fa >= 0) out.push(a);
      if ((fa >= 0) !== (fb >= 0)) { const k = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
    }
    return out;
  };
  // a crescent: the outer ellipse minus an inner one shifted toward the light (thick on the shadow side)
  S.crescent = (cx, cy, r, th, a0 = -0.3, a1 = 2.4, n = 24) => {
    const o = S.ell(cx, cy, r, r, n, 0, a0, a1), i = S.ell(cx - th * 0.6, cy - th * 0.8, r - th * 0.3, r - th * 0.3, n, 0, a0, a1).reverse();
    return o.concat(i);
  };
  // polygon area sign and point-in-polygon
  const inside = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  S.inside = inside;
  // the light: from the top left. LX, LY point the way the shadow falls
  const LX = 0.6, LY = 0.8;

  /* ---------- the drawer ---------- */
  function makeDrawer(layers, seed, v, live) {
    // layers: { pencil, wash, hatch, ink, white } -> 2D contexts (live: all the same g)
    const d = { v, round: S.round, live, dark: false, k: 0, paperKind: 'sand' };
    const struct = rng(seed * 31 + 7);
    d.r = struct;
    // each call gets its own steady stream and its own boil stream
    const call = o => {
      const s = (o && o.seed != null) ? o.seed : (seed * 977 + (++d.k) * 7919);
      return { r: rng(s), j: rng(s * 13 + v * 104729 + 1), s };
    };
    const L = name => layers[name] || layers.ink;
    const inkCol = o => (o.col || (d.dark ? S.CHALK : S.INK));
    d.inkCol = () => (d.dark ? S.CHALK : S.INK);
    d.ctx = name => L(name);
    // an opaque underlayer of paper inside a form, so a solid thing hides what is behind it (o.kind: the paper)
    d.solid = (pts, o = {}) => {
      const g = layers.base || L('wash'), cv = paperCanvas(o.kind || d.paperKind, true);
      g.save(); g.fillStyle = g.createPattern(cv, 'repeat');
      const q = o.curve ? spline(pts, true, 3) : pts;
      g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
      g.setTransform(1, 0, 0, 1, 0, 0); g.restore(); g.save();
      g.fillStyle = g.createPattern(cv, 'repeat'); g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
      if (o.lw) { g.lineWidth = o.lw; g.strokeStyle = g.fillStyle; g.stroke(); }
      g.restore();
      // on a sheet the layers are separate canvases, so the paper alone cannot hide ink and wash drawn earlier in the
      // same sheet: rub those out inside the form too (a form drawn later is in front of what was drawn before it)
      if (!live && layers.base && o.keep !== true) {
        for (const n of ['pencil', 'wash', 'hatch', 'ink', 'white']) {
          const h = layers[n]; if (!h || h === g) continue;
          h.save(); h.globalCompositeOperation = 'destination-out'; h.globalAlpha = 1; h.fillStyle = '#000';
          h.beginPath(); q.forEach((p, i) => (i ? h.lineTo(p[0], p[1]) : h.moveTo(p[0], p[1]))); h.closePath(); h.fill();
          h.restore();
        }
      }
    };
    // washes laid inside a clip polygon (soft-edged glazes inside a form; the form's own ink line hides the clip)
    d.washIn = (clip, fn) => {
      if (d.round < 4) return;
      const g = L('wash'); g.save(); g.beginPath(); clip.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.clip();
      try { fn(); } finally { g.restore(); }
    };
    // draw fn() clipped to a polygon on the wash and hatch layers (contour hatching inside a curved form)
    d.within = (clip, fn, names = ['wash', 'hatch']) => {
      const gs = [...new Set(names.map(n => L(n)))];
      for (const g of gs) { g.save(); g.beginPath(); clip.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.clip(); }
      try { fn(); } finally { for (const g of gs) g.restore(); }
    };
    // contour hatching round a dome or a disc: arcs about (cx, cy) on the shadow side (bottom right), denser and
    // longer toward the edge; o.r0..o.r1 radii, o.n arcs, o.a0 o.a1 the arc span, o.sq (vertical squash), clipped to poly
    d.arcHatch = (poly, cx, cy, o = {}) => {
      if (d.round < 4 && !o.force) return;
      const n = o.n || 10, r0 = o.r0 || 10, r1 = o.r1 || 60, sq = o.sq || 1;
      d.within(poly, () => {
        for (let i = 0; i < n; i++) {
          const k = i / Math.max(1, n - 1), r = r0 + (r1 - r0) * Math.pow(k, 0.8), span = (o.span || 1.5) * (0.35 + 0.65 * k);
          const mid = o.mid == null ? 0.75 : o.mid, a0 = mid - span / 2 + (d.r() - 0.5) * 0.2, a1 = mid + span / 2 + (d.r() - 0.5) * 0.2;
          d.stroke(S.ell(cx, cy, r, r * sq, 14, o.rot || 0, a0, a1), { w: (o.w || 0.75) * (0.7 + 0.5 * k), curve: true, sh: 0, p: [0.15, 1, 0.15], layer: 'hatch', alpha: o.alpha || 0.75, jit: 0.4, col: o.col });
        }
      }, ['hatch']);
    };
    // lift paint out (a damp brush): paper shows again through the washes in a soft blob
    d.lift = (pts, a = 0.6) => {
      if (d.round < 4) return;
      const R = call({}), g = L('wash'), q = displace(spline(pts, true, 4), R, 2, 1.2);
      g.save(); g.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < 3; k++) { g.globalAlpha = a / 3; const qq = displace(q, R, 1, 0.8); g.beginPath(); qq.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); }
      g.restore();
    };

    // core brush: a filled polygon along the path with a varying width
    function brush(g, path, o, R) {
      const n = path.length; if (n < 2) return;
      const w = o.w == null ? 2 : o.w, pr = o.p || [0.2, 1, 0.25], prs = o.pr == null ? 0.28 : o.pr, sh = o.sh == null ? 0.7 : o.sh;
      const ps = R.s % 9973, lens = [0]; let tot = 0;
      for (let i = 1; i < n; i++) { tot += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); lens.push(tot); }
      if (tot < 0.3) return;
      const cen = o.c;
      const left = [], right = [];
      for (let i = 0; i < n; i++) {
        const a = path[Math.max(0, i - 1)], b = path[Math.min(n - 1, i + 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        let nx = -ty, ny = tx;
        // the outward normal: away from the centre if given, else toward the shadow
        if (cen) { if ((path[i][0] - cen[0]) * nx + (path[i][1] - cen[1]) * ny < 0) { nx = -nx; ny = -ny; } }
        else if (nx * LX + ny * LY < 0) { nx = -nx; ny = -ny; }
        const t = lens[i] / tot;
        const tp = t < 0.5 ? lerp(pr[0], pr[1], Math.sin(t * Math.PI)) : lerp(pr[2], pr[1], Math.sin(t * Math.PI));
        const press = 1 + prs * (noise(ps, lens[i] / 26) * 2 - 1) + prs * 0.4 * (noise(ps + 3, lens[i] / 7) * 2 - 1);
        const shade = 1 + sh * Math.max(0, nx * LX + ny * LY);
        const ww = Math.max(0.05, w * tp * press * shade);
        const off = cen ? (shade - 1) * w * 0.35 : 0;
        const cx = path[i][0] + nx * off, cy = path[i][1] + ny * off;
        left.push([cx + nx * ww / 2, cy + ny * ww / 2]); right.push([cx - nx * ww / 2, cy - ny * ww / 2]);
      }
      g.beginPath(); g.moveTo(left[0][0], left[0][1]);
      for (let i = 1; i < n; i++) g.lineTo(left[i][0], left[i][1]);
      for (let i = n - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
      g.closePath(); g.fill();
    }
    // jitter control points for the boil (and the hand's wobble), then smooth / resample
    function prep(pts, o, R, closed) {
      const jit = o.jit == null ? 0.65 : o.jit, bend = o.bend == null ? 0.6 : o.bend;
      const n = pts.length;
      let q = pts.map(p => [p[0] + gauss(R.j) * jit, p[1] + gauss(R.j) * jit]);
      if (o.curve) q = spline(q, closed, 2.2);
      else q = resample(closed ? q.concat([q[0]]) : q, 2.2);
      // a slow hand wobble along the line (steady) plus a whisper of boil
      if (bend > 0 && q.length > 4) {
        const s1 = R.s % 7919, s2 = (R.s * 3 + v) % 7919;
        for (let i = 0; i < q.length; i++) {
          const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)];
          let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
          const m = (noise(s1, i / 14) - 0.5) * bend * 1.6 + (noise(s2, i / 9) - 0.5) * jit * 0.5;
          q[i][0] += nx * m; q[i][1] += ny * m;
        }
      }
      return q;
    }
    d.stroke = (pts, o = {}) => {
      if (!pts || pts.length < 2) return;
      if (d.round < 2 && !live && !o.force) { d.pencil(pts, { curve: o.curve, alpha: 0.5, w: 0.9 }); return; }
      const R = call(o), g = L(o.layer || 'ink');
      g.fillStyle = inkCol(o); g.globalAlpha = (o.alpha == null ? 0.93 : o.alpha) * (0.92 + 0.08 * R.r());
      let path = prep(pts, o, R, false);
      // breaks: the pen lifts for a moment
      if (o.brk && path.length > 30) {
        const parts = []; let cur = [];
        for (let i = 0; i < path.length; i++) { cur.push(path[i]); if (cur.length > 18 && R.r() < o.brk * 0.08) { parts.push(cur); cur = []; i += 1 + Math.floor(R.r() * 2); } }
        if (cur.length > 1) parts.push(cur);
        for (const pp of parts) brush(g, pp, o, R);
      } else brush(g, path, o, R);
      g.globalAlpha = 1;
    };
    d.line = (x1, y1, x2, y2, o = {}) => {
      const R = call(o), ov = o.ov == null ? 2.2 : o.ov, len = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / len, uy = (y2 - y1) / len;
      const a = ov * (0.4 + R.r() * 0.9), b = ov * (0.4 + R.r() * 0.9), bow = (o.bow == null ? 0.012 : o.bow) * len * (R.r() * 2 - 1);
      const p0 = [x1 - ux * a, y1 - uy * a], p2 = [x2 + ux * b, y2 + uy * b], pm = [(x1 + x2) / 2 - uy * bow, (y1 + y2) / 2 + ux * bow];
      d.stroke([p0, pm, p2], Object.assign({ curve: true }, o, { seed: o.seed != null ? o.seed : R.s + 1 }));
    };
    // a closed outline as several strokes that overshoot at the corners
    d.outline = (pts, o = {}) => {
      const n = pts.length, cor = Math.cos(((o.corner == null ? 38 : o.corner) * Math.PI) / 180), c = o.c || centroid(pts);
      if (o.curve) {
        // smooth closed form: two or three overlapping strokes round it
        const sp = spline(pts, true, 3), m = sp.length, k = o.strokes || (m > 120 ? 3 : 2), R = call(o);
        const st = Math.floor(R.r() * m);
        for (let s = 0; s < k; s++) {
          const a = st + Math.floor(s * m / k) - 3, b = st + Math.floor((s + 1) * m / k) + 4 + Math.floor(R.r() * 4);
          const seg = []; for (let i = a; i <= b; i++) seg.push(sp[((i % m) + m) % m]);
          d.stroke(seg, Object.assign({}, o, { curve: false, c, seed: R.s + s * 17 + 3 }));
        }
        return;
      }
      // straight-sided: split at corners
      const isCorner = i => {
        const a = pts[(i - 1 + n) % n], b = pts[i], e = pts[(i + 1) % n];
        const ux = b[0] - a[0], uy = b[1] - a[1], vx = e[0] - b[0], vy = e[1] - b[1];
        return (ux * vx + uy * vy) / ((Math.hypot(ux, uy) * Math.hypot(vx, vy)) || 1) < cor;
      };
      const corners = []; for (let i = 0; i < n; i++) if (isCorner(i)) corners.push(i);
      if (!corners.length) { d.outline(pts, Object.assign({}, o, { curve: true })); return; }
      for (let ci = 0; ci < corners.length; ci++) {
        const a = corners[ci], b = corners[(ci + 1) % corners.length];
        const seg = []; let i = a; do { seg.push(pts[i]); i = (i + 1) % n; } while (i !== b); seg.push(pts[b]);
        // overshoot both ends
        const R = call(o), ov = o.ov == null ? 2.4 : o.ov;
        const s0 = seg[0], s1 = seg[1], e0 = seg[seg.length - 1], e1 = seg[seg.length - 2];
        const l0 = Math.hypot(s0[0] - s1[0], s0[1] - s1[1]) || 1, l1 = Math.hypot(e0[0] - e1[0], e0[1] - e1[1]) || 1;
        const k0 = ov * (0.3 + R.r()), k1 = ov * (0.3 + R.r());
        seg[0] = [s0[0] + (s0[0] - s1[0]) / l0 * k0, s0[1] + (s0[1] - s1[1]) / l0 * k0];
        seg[seg.length - 1] = [e0[0] + (e0[0] - e1[0]) / l1 * k1, e0[1] + (e0[1] - e1[1]) / l1 * k1];
        d.stroke(seg.length === 2 ? [seg[0], [(seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2], seg[1]] : seg,
          Object.assign({}, o, { c, curve: !!o.smooth, seed: R.s + 5 }));
      }
    };
    d.shape = (pts, o = {}) => {
      if (o.fill) d.wash(pts, o.fill, Object.assign({ alpha: o.fillAlpha }, o.washO || {}));
      if (o.hatch && d.round >= 4) d.hatch(pts, o.hatch);
      if (o.spotPts && d.round >= 4) d.spot(o.spotPts, {});
      if (o.ink !== false && d.round >= 2) d.outline(pts, o);
      else if (o.ink !== false && d.round < 2) d.pencil(pts, { closed: true });
    };
    d.ellipse = (cx, cy, rx, ry, o = {}) => {
      const pts = S.ell(cx, cy, rx, ry, Math.max(14, Math.round((rx + ry) / 2.2)), o.rot || 0);
      d.shape(pts, Object.assign({ curve: true }, o));
      return pts;
    };
    // hatching inside a polygon
    d.hatch = (poly, o = {}) => {
      if (d.round < 4 && !o.force) return;
      const R = call(o), g = L(o.layer || 'hatch');
      const ang = ((o.a == null ? 52 : o.a) * Math.PI) / 180, gap = o.gap || 4, w = o.w || 0.75, tone = o.tone, curve = o.curve || 0;
      const ca = Math.cos(-ang), sa = Math.sin(-ang);
      const rp = poly.map(p => [p[0] * ca - p[1] * sa, p[0] * sa + p[1] * ca]);
      const [x0, y0, x1, y1] = bbox(rp);
      const ib = Math.cos(ang), is = Math.sin(ang);
      const back = (x, y) => [x * ib - y * is, x * is + y * ib];
      g.fillStyle = inkCol(o); const al = o.alpha == null ? 0.8 : o.alpha;
      for (let y = y0 + gap * (0.3 + R.r() * 0.5); y < y1; y += gap * (0.82 + R.r() * 0.36)) {
        const xs = [];
        for (let i = 0, j = rp.length - 1; i < rp.length; j = i++) {
          const a = rp[i], b = rp[j];
          if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]));
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          let xa = xs[k] + (R.r() * 3.2 - 0.9), xb = xs[k + 1] - (R.r() * 3.2 - 0.9);
          if (xb - xa < 2) continue;
          // split into runs where the tone keeps the line
          const runs = []; const stepL = 7;
          if (tone) {
            let start = null;
            for (let x = xa; x <= xb; x += stepL) {
              const p = back(Math.min(x + stepL / 2, xb), y), keep = R.r() * 0.22 + 0.42 < tone(p[0], p[1]);
              if (keep && start == null) start = x; if (!keep && start != null) { runs.push([start, x]); start = null; }
            }
            if (start != null) runs.push([start, xb]);
          } else runs.push([xa, xb]);
          // a hand hatches in short strokes: long runs break into dashes of 12-34 px with small gaps and a slight swing
          const pieces = [];
          for (const [ra, rb] of runs) {
            let x = ra;
            while (x < rb) { const l = o.long ? rb - x : 12 + R.r() * 22, e = Math.min(rb, x + l); pieces.push([x, e]); x = e + 0.8 + R.r() * 2.2; }
          }
          for (const [ra, rb] of pieces) {
            if (rb - ra < 2.5) continue;
            const mid = (ra + rb) / 2, bw = curve * (1 + 0.3 * (R.r() - 0.5));
            const sw = (R.r() - 0.5) * 1.6, pts = [back(ra, y + sw * 0.3), back(mid, y + bw), back(rb, y - sw * 0.3 + (R.r() - 0.5) * 0.8)];
            g.globalAlpha = al * (0.75 + R.r() * 0.25);
            const sR = { s: R.s + Math.floor(y * 7 + ra), r: R.r, j: R.j };
            brush(g, prep(pts, { curve: true, jit: (o.jit == null ? 0.45 : o.jit), bend: 0.25 }, sR, false), { w: w * (0.8 + R.r() * 0.4), p: [0.35, 1, 0.15], pr: 0.2, sh: 0 }, sR);
          }
        }
      }
      g.globalAlpha = 1;
      if (o.cross) d.hatch(poly, Object.assign({}, o, { a: (o.a == null ? 52 : o.a) + (o.crossA || 74), cross: false, gap: (o.crossGap || gap * 1.15), tone: o.crossTone || (tone ? (x, y) => tone(x, y) - 0.35 : null), seed: R.s + 99 }));
    };
    d.contour = (lines, o = {}) => {
      if (d.round < 4 && !o.force) return;
      for (const ln of lines) d.stroke(ln, Object.assign({ w: 0.8, p: [0.3, 1, 0.15], sh: 0, curve: true, layer: 'hatch', jit: 0.4, alpha: 0.78 }, o));
    };
    d.stipple = (poly, o = {}) => {
      if (d.round < 4 && !o.force) return;
      const R = call(o), g = L(o.layer || 'hatch'), [x0, y0, x1, y1] = bbox(poly), n = o.n || 60, r = o.r || 0.8;
      g.fillStyle = inkCol(o);
      for (let i = 0, tries = 0; i < n && tries < n * 8; tries++) {
        const x = lerp(x0, x1, R.r()), y = lerp(y0, y1, R.r());
        if (!inside(poly, x, y)) continue;
        if (o.tone && R.r() > o.tone(x, y)) continue;
        i++;
        g.globalAlpha = (o.alpha || 0.85) * (0.6 + R.r() * 0.4);
        g.beginPath(); g.ellipse(x + gauss(R.j) * 0.3, y + gauss(R.j) * 0.3, r * (0.6 + R.r() * 0.7), r * (0.5 + R.r() * 0.6), R.r() * 3, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
    };
    d.spot = (pts, o = {}) => {
      if (d.round < 4 && !o.force) return;
      const R = call(o), g = L(o.layer || 'ink');
      let q = displace(pts.map(p => [p[0] + gauss(R.j) * 0.5, p[1] + gauss(R.j) * 0.5]), R, 2, o.spread || 0.9);
      if (o.curve) q = spline(q, true, 2);
      g.fillStyle = inkCol(o); g.globalAlpha = o.alpha == null ? 0.92 : o.alpha;
      g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
      g.globalAlpha = 1;
    };
    // recursive midpoint displacement (wash and spot edges)
    function displace(pts, R, depth, amt) {
      let q = pts;
      for (let k = 0; k < depth; k++) {
        const out = [];
        for (let i = 0; i < q.length; i++) {
          const a = q[i], b = q[(i + 1) % q.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          out.push(a);
          if (len > 3) { const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len, m = gauss(R.r) * len * 0.12 * amt; out.push([(a[0] + b[0]) / 2 + nx * m, (a[1] + b[1]) / 2 + ny * m]); }
        }
        q = out; amt *= 0.7;
      }
      return q;
    }
    d.wash = (pts, col, o = {}) => {
      if (d.round < 4 && !o.force) return;
      const R = call(o), g = L(o.layer || 'wash');
      const off = o.off == null ? 2.2 : o.off, oa = R.r() * TAU, ox = Math.cos(oa) * off + (o.dx || 0), oy = Math.sin(oa) * off + (o.dy || 0);
      const layersN = o.layers || 3, al = o.alpha == null ? 0.62 : o.alpha, spread = o.spread == null ? 1 : o.spread;
      const base = (o.curve ? spline(pts, true, 4) : resample(pts.concat([pts[0]]), 6)).map(p => [p[0] + ox + gauss(R.j) * 0.35, p[1] + oy + gauss(R.j) * 0.35]);
      const prevOp = g.globalCompositeOperation;
      g.globalCompositeOperation = o.op || (d.dark ? 'source-over' : 'multiply');
      g.fillStyle = col;
      for (let k = 0; k < layersN; k++) {
        const q = displace(base, R, 2, 0.6 * spread);
        g.globalAlpha = al / layersN * (k === 0 ? 1.3 : 0.9);
        g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
      }
      // the darker dried edge
      if (o.edge !== false) {
        g.strokeStyle = o.edgeCol || col; g.globalAlpha = al * (o.edgeA || 0.55); g.lineWidth = o.edgeW || 1.3; g.lineJoin = 'round';
        const q = displace(base, R, 1, 0.3);
        g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.stroke();
      }
      // blooms: a backrun with a dark rim
      const [bx0, by0, bx1, by1] = bbox(pts);
      for (let b = 0; b < (o.blooms || 0); b++) {
        const cx = lerp(bx0, bx1, 0.15 + R.r() * 0.7), cy = lerp(by0, by1, 0.15 + R.r() * 0.7);
        if (!inside(pts, cx, cy)) continue;
        const r = Math.min(bx1 - bx0, by1 - by0) * (0.08 + R.r() * 0.12);
        const q = displace(S.ell(cx, cy, r, r * (0.7 + R.r() * 0.5), 10, R.r() * 3), R, 2, 1.2);
        g.globalAlpha = al * 0.45; g.strokeStyle = col; g.lineWidth = 1.1;
        g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.stroke();
        if (!d.dark) { g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.18; g.fill(); g.globalCompositeOperation = o.op || 'multiply'; }
      }
      g.globalAlpha = 1; g.globalCompositeOperation = prevOp;
    };
    d.pencil = (pts, o = {}) => {
      const R = call(o), g = L(o.layer || 'pencil');
      const q = o.curve ? spline(o.closed ? pts : pts, !!o.closed, 3) : resample(o.closed ? pts.concat([pts[0]]) : pts, 3);
      g.strokeStyle = o.col || (d.dark ? 'rgba(230,224,210,1)' : '#5c534a'); g.lineWidth = o.w || 0.7; g.lineCap = 'round';
      const al = o.alpha == null ? 0.32 : o.alpha;
      // granular graphite: short overlapping dashes of varying darkness
      for (let i = 1; i < q.length; i++) {
        if (R.r() < 0.06) continue;
        g.globalAlpha = al * (0.45 + R.r() * 0.6);
        g.beginPath(); g.moveTo(q[i - 1][0] + gauss(R.j) * 0.25, q[i - 1][1] + gauss(R.j) * 0.25); g.lineTo(q[i][0], q[i][1]); g.stroke();
      }
      g.globalAlpha = 1;
    };
    d.pcircle = (cx, cy, r, o = {}) => {
      const R = call(o), a0 = R.r() * TAU, pts = [];
      for (let i = 0; i <= 30; i++) { const a = a0 + i / 28 * TAU, rr = r * (1 + (i / 30) * 0.04 + gauss(R.r) * 0.006); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * (o.ry || 1)]); }
      d.pencil(pts, Object.assign({ curve: true }, o));
    };
    d.word = (text, x, y, size, o = {}) => drawWord(d, text, x, y, size, o, call(o));
    d.cloud = (cx, cy, r, o = {}) => {
      const R = call(o), n = o.puffs || 7, pts = [];
      // a scalloped outline: a row of bumps round an egg
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * TAU - Math.PI / 2, a1 = ((i + 1) / n) * TAU - Math.PI / 2, rr = r * (0.85 + R.r() * 0.3);
        const bulge = r * (0.32 + R.r() * 0.18);
        for (let k = 0; k <= 6; k++) {
          const a = lerp(a0, a1, k / 6), bb = Math.sin((k / 6) * Math.PI) * bulge;
          pts.push([cx + Math.cos(a) * (rr * (o.flat ? 1.25 : 1) + bb), cy + Math.sin(a) * (rr * (o.flat ? 0.62 : 0.86) + bb * 0.8)]);
        }
      }
      if (o.fill) d.wash(pts, o.fill, { alpha: o.fillAlpha == null ? 0.45 : o.fillAlpha, off: 1.5 });
      if (d.round >= 2) {
        // the scallops as separate little strokes (heavier underneath)
        const m = pts.length, per = 7;
        for (let i = 0; i < m; i += per) {
          const seg = []; for (let k = 0; k <= per + 1; k++) seg.push(pts[(i + k) % m]);
          d.stroke(seg, { w: o.w || 1.6, curve: true, c: [cx, cy], p: [0.15, 1, 0.1], sh: 1.1, col: o.col, alpha: o.alpha });
        }
        // curls inside
        for (let i = 0; i < (o.curls == null ? 2 : o.curls); i++) {
          const a = R.r() * TAU, cr = r * (0.25 + R.r() * 0.2), ccx = cx + Math.cos(a) * r * 0.35, ccy = cy + Math.sin(a) * r * 0.3, sp = [];
          for (let k = 0; k <= 14; k++) { const t = k / 14, aa = a + t * 4.6, rr = cr * (1 - t * 0.75); sp.push([ccx + Math.cos(aa) * rr, ccy + Math.sin(aa) * rr * 0.8]); }
          d.stroke(sp, { w: (o.w || 1.6) * 0.65, curve: true, p: [0.1, 1, 0.1], sh: 0, col: o.col, alpha: o.alpha });
        }
      } else d.pencil(pts, { closed: true });
      return pts;
    };
    d.speed = (x, y, dx, dy, n, o = {}) => {
      const R = call(o), len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, spread = o.spread || 40;
      for (let i = 0; i < n; i++) {
        const k = (i / Math.max(1, n - 1) - 0.5) * spread + gauss(R.r) * 3, l = 0.55 + R.r() * 0.45, s = R.r() * 0.3;
        const ax = x + nx * k + dx * s, ay = y + ny * k + dy * s;
        d.stroke([[ax, ay], [ax + dx * l * 0.5 + nx * 0.6, ay + dy * l * 0.5 + ny * 0.6], [ax + dx * l, ay + dy * l]], { w: o.w || 1.2, p: [0.05, 1, 0.6], sh: 0, curve: true, col: o.col, alpha: o.alpha == null ? 0.75 : o.alpha });
      }
    };
    d.smear = (pts, o = {}) => {
      const R = call(o);
      for (let i = 0; i < (o.n || 9); i++) {
        const off = gauss(R.r) * (o.spread || 6);
        d.stroke(pts.map(p => [p[0] + off * 0.3, p[1] + off]), { w: (o.w || 2.4) * (0.5 + R.r()), p: [0.1, 1, 0.05], sh: 0, curve: true, alpha: 0.55 + R.r() * 0.3, brk: 0.5, col: o.col });
      }
    };
    d.rivets = (x1, y1, x2, y2, n, o = {}) => {
      const r = o.r || 2.2;
      for (let i = 0; i < n; i++) {
        const k = n === 1 ? 0.5 : i / (n - 1), x = lerp(x1, x2, k) + (d.r() - 0.5) * 0.8, y = lerp(y1, y2, k) + (d.r() - 0.5) * 0.8;
        rivet(x, y, r * (0.9 + d.r() * 0.2), o);
        if (o.rust && d.r() < o.rust) drip(x, y + r * 0.9, r * (1.4 + d.r() * 2.2) * 2.4, o);
      }
    };
    function rivet(x, y, r, o) {
      if (d.round < 3) return;
      // a domed head: a dark crescent underneath, paper highlight on top
      const R = call({});
      if (d.round >= 4) d.wash(S.ell(x + 0.3, y + 0.3, r, r * 0.9, 9), o.rcol || (d.dark ? '#cfc6b6' : S.PAL.rustDark), { alpha: d.dark ? 0.35 : 0.5, off: 0.4, layers: 1, edge: false });
      const a0 = -0.35 + gauss(R.r) * 0.2;
      d.stroke(S.ell(x, y, r, r * 0.92, 9, 0, a0, a0 + Math.PI * 1.15), { w: r * 0.55, p: [0.2, 1, 0.2], sh: 0, jit: 0.25, bend: 0 });
      if (d.round >= 4 && !d.dark) d.stroke([[x - r * 0.5, y - r * 0.15], [x - r * 0.15, y - r * 0.55]], { w: r * 0.38, col: '#fbf3df', alpha: 0.75, layer: 'white', jit: 0.2, bend: 0, sh: 0 });
    }
    d.rivet = (x, y, r = 2.2, o = {}) => rivet(x, y, r, o);
    function drip(x, y, len, o) {
      if (d.round < 3) return;
      const R = call({}), wob = (R.r() - 0.5) * 1.4;
      const pts = [[x, y], [x + wob * 0.5, y + len * 0.45], [x + wob, y + len]];
      if (d.round >= 4) d.stroke(pts, { w: 2.2, p: [0.9, 0.7, 0.2], sh: 0, col: d.dark ? '#b98a70' : S.PAL.rust, alpha: 0.45, layer: 'wash', curve: true });
      d.stroke(pts, { w: 0.7, p: [0.6, 0.8, 0.1], sh: 0, curve: true, alpha: 0.6, layer: 'hatch' });
    }
    d.drip = (x, y, len, o = {}) => drip(x, y, len, o);
    return d;
  }

  /* ---------- the stroke alphabet: brush capitals ----------
     each glyph: [width, strokes], a stroke is a list of points in a 0..1 x 0..1 box (y down); 'c' first = a curve */
  const GLYPHS = {
    A: [0.82, [[[0.02, 1], [0.42, 0]], [[0.4, 0], [0.82, 1]], [[0.18, 0.62], [0.7, 0.6]]]],
    B: [0.72, [[[0.06, 0], [0.06, 1]], ['c', [0.06, 0.02], [0.52, 0.02], [0.64, 0.24], [0.48, 0.46], [0.08, 0.48]], ['c', [0.08, 0.48], [0.6, 0.5], [0.72, 0.76], [0.52, 0.98], [0.06, 0.98]]]],
    C: [0.72, [['c', [0.7, 0.14], [0.46, 0.0], [0.12, 0.12], [0.02, 0.5], [0.14, 0.88], [0.46, 1], [0.72, 0.86]]]],
    D: [0.76, [[[0.06, 0], [0.06, 1]], ['c', [0.06, 0.02], [0.5, 0.04], [0.74, 0.3], [0.72, 0.7], [0.46, 0.98], [0.06, 0.98]]]],
    E: [0.64, [[[0.08, 0], [0.06, 1]], [[0.06, 0.02], [0.6, 0]], [[0.08, 0.48], [0.48, 0.5]], [[0.06, 0.98], [0.62, 1]]]],
    F: [0.62, [[[0.08, 0], [0.06, 1]], [[0.06, 0.02], [0.6, 0]], [[0.08, 0.48], [0.48, 0.5]]]],
    G: [0.78, [['c', [0.72, 0.14], [0.46, 0.0], [0.12, 0.12], [0.02, 0.5], [0.14, 0.88], [0.46, 1], [0.74, 0.86], [0.74, 0.56]], [[0.44, 0.56], [0.76, 0.56]]]],
    H: [0.76, [[[0.06, 0], [0.06, 1]], [[0.72, 0], [0.7, 1]], [[0.06, 0.5], [0.72, 0.48]]]],
    I: [0.3, [[[0.15, 0], [0.15, 1]]]],
    J: [0.56, [['c', [0.5, 0], [0.5, 0.7], [0.4, 0.96], [0.16, 0.98], [0.02, 0.8]]]],
    K: [0.72, [[[0.06, 0], [0.06, 1]], [[0.68, 0], [0.08, 0.56]], [[0.28, 0.4], [0.72, 1]]]],
    L: [0.58, [[[0.08, 0], [0.06, 1]], [[0.06, 0.98], [0.56, 1]]]],
    M: [0.94, [[[0.04, 1], [0.1, 0]], [[0.1, 0], [0.47, 0.72]], [[0.47, 0.72], [0.84, 0]], [[0.84, 0], [0.9, 1]]]],
    N: [0.78, [[[0.06, 1], [0.06, 0]], [[0.06, 0], [0.72, 1]], [[0.72, 1], [0.72, 0]]]],
    O: [0.84, [['c', [0.42, 0], [0.08, 0.14], [0.02, 0.52], [0.18, 0.9], [0.46, 1], [0.76, 0.86], [0.82, 0.46], [0.66, 0.1], [0.36, 0.02]]]],
    P: [0.68, [[[0.06, 0], [0.06, 1]], ['c', [0.06, 0.02], [0.52, 0.02], [0.66, 0.26], [0.5, 0.5], [0.08, 0.52]]]],
    Q: [0.84, [['c', [0.42, 0], [0.08, 0.14], [0.02, 0.52], [0.18, 0.9], [0.46, 1], [0.76, 0.86], [0.82, 0.46], [0.66, 0.1], [0.36, 0.02]], [[0.5, 0.7], [0.86, 1.06]]]],
    R: [0.72, [[[0.06, 0], [0.06, 1]], ['c', [0.06, 0.02], [0.52, 0.02], [0.66, 0.26], [0.5, 0.5], [0.08, 0.52]], [[0.3, 0.52], [0.72, 1]]]],
    S: [0.66, [['c', [0.62, 0.12], [0.4, 0], [0.1, 0.06], [0.08, 0.3], [0.32, 0.48], [0.58, 0.62], [0.6, 0.88], [0.3, 1], [0.02, 0.88]]]],
    T: [0.7, [[[0.0, 0.02], [0.7, 0]], [[0.36, 0.02], [0.35, 1]]]],
    U: [0.76, [['c', [0.06, 0], [0.06, 0.7], [0.2, 0.96], [0.4, 1], [0.62, 0.94], [0.72, 0.7], [0.72, 0]]]],
    V: [0.78, [[[0.0, 0], [0.4, 1]], [[0.4, 1], [0.78, 0]]]],
    W: [1.04, [[[0.0, 0], [0.24, 1]], [[0.24, 1], [0.52, 0.3]], [[0.52, 0.3], [0.8, 1]], [[0.8, 1], [1.04, 0]]]],
    X: [0.74, [[[0.02, 0], [0.72, 1]], [[0.7, 0], [0.04, 1]]]],
    Y: [0.72, [[[0.0, 0], [0.36, 0.5]], [[0.72, 0], [0.36, 0.5]], [[0.36, 0.5], [0.35, 1]]]],
    Z: [0.7, [[[0.02, 0.02], [0.68, 0]], [[0.68, 0], [0.04, 1]], [[0.04, 0.98], [0.7, 1]]]],
    0: [0.66, [['c', [0.34, 0], [0.06, 0.16], [0.04, 0.52], [0.16, 0.9], [0.36, 1], [0.6, 0.86], [0.62, 0.46], [0.52, 0.1], [0.3, 0.02]]]],
    1: [0.4, [[[0.04, 0.22], [0.26, 0]], [[0.26, 0], [0.26, 1]]]],
    2: [0.62, [['c', [0.04, 0.2], [0.24, 0.02], [0.5, 0.04], [0.58, 0.3], [0.3, 0.64], [0.02, 0.98]], [[0.02, 0.98], [0.62, 0.98]]]],
    3: [0.6, [['c', [0.04, 0.12], [0.3, 0], [0.54, 0.12], [0.5, 0.36], [0.24, 0.48]], ['c', [0.24, 0.48], [0.56, 0.58], [0.58, 0.86], [0.32, 1], [0.02, 0.9]]]],
    4: [0.66, [[[0.48, 1], [0.48, 0]], [[0.48, 0], [0.02, 0.7]], [[0.02, 0.7], [0.66, 0.7]]]],
    5: [0.62, [[[0.56, 0.02], [0.12, 0.02]], [[0.12, 0.02], [0.08, 0.44]], ['c', [0.08, 0.44], [0.4, 0.36], [0.6, 0.6], [0.5, 0.92], [0.24, 1], [0.02, 0.9]]]],
    6: [0.62, [['c', [0.54, 0.06], [0.3, 0.02], [0.08, 0.3], [0.04, 0.7], [0.24, 1], [0.5, 0.92], [0.58, 0.66], [0.38, 0.46], [0.08, 0.56]]]],
    7: [0.6, [[[0.02, 0.02], [0.6, 0]], [[0.6, 0], [0.22, 1]]]],
    8: [0.62, [['c', [0.32, 0.48], [0.08, 0.32], [0.14, 0.06], [0.36, 0], [0.54, 0.12], [0.5, 0.36], [0.3, 0.5], [0.06, 0.7], [0.14, 0.96], [0.4, 1], [0.6, 0.8], [0.5, 0.58], [0.32, 0.48]]]],
    9: [0.62, [['c', [0.56, 0.44], [0.3, 0.54], [0.06, 0.4], [0.08, 0.1], [0.32, 0], [0.56, 0.12], [0.58, 0.5], [0.46, 0.86], [0.12, 1]]]],
    '!': [0.3, [[[0.16, 0], [0.14, 0.68]], [[0.14, 0.92], [0.15, 0.98]]]],
    '?': [0.58, [['c', [0.04, 0.18], [0.26, 0], [0.52, 0.08], [0.52, 0.3], [0.28, 0.48], [0.27, 0.7]], [[0.27, 0.92], [0.28, 0.98]]]],
    '.': [0.26, [[[0.12, 0.92], [0.13, 0.99]]]],
    ',': [0.26, [[[0.14, 0.9], [0.06, 1.1]]]],
    "'": [0.22, [[[0.12, 0], [0.1, 0.24]]]],
    '-': [0.46, [[[0.04, 0.54], [0.42, 0.52]]]],
    ':': [0.26, [[[0.12, 0.3], [0.13, 0.36]], [[0.12, 0.9], [0.13, 0.96]]]],
    '/': [0.5, [[[0.46, 0], [0.04, 1]]]],
    ' ': [0.36, []],
  };
  S.GLYPHS = GLYPHS;
  function drawWord(d, text, x, y, size, o, R) {
    const str = String(text).toUpperCase(), sp = (o.spacing == null ? 0.16 : o.spacing) * size;
    let tw = 0; for (const ch of str) { const gl = GLYPHS[ch] || GLYPHS[' ']; tw += gl[0] * size + sp; } tw -= sp;
    let cx = o.align === 'center' ? -tw / 2 : o.align === 'right' ? -tw : 0;
    const rot = o.rot || 0, cr = Math.cos(rot), sr = Math.sin(rot), w = o.w || Math.max(1.2, size * 0.13), bounce = o.bounce == null ? 0.07 : o.bounce;
    const T2 = (px, py) => [x + px * cr - py * sr, y + px * sr + py * cr];
    let i = 0;
    for (const ch of str) {
      const gl = GLYPHS[ch] || GLYPHS[' '], gw = gl[0] * size;
      const by = (noise(R.s % 997, i * 0.9) - 0.5) * bounce * size * 2, lr = (R.r() - 0.5) * 0.12, sc = 1 + (R.r() - 0.5) * 0.1;
      const lc = Math.cos(lr), ls = Math.sin(lr);
      for (const st of gl[1]) {
        const curved = st[0] === 'c', pts = (curved ? st.slice(1) : st).map(([gx, gy]) => {
          const lx = (gx - gl[0] / 2) * size * sc, ly = (gy - 0.5) * size * sc;
          return T2(cx + gw / 2 + lx * lc - ly * ls, by - size / 2 + lx * ls + ly * lc + size / 2);
        });
        const so = { w, curve: curved || pts.length > 2, p: [0.35, 1.05, 0.4], col: o.col, alpha: o.alpha, jit: o.jit == null ? 0.5 : o.jit, sh: 0.5, layer: o.layer };
        if (o.fill) d.stroke(pts.map(p => [p[0] + w * 0.35, p[1] + w * 0.4]), Object.assign({}, so, { w: w * 1.9, col: o.fill, alpha: 0.5, layer: 'wash' }));
        if (o.halo) d.stroke(pts, Object.assign({}, so, { w: w + o.halo * 2, col: o.haloCol || S.PAL.cream, alpha: 0.9, layer: o.haloLayer || 'wash' }));
        d.stroke(pts.length === 2 ? [pts[0], [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2], pts[1]] : pts, so);
      }
      cx += gw + sp; i++;
    }
    return tw;
  }
  S.wordWidth = (text, size, spacing = 0.16) => { let tw = 0; for (const ch of String(text).toUpperCase()) tw += ((GLYPHS[ch] || GLYPHS[' '])[0] + spacing) * size; return tw - spacing * size; };

  /* ---------- grain textures (made once) ---------- */
  const grain = {};
  function grainCanvas(kind) {
    if (grain[kind]) return grain[kind];
    const n = 256, cv = document.createElement('canvas'); cv.width = cv.height = n;
    const g = cv.getContext('2d'), im = g.createImageData(n, n), R = rng(kind.length * 977 + 3);
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = (i / n) | 0;
      const f = noise2(11, x / 3.1, y / 3.1) * 0.6 + noise2(12, x / 1.3, y / 1.3) * 0.4;
      let a = 0;
      if (kind === 'wash') a = Math.max(0, f - 0.58) * 0.9 + (R() < 0.012 ? 0.3 : 0);      // pigment granulation
      else if (kind === 'ink') a = Math.max(0, f - 0.7) * 1.3 + (R() < 0.008 ? 0.5 : 0);
      else if (kind === 'chalk') a = Math.max(0, f - 0.5) * 1.2 + (R() < 0.05 ? 0.6 : 0);  // chalk: a broken, dusty line 
      im.data[i * 4 + 3] = Math.min(255, a * 255);
    }
    g.putImageData(im, 0, 0);
    return (grain[kind] = cv);
  }
  function applyGrain(g, kind, w, h) {
    const pat = g.createPattern(grainCanvas(kind), 'repeat');
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out'; g.fillStyle = pat; g.fillRect(0, 0, w, h); g.restore();
  }

  /* ---------- sheets ---------- */
  const SHEETS = {};
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  S.sheet = (key, w, h, draw, o = {}) => {
    const have = SHEETS[key];
    if (have && have.round === S.round) return have;
    const res = o.res || S.res, nv = o.versions || 3, pw = w * res, ph = h * res, seed = o.seed != null ? o.seed : hashStr(key);
    const sh = { key, w, h, res, ox: o.ox || 0, oy: o.oy || 0, flat: !!o.flat, round: S.round, v: [] };
    for (let v = 0; v < nv; v++) {
      const L = {}; for (const n of ['base', 'pencil', 'wash', 'hatch', 'ink', 'white']) { L[n] = mk(pw, ph).getContext('2d'); L[n].setTransform(res, 0, 0, res, 0, 0); L[n].lineCap = L[n].lineJoin = 'round'; }
      const d = makeDrawer(L, seed, v, false); d.dark = o.paper === 'dark'; d.paperKind = o.paper || 'sand'; d.w = w; d.h = h;
      draw(d, v);
      const gk = o.paper === 'dark' ? 'chalk' : 'ink';
      applyGrain(L.wash, 'wash', pw, ph); applyGrain(L.ink, gk, pw, ph); applyGrain(L.hatch, gk, pw, ph);
      if (sh.flat) {
        const out = mk(pw, ph), g = out.getContext('2d');
        for (const n of ['base', 'pencil', 'wash', 'hatch', 'ink', 'white']) g.drawImage(L[n].canvas, 0, 0);
        sh.v.push({ all: out });
      } else {
        const line = L.hatch.canvas, lg = L.hatch; lg.setTransform(1, 0, 0, 1, 0, 0); lg.drawImage(L.ink.canvas, 0, 0); lg.drawImage(L.white.canvas, 0, 0);
        sh.v.push({ base: L.base.canvas, pencil: L.pencil.canvas, wash: L.wash.canvas, line });
      }
    }
    SHEETS[key] = sh;
    return sh;
  };
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 1000003; };
  S.has = key => !!SHEETS[key];
  S.forget = prefix => { for (const k in SHEETS) if (k.startsWith(prefix)) delete SHEETS[k]; };
  S.blit = (g, key, x, y, o = {}) => {
    const sh = SHEETS[key]; if (!sh) return;
    const vi = o.v != null ? o.v : (S.reduce ? 0 : Math.floor((o.t != null ? o.t : S.t) * 8 + (o.phase || 0)) % sh.v.length);
    const V = sh.v[vi % sh.v.length], undo = o.undo || 0, al = o.alpha == null ? 1 : o.alpha;
    if (undo >= 3 || al <= 0) return;
    g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.sx || o.sy) g.scale(o.sx || 1, o.sy || 1);
    const dx = -sh.ox, dy = -sh.oy, dw = sh.w, dh = sh.h;
    const draw = (cv, a) => { if (a > 0.003) { g.globalAlpha = al * Math.min(1, a); g.drawImage(cv, dx, dy, dw, dh); } };
    if (sh.flat) draw(V.all, 1);
    else {
      // undo 0..1: colour fades; 1..2: ink fades (pencil shows through); 2..3: pencil rubs out
      draw(V.base, undo < 1 ? 1 : 1.6 - undo);
      draw(V.pencil, undo < 2 ? 1 : 3 - undo);
      draw(V.wash, 1 - undo);
      draw(V.line, undo < 1 ? 1 : 2 - undo);
    }
    g.restore();
  };
  S.live = (g, seed, v) => { const L = { pencil: g, wash: g, hatch: g, ink: g, white: g }; return makeDrawer(L, seed, v == null ? S.boil() : v, true); };

  /* ---------- paper ---------- */
  const PAPERS = {
    sand: { base: [247, 236, 210], mott: 10, fib: [120, 90, 50], edge: [120, 84, 40] },
    dusk: { base: [228, 224, 212], mott: 12, fib: [90, 90, 90], edge: [70, 66, 66] },
    dark: { base: [44, 42, 40], mott: 10, fib: [120, 116, 108], edge: [12, 11, 10] },
    dawn: { base: [246, 236, 210], mott: 12, fib: [140, 110, 60], edge: [130, 100, 50] },
  };
  S.PAPERS = PAPERS;
  const paperCv = {};
  // plain: no darkened page edge (the paper laid under a sheet's solids, so tiled sheets join without a seam)
  function paperCanvas(kind, plain) {
    const k = kind + '@' + S.res + (plain ? ':plain' : ''); if (paperCv[k]) return paperCv[k];
    const P = PAPERS[kind] || PAPERS.sand, res = S.res, w = Math.round(W * res), h = Math.round(H * res);
    // the mottle at half size (it is soft), grain and fibres at full size
    const cv = mk(w, h), g = cv.getContext('2d'), im = g.createImageData(w, h), D = im.data, R = rng(kind.length * 7 + 1);
    const dark = kind === 'dark';
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const X = x / res, Y = y / res;
      const m = (noise2(3, X / 160, Y / 160) - 0.5) * 1.0 + (noise2(4, X / 55, Y / 55) - 0.5) * 0.5 + (noise2(5, X / 14, Y / 14) - 0.5) * 0.25;
      const gr = (noise2(6, X / 1.7, Y / 1.7) - 0.5) * 0.9 + (R() - 0.5) * 0.5;
      // the page edge: darker toward every side, with a ragged falloff
      const ex = Math.min(X, W - X), ey = Math.min(Y, H - Y), e = Math.min(ex / 70, ey / 60) + (noise2(7, X / 40, Y / 40) - 0.5) * 0.35;
      const edge = !plain && e < 1 ? Math.pow(1 - Math.max(0, e), 2.2) : 0;
      const i = (y * w + x) * 4, v = m * P.mott + gr * (dark ? 7 : 9);
      for (let c = 0; c < 3; c++) D[i + c] = Math.max(0, Math.min(255, P.base[c] + v * (dark ? 0.8 : 1) - edge * (P.base[c] - P.edge[c]) * 0.42));
      D[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    // fibres: short faint hairs
    g.setTransform(res, 0, 0, res, 0, 0); g.lineCap = 'round';
    for (let i = 0; i < 520; i++) {
      const x = R() * W, y = R() * H, a = R() * TAU, l = 3 + R() * 10, bend = (R() - 0.5) * 3;
      g.strokeStyle = `rgba(${P.fib.join(',')},${(dark ? 0.12 : 0.07) + R() * 0.06})`; g.lineWidth = 0.4 + R() * 0.4;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l / 2 + bend, y + Math.sin(a) * l / 2 - bend, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    // light fibres too
    for (let i = 0; i < 200; i++) {
      const x = R() * W, y = R() * H, a = R() * TAU, l = 2 + R() * 7;
      g.strokeStyle = dark ? `rgba(200,195,185,${0.05 + R() * 0.05})` : `rgba(255,252,240,${0.25 + R() * 0.2})`; g.lineWidth = 0.5;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    return (paperCv[k] = cv);
  }
  S.paper = (g, kind, x = 0, y = 0, w = W, h = H) => { const cv = paperCanvas(kind); g.drawImage(cv, (x / W) * cv.width, (y / H) * cv.height, (w / W) * cv.width, (h / H) * cv.height, x, y, w, h); };
  S.paperCanvas = paperCanvas;
  // the page's darker edge alone, drawn last over everything (so drawings that cover the paper still sit on a page)
  const edgeCv = {};
  /* light: the painter's last glazes over a finished page. S.glow adds warm light (screen) in a soft pool;
     S.gloom darkens everything outside a lit circle (multiply), so a page has one clear light source. */
  S.glow = (g, x, y, r, rgb, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(0.45, `rgba(${rgb},${a * 0.45})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
  };
  S.gloom = (g, x, y, r0, r1, rgb, a) => {
    const gr = g.createRadialGradient(x, y, r0, x, y, r1);
    gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(1, `rgba(${rgb},${a})`);
    g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = gr; g.fillRect(0, 0, 960, 540); g.restore();
  };
  // a little flock of inked birds, wings flapping (o.dir -1 flies left)
  S.birds = (d, x, y, n, t, o = {}) => {
    const R = S.rng(o.seed || 5);
    for (let i = 0; i < n; i++) {
      const bx = x + (R() - 0.5) * (o.spread || 120) + (o.dir || -1) * t * 40 % 400, by = y + (R() - 0.5) * (o.spreadY || 50), s = (o.s || 5) * (0.7 + R() * 0.6);
      const f = Math.sin(t * 11 + i * 1.7) * s * 0.6;
      d.stroke([[bx - s, by - f], [bx - s * 0.4, by - s * 0.2], [bx, by + s * 0.25], [bx + s * 0.4, by - s * 0.2], [bx + s, by - f]], { w: o.w || 1.3, curve: true, sh: 0, p: [0.2, 1, 0.2], alpha: o.alpha || 0.85, col: o.col });
    }
  };
  S.edge = (g, kind) => {
    const k = kind + '@' + S.res;
    if (!edgeCv[k]) {
      const P = PAPERS[kind] || PAPERS.sand, res = S.res, w = Math.round(W * res / 2), h = Math.round(H * res / 2);
      const cv = mk(w, h), gg = cv.getContext('2d'), im = gg.createImageData(w, h), D = im.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const X = x * 2 / res, Y = y * 2 / res, ex = Math.min(X, W - X), ey = Math.min(Y, H - Y);
        const e = Math.min(ex / 46, ey / 40) + (noise2(9, X / 30, Y / 30) - 0.5) * 0.4, a = e < 1 ? Math.pow(1 - Math.max(0, e), 2.4) : 0;
        const i = (y * w + x) * 4; D[i] = P.edge[0]; D[i + 1] = P.edge[1]; D[i + 2] = P.edge[2]; D[i + 3] = a * 120;
      }
      gg.putImageData(im, 0, 0); edgeCv[k] = cv;
    }
    g.drawImage(edgeCv[k], 0, 0, W, H);
  };

  /* ---------- the heroes, drawn in the style ---------- */
  // Pip and Bo keep their shapes, sizes, faces and hitboxes: an ink outline heavier underneath, a loose wash of their
  // own colour, hatching under the chin and on the shadow side, boil. Called with the body box from p.
  S.hero = (g, p, o = {}) => {
    if (!p.alive && !o.force) return;
    const id = p.id, col = PCOL[id], dark = PDARK[id];
    const w = (o.w || p.w) * (o.sx != null ? o.sx : p.sx), h = (o.h || p.h) * (o.sy != null ? o.sy : p.sy);
    const cx = o.x != null ? o.x : p.x + p.w / 2, by = o.y != null ? o.y : p.y + p.h, face = o.face != null ? o.face : p.face;
    const v = S.boil(), d = S.live(g, 4100 + id * 37 + v * 3, v), t = S.t;
    const look0 = typeof outfitNow === 'function' ? (() => { const of = outfitNow(); return of && of.looks[id]; })() : null;
    const oo = { face, t, vx: p.vx || 0 };
    g.save(); g.translate(cx, by); g.lineCap = g.lineJoin = 'round';
    if (o.s) g.scale(o.s, o.s);
    // a hatched ground shadow (no soft shadow)
    if (!o.noShadow) d.hatch(S.ell(0, 0.5, w * 0.62, 2.6, 12), { a: 8, gap: 1.7, w: 0.6, alpha: o.dark ? 0.5 : 0.55, force: true, jit: 0.2 });
    if (look0) outfitLayer(g, look0, 'back', id, 0, 0, w, h, oo);
    const body = sketchBodyPts(w, h);
    const paperRim = () => { if (o.dark) { g.fillStyle = S.PAL.cream; g.globalAlpha = 0.9; g.beginPath(); const q = sketchBodyPts(w + 4.5, h + 4); q.forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1] + 2) : g.moveTo(pt[0], pt[1] + 2))); g.closePath(); g.fill(); g.globalAlpha = 1; } };
    paperRim();
    // ears behind (Bo)
    const ear = ex => {
      const e = S.ell(ex, -h + 1, 5, 5, 12);
      if (o.dark) { g.fillStyle = S.PAL.cream; g.beginPath(); S.ell(ex, -h + 1, 7, 7, 12).forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]))); g.fill(); }
      g.fillStyle = col; g.beginPath(); e.forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]))); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); S.ell(ex - 1, -h, 2.4, 2.2, 8).forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]))); g.fill();
      d.stroke(S.ell(ex, -h + 1, 5, 5, 12, 0, -0.4, Math.PI * 2 - 0.9), { w: 1.7, c: [ex, -h + 1], p: [0.3, 1, 0.5], jit: 0.35, col: S.INK, curve: true });
    };
    if (id === 1 && !(look0 && look0.earsOver)) { ear(-w / 2 + 4); ear(w / 2 - 4); }
    // the body: a solid base of their colour (so they are the brightest thing), then a looser wash edge
    g.fillStyle = col; g.beginPath(); body.forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]))); g.closePath(); g.fill();
    // light: paper left on the top-left, a darker wash on the shadow side
    g.save(); g.beginPath(); body.forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]))); g.closePath(); g.clip();
    g.fillStyle = 'rgba(255,250,235,0.42)'; g.beginPath(); S.ell(-w * 0.22, -h * 0.72, w * 0.26, h * 0.2, 12, -0.5).forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]))); g.fill();
    g.fillStyle = dark; g.globalAlpha = 0.35; g.beginPath(); S.ell(w * 0.42, -h * 0.25, w * 0.32, h * 0.6, 14, 0.15).forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]))); g.fill(); g.globalAlpha = 1;
    d.hatch(sketchBodyPts(w, h).map(pt => [pt[0], pt[1]]), { a: 60, gap: 2.1, w: 0.55, alpha: 0.55, force: true, jit: 0.25, col: dark, tone: (x, y) => (x / w + 0.5) * 0.9 + (y / h + 1) * 0.5 - 0.35 });
    g.restore();
    if (look0) outfitLayer(g, look0, 'body', id, 0, 0, w, h, oo);
    // the ink outline: heavier underneath and on the right (the shadow side)
    d.outline(body, { w: 2.1, c: [0, -h / 2], corner: 50, smooth: true, jit: 0.35, col: S.INK, sh: 1.0, ov: 1.4 });
    // face (as drawPlayer: eyes, cheeks)
    const look = face * 2.5, ey = -h * 0.6 + clamp((p.vy || 0) / 300, -1.5, 1.5);
    const mood = o.mood;
    if ((p.stun || 0) > 0 || mood === 'dizzy') {
      for (const ex of [-5, 5]) { d.line(ex - 2.6 + look, ey - 2.6, ex + 2.6 + look, ey + 2.6, { w: 1.6, ov: 0.3, col: S.INK }); d.line(ex + 2.6 + look, ey - 2.6, ex - 2.6 + look, ey + 2.6, { w: 1.6, ov: 0.3, col: S.INK }); }
    } else if ((p.blink || 0) > 0 || mood === 'blink') {
      for (const ex of [-5, 5]) d.stroke([[ex - 3 + look, ey], [ex + look, ey + 0.8], [ex + 3 + look, ey]], { w: 1.6, curve: true, col: S.INK });
    } else if (mood === 'joy') {
      for (const ex of [-5, 5]) d.stroke([[ex - 3 + look, ey + 1], [ex + look, ey - 2.2], [ex + 3 + look, ey + 1]], { w: 1.7, curve: true, col: S.INK });
    } else {
      for (const ex of [-5, 5]) {
        g.fillStyle = '#fffaf0'; g.beginPath(); S.ell(ex + look, ey, 3.6, 4.4, 12).forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]))); g.closePath(); g.fill();
        d.stroke(S.ell(ex + look, ey, 3.6, 4.4, 12, 0, 0.2, Math.PI * 1.6), { w: 0.9, curve: true, col: S.INK, alpha: 0.8, jit: 0.2, sh: 0.8, c: [ex + look, ey] });
        g.fillStyle = S.INK; g.beginPath(); S.ell(ex + look + face * 1.2, ey + 0.8, 2.1, 2.2, 9).forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]))); g.fill();
        g.fillStyle = '#fffaf0'; g.beginPath(); S.ell(ex + look + face * 1.2 - 0.7, ey - 0.2, 0.7, 0.7, 6).forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]))); g.fill();
      }
    }
    // cheeks: a little pink wash
    g.fillStyle = 'rgba(255,120,140,0.45)';
    for (const sx of [-8, 8]) { g.beginPath(); S.ell(sx + look * 0.5, ey + 6, 2.5, 2, 8).forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]))); g.fill(); }
    if (look0) outfitLayer(g, look0, 'head', id, 0, 0, w, h, oo);
    if (id === 0) {
      const lift = (look0 ? look0.lift : 0) * h / PH;
      d.stroke([[0, -h - lift + (lift ? 1 : 0)], [0.8, -h - lift - 3.5], [1.4, -h - lift - 6.5]], { w: 1.9, curve: true, col: '#2f6a3e', p: [0.8, 1, 0.6], sh: 0 });
      const leaf = S.ell(5, -h - lift - 8, 6, 3, 12, -0.5);
      if (o.dark) { g.fillStyle = S.PAL.cream; g.beginPath(); S.ell(5, -h - lift - 8, 7.8, 4.8, 12, -0.5).forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]))); g.fill(); }
      g.fillStyle = '#5cc27f'; g.beginPath(); leaf.forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]))); g.fill();
      d.stroke(S.ell(5, -h - lift - 8, 6, 3, 12, -0.5, 0.3, Math.PI * 1.9), { w: 1.1, curve: true, col: S.INK, c: [5, -h - lift - 8] });
      d.stroke([[0.5, -h - lift - 7.4], [5, -h - lift - 8.3], [9.5, -h - lift - 10.5]], { w: 0.6, curve: true, col: '#2f6a3e', sh: 0 });
    } else if (look0 && look0.earsOver) { g.save(); g.translate(0, -(look0.lift || 0) * h / PH); ear(-w / 2 + 4); ear(w / 2 - 4); g.restore(); }
    if (look0) outfitLayer(g, look0, 'front', id, 0, 0, w, h, oo);
    if ((p.stun || 0) > 0) {
      const sy = -h - 8;
      for (let i = 0; i < 3; i++) { const a = t * 8 + i * 2.1; d.word('*', Math.cos(a) * 12, sy + Math.sin(a) * 3, 6, { col: '#c99a1e' }); }
    }
    g.restore();
  };
  // Pip and Bo's body as a hand-drawn rounded block (feet at y 0): slightly soft sides, a fuller bottom
  function sketchBodyPts(w, h) {
    const r = 8, pts = [], x0 = -w / 2, x1 = w / 2, y0 = -h, y1 = 0;
    const corner = (cx, cy, a0) => { for (let i = 0; i <= 4; i++) { const a = a0 + (i / 4) * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    corner(x1 - r, y0 + r, -Math.PI / 2); pts.push([x1 + 0.4, -h / 2]); corner(x1 - r, y1 - r, 0); pts.push([0, y1 + 0.5]); corner(x0 + r, y1 - r, Math.PI / 2); pts.push([x0 - 0.3, -h / 2]); corner(x0 + r, y0 + r, Math.PI);
    return pts;
  }
  S.bodyPts = sketchBodyPts;
  return S;
})();
