/* Pip & Bo - World 37 Medieval Tournament: shared helpers for the four tournament levels (loads before them). */
'use strict';

/* The only global here is TOURNEY. The King's Grand Tournament: striped pavilions, pennants snapping in the wind, a tilt
   yard with packed stands, a market town outside the walls and a rival baron's castle on the hill. Pip and Bo are squires
   who end up doing everything the knights should have done. Not a toddler world (Gavyn): the carriage really is out of
   control, lances splinter, the castle rains fire arrows and boulders. Nobody gets hurt on screen: a failure is a tumble
   into hay, a dunk, a dented helmet with stars, or a restart of the stretch. Bright heraldic colours outdoors (World 7
   Castle Quest is a storybook castle inside, with cannons; there are no cannons in this world).
   The players-and-keys, effects and HUD helpers are World 31's SHRUNK kit (same names, same arguments: its header is the
   manual for those), so this file loads after js/levels/world31/shrunk-kit.js. Pip and Bo's level outfits are drawn by
   TOURNEY_OUTFITS (js/levels/world37/tourney-outfits.js, loads first), through K.squire below.
   Nothing here touches the rules of a level and nothing keeps state between levels (state lives in G.mst).
   Usual start of a level file:   (() => { const K = TOURNEY; ... TOURNEY.defs.<mode> = {...}; })();

   From SHRUNK: K.FONT, K.lerp, K.smooth, K.hash, K.mmss, K.stubMap, K.BREAK, K.quiet, K.key, K.track, K.both, K.idle,
     K.actLabels, K.hide, K.unhide, K.place, K.fx, K.pop, K.part, K.spark, K.confetti, K.dust, K.poof, K.hint,
     K.hintOnce, K.msg, K.tickFx, K.star, K.drawParts, K.drawPops, K.chip, K.panel, K.meter, K.medal, K.helpLine,
     K.drawMsg, K.prompter, K.hero.
   K.goldHelp(st, text, life)          the gold-help banner (plays tourneyHelp, counts st.stats.helps).
   Pip and Bo
     K.squire(id, x, y, o)             Pip or Bo in a level outfit, feet at x, y. o.outfit is 'livery' | 'borrowed' |
                                       'engineer' | 'champion'; every other o key is TOURNEY_OUTFITS.draw's (s, face, v,
                                       rot, sq, arms, prop, straw, askew, visor, soot, dent, arrows, wobble, helmOff,
                                       backwards, laurel, dizzy) plus stun (the engine's dizzy face).
   Horses, lances, shields
     K.horse(x, y, o)                  a horse side-on, hooves at y, with a real gallop cycle. o: face (1 right), s,
                                       phase (the gallop cycle in turns: add speed * dt * 2.2 each tick), speed 0..1
                                       (0 stands, 0.5 canters, 1 gallops: stride and body bob), duck 0..1 (head down),
                                       cap [col, col2] (a caparison cloth split in two colours, or one), capTrim, coat,
                                       mane, gold (gold reins and harness), harness (a collar and traces for a coach
                                       horse), jump 0..1 (legs tucked). Returns { saddle: {x, y}, rump: {x, y},
                                       head: {x, y} } in the same space, for riders and reins.
     K.lance(x, y, ang, len, o)        a striped tournament lance from its grip at x, y along ang (radians). o: cols
                                       [a, b], gold, splinter 0..1 (the tip end bursts into pieces), vamp (the hand
                                       guard, default true), w (thickness at the grip, 6).
     K.heraldShield(x, y, r, o)        a heater shield face-on, centre at x, y, r = half width. o: col, col2 (a
                                       per-pale split), charge 'sun' 'moon' 'lion' 'star' 'cross' 'chevron' 'tower'
                                       'crown' or none, chargeCol, rot.
   Scenery (no transform; cx is the camera x for parallax)
     K.sky(cx, t, o)                   full screen: a bright tournament sky with fat clouds. o.dusk, o.night (stars,
                                       a moon), o.grey 0..1.
     K.hills(cx, o)                    two layers of green hills. o: base (y of their feet, 330), castle (true: the
                                       rival baron's castle on the far hill, with its banner), par, dim 0..1.
     K.pavilions(cx, y, o)             a row of striped pavilions with pennants on their poles. o: par (0.35), s, n.
     K.pennants(x0, x1, y, t, o)       a rope of triangular pennants sagging between x0 and x1, flapping. o: sag,
                                       cols, wind 0..1, gust (a pull to one side, -1..1).
     K.crowd(x0, x1, y, t, o)          a crowd stand: timber tiers with heads. o: rows (3), mood 'idle' | 'cheer' |
                                       'gasp' | 'wave', seed, roof (a striped awning), royal (a royal box in the middle).
     K.hay(x, y, s)                    a hay bale, bottom middle at x, y.
     K.herald(x, y, t, o)              the herald with a trumpet and a banner, feet at x, y. o.blow 0..1, face, s.
     K.timber(x, y, w, h, o)           a timber plank or beam (o.dark).
     K.stoneBlock(x, y, w, h, o)       a block of grey stone with a mortar line.
     K.dustTrail(st, x, y, n)          a few dust puffs (the road and the lists are dry).
   Sounds (Sfx.play('tourneyFanfare')): tourneyFanfare, tourneyGallop(speed 1..3), tourneyCrack (a lance), tourneyClang
     (a shield), tourneyRoar (the crowd), tourneyGasp, tourneyRattle (a cart), tourneyWhinny, tourneyCreak (a catapult),
     tourneyThump, tourneyThunk (an arrow), tourneyHelp (played by K.goldHelp), tourneyPop (a collectable),
     tourneyCheer, tourneyBoing (into the hay). Levels add their own as Sfx.extra.<mode>Name.
   Colours: K.COL = { grass, grassDark, dirt, dirtDark, wood, woodDark, woodHi, stone, stoneDark, stoneHi, red, redDark,
     green, yellow, purple, cream, hay, hayDark, sky }. Gold (C.gold) is kept for help and "press now". */
