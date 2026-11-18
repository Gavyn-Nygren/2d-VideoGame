/* Pip & Bo - Level previews for World 41 Pop-Up Storybook. Each level's preview sits between its own BEGIN/END lines,
   with its own helpers (41-2's are prefixed pw41pc). v.hero draws Pip and Bo in each level's 2D outfit. */
'use strict';

// ----- BEGIN 41-2 Page Turner Chase -----
// The Reader's hand curls the page up behind Pip and Bo as they sprint right; paper trees fold up out of the page ahead.
// At a stream Bo holds a striped tab, a paper bridge slides across, Pip runs over it, then Bo follows.
const pw41pcTAU = Math.PI * 2;
// cut paper: fill, a white cut edge, then a thin ink line
const pw41pcPaper = (c, fill, lw = 1) => { c.fillStyle = fill; c.fill(); c.strokeStyle = '#fffaf0'; c.lineWidth = lw + 1.2; c.stroke(); c.strokeStyle = '#2b2130'; c.lineWidth = lw * 0.7; c.stroke(); };
// a paper pop-up tree standing at x, y (its fold line), h tall, open 0..1 (0 lies flat on the page)
const pw41pcTree = (v, x, y, h, open, kind) => {
  const c = v.ctx, k = v.ease.back ? v.ease.out(open) : open;
  if (open <= 0.02) { c.fillStyle = 'rgba(60,90,50,0.25)'; c.beginPath(); c.ellipse(x, y + 1, h * 0.3, 2.2, 0, 0, pw41pcTAU); c.fill(); return; }
  // the shadow it throws on the page grows as it stands
  c.fillStyle = 'rgba(40,40,30,' + (0.18 * k).toFixed(3) + ')'; c.beginPath(); c.ellipse(x + 6 * k, y + 2, h * 0.32 * (0.6 + 0.4 * k), 3, 0, 0, pw41pcTAU); c.fill();
  c.save(); c.translate(x, y); c.scale(1, k); c.transform(1, 0, -(1 - k) * 0.8, 1, 0, 0);
  c.beginPath(); c.rect(-h * 0.05, -h * 0.34, h * 0.1, h * 0.34); pw41pcPaper(c, '#8a5a32', 0.8);
  const greens = kind % 2 ? ['#4f8a3a', '#6aa84a'] : ['#3f7a4a', '#5f9a52'];
  if (kind % 3 === 2) { c.beginPath(); c.arc(0, -h * 0.62, h * 0.3, 0, pw41pcTAU); pw41pcPaper(c, greens[1]); c.beginPath(); c.arc(-h * 0.12, -h * 0.55, h * 0.14, 0, pw41pcTAU); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fill(); }
  else for (let i = 0; i < 3; i++) { const yy = -h * (0.3 + i * 0.22), w = h * (0.34 - i * 0.07); c.beginPath(); c.moveTo(-w, yy); c.lineTo(0, yy - h * 0.34); c.lineTo(w, yy); c.closePath(); pw41pcPaper(c, greens[i % 2]); }
  // the fold down the middle catches the lamp
  c.strokeStyle = 'rgba(255,250,235,0.35)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -h * 0.95); c.stroke();
  c.restore();
};
// the curl: the page rolled up into a tube at x, from the far edge (y0) to the near edge (y1); the hand over it
const pw41pcCurl = (v, x, y0, y1, t) => {
  const c = v.ctx, r = 16;
  // past the curl the bare desk shows, dark
  c.fillStyle = '#2a1f1c'; c.beginPath(); c.moveTo(0, y0); c.lineTo(x, y0); c.lineTo(x - (y1 - y0) * 0.18, y1 + 10); c.lineTo(0, y1 + 10); c.closePath(); c.fill();
  // the tube: layers of rolled page
  const lean = (y1 - y0) * 0.18;
  for (let i = 3; i >= 0; i--) {
    c.beginPath(); c.moveTo(x - r - i * 2, y0 - 4); c.lineTo(x - lean - r - i * 2, y1 + 4); c.lineTo(x - lean + r - i * 3, y1 + 4); c.lineTo(x + r - i * 3, y0 - 4); c.closePath();
    c.fillStyle = i ? ['#e8dcc0', '#d8c8a8', '#c8b898'][i - 1] : '#f4ead2'; c.fill();
  }
  c.strokeStyle = 'rgba(80,60,40,0.35)'; c.lineWidth = 0.8;
  for (let k = 0; k < 5; k++) { const yy = y0 + (y1 - y0) * (k + 0.5) / 5 + Math.sin(t * 6 + k) * 1.5, dx = -lean * (yy - y0) / (y1 - y0); c.beginPath(); c.ellipse(x + dx, yy, r * 0.8, 2.6, 0, Math.PI, pw41pcTAU); c.stroke(); }
  // round shading across the tube, and the page peeling up off the desk into it
  const sh = c.createLinearGradient(x - r, 0, x + r, 0); sh.addColorStop(0, 'rgba(60,40,30,0.35)'); sh.addColorStop(0.45, 'rgba(255,250,235,0.1)'); sh.addColorStop(1, 'rgba(60,40,30,0.25)');
  c.fillStyle = sh; c.beginPath(); c.moveTo(x - r, y0 - 4); c.lineTo(x - lean - r, y1 + 4); c.lineTo(x - lean + r, y1 + 4); c.lineTo(x + r, y0 - 4); c.closePath(); c.fill();
  const pe = c.createLinearGradient(x + r, 0, x + r + 22, 0); pe.addColorStop(0, 'rgba(90,70,50,0.35)'); pe.addColorStop(1, 'rgba(90,70,50,0)');
  c.fillStyle = pe; c.beginPath(); c.moveTo(x + r - 2, y0); c.quadraticCurveTo(x + r + 10, y0 + 2, x + r + 22, y0 + 3); c.lineTo(x - lean + r + 22, y1 + 6); c.quadraticCurveTo(x - lean + r + 8, y1 + 5, x - lean + r - 2, y1 + 4); c.closePath(); c.fill();
  // the printed forest showing on the curling underside
  c.fillStyle = 'rgba(80,130,70,0.35)'; c.beginPath(); c.moveTo(x + r * 0.2, y0); c.lineTo(x - lean + r * 0.2, y1); c.lineTo(x - lean + r, y1); c.lineTo(x + r, y0); c.closePath(); c.fill();
  // the near end of the tube: a spiral of paper
  c.save(); c.translate(x - lean, y1 + 4);
  c.fillStyle = '#f4ead2'; c.beginPath(); c.ellipse(0, 0, r + 1, 6, 0, 0, pw41pcTAU); c.fill(); c.strokeStyle = '#2b2130'; c.lineWidth = 1; c.stroke();
  c.strokeStyle = 'rgba(80,60,40,0.6)'; c.lineWidth = 0.7; c.beginPath(); for (let a = 0; a < pw41pcTAU * 3; a += 0.2) { const rr = 1 + a * 0.8; c.lineTo(Math.cos(a + t * 5) * rr, Math.sin(a + t * 5) * rr * 0.36); } c.stroke();
  c.restore();
  // the Reader's hand: a striped pyjama sleeve from the top left, four fingers curled over the tube
  const hx = x + 2, hy = y0 + 24 + Math.sin(t * 1.3) * 2;
  c.save();
  const sleeve = () => { c.beginPath(); c.moveTo(-30, -10); c.lineTo(20, -10); c.lineTo(hx - 8, hy - 18); c.lineTo(hx - 34, hy - 4); c.closePath(); };
  sleeve(); c.fillStyle = '#f2ead6'; c.fill();
  c.save(); c.clip(); c.strokeStyle = '#3a9a94'; c.lineWidth = 7; for (let k = -6; k < 10; k++) { c.beginPath(); c.moveTo(k * 14 - 40, -10); c.lineTo(k * 14 + 40, hy + 10); c.stroke(); } c.restore();
  sleeve(); c.strokeStyle = '#2b2130'; c.lineWidth = 1.2; c.stroke();
  // the cuff
  c.beginPath(); c.ellipse(hx - 20, hy - 10, 6, 15, -0.9, 0, pw41pcTAU); c.fillStyle = '#e6dcc4'; c.fill(); c.stroke();
  // the palm and thumb on top, the fingers bending down over the near side
  c.fillStyle = '#f4c8a0'; c.beginPath(); c.ellipse(hx - 6, hy - 2, 17, 11, -0.5, 0, pw41pcTAU); c.fill(); c.stroke();
  for (let f = 0; f < 4; f++) {
    const fx = hx + 4 + f * 3, fy = hy - 6 + f * 7, bend = 0.15 * Math.sin(t * 2 + f);
    c.save(); c.translate(fx, fy); c.rotate(0.35 + bend);
    c.beginPath(); c.moveTo(0, -3); c.quadraticCurveTo(r + 10, -4, r + 10, 6); c.quadraticCurveTo(r + 4, 9, r + 2, 3); c.quadraticCurveTo(r - 4, 2, 0, 3); c.closePath();
    c.fillStyle = '#f4c8a0'; c.fill(); c.stroke();
    c.strokeStyle = 'rgba(160,90,60,0.45)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(r - 2, -2); c.lineTo(r - 1, 3); c.stroke(); c.strokeStyle = '#2b2130'; c.lineWidth = 1.2;
    c.restore();
  }
  c.beginPath(); c.ellipse(hx - 12, hy - 12, 9, 4, -1.1, 0, pw41pcTAU); c.fillStyle = '#f4c8a0'; c.fill(); c.stroke();
  c.restore();
};
{
  definePreview('Page Turner Chase', {
    blurb: 'Run! The Reader is turning the page and it\'s rolling up behind you. Hold the tabs for each other to cross.',
    loop: 6, still: 3,
    draw(v, t) {
      const c = v.ctx, W = v.W, H = v.H, top = 84, gy = 150;
      // the world scrolls while they run, and stops while Bo works the tab
      const sc = t < 2 ? t * 60 : t < 4.2 ? 120 : 120 + (t - 4.2) * 60;
      // the attic at bedtime: a dark wall, the lamp's warm pool, the far page and the book's edge
      const bg = c.createLinearGradient(0, 0, 0, top); bg.addColorStop(0, '#1e1822'); bg.addColorStop(1, '#3a2c2c'); c.fillStyle = bg; c.fillRect(0, 0, W, top);
      const lamp = c.createRadialGradient(W * 0.72, -10, 10, W * 0.72, -10, 190); lamp.addColorStop(0, 'rgba(255,214,140,0.55)'); lamp.addColorStop(1, 'rgba(255,214,140,0)'); c.fillStyle = lamp; c.fillRect(0, 0, W, H);
      // rain on the attic window
      c.fillStyle = '#2a3a4a'; v.rr(34, 10, 52, 40, 3); c.fill(); c.strokeStyle = '#5a4434'; c.lineWidth = 2.4; c.stroke(); c.beginPath(); c.moveTo(60, 10); c.lineTo(60, 50); c.moveTo(34, 30); c.lineTo(86, 30); c.stroke();
      c.strokeStyle = 'rgba(180,200,230,0.5)'; c.lineWidth = 0.8; for (let k = 0; k < 9; k++) { const x = 36 + v.rand(k) * 48, y = 12 + ((t * 70 + v.rand(k + 20) * 40) % 36); c.beginPath(); c.moveTo(x, y); c.lineTo(x - 1, y + 4); c.stroke(); }
      // the far page standing up behind (the next spread), and the stack of page edges
      c.fillStyle = '#e8dcc0'; c.beginPath(); c.moveTo(0, top); c.lineTo(W, top); c.lineTo(W, top - 6); c.lineTo(0, top - 3); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(120,100,70,0.5)'; c.lineWidth = 0.6; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(0, top - k * 0.9); c.lineTo(W, top - k * 1.6); c.stroke(); }
      // the page: cream paper with a watercolour forest floor printed on it, and a path
      const pg = c.createLinearGradient(0, top, 0, H); pg.addColorStop(0, '#d8d0a8'); pg.addColorStop(1, '#f2e8c8'); c.fillStyle = pg; c.fillRect(0, top, W, H - top);
      c.fillStyle = 'rgba(110,160,90,0.35)'; c.fillRect(0, top, W, gy - top - 14);
      c.fillStyle = 'rgba(200,170,110,0.55)'; c.beginPath(); c.moveTo(0, gy - 12); for (let x = 0; x <= W; x += 16) c.lineTo(x, gy - 12 + Math.sin((x + sc) * 0.05) * 2); c.lineTo(W, gy + 12); c.lineTo(0, gy + 12); c.closePath(); c.fill();
      // printed grass ticks and flowers that scroll with the page
      c.strokeStyle = 'rgba(60,110,50,0.5)'; c.lineWidth = 0.8;
      for (let k = 0; k < 40; k++) { const wx = k * 37 + v.rand(k) * 20, x = ((wx - sc) % 1480 + 1480) % 1480 - 20, y = top + 6 + v.rand(k + 9) * (gy - top - 22); if (x > -10 && x < W + 10) { c.beginPath(); c.moveTo(x, y); c.lineTo(x - 1.5, y - 4); c.moveTo(x + 2, y); c.lineTo(x + 3, y - 4); c.stroke(); } }
      c.strokeStyle = 'rgba(40,30,30,0.18)'; c.lineWidth = 0.6; for (let k = 0; k < 3; k++) { const y = 166 + k * 4; c.beginPath(); c.moveTo(150 - (sc % 40), y); c.lineTo(300 - (sc % 40), y); c.stroke(); } // a line of story text along the margin
      // the stream across the page, and the paper bridge that slides over it when the tab is pulled
      const gx = 330 - sc, gw = 34;
      c.fillStyle = '#6aa0b8'; c.beginPath(); c.moveTo(gx, top); c.lineTo(gx + gw, top); c.lineTo(gx + gw + 14, H); c.lineTo(gx + 14, H); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 0.8; for (let k = 0; k < 5; k++) { const y = top + 10 + k * 18, x = gx + 6 + ((t * 20 + k * 7) % (gw - 10)) + (y - top) * 0.15; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 5, y); c.stroke(); }
      c.strokeStyle = '#2b2130'; c.lineWidth = 1; c.beginPath(); c.moveTo(gx, top); c.lineTo(gx + 14, H); c.moveTo(gx + gw, top); c.lineTo(gx + gw + 14, H); c.stroke();
      const out = v.ease.out(v.seg(t, 2.25, 2.75)) * (1 - v.ease.in(v.seg(t, 5.3, 5.8)));
      if (out > 0) { const bx = gx + gw + 11 - (gw + 8) * out; c.beginPath(); v.rr(bx, gy - 9, gw + 8, 15, 2); pw41pcPaper(c, '#c8945a', 1); c.strokeStyle = 'rgba(80,50,20,0.5)'; c.lineWidth = 0.6; for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(bx + k * (gw + 8) / 5, gy - 8); c.lineTo(bx + k * (gw + 8) / 5, gy + 5); c.stroke(); } }
      // the striped tab on the near bank, pulled by Bo
      const pull = v.ease.out(v.seg(t, 2.05, 2.35)) * (1 - v.seg(t, 4.0, 4.3)), tx = gx - 32, ty = gy + 14;
      c.save(); c.translate(tx - pull * 6, ty); c.rotate(-0.25 - pull * 0.35);
      c.beginPath(); v.rr(-3.5, -18, 7, 18, 2); c.fillStyle = '#f4ead2'; c.fill(); c.save(); c.clip(); c.fillStyle = '#d8342c'; for (let k = 0; k < 5; k++) c.fillRect(-4, -18 + k * 4, 8, 2); c.restore();
      c.strokeStyle = '#2b2130'; c.lineWidth = 0.8; c.stroke(); c.restore();
      c.fillStyle = '#2b2130'; c.fillRect(tx - 4, ty - 1, 8, 2); // the slot in the page
      // pop-up trees along the far side and the near side, unfolding as the runners come near
      const trees = [[200, 0, 34, 0], [262, 1, 30, 1], [400, 0, 38, 2], [452, 1, 30, 0], [520, 0, 36, 1], [600, 1, 32, 2], [660, 0, 38, 0]];
      const drawTree = ([wx, near, h, kind], i) => {
        const x = wx - sc, y = near ? gy + 26 : gy - 18;
        let open = v.clamp((300 - x) / 40, 0, 1);
        if (i === 2) open = Math.max(open, v.seg(t, 2.5, 3.6)); // the one that unfolds while they cross (half open in the still)
        if (x > -30 && x < W + 30) pw41pcTree(v, x, y, near ? h * 0.9 : h, open, kind);
      };
      trees.forEach((tr, i) => { if (!tr[1]) drawTree(tr, i); });
      // Pip and Bo: both sprint, then Bo holds the tab while Pip crosses the bridge, then Bo follows
      const run = k => v.hop(v.phase(t, 0.3, k), 3);
      let px, py = gy, bx2, by2 = gy + 4, pm = 'grit', bm = 'grit';
      if (t < 2) { px = 186; bx2 = 156; py += run(0); by2 += run(0.15); }
      else if (t < 4.2) {
        const cross = v.ease.inOut(v.seg(t, 2.6, 3.6)), bob = cross > 0 && cross < 1 ? run(0) : 0;
        px = cross > 0 ? v.lerp(gx - 6, gx + gw + 26, cross) : v.lerp(186, gx - 6, v.ease.out(v.seg(t, 2, 2.5))); py += bob; bx2 = tx - 12; bm = 'happy'; pm = cross >= 1 ? 'joy' : 'wow';
        if (t > 3.7) { const go = v.ease.inOut(v.seg(t, 3.75, 4.2)); bx2 = v.lerp(tx - 12, gx + gw - 4, go); by2 += run(0.15) * (go > 0 && go < 1 ? 1 : 0); }
      } else { px = gx + gw + 26 + (t - 4.2) * 60; bx2 = gx + gw - 4 + (t - 4.2) * 60; py += run(0); by2 += run(0.15); }
      px = Math.min(px, W - 20); bx2 = Math.min(bx2, W - 44);
      v.shadow(bx2, by2 + 1, 18); v.hero(1, bx2, by2, { s: 0.58, face: 1, mood: bm });
      v.shadow(px, gy + 1, 18); v.hero(0, px, py, { s: 0.58, face: 1, mood: pm });
      trees.forEach((tr, i) => { if (tr[1]) drawTree(tr, i); });
      // the curl creeps up behind them all the while
      const cx = 30 + t * 4 + v.seg(t, 2, 4.2) * 8;
      pw41pcCurl(v, cx, top - 2, H - 6, t);
      if (t > 2.1 && t < 3.6) v.label('I\'ve got the tab!', bx2 + 4, by2 - 40, 9, '#ffe9a8');
      v.pill('Page 1', W - 30, 12, { size: 8, bg: 'rgba(23,25,29,0.8)', col: '#f4ead2' });
    },
  });
}
// ----- END 41-2 Page Turner Chase -----
