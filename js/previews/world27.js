/* Pip & Bo - Level previews for World 27 Robot Factory (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw27. Each level's preview sits between its own BEGIN/END lines
   (helpers pw27m = mech, pw27a = assembly line, pw27c = crane, pw27r = rumble). */
'use strict';

if (typeof definePreview === 'function') {
  // the factory backdrop every World 27 preview shares
  const pw27Hall = (v, t, scroll = 0) => {
    const c = v.ctx;
    const g = c.createLinearGradient(0, 0, 0, 180); g.addColorStop(0, '#4b5d86'); g.addColorStop(1, '#a8b8d8');
    c.fillStyle = g; c.fillRect(0, 0, 320, 180);
    c.fillStyle = '#3c4a6e';
    for (let x = -((scroll * 0.3) % 120); x < 330; x += 120) c.fillRect(x, 0, 8, 180);
    c.save(); c.globalAlpha = 0.3;
    const gear = (x, y, r, a) => { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = '#6f86b6'; c.beginPath(); for (let k = 0; k < 20; k++) { const rr = k % 2 ? r * 0.8 : r, a0 = k / 20 * Math.PI * 2; c.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr); } c.closePath(); c.fill(); c.restore(); };
    gear(70 - (scroll * 0.4) % 400, 60, 34, t * 0.6); gear(250 - (scroll * 0.4) % 400 + 400 * (scroll > 0 ? 1 : 0), 50, 26, -t * 0.8);
    c.restore();
    c.fillStyle = '#6f86b6'; c.fillRect(0, 12, 320, 6);
    c.fillStyle = Math.sin(t * 5) > 0 ? '#ffb84d' : '#5a4a3a'; v.circle(160, 24, 3.5); c.fill();
  };
  const pw27Stripes = (v, x, y, w, h) => {
    const c = v.ctx; c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.fillStyle = '#ffc53d'; c.fillRect(x, y, w, h); c.fillStyle = '#2a2a3a';
    for (let k = -h; k < w + h; k += 10) { c.beginPath(); c.moveTo(x + k, y + h); c.lineTo(x + k + 5, y + h); c.lineTo(x + k + 5 + h, y); c.lineTo(x + k + h, y); c.closePath(); c.fill(); }
    c.restore();
  };
  const pw27Floor = (v, x, y, w) => { const c = v.ctx; c.fillStyle = '#56607e'; c.fillRect(x, y, w, 180 - y); c.fillStyle = '#8a96b4'; c.fillRect(x, y, w, 6); };
  const pw27Crate = (v, x, y, s, kind) => {
    const c = v.ctx, pal = kind === 'wood' ? ['#d39a5c', '#8e5a2e'] : kind === 'gold' ? ['#ffd36b', '#b9850f'] : ['#9aa8c8', '#5d6a8e'];
    c.fillStyle = pal[0]; c.strokeStyle = pal[1]; c.lineWidth = 1.6; v.rr(x, y, s, s, 2); c.fill(); c.stroke();
    if (kind === 'wood') { c.beginPath(); c.moveTo(x + 3, y + 3); c.lineTo(x + s - 3, y + s - 3); c.moveTo(x + s - 3, y + 3); c.lineTo(x + 3, y + s - 3); c.stroke(); }
    else { c.fillStyle = pal[1]; c.fillRect(x + 3, y + 3, s - 6, 2); }
  };
  // ----- BEGIN 27-1 Mech Suit Duo preview -----
  // The big mech walks right (Bo in the chest window works the legs, Pip in the dome works the arm). A wall with a
  // glowing spot: the arm swings to the spot and punches three times, the wall bursts, the mech strides through.
  const pw27mMech = (v, x, feet, t, walk, armA, punch) => {
    const c = v.ctx, step = Math.sin(walk * 6);
    // legs
    for (const k of [-1, 1]) { const lx = x + k * 12 + (k * step * 5); c.fillStyle = '#5d6a8e'; v.rr(lx - 6, feet - 30, 12, 30, 4); c.fill(); c.fillStyle = '#2a2f4f'; v.rr(lx - 9, feet - 6, 18, 6, 3); c.fill(); }
    // body with the chest window (Bo) and the dome (Pip)
    c.fillStyle = '#9aa8c8'; c.strokeStyle = '#2a2f4f'; c.lineWidth = 2; v.rr(x - 28, feet - 74, 56, 46, 10); c.fill(); c.stroke();
    pw27Stripes(v, x - 24, feet - 36, 48, 5);
    c.fillStyle = 'rgba(190,240,255,0.5)'; v.rr(x - 14, feet - 68, 28, 24, 7); c.fill();
    v.hero(1, x, feet - 45, { s: 0.75, face: 1, mood: 'grit' });
    c.fillStyle = 'rgba(190,240,255,0.5)'; v.circle(x - 4, feet - 82, 14); c.fill(); c.strokeStyle = '#2a2f4f'; c.stroke();
    v.hero(0, x - 4, feet - 72, { s: 0.65, face: 1, mood: 'joy' });
    // the arm (angle armA, reaching out on a punch)
    const sx = x + 24, sy = feet - 62, len = 30 + punch * 18, ex = sx + Math.cos(armA) * len, ey = sy + Math.sin(armA) * len;
    v.line(sx, sy, ex, ey, '#5d6a8e', 7);
    v.fillCircle(ex, ey, 8, '#ff8a5a'); c.strokeStyle = '#2a2f4f'; c.lineWidth = 1.5; v.circle(ex, ey, 8); c.stroke();
    return { ex, ey };
  };
  definePreview('Mech Suit Duo', {
    blurb: 'Drive one big robot together: one works the legs, the other the arms. Punch walls, grab ledges!',
    loop: 6, still: 2.6,
    draw(v, t) {
      const c = v.ctx, e = v.ease;
      const walk1 = e.inOut(v.seg(t, 0, 1.6)), walk2 = e.inOut(v.seg(t, 3.6, 5.6));
      const scroll = walk1 * 60 + walk2 * 120;
      pw27Hall(v, t, scroll);
      pw27Floor(v, 0, 150, 320);
      // the wall with three glowing spots: the middle one glows
      const wallX = 220 - scroll + 60, hits = [2.0, 2.5, 3.0].filter(k => t > k + 0.12).length, burst = t > 3.15;
      if (!burst) {
        c.fillStyle = '#8a7a6a'; c.strokeStyle = '#4a3a2a'; c.lineWidth = 2; v.rr(wallX, 60, 26, 90, 3); c.fill(); c.stroke();
        for (let k = 0; k < 3; k++) { c.fillStyle = k === 1 ? (Math.sin(t * 10) > 0 ? '#ffd36b' : '#ffb84d') : '#6a5a4a'; v.circle(wallX + 13, 78 + k * 26, 6); c.fill(); }
        for (let k = 0; k < hits; k++) v.line(wallX + 6 + k * 6, 92, wallX + 12 + k * 5, 112, '#2a1a0a', 1.5);
      } else {
        const k = v.seg(t, 3.15, 4.2);
        for (let i = 0; i < 8; i++) { c.fillStyle = '#8a7a6a'; c.fillRect(wallX + 10 + Math.cos(i) * k * 50, 100 + Math.sin(i * 2) * 30 + k * k * 60, 9, 9); }
        v.puff(wallX + 13, 104, k);
      }
      // the mech: arm swings to the middle spot, punches
      const armA = v.lerp(0.9, 0, e.out(v.seg(t, 1.5, 1.9))) * (t < 3.4 ? 1 : 0) + (t >= 3.4 ? 0.7 : 0);
      const pk = [2.0, 2.5, 3.0].reduce((m, k) => Math.max(m, t > k && t < k + 0.3 ? Math.sin((t - k) / 0.3 * Math.PI) : 0), 0);
      pw27mMech(v, 110, 150, t, t < 1.6 || t > 3.6 ? t : 0, armA, pk);
      if (pk > 0.8) v.label(hits >= 3 ? 'KRAK!' : 'Bonk!', wallX + 13, 50, 14, v.c.gold);
    },
  });
  // ----- END 27-1 Mech Suit Duo preview -----
  //
  //
  //
  // ----- BEGIN 27-2 Runaway Assembly Line preview -----
  // The belt scrolls left fast with toy robots riding it. Pip rides the belt and hops a stamper; ahead a belt piece is
  // missing. Bo on the catwalk above runs to the switch box and slaps it: the missing piece slides in, Pip rolls over.
  definePreview('Runaway Assembly Line', {
    blurb: 'The belt keeps speeding up! One jumps the gaps and stampers, the other fixes the broken belt ahead.',
    loop: 5, still: 2.3,
    draw(v, t) {
      const c = v.ctx, e = v.ease;
      pw27Hall(v, t, t * 80);
      // the catwalk
      c.fillStyle = '#4a5270'; c.fillRect(0, 70, 320, 5);
      for (let x = -((t * 40) % 20); x < 320; x += 20) c.fillRect(x, 75, 2, 10);
      // the belt with a gap that gets fixed
      const fixed = e.back(v.seg(t, 2.0, 2.4)), gapX = 214;
      c.fillStyle = '#2a2f4f'; v.rr(0, 140, gapX, 14, 6); c.fill(); v.rr(gapX + 40, 140, 80, 14, 6); c.fill();
      c.fillStyle = '#ffc53d';
      for (let x = -((t * 90) % 24); x < 320; x += 24) if (x < gapX - 4 || x > gapX + 40) c.fillRect(x, 142, 10, 3);
      if (fixed > 0) { c.fillStyle = '#5a7a4a'; v.rr(gapX, 140 + (1 - fixed) * 30, 40, 14, 4); c.fill(); }
      else { v.arrow(gapX + 20, 120, gapX + 20, 136, '#ff5f6d'); }
      pw27Floor(v, 0, 164, 320);
      // the stamper
      const sp = v.phase(t, 1.6), down = sp > 0.55 && sp < 0.75 ? 1 : 0;
      c.fillStyle = '#6a7296'; c.fillRect(126, 84, 8, 20 + down * 24); c.fillStyle = '#8a96b4'; v.rr(114, 102 + down * 24, 32, 12, 3); c.fill();
      pw27Stripes(v, 114, 110 + down * 24, 32, 4);
      // Bo runs along the catwalk to the switch box and hits it
      c.fillStyle = '#3c4468'; v.rr(250, 44, 22, 22, 4); c.fill(); v.fillCircle(261, 55, 6, fixed > 0 ? '#7aff9a' : '#ff6b6b');
      const bx = v.lerp(150, 246, e.inOut(v.seg(t, 0.3, 1.8)));
      v.hero(1, bx, 70, { s: 0.85, face: 1, mood: t > 1.9 && t < 2.6 ? 'joy' : 'grit', sq: t > 1.8 && t < 2.0 ? 0.2 : 0 });
      if (t > 1.9 && t < 2.6) v.label('Fixed!', 261, 34, 12, '#7aff9a');
      // Pip on the belt: hops over the stamper zone
      const hop = v.hop(v.seg(t, 0.6, 1.2), 26) + v.hop(v.seg(t, 2.8, 3.4), 18);
      v.hero(0, 90 + Math.sin(t * 2) * 6, 140 + hop, { s: 0.9, face: 1, mood: 'wow' });
      // toy robots riding the belt
      for (let k = 0; k < 4; k++) { const rx = 320 - ((t * 90 + k * 85) % 360); if (rx > gapX - 10 && rx < gapX + 40 && fixed <= 0) continue; c.fillStyle = '#c4cee6'; v.rr(rx - 7, 126, 14, 14, 3); c.fill(); v.fillCircle(rx - 2, 132, 1.5, '#2a2f4f'); v.fillCircle(rx + 3, 132, 1.5, '#2a2f4f'); }
    },
  });
  // ----- END 27-2 Runaway Assembly Line preview -----
  //
  //
  //
  // ----- BEGIN 27-3 Magnet Crane Crew preview -----
  // Bo drives the crane along the rail; Pip stands on the magnet. They pick up a crate, carry it over the pit, drop it in
  // ("Clonk!"), then Pip walks across to the exit.
  definePreview('Magnet Crane Crew', {
    blurb: 'One drives the magnet crane, the other rides it and grabs metal crates to build a path to the exit.',
    loop: 6.4, still: 2.4,
    draw(v, t) {
      const c = v.ctx, e = v.ease;
      pw27Hall(v, t);
      // the rail and the crane cab with Bo
      c.fillStyle = '#4a5270'; c.fillRect(0, 22, 320, 6);
      const mx = t < 0.8 ? 60 : t < 2.2 ? v.lerp(60, 165, e.inOut(v.seg(t, 0.8, 2.2))) : t < 4 ? 165 : v.lerp(165, 120, e.inOut(v.seg(t, 4, 4.8)));
      const low = t < 0.5 ? 0 : t < 0.8 ? 1 : t < 2.2 ? 0 : t < 2.7 ? e.inOut(v.seg(t, 2.2, 2.7)) : t < 3.2 ? 1 - e.inOut(v.seg(t, 2.7, 3.2)) : 0;
      const my = 70 + low * 40 + (t < 0.8 ? e.inOut(v.seg(t, 0.2, 0.5)) * 46 - e.inOut(v.seg(t, 0.5, 0.8)) * 46 : 0);
      c.fillStyle = '#ffc53d'; v.rr(mx - 16, 14, 32, 18, 4); c.fill();
      v.hero(1, mx, 30, { s: 0.55, face: 1, mood: 'grit' });
      v.line(mx, 32, mx, my, '#c4cee6', 2);
      c.fillStyle = '#e8574a'; v.rr(mx - 20, my, 40, 8, 3); c.fill();
      // the ground, the pit and the crates
      pw27Floor(v, 0, 150, 150); pw27Floor(v, 180, 150, 140);
      c.fillStyle = '#2a2f4f'; c.fillRect(150, 150, 30, 30);
      const carrying = t > 0.65 && t < 2.6, placed = t >= 2.6;
      pw27Crate(v, 30, 128, 22, 'steel');
      if (!carrying && !placed) pw27Crate(v, 49, 128, 22, 'steel');
      if (carrying) { pw27Crate(v, mx - 11, my + 8, 22, 'steel'); c.fillStyle = 'rgba(255,240,140,0.5)'; c.fillRect(mx - 14, my + 7, 28, 2); }
      if (placed) pw27Crate(v, 150, 150, 30, 'steel');
      if (t > 2.5 && t < 3.1) v.label('Clonk!', 165, 120, 13, v.c.gold);
      // Pip: rides the magnet until it's back, then walks over the crate to the exit
      const walking = t > 4.8;
      const px = walking ? v.lerp(120, 290, e.inOut(v.seg(t, 4.8, 6.2))) : mx, py = walking ? 150 : my;
      v.hero(0, px, py, { s: 0.8, face: 1, mood: walking ? 'joy' : 'happy' });
      // the exit door
      v.door(290, 150, t > 5.6);
    },
  });
  // ----- END 27-3 Magnet Crane Crew preview -----
  //
  //
  //
  // ----- BEGIN 27-4 Robot Rumble preview -----
  // Parts ride the belt, Pip and Bo snap them onto their robots, then the two robots face off on the platform over the
  // foam: Pip's robot charges (gold glow), lunges, KA-POW, Bo's robot tumbles into the pink foam.
  const pw27rBot = (v, x, feet, id, face, o = {}) => {
    const c = v.ctx, col = id ? '#4fa8ff' : '#ff6b5a';
    c.fillStyle = '#2a2f4f'; v.rr(x - 15, feet - 10, 30, 10, 5); c.fill();
    c.fillStyle = '#9aa8c8'; c.strokeStyle = '#2a2f4f'; c.lineWidth = 1.6; v.rr(x - 14, feet - 34, 28, 24, 5); c.fill(); c.stroke();
    c.fillStyle = col; c.fillRect(x - 12, feet - 16, 24, 3);
    v.hero(id, x, feet - 16, { s: 0.5, face, mood: o.mood || 'grit' });
    c.fillStyle = '#c4cee6'; v.rr(x - 9, feet - 48, 18, 14, 4); c.fill(); c.stroke();
    const reach = o.lunge ? 18 : 0, fx = x + face * (20 + reach);
    v.line(x + face * 12, feet - 26, fx, feet - 24, '#5d6a8e', 4);
    v.fillCircle(fx, feet - 24, 6, '#e8574a');
    if (o.charge) { c.strokeStyle = o.charge >= 1 ? v.c.gold : 'rgba(255,255,255,0.8)'; c.lineWidth = 2; v.circle(fx, feet - 24, 8 + o.charge * 3); c.stroke(); }
  };
  definePreview('Robot Rumble', {
    blurb: 'Grab parts off the belt to build your robot fast, then wrestle! Push the other robot off the platform.',
    loop: 6, still: 4.0,
    draw(v, t) {
      const c = v.ctx, e = v.ease;
      pw27Hall(v, t);
      if (t < 2.4) {
        // build: parts slide along the belt toward each pad, the heroes run them home
        pw27Floor(v, 0, 150, 320);
        c.fillStyle = '#2a2f4f'; v.rr(100, 112, 120, 9, 4); c.fill();
        c.fillStyle = '#5a6488'; c.beginPath(); c.moveTo(140, 70); c.lineTo(180, 70); c.lineTo(168, 92); c.lineTo(152, 92); c.closePath(); c.fill();
        for (const d of [-1, 1]) for (let k = 0; k < 2; k++) { const px = 160 + d * (8 + ((t * 40 + k * 45) % 60)); c.fillStyle = 'rgba(28,26,54,0.8)'; v.rr(px - 7, 99, 14, 13, 3); c.fill(); v.fillCircle(px, 105, 3, k ? '#e8574a' : '#c4cee6'); }
        for (const id of [0, 1]) {
          const padX = id ? 290 : 30;
          c.fillStyle = id ? '#4fa8ff' : '#ff6b5a'; v.rr(padX - 22, 146, 44, 5, 2); c.fill();
          c.strokeStyle = 'rgba(255,255,255,0.5)'; c.setLineDash([3, 3]); v.rr(padX - 14, 104, 28, 40, 5); c.stroke(); c.setLineDash([]);
          const k = v.pingpong(v.phase(t, 1.2)), hx = v.lerp(id ? 290 : 30, id ? 236 : 84, k);
          v.hero(id, hx, 150, { s: 0.8, face: (k < 0.5 ? 1 : -1) * (id ? -1 : 1), mood: 'joy' });
        }
        v.pill('Build your robot!', 160, 22, { size: 10 });
      } else {
        // rumble on the platform over the foam
        c.fillStyle = '#ff9fd6'; c.fillRect(0, 150, 320, 30);
        for (let x = 6; x < 320; x += 16) v.fillCircle(x, 152 + Math.sin(t * 2 + x) * 2, 8, '#ffc3e6');
        c.fillStyle = '#8a96b4'; c.fillRect(60, 120, 200, 10); pw27Stripes(v, 60, 120, 6, 10); pw27Stripes(v, 254, 120, 6, 10);
        c.fillStyle = '#4a5270'; c.fillRect(145, 130, 30, 22);
        const ch = v.seg(t, 2.6, 3.6), lunge = t > 3.6 && t < 3.85, hit = t > 3.7;
        const kb = e.out(v.seg(t, 3.7, 4.6)), fall = v.seg(t, 4.3, 5.0);
        const bx = 190 + kb * 90, by = 120 + fall * fall * 50, ax = 130 + (lunge ? 14 : 0);
        pw27rBot(v, ax, 120, 0, 1, { charge: t < 3.6 ? ch : 0, lunge, mood: hit ? 'joy' : 'grit' });
        c.save(); if (hit) { c.translate(bx, by - 20); c.rotate(kb * 0.6); c.translate(-bx, -(by - 20)); }
        pw27rBot(v, bx, by, 1, -1, { mood: hit ? 'dizzy' : 'grit' });
        c.restore();
        if (t > 3.7 && t < 4.4) v.label('KA-POW!', 170, 72, 16, v.c.gold);
        if (t > 4.9) v.label('Sploosh!', 280, 140, 13, '#ff6bb5');
      }
    },
  });
  // ----- END 27-4 Robot Rumble preview -----
}
