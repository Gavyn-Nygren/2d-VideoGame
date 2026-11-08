/* Pip & Bo - World page previews: World 25 Zombie Acres (25-1 Defend the Heart). See js/previews/preview-core.js.
   Every top-level name starts with pw25. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 25-1 Defend the Heart preview -----
  // A moonlit farm with the glowing heart crystal on its pedestal in the middle. On the left Pip holds to work: a wood
  // block pops onto the stone wall, then she upgrades it to stone (a tier tag shows which). On the right a zombie
  // shuffles in; Bo taps three shots (muzzle flash, tracer), it topples back and fades, and a coin flies to the
  // counter. Meanwhile a helmeted digger zombie reaches the wall and chips at it, and the next zombie walks in.
  // The zombies are drawn like drawZombie in js/levels/world25/defend-the-heart.js (that one paints the game canvas).
  const PW25_L = 6, PW25_GY = 138, PW25_S = 16, PW25_WX = 40;
  const PW25_TAU = Math.PI * 2;
  const PW25_BLK = {
    dirt: { main: '#7a5034', dark: '#5c3a24', light: '#94643f' }, wood: { main: '#a8743f', dark: '#6e4824', light: '#c48e55' },
    stone: { main: '#7f8494', dark: '#555a69', light: '#a1a6b4' },
  };
  const PW25_SHOTS = [2.0, 2.5, 3.0];
  const PW25_DIE = 3.0;

  // a built block (drawn like drawCell at 30px, scaled down), top-left at (x, y); crack 0..1
  const pw25Block = (v, x, y, kind, crack, pop) => {
    const c = v.ctx, k = PW25_BLK[kind], sc = PW25_S / 30;
    c.save(); c.translate(x + PW25_S / 2, y + PW25_S / 2); c.scale(sc * pop, sc * pop); c.translate(-15, -15);
    c.fillStyle = k.main; c.fillRect(0, 0, 30, 30);
    if (kind === 'wood') {
      c.fillStyle = k.dark; c.fillRect(0, 9, 30, 2); c.fillRect(0, 19, 30, 2);
      c.fillStyle = k.light; c.fillRect(2, 2, 26, 3);
    } else if (kind === 'stone') {
      c.fillStyle = k.dark; c.fillRect(0, 14, 30, 2); c.fillRect(14, 0, 2, 14); c.fillRect(6, 16, 2, 14); c.fillRect(22, 16, 2, 14);
      c.fillStyle = k.light; c.fillRect(2, 2, 10, 3); c.fillRect(17, 2, 10, 3);
    }
    c.strokeStyle = k.dark; c.lineWidth = 2; c.strokeRect(1, 1, 28, 28);
    if (crack > 0) {
      c.strokeStyle = 'rgba(20,18,30,0.85)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(6, 4); c.lineTo(13, 13); c.lineTo(9, 20);
      if (crack > 0.4) { c.moveTo(13, 13); c.lineTo(23, 10); c.lineTo(26, 18); }
      if (crack > 0.7) { c.moveTo(9, 20); c.lineTo(18, 27); c.moveTo(20, 4); c.lineTo(16, 12); }
      c.stroke();
    }
    c.restore();
  };

  // a zombie with its feet at (x, y): o.face, o.s, o.t, o.walk, o.dig, o.dead (seconds since it fell), o.flash, o.kind, o.cloth
  const pw25Zombie = (v, x, y, o) => {
    const c = v.ctx, f = o.face, t = o.t, s = o.s || 0.75, dig = !!o.dig, digger = o.kind === 'digger';
    const skin = digger ? '#93a582' : '#8aa37c', skinDk = digger ? '#647558' : '#5f7655';
    const lurch = o.walk ? Math.sin(t * 7) : 0;
    c.save(); c.translate(x, y);
    if (o.dead != null) {
      const u = Math.min(1, o.dead / 0.35);
      c.globalAlpha *= Math.max(0, 1 - Math.max(0, o.dead - 0.8) / 0.6);
      c.rotate(-f * v.ease.in(u) * Math.PI / 2);
    }
    c.scale(s * f, s);
    if (o.flash) c.globalAlpha *= 0.55;
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(0, 0, 11, 2.5, 0, 0, PW25_TAU); c.fill();
    c.rotate(0.06 * lurch + 0.08);
    c.strokeStyle = '#2f3240'; c.lineWidth = 4.5; c.lineCap = 'round';
    const lw = lurch * 4;
    c.beginPath(); c.moveTo(-4, -11); c.lineTo(-4 + lw, 0); c.moveTo(4, -11); c.lineTo(4 - lw, 0); c.stroke();
    // torn shirt
    c.fillStyle = o.cloth; c.strokeStyle = '#1c1a24'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(-8, -23); c.lineTo(8, -23); c.lineTo(9, -11); c.lineTo(6, -9); c.lineTo(4, -12); c.lineTo(1, -9);
    c.lineTo(-2, -12); c.lineTo(-5, -9); c.lineTo(-9, -11); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = skin; c.fillRect(-3, -19, 3, 3);
    // arms reaching forward
    const reach = dig ? Math.sin(t * 16) * 3 : Math.sin(t * 3) * 1.5;
    c.strokeStyle = skinDk; c.lineWidth = 4.2;
    c.beginPath(); c.moveTo(5, -21); c.lineTo(16 + reach, -20 + (dig ? 5 : 0)); c.moveTo(1, -18); c.lineTo(14 - reach, -15 + (dig ? 6 : 0)); c.stroke();
    c.strokeStyle = skin; c.lineWidth = 2.6; c.stroke();
    if (digger) {
      c.strokeStyle = '#5a3d26'; c.lineWidth = 2; c.beginPath(); c.moveTo(10, -21); c.lineTo(18, -8 + reach); c.stroke();
      c.strokeStyle = '#9aa0ae'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(13, -6 + reach); c.quadraticCurveTo(19, -12 + reach, 23, -6 + reach); c.stroke();
    }
    // head, sunken eyes with dim pale pupils, a crooked mouth
    c.fillStyle = skin; c.strokeStyle = '#33402d'; c.lineWidth = 1.6;
    c.beginPath(); c.ellipse(1, -30, 8.5, 8, 0, 0, PW25_TAU); c.fill(); c.stroke();
    c.fillStyle = '#2a2e26'; c.beginPath(); c.ellipse(4.5, -31.5, 2.8, 2.4, 0, 0, PW25_TAU); c.fill();
    c.beginPath(); c.ellipse(-2, -31.5, 2.4, 2.1, 0, 0, PW25_TAU); c.fill();
    if (o.dead == null) { c.fillStyle = '#e8e2a0'; v.circle(5, -31.5, 1); c.fill(); v.circle(-1.6, -31.5, 0.9); c.fill(); }
    c.strokeStyle = '#1c1a1a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-2.5, -25.5); c.lineTo(1, -24.5); c.lineTo(3, -25.8); c.lineTo(6.5, -24.8); c.stroke();
    c.strokeStyle = 'rgba(40,50,35,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-5, -36); c.lineTo(-2, -34); c.stroke();
    if (digger) {
      c.fillStyle = '#c9a23a'; c.strokeStyle = '#1c1a24'; c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(1, -35.5, 9.5, 4.5, 0, Math.PI, 0); c.fill(); c.stroke(); c.fillRect(-10, -36, 21, 2);
      c.fillStyle = '#fff6c8'; v.circle(8, -38, 1.8); c.fill();
    }
    c.restore();
  };

  // the heart crystal on its pedestal, feet of the pedestal at (x, y)
  const pw25Heart = (v, x, y, t) => {
    const c = v.ctx, pulse = 1 + Math.sin(t * PW25_TAU / 2) * 0.05, cy = y - 30 + Math.sin(t * PW25_TAU / 3) * 1.5;
    c.fillStyle = '#3d3a4a'; v.rr(x - 17, y - 8, 34, 8, 2); c.fill();
    c.fillStyle = '#56526a'; v.rr(x - 14, y - 11, 28, 4, 1.5); c.fill();
    c.save(); c.translate(x, cy); c.scale(0.62 * pulse, 0.62 * pulse);
    const glow = c.createRadialGradient(0, 0, 4, 0, 0, 56);
    glow.addColorStop(0, 'rgba(255,70,110,0.6)'); glow.addColorStop(1, 'rgba(255,70,110,0)');
    c.fillStyle = glow; v.circle(0, 0, 56); c.fill();
    c.beginPath(); c.moveTo(0, 20);
    c.lineTo(-22, -2); c.lineTo(-18, -16); c.lineTo(-8, -20); c.lineTo(0, -12); c.lineTo(8, -20); c.lineTo(18, -16); c.lineTo(22, -2); c.closePath();
    const g = c.createLinearGradient(-20, -20, 20, 20); g.addColorStop(0, '#ff7a9c'); g.addColorStop(1, '#b0123f');
    c.fillStyle = g; c.fill(); c.lineWidth = 2; c.strokeStyle = '#6e0a26'; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-18, -14); c.lineTo(0, 20); c.moveTo(18, -14); c.lineTo(0, 20); c.moveTo(0, -12); c.lineTo(0, 20); c.stroke();
    c.restore();
    // a soft red light on the ground
    c.fillStyle = 'rgba(255,80,110,0.12)'; c.beginPath(); c.ellipse(x, y, 46, 6, 0, 0, PW25_TAU); c.fill();
  };

  const pw25Tree = (v, x, y, h) => {
    const c = v.ctx;
    c.fillStyle = '#4a3220'; c.fillRect(x - 3, y - h, 6, h);
    c.fillStyle = '#5e4129'; c.fillRect(x - 3, y - h, 2, h);
    const cols = ['#1f4a2c', '#275a34', '#2f6b3c'];
    for (let i = 0; i < 3; i++) { c.fillStyle = cols[i]; v.circle(x + (i - 1) * 6, y - h - 2 + (i === 1 ? -6 : 0), 10 - i); c.fill(); }
    c.fillStyle = 'rgba(180,220,255,0.08)'; v.circle(x - 3, y - h - 9, 5); c.fill();
  };

  const pw25Coin = (v, x, y, r) => {
    const c = v.ctx;
    c.fillStyle = '#c8901c'; v.circle(x, y, r); c.fill();
    c.fillStyle = '#ffd04a'; v.circle(x, y, r * 0.75); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(x - r * 0.25, y - r * 0.5, r * 0.25, r);
  };

  // the scene behind everything: sky, moon, stars, hills, a barn, trees, the farm ground
  const pw25Back = (v, t) => {
    const c = v.ctx, gy = PW25_GY;
    v.sky();
    c.fillStyle = '#e6e6ff';
    for (let i = 0; i < 28; i++) {
      const sx = v.rand(i * 3 + 1) * v.W, sy = v.rand(i * 3 + 2) * 80, tw = 0.35 + 0.35 * Math.sin(t * PW25_TAU / 3 + i * 1.7);
      c.globalAlpha = tw; c.fillRect(sx, sy, 1.3, 1.3);
    }
    c.globalAlpha = 1;
    v.sun(236, 34, 12);
    c.fillStyle = 'rgba(150,150,140,0.35)'; v.circle(232, 31, 3); c.fill(); v.circle(240, 38, 2); c.fill();
    v.hills(gy - 22, 0);
    // a far barn
    c.fillStyle = '#1b2232'; c.fillRect(250, gy - 40, 34, 30);
    c.beginPath(); c.moveTo(246, gy - 40); c.lineTo(267, gy - 56); c.lineTo(288, gy - 40); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,200,110,0.35)'; c.fillRect(263, gy - 34, 7, 7);
    // a fence
    c.fillStyle = '#3a3040';
    for (let x = 94; x < 232; x += 14) c.fillRect(x, gy - 14, 2.5, 14);
    c.fillRect(92, gy - 11, 142, 2); c.fillRect(92, gy - 6, 142, 2);
    pw25Tree(v, 104, gy, 34); pw25Tree(v, 224, gy, 40); pw25Tree(v, 12, gy, 30); pw25Tree(v, 312, gy, 36);
    // ground: dirt with grass, stone further down
    const D = PW25_BLK.dirt, S = PW25_BLK.stone;
    c.fillStyle = D.main; c.fillRect(0, gy, v.W, 26);
    c.fillStyle = S.main; c.fillRect(0, gy + 26, v.W, v.H - gy - 26);
    c.fillStyle = D.dark; c.beginPath();
    for (let i = 0; i < 20; i++) {
      const x = i * PW25_S;
      c.rect(x + 3 + v.rand(i * 7) * 10, gy + 10 + v.rand(i * 7 + 1) * 12, 2.2, 2.2);
      c.rect(x + 4 + v.rand(i * 7 + 2) * 10, gy + 16 + v.rand(i * 7 + 3) * 8, 1.8, 1.8);
    }
    c.fill();
    c.fillStyle = S.dark; c.beginPath();
    for (let i = 0; i < 20; i++) c.rect(i * PW25_S + 2 + v.rand(i * 7 + 4) * 6, gy + 29 + v.rand(i * 7 + 5) * 4, 6, 4);
    c.fill();
    c.fillStyle = S.light; c.beginPath();
    for (let i = 0; i < 20; i++) c.rect(i * PW25_S + 8 + v.rand(i * 7 + 6) * 5, gy + 37, 4, 3);
    c.fill();
    c.fillStyle = '#3a7a33'; c.fillRect(0, gy, v.W, 4);
    c.fillStyle = '#5fae4a'; c.fillRect(0, gy, v.W, 2.5);
  };

  definePreview('Defend the Heart', {
    blurb: 'Build a fort round the heart crystal, then hold off endless zombie waves!',
    loop: PW25_L,
    still: 3.08,
    draw(v, t) {
      const c = v.ctx, gy = PW25_GY, wx = PW25_WX, S = PW25_S;
      pw25Back(v, t);
      pw25Heart(v, 160, gy, t);

      /* ----- Pip's wall on the left ----- */
      const placeT = 1.0, upT = 2.3;
      // the bottom block: stone, chipped by the digger later
      const crack = v.seg(t, 4.1, 5.6);
      const shake = t > 3.9 && t < 5.8 ? Math.sin(t * 50) * 0.6 : 0;
      pw25Block(v, wx + shake, gy - S, 'stone', crack, 1);
      if (t >= placeT) {
        const pop = 0.55 + 0.45 * v.ease.back(v.seg(t, placeT, placeT + 0.25));
        pw25Block(v, wx, gy - 2 * S, t >= upT ? 'stone' : 'wood', 0, pop);
        if (t >= upT && t < upT + 0.18) { c.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - (t - upT) / 0.18)).toFixed(2) + ')'; c.fillRect(wx, gy - 2 * S, S, S); }
        if (t >= upT) v.sparkle(wx + S / 2, gy - 1.5 * S, v.seg(t, upT, upT + 0.7));
        else v.puff(wx + S / 2, gy - 1.5 * S, v.seg(t, placeT, placeT + 0.5));
      }
      // the tier tag over the new block
      const tagA = t >= placeT && t < 3.6 ? Math.min(v.seg(t, placeT, placeT + 0.15), 1 - v.seg(t, 3.3, 3.6)) : 0;
      if (tagA > 0) {
        c.save(); c.globalAlpha = tagA;
        const up = t >= upT;
        v.pill(up ? 'stone' : 'wood', wx + S / 2, gy - 2 * S - 12, { size: 8, bg: up ? '#555a69' : '#6e4824', col: '#ffffff' });
        c.restore();
      }
      // the work ring while Pip holds
      const hold = (t > 0.35 && t < placeT) ? v.seg(t, 0.35, placeT) : (t > 1.55 && t < upT) ? v.seg(t, 1.55, upT) : 0;
      if (hold > 0) {
        const rx = wx + S / 2, ry = gy - 1.5 * S;
        c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 2; v.circle(rx, ry, 10); c.stroke();
        c.strokeStyle = '#ffd36b'; c.beginPath(); c.arc(rx, ry, 10, -Math.PI / 2, -Math.PI / 2 + PW25_TAU * hold); c.stroke();
      }
      const working = hold > 0;
      v.hero(0, 68, gy, { s: 0.85, face: -1, sq: working ? Math.sin(t * 34) * 0.07 : 0,
        mood: working ? 'grit' : t > 3.6 ? 'wow' : 'happy' });

      /* ----- the digger at the wall ----- */
      if (t > 2.6) {
        const k = v.seg(t, 2.6, 3.9), zx = v.lerp(-18, 28, k), digging = t >= 3.9;
        pw25Zombie(v, zx, gy, { face: 1, t, walk: !digging, dig: digging, kind: 'digger', cloth: '#6b6145' });
        if (digging) for (let i = 0; i < 3; i++) {
          const p = v.phase(t, 0.45, i * 0.15), a = p * 0.45;
          c.fillStyle = i % 2 ? '#a1a6b4' : '#555a69';
          c.fillRect(wx - 3 - p * 16 - i * 2, gy - 12 - 50 * a + 60 * a * a, 2.5, 2.5);
        }
      }

      /* ----- Bo and the zombie on the right ----- */
      const bx = 196;
      let lastShot = -9;
      for (const s of PW25_SHOTS) if (t >= s) lastShot = s;
      const since = t - lastShot, kick = since < 0.12 ? (1 - since / 0.12) * 2 : 0;
      v.hero(1, bx - kick, gy, { s: 0.85, face: 1, mood: t > PW25_DIE + 0.4 && t < 4.6 ? 'joy' : 'grit' });
      // a chunky toy-ish blaster
      const mx = bx + 15 - kick, my = gy - 10;
      c.fillStyle = '#3a3f4a'; v.rr(bx + 3 - kick, my - 2.5, 12, 5, 1.5); c.fill();
      c.fillStyle = '#ff9a3c'; c.fillRect(bx + 5 - kick, my - 1, 3, 2);
      c.fillStyle = '#23262e'; c.fillRect(bx + 6 - kick, my + 2, 3, 4);

      // the walker: shuffles in, hit three times, topples back and fades
      const zt = Math.min(t, PW25_DIE), zx = 338 - 30 * Math.max(0, zt - 0.2) + (t > PW25_DIE ? 4 * v.ease.out(v.seg(t, PW25_DIE, PW25_DIE + 0.3)) : 0);
      const hit = PW25_SHOTS.some(s => t >= s + 0.04 && t < s + 0.12);
      if (t < PW25_DIE + 1.5) pw25Zombie(v, zx, gy, { face: -1, t, walk: t < PW25_DIE, cloth: '#5a5f7a', flash: hit && t < PW25_DIE + 0.04, dead: t >= PW25_DIE + 0.04 ? t - PW25_DIE - 0.04 : null });
      // tracer and muzzle flash
      if (since < 0.1) {
        const ex = zx - 6, ey = gy - 17, a = 1 - since / 0.1;
        c.strokeStyle = 'rgba(255,230,140,' + (0.9 * a).toFixed(2) + ')'; c.lineWidth = 1.6; c.lineCap = 'round';
        c.beginPath(); c.moveTo(mx + (ex - mx) * Math.max(0, since / 0.1 - 0.3), my); c.lineTo(ex, ey); c.stroke();
        if (since < 0.06) { v.star(mx + 3, my, 4.5, '#ffe37a'); v.fillCircle(mx + 2, my, 2, '#ffffff'); }
        if (since > 0.03) { c.fillStyle = 'rgba(255,240,200,' + a.toFixed(2) + ')'; v.circle(ex, ey, 3 * a); c.fill(); }
      }

      // the coin pops up and flies to the counter
      const ck = v.seg(t, PW25_DIE + 0.25, PW25_DIE + 1.25);
      const counted = t >= PW25_DIE + 1.25;
      if (ck > 0 && ck < 1) {
        const ox = zx, oy = gy - 22;
        const up = v.seg(ck, 0, 0.35), fly = v.ease.in(v.seg(ck, 0.35, 1));
        const px = v.lerp(ox, 286, fly), py = v.lerp(oy - 18 * v.ease.out(up), 14, fly);
        pw25Coin(v, px, py, 4.5 * (1 - 0.3 * fly) * Math.abs(Math.cos(t * 9)) + 1);
      }
      if (counted && t < PW25_DIE + 1.9) v.label('+1', 300, 30 - 6 * v.seg(t, PW25_DIE + 1.25, PW25_DIE + 1.9), 9, '#ffd04a');

      // the next one shuffling in
      if (t > 4.3) pw25Zombie(v, 338 - 28 * (t - 4.3), gy, { face: -1, t: t + 1.3, walk: true, cloth: '#6e4a4a', s: 0.8 });

      /* ----- HUD bits ----- */
      v.pill('Wave 7', 8, 12, { size: 9, align: 'left', bg: 'rgba(20,18,34,0.82)', col: '#ffffff' });
      c.fillStyle = 'rgba(20,18,34,0.82)'; v.rr(274, 5, 40, 16, 8); c.fill();
      pw25Coin(v, 284, 13, 4.5);
      v.text(counted ? '13' : '12', 294, 13.5, 9, '#ffffff', 'left');

      // a quick dip to night at the loop's seam
      const fade = Math.max(1 - t / 0.25, v.seg(t, PW25_L - 0.25, PW25_L));
      if (fade > 0) { c.fillStyle = 'rgba(10,10,24,' + (0.7 * fade).toFixed(2) + ')'; c.fillRect(0, 0, v.W, v.H); }
    },
  });
  // ----- END 25-1 Defend the Heart preview -----
}
