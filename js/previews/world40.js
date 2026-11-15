/* Pip & Bo - World page previews: World 40 Colossus March (40-1 The Iron Colossus). See js/previews/preview-core.js. */
'use strict';

/* 40-1 The Iron Colossus, drawn in the world's hand-drawn style (the sketch kit in js/levels/world40/sketch-kit.js).
   A 6 s loop of four quick scenes:
     0.0 - 2.2  Under the Feet: the whole Colossus strides across the page; tiny Pip and Bo run out from under a foot
                as its shadow grows, and it lands: THOOM
     2.2 - 3.8  The Fists: on its chest a fist slams down on a padlock (KLANG), and the lock bursts
     3.8 - 5.0  Inside: the two lift a glowing core between them
     5.0 - 6.0  Switched Off: the giant stands still and fades back to pencil
   The giant is three small sheets (body, leg, arm) made once with the iron helpers, blitted and swung. The boil
   comes from floor(t * 8) % 3, so the scene is a pure function of t. Every helper starts with pw40. */
const PW40_SCENES = [{ t0: 0, len: 2.2, name: 'Under the Feet' }, { t0: 2.2, len: 1.6, name: 'The Fists' }, { t0: 3.8, len: 1.2, name: 'Inside' }, { t0: 5.0, len: 1.0, name: 'Switched Off' }];
// the giant in preview pixels: sheets are drawn at 2x, blitted at GS
const PW40 = { GS: 0.21, LEG: 344, ARM_X: 78, ARM_Y: 118, A: 0.36, ground: 166 };

