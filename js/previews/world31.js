/* Pip & Bo - Level previews for World 31 Shrunk in the Backyard. Helpers are prefixed pw31. Each level's preview sits
   between its own BEGIN/END lines. */
'use strict';

// shared: a bug's-eye lawn (sky, huge blades, soil) and a giant grass blade
const pw31TAU = Math.PI * 2;
const pw31Blade = (v, x, y, h, lean, col) => {
  const c = v.ctx;
  c.fillStyle = col; c.beginPath(); c.moveTo(x - 5, y); c.quadraticCurveTo(x - 5 + lean * 0.35, y - h * 0.55, x + lean, y - h);
  c.quadraticCurveTo(x + 5 + lean * 0.35, y - h * 0.55, x + 5, y); c.closePath(); c.fill();
};
const pw31Lawn = (v, t, gy, o = {}) => {
  const c = v.ctx;
  const g = c.createLinearGradient(0, 0, 0, v.H); g.addColorStop(0, '#6ec0f0'); g.addColorStop(1, '#e8f6dc'); c.fillStyle = g; c.fillRect(0, 0, v.W, v.H);
  v.fillCircle(270, 30, 26, 'rgba(255,240,170,0.45)'); v.fillCircle(270, 30, 15, '#fff6c8');
  c.fillStyle = 'rgba(214,190,160,0.5)'; for (let x = -20; x < v.W; x += 46) { c.beginPath(); c.moveTo(x, 110); c.lineTo(x, 50); c.lineTo(x + 20, 40); c.lineTo(x + 40, 50); c.lineTo(x + 40, 110); c.fill(); }
  for (let i = 0; i < 18; i++) pw31Blade(v, i * 20 + v.rand(i) * 14 - (o.scroll || 0) % 20, gy + 4, 70 + v.rand(i + 9) * 70, (v.rand(i + 3) - 0.5) * 30 + Math.sin(t * 1.3 + i) * 2, i % 2 ? 'rgba(96,170,80,0.7)' : 'rgba(118,186,96,0.7)');
  c.fillStyle = '#6b4a32'; c.fillRect(0, gy, v.W, v.H - gy); c.fillStyle = '#4a3122'; c.fillRect(0, gy + 10, v.W, v.H - gy);
  c.fillStyle = '#5fb84a'; c.fillRect(0, gy - 2, v.W, 3);
};

