/* Pip & Bo - World 41, 41-4 Paper Alien Invasion: the aliens, the saucer and the effects, in 3D. Loaded on demand
   with the 3D kit (K3D.files), after popaliens-outfits.js.

   The aliens are FLAT: 2D ink-and-watercolour cut-outs with a white cut edge, standing upright on a little fold-back
   tab like paper dolls, zero thickness. Turned side-on they almost vanish to a line. They are painted once into an
   atlas per kind (frames: whole, scorched once, scorched twice, winding up a zap) and drawn as ONE instanced batch per
   kind (front and back of the paper, the tabs), whatever the crowd. The frame is a per-instance attribute (aFrame);
   the shadow pass uses the same frame, so a scorched alien's shadow has the hole in it too.

   PAALIEN.make(K)  -> { update(st, aliens, dt, cam) }   builds the batches; update() places every alien each frame
   PAALIEN.paint(kind, frame)                            the cut-out picture (also used by the 2D preview's art)
   PAFX.make(K)     -> { update(st, dt, cam), ... }      bolts, crossed beams, zap rings, dive lines, stamp shadows,
                                                         grenades and pickups, bursts, crumpled balls and confetti
   PASAUCER.make(K) -> Group with .userData.update(t, k)  the pop-up saucer on its concertina stalk
   Debris (balls, confetti, scorches on the page) is drawing only: it never feeds back into the rules.
*/
'use strict';

