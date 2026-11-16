/* Pip & Bo - Level previews for World 37 Medieval Tournament. Helpers are prefixed pw37. Each level's preview sits
   between its own BEGIN/END lines. Pip and Bo wear each level's outfit, drawn by TOURNEY_OUTFITS (the same drawing the
   levels use), so the world page shows what they wear in that level. */
'use strict';

// shared: a bright tournament sky, green hills, pennants, a horse
const pw37TAU = Math.PI * 2;
// Pip or Bo in a World 37 outfit ('livery', 'borrowed', 'engineer', 'champion'); o: s, face, mood, arms, prop, visor,
// wobble, helmOff, backwards, laurel, dizzy, rot, sq, v (speed for ribbons)
const pw37Hero = (v, id, x, y, outfit, o = {}) => {
  const face = o.face == null ? (id === 0 ? 1 : -1) : o.face, s = o.s || 0.6;
  TOURNEY_OUTFITS.draw(v.ctx, id, outfit, Object.assign({}, o, { x, y, s, bw: 20, bh: 24, face, t: v.t }), () => v.hero(id, 0, 0, { s: 1, face, mood: o.mood, shadow: false }));
};
const pw37Sky = (v, o = {}) => {
  const c = v.ctx, g = c.createLinearGradient(0, 0, 0, v.H), base = o.base || 110, sc = o.scroll || 0;
  g.addColorStop(0, o.dusk ? '#f0a070' : '#7cc8f4'); g.addColorStop(1, o.dusk ? '#ffe0b0' : '#dff2fb');
  c.fillStyle = g; c.fillRect(0, 0, v.W, v.H);
  // the sun (or the low evening sun) and two soft clouds drifting by
  const sx = o.dusk ? 70 : 46, sy = o.dusk ? base - 30 : 30;
  c.fillStyle = o.dusk ? 'rgba(255,230,170,0.35)' : 'rgba(255,250,210,0.45)'; v.circle(sx, sy, 20); c.fill();
  c.fillStyle = o.dusk ? '#fff0c0' : '#fffbe6'; v.circle(sx, sy, 11); c.fill();
  for (let k = 0; k < 2; k++) {
    const cx = ((k * 170 + 90 - v.t * 4 - sc * 0.05) % 400 + 400) % 400 - 40, cy = 22 + k * 16;
    c.fillStyle = 'rgba(255,255,255,0.85)'; v.circle(cx, cy, 8); c.fill(); v.circle(cx + 10, cy - 4, 10); c.fill(); v.circle(cx + 22, cy, 8); c.fill(); c.fillRect(cx, cy, 22, 6);
    c.fillStyle = 'rgba(150,180,210,0.25)'; c.fillRect(cx - 2, cy + 4, 28, 3);
  }
  // a hazy far ridge
  c.fillStyle = o.dusk ? 'rgba(200,130,120,0.45)' : 'rgba(140,190,170,0.55)'; c.beginPath(); c.moveTo(0, base);
  for (let x = 0; x <= v.W + 20; x += 20) c.lineTo(x, base - 26 - Math.sin((x + sc * 0.1) * 0.013 + 1) * 8);
  c.lineTo(v.W, base); c.fill();
  if (o.castle !== false) { // a far castle with merlons, a lit side and a flag
    const cx = 250 - (sc * 0.1) % 400, cb = base - 10;
    c.fillStyle = 'rgba(120,120,140,0.6)'; c.fillRect(cx, cb - 34, 40, 34); c.fillRect(cx - 8, cb - 44, 12, 44); c.fillRect(cx + 36, cb - 44, 12, 44);
    for (let k = 0; k < 4; k++) c.fillRect(cx + 2 + k * 10, cb - 38, 6, 6);
    for (const tx of [cx - 8, cx + 36]) for (let k = 0; k < 2; k++) c.fillRect(tx + k * 7, cb - 48, 4, 4);
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(cx - 8, cb - 44, 3, 44); c.fillRect(cx, cb - 34, 3, 34);
    c.fillStyle = 'rgba(60,50,70,0.4)'; c.beginPath(); c.arc(cx + 20, cb - 6, 6, Math.PI, 0); c.lineTo(cx + 26, cb); c.lineTo(cx + 14, cb); c.fill();
    c.strokeStyle = 'rgba(80,70,80,0.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx + 42, cb - 48); c.lineTo(cx + 42, cb - 60); c.stroke();
    c.fillStyle = '#d8323a'; c.beginPath(); c.moveTo(cx + 42, cb - 60); c.lineTo(cx + 52 + Math.sin(v.t * 5) * 1.5, cb - 57); c.lineTo(cx + 42, cb - 54); c.fill();
  }
  // the near hill: a lit crest, a shaded foot, and a few round trees
  const hy = x => base - 14 - Math.sin((x + sc * 0.2) * 0.02) * 10;
  const hg = c.createLinearGradient(0, base - 24, 0, v.H); hg.addColorStop(0, '#9ad06a'); hg.addColorStop(1, '#6aa64a');
  c.fillStyle = hg; c.beginPath(); c.moveTo(0, base);
  for (let x = 0; x <= v.W + 20; x += 20) c.lineTo(x, hy(x));
  c.lineTo(v.W, v.H); c.lineTo(0, v.H); c.fill();
  c.strokeStyle = 'rgba(230,255,190,0.6)'; c.lineWidth = 1.5; c.beginPath();
  for (let x = 0; x <= v.W + 20; x += 20) { if (x) c.lineTo(x, hy(x)); else c.moveTo(x, hy(x)); }
  c.stroke();
  for (let k = 0; k < 5; k++) {
    const tx = ((k * 83 + 30 - sc * 0.2) % 420 + 420) % 420 - 50, ty = hy(tx) + 3, r = 6 + v.rand(k + 60) * 3;
    c.fillStyle = 'rgba(40,70,30,0.25)'; c.beginPath(); c.ellipse(tx + 2, ty + 1, r + 2, 2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6a4a2a'; c.fillRect(tx - 1, ty - 6, 2, 6);
    c.fillStyle = '#4e8a3a'; v.circle(tx, ty - 8 - r * 0.5, r); c.fill();
    c.fillStyle = '#6aaa4a'; v.circle(tx - r * 0.3, ty - 10 - r * 0.6, r * 0.6); c.fill();
  }
};
const pw37Pennants = (v, x0, x1, y, sag = 10) => {
  const c = v.ctx, cols = ['#d8323a', '#ffc53d', '#3a6ee8', '#5fb84a', '#f6ecd0'];
  c.strokeStyle = '#5e3a1c'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y); c.quadraticCurveTo((x0 + x1) / 2, y + sag * 2, x1, y); c.stroke();
  const n = Math.floor((x1 - x0) / 14);
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n, px = v.lerp(x0, x1, u), py = y + sag * 4 * u * (1 - u) + 1, fl = Math.sin(v.t * 6 + k) * 1.5;
    c.fillStyle = cols[k % cols.length]; c.beginPath(); c.moveTo(px - 4, py); c.lineTo(px + 4, py); c.lineTo(px + fl, py + 9); c.fill();
  }
};
// a horse side-on, hooves at x, y; o: face, s, run (0 stand .. 1 gallop), cap (caparison colours), coat
const pw37Horse = (v, x, y, o = {}) => {
  const c = v.ctx, f = o.face || 1, s = o.s || 1, ph = v.t * 10 * (o.run == null ? 1 : o.run), run = o.run == null ? 1 : o.run;
  c.save(); c.translate(x, y); c.scale(f * s, s);
  const coat = o.coat || '#a8683a', dark = o.coatDark || '#7a4a20';
  const bob = Math.sin(ph * 2) * 1.5 * run;
  // legs
  for (let k = 0; k < 4; k++) {
    const lx = k < 2 ? -16 + k * 5 : 12 + (k - 2) * 5, sw = Math.sin(ph + k * 1.6) * 0.6 * run;
    c.save(); c.translate(lx, -22 + bob); c.rotate(sw); c.fillStyle = k % 2 ? dark : coat; c.fillRect(-2, 0, 4, 22); c.fillStyle = '#3a2a1a'; c.fillRect(-2.5, 19, 5, 3); c.restore();
  }
  // body, neck, head
  c.fillStyle = coat; c.beginPath(); c.ellipse(0, -28 + bob, 24, 10, 0, 0, pw37TAU); c.fill();
  c.beginPath(); c.moveTo(14, -32 + bob); c.lineTo(24, -48 + bob); c.lineTo(31, -45 + bob); c.lineTo(24, -28 + bob); c.fill();
  c.beginPath(); c.ellipse(32, -46 + bob, 8, 4.5, 0.5, 0, pw37TAU); c.fill();
  c.fillStyle = '#222'; v.circle(31, -49 + bob, 1.2); c.fill();
  c.fillStyle = o.mane || '#3a2a1a'; c.beginPath(); c.moveTo(14, -36 + bob); c.lineTo(24, -52 + bob); c.lineTo(22, -44 + bob); c.fill();
  // tail
  c.strokeStyle = o.mane || '#3a2a1a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-23, -32 + bob); c.quadraticCurveTo(-34, -30 + bob, -36 - run * 4, -20 + bob + Math.sin(ph) * 2); c.stroke();
  // caparison
  if (o.cap) {
    c.fillStyle = o.cap[0]; c.beginPath(); c.moveTo(-22, -34 + bob); c.lineTo(20, -34 + bob); c.lineTo(22, -16 + bob); c.lineTo(-24, -16 + bob); c.fill();
    c.fillStyle = o.cap[1]; c.fillRect(-1, -34 + bob, 10, 18);
    c.fillStyle = o.cap[0]; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(-24 + k * 8, -16 + bob); c.lineTo(-20 + k * 8, -12 + bob); c.lineTo(-16 + k * 8, -16 + bob); c.fill(); }
  }
  c.restore();
  return { x: x + f * 2 * s, y: y - 38 * s + bob * s };
};
const pw37Lance = (v, x, y, ang, len, cols) => {
  const c = v.ctx;
  c.save(); c.translate(x, y); c.rotate(ang);
  for (let k = 0; k < 6; k++) { c.fillStyle = cols[k % 2]; c.beginPath(); c.moveTo(k * len / 6, -1.8 + k * 0.2); c.lineTo((k + 1) * len / 6, -1.6 + k * 0.2); c.lineTo((k + 1) * len / 6, 1.6 - k * 0.2); c.lineTo(k * len / 6, 1.8 - k * 0.2); c.fill(); }
  c.fillStyle = '#c8ccd6'; c.beginPath(); c.moveTo(-4, -5); c.lineTo(6, -3); c.lineTo(6, 3); c.lineTo(-4, 5); c.fill();
  c.restore();
};
const pw37Shield = (v, x, y, r, col, col2, moon) => {
  const c = v.ctx;
  c.fillStyle = col; c.beginPath(); c.moveTo(x - r, y - r); c.lineTo(x + r, y - r); c.lineTo(x + r, y); c.quadraticCurveTo(x + r * 0.8, y + r, x, y + r * 1.4); c.quadraticCurveTo(x - r * 0.8, y + r, x - r, y); c.fill();
  c.fillStyle = col2; if (moon) { v.circle(x, y, r * 0.5); c.fill(); c.fillStyle = col; v.circle(x + r * 0.22, y - r * 0.1, r * 0.42); c.fill(); } else { v.circle(x, y, r * 0.38); c.fill(); }
};
const pw37Dirt = (v, y, scroll) => {
  const c = v.ctx, g = c.createLinearGradient(0, y, 0, v.H);
  g.addColorStop(0, '#d2aa72'); g.addColorStop(1, '#b08a58');
  c.fillStyle = g; c.fillRect(0, y, v.W, v.H - y);
  c.fillStyle = 'rgba(255,240,200,0.45)'; c.fillRect(0, y, v.W, 1.5);
  c.fillStyle = 'rgba(90,60,30,0.25)'; c.fillRect(0, y + 1.5, v.W, 2);
  c.fillStyle = 'rgba(120,90,50,0.35)'; for (let k = 0; k < 10; k++) c.fillRect(((k * 47 - scroll) % (v.W + 40) + v.W + 40) % (v.W + 40) - 20, y + 6 + (k % 3) * 10, 18, 2);
  for (let k = 0; k < 12; k++) { const px = ((k * 29 + 7 - scroll) % (v.W + 20) + v.W + 20) % (v.W + 20) - 10, py = y + 5 + v.rand(k + 80) * (v.H - y - 8);
    c.fillStyle = 'rgba(90,70,50,0.45)'; v.circle(px, py, 1.4); c.fill(); c.fillStyle = 'rgba(255,240,210,0.5)'; c.fillRect(px - 1, py - 1.2, 1, 1); }
};

