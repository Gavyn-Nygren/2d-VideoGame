/* Pip & Bo - World 36 Movie Studio: shared helpers for the four studio levels (loads before them). */
'use strict';

/* The only global here is STUDIO. Pip and Bo are stunt performers at Gigantic Pictures, a big, chaotic film studio
   where nothing goes to plan. Everything is a set: painted skies on rollers, cardboard cities, plywood walls with the
   wood showing on the back, cables, lights on stands, and Director Bellow (a small round person in a beret with an
   enormous megaphone, riding a camera crane) shouting "ACTION!" and "CUT!". Not a toddler world (Gavyn): the chase is
   fast, the fall is a real plunge, the tram has no brakes worth the name. Nobody gets hurt on screen: a failure is a
   "CUT!", a puff of dust, a groaning crew and a retake.
   The players-and-keys, effects and HUD helpers are World 31's SHRUNK kit (same names, same arguments: its header is
   the manual), so this file loads after js/levels/world31/shrunk-kit.js.
   Nothing here touches the rules of a level and nothing keeps state between levels (state lives in G.mst).
   Usual start of a level file:   (() => { const K = STUDIO; ... STUDIO.defs.<mode> = {...}; })();

   From SHRUNK: K.FONT, K.lerp, K.smooth, K.hash, K.mmss, K.stubMap, K.BREAK, K.quiet, K.key, K.track, K.both, K.idle,
     K.actLabels, K.hide, K.unhide, K.place, K.fx, K.pop, K.part, K.spark, K.confetti, K.dust, K.poof, K.hint,
     K.hintOnce, K.msg, K.tickFx, K.star, K.drawParts, K.drawPops, K.chip, K.panel, K.meter, K.medal, K.helpLine,
     K.drawMsg, K.prompter, K.hero.
   K.goldHelp(st, text, life)       the gold-help banner (plays studioHelp, counts st.stats.helps).

   OUTFITS (Gavyn, Nov 2026: Pip and Bo dress for each level). Every outfit is drawn here and only here, so a shared
   outfit system can take them over later. K.stunt(id, x, y, o) draws Pip or Bo (feet at x, y) in o.look:
     'stunt'  36-1: a stunt jumpsuit with a white stripe, knee pads, a racing helmet (Pip silver, Bo gold) and goggles
     'crew'   36-2: tram crew, a striped vest, a peaked cap and a headset
     'agent'  36-3: the film stars' doubles, a black secret-agent suit with a tie, sunglasses and a stunt harness
     'show'   36-4: a sparkly show jumpsuit, a star cape and a full-face helmet with a visor
     o: face, rot, s, sy, sx, vy, stun, alpha, arms ('up' | 'fwd' | 'out' | 'grab'), cape (0..1 how hard it flies).
   THE FAKE-OR-REAL LANGUAGE (the same in all four levels; never colour alone):
     FAKE (props: paper, foam, sugar glass): matte, a torn paper / foam edge, a small yellow "PROP" tag, a slight wobble.
     REAL (steel, brick, a tram): glossy with a hard highlight, rivets or mortar lines, a red-and-white "REAL" hazard
       stripe, never moves.
     K.propTag(x, y, s)              the yellow PROP tag (centred at x, y).
     K.realTag(x, y, w, s)           the red-and-white REAL hazard stripe with the word REAL, w wide, centred at x, y.
     K.wobble(seed, t, amt)          a small steady wobble angle for a FAKE thing (radians).
     K.steel(x, y, w, h, o)          a REAL steel beam / plate: gloss, a hard highlight, rivets. o: col, rivets.
     K.brick(x, y, w, h)             a REAL brick block with mortar lines.
     K.foam(x, y, w, h, o)           a FAKE foam block: matte, soft corners, pores, a PROP tag. o: col, tag (default on).
   Studio props
     K.clapper(x, y, s, open, take, o)    a clapperboard centred at x, y: open 0..1 (the stick up), the take number.
                                     o: gold (a gold clapper), label ('TAKE'), scene (a scene word).
     K.bellow(x, y, s, o)            Director Bellow (feet at x, y): beret, a big megaphone. o: shout 0..1, face.
     K.crane(x, y, len, ang, o)      a camera crane from a base at x, y, with Bellow and a camera on the end.
                                     o: shout, face. Returns { x, y } of the end.
     K.flat(x, y, w, h, o)           a painted scenery flat standing on y (x = left edge). o: paint(x, y, w, h) draws the
                                     front, back (true = show the back: bare struts), paper (FAKE: torn edge + PROP tag),
                                     t (wobble clock), icon (a scene word for a sign over it), tear 0..1.
     K.light(x, y, s, o)             a studio light on a stand (feet at x, y). o: on, beam (length), dir, real (REAL tag).
     K.cable(x0, y0, x1, y1, sag)    a black cable lying or hanging between two points.
     K.sandbag(x, y, s)              a sandbag.
     K.reel(x, y, r, t)              a gold film reel (the usual collectable).
     K.ticket(x, y, s, t)            a golden ticket.
     K.goldStar(x, y, r, t)          a gold star.
     K.crew(x, y, n, mood, t, o)     a row of n crew silhouettes standing on y: mood 'cheer' | 'groan' | 'idle'.
     K.backlot(cx, t, o)             full screen, no transform: a backlot sky and soundstage buildings far behind.
                                     o: night, dusk, base (y of their feet, 300).
   Film effects (screen px, no transform)
     K.frame(t, rec)                 a film-frame border (sprocket holes) and a blinking REC light while rec is true.
     K.scanlines(a)                  rewind scan lines and a "◀◀" over the whole screen (a = strength 0..1).
     K.retake(st)                    starts the shared CUT! + rewind + clapper sequence: st.cut = { t } (0.6 s
                                     rewind, then the clapper). K.cutStep(st, dt) ages it and returns 'rewind',
                                     'clap' or 'done'. K.drawCut(st, take) draws it.
     K.takeMeter(x, y, w, h, u, z)   the film-strip take meter (u 0..1).
     K.foamBurst(st, x, y, n)        foam chunks.     K.shatter(st, x, y, w)   sugar-glass shards.
     K.scraps(st, x, y, n, col)      torn paper scraps.
   Sounds (Sfx.play('studioClap')): studioClap, studioAction, studioCut, studioReel (a film reel whirr), studioRewind,
     studioCheer, studioGroan, studioFoam, studioGlass, studioRip, studioCrash, studioHelp (played by K.goldHelp),
     studioPop (a collectable), studioHonk, studioDrum (a drum roll).
   Colours: K.COL = { prop, propInk, real, realHi, steel, steelHi, steelDark, brick, mortar, wood, woodDark, canvas,
     canvasDark, foam, glass, glassHi, reel, carpet, night }. Gold (C.gold) is kept for help and "press now". */
