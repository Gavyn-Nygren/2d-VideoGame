/* Pip & Bo - Level previews for World 14 Dino Valley (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw14. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 14-1 Egg Rescue preview -----
  // ----- END 14-1 Egg Rescue preview -----
  //
  // ----- BEGIN 14-2 Pterodactyl Express preview -----
  // Petra flies right over Dino Valley (the valley scrolls by), flapping on the beat with Pip on her back: each flap at the
  // gold TOP of the little wing meter is a PERFECT one. Bo hangs from her feet, swings out to grab a mango off a palm and
  // drops it into a nest (Nom!), then grabs a rock off a rock pillar and drops it on the stone switch, and the log gate
  // lifts just in time for Petra to fly through. Everything that changes is worked out from how far along the valley
  // Petra is, and the valley repeats every loop, so the loop has no seam.
  const PW14P = {
    loop: 6, L: 540, beats: 5, PX: 118, PY: 50, GY: 156, s: 0.5, arm: 9, feet: 24,
    // where Bo is along the valley (px) when things happen: grab the mango, drop it, grab a rock, drop it
    gF: 40, dF: 150, gR: 270, dR: 378, fallF: 0.3, fallR: 0.42,
  };
  const pw14pSmooth = u => u * u * (3 - 2 * u);
  const pw14pRock = (v, x, y, r) => {
    const ctx = v.ctx;
    ctx.fillStyle = '#a8a29a'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.15, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.35, r * 0.4, r * 0.28, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(60,50,40,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, r * 1.15, r, 0, 0, Math.PI * 2); ctx.stroke();
  };
  const pw14pMango = (v, x, y, r = 4.2) => {
    const ctx = v.ctx;
    ctx.fillStyle = '#ffb43d'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.15, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(224,123,31,0.55)'; ctx.beginPath(); ctx.ellipse(x + r * 0.3, y + r * 0.35, r * 0.55, r * 0.6, 0.3, 0, Math.PI * 2); ctx.fill();
    v.fillCircle(x - r * 0.35, y - r * 0.4, r * 0.3, 'rgba(255,255,255,0.55)');
    ctx.fillStyle = '#5fae3e'; ctx.beginPath(); ctx.ellipse(x + r * 0.5, y - r * 1.1, r * 0.55, r * 0.25, -0.5, 0, Math.PI * 2); ctx.fill();
  };
  const pw14pEye = (v, x, y, r, shut) => {
    const ctx = v.ctx;
    if (shut) { ctx.strokeStyle = v.c.ink; ctx.lineWidth = Math.max(1, r * 0.4); ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0.2, Math.PI - 0.2); ctx.stroke(); return; }
    v.fillCircle(x, y, r, '#fff'); v.fillCircle(x + r * 0.25, y + r * 0.1, r * 0.55, v.c.ink); v.fillCircle(x + r * 0.45, y - r * 0.25, r * 0.2, '#fff');
  };
  // a wing seen from the side: a leathery sail from the shoulder, its tip up (up = 1) or down (up = -1) (Petra's units)
  const pw14pWing = (ctx, sx, sy, up, s, col, light) => {
    const tipX = sx - 26 * s, tipY = sy - 84 * up * s, rearX = sx - 40 * s;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(sx + 14 * s, sy);
    ctx.quadraticCurveTo(sx + 6 * s, sy - 48 * up * s, tipX, tipY); ctx.quadraticCurveTo(sx - 26 * s, sy - 30 * up * s, rearX, sy + 4 * s);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = light; ctx.globalAlpha *= 0.6; ctx.beginPath(); ctx.moveTo(sx + 8 * s, sy);
    ctx.quadraticCurveTo(sx + 2 * s, sy - 36 * up * s, tipX + 4 * s, tipY + 10 * up * s); ctx.quadraticCurveTo(sx - 14 * s, sy - 20 * up * s, sx - 20 * s, sy + 2 * s);
    ctx.closePath(); ctx.fill(); ctx.globalAlpha /= 0.6;
    ctx.fillStyle = '#ffe6b0'; ctx.beginPath(); ctx.arc(sx + 14 * s + (tipX - sx - 14 * s) * 0.72, sy + (tipY - sy) * 0.72, 3 * s, 0, Math.PI * 2); ctx.fill();
  };
  // Petra (drawn like the level's), body centre at (x, y); up: the wing pose; tilt: nose up (negative) or down
  const pw14pPetra = (v, x, y, up, tilt, blink) => {
    const ctx = v.ctx, s = PW14P.s;
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
    pw14pWing(ctx, -12, -8, up * 0.92, 0.85, '#2f8f86', '#57b8ab');
    ctx.fillStyle = '#3fb7a8'; ctx.beginPath(); ctx.moveTo(-34, -4); ctx.quadraticCurveTo(-60, 0, -74, 6); ctx.quadraticCurveTo(-58, 6, -34, 6); ctx.fill();
    ctx.fillStyle = '#ff7b54'; ctx.beginPath(); ctx.moveTo(-74, 6); ctx.lineTo(-84, -2); ctx.lineTo(-90, 8); ctx.lineTo(-82, 14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e8873c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2, 10); ctx.lineTo(1, 24); ctx.moveTo(8, 10); ctx.lineTo(9, 24); ctx.stroke();
    ctx.fillStyle = '#3fb7a8'; ctx.beginPath(); ctx.ellipse(0, 0, 40, 19, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe6b0'; ctx.beginPath(); ctx.ellipse(6, 7, 28, 10, 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.ellipse(-8, -9, 18, 5, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7ccf4f'; ctx.beginPath(); ctx.ellipse(-8, -16, 16, 6, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#3f8f3a'; ctx.fillRect(-24, -17, 32, 3);
    ctx.fillStyle = '#3fb7a8'; ctx.beginPath(); ctx.moveTo(26, -10); ctx.quadraticCurveTo(40, -24, 44, -30); ctx.lineTo(54, -22); ctx.quadraticCurveTo(44, -8, 34, 4); ctx.fill();
    ctx.save(); ctx.translate(50, -30);
    ctx.fillStyle = '#ff7b54'; ctx.beginPath(); ctx.moveTo(-4, -8); ctx.quadraticCurveTo(-26, -24, -42, -20); ctx.quadraticCurveTo(-22, -10, -6, 2); ctx.fill();
    ctx.fillStyle = '#3fb7a8'; ctx.beginPath(); ctx.ellipse(0, -2, 15, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffc05a'; ctx.beginPath(); ctx.moveTo(8, -6); ctx.quadraticCurveTo(30, -4, 40, 2); ctx.quadraticCurveTo(26, 6, 8, 6); ctx.fill();
    ctx.strokeStyle = '#c98a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(10, 2); ctx.quadraticCurveTo(24, 4, 36, 2); ctx.stroke();
    pw14pEye(v, 2, -5, 5, blink);
    v.fillCircle(-4, 4, 3.5, 'rgba(255,130,150,0.55)');
    ctx.restore();
    pw14pWing(ctx, -4, -6, up, 1, '#36a89a', '#6fd0c2');
    ctx.restore();
  };
  // a baby dino in its eggshell hat: hungry (mouth wide open, bobbing) or fed (happy eyes, a little sway)
  const pw14pBaby = (v, x, y, col, hungry, t) => {
    const ctx = v.ctx, bob = hungry ? Math.abs(Math.sin(t * Math.PI * 4)) * 2.5 : Math.sin(t * Math.PI * 2) * 0.8;
    ctx.save(); ctx.translate(x, y - bob); ctx.scale(0.62, 0.62);
    ctx.fillStyle = col; v.circle(0, 0, 10); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, 9, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff8e8'; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-5, -12); ctx.lineTo(-2, -8); ctx.lineTo(1, -13); ctx.lineTo(4, -8); ctx.lineTo(7, -12); ctx.lineTo(8, -5); ctx.quadraticCurveTo(0, -9, -8, -6); ctx.fill();
    if (hungry) {
      pw14pEye(v, -4, -2, 3, false); pw14pEye(v, 4, -2, 3, false);
      const open = 3 + Math.abs(Math.sin(t * Math.PI * 4)) * 4;
      ctx.fillStyle = '#c2392b'; ctx.beginPath(); ctx.ellipse(0, 5, 5, open, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8a8a'; ctx.beginPath(); ctx.ellipse(0, 5 + open * 0.4, 3, open * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.8;
      for (const ex of [-4, 4]) { ctx.beginPath(); ctx.arc(ex, -1, 2.4, Math.PI + 0.3, -0.3); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 3, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();
      v.fillCircle(-7, 3, 2.2, 'rgba(255,120,150,0.5)'); v.fillCircle(7, 3, 2.2, 'rgba(255,120,150,0.5)');
    }
    ctx.restore();
  };
  // a far-off friendly brontosaurus (the level's, small), feet at (x, gy)
  const pw14pBronto = (v, x, gy, s, t) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, gy); ctx.scale(s, s);
    ctx.fillStyle = '#5c9580'; for (const lx of [-44, -18, 22, 46]) ctx.fillRect(lx - 8, -46, 16, 46);
    ctx.fillStyle = '#7fb9a0'; ctx.beginPath(); ctx.ellipse(0, -62, 70, 34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-60, -70); ctx.quadraticCurveTo(-120, -60, -150, -30); ctx.quadraticCurveTo(-110, -50, -60, -48); ctx.fill();
    ctx.save(); ctx.translate(46, -78); ctx.rotate(Math.sin(t * Math.PI * 2) * 0.08);
    ctx.beginPath(); ctx.moveTo(-14, 10); ctx.quadraticCurveTo(30, -40, 40, -120); ctx.lineTo(62, -118); ctx.quadraticCurveTo(48, -40, 20, 16); ctx.fill();
    ctx.beginPath(); ctx.ellipse(58, -124, 22, 13, 0.1, 0, Math.PI * 2); ctx.fill();
    pw14pEye(v, 60, -128, 5, false);
    ctx.strokeStyle = '#3c6e5c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(68, -120, 6, 0.2, Math.PI - 0.6); ctx.stroke();
    v.fillCircle(52, -118, 5, 'rgba(255,140,150,0.5)');
    ctx.restore();
    ctx.fillStyle = '#a9d8c2'; for (const [sx, sy] of [[-20, -80], [6, -88], [30, -78]]) { v.circle(sx, sy, 6); ctx.fill(); }
    ctx.restore();
  };
  // the scene at time t: Petra's beat, her bob and Bo's swing (everything but the scenery)
  const pw14pPose = t => {
    const P = PW14P, B = P.loop / P.beats, p = (((t / B) % 1) + 1) % 1, e = 1 - (1 - p) * (1 - p);
    // the wing meter: snapped down by the flap (p 0..0.1), rises to the TOP (0.1..0.78), waits there gold until the next flap
    const wing = p < 0.1 ? 0 : Math.min(1, (p - 0.1) / 0.68);
    const up = p < 0.1 ? 1.1 - 2 * (p / 0.1) : -0.9 + 2 * pw14pSmooth(wing);
    const py = P.PY + 3 - 6 * Math.sin(Math.PI * e), tilt = -0.07 * Math.sin(Math.PI * e) + 0.03;
    // Bo's swing: a lazy sway, swinging well forward to grab and a little to toss
    const near = (at, w) => { const d = ((t - at) % P.loop + P.loop * 1.5) % P.loop - P.loop / 2; return Math.exp(-(d / w) * (d / w)); };
    const k2t = u => u / P.L * P.loop;
    const a = 0.08 * Math.sin(t / P.loop * Math.PI * 4) + 0.55 * (near(k2t(P.gF), 0.32) + near(k2t(P.gR), 0.32)) + 0.2 * (near(k2t(P.dF), 0.2) + near(k2t(P.dR), 0.2));
    const pvx = P.PX + 2 * Math.cos(tilt) - 13 * Math.sin(tilt), pvy = py + 2 * Math.sin(tilt) + 13 * Math.cos(tilt);
    // Bo's hand (in front of his feet), turned with the swing
    const hx0 = 8, hy0 = P.feet - 3;
    const hand = { x: pvx + hx0 * Math.cos(a) + hy0 * Math.sin(a), y: pvy - hx0 * Math.sin(a) + hy0 * Math.cos(a) };
    return { p, wing, up, py, tilt, a, pvx, pvy, hand };
  };
  definePreview('Pterodactyl Express', {
    blurb: 'Flap Petra on the beat while your partner swings below to drop fruit for baby dinos and rocks on switches!',
    loop: PW14P.loop, still: 1.3,
    draw(v, t) {
      const ctx = v.ctx, P = PW14P, L = P.L, GY = P.GY, k = t / P.loop, u = k * L, bx0 = P.PX + 2;
      const pose = pw14pPose(t), t2u = tt => tt / P.loop * L, u2t = uu => uu / L * P.loop;
      // where things sit along the valley: each is put right under Bo's hand at its moment, so the grabs and drops line up
      const gF = pw14pPose(u2t(P.gF)).hand, dF = pw14pPose(u2t(P.dF)).hand, gR = pw14pPose(u2t(P.gR)).hand, dR = pw14pPose(u2t(P.dR)).hand;
      const landF = P.dF + t2u(P.fallF), landR = P.dR + t2u(P.fallR);
      const treeX = P.gF + gF.x - bx0, nestX = landF + dF.x - bx0, pileX = P.gR + gR.x - bx0, swX = landR + dR.x - bx0, gateX = swX + 96;
      const nestY = GY - 30;
      // sky, sun, drifting clouds (one valley's worth of clouds drifts by each loop)
      v.sky(); v.sun(v.W - 46, 30, 14);
      for (let q = -1; q < 9; q++) {
        const slot = ((q % 3) + 3) % 3; if (slot === 1) continue;
        const x = q * 45 - (u * 0.25) % 135 + 10;
        v.cloud(x, slot ? 44 : 24, slot ? 0.6 : 0.85);
      }
      // the sleepy volcano far away, puffing smoke rings, and the far hills
      const vx = 246, vt = 88;
      ctx.fillStyle = 'rgba(209,143,138,0.7)'; ctx.beginPath(); ctx.moveTo(vx - 62, GY - 24); ctx.quadraticCurveTo(vx - 20, vt + 12, vx - 10, vt); ctx.lineTo(vx + 10, vt); ctx.quadraticCurveTo(vx + 20, vt + 12, vx + 62, GY - 24); ctx.fill();
      ctx.fillStyle = '#e6977a'; ctx.beginPath(); ctx.ellipse(vx, vt + 1, 10, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(60,40,50,0.45)'; ctx.lineWidth = 1.3;
      for (const ex of [-6, 6]) { ctx.beginPath(); ctx.arc(vx + ex, vt + 18, 2.3, 0.2, Math.PI - 0.2); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(vx, vt + 24, 3, 0.3, Math.PI - 0.3); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const q = (k * 3 + i / 3) % 1;
        ctx.save(); ctx.globalAlpha = 0.6 * (1 - q); v.cloud(vx - 8 + Math.sin(q * 5 + i) * 5, vt - 6 - q * 40, 0.22 + q * 0.35); ctx.restore();
      }
      ctx.fillStyle = 'rgba(227,165,155,0.75)'; ctx.beginPath(); ctx.moveTo(0, v.H);
      for (let x = 0; x <= v.W; x += 8) ctx.lineTo(x, GY - 34 + Math.sin(x / 50 + 1) * 8 + Math.sin(x / 21) * 3);
      ctx.lineTo(v.W, v.H); ctx.closePath(); ctx.fill();
      // the jungle hills (half speed: they move half a valley each loop) with a friendly bronto munching on them
      const off = u * 0.5, half = L / 2, hy = x => GY - 16 + Math.sin((x + off) / half * Math.PI * 2 + 1) * 6 + Math.sin((x + off) / half * Math.PI * 6) * 2.5;
      ctx.fillStyle = '#8cc47a'; ctx.beginPath(); ctx.moveTo(0, v.H);
      for (let x = 0; x <= v.W + 8; x += 8) ctx.lineTo(x, hy(x));
      ctx.lineTo(v.W, v.H); ctx.closePath(); ctx.fill();
      for (let q = -1; q < 4; q++) {
        const x = q * 135 - (off % 270) + 70;
        if (x < -60 || x > v.W + 60) continue;
        if (q % 2 === 0) pw14pBronto(v, x, hy(x) + 6, 0.2, k * 2 + q * 0.3);
        else {
          ctx.strokeStyle = '#6aa65f'; ctx.fillStyle = '#6aa65f'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x, hy(x) + 2); ctx.quadraticCurveTo(x + 4, hy(x) - 14, x + 2, hy(x) - 28); ctx.stroke();
          for (let j = 0; j < 5; j++) { const an = -Math.PI / 2 + (j - 2) * 0.55; ctx.beginPath(); ctx.ellipse(x + 2 + Math.cos(an) * 7, hy(x) - 28 + Math.sin(an) * 4 + 3, 8, 2.2, an, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      // the ground: dirt with a grassy top, tufts and flowers (one valley long, so it repeats each loop)
      ctx.fillStyle = '#a8754a'; ctx.fillRect(0, GY, v.W, v.H - GY);
      ctx.fillStyle = 'rgba(125,82,50,0.5)'; ctx.fillRect(0, GY + 12, v.W, 3);
      ctx.fillStyle = '#3f8f3a'; ctx.fillRect(0, GY - 2, v.W, 6);
      ctx.fillStyle = '#7ccf4f'; ctx.fillRect(0, GY - 3, v.W, 3.5);
      for (let q = Math.floor(u / 30) - 1; q < Math.floor(u / 30) + 13; q++) {
        const x = q * 30 - u + bx0 - 130, h = Math.floor(v.rand((((q % 18) + 18) % 18) + 3) * 1000);
        if (h % 3 === 0) { ctx.fillStyle = '#3f8f3a'; for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.ellipse(x + (j - 1) * 2, GY - 4, 1, 4, (j - 1) * 0.4, 0, Math.PI * 2); ctx.fill(); } }
        else if (h % 5 === 1) { v.fillCircle(x, GY - 4, 1.8, ['#ffd84d', '#ff8fb5', '#ffffff'][h % 3]); v.fillCircle(x, GY - 4, 0.7, '#ffb347'); }
        else if (h % 4 === 0) { ctx.fillStyle = '#7d5232'; ctx.beginPath(); ctx.ellipse(x, GY + 7 + (h % 7), 2.5, 1.5, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      // the things along the valley, each copy with its own state (uu: how far Bo is past the start of that copy)
      const pop = [];
      for (let n = -1; n <= 1; n++) {
        const uu = u - n * L, sx = X => bx0 + X - uu;
        // the palm with its mango (it gives a little shake when Bo grabs it)
        const tx = sx(treeX);
        if (tx > -60 && tx < v.W + 60) {
          const wob = uu > P.gF ? Math.sin((uu - P.gF) * 0.5) * Math.max(0, 1 - (uu - P.gF) / 40) * 3 : 0, top = gF.y - 13;
          ctx.strokeStyle = '#a8754a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(tx, GY); ctx.quadraticCurveTo(tx - 8, (GY + top) / 2, tx + wob, top); ctx.stroke();
          ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 1;
          for (let yy = GY - 8; yy > top + 6; yy -= 8) { const f = (GY - yy) / (GY - top), xx = tx + wob * f - 8 * 2 * f * (1 - f); ctx.beginPath(); ctx.moveTo(xx - 2.5, yy); ctx.lineTo(xx + 2.5, yy - 1.5); ctx.stroke(); }
          for (let j = 0; j < 6; j++) {
            const an = -Math.PI / 2 + (j - 2.5) * 0.62 + Math.sin(k * Math.PI * 4 + j) * 0.04;
            ctx.fillStyle = j % 2 ? '#4f9a3c' : '#62b04a';
            ctx.beginPath(); ctx.ellipse(tx + wob + Math.cos(an) * 12, top + Math.sin(an) * 6 + 4, 14, 3.5, an, 0, Math.PI * 2); ctx.fill();
          }
          if (uu < P.gF) { v.line(tx + wob * 0.8, top + 3, tx, gF.y - 4, '#5a7a2a', 1); pw14pMango(v, tx, gF.y); }
        }
        // the nest on its stump, with a hungry baby (fed once the mango lands)
        const nx = sx(nestX);
        if (nx > -60 && nx < v.W + 60) {
          const fed = uu >= landF;
          ctx.fillStyle = '#8a5a34'; v.rr(nx - 11, nestY + 1, 22, GY - nestY, 3); ctx.fill();
          ctx.fillStyle = '#a8754a'; ctx.beginPath(); ctx.ellipse(nx, nestY + 2, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
          pw14pBaby(v, nx, nestY - 7, '#ff9ec7', !fed, t);
          ctx.fillStyle = '#9a6a3a'; ctx.beginPath(); ctx.ellipse(nx, nestY, 17, 6, 0, 0, Math.PI); ctx.fill();
          ctx.strokeStyle = '#6b4226'; ctx.lineWidth = 1.3;
          for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.moveTo(nx - 17 + j * 2, nestY - 0.5 + j); ctx.quadraticCurveTo(nx, nestY + 4 + j, nx + 17 - j * 2, nestY - 0.5 + j); ctx.stroke(); }
          ctx.strokeStyle = '#c49460'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(nx, nestY, 17, 2.5, 0, 0, Math.PI * 2); ctx.stroke();
          if (fed && uu < landF + 110) {
            const f = (uu - landF) / 110;
            v.heart(nx + 9, nestY - 18 - f * 16, 3.5 * (1 - f * 0.4), '#ff6b8a');
            if (f < 0.7) pop.push(['Nom!', nx + 22, nestY - 22, 12, '#fff']);
            v.sparkle(nx, nestY - 6, f * 2.5);
          }
        }
        // the rock pillar with its rocks (Bo takes the top one)
        const rx = sx(pileX);
        if (rx > -60 && rx < v.W + 60) {
          const ptop = gR.y + 7;
          ctx.fillStyle = '#6b5a4a'; v.rr(rx - 10, ptop, 20, GY - ptop + 2, 2); ctx.fill();
          ctx.fillStyle = '#9a8a7a';
          for (let yy = ptop + 4, j = 0; yy < GY - 2; yy += 8, j++) { v.rr(rx - 9 + (j % 2) * 2, yy, 16, 6.5, 1.5); ctx.fill(); }
          ctx.fillStyle = '#6b5a4a'; v.rr(rx - 13, ptop - 2, 26, 5, 2); ctx.fill();
          pw14pRock(v, rx - 4.5, ptop - 4.5, 4); pw14pRock(v, rx + 4.5, ptop - 4.5, 4);
          if (uu < P.gR) pw14pRock(v, rx, gR.y, 4);
        }
        // the stone switch: pressed (gold) once the rock lands on it
        const wx = sx(swX);
        if (wx > -60 && wx < v.W + 60) {
          const down = uu >= landR, hgt = down ? 2 : 6.5, w = 25;
          ctx.fillStyle = '#5e5346'; v.rr(wx - w / 2 - 3, GY - 4, w + 6, 6, 2); ctx.fill();
          ctx.fillStyle = down ? '#ffd76a' : '#b8ada0'; ctx.beginPath(); ctx.ellipse(wx, GY - 4, w / 2, hgt, 0, Math.PI, 0); ctx.fill();
          ctx.strokeStyle = down ? '#b9850f' : '#7a6e60'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(wx, GY - 4, w / 2, hgt, 0, Math.PI, 0); ctx.stroke();
          if (down) {
            pw14pRock(v, wx, GY - 9, 4.5);
            const f = (uu - landR) / 40;
            if (f < 1) { ctx.save(); ctx.globalAlpha = 0.8 * (1 - f); v.fillCircle(wx, GY - 5, 12 + f * 14, v.c.gold); ctx.restore(); }
            if (uu < landR + 70) pop.push(['Clonk!', wx, GY - 30, 11, v.c.gold]);
          }
        }
        // the log gate: lifts as soon as the switch is down, just in time for Petra
        const gx = sx(gateX);
        if (gx > -60 && gx < v.W + 60) {
          const top = 4, open = pw14pSmooth(v.clamp((uu - landR) / 20, 0, 1)), lift = open * (GY - top + 6);
          ctx.save(); ctx.beginPath(); ctx.rect(gx - 16, top + 4, 32, GY - top - 4); ctx.clip();
          for (let j = -1; j <= 1; j++) {
            const lx = gx + j * 5.5;
            ctx.fillStyle = j ? '#a8703c' : '#b87d46'; v.rr(lx - 3, top - lift, 6, GY - top + 2, 3); ctx.fill();
            ctx.strokeStyle = '#7d4f28'; ctx.lineWidth = 1;
            for (let yy = top + 16 - lift; yy < GY - lift; yy += 23) { ctx.beginPath(); ctx.moveTo(lx - 2, yy); ctx.lineTo(lx + 1.5, yy + 4); ctx.stroke(); }
          }
          ctx.fillStyle = '#4f9a3c'; for (let yy = top + 30 - lift; yy < GY - lift; yy += 55) ctx.fillRect(gx - 9, yy, 18, 3);
          const by = GY - 45 - lift;
          v.fillCircle(gx, by, 6.5, uu >= landR ? '#ffd76a' : '#b8ada0');
          ctx.strokeStyle = uu >= landR ? '#b9850f' : '#7a6e60'; ctx.lineWidth = 1.2; ctx.beginPath();
          for (let an = 0; an < Math.PI * 3.2; an += 0.3) { const r = 0.5 + an * 0.6; ctx.lineTo(gx + Math.cos(an) * r, by + Math.sin(an) * r); } ctx.stroke();
          ctx.restore();
          for (const sd of [-1, 1]) { ctx.fillStyle = '#6b5a4a'; v.rr(gx + sd * 12 - 4, top, 8, GY - top + 2, 2.5); ctx.fill(); ctx.fillStyle = '#9a8a7a'; v.rr(gx + sd * 12 - 3, top, 4, GY - top + 2, 1.5); ctx.fill(); }
          ctx.fillStyle = '#6b5a4a'; v.rr(gx - 19, top - 6, 38, 11, 3); ctx.fill();
          ctx.fillStyle = '#62b04a'; ctx.beginPath(); ctx.ellipse(gx - 6, top + 3, 8, 2.5, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(gx + 9, top + 4, 6, 2, -0.4, 0, Math.PI * 2); ctx.fill();
        }
      }
      // falling things: they keep Petra's speed, so on screen they drop straight down onto the nest or the switch
      const since = at => ((t - at) % P.loop + P.loop) % P.loop;
      const fF = since(u2t(P.dF)), fR = since(u2t(P.dR));
      if (fF < P.fallF) { const f = fF / P.fallF; pw14pMango(v, dF.x, v.lerp(dF.y, nestY - 4, f * f)); }
      if (fR < P.fallR) { const f = fR / P.fallR; pw14pRock(v, dR.x, v.lerp(dR.y, GY - 9, f * f), 4); }
      // Bo hanging from Petra's feet, swinging (drawn before Petra so her body covers his hands)
      const hold = u >= P.gF && u < P.dF ? 'mango' : u >= P.gR && u < P.dR ? 'rock' : null;
      const grabbing = Math.min(since(u2t(P.gF)), since(u2t(P.gR))), justGrab = grabbing < 0.35;
      const happy = Math.min(since(u2t(landF)), since(u2t(landR))) < 0.9;
      ctx.save(); ctx.translate(pose.pvx, pose.pvy); ctx.rotate(-pose.a);
      v.line(-3, P.arm + 2, -1, 0, v.c.boDark, 2); v.line(3, P.arm + 2, 1, 0, v.c.boDark, 2);
      v.hero(1, 0, P.feet, { s: 0.7, face: 1, shadow: false, mood: justGrab ? 'wow' : happy ? 'joy' : 'happy' });
      ctx.restore();
      if (hold === 'mango') pw14pMango(v, pose.hand.x, pose.hand.y);
      if (hold === 'rock') pw14pRock(v, pose.hand.x, pose.hand.y, 4);
      if (justGrab) v.sparkle(pose.hand.x, pose.hand.y, grabbing / 0.35);
      // Petra, with Pip riding on the leafy saddle (bouncing a little on each flap)
      const flapK = pose.p < 0.25 ? 1 - pose.p / 0.25 : 0;
      pw14pPetra(v, P.PX, pose.py, pose.up, pose.tilt, false);
      const seat = { x: P.PX - 4 * Math.cos(pose.tilt) + 7 * Math.sin(pose.tilt), y: pose.py - 4 * Math.sin(pose.tilt) - 7 * Math.cos(pose.tilt) };
      v.hero(0, seat.x, seat.y - flapK * 2, { s: 0.7, face: 1, shadow: false, sq: flapK * 0.2, mood: flapK > 0.3 ? 'joy' : 'happy' });
      // the little wing meter beside her (the beat): fills as the wings rise, gold at the TOP; the flap makes a PERFECT
      const mx = P.PX - 50, my = pose.py - 28, mh = 26, topNow = pose.wing >= 1;
      ctx.fillStyle = 'rgba(28,26,54,0.72)'; v.rr(mx - 4.5, my - 3, 9, mh + 6, 4.5); ctx.fill();
      ctx.fillStyle = 'rgba(255,197,61,0.35)'; v.rr(mx - 2.5, my, 5, mh * 0.28, 2.5); ctx.fill();
      ctx.fillStyle = topNow ? v.c.gold : '#fff'; const fh = Math.max(3, mh * pose.wing); v.rr(mx - 2.5, my + mh - fh, 5, fh, 2.5); ctx.fill();
      if (topNow) { ctx.strokeStyle = v.c.gold; ctx.lineWidth = 1.5; v.rr(mx - 6, my - 4.5, 12, mh + 9, 6); ctx.stroke(); }
      if (pose.p < 0.3) { const f = pose.p / 0.3; ctx.save(); ctx.globalAlpha = f < 0.75 ? 1 : (1 - f) * 4; v.label('PERFECT!', P.PX + 44, pose.py - 30 - f * 5, 10, v.c.gold); ctx.restore(); }
      for (const [s, x, y, size, col] of pop) v.label(s, x, y, size, col);
    },
  });
  // ----- END 14-2 Pterodactyl Express preview -----
  //
  // ----- BEGIN 14-3 Tar Pit Pull preview -----
  // ----- END 14-3 Tar Pit Pull preview -----
  //
  // ----- BEGIN 14-4 Raptor Race preview -----
  // ----- END 14-4 Raptor Race preview -----
}