const PAALIEN = (function () {
  const T = K3D.T, P = POPUP;
  const INK = '#2b2130';
  // sizes (units): width and height of the cut-out picture
  const SIZE = { grunt: [1.25, 1.35], lesson: [1.25, 1.35], folder: [0.95, 1.05], carrier: [1.15, 1.1], edger: [0.8, 2.05], shield: [1.25, 1.35], crab: [1.3, 0.9], stamper: [2.0, 2.7] };
  const NF = 4; // frames per atlas: 0 whole, 1 scorched, 2 scorched twice, 3 winding up a zap
  const PX = 256;
  const A = {};

  /* ---------- painting the cut-outs ---------- */
  // each painter draws the figure (ink line and soft watercolour) into a w x h box on c, centred, feet at the bottom.
  // The cut edge is made afterwards: the figure's silhouette grown by a few pixels in white, with a thin grey line.
  const wobble = (r, a) => (r() - 0.5) * a;
  function blob(c, pts, fill, ink, r, lw = 5) {
    c.beginPath();
    pts.forEach((p, i) => { const x = p[0] + wobble(r, 2), y = p[1] + wobble(r, 2); if (!i) c.moveTo(x, y); else c.lineTo(x, y); });
    c.closePath();
    c.fillStyle = fill; c.fill();
    c.strokeStyle = ink; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke();
  }
  function wash(c, x, y, rad, col, a, r) { P.wash(c, x, y, rad, col, a, r, { noEdge: true }); }
  function eye(c, x, y, rad, glow) {
    c.fillStyle = '#fffef4'; c.beginPath(); c.ellipse(x, y, rad, rad * 1.1, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = INK; c.lineWidth = Math.max(3, rad * 0.16); c.stroke();
    c.fillStyle = glow ? '#ffef5a' : INK; c.beginPath(); c.arc(x + rad * 0.12, y + rad * 0.12, rad * 0.45, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x - rad * 0.1, y - rad * 0.15, rad * 0.16, 0, Math.PI * 2); c.fill();
    if (glow) { const g = c.createRadialGradient(x, y, 0, x, y, rad * 2.2); g.addColorStop(0, 'rgba(255,250,120,0.7)'); g.addColorStop(1, 'rgba(255,250,120,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, rad * 2.2, 0, Math.PI * 2); c.fill(); }
  }
  // the little double ring on the chest of aliens that want crossed beams
  function crossMark(c, x, y, s) {
    c.strokeStyle = '#fff8e0'; c.lineWidth = s * 0.22;
    c.beginPath(); c.arc(x - s * 0.45, y, s, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(x + s * 0.45, y, s, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = INK; c.lineWidth = s * 0.09;
    c.beginPath(); c.arc(x - s * 0.45, y, s, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(x + s * 0.45, y, s, 0, Math.PI * 2); c.stroke();
  }
  const PAINT = {
    // Grunts: green, one big eye, three legs, a round body with stripes and a little antenna with a ball
    grunt(c, w, h, r, f) {
      const cx = w / 2, by = h * 0.62, R = w * 0.34;
      // three legs
      c.lineCap = 'round';
      for (const [dx, k] of [[-0.55, -0.25], [0, 0], [0.55, 0.25]]) {
        c.strokeStyle = INK; c.lineWidth = 13; c.beginPath(); c.moveTo(cx + R * dx * 0.7, by + R * 0.5); c.quadraticCurveTo(cx + R * (dx + k * 0.4), by + R * 1.0, cx + R * dx * 1.05, h * 0.965); c.stroke();
        c.strokeStyle = '#5fbf3f'; c.lineWidth = 7; c.stroke();
        c.fillStyle = '#3f8f2a'; c.beginPath(); c.ellipse(cx + R * dx * 1.05, h * 0.965, 11, 6, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
      }
      // antenna
      c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.moveTo(cx, by - R * 0.95); c.quadraticCurveTo(cx + R * 0.35, by - R * 1.35, cx + R * 0.15, by - R * 1.55); c.stroke();
      c.fillStyle = '#d6ff5a'; c.beginPath(); c.arc(cx + R * 0.15, by - R * 1.58, 9, 0, Math.PI * 2); c.fill(); c.lineWidth = 3; c.stroke();
      // body: a lumpy round shape
      const pts = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, k = 1 + Math.sin(a * 3 + 1) * 0.04; pts.push([cx + Math.cos(a) * R * k, by + Math.sin(a) * R * 0.95 * k]); }
      blob(c, pts, '#7fd35a', INK, r, 6);
      wash(c, cx - R * 0.3, by - R * 0.35, R * 0.55, '#c6f59a', 0.55, r);
      wash(c, cx + R * 0.35, by + R * 0.4, R * 0.5, '#3f9a32', 0.45, r);
      // printed stripes and spots
      c.strokeStyle = 'rgba(40,90,30,0.55)'; c.lineWidth = 4;
      for (const yy of [0.45, 0.68]) { c.beginPath(); c.arc(cx, by + R * 0.1, R * yy * 1.2, Math.PI * 0.2, Math.PI * 0.8); c.stroke(); }
      for (let i = 0; i < 5; i++) { c.fillStyle = 'rgba(40,110,30,0.4)'; c.beginPath(); c.arc(cx + (r() - 0.5) * R * 1.3, by + (r() - 0.2) * R * 0.9, 3 + r() * 4, 0, Math.PI * 2); c.fill(); }
      eye(c, cx, by - R * 0.2, R * 0.42, f === 3);
      // a wide grin
      c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.arc(cx, by + R * 0.28, R * 0.32, 0.15, Math.PI - 0.15); c.stroke();
      c.fillStyle = '#fff'; c.fillRect(cx - 6, by + R * 0.55, 5, 7); c.fillRect(cx + 2, by + R * 0.55, 5, 7);
    },
    // Folders: blue, a kite-ish body with crease lines (they fold into planes), two eyes, little arms out
    folder(c, w, h, r, f) {
      const cx = w / 2, top = h * 0.12, bot = h * 0.9;
      const pts = [[cx, top], [w * 0.88, h * 0.45], [cx + w * 0.16, bot], [cx - w * 0.16, bot], [w * 0.12, h * 0.45]];
      blob(c, pts, '#6ab0f0', INK, r, 6);
      wash(c, cx - w * 0.14, h * 0.35, w * 0.25, '#bfe2ff', 0.6, r);
      wash(c, cx + w * 0.18, h * 0.62, w * 0.22, '#3d7fc4', 0.45, r);
      // the fold creases: dashed lines it will fold along
      c.setLineDash([9, 7]); c.strokeStyle = 'rgba(30,60,110,0.6)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(cx, top + 10); c.lineTo(cx, bot - 6); c.stroke();
      c.beginPath(); c.moveTo(cx, top + 10); c.lineTo(w * 0.24, h * 0.5); c.stroke();
      c.beginPath(); c.moveTo(cx, top + 10); c.lineTo(w * 0.76, h * 0.5); c.stroke();
      c.setLineDash([]);
      eye(c, cx - w * 0.13, h * 0.42, w * 0.09, f === 3); eye(c, cx + w * 0.13, h * 0.42, w * 0.09, f === 3);
      c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(cx - 12, h * 0.6); c.quadraticCurveTo(cx, h * 0.55, cx + 12, h * 0.6); c.stroke();
      // a little pair of feet
      c.fillStyle = '#3d7fc4'; for (const dx of [-0.1, 0.1]) { c.beginPath(); c.ellipse(cx + w * dx, h * 0.93, 12, 6, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); }
    },
    // Carriers: yellow, round and fat, hugging a cosmic grenade (a purple star), worried eyebrows
    carrier(c, w, h, r, f) {
      const cx = w / 2, cy = h * 0.55, R = w * 0.38;
      const pts = []; for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.92]); }
      blob(c, pts, '#ffd447', INK, r, 6);
      wash(c, cx - R * 0.3, cy - R * 0.35, R * 0.5, '#fff2a8', 0.6, r);
      wash(c, cx + R * 0.3, cy + R * 0.45, R * 0.45, '#e0a41a', 0.5, r);
      for (const dx of [-0.32, 0.32]) eye(c, cx + R * dx, cy - R * 0.3, R * 0.2, f === 3);
      c.strokeStyle = INK; c.lineWidth = 4;
      c.beginPath(); c.moveTo(cx - R * 0.5, cy - R * 0.62); c.lineTo(cx - R * 0.16, cy - R * 0.52); c.stroke();
      c.beginPath(); c.moveTo(cx + R * 0.5, cy - R * 0.62); c.lineTo(cx + R * 0.16, cy - R * 0.52); c.stroke();
      // the grenade it clutches: a purple paper star in two stubby arms
      const sx = cx, sy = cy + R * 0.28, s = R * 0.32;
      c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? s * 0.45 : s; c.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } c.closePath();
      c.fillStyle = '#9a7dff'; c.fill(); c.strokeStyle = INK; c.lineWidth = 4; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(sx - s * 0.2, sy - s * 0.25, s * 0.18, 0, Math.PI * 2); c.fill();
      for (const dx of [-1, 1]) { c.fillStyle = '#ffd447'; c.beginPath(); c.ellipse(sx + dx * s * 0.85, sy + s * 0.1, s * 0.35, s * 0.25, dx * 0.5, 0, Math.PI * 2); c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); }
      // two stubby feet
      c.fillStyle = '#e0a41a'; for (const dx of [-0.35, 0.35]) { c.beginPath(); c.ellipse(cx + R * dx, h * 0.95, 14, 7, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); }
    },
    // Edgers: pink, tall and thin, a narrow head on a long neck, three eyes in a column
    edger(c, w, h, r, f) {
      const cx = w / 2;
      const pts = [[cx - w * 0.2, h * 0.96], [cx - w * 0.28, h * 0.6], [cx - w * 0.14, h * 0.4], [cx - w * 0.3, h * 0.12], [cx, h * 0.03], [cx + w * 0.3, h * 0.12], [cx + w * 0.14, h * 0.4], [cx + w * 0.28, h * 0.6], [cx + w * 0.2, h * 0.96]];
      blob(c, pts, '#ff7fbf', INK, r, 6);
      wash(c, cx - w * 0.08, h * 0.2, w * 0.18, '#ffd0ea', 0.6, r); wash(c, cx + w * 0.1, h * 0.7, w * 0.2, '#d94a92', 0.45, r);
      for (const k of [0.12, 0.2, 0.28]) eye(c, cx, h * k, w * 0.075, f === 3);
      c.strokeStyle = 'rgba(140,30,80,0.5)'; c.lineWidth = 3; for (let y = 0.5; y < 0.92; y += 0.07) { c.beginPath(); c.moveTo(cx - w * 0.18, h * y); c.lineTo(cx + w * 0.18, h * (y + 0.02)); c.stroke(); }
    },
    // Shield aliens: orange, stocky, holding a bottle cap out front (the cap is its own 3D piece); double ring on chest
    shield(c, w, h, r, f) {
      const cx = w / 2, by = h * 0.6, R = w * 0.33;
      const pts = []; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; pts.push([cx + Math.cos(a) * R * 1.05, by + Math.sin(a) * R]); }
      blob(c, pts, '#ff9a3c', INK, r, 6);
      wash(c, cx - R * 0.3, by - R * 0.35, R * 0.5, '#ffd6a0', 0.55, r); wash(c, cx + R * 0.4, by + R * 0.4, R * 0.5, '#d9661a', 0.45, r);
      for (const dx of [-0.3, 0.3]) eye(c, cx + R * dx, by - R * 0.35, R * 0.22, f === 3);
      crossMark(c, cx, by + R * 0.3, R * 0.2);
      for (const dx of [-0.45, 0.45]) { c.strokeStyle = INK; c.lineWidth = 12; c.beginPath(); c.moveTo(cx + R * dx, by + R * 0.8); c.lineTo(cx + R * dx * 1.2, h * 0.96); c.stroke(); c.strokeStyle = '#ff9a3c'; c.lineWidth = 6; c.stroke(); }
    },
    // Scissor crabs: red, a pair of paper scissors as claws on a round body with six little legs
    crab(c, w, h, r, f) {
      const cx = w / 2, cy = h * 0.62;
      c.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const sx = i < 3 ? -1 : 1, k = i % 3; c.strokeStyle = INK; c.lineWidth = 8; c.beginPath(); c.moveTo(cx + sx * w * 0.12, cy + 6); c.lineTo(cx + sx * w * (0.25 + k * 0.08), h * 0.94); c.stroke(); c.strokeStyle = '#e8504a'; c.lineWidth = 4; c.stroke(); }
      const pts = []; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; pts.push([cx + Math.cos(a) * w * 0.22, cy + Math.sin(a) * h * 0.2]); }
      blob(c, pts, '#e8504a', INK, r, 6);
      wash(c, cx - w * 0.06, cy - h * 0.06, w * 0.12, '#ffb0a0', 0.6, r);
      for (const sx of [-1, 1]) {
        // a scissor blade claw: two long pointed blades and a ring handle
        c.save(); c.translate(cx + sx * w * 0.3, cy - h * 0.25); c.rotate(sx * -0.5);
        c.fillStyle = '#d8dde6'; c.strokeStyle = INK; c.lineWidth = 4;
        c.beginPath(); c.moveTo(0, 0); c.lineTo(sx * 8, -h * 0.28); c.lineTo(sx * 16, 0); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(0, 0); c.lineTo(-sx * 10, -h * 0.26); c.lineTo(sx * 6, 2); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#e8504a'; c.beginPath(); c.arc(sx * 4, 12, 9, 0, Math.PI * 2); c.fill(); c.stroke();
        c.restore();
      }
      for (const dx of [-0.07, 0.07]) eye(c, cx + w * dx, cy - h * 0.12, w * 0.045, f === 3);
    },
    // Stampers: purple, twice as tall, a body like a rubber stamp handle on one huge stamp foot, an angry brow
    stamper(c, w, h, r, f) {
      const cx = w / 2;
      // the stamp foot: a dark rubber block with an inky face
      blob(c, [[cx - w * 0.42, h * 0.78], [cx + w * 0.42, h * 0.78], [cx + w * 0.44, h * 0.97], [cx - w * 0.44, h * 0.97]], '#5a3a7a', INK, r, 6);
      c.fillStyle = 'rgba(20,10,40,0.7)'; c.fillRect(cx - w * 0.4, h * 0.92, w * 0.8, h * 0.04);
      // the handle body
      const pts = [[cx - w * 0.26, h * 0.78], [cx - w * 0.3, h * 0.4], [cx - w * 0.2, h * 0.12], [cx, h * 0.04], [cx + w * 0.2, h * 0.12], [cx + w * 0.3, h * 0.4], [cx + w * 0.26, h * 0.78]];
      blob(c, pts, '#a26ad9', INK, r, 7);
      wash(c, cx - w * 0.1, h * 0.25, w * 0.2, '#e0c6ff', 0.55, r); wash(c, cx + w * 0.14, h * 0.6, w * 0.2, '#6a3a9a', 0.5, r);
      for (const dx of [-0.11, 0.11]) eye(c, cx + w * dx, h * 0.3, w * 0.07, f === 3);
      c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.moveTo(cx - w * 0.2, h * 0.22); c.lineTo(cx - w * 0.04, h * 0.27); c.stroke(); c.beginPath(); c.moveTo(cx + w * 0.2, h * 0.22); c.lineTo(cx + w * 0.04, h * 0.27); c.stroke();
      c.lineWidth = 6; c.beginPath(); c.moveTo(cx - w * 0.1, h * 0.46); c.lineTo(cx + w * 0.1, h * 0.46); c.stroke();
      crossMark(c, cx, h * 0.6, w * 0.06);
    },
  };
  PAINT.lesson = PAINT.grunt;
  // a scorched hole: a ragged see-through hole with a charred brown rim and a soot halo
  function scorch(c, x, y, rad, r) {
    const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, k = 0.7 + r() * 0.5; pts.push([x + Math.cos(a) * rad * k, y + Math.sin(a) * rad * k]); }
    const path = (s) => { c.beginPath(); pts.forEach((p, i) => { const px = x + (p[0] - x) * s, py = y + (p[1] - y) * s; if (!i) c.moveTo(px, py); else c.lineTo(px, py); }); c.closePath(); };
    const g = c.createRadialGradient(x, y, rad * 0.4, x, y, rad * 2.2); g.addColorStop(0, 'rgba(60,30,10,0.8)'); g.addColorStop(1, 'rgba(60,30,10,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, rad * 2.2, 0, Math.PI * 2); c.fill();
    path(1.25); c.fillStyle = '#6a3a14'; c.fill();
    path(1.08); c.fillStyle = '#2a1608'; c.fill();
    c.save(); c.globalCompositeOperation = 'destination-out'; path(0.92); c.fill(); c.restore();
  }
  // the whole cut-out for one frame, with the white cut edge (the silhouette grown by 7 px) and a thin grey cut line
  function paint(kind, frame, w = PX, h = Math.round(PX * SIZE[kind][1] / SIZE[kind][0])) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    const r = P.rng(kind.length * 97 + 11), inner = document.createElement('canvas'); inner.width = w; inner.height = h;
    const ic = inner.getContext('2d');
    ic.save(); ic.translate(w * 0.06, h * 0.05); ic.scale(0.88, 0.9);
    PAINT[kind](ic, w, h, r, frame);
    ic.restore();
    // paper grain over the paint
    ic.save(); ic.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < w * h / 90; i++) { ic.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(80,60,30,0.07)'; ic.fillRect(r() * w, r() * h, 1.5, 1.5); }
    ic.restore();
    if (frame === 1 || frame === 2) { const rs = P.rng(kind.length * 7 + frame); scorch(ic, w * (0.4 + rs() * 0.15), h * (0.55 + rs() * 0.1), w * 0.07, rs); if (frame === 2) scorch(ic, w * (0.58 + rs() * 0.1), h * (0.38 + rs() * 0.1), w * 0.06, rs); }
    // the white cut edge: the silhouette drawn larger in white underneath (scissors never follow the line exactly)
    const E = 7;
    for (let a = 0; a < 16; a++) c.drawImage(inner, Math.cos(a / 16 * Math.PI * 2) * E, Math.sin(a / 16 * Math.PI * 2) * E);
    c.save(); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#fbf7ec'; c.fillRect(0, 0, w, h); c.restore();
    // the faint grey line of the cut, just outside the white
    const edge = document.createElement('canvas'); edge.width = w; edge.height = h; const ec = edge.getContext('2d');
    for (let a = 0; a < 16; a++) ec.drawImage(cv, Math.cos(a / 16 * Math.PI * 2) * 1.6, Math.sin(a / 16 * Math.PI * 2) * 1.6);
    ec.globalCompositeOperation = 'source-in'; ec.fillStyle = 'rgba(110,100,90,0.8)'; ec.fillRect(0, 0, w, h);
    ec.globalCompositeOperation = 'destination-over'; // (nothing more)
    const out = document.createElement('canvas'); out.width = w; out.height = h; const oc = out.getContext('2d');
    oc.drawImage(edge, 0, 0); oc.drawImage(cv, 0, 0); oc.drawImage(inner, 0, 0);
    return out;
  }
  A.paint = paint;
  A.SIZE = SIZE;
  // the back of the paper: the same silhouette in plain paper, the paint showing faintly through
  function paintBack(front) {
    const w = front.width, h = front.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    c.save(); c.translate(w, 0); c.scale(-1, 1); c.drawImage(front, 0, 0); c.restore();
    c.save(); c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(246,240,226,0.82)'; c.fillRect(0, 0, w, h); c.restore();
    return cv;
  }
  // one atlas per kind: the four frames side by side
  function atlas(kind, back) {
    return K3D.paint('paAlien|' + kind + (back ? '|b' : ''), PX * NF, Math.round(PX * SIZE[kind][1] / SIZE[kind][0]), (c, w, h) => {
      for (let f = 0; f < NF; f++) { const fr = paint(kind, f); c.drawImage(back ? paintBack(fr) : fr, f * PX, 0); }
    });
  }
  // a toon material whose map is read from the instance's frame of the atlas (and its shadow likewise)
  function frameMat(tex, side) {
    const m = K3D.toon('#ffffff', { map: tex, side, alphaTest: 0.5 });
    m.onBeforeCompile = sh => {
      sh.vertexShader = 'attribute float aFrame;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n  vMapUv.x = (vMapUv.x + aFrame) / ' + NF + '.0;\n#endif');
    };
    m.customProgramCacheKey = () => 'paFrame' + NF;
    return m;
  }
  function frameDepth(tex) {
    const m = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: tex, alphaTest: 0.5, side: T.DoubleSide });
    m.onBeforeCompile = sh => {
      sh.vertexShader = 'attribute float aFrame;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n  vMapUv.x = (vMapUv.x + aFrame) / ' + NF + '.0;\n#endif');
    };
    m.customProgramCacheKey = () => 'paFrameD' + NF;
    return m;
  }

  /* ---------- the batches ---------- */
  const MAXN = { grunt: 48, lesson: 2, folder: 16, carrier: 6, edger: 16, shield: 12, crab: 8, stamper: 4 };
  A.make = function (K) {
    const groups = {};
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), s = new T.Vector3();
    for (const kind of Object.keys(MAXN)) {
      const [w, h] = SIZE[kind], n = MAXN[kind];
      const geo = K3D.geo('paAlienGeo|' + kind, () => {
        // a plane with a few rows so it can bend a little in the wind (bent in the vertex positions per frame below
        // would break batching, so the bend is a lean of the whole sheet; the rows keep its shading smooth)
        const g = new T.PlaneGeometry(w, h, 1, 4).translate(0, h / 2, 0);
        g.setAttribute('aFrame', new T.InstancedBufferAttribute(new Float32Array(n), 1));
        return g;
      });
      const front = new T.InstancedMesh(geo, frameMat(atlas(kind, false), T.FrontSide), n);
      const backTex = atlas(kind, true);
      const back = new T.InstancedMesh(geo, frameMat(backTex, T.BackSide), n);
      front.customDepthMaterial = frameDepth(atlas(kind, false));
      front.castShadow = true; front.receiveShadow = false; back.castShadow = false;
      front.count = back.count = 0; front.frustumCulled = back.frustumCulled = false;
      // the fold-back tab at the foot: a little card wedge leaning back
      const tab = new T.InstancedMesh(K3D.geo('paTabGeo|' + kind, () => new T.BoxGeometry(w * 0.45, 0.02, h * 0.16).translate(0, 0.01, -h * 0.08)),
        K3D.mat('paTabM', () => K3D.toon('#efe6d0')), n);
      tab.castShadow = false; tab.receiveShadow = true; tab.count = 0; tab.frustumCulled = false;
      K.add(front); K.add(back); K.add(tab);
      groups[kind] = { front, back, tab, frame: geo.attributes.aFrame, n, w, h };
    }
    // the Shield aliens' bottle caps: a crimped metal disc with a printed top
    const capTex = K3D.paint('paCapTex', 128, 128, (c, w, h) => {
      const g = c.createRadialGradient(54, 50, 4, 64, 64, 64); g.addColorStop(0, '#f6f6f2'); g.addColorStop(0.7, '#c9ccd2'); g.addColorStop(1, '#8a8e98');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = '#d33a3a'; c.beginPath(); c.arc(64, 64, 40, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.font = 'bold 30px Georgia, serif'; c.textAlign = 'center'; c.fillText('POP', 64, 75);
    });
    const caps = new T.InstancedMesh(K3D.geo('paCapGeo', () => {
      const g = new T.CylinderGeometry(0.42, 0.42, 0.08, 24, 1); const a = g.attributes.position;
      for (let i = 0; i < a.count; i++) { const ang = Math.atan2(a.getZ(i), a.getX(i)), r = Math.hypot(a.getX(i), a.getZ(i)); if (r > 0.4) { const k = 1 + Math.sin(ang * 21) * 0.05; a.setX(i, a.getX(i) * k); a.setZ(i, a.getZ(i) * k); } }
      g.computeVertexNormals(); return g.rotateX(Math.PI / 2);
    }), K3D.toon('#ffffff', { map: capTex }), MAXN.shield);
    caps.castShadow = true; caps.count = 0; caps.frustumCulled = false; K.add(caps);
    // Folders folded into paper planes (a second shape, used once a Folder is past its first fold)
    const planeGeo = K3D.geo('paPlaneGeo', () => {
      const g = new T.BufferGeometry();
      // nose at +Z; two wings lifted a little at the tips (a dihedral) and a keel, each a triangle; UVs are a top-down
      // map of the sheet (x -0.6..0.6 -> u, z -0.45..0.65 -> v) so the folded paper keeps its print
      const p = [0, 0, 0.62, -0.58, 0.09, -0.42, 0, 0.02, -0.3, 0, 0, 0.62, 0, 0.02, -0.3, 0.58, 0.09, -0.42, 0, 0, 0.62, 0, -0.2, -0.36, 0, 0.02, -0.3];
      const uv = [];
      for (let i = 0; i < p.length; i += 3) uv.push(i >= 18 ? 0.5 + p[i + 1] : (p[i] + 0.6) / 1.2, (p[i + 2] + 0.45) / 1.1);
      g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
    });
    // the plane's paper: the Folder's blue sheet with its dashed fold lines, a white edge, and its two worried eyes
    // looking out from the top of the nose
    const planeTex = K3D.paint('paPlaneTex', 256, 256, (c, w, h) => {
      P.paper(c, w, h, '#7dbdf4', 77);
      c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 10; c.strokeRect(0, 0, w, h);
      c.strokeStyle = 'rgba(30,60,110,0.75)'; c.lineWidth = 3; c.setLineDash([10, 8]);
      c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.moveTo(w / 2, h * 0.05); c.lineTo(w * 0.12, h); c.moveTo(w / 2, h * 0.05); c.lineTo(w * 0.88, h); c.stroke(); c.setLineDash([]);
      for (const ex of [-1, 1]) { const x = w / 2 + ex * 26, y = h * 0.3; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y, 15, 19, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#1c1a36'; c.lineWidth = 4; c.stroke(); c.fillStyle = '#1c1a36'; c.beginPath(); c.arc(x, y - 4, 7, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = '#1c1a36'; c.lineWidth = 4; c.beginPath(); c.moveTo(w / 2 - 44, h * 0.16); c.lineTo(w / 2 - 14, h * 0.2); c.moveTo(w / 2 + 44, h * 0.16); c.lineTo(w / 2 + 14, h * 0.2); c.stroke();
    });
    const planes = new T.InstancedMesh(planeGeo, K3D.toon('#ffffff', { map: planeTex, side: T.DoubleSide }), MAXN.folder);
    planes.castShadow = true; planes.count = 0; planes.frustumCulled = false; K.add(planes);
    K3D.ink(planes, '#1f4a7a', 0.8);
    const planeInk = planes.children[0];
    // pop-up spots: a dotted outline on the page, then the slit the alien rises from
    const dotTex = K3D.paint('paDotRing', 128, 128, (c, w, h) => {
      c.strokeStyle = 'rgba(43,33,48,0.85)'; c.lineWidth = 6; c.setLineDash([10, 9]); c.beginPath(); c.arc(64, 64, 54, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]); c.strokeStyle = 'rgba(43,33,48,0.6)'; c.lineWidth = 4; c.beginPath(); c.moveTo(34, 64); c.lineTo(94, 64); c.stroke();
    });
    const pops = new T.InstancedMesh(K3D.geo('paPopGeo', () => new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), K3D.flat('#ffffff', { map: dotTex, transparent: true, depthWrite: false }), 64);
    pops.material.polygonOffset = true; pops.material.polygonOffsetFactor = -3; pops.material.polygonOffsetUnits = -3;
    pops.count = 0; pops.frustumCulled = false; pops.renderOrder = 2; K.add(pops);
    const cnt = {};
    return {
      update(st, aliens, dt, cam) {
        for (const k in groups) cnt[k] = 0;
        let nc = 0, np = 0, npop = 0;
        const t = G.clock;
        for (const a of aliens) {
          const gr = groups[a.k]; if (!gr) continue;
          if (a.st === 'pop' && a.t < PA.popShow && !a.crumple) {
            // the dotted outline where it will come up
            if (npop < 64) { v.set(a.x, 0.015, a.z); s.set(1.5, 1, 1.5); q.identity(); m4.compose(v, q, s); pops.setMatrixAt(npop++, m4); }
            continue;
          }
          const i = cnt[a.k]; if (i >= gr.n) continue;
          // rising out of the page like a pop-up turning: from lying flat to standing
          const ck = a.crumple || 0;
          const rise = a.st === 'pop' ? clamp((a.t - PA.popShow) / PA.popRise, 0, 1) : 1;
          const ease = 1 - Math.pow(1 - rise, 3);
          const wob = Math.sin(t * 3.1 + a.seed * 20) * 0.06, sway = Math.sin(t * 1.7 + a.seed * 9) * 0.05;
          let fold = a.k === 'folder' ? a.fold || 0 : 0;
          const zapK = a.zap ? clamp(a.zap.t / a.zap.wind, 0, 1) : 0;
          if (a.k === 'folder' && fold >= 1) {
            // a paper plane: the second and third folds narrow it; it flies nose-first along its dive
            if (np < MAXN.folder) {
              const narrow = fold >= 2 ? 0.75 : 1, pitch = a.st2 === 'dive' ? 0.35 : a.st2 === 'stuck' ? 0.9 : -0.1;
              e.set(pitch, a.face, a.st2 === 'fold' ? Math.sin(t * 9) * 0.15 : 0); q.setFromEuler(e);
              v.set(a.x, a.y + (a.st2 === 'stuck' ? 0.35 : 0.1), a.z); s.set(narrow * 1.45, 1.45, 1.6); m4.compose(v, q, s);
              planes.setMatrixAt(np++, m4);
            }
            continue;
          }
          // the sheet: turned to its facing, leaning with its hop, wobbling on its tab, shrinking as it folds
          const lean = (a.y > 0.02 ? -0.12 : 0) + wob * 0.6 + (a.k === 'stamper' && a.jump ? -0.2 : 0);
          // crumpling (a beaten alien, for a quarter of a second): squeezed in from the sides and the top, twisting, and
          // lifting a little as it balls up (the paper ball takes over when it ends)
          e.set(lean - (1 - ease) * Math.PI / 2 + ck * 0.5, a.face + ck * 1.6, sway + (zapK > 0 ? Math.sin(t * 40) * 0.04 * zapK : 0) + ck * 0.7); q.setFromEuler(e);
          const sx = (1 - fold * 0.5) * (1 + zapK * 0.06) * (1 - ck * 0.72) * (1 + Math.sin(ck * 23) * 0.08 * ck), sy = (1 + zapK * 0.06 + (a.st === 'live' && a.y > 0 ? 0.05 : 0)) * (1 - ck * 0.68);
          v.set(a.x, a.y + ck * 0.35, a.z); s.set(sx, sy * Math.max(0.02, ease), 1 + ck * 2); m4.compose(v, q, s);
          gr.front.setMatrixAt(i, m4); gr.back.setMatrixAt(i, m4);
          // the tab stays on the page
          e.set(0, a.face, 0); q.setFromEuler(e); v.set(a.x, 0.005, a.z); s.set(sx, 1, ease); m4.compose(v, q, s); gr.tab.setMatrixAt(i, m4);
          gr.frame.array[i] = ck > 0 ? 2 : zapK > 0.2 && Math.sin(t * 30) > -0.3 ? 3 : Math.min(2, a.scorch || 0);
          cnt[a.k] = i + 1;
          if (a.k === 'shield' && a.cap && nc < MAXN.shield) {
            e.set(0, a.capA, 0); q.setFromEuler(e);
            v.set(a.x + Math.sin(a.capA) * 0.25, a.y + 0.62, a.z + Math.cos(a.capA) * 0.25); s.set(1, 1, 1); m4.compose(v, q, s); caps.setMatrixAt(nc++, m4);
          }
        }
        for (const k in groups) {
          const gr = groups[k], n = cnt[k];
          gr.front.count = gr.back.count = gr.tab.count = n;
          gr.front.instanceMatrix.needsUpdate = gr.back.instanceMatrix.needsUpdate = gr.tab.instanceMatrix.needsUpdate = true;
          gr.frame.needsUpdate = true;
          gr.front.visible = gr.back.visible = gr.tab.visible = n > 0;
        }
        caps.count = nc; caps.instanceMatrix.needsUpdate = true; caps.visible = nc > 0;
        planes.count = np; planes.instanceMatrix.needsUpdate = true; planes.visible = np > 0; planeInk.visible = np > 0 && K3D.opt.ink;
        pops.count = npop; pops.instanceMatrix.needsUpdate = true; pops.visible = npop > 0;
      },
    };
  };
  return A;
})();

