/* Pip & Bo - Level previews for World 36 Movie Studio. Helpers are prefixed pw36. Each level's preview sits between
   its own BEGIN/END lines. */
'use strict';

// shared: the backlot sky, a clapperboard, Director Bellow, and each level's outfit (small: helmet, cap, suit, cape)
const pw36TAU = Math.PI * 2;
const pw36Sky = (v, o = {}) => {
  const c = v.ctx, g = c.createLinearGradient(0, 0, 0, v.H);
  if (o.night) { g.addColorStop(0, '#141838'); g.addColorStop(1, '#3a3a6a'); }
  else if (o.dusk) { g.addColorStop(0, '#ff9a6a'); g.addColorStop(1, '#ffd8a8'); }
  else { g.addColorStop(0, '#7ab8ff'); g.addColorStop(1, '#d8eeff'); }
  c.fillStyle = g; c.fillRect(0, 0, v.W, v.H);
  if (o.night) { for (let k = 0; k < 24; k++) { c.fillStyle = 'rgba(255,255,240,' + (0.3 + 0.4 * Math.abs(Math.sin(v.t + k))) + ')'; c.fillRect(v.rand(k) * v.W, v.rand(k + 30) * 70, 1.2, 1.2); } }
  else if (!o.plain) { // a soft cloud or two
    for (let k = 0; k < 2; k++) { const cx = ((k * 180 + 60 - v.t * 3) % 400 + 400) % 400 - 40, cy = 18 + k * 14;
      c.fillStyle = o.dusk ? 'rgba(255,236,210,0.7)' : 'rgba(255,255,255,0.8)'; v.circle(cx, cy, 7); c.fill(); v.circle(cx + 9, cy - 3, 9); c.fill(); v.circle(cx + 19, cy, 7); c.fill(); c.fillRect(cx, cy, 19, 5); }
  }
};
// the soundstages far behind (big numbered sheds with a lit side, ribs, a door and a roof lamp)
const pw36Stages = (v, base, scroll) => {
  const c = v.ctx;
  for (let k = -1; k < 6; k++) {
    const x = k * 70 - (scroll * 0.2) % 70;
    c.fillStyle = '#c8c0b0'; c.fillRect(x, base - 46, 62, 46);
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(x, base - 46, 3, 46);
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x + 56, base - 46, 6, 46);
    c.fillStyle = 'rgba(120,100,80,0.18)'; for (let r = 10; r < 62; r += 10) c.fillRect(x + r, base - 46, 1, 46);
    c.fillStyle = '#8a7a6a'; c.fillRect(x + 8, base - 16, 14, 16); c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x + 8, base - 16, 14, 2);
    c.fillStyle = '#a89a8a'; c.beginPath(); c.moveTo(x - 2, base - 46); c.quadraticCurveTo(x + 31, base - 62, x + 64, base - 46); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.moveTo(x - 2, base - 46); c.quadraticCurveTo(x + 31, base - 62, x + 64, base - 46); c.quadraticCurveTo(x + 31, base - 58, x - 2, base - 46); c.fill();
    c.fillStyle = '#f6efdf'; v.circle(x + 31, base - 30, 7); c.fill(); c.strokeStyle = '#8a7a6a'; c.lineWidth = 1; c.stroke();
    v.text(String(3 + ((k + Math.floor(scroll * 0.2 / 70)) % 9 + 9) % 9), x + 31, base - 29.5, 9, '#7a6a5a', 'center');
    c.fillStyle = '#ffe9a8'; c.fillRect(x + 28, base - 18, 6, 2);
  }
};
const pw36Clapper = (v, x, y, s, open) => {
  const c = v.ctx;
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#2a2a34'; c.fillRect(-14, -6, 28, 18);
  c.fillStyle = '#ffffff'; c.fillRect(-12, -2, 24, 2); c.fillRect(-12, 4, 24, 2);
  c.save(); c.translate(-14, -6); c.rotate(-open * 0.5);
  c.fillStyle = '#2a2a34'; c.fillRect(0, -6, 28, 6);
  c.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(3 + k * 7, -6); c.lineTo(7 + k * 7, -6); c.lineTo(4 + k * 7, 0); c.lineTo(0 + k * 7, 0); c.fill(); }
  c.restore(); c.restore();
};
const pw36Bellow = (v, x, y, s, shout) => {
  const c = v.ctx;
  c.fillStyle = '#e8c0a0'; v.circle(x, y - 10 * s, 8 * s); c.fill();
  c.fillStyle = '#3a3a5a'; c.beginPath(); c.ellipse(x, y - 4 * s, 9 * s, 7 * s, 0, 0, pw36TAU); c.fill();
  c.fillStyle = '#c8323a'; c.beginPath(); c.ellipse(x - 1 * s, y - 17 * s, 9 * s, 3 * s, -0.2, 0, pw36TAU); c.fill();
  c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(x + 6 * s, y - 11 * s); c.lineTo(x + 18 * s, y - 17 * s); c.lineTo(x + 18 * s, y - 3 * s); c.closePath(); c.fill();
  if (shout) v.label(shout, x - 22 * s, y - 24 * s, 9, '#ffffff');
};
// Pip or Bo in the level's outfit: 'stunt' (helmet + goggles), 'crew' (peaked cap), 'agent' (sunglasses + tie), 'show' (cape + visor)
const pw36Hero = (v, id, x, y, look, o = {}) => {
  const c = v.ctx, s = o.s || 0.6, face = o.face || 1, rot = o.rot || 0;
  if (look === 'show') {
    c.save(); c.translate(x, y - 13 * s); c.rotate(rot);
    c.fillStyle = id === 0 ? '#7a1a8a' : '#1a7a6a';
    c.beginPath(); c.moveTo(-6 * s, -10 * s); c.lineTo(6 * s, -10 * s); c.lineTo(-face * 20 * s, 10 * s + Math.sin(v.t * 9) * 2); c.closePath(); c.fill();
    c.restore();
  }
  v.hero(id, x, y, o);
  c.save(); c.translate(x, y - 13 * s); c.rotate(rot);
  const top = -15 * s;
  if (look === 'stunt' || look === 'show') {
    c.fillStyle = id === 0 ? '#d8dce4' : '#ffd23a'; c.beginPath(); c.arc(0, top + 6 * s, 12 * s, Math.PI, pw36TAU); c.fill();
    c.fillStyle = id === 0 ? '#e8322a' : '#2a6ae8'; c.fillRect(-1.5 * s, top - 6 * s, 3 * s, 12 * s);
    if (look === 'stunt') { c.fillStyle = id === 0 ? '#ffd68c' : '#9fd8ff'; v.circle(-4 * s + face * 2 * s, top + 2 * s, 2.5 * s); c.fill(); v.circle(4 * s + face * 2 * s, top + 2 * s, 2.5 * s); c.fill(); }
    else { c.fillStyle = id === 0 ? 'rgba(255,200,120,0.35)' : 'rgba(150,230,255,0.35)'; c.fillRect(-9 * s, top + 4 * s, 18 * s, 5 * s); }
  } else if (look === 'crew') {
    c.fillStyle = id === 0 ? '#5a1a1a' : '#1a2a5a'; c.beginPath(); c.arc(0, top + 6 * s, 11 * s, Math.PI, pw36TAU); c.fill();
    c.fillRect(face > 0 ? 0 : -16 * s, top + 4 * s, 16 * s, 3 * s);
    c.fillStyle = '#ffd23a'; c.fillRect(-2 * s, top - 2 * s, 4 * s, 3 * s);
  }
  // Pip's sprout and Bo's ears poke out through the helmet or cap
  if (look !== 'agent') {
    if (id === 0) { c.strokeStyle = '#3f8f5c'; c.lineWidth = 1.6 * s; c.beginPath(); c.moveTo(0, top - 5 * s); c.lineTo(1 * s, top - 10 * s); c.stroke(); c.fillStyle = '#5cc27f'; c.beginPath(); c.ellipse(4 * s, top - 12 * s, 5 * s, 2.5 * s, -0.5, 0, pw36TAU); c.fill(); }
    else if (look !== 'crew') { c.fillStyle = '#5b95ff'; c.strokeStyle = '#2f5fc4'; c.lineWidth = 1.2 * s; v.circle(-10 * s, top - 1 * s, 4 * s); c.fill(); c.stroke(); v.circle(10 * s, top - 1 * s, 4 * s); c.fill(); c.stroke(); }
  }
  if (look === 'agent') {
    c.fillStyle = '#0a0a10'; c.fillRect(-9 * s + face * s, top + 8 * s, 18 * s, 4 * s);
    c.fillStyle = id === 0 ? '#e8322a' : '#2a6ae8'; c.fillRect(-1.5 * s, top + 22 * s, 3 * s, 6 * s);
  }
  c.restore();
};
const pw36Prop = (v, x, y) => { const c = v.ctx; c.fillStyle = '#ffd23a'; c.fillRect(x - 9, y - 4, 18, 8); v.text('PROP', x, y + 0.5, 5, '#2a2a34', 'center'); };
const pw36Real = (v, x, y, w) => { const c = v.ctx; for (let k = 0; k < w; k += 6) { c.fillStyle = (k / 6) % 2 ? '#ffffff' : '#e8322a'; c.fillRect(x + k, y, 6, 4); } };