const TOURNEY = (() => {
  const S = SHRUNK, K = { defs: {} };
  for (const k of ['FONT', 'lerp', 'smooth', 'hash', 'mmss', 'stubMap', 'BREAK', 'quiet', 'key', 'track', 'both', 'idle', 'actLabels',
    'hide', 'unhide', 'place', 'fx', 'pop', 'part', 'spark', 'confetti', 'dust', 'poof', 'hint', 'hintOnce', 'msg', 'tickFx', 'star',
    'drawParts', 'drawPops', 'chip', 'panel', 'meter', 'medal', 'helpLine', 'drawMsg', 'prompter', 'hero']) K[k] = S[k];
  const TAU = Math.PI * 2, H_ = K.hash;
  const COL = K.COL = {
    grass: '#6cc24a', grassDark: '#3e8a34', dirt: '#c8a06a', dirtDark: '#8a6a40', wood: '#a0683a', woodDark: '#5e3a1c', woodHi: '#c88a52',
    stone: '#a8a69c', stoneDark: '#6e6c64', stoneHi: '#d2d0c6', red: '#d8323a', redDark: '#8a1a22', green: '#2e8a4a', yellow: '#ffd23a',
    purple: '#7a3aa8', cream: '#f6ecd0', hay: '#f2cf5a', hayDark: '#b8902e', sky: '#7cc6f2',
  };
  const BANNER = ['#d8323a', '#ffd23a', '#2e6ad8', '#2e8a4a', '#7a3aa8', '#f6ecd0', '#ff8a2a'];
  K.BANNER = BANNER;
  K.goldHelp = (st, text, life) => {
    st.msg = { text, col: C.gold, t: 0, life: life || 4.4, gold: true };
    if (st.stats) st.stats.helps = (st.stats.helps || 0) + 1;
    Sfx.play('tourneyHelp');
  };

  /* ---------- Pip and Bo in their level outfits ---------- */
  K.squire = (id, x, y, o = {}) => {
    const face = o.face || 1;
    TOURNEY_OUTFITS.draw(ctx, id, o.outfit || null, Object.assign({}, o, { x, y, t: G.clock || 0, bw: PW, bh: PH, face }),
      () => K.hero(id, 0, 0, { face, stun: o.stun || o.dizzy, vy: o.vy }));
  };

  /* ---------- horses ---------- */
  K.horse = (x, y, o = {}) => {
    const s = o.s || 1, face = o.face || 1, sp = o.speed === undefined ? 1 : clamp(o.speed, 0, 1), ph = (o.phase || 0) * TAU;
    const coat = o.coat || '#8a5a3a', dark = o.coatDark || '#5a3820', mane = o.mane || '#2a1a10', jump = clamp(o.jump || 0, 0, 1);
    const bob = -Math.abs(Math.sin(ph)) * 4 * sp - jump * 2;
    const out = {};
    ctx.save(); ctx.translate(x, y); ctx.scale(face * s, s);
    // shadow
    ctx.fillStyle = 'rgba(40,30,20,0.22)'; ctx.beginPath(); ctx.ellipse(0, 1, 44, 5, 0, 0, TAU); ctx.fill();
    ctx.translate(0, bob);
    const hipY = -40, legL = 19;
    // legs: [hip x, phase offset, near side]
    const legs = [[-24, 0.0, false], [22, 0.5, false], [-20, 0.12, true], [26, 0.62, true]];
    const drawLeg = (hx, off, near) => {
      const a = ph + off * TAU;
      let th = sp > 0.05 ? Math.sin(a) * (0.35 + 0.35 * sp) : 0.04 * (near ? 1 : -1);
      let kn = sp > 0.05 ? Math.max(0, Math.sin(a + 1.2)) * (0.7 + 0.5 * sp) : 0.05;
      if (jump > 0) { th = K.lerp(th, hx < 0 ? 0.9 : -0.9, jump); kn = K.lerp(kn, 1.7, jump); }
      const front = hx > 0, kneeDir = front ? 1 : -1;
      const kx = hx + Math.sin(th) * legL, ky = hipY + Math.cos(th) * legL;
      const fx = kx + Math.sin(th - kneeDir * kn) * legL, fy = ky + Math.cos(th - kneeDir * kn) * legL;
      ctx.strokeStyle = near ? coat : dark; ctx.lineCap = 'round';
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(hx, hipY - 4); ctx.lineTo(kx, ky); ctx.stroke();
      ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.ellipse(fx + 1.5, fy, 3.6, 2.2, 0, 0, TAU); ctx.fill();
      ctx.lineCap = 'butt';
    };
    for (const [hx, off, near] of legs) if (!near) drawLeg(hx, off, near);
    // tail (flies back with speed)
    ctx.strokeStyle = mane; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-34, -54); ctx.quadraticCurveTo(-48 - sp * 8, -54 + Math.sin(ph * 0.5) * 3, -50 - sp * 14, -38 + Math.sin(ph) * 4 - sp * 10); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-36, -52); ctx.quadraticCurveTo(-46 - sp * 6, -46, -48 - sp * 10, -30 - sp * 8 + Math.sin(ph + 1) * 3); ctx.stroke();
    ctx.lineCap = 'butt';
    // body
    const bg = ctx.createLinearGradient(0, -62, 0, -36);
    bg.addColorStop(0, coat); bg.addColorStop(1, dark);
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, -50, 36, 14, 0, 0, TAU); ctx.fill();
    // neck and head (head lowers to duck)
    const duck = clamp(o.duck || 0, 0, 1), hx = 46 + duck * 8, hy = -84 + duck * 26 + Math.sin(ph) * 1.5 * sp;
    ctx.fillStyle = coat; ctx.beginPath(); ctx.moveTo(18, -60); ctx.quadraticCurveTo(30, -72 + duck * 10, hx - 8, hy - 2); ctx.lineTo(hx - 2, hy + 10); ctx.quadraticCurveTo(34, -52 + duck * 6, 30, -44); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(0.55 + duck * 0.5);
    ctx.fillStyle = coat; ctx.beginPath(); ctx.ellipse(6, 4, 9, 18, -0.25, 0, TAU); ctx.fill();
    ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(9, 18, 6.5, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1210'; circ(10, 19, 1.2); ctx.fill();
    // ears and eye
    ctx.fillStyle = coat; ctx.beginPath(); ctx.moveTo(-2, -12); ctx.lineTo(1, -22); ctx.lineTo(4, -11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; circ(5, -2, 2.6); ctx.fill(); ctx.fillStyle = '#1a1210'; circ(5.8, -1.6, 1.5); ctx.fill();
    // bridle
    ctx.strokeStyle = o.gold ? C.gold : '#4a2a14'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(14, 10); ctx.moveTo(-2, 4); ctx.lineTo(13, 4); ctx.stroke();
    ctx.restore();
    out.head = { x: x + face * s * (hx + 6), y: y + s * (hy + 8 + bob) };
    // mane along the neck
    ctx.strokeStyle = mane; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(16, -62); ctx.quadraticCurveTo(28, -78 + duck * 10, hx - 8, hy - 8);
    ctx.stroke();
    for (let k = 0; k < 4; k++) { const u = (k + 0.5) / 4, mx = K.lerp(16, hx - 8, u), my = K.lerp(-62, hy - 8, u) - 6 * Math.sin(u * Math.PI); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx - 6 - sp * 5, my + 2 + Math.sin(ph + k) * 2); ctx.stroke(); }
    ctx.lineCap = 'butt';
    // harness for a coach horse: collar and traces back to the left
    if (o.harness) {
      ctx.strokeStyle = o.gold ? C.gold : '#3a2010'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(22, -58, 5, 11, -0.4, 0, TAU); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(18, -52); ctx.lineTo(-30, -50); ctx.stroke();
      ctx.fillStyle = o.gold ? C.gold : '#ffd23a'; circ(-6, -51, 1.8); ctx.fill();
    }
    // caparison: a cloth over the back hanging to the knees, split in two colours
    if (o.cap) {
      const [c1, c2] = o.cap, flap = Math.sin(ph * 1) * 2 * sp;
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.moveTo(-36, -56); ctx.quadraticCurveTo(-8, -66, 0, -64); ctx.lineTo(0, -28 + flap); ctx.quadraticCurveTo(-18, -26 - flap, -38, -30 + flap); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c2 || c1;
      ctx.beginPath(); ctx.moveTo(0, -64); ctx.quadraticCurveTo(14, -64, 30, -58); ctx.lineTo(32, -30 - flap); ctx.quadraticCurveTo(16, -26 + flap, 0, -28 + flap); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = o.capTrim || '#ffd23a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-38, -30 + flap); ctx.quadraticCurveTo(-18, -26 - flap, 0, -28 + flap); ctx.quadraticCurveTo(16, -26 + flap, 32, -30 - flap); ctx.stroke();
      // a scalloped hem
      ctx.fillStyle = o.capTrim || '#ffd23a';
      for (let k = 0; k < 9; k++) { const u = k / 8, hx2 = K.lerp(-36, 30, u); circ(hx2, -28 + (k % 2 ? flap : -flap) * 0.6, 1.6); ctx.fill(); }
    }
    // saddle
    ctx.fillStyle = '#5a3418'; ctx.beginPath(); ctx.ellipse(4, -63, 13, 4.5, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = o.gold ? C.gold : '#8a5a32'; ctx.fillRect(-6, -64, 22, 3);
    for (const [hx2, off, near] of legs) if (near) drawLeg(hx2, off, near);
    ctx.restore();
    out.saddle = { x: x + face * s * 8, y: y + s * (-64 + bob) };
    out.rump = { x: x + face * s * -14, y: y + s * (-62 + bob) };
    return out;
  };
  function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, TAU); }

  /* ---------- lances and shields ---------- */
  K.lance = (x, y, ang, len, o = {}) => {
    const [a, b] = o.cols || ['#d8323a', '#f6ecd0'], w = o.w || 6, spl = clamp(o.splinter || 0, 0, 1);
    const L = len * (1 - spl * 0.55);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    // the shaft tapers from the grip to the tip, with spiral stripes
    ctx.fillStyle = o.gold ? '#ffd86a' : a;
    ctx.beginPath(); ctx.moveTo(-14, -w / 2); ctx.lineTo(L, -1); ctx.lineTo(L, 1); ctx.lineTo(-14, w / 2); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = o.gold ? '#e8a82a' : b;
    for (let k = -14; k < L; k += 14) { ctx.beginPath(); ctx.moveTo(k, -w); ctx.lineTo(k + 6, -w); ctx.lineTo(k + 12, w); ctx.lineTo(k + 6, w); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    if (spl <= 0) { ctx.fillStyle = '#d0d6de'; ctx.beginPath(); ctx.moveTo(L - 2, -2.4); ctx.lineTo(L + 7, 0); ctx.lineTo(L - 2, 2.4); ctx.closePath(); ctx.fill(); }
    else {
      // a splintered end
      ctx.fillStyle = o.gold ? '#ffd86a' : b;
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(L, -1.5 + k); ctx.lineTo(L + 4 + (k % 2) * 5, -3 + k * 2.5); ctx.lineTo(L, k * 0.8); ctx.closePath(); ctx.fill(); }
    }
    if (o.vamp !== false) {
      // the vamplate: a cone guarding the hand
      ctx.fillStyle = '#b8c0cc'; ctx.strokeStyle = '#4a5260'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(4, -w * 1.5); ctx.lineTo(18, -w * 0.45); ctx.lineTo(18, w * 0.45); ctx.lineTo(4, w * 1.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  };
  const CHARGE = {
    sun(c) { ctx.fillStyle = c; ctx.beginPath(); for (let k = 0; k < 16; k++) { const a = k * TAU / 16, r = k % 2 ? 0.3 : 0.5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); },
    moon(c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 0.45, Math.PI * 0.25, Math.PI * 1.75); ctx.arc(0.2, 0, 0.36, Math.PI * 1.62, Math.PI * 0.38, true); ctx.closePath(); ctx.fill(); },
    star(c) { ctx.fillStyle = c; K.star(0, 0, 0.45, 0.2, 0); ctx.fill(); },
    cross(c) { ctx.fillStyle = c; ctx.fillRect(-0.1, -0.5, 0.2, 1); ctx.fillRect(-0.4, -0.15, 0.8, 0.2); },
    chevron(c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-0.6, 0.25); ctx.lineTo(0, -0.3); ctx.lineTo(0.6, 0.25); ctx.lineTo(0.6, 0.5); ctx.lineTo(0, -0.05); ctx.lineTo(-0.6, 0.5); ctx.closePath(); ctx.fill(); },
    tower(c) { ctx.fillStyle = c; ctx.fillRect(-0.25, -0.2, 0.5, 0.6); for (let k = 0; k < 3; k++) ctx.fillRect(-0.3 + k * 0.22, -0.38, 0.16, 0.2); },
    crown(c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-0.45, 0.25); ctx.lineTo(-0.45, -0.25); ctx.lineTo(-0.22, 0); ctx.lineTo(0, -0.35); ctx.lineTo(0.22, 0); ctx.lineTo(0.45, -0.25); ctx.lineTo(0.45, 0.25); ctx.closePath(); ctx.fill(); },
    lion(c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0.08, 0.28, 0.22, 0, 0, TAU); ctx.fill(); circ(0.2, -0.18, 0.17); ctx.fill(); ctx.fillRect(-0.24, 0.2, 0.08, 0.25); ctx.fillRect(0.12, 0.2, 0.08, 0.25); ctx.beginPath(); ctx.moveTo(-0.26, 0); ctx.quadraticCurveTo(-0.5, -0.1, -0.42, -0.36); ctx.lineWidth = 0.06; ctx.strokeStyle = c; ctx.stroke(); },
  };
  K.heraldShield = (x, y, r, o = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
    const path = () => { ctx.beginPath(); ctx.moveTo(-r, -r * 1.05); ctx.lineTo(r, -r * 1.05); ctx.lineTo(r, -r * 0.1); ctx.quadraticCurveTo(r * 0.9, r * 0.9, 0, r * 1.3); ctx.quadraticCurveTo(-r * 0.9, r * 0.9, -r, -r * 0.1); ctx.closePath(); };
    path(); ctx.fillStyle = o.col || COL.red; ctx.fill();
    if (o.col2) { ctx.save(); path(); ctx.clip(); ctx.fillStyle = o.col2; ctx.fillRect(0, -r * 1.2, r * 1.2, r * 2.6); ctx.restore(); }
    if (o.charge && CHARGE[o.charge]) { ctx.save(); ctx.scale(r * 1.5, r * 1.5); CHARGE[o.charge](o.chargeCol || '#ffd23a'); ctx.restore(); }
    path(); ctx.strokeStyle = o.rim || '#3a2a1a'; ctx.lineWidth = Math.max(1.2, r * 0.12); ctx.stroke();
    ctx.restore();
  };

  /* ---------- scenery ---------- */
  K.sky = (cx, t, o = {}) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (o.night) { g.addColorStop(0, '#101a3a'); g.addColorStop(0.7, '#2a3a6a'); g.addColorStop(1, '#4a4a7a'); }
    else if (o.dusk) { g.addColorStop(0, '#4a4a8a'); g.addColorStop(0.55, '#e88a6a'); g.addColorStop(1, '#ffd08a'); }
    else { g.addColorStop(0, '#5ab4ee'); g.addColorStop(0.65, '#a8dcf6'); g.addColorStop(1, '#e8f6f0'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (o.night) {
      for (let i = 0; i < 70; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.5 * H_(i) * (0.6 + 0.4 * Math.sin(t * 2 + i))) + ')'; const s = H_(i + 21) > 0.85 ? 2.4 : 1.6; ctx.fillRect(((H_(i + 3) * W - cx * 0.02) % W + W) % W, H_(i + 9) * 250, s, s); }
      // the moon: a soft halo, a crescent with a lit rim
      ctx.fillStyle = 'rgba(246,242,216,0.08)'; circ(780, 80, 58); ctx.fill(); circ(780, 80, 40); ctx.fill();
      ctx.fillStyle = '#f6f2d8'; circ(780, 80, 26); ctx.fill(); ctx.fillStyle = '#101a3a'; circ(792, 72, 22); ctx.fill();
    } else if (o.dusk) {
      const sg = ctx.createRadialGradient(780, 270, 4, 780, 270, 140);
      sg.addColorStop(0, 'rgba(255,240,200,0.95)'); sg.addColorStop(0.25, 'rgba(255,200,140,0.6)'); sg.addColorStop(1, 'rgba(255,200,150,0)');
      ctx.fillStyle = sg; ctx.fillRect(600, 120, 360, 300);
      ctx.strokeStyle = 'rgba(255,170,120,0.35)'; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(560 + k * 30, 160 + k * 26); ctx.lineTo(960, 160 + k * 26); ctx.stroke(); }
    } else {
      // the sun: a glow, slow turning rays, a bright core
      ctx.save(); ctx.translate(820, 80); if (!reduceMotion) ctx.rotate(t * 0.05);
      ctx.fillStyle = 'rgba(255,248,210,0.35)';
      for (let k = 0; k < 12; k++) { ctx.rotate(TAU / 12); ctx.beginPath(); ctx.moveTo(-6, 40); ctx.lineTo(6, 40); ctx.lineTo(0, 70 + (k % 2) * 12); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = 'rgba(255,248,210,0.5)'; circ(820, 80, 50); ctx.fill(); ctx.fillStyle = '#fff6c8'; circ(820, 80, 32); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; circ(812, 72, 17); ctx.fill();
    }
    // fat clouds: shaded puffs by day, tinted ones at dusk and night
    for (let i = 0; i < 5; i++) {
      const span = W + 360, x = ((i * 271 - cx * 0.03 + t * (5 + i * 2)) % span + span) % span - 180, y = 46 + (i * 53) % 110, s = 0.8 + (i % 3) * 0.3;
      if (!o.night && !o.dusk) { drawCloud(x, y, s * 1.12); continue; }
      ctx.fillStyle = o.night ? 'rgba(20,24,60,0.25)' : 'rgba(170,90,110,0.3)';
      circ(x + 2, y + 5 * s, 20 * s); ctx.fill(); circ(x + 54 * s, y + 5 * s, 18 * s); ctx.fill(); ctx.fillRect(x, y + 5 * s, 54 * s, 16 * s);
      ctx.fillStyle = o.night ? 'rgba(160,170,210,0.25)' : 'rgba(255,220,200,0.6)';
      circ(x, y, 20 * s); ctx.fill(); circ(x + 24 * s, y - 10 * s, 26 * s); ctx.fill(); circ(x + 52 * s, y, 18 * s); ctx.fill(); ctx.fillRect(x, y, 52 * s, 16 * s);
      ctx.fillStyle = o.night ? 'rgba(200,210,240,0.18)' : 'rgba(255,240,220,0.55)'; circ(x + 20 * s, y - 18 * s, 10 * s); ctx.fill();
    }
    if (o.grey) { ctx.fillStyle = 'rgba(80,90,110,' + clamp(o.grey, 0, 1) * 0.4 + ')'; ctx.fillRect(0, 0, W, H); }
  };
  const hillY = (wx, k, hMin, hMax, step) => hMin + (Math.sin(wx / step * 2.1 + k) * 0.5 + 0.5) * (hMax - hMin) * 0.7 + Math.sin(wx / step * 0.7 + k * 3) * (hMax - hMin) * 0.3;
  // a far tree: a round crown or a tall poplar, shaded, with a trunk
  const farTree = (x, y, s, col, poplar) => {
    ctx.fillStyle = shade(col, 0.3); ctx.fillRect(x - 1.5 * s, y - 8 * s, 3 * s, 9 * s);
    ctx.fillStyle = col; ctx.beginPath();
    if (poplar) ctx.ellipse(x, y - 20 * s, 6 * s, 16 * s, 0, 0, TAU); else { ctx.arc(x, y - 15 * s, 10 * s, 0, TAU); ctx.arc(x + 7 * s, y - 10 * s, 7 * s, 0, TAU); ctx.arc(x - 7 * s, y - 10 * s, 7 * s, 0, TAU); }
    ctx.fill();
    ctx.fillStyle = shade(col, 0.14); ctx.beginPath();
    if (poplar) ctx.ellipse(x + 2.5 * s, y - 18 * s, 3.5 * s, 13 * s, 0, 0, TAU); else { ctx.arc(x + 5 * s, y - 9 * s, 6 * s, 0, TAU); }
    ctx.fill();
    ctx.fillStyle = tint(col, 0.22); circ(x - 3 * s, y - (poplar ? 26 : 19) * s, 3.2 * s); ctx.fill();
  };
  K.hills = (cx, o = {}) => {
    const base = o.base || 330, par = o.par || 0.08, dim = o.dim || 0;
    // a hazy blue ridge far behind everything
    {
      const off = cx * par * 0.5;
      ctx.fillStyle = dim ? '#5a6a8a' : '#b4d6e2'; ctx.beginPath(); ctx.moveTo(-20, base + 20);
      for (let x = -20; x <= W + 20; x += 16) { const wx = x + off; ctx.lineTo(x, base - 112 - Math.sin(wx / 210) * 18 - Math.sin(wx / 77 + 1) * 7); }
      ctx.lineTo(W + 20, base + 20); ctx.closePath(); ctx.fill();
    }
    const layers = [[par, dim ? '#5a8a6a' : '#8ccf86', 70, 120, 260], [par * 2.4, dim ? '#3e6e4a' : '#5cb056', 40, 80, 200]];
    layers.forEach(([p, col, hMin, hMax, step], k) => {
      const off = cx * p;
      const g = ctx.createLinearGradient(0, base - hMax, 0, base + 20);
      g.addColorStop(0, col); g.addColorStop(1, shade(col, 0.14));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-20, base + 20);
      for (let x = -20; x <= W + 20; x += 16) ctx.lineTo(x, base - hillY(x + off, k, hMin, hMax, step));
      ctx.lineTo(W + 20, base + 20); ctx.closePath(); ctx.fill();
      // a lit rim along the crest
      ctx.strokeStyle = tint(col, 0.3); ctx.lineWidth = 2.5; ctx.beginPath();
      for (let x = -20; x <= W + 20; x += 16) { const y = base - hillY(x + off, k, hMin, hMax, step) + 1.5; x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      // hedgerows and trees along the hills (stable: placed in world space)
      const tc = k ? (dim ? '#2e5a3a' : '#3e9a46') : (dim ? '#4a7a5a' : '#6cb872'), gap = k ? 120 : 90, i0 = Math.floor(off / gap) - 1;
      for (let i = i0; i < i0 + W / gap + 3; i++) {
        if (H_(i * 7 + k * 31) < 0.35) continue;
        const x = i * gap - off + H_(i + k * 13) * gap * 0.6, y = base - hillY(x + off, k, hMin, hMax, step) + 4;
        const s = (k ? 1.1 : 0.75) * (0.8 + H_(i * 3 + k) * 0.5);
        farTree(x, y, s, tc, H_(i * 5 + k) > 0.6);
        if (H_(i * 11 + k) > 0.55) farTree(x + 14 * s, y + 2, s * 0.8, tc, false);
      }
      if (k === 0 && o.castle) {
        // the rival baron's castle on the far hill (grey stone, shaded, a dark banner)
        const x = ((900 - off) % (W + 600) + W + 600) % (W + 600) - 200, y = base - 120;
        const st = dim ? '#5a5a6a' : '#8a8a96', sd = shade(st, 0.18), hi = tint(st, 0.25);
        const tower = (tx, ty, w, h, m) => {
          ctx.fillStyle = st; ctx.fillRect(tx, ty, w, h); for (let q = 0; q < m; q++) ctx.fillRect(tx + q * (w / m) + 0.5, ty - 5, w / m - 2.5, 5);
          ctx.fillStyle = sd; ctx.fillRect(tx + w * 0.62, ty, w * 0.38, h);
          ctx.fillStyle = hi; ctx.fillRect(tx, ty, 2, h);
        };
        // the castle's own knoll, so it sits on the hill instead of floating
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 150, base + 20); ctx.quadraticCurveTo(x - 90, y, x - 56, y + 1); ctx.lineTo(x + 56, y + 1); ctx.quadraticCurveTo(x + 90, y, x + 150, base + 20); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = tint(col, 0.3); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 110, y + 40); ctx.quadraticCurveTo(x - 86, y + 2, x - 56, y + 2.5); ctx.lineTo(x + 56, y + 2.5); ctx.quadraticCurveTo(x + 86, y + 2, x + 110, y + 40); ctx.stroke();
        tower(x - 40, y - 30, 80, 34, 8);
        tower(x - 46, y - 52, 14, 56, 3); tower(x + 34, y - 52, 14, 56, 3);
        tower(x - 10, y - 60, 20, 64, 4);
        ctx.fillStyle = '#2a2236'; ctx.fillRect(x - 3, y - 46, 6, 9); ctx.fillRect(x - 41, y - 40, 3, 6); ctx.fillRect(x + 39, y - 40, 3, 6);
        ctx.beginPath(); ctx.arc(x, y + 4, 8, Math.PI, TAU); ctx.lineTo(x + 8, y + 4); ctx.fill();
        ctx.fillStyle = '#2a2236'; ctx.fillRect(x - 1, y - 82, 2, 22); ctx.fillStyle = '#5a1a6a'; ctx.beginPath(); ctx.moveTo(x + 1, y - 82); ctx.lineTo(x + 16 + Math.sin(G.clock * 5) * 2, y - 77); ctx.lineTo(x + 1, y - 72); ctx.closePath(); ctx.fill();
      }
    });
    // the meadow in front of the hills, down to the ground (so tents and stands never stand on sky)
    {
      const mc = dim ? '#3e6e4a' : '#5cb056', mg = ctx.createLinearGradient(0, base + 10, 0, H);
      mg.addColorStop(0, shade(mc, 0.06)); mg.addColorStop(1, tint(mc, 0.12));
      ctx.fillStyle = mg; ctx.fillRect(0, base + 12, W, H - base - 12);
      ctx.fillStyle = shade(mc, 0.14);
      for (let i = 0; i < 30; i++) { const x = ((i * 67 - cx * par * 3) % (W + 40) + W + 40) % (W + 40) - 20, y = base + 22 + (i * 23) % 120; ctx.fillRect(x, y, 8 + (i % 3) * 4, 1.5); }
    }
    if (dim) { ctx.fillStyle = 'rgba(20,24,50,' + dim * 0.35 + ')'; ctx.fillRect(0, 0, W, H); }
  };
  K.pennants = (x0, x1, y, t, o = {}) => {
    const sag = o.sag === undefined ? 18 : o.sag, cols = o.cols || BANNER, wind = o.wind === undefined ? 0.5 : o.wind, gust = o.gust || 0;
    const n = Math.max(2, Math.floor((x1 - x0) / 22)), yAt = u => y + Math.sin(u * Math.PI) * sag;
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let k = 0; k <= 20; k++) { const u = k / 20; if (k) ctx.lineTo(K.lerp(x0, x1, u), yAt(u)); else ctx.moveTo(x0, y); }
    ctx.stroke();
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n, px = K.lerp(x0, x1, u), py = yAt(u), fl = Math.sin(t * (6 + wind * 6) + k * 0.9) * (2 + wind * 3) + gust * 9;
      const c = cols[k % cols.length], tipX = px + fl, tipY = py + 15 - Math.abs(gust) * 4;
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(px - 7, py); ctx.lineTo(px + 7, py); ctx.lineTo(tipX, tipY); ctx.closePath(); ctx.fill();
      // the far half in shade, a thin edge
      ctx.fillStyle = shade(c, 0.2); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 7, py); ctx.lineTo(tipX, tipY); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shade(c, 0.4); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(px - 7, py); ctx.lineTo(tipX, tipY); ctx.lineTo(px + 7, py); ctx.stroke();
    }
  };
  K.pavilions = (cx, y, o = {}) => {
    const par = o.par === undefined ? 0.35 : o.par, s = o.s || 1, step = 190 * s, off = cx * par, t = G.clock || 0;
    const i0 = Math.floor(off / step) - 1;
    for (let i = i0; i < i0 + W / step + 3; i++) {
      const x = i * step - off + H_(i * 3) * 40, h = (70 + H_(i) * 30) * s, w = (64 + H_(i + 5) * 26) * s;
      const c1 = BANNER[Math.floor(H_(i + 9) * 5) % BANNER.length], c2 = '#f6ecd0', ink = shade(c1, 0.45);
      // a soft shadow on the grass, guy ropes and pegs
      ctx.fillStyle = 'rgba(30,40,20,0.18)'; ctx.beginPath(); ctx.ellipse(x + 6 * s, y + 1, w * 0.62, 5 * s, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(90,70,40,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - w / 2 - 6 * s, y - h * 0.55); ctx.lineTo(x - w / 2 - 18 * s, y); ctx.moveTo(x + w / 2 + 6 * s, y - h * 0.55); ctx.lineTo(x + w / 2 + 18 * s, y); ctx.stroke();
      // walls: vertical stripes, shaded towards the right, darker at the foot
      for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? (k > 3 ? shade(c2, 0.1) : c2) : (k > 3 ? shade(c1, 0.12) : c1); ctx.fillRect(x - w / 2 + k * w / 6, y - h * 0.55, w / 6 + 0.5, h * 0.55); }
      ctx.fillStyle = 'rgba(40,20,10,0.12)'; ctx.fillRect(x - w / 2, y - 6 * s, w, 6 * s);
      ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.strokeRect(x - w / 2, y - h * 0.55, w, h * 0.55);
      // the door flap, tied back
      ctx.fillStyle = 'rgba(40,20,10,0.45)'; ctx.beginPath(); ctx.moveTo(x - 7 * s, y); ctx.lineTo(x, y - h * 0.42); ctx.lineTo(x + 7 * s, y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shade(c2, 0.3); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - h * 0.42); ctx.quadraticCurveTo(x - 4 * s, y - h * 0.2, x - 10 * s, y); ctx.moveTo(x, y - h * 0.42); ctx.quadraticCurveTo(x + 4 * s, y - h * 0.2, x + 10 * s, y); ctx.stroke();
      // the cone roof: lit left panel, shaded right panel, a scalloped edge
      const rx0 = x - w / 2 - 6 * s, rx1 = x + w / 2 + 6 * s, ry = y - h * 0.55;
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(rx0, ry); ctx.lineTo(x, y - h); ctx.lineTo(rx1, ry); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(c1, 0.16); ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(rx1, ry); ctx.lineTo(x + (rx1 - x) * 0.3, ry); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(rx0 + 8 * s, ry); ctx.lineTo(rx0 + 16 * s, ry); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(rx0, ry); ctx.lineTo(x, y - h); ctx.lineTo(rx1, ry); ctx.stroke();
      for (let k = 0; k < 7; k++) { const sx = rx0 + (k + 0.5) * (w + 12 * s) / 7; ctx.fillStyle = k > 4 ? shade(c2, 0.1) : c2; circ(sx, ry, 4.5 * s); ctx.fill(); ctx.strokeStyle = shade(c2, 0.35); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(sx, ry, 4.5 * s, 0, Math.PI); ctx.stroke(); }
      // the pole with a gold knob and a waving pennant
      ctx.fillStyle = '#5e3a1c'; ctx.fillRect(x - 1.2, y - h - 18 * s, 2.4, 20 * s);
      ctx.fillStyle = '#ffd23a'; circ(x, y - h - 19 * s, 2.4 * s); ctx.fill();
      const pc = BANNER[(i + 2) % BANNER.length], fl = Math.sin(t * 7 + i) * 3;
      ctx.fillStyle = pc; ctx.beginPath(); ctx.moveTo(x + 1, y - h - 18 * s); ctx.quadraticCurveTo(x + 12 * s, y - h - 18 * s + fl * 0.5, x + 22 * s + fl, y - h - 14 * s); ctx.lineTo(x + 1, y - h - 10 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(pc, 0.22); ctx.beginPath(); ctx.moveTo(x + 1, y - h - 14 * s); ctx.lineTo(x + 22 * s + fl, y - h - 14 * s); ctx.lineTo(x + 1, y - h - 10 * s); ctx.closePath(); ctx.fill();
    }
  };
  const SKIN = ['#f2c8a0', '#d89a6a', '#a86a42', '#f8dcc0', '#7a4a2a'], HATS = ['#d8323a', '#2e6ad8', '#2e8a4a', '#ffd23a', '#7a3aa8', '#f6ecd0', null, null];
  K.crowd = (x0, x1, y, t, o = {}) => {
    const rows = o.rows || 3, mood = o.mood || 'idle', seed = o.seed || 0, rh = 22;
    // the tiers (timber)
    for (let r = 0; r < rows; r++) {
      const ty = y - r * rh;
      ctx.fillStyle = r % 2 ? COL.woodDark : COL.wood; ctx.fillRect(x0, ty, x1 - x0, rh);
      // plank seams, a lit front edge, posts every few metres
      ctx.fillStyle = 'rgba(255,230,190,0.18)'; ctx.fillRect(x0, ty, x1 - x0, 2);
      ctx.fillStyle = 'rgba(40,20,8,0.22)'; ctx.fillRect(x0, ty + rh * 0.5, x1 - x0, 1);
      for (let x = x0 + ((r * 37) % 60); x < x1; x += 60) ctx.fillRect(x, ty + 2, 1.2, rh - 4);
      ctx.fillStyle = 'rgba(40,20,8,0.35)'; for (let x = x0 + 4; x < x1; x += 120) ctx.fillRect(x, ty, 5, rh);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; for (let r = 0; r < rows; r++) ctx.fillRect(x0, y - r * rh + rh - 3, x1 - x0, 3);
    ctx.strokeStyle = shade(COL.woodDark, 0.3); ctx.lineWidth = 1.5; ctx.strokeRect(x0 + 0.75, y - (rows - 1) * rh + 0.75, x1 - x0 - 1.5, rows * rh - 1.5);
    // the people: heads, bodies, arms that go up
    for (let r = rows - 1; r >= 0; r--) {
      const by = y - r * rh;
      for (let x = x0 + 8 + (r % 2) * 9; x < x1 - 6; x += 18) {
        const n = Math.floor(x * 0.37) + r * 101 + seed, h = H_(n);
        let lift = 0, armsUp = false, mouth = 0;
        if (mood === 'cheer') { lift = Math.abs(Math.sin(t * 9 + h * 6)) * 5; armsUp = h > 0.3; mouth = 1; }
        else if (mood === 'gasp') { lift = 2; mouth = 2; }
        else if (mood === 'wave') { const w = Math.sin((x - t * 380) * 0.012); lift = Math.max(0, w) * 10; armsUp = w > 0.4; mouth = w > 0.4 ? 1 : 0; }
        else lift = Math.sin(t * 2 + h * 9) * 0.8;
        const hy = by - 12 - lift, body = BANNER[Math.floor(H_(n + 3) * 7)];
        ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(x, by - 2 - lift * 0.5, 7, 8, 0, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(30,16,30,0.22)'; ctx.beginPath(); ctx.ellipse(x + 2.5, by - 2 - lift * 0.5, 4.5, 7, 0, Math.PI * 1.5, TAU); ctx.lineTo(x + 2.5, by - 2 - lift * 0.5); ctx.fill();
        if (armsUp) { ctx.strokeStyle = body; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 5, hy + 6); ctx.lineTo(x - 9, hy - 6); ctx.moveTo(x + 5, hy + 6); ctx.lineTo(x + 9, hy - 6); ctx.stroke(); }
        const sk = SKIN[Math.floor(H_(n + 7) * 5)];
        ctx.fillStyle = sk; circ(x, hy, 5.5); ctx.fill(); ctx.strokeStyle = shade(sk, 0.4); ctx.lineWidth = 0.8; ctx.stroke();
        const hat = HATS[Math.floor(H_(n + 11) * 8)];
        if (hat) { ctx.fillStyle = hat; ctx.beginPath(); ctx.ellipse(x, hy - 4, 5.8, 2.6, 0, Math.PI, TAU); ctx.fill(); }
        ctx.fillStyle = '#2a1a1a';
        if (mouth === 2) { circ(x, hy + 2, 1.6); ctx.fill(); } else if (mouth === 1) { ctx.beginPath(); ctx.arc(x, hy + 1.5, 1.8, 0, Math.PI); ctx.fill(); }
      }
    }
    if (o.royal) {
      const mx = (x0 + x1) / 2;
      ctx.fillStyle = '#7a3aa8'; ctx.fillRect(mx - 40, y - rows * rh - 8, 80, rows * rh + 8);
      ctx.fillStyle = '#ffd23a'; ctx.fillRect(mx - 40, y - rows * rh - 8, 80, 4);
      K.heraldShield(mx, y - rows * rh + 24, 12, { col: '#7a3aa8', charge: 'crown', chargeCol: '#ffd23a' });
    }
    if (o.roof) {
      const top = y - rows * rh - 26;
      for (let x = x0; x < x1; x += 30) { ctx.fillStyle = (Math.floor((x - x0) / 30) % 2) ? '#f6ecd0' : (o.roofCol || COL.red); ctx.fillRect(x, top, Math.min(30, x1 - x), 14); }
      ctx.fillStyle = o.roofCol || COL.red; for (let x = x0 + 7; x < x1; x += 15) { circ(x, top + 14, 7); ctx.fill(); }
      ctx.fillStyle = COL.woodDark; ctx.fillRect(x0, top + 12, 4, rows * rh + 14); ctx.fillRect(x1 - 4, top + 12, 4, rows * rh + 14);
    }
  };
  K.hay = (x, y, s = 1) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(40,30,10,0.2)'; ctx.beginPath(); ctx.ellipse(3, 1, 31, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = COL.hay; ctx.strokeStyle = COL.hayDark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-24, -26); ctx.quadraticCurveTo(0, -30, 24, -26); ctx.lineTo(26, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(150,100,20,0.25)'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(10, -27); ctx.quadraticCurveTo(20, -27, 24, -26); ctx.lineTo(26, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,210,0.35)'; ctx.fillRect(-23, -25, 30, 3);
    ctx.strokeStyle = 'rgba(184,144,46,0.7)'; ctx.lineWidth = 1;
    for (let k = -18; k <= 18; k += 6) { ctx.beginPath(); ctx.moveTo(k, -2); ctx.lineTo(k + 2, -24); ctx.stroke(); }
    ctx.strokeStyle = '#8a5a32'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-25, -9); ctx.lineTo(25, -9); ctx.moveTo(-24, -19); ctx.lineTo(24, -19); ctx.stroke();
    ctx.strokeStyle = COL.hay; ctx.lineWidth = 1.2; ctx.beginPath(); for (let k = 0; k < 6; k++) { ctx.moveTo(-20 + k * 8, -27); ctx.lineTo(-22 + k * 8 + (k % 2) * 4, -33); } ctx.stroke();
    ctx.restore();
  };
  K.herald = (x, y, t, o = {}) => {
    const s = o.s || 1, face = o.face || 1, blow = clamp(o.blow || 0, 0, 1);
    ctx.save(); ctx.translate(x, y); ctx.scale(face * s, s);
    // legs, a tabard quartered red and gold, a floppy hat
    ctx.fillStyle = '#2a2236'; ctx.fillRect(-6, -14, 4, 14); ctx.fillRect(2, -14, 4, 14);
    ctx.fillStyle = COL.red; ctx.fillRect(-10, -38, 20, 26); ctx.fillStyle = COL.yellow; ctx.fillRect(0, -38, 10, 13); ctx.fillRect(-10, -25, 10, 13);
    ctx.fillStyle = '#f2c8a0'; circ(0, -46, 8); ctx.fill();
    ctx.fillStyle = COL.red; ctx.beginPath(); ctx.ellipse(-2, -52, 10, 5, -0.2, Math.PI, TAU); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-8, -54); ctx.quadraticCurveTo(-20, -62, -24, -50); ctx.quadraticCurveTo(-16, -56, -8, -52); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1c1a36'; circ(3, -47, 1.2); ctx.fill();
    // cheeks puff when blowing
    if (blow > 0) { ctx.fillStyle = '#ff9a8a'; circ(6, -44, 2.5 + blow * 2); ctx.fill(); }
    // the trumpet with a little banner
    ctx.save(); ctx.translate(7, -44); ctx.rotate(-0.25 - blow * 0.35);
    ctx.fillStyle = '#ffd23a'; ctx.fillRect(0, -1.5, 34, 3); ctx.beginPath(); ctx.moveTo(32, -2); ctx.lineTo(42, -8); ctx.lineTo(42, 8); ctx.lineTo(32, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a3aa8'; ctx.fillRect(10, 1.5, 16, 12); ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.moveTo(10, 13.5); ctx.lineTo(18, 9); ctx.lineTo(26, 13.5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
    if (blow > 0.5) { for (let k = 0; k < 3; k++) text('♪', x + face * (48 + k * 12) * s, y - (56 + k * 8 + Math.sin(t * 8 + k) * 4) * s, 14 * s, '#ffffff', 'center', 'body'); }
  };
  K.timber = (x, y, w, h, o = {}) => {
    ctx.fillStyle = o.dark ? COL.woodDark : COL.wood; ctx.fillRect(x, y, w, h);
    // grain along the long side, a shaded underside, a lit top
    ctx.strokeStyle = 'rgba(60,30,10,0.22)'; ctx.lineWidth = 1; ctx.beginPath();
    if (w >= h) { for (let k = 1; k < 3; k++) { const gy = y + h * k / 3 + (H_(Math.floor(x) + k) - 0.5) * 2; ctx.moveTo(x + 2, gy); ctx.lineTo(x + w - 2, gy); } }
    else { for (let k = 1; k < 3; k++) { const gx = x + w * k / 3 + (H_(Math.floor(y) + k) - 0.5) * 2; ctx.moveTo(gx, y + 2); ctx.lineTo(gx, y + h - 2); } }
    ctx.stroke();
    ctx.fillStyle = 'rgba(40,20,5,0.2)'; if (w >= h) ctx.fillRect(x, y + h - Math.min(3, h / 3), w, Math.min(3, h / 3)); else ctx.fillRect(x + w - Math.min(3, w / 3), y, Math.min(3, w / 3), h);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(x, y, w, Math.min(3, h / 3));
    ctx.strokeStyle = 'rgba(60,30,10,0.55)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  };
  K.stoneBlock = (x, y, w, h, o = {}) => {
    const col = o.col || COL.stone;
    ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = shade(col, 0.12); ctx.fillRect(x, y + h * 0.62, w, h * 0.38);
    // a few specks, a lit top-left bevel, a dark lower-right bevel
    ctx.fillStyle = 'rgba(60,58,52,0.25)';
    for (let k = 0; k < 3; k++) { const q = H_(Math.floor(x * 3 + y) + k * 17); ctx.fillRect(x + 3 + q * (w - 7), y + 3 + H_(Math.floor(y * 5 + x) + k) * (h - 7), 2, 2); }
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 1, y + 1, w - 2, 2); ctx.fillRect(x + 1, y + 1, 2, h - 2);
    ctx.fillStyle = 'rgba(30,28,24,0.18)'; ctx.fillRect(x + 1, y + h - 3, w - 2, 2); ctx.fillRect(x + w - 3, y + 1, 2, h - 2);
    ctx.strokeStyle = 'rgba(60,58,52,0.6)'; ctx.lineWidth = 1.2; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  };
  K.dustTrail = (st, x, y, n = 2) => { for (let i = 0; i < n; i++) K.part(st, x + (Math.random() - 0.5) * 16, y - Math.random() * 6, -60 - Math.random() * 80, -20 - Math.random() * 30, 0.6, 'rgba(214,190,150,0.7)', 4 + Math.random() * 3, 40, 'smoke'); };

  /* ---------- sounds ---------- */
  Sfx.extra.tourneyFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => { this.tone(f, 0.16, 'sawtooth', 0.022, null, i * 0.11); this.tone(f / 2, 0.16, 'triangle', 0.03, null, i * 0.11); }); };
  Sfx.extra.tourneyGallop = function (sp) { sp = sp || 1; [0, 0.06 / sp, 0.13 / sp].forEach((d, k) => this.tone(110 + k * 14, 0.05, 'square', 0.022, 70, d)); };
  Sfx.extra.tourneyCrack = function () { this.tone(1400, 0.06, 'square', 0.04, 300); this.tone(220, 0.12, 'sawtooth', 0.04, 70, 0.01); this.tone(3000, 0.08, 'square', 0.008, 900, 0.02); };
  Sfx.extra.tourneyClang = function () { this.tone(1100, 0.12, 'square', 0.025, 820); this.tone(560, 0.3, 'triangle', 0.03, 520, 0.02); };
  Sfx.extra.tourneyRoar = function () { this.tone(300, 0.7, 'sawtooth', 0.012, 380); this.tone(520, 0.6, 'square', 0.005, 600, 0.05); this.tone(200, 0.8, 'triangle', 0.02, 260, 0.1); };
  Sfx.extra.tourneyGasp = function () { this.tone(700, 0.35, 'sawtooth', 0.008, 300); this.tone(500, 0.3, 'triangle', 0.015, 260, 0.03); };
  Sfx.extra.tourneyRattle = function () { for (let k = 0; k < 5; k++) this.tone(180 + (k % 2) * 60, 0.03, 'square', 0.015, 120, k * 0.04); };
  Sfx.extra.tourneyWhinny = function () { this.tone(900, 0.4, 'sawtooth', 0.02, 1400); this.tone(1300, 0.3, 'square', 0.008, 700, 0.15); };
  Sfx.extra.tourneyCreak = function () { this.tone(140, 0.45, 'sawtooth', 0.02, 220); };
  Sfx.extra.tourneyThump = function () { this.tone(80, 0.3, 'sine', 0.1, 40); this.tone(200, 0.12, 'square', 0.02, 70); };
  Sfx.extra.tourneyThunk = function () { this.tone(500, 0.04, 'square', 0.03, 220); this.tone(160, 0.07, 'triangle', 0.04, 100, 0.01); };
  Sfx.extra.tourneyHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
  Sfx.extra.tourneyPop = function (p) { p = p || 1; this.tone(880 * p, 0.05, 'triangle', 0.035, 1320 * p); this.tone(1320 * p, 0.08, 'sine', 0.025, null, 0.04); };
  Sfx.extra.tourneyCheer = function () { [392, 494, 587, 784, 587, 784, 988].forEach((f, i) => this.tone(f, 0.13, 'square', 0.03, null, i * 0.08)); };
  Sfx.extra.tourneyBoing = function () { this.tone(200, 0.25, 'sine', 0.06, 520); this.tone(140, 0.15, 'triangle', 0.03, 90, 0.12); };
  return K;
})();
