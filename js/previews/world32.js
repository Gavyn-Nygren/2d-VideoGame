/* Pip & Bo - Level previews for World 32 Superhero City. Helpers are prefixed pw32. Each level's preview sits between
   its own BEGIN/END lines. */
'use strict';

// shared: a night (or dusk) city sky with a skyline, and a hero in a cape
const pw32TAU = Math.PI * 2;
const pw32Sky = (v, t, o = {}) => {
  const c = v.ctx, dusk = o.dusk;
  const g = c.createLinearGradient(0, 0, 0, v.H);
  if (dusk) { g.addColorStop(0, '#3a2a62'); g.addColorStop(0.6, '#b0507a'); g.addColorStop(1, '#f08a4a'); }
  else { g.addColorStop(0, '#0e1430'); g.addColorStop(1, '#2a3468'); }
  c.fillStyle = g; c.fillRect(0, 0, v.W, v.H);
  if (!dusk) {
    for (let i = 0; i < 26; i++) v.fillCircle(v.rand(i) * v.W, v.rand(i + 40) * 80, 0.8 + v.rand(i + 80) * 0.8, 'rgba(255,255,255,' + (0.4 + 0.4 * Math.sin(t * 2 + i)) + ')');
    v.fillCircle(o.moonX || 270, 34, 26, 'rgba(255,240,200,0.18)'); v.fillCircle(o.moonX || 270, 34, 15, '#fff2c8');
  }
  // two layers of towers with lit windows
  for (const [base, col, k0, sc] of [[o.base1 || 150, dusk ? '#4a2a5a' : '#1e2650', 0, 0.3], [o.base2 || 170, dusk ? '#2e1c40' : '#151c3e', 30, 0.6]]) {
    for (let i = 0; i < 12; i++) {
      const w = 22 + v.rand(i + k0) * 22, x = ((i * 34 + v.rand(i + k0 + 5) * 12 - (o.scroll || 0) * sc) % (v.W + 60) + v.W + 60) % (v.W + 60) - 40;
      const h = 50 + v.rand(i + k0 + 9) * 70;
      c.fillStyle = col; c.fillRect(x, base - h, w, h + 40);
      for (let wy = base - h + 6; wy < base; wy += 9) for (let wx = x + 4; wx < x + w - 4; wx += 7) if (v.rand(wx * 3 + wy) > 0.55) { c.fillStyle = v.rand(wx + wy * 7) > 0.5 ? 'rgba(255,224,138,0.75)' : 'rgba(170,210,255,0.55)'; c.fillRect(wx, wy, 3, 4); }
    }
  }
};
const pw32Cape = (v, id, x, y, s, face, t, fly) => {
  const c = v.ctx, col = id === 0 ? '#d8283a' : '#ffd23a', back = -face, f = v.clamp(fly || 0, 0, 1), sh = y - 18 * s;
  const tipX = x + back * (5 + f * 18) * s, tipY = sh + 18 * s - f * 10 * s, w = Math.sin(t * (8 + f * 10) + id) * (1.5 + f * 2) * s;
  c.fillStyle = col; c.beginPath(); c.moveTo(x - 7 * s, sh); c.lineTo(x + 7 * s, sh);
  c.quadraticCurveTo(tipX + back * 6 * s, (sh + tipY) / 2 + w, tipX + back * 8 * s, tipY + 3 * s); c.lineTo(tipX - back * 3 * s, tipY + 5 * s + w);
  c.quadraticCurveTo(x - back * 3 * s, sh + 10 * s, x - 7 * s, sh); c.closePath(); c.fill();
};
// a hero in costume: cape, body, and a star on the chest. o: as v.hero, plus fly (how hard the cape flies)
const pw32Hero = (v, id, x, y, o = {}) => {
  const s = o.s || 0.6, face = o.face == null ? (id === 0 ? 1 : -1) : o.face, c = v.ctx;
  if (o.alpha != null) { c.save(); c.globalAlpha *= o.alpha; }
  pw32Cape(v, id, x, y, s, face, v.t, o.fly);
  v.hero(id, x, y, Object.assign({ s, face }, o, { alpha: undefined }));
  v.star(x + face * 1.5 * s, y - 6 * s, 3.4 * s, id === 0 ? '#ffd23a' : '#d8283a');
  if (o.alpha != null) c.restore();
};
const pw32Comic = (v, x, y, str, s, col = '#ffe14a') => {
  const c = v.ctx;
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = col; c.strokeStyle = '#1c1a36'; c.lineWidth = 2;
  c.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * pw32TAU, r = i % 2 ? 12 : 19; c.lineTo(Math.cos(a) * r * 1.4, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke();
  c.restore();
  v.label(str, x, y + 1, 11 * s, '#ff4a5a');
};

// ----- BEGIN 32-1 Runaway Subway -----
// A runaway train races through the tunnel. Pip (the speedster) zips to a lever and pulls; a steel girder drops from the
// roof and Bo (the strong hero) catches it overhead; the lever clunks home, sparks fly from the wheels and it slows.
{
  definePreview('Runaway Subway', {
    blurb: 'Stop the runaway train! The speedster pulls the brakes, the strong hero catches falling girders.',
    loop: 6, still: 3.2,
    draw(v, t) {
      const c = v.ctx, e = v.ease, floor = 140, roof = 46;
      const slow = v.seg(t, 4.2, 5.6), speed = 1 - slow * 0.7;
      // the tunnel wall and its lamps streaming past
      c.fillStyle = '#20222e'; c.fillRect(0, 0, v.W, v.H);
      for (let k = 0; k < 6; k++) { const x = ((k * 70 - t * 420 * speed) % 420 + 420) % 420 - 50; v.fillCircle(x, 22, 10, 'rgba(255,214,120,0.25)'); v.fillCircle(x, 22, 3, '#ffd678'); }
      // the car: roof, windows, floor
      c.fillStyle = '#c8ccd8'; v.rr(6, roof - 8, v.W - 12, floor - roof + 26, 10); c.fill();
      c.fillStyle = '#9aa2b4'; c.fillRect(6, floor, v.W - 12, 8);
      c.fillStyle = '#4a5068'; for (let x = 26; x < v.W - 30; x += 58) { v.rr(x, roof + 6, 40, 26, 5); c.fill(); }
      c.fillStyle = 'rgba(255,214,120,0.25)'; for (let x = 26; x < v.W - 30; x += 58) c.fillRect(x + 3, roof + 9, 34, 4);
      c.fillStyle = '#2a2e3e'; c.fillRect(6, floor + 8, v.W - 12, 10);
      // wheels (sparks when braking)
      for (const x of [50, 110, 210, 270]) { v.fillCircle(x, floor + 22, 9, '#2a2a34'); v.fillCircle(x, floor + 22, 3, '#8a8a94'); }
      if (slow > 0 && slow < 1) for (let k = 0; k < 8; k++) { const u = (t * 5 + k * 0.13) % 1; v.fillCircle(270 - u * 40, floor + 28 - Math.sin(u * 3) * 8, 1.4, k % 2 ? '#ffe14a' : '#ff8a3a'); }
      // the lever (Pip pulls it 2.0-4.2)
      const pull = e.inOut(v.seg(t, 2.0, 4.2)), lx = 236;
      c.fillStyle = '#5a5e70'; c.fillRect(lx - 8, floor - 8, 16, 8);
      c.save(); c.translate(lx, floor - 6); c.rotate(-0.7 + pull * 1.3); v.line(0, 0, 0, -28, '#e8e8f0', 3.5); v.fillCircle(0, -28, 4.5, t > 1.6 && t < 4.2 ? '#ffe14a' : '#ff5a4a'); c.restore();
      // the girder: warning glow, drops 2.4-2.7, held up by Bo until 4.4, then set down
      const gx = 150, drop = v.seg(t, 2.4, 2.7), held = t >= 2.7 && t < 4.6;
      if (t > 1.8 && t < 2.4 && Math.sin(t * 30) > 0) { c.fillStyle = 'rgba(255,90,74,0.5)'; c.fillRect(gx - 34, roof - 4, 68, 4); }
      const gy = t < 2.4 ? roof : held ? v.lerp(roof, floor - 34, drop) : t >= 4.6 ? v.lerp(floor - 34, floor - 6, v.seg(t, 4.6, 4.9)) : roof;
      c.fillStyle = '#a0603a'; c.fillRect(gx - 34, gy, 68, 7); c.fillStyle = '#6a3a22'; for (let x = gx - 30; x < gx + 30; x += 10) c.fillRect(x, gy + 2, 6, 3);
      // Bo stands under the girder, arms up while holding it
      const boY = floor;
      pw32Hero(v, 1, gx, boY, { s: 0.65, face: 1, sq: held ? 0.25 : 0, mood: held ? 'grit' : t > 4.6 ? 'joy' : 'happy' });
      if (held) { v.line(gx - 6, boY - 14, gx - 8, gy + 7, v.c.boDark, 2.5); v.line(gx + 6, boY - 14, gx + 8, gy + 7, v.c.boDark, 2.5); }
      // Pip zooms from the left to the lever
      const px = v.lerp(30, lx - 18, e.out(v.seg(t, 0.4, 1.6)));
      if (t > 0.4 && t < 1.6) for (let k = 0; k < 4; k++) v.line(px - 12 - k * 4, floor - 6 - k * 4, px - 30 - k * 8, floor - 6 - k * 4, 'rgba(255,255,255,0.6)', 1.5);
      pw32Hero(v, 0, px, floor, { s: 0.65, face: 1, fly: t < 1.6 ? 1 : 0, mood: t > 2 && t < 4.2 ? 'grit' : t > 4.6 ? 'joy' : 'happy' });
      if (t > 2.6 && t < 3.3) v.label('Caught it!', gx, roof - 6, 11, v.c.gold);
      if (t > 4.1 && t < 4.8) pw32Comic(v, lx, floor - 52, 'CLUNK!', 1.1);
      if (t > 4.9) { v.label('Brakes on!', 160, 30, 13, v.c.gold); v.confetti(160, 40, t - 4.9); }
    },
  });
}
// ----- END 32-1 Runaway Subway -----

// ----- BEGIN 32-2 Bridge Collapse -----
// A storm over a broken bridge. Bo (the stretchy hero) stretches across the gap like a rubber bridge; Pip (the strong
// hero) carries a bus over Bo's back, Bo sags under the weight, then boings back to the other side and they cheer.
{
  definePreview('Bridge Collapse', {
    blurb: 'Save the bridge in a storm! The stretchy hero spans the gaps, the strong hero carries the bus across.',
    loop: 6, still: 2.6,
    draw(v, t) {
      const c = v.ctx, e = v.ease, deck = 128, a = 120, b = 200;
      pw32Sky(v, t, { dusk: true, base1: 120, base2: 128 });
      // rain and lightning
      if (v.phase(t, 6) > 0.62 && v.phase(t, 6) < 0.65) { c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(0, 0, v.W, v.H); }
      c.strokeStyle = 'rgba(220,230,255,0.35)'; c.lineWidth = 1;
      for (let i = 0; i < 30; i++) { const x = (v.rand(i) * v.W + t * 60) % v.W, y = (v.rand(i + 9) * v.H + t * 260) % v.H; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y + 9); c.stroke(); }
      // the river far below
      c.fillStyle = '#2a3a5e'; c.fillRect(0, 150, v.W, 30);
      // cables and the deck with a gap
      v.line(0, 60, a, deck - 4, 'rgba(60,40,70,0.9)', 2); v.line(b, deck - 4, v.W, 60, 'rgba(60,40,70,0.9)', 2);
      for (const [x0, x1] of [[0, a], [b, v.W]]) { c.fillStyle = '#5a5e70'; c.fillRect(x0, deck, x1 - x0, 10); c.fillStyle = '#ffc53d'; for (let x = x0; x < x1; x += 20) c.fillRect(x, deck + 3, 10, 2); c.fillStyle = '#3a3e4e'; c.fillRect(x0, deck + 10, x1 - x0, 12); }
      // Bo stretches across (0.6-1.2), holds while Pip crosses (1.6-3.8), boings back (4.0-4.4)
      const st = e.out(v.seg(t, 0.6, 1.2)), back = e.inOut(v.seg(t, 4.0, 4.4)), span = st * (1 - back);
      const busX = t < 1.6 ? 70 : t < 3.8 ? v.lerp(70, 250, e.inOut(v.seg(t, 1.6, 3.8))) : 250;
      const on = busX > a - 10 && busX < b + 10, sag = on ? Math.sin(v.clamp((busX - a) / (b - a), 0, 1) * Math.PI) * 9 : 2;
      if (span > 0.02) {
        const x1 = v.lerp(a, b, span);
        c.strokeStyle = v.c.boDark; c.lineWidth = 11; c.lineCap = 'round';
        c.beginPath(); c.moveTo(a - 4, deck + 2); c.quadraticCurveTo((a + x1) / 2, deck + 2 + sag * 2 * span, x1, deck + 2); c.stroke();
        c.strokeStyle = v.c.bo; c.lineWidth = 8; c.stroke();
        v.fillCircle(x1, deck + 2, 6, v.c.bo);
        v.hero(1, a - 6, deck + 8, { s: 0.55, face: 1, rot: -1.2, mood: on ? 'grit' : 'happy', shadow: false });
      } else {
        const bx = back > 0 ? v.lerp(a - 6, b + 20, back) : a - 14;
        pw32Hero(v, 1, bx, deck + (back > 0 && back < 1 ? v.hop(back, 30) : 0), { s: 0.6, face: 1, mood: t > 4.4 ? 'joy' : 'happy' });
      }
      // the bus over Pip's head
      const px = busX, py = deck + (on ? sag * 0.9 : 0);
      pw32Hero(v, 0, px, py, { s: 0.6, face: 1, sq: 0.15, mood: 'grit' });
      v.line(px - 5, py - 11, px - 8, py - 24, v.c.pipDark, 2.2); v.line(px + 5, py - 11, px + 8, py - 24, v.c.pipDark, 2.2);
      c.fillStyle = '#ffc53d'; v.rr(px - 30, py - 46, 60, 22, 5); c.fill();
      c.fillStyle = '#4a5a7a'; for (let x = px - 26; x < px + 22; x += 12) c.fillRect(x, py - 42, 9, 7);
      v.fillCircle(px - 18, py - 23, 4, '#2a2a34'); v.fillCircle(px + 18, py - 23, 4, '#2a2a34');
      if (t > 1.0 && t < 1.7) v.label('Stretch!', 160, deck - 30, 12, v.c.bo);
      if (t > 4.0 && t < 4.5) pw32Comic(v, 200, deck - 40, 'BOING!', 1);
      if (t > 4.6) { v.label('Across!', 230, 40, 13, v.c.gold); v.confetti(230, 50, t - 4.6); }
    },
  });
}
// ----- END 32-2 Bridge Collapse -----