// ----- BEGIN 37-1 Runaway Royal Carriage -----
// The King's carriage bolts down a country road. Pip in coach livery hauls the reins on the driver's box, Bo roped to
// the roof ducks a low branch, then shoves a bandit off the back; the King waves from the window.
{
  definePreview('Runaway Royal Carriage', {
    blurb: 'The King\'s carriage has bolted! One drives and leans against the tilt, one rides the roof ducking branches and shoving bandits off.',
    loop: 6, still: 2.2,
    draw(v, t) {
      const c = v.ctx, scroll = t * 140;
      pw37Sky(v, { scroll });
      pw37Dirt(v, 140, scroll);
      // trees going by
      for (let k = 0; k < 4; k++) { const x = ((k * 110 - scroll * 0.6) % 440 + 440) % 440 - 40; c.fillStyle = '#5e3a1c'; c.fillRect(x - 3, 104, 6, 36); c.fillStyle = '#3e8a34'; v.circle(x, 98, 18); c.fill(); }
      const tilt = Math.sin(t * 2.2) * 0.04, bx = 150, by = 132 + Math.sin(t * 9) * 1.5;
      // horses
      pw37Horse(v, 250, 156, { s: 0.7, cap: ['#7a3aa8', '#ffd23a'] });
      pw37Horse(v, 236, 160, { s: 0.7, cap: ['#7a3aa8', '#ffd23a'], coat: '#f2e6c8', coatDark: '#c8b898', mane: '#d8c8a0' });
      c.strokeStyle = '#5e3a1c'; c.lineWidth = 2; c.beginPath(); c.moveTo(196, by - 6); c.lineTo(232, 140); c.stroke();
      // the carriage
      c.save(); c.translate(bx, by); c.rotate(tilt);
      for (const wx of [-38, 34]) { c.strokeStyle = '#5e3a1c'; c.lineWidth = 3; v.circle(wx, 12, 12); c.stroke(); for (let k = 0; k < 4; k++) { const a = -scroll * 0.08 + k * Math.PI / 4; c.beginPath(); c.moveTo(wx + Math.cos(a) * 12, 12 + Math.sin(a) * 12); c.lineTo(wx - Math.cos(a) * 12, 12 - Math.sin(a) * 12); c.stroke(); } }
      c.fillStyle = '#7a3aa8'; v.rr(-54, -40, 100, 46, 8); c.fill();
      c.fillStyle = '#ffd23a'; c.fillRect(-54, -4, 100, 4); c.fillRect(-54, -40, 100, 3);
      c.fillStyle = '#dff2fb'; v.rr(-14, -32, 24, 20, 4); c.fill();
      // the King at the window
      c.fillStyle = '#ffd8b0'; v.circle(-2, -20, 7); c.fill(); c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(-8, -26); c.lineTo(-6, -33); c.lineTo(-2, -28); c.lineTo(2, -33); c.lineTo(4, -26); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(-2, -13, 5, 3, 0, 0, pw37TAU); c.fill();
      // the driver's box
      c.fillStyle = '#5e3a1c'; c.fillRect(44, -18, 14, 4);
      c.restore();
      // Pip drives (reins), Bo on the roof (rope)
      const duck = v.seg(t, 1.6, 1.9) * (1 - v.seg(t, 2.6, 2.9));
      pw37Hero(v, 0, bx + 52, by - 18, 'livery', { s: 0.6, face: 1, arms: 'reins', prop: 'gauntlets', mood: 'grit', v: 1 });
      c.strokeStyle = '#5e3a1c'; c.lineWidth = 1; c.beginPath(); c.moveTo(bx + 60, by - 26); c.lineTo(236, 128); c.stroke();
      // the branch (comes in from the right at 1.2, passes over the roof at 2.2)
      const brx = v.lerp(360, -60, v.seg(t, 1.2, 3.2));
      c.strokeStyle = '#5e3a1c'; c.lineWidth = 5; c.beginPath(); c.moveTo(brx + 60, 40); c.lineTo(brx - 10, 76); c.stroke(); c.fillStyle = '#3e8a34'; v.circle(brx - 10, 74, 8); c.fill();
      // the bandit on the back, shoved off at 4
      const shove = v.seg(t, 4.0, 4.8);
      if (t > 3.2) {
        const bdx = bx - 44 - shove * 60, bdy = by - 40 + v.hop(shove, 30) + shove * 60;
        c.fillStyle = '#3a3a4a'; v.rr(bdx - 7, bdy - 20, 14, 20, 4); c.fill(); c.fillStyle = '#2e2e2e'; c.fillRect(bdx - 7, bdy - 16, 14, 4);
        c.fillStyle = '#ffffff'; v.circle(bdx - 2, bdy - 14, 1.2); c.fill(); v.circle(bdx + 2, bdy - 14, 1.2); c.fill();
        if (shove > 0 && shove < 1) v.label('SHOVE!', bx - 40, by - 82, 10, '#ffe7a8');
      }
      const onBack = t > 3.6 && t < 4.6;
      pw37Hero(v, 1, bx + (onBack ? -30 : 4), by - 40, 'livery', { s: 0.6, face: onBack ? -1 : 1, sq: duck * 0.8, prop: 'rope', mood: duck > 0.5 ? 'wow' : 'grit', arms: onBack && t > 3.9 ? 'push' : null, v: 1 });
      if (duck > 0.6) v.label('duck!', bx + 4, by - 72, 9, '#ffffff');
      // a favour floating up
      const fv = v.seg(t, 4.9, 5.8);
      if (fv > 0 && fv < 1) { c.fillStyle = 'rgba(255,90,140,' + (1 - fv) + ')'; v.circle(bx + 4, by - 70 - fv * 30, 4); c.fill(); }
    },
  });
}
// ----- END 37-1 Runaway Royal Carriage -----

