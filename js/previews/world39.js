/* Pip & Bo - Level previews for World 39 Crystal Caverns. Helpers are prefixed pw39. Each level's preview sits
   between its own BEGIN/END lines. v.hero draws Pip and Bo in each level's outfit (the cave kit's outfits). */
'use strict';

// shared: a dark cave with glowing crystals, a glow crystal, the golem's face, a glow gem
const pw39TAU = Math.PI * 2;
const pw39GLOW = ['#4fe8d6', '#ffd56a', '#ff9ec4', '#dff6ff', '#8ef08a'];
// a glowing crystal standing at x, y (base), h tall, leaning ang; col; glow 0..1
const pw39Crystal = (v, x, y, h, ang, col, glow = 0.6) => {
  const c = v.ctx, w = h * 0.32;
  c.save(); c.translate(x, y); c.rotate(ang);
  if (glow > 0) { const g = c.createRadialGradient(0, -h * 0.5, 2, 0, -h * 0.5, h * 0.9); g.addColorStop(0, col + '88'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.fillRect(-h, -h * 1.4, h * 2, h * 1.8); }
  c.fillStyle = col; c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(-w / 2, -h * 0.72); c.lineTo(0, -h); c.lineTo(w / 2, -h * 0.72); c.lineTo(w / 2, 0); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.moveTo(-w / 2 + 1, -2); c.lineTo(-w / 2 + 1, -h * 0.7); c.lineTo(0, -h + 2); c.lineTo(-1, -2); c.closePath(); c.fill();
  c.restore();
};
const pw39Cluster = (v, x, y, s, seed, flip = 1) => {
  for (let k = 0; k < 4; k++) pw39Crystal(v, x + (k - 1.5) * 7 * s, y, (14 + v.rand(seed + k) * 16) * s, flip * (k - 1.5) * 0.25, pw39GLOW[(seed + k) % 5], 0.5 + 0.3 * Math.sin(v.t * 2 + k));
};
const pw39Cave = (v, o = {}) => {
  const c = v.ctx, g = c.createLinearGradient(0, 0, 0, v.H);
  g.addColorStop(0, o.top || '#1a1f2a'); g.addColorStop(1, o.bot || '#2a2230');
  c.fillStyle = g; c.fillRect(0, 0, v.W, v.H);
  const sc = o.scroll || 0;
  // far rock ribs and stalactites
  c.fillStyle = 'rgba(70,74,90,0.55)';
  for (let k = -1; k < 9; k++) { const x = ((k * 46 - sc * 0.3) % 414 + 414) % 414 - 46; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 18, 18 + v.rand(k + 3) * 22); c.lineTo(x + 34, 0); c.fill(); }
  // glow worms
  for (let k = 0; k < 18; k++) { const a = 0.4 + 0.4 * Math.sin(v.t * 2 + k); c.fillStyle = `rgba(150,240,255,${a})`; c.fillRect(((k * 37 - sc * 0.15) % 330 + 330) % 330, 4 + v.rand(k) * 14, 1.5, 1.5); }
};
// glitter dust drifting up
const pw39Dust = (v, n = 14) => { const c = v.ctx; for (let k = 0; k < n; k++) { const y = v.H - ((v.t * 14 + k * 23) % (v.H + 10)); c.fillStyle = pw39GLOW[k % 5]; c.globalAlpha = 0.6; c.fillRect((v.rand(k + 40) * v.W + Math.sin(v.t + k) * 6), y, 1.5, 1.5); c.globalAlpha = 1; } };
const pw39Gem = (v, x, y, r, col, o = {}) => {
  const c = v.ctx;
  if (o.glow !== false) { const g = c.createRadialGradient(x, y, 1, x, y, r * 3); g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.fillRect(x - r * 3, y - r * 3, r * 6, r * 6); }
  c.fillStyle = col; c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r, y - r * 0.2); c.lineTo(x, y + r); c.lineTo(x - r, y - r * 0.2); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * 0.4, y - r * 0.2); c.lineTo(x, y); c.closePath(); c.fill();
  if (o.star) { v.star(x, y, r * 0.55, '#fff7d0'); }
};
// the golem's head: square crystal blocks, two eyes (red angry .. teal calm)
const pw39GolemFace = (v, x, y, s, calm, o = {}) => {
  const c = v.ctx; c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#5c6a78'; v.rr(-40, -34, 80, 66, 10); c.fill();
  c.fillStyle = '#6e7e8e'; v.rr(-34, -30, 68, 22, 6); c.fill();
  c.fillStyle = '#4a5664'; c.fillRect(-40, 20, 80, 12);
  pw39Crystal(v, -26, -32, 18, -0.4, '#4fe8d6', 0.4); pw39Crystal(v, 22, -32, 14, 0.3, '#ff9ec4', 0.4);
  const eye = calm ? '#4fe8d6' : '#ff4a3a', bl = o.blink ? 0.2 : 1;
  for (const ex of [-17, 17]) { const g = c.createRadialGradient(ex, 0, 1, ex, 0, 16); g.addColorStop(0, eye + 'cc'); g.addColorStop(1, eye + '00'); c.fillStyle = g; c.fillRect(ex - 16, -16, 32, 32); c.fillStyle = eye; v.rr(ex - 8, -4 * bl, 16, 8 * bl, 3); c.fill(); }
  c.fillStyle = '#2a323c'; if (calm) { c.beginPath(); c.arc(0, 12, 12, 0.15 * Math.PI, 0.85 * Math.PI); c.lineWidth = 4; c.strokeStyle = '#2a323c'; c.stroke(); } else c.fillRect(-14, 10, 28, 6);
  c.restore();
};