// ----- BEGIN 31-1 Lawnmower Escape -----
// A giant red mower roars in from the left. Pip chops through a clump of tall grass, Bo cups their hands at a pebble,
// Pip jumps off Bo onto it and pulls Bo up, and the two of them cheer on top as the mower rattles behind.
{
  const pw31mwPebble = (v, x, y, w, h) => {
    const c = v.ctx;
    c.fillStyle = '#9a968c'; c.strokeStyle = '#6c695f'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x - w / 2, y); c.bezierCurveTo(x - w / 2 - 2, y - h * 0.8, x - w / 4, y - h - 1, x, y - h); c.bezierCurveTo(x + w / 3, y - h - 1, x + w / 2 + 2, y - h * 0.6, x + w / 2, y); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#c8c4b8'; c.beginPath(); c.ellipse(x - w * 0.18, y - h * 0.72, w * 0.15, h * 0.1, -0.3, 0, pw31TAU); c.fill();
  };
  const pw31mwMower = (v, x, gy, t) => {
    const c = v.ctx, sh = Math.sin(t * 40) * 1.2;
    c.save(); c.translate(sh, 0);
    c.fillStyle = '#d8342a'; v.rr(x - 140, gy - 46, 140, 30, 8); c.fill();
    c.fillStyle = '#8a1e18'; c.fillRect(x - 140, gy - 18, 140, 16);
    c.fillStyle = '#e8e8e8'; v.rr(x - 6, gy - 46, 7, 44, 3); c.fill();
    const wx = x - 40, wy = gy - 26;
    v.fillCircle(wx, wy, 28, '#1e1e22'); v.fillCircle(wx, wy, 14, '#3a3a40'); v.fillCircle(wx, wy, 5, '#e8e8e8');
    c.fillStyle = '#d8342a'; v.rr(x - 140, -10, 80, gy - 40, 10); c.fill();
    c.restore();
    c.fillStyle = 'rgba(95,184,74,0.9)';
    for (let k = 0; k < 6; k++) { const u = ((t * 1.7 + k * 0.17) % 1); c.fillRect(x + 4 + u * 50, gy - 10 - Math.sin(u * Math.PI) * 30 - k * 2, 4, 2); }
  };
  definePreview('Lawnmower Escape', {
    blurb: 'Outrun the roaring mower! Chop through tall grass and boost over pebbles.',
    loop: 6, still: 4.9,
    draw(v, t) {
      const c = v.ctx, gy = 150, e = v.ease;
      pw31Lawn(v, t, gy);
      // the clump of grass Pip chops (falls at 1.4)
      const cut = v.seg(t, 1.2, 1.6);
      for (let k = 0; k < 5; k++) {
        const x = 128 + k * 5;
        if (cut < 1) { c.save(); c.translate(x, gy); c.rotate(cut * 1.3); pw31Blade(v, 0, 0, 120, (k - 2) * 4, k % 2 ? '#2f7f2a' : '#378f30'); c.restore(); }
        else { pw31Blade(v, x, gy, 8, 0, '#378f30'); c.save(); c.translate(x, gy - 3); c.rotate(1.45); pw31Blade(v, 0, 0, 90, 0, '#378f30'); c.restore(); }
      }
      pw31mwPebble(v, 236, gy + 1, 50, 44);
      // Bo walks to the pebble and braces (2.0-3.4), then is pulled up (3.6-4.1)
      const boX = v.lerp(100, 204, e.inOut(v.seg(t, 1.5, 2.2)));
      const up = e.inOut(v.seg(t, 3.6, 4.1));
      const boPos = up > 0 ? { x: v.lerp(204, 232, up), y: v.lerp(gy, gy - 44, up) - Math.sin(up * Math.PI) * 10 } : { x: boX, y: gy };
      // Pip: chops (0.6-1.4), runs onto Bo (2.4-2.8), jumps up onto the pebble (2.8-3.3), reaches down (3.3-4.1)
      let pipX = v.lerp(60, 118, e.out(v.seg(t, 0.2, 0.7))), pipY = gy;
      if (t > 2.3) pipX = v.lerp(118, 200, e.inOut(v.seg(t, 2.3, 2.8)));
      if (t > 2.8) { const u = v.seg(t, 2.8, 3.3); pipX = v.lerp(200, 226, u); pipY = v.lerp(gy, gy - 44, u) + v.hop(u, 40); }
      if (t > 4.2) { pipX = 226 + Math.sin(t * 9) * 1; }
      const chop = t > 0.6 && t < 1.4 ? Math.abs(Math.sin(t * 12)) : 0;
      // the thorn
      if (t < 2.4) { c.fillStyle = '#7a2a3a'; c.save(); c.translate(pipX + 8, pipY - 12); c.rotate(-0.8 + chop * 1.4); c.beginPath(); c.moveTo(0, -2); c.lineTo(16, 0); c.lineTo(0, 2); c.fill(); c.restore(); }
      const brace = t > 2.2 && t < 2.95;
      v.hero(1, boPos.x, boPos.y, { s: 0.6, face: 1, sq: brace ? 0.35 : 0, mood: t > 4.2 ? 'joy' : 'happy' });
      v.hero(0, pipX, pipY, { s: 0.6, face: t > 3.3 && t < 4.1 ? -1 : 1, mood: t > 4.2 ? 'joy' : t > 2.8 && t < 3.3 ? 'wow' : 'grit' });
      if (t > 3.3 && t < 4.1) v.line(pipX - 4, pipY - 8, pipX - 12, pipY + 6, v.c.pipDark, 2);
      if (t > 2.75 && t < 3.0) v.label('Boost!', 205, gy - 34, 11, v.c.bo);
      if (t > 3.6 && t < 4.3) v.label('Up you come!', 230, gy - 70, 11, '#fff');
      if (t > 1.35 && t < 1.9) v.label('Chop!', 134, gy - 50, 12, '#fff');
      if (t > 4.3) { v.confetti(232, gy - 60, t - 4.3); v.label('Made it!', 232, gy - 78, 13, v.c.gold); }
      // the mower creeps in from the left
      pw31mwMower(v, v.lerp(-20, 60, v.seg(t, 0, 5.5)), gy, t);
    },
  });
}
// ----- END 31-1 Lawnmower Escape -----