// ----- BEGIN 36-1 Car Chase, Take One -----
// The car speeds through a painted city. A paper flat of a DESERT scene swings up ahead: Bo claps (the clapper snaps)
// and the backdrop rolls to desert, the flat turns to paper and the car bursts through it in a shower of scraps.
{
  definePreview('Car Chase, Take One', {
    blurb: 'Film a car chase! One drives and hops, the other dials the scene and claps so the paper flats match it.',
    loop: 6, still: 3.3,
    draw(v, t) {
      const c = v.ctx, scroll = t * 120, desert = t > 2.2 && t < 5.4, roll = v.seg(t, 2.0, 2.4);
      pw36Sky(v, { dusk: desert });
      // the painted backdrop: city, then desert (it rolls down like a blind)
      c.fillStyle = '#6a7a9a'; for (let k = -1; k < 8; k++) { const x = k * 48 - (scroll * 0.4) % 48; c.fillRect(x, 60 - v.rand(k + Math.floor(scroll * 0.4 / 48)) * 30, 40, 70); }
      if (roll > 0 && t < 5.4) { c.fillStyle = '#e8b878'; c.fillRect(0, 0, v.W, 130 * (desert ? 1 : roll)); c.fillStyle = 'rgba(255,240,200,0.5)'; v.circle(250, 34, 14); c.fill(); c.fillStyle = '#fff4d0'; v.circle(250, 34, 8); c.fill();
        c.fillStyle = '#d8a060'; for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(k * 80 - 50, 130); c.lineTo(k * 80 - 10, 104); c.lineTo(k * 80 + 30, 130); c.fill(); }
        c.fillStyle = '#c88a4a'; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(k * 90 - 20, 130); c.lineTo(k * 90 + 30, 90); c.lineTo(k * 90 + 80, 130); c.fill(); }
        c.fillStyle = '#a86a36'; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(k * 90 + 30, 90); c.lineTo(k * 90 + 80, 130); c.lineTo(k * 90 + 40, 130); c.fill(); } }
      // the road
      c.fillStyle = '#3a3a44'; c.fillRect(0, 130, v.W, 50);
      c.fillStyle = '#8a8a96'; c.fillRect(0, 130, v.W, 3); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 133, v.W, 2); c.fillRect(0, 172, v.W, 8);
      c.fillStyle = 'rgba(255,255,255,0.06)'; for (let k = 0; k < 14; k++) c.fillRect(((k * 41 - scroll) % 340 + 340) % 340 - 10, 140 + v.rand(k + 5) * 28, 6, 1);
      c.fillStyle = '#ffd23a'; for (let k = 0; k < 8; k++) c.fillRect(k * 50 - (scroll % 50), 154, 24, 3);
      // the flat: a desert scene on paper, swings up 1.2, burst at 3.2
      const fx = 260 - v.seg(t, 1.2, 3.2) * 150, up = v.ease.out(v.seg(t, 1.2, 1.6)), burst = t > 3.2;
      if (!burst && t > 1.2) {
        c.save(); c.translate(fx, 150); c.rotate((1 - up) * -1.4);
        c.fillStyle = '#e8b878'; c.fillRect(-2, -54, 30, 54); c.fillStyle = '#c88a4a'; c.beginPath(); c.moveTo(-2, 0); c.lineTo(13, -24); c.lineTo(28, 0); c.fill();
        pw36Prop(v, 13, -46);
        c.restore();
      }
      if (burst && t < 4.4) for (let k = 0; k < 10; k++) { const u = v.seg(t, 3.2, 4.4); c.fillStyle = k % 2 ? '#f6eedc' : '#e8b878'; c.fillRect(110 + k * 7 - u * 30, 120 - v.rand(k) * 40 + u * 50, 5, 4); }
      // the car (stunt car, red stripe) with Pip driving
      const cy = 150 + Math.sin(t * 20) * 0.6;
      c.fillStyle = '#2a6ae8'; v.rr(70, cy - 16, 56, 16, 5); c.fill(); c.fillStyle = '#ffffff'; c.fillRect(70, cy - 10, 56, 3);
      c.fillStyle = '#9fd8ff'; c.fillRect(92, cy - 26, 20, 10);
      c.fillStyle = '#2a2a34'; v.circle(82, cy, 7); c.fill(); v.circle(116, cy, 7); c.fill();
      pw36Hero(v, 0, 98, cy - 12, 'stunt', { s: 0.42, face: 1, mood: burst && t < 4 ? 'joy' : 'grit' });
      // Bo on the camera truck behind, with the clapper
      c.fillStyle = '#5a5a6a'; c.fillRect(6, cy - 8, 44, 10);
      pw36Hero(v, 1, 30, cy - 8, 'stunt', { s: 0.42, face: 1, mood: t > 2 && t < 2.6 ? 'wow' : 'happy' });
      pw36Clapper(v, 44, cy - 30, 0.6, t > 1.7 && t < 2.0 ? 1 : 0);
      if (t > 1.6 && t < 2.6) v.label('CLAP! Desert!', 40, cy - 46, 9, '#ffe7a8');
      pw36Bellow(v, 290, 128, 0.7, t > 0.4 && t < 1.4 ? 'ACTION!' : null);
    },
  });
}
// ----- END 36-1 Car Chase, Take One -----

