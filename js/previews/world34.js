/* Pip & Bo - Level previews for World 34 Viking Voyage. Helpers are prefixed pw34. Each level's preview sits between
   its own BEGIN/END lines. */
'use strict';

// shared: a grey northern sea, a longship, and Viking helmets on Pip and Bo
const pw34TAU = Math.PI * 2;
const pw34Sky = (v, o = {}) => {
  const c = v.ctx, g = c.createLinearGradient(0, 0, 0, v.H);
  if (o.night) { g.addColorStop(0, '#081428'); g.addColorStop(1, '#2e4a62'); } else { g.addColorStop(0, '#8aa4b8'); g.addColorStop(1, '#d8e2ea'); }
  c.fillStyle = g; c.fillRect(0, 0, v.W, v.H);
  if (o.night) for (let k = 0; k < 3; k++) { c.fillStyle = 'rgba(120,255,180,' + (0.12 + 0.06 * Math.sin(v.t * 1.3 + k)) + ')'; c.beginPath(); c.moveTo(0, 30 + k * 12); for (let x = 0; x <= v.W; x += 20) c.lineTo(x, 24 + k * 12 + Math.sin(x * 0.03 + v.t + k) * 8); c.lineTo(v.W, 60 + k * 12); c.lineTo(0, 60 + k * 12); c.fill(); }
  // fjord cliffs
  c.fillStyle = o.night ? '#24344a' : '#5a6a7a';
  c.beginPath(); c.moveTo(0, o.base || 96); for (let k = 0; k <= 8; k++) c.lineTo(k * 42 - ((o.scroll || 0) * 0.2 % 42), (o.base || 96) - 20 - v.rand(k + Math.floor((o.scroll || 0) * 0.2 / 42)) * 30); c.lineTo(v.W, o.base || 96); c.fill();
};
const pw34Sea = (v, y0, scroll, t) => {
  const c = v.ctx;
  c.fillStyle = '#2e5a72'; c.fillRect(0, y0, v.W, v.H - y0);
  for (let k = 0; k < 3; k++) {
    const y = y0 + 6 + k * 20;
    c.strokeStyle = 'rgba(232,244,246,' + (0.35 + k * 0.15) + ')'; c.lineWidth = 1.5 + k * 0.5; c.beginPath();
    for (let x = 0; x <= v.W; x += 8) c.lineTo(x, y + Math.sin((x + scroll * (1 + k * 0.4)) * 0.06 + t * 2 + k) * (2 + k));
    c.stroke();
  }
};
const pw34Ship = (v, x, y, s, o = {}) => {
  const c = v.ctx, t = v.t;
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(-(o.tilt || 0));
  // hull
  c.fillStyle = '#8a5a32'; c.beginPath(); c.moveTo(-60, -10); c.quadraticCurveTo(-50, 12, 0, 12); c.quadraticCurveTo(50, 12, 60, -10); c.closePath(); c.fill();
  c.fillStyle = '#5a3418'; c.fillRect(-56, -10, 112, 4);
  c.strokeStyle = '#8a5a32'; c.lineWidth = 4; c.beginPath(); c.moveTo(56, -10); c.quadraticCurveTo(70, -26, 62, -36); c.stroke(); c.beginPath(); c.moveTo(-56, -10); c.quadraticCurveTo(-68, -24, -60, -32); c.stroke();
  c.fillStyle = '#8a5a32'; v.circle(62, -38, 5); c.fill(); c.fillStyle = '#ffc53d'; v.circle(64, -39, 1.5); c.fill();
  // shields on the rail
  const cols = o.cols || ['#c8323a', '#ffc53d', '#3a7ad8', '#5fb84a'];
  for (let k = 0; k < 6; k++) { c.fillStyle = cols[k % cols.length]; v.circle(-40 + k * 16, -10, 5); c.fill(); c.fillStyle = '#c8ccd6'; v.circle(-40 + k * 16, -10, 1.5); c.fill(); }
  // mast and sail
  c.fillStyle = '#5a3418'; c.fillRect(-2, -64, 4, 54);
  const sail = o.sail === undefined ? 1 : o.sail, sc = o.sailCols || ['#c8323a', '#f2e6c8'];
  for (let k = 0; k < 5; k++) { c.fillStyle = o.gold ? (k % 2 ? '#ffd86a' : '#e8a82a') : sc[k % 2]; c.beginPath(); c.moveTo(-22 + k * 9, -60); c.lineTo(-13 + k * 9, -60); c.lineTo(-13 + k * 9 + sail * 4, -22); c.lineTo(-22 + k * 9 + sail * 4, -22); c.fill(); }
  // oars
  if (o.oars !== null) for (let k = 0; k < 5; k++) { const a = Math.sin((o.oars || t * 2) * pw34TAU + k * 0.3) * 0.4; c.strokeStyle = '#c89a6a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-30 + k * 14, -4); c.lineTo(-30 + k * 14 - 14 + a * 10, 16); c.stroke(); }
  c.restore();
};
const pw34Helmet = (v, id, x, y, s = 0.6) => {
  const c = v.ctx;
  c.fillStyle = '#9aa0aa'; c.beginPath(); c.arc(x, y, 10 * s, Math.PI, pw34TAU); c.fill();
  if (id === 0) { c.fillStyle = '#f2e6c8'; for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x + d * 9 * s, y - 2 * s); c.quadraticCurveTo(x + d * 20 * s, y - 6 * s, x + d * 17 * s, y - 18 * s); c.quadraticCurveTo(x + d * 13 * s, y - 8 * s, x + d * 6 * s, y - 6 * s); c.fill(); } }
  else { c.fillStyle = '#ffffff'; for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x + d * 8 * s, y - 4 * s); c.quadraticCurveTo(x + d * 18 * s, y - 16 * s, x + d * 20 * s, y - 8 * s); c.quadraticCurveTo(x + d * 14 * s, y - 6 * s, x + d * 8 * s, y); c.fill(); } }
};
// Pip or Bo in a Viking helmet (and Pip's orange beard)
const pw34Viking = (v, id, x, y, o = {}) => {
  const s = o.s || 0.6;
  v.hero(id, x, y, o);
  const top = y - 30 * s * (1 - (o.sq || 0) * 0.3);
  if (id === 0) { const c = v.ctx; c.fillStyle = '#ff8a2a'; c.beginPath(); c.ellipse(x + (o.face || 1) * 2 * s, y - 13 * s, 7 * s, 4 * s, 0, 0, pw34TAU); c.fill(); }
  pw34Helmet(v, id, x, top, s);
};
const pw34Food = (v, k, x, y, s = 1) => {
  const c = v.ctx;
  c.save(); c.translate(x, y); c.scale(s, s);
  if (k === 'roast') { c.fillStyle = '#f2e6c8'; c.fillRect(3, -2, 7, 3); c.fillStyle = '#b5562a'; c.beginPath(); c.ellipse(-2, 0, 7, 5, -0.3, 0, pw34TAU); c.fill(); }
  else if (k === 'fish') { c.fillStyle = '#7fb4cc'; c.beginPath(); c.ellipse(0, 0, 8, 4, 0, 0, pw34TAU); c.fill(); c.beginPath(); c.moveTo(7, 0); c.lineTo(12, -4); c.lineTo(12, 4); c.fill(); }
  else if (k === 'barrel') { c.fillStyle = '#8a5a32'; c.beginPath(); c.ellipse(0, 0, 8, 9, 0, 0, pw34TAU); c.fill(); c.strokeStyle = '#8a8e96'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-7, -4); c.lineTo(7, -4); c.moveTo(-7, 4); c.lineTo(7, 4); c.stroke(); }
  c.restore();
};