// ----- BEGIN 31-2 Ant Hill Heist -----
// Pip and Bo carry a cookie crumb through an ant tunnel. A soldier ant walks along the ceiling toward them; they
// freeze under the crumb while its "?" fills and empties, it walks on past, and they sneak the crumb out into the light.
{
  const pw31ahAnt = (v, x, y, f, t, mad) => {
    const c = v.ctx;
    c.save(); c.translate(x, y); c.scale(f * 0.55, -0.55);
    c.strokeStyle = '#5a120c'; c.lineWidth = 3; c.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const lx = -14 + k * 14, sw = Math.sin(t * 10 + k * 2) * 5; c.beginPath(); c.moveTo(lx, -18); c.lineTo(lx + sw - 6, -30); c.lineTo(lx + sw - 10, 0); c.stroke(); }
    c.fillStyle = '#b8281e'; c.strokeStyle = '#5a120c'; c.lineWidth = 2;
    for (const [ex, ey, rx, ry] of [[-30, -24, 20, 14], [-2, -22, 11, 8], [22, -26, 14, 12]]) { c.beginPath(); c.ellipse(ex, ey, rx, ry, 0, 0, pw31TAU); c.fill(); c.stroke(); }
    v.fillCircle(27, -30, 4, mad ? '#ffec5a' : '#1a0a08');
    c.strokeStyle = '#3a0a06'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(34, -24); c.quadraticCurveTo(46, -28, 50, -16); c.moveTo(34, -20); c.quadraticCurveTo(46, -14, 48, -12); c.stroke();
    c.restore();
  };
  const pw31ahCrumb = (v, x, y) => {
    const c = v.ctx;
    c.fillStyle = '#d89a50'; c.strokeStyle = '#8a5a24'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x - 30, y); c.lineTo(x - 28, y - 12); c.lineTo(x - 14, y - 16); c.lineTo(x, y - 13); c.lineTo(x + 14, y - 17); c.lineTo(x + 30, y - 11); c.lineTo(x + 30, y); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#4a2a14'; for (const [dx, dy] of [[-16, -6], [2, -9], [17, -5], [-4, -3]]) { c.beginPath(); c.ellipse(x + dx, y + dy, 3, 2.4, 0.5, 0, pw31TAU); c.fill(); }
  };
  definePreview('Ant Hill Heist', {
    blurb: 'Carry a giant cookie crumb out of the ant hill. Freeze when soldier ants pass!',
    loop: 6.4, still: 2.6,
    draw(v, t) {
      const c = v.ctx, fl = 140, ce = 62;
      c.fillStyle = '#3a2618'; c.fillRect(0, 0, v.W, v.H);
      for (let i = 0; i < 24; i++) v.fillCircle(v.rand(i) * v.W, v.rand(i + 30) * v.H, 3 + v.rand(i + 60) * 4, '#4a3222');
      c.fillStyle = '#7a5434'; c.beginPath(); c.moveTo(0, fl + 4); c.lineTo(v.W, fl + 4); for (let x = v.W; x >= 0; x -= 20) c.lineTo(x, ce + Math.sin(x * 0.04) * 5); c.closePath(); c.fill();
      // the way out
      const g = c.createRadialGradient(330, 100, 4, 330, 100, 70); g.addColorStop(0, 'rgba(255,250,210,0.95)'); g.addColorStop(1, 'rgba(255,240,180,0)'); c.fillStyle = g; c.fillRect(250, 30, 90, 120);
      // the crumb moves: 0-1.4 go, 1.4-3.6 frozen, 3.6-5.6 go
      const go1 = v.seg(t, 0, 1.4), go2 = v.seg(t, 3.6, 5.6), cx = 60 + go1 * 60 + go2 * 130, frozen = t > 1.4 && t < 3.6;
      // the ant walks left along the ceiling, over them
      const ax = v.lerp(300, 20, v.seg(t, 0.4, 4.4)), sus = t > 1.5 && t < 3.6 ? Math.sin(v.seg(t, 1.5, 3.6) * Math.PI) * 0.75 : 0;
      if (Math.abs(ax - cx) < 110) { c.fillStyle = 'rgba(220,255,120,0.13)'; c.fillRect(ax - 70, ce, 100, fl - ce); }
      if (!frozen) for (const id of [0, 1]) v.hero(id, cx + (id ? 20 : -20), fl, { s: 0.55, face: 1, rot: Math.sin(t * 12 + id * 3) * 0.08 });
      pw31ahCrumb(v, cx, frozen ? fl : fl - 18);
      if (frozen) for (const id of [0, 1]) { c.fillStyle = id ? v.c.boDark : v.c.pipDark; v.rr(cx + (id ? 16 : -24) , fl - 3, 8, 3, 1); c.fill(); }
      pw31ahAnt(v, ax, ce + 4, -1, t, sus > 0.5);
      if (sus > 0.02) { v.fillCircle(ax - 6, ce + 44, 9, 'rgba(20,10,6,0.75)'); c.fillStyle = sus > 0.6 ? '#ff5a4a' : '#ffd84a'; c.beginPath(); c.moveTo(ax - 6, ce + 44); c.arc(ax - 6, ce + 44, 7, -Math.PI / 2, -Math.PI / 2 + pw31TAU * sus); c.closePath(); c.fill(); v.text('?', ax - 6, ce + 45, 10, '#fff'); }
      if (t > 1.3 && t < 2.0) v.label('Freeze!', cx, fl - 42, 12, v.c.gold);
      if (t > 3.7 && t < 4.4) v.label('Sneak on!', cx, fl - 46, 11, '#d9ffd0');
      if (t > 5.6) { v.label('Got it!', cx, fl - 50, 13, v.c.gold); v.confetti(cx, fl - 40, t - 5.6); }
    },
  });
}
// ----- END 31-2 Ant Hill Heist -----

