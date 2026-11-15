/* Pip & Bo - World 32 Superhero City: the comic-book look (ink, printed dots, captions, balloons, sound words). */
'use strict';

/* The only global here is COMIC. It loads before hero-kit.js, which copies these helpers into HEROCITY (K.ink, K.box...)
   and draws the city with them. Gavyn asked (Nov 2026) for World 32 to look "straight out of a comic book": black ink
   outlines, flat bold four-colour-press colours, colour fades printed as dots (halftone), yellow caption boxes, white
   speech balloons, hand-lettered sound words, and a paper panel with a printed finish. World 32 only: nothing here
   changes a shared engine function, and nothing keeps game state (pure drawing; caches are pictures only).
   Ink and shapes (current ctx, any transform)
     COMIC.INK, COMIC.PAPER, COMIC.P (the palette), COMIC.DISPLAY / COMIC.BODY (font stacks: Bangers, Comic Neue 700)
     COMIC.disp(n), COMIC.body(n, italic)   ctx.font strings
     COMIC.ink(pathFn, fill, lw)     builds the path (pathFn), strokes it in ink at 2*lw, then fills it: the line sits
                                     outside the shape. lw 0 = no outline.
     COMIC.inkRect(x, y, w, h, fill, lw)   the same for a rectangle
     COMIC.edge(pathFn, col, w)      a light thick line (cable, rail, pipe) with a black edge: ink at w + 4, then col
     COMIC.hard(pathFn, dx, dy)      a hard black drop shadow of a shape (no blur)
   Printed dots (pre-rendered tiles, cached; cheap to call every frame)
     COMIC.dotFade(x0, x1, y0, y1, col, cell, maxR, off)   dots that grow from nothing at y0 to nearly touching at y1
                                     (y1 may be above y0), across x0..x1; off shifts the dots sideways (parallax)
     COMIC.dotFadeX(y0, y1, x0, x1, col, cell, maxR, off)  the same sideways: dots grow from x0 to x1
     COMIC.dotScreen(x0, y0, x1, y1, col, cell, r, ox, oy) an even screen of dots
   Lettering and boxes
     COMIC.box(x, y, w, h, fill, o)  a caption box: hard shadow (o.sh, default 3), fill, ink outline (o.lw 2.5), corner o.r
     COMIC.word(str, x, y, size, col, o)   Bangers in capitals with an ink outline. o: align, lw (outline), shadow (hard
                                     shadow offset), rot, white (a thin white inner line), base ('middle')
     COMIC.balloon(x, y, w, h, tailX, o)  a white speech balloon with a tail from its bottom to tailX (o.up: tail on top,
                                     o.edge: a thin inner line in that colour, o.fill, o.sh)
     COMIC.burst(x, y, str, s, rot, col)   a jagged yellow star with an orange dot fade, ink outline, hard shadow, red word
     COMIC.sfx(x, y, str, size, rot, c1, c2, sc)  a big hand-lettered sound word: each letter a little bigger than the
                                     last, c1 over c2 split, thick ink, hard shadow; sc scales it (pop-in)
     COMIC.focus(x, y, r0, n, a, seed)     focus lines: thin black wedges from the panel edge pointing at x, y
     COMIC.spikes(x, y, r, col, t, n)      a comic power aura: a ring of jagged energy spikes with ink and dots
   The page
     COMIC.finish(o)                 over the finished scene (no transform): a fine dot screen, warm paper multiply and,
                                     unless o.light, a faint off-register second impression; then the white gutter and a
                                     hand-wobbled ink panel border. Call it before drawing the HUD. */