// ----- BEGIN 34-1 Sea Serpent Chase -----
// The longship scrolls through grey water. A huge sea serpent rears up behind, its mouth opens (tell), Pip at the helm
// swerves down a row, and Bo cranks the harpoon and fires into the open mouth: the serpent flinches and dives.
{
  definePreview('Sea Serpent Chase', {
    blurb: 'A sea serpent chases your longship! One steers round its coils, one fires the harpoon into its open mouth.',
    loop: 6, still: 3.4,
    draw(v, t) {
      const c = v.ctx, scroll = t * 60;
      pw34Sky(v, { scroll });
      pw34Sea(v, 100, scroll, t);
      // the serpent: rises 0.5-1.6, mouth open 1.6-3.0, hit at 3.0, dives 3.4-4.4
      const rise = v.ease.out(v.seg(t, 0.5, 1.6)) * (1 - v.ease.in(v.seg(t, 3.4, 4.4))), hit = t > 3.0 && t < 3.6;
      const sx = 250 + (hit ? 6 : 0), sy = 130 - rise * 70, open = v.seg(t, 1.6, 2.1) * (1 - v.seg(t, 3.0, 3.2));
      if (rise > 0.02) {
        c.strokeStyle = '#3a7a5a'; c.lineWidth = 16; c.lineCap = 'round';
        c.beginPath(); c.moveTo(310, 140); c.quadraticCurveTo(300, sy + 40, sx, sy); c.stroke(); c.lineCap = 'butt';
        c.fillStyle = '#5fb84a'; for (let k = 0; k < 4; k++) { v.circle(306 - k * 6, 128 - k * 14 * rise, 3); c.fill(); }
        c.fillStyle = '#3a7a5a'; c.beginPath(); c.ellipse(sx - 10, sy - 2, 22, 13, -0.2, 0, pw34TAU); c.fill();
        // jaws
        c.fillStyle = '#7a1a2a'; c.beginPath(); c.moveTo(sx - 14, sy); c.lineTo(sx - 46, sy - 12 - open * 14); c.lineTo(sx - 46, sy + 4 + open * 14); c.closePath(); c.fill();
        c.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(sx - 20 - k * 7, sy - 4 - open * 4); c.lineTo(sx - 23 - k * 7, sy + 2 - open * 2); c.lineTo(sx - 26 - k * 7, sy - 4 - open * 4); c.fill(); }
        c.fillStyle = hit ? '#ffffff' : '#ffd23a'; v.circle(sx - 8, sy - 7, 3); c.fill();
        if (open > 0.5 && t < 3.0) v.label('!', sx - 30, sy - 34, 14, '#ff5a4a');
        if (hit) v.label('BULLSEYE!', sx - 30, sy - 40, 11, '#ffd23a');
      }
      // the ship swerves down a row at 2.3
      const shipY = v.lerp(118, 136, v.ease.inOut(v.seg(t, 2.3, 2.7))) * (t < 4.8 ? 1 : 1) - (t > 4.8 ? v.seg(t, 4.8, 5.6) * 18 : 0);
      pw34Ship(v, 110, shipY, 0.9, { tilt: Math.sin(t * 2) * 0.03 });
      pw34Viking(v, 0, 70, shipY - 10, { s: 0.45, face: 1, mood: t > 1.6 && t < 3.0 ? 'wow' : 'grit' });
      pw34Viking(v, 1, 150, shipY - 10, { s: 0.45, face: 1, mood: hit ? 'joy' : 'grit' });
      // the harpoon: cranked 1.8-2.8, flies 2.8-3.0
      const fly = v.seg(t, 2.8, 3.0);
      if (t > 1.8 && t < 2.8) v.label('crank...', 150, shipY - 46, 9, '#ffe7a8');
      if (fly > 0 && fly < 1) { const hx = v.lerp(160, sx - 34, fly), hy = v.lerp(shipY - 24, sy, fly) - Math.sin(fly * Math.PI) * 12; v.line(hx - 14, hy + 3, hx, hy, '#5a3418', 2); c.fillStyle = '#c8ccd6'; c.beginPath(); c.moveTo(hx, hy - 3); c.lineTo(hx + 6, hy); c.lineTo(hx, hy + 3); c.fill(); }
    },
  });
}
// ----- END 34-1 Sea Serpent Chase -----