// ----- BEGIN 31-3 Bird Attack Dash -----
// Pip lies under a flowerpot watching the sky; the robin stares down at Bo, Pip warns "LOOK OUT!", Bo dashes into a
// curled leaf, and the robin dives and pecks the leaf: THUNK! It flaps away and Bo cheers.
{
  const pw31bdRobin = (v, x, y, s, t, tuck, f = 1) => {
    const c = v.ctx, flap = tuck ? -0.9 : Math.sin(t * 10) * 0.7;
    c.save(); c.translate(x, y); c.scale(s * f, s);
    c.fillStyle = '#5a3a28'; c.save(); c.rotate(-0.4 - flap * 0.6); c.beginPath(); c.ellipse(-10, -30, 26, 60, -0.6, 0, pw31TAU); c.fill(); c.restore();
    c.fillStyle = '#4a3020'; c.beginPath(); c.moveTo(-50, 0); c.lineTo(-110, -20); c.lineTo(-110, 20); c.closePath(); c.fill();
    c.fillStyle = '#6a4a34'; c.beginPath(); c.ellipse(0, 0, 66, 46, 0, 0, pw31TAU); c.fill();
    c.fillStyle = '#e8702a'; c.beginPath(); c.ellipse(18, 14, 46, 34, 0.2, 0, pw31TAU); c.fill();
    v.fillCircle(62, -30, 34, '#5a3a28'); v.fillCircle(74, -38, 9, '#fff'); v.fillCircle(76, -38, 6, '#100808');
    c.fillStyle = '#f2c03a'; c.beginPath(); c.moveTo(90, -34); c.lineTo(132, -26); c.lineTo(92, -20); c.closePath(); c.fill();
    c.fillStyle = '#7a5038'; c.save(); c.rotate(0.2 + flap); c.beginPath(); c.ellipse(-16, -26, 24, 62, -0.5, 0, pw31TAU); c.fill(); c.restore();
    c.restore();
  };
  definePreview('Bird Attack Dash', {
    blurb: 'A hungry robin hunts you! Watch the sky, warn, and dash between hiding spots.',
    loop: 6, still: 3.0,
    draw(v, t) {
      const c = v.ctx, gy = 150, e = v.ease;
      pw31Lawn(v, t, gy);
      // Pip under a flowerpot, looking up with a spyglass
      v.hero(0, 60, gy, { s: 0.6, face: 1, rot: -1.2, mood: t > 1.2 && t < 2.2 ? 'wow' : 'happy' });
      c.fillStyle = '#c8643a'; c.beginPath(); c.moveTo(34, gy + 1); c.lineTo(40, gy - 34); c.lineTo(80, gy - 34); c.lineTo(86, gy + 1); c.closePath(); c.globalAlpha = 0.8; c.fill(); c.globalAlpha = 1;
      // the leaf Bo hides under
      c.fillStyle = '#c8a040'; c.strokeStyle = '#8a6420'; c.lineWidth = 1.5;
      const pk = t > 2.85 && t < 3.2 ? Math.sin(t * 60) * 2 : 0;
      // Bo runs from the middle to the leaf (1.6-2.4)
      const boX = v.lerp(150, 238, e.inOut(v.seg(t, 1.55, 2.4))), hid = t > 2.4 && t < 4.5;
      if (t <= 4.5) v.hero(1, boX, gy, { s: 0.6, face: 1, mood: t > 4.5 ? 'joy' : t > 1.5 ? 'wow' : 'happy', alpha: hid ? 0.5 : 1 });
      c.beginPath(); c.moveTo(214 + pk, gy + 1); c.quadraticCurveTo(222 + pk, gy - 40, 240 + pk, gy - 34); c.quadraticCurveTo(268 + pk, gy - 24, 264 + pk, gy + 1); c.closePath(); c.fill(); c.stroke();
      if (t > 4.5) v.hero(1, 238, gy - 30 + v.hop(v.seg(t, 4.5, 4.9), 10), { s: 0.6, face: 1, mood: 'joy' });
      // the robin: circling high (0-1.2), staring (1.2-2.2), tuck (2.2-2.5), dive (2.5-2.9), flap away (3.2-4.5)
      let rx = 160 + Math.cos(t * 1.4) * 60, ry = 26, tuck = false, s = 0.14;
      if (t > 1.2) { rx = 200; ry = 26; s = 0.18; }
      if (t > 2.2) { tuck = true; }
      if (t > 2.5) { const u = v.seg(t, 2.5, 2.9); rx = v.lerp(200, 238, u); ry = v.lerp(26, gy - 40, u * u); s = v.lerp(0.18, 0.32, u); }
      if (t > 2.9) { rx = 238; ry = gy - 40; s = 0.32; }
      if (t > 3.2) { const u = v.seg(t, 3.2, 4.6); rx = v.lerp(238, 340, u); ry = v.lerp(gy - 40, -40, u); tuck = false; }
      if (t > 1.2 && t < 2.5) { c.strokeStyle = 'rgba(255,60,40,0.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(238, gy + 1, 18, 3, 0, 0, pw31TAU); c.stroke(); }
      pw31bdRobin(v, rx, ry, s, t, tuck, 1);
      if (t > 1.25 && t < 2.2) v.label('!', 215, 18, 16, '#ff4a3a');
      if (t > 1.4 && t < 2.3) v.label('LOOK OUT!', 70, gy - 52, 12, v.c.gold);
      if (t > 2.9 && t < 3.6) v.label('THUNK!', 238, gy - 66, 13, '#fff');
      if (t > 4.6) { v.label('Missed me!', 238, gy - 40, 12, v.c.gold); v.confetti(238, gy - 30, t - 4.6); }
    },
  });
}
// ----- END 31-3 Bird Attack Dash -----

// ----- BEGIN 31-4 Snail Race -----
// Two lanes. Pip mashes too fast: the snail panics and hides in its shell ("EEK!"); Bo taps steadily, slides past and
// crosses the finish line first.
{
  const pw31srSnail = (v, id, x, y, t, hid) => {
    const c = v.ctx;
    if (!hid) {
      c.fillStyle = '#d8d49a'; c.strokeStyle = '#8a8250'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(x - 18, y); c.quadraticCurveTo(x, y - 3 + Math.sin(t * 8) * 1.2, x + 13, y - 2); c.quadraticCurveTo(x + 22, y - 4, x + 22, y - 13); c.lineTo(x + 14, y - 7); c.lineTo(x - 17, y - 5); c.closePath(); c.fill(); c.stroke();
      v.line(x + 19, y - 13, x + 22, y - 24, '#8a8250', 1.6); v.line(x + 21, y - 13, x + 26, y - 23, '#8a8250', 1.6);
      v.fillCircle(x + 22, y - 25, 2.2, '#f2eec0'); v.fillCircle(x + 26, y - 24, 2.2, '#f2eec0');
    } else { c.fillStyle = '#c8c48a'; c.beginPath(); c.ellipse(x, y - 1, 13, 2.5, 0, 0, pw31TAU); c.fill(); }
    const sy = hid ? y - 12 : y - 15, wob = hid ? Math.sin(t * 9) * 0.1 : 0;
    c.save(); c.translate(x - 4, sy); c.rotate(wob);
    v.fillCircle(0, 0, 13, id ? v.c.bo : v.c.pip); c.strokeStyle = id ? v.c.boDark : v.c.pipDark; c.lineWidth = 2; v.circle(0, 0, 13); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1.6; c.beginPath(); for (let a = 0; a < 12; a += 0.25) { const r = 10 - a * 0.85; if (r < 0.5) break; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.stroke();
    c.restore();
    v.hero(id, x - 4, sy - 10, { s: 0.42, face: 1, rot: hid ? -0.5 : -0.1, mood: hid ? 'dizzy' : 'grit', shadow: false });
  };
  definePreview('Snail Race', {
    blurb: 'Mash to race your snail, but too fast and it hides in its shell!',
    loop: 5.6, still: 2.4,
    draw(v, t) {
      const c = v.ctx;
      c.fillStyle = '#2a3a28'; c.fillRect(0, 0, v.W, v.H);
      const lanes = [[6, 84], [96, 174]];
      for (const [k, [y0, y1]] of lanes.entries()) {
        const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#8ccff2'); g.addColorStop(1, '#dff3d8');
        c.fillStyle = g; v.rr(4, y0, v.W - 8, y1 - y0, 8); c.fill();
        for (let i = 0; i < 12; i++) pw31Blade(v, 10 + i * 28, y1 - 22, 30 + v.rand(i + k * 20) * 20, (v.rand(i + 5) - 0.5) * 10, 'rgba(96,170,80,0.6)');
        c.fillStyle = '#9a7650'; c.fillRect(4, y1 - 24, v.W - 8, 20);
        for (let j = 0; j < 6; j++) { c.fillStyle = j % 2 ? '#1c1a36' : '#fff'; c.fillRect(286, y1 - 24 + j * 3.3, 6, 3.3); }
        c.strokeStyle = k ? v.c.bo : v.c.pip; c.lineWidth = 2; v.rr(4, y0, v.W - 8, y1 - y0, 8); c.stroke();
      }
      // Pip: fast start, panics at 1.6 (EEK) until 3.0, then slow; Bo: steady
      const pipX = t < 1.6 ? v.lerp(30, 150, v.ease.out(t / 1.6)) : t < 3.0 ? 150 : v.lerp(150, 230, v.seg(t, 3.0, 5.6));
      const boX = v.lerp(30, 296, v.seg(t, 0, 4.4)), pipHid = t > 1.6 && t < 3.0;
      pw31srSnail(v, 0, pipX, 80, t, pipHid);
      pw31srSnail(v, 1, Math.min(boX, 296), 170, t, false);
      // speed meters
      for (const [k, sp] of [[0, pipHid ? 0 : t < 1.6 ? 0.55 + t * 0.3 : 0.4], [1, 0.42]]) {
        const y = lanes[k][0] + 6;
        c.fillStyle = 'rgba(28,26,54,0.8)'; v.rr(10, y, 70, 12, 6); c.fill();
        c.fillStyle = 'rgba(255,90,74,0.4)'; c.fillRect(48, y + 3, 28, 6);
        c.fillStyle = sp > 0.55 ? '#ff5a4a' : '#8fe3b0'; v.rr(14, y + 3, 62 * Math.min(1, sp), 6, 3); c.fill();
        c.fillStyle = '#fff'; c.fillRect(47, y + 1, 2, 10);
      }
      if (t > 1.2 && t < 1.6) v.label('Too fast!', pipX, 30, 11, '#ffb0a0');
      if (pipHid) v.label('EEK!', pipX, 34, 14, v.c.gold);
      if (t > 4.4) { v.label('Bo wins!', 250, 120, 14, v.c.gold); v.confetti(280, 140, t - 4.4); }
    },
  });
}
// ----- END 31-4 Snail Race -----