/* ---------- sheets ---------- */
function pw40Leg(far) {
  const key = 'pw40:leg:' + (far ? 1 : 0);
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 180, 380, d => {
    const P = IRON_P, H = IRON_ART.helpers, fill = far ? P.soot : P.iron;
    // the thigh, the knee drum, the flared shin, the foot (toe to the right); hip at (80, 28)
    const thigh = [[50, 30], [110, 30], [104, 170], [58, 170]];
    const shin = [[50, 196], [112, 196], [124, 318], [40, 318]];
    const foot = [[24, 316], [130, 312], [168, 336], [172, 372], [14, 372], [10, 340]];
    for (const pts of [thigh, shin, foot]) { d.solid(pts, { kind: 'sand' }); H.ironPlate(d, pts, { fill, fillAlpha: far ? 0.75 : 0.85, tone: x => 0.2 + (x - 40) / 140, rivetEdges: [0, 1], spacing: 14, rustPatches: 1, w: 2.6, scratch: 2 }); }
    d.solid(SKETCH.ell(80, 184, 34, 22, 16), { kind: 'sand' }); d.ellipse(80, 184, 34, 22, { fill: far ? P.soot : P.ironLight, w: 2.4 });
    d.rivets(56, 184, 104, 184, 4, { r: 2 });
    d.solid(SKETCH.ell(80, 30, 30, 24, 16), { kind: 'sand' }); d.ellipse(80, 30, 30, 24, { fill: fill, w: 2.4 });
    // toe plates and a heel spur
    d.stroke([[134, 314], [150, 372]], { w: 1.6 }); d.stroke([[100, 316], [108, 372]], { w: 1.4 });
    d.rivets(26, 362, 160, 362, 8, { r: 1.8, rust: 0.3 });
    if (far) d.wash([[10, 0], [180, 0], [180, 380], [10, 380]], P.soot, { alpha: 0.18, layers: 1, edge: false });
  }, { ox: 80, oy: 28 });
  return key;
}
function pw40Arm(far) {
  const key = 'pw40:arm:' + (far ? 1 : 0);
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 130, 330, d => {
    const P = IRON_P, H = IRON_ART.helpers, fill = far ? P.soot : P.iron;
    const upper = [[42, 26], [90, 26], [86, 150], [46, 150]], fore = [[40, 168], [92, 168], [96, 250], [36, 250]];
    for (const pts of [upper, fore]) { d.solid(pts, { kind: 'sand' }); H.ironPlate(d, pts, { fill, fillAlpha: 0.85, tone: x => 0.2 + (x - 36) / 70, rivetEdges: [0, 2], spacing: 14, rustPatches: 1, w: 2.4 }); }
    d.solid(SKETCH.ell(66, 160, 26, 18, 16), { kind: 'sand' }); d.ellipse(66, 160, 26, 18, { fill: far ? P.soot : P.ironLight, w: 2.2 });
    d.solid(SKETCH.ell(66, 26, 34, 28, 16), { kind: 'sand' }); d.ellipse(66, 26, 34, 28, { fill, w: 2.6 }); d.rivets(40, 22, 92, 22, 4, { r: 2 });
    // the fist: a block of knuckles
    const fist = [[24, 248], [108, 248], [116, 300], [100, 326], [30, 326], [16, 300]];
    d.solid(fist, { kind: 'sand' }); H.ironPlate(d, fist, { fill, fillAlpha: 0.9, tone: x => 0.25 + (x - 16) / 120, rivetEdges: [], w: 2.6, rustPatches: 1 });
    for (let k = 0; k < 4; k++) d.stroke([[30 + k * 22, 300], [36 + k * 22, 324]], { w: 1.4 });
    if (far) d.wash([[0, 0], [130, 0], [130, 330], [0, 330]], P.soot, { alpha: 0.18, layers: 1, edge: false });
  }, { ox: 66, oy: 26 });
  return key;
}
function pw40Body() {
  const key = 'pw40:body';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 400, 470, d => {
    const P = IRON_P, H = IRON_ART.helpers, cx = 200;
    // pelvis, waist, the barrel chest, shoulders; the lantern head on a short neck. Hips at (200, 440).
    const pelvis = [[120, 392], [280, 392], [292, 452], [108, 452]];
    const waist = [[136, 330], [264, 330], [276, 396], [124, 396]];
    const chest = [[40, 170], [120, 130], [280, 130], [360, 170], [330, 300], [270, 340], [130, 340], [70, 300]];
    for (const pts of [pelvis, waist]) { d.solid(pts, { kind: 'sand' }); H.ironPlate(d, pts, { fill: P.iron, fillAlpha: 0.85, tone: x => 0.25 + Math.abs(x - cx) / 200, rivetEdges: [0], spacing: 14, w: 2.6, rustPatches: 1 }); }
    d.solid(chest, { kind: 'sand', curve: true });
    H.ironPlate(d, chest, { fill: P.rust, fillAlpha: 0.8, tone: (x, y) => 0.15 + Math.abs(x - cx) / 240 + (y - 150) / 500, rivetEdges: [0, 1, 2, 3, 4], spacing: 16, w: 3, curve: true, rustPatches: 3, scratch: 5 });
    // chest seams, a hatch with the padlock, the stencilled number
    d.stroke([[cx, 136], [cx + 4, 334]], { w: 1.6 });
    for (const y of [190, 260]) { d.stroke([[70, y], [cx, y + 10], [330, y]], { w: 1.4, curve: true }); d.rivets(80, y + 6, 320, y + 6, 12, { r: 1.7, rust: 0.25 }); }
    const hatch = [[150, 200], [250, 200], [250, 290], [150, 290]];
    H.ironPlate(d, hatch, { fill: P.iron, fillAlpha: 0.9, tone: () => 0.5, rivetEdges: [0, 1, 2, 3], spacing: 12, w: 2.2, rustPatches: 1 });
    d.ellipse(cx, 246, 16, 18, { fill: P.core, w: 2 }); d.stroke([[cx, 240], [cx, 256]], { w: 2.4 });
    H.ironStencil(d, '40', 300, 230, 26, { rot: -0.08 });
    for (const sx of [-1, 1]) { d.solid(SKETCH.ell(cx + sx * 156, 168, 44, 38, 20), { kind: 'sand' }); d.ellipse(cx + sx * 156, 168, 44, 38, { fill: P.iron, w: 2.8 }); d.rivets(cx + sx * 156 - 30, 150, cx + sx * 156 + 30, 150, 4, { r: 1.8 }); }
    // the neck and the lantern head: a riveted box with lit windows and a little roof cap
    const neck = [[176, 96], [224, 96], [230, 134], [170, 134]];
    d.solid(neck, { kind: 'sand' }); H.ironPlate(d, neck, { fill: P.soot, fillAlpha: 0.8, tone: () => 0.6, rivetEdges: [], w: 2.2 });
    const head = [[140, 18], [260, 18], [270, 102], [130, 102]];
    d.solid(head, { kind: 'sand' });
    H.ironPlate(d, head, { fill: P.iron, fillAlpha: 0.85, tone: x => 0.2 + (x - 130) / 160, rivetEdges: [0, 2], spacing: 14, w: 2.8, rustPatches: 1 });
    for (const ex of [168, 232]) { d.shape([[ex - 18, 46], [ex + 18, 46], [ex + 18, 72], [ex - 18, 72]], { fill: P.coreHot, w: 2.2, corner: 30 }); d.stroke([[ex, 46], [ex, 72]], { w: 1.2 }); }
    d.shape([[150, 18], [cx, -2 + 6], [250, 18]], { fill: P.rustDark, w: 2.4, corner: 30 });
    d.stroke([[166, 86], [234, 86]], { w: 2 }); d.rivets(150, 34, 250, 34, 6, { r: 1.6 });
  }, { ox: 200, oy: 440 });
  return key;
}
// the desert page: paper, a pale sun, dunes and a hatched ground line (flat sheet, blitted at 0.5)
function pw40Desert() {
  const key = 'pw40:desert';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 640, 360, d => {
    const P = IRON_P;
    d.solid([[0, 0], [640, 0], [640, 360], [0, 360]], { kind: 'sand' });
    d.wash([[0, 0], [640, 0], [640, 220], [0, 220]], P.sky, { alpha: 0.45, layers: 2, spread: 2 });
    d.ellipse(520, 70, 34, 34, { fill: P.coreHot, w: 1.6 });
    const dune = (y0, amp, col, a) => { const pts = []; for (let x = -10; x <= 650; x += 30) pts.push([x, y0 + Math.sin(x * 0.012 + y0) * amp]); d.wash(pts.concat([[650, 360], [-10, 360]]), col, { alpha: a, layers: 2, spread: 1.5 }); d.stroke(pts, { w: 1.4, curve: true, alpha: 0.7 }); };
    dune(220, 10, P.dust, 0.55); dune(260, 8, P.ochre, 0.5); dune(330, 5, P.sand, 0.9);
    d.hatch([[0, 334], [640, 334], [640, 360], [0, 360]], { a: 20, gap: 3, w: 0.7, alpha: 0.5 });
    for (let k = 0; k < 6; k++) { const x = 40 + k * 110 + d.r() * 30; d.stroke([[x, 300], [x + 4, 290], [x + 8, 300]], { w: 1, alpha: 0.6 }); }
  }, { flat: true });
  return key;
}
function pw40Chest() {
  const key = 'pw40:chest';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 640, 360, d => {
    const P = IRON_P, H = IRON_ART.helpers;
    d.solid([[0, 0], [640, 0], [640, 360], [0, 360]], { kind: 'dusk' });
    d.wash([[0, 0], [640, 0], [640, 360], [0, 360]], P.dusk, { alpha: 0.5, layers: 2 });
    for (let k = 0; k < 3; k++) {
      const x0 = -20 + k * 230, pl = [[x0, -20], [x0 + 236, -20], [x0 + 236, 300], [x0, 300]];
      H.ironPlate(d, pl, { fill: P.rust, fillAlpha: 0.78, tone: (x, y) => 0.2 + (y + 20) / 500 + Math.abs(x - 320) / 900, rivetEdges: [0, 1, 3], spacing: 18, w: 3, rustPatches: 2, scratch: 4 });
    }
    // the ledge they stand on
    const ledge = [[-10, 290], [650, 290], [650, 360], [-10, 360]];
    H.ironPlate(d, ledge, { fill: P.soot, fillAlpha: 0.85, tone: () => 0.6, rivetEdges: [0], spacing: 16, w: 3, rustPatches: 1 });
  }, { flat: true });
  return key;
}
function pw40Inside() {
  const key = 'pw40:inside';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 640, 360, d => {
    const P = IRON_P, H = IRON_ART.helpers;
    d.solid([[0, 0], [640, 0], [640, 360], [0, 360]], { kind: 'dark' });
    // pipes, a big gear in the dark, a catwalk
    H.ironPipe(d, [[-10, 60], [200, 60], [240, 100], [660, 100]], 12, { col: P.iron });
    H.ironPipe(d, [[520, -10], [520, 300]], 14, { col: P.iron });
    for (const [gx, gy, r] of [[110, 190, 70], [430, 120, 50]]) {
      const pts = []; for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, rr = i % 2 ? r : r * 0.84; pts.push([gx + Math.cos(a) * rr, gy + Math.sin(a) * rr]); }
      d.shape(pts, { fill: P.iron, w: 2.2, corner: 20 }); d.ellipse(gx, gy, r * 0.3, r * 0.3, { fill: P.soot, w: 1.8 });
    }
    const walk = [[-10, 300], [650, 300], [650, 360], [-10, 360]];
    H.ironPlate(d, walk, { fill: P.iron, fillAlpha: 0.8, tone: () => 0.5, rivetEdges: [0], spacing: 16, w: 2.6 });
  }, { flat: true, paper: 'dark' });
  return key;
}