// ----- BEGIN 34-2 Ice Fortress Raid -----
// An ice cliff under a fortress. Bo chops a handhold above with the axe and climbs; a horn blows, arrows rain, and Pip
// holds the round shield overhead over them both: the arrows thunk into it.
{
  definePreview('Ice Fortress Raid', {
    blurb: 'Climb the ice wall under the fortress! One chops handholds with an axe, one holds the shield over you both.',
    loop: 6, still: 3.3,
    draw(v, t) {
      const c = v.ctx;
      const g = c.createLinearGradient(0, 0, 0, v.H); g.addColorStop(0, '#bfe4f2'); g.addColorStop(1, '#7fb4cc'); c.fillStyle = g; c.fillRect(0, 0, v.W, v.H);
      // the fortress on top
      c.fillStyle = '#e8f4f6'; c.fillRect(0, 0, v.W, 26); for (let x = 0; x < v.W; x += 28) c.fillRect(x, 26, 16, 8);
      c.fillStyle = '#5a6a7a'; c.fillRect(140, 8, 40, 18);
      // the ice wall grid
      for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) {
        const x = 70 + k * 30, y = 50 + r * 34, hold = (k === 3 && r >= 1) || (k === 4 && r === 3);
        const blue = v.rand(k + r * 9) > 0.7;
        c.fillStyle = hold ? 'rgba(255,255,255,0.15)' : (blue ? '#5aa6d8' : 'rgba(234,248,255,0.85)'); v.rr(x, y, 28, 32, 4); c.fill();
        if (hold) continue;
        // (art pass) each ice block: a deeper core, a lit top and left edge, a fracture line, trapped bubbles
        c.fillStyle = blue ? 'rgba(30,80,140,0.3)' : 'rgba(150,200,230,0.35)'; v.rr(x + 5, y + 7, 18, 20, 4); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(x + 3, y + 1.5, 22, 2); c.fillRect(x + 1.5, y + 3, 2, 24);
        c.fillStyle = blue ? 'rgba(20,60,110,0.35)' : 'rgba(90,150,190,0.35)'; c.fillRect(x + 3, y + 29, 23, 2); c.fillRect(x + 25.5, y + 4, 2, 25);
        c.strokeStyle = blue ? 'rgba(220,240,255,0.6)' : 'rgba(90,150,190,0.55)'; c.lineWidth = 1; c.beginPath(); const fx = x + 6 + v.rand(k * 3 + r) * 14; c.moveTo(fx, y + 4); c.lineTo(fx + 4, y + 14); c.lineTo(fx + 1, y + 22); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.8)'; v.fillCircle(x + 8 + v.rand(k + r * 5) * 12, y + 20 + v.rand(k * 7 + r) * 8, 1.2, 'rgba(255,255,255,0.8)'); v.fillCircle(x + 18, y + 10 + v.rand(r + k * 2) * 6, 0.9, 'rgba(255,255,255,0.8)');
      }
      // the chop: the cell above at (3, 0) cracks 0.6-1.6 and breaks
      const chop = v.seg(t, 0.6, 1.6), up = v.ease.inOut(v.seg(t, 1.7, 2.1));
      if (chop < 1) { c.strokeStyle = '#3a6a80'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(165, 54); c.lineTo(172, 64 + chop * 10); c.lineTo(180, 60); c.stroke(); }
      else { c.fillStyle = 'rgba(255,255,255,0.15)'; v.rr(160, 50, 28, 32, 4); c.fill(); }
      if (t > 0.6 && t < 1.6 && Math.sin(t * 20) > 0) v.label('CHOP!', 200, 48, 10, '#ffffff');
      const boY = v.lerp(118, 84, up);
      pw34Viking(v, 1, 174, boY + 16, { s: 0.5, face: 1, mood: t > 2.4 && t < 4.4 ? 'wow' : 'grit' });
      // the axe
      c.save(); c.translate(184, boY - 2); c.rotate(-0.8 + Math.sin(t * 14) * 0.6 * (t > 0.6 && t < 1.6 ? 1 : 0)); c.fillStyle = '#7a4a22'; c.fillRect(-1, -14, 2.5, 14); c.fillStyle = '#c8ccd6'; c.fillRect(1, -15, 6, 6); c.restore();
      // the horn, the volley (2.6-4.0) and Pip's shield up (2.4-4.6)
      if (t > 2.2 && t < 2.8) v.label('HORN!', 260, 46, 11, '#ff5a4a');
      const shUp = v.seg(t, 2.3, 2.5) * (1 - v.seg(t, 4.4, 4.7)), pipY = v.lerp(152, 118, v.ease.inOut(v.seg(t, 1.9, 2.3)));
      pw34Viking(v, 0, 160, pipY + 16, { s: 0.5, face: 1, mood: 'grit' });
      c.save(); c.translate(167, pipY - 14 - shUp * 18); c.scale(1, 0.35 + (1 - shUp) * 0.65);
      c.fillStyle = '#c8323a'; c.beginPath(); c.arc(0, 0, 10 + shUp * 16, 0, pw34TAU); c.fill(); c.fillStyle = '#f2e6c8'; c.beginPath(); c.arc(0, 0, 10 + shUp * 16, 0, Math.PI); c.fill();
      c.fillStyle = '#c8ccd6'; v.circle(0, 0, 4); c.fill(); c.restore();
      for (let k = 0; k < 7; k++) {
        const ft = v.seg(t, 2.8 + k * 0.12, 3.3 + k * 0.12); if (ft <= 0 || ft >= 1) continue;
        const ax = 120 + k * 16, ay = v.lerp(30, Math.abs(ax - 167) < 28 ? pipY - 30 : 170, ft);
        v.line(ax, ay - 10, ax, ay, '#5a3418', 1.5);
      }
      if (t > 3.2 && t < 4.4) v.label('thunk! thunk!', 210, pipY - 40, 9, '#ffe7a8');
    },
  });
}
// ----- END 34-2 Ice Fortress Raid -----

