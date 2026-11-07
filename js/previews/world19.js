/* Pip & Bo - Level previews for World 19 Tumbleweed Gulch (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw19. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 19-1 Train Heist Hop preview -----
  // (preview goes here)
  // ----- END 19-1 Train Heist Hop preview -----
  //
  //
  //
  // ----- BEGIN 19-2 Handcar Hustle preview -----
  // (preview goes here)
  // ----- END 19-2 Handcar Hustle preview -----
  //
  //
  //
  // ----- BEGIN 19-3 Gold Mine Cart preview -----
  // the cart rolls through the lantern-lit mine; a sign says gold up top and a dead end below, Bo flips the lever up,
  // the cart takes the upper track (the lower one ends at a hay buffer), and Pip hops a gap scooping a gold arc. Yee-haw!
  const pw19MineX = t => 40 + 72 * t;                                // the cart along the mine (world px)
  const pw19MineFork = 250, pw19MineGap = [372, 404];
  const pw19MineRail = (x, lane) => {
    // the main line at 122; past the fork the upper track climbs to 80 and the lower one dips to 156
    if (x <= pw19MineFork || lane === 'm') return 122;
    const u = Math.min(1, (x - pw19MineFork) / 70), s = u * u * (3 - 2 * u);
    return 122 + (lane === 'u' ? -42 : 34) * s;
  };
  const pw19MineNugget = (v, x, y, s) => {
    const ctx = v.ctx;
    v.fillCircle(x, y, 7 * s, 'rgba(255,220,100,0.28)');
    ctx.fillStyle = '#ffcf4a'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y, 5 * s, 4 * s, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    v.fillCircle(x - 1.5 * s, y - 1.5 * s, 1.2 * s, 'rgba(255,255,255,0.8)');
  };
  const pw19MineTrack = (v, cam, lane, x0, x1) => {
    const ctx = v.ctx;
    for (let x = Math.ceil(x0 / 12) * 12; x <= x1; x += 12) {
      if (lane === 'u' && x > pw19MineGap[0] && x < pw19MineGap[1]) continue;
      const y = pw19MineRail(x, lane);
      ctx.fillStyle = '#7a4a28'; ctx.fillRect(x - cam - 4, y + 1, 8, 4);
      if (x % 48 === 0) { ctx.fillStyle = 'rgba(42,25,14,0.8)'; ctx.fillRect(x - cam - 2, y + 4, 4, 70); }
    }
    ctx.strokeStyle = '#c9ced8'; ctx.lineWidth = 2.5; ctx.beginPath();
    let on = false;
    for (let x = x0; x <= x1; x += 3) {
      const gap = lane === 'u' && x > pw19MineGap[0] && x < pw19MineGap[1];
      const y = pw19MineRail(x, lane);
      if (gap) { on = false; continue; }
      if (!on) { ctx.moveTo(x - cam, y); on = true; } else ctx.lineTo(x - cam, y);
    }
    ctx.stroke();
  };
  definePreview('Gold Mine Cart', {
    blurb: 'One jumps gaps and ducks beams, one pulls the lever to find the gold!',
    loop: 6,
    still: 4.6,
    draw(v, t) {
      const ctx = v.ctx, W = v.W, H = v.H;
      // the mine: a warm dark cavern, timber frames with lanterns, gold veins
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#3d2618'); g.addColorStop(1, '#1f130c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const cx = pw19MineX(t), cam = cx - 96;
      for (let k = -1; k < 5; k++) {
        const x = k * 110 - ((cam * 0.5) % 110);
        ctx.fillStyle = 'rgba(42,25,14,0.85)'; ctx.fillRect(x, 14, 6, H); ctx.fillRect(x - 4, 14, 74, 6);
        const lx = x + 34;
        v.fillCircle(lx, 40, 22, 'rgba(255,200,110,0.22)');
        ctx.fillStyle = '#ffd27a'; ctx.fillRect(lx - 3, 35, 6, 8);
        ctx.strokeStyle = 'rgba(255,207,74,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 10, 96 + (k % 2) * 8); ctx.quadraticCurveTo(x + 40, 84, x + 80, 100); ctx.stroke();
      }
      ctx.fillStyle = '#4a2d1c'; ctx.fillRect(0, 168, W, 12);
      // the sign: gold up top, a boarded X down below
      const sx = 172 - cam;
      ctx.fillStyle = '#5a3a1c'; ctx.fillRect(sx - 2, 60, 4, 62);
      ctx.fillStyle = '#c98e57'; v.rr(sx - 22, 28, 44, 40, 4); ctx.fill(); ctx.strokeStyle = '#704622'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#3a200c';
      ctx.beginPath(); ctx.moveTo(sx - 16, 43); ctx.lineTo(sx - 11, 34); ctx.lineTo(sx - 6, 43); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx - 16, 53); ctx.lineTo(sx - 11, 62); ctx.lineTo(sx - 6, 53); ctx.closePath(); ctx.fill();
      pw19MineNugget(v, sx + 9, 39, 1);
      ctx.strokeStyle = '#a3321e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx + 3, 52); ctx.lineTo(sx + 15, 63); ctx.moveTo(sx + 15, 52); ctx.lineTo(sx + 3, 63); ctx.stroke();
      // the tracks: the main line, the upper track (with a gap and a net) and the lower one ending at a hay buffer
      pw19MineTrack(v, cam, 'm', cam - 10, pw19MineFork);
      pw19MineTrack(v, cam, 'u', pw19MineFork, cam + W + 10);
      pw19MineTrack(v, cam, 'd', pw19MineFork, 436);
      const bx = 436 - cam, by = pw19MineRail(436, 'd');
      ctx.fillStyle = '#e8c27a'; v.rr(bx, by - 18, 16, 18, 4); ctx.fill();
      ctx.fillStyle = '#8a5a30'; ctx.save(); ctx.translate(bx + 28, by - 22); ctx.rotate(0.7); ctx.fillRect(-16, -3, 32, 6); ctx.rotate(-1.4); ctx.fillRect(-16, -3, 32, 6); ctx.restore();
      ctx.strokeStyle = 'rgba(233,210,154,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let k = 0; k <= 10; k++) { const x = pw19MineGap[0] - 14 + k * 6.2; ctx.lineTo(x - cam, 120 + Math.sin(Math.PI * k / 10) * 8); }
      ctx.stroke();
      // the switch arrow: down, then up once Bo pulls the lever
      const flip = v.seg(t, 1.1, 1.35), up = flip > 0.5;
      const ax = pw19MineFork - 12 - cam;
      ctx.fillStyle = '#fff3d6'; v.circle(ax, 142, 7); ctx.fill(); ctx.strokeStyle = '#704622'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save(); ctx.translate(ax, 142); ctx.rotate(up ? -0.75 : 0.75); ctx.fillStyle = v.c.bo; ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-2, -4); ctx.lineTo(-2, 4); ctx.closePath(); ctx.fill(); ctx.restore();
      // gold: a row on the upper track, and an arc over the gap
      const lane = cx > pw19MineFork ? 'u' : 'm';
      const hk = v.seg(cx, pw19MineGap[0] - 34, pw19MineGap[1] + 34), hop = v.hop(hk, 30);
      const golds = [[300, 0], [318, 0], [336, 0], [370, 16], [388, 26], [406, 16]];
      golds.forEach(([gx, gh], q) => {
        const got = cx > gx - 4;
        const gy = pw19MineRail(gx, 'u') - 14 - gh;
        if (!got) pw19MineNugget(v, gx - cam, gy + Math.sin(t * 4 + q) * 1, 1);
        else v.sparkle(gx - cam, gy, v.seg(cx, gx - 4, gx + 24), '#fff3b0', 6);
      });
      // the cart with the crew: Pip rides up front, Bo works the lever at the back
      const ry = pw19MineRail(cx, lane) + hop, slope = (pw19MineRail(cx + 4, lane) - pw19MineRail(cx - 4, lane)) / 8;
      const sxc = cx - cam;
      ctx.save(); ctx.translate(sxc, ry); ctx.rotate(Math.atan(slope));
      const duckBob = Math.sin(t * 18) * 0.6;
      v.hero(1, -9, -19 + duckBob, { s: 0.62, face: 1, mood: up && t < 2.4 ? 'joy' : 'happy' });
      v.hero(0, 9, -19 - duckBob, { s: 0.62, face: 1, mood: hk > 0 && hk < 1 ? 'wow' : t > 5 ? 'joy' : 'happy' });
      // hats
      for (const [hx, hid] of [[-9, 1], [9, 0]]) {
        ctx.fillStyle = '#8a5a30'; ctx.beginPath(); ctx.ellipse(hx, -34 + (hid ? duckBob : -duckBob), 8, 2, 0, 0, Math.PI * 2); ctx.fill();
        v.rr(hx - 4, -40 + (hid ? duckBob : -duckBob), 8, 6, 2); ctx.fill();
      }
      ctx.fillStyle = '#8a5a30'; ctx.strokeStyle = '#4a2d18'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-24, -20); ctx.lineTo(24, -20); ctx.lineTo(20, -5); ctx.lineTo(-20, -5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5c6070'; ctx.fillRect(-25, -21, 50, 3);
      ctx.fillStyle = v.c.pip; ctx.fillRect(3, -14, 16, 3); ctx.fillStyle = v.c.bo; ctx.fillRect(-19, -14, 16, 3);
      for (const wx of [-14, 14]) { ctx.fillStyle = '#3b3a45'; v.circle(wx, -4, 5); ctx.fill(); ctx.fillStyle = '#c9ced8'; v.circle(wx, -4, 1.6); ctx.fill(); }
      ctx.fillStyle = '#ffd27a'; ctx.fillRect(23, -27, 6, 7);
      // the lever: it swings from down to up
      const la = v.lerp(-3.75, -2.25, v.ease.out(flip));
      ctx.save(); ctx.translate(-24, -13); ctx.rotate(la);
      ctx.strokeStyle = '#5c6070'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, 0); ctx.stroke();
      v.fillCircle(16, 0, 3.5, '#e04a3a');
      ctx.restore();
      ctx.restore();
      // speech: Bo reads the sign, the gold rains in, and a happy finish
      if (t > 0.5 && t < 1.6) v.bubble('Gold is up top!', sxc - 10, ry - 34, { size: 9 });
      if (t > 2.0 && t < 2.9) v.label('UP!', sxc - 34, ry - 40, 12, v.c.gold);
      if (hk > 0.1 && hk < 0.9 && t <= 5.0) v.label('Jump!', sxc + 22, ry - 44, 12, v.c.gold);
      if (t > 5.0) { v.bubble('Yee-haw!', sxc + 8, ry - 34, { size: 10 }); v.confetti(sxc, ry - 30, v.seg(t, 5.0, 6.0)); }
      // a gold counter
      const n = golds.filter(([gx]) => cx > gx - 4).length;
      v.pill('Gold ' + (12 + n * 3), W - 8, 14, { align: 'right', col: '#ffe27a', size: 10 });
    },
  });
  // ----- END 19-3 Gold Mine Cart preview -----
  //
  //
  //
  // ----- BEGIN 19-4 Quick-Draw Showdown preview -----
  // (preview goes here)
  // ----- END 19-4 Quick-Draw Showdown preview -----
  //
  //
  //
}
