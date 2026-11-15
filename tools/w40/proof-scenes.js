/* World 40 Round 0 style proof: two finished screens drawn with the real sketch kit and art sheets.
   Injected by tools/w40/proof.js (or look.js). window.W40SCENE picks 'chase' or 'boiler'. */
'use strict';
(() => {
  const P = SKETCH.PAL;
  const G = window.__pipbo.G;
  const hero = (id, x, y, o = {}) => {
    const p = Object.assign({}, G.players[id], { x: x - PW / 2, y: y - PH, vx: o.vx || 0, vy: o.vy || 0, face: o.face || 1, sx: o.sx || 1, sy: o.sy || 1, stun: 0, blink: 0, alive: true });
    SKETCH.hero(window.W40CTX, p, { dark: o.dark, mood: o.mood });
  };

  /* ---------- Part 1: the foot coming down beside Pip and Bo on Pyramid Sands ---------- */
  function chase(g) {
    const t = SKETCH.t, gy = IRON_ART.GROUND_Y;
    SKETCH.paper(g, 'sand');
    if (G.mst) G.mst.outfit = 'ironchase';
    for (let l = 0; l < 4; l++) SKETCH.blit(g, IRON_ART.desert(l, 0), 0, 0);
    IRON_ART.foot(); IRON_ART.shin();
    // the stomp: the foot hangs 78 px over the sand, 0.25 s before it lands
    const fx = 668, sole = 376, tell = 0.8;
    const d = SKETCH.live(g, 300, SKETCH.boil());
    // its shadow on the sand, cross-hatched, darkest in the middle (drawn, not blended)
    const shL = fx - 380 + 10, shR = fx + 380;
    const shadow = SKETCH.ell((shL + shR) / 2, gy + 5, (shR - shL) / 2, 9 + tell * 5, 40);
    d.wash(shadow, P.ochreDeep, { alpha: 0.55, off: 1, force: true });
    d.hatch(shadow, { a: 4, gap: 2.2 - tell, w: 0.9, alpha: 0.9, force: true, cross: true, crossA: 64, crossGap: 2.4, crossTone: (x) => 1.25 - Math.abs(x - (shL + shR) / 2) / ((shR - shL) / 2) * 1.1 });
    d.spot(SKETCH.ell((shL + shR) / 2 + 20, gy + 5, (shR - shL) / 2 * 0.72, 3.5, 30), { force: true, alpha: 0.7 });
    d.stroke([[shL, gy + 3], [shL + 40, gy - 2], [shR - 40, gy - 2], [shR, gy + 4]], { w: 1.2, curve: true, alpha: 0.55 });
    // the shin above, then the foot (a hair tilted: the heel comes down first)
    SKETCH.blit(g, "iron:shin", fx - 380 + 196, sole - 320 + 14, { rot: -0.025 });
    SKETCH.blit(g, 'iron:foot', fx, sole, { rot: -0.025 });
    // speed lines over its top edge: it is coming down fast
    d.speed(fx + 250, sole - 150, 0, -70, 6, { spread: 120, w: 1.3 });
    d.speed(fx - 300, sole - 250, 0, -80, 4, { spread: 60, w: 1.2 });
    // sand and stones raining off the sole
    const R = SKETCH.rng(9);
    for (let i = 0; i < 70; i++) {
      const x = fx - 330 + R() * 680, fall = ((t * 0.9 + R()) % 1), y = sole + 4 + fall * (gy - sole - 4);
      const big = R() < 0.18;
      g.fillStyle = big ? 'rgba(70,46,26,0.85)' : 'rgba(120,88,48,0.7)';
      g.beginPath(); g.ellipse(x, y, big ? 2.4 : 0.9, big ? 2 : 1.6 + R(), R() * 3, 0, 6.3); g.fill();
    }
    for (const sx of [fx - 120, fx + 40, fx + 210]) d.stroke([[sx, sole + 2], [sx + 1, sole + 26], [sx - 1, sole + 52]], { w: 2.4, p: [1, 0.6, 0.05], curve: true, col: '#9c7a46', alpha: 0.75, sh: 0, brk: 1 });
    // the tell: "THOO..." growing on the sand under it
    d.word('THOO...', fx - 40, gy + 48, 20 + tell * 14, { rot: -0.05, fill: P.ochre, w: 2.8, align: 'center' });
    // the heel chain: from its eye bolt down to the sand and dragging back along it
    const eye = [fx - 380 + 28, sole - 320 + 286 + 3];
    IRON_ART.helpers.ironChain(d, [eye, [eye[0] - 14, eye[1] + 40], [eye[0] - 34, gy - 2], [eye[0] - 90, gy + 1], [eye[0] - 150, gy - 1]], { link: 13, w: 1.6 });
    d.cloud(eye[0] - 156, gy - 6, 12, { fill: P.dust, puffs: 5, flat: true, w: 1.2 });
    // behind them: the last footfall's dust settling at the left edge and its ground wave rolling toward them
    d.cloud(44, gy - 20, 34, { fill: P.dust, puffs: 7, w: 1.7, curls: 2 });
    d.cloud(96, gy - 8, 20, { fill: P.dust, puffs: 6, w: 1.4, flat: true });
    const wx = 168;
    d.wash([[wx - 40, gy + 1], [wx - 14, gy - 9], [wx + 8, gy - 13], [wx + 30, gy - 4], [wx + 48, gy + 1]], P.sand, { alpha: 0.9, off: 0.5 });
    d.stroke([[wx - 44, gy + 1], [wx - 14, gy - 10], [wx + 8, gy - 14], [wx + 30, gy - 5], [wx + 50, gy + 1]], { w: 2, curve: true });
    d.stroke([[wx - 20, gy - 4], [wx + 4, gy - 8], [wx + 22, gy - 3]], { w: 0.9, curve: true, sh: 0 });
    for (let i = 0; i < 8; i++) { const a = -2.2 + i * 0.22; d.stroke([[wx + 8 + Math.cos(a) * 18, gy - 14 + Math.sin(a) * 8], [wx + 8 + Math.cos(a) * 26, gy - 14 + Math.sin(a) * 14]], { w: 1, sh: 0, alpha: 0.7 }); }
    // the heroes: Bo rides the wave (a Wave hop), Pip runs out from under the shadow
    hero(1, 196, gy - 40, { vx: 200, vy: -200, face: 1, sx: 0.95, sy: 1.06 });
    d.speed(170, gy - 52, -40, 6, 4, { spread: 16, w: 1 });
    hero(0, 262, gy, { vx: -200, face: -1 });
    d.speed(285, gy - 13, 30, 0, 3, { spread: 14, w: 1 });
    d.cloud(282, gy - 4, 6, { fill: P.dust, puffs: 4, w: 1, curls: 0, flat: true });
    // the HUD
    IRON_HUD.draw(g, { part: 0, cores: 0, time: 72.4, clangs: 2, rivets: 4, rivetsMax: 60 });
    SKETCH.edge(g, 'sand');
  }

  /* ---------- Part 4: inside the boiler, the holder keeps the jets shut while the dasher runs ---------- */
  function boiler(g) {
    const t = SKETCH.t, gy = IRON_ART.GROUND_Y;
    SKETCH.paper(g, 'dark');
    if (G.mst) G.mst.outfit = 'ironcrew';
    SKETCH.blit(g, IRON_ART.boilerWall(0), 0, 0);
    SKETCH.blit(g, IRON_ART.porthole('hollow'), 150, 186);
    SKETCH.blit(g, IRON_ART.furnace(), 560, 268);
    IRON_ART.flames(g, 560, 268, 70, t);
    SKETCH.blit(g, IRON_ART.boilerFloor(), 0, 0);
    const d = SKETCH.live(g, 400, SKETCH.boil()); d.dark = true;
    // the jets: two shut (a drip and a wisp), one live at the right, an alcove (safe) between
    for (const [x, on] of [[420, 0], [520, 0], [790, 1]]) {
      SKETCH.blit(g, IRON_ART.nozzle(), x, 120);
      if (on) IRON_ART.steam(d, x, 122, gy, 1, t);
      else { d.cloud(x + 3, 132, 5, { fill: '#9a948a', fillAlpha: 0.3, puffs: 4, w: 0.9, curls: 0, col: '#efe8d8', alpha: 0.6 }); d.stroke([[x, 128], [x + 0.5, 136]], { w: 1.4, col: '#cfe0e8', sh: 0 }); }
      // the jet's floor vent, marked with chalk hazard stripes
      d.shape([[x - 22, gy - 1], [x + 22, gy - 1], [x + 22, gy + 4], [x - 22, gy + 4]], { w: 1, corner: 30, ink: true });
      for (let k = -2; k <= 2; k++) d.line(x + k * 8 - 2, gy + 4, x + k * 8 + 3, gy - 1, { w: 1.4, col: IRON_P.core, ov: 0 });
    }
    // the alcove: a chalk arch drawn on the wall with an arrow, painted SAFE
    const ax = 710;
    d.stroke([[ax - 30, gy], [ax - 30, gy - 60], [ax, gy - 84], [ax + 30, gy - 60], [ax + 30, gy]], { w: 2.4, curve: true, col: '#efe8d8' });
    d.hatch([[ax - 26, gy], [ax - 26, gy - 58], [ax, gy - 80], [ax + 26, gy - 58], [ax + 26, gy]], { a: 60, gap: 3, w: 0.6, force: true, alpha: 0.35, col: '#efe8d8' });
    d.word('SAFE', ax, gy - 98, 13, { align: 'center', col: IRON_P.core, w: 2 });
    // the holder's valve and the pressure dial (needle at 70%: nearly red)
    SKETCH.blit(g, IRON_ART.valveStand(), 232, gy);
    SKETCH.blit(g, IRON_ART.valve(), 232, gy - 98, { rot: t * 1.2 });
    IRON_ART.dial(g, 286, gy - 82, 19, 0.7);
    d.word('TSSS', 300, gy - 120, 11, { col: '#efe8d8', rot: -0.15, w: 1.4 });
    // coal sifting down from the chute
    const R = SKETCH.rng(4);
    for (let i = 0; i < 9; i++) {
      const f = (t * 0.7 + i / 9 + R() * 0.05) % 1, x = 728 + R() * 26 + f * 6, y = 44 + f * 70, s2 = 3.5 + R() * 3, rt = R() * 6;
      const ch = [0, 1, 2, 3, 4].map(k => { const a = rt + k * 1.26, rr = s2 * (0.7 + R() * 0.45); return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]; });
      g.fillStyle = '#17120f'; g.beginPath(); ch.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
      d.outline(ch, { w: 0.8, col: '#efe8d8', alpha: 0.75 });
      d.stroke([ch[3], ch[4], ch[0]], { w: 1.1, col: '#f2b25a', alpha: 0.55, sh: 0 });
    }
    d.speed(740, 44, 0, 40, 3, { spread: 24, w: 0.8, col: '#efe8d8', alpha: 0.4 });
    // the fire's light pooled on the grating in front of the furnace
    g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(232,138,44,0.22)'; g.beginPath(); SKETCH.ell(560, gy + 8, 150, 12, 30).forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.fill(); g.restore();
    for (let k = 0; k < 14; k++) { const x = 440 + k * 18; d.stroke([[x, gy + 3], [x + 8, gy + 3]], { w: 1.4, col: '#f2b25a', alpha: 0.7, sh: 0 }); }
    // the heroes: Bo holds the valve, Pip dashes between the jets toward the alcove
    hero(1, 214, gy, { face: 1, dark: true });
    hero(0, 640, gy, { face: 1, vx: 220, dark: true });
    d.speed(610, gy - 14, -36, 0, 4, { spread: 18, w: 1.1, col: '#efe8d8' });
    // a chalk speech bubble from Pip, hint chip over Bo
    const bub = [[580, 356], [664, 352], [668, 380], [644, 382], [636, 394], [632, 382], [584, 384]];
    g.fillStyle = '#f6ecd4'; g.beginPath(); SKETCH.spline(bub, true, 3).forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.fill();
    SKETCH.live(g, 401).outline(bub, { curve: true, w: 1.6, col: SKETCH.INK });
    SKETCH.live(g, 402).word('WAIT!', 624, 368, 15, { align: 'center', col: SKETCH.INK, w: 2 });
    IRON_HUD.pill(g, 186, gy - 66, 'HOLD F', { size: 11, kind: 'h' });
    IRON_HUD.draw(g, { part: 3, cores: 0, time: 412, clangs: 5, rivets: 31, rivetsMax: 60, dark: true });
    SKETCH.edge(g, 'dark');
  }
  window.W40BOILER = boiler;
  window.W40LOOK = g => { window.W40CTX = g; (window.W40SCENE === 'boiler' ? window.W40BOILER : chase)(g); };
})();