// ----- BEGIN 34-3 Mead Hall Feast Brawl -----
// A roaring mead hall. Pip slides a roast down the long table and it stops right at a hungry Viking, who cheers; Bo
// catches a fish tossed from the kitchen; then a barrel rolls along the top table past raised mugs: SKOL!
{
  definePreview('Mead Hall Feast Brawl', {
    blurb: 'Feed the starving crew! Toss food to your partner, slide it down the tables and roll barrels for SKOL!',
    loop: 6, still: 2.2,
    draw(v, t) {
      const c = v.ctx;
      c.fillStyle = '#3a2416'; c.fillRect(0, 0, v.W, v.H);
      for (let x = 0; x < v.W; x += 26) { c.fillStyle = (x / 26) % 2 ? '#4a2e1a' : '#43291a'; c.fillRect(x, 0, 26, 160); }
      c.fillStyle = '#6a4424'; c.fillRect(0, 160, v.W, 20);
      // fire pit
      for (let k = 0; k < 4; k++) { c.fillStyle = k % 2 ? '#ff8a2a' : '#ffc53d'; c.beginPath(); c.moveTo(150 + k * 8, 160); c.quadraticCurveTo(148 + k * 8, 140 - Math.sin(t * 9 + k) * 4, 154 + k * 8, 134 - Math.sin(t * 9 + k) * 4); c.quadraticCurveTo(158 + k * 8, 146, 156 + k * 8, 160); c.fill(); }
      // two tables with Vikings
      const tables = [{ y: 120 }, { y: 70 }];
      const vik = (x, y, k, up, cheer) => {
        const b = cheer ? Math.sin(t * 12) * 2 : 0;
        c.fillStyle = ['#7a3a2a', '#3a5a7a', '#5a6a3a', '#6a4a7a'][k % 4]; v.rr(x - 8, y - 20 + b, 16, 18, 4); c.fill();
        c.fillStyle = '#f2c8a6'; v.circle(x, y - 25 + b, 6); c.fill();
        c.fillStyle = ['#e8c070', '#a0522d', '#d8d8d8', '#ff8a2a'][k % 4]; c.beginPath(); c.moveTo(x - 6, y - 24 + b); c.quadraticCurveTo(x, y - 12 + b, x + 6, y - 24 + b); c.fill();
        c.fillStyle = '#9aa0aa'; c.beginPath(); c.arc(x, y - 28 + b, 6, Math.PI, pw34TAU); c.fill();
        if (up) { c.fillStyle = up > 1 ? '#ffc53d' : '#c8ccd6'; c.fillRect(x + 6, y - 44, 6, 7); }
      };
      // the top table raises mugs from 3.4; the barrel rolls 3.8-5.2 and fills them
      const roll = v.seg(t, 3.8, 5.2), bx = v.lerp(90, 300, roll);
      for (let k = 0; k < 4; k++) vik(120 + k * 46, tables[1].y, k + 1, t > 3.4 ? (t > 3.8 && bx > 120 + k * 46 ? 2 : 1) : 0, t > 3.8 && bx > 120 + k * 46);
      const roastStop = 166, slide = v.ease.out(v.seg(t, 0.6, 1.4)), rx = v.lerp(84, roastStop, slide);
      for (let k = 0; k < 4; k++) vik(120 + k * 46, tables[0].y, k, 0, k === 1 && t > 1.4 && t < 3.0);
      for (const tb of tables) { c.fillStyle = '#8a5a32'; c.fillRect(80, tb.y, 220, 6); c.fillStyle = '#5a3418'; c.fillRect(88, tb.y + 6, 4, 10); c.fillRect(288, tb.y + 6, 4, 10); }
      // the steps on the left
      for (const tb of tables) { c.fillStyle = '#8a5a32'; c.fillRect(44, tb.y + 14, 36, 4); }
      // Pip on the low step slides a roast (charging 0.1-0.6)
      if (t < 1.4) pw34Food(v, 'roast', t < 0.6 ? 70 : rx, tables[0].y - 4, 1);
      else if (t < 2.6) pw34Food(v, 'roast', roastStop, tables[0].y - 4, 1);
      if (t > 1.4 && t < 2.6) v.label('YUM!', 166, tables[0].y - 46, 10, '#ffd23a');
      pw34Viking(v, 0, 62, tables[0].y + 14, { s: 0.45, face: 1, mood: t > 1.4 && t < 2.6 ? 'joy' : 'grit' });
      if (t < 0.6) { c.fillStyle = '#ffc53d'; c.fillRect(52, tables[0].y - 30, 22 * v.seg(t, 0.05, 0.6), 3); }
      // a fish tossed from the kitchen to Bo on the upper step (2.0-2.8)
      const toss = v.seg(t, 2.0, 2.8);
      c.fillStyle = '#2a180e'; v.rr(4, 110, 30, 40, 4); c.fill(); c.fillStyle = 'rgba(255,176,96,0.5)'; v.rr(7, 113, 24, 34, 3); c.fill();
      if (toss > 0 && toss < 1) pw34Food(v, 'fish', v.lerp(20, 62, toss), v.lerp(120, 50, toss) - Math.sin(toss * Math.PI) * 26, 1);
      const caught = t >= 2.8 && t < 3.8;
      pw34Viking(v, 1, 62, tables[1].y + 14, { s: 0.45, face: 1, mood: caught ? 'joy' : 'grit' });
      if (caught) { pw34Food(v, 'fish', 62, tables[1].y - 14, 1); v.label('Caught!', 62, tables[1].y - 30, 9, '#d9ffd0'); }
      // the barrel
      if (roll > 0 && roll < 1) { c.save(); c.translate(bx, tables[1].y - 8); c.rotate(roll * 18); pw34Food(v, 'barrel', 0, 0, 0.9); c.restore(); }
      if (t > 4.2 && t < 5.6) v.label('SKOL!', 200, 18, 16, '#ffd23a');
    },
  });
}
// ----- END 34-3 Mead Hall Feast Brawl -----

