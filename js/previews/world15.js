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
  // ----- END 15-3 Moon Buggy Crew preview -----
  //
  // ----- BEGIN 15-4 Planet Hop Race preview -----
  // ----- END 15-4 Planet Hop Race preview -----
}