// ----- BEGIN 37-2 Tandem Joust Run -----
// Two squires, one horse, one very long lance. Pip rides in front, Bo behind sets the lance height and couches: it
// threads a ring on a post, then the horse jumps a hurdle and the lance lifts.
{
  definePreview('Tandem Joust Run', {
    blurb: 'Two squires, one horse, one very long lance! One rides, jumps and ducks; one aims the lance at rings and straw knights.',
    loop: 5, still: 1.55,
    draw(v, t) {
      const c = v.ctx, scroll = t * 150;
      pw37Sky(v, { scroll });
      pw37Pennants(v, -10, v.W + 10, 26, 8);
      pw37Dirt(v, 146, scroll);
      // the ring post: passes the lance tip at 1.5
      const px = v.lerp(380, -80, t / 3.1), took = t > 1.5;
      c.fillStyle = '#5e3a1c'; c.fillRect(px, 70, 4, 80); c.fillRect(px - 12, 70, 16, 3);
      if (!took) { c.strokeStyle = '#ffd23a'; c.lineWidth = 2.5; v.circle(px - 10, 82, 6); c.stroke(); }
      // the hurdle: jumped 2.4-3.1
      const hx = v.lerp(430, -40, (t - 1.2) / 2.6);
      c.fillStyle = '#f6ecd0'; c.fillRect(hx - 14, 132, 28, 5); c.fillStyle = '#d8323a'; c.fillRect(hx - 4, 132, 8, 5); c.fillStyle = '#5e3a1c'; c.fillRect(hx - 14, 132, 3, 16); c.fillRect(hx + 11, 132, 3, 16);
      const jump = v.seg(t, 2.35, 3.05), jy = v.hop(jump, 22);
      const hp = pw37Horse(v, 130, 148 + jy, { s: 0.85, cap: ['#ffc53d', '#3a6ee8'], run: jump > 0 && jump < 1 ? 0.2 : 1 });
      // Bo couches the lance (low before the ring, middle after); Pip in front
      const couch = t > 1.1 && t < 1.6, ang = took ? -0.25 : -0.16;
      pw37Hero(v, 1, hp.x - 14, hp.y + 4, 'borrowed', { s: 0.55, face: 1, arms: 'fwd', prop: 'lance', visor: 1, mood: 'grit', v: 1 });
      pw37Lance(v, hp.x - 10, hp.y - 6, ang, 120, ['#ffc53d', '#3a6ee8']);
      if (took) { const lx = hp.x - 10 + Math.cos(ang) * 64, ly = hp.y - 6 + Math.sin(ang) * 64; c.strokeStyle = '#ffd23a'; c.lineWidth = 2.5; v.circle(lx, ly, 6); c.stroke(); }
      pw37Hero(v, 0, hp.x + 8, hp.y + 2, 'borrowed', { s: 0.55, face: 1, arms: 'reins', prop: 'spur', mood: jump > 0 && jump < 1 ? 'wow' : 'joy', v: 1, sq: jump > 0 && jump < 1 ? 0.2 : 0 });
      if (couch) v.label('couch!', hp.x + 40, hp.y - 40, 10, '#ffe7a8');
      if (t > 1.5 && t < 2.2) v.label('RING!', px + 10, 56, 11, '#ffd23a');
      if (jump > 0 && jump < 1) v.label('jump!', hp.x, hp.y - 46, 10, '#ffffff');
    },
  });
}
// ----- END 37-2 Tandem Joust Run -----