// ----- BEGIN 39-1 Mine Lift Plunge -----
// The open lift on its two ropes drops down the shaft. It tips to slip past a rock shelf (Pip's side lowered), then
// levels out; crystals and a lantern slide up past, bats wheel, and a glow gem gets grabbed from the wall.
{
  definePreview('Mine Lift Plunge', {
    blurb: 'Each of you lowers one side of an old mine lift. Keep it level, or tip it on purpose to slip past the rocks.',
    loop: 5, still: 1.8,
    draw(v, t) {
      const c = v.ctx, drop = t * 70;
      pw39Cave(v, { top: '#262018', bot: '#1c2230' });
      // the shaft walls slide up
      c.fillStyle = '#3a3026'; c.fillRect(0, 0, 34, v.H); c.fillRect(v.W - 34, 0, 34, v.H);
      for (let k = -1; k < 6; k++) { const y = ((k * 44 - drop) % 264 + 264) % 264 - 44; c.fillStyle = '#5e4630'; c.fillRect(0, y, 34, 7); c.fillRect(v.W - 34, y + 20, 34, 7); }
      for (let k = 0; k < 3; k++) { const y = ((k * 90 + 40 - drop) % 270 + 270) % 270 - 40; pw39Cluster(v, k % 2 ? v.W - 30 : 30, y, 0.7, k * 3, k % 2 ? -1 : 1); }
      // the rock shelf, sticking out from the left wall, passes at about t = 1.8
      const shelfY = 230 - t * 70;
      c.fillStyle = '#6a6470'; v.rr(20, shelfY, 96, 16, 5); c.fill(); c.fillStyle = '#ffd56a'; v.circle(100, shelfY - 4, 4); c.fill();
      // tilt: Pip's (left) side up to pass the shelf, then level
      const tip = Math.sin(v.seg(t, 0.8, 2.8) * Math.PI) * 0.22;
      const ly = 112, lx = v.W / 2;
      c.save(); c.translate(lx, ly); c.rotate(tip);
      // ropes
      c.strokeStyle = '#c8a878'; c.lineWidth = 2; c.beginPath(); c.moveTo(-108, -6); c.lineTo(-108, -140); c.moveTo(108, -6); c.lineTo(108, -140); c.stroke();
      // platform and rail
      c.fillStyle = '#7a5434'; c.fillRect(-116, 0, 232, 10); c.fillStyle = '#5a3a20'; for (let k = 0; k < 8; k++) c.fillRect(-116 + k * 30, 0, 2, 10);
      c.strokeStyle = '#5a3a20'; c.lineWidth = 3; c.beginPath(); c.moveTo(-116, -18); c.lineTo(116, -18); c.stroke();
      // cranks
      for (const s of [-1, 1]) { c.fillStyle = '#8a8478'; v.circle(s * 104, -12, 8); c.fill(); c.strokeStyle = '#3a3026'; c.lineWidth = 2; c.beginPath(); c.moveTo(s * 104, -12); c.lineTo(s * 104 + Math.cos(t * 9 * s) * 9, -12 + Math.sin(t * 9 * s) * 9); c.stroke(); }
      // the lamp crate
      c.fillStyle = '#a0784a'; c.fillRect(-12, -14, 24, 14); c.fillStyle = '#ffd56a'; c.fillRect(-6, -11, 12, 4);
      c.restore();
      const reach = v.seg(t, 3.3, 3.8) - v.seg(t, 4.1, 4.4);
      v.hero(0, lx - 86 - reach * 30, ly + Math.sin(tip) * -86, { s: 0.6, face: -1, mood: tip > 0.1 ? 'grit' : 'happy' });
      v.hero(1, lx + 86, ly + Math.sin(tip) * 86, { s: 0.6, face: -1, mood: tip > 0.1 ? 'wow' : 'happy' });
      // a glow gem on the wall, grabbed at 3.8
      if (t < 3.8) pw39Gem(v, 40, 186 - t * 22, 5, '#4fe8d6'); else if (t < 4.6) v.label('+1', 60, 70, 10, '#bff8ef');
      // bats
      for (let k = 0; k < 3; k++) { const bx = ((t * 60 + k * 50) % 400) - 40, by = 40 + Math.sin(t * 5 + k) * 10 + k * 10, f = Math.sin(t * 20 + k) * 4; c.fillStyle = '#20181c'; c.beginPath(); c.moveTo(bx - 7, by - f); c.lineTo(bx, by); c.lineTo(bx + 7, by - f); c.lineTo(bx, by + 3); c.fill(); }
      pw39Dust(v, 10);
      // the depth gauge
      v.pill(Math.round(120 + t * 30) + ' m', v.W - 44, 14, { size: 9 });
    },
  });
}
// ----- END 39-1 Mine Lift Plunge -----