// ----- BEGIN 36-2 Backlot Tram Runaway -----
// The tour tram rolls through a western set. Bo hauls the brake on the front car (sparks), while Pip, ahead on foot,
// pushes a foam cactus off the rails just in time and jumps back aboard as the front car arrives.
{
  definePreview('Backlot Tram Runaway', {
    blurb: 'The studio tram has no brakes! One brakes in short pulls; the other runs ahead and clears the props off the line.',
    loop: 6, still: 2.6,
    draw(v, t) {
      const c = v.ctx, scroll = t * 40;
      pw36Sky(v);
      pw36Stages(v, 110, scroll);
      // saloon fronts
      for (let k = -1; k < 5; k++) { const x = k * 90 - (scroll * 0.6) % 90; c.fillStyle = ['#c8844a', '#a8643a'][((k % 2) + 2) % 2]; c.fillRect(x, 66, 76, 66); c.fillStyle = '#5a3418'; c.fillRect(x + 28, 104, 20, 28); }
      // rails
      c.fillStyle = '#7a6a5a'; c.fillRect(0, 150, v.W, 30);
      c.fillStyle = '#5a4a3a'; for (let k = 0; k < 14; k++) c.fillRect(k * 26 - (scroll % 26), 148, 14, 5);
      c.fillStyle = '#c8ccd6'; c.fillRect(0, 146, v.W, 3);
      // the tram: front at x tx
      const tx = 150 + v.seg(t, 0, 4.4) * 60, brake = t > 0.6 && t < 2.6;
      for (let k = 0; k < 3; k++) {
        const x0 = tx - 52 - k * 56;
        c.fillStyle = '#e8d8b8'; c.fillRect(x0, 124, 50, 20);
        c.fillStyle = k % 2 ? '#e8322a' : '#ffffff'; for (let q = 0; q < 5; q++) { c.fillStyle = q % 2 ? '#e8322a' : '#ffffff'; c.fillRect(x0 + q * 10, 106, 10, 6); }
        c.fillStyle = '#5a5a6a'; c.fillRect(x0 + 2, 112, 3, 12); c.fillRect(x0 + 45, 112, 3, 12);
        c.fillStyle = '#2a2a34'; v.circle(x0 + 10, 146, 4); c.fill(); v.circle(x0 + 40, 146, 4); c.fill();
      }
      if (brake) for (let k = 0; k < 4; k++) v.sparkle(tx - 40 + v.rand(k + Math.floor(t * 10)) * 20, 146, k);
      pw36Hero(v, 1, tx - 20, 124, 'crew', { s: 0.42, face: 1, mood: brake ? 'grit' : 'happy' });
      if (brake) v.label('BRAKE!', tx - 20, 92, 9, '#ffe7a8');
      // the cactus on the line, pushed off 1.6-2.4
      const push = v.seg(t, 1.6, 2.4), cxp = 262, off = v.ease.in(push) * 40;
      if (t < 3.4) {
        c.save(); c.translate(cxp + off * 0.3, 146 + off); c.rotate(push * 1.2);
        c.fillStyle = '#5fb84a'; v.rr(-6, -36, 12, 36, 5); c.fill(); v.rr(-16, -26, 8, 14, 4); c.fill(); v.rr(8, -22, 8, 12, 4); c.fill();
        pw36Prop(v, 0, -42);
        c.restore();
      }
      // Pip: pushing 1.0-2.4, then jumps aboard at 3.6
      const board = v.seg(t, 3.4, 3.9);
      const px = t < 2.4 ? 244 : t < 3.4 ? 244 : v.lerp(244, tx - 34, board), py = t < 3.4 ? 146 : 146 - 22 * board + v.hop(board, 18);
      pw36Hero(v, 0, t > 3.9 ? tx - 34 : px, t > 3.9 ? 124 : py, 'crew', { s: 0.42, face: 1, mood: push > 0 && push < 1 ? 'grit' : 'joy' });
      if (push > 0 && push < 1) v.label('PUSH!', 244, 100, 9, '#d9ffd0');
    },
  });
}
// ----- END 36-2 Backlot Tram Runaway -----

