/* Pip & Bo - World 37 Medieval Tournament: Pip and Bo's level outfits (loads before the World 37 kit and levels). */
'use strict';

/* The only global here is TOURNEY_OUTFITS. Gavyn's rule (2026-11-12): Pip and Bo wear an outfit unique to each level
   where it fits. This file is kept apart from the levels on purpose, so a shared outfit system can take these four over
   later without touching any level: every World 37 level, preview, win pose and HUD chip draws its heroes through
   TOURNEY_OUTFITS.draw, and nothing in here reads G, the game canvas or level state (it is a pure function of its
   arguments, so the world-page previews can use it too).

   TOURNEY_OUTFITS.draw(c, id, outfit, o, body)
     c        a 2D context (the game's ctx, or a preview's v.ctx)
     id       0 Pip (always orange with a sun crest), 1 Bo (always blue with a moon crest)
     outfit   'livery' (37-1 royal coach livery), 'borrowed' (37-2 the overslept knight's armour, shared badly),
              'engineer' (37-3 siege engineers), 'champion' (37-4 full tournament champions), or null (plain)
     o        x, y      feet of the hero
              s         scale (1 = the game's 22 x 26 body; previews pass 0.6 or so)
              bw, bh    the plain body's size at scale 1 (game 22 x 26, previews 20 x 24)
              face      1 facing right, -1 left
              t         a clock in seconds (for flapping, bobbing)
              v         0..1 how fast the hero is moving (feathers, capes, ribbons and ropes trail with speed)
              rot       radians, around the middle of the body
              sq        squash for ducking (0..1: flatter)
              arms      null | 'fwd' (reaching ahead) | 'up' (both up) | 'reins' (hands low and forward) | 'push'
                        (both arms forward at chest height) | 'hold' (one arm up, holding something overhead)
              prop      the small role prop that changes hands between stretches:
                        livery: 'gauntlets' (the driver) | 'rope' (the roof hero, a rope tied round the waist)
                        borrowed: 'lance' (lancer: a small buckler on the back) | 'spur' (rider: the knight's one spur)
                        engineer: 'straps' (the pusher's padded shoulder straps) | 'hide' (the tower hero's wet hide)
              straw     0..1 straw sticking out after a tumble into hay (livery and borrowed)
              askew     radians the hat or helm sits crooked (a Bonk in 37-2)
              visor     0..1 how far the visor is down (borrowed: Bo's great helm; champion: both)
              soot      0..1 soot smudges (engineer; builds through 37-3)
              dent      true: a dented hat with circling stars (a Knock in 37-3)
              arrows    0..3 arrows stuck in the hat (engineer)
              wobble    0..1 champion damage: plumes droop and ribbons tear as Wobble rises
              helmOff   true: no helm (it was spun off by a High Perfect: draw it flying with TOURNEY_OUTFITS.helm)
              backwards true: the helm is on backwards (the round's loser, sitting in the hay)
              laurel    true: a laurel wreath over the helm (the match winner)
              dizzy     true: crossed-out eyes on the body, with stars
     body     () => draws the plain Pip or Bo with feet at (0, 0) in the current transform, at scale 1, facing o.face.
              In the game: () => K.hero(id, 0, 0, { face }); in a preview: () => v.hero(id, 0, 0, { face, s: 1 }).
   TOURNEY_OUTFITS.helm(c, id, x, y, s, rot, o)   just the champion's helm on its own (spinning off), centred at x, y.
   TOURNEY_OUTFITS.crest(c, id, x, y, r)          the sun (Pip) or moon (Bo) crest, centred at x, y.
   TOURNEY_OUTFITS.COL                            the colours: per hero main, dark, trim, metal. */
