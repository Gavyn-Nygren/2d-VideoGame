/* Pip & Bo - World 40 Colossus March: the level HUD, drawn in the sketch kit (inked paper pills, hand lettering). */
'use strict';

/* IRON_HUD.draw(g, s): s = { part (0..7), parts (8), cores (0..3), time (seconds), clangs, rivets, rivetsMax, title,
   fade: [0..1 per corner, for a hero under it], dark (charcoal paper) }. Readability first: cream pills with an ink
   line, big stroke lettering. Pills are cached per text (SKETCH sheets) so the HUD costs a few blits a frame. */
const IRON_HUD = {};
// an inked paper pill with text, cached by its text
IRON_HUD.pill = (g, x, y, text, o = {}) => {
  const size = o.size || 15, pad = o.pad || 10, tw = SKETCH.wordWidth(text, size), w = tw + pad * 2 + (o.extraW || 0), h = size + 14;
  const key = 'iron:hud:' + (o.kind || 'p') + ':' + text + ':' + size + ':' + (o.col || '');
  SKETCH.sheet(key, w + 8, h + 8, d => {
    const box = [[4, 6], [w * 0.5, 4.5], [w + 3, 6], [w + 4.5, h * 0.5 + 4], [w + 3, h + 3], [w * 0.5, h + 4.2], [5, h + 3], [3.5, h * 0.5 + 4]];
    const gg = d.ctx('wash'); gg.fillStyle = o.bg || '#f6ecd4'; gg.globalAlpha = 0.94; gg.beginPath(); SKETCH.spline(box, true, 3).forEach((p, i) => (i ? gg.lineTo(p[0], p[1]) : gg.moveTo(p[0], p[1]))); gg.fill(); gg.globalAlpha = 1;
    d.outline(box, { curve: true, w: 1.8, c: [w / 2 + 4, h / 2 + 4], strokes: 2 });
    d.hatch([[w * 0.6, h + 3], [w + 3, h + 2], [w + 4, h * 0.6]], { a: 50, gap: 2, w: 0.5, force: true, alpha: 0.5 });
    d.word(text, 4 + pad + (o.extraW || 0), h / 2 + 4.5, size, { w: Math.max(1.6, size * 0.14), col: o.col, jit: 0.3, bounce: 0.04 });
  }, { versions: 3, seed: 900 + text.length });
  SKETCH.blit(g, key, o.align === 'right' ? x - w - 8 : x, y, { alpha: o.alpha });
  return w + 8;
};
IRON_HUD.draw = (g, s) => {
  const fadeL = s.fade ? s.fade[0] : 1, fadeR = s.fade ? s.fade[1] : 1;
  // left: the world's strip, part pips and core sockets
  const w = IRON_HUD.pill(g, 12, 8, 'COLOSSUS MARCH', { size: 15, alpha: fadeL, extraW: 0 });
  const d = SKETCH.live(g, 77, SKETCH.boil());
  g.save(); g.globalAlpha = fadeL;
  for (let i = 0; i < (s.parts || 8); i++) {
    const x = 26 + i * 17, y = 52;
    const done = i < s.part, cur = i === s.part;
    g.fillStyle = done ? '#7c6152' : cur ? '#f4c63c' : 'rgba(246,236,212,0.92)';
    g.beginPath(); SKETCH.ell(x, y, 6, 6, 10).forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.fill();
    d.stroke(SKETCH.ell(x, y, 6, 6, 12, 0, -0.5, 5.6), { w: cur ? 2 : 1.4, curve: true, c: [x, y], col: s.dark ? '#f6ecd4' : SKETCH.INK });
    if (done) d.stroke([[x - 2.5, y], [x - 0.5, y + 2.5], [x + 3, y - 3]], { w: 1.4, col: '#f6ecd4' });
  }
  for (let i = 0; i < 3; i++) {
    const x = 178 + i * 22, y = 52, full = i < (s.cores || 0);
    g.fillStyle = full ? '#f4c63c' : 'rgba(40,34,30,0.75)';
    g.beginPath(); SKETCH.ell(x, y, 8, 8, 12).forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.fill();
    d.stroke(SKETCH.ell(x, y, 8, 8, 14, 0, -0.3, 6), { w: 1.6, curve: true, c: [x, y], col: s.dark ? '#f6ecd4' : SKETCH.INK });
    d.stroke(SKETCH.ell(x, y, 4, 4, 10, 0, 0, 5.8), { w: 0.8, curve: true, col: full ? SKETCH.INK : '#f6ecd4', sh: 0 });
  }
  g.restore();
  // right: time, Clangs, rivets: cached paper pills by size, the numbers lettered live (they change every second)
  const t = s.time || 0, m = Math.floor(t / 60), sec = Math.floor(t % 60);
  const tw = IRON_HUD.live(g, 948, 8, m + ':' + (sec < 10 ? '0' : '') + sec, 17, { align: 'right', alpha: fadeR });
  IRON_HUD.live(g, 948 - tw - 4, 8, 'CLANGS ' + (s.clangs || 0), 13, { align: 'right', alpha: fadeR });
  if (!s.versus) IRON_HUD.live(g, 948, 44, 'RIVETS ' + (s.rivets || 0) + '/' + (s.rivetsMax || 60), 12, { align: 'right', alpha: fadeR, col: '#6e4a12' });
  void w;
};
// a pill whose text changes: the paper is a cached blank (by width), the letters are drawn live
IRON_HUD.live = (g, x, y, text, size, o = {}) => {
  const pad = 10, tw = SKETCH.wordWidth(text, size), w = Math.ceil((tw + pad * 2) / 6) * 6, h = size + 14;
  const key = 'iron:hud:blank:' + w + ':' + size;
  if (!SKETCH.has(key)) SKETCH.sheet(key, w + 8, h + 8, d => {
    const box = [[4, 6], [w * 0.5, 4.5], [w + 3, 6], [w + 4.5, h * 0.5 + 4], [w + 3, h + 3], [w * 0.5, h + 4.2], [5, h + 3], [3.5, h * 0.5 + 4]];
    const gg = d.ctx('wash'); gg.fillStyle = '#f6ecd4'; gg.globalAlpha = 0.94; gg.beginPath(); SKETCH.spline(box, true, 3).forEach((p, i) => (i ? gg.lineTo(p[0], p[1]) : gg.moveTo(p[0], p[1]))); gg.fill(); gg.globalAlpha = 1;
    d.outline(box, { curve: true, w: 1.8, c: [w / 2 + 4, h / 2 + 4], strokes: 2 });
    d.hatch([[w * 0.6, h + 3], [w + 3, h + 2], [w + 4, h * 0.6]], { a: 50, gap: 2, w: 0.5, force: true, alpha: 0.5 });
  }, { versions: 3, seed: 950 + w });
  const x0 = o.align === 'right' ? x - w - 8 : x;
  SKETCH.blit(g, key, x0, y, { alpha: o.alpha });
  g.save(); if (o.alpha != null) g.globalAlpha *= o.alpha;
  SKETCH.live(g, 960 + text.length, SKETCH.boil()).word(text, x0 + 4 + (w - tw) / 2, y + h / 2 + 4.5, size, { w: Math.max(1.6, size * 0.14), col: o.col, jit: 0.3, bounce: 0.04 });
  g.restore();
  return w + 8;
};