// ----- BEGIN 32-3 Rooftop Chase -----
// Moonlit rooftops and a jewel thief running away. Pip shoots a web line to a hook over the gap, Bo holds on, and they
// swing across together ("Thwip!"), then Bo turns them both see-through to sneak under a guard drone's beam.
{
  definePreview('Rooftop Chase', {
    blurb: 'Chase the jewel thief over the rooftops! Web-swing across gaps and turn invisible past guard drones.',
    loop: 6.4, still: 2.2,
    draw(v, t) {
      const c = v.ctx, e = v.ease, r1 = 128, r2 = 120, ga = 110, gb = 190, hookX = 150, hookY = 26;
      pw32Sky(v, t, { moonX: 60 });
      // the two roofs
      for (const [x0, x1, top, col] of [[0, ga, r1, '#6a3a32'], [gb, v.W, r2, '#4e5266']]) {
        c.fillStyle = col; c.fillRect(x0, top, x1 - x0, v.H - top);
        c.fillStyle = '#3a3a46'; c.fillRect(x0, top - 3, x1 - x0, 5);
        for (let y = top + 10; y < v.H; y += 16) for (let x = x0 + 8; x < x1 - 8; x += 16) { c.fillStyle = v.rand(x + y) > 0.5 ? 'rgba(255,224,138,0.7)' : 'rgba(20,24,50,0.7)'; c.fillRect(x, y, 7, 9); }
      }
      // the hook
      v.line(hookX - 30, hookY - 8, hookX + 30, hookY - 8, '#ffc53d', 3); v.line(hookX, hookY - 8, hookX, hookY, '#6d7686', 2); v.fillCircle(hookX, hookY + 2, 3, '#a9b4c6');
      // the thief runs off to the right
      const tx = v.lerp(250, 340, v.seg(t, 0, 6.4));
      v.fillCircle(tx, r2 - 14, 7, '#f0f0f0'); c.fillStyle = '#1c1a36'; c.fillRect(tx - 7, r2 - 16, 14, 3); c.fillRect(tx - 6, r2 - 10, 12, 2);
      v.fillCircle(tx - 9, r2 - 15, 5, '#c8a040'); v.text('$', tx - 9, r2 - 14, 6, '#5a3a10');
      // the swing: web 0.6, swing 1.2-2.6, land; drone sneak 3.6-5.6
      const sw = v.seg(t, 1.2, 2.6), th = v.lerp(-0.85, 0.8, e.inOut(sw)), len = 98;
      let pX = 92, pY = r1, bX = 72, bY = r1, inv = 0;
      if (t >= 1.2 && t < 2.6) { pX = hookX + Math.sin(th) * len; pY = hookY + Math.cos(th) * len + 12; bX = pX - 4; bY = pY + 14; }
      else if (t >= 2.6) {
        const w = v.seg(t, 3.6, 5.6); pX = v.lerp(214, 290, w); bX = pX - 22; pY = bY = r2;
        inv = t > 3.4 && t < 5.8 ? 1 : 0;
      }
      if (t > 0.6 && t < 2.6) v.line(t < 1.2 ? 96 : pX, t < 1.2 ? r1 - 18 : pY - 18, hookX, hookY + 2, '#ffffff', 1.5);
      // the drone and its beam
      const dx = 250 + Math.sin(t * 1.5) * 20;
      c.fillStyle = 'rgba(255,240,170,0.18)'; c.beginPath(); c.moveTo(dx, 52); c.lineTo(dx - 24, r2); c.lineTo(dx + 24, r2); c.closePath(); c.fill();
      c.fillStyle = '#2a2e3e'; v.rr(dx - 12, 44, 24, 9, 3); c.fill(); v.fillCircle(dx, 50, 2.5, inv ? '#8fe3b0' : '#ff4a3a');
      v.line(dx - 16, 42, dx - 6, 42, '#a9b4c6', 1.5); v.line(dx + 6, 42, dx + 16, 42, '#a9b4c6', 1.5);
      pw32Hero(v, 1, bX, bY, { s: 0.6, face: 1, alpha: inv ? 0.35 : 1, mood: inv ? 'blink' : 'happy' });
      pw32Hero(v, 0, pX, pY, { s: 0.6, face: 1, fly: t > 1.2 && t < 2.6 ? 1 : 0, alpha: inv ? 0.35 : 1, mood: t > 1.2 && t < 2.6 ? 'joy' : 'happy' });
      if (inv) v.line(bX + 6, bY - 9, pX - 6, pY - 9, 'rgba(191,246,255,0.6)', 2);
      if (t > 0.6 && t < 1.2) v.label('Thwip!', 120, r1 - 40, 12, '#fff');
      if (t > 2.6 && t < 3.3) v.label('Made it!', 214, r2 - 40, 12, v.c.gold);
      if (inv) v.label('Shh...', pX - 10, r2 - 40, 11, '#bff6ff');
    },
  });
}
// ----- END 32-3 Rooftop Chase -----