// ----- BEGIN 39-2 Sleeping Golem -----
// The giant walks; Pip clings to its forearm and pulls a dark shard out of the shoulder with tongs while Bo, up by the
// head, rings the tuning fork; the shard pops out, a red crack heals to teal, the eyes soften.
{
  definePreview('Sleeping Golem', {
    blurb: 'Climb the angry crystal golem while it walks, pull out the shards that hurt it, and soothe it when it flinches.',
    loop: 5, still: 2.6,
    draw(v, t) {
      const c = v.ctx, step = Math.sin(t / 5 * pw39TAU), pulled = t > 2.4;
      pw39Cave(v, { top: '#15202a', bot: '#1e2a36', scroll: t * 30 });
      for (let k = 0; k < 4; k++) pw39Cluster(v, ((k * 100 - t * 30) % 400 + 400) % 400 - 40, v.H, 1.1, k * 2);
      // the golem's body: chest and shoulder blocks, one arm swinging
      const bx = 150, by = 60 + step * 3;
      c.fillStyle = '#5c6a78'; v.rr(bx - 70, by + 10, 150, 150, 14); c.fill();
      c.fillStyle = '#6e7e8e'; v.rr(bx - 60, by + 20, 60, 50, 8); c.fill(); v.rr(bx + 8, by + 20, 62, 50, 8); c.fill();
      // the heart crystal behind a rib
      pw39Crystal(v, bx + 4, by + 120, 30, 0, pulled ? '#4fe8d6' : '#ff6a5a', 0.7);
      c.fillStyle = '#4a5664'; c.fillRect(bx - 30, by + 96, 70, 8);
      pw39GolemFace(v, bx + 4, by - 8, 0.62, pulled, { blink: t > 3.6 && t < 3.75 });
      // the crack on the shoulder: red, healing teal
      c.strokeStyle = pulled ? '#4fe8d6' : '#ff4a3a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(bx + 52, by + 26); c.lineTo(bx + 60, by + 38); c.lineTo(bx + 54, by + 48); c.stroke();
      // the arm
      const arm = 0.35 + step * 0.12;
      c.save(); c.translate(bx + 82, by + 30); c.rotate(arm);
      c.fillStyle = '#5c6a78'; v.rr(-14, 0, 30, 110, 10); c.fill(); c.fillStyle = '#6e7e8e'; v.rr(-18, 104, 38, 30, 10); c.fill();
      c.restore();
      // the shard (dark, angled) comes out at 2.4 and flies
      const fly = v.seg(t, 2.4, 3.4);
      c.save(); c.translate(bx + 60 + fly * 90, by + 36 - Math.sin(fly * Math.PI) * 40); c.rotate(-0.6 + fly * 6);
      c.fillStyle = '#2a2236'; c.beginPath(); c.moveTo(-3, 0); c.lineTo(0, -18); c.lineTo(3, 0); c.fill(); c.restore();
      if (pulled && t < 3.8) { v.sparkle(bx + 60, by + 36, v.seg(t, 2.4, 3)); v.label('Shard out!', 250, 30, 11, '#4fe8d6'); }
      // Pip on the arm with tongs, Bo up by the head with the fork
      const tug = pulled ? 0 : Math.sin(t * 14) * 1.5;
      v.hero(0, bx + 96 + Math.sin(arm) * -30 + tug, by + 82, { s: 0.55, face: -1, mood: pulled ? 'joy' : 'grit' });
      c.strokeStyle = '#c89a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(bx + 86 + tug, by + 64); c.lineTo(bx + 62, by + 38); c.stroke();
      v.hero(1, bx - 54, by + 20, { s: 0.55, face: 1, mood: 'happy' });
      c.strokeStyle = '#dfe6f2'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(bx - 44, by + 2); c.lineTo(bx - 44, by - 10); c.moveTo(bx - 47, by - 10); c.lineTo(bx - 47, by - 4); c.moveTo(bx - 41, by - 10); c.lineTo(bx - 41, by - 4); c.stroke();
      if (t > 0.6 && t < 2.2) { const r = 6 + (t * 20) % 12; c.strokeStyle = 'rgba(223,246,255,0.6)'; c.beginPath(); c.arc(bx - 44, by - 8, r, 0, pw39TAU); c.stroke(); }
      pw39Dust(v);
    },
  });
}
// ----- END 39-2 Sleeping Golem -----