/* ---------- drawing ---------- */
// the whole giant, hips at (x, ground - leg), with leg swings a (near) and b (far) in radians
function pw40Giant(v, x, ground, a, b, t, o = {}) {
  const ctx = v.ctx, G = PW40, s = G.GS * (o.s || 1), L = G.LEG * s, hy = ground - L * Math.max(Math.cos(a), Math.cos(b)) - (o.lift || 0), u = o.undo || 0;
  const bl = (key, x1, y1, rot, sy) => SKETCH.blit(ctx, key, x1, y1, { sx: s, sy: s * (sy || 1), rot, t, undo: u });
  // far side first: arm and leg
  bl(pw40Arm(true), x - G.ARM_X * s * 0.7, hy - G.ARM_Y * s, -b * 0.8);
  bl(pw40Leg(true), x - 10 * s, hy, -b, o.swingB || 1);
  bl(pw40Body(), x, hy);
  bl(pw40Leg(false), x + 12 * s, hy, -a, o.swingA || 1);
  bl(pw40Arm(false), x + G.ARM_X * s, hy - G.ARM_Y * s, -a * 0.8);
  return hy;
}
// a hatched shadow on the ground that grows as a foot comes down
function pw40Shadow(v, d, x, y, k) {
  if (k <= 0) return;
  const rx = 10 + k * 24, ry = 2 + k * 4;
  v.ctx.fillStyle = `rgba(58,42,32,${0.12 + k * 0.25})`; v.ctx.beginPath(); v.ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); v.ctx.fill();
  d.hatch(SKETCH.ell(x, y, rx, ry, 14), { a: 10, gap: 2.2, w: 0.6, force: true, alpha: 0.5 + k * 0.3 });
}
function pw40Word(v, d, text, x, y, size, k) {
  if (k <= 0) return;
  const s = 0.6 + 0.4 * v.ease.back(Math.min(1, k * 2.5));
  d.word(text, x, y, size * s, { fill: IRON_P.coreHot, col: SKETCH.INK, w: size * 0.14, align: 'center', rot: -0.08, bounce: 0.1 });
}
function pw40Dust(v, d, x, y, k) {
  if (k <= 0 || k >= 1) return;
  for (const sx of [-1, 1]) d.cloud(x + sx * (14 + k * 26), y - 4 - k * 6, 7 + k * 6, { fill: IRON_P.dust, puffs: 6 });
}