// ----- BEGIN 36-3 Stunt Double Fall -----
// Pip and Bo, in agent suits and sunglasses, fall hand in hand past a building face, smash a sheet of sugar glass in a
// burst of shards, a camera drone alongside, and a steel beam with a gap coming up below.
{
  definePreview('Stunt Double Fall', {
    blurb: 'Fall off a skyscraper! Hold hands to smash the sugar glass, let go to slip through the gaps in the real steel.',
    loop: 5, still: 2.1,
    draw(v, t) {
      const c = v.ctx, scroll = t * 70;
      pw36Sky(v);
      // the building face scrolls up
      c.fillStyle = '#8a7a9a'; c.fillRect(40, 0, 240, v.H);
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(40, 0, 4, v.H); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(272, 0, 8, v.H);
      c.fillStyle = 'rgba(60,40,80,0.18)'; for (let y = -(scroll % 10); y < v.H; y += 10) c.fillRect(40, y, 240, 1);
      for (let r = -1; r < 5; r++) for (let k = 0; k < 4; k++) { const y = r * 50 - (scroll % 50), wx = 56 + k * 58;
        const wg = c.createLinearGradient(wx, y + 10, wx + 34, y + 44); wg.addColorStop(0, '#4a5e86'); wg.addColorStop(1, '#2e3a58');
        c.fillStyle = wg; c.fillRect(wx, y + 10, 34, 34);
        c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.moveTo(wx + 4, y + 40); c.lineTo(wx + 16, y + 14); c.lineTo(wx + 22, y + 14); c.lineTo(wx + 10, y + 40); c.fill();
        c.strokeStyle = '#ece4f4'; c.lineWidth = 2; c.strokeRect(wx, y + 10, 34, 34);
        c.fillStyle = '#b8aac8'; c.fillRect(wx - 3, y + 45, 40, 3); c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(wx - 3, y + 48, 40, 2); }
      c.fillStyle = '#5a3a1a'; c.fillRect(36, 0, 4, v.H); c.fillRect(280, 0, 4, v.H);
      // the glass at y 100 - scroll, smashed at 1.8
      const gy = 160 - v.seg(t, 0, 1.8) * 60, smash = t > 1.8;
      if (!smash) { c.fillStyle = 'rgba(200,232,255,0.7)'; c.fillRect(40, gy - 3, 240, 6); c.fillStyle = '#f6eedc'; c.fillRect(40, gy + 3, 240, 2); pw36Prop(v, 110, gy - 10); pw36Prop(v, 220, gy - 10); }
      else if (t < 3.2) for (let k = 0; k < 18; k++) { const u = v.seg(t, 1.8, 3.2); c.fillStyle = k % 3 ? 'rgba(210,240,255,0.9)' : '#ffffff'; c.fillRect(60 + k * 12 + (v.rand(k) - 0.5) * 40 * u, 96 - u * 60 + v.rand(k + 9) * 20, 4, 3); }
      // the beam with a gap below
      const by = 200 - v.seg(t, 2.6, 5) * 70;
      if (t > 2.6) { c.fillStyle = '#7a828e'; c.fillRect(40, by, 110, 10); c.fillRect(176, by, 104, 10); pw36Real(v, 60, by + 10, 40); pw36Real(v, 220, by + 10, 40); }
      // the heroes, hand in hand
      const hx = 160, hy = 92 + Math.sin(t * 3) * 3;
      v.line(hx - 14, hy - 8, hx + 14, hy - 8, '#ffd23a', 3);
      pw36Hero(v, 0, hx - 18, hy, 'agent', { s: 0.5, face: 1, mood: smash && t < 2.6 ? 'joy' : 'wow' });
      pw36Hero(v, 1, hx + 18, hy, 'agent', { s: 0.5, face: -1, mood: smash && t < 2.6 ? 'joy' : 'wow' });
      if (smash && t < 2.8) v.label('SMASH!', hx, hy - 34, 12, '#e8f6ff');
      // the drone's frame
      const dx = 160 + Math.sin(t * 1.3) * 20;
      c.strokeStyle = 'rgba(255,90,90,0.9)'; c.lineWidth = 2;
      for (const [x, y, sx, sy] of [[dx - 60, 50, 1, 1], [dx + 60, 50, -1, 1], [dx - 60, 130, 1, -1], [dx + 60, 130, -1, -1]]) { c.beginPath(); c.moveTo(x + sx * 10, y); c.lineTo(x, y); c.lineTo(x, y + sy * 10); c.stroke(); }
      c.fillStyle = '#2a2a34'; c.fillRect(dx - 8, 38, 16, 6); v.fillCircle(dx + 5, 41, 1.5, Math.sin(t * 8) > 0 ? '#ff3a3a' : '#5a1a1a');
    },
  });
}
// ----- END 36-3 Stunt Double Fall -----

