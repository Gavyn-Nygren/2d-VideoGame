/* Pip & Bo - Level previews for World 15 Orbit Outpost (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw15. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 15-1 Tethered Spacewalk preview -----
  // ----- END 15-1 Tethered Spacewalk preview -----
  //
  // ----- BEGIN 15-2 Gravity Flip Station preview -----
  // Bo flips Pip up to the ceiling, Pip walks upside down over the wall and grabs the keycard, Bo flips Pip back down,
  // and the airlock opens
  // a gravity switch console (col), standing on the floor at (x, y), or hanging from a ceiling (ceil)
  const pw15FlipSwitch = (v, x, y, col, ceil, lit) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); if (ceil) ctx.scale(1, -1);
    ctx.fillStyle = '#2b2d50'; v.rr(-8, -4, 16, 4, 1.5); ctx.fill();
    ctx.fillStyle = '#4a4e7e'; ctx.fillRect(-2, -13, 4, 10);
    ctx.fillStyle = col; v.rr(-7, -22, 14, 10, 4); ctx.fill();
    if (lit > 0) { ctx.globalAlpha *= lit; ctx.fillStyle = '#fff'; v.rr(-7, -22, 14, 10, 4); ctx.fill(); }
    ctx.restore();
    v.text('⇅', x, ceil ? y + 17 : y - 17, 8, '#fff', 'center', true);
    if (lit > 0) { ctx.save(); ctx.globalAlpha *= lit; ctx.strokeStyle = col; ctx.lineWidth = 2; v.circle(x, ceil ? y + 17 : y - 17, 10 + (1 - lit) * 14); ctx.stroke(); ctx.restore(); }
  };
  // the station: a purple wall with a round window, hull top and bottom with lit walkways, a wall in the middle
  const pw15FlipRoom = (v, t, open) => {
    const ctx = v.ctx, g = ctx.createLinearGradient(0, 0, 0, v.H);
    g.addColorStop(0, '#262a62'); g.addColorStop(1, '#1a1c46');
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, v.H);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
    for (let x = 40; x < v.W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x, 152); ctx.stroke(); }
    // the window onto space, with a pink planet
    v.fillCircle(84, 82, 22, '#8f95bf'); v.fillCircle(84, 82, 19, '#0b0d2c');
    ctx.save(); v.circle(84, 82, 19); ctx.clip();
    ctx.fillStyle = '#fff'; for (let i = 0; i < 14; i++) ctx.fillRect(66 + v.rand(i) * 36, 64 + v.rand(i + 40) * 36, 1.2, 1.2);
    v.fillCircle(90, 88, 8, '#ff9fb8');
    ctx.restore();
    // hull
    for (const [y, h, top] of [[0, 24, false], [152, 28, true]]) {
      ctx.fillStyle = '#5c5f86'; ctx.fillRect(0, y, v.W, h);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; for (let x = 0; x < v.W; x += 16) ctx.fillRect(x + 1, y + 2, 14, 2);
      ctx.fillStyle = '#7fe3ff'; ctx.globalAlpha = 0.6; ctx.fillRect(0, top ? y : y + h - 3, v.W, 3); ctx.globalAlpha = 1;
    }
    // the middle wall (from the floor; a gap over it at the ceiling)
    ctx.fillStyle = '#5c5f86'; ctx.fillRect(150, 70, 24, 82);
    ctx.fillStyle = '#7fe3ff'; ctx.globalAlpha = 0.6; ctx.fillRect(150, 70, 24, 3); ctx.globalAlpha = 1;
    // the airlock
    ctx.fillStyle = '#2b2d50'; v.rr(262, 116, 40, 36, 8); ctx.fill();
    ctx.fillStyle = v.c.gold; v.rr(264, 118, 36, 34, 7); ctx.fill();
    ctx.fillStyle = open > 0 ? '#fff2c4' : '#1c1a36'; v.rr(267, 121, 30, 31, 5); ctx.fill();
    if (open <= 0) { ctx.fillStyle = 'rgba(255,210,63,0.5)'; for (let k = 0; k < 3; k++) ctx.fillRect(270 + k * 9, 124, 4, 26); }
    else { ctx.globalAlpha = open; v.fillCircle(282, 134, 12, 'rgba(255,255,255,0.5)'); ctx.globalAlpha = 1; }
  };
  // a hero standing on the ceiling at (x, y): drawn upside down, feet up
  const pw15FlipHero = (v, id, x, y, o) => {
    v.ctx.save(); v.ctx.translate(x, y); v.ctx.scale(1, -1);
    v.hero(id, 0, 0, Object.assign({ shadow: false }, o));
    v.ctx.restore();
  };
  definePreview('Gravity Flip Station', {
    blurb: 'Your switch flips your partner: one of you walks on the ceiling!',
    loop: 6, still: 2.6,
    draw(v, t) {
      const k = t / 6, scene = q => this.scene(v, q, q * 6);
      scene(k);
      if (k > 0.93) { v.ctx.save(); v.ctx.globalAlpha *= v.ease.inOut(v.seg(k, 0.93, 1)); scene(0); v.ctx.restore(); }
    },
    scene(v, k, t) {
      const floor = 152, ceil = 24, keyGot = k > 0.52;
      pw15FlipRoom(v, t, v.seg(k, 0.8, 0.86));
      // Bo's blue switch on the left, Pip's orange one on the right
      const press1 = v.seg(k, 0.1, 0.16), press2 = v.seg(k, 0.62, 0.68);
      pw15FlipSwitch(v, 60, floor, v.c.bo, false, Math.max(press1 > 0 && press1 < 1 ? 1 - press1 : 0, press2 > 0 && press2 < 1 ? 1 - press2 : 0));
      pw15FlipSwitch(v, 228, floor, v.c.pip, false, 0);
      // the keycard over the wall, up by the ceiling
      if (!keyGot) {
        const bob = Math.sin(t * 3) * 2;
        v.ctx.save(); v.ctx.translate(162, 44 + bob); v.ctx.rotate(Math.sin(t * 2) * 0.15);
        v.ctx.fillStyle = v.c.gold; v.ctx.strokeStyle = v.c.goldDark; v.ctx.lineWidth = 1.2; v.rr(-8, -6, 16, 12, 2); v.ctx.fill(); v.ctx.stroke();
        v.ctx.fillStyle = '#2b2d50'; v.ctx.fillRect(-8, -3, 16, 2.5); v.ctx.fillStyle = '#7fe3ff'; v.ctx.fillRect(-5, 1, 5, 3.5); v.ctx.restore();
      } else v.sparkle(162, 44, v.seg(k, 0.52, 0.62), v.c.gold, 10);
      // Bo: walks to the switch, presses it twice, then hops to the airlock
      const boX = k < 0.08 ? v.lerp(44, 76, v.ease.inOut(v.seg(k, 0, 0.08))) : k < 0.84 ? 76 : v.lerp(76, 290, v.ease.inOut(v.seg(k, 0.84, 0.97)));
      const boHop = k > 0.84 ? v.hop(v.phase(k - 0.84, 0.045), 5) : 0;
      v.hero(1, boX, floor + boHop + (press1 > 0 && press1 < 1 ? 1 : 0), { face: k < 0.08 || k > 0.84 ? 1 : -1, mood: k > 0.7 ? 'joy' : 'happy', sq: press1 > 0 && press1 < 0.6 ? 0.2 : 0 });
      // Pip: up to the ceiling, over the wall upside down, down again, to the airlock
      if (k < 0.16) v.hero(0, 20, floor, { face: 1, mood: k > 0.12 ? 'wow' : 'happy' });
      else if (k < 0.27) {
        const u = v.ease.in(v.seg(k, 0.16, 0.27)), y = v.lerp(floor, ceil, u), x0 = v.lerp(20, 24, u);
        if (u < 0.5) v.hero(0, x0, y, { face: 1, mood: 'wow', rot: u * Math.PI * 2 });
        else pw15FlipHero(v, 0, x0, y, { face: 1, mood: 'wow', rot: (u - 1) * Math.PI * 2 });
        if (u > 0.2 && u < 0.9) v.label('Wheee!', 46, v.lerp(130, 60, u), 13, v.c.bo);
      } else if (k < 0.62) {
        const u = v.seg(k, 0.27, 0.6), x = v.lerp(24, 214, v.ease.inOut(u));
        pw15FlipHero(v, 0, x, ceil + (u > 0 && u < 1 ? Math.abs(Math.sin(u * 30)) * -1.2 : 0), { face: 1, mood: keyGot ? 'joy' : 'happy' });
        if (keyGot && k < 0.6) v.label('Keycard!', 162, 64, 12, v.c.gold);
      } else if (k < 0.74) {
        const u = v.ease.in(v.seg(k, 0.66, 0.74)), y = v.lerp(ceil, floor, u);
        if (u < 0.5) pw15FlipHero(v, 0, 214, y, { face: 1, mood: 'wow', rot: u * Math.PI * 2 });
        else v.hero(0, 214, y, { face: 1, mood: 'wow', rot: (u - 1) * Math.PI * 2 });
        if (u > 0.1 && u < 0.9) v.label('Flip!', 236, v.lerp(50, 120, u), 13, v.c.bo);
      } else {
        const x = k < 0.82 ? 214 : v.lerp(214, 276, v.ease.inOut(v.seg(k, 0.82, 0.92)));
        v.hero(0, x, floor + v.hop(v.seg(k, 0.74, 0.8), 8), { face: 1, mood: 'joy' });
      }
      if (k > 0.86) v.confetti(282, 120, v.seg(k, 0.86, 1));
    },
  });
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
  // Pip and Bo race across three little planets: run round, hop over, Pip's jet puff wins it, the rocket takes off
  const pw15HopPlanets = [{ x: 58, y: 132, r: 30, col: '#7fd0ff', dk: '#4a8fc4' }, { x: 160, y: 98, r: 24, col: '#ff9ccf', dk: '#c9659c' },
    { x: 266, y: 128, r: 30, col: '#ffd36b', dk: '#c99a32' }];
  function pw15HopSky(v, t) {
    const ctx = v.ctx, g = ctx.createLinearGradient(0, 0, 0, v.H);
    g.addColorStop(0, '#1b1640'); g.addColorStop(1, '#3b2a6e'); ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, v.H);
    for (let k = 0; k < 40; k++) {
      const tw = 0.5 + 0.5 * Math.sin(t * 3 + k * 1.7);
      ctx.globalAlpha = 0.35 + 0.5 * tw; v.fillCircle(v.rand(k) * v.W, v.rand(k + 50) * v.H, 0.6 + v.rand(k + 99) * 1.1, '#fff');
    }
    ctx.globalAlpha = 1;
  }
  function pw15HopPlanet(v, q) {
    const ctx = v.ctx;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); v.circle(q.x, q.y, q.r + 22); ctx.stroke(); ctx.setLineDash([]);
    const g = ctx.createRadialGradient(q.x - q.r * 0.35, q.y - q.r * 0.4, 2, q.x, q.y, q.r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, q.col); g.addColorStop(1, q.dk);
    ctx.fillStyle = g; v.circle(q.x, q.y, q.r); ctx.fill();
    ctx.fillStyle = 'rgba(40,30,80,0.2)'; v.circle(q.x + q.r * 0.3, q.y + q.r * 0.25, q.r * 0.16); ctx.fill(); v.circle(q.x - q.r * 0.4, q.y + q.r * 0.35, q.r * 0.1); ctx.fill();
    // a sleepy smile
    ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(q.x + s * q.r * 0.25, q.y - q.r * 0.05, 2, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(q.x, q.y + q.r * 0.12, 3.2, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
  // a hero with feet at (x, y), tipped by rot (feet toward the planet)
  function pw15HopHero(v, id, x, y, rot, o) {
    const ctx = v.ctx; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); v.hero(id, 0, 0, Object.assign({ s: 0.62, shadow: false }, o)); ctx.restore();
  }
  // where a runner is at time k (seconds into the loop): legs of running round a planet and jumping to the next
  function pw15HopWhere(id, t) {
    const P = pw15HopPlanets, d = id ? 0.16 : 0; // Bo a little behind
    const legs = [
      { run: 0, a0: -2.4, a1: -0.7, t0: 0, t1: 0.75 + d },
      { hop: 0, from: -0.7, to: 1, la: -2.3, t0: 0.75 + d, t1: 1.45 + d },
      { run: 1, a0: -2.3, a1: -0.6, t0: 1.45 + d, t1: 2.1 + d },
      { hop: 1, from: -0.6, to: 2, la: -2.4, t0: 2.1 + d, t1: id ? 3.15 : 2.75, puff: !id },
      { run: 2, a0: -2.4, a1: id ? -2.0 : -1.62, t0: id ? 3.15 : 2.75, t1: id ? 3.6 : 3.1 },
    ];
    for (const L of legs) {
      if (t > L.t1 && L !== legs[legs.length - 1]) continue;
      const k = Math.max(0, Math.min(1, (t - L.t0) / (L.t1 - L.t0)));
      if (L.run != null) {
        const q = P[L.run], a = L.a0 + (L.a1 - L.a0) * k;
        return { x: q.x + Math.cos(a) * q.r, y: q.y + Math.sin(a) * q.r, rot: a + Math.PI / 2, air: false, k };
      }
      const q = P[L.hop], n = P[L.to], sx = q.x + Math.cos(L.from) * q.r, sy = q.y + Math.sin(L.from) * q.r;
      const ex = n.x + Math.cos(L.la) * n.r, ey = n.y + Math.sin(L.la) * n.r, cx = (sx + ex) / 2, cy = Math.min(sy, ey) - 42;
      const u = 1 - k, x = u * u * sx + 2 * u * k * cx + k * k * ex, y = u * u * sy + 2 * u * k * cy + k * k * ey;
      return { x, y, rot: (L.from + Math.PI / 2) * u + (L.la + Math.PI / 2) * k, air: true, k, puff: L.puff && k > 0.35 && k < 0.7, vx: ex - sx };
    }
  }
  function pw15HopRocket(v, x, y, lift, who) {
    const ctx = v.ctx; ctx.save(); ctx.translate(x, y - lift);
    if (lift > 0) { ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.quadraticCurveTo(0, 14 + Math.sin(v.t * 40) * 3, 5, 0); ctx.fill(); }
    ctx.fillStyle = '#f7f4ff'; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.quadraticCurveTo(-9, -20, 0, -36); ctx.quadraticCurveTo(9, -20, 7, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff5f6d'; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-12, 4); ctx.lineTo(-8, -10); ctx.fill(); ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(12, 4); ctx.lineTo(8, -10); ctx.fill();
    v.fillCircle(0, -19, 5, '#8fdcff'); if (who != null) v.fillCircle(0, -18.5, 3.4, who ? v.c.bo : v.c.pip);
    ctx.restore();
  }
  definePreview('Planet Hop Race', {
    blurb: 'Run round tiny planets and hop to the next. First to the rocket wins!',
    loop: 5, still: 2.45,
    draw(v, t) {
      const ctx = v.ctx, P = pw15HopPlanets, rk = { x: P[2].x, y: P[2].y - P[2].r };
      pw15HopSky(v, t);
      P.forEach(q => pw15HopPlanet(v, q));
      const lift = t > 3.75 ? Math.pow(t - 3.75, 2) * 70 : 0, inside = t > 3.6;
      pw15HopRocket(v, rk.x, rk.y, lift, inside ? 0 : null);
      for (const id of [1, 0]) {
        if (id === 0 && inside) continue;
        const w = pw15HopWhere(id, t);
        if (w.puff) { const ang = w.rot + Math.PI / 2 + 0.6; for (let k = 0; k < 3; k++) v.fillCircle(w.x + Math.cos(ang) * (8 + k * 6), w.y + Math.sin(ang) * (8 + k * 6), 4 - k, k ? 'rgba(255,255,255,0.7)' : '#ffb347'); }
        const mood = t > 3.7 ? (id ? 'wow' : 'joy') : w.air ? 'wow' : 'grit';
        pw15HopHero(v, id, w.x, w.y, w.rot, { face: 1, mood, sq: w.air ? -0.15 : Math.sin(t * 22 + id) * 0.08 });
        if (w.puff && id === 0) v.pill('boost!', w.x, w.y - 30, { size: 9, col: v.c.gold });
      }
      if (t > 3.6) { v.confetti(rk.x, rk.y - 20, v.seg(t, 3.6, 4.9)); v.sparkle(rk.x - 20, rk.y - 40, v.seg(t, 3.7, 4.3), v.c.gold); }
      if (t > 3.8) v.label('Pip wins!', v.W / 2, 26, 18, v.c.pip);
    },
  });
  // ----- END 15-4 Planet Hop Race preview -----
}