/* ---------- 1: under the feet ---------- */
function pw40Feet(v, e, t, d) {
  const ctx = v.ctx, G = PW40, gy = G.ground, k = v.seg(e, 0, 1.9), sw = v.ease.inOut(k);
  SKETCH.blit(ctx, pw40Desert(), 0, 0, { sx: 0.5, sy: 0.5, t });
  // the planted far foot stays put; the near foot swings from behind to in front and lands at k = 1
  const a = -G.A + 2 * G.A * sw, b = G.A - 2 * G.A * sw, L = G.LEG * G.GS, footX = 70;
  const hipX = footX - L * Math.sin(b) + 10 * G.GS, hipEnd = footX + L * Math.sin(G.A) + 10 * G.GS;
  const landX = hipEnd + 12 * G.GS + L * Math.sin(G.A);
  pw40Shadow(v, d, landX, gy + 1, Math.min(1, k * 1.15));
  pw40Giant(v, hipX, gy, a, b, t, { swingA: 1 - Math.sin(Math.PI * k) * 0.14 });
  // the heroes run out from under it, just in time
  const run = v.seg(e, 0.1, 1.7), hx = v.lerp(landX - 18, landX + 74, v.ease.out(run));
  const bob = i => v.hop(v.phase(e, 0.32, i * 0.16), 3);
  v.hero(1, hx - 14, gy + bob(1), { s: 0.6, face: 1, mood: k > 0.6 ? 'wow' : 'grit', outfit: 'ironchase' });
  v.hero(0, hx + 4, gy + bob(0), { s: 0.6, face: 1, mood: k > 0.6 ? 'wow' : 'grit', outfit: 'ironchase' });
  if (k >= 1) { pw40Dust(v, d, landX, gy, v.seg(e, 1.9, 2.2)); pw40Word(v, d, 'THOOM!', landX + 30, 120, 20, v.seg(e, 1.9, 2.05)); }
}