// ----- BEGIN 36-4 Stunt Show Showdown -----
// Both halves of the arena: Pip on a motorbike over a row of prop buses, Bo diving off the tower into the tank, three
// judges holding up their paddles.
{
  definePreview('Stunt Show Showdown', {
    blurb: 'Five stunts, three judges! Ramp jump, high dive, wall smash, fire hoops and a grand finale. Best of five.',
    loop: 6, still: 2.4,
    draw(v, t) {
      const c = v.ctx;
      c.fillStyle = '#241a44'; c.fillRect(0, 0, v.W, v.H);
      // sweeping spotlights over the stands
      for (let k = 0; k < 2; k++) { const a = Math.sin(t * 0.9 + k * 2.2) * 0.5, x0 = 60 + k * 200;
        c.fillStyle = 'rgba(255,240,200,0.07)'; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + Math.sin(a) * 200 - 30, v.H); c.lineTo(x0 + Math.sin(a) * 200 + 30, v.H); c.closePath(); c.fill(); }
      // the crowd
      for (let r = 0; r < 3; r++) for (let k = 0; k < 24; k++) { const x = k * 14 + (r % 2) * 7, y = 50 + r * 12 + Math.sin(t * 6 + k + r) * 1.5; c.fillStyle = ['#e86a6a', '#6ab0e8', '#e8d26a', '#8ae86a', '#c88ae8'][(k * 7 + r * 3) % 5]; v.circle(x, y, 4); c.fill(); }
      { const fg = c.createLinearGradient(0, 160, 0, v.H); fg.addColorStop(0, '#6a5a48'); fg.addColorStop(1, '#4a3a2e'); c.fillStyle = fg; c.fillRect(0, 160, v.W, 20);
        c.fillStyle = 'rgba(255,240,210,0.3)'; c.fillRect(0, 160, v.W, 1.5);
        c.strokeStyle = 'rgba(30,20,10,0.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(20, 172); c.quadraticCurveTo(120, 164, 220, 174); c.moveTo(60, 177); c.quadraticCurveTo(160, 168, 300, 176); c.stroke(); }
      // the tyre wall
      for (let y = 90; y < 160; y += 10) { c.fillStyle = '#1a1a20'; c.beginPath(); c.ellipse(160, y, 6, 5, 0, 0, pw36TAU); c.fill(); }
      // the judges, paddles up at 3.0+
      c.fillStyle = '#6a3a1a'; c.fillRect(124, 24, 72, 12);
      for (let k = 0; k < 3; k++) {
        const jx = 136 + k * 24; v.fillCircle(jx, 18, 6, ['#c8a07a', '#e8c0a0', '#a07a5a'][k]);
        const up = t > 3 + k * 0.25;
        if (up) { c.fillStyle = '#ffffff'; c.fillRect(jx - 7, 0, 14, 11); v.text(String([9, 8, 10][k]), jx, 6, 8, '#2a2a34', 'center'); }
      }
      // Pip's half: the bike jump over the buses
      for (let b = 0; b < 3; b++) { c.fillStyle = '#e8b83a'; c.fillRect(46 + b * 26, 146, 22, 14); pw36Prop(v, 57 + b * 26, 140); }
      c.fillStyle = '#8a7a6a'; c.beginPath(); c.moveTo(14, 160); c.lineTo(34, 146); c.lineTo(36, 160); c.fill();
      const u = v.seg(t, 0.4, 2.8), bx = v.lerp(34, 140, u), byy = 146 - Math.sin(u * Math.PI) * 70, br = u * pw36TAU;
      c.save(); c.translate(bx, byy); c.rotate(br);
      c.strokeStyle = '#2a2a34'; c.lineWidth = 2.5; c.beginPath(); c.arc(-8, 0, 5, 0, pw36TAU); c.stroke(); c.beginPath(); c.arc(8, 0, 5, 0, pw36TAU); c.stroke();
      c.fillStyle = '#e8322a'; c.beginPath(); c.moveTo(-8, -1); c.lineTo(0, -8); c.lineTo(8, -1); c.fill();
      c.restore();
      pw36Hero(v, 0, bx, byy - 6, 'show', { s: 0.38, face: 1, rot: br, mood: 'joy' });
      if (u > 0.3 && u < 0.8) v.label('FLIP!', bx, byy - 28, 9, '#ffe7a8');
      // Bo's half: the tower and the tank
      c.fillStyle = '#7a6a5a'; c.fillRect(180, 60, 5, 100);
      c.fillStyle = '#3a6aa8'; c.fillRect(250, 136, 56, 24); c.strokeStyle = '#d8d8e0'; c.lineWidth = 2; c.strokeRect(250, 136, 56, 24);
      const d = v.seg(t, 1.0, 3.0), dxp = v.lerp(190, 278, d), dyp = v.lerp(60, 140, d) - Math.sin(d * Math.PI) * 20;
      if (d < 1) pw36Hero(v, 1, dxp, dyp, 'show', { s: 0.38, face: 1, rot: d * pw36TAU * 2, mood: 'wow' });
      else if (t < 4) { for (let k = 0; k < 6; k++) v.fillCircle(270 + k * 4, 132 - v.rand(k) * 10 * (1 - v.seg(t, 3, 4)), 2, '#bfe8ff'); v.label('CLEAN!', 278, 112, 9, '#d9ffd0'); }
    },
  });
}
// ----- END 36-4 Stunt Show Showdown -----