/* ---------- the effects ---------- */
const PAFX = (function () {
  const T = K3D.T, P = POPUP;
  const F = {};
  const BOLT_COL = ['#ffe14a', '#5cff7a'];
  F.make = function (K) {
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), s = new T.Vector3(), up = new T.Vector3(0, 1, 0), col = new T.Color();
    const glow = PAGEAR.glowTex(), star = PAGEAR.starTex();
    const add = o => { K.add(o); o.frustumCulled = false; return o; };
    // bolts: a hot white core and a long coloured glow, both stretched along the flight
    const MB = 64;
    const core = add(new T.InstancedMesh(K3D.geo('paBoltCore', () => new T.SphereGeometry(1, 10, 6)), K3D.flat('#ffffff'), MB));
    const halo = add(new T.InstancedMesh(K3D.geo('paBoltHalo', () => new T.SphereGeometry(1, 12, 8)), K3D.flat('#ffffff', { transparent: true, opacity: 0.55, add: true, depthWrite: false }), MB));
    core.count = halo.count = 0;
    // ground decals: scorches where bolts land, inky stamp prints, slits and holes, zap rings, dive lines, stamp shadows
    const decal = (key, paint, n, o = {}) => {
      const tex = K3D.paint(key, o.w || 128, o.h || 128, paint);
      const m = add(new T.InstancedMesh(K3D.geo('paDecalGeo', () => new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), K3D.flat('#ffffff', { map: tex, transparent: true, depthWrite: false, add: !!o.add }), n));
      m.material.polygonOffset = true; m.material.polygonOffsetFactor = -2 - (o.lift || 0); m.material.polygonOffsetUnits = -2 - (o.lift || 0);
      m.renderOrder = 1 + (o.lift || 0); m.count = 0;
      return m;
    };
    const scorchD = decal('paScorchD', (c, w, h) => {
      const r = P.rng(33);
      const g = c.createRadialGradient(64, 64, 4, 64, 64, 60); g.addColorStop(0, 'rgba(70,35,10,0.85)'); g.addColorStop(0.5, 'rgba(120,70,30,0.5)'); g.addColorStop(1, 'rgba(120,70,30,0)');
      c.fillStyle = g; c.beginPath(); for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, k = 40 + r() * 22; c.lineTo(64 + Math.cos(a) * k, 64 + Math.sin(a) * k); } c.fill();
    }, 80);
    const printD = decal('paPrintD', (c, w, h) => {
      const r = P.rng(71);
      c.fillStyle = 'rgba(40,24,70,0.82)'; c.beginPath(); for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2, k = 52 + r() * 8; c.lineTo(64 + Math.cos(a) * k, 64 + Math.sin(a) * k); } c.fill();
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.font = 'bold 40px Georgia, serif'; c.textAlign = 'center'; c.fillText('UFO', 64, 78);
      for (let i = 0; i < 12; i++) { c.fillStyle = 'rgba(40,24,70,0.7)'; c.beginPath(); c.arc(64 + (r() - 0.5) * 130, 64 + (r() - 0.5) * 130, 2 + r() * 5, 0, Math.PI * 2); c.fill(); }
    }, 24, { lift: 1 });
    const slitD = decal('paSlitD', (c, w, h) => {
      c.fillStyle = '#1a1220'; c.fillRect(0, 22, w, 20);
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(0, 18, w, 4); c.fillStyle = 'rgba(120,100,80,0.6)'; c.fillRect(0, 42, w, 3);
    }, 140, { w: 64, h: 64, lift: 2 });
    const ringD = decal('paZapRing', (c, w, h) => {
      const g = c.createRadialGradient(128, 128, 90, 128, 128, 126); g.addColorStop(0, 'rgba(210,255,120,0)'); g.addColorStop(0.75, 'rgba(230,255,150,0.95)'); g.addColorStop(1, 'rgba(210,255,120,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(200,255,120,0.12)'; c.beginPath(); c.arc(128, 128, 110, 0, Math.PI * 2); c.fill();
    }, 48, { w: 256, h: 256, add: true, lift: 3 });
    const lineD = decal('paDiveLine', (c, w, h) => {
      c.fillStyle = 'rgba(30,50,90,0.7)'; for (let x = 0; x < w; x += 32) c.fillRect(x, 24, 20, 16);
    }, 16, { w: 128, h: 64, lift: 3 });
    const shadowD = decal('paStampShadow', (c, w, h) => {
      const g = c.createRadialGradient(64, 64, 10, 64, 64, 62); g.addColorStop(0, 'rgba(30,10,50,0.75)'); g.addColorStop(0.85, 'rgba(30,10,50,0.6)'); g.addColorStop(1, 'rgba(30,10,50,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,90,90,0.9)'; c.lineWidth = 5; c.setLineDash([12, 8]); c.beginPath(); c.arc(64, 64, 56, 0, Math.PI * 2); c.stroke();
    }, 8, { lift: 3 });
    const burstD = decal('paBurstRing', (c, w, h) => {
      const g = c.createRadialGradient(128, 128, 20, 128, 128, 126); g.addColorStop(0, 'rgba(190,150,255,0.0)'); g.addColorStop(0.7, 'rgba(200,170,255,0.9)'); g.addColorStop(1, 'rgba(160,120,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    }, 8, { w: 256, h: 256, add: true, lift: 4 });
    const pickRing = decal('paPickRing', (c, w, h) => {
      c.strokeStyle = 'rgba(170,140,255,0.95)'; c.lineWidth = 7; c.beginPath(); c.arc(64, 64, 48, 0, Math.PI * 2); c.stroke();
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 60); g.addColorStop(0, 'rgba(170,140,255,0.5)'); g.addColorStop(1, 'rgba(170,140,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    }, 24, { add: true, lift: 2 });
    // cosmic grenades: a folded paper star in a purple cellophane wrapper, with a glow
    const starGeo = K3D.geo('paGrenStar', () => {
      const s2 = new T.Shape(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.09 : 0.2; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (!i) s2.moveTo(x, y); else s2.lineTo(x, y); } s2.closePath();
      return new T.ExtrudeGeometry(s2, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 1 }).translate(0, 0, -0.03);
    });
    const grens = add(new T.InstancedMesh(starGeo, K3D.toon('#9a7dff', { emissive: '#6a4adf', emissiveIntensity: 0.45 }), 32));
    K3D.ink(grens, '#3a2a7a', 0.8); grens.children[0].frustumCulled = false;
    const wrap = add(new T.InstancedMesh(K3D.geo('paWrap', () => new T.SphereGeometry(0.27, 14, 10)), K3D.flat('#cfc0ff', { transparent: true, opacity: 0.25, depthWrite: false }), 32));
    const gGlow = add(new T.InstancedMesh(K3D.geo('paGlowQ', () => new T.PlaneGeometry(1, 1)), K3D.flat('#b090ff', { map: glow, transparent: true, opacity: 0.8, add: true, depthWrite: false }), 32));
    grens.count = wrap.count = gGlow.count = 0; grens.castShadow = true;
    // debris: crumpled paper balls (bouncing, then lying about) and confetti, both kept for a while
    const ballGeo = K3D.geo('paBall', () => {
      const g = new T.IcosahedronGeometry(0.3, 2), a = g.attributes.position, r = P.rng(5);
      const seen = new Map();
      for (let i = 0; i < a.count; i++) {
        const key = Math.round(a.getX(i) * 1e3) + ',' + Math.round(a.getY(i) * 1e3) + ',' + Math.round(a.getZ(i) * 1e3);
        let k = seen.get(key); if (k == null) { k = 0.72 + r() * 0.5; seen.set(key, k); }
        a.setXYZ(i, a.getX(i) * k, a.getY(i) * k, a.getZ(i) * k);
      }
      g.computeVertexNormals(); return g;
    });
    const MBALL = 160;
    const balls = add(new T.InstancedMesh(ballGeo, K3D.toon('#ffffff', { flat: true }), MBALL));
    balls.material.flatShading = true; balls.castShadow = true; balls.count = 0;
    K3D.ink(balls, '#2b2130', 0.7); balls.children[0].frustumCulled = false;
    const MCONF = 1400;
    const conf = add(new T.InstancedMesh(K3D.geo('paConfGeo', () => new T.PlaneGeometry(0.11, 0.07)), K3D.toon('#ffffff', { side: T.DoubleSide }), MCONF));
    conf.count = 0; conf.castShadow = false;
    const sparks = add(new T.InstancedMesh(K3D.geo('paSparkQ', () => new T.PlaneGeometry(1, 1)), K3D.flat('#ffffff', { map: star, transparent: true, add: true, depthWrite: false }), 120));
    sparks.count = 0;
    // crossed beams: from each hero's gun to the alien for a moment, a thick beam in the hero's bolt colour round a white
    // core, twisting (normal blending: an added glow would vanish on the bright page)
    const beams = [];
    const beamGeo = K3D.geo('paBeam', () => new T.CylinderGeometry(1, 1, 1, 10, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2));
    for (let i = 0; i < 8; i++) {
      const outer = add(new T.Mesh(beamGeo, new T.MeshBasicMaterial({ color: BOLT_COL[i % 2], transparent: true, opacity: 0.85, depthWrite: false })));
      const core = new T.Mesh(beamGeo, new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 1, depthWrite: false }));
      core.scale.set(0.45, 0.45, 1); core.renderOrder = 1; outer.add(core);
      outer.visible = false; beams.push({ m: outer, core, t: 0 });
    }
    const KCOL = { grunt: '#7fd35a', lesson: '#7fd35a', folder: '#6ab0f0', carrier: '#ffd447', edger: '#ff7fbf', shield: '#ff9a3c', crab: '#e8504a', stamper: '#a26ad9' };
    const CONF_COLS = ['#ff5a7a', '#ffd447', '#5fd0ff', '#7fd35a', '#b18aff', '#ff9a3c', '#ffffff'];
    const D = { balls: [], conf: [], scorch: [], sparks: [], seen: 0, rnd: P.rng(99) };
    const R = D.rnd;
    function addBall(x, y, z, kind, kick, wait = 0) {
      if (D.balls.length >= MBALL) D.balls.shift();
      D.balls.push({ wait, x, y: y + 0.6, z, vx: (R() - 0.5) * 3 + kick[0], vy: 3 + R() * 2, vz: (R() - 0.5) * 3 + kick[1], rx: R() * 6, ry: R() * 6, spin: 6 + R() * 6, col: KCOL[kind] || '#ffffff', s: kind === 'stamper' ? 1.5 : kind === 'edger' ? 0.9 : 0.78, rest: 0 });
    }
    function addConf(x, y, z, n, kind, power = 1) {
      for (let i = 0; i < n; i++) {
        if (D.conf.length >= MCONF) D.conf.shift();
        const a = R() * Math.PI * 2, sp = (1.5 + R() * 4) * power;
        D.conf.push({ x, y: y + 0.3 + R() * 0.8, z, vx: Math.cos(a) * sp, vy: 2 + R() * 4 * power, vz: Math.sin(a) * sp, rx: R() * 6, ry: R() * 6, rz: R() * 6, sp: 4 + R() * 10,
          col: R() < 0.4 && kind ? KCOL[kind] : CONF_COLS[Math.floor(R() * CONF_COLS.length)], rest: 0 });
      }
    }
    function addSpark(x, y, z, colr, life = 0.25, size = 0.6) { if (D.sparks.length >= 120) D.sparks.shift(); D.sparks.push({ x, y, z, col: colr, t: 0, life, size }); }
    function addScorch(x, z, s = 0.6) { if (D.scorch.length >= 80) D.scorch.shift(); D.scorch.push({ x, z, s, rot: R() * 6 }); }
    // the newest rule events (st.fx) become pictures
    function readFx(st, guns) {
      for (const f of st.fx) {
        if (f.n <= D.seen) continue;
        D.seen = f.n;
        const a = f.a;
        switch (f.kind) {
          case 'crumple': addBall(a.x, a.y, a.z, a.k, [Math.sin(a.face) * -1.5, Math.cos(a.face) * -1.5], 0.24); addConf(a.x, a.y + 0.5, a.z, 14, a.k, 0.6); addScorch(a.x, a.z, 0.8); break;
          case 'confetti': addConf(a.x, a.y + 0.4, a.z, 60, a.k, 1.2); break;
          case 'scorch': addSpark(a.x, a.y + 0.7, a.z, '#ffb060', 0.3, 0.8); break;
          case 'fizzle': addScorch(f.x, f.z, 0.45); addSpark(f.x, 0.3, f.z, BOLT_COL[f.k], 0.2, 0.5); break;
          case 'ping': addSpark(f.x, 0.5, f.z, '#ffffff', 0.18, 0.5); break;
          case 'burst': addConf(f.x, 0.2, f.z, 40, null, 1.4); for (let i = 0; i < 16; i++) { const an = i / 16 * Math.PI * 2; addSpark(f.x + Math.cos(an) * f.r * 0.6, 0.6 + R(), f.z + Math.sin(an) * f.r * 0.6, '#c8a8ff', 0.6, 1.0); } D.burst = { x: f.x, z: f.z, r: f.r, t: 0 }; break;
          case 'cross': {
            // a beam from each hero's gun to the alien
            guns.forEach((g, gi) => { const b = beams.find(q => q.t <= 0); if (!b) return; b.t = 0.35; b.from = g.clone(); b.to = new T.Vector3(a.x, a.y + 0.7, a.z); b.m.material.color.set(BOLT_COL[gi]); });
            addSpark(a.x, a.y + 0.7, a.z, '#ffffff', 0.35, 1.4);
            break;
          }
          case 'capOff': addBall(a.x + Math.sin(a.face) * 0.3, a.y + 0.4, a.z + Math.cos(a.face) * 0.3, 'shield', [0, 0]); break;
          case 'stamp': addConf(f.x, 0, f.z, 10, null, 0.5); break;
          case 'pickup': addSpark(f.x, 0.5, f.z, '#c8a8ff', 0.4, 1.2); break;
          case 'wallDown': break;
          case 'restart': D.balls.length = 0; D.conf.length = 0; D.scorch.length = 0; break;
        }
      }
    }
    return {
      D, addConf,
      update(st, dt, cam, guns) {
        readFx(st, guns);
        const t = G.clock, camQ = cam.quaternion;
        // bolts
        let n = 0;
        for (const b of st.bolts) {
          if (n >= MB) break;
          const yaw = Math.atan2(b.dx, b.dz);
          e.set(0, yaw, 0); q.setFromEuler(e);
          v.set(b.x - b.dx * 0.25, b.y, b.z - b.dz * 0.25);
          s.set(0.07, 0.07, 0.42); m4.compose(v, q, s); core.setMatrixAt(n, m4);
          s.set(0.17, 0.17, 0.62); m4.compose(v, q, s); halo.setMatrixAt(n, m4); halo.setColorAt(n, col.set(BOLT_COL[b.k]));
          n++;
        }
        core.count = halo.count = n; core.instanceMatrix.needsUpdate = halo.instanceMatrix.needsUpdate = true; if (halo.instanceColor) halo.instanceColor.needsUpdate = true;
        // ground decals
        let k = 0;
        for (const sc of D.scorch) { e.set(0, sc.rot, 0); q.setFromEuler(e); v.set(sc.x, 0.01, sc.z); s.set(sc.s, 1, sc.s); m4.compose(v, q, s); scorchD.setMatrixAt(k++, m4); }
        scorchD.count = k; scorchD.instanceMatrix.needsUpdate = true;
        k = 0;
        for (const pr of st.prints) { if (G.time > pr.until) continue; const fade = clamp((pr.until - G.time) / 2, 0, 1); q.identity(); v.set(pr.x, 0.012, pr.z); s.set(pr.r * 2.1 * (0.8 + fade * 0.2), 1, pr.r * 2.1 * (0.8 + fade * 0.2)); m4.compose(v, q, s); printD.setMatrixAt(k++, m4); }
        printD.count = k; printD.instanceMatrix.needsUpdate = true;
        k = 0;
        for (const ho of st.holes) {
          if (k >= 140) break;
          if (ho.fixed) continue;   // the "cut here" line is part of the scenery (popaliens-lands.js)
          const open = G.time >= ho.open;
          q.identity(); v.set((ho.x0 + ho.x1) / 2, 0.014, ho.z); s.set(ho.x1 - ho.x0 + 0.06, 1, open ? 0.62 : 0.2); m4.compose(v, q, s); slitD.setMatrixAt(k++, m4);
        }
        slitD.count = k; slitD.instanceMatrix.needsUpdate = true;
        // zap rings (growing and pulsing while the zap winds up), dive lines, stamp shadows
        let zr = 0, dl = 0, sh = 0;
        for (const a of st.aliens) {
          if (a.zap && zr < 48) { const kz = clamp(a.zap.t / a.zap.wind, 0, 1), R2 = a.zap.r * (0.6 + 0.4 * kz) * (1 + Math.sin(t * 20) * 0.03); q.identity(); v.set(a.x, 0.02, a.z); s.set(R2 * 2, 1, R2 * 2); m4.compose(v, q, s); ringD.setMatrixAt(zr++, m4); }
          if (a.k === 'folder' && (a.st2 === 'fold' || a.st2 === 'dive') && a.to && dl < 16) {
            const dx = a.to.x - a.from.x, dz = a.to.z - a.from.z, L = Math.hypot(dx, dz);
            e.set(0, Math.atan2(dx, dz) + Math.PI / 2, 0); q.setFromEuler(e); v.set((a.from.x + a.to.x) / 2, 0.02, (a.from.z + a.to.z) / 2); s.set(L, 1, 0.5); m4.compose(v, q, s); lineD.setMatrixAt(dl++, m4);
          }
          if (a.k === 'stamper' && a.jump && sh < 8) { const kk = clamp(a.jump.t / 1.2, 0, 1); q.identity(); v.set(a.jump.tx, 0.02, a.jump.tz); s.set(3 * (0.5 + kk * 0.5), 1, 3 * (0.5 + kk * 0.5)); m4.compose(v, q, s); shadowD.setMatrixAt(sh++, m4); }
        }
        ringD.count = zr; lineD.count = dl; shadowD.count = sh;
        ringD.instanceMatrix.needsUpdate = lineD.instanceMatrix.needsUpdate = shadowD.instanceMatrix.needsUpdate = true;
        // the grenade burst ring
        if (D.burst) { D.burst.t += dt; const kb = D.burst.t / 0.5; if (kb >= 1) D.burst = null; else { q.identity(); v.set(D.burst.x, 0.03, D.burst.z); const rr = D.burst.r * 2 * (0.4 + kb * 0.8); s.set(rr, 1, rr); m4.compose(v, q, s); burstD.setMatrixAt(0, m4); } }
        burstD.count = D.burst ? 1 : 0; burstD.instanceMatrix.needsUpdate = true;
        // grenades: in flight, ticking on the page, and lying about to be picked up
        let ng = 0, pr2 = 0;
        const putStar = (x, y, z, spin, glowK) => {
          if (ng >= 32) return;
          e.set(0.3, spin, Math.sin(spin) * 0.3); q.setFromEuler(e); v.set(x, y, z); s.set(1, 1, 1); m4.compose(v, q, s);
          grens.setMatrixAt(ng, m4); wrap.setMatrixAt(ng, m4);
          q.copy(camQ); s.set(0.9 * glowK, 0.9 * glowK, 1); m4.compose(v, q, s); gGlow.setMatrixAt(ng, m4);
          ng++;
        };
        for (const g of st.grens) putStar(g.x, g.y + 0.15, g.z, t * (g.landed ? 2 : 14), g.landed ? 1 + Math.sin(g.fuse * 30) * 0.4 : 0.9);
        for (const p of st.pickups) {
          if (!p.live) continue;
          putStar(p.x, 0.45 + Math.sin(t * 3 + p.x) * 0.08, p.z, t * 1.5 + p.x, 1);
          if (pr2 < 24) { q.identity(); v.set(p.x, 0.02, p.z); const rr = 1.2 + Math.sin(t * 4) * 0.08; s.set(rr, 1, rr); m4.compose(v, q, s); pickRing.setMatrixAt(pr2++, m4); }
        }
        grens.count = wrap.count = gGlow.count = ng; grens.instanceMatrix.needsUpdate = wrap.instanceMatrix.needsUpdate = gGlow.instanceMatrix.needsUpdate = true;
        pickRing.count = pr2; pickRing.instanceMatrix.needsUpdate = true;
        // crumpled balls bounce and roll, then lie about the page
        k = 0;
        for (const b of D.balls) {
          if (b.wait > 0) { b.wait -= dt; continue; }
          if (!b.rest) {
            b.vy -= 18 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.rx += b.spin * dt; b.ry += b.spin * 0.7 * dt;
            if (b.y < 0.22 * b.s) { b.y = 0.22 * b.s; b.vy = Math.abs(b.vy) * 0.42; b.vx *= 0.7; b.vz *= 0.7; b.spin *= 0.7; if (b.vy < 0.6) b.rest = 1; }
          }
          e.set(b.rx, b.ry, 0); q.setFromEuler(e); v.set(b.x, b.y, b.z); s.setScalar(b.s); m4.compose(v, q, s); balls.setMatrixAt(k, m4); balls.setColorAt(k, col.set(b.col).lerp(new T.Color('#f6efe0'), 0.35)); k++;
        }
        balls.count = k; balls.instanceMatrix.needsUpdate = true; if (balls.instanceColor) balls.instanceColor.needsUpdate = true;
        // confetti flutters down and settles
        k = 0;
        for (const c of D.conf) {
          if (!c.rest) {
            c.vy -= 9 * dt; c.vy = Math.max(c.vy, -1.6); c.vx *= 1 - 1.6 * dt; c.vz *= 1 - 1.6 * dt;
            c.x += c.vx * dt + Math.sin(t * 5 + c.rz) * 0.3 * dt; c.y += c.vy * dt; c.z += c.vz * dt;
            c.rx += c.sp * dt; c.ry += c.sp * 0.6 * dt;
            if (c.y <= 0.012) { c.y = 0.012; c.rest = 1; c.rx = -Math.PI / 2; c.ry = 0; }
          }
          e.set(c.rx, c.ry, c.rz); q.setFromEuler(e); v.set(c.x, c.y, c.z); s.set(1, 1, 1); m4.compose(v, q, s); conf.setMatrixAt(k, m4); conf.setColorAt(k, col.set(c.col)); k++;
        }
        conf.count = k; conf.instanceMatrix.needsUpdate = true; if (conf.instanceColor) conf.instanceColor.needsUpdate = true;
        // sparks
        k = 0;
        for (const sp of D.sparks) { sp.t += dt; if (sp.t > sp.life) continue; const kk = sp.t / sp.life; q.copy(camQ); v.set(sp.x, sp.y, sp.z); const ss = sp.size * (0.5 + kk); s.set(ss, ss, 1); m4.compose(v, q, s); sparks.setMatrixAt(k, m4); sparks.setColorAt(k, col.set(sp.col).multiplyScalar(1 - kk)); k++; }
        D.sparks = D.sparks.filter(sp => sp.t <= sp.life);
        sparks.count = k; sparks.instanceMatrix.needsUpdate = true; if (sparks.instanceColor) sparks.instanceColor.needsUpdate = true;
        // crossed beams
        for (const b of beams) {
          if (b.t <= 0) { b.m.visible = false; continue; }
          b.t -= dt;
          const L = b.from.distanceTo(b.to);
          const w = 0.13 + Math.sin(t * 60) * 0.03, k = clamp(b.t / 0.35, 0, 1);
          b.m.position.copy(b.from); b.m.lookAt(b.to); b.m.rotateZ(t * 20); b.m.scale.set(w, w * 0.7, L);
          b.m.material.opacity = Math.min(1, k * 2) * 0.85; b.core.material.opacity = Math.min(1, k * 2); b.m.visible = true;
        }
      },
    };
  };
  return F;
})();

/* ---------- the saucer ---------- */
const PASAUCER = (function () {
  const T = K3D.T, P = POPUP;
  return {
    make() {
      const g = new T.Group();
      // the disc: two shallow folded card cones (top and bottom), a tinfoil rim, printed portholes
      const discTex = K3D.paint('paSaucerTex', 512, 256, (c, w, h) => {
        P.paper(c, w, h, '#d7dbe6', 404);
        c.strokeStyle = 'rgba(60,60,90,0.4)'; c.lineWidth = 3; for (let a = 0; a < 24; a++) { const x = a / 24 * w; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
        for (let a = 0; a < 12; a++) { const x = (a + 0.5) / 12 * w; c.fillStyle = '#ffe680'; c.beginPath(); c.arc(x, h * 0.55, 14, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#2b2130'; c.lineWidth = 4; c.stroke(); }
        c.fillStyle = 'rgba(80,40,120,0.5)'; c.fillRect(0, h * 0.82, w, h * 0.08);
      }, { repeat: true });
      const top = K3D.mesh(new T.ConeGeometry(8, 2.4, 48, 1, true), K3D.toon('#ffffff', { map: discTex, side: T.DoubleSide }), { ink: '#2b2130', inkW: 1.2 });
      top.position.y = 1.2; g.add(top);
      const bot = K3D.mesh(new T.ConeGeometry(8, 1.6, 48, 1, true).rotateX(Math.PI), K3D.toon('#b9bfcf', { side: T.DoubleSide }), { ink: '#2b2130', inkW: 1.2 });
      bot.position.y = -0.8; g.add(bot);
      const rim = K3D.mesh(new T.TorusGeometry(8, 0.45, 12, 64).rotateX(Math.PI / 2), PAGEAR.foilMat(), { ink: '#4a5060', inkW: 1 });
      g.add(rim);
      // little lights round the rim
      const lights = [];
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        const l = new T.Mesh(K3D.geo('paSaucerLight', () => new T.SphereGeometry(0.32, 10, 8)), K3D.flat(i % 2 ? '#ff6a8a' : '#7dffea'));
        l.position.set(Math.cos(a) * 8.4, 0, Math.sin(a) * 8.4); g.add(l); lights.push(l);
      }
      // the cellophane dome, with a paper alien pilot sitting inside
      const dome = new T.Mesh(new T.SphereGeometry(3.4, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2), PAGEAR.cellophane('#c8f5ff'));
      dome.position.y = 2.2; dome.renderOrder = 20; g.add(dome);
      const pilotTex = K3D.paint('paPilot', 256, 256, (c, w, h) => { c.drawImage(PAALIEN.paint('grunt', 0, 256, 276), 0, 0, 256, 256); });
      const pilot = new T.Mesh(new T.PlaneGeometry(3, 3).translate(0, 1.5, 0), K3D.toon('#ffffff', { map: pilotTex, transparent: true, alphaTest: 0.5, side: T.DoubleSide }));
      pilot.position.set(0, 2.0, 0); g.add(pilot);
      // the cone of yellow tissue light under it
      const coneTex = K3D.paint('paTissueCone', 64, 256, (c, w, h) => {
        const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,236,120,0.75)'); gr.addColorStop(1, 'rgba(255,236,120,0.08)');
        c.fillStyle = gr; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 2; for (let x = 4; x < w; x += 9) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 3, h); c.stroke(); }
      });
      const cone = new T.Mesh(new T.CylinderGeometry(3, 11, 26, 40, 1, true).translate(0, -13, 0), K3D.flat('#ffffff', { map: coneTex, transparent: true, depthWrite: false, side: T.DoubleSide, add: true }));
      cone.position.y = -1.3; g.add(cone);
      // the concertina stalk: a folded paper zigzag from the page up to the underside (only its top shows: it is far)
      const stalk = new T.Group(); g.add(stalk);
      for (let i = 0; i < 26; i++) {
        const f = new T.Mesh(K3D.geo('paStalkFold', () => new T.BoxGeometry(1.8, 0.05, 1.8)), K3D.mat('paStalkM' + (i % 2), () => K3D.toon(i % 2 ? '#e8e2d2' : '#c9c0aa')));
        f.position.set(0, -2 - i * 1.5, 0); f.rotation.set(i % 2 ? 0.5 : -0.5, 0, 0); stalk.add(f);
      }
      g.userData.update = (t) => {
        g.rotation.y = t * 0.15;
        for (const [i, l] of lights.entries()) l.visible = Math.sin(t * 4 + i * 0.8) > -0.2;
        cone.material.opacity = 0.55 + Math.sin(t * 2.3) * 0.15;
        pilot.rotation.y = -g.rotation.y + Math.sin(t * 0.7) * 0.4;
      };
      g.userData.cone = cone;
      return g;
    },
  };
})();
