/* Pip & Bo - Level previews for World 18 Pirate Cove (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw18. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 18-1 Runaway Ship preview -----
  // (preview goes here)
  // ----- END 18-1 Runaway Ship preview -----
  //
  //
  //
  // ----- BEGIN 18-2 Grapple & Zip preview -----
  // (preview goes here)
  // ----- END 18-2 Grapple & Zip preview -----
  //
  //
  //
  // ----- BEGIN 18-3 Tide Pool Dig preview -----
  // (preview goes here)
  // ----- END 18-3 Tide Pool Dig preview -----
  //
  //
  //
  // ----- BEGIN 18-4 Plank Duel preview -----
  // Pip swings high and Bo blocks (Clack!), Bo swings low and Pip hops over it, Pip bonks Bo back, then a charged lunge
  // sends Bo teetering off the end: SPLASH! Bo bobs up laughing in the duck float, a fish jumps, Pip wins.
  const pw18pPY = 118, pw18pSea = 140, pw18pE0 = 52, pw18pE1 = 268;
  // the moments of the loop (seconds)
  const pw18pT = { wind1: 0.5, hit1: 0.95, wind2: 1.4, hit2: 1.85, wind3: 2.4, hit3: 2.8, charge: 3.15, lunge: 3.75, hit4: 3.95, fall: 4.45, splash: 4.75, win: 5.0 };
  // where each stands at time t (x of the feet)
  const pw18pX = (v, t) => {
    const T = pw18pT, e = v.ease.out;
    let pip = 132, bo = 186;
    // a block pushes both apart a little
    const kb = e(v.seg(t, T.hit1, T.hit1 + 0.25)); pip -= 5 * kb; bo += 5 * kb;
    // the high bonk sends Bo back, and Pip steps in
    const k3 = e(v.seg(t, T.hit3, T.hit3 + 0.35)); bo += 42 * k3;
    pip += 32 * v.ease.inOut(v.seg(t, T.hit3 + 0.15, T.charge));
    // the lunge: Pip dashes, Bo slides to the end and teeters
    pip += 30 * v.seg(t, T.lunge, T.hit4);
    const k4 = e(v.seg(t, T.hit4, T.hit4 + 0.4)); bo += (pw18pE1 + 4 - 233) * k4;
    return { pip, bo };
  };
  const pw18pSword = (v, x, y, ang, id, glow) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    if (glow) { ctx.fillStyle = 'rgba(255,230,120,' + (0.3 + 0.4 * glow).toFixed(2) + ')'; v.rr(0, -6, 26, 12, 6); ctx.fill(); }
    ctx.fillStyle = '#5a3a1e'; v.rr(-4, -1.5, 5, 3, 1.5); ctx.fill();
    ctx.fillStyle = v.c.gold; v.rr(0.5, -4, 2, 8, 1); ctx.fill();
    ctx.fillStyle = id ? '#7fb8ff' : '#ffa25a'; ctx.strokeStyle = id ? v.c.boDark : v.c.pipDark; ctx.lineWidth = 1;
    v.rr(2.5, -2.2, 20, 4.4, 2.2); ctx.fill(); ctx.stroke();
    ctx.restore();
  };
  const pw18pHat = (v, x, y, s, id) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#2b2a4a'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-9, -13, 0, -10); ctx.quadraticCurveTo(9, -13, 14, 0); ctx.quadraticCurveTo(0, -4, -14, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = id ? v.c.bo : v.c.pip; ctx.fillRect(-11, -4, 22, 2.2);
    ctx.restore();
    v.star(x, y - 7 * s, 3 * s, v.c.gold);
  };
  // a hero with a pirate hat and a foam sword (feet at x, y); ang: the sword (0 ahead, negative up)
  const pw18pFighter = (v, id, x, y, o) => {
    const s = 0.95, face = id ? -1 : 1, ctx = v.ctx;
    ctx.save();
    if (o.rot) { ctx.translate(x, y - 12); ctx.rotate(o.rot * face); ctx.translate(-x, -(y - 12)); }
    v.hero(id, x, y, { s, face, mood: o.mood, sq: o.sq || 0, shadow: o.shadow !== false && !o.rot });
    pw18pHat(v, x, y - 24 * s * (1 - (o.sq || 0) * 0.3) - 1, 0.9, id);
    pw18pSword(v, x + face * 8, y - 11, face > 0 ? o.ang : Math.PI - o.ang, id, o.glow || 0);
    ctx.restore();
  };
  const pw18pDuck = (v, x, y, s) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = '#d9a32a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 1, 18, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2aa3c4'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd34d'; v.circle(16, -7, 5.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.moveTo(20.5, -8); ctx.lineTo(26, -6); ctx.lineTo(20.5, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = v.c.ink; v.circle(18, -9, 1); ctx.fill();
    ctx.restore();
  };
  const pw18pFish = (v, x, y, s, face, rot) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * face, s);
    ctx.fillStyle = '#ffb03a'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-14, -5); ctx.lineTo(-14, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; v.circle(4.5, -1.3, 2); ctx.fill(); ctx.fillStyle = v.c.ink; v.circle(5, -1.3, 1); ctx.fill();
    ctx.restore();
  };
  const pw18pScene = (v, t) => {
    const ctx = v.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, 100);
    g.addColorStop(0, '#46b8ec'); g.addColorStop(1, '#fff2cf');
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, 100);
    v.sun(282, 28, 13);
    v.cloud(((t * 5) % 380) - 40, 26, 0.8); v.cloud(((t * 3 + 200) % 380) - 40, 46, 0.6);
    // far sea and an island
    const sg = ctx.createLinearGradient(0, 96, 0, pw18pSea);
    sg.addColorStop(0, '#3fb7cf'); sg.addColorStop(1, '#2aa3c4');
    ctx.fillStyle = sg; ctx.fillRect(0, 96, v.W, pw18pSea - 96);
    ctx.fillStyle = '#7fd0b8'; ctx.beginPath(); ctx.ellipse(110, 99, 46, 8, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#f2d68c'; ctx.beginPath(); ctx.ellipse(110, 99, 42, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    v.line(104, 99, 106, 76, '#a8743f', 2.5);
    ctx.fillStyle = '#3f9e46';
    for (let i = 0; i < 5; i++) { const a = i * 1.3 - 2.6; ctx.beginPath(); ctx.ellipse(106 + Math.cos(a) * 7, 76 + Math.sin(a) * 3, 8, 2.5, a, 0, Math.PI * 2); ctx.fill(); }
    for (let i = 0; i < 9; i++) { const x = (i * 41 + t * 6) % v.W, y = 104 + (i * 13) % 30; ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.3 * Math.sin(t * 3 + i)).toFixed(2) + ')'; ctx.fillRect(x, y, 7, 1.2); }
    // two ships at the sides, flags for Pip and Bo
    for (const id of [0, 1]) {
      const sx = id ? 304 : 16, f = id ? -1 : 1, by = 112 + Math.sin(t * 1.4 + id * 2) * 1.2;
      ctx.fillStyle = '#7d5030'; ctx.fillRect(sx + f * 6 - 1.5, by - 62, 3, 52);
      ctx.fillStyle = '#fbf3e0'; ctx.beginPath(); ctx.moveTo(sx + f * 4, by - 58); ctx.quadraticCurveTo(sx - f * 12, by - 40, sx + f * 4, by - 22); ctx.closePath(); ctx.fill();
      v.star(sx - f * 2, by - 40, 5, id ? v.c.bo : v.c.pip);
      ctx.fillStyle = id ? v.c.bo : v.c.pip; ctx.beginPath(); ctx.moveTo(sx + f * 6, by - 62); ctx.lineTo(sx + f * 18, by - 58 + Math.sin(t * 6) * 1.5); ctx.lineTo(sx + f * 6, by - 54); ctx.fill();
      ctx.fillStyle = '#9a6136'; ctx.beginPath(); ctx.moveTo(sx - f * 30, by - 12); ctx.lineTo(sx + f * 34, by - 14); ctx.lineTo(sx + f * 24, by + 6); ctx.lineTo(sx - f * 22, by + 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = id ? v.c.bo : v.c.pip; ctx.fillRect(Math.min(sx - f * 30, sx + f * 34), by - 15, 64, 2.5);
    }
    // Captain Polly on her post
    v.line(160, pw18pPY, 160, 58, '#7d5030', 3);
    const pol = 54 + Math.sin(t * 2.4) * 0.8;
    ctx.fillStyle = '#ff4f5f'; ctx.beginPath(); ctx.ellipse(160, pol - 4, 4.5, 6.5, 0, 0, Math.PI * 2); ctx.fill(); v.circle(161.5, pol - 12, 4); ctx.fill();
    ctx.fillStyle = '#3d8bff'; ctx.beginPath(); ctx.ellipse(158, pol - 4, 2.5, 5, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2e3b0'; ctx.beginPath(); ctx.moveTo(165, pol - 12); ctx.lineTo(169, pol - 10); ctx.lineTo(165, pol - 8); ctx.fill();
    ctx.fillStyle = '#2b2a4a'; ctx.beginPath(); ctx.moveTo(156, pol - 15); ctx.quadraticCurveTo(161, pol - 22, 166, pol - 15); ctx.fill();
    // rock, barrel, posts and the plank
    ctx.fillStyle = '#7a7f8e'; ctx.beginPath(); ctx.ellipse(160, pw18pSea + 2, 40, 12, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#c98e57'; v.rr(150, pw18pPY + 4, 20, pw18pSea - pw18pPY - 6, 4); ctx.fill();
    ctx.fillStyle = '#5a5a6a'; ctx.fillRect(150, pw18pPY + 7, 20, 1.5); ctx.fillRect(150, pw18pSea - 7, 20, 1.5);
    for (const px of [92, 228]) { ctx.fillStyle = '#7d5030'; ctx.fillRect(px - 2.5, pw18pPY + 4, 5, pw18pSea - pw18pPY); }
    ctx.fillStyle = '#7d5030'; v.rr(pw18pE0 - 6, pw18pPY, pw18pE1 - pw18pE0 + 12, 6, 2); ctx.fill();
    ctx.fillStyle = '#c98e57'; v.rr(pw18pE0 - 6, pw18pPY, pw18pE1 - pw18pE0 + 12, 4, 2); ctx.fill();
    ctx.fillStyle = '#fbf3e0'; for (const e of [pw18pE0 - 3, pw18pE1 + 1]) ctx.fillRect(e, pw18pPY, 2, 4);
    // the lagoon
    const lg = ctx.createLinearGradient(0, pw18pSea, 0, v.H);
    lg.addColorStop(0, '#2aa3c4'); lg.addColorStop(1, '#136b93');
    ctx.fillStyle = lg; ctx.fillRect(0, pw18pSea, v.W, v.H - pw18pSea);
    ctx.fillStyle = '#e8c97f'; ctx.fillRect(0, v.H - 9, v.W, 9);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x <= v.W; x += 6) ctx.lineTo(x, pw18pSea + Math.sin(x / 9 + t * 3) * 1.2);
    ctx.stroke();
    for (let i = 0; i < 3; i++) pw18pFish(v, (i * 120 + t * (14 + i * 4)) % 360 - 20, 152 + i * 9, 0.8, 1, 0);
  };
  definePreview('Plank Duel', {
    blurb: 'Swing high or low, block, hop, then bonk them off the plank. SPLASH!',
    loop: 6.4,
    still: 4.0,
    draw(v, t) {
      const ctx = v.ctx, T = pw18pT, D = Math.PI / 180;
      pw18pScene(v, t);
      const xs = pw18pX(v, t);
      // Pip: wind high, strike, hop over the low swing, wind and bonk, charge and lunge, cheer
      let pa = -72 * D, pMood = 'happy', pY = pw18pPY, pGlow = 0, pRot = 0;
      if (t >= T.wind1 && t < T.hit1) { pa = -150 * D; pMood = 'grit'; }
      else if (t >= T.hit1 && t < T.hit1 + 0.2) pa = -8 * D;
      else if (t >= T.hit2 - 0.3 && t < T.hit2 + 0.25) { pY += v.hop(v.seg(t, T.hit2 - 0.3, T.hit2 + 0.25), 16); pa = -40 * D; pMood = 'joy'; }
      else if (t >= T.wind3 && t < T.hit3) { pa = -150 * D; pMood = 'grit'; }
      else if (t >= T.hit3 && t < T.hit3 + 0.2) pa = -8 * D;
      else if (t >= T.charge && t < T.lunge) { pa = -165 * D; pMood = 'grit'; pGlow = v.seg(t, T.charge, T.lunge); pRot = -0.12; }
      else if (t >= T.lunge && t < T.hit4 + 0.3) { pa = -4 * D; pMood = 'grit'; pRot = 0.22; }
      else if (t >= T.win) { pa = -120 * D + Math.sin(t * 9) * 0.3; pMood = 'joy'; pY += v.hop(v.phase(t - T.win, 0.5), 7); }
      // Bo: guards high (blocks), winds low and strikes, gets bonked (dizzy), teeters, splashes, bobs in the duck float
      let ba = -72 * D, bMood = 'happy', bSq = 0, bRot = 0, bY = pw18pPY;
      if (t >= T.hit1 && t < T.wind2) bMood = 'joy';
      if (t >= T.wind2 && t < T.hit2) { ba = 150 * D; bSq = 0.25; bMood = 'grit'; }
      else if (t >= T.hit2 && t < T.hit2 + 0.25) { ba = 30 * D; bSq = 0.25; }
      else if (t >= T.hit2 + 0.25 && t < T.hit3) { ba = 40 * D; bSq = 0.25; }
      else if (t >= T.hit3 && t < T.charge + 0.2) { ba = 30 * D; bMood = 'dizzy'; }
      else if (t >= T.charge + 0.2 && t < T.hit4) ba = -72 * D;
      else if (t >= T.hit4 && t < T.fall) { ba = -90 * D + Math.sin(t * 22) * 1.2; bMood = 'wow'; bRot = -(0.28 + Math.sin(t * 16) * 0.16); }
      let bx = xs.bo;
      if (t >= T.fall && t < T.splash) { const k = v.seg(t, T.fall, T.splash); bx += 14 * k; bY = pw18pPY + (pw18pSea + 4 - pw18pPY) * k * k - 10 * Math.sin(k * Math.PI); bRot = -(0.4 + k * 2.6); bMood = 'wow'; }
      const inFloat = t >= T.splash;
      // the wind-up badges over the head (▲ high, ▼ low)
      const badge = (x, y, up, k) => { ctx.globalAlpha = 0.5 + 0.5 * k; v.fillCircle(x, y, 6.5, 'rgba(28,26,54,0.85)'); v.text(up ? '▲' : '▼', x, y + 0.5, 8, '#fff3a0', 'center', true); ctx.globalAlpha = 1; };
      if (t >= T.wind1 && t < T.hit1) badge(xs.pip, pw18pPY - 40, true, v.seg(t, T.wind1, T.hit1));
      if (t >= T.wind3 && t < T.hit3) badge(xs.pip, pw18pPY - 40, true, v.seg(t, T.wind3, T.hit3));
      if (t >= T.charge && t < T.hit4) badge(xs.pip, pw18pPY - 40, true, 1);
      if (t >= T.wind2 && t < T.hit2) badge(xs.bo, pw18pPY - 36, false, v.seg(t, T.wind2, T.hit2));
      // the fighters
      pw18pFighter(v, 0, xs.pip, pY, { ang: pa, mood: pMood, glow: pGlow, rot: pRot, shadow: pY === pw18pPY });
      if (!inFloat) pw18pFighter(v, 1, bx, bY, { ang: ba, mood: bMood, sq: bSq, rot: bRot });
      // strike swooshes
      const swoosh = (x, y, k, f) => { if (k <= 0 || k >= 1) return; ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * (1 - k)).toFixed(2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + f * 8, y, 18, f > 0 ? -0.6 : Math.PI - 0.6, f > 0 ? 0.6 : Math.PI + 0.6); ctx.stroke(); };
      swoosh(xs.pip, pw18pPY - 22, v.seg(t, T.hit1, T.hit1 + 0.25), 1);
      swoosh(xs.bo, pw18pPY - 8, v.seg(t, T.hit2, T.hit2 + 0.25), -1);
      swoosh(xs.pip, pw18pPY - 22, v.seg(t, T.hit3, T.hit3 + 0.25), 1);
      swoosh(xs.pip, pw18pPY - 18, v.seg(t, T.hit4, T.hit4 + 0.3), 1);
      // words
      const pop = (str, x, y, a, b, col, size) => { const k = v.seg(t, a, b); if (k <= 0 || k >= 1) return; ctx.globalAlpha = 1 - k * k; v.label(str, x, y - 10 * k, size || 13, col); ctx.globalAlpha = 1; };
      pop('Clack!', 160, 70, T.hit1, T.hit1 + 0.5, '#ffffff');
      if (t >= T.hit1 && t < T.hit1 + 0.3) v.sparkle(xs.pip + 26, pw18pPY - 24, v.seg(t, T.hit1, T.hit1 + 0.3), '#fff', 8);
      pop('Hop!', xs.pip, 74, T.hit2, T.hit2 + 0.5, '#c9ff8a');
      pop('Bonk!', 214, 70, T.hit3, T.hit3 + 0.5, '#ffd2c4');
      pop('LUNGE!', xs.pip + 6, 66, T.lunge - 0.1, T.hit4 + 0.4, v.c.gold, 14);
      pop('Whoa!', 248, 72, T.hit4 + 0.1, T.fall + 0.1, '#ffe6a8');
      // the splash, a friendly fish, and Bo bobbing up in the duck float
      if (inFloat) {
        const k = v.seg(t, T.splash, T.splash + 0.6), sx = pw18pE1 + 22;
        if (k < 1) {
          ctx.globalAlpha = 1 - k;
          for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.28; v.fillCircle(sx + Math.cos(a) * 26 * k, pw18pSea + Math.sin(a) * 30 * k + 30 * k * k, 2.4, i % 2 ? '#bfe8ff' : '#fff'); }
          ctx.globalAlpha = 1;
        }
        pop('SPLASH!', sx - 14, 84, T.splash, T.splash + 0.8, '#bfe8ff', 16);
        const fk = v.seg(t, T.splash + 0.2, T.splash + 1.2);
        if (fk > 0 && fk < 1) pw18pFish(v, sx - 40 + fk * 30, pw18pSea - Math.sin(fk * Math.PI) * 30, 1, 1, -0.8 + fk * 1.6);
        const up = v.ease.back(v.seg(t, T.splash + 0.1, T.splash + 0.5)), by = pw18pSea + 6 - 4 * up + Math.sin(t * 4) * 1;
        v.hero(1, sx, by, { s: 0.9, face: -1, mood: 'joy', shadow: false });
        pw18pHat(v, sx, by - 23, 0.85, 1);
        pw18pDuck(v, sx, by + 1, 1);
      } else pw18pDuck(v, 30 + Math.sin(t * 0.6) * 6, pw18pSea + Math.sin(t * 2) * 1, 0.8);
      if (t > T.win) {
        v.confetti(xs.pip, pw18pPY - 30, v.seg(t, T.win, 6.2));
        v.label('Pip wins!', 160, 30, 18, v.c.pip);
      }
      // a soft fade at the seam
      const fade = Math.max(v.seg(t, 6.1, 6.4), 0.6 * (1 - v.seg(t, 0, 0.2)));
      if (fade > 0) { ctx.fillStyle = 'rgba(191,233,246,' + fade.toFixed(3) + ')'; ctx.fillRect(0, 0, v.W, v.H); }
    },
  });
  // ----- END 18-4 Plank Duel preview -----
  //
  //
  //
}
