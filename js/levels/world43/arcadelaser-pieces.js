/* Pip & Bo - 43-4 Laser Tag Arena: the arena's pieces as things (ARCADELASER_PIECES). Loaded on demand with the 3D kit.
   Display only: the shapes the rules use are ARCADELASER_ARENA's, and every model here stands inside its footprint.

   Every piece of every layout is built once, at the start (the union of the five layouts, keyed by kind, place and
   look), and the pieces of the current layout stand up out of the floor. Between rounds the arena rebuilds in view:
   pieces leaving sink into glowing floor slots while the new ones rise (pieces in both layouts stay put).

   The look of each kind (never a plain block):
     pillar   padded vinyl with stitched seams, a rubber foot, a cap lamp, two neon bands and a glow-tape number
     wall     crates: stencilled prop crates with straps     drums: oil drums, one lying on top
              chain: chain-link on posts, plywood behind it sprayed with glow graffiti
              tyres: stacks of painted tyres                  (the other half's crates are a fake ROCK ARCH, boarded up
              with a painted cave; the other half's drums are a crashed flying-SAUCER prop stuck edge-first in the floor)
     low      sandbags (burlap, stencilled) or striped plastic hazard barriers with reflectors and a lamp
     riser    a striped wall panel in a floor slot: chevrons, glow-tape edges, warning lamps, the pistons showing, and
              a running light strip round the slot for the warning
     start    frosted light panels in the base's own colour in a metal frame
     mirror   a tall panel in a chrome frame with white-gold neon along its edges, splayed feet, fingerprints and a
              DO NOT LEAN sticker; the glass shows a true (cheap) reflection of the hall: one cube camera, refreshed a
              few times a second
     turn     the same mirror on a geared post, light cables across the floor to its two buttons
     button   a big arcade button in the floor, STEP ring, arrows toward its mirror
     prism    a glowing crystal column on a brass foot, rainbow light on the floor round it
     spin     a mirror on the turning centre platform (round 5): a raised disc with chasing rim lights
     pad      a pickup pad: a ring of lights; the canister floats over it while there is one
   ARCADELASER_PIECES.build(K, hall) -> pc; pc.update(K, st, dt, view) */
'use strict';

