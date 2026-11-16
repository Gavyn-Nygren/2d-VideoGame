/* Pip & Bo - Level previews for World 28 Pyramid Sands (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw28. The whole file is skipped when the preview engine isn't loaded yet.
   Each level's preview sits between its own BEGIN/END lines (helpers pw28b = boulder run, pw28t = tomb torch,
   pw28s = sliding stones, pw28c = camel race). */
'use strict';

if (typeof definePreview === 'function') {
  // a row of sandstone blocks (x, y, w, h), light or dark
  const pw28Blocks = (v, x, y, w, h, dark) => {
    const c = v.ctx;
    c.fillStyle = dark ? '#7a5434' : '#c99a5e'; c.fillRect(x, y, w, h);
    c.strokeStyle = dark ? 'rgba(40,22,10,0.45)' : 'rgba(110,70,30,0.35)'; c.lineWidth = 1;
    for (let r = 0; r * 14 < h; r++) {
      c.beginPath(); c.moveTo(x, y + r * 14); c.lineTo(x + w, y + r * 14); c.stroke();
      for (let k = (r % 2) * 14; k < w; k += 28) { c.beginPath(); c.moveTo(x + k, y + r * 14); c.lineTo(x + k, y + Math.min(h, r * 14 + 14)); c.stroke(); }
    }
    // a lit top and a shaded foot on each course, and the odd paler block
    c.fillStyle = 'rgba(255,240,200,0.12)'; for (let r = 0; r * 14 < h; r++) c.fillRect(x, y + r * 14 + 1, w, 1.5);
    c.fillStyle = 'rgba(60,30,10,0.12)'; for (let r = 0; r * 14 < h; r++) c.fillRect(x, y + r * 14 + 11, w, 2.5);
    for (let r = 0; r * 14 < h; r++) for (let k = (r % 2) * 14 - 28; k < w; k += 28) if ((r * 7 + k) % 5 === 0) { c.fillStyle = dark ? 'rgba(255,220,170,0.07)' : 'rgba(255,245,215,0.18)'; c.fillRect(x + Math.max(0, k) + 1, y + r * 14 + 1, 26, 12); }
  };

  // ----- BEGIN 28-1 Rolling Boulder Run preview -----
  // A tomb corridor. The giant boulder rumbles in from the left (dust, shaking screen). Bo yanks a lever and the stone
  // door ahead slides up; Pip smashes a rubble pile; both dash through and the boulder thunders behind. "RUN!"
  definePreview('Rolling Boulder Run', {
    blurb: 'A giant boulder is coming! Pull the levers, smash the rubble, and RUN!',
    loop: 5, still: 2.6,
    draw(v, t) {
      const c = v.ctx, e = v.ease, shake = t > 0.6 ? Math.sin(t * 47) * 1.4 : 0;
      c.save(); c.translate(shake, Math.cos(t * 39) * shake * 0.6);
      // walls, floor, ceiling and a glyph band
      pw28Blocks(v, -4, 0, 330, 150, true);
      c.fillStyle = 'rgba(255,214,140,0.16)'; c.fillRect(-4, 44, 330, 18);
      for (let i = 0; i < 9; i++) { c.strokeStyle = 'rgba(255,220,150,0.35)'; c.lineWidth = 1.3; c.beginPath(); c.arc(16 + i * 38, 53, 4, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(24 + i * 38, 47); c.lineTo(30 + i * 38, 59); c.stroke(); }
      pw28Blocks(v, -4, 0, 330, 20, false);
      pw28Blocks(v, -4, 150, 330, 34, false);
      // torches
      for (const tx of [70, 250]) { c.fillStyle = '#5a3a1e'; c.fillRect(tx - 2, 82, 4, 14); const f = 1 + Math.sin(t * 20 + tx) * 0.15; c.fillStyle = '#ffb02e'; c.beginPath(); c.ellipse(tx, 76, 4 * f, 8 * f, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff2a8'; c.beginPath(); c.ellipse(tx, 78, 2, 4, 0, 0, Math.PI * 2); c.fill(); }
      // the door Bo opens (slides up after the lever) and the rubble Pip smashes
      const pull = e.back(v.seg(t, 0.7, 1.0)), up = e.inOut(v.seg(t, 0.9, 1.6)) * 64;
      c.fillStyle = '#9a7048'; c.fillRect(214, 86 - up, 22, 64); c.strokeStyle = '#5a3a1e'; c.lineWidth = 1.5; c.strokeRect(214, 86 - up, 22, 64);
      c.fillStyle = '#5a3a1e'; c.fillRect(196, 120, 10, 30);
      const la = v.lerp(-0.6, 0.6, pull); v.line(201, 122, 201 + Math.sin(la) * 16, 122 - Math.cos(la) * 16, '#3a2a1a', 3); v.fillCircle(201 + Math.sin(la) * 16, 122 - Math.cos(la) * 16, 3.5, pull > 0.5 ? v.c.gold : '#ff5f6d');
      const smash = v.seg(t, 1.0, 1.25);
      if (smash < 1) for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#8a6a4a' : '#a58060'; c.beginPath(); c.arc(140 + (i % 3) * 9 + smash * (i - 2) * 30, 146 - Math.floor(i / 3) * 8 - smash * 30 * (1 + i % 2), 6, 0, Math.PI * 2); c.fill(); }
      else v.puff(146, 140, v.seg(t, 1.25, 1.8));
      // the heroes: Bo at the lever, Pip at the rubble, then both run right
      const run = e.in(v.seg(t, 1.6, 3.6));
      const bx = 188 + run * 160, px = 128 + run * 210, step = run > 0 ? Math.abs(Math.sin(t * 16)) * 3 : 0;
      v.hero(1, bx, 150 - step, { s: 0.8, mood: t < 1.6 ? 'grit' : 'wow', face: t < 1.0 ? 1 : 1 });
      v.hero(0, px, 150 - step, { s: 0.8, mood: t < 1.3 ? 'grit' : 'wow', sq: t > 1.0 && t < 1.2 ? 0.15 : 0 });
      if (t > 0.7 && t < 1.4) v.bubble('Pull!', 200, 74);
      if (t > 1.0 && t < 1.6) v.label('Smash!', 140, 110, 12, v.c.gold);
      // the boulder: rolls in from the left, faster and faster
      const bxr = -70 + e.in(v.seg(t, 0.2, 4.6)) * 380, rot = bxr / 36;
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(bxr, 152, 40, 5, 0, 0, Math.PI * 2); c.fill();
      c.save(); c.translate(bxr, 112); c.rotate(rot);
      c.fillStyle = '#9c7a58'; c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#5e4630'; c.lineWidth = 2.5; c.stroke();
      c.strokeStyle = 'rgba(70,50,30,0.6)'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(0, 0, 14 + i * 6, i, i + 1.3); c.stroke(); }
      c.restore();
      for (let i = 0; i < 4; i++) v.line(bxr - 50 - i * 8, 90 + i * 14, bxr - 66 - i * 8, 90 + i * 14, 'rgba(255,230,190,0.5)', 2);
      v.puff(bxr - 30, 146, v.phase(t, 0.5));
      // falling grit from the ceiling
      for (let i = 0; i < 6; i++) { const k = v.phase(t + i * 0.37, 0.9); c.fillStyle = 'rgba(220,190,140,0.8)'; c.fillRect(30 + i * 52 + v.rand(i) * 20, 20 + k * 130, 2, 3); }
      c.restore();
      if (t > 0.3 && t < 1.2) v.label('RUN!', 160, 34, 22, '#ff5f6d');
    },
  });
  // ----- END 28-1 Rolling Boulder Run preview -----

  // ----- BEGIN 28-2 Tomb Torch Explorers preview -----
  // A pitch-dark tomb. Pip carries the torch; in its light a switch glows on the wall and spikes peek out of the
  // floor. Bo hops the trap, presses the switch, and the gate ahead grinds up with a sparkle.
  definePreview('Tomb Torch Explorers', {
    blurb: 'One carries the torch, the other finds the hidden switches. Watch for traps!',
    loop: 5.2, still: 3.4,
    draw(v, t) {
      const c = v.ctx, e = v.ease;
      pw28Blocks(v, 0, 0, 320, 180, true);
      pw28Blocks(v, 0, 150, 320, 30, false);
      // the switch, the spike trap, the gate
      const press = t > 2.6, open = e.inOut(v.seg(t, 2.8, 3.6));
      c.fillStyle = press ? v.c.gold : '#d9b46a'; v.rr(206, 104, 14, 14, 3); c.fill(); c.strokeStyle = '#5a3a1e'; c.lineWidth = 1.5; c.stroke();
      v.text('☥', 213, 111.5, 10, '#5a3a1e');
      c.fillStyle = '#d8d8e0'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(134 + i * 8, 150); c.lineTo(138 + i * 8, 141); c.lineTo(142 + i * 8, 150); c.fill(); }
      c.fillStyle = '#6a4a2a'; c.fillRect(276, 86 - open * 62, 20, 64);
      c.strokeStyle = '#3a2412'; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(276, 96 + k * 14 - open * 62); c.lineTo(296, 96 + k * 14 - open * 62); c.stroke(); }
      // Pip with the torch walks in; Bo follows, hops the spikes, presses the switch
      const px = v.lerp(40, 172, e.inOut(v.seg(t, 0, 1.8))), walk = t < 1.8 ? Math.abs(Math.sin(t * 12)) * 2 : 0;
      const bxk = v.seg(t, 0.4, 2.5), bx = v.lerp(14, 212, e.inOut(bxk)), hop = bx > 120 && bx < 160 ? -Math.sin((bx - 120) / 40 * Math.PI) * 22 : 0;
      v.hero(1, bx, 150 + hop - (bxk > 0 && bxk < 1 && !hop ? Math.abs(Math.sin(t * 13)) * 2 : 0), { s: 0.8, mood: press ? 'joy' : 'happy' });
      v.hero(0, px, 150 - walk, { s: 0.8, mood: 'happy' });
      const fx = px + 12, fy = 112, fl = 1 + Math.sin(t * 22) * 0.12;
      c.fillStyle = '#6a4424'; c.fillRect(fx - 1.5, fy, 3, 16);
      c.fillStyle = '#ffb02e'; c.beginPath(); c.ellipse(fx, fy - 4, 4.5 * fl, 8 * fl, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff2a8'; c.beginPath(); c.ellipse(fx, fy - 2, 2, 4, 0, 0, Math.PI * 2); c.fill();
      // darkness with a warm hole around the torch
      const r = 78 + Math.sin(t * 9) * 3;
      c.save(); c.beginPath(); c.rect(0, 0, 320, 180); c.arc(fx, fy, r, 0, Math.PI * 2, true); c.fillStyle = 'rgba(8,4,2,0.93)'; c.fill(); c.restore();
      const g = c.createRadialGradient(fx, fy, r * 0.45, fx, fy, r);
      g.addColorStop(0, 'rgba(8,4,2,0)'); g.addColorStop(1, 'rgba(8,4,2,0.93)');
      c.fillStyle = g; c.beginPath(); c.arc(fx, fy, r + 0.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,170,60,0.08)'; c.beginPath(); c.arc(fx, fy, r * 0.8, 0, Math.PI * 2); c.fill();
      if (t > 1.2 && t < 2.2) v.bubble('A switch!', 210, 84);
      if (t > 2.6 && t < 3.4) v.label('Click!', 213, 92, 12, v.c.gold);
      if (open > 0.3) v.sparkle(286, 70, v.seg(t, 3.0, 4.0));
      if (t > 3.6) v.label('The gate opened!', 160, 30, 15, v.c.gold);
    },
  });
  // ----- END 28-2 Tomb Torch Explorers preview -----

  // ----- BEGIN 28-3 Sliding Stone Puzzle preview -----
  // Seen from above: a stone floor with sockets that match a picture tablet. Pip and Bo line up behind the big sun
  // stone and push it together onto its socket, the stones sink, and the secret door slides open.
  definePreview('Sliding Stone Puzzle', {
    blurb: 'Push the stones to match the picture. Heavy stones need both of you!',
    loop: 5, still: 3.3,
    draw(v, t) {
      const c = v.ctx, e = v.ease, S = 24, ox = 64, oy = 20;
      pw28Blocks(v, 0, 0, 320, 180, true);
      c.fillStyle = 'rgba(20,10,4,0.3)'; c.fillRect(0, 0, 320, 180);
      c.fillStyle = 'rgba(20,10,4,0.45)'; c.fillRect(ox - 3, oy - 3, 8 * S + 6, 6 * S + 7);
      // the floor grid (8 x 6)
      for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 8; gx++) { c.fillStyle = (gx + gy) % 2 ? '#d6ad70' : '#cfa466'; c.fillRect(ox + gx * S, oy + gy * S, S, S); }
      c.strokeStyle = 'rgba(110,70,30,0.35)'; c.lineWidth = 1; for (let k = 0; k <= 8; k++) { c.beginPath(); c.moveTo(ox + k * S, oy); c.lineTo(ox + k * S, oy + 6 * S); c.stroke(); }
      // the door at the top (opens at the end)
      const open = e.inOut(v.seg(t, 3.2, 3.9));
      c.fillStyle = '#2a1a0c'; c.fillRect(ox + 3 * S, oy - 14, S * 2, 14);
      c.fillStyle = '#8a6440'; c.fillRect(ox + 3 * S - open * S, oy - 14, S, 14); c.fillRect(ox + 4 * S + open * S, oy - 14, S, 14);
      // sockets: eye, sun (big), bird
      const sock = (gx, gy, ch) => { c.strokeStyle = 'rgba(90,55,25,0.8)'; c.setLineDash([3, 2]); c.strokeRect(ox + gx * S + 3, oy + gy * S + 3, S - 6, S - 6); c.setLineDash([]); v.text(ch, ox + gx * S + S / 2, oy + gy * S + S / 2 + 1, 11, 'rgba(90,55,25,0.6)'); };
      sock(3, 0, '◉'); sock(4, 0, '☀'); sock(5, 0, '▲');
      // the other two stones are already home
      const sink = e.inOut(v.seg(t, 2.9, 3.3));
      const stone = (x, y, ch, big) => {
        c.globalAlpha = 1 - sink * 0.55;
        c.fillStyle = big ? '#a88456' : '#c09868'; v.rr(x + 2, y + 2, S - 4, S - 4, 3); c.fill(); c.strokeStyle = '#5a3a1e'; c.lineWidth = big ? 2.4 : 1.5; c.stroke();
        v.text(ch, x + S / 2, y + S / 2 + 1, 12, '#3a2412'); c.globalAlpha = 1;
      };
      stone(ox + 3 * S, oy, '◉'); stone(ox + 5 * S, oy, '▲');
      // the sun stone moves up from row 3 to row 0, pushed by Bo (front) and Pip (behind)
      const k = e.inOut(v.seg(t, 0.9, 2.8)), sy = oy + (3 - 3 * k) * S, sx = ox + 4 * S;
      stone(sx, sy, '☀', true);
      const bump = t > 0.9 && t < 2.8 ? Math.abs(Math.sin(t * 10)) * 1.5 : 0;
      const walkIn = e.out(v.seg(t, 0, 0.8));
      v.hero(1, sx + S / 2, sy + S * 2 - 2 + bump + (1 - walkIn) * 30, { s: 0.6, face: 1, mood: k > 0 && k < 1 ? 'grit' : 'happy' });
      v.hero(0, sx + S / 2, sy + S * 3 - 2 + bump + (1 - walkIn) * 40, { s: 0.6, face: 1, mood: k > 0 && k < 1 ? 'grit' : 'happy' });
      if (t > 0.5 && t < 1.4) v.bubble('Line up behind me!', 236, 120);
      if (t > 1.2 && t < 2.6) v.label('Push!', sx + S / 2 + 46, sy + 30, 13, v.c.gold);
      // the picture tablet
      c.fillStyle = '#e8cf98'; v.rr(268, 22, 46, 26, 4); c.fill(); c.strokeStyle = '#5a3a1e'; c.lineWidth = 1.5; c.stroke();
      v.text('◉☀▲', 291, 36, 10, '#3a2412');
      if (open > 0.5) { v.sparkle(ox + 4 * S, oy - 6, v.seg(t, 3.5, 4.5)); v.label('The secret door!', 160, 172, 13, v.c.gold); }
    },
  });
  // ----- END 28-3 Sliding Stone Puzzle preview -----

  // ----- BEGIN 28-4 Camel Race preview -----
  // Two camels race over rolling dunes past pyramids. Pip jumps from a dune top and lands on the far side: "Perfect
  // landing!" and a burst of speed; Bo bonks a cactus and falls behind.
  const pw28cH = (x, ph) => Math.sin(x * 0.03 + ph) * 8 + Math.sin(x * 0.011 + ph * 2) * 5;
  const pw28cCamel = (v, x, y, col, leg) => {
    const c = v.ctx;
    c.save(); c.translate(x, y);
    c.strokeStyle = '#7a5230'; c.lineWidth = 3; c.lineCap = 'round';
    for (const [lx, a] of [[-12, leg], [-6, -leg], [8, -leg], [13, leg]]) { c.beginPath(); c.moveTo(lx, -14); c.lineTo(lx + Math.sin(a) * 6, 0); c.stroke(); }
    c.fillStyle = '#c8945a'; c.beginPath(); c.ellipse(0, -20, 18, 9, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(-5, -28, 7, 6, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(7, -28, 7, 6, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(14, -22); c.quadraticCurveTo(24, -26, 24, -36); c.lineTo(29, -36); c.quadraticCurveTo(28, -24, 18, -16); c.fill();
    c.beginPath(); c.ellipse(28, -37, 6, 3.5, 0.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2a1a0c'; c.beginPath(); c.arc(29, -38, 1, 0, Math.PI * 2); c.fill();
    c.fillStyle = col; c.fillRect(-4, -30, 9, 9);
    c.restore();
  };
  definePreview('Camel Race', {
    blurb: 'Race camels over the dunes. Jump from the top, land on the far side!',
    loop: 5, still: 2.2,
    draw(v, t) {
      const c = v.ctx;
      const g = c.createLinearGradient(0, 0, 0, 180); g.addColorStop(0, '#5aa8e8'); g.addColorStop(1, '#ffe2a8'); c.fillStyle = g; c.fillRect(0, 0, 320, 180);
      v.fillCircle(270, 34, 16, '#fff6d0');
      const scroll = t * 70;
      for (const [px, s] of [[60, 1], [190, 1.4], [300, 0.9]]) { const x = ((px - scroll * 0.15) % 380 + 380) % 380 - 30; c.fillStyle = '#e8c486'; c.beginPath(); c.moveTo(x - 40 * s, 92); c.lineTo(x, 92 - 44 * s); c.lineTo(x + 40 * s, 92); c.fill(); c.fillStyle = '#d4ac6c'; c.beginPath(); c.moveTo(x, 92 - 44 * s); c.lineTo(x + 40 * s, 92); c.lineTo(x + 6 * s, 92); c.fill(); }
      // two dune lanes (far for Bo, near for Pip), scrolling left
      const lane = (base, col, ph) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, 180); for (let x = 0; x <= 320; x += 6) c.lineTo(x, base + pw28cH(x + scroll, ph)); c.lineTo(320, 180); c.fill(); };
      lane(110, '#e3b672', 0); lane(146, '#f0c886', 1.7);
      // the cactus in Bo's lane
      const cx = 300 - ((t * 70) % 420), cy = 110 + pw28cH(cx + scroll, 0);
      c.fillStyle = '#4c9a50'; v.rr(cx - 3, cy - 20, 6, 20, 3); c.fill(); v.rr(cx - 9, cy - 14, 4, 8, 2); c.fill(); v.rr(cx + 5, cy - 16, 4, 8, 2); c.fill();
      // Pip: a jump between 1.0 and 1.7 s, then a speed burst
      const jk = v.seg(t, 1.0, 1.7), boost = t > 1.7 ? Math.min(1, (t - 1.7) * 2) * (1 - v.seg(t, 3.6, 5)) : 0;
      const pX = 130 + boost * 50, pY = 146 + pw28cH(pX + scroll, 1.7) + (jk > 0 && jk < 1 ? -Math.sin(jk * Math.PI) * 34 : 0);
      const bX = 150 - v.seg(t, 2.0, 4.0) * 40 + (t > 4 ? 0 : 0), bY = 110 + pw28cH(bX + scroll, 0);
      const leg = Math.sin(t * 14) * 0.6;
      pw28cCamel(v, bX, bY, '#4fb5ff', leg);
      v.hero(1, bX, bY - 30, { s: 0.48, mood: t > 2.0 && t < 2.6 ? 'dizzy' : 'happy' });
      pw28cCamel(v, pX, pY, '#ff6b5e', jk > 0 && jk < 1 ? 0.5 : leg);
      v.hero(0, pX, pY - 30, { s: 0.55, mood: jk > 0 ? 'joy' : 'happy' });
      for (let i = 0; i < 3; i++) v.puff(pX - 26 - i * 10, pY - 2, v.phase(t + i * 0.2, 0.6));
      if (boost > 0.2) for (let i = 0; i < 3; i++) v.line(pX - 40 - i * 6, pY - 34 + i * 8, pX - 60 - i * 6, pY - 34 + i * 8, 'rgba(255,214,90,0.9)', 2);
      if (t > 1.7 && t < 3.0) v.label('Perfect landing!', 236, 26, 14, v.c.gold);
      if (t > 2.0 && t < 2.8) v.bubble('Prickly!', bX - 40, bY - 56);
    },
  });
  // ----- END 28-4 Camel Race preview -----
}