/* ---------- 2: the fists ---------- */
function pw40Fists(v, e, t, d) {
  const ctx = v.ctx, gy = 145;
  SKETCH.blit(ctx, pw40Chest(), 0, 0, { sx: 0.5, sy: 0.5, t });
  const hit = 0.75, down = v.seg(e, 0.35, hit), shake = e > hit && e < hit + 0.2 ? Math.sin(e * 90) * 2 : 0;
  ctx.save(); ctx.translate(shake, 0);
  // the padlock: whole, then burst and tumbling
  if (e < hit) SKETCH.blit(ctx, IRON_ART.padlock(0), 160, gy, { sx: 0.5, sy: 0.5, t });
  else { const f = v.seg(e, hit, hit + 0.8); SKETCH.blit(ctx, IRON_ART.padlock(2), 160 + f * 30, gy + v.hop(f, 26) + f * 4, { sx: 0.5, sy: 0.5, rot: f * 1.4, t }); }
  // the fist winds up high, then slams
  const fy = e < 0.35 ? v.lerp(-40, -60, v.seg(e, 0, 0.35)) : v.lerp(-60, gy - 74, v.ease.in(down));
  const fistY = e < hit ? fy : gy - 74 - v.seg(e, hit + 0.3, 1.5) * 90;
  SKETCH.blit(ctx, IRON_ART.fist(1), 120, fistY, { sx: 0.66, sy: 0.66, t });
  if (e < hit && down > 0.2) d.speed(160, fistY + 10, 0, -1, 4, { len: 22 });
  ctx.restore();
  // the heroes: one each side, then cheering
  const won = e > hit + 0.15;
  v.hero(0, 66, gy + (won ? v.hop(v.phase(e, 0.4), 8) : 0), { s: 0.7, face: 1, mood: won ? 'joy' : 'wow', outfit: 'ironrig' });
  v.hero(1, 258, gy + (won ? v.hop(v.phase(e, 0.4, 0.2), 8) : 0), { s: 0.7, face: -1, mood: won ? 'joy' : 'wow', outfit: 'ironrig' });
  if (e > hit) { pw40Word(v, d, 'KLANG!', 166, 52, 26, v.seg(e, hit, hit + 0.15)); v.sparkle(160, gy - 30, v.seg(e, hit, hit + 0.5), '#ffe58a', 22); }
}

