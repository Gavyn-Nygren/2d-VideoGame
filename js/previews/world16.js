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
  // Pip paddles the cookie raft down the chocolate river; Bo hooks a sweet, shoves a wafer log away, hooks a gummy
  // bear, and they dock at the pier with a cheer.
  const pw16rRX = 112, pw16rRY = 104;
  // where a floating thing is on screen: it reaches x = at when t = tAt, drifting left at sp px/s
  const pw16rX = (t, at, tAt, sp) => at + (tAt - t) * sp;
  const pw16rBanks = (v, t) => {
    const ctx = v.ctx, sc = Math.min(t, 5) * 80;
    ctx.fillStyle = '#ffe0ef'; ctx.fillRect(0, 0, v.W, v.H);
    // chocolate
    ctx.fillStyle = '#713e22'; ctx.fillRect(0, 42, v.W, 116);
    ctx.fillStyle = 'rgba(255,220,190,0.08)'; ctx.fillRect(0, 70, v.W, 22);
    ctx.fillStyle = 'rgba(60,26,10,0.22)'; ctx.fillRect(0, 42, v.W, 10); ctx.fillRect(0, 148, v.W, 10);
    // ripples drifting with the current
    ctx.lineCap = 'round';
    for (let k = 0; k < 14; k++) {
      const x = ((v.rand(k) * 360 - t * 60 - sc * 0) % 360 + 360) % 360 - 20, y = 56 + v.rand(k + 30) * 92;
      ctx.strokeStyle = 'rgba(255,214,180,0.3)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.quadraticCurveTo(x, y - 2, x + 7, y); ctx.stroke();
    }
    // wafer edges with a cream frill
    for (const [y, s] of [[42, -1], [158, 1]]) {
      ctx.fillStyle = '#c98a45'; ctx.fillRect(0, y + (s < 0 ? -7 : 0), v.W, 7);
      ctx.fillStyle = '#e8b06a'; ctx.fillRect(0, y + (s < 0 ? -6 : 1), v.W, 5);
      ctx.strokeStyle = 'rgba(150,96,40,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -((sc) % 8); x < v.W; x += 8) { ctx.moveTo(x, y + (s < 0 ? -7 : 0)); ctx.lineTo(x, y + (s < 0 ? 0 : 7)); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,248,236,0.95)'; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let x = 0; x <= v.W; x += 4) ctx.lineTo(x, y - s * 1.5 + Math.sin((x + sc) / 7) * 1);
      ctx.stroke();
    }
    // candy trees on both banks
    const cols = ['#ff5fa2', '#58c6ff', '#ffd23d', '#8be37a', '#c58cff'];
    for (let k = 0; k < 9; k++) for (const top of [true, false]) {
      const x = ((k * 70 + (top ? 20 : 55) - sc) % 630 + 630) % 630 - 30, y = top ? 30 : 176, col = cols[(k + (top ? 0 : 2)) % 5];
      if (x < -20 || x > v.W + 20) continue;
      if (k % 2) { v.line(x, y, x, y - 14, '#fff', 2); v.fillCircle(x, y - 18, 7, col); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y - 18, 3.5, 0, 4.5); ctx.stroke(); }
      else { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.quadraticCurveTo(x - 7, y - 13, x, y - 13); ctx.quadraticCurveTo(x + 7, y - 13, x + 7, y); ctx.closePath(); ctx.fill(); v.fillCircle(x - 2, y - 9, 1.6, 'rgba(255,255,255,0.7)'); }
    }
  };
  const pw16rPier = (v, x) => {
    const ctx = v.ctx;
    if (x > v.W + 60) return;
    ctx.fillStyle = '#b07a3e'; ctx.fillRect(x - 34, 28, 68, 30);
    ctx.fillStyle = '#d9a35c'; for (let k = 0; k < 4; k++) ctx.fillRect(x - 32 + k * 17, 30, 15, 26);
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x - 34, 56, 6, 10); ctx.fillRect(x + 28, 56, 6, 10);
    v.line(x + 28, 30, x + 28, 10, '#fff', 2); ctx.fillStyle = '#ff5fa2'; ctx.beginPath(); ctx.moveTo(x + 29, 10); ctx.lineTo(x + 42, 14); ctx.lineTo(x + 29, 18); ctx.closePath(); ctx.fill();
  };
  const pw16rWrap = (v, x, y, col, a) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-11, -5); ctx.lineTo(-11, 5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(11, -5); ctx.lineTo(11, 5); ctx.closePath(); ctx.fill();
    v.fillCircle(0, 0, 6, col); v.fillCircle(-2, -2, 2, 'rgba(255,255,255,0.75)');
    ctx.restore();
  };
  const pw16rGummy = (v, x, y, a) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = 'rgba(139,227,122,0.92)';
    v.circle(-4, -8, 3); ctx.fill(); v.circle(4, -8, 3); ctx.fill();
    v.circle(0, -4, 6); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, 4, 7, 7, 0, 0, Math.PI * 2); ctx.fill();
    v.fillCircle(-2, -5, 1, '#245a20'); v.fillCircle(2, -5, 1, '#245a20'); v.fillCircle(-3, 1, 2, 'rgba(255,255,255,0.5)');
    ctx.restore();
  };
  const pw16rLog = (v, x, y, a) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = '#c98a45'; v.rr(-22, -6, 44, 12, 4); ctx.fill();
    ctx.fillStyle = '#e8b06a'; v.rr(-20, -4, 40, 8, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(150,96,40,0.6)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = -16; k <= 16; k += 6) { ctx.moveTo(k, -4); ctx.lineTo(k, 4); }
    ctx.stroke();
    ctx.restore();
  };
  const pw16rRaft = (v, x, y, n) => {
    const ctx = v.ctx;
    ctx.fillStyle = 'rgba(40,16,4,0.3)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 5, 26, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d99a52'; ctx.beginPath(); ctx.ellipse(x, y, 26, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ecb46c'; ctx.beginPath(); ctx.ellipse(x, y - 1.5, 23, 9.5, 0, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 7; k++) v.fillCircle(x - 17 + v.rand(k + 5) * 34, y - 6 + v.rand(k + 15) * 10, 1.8, '#5a2c14');
    // the candy basket at the back
    ctx.fillStyle = '#ff8cc0'; v.rr(x - 6, y - 12, 12, 8, 2); ctx.fill();
    const cols = ['#58c6ff', '#8be37a', '#ffd23d', '#ff5fa2'];
    for (let k = 0; k < n; k++) v.fillCircle(x - 4 + (k % 3) * 4, y - 13 - Math.floor(k / 3) * 3, 2.2, cols[k % 4]);
  };
  definePreview('Chocolate River Raft', {
    blurb: 'One paddles the cookie raft, one hooks candy and shoves logs. Swap at each dock!',
    loop: 6,
    still: 1.15,
    draw(v, t) {
      const ctx = v.ctx, X = pw16rRX, docked = t >= 5;
      pw16rBanks(v, t);
      pw16rPier(v, Math.max(X, pw16rX(t, X, 5, 80)));
      const bob = Math.sin(t * 3) * 1.2, Y = pw16rRY + bob;
      // the hook: Bo's arm reaches the tip to where it's needed
      const rest = { x: X + 34, y: Y - 12 };
      const cand = { x: pw16rX(t, 166, 1.1, 60), y: 78 };
      const gum = { x: pw16rX(t, 170, 4.0, 55), y: 132 };
      const logX = t < 2.6 ? pw16rX(t, 172, 2.6, 110) : 172 - (t - 2.6) * 34, logY = t < 2.6 ? 112 : 112 + 30 * v.ease.out(v.seg(t, 2.6, 3.4));
      let tip = rest, got1 = t >= 1.1, got2 = t >= 4.0;
      const lerpP = (a, b, k) => ({ x: v.lerp(a.x, b.x, k), y: v.lerp(a.y, b.y, k) });
      if (t >= 0.6 && t < 1.1) tip = lerpP(rest, cand, v.ease.inOut(v.seg(t, 0.6, 1.1)));
      else if (t >= 1.1 && t < 1.5) tip = lerpP(cand, { x: X, y: Y - 12 }, v.ease.inOut(v.seg(t, 1.1, 1.5)));
      else if (t >= 1.5 && t < 2.2) tip = lerpP({ x: X, y: Y - 12 }, rest, v.seg(t, 1.5, 1.8));
      else if (t >= 2.2 && t < 2.75) { const at = { x: pw16rX(2.6, 172, 2.6, 110) - 18, y: 108 }; tip = lerpP(rest, at, v.ease.out(v.seg(t, 2.2, 2.55))); if (t > 2.55) tip = { x: at.x + 6 * Math.sin(v.seg(t, 2.55, 2.75) * Math.PI), y: at.y }; }
      else if (t >= 2.75 && t < 3.5) tip = lerpP({ x: 154, y: 108 }, rest, v.seg(t, 2.75, 3.1));
      else if (t >= 3.5 && t < 4.0) tip = lerpP(rest, gum, v.ease.inOut(v.seg(t, 3.5, 4.0)));
      else if (t >= 4.0 && t < 4.4) tip = lerpP(gum, { x: X, y: Y - 12 }, v.ease.inOut(v.seg(t, 4.0, 4.4)));
      else if (t >= 4.4) tip = lerpP({ x: X, y: Y - 12 }, rest, v.seg(t, 4.4, 4.7));
      // floating things
      if (!got1) pw16rWrap(v, cand.x, cand.y, '#58c6ff', Math.sin(t * 2) * 0.3);
      else if (t < 1.5) pw16rWrap(v, tip.x, tip.y, '#58c6ff', 0);
      if (!got2) pw16rGummy(v, gum.x, gum.y, Math.sin(t * 1.7) * 0.2);
      else if (t < 4.4) pw16rGummy(v, tip.x, tip.y, 0);
      if (logX < v.W + 30) pw16rLog(v, logX, logY, t < 2.6 ? 0.15 : 0.15 - 0.5 * v.ease.out(v.seg(t, 2.6, 3.4)));
      if (t > 2.55 && t < 3.0) v.puff(logX - 10, logY, v.seg(t, 2.55, 3.0));
      // the raft and crew
      pw16rRaft(v, X, Y, (t >= 1.5 ? 1 : 0) + (t >= 4.4 ? 3 : 0));
      const joy = docked ? v.hop(v.phase(t - 5, 0.5), 7) : 0;
      // Pip's paddle, sweeping strokes (still once docked)
      const ph = docked ? 0.2 : v.phase(t, 0.6), sw = Math.sin(ph * Math.PI * 2);
      const px = X - 12, py = Y - 10 + joy;
      ctx.strokeStyle = '#9a6a2e'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      const bx = px - 14 - sw * 8, by = Y + 12;
      ctx.beginPath(); ctx.moveTo(px + 4, py - 8); ctx.lineTo(bx, by); ctx.stroke();
      ctx.fillStyle = '#e8b06a'; ctx.beginPath(); ctx.ellipse(bx, by, 3, 6, 0.4, 0, Math.PI * 2); ctx.fill();
      if (!docked && ph > 0.25 && ph < 0.6) v.fillCircle(bx - 6, by + 2, 2, 'rgba(255,230,200,0.5)');
      v.hero(0, px, Y + 2 + joy, { s: 0.68, face: 1, mood: docked ? 'joy' : 'grit', shadow: false });
      // Bo and the candy-cane hook
      const hx = X + 12, hy = Y - 12 + joy;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      ctx.strokeStyle = '#ff5fa2'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tip.x, tip.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#ff5fa2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tip.x + 3, tip.y - 1, 3.5, Math.PI, Math.PI * 2.2); ctx.stroke();
      v.hero(1, hx, Y + 2 + joy, { s: 0.68, face: 1, mood: docked ? 'joy' : (t > 0.9 && t < 1.4) || (t > 3.8 && t < 4.3) ? 'wow' : 'happy', shadow: false });
      // pops
      if (t > 1.1 && t < 1.9) v.label('+1', X + 30, 64 - v.seg(t, 1.1, 1.9) * 12, 14, '#ffd23d');
      if (t > 2.6 && t < 3.3) v.label('shove!', 186, 96 - v.seg(t, 2.6, 3.3) * 8, 13, '#fff');
      if (t > 4.0 && t < 4.8) v.label('+3', X + 34, 120 - v.seg(t, 4.0, 4.8) * 12, 14, '#8be37a');
      if (docked) {
        const k = v.seg(t, 5, 6);
        v.confetti(X, 60, k); v.sparkle(X - 30, 70, k); v.sparkle(X + 34, 66, v.seg(t, 5.2, 6));
        v.heart(X, Y - 46 - k * 10, 6, '#ff5fa2');
        v.pill('swap jobs!', X + 70, 82, { size: 12, align: 'center' });
      }
      v.pill('candy ' + ((t >= 1.5 ? 1 : 0) + (t >= 4.4 ? 3 : 0)), v.W - 10, 10, { size: 12, align: 'right' });
    },
  });
  // ----- END 16-3 Chocolate River Raft preview -----
  //
  // ----- BEGIN 16-4 Sprinkle Catch preview -----
  // Pip and Bo catch candy from the sprinkle shaker in baskets on their heads; a gobstopper bonks Bo, the spilled candy
  // goes to Pip, and Pip catches the golden candy to win
  const pw16sGY = 150, pw16sS = 1.15, pw16sHead = 24 * 1.15;
  const pw16sGum = ['#ff6f9f', '#7fdc7a', '#ffb347', '#a98bff'];
  function pw16sCandy(v, kind, x, y, s = 1, t = 0) {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (kind === 'mint') {
      ctx.fillStyle = '#ffe6ea'; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-11, -4); ctx.lineTo(-11, 4); ctx.fill(); ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(11, -4); ctx.lineTo(11, 4); ctx.fill();
      v.fillCircle(0, 0, 6.5, '#ffffff'); ctx.fillStyle = '#ff4d63';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 6, i * Math.PI / 3 + t, i * Math.PI / 3 + 0.5 + t); ctx.closePath(); ctx.fill(); }
    } else if (kind === 'gold') {
      v.fillCircle(0, 0, 12, 'rgba(255,214,90,' + (0.25 + 0.15 * Math.sin(t * 9)) + ')');
      ctx.fillStyle = '#ffcf3d'; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-11, -5); ctx.lineTo(-11, 5); ctx.fill(); ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(11, -5); ctx.lineTo(11, 5); ctx.fill();
      ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c08a10'; ctx.lineWidth = 1.2; ctx.stroke();
      v.star(0, 0, 3.5, '#fff7d0');
    } else {
      ctx.fillStyle = pw16sGum[(kind | 0) % 4]; ctx.beginPath(); ctx.moveTo(-6.5, 4.5); ctx.quadraticCurveTo(-6.5, -7, 0, -6.5); ctx.quadraticCurveTo(6.5, -7, 6.5, 4.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; v.circle(-2.5, -1.5, 0.9); ctx.fill(); v.circle(2, -3, 0.9); ctx.fill(); v.circle(1, 1.5, 0.9); ctx.fill();
    }
    ctx.restore();
  }
  // a woven basket on a head (feet at x, y), with n candies peeking out
  function pw16sBasket(v, x, y, n, gold, tilt = 0) {
    const ctx = v.ctx, top = y - pw16sHead;
    ctx.save(); ctx.translate(x, top + 1); ctx.rotate(tilt);
    for (let i = 0; i < Math.min(n, 5); i++) pw16sCandy(v, i === 4 && gold ? 'gold' : i % 2 ? 'mint' : i, ((i * 37) % 5 - 2) * 3.4, -11 - i * 1.4, 0.55);
    ctx.fillStyle = '#d9a05b'; ctx.beginPath(); ctx.moveTo(-13, -10); ctx.lineTo(13, -10); ctx.lineTo(9, 0); ctx.lineTo(-9, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,70,30,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = -9; i <= 9; i += 4.5) { ctx.moveTo(i, -9); ctx.lineTo(i * 0.75, -1); } ctx.moveTo(-11, -5); ctx.lineTo(11, -5); ctx.stroke();
    ctx.fillStyle = '#f2c88a'; v.rr(-15, -12.5, 30, 4, 2); ctx.fill();
    ctx.restore();
  }
  function pw16sShaker(v, x, shake) {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, 14); ctx.rotate(shake ? Math.sin(shake * 60) * 0.2 : 0);
    ctx.fillStyle = 'rgba(255,240,248,0.95)'; v.rr(-11, 0, 22, 18, 6); ctx.fill();
    const sc = ['#ff5f8f', '#ffd23f', '#5fd0ff', '#8be07f', '#c58bff'];
    for (let i = 0; i < 12; i++) { ctx.fillStyle = sc[i % 5]; ctx.fillRect(-8 + (i * 5) % 16, 3 + (i * 3) % 12, 3.5, 1.5); }
    ctx.fillStyle = '#ff6fa8'; v.rr(-12, 17, 24, 7, 3); ctx.fill();
    ctx.fillStyle = '#ffffff'; v.circle(0, 9, 5); ctx.fill();
    ctx.fillStyle = v.c.ink; v.circle(-2, 8, 0.9); ctx.fill(); v.circle(2, 8, 0.9); ctx.fill();
    ctx.restore();
  }
  function pw16sGob(v, x, y, r, rot) {
    const ctx = v.ctx, cols = ['#5fc8ff', '#ff6fa8', '#ffe066', '#ffffff'];
    ctx.save(); ctx.translate(x, y); ctx.save(); ctx.rotate(rot);
    for (let i = 0; i < 4; i++) v.fillCircle(i * r * 0.08, 0, r * (1 - i * 0.22), cols[i]);
    ctx.restore();
    ctx.strokeStyle = 'rgba(90,40,80,0.45)'; ctx.lineWidth = 1.2; v.circle(0, 0, r); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(0, 2, r * 0.55, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-3, 1.5, 1.6, Math.PI + 0.3, -0.3); ctx.stroke(); ctx.beginPath(); ctx.arc(3, 1.5, 1.6, Math.PI + 0.3, -0.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 3, 2.2, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();
  }
  // where a candy dropped from the shaker at (x, t0) is at time t (null before it drops); it reaches the basket at t1
  const pw16sFall = (v, t, t0, t1, x, yEnd) => (t < t0 || t > t1 ? null : { x, y: v.lerp(42, yEnd, v.ease.in(v.seg(t, t0, t1))) });
  definePreview('Sprinkle Catch', {
    blurb: 'Catch falling candy in your basket while giant gobstoppers bounce around!',
    loop: 6,
    still: 4.9,
    draw(v, t) {
      const ctx = v.ctx, gy = pw16sGY, catchY = gy - pw16sHead - 6;
      v.sky(); v.sun(v.W - 40, 70, 12); v.hills(gy - 24);
      // lollipop trees
      for (const [lx, lc] of [[34, '#ffe066'], [150, '#9fe7ff'], [290, '#c9b0ff']]) { v.line(lx, gy - 30, lx, gy - 8, '#fff8f0', 2); v.fillCircle(lx, gy - 34, 8, lc); ctx.strokeStyle = '#ff7fae'; ctx.lineWidth = 2; v.circle(lx, gy - 34, 4.5); ctx.stroke(); }
      // chocolate floor with frosting and sprinkles
      ctx.fillStyle = '#7a4a32'; ctx.fillRect(0, gy, v.W, v.H - gy);
      ctx.fillStyle = '#fff4fa'; ctx.beginPath(); ctx.moveTo(0, gy - 1);
      for (let x = 0; x <= v.W; x += 16) { ctx.lineTo(x, gy + 4); ctx.quadraticCurveTo(x + 4, gy + 10 + (x / 16 % 2) * 2, x + 8, gy + 4); }
      ctx.lineTo(v.W, gy - 1); ctx.closePath(); ctx.fill();
      const sc = ['#ff5f8f', '#ffd23f', '#5fd0ff', '#8be07f'];
      for (let x = 6; x < v.W; x += 13) { ctx.fillStyle = sc[(x / 13 | 0) % 4]; ctx.fillRect(x, gy + 1 + (x % 3), 4, 1.5); }
      // a wafer up on the left
      ctx.fillStyle = '#d99a52'; v.rr(14, 96, 70, 8, 3); ctx.fill(); ctx.fillStyle = '#ff9ccf'; v.rr(12, 93, 74, 5, 2.5); ctx.fill();
      // the licorice rail and the shaker
      v.line(0, 12, v.W, 12, '#7a1f3d', 4);
      const shX = t < 1.1 ? 110 : t < 1.5 ? v.lerp(110, 225, v.ease.inOut(v.seg(t, 1.1, 1.5))) : t < 2.6 ? 225 : t < 3.5 ? v.lerp(225, 160, v.ease.inOut(v.seg(t, 2.6, 3.5))) : 160;
      const shaking = t < 0.3 ? t : t > 1.5 && t < 1.7 ? t : t > 3.6 && t < 3.9 ? t : 0;
      pw16sShaker(v, shX, shaking);
      // Pip: catches a mint, scoops two spilled candies, catches the golden candy
      const pipX = t < 1.1 ? v.lerp(78, 110, v.ease.out(v.seg(t, 0, 0.8))) : t < 3.2 ? 110 + Math.sin(t * 3) * 3 : t < 3.75 ? v.lerp(110, 168, v.ease.inOut(v.seg(t, 3.2, 3.75))) : 168 - 8 * v.ease.inOut(v.seg(t, 3.75, 4.3));
      const pipN = (t >= 1.1 ? 1 : 0) + (t >= 3.45 ? 1 : 0) + (t >= 3.7 ? 1 : 0) + (t >= 4.7 ? 1 : 0);
      const win = v.seg(t, 4.7, 6), pipHop = t > 4.75 ? v.hop(v.phase(t - 4.75, 0.5), 10) : 0;
      // Bo: catches a gumdrop, gets bonked (Boing!) and spills two
      const bonk = v.seg(t, 2.9, 3.3), boX = t < 1.7 ? v.lerp(258, 225, v.ease.out(v.seg(t, 0, 1.4))) : t < 2.9 ? 225 : t < 3.3 ? v.lerp(225, 198, bonk) : t < 3.9 ? 198 : v.lerp(198, 232, v.ease.inOut(v.seg(t, 3.9, 4.5)));
      const boY = gy + (t > 2.9 && t < 3.3 ? v.hop(bonk, 22) : 0), dizzy = t > 2.9 && t < 3.9;
      const boN = t < 2.4 ? 1 : t < 2.9 ? 2 : 0; // (Bo had one already: the bonk spills both)
      v.shadow(pipX, gy, 12); v.shadow(boX, gy, 12);
      v.hero(0, pipX, gy + pipHop, { s: pw16sS, face: t > 3.2 && t < 3.75 ? 1 : t > 3.75 && t < 4.3 ? -1 : 1, mood: win > 0 ? 'joy' : 'happy', sq: pipHop ? -0.1 : 0 });
      pw16sBasket(v, pipX, gy + pipHop, pipN, t >= 4.7, t > 1.05 && t < 1.3 ? -0.2 : 0);
      v.hero(1, boX, boY, { s: pw16sS, face: -1, mood: dizzy ? 'dizzy' : win > 0.2 ? 'happy' : 'happy' });
      pw16sBasket(v, boX, boY, boN, false, dizzy ? Math.sin(t * 20) * 0.2 : 0);
      // falling candy
      let c = pw16sFall(v, t, 0.3, 1.1, 110, catchY); if (c) pw16sCandy(v, 'mint', c.x, c.y, 1, t * 3);
      c = pw16sFall(v, t, 1.7, 2.4, 225, catchY); if (c) pw16sCandy(v, 1, c.x, c.y);
      c = pw16sFall(v, t, 3.9, 4.7, 160, catchY); if (c) pw16sCandy(v, 'gold', c.x, c.y, 1.15, t);
      // the spilled candy flies out of Bo's basket and lands by Pip
      for (const [k, lx, pick] of [[0, 172, 3.7], [1, 150, 3.45]]) {
        if (t < 2.9 || t >= pick) continue;
        const f = v.seg(t, 2.9, 3.3), x = v.lerp(225, lx, f), y = v.lerp(gy - pw16sHead - 8, gy - 6, f) + v.hop(f, 26);
        pw16sCandy(v, k ? 'mint' : 2, x, y + (f >= 1 ? Math.sin(t * 6 + k) : 0), 1, t * 2);
      }
      // the gobstopper rolls in bouncing, bonks Bo, bounces away
      if (t > 1.9 && t < 4.1) {
        const gx = t < 2.9 ? v.lerp(345, 246, v.seg(t, 1.9, 2.9)) : v.lerp(246, 350, v.seg(t, 2.9, 4.1));
        const gyB = gy - 13 - Math.abs(Math.sin((t - 1.9) * Math.PI * 1.6)) * 46;
        v.shadow(gx, gy, 14);
        pw16sGob(v, gx, gyB, 13, -t * 4);
      }
      // words
      const word = (str, x, y, a, b, col, size = 12) => { const k = v.seg(t, a, b); if (k > 0 && k < 1) { ctx.save(); ctx.globalAlpha *= 1 - k * k; v.label(str, x, y - 12 * k, size, col); ctx.restore(); } };
      word('+2', 110, catchY - 16, 1.1, 1.9, '#ff6f7f');
      word('+1', 225, catchY - 16, 2.4, 3.1, '#ffffff');
      word('Boing!', 222, catchY - 22, 2.9, 3.9, '#ffffff', 14);
      word('Scoop!', 160, catchY - 16, 3.45, 4.2, '#ffffff');
      word('Golden! +5', 160, catchY - 22, 4.7, 5.5, v.c.gold, 13);
      if (win > 0) { v.confetti(pipX, gy - 40, v.seg(t, 4.75, 5.9), 20); if (t > 5.1) v.pill('Pip wins!', v.W / 2, 50, { size: 13, col: v.c.gold }); }
      // the score
      const sp = 2 * (t >= 1.1) + 1 * (t >= 3.45) + 2 * (t >= 3.7) + 5 * (t >= 4.7), sb = boN;
      v.pill('Pip ' + sp, 8, v.H - 14, { size: 10, align: 'left', col: v.c.pip });
      v.pill(sb + ' Bo', v.W - 8, v.H - 14, { size: 10, align: 'right', col: v.c.bo });
    },
  });
  // ----- END 16-4 Sprinkle Catch preview -----
  //
}
