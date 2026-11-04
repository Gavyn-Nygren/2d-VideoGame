/* Pip & Bo - Level previews for World 15 Orbit Outpost (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw15. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 15-1 Tethered Spacewalk preview -----
  // ----- END 15-1 Tethered Spacewalk preview -----
  //
  // ----- BEGIN 15-2 Gravity Flip Station preview -----
  // ----- END 15-2 Gravity Flip Station preview -----
  //
  // ----- BEGIN 15-3 Moon Buggy Crew preview -----
  // the buggy rolls up to a boulder and stops; Bo's claw grabs it and tosses it back behind; then Pip hops a crater
  // while the claw snatches a shiny moon rock from the air.
  const pw15BuggyAt = t => {
    // the buggy's place along the moon (world px) and its hop over the crater
    if (t < 1.5) return 60 + 140 * (1 - Math.pow(1 - t / 1.5, 2));
    if (t < 3.1) return 200;
    return 200 + (t - 3.1) * 150;
  };
  const pw15Ground = x => {
    // flat grey moon with a crater from 440 to 486
    if (x > 440 && x < 486) return 180;
    return 146 + Math.sin(x / 37) * 1.5;
  };
  const pw15Boulder = (v, x, y, r, rot) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.fillStyle = '#8d88a8'; ctx.strokeStyle = '#5d5878'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, rr = r * (0.86 + 0.14 * Math.sin(k * 2.3)); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; v.circle(-r * 0.3, -r * 0.3, r * 0.3); ctx.fill();
    ctx.restore();
  };
  const pw15Rock = (v, x, y, s) => {
    const ctx = v.ctx;
    v.fillCircle(x, y, 9 * s, 'rgba(160,220,255,0.25)');
    ctx.fillStyle = '#a9e4ff'; ctx.strokeStyle = '#4c8fd1'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y - 6 * s); ctx.lineTo(x + 5 * s, y - 1 * s); ctx.lineTo(x + 3 * s, y + 5 * s); ctx.lineTo(x - 3 * s, y + 5 * s); ctx.lineTo(x - 5 * s, y - 1 * s); ctx.closePath();
    ctx.fill(); ctx.stroke();
  };
  definePreview('Moon Buggy Crew', {
    blurb: 'One drives the bouncy moon buggy, one works the grabber arm. Swap jobs every room!',
    loop: 6,
    still: 2.45,
    draw(v, t) {
      const ctx = v.ctx, W = v.W, H = v.H;
      // space, stars, the Earth
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0f0d2b'); g.addColorStop(1, '#2d2860');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let k = 0; k < 40; k++) { const tw = 0.5 + 0.5 * Math.sin(t * 3 + k); ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.5 * tw) + ')'; ctx.fillRect(v.rand(k) * W, v.rand(k + 99) * 110, 1.5, 1.5); }
      v.fillCircle(266, 40, 22, '#3e7be0'); ctx.fillStyle = '#4fbf73'; ctx.beginPath(); ctx.ellipse(258, 34, 8, 5, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(274, 48, 6, 4, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(15,13,43,0.35)'; ctx.beginPath(); ctx.arc(266, 40, 22, -0.6, 1.8); ctx.fill();
      // the moon, scrolling with the buggy
      const bx = pw15BuggyAt(t), cam = bx - 110;
      ctx.fillStyle = '#4a4670'; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, 118 + Math.sin((x + cam * 0.3) / 40) * 8);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9b97bd'; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W + 4; x += 2) ctx.lineTo(x, pw15Ground(x + cam));
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c9c5e6'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = 0; x <= W + 4; x += 2) { const y = pw15Ground(x + cam); if (y > 170) { ctx.stroke(); ctx.beginPath(); continue; } ctx.lineTo(x, y); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(70,66,105,0.5)';
      for (let k = 0; k < 8; k++) { const x = ((k * 97 - cam) % 420 + 420) % 420 - 40; ctx.beginPath(); ctx.ellipse(x, 160 + (k % 3) * 6, 10 + (k % 2) * 6, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
      // the buggy: hop over the crater
      const hk = v.seg(bx, 404, 500), hop = v.hop(hk, 30);
      const sx = 110, gy = 146 + hop, by = gy - 22;
      const tilt = (hk > 0 && hk < 1) ? (hk - 0.5) * 0.25 : 0;
      // the rock over the crater (grabbed at the top of the hop)
      const rockX = 463 - cam, rockY = 92, got = bx > 455;
      if (!got) pw15Rock(v, rockX, rockY + Math.sin(t * 4) * 2, 1);
      // the boulder: on the track, grabbed, swung back, tossed away
      const reach = v.seg(t, 1.6, 2.1), lift = v.seg(t, 2.1, 2.7), fly = v.seg(t, 2.7, 3.6);
      const pv = { x: sx - 24, y: by - 18 };
      let claw;
      if (t < 1.6) claw = { x: pv.x + 34, y: pv.y - 30 };
      else if (t < 2.1) claw = { x: v.lerp(pv.x + 34, 252 - cam, v.ease.inOut(reach)), y: v.lerp(pv.y - 30, 128, v.ease.inOut(reach)) };
      else if (t < 2.7) { const a = v.ease.inOut(lift); claw = { x: v.lerp(252 - cam, pv.x - 46, a), y: v.lerp(128, pv.y - 44, a) - Math.sin(a * Math.PI) * 26 }; }
      else if (t < 3.1) { const a = v.seg(t, 2.7, 3.1); claw = { x: v.lerp(pv.x - 46, pv.x + 30, v.ease.inOut(a)), y: v.lerp(pv.y - 44, pv.y - 34, a) }; }
      else if (bx < 420) { const a = v.seg(bx, 380, 420); claw = { x: pv.x + 34 + a * 16, y: pv.y - 30 - a * 26 }; }
      else if (!got) claw = { x: rockX, y: rockY + 2 };
      else { const a = v.seg(bx, 455, 520); claw = { x: v.lerp(pv.x + 50, pv.x + 34, a), y: v.lerp(pv.y - 56, pv.y - 30, a) }; }
      if (t < 2.1) pw15Boulder(v, 252 - cam, 134, 12, 0);
      else if (t < 2.7) pw15Boulder(v, claw.x, claw.y + 14, 12, lift * 0.6);
      else if (fly < 1) { const fx = pv.x - 46 - fly * 160, fy = pv.y - 30 + v.hop(fly, 30) + fly * fly * 70; pw15Boulder(v, fx, fy, 12, -fly * 9); }
      // wheels and springs
      ctx.save(); ctx.translate(sx, by); ctx.rotate(tilt);
      for (const wx of [-21, 21]) {
        v.line(wx, 2, wx, 12, '#c9c5e6', 2.5);
        ctx.fillStyle = '#2d2a48'; v.circle(wx, 16, 8); ctx.fill();
        ctx.save(); ctx.translate(wx, 16); ctx.rotate(bx / 8); ctx.strokeStyle = '#ffc53d'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.moveTo(0, -4); ctx.lineTo(0, 4); ctx.stroke(); ctx.restore();
      }
      // the crew in bubble helmets (Pip drives in front, Bo works the arm at the back)
      v.hero(1, -9, -2, { s: 0.55, face: 1, shadow: false, mood: t > 2.6 && t < 3.4 ? 'joy' : 'grit' });
      v.hero(0, 9, -2, { s: 0.55, face: 1, shadow: false, mood: got && bx < 560 ? 'joy' : 'happy' });
      for (const hx of [-9, 9]) { ctx.strokeStyle = 'rgba(220,240,255,0.8)'; ctx.lineWidth = 1.5; ctx.fillStyle = 'rgba(200,230,255,0.15)'; v.circle(hx, -10, 10); ctx.fill(); ctx.stroke(); }
      // the body
      ctx.fillStyle = '#eef0fa'; ctx.strokeStyle = '#5c6688'; ctx.lineWidth = 2;
      v.rr(-32, -4, 64, 13, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff6b4a'; ctx.fillRect(-28, 1, 56, 2.5);
      ctx.fillStyle = '#5b95ff'; ctx.fillRect(-28, 4.5, 56, 1.5);
      ctx.fillStyle = '#ffe58a'; v.circle(31, 1, 3); ctx.fill();
      ctx.restore();
      // the arm (two yellow segments) and the claw
      const dx = claw.x - pv.x, dy = claw.y - pv.y, d = Math.min(Math.hypot(dx, dy), 74), L = 40;
      const a0 = Math.atan2(dy, dx), bend = Math.acos(v.clamp(d / (2 * L), -1, 1));
      const el = { x: pv.x + Math.cos(a0 - bend) * L, y: pv.y + Math.sin(a0 - bend) * L };
      v.line(pv.x, pv.y, el.x, el.y, '#d99a1e', 6); v.line(el.x, el.y, claw.x, claw.y, '#d99a1e', 5);
      v.line(pv.x, pv.y, el.x, el.y, '#ffc53d', 3.5); v.line(el.x, el.y, claw.x, claw.y, '#ffc53d', 3);
      v.fillCircle(el.x, el.y, 3, '#5c6688'); v.fillCircle(pv.x, pv.y, 3.5, '#5c6688');
      v.line(pv.x, pv.y, pv.x + 4, by - 4, '#5c6688', 3);
      const shut = (t > 2.05 && t < 2.7) || (bx > 452 && bx < 475);
      ctx.strokeStyle = '#4a4670'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(claw.x, claw.y); ctx.quadraticCurveTo(claw.x + s * (shut ? 5 : 9), claw.y + 4, claw.x + s * (shut ? 2 : 6), claw.y + 9); ctx.stroke(); }
      // words and sparkles
      if (t > 1.3 && t < 2.2) v.label('Boulder!', 252 - cam, 108, 13, '#fff');
      if (t > 2.75 && t < 3.6) v.label('Boulder cleared!', 120, 62 - v.seg(t, 2.75, 3.6) * 8, 14, '#8fe3b0');
      if (got) { const k = v.seg(bx, 455, 520); if (k < 1) { v.sparkle(rockX, rockY, k, '#bfe8ff', 10); v.label('+1 moon rock!', rockX, rockY - 18 - k * 10, 13, '#bfe8ff'); } }
      v.pill((got ? 3 : 2) + ' moon rocks', 8, 10, { size: 10, align: 'left' });
    },
  });
  // ----- END 15-3 Moon Buggy Crew preview -----
  //
  // ----- BEGIN 15-4 Planet Hop Race preview -----
  // ----- END 15-4 Planet Hop Race preview -----
}