const ARCADELASER_PIECES = (function () {
  const T = K3D.T, AR = ARCADELASER_ARENA;
  const P = {};
  const INK = ARCADE.INK, R = () => ARCADE.rnd(), pick = a => ARCADE.pick(a);
  const toon = (c, o) => ARCADE.toonM(c, o), flat = (c, k, o) => ARCADE.flatM(c, k, o);
  const mk = (geo, mat, o) => K3D.mesh(geo, mat, Object.assign({ ink: INK, inkW: 0.9 }, o || {}));
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const ROOM = { mag: '#ff5ad6', green: '#5aff8a', cyan: '#4ae8ff', gold: '#fff0b0', violet: '#9a8aff' };
  P.ROOM = ROOM;
  const H_WALL = 1.6, H_PIL = 2.25, H_LOW = 0.52, H_RISE = 1.55, H_START = 1.25;
  P.H = { wall: H_WALL, pillar: H_PIL, low: H_LOW, riser: H_RISE, start: H_START };
  const key = p => p.k + '|' + p.x.toFixed(2) + '|' + p.z.toFixed(2) + '|' + (p.look || '') + '|' + (p.id || '') + '|' + (p.ph != null && p.k === 'spin' ? p.ph.toFixed(2) : '');
  P.key = key;

  /* ---------- painted surfaces ---------- */
  const vinyl = (col, num) => K3D.paint('alp-vinyl|' + col + num, 512, 256, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    // padded panels: soft vertical bulges between stitched seams
    for (let x = 0; x < w; x += 64) {
      const g = c.createLinearGradient(x, 0, x + 64, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.38)'); g.addColorStop(0.45, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.38)');
      c.fillStyle = g; c.fillRect(x, 0, 64, h);
      c.strokeStyle = 'rgba(255,236,200,0.45)'; c.setLineDash([5, 5]); c.lineWidth = 1.5;
      for (const sx of [3, 61]) { c.beginPath(); c.moveTo(x + sx, 0); c.lineTo(x + sx, h); c.stroke(); }
      c.setLineDash([]);
    }
    // scuffs and shoe marks low down, a split taped over, sticker remains
    for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${0.05 + Math.random() * 0.12})`; c.fillRect(Math.random() * w, h * 0.72 + Math.random() * h * 0.28, 4 + Math.random() * 14, 1 + Math.random() * 3); }
    c.fillStyle = '#c8c0a0'; c.save(); c.translate(w * 0.7, h * 0.42); c.rotate(0.5); c.fillRect(-18, -5, 36, 10); c.rotate(-1); c.fillRect(-18, -5, 36, 10); c.restore();
    c.fillStyle = 'rgba(240,230,210,0.5)'; c.fillRect(w * 0.18, h * 0.3, 22, 14); c.fillStyle = 'rgba(240,230,210,0.25)'; c.fillRect(w * 0.18 + 3, h * 0.3 + 14, 16, 5);
    // the glow-tape number, twice round
    c.font = '900 54px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const x of [w * 0.25, w * 0.75]) { c.fillStyle = '#e8ffd8'; c.fillText(num, x, h * 0.55); c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 2; c.strokeText(num, x, h * 0.55); }
  }, { repeat: true });
  const crateTex = v => K3D.paint('alp-crate|' + v, 256, 256, (c, w, h) => {
    const wood = ['#7a5a3a', '#6a4e34', '#86643e', '#5e4430'][v % 4];
    c.fillStyle = wood; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) { c.fillStyle = `rgba(0,0,0,${0.08 + (y / 32 % 2) * 0.06})`; c.fillRect(0, y, w, 30); c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(0, y + 30, w, 2); for (let i = 0; i < 6; i++) { c.strokeStyle = 'rgba(30,18,8,0.25)'; c.beginPath(); const yy = y + 4 + Math.random() * 22; c.moveTo(0, yy); c.bezierCurveTo(w * 0.3, yy + 4, w * 0.6, yy - 4, w, yy + 2); c.stroke(); } }
    // the frame boards and the cross brace
    c.fillStyle = 'rgba(40,24,10,0.45)'; c.fillRect(0, 0, w, 18); c.fillRect(0, h - 18, w, 18); c.fillRect(0, 0, 18, h); c.fillRect(w - 18, 0, 18, h);
    c.save(); c.translate(w / 2, h / 2); c.rotate(Math.PI / 4); c.fillRect(-w * 0.7, -9, w * 1.4, 18); c.restore();
    for (const [x, y] of [[9, 9], [w - 9, 9], [9, h - 9], [w - 9, h - 9]]) { c.fillStyle = '#c8c0b0'; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); }
    // the stencil
    const words = [['ZAP MAZE', 'PROPS'], ['THIS WAY', 'UP'], ['FRAGILE', '(MAYBE)'], ['PLANET', 'X-7'], ['SPARE', 'MOONS']][v % 5];
    c.fillStyle = 'rgba(240,232,210,0.82)'; c.font = '900 34px "DejaVu Sans Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(words[0], w / 2, h * 0.42); c.font = '900 26px "DejaVu Sans Mono", monospace'; c.fillText(words[1], w / 2, h * 0.6);
    if (v % 2) { c.fillStyle = 'rgba(240,232,210,0.7)'; c.beginPath(); c.moveTo(w * 0.82, h * 0.18); c.lineTo(w * 0.9, h * 0.3); c.lineTo(w * 0.74, h * 0.3); c.fill(); c.fillRect(w * 0.8, h * 0.3, w * 0.04, h * 0.1); }
    // a splash of glow paint from the mural painter
    c.fillStyle = pick(['rgba(90,255,138,0.8)', 'rgba(255,90,214,0.8)', 'rgba(154,138,255,0.8)']);
    const sx = Math.random() * w, sy = Math.random() * h * 0.6; c.beginPath(); c.arc(sx, sy, 6 + Math.random() * 8, 0, 7); c.fill(); for (let i = 0; i < 3; i++) c.fillRect(sx - 2 + (Math.random() - 0.5) * 10, sy, 3, 10 + Math.random() * 30);
  });
  const drumTex = col => K3D.paint('alp-drum|' + col, 256, 256, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    for (const y of [h * 0.2, h * 0.5, h * 0.8]) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, y - 6, w, 4); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(0, y - 2, w, 3); }
    // the hazard band, rust drips, dents
    for (let x = -32; x < w; x += 32) { c.fillStyle = '#e8c83a'; c.beginPath(); c.moveTo(x, h * 0.58); c.lineTo(x + 16, h * 0.58); c.lineTo(x + 32, h * 0.7); c.lineTo(x + 16, h * 0.7); c.fill(); }
    for (let i = 0; i < 14; i++) { c.fillStyle = 'rgba(120,60,20,0.45)'; const x = Math.random() * w, y = Math.random() * h * 0.5; c.fillRect(x, y, 3, 10 + Math.random() * 40); }
    c.fillStyle = '#f2ead2'; c.fillRect(w * 0.55, h * 0.28, 70, 34); c.fillStyle = '#2a2430'; c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText('NOT REAL', w * 0.55 + 35, h * 0.28 + 14); c.fillText('FUEL :)', w * 0.55 + 35, h * 0.28 + 27);
  }, { repeat: true });
  const chainTex = () => K3D.paint('alp-chain', 256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.strokeStyle = '#c8ccd4'; c.lineWidth = 3;
    for (let k = -h; k < w + h; k += 22) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + h, h); c.stroke(); c.beginPath(); c.moveTo(k + h, 0); c.lineTo(k, h); c.stroke(); }
  }, { repeat: true });
  const plyTex = v => K3D.paint('alp-ply|' + v, 512, 256, (c, w, h) => {
    c.fillStyle = '#4a3a30'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { c.strokeStyle = 'rgba(20,10,6,0.25)'; c.beginPath(); const y = Math.random() * h; c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + 10, w * 0.7, y - 10, w, y + 4); c.stroke(); }
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(w / 2 - 2, 0, 4, h);
    // glow graffiti: a tag, a smiley, arrows, initials in a heart
    const cols = ['#5aff8a', '#ff5ad6', '#9a8aff', '#fff0b0'];
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = cols[v % 4]; c.lineWidth = 12; c.beginPath(); c.moveTo(40, 170); c.bezierCurveTo(70, 60, 120, 220, 160, 90); c.bezierCurveTo(190, 40, 210, 180, 250, 110); c.stroke();
    c.strokeStyle = cols[(v + 1) % 4]; c.lineWidth = 7; c.beginPath(); c.arc(360, 110, 46, 0, 7); c.stroke(); c.beginPath(); c.arc(360, 118, 26, 0.3, Math.PI - 0.3); c.stroke(); c.fillStyle = cols[(v + 1) % 4]; c.fillRect(342, 88, 9, 14); c.fillRect(370, 88, 9, 14);
    c.fillStyle = cols[(v + 2) % 4]; c.font = '900 30px "DejaVu Sans", sans-serif'; c.fillText(v ? 'ZAP!' : 'P+B?', 300, 220);
    for (let i = 0; i < 12; i++) { c.fillStyle = cols[i % 4]; c.globalAlpha = 0.7; c.fillRect(30 + Math.random() * (w - 60), 30 + Math.random() * (h - 60), 3, 8 + Math.random() * 24); }
    c.globalAlpha = 1;
  });
  const burlap = () => K3D.paint('alp-burlap', 128, 64, (c, w, h) => {
    c.fillStyle = '#9a8a62'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 3) { c.fillStyle = 'rgba(60,46,24,0.25)'; c.fillRect(x, 0, 1, h); }
    for (let y = 0; y < h; y += 3) { c.fillStyle = 'rgba(255,240,200,0.12)'; c.fillRect(0, y, w, 1); }
    c.fillStyle = 'rgba(40,30,20,0.55)'; c.font = 'bold 15px monospace'; c.textAlign = 'center'; c.fillText('SAND?', w / 2, h / 2 + 5);
  });
  const stripesTex = (a, b, k) => K3D.paint('alp-stripes|' + a + b + k, 256, 64, (c, w, h) => {
    c.fillStyle = a; c.fillRect(0, 0, w, h);
    for (let x = -h; x < w + h; x += 48) { c.fillStyle = b; c.beginPath(); c.moveTo(x, h); c.lineTo(x + 24, h); c.lineTo(x + 24 + h, 0); c.lineTo(x + h, 0); c.fill(); }
    for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(0,0,0,${0.1 + Math.random() * 0.15})`; c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 8, 1 + Math.random() * 2); }
    if (k) { c.fillStyle = 'rgba(0,0,0,0.6)'; c.font = 'bold 14px monospace'; c.fillText(k, 8, h - 8); }
  }, { repeat: true });
  const chevTex = () => K3D.paint('alp-chev', 256, 256, (c, w, h) => {
    c.fillStyle = '#2a2632'; c.fillRect(0, 0, w, h);
    for (let y = -64; y < h + 64; y += 64) { c.fillStyle = '#e8c83a'; c.beginPath(); c.moveTo(0, y); c.lineTo(w / 2, y - 40); c.lineTo(w, y); c.lineTo(w, y + 22); c.lineTo(w / 2, y - 18); c.lineTo(0, y + 22); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,0.4)'; for (let i = 0; i < 120; i++) c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 10, 1 + Math.random() * 2);
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = 'bold 16px monospace'; c.fillText('RISER 0' + (1 + Math.floor(Math.random() * 8)), 12, h - 12);
  });
  const runTex = () => K3D.paint('alp-run', 128, 16, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { const g = c.createRadialGradient(x + 8, 8, 1, x + 8, 8, 8); g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.globalAlpha = x < w / 2 ? 1 : 0.15; c.fillRect(x, 0, 16, h); }
    c.globalAlpha = 1;
  }, { repeat: true });
  const rockTex = () => K3D.paint('alp-rock', 256, 256, (c, w, h) => {
    c.fillStyle = '#6a5a74'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '20,14,30' : '200,190,220'},${0.06 + Math.random() * 0.12})`; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 10, 0, 7); c.fill(); }
    for (let i = 0; i < 12; i++) { c.strokeStyle = 'rgba(20,12,24,0.5)'; c.lineWidth = 2; c.beginPath(); let x = Math.random() * w, y = Math.random() * h; c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (Math.random() - 0.5) * 40; y += Math.random() * 30; c.lineTo(x, y); } c.stroke(); }
  }, { repeat: true });
  const caveTex = () => K3D.paint('alp-cave', 256, 256, (c, w, h) => {
    c.fillStyle = '#5a4a3a'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 42) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x, 0, 3, h); }
    // a painted cave mouth (badly), glowing eyes inside, and a sign
    const g = c.createRadialGradient(w / 2, h * 0.62, 10, w / 2, h * 0.62, w * 0.42); g.addColorStop(0, '#05030a'); g.addColorStop(0.8, '#1a1424'); g.addColorStop(1, 'rgba(26,20,36,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(w / 2, h * 0.66, w * 0.38, h * 0.36, 0, Math.PI, 0); c.lineTo(w * 0.88, h); c.lineTo(w * 0.12, h); c.fill();
    c.fillStyle = '#5aff8a'; for (const x of [w * 0.44, w * 0.56]) { c.beginPath(); c.ellipse(x, h * 0.62, 7, 4, 0, 0, 7); c.fill(); }
    c.fillStyle = '#f2ead2'; c.fillRect(w * 0.26, h * 0.12, w * 0.48, 34); c.fillStyle = '#2a2430'; c.font = 'bold 18px monospace'; c.textAlign = 'center'; c.fillText('CAVE CLOSED', w / 2, h * 0.12 + 23);
  });
  const fingerTex = () => K3D.paint('alp-finger', 256, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    // smudges and fingerprints (a few low down where little hands lean), a streak of cleaning spray
    for (let i = 0; i < 14; i++) {
      const x = 20 + Math.random() * (w - 40), y = h * 0.45 + Math.random() * h * 0.5;
      for (let r = 2; r < 9; r += 1.6) { c.strokeStyle = `rgba(255,255,255,${0.12 - r * 0.008})`; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, r, r * 1.3, 0.3, 0, 7); c.stroke(); }
    }
    for (let i = 0; i < 4; i++) { const g = c.createLinearGradient(0, 0, w, 40); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.save(); c.translate(0, Math.random() * h); c.rotate(-0.3); c.fillRect(0, 0, w * 1.3, 12 + Math.random() * 20); c.restore(); }
    // the sheen that says glass: two soft diagonal bands and a brighter top edge
    for (const [x0, bw, a] of [[0.12, 0.34, 0.13], [0.55, 0.12, 0.2], [0.7, 0.05, 0.16]]) {
      const g = c.createLinearGradient(w * x0, 0, w * (x0 + bw), 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(235,245,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.save(); c.setTransform(1, 0, -0.55, 1, h * 0.28, 0); c.fillStyle = g; c.fillRect(0, 0, w * 1.6, h); c.restore();
    }
    { const g = c.createLinearGradient(0, 0, 0, h * 0.16); g.addColorStop(0, 'rgba(255,248,230,0.22)'); g.addColorStop(1, 'rgba(255,248,230,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h * 0.16); }
    // the sticker
    c.fillStyle = '#ffe24a'; c.fillRect(w * 0.08, h * 0.86, 88, 38); c.fillStyle = '#1a1820'; c.font = 'bold 13px monospace'; c.fillText('DO NOT', w * 0.08 + 18, h * 0.86 + 16); c.fillText('LEAN!', w * 0.08 + 24, h * 0.86 + 31);
  });
  const glyph = (txt, col) => K3D.paint('alp-glyph|' + txt + col, 128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.strokeStyle = col; c.lineWidth = 6; c.beginPath(); c.arc(w / 2, h / 2, 54, 0, 7); c.stroke();
    c.fillStyle = col; c.font = '900 26px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, w / 2, h / 2);
  });
  const rainbow = () => K3D.paint('alp-rainbow', 256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const cols = ['#ff5a7a', '#ffd24a', '#5aff8a', '#4ae8ff', '#9a8aff'];
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.4; cols.forEach((col, i) => { c.strokeStyle = col; c.globalAlpha = 0.5; c.lineWidth = 7; c.beginPath(); c.arc(w / 2, h / 2, 50 + i * 8, a, a + 0.9); c.stroke(); }); }
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 50); g.addColorStop(0, 'rgba(230,220,255,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, 0, w, h);
  });

  const chromeCap = () => K3D.paint('alp-chrome', 256, 256, (c, w, h) => {
    c.fillStyle = '#16141c'; c.fillRect(0, 0, w, h);
    c.save(); c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.clip();
    const sky = c.createLinearGradient(0, 0, 0, h * 0.55); sky.addColorStop(0, '#f4f2ff'); sky.addColorStop(0.6, '#a8acc8'); sky.addColorStop(1, '#6a6a8a'); c.fillStyle = sky; c.fillRect(0, 0, w, h * 0.55);
    const gr = c.createLinearGradient(0, h * 0.55, 0, h); gr.addColorStop(0, '#2a2632'); gr.addColorStop(0.5, '#4a3a52'); gr.addColorStop(1, '#ff9ae0'); c.fillStyle = gr; c.fillRect(0, h * 0.55, w, h * 0.45);
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.ellipse(w * 0.34, h * 0.28, w * 0.1, h * 0.06, -0.5, 0, 7); c.fill();
    const rim = c.createRadialGradient(w / 2, h / 2, w * 0.36, w / 2, h / 2, w / 2); rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, 'rgba(0,0,0,0.55)'); c.fillStyle = rim; c.fillRect(0, 0, w, h);
    c.restore();
  });

  /* ---------- the cube camera for the mirrors ---------- */
  function mirrorEnv(K) {
    const rt = new T.WebGLCubeRenderTarget(256, { type: T.HalfFloatType, generateMipmaps: false });
    const cam = new T.CubeCamera(0.1, 90, rt); cam.position.set(0, 1.0, 0.5); K.scene.add(cam);
    return { rt, cam, n: 0 };
  }

  /* ---------- builders (each returns a group at the piece's place; .userData.h = how far down it sinks) ---------- */
  function pillar(K, p, pc) {
    const g = new T.Group(), r = p.r;
    const band = pick([ROOM.mag, ROOM.green, ROOM.violet]);
    const col = pick(['#2e2838', '#38283a', '#2a3036']);
    const tex = vinyl(col, String(10 + Math.floor(R() * 89))); tex.repeat.set(Math.max(1, Math.round(r * 3)), 1);
    const body = mk(new T.CylinderGeometry(r, r, H_PIL - 0.2, 32, 1, true).translate(0, (H_PIL - 0.2) / 2 + 0.1, 0), K3D.toon('#ffffff', { map: tex }), { inkW: 1 }); g.add(body);
    const foot = mk(new T.CylinderGeometry(r * 1.08, r * 1.12, 0.14, 32).translate(0, 0.07, 0), toon('#1a181e')); g.add(foot);
    const cap = mk(new T.CylinderGeometry(r * 1.06, r * 1.04, 0.14, 32).translate(0, H_PIL - 0.07, 0), toon('#3a3442')); g.add(cap);
    const top = new T.Mesh(new T.CircleGeometry(r * 1.04, 32).rotateX(-Math.PI / 2), toon('#24202a')); top.position.y = H_PIL + 0.002; g.add(top);
    for (const y of [0.62, 1.78]) { const t = new T.Mesh(new T.TorusGeometry(r * 1.015, 0.028, 8, 48).rotateX(Math.PI / 2), flat(band, 2.4)); t.position.y = y; g.add(t); pc.glowish.push({ m: t.material, col: band }); }
    // a cap lamp, a fire-safety tag on a cable tie, a strip of hazard tape round the foot
    const lamp = new T.Mesh(new T.SphereGeometry(0.07, 12, 8), flat(ROOM.gold, 3)); lamp.position.y = H_PIL + 0.07; g.add(lamp);
    const tag = new T.Mesh(new T.PlaneGeometry(0.12, 0.07), toon('#f2ead2')); tag.position.set(0, 1.2, r + 0.01); tag.rotation.z = 0.2; g.add(tag);
    const tape = new T.Mesh(new T.CylinderGeometry(r * 1.005, r * 1.005, 0.06, 32, 1, true), K3D.toon('#ffffff', { map: stripesTex('#e8c83a', '#1a1820') })); tape.position.y = 0.22; g.add(tape);
    pc.hall.L.add(p.x, H_PIL + 0.07, p.z, ROOM.gold, { size: 0.05 });
    g.userData.h = H_PIL + 0.2;
    return g;
  }
  function crates(K, p) {
    const g = new T.Group(), long = p.d >= p.w, L = Math.max(p.w, p.d), Wd = Math.min(p.w, p.d);
    const n = Math.max(1, Math.round(L / 0.86)), s = L / n;
    const put = (geo, mat, x, y, z, ry) => { const m = mk(geo, mat, { inkW: 1 }); m.position.set(long ? 0 : x, y, long ? x : 0); m.position.x += long ? z : 0; m.position.z += long ? 0 : z; m.rotation.y = ry; g.add(m); return m; };
    for (let i = 0; i < n; i++) put(box(Wd * 0.96, s * 0.95, s * 0.95).translate(0, s * 0.475, 0), K3D.toon('#ffffff', { map: crateTex(i + Math.floor(R() * 5)) }), -L / 2 + s * (i + 0.5), 0, 0, (R() - 0.5) * 0.08);
    for (let i = 0; i < n - 1; i++) { const cs = s * 0.82; put(box(Wd * 0.84, cs, cs).translate(0, cs / 2, 0), K3D.toon('#ffffff', { map: crateTex(i + 3) }), -L / 2 + s * (i + 1), s * 0.95, 0, (R() - 0.5) * 0.3); }
    // a strap across the stack, a small box on top, a paper cup someone left
    const strap = new T.Mesh(box(Wd * 1.0, 0.05, 0.08), toon('#c8a028')); strap.position.set(0, s * 0.95 + 0.02, 0); if (!long) strap.rotation.y = Math.PI / 2; g.add(strap);
    const sm = mk(box(0.3, 0.22, 0.26).translate(0, 0.11, 0), K3D.toon('#ffffff', { map: crateTex(4) })); sm.position.set(long ? 0.05 : -L * 0.15, s * 0.95 + s * 0.82, long ? -L * 0.15 : 0.05); sm.rotation.y = 0.5; g.add(sm);
    const cup = mk(new T.CylinderGeometry(0.045, 0.035, 0.11, 10).translate(0, 0.055, 0), toon('#f2f0ea'), { inkW: 0.5 }); cup.position.set(long ? 0.12 : L * 0.25, s * 0.95 + s * 0.82, long ? L * 0.22 : 0.1); g.add(cup);
    g.userData.h = s * 0.95 + s * 0.82 + 0.4;
    return g;
  }
  function drums(K, p) {
    const g = new T.Group(), long = p.w >= p.d, L = Math.max(p.w, p.d), Wd = Math.min(p.w, p.d), r = Wd * 0.46, dh = 0.95;
    const n = Math.max(1, Math.round(L / (r * 2.05)));
    const cols = ['#3a6a4a', '#5a3a6a', '#2a4a5a', '#6a2a3a'];
    const at = (u, y) => long ? [u, y, 0] : [0, y, u];
    const geo = new T.CylinderGeometry(r, r, dh, 28).translate(0, dh / 2, 0);
    const lidG = new T.TorusGeometry(r * 0.98, 0.022, 6, 28).rotateX(Math.PI / 2);
    const drum = (u, y, col, lying) => {
      const tx = drumTex(col);
      const m = mk(geo, K3D.toon('#ffffff', { map: tx }), { inkW: 1 }); const [x, yy, z] = at(u, y);
      if (lying) { m.rotation.z = long ? Math.PI / 2 : 0; m.rotation.x = long ? 0 : Math.PI / 2; m.position.set(x + (long ? dh / 2 : 0), yy + r, z - (long ? 0 : dh / 2)); }
      else { m.position.set(x, yy, z); m.rotation.y = R() * 6; }
      g.add(m);
      if (!lying) { const lid = new T.Mesh(lidG, toon('#24202a')); lid.position.set(x, yy + dh, z); g.add(lid); const cap = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.03, 8), toon('#c8c0b0')); cap.position.set(x + r * 0.5, yy + dh + 0.012, z); g.add(cap); }
      return m;
    };
    for (let i = 0; i < n; i++) drum(-L / 2 + (L / n) * (i + 0.5), 0, cols[(i + Math.floor(R() * 4)) % 4]);
    drum(-L / 2 + (L / n) * 1, dh, cols[1]);
    if (n >= 3) drum(L / 2 - (L / n) * 1.5 - dh / 2, dh, cols[2], true);
    // a glow stick stuck in a lid, a puddle of glow paint at the foot
    const gs = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.16, 6), flat(ROOM.green, 2.6)); const [x0, , z0] = at(-L / 2 + (L / n) * 1, 0); gs.position.set(x0 + 0.05, dh * 2 + 0.07, z0); gs.rotation.z = 0.4; g.add(gs);
    g.userData.h = dh * 2 + 0.3;
    return g;
  }
  function saucer(K, p, pc) {
    // a prop flying saucer that has 'crashed' edge-first into the floor: wide along the piece's long side, thin across
    const g = new T.Group(), long = p.w >= p.d, L = Math.max(p.w, p.d), Wd = Math.min(p.w, p.d);
    const tilt = new T.Group(); g.add(tilt);
    if (!long) tilt.rotation.y = Math.PI / 2;
    const rad = L / 2 * 0.98;
    const prof = [[0, 0.16], [rad * 0.3, 0.15], [rad * 0.7, 0.09], [rad, 0], [rad * 0.7, -0.08], [rad * 0.3, -0.12], [0, -0.13]].map(([x, y]) => new T.Vector2(x, y));
    const disc = mk(new T.LatheGeometry(prof, 40), toon('#c8ccd8'), { inkW: 1.1 });
    const dome = mk(new T.SphereGeometry(rad * 0.32, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), K3D.toon('#9ae8d8', { transparent: true, opacity: 0.75 })); dome.position.y = 0.14;
    const inner = new T.Group(); inner.add(disc, dome);
    // stand it up: the disc's flat faces look along the piece's thin side
    inner.rotation.x = Math.PI / 2 - 0.28; inner.position.y = rad * 0.62; tilt.add(inner);
    // rim lights in the room colours, a scorch ring, a 'PROP' sign
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, b = new T.Mesh(new T.SphereGeometry(0.035, 8, 6), new T.MeshBasicMaterial({ color: hot(i % 2 ? ROOM.green : ROOM.violet, 2.6), toneMapped: false }));
      b.position.set(Math.cos(a) * rad * 0.97, 0, Math.sin(a) * rad * 0.97); inner.add(b); pc.blinkers.push({ m: b, ph: i * 0.4, col: i % 2 ? ROOM.green : ROOM.violet });
    }
    const sign = new T.Mesh(new T.PlaneGeometry(0.62, 0.22), ARCADELASER_HALL.board('PROP\nDO NOT RIDE', 0.62, 0.22, { bg: '#f2ead2', col: '#2a2430', frame: false }).material);
    sign.position.set(rad * 0.45, 0.2, Wd / 2 + 0.05); tilt.add(sign);
    const post = mk(new T.CylinderGeometry(0.02, 0.02, 0.32, 6).translate(0, 0.16, 0), toon('#5a5662')); post.position.set(rad * 0.45, 0, Wd / 2 + 0.04); tilt.add(post);
    const crack = new T.Mesh(new T.PlaneGeometry(L * 1.05, Wd * 1.6).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: K3D.paint('alp-crack', 256, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(0,0,0,0.75)'; c.lineWidth = 2; for (let i = 0; i < 18; i++) { let x = w / 2 + (Math.random() - 0.5) * w * 0.8, y = h / 2; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - 0.5) * 30; y += (Math.random() - 0.5) * 24; c.lineTo(x, y); } c.stroke(); } }), transparent: true, depthWrite: false }));
    crack.position.y = 0.01; tilt.add(crack);
    g.userData.h = rad * 1.4 + 0.3;
    return g;
  }
  function rockArch(K, p, pc) {
    const g = new T.Group(), long = p.d >= p.w, L = Math.max(p.w, p.d), Wd = Math.min(p.w, p.d);
    const tx = rockTex(); tx.repeat.set(1, 1);
    const rockM = K3D.toon('#ffffff', { map: tx });
    const lump = (x, y, z, s) => { const geo = new T.IcosahedronGeometry(1, 1); const a = geo.attributes.position; for (let i = 0; i < a.count; i++) { const k = 0.82 + R() * 0.3; a.setXYZ(i, a.getX(i) * k, a.getY(i) * k, a.getZ(i) * k); } geo.computeVertexNormals(); const m = mk(geo, rockM, { inkW: 1.1 }); m.scale.set(s[0], s[1], s[2]); m.position.set(long ? 0 : x, y, long ? x : 0); m.position.x += long ? z : 0; m.position.z += long ? 0 : z; m.rotation.set(R(), R() * 6, R()); g.add(m); return m; };
    // two legs of piled rocks and the arch across
    for (const e of [-1, 1]) { lump(e * (L / 2 - 0.36), 0.38, 0, [0.38, 0.42, Wd * 0.5]); lump(e * (L / 2 - 0.4), 1.0, 0, [0.34, 0.36, Wd * 0.45]); }
    lump(0, 1.45, 0, [L * 0.36, 0.26, Wd * 0.46]); lump(-L * 0.22, 1.3, 0, [0.3, 0.26, Wd * 0.42]); lump(L * 0.22, 1.3, 0, [0.3, 0.26, Wd * 0.42]);
    // the opening, boarded up with a badly painted cave
    const brd = mk(box(long ? Wd * 0.3 : L - 0.8, 1.15, long ? L - 0.8 : Wd * 0.3).translate(0, 0.58, 0), K3D.toon('#ffffff', { map: caveTex() }), { inkW: 0.8 }); g.add(brd);
    // glowing moss, little glowing mushrooms
    for (let i = 0; i < 9; i++) { const u = (R() - 0.5) * L * 0.9, y = 0.2 + R() * 1.4; const m = new T.Mesh(new T.SphereGeometry(0.06 + R() * 0.06, 8, 6), flat(pick([ROOM.green, '#7affd8']), 1.8)); m.scale.y = 0.4; m.position.set(long ? (R() - 0.5) * Wd * 0.9 : u, y, long ? u : (R() - 0.5) * Wd * 0.9); g.add(m); }
    for (let i = 0; i < 5; i++) { const s = 0.05 + R() * 0.04, u = (R() - 0.5) * L; const st2 = new T.Mesh(new T.CylinderGeometry(0.012, 0.016, s * 1.4, 6).translate(0, s * 0.7, 0), toon('#e8e0d0')); const cap = new T.Mesh(new T.SphereGeometry(s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), flat(ROOM.violet, 2)); cap.position.y = s * 1.4; const m = new T.Group(); m.add(st2, cap); m.position.set(long ? Wd / 2 + 0.02 : u, 0, long ? u : Wd / 2 + 0.02); g.add(m); }
    g.userData.h = 2.0;
    return g;
  }
  function chain(K, p, pc) {
    const g = new T.Group(), long = p.d >= p.w, L = Math.max(p.w, p.d), Wd = Math.min(p.w, p.d), H = H_WALL;
    const along = (u, y, v) => long ? [v, y, u] : [u, y, v];
    // plywood sheets in the middle (what stops the beams), sprayed with glow graffiti
    const ply = mk(box(long ? Wd * 0.38 : L * 0.98, H * 0.92, long ? L * 0.98 : Wd * 0.38).translate(0, H * 0.46, 0), K3D.toon('#ffffff', { map: plyTex(Math.floor(R() * 4)) })); g.add(ply);
    // chain-link both sides, on posts with a top rail
    const ct = chainTex(); ct.repeat.set(L * 2.5, H * 2.5);
    const cm = K3D.toon('#ffffff', { map: ct, transparent: true, alphaTest: 0.4, side: T.DoubleSide });
    for (const s of [-1, 1]) {
      const pl = new T.Mesh(new T.PlaneGeometry(L, H), cm); const [x, y, z] = along(0, H / 2, s * Wd * 0.42); pl.position.set(x, y, z); if (long) pl.rotation.y = Math.PI / 2; g.add(pl);
    }
    const postG = new T.CylinderGeometry(0.035, 0.035, H + 0.08, 8).translate(0, (H + 0.08) / 2, 0);
    for (const u of [-L / 2, 0, L / 2]) for (const s of [-1, 1]) { const m = mk(postG, toon('#8a8e98'), { inkW: 0.6 }); const [x, y, z] = along(u, 0, s * Wd * 0.42); m.position.set(x, y, z); g.add(m); }
    for (const s of [-1, 1]) { const rail = mk(new T.CylinderGeometry(0.025, 0.025, L, 8).rotateZ(Math.PI / 2), toon('#8a8e98'), { inkW: 0.6 }); const [x, y, z] = along(0, H, s * Wd * 0.42); rail.position.set(x, y, z); if (long) rail.rotation.y = Math.PI / 2; g.add(rail); }
    // a sign hung crooked, a glow stick on a string
    const sign = ARCADELASER_HALL.board('NO\nCLIMBING', 0.42, 0.3, { bg: '#f2ead2', col: '#b02a3a', fc: '#b02a3a' });
    const [sx, , sz] = along(L * 0.15, 0, Wd * 0.45); sign.position.set(sx, H * 0.7, sz); sign.rotation.y = long ? Math.PI / 2 : 0; sign.rotation.z = 0.12; g.add(sign);
    const sign2 = sign.clone(); const [sx2, , sz2] = along(-L * 0.2, 0, -Wd * 0.45); sign2.position.set(sx2, H * 0.55, sz2); sign2.rotation.y = long ? -Math.PI / 2 : Math.PI; sign2.rotation.z = -0.08; g.add(sign2);
    const gs = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, 0.18, 6), flat(ROOM.mag, 2.6)); const [gx, , gz] = along(-L * 0.3, 0, Wd * 0.46); gs.position.set(gx, H - 0.3, gz); g.add(gs);
    pc.swing.push(gs);
    g.userData.h = H + 0.3;
    return g;
  }
  function tyres(K, p) {
    const g = new T.Group();
    const tread = K3D.paint('alp-tread', 128, 32, (c, w, h) => { c.fillStyle = '#1e1c22'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { c.fillStyle = '#121014'; c.fillRect(x, 0, 4, h); } }, { repeat: true });
    const tm = K3D.toon('#ffffff', { map: tread }); tread.repeat.set(8, 1);
    const tg = new T.TorusGeometry(0.3, 0.13, 10, 24).rotateX(Math.PI / 2);
    const spots = [[-0.38, -0.3], [0.38, -0.3], [-0.38, 0.3], [0.38, 0.3]];
    spots.forEach(([x, z], k) => {
      const n = 2 + (k % 3);
      for (let i = 0; i < n; i++) {
        const m = mk(tg, tm, { inkW: 0.9 }); m.position.set(x + (R() - 0.5) * 0.05, 0.13 + i * 0.25, z + (R() - 0.5) * 0.05); g.add(m);
        const stripe = new T.Mesh(new T.TorusGeometry(0.3, 0.132, 6, 24, Math.PI * 0.6).rotateX(Math.PI / 2), flat(pick([ROOM.mag, ROOM.green, ROOM.violet]), 1.6)); stripe.position.copy(m.position); stripe.rotation.y = R() * 6; stripe.scale.set(1, 0.3, 1); g.add(stripe);
      }
    });
    g.rotation.y = p.rot || 0;
    g.userData.h = 1.4; g.userData.ownRot = true;
    return g;
  }
  function sandbags(K, p) {
    const g = new T.Group(), long = p.w >= p.d, L = Math.max(p.w, p.d), Wd = Math.min(p.w, p.d);
    const bag = K3D.roundBox(1, 1, 1, 0.55, 16), bm = K3D.toon('#ffffff', { map: burlap() });
    const rows = 3, bh = H_LOW / rows;
    for (let r = 0; r < rows; r++) {
      const bl = 0.5, n = Math.max(1, Math.round((L - (r % 2) * bl * 0.5) / bl));
      for (let i = 0; i < n; i++) {
        const u = -L / 2 + (r % 2 ? bl * 0.25 : 0) + (i + 0.5) * ((L - (r % 2) * bl * 0.5) / n);
        const m = mk(bag, bm, { inkW: 0.8 }); m.scale.set(long ? bl * 0.98 : Wd * 0.92, bh * 1.15, long ? Wd * 0.92 : bl * 0.98);
        m.position.set(long ? u : 0, r * bh * 0.95, long ? 0 : u); m.rotation.y = (R() - 0.5) * 0.15; g.add(m);
      }
    }
    g.userData.h = H_LOW + 0.2;
    return g;
  }
  function hazard(K, p, pc) {
    const g = new T.Group(), long = p.w >= p.d, L = Math.max(p.w, p.d), Wd = Math.min(p.w, p.d);
    // a plastic barrier profile (wide foot, narrow top), extruded along the long side, in short sections
    const sh = new T.Shape(); const bw = Wd * 0.5, tw = Wd * 0.2;
    sh.moveTo(-bw, 0); sh.lineTo(bw, 0); sh.lineTo(bw * 0.86, 0.1); sh.lineTo(tw, H_LOW * 0.6); sh.lineTo(tw, H_LOW); sh.lineTo(-tw, H_LOW); sh.lineTo(-tw, H_LOW * 0.6); sh.lineTo(-bw * 0.86, 0.1); sh.closePath();
    const n = Math.max(1, Math.round(L / 1.2)), sl = L / n;
    const tex = stripesTex('#e8c83a', '#1a1820'); tex.repeat.set(sl * 1.4, 1);
    const geo = new T.ExtrudeGeometry(sh, { depth: sl * 0.97, bevelEnabled: false }).translate(0, 0, -sl * 0.485);
    // (map the stripes along the side faces)
    const uv = geo.attributes.uv, pos = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getZ(i) / sl + 0.5, pos.getY(i) / H_LOW);
    for (let i = 0; i < n; i++) {
      const m = mk(geo, K3D.toon('#ffffff', { map: tex }), { inkW: 0.9 }); const u = -L / 2 + sl * (i + 0.5);
      m.position.set(long ? u : 0, 0, long ? 0 : u); m.rotation.y = long ? Math.PI / 2 : 0; g.add(m);
      for (const s of [-1, 1]) { const rf = new T.Mesh(new T.CircleGeometry(0.035, 10), flat('#ffffff', 1.4)); rf.position.set(long ? u : s * (tw + 0.002 + Wd * 0.04), H_LOW * 0.8, long ? s * (tw + 0.002 + Wd * 0.04) : u); rf.rotation.y = long ? (s > 0 ? 0 : Math.PI) : (s > 0 ? Math.PI / 2 : -Math.PI / 2); g.add(rf); }
    }
    const lamp = new T.Mesh(new T.SphereGeometry(0.06, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshBasicMaterial({ color: hot(ROOM.gold, 2.6), toneMapped: false })); lamp.position.set(long ? L / 2 - 0.2 : 0, H_LOW, long ? 0 : L / 2 - 0.2); g.add(lamp); pc.blinkers.push({ m: lamp, ph: R() * 6, slow: true, col: ROOM.gold });
    g.userData.h = H_LOW + 0.2;
    return g;
  }
  function riser(K, p, pc) {
    const g = new T.Group(), long = p.d >= p.w, L = Math.max(p.w, p.d), Wd = Math.min(p.w, p.d);
    const ry = long ? Math.PI / 2 : 0;
    const frame = new T.Group(); frame.rotation.y = ry; g.add(frame);
    // the slot: a dark recess with hazard edges, the pistons and a cog in it
    const slot = new T.Mesh(new T.PlaneGeometry(L + 0.12, Wd + 0.12).rotateX(-Math.PI / 2), flat('#050308', 1)); slot.position.y = 0.008; frame.add(slot);
    const edgeT = stripesTex('#e8c83a', '#1a1820'); edgeT.repeat.set(4, 1);
    for (const s of [-1, 1]) { const e = new T.Mesh(new T.PlaneGeometry(L + 0.32, 0.1).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: edgeT })); e.position.set(0, 0.01, s * (Wd / 2 + 0.11)); frame.add(e); }
    for (const s of [-1, 1]) { const e = new T.Mesh(new T.PlaneGeometry(0.1, Wd + 0.12).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: edgeT })); e.position.set(s * (L / 2 + 0.11), 0.01, 0); frame.add(e); }
    // the running light strip round the slot (the warning)
    const rt = runTex().clone(); rt.needsUpdate = true; rt.wrapS = rt.wrapT = T.RepeatWrapping; rt.repeat.set((L + Wd) * 2.2, 1);
    const runM = new T.MeshBasicMaterial({ map: rt, color: hot(ROOM.gold, 0.2), transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
    const perim = []; const hx = L / 2 + 0.2, hz = Wd / 2 + 0.2;
    for (const [x0, z0, x1, z1] of [[-hx, -hz, hx, -hz], [hx, -hz, hx, hz], [hx, hz, -hx, hz], [-hx, hz, -hx, -hz]]) {
      const len = Math.hypot(x1 - x0, z1 - z0), m = new T.Mesh(new T.PlaneGeometry(len, 0.07).rotateX(-Math.PI / 2), runM);
      m.position.set((x0 + x1) / 2, 0.014, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); frame.add(m); perim.push(m);
    }
    // the panel (moves), its pistons
    const panel = new T.Group(); frame.add(panel);
    const ch = chevTex();
    const pm = mk(box(L, H_RISE, Wd).translate(0, H_RISE / 2, 0), [toon('#2a2632'), toon('#2a2632'), toon('#3a3642'), toon('#1a1820'), K3D.toon('#ffffff', { map: ch }), K3D.toon('#ffffff', { map: ch })], { inkW: 1 });
    panel.add(pm);
    for (const s of [-1, 1]) for (const y of [0.04, H_RISE - 0.04]) { const tape = new T.Mesh(box(L + 0.01, 0.035, Wd + 0.01), flat(ROOM.green, 2.0)); tape.position.y = y; panel.add(tape); void s; }
    for (const s of [-1, 1]) { const tape = new T.Mesh(box(0.035, H_RISE, Wd + 0.012), flat(ROOM.green, 2.0)); tape.position.set(s * (L / 2 - 0.02), H_RISE / 2, 0); panel.add(tape); }
    const lamps = [];
    for (const s of [-1, 1]) { const lm = new T.MeshBasicMaterial({ color: hot(ROOM.gold, 0.4), toneMapped: false }); const l = new T.Mesh(new T.SphereGeometry(0.075, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), lm); l.position.set(s * (L / 2 - 0.12), H_RISE, 0); panel.add(l); lamps.push(lm); const cage = mk(new T.CylinderGeometry(0.085, 0.085, 0.08, 8, 1, true), toon('#5a5662'), { inkW: 0.5 }); cage.position.set(s * (L / 2 - 0.12), H_RISE + 0.04, 0); panel.add(cage); }
    const pistons = [];
    for (const s of [-1, 1]) { const ps = mk(new T.CylinderGeometry(0.06, 0.06, 1, 10).translate(0, -0.5, 0), toon('#b8bcc8'), { inkW: 0.6 }); ps.position.set(s * L * 0.3, 0, 0); panel.add(ps); pistons.push(ps); }
    g.userData = { h: 0.02, riser: { panel, lamps, runM, rt, pistons, perim } };
    return g;
  }
  function start(K, p, pc) {
    const g = new T.Group(), long = p.d >= p.w, L = Math.max(p.w, p.d), Wd = Math.min(p.w, p.d);
    const col = PCOL[p.side];
    const fr = new T.Group(); fr.rotation.y = long ? Math.PI / 2 : 0; g.add(fr);
    const glass = new T.Mesh(box(L * 0.98, H_START * 0.9, Wd * 0.5).translate(0, H_START * 0.47, 0), K3D.toon(mixHex(col, '#ffffff', 0.55), { transparent: true, opacity: 0.55 }));
    fr.add(glass);
    const n = Math.max(2, Math.round(L / 0.9));
    for (let i = 0; i <= n; i++) { const post = mk(box(0.07, H_START, Wd * 0.7).translate(0, H_START / 2, 0), toon('#4a4652'), { inkW: 0.6 }); post.position.x = -L / 2 + L * i / n; fr.add(post); }
    const top = mk(box(L, 0.07, Wd * 0.7).translate(0, H_START, 0), toon('#4a4652'), { inkW: 0.6 }); fr.add(top);
    // light strips in the base's colour, and START stencilled on the glass
    for (const y of [0.12, H_START - 0.1]) { const l = new T.Mesh(box(L * 0.98, 0.03, Wd * 0.52), flat(col, 2.6)); l.position.y = y; fr.add(l); }
    const txt = K3D.paint('alp-start|' + p.side, 256, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.85)'; c.font = '900 40px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(NAMES[p.side].toUpperCase() + ' START', w / 2, h / 2); });
    for (const s of [-1, 1]) { const t = new T.Mesh(new T.PlaneGeometry(Math.min(L * 0.8, 2.4), Math.min(L * 0.8, 2.4) / 4), new T.MeshBasicMaterial({ map: txt, transparent: true, depthWrite: false, toneMapped: false, color: hot('#ffffff', 1.2) })); t.position.set(0, H_START * 0.55, s * (Wd * 0.26 + 0.005)); t.rotation.y = s > 0 ? 0 : Math.PI; fr.add(t); }
    g.userData.h = H_START + 0.15;
    return g;
  }
  // a mirror panel (shared by fixed, turning and spinning mirrors); .userData.mir = { glass, neon }
  function mirrorPanel(K, len, pc) {
    const g = new T.Group(), H0 = 0.1, H1 = 1.5, hh = H1 - H0, fw = 0.07;
    const glass = new T.Mesh(new T.PlaneGeometry(len - fw * 2, hh - fw * 2), pc.glassM); glass.position.y = H0 + hh / 2; g.add(glass);
    const back = new T.Mesh(new T.PlaneGeometry(len - fw * 2, hh - fw * 2), pc.glassM); back.rotation.y = Math.PI; back.position.y = H0 + hh / 2; g.add(back);
    for (const s of [-1, 1]) { const f = new T.Mesh(new T.PlaneGeometry(len - fw * 2, hh - fw * 2), pc.fingerM); f.position.set(0, H0 + hh / 2, s * 0.004); if (s < 0) f.rotation.y = Math.PI; g.add(f); }
    pc.glass.push(glass, back);
    // the chrome frame
    const fm = pc.chromeM;
    const bar = (w, h, x, y) => { const m = mk(box(w, h, 0.06), fm, { inkW: 0.8 }); m.position.set(x, y, 0); g.add(m); };
    bar(len, fw, 0, H0 + fw / 2); bar(len, fw, 0, H1 - fw / 2); bar(fw, hh, -len / 2 + fw / 2, H0 + hh / 2); bar(fw, hh, len / 2 - fw / 2, H0 + hh / 2);
    // white-gold neon tubes along the edges, both faces
    const nm = new T.MeshBasicMaterial({ color: hot(ROOM.gold, 2.4), toneMapped: false });
    for (const s of [-1, 1]) {
      const tube = (w, h, x, y) => { const m = new T.Mesh(box(w, h, 0.018), nm); m.position.set(x, y, s * 0.034); g.add(m); };
      tube(len - fw * 2, 0.018, 0, H0 + fw + 0.01); tube(len - fw * 2, 0.018, 0, H1 - fw - 0.01); tube(0.018, hh - fw * 2, -len / 2 + fw + 0.01, H0 + hh / 2); tube(0.018, hh - fw * 2, len / 2 - fw - 0.01, H0 + hh / 2);
    }
    pc.neons.push(nm);
    g.userData.mir = { glass, nm };
    return g;
  }
  function feet(g, len) {
    for (const s of [-1, 1]) {
      const f = mk(box(0.06, 0.05, 0.5).translate(0, 0.025, 0), toon('#8a8e98'), { inkW: 0.6 }); f.position.x = s * (len / 2 - 0.08); g.add(f);
      const w = new T.Mesh(new T.SphereGeometry(0.03, 8, 6), toon('#1a181e')); w.position.set(s * (len / 2 - 0.08), 0.02, 0.24); g.add(w);
    }
  }
  function mirror(K, p, pc) {
    const g = new T.Group(); const m = mirrorPanel(K, p.len, pc); g.add(m); feet(g, p.len);
    g.rotation.y = p.rot; g.userData.h = 1.7; g.userData.ownRot = true; g.userData.mir = m.userData.mir;
    return g;
  }
  function turn(K, p, pc) {
    const g = new T.Group();
    const hub = mk(new T.CylinderGeometry(0.32, 0.38, 0.12, 24).translate(0, 0.06, 0), toon('#3a3442')); g.add(hub);
    const gear = new T.Mesh(ARCADE.gearGeo(0.3, 18, 0.05), K3D.toon('#ffffff', { map: ARCADE.brassTex() })); gear.rotation.x = -Math.PI / 2; gear.position.y = 0.13; g.add(gear);
    const post = mk(new T.CylinderGeometry(0.05, 0.05, 1.6, 10).translate(0, 0.8, 0), pc.chromeM, { inkW: 0.6 }); g.add(post);
    const head = new T.Group(); g.add(head);
    const m = mirrorPanel(K, p.len, pc); head.add(m);
    const cap = new T.Mesh(new T.SphereGeometry(0.07, 10, 8), flat(ROOM.violet, 2.4)); cap.position.y = 1.62; g.add(cap);
    // an arrow ring round the hub showing which way it turns
    const ring = new T.Mesh(new T.RingGeometry(0.42, 0.48, 32, 1, 0, Math.PI * 1.6).rotateX(-Math.PI / 2), flat(ROOM.violet, 1.6, { transparent: true, opacity: 0.8 })); ring.position.y = 0.012; g.add(ring);
    g.userData = { h: 1.8, turn: { head, gear }, mir: m.userData.mir };
    return g;
  }
  function button(K, p, pc) {
    const g = new T.Group();
    const base = mk(new T.CylinderGeometry(0.42, 0.46, 0.06, 28).translate(0, 0.03, 0), toon('#2a2632')); g.add(base);
    const ringM = new T.MeshBasicMaterial({ color: hot(ROOM.gold, 1.8), toneMapped: false });
    const ring = new T.Mesh(new T.TorusGeometry(0.35, 0.025, 8, 32).rotateX(Math.PI / 2), ringM); ring.position.y = 0.065; g.add(ring);
    const domeM = new T.MeshBasicMaterial({ color: hot(ROOM.violet, 1.3), toneMapped: false });
    const dome = new T.Mesh(new T.SphereGeometry(0.28, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), domeM); dome.scale.y = 0.45; dome.position.y = 0.05; g.add(dome);
    const lbl = new T.Mesh(new T.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: glyph('STEP', '#fff0b0'), transparent: true, depthWrite: false, toneMapped: false, color: hot('#ffffff', 0.9) })); lbl.position.y = 0.006; g.add(lbl);
    g.userData = { h: 0.3, button: { dome, domeM, ringM, pressT: 0 } };
    return g;
  }
  function prism(K, p, pc) {
    const g = new T.Group(), r = p.r;
    const foot = mk(new T.CylinderGeometry(r * 1.25, r * 1.4, 0.18, 6).translate(0, 0.09, 0), K3D.toon('#ffffff', { map: ARCADE.brassTex() })); g.add(foot);
    const coreM = new T.MeshBasicMaterial({ color: hot('#d8c8ff', 1.4), toneMapped: false });
    const core = new T.Mesh(new T.CylinderGeometry(r * 0.35, r * 0.35, 1.5, 6).translate(0, 0.95, 0), coreM); g.add(core);
    const shell = new T.Mesh(new T.CylinderGeometry(r * 0.92, r, 1.6, 6).translate(0, 0.98, 0), new T.MeshBasicMaterial({ color: hot('#b8a8ff', 0.5), transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    g.add(shell);
    const edges = new T.LineSegments(new T.EdgesGeometry(shell.geometry), new T.LineBasicMaterial({ color: hot('#f0e8ff', 1.8), toneMapped: false })); g.add(edges);
    const tip = new T.Mesh(new T.ConeGeometry(r * 0.92, 0.36, 6).translate(0, 1.96, 0), new T.MeshBasicMaterial({ color: hot('#e8e0ff', 0.9), transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); g.add(tip);
    const rb = new T.Mesh(new T.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: rainbow(), transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); rb.position.y = 0.012; g.add(rb);
    g.userData = { h: 2.3, prism: { coreM, rb, flash: 0 } };
    return g;
  }
  function platform(K, pc) {
    const g = new T.Group(), r = AR.PLAT_R;
    const disc = mk(new T.CylinderGeometry(r, r + 0.06, 0.08, 48).translate(0, 0.04, 0), K3D.toon('#ffffff', { map: K3D.paint('alp-plat', 256, 256, (c, w, h) => { c.fillStyle = '#26222e'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,240,176,0.25)'; c.lineWidth = 3; for (let k = 1; k < 5; k++) { c.beginPath(); c.arc(w / 2, h / 2, k * 28, 0, 7); c.stroke(); } for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + Math.cos(a) * 128, h / 2 + Math.sin(a) * 128); c.stroke(); } c.fillStyle = '#fff0b0'; c.font = 'bold 18px monospace'; c.textAlign = 'center'; c.fillText('FULL POWER', w / 2, h / 2 + 6); }) }));
    g.add(disc);
    const rim = []; const n = 36;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, m = new T.MeshBasicMaterial({ color: hot(ROOM.gold, 1), toneMapped: false }); const b = new T.Mesh(new T.SphereGeometry(0.035, 8, 6), m); b.position.set(Math.cos(a) * (r + 0.03), 0.07, Math.sin(a) * (r + 0.03)); g.add(b); rim.push(m); }
    const hub = mk(new T.CylinderGeometry(0.22, 0.26, 0.2, 16).translate(0, 0.1, 0), toon('#3a3442')); g.add(hub);
    const turner = new T.Group(); g.add(turner);
    g.userData = { h: 0.3, plat: { rim, turner } };
    return g;
  }
  function spin(K, p, pc) {
    const g = new T.Group(); const m = mirrorPanel(K, p.len, pc); m.position.y = 0.08; g.add(m);
    for (const s of [-1, 1]) { const f = mk(box(0.06, 0.05, 0.4).translate(0, 0.105, 0), toon('#8a8e98'), { inkW: 0.6 }); f.position.x = s * (p.len / 2 - 0.08); g.add(f); }
    g.userData = { h: 1.8, spin: true, mir: m.userData.mir, ownRot: true };
    return g;
  }
  const CAN_COL = { wide: '#ff5ad6', long: '#5aff8a', cloak: '#c8d0ff', shield: '#4ae8ff', speed: '#ffe24a' };
  P.CAN_COL = CAN_COL;
  function pad(K, p, pc) {
    const g = new T.Group();
    const base = mk(new T.CylinderGeometry(0.62, 0.66, 0.04, 32).translate(0, 0.02, 0), toon('#22202a'), { inkW: 0.6 }); g.add(base);
    const ringM = new T.MeshBasicMaterial({ color: hot(ROOM.gold, 0.8), toneMapped: false });
    const dots = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, d = new T.Mesh(new T.SphereGeometry(0.03, 6, 4), ringM); d.position.set(Math.cos(a) * 0.55, 0.045, Math.sin(a) * 0.55); g.add(d); dots.push(d); }
    const lbl = new T.Mesh(new T.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: glyph('?', '#fff0b0'), transparent: true, depthWrite: false, toneMapped: false, color: hot('#ffffff', 0.6) })); lbl.position.y = 0.045; g.add(lbl);
    // the canister: a glowing capsule in a cage, its colour the pickup's
    const can = new T.Group(); can.position.y = 0.7; g.add(can);
    const glowM = new T.MeshBasicMaterial({ color: hot('#ffffff', 1.6), toneMapped: false });
    const core = new T.Mesh(new T.CapsuleGeometry(0.13, 0.22, 6, 16), glowM); can.add(core);
    for (const y of [-0.2, 0.2]) { const c = mk(new T.CylinderGeometry(0.17, 0.17, 0.06, 16), toon('#e8e6e0'), { inkW: 0.6 }); c.position.y = y; can.add(c); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2, b = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.4, 6), toon('#e8e6e0')); b.position.set(Math.cos(a) * 0.16, 0, Math.sin(a) * 0.16); can.add(b); }
    const halo = new T.Mesh(new T.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: ARCADE.glowTex(), color: hot('#ffffff', 0.6), transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); halo.position.y = 0.05; g.add(halo);
    const beamM = new T.MeshBasicMaterial({ color: hot('#ffffff', 0.25), transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide });
    const shaft = new T.Mesh(new T.CylinderGeometry(0.35, 0.6, 6, 16, 1, true).translate(0, 3, 0), beamM); g.add(shaft);
    can.visible = false; halo.visible = false; shaft.visible = false;
    g.userData = { h: 0.2, pad: { can, glowM, halo, shaft, beamM, ringM, dots, kind: null, appearT: 9 } };
    return g;
  }

  /* ---------- build every piece of every layout ---------- */
  P.build = function (K, hall) {
    const pc = { K, hall, map: new Map(), list: [], glowish: [], blinkers: [], swing: [], glass: [], neons: [], plat: null, t: 0 };
    pc.env = K3D.noRender ? null : mirrorEnv(K);
    pc.glassM = new T.MeshBasicMaterial({ color: new T.Color('#c8d4e0'), envMap: pc.env ? pc.env.rt.texture : null, reflectivity: 0.95, toneMapped: true });
    if (!pc.env) pc.glassM.color.set('#3a4658');
    pc.fingerM = new T.MeshBasicMaterial({ map: fingerTex(), transparent: true, depthWrite: false, toneMapped: false, opacity: 0.9 });
    // chrome reads its shine from a painted studio ball, not the live reflections (the cube camera sees the frames)
    pc.chromeM = new T.MeshMatcapMaterial({ matcap: chromeCap() });
    const root = new T.Group(); K.add(root); pc.root = root;
    for (let n = 1; n <= 5; n++) for (const p of AR.layout(n)) {
      const k = key(p);
      if (pc.map.has(k)) continue;
      let g;
      const look = p.look, alt = p.side === 1;
      if (p.k === 'pillar') g = pillar(K, p, pc);
      else if (p.k === 'wall') g = look === 'crates' ? (alt ? rockArch(K, p, pc) : crates(K, p)) : look === 'drums' ? (alt ? saucer(K, p, pc) : drums(K, p)) : look === 'chain' ? chain(K, p, pc) : tyres(K, p);
      else if (p.k === 'low') g = look === 'sandbags' ? sandbags(K, p) : hazard(K, p, pc);
      else if (p.k === 'riser') g = riser(K, p, pc);
      else if (p.k === 'start') g = start(K, p, pc);
      else if (p.k === 'mirror') g = mirror(K, p, pc);
      else if (p.k === 'turn') g = turn(K, p, pc);
      else if (p.k === 'button') g = button(K, p, pc);
      else if (p.k === 'prism') g = prism(K, p, pc);
      else if (p.k === 'spin') g = spin(K, p, pc);
      else if (p.k === 'pad') g = pad(K, p, pc);
      if (!g) continue;
      g.position.set(p.x, 0, p.z);
      if (!g.userData.ownRot && p.rot) g.rotation.y = p.rot;
      g.userData.live = true;
      const e = { k, p, g, f: 0, want: 0, h: g.userData.h || 1 };
      pc.map.set(k, e); pc.list.push(e); root.add(g);
      g.visible = false;
    }
    // the centre platform (round 5) and the light cables from each button to its mirror
    { const g = platform(K, pc); g.userData.live = true; root.add(g); pc.plat = { g, f: 0 }; g.visible = false; }
    pc.cables = [];
    for (const n of [3]) for (const b of AR.layout(n).filter(q => q.k === 'button')) {
      const m = AR.layout(n).find(q => q.k === 'turn' && q.id === b.mir); if (!m) continue;
      const pts = [], dx = m.x - b.x, dz = m.z - b.z, L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L, bow = (b.side ? -1 : 1) * Math.min(2.2, L * 0.18);
      for (let i = 0; i <= 24; i++) { const t = i / 24, s = Math.sin(t * Math.PI) * bow; pts.push(new T.Vector3(b.x + dx * t + nx * s, 0.03, b.z + dz * t + nz * s)); }
      const tex = runTex().clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(L * 1.5, 1);
      const cm = new T.MeshBasicMaterial({ map: tex, color: hot(ROOM.violet, 0.5), toneMapped: false, transparent: true, blending: T.AdditiveBlending, depthWrite: false });
      const tube = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 60, 0.03, 6, false), cm);
      const sheath = mk(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(v => v.clone().setY(0.02))), 60, 0.045, 6, false), toon('#1e1c24'), { inkW: 0.5 });
      const g = new T.Group(); g.add(sheath, tube); g.userData.live = true; g.visible = false; root.add(g);
      pc.cables.push({ g, cm, tex, b, mir: b.mir, pulse: 0, keyB: key(b) });
    }
    // floor slots glowing under pieces as they rise and sink (rebuilds)
    pc.slotM = new T.MeshBasicMaterial({ color: hot(ROOM.gold, 1), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
    for (const e of pc.list) {
      const p = e.p; let w = 0.9, d = 0.9;
      if (p.w) { w = p.w + 0.1; d = p.d + 0.1; } else if (p.r) { w = d = p.r * 2 + 0.15; } else if (p.len) { w = p.len + 0.1; d = 0.3; }
      const s = new T.Mesh(new T.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: K3D.paint('alp-slot', 64, 64, (c, W2, H2) => { c.clearRect(0, 0, W2, H2); c.strokeStyle = '#fff'; c.lineWidth = 5; c.strokeRect(3, 3, W2 - 6, H2 - 6); c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(0, 0, W2, H2); }), color: hot(ROOM.gold, 1), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      s.position.set(p.x, 0.016, p.z); s.rotation.y = p.k === 'mirror' || p.k === 'wall' || p.k === 'low' || p.k === 'riser' || p.k === 'start' ? (p.rot || 0) : 0;
      s.visible = false; root.add(s); e.slot = s;
    }
    pc.update = (K2, st, dt, view) => update(pc, K2, st, dt, view);
    return pc;
  };

  /* ---------- every drawn frame ---------- */
  const ease = x => x * x * (3 - 2 * x);
  function update(pc, K, st, dt, view) {
    const t = (pc.t += dt);
    // which pieces stand: the current layout; between rounds the old one sinks, then the new one rises
    let shown = new Set(st.layout.map(key)), rising = null, sinking = null, kSink = 0, kRise = 0;
    if (st.phase === 'between') {
      if (st.nextLayout) pc.oldKeys = shown;
      const oldK = pc.oldKeys || shown, newK = new Set((st.nextLayout || st.layout).map(key));
      sinking = new Set([...oldK].filter(k => !newK.has(k))); rising = new Set([...newK].filter(k => !oldK.has(k)));
      kSink = ease(Math.min(1, st.rebuild / 0.4)); kRise = ease(Math.max(0, Math.min(1, (st.rebuild - 0.45) / 0.4)));
      shown = new Set([...oldK].filter(k => newK.has(k)));
    } else pc.oldKeys = null;
    for (const e of pc.list) {
      let f;
      if (sinking && sinking.has(e.k)) f = 1 - kSink;
      else if (rising && rising.has(e.k)) f = kRise;
      else f = shown.has(e.k) ? 1 : 0;
      e.f = f;
      const g = e.g;
      g.visible = f > 0.001;
      g.position.y = -(1 - f) * e.h;
      // a glowing slot while it moves
      const moving = f > 0.001 && f < 0.999;
      e.slot.visible = moving; if (moving) e.slot.material.opacity = Math.sin(f * Math.PI) * 0.9 + 0.1;
    }
    // the platform (round 5) and the cables (round 3 on)
    const anySpin = pc.list.some(e => e.p.k === 'spin' && e.f > 0);
    const spinF = Math.max(0, ...pc.list.filter(e => e.p.k === 'spin').map(e => e.f));
    pc.plat.g.visible = anySpin; pc.plat.g.position.y = -(1 - spinF) * 0.3;
    for (const c of pc.cables) { const e = pc.map.get(c.keyB); c.g.visible = !!e && e.f > 0.5; }
    const layoutByI = st.layout;
    for (const e of pc.list) {
      if (!e.g.visible) continue;
      const p = e.p, u = e.g.userData;
      // the moving pieces follow the rules' numbers (only when this layout's piece is the one in st.layout)
      const live = layoutByI[p.i] && key(layoutByI[p.i]) === e.k ? layoutByI[p.i] : null;
      if (u.riser) {
        const r = live && st.risers[p.i] ? st.risers[p.i] : { h: 0, warn: false };
        const rr = u.riser;
        rr.panel.position.y = (r.h - 1) * H_RISE;
        for (const ps of rr.pistons) ps.scale.y = Math.max(0.02, r.h * H_RISE);
        const blink = r.warn ? (Math.floor(t * 6) % 2 ? 2.6 : 0.4) : (r.h > 0 ? 0.9 : 0.3);
        for (const lm of rr.lamps) lm.color.set(ROOM.gold).multiplyScalar(blink);
        rr.runM.color.set(ROOM.gold).multiplyScalar(r.warn ? 1.8 : 0.12);
        rr.rt.offset.x -= dt * (r.warn ? 3 : 0.3);
      }
      if (u.turn && live) u.turn.head.rotation.y = (st.turnAng[p.id] != null ? st.turnAng[p.id] : p.rot), u.turn.gear.rotation.z = -u.turn.head.rotation.y * 3;
      else if (u.turn) u.turn.head.rotation.y = p.rot;
      if (u.spin) {
        const a = (st.spinA || 0) + p.ph;
        e.g.position.x = Math.cos(a) * p.rad; e.g.position.z = -Math.sin(a) * p.rad; e.g.rotation.y = a + Math.PI / 2;
      }
      if (u.button) {
        const b = u.button, on = st.heroes.some(h => h.onBtn === p.i && live);
        b.pressT = on ? 1 : Math.max(0, b.pressT - dt * 4);
        b.dome.position.y = 0.05 - b.pressT * 0.035;
        b.domeM.color.set(ROOM.violet).multiplyScalar(1.2 + b.pressT * 1.6 + Math.sin(t * 3 + p.x) * 0.15);
        b.ringM.color.set(ROOM.gold).multiplyScalar(1.4 + Math.sin(t * 4 + p.z) * 0.4 + b.pressT);
      }
      if (u.prism) {
        u.prism.flash = Math.max(0, u.prism.flash - dt * 3);
        u.prism.coreM.color.set('#d8c8ff').multiplyScalar(1.3 + Math.sin(t * 2.3) * 0.25 + u.prism.flash * 3);
        u.prism.rb.rotation.y = t * 0.15;
      }
      if (u.pad) {
        const pd = u.pad, here = live ? st.pads[p.id] : null;
        if (here && pd.kind !== here.kind) { pd.kind = here.kind; pd.appearT = 0; pd.glowM.color.set(CAN_COL[here.kind]).multiplyScalar(2.2); pd.halo.material.color.set(CAN_COL[here.kind]).multiplyScalar(0.9); pd.beamM.color.set(CAN_COL[here.kind]).multiplyScalar(0.35); }
        if (!here) pd.kind = null;
        pd.appearT += dt;
        pd.can.visible = !!here; pd.halo.visible = !!here;
        pd.shaft.visible = !!here && pd.appearT < 0.9; if (pd.shaft.visible) pd.beamM.opacity = 1 - pd.appearT / 0.9;
        if (here) { pd.can.position.y = 0.72 + Math.sin(t * 2.4) * 0.08; pd.can.rotation.y = t * 1.6; const s = Math.min(1, pd.appearT / 0.3); pd.can.scale.setScalar(0.4 + 0.6 * s); }
        const k = here ? 1.6 : 0.5;
        pd.ringM.color.set(here ? CAN_COL[here.kind] : ROOM.gold).multiplyScalar(k);
        pd.dots.forEach((d, i) => { d.scale.setScalar(here && (Math.floor(t * 8) % 16 === i || Math.floor(t * 8 + 8) % 16 === i) ? 1.8 : 1); });
      }
    }
    // the platform's rim chase
    if (pc.plat.g.visible) { const pl = pc.plat.g.userData.plat; const n = pl.rim.length, hd = Math.floor(t * 12) % n; pl.rim.forEach((m, i) => m.color.set(ROOM.gold).multiplyScalar(((i - hd + n) % n) < 4 ? 2.6 : 0.5)); pc.plat.g.rotation.y = st.spinA || 0; }
    // the cables pulse when their button is pressed
    for (const e of st.fx) if (e.k === 'button' && e.n > (pc.fxSeen || 0)) for (const c of pc.cables) if (c.mir === e.mir) c.pulse = 1;
    for (const e of st.fx) if (e.k === 'fire' && e.prism && e.n > (pc.fxSeen || 0)) for (const q of pc.list) if (q.g.userData.prism && q.g.visible) q.g.userData.prism.flash = 1;
    pc.fxSeen = st.fxN;
    for (const c of pc.cables) { c.pulse = Math.max(0, c.pulse - dt * 1.5); c.tex.offset.x -= dt * (0.4 + c.pulse * 5); c.cm.color.set(ROOM.violet).multiplyScalar(0.5 + c.pulse * 2.5); }
    // blinkers and glow sticks
    for (const b of pc.blinkers) b.m.material.color.set(b.col).multiplyScalar(b.slow ? (Math.sin(t * 2 + b.ph) > 0.6 ? 2.6 : 0.5) : (Math.sin(t * 5 + b.ph) > 0 ? 2.6 : 0.8));
    for (const s of pc.swing) s.rotation.z = Math.sin(t * 1.3) * 0.25;
    // mirrors flash where a beam bounced; the neon breathes gently otherwise (no strobe)
    const flash = view && view.mirrorFlash || 0;
    for (const nm of pc.neons) nm.color.set(ROOM.gold).multiplyScalar(2.2 + flash * 0.8 + Math.sin(t * 1.5) * 0.15);
    // the reflections: the cube camera refreshes a few times a second (mirrors hidden while it looks)
    if (pc.env && K3D.R && !K3D.noRender) {
      pc.env.n++;
      if (pc.env.n % 6 === 1 && pc.list.some(e => e.g.visible && e.g.userData.mir)) {
        for (const gm of pc.glass) gm.visible = false;
        pc.env.cam.update(K3D.R, K.scene);
        for (const gm of pc.glass) gm.visible = true;
      }
    }
  }
  return P;
})();
