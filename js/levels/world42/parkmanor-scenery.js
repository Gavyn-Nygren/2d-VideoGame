/* Pip & Bo - 42-3 Spook Manor: the 3D scene. Loaded on demand with the 3D kit. Display only: it reads the rules' state
   (G.mst) and never changes it.

   Spook Manor is the walk-through at the far end of Starlight Park: a crooked wooden mansion with a neon ghost on the
   roof, a plywood graveyard in front, and inside a theme-park haunted house (painted, cobwebbed, crammed, and wired up
   with exit signs, cables and stage lights). The look:
     - one shadow-casting light, Pip's lantern: a warm pool with long moving shadows; the beam a cone in the dust
     - outside the pool the house is dim, never black: moonlight through tall windows (shafts and patches on the floor),
       green and purple stage spotlights that flicker, candles, neon, lightning, glowing eyes, light round door cracks
     - things happen at the edge of the light all the time (rats, a rocking chair, eyes that blink out, curtains
       breathing, a door that closes down the hall, a hand drawn back behind a curtain)
   The walls the camera looks through drop to a cut-away section (zone.cut), and the upper floor and roofs go when the
   pair are inside.

   PARKMANOR_SCENE.build(K, st)       once per scene
   PARKMANOR_SCENE.update(K, st, dt)  every drawn frame
   PARKMANOR_SCENE.camOverride = { eye, at, fov }   the look-shot tools hold the camera still with this
   PARKMANOR_SCENE.lampOff = true     the look-shot tools switch the lantern's light off (the comparison shot) */
'use strict';

