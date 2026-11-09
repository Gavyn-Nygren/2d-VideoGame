/* Pip & Bo - Level previews for World 24 Toy Box Town (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw24. The whole file is skipped when the preview engine isn't loaded yet.
   Each level's preview sits between its own BEGIN/END lines (helpers pw24w = train, pw24j = jack-in-the-box,
   pw24s = slinky, pw24p = pillow fort). */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 24-1 Wind-Up Train Ride preview -----
  // Pip rides the wind-up engine and winds the brass key on the beat (gold ring, "Click!"). Bo runs ahead to the lever:
  // the track splits into a low line that ends at a wall of toy blocks and a high line up a book ramp onto a deck. Bo
  // flips the lever, the train climbs to the deck, picks up a star, and confetti.
  const pw24wF = 150, pw24wSw = 148, pw24wTop = 118, pw24wDeck = 236, pw24wLever = 186;
  const pw24wRailY = (x, up) => !up || x < pw24wSw ? pw24wF : x < pw24wDeck ? pw24wSmooth(pw24wF, pw24wTop, (x - pw24wSw) / (pw24wDeck - pw24wSw)) : pw24wTop;
  const pw24wSmooth = (a, b, u) => { u = Math.max(0, Math.min(1, u)); return a + (b - a) * u * u * (3 - 2 * u); };
  // the train's nose x at time t: creeps while Pip winds, waits a moment, then rolls up onto the deck
  const pw24wNose = (v, t) => v.lerp(92, 128, v.ease.out(v.seg(t, 0, 1.7))) + (316 - 128) * v.ease.inOut(v.seg(t, 2.0, 4.6));
  const pw24wCar = (v, x, up, w, h, col, dark, draw) => {
    const c = v.ctx, y = pw24wRailY(x, up), a = Math.atan2(pw24wRailY(x + 6, up) - pw24wRailY(x - 6, up), 12);
    c.save(); c.translate(x, y); c.rotate(a);
    c.fillStyle = col; c.strokeStyle = dark; c.lineWidth = 1.6; v.rr(-w / 2, -h - 5, w, h, 3); c.fill(); c.stroke();
    for (const wx of [-w / 2 + 7, w / 2 - 7]) { v.fillCircle(wx, -4, 5, '#3c3a5c'); v.fillCircle(wx, -4, 2, '#ffd36b'); }
    if (draw) draw(c);
    c.restore();
    return { y, a };
  };
  definePreview('Wind-Up Train Ride', {
    blurb: 'One winds the toy train on the beat, the other runs ahead and flips the tracks. Then swap!',
    loop: 6.4, still: 4.9,
    draw(v, t) {
      const c = v.ctx, e = v.ease, ink = v.c.ink;
      // the bedroom wall and a lilac rug
      c.fillStyle = '#fbe6cf'; c.fillRect(0, 0, 320, 180);
      c.fillStyle = 'rgba(255,170,190,0.18)'; for (let i = 0; i < 9; i++) c.fillRect(i * 40 + 10, 0, 14, 128);
      c.fillStyle = '#e6c49a'; c.fillRect(0, 124, 320, 6);
      c.fillStyle = '#c9b6f0'; c.fillRect(0, 130, 320, 50);
      c.fillStyle = '#ffd86b'; c.fillRect(0, 160, 320, 4); c.fillStyle = '#ffb3d0'; c.fillRect(0, 170, 320, 4);
      // the high line: book ramp and a deck on ABC blocks
      const books = ['#4fb5ff', '#ff8a6a', '#6fd88a', '#ffc43d'];
      for (let i = 0; i < 7; i++) { const bx = pw24wSw + 6 + i * 12, top = pw24wRailY(bx + 6, true) + 4; c.fillStyle = books[i % 4]; c.strokeStyle = 'rgba(28,26,54,0.45)'; c.lineWidth = 1; v.rr(bx, top, 12, pw24wF - top, 1); c.fill(); c.stroke(); }
      for (const bx of [240, 298]) for (let k = 0; k < 2; k++) {
        const by = pw24wTop + 4 + k * 14; c.fillStyle = books[(k + bx) % 4]; c.strokeStyle = ink; c.lineWidth = 1.2; v.rr(bx, by, 16, 14, 2); c.fill(); c.stroke();
        v.text('ABC'[(k + (bx > 250 ? 1 : 0)) % 3], bx + 8, by + 7.5, 9, '#fff');
      }
      // the track (wooden, two rails): low line ends at a block wall, high line up the ramp
      const rail = (x0, x1, up) => {
        c.strokeStyle = '#c98a52'; c.lineWidth = 5; c.beginPath();
        for (let x = x0; x <= x1; x += 4) { const y = pw24wRailY(x, up) + 2; if (x === x0) c.moveTo(x, y); else c.lineTo(x, y); }
        c.stroke(); c.strokeStyle = '#8d5a2b'; c.lineWidth = 1.2; c.stroke();
      };
      rail(0, 268, false); rail(pw24wSw, 320, true);
      for (let i = 0; i < 2; i++) { c.fillStyle = i ? '#ffffff' : '#ff5f6d'; c.strokeStyle = ink; c.lineWidth = 1.2; v.rr(266, pw24wF + 2 - (i + 1) * 13, 18, 13, 2); c.fill(); c.stroke(); }
      v.text('×', 275, pw24wF - 17, 13, '#ff5f6d');
      // the star on the deck
      const nose = pw24wNose(v, t), got = nose > 282;
      if (!got) v.star(282, pw24wTop - 30 + Math.sin(t * 3) * 2, 8, v.c.gold);
      v.sparkle(282, pw24wTop - 30, v.seg(nose, 282, 316) * (t > 3 ? 1 : 0), '#ffffff', 10);
      // the lever (beside the switch): points at the dead end, then flipped
      const flip = e.back(v.seg(t, 1.25, 1.55)), la = v.lerp(0.55, -0.55, flip);
      c.fillStyle = '#8e939e'; v.rr(pw24wLever - 8, 162, 16, 6, 2); c.fill();
      const kx = pw24wLever + Math.sin(la) * 18, ky = 164 - Math.cos(la) * 18;
      v.line(pw24wLever, 164, kx, ky, '#5d6170', 3); v.fillCircle(kx, ky, 4.5, flip > 0.5 ? v.c.gold : '#ff5f6d');
      // the arrow over the switch: where the train will go
      if (flip < 0.5) v.arrow(pw24wSw - 6, pw24wF - 12, pw24wSw + 30, pw24wF - 12, 'rgba(255,95,109,0.85)');
      else if (t < 4.2) v.arrow(pw24wSw - 6, pw24wF - 12, pw24wSw + 26, pw24wF - 30, v.c.gold);
      // the train: caboose, wagon, engine (up = it took the high line)
      const up = flip > 0.5;
      pw24wCar(v, nose - 104, up, 32, 22, '#ffc43d', '#b88a14', cc => { c.fillStyle = '#fff6d8'; v.rr(-8, -22, 16, 8, 2); cc.fill(); });
      pw24wCar(v, nose - 67, up, 32, 15, '#ff5f6d', '#b13a46');
      const eng = pw24wCar(v, nose - 24, up, 46, 26, '#4caf6a', '#2e7a46', cc => {
        cc.fillStyle = '#2e7a46'; cc.fillRect(12, -44, 8, 14);
        cc.fillStyle = '#3d9a5a'; v.rr(-23, -44, 20, 14, 3); cc.fill();
        cc.fillStyle = '#fff'; v.circle(18, -18, 4); cc.fill(); cc.fillStyle = ink; v.circle(19, -18, 1.8); cc.fill();
      });
      // Pip on the cab roof winding the key; the beat ring turns gold on each wind
      const ex = nose - 24, ang = eng.a, ey = eng.y;
      const winding = t < 3.6, beat = winding ? v.phase(t, 0.5) : 1, gold = beat < 0.35;
      c.save(); c.translate(ex, ey); c.rotate(ang);
      const keyA = Math.floor(t / 0.5) * 1.1 + e.out(Math.min(1, beat * 3)) * 1.1;
      c.save(); c.translate(-2, -36); c.rotate(keyA);
      c.fillStyle = '#f2c14e'; c.strokeStyle = '#b8901a'; c.lineWidth = 1.6;
      for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 6, 0, 5.5, 3.6, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
      c.restore();
      if (winding) { c.strokeStyle = gold ? v.c.gold : 'rgba(255,255,255,0.75)'; c.lineWidth = gold ? 2.6 : 1.6; v.circle(-2, -36, 13 + (gold ? 2 * (1 - beat / 0.35) : 0)); c.stroke(); }
      v.hero(0, -14, -44, { s: 0.72, shadow: false, mood: winding ? (gold ? 'grit' : 'happy') : 'joy', sq: gold ? 0.12 : 0 });
      c.restore();
      if (winding && gold && t % 0.5 < 0.25) v.label('Click!', ex - 8, ey - 76 - (t % 0.5) * 30, 11, v.c.gold);
      // Bo runs ahead to the lever, flips it, then cheers
      const run = e.inOut(v.seg(t, 0, 1.1)), bx = v.lerp(132, pw24wLever - 16, run);
      const step = run > 0 && run < 1 ? Math.abs(Math.sin(t * 16)) * 3 : 0;
      const cheer = t > 4.6 ? Math.abs(Math.sin((t - 4.6) * 7)) * 8 : 0;
      v.hero(1, bx, 176 - step - cheer, { s: 0.85, face: t > 1.6 && t < 4.6 ? -1 : 1, mood: t > 4.6 ? 'joy' : t > 1.2 && t < 1.7 ? 'grit' : 'happy' });
      if (t > 1.15 && t < 2.0) v.bubble('Flip!', pw24wLever + 6, 120);
      if (t > 0.2 && t < 1.0) v.bubble('Wind!', 70, 70);
      if (got && t > 4.5) { v.confetti(250, pw24wTop - 20, v.seg(t, 4.5, 6.2), 18); v.label('This way!', 160, 40, 18, v.c.gold); }
    },
  });
  // ----- END 24-1 Wind-Up Train Ride preview -----

  // ----- BEGIN 24-2 Jack-in-the-Box Launch preview -----
  // Bo cranks the jack-in-the-box on the carpet (notes float up, the box shakes, Pip's sprout peeks out), the lid POPs
  // and Pip flies up past a star onto the bookshelf. Pip drops a yo-yo, hauls the box up with Bo inside, and they swap:
  // confetti. A teddy and books sit on the shelf.
  const pw24jFloor = 150, pw24jShelf = 74, pw24jBox = 96;
  const pw24jToys = ['#ff5f6d', '#ffc43d', '#4fb5ff', '#6fd88a', '#b48cff'];
  // the box (bottom centre x, y): tilt, lid 0..1 open, spring 0..1 out, crank angle
  const pw24jDrawBox = (v, x, y, lid, crank, shake) => {
    const c = v.ctx, w = 30, h = 27;
    c.save(); c.translate(x + shake, y);
    c.fillStyle = '#ff5f6d'; c.strokeStyle = v.c.ink; c.lineWidth = 1.6;
    v.rr(-w / 2, -h, w, h, 4); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.85)'; v.rr(-w / 2 + 4, -h + 4, w - 8, h - 8, 3); c.fill();
    v.star(0, -h / 2, 7, '#ffc43d');
    c.save(); c.translate(-w / 2, -h); c.rotate(-lid * 1.9);
    c.fillStyle = '#4fb5ff'; v.rr(0, -5, w + 2, 5, 2); c.fill(); c.stroke();
    c.restore();
    // the crank
    c.fillStyle = '#d9dbe8'; v.circle(w / 2 + 2, -h / 2, 3); c.fill(); c.stroke();
    const kx = w / 2 + 6 + Math.cos(crank) * 7, ky = -h / 2 + Math.sin(crank) * 7;
    v.line(w / 2 + 3, -h / 2, kx, ky, '#8e939e', 2.5);
    v.fillCircle(kx, ky, 3, '#ff5f6d');
    c.restore();
  };
  definePreview('Jack-in-the-Box Launch', {
    blurb: 'One cranks the jack-in-the-box, the other pops up the bookshelf. Then swap!',
    loop: 6.6, still: 2.75,
    draw(v, t) {
      const c = v.ctx, e = v.ease;
      // the bookshelf's back panel, wood grain
      c.fillStyle = '#f0d2a8'; c.fillRect(0, 0, 320, 180);
      c.strokeStyle = 'rgba(160,110,60,0.13)'; c.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) { const x = 20 + i * 46; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + 6, 90, x - 2, 180); c.stroke(); }
      // the shelf with books and a teddy
      c.fillStyle = 'rgba(60,30,10,0.18)'; c.fillRect(196, pw24jShelf + 9, 112, 5);
      for (let i = 0; i < 7; i++) { const bh = 22 + (i * 7) % 12, bw = 7 + (i % 3); c.fillStyle = pw24jToys[i % 5]; c.strokeStyle = 'rgba(28,26,54,0.5)'; c.lineWidth = 1; v.rr(254 + i * 8, pw24jShelf - bh, bw, bh, 1); c.fill(); c.stroke(); }
      c.fillStyle = '#c98a52'; v.rr(190, pw24jShelf, 124, 9, 2); c.fill();
      c.fillStyle = '#dca06a'; c.fillRect(191, pw24jShelf, 122, 3);
      // the carpet and a toy block
      c.fillStyle = '#ffffff'; c.fillRect(0, pw24jFloor - 12, 320, 12);
      c.fillStyle = '#7cc4e8'; c.fillRect(0, pw24jFloor, 320, 30);
      c.fillStyle = '#9ad4f0'; c.fillRect(0, pw24jFloor + 8, 320, 5); c.fillRect(0, pw24jFloor + 20, 320, 5);
      c.fillStyle = '#ffc43d'; c.strokeStyle = v.c.ink; c.lineWidth = 1.4; v.rr(262, pw24jFloor - 18, 18, 18, 3); c.fill(); c.stroke();
      v.text('A', 271, pw24jFloor - 9, 11, '#ff5f6d');
      // the timeline: crank 0-2.2, pop and fly 2.2-3.3, land, yo-yo 3.5-3.9, haul 3.9-5.0, swap 5.0+
      const cranking = t < 2.2, flying = t >= 2.2 && t < 3.3, haulU = e.inOut(v.seg(t, 3.9, 5.0)), swap = t >= 5.0;
      const notes = Math.min(5, Math.floor(t / 0.44));
      const shake = cranking ? Math.sin(t * 50) * (t / 2.2) * 1.2 : 0;
      // the box: on the carpet, then hauled up to the shelf edge and onto it
      const bx = v.lerp(pw24jBox, 202, e.inOut(v.seg(t, 3.9, 4.3))) + (swap ? e.out(v.seg(t, 5.0, 5.3)) * 10 : 0);
      const by = v.lerp(pw24jFloor, pw24jShelf, haulU);
      // the yo-yo string from the hook (shelf edge) to the box
      const hookX = 196;
      if (t > 3.5 && !swap) {
        const u = e.out(v.seg(t, 3.5, 3.9)), sx = v.lerp(hookX, bx, u * u), sy = v.lerp(pw24jShelf - 12, by - 30, u);
        v.line(hookX, pw24jShelf - 12, sx, sy, '#ffffff', 1.4);
        v.fillCircle(sx, sy, 3.5, '#ff5f6d');
      }
      c.fillStyle = v.c.gold; c.fillRect(204, pw24jShelf - 18, 3, 18); v.line(205, pw24jShelf - 17, hookX, pw24jShelf - 17, v.c.gold, 2.5);
      // who is in the box: Pip (cranking, peeking), then Bo (hauled up)
      const lid = cranking ? 0.05 + (t / 2.2) * 0.12 : flying ? 1 : t < 3.9 ? 0.8 : 0.45;
      if (cranking) v.hero(0, bx + shake, by - 12 + (t / 2.2) * -5, { s: 0.85, shadow: false, mood: 'grit' });
      if (t >= 3.9 && t < 5.4) v.hero(1, bx, by - 18, { s: 0.85, shadow: false, mood: 'joy', face: 1 });
      // the spring after the pop
      if (flying || (t >= 3.3 && t < 3.9)) {
        const ext = flying ? Math.max(0, 1 - (t - 2.2) * 2) * 26 : 0;
        c.strokeStyle = '#c9ced8'; c.lineWidth = 2.5; c.beginPath();
        for (let i = 0; i <= 6; i++) c.lineTo(bx + (i % 2 ? -5 : 5), by - 24 - (ext + 4) * i / 6);
        c.stroke();
      }
      pw24jDrawBox(v, bx, by, lid, t * (cranking ? 9 : 0), shake);
      // Bo at the crank (until hooked), then out of the box after the swap
      if (t < 3.9) {
        const crankA = t * 9, hx = pw24jBox + 23 + Math.cos(crankA) * 7, hy = pw24jFloor - 14 + Math.sin(crankA) * 7;
        v.hero(1, pw24jBox + 34, pw24jFloor, { s: 0.85, face: -1, mood: flying ? 'wow' : 'happy' });
        if (cranking) v.line(pw24jBox + 30, pw24jFloor - 12, hx, hy, v.c.bo, 2.5);
      } else if (swap && t >= 5.4) v.hero(1, bx, by - 2 - Math.abs(Math.sin(t * 7)) * 5, { s: 0.85, mood: 'joy' });
      // notes float up while cranking
      for (let k = 0; k < notes && cranking; k++) {
        const u = v.clamp((t - k * 0.44) / 1.2, 0, 1);
        if (u >= 1) continue;
        c.globalAlpha = 1 - u; const nx = pw24jBox - 6 + k * 5 + Math.sin(u * 6 + k) * 4, ny = pw24jFloor - 34 - u * 40;
        c.fillStyle = pw24jToys[k % 5]; c.beginPath(); c.ellipse(nx, ny, 3.2, 2.5, -0.4, 0, Math.PI * 2); c.fill();
        v.line(nx + 2.6, ny, nx + 2.6, ny - 9, pw24jToys[k % 5], 1.5); c.globalAlpha = 1;
      }
      // Pip's flight: an arc from the box to the shelf, past a star
      const star = { x: 166, y: 64 };
      const got = t > 2.78 && t < 6.5;
      if (!got) v.star(star.x, star.y + Math.sin(t * 3) * 2, 7, v.c.gold);
      v.sparkle(star.x, star.y, v.seg(t, 2.78, 3.3), '#ffffff', 10);
      if (flying) {
        const u = v.seg(t, 2.2, 3.3), x = v.lerp(pw24jBox, 236, u), y = v.lerp(pw24jFloor - 24, pw24jShelf, u) - Math.sin(u * Math.PI) * 52 - u * 10;
        v.hero(0, x, y, { s: 0.9, rot: u * Math.PI * 2 * 0.9, mood: 'joy', shadow: false });
        if (u < 0.2) v.label('POP!', pw24jBox, pw24jFloor - 60, 16, v.c.gold);
      } else if (t >= 3.3) {
        // on the shelf: lands, walks to the hook, hauls, cheers
        const walk = v.seg(t, 3.3, 3.5), x = swap ? v.lerp(230, 254, e.out(v.seg(t, 5.0, 5.4))) : v.lerp(240, 230, walk);
        const heave = t > 3.9 && t < 5.0 ? Math.abs(Math.sin(t * 14)) * 0.15 : 0;
        v.hero(0, x, pw24jShelf - (swap ? Math.abs(Math.sin(t * 7 + 1)) * 5 : 0), { s: 0.9, face: -1, sq: heave, mood: swap ? 'joy' : 'grit' });
        if (t < 3.6) v.puff(236, pw24jShelf, v.seg(t, 3.3, 3.6));
      }
      if (t > 4.0 && t < 4.9) v.bubble('Haul!', 226, pw24jShelf - 40);
      if (cranking && t > 0.5) v.bubble('Crank!', pw24jBox + 40, pw24jFloor - 50);
      if (swap) { v.confetti(214, pw24jShelf - 10, v.seg(t, 5.0, 6.4), 18); v.label('Swap!', 160, 110, 18, v.c.gold); }
    },
  });
  // ----- END 24-2 Jack-in-the-Box Launch preview -----

  // ----- BEGIN 24-3 Slinky Stairs preview -----
  // A rainbow slinky on a book step high on the shelf: Pip holds the back end and stretches it (the flop meter swings
  // into the green), lets go, and it flops end over end down to the next step with Bo riding the front end past a star
  // ("Perfect!" as Bo sticks the landing); Pip's end flips over after. One more flop down onto the pillow pile, then
  // confetti and "Swap!".
  const pw24sRain = ['#ff5f6d', '#ff9f43', '#ffd23f', '#6fd88a', '#4fb5ff', '#b48cff'];
  const pw24sSteps = [{ x: 64, y: 58, w: 74, c: ['#ff5f6d', '#4fb5ff'] }, { x: 206, y: 104, w: 74, c: ['#6fd88a', '#ffc43d'] }, { x: 96, y: 150, w: 130, c: null }];
  // one ring of the slinky, across the curve at angle a
  const pw24sRing = (v, x, y, a, i, s) => {
    const c = v.ctx;
    c.save(); c.translate(x, y); c.rotate(a);
    c.strokeStyle = v.c.ink; c.lineWidth = 3.4 * s; c.beginPath(); c.ellipse(0, 0, 7.5 * s, 2.5 * s, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = pw24sRain[i % 6]; c.lineWidth = 2 * s; c.beginPath(); c.ellipse(0, 0, 7.5 * s, 2.5 * s, 0, 0, Math.PI * 2); c.stroke();
    c.restore();
  };
  // the slinky standing (bx, by, height, lean) or arching from the back end (bx, by) to the front end (fx, fy)
  const pw24sSlinky = (v, bx, by, fx, fy, h, lean) => {
    if (fx == null) { for (let i = 0; i < 10; i++) { const u = i / 9; pw24sRing(v, bx + lean * 8 * u * u, by - 2 - (h - 3) * u, lean * 0.3 * u, i, 1); } return; }
    const d = Math.hypot(fx - bx, fy - by), mx = (bx + fx) / 2, my = Math.min(by, fy) - v.clamp(d * 0.4, 12, 50), n = Math.round(v.clamp(d / 6, 10, 22));
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), a = 1 - u, x = a * a * bx + 2 * a * u * mx + u * u * fx, y = a * a * (by - 2) + 2 * a * u * my + u * u * (fy - 2);
      pw24sRing(v, x, y, Math.atan2(2 * a * (my - by) + 2 * u * (fy - my), 2 * a * (mx - bx) + 2 * u * (fx - mx)) + Math.PI / 2, i, 1);
    }
  };
  const pw24sArc = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u - Math.sin(u * Math.PI) * 34 - u * (1 - u) * 10 });
  definePreview('Slinky Stairs', {
    blurb: 'One times the flop, the other steers the slinky down the steps. Stick it!',
    loop: 6.4, still: 1.35,
    draw(v, t) {
      const c = v.ctx, e = v.ease;
      // the shelf: wood back panel with far books, tall sides
      c.fillStyle = '#f2d3a6'; c.fillRect(0, 0, 320, 180);
      for (let k = 0; k < 2; k++) {
        const y = 70 + k * 80;
        c.fillStyle = 'rgba(142,90,46,0.22)'; c.fillRect(0, y, 320, 5);
        for (let i = 0; i < 18; i++) { const bh = 18 + (i * 7 + k * 5) % 14; c.fillStyle = pw24sRain[(i + k) % 6]; c.globalAlpha = 0.2; v.rr(8 + i * 17, y - bh, 12, bh, 2); c.fill(); c.globalAlpha = 1; }
      }
      c.fillStyle = '#b8783f'; c.fillRect(0, 0, 10, 180); c.fillRect(310, 0, 10, 180);
      // the steps: two book stacks and the pillow pile at the bottom
      const S = pw24sSteps;
      for (const s of S.slice(0, 2)) for (let k = 0; k < 2; k++) {
        c.fillStyle = s.c[k]; c.strokeStyle = v.c.ink; c.lineWidth = 1.4; v.rr(s.x - s.w / 2 + k * 3, s.y + k * 8, s.w - k * 6, 8, 2); c.fill(); c.stroke();
        c.fillStyle = '#fffaf0'; c.fillRect(s.x + s.w / 2 - 8 - k * 3, s.y + k * 8 + 2, 5, 4);
      }
      for (let k = 0; k < 3; k++) { c.fillStyle = ['#ff8fc8', '#b48cff', '#4fb5ff'][k]; c.strokeStyle = v.c.ink; c.lineWidth = 1.4; c.beginPath(); c.ellipse(S[2].x - 40 + k * 40, S[2].y + 10, 26, 12, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
      c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(S[2].x, S[2].y + 3, 56, 7, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      // the timeline: hold 0-1.0, flop 1.0-1.6, follow 1.6-2.0, hold 2.2-3.1, flop 3.1-3.8, follow 3.8-4.2, swap 4.3+
      const flop = (t0, a, b) => {
        const u = v.seg(t, t0, t0 + 0.6), f = v.seg(t, t0 + 0.6, t0 + 1.0);
        return { u, f, front: u < 1 ? pw24sArc({ x: a.x + 4, y: a.y }, { x: b.x, y: b.y }, e.inOut(u)) : { x: b.x, y: b.y },
          back: f > 0 ? { x: v.lerp(a.x, b.x, e.inOut(f)), y: v.lerp(a.y, b.y, e.inOut(f)) - Math.sin(f * Math.PI) * 24 } : { x: a.x, y: a.y } };
      };
      const p1 = { x: S[0].x + 8, y: S[0].y }, p2 = { x: S[1].x - 6, y: S[1].y }, p3 = { x: S[2].x + 10, y: S[2].y };
      let stage, hold = 0, dir = 1, front, back, at = p1;
      if (t < 1.0) { stage = 'hold'; hold = e.inOut(v.seg(t, 0.1, 0.98)) * 0.52; at = p1; dir = 1; }
      else if (t < 2.0) { stage = 'fly'; ({ front, back } = flop(1.0, p1, p2)); dir = 1; }
      else if (t < 3.1) { stage = 'hold'; at = p2; dir = -1; hold = e.inOut(v.seg(t, 2.2, 3.08)) * 0.4; }
      else if (t < 4.2) { stage = 'fly'; ({ front, back } = flop(3.1, p2, p3)); dir = -1; }
      else { stage = 'win'; at = p3; }
      hold = v.clamp(hold, 0, 1);
      // the star on the first hop
      const star = { x: 140, y: 52 };
      if (t < 1.32 || t > 6.2) v.star(star.x, star.y + Math.sin(t * 3) * 2, 6.5, v.c.gold);
      v.sparkle(star.x, star.y, v.seg(t, 1.32, 1.8), '#ffffff', 9);
      if (stage === 'hold' || stage === 'win') {
        const h = 22 + hold * 12, lean = stage === 'win' ? Math.sin(t * 8) * 0.4 : -dir * hold * 0.8 + dir * 0.2;
        pw24sSlinky(v, at.x, at.y, null, null, h, lean);
        if (stage === 'win') {
          v.hero(0, at.x - 26, at.y - Math.abs(Math.sin(t * 7)) * 6, { s: 0.85, mood: 'joy' });
          v.hero(1, at.x + 26, at.y - Math.abs(Math.sin(t * 7 + 1)) * 6, { s: 0.85, mood: 'joy', face: -1 });
          v.confetti(at.x, at.y - 30, v.seg(t, 4.3, 6.0), 22);
          v.label('Swap!', 160, 96, 18, v.c.gold);
        } else {
          v.hero(0, at.x - dir * 17, at.y, { s: 0.8, face: dir, sq: hold * 0.25, mood: hold > 0.3 ? 'grit' : 'happy' });
          v.hero(1, at.x + lean * 8, at.y - h, { s: 0.8, face: dir, shadow: false, mood: 'happy' });
          // the arrow Bo points with
          c.fillStyle = v.c.bo; c.strokeStyle = v.c.ink; c.lineWidth = 1.2;
          const ax = at.x + dir * 30, ay = at.y - h - 6;
          c.beginPath(); c.moveTo(ax + dir * 10, ay); c.lineTo(ax, ay - 6); c.lineTo(ax, ay - 3); c.lineTo(ax - dir * 8, ay - 3); c.lineTo(ax - dir * 8, ay + 3); c.lineTo(ax, ay + 3); c.lineTo(ax, ay + 6); c.closePath(); c.fill(); c.stroke();
        }
      } else {
        pw24sSlinky(v, back.x, back.y, front.x, front.y, 0, 0);
        v.hero(0, back.x - (front.x === back.x ? 0 : dir * 14), back.y - (back.x !== (dir > 0 ? p1.x : p2.x) ? 6 : 0), { s: 0.8, face: dir, mood: 'wow', shadow: false });
        v.hero(1, front.x, front.y - 3, { s: 0.8, face: dir, mood: 'joy', shadow: false, rot: dir * 0.15 * Math.sin(t * 6) });
        const landT = stage === 'fly' && t < 2.0 ? 1.6 : 3.7;
        if (t > landT && t < landT + 0.7) v.label('Perfect!', front.x, front.y - 40 - (t - landT) * 12, 15, v.c.gold);
      }
      // the flop meter while holding
      if (stage === 'hold' && (t < 1.0 || t > 2.2)) {
        const mx = 110, my = 166, mw = 100;
        c.fillStyle = 'rgba(28,26,54,0.85)'; v.rr(mx - 4, my - 6, mw + 8, 13, 6); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.18)'; v.rr(mx, my - 3, mw, 7, 3); c.fill();
        c.fillStyle = '#5fe08a'; c.fillRect(mx + mw * (t < 1 ? 0.42 : 0.3), my - 3, mw * 0.2, 7);
        c.fillStyle = '#ffffff'; c.fillRect(mx + mw * hold - 1, my - 6, 3, 13);
        if (t > 0.3) v.bubble((t < 1 ? t > 0.82 : t > 2.9) ? 'Let go!' : 'Hold...', 250, t < 1 ? 44 : 74);
      }
    },
  });
  // ----- END 24-3 Slinky Stairs preview -----

  // ----- BEGIN 24-4 Pillow Fort Battle preview -----
  // A bedroom with two pillow forts, a teddy flag on each. Pip aims (dotted arc) and lobs a bunny plushie that knocks
  // the top pillow off Bo's front wall; Bo tosses one back that plops short. Pip aims again, right at Bo's teddy:
  // it wobbles and topples off the fort. "Pip wins!" with confetti while Bo is dizzy.
  const pw24pFY = 150, pw24pB = 12, pw24pH = [2, 3, 3, 5, 3];
  const pw24pX = (side, i) => (side ? 298 - i * 13 : 22 + i * 13);
  const pw24pCol = [['#ffb08f', '#ffd6c4'], ['#8fb6ff', '#cfe0ff']];
  const pw24pArc = (a, b, h, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u - 4 * h * u * (1 - u) });
  const pw24pBlock = (v, x, y, side, k, rot) => {
    const c = v.ctx;
    c.save(); c.translate(x, y); if (rot) c.rotate(rot);
    c.fillStyle = pw24pCol[side][k % 2]; c.strokeStyle = v.c.ink; c.lineWidth = 1.3;
    v.rr(-6, -6, 12, 12, 3.5); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.ellipse(-1.5, -2.5, 3.5, 1.6, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  };
  // the teddy with its flag, feet at (x, y), tipped by rot about its feet
  const pw24pTeddy = (v, x, y, side, rot) => {
    const c = v.ctx;
    c.save(); c.translate(x, y); c.rotate(rot || 0);
    c.strokeStyle = v.c.ink; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(6, -6); c.lineTo(6, -30); c.stroke();
    c.fillStyle = side ? v.c.bo : v.c.pip; c.beginPath(); c.moveTo(6, -30); c.lineTo(17, -26.5); c.lineTo(6, -23); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#b07a4a';
    c.beginPath(); c.ellipse(0, -6, 6, 6.5, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    for (const ex of [-4.5, 4.5]) { c.beginPath(); c.arc(ex, -18.5, 2.6, 0, Math.PI * 2); c.fill(); c.stroke(); }
    c.beginPath(); c.arc(0, -14.5, 5, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#e9c9a0'; c.beginPath(); c.ellipse(0, -13, 2.4, 1.8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = v.c.ink; c.fillRect(-2.4, -16.4, 1.4, 1.4); c.fillRect(1, -16.4, 1.4, 1.4);
    c.restore();
  };
  const pw24pBunny = (v, x, y, rot) => {
    const c = v.ctx;
    c.save(); c.translate(x, y); c.rotate(rot || 0);
    c.fillStyle = '#ff9fcf'; c.strokeStyle = v.c.ink; c.lineWidth = 1.2;
    for (const ex of [-2.5, 2.5]) { c.beginPath(); c.ellipse(ex, -7, 1.8, 4, ex * 0.08, 0, Math.PI * 2); c.fill(); c.stroke(); }
    c.beginPath(); c.arc(0, 0, 5.5, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = v.c.ink; c.fillRect(-2.2, -1.5, 1.2, 1.2); c.fillRect(1, -1.5, 1.2, 1.2);
    c.restore();
  };
  const pw24pDots = (v, a, b, h, k, col) => {
    const c = v.ctx, n = 12;
    c.fillStyle = col;
    for (let i = 1; i <= Math.round(n * k); i++) { const p = pw24pArc(a, b, h, i / n); c.globalAlpha = 0.85; c.beginPath(); c.arc(p.x, p.y, 1.7, 0, Math.PI * 2); c.fill(); }
    c.globalAlpha = 1;
    if (k >= 1) { c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath(); c.arc(b.x, b.y, 7, 0, Math.PI * 2); c.stroke(); }
  };
  definePreview('Pillow Fort Battle', {
    blurb: 'Build your pillow fort and toss plushies to topple the other teddy!',
    loop: 6.4, still: 3.75,
    draw(v, t) {
      const c = v.ctx, e = v.ease, FY = pw24pFY, B = pw24pB;
      // the bedroom: striped wallpaper, a window with the moon, the rug
      c.fillStyle = '#f6e2c6'; c.fillRect(0, 0, 320, 180);
      c.fillStyle = 'rgba(255,170,140,0.18)'; for (let x = 0; x < 320; x += 24) c.fillRect(x, 0, 10, FY);
      c.fillStyle = '#2b3566'; c.strokeStyle = '#a8794a'; c.lineWidth = 4; v.rr(132, 18, 56, 44, 4); c.fill(); c.stroke();
      c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(170, 34, 7, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2b3566'; c.beginPath(); c.arc(173, 32, 6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#a8794a'; c.fillRect(158, 18, 4, 44);
      c.fillStyle = '#c99567'; c.fillRect(0, FY, 320, 30);
      c.fillStyle = '#ffc9b0'; v.rr(8, FY + 4, 146, 16, 6); c.fill();
      c.fillStyle = '#bcd3ff'; v.rr(166, FY + 4, 146, 16, 6); c.fill();
      c.strokeStyle = '#fffaf0'; c.setLineDash([3, 3]); c.lineWidth = 1.2; c.beginPath(); c.moveTo(160, FY + 2); c.lineTo(160, FY + 22); c.stroke(); c.setLineDash([]);
      // the timeline: aim 0.2-1.0, toss 1.0-1.6 knocks Bo's shield pillow, Bo tosses back 1.8-2.4,
      // aim 2.4-3.0, toss 3.0-3.6 hits the teddy, wobble 3.6-3.95, topple 3.95-4.5, win 4.5+
      const hit1 = t >= 1.6, topT = v.seg(t, 3.95, 4.5);
      // the forts
      for (let side = 0; side < 2; side++) for (let i = 0; i < 5; i++) {
        const h = pw24pH[i] - (side && i === 3 && hit1 ? 1 : 0);
        for (let k = 0; k < h; k++) pw24pBlock(v, pw24pX(side, i), FY - k * B - 6, side, k + i, 0);
      }
      // Pip's teddy stays put; Bo's wobbles then topples off the back
      pw24pTeddy(v, pw24pX(0, 2), FY - 3 * B, 0, Math.sin(t * 2) * 0.04);
      const wob = t >= 3.6 && t < 3.95 ? Math.sin((t - 3.6) * 40) * 0.25 * (1 - v.seg(t, 3.6, 3.95) * 0.3) : 0;
      if (t < 3.95) pw24pTeddy(v, pw24pX(1, 2), FY - 3 * B, 1, wob);
      else {
        const tx = pw24pX(1, 2) + e.out(topT) * 6, ty = FY - 3 * B + e.in(topT) * B;
        pw24pTeddy(v, tx, ty, 1, e.out(topT) * 1.45);
        if (t > 4.5 && t < 4.9) v.puff(tx + 12, FY - 2 * B, v.seg(t, 4.5, 4.9));
      }
      // the knocked-off pillow bounces away behind Bo's fort
      if (hit1) {
        const u = v.seg(t, 1.6, 2.3), bx = pw24pX(1, 3) + 26 * u, by = FY - 4 * B - 6 - Math.sin(u * Math.PI) * 18 + u * (4 * B);
        pw24pBlock(v, bx, Math.min(by, FY - 6), 1, 4, u * 3);
        if (u < 1) v.puff(pw24pX(1, 3), FY - 4.5 * B, v.seg(t, 1.6, 2.0));
        if (t < 2.3) v.label('Bonk!', pw24pX(1, 3) - 4, FY - 6 * B - 6 - u * 8, 13, v.c.gold);
      }
      // Pip and Bo
      const win = t >= 4.5;
      const pa = { x: 120, y: 120 }, t1 = { x: pw24pX(1, 3), y: FY - 4.5 * B }, t2 = { x: pw24pX(1, 2) + 1, y: FY - 3 * B - 12 };
      const aiming = (t > 0.2 && t < 1.0) || (t > 2.4 && t < 3.0);
      const pipY = win ? FY + v.hop(v.phase(t, 0.5), 10) : FY;
      v.hero(0, 110, pipY, { s: 0.85, face: 1, mood: win ? 'joy' : aiming ? 'grit' : 'happy', sq: aiming ? 0.12 : 0 });
      const boHit = t > 1.6 && t < 2.0, boDizzy = t > 4.2;
      v.hero(1, 212, FY - (t > 1.8 && t < 2.1 ? 4 : 0), { s: 0.85, face: -1, mood: boDizzy ? 'dizzy' : boHit ? 'wow' : 'happy' });
      // Pip's plushies: aim arc, then the toss
      if (t > 0.2 && t < 1.0) { pw24pDots(v, pa, t1, 46, e.out(v.seg(t, 0.2, 0.8)), v.c.pip); pw24pBunny(v, pa.x - 2, pa.y + 2, 0); }
      if (t >= 1.0 && t < 1.6) { const p = pw24pArc(pa, t1, 46, v.seg(t, 1.0, 1.6)); pw24pBunny(v, p.x, p.y, t * 9); }
      if (t >= 1.6 && t < 2.5) { const u = v.seg(t, 1.6, 2.2); pw24pBunny(v, t1.x - 18 * u, Math.min(t1.y + 60 * u * u - 16 * u, FY - 6), 0); }
      if (t > 2.4 && t < 3.0) { pw24pDots(v, pa, t2, 40, e.out(v.seg(t, 2.4, 2.85)), v.c.pip); pw24pBunny(v, pa.x - 2, pa.y + 2, 0); if (t > 2.75) v.label('Teddy!', t2.x, t2.y - 22, 11, v.c.pip); }
      if (t >= 3.0 && t < 3.6) { const p = pw24pArc(pa, t2, 40, v.seg(t, 3.0, 3.6)); pw24pBunny(v, p.x, p.y, t * 9); }
      if (t >= 3.6 && t < 4.4) { const u = v.seg(t, 3.6, 4.2); pw24pBunny(v, t2.x - 20 * u, Math.min(t2.y + 70 * u * u - 14 * u, FY - 6), 0); }
      if (t >= 3.6 && t < 3.9) v.sparkle(t2.x, t2.y, v.seg(t, 3.6, 3.9));
      // Bo's toss back, short: it plops on the rug
      const ba = { x: 202, y: 120 }, bb = { x: 96, y: FY - 6 };
      if (t >= 1.9 && t < 2.5) { const p = pw24pArc(ba, bb, 34, v.seg(t, 1.9, 2.5)); pw24pBunny(v, p.x, p.y, -t * 9); }
      if (t >= 2.5 && !win) { pw24pBunny(v, bb.x, bb.y, 0); if (t < 2.9) v.label('Plop', bb.x, bb.y - 16, 10, v.c.bo); }
      if (t >= 3.95 && t < 4.6) v.label('Topple!', 262, 70 - topT * 6, 15, v.c.gold);
      if (win) { v.confetti(110, 110, v.seg(t, 4.5, 6.2)); v.label('Pip wins!', 160, 92, 20, v.c.gold); }
    },
  });
  // ----- END 24-4 Pillow Fort Battle preview -----
}