const TOURNEY_OUTFITS = (() => {
  const TAU = Math.PI * 2;
  const COL = {
    // Pip: orange and gold; Bo: blue and silver
    main: ['#ff7a2a', '#3a6ee8'], dark: ['#b8461a', '#1e3e96'], light: ['#ffb066', '#8fb4ff'],
    trim: ['#ffc53d', '#dfe6f2'], trimDark: ['#b9850f', '#8a96aa'],
    steel: '#c8d0dc', steelHi: '#f2f6fb', steelDark: '#6e7888', leather: '#8a5a32', leatherDark: '#5a3418',
    white: '#f8f4ea', straw: '#f2d36b', strawDark: '#c8a23a', soot: 'rgba(30,26,34,0.55)',
  };
  const circ = (c, x, y, r) => { c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); };
  const rrect = (c, x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  };
  const hsh = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

  // the sun (Pip) or the crescent moon (Bo)
  function crest(c, id, x, y, r) {
    c.save(); c.translate(x, y);
    if (id === 0) {
      c.fillStyle = '#ffd23a'; c.strokeStyle = '#b9850f'; c.lineWidth = Math.max(0.6, r * 0.14);
      c.beginPath();
      for (let k = 0; k < 16; k++) { const a = k * TAU / 16, rr = k % 2 ? r * 0.62 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffec8a'; circ(c, 0, 0, r * 0.45); c.fill();
    } else {
      c.fillStyle = '#eef3ff'; c.strokeStyle = '#8a96aa'; c.lineWidth = Math.max(0.6, r * 0.14);
      c.beginPath(); c.arc(0, 0, r, Math.PI * 0.25, Math.PI * 1.75, false); c.arc(r * 0.42, 0, r * 0.78, Math.PI * 1.62, Math.PI * 0.38, true); c.closePath(); c.fill(); c.stroke();
    }
    c.restore();
  }
  // a trailing ribbon / feather / rope: a wavy strip from (x, y) back the way the hero is not facing
  function trail(c, x, y, len, wid, col, back, t, v, droop, ph) {
    const n = 6, segs = [];
    for (let k = 0; k <= n; k++) {
      const u = k / n, wave = Math.sin(t * (8 + v * 10) - u * 4 + (ph || 0)) * (1 + v * 2.5) * u;
      segs.push([x + back * len * u * (0.35 + v * 0.65), y + u * len * (droop + (1 - v) * 0.5) * 0.6 + wave]);
    }
    c.strokeStyle = col; c.lineWidth = wid; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); segs.forEach((p, k) => (k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
    c.lineCap = 'butt'; c.lineJoin = 'miter';
  }
  // a plume of feathers on a crest, trailing back with speed (droop 0..1 when damaged)
  function plume(c, x, y, cols, len, back, t, v, droop) {
    for (let k = 0; k < cols.length; k++) {
      const a = -Math.PI / 2 + back * (0.5 + v * 0.7 + droop * 0.9) + (k - (cols.length - 1) / 2) * 0.22 + Math.sin(t * (6 + v * 8) + k) * (0.05 + v * 0.08);
      const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len + droop * len * 0.35;
      c.fillStyle = cols[k]; c.beginPath(); c.moveTo(x - 1.5, y);
      c.quadraticCurveTo((x + ex) / 2 + back * 3, (y + ey) / 2 - 4, ex, ey);
      c.quadraticCurveTo((x + ex) / 2 - back * 1, (y + ey) / 2 + 1, x + 1.5, y);
      c.closePath(); c.fill();
    }
  }
  function stars(c, x, y, t, n = 3) {
    for (let i = 0; i < n; i++) {
      const a = t * 7 + i * TAU / n, sx = x + Math.cos(a) * 11, sy = y + Math.sin(a) * 3;
      c.fillStyle = '#ffd23a'; c.beginPath();
      for (let k = 0; k < 10; k++) { const b = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 1.2 : 2.8; c.lineTo(sx + Math.cos(b) * r, sy + Math.sin(b) * r); }
      c.closePath(); c.fill();
    }
  }
  function strawBits(c, bw, bh, t, amt, seed) {
    c.strokeStyle = COL.straw; c.lineWidth = 1.3;
    const n = Math.round(4 + amt * 6);
    c.beginPath();
    for (let k = 0; k < n; k++) {
      const u = hsh(k + seed), x = (u - 0.5) * bw, y = -bh * (0.15 + hsh(k * 3 + seed) * 0.85), a = (hsh(k * 7 + seed) - 0.5) * 2.2 + Math.sin(t * 3 + k) * 0.1, l = 4 + hsh(k * 11) * 5;
      c.moveTo(x, y); c.lineTo(x + Math.cos(a - Math.PI / 2) * l, y + Math.sin(a - Math.PI / 2) * l);
    }
    c.stroke();
  }
  // simple stubby arms (the body has none of its own), drawn over the clothes
  function arms(c, id, kind, bw, bh, face, col, dark, glove) {
    if (!kind) return;
    const sh = -bh * 0.48, L = 9;
    const ends = {
      fwd: [[face * 5, sh - 2, face * (bw / 2 + L), sh + 1], [-face * 4, sh, face * (bw / 2 + L - 3), sh + 4]],
      up: [[-bw / 2 + 2, sh, -bw / 2 - 4, sh - L - 6], [bw / 2 - 2, sh, bw / 2 + 4, sh - L - 6]],
      reins: [[face * 4, sh, face * (bw / 2 + 7), sh + 7], [-face * 4, sh, face * (bw / 2 + 4), sh + 9]],
      push: [[face * 3, sh - 1, face * (bw / 2 + 8), sh - 2], [-face * 3, sh + 2, face * (bw / 2 + 7), sh + 2]],
      hold: [[-bw / 2 + 2, sh, -bw / 2 + 1, sh - L - 9], [bw / 2 - 2, sh, bw / 2 - 1, sh - L - 9]],
    }[kind];
    if (!ends) return;
    for (const [x0, y0, x1, y1] of ends) {
      c.strokeStyle = dark; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      c.strokeStyle = col; c.lineWidth = 3.4; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      if (glove) { c.fillStyle = glove; circ(c, x1, y1, 3.4); c.fill(); c.strokeStyle = COL.leatherDark; c.lineWidth = 0.9; c.stroke(); }
      else { c.fillStyle = col; circ(c, x1, y1, 2.4); c.fill(); }
    }
    c.lineCap = 'butt';
  }
  // the lower-body garment: a rounded panel over the bottom of the blob (the body itself is the head too)
  function coat(c, bw, bh, top, col, dark) {
    c.fillStyle = col; c.strokeStyle = dark; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-bw / 2 - 0.5, -bh * top + 3); c.quadraticCurveTo(0, -bh * top - 2, bw / 2 + 0.5, -bh * top + 3);
    c.lineTo(bw / 2 + 0.5, -5); c.quadraticCurveTo(bw / 2 + 0.5, 0, bw / 2 - 5, 0); c.lineTo(-bw / 2 + 5, 0); c.quadraticCurveTo(-bw / 2 - 0.5, 0, -bw / 2 - 0.5, -5);
    c.closePath(); c.fill(); c.stroke();
  }

  /* ---------- 37-1 royal coach livery ---------- */
  function liveryBack(c, id, o, bw, bh, back) {
    // Bo: the long moon-tipped cap feather streams back in the wind
    if (id === 1) {
      const v = o.v || 0, x = -back * -2, y = -bh - 3;
      trail(c, x, y, 26, 3.4, '#eef3ff', back, o.t, Math.max(0.25, v), 0.2, 0);
      trail(c, x, y + 0.5, 24, 1.4, '#9fb8e6', back, o.t, Math.max(0.25, v), 0.2, 0.2);
      const tipX = x + back * 26 * (0.35 + Math.max(0.25, v) * 0.65), tipY = y + 26 * (0.2 + (1 - Math.max(0.25, v)) * 0.5) * 0.6 + Math.sin(o.t * (8 + v * 10) - 4) * (1 + v * 2.5);
      crest(c, 1, tipX, tipY, 3.2);
    }
    // the roof hero's rope trails behind (purely for looks)
    if (o.prop === 'rope') trail(c, -back * -2, -bh * 0.3, 30, 2.2, '#d8b878', back, o.t, Math.max(0.3, o.v || 0), 0.9, 1);
  }
  function liveryFront(c, id, o, bw, bh, face) {
    const t = o.t;
    if (id === 0) {
      // the orange footman's coat with gold braid and brass buttons, white stockings
      c.fillStyle = COL.white; c.fillRect(-bw / 2 + 3, -4, 5, 4); c.fillRect(bw / 2 - 8, -4, 5, 4);
      coat(c, bw, bh, 0.46, '#ff8a2a', '#a8441a');
      c.strokeStyle = COL.trim[0]; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(-bw / 2 + 1, -bh * 0.4); c.lineTo(-bw / 2 + 1, -5); c.moveTo(bw / 2 - 1, -bh * 0.4); c.lineTo(bw / 2 - 1, -5); c.stroke();
      for (let k = 0; k < 3; k++) { c.strokeStyle = COL.trim[0]; c.lineWidth = 1; c.beginPath(); c.moveTo(-4, -bh * 0.38 + k * 3.4); c.lineTo(4, -bh * 0.38 + k * 3.4); c.stroke(); }
      c.fillStyle = '#e0a02a'; for (let k = 0; k < 3; k++) { circ(c, face * 5.5, -bh * 0.38 + k * 3.4, 1.1); c.fill(); }
      // the coachman's tricorn with a sun cockade, slipping over one eye
      const slip = 0.12 + 0.1 * Math.sin(t * 1.3);
      c.save(); c.translate(0, -bh + 1); c.rotate(face * slip + (o.askew || 0));
      c.fillStyle = '#2a2236'; c.strokeStyle = '#120e1a'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-13, 1); c.quadraticCurveTo(-11, -8, -4, -9); c.quadraticCurveTo(0, -12, 4, -9); c.quadraticCurveTo(11, -8, 13, 1); c.quadraticCurveTo(0, -3, -13, 1); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = COL.trim[0]; c.lineWidth = 1.1; c.beginPath(); c.moveTo(-12, 0); c.quadraticCurveTo(0, -4, 12, 0); c.stroke();
      crest(c, 0, face * 6, -4, 3.4);
      c.restore();
    } else {
      // the blue postilion's jacket with silver frogging and tall riding boots
      c.fillStyle = '#2a1e16'; rrect(c, -bw / 2 + 2, -7, 7, 7, 2); c.fill(); rrect(c, bw / 2 - 9, -7, 7, 7, 2); c.fill();
      c.fillStyle = '#5a3c26'; c.fillRect(-bw / 2 + 2, -7, 7, 1.5); c.fillRect(bw / 2 - 9, -7, 7, 1.5);
      coat(c, bw, bh, 0.46, '#3266d8', '#183c8e');
      c.fillStyle = 'rgba(0,0,0,0)';
      c.strokeStyle = '#e8eef8'; c.lineWidth = 1.1;
      for (let k = 0; k < 3; k++) { const y = -bh * 0.38 + k * 3.4; c.beginPath(); c.moveTo(-6, y); c.quadraticCurveTo(-3, y - 1.4, 0, y); c.quadraticCurveTo(3, y + 1.4, 6, y); c.stroke(); }
      c.fillStyle = '#e8eef8'; circ(c, -6.5, -bh * 0.38 + 3.4, 1); c.fill(); circ(c, 6.5, -bh * 0.38 + 3.4, 1); c.fill();
      // the round postilion cap (the feather is drawn behind)
      c.save(); c.translate(0, -bh + 1); c.rotate(o.askew || 0);
      c.fillStyle = '#1e3e96'; c.strokeStyle = '#10245e'; c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(0, -1, 10, 6.5, 0, Math.PI, TAU); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#2a1e16'; c.beginPath(); c.ellipse(face * 6, 0.5, 8, 2, 0, 0, TAU); c.fill();
      c.fillStyle = '#dfe6f2'; c.fillRect(-10, -1.6, 20, 1.6);
      crest(c, 1, -face * 3, -4, 2.6);
      c.restore();
    }
    arms(c, id, o.arms, bw, bh, face, id === 0 ? '#ff8a2a' : '#3266d8', id === 0 ? '#a8441a' : '#183c8e', o.prop === 'gauntlets' ? '#7a4a26' : null);
    if (o.prop === 'gauntlets' && !o.arms) {
      // oversized leather driving gauntlets hanging at the sides
      for (const d of [-1, 1]) { c.fillStyle = '#7a4a26'; c.strokeStyle = COL.leatherDark; c.lineWidth = 1; rrect(c, d * (bw / 2 + 1) - 4, -bh * 0.36, 8, 9, 3); c.fill(); c.stroke(); }
    }
    if (o.prop === 'rope') { c.strokeStyle = '#d8b878'; c.lineWidth = 2; c.beginPath(); c.moveTo(-bw / 2, -bh * 0.3); c.lineTo(bw / 2, -bh * 0.3 + 1); c.stroke(); c.fillStyle = '#c8a060'; circ(c, -face * 4, -bh * 0.3, 2); c.fill(); }
    if (o.straw) strawBits(c, bw, bh, t, o.straw, id * 13);
  }

  /* ---------- 37-2 the overslept knight's borrowed armour ---------- */
  function borrowedBack(c, id, o, bw, bh, back) {
    if (id === 1) {
      // the great helm's tall blue plume (trailing with speed)
      const tilt = o.askew || 0;
      c.save(); c.translate(0, -bh - 8); c.rotate(tilt);
      plume(c, 0, -8, ['#2f5fc4', '#5b95ff', '#2f5fc4'], 18, back, o.t, Math.max(0.2, o.v || 0), 0);
      c.restore();
    }
    // the lancer's small buckler on the back
    if (o.prop === 'lance') {
      c.fillStyle = id === 0 ? '#ff8a2a' : '#3a6ee8'; c.strokeStyle = COL.steelDark; c.lineWidth = 1.2;
      circ(c, back * (bw / 2 - 1), -bh * 0.42, 6.5); c.fill(); c.stroke();
      c.fillStyle = COL.steel; circ(c, back * (bw / 2 - 1), -bh * 0.42, 2); c.fill();
    }
  }
  function borrowedFront(c, id, o, bw, bh, face) {
    const t = o.t;
    if (id === 0) {
      // an orange padded jacket under the knight's far-too-big breastplate
      coat(c, bw, bh, 0.5, '#ff9a4a', '#b8541a');
      c.strokeStyle = 'rgba(160,70,20,0.5)'; c.lineWidth = 0.8;
      for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-bw / 2 + 1, -bh * 0.42 + k * 4); c.lineTo(bw / 2 - 1, -bh * 0.42 + k * 4); c.stroke(); }
      const g = c.createLinearGradient(-bw / 2, 0, bw / 2, 0); g.addColorStop(0, COL.steelDark); g.addColorStop(0.4, COL.steelHi); g.addColorStop(1, COL.steel);
      c.fillStyle = g; c.strokeStyle = '#4a5260'; c.lineWidth = 1.4;
      // (too wide and too low: it hangs off both sides)
      c.beginPath(); c.moveTo(-bw / 2 - 5, -bh * 0.5); c.quadraticCurveTo(0, -bh * 0.62, bw / 2 + 5, -bh * 0.5); c.lineTo(bw / 2 + 3, -2); c.quadraticCurveTo(0, 3, -bw / 2 - 3, -2); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-2, -bh * 0.52); c.lineTo(-1, -4); c.stroke();
      c.fillStyle = '#7a4a26'; c.fillRect(-bw / 2 - 4, -bh * 0.5 + 2, 3, 3); c.fillRect(bw / 2 + 1, -bh * 0.5 + 2, 3, 3);
      crest(c, 0, face * 2, -bh * 0.3, 3);
      // a cooking pot strapped on as a helmet: the handle is the crest
      c.save(); c.translate(0, -bh + 2); c.rotate((o.askew || 0) + Math.sin(t * 9) * 0.02);
      c.fillStyle = '#5a5e68'; c.strokeStyle = '#2a2e36'; c.lineWidth = 1.3;
      rrect(c, -10, -9, 20, 10, 2.5); c.fill(); c.stroke();
      c.fillStyle = '#7a7e88'; c.fillRect(-11.5, -10, 23, 2.5); c.strokeRect(-11.5, -10, 23, 2.5);
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(-7, -7, 3, 6);
      c.strokeStyle = '#2a2e36'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-face * 2, -10); c.lineTo(-face * 2 - face * 3, -16); c.lineTo(-face * 2 + face * 4, -16); c.stroke();
      c.fillStyle = '#ffc53d'; circ(c, -face * 2 - face * 3, -16, 1.4); c.fill();
      // the chin strap
      c.strokeStyle = '#7a4a26'; c.lineWidth = 1; c.beginPath(); c.moveTo(-9, 0); c.quadraticCurveTo(0, 12, 9, 0); c.stroke();
      c.restore();
    } else {
      // a blue quilted gambeson with mismatched elbow plates
      coat(c, bw, bh, 0.5, '#3a6ee8', '#1e3e96');
      c.strokeStyle = 'rgba(200,220,255,0.45)'; c.lineWidth = 0.8;
      for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * 4, -bh * 0.48); c.lineTo(k * 4 + 1, -2); c.stroke(); }
      for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-bw / 2 + 1, -bh * 0.4 + k * 4); c.lineTo(bw / 2 - 1, -bh * 0.4 + k * 4); c.stroke(); }
      c.fillStyle = COL.steel; c.strokeStyle = '#4a5260'; c.lineWidth = 1;
      c.beginPath(); c.ellipse(-bw / 2, -bh * 0.36, 4, 3, 0.3, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#c89a4a'; c.beginPath(); c.ellipse(bw / 2, -bh * 0.33, 3, 4.5, -0.3, 0, TAU); c.fill(); c.stroke();
      crest(c, 1, face * 2, -bh * 0.22, 3);
      // the knight's real great helm, far too big, visor dropping at bumps
      c.save(); c.translate(0, -bh * 0.58); c.rotate(o.askew || 0);
      const hw = bw + 6, hh = bh * 0.72;
      const g = c.createLinearGradient(-hw / 2, 0, hw / 2, 0); g.addColorStop(0, COL.steelDark); g.addColorStop(0.35, COL.steelHi); g.addColorStop(1, COL.steel);
      // Bo's round ears poke out over the too-big helm (cut-outs the knight never needed)
      c.fillStyle = '#3a6ee8'; c.strokeStyle = '#1c3a8a'; c.lineWidth = 1.2;
      for (const d of [-1, 1]) { circ(c, d * (hw / 2 - 2), -hh * 0.78, 4.4); c.fill(); c.stroke(); }
      c.fillStyle = g; c.strokeStyle = '#3a424e'; c.lineWidth = 1.5;
      rrect(c, -hw / 2, -hh * 0.78, hw, hh, 5); c.fill(); c.stroke();
      // the eye slit and breaths, the visor falls over the slit
      const vis = clamp01(o.visor || 0);
      c.fillStyle = '#1c1a36'; c.fillRect(-hw / 2 + 3, -hh * 0.3, hw - 6, 3);
      if (vis > 0.05) { c.fillStyle = COL.steel; c.fillRect(-hw / 2 + 2, -hh * 0.3 - 1 + (1 - vis) * -6, hw - 4, 5 * vis); c.strokeRect(-hw / 2 + 2, -hh * 0.3 - 1 + (1 - vis) * -6, hw - 4, 5 * vis); }
      c.fillStyle = '#1c1a36'; for (let k = 0; k < 3; k++) { circ(c, face * (3 + k * 3), hh * 0.08, 0.8); c.fill(); }
      c.strokeStyle = 'rgba(58,66,78,0.7)'; c.beginPath(); c.moveTo(0, -hh * 0.78); c.lineTo(0, hh * 0.2); c.stroke();
      c.fillStyle = '#3a6ee8'; c.fillRect(-2, -hh * 0.78 - 4, 4, 4);
      c.restore();
    }
    arms(c, id, o.arms, bw, bh, face, id === 0 ? '#ff9a4a' : '#3a6ee8', id === 0 ? '#b8541a' : '#1e3e96', null);
    // the rider wears the knight's one spur
    if (o.prop === 'spur') {
      c.strokeStyle = '#d8c070'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-face * (bw / 2 - 3), -2); c.lineTo(-face * (bw / 2 + 3), -1); c.stroke();
      c.save(); c.translate(-face * (bw / 2 + 4), -1); c.rotate(t * 6);
      c.strokeStyle = '#ffc53d'; c.lineWidth = 1; c.beginPath(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; c.moveTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6); c.lineTo(-Math.cos(a) * 2.6, -Math.sin(a) * 2.6); } c.stroke();
      c.restore();
    }
    if (o.straw) strawBits(c, bw, bh, t, o.straw, id * 17 + 5);
  }

  /* ---------- 37-3 siege engineers ---------- */
  function engineerBack(c, id, o, bw, bh, back) {
    if (id === 1 && o.prop !== 'hide') { /* the hood is drawn in front */ }
    if (o.prop === 'hide') {
      // the wet hide over one shoulder
      c.fillStyle = '#9a6a42'; c.strokeStyle = '#5a3c22'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(back * 2, -bh * 0.72); c.quadraticCurveTo(back * (bw / 2 + 8), -bh * 0.6, back * (bw / 2 + 7), -bh * 0.12); c.lineTo(back * (bw / 2 - 1), -bh * 0.18); c.quadraticCurveTo(back * (bw / 2), -bh * 0.5, back * 2, -bh * 0.58); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(160,210,255,0.6)'; circ(c, back * (bw / 2 + 5), -bh * 0.08 + ((o.t * 40) % 6), 1); c.fill();
    }
  }
  function engineerFront(c, id, o, bw, bh, face) {
    const t = o.t;
    if (id === 0) {
      // an orange tunic with rolled sleeves under a leather apron, a mallet through the belt
      coat(c, bw, bh, 0.5, '#ff8a3a', '#b8541a');
      c.fillStyle = '#9a6a3a'; c.strokeStyle = '#5a3418'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-bw / 2 + 4, -bh * 0.44); c.lineTo(bw / 2 - 4, -bh * 0.44); c.lineTo(bw / 2 - 2, -1); c.lineTo(-bw / 2 + 2, -1); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#5a3418'; c.lineWidth = 1; c.beginPath(); c.moveTo(-bw / 2 + 4, -bh * 0.44); c.lineTo(-3, -bh * 0.7); c.moveTo(bw / 2 - 4, -bh * 0.44); c.lineTo(3, -bh * 0.7); c.stroke();
      c.fillStyle = '#4a2a14'; c.fillRect(-bw / 2, -bh * 0.27, bw, 2.2);
      // the mallet
      c.fillStyle = '#c89a6a'; c.fillRect(-face * (bw / 2 - 1) - 1, -bh * 0.38, 2, 10);
      c.fillStyle = '#8a5a32'; rrect(c, -face * (bw / 2 - 1) - 4, -bh * 0.44, 8, 4.5, 1.5); c.fill();
      crest(c, 0, face * 1, -bh * 0.36, 2.6);
      // the wide-brimmed kettle hat (dented and starry after a Knock, arrows stuck in it)
      c.save(); c.translate(0, -bh + 2); c.rotate((o.askew || 0) + (o.dent ? -0.15 : 0));
      c.fillStyle = '#8a929e'; c.strokeStyle = '#3a424e'; c.lineWidth = 1.3;
      c.beginPath(); c.ellipse(0, 0, 15, 3.2, 0, 0, TAU); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-8, 0); c.quadraticCurveTo(-8, -10, 0, -10); c.quadraticCurveTo(8, -10, 8, 0); c.closePath(); c.fill(); c.stroke();
      if (o.dent) { c.fillStyle = '#5a626e'; c.beginPath(); c.moveTo(-3, -10); c.quadraticCurveTo(0, -5, 3, -10); c.closePath(); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(-5, -8, 2, 6);
      c.fillStyle = '#ff8a2a'; c.fillRect(-8, -3, 16, 2);
      for (let k = 0; k < Math.min(3, o.arrows || 0); k++) { const ax = -6 + k * 6, aa = -0.5 + k * 0.4; c.strokeStyle = '#6a4a2a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(ax, -6); c.lineTo(ax + Math.sin(aa) * 10, -6 - Math.cos(aa) * 10); c.stroke(); c.fillStyle = '#f2f2f2'; c.fillRect(ax + Math.sin(aa) * 10 - 1.5, -6 - Math.cos(aa) * 10 - 1.5, 3, 3); }
      c.restore();
    } else {
      // a blue hooded mantle (hood up), a chain-mail collar, thick fire gloves and a coil of rope across the chest
      coat(c, bw, bh, 0.52, '#2f5fc4', '#163a86');
      c.strokeStyle = '#c8a060'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-bw / 2 + 1, -bh * 0.5); c.lineTo(bw / 2 - 2, -3); c.stroke();
      c.strokeStyle = '#a07a40'; c.lineWidth = 0.8; for (let k = 1; k < 6; k++) { const u = k / 6, x = -bw / 2 + 1 + (bw - 3) * u, y = -bh * 0.5 + (bh * 0.5 - 3) * u; c.beginPath(); c.moveTo(x - 1.5, y - 1); c.lineTo(x + 1.5, y + 1); c.stroke(); }
      c.fillStyle = '#9aa2ae'; rrect(c, -bw / 2 + 1, -bh * 0.56, bw - 2, 4.5, 2); c.fill();
      c.fillStyle = '#6e7888'; for (let k = 0; k < 6; k++) { circ(c, -bw / 2 + 3 + k * (bw - 6) / 5, -bh * 0.56 + 2.2, 0.8); c.fill(); }
      crest(c, 1, -face * 4, -bh * 0.3, 2.6);
      // the hood: up over the head, the face peeking out of the front
      c.save(); c.rotate(o.askew || 0);
      c.fillStyle = '#2f5fc4'; c.strokeStyle = '#163a86'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(-bw / 2 - 1.5, -bh * 0.52);
      c.quadraticCurveTo(-bw / 2 - 3, -bh - 6, -face * 2, -bh - 7);
      c.quadraticCurveTo(-face * -9, -bh - 6, bw / 2 + 1.5, -bh * 0.52);
      c.lineTo(bw / 2 - 2, -bh * 0.52); c.quadraticCurveTo(bw / 2 - 2, -bh + 2, 0, -bh + 1); c.quadraticCurveTo(-bw / 2 + 2, -bh + 2, -bw / 2 + 2, -bh * 0.52);
      c.closePath(); c.fill(); c.stroke();
      // the hood's point flops back
      c.beginPath(); c.moveTo(-face * 4, -bh - 6); c.quadraticCurveTo(-face * 12, -bh - 6, -face * 14, -bh + 2 + Math.sin(t * 4) * 1.2); c.quadraticCurveTo(-face * 9, -bh - 2, -face * 2, -bh - 4); c.closePath(); c.fill(); c.stroke();
      if (o.dent) { c.fillStyle = '#163a86'; c.beginPath(); c.ellipse(0, -bh - 4, 4, 2, 0, 0, TAU); c.fill(); }
      for (let k = 0; k < Math.min(3, o.arrows || 0); k++) { const ax = -6 + k * 6, aa = -0.6 + k * 0.5; c.strokeStyle = '#6a4a2a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(ax, -bh - 3); c.lineTo(ax + Math.sin(aa) * 10, -bh - 3 - Math.cos(aa) * 10); c.stroke(); c.fillStyle = '#f2f2f2'; c.fillRect(ax + Math.sin(aa) * 10 - 1.5, -bh - 3 - Math.cos(aa) * 10 - 1.5, 3, 3); }
      c.restore();
    }
    const glove = id === 1 ? '#c8a46a' : null;
    arms(c, id, o.arms, bw, bh, face, id === 0 ? '#ff8a3a' : '#2f5fc4', id === 0 ? '#b8541a' : '#163a86', glove);
    if (id === 1 && !o.arms) for (const d of [-1, 1]) { c.fillStyle = '#c8a46a'; c.strokeStyle = '#7a5a2a'; c.lineWidth = 1; rrect(c, d * (bw / 2) - 3.5, -bh * 0.34, 7, 8, 3); c.fill(); c.stroke(); }
    // the pusher's padded shoulder straps
    if (o.prop === 'straps') {
      c.fillStyle = '#7a5030'; c.strokeStyle = '#4a2a14'; c.lineWidth = 1;
      for (const d of [-1, 1]) { rrect(c, d * (bw / 2 - 3) - 3, -bh * 0.56, 6, 4, 2); c.fill(); c.stroke(); }
      c.strokeStyle = '#7a5030'; c.lineWidth = 2; c.beginPath(); c.moveTo(-bw / 2 + 3, -bh * 0.52); c.lineTo(bw / 2 - 5, -bh * 0.14); c.moveTo(bw / 2 - 3, -bh * 0.52); c.lineTo(-bw / 2 + 5, -bh * 0.14); c.stroke();
    }
    // soot smudges that build up through the level
    if (o.soot) {
      c.fillStyle = COL.soot; c.globalAlpha *= clamp01(o.soot);
      for (let k = 0; k < 6; k++) { const x = (hsh(k + id * 9) - 0.5) * bw * 0.8, y = -bh * (0.1 + hsh(k * 5 + id) * 0.75); c.beginPath(); c.ellipse(x, y, 2.4 + hsh(k) * 2, 1.4 + hsh(k + 3), hsh(k + 8) * 3, 0, TAU); c.fill(); }
      c.globalAlpha /= clamp01(o.soot) || 1;
    }
  }

  /* ---------- 37-4 full tournament champions ---------- */
  const clamp01 = v => Math.max(0, Math.min(1, v || 0));
  function helm(c, id, x, y, s, rot, o = {}) {
    // a tilting helm centred at (x, y): steel with enamel trim, the crest on top, a visor slit (unless backwards)
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s || 1, s || 1);
    const face = o.face || 1, wob = clamp01(o.wobble), back = -face, t = o.t || 0;
    // crest and plume (behind the helm's dome)
    if (id === 0) {
      // a spray of orange ribbons: they tear as Wobble rises
      const n = 5 - Math.round(wob * 3);
      for (let k = 0; k < n; k++) trail(c, 0, -14, 16 + k * 2, 2, k % 2 ? '#ffc53d' : '#ff7a2a', back, t + k * 0.3, Math.max(0.3, o.v || 0), 0.4 + wob * 0.6, k);
    } else {
      plume(c, 0, -14, ['#3a6ee8', '#dfe6f2', '#3a6ee8', '#dfe6f2'], 20 - wob * 4, back, t, Math.max(0.25, o.v || 0), wob);
    }
    // Bo's round ears stay visible: the helm has two ear-shaped blue enamel rondels poking out of the dome
    if (id === 1) { c.fillStyle = '#3a6ee8'; c.strokeStyle = '#1c3a8a'; c.lineWidth = 1.2; for (const d of [-1, 1]) { circ(c, d * 9.5, -12, 4.4); c.fill(); c.stroke(); } }
    const g = c.createLinearGradient(-12, 0, 12, 0); g.addColorStop(0, COL.steelDark); g.addColorStop(0.35, COL.steelHi); g.addColorStop(1, COL.steel);
    c.fillStyle = g; c.strokeStyle = '#2e3440'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(-11, 9); c.lineTo(-12, -4); c.quadraticCurveTo(-11, -14, 0, -15); c.quadraticCurveTo(11, -14, 12, -4); c.lineTo(11, 9); c.quadraticCurveTo(0, 12, -11, 9); c.closePath(); c.fill(); c.stroke();
    // enamel trim band and the crest
    c.fillStyle = COL.main[id]; c.fillRect(-12, 3, 24, 3); c.strokeRect(-12, 3, 24, 3);
    if (!o.backwards) {
      // the visor: a pointed snout with a slit; it lifts up when open
      const vis = o.visor === undefined ? 1 : clamp01(o.visor);
      c.fillStyle = '#1c1a36'; c.fillRect(face > 0 ? -3 : -10, -5, 13, 2.6);
      c.save(); c.translate(0, -8); c.rotate(-face * (1 - vis) * 0.9);
      c.fillStyle = COL.steel; c.strokeStyle = '#2e3440'; c.lineWidth = 1.1;
      c.beginPath(); c.moveTo(-face * 6, 0); c.lineTo(face * 14, 3); c.lineTo(face * 9, 9); c.lineTo(-face * 6, 7); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#1c1a36'; c.fillRect(face > 0 ? 0 : -12, 2.6, 12, 1.6);
      for (let k = 0; k < 3; k++) { circ(c, face * (3 + k * 3), 6, 0.6); c.fill(); }
      c.restore();
    } else {
      // on backwards: a smooth back plate, the crest at the wrong end
      c.strokeStyle = 'rgba(46,52,64,0.6)'; c.beginPath(); c.moveTo(0, -14); c.lineTo(0, 9); c.stroke();
    }
    crest(c, id, 0, -15, 4.2);
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.ellipse(-4, -8, 2, 4, 0.2, 0, TAU); c.fill();
    if (o.laurel) {
      c.strokeStyle = '#3c8a36'; c.lineWidth = 1.2;
      for (const d of [-1, 1]) for (let k = 0; k < 5; k++) {
        const a = Math.PI + d * (0.3 + k * 0.32), lx = Math.cos(a) * 12 * d * -1, ly = -6 + Math.sin(a) * 10;
        c.fillStyle = k % 2 ? '#5fb84a' : '#3c8a36'; c.beginPath(); c.ellipse(lx, ly, 3.4, 1.6, a + d * 0.6, 0, TAU); c.fill();
      }
      c.fillStyle = '#ffc53d'; circ(c, 0, -10, 1.6); c.fill();
    }
    c.restore();
  }
  function championBack(c, id, o, bw, bh, back) {
    // the surcoat's tails flap behind
    const v = Math.max(0.2, o.v || 0), t = o.t;
    c.fillStyle = id === 0 ? '#ff7a2a' : '#3a6ee8';
    c.beginPath(); c.moveTo(back * 2, -bh * 0.42); c.quadraticCurveTo(back * (bw / 2 + 6 + v * 8), -bh * 0.3 + Math.sin(t * 10) * 2, back * (bw / 2 + 4 + v * 10), -2 + Math.sin(t * 10 + 1) * 2 * v);
    c.lineTo(back * (bw / 2 - 4), 0); c.closePath(); c.fill();
  }
  function championFront(c, id, o, bw, bh, face) {
    const t = o.t, wob = clamp01(o.wobble);
    // polished plate with enamel trim
    const g = c.createLinearGradient(-bw / 2, 0, bw / 2, 0); g.addColorStop(0, COL.steelDark); g.addColorStop(0.4, COL.steelHi); g.addColorStop(1, COL.steel);
    c.fillStyle = g; c.strokeStyle = '#2e3440'; c.lineWidth = 1.4;
    coat(c, bw, bh, 0.56, '#c8d0dc', '#2e3440');
    c.fillStyle = g; c.beginPath(); c.moveTo(-bw / 2 - 0.5, -bh * 0.56 + 3); c.quadraticCurveTo(0, -bh * 0.56 - 2, bw / 2 + 0.5, -bh * 0.56 + 3); c.lineTo(bw / 2 + 0.5, -2); c.lineTo(-bw / 2 - 0.5, -2); c.closePath(); c.fill();
    // the surcoat: a tabard in the hero's colour with the crest
    c.fillStyle = COL.main[id]; c.strokeStyle = COL.dark[id]; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(-bw / 2 + 4, -bh * 0.48); c.lineTo(bw / 2 - 4, -bh * 0.48); c.lineTo(bw / 2 - 3, -1);
    // (a torn hem as Wobble rises)
    for (let k = 4; k >= 0; k--) c.lineTo(-bw / 2 + 3 + k * (bw - 6) / 4, -1 - (k % 2 ? wob * 3 : 0));
    c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = COL.trim[id]; c.lineWidth = 1.2; c.strokeRect(-bw / 2 + 5.5, -bh * 0.46, bw - 11, bh * 0.44);
    crest(c, id, 0, -bh * 0.26, 3.6);
    // pauldrons with enamel edges
    for (const d of [-1, 1]) {
      c.fillStyle = COL.steel; c.strokeStyle = '#2e3440'; c.lineWidth = 1.1;
      c.beginPath(); c.ellipse(d * (bw / 2 - 1), -bh * 0.5, 5, 3.6, d * 0.3, 0, TAU); c.fill(); c.stroke();
      c.strokeStyle = COL.main[id]; c.lineWidth = 1.2; c.beginPath(); c.ellipse(d * (bw / 2 - 1), -bh * 0.5 + 1, 4.4, 2.4, d * 0.3, 0.2, Math.PI - 0.2); c.stroke();
    }
    arms(c, id, o.arms, bw, bh, face, COL.steel, '#2e3440', COL.steelDark);
    // the helm (or the hero's surprised face, or the helm on backwards)
    if (!o.helmOff) helm(c, id, 0, -bh * 0.66, 1, (o.askew || 0) + (o.backwards ? 0.08 : 0), { face, wobble: wob, t, v: o.v, visor: o.visor, backwards: o.backwards, laurel: o.laurel });
  }

  const BACK = { livery: liveryBack, borrowed: borrowedBack, engineer: engineerBack, champion: championBack };
  const FRONT = { livery: liveryFront, borrowed: borrowedFront, engineer: engineerFront, champion: championFront };

  function draw(c, id, outfit, o, body) {
    const s = o.s || 1, face = o.face || 1, back = -face, bw = o.bw || 22, sq = clamp01(o.sq), bh = (o.bh || 26) * (1 - sq * 0.35);
    const oo = Object.assign({ t: 0, v: 0 }, o);
    c.save(); c.translate(o.x || 0, o.y || 0); c.scale(s, s);
    if (o.rot) { c.translate(0, -bh / 2); c.rotate(o.rot); c.translate(0, bh / 2); }
    if (BACK[outfit]) BACK[outfit](c, id, oo, bw, bh, back);
    if (body) { c.save(); if (sq) c.scale(1 + sq * 0.25, 1 - sq * 0.35); body(); c.restore(); }
    if (FRONT[outfit]) FRONT[outfit](c, id, oo, bw * (1 + sq * 0.25), bh, face);
    if (o.dent || o.dizzy) stars(c, 0, -bh - (outfit === 'engineer' ? 14 : 10), oo.t);
    c.restore();
  }
  return { draw, helm, crest, COL };
})();