// ----- BEGIN 39-3 Cave Worm Chase -----
// Pip and Bo run right through a crystal tunnel; behind them the worm's ringed mouth fills the left of the screen.
// Bo throws a glow gem up into the high tunnel at a fork, the worm's head swings after the light, and they take the low one.
{
  definePreview('Cave Worm Chase', {
    blurb: 'Run! A giant crystal-eating worm follows the light. Throw glow gems to steer it, and find the true tunnel.',
    loop: 5, still: 1.6,
    draw(v, t) {
      const c = v.ctx, sc = t * 120, gy = 150;
      pw39Cave(v, { top: '#1c1820', bot: '#2a2026', scroll: sc });
      // the fork: a high tunnel and a low one ahead
      c.fillStyle = '#3a3036'; c.fillRect(0, gy, v.W, v.H - gy); c.fillRect(0, 0, v.W, 26);
      c.fillStyle = '#4a3e44'; v.rr(200, 70, 140, 20, 6); c.fill();
      for (let k = 0; k < 6; k++) pw39Crystal(v, ((k * 70 - sc) % 420 + 420) % 420 - 40, gy, 12 + v.rand(k) * 10, (k % 2 ? 0.3 : -0.3), pw39GLOW[k % 5], 0.5);
      // the thrown gem arcs into the high tunnel
      const th = v.seg(t, 1.0, 2.0);
      if (t > 1.0) pw39Gem(v, v.lerp(178, 290, th), v.lerp(118, 60, th) - Math.sin(th * Math.PI) * 30, 4, '#ffd56a');
      if (t > 1.0 && t < 2.6) v.label('Gem! Up there!', 220, 40, 10, '#ffd56a');
      // the heroes run (Bo throws at 1.0)
      const run = v.phase(t, 0.3);
      v.hero(0, 150, gy + v.hop(run, 3), { s: 0.58, face: 1, mood: 'grit' });
      v.hero(1, 178, gy + v.hop(v.phase(t, 0.3, 0.15), 3), { s: 0.58, face: 1, mood: t > 1 && t < 1.4 ? 'joy' : 'wow' });
      // the worm: a huge ringed mouth on the left; its head turns up toward the light after the throw
      const look = v.ease.out(v.seg(t, 1.3, 2.4)) - v.ease.out(v.seg(t, 4.2, 4.9)), wx = 26 + Math.sin(t * 3) * 6, wy = 104 - look * 26;
      c.fillStyle = '#7a6a7e'; for (let k = 3; k >= 0; k--) { c.beginPath(); c.ellipse(wx - 30 - k * 24, wy + 10 + k * 6, 48, 52, 0, 0, pw39TAU); c.fill(); }
      c.fillStyle = '#8a7a8e'; c.beginPath(); c.ellipse(wx, wy, 44, 50, -look * 0.4, 0, pw39TAU); c.fill();
      c.fillStyle = '#1a0e14'; c.beginPath(); c.ellipse(wx + 8, wy, 30, 36, -look * 0.4, 0, pw39TAU); c.fill();
      for (let k = 0; k < 10; k++) { const a = k / 10 * pw39TAU + t * 0.8; pw39Crystal(v, wx + 8 + Math.cos(a) * 30, wy + Math.sin(a) * 36, 10, a - Math.PI / 2 + Math.PI, '#dff6ff', 0); }
      // the jaws meter
      v.pill('JAWS', 40, 14, { size: 8, bg: 'rgba(23,25,29,0.85)', col: '#ff9ec4' });
      c.fillStyle = 'rgba(23,25,29,0.85)'; c.fillRect(64, 10, 70, 8); c.fillStyle = '#ff6a8a'; c.fillRect(64, 10, 70 * (0.5 + 0.2 * Math.sin(t)), 8);
      pw39Dust(v, 8);
    },
  });
}
// ----- END 39-3 Cave Worm Chase -----