// ----- BEGIN 37-3 Siege Tower Push -----
// Pip pushes the siege tower on its bar toward the baron's wall; Bo on the top deck holds up the wet-hide roof as a
// volley of arrows thunks into it, then drops the bridge onto the wall.
{
  definePreview('Siege Tower Push', {
    blurb: 'Push a siege tower to the baron\'s wall! One pushes and brakes; one climbs inside to hold the roof up, beat out fires and drop the bridge.',
    loop: 6, still: 2.4,
    draw(v, t) {
      const c = v.ctx, gx = Math.min(t, 4.2) * 12;
      pw37Sky(v, { castle: false });
      c.fillStyle = '#8a7a5a'; c.fillRect(0, 150, v.W, 30);
      c.fillStyle = 'rgba(255,240,200,0.3)'; c.fillRect(0, 150, v.W, 1.5); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 162, v.W, 18);
      for (let k = 0; k < 14; k++) { c.fillStyle = 'rgba(60,50,30,0.4)'; v.circle(v.rand(k + 30) * v.W, 154 + v.rand(k + 50) * 22, 1.3); c.fill(); }
      // the baron's wall
      c.fillStyle = '#9aa0aa'; c.fillRect(250, 40, 80, 120); c.fillStyle = '#7a808a'; for (let k = 0; k < 4; k++) c.fillRect(250 + k * 22, 30, 14, 12);
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(250, 40, 3, 120); for (let k = 0; k < 4; k++) c.fillRect(250 + k * 22, 30, 14, 2);
      c.strokeStyle = 'rgba(60,64,80,0.35)'; c.lineWidth = 1; c.beginPath();
      for (let y = 52, r = 0; y < 160; y += 12, r++) { c.moveTo(250, y); c.lineTo(330, y); for (let x = 250 + (r % 2) * 10; x < 330; x += 20) { c.moveTo(x, y); c.lineTo(x, y - 12); } }
      c.stroke(); c.fillStyle = 'rgba(90,130,60,0.6)'; for (let k = 0; k < 6; k++) { v.circle(254 + v.rand(k + 70) * 20, 120 + v.rand(k + 90) * 36, 3); c.fill(); }
      c.fillStyle = '#d8323a'; c.fillRect(300, 10, 2, 22); c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(302, 10); c.lineTo(318, 15); c.lineTo(302, 20); c.fill();
      // the tower
      const tx = 150 + gx, ty = 150;
      for (const wx of [-22, 22]) { c.fillStyle = '#5e3a1c'; v.circle(tx + wx, ty - 6, 7); c.fill(); }
      c.fillStyle = '#a0683a'; c.fillRect(tx - 32, ty - 120, 64, 112);
      c.strokeStyle = '#5e3a1c'; c.lineWidth = 2; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(tx - 32, ty - 8 - k * 28); c.lineTo(tx + 32, ty - 8 - k * 28); c.stroke(); }
      c.beginPath(); c.moveTo(tx - 32, ty - 8); c.lineTo(tx + 32, ty - 120); c.moveTo(tx + 32, ty - 8); c.lineTo(tx - 32, ty - 120); c.strokeStyle = 'rgba(94,58,28,0.4)'; c.stroke();
      // the bar and the pusher
      c.fillStyle = '#5e3a1c'; c.fillRect(tx - 54, ty - 28, 24, 4);
      pw37Hero(v, 0, tx - 54, ty, 'engineer', { s: 0.55, face: 1, arms: 'push', prop: 'straps', mood: 'grit', soot: 0.3, rot: 0.15 });
      // the roof: raised 0.8-3.4, arrows thunk 1.6-2.4
      const roof = v.seg(t, 0.8, 1.1) * (1 - v.seg(t, 3.4, 3.6));
      c.fillStyle = '#8a6a40'; c.save(); c.translate(tx, ty - 124 - roof * 12); c.fillRect(-36, -4, 72, 6); c.restore();
      pw37Hero(v, 1, tx, ty - 120, 'engineer', { s: 0.55, face: 1, arms: roof > 0.5 ? 'up' : null, prop: 'hide', mood: roof > 0.5 ? 'wow' : 'happy', arrows: t > 2.4 ? 2 : 0 });
      for (let k = 0; k < 5; k++) {
        const at = 1.6 + k * 0.16, u = v.seg(t, at - 0.5, at);
        if (u <= 0) continue;
        const ax = v.lerp(270, tx - 24 + k * 12, u), ay = v.lerp(40, ty - 128 - roof * 12, u) - Math.sin(u * Math.PI) * 18;
        if (u < 1 || t < 3.4) { c.save(); c.translate(ax, ay); c.rotate(u < 1 ? 2.6 - u * 1.2 : 1.6); c.fillStyle = '#5e3a1c'; c.fillRect(-8, -0.7, 12, 1.4); c.fillStyle = '#ffffff'; c.fillRect(-9, -1.5, 3, 3); c.restore(); }
      }
      if (t > 2.0 && t < 2.8) v.label('THUNK!', tx - 70, 40, 10, '#ffe7a8');
      // the bridge drops onto the wall at 4.4
      const br = v.ease.out(v.seg(t, 4.3, 4.8));
      c.save(); c.translate(tx + 32, ty - 112); c.rotate(-Math.PI / 2 * (1 - br)); c.fillStyle = '#8a5a32'; c.fillRect(0, -3, 42, 6); c.restore();
      if (br >= 1) v.label('Bridge down!', 200, 22, 11, '#ffd23a');
    },
  });
}
// ----- END 37-3 Siege Tower Push -----

