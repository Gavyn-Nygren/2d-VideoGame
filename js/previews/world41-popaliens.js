/* Pip & Bo - World page preview: 41-4 Paper Alien Invasion. See js/previews/preview-core.js.
   (Its own file, so the World 41 levels built side by side never touch the same preview file.)
   A 4 s loop on a giant page seen from low behind the heroes: the saucer hangs far ahead with its light cone, a row of
   paper Grunts pops up out of the page, Pip and Bo fire bolts (yellow and green) and the Grunts crumple into paper
   balls; then a cosmic grenade arcs into the last clump and bursts into confetti. A pure function of t. */
'use strict';

definePreview('Paper Alien Invasion', {
  blurb: 'Shrunk to ant size, blast your way past the paper aliens to the bunker.',
  loop: 4,
  still: 1.35,
  draw(v, t) {
    const g = v.ctx, W = v.W, H = v.H, TAU = Math.PI * 2;
    // the page: cream, with the reader's pencil notes and fibres running toward a hazy horizon
    const sky = g.createLinearGradient(0, 0, 0, 70);
    sky.addColorStop(0, '#b7a789'); sky.addColorStop(1, '#ddd0b4');
    g.fillStyle = sky; g.fillRect(0, 0, W, 70);
    const pg = g.createLinearGradient(0, 62, 0, H);
    pg.addColorStop(0, '#e6dcc4'); pg.addColorStop(1, '#f7f0de');
    g.fillStyle = pg; g.fillRect(0, 62, W, H - 62);
    // far off: the reader's hand as a soft mountain, a giant pencil lying across the page
    g.fillStyle = 'rgba(214,170,140,0.55)';
    g.beginPath(); g.moveTo(210, 66); g.bezierCurveTo(230, 30, 290, 28, 320, 44); g.lineTo(320, 66); g.closePath(); g.fill();
    g.save(); g.translate(0, 70); g.rotate(-0.05);
    g.fillStyle = '#f2c23a'; g.fillRect(-10, -6, 120, 9); g.fillStyle = '#e7a1a8'; g.fillRect(-10, -6, 10, 9);
    g.fillStyle = '#e8d2a6'; g.beginPath(); g.moveTo(110, -6); g.lineTo(126, -1.5); g.lineTo(110, 3); g.fill();
    g.restore();
    // the pencil notes in perspective (lines that scroll toward us)
    const scroll = (t * 0.25) % 1;
    g.strokeStyle = 'rgba(70,70,84,0.28)'; g.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const k = ((i + scroll) / 6), y = 64 + Math.pow(k, 2) * 120;
      const s = 0.3 + k * 1.4;
      g.beginPath(); g.moveTo(80 + (i % 2) * 70 - 30 * s, y); g.quadraticCurveTo(160, y - 3 * s, 170 + (i % 3) * 30 + 40 * s, y + 2 * s); g.stroke();
    }
    // fibres standing up like grass
    for (let i = 0; i < 70; i++) {
      const x = v.rand(i) * W, y = 70 + Math.pow(v.rand(i + 99), 0.8) * 110, h = 1 + (y - 70) / 26;
      g.strokeStyle = i % 3 ? 'rgba(170,150,110,0.45)' : 'rgba(255,255,255,0.9)'; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + h * 0.6, y - h, x + h, y - h * 1.6); g.stroke();
    }
    // the saucer far ahead, with its tissue-paper light cone
    const sx = 168 + Math.sin(t * 1.6) * 6, sy = 22 + Math.sin(t * 2.2) * 2;
    g.fillStyle = 'rgba(255,240,170,0.35)';
    g.beginPath(); g.moveTo(sx - 6, sy + 4); g.lineTo(sx + 6, sy + 4); g.lineTo(sx + 22, 70); g.lineTo(sx - 22, 70); g.closePath(); g.fill();
    g.fillStyle = '#c8d6e0'; g.beginPath(); g.ellipse(sx, sy - 3, 7, 5, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#8a95a3'; g.beginPath(); g.ellipse(sx, sy, 18, 4.5, 0, 0, TAU); g.fill();
    g.strokeStyle = '#2b2130'; g.lineWidth = 1; g.stroke();
    for (let i = 0; i < 5; i++) { g.fillStyle = (Math.floor(t * 6) + i) % 2 ? '#ffe14a' : '#ff6a8a'; g.beginPath(); g.arc(sx - 12 + i * 6, sy + 1, 1.2, 0, TAU); g.fill(); }
    // the aliens: a row of green Grunts (one eye, three legs) on white cut edges
    const grunt = (x, y, s, pop, crumple) => {
      if (crumple >= 1) {
        // a paper ball lying where it fell
        g.fillStyle = '#c9e6b4'; g.beginPath(); g.arc(x, y - 3 * s, 3.2 * s, 0, TAU); g.fill();
        g.strokeStyle = '#2b2130'; g.lineWidth = 0.8; g.stroke();
        g.beginPath(); g.moveTo(x - 2 * s, y - 4 * s); g.lineTo(x + 1 * s, y - 2 * s); g.lineTo(x + 2 * s, y - 5 * s); g.stroke();
        return;
      }
      const sq = 1 - crumple * 0.7;
      g.save(); g.translate(x, y); g.scale(s * sq, s * pop * sq); g.rotate(crumple * 1.5);
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, -9, 8, 9.5, 0, 0, TAU); g.fill();
      g.fillStyle = '#7fd35a'; g.beginPath(); g.ellipse(0, -9, 6.6, 8, 0, 0, TAU); g.fill();
      g.strokeStyle = '#2b2130'; g.lineWidth = 1.1; g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -11, 3, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#2b2130'; g.beginPath(); g.arc(0.6, -10.6, 1.4, 0, TAU); g.fill();
      g.strokeStyle = '#3e8f2e'; g.lineWidth = 1.2;
      for (const lx of [-3, 0, 3]) { g.beginPath(); g.moveTo(lx, -1.5); g.lineTo(lx, 0.5); g.stroke(); }
      g.restore();
    };
    const row = [[112, 106], [146, 102], [180, 104], [214, 108]];
    const hits = [1.1, 1.45, 1.8, 2.15];
    row.forEach(([x, y], i) => {
      const pop = v.ease.back(v.seg(t, 0.15 + i * 0.12, 0.5 + i * 0.12));
      const cr = v.seg(t, hits[i], hits[i] + 0.25);
      if (pop > 0) grunt(x, y, 1.15, pop, cr >= 1 ? 1 : cr);
    });
    // the clump the grenade finds
    const clump = [[150, 82], [162, 80], [174, 83], [156, 86], [168, 87]];
    const boom = 3.05;
    clump.forEach(([x, y], i) => { const pop = v.ease.back(v.seg(t, 0.3 + i * 0.08, 0.7 + i * 0.08)); if (pop > 0 && t < boom) grunt(x, y, 0.7, pop, 0); });
    // the heroes, low in front, aiming up the page
    const hy = 168, recoil = k => Math.max(0, 1 - ((t * 5 + k) % 1) * 4) * 1.5;
    v.shadow(120, hy, 22); v.shadow(200, hy, 22);
    v.hero(0, 120, hy + recoil(0) * 0.3, { s: 1.15, face: 1 });
    v.hero(1, 200, hy + recoil(0.5) * 0.3, { s: 1.15, face: -1 });
    // ray guns: little card guns held forward with a bulb
    for (const [x, col, k] of [[134, '#ffe14a', 0], [186, '#5cff7a', 0.5]]) {
      g.fillStyle = '#e7e2d6'; g.fillRect(x - 3, hy - 22, 6, 7); g.strokeStyle = '#2b2130'; g.lineWidth = 1; g.strokeRect(x - 3, hy - 22, 6, 7);
      g.fillStyle = col; g.beginPath(); g.arc(x, hy - 24, 2.4 + recoil(k) * 0.6, 0, TAU); g.fill(); g.stroke();
    }
    // bolts: from each gun to the next Grunt, while the row stands
    const tgt = row.findIndex((_, i) => t < hits[i]);
    if (tgt >= 0 && t > 0.6) {
      const [tx, ty] = row[tgt];
      for (const [x, col, off] of [[134, '#ffe14a', 0], [186, '#5cff7a', 0.1]]) {
        const k = ((t + off) * 5) % 1, bx = v.lerp(x, tx, k), by = v.lerp(hy - 24, ty - 10, k);
        g.strokeStyle = col; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (tx - x) * 0.08, by + (ty - 10 - hy + 24) * 0.08); g.stroke();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(bx, by, 1.2, 0, TAU); g.fill();
      }
    }
    // the grenade: thrown by Pip at 2.45, arcs into the clump, bursts into confetti and a ring
    const gk = v.seg(t, 2.45, boom);
    if (gk > 0 && gk < 1) {
      const gx = v.lerp(130, 162, gk), gy = v.lerp(hy - 26, 84, gk) + v.hop(gk, 30);
      g.fillStyle = '#b18aff'; v.star(gx, gy, 4, '#b18aff'); v.sparkle(gx - 3, gy + 3, t * 3);
    }
    if (t >= boom) {
      const bk = v.seg(t, boom, boom + 0.9);
      g.strokeStyle = 'rgba(177,138,255,' + (1 - bk) + ')'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(162, 84, 10 + bk * 30, 4 + bk * 12, 0, 0, TAU); g.stroke();
      v.confetti(162, 80, bk);
      if (bk < 0.5) v.label('POP!', 162, 66 - bk * 8, 14, '#ffe14a');
    }
  },
});