// ----- BEGIN 39-4 Gem Rush -----
// A cut-away of the dirt chamber: Pip digs a zig-zag staircase down and grabs a big gem; Bo digs a straight shaft
// under a boulder, which drops down it and buries Bo. The star gem glows at the bottom and the golem's face watches.
{
  definePreview('Gem Rush', {
    blurb: 'Versus: dig down through a chamber full of gems. Grab the most, find the star gem, and drop boulders on your rival.',
    loop: 6, still: 2.4,
    draw(v, t) {
      const c = v.ctx, C_ = 16, ox = 16, oy = 34, NC = 18, NR = 9;
      c.fillStyle = '#1c1620'; c.fillRect(0, 0, v.W, v.H);
      pw39GolemFace(v, v.W / 2, 14, 0.36, true, { blink: t > 4 && t < 4.15 });
      // the earth
      const pip = [[0, 2], [1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [3, 5], [4, 5]], bo = [[0, 15], [1, 15], [2, 15], [3, 15], [4, 15]];
      const pipDug = Math.floor(v.seg(t, 0.2, 3.2) * pip.length), boDug = Math.floor(v.seg(t, 0.4, 2.2) * bo.length);
      const open = (r, c2) => pip.slice(0, pipDug).some(([a, b]) => a === r && b === c2) || bo.slice(0, boDug).some(([a, b]) => a === r && b === c2);
      for (let r = 0; r < NR; r++) for (let k = 0; k < NC; k++) {
        const x = ox + k * C_, y = oy + r * C_, h = v.rand(r * 31 + k);
        if (open(r, k)) { c.fillStyle = '#120c0a'; c.fillRect(x, y, C_, C_); continue; }
        const rock = h > 0.88 || (r === 7 && (k === 7 || k === 10)) || (r === 8 && k > 6 && k < 11);
        c.fillStyle = rock ? '#5a5e66' : h > 0.6 ? '#6a4a30' : '#8a6040'; c.fillRect(x, y, C_ + 0.5, C_ + 0.5);
        if (!rock) { c.fillStyle = 'rgba(255,230,190,0.1)'; c.fillRect(x + h * 9, y + 4, 3, 2); }
      }
      // gems in the dirt
      const gems = [[3, 6, '#4fe8d6', 5], [4, 6, '#ffd56a', 6], [6, 3, '#ff9ec4', 4], [6, 13, '#8ef08a', 4], [2, 9, '#dff6ff', 4]];
      for (const [r, k, col, s] of gems) { if (k === 6 && r === 4 && t > 3.3) continue; pw39Gem(v, ox + (k + 0.5) * C_, oy + (r + 0.5) * C_, s, col); }
      if (t > 3.3 && t < 4.3) v.label('+3', ox + 6.5 * C_, oy + 3 * C_, 10, '#ffd56a');
      // the star gem in its rock pocket
      pw39Gem(v, ox + 9 * C_, oy + 7.5 * C_, 7, '#ffd56a', { star: true });
      // the boulder over Bo's shaft falls at 2.4
      const fall = v.ease.in(v.seg(t, 2.4, 2.9)), by = oy - 0.5 * C_ + fall * 4.6 * C_ + (t > 2.9 ? 0 : 0);
      c.fillStyle = '#8a847e'; v.circle(ox + 15.5 * C_, by + C_ / 2 + 1, 7.5); c.fill(); c.strokeStyle = '#4a4440'; c.lineWidth = 1.5; c.stroke();
      if (t < 2.4) { c.strokeStyle = 'rgba(255,220,180,0.3)'; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(ox + 15.5 * C_, oy + C_); c.lineTo(ox + 15.5 * C_, oy + 5 * C_); c.stroke(); c.setLineDash([]); }
      // the diggers
      const pk = pip[Math.max(0, pipDug - 1)], bk = bo[Math.max(0, boDug - 1)];
      v.hero(0, ox + (pk[1] + 0.5) * C_, oy + (pk[0] + 1) * C_, { s: 0.42, face: 1, mood: t > 3.3 && t < 4.3 ? 'joy' : 'grit' });
      const buried = t > 2.9;
      v.hero(1, ox + (bk[1] + 0.5) * C_, oy + (bk[0] + 1) * C_ + (buried ? 2 : 0), { s: 0.42, face: -1, mood: buried ? 'dizzy' : 'grit', sq: buried ? 0.3 : 0 });
      if (buried && t < 4.6) { v.puff(ox + 15.5 * C_, oy + 4.5 * C_, v.seg(t, 2.9, 3.6)); v.label('Buried!', ox + 14 * C_, oy + 3 * C_, 10, '#ffb0a0'); }
      // the points
      v.pill('Pip ◆ ' + (t > 3.3 ? 7 : 4), 50, 12, { size: 8, col: '#ff9a5a' });
      v.pill('Bo ◆ ' + (buried ? 2 : 5), v.W - 46, 12, { size: 8, col: '#7ab8ff' });
    },
  });
}
// ----- END 39-4 Gem Rush -----