// ----- BEGIN 32-4 Power Punch Showdown -----
// A rooftop brawl at night. A power-up floats down on a parachute; Bo grabs it and gets giant fists, Pip lands a quick
// "POW!", then Bo's giant punch sends Pip flying ("KA-POW!") and Bo cheers. The neon sign blinks behind them.
{
  definePreview('Power Punch Showdown', {
    blurb: 'Rooftop brawl! Punch, block and grab power-ups. Knock your rival off the roof to win the round.',
    loop: 6, still: 3.4,
    draw(v, t) {
      const c = v.ctx, e = v.ease, roof = 140;
      pw32Sky(v, t, { moonX: 280, base1: 140, base2: 150 });
      // the roof
      c.fillStyle = '#5b4a7a'; c.fillRect(30, roof, 260, v.H - roof);
      for (let y = roof + 12; y < v.H; y += 16) for (let x = 40; x < 280; x += 18) { c.fillStyle = v.rand(x * 2 + y) > 0.5 ? 'rgba(255,224,138,0.7)' : 'rgba(20,24,50,0.7)'; c.fillRect(x, y, 8, 9); }
      c.fillStyle = '#3a3a46'; c.fillRect(26, roof - 3, 268, 6);
      for (const x of [26, 286]) { c.fillStyle = Math.sin(t * 5 + x) > 0 ? '#ff4a3a' : '#6a2a2a'; v.circle(x + 4, roof - 10, 3); c.fill(); }
      // the neon sign
      const on = Math.sin(t * 3) > -0.7;
      c.fillStyle = 'rgba(28,26,54,0.9)'; v.rr(126, 48, 68, 34, 6); c.fill(); c.strokeStyle = on ? '#ff4ad8' : '#6a2a5a'; c.lineWidth = 2; v.rr(126, 48, 68, 34, 6); c.stroke();
      v.text('HERO', 160, 60, 11, on ? '#ffd0f4' : '#7a4a6a'); v.text('CITY', 160, 73, 10, on ? '#8fdcff' : '#3a5a6a');
      v.line(140, 82, 140, roof, '#3c4250', 3); v.line(180, 82, 180, roof, '#3c4250', 3);
      // the power-up drops (0.3-1.5) and Bo takes it (1.8)
      const oy = v.lerp(-10, roof - 10, v.seg(t, 0.3, 1.5)), ox = 200;
      if (t < 1.8) {
        if (t < 1.5) { c.fillStyle = '#fff'; c.beginPath(); c.arc(ox, oy - 16, 10, Math.PI, 0); c.fill(); v.line(ox - 10, oy - 16, ox - 3, oy - 5, '#fff', 1); v.line(ox + 10, oy - 16, ox + 3, oy - 5, '#fff', 1); }
        v.fillCircle(ox, oy, 11, 'rgba(255,106,90,0.35)'); v.fillCircle(ox, oy, 6, '#1c1a36'); c.strokeStyle = '#ff6a5a'; c.lineWidth = 2; v.circle(ox, oy, 6); c.stroke();
      }
      if (t > 1.8 && t < 2.4) v.label('GIANT FISTS!', 214, roof - 50, 11, '#ff6a5a');
      // Pip: punches at 2.6 ("POW!"), gets KA-POWed at 3.6 and flies off left, comes back for the next loop
      const hit = v.seg(t, 3.6, 4.6);
      let pipX = v.lerp(90, 150, e.out(v.seg(t, 0.2, 2.4))), pipY = roof, rot = 0;
      if (t > 3.6) { pipX = v.lerp(150, 10, e.out(hit)); pipY = roof + v.hop(hit, 60); rot = -hit * 4; }
      if (t > 5.2) { pipX = v.lerp(-10, 90, v.seg(t, 5.2, 6)); pipY = roof; rot = 0; }
      const boX = t < 1.8 ? v.lerp(250, ox, v.seg(t, 1.0, 1.8)) : v.lerp(ox, 176, v.seg(t, 2.0, 2.4));
      const boHurt = t > 2.6 && t < 3.0;
      pw32Hero(v, 1, boX + (boHurt ? 6 : 0), roof, { s: 0.7, face: -1, mood: boHurt ? 'dizzy' : t > 4.2 ? 'joy' : 'grit', rot: boHurt ? 0.25 : 0 });
      pw32Hero(v, 0, pipX, pipY, { s: 0.7, face: 1, rot, mood: t > 3.6 && t < 5.2 ? 'dizzy' : 'grit' });
      // fists
      const pPunch = t > 2.5 && t < 2.8, bPunch = t > 3.4 && t < 3.8, giant = t > 1.8 && t < 5.2;
      if (t < 3.6 || t > 5.2) v.fillCircle(pipX + (pPunch ? 22 : 9), roof - 10, 4, v.c.pip);
      v.fillCircle(boX - (bPunch ? 30 : 10), roof - 11, giant ? 8 : 4, v.c.bo);
      if (giant) { c.strokeStyle = v.c.boDark; c.lineWidth = 1.5; v.circle(boX - (bPunch ? 30 : 10), roof - 11, 8); c.stroke(); }
      if (t > 2.6 && t < 3.1) pw32Comic(v, 176, roof - 34, 'POW!', 0.9);
      if (t > 3.6 && t < 4.3) pw32Comic(v, 140, roof - 40, 'KA-POW!', 1.2, '#ffd23a');
      if (t > 4.4 && t < 5.2) { v.label('Bo wins the round!', 160, 30, 12, v.c.bo); v.confetti(boX, roof - 40, t - 4.4); }
    },
  });
}
// ----- END 32-4 Power Punch Showdown -----
