/* Pip & Bo - Level previews for World 16 Sugar Rush Factory (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw16. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 16-1 Conveyor Belt Chaos preview -----
  // Pip slows the belt from the catwalk lever, Bo hops up, grabs the lollipop and tosses it into the right bin.
  // belt travel (px) at time t: fast (60 px/s) until Pip slows it at 1.0 s, then slow (20 px/s); 160 px a loop,
  // a whole number of chevrons, so the belt loops without a jump
  const pw16cBeltD = t => (t < 1 ? 60 * t : 60 + 20 * (t - 1));
  const pw16cLolly = (v, x, y, s = 1) => {
    const ctx = v.ctx;
    v.line(x, y + 4 * s, x, y + 13 * s, '#f4efe6', 2.2 * s);
    v.fillCircle(x, y, 6.5 * s, '#ff5c9a');
    ctx.strokeStyle = '#fff3f8'; ctx.lineWidth = 1.6 * s; ctx.beginPath();
    for (let a = 0; a < 9; a += 0.4) { const r = a * 0.62 * s; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.stroke();
  };
  const pw16cGum = (v, x, y, s = 1) => {
    const ctx = v.ctx;
    ctx.fillStyle = '#3fcf6f'; ctx.beginPath(); ctx.moveTo(x - 7 * s, y + 6 * s);
    ctx.quadraticCurveTo(x - 7 * s, y - 8 * s, x, y - 8 * s); ctx.quadraticCurveTo(x + 7 * s, y - 8 * s, x + 7 * s, y + 6 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#dfffe8'; for (const [dx, dy] of [[-3, -2], [2, -4], [3, 1], [-1, 3]]) { v.circle(x + dx * s, y + dy * s, 0.9 * s); ctx.fill(); }
  };
  const pw16cBin = (v, x, y, col, dark, kind, n) => {
    const ctx = v.ctx;
    ctx.fillStyle = dark; v.rr(x - 17, y - 34, 34, 7, 3); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 15, y - 28); ctx.lineTo(x + 15, y - 28); ctx.lineTo(x + 12, y); ctx.lineTo(x - 12, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; v.rr(x - 9, y - 24, 18, 17, 4); ctx.fill();
    if (kind === 'lolly') pw16cLolly(v, x, y - 18, 0.62); else pw16cGum(v, x, y - 15, 0.7);
    if (n != null) v.pill(n, x + 14, y - 38, { size: 8, bg: '#ffffff', col: dark });
  };
  definePreview('Conveyor Belt Chaos', {
    blurb: 'One works the belt levers, one sorts the candy into the right bins!',
    loop: 6,
    still: 2.25,
    draw(v, t) {
      const ctx = v.ctx, W = v.W, H = v.H;
      // the factory wall: candy stripes and a round window
      ctx.fillStyle = '#ffe3ef'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffd0e3'; for (let x = 0; x < W; x += 28) ctx.fillRect(x, 0, 14, H);
      v.fillCircle(216, 98, 19, '#f08cb4'); v.fillCircle(216, 98, 15, '#ffeef6');
      v.fillCircle(210, 104, 3, '#ff5c9a'); v.fillCircle(222, 102, 3, '#7fc8ff');
      // the floor
      ctx.fillStyle = '#a8724e'; ctx.fillRect(0, 162, W, H - 162);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 160, W, 3);
      ctx.fillStyle = '#ff7aa8'; for (let x = 0; x < W; x += 16) ctx.fillRect(x, 160, 8, 3);
      // the catwalk with its railing
      ctx.fillStyle = '#3fae9a'; ctx.fillRect(0, 48, W, 9);
      ctx.fillStyle = '#7fe0c8'; ctx.fillRect(0, 48, W, 2);
      ctx.strokeStyle = '#3fae9a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(W, 30);
      for (let x = 6; x < W; x += 18) { ctx.moveTo(x, 30); ctx.lineTo(x, 48); }
      ctx.stroke();
      // the chute
      ctx.fillStyle = '#ff9cc4'; ctx.fillRect(78, 57, 12, 10);
      ctx.fillStyle = '#e0568e'; ctx.beginPath(); ctx.moveTo(73, 66); ctx.lineTo(95, 66); ctx.lineTo(90, 74); ctx.lineTo(78, 74); ctx.closePath(); ctx.fill();
      // the bins
      pw16cBin(v, 28, 160, '#4fd07f', '#238a4c', 'gum', '0/3');
      pw16cBin(v, 292, 160, '#ff7aaa', '#c23a72', 'lolly', t >= 3.9 ? '2/3' : '1/3');
      // the belt
      const D = pw16cBeltD(t), x0 = 64, x1 = 252, by = 112;
      ctx.fillStyle = '#4a3d5c'; v.rr(x0 - 3, by + 2, x1 - x0 + 6, 11, 5); ctx.fill();
      ctx.fillStyle = '#2c2438'; ctx.fillRect(x0, by, x1 - x0, 5);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, by - 1, x1 - x0, 7); ctx.clip();
      ctx.fillStyle = '#5ee0b0';
      for (let x = x0 - 16 + (D % 16); x < x1 + 16; x += 16) { ctx.beginPath(); ctx.moveTo(x + 4, by + 2.5); ctx.lineTo(x, by); ctx.lineTo(x, by + 5); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#9aa0b4'; for (let x = x0 + 6; x < x1; x += 14) { v.circle(x, by + 8, 2.6); ctx.fill(); }
      ctx.fillStyle = '#5ee0b0'; ctx.fillRect(x0, by + 12, x1 - x0, 2);
      // Pip at the lever (fast at 0, slow from 1.0; back to fast at the end of the loop)
      const toSlow = v.seg(t, 0.75, 1.0), toFast = v.seg(t, 5.7, 6.0);
      const lever = 0.6 - 1.2 * v.ease.inOut(toSlow) + 1.2 * v.ease.inOut(toFast);
      const sx = 168;
      ctx.fillStyle = '#2b9a73'; v.rr(sx - 11, 28, 22, 20, 4); ctx.fill();
      ctx.fillStyle = '#2a2140'; v.rr(sx - 8, 31, 16, 8, 2); ctx.fill();
      const slow = t >= 1.0 && t < 5.85;
      ctx.fillStyle = slow ? '#ffe680' : '#9fffd0';
      for (let k = 0; k < (slow ? 1 : 2); k++) { const ax = sx - (slow ? 0 : 3) + k * 6; ctx.beginPath(); ctx.moveTo(ax + 3, 35); ctx.lineTo(ax - 1.5, 32.5); ctx.lineTo(ax - 1.5, 37.5); ctx.closePath(); ctx.fill(); }
      ctx.save(); ctx.translate(sx, 45); ctx.rotate(lever);
      v.line(0, 0, 0, -13, '#5a4a6a', 2.5); v.fillCircle(0, -14, 3.4, '#ff5c8a');
      ctx.restore();
      v.line(sx, 57, sx, by - 2, 'rgba(63,174,154,0.55)', 1.2);
      const pulling = (t > 0.6 && t < 1.15) || t > 5.55;
      v.hero(0, sx - 24, 48, { face: 1, mood: pulling ? 'grit' : 'happy', sq: pulling ? 0.08 * Math.sin(t * 30) : 0 });
      // the lollipop: rides the belt, then Bo grabs it at 2.2 s and tosses it at 3.3 s
      const grabT = 2.2, tossT = 3.3, landT = 3.9;
      // Bo: walk under it, hop, carry it right, toss, walk back
      let bx, face = 1, hop = 0;
      if (t < 1.6) bx = v.lerp(140, 175, v.ease.inOut(v.seg(t, 0.2, 1.6)));
      else if (t < 2.5) bx = 175;
      else if (t < 4.3) bx = v.lerp(175, 236, v.ease.inOut(v.seg(t, 2.5, 3.2)));
      else { bx = v.lerp(236, 140, v.ease.inOut(v.seg(t, 4.3, 5.6))); face = t < 5.6 ? -1 : 1; }
      hop = v.hop(v.seg(t, 1.95, 2.45), 30);
      const bfy = 160 + hop;
      if (t < grabT) pw16cLolly(v, 91 + pw16cBeltD(t), by - 7);
      else if (t < tossT) pw16cLolly(v, bx, bfy - 31);
      else if (t < landT) {
        const k = v.seg(t, tossT, landT);
        pw16cLolly(v, v.lerp(236, 292, k), v.lerp(129, 116, k) + v.hop(k, 34), 1 - 0.3 * k);
      }
      // the next candy: a gumdrop drops from the chute and is on the belt when the loop starts again
      if (t > 5.3) {
        const k = v.seg(t, 5.3, 5.65);
        const gx = t < 5.65 ? 84 : 84 + 20 * (t - 5.65);
        pw16cGum(v, gx, v.lerp(76, by - 7, v.ease.in(k)));
      }
      v.hero(1, bx, bfy, { face, mood: t > 3.85 && t < 4.6 ? 'joy' : t > 1.9 && t < 2.5 ? 'wow' : 'happy', sq: hop < -2 ? -0.12 : 0 });
      if (t >= 3.15 && t < 3.45) v.sparkle(bx + 9, bfy - 28, v.seg(t, 3.15, 3.45), '#ffffff', 6);
      // words
      const pop = (s, x, y, a, b, col) => { if (t < a || t > b) return; const k = v.seg(t, a, b); ctx.save(); ctx.globalAlpha = 1 - k * k; v.label(s, x, y - k * 10, 13, col); ctx.restore(); };
      pop('Slow', 158, 96, 0.95, 1.8, '#9fffd0');
      pop('FAST!', 150, 96, 5.8, 6.0, '#9fffd0');
      if (t < 0.5) { ctx.save(); ctx.globalAlpha = 1 - t * 2; v.label('FAST!', 150, 94 - t * 6, 13, '#9fffd0'); ctx.restore(); }
      pop('Yum!', 292, 104, landT, 4.7, '#ffe680');
      if (t > landT && t < 4.5) { v.confetti(292, 124, v.seg(t, landT, 4.5)); }
      // the order board
      v.pill('ORDER', 128, 12, { size: 8, bg: 'rgba(255,255,255,0.92)', col: '#c23a72' });
      pw16cLolly(v, 162, 10, 0.55);
      v.text(t >= 3.9 ? '2/3' : '1/3', 170, 12, 9, '#5a2a44', 'left');
      pw16cGum(v, 199, 12, 0.55);
      v.text('0/3', 207, 12, 9, '#5a2a44', 'left');
    },
  });
  // ----- END 16-1 Conveyor Belt Chaos preview -----
  //
  // ----- BEGIN 16-2 Gumball Machine Puzzle preview -----
  // Pip turns the crank: a red striped gumball rolls left into the red cup. Then a blue dotted one: Bo hops to the
  // heart lever and flips the flap, so it rolls right into the blue cup. Bo flips it back, the cups go "yum" and it loops.
  const pw16gCol = { red: ['#ff3d5e', '#b31a37'], blue: ['#3f86f5', '#1f4fb0'], yellow: ['#ffd23f', '#c29210'], green: ['#3fcf86', '#1a8a50'] };
  // a gumball with its pattern (stripes, dots), spinning with rot
  const pw16gBall = (v, x, y, r, col, rot) => {
    const ctx = v.ctx, c = pw16gCol[col];
    v.fillCircle(x, y, r, c[0]);
    ctx.save(); v.circle(x, y, r); ctx.clip(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.fillStyle = '#fff';
    if (col === 'red') for (let k = -2; k <= 2; k++) ctx.fillRect(k * r * 0.8 - r * 0.16, -r, r * 0.32, r * 2);
    else if (col === 'blue') for (const [a, b] of [[-0.4, -0.4], [0.45, -0.2], [-0.1, 0.45], [0.5, 0.55], [-0.6, 0.2]]) { v.circle(a * r, b * r, r * 0.18); ctx.fill(); }
    else if (col === 'yellow') v.star(0, 0, r * 0.6, '#fff');
    else { ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.22; ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, 4.5); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = c[1]; ctx.lineWidth = 1; v.circle(x, y, r); ctx.stroke();
    v.fillCircle(x - r * 0.35, y - r * 0.4, r * 0.25, 'rgba(255,255,255,0.75)');
  };
  // a candy rail from (x1, y1) to (x2, y2)
  const pw16gRail = (v, x1, y1, x2, y2) => { v.line(x1, y1, x2, y2, '#c2477f', 5); v.line(x1, y1, x2, y2, '#ffd1e6', 2.5); };
  // a cup with a colour badge and the gumballs already in it
  const pw16gCup = (v, x, col, n, fade) => {
    const ctx = v.ctx, c = pw16gCol[col];
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; v.rr(x - 17, 128, 34, 24, 5); ctx.fill();
    ctx.strokeStyle = '#b07a9a'; ctx.lineWidth = 1.5; v.rr(x - 17, 128, 34, 24, 5); ctx.stroke();
    ctx.fillStyle = c[0]; v.rr(x - 19, 125, 38, 5, 2.5); ctx.fill();
    ctx.save(); ctx.globalAlpha *= fade;
    for (let k = 0; k < n; k++) pw16gBall(v, x - 7 + k * 14, 145, 5, col, k);
    ctx.restore();
    pw16gBall(v, x, 136, 4, col, 0);
  };
  // the heart lever on Bo's ledge (tilt 0 left .. 1 right)
  const pw16gLever = (v, x, y, tilt, hot) => {
    const ctx = v.ctx, a = -0.6 + tilt * 1.2;
    ctx.fillStyle = '#5a2c48'; v.rr(x - 6, y - 4, 12, 4, 2); ctx.fill();
    v.line(x, y - 3, x + Math.sin(a) * 13, y - 3 - Math.cos(a) * 13, '#ff4f7a', 2.5);
    v.fillCircle(x + Math.sin(a) * 13, y - 3 - Math.cos(a) * 13, 3, hot ? '#ffd23f' : '#ff4f7a');
    v.fillCircle(x, y - 26, 6, '#3a2140'); v.heart(x, y - 26, 3.4, '#fff');
  };
  definePreview('Gumball Machine Puzzle', {
    blurb: 'One cranks out gumballs, one flips levers so each colour rolls into its cup.',
    loop: 5.2,
    still: 3.0,
    draw(v, t) {
      const ctx = v.ctx;
      // candy-stripe wall and a wafer floor
      ctx.fillStyle = '#ffe1ef'; ctx.fillRect(0, 0, v.W, v.H);
      ctx.fillStyle = '#ffd0e6'; for (let x = 0; x < v.W; x += 20) ctx.fillRect(x, 0, 10, v.H);
      ctx.fillStyle = '#f6c58f'; ctx.fillRect(0, 160, v.W, 20); ctx.fillStyle = '#9a5b34'; ctx.fillRect(0, 170, v.W, 10);
      for (let x = 4; x < v.W; x += 14) v.fillCircle(x, 164, 1.3, ['#ff6fa8', '#5fc8ff', '#ffd23f'][(x / 14 | 0) % 3]);
      // Bo's wafer ledge on the left (and one on the right, for looks)
      for (const [x0, x1] of [[0, 62], [258, 320]]) { ctx.fillStyle = '#e8a860'; ctx.fillRect(x0, 108, x1 - x0, 6); ctx.fillStyle = '#c47f3c'; for (let x = x0 + 3; x < x1; x += 7) ctx.fillRect(x, 108, 1.5, 6); }
      // the machine: globe on a red body, a white board with the rails
      ctx.fillStyle = '#e8384f'; v.rr(70, 44, 180, 112, 12); ctx.fill();
      ctx.fillStyle = '#fff4f8'; v.rr(82, 70, 156, 54, 6); ctx.fill();
      for (let k = 0; k < 7; k++) v.fillCircle(76, 54 + k * 14, 1.6, '#ffe58a'), v.fillCircle(244, 54 + k * 14, 1.6, '#ffe58a');
      ctx.fillStyle = 'rgba(220,240,255,0.55)'; v.circle(160, 30, 24); ctx.fill();
      const inGlobe = ['red', 'blue', 'yellow', 'green', 'blue', 'red', 'green', 'yellow', 'red', 'blue', 'yellow'];
      inGlobe.forEach((c, k) => pw16gBall(v, 145 + (k % 6) * 6 + (k > 5 ? 3 : 0), 46 - (k > 5 ? 8 : 0) - v.rand(k) * 3, 4, c, k));
      ctx.strokeStyle = '#c86e93'; ctx.lineWidth = 1.5; v.circle(160, 30, 24); ctx.stroke();
      v.fillCircle(152, 22, 5, 'rgba(255,255,255,0.7)');
      ctx.fillStyle = '#e8384f'; v.rr(152, 4, 16, 5, 2); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(153, 64); ctx.lineTo(167, 64); ctx.lineTo(160, 71); ctx.closePath(); ctx.fill();
      // the story times
      const c1 = v.seg(t, 0.2, 0.6), fall1 = v.seg(t, 0.6, 0.9), roll1 = v.seg(t, 0.9, 1.5), cup1 = v.seg(t, 1.5, 1.75);
      const c2 = v.seg(t, 1.9, 2.3), flip1 = t >= 2.15, fall2 = v.seg(t, 2.3, 2.6), roll2 = v.seg(t, 2.6, 3.2), cup2 = v.seg(t, 3.2, 3.45);
      const flip2 = t >= 4.0;
      const gate = v.ease.out(v.seg(t, 2.15, 2.35)) * (1 - v.ease.out(v.seg(t, 4.0, 4.2)));
      // rails and the flap gate (heart)
      pw16gRail(v, 160, 92, 112, 116); pw16gRail(v, 160, 92, 208, 116);
      for (let k = 0; k < 3; k++) v.fillCircle(148 + k * 12, 80, 1.8, ['#ff8fb8', '#8fc3ff', '#ffe27a'][k]);
      const ga = Math.PI * 0.5 + (gate - 0.5) * 1.5;
      v.line(160, 92, 160 + Math.cos(ga) * 15, 92 + Math.sin(ga) * 15, '#7a3056', 4);
      v.fillCircle(160, 92, 6, '#3a2140'); v.heart(160, 92, 3.4, '#fff');
      // gumballs: red goes left, blue goes right (Bo flipped the gate)
      const ballAt = (fall, roll, cup, dir) => {
        if (fall <= 0) return null;
        if (fall < 1) return [160, 68 + 18 * v.ease.in(fall)];
        if (roll < 1) return [160 + dir * 48 * v.ease.in(roll), 86 + 24 * v.ease.in(roll)];
        return [160 + dir * 50 + dir * 2 * cup, 110 + 32 * v.ease.in(cup)];
      };
      const fade = 1 - v.seg(t, 4.5, 5.0);
      pw16gCup(v, 110, 'red', t >= 1.75 ? 2 : 1, t >= 1.75 ? fade : 1);
      pw16gCup(v, 210, 'blue', t >= 3.45 ? 2 : 1, t >= 3.45 ? fade : 1);
      const b1 = cup1 < 1 && ballAt(fall1, roll1, cup1, -1), b2 = cup2 < 1 && ballAt(fall2, roll2, cup2, 1);
      if (b1) pw16gBall(v, b1[0], b1[1], 5, 'red', -t * 8);
      if (b2) pw16gBall(v, b2[0], b2[1], 5, 'blue', t * 8);
      // the next gumball in the window under the globe
      ctx.fillStyle = '#3a2140'; v.rr(128, 54, 28, 10, 5); ctx.fill();
      pw16gBall(v, 136, 59, 3.6, t < 0.5 || t > 4.9 ? 'red' : t < 2.1 ? 'blue' : 'yellow', 0);
      pw16gBall(v, 147, 59, 3.6, t < 0.5 || t > 4.9 ? 'blue' : t < 2.1 ? 'yellow' : 'green', 0);
      if (cup1 > 0 && cup1 < 1) v.label('Yum!', 110, 118 - 10 * cup1, 11, '#ffd1dc');
      if (cup2 > 0 && cup2 < 1) v.label('Yum!', 210, 118 - 10 * cup2, 11, '#cfe2ff');
      v.sparkle(110, 132, v.seg(t, 1.6, 2.1), '#fff'); v.sparkle(210, 132, v.seg(t, 3.3, 3.8), '#fff');
      // the crank, turned by Pip
      const turn = (v.ease.inOut(c1) + v.ease.inOut(c2)) * Math.PI * 2;
      v.fillCircle(194, 52, 6, '#c9ced8');
      v.line(194, 52, 194 + Math.cos(turn - 1.2) * 9, 52 + Math.sin(turn - 1.2) * 9, '#7a7f8c', 3);
      v.fillCircle(194 + Math.cos(turn - 1.2) * 9, 52 + Math.sin(turn - 1.2) * 9, 3, '#ff7a3d');
      ctx.fillStyle = '#f6c58f'; v.rr(202, 62, 26, 4, 2); ctx.fill();
      const crankSq = Math.max(Math.sin(c1 * Math.PI), Math.sin(c2 * Math.PI)) * 0.15;
      v.hero(0, 215, 62, { s: 0.62, face: -1, sq: crankSq, mood: cup1 > 0 && t < 2.2 || cup2 > 0 && t < 3.9 ? 'joy' : 'happy' });
      // Bo: hop to the heart lever, flip, wait, flip back, hop home
      const go1 = v.ease.inOut(v.seg(t, 1.75, 2.1)), back = v.ease.inOut(v.seg(t, 4.2, 4.7));
      const bx = v.lerp(v.lerp(18, 34, go1), 18, back);
      const by = 108 + v.hop(v.seg(t, 1.75, 2.1), 9) + v.hop(v.seg(t, 4.2, 4.7), 9);
      const lt = gate;
      pw16gLever(v, 44, 108, lt, (t > 2.1 && t < 2.5) || (t > 3.95 && t < 4.3));
      v.hero(1, bx, by, { s: 0.62, face: back > 0 && back < 1 ? -1 : 1, sq: (flip1 && t < 2.3) || (flip2 && t < 4.15) ? -0.15 : 0, mood: t > 3.2 && t < 4 ? 'joy' : 'happy' });
      if (t > 2.15 && t < 2.9) v.bubble('Flip!', 34, 84, { size: 9 });
    },
  });
  // ----- END 16-2 Gumball Machine Puzzle preview -----
  //
  // ----- BEGIN 16-3 Chocolate River Raft preview -----
  // PLACEHOLDER
  // ----- END 16-3 Chocolate River Raft preview -----
  //
  // ----- BEGIN 16-4 Sprinkle Catch preview -----
  // PLACEHOLDER
  // ----- END 16-4 Sprinkle Catch preview -----
  //
}