// ----- BEGIN 34-4 Longship Race -----
// Two longships neck and neck on a rolling sea. A white crest lifts Pip's stern ("SURGE!"), then Bo steers in and bumps
// Pip's ship toward a rock: shields fly off the rail.
{
  definePreview('Longship Race', {
    blurb: 'Race longships! Row on the drum beat, catch the wave crests and ram your rival toward the rocks.',
    loop: 6, still: 2.4,
    draw(v, t) {
      const c = v.ctx, scroll = t * 80;
      pw34Sky(v, { scroll });
      pw34Sea(v, 92, scroll, t);
      // the drum beat
      const beat = Math.max(0, 1 - ((t % 0.5) / 0.12));
      c.fillStyle = '#8a5a32'; c.beginPath(); c.ellipse(160, 20, 12 + beat * 3, 8 + beat * 2, 0, 0, pw34TAU); c.fill();
      c.fillStyle = '#f2e6c8'; c.beginPath(); c.ellipse(160, 17, 10 + beat * 3, 4, 0, 0, pw34TAU); c.fill();
      if (beat > 0.5) v.label('BOOM', 160, 6, 8, '#ffe7a8');
      // a crest rolls through 1.2-2.6 and lifts Pip's stern at about 2.0
      const cx = v.lerp(-40, 360, v.seg(t, 1.2, 2.6));
      if (t > 1.2 && t < 2.6) { c.fillStyle = 'rgba(95,147,168,0.9)'; c.beginPath(); c.moveTo(cx - 40, 150); c.quadraticCurveTo(cx - 10, 106, cx + 8, 110); c.quadraticCurveTo(cx + 16, 116, cx + 12, 124); c.lineTo(cx + 20, 150); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(cx - 18, 116); c.quadraticCurveTo(cx - 2, 106, cx + 8, 110); c.quadraticCurveTo(cx + 16, 114, cx + 10, 122); c.stroke(); }
      const surge = v.seg(t, 2.0, 2.6);
      // Bo rams at 3.6-4.0: Pip's ship slides toward the rock
      const ram = v.ease.out(v.seg(t, 3.6, 4.1)), back = v.seg(t, 5.2, 6);
      const pipX = 120 + surge * 30 - back * 30, pipY = v.lerp(116, 102, ram) + back * 14;
      const boX = 150 - v.seg(t, 4.1, 5.0) * 10, boY = v.lerp(140, 128, v.seg(t, 3.3, 3.7)) + v.seg(t, 3.9, 4.3) * 12 - back * 0;
      // the rock ahead in the far lane
      c.fillStyle = '#5a5e66'; c.beginPath(); c.moveTo(250, 104); c.lineTo(262, 80); c.lineTo(276, 72); c.lineTo(290, 86); c.lineTo(298, 104); c.fill();
      pw34Ship(v, pipX, pipY, 0.62, { tilt: t > 1.8 && t < 2.4 ? 0.12 : 0, sailCols: ['#e8622a', '#f2e6c8'] });
      pw34Viking(v, 0, pipX - 30, pipY - 8, { s: 0.35, face: 1, mood: ram > 0.1 && ram < 1 ? 'dizzy' : 'grit' });
      pw34Ship(v, boX, boY, 0.7, { sailCols: ['#3a7ad8', '#f2e6c8'] });
      pw34Viking(v, 1, boX - 34, boY - 8, { s: 0.38, face: 1, mood: t > 3.6 && t < 5 ? 'joy' : 'grit' });
      if (surge > 0 && surge < 1) v.label('SURGE!', pipX, pipY - 52, 11, '#bfeaff');
      if (t > 3.7 && t < 4.6) {
        v.label('RAMMED!', (pipX + boX) / 2, 64, 11, '#ff6a5a');
        for (let k = 0; k < 2; k++) { const u = v.seg(t, 3.7, 4.6); c.fillStyle = k ? '#ffc53d' : '#c8323a'; v.circle(pipX - 10 + k * 14 + u * 20, pipY - 8 - u * 30 + u * u * 40, 4); c.fill(); }
      }
    },
  });
}
// ----- END 34-4 Longship Race -----
