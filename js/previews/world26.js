/* Pip & Bo - Level previews for World 26 Circus Big Top (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw26. The whole file is skipped when the preview engine isn't loaded yet.
   Each level's preview sits between its own BEGIN/END lines (helpers pw26t = trapeze, pw26c = clown car,
   pw26b = cannonball, pw26s = stilts; pw26Tent / pw26Stripes are shared scenery). */
'use strict';

if (typeof definePreview === 'function') {
  // the inside of the big top: dark plum with red canvas stripes fanning down from the peak
  const pw26Stripes = v => {
    const c = v.ctx, g = c.createLinearGradient(0, 0, 0, 180);
    g.addColorStop(0, '#2a1838'); g.addColorStop(1, '#7a3040');
    c.fillStyle = g; c.fillRect(0, 0, 320, 180);
    for (let i = -6; i <= 6; i++) {
      c.fillStyle = i % 2 ? 'rgba(232,68,58,0.45)' : 'rgba(255,244,230,0.12)';
      c.beginPath(); c.moveTo(160 + i * 6, -4); c.lineTo(160 + i * 52 - 20, 130); c.lineTo(160 + i * 52 + 30, 130); c.lineTo(160 + i * 6 + 6, -4); c.closePath(); c.fill();
    }
    for (let i = 0; i <= 16; i++) { const u = i / 16; v.fillCircle(u * 320, 18 + Math.sin(u * Math.PI) * 14, 1.6, i % 2 ? '#ffcf5a' : '#ff8fb0'); }
  };
  const pw26Tent = (v, x, y, w, h, a, b) => {
    const c = v.ctx;
    for (let i = 0; i < 6; i++) {
      c.fillStyle = i % 2 ? b : a;
      c.beginPath(); c.moveTo(x, y - h); c.lineTo(x - w / 2 + i * w / 6, y - h * 0.45); c.lineTo(x - w / 2 + (i + 1) * w / 6, y - h * 0.45); c.closePath(); c.fill();
      c.fillRect(x - w / 2 + i * w / 6, y - h * 0.45, w / 6 + 0.5, h * 0.45);
    }
  };

  // ----- BEGIN 26-1 Trapeze Catch preview -----
  // Bo hangs by the knees on the catch trapeze and swings in; "Hep!"; Pip swings out, lets go at the top, does a flip
  // and is caught by the hands. Confetti and the crowd cheers.
  const pw26tP1 = { x: 90, y: 14 }, pw26tP2 = { x: 236, y: 14 };
  definePreview('Trapeze Catch', {
    blurb: 'Swing, call "Hep!", let go, flip and get caught. Then swap!',
    loop: 5.2, still: 3.2,
    draw(v, t) {
      const c = v.ctx, e = v.ease;
      pw26Stripes(v);
      // net and crowd
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1; c.beginPath(); for (let x = 20; x <= 300; x += 8) c.lineTo(x, 150 + Math.sin(x / 9) * 1.5); c.stroke();
      for (let x = 8; x < 320; x += 14) v.fillCircle(x, 172 - (t > 3.1 && t < 4.6 ? Math.abs(Math.sin(t * 12 + x)) * 4 : 0), 5, ['#ffb38a', '#c98a6a', '#f2c8a0'][x % 3]);
      // the catcher's swing (always swinging)
      const ca = -0.5 * Math.sin(t * 2.4 + 0.6), hx = pw26tP2.x + 78 * Math.sin(ca), hy = pw26tP2.y + 78 * Math.cos(ca);
      c.strokeStyle = 'rgba(240,230,210,0.85)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(pw26tP2.x, pw26tP2.y); c.lineTo(pw26tP2.x + 44 * Math.sin(ca), pw26tP2.y + 44 * Math.cos(ca)); c.stroke();
      v.hero(1, pw26tP2.x + 60 * Math.sin(ca), pw26tP2.y + 60 * Math.cos(ca) - 2, { s: 0.6, rot: Math.PI - ca, face: -1 });
      // the flyer: swing out (0-1.6), fly with a flip (1.6-3.1), held (3.1+)
      let fx, fy, rot = 0;
      if (t < 1.6) { const a = -0.8 + 1.6 * e.inOut(t / 1.6); fx = pw26tP1.x + 70 * Math.sin(a); fy = pw26tP1.y + 70 * Math.cos(a); rot = -a; c.beginPath(); c.moveTo(pw26tP1.x, pw26tP1.y); c.lineTo(fx, fy); c.stroke(); }
      else if (t < 3.1) { const u = (t - 1.6) / 1.5, sx = pw26tP1.x + 70 * Math.sin(0.8), sy = pw26tP1.y + 70 * Math.cos(0.8); fx = v.lerp(sx, hx, u); fy = v.lerp(sy, hy, u) - Math.sin(u * Math.PI) * 40; rot = u < 0.75 ? u / 0.75 * Math.PI * 2 : 0; c.beginPath(); c.moveTo(pw26tP1.x, pw26tP1.y); c.lineTo(pw26tP1.x + 70 * Math.sin(-0.6), pw26tP1.y + 70 * Math.cos(-0.6)); c.stroke(); }
      else { fx = hx; fy = hy; }
      c.save(); c.translate(fx, fy + 12); c.rotate(rot); v.hero(0, 0, 9, { s: 0.6, mood: t > 3.1 ? 'joy' : 'happy' }); c.restore();
      if (t > 0.3 && t < 1.2) v.label('Hep!', hx, hy - 30, 13, v.c.gold);
      if (t > 1.7 && t < 2.7) v.label('Flip!', fx, fy - 26, 11, '#ffffff');
      if (t > 3.1) { v.label('Ta-da!', 160, 60, 16, v.c.gold); v.confetti(hx, hy - 10, v.seg(t, 3.1, 5)); }
    },
  });
  // ----- END 26-1 Trapeze Catch preview -----

  // ----- BEGIN 26-2 Clown Car Getaway preview -----
  // The tiny yellow clown car putters along the midway. Bo pops out of the roof and honks a duck off the road, then a
  // clown leaps from a trampoline into Bo's hands. Pip drives and hops over a custard pie.
  const pw26cCar = (v, x, y, popUp, honk) => {
    const c = v.ctx;
    v.hero(1, x - 6, y - 26 - popUp * 10, { s: 0.6 });
    c.fillStyle = '#ffd23d'; c.strokeStyle = '#a87a10'; c.lineWidth = 1.5;
    v.rr(x - 32, y - 30, 64, 22, 8); c.fill(); c.stroke();
    c.fillStyle = 'rgba(190,230,255,0.9)'; v.rr(x + 6, y - 27, 14, 11, 3); c.fill();
    v.hero(0, x + 13, y - 12, { s: 0.38 });
    c.fillStyle = '#ffd36b'; c.beginPath(); c.moveTo(x + 8, y - 30); c.lineTo(x + 20, y - 38 - (honk ? 3 : 0)); c.lineTo(x + 20, y - 26); c.fill();
    for (const wx of [x - 20, x + 20]) { v.fillCircle(wx, y - 6, 8, '#2a2a3a'); v.fillCircle(wx, y - 6, 3, '#ffffff'); }
  };
  const pw26cClown = (v, x, y, s) => { v.fillCircle(x, y, 6 * s, '#ff5f6d'); v.fillCircle(x, y - 8 * s, 5 * s, '#fff6ee'); v.fillCircle(x, y - 8 * s, 1.6 * s, '#ff3a3a'); v.fillCircle(x - 5 * s, y - 11 * s, 3 * s, '#ff9a3d'); v.fillCircle(x + 5 * s, y - 11 * s, 3 * s, '#ff9a3d'); };
  definePreview('Clown Car Getaway', {
    blurb: 'One drives the clown car, the other honks and grabs the leaping clowns.',
    loop: 5.6, still: 3.3,
    draw(v, t) {
      const c = v.ctx, e = v.ease, road = 150;
      const g = c.createLinearGradient(0, 0, 0, road); g.addColorStop(0, '#ff9a7a'); g.addColorStop(1, '#ffe0a8'); c.fillStyle = g; c.fillRect(0, 0, 320, 180);
      const scroll = t * 40;
      for (let i = -1; i < 4; i++) { const x = i * 120 - (scroll % 120); pw26Tent(v, x + 60, road - 10, 90, 80, i % 2 ? '#5b95ff' : '#e8443a', '#fff4e6'); }
      c.fillStyle = '#e8c88e'; c.fillRect(0, road, 320, 30);
      // the duck runs off after the honk
      const honk = t > 0.8 && t < 1.2, duckGone = v.seg(t, 1.0, 1.8);
      if (duckGone < 1) { c.globalAlpha = 1 - duckGone; v.fillCircle(220 - t * 10, road - 6 - duckGone * 40, 7, '#ffe14a'); v.fillCircle(215 - t * 10, road - 14 - duckGone * 40, 4, '#ffe14a'); c.globalAlpha = 1; }
      if (honk) v.label('HONK!', 150, 80, 14, '#ffffff');
      // the pie and the hop
      const pieX = 330 - t * 60, hop = v.hop(v.seg(t, 4.3, 4.9), 18);
      if (pieX > -20) { c.fillStyle = '#fff6e0'; c.beginPath(); c.ellipse(pieX, road - 3, 9, 4, 0, 0, Math.PI * 2); c.fill(); }
      // the clown leap: from a trampoline into Bo's hands
      const u = v.seg(t, 2.0, 3.2), carX = 120;
      v.rr(250 - t * 20, road - 14, 34, 5, 2); c.fillStyle = '#3a3a5a'; c.fill();
      if (t < 2.0) pw26cClown(v, 266 - t * 20, road - 20 - Math.abs(Math.sin(t * 6)) * 6, 1);
      else if (u < 1) pw26cClown(v, v.lerp(226, carX - 6, u), v.lerp(road - 20, road - 52, u) - Math.sin(u * Math.PI) * 40, 1);
      pw26cCar(v, carX, road + hop, t > 1.9 && t < 3.4 ? 1 : 0.6, honk);
      if (t > 3.2 && t < 4.4) { v.label('Honk honk!', carX, 70, 13, v.c.gold); v.sparkle(carX - 6, road - 50, v.seg(t, 3.2, 4), '#ffffff', 10); }
    },
  });
  // ----- END 26-2 Clown Car Getaway preview -----

  // ----- BEGIN 26-3 Human Cannonball Tour preview -----
  // BOOM! Pip flies out of a striped cannon, through a gold ring, and Bo's net truck races under and catches Pip.
  definePreview('Human Cannonball Tour', {
    blurb: 'BOOM! Fly through the rings while your partner drives the net truck to catch you.',
    loop: 5, still: 2.2,
    draw(v, t) {
      const c = v.ctx, e = v.ease, gr = 150;
      const g = c.createLinearGradient(0, 0, 0, gr); g.addColorStop(0, '#7ac8f0'); g.addColorStop(1, '#fff0c8'); c.fillStyle = g; c.fillRect(0, 0, 320, 180);
      v.cloud(60, 36, 1); v.cloud(220, 28, 0.8);
      pw26Tent(v, 180, gr, 90, 70, '#e8443a', '#fff4e6');
      c.fillStyle = '#e2c38a'; c.fillRect(0, gr, 320, 30);
      // the cannon
      c.save(); c.translate(40, gr - 22); c.rotate(-0.8 + (t > 0.8 && t < 1.1 ? 0.06 : 0));
      c.fillStyle = '#5a5a7a'; v.rr(-10, -9, 36, 18, 6); c.fill(); c.fillStyle = '#e8443a'; c.fillRect(0, -9, 5, 18); c.fillRect(12, -9, 5, 18);
      c.restore(); v.fillCircle(36, gr - 8, 8, '#3a2a3a');
      // the flight
      const u = v.seg(t, 0.9, 3.0), px = v.lerp(56, 250, u), py = v.lerp(gr - 40, gr - 30, u) - Math.sin(u * Math.PI) * 100;
      // the ring
      c.save(); c.translate(150, gr - 128); c.scale(0.45, 1); c.strokeStyle = v.c.gold; c.lineWidth = 6; v.circle(0, 0, 18); c.stroke(); c.restore();
      if (t < 0.9) v.hero(0, 48, gr - 30, { s: 0.55 });
      else if (u < 1) { c.save(); c.translate(px, py); c.rotate(Math.atan2(Math.cos(u * Math.PI) * -100, 194) + Math.PI / 2); v.hero(0, 0, 8, { s: 0.6 }); c.restore(); }
      if (t > 0.85 && t < 1.5) { v.label('BOOM!', 70, 70, 16, '#ffffff'); v.puff(56, gr - 40, v.seg(t, 0.85, 1.5)); }
      if (u > 0.48 && u < 0.62) v.sparkle(150, gr - 128, (u - 0.48) / 0.14, v.c.gold, 12);
      // the truck races under the landing
      const tx = v.lerp(120, 250, e.out(v.seg(t, 0.6, 2.6)));
      c.fillStyle = '#e8443a'; v.rr(tx - 30, gr - 16, 60, 10, 3); c.fill(); v.rr(tx + 28, gr - 26, 20, 20, 4); c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(tx - 28, gr - 34); c.quadraticCurveTo(tx, gr - 26 + (t > 3 && t < 3.4 ? 6 : 0), tx + 26, gr - 34); c.stroke();
      v.hero(1, tx + 38, gr - 10, { s: 0.42 });
      for (const wx of [tx - 20, tx + 20, tx + 40]) v.fillCircle(wx, gr - 5, 6, '#2a2a3a');
      if (t >= 3.0) { v.hero(0, tx, gr - 30 - v.hop(v.seg(t, 3.0, 3.6), 16) * -1 + v.hop(v.seg(t, 3.0, 3.6), 16), { s: 0.55, mood: 'joy' }); v.label('Boing!', tx, 70, 15, v.c.gold); v.confetti(tx, gr - 50, v.seg(t, 3.0, 5)); }
    },
  });
  // ----- END 26-3 Human Cannonball Tour preview -----

  // ----- BEGIN 26-4 Stilt Race preview -----
  // Pip and Bo race on tall striped stilts down the midway. Bo leans too far and topples into the sawdust ("Whoa!");
  // Pip keeps a steady lean, hops a popcorn box and wins under the finish banner.
  const pw26sRacer = (v, id, x, y, lean, step, fall) => {
    const c = v.ctx;
    c.save(); c.translate(x, y); c.rotate(fall ? fall * 1.3 : lean);
    const sw = Math.sin(step * Math.PI) * 3;
    for (const k of [-1, 1]) { c.fillStyle = id ? '#5b95ff' : '#ff6b4a'; c.fillRect(k * 3 - 2 + k * sw * 0.3, -46, 4, 46); c.fillStyle = '#fff'; for (let s = -42; s < 0; s += 9) c.fillRect(k * 3 - 2 + k * sw * 0.3, s, 4, 4); }
    v.hero(id, 0, -46, { s: 0.55, mood: fall ? 'dizzy' : 'happy' });
    c.restore();
  };
  definePreview('Stilt Race', {
    blurb: 'Race on wobbly stilts: lean to go faster, but lean too far and you topple!',
    loop: 5.4, still: 1.8,
    draw(v, t) {
      const c = v.ctx, g = c.createLinearGradient(0, 0, 0, 120);
      g.addColorStop(0, '#4a3a90'); g.addColorStop(1, '#ffa080'); c.fillStyle = g; c.fillRect(0, 0, 320, 180);
      pw26Tent(v, 70, 112, 90, 70, '#8a2a3a', '#f0d8d0'); pw26Tent(v, 250, 112, 90, 70, '#5b3a8a', '#e8d8f0');
      c.fillStyle = '#c9a46a'; c.fillRect(0, 112, 320, 68); c.fillStyle = '#d9b47a'; c.fillRect(0, 128, 320, 8); c.fillRect(0, 160, 320, 8);
      // the finish banner
      c.fillStyle = v.c.gold; v.rr(268, 34, 48, 14, 4); c.fill(); v.text('FINISH', 292, 41.5, 9, '#3a2048', 'center');
      c.fillStyle = '#c9b39a'; c.fillRect(268, 34, 3, 140); c.fillRect(313, 34, 3, 140);
      // Pip (back lane) steady and hopping the popcorn, Bo (front lane) leaning too far and toppling
      const px = v.lerp(30, 300, v.seg(t, 0, 4.4)), hop = v.hop(v.seg(px, 140, 180), 14);
      if (px < 150) { c.fillStyle = '#ff5f6d'; c.fillRect(158, 124, 10, 10); v.fillCircle(163, 123, 4, '#fff6c0'); }
      pw26sRacer(v, 0, px, 134 + hop, 0.18 + Math.sin(t * 5) * 0.05, px / 20, 0);
      const bt = v.seg(t, 0, 1.9), bx = v.lerp(40, 190, bt), fall = t > 1.9 ? Math.min(1, (t - 1.9) / 0.3) : 0;
      pw26sRacer(v, 1, bx, 166, 0.2 + bt * 0.6, bx / 20, fall);
      if (t > 1.9 && t < 3) v.label('Whoa!', bx + 20, 100, 14, '#ffffff');
      if (px > 290) { v.label('Pip wins!', 160, 60, 16, v.c.gold); v.confetti(292, 60, v.seg(t, 4.4, 5.4)); }
    },
  });
  // ----- END 26-4 Stilt Race preview -----
}