const PARKMANOR_SCENE = (function () {
  const T = K3D.T, H = PARKMANOR_HOUSE, FIG = PARKMANOR_FIG, PML = PARKMANOR_LIGHT;
  const INK = '#15111f';
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const M = (key, make) => K3D.mat('pms|' + key, make);
  const mk = (geo, mat, o) => K3D.mesh(geo, mat, o || { ink: INK, inkW: 0.6 });
  const V = (x, y, z) => new T.Vector3(x, y, z);
  let rnd = (() => { let s = 777; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const reseed = () => { let s = 777; rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
  const SC = {};

  /* =============================== painted textures =============================== */
  const tornEdge = (c, x, y, w, h, col, k = 1) => {
    // a torn patch of paper gone (plaster showing), ragged edges and a curled strip's shadow
    c.fillStyle = col; c.beginPath(); c.moveTo(x, y);
    for (let i = 0; i <= 10; i++) c.lineTo(x + w * i / 10, y + (rnd() - 0.5) * 8 * k);
    for (let i = 0; i <= 14; i++) c.lineTo(x + w + (rnd() - 0.5) * 8 * k, y + h * i / 14);
    for (let i = 10; i >= 0; i--) c.lineTo(x + w * i / 10, y + h + (rnd() - 0.5) * 10 * k);
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(20,10,20,0.45)'; c.lineWidth = 2; c.stroke();
  };
  const stains = (c, w, h, n, col) => { for (let i = 0; i < n; i++) { const x = rnd() * w, y = rnd() * h * 0.5, r = 20 + rnd() * 60; const g = c.createRadialGradient(x, y, 0, x, y + r * 0.8, r * 1.4); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r * 1.5, y - r, r * 3, r * 3.4); } };
  const damask = (c, x, y, s, col) => {
    c.fillStyle = col; c.save(); c.translate(x, y); c.scale(s, s);
    c.beginPath(); c.moveTo(0, -30); c.bezierCurveTo(14, -20, 18, -6, 6, 4); c.bezierCurveTo(16, 10, 18, 22, 0, 32); c.bezierCurveTo(-18, 22, -16, 10, -6, 4); c.bezierCurveTo(-18, -6, -14, -20, 0, -30); c.fill();
    for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 16, -4, 7, 3, sx * 0.6, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(sx * 12, 18, 3, 0, Math.PI * 2); c.fill(); }
    c.restore();
  };
  // the hall: plum damask over a dark panelled dado, a crown band; peeling strips and damp
  const paperHall = () => K3D.paint('pm-paperHall', 256, 820, (c, w, h) => {
    const dado = h * (1 - 1.3 / 6.4), crown = h * 0.05;
    c.fillStyle = '#3c2444'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) { c.fillStyle = 'rgba(90,50,96,0.35)'; c.fillRect(x + 28, 0, 8, h); }
    for (let y = crown + 30, r = 0; y < dado - 20; y += 86, r++) for (let x = (r % 2) * 64; x < w + 64; x += 128) damask(c, x, y, 1.05, 'rgba(112,70,118,0.85)');
    for (let y = crown + 30, r = 0; y < dado - 20; y += 86, r++) for (let x = (r % 2) * 64; x < w + 64; x += 128) damask(c, x + 1, y - 2, 0.5, 'rgba(176,196,120,0.18)');
    stains(c, w, dado, 6, 'rgba(60,40,20,0.35)');
    tornEdge(c, 40, 230, 70, 120, '#8a7a6a'); tornEdge(c, 170, 470, 50, 90, '#7a6a5e'); tornEdge(c, 120, 120, 40, 60, '#8a7a6a', 0.6);
    // a curled strip hanging off one patch (its shadow)
    c.fillStyle = 'rgba(10,5,15,0.35)'; c.beginPath(); c.moveTo(110, 350); c.quadraticCurveTo(130, 400, 116, 440); c.lineTo(104, 438); c.quadraticCurveTo(116, 400, 98, 352); c.fill();
    // crown band and picture rail
    c.fillStyle = '#2a1820'; c.fillRect(0, 0, w, crown); c.fillStyle = '#b08a4a'; c.fillRect(0, crown - 6, w, 4); c.fillRect(0, crown + 80, w, 3);
    // the dado: panels
    c.fillStyle = '#2e1a14'; c.fillRect(0, dado, w, h - dado);
    c.fillStyle = '#8a6a3a'; c.fillRect(0, dado - 4, w, 8); c.fillStyle = '#1a0e0a'; c.fillRect(0, dado + 4, w, 3);
    for (let x = 8; x < w; x += 128) { c.strokeStyle = '#4a2e22'; c.lineWidth = 6; c.strokeRect(x + 6, dado + 22, 104, h - dado - 50); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 2; c.strokeRect(x + 12, dado + 28, 92, h - dado - 62); }
    c.fillStyle = '#140a08'; c.fillRect(0, h - 16, w, 16);
    // grime toward the floor
    const g = c.createLinearGradient(0, dado - 120, 0, dado); g.addColorStop(0, 'rgba(20,10,10,0)'); g.addColorStop(1, 'rgba(20,10,10,0.35)'); c.fillStyle = g; c.fillRect(0, dado - 120, w, 120);
  }, { repeat: true });
  // the corridor: sickly green stripes with tiny fleurs, a dado; damp and peeling
  const paperCor = () => K3D.paint('pm-paperCor', 256, 460, (c, w, h) => {
    const dado = h * (1 - 1.0 / 3.6);
    c.fillStyle = '#26443a'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { c.fillStyle = 'rgba(70,110,86,0.55)'; c.fillRect(x, 0, 12, dado); c.fillStyle = 'rgba(190,170,90,0.25)'; c.fillRect(x + 14, 0, 2, dado); }
    for (let y = 20; y < dado; y += 40) for (let x = 24; x < w; x += 64) { c.fillStyle = 'rgba(200,180,110,0.35)'; c.beginPath(); c.arc(x + ((y / 40) % 2) * 32, y, 4, 0, Math.PI * 2); c.fill(); }
    stains(c, w, dado, 5, 'rgba(50,40,10,0.4)');
    tornEdge(c, 60, 90, 60, 100, '#7a7060'); tornEdge(c, 180, 200, 40, 70, '#6a6458', 0.7);
    c.fillStyle = '#24140e'; c.fillRect(0, dado, w, h - dado);
    c.fillStyle = '#7a5a2e'; c.fillRect(0, dado - 3, w, 7);
    for (let x = 0; x < w; x += 64) { c.strokeStyle = '#3a2418'; c.lineWidth = 4; c.strokeRect(x + 6, dado + 14, 52, h - dado - 34); }
    c.fillStyle = '#120806'; c.fillRect(0, h - 12, w, 12);
  }, { repeat: true });
  // weathered clapboard (outside walls): grey-violet boards, dark gaps, peeling paint, knots
  const clap = () => K3D.paint('pm-clap', 256, 256, (c, w, h) => {
    c.fillStyle = '#4a4560'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      const g = c.createLinearGradient(0, y, 0, y + 32); g.addColorStop(0, '#5a5474'); g.addColorStop(0.85, '#433e58'); g.addColorStop(1, '#221e30');
      c.fillStyle = g; c.fillRect(0, y, w, 32);
      for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(140,120,100,0.35)'; c.fillRect(rnd() * w, y + 6 + rnd() * 18, 10 + rnd() * 40, 3 + rnd() * 4); }
      if (rnd() < 0.5) { c.fillStyle = 'rgba(30,20,30,0.5)'; c.beginPath(); c.ellipse(rnd() * w, y + 16, 5, 3, 0, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect((y * 7) % w, y, 3, 32);
    }
  }, { repeat: true });
  const checker = () => K3D.paint('pm-checker', 512, 512, (c, w, h) => {
    const n = 5, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const dark = (i + j) % 2;
      c.fillStyle = dark ? '#142824' : '#8a826c'; c.fillRect(i * s, j * s, s, s);
      const g = c.createLinearGradient(i * s, j * s, i * s + s, j * s + s); g.addColorStop(0, 'rgba(255,255,255,' + (dark ? 0.08 : 0.16) + ')'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(i * s, j * s, s, s);
      if (rnd() < 0.25) { c.strokeStyle = dark ? 'rgba(160,200,180,0.25)' : 'rgba(40,30,20,0.4)'; c.lineWidth = 1.5; c.beginPath(); let x = i * s + rnd() * s, y = j * s; c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 30; y += s / 5; c.lineTo(x, y); } c.stroke(); }
    }
    c.strokeStyle = 'rgba(10,8,8,0.55)'; c.lineWidth = 3; for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * s, 0); c.lineTo(i * s, h); c.stroke(); c.beginPath(); c.moveTo(0, i * s); c.lineTo(w, i * s); c.stroke(); }
    stains(c, w, h * 2, 5, 'rgba(40,30,20,0.25)');
  }, { repeat: true });
  const boards = () => K3D.paint('pm-boards', 256, 512, (c, w, h) => {
    for (let x = 0; x < w; x += 32) {
      const base = ['#3a2418', '#42291c', '#352016', '#4a2e1e'][(x / 32) % 4];
      c.fillStyle = base; c.fillRect(x, 0, 32, h);
      for (let k = 0; k < 7; k++) { c.strokeStyle = 'rgba(20,10,5,0.35)'; c.lineWidth = 1; c.beginPath(); const xx = x + 4 + rnd() * 24; c.moveTo(xx, 0); c.bezierCurveTo(xx + 6, h * 0.3, xx - 6, h * 0.6, xx + 3, h); c.stroke(); }
      c.fillStyle = 'rgba(255,230,190,0.07)'; c.fillRect(x + 3, 0, 8, h);
      c.fillStyle = '#120806'; c.fillRect(x, 0, 2, h);
      const cut = rnd() * h; c.fillRect(x, cut, 32, 2);
      c.fillStyle = '#1a1a1e'; c.fillRect(x + 6, cut + 6, 3, 3); c.fillRect(x + 22, cut + 6, 3, 3);
    }
  }, { repeat: true });
  const runner = () => K3D.paint('pm-runner', 128, 512, (c, w, h) => {
    c.fillStyle = '#6a1424'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c8a050'; c.fillRect(6, 0, 6, h); c.fillRect(w - 12, 0, 6, h);
    c.fillStyle = '#3a0a14'; c.fillRect(16, 0, 4, h); c.fillRect(w - 20, 0, 4, h);
    for (let y = 30; y < h; y += 64) { c.fillStyle = '#a07a3a'; c.beginPath(); c.moveTo(w / 2, y - 20); c.lineTo(w / 2 + 22, y); c.lineTo(w / 2, y + 20); c.lineTo(w / 2 - 22, y); c.closePath(); c.fill(); c.fillStyle = '#6a1424'; c.beginPath(); c.arc(w / 2, y, 8, 0, Math.PI * 2); c.fill(); }
    for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(30,10,10,0.3)'; c.beginPath(); c.ellipse(w / 2 + (rnd() - 0.5) * 50, rnd() * h, 20 + rnd() * 20, 40 + rnd() * 50, 0, 0, Math.PI * 2); c.fill(); }
  }, { repeat: true });
  const shingles = () => K3D.paint('pm-shingle', 256, 256, (c, w, h) => {
    c.fillStyle = '#231e30'; c.fillRect(0, 0, w, h);
    for (let y = 0, r = 0; y < h; y += 24, r++) for (let x = (r % 2) * 16 - 16; x < w; x += 32) {
      const sh = 0.8 + rnd() * 0.4;
      c.fillStyle = `rgb(${Math.round(58 * sh)},${Math.round(50 * sh)},${Math.round(78 * sh)})`; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30, y); c.lineTo(x + 30, y + 18); c.arc(x + 15, y + 18, 15, 0, Math.PI); c.closePath(); c.fill();
      c.strokeStyle = '#120e1a'; c.lineWidth = 2; c.stroke();
      if (rnd() < 0.12) { c.fillStyle = 'rgba(90,120,70,0.5)'; c.beginPath(); c.arc(x + 15, y + 22, 8, 0, Math.PI * 2); c.fill(); }
    }
  }, { repeat: true });
  // a tall window from inside: the stormy night, rain streaks (the texture scrolls), a moon glow
  const nightGlass = () => K3D.paint('pm-nightGlass', 128, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a3070'); g.addColorStop(0.6, '#3a3a86'); g.addColorStop(1, '#5a4a8a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    const m = c.createRadialGradient(w * 0.7, h * 0.2, 2, w * 0.7, h * 0.2, 60); m.addColorStop(0, 'rgba(230,236,255,0.9)'); m.addColorStop(1, 'rgba(160,170,255,0)'); c.fillStyle = m; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(20,16,40,0.9)'; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 8) c.lineTo(x, h * 0.78 - Math.sin(x * 0.2) * 6 - rnd() * 10); c.lineTo(w, h); c.fill();
  });
  const rainTex = () => K3D.paint('pm-rain', 128, 256, (c, w, h) => {
    for (let i = 0; i < 70; i++) { const x = rnd() * w, y = rnd() * h, l = 10 + rnd() * 30; c.strokeStyle = `rgba(210,220,255,${0.25 + rnd() * 0.4})`; c.lineWidth = 1 + rnd(); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 2, y + l); c.stroke(); }
    for (let i = 0; i < 26; i++) { const x = rnd() * w, y = rnd() * h; c.fillStyle = 'rgba(220,230,255,0.5)'; c.beginPath(); c.arc(x, y, 1.5 + rnd() * 2, 0, Math.PI * 2); c.fill(); }
  }, { repeat: true });
  // painted fish-scale shingles for the front gable: rows of round-bottomed scales, every other row offset, some
  // scales a different shade, and a peeling streak or two
  const fishScale = () => { const tx = K3D.paint('pm-fishScale', 256, 256, (c, w, h) => {
    c.fillStyle = '#4a3a5a'; c.fillRect(0, 0, w, h);
    const sw = 32, sh = 26;
    for (let r = -1; r < h / sh + 1; r++) for (let i = -1; i < w / sw + 1; i++) {
      const x = i * sw + (r % 2 ? sw / 2 : 0), y = r * sh, k = rnd();
      c.fillStyle = k < 0.15 ? '#6a4a6a' : k < 0.3 ? '#3e3250' : '#584468';
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + sw, y); c.lineTo(x + sw, y + sh * 0.55); c.arc(x + sw / 2, y + sh * 0.55, sw / 2, 0, Math.PI); c.closePath(); c.fill();
      c.strokeStyle = '#2a2034'; c.lineWidth = 2; c.stroke();
      c.strokeStyle = 'rgba(200,170,220,0.25)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x + sw / 2, y + sh * 0.55, sw / 2 - 3, 0.3, Math.PI - 0.3); c.stroke();
    }
    c.fillStyle = 'rgba(20,14,26,0.35)'; for (let i = 0; i < 3; i++) c.fillRect(rnd() * w, 0, 3 + rnd() * 4, h);
  }); tx.wrapS = tx.wrapT = T.RepeatWrapping; return tx; };
  // louvred shutters (painted, chipped)
  const shutterTex = (col) => K3D.paint('pm-shutter|' + col, 64, 160, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 3; c.strokeRect(4, 4, w - 8, h - 8);
    for (let y = 14; y < h - 10; y += 8) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(8, y, w - 16, 3); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(8, y - 2, w - 16, 2); }
    c.fillStyle = 'rgba(140,120,100,0.6)'; for (let i = 0; i < 6; i++) c.fillRect(rnd() * w, rnd() * h, 3 + rnd() * 8, 2 + rnd() * 5);
  });
  const velvet = (col) => K3D.paint('pm-velvet|' + col, 128, 256, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { const g = c.createLinearGradient(x, 0, x + 16, 0); g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(0.5, 'rgba(255,220,240,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); c.fillStyle = g; c.fillRect(x, 0, 16, h); }
    c.fillStyle = 'rgba(200,170,80,0.8)'; c.fillRect(0, h - 10, w, 6);
  }, { repeat: true });
  const cobwebTex = () => K3D.paint('pm-cobweb', 128, 128, (c, w, h) => {
    c.strokeStyle = 'rgba(230,230,245,0.55)'; c.lineWidth = 1;
    for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI / 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * w * 1.1, Math.sin(a) * h * 1.1); c.stroke(); }
    for (let r = 14; r < w; r += 13 + rnd() * 6) { c.beginPath(); for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2, rr = r * (0.92 + Math.sin(i * 1.7) * 0.05); const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? c.quadraticCurveTo(Math.cos(a - 0.1) * rr * 0.9, Math.sin(a - 0.1) * rr * 0.9, x, y) : c.moveTo(x, y); } c.stroke(); }
  });
  const fogTex = () => K3D.paint('pm-fog', 256, 256, (c, w, h) => {
    for (let i = 0; i < 90; i++) { const x = 30 + rnd() * (w - 60), y = 30 + rnd() * (h - 60), r = 20 + rnd() * 50; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,0.14)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
  });
  const stoneTex = (name, i) => K3D.paint('pm-stone|' + i, 256, 256, (c, w, h) => {
    c.save(); c.beginPath(); c.moveTo(20, h); c.lineTo(20, 90); c.arc(w / 2, 90, w / 2 - 20, Math.PI, 0); c.lineTo(w - 20, h); c.closePath(); c.clip();
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, ['#8a8aa0', '#7a8090', '#908a9a'][i % 3]); g.addColorStop(1, '#4a4a5e'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 40; k++) { c.fillStyle = `rgba(${rnd() < 0.5 ? '30,30,40' : '200,200,210'},0.12)`; c.beginPath(); c.arc(rnd() * w, rnd() * h, 2 + rnd() * 8, 0, Math.PI * 2); c.fill(); }
    // moss and a crack painted on (it is plywood: the paint has chipped at the edge to show wood)
    c.fillStyle = 'rgba(70,110,60,0.55)'; for (let k = 0; k < 8; k++) { c.beginPath(); c.arc(30 + rnd() * 50, h - 10 - rnd() * 40, 6 + rnd() * 10, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = 'rgba(20,20,30,0.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(w * 0.7, 60); c.lineTo(w * 0.62, 110); c.lineTo(w * 0.72, 150); c.stroke();
    c.fillStyle = '#b8884a'; c.fillRect(w - 40, 150, 20, 26);
    c.fillStyle = '#2a2a3a'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 30px "DejaVu Serif", serif'; c.fillText('R.I.P.', w / 2, 74);
    const words = name.replace(/^R\.I\.P\. /, '').split(' '); const lines = [];
    let cur = ''; for (const wd of words) { if ((cur + ' ' + wd).trim().length > 11) { lines.push(cur.trim()); cur = wd; } else cur += ' ' + wd; } lines.push(cur.trim());
    c.font = '700 25px "DejaVu Serif", serif'; lines.forEach((l, k) => c.fillText(l, w / 2, 122 + k * 30));
    c.font = '18px "DejaVu Serif", serif'; c.fillText('1888 - 1888', w / 2, 122 + lines.length * 30 + 8);
    c.restore();
    c.strokeStyle = '#1a1a26'; c.lineWidth = 6; c.beginPath(); c.moveTo(20, h); c.lineTo(20, 90); c.arc(w / 2, 90, w / 2 - 20, Math.PI, 0); c.lineTo(w - 20, h); c.stroke();
  });
  const signTex = (kind) => K3D.paint('pm-sign|' + kind, 256, 96, (c, w, h) => {
    const S = { exit: ['#0e3a22', '#7affb0', 'EXIT'], staff: ['#f2e6c8', '#2a1a14', 'STAFF ONLY'], flash: ['#2a1a2e', '#ffcf6a', 'NO FLASH PHOTOS'], path: ['#3a2a1e', '#f2e6c8', 'KEEP TO THE PATH'], tour: ['#1a1428', '#c9a8ff', 'TOUR CONTINUES'], step: ['#ffd23a', '#1a1626', 'MIND THE STEP'], quiet: ['#2a1a2e', '#ff9ad0', 'QUIET PLEASE'], gift: ['#16302a', '#ffe9a8', 'GIFT SHOP THIS WAY'] }[kind];
    c.fillStyle = S[0]; c.fillRect(0, 0, w, h); c.strokeStyle = S[1]; c.lineWidth = 5; c.strokeRect(5, 5, w - 10, h - 10);
    c.fillStyle = S[1]; c.font = `900 ${S[2].length > 10 ? 26 : 44}px "DejaVu Sans", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(S[2], w / 2 + (kind === 'exit' || kind === 'tour' || kind === 'gift' ? -10 : 0), h / 2 + 2);
    if (kind === 'exit' || kind === 'tour' || kind === 'gift') { c.beginPath(); c.moveTo(w - 40, 30); c.lineTo(w - 20, h / 2); c.lineTo(w - 40, h - 30); c.lineWidth = 7; c.stroke(); }
  });
  const portraitTex = (k) => K3D.paint('pm-portrait|' + k, 192, 256, (c, w, h) => {
    const bg = ['#2a1e30', '#1e2a28', '#30201a', '#22223a', '#2a2418'][k];
    const g = c.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h * 0.45, h * 0.7); g.addColorStop(0, bg.replace('#', '#') ); g.addColorStop(0, '#5a4a40'); g.addColorStop(1, bg); c.fillStyle = g; c.fillRect(0, 0, w, h);
    const sk = ['#e8d2b8', '#d8c0a0', '#f0dac4', '#c8b098', '#e0c8b0'][k];
    if (k === 0) { // a lady with a high collar and a towering wig
      c.fillStyle = '#d8d0e0'; c.beginPath(); c.ellipse(w / 2, 60, 46, 56, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = sk; c.beginPath(); c.ellipse(w / 2, 112, 30, 38, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3a1a3a'; c.fillRect(w / 2 - 50, 160, 100, 100); c.fillStyle = '#f2ece0'; c.beginPath(); c.moveTo(w / 2 - 48, 150); c.lineTo(w / 2, 175); c.lineTo(w / 2 + 48, 150); c.lineTo(w / 2 + 40, 140); c.lineTo(w / 2, 158); c.lineTo(w / 2 - 40, 140); c.fill();
    } else if (k === 1) { // a pig in a ruff
      c.fillStyle = '#e8a8a8'; c.beginPath(); c.ellipse(w / 2, 110, 46, 42, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(w / 2, 124, 18, 13, 0, 0, Math.PI * 2); c.fillStyle = '#d88888'; c.fill();
      c.fillStyle = '#5a2a2a'; c.beginPath(); c.arc(w / 2 - 6, 124, 3, 0, Math.PI * 2); c.arc(w / 2 + 6, 124, 3, 0, Math.PI * 2); c.fill();
      for (const sx of [-1, 1]) { c.fillStyle = '#e8a8a8'; c.beginPath(); c.moveTo(w / 2 + sx * 30, 80); c.lineTo(w / 2 + sx * 46, 56); c.lineTo(w / 2 + sx * 44, 90); c.fill(); }
      c.fillStyle = '#f6f2ea'; for (let i = 0; i < 12; i++) { c.beginPath(); c.ellipse(w / 2 - 55 + i * 10, 160, 8, 14, 0, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#2a3a5a'; c.fillRect(w / 2 - 54, 172, 108, 90);
    } else if (k === 2) { // a stern gentleman, a vast moustache
      c.fillStyle = '#2a2018'; c.fillRect(w / 2 - 34, 50, 68, 30);
      c.fillStyle = sk; c.beginPath(); c.ellipse(w / 2, 108, 32, 42, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#4a3020'; c.beginPath(); c.moveTo(w / 2, 126); c.bezierCurveTo(w / 2 + 30, 116, w / 2 + 52, 136, w / 2 + 56, 120); c.bezierCurveTo(w / 2 + 50, 146, w / 2 + 20, 138, w / 2, 134); c.bezierCurveTo(w / 2 - 20, 138, w / 2 - 50, 146, w / 2 - 56, 120); c.bezierCurveTo(w / 2 - 52, 136, w / 2 - 30, 116, w / 2, 126); c.fill();
      c.fillStyle = '#16121a'; c.fillRect(w / 2 - 56, 160, 112, 100); c.fillStyle = '#e8e0d0'; c.fillRect(w / 2 - 10, 156, 20, 40);
    } else if (k === 3) { // a cat in a crown
      c.fillStyle = '#3a3440'; c.beginPath(); c.ellipse(w / 2, 116, 44, 40, 0, 0, Math.PI * 2); c.fill();
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(w / 2 + sx * 18, 84); c.lineTo(w / 2 + sx * 40, 60); c.lineTo(w / 2 + sx * 42, 96); c.fill(); }
      c.fillStyle = '#e8c04a'; c.beginPath(); c.moveTo(w / 2 - 26, 82); for (let i = 0; i <= 4; i++) c.lineTo(w / 2 - 26 + i * 13, i % 2 ? 66 : 54); c.lineTo(w / 2 + 26, 82); c.fill();
      c.fillStyle = '#f6f2ea'; c.beginPath(); c.ellipse(w / 2, 130, 14, 9, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#7a1a2a'; c.fillRect(w / 2 - 54, 164, 108, 100);
    } else { // a child with a doll (the doll's head turned the wrong way)
      c.fillStyle = '#5a3a2a'; c.beginPath(); c.ellipse(w / 2, 96, 34, 40, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = sk; c.beginPath(); c.ellipse(w / 2, 110, 26, 32, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#d8d0c0'; c.fillRect(w / 2 - 44, 150, 88, 110); c.fillStyle = '#f0e0d0'; c.beginPath(); c.arc(w / 2 + 30, 186, 14, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2a1a1a'; c.beginPath(); c.arc(w / 2 + 30, 180, 10, Math.PI, 0); c.fill();
    }
    // the eyes are holes (real eyes behind them follow the pair): dark sockets
    if (k !== 3) { c.fillStyle = '#0a0608'; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(w / 2 + sx * 11, k === 1 ? 100 : 104, 6, 4, 0, 0, Math.PI * 2); c.fill(); } }
    else { c.fillStyle = '#0a0608'; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(w / 2 + sx * 15, 110, 6, 5, 0, 0, Math.PI * 2); c.fill(); } }
    c.fillStyle = 'rgba(255,240,200,0.06)'; c.fillRect(0, 0, w, h);
    const v = c.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
  });
  const neonGhostTex = () => K3D.paint('pm-neonGhost', 256, 256, (c, w, h) => {
    const tube = (col, lw, blur) => { c.shadowColor = col; c.shadowBlur = blur; c.strokeStyle = col; c.lineWidth = lw; c.lineJoin = c.lineCap = 'round';
      c.beginPath(); c.moveTo(70, 200); c.lineTo(70, 100); c.arc(128, 100, 58, Math.PI, 0); c.lineTo(186, 200);
      for (let i = 0; i < 4; i++) { const x0 = 186 - i * 29; c.quadraticCurveTo(x0 - 7, 220, x0 - 14.5, 200); c.quadraticCurveTo(x0 - 22, 180, x0 - 29, 200); } c.stroke();
      for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(128 + sx * 22, 106, 9, 15, 0, 0, Math.PI * 2); c.stroke(); }
      c.beginPath(); c.ellipse(128, 150, 14, 18, 0, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(70, 140); c.quadraticCurveTo(30, 120, 20, 80); c.moveTo(186, 140); c.quadraticCurveTo(226, 120, 236, 80); c.stroke(); };
    tube('rgba(120,255,190,0.5)', 14, 18); tube('#e6fff4', 4, 6);
  });
  const crackTex = () => K3D.paint('pm-crack', 32, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const footTex = () => K3D.paint('pm-feet', 64, 256, (c, w, h) => {
    for (let i = 0; i < 6; i++) { const x = i % 2 ? 40 : 22, y = 20 + i * 40; c.fillStyle = 'rgba(30,20,20,0.45)'; c.beginPath(); c.ellipse(x, y, 7, 13, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(x, y + 18, 6, 6, 0, 0, Math.PI * 2); c.fill(); }
  });
  const patchTex = () => K3D.paint('pm-moonPatch', 128, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0.2)'); g.addColorStop(1, 'rgba(255,255,255,0.9)');
    c.fillStyle = g; for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) c.fillRect(8 + i * (w / 2), 8 + j * (h / 4), w / 2 - 16, h / 4 - 14);
  });
  const shaftTex = () => K3D.paint('pm-shaft', 64, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); const v = c.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,0.3)'); v.addColorStop(0.7, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)'); c.globalCompositeOperation = 'destination-in'; c.fillStyle = v; c.fillRect(0, 0, w, h); });
  const poolTex = () => K3D.paint('pm-pool', 256, 256, (c, w, h) => { const g = c.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.55)'); g.addColorStop(0.85, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });

  /* =============================== shared materials =============================== */
  const toonT = (key, col, map, o = {}) => M(key, () => K3D.toon(col, Object.assign({ map }, o)));
  const wood = (col = '#4a2e22') => toonT('wood' + col, '#ffffff', PARK.wood(col));
  const iron = () => M('iron', () => K3D.toon('#24202e'));
  const glowM = (col, k, o = {}) => M('glow|' + col + k + JSON.stringify(o), () => K3D.flat(hot(col, k), Object.assign({ transparent: true, depthWrite: false, add: true }, o)));
  const sprite = (K, parent, x, y, z, size, col, k = 0.6) => {
    const m = new T.Sprite(new T.SpriteMaterial({ map: PARK.glowTex(), color: hot(col, k), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
    m.position.set(x, y, z); m.scale.set(size, size, 1); (parent || K.root).add(m); return m;
  };

  // a box whose faces are textured in world units (sc(face, faceW, faceH) -> [u scale, v scale])
  function uvBox(w, h, d, sc) {
    const g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) { const [su, sv] = sc(f, dims[f][0], dims[f][1]); for (let i = f * 4; i < f * 4 + 4; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); }
    return g;
  }
  const flatPlane = (w, h, mat) => new T.Mesh(new T.PlaneGeometry(w, h), mat);

  /* =============================== the house shell =============================== */
  const ROOM = { hall: H.art.hall, corridor: H.art.corridor, passage: H.art.passage, dining: H.art.dining, kitchen: H.art.kitchen, gallery: H.art.gallery,
    library: H.art.library, organ: H.art.organ, nursery: H.art.nursery, bedroom: H.art.bedroom, stairs: H.art.stairs, attic: H.art.attic, ballroom: H.art.ballroom };
  // which far group a room belongs to (S1 the front: outside, the hall, the corridor; S2 behind; S3 upstairs; S4a the
  // attic; S4b the ballroom): only the groups the zone lists are drawn
  const REG = { hall: 'S1', corridor: 'S1', passage: 'S2', dining: 'S2', kitchen: 'S2', gallery: 'S3', library: 'S3', organ: 'S3', nursery: 'S3', bedroom: 'S3', stairs: 'S4a', attic: 'S4a', ballroom: 'S4b' };
  const ZREG = { path: 'S1', hall: 'S1', corridor: 'S1', vest: 'S2', passage: 'S2', dining: 'S2', kitchen: 'S2', gallery: 'S3', library: 'S3', organ: 'S3', nursery: 'S3', bedroom: 'S3', stairs: 'S4a', attic: 'S4a', ballroom: 'S4b', exit: 'S4b' };
  const regAt = (x, z) => { const zn = H.zoneAt(x, z); return zn ? ZREG[zn.id] : 'S1'; };
  const showsOf = zn => zn.show.concat(['path', 'hall', 'corridor', 'vest', 'passage'].includes(zn.id) ? ['S1'] : []);
  const roomsOf = s => s.rooms || [s.room || (s.id && s.id.startsWith('hall') ? 'hall' : 'corridor')];
  const CUT_H = 0.95;
  // each room's wallpaper (full height, the dado at the bottom): a pattern over a base, a dado, damp and tears
  const paperRoom = (rm) => {
    const R = ROOM[rm], hh = R.h, fy = R.y || 0;
    const P = {
      passage: ['#2e3a2a', 'stripe', 'rgba(80,100,70,0.5)', '#2a1e14', 1.0], dining: ['#4a1420', 'damask', 'rgba(150,50,60,0.75)', '#2a140e', 1.2],
      kitchen: ['#3a4a3a', 'tile', '#d8d4c4', '#3a3a34', 1.6], gallery: ['#1e3428', 'stripe', 'rgba(200,170,90,0.35)', '#20140e', 1.2],
      library: ['#2a1a12', 'panel', '#4a2e1e', '#1e120c', 1.4], organ: ['#2a1a12', 'panel', '#4a2e1e', '#1e120c', 1.4],
      nursery: ['#a89ab8', 'nursery', '#d8c8e0', '#6a5a7a', 1.0], bedroom: ['#243050', 'floral', 'rgba(150,170,220,0.5)', '#1a1420', 1.1],
      stairs: ['#3a2a20', 'boards', '#2a1c14', '#1e140e', 0.6], attic: ['#3a2c22', 'boards', '#2a1c14', '#1e140e', 0.5],
      ballroom: ['#e8dcc0', 'ball', '#c8a050', '#5a3a2a', 1.4],
    }[rm];
    if (!P) return null;
    const [base, kind, col, dadoCol, dadoU] = P;
    return K3D.paint('pm-paper|' + rm, 256, Math.round(128 * hh), (c, w, h) => {
      const dado = h * (1 - (fy + dadoU) / hh);
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      if (kind === 'stripe') for (let x = 0; x < w; x += 32) { c.fillStyle = col; c.fillRect(x, 0, 10, dado); c.fillRect(x + 16, 0, 2, dado); }
      if (kind === 'damask') for (let y = 40, r = 0; y < dado - 20; y += 86, r++) for (let x = (r % 2) * 64; x < w + 64; x += 128) { damask(c, x, y, 1.0, col); damask(c, x, y - 2, 0.45, 'rgba(220,180,90,0.25)'); }
      if (kind === 'floral') for (let y = 30, r = 0; y < dado; y += 50, r++) for (let x = (r % 2) * 32; x < w + 32; x += 64) { c.fillStyle = col; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; c.beginPath(); c.ellipse(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 6, 3.5, a, 0, Math.PI * 2); c.fill(); } c.fillStyle = 'rgba(230,200,120,0.5)'; c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill(); }
      if (kind === 'tile') { const ty = h * (1 - (fy + 2.2) / hh); c.fillStyle = col; c.fillRect(0, ty, w, dado - ty); c.strokeStyle = 'rgba(60,60,50,0.55)'; c.lineWidth = 2; for (let y = ty; y < dado; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } for (let x = 0; x < w; x += 24) { c.beginPath(); c.moveTo(x, ty); c.lineTo(x, dado); c.stroke(); } c.fillStyle = '#2a6a5a'; c.fillRect(0, ty, w, 8); for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(120,90,40,0.25)'; c.fillRect(rnd() * w, ty + rnd() * (dado - ty), 30, 50); } }
      if (kind === 'panel') { for (let x = 0; x < w; x += 128) { c.fillStyle = col; c.fillRect(x + 10, 20, 108, dado - 40); c.strokeStyle = '#140a06'; c.lineWidth = 4; c.strokeRect(x + 10, 20, 108, dado - 40); c.strokeStyle = 'rgba(200,150,90,0.18)'; c.lineWidth = 2; c.strokeRect(x + 18, 28, 92, dado - 56); } }
      if (kind === 'boards') { for (let x = 0; x < w; x += 28) { c.fillStyle = ['#3a2a20', '#33241a', '#40301f'][(x / 28) % 3]; c.fillRect(x, 0, 28, h); c.fillStyle = '#140c08'; c.fillRect(x, 0, 2, h); for (let k = 0; k < 3; k++) { c.strokeStyle = 'rgba(20,10,5,0.35)'; c.beginPath(); const xx = x + 5 + rnd() * 18; c.moveTo(xx, 0); c.bezierCurveTo(xx + 5, h * 0.3, xx - 5, h * 0.6, xx + 2, h); c.stroke(); } } }
      if (kind === 'nursery') { for (let x = 0; x < w; x += 42) { c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x, 0, 18, dado); } for (let y = 50, r = 0; y < dado - 30; y += 90, r++) for (let x = (r % 2) * 64 + 20; x < w; x += 128) { c.fillStyle = 'rgba(240,220,120,0.7)'; c.beginPath(); c.ellipse(x, y, 14, 9, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(x + 12, y - 9, 7, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(230,140,60,0.8)'; c.beginPath(); c.moveTo(x + 18, y - 9); c.lineTo(x + 26, y - 7); c.lineTo(x + 18, y - 5); c.fill(); c.fillStyle = 'rgba(255,240,180,0.6)'; c.beginPath(); c.arc(x + 50, y + 40, 5, 0, Math.PI * 2); c.fill(); } }
      if (kind === 'ball') { for (let x = 0; x < w; x += 128) { c.strokeStyle = col; c.lineWidth = 5; c.strokeRect(x + 16, h * 0.12, 96, dado - h * 0.16); c.lineWidth = 2; c.strokeRect(x + 24, h * 0.14, 80, dado - h * 0.2); c.fillStyle = 'rgba(200,160,80,0.4)'; c.beginPath(); c.arc(x + 64, h * 0.1, 18, Math.PI, 0); c.fill(); } c.fillStyle = col; c.fillRect(0, h * 0.06, w, 8); }
      stains(c, w, dado, kind === 'ball' ? 5 : 6, kind === 'ball' ? 'rgba(90,70,40,0.35)' : 'rgba(40,30,15,0.4)');
      if (kind !== 'boards' && kind !== 'panel' && kind !== 'tile') { tornEdge(c, 50, h * 0.3, 60, 90, '#7a6a5e'); tornEdge(c, 170, h * 0.55, 40, 70, '#6a5a50', 0.7); }
      c.fillStyle = dadoCol; c.fillRect(0, dado, w, h - dado);
      c.fillStyle = 'rgba(200,160,90,0.5)'; c.fillRect(0, dado - 3, w, 6);
      if (kind !== 'boards') for (let x = 0; x < w; x += 64) { c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 3; c.strokeRect(x + 6, dado + 12, 52, h - dado - 28); }
      c.fillStyle = '#0e0806'; c.fillRect(0, h - 10, w, 10);
    }, { repeat: true });
  };
  // every wall segment twice: full height (with its pictures, windows and sconces) and a cut-away stub
  function walls(K) {
    const byId = {};
    const capM = toonT('wallCap', '#ffffff', PARK.wood('#6a4a34'));
    const outM = toonT('clap', '#ffffff', clap());
    const backM = M('backstageWall', () => K3D.toon('#24202c'));
    const inM = { hall: toonT('paperHall', '#ffffff', paperHall()), corridor: toonT('paperCor', '#ffffff', paperCor()) };
    for (const rm in ROOM) if (!inM[rm]) { const tx = paperRoom(rm); if (tx) inM[rm] = toonT('paper' + rm, '#ffffff', tx); }
    for (const s of H.solids) {
      if (s.kind !== 'wall') continue;
      const id = s.id, rms = roomsOf(s), rm = rms[0];
      if (!byId[id]) {
        const full = new T.Group(), cut = new T.Group(); full.userData.live = cut.userData.live = true; cut.visible = false;
        K.add(full); K.add(cut); byId[id] = { full, cut, reg: REG[rm] || 'S1' };
      }
      // which face looks into which room: 0 +x, 1 -x, 4 +z, 5 -z
      // (found by which room lies just past each face)
      const faceRm = {}, rmAt = (x, z) => { for (const r in ROOM) { const R = ROOM[r]; if (x > R.x0 && x < R.x1 && z > R.z0 && z < R.z1) return r; } return null; };
      for (const [f, nx, nz] of [[0, 1, 0], [1, -1, 0], [4, 0, 1], [5, 0, -1]]) { const r = rmAt(s.x + nx * (s.w / 2 + 0.25), s.z + nz * (s.d / 2 + 0.25)); if (r && (rms.includes(r) || !REG[rm] || REG[r] === REG[rm])) faceRm[f] = r; }
      const allIn = id === 'alcove';
      // (walls behind the manor face the dark backstage outside, not the weatherboard)
      const out = REG[rm] && REG[rm] !== 'S1' ? backM : outM;
      const floorY = ROOM[rm].y || 0;
      for (const [cutting, grp] of [[false, byId[id].full], [true, byId[id].cut]]) {
        const h = cutting ? floorY + CUT_H : s.y1 - s.y0;
        const geo = uvBox(s.w, h, s.d, (f, fw, fh) => {
          if (f === 2 || f === 3) return [fw, fh];
          if (faceRm[f] || allIn) return [fw / 2, cutting ? h / (s.y1 - s.y0) : 1];
          return [fw / 2, fh / 2];
        });
        const mats = [0, 1, 2, 3, 4, 5].map(f => (f === 2 || f === 3) ? capM : allIn ? inM[rm] : faceRm[f] ? inM[faceRm[f]] : out);
        const m = mk(geo, mats, { ink: INK, inkW: 0.8 });
        m.position.set(s.x, s.y0 + h / 2, s.z); grp.add(m);
        if (cutting) { // the sawn top of a cut-away wall: a pale edge so it reads as a section
          const edge = new T.Mesh(new T.BoxGeometry(s.w + 0.02, 0.05, s.d + 0.02), M('cutEdge', () => K3D.toon('#d8c8a8')));
          edge.position.set(s.x, h + 0.025, s.z); grp.add(edge);
        }
      }
    }
    // lintels over the doorways (on the full walls only), with a moulded frame round the opening
    for (const L of H.art.lintels || []) {
      const grp = byId[L.id].full, len = L.to - L.from, mid = (L.from + L.to) / 2, y0 = 3.2, h = L.h - y0;
      const geo = uvBox(L.axis === 'x' ? len : 0.4, h, L.axis === 'x' ? 0.4 : len, (f, fw, fh) => [fw / 2, fh / 2]);
      const m = mk(geo, outM, { ink: INK, inkW: 0.8 }); m.position.set(L.axis === 'x' ? mid : L.at, y0 + h / 2, L.axis === 'x' ? L.at : mid); grp.add(m);
      const fr = wood('#2e1a12');
      for (const side of [-1, 1]) {
        const jamb = mk(new T.BoxGeometry(L.axis === 'x' ? 0.16 : 0.5, 3.3, L.axis === 'x' ? 0.5 : 0.16), fr, { ink: INK, inkW: 0.6 });
        const at = side < 0 ? L.from - 0.02 : L.to + 0.02;
        jamb.position.set(L.axis === 'x' ? at : L.at, 1.65, L.axis === 'x' ? L.at : at); grp.add(jamb);
      }
      const head = mk(new T.BoxGeometry(L.axis === 'x' ? len + 0.5 : 0.56, 0.22, L.axis === 'x' ? 0.56 : len + 0.5), fr, { ink: INK, inkW: 0.6 });
      head.position.set(L.axis === 'x' ? mid : L.at, 3.3, L.axis === 'x' ? L.at : mid); grp.add(head);
    }
    return byId;
  }

  // the doors: a panelled leaf (two for the front door) on a hinge, swung open when the rules open it; light leaks
  // round the cracks of a shut door
  function doors(K) {
    const list = [];
    const panel = (w, h, col) => {
      const g = new T.Group();
      const leaf = mk(new T.BoxGeometry(w, h, 0.09), wood(col), { ink: INK, inkW: 0.7 }); leaf.position.set(w / 2, h / 2, 0); g.add(leaf);
      for (const py of [0.28, 0.66]) for (const sz of [-1, 1]) { const p = mk(new T.BoxGeometry(w * 0.66, h * 0.26, 0.03), wood('#2a160e'), { ink: false }); p.position.set(w / 2, h * py, sz * 0.055); g.add(p); }
      const knob = mk(new T.SphereGeometry(0.06, 10, 8), FIG.brass(), { ink: INK, inkW: 0.4 }); knob.position.set(w - 0.16, 1.05, 0.09); g.add(knob);
      const knob2 = knob.clone(); knob2.position.z = -0.09; g.add(knob2);
      return g;
    };
    for (const d of H.doors) {
      const g = new T.Group(); g.position.set(d.x, 0, d.z); g.userData.live = true; K.add(g);
      const along = d.w > d.d ? 'x' : 'z', len = Math.max(d.w, d.d);
      g.rotation.y = along === 'x' ? 0 : -Math.PI / 2;
      const leaves = [];
      if (d.id === 'front') {
        for (const sx of [-1, 1]) { const hinge = new T.Group(); hinge.position.set(sx * len / 2, 0, 0); g.add(hinge); const p = panel(len / 2, 3.15, '#3a1e14'); if (sx > 0) { p.scale.x = -1; } hinge.add(p); leaves.push({ hinge, sx }); }
        // the fanlight over the doors (lit from inside), and a brass knocker with a face
        const fan = new T.Mesh(new T.CircleGeometry(1.0, 24, 0, Math.PI), glowM('#ffb870', 0.9, { add: false, transparent: false, depthWrite: true })); fan.position.set(0, 3.22, 0.22); g.add(fan); g.userData.fan = fan;
      } else {
        const hinge = new T.Group(); hinge.position.set(-len / 2, 0, 0); g.add(hinge); hinge.add(panel(len, 3.15, d.id === 'hallLock' ? '#2a2a3e' : '#3a1e14')); leaves.push({ hinge, sx: -1 });
        if (d.lock === true) { // a big brass lock plate with a keyhole that glints
          for (const sz of [-1, 1]) { const pl = mk(new T.BoxGeometry(0.22, 0.34, 0.03), FIG.brass(), { ink: INK, inkW: 0.4 }); pl.position.set(len - 0.2, 1.05, sz * 0.07); leaves[0].hinge.children[0].add(pl); }
        }
      }
      // the cracks round a shut door glow faintly (the next room is lit)
      const crackM = K3D.flat(hot(d.id === 'corEndDoor' ? '#c9a8ff' : '#ffc070', 1.4), { transparent: true, opacity: 0.6, depthWrite: false, add: true });
      crackM.map = crackTex();
      const crack = new T.Mesh(new T.PlaneGeometry(len + 0.1, 0.12), crackM); crack.position.set(0, 0.04, 0.2); crack.rotation.x = -Math.PI / 2; g.add(crack);
      const crackB = crack.clone(); crackB.position.z = -0.2; g.add(crackB);
      // the wall the door sits in: when that wall is cut away for the camera, the door is cut down with it
      const ws = H.solids.find(s => s.kind === 'wall' && s.axis === along && Math.abs(s.at - (along === 'x' ? d.z : d.x)) < 0.3);
      list.push({ d, g, leaves, crackM, swing: 0, wall: ws && ws.id, fan: g.userData.fan });
    }
    return list;
  }

  /* =============================== outside: the path and the graveyard =============================== */
  function outside(K, B) {
    const g = new T.Group(); K.add(g);
    // the ground: a gravel path up to the porch, a gravel turning circle at the gate, paving under the porch steps
    PARK.ground(K, { x: 0, z: 0, size: 900, layout: {
      paths: [{ pts: [[0, 41], [0.4, 30], [-0.3, 22], [0.2, 14], [0, 8.4]], w: 2.8, kind: 'gravel' }, { pts: [[0, 41.5], [0, 120]], w: 5, kind: 'pave' }, { pts: [[-30, 42], [30, 42]], w: 4, kind: 'pave' }],
      discs: [{ x: 0, z: 22, r: 2.6, kind: 'gravel' }], rects: [{ x: 0, z: 7.6, w: 8, d: 2.2, kind: 'pave' }, { x: 19.5, z: -9.6, w: 23, d: 2.6, kind: 'gravel' }] } });
    // under the house a dark plinth (the floors sit on it); the crawlspace lattice round the outside
    const plinth = mk(new T.BoxGeometry(16.6, 0.3, 16.6), M('plinth', () => K3D.toon('#2a2434')), { ink: INK, inkW: 0.6 }); plinth.position.set(0, -0.165, -2); g.add(plinth);
    // graves: plywood headstones on struts, mounds of earth, a skeleton hand, wilted wreaths
    H.art.stones.forEach(([x, z, r, name], i) => {
      const sg = new T.Group(); sg.position.set(x, 0, z); sg.rotation.y = r + Math.PI; g.add(sg);
      // a few graves are not plywood boards: a stone cross, an obelisk, a weeping angel (all props, a little chipped)
      const kind = i === 12 ? 'angel' : i % 4 === 3 ? 'cross' : i % 6 === 4 ? 'obelisk' : 'board';
      const grey = M('graveStone', () => K3D.toon('#8a8496')), moss = M('moss', () => K3D.toon('#3a5a34'));
      if (kind !== 'board') {
        const base = mk(new T.BoxGeometry(0.9, 0.22, 0.5), grey, { ink: INK, inkW: 0.5 }); base.position.y = 0.11; sg.add(base);
        if (kind === 'cross') {
          const up = mk(new T.BoxGeometry(0.18, 1.3, 0.16), grey, { ink: INK, inkW: 0.5 }); up.position.y = 0.87; up.rotation.z = (rnd() - 0.5) * 0.1; sg.add(up);
          const arm = mk(new T.BoxGeometry(0.7, 0.16, 0.16), grey, { ink: INK, inkW: 0.5 }); arm.position.y = 1.15; sg.add(arm);
          const ring = mk(new T.TorusGeometry(0.22, 0.035, 5, 16), grey, { ink: INK, inkW: 0.4 }); ring.position.y = 1.15; sg.add(ring);
        } else if (kind === 'obelisk') {
          const ob = mk(new T.CylinderGeometry(0.1, 0.24, 1.9, 4, 1).rotateY(Math.PI / 4), grey, { ink: INK, inkW: 0.5 }); ob.position.y = 1.17; sg.add(ob);
          const tip = mk(new T.ConeGeometry(0.14, 0.26, 4).rotateY(Math.PI / 4), grey, { ink: INK, inkW: 0.4 }); tip.position.y = 2.25; sg.add(tip);
          const urn = mk(new T.SphereGeometry(0.12, 8, 6), grey, { ink: INK, inkW: 0.3 }); urn.position.set(0.32, 0.32, 0.1); sg.add(urn);
        } else { // the weeping angel: hands over her face, wings folded, on a plinth
          const pl = mk(new T.BoxGeometry(0.6, 0.6, 0.5), grey, { ink: INK, inkW: 0.5 }); pl.position.y = 0.52; sg.add(pl);
          const robe = mk(new T.CylinderGeometry(0.14, 0.3, 1.0, 10), grey, { ink: INK, inkW: 0.5 }); robe.position.y = 1.32; sg.add(robe);
          const head = mk(new T.SphereGeometry(0.14, 10, 8), grey, { ink: INK, inkW: 0.5 }); head.position.set(0, 1.92, -0.03); head.rotation.x = 0.4; sg.add(head);
          for (const hx of [-1, 1]) {
            const arm = mk(new T.CylinderGeometry(0.04, 0.045, 0.42, 6), grey, { ink: INK, inkW: 0.3 }); arm.position.set(hx * 0.1, 1.72, -0.15); arm.rotation.set(1.0, 0, -hx * 0.35); sg.add(arm);
            const wing = mk(new T.SphereGeometry(0.32, 8, 6), grey, { ink: INK, inkW: 0.4 }); wing.scale.set(0.25, 1.3, 0.6); wing.position.set(hx * 0.2, 1.6, 0.2); wing.rotation.z = hx * 0.25; sg.add(wing);
          }
        }
        const mp = mk(new T.SphereGeometry(0.18, 8, 6), moss, { ink: false }); mp.scale.set(1.4, 0.35, 1); mp.position.set(-0.3, 0.22, 0.15); sg.add(mp);
        const mound = mk(new T.SphereGeometry(0.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M('earth', () => K3D.toon('#2e2620')), { ink: INK, inkW: 0.4 }); mound.scale.set(0.9, 0.22, 1.6); mound.position.set(0, 0, -1.0); sg.add(mound);
        return;
      }
      const face = new T.Mesh(new T.PlaneGeometry(1.1, 1.1), K3D.toon('#ffffff', { map: stoneTex(name, i), alphaTest: 0.5, side: T.DoubleSide }));
      face.position.set(0, 0.55, 0); face.rotation.z = (rnd() - 0.5) * 0.12; face.castShadow = true; sg.add(face);
      const ply = mk(new T.BoxGeometry(0.9, 0.62, 0.05), wood('#8a6a44'), { ink: INK, inkW: 0.5 }); ply.position.set(0, 0.31, 0.04); sg.add(ply);
      const strut = mk(new T.BoxGeometry(0.06, 0.8, 0.06), wood('#8a6a44'), { ink: INK, inkW: 0.4 }); strut.position.set(0.25, 0.36, 0.28); strut.rotation.x = -0.6; sg.add(strut);
      const mound = mk(new T.SphereGeometry(0.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M('earth', () => K3D.toon('#2e2620')), { ink: INK, inkW: 0.4 }); mound.scale.set(0.9, 0.22, 1.6); mound.position.set(0, 0, -1.0); sg.add(mound);
      if (i % 4 === 1) { // a plastic skeleton hand from the mound
        const hand = new T.Group(); hand.position.set(0.15, 0.1, -1.2); sg.add(hand);
        const bone = M('bone', () => K3D.toon('#e8e4d4'));
        const palm = mk(new T.BoxGeometry(0.1, 0.12, 0.04), bone, { ink: INK, inkW: 0.4 }); palm.position.y = 0.06; hand.add(palm);
        for (let f = 0; f < 4; f++) { const fg = mk(new T.CylinderGeometry(0.012, 0.012, 0.12, 5), bone, { ink: INK, inkW: 0.3 }); fg.position.set(-0.035 + f * 0.024, 0.17, 0); fg.rotation.z = (f - 1.5) * 0.15; hand.add(fg); }
      }
      if (i % 5 === 2) { const wr = mk(new T.TorusGeometry(0.18, 0.05, 6, 14), M('wreath', () => K3D.toon('#3a4a2a')), { ink: INK, inkW: 0.4 }); wr.position.set(0, 0.42, 0.1); sg.add(wr); }
    });
    // a little family crypt in the back corner: stone walls, a pediment, iron doors ajar with a green glow inside
    { const cg = new T.Group(); cg.position.set(-12.4, 0, 13.0); cg.rotation.y = 0.5; g.add(cg);
      const cs = M('cryptStone', () => K3D.toon('#ffffff', { map: K3D.paint('pm-crypt', 128, 128, (c, w, h) => { c.fillStyle = '#6a6474'; c.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let i = 0; i < 4; i++) { c.fillStyle = ['#726c7c', '#5e5868', '#686272'][Math.floor(rnd() * 3)]; c.fillRect(i * 32 + (r % 2 ? 16 : 0) + 1, r * 16 + 1, 30, 14); } c.fillStyle = 'rgba(50,80,50,0.55)'; for (let i = 0; i < 10; i++) c.fillRect(rnd() * w, h - 20 + rnd() * 20, 10, 6); }) }));
      const body = mk(new T.BoxGeometry(1.9, 2.0, 2.0), cs, { ink: INK, inkW: 0.7 }); body.position.y = 1.0; cg.add(body);
      const ped = new T.Shape(); ped.moveTo(-1.1, 0); ped.lineTo(0, 0.6); ped.lineTo(1.1, 0); ped.closePath();
      const pd = mk(new T.ExtrudeGeometry(ped, { depth: 2.2, bevelEnabled: false }).translate(0, 0, -1.1), cs, { ink: INK, inkW: 0.6 }); pd.position.y = 2.0; cg.add(pd);
      for (const sx of [-1, 1]) { const col = mk(new T.CylinderGeometry(0.1, 0.12, 2.0, 8), cs, { ink: INK, inkW: 0.4 }); col.position.set(sx * 0.8, 1.0, 1.05); cg.add(col); }
      const glow = new T.Mesh(new T.PlaneGeometry(0.9, 1.5), K3D.flat(hot('#5affb0', 0.9))); glow.position.set(0, 0.75, 1.005); cg.add(glow);
      for (const sx of [-1, 1]) { const dr = mk(new T.BoxGeometry(0.46, 1.5, 0.05), iron(), { ink: INK, inkW: 0.4 }); dr.position.set(sx * 0.45 + sx * 0.12, 0.75, 1.1 + 0.12); dr.rotation.y = sx * 0.55; cg.add(dr); }
      const plq = new T.Mesh(new T.PlaneGeometry(1.2, 0.3), K3D.toon('#ffffff', { map: K3D.paint('pm-cryptName', 256, 64, (c, w, h) => { c.fillStyle = '#4a4452'; c.fillRect(0, 0, w, h); c.fillStyle = '#d8d0c0'; c.font = '700 30px "DejaVu Serif", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('THE GRIMSBYS', w / 2, h / 2 + 2); }) }));
      plq.position.set(0, 1.78, 1.01); cg.add(plq);
      sprite(K, cg, 0, 0.8, 1.5, 2.6, '#5affb0', 0.35);
      const urnL = mk(new T.CylinderGeometry(0.12, 0.08, 0.3, 8), cs, { ink: INK, inkW: 0.3 }); urnL.position.set(0.7, 2.25, 0.9); cg.add(urnL); }
    // little lanterns on hooked iron posts along the graveyard path, each with a candle
    for (const z of [11.2, 15.0, 18.8]) for (const sx of [-1, 1]) {
      const x = sx * 1.75 + (z === 15.0 ? sx * 0.1 : 0);
      const post = mk(K3D.geo('pm-lpost', () => new T.CylinderGeometry(0.035, 0.05, 1.3, 6).translate(0, 0.65, 0)), iron(), { ink: INK, inkW: 0.3 }); post.position.set(x, 0, z); g.add(post);
      const hook = mk(K3D.geo('pm-lhook', () => new T.TorusGeometry(0.14, 0.02, 4, 10, Math.PI)), iron(), { ink: false }); hook.position.set(x - sx * 0.14, 1.3, z); g.add(hook);
      const ln = FIG.lantern(); ln.scale.setScalar(0.55); ln.position.set(x - sx * 0.28, 0.98, z); g.add(ln);
      sprite(K, g, x - sx * 0.28, 1.12, z, 1.2, '#ffb050', 0.45);
    }
    // the cemetery fence: iron railings with spikes, a brick pier each side of the crooked gate (left swung open)
    const railings = (x0, x1, z) => {
      const n = Math.round(Math.abs(x1 - x0) / 0.28), im = new T.InstancedMesh(K3D.geo('pm-rail', () => new T.CylinderGeometry(0.025, 0.025, 1.6, 5).translate(0, 0.8, 0)), iron(), n);
      const tip = new T.InstancedMesh(K3D.geo('pm-railTip', () => new T.ConeGeometry(0.05, 0.16, 5).translate(0, 1.66, 0)), iron(), n);
      const m4 = new T.Matrix4(), q = new T.Quaternion();
      for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * (i + 0.5) / n; q.setFromAxisAngle(V(0, 0, 1), (rnd() - 0.5) * 0.12); m4.compose(V(x, 0, z), q, V(1, 1, 1)); im.setMatrixAt(i, m4); tip.setMatrixAt(i, m4); }
      K3D.ink(im, INK, 0.4); g.add(im); g.add(tip);
      for (const y of [0.3, 1.35]) { const bar = mk(new T.BoxGeometry(Math.abs(x1 - x0), 0.05, 0.05), iron(), { ink: INK, inkW: 0.4 }); bar.position.set((x0 + x1) / 2, y, z); g.add(bar); }
    };
    railings(-14, -1.9, 22); railings(1.9, 14, 22);
    for (const sx of [-1, 1]) {
      const pier = mk(new T.BoxGeometry(0.5, 2.2, 0.5), M('pier', () => K3D.toon('#4a3a40')), { ink: INK, inkW: 0.7 }); pier.position.set(sx * 1.95, 1.1, 22); g.add(pier);
      const ball = mk(new T.SphereGeometry(0.24, 12, 8), M('pier', () => K3D.toon('#4a3a40')), { ink: INK, inkW: 0.6 }); ball.position.set(sx * 1.95, 2.45, 22); g.add(ball);
      // the gate leaves: one swung wide, one hanging off a hinge
      const gate = new T.Group(); gate.position.set(sx * 1.7, 0, 22); gate.rotation.y = sx < 0 ? -1.45 : 1.2; g.add(gate);
      for (let i = 0; i < 6; i++) { const b = mk(new T.CylinderGeometry(0.022, 0.022, 1.5, 5), iron(), { ink: INK, inkW: 0.3 }); b.position.set(-sx * (0.1 + i * 0.28), 0.85 + Math.sin(i * 0.5) * 0.1, 0); gate.add(b); }
      const top = mk(new T.TorusGeometry(0.8, 0.03, 5, 16, Math.PI), iron(), { ink: INK, inkW: 0.3 }); top.position.set(-sx * 0.8, 1.3, 0); gate.add(top);
      if (sx > 0) gate.rotation.z = 0.18;
    }
    // the arch over the gate with the attraction's neon name
    const arch = mk(new T.TorusGeometry(2.05, 0.06, 6, 30, Math.PI), iron(), { ink: INK, inkW: 0.5 }); arch.position.set(0, 2.3, 22); g.add(arch);
    const sign = PARK.neon(K, 'SPOOK MANOR', { w: 3.4, h: 0.8, col: '#7affc0', col2: '#c890ff', x: 0, y: 3.55, z: 22.05, yaw: 0, k: 1.3, fs: 54 });
    sign.rotation.z = 0.04; g.add(sign);
    // a dangling bat on a string under the arch, and paper bats in the dead trees
    SC.bats = [];
    const batGeo = K3D.geo('pm-bat', () => { const s = new T.Shape(); s.moveTo(0, 0.05); s.bezierCurveTo(0.1, 0.12, 0.2, 0.1, 0.3, 0.14); s.lineTo(0.26, 0.04); s.lineTo(0.2, 0.07); s.lineTo(0.14, 0.0); s.lineTo(0.06, 0.02); s.lineTo(0, -0.06); s.lineTo(-0.06, 0.02); s.lineTo(-0.14, 0.0); s.lineTo(-0.2, 0.07); s.lineTo(-0.26, 0.04); s.lineTo(-0.3, 0.14); s.bezierCurveTo(-0.2, 0.1, -0.1, 0.12, 0, 0.05); return new T.ShapeGeometry(s); });
    const batM = M('batM', () => K3D.toon('#14101c', { side: T.DoubleSide }));
    const hangBat = (x, y, z, len, parent) => { const p = new T.Group(); p.position.set(x, y, z); (parent || g).add(p); const str = new T.Mesh(new T.CylinderGeometry(0.004, 0.004, len, 3).translate(0, -len / 2, 0), M('string', () => K3D.flat('#8a8aa0'))); p.add(str); const b = new T.Mesh(batGeo, batM); b.position.y = -len; b.scale.setScalar(1.3); p.add(b); p.userData.live = true; SC.bats.push({ p, ph: rnd() * 6, sp: 0.8 + rnd() }); };
    hangBat(0, 4.1, 22, 0.9);
    // dead trees: twisted trunks and bare branches (tubes), paper bats hanging off them
    for (const [x, z, s] of H.art.trees) {
      const tg = new T.Group(); tg.name = 'deadTree'; tg.position.set(x, 0, z); tg.scale.setScalar(s); tg.rotation.y = rnd() * 6; g.add(tg);
      const bark = M('bark', () => K3D.toon('#2a2230', { map: PARK.wood('#3a3040') }));
      const branch = (pts, r) => { const tb = mk(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => V(...p))), 12, r, 6), bark, { ink: INK, inkW: 0.6 }); tg.add(tb); };
      branch([[0, 0, 0], [0.2, 1.2, 0.1], [-0.1, 2.4, -0.1], [0.15, 3.4, 0]], 0.22);
      for (let b = 0; b < 5; b++) {
        const a = b / 5 * Math.PI * 2 + rnd(), y = 2.0 + b * 0.35, l = 1.2 + rnd() * 1.0;
        branch([[0, y, 0], [Math.cos(a) * l * 0.5, y + 0.4, Math.sin(a) * l * 0.5], [Math.cos(a) * l, y + 0.2 + rnd() * 0.8, Math.sin(a) * l], [Math.cos(a + 0.3) * l * 1.3, y + 0.9, Math.sin(a + 0.3) * l * 1.3]], 0.07);
        if (b % 2 === 0) hangBat(Math.cos(a) * l, y + 0.2, Math.sin(a) * l, 0.3 + rnd() * 0.4, tg);
      }
      // roots
      for (let r = 0; r < 4; r++) { const a = r * 1.6; branch([[0, 0.3, 0], [Math.cos(a) * 0.5, 0.1, Math.sin(a) * 0.5], [Math.cos(a) * 0.9, -0.05, Math.sin(a) * 0.9]], 0.08); }
    }
    // the queue line up the path: posts with sagging rope (it is a ride, after all), and theme-park tat
    const post = (x, z) => { const p = mk(K3D.geo('pm-qpost', () => new T.CylinderGeometry(0.05, 0.05, 1.0, 8).translate(0, 0.5, 0)), FIG.brass(), { ink: INK, inkW: 0.4 }); p.position.set(x, 0, z); g.add(p); const base = mk(K3D.geo('pm-qbase', () => new T.CylinderGeometry(0.18, 0.2, 0.05, 12)), iron(), { ink: INK, inkW: 0.3 }); base.position.set(x, 0.03, z); g.add(base); return [x, 1.0, z]; };
    const rope = (a, b) => { const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(V(a[0] + (b[0] - a[0]) * t, a[1] - Math.sin(t * Math.PI) * 0.18, a[2] + (b[2] - a[2]) * t)); } g.add(mk(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 8, 0.03, 5), M('rope', () => K3D.toon('#7a1830')), { ink: INK, inkW: 0.3 })); };
    for (const sx of [-1, 1]) { let last = null; for (let z = 34; z >= 24; z -= 2.5) { const p = post(sx * 1.9, z); if (last) rope(last, p); last = p; } }
    // a park lamp at the gate side, a horn speaker on a pole, a fog machine, a spotlight on a stand
    SC.horns = [];
    const horn = (x, y, z, yaw, parent) => { const hg = new T.Group(); hg.position.set(x, y, z); hg.rotation.y = yaw; (parent || g).add(hg); const cone = mk(K3D.geo('pm-horn', () => new T.ConeGeometry(0.28, 0.6, 14, 1, true).rotateX(-Math.PI / 2)), M('hornM', () => K3D.toon('#b9c2b0', { side: T.DoubleSide })), { ink: INK, inkW: 0.5 }); cone.rotation.x = 0.25; hg.add(cone); SC.horns.push(hg); return hg; };
    const pole = mk(new T.CylinderGeometry(0.06, 0.08, 4.4, 8), iron(), { ink: INK, inkW: 0.4 }); pole.position.set(5.6, 2.2, 20.4); g.add(pole);
    horn(5.6, 4.2, 20.6, -0.4); horn(5.6, 4.2, 20.2, Math.PI);
    SC.fogMachines = [[-4.0, 9.0], [4.4, 21.2], [-11, 26]].map(([x, z]) => { const fm = mk(new T.BoxGeometry(0.5, 0.3, 0.7), iron(), { ink: INK, inkW: 0.5 }); fm.position.set(x, 0.15, z); g.add(fm); return [x, z]; });
    stageLamp(K, g, 9.5, 24.5, -2.3, '#7affc0', 0.55);
    stageLamp(K, g, -9.6, 9.0, 0.7, '#c890ff', 0.5);
    // signs: keep to the path; the gift shop; no flash photos
    signBoard(K, g, -3.6, 33.6, 0.2, 'path', 1.6);
    signBoard(K, g, 2.6, 12.2, -0.3, 'flash', 1.5);
    signBoard(K, g, 12.6, 30.8, -1.1, 'gift', 1.7);
    // the grounds' edge: a high dark hedge and the park's iron fence beyond it
    const hedge = M('hedge', () => K3D.toon('#1e3a2e'));
    for (const [x0, z0, x1, z1] of [[-15, 8, -15, 37], [15, 8, 15, 37], [-15, 37, -3, 37], [3, 37, 15, 37]]) {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 1.6);
      for (let i = 0; i <= n; i++) { const t = i / n, b = mk(K3D.geo('pm-hedgeBall', () => new T.IcosahedronGeometry(1.1, 1)), hedge, { ink: '#0a1a12', inkW: 0.6 }); b.position.set(x0 + (x1 - x0) * t, 0.9 + rnd() * 0.5, z0 + (z1 - z0) * t); b.scale.set(1, 1.3 + rnd() * 0.4, 1); g.add(b); }
    }
    // fog: low drifting sheets over the graveyard and the path (they breathe and slide)
    SC.fog = [];
    const fm = M('fogM', () => new T.MeshBasicMaterial({ map: fogTex(), color: new T.Color('#6a6ab8'), transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false }));
    for (let i = 0; i < 14; i++) {
      const s = 5 + rnd() * 6, side = i % 2 ? 1 : -1, f = new T.Mesh(new T.PlaneGeometry(s, s), fm); f.rotation.x = -Math.PI / 2; f.position.set(side * (4 + rnd() * 9), 0.12 + rnd() * 0.25, 10 + rnd() * 24); f.renderOrder = 3; f.userData.live = true; K.add(f);
      SC.fog.push({ m: f, x: f.position.x, z: f.position.z, ph: rnd() * 6, sp: 0.15 + rnd() * 0.2 });
    }
    // the park behind: the ferris wheel and the drop tower lit up far away, the coaster's hill, a carousel's glow
    PARK.ride(K, B, 'wheel', { x: -70, z: 30, r: 18, yaw: 1.2 });
    PARK.ride(K, B, 'drop', { x: 60, z: -50, h: 46 });
    PARK.ride(K, B, 'carousel', { x: -40, z: 70, r: 7 });
    PARK.ride(K, B, 'swings', { x: 48, z: 46, r: 7, h: 14 });
    // two tidy rows of park trees on the lawns either side of the grounds (on grass, clear of the paving at z 42)
    for (let i = 0; i < 6; i++) PARK.tree(K, -22, -6 + i * 8, 1.1 + (i % 2) * 0.15, B);
    for (let i = 0; i < 6; i++) PARK.tree(K, 38, -6 + i * 8, 1.1 + ((i + 1) % 2) * 0.15, B);
    // a string of the park's bulbs along the outer fence (warm, chasing)
    B.line([-15, 3.2, 37.5], [15, 3.2, 37.5], 0.6, '#ffd890', { sag: 0.4, speed: 2 });
    return g;
  }
  // a theatre spotlight on a stand (it lights a coloured cone of haze; its light is faked)
  function stageLamp(K, g, x, z, yaw, col, k) {
    const sg = new T.Group(); sg.name = 'stageLamp'; sg.position.set(x, 0, z); sg.rotation.y = yaw; g.add(sg);
    for (let i = 0; i < 3; i++) { const lg = mk(new T.CylinderGeometry(0.025, 0.025, 1.7, 5), iron(), { ink: INK, inkW: 0.3 }); const a = i / 3 * Math.PI * 2; lg.position.set(Math.cos(a) * 0.3, 0.8, Math.sin(a) * 0.3); lg.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); sg.add(lg); }
    const can = mk(new T.CylinderGeometry(0.22, 0.28, 0.6, 12).rotateX(Math.PI / 2), iron(), { ink: INK, inkW: 0.5 }); can.position.set(0, 1.7, 0); can.rotation.x = 0.45; sg.add(can);
    const lens = new T.Mesh(new T.CircleGeometry(0.2, 16), K3D.flat(hot(col, 2.2))); lens.position.set(0, 1.62, 0.27); lens.rotation.x = 0.45; sg.add(lens);
    const cone = new T.Mesh(new T.ConeGeometry(1.4, 4.2, 20, 1, true).translate(0, -2.1, 0).rotateX(-Math.PI / 2 + 0.45), M('stageCone|' + col, () => new T.MeshBasicMaterial({ map: shaftTex(), color: hot(col, 0.16), transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false })));
    cone.position.set(0, 1.62, 0.27); cone.userData.live = true; sg.add(cone);
    const pool = new T.Mesh(new T.PlaneGeometry(3.4, 3.4), M('stagePool|' + col, () => K3D.flat(hot(col, k), { map: poolTex(), transparent: true, depthWrite: false, add: true })));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.03, 3.4); pool.userData.live = true; sg.add(pool);
    (SC.stage || (SC.stage = [])).push({ cone, pool, lens, col, ph: rnd() * 10 });
    return sg;
  }
  function signBoard(K, g, x, z, yaw, kind, w = 1.4, y = 0, wall = false) {
    const sg = new T.Group(); sg.position.set(x, y, z); sg.rotation.y = yaw; g.add(sg);
    const glow = kind === 'exit' || kind === 'tour';
    const bd = mk(new T.BoxGeometry(w, w * 0.375, 0.05), K3D.toon('#ffffff', { map: signTex(kind), emissive: glow ? '#ffffff' : '#000000', emissiveIntensity: glow ? 0.85 : 0 }), { ink: INK, inkW: 0.5 });
    bd.position.y = wall ? 0 : 1.4; sg.add(bd);
    if (!wall) { const p = mk(new T.CylinderGeometry(0.035, 0.04, 1.2, 6), wood('#5a3a24'), { ink: INK, inkW: 0.3 }); p.position.y = 0.6; sg.add(p); }
    if (glow) sprite(K, sg, 0, bd.position.y, 0.1, w * 1.4, kind === 'exit' ? '#3aff8a' : '#b08aff', 0.22);
    return sg;
  }

  /* =============================== the yard round the corridor wing (backstage of the ride) =============================== */
  function yard(K, B) {
    const g = new T.Group(); K.add(g);
    // more plywood graves along the wing's front, and a broken fountain with a cherub
    const names = ['Al B. Back', 'Seymour Bones', 'Myra Mains', 'Ed Lesshorseman', 'Lou Natic', 'Barb Dwyer'];
    names.forEach((n, i) => {
      const x = 10 + i * 3.3 + rnd(), z = i % 2 ? 0.2 : -1.2, sg = new T.Group(); sg.position.set(x, 0, z); sg.rotation.y = Math.PI + (rnd() - 0.5) * 0.5; g.add(sg);
      const face = new T.Mesh(new T.PlaneGeometry(1.0, 1.0), K3D.toon('#ffffff', { map: stoneTex('R.I.P. ' + n, 20 + i), alphaTest: 0.5, side: T.DoubleSide })); face.position.y = 0.5; face.rotation.z = (rnd() - 0.5) * 0.2; face.castShadow = true; sg.add(face);
      const ply = mk(new T.BoxGeometry(0.8, 0.55, 0.05), wood('#8a6a44'), { ink: INK, inkW: 0.5 }); ply.position.set(0, 0.28, 0.04); sg.add(ply);
    });
    const fnt = new T.Group(); fnt.position.set(12.5, 0, 3.4); g.add(fnt);
    const basin = mk(new T.CylinderGeometry(1.3, 1.4, 0.5, 20, 1, true), M('stoneGrey', () => K3D.toon('#7a7488')), { ink: INK, inkW: 0.6 }); basin.position.y = 0.25; fnt.add(basin);
    const water = new T.Mesh(new T.CircleGeometry(1.28, 20).rotateX(-Math.PI / 2), M('murk', () => K3D.toon('#1e3a34', { emissive: '#0a2a20', emissiveIntensity: 0.6 }))); water.position.y = 0.4; fnt.add(water);
    const ped = mk(new T.CylinderGeometry(0.18, 0.26, 1.2, 10), M('stoneGrey', () => K3D.toon('#7a7488')), { ink: INK, inkW: 0.5 }); ped.position.y = 0.8; fnt.add(ped);
    const cher = mk(K3D.roundBox(0.4, 0.6, 0.34, 0.6, 12), M('stoneGrey', () => K3D.toon('#7a7488')), { ink: INK, inkW: 0.5 }); cher.position.y = 1.4; cher.rotation.z = 0.25; fnt.add(cher);
    const chHead = mk(new T.SphereGeometry(0.17, 10, 8), M('stoneGrey', () => K3D.toon('#7a7488')), { ink: INK, inkW: 0.5 }); chHead.position.set(-0.12, 2.05, 0); fnt.add(chHead);
    for (const sx of [-1, 1]) { const wg = mk(new T.SphereGeometry(0.2, 8, 6), M('stoneGrey', () => K3D.toon('#7a7488')), { ink: INK, inkW: 0.4 }); wg.scale.set(0.3, 1, 0.8); wg.position.set(sx * 0.2, 1.7, -0.15); fnt.add(wg); }
    const crack = mk(new T.BoxGeometry(0.5, 0.5, 0.06), M('stoneGrey', () => K3D.toon('#7a7488')), { ink: INK, inkW: 0.4 }); crack.position.set(1.2, 0.12, 0.6); crack.rotation.set(0.3, 0.4, 1.1); fnt.add(crack);
    // backstage behind the wing: crates stencilled PROPS, a spare coffin, a broken Sheet on its stand, a fuse box with
    // blinking lights, a coil of cable, a hand cart; a high plank fence with a STAFF ONLY gate
    const crateT = K3D.paint('pm-crate', 128, 128, (c, w, h) => { c.fillStyle = '#7a5a34'; c.fillRect(0, 0, w, h); c.strokeStyle = '#4a3420'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8); c.beginPath(); c.moveTo(8, 8); c.lineTo(w - 8, h - 8); c.stroke(); c.fillStyle = 'rgba(20,10,10,0.75)'; c.font = '900 26px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.fillText('PROPS', w / 2, h / 2 + 10); });
    const crateM = M('crateM', () => K3D.toon('#ffffff', { map: crateT }));
    for (const [x, z, y, r, sz] of [[10.5, -9.0, 0, 0.2, 1.0], [11.6, -9.4, 0, -0.1, 0.9], [11.0, -9.1, 1.0, 0.5, 0.8], [16.8, -9.6, 0, 0.1, 1.1], [27.5, -9.2, 0, -0.3, 0.9], [28.4, -9.8, 0, 0.2, 0.9]]) { const cr = mk(new T.BoxGeometry(sz, sz, sz), crateM, { ink: INK, inkW: 0.6 }); cr.position.set(x, y + sz / 2, z); cr.rotation.y = r; g.add(cr); }
    const coffin = new T.Shape(); coffin.moveTo(-0.25, 0); coffin.lineTo(0.25, 0); coffin.lineTo(0.4, 1.4); coffin.lineTo(0.2, 1.9); coffin.lineTo(-0.2, 1.9); coffin.lineTo(-0.4, 1.4); coffin.closePath();
    const cof = mk(new T.ExtrudeGeometry(coffin, { depth: 0.4, bevelEnabled: false }), wood('#3a2218'), { ink: INK, inkW: 0.7 }); cof.position.set(19.2, 0, -9.4); cof.rotation.set(-0.18, 0.3, 0); g.add(cof);
    const broken = FIG.sheet(); broken.position.set(14.0, 0, -9.6); broken.rotation.set(0, 0.8, 0.35); g.add(broken); broken.userData.set({ state: 'done', raise: 0, step: 0 }, 0, 0);
    const fuse = mk(new T.BoxGeometry(0.8, 1.0, 0.3), M('fuseBox', () => K3D.toon('#5a6a5a')), { ink: INK, inkW: 0.5 }); fuse.position.set(21.0, 1.2, -6.95); g.add(fuse);
    SC.fuseLights = [];
    for (let i = 0; i < 4; i++) { const l = new T.Mesh(new T.SphereGeometry(0.035, 6, 4), K3D.flat(hot(['#ff4a4a', '#4aff8a', '#ffd24a', '#4aff8a'][i], 2.4))); l.position.set(20.75 + i * 0.16, 1.5, -6.78); l.userData.live = true; g.add(l); SC.fuseLights.push(l); }
    const coil = mk(new T.TorusGeometry(0.35, 0.05, 6, 20), M('cable', () => K3D.toon('#14121a')), { ink: INK, inkW: 0.3 }); coil.rotation.x = Math.PI / 2; coil.position.set(21.0, 0.06, -7.6); g.add(coil);
    const fenceT = M('fencePlank', () => K3D.toon('#ffffff', { map: PARK.wood('#4a3a3a') }));
    for (let x = 8.4; x < 29.9; x += 0.5) { const pk = mk(K3D.geo('pm-plank', () => new T.BoxGeometry(0.46, 2.6, 0.08).translate(0, 1.3, 0)), fenceT, { ink: INK, inkW: 0.4 }); pk.position.set(x, 0, -11.2); pk.rotation.z = (rnd() - 0.5) * 0.05; pk.scale.y = 0.9 + rnd() * 0.2; g.add(pk); }
    // dead trees and hedges on both sides, a lamp-post with a broken globe that sputters
    for (const [x, z, s] of [[17.5, 2.6, 0.9], [23.6, 2.8, 1.1], [29.4, 2.6, 0.95]]) {
      const tg = new T.Group(); tg.position.set(x, 0, z); tg.scale.setScalar(s); g.add(tg);
      const bark = M('bark', () => K3D.toon('#2a2230', { map: PARK.wood('#3a3040') }));
      const br = pts => tg.add(mk(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => V(...p))), 10, pts.length > 3 ? 0.2 : 0.07, 6), bark, { ink: INK, inkW: 0.6 }));
      br([[0, 0, 0], [0.3, 1.4, 0], [-0.1, 2.6, 0.1], [0.2, 3.6, 0]]);
      for (let b = 0; b < 4; b++) { const a = b * 1.7 + rnd(), y = 2.2 + b * 0.4; br([[0, y, 0], [Math.cos(a) * 0.8, y + 0.5, Math.sin(a) * 0.8], [Math.cos(a) * 1.6, y + 1.0, Math.sin(a) * 1.6]]); }
    }
    const hedge = M('hedge', () => K3D.toon('#1e3a2e'));
    for (let x = 15; x < 35.4; x += 1.5) { const b = mk(K3D.geo('pm-hedgeBall', () => new T.IcosahedronGeometry(1.1, 1)), hedge, { ink: '#0a1a12', inkW: 0.6 }); b.position.set(x, 0.8, 5.6 + rnd() * 0.4); b.scale.set(1, 1.2 + rnd() * 0.4, 1); g.add(b); }
    for (let z = -10.5; z < 5; z += 1.5) { const b = mk(K3D.geo('pm-hedgeBall', () => new T.IcosahedronGeometry(1.1, 1)), hedge, { ink: '#0a1a12', inkW: 0.6 }); b.position.set(35.2, 0.8, z); b.scale.set(1, 1.2 + rnd() * 0.4, 1); g.add(b); }
    // pumpkins with carved faces along the wing's front (lit inside: the candle flickers)
    for (let i = 0; i < 5; i++) {
      const x = 11 + i * 4.1, z = -1.9, pg = new T.Group(); pg.position.set(x, 0, z); pg.rotation.y = Math.PI + (rnd() - 0.5) * 0.6; g.add(pg);
      const pm = mk(new T.SphereGeometry(0.32, 14, 10), M('pumpkin', () => K3D.toon('#d8701e', { emissive: '#3a1400', emissiveIntensity: 0.6 })), { ink: INK, inkW: 0.5 }); pm.scale.set(1.1, 0.8, 1); pm.position.y = 0.26; pg.add(pm);
      const st = mk(new T.CylinderGeometry(0.04, 0.05, 0.14, 6), M('stem', () => K3D.toon('#2a2a1a')), { ink: INK, inkW: 0.3 }); st.position.y = 0.55; pg.add(st);
      const face = new T.Mesh(new T.PlaneGeometry(0.4, 0.3), M('jackFace', () => K3D.flat(hot('#ffb030', 2.2), { transparent: true, map: K3D.paint('pm-jack', 64, 48, (c) => { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(12, 18); c.lineTo(20, 8); c.lineTo(26, 18); c.fill(); c.beginPath(); c.moveTo(38, 18); c.lineTo(44, 8); c.lineTo(52, 18); c.fill(); c.beginPath(); c.moveTo(10, 28); for (let k = 0; k <= 6; k++) c.lineTo(10 + k * 7.3, k % 2 ? 34 : 28); c.lineTo(54, 30); c.quadraticCurveTo(32, 46, 10, 30); c.fill(); }), depthWrite: false })));
      face.position.set(0, 0.28, 0.33); pg.add(face);
      sprite(K, pg, 0, 0.3, 0.45, 1.3, '#ff9020', 0.3);
    }
    return g;
  }

  // the placement audit (tools/w42/manor-shot.js --audit): ground pieces whose footprints overlap a lot, and trees
  // and hedges that are not standing on grass
  function audit(K, groups) {
    const bx = [], b3 = new T.Box3(), sz3 = new T.Vector3(), c3 = new T.Vector3(), items = [];
    for (const g of groups) for (const o of g.children) items.push(o);
    for (const o of K.root.children) if (o.name === 'tree') items.push(o);
    K.root.updateMatrixWorld(true);
    for (const o of items) {
      if (o.isInstancedMesh || o.isPoints || o.userData.live || o.name === 'stageLamp') continue; // (a stage lamp's haze cone hangs in the air)
      if (o.name === 'deadTree') { const r = 0.45 * o.scale.x; b3.set(V(o.position.x - r, 0, o.position.z - r), V(o.position.x + r, 2, o.position.z + r)); } // (its trunk and roots: the bare branches spread overhead)
      else b3.setFromObject(o);
      if (b3.isEmpty()) continue; b3.getSize(sz3); b3.getCenter(c3);
      if (sz3.x > 30 || sz3.z > 30 || sz3.x * sz3.z < 0.15 || b3.max.y < 0.3 || b3.min.y > 1.5) continue;
      const geo = o.geometry ? o.geometry.type : 'group' + o.children.length;
      const name = o.name || (geo.includes('Icosahedron') ? 'hedge' : geo);
      bx.push({ x0: b3.min.x, x1: b3.max.x, z0: b3.min.z, z1: b3.max.z, a: sz3.x * sz3.z, n: name, x: c3.x, z: c3.z });
    }
    const bad = [], off = [];
    for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) {
      const A = bx[i], Bb = bx[j];
      if (A.n === Bb.n && (A.n === 'hedge' || A.n === 'tree')) continue; // (hedge balls and grove crowns touch on purpose)
      const ix = Math.min(A.x1, Bb.x1) - Math.max(A.x0, Bb.x0), iz = Math.min(A.z1, Bb.z1) - Math.max(A.z0, Bb.z0);
      if (ix > 0 && iz > 0 && ix * iz > 0.4 * Math.min(A.a, Bb.a)) bad.push(`${A.n}@${A.x.toFixed(1)},${A.z.toFixed(1)} x ${Bb.n}@${Bb.x.toFixed(1)},${Bb.z.toFixed(1)}`);
    }
    for (const b of bx) if ((b.n === 'tree' || b.n === 'hedge') && K.groundAll && !K.groundAll(b.x, b.z, 0.6, 'grass')) off.push(`${b.n}@${b.x.toFixed(1)},${b.z.toFixed(1)} on ${K.groundAt(b.x, b.z)}`);
    window.__w42audit = { n: bx.length, overlaps: bad, offGrass: off };
  }

  /* =============================== more on the manor's front: shutters, ivy, gutters, a balcony, gargoyles,
     window boxes, a stone footing, rose beds and porch clutter. What stands against the front wall goes in
     fac.porchTop (hidden while the camera looks into the hall); what is upstairs goes in fac.up. =============================== */
  function frontDetail(K, B, fac) {
    const low = new T.Group(); K.add(low); // knee-high things that never block the hall view
    const wallF = fac.porchTop, upF = fac.up, Z = 6.2; // (the front wall's face)
    const trim = M('trim', () => K3D.toon('#2a2232'));
    // ---- shutters beside every front window; a couple hang crooked off one hinge ----
    const shut = (parent, x, y, w, h, z, col, crooked) => {
      for (const sx of [-1, 1]) {
        const p = mk(new T.BoxGeometry(w * 0.5, h, 0.06), toonT('shut' + col, '#ffffff', shutterTex(col)), { ink: INK, inkW: 0.5 });
        p.position.set(x + sx * (w * 0.5 + 0.18), y, z);
        if (crooked && sx > 0) { p.rotation.z = -0.32; p.position.x += 0.12; p.position.y -= 0.18; }
        parent.add(p);
        for (const hy of [-h * 0.35, h * 0.35]) { const hg = mk(new T.BoxGeometry(0.14, 0.04, 0.03), iron(), { ink: false }); hg.position.set(x + sx * (w * 0.5 + 0.05), y + hy, z + 0.04); parent.add(hg); }
      }
    };
    shut(wallF, -5.2, 2.8, 1.4, 2.2, Z + 0.2, '#2e5a4e', false); shut(wallF, 5.2, 2.8, 1.4, 2.2, Z + 0.2, '#2e5a4e', true);
    shut(upF, -5, 8.6, 1.3, 1.9, 6.45, '#5a2e3e', true); shut(upF, 5, 8.6, 1.3, 1.9, 6.45, '#5a2e3e', false);
    // ---- window boxes under the ground-floor windows: dead flowers, a cobweb, a tiny pumpkin ----
    for (const [x, kind] of [[-5.2, 0], [5.2, 1]]) {
      const bx = mk(new T.BoxGeometry(1.5, 0.3, 0.36), wood('#4a3020'), { ink: INK, inkW: 0.5 }); bx.position.set(x, 1.38, Z + 0.42); wallF.add(bx);
      const soil = new T.Mesh(new T.BoxGeometry(1.4, 0.04, 0.28), K3D.toon('#241a14')); soil.position.set(x, 1.53, Z + 0.42); wallF.add(soil);
      for (let i = 0; i < 7; i++) {
        const sx = x - 0.6 + i * 0.2, ht = 0.25 + rnd() * 0.3, droop = 0.4 + rnd() * 0.8;
        const stem = mk(new T.CylinderGeometry(0.012, 0.012, ht, 4).translate(0, ht / 2, 0), M('deadStem', () => K3D.toon('#4a4a2a')), { ink: false });
        stem.position.set(sx, 1.53, Z + 0.42 + (rnd() - 0.5) * 0.15); stem.rotation.z = (rnd() - 0.5) * droop; wallF.add(stem);
        const head = mk(new T.SphereGeometry(0.05, 6, 4), M(kind ? 'deadRose' : 'deadDaisy', () => K3D.toon(kind ? '#5a1a2a' : '#8a7a4a')), { ink: INK, inkW: 0.3 });
        head.position.set(sx - Math.sin(stem.rotation.z) * ht, 1.53 + Math.cos(stem.rotation.z) * ht, stem.position.z); head.scale.y = 0.6; wallF.add(head);
      }
      const pk = mk(new T.SphereGeometry(0.11, 10, 8), M('pumpkin', () => K3D.toon('#d0661a')), { ink: INK, inkW: 0.4 }); pk.scale.y = 0.75; pk.position.set(x + 0.55, 1.6, Z + 0.45); wallF.add(pk);
    }
    // ---- a stone footing along the front with crawlspace vents, and a weathered house number ----
    const stoneM = M('footing', () => K3D.toon('#ffffff', { map: K3D.paint('pm-footing', 256, 64, (c, w, h) => { c.fillStyle = '#4a4450'; c.fillRect(0, 0, w, h); for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) { const x = i * 30 + (r ? 15 : 0) + rnd() * 4; c.fillStyle = ['#5a5462', '#433e4a', '#55505e'][Math.floor(rnd() * 3)]; c.fillRect(x + 2, r * 32 + 2, 26, 28); } c.fillStyle = 'rgba(60,80,50,0.5)'; for (let i = 0; i < 14; i++) c.fillRect(rnd() * w, h - 10 + rnd() * 10, 6 + rnd() * 12, 4); }) }));
    for (const [x0, x1] of [[-8.2, -3.7], [3.7, 8.2]]) {
      const ft = mk(new T.BoxGeometry(x1 - x0, 0.6, 0.18), stoneM, { ink: INK, inkW: 0.5 }); ft.position.set((x0 + x1) / 2, 0.3, Z + 0.1); low.add(ft);
      const vent = mk(new T.BoxGeometry(0.6, 0.26, 0.04), iron(), { ink: INK, inkW: 0.3 }); vent.position.set((x0 + x1) / 2, 0.3, Z + 0.2); low.add(vent);
      for (let i = 0; i < 5; i++) { const b = new T.Mesh(new T.BoxGeometry(0.03, 0.22, 0.02), K3D.flat('#0a0810')); b.position.set((x0 + x1) / 2 - 0.24 + i * 0.12, 0.3, Z + 0.225); low.add(b); }
    }
    const num = mk(new T.BoxGeometry(0.5, 0.3, 0.04), FIG.brass(), { ink: INK, inkW: 0.4 }); num.position.set(1.7, 2.9, Z + 0.1); wallF.add(num);
    const numT = new T.Mesh(new T.PlaneGeometry(0.44, 0.24), K3D.flat('#ffffff', { transparent: true, map: K3D.paint('pm-num13', 128, 64, (c, w, h) => { c.fillStyle = '#2a1e10'; c.font = '700 44px "DejaVu Serif", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('13', w / 2, h / 2 + 2); }) }));
    numT.position.set(1.7, 2.9, Z + 0.125); wallF.add(numT);
    // ---- ivy: a vine climbing the left of the front and round the tower, thick with dark leaves ----
    const leafGeo = K3D.geo('pm-ivyLeaf', () => { const sh = new T.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.12, 0.05, 0.1, 0.16); sh.lineTo(0, 0.22); sh.lineTo(-0.1, 0.16); sh.quadraticCurveTo(-0.12, 0.05, 0, 0); return new T.ShapeGeometry(sh); });
    const ivy = (parent, pts, n, wall) => {
      const curve = new T.CatmullRomCurve3(pts.map(p => V(...p)));
      parent.add(mk(new T.TubeGeometry(curve, 40, 0.035, 5), M('vine', () => K3D.toon('#3a3020')), { ink: false }));
      const im = new T.InstancedMesh(leafGeo, M('ivyLeaf', () => K3D.toon('#2c5a34', { side: T.DoubleSide })), n), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
      const cols = ['#2c5a34', '#3a6a2a', '#24482c', '#4a5a24'], col = new T.Color();
      for (let i = 0; i < n; i++) {
        const t = i / n, p = curve.getPoint(t);
        const off = V((rnd() - 0.5) * 0.7, (rnd() - 0.5) * 0.5, 0);
        if (wall === 'tower') { const a = Math.atan2(p.x + 8.6, p.z - 5.2); off.set(Math.cos(a) * (rnd() - 0.5) * 0.7, (rnd() - 0.5) * 0.5, -Math.sin(a) * (rnd() - 0.5) * 0.7); e.set(0, a, rnd() * 6); }
        else e.set(0, 0, rnd() * 6);
        const sc = 0.8 + rnd() * 0.8;
        m4.compose(p.clone().add(off).add(V(0, 0, wall === 'tower' ? 0 : 0.03)), q.setFromEuler(e), V(sc, sc, sc)); im.setMatrixAt(i, m4); im.setColorAt(i, col.set(cols[i % 4]));
      }
      K3D.ink(im, '#0a1a0e', 0.3); parent.add(im);
    };
    ivy(wallF, [[-7.6, 0.2, Z + 0.06], [-7.2, 1.6, Z + 0.06], [-7.8, 3.2, Z + 0.06], [-6.6, 4.6, Z + 0.06], [-7.4, 5.9, Z + 0.06], [-6.2, 6.2, Z + 0.1]], 120);
    ivy(wallF, [[7.9, 0.2, Z + 0.06], [7.6, 1.2, Z + 0.06], [7.9, 2.2, Z + 0.06]], 40);
    const tw = []; for (let i = 0; i <= 10; i++) { const a = 0.2 + i * 0.32, y = i * 0.75; tw.push([-8.6 + Math.sin(a) * 2.04, y, 5.2 + Math.cos(a) * 2.04]); }
    ivy(upF, tw, 160, 'tower');
    // ---- gutters along the upper eaves and a downpipe into a rain barrel at the corner ----
    const gut = mk(new T.CylinderGeometry(0.1, 0.1, 17.2, 8, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), M('gutter', () => K3D.toon('#3a3c48', { side: T.DoubleSide })), { ink: INK, inkW: 0.4 }); gut.position.set(0, 10.55, 6.6); upF.add(gut);
    const pipe = mk(new T.CylinderGeometry(0.07, 0.07, 10.4, 8), M('gutter', () => K3D.toon('#3a3c48', { side: T.DoubleSide })), { ink: INK, inkW: 0.4 }); pipe.position.set(8.25, 5.35, 6.5); upF.add(pipe);
    for (let y = 1; y < 10; y += 2.2) { const br = mk(new T.BoxGeometry(0.2, 0.05, 0.2), iron(), { ink: false }); br.position.set(8.25, y, 6.42); upF.add(br); }
    const barrel = mk(new T.CylinderGeometry(0.38, 0.34, 0.85, 14), wood('#5a3a22'), { ink: INK, inkW: 0.5 }); barrel.position.set(8.9, 0.43, 6.9); low.add(barrel);
    for (const y of [0.15, 0.7]) { const hoop = mk(new T.TorusGeometry(0.37, 0.025, 4, 18), iron(), { ink: false }); hoop.rotation.x = Math.PI / 2; hoop.position.set(8.9, y, 6.9); low.add(hoop); }
    const water = new T.Mesh(new T.CircleGeometry(0.33, 16), K3D.toon('#20304a', { emissive: '#1a2a4a', emissiveIntensity: 0.6 })); water.rotation.x = -Math.PI / 2; water.position.set(8.9, 0.8, 6.9); low.add(water);
    // ---- a little iron balcony at the middle upstairs window, a cornice of brackets under the eaves ----
    const bal = mk(new T.BoxGeometry(2.0, 0.1, 0.8), trim, { ink: INK, inkW: 0.5 }); bal.position.set(0, 7.55, 6.8); upF.add(bal);
    for (let i = 0; i <= 12; i++) { const b = mk(K3D.geo('pm-balRail', () => new T.CylinderGeometry(0.018, 0.018, 0.75, 4)), iron(), { ink: false }); b.position.set(-0.95 + i * (1.9 / 12), 7.97, 7.18); upF.add(b); }
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const b = mk(K3D.geo('pm-balRail', () => new T.CylinderGeometry(0.018, 0.018, 0.75, 4)), iron(), { ink: false }); b.position.set(sx * 0.97, 7.97, 6.5 + i * 0.3); upF.add(b); }
    const rail = mk(new T.BoxGeometry(2.0, 0.05, 0.05), iron(), { ink: INK, inkW: 0.3 }); rail.position.set(0, 8.35, 7.18); upF.add(rail);
    for (const sx of [-1, 1]) { const br = mk(new T.BoxGeometry(0.1, 0.5, 0.6), trim, { ink: INK, inkW: 0.4 }); br.position.set(sx * 0.8, 7.25, 6.7); upF.add(br); }
    for (let i = 0; i < 17; i++) { const cb = mk(K3D.geo('pm-corbel', () => new T.BoxGeometry(0.16, 0.26, 0.26)), trim, { ink: INK, inkW: 0.3 }); cb.position.set(-8.0 + i * 1.0, 10.42, 6.5); upF.add(cb); }
    // ---- gargoyles on the corners of the band between the storeys, eyes glowing faintly ----
    const stoneG = M('gargoyle', () => K3D.toon('#6a6474'));
    for (const sx of [-1, 1]) {
      const gg = new T.Group(); gg.position.set(sx * 8.2, 6.6, 6.5); gg.rotation.y = sx * 0.5; upF.add(gg);
      const body = mk(new T.SphereGeometry(0.32, 12, 8), stoneG, { ink: INK, inkW: 0.5 }); body.scale.set(1, 0.9, 1.2); body.position.y = 0.3; gg.add(body);
      const hd = mk(new T.SphereGeometry(0.2, 10, 8), stoneG, { ink: INK, inkW: 0.5 }); hd.position.set(0, 0.55, 0.32); gg.add(hd);
      for (const hx of [-1, 1]) { const horn = mk(new T.ConeGeometry(0.05, 0.22, 5), stoneG, { ink: INK, inkW: 0.3 }); horn.position.set(hx * 0.1, 0.75, 0.28); horn.rotation.z = -hx * 0.4; gg.add(horn);
        const wing = mk(new T.BoxGeometry(0.04, 0.4, 0.34), stoneG, { ink: INK, inkW: 0.3 }); wing.position.set(hx * 0.3, 0.5, -0.05); wing.rotation.z = -hx * 0.6; gg.add(wing);
        const eye = new T.Mesh(new T.SphereGeometry(0.03, 6, 4), K3D.flat(hot('#ff5040', 2.2))); eye.position.set(hx * 0.07, 0.58, 0.5); gg.add(eye); }
      const jaw = mk(new T.BoxGeometry(0.2, 0.06, 0.16), stoneG, { ink: INK, inkW: 0.3 }); jaw.position.set(0, 0.42, 0.44); jaw.rotation.x = 0.4; gg.add(jaw);
    }
    // ---- the porch: railings each side of the steps, a rocking chair, a doormat, a wreath, pumpkins on the steps ----
    const pr = (x0, x1, z) => {
      const bar = mk(new T.BoxGeometry(Math.abs(x1 - x0), 0.07, 0.08), wood('#3a2a22'), { ink: INK, inkW: 0.4 }); bar.position.set((x0 + x1) / 2, 1.0, z); wallF.add(bar);
      const n = Math.round(Math.abs(x1 - x0) / 0.22);
      for (let i = 0; i <= n; i++) { const b = mk(K3D.geo('pm-baluster', () => new T.CylinderGeometry(0.03, 0.04, 0.82, 6)), wood('#3a2a22'), { ink: false }); b.position.set(x0 + (x1 - x0) * i / n, 0.6, z); if (i === 3 && x0 < 0) { b.rotation.z = 0.5; b.position.y = 0.45; } wallF.add(b); }
    };
    pr(-3.3, -1.3, 8.45); pr(1.3, 3.3, 8.45);
    const mat = new T.Mesh(new T.PlaneGeometry(1.2, 0.6), K3D.toon('#ffffff', { map: K3D.paint('pm-mat', 192, 96, (c, w, h) => { c.fillStyle = '#6a4a2a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3a2412'; c.lineWidth = 6; c.strokeRect(6, 6, w - 12, h - 12); c.fillStyle = '#2a180c'; c.font = '700 30px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('GO AWAY', w / 2, h / 2); }) }));
    mat.rotation.x = -Math.PI / 2; mat.position.set(0, 0.19, 6.75); low.add(mat);
    const wreath = mk(new T.TorusGeometry(0.28, 0.07, 6, 18), M('twigs', () => K3D.toon('#3a2a1e')), { ink: INK, inkW: 0.4 }); wreath.position.set(0.55, 2.2, Z + 0.17); wallF.add(wreath);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, tw2 = mk(K3D.geo('pm-twig', () => new T.CylinderGeometry(0.01, 0.01, 0.2, 3)), M('twigs', () => K3D.toon('#3a2a1e')), { ink: false }); tw2.position.set(0.55 + Math.cos(a) * 0.3, 2.2 + Math.sin(a) * 0.3, Z + 0.2); tw2.rotation.z = a + 0.6; wallF.add(tw2); }
    const bow = mk(new T.SphereGeometry(0.06, 6, 4), M('ribbon', () => K3D.toon('#6a1a2a')), { ink: INK, inkW: 0.3 }); bow.scale.set(2, 1, 0.5); bow.position.set(0.55, 1.9, Z + 0.22); wallF.add(bow);
    // a rocking chair (it rocks on its own; see SC.porchChair) and a side table with a candle
    const ch = new T.Group(); ch.position.set(2.7, 0.18, 7.3); ch.rotation.order = 'YXZ'; ch.rotation.y = -0.5; wallF.add(ch); ch.userData.live = true; SC.porchChair = ch;
    const cw = wood('#4a2a1a');
    for (const sx of [-1, 1]) { const rk = mk(new T.TorusGeometry(0.7, 0.03, 4, 16, 1.1), cw, { ink: INK, inkW: 0.3 }); rk.rotation.set(0, Math.PI / 2, Math.PI * 1.5 - 0.55); rk.position.set(sx * 0.24, 0.72, 0); ch.add(rk);
      const leg = mk(new T.BoxGeometry(0.04, 0.5, 0.04), cw, { ink: false }); leg.position.set(sx * 0.24, 0.27, 0.15); ch.add(leg); const leg2 = leg.clone(); leg2.position.z = -0.18; ch.add(leg2);
      const back = mk(new T.BoxGeometry(0.04, 0.8, 0.04), cw, { ink: false }); back.position.set(sx * 0.24, 0.85, -0.22); back.rotation.x = -0.15; ch.add(back); }
    const seat = mk(new T.BoxGeometry(0.52, 0.05, 0.42), cw, { ink: INK, inkW: 0.3 }); seat.position.set(0, 0.5, 0); ch.add(seat);
    for (let i = 0; i < 4; i++) { const sl = mk(new T.BoxGeometry(0.06, 0.66, 0.02), cw, { ink: false }); sl.position.set(-0.15 + i * 0.1, 0.88, -0.24); sl.rotation.x = -0.15; ch.add(sl); }
    const shawl = mk(new T.BoxGeometry(0.5, 0.4, 0.03), M('shawl', () => K3D.toon('#7a5a8a')), { ink: INK, inkW: 0.3 }); shawl.position.set(0, 0.95, -0.2); shawl.rotation.x = -0.15; ch.add(shawl);
    const tbl = mk(new T.CylinderGeometry(0.22, 0.22, 0.05, 12), cw, { ink: INK, inkW: 0.3 }); tbl.position.set(2.0, 0.78, 6.55); wallF.add(tbl);
    const tleg = mk(new T.CylinderGeometry(0.03, 0.06, 0.6, 6), cw, { ink: false }); tleg.position.set(2.0, 0.48, 6.55); wallF.add(tleg);
    const cnd = mk(new T.CylinderGeometry(0.03, 0.035, 0.18, 6), M('wax', () => K3D.toon('#efe6cf')), { ink: false }); cnd.position.set(2.0, 0.9, 6.55); wallF.add(cnd);
    sprite(K, wallF, 2.0, 1.04, 6.55, 0.5, '#ffb050', 0.7);
    // pumpkins up the steps (carved, glowing), gourds on the porch corner
    for (const [x, z, y, s, lit] of [[-1.5, 8.75, 0.09, 0.26, true], [1.45, 9.03, 0.05, 0.22, true], [-3.0, 7.0, 0.18, 0.2, false], [-2.75, 6.7, 0.18, 0.14, false], [3.1, 6.55, 0.18, 0.16, false]]) {
      const pk = mk(K3D.geo('pm-pk|' + s, () => new T.SphereGeometry(s, 12, 8)), M('pumpkin', () => K3D.toon('#d0661a')), { ink: INK, inkW: 0.4 }); pk.scale.y = 0.78; pk.position.set(x, y + s * 0.7, z); low.add(pk);
      const stalk = mk(new T.CylinderGeometry(0.02, 0.03, 0.08, 5), M('stalk', () => K3D.toon('#3a4a1a')), { ink: false }); stalk.position.set(x, y + s * 1.45, z); low.add(stalk);
      if (lit) { const f = new T.Mesh(new T.PlaneGeometry(s * 1.2, s * 0.9), M('jackFace', () => K3D.flat(hot('#ffb030', 2.2), { transparent: true }))); f.position.set(x, y + s * 0.75, z + s * 0.98); low.add(f); sprite(K, low, x, y + s * 0.8, z + 0.2, 0.9, '#ff9a30', 0.35); }
    }
    // cobwebs in the porch roof's corners
    web(K, wallF, -3.25, 3.25, 8.3, 0.4, -0.6, 0.9); web(K, wallF, 3.25, 3.2, 8.3, -0.4, -0.6, 0.8);
    // ---- dead rose beds along the front either side of the porch, edged in stone, with a sundial on one ----
    const bed = (x0, x1) => {
      const cx = (x0 + x1) / 2, w = x1 - x0;
      const soil = new T.Mesh(new T.BoxGeometry(w, 0.12, 1.1), K3D.toon('#2a1e18')); soil.position.set(cx, 0.06, Z + 0.95); low.add(soil);
      for (const [dx, dz, ww, dd] of [[0, 0.56, w + 0.1, 0.1], [0, -0.56, w + 0.1, 0.1], [-w / 2, 0, 0.1, 1.2], [w / 2, 0, 0.1, 1.2]]) { const e = mk(new T.BoxGeometry(ww, 0.18, dd), stoneM, { ink: INK, inkW: 0.3 }); e.position.set(cx + dx, 0.09, Z + 0.95 + dz); low.add(e); }
      for (let i = 0; i < Math.round(w * 2.2); i++) {
        const x = x0 + 0.25 + rnd() * (w - 0.5), z = Z + 0.55 + rnd() * 0.8, ht = 0.35 + rnd() * 0.45;
        const bush = mk(new T.CylinderGeometry(0.012, 0.016, ht, 4).translate(0, ht / 2, 0), M('thorn', () => K3D.toon('#2e2a1a')), { ink: false }); bush.position.set(x, 0.1, z); bush.rotation.set((rnd() - 0.5) * 0.6, 0, (rnd() - 0.5) * 0.6); low.add(bush);
        if (rnd() < 0.6) { const r = mk(K3D.geo('pm-rose', () => new T.DodecahedronGeometry(0.06, 0)), M('blackRose', () => K3D.toon(['#6a0a1e', '#3a0a14'][0])), { ink: INK, inkW: 0.3 }); r.position.set(x + Math.sin(bush.rotation.z) * -ht, 0.1 + ht, z + Math.sin(bush.rotation.x) * ht); low.add(r); }
      }
    };
    bed(-6.4, -4.1); bed(4.1, 7.6);
    const dial = new T.Group(); dial.position.set(5.85, 0, Z + 0.95); low.add(dial);
    const dped = mk(new T.CylinderGeometry(0.12, 0.18, 0.7, 8), stoneG, { ink: INK, inkW: 0.4 }); dped.position.y = 0.35; dial.add(dped);
    const dtop = mk(new T.CylinderGeometry(0.26, 0.26, 0.05, 16), FIG.brass(), { ink: INK, inkW: 0.4 }); dtop.position.y = 0.72; dial.add(dtop);
    const gn = mk(new T.BoxGeometry(0.02, 0.18, 0.2), FIG.brass(), { ink: false }); gn.position.y = 0.82; gn.rotation.x = 0.5; dial.add(gn);
    return low;
  }

  /* =============================== the manor's front, upper floor and roofs =============================== */
  function facade(K, B) {
    const up = new T.Group(); up.userData.live = true; K.add(up); // the upper floor, roofs and tower: hidden indoors
    const always = new T.Group(); K.add(always);
    const porchTop = new T.Group(); porchTop.userData.live = true; K.add(porchTop); // the porch roof and sign: hidden indoors so the hall camera sees in
    const outM = toonT('clap', '#ffffff', clap()), shM = toonT('shingle', '#ffffff', shingles()), trim = M('trim', () => K3D.toon('#2a2232'));
    const R = H.art.hall;
    // the porch: decking, steps, two posts and a lean-to roof with fretwork; the lantern and key hooks by the door
    const deck = mk(uvBox(7.2, 0.18, 2.6, (f, fw, fh) => [fw / 2, fh / 2]), toonT('deck', '#ffffff', PARK.wood('#5a3a28')), { ink: INK, inkW: 0.6 }); deck.position.set(0, 0.09, 7.3); always.add(deck);
    for (let i = 0; i < 2; i++) { const st = mk(new T.BoxGeometry(2.4, 0.09, 0.3), wood('#5a3a28'), { ink: INK, inkW: 0.5 }); st.position.set(0, 0.045 + i * 0.0, 8.75 + i * 0.28); st.scale.y = 1 - i * 0.5; always.add(st); }
    for (const sx of [-1, 1]) { const p = mk(new T.CylinderGeometry(0.12, 0.14, 3.6, 8), wood('#3a2a22'), { ink: INK, inkW: 0.6 }); p.position.set(sx * 3.3, 1.8, 8.4); porchTop.add(p); }
    const proof = mk(uvBox(7.8, 0.12, 3.4, (f, fw, fh) => [fw / 2, fh / 2]), shM, { ink: INK, inkW: 0.7 }); proof.position.set(0, 3.75, 7.4); proof.rotation.x = 0.28; porchTop.add(proof);
    for (let i = 0; i < 9; i++) { const fr = mk(new T.TorusGeometry(0.22, 0.025, 4, 10, Math.PI), trim, { ink: false }); fr.position.set(-3.2 + i * 0.8, 3.38, 8.45); fr.rotation.z = Math.PI; porchTop.add(fr); }
    for (const [x, kind] of [[H.hooks.lantern.x, 'l'], [H.hooks.key.x, 'k']]) { const hk = mk(new T.TorusGeometry(0.06, 0.015, 5, 10, Math.PI * 1.3), iron(), { ink: INK, inkW: 0.3 }); hk.position.set(x, 1.95, 6.3); always.add(hk); const board = mk(new T.BoxGeometry(0.5, 0.34, 0.04), wood('#6a4a30'), { ink: INK, inkW: 0.4 }); board.position.set(x, 2.12, 6.24); always.add(board); }
    // the porch light: a lantern by the door that is on ("tonight a light is on")
    const pl = FIG.lantern(); pl.position.set(-1.6, 2.5, 6.35); pl.scale.setScalar(1.3); always.add(pl); pl.userData.live = true;
    sprite(K, always, -1.6, 2.72, 6.45, 1.6, '#ffb060', 0.5);
    // front windows each side of the door: lit warm and dim, curtains drawn, a silhouette in one
    const winL = (x, y, w, h, z, lit, sil) => {
      const wg = new T.Group(); wg.position.set(x, y, z); always.add(wg);
      const glass = new T.Mesh(new T.PlaneGeometry(w, h), K3D.flat(hot(lit, 1.0))); glass.position.z = 0.22; wg.add(glass);
      for (const sx of [-1, 1]) { const cu = new T.Mesh(new T.PlaneGeometry(w * 0.32, h), K3D.toon('#ffffff', { map: velvet('#5a1a3a') })); cu.position.set(sx * w * 0.34, 0, 0.23); wg.add(cu); }
      if (sil) { const s = new T.Mesh(new T.CircleGeometry(0.25, 16), K3D.flat('#1a0e14')); s.position.set(0.05, 0.25, 0.235); s.scale.y = 1.2; wg.add(s); const sb = new T.Mesh(new T.PlaneGeometry(0.5, 0.7), K3D.flat('#1a0e14')); sb.position.set(0.05, -0.3, 0.235); wg.add(sb); }
      const fr = mk(new T.BoxGeometry(w + 0.2, h + 0.2, 0.12), trim, { ink: INK, inkW: 0.5 }); fr.position.z = 0.16; wg.add(fr); fr.scale.z = 0.5;
      const mul = mk(new T.BoxGeometry(0.06, h, 0.06), trim, { ink: false }); mul.position.z = 0.25; wg.add(mul);
      const mul2 = mk(new T.BoxGeometry(w, 0.06, 0.06), trim, { ink: false }); mul2.position.z = 0.25; wg.add(mul2);
      const sill = mk(new T.BoxGeometry(w + 0.4, 0.1, 0.3), trim, { ink: INK, inkW: 0.4 }); sill.position.set(0, -h / 2 - 0.12, 0.25); wg.add(sill);
      sprite(K, wg, 0, 0, 0.6, Math.max(w, h) * 1.6, lit, 0.16);
      return wg;
    };
    winL(-5.2, 2.8, 1.4, 2.2, 6.0, '#8a5a3a', false); winL(5.2, 2.8, 1.4, 2.2, 6.0, '#6a3a5a', true);
    // the upper floor over the hall: clapboard, three windows, a jutting central gable; a crooked roof of slates
    const upper = mk(uvBox(16.8, 4.2, 16.8, (f, fw, fh) => [fw / 2, fh / 2]), [outM, outM, shM, shM, outM, outM], { ink: INK, inkW: 0.9 }); upper.position.set(0, 6.4 + 2.1, -2); up.add(upper);
    const band = mk(new T.BoxGeometry(17.2, 0.25, 17.2), trim, { ink: INK, inkW: 0.6 }); band.position.set(0, 6.45, -2); up.add(band);
    for (const [x, col, sil] of [[-5, '#2a2a52', false], [0, '#3a6a5a', false], [5, '#4a2a5a', true]]) { const w = winL(x, 8.6, 1.3, 1.9, 6.2, col, sil); up.add(w); }
    // the round attic window with an eye that opens now and then
    const roof = new T.Group(); roof.position.set(0, 10.6, -2); roof.rotation.z = 0.025; up.add(roof);
    const pitch = 0.62, half = 8.6, slope = half / Math.cos(pitch);
    for (const sx of [-1, 1]) { const sl = mk(uvBox(slope + 0.6, 0.2, 17.6, (f, fw, fh) => [fw / 2, fh / 2]), shM, { ink: INK, inkW: 0.9 }); sl.position.set(sx * half / 2, Math.tan(pitch) * half / 2, 0); sl.rotation.z = -sx * pitch; roof.add(sl); }
    const gableS = new T.Shape(); gableS.moveTo(-half, 0); gableS.lineTo(0, Math.tan(pitch) * half); gableS.lineTo(half, 0); gableS.closePath();
    // the gables: the front one in painted fish-scale shingles (dusky mauve with a pale trim), the back one plain
    const fishM = M('fishGable', () => { const tx = fishScale(); tx.repeat.set(0.2, 0.26); return K3D.toon('#ffffff', { map: tx, side: T.DoubleSide }); });
    for (const sz of [-1, 1]) { const gb = mk(new T.ShapeGeometry(gableS), sz > 0 ? fishM : M('gable', () => K3D.toon('#3a3450', { side: T.DoubleSide })), { ink: INK, inkW: 0.6 }); gb.position.z = sz * 8.4 + (sz > 0 ? 0.02 : 0); roof.add(gb); }
    // a fretwork bargeboard along the front gable's eaves, with a finial at the peak
    for (const sx of [-1, 1]) { const bb = mk(new T.BoxGeometry(slope + 0.4, 0.22, 0.08), trim, { ink: INK, inkW: 0.5 }); bb.position.set(sx * half / 2, Math.tan(pitch) * half / 2 - 0.12, 8.5); bb.rotation.z = -sx * pitch; roof.add(bb);
      for (let i = 1; i < 9; i++) { const t = i / 9, dr = mk(K3D.geo('pm-drip', () => new T.ConeGeometry(0.07, 0.26, 4)), trim, { ink: false }); dr.rotation.z = Math.PI; dr.position.set(sx * half * (1 - t), Math.tan(pitch) * half * t - 0.36, 8.5); roof.add(dr); } }
    const fin = mk(new T.ConeGeometry(0.1, 0.9, 6), iron(), { ink: INK, inkW: 0.4 }); fin.position.set(0, Math.tan(pitch) * half + 0.4, 8.5); roof.add(fin);
    const att = new T.Mesh(new T.CircleGeometry(0.7, 24), K3D.flat(hot('#7affc0', 0.55))); att.position.set(0, 2.2, 8.42); roof.add(att);
    const attF = mk(new T.TorusGeometry(0.72, 0.09, 6, 24), trim, { ink: INK, inkW: 0.5 }); attF.position.set(0, 2.2, 8.43); roof.add(attF);
    SC.atticEye = new T.Mesh(new T.CircleGeometry(0.28, 20), K3D.flat('#1a0a14')); SC.atticEye.position.set(0, 2.2, 8.45); roof.add(SC.atticEye); SC.atticEye.userData.live = true;
    // a crooked chimney
    const ch = mk(new T.BoxGeometry(0.9, 3.2, 0.9), M('brick', () => K3D.toon('#5a3a3a')), { ink: INK, inkW: 0.6 }); ch.position.set(4.5, 3.6, -3); ch.rotation.z = -0.08; roof.add(ch);
    // the neon ghost on the ridge, buzzing (its light is green on everything near)
    const ng = new T.Group(); ng.position.set(-1.2, Math.tan(pitch) * half + 1.6, 0.6); roof.add(ng);
    const frame = mk(new T.BoxGeometry(3.4, 3.2, 0.1), M('neonBack', () => K3D.toon('#1a1626')), { ink: INK, inkW: 0.5 }); frame.position.z = -0.1; ng.add(frame);
    for (const sx of [-1, 1]) { const leg = mk(new T.BoxGeometry(0.1, 2.4, 0.1), iron(), { ink: INK, inkW: 0.3 }); leg.position.set(sx * 1.2, -1.6, -0.2); ng.add(leg); }
    SC.neonM = new T.MeshBasicMaterial({ map: neonGhostTex(), color: hot('#ffffff', 2.4), transparent: true, depthWrite: false, toneMapped: false });
    const tube = new T.Mesh(new T.PlaneGeometry(3.2, 3.2), SC.neonM); tube.renderOrder = 3; ng.add(tube); tube.userData.live = true;
    SC.neonHalo = sprite(K, ng, 0, 0, 0.3, 9, '#5affb0', 0.35);
    // the round tower on the front-left corner with its witch's-hat roof and a weathervane (a bat)
    const tw = new T.Group(); tw.position.set(-8.6, 0, 5.2); up.add(tw);
    const tbody = mk(new T.CylinderGeometry(1.9, 2.0, 9.6, 20, 1, true), M('towerM', () => K3D.toon('#ffffff', { map: clap(), side: T.DoubleSide })), { ink: INK, inkW: 0.8 }); tbody.position.y = 4.8; tw.add(tbody);
    const ttop = new T.Group(); ttop.userData.live = true; tw.add(ttop); up.userData.tower = ttop;
    const hat = mk(new T.ConeGeometry(2.5, 5.2, 20), shM, { ink: INK, inkW: 0.9 }); hat.position.set(0.15, 12.2, 0); hat.rotation.z = -0.1; tw.add(hat);
    const vane = mk(new T.CylinderGeometry(0.03, 0.03, 1.4, 5), iron(), { ink: INK, inkW: 0.3 }); vane.position.set(0.6, 15.1, 0); tw.add(vane);
    for (const [y, col] of [[3.2, '#3a2a52'], [6.6, '#7a4a2a']]) { const w = winL(0, y, 0.8, 1.6, 0, col, false); w.position.set(0.9, y, 1.75); w.rotation.y = 0.45; tw.add(w); }
    // the corridor wing's lean-to roof (hidden inside it)
    const corRoof = new T.Group(); corRoof.userData.live = true; K.add(corRoof);
    const cr = mk(uvBox(23, 0.18, 5.8, (f, fw, fh) => [fw / 2, fh / 2]), shM, { ink: INK, inkW: 0.8 }); cr.position.set(19.2, 4.3, -4.5); cr.rotation.x = 0.22; corRoof.add(cr);
    // the attraction's sign over the porch roof and bulbs along the eaves and porch
    const ns = PARK.neon(K, 'ENTER IF YOU DARE', { w: 5.6, h: 1.0, col: '#ff5a6a', x: 0, y: 4.75, z: 8.0, k: 1.25, fs: 42 }); porchTop.add(ns);
    // the porch's own bulb string, so it hides with the porch roof when the camera is looking into the hall
    const pb = PARK.bulbs(K, 40); pb.line([-3.6, 3.45, 8.7], [3.6, 3.45, 8.7], 0.45, '#ffb860', { sag: 0.15, speed: 1.5 }); porchTop.add(pb.done());
    return { up, always, corRoof, porchTop };
  }

  /* =============================== the Front Hall =============================== */
  function hall(K, B, wallsBy) {
    const g = new T.Group(); K.add(g);
    const R = H.art.hall, deco = id => wallsBy[id].full;
    // the chequered floor, polished; a long rug from the door to the stair
    const fl = mk(new T.PlaneGeometry(16, 16).rotateX(-Math.PI / 2), toonT('checker', '#ffffff', checker()), { ink: false }); fl.position.set(0, 0.01, -2);
    fl.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 4; }); g.add(fl);
    const rug = new T.Mesh(new T.PlaneGeometry(2.2, 9).rotateX(-Math.PI / 2), M('rugM', () => K3D.toon('#ffffff', { map: runner() }))); rug.position.set(0, 0.02, 1.0); rug.receiveShadow = true; g.add(rug);
    // footprints in the dust: two sets that walk in, and a third pair that walks up the WALL
    const fp = M('feetM', () => K3D.flat('#ffffff', { map: footTex(), transparent: true, depthWrite: false }));
    for (const [x, z, a] of [[-2.2, 2, 0.1], [2.6, -1, -0.3], [-5.4, -4, 0.7]]) { const f = new T.Mesh(new T.PlaneGeometry(0.5, 2).rotateX(-Math.PI / 2), fp); f.position.set(x, 0.025, z); f.rotation.y = a; g.add(f); }
    const fw = new T.Mesh(new T.PlaneGeometry(0.5, 2), fp); fw.position.set(-7.78, 1.4, -1.5); fw.rotation.y = Math.PI / 2; deco('hallLeft').add(fw);
    // cables taped across the floor to the stage lamp, a fire bucket, a STAFF ONLY door painted on the back wall
    const cable = (pts) => g.add(mk(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => V(p[0], 0.03, p[1]))), 30, 0.03, 5), M('cable', () => K3D.toon('#14121a')), { ink: false }));
    cable([[7.4, 5.2], [6.4, 4.9], [6.6, 2.2], [7.6, 0.8], [7.7, -3.0]]); cable([[-7.5, 5.4], [-6.0, 5.6], [-4.4, 5.7], [-3.2, 4.0]]);
    for (const [x, z] of [[6.5, 3.6], [6.9, 1.6], [-5.2, 5.6]]) { const tp = new T.Mesh(new T.PlaneGeometry(0.4, 0.14).rotateX(-Math.PI / 2), M('tape', () => K3D.toon('#d8c84a'))); tp.position.set(x, 0.04, z); tp.rotation.y = 0.4; g.add(tp); }
    const bucket = mk(new T.CylinderGeometry(0.2, 0.16, 0.36, 12), M('fireBucket', () => K3D.toon('#c83a3a')), { ink: INK, inkW: 0.5 }); bucket.position.set(7.5, 0.18, 5.5); g.add(bucket);
    const sand = new T.Mesh(new T.CircleGeometry(0.18, 12).rotateX(-Math.PI / 2), M('sand', () => K3D.toon('#c8b080'))); sand.position.set(7.5, 0.34, 5.5); g.add(sand);
    signBoard(K, deco('hallFront'), 0, 3.85, Math.PI, 'exit', 1.0, 3.75, true).position.z = 5.72;
    signBoard(K, deco('hallBack'), -6.0, -9.74, 0, 'staff', 1.0, 2.6, true);
    const staffDoor = mk(new T.BoxGeometry(1.2, 2.3, 0.08), wood('#3a3040'), { ink: INK, inkW: 0.6 }); staffDoor.position.set(-6.0, 1.15, -9.76); deco('hallBack').add(staffDoor);
    stageLamp(K, g, 7.0, 5.0, -2.6, '#3aff9a', 0.5);
    stageLamp(K, g, -7.0, -9.2, 0.55, '#b070ff', 0.5);
    // the grand stair: steps with a red runner and brass rods, carved banisters with balusters, newel posts, the landing
    const S = H.art.stair, n = 12, sw = S.w;
    for (let i = 0; i < n; i++) {
      const z0 = S.z0 - (S.z0 - S.z1) * i / n, z1 = S.z0 - (S.z0 - S.z1) * (i + 1) / n, y = S.h * (i + 1) / n;
      const st = mk(new T.BoxGeometry(sw, y, Math.abs(z1 - z0) + 0.02), wood('#3a2218'), { ink: INK, inkW: 0.5 }); st.position.set(0, y / 2, (z0 + z1) / 2); g.add(st);
      const rr = new T.Mesh(new T.BoxGeometry(1.7, 0.02, Math.abs(z1 - z0) + 0.04), M('runnerStep', () => K3D.toon('#7a1828'))); rr.position.set(0, y + 0.012, (z0 + z1) / 2); g.add(rr);
      const rodM = FIG.brass(); const rod = new T.Mesh(K3D.geo('pm-rod', () => new T.CylinderGeometry(0.02, 0.02, 1.8, 5).rotateZ(Math.PI / 2)), rodM); rod.position.set(0, y + 0.03, z0 - 0.03); g.add(rod);
    }
    for (const sx of [-1, 1]) {
      const x = sx * (sw / 2 + 0.12);
      const rail = mk(new T.BoxGeometry(0.14, 0.12, Math.hypot(S.z0 - S.z1, S.h) + 0.3), wood('#2a160e'), { ink: INK, inkW: 0.6 }); rail.position.set(x, S.h / 2 + 1.0, (S.z0 + S.z1) / 2); rail.rotation.x = Math.atan2(S.h, S.z0 - S.z1); g.add(rail);
      for (let i = 0; i <= 14; i++) { const t = i / 14, z = S.z0 - (S.z0 - S.z1) * t, y = S.h * t; const b = mk(K3D.geo('pm-baluster', () => new T.CylinderGeometry(0.035, 0.05, 1.0, 6).translate(0, 0.5, 0)), wood('#2a160e'), { ink: INK, inkW: 0.3 }); b.position.set(x, y, z); g.add(b); }
      const newel = mk(new T.BoxGeometry(0.3, 1.4, 0.3), wood('#2a160e'), { ink: INK, inkW: 0.6 }); newel.position.set(x, 0.7, S.z0 + 0.15); g.add(newel);
      const ball = mk(new T.SphereGeometry(0.2, 12, 8), wood('#2a160e'), { ink: INK, inkW: 0.5 }); ball.position.set(x, 1.55, S.z0 + 0.15); g.add(ball);
      // a carved gargoyle on one newel post (its eyes catch the light)
      if (sx < 0) { const gar = mk(new T.SphereGeometry(0.17, 10, 8), M('stoneGrey', () => K3D.toon('#7a7488')), { ink: INK, inkW: 0.5 }); gar.position.set(x, 1.86, S.z0 + 0.15); gar.scale.set(1, 0.9, 1.1); g.add(gar); for (const ex of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.025, 6, 4), K3D.flat(hot('#ff6a4a', 2))); e.position.set(x + ex * 0.06, 1.9, S.z0 + 0.32); g.add(e); } }
    }
    // the landing: a deck across the back at 3 high on pillars, a balustrade along its front, the velvet rope at the top
    const L = H.art.landing;
    const land = mk(uvBox(16, 0.3, 1.4, (f, fw, fh) => [fw / 2, fh / 2]), wood('#3a2218'), { ink: INK, inkW: 0.7 }); land.position.set(0, L.y - 0.15, (L.z0 + L.z1) / 2); g.add(land);
    for (const x of [-7, -4, 4, 7]) { const pil = mk(new T.CylinderGeometry(0.16, 0.2, 3, 10), wood('#2a160e'), { ink: INK, inkW: 0.5 }); pil.position.set(x, 1.5, L.z1 - 0.1); g.add(pil); }
    const balIM = new T.InstancedMesh(K3D.geo('pm-baluster', () => new T.CylinderGeometry(0.035, 0.05, 1.0, 6).translate(0, 0.5, 0)), wood('#2a160e'), 60);
    let bi = 0; const m4 = new T.Matrix4();
    for (let x = -7.8; x < 7.9; x += 0.32) { if (Math.abs(x) < 1.9) continue; m4.makeTranslation(x, L.y, L.z1 + 0.05); balIM.setMatrixAt(bi++, m4); }
    balIM.count = bi; K3D.ink(balIM, INK, 0.3); g.add(balIM);
    for (const sx of [-1, 1]) { const hr = mk(new T.BoxGeometry(6.2, 0.12, 0.16), wood('#2a160e'), { ink: INK, inkW: 0.5 }); hr.position.set(sx * 4.9, L.y + 1.02, L.z1 + 0.05); g.add(hr); }
    for (const sx of [-1, 1]) { const rp = mk(new T.CylinderGeometry(0.05, 0.07, 1.0, 8), FIG.brass(), { ink: INK, inkW: 0.4 }); rp.position.set(sx * 1.5, L.y + 0.5, -8.8); g.add(rp); }
    const vr = []; for (let i = 0; i <= 10; i++) { const t = i / 10; vr.push(V(-1.5 + 3 * t, L.y + 0.9 - Math.sin(t * Math.PI) * 0.25, -8.8)); }
    g.add(mk(new T.TubeGeometry(new T.CatmullRomCurve3(vr), 12, 0.05, 6), M('velvet', () => K3D.toon('#8a1830')), { ink: INK, inkW: 0.4 }));
    // the landing table with a candelabra, a dusty bust under a sheet
    const lt = mk(new T.BoxGeometry(1.8, 0.7, 0.9), wood('#3a2218'), { ink: INK, inkW: 0.5 }); lt.position.set(6.7, L.y + 0.35, -9.15); g.add(lt);
    candelabra(K, g, 6.4, L.y + 0.7, -9.15, B); candelabra(K, g, 7.1, L.y + 0.7, -9.15, B);
    // the hall clock
    SC.clocks = [];
    // the coat stand (coats, a top hat, a scarf: a wisp hides in the coats), the hall table with a big vase, the bench
    const cs = new T.Group(); cs.position.set(-6.6, 0, 4.7); g.add(cs);
    const csPole = mk(new T.CylinderGeometry(0.05, 0.07, 2.0, 8), wood('#2a160e'), { ink: INK, inkW: 0.4 }); csPole.position.y = 1.0; cs.add(csPole);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const ft = mk(new T.BoxGeometry(0.06, 0.06, 0.5), wood('#2a160e'), { ink: INK, inkW: 0.3 }); ft.position.set(Math.cos(a) * 0.2, 0.05, Math.sin(a) * 0.2); ft.rotation.y = -a + Math.PI / 2; cs.add(ft); }
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.4; const coat = mk(K3D.roundBox(0.42, 1.2, 0.26, 0.6, 14), M('coat' + i, () => K3D.toon(['#3a2a40', '#2a3a2e', '#4a3020'][i])), { ink: INK, inkW: 0.5 }); coat.position.set(Math.cos(a) * 0.22, 0.75, Math.sin(a) * 0.22); coat.rotation.y = -a; cs.add(coat); }
    const tophat = mk(new T.CylinderGeometry(0.16, 0.16, 0.3, 12), M('hat', () => K3D.toon('#14121a')), { ink: INK, inkW: 0.4 }); tophat.position.set(0.05, 2.12, 0); cs.add(tophat);
    const brim = mk(new T.CylinderGeometry(0.26, 0.26, 0.03, 14), M('hat', () => K3D.toon('#14121a')), { ink: INK, inkW: 0.3 }); brim.position.set(0.05, 1.98, 0); cs.add(brim);
    const tbl = mk(new T.BoxGeometry(2.0, 0.08, 1.0), wood('#3a2218'), { ink: INK, inkW: 0.5 }); tbl.position.set(6.6, 0.86, 4.1); g.add(tbl);
    for (const [lx, lz] of [[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]]) { const lg = mk(new T.CylinderGeometry(0.04, 0.03, 0.82, 6), wood('#2a160e'), { ink: INK, inkW: 0.3 }); lg.position.set(6.6 + lx, 0.41, 4.1 + lz); g.add(lg); }
    const vase = mk(new T.LatheGeometry([[0.001, 0], [0.16, 0.02], [0.24, 0.2], [0.2, 0.42], [0.1, 0.52], [0.14, 0.6]].map(p => new T.Vector2(p[0], p[1])), 16), M('vaseM', () => K3D.toon('#2a6a7a')), { ink: INK, inkW: 0.5 }); vase.position.set(6.6, 0.9, 4.1); g.add(vase);
    for (let i = 0; i < 4; i++) { const st = mk(new T.CylinderGeometry(0.008, 0.008, 0.5, 4), M('stem', () => K3D.toon('#2a2a1a')), { ink: false }); st.position.set(6.6 + (i - 1.5) * 0.04, 1.65, 4.1); st.rotation.z = (i - 1.5) * 0.3; g.add(st); const fl2 = mk(new T.SphereGeometry(0.06, 6, 4), M('deadFlower', () => K3D.toon('#4a2a2a')), { ink: INK, inkW: 0.3 }); fl2.position.set(6.6 + (i - 1.5) * 0.12, 1.86, 4.1); g.add(fl2); }
    const bench = mk(K3D.roundBox(0.8, 0.5, 2.4, 0.4, 16), M('benchSheet', () => K3D.toon('#bcb8cc', { emissive: '#1a1830', emissiveIntensity: 0.3 })), { ink: '#3a3450', inkW: 0.6 }); bench.position.set(-7.2, 0, 0.2); g.add(bench);
    // a dust-sheeted armchair and a lumpy sheeted thing in the back corner (a wisp hides under it)
    const lump = mk(K3D.roundBox(1.2, 1.1, 1.0, 0.5, 16), M('benchSheet', () => K3D.toon('#bcb8cc', { emissive: '#1a1830', emissiveIntensity: 0.3 })), { ink: '#3a3450', inkW: 0.6 }); lump.position.set(4.6, 0, -6.8); lump.rotation.y = 0.3; g.add(lump);
    // the rocking chair that rocks on its own (by the front left window)
    const rock = new T.Group(); rock.position.set(-5.6, 0, 2.2); rock.rotation.y = 0.8; rock.userData.live = true; g.add(rock);
    const rw = wood('#4a2a1a');
    for (const sx of [-1, 1]) { const r = mk(new T.TorusGeometry(1.0, 0.04, 5, 16, 0.9), rw, { ink: INK, inkW: 0.3 }); r.rotation.set(0, Math.PI / 2, Math.PI + 1.12); r.position.set(sx * 0.3, 1.0, 0); rock.add(r); }
    const seat = mk(new T.BoxGeometry(0.7, 0.06, 0.6), rw, { ink: INK, inkW: 0.4 }); seat.position.y = 0.5; rock.add(seat);
    const back = mk(new T.BoxGeometry(0.7, 0.9, 0.06), rw, { ink: INK, inkW: 0.4 }); back.position.set(0, 0.95, -0.3); back.rotation.x = -0.15; rock.add(back);
    for (const [x, z] of [[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]]) { const lg = mk(new T.CylinderGeometry(0.025, 0.025, 0.45, 5), rw, { ink: false }); lg.position.set(x, 0.27, z); rock.add(lg); }
    const shawl = mk(new T.BoxGeometry(0.5, 0.5, 0.04), M('shawl', () => K3D.toon('#5a3a5a')), { ink: INK, inkW: 0.3 }); shawl.position.set(0.1, 1.0, -0.26); shawl.rotation.z = 0.2; rock.add(shawl);
    SC.rock = rock;
    // the left wall: two tall windows with rain, velvet curtains that breathe, moonlight shafts falling to the floor
    SC.curtains = []; SC.rain = [];
    for (const z of [-6.0, 0.4]) tallWindow(K, deco('hallLeft'), -7.78, z, Math.PI / 2, 1.9, 3.4, 1.5, B);
    // the right wall: the mirror (it shows someone behind the pair), portraits whose eyes follow
    SC.mirror = mirror(K, deco('hallRight'), 7.78, 1.2, -Math.PI / 2);
    SC.eyes = [];
    portrait(K, deco('hallRight'), 7.78, 3.0, 4.0, -Math.PI / 2, 0, 1.0);
    portrait(K, deco('hallBack'), -3.2, 4.4, -9.78, 0, 2, 1.1);
    portrait(K, deco('hallBack'), 3.2, 4.4, -9.78, 0, 1, 1.1);
    portrait(K, deco('hallLeft'), -7.78, 4.6, -3.0, Math.PI / 2, 4, 0.9);
    // a stuffed moose head (plywood, a ribbon) over the stair; candle sconces round the walls
    const moose = new T.Group(); moose.position.set(0, 5.4, -9.75); deco('hallBack').add(moose);
    const shield = mk(new T.CylinderGeometry(0.5, 0.5, 0.08, 16).rotateX(Math.PI / 2), wood('#4a2a1a'), { ink: INK, inkW: 0.5 }); moose.add(shield);
    const mh = mk(K3D.roundBox(0.5, 0.9, 0.6, 0.6, 14), M('moose', () => K3D.toon('#5a3a24')), { ink: INK, inkW: 0.6 }); mh.position.set(0, -0.45, 0.3); mh.rotation.x = 0.5; moose.add(mh);
    for (const sx of [-1, 1]) { const ant = mk(new T.BoxGeometry(0.9, 0.06, 0.3), M('antler', () => K3D.toon('#d8c8a8')), { ink: INK, inkW: 0.4 }); ant.position.set(sx * 0.6, 0.35, 0.2); ant.rotation.z = sx * 0.4; moose.add(ant); for (let t = 0; t < 3; t++) { const tn = mk(new T.BoxGeometry(0.05, 0.25, 0.05), M('antler', () => K3D.toon('#d8c8a8')), { ink: false }); tn.position.set(sx * (0.35 + t * 0.22), 0.5 + (t % 2) * 0.05, 0.2); moose.add(tn); } }
    for (const sx of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.04, 6, 4), K3D.flat('#0a0a0a')); e.position.set(sx * 0.14, -0.2, 0.62); moose.add(e); }
    for (const [id, x, z, yaw] of [['hallLeft', -7.75, -1.6, Math.PI / 2], ['hallLeft', -7.75, 2.6, Math.PI / 2], ['hallBack', -1.8, -9.75, 0], ['hallBack', 1.8, -9.75, 0], ['hallRight', 7.75, -0.6, -Math.PI / 2], ['hallRight', 7.75, 3.2, -Math.PI / 2], ['hallFront', -3, 5.75, Math.PI], ['hallFront', 3, 5.75, Math.PI]]) sconce(K, deco(id), x, 2.6, z, yaw, B);
    // cobwebs in the corners and on the chandelier; bats asleep along the wall tops
    SC.webs = SC.webs || [];
    for (const [x, y, z, dx, dz] of [[-7.78, 6.3, -9.78, 1, 1], [7.78, 6.3, -9.78, -1, 1], [-7.78, 6.3, 5.78, 1, -1], [7.78, 6.3, 5.78, -1, -1], [-7.78, 2.95, -9.0, 1, 1], [7.78, 2.95, -9.4, -1, 1]]) web(K, g, x, y, z, dx, dz, 1.6);
    for (let i = 0; i < 7; i++) { const b = new T.Mesh(batGeoTuck(), M('batTuck', () => K3D.toon('#14101c'))); b.position.set(-7.6 + rnd() * 0.2, 6.25, -9 + i * 2.0); b.rotation.y = Math.PI / 2; b.scale.setScalar(0.9); g.add(b); }
    // the chandelier (Bo's winder lights it) and its winder box on the left wall
    SC.chand = chandelier(K, g, ...H.winders[0].at, B);
    SC.winder = winderBox(K, deco('hallLeft'), H.winders[0]);
    // horn speaker for the tour guide, high on the back wall
    const hh = new T.Group(); hh.position.set(-7.5, 5.6, -9.5); g.add(hh);
    const cone = mk(K3D.geo('pm-horn', () => new T.ConeGeometry(0.28, 0.6, 14, 1, true).rotateX(-Math.PI / 2)), M('hornM', () => K3D.toon('#b9c2b0', { side: T.DoubleSide })), { ink: INK, inkW: 0.5 }); cone.rotation.set(0.4, 0.7, 0); hh.add(cone); SC.horns.push(hh);
    // a rat hole in the skirting (the rats run along the walls)
    const hole = new T.Mesh(new T.CircleGeometry(0.16, 12, 0, Math.PI), K3D.flat('#050308')); hole.position.set(7.77, 0.02, -7.2); hole.rotation.y = -Math.PI / 2; deco('hallRight').add(hole);
    return g;
  }
  function batGeoTuck() { return K3D.geo('pm-batTuck', () => new T.CapsuleGeometry(0.06, 0.14, 4, 8)); }
  function candelabra(K, g, x, y, z, B) {
    const base = mk(new T.CylinderGeometry(0.08, 0.12, 0.06, 10), FIG.brass(), { ink: INK, inkW: 0.3 }); base.position.set(x, y + 0.03, z); g.add(base);
    const stem = mk(new T.CylinderGeometry(0.02, 0.025, 0.4, 6), FIG.brass(), { ink: INK, inkW: 0.3 }); stem.position.set(x, y + 0.24, z); g.add(stem);
    for (const dx of [-0.12, 0, 0.12]) candle(K, g, x + dx, y + 0.44 + (dx ? 0 : 0.06), z, 0.16, B);
  }
  // a candle with a flickering flame and a glow (faked light)
  function candle(K, g, x, y, z, h = 0.2, B, lit = true) {
    const c = mk(K3D.geo('pm-candle' + h, () => new T.CylinderGeometry(0.03, 0.03, h, 8).translate(0, h / 2, 0)), M('wax', () => K3D.toon('#f2ead2', { emissive: '#3a2a10', emissiveIntensity: 0.6 })), { ink: INK, inkW: 0.3 }); c.position.set(x, y, z); g.add(c);
    const fl = new T.Mesh(K3D.geo('pm-flame', () => new T.SphereGeometry(0.025, 8, 6).scale(1, 2.0, 1).translate(0, 0.05, 0)), M('flameM', () => K3D.flat(hot('#ffd890', 3.5)))); fl.position.set(x, y + h, z); g.add(fl); fl.userData.live = true;
    const halo = sprite(K, g, x, y + h + 0.06, z, 0.9, '#ffb060', 0.35);
    (SC.candles || (SC.candles = [])).push({ fl, halo, ph: rnd() * 10, lit });
    fl.visible = halo.visible = lit;
  }
  function sconce(K, parent, x, y, z, yaw, B) {
    const sg = new T.Group(); sg.position.set(x, y, z); sg.rotation.y = yaw; parent.add(sg);
    const plate = mk(new T.CylinderGeometry(0.12, 0.12, 0.03, 10).rotateX(Math.PI / 2), FIG.brass(), { ink: INK, inkW: 0.3 }); sg.add(plate);
    const arm = mk(new T.TorusGeometry(0.14, 0.018, 5, 10, Math.PI / 2), FIG.brass(), { ink: INK, inkW: 0.3 }); arm.position.set(0, -0.14, 0.02); arm.rotation.y = -Math.PI / 2; sg.add(arm);
    const cup = mk(new T.CylinderGeometry(0.05, 0.03, 0.05, 8), FIG.brass(), { ink: INK, inkW: 0.3 }); cup.position.set(0, 0.0, 0.16); sg.add(cup);
    candle(K, sg, 0, 0.02, 0.16, 0.18, B);
    // a warm splash of light on the wallpaper (faked)
    const wash = new T.Mesh(new T.PlaneGeometry(1.4, 1.6), M('wash', () => K3D.flat(hot('#ffa050', 0.32), { map: poolTex(), transparent: true, depthWrite: false, add: true }))); wash.position.set(0, 0.25, 0.01); sg.add(wash);
    return sg;
  }
  // a cobweb across a corner: (dx, dz) points from the corner into the room
  function web(K, g, x, y, z, dx, dz, s) {
    const w = new T.Mesh(new T.PlaneGeometry(s, s), M('webM', () => K3D.flat('#ffffff', { map: cobwebTex(), transparent: true, depthWrite: false, side: T.DoubleSide })));
    const p = new T.Group(); p.position.set(x, y, z); p.rotation.y = Math.atan2(-dz, dx); g.add(p); p.userData.live = true;
    w.position.set(s / 2 * 0.95, -s / 2 * 0.95, 0); p.add(w);
    (SC.webs || (SC.webs = [])).push({ w: p, ph: rnd() * 6 });
  }
  function tallWindow(K, parent, x, z, yaw, w, h, y0, B) {
    const wg = new T.Group(); wg.position.set(x, y0 + h / 2, z); wg.rotation.y = yaw; parent.add(wg);
    const glass = new T.Mesh(new T.PlaneGeometry(w, h), K3D.flat('#ffffff', { map: nightGlass() })); glass.position.z = 0.02; wg.add(glass);
    const rainM = new T.MeshBasicMaterial({ map: rainTex(), transparent: true, depthWrite: false, opacity: 0.8, toneMapped: false });
    rainM.map = rainM.map.clone(); rainM.map.needsUpdate = true; rainM.map.wrapS = rainM.map.wrapT = T.RepeatWrapping;
    const rain = new T.Mesh(new T.PlaneGeometry(w, h), rainM); rain.position.z = 0.03; rain.userData.live = true; wg.add(rain); SC.rain.push(rainM);
    const trim = M('trim', () => K3D.toon('#2a2232'));
    for (const [px, py, sw, sh] of [[0, 0, 0.08, h], [0, h * 0.12, w, 0.08], [0, h * 0.37, w, 0.08], [-w / 2, 0, 0.14, h + 0.14], [w / 2, 0, 0.14, h + 0.14], [0, h / 2, w + 0.14, 0.14], [0, -h / 2, w + 0.3, 0.16]]) { const b = mk(new T.BoxGeometry(sw, sh, 0.1), trim, { ink: INK, inkW: 0.3 }); b.position.set(px, py, 0.05); wg.add(b); }
    const arch = mk(new T.TorusGeometry(w / 2, 0.08, 5, 16, Math.PI), trim, { ink: INK, inkW: 0.3 }); arch.position.set(0, h / 2, 0.05); wg.add(arch);
    const top = new T.Mesh(new T.CircleGeometry(w / 2, 16, 0, Math.PI), K3D.flat('#ffffff', { map: nightGlass() })); top.position.set(0, h / 2, 0.02); wg.add(top);
    // curtains either side (they breathe in a draught) and a pelmet
    for (const sx of [-1, 1]) {
      const cg = new T.Group(); cg.position.set(sx * (w / 2 + 0.25), h / 2 + 0.3, 0.22); wg.add(cg); cg.userData.live = true;
      const geo = new T.PlaneGeometry(0.8, h + 0.8, 6, 10), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 14) * 0.06);
      geo.translate(0, -(h + 0.8) / 2, 0); geo.computeVertexNormals();
      const cm = mk(geo, M('curtainM', () => K3D.toon('#ffffff', { map: velvet('#4a1430'), side: T.DoubleSide })), { ink: INK, inkW: 0.4 }); cg.add(cm);
      SC.curtains.push({ g: cg, geo, base: Float32Array.from(p.array), ph: rnd() * 6, sx });
    }
    const pel = mk(new T.BoxGeometry(w + 1.4, 0.4, 0.3), M('pelmet', () => K3D.toon('#3a1024')), { ink: INK, inkW: 0.4 }); pel.position.set(0, h / 2 + 0.55, 0.2); wg.add(pel);
    // the moonlight it lets in: a soft shaft slanting down to a window-shaped patch on the floor
    const shaft = new T.Mesh(new T.PlaneGeometry(w * 1.1, 6.5), M('moonShaft', () => K3D.flat(hot('#9ab0ff', 0.2), { map: shaftTex(), transparent: true, depthWrite: false, add: true, side: T.DoubleSide })));
    shaft.position.set(0, -0.9, 2.2); shaft.rotation.x = -0.75; wg.add(shaft); shaft.userData.live = true;
    const patch = new T.Mesh(new T.PlaneGeometry(w * 1.1, 3.4), M('moonPatchM', () => K3D.flat(hot('#9ab0ff', 0.42), { map: patchTex(), transparent: true, depthWrite: false, add: true })));
    patch.rotation.x = -Math.PI / 2; patch.position.set(0, -(y0 + h / 2) + 0.03, 3.4); wg.add(patch); patch.userData.live = true;
    (SC.shafts || (SC.shafts = [])).push({ shaft, patch });
    // the hand drawn back behind one curtain (seen only now and then)
    if (z < -5) { const hand = mk(K3D.roundBox(0.12, 0.3, 0.06, 0.6, 10), M('paleHand', () => K3D.toon('#d8e0d0', { emissive: '#2a3a2a', emissiveIntensity: 0.6 })), { ink: INK, inkW: 0.4 }); hand.position.set(-w / 2 - 0.2, 0.3, 0.3); hand.rotation.z = 0.4; wg.add(hand); hand.userData.live = true; hand.visible = false; SC.curtainHand = hand; }
    return wg;
  }
  function mirror(K, parent, x, z, yaw) {
    const mg = new T.Group(); mg.position.set(x, 2.3, z); mg.rotation.y = yaw; parent.add(mg);
    const fr = mk(new T.TorusGeometry(0.9, 0.12, 8, 24), FIG.brass(), { ink: INK, inkW: 0.6 }); fr.scale.set(0.8, 1.15, 1); mg.add(fr);
    const glass = new T.Mesh(new T.CircleGeometry(0.88, 24), M('mirrorGlass', () => K3D.toon('#8a90b0', { emissive: '#2a2e4a', emissiveIntensity: 0.8 }))); glass.scale.set(0.8, 1.15, 1); glass.position.z = 0.01; mg.add(glass);
    // the figure in the mirror: a pale shape standing behind whoever looks (fades in, gone if you turn)
    const ghost = new T.Mesh(new T.PlaneGeometry(0.6, 1.3), new T.MeshBasicMaterial({ map: K3D.paint('pm-mirrorGhost', 64, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(240,240,255,0.9)'); g.addColorStop(1, 'rgba(200,210,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(32, 26, 16, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(14, 44); c.quadraticCurveTo(32, 36, 50, 44); c.lineTo(58, h); c.lineTo(6, h); c.fill(); c.fillStyle = '#101018'; c.beginPath(); c.arc(26, 26, 3, 0, Math.PI * 2); c.arc(38, 26, 3, 0, Math.PI * 2); c.fill(); }), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    ghost.position.set(0.1, -0.1, 0.02); mg.add(ghost); ghost.userData.live = true;
    for (let i = 0; i < 3; i++) { const cr = mk(new T.SphereGeometry(0.07, 6, 4), FIG.brass(), { ink: false }); cr.position.set(-0.3 + i * 0.3, 1.12 + (i === 1 ? 0.1 : 0), 0.05); mg.add(cr); }
    return { mg, ghost };
  }
  function portrait(K, parent, x, y, z, yaw, k, s) {
    const pg = new T.Group(); pg.position.set(x, y, z); pg.rotation.y = yaw; parent.add(pg);
    const w = 0.96 * s, h = 1.28 * s;
    const fr = mk(new T.BoxGeometry(w + 0.24, h + 0.24, 0.08), FIG.brass(), { ink: INK, inkW: 0.5 }); fr.position.z = 0.02; pg.add(fr);
    const pic = new T.Mesh(new T.PlaneGeometry(w, h), K3D.toon('#ffffff', { map: portraitTex(k) })); pic.position.z = 0.065; pg.add(pic);
    // real eyes behind the holes: they slide to look at the nearer hero, and glow faintly in the dark
    const ey = (k === 1 ? 100 : k === 3 ? 110 : 104) / 256, ex = (k === 3 ? 15 : 11) / 192;
    const eyes = [];
    for (const sx of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.022 * s, 8, 6), M('pEye', () => K3D.flat(hot('#fff2c0', 1.4)))); e.position.set(sx * ex * w, (0.5 - ey) * h, 0.06); pg.add(e); e.userData.live = true; eyes.push(e); }
    SC.eyes.push({ g: pg, eyes, base: eyes.map(e => e.position.clone()) });
    return pg;
  }
  function chandelier(K, g, x, y, z, B) {
    const cg = new T.Group(); cg.position.set(x, y, z); cg.userData.live = true; g.add(cg);
    const chain = mk(new T.CylinderGeometry(0.03, 0.03, 5, 5), FIG.brass(), { ink: INK, inkW: 0.3 }); chain.position.y = 2.6; cg.add(chain);
    const hub = mk(new T.SphereGeometry(0.22, 12, 8), FIG.brass(), { ink: INK, inkW: 0.5 }); cg.add(hub);
    const ring = mk(new T.TorusGeometry(1.1, 0.05, 6, 30), FIG.brass(), { ink: INK, inkW: 0.5 }); ring.rotation.x = Math.PI / 2; ring.position.y = -0.2; cg.add(ring);
    const ring2 = mk(new T.TorusGeometry(0.6, 0.04, 6, 24), FIG.brass(), { ink: INK, inkW: 0.4 }); ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.15; cg.add(ring2);
    const flames = [], halos = [];
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, r = i % 2 ? 1.1 : 0.6, yy = i % 2 ? -0.2 : 0.15;
      const arm = mk(new T.CylinderGeometry(0.02, 0.02, r, 5).rotateZ(Math.PI / 2).translate(r / 2, 0, 0), FIG.brass(), { ink: false }); arm.position.y = yy; arm.rotation.y = -a; cg.add(arm);
      const c = mk(K3D.geo('pm-candle0.2', () => new T.CylinderGeometry(0.03, 0.03, 0.2, 8).translate(0, 0.1, 0)), M('wax', () => K3D.toon('#f2ead2', { emissive: '#3a2a10', emissiveIntensity: 0.6 })), { ink: INK, inkW: 0.3 }); c.position.set(Math.cos(a) * r, yy, Math.sin(a) * r); cg.add(c);
      const fl = new T.Mesh(K3D.geo('pm-flame', () => new T.SphereGeometry(0.025, 8, 6).scale(1, 2.0, 1).translate(0, 0.05, 0)), M('flameM', () => K3D.flat(hot('#ffd890', 3.5)))); fl.position.set(Math.cos(a) * r, yy + 0.2, Math.sin(a) * r); cg.add(fl); flames.push(fl);
      halos.push(sprite(K, cg, Math.cos(a) * r, yy + 0.28, Math.sin(a) * r, 1.0, '#ffb060', 0.4));
      // crystal drops
      const dr = new T.Mesh(K3D.geo('pm-drop', () => new T.OctahedronGeometry(0.05, 0).scale(1, 2, 1)), M('crystal', () => K3D.toon('#d8e8ff', { emissive: '#3a4a6a', emissiveIntensity: 0.6 }))); dr.position.set(Math.cos(a + 0.3) * r, yy - 0.2, Math.sin(a + 0.3) * r); cg.add(dr);
    }
    web(K, cg, -1.1, -0.1, 0, 1, 0.2, 0.9);
    const glow = sprite(K, cg, 0, -0.1, 0, 7, '#ffc070', 0.0);
    return { cg, flames, halos, glow };
  }
  function winderBox(K, parent, w) {
    const wg = new T.Group(); wg.position.set(w.x - 0.18, 1.3, w.z); wg.rotation.y = Math.PI / 2; parent.add(wg);
    const box = mk(new T.BoxGeometry(0.6, 0.8, 0.22), FIG.brass(), { ink: INK, inkW: 0.6 }); box.position.z = 0.11; wg.add(box);
    const dial = new T.Mesh(new T.CircleGeometry(0.2, 24), M('dialFace', () => K3D.toon('#f2e6c8'))); dial.position.set(0, 0.15, 0.225); wg.add(dial);
    const needle = new T.Mesh(new T.BoxGeometry(0.02, 0.17, 0.01).translate(0, 0.085, 0), K3D.flat('#8a1a1a')); needle.position.set(0, 0.15, 0.235); wg.add(needle); needle.userData.live = true;
    const crank = new T.Group(); crank.position.set(0, -0.2, 0.24); wg.add(crank); crank.userData.live = true;
    const arm = mk(new T.BoxGeometry(0.04, 0.26, 0.04).translate(0, 0.13, 0), iron(), { ink: INK, inkW: 0.3 }); crank.add(arm);
    const knob = mk(new T.CylinderGeometry(0.035, 0.035, 0.1, 8).rotateX(Math.PI / 2).translate(0, 0.26, 0.05), wood('#2a160e'), { ink: INK, inkW: 0.3 }); crank.add(knob);
    const lbl = new T.Mesh(new T.PlaneGeometry(0.5, 0.12), K3D.toon('#ffffff', { map: K3D.paint('pm-windLbl', 128, 32, (c, w2, h2) => { c.fillStyle = '#2a1a0a'; c.fillRect(0, 0, w2, h2); c.fillStyle = '#e8c870'; c.font = '700 18px "DejaVu Serif", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CHANDELIER', w2 / 2, h2 / 2 + 1); }) })); lbl.position.set(0, 0.48, 0.12); wg.add(lbl);
    const gl = sprite(K, wg, 0, 0, 0.3, 1.2, '#ffd27a', 0);
    return { wg, needle, crank, gl, spin: 0 };
  }

  /* =============================== the Armour Corridor =============================== */
  function corridor(K, B, wallsBy) {
    const g = new T.Group(); K.add(g);
    const R = H.art.corridor, deco = id => wallsBy[id].full;
    const fl = mk(new T.PlaneGeometry(26, 4.6).rotateX(-Math.PI / 2), toonT('boards', '#ffffff', boards()), { ink: false }); fl.position.set(20.8, 0.012, -4.5);
    const uv = fl.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * 4.6 / 2, uv.getX(i) * 26 / 4); g.add(fl);
    const alc = mk(new T.PlaneGeometry(2.4, 2.2).rotateX(-Math.PI / 2), toonT('boards', '#ffffff', boards()), { ink: false }); alc.position.set(23.4, 0.013, -7.6); g.add(alc);
    const rug = new T.Mesh(new T.PlaneGeometry(1.5, 20).rotateX(-Math.PI / 2), M('rugCor', () => K3D.toon('#ffffff', { map: runner() }))); rug.rotation.y = Math.PI / 2; rug.position.set(19.5, 0.022, -4.5); rug.receiveShadow = true;
    { const u = rug.geometry.attributes.uv; for (let i = 0; i < u.count; i++) u.setY(i, u.getY(i) * 5); } g.add(rug);
    const fp = M('feetM', () => K3D.flat('#ffffff', { map: footTex(), transparent: true, depthWrite: false }));
    const f = new T.Mesh(new T.PlaneGeometry(0.5, 2.6).rotateX(-Math.PI / 2), fp); f.position.set(25.5, 0.03, -3.4); f.rotation.y = -Math.PI / 2; g.add(f);
    // still suits of armour (on plinths) both sides; a banner and a crossed-swords shield over each pair
    for (const a of H.art.armour) {
      const s = FIG.armour({}); s.position.set(a.x, 0, a.z); s.rotation.y = a.face + (rnd() - 0.5) * 0.15; g.add(s);
      const pl = mk(new T.BoxGeometry(0.72, 0.24, 0.6), M('plinth2', () => K3D.toon('#3a3440')), { ink: INK, inkW: 0.5 }); pl.position.set(a.x, 0.12, a.z); g.add(pl);
      s.userData.set({ state: 'dormant', raise: 0, step: 0 }, 0, 0);
    }
    for (let x = 11.9; x < 29; x += 5.2) {
      const side = x > 21 && x < 25.5 ? 1 : -1;
      const sh = new T.Group(); sh.position.set(x, 2.7, side < 0 ? -6.38 : -2.62); sh.rotation.y = side < 0 ? 0 : Math.PI; deco(side < 0 ? 'corBack' : 'corFront').add(sh);
      const shield = mk(new T.CylinderGeometry(0.35, 0.35, 0.06, 3, 1).rotateX(Math.PI / 2).rotateZ(Math.PI), M('shieldM', () => K3D.toon('#5a2030')), { ink: INK, inkW: 0.5 }); shield.scale.set(1, 1.3, 1); sh.add(shield);
      for (const sx of [-1, 1]) { const sw = mk(new T.BoxGeometry(0.05, 1.1, 0.03), M('steelBlade', () => K3D.toon('#a7afc4')), { ink: INK, inkW: 0.3 }); sw.rotation.z = sx * 0.7; sw.position.z = -0.03; sh.add(sw); }
    }
    // tapestries (a hunt, a castle) and portraits on the back wall; sconces
    for (const [x, kind] of [[14.5, 0], [27.4, 1]]) {
      const tg = new T.Group(); tg.position.set(x, 2.1, -6.38); deco('corBack').add(tg);
      const tex = K3D.paint('pm-tapestry|' + kind, 128, 192, (c, w, h) => { c.fillStyle = kind ? '#2a3a4a' : '#4a2a2a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c8a050'; c.lineWidth = 6; c.strokeRect(6, 6, w - 12, h - 12); c.fillStyle = 'rgba(200,180,120,0.6)'; if (kind) { c.fillRect(30, 70, 70, 80); for (let i = 0; i < 4; i++) c.fillRect(30 + i * 20, 56, 12, 16); c.fillRect(54, 40, 20, 40); } else { c.beginPath(); c.ellipse(60, 110, 30, 16, 0, 0, Math.PI * 2); c.fill(); c.fillRect(80, 90, 10, 20); c.beginPath(); c.moveTo(86, 86); c.lineTo(100, 70); c.lineTo(94, 92); c.fill(); } for (let y = h - 24; y < h; y += 6) for (let xx = 8; xx < w; xx += 8) { c.fillStyle = '#c8a050'; c.fillRect(xx, h - 10, 3, 10); } });
      const tp = mk(new T.PlaneGeometry(1.4, 2.0, 4, 1), K3D.toon('#ffffff', { map: tex, side: T.DoubleSide }), { ink: INK, inkW: 0.4 }); tp.position.z = 0.04; tg.add(tp);
      const rod = mk(new T.CylinderGeometry(0.03, 0.03, 1.7, 6).rotateZ(Math.PI / 2), FIG.brass(), { ink: INK, inkW: 0.3 }); rod.position.set(0, 1.05, 0.06); tg.add(rod);
    }
    portrait(K, deco('corFront'), 13.2, 2.4, -2.62, Math.PI, 3, 0.8);
    portrait(K, deco('corFront'), 20.0, 2.4, -2.62, Math.PI, 0, 0.8);
    portrait(K, deco('corFront'), 26.6, 2.4, -2.62, Math.PI, 2, 0.8);
    for (const [id, x, z, yaw] of [['corBack', 10.2, -6.38, 0], ['corBack', 17.0, -6.38, 0], ['corBack', 26.0, -6.38, 0], ['corFront', 16.4, -2.62, Math.PI], ['corFront', 23.0, -2.62, Math.PI], ['corFront', 29.2, -2.62, Math.PI]]) sconce(K, deco(id), x, 2.1, z, yaw, B);
    // the wardrobe in its alcove (the first hide), a jar on a shelf beside it (a wisp hides in it)
    SC.wardrobe = FIG.wardrobe(); SC.wardrobe.position.set(23.4, 0, -7.55); SC.wardrobe.userData.live = true; g.add(SC.wardrobe);
    // the end of the corridor: the door on, a TOUR CONTINUES sign, a purple stage light leaking from the next room
    signBoard(K, deco('corEnd'), 29.76, -6.1, -Math.PI / 2, 'tour', 0.95, 2.5, true);
    stageLamp(K, g, 29.2, -2.9, -2.1, '#b070ff', 0.5);
    // cobwebs in the corridor corners; a rat hole; a mouse-trap with cheese
    for (const [x, z, dx, dz] of [[8.3, -6.38, 1, 1], [29.78, -6.38, -1, 1], [29.78, -2.62, -1, -1], [8.3, -2.62, 1, -1]]) web(K, g, x, 3.5, z, dx, dz, 1.2);
    const trap = mk(new T.BoxGeometry(0.3, 0.03, 0.14), wood('#8a6a44'), { ink: INK, inkW: 0.3 }); trap.position.set(21.0, 0.03, -2.85); g.add(trap);
    const cheese = mk(new T.CylinderGeometry(0.06, 0.06, 0.05, 3), M('cheese', () => K3D.toon('#f2c84a')), { ink: INK, inkW: 0.3 }); cheese.position.set(21.08, 0.07, -2.85); g.add(cheese);
    const hh = new T.Group(); hh.position.set(9.0, 3.1, -6.2); g.add(hh);
    const cone = mk(K3D.geo('pm-horn', () => new T.ConeGeometry(0.28, 0.6, 14, 1, true).rotateX(-Math.PI / 2)), M('hornM', () => K3D.toon('#b9c2b0', { side: T.DoubleSide })), { ink: INK, inkW: 0.5 }); cone.rotation.set(0.3, -0.9, 0); hh.add(cone); SC.horns.push(hh);
    // small windows high on the front wall (rain, a moon shaft each)
    for (const x of [12, 18.4, 25.2]) tallWindow(K, deco('corFront'), x, -2.62, Math.PI, 0.9, 1.3, 1.6, B);
    return g;
  }

  /* =============================== things that live =============================== */
  // rats that scurry along the skirting now and then
  function rats(K) {
    const list = [];
    const ratM = M('rat', () => K3D.toon('#3a3238'));
    const make = () => { const r = new T.Group(); const b = mk(K3D.roundBox(0.12, 0.1, 0.26, 0.6, 10), ratM, { ink: INK, inkW: 0.3 }); r.add(b); const tail = mk(new T.CylinderGeometry(0.008, 0.004, 0.3, 4).rotateX(Math.PI / 2), M('ratTail', () => K3D.toon('#c89a9a')), { ink: false }); tail.position.set(0, 0.03, -0.26); r.add(tail); for (const sx of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.012, 5, 4), K3D.flat(hot('#ff5a5a', 1.6))); e.position.set(sx * 0.03, 0.08, 0.12); r.add(e); } r.userData.live = true; r.visible = false; K.add(r); return r; };
    const runs = [[[7.6, -7.2], [7.6, 5.4]], [[-7.6, 5.2], [-7.6, -9.6]], [[9, -6.25], [29.6, -6.25]], [[29.6, -2.75], [9, -2.75]], [[-14, 24], [12, 24]]];
    for (let i = 0; i < 4; i++) list.push({ r: make(), run: null, t: 0, wait: 2 + i * 3.1 });
    return { list, runs };
  }
  // eyes in the dark: pairs of glowing dots in corners that blink, and go out if the lantern comes near
  function darkEyes(K) {
    const spots = [[-7.2, 0.5, -9.4], [7.2, 0.4, -9.0], [-7.4, 0.6, 5.0], [6.0, 3.6, -9.6], [14.0, 0.4, -6.2], [28.6, 0.4, -2.8], [-12.5, 0.8, 18], [12.6, 0.9, 27], [-9.5, 0.5, 9.5]];
    return spots.map(([x, y, z], i) => {
      const g = new T.Group(); g.position.set(x, y, z); g.userData.live = true; K.add(g);
      const m = M('darkEye' + (i % 3), () => K3D.flat(hot(['#ffdc5a', '#9aff6a', '#ff6a8a'][i % 3], 2.2)));
      for (const sx of [-1, 1]) { const e = new T.Mesh(K3D.geo('pm-dEye', () => new T.SphereGeometry(0.035, 8, 6).scale(1.3, 0.8, 0.5)), m); e.position.x = sx * 0.09; g.add(e); }
      return { g, ph: rnd() * 20, on: 1 };
    });
  }
  // dust motes: drifting specks that shine only inside the lantern's light and the moon shafts
  function motes(K) {
    const n = 420, pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) seed[i] = rnd();
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('aS', new T.BufferAttribute(seed, 1));
    const U = { uL: { value: V(0, 0, 0) }, uR: { value: 2.5 }, uB: { value: V(0, 0, 1) }, uBL: { value: 0 }, uPx: { value: 1 }, uT: { value: 0 } };
    const mat = new T.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: `attribute float aS; uniform vec3 uL, uB; uniform float uR, uBL, uPx, uT; varying float vA;
        void main() { vec3 p = position; vec3 d = p - uL; float r = length(d.xz);
          float inC = smoothstep(uR * 1.25, uR * 0.4, r) * smoothstep(3.0, 0.5, abs(d.y));
          float t = dot(d.xz, uB.xz), off = length(d.xz - uB.xz * t);
          float inB = uBL > 0.0 ? step(0.0, t) * step(t, uBL) * smoothstep(0.45 + t * 0.2, 0.2 + t * 0.1, off) * smoothstep(2.4, 0.3, abs(d.y)) : 0.0;
          vA = max(inC * 0.7, inB) * (0.5 + 0.5 * sin(uT * 3.0 + aS * 40.0));
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = (1.5 + aS * 2.5) * uPx * (8.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: 'varying float vA; void main() { float d = length(gl_PointCoord - 0.5); if (vA < 0.01) discard; gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * smoothstep(0.5, 0.0, d) * vA, 1.0); }' });
    const pts = new T.Points(geo, mat); pts.frustumCulled = false; pts.userData.live = true; pts.renderOrder = 4; K.add(pts);
    const st = []; for (let i = 0; i < n; i++) st.push({ x: 0, y: 0, z: 0, vx: (rnd() - 0.5) * 0.1, vy: (rnd() - 0.5) * 0.05, vz: (rnd() - 0.5) * 0.1 });
    return { pts, pos, U, st, n, init: false };
  }

  /* =============================== the heroes and what they carry =============================== */
  function heroes(K) {
    const list = [0, 1].map(id => {
      const h = K3D.hero(id); h.userData.live = true; K.add(h);
      K3D.dress(h, 'parkmanor');
      const u = h.userData; if (u.sprout && u.sproutX) u.sprout.position.x = u.sproutX;
      // own copies of every material (to turn chalk white when scared stiff, costume and all)
      const mats = [];
      h.traverse(o => { if (!o.isMesh || o.userData.ink || o.userData.seeThrough) return; const m = o.material.clone(); o.material = m; mats.push({ m, col: m.color.clone(), em: m.emissive ? m.emissive.clone() : null, ei: m.emissiveIntensity || 0 }); });
      K3D.seeThrough(h, PCOL[id]);
      // hair on end (a spray of spikes on the head, only when stiff)
      const hair = new T.Group(); hair.visible = false; u.points.head.add(hair);
      for (let i = 0; i < 7; i++) { const s = mk(K3D.geo('pm-hairSpike', () => new T.ConeGeometry(0.03, 0.22, 5).translate(0, 0.11, 0)), M('hairSpike', () => K3D.toon('#f6f6f2')), { ink: INK, inkW: 0.4 }); s.position.set((i - 3) * 0.07, 0.02, (i % 2) * 0.05 - 0.02); s.rotation.z = -(i - 3) * 0.22; hair.add(s); }
      const blob = K3D.blob(PCOL[id]); K.add(blob);
      return { h, mats, hair, blob, white: 0 };
    });
    // Pip's lantern (in the hand, or on its porch hook) and Bo's key (over the shoulder, or in the hook's ring)
    const lan = FIG.lantern(); lan.userData.live = true; K.add(lan); K3D.seeThrough(lan, '#ffd27a');
    const key = FIG.key(); key.userData.live = true; K.add(key);
    return { list, lan, key, keySpin: 0 };
  }

  /* =============================== lights =============================== */
  function lights(K) {
    K.sun.visible = false; K.sun.castShadow = false; // (the moon's own light below casts no shadow: the lantern's is the one)
    const moon = new T.DirectionalLight('#9fb0ff', 0.5 * Math.PI); moon.position.copy(K.moonDir || V(-0.2, 0.6, -0.8)).multiplyScalar(50); K.scene.add(moon); K.scene.add(moon.target);
    const lantern = new T.PointLight('#ffb35c', 3.2, 6, 1.0);
    lantern.castShadow = true; lantern.shadow.mapSize.set(1024, 1024); lantern.shadow.camera.near = 0.12; lantern.shadow.camera.far = 16; lantern.shadow.bias = -0.004; lantern.shadow.normalBias = 0.03; lantern.shadow.radius = 5;
    K.scene.add(lantern);
    const beam = new T.SpotLight('#ffe0a8', 0, 17, 0.27, 0.45, 0.3); K.scene.add(beam); K.scene.add(beam.target);
    const chand = new T.PointLight('#ffc070', 0, 22, 1.0); chand.position.set(...H.winders[0].at); K.scene.add(chand);
    const porch = new T.PointLight('#ff9e50', 3.5, 7, 1.5); porch.position.set(-1.6, 2.8, 6.8); K.scene.add(porch);
    const neon = new T.PointLight('#5affb0', 14, 30, 1.0); neon.position.set(-1.2, 16, 1); K.scene.add(neon);
    const green = new T.SpotLight('#3aff9a', 9, 16, 0.3, 0.7, 1.3); green.position.set(7.0, 1.9, 5.0); green.target.position.set(0, 0, -5); K.scene.add(green); K.scene.add(green.target);
    const purple = new T.SpotLight('#b070ff', 9, 18, 0.3, 0.7, 1.3); purple.position.set(29.2, 1.9, -2.9); purple.target.position.set(18, 0, -4.8); K.scene.add(purple); K.scene.add(purple.target);
    // the beam's cone in the dust (its end is cut where the rules' beam stops), and the warm pool on the floor
    const coneU = { uLen: { value: 14 }, uOn: { value: 0 }, uT: { value: 0 }, uNoise: { value: PARK.noiseTex() } };
    const coneGeo = new T.CylinderGeometry(PML.S.BEAM_W0 * 0.5 + PML.S.BEAM * PML.S.BEAM_SPREAD * 0.75, PML.S.BEAM_W0 * 0.5, PML.S.BEAM, 28, 8, true).translate(0, PML.S.BEAM / 2, 0).rotateX(Math.PI / 2);
    const cone = new T.Mesh(coneGeo, new T.ShaderMaterial({ uniforms: coneU, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: 'varying float vZ; varying vec3 vN, vV; varying vec3 vW; void main() { vZ = position.z; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uLen, uOn, uT; uniform sampler2D uNoise; varying float vZ; varying vec3 vN, vV, vW;
        void main() { if (vZ > uLen) discard;
          float face = abs(dot(normalize(vN), normalize(vV)));
          float along = smoothstep(0.0, 0.8, vZ) * (1.0 - smoothstep(uLen - 2.5, uLen, vZ)) * (1.0 - vZ / 18.0);
          float dust = 0.6 + 0.6 * texture2D(uNoise, vW.xz * 0.15 + vec2(uT * 0.03, uT * 0.02)).r;
          float a = pow(face, 1.6) * along * dust * uOn * 0.22;
          gl_FragColor = vec4(vec3(1.0, 0.82, 0.55) * a, 1.0); }` }));
    cone.frustumCulled = false; cone.renderOrder = 6; K.add(cone);
    const pool = new T.Mesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), K3D.flat(hot('#ffb35c', 0.55), { map: poolTex(), transparent: true, depthWrite: false, add: true }));
    pool.renderOrder = 2; K.add(pool);
    const beamPool = new T.Mesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), K3D.flat(hot('#ffd08a', 0.5), { map: poolTex(), transparent: true, depthWrite: false, add: true }));
    beamPool.renderOrder = 2; K.add(beamPool);
    const halo = sprite(K, null, 0, 0, 0, 2.2, '#ffb35c', 0.55);
    return { moon, lantern, beam, chand, porch, neon, green, purple, cone, coneU, pool, beamPool, halo };
  }

  /* =============================== build =============================== */
  function build(K, st) {
    reseed(); PARK.resetGlints();
    for (const k of Object.keys(SC)) delete SC[k];
    SC.horns = [];
    const night = PARK.night(K, { moon: { x: -150, y: 200, z: -470, r: 46 }, fog: '#191838', fogD: 0.006, bloom: 0.85 });
    K.bloom = { strength: 0.85, threshold: 1.1, radius: 1.0 };
    K.amb.color.set('#5054a8'); K.amb.intensity = 0.3 * Math.PI;
    if (night.hemi) night.hemi.intensity = 0.2 * Math.PI;
    K.maxBlur = 1.4; K.focusRange = 26;
    const B = PARK.bulbs(K, 4000);
    SC.night = night; SC.B = B;
    const n0 = [...K.root.children];
    SC.walls = walls(K);
    SC.doors = doors(K);
    const og = outside(K, B), yg = yard(K, B);
    if (window.__w42audit) audit(K, [og, yg]);
    SC.fac = facade(K, B);
    frontDetail(K, B, SC.fac);
    hall(K, B, SC.walls);
    corridor(K, B, SC.walls);
    // everything still of the front (outside, the hall, the corridor) in one group, so it can go when the pair are
    // in the far rooms; then the far rooms, each floor its own group (parkmanor-rooms.js)
    const s1 = new T.Group(); s1.userData.live = true;
    for (const o of [...K.root.children]) if (o !== s1 && !o.userData.live && o.userData.pmKeep !== true && n0.indexOf(o) < 0) s1.add(o);
    K.add(s1);
    SC.regions = { S1: s1 };
    SC.LIB = { T, INK, hot, M, mk, V, rnd: () => rnd(), toonT, wood, iron, glowM, sprite, uvBox, flatPlane, candle, candelabra, sconce, web, tallWindow, mirror, portrait, chandelier,
      stageLamp, signBoard, boards, runner, checker, velvet, portraitTex, damask, stains, tornEdge, poolTex, shaftTex, crackTex, stoneTex, cobwebTex, ROOM, REG, regAt, FIG };
    PARKMANOR_ROOMS.build(K, B, SC, st);
    // the clocks (restart points) and the porch hooks
    SC.clockFigs = H.clocks.map(c => { if (c.art === false) return null; const f = FIG.clock(); f.position.set(c.x, c.x > 53.5 && c.z < -35 && c.z > -63 ? 3 : 0, c.z); f.rotation.y = c.face; f.userData.live = true; f.userData.reg = regAt(c.x, c.z); K.add(f); return f; });
    // the spooks and the Butler
    const pTex = [3, 0, 2, 1, 3, 0];
    SC.spooks = st.spooks.map((sp, i) => {
      const k = i % 4;
      const f = sp.kind === 'sheet' ? FIG.sheet() : sp.kind === 'cook' ? FIG.cook() : sp.kind === 'doll' ? FIG.doll(+sp.id.slice(-1)) : sp.kind === 'dancer' ? FIG.dancer(+sp.id.slice(-1))
        : sp.kind === 'portrait' ? FIG.portraitSpook(k, portraitTex(pTex[+sp.id.slice(-1) + (sp.id[0] === 'g' ? 3 : 0)])) : FIG.armour({ live: true });
      f.userData.live = true; K.add(f); return f;
    });
    SC.butler = FIG.butler(); SC.butler.userData.live = true; SC.butler.visible = false; K.add(SC.butler);
    // Grimsby at the exit: the same figure, taller
    SC.boss = FIG.butler(); SC.boss.userData.live = true; SC.boss.scale.setScalar(1.22); K.add(SC.boss);
    // the dining chairs (they move with the rules' chairs)
    SC.chairs = st.chairs.map(() => { const f = FIG.chair(); f.userData.live = true; K.add(f); return f; });
    // wisps: a glowing flame sprite each, with a soft halo
    SC.wisps = H.wisps.map(() => {
      const g = new T.Group(); g.userData.live = true; K.add(g);
      const fl = new T.Sprite(new T.SpriteMaterial({ map: FIG.wispTex(), color: hot('#ffffff', 1.6), transparent: true, depthWrite: false, toneMapped: false })); fl.scale.set(0.42, 0.62, 1); g.add(fl);
      const hl = sprite(K, g, 0, -0.05, 0, 1.4, '#5affd8', 0.45);
      return { g, fl, hl, pop: -1 };
    });
    SC.sparks = [];
    SC.H = heroes(K);
    SC.L = lights(K);
    SC.rats = rats(K);
    SC.darkEyes = darkEyes(K);
    SC.motes = motes(K);
    B.done();
    // batch the still scenery: the walls' two versions each on their own (they switch), everything else at once
    for (const id in SC.walls) { K3D.bake(SC.walls[id].full); K3D.bake(SC.walls[id].cut); }
    K3D.bake(SC.fac.up); K3D.bake(SC.fac.corRoof); K3D.bake(SC.fac.porchTop);
    for (const id in SC.regions) K3D.bake(SC.regions[id]);
    K3D.bake(K.root);
    SC.rig = K3D.cams.follow({ pitch: 34, heading: 0, fov: 34, min: 13, max: 20 });
    SC.rig.shadowReach = 20;
    SC.fxN = 0; SC.t = 0; SC.zone = null; SC.cutK = {};
    SC.rig.snap();
    update(K, st, 0);
    SC.rig.snap();
    return SC;
  }

  /* =============================== every frame =============================== */
  const tmpA = V(0, 0, 0), tmpB = V(0, 0, 0), CHALK = new T.Color(0.96, 0.96, 0.94), CHALK_E = new T.Color(0.25, 0.25, 0.3);
  const approachV = (a, b, k) => a + (b - a) * k;
  function update(K, st, dt) {
    if (!SC.rig || !st.spooks) return;
    SC.t += dt; const t = SC.t;
    const ps = G.players, zn = H.zones.find(z => z.id === st.zone) || H.zones[0];
    const inside = st.zone !== 'path';
    // ---- what shows: cut-away walls for this zone, the roofs only from outside ----
    const shows = showsOf(zn), shown = r => shows.includes(r);
    for (const id in SC.regions) SC.regions[id].visible = shown(id);
    for (const id in SC.walls) {
      const want = zn.cut.includes(id) && !st.hidden ? 1 : 0, on = shown(SC.walls[id].reg);
      SC.walls[id].full.visible = on && !want; SC.walls[id].cut.visible = on && !!want;
    }
    SC.fac.up.visible = !inside; SC.fac.porchTop.visible = !inside;
    SC.fac.corRoof.visible = st.zone === 'path' || st.zone === 'hall';
    // ---- fx (what just happened in the rules) ----
    for (; SC.fxN < st.fx.length; SC.fxN++) {
      const f = st.fx[SC.fxN];
      if (f.k === 'wisp') { const w = SC.wisps[f.i]; if (w) w.pop = 0; }
      if (f.k === 'chand') SC.chandFlare = 1;
      if (f.k === 'fright') SC.jolt = 1;
    }
    if (st.fx.length < SC.fxN) SC.fxN = st.fx.length;
    // ---- heroes ----
    const HS = SC.H, lan = st.lan || PML.lantern(st), lampOff = !!PARKMANOR_SCENE.lampOff;
    // riding between floors: up in the dumbwaiter, or down the trapdoor in a spin
    const ride = st.ride ? H.rides[st.ride.id] : null, ru = ride ? Math.min(1, st.ride.t / ride.dur) : 0;
    const rideY = !ride ? 0 : ride.kind === 'dumbwaiter' ? Math.max(0, ru - 0.25) / 0.75 * 3.4 : -Math.max(0, ru - 0.12) / 0.88 * 4.5;
    for (const k of [0, 1]) {
      const p = ps[k], b = p.b3, hh = HS.list[k], h = hh.h;
      if (!b) continue;
      const stiff = st.stiff[k] > 0;
      let hands = null;
      if (k === 0 && st.hasLantern) hands = [V(lan.x, lan.y + 0.24, lan.z), null];
      if (k === 1 && st.hasKey) {
        HS.key.updateMatrixWorld(true);
        const busy = st.keyHold > 0 || (st.keyTgt && st.keyWhat);
        const kp = HS.key.localToWorld(tmpA.set(0, busy ? 0.62 : 0.3, 0)).clone();
        hands = [kp, busy ? kp.clone().add(tmpB.set(0.05, -0.05, 0)) : null];
      }
      const sp = Math.hypot(b.vx, b.vz) / (PHYS.maxRun / K3D.U);
      K3D.heroPose(h, { x: b.x, y: b.y + rideY, z: b.z, heading: b.heading + (ride && ride.kind === 'slide' ? ru * ru * 18 : 0), speed: stiff ? 0 : Math.min(1, sp), vy: b.vy, land: b.land, hands: stiff ? null : hands, mood: !stiff && b.teeter > 0 ? 'whoa' : null }, dt);
      // stiff with Fright: chalk white, hair on end, toppled like a plank (and a shiver)
      hh.white = approachV(hh.white, stiff ? 1 : 0, Math.min(1, dt * 8));
      for (const m of hh.mats) { m.m.color.copy(m.col).lerp(CHALK, hh.white); if (m.em) { m.m.emissive.copy(m.em).lerp(CHALK_E, hh.white); } }
      hh.hair.visible = hh.white > 0.5;
      h.rotation.z = stiff ? (k ? -0.32 : 0.32) + Math.sin(t * 40) * 0.015 : 0;
      h.visible = !st.hidden;
      // the costume moves: Bo's bat wings twitch, Pip's nightcap flops with the waddle
      h.traverse(o => { if (o.userData.wings) o.userData.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.25 + Math.sin(t * 9 + i) * 0.15 * (sp > 0.1 ? 1 : 0.35)); }); if (o.userData.flop) o.userData.flop.rotation.z = Math.sin(h.userData.anim.phase) * 0.12; });
      const gy = MOVER3.floorAt ? MOVER3.floorAt(st.w, b.x, b.z, b.y + 0.3, 0) : 0;
      K3D.placeBlob(hh.blob, b.x, gy > -5 ? gy : 0, b.z, Math.max(0, b.y - (gy > -5 ? gy : 0)));
      hh.blob.visible = h.visible;
      const sc = K3D.toScreen(b.x, b.y + K3D.HERO.h + 0.3, b.z); p.x = sc.x - p.w / 2; p.y = sc.y;
    }
    // Pip's lantern: in the hand (or dropped low when stiff), or hanging on the porch hook
    HS.lan.position.set(lan.x, lan.y - 0.2, lan.z);
    HS.lan.rotation.set(Math.sin(t * 3.1) * 0.05, 0, Math.sin(t * 2.3) * 0.06);
    HS.lan.userData.set(lan.on && !lampOff, t);
    HS.lan.visible = !st.hidden;
    // Bo's key: over the shoulder, held out and turning while Bo works the key, or on its hook
    if (st.hasKey) {
      const b = ps[1].b3, hd = b.heading || 0, busy = st.keyHold > 0;
      if (busy) HS.keySpin += dt * 6;
      if (busy && st.keyTgt) {
        const tg = st.keyTgt, tx = tg.x != null ? tg.x : tg.def.x, tz = tg.z != null ? tg.z : tg.def.z;
        const a = Math.atan2(tx - b.x, tz - b.z);
        HS.key.position.set(b.x + Math.sin(a) * 0.45, b.y + 0.55, b.z + Math.cos(a) * 0.45);
        HS.key.rotation.set(Math.PI / 2, 0, 0); HS.key.rotation.order = 'YXZ'; HS.key.rotation.y = a; HS.key.rotation.z = HS.keySpin;
      } else {
        HS.key.rotation.order = 'YXZ';
        HS.key.position.set(b.x - Math.cos(hd) * 0.28 - Math.sin(hd) * 0.1, b.y + 0.32, b.z + Math.sin(hd) * 0.28 - Math.cos(hd) * 0.1);
        HS.key.rotation.set(-0.55, hd, 0.45);
      }
      HS.key.visible = !st.hidden && st.stiff[1] <= 0;
      if (st.stiff[1] > 0) { HS.key.visible = true; HS.key.position.set(b.x + 0.5, 0.05, b.z + 0.2); HS.key.rotation.set(Math.PI / 2, 0, 0.4); }
    } else { const hk = H.hooks.key; HS.key.rotation.order = 'XYZ'; HS.key.position.set(hk.x, hk.y + 0.02, hk.z + 0.12); HS.key.rotation.order = 'XYZ'; HS.key.rotation.set(0, 0, Math.sin(t * 1.3) * 0.05); HS.key.visible = true; }
    // ---- the lights ----
    const L = SC.L, on = lan.on && !lampOff && !st.hidden;
    const flick = 0.92 + Math.sin(t * 13) * 0.04 + Math.sin(t * 31.7) * 0.03;
    const gold = !!lan.gold;
    L.lantern.position.set(lan.x, lan.y + 0.02, lan.z);
    L.lantern.color.set(gold ? '#ffcf5a' : '#ffb35c');
    const R = lan.hung ? 1.6 : lan.r || 0;
    L.lantern.intensity = on ? (lan.beam ? 1.8 : 3.2 + (gold ? 1.2 : 0)) * flick : 0;
    L.lantern.distance = Math.max(2.5, R * 2.2);
    L.pool.visible = on; L.pool.position.set(lan.x, (ps[0].b3 ? MOVER3.floorAt(st.w, lan.x, lan.z, lan.y, 0) : 0) + 0.03, lan.z); L.pool.scale.set(R * 2.3, 1, R * 2.3);
    L.halo.visible = on; L.halo.position.set(lan.x, lan.y - 0.05, lan.z); L.halo.material.opacity = 0.9 * flick;
    if (on && lan.beam) {
      const Bm = lan.beam;
      L.beam.intensity = 2.6; L.beam.position.set(Bm.x, lan.y + 0.02, Bm.z); L.beam.target.position.set(Bm.x + Bm.dx * Bm.len, 0.25, Bm.z + Bm.dz * Bm.len); L.beam.distance = Bm.len + 3;
      L.cone.visible = true; L.cone.position.set(Bm.x, lan.y - 0.05, Bm.z); L.cone.lookAt(Bm.x + Bm.dx * 10, lan.y - 0.05 - 0.35, Bm.z + Bm.dz * 10);
      L.coneU.uLen.value = Bm.len; L.coneU.uOn.value = approachV(L.coneU.uOn.value, 1, Math.min(1, dt * 12)); L.coneU.uT.value = t;
      const e = Math.min(Bm.len, 9);
      L.beamPool.visible = true; L.beamPool.position.set(Bm.x + Bm.dx * e * 0.62, 0.035, Bm.z + Bm.dz * e * 0.62); L.beamPool.rotation.y = Math.atan2(Bm.dx, Bm.dz); L.beamPool.scale.set(1.0 + e * 0.2, 1, e * 1.1);
    } else { L.beam.intensity = 0; L.coneU.uOn.value = 0; L.cone.visible = false; L.beamPool.visible = false; }
    // the chandelier: lit while wound (it flares on), dark otherwise
    const w0 = st.wound.find(w => w.def.id === 'chand'), cLit = w0 ? Math.min(1, w0.t / 1.5) : 0;
    SC.chandFlare = Math.max(0, (SC.chandFlare || 0) - dt * 1.5);
    L.chand.intensity = cLit * (14 + SC.chandFlare * 20) * (0.95 + Math.sin(t * 9) * 0.05);
    for (const f of SC.chand.flames) f.visible = cLit > 0.05;
    for (const hl of SC.chand.halos) hl.material.opacity = cLit;
    SC.chand.glow.material.color.copy(hot('#ffc070', 0.35 * cLit));
    SC.chand.cg.rotation.y = Math.sin(t * 0.4) * 0.05; SC.chand.cg.rotation.z = Math.sin(t * 0.7) * 0.015;
    // the winder: its needle counts down, the crank turns while Bo winds
    const wd = SC.winder, winding = st.keyHold > 0 && st.keyTgt && st.keyTgt.id === 'chand';
    if (winding) wd.spin += dt * 8;
    wd.crank.rotation.z = -wd.spin; wd.needle.rotation.z = w0 ? -(w0.t / w0.def.dur) * Math.PI * 1.8 : 0;
    wd.gl.material.color.copy(hot('#ffd27a', winding ? 0.6 : w0 ? 0.25 : 0.08 + 0.06 * Math.sin(t * 3)));
    // the moon and lightning: a flash floods every room blue for a beat (the rules' flash freezes spooks too)
    const flash = st.flash > 0 ? Math.min(1, st.flash / 0.15) : 0;
    L.moon.intensity = (inside ? 0.07 : 0.55) * Math.PI + flash * 1.7 * Math.PI;
    if (SC.night.hemi) SC.night.hemi.intensity = (inside ? 0.05 : 0.2) * Math.PI + flash * 0.4 * Math.PI;
    L.moon.color.set(flash > 0.1 ? '#cfe0ff' : '#9fb0ff');
    K.amb.intensity = (inside ? 0.17 : 0.32) * Math.PI + flash * 0.6 * Math.PI;
    for (const sh of SC.shafts || []) { sh.shaft.material.opacity = 1; sh.shaft.material.color.copy(hot('#9ab0ff', 0.045 + flash * 0.4)); sh.patch.material.color.copy(hot('#9ab0ff', 0.2 + flash * 0.8)); }
    L.porch.intensity = inside ? 0 : 3.5 * (0.9 + Math.sin(t * 7) * 0.05);
    // the neon ghost buzzes: steady, a stutter now and then
    const stut = (Math.sin(t * 0.37) > 0.93 && Math.sin(t * 70) > 0) ? 0.25 : 1;
    if (SC.neonM) SC.neonM.color.copy(hot('#ffffff', 2.4 * stut)); L.neon.intensity = inside ? 0 : 14 * stut;
    // stage lights flicker (old gels, loose bulbs)
    for (const s of SC.stage || []) { const f = 0.75 + 0.25 * Math.sin(t * 2.3 + s.ph) * Math.sin(t * 7.1 + s.ph * 2); s.cone.material.opacity = f; s.pool.material.opacity = f; }
    L.green.intensity = (st.zone === 'hall' ? 9 : 0) * (0.8 + 0.2 * Math.sin(t * 2.3)) * (Math.sin(t * 0.21 + 1) > 0.97 ? 0.2 : 1); L.purple.intensity = (st.zone === 'corridor' ? 9 : 0) * (0.8 + 0.2 * Math.sin(t * 1.9 + 2));
    // ---- candles flicker; rain runs down the windows; curtains breathe; webs sway; bats swing ----
    for (const c of SC.candles || []) { const k = 0.85 + Math.sin(t * 11 + c.ph) * 0.1 + Math.sin(t * 23 + c.ph) * 0.05; c.fl.scale.set(1, k, 1); c.halo.material.opacity = 0.8 * k; }
    for (const r of SC.rain) r.map.offset.y = (t * 0.6) % 1;
    for (const c of SC.curtains) { const p = c.geo.attributes.position, a = c.base; for (let i = 0; i < p.count; i++) { const y = a[i * 3 + 1]; p.setZ(i, a[i * 3 + 2] + Math.sin(t * 1.3 + c.ph + y * 1.2) * 0.06 * (-y / 4) * (1 + Math.sin(t * 0.5 + c.ph) * 0.6)); } p.needsUpdate = true; }
    for (const w of SC.webs) w.w.rotation.x = Math.sin(t * 1.1 + w.ph) * 0.1;
    for (const b of SC.bats || []) b.p.rotation.z = Math.sin(t * b.sp + b.ph) * 0.18;
    // the rocking chair rocks by itself; the attic eye opens now and then; the mirror shows someone
    SC.rock.rotation.x = Math.sin(t * 1.6) * 0.12 * (0.5 + 0.5 * Math.sin(t * 0.13));
    if (SC.porchChair) SC.porchChair.rotation.x = Math.sin(t * 1.1 + 2) * 0.1 * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.21)));
    if (SC.atticEye) SC.atticEye.scale.y = Math.sin(t * 0.25) > 0.6 ? 1 : 0.08;
    { const mp = ps[0].b3, near = mp ? Math.hypot(mp.x - 7, mp.z - 1.2) : 99; SC.mirror.ghost.material.opacity = approachV(SC.mirror.ghost.material.opacity, near < 4.5 ? 0.6 + 0.2 * Math.sin(t * 2) : 0, Math.min(1, dt * 1.5)); }
    if (SC.curtainHand) SC.curtainHand.visible = Math.sin(t * 0.31 + 2) > 0.92;
    // portrait eyes follow the nearer hero
    for (const e of SC.eyes) { e.g.updateMatrixWorld(); const wp = e.g.getWorldPosition(tmpA); let best = null, bd = 1e9; for (const p of ps) { const d = Math.hypot(p.b3.x - wp.x, p.b3.z - wp.z); if (d < bd) { bd = d; best = p.b3; } } if (!best) continue; const loc = e.g.worldToLocal(tmpB.set(best.x, best.y + 0.5, best.z)); const lx = Math.max(-1, Math.min(1, loc.x / 4)) * 0.012, ly = Math.max(-1, Math.min(1, loc.y / 4)) * 0.01; e.eyes.forEach((m, i) => m.position.set(e.base[i].x + lx, e.base[i].y + ly, e.base[i].z)); }
    // ---- the doors swing; their cracks glow while shut ----
    for (const d of SC.doors) {
      const D = st.doors[d.d.id], want = D && D.open ? 1 : 0;
      d.swing = approachV(d.swing, want, Math.min(1, dt * (want ? 2.2 : 5)));
      const cut = d.wall && zn.cut.includes(d.wall) && !st.hidden;
      for (const lf of d.leaves) { lf.hinge.rotation.y = -lf.sx * d.swing * 1.75; lf.hinge.scale.y = cut ? 0.95 / 3.15 : 1; }
      if (d.fan) d.fan.visible = !cut;
      d.crackM.opacity = (1 - d.swing) * (0.45 + 0.15 * Math.sin(t * 3 + d.g.position.x));
      d.g.visible = shown(d.reg || (d.reg = regAt(d.d.x, d.d.z)));
    }
    // ---- clocks: pendulums swing; the current restart clock's face glows ----
    SC.clockFigs.forEach((f, i) => { if (f) { f.visible = shown(f.userData.reg); f.userData.set(t, st.restart === i, Math.max(0, 1 - (st.t - st.clockT))); } });
    // ---- the spooks ----
    st.spooks.forEach((sp, i) => {
      const f = SC.spooks[i];
      f.visible = shown(regAt(sp.x, sp.z));
      if (!f.visible) return;
      // (on the stair a spook stands on the steps: the rules only keep its x and z; a portrait hangs on its wall)
      const fy = MOVER3.floorAt(st.w, sp.x, sp.z, (sp.y || 0) + 1.2, 0);
      if (sp.kind === 'portrait') { f.position.set(sp.def.wall[0], 0, sp.def.wall[1]); f.rotation.y = sp.def.face || 0; }
      else { f.position.set(sp.x, Math.max(sp.y || 0, fy > -5 ? fy : 0), sp.z); f.rotation.y = sp.face || 0; }
      f.userData.set(sp, t, dt);
      // the "click" of a freeze: a little shudder; the bite: a jolt
      if (sp.state === 'frozen') f.rotation.z = Math.sin(t * 60) * 0.01 * Math.max(0, sp.thaw);
      else f.rotation.z = sp.bite > 0 ? Math.sin(t * 50) * 0.08 * sp.bite : 0;
    });
    // ---- the Butler ----
    const Bt = st.butler, bf = SC.butler;
    bf.visible = Bt.state !== 'off' && Bt.state !== 'coming';
    if (bf.visible) { bf.position.set(Bt.x, Bt.y || 0, Bt.z); bf.rotation.y = Bt.face || 0; bf.userData.set(Bt, t, dt); }
    // ---- Grimsby at the exit; the dining chairs; the far rooms' own moving parts ----
    if (SC.boss && st.boss) {
      const Bo = st.boss, bf2 = SC.boss;
      bf2.visible = shown('S4b');
      if (bf2.visible) {
        bf2.position.set(Bo.x, 0, Bo.z); bf2.rotation.y = Bo.face;
        bf2.userData.set({ state: Bo.state === 'fight' ? 'chase' : 'walk', lit: Bo.lit && Bo.state === 'fight', what: Bo.state === 'talk' ? 'picture' : '' }, t, Bo.state === 'down' || Bo.state === 'done' ? 0 : dt * (st.keyWhat === 'boss' ? 3 : 1));
        const u = bf2.userData, bow = Bo.state === 'down' ? Math.min(1, Bo.t / 1.2) : Bo.state === 'done' ? 1 : 0;
        u.body.rotation.x = bow * 0.75 + (Bo.state === 'shrug' ? Math.sin(Bo.t * 20) * 0.08 : 0);
        u.head.rotation.x = bow * 0.3;
        if (Bo.state === 'done') { u.body.rotation.z = 0.08; u.arms[1].sh.rotation.x = 0.2; }
        if (st.keyWhat === 'boss') u.key.rotation.z -= dt * 6;
      }
    }
    SC.chairs.forEach((f, i) => { const c = st.chairs[i]; f.visible = shown('S2'); if (!f.visible) return; f.position.x = c.s.x; f.position.z = c.s.z; f.rotation.y = c.def.face + (c.u > 0.02 ? Math.sin(i * 1.7) * 0.25 * c.u : 0); f.userData.set(c, t); });
    PARKMANOR_ROOMS.update(K, st, dt, SC, { shown, lan, on, t, flash, regAt });
    // ---- the wardrobe: doors ajar while the pair hide in it, its frame pulsing while the Butler is about ----
    const hideCall = PARKMANOR_SPOOKS.butlerNear(st) && !st.hidden;
    SC.wardrobe.userData.set(st.hidden === 'wardrobe' ? 0.78 : 0, hideCall, t);
    // ---- wisps ----
    SC.wisps.forEach((w, i) => {
      const a = st.wispAt[i], got = st.got[i];
      if (w.pop >= 0) { w.pop += dt; w.g.visible = w.pop < 0.5; const k = 1 + w.pop * 4; w.g.scale.setScalar(k); w.fl.material.opacity = 1 - w.pop * 2; w.g.position.y += dt * 2; return; }
      w.g.visible = !got && a.shown;
      if (!w.g.visible) return;
      w.g.scale.setScalar(1); w.fl.material.opacity = 1;
      w.g.position.set(a.x + Math.sin(t * 1.3 + i) * 0.05, a.y + Math.sin(t * 2.1 + i * 1.7) * 0.08, a.z);
      w.fl.scale.set(0.42 + Math.sin(t * 9 + i) * 0.03, 0.62 + Math.sin(t * 7 + i) * 0.05, 1);
    });
    // ---- rats run along the walls now and then ----
    for (const r of SC.rats.list) {
      if (!r.run) { r.wait -= dt; if (r.wait <= 0) { r.run = SC.rats.runs[Math.floor(rnd() * SC.rats.runs.length)]; r.t = 0; r.r.visible = true; } continue; }
      r.t += dt * 2.6 / Math.hypot(r.run[1][0] - r.run[0][0], r.run[1][1] - r.run[0][1]);
      if (r.t >= 1) { r.run = null; r.r.visible = false; r.wait = 4 + rnd() * 8; continue; }
      const [a, b] = r.run; r.r.position.set(a[0] + (b[0] - a[0]) * r.t, 0.02 + Math.abs(Math.sin(t * 30)) * 0.02, a[1] + (b[1] - a[1]) * r.t); r.r.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
    }
    // ---- eyes in the dark blink, and go out if the lantern comes near ----
    for (const e of SC.darkEyes) {
      const near = Math.hypot(e.g.position.x - lan.x, e.g.position.z - lan.z) < (lan.r || 2.5) + 1.5 && on;
      e.on = approachV(e.on, near ? 0 : 1, Math.min(1, dt * (near ? 10 : 0.6)));
      const blink = Math.sin(t * 0.9 + e.ph) > 0.96 ? 0.1 : 1;
      e.g.scale.set(1, e.on * blink + 0.001, 1); e.g.visible = e.on > 0.02;
    }
    // ---- dust motes in the light ----
    { const Mo = SC.motes, P = Mo.pos; const c = V(lan.x, lan.y, lan.z);
      for (let i = 0; i < Mo.n; i++) {
        const s = Mo.st[i];
        if (!Mo.init || Math.hypot(s.x - c.x, s.z - c.z) > 16 || Math.abs(s.y - 1.5) > 2.5) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * (i % 3 ? 3.2 : 14); s.x = c.x + Math.cos(a) * r; s.z = c.z + Math.sin(a) * r; s.y = 0.2 + rnd() * 2.6; if (lan.beam && i % 3 === 0) { const tt = rnd() * lan.beam.len; s.x = c.x + lan.beam.dx * tt + (rnd() - 0.5) * (0.6 + tt * 0.3); s.z = c.z + lan.beam.dz * tt + (rnd() - 0.5) * (0.6 + tt * 0.3); } }
        s.x += (s.vx + Math.sin(t * 0.7 + i) * 0.03) * dt; s.y += (s.vy + Math.cos(t * 0.5 + i) * 0.02) * dt; s.z += (s.vz) * dt;
        P[i * 3] = s.x; P[i * 3 + 1] = s.y; P[i * 3 + 2] = s.z;
      }
      Mo.init = true; Mo.pts.geometry.attributes.position.needsUpdate = true;
      Mo.U.uL.value.copy(c); Mo.U.uR.value = on ? R : 0; Mo.U.uT.value = t; Mo.U.uPx.value = Math.max(1, (K3D.R ? K3D.R.domElement.height : 720) / 720) * 2.5;
      if (on && lan.beam) { Mo.U.uB.value.set(lan.beam.dx, 0, lan.beam.dz); Mo.U.uBL.value = lan.beam.len; } else Mo.U.uBL.value = 0;
    }
    for (const [i, l] of (SC.fuseLights || []).entries()) l.visible = Math.sin(t * (2 + i * 1.3) + i) > -0.3;
    // ---- fog drifts ----
    for (const f of SC.fog) { f.m.position.x = f.x + Math.sin(t * f.sp + f.ph) * 1.6; f.m.position.z = f.z + Math.cos(t * f.sp * 0.7 + f.ph) * 1.0; }
    // ---- the camera: the zone's view; hidden, from inside the hiding place looking out through the crack ----
    const rig = SC.rig;
    if (st.hidden) {
      const hd = H.hides.find(x => x.id === st.hidden);
      // (low under the table or in the chest, peeking out; standing behind a curtain or in the wardrobe)
      const low = hd.kind === 'table' || hd.kind === 'chest', ey = low ? 0.62 : 1.3, cx = hd.enter ? hd.enter[0] : hd.x, cz = hd.enter ? hd.enter[1] : hd.z;
      const back = hd.kind === 'table' ? -0.9 : hd.kind === 'chest' ? -0.2 : 0.42;
      const eye = V(cx + Math.sin(hd.face) * back, ey, cz + Math.cos(hd.face) * back), out = V(cx + Math.sin(hd.face) * 4, low ? 0.9 : 1.25, cz + Math.cos(hd.face) * 4);
      if (bf.visible) out.lerp(V(Bt.x, low ? 1.1 : 1.7, Bt.z), 0.6);
      const cam = K.camera;
      if (!SC.hideCam) { SC.hideCam = { e: eye.clone(), a: out.clone() }; }
      SC.hideCam.e.lerp(eye, Math.min(1, dt * 5)); SC.hideCam.a.lerp(out, Math.min(1, dt * 3));
      cam.position.copy(SC.hideCam.e); cam.lookAt(SC.hideCam.a);
      if (Math.abs(cam.fov - 56) > 0.01) { cam.fov = 56; cam.updateProjectionMatrix(); }
      K.focus.copy(SC.hideCam.a); K.sunAt(SC.hideCam.a, 12);
      rig._snap = true;
    } else {
      SC.hideCam = null;
      if (SC.zone !== zn.id) { SC.zone = zn.id; }
      const c = zn.cam; rig.heading = c.heading; rig.pitch = c.pitch; rig.min = c.min; rig.max = c.max; rig.fov = c.fov || 34; rig.ahead.set(...(c.ahead || [0, 0, 0]));
      const tg = []; for (const p of ps) if (p.b3) tg.push(V(p.b3.x, p.b3.y + 0.5, p.b3.z));
      if (PARKMANOR_SCENE.camOverride) {
        const o = PARKMANOR_SCENE.camOverride, cam = K.camera;
        cam.position.set(...o.eye); cam.lookAt(...o.at); if (Math.abs(cam.fov - (o.fov || 40)) > 0.01) { cam.fov = o.fov || 40; cam.updateProjectionMatrix(); }
        K.focus.set(...o.at); K.sunAt(K.focus, 20);
      } else rig.update(K, dt, tg);
    }
    K.focusRange = st.hidden ? 8 : 26;
  }

  return { build, update, drawTop() {}, camOverride: null, lampOff: false, SC };
})();