const STUDIO = (() => {
  const S = SHRUNK, K = { defs: {} };
  for (const k of ['FONT', 'lerp', 'smooth', 'hash', 'mmss', 'stubMap', 'BREAK', 'quiet', 'key', 'track', 'both', 'idle', 'actLabels',
    'hide', 'unhide', 'place', 'fx', 'pop', 'part', 'spark', 'confetti', 'dust', 'poof', 'hint', 'hintOnce', 'msg', 'tickFx', 'star',
    'drawParts', 'drawPops', 'chip', 'panel', 'meter', 'medal', 'helpLine', 'drawMsg', 'prompter', 'hero']) K[k] = S[k];
  const TAU = Math.PI * 2, H_ = K.hash;
  const COL = K.COL = {
    prop: '#ffd23a', propInk: '#4a3a00', real: '#e8322a', realHi: '#ffffff', steel: '#6a7480', steelHi: '#d8e2ee', steelDark: '#3a424c',
    brick: '#a8503a', mortar: '#e2cdb4', wood: '#c8a070', woodDark: '#8a6a40', canvas: '#efe6d2', canvasDark: '#c8bca2', foam: '#f2a8c8',
    glass: 'rgba(200,236,255,0.55)', glassHi: '#ffffff', reel: '#ffc53d', carpet: '#c8202e', night: '#0c1430',
  };
  K.goldHelp = (st, text, life) => {
    st.msg = { text, col: C.gold, t: 0, life: life || 4.4, gold: true };
    if (st.stats) st.stats.helps = (st.stats.helps || 0) + 1;
    Sfx.play('studioHelp');
  };

  /* ---------- OUTFITS (one place, so a shared outfit system can take them over) ---------- */
  const SUIT = { stunt: [['#e8322a', '#a8181a'], ['#2a6ae8', '#14348a']], crew: [['#e86a2a', '#a8441a'], ['#2a8ae8', '#14508a']] };
  function armsOf(o, w, h, s, face, col, dark) {
    if (!o.arms) return;
    const a = o.arms, sh = -h * 0.55;
    const ends = a === 'up' ? [[-w / 2 - 4 * s, -h - 12 * s], [w / 2 + 4 * s, -h - 12 * s]]
      : a === 'out' ? [[-w / 2 - 14 * s, sh - 6 * s], [w / 2 + 14 * s, sh - 6 * s]]
      : a === 'grab' ? [[face * (w / 2 + 16 * s), sh + 2 * s], [face * (w / 2 + 16 * s), sh + 6 * s]]
      : [[face * 14 * s - 4 * s, sh], [face * 16 * s, sh + 2 * s]];
    ctx.lineCap = 'round';
    for (const [lw, c] of [[5 * s, dark], [3 * s, col]]) {
      ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath();
      ctx.moveTo(-w / 2 + 2, sh); ctx.lineTo(ends[0][0], ends[0][1]); ctx.moveTo(w / 2 - 2, sh); ctx.lineTo(ends[1][0], ends[1][1]); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  // Pip's sprout and Bo's ears always show: they poke out through the top of a helmet or cap (drawn over it)
  function topper(id, w, h, s, top) {
    if (id === 0) {
      ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(0, top + 1 * s); ctx.lineTo(1 * s, top - 6 * s); ctx.stroke();
      ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(5 * s, top - 8 * s, 6 * s, 3 * s, -0.5, 0, TAU); ctx.fill();
    } else {
      for (const d of [-1, 1]) {
        ctx.fillStyle = PCOL[1]; circle(d * (w / 2 - 1 * s), -h - 1 * s, 4.5 * s); ctx.fill();
        ctx.strokeStyle = PDARK[1]; ctx.lineWidth = 2 * s; ctx.stroke();
      }
    }
  }
  K.stunt = (id, x, y, o = {}) => {
    const s = o.s || 1, face = o.face || 1, look = o.look || 'stunt', a0 = ctx.globalAlpha, t = G.clock || 0;
    if (o.alpha !== undefined) ctx.globalAlpha = a0 * o.alpha;
    const sy = o.sy || 1, h = PH * sy * s, w = PW * (o.sx || (o.sy ? 2 - o.sy : 1)) * s;
    // the cape flies behind the show suit (drawn first)
    if (look === 'show') {
      ctx.save(); ctx.translate(x, y - PH * s / 2); ctx.rotate(o.rot || 0); ctx.translate(0, PH * s / 2);
      const fl = clamp(o.cape || 0.2, 0, 1), back = -face, wave = Math.sin(t * (6 + fl * 8)) * (2 + fl * 3) * s;
      ctx.fillStyle = id === 0 ? '#7a1a8a' : '#1a7a6a';
      ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -h + 4 * s); ctx.lineTo(w / 2 - 2, -h + 4 * s);
      ctx.quadraticCurveTo(back * (w + 14 * fl * s) + wave, -h * 0.4, back * (w / 2 + 18 * fl * s) + wave, -2 * s - fl * 10 * s);
      ctx.lineTo(back * (w / 2 - 6 * s), 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffe58a'; for (let k = 0; k < 4; k++) { K.star(back * (4 + k * 5) * s + wave * 0.4, -h * 0.75 + k * 5 * s, 2.4 * s, 1 * s, t + k); ctx.fill(); }
      ctx.restore();
    }
    K.hero(id, x, y, { face, rot: o.rot, s: o.s, sy: o.sy, sx: o.sx, vy: o.vy, stun: o.stun });
    ctx.save(); ctx.translate(x, y - PH * s / 2); ctx.rotate(o.rot || 0); ctx.translate(0, PH * s / 2);
    const body = (col, dark) => { ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2 * s; rr(-w / 2, -h * 0.5, w, h * 0.5, 6 * s); ctx.fill(); ctx.stroke(); };
    if (look === 'stunt' || look === 'show') {
      const [col, dark] = look === 'show' ? (id === 0 ? ['#ff5a3a', '#a8241a'] : ['#3a8aff', '#14408a']) : SUIT.stunt[id];
      body(col, dark);
      // the white stripe down the side and knee pads
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-1.5 * s, -h * 0.5, 3 * s, h * 0.5);
      ctx.fillStyle = '#2a2a34'; rr(-w / 2 + 1, -5 * s, 7 * s, 4 * s, 2 * s); ctx.fill(); rr(w / 2 - 8 * s, -5 * s, 7 * s, 4 * s, 2 * s); ctx.fill();
      if (look === 'show') { ctx.fillStyle = '#ffe58a'; for (let k = 0; k < 5; k++) { const sx = -w / 2 + 4 * s + H_(k + id * 7) * (w - 8 * s), sy2 = -h * 0.45 + H_(k * 3 + 1) * h * 0.38; ctx.globalAlpha = (o.alpha === undefined ? 1 : o.alpha) * (0.5 + 0.5 * Math.sin(t * 6 + k * 2)); circle(sx, sy2, 1.2 * s); ctx.fill(); } ctx.globalAlpha = o.alpha === undefined ? a0 : a0 * o.alpha; }
      armsOf(o, w, h, s, face, col, dark);
      // the helmet: a dome over the top of the head; stunt has goggles up, show has a full visor
      const hc = id === 0 ? ['#e2e6ec', '#7a828e'] : ['#ffd86a', '#b8860a'];
      const g = ctx.createLinearGradient(0, -h - 6 * s, 0, -h * 0.55);
      g.addColorStop(0, hc[0]); g.addColorStop(1, hc[1]);
      ctx.fillStyle = g; ctx.strokeStyle = '#2a2a34'; ctx.lineWidth = 1.5 * s;
      ctx.beginPath(); ctx.moveTo(-w / 2 - 1, -h * 0.58); ctx.quadraticCurveTo(-w / 2 - 1, -h - 7 * s, 0, -h - 7 * s); ctx.quadraticCurveTo(w / 2 + 1, -h - 7 * s, w / 2 + 1, -h * 0.58); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = id === 0 ? '#e8322a' : '#2a6ae8'; ctx.fillRect(-1.5 * s, -h - 7 * s, 3 * s, h * 0.35);
      if (id === 1) topper(id, w, h, s, 0); // Bo's ears come out through holes in the helmet
      if (look === 'show') {
        ctx.fillStyle = 'rgba(30,40,70,0.55)'; rr(-w / 2 + 2, -h * 0.82, w - 4, h * 0.2, 4 * s); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(face * 2 * s, -h * 0.8, 4 * s, 2 * s);
      } else {
        ctx.fillStyle = '#3a3a44'; ctx.fillRect(-w / 2, -h * 0.98, w, 3 * s);
        for (const d of [-1, 1]) { ctx.fillStyle = '#9fd8ff'; circle(d * 5 * s + face * 1.5 * s, -h * 0.97, 3 * s); ctx.fill(); ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 1.2 * s; ctx.stroke(); }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(-face * 5 * s, -h - 2 * s, 3 * s, 1.6 * s, -0.4, 0, TAU); ctx.fill();
      if (id === 0) topper(id, w, h, s, -h - 7 * s);
    } else if (look === 'crew') {
      const [col, dark] = SUIT.crew[id];
      // a striped vest over the body
      ctx.save(); rr(-w / 2, -h * 0.55, w, h * 0.55, 6 * s); ctx.clip();
      for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#fff4d8' : col; ctx.fillRect(-w / 2 + k * w / 6, -h * 0.55, w / 6 + 0.5, h * 0.55); }
      ctx.restore();
      ctx.strokeStyle = dark; ctx.lineWidth = 2 * s; rr(-w / 2, -h * 0.55, w, h * 0.55, 6 * s); ctx.stroke();
      ctx.fillStyle = C.gold; circle(-w / 4, -h * 0.4, 1.6 * s); ctx.fill();
      armsOf(o, w, h, s, face, col, dark);
      // a peaked cap and a headset with a little mic
      ctx.fillStyle = id === 0 ? '#5a1a1a' : '#1a2a5a';
      ctx.beginPath(); ctx.moveTo(-w / 2 + 1, -h + 1 * s); ctx.quadraticCurveTo(0, -h - 9 * s, w / 2 - 1, -h + 1 * s); ctx.closePath(); ctx.fill();
      ctx.fillRect(face > 0 ? 0 : -w / 2 - 6 * s, -h, w / 2 + 6 * s, 3 * s);
      ctx.fillStyle = C.gold; ctx.fillRect(-3 * s, -h - 4 * s, 6 * s, 3 * s);
      if (id === 0) topper(id, w, h, s, -h - 6 * s);
      ctx.strokeStyle = '#2a2a34'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.arc(0, -h * 0.75, w / 2 + 1, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.fillStyle = '#2a2a34'; circle(face * (w / 2 + 1), -h * 0.62, 2.6 * s); ctx.fill();
      ctx.beginPath(); ctx.moveTo(face * (w / 2 + 1), -h * 0.6); ctx.quadraticCurveTo(face * (w / 2 + 3 * s), -h * 0.38, face * (w / 4), -h * 0.36); ctx.stroke();
    } else if (look === 'agent') {
      // a black suit, a white shirt and a tie (Pip red, Bo blue), sunglasses and the harness straps
      body('#22242c', '#0a0a10');
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-5 * s, -h * 0.5); ctx.lineTo(5 * s, -h * 0.5); ctx.lineTo(0, -h * 0.22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = id === 0 ? '#e8322a' : '#2a6ae8'; ctx.beginPath(); ctx.moveTo(-1.6 * s, -h * 0.5); ctx.lineTo(1.6 * s, -h * 0.5); ctx.lineTo(2.2 * s, -h * 0.26); ctx.lineTo(0, -h * 0.2); ctx.lineTo(-2.2 * s, -h * 0.26); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c8a03a'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -h * 0.5); ctx.lineTo(w / 2 - 2, -2 * s); ctx.moveTo(w / 2 - 2, -h * 0.5); ctx.lineTo(-w / 2 + 2, -2 * s); ctx.stroke();
      armsOf(o, w, h, s, face, '#2a2c36', '#0a0a10');
      ctx.fillStyle = '#0a0a10'; rr(-w / 2 + 1 + face * 1.5 * s, -h * 0.68, w - 2, 5 * s, 2 * s); ctx.fill();
      ctx.fillStyle = 'rgba(160,200,255,0.6)'; ctx.fillRect(-w / 2 + 3 + face * 1.5 * s, -h * 0.67, 3 * s, 1.5 * s); ctx.fillRect(3 * s + face * 1.5 * s, -h * 0.67, 3 * s, 1.5 * s);
    }
    ctx.restore();
    ctx.globalAlpha = a0;
  };

  /* ---------- fake or real ---------- */
  K.propTag = (x, y, s = 1) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.08);
    ctx.fillStyle = COL.prop; ctx.strokeStyle = COL.propInk; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-15, -6); ctx.lineTo(12, -6); ctx.lineTo(16, 0); ctx.lineTo(12, 6); ctx.lineTo(-15, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COL.propInk; circle(11, 0, 1.4); ctx.fill();
    text('PROP', -2, 0.5, 8, COL.propInk, 'center', 'body');
    ctx.restore();
  };
  K.realTag = (x, y, w = 40, s = 1) => {
    const h = 9 * s;
    ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, y - h / 2, w, h); ctx.clip();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = COL.real;
    for (let k = -2; k < w / 8 + 2; k++) { const bx = x - w / 2 + k * 8 * s; ctx.beginPath(); ctx.moveTo(bx, y + h / 2); ctx.lineTo(bx + 4 * s, y + h / 2); ctx.lineTo(bx + 4 * s + h, y - h / 2); ctx.lineTo(bx + h, y - h / 2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    if (w >= 26 * s) { ctx.fillStyle = '#ffffff'; rr(x - 11 * s, y - 5 * s, 22 * s, 10 * s, 3 * s); ctx.fill(); text('REAL', x, y + 0.5, 7.5 * s, COL.real, 'center', 'body'); }
    ctx.strokeStyle = '#2a2a34'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  };
  K.wobble = (seed, t, amt = 0.04) => Math.sin(t * 5 + seed * 7) * amt + Math.sin(t * 8.3 + seed * 3) * amt * 0.4;
  K.steel = (x, y, w, h, o = {}) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, o.hi || '#aeb8c4'); g.addColorStop(0.25, o.col || COL.steel); g.addColorStop(1, COL.steelDark);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x + 2, y + 2, w - 4, Math.max(1.5, h * 0.08));
    ctx.strokeStyle = '#20262e'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
    if (o.rivets !== false) { ctx.fillStyle = '#e8eef6'; for (let rx = x + 6; rx < x + w - 3; rx += 14) { circle(rx, y + h / 2, 1.5); ctx.fill(); } }
  };
  K.brick = (x, y, w, h) => {
    ctx.fillStyle = COL.brick; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = COL.mortar; ctx.lineWidth = 1.5;
    for (let r = 0, yy = y; yy < y + h; r++, yy += 10) {
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
      for (let xx = x + (r % 2 ? 10 : 0); xx < x + w; xx += 20) { ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, Math.min(y + h, yy + 10)); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, w, 2);
    ctx.strokeStyle = '#4a1a10'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
  };
  K.foam = (x, y, w, h, o = {}) => {
    ctx.fillStyle = o.col || COL.foam; rr(x, y, w, h, Math.min(8, h / 3)); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = 0; k < Math.max(3, w * h / 300); k++) { circle(x + 4 + H_(k + x) * (w - 8), y + 4 + H_(k * 3 + y) * (h - 8), 1.3); ctx.fill(); }
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); rr(x + 1, y + 1, w - 2, h - 2, Math.min(7, h / 3)); ctx.stroke(); ctx.setLineDash([]);
    if (o.tag !== false) K.propTag(x + w / 2, y + Math.min(h / 2, 12), Math.min(1, w / 44));
  };

  /* ---------- studio props ---------- */
  K.clapper = (x, y, s = 1, open = 0, take = 1, o = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const gold = !!o.gold, slate = gold ? '#b8860a' : '#1e1e26', ink = gold ? '#fff4c8' : '#ffffff';
    ctx.fillStyle = slate; ctx.strokeStyle = gold ? '#ffe58a' : '#000000'; ctx.lineWidth = 2;
    rr(-30, -14, 60, 40, 3); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(28, 0); ctx.moveTo(0, 0); ctx.lineTo(0, 24); ctx.stroke();
    text(o.label || 'TAKE', -15, 8, 8, ink, 'center', 'body');
    text(String(take), 14, 13, 14, ink, 'center', 'display');
    if (o.scene) text(o.scene, -15, 18, 7, ink, 'center', 'body');
    // the stick, hinged at the left
    ctx.save(); ctx.translate(-30, -14); ctx.rotate(-clamp(open, 0, 1) * 0.6);
    ctx.fillStyle = slate; ctx.fillRect(0, -9, 60, 9);
    ctx.fillStyle = ink; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(4 + k * 10, -9); ctx.lineTo(9 + k * 10, -9); ctx.lineTo(5 + k * 10, 0); ctx.lineTo(0 + k * 10, 0); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.restore();
  };
  K.bellow = (x, y, s = 1, o = {}) => {
    const face = o.face || 1, sh = clamp(o.shout || 0, 0, 1);
    ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s);
    // a small round body in a striped shirt, a beret, a moustache and an enormous megaphone
    ctx.fillStyle = '#f2e6c8'; ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, -16, 15, 16, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#2a3a6a'; ctx.lineWidth = 2; for (const yy of [-24, -17, -10]) { ctx.beginPath(); ctx.moveTo(-13, yy); ctx.lineTo(13, yy); ctx.stroke(); }
    ctx.fillStyle = '#f4c8a0'; ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.5; circle(0, -38, 11); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a1a22'; circle(3, -40, 1.6); ctx.fill(); circle(-3, -40, 1.6); ctx.fill();
    ctx.fillStyle = '#4a2a1a'; ctx.beginPath(); ctx.ellipse(-2, -34, 6, 2, 0.1, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(5, -34, 5, 2, -0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b8202a'; ctx.beginPath(); ctx.ellipse(-2, -48, 13, 5, -0.15, 0, TAU); ctx.fill(); ctx.fillRect(-3, -55, 3, 4);
    // the megaphone held to the mouth
    ctx.save(); ctx.translate(10, -34); ctx.rotate(-0.15 - sh * 0.15);
    const mg = ctx.createLinearGradient(0, -14, 0, 14); mg.addColorStop(0, '#ffffff'); mg.addColorStop(1, '#c8c8d0');
    ctx.fillStyle = mg; ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(30, -13 - sh * 2); ctx.lineTo(30, 13 + sh * 2); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8322a'; ctx.fillRect(10, -7, 4, 14);
    if (sh > 0.05) { ctx.strokeStyle = 'rgba(255,240,180,' + sh + ')'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(30, 0, 8 + k * 7, -0.6, 0.6); ctx.stroke(); } }
    ctx.restore();
    ctx.restore();
  };
  K.crane = (x, y, len, ang, o = {}) => {
    ctx.save();
    // the base on wheels and the arm
    ctx.fillStyle = '#2a2e38'; rr(x - 34, y - 22, 68, 18, 4); ctx.fill();
    ctx.fillStyle = '#14161c'; for (const d of [-24, 0, 24]) { circle(x + d, y - 4, 7); ctx.fill(); }
    ctx.fillStyle = '#4a505c'; ctx.fillRect(x - 5, y - 52, 10, 32);
    const ex = x + Math.cos(ang) * len, ey = y - 50 + Math.sin(ang) * len;
    ctx.strokeStyle = '#3a404c'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * 40, y - 50 - Math.sin(ang) * 40); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = '#8a92a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * 40, y - 50 - Math.sin(ang) * 40); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = '#2a2e38'; ctx.fillRect(x - Math.cos(ang) * 46 - 9, y - 50 - Math.sin(ang) * 46 - 8, 18, 16);
    // the platform, the camera and Bellow
    ctx.fillStyle = '#2a2e38'; ctx.fillRect(ex - 22, ey - 2, 44, 6);
    ctx.fillStyle = '#1a1a22'; rr(ex + (o.face || 1) * 8 - 10, ey - 22, 20, 14, 3); ctx.fill();
    ctx.fillStyle = '#5a6a8a'; circle(ex + (o.face || 1) * 20, ey - 15, 5); ctx.fill();
    K.bellow(ex - (o.face || 1) * 8, ey - 2, 0.75, { shout: o.shout, face: o.face });
    ctx.restore();
    return { x: ex, y: ey };
  };
  K.flat = (x, y, w, h, o = {}) => {
    const t = o.t || 0, wob = o.paper ? K.wobble(x * 0.01, t, 0.02) : 0;
    ctx.save(); ctx.translate(x + w / 2, y); ctx.rotate(wob); ctx.translate(-w / 2, 0);
    if (o.back) {
      ctx.fillStyle = COL.wood; ctx.fillRect(0, -h, w, h);
      ctx.strokeStyle = COL.woodDark; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(4, -h + 4); ctx.lineTo(4, -4); ctx.moveTo(w - 4, -h + 4); ctx.lineTo(w - 4, -4); ctx.moveTo(4, -h / 2); ctx.lineTo(w - 4, -h / 2); ctx.moveTo(4, -4); ctx.lineTo(w - 4, -h + 4); ctx.stroke();
      ctx.fillStyle = 'rgba(90,60,30,0.25)'; for (let k = 0; k < 6; k++) ctx.fillRect(8 + H_(k + x) * (w - 16), -h + 8 + H_(k * 5) * (h - 16), 10, 1.5);
    } else {
      ctx.fillStyle = o.paper ? '#f6eedc' : '#d8c8a8'; ctx.fillRect(0, -h, w, h);
      ctx.save(); ctx.beginPath(); ctx.rect(0, -h, w, h); ctx.clip();
      if (o.paint) o.paint(0, -h, w, h);
      ctx.restore();
      if (o.paper) {
        // a matte torn paper edge along the top and the PROP tag
        ctx.fillStyle = '#f6eedc'; ctx.beginPath(); ctx.moveTo(0, -h);
        for (let k = 0; k <= 12; k++) ctx.lineTo(k * w / 12, -h - 2 - H_(k + x * 0.3) * 5);
        ctx.lineTo(w, -h + 2); ctx.lineTo(0, -h + 2); ctx.closePath(); ctx.fill();
        K.propTag(w - 20, -h + 14, 1);
      } else {
        // plywood: glossy varnish highlight, screws, and the REAL stripe at the foot
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(3, -h + 3, w - 6, 3);
        ctx.fillStyle = '#5a4a3a'; for (const [sx, sy] of [[6, -h + 10], [w - 6, -h + 10], [6, -10], [w - 6, -10]]) { circle(sx, sy, 1.8); ctx.fill(); }
        K.realTag(w / 2, -6, Math.min(w - 8, 60), 1);
      }
      if (o.tear) { ctx.fillStyle = 'rgba(30,30,40,0.85)'; ctx.beginPath(); ctx.ellipse(w / 2, -h / 2, w * 0.4 * o.tear, h * 0.4 * o.tear, 0, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = o.paper ? 'rgba(120,100,70,0.6)' : '#5a4a2a'; ctx.lineWidth = o.paper ? 1 : 2.5; ctx.strokeRect(0, -h, w, h);
    }
    ctx.restore();
  };
  K.light = (x, y, s = 1, o = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const dir = o.dir || 1, on = o.on !== false;
    if (on && o.beam) {
      const g = ctx.createLinearGradient(0, -70, dir * o.beam, -20);
      g.addColorStop(0, 'rgba(255,250,210,0.45)'); g.addColorStop(1, 'rgba(255,250,210,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(dir * 8, -76); ctx.lineTo(dir * o.beam, -140); ctx.lineTo(dir * o.beam, 0); ctx.lineTo(dir * 8, -62); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = '#3a3e48'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(0, -6); ctx.moveTo(0, -10); ctx.lineTo(-16, 0); ctx.moveTo(0, -10); ctx.lineTo(16, 0); ctx.moveTo(0, -10); ctx.lineTo(0, 0); ctx.stroke();
    ctx.save(); ctx.translate(0, -72); ctx.rotate(dir * 0.3);
    const g2 = ctx.createLinearGradient(0, -10, 0, 10); g2.addColorStop(0, '#d8e0ea'); g2.addColorStop(1, '#3a404c');
    ctx.fillStyle = g2; ctx.strokeStyle = '#14161c'; ctx.lineWidth = 1.5; rr(-12, -9, 24, 18, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = on ? '#fff8c8' : '#5a5e68'; rr(dir > 0 ? 10 : -14, -7, 4, 14, 1); ctx.fill();
    ctx.restore();
    if (o.real) K.realTag(0, -36, 30, 0.8);
    ctx.restore();
  };
  K.cable = (x0, y0, x1, y1, sag = 8) => {
    ctx.strokeStyle = '#14141a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.stroke();
  };
  K.sandbag = (x, y, s = 1) => {
    ctx.fillStyle = '#b89a62'; ctx.strokeStyle = '#6a5a32'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, y - 6 * s, 14 * s, 7 * s, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 2 * s, y - 13 * s); ctx.lineTo(x + 2 * s, y - 13 * s); ctx.stroke();
  };
  K.reel = (x, y, r = 12, t = 0) => {
    const gg = ctx.createRadialGradient(x, y, 1, x, y, r * 2);
    gg.addColorStop(0, 'rgba(255,220,120,0.55)'); gg.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = gg; circle(x, y, r * 2); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3);
    ctx.fillStyle = COL.reel; ctx.strokeStyle = '#8a5a0a'; ctx.lineWidth = 1.5; circle(0, 0, r); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a5a0a'; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; circle(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.2); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; circle(0, 0, r * 0.15); ctx.fill();
    ctx.restore();
  };
  K.ticket = (x, y, s = 1, t = 0) => {
    ctx.save(); ctx.translate(x, y + Math.sin(t * 3 + x * 0.05) * 3); ctx.rotate(Math.sin(t * 2 + x) * 0.15); ctx.scale(s, s);
    const gg = ctx.createRadialGradient(0, 0, 1, 0, 0, 26); gg.addColorStop(0, 'rgba(255,220,120,0.5)'); gg.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = gg; circle(0, 0, 26); ctx.fill();
    ctx.fillStyle = C.gold; ctx.strokeStyle = '#8a5a0a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-16, -9); ctx.lineTo(16, -9); ctx.arc(16, 0, 4, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(16, 9); ctx.lineTo(-16, 9); ctx.arc(-16, 0, 4, Math.PI / 2, -Math.PI / 2, true); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(8, 8); ctx.stroke(); ctx.setLineDash([]);
    text('★', -4, 0.5, 10, '#8a5a0a', 'center', 'body');
    ctx.restore();
  };
  K.goldStar = (x, y, r = 11, t = 0) => {
    const gg = ctx.createRadialGradient(x, y, 1, x, y, r * 2.2); gg.addColorStop(0, 'rgba(255,230,120,0.6)'); gg.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = gg; circle(x, y, r * 2.2); ctx.fill();
    ctx.fillStyle = C.gold; ctx.strokeStyle = '#8a5a0a'; ctx.lineWidth = 1.5; K.star(x, y, r, r * 0.45, Math.sin(t * 2) * 0.3); ctx.fill(); ctx.stroke();
  };
  K.crew = (x, y, n, mood = 'idle', t = 0, o = {}) => {
    ctx.fillStyle = o.col || 'rgba(26,26,40,0.85)';
    for (let k = 0; k < n; k++) {
      const cx = x + k * (o.gap || 22), ph = t * 9 + k * 1.7, jump = mood === 'cheer' ? Math.abs(Math.sin(ph)) * 6 : 0, sag = mood === 'groan' ? 4 : 0;
      const by = y - jump, hh = 30 + H_(k + x) * 8;
      rr(cx - 7, by - hh + sag, 14, hh - sag, 5); ctx.fill();
      circle(cx + (mood === 'groan' ? 2 : 0), by - hh - 6 + sag * 1.5, 6); ctx.fill();
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
      if (mood === 'cheer') { ctx.moveTo(cx - 5, by - hh + 6); ctx.lineTo(cx - 10, by - hh - 10 - Math.sin(ph) * 3); ctx.moveTo(cx + 5, by - hh + 6); ctx.lineTo(cx + 10, by - hh - 10 + Math.sin(ph) * 3); }
      else if (mood === 'groan') { ctx.moveTo(cx - 5, by - hh + 8); ctx.lineTo(cx - 2, by - hh - 4); ctx.moveTo(cx + 5, by - hh + 8); ctx.lineTo(cx + 3, by - hh - 4); }
      else { ctx.moveTo(cx - 6, by - hh + 8); ctx.lineTo(cx - 9, by - hh + 20); ctx.moveTo(cx + 6, by - hh + 8); ctx.lineTo(cx + 9, by - hh + 20); }
      ctx.stroke(); ctx.lineCap = 'butt';
      if (k % 3 === 1 && o.props !== false) { ctx.fillRect(cx + 6, by - hh - 2, 10, 7); }
    }
  };
  K.backlot = (cx, t, o = {}) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (o.night) { g.addColorStop(0, '#060a1e'); g.addColorStop(1, '#1a2448'); }
    else if (o.dusk) { g.addColorStop(0, '#3a3a7a'); g.addColorStop(0.6, '#e88a6a'); g.addColorStop(1, '#ffd08a'); }
    else { g.addColorStop(0, '#6ab0e8'); g.addColorStop(0.7, '#cfe8f6'); g.addColorStop(1, '#f2ecd8'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (o.night) for (let i = 0; i < 50; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.5 * H_(i)) + ')'; ctx.fillRect(((H_(i + 3) * W - cx * 0.02) % W + W) % W, H_(i + 9) * 200, 1.5, 1.5); }
    // big soundstage buildings with arched roofs and stage numbers, far behind
    const base = o.base || 300, par = 0.15, step = 230, off = cx * par, i0 = Math.floor(off / step) - 1;
    for (let i = i0; i < i0 + W / step + 3; i++) {
      const x = i * step - off, w = 180 + H_(i) * 30, h = 110 + H_(i * 3) * 60;
      ctx.fillStyle = o.night ? '#1c2440' : '#d8cdb6'; ctx.fillRect(x, base - h, w, h);
      ctx.beginPath(); ctx.ellipse(x + w / 2, base - h, w / 2, 18, 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = o.night ? '#2a3458' : '#bfb398'; ctx.fillRect(x + w * 0.35, base - h * 0.45, w * 0.3, h * 0.45);
      text(String(((i % 9) + 9) % 9 + 1), x + w / 2, base - h + 26, 22, o.night ? '#4a5a8a' : '#8a7a5a', 'center', 'display');
    }
    // the studio water tower
    const tx = ((700 - cx * 0.08) % (W + 300) + W + 300) % (W + 300) - 150;
    ctx.fillStyle = o.night ? '#24304e' : '#9aa6b2'; ctx.fillRect(tx - 2, base - 190, 4, 120); ctx.fillRect(tx - 30, base - 190, 4, 120); ctx.fillRect(tx + 26, base - 190, 4, 120);
    ctx.beginPath(); ctx.ellipse(tx, base - 200, 42, 26, 0, 0, TAU); ctx.fill();
    text('GIGANTIC', tx, base - 198, 11, o.night ? '#3a4a7a' : '#ffffff', 'center', 'body');
  };

  /* ---------- film effects ---------- */
  K.frame = (t, rec) => {
    ctx.fillStyle = 'rgba(10,10,14,0.75)'; ctx.fillRect(0, 0, W, 10); ctx.fillRect(0, H - 10, W, 10);
    ctx.fillStyle = 'rgba(240,240,230,0.55)'; for (let x = ((-t * 60) % 24) - 24; x < W; x += 24) { ctx.fillRect(x, 2.5, 10, 5); ctx.fillRect(x, H - 7.5, 10, 5); }
    if (rec) { const on = Math.sin(t * 6) > 0; ctx.fillStyle = on ? '#ff3a3a' : 'rgba(255,58,58,0.35)'; circle(W - 120, 30 + (hudBig() ? 30 : 22), 6); ctx.fill(); text('REC', W - 108, 30 + (hudBig() ? 30 : 22), 12, '#ffffff', 'left', 'body'); }
  };
  K.scanlines = a => {
    if (a <= 0) return;
    ctx.fillStyle = 'rgba(10,10,20,' + 0.25 * a + ')'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
    ctx.fillStyle = 'rgba(160,200,255,' + 0.12 * a + ')'; ctx.fillRect(0, 0, W, H);
    const yy = (G.clock * 900) % H; ctx.fillStyle = 'rgba(255,255,255,' + 0.25 * a + ')'; ctx.fillRect(0, yy, W, 6);
    ctx.globalAlpha = a; bigText('◀◀ REWIND', W / 2, H / 2 - 40, 34, '#ffffff'); ctx.globalAlpha = 1;
  };
  K.retake = st => { st.cut = { t: 0 }; Sfx.play('studioCut'); Sfx.play('studioGroan'); };
  // the CUT! banner (0.7 s), the rewind (0.6 s), the clapper snap (0.7 s)
  K.cutStep = (st, dt) => {
    const c = st.cut; if (!c) return 'done';
    const t0 = c.t; c.t += dt;
    if (t0 < 0.7 && c.t >= 0.7) Sfx.play('studioRewind');
    if (t0 < 1.3 && c.t >= 1.3) Sfx.play('studioClap');
    return c.t < 0.7 ? 'cut' : c.t < 1.3 ? 'rewind' : c.t < 2.0 ? 'clap' : 'done';
  };
  K.drawCut = (st, take) => {
    const c = st.cut; if (!c) return;
    if (c.t < 0.7) { ctx.fillStyle = 'rgba(0,0,0,' + 0.3 * Math.min(1, c.t / 0.2) + ')'; ctx.fillRect(0, 0, W, H); bigText('CUT!', W / 2, H / 2 - 30, 64, '#ff5a4a', 1 + 0.2 * Math.max(0, 1 - c.t / 0.15)); text('From the top!', W / 2, H / 2 + 20, 18, '#ffffff', 'center', 'body'); }
    else if (c.t < 1.3) K.scanlines(1);
    else { const u = (c.t - 1.3) / 0.7; K.clapper(W / 2, H / 2 - 20, 2.2, u < 0.4 ? 1 - u / 0.4 : 0, take, { label: 'RETAKE' }); }
  };
  K.takeMeter = (x, y, w, h, u, z = 1) => {
    ctx.fillStyle = 'rgba(16,16,24,0.88)'; rr(x - 8 * z, y - 18 * z, w + 16 * z, h + 26 * z, 8 * z); ctx.fill();
    text('Take meter', x + w / 2, y - 8 * z, 11 * z, '#ffffff', 'center', 'body');
    ctx.fillStyle = '#1a1a22'; ctx.fillRect(x, y, w, h);
    const col = u < 0.3 ? '#ff5a4a' : u < 0.55 ? '#ffb04a' : '#8fe3b0';
    ctx.fillStyle = col; ctx.fillRect(x, y + 3 * z, w * clamp(u, 0, 1), h - 6 * z);
    // film sprocket holes along both edges
    ctx.fillStyle = 'rgba(240,240,230,0.8)'; for (let xx = x + 3; xx < x + w - 4; xx += 9 * z) { ctx.fillRect(xx, y + 0.5, 4 * z, 2 * z); ctx.fillRect(xx, y + h - 2.5 * z, 4 * z, 2 * z); }
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x + w * k / 5, y + 3 * z); ctx.lineTo(x + w * k / 5, y + h - 3 * z); ctx.stroke(); }
  };
  K.foamBurst = (st, x, y, n = 12) => { for (let i = 0; i < n; i++) K.part(st, x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 300, -60 - Math.random() * 220, 0.9, i % 2 ? COL.foam : '#ffd0e4', 4 + Math.random() * 4, 500, 'conf'); };
  K.shatter = (st, x, y, w = 200) => { for (let i = 0; i < 26; i++) K.part(st, x + (Math.random() - 0.5) * w, y + (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 260, (Math.random() - 0.3) * 260, 1.0, i % 3 ? 'rgba(210,240,255,0.9)' : '#ffffff', 3 + Math.random() * 4, 400, 'conf'); };
  K.scraps = (st, x, y, n = 14, col) => { for (let i = 0; i < n; i++) K.part(st, x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 60, 80 + Math.random() * 260, -80 - Math.random() * 200, 1.1, i % 3 ? (col || '#f6eedc') : '#c8bca2', 4 + Math.random() * 4, 520, 'conf'); };

  /* ---------- sounds ---------- */
  Sfx.extra.studioClap = function () { this.tone(1800, 0.03, 'square', 0.05, 600); this.tone(240, 0.05, 'triangle', 0.05, 120, 0.005); };
  Sfx.extra.studioAction = function () { this.tone(330, 0.12, 'sawtooth', 0.035, 392); this.tone(392, 0.2, 'sawtooth', 0.035, 494, 0.12); };
  Sfx.extra.studioCut = function () { this.tone(494, 0.12, 'sawtooth', 0.04, 330); this.tone(330, 0.22, 'sawtooth', 0.04, 220, 0.12); };
  Sfx.extra.studioReel = function () { for (let k = 0; k < 6; k++) this.tone(900 + k * 40, 0.03, 'square', 0.008, 700, k * 0.04); };
  Sfx.extra.studioRewind = function () { this.tone(400, 0.55, 'sawtooth', 0.02, 1800); this.tone(600, 0.5, 'square', 0.008, 2400, 0.03); };
  Sfx.extra.studioCheer = function () { [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'square', 0.025, null, i * 0.07)); this.tone(300, 0.6, 'sawtooth', 0.006, 500); };
  Sfx.extra.studioGroan = function () { this.tone(220, 0.5, 'sawtooth', 0.02, 140); this.tone(180, 0.5, 'triangle', 0.02, 120, 0.05); };
  Sfx.extra.studioFoam = function () { this.tone(160, 0.12, 'sine', 0.06, 90); this.tone(500, 0.08, 'triangle', 0.015, 300); };
  Sfx.extra.studioGlass = function () { [2400, 3100, 2700, 3600, 2900].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.018, f * 0.8, i * 0.035)); };
  Sfx.extra.studioRip = function () { this.tone(1200, 0.18, 'sawtooth', 0.012, 300); this.tone(2400, 0.12, 'square', 0.004, 800, 0.03); };
  Sfx.extra.studioCrash = function () { this.tone(90, 0.3, 'square', 0.06, 40); [700, 950, 600].forEach((f, i) => this.tone(f, 0.07, 'square', 0.02, f * 0.5, i * 0.04)); };
  Sfx.extra.studioHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
  Sfx.extra.studioPop = function (p) { p = p || 1; this.tone(880 * p, 0.05, 'triangle', 0.035, 1320 * p); this.tone(1320 * p, 0.08, 'sine', 0.025, null, 0.04); };
  Sfx.extra.studioHonk = function () { this.tone(330, 0.18, 'square', 0.04, 320); this.tone(415, 0.18, 'square', 0.03, 400); };
  Sfx.extra.studioDrum = function () { for (let k = 0; k < 14; k++) this.tone(110 + (k % 2) * 8, 0.04, 'triangle', 0.035, 80, k * 0.05); this.tone(140, 0.25, 'sine', 0.06, 60, 0.72); };
  return K;
})();