// ----- BEGIN 37-4 Grand Joust -----
// The tournament final. Pip and Bo in champion's plate charge down the tilt, lances couched; at the clash Bo's shield
// is at the wrong height, Pip's lance strikes High and Bo's helm spins off.
{
  definePreview('Grand Joust', {
    blurb: 'The tournament final! Gallop on the hoofbeats, aim where their shield isn\'t, guard where their lance is, and strike on time.',
    loop: 5, still: 1.75,
    draw(v, t) {
      const c = v.ctx;
      pw37Sky(v, { base: 70 });
      // the stand and crowd
      c.fillStyle = '#7a4e2a'; c.fillRect(0, 62, v.W, 46);
      for (let r = 0; r < 3; r++) for (let k = 0; k < 26; k++) { const cheer = t > 1.8 && t < 3.4 ? Math.abs(Math.sin(t * 9 + k)) * 2 : 0; c.fillStyle = ['#ffd8b0', '#c8945a', '#8a5a32', '#f2c8a0'][(k + r) % 4]; v.circle(8 + k * 12 + (r % 2) * 6, 72 + r * 13 - cheer, 4); c.fill(); }
      c.fillStyle = '#d8323a'; for (let k = 0; k < 20; k++) { c.beginPath(); c.arc(8 + k * 16, 62, 8, 0, Math.PI); c.fill(); }
      pw37Pennants(v, -10, v.W + 10, 20, 10);
      pw37Dirt(v, 108, 0);
      // the riders close: contact at 1.8
      const u = v.ease.in(v.seg(t, 0, 1.8)), after = v.seg(t, 1.8, 3.2);
      const bx = v.lerp(290, 170, u) - after * 40, px = v.lerp(30, 150, u) + after * 40;
      const bo = pw37Horse(v, bx, 128, { s: 0.75, face: -1, cap: ['#3a6ee8', '#dfe6f2'], coat: '#3a2a20', coatDark: '#22180e', mane: '#1a1210', run: t < 3.2 ? 1 : 0.2 });
      pw37Lance(v, bo.x + 4, bo.y + 2, Math.PI + 0.12 + after * 0.9, 90, ['#3a6ee8', '#dfe6f2']);
      const helmOff = t > 1.8;
      pw37Hero(v, 1, bo.x, bo.y + 10, 'champion', { s: 0.55, face: -1, arms: 'fwd', visor: 1, helmOff, mood: helmOff ? 'wow' : 'grit', v: 1 });
      pw37Shield(v, bo.x - 6, bo.y + 6, 6, '#3a6ee8', '#dfe6f2', true);
      if (helmOff && t < 3.4) { const k = v.seg(t, 1.8, 3.0); TOURNEY_OUTFITS.helm(c, 1, bo.x + 10 + k * 40, bo.y - 12 - Math.sin(k * Math.PI) * 30, 0.55, k * 14, { face: -1 }); }
      // the barrier
      for (let x = 0; x < v.W; x += 24) { c.fillStyle = (x / 24) % 2 ? '#d8323a' : '#f6ecd0'; c.fillRect(x, 126, 24, 9); }
      const pip = pw37Horse(v, px, 160, { s: 0.85, face: 1, cap: ['#ff7a2a', '#ffc53d'], mane: '#f2e6c8', run: t < 3.2 ? 1 : 0.2 });
      pw37Lance(v, pip.x - 4, pip.y + 2, -0.3 - after * 0.6, 100, ['#ff7a2a', '#ffc53d']);
      pw37Hero(v, 0, pip.x, pip.y + 10, 'champion', { s: 0.62, face: 1, arms: 'fwd', visor: t < 3.2 ? 1 : 0.3, mood: 'grit', laurel: t > 3.4, v: 1 });
      pw37Shield(v, pip.x + 8, pip.y + 8, 7, '#ff7a2a', '#ffc53d', false);
      if (t > 1.8 && t < 2.0) { c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(0, 0, v.W, v.H); }
      if (t > 1.8 && t < 3.6) v.label('PERFECT! High strike!', v.W / 2, 40, 11, '#ffd23a');
    },
  });
}
// ----- END 37-4 Grand Joust -----