/* ---------- 3: inside, the core ---------- */
function pw40Core(v, e, t, d) {
  const ctx = v.ctx, gy = 150;
  SKETCH.blit(ctx, pw40Inside(), 0, 0, { sx: 0.5, sy: 0.5, t });
  const lift = v.ease.inOut(v.seg(e, 0.15, 0.8)), cy = gy - 34 - lift * 22, pulse = 0.85 + Math.sin(t * 9) * 0.15;
  SKETCH.glow(ctx, 160, cy, 70 * pulse, '255,214,90', 0.6);
  // the core: a caged glowing ball held between them
  d.ellipse(160, cy, 19, 19, { fill: IRON_P.coreHot, col: SKETCH.CHALK, w: 1.8 });
  ctx.fillStyle = 'rgba(255,248,214,0.85)'; ctx.beginPath(); ctx.arc(155, cy - 5, 6, 0, Math.PI * 2); ctx.fill();
  for (const a of [-0.6, 0, 0.6]) d.stroke([[160 + Math.sin(a) * 19, cy - Math.cos(a) * 19], [160 + Math.sin(a) * 19, cy + Math.cos(a) * 19]], { w: 1, col: SKETCH.CHALK, curve: false, alpha: 0.7 });
  const arms = lift > 0.05;
  v.hero(0, 128, gy - (arms ? lift * 6 : 0), { s: 0.75, face: 1, mood: lift < 1 ? 'grit' : 'joy', outfit: 'ironcrew' });
  v.hero(1, 192, gy - (arms ? lift * 6 : 0), { s: 0.75, face: -1, mood: lift < 1 ? 'grit' : 'joy', outfit: 'ironcrew' });
  d.stroke([[138, gy - 14 - lift * 6], [143, cy + 8]], { w: 2.2, col: SKETCH.CHALK }); d.stroke([[182, gy - 14 - lift * 6], [177, cy + 8]], { w: 2.2, col: SKETCH.CHALK });
  if (lift >= 1) v.sparkle(160, cy, v.phase(t, 0.6), '#fff3c0', 26);
}

/* ---------- 4: switched off: back to pencil ---------- */
function pw40Off(v, e, t, d) {
  const ctx = v.ctx, gy = PW40.ground;
  SKETCH.blit(ctx, pw40Desert(), 0, 0, { sx: 0.5, sy: 0.5, t });
  const u = v.seg(e, 0.1, 0.85) * 2.3;
  pw40Giant(v, 150, gy, 0.04, -0.04, t, { undo: u, lift: -4 });
  v.hero(0, 214, gy + v.hop(v.phase(e, 0.45), 7), { s: 0.62, face: -1, mood: 'joy', outfit: 'ironcrew' });
  v.hero(1, 236, gy + v.hop(v.phase(e, 0.45, 0.22), 7), { s: 0.62, face: -1, mood: 'joy', outfit: 'ironcrew' });
}

function pw40Scene(v, t) {
  const ctx = v.ctx, si = t < 2.2 ? 0 : t < 3.8 ? 1 : t < 5.0 ? 2 : 3, sc = PW40_SCENES[si], e = t - sc.t0;
  const bv = (typeof reduceMotion !== 'undefined' && reduceMotion) ? 0 : Math.floor(t * 8) % 3, d = SKETCH.live(ctx, 4040 + si * 13 + bv, bv);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, v.W, v.H); ctx.clip();
  [pw40Feet, pw40Fists, pw40Core, pw40Off][si](v, e, t, d);
  // the part's name, bottom left (the menus put their badges on the top corners)
  const tw = 12 + sc.name.length * 5;
  ctx.fillStyle = 'rgba(40,34,30,0.8)'; v.rr(6, 159, tw, 16, 8); ctx.fill();
  v.text(sc.name, 12, 167.5, 9, '#fff', 'left', true);
  const f = Math.max(1 - v.seg(e, 0, 0.14), v.seg(e, sc.len - 0.12, sc.len));
  if (f > 0) { ctx.fillStyle = `rgba(242,230,204,${f * 0.9})`; ctx.fillRect(0, 0, v.W, v.H); }
  ctx.restore();
}

definePreview('The Iron Colossus', {
  blurb: 'Chase, climb and switch off a walking iron giant. The boss of worlds 31 to 40.',
  loop: 6, still: 1.0,
  draw(v, t) { pw40Scene(v, t); },
});