const COMIC = (() => {
  const TAU = Math.PI * 2, INK = '#14121c', PAPER = '#fff8e6';
  const DISPLAY = '"Bangers", "Lilita One", "Arial Rounded MT Bold", sans-serif';
  const BODY = '"Comic Neue", "Atkinson Hyperlegible", system-ui, sans-serif';
  const P = {
    ink: INK, paper: PAPER, yellow: '#ffe14a', paleYellow: '#fff3a8', red: '#e8222e', pink: '#ff4f9a', pinkHi: '#ff7ac0',
    orange: '#ff8a2a', amber: '#ffb02e', teal: '#19a89a', tealHi: '#5fe0cc', cyan: '#7af0ff', blue: '#2e7bff', blueDk: '#2647b8',
    navy: '#0f1650', magenta: '#a01f6a', violet: '#6a4fe0', green: '#2fc45a', white: '#ffffff', cream: '#fff3d6',
  };
  const K = { INK, PAPER, DISPLAY, BODY, P, TAU };
  K.disp = n => Math.round(n * 10) / 10 + 'px ' + DISPLAY;
  K.body = (n, it) => (it ? 'italic ' : '') + '700 ' + Math.round(n * 10) / 10 + 'px ' + BODY;

  /* ---------- ink ---------- */
  K.ink = (pathFn, fill, lw = 2.5) => {
    pathFn();
    if (lw > 0) { ctx.strokeStyle = INK; ctx.lineWidth = lw * 2; ctx.lineJoin = 'round'; ctx.stroke(); ctx.lineJoin = 'miter'; }
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  };
  K.inkRect = (x, y, w, h, fill, lw = 2.5) => {
    if (lw > 0) { ctx.fillStyle = INK; ctx.fillRect(x - lw, y - lw, w + lw * 2, h + lw * 2); }
    if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
  };
  K.edge = (pathFn, col, w) => {
    pathFn(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = w + 4; ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  };
  K.hard = (pathFn, dx = 4, dy = 4) => { ctx.save(); ctx.translate(dx, dy); pathFn(); ctx.fillStyle = INK; ctx.fill(); ctx.restore(); };

  /* ---------- printed dots: tiles drawn once, then used as canvas patterns ---------- */
  const tiles = new Map();
  const res = () => (typeof canvas !== 'undefined' && canvas.width > W * 1.5 ? (canvas.width > W * 2.5 ? 3 : 2) : 1);
  function cached(key, make) {
    let p = tiles.get(key);
    if (!p) { if (tiles.size > 360) tiles.clear(); p = make(); tiles.set(key, p); }
    return p;
  }
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  // a band tile: rows every cell/2, staggered, dot radius growing with the row; one cell wide (it repeats along the band)
  function bandTile(col, cell, maxR, len, R) {
    const rows = Math.max(1, Math.ceil(len / (cell * 0.5))), c = mk(cell * R, (len + cell) * R), g = c.getContext('2d');
    g.fillStyle = col; g.scale(R, R); g.beginPath();
    for (let r = 0; r <= rows; r++) {
      const u = r / rows, rad = cell * maxR * u, y = r * cell * 0.5;
      if (rad < 0.35 || y > len + cell * 0.5) continue;
      const sh = (r % 2) * cell * 0.5;
      for (const x of [sh - cell, sh, sh + cell]) { g.moveTo(x + rad, y); g.arc(x, y, rad, 0, TAU); }
    }
    g.fill();
    return c;
  }
  // The fast way (review, Nov 2026): a band drawn once at the screen's own pixel size and copied on with drawImage, pixel
  // for pixel. A pattern fill has to be worked out again for every pixel, which cost more than everything else in the
  // frame put together where the canvas is drawn by the CPU. It needs the plain game transform (K.finish notes its scale
  // every frame); under a rotation or another scale (a burst popping in, the moon's tilted shadow) the pattern below is used.
  let baseA = 0, baseD = 0, stripPx = 0;
  const strips = new Map();
  function strip(axisX, dir, col, cell, maxR, len, pad, wide, sx, sy) {
    const key = (axisX ? 'x' : 'y') + dir + col + '|' + cell + '|' + maxR + '|' + len + '|' + wide + '|' + sx + '|' + sy;
    let c = strips.get(key);
    if (c) return c;
    const cw = Math.ceil((axisX ? len + pad : wide + cell * 2) * sx), ch = Math.ceil((axisX ? wide + cell * 2 : len + pad) * sy);
    if (stripPx + cw * ch > 6e6) { strips.clear(); stripPx = 0; }
    stripPx += cw * ch;
    c = mk(cw, ch);
    const g = c.getContext('2d'), rows = Math.max(1, Math.ceil(len / (cell * 0.5)));
    g.fillStyle = col; g.scale(sx, sy); g.beginPath();
    for (let r = 0; r <= rows; r++) {
      const rad = cell * maxR * (r / rows), y = r * cell * 0.5;
      if (rad < 0.35 || y > len + cell * 0.5) continue;
      const v = dir > 0 ? y : len + pad - y;
      for (let u = (r % 2) * cell * 0.5 - cell; u < wide + cell * 3; u += cell) {
        if (axisX) { g.moveTo(v + rad, u); g.arc(v, u, rad, 0, TAU); } else { g.moveTo(u + rad, v); g.arc(u, v, rad, 0, TAU); }
      }
    }
    g.fill();
    strips.set(key, c);
    return c;
  }
  function fadeFast(m, axisX, a0, a1, b0, b1, col, cell, maxR, off) {
    // sA, tA: scale and shift along the band; sB, tB: across it
    const sA = axisX ? m.a : m.d, tA = axisX ? m.e : m.f, sB = axisX ? m.d : m.a, tB = axisX ? m.f : m.e;
    const len = Math.round(Math.abs(a1 - a0)), dir = a1 < a0 ? -1 : 1, pad = Math.ceil(cell * maxR + 1);
    const o = ((off || 0) % cell + cell) % cell, bmin = Math.min(b0, b1), bw = Math.abs(b1 - b0);
    const wide = bw <= 32 ? 32 : bw <= 64 ? 64 : bw <= 128 ? 128 : 256;
    const c = strip(axisX, dir, col, cell, maxR, len, pad, wide, m.a, m.d);
    const alongPx = axisX ? c.width : c.height, a = Math.round((dir > 0 ? a0 : a0 - len - pad) * sA + tA);
    const end = Math.round((bmin + bw) * sB + tB);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let B = bmin, guard = 0; guard < 40; guard++) {
      // each piece starts where the dots line up with the last one
      const ph = (((B - (b0 - o)) % cell) + cell) % cell, src = Math.round(ph * sB), dst = Math.round(B * sB + tB);
      const n = Math.min(end, Math.round((B + wide) * sB + tB)) - dst;
      if (n <= 0) break;
      if (axisX) ctx.drawImage(c, 0, src, alongPx, n, a, dst, alongPx, n);
      else ctx.drawImage(c, src, 0, n, alongPx, dst, a, n, alongPx);
      B += wide;
    }
    ctx.setTransform(m);
  }
  function fade(axisX, a0, a1, b0, b1, col, cell, maxR, off) {
    if (Math.abs(a1 - a0) < 1 || Math.abs(b1 - b0) <= 0) return;
    if (baseA) {
      const m = ctx.getTransform();
      if (m.b === 0 && m.c === 0 && Math.abs(m.a - baseA) < 1e-6 && Math.abs(m.d - baseD) < 1e-6) return fadeFast(m, axisX, a0, a1, b0, b1, col, cell, maxR, off);
    }
    fadeSlow(axisX, a0, a1, b0, b1, col, cell, maxR, off);
  }
  function fadeSlow(axisX, a0, a1, b0, b1, col, cell, maxR, off) {
    const len = Math.abs(a1 - a0);
    if (len < 1) return;
    const R = res(), Lq = Math.round(len), key = 'f' + col + '|' + cell + '|' + maxR + '|' + Lq + '|' + R;
    const pat = cached(key, () => ({ c: bandTile(col, cell, maxR, Lq, R), p: null }));
    if (!pat.p) pat.p = ctx.createPattern(pat.c, axisX ? 'repeat-y' : 'repeat-x');
    const dir = Math.sign(a1 - a0) || 1, s = 1 / R, o = ((off || 0) % cell + cell) % cell;
    // tile space: u along the band's length (0 at a0), v across it; the pattern repeats across
    let m;
    if (!axisX) m = new DOMMatrix([s, 0, 0, s * dir, b0 - o, a0]);
    else m = new DOMMatrix([0, s, s * dir, 0, a0, b0 - o]);
    pat.p.setTransform(m);
    ctx.fillStyle = pat.p;
    const pad = cell * maxR + 1, lo = Math.min(a0, a1) - (dir < 0 ? pad : 0), hi = Math.max(a0, a1) + (dir > 0 ? pad : 0);
    if (!axisX) ctx.fillRect(Math.min(b0, b1), lo, Math.abs(b1 - b0), hi - lo);
    else ctx.fillRect(lo, Math.min(b0, b1), hi - lo, Math.abs(b1 - b0));
  }
  K.dotFade = (x0, x1, y0, y1, col, cell = 10, maxR = 0.72, off = 0) => fade(false, y0, y1, x0, x1, col, cell, maxR, off);
  K.dotFadeX = (y0, y1, x0, x1, col, cell = 8, maxR = 0.66, off = 0) => fade(true, x0, x1, y0, y1, col, cell, maxR, off);
  K.dotScreen = (x0, y0, x1, y1, col, cell = 7, r = 1.7, ox = 0, oy = 0) => {
    const R = res(), key = 's' + col + '|' + cell + '|' + r + '|' + R;
    const pat = cached(key, () => {
      const c = mk(cell * R, cell * R), g = c.getContext('2d');
      g.scale(R, R); g.fillStyle = col; g.beginPath();
      for (const [x, y] of [[0, 0], [cell, 0], [0, cell], [cell, cell], [cell / 2, cell / 2]]) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
      g.fill();
      return { c, p: null };
    });
    if (!pat.p) pat.p = ctx.createPattern(pat.c, 'repeat');
    pat.p.setTransform(new DOMMatrix([1 / R, 0, 0, 1 / R, ox, oy]));
    ctx.fillStyle = pat.p; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  };

  /* ---------- boxes, lettering, balloons ---------- */
  K.box = (x, y, w, h, fill, o = {}) => {
    const r = o.r === undefined ? 2 : o.r, sh = o.sh === undefined ? 3 : o.sh, lw = o.lw === undefined ? 2.5 : o.lw;
    if (sh) { ctx.fillStyle = INK; rr(x + sh, y + sh, w, h, r); ctx.fill(); }
    ctx.fillStyle = fill; rr(x, y, w, h, r); ctx.fill();
    if (lw) { ctx.strokeStyle = INK; ctx.lineWidth = lw; rr(x, y, w, h, r); ctx.stroke(); }
  };
  K.word = (str, x, y, size, col, o = {}) => {
    const s = String(str).toUpperCase();
    ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
    ctx.font = K.disp(size); ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle'; ctx.lineJoin = 'round';
    const lw = o.lw === undefined ? size * 0.2 : o.lw;
    if (o.shadow) { ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.strokeText(s, o.shadow, o.shadow * 1.2); ctx.fillText(s, o.shadow, o.shadow * 1.2); }
    if (lw > 0) { ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.strokeText(s, 0, 0); }
    ctx.fillStyle = col; ctx.fillText(s, 0, 0);
    if (o.white) { ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1; ctx.strokeText(s, 0, 0); }
    ctx.restore();
  };
  K.balloon = (x, y, w, h, tailX, o = {}) => {
    const r = Math.min(h / 2, o.r || h / 2), up = !!o.up, tx = clamp(tailX, x + r * 0.7 + 6, x + w - r * 0.7 - 6);
    const shape = () => {
      ctx.beginPath(); ctx.moveTo(x + r, y);
      if (up) { ctx.lineTo(tx - 7, y); ctx.lineTo(tx + 2, y - 11); ctx.lineTo(tx + 8, y); }
      ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      if (!up) { ctx.lineTo(tx + 8, y + h); ctx.lineTo(tx + 2, y + h + 11); ctx.lineTo(tx - 7, y + h); }
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
    };
    const sh = o.sh === undefined ? 3 : o.sh;
    if (sh) { ctx.save(); ctx.translate(sh, sh); shape(); ctx.fillStyle = INK; ctx.fill(); ctx.restore(); }
    shape(); ctx.strokeStyle = INK; ctx.lineWidth = o.lw || 5; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fillStyle = o.fill || '#ffffff'; ctx.fill(); ctx.lineJoin = 'miter';
    if (o.edge) { ctx.strokeStyle = o.edge; ctx.lineWidth = 2; rr(x + 3.5, y + 3.5, w - 7, h - 7, Math.max(2, r - 3.5)); ctx.stroke(); }
  };
  K.burst = (x, y, str, s = 1, rot = 0, col = '#ffe14a') => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot - 0.1); ctx.scale(s * 1.7, s * 1.7);
    let seed = 0; for (let i = 0; i < str.length; i++) seed += str.charCodeAt(i);
    const shape = () => { ctx.beginPath(); for (let i = 0; i < 22; i++) { const a = i / 22 * TAU, r = i % 2 ? 25 : 42 + ((Math.sin(i * 12.9898 + seed) * 43758.5453) % 1 + 1) % 1 * 14; ctx.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r); } ctx.closePath(); };
    K.hard(shape, 4, 5);
    shape(); ctx.fillStyle = col; ctx.fill();
    ctx.save(); shape(); ctx.clip(); K.dotFade(-80, 80, -8, 52, '#ff8a1e', 7, 0.7); ctx.restore();
    shape(); ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.stroke(); ctx.lineJoin = 'miter';
    K.word(str, 0, 1, 30, '#ff2e3e', { lw: 6, shadow: 2.5 });
    ctx.restore();
  };
  // sound words: letter sizes and split colours; one gradient per word, made once
  const grads = new Map();
  K.sfx = (x, y, str, size, rot = 0, c1 = '#ffe14a', c2 = '#ff2e3e', sc = 1) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    let xx = 0; const L = [];
    for (let i = 0; i < str.length; i++) { const fs = size * (1 + 0.5 * i / str.length); ctx.font = K.disp(fs); L.push([str[i], xx, fs]); xx += ctx.measureText(str[i]).width + fs * 0.04; }
    for (const pass of [0, 1, 2]) for (const [ch, lx, fs] of L) {
      ctx.font = K.disp(fs);
      const ly = -fs * 0.18 + Math.sin(lx * 0.05) * 3, px = lx - xx / 2;
      if (pass === 0) { ctx.strokeStyle = INK; ctx.lineWidth = fs * 0.3; ctx.strokeText(ch, px + fs * 0.1, ly + fs * 0.12); }
      else if (pass === 1) { ctx.strokeStyle = INK; ctx.lineWidth = fs * 0.22; ctx.strokeText(ch, px, ly); }
      else {
        const gk = c1 + c2 + Math.round(fs);
        let g = grads.get(gk);
        if (!g) { g = ctx.createLinearGradient(0, -fs * 0.4, 0, fs * 0.4); g.addColorStop(0, c1); g.addColorStop(0.55, c1); g.addColorStop(0.56, c2); g.addColorStop(1, c2); if (grads.size > 200) grads.clear(); grads.set(gk, g); }
        ctx.save(); ctx.translate(0, ly); ctx.fillStyle = g; ctx.fillText(ch, px, 0); ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.1; ctx.strokeText(ch, px, ly);
      }
    }
    ctx.restore();
  };
  const hsh = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
  K.focus = (x, y, r0, n, a = 0.9, seed = 1) => {
    ctx.save(); ctx.fillStyle = INK; ctx.globalAlpha *= a; ctx.beginPath();
    for (let k = 0; k < n; k++) {
      // (thin: at most about 10 px wide where they cross the middle of the screen, so they never hide play)
      const an = (k + hsh(k + seed) * 0.7) / n * TAU, wd = 0.0025 + hsh(k * 3 + seed) * 0.0065, r = r0 * (0.85 + hsh(k * 7 + seed) * 0.5);
      ctx.moveTo(x + Math.cos(an) * r, y + Math.sin(an) * r);
      ctx.lineTo(x + Math.cos(an - wd) * 1400, y + Math.sin(an - wd) * 1400); ctx.lineTo(x + Math.cos(an + wd) * 1400, y + Math.sin(an + wd) * 1400);
    }
    ctx.fill(); ctx.restore();
  };
  K.spikes = (x, y, r, col, t = 0, n = 14) => {
    const shape = () => {
      ctx.beginPath();
      for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU + t * 0.8, rr2 = i % 2 ? r * 0.72 : r * (1 + 0.16 * Math.sin(t * 9 + i * 1.7)); ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
      ctx.closePath();
    };
    ctx.save(); ctx.globalAlpha *= 0.85;
    shape(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fillStyle = col; ctx.fill();
    ctx.restore();
    // "Kirby dots": a few black and coloured dots crackling round the edge
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + t * 2.3, d = r * (1.12 + 0.1 * Math.sin(t * 7 + i));
      ctx.fillStyle = i % 2 ? INK : col; circle(x + Math.cos(a) * d, y + Math.sin(a) * d, i % 2 ? 2 : 2.8); ctx.fill();
    }
  };

  /* ---------- the printed page ---------- */
  // the fine dot screen is one picture the size of the canvas, copied on pixel for pixel (a pattern fill of the whole
  // screen cost about as much as the rest of the frame where the canvas is drawn by the CPU)
  let grain = null;
  function grainFor(s) {
    if (grain && grain.width === canvas.width && grain.height === canvas.height && grain._s === s) return grain;
    const c = grain || mk(1, 1); c.width = canvas.width; c.height = canvas.height; c._s = s;
    const t = mk(Math.round(6 * s) * 8, Math.round(6 * s) * 8), g = t.getContext('2d'), q = Math.round(6 * s);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath();
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) for (const d of [0.25, 0.75]) { const px = (x + d) * q, py = (y + d) * q; g.moveTo(px + 0.85 * s, py); g.arc(px, py, 0.85 * s, 0, TAU); }
    g.fill();
    const cg = c.getContext('2d'); cg.clearRect(0, 0, c.width, c.height); cg.fillStyle = cg.createPattern(t, 'repeat'); cg.fillRect(0, 0, c.width, c.height);
    return (grain = c);
  }
  K.finish = (o = {}) => {
    const m = ctx.getTransform();
    if (m.b === 0 && m.c === 0 && m.a > 0 && m.d > 0) { baseA = m.a; baseD = m.d; } else baseA = 0;
    ctx.save();
    if (!o.light) {
      // off-register printing: the whole plate again, a hair to the side
      const s = canvas.width / W;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.24;
      ctx.drawImage(canvas, Math.round(2.5 * s), Math.round(1.5 * s));
      ctx.setTransform(m);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(grainFor(m.a || 1), 0, 0); ctx.setTransform(m);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#fff0cc'; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    K.frame();
  };
  K.frame = () => {
    ctx.save();
    ctx.strokeStyle = PAPER; ctx.lineWidth = 20; ctx.strokeRect(0, 0, W, H);
    ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(11, 12); ctx.lineTo(W / 2, 10.5); ctx.lineTo(W - 12, 10); ctx.lineTo(W - 10.5, H / 2); ctx.lineTo(W - 10, H - 12);
    ctx.lineTo(W / 2, H - 10.5); ctx.lineTo(12, H - 10); ctx.lineTo(10.5, H / 2); ctx.closePath(); ctx.stroke();
    ctx.restore();
  };
  return K;
})();
